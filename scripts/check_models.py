#!/usr/bin/env python3
"""Run TLC over the Flock protocol models and compare each run with its expectation.

Every entry in ``tla/models.json`` names a module, a configuration file and an
expectation: either ``"pass"`` or the name of the invariant that TLC must report
as violated (the ablation configurations). The script exits non-zero when any
run disagrees with its expectation, so a counterexample that stops appearing is
as much a failure as an invariant that starts failing.

The steps are separate so that each can be tested alone: ``tlc_command`` builds
the Java command line, ``run_tlc`` runs it through an injectable process runner
and returns TLC's output, ``outcome_from`` classifies that output, and
``write_log`` persists it. ``main`` takes the Java lookup, the default JAR and the
runner as parameters, defaulting to the real ones.
"""

from __future__ import annotations

import argparse
import collections.abc as cabc
import dataclasses
import json
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
TLA_DIR = ROOT / "tla"
DEFAULT_JAR = ROOT / ".tools" / "tla2tools.jar"

VIOLATION = re.compile(r"Error: Invariant (\w+) is violated")
TEMPORAL = re.compile(r"Error: Temporal properties were violated")
STATES = re.compile(r"(\d+) states generated, (\d+) distinct states found")
TRACE_STATE = re.compile(r"^State (\d+): <(\w+)", re.MULTILINE)


@dataclasses.dataclass(frozen=True)
class Model:
    """One TLC run and what it is expected to report."""

    module: str
    config: str
    expect: str
    group: str
    note: str


@dataclasses.dataclass(frozen=True)
class Outcome:
    """What TLC reported for one model."""

    model: Model
    observed: str
    distinct_states: int | None
    trace: tuple[str, ...]
    seconds: float
    output: str = ""

    @property
    def ok(self) -> bool:
        return self.observed == self.model.expect


GROUPS = ("safety", "ablation", "liveness")


class ManifestError(ValueError):
    """The model manifest cannot select the requested runs."""


def load_models(
    groups: set[str], manifest: pathlib.Path = TLA_DIR / "models.json"
) -> list[Model]:
    """Return the manifest's models in the requested groups.

    Raise `ManifestError` when an entry names an unknown group or a requested
    group selects no model, so that a mislabelled manifest cannot pass a gate by
    running nothing.
    """
    raw = json.loads(manifest.read_text(encoding="utf-8"))
    models = [Model(**entry) for entry in raw]
    unknown = sorted({model.group for model in models} - set(GROUPS))
    if unknown:
        msg = f"{manifest}: unknown model group(s): {', '.join(unknown)}"
        raise ManifestError(msg)
    empty = sorted(
        group for group in groups if not any(m.group == group for m in models)
    )
    if empty:
        msg = f"{manifest}: no model in group(s): {', '.join(empty)}"
        raise ManifestError(msg)
    return [model for model in models if model.group in groups]


def classify(output: str) -> str:
    violation = VIOLATION.search(output)
    if violation:
        return violation.group(1)
    if TEMPORAL.search(output):
        return "temporal-violation"
    if "Model checking completed. No error has been found." in output:
        return "pass"
    return "error"


Runner = cabc.Callable[..., subprocess.CompletedProcess[str]]


def tlc_command(
    model: Model, jar: pathlib.Path, workers: str, meta_dir: str
) -> list[str]:
    """Return the Java command line that checks one model."""
    return [
        "java",
        "-XX:+UseParallelGC",
        "-cp",
        str(jar),
        "tlc2.TLC",
        "-workers",
        workers,
        "-metadir",
        meta_dir,
        "-config",
        model.config,
        f"{model.module}.tla",
    ]


