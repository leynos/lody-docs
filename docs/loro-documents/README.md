# Loro documents in Lody

This directory documents how the Lody daemon and its clients use **Loro**
documents: what documents a workspace holds, what is in a session, who may
write each part, how concurrent edits merge, how the documents are stored
and synchronized, and how a user's turn travels through them to a running
agent. It cites the source for every claim.

Loro is a library of conflict-free replicated data types (CRDTs). A Loro
document holds maps, lists, movable lists, and text, and merges concurrent
edits from any number of replicas without coordination. Lody hosts its
documents with `loro-repo` and synchronizes them through Loro Durable
Streams.

Two neighbouring subjects have their own document sets and are not repeated
here:

- [The Flock protocol](../flock-protocol/README.md) covers Flock, the
  last-writer-wins key-value store that carries machine state and durable
  commands. Flock and Loro documents share one repository and one transport.
- [RPC over Loro Streams](../lody-streams-rpc/README.md) covers the remote
  procedure call (RPC) protocol, which accelerates what this set describes
  as the durable route.

The [architecture overview](../architecture/README.md) places all of them in one
picture. The [documentation contents](../contents.md) list every document in
the repository.

## Scope

The documents describe Lody at commit
[`61bd9701a`](https://github.com/LodyAI/Lody/tree/61bd9701a5ed6899a9f42787df682acfc3fd7d4b)
(14 November 2026). They are a reading of the public source, not a statement by
the Lody authors, and nothing here was verified against a running system.

The subject is the ordinary, unencrypted workspace with the `'loro'` history
backend. Encrypted workspaces are mentioned where they change the story,
and the `'roost'` history backend is out of scope.

The internals of `loro-crdt`, `loro-repo`, and the Streams service were not
read. Statements about how they behave come from Lody's own comments and are
marked as intent.

## The set in one page

1. **Two parts per document.** Every document is a Loro document plus a
   small metadata record. The metadata of every document in a workspace
   replicates through one stream, and an existence index lists live
   documents. Lists, scans, and dispatch read metadata; documents are opened
   only when needed ([catalogue](catalogue.md)).
2. **A session is a document of typed roots.** History is a list of
   entries; the queue is a movable list; control state is a handful of maps.
   The metadata record holds the pointers that say which turn is pending
   ([session document](session-document.md)).
3. **One writer per root, by convention.** A single writer owns history,
   and a mirror owns the control roots. Clients and the daemon each run
   their own copies, and their writes merge. Where a merge outcome would be
   wrong, Lody orders its writes, splits state across keys, or records a
   separate fact instead of rewriting one
   ([writers and merge behaviour](writers-and-merge.md)).
4. **Local first.** A write is accepted when it is a local commit. The cloud
   is attached after the daemon is authorized, and detached on revocation.
   Recovery raises two separate signals: a cheap one that releases parked
   work and an expensive one that rescans the workspace
   ([persistence and synchronization](persistence-and-sync.md)).
5. **Liveness is ephemeral.** Whether a machine is online, and what a
   session is doing now, travel on a presence channel that is never stored.
   Durable metadata is written only at transitions ([presence](presence.md)).
6. **A turn is found, not delivered.** A client writes a receipt, a history
   entry, and a pointer. The owning daemon finds the pointer in metadata,
   opens the document, checks access, and prompts the agent. What prevents a
   second start, and what a crash leaves behind, depends on which local
   claim is in force ([turn dispatch](turn-dispatch.md)).

## Documents

| Document | Contents |
| -------- | -------- |
| [Catalogue](catalogue.md) | Kinds of document, their identifiers and streams, the metadata store and existence index, and session lifetime |
| [Session document](session-document.md) | Root containers, history entries and items, the queue, and the metadata record with its pending-turn predicate |
| [Writers and merge behaviour](writers-and-merge.md) | The control mirror, the history writer and the reader; who writes what; and where Lody relies on or defends against a merge outcome |
| [Persistence and synchronization](persistence-and-sync.md) | Storage, attaching and detaching the cloud, joining and releasing session rooms, cursors, recovery, and the workspace catalogue |
| [Presence](presence.md) | The ephemeral channel, its records and timing, the three-state online check, turn leases, and the initialization stall |
| [Turn dispatch](turn-dispatch.md) | The durable route from a client's writes to the agent's prompt: discovery, access, start, status, claims, crash behaviour, and stop |
| [Evidence index](evidence.md) | Every cited source location, with a permalink |

_Table 1: Documents in the Loro set._

## Conventions

- Citations of the form `E-D12` point into the [evidence index](evidence.md),
  which gives the file, the lines, and a permalink at the documented commit.
- A statement with no tag was read in the code path it cites. **Intent**
  marks a statement that rests on a comment, a specification, or one of
  Lody's internal notes. **Infer** marks an inference from the cited code.
  **Test** marks a behaviour that a named Lody test asserts; the tests were
  read, not run.
- "Daemon" means the Lody command-line interface (CLI) running as the
  long-lived process for one machine. "Client" means the desktop renderer, a
  web tab, or a mobile application.
- "Metadata" means a document's metadata record in the repository, not a
  field inside the Loro document.

## What this set does not establish

- How `loro-repo` stores metadata, and how it resolves two concurrent
  upserts of one record. Lody's own comment says there is no
  compare-and-swap.
- The renderer's and the mobile applications' write paths in full. One
  mobile path writes history containers directly instead of through the
  shared writer.
- The schemas and writers of the `agent-` and `preview-comment-` documents.
- Whether every production daemon has an Inbox, which decides what a crash
  does to a running turn.
- Several of Lody's source comments cite `specs/local-first-two-plane.md`
  and `specs/session-status.md`. Neither file exists at the documented
  commit.
