-------------------------- MODULE FlockReplication --------------------------
(***************************************************************************)
(* Replication, persistence and upload scheduling of one Flock document    *)
(* (for example a Machine Flock, `<workspaceId>:mf:<machineId>`) through   *)
(* the cloud Streams transport.                                            *)
(*                                                                         *)
(* Modelled mechanisms and their sources in Lody @ 61bd9701a:              *)
(*                                                                         *)
(*  - LWW merge of Flock entries (FlockLWW.tla).                           *)
(*  - An append-only stream per document; each replica holds a cursor.     *)
(*  - Replica-bound checkpoints: remote data is made durable before the    *)
(*    cursor that covers it (apps/cli/src/lib/loro/streams-transport.ts,   *)
(*    loro-repo `createRepoStreamsPersistence`).  The ablation             *)
(*    CursorMode = "cursor-first" restores the pre-migration ordering.     *)
(*  - The daemon's MachineFlockSyncCoordinator: dirty flag, dirtyVersion,  *)
(*    single-flight sync, retry timer, and the streams-online kick         *)
(*    (apps/cli/src/lib/loro/machine-flock-sync-coordinator.ts, doc.ts).   *)
(*  - The initial join sync, which uploads whatever the stream lacks       *)
(*    (streams-crdt `performInitialJoinSync`).                             *)
(*                                                                         *)
(* Abstractions (see docs/flock-protocol/formal-model.md):                 *)
(*  - Version-vector deltas are idealized as exact set difference against  *)
(*    the stream, so the "equal version vector, unequal content" hole of   *)
(*    the local data plane is out of scope.                                *)
(*  - A local write and its `repo.flush()` are one step.                   *)
(*  - A zero-transport `syncOnce` resolves in the step that starts it.     *)
(*  - Crash and restart are one step.                                      *)
(***************************************************************************)
EXTENDS FlockLWW, Sequences, FiniteSets

CONSTANTS
    Replicas,           \* set of positive naturals; the value is the peer rank
    MaxT,               \* bound on entry clocks
    MaxCrashes,         \* bound on process crashes (all replicas together)
    MaxOutages,         \* bound on connectivity losses (all replicas together)
    CursorMode,         \* "replica-bound" (shipped) | "cursor-first" (ablation)
    CheckDirtyVersion,  \* TRUE (shipped) | FALSE (ablation)
    KickOnOnline        \* TRUE (shipped) | FALSE (ablation)

ASSUME /\ Replicas \subseteq (Nat \ {0})
       /\ CursorMode \in {"replica-bound", "cursor-first"}
       /\ CheckDirtyVersion \in BOOLEAN
       /\ KickOnOnline \in BOOLEAN

VARIABLES
    stream,   \* Seq of deltas appended to the document's stream
    mem,      \* mem[r]: in-memory Flock of replica r
    cur,      \* cur[r]: number of stream bundles r has applied in memory
    disk,     \* disk[r] = [data, cursor]: what survives a crash of r
    joined,   \* joined[r]: r completed its initial join sync this process
    dirty,    \* coordinator: local writes not yet confirmed uploaded
    sync,     \* coordinator: "idle" | "flight" (state.activeSync)
    snap,     \* delta the in-flight sync will upload
    wrote,    \* dirtyVersion moved since the in-flight sync began
    timer,    \* coordinator: retry timer armed
    online,   \* online[r]: r has a usable Streams transport
    crashes,
    outages

vars == <<stream, mem, cur, disk, joined, dirty, sync, snap, wrote, timer,
          online, crashes, outages>>

Put == [s |-> "put", a |-> 0]

InStream(k, e) == \E i \in 1..Len(stream) : stream[i][k] = e

(* The entries of state m that the stream does not hold yet.               *)
UnpushedOf(m) ==
    [k \in Keys |-> IF m[k] = NoEntry \/ InStream(k, m[k]) THEN NoEntry ELSE m[k]]

Unpushed(r) == UnpushedOf(mem[r])

(***************************************************************************)
(* syncNow(): start a sync unless one is in flight.  `unp` is the delta a  *)
(* new sync would upload, `isWrite` says whether the caller is markDirty,  *)
(* and `tmr` is the timer function to carry forward.                       *)
(*                                                                         *)
(*  - In flight: callers share state.activeSync; a write only moves        *)
(*    dirtyVersion.                                                        *)
(*  - Idle and online: the sync starts and clears the retry timer.         *)
(*  - Idle and offline: `syncOnce` reports zero transports at once; the    *)
(*    document stays dirty and deliberately arms no timer.                 *)
(***************************************************************************)
Kick(r, unp, isWrite, tmr) ==
    IF sync[r] = "flight"
    THEN /\ wrote' = [wrote EXCEPT ![r] = @ \/ isWrite]
         /\ timer' = tmr
         /\ UNCHANGED <<sync, snap>>
    ELSE IF online[r]
    THEN /\ sync' = [sync EXCEPT ![r] = "flight"]
         /\ snap' = [snap EXCEPT ![r] = unp]
         /\ wrote' = [wrote EXCEPT ![r] = FALSE]
         /\ timer' = [tmr EXCEPT ![r] = FALSE]
    ELSE /\ timer' = [tmr EXCEPT ![r] = FALSE]
         /\ UNCHANGED <<sync, snap, wrote>>

Init ==
    /\ stream = << >>
    /\ mem = [r \in Replicas |-> EmptyState]
    /\ cur = [r \in Replicas |-> 0]
    /\ disk = [r \in Replicas |-> [data |-> EmptyState, cursor |-> 0]]
    /\ joined = [r \in Replicas |-> FALSE]
    /\ dirty = [r \in Replicas |-> FALSE]
    /\ sync = [r \in Replicas |-> "idle"]
    /\ snap = [r \in Replicas |-> EmptyState]
    /\ wrote = [r \in Replicas |-> FALSE]
    /\ timer = [r \in Replicas |-> FALSE]
    /\ online = [r \in Replicas |-> TRUE]
    /\ crashes = 0
    /\ outages = 0

(* A local put or delete, flushed to disk, then markDirty().  Flock makes  *)
(* a local write supersede the local entry, so its clock is greater.       *)
LocalWrite(r, k, v, t) ==
    /\ t > mem[r][k].t
    /\ v = Tomb => Visible(mem[r], k)      \* deleting nothing is a no-op
    /\ LET e == Entry(t, r, v) IN
         /\ mem' = [mem EXCEPT ![r][k] = e]
         /\ disk' = [disk EXCEPT ![r].data[k] = e]
         /\ dirty' = [dirty EXCEPT ![r] = TRUE]
         /\ Kick(r, UnpushedOf([mem[r] EXCEPT ![k] = e]), TRUE, timer)
    /\ UNCHANGED <<stream, cur, joined, online, crashes, outages>>

(* The in-flight sync is confirmed by a transport.                         *)
SyncOk(r) ==
    /\ sync[r] = "flight"
    /\ online[r]
    /\ LET delta == UnpushedOf(snap[r]) IN
         stream' = IF delta = EmptyState THEN stream ELSE Append(stream, delta)
    /\ sync' = [sync EXCEPT ![r] = "idle"]
    /\ snap' = [snap EXCEPT ![r] = EmptyState]
    /\ wrote' = [wrote EXCEPT ![r] = FALSE]
    /\ IF wrote[r] /\ CheckDirtyVersion
       THEN /\ timer' = [timer EXCEPT ![r] = TRUE]   \* scheduleRetry("new-writes")
            /\ UNCHANGED dirty
       ELSE /\ dirty' = [dirty EXCEPT ![r] = FALSE]
            /\ UNCHANGED timer
    /\ UNCHANGED <<mem, cur, disk, joined, online, crashes, outages>>

(* The in-flight sync was attempted but not confirmed (timeout, transport  *)
(* error, connectivity lost mid-flight).                                   *)
SyncFail(r) ==
    /\ sync[r] = "flight"
    /\ sync' = [sync EXCEPT ![r] = "idle"]
    /\ snap' = [snap EXCEPT ![r] = EmptyState]
    /\ wrote' = [wrote EXCEPT ![r] = FALSE]
    /\ dirty' = [dirty EXCEPT ![r] = TRUE]
    /\ timer' = [timer EXCEPT ![r] = TRUE]
    /\ UNCHANGED <<stream, mem, cur, disk, joined, online, crashes, outages>>

TimerFire(r) ==
    /\ timer[r]
    /\ LET tmr == [timer EXCEPT ![r] = FALSE] IN
         IF dirty[r]
         THEN Kick(r, Unpushed(r), FALSE, tmr)
         ELSE /\ timer' = tmr
              /\ UNCHANGED <<sync, snap, wrote>>
    /\ UNCHANGED <<stream, mem, cur, disk, joined, dirty, online, crashes, outages>>

(* Connectivity returns.  onStreamsOnline -> retryDirtyNow(): the only     *)
(* wake-up for a document that went dirty while offline.                   *)
GoOnline(r) ==
    /\ ~online[r]
    /\ online' = [online EXCEPT ![r] = TRUE]
    /\ IF KickOnOnline /\ dirty[r]
       THEN IF sync[r] = "flight"
            THEN /\ timer' = [timer EXCEPT ![r] = FALSE]
                 /\ UNCHANGED <<sync, snap, wrote>>
            ELSE /\ sync' = [sync EXCEPT ![r] = "flight"]
                 /\ snap' = [snap EXCEPT ![r] = Unpushed(r)]
                 /\ wrote' = [wrote EXCEPT ![r] = FALSE]
                 /\ timer' = [timer EXCEPT ![r] = FALSE]
       ELSE UNCHANGED <<sync, snap, wrote, timer>>
    /\ UNCHANGED <<stream, mem, cur, disk, joined, dirty, crashes, outages>>

(* Connectivity is lost.  A room that turns 'disconnected' or 'error'      *)
(* arms a retry for a dirty document; a 'detached' room does not.          *)
GoOffline(r) ==
    /\ online[r]
    /\ outages < MaxOutages
    /\ online' = [online EXCEPT ![r] = FALSE]
    /\ outages' = outages + 1
    /\ \E arm \in BOOLEAN :
         timer' = [timer EXCEPT ![r] = @ \/ (arm /\ dirty[r])]
    /\ UNCHANGED <<stream, mem, cur, disk, joined, dirty, sync, snap, wrote, crashes>>

(* Apply the next stream bundle.                                           *)
(*   replica-bound: the per-resource barrier makes the data durable here;  *)
(*                  the cursor follows in SaveCursor.                      *)
(*   cursor-first:  the cursor is saved at once; the data waits for a      *)
(*                  debounced Flush.                                       *)
Receive(r) ==
    /\ online[r]
    /\ cur[r] < Len(stream)
    /\ LET b == stream[cur[r] + 1] IN
         /\ mem' = [mem EXCEPT ![r] = Merge(@, b)]
         /\ cur' = [cur EXCEPT ![r] = @ + 1]
         /\ disk' = IF CursorMode = "replica-bound"
                    THEN [disk EXCEPT ![r].data = Merge(@, b)]
                    ELSE [disk EXCEPT ![r].cursor = cur[r] + 1]
    /\ UNCHANGED <<stream, joined, dirty, sync, snap, wrote, timer, online,
                   crashes, outages>>

SaveCursor(r) ==
    /\ CursorMode = "replica-bound"
    /\ disk[r].cursor < cur[r]
    /\ disk' = [disk EXCEPT ![r].cursor = cur[r]]
    /\ UNCHANGED <<stream, mem, cur, joined, dirty, sync, snap, wrote, timer,
                   online, crashes, outages>>

Flush(r) ==
    /\ CursorMode = "cursor-first"
    /\ disk[r].data # mem[r]
    /\ disk' = [disk EXCEPT ![r].data = mem[r]]
    /\ UNCHANGED <<stream, mem, cur, joined, dirty, sync, snap, wrote, timer,
                   online, crashes, outages>>

(* Initial join sync: once caught up, upload whatever the stream lacks.    *)
JoinRoom(r) ==
    /\ online[r]
    /\ ~joined[r]
    /\ cur[r] = Len(stream)
    /\ stream' = IF Unpushed(r) = EmptyState THEN stream ELSE Append(stream, Unpushed(r))
    /\ joined' = [joined EXCEPT ![r] = TRUE]
    /\ UNCHANGED <<mem, cur, disk, dirty, sync, snap, wrote, timer, online,
                   crashes, outages>>

(* Crash and restart: only `disk` survives; coordinator state is volatile. *)
Crash(r) ==
    /\ crashes < MaxCrashes
    /\ crashes' = crashes + 1
    /\ mem' = [mem EXCEPT ![r] = disk[r].data]
    /\ cur' = [cur EXCEPT ![r] = disk[r].cursor]
    /\ joined' = [joined EXCEPT ![r] = FALSE]
    /\ dirty' = [dirty EXCEPT ![r] = FALSE]
    /\ sync' = [sync EXCEPT ![r] = "idle"]
    /\ snap' = [snap EXCEPT ![r] = EmptyState]
    /\ wrote' = [wrote EXCEPT ![r] = FALSE]
    /\ timer' = [timer EXCEPT ![r] = FALSE]
    /\ UNCHANGED <<stream, disk, online, outages>>

Next ==
    \E r \in Replicas :
        \/ \E k \in Keys, v \in {Put, Tomb}, t \in 1..MaxT : LocalWrite(r, k, v, t)
        \/ SyncOk(r) \/ SyncFail(r) \/ TimerFire(r)
        \/ GoOnline(r) \/ GoOffline(r)
        \/ Receive(r) \/ SaveCursor(r) \/ Flush(r)
        \/ JoinRoom(r) \/ Crash(r)

Fairness ==
    \A r \in Replicas :
        /\ WF_vars(GoOnline(r))
        /\ WF_vars(Receive(r))
        /\ WF_vars(JoinRoom(r))
        /\ WF_vars(TimerFire(r))
        /\ SF_vars(SyncOk(r))     \* a sync that keeps being retried online succeeds

Spec == Init /\ [][Next]_vars /\ Fairness

-----------------------------------------------------------------------------
(* Invariants *)

Entries == [t : 0..MaxT, p : Replicas \cup {0}, v : {None, Tomb, Put}]
States  == [Keys -> Entries]

TypeOK ==
    /\ stream \in Seq(States)
    /\ mem \in [Replicas -> States]
    /\ cur \in [Replicas -> Nat]
    /\ \A r \in Replicas :
         /\ disk[r].data \in States
         /\ disk[r].cursor \in Nat
         /\ cur[r] <= Len(stream)
    /\ joined \in [Replicas -> BOOLEAN]
    /\ dirty \in [Replicas -> BOOLEAN]
    /\ sync \in [Replicas -> {"idle", "flight"}]
    /\ snap \in [Replicas -> States]
    /\ wrote \in [Replicas -> BOOLEAN]
    /\ timer \in [Replicas -> BOOLEAN]
    /\ online \in [Replicas -> BOOLEAN]

(* S1.  A durable cursor never covers data the durable state lacks: every  *)
(* entry below the cursor is on disk or superseded there.                  *)
NoSkippedRange ==
    \A r \in Replicas : \A i \in 1..Len(stream) :
        i <= disk[r].cursor =>
            \A k \in Keys : ~Newer(stream[i][k], disk[r].data[k])

(* S2.  A joined replica whose document is clean has uploaded everything.  *)
CleanImpliesPushed ==
    \A r \in Replicas : (joined[r] /\ ~dirty[r]) => Unpushed(r) = EmptyState

(* S3.  A dirty document on a connected replica always has a wake-up.      *)
NoStrandedDirty ==
    \A r \in Replicas : (dirty[r] /\ online[r]) => (sync[r] = "flight" \/ timer[r])

Quiescent ==
    \A r \in Replicas : cur[r] = Len(stream) /\ Unpushed(r) = EmptyState

(* S4.  Strong eventual consistency: replicas that have exchanged          *)
(* everything hold identical state.                                        *)
QuiescentConvergence ==
    Quiescent => \A r, s \in Replicas : mem[r] = mem[s]

-----------------------------------------------------------------------------
(* Liveness *)

(* L1.  Under the fairness assumptions, with finitely many crashes and     *)
(* outages, every replica ends up clean and fully exchanged.               *)
EventuallyQuiescent ==
    <>[](Quiescent /\ \A r \in Replicas : ~dirty[r])

=============================================================================
