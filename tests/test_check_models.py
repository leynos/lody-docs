"""Tests for ``scripts/check_models.py``.

The tests use fixed TLC output and a temporary model manifest. They never start
Java or TLC: ``main`` is exercised with ``run_model`` replaced by a stub.
"""

from __future__ import annotations

import json
import pathlib
import subprocess

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
    """Check that classify names each kind of TLC output correctly."""
    assert check_models.classify(output) == observed


def test_violation_outranks_completion_message() -> None:
    """Check that an invariant violation outranks a completion message."""
    assert check_models.classify(INVARIANT + PASS) == "NoDoubleClaim"


def test_outcome_ok_when_observed_matches_expectation() -> None:
    """Check that an outcome is ok when observed matches the expectation."""
    assert outcome("NoDoubleClaim", "NoDoubleClaim").ok
    assert outcome("pass", "pass").ok


def test_outcome_not_ok_when_observed_differs() -> None:
    """Check that an outcome is not ok when observed differs from expectation."""
    assert not outcome("NoDoubleClaim", "pass").ok
    assert not outcome("pass", "error").ok


def test_describe_marks_status_and_shows_counterexample_trace() -> None:
    """Check that describe marks the status and shows the counterexample trace."""
    text = check_models.describe(
        outcome("NoDoubleClaim", "NoDoubleClaim", ("Init", "Claim", "Claim"))
    )
    assert text.startswith("ok   A.cfg")
    assert "states=      1,234" in text
    assert text.endswith("trace: Claim -> Claim")


def test_describe_marks_failure_without_trace_for_passing_model() -> None:
    """Check that describe marks a failing pass model and omits any trace."""
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
    """Check that load_models keeps only the models in the requested groups."""
    manifest = write_manifest(
        tmp_path,
        model(config="S.cfg"),
        model("Inv", "ablation", "A.cfg"),
        model(group="liveness", config="L.cfg"),
    )
    selected = check_models.load_models({"safety", "ablation"}, manifest)
    assert [m.config for m in selected] == ["S.cfg", "A.cfg"]


def test_load_models_rejects_unknown_group(tmp_path: pathlib.Path) -> None:
    """Check that load_models rejects a manifest with an unknown group."""
    manifest = write_manifest(
        tmp_path, model(config="S.cfg"), model(group="livenes", config="L.cfg")
    )
    with pytest.raises(check_models.ManifestError, match="unknown model group"):
        check_models.load_models({"safety"}, manifest)


def test_load_models_rejects_empty_requested_group(tmp_path: pathlib.Path) -> None:
    """Check that load_models rejects a requested group with no model."""
    manifest = write_manifest(tmp_path, model(config="S.cfg"))
    with pytest.raises(check_models.ManifestError, match="no model in group"):
        check_models.load_models({"safety", "liveness"}, manifest)


def test_real_manifest_fills_every_group() -> None:
    """Check that the real manifest has a model in every group."""
    selected = check_models.load_models(set(check_models.GROUPS))
    assert {m.group for m in selected} == set(check_models.GROUPS)


JAVA = "/usr/bin/java"


def found(_: str) -> str:
    """Pretend that Java is on PATH."""
    return JAVA


class FakeRunner:
    """Record each command and answer with fixed TLC output."""

    def __init__(self, stdout: str, stderr: str = "") -> None:
        """Store the canned output and prepare the call records."""
        self.stdout = stdout
        self.stderr = stderr
        self.calls: list[tuple[list[str], dict]] = []
        self.meta_dirs_existed: list[bool] = []

    def __call__(self, command: list[str], **kwargs) -> subprocess.CompletedProcess:
        """Record the command and return a successful run with canned output."""
        self.calls.append((command, kwargs))
        meta = command[command.index("-metadir") + 1]
        self.meta_dirs_existed.append(pathlib.Path(meta).is_dir())
        return subprocess.CompletedProcess(command, 0, self.stdout, self.stderr)


def test_tlc_command() -> None:
    """Check that tlc_command builds the expected Java command line."""
    command = check_models.tlc_command(
        model(config="A.cfg"), pathlib.Path("/t/tla2tools.jar"), "4", "/m"
    )
    assert command == [
        "java",
        "-XX:+UseParallelGC",
        "-cp",
        "/t/tla2tools.jar",
        "tlc2.TLC",
        "-workers",
        "4",
        "-metadir",
        "/m",
        "-config",
        "A.cfg",
        "Flock.tla",
    ]


