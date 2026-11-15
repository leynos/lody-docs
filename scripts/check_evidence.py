#!/usr/bin/env python3
"""Check generated evidence indexes against a Lody source checkout.

The evidence indexes of the architecture and Loro document sets list, for each
citation, a file, a line range and the decisive text that the cited lines
contain. This script reads those tables and confirms, for every row marked
"Checked", that the text is still present in that range of the pinned source.
An anchored row that does not parse, and a "Checked" row whose decisive-text
cell has no code span, are failures rather than rows to skip.

Exit status is non-zero if any row fails, or if the checkout is missing.
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
INDEXES = ("docs/architecture/evidence.md", "docs/loro-documents/evidence.md")
ROW = re.compile(
    r"^\| <a id=\"[^\"]+\"></a>(?P<id>\S+) \| `(?P<path>[^`]+)` "
    r"\[[^\]]+\]\([^)#]+#L(?P<start>\d+)(?:-L(?P<end>\d+))?\) "
    r"\| (?P<text>.*) \| (?P<basis>Checked|Reported) \|$"
)
# A line is an evidence row if it carries an evidence anchor anywhere, or ends
# in a basis cell, whatever its pipes look like; headers and prose do neither.
# Such a line must parse with ROW, or the check fails.
EVIDENCE_ROW = re.compile(
    r"<a id=\"e-|\|\s*(?:Checked|Reported)\s*\|?\s*$", re.IGNORECASE
)


def decisive_texts(cell: str) -> list[str]:
    """Return the code spans of a decisive-text cell, with table escapes undone."""
    return [span.replace("\\|", "|") for span in re.findall(r"`([^`]+)`", cell)]


def check_index(index: pathlib.Path, lody: pathlib.Path) -> tuple[int, list[str]]:
    """Check one evidence index; return the row count and a list of failures."""
    failures: list[str] = []
    rows = 0
    for number, line in enumerate(index.read_text().splitlines(), start=1):
        match = ROW.match(line)
        if match is None:
            if EVIDENCE_ROW.search(line):
                failures.append(f"line {number}: evidence row does not parse")
            continue
        rows += 1
        source = lody / match["path"]
        if not source.is_file():
            failures.append(f"{match['id']}: no such file {match['path']}")
            continue
        lines = source.read_text(errors="replace").splitlines()
        start = int(match["start"])
        end = int(match["end"] or start)
        if not 1 <= start <= end <= len(lines):
            failures.append(
                f"{match['id']}: range {start}-{end} is outside {match['path']}"
            )
            continue
        if match["basis"] != "Checked":
            continue
        cited = "\n".join(lines[start - 1 : end])
        texts = decisive_texts(match["text"])
        if not texts:
            failures.append(f"{match['id']}: decisive-text cell has no code span")
        for text in texts:
            if text not in cited:
                failures.append(
                    f"{match['id']}: {text!r} not in {match['path']}:{start}-{end}"
                )
    return rows, failures


def main(argv: list[str] | None = None) -> int:
    """Check every evidence index and report."""
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "lody", type=pathlib.Path, help="path to the Lody checkout at the pinned commit"
    )
    args = parser.parse_args(argv)
    if not args.lody.is_dir():
        print(f"Lody checkout not found: {args.lody}", file=sys.stderr)
        return 2
    status = 0
    for name in INDEXES:
        rows, failures = check_index(ROOT / name, args.lody)
        print(f"{name}: {rows} rows, {len(failures)} failures")
        for failure in failures:
            print(f"  {failure}")
        if failures or rows == 0:
            status = 1
    return status


if __name__ == "__main__":
    sys.exit(main())
