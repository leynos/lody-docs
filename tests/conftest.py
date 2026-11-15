"""Make the repository scripts importable by the tests.

The scripts in ``scripts/`` are standalone command-line tools rather than an
installed package, so the tests import them as top-level modules from that
directory.
"""

from __future__ import annotations

import pathlib
import sys

SCRIPTS = pathlib.Path(__file__).resolve().parent.parent / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))
