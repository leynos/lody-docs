"""Tests for ``scripts/check_models.py``.

The tests use fixed TLC output and a temporary model manifest. They never start
Java or TLC: ``main`` is exercised with ``run_model`` replaced by a stub.
"""

from __future__ import annotations

import json
import pathlib

import check_models
import pytest

PASS = "Model checking completed. No error has been found.\n"
INVARIANT = "Error: Invariant NoDoubleClaim is violated.\nState 1: <Init line 1>\n"
TEMPORAL = "Error: Temporal properties were violated.\n"
CRASH = "Error: Parsing or semantic analysis failed.\n"


def model(expect: str = "pass", group: str = "safety", config: str = "A.cfg"):
    """Return a model entry with the given expectation and group."""
    return check_models.Model(
        module="Flock", config=config, expect=expect, group=group, note=""
    )


def outcome(expect: str, observed: str, trace: tuple[str, ...] = ()):
    """Return an outcome for a model with the given expectation."""
    return check_models.Outcome(
        model=model(expect),
        observed=observed,
        distinct_states=1234,
        trace=trace,
        seconds=1.0,
    )


@pytest.mark.parametrize(
    ("output", "observed"),
    [
        pytest.param(PASS, "pass", id="pass"),
        pytest.param(INVARIANT, "NoDoubleClaim", id="invariant-violation"),
        pytest.param(TEMPORAL, "temporal-violation", id="temporal-violation"),
        pytest.param(CRASH, "error", id="error"),
        pytest.param("", "error", id="no-output"),
    ],
)
def test_classify(output: str, observed: str) -> None:
    assert check_models.classify(output) == observed


def test_violation_outranks_completion_message() -> None:
    assert check_models.classify(INVARIANT + PASS) == "NoDoubleClaim"


def test_outcome_ok_when_observed_matches_expectation() -> None:
    assert outcome("NoDoubleClaim", "NoDoubleClaim").ok
    assert outcome("pass", "pass").ok


def test_outcome_not_ok_when_observed_differs() -> None:
    assert not outcome("NoDoubleClaim", "pass").ok
    assert not outcome("pass", "error").ok


def test_describe_marks_status_and_shows_counterexample_trace() -> None:
    text = check_models.describe(
        outcome("NoDoubleClaim", "NoDoubleClaim", ("Init", "Claim", "Claim"))
    )
    assert text.startswith("ok   A.cfg")
    assert "states=      1,234" in text
    assert text.endswith("trace: Claim -> Claim")


def test_describe_marks_failure_without_trace_for_passing_model() -> None:
    text = check_models.describe(outcome("pass", "error", ("Init", "Claim")))
    assert text.startswith("FAIL A.cfg")
    assert "trace" not in text


def write_manifest(tmp_path: pathlib.Path, *models: check_models.Model):
    """Write a model manifest and return its path."""
    path = tmp_path / "models.json"
    entries = [
        {
            "module": m.module,
            "config": m.config,
            "expect": m.expect,
            "group": m.group,
            "note": m.note,
        }
        for m in models
    ]
    path.write_text(json.dumps(entries), encoding="utf-8")
    return path


def test_load_models_filters_by_group(tmp_path: pathlib.Path) -> None:
    manifest = write_manifest(
        tmp_path,
        model(config="S.cfg"),
        model("Inv", "ablation", "A.cfg"),
        model(group="liveness", config="L.cfg"),
    )
    selected = check_models.load_models({"safety", "ablation"}, manifest)
    assert [m.config for m in selected] == ["S.cfg", "A.cfg"]


def test_load_models_rejects_unknown_group(tmp_path: pathlib.Path) -> None:
    manifest = write_manifest(
        tmp_path, model(config="S.cfg"), model(group="livenes", config="L.cfg")
    )
    with pytest.raises(check_models.ManifestError, match="unknown model group"):
        check_models.load_models({"safety"}, manifest)


def test_load_models_rejects_empty_requested_group(tmp_path: pathlib.Path) -> None:
    manifest = write_manifest(tmp_path, model(config="S.cfg"))
    with pytest.raises(check_models.ManifestError, match="no model in group"):
        check_models.load_models({"safety", "liveness"}, manifest)


def test_real_manifest_fills_every_group() -> None:
    selected = check_models.load_models(set(check_models.GROUPS))
    assert {m.group for m in selected} == set(check_models.GROUPS)


@pytest.fixture
def jar(tmp_path: pathlib.Path, monkeypatch: pytest.MonkeyPatch) -> pathlib.Path:
    """Provide a stub JAR in the working directory and a Java binary on PATH."""
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(check_models.shutil, "which", lambda _: "/usr/bin/java")
    stub = tmp_path / "tla2tools.jar"
    stub.write_bytes(b"")
    return stub


def test_main_requires_java(jar: pathlib.Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(check_models.shutil, "which", lambda _: None)
    assert check_models.main(["--jar", str(jar)]) == 2


def test_main_requires_jar(jar: pathlib.Path) -> None:
    assert check_models.main(["--jar", str(jar.parent / "absent.jar")]) == 2


def test_main_rejects_manifest_error(
    jar: pathlib.Path, tmp_path: pathlib.Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    manifest = write_manifest(tmp_path, model(config="S.cfg"))
    real = check_models.load_models
    monkeypatch.setattr(
        check_models, "load_models", lambda groups: real(groups, manifest)
    )
    status = check_models.main(
        ["--jar", jar.name, "--group", "liveness", "--log-dir", "logs"]
    )
    assert status == 2


@pytest.mark.parametrize(
    ("observed", "status"),
    [pytest.param("pass", 0, id="all-match"), pytest.param("error", 1, id="mismatch")],
)
def test_main_runs_models_with_absolute_jar(
    jar: pathlib.Path,
    tmp_path: pathlib.Path,
    monkeypatch: pytest.MonkeyPatch,
    observed: str,
    status: int,
) -> None:
    manifest = write_manifest(tmp_path, model(config="S.cfg"))
    real = check_models.load_models
    monkeypatch.setattr(
        check_models, "load_models", lambda groups: real(groups, manifest)
    )
    jars: list[pathlib.Path] = []

    def run_model(m, jar_path, workers, log_dir):
        jars.append(jar_path)
        return check_models.Outcome(m, observed, None, (), 0.0)

    monkeypatch.setattr(check_models, "run_model", run_model)
    result = check_models.main(
        ["--jar", jar.name, "--group", "safety", "--log-dir", "logs"]
    )
    assert result == status
    assert jars == [jar.resolve()]
    assert jars[0].is_absolute()
