---------------------------- MODULE RpcReplay ----------------------------
(***************************************************************************)
(* Replay of the machine request stream after a daemon restart.            *)
(*                                                                         *)
(* The daemon reads the request stream from an offset that it keeps in     *)
(* memory.  A restart resets the offset, so every request still in the     *)
(* stream is read again.  The only general guard is the request's          *)
(* `expiresAt`.  See docs/lody-streams-rpc/protocol.md, "Duplicates and    *)
(* deduplication" and "Crash recovery".                                    *)
(*                                                                         *)
(* OffsetMode selects where the read offset lives:                         *)
(*   "memory"  - the shipped behaviour;                                    *)
(*   "durable" - a candidate: persist the offset when a request is read.   *)
(*                                                                         *)
(* RestartSingleUse states an assumption about the private backend: that   *)
(* it refuses a lifecycle proof it has already verified.  The public       *)
(* source does not settle this, so both values are checked.                *)
(***************************************************************************)
EXTENDS Naturals, Sequences, FiniteSets

CONSTANTS Requests,         \* request identifiers
          RestartReqs,      \* the subset that are machine/restart requests
          Ttl,              \* lifetime of a request, in ticks
          MaxTime,          \* bound on the clock
          MaxCrashes,       \* bound on crashes
          OffsetMode,       \* "memory" or "durable"
          RestartSingleUse  \* BOOLEAN

ASSUME /\ RestartReqs \subseteq Requests
       /\ OffsetMode \in {"memory", "durable"}
       /\ RestartSingleUse \in BOOLEAN

None == "none"

VARIABLES stream,      \* the request stream: a sequence of request ids
          expires,     \* request id -> absolute deadline
          now,         \* the daemon's clock
          offset,      \* requests read so far by this server instance
          durable,     \* the persisted offset ("durable" mode only)
          inflight,    \* the request read but not yet handled, or None
          runs,        \* request id -> number of handler runs
          restartsBy,  \* request id -> restarts it caused
          usedProof,   \* restart requests whose proof the backend has seen
          lost,        \* unexpired requests read and then never handled
          instances,   \* server instances started so far
          crashes

vars == <<stream, expires, now, offset, durable, inflight, runs, restartsBy,
          usedProof, lost, instances, crashes>>

Sent == {stream[i] : i \in 1..Len(stream)}

Init ==
    /\ stream = <<>>
    /\ expires = [r \in Requests |-> 0]
    /\ now = 0
    /\ offset = 0
    /\ durable = 0
    /\ inflight = None
    /\ runs = [r \in Requests |-> 0]
    /\ restartsBy = [r \in Requests |-> 0]
    /\ usedProof = {}
    /\ lost = {}
    /\ instances = 1
    /\ crashes = 0

(* A caller appends a request.  No caller re-appends under the same id. *)
Send(r) ==
    /\ r \notin Sent
    /\ stream' = Append(stream, r)
    /\ expires' = [expires EXCEPT ![r] = now + Ttl]
    /\ UNCHANGED <<now, offset, durable, inflight, runs, restartsBy, usedProof,
                   lost, instances, crashes>>

Tick ==
    /\ now < MaxTime
    /\ now' = now + 1
    /\ UNCHANGED <<stream, expires, offset, durable, inflight, runs, restartsBy,
                   usedProof, lost, instances, crashes>>

(* The read loop takes the next request and saves the offset before the  *)
(* handler runs.                                                         *)
Read ==
    /\ inflight = None
    /\ offset < Len(stream)
    /\ inflight' = stream[offset + 1]
    /\ offset' = offset + 1
    /\ durable' = IF OffsetMode = "durable" THEN offset + 1 ELSE durable
    /\ UNCHANGED <<stream, expires, now, runs, restartsBy, usedProof, lost,
                   instances, crashes>>

ResumeOffset(d) == IF OffsetMode = "durable" THEN d ELSE 0

(* An expired request is dropped without a reply. *)
DropExpired ==
    /\ inflight # None
    /\ now >= expires[inflight]
    /\ inflight' = None
    /\ UNCHANGED <<stream, expires, now, offset, durable, runs, restartsBy,
                   usedProof, lost, instances, crashes>>

(* An ordinary handler runs and answers. *)
Handle ==
    /\ inflight # None
    /\ inflight \notin RestartReqs
    /\ now < expires[inflight]
    /\ runs' = [runs EXCEPT ![inflight] = @ + 1]
    /\ inflight' = None
    /\ UNCHANGED <<stream, expires, now, offset, durable, restartsBy, usedProof,
                   lost, instances, crashes>>

(* A restart request whose proof the backend refuses is answered with an *)
(* error and restarts nothing.                                           *)
RefuseRestart ==
    /\ inflight \in RestartReqs
    /\ now < expires[inflight]
    /\ RestartSingleUse
    /\ inflight \in usedProof
    /\ inflight' = None
    /\ UNCHANGED <<stream, expires, now, offset, durable, runs, restartsBy,
                   usedProof, lost, instances, crashes>>

(* An accepted restart is answered, then the worker exits and a new      *)
(* instance starts.  A restart takes at least one tick.                  *)
HandleRestart ==
    /\ inflight \in RestartReqs
    /\ now < expires[inflight]
    /\ ~(RestartSingleUse /\ inflight \in usedProof)
    /\ now < MaxTime
    /\ runs' = [runs EXCEPT ![inflight] = @ + 1]
    /\ restartsBy' = [restartsBy EXCEPT ![inflight] = @ + 1]
    /\ usedProof' = usedProof \cup {inflight}
    /\ now' = now + 1
    /\ inflight' = None
    /\ offset' = ResumeOffset(durable)
    /\ instances' = instances + 1
    /\ UNCHANGED <<stream, expires, durable, lost, crashes>>

(* The daemon crashes.  Memory is lost; the stream and any persisted     *)
(* offset survive.                                                       *)
Crash ==
    /\ crashes < MaxCrashes
    /\ crashes' = crashes + 1
    /\ instances' = instances + 1
    /\ offset' = ResumeOffset(durable)
    /\ lost' = IF /\ OffsetMode = "durable"
                  /\ inflight # None
                  /\ now < expires[inflight]
               THEN lost \cup {inflight}
               ELSE lost
    /\ inflight' = None
    /\ UNCHANGED <<stream, expires, now, durable, runs, restartsBy, usedProof>>

Next ==
    \/ \E r \in Requests : Send(r)
    \/ Tick
    \/ Read
    \/ DropExpired
    \/ Handle
    \/ RefuseRestart
    \/ HandleRestart
    \/ Crash

Spec == Init /\ [][Next]_vars

-----------------------------------------------------------------------------

TypeOK ==
    /\ stream \in Seq(Requests)
    /\ now \in 0..MaxTime
    /\ offset \in 0..Len(stream)
    /\ durable \in 0..Len(stream)
    /\ inflight \in Requests \cup {None}
    /\ usedProof \subseteq RestartReqs
    /\ lost \subseteq Requests
    /\ crashes \in 0..MaxCrashes

(* R1.  The guarantee the evidence supports: a request runs at most once *)
(* per server instance.                                                  *)
OncePerInstance == \A r \in Requests : runs[r] <= instances

(* R2.  A restart loop, if one exists, ends when the request expires.    *)
RestartLoopBounded == \A r \in RestartReqs : restartsBy[r] <= Ttl

(* R3.  A request that was read while unexpired is not silently lost.    *)
(* `lost` is recorded only when a crash leaves an unexpired request       *)
(* behind a persisted offset, so it can never be read again.  In the      *)
(* shipped "memory" mode the offset resets and the request is read        *)
(* again, so R3 holds by construction there; it exists to show the cost   *)
(* of the "durable" candidate.  A request that expires before it is read  *)
(* again is dropped by design and is not counted as lost.                 *)
NoSilentLoss == lost = {}

(* Not guaranteed by the shipped protocol: a request runs at most once.  *)
AtMostOnce == \A r \in Requests : runs[r] <= 1

(* Depends on the backend: a restart request restarts the daemon once.   *)
RestartOnce == \A r \in RestartReqs : restartsBy[r] <= 1

=============================================================================
