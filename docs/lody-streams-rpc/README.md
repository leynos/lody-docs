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

_Table 1: The Lody checkout that the study read._

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

_Table 2: Pinned package versions relevant to the protocol._

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
| Loro and Flock document synchronization | Replicated state and durable commands as document rows | Touched where it meets RPC; [Loro documents](../loro-documents/README.md) and [the Flock protocol](../flock-protocol/README.md) each have their own document set |
| Agent Client Protocol | Daemon to agent, over the agent's standard streams | Only its boundary: [protocol: layers](protocol.md#layers) |

_Table 3: The five layers, and where each is documented._

A Streams client, the Loro software development kit, an ACP library and Iroh
each implement one of the other layers. None of them implements Lody RPC.

The Streams token that admits a caller to the gateway is issued by the cloud
services, which the [cloud API guide](../cloud-api/README.md) documents. The
[architecture overview](../architecture/README.md) places every layer in one
picture, and the [documentation contents](../contents.md) list every document
in the repository.

## Reading order

| Document | Contents |
| -------- | -------- |
| [Protocol](protocol.md) | Transport, wire contract, request lifecycle, authority, deadlines, ordering, deduplication, crash recovery, scheduling and liveness for ordinary workspaces |
| [Method reference](methods.md) | Every declared and registered method reconciled; per-method rules; detailed lifecycles for dispatch, cancel, steer, terminate, status, history, restart and upgrade |
| [Encrypted RPC](encrypted-rpc.md) | Encrypted workspaces: frames, keys, journals, receipts, and how Streams, Iroh and durable dispatch interact |
| [Conformance](conformance.md) | Executed probes, validated examples, failure matrix, compatibility classes, conformance cases and the interoperability suite |
| [Formal models](formal-model.md) | TLA+ models of request replay, the history-write claim and encrypted multi-route dispatch, with TLC's verdicts |
| [Implementation notes](implementation-notes.md) | Contradictions, evidence gaps, known defects, and the implications for the Rust implementation |
| [Evidence index](evidence.md) | Every cited source location with a permalink |
| [`probes/`](probes/) | Sources and raw results of the probes |

