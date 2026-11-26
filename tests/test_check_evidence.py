"""Tests for ``scripts/check_evidence.py``.

Each test builds a small evidence index and a fixture Lody checkout in a
temporary directory, so no test reads the real Lody source.
"""

from __future__ import annotations

import pathlib

import check_evidence
import pytest

SOURCE = "pkg/src/a.ts"
SOURCE_LINES = [
    "export const alpha = 1;",
    "export const beta = 'a|b';",
    "export const gamma = 3;",
]


def row(
    ident: str = "E-1",
    path: str = SOURCE,
    start: int = 1,
    end: int | None = 2,
    text: str = "`alpha`",
    basis: str = "Checked",
) -> str:
    """Return one evidence row in the format the generated indexes use."""
    anchor = f"#L{start}" if end is None else f"#L{start}-L{end}"
    span = f"{start}" if end is None else f"{start}–{end}"
    return (
        f'| <a id="{ident.lower()}"></a>{ident} | `{path}` '
        f"[{span}](https://github.com/LodyAI/Lody/blob/abc/{path}{anchor}) "
        f"| {text} | {basis} |"
    )


@pytest.fixture
def lody(tmp_path: pathlib.Path) -> pathlib.Path:
    """Return a fixture checkout holding one three-line source file."""
    checkout = tmp_path / "lody"
    source = checkout / SOURCE
    source.parent.mkdir(parents=True)
    source.write_text("\n".join(SOURCE_LINES) + "\n", encoding="utf-8")
    return checkout


def index(tmp_path: pathlib.Path, *rows: str) -> pathlib.Path:
    """Write an evidence index with a header and the given rows."""
    path = tmp_path / "evidence.md"
    header = [
        "# Evidence",
        "",
        "| ID | Source | Decisive text | Basis |",
        "| --- | --- | --- | --- |",
    ]
    path.write_text("\n".join([*header, *rows, ""]), encoding="utf-8")
    return path


def test_decisive_texts_undo_table_escapes() -> None:
    """Check that decisive-text spans have their table pipe escapes undone."""
    assert check_evidence.decisive_texts(r"`'a\|b'` and `beta`") == ["'a|b'", "beta"]


def test_matching_checked_row_passes(
    tmp_path: pathlib.Path, lody: pathlib.Path
) -> None:
    """Check that a Checked row whose decisive text is in its range passes."""
    assert check_evidence.check_index(index(tmp_path, row()), lody) == (1, [])


def test_escaped_pipe_is_found_in_source(
    tmp_path: pathlib.Path, lody: pathlib.Path
) -> None:
    """Check that an escaped pipe in decisive text matches the source's pipe."""
    cited = row(start=2, end=None, text=r"`'a\|b'`")
    assert check_evidence.check_index(index(tmp_path, cited), lody) == (1, [])


def test_absent_decisive_text_fails(tmp_path: pathlib.Path, lody: pathlib.Path) -> None:
    """Check that a Checked row whose decisive text is absent fails."""
    rows, failures = check_evidence.check_index(
        index(tmp_path, row(text="`gamma`")), lody
    )
    assert rows == 1
    assert failures == [f"E-1: 'gamma' not in {SOURCE}:1-2"]


def test_reported_row_skips_decisive_text(
    tmp_path: pathlib.Path, lody: pathlib.Path
) -> None:
    """Check that a Reported row passes without its decisive text being compared."""
    reported = row(text="`gamma`", basis="Reported")
    assert check_evidence.check_index(index(tmp_path, reported), lody) == (1, [])


def test_range_outside_file_fails(tmp_path: pathlib.Path, lody: pathlib.Path) -> None:
    """Check that a cited range running past the end of its source fails."""
    _, failures = check_evidence.check_index(
        index(tmp_path, row(start=3, end=4, basis="Reported")), lody
    )
    assert failures == [f"E-1: range 3-4 is outside {SOURCE}"]


def test_reversed_range_fails(tmp_path: pathlib.Path, lody: pathlib.Path) -> None:
    """Check that a cited range whose end precedes its start fails."""
    _, failures = check_evidence.check_index(index(tmp_path, row(start=2, end=1)), lody)
    assert failures == [f"E-1: range 2-1 is outside {SOURCE}"]


def test_missing_file_fails(tmp_path: pathlib.Path, lody: pathlib.Path) -> None:
    """Check that a row citing a file missing from the checkout fails."""
    _, failures = check_evidence.check_index(
        index(tmp_path, row(path="pkg/src/missing.ts")), lody
    )
    assert failures == ["E-1: no such file pkg/src/missing.ts"]