def run_tlc(
    model: Model,
    jar: pathlib.Path,
    workers: str,
    runner: Runner = subprocess.run,
) -> str:
    """Run TLC on one model from ``TLA_DIR`` with a throwaway metadata directory.

    Return TLC's combined output. Nothing else is written.
    """
    with tempfile.TemporaryDirectory(prefix="tlc-meta-") as meta_dir:
        completed = runner(
            tlc_command(model, jar, workers, meta_dir),
            cwd=TLA_DIR,
            capture_output=True,
            text=True,
            check=False,
        )
    return completed.stdout + completed.stderr


def outcome_from(model: Model, output: str, seconds: float) -> Outcome:
    """Classify TLC's output for one model."""
    states = STATES.findall(output)
    return Outcome(
        model=model,
        observed=classify(output),
        distinct_states=int(states[-1][1]) if states else None,
        trace=tuple(action for _, action in TRACE_STATE.findall(output)),
        seconds=seconds,
        output=output,
    )


def run_model(
    model: Model, jar: pathlib.Path, workers: str, runner: Runner = subprocess.run
) -> Outcome:
    """Run and classify one model; the caller persists the log."""
    started = time.monotonic()
    output = run_tlc(model, jar, workers, runner)
    return outcome_from(model, output, time.monotonic() - started)


def write_log(outcome: Outcome, log_dir: pathlib.Path) -> pathlib.Path:
    """Write one run's TLC output to ``log_dir`` and return the log's path."""
    path = log_dir / f"{pathlib.Path(outcome.model.config).stem}.log"
    path.write_text(outcome.output, encoding="utf-8")
    return path


def describe(outcome: Outcome) -> str:
    status = "ok  " if outcome.ok else "FAIL"
    states = "-" if outcome.distinct_states is None else f"{outcome.distinct_states:,}"
    line = (
        f"{status} {outcome.model.config:<44} expect={outcome.model.expect:<26} "
        f"observed={outcome.observed:<26} states={states:>11} {outcome.seconds:6.1f}s"
    )
    if outcome.trace and outcome.model.expect != "pass":
        line += "\n       trace: " + " -> ".join(outcome.trace[1:])
    return line


def main(
    argv: list[str] | None = None,
    *,
    which: cabc.Callable[[str], str | None] | None = None,
    default_jar: pathlib.Path = DEFAULT_JAR,
    runner: Runner | None = None,
) -> int:
    """Run the requested model groups and report; return the exit status.

    ``which`` finds the Java binary (default ``shutil.which``), ``default_jar``
    is the JAR used without ``--jar``, and ``runner`` runs TLC (default
    ``subprocess.run``).
    """
    find = which or shutil.which
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--group",
        action="append",
        choices=GROUPS,
        help="model group to run (repeatable; default: safety and ablation)",
    )
    parser.add_argument("--jar", type=pathlib.Path, default=default_jar)
    parser.add_argument("--workers", default="auto")
    parser.add_argument(
        "--log-dir", type=pathlib.Path, default=ROOT / ".tools" / "tlc-logs"
    )
    args = parser.parse_args(argv)

    if find("java") is None:
        print("java not found on PATH; install a JRE (11 or later)", file=sys.stderr)
        return 2
    if not args.jar.is_file():
        print(f"{args.jar} not found; run `make tools`", file=sys.stderr)
        return 2
    # Java runs in TLA_DIR, so a relative class path would no longer resolve.
    jar = args.jar.resolve()

    groups = set(args.group or ["safety", "ablation"])
    try:
        models = load_models(groups)
    except ManifestError as error:
        print(error, file=sys.stderr)
        return 2
    args.log_dir.mkdir(parents=True, exist_ok=True)
    outcomes = []
    for model in models:
        outcome = run_model(model, jar, args.workers, runner or subprocess.run)
        write_log(outcome, args.log_dir)
        print(describe(outcome), flush=True)
        outcomes.append(outcome)

    failed = [outcome for outcome in outcomes if not outcome.ok]
    print(
        f"\n{len(outcomes) - len(failed)}/{len(outcomes)} runs matched their expectation"
    )
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
