# The Lody Flock protocol

This directory documents how the Lody daemon uses **Flock**, the Loro team's
replicated key-value store, to share machine state and to accept durable
commands from other devices. It pairs a prose description of the protocol with
a TLA+ model that TLC checks, and it cites the source for every claim.

"Flock" here is the conflict-free replicated data type (CRDT) published as
`@loro-dev/flock-wasm`. It has nothing to do with the POSIX advisory file lock
[`flock(2)`][flock2]; Lody's daemon does not use file locks to coordinate
replicas.

## Scope

The documents describe Lody [[36]](references.md#ref-36) at commit
[`61bd9701a`][lody-commit] (14 November 2026) with these pinned libraries ([E-U0](evidence.md#e-u0)):

| Library                  | Version | Role                                   |
| ------------------------ | ------- | -------------------------------------- |
| `@loro-dev/flock-wasm`   | 0.5.0   | The LWW key-value CRDT                 |
| `loro-repo`              | 0.25.0  | Document host, persistence, transports |
| `@loro-dev/streams-crdt` | 0.20.0  | Cloud stream client                    |

The subject is the **Machine Flock**: one Flock document per machine per
workspace, named `<workspaceId>:mf:<machineId>` ([E-K1](evidence.md#e-k1)). The
daemon also reads a per-workspace catalogue Flock and publishes code
collaboration index Flocks; those share the replication layer described here
but carry no commands, and are covered only where they clarify a boundary.

Two neighbouring subjects have their own document sets. Requests that need
an immediate reply travel by [RPC over Loro Streams](../lody-streams-rpc/README.md),
not by Flock rows. The token that admits a replica to the cloud stream is
issued by the cloud services described in the
[cloud API guide](../cloud-api/README.md). The
[documentation contents](../contents.md) list every document in the
repository.

## What the protocol is, in one page

1. **State.** A Machine Flock is a map from tuple keys to JSON rows. Concurrent
   writes to one key are resolved last-writer-wins by a
   `(physicalTime, logicalCounter, peerId)` clock; a delete is a clocked
   tombstone that competes like any other write
   ([data model](data-model.md)).
2. **Replication.** Every replica (daemon, desktop renderer, mobile app)
   holds a full copy. Replicas exchange deltas through an append-only cloud
   stream with per-replica cursors, or, on the desktop, through a local
   socket between renderer and daemon ([replication](replication.md)).
3. **Durability.** A replica makes received data durable before it saves the
   cursor that covers it, and binds that cursor to the replica that loaded it.
   A cursor may lag the data; it may never lead it
   ([replication](replication.md#replica-bound-checkpoints)).
4. **Upload scheduling.** The daemon writes locally first, then marks the
   document dirty. A coordinator uploads in the background, retries with
   backoff, and is woken when connectivity returns
   ([sync coordinator](sync-coordinator.md)).
5. **Commands.** Other devices ask the daemon to act by writing rows. The
   daemon treats those rows as a durable queue that it **scans**, never as a
   stream of events it might miss. Cancellation is a separate, permanent row,
   so it converges even against a concurrent publish
   ([durable commands](durable-commands.md)).

## Guarantees and their evidence

The [formal model](formal-model.md) states these as TLA+ properties. TLC checks
each one, and for each mechanism it also checks an *ablation*: the same model
with the mechanism removed, which must produce a counterexample.

| Id | Guarantee | Mechanism | Checked by |
| -- | --------- | --------- | ---------- |
| S1 | A durable cursor never covers data the durable state lacks | Replica-bound checkpoints | `FlockReplication` |
| S2 | A joined, clean document has uploaded every local write | `dirtyVersion` | `FlockReplication` |
| S3 | A dirty document on a connected daemon always has a pending wake-up | Retry timer and streams-online kick | `FlockReplication` |
| S4 | Replicas that have exchanged everything hold identical state | LWW merge | `FlockReplication` |
| L1 | Every replica eventually becomes clean and fully exchanged | All of the above, under fairness | `FlockReplication` |
| P1 | Within the setup flow, only the owning daemon publishes the provider configuration | Row ownership | `ProviderSetup` |
| P3 | A stale setup row never outruns a cancellation already in the stream | Authority gate | `ProviderSetup` |
| L1 | A cancellation eventually removes both the setup and any published configuration, everywhere | Permanent cancellation row and daemon reconciliation | `ProviderSetup` |
| D1 | A delete request never removes a project registered after it | `createdAtMs` guard | `LocalProjectDelete` |
| L1 | Every command row eventually drains | Scan-based draining | `LocalProjectDelete` |

The model also records what the protocol does **not** guarantee. The clearest
case: a client that rewrites a project row while the daemon is removing it can
bring the registration back. See [observations](observations.md).

## Documents

| Document | Contents |
| -------- | -------- |
| [Data model](data-model.md) | Flock semantics, document ids, the Machine Flock key schema, row validation and ownership |
| [Replication](replication.md) | Cloud Streams, the local data plane, mobile clients, persistence and checkpoints |
| [Sync coordinator](sync-coordinator.md) | The daemon's write path and upload state machine |
| [Durable commands](durable-commands.md) | The command watcher, provider setup and cancellation, local project removal, retired commands |
| [Formal model](formal-model.md) | The TLA+ modules, how they map to the code, results, and how to run TLC |
| [Observations](observations.md) | Behaviours the model exposes, limits of the analysis, open questions |
| [Evidence index](evidence.md) | Every cited source location, with a permalink |
| [References](references.md) | Literature and upstream documentation |

The TLA+ sources live in [`tla/`](../../tla/). `make tlc` runs the safety and
ablation models; `make tlc-liveness` runs the slower liveness models.

## Conventions

- Citations of the form [E-S5](evidence.md#e-s5) point into the
  [evidence index](evidence.md), which gives the file, the lines and a
  permalink at the documented commit.
- Citations of the form [[1]](references.md#ref-1) point into the
  [references](references.md).
- "Daemon" means the Lody command-line interface (CLI) running as the
  long-lived process for one machine (`apps/cli`). "Client" means any other
  replica: the desktop renderer, a web tab or a mobile app.
- Statements about upstream libraries come from the published npm packages.
  The upstream repositories were not publicly readable when this was written,
  so anything that could not be read from a package is marked *unverified*.

[flock2]: https://man7.org/linux/man-pages/man2/flock.2.html
[lody-commit]: https://github.com/LodyAI/Lody/tree/61bd9701a5ed6899a9f42787df682acfc3fd7d4b
