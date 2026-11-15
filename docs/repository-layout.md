# Repository layout

This document explains where the documentation, the formal models, the
generated references, and the tooling live, and what each path is responsible
for. The tree below is complete for tracked directories and selective for
files.

```plaintext
.
├── README.md                    Entry points for readers
├── Makefile                     Every gate, as a named target
├── docs/
│   ├── contents.md              Index of every document
│   ├── repository-layout.md     This document
│   ├── developers-guide.md      How to check and maintain the repository
│   ├── documentation-style-guide.md  Conventions every document follows
│   ├── architecture/            Architecture and data model overviews
│   ├── loro-documents/          Document set: Loro documents and turn dispatch
│   ├── flock-protocol/          Document set: the Flock protocol
│   ├── lody-streams-rpc/        Document set: RPC over Loro Streams
│   │   └── probes/              Probe sources and recorded results
│   └── cloud-api/               Document set: the cloud HTTP API
├── tla/                         TLA+ modules, TLC configurations, manifest
├── tests/                       Tests of the repository scripts
├── scripts/
│   ├── check_models.py          Runs TLC against the manifest
│   ├── check_evidence.py        Checks evidence indexes against the Lody source
│   ├── cloud-api/               Modules of the cloud API generator
│   └── generate-cloud-api.mjs   Entry point of the cloud API generator
├── package.json                 Pinned Node.js tooling and npm scripts
├── package-lock.json
├── biome.json                   Formatter and linter scope for JS and JSON
├── tsconfig.json                Type-checking scope for the generator
└── .markdownlint-cli2.jsonc     Markdown lint rules
```

_Figure 1: The repository tree, with one line on each path._

## Path responsibilities

| Path | Purpose | Conventions |
| ---- | ------- | ----------- |
| `README.md` | The reader's entry point: the document sets, entry points by task, and how the subjects relate | The only document that may address the reader directly |
| `docs/contents.md` | The index; lists every document once | Updated whenever a document is added, renamed, or removed |
| `docs/documentation-style-guide.md` | The conventions every document follows | A copy of the upstream guide; refreshed from upstream, not edited here |
| `docs/architecture/` | The architecture and data model overviews | Link into the detailed sets instead of repeating them; claims cite `evidence.md` rows (`E-O…`) |
| `docs/loro-documents/` | Hand-written documents on Loro documents, presence, and turn dispatch | Claims cite `evidence.md` rows (`E-D…`), each carrying the decisive text that `make evidence-check` verifies |
| `docs/flock-protocol/` | Hand-written documents on the Flock protocol | Claims cite `evidence.md` rows (`E-…`) and `references.md` entries (`[n]`); `README.md` is the set's overview |
| `docs/lody-streams-rpc/` | Hand-written documents on the Streams remote procedure call (RPC) protocol | Claims carry a basis tag and cite `evidence.md` rows; `README.md` is the set's overview |
| `docs/lody-streams-rpc/probes/` | Sources and raw results of the probes cited in `conformance.md` | A record of what was run, not a test suite; the TypeScript sources need a Lody export to run |
| `docs/cloud-api/` | The cloud API guide, references, and their inputs | Mixes authored and generated files; see Table 2 |
| `tla/` | One `.tla` module per modelled protocol, `.cfg` files per TLC run, and `models.json` | A configuration named `Module_Mechanism.cfg` is an ablation that must fail; `models.json` records every expected verdict |
| `tests/` | Pytest tests of the evidence and model checkers; per-module `node:test` unit tests of the cloud API generator (`cloud-api-*.test.mjs`, with `cloud-api-helpers.mjs`); end-to-end tests against a temporary Git repository (`generate-cloud-api-sources.test.mjs`, `generate-cloud-api-schemas.test.mjs`, with `cloud-api-fixture.mjs`); and the real-checkout check (`generate-cloud-api.test.mjs`) | Run by `make test`; the real-checkout check fails when `LODY_SOURCE` names no Lody checkout |
| `scripts/cloud-api/` | Source indexing; schema conversion (facade `schema.mjs` over `schema-context`, `schema-scope`, `schema-types`, `schema-utilities`, `schema-keys`, `schema-zod` and `schema-effect`); operation building; provenance verification; rendering; and output comparison for the cloud API generator | Driven by `scripts/generate-cloud-api.mjs`, which alone performs I/O |
| `scripts/` | The model runner, the evidence checker, and the cloud API generator | Python is formatted and linted with ruff; JavaScript with Biome and the TypeScript checker |
| `.tools/` | Downloaded `tla2tools.jar` and TLC logs | Not tracked; created by `make tools` and removed by `make clean` |
| `node_modules/` | Pinned Node.js tooling | Not tracked; created by `make deps` |

_Table 1: What each path is for, and the conventions that apply to it._

## Generated and authored files

Only the cloud API set contains generated files. Editing one by hand makes
`make cloud-api-check` fail; change its inputs and regenerate instead.

| File in `docs/cloud-api/` | Origin | Edit by hand |
| ------------------------- | ------ | ------------ |
| `README.md` | Authored | Yes |
| `coverage.md` | Authored | Yes |
| `cli-authentication.md` | Authored | Yes |
| `http.json` | Authored; input to the generator | Yes |
| `supplemental.json` | Authored; input to the generator | Yes |
| `openapi.yaml` | Generated | No |
| `routes.md` | Generated | No |
| `operations.md` | Generated | No |
| `sources.json` | Generated | No |

_Table 2: Which cloud API files are generated._

## Where new material belongs

- A new document in an existing set goes in that set's directory, and gains a
  line in the set's `README.md` and in `docs/contents.md`.
- A new document set gets its own directory under `docs/`, with a `README.md`
  as its overview.
- A new formal model goes in `tla/`, with an entry per configuration in
  `tla/models.json`.
- Tooling goes in `scripts/` and is exposed as a `Makefile` target, with its
  tests in `tests/`.