def test_run_tlc_runs_in_the_model_directory_with_a_throwaway_metadir() -> None:
    """Check that run_tlc runs in TLA_DIR with a metadir removed afterwards."""
    runner = FakeRunner("out\n", "err\n")
    output = check_models.run_tlc(model(), pathlib.Path("/t.jar"), "auto", runner)
    assert output == "out\nerr\n"
    [(command, kwargs)] = runner.calls
    assert kwargs == {
        "cwd": check_models.TLA_DIR,
        "capture_output": True,
        "text": True,
        "check": False,
    }
    assert runner.meta_dirs_existed == [True]
    assert not pathlib.Path(command[command.index("-metadir") + 1]).exists()


def test_outcome_from_classifies_output() -> None:
    """Check that outcome_from classifies output and reads states and trace."""
    output = (
        INVARIANT
        + "State 2: <Claim line 3>\n12 states generated, 7 distinct states found\n"
    )
    result = check_models.outcome_from(model("NoDoubleClaim"), output, 2.5)
    assert result.ok
    assert result.observed == "NoDoubleClaim"
    assert result.distinct_states == 7
    assert result.trace == ("Init", "Claim")
    assert result.output == output


def test_write_log(tmp_path: pathlib.Path) -> None:
    """Check that write_log names the log after the config file stem."""
    result = check_models.outcome_from(model(config="dir/A.cfg"), PASS, 0.0)
    path = check_models.write_log(result, tmp_path)
    assert path == tmp_path / "A.log"
    assert path.read_text(encoding="utf-8") == PASS


@pytest.fixture
def jar(tmp_path: pathlib.Path, monkeypatch: pytest.MonkeyPatch) -> pathlib.Path:
    """Provide a stub JAR in the working directory."""
    monkeypatch.chdir(tmp_path)
    stub = tmp_path / "tla2tools.jar"
    stub.write_bytes(b"")
    return stub


def test_main_requires_java(jar: pathlib.Path) -> None:
    """Check that main exits 2 when no Java binary is on the PATH."""
    assert check_models.main(["--jar", str(jar)], which=lambda _: None) == 2


def test_main_requires_jar(jar: pathlib.Path) -> None:
    """Check that main exits 2 when the default JAR is missing."""
    status = check_models.main(
        [], which=found, default_jar=jar.parent / "absent.jar", runner=FakeRunner("")
    )
    assert status == 2


def test_main_rejects_manifest_error(
    jar: pathlib.Path, tmp_path: pathlib.Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Check that main exits 2 without running TLC for an invalid manifest."""
    manifest = write_manifest(tmp_path, model(config="S.cfg"))
    real = check_models.load_models
    monkeypatch.setattr(
        check_models, "load_models", lambda groups: real(groups, manifest)
    )
    runner = FakeRunner(PASS)
    status = check_models.main(
        ["--group", "liveness", "--log-dir", "logs"],
        which=found,
        default_jar=jar,
        runner=runner,
    )
    assert status == 2
    assert runner.calls == []


@pytest.mark.parametrize(
    ("output", "status"),
    [pytest.param(PASS, 0, id="all-match"), pytest.param(CRASH, 1, id="mismatch")],
)
def test_main_runs_models_with_absolute_jar_and_writes_logs(
    jar: pathlib.Path,
    tmp_path: pathlib.Path,
    monkeypatch: pytest.MonkeyPatch,
    output: str,
    status: int,
) -> None:
    """Check that main runs TLC with an absolute JAR and writes the logs."""
    manifest = write_manifest(tmp_path, model(config="S.cfg"))
    real = check_models.load_models
    monkeypatch.setattr(
        check_models, "load_models", lambda groups: real(groups, manifest)
    )
    runner = FakeRunner(output)
    result = check_models.main(
        ["--jar", jar.name, "--group", "safety", "--log-dir", "logs"],
        which=found,
        runner=runner,
    )
    assert result == status
    [(command, _)] = runner.calls
    assert command[3] == str(jar.resolve())
    assert pathlib.Path(command[3]).is_absolute()
    assert (tmp_path / "logs" / "S.log").read_text(encoding="utf-8") == output
