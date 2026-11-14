# Lody RPC over Loro Streams

This directory documents the remote procedure call (RPC) protocol that the
Lody daemon runs over Loro Durable Streams: how a caller reaches a machine,
what goes on the wire, what the daemon does with it, and what happens when
something fails. It is written for an engineer implementing a compatible
client and daemon in Rust, and it cites the source for every claim.

It describes what the inspected implementation does. Intended behaviour,
gaps and recommendations are kept apart and labelled.

## Baseline

| Item | Value |
| ---- | ----- |
| Lody checkout | `/data/leynos/Projects/Lody`, resolved from `../../Lody` |
| Commit | [`61bd9701a5ed6899a9f42787df682acfc3fd7d4b`][lody-commit] (14 November 2026) |
| Branch | `main`, not detached |
| Uncommitted changes | None; `git status` was empty before and after the study |
| Submodules | Not initialized (`packages/acp-extension-*`, the mobile chat kit) |
| Dependencies installed in the checkout | None; `node_modules` is absent |

Pinned versions relevant to the protocol, from `pnpm-workspace.yaml` and
`pnpm-lock.yaml` ([E-U10](evidence.md#e-u10)):

| Package | Version | Role here |
| ------- | ------- | --------- |
| `@loro-dev/streams-client` | 0.12.2 | Durable Streams HTTP client used by machine RPC |
| `@loro-dev/loro-cli` | 0.6.0 | Supplies the local `loro dev` Streams server used by tests |
| `@loro-dev/streams-crdt` | 0.20.0 | Document and presence transport; not used by machine RPC |
| `loro-repo` | 0.25.0 | Document host and persistence |
| `@loro-dev/flock-wasm` | 0.5.0 | Replicated key-value store for durable commands |
| `loro-crdt` | 1.17.0 | Document data type |
| `zod` | 4.3.6 | Envelope and parameter validation |
| `effect` | 4.0.2 | Runtime used by the daemon |
| `@noble/hashes` | 2.2.0 | Hashing in the RPC package |
| `@agentclientprotocol/sdk` | `^1.3.0` in the catalogue | Agent Client Protocol (ACP); not part of RPC |

The sha512 digests of the two downloaded `@loro-dev` packages equal the
lockfile's integrity values, so the upstream code read is the code Lody
resolves.

The study did not modify the checkout. Probes ran in a scratch export made
with `git archive`.

## Boundaries

Five layers share a gateway and, on the daemon, an event loop. They are
distinct, and the documents keep them distinct.

| Layer | In one sentence | Where it is documented |
| ----- | --------------- | ---------------------- |
| Loro Durable Streams | Append-only named streams over HTTP, with live tail | [Protocol: transport](protocol.md#transport) |
| Lody RPC | JSON envelopes on a request stream per machine and a response stream per caller, dispatched by the daemon | [Protocol](protocol.md), [methods](methods.md) |
| Encrypted RPC | Signed and sealed frames with journals, for encrypted workspaces | [Encrypted RPC](encrypted-rpc.md) |
| Loro and Flock document synchronization | Replicated state and durable commands as document rows | Touched where it meets RPC; the Flock protocol has its own document set in this repository, on the `docs/flock-protocol` branch |
| Agent Client Protocol | Daemon to agent, over the agent's standard streams | Only its boundary: [protocol: layers](protocol.md#layers) |

A Streams client, the Loro software development kit, an ACP library and Iroh
each implement one of the other layers. None of them implements Lody RPC.

## Reading order

| Document | Contents |
| -------- | -------- |
| [Protocol](protocol.md) | Transport, wire contract, request lifecycle, authority, deadlines, ordering, deduplication, crash recovery, scheduling and liveness for ordinary workspaces |
| [Method reference](methods.md) | Every declared and registered method reconciled; per-method rules; detailed lifecycles for dispatch, cancel, steer, terminate, status, history, restart and upgrade |
| [Encrypted RPC](encrypted-rpc.md) | Encrypted workspaces: frames, keys, journals, receipts, and how Streams, Iroh and durable dispatch interact |
| [Conformance](conformance.md) | Executed probes, validated examples, failure matrix, compatibility classes, conformance cases and the interoperability suite |
| [Implementation notes](implementation-notes.md) | Contradictions, evidence gaps, known defects, and the implications for the Rust implementation |
| [Evidence index](evidence.md) | Every cited source location with a permalink |
| [`probes/`](probes/) | Sources and raw results of the probes |

Encrypted RPC has its own document, and the evidence index and probes are
separate files, because folding them into the protocol document would have
made it unusable.

## Conventions

- Claims carry a basis tag: **Impl** (the code path was read), **Test** (a
  named Lody test asserts it; Lody's tests were not run), **Intent** (prose,
  specification or comment only), **Infer** (inference from cited code),
  **Unknown**, and **Probe** (observed by running the real code in
  isolation; see [conformance](conformance.md#executed-probes)).
- Citations of the form [E-W1](evidence.md#e-w1) point into the
  [evidence index](evidence.md).
- "Daemon" means the Lody command-line interface running as the long-lived
  worker process for one machine (`apps/cli`). "Caller" or "client" means
  whatever appends a request: the web or desktop application, the
  command-line interface addressing another machine, or the mobile
  application.
- "Ordinary workspace" means one without end-to-end encryption (E2EE).
- Durations in prose are spelled out; identifiers and constants are quoted
  as they appear in the source.

## Material findings

1. **The transport gives the protocol very little.** Requests and responses
   are plain appends with no idempotency. The daemon keeps its read position
   in memory only, so a restart, a missing stream or an expired offset makes
   it read the whole retained request stream again.
2. **The only general replay guard is the request's `expiresAt`.** There is
   no request deduplication outside the three history methods. A probe
   confirmed that a second server instance runs every unexpired request
   again and answers it again.
3. **Most failures are silent.** A request that fails validation, names
   another machine or has expired gets no reply. Only a version mismatch is
   answered. The caller cannot distinguish rejection from loss.
4. **No response proves that an agent started.** Dispatch responses mean
   delivery or durable acceptance. Execution is claimed later, by other
   state, after access is checked.
5. **The envelope has no sender.** The server checks the target, the expiry
   and the version. Authority to invoke a method is otherwise whatever each
   handler verifies, and several methods, including stop and terminate,
   verify nothing visible.
6. **History writes are admitted at most once per request identifier**, by a
   claim saved before the write. That is not execution exactly once: a crash
   after the claim leaves the write undone and the identifier refused.
7. **Control requests are prioritized, with one hole.** Intake does not wait
   for handlers, but it does wait when 128 control or history write tasks
   are pending, and then everything behind it waits too.
8. **Nothing bounds handler time, queue residence or payload size**, and one
   event loop carries RPC, presence and document synchronization.
9. **Liveness is presence, not RPC.** Clients decide that a machine is
   online from a 30-second heartbeat with a 90-second expiry on a separate
   stream. `machine/ping` returns a constant.
10. **Encrypted workspaces use a different protocol**, not this one with
    encryption added; see [encrypted RPC](encrypted-rpc.md).

## Guarantees the evidence supports

- A valid, unexpired, correctly addressed request that the daemon reads
  while its lanes have room is dispatched, and a response is appended to the
  request's `replyTo`, at least once.
- A request is not dispatched after its `expiresAt` has passed on the
  daemon's clock, unless it had already passed the expiry check.
- A history write is not executed twice under one request identifier while
  its claim is retained.
- A saved history refusal is returned again for the same request.
- Within one request, progress responses precede the final response.
- An accepted restart or upgrade waits at most five seconds for its response
  to be delivered before proceeding.

## Guarantees that are missing

- Delivery of a request to the daemon, or of a response to the caller.
- Any signal that a request was rejected, other than a version mismatch.
- Deduplication of requests across a daemon restart, outside history.
- Ordering between requests, beyond admission order within a lane.
- Cancellation of a running handler when the caller gives up.
- Authentication of the requester named in a request.
- Any bound on handler duration or message size.

## Unresolved blockers

These cannot be settled from the repository. Each has a proposed experiment
in [conformance](conformance.md#open-questions-and-the-smallest-experiment-for-each).

- Production gateway behaviour: retention, offsets, heartbeat and close
  cadence, size limit, consistency across shard hosts.
- The scope of a Streams token, and what the cloud verification endpoints
  enforce by role.
- Whether a replayed restart request restarts the daemon again.
- Whether the real handlers are idempotent under replay.

## Method

Eight read-only research passes over the checkout produced cited notes on
transport, wire contract, the server, the method inventory, method
lifecycles, encrypted RPC, daemon composition and client call sites. The
documents were written from those notes. Citations were then verified
mechanically against the pinned source, and the behaviours that mattered
most were run: see [conformance](conformance.md#executed-probes).

This is a reading of the source and of published packages, not a statement
by the Lody authors.

[lody-commit]: https://github.com/LodyAI/Lody/tree/61bd9701a5ed6899a9f42787df682acfc3fd7d4b
