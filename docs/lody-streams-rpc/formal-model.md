# Formal models

This document describes three TLA+ models of mechanisms in Lody's remote
procedure call (RPC) protocol, and what TLC, the TLA+ model checker, found.
They model behaviour that the [protocol](protocol.md) and
[encrypted RPC](encrypted-rpc.md) documents already describe from the source.
The models add two things: a precise statement of each guarantee, and a
mechanical check of which guarantees hold, which do not, and which mechanism
each depends on.

The models are small on purpose. Most of what the RPC documents found is the
absence of a guarantee, and a model of an absence only restates it. Each
module below covers one mechanism where the order of events matters.

## Modules

| Module | Models | Described in |
| ------ | ------ | ------------ |
| [`RpcReplay`](../../tla/RpcReplay.tla) | Replay of the request stream after a restart, with the request's expiry as the only guard | [Duplicates and deduplication](protocol.md#duplicates-and-deduplication), [crash recovery](protocol.md#crash-recovery) |
| [`RpcHistoryClaim`](../../tla/RpcHistoryClaim.tla) | Admission of one `session/history-write` request through a durable claim | [Crash windows on the daemon](protocol.md#crash-windows-on-the-daemon) |
| [`EncryptedDispatch`](../../tla/EncryptedDispatch.tla) | One turn delivered by Streams, Iroh, and the durable document route, ending at the `agent-start` claim | [Receipt versus actual start](encrypted-rpc.md#receipt-versus-actual-start), [multi-route delivery](encrypted-rpc.md#multi-route-delivery) |

_Table 1: The RPC models and the behaviour each one covers._

Each configuration is one of four kinds:

- **Shipped:** the behaviour at the documented commit. TLC must find no
  violation.
- **Ablation:** one mechanism removed or reordered. TLC must find a
  counterexample, which shows that the mechanism is necessary.
- **Observation:** a property that the shipped protocol does _not_ have,
  checked against the shipped behaviour. TLC must find a counterexample. The
  counterexample is the shortest demonstration of a gap that the prose
  documents already report.
- **Witness:** an invariant that says a guarded state never occurs, for
  example "the agent is never prompted". TLC must find a counterexample,
  which shows that the states a shipped property constrains are reachable,
  so the property is not satisfied vacuously.

The models are bounded model checks, not proofs. TLC explores every state
within the stated bounds, and nothing beyond them.

## RpcReplay

The daemon keeps its read offset in memory. A restart resets it, so every
request still in the stream is read again, and an unexpired request is
dispatched again. The same happens inside one running instance when the read
loop resets its offset after a 404 or a 410.

The model has a request stream, a clock, a read offset, and counts of handler
runs per request: in total, in the current server instance, and in the
current _read pass_. A pass ends at a crash, a restart, or an in-process
offset reset. Some requests are `machine/restart` requests: an accepted one
starts a new server instance, as a crash does.

Three constants select the case:

- `OffsetMode` is `"memory"` for the shipped behaviour and `"durable"` for a
  candidate that persists the offset when a request is read.
- `RestartSingleUse` states an assumption about the private backend: that it
  refuses a lifecycle proof it has already verified. The public source does
  not settle this ([implementation notes](implementation-notes.md)), so the
  model checks both values.
- `MaxResets` bounds in-process offset resets. That the gateway redelivers
  retained, unexpired requests after such a reset is assumed (B1); the
  shipped configuration allows one reset.

| Id | Property | Statement | Shipped |
| -- | -------- | --------- | ------- |
| R1 | `OncePerPass` | A request's handler runs at most once per read pass | Holds |
| | `OncePerInstance` | A request's handler runs at most once per server instance | **Violated** after an in-process reset |
| R2 | `RestartLoopBounded` | A restart request causes no more restarts than its lifetime in ticks | Holds |
| R3 | `NoSilentLoss` | A request read while unexpired is not left behind a persisted offset, unhandled | Holds by construction |
| | `AtMostOnce` | A request's handler runs at most once | **Violated** |
| | `RestartOnce` | A restart request restarts the daemon at most once | Depends on the backend |

_Table 2: Properties of `RpcReplay` and whether the shipped protocol has
them._

What the model settles:

- **Replay is "once per read pass", not "once per instance".** An
  in-process reset after a 404 or a 410 runs an unexpired request again in
  the same instance, in six steps. "Once per read pass" is the strongest
  statement available for any method outside the history family.
- **The restart question has a conditional answer.** If the backend accepts
  a reused proof, an accepted `machine/restart` is read again by the new
  instance and restarts it again, repeatedly, until the request expires. If
  the backend refuses a reused proof, the daemon restarts once. Which case
  holds in production is still unknown; the model shows that nothing on the
  daemon side prevents the loop.
- **R3 is a contrast, not a finding about the shipped protocol.** Loss is
  recorded only when a crash leaves an unexpired request behind a persisted
  offset. With the offset in memory every request is read again, so R3
  cannot fail. A request that expires before it is read again is dropped by
  design, and the model does not count that as loss.
- **A persisted offset trades duplication for loss.** With `"durable"` and
  no in-process reset, `AtMostOnce` and `RestartOnce` hold, but
  `NoSilentLoss` fails: a request
  read just before a crash is never handled. A compatible implementation
  that persists its offset must choose where to persist it, and neither
  choice gives both properties without a deduplication record.

## RpcHistoryClaim

A history write saves a durable claim under the request identifier before it
attempts the write. A replay that finds the claim is refused.

The model follows one request through authorization, claim, write, and
response, with crashes and replays at any point. `ClaimFirst` is `TRUE` for
the shipped order. `RespondOnClaim` is `FALSE` for the shipped behaviour;
`TRUE` lets the daemon answer "accepted" as soon as the claim exists.

| Id | Property | Statement | Shipped |
| -- | -------- | --------- | ------- |
| H1 | `WriteAtMostOnce` | The write is applied at most once per request identifier | Holds |
| H2 | `AcceptedImpliesWritten` | An accepted response is sent only after the write | Holds |
| | `ClaimImpliesWritten` | A claim at rest means that the write happened | **Violated** |

_Table 3: Properties of `RpcHistoryClaim` and whether the shipped protocol
has them._

With the order reversed, `WriteAtMostOnce` fails: the daemon writes, crashes
before claiming, and writes again on replay. The claim-first order is
therefore what gives H1. Answering on the claim instead of after the write
violates H2 in three steps, so the order of reply and write is what gives H2.
The price of claim-first is the observation in the last row: a
crash between the claim and the write leaves the write undone and the
identifier refused, in three steps. This is at-most-once admission, not
execution exactly once.

## EncryptedDispatch

In an encrypted workspace the same sealed original can reach a machine by
the encrypted Streams channel, by Iroh, and by the durable route through the
session document. The accelerated routes share a receipt journal, and every
route ends at the execution service, which must win an `agent-start` claim
before it prompts the agent.

The model has one turn, repeated deliveries on both accelerated routes,
replication of the turn row, the receipt row, the retained acknowledgement,
the start row, and crashes. The receipt claim and the offer to the watcher
are separate steps, as they are in the receiver, which claims and then awaits
the offer. Every prompt goes through one action, which increments a count of
prompts.

Two constants select the case. `StartClaim` is `TRUE` for the shipped
behaviour; `FALSE` removes the `agent-start` claim. `ReceiptClaim` is `TRUE`
for the shipped behaviour; `FALSE` lets every delivery claim and offer as if
it were the first. Both ablations use the same prompt and offer actions as
the shipped model, so a different outcome is due to the claim alone.

| Id | Property | Statement | Shipped |
| -- | -------- | --------- | ------- |
| X1 | `RunAtMostOnce` | The agent is prompted at most once for the turn | Holds |
| X2 | `OfferAtMostOnce` | The turn is offered to the dispatch watcher at most once | Holds |
| X3 | `SettledImpliesRan` | A settled start row means that the agent was prompted | Holds |
| | `ClaimImpliesRan` | A start claim with no live owner means that the agent ran | **Violated** |
| | `ReceiptImpliesOffer` | A claimed receipt leads to an offer | **Violated** |
| | `DeliveryAcknowledged` | Every processed delivery on an accelerated route is acknowledged | **Violated** |

_Table 4: Properties of `EncryptedDispatch` and whether the shipped protocol
has them._

Without the `agent-start` claim, X1 fails in four steps: the durable route
presents the turn, it is prompted, the daemon crashes, and the restarted
daemon prompts it again. The claim is what makes the routes, and restarts,
safe. Without the receipt claim, X2 fails: a second delivery offers the turn
again.

The observations are the corners that the prose document reports:

- A crash after the start claim and before the prompt leaves the row claimed
  with no owner. It reads as uncertain, and the turn is never run.
- A crash after the receipt claim and before the offer leaves the receipt
  started and never offered. A later delivery finds the receipt claimed and
  returns without an acknowledgement, so that request identifier is
  silenced. The turn still arrives by the durable route, which the model
  does not check as a liveness property.

## Results

The counts are distinct states. Each counterexample length is the shortest
possible; TLC runs several workers and may report a longer trace, and the
state count of a failing run varies because TLC stops at the first violation
it reaches.

| Configuration | Kind | Property checked | Result |
| ------------- | ---- | ---------------- | ------ |
| `RpcReplay.cfg` | Shipped, one in-process reset | R1, R2, R3 | Pass (14,418 states) |
| `RpcReplay_RestartSingleUse.cfg` | Shipped, backend refuses reuse | `RestartOnce` | Pass (13,130 states) |
| `RpcReplay_DurableOffset.cfg` | Candidate, no in-process reset | `AtMostOnce`, `RestartOnce` | Pass (2,790 states) |
| `RpcReplay_AtMostOnce.cfg` | Observation | `AtMostOnce` | Violated in 5 steps |
| `RpcReplay_GatewayReset.cfg` | Observation | `OncePerInstance` | Violated in 6 steps |
| `RpcReplay_RestartLoop.cfg` | Observation, backend accepts reuse | `RestartOnce` | Violated in 5 steps |
| `RpcReplay_DurableOffsetLoss.cfg` | Candidate trade-off | `NoSilentLoss` | Violated in 3 steps |
| `RpcReplay_WitnessRun.cfg` | Witness for R1 | `NeverRun` | Violated in 3 steps |
| `RpcReplay_WitnessRestart.cfg` | Witness for R2 | `NeverRestarted` | Violated in 3 steps |
| `RpcHistoryClaim.cfg` | Shipped | H1, H2 | Pass (52 states) |
| `RpcHistoryClaim_WriteFirst.cfg` | Ablation | `WriteAtMostOnce` | Violated in 5 steps |
| `RpcHistoryClaim_RespondOnClaim.cfg` | Ablation | `AcceptedImpliesWritten` | Violated in 3 steps |
| `RpcHistoryClaim_ClaimedUnwritten.cfg` | Observation | `ClaimImpliesWritten` | Violated in 3 steps |
| `RpcHistoryClaim_WitnessWrite.cfg` | Witness for H1 | `NeverWritten` | Violated in 3 steps |
| `RpcHistoryClaim_WitnessAccept.cfg` | Witness for H2 | `NeverAccepted` | Violated in 4 steps |
| `EncryptedDispatch.cfg` | Shipped | X1, X2, X3 | Pass (4,504 states) |
| `EncryptedDispatch_NoStartClaim.cfg` | Ablation | `RunAtMostOnce` | Violated in 4 steps |
| `EncryptedDispatch_NoReceiptClaim.cfg` | Ablation | `OfferAtMostOnce` | Violated in 6 steps |
| `EncryptedDispatch_Uncertain.cfg` | Observation | `ClaimImpliesRan` | Violated in 3 steps |
| `EncryptedDispatch_ReceiptCrash.cfg` | Observation | `ReceiptImpliesOffer` | Violated in 3 steps |
| `EncryptedDispatch_NoAck.cfg` | Observation | `DeliveryAcknowledged` | Violated in 3 steps |
| `EncryptedDispatch_WitnessPrompt.cfg` | Witness for X1 | `NeverPrompted` | Violated in 3 steps |
| `EncryptedDispatch_WitnessOffer.cfg` | Witness for X2 | `NeverOffered` | Violated in 3 steps |
| `EncryptedDispatch_WitnessSettle.cfg` | Witness for X3 | `NeverSettled` | Violated in 4 steps |

_Table 5: TLC results for the RPC models._

## Abstractions and limits

| # | Abstraction | Consequence |
| - | ----------- | ----------- |
| B1 | The stream delivers every appended request, in order, to a reader that starts from the beginning, including after an in-process reset | Gateway ordering, retention, redelivery after a 404 or 410, and offset semantics are assumed, not modelled; production behaviour is unknown |
| B2 | A handler run is one atomic step | A crash between a handler's side effect and its response is not distinguished from a crash before it |
| B3 | Time is a bounded counter, and a restart takes one tick | The restart loop is bounded by the request lifetime; real durations are not modelled |
| B4 | One history request and one encrypted turn | Interference between different requests is not explored |
| B5 | Signatures, sealing, authorization, and membership checks always succeed | The models cover ordering and durability only, not the cryptography |
| B6 | The sealed acknowledgement that is held in memory is tied to the process that made the offer | The tested path that persists an unretained acknowledgement on a later delivery in the same process is included; nothing else about in-memory frames is |
| B7 | No fairness and no liveness property in the RPC models; deadlock checking is off | The models say what cannot happen, not what eventually happens. That the durable route still delivers a silenced turn is argued in prose, not checked |

_Table 6: Abstractions in the RPC models and what each leaves out._

One mechanism named in the protocol document is not modelled: intake waiting
when 128 control or history-write tasks are pending. It is a single blocking
rule with no interleaving to explore, and the
[prioritization](protocol.md#prioritization-as-implemented) section states
it completely.

## Running the models

```sh
make tlc
```

The RPC configurations run with the Flock ones. The
[developer's guide](../developers-guide.md#3-the-formal-models) explains the
runner and the manifest, `tla/models.json`, which records the expected
verdict of every configuration.
