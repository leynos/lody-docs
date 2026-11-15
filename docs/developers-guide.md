# Developer's guide

This guide is for anyone maintaining this repository: running its gates,
checking the formal models with TLC, the model checker for the TLA+
specification language, regenerating the cloud API reference, and adding or
revising documents. It does not describe Lody itself; the
[documentation contents](contents.md) lead to that material.

The [repository layout](repository-layout.md) explains where each file lives
and which files are generated. Every document follows the
[documentation style guide](documentation-style-guide.md).

## 1. Prerequisites

| Tool | Needed for | Notes |
| ---- | ---------- | ----- |
| GNU Make, `curl`, `sha256sum` | Every target | `make tools` downloads a pinned, checksum-verified `tla2tools.jar` |
| Java 11 or later | `tlc`, `tlc-liveness` | Any headless runtime will do |
| Python 3 | `tlc`, `tlc-liveness` | The model runner uses only the standard library |
| Node.js and npm | Markdown lint, Biome, type-checking, the generator | `make deps` installs the pinned packages; validation used Node.js 26.13.0 |
| `ruff` | `check-fmt`, `ruff`, `fmt` | |
| `nixie` | `nixie` | Validates Mermaid diagrams |
| `uv` and `uvx` | `openapi`, `test-python` | Run a pinned `openapi-spec-validator`, and pytest without installing it |
| A Lody checkout at the pinned commit | `cloud-api-check`, `evidence-check`, `test-node` | See [section 4](#4-the-cloud-api-reference) |

_Table 1: Tools the gates depend on._

## 2. Gates

Every gate is a `Makefile` target. `make help` lists them.

| Target | What it proves |
| ------ | -------------- |
| `check-fmt` | Python, JavaScript, and authored JSON are formatted |
| `ruff` | The Python sources pass lint |
| `biome` | The generator and authored JSON pass lint |
| `typecheck` | The generator type-checks |
| `markdownlint` | Every Markdown file passes the style guide's formatting rules, including the 80-column wrap |
| `nixie` | Every Mermaid diagram renders |
| `cloud-api-check` | The generated cloud API files match what the generator produces from the pinned Lody source |
| `evidence-check` | Every checked row of the architecture and Loro evidence indexes still matches the pinned Lody source |
| `openapi` | `openapi.yaml` is a valid OpenAPI document |
| `test` | The evidence checker, the model runner, and the cloud API generator's `--check` mode reject what they should (pytest through `uv`, and `node --test`) |
| `lint` | All of the above, in that order |
| `tlc` | Each safety model holds, and each ablation and observation still produces its counterexample (about two minutes) |
| `tlc-liveness` | Each liveness property holds (about ten minutes on 32 cores) |
| `all` | `lint`, `test`, and `tlc` |
| `check` | `lint`, `test`, `tlc`, and `tlc-liveness` |

_Table 2: The gates and what each one establishes._

Run `make all` before every commit. Run `make check` after changing anything
in `tla/`. Run the gates one after another, not in parallel.

`make fmt` rewrites Python, JavaScript, and JSON formatting. Nothing reformats
Markdown; wrap prose at 80 columns by hand.

## 3. The formal models

The model runner, `scripts/check_models.py`, reads `tla/models.json`. Each
entry names a module, a configuration, a group (`safety`, `ablation`, or
`liveness`), and the verdict TLC must reach. A run fails when a shipped
configuration finds an error, and equally when an ablation stops finding one.
Logs, with full counterexample traces, go to `.tools/tlc-logs/`.

To add a configuration, create the `.cfg` file in `tla/` and add its entry to
`tla/models.json`. To explore a model, change the constants in a `.cfg` file
one at a time: the state space grows quickly with the number of keys and the
clock bound.

The manifest uses the `ablation` group for every configuration that must
fail. That covers true ablations, where a mechanism is removed, and
observations, where a property the shipped protocol lacks is checked against
the shipped behaviour.

A change to a model's properties or results must also be reflected in the
document that reports its state counts and verdicts: the
[Flock formal model](flock-protocol/formal-model.md) or the
[RPC formal models](lody-streams-rpc/formal-model.md).

## 4. The cloud API reference

`scripts/generate-cloud-api.mjs` reads the public Lody source, together with
`http.json` and `supplemental.json`, and writes `openapi.yaml`, `routes.md`,
`operations.md`, and `sources.json`. It does not execute Lody or contact any
service.

`scripts/generate-cloud-api.mjs` is a thin command-line entry point: it reads
`LODY_SOURCE` and `--check`, supplies real file-system and Git access, and
either writes the outputs or, with `--check`, only reads and compares them. The
work is done by the modules in `scripts/cloud-api/`: `source-index.mjs` reads
and parses the checkout, `schema.mjs` converts types to JSON Schema,
`operations.mjs` builds the operations, OpenAPI document and manifest,
`provenance.mjs` verifies the checkout against the pinned commit through an
injected Git runner, `render.mjs` renders the documents, `outputs.mjs` compares
or writes them, and `pipeline.mjs` connects these without performing any I/O.
`schema.mjs` is a facade over `schema-context.mjs` (shared state),
`schema-scope.mjs` (resolution of every name in the module that uses it),
`schema-types.mjs` (TypeScript types and named DTOs), `schema-utilities.mjs`
(utility types), `schema-keys.mjs` (key sets), `schema-zod.mjs` and
`schema-effect.mjs`. The `tests/cloud-api-*.test.mjs` files test each module in
memory, with shared setup in `tests/cloud-api-helpers.mjs`;
`tests/generate-cloud-api-sources.test.mjs` and
`tests/generate-cloud-api-schemas.test.mjs` test the whole command against a
temporary Git repository built by `tests/cloud-api-fixture.mjs`; and
`tests/generate-cloud-api.test.mjs` checks the committed documents against the
real Lody checkout. That last check fails when `LODY_SOURCE` names no checkout,
as it always does under `make`.

The generator needs a Lody checkout. The `Makefile` looks for one at `../Lody`
and then `../../Lody`; set `LODY_SOURCE` to use another path. The manifest
records one digest over every indexed source file and a hash of each file that
shapes the output or is cited. Generation compares the exact bytes it reads with
the pinned commit's blobs, with no Git filters or line-ending conversion
applied, refuses symbolic links, and refuses a checkout with modified, staged,
deleted, renamed, untracked, or ignored source files, files flagged
`assume-unchanged` or `skip-worktree`, or a checkout at another commit, so
`make cloud-api-check` passes only against the pinned commit,
`61bd9701a5ed6899a9f42787df682acfc3fd7d4b`.

```sh
make deps
LODY_SOURCE=/path/to/Lody npm run generate
LODY_SOURCE=/path/to/Lody make cloud-api-check openapi
```

When moving the pin to a newer Lody commit, follow the maintenance notes in
the [cloud API guide](cloud-api/README.md#maintenance-and-validation): the
generator detects changed content, but it does not discover new HTTP callers.

## 5. The RPC probes

The files in `docs/lody-streams-rpc/probes/` record what was executed for the
[conformance](lody-streams-rpc/conformance.md#executed-probes) document. They
ran inside a scratch export of Lody with its dependencies installed, so they
cannot run from this repository, and no gate executes them. Only the Python
probe builder is linted. Treat the result files as evidence: do not edit them
unless the probes have been run again.

## 6. The evidence indexes

The architecture and Loro sets each have an evidence index whose rows give a
file, a line range, and the _decisive text_ that the cited lines contain.
`scripts/check_evidence.py` reads those tables and confirms that every row
marked "Checked" still holds against the Lody checkout. It uses the same
checkout as the generator; see [section 4](#4-the-cloud-api-reference).

When adding a citation to either set, add its row to the index with the
decisive text copied exactly from one line of the source, and run
`make evidence-check`. When moving the pin to a newer Lody commit, expect
this gate to fail wherever the cited code has moved: each failure names the
row to revisit.

The Flock and RPC evidence indexes predate this checker and are not covered
by it.

## 7. Document conventions

These rules are normative for every document.

- Follow the documentation style guide: British English with Oxford spelling,
  sentence-case headings, prose wrapped at 80 columns, a caption under every
  table and diagram, and a description before every Mermaid diagram.
- State the Lody commit that a claim was read from. Every set currently
  describes the same commit; do not mix commits within a set.
- Cite the source for each claim, using the mechanism the set already uses:
  an evidence index row in the architecture, Loro, Flock, and RPC sets, and
  `x-source` provenance in the cloud set.
- Separate what the source does from inference, intent, and recommendation,
  and label each.
- Keep each set within its boundary and link to the neighbouring set instead
  of restating it.

The style guide is a copy of the
[upstream guide](https://github.com/leynos/agent-helper-scripts/blob/991af8457b0d7ccda90ad3da11f93f5f155da822/documentation-library/documentation-style-guide.md)
at the linked commit. Refresh it from upstream instead of editing it here.

Two conventions of the sets that cite evidence sit alongside the style
guide and are deliberate:

- Evidence and literature citations are inline links to stable anchors, such
  as `E-S5` and `[1]`, because many documents cite the same row. Numeric
  footnotes are used only for incidental notes.
- Quoted material keeps its original spelling. This covers identifiers, test
  titles, and text quoted from the Lody source or from upstream packages.

The generated cloud API references follow the same rules. The generator wraps
their prose and captions their tables, so a style change to those files
belongs in `scripts/generate-cloud-api.mjs`. Type listings and descriptions
copied from the Lody source keep their original wording.

Spelling is not gated in this repository. Check a change against the Oxford
spelling policy with `typos` and the configuration published beside the
upstream style guide.

## 8. Adding or changing a document

1. Put the document in the right place; see
   [where new material belongs](repository-layout.md#where-new-material-belongs).
2. Add it to the set's `README.md` and to [the contents](contents.md), each
   with a line on why a reader would open it.
3. If the change alters the tree, update the
   [repository layout](repository-layout.md).
4. Run `make all`.
