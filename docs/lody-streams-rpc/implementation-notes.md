# Implementation notes

This document collects what does not belong in a description of behaviour:
places where Lody's code, tests and prose disagree; the limits of the
evidence; defects that a compatible implementation has to take a position on;
and, in a separate final part, what all of it implies for the Rust
implementation.

Everything before
[implications for the Rust implementation](#implications-for-the-rust-implementation)
describes Lody at commit `61bd9701a`. Nothing in that part is a recommendation.

## Contradictions

Each row states both sides and what the disagreement means for
interoperability. Contradictions specific to encrypted workspaces are in
[encrypted RPC](encrypted-rpc.md), and those specific to one method are in the
[method reference](methods.md).

| Id | One source says | Another source says | Consequence |
| -- | --------------- | ------------------- | ----------- |
| CT-01 | Source comment and package instructions: handler permits wait inside tasks, so intake never blocks ([E-N9](evidence.md#e-n9)) | Code: intake waits when the control or history write set holds 128 tasks ([E-S1](evidence.md#e-s1)) | Control requests can be delayed behind history writes. No test covers the branch |
| CT-02 | Source comment: the ordinary limit applies backpressure to the read loop | Code: a full ordinary lane sheds with an overload error ([E-S5](evidence.md#e-s5)) | The comment is stale; the observable behaviour is the error |
| CT-03 | Source comment and internal map: the streams client (0.5.0) has no read timeout, hence the watchdog ([E-N1](evidence.md#e-n1)) | Pinned client 0.12.2 has an idle timer and reconnects itself ([E-U6](evidence.md#e-u6)) | The 120-second watchdog is a backstop, not the stall detector |
| CT-04 | Test title: "opens SSE live reads from the requested offset and cursor" | Its assertion: only the offset is passed; the upstream call has no cursor input ([E-T21](evidence.md#e-t21)) | Cursors are not resumed across reads. Do not model them as resumable |
| CT-05 | Test title: "defaults to the proxy gateway" | Its assertion: a missing base URL throws ([E-T5](evidence.md#e-t5)) | There is no default gateway |
| CT-06 | Source comment: the three declared error codes are a stable contract that clients match ([E-W7](evidence.md#e-w7)) | The daemon emits many more codes; no web or desktop code matches those three | The codes clients depend on are the ones listed in [conformance](conformance.md#behaviour-that-existing-clients-rely-on) |
| CT-07 | Internal map: `requestProjectProbeLocalMember` returns null on failure | Code: an error envelope for that method falls through to an object shaped like a preview-revoke failure ([E-W21](evidence.md#e-w21)) | A caller of that helper can receive an object of the wrong shape. The same applies to `machine/provider-rate-limits-refresh` |
| CT-08 | Package README: appends keep a 10-second upload deadline by default | The daemon configures a 30-second connect timeout, which also governs appends ([E-T20](evidence.md#e-t20), [E-T11](evidence.md#e-t11)) | A daemon response append can take up to 30 seconds per attempt |
| CT-09 | Internal map and package instructions: stop fences queued handlers and retains started work until completion ([E-N9](evidence.md#e-n9)) | Code: `stop()` awaits nothing and no production code awaits the tracked tasks ([E-S14](evidence.md#e-s14)) | In-flight requests can go unanswered at shutdown |
| CT-10 | Test: "stops the request loop and notifies on a non-retriable token auth failure" | The test's fake reader throws the error directly; through the real stream client the error class is lost (P-3) | The branch is not reached by that route. The daemon's fatal path depends on the token provider instead |
| CT-11 | `method_unavailable` is one of the three declared contract codes ([E-W7](evidence.md#e-w7)) | With the daemon's actual wiring it is not reachable, and an unwired method is answered in one of five ways depending on the method ([methods](methods.md)) | A caller cannot rely on `method_unavailable` to detect an unsupported method; capabilities in the machine record are the only signal |
| CT-12 | Package README: `pnpm test:integration` starts `loro dev` and runs a round trip | With the pinned `@loro-dev/loro-cli` 0.6.0 all three tests fail: the server defaults to cleartext HTTP/2 and requires the bucket to exist (P-11) | The integration test does not currently establish anything. The probes in this study supplied `--protocol http1` and created the bucket |
| CT-13 | Package instructions list eight Code Collab methods | The method set has eleven ([E-W3](evidence.md#e-w3)) | Use the schema, not the prose |
| CT-14 | Source comment and instructions: the content envelope keeps user content out of the clear on the Streams plane | The key derives from source constants and an identifier sent in the same envelope ([E-W17](evidence.md#e-w17)) | The envelope is owner binding, not confidentiality against a stream reader |
| CT-15 | Package instructions: the dispatch request's TTL equals the client deadline | The client deadline is an inactivity timer renewed by progress; `expiresAt` is absolute ([E-C2](evidence.md#e-c2)) | Equal only for methods without progress, which includes dispatch |
| CT-16 | Option comment: `maxPendingRequests` bounds admitted ordinary tasks | Code: the effective limit is the larger of that and the concurrency ([E-S1](evidence.md#e-s1)) | A smaller value is silently raised |
| CT-17 | Two incident notes are filed as proposed ([E-N4](evidence.md#e-n4)) | The pinned SDK versions are at or beyond the versions those notes name as fixed | Treat the incidents as history, and the fixes as present by version only; the source was not re-read |
| CT-18 | `specs/machine-lifecycle-ack.md` is a draft that also describes durable replay rejection for managed updates ([E-N10](evidence.md#e-n10)) | The server implements only the response-delivery part ([E-S13](evidence.md#e-s13)) | A replayed restart request is dispatched again by the server; see [methods](methods.md) |
| CT-19 | Mobile client: callers wait longer than the `expiresAt` they send, and stamp it from the device clock ([E-K7](evidence.md#e-k7)) | The daemon drops a request at `expiresAt` by its own calibrated clock ([E-W12](evidence.md#e-w12)) | A mobile caller can wait for a request the daemon has already dropped |

_Table 1: Contradictions between sources, and the consequence of each._

## Evidence gaps

| Gap | Effect on these documents |
| --- | ------------------------- |
| The upstream repositories for the Streams client, the gateway and `loro-repo` were not readable | Upstream behaviour is read from the published npm packages. Gateway behaviour is **Intent** from the packaged protocol text, or **Unknown** |
| The Streams token issuer and the cloud verification endpoints are not in the repository | Token scope, role enforcement, proof semantics and single-use rules are **Unknown** |
| Lody's `acp-extension-*` submodules are not initialized in the checkout | Agent adapter sources were not read. They are outside the RPC protocol |
| The Roost SDK is not installed | Atomicity of input receipts and rejection of changed content under one input identifier rest on prose and test titles |
| Lody's unit tests were not run | **Test** means a test with that title asserts the behaviour in its source |
| The production gateway was not contacted | TTL semantics, heartbeat and close cadence, size limits and cross-shard consistency are **Unknown** |
| Parts of `message-handler.ts` and the execution service were read in ranges, not in full | "No identity check visible" is not proof that none exists deeper in a handler |
| The Electron main-process host and the Rust core of Iroh were not read | The desktop's local path and Iroh internals are described only at their boundary |
| Rows in the [evidence index](evidence.md) marked "Reported" | The cited lines were located by a research pass and not checked mechanically |

_Table 2: Evidence gaps and their effect on these documents._

No file in the Lody checkout was dirty, so every citation is pinned to the
commit.

## Known defects and hazards

These follow from the source. None is a measured performance result.

| Id | Defect or hazard | Evidence | What a client or daemon observes |
| -- | ---------------- | -------- | -------------------------------- |
| KD-01 | No general deduplication; a restart, a 404 or a 410 replays every unexpired request | P-9; [E-T30](evidence.md#e-t30) | Handlers run twice; two responses under one `id` |
| KD-02 | Invalid, misaddressed and expired requests are dropped without a reply | P-6 | The caller cannot tell rejection from loss |
| KD-03 | Intake blocks at 128 pending control or history write tasks | [E-S1](evidence.md#e-s1) | Control requests stall behind history writes |
| KD-04 | `replyTo` is unvalidated and the daemon creates the stream it names | [E-S12](evidence.md#e-s12) | Any writer to a request stream directs daemon writes to any stream in the bucket |
| KD-05 | The envelope carries no sender identity; several methods run no identity check | [E-W31](evidence.md#e-w31) | Authority to stop or terminate a session is authority to append to the request stream |
| KD-06 | No handler deadline; a permit is held until the handler and its response append settle | [E-S6](evidence.md#e-s6) | A stuck handler removes a lane slot for the life of the process |
| KD-07 | No size limit on requests or responses in the server | [E-W26](evidence.md#e-w26) | An oversized response fails at the gateway and is not retried |
| KD-08 | The refusal store opens a synchronous SQLite connection per history request, with a five-second busy timeout | [E-S11](evidence.md#e-s11) | A lock wait blocks the whole daemon, including presence |
| KD-09 | Response appends have no idempotency | [E-U2](evidence.md#e-u2) | Duplicate responses after a retry |
| KD-10 | `internal_error` carries raw error text | [E-W24](evidence.md#e-w24), P-7 | Internal strings reach callers |
| KD-11 | Invalid requests are logged with raw parameters; redaction covers only some methods | [E-S24](evidence.md#e-s24) | Request content in daemon logs |
| KD-12 | A payload that is not valid JSON is skipped whole, after the offset moved | [E-T21](evidence.md#e-t21) | Requests in that payload are lost without a reply |
| KD-13 | A closed stream or a persistent 410 makes the read loop spin without delay | [E-T29](evidence.md#e-t29) | Network and processor load; **Infer** |
| KD-14 | The daemon reads with static SSE and cannot fall back to long-poll | [E-T29](evidence.md#e-t29) | If SSE is unavailable the daemon retries every second indefinitely |
| KD-15 | `stop()` does not drain; shutdown is capped at seven seconds | [E-S14](evidence.md#e-s14), [E-D6](evidence.md#e-d6) | Requests in flight at shutdown may get no response |
| KD-16 | A token endpoint 401 or 403 for one workspace stops the daemon for all | [E-S21](evidence.md#e-s21) | One workspace's credential failure takes every workspace offline |
| KD-17 | The history write claim is saved before the write | [E-S10](evidence.md#e-s10) | A crash between the two refuses the write until the claim expires |
| KD-18 | A workspace's RPC server keeps running after the workspace is revoked | [E-D13](evidence.md#e-d13) | Requests may still be handled until cloud checks refuse them; **Unknown** |
| KD-19 | Progress is recognized by the shape of `result`, not by method | [E-W9](evidence.md#e-w9) | A final result shaped like progress would never settle the call |
| KD-20 | In an encrypted workspace, a `session/fork` sent to another member's machine is prepared and executed, but the sender verifies the reply as if the machine were its own | [Encrypted RPC](encrypted-rpc.md) | The fork is created and the caller sees a timeout; **Infer** from the code, not run |

_Table 3: Known defects and hazards, and what a client or daemon observes._

## Implications for the Rust implementation

Everything from here on is recommendation or consequence, not a description
of Lody.

### What a reusable Streams client covers

The crate `loro-streams-client` 0.1.0 is published and describes itself as a
Rust client for Loro Durable Streams. Its public surface is transport only:
create, delete, head, append, compare-and-set append, close, read, backward
read, SSE session, bootstrap, snapshots and live tail, with static or dynamic
bearer authentication ([E-U12](evidence.md#e-u12)). Its scope was established
by reading the published crate archive; it was not built or run, and which
version of the TypeScript client it tracks is unknown.

It contains none of the following, all of which are application code:

- Lody stream naming, the request and response envelopes and their strict
  validation.
- Per-method parameter and result types, the content envelope and the secret
  field envelope.
- Client correlation, inactivity timers, progress handling and the cancel
  request.
- Daemon intake, lanes, overload refusals, history deduplication, the refusal
  store and the lifecycle acknowledgement.
- The live-mode policy, shard selection and the Lody token endpoint client.
- Presence, the machine record, document synchronization and durable
  commands.
- Everything for encrypted workspaces.

Two differences from the TypeScript client matter. The crate's timeout
configuration has no upload budget, so the append deadline has to be imposed
by the caller. Its live tail reconnects indefinitely by default where the
TypeScript client stops after five failures, so the Lody loop's handling of a
terminal error will be reached differently.

Neither the Loro SDK, an ACP SDK nor Iroh supplies any of the list above.

### By milestone

1. **Read-only observation.** Existing web and desktop clients show a
   machine's status and a session's history from presence, the machine
   record and the session documents. A daemon that writes history into Loro
   session documents and does not advertise the Roost history capability
   needs to serve no RPC method for that (**Infer**;
   [E-K6](evidence.md#e-k6)). It should still create the request stream,
   because clients treat its absence as "unreachable". Roost-backed sessions
   need `session/history-read`, and `session/history-watch` if that
   capability is advertised.
2. **Hosting an ACP agent.** ACP stays between the daemon and the agent. The
   RPC surface needed is whatever the daemon chooses to advertise; nothing
   in ACP is exposed on it.
3. **Remote control from existing clients.** This needs the mandatory wire
   compatibility and the relied-on behaviour listed in
   [conformance](conformance.md#compatibility-classes), for at least
   `machine/ping`, `machine/status`, turn dispatch, `session/cancel`,
   `session/steer` and `session/terminate`, with capabilities advertised
   only for what is implemented. Because requests with unknown fields are
   dropped silently by Lody, a Rust daemon that advertises a capability must
   accept every field that capability gates.

### Compatibility decisions to make explicitly

| Defect | Compatible options | Note |
| ------ | ------------------ | ---- |
| KD-01 replay after restart | Persist the read offset; or keep a bounded, durable set of handled request identifiers until each `expiresAt`; or keep Lody's behaviour | Existing clients tolerate either. Persisting an offset must still handle a 404 or 410 reset. An identifier set gives at-most-once admission, not execution exactly once |
| KD-02 silent drops | Keep silence; or answer with an error when `id` and `replyTo` are readable | Existing clients ignore responses they cannot match or parse, so an error is safe only in a valid envelope with a declared `method`. For an unknown method no valid response envelope exists |
| KD-03 intake blocking | Shed control and history write overflow instead of waiting | Not observable by a correct peer except as an overload error |
| KD-04 unvalidated `replyTo` | Require the workspace prefix `<workspaceId>:rpc:res:` | Both existing forms satisfy it |
| KD-07 no size limit | Enforce limits before parsing and before appending | Choose limits after the gateway's limit is known |
| KD-10 raw error text | Send a fixed message with `internal_error` | Clients display the message but do not match it |
| KD-15 no drain | Drain within a bound before exit | Not observable except as fewer lost responses |
| KD-16 fleet-wide authentication failure | Scope the failure to the workspace | A behaviour change that clients cannot observe directly |

_Table 4: Compatibility decisions to make explicitly for each defect._

### Execution isolation and bounds

The stated goal is that expensive work stays off network and liveness paths
and that nothing buffers without bound. Against Lody's structure that means:

- **Intake does no blocking work.** Parse and classify on the read task;
  validate, hash, decrypt and touch storage on worker tasks. Never perform
  synchronous database or file work on the task that reads the stream or the
  task that publishes presence (KD-08).
- **Every queue has an item bound and a byte bound**, and overflow sheds with
  the overload error. That includes the queue behind the dispatch methods and
  the per-request chain of progress appends, which Lody leaves unbounded.
- **Every handler has a deadline**, derived from the request's `expiresAt`
  where one exists, and a cancellation signal. Release the lane permit at the
  deadline (KD-06).
- **Response publication is separate from handler execution**, with its own
  bounded queue, so a slow gateway does not hold handler permits.
- **Control requests have reserved capacity that intake can always reach**:
  shed, never wait (KD-03).
- **Presence has its own task, connection and timer**, and shares no lock or
  queue with RPC or document flushes. Lody's incident notes show the
  heartbeat missing its TTL when the event loop or the presence queue was
  busy ([E-N2](evidence.md#e-n2), [E-N6](evidence.md#e-n6)).
- **Token refresh is shared but non-blocking**: a slow token fetch should
  delay new connections, not established ones.
- **Reads fall back.** Support long-poll on the daemon as well as SSE
  (KD-14), and back off on repeated 410 or end-of-stream (KD-13).
- **Clocks.** Compare `expiresAt` with a server-calibrated clock, as Lody
  does, and decide how much skew to tolerate for mobile callers (CT-19).

### Work that remains

- Envelope types with strict decoding, and the per-method types for whatever
  subset is advertised.
- The daemon intake, lanes, overload path, response publisher and shutdown
  drain, with the bounds above.
- The history refusal and claim store, if history methods are served.
- A caller, if the Rust command line is to address other machines.
- Presence and the machine record with `rpcVersion` and
  `protocolCapabilities`.
- The conformance cases in [conformance](conformance.md), first against the
  TypeScript server and client over a local Streams server, then against a
  non-production gateway for the open questions.
- A decision on each row of the compatibility table above, recorded before
  the first interoperability test is written.
