# lody-docs

Independent documentation and formal models for [Lody][lody], a local-first
workspace for coding agents.

## Contents

| Path | What it is |
| ---- | ---------- |
| [`docs/flock-protocol/`](docs/flock-protocol/README.md) | The Flock protocol used by the Lody daemon: data model, replication, upload scheduling and durable commands, with an evidence index and references |
| [`tla/`](tla/) | TLA+ models of that protocol, with TLC configurations |
| [`scripts/check_models.py`](scripts/check_models.py) | Runs every model and compares TLC's verdict with the expected one |

Start with the [protocol overview](docs/flock-protocol/README.md).

## Checking the models

The models need Java 11 or later. Everything else is fetched on demand.

```sh
make tlc            # safety and ablation models, about one minute
make tlc-liveness   # liveness models, about ten minutes on 32 cores
make lint           # Markdown and Python lint
make check          # all of the above
```

`make tlc` downloads a pinned, checksum-verified `tla2tools.jar` into
`.tools/` the first time it runs.

An *ablation* is a configuration in which one protocol mechanism is switched
off. It is expected to fail: TLC must find a counterexample to a named
property. A run counts as a failure when a shipped configuration finds an
error, and equally when an ablation stops finding one.

## Status

The documentation describes Lody at commit `61bd9701a` (14 November 2026).
It is a reading of the source and of the published upstream packages, not a
statement by the Lody authors. The
[observations](docs/flock-protocol/observations.md) page lists what could not
be verified.

[lody]: https://github.com/LodyAI/Lody
