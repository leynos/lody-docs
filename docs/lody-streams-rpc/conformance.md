# Conformance

This document turns the [protocol](protocol.md) and the
[method reference](methods.md) into things that can be checked: the probes
that were executed for this study, validated examples, a failure matrix, a
classification of what a compatible implementation must preserve, a
conformance matrix with stable case identifiers, and an interoperability
suite in both directions.

Basis tags are those of the protocol document: **Impl**, **Test**,
**Intent**, **Infer**, **Unknown** and **Probe**.

## Executed probes

The probes ran real Lody code from a scratch export of commit `61bd9701a`
(`git archive`), with the pinned dependencies of `@lody/loro-streams-rpc` and
`@lody/shared` installed there. The Lody checkout itself was not modified. No
production service was contacted and no agent was started. The probe sources
and raw results are in [`probes/`](probes/).

| Id | What ran | Result |
| -- | -------- | ------ |
| P-1 | 24 request and 13 response envelopes through `LoroStreamsRpcRequestSchema` and `LoroStreamsRpcResponseSchema` | Accept and reject outcomes as listed under [validated examples](#validated-examples); identifiers are trimmed; parsed key order follows the schema |
| P-2 | `encryptCodeCollabV2RpcPayload` and `decryptCodeCollabV2RpcPayload` round trip; `deriveCodeCollabV2ContentKeyId('session-1')` | Round trip succeeds; a different expected owner is refused with "Code Collab RPC payload owner session mismatch."; key identifier `ccv2:efb61a27dce18cd331dd9f25` |
| P-3 | Real `createLoroStreamsJsonStreamClient` over a stub `fetch`: token callback throwing `LoroStreamsTokenAuthError`; gateway answering 401 once | The caller receives a plain `Error`, not `LoroStreamsTokenAuthError`, and no request is sent; after a 401 the token callback is called again with no arguments and the append is retried once |
| P-4 | One `appendJson` over a stub `fetch` | `POST …/ds/bucket-1/workspace-1%3Arpc%3Areq%3Amachine-1` with only `authorization` and `content-type: application/json` headers |
| P-5 | Real client and real `LoroStreamsMachineRpcServer` through a local `loro dev` server | `machine/ping` round trip succeeds |
| P-6 | Raw requests appended to the request stream: unknown method, extra key, other machine, expired | No response to any of them; a warning is logged only for the first two |
| P-7 | Raw requests: `rpcVersion` `"0"`; `machine/status` on a server built without that handler, which the types require | `rpc_version_mismatch` with message `Expected rpcVersion=1, got 0`; `internal_error` with message `this.deps.getMachineStatus is not a function`, showing that raw error text reaches the caller |
| P-8 | One append whose body is an array of two requests | The development server flattens it; both requests are handled |
| P-9 | Stop the server; start a second instance on the same stream | Every unexpired request's handler runs again; a second response is appended under each `id` |
| P-10 | Raw HTTP against the development server | Stream operations before the bucket exists return 404; `offset=0` and `offset=-1` both read from the start; a TTL of four seconds is counted from creation and not renewed by an append; an empty array append returns 400; a wrong content type returns 409 |
| P-11 | Lody's own opt-in integration test, unmodified, with `LODY_LORO_STREAMS_RPC_INTEGRATION=1` | All three tests fail with `fetch failed`: `loro dev` 0.6.0 serves cleartext HTTP/2 by default, and it also requires the bucket to exist |

Commands, from `packages/loro-streams-rpc` in the scratch copy:

```sh
vitest run -c vitest.probe.config.ts tests/zz-probe.test.ts
python3 build_live_probe.py
vitest run -c vitest.probe.config.ts tests/zz-live.test.ts
LODY_LORO_STREAMS_RPC_INTEGRATION=1 \
  vitest run -c vitest.probe.config.ts tests/loro-streams-rpc.integration.test.ts
```

Limits of these probes:

- The development server is not the production gateway. It has no
  authentication, holds a long-poll for one second, sends no heartbeat and
  never closes an SSE connection on a timer. P-8 and P-10 describe that
  server only.
- Two Lody submodules that `@lody/shared` imports were not initialized in the
  checkout. `acp-extension-core` was fetched at its pinned commit.
  `acp-extension-dsh` could not be: the pinned commit is not in the public
  repository, so its default branch was used. Neither affects the RPC
  schemas.
- P-9 used a synthetic `machine/ping` handler. It shows that the server
  dispatches a replayed request again; it says nothing about any real
  handler's idempotency.
- Lody's unit tests were not run. A **Test** tag in these documents means
  that a test with that title asserts the behaviour in the source.

## Validated examples

Every example below was run through the real validators in P-1. They are
synthetic: none is an upstream test vector, and none contains ciphertext or a
signature.

A request that is accepted:

```json
{
  "jsonrpc": "2.0",
  "id": "3f0e6c1e-5b7a-4c7e-9a3e-0d5f4d2b9a11",
  "method": "machine/ping",
  "rpcVersion": "1",
  "machineId": "machine-1",
  "workspaceId": "workspace-1",
  "replyTo": "workspace-1:rpc:res:7b1d2c3e-0000-4000-8000-000000000001",
  "sentAt": 1790000000000,
  "expiresAt": 1790000030000,
  "params": { "requestId": "ping-1" }
}
```

Its response, accepted by the envelope schema and by
`MachinePingResponseSchema`:

```json
{
  "jsonrpc": "2.0",
  "id": "3f0e6c1e-5b7a-4c7e-9a3e-0d5f4d2b9a11",
  "method": "machine/ping",
  "rpcVersion": "1",
  "machineId": "machine-1",
  "result": {
    "type": "machine/ping_response",
    "machineId": "machine-1",
    "requestId": "ping-1",
    "success": true,
    "message": "pong"
  }
}
```

An overload response, accepted:

```json
{
  "jsonrpc": "2.0",
  "id": "3f0e6c1e-5b7a-4c7e-9a3e-0d5f4d2b9a11",
  "method": "machine/status",
  "rpcVersion": "1",
  "machineId": "machine-1",
  "error": {
    "code": "rpc_request_capacity_exceeded",
    "message": "The machine request queue is full."
  }
}
```

Variations on the ping request, by validator outcome:

| Variation | `LoroStreamsRpcRequestSchema` | What the daemon then does |
| --------- | ----------------------------- | ------------------------- |
| `sentAt: 1234.56`, `expiresAt: 2234.56` | Accepted | Drops it as expired |
| `replyTo: "workspace-1:rpc:res:machine-1:abc"` | Accepted | Replies there |
| `replyTo: "anything at all"` | Accepted | Replies there |
| `rpcVersion: "2"` | Accepted | Answers `rpc_version_mismatch` |
| `sentAt: 1`, `expiresAt: 2` | Accepted | Drops it as expired |
| `sentAt: 10`, `expiresAt: 5` | Accepted | Drops it as expired |
| `id: "  padded  "` | Accepted; parsed `id` is `padded` | Replies with `id` `padded` (**Infer**) |
| Extra key `traceId` | Rejected | No reply; warning logged |
| `method: "machine/reboot"` | Rejected | No reply; warning logged |
| `expiresAt: 0` | Rejected | No reply |
| `expiresAt: "2026-01-01T00:00:00Z"` | Rejected | No reply |
| `params: { "requestId": "p", "extra": 1 }` | Rejected | No reply |
| `params: null`, or `params` absent | Rejected | No reply |
| `id: "   "` | Rejected | No reply |
| `jsonrpc: "1.0"` | Rejected | No reply |
| `replyTo: null` | Rejected | No reply |
| `rpcVersion: 1` | Rejected | No reply |
| The request wrapped in an array | Rejected by the schema | The gateway flattens an array body before the daemon sees it (P-8) |
| `machine/status` with `params: {}` or `{ "includeDisk": true }` | Accepted | Dispatched |
| `machine/status` with `params: { "includeDisk": false }` | Rejected | No reply |
| `file/preview` with plain parameters instead of a content envelope | Rejected | No reply |
| `file/preview` with a content envelope produced by the real encryptor | Accepted | Dispatched |

Variations on the ping response, by validator outcome:

| Variation | `LoroStreamsRpcResponseSchema` |
| --------- | ------------------------------ |
| `result: null` | Accepted by the envelope; fails the per-method schema afterwards |
| `error` with `data` | Accepted |
| Both `result` and `error` | Rejected |
| Neither | Rejected |
| `error.message: "   "` | Rejected |
| `error: null` with a `result` | Rejected |
| `method: "machine/reboot"` | Rejected |
| Extra key `workspaceId` | Rejected |
| `error.code: -32601` | Rejected |
| `error` with an extra key `retryable` | Rejected |

Lody's own tests contain further literal envelopes that can serve as inputs,
for example the timestamp cases at [E-W29](evidence.md#e-w29). The only
fixed-byte fixtures in the package are for encrypted RPC
([encrypted RPC](encrypted-rpc.md)).

## Failure matrix

"Retained state" is what survives the failure. Rows for encrypted workspaces
are in [encrypted RPC](encrypted-rpc.md).

| Case | Current response | Retry decision | Retained state | Observable outcome | Basis |
| ---- | ---------------- | -------------- | -------------- | ------------------ | ----- |
| Streams token near expiry | Refreshed 30 seconds early; concurrent callers share one fetch | Automatic | New token in memory | None | **Impl** [E-T9](evidence.md#e-t9) |
| Token endpoint answers 401 or 403 | Provider becomes terminal for that credential; the daemon's fatal path clears the credential and exits | None | None | The whole daemon stops, for every workspace | **Impl** [E-S21](evidence.md#e-s21) |
| Gateway answers 401 or 403 to a stream operation | Upstream client retries once after calling the token callback without the rejected token | One retry | Unchanged | Whether a new token is minted is **Unknown** | **Probe** P-3 |
| Token callback throws on the daemon's read | Plain `Error`; the request loop waits one second and retries indefinitely | Unbounded | Offset in memory | The fatal branch in the server is not reached by this route | **Probe** P-3 |
| Request stream missing when a caller appends | Caller result `machine_rpc_unavailable` | None by the client | None | User interface shows the machine as unreachable | **Impl** [E-C5](evidence.md#e-c5), [E-K2](evidence.md#e-k2) |
| Request stream missing when the daemon reads | Daemon recreates it and resets the offset to `-1` | Automatic | New empty stream | Requests appended in the gap were refused to their callers | **Impl**, **Test** |
| Response stream missing when the daemon appends | Daemon creates it and appends once more | One further attempt | Response in the new stream | Caller receives the response | **Impl** [E-S12](evidence.md#e-s12) |
| Transient network error or status 500 and above on a response append | Up to three attempts, 200 and 400 milliseconds apart; then one attempt to append `internal_error`, also with three attempts | Bounded | Side effects stand | Possibly two copies of a response; or none, and the caller times out | **Impl** [E-S12](evidence.md#e-s12) |
| Status 400 to 499, other than 404, on a response append, including an oversized body | Not retried; an `internal_error` append is attempted | None | Side effects stand | Caller receives `internal_error` or times out | **Impl** |
| Rate limit (429) on the daemon's read | Upstream retries with backoff and honours a retry hint up to 60 seconds, five times; then Lody waits one second and reads again | Unbounded | Offset in memory | Delay only | **Impl** [E-U5](evidence.md#e-u5) |
| Rate limit (429) on an append | Treated like any other status below 500: not retried | None | None | Caller `request_failed`; daemon response lost or `internal_error` | **Impl**; not handled as a distinct case |
| Offset no longer available (410) | Offset reset to `-1` with no delay | Automatic | None | Full replay of the retained stream; a persistent 410 would spin | **Impl**, **Test**; spin is **Infer** |
| Stream TTL elapsed | As for a missing stream | Automatic | New empty stream | Unexpired requests in the old stream are lost | **Infer**; production TTL semantics **Unknown** |
| Payload that is not valid JSON | Read fails after the offset moved; one-second wait; resume after the payload | Automatic | Offset past the payload | Every message in that payload is skipped without a reply | **Infer** |
| Request fails the schema | Dropped; warning with the raw parameters, redacted for some methods only | None | None | Caller times out | **Probe** P-6 |
| Request for another machine or workspace, or expired | Dropped without a log | None | None | Caller times out | **Probe** P-6 |
| Slow consumer: a caller that stops reading | Daemon still appends | Not applicable | Responses in the stream until its TTL | Nothing reaches the caller | **Impl** |
| Slow daemon: ordinary lane full | `rpc_request_capacity_exceeded` | Caller's choice; not automatic | None | Method-shaped failure | **Impl**, **Test** |
| Overload pool also full | Dropped with a warning | None | None | Caller times out | **Impl**; not tested |
| Control or history write set full (128) | Intake waits | Not applicable | Requests remain in the stream | All later requests, including control, are delayed | **Impl**; not tested |
| Lost acknowledgement of a request append | Caller reports `request_failed` although the request may be stored | None by the client | Request possibly in the stream | The daemon may still execute it | **Impl** [E-C5](evidence.md#e-c5) |
| Lost acknowledgement of a response append | Daemon retries | Bounded | Possibly two responses | The client ignores the second | **Infer** |
| Duplicate request, non-history method | Dispatched and answered again | Not applicable | None | Handler runs twice | **Probe** P-9 |
| Duplicate history request while the first runs | Joined | Not applicable | Memory | One response | **Impl**, **Test** |
| Duplicate history write after admission | `session_history_write_already_claimed` | Caller must use a new identifier | Claim row | Outcome of the first attempt uncertain | **Impl** [E-S10](evidence.md#e-s10) |
| Same identifier, different bytes, history method | `rpc_request_identity_mismatch` | None | Unchanged | Error on the newcomer's `replyTo` | **Impl**, **Test** |
| Same identifier, different bytes, other methods | Not detected | Not applicable | None | Both are dispatched | **Impl** |
| Refusal store unavailable (disk failure, lock timeout) | History write fails closed with `session_history_request_state_unavailable`; the lookup can block the event loop for up to five seconds | None | None | Error response | **Impl**, **Test** "fails closed when history refusal persistence is %s" |
| Local repository write failure | Reported as a runtime issue; no daemon-level recovery | None | Unknown | Method-specific | **Impl**; unhandled beyond reporting |
| Daemon restart | Offset lost; retained stream replayed; expired requests skipped | Automatic | Request stream; refusal store; documents | Duplicate handling as above | **Probe** P-9 |
| Shutdown with work in flight | Read aborted; queued tasks discarded; running handlers not awaited; exit within seven seconds | None | Request stream | Callers may receive nothing; unexpired requests replay on next start | **Impl** [E-S14](evidence.md#e-s14) |
| Accepted restart or upgrade | Response delivery attempted for five seconds, then the operation proceeds | None | Method-specific | Caller may time out although the operation ran | **Impl**, **Test** |
| Caller clock ahead of or behind the daemon | The daemon compares `expiresAt` with its own clock | None | None | Requests dropped early, or kept past the caller's deadline | **Infer** |

## Compatibility classes

### Mandatory wire compatibility

A daemon that serves existing clients, and a caller that addresses the
existing daemon, must reproduce these.

- Stream URL form, bucket `lody`, and the request stream name
  ([E-T1](evidence.md#e-t1), [E-T4](evidence.md#e-t4)).
- JSON content type on create and append; one JSON object per append.
- The request and response envelopes exactly, including strictness: no extra
  keys, exactly one of `result` and `error`, string error codes, `method` from
  the declared set, and string `rpcVersion` `"1"`
  ([E-W1](evidence.md#e-w1), [E-W4](evidence.md#e-w4)).
- Responses appended to the request's `replyTo` whatever its form, creating
  the stream when it is missing.
- Progress responses with the two recognized `type` values, before the final
  response, and no other intermediate success response.
- The content envelope and the secret field envelope for the methods that use
  them.
- Per-method parameter and result schemas ([methods](methods.md)).

### Behaviour that existing clients rely on

- The daemon creates the request stream. Callers never do, and treat its
  absence as "machine unreachable" by matching the substrings
  `machine_rpc_unavailable` and `CLI is not accepting RPC`
  ([E-K2](evidence.md#e-k2)).
- A fresh presence heartbeat. Clients decide online status from presence
  with a 90-second TTL, not from RPC ([E-K1](evidence.md#e-k1)).
- `rpcVersion` and `protocolCapabilities` in the machine record. A client
  sends a gated field or method only when the capability is advertised
  ([E-W14](evidence.md#e-w14)).
- `machine/ping` answering `success: true` and `message: "pong"`
  ([E-K3](evidence.md#e-k3)).
- A response within each method's deadline; the shortest are two seconds for
  `session/cancel` and five for `session/steer`.
- A receipt for input acceptance within about two seconds; later than that
  the browser renews its read once, which costs a reconnect but is not an
  error.
- Cancellation honoured from both the RPC and the session document, which
  carry the same cancel identifier; the RPC is sent without waiting and may
  never arrive ([E-K4](evidence.md#e-k4)).
- Tolerance of duplicate and late responses on the caller side, and silence
  towards unknown identifiers.
- The four client-only codes `machine_rpc_unavailable`, `request_failed`,
  `invalid_result` and `response_timeout` never emitted by a daemon.

### Legacy compatibility

- Both response stream forms, and reuse of a request stream created without
  retention ([E-T17](evidence.md#e-t17)).
- The mobile client's per-request response stream and long-poll reader
  ([E-K7](evidence.md#e-k7)).
- `session/prepare` and `session/prepare-cancel`, which are declared and
  retired ([methods](methods.md)).

### Implementation choices that can change

These are not observable by a correct peer.

- Lane sizes, admission limits and the scheduling structure, provided the
  responses are the same.
- A new stream client per operation and the resulting `HEAD` before each SSE
  read.
- The 120-second idle watchdog, the one-second loop delay and log wording.
- Shard selection by a caller. The daemon uses none. A caller that does use
  shards must keep a stream on a stable host.
- Where and how history refusals and claims are stored, provided identity,
  retention and fail-closed behaviour are the same.

### Known defects that need an explicit decision

Each is described in [implementation notes](implementation-notes.md).

- Requests are dispatched again after a restart, with no general
  deduplication.
- Invalid, misaddressed and expired requests receive no reply.
- Intake blocks when 128 control or history write tasks are pending.
- `replyTo` is not validated.
- The fatal-authentication branch of the request loop is not reached through
  the real stream client.
- `internal_error` carries raw error text.
- Nothing bounds handler run time, queue residence or payload size.

## Conformance matrix

Profiles: **O** ordinary workspace; **H** history methods; **X** encrypted
workspace (cases are in [encrypted RPC](encrypted-rpc.md)). Status:
**Executed** (a probe above), **Lody test** (asserted by a named Lody test,
not run here) or **Specified** (derived from the source, not run).

### Transport and addressing

| Id | Profile | Preconditions | Input or sequence | Expected observable outcome | Evidence | Status |
| -- | ------- | ------------- | ----------------- | --------------------------- | -------- | ------ |
| TR-01 | O | Bucket exists | Daemon starts | `PUT` of `<workspaceId>:rpc:req:<machineId>` with JSON content type and `Stream-TTL: 86400` | [E-T38](evidence.md#e-t38) | Specified |
| TR-02 | O | Request stream exists without TTL | Daemon starts | Stream reused, no error | [E-T17](evidence.md#e-t17) | Lody test "reuses legacy JSON streams without TTL when ensure hits a 409 conflict" |
| TR-03 | O | None | Caller appends a request | `POST` to the percent-encoded stream path, JSON content type, one object | P-4 | Executed |
| TR-04 | O | No request stream | Caller appends | Caller result `machine_rpc_unavailable`; no stream created | [E-C5](evidence.md#e-c5) | Specified |
| TR-05 | O | Response stream absent | Daemon answers | Daemon creates `replyTo` and appends | [E-S12](evidence.md#e-s12) | Specified |
| TR-06 | O | Daemon running | Request stream deleted | Daemon recreates it and reads from `-1` | [E-T29](evidence.md#e-t29) | Lody test "keeps listening when recreating a missing request stream fails" |
| TR-07 | O | Daemon running | Read returns 410 | Next read uses offset `-1` | [E-T29](evidence.md#e-t29) | Lody test "resumes request streaming from the retained head after cursor expiration" |
| TR-08 | O | Client waiting | Response appended before the reader connects | Client still receives it | [E-T31](evidence.md#e-t31) | Lody test "replays the first response even when it lands before the live reader starts" |
| TR-09 | O | Browser client, SSE failing | Three failed SSE reads | Reader switches to long-poll at the saved offset | [E-T33](evidence.md#e-t33) | Lody test "falls back to long-poll when SSE reads keep failing, and still answers pending calls" |
| TR-10 | O | Any | Append whose body is a JSON array of two requests | Two requests handled | P-8 | Executed (development server) |

### Wire contract

| Id | Profile | Preconditions | Input or sequence | Expected observable outcome | Evidence | Status |
| -- | ------- | ------------- | ----------------- | --------------------------- | -------- | ------ |
| WR-01 | O | Daemon running | Valid `machine/ping` | One response with the same `id` and `method`, `result.message` `pong` | P-5 | Executed |
| WR-02 | O | Daemon running | Request with an extra top-level key | No response | P-6 | Executed |
| WR-03 | O | Daemon running | Unknown method | No response | P-6 | Executed |
| WR-04 | O | Daemon running | `machineId` of another machine | No response | P-6 | Executed |
| WR-05 | O | Daemon running | `expiresAt` in the past | No response | P-6 | Executed |
| WR-06 | O | Daemon running | `rpcVersion` `"0"` | Error `rpc_version_mismatch`, message `Expected rpcVersion=1, got 0` | P-7 | Executed |
| WR-07 | O | Handler not wired | `machine/ping` | Error `method_unavailable` | [E-W12](evidence.md#e-w12) | Specified |
| WR-08 | O | Client waiting | Response with both `result` and `error` | Client ignores it and keeps waiting | P-1 | Executed (validator) |
| WR-09 | O | Client waiting | Response with an unknown `id` | Ignored | [E-C3](evidence.md#e-c3) | Specified |
| WR-10 | O | Client waiting on a refresh | Progress response, then final | Progress callback, then the call settles | [E-W9](evidence.md#e-w9) | Lody test "emits ACP binary progress without resolving the refresh request early" |
| WR-11 | O | Owner-scoped method | Envelope owner differs from the session's owner | Error `permission_denied`; handler not called | [E-S17](evidence.md#e-s17) | Lody test "rejects Code Collab requests when the envelope owner does not match the business session owner" |
| WR-12 | O | Owner-scoped method | Valid envelope | `result` is a content envelope that decrypts under the same owner | P-2 | Executed (codec only) |
| WR-13 | O | Fractional timestamps | Request with `sentAt` 1234.56 | Accepted by the schema | P-1 | Executed |

### Lifecycle, deadlines and cancellation

| Id | Profile | Preconditions | Input or sequence | Expected observable outcome | Evidence | Status |
| -- | ------- | ------------- | ----------------- | --------------------------- | -------- | ------ |
| LC-01 | O | No daemon reading | Caller sends with a 2-second timeout | Call settles `null` at the deadline; nothing further is appended | [E-C2](evidence.md#e-c2) | Specified |
| LC-02 | O | Daemon running | Capability refresh aborted by the caller | A `machine/acp-capabilities-refresh-cancel` request naming the original `id`; no response to it; no further progress | [E-W10](evidence.md#e-w10) | Lody test "aborts capability work and suppresses progress after an exact cancel request" |
| LC-03 | O | Slow handler | Caller times out | Handler still completes and appends its response | [E-S6](evidence.md#e-s6) | Specified |
| LC-04 | O | Progress every second, 1-second timeout | Seven progress responses | Call still pending | [E-C2](evidence.md#e-c2) | Lody test "measures silence, so a reporting download cannot expire its own request" |
| LC-05 | O | Daemon running | Accepted `machine/restart` | Accepted response appended before the lifecycle callback; callback within five seconds even if the append stalls | [E-S13](evidence.md#e-s13) | Lody test "handles %s without stranding or executing rejected work" |
| LC-06 | O | Daemon running | Rejected `machine/restart` | Response appended; callback never invoked | [E-S13](evidence.md#e-s13) | Lody test, as LC-05 |
| LC-07 | H | Watch with `waitMs` 15000 and 10 seconds to expiry | `session/history-watch` | Wait bounded to nine seconds | [E-S16](evidence.md#e-s16) | Specified |
| LC-08 | H | History request | Deadline passes during metadata readiness | No operation; no response | [E-S10](evidence.md#e-s10) | Lody test "does not start history %s when its deadline expires during %s" |

### Duplicates and crash recovery

| Id | Profile | Preconditions | Input or sequence | Expected observable outcome | Evidence | Status |
| -- | ------- | ------------- | ----------------- | --------------------------- | -------- | ------ |
| DD-01 | O | Unexpired request already answered | Daemon restarts | Handler runs again; second response under the same `id` | P-9 | Executed |
| DD-02 | O | Expired request in the stream | Daemon restarts | Not dispatched; no response | P-9 | Executed |
| DD-03 | H | First request running | Identical request arrives | One handler run; one response | [E-S7](evidence.md#e-s7) | Lody test "joins identical concurrent history requests and rejects request ID reuse before history" |
| DD-04 | H | First request running | Same `id`, different `replyTo` | `rpc_request_identity_mismatch` on the second `replyTo` | [E-S7](evidence.md#e-s7) | Lody test, as DD-03 |
| DD-05 | H | Refusal saved | Daemon restarts; same request replayed | Same refusal; handler not called; a new `id` succeeds | [E-S9](evidence.md#e-s9) | Lody test "keeps a history precondition refusal terminal when an unexpired request is replayed after restart" |
| DD-06 | H | Write admitted | Same request replayed | `session_history_write_already_claimed` | [E-S10](evidence.md#e-s10) | Specified |
| DD-07 | H | Refusal store failing | History write | `session_history_request_state_unavailable`; no write | [E-S8](evidence.md#e-s8) | Lody test "fails closed when history refusal persistence is %s" |
| DD-08 | O | Client waiting | Two identical responses | First settles the call; second ignored | [E-C3](evidence.md#e-c3) | Specified |
| DD-09 | O | Requests queued | Daemon stops | Queued requests not handled; replayed on next start if unexpired | [E-S14](evidence.md#e-s14) | Specified |

### Overload and scheduling

| Id | Profile | Preconditions | Input or sequence | Expected observable outcome | Evidence | Status |
| -- | ------- | ------------- | ----------------- | --------------------------- | -------- | ------ |
| OV-01 | O | Ordinary lane saturated | One more ordinary request | Error `rpc_request_capacity_exceeded` | [E-S5](evidence.md#e-s5) | Lody test "keeps send and control replies independent of %i saturated history-read handlers across batches" |
| OV-02 | O | Ordinary lane saturated | `machine/ping` and a history write in a later batch | Both answered | [E-S1](evidence.md#e-s1) | Lody test, as OV-01 |
| OV-03 | H | 128 watches parked | A 129th watch; a read; a write; a ping | Watch refused; the others answered | [E-S16](evidence.md#e-s16) | Lody test "bounds checkpoint waits separately from reads, sends and controls" |
| OV-04 | O | Overload pool holds 128 refusals | One more ordinary request | No response; warning logged | [E-S5](evidence.md#e-s5) | Specified; no Lody test |
| OV-05 | O | 128 history writes pending | `machine/ping` | Delayed until one write settles | [E-S1](evidence.md#e-s1) | Specified; no Lody test |

### Authority

| Id | Profile | Preconditions | Input or sequence | Expected observable outcome | Evidence | Status |
| -- | ------- | ------------- | ----------------- | --------------------------- | -------- | ------ |
| AU-01 | H | Read proof for another session | `session/history-read` | `session_history_read_denied`; one handler call at most | [E-S15](evidence.md#e-s15) | Lody test "admits a session-only read proof…; revocation rechecks" |
| AU-02 | H | Grant withdrawn during the read | `session/history-read` | No history in the response | [E-S15](evidence.md#e-s15) | Lody test "drops encrypted history when authority is withdrawn during %s" |
| AU-03 | H | Write proof expires during authorization | `session/history-write` | `session_history_write_denied`; no write | [E-S10](evidence.md#e-s10) | Lody test "does not start history %s when its deadline expires during %s" |
| AU-04 | O | Any writer to the request stream | `session/cancel` naming an active turn | Handled; the request carries no requester identity | [methods](methods.md) | Specified |

## Interoperability suite

### Rust caller against the existing daemon

| Step | Cases | Needs |
| ---- | ----- | ----- |
| Append a valid ping; read the response from a caller-created or daemon-created reply stream | TR-03, TR-05, WR-01 | Local Streams and the TypeScript server with a synthetic handler, as in P-5 |
| Send each rejected variation and confirm silence, then confirm the one answered mismatch | WR-02 to WR-06 | The same |
| Time out and confirm that nothing else is appended | LC-01 | The same |
| Refresh with progress and cancel | WR-10, LC-02 | The same, with a synthetic refresh handler |
| Owner-scoped request and response | WR-11, WR-12 | The same, with a synthetic file preview handler |
| History join, identity mismatch and replay | DD-03 to DD-06 | The same, with an in-memory or SQLite refusal store and synthetic authorizers |
| Dispatch, cancel and steer against a real session | Method-level cases in [methods](methods.md) | A real daemon and agent; not available here |
| Token issue, shard routing, production TTL, heartbeat and close cadence | TR-01, TR-09 | The hosted token service and gateway; not available here |

### Existing client against the Rust daemon

| Step | Cases | Needs |
| ---- | ----- | ----- |
| The TypeScript `LoroStreamsMachineRpcClient` with a shared dispatcher calls ping and status | WR-01, TR-05 | Local Streams; the client from the scratch copy |
| The same client without a dispatcher, for the legacy reply form | TR-05 | The same |
| A raw long-poll caller modelled on the mobile client: pre-created reply stream, device-clock timestamps | TR-05, WR-01 | The same |
| Restart the Rust daemon with unexpired requests in the stream | DD-01, DD-02 | The same; the expected outcome depends on the compatibility decision recorded in the implementation notes |
| Saturate the ordinary lane | OV-01, OV-02 | The same, with a blocking synthetic handler |
| The web or desktop application against the Rust daemon | All | Presence, machine record and document synchronization as well as RPC; a hosted or self-hosted control plane |

The cases marked "Local Streams" can run against `loro dev` started with
`--protocol http1` and an explicitly created bucket (P-10, P-11).

## Open questions and the smallest experiment for each

| Question | Smallest experiment | Where it cannot be answered from |
| -------- | ------------------- | -------------------------------- |
| Does the production gateway count `Stream-TTL` from creation or from the last append? | Create with a short TTL, append, `HEAD` after the TTL | The development server (it counts from creation) |
| Does production accept `offset=0`, and can `offset=-1` return 410? | `GET` with each offset on a fresh stream and on a trimmed one | The development server |
| What are the real SSE heartbeat and close intervals? | Timestamp the bytes of an idle SSE read | The client package |
| What is the append size limit? | Append growing bodies until 413 | The repository |
| Does a gateway 401 make the daemon mint a new token? | P-3 with the real token provider and a counting token endpoint | P-3 as run (it used a stub callback) |
| What does the token authorize: a bucket, a workspace prefix, single streams? | Read with a token for one workspace a stream of another | The repository (issuer not present) |
| Is a message appended through one shard host immediately readable through another? | Append through `write-*`, read through `control-*` | The repository |
| Does a replayed `machine/restart` restart the daemon again? | Append a restart with a long deadline; observe after the restart | The repository (the verification endpoint is not present) |
| Do the daemon's handlers behave idempotently under P-9 replay? | Repeat P-9 with the real handlers and a real session | These probes (synthetic handler) |
| How does intake behave with 128 pending history writes? | OV-05 with a blocking writer | Lody's tests (no case exists) |