MALFORMED_ROWS = [
    pytest.param(row(ident="E-2").removesuffix(" |"), id="missing-final-pipe"),
    pytest.param(row(ident="E-2").removeprefix("| "), id="missing-leading-pipe"),
    pytest.param(row(ident="E-2").replace('<a id="e-2"></a>', ""), id="missing-anchor"),
]


@pytest.mark.parametrize("broken", MALFORMED_ROWS)
def test_unparsed_evidence_row_fails(
    tmp_path: pathlib.Path, lody: pathlib.Path, broken: str
) -> None:
    """Check that each malformed evidence row is reported as unparsed."""
    rows, failures = check_evidence.check_index(index(tmp_path, row(), broken), lody)
    assert rows == 1
    assert failures == ["line 6: evidence row does not parse"]


@pytest.mark.parametrize("broken", MALFORMED_ROWS)
def test_main_fails_on_unparsed_evidence_row(
    tmp_path: pathlib.Path,
    lody: pathlib.Path,
    monkeypatch: pytest.MonkeyPatch,
    broken: str,
) -> None:
    """Check that main fails when an evidence row does not parse."""
    index(tmp_path, row(), broken)
    monkeypatch.setattr(check_evidence, "ROOT", tmp_path)
    monkeypatch.setattr(check_evidence, "INDEXES", ("evidence.md",))
    assert check_evidence.main([str(lody)]) == 1


def test_prose_and_headers_are_not_evidence_rows(
    tmp_path: pathlib.Path, lody: pathlib.Path
) -> None:
    """Check that prose and non-evidence tables are skipped, not failed."""
    prose = [
        "",
        "Rows marked Checked were compared with the source; Reported rows",
        "were read but not compared. The basis column says which.",
        "",
        "| Basis | Meaning |",
        "| ----- | ------- |",
        "| `Checked` | Compared |",
    ]
    path = index(tmp_path, row(), *prose)
    assert check_evidence.check_index(path, lody) == (1, [])


def test_checked_row_without_code_span_fails(
    tmp_path: pathlib.Path, lody: pathlib.Path
) -> None:
    """Check that a Checked row without a code span in its cell fails."""
    _, failures = check_evidence.check_index(
        index(tmp_path, row(text="alpha without backticks")), lody
    )
    assert failures == ["E-1: decisive-text cell has no code span"]


def test_main_reports_missing_checkout(tmp_path: pathlib.Path) -> None:
    """Check that main exits 2 when the Lody checkout is absent."""
    assert check_evidence.main([str(tmp_path / "absent")]) == 2


@pytest.mark.parametrize(
    ("rows", "status"),
    [
        pytest.param([row()], 0, id="all-rows-pass"),
        pytest.param([], 1, id="no-parsed-rows"),
        pytest.param([row(text="`gamma`")], 1, id="failing-row"),
    ],
)
def test_main_exit_status(
    tmp_path: pathlib.Path,
    lody: pathlib.Path,
    monkeypatch: pytest.MonkeyPatch,
    rows: list[str],
    status: int,
) -> None:
    """Check that main's exit status follows the outcome of the rows."""
    index(tmp_path, *rows)
    monkeypatch.setattr(check_evidence, "ROOT", tmp_path)
    monkeypatch.setattr(check_evidence, "INDEXES", ("evidence.md",))
    assert check_evidence.main([str(lody)]) == status


def test_main_reports_an_unreadable_index(
    tmp_path: pathlib.Path,
    lody: pathlib.Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    """Check that main exits 3 for an unreadable index and reports the rest."""
    index(tmp_path, row())
    monkeypatch.setattr(check_evidence, "ROOT", tmp_path)
    monkeypatch.setattr(check_evidence, "INDEXES", ("absent.md", "evidence.md"))
    assert check_evidence.main([str(lody)]) == 3
    captured = capsys.readouterr()
    assert "absent.md: cannot read the index:" in captured.err
    assert "evidence.md: 1 rows, 0 failures" in captured.out


def test_unreadable_source_is_a_row_failure(
    tmp_path: pathlib.Path, lody: pathlib.Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Check that an unreadable source file is recorded as a row failure."""
    path = index(tmp_path, row())
    real = pathlib.Path.read_text

    def read_text(self: pathlib.Path, *args, **kwargs) -> str:
        """Deny reads of the fixture source and pass other reads through."""
        if self.name == "a.ts":
            raise PermissionError("denied")
        return real(self, *args, **kwargs)

    monkeypatch.setattr(pathlib.Path, "read_text", read_text)
    rows, failures = check_evidence.check_index(path, lody)
    assert rows == 1
    assert failures == [f"E-1: cannot read {SOURCE}: denied"]
