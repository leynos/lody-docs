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
    assert check_evidence.decisive_texts(r"`'a\|b'` and `beta`") == ["'a|b'", "beta"]


def test_matching_checked_row_passes(
    tmp_path: pathlib.Path, lody: pathlib.Path
) -> None:
    assert check_evidence.check_index(index(tmp_path, row()), lody) == (1, [])


def test_escaped_pipe_is_found_in_source(
    tmp_path: pathlib.Path, lody: pathlib.Path
) -> None:
    cited = row(start=2, end=None, text=r"`'a\|b'`")
    assert check_evidence.check_index(index(tmp_path, cited), lody) == (1, [])


def test_absent_decisive_text_fails(tmp_path: pathlib.Path, lody: pathlib.Path) -> None:
    rows, failures = check_evidence.check_index(
        index(tmp_path, row(text="`gamma`")), lody
    )
    assert rows == 1
    assert failures == [f"E-1: 'gamma' not in {SOURCE}:1-2"]


def test_reported_row_skips_decisive_text(
    tmp_path: pathlib.Path, lody: pathlib.Path
) -> None:
    reported = row(text="`gamma`", basis="Reported")
    assert check_evidence.check_index(index(tmp_path, reported), lody) == (1, [])


def test_range_outside_file_fails(tmp_path: pathlib.Path, lody: pathlib.Path) -> None:
    _, failures = check_evidence.check_index(
        index(tmp_path, row(start=3, end=4, basis="Reported")), lody
    )
    assert failures == [f"E-1: range 3-4 is outside {SOURCE}"]


def test_reversed_range_fails(tmp_path: pathlib.Path, lody: pathlib.Path) -> None:
    _, failures = check_evidence.check_index(index(tmp_path, row(start=2, end=1)), lody)
    assert failures == [f"E-1: range 2-1 is outside {SOURCE}"]


def test_missing_file_fails(tmp_path: pathlib.Path, lody: pathlib.Path) -> None:
    _, failures = check_evidence.check_index(
        index(tmp_path, row(path="pkg/src/missing.ts")), lody
    )
    assert failures == ["E-1: no such file pkg/src/missing.ts"]


def test_unparsed_evidence_row_fails(
    tmp_path: pathlib.Path, lody: pathlib.Path
) -> None:
    broken = row(ident="E-2").removesuffix(" |")
    rows, failures = check_evidence.check_index(index(tmp_path, row(), broken), lody)
    assert rows == 1
    assert failures == ["line 6: evidence row does not parse"]


def test_checked_row_without_code_span_fails(
    tmp_path: pathlib.Path, lody: pathlib.Path
) -> None:
    _, failures = check_evidence.check_index(
        index(tmp_path, row(text="alpha without backticks")), lody
    )
    assert failures == ["E-1: decisive-text cell has no code span"]


def test_main_reports_missing_checkout(tmp_path: pathlib.Path) -> None:
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
    index(tmp_path, *rows)
    monkeypatch.setattr(check_evidence, "ROOT", tmp_path)
    monkeypatch.setattr(check_evidence, "INDEXES", ("evidence.md",))
    assert check_evidence.main([str(lody)]) == status
