# Lody protocol documentation

[Lody Cloud HTTP API](cloud-api/README.md) documents the optional cloud services
used by the public Lody clients, with an [OpenAPI 3.1.1 description](cloud-api/openapi.yaml),
[HTTP route index](cloud-api/routes.md), and [cloud operation reference](cloud-api/operations.md).

The documentation is derived from `../../Lody`, pinned to source revision
`61bd9701a5ed6899a9f42787df682acfc3fd7d4b`. It distinguishes observed client
contracts from details that require the private hosted implementation.

Flock, Loro usage, and Streams RPC are separate documentation efforts.

To regenerate and check the cloud documentation:

```sh
npm ci
npm run generate
npm run check
npm run lint:docs
npm run validate:openapi
```

Set `LODY_SOURCE` to use another Lody checkout. See the cloud guide before updating
the source pin or the authored HTTP contracts.

Run `make check` for all repository gates, or run `make check-fmt lint typecheck
markdownlint nixie` to select them explicitly. Biome checks the generator and
authored JSON formatting and lint; TypeScript checks the JavaScript generator;
Markdownlint checks the documentation; Nixie validates any Mermaid diagrams.
The lint target also verifies generated files and validates OpenAPI. Install
dependencies with `npm ci`; the OpenAPI and diagram gates additionally require
`uvx` and `nixie` on `PATH`. Use `make fmt` to format authored code and JSON.
