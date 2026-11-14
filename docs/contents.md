# Documentation contents

This is the index for the Lody protocol documentation. Each document appears
once, with a note on why a reader would open it.

## Orientation

- [Documentation contents](contents.md): this index.
- [Project README](../README.md): the three document sets, entry points by
  task, and how the documented protocols relate to one another.
- [Repository layout](repository-layout.md): where documents, formal models,
  generated references, and tooling live, and which files are generated.
- [Developer's guide](developers-guide.md): how to run the gates, check the
  TLA+ models, regenerate the cloud API reference, and add a document.
- [Documentation style guide](documentation-style-guide.md): the spelling,
  formatting, captioning, and document-type conventions that every document
  here follows.

## Flock protocol

How the Lody daemon uses Flock, the Loro team's last-writer-wins key-value
store, to replicate machine state and to accept durable commands.

- [Flock protocol overview](flock-protocol/README.md): the protocol on one
  page, the guarantees it gives, and the evidence for each.
- [Data model](flock-protocol/data-model.md): what a Flock is, how conflicts
  resolve, and the key schema of the Machine Flock; read this before writing
  or parsing rows.
- [Replication and persistence](flock-protocol/replication.md): how replicas
  exchange changes through the cloud stream and the local data plane, and the
  checkpoint rule that stops a replica skipping data after a crash.
- [Sync coordinator](flock-protocol/sync-coordinator.md): the daemon's
  local-first write path and its upload state machine, including retry and
  reconnection.
- [Durable commands](flock-protocol/durable-commands.md): how a client asks a
  daemon to act by writing a row, covering provider setup, cancellation, and
  local project removal.
- [Formal model](flock-protocol/formal-model.md): how the TLA+ modules map to
  the code, what TLC checked, and which mechanisms the ablations show to be
  necessary.
- [Observations and limits](flock-protocol/observations.md): behaviours the
  analysis exposed, the assumptions it rests on, and the questions left open.
- [Evidence index](flock-protocol/evidence.md): the source location and
  permalink behind every `E-…` citation in the Flock documents.
- [References](flock-protocol/references.md): the literature and upstream
  documentation the Flock documents cite.

## Streams RPC

The remote procedure call (RPC) protocol that the Lody daemon serves over
Loro Durable Streams.

- [Streams RPC overview](lody-streams-rpc/README.md): the baseline, the
  boundaries between layers, the material findings, and which guarantees the
  evidence does and does not support.
- [Protocol](lody-streams-rpc/protocol.md): transport, wire contract, request
  lifecycle, authority, deadlines, ordering, deduplication, crash recovery,
  and scheduling for ordinary workspaces.
- [Method reference](lody-streams-rpc/methods.md): every declared and
  registered method reconciled, with per-method rules and detailed
  lifecycles for the methods a compatible implementation must get right.
- [Encrypted RPC](lody-streams-rpc/encrypted-rpc.md): the separate protocol
  for end-to-end encrypted workspaces, covering frames, keys, journals,
  receipts, and delivery over more than one route.
- [Conformance](lody-streams-rpc/conformance.md): executed probes, validated
  examples, the failure matrix, and the conformance cases to test an
  implementation against.
- [Implementation notes](lody-streams-rpc/implementation-notes.md): where
  Lody's code, tests, and prose disagree, the known defects, and what these
  imply for a Rust implementation.
- [Evidence index](lody-streams-rpc/evidence.md): the source location and
  permalink behind every `E-…` citation in the RPC documents.
- [Probes](lody-streams-rpc/probes/): the probe sources and their raw results,
  for anyone repeating or auditing the executed checks.

## Cloud API

The optional cloud services that the public Lody clients call.

- [Cloud API guide](cloud-api/README.md): service origins, credentials,
  sign-in flows, the cloud function transport, attachments, shares, and error
  handling; read this before the references.
- [HTTP route index](cloud-api/routes.md): every documented route with its
  method, origin, and operation, for finding an endpoint quickly.
- [Operation reference](cloud-api/operations.md): each cloud function with its
  kind, arguments, result, and source link.
- [Coverage and evidence limits](cloud-api/coverage.md): what the reference
  includes, known discrepancies, and what only the private backend could
  settle.
- [OpenAPI description](cloud-api/openapi.yaml): the OpenAPI 3.1.1 document
  with request and response schemas, for tooling and code generation.
- [Authored HTTP observations](cloud-api/http.json): the hand-written routes
  and schemas that the generator merges into the OpenAPI document.
- [Supplemental operations](cloud-api/supplemental.json): the five cloud
  functions seen only in client code, outside the public `CloudApi` type.
- [Source manifest](cloud-api/sources.json): the pinned revision and the hash
  of every source file the generated reference was built from.

## Formal models

- [TLA+ models](../tla/): the modules and TLC configurations behind the Flock
  guarantees, explained in the Flock formal model document listed above.
  - [Model manifest](../tla/models.json): every configuration with the verdict
    TLC is expected to reach, including the ablations that must fail.
