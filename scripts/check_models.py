#!/usr/bin/env python3
"""Run TLC over the Flock protocol models and compare each run with its expectation.

Every entry in ``tla/models.json`` names a module, a configuration file and an
expectation: either ``"pass"`` or the name of the invariant that TLC must report
as violated (the ablation configurations). The script exits non-zero when any
run disagrees with its expectation, so a counterexample that stops appearing is
as much a failure as an invariant that starts failing.
"""

from __future__ import annotations

import argparse
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

    @property
    def ok(self) -> bool:
        return self.observed == self.model.expect


def load_models(groups: set[str]) -> list[Model]:
    raw = json.loads((TLA_DIR / "models.json").read_text(encoding="utf-8"))
    models = [Model(**entry) for entry in raw]
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


def run_model(model: Model, jar: pathlib.Path, workers: str, log_dir: pathlib.Path) -> Outcome:
    started = time.monotonic()
    with tempfile.TemporaryDirectory(prefix="tlc-meta-") as meta_dir:
        completed = subprocess.run(
            [
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
            ],
            cwd=TLA_DIR,
            capture_output=True,
            text=True,
            check=False,
        )
    output = completed.stdout + completed.stderr
    (log_dir / f"{pathlib.Path(model.config).stem}.log").write_text(output, encoding="utf-8")
    states = STATES.findall(output)
    return Outcome(
        model=model,
        observed=classify(output),
        distinct_states=int(states[-1][1]) if states else None,
        trace=tuple(action for _, action in TRACE_STATE.findall(output)),
        seconds=time.monotonic() - started,
    )


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


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--group",
        action="append",
        choices=["safety", "ablation", "liveness"],
        help="model group to run (repeatable; default: safety and ablation)",
    )
    parser.add_argument("--jar", type=pathlib.Path, default=DEFAULT_JAR)
    parser.add_argument("--workers", default="auto")
    parser.add_argument("--log-dir", type=pathlib.Path, default=ROOT / ".tools" / "tlc-logs")
    args = parser.parse_args()

    if shutil.which("java") is None:
        print("java not found on PATH; install a JRE (11 or later)", file=sys.stderr)
        return 2
    if not args.jar.is_file():
        print(f"{args.jar} not found; run `make tools`", file=sys.stderr)
        return 2

    args.log_dir.mkdir(parents=True, exist_ok=True)
    groups = set(args.group or ["safety", "ablation"])
    outcomes = []
    for model in load_models(groups):
        outcome = run_model(model, args.jar, args.workers, args.log_dir)
        print(describe(outcome), flush=True)
        outcomes.append(outcome)

    failed = [outcome for outcome in outcomes if not outcome.ok]
    print(f"\n{len(outcomes) - len(failed)}/{len(outcomes)} runs matched their expectation")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