_Table 4: Documents in the Streams RPC set._

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
   are plain appends with no idempotency (**Impl**;
   [E-T19](evidence.md#e-t19), [E-U2](evidence.md#e-u2)). The daemon keeps
   its read position in memory only, so a restart, a missing stream or an
   expired offset makes it read the whole retained request stream again
   (**Impl**; [E-T30](evidence.md#e-t30), [E-T29](evidence.md#e-t29);
   **Probe** P-9).
2. **The only general replay guard is the request's `expiresAt`.** There is
   no request deduplication outside the three history methods (**Impl**;
   [E-W12](evidence.md#e-w12), [E-M31](evidence.md#e-m31)). A probe
   confirmed that a second server instance runs every unexpired request
   again and answers it again (**Probe** P-9).
3. **Most failures are silent.** A request that fails validation, names
   another machine or has expired gets no reply. Only a version mismatch is
   answered (**Impl**; [E-W12](evidence.md#e-w12); **Probe** P-6). The
   caller cannot distinguish rejection from loss (**Infer**).
4. **No response proves that an agent started.** Dispatch responses mean
   delivery or durable acceptance. Execution is claimed later, by other
   state, after access is checked (**Impl**; [E-L4](evidence.md#e-l4),
   [E-L5](evidence.md#e-l5), [E-L11](evidence.md#e-l11); **Intent**
   [E-L8](evidence.md#e-l8)).
5. **The envelope has no sender.** The server checks the target, the expiry
   and the version (**Impl**; [E-M32](evidence.md#e-m32),
   [E-W12](evidence.md#e-w12)). Authority to invoke a method is otherwise
   whatever each handler verifies, and several methods, including stop and
   terminate, verify nothing visible (**Impl**;
   [E-M55](evidence.md#e-m55), [E-M56](evidence.md#e-m56)).
6. **History writes are admitted at most once per request identifier**, by a
   claim saved before the write. That is not execution exactly once: a crash
   after the claim leaves the write undone and the identifier refused
   (**Impl**; [E-S10](evidence.md#e-s10), [E-L56](evidence.md#e-l56)).
7. **Control requests are prioritized, with one hole.** Intake does not wait
   for handlers, but it does wait when 128 control or history write tasks
   are pending, and then everything behind it waits too (**Impl**;
   [E-S1](evidence.md#e-s1), [E-M27](evidence.md#e-m27)).
8. **Nothing bounds handler time, queue residence or payload size** (**Impl**,
   by absence; [E-S6](evidence.md#e-s6), [E-W26](evidence.md#e-w26)), and
   one event loop carries RPC, presence and document synchronization
   (**Impl**; [E-D1](evidence.md#e-d1)).
9. **Liveness is presence, not RPC.** Clients decide that a machine is
   online from a 30-second heartbeat with a 90-second expiry on a separate
   stream (**Impl**; [E-D2](evidence.md#e-d2), [E-K1](evidence.md#e-k1)).
   `machine/ping` returns a constant (**Impl**; [E-D4](evidence.md#e-d4)).
10. **Encrypted workspaces use a different protocol**, not this one with
    encryption added (**Impl**; [E-M41](evidence.md#e-m41),
    [E-M42](evidence.md#e-m42)); see [encrypted RPC](encrypted-rpc.md).

## Guarantees the evidence supports

- A valid, correctly addressed request whose `rpcVersion` matches the
  daemon's, that the daemon reads while its lanes have room, and that is still
  unexpired when `handleRawRequest` checks `expiresAt`, is dispatched at least
  once. A request that expires between the read and that check is dropped
  without dispatch (**Impl**; [E-W12](evidence.md#e-w12),
  [E-S1](evidence.md#e-s1)). A version mismatch is answered with
  `rpc_version_mismatch` without invoking the handler. History requests are
  the exception to dispatch: an identical request that arrives while the first
  is running joins it, and a replay of a claimed or refused request is
  answered from the claim store (**Impl**; [E-S7](evidence.md#e-s7),
  [E-S8](evidence.md#e-s8), [E-S10](evidence.md#e-s10)). Where the method
  produces a response, the daemon attempts to append it to the request's
  `replyTo` (**Impl**; [E-S12](evidence.md#e-s12),
  [E-W24](evidence.md#e-w24)). Some paths return without attempting a final
  response: `machine/acp-capabilities-refresh-cancel`, which appends nothing;
  an aborted capability refresh, which suppresses any progress or final
  append not yet started when the abort is observed, although an append
  already started may still be stored; and a history write whose deadline
  passes after its claim (**Impl**;
  [E-M21](evidence.md#e-m21), [E-M63](evidence.md#e-m63),
  [E-S29](evidence.md#e-s29), [E-L56](evidence.md#e-l56)). If every append
  attempt fails, including the fallback `internal_error` append, publication
  is unconfirmed: an append whose acknowledgement was lost may still have
  been stored (**Infer**; [E-S12](evidence.md#e-s12)).
- A request is not dispatched after its `expiresAt` has passed on the
  daemon's clock, unless it had already passed the expiry check (**Impl**;
  [E-W12](evidence.md#e-w12)).
- A history write is not executed twice under one request identifier while
  its claim is retained (**Impl**; [E-S10](evidence.md#e-s10),
  [E-L56](evidence.md#e-l56)).
- A saved history refusal is returned again for the same request (**Impl**;
  [E-S8](evidence.md#e-s8), [E-L44](evidence.md#e-l44); **Test**
  [E-L71](evidence.md#e-l71)).
- Within one request, progress responses precede the final result
  (**Impl**; [E-S29](evidence.md#e-s29); **Test**, for the capability
  refresh only, [E-S30](evidence.md#e-s30); see
  [protocol](protocol.md#progress-overload-and-cancellation)).
- An accepted restart or upgrade waits at most five seconds for its response
  to be delivered before proceeding (**Impl**; [E-S13](evidence.md#e-s13);
  **Test** [E-L85](evidence.md#e-l85)).

## Guarantees that are missing

- Delivery of a request to the daemon, or of a response to the caller
  (**Impl**; [E-C1](evidence.md#e-c1), [E-S12](evidence.md#e-s12)).
- Any signal that a request was rejected, other than a version mismatch
  (**Impl**; [E-W12](evidence.md#e-w12)).
- Deduplication of requests across a daemon restart, outside history
  (**Impl**; [E-T30](evidence.md#e-t30); **Probe** P-9).
- Ordering between requests, beyond admission order within a lane (**Impl**;
  [E-M27](evidence.md#e-m27), [E-S3](evidence.md#e-s3)).
- Cancellation of a running handler when the caller gives up (**Impl**;
  [E-M63](evidence.md#e-m63) is the only cancellable method).
- Authentication of the requester named in a request (**Impl**;
  [E-M32](evidence.md#e-m32); **Intent** [E-W31](evidence.md#e-w31)).
- Any bound on handler duration or message size (**Impl**, by absence;
  [E-W26](evidence.md#e-w26)).

## Unresolved blockers

These cannot be settled from the repository. Each has a proposed experiment in
[conformance](conformance.md#open-questions-and-the-smallest-experiment-for-each).

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
