---------------------------- MODULE RpcReplay ----------------------------
(***************************************************************************)
(* Replay of the machine request stream.                                   *)
(*                                                                         *)
(* The daemon reads the request stream from an offset that it keeps in     *)
(* memory, and starts a task for each request without awaiting it.  A      *)
(* restart resets the offset, so every request still in the stream is      *)
(* read again; so does an in-process reset after a 404 or 410, which keeps *)
(* the tasks already started.  The only general guard is the request's     *)
(* `expiresAt`.  See docs/lody-streams-rpc/protocol.md, "Duplicates and    *)
(* deduplication" and "Crash recovery".                                    *)
(*                                                                         *)
(* OffsetMode selects where the read offset lives:                         *)
(*   "memory"  - the shipped behaviour;                                    *)
(*   "durable" - a candidate: persist the offset when a request is read.   *)
(*                                                                         *)
(* MaxResets bounds in-process offset resets.  That the gateway then       *)
(* redelivers retained, unexpired requests is assumed, not verified.       *)
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
          MaxResets,        \* bound on in-process offset resets (404, 410)
          OffsetMode,       \* "memory" or "durable"
          RestartSingleUse  \* BOOLEAN

ASSUME /\ RestartReqs \subseteq Requests
       /\ OffsetMode \in {"memory", "durable"}
       /\ RestartSingleUse \in BOOLEAN

VARIABLES stream,      \* the request stream: a sequence of request ids
          expires,     \* request id -> absolute deadline
          now,         \* the daemon's clock
          offset,      \* requests read so far in the current read pass
          durable,     \* the persisted offset ("durable" mode only)
          pending,     \* request id -> tasks started and not yet finished
          admits,      \* request id -> tasks started in the current read pass
          maxAdmits,   \* request id -> the most tasks started in any one pass
          runs,        \* request id -> handler runs, in total
          instRuns,    \* request id -> handler runs in the current instance
          maxInstRuns, \* request id -> the most runs in any one instance
          restartsBy,  \* request id -> restarts it caused
          usedProof,   \* restart requests whose proof the backend has seen
          lost,        \* unexpired requests read and then never handled
          resets,      \* in-process offset resets so far
          crashes

vars == <<stream, expires, now, offset, durable, pending, admits, maxAdmits,
          runs, instRuns, maxInstRuns, restartsBy, usedProof, lost, resets,
          crashes>>

Zero == [r \in Requests |-> 0]
Max(a, b) == IF a > b THEN a ELSE b
Sent == {stream[i] : i \in 1..Len(stream)}
ResumeOffset(d) == IF OffsetMode = "durable" THEN d ELSE 0

Init ==
    /\ stream = <<>>
    /\ expires = Zero
    /\ now = 0
    /\ offset = 0
    /\ durable = 0
    /\ pending = Zero
    /\ admits = Zero
    /\ maxAdmits = Zero
    /\ runs = Zero
    /\ instRuns = Zero
    /\ maxInstRuns = Zero
    /\ restartsBy = Zero
    /\ usedProof = {}
    /\ lost = {}
    /\ resets = 0
    /\ crashes = 0

(* A caller appends a request.  No caller re-appends under the same id. *)
Send(r) ==
    /\ r \notin Sent
    /\ stream' = Append(stream, r)
    /\ expires' = [expires EXCEPT ![r] = now + Ttl]
    /\ UNCHANGED <<now, offset, durable, pending, admits, maxAdmits, runs,
                   instRuns, maxInstRuns, restartsBy, usedProof, lost, resets,
                   crashes>>

Tick ==
    /\ now < MaxTime
    /\ now' = now + 1
    /\ UNCHANGED <<stream, expires, offset, durable, pending, admits, maxAdmits,
                   runs, instRuns, maxInstRuns, restartsBy, usedProof, lost,
                   resets, crashes>>

(* The read loop takes the next request, saves the offset, and starts a  *)
(* task for it without awaiting it.                                      *)
Read ==
    /\ offset < Len(stream)
    /\ LET r == stream[offset + 1] IN
         /\ pending' = [pending EXCEPT ![r] = @ + 1]
         /\ admits' = [admits EXCEPT ![r] = @ + 1]
         /\ maxAdmits' = [maxAdmits EXCEPT ![r] = Max(@, admits[r] + 1)]
    /\ offset' = offset + 1
    /\ durable' = IF OffsetMode = "durable" THEN offset + 1 ELSE durable
    /\ UNCHANGED <<stream, expires, now, runs, instRuns, maxInstRuns,
                   restartsBy, usedProof, lost, resets, crashes>>

Finished(r) == [pending EXCEPT ![r] = @ - 1]

(* A task whose request has expired returns without a reply. *)
DropExpired(r) ==
    /\ pending[r] > 0
    /\ now >= expires[r]
    /\ pending' = Finished(r)
    /\ UNCHANGED <<stream, expires, now, offset, durable, admits, maxAdmits,
                   runs, instRuns, maxInstRuns, restartsBy, usedProof, lost,
                   resets, crashes>>

(* Record one handler run in the current instance. *)
Ran(r) ==
    /\ runs' = [runs EXCEPT ![r] = @ + 1]
    /\ maxInstRuns' = [maxInstRuns EXCEPT ![r] = Max(@, instRuns[r] + 1)]

(* An ordinary task runs its handler and answers. *)
Handle(r) ==
    /\ pending[r] > 0
    /\ r \notin RestartReqs
    /\ now < expires[r]
    /\ Ran(r)
    /\ instRuns' = [instRuns EXCEPT ![r] = @ + 1]
    /\ pending' = Finished(r)
    /\ UNCHANGED <<stream, expires, now, offset, durable, admits, maxAdmits,
                   restartsBy, usedProof, lost, resets, crashes>>

(* A restart task whose proof the backend refuses is answered with an    *)
(* error and restarts nothing.  The handler ran, so the run is counted.  *)
RefuseRestart(r) ==
    /\ pending[r] > 0
    /\ r \in RestartReqs
    /\ now < expires[r]
    /\ RestartSingleUse
    /\ r \in usedProof
    /\ Ran(r)
    /\ instRuns' = [instRuns EXCEPT ![r] = @ + 1]
    /\ pending' = Finished(r)
    /\ UNCHANGED <<stream, expires, now, offset, durable, admits, maxAdmits,
                   restartsBy, usedProof, lost, resets, crashes>>

(* An accepted restart is answered, then the worker exits and a new      *)
(* instance starts with no tasks.  The restart handler's run is counted  *)
(* in the instance it ends.  A restart takes at least one tick.  As with *)
(* a crash, other unexpired tasks behind a persisted offset are lost.    *)
HandleRestart(r) ==
    /\ pending[r] > 0
    /\ r \in RestartReqs
    /\ now < expires[r]
    /\ ~(RestartSingleUse /\ r \in usedProof)
    /\ now < MaxTime
    /\ Ran(r)
    /\ restartsBy' = [restartsBy EXCEPT ![r] = @ + 1]
    /\ usedProof' = usedProof \cup {r}
    /\ now' = now + 1
    /\ offset' = ResumeOffset(durable)
    /\ pending' = Zero
    /\ admits' = Zero
    /\ instRuns' = Zero
    /\ lost' = IF OffsetMode = "durable"
               THEN lost \cup {q \in Requests :
                                 Finished(r)[q] > 0 /\ now + 1 < expires[q]}
               ELSE lost
    /\ UNCHANGED <<stream, expires, durable, maxAdmits, resets, crashes>>

(* The daemon crashes.  Memory, including started tasks, is lost; the    *)
(* stream and any persisted offset survive.  With a persisted offset, an *)
(* unexpired task lost here will never be read again.                    *)
Crash ==
    /\ crashes < MaxCrashes
    /\ crashes' = crashes + 1
    /\ offset' = ResumeOffset(durable)
    /\ lost' = IF OffsetMode = "durable"
               THEN lost \cup {r \in Requests : pending[r] > 0 /\ now < expires[r]}
               ELSE lost
    /\ pending' = Zero
    /\ admits' = Zero
    /\ instRuns' = Zero
    /\ UNCHANGED <<stream, expires, now, durable, maxAdmits, runs, maxInstRuns,
                   restartsBy, usedProof, resets>>

(* After a 404 or 410 the read loop resets its offset in the same         *)
(* instance.  Tasks already started keep running.  Resets are modelled    *)
(* for the shipped "memory" mode only: the "durable" candidate's loss      *)
(* accounting assumes the persisted offset never moves backwards.          *)
ResetOffset ==
    /\ OffsetMode = "memory"
    /\ resets < MaxResets
    /\ resets' = resets + 1
    /\ offset' = 0
    /\ admits' = Zero
    /\ UNCHANGED <<stream, expires, now, durable, pending, maxAdmits, runs,
                   instRuns, maxInstRuns, restartsBy, usedProof, lost, crashes>>

Next ==
    \/ \E r \in Requests :
          Send(r) \/ DropExpired(r) \/ Handle(r) \/ RefuseRestart(r)
          \/ HandleRestart(r)
    \/ Tick
    \/ Read
    \/ Crash
    \/ ResetOffset

Spec == Init /\ [][Next]_vars

-----------------------------------------------------------------------------

TypeOK ==
    /\ stream \in Seq(Requests)
    /\ now \in 0..MaxTime
    /\ offset \in 0..Len(stream)
    /\ durable \in 0..Len(stream)
    /\ pending \in [Requests -> Nat]
    /\ usedProof \subseteq RestartReqs
    /\ lost \subseteq Requests
    /\ resets \in 0..MaxResets
    /\ crashes \in 0..MaxCrashes

(* R1.  The read loop starts at most one task per request per read pass. *)
(* A pass ends at a crash, a restart, or an in-process offset reset.     *)
(* Tasks started in an earlier pass may still be running.  R1 rests on   *)
(* two assumptions built into Send and Read: no caller appends the same  *)
(* identifier twice, and the stream delivers each position once per      *)
(* pass.  Gateway behaviour is not verified.                             *)
AdmitOncePerPass == \A r \in Requests : maxAdmits[r] <= 1

(* R2.  A restart request causes no more restarts than its lifetime in   *)
(* ticks: a restart loop, if one exists, ends when the request expires.  *)
RestartLoopBounded == \A r \in RestartReqs : restartsBy[r] <= Ttl

(* R3.  A request that was read while unexpired is not silently lost.    *)
(* `lost` is recorded only when a crash leaves an unexpired task behind  *)
(* a persisted offset, so it can never be read again.  In the shipped    *)
(* "memory" mode the offset resets and the request is read again, so R3  *)
(* holds by construction there; it exists to show the cost of the        *)
(* "durable" candidate.  A request that expires before it is read again  *)
(* is dropped by design and is not counted as lost.                      *)
NoSilentLoss == lost = {}

(* Holds only without in-process offset resets: a request's handler runs *)
(* at most once in any one server instance, the restart handler included.*)
OncePerInstance == \A r \in Requests : maxInstRuns[r] <= 1

(* Not guaranteed by the shipped protocol: a request runs at most once.  *)
AtMostOnce == \A r \in Requests : runs[r] <= 1

(* Depends on the backend: a restart request restarts the daemon once.   *)
RestartOnce == \A r \in RestartReqs : restartsBy[r] <= 1

(* Reachability witnesses.  Each must be violated: it shows that the     *)
(* states R1 and R2 constrain are reachable.                             *)
NeverAdmitted == \A r \in Requests : maxAdmits[r] = 0
NeverRestarted == \A r \in RestartReqs : restartsBy[r] = 0

=============================================================================
