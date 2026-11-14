# Formal model

The protocol is specified in TLA+ [[22]](references.md#ref-22)
[[23]](references.md#ref-23) and checked with the TLC model checker
[[24]](references.md#ref-24). The sources are in [`tla/`](../../tla/).

A model of this kind does not prove the code correct. It states the design
precisely enough that a machine can search every interleaving of a small
instance for a violation, which is where concurrency and crash-recovery bugs
hide [[25]](references.md#ref-25). Each claim below says exactly which
instance was searched.

## Modules

| Module | Models | Described in |
| ------ | ------ | ------------ |
| [`FlockLWW`](../../tla/FlockLWW.tla) | Entries, the LWW order, merge, visibility | Shared definitions |
| [`FlockReplication`](../../tla/FlockReplication.tla) | Stream, cursors, durable and volatile state, crash, connectivity, the sync coordinator | [Replication](replication.md), [sync coordinator](sync-coordinator.md) |
| [`ProviderSetup`](../../tla/ProviderSetup.tla) | The setup queue, cancellation, the authority gate | [Durable commands](durable-commands.md#provider-setup) |
| [`LocalProjectDelete`](../../tla/LocalProjectDelete.tla) | The delete command and its staleness guard | [Durable commands](durable-commands.md#delete-local-project) |

The split is deliberate. `FlockReplication` models the transport in detail and
treats row contents as opaque. The two command modules model row contents in
detail and abstract the transport to *state-based anti-entropy*: `Push` merges
a replica into the stream's accumulated state, and `Pull` merges that state
into a replica. Property S4 of `FlockReplication` (replicas that have
exchanged everything agree) is what licenses the abstraction.

## FlockLWW

An entry is `[t, p, v]`: a clock `t`, a peer rank `p` and a value `v`. The
order is

```tla
Newer(a, b) == a.t > b.t \/ (a.t = b.t /\ a.p > b.p)
```

which folds Flock's `(physicalTime, logicalCounter)` into the single natural
`t` and represents `peerId` by its rank ([E-U1](evidence.md#e-u1)). A
tombstone is an entry whose value is `Tomb`; a key never written holds
`NoEntry` with `t = 0`. `Merge` takes the newer entry for each key.

## FlockReplication

### State

| Variable | Meaning | Survives a crash |
| -------- | ------- | ---------------- |
| `stream` | Sequence of deltas appended to the document's stream | Server side |
| `mem[r]` | Replica `r`'s in-memory Flock | No |
| `cur[r]` | Number of stream bundles `r` has applied in memory | No |
| `disk[r]` | `[data, cursor]`: durable Flock and durable cursor | Yes |
| `joined[r]` | `r` completed its initial join sync in this process | No |
| `dirty`, `sync`, `snap`, `wrote`, `timer` | Coordinator state | No |
| `online[r]` | `r` has a usable transport | n/a |

### Actions and their sources

| Action | Code | Evidence |
| ------ | ---- | -------- |
| `LocalWrite` | Row write, `repo.flush()`, `markDirty` | [E-S15](evidence.md#e-s15), [E-S2](evidence.md#e-s2) |
| `Kick` (operator) | `syncNow`: share, start, or resolve with zero transports | [E-S3](evidence.md#e-s3), [E-U10](evidence.md#e-u10) |
| `SyncOk` | Confirmed `syncOnce`; `dirtyVersion` comparison | [E-S5](evidence.md#e-s5) |
| `SyncFail` | Attempted but unconfirmed sync | [E-S6](evidence.md#e-s6) |
| `TimerFire` | Retry timer callback | [E-S9](evidence.md#e-s9) |
| `GoOnline` | `onStreamsOnline` to `retryDirtyNow` | [E-S4](evidence.md#e-s4), [E-S11](evidence.md#e-s11) |
| `GoOffline` | Room turns `disconnected`/`error` (may arm a retry) or `detached` (does not) | [E-S8](evidence.md#e-s8), [E-S13](evidence.md#e-s13) |
| `Receive`, `SaveCursor` | Apply, durability barrier, then cursor save | [E-U12](evidence.md#e-u12), [E-U8](evidence.md#e-u8) |
| `JoinRoom` | Initial join sync uploads what the stream lacks | [E-U13](evidence.md#e-u13) |
| `Crash` | Process restart: volatile state reset from `disk` | [E-S1](evidence.md#e-s1) |

### Properties

| Id | Name | Statement |
| -- | ---- | --------- |
| S1 | `NoSkippedRange` | Every stream entry at or below a durable cursor is on that replica's disk, or superseded there |
| S2 | `CleanImpliesPushed` | A joined replica that is not dirty holds no entry the stream lacks |
| S3 | `NoStrandedDirty` | A dirty, online replica has a sync in flight or a timer armed |
| S4 | `QuiescentConvergence` | If every replica has applied the whole stream and has nothing unsent, all replicas are equal |
| L1 | `EventuallyQuiescent` | Eventually, and from then on, every replica is clean, caught up and has nothing unsent |

S4 is strong eventual consistency [[1]](references.md#ref-1), stated for the
quiescent case. L1 is eventual delivery.

### Fairness

L1 assumes weak fairness of `GoOnline`, `Receive`, `JoinRoom` and `TimerFire`,
and **strong** fairness of `SyncOk`: a sync that is retried forever while
online eventually succeeds. Weak fairness would not do, because each failure
disables `SyncOk` until the next retry. Crashes and outages are bounded by
constants; with unbounded disruption no protocol could guarantee progress.

## ProviderSetup

### State

`st[r]` holds three rows (`setup`, `cancel`, `config`) for each of the
replicas `ui`, `srv` and `dmn`. `task` is the daemon's in-flight
`processOne()`, with its phase and the `attempt` it adopted. `auth` is the
command watcher's `ready` flag. The daemon's rows survive a crash, because
every write is flushed; `task` and `auth` do not.

Statuses are abstracted to four: `queued`, `preparing` and `verifying` are
resumable; `dormant` stands for both `failed` and `awaiting-auth`.

### Actions and their sources

| Action | Code | Evidence |
| ------ | ---- | -------- |
| `UiRequest`, `UiRetry` | Create and retry a setup | [E-P14](evidence.md#e-p14) |
| `UiCancelMark` | Put the marker (awaited) | [E-P13](evidence.md#e-p13) |
| `UiCancelDelete` | Best-effort deletes; each may or may not happen | [E-P13](evidence.md#e-p13) |
| `Pull("dmn")` | Command room's first remote sync; sets `auth` | [E-C2](evidence.md#e-c2), [E-C3](evidence.md#e-c3) |
| `DmnCrash`, `DmnLoseRoom` | Restart; room released | [E-C3](evidence.md#e-c3) |
| `DmnReconcile` | `reconcileCancellations` | [E-P8](evidence.md#e-p8), [E-K12](evidence.md#e-k12) |
| `DmnAdopt` | `processOne` entry | [E-P5](evidence.md#e-p5), [E-P9](evidence.md#e-p9) |
| `DmnVerify`, `DmnGiveUp` | `updateStatus`, `fail`, fenced by attempt | [E-P10](evidence.md#e-p10) |
| `DmnPublish` | `publishVerifiedConfig` | [E-P11](evidence.md#e-p11) |
| `DmnResume` | `resumeAfterAuthentication` | [E-P3](evidence.md#e-p3) |

`Gate == ~WaitForAuthority \/ auth` guards `DmnReconcile` and `DmnAdopt`,
matching `rescanMachineCommands` ([E-C6](evidence.md#e-c6)). `DmnResume` is an
RPC and is not gated.

### Properties

| Id | Name | Statement |
| -- | ---- | --------- |
| P1 | `ConfigOwnedByDaemon` | A visible `config` entry for a setup id, on any replica, was authored by the daemon |
| P2 | `CancelIsPermanent` | No replica ever holds a tombstone for the marker |
| P3 | `NoStalePublish` | The daemon never publishes when the stream already held the marker at the daemon's last start |
| P4 | `NoPublishOverVisibleCancel` | No step makes `config` visible on the daemon while the daemon can see the marker |
| L1 | `CancelWins` | Once a client holds the marker, eventually and permanently every replica holds the marker and neither a setup nor a config |
| L2 | `EventuallySettled` | Eventually and permanently, replicas agree, nothing is in flight, and any remaining setup is dormant |

P3 is tracked with two history variables: `startCancel` records, at each
daemon start, whether the stream held the marker; `stalePublish` latches if a
publish happens while it is set.

L1 and L2 assume weak fairness of `Push` and `Pull` for both the client and
the daemon, and of the daemon's drain steps. They assume nothing about the
user: requests, retries and cancellations may or may not happen, and
verification may succeed or fail.

## LocalProjectDelete

`st[r]` holds two rows (`project`, `cmd`). A project value carries
`createdAtMs`; a command value carries its status and `requestedAt`. `now` is
the server clock, advanced by each registration and each request so that the
two kinds of timestamp are distinct.

| Action | Code | Evidence |
| ------ | ---- | -------- |
| `Add` | Daemon `local-project/add`; client put-if-absent | [E-D7](evidence.md#e-d7), [E-D8](evidence.md#e-d8) |
| `UiTouch` | Client whole-row rewrite of the project row | [E-D13](evidence.md#e-d13) |
| `UiRequestDelete` | Write the command | [E-D1](evidence.md#e-d1) |
| `DmnProcess` | One successful pass over the command | [E-D3](evidence.md#e-d3), [E-D4](evidence.md#e-d4), [E-D5](evidence.md#e-d5) |
| `UiAck` | Delete a completed command | [E-D2](evidence.md#e-d2) |

| Id | Name | Statement |
| -- | ---- | --------- |
| D1 | `FreshProjectNeverRemoved` | The daemon never removes a project whose `createdAtMs` is later than the command's `requestedAt` |
| D2 | `NoResurrection` | In a converged state, no project registration that the daemon removed is visible. **Not a property of the shipped protocol** |
| L1 | `CommandsDrain` | Eventually and permanently, replicas agree and no command row is visible |

## Results

All runs used TLC 2.19 (`tla2tools.jar` 1.7.4 [[35]](references.md#ref-35))
on OpenJDK 21 with 32 workers.
`make tlc` and `make tlc-liveness` reproduce them; the expectations are in
[`tla/models.json`](../../tla/models.json).

### Shipped protocol

| Configuration | Instance | Properties | Distinct states | Result |
| ------------- | -------- | ---------- | --------------: | ------ |
| `FlockReplication.cfg` | 2 replicas, 1 key, clocks to 2, 1 crash, 1 outage | S1 to S4 | 5,088,085 | Pass |
| `FlockReplicationLive.cfg` | 2 replicas, 2 keys, clocks to 1, 1 crash, 1 outage | S1 to S4, L1 | 2,825,077 | Pass |
| `ProviderSetup.cfg` | 2 attempts, 2 disruptions, skew 1 | P1 to P4 | 3,259,864 | Pass |
| `ProviderSetupLive.cfg` | 2 attempts, 1 disruption, skew 1 | P1 to P4, L1, L2 | 970,852 | Pass |
| `LocalProjectDelete.cfg` | Clock to 4, 1 row rewrite, skew 1 | D1, L1 | 80,682 | Pass |

The liveness instances are smaller because TLC's liveness check is far more
expensive than its invariant check. `FlockReplicationLive.cfg` uses two keys
so that a replica can still write twice, which the `dirtyVersion` path needs.

### Ablations

Each row removes one mechanism and names the property that must then fail.
The trace is the shortest counterexample TLC found.

| Configuration | Removed | Violates | Counterexample |
| ------------- | ------- | -------- | -------------- |
| `FlockReplication_CursorFirst.cfg` | Data-before-cursor ordering | S1 | A writes and uploads; B receives; B's durable cursor now covers data B has not stored |
| `FlockReplication_CursorFirstDiverges.cfg` | The same | S4 | As above, then B crashes: B resumes past the update and never holds it |
| `FlockReplication_NoDirtyVersion.cfg` | `dirtyVersion` comparison | S2 | Join; write (sync starts); write again; the first sync confirms and clears `dirty` with the second write unsent |
| `FlockReplication_NoOnlineKick.cfg` | Streams-online kick | S3 | Go offline; write (zero transports, no timer); go online: dirty, idle, no timer |
| `ProviderSetup_NoAuthorityGate.cfg` | Authority gate | P3 | Request reaches the daemon; client cancels and uploads; daemon restarts and, without waiting for its first remote sync, adopts, verifies and publishes |
| `LocalProjectDelete_NoStaleGuard.cfg` | `createdAtMs` guard | D1 | Client registers and requests delete; daemon, not yet synced, registers the project itself (later `createdAtMs`); daemon then receives the old command and removes the newer registration |

These mirror, at design level, the ablations Lody's own tests use: the
checkpoint tests fail under the shared-cursor and schedule-only variants
([E-T4](evidence.md#e-t4)).

### An observation about the shipped protocol

| Configuration | Setting | Property | Result |
| ------------- | ------- | -------- | ------ |
| `LocalProjectDelete_Resurrection.cfg` | Shipped (`UiRowUpdates = TRUE`) | D2 | **Violated** |
| `LocalProjectDelete_NoRowUpdates.cfg` | Client row rewrites disabled | D1, D2 | Pass (15,081 states) |

Counterexample: a client requests the delete; the daemon receives it; the
client rewrites the project row (for example, to record imported history)
with a later clock; the daemon removes the project and the command; after
everything is exchanged, the client's rewrite outranks the daemon's
tombstone and the project is visible again with no command pending. See
[observations](observations.md#o1-a-removed-project-can-come-back).

## Abstractions and assumptions

A reader should know what the model leaves out before trusting what it
shows.

| # | Abstraction | Consequence |
| - | ----------- | ----------- |
| A1 | A local write takes a clock greater than the entry it supersedes ([E-U3](evidence.md#e-u3)) | If Flock could assign a lower clock to a local write, P4 and L1 of `ProviderSetup` would need re-examination |
| A2 | Delta export is exact set difference against the stream | The [version vector hole](replication.md#the-version-vector-hole) is not modelled |
| A3 | A local write and its `repo.flush()` are one step | A crash between them loses an unacknowledged write; no property here depends on it |
| A4 | A zero-transport `syncOnce` resolves in the step that starts it ([E-U10](evidence.md#e-u10)) | See [observations](observations.md#o4-the-zero-transport-window) |
| A5 | Crash and restart are one step | Downtime is modelled only as delay |
| A6 | The command modules use state-based `Push`/`Pull` | Justified by S4; partial delivery within one document is not explored there |
| A7 | One client replica | Two clients racing each other (for example, retry against cancel) are not explored |
| A8 | `physicalTime` skew is a bounded choice of clock (`Skew`, `MaxT`) | Large or adversarial skew is not explored |
| A9 | The local data plane and the mobile client are not modelled | Their behaviour rests on the prose and the cited tests |
| A10 | The stream server is reliable and ordered | Server faults are out of scope |
| A11 | Daemon processing steps are atomic at the granularity of the row re-reads in the code | Finer interleavings inside one `await`-free block cannot occur in a single-threaded runtime |

TLC explores small finite instances. A property that holds for two replicas
and two attempts is strong evidence, not proof, for larger ones. The
[SEC proofs for CRDTs](references.md#ref-11) by Gomes et al. are the place to
look for unbounded guarantees about LWW merge itself.

## Running the models

```sh
make tools          # download the pinned tla2tools.jar (checksum verified)
make tlc            # safety and ablation models, about one minute
make tlc-liveness   # liveness models, about ten minutes on 32 cores
```

Java 11 or later must be on the `PATH`. `scripts/check_models.py` runs each
configuration in `tla/models.json`, compares TLC's verdict with the
expectation, and fails if any run disagrees, including an ablation that stops
producing its counterexample. Logs, with full counterexample traces, are
written to `.tools/tlc-logs/`.

To explore a model, change the constants in a `.cfg` file. The state space
grows quickly with the number of keys and the clock bound, so raise one
constant at a time.

## Prior art

Ji et al. give a TLA+ framework for specifying and checking CRDT protocols
(counters, sets and a list CRDT) [[26]](references.md#ref-26), and the TLA+
examples repository includes a hybrid logical clock specification
[[27]](references.md#ref-27). Neither covers an LWW map with durable cursors
or a command queue layered on one. Burckhardt et al. give the general
specification framework for replicated data types, including the LWW
register [[12]](references.md#ref-12) [[34]](references.md#ref-34).
