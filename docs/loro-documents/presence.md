# Presence

Presence answers the questions that replicated documents must not: is this
machine online, and is this session working right now. It is ephemeral. It
is carried on its own channel, it is never stored with a document, and it
replays no history (**Intent**;
[E-D258](evidence.md#e-d258)).

Durable documents and presence travel on different transports, so healthy
conversation synchronization proves nothing about presence delivery
(**Intent**; [E-D1](evidence.md#e-d1)).

## The channel

Presence is a Loro `EphemeralStore`, not a document. Entries expire after a
time to live, and the store is mirrored to an ephemeral channel on the
workspace's metadata stream ([E-D77](evidence.md#e-d77)).

- The channel is selected by a query parameter, `ephemeral=presence`, on the
  metadata stream's address ([E-D205](evidence.md#e-d205),
  [E-D196](evidence.md#e-d196)).
- The address is built for a dedicated presence host
  ([E-D122](evidence.md#e-d122)).
- A second channel on the same stream, `ephemeral=machine-monitor`, carries
  device resource samples ([E-D195](evidence.md#e-d195)).

The daemon produces presence locally before any cloud attachment. The
replica and the heartbeat exist as soon as the workspace is opened; the
remote stream is created only on attach
([E-D105](evidence.md#e-d105),
[E-D107](evidence.md#e-d107)).

## Records

The presence schema has three kinds of record
([E-D202](evidence.md#e-d202)).

| Kind | Key | Fields | Publisher |
| ---- | --- | ------ | --------- |
| `machine` | `machine:<machineId>:<instanceId>` | `machineId`, `instanceId`, `updatedAt` | The daemon |
| `session` | `session:<sessionId>:<instanceId>` | `sessionId`, `machineId`, `instanceId`, `status`, `updatedAt` | The daemon that runs the session |
| `session-viewing` | `viewing:<userId>:<instanceId>` | `userId`, `instanceId`, `sessionId`, `since`, `updatedAt` | A client showing the session |

_Table 1: Kinds of presence record._

Sources: [E-D199](evidence.md#e-d199), [E-D204](evidence.md#e-d204).

- **A session record never says `idle`.** Its status is `running`,
  `requestPermission`, or `initializing`, with an optional stage and detail;
  an idle session has no record ([E-D201](evidence.md#e-d201),
  [E-D79](evidence.md#e-d79)).
- **Fields are bounded.** The only free text is `detail`, limited to 280
  characters ([E-D198](evidence.md#e-d198)). In an
  encrypted workspace a minimal schema is used: identifiers must have fixed
  shapes, and `detail` is dropped ([E-D203](evidence.md#e-d203)).
- **Invalid entries are skipped**, one key at a time, when presence is read
  ([E-D206](evidence.md#e-d206)).
- **Viewing records** let the owning machine's pull request poller schedule
  around what people are looking at (**Intent**; [E-D200](evidence.md#e-d200)).

### Machine monitor

The monitor channel has two records: an `observer`, published by a client
that wants samples, and a `snapshot`, published by the daemon
([E-D194](evidence.md#e-d194)). The daemon samples only while
an unexpired observer for its own machine exists, and it samples for a local
observer without any cloud transport
([E-D76](evidence.md#e-d76); **Test** "samples for a
local observer without attaching cloud Streams",
[E-D75](evidence.md#e-d75)). Snapshots
are never persisted.

## Timing

| Constant | Value | Meaning |
| -------- | ----- | ------- |
| `LODY_PRESENCE_HEARTBEAT_MS` | 30 seconds | Interval at which the daemon rewrites its records |
| `LODY_PRESENCE_TTL_MS` | 90 seconds | Age beyond which a record is stale |
| Monitor observer time to live | 30 seconds | Lifetime of an observer record; renewed every 15 seconds |
| Monitor sample interval | 2 seconds on Linux, 5 seconds on macOS and Windows | Interval between resource samples |

_Table 2: Presence timing constants._

Sources: [E-D197](evidence.md#e-d197),
[E-D193](evidence.md#e-d193).

A record is fresh while the reader's server-adjusted time minus the record's
`updatedAt` is below the time to live ([E-D207](evidence.md#e-d207)).
`updatedAt` is stamped when a record is created, not when it is delivered.
That is why publication must be bounded: a heartbeat queued behind a burst
of other writes can arrive already expired while the room still reports
that it is joined (**Intent**; [E-D2](evidence.md#e-d2)).

## Is a machine online

A reader gets two things: the set of machines with a fresh `machine` record,
and whether the presence room is joined ([E-D54](evidence.md#e-d54)).
The classifier turns them into three answers
([E-D7](evidence.md#e-d7)).

| Fresh heartbeat seen | Room joined | Answer |
| -------------------- | ----------- | ------ |
| Yes | Either | Online |
| No | Yes | Offline |
| No | No | Unknown |

_Table 3: How a reader classifies a machine._

A fresh heartbeat is believed even when the room is not joined, because the
client library leaves the joined state on every recycle of its live read and
on any failed local write. Only a joined room proves absence (**Intent**;
[E-D53](evidence.md#e-d53)). Only a definite
`offline` may block work.

The durable `lastSeen` field in machine metadata must not be used for this
(**Intent**; [E-D208](evidence.md#e-d208)).

## Rules

- **One serial queue per workspace.** One workspace owns one presence
  transport, and that queue also carries the machine heartbeat (**Intent**;
  [E-D20](evidence.md#e-d20)). The registry refuses a second
  live owner ([E-D110](evidence.md#e-d110)).
- **Publish only from a timer, a lifecycle transition, or navigation.**
  Never from a stream, progress, or chunk callback (**Intent**;
  [E-D20](evidence.md#e-d20)). The
  incident behind the rule was 4,000 writes in three seconds from
  publication on every reasoning chunk (**Intent**;
  [E-D259](evidence.md#e-d259)).
- **Partitioned by origin.** Every local write goes to two stores. Only one
  is given to the cloud transport, so peers appear in that one only. The
  local data plane is fed from the other, which holds this daemon's records
  alone ([E-D78](evidence.md#e-d78)). Otherwise a
  local renderer would be handed a snapshot with authority over peers that
  it already receives live from the cloud (**Intent**;
  [E-D3](evidence.md#e-d3)).
- **No periodic metadata writes.** Liveness never goes into document
  metadata on a timer; such writes stall the repository's flush (**Intent**;
  [E-D4](evidence.md#e-d4)).

Lody's own sources disagree on one point: whether the client library's
queue merges unsent updates to the same key. One comment says it does not;
the presence note says a later version does. This study did not read the
library to settle it.

## Turn leases

While a turn runs, the daemon holds a _lease_ on the session's presence. The
lease is what publishes the `session` record
([E-D89](evidence.md#e-d89)).

- **One per session.** A second hold for the same session fails.
- **Publication.** The first record is written at once, and then once per
  heartbeat interval, with the status mapped from the turn's phase
  ([E-D86](evidence.md#e-d86)).
- **Release.** Closing the lease clears the record, unless the agent still
  has native background work, in which case the record is handed over as
  `running` ([E-D88](evidence.md#e-d88)).
  Only release retires a turn; native activity can outlive it (**Intent**;
  [E-D22](evidence.md#e-d22)).

### Initialization stall

A turn that is still initializing is watched for silence. Each stage has a
budget, measured from the last observable progress, not from the start of
the turn ([E-D85](evidence.md#e-d85),
**Intent** [E-D84](evidence.md#e-d84)).

| Stage | Budget |
| ----- | ------ |
| `initializing` | 3 minutes |
| `acp`, `resuming`, `managed-runtime` | 15 minutes |
| `git-clone` | 30 minutes |

_Table 4: Silence budgets for an initializing turn, by stage._

When a budget is exceeded the lease raises a stall signal once, stops its
heartbeats, and keeps the presence record until the turn is cleaned up
([E-D87](evidence.md#e-d87); **Test** "fires a
silent-stage deadline once, stops heartbeats and retains presence until turn
cleanup", [E-D83](evidence.md#e-d83)).
The signal's consumer logs that it is failing the turn
([E-D82](evidence.md#e-d82)); this
study did not trace the failure path further.

## Recovery

Presence reconnects on its own schedule, independently of document
recovery.

| Situation | Response | Evidence |
| --------- | -------- | -------- |
| Room reports `error` or `disconnected` | Rejoin after a backoff of 2 to 60 seconds | [E-D108](evidence.md#e-d108) |
| Room joined again | Rewrite the machine heartbeat and every held session record with a new time | [E-D80](evidence.md#e-d80) |
| No upload progress for 90 seconds | Report a delivery stall; do not reconnect automatically | [E-D109](evidence.md#e-d109) |
| Cloud detached | Release only the remote side; local production continues | [E-D106](evidence.md#e-d106) |

_Table 5: How presence recovers._
