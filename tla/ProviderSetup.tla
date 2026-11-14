---------------------------- MODULE ProviderSetup ----------------------------
(***************************************************************************)
(* The durable, cancellable provider-setup queue carried by a Machine      *)
(* Flock, for one setup id.                                                *)
(*                                                                         *)
(* Rows (packages/shared/src/machine-flock.ts):                            *)
(*   ['providerSetup', id]              -> "setup"   (ProviderSetupTask)   *)
(*   ['providerSetupCancellation', id]  -> "cancel"  (cancellation marker) *)
(*   ['agentConfig', id]                -> "config"  (published provider)  *)
(*                                                                         *)
(* Participants:                                                           *)
(*   "ui"  - a client replica (desktop renderer or mobile)                 *)
(*   "srv" - the document's stream, abstracted as the join of everything   *)
(*           uploaded so far                                               *)
(*   "dmn" - the owning machine's daemon (ProviderSetupManager,            *)
(*           apps/cli/src/lib/provider-setup-manager.ts)                   *)
(*                                                                         *)
(* Replication is state-based anti-entropy: Push merges a replica into the *)
(* stream, Pull merges the stream into a replica.  FlockReplication.tla    *)
(* justifies that abstraction for the cloud transport.                     *)
(*                                                                         *)
(* Status abstraction: "queued", "preparing" and "verifying" are the       *)
(* resumable statuses; "dormant" stands for both 'failed' and              *)
(* 'awaiting-auth', which the daemon leaves alone until something external *)
(* requeues the task with attempt + 1.                                     *)
(***************************************************************************)
EXTENDS FlockLWW

CONSTANTS
    MaxAttempts,       \* bound on ProviderSetupTask.attempt
    MaxDisruptions,    \* bound on daemon crashes plus command-room losses
    Skew,              \* extra clock headroom a writer may take (0 = none)
    WaitForAuthority   \* TRUE: cloud/dual (shipped); FALSE: ablation / local

ASSUME /\ Keys = {"setup", "cancel", "config"}
       /\ WaitForAuthority \in BOOLEAN

Rank(r) == IF r = "ui" THEN 1 ELSE 2        \* peer-id order; "srv" never writes
R == {"ui", "srv", "dmn"}

VARIABLES
    st,           \* st[r]: the Flock rows held by replica r
    task,         \* daemon in-flight processOne(): [phase, a]
    auth,         \* daemon command room established remote authority
    requested,    \* the UI created the setup
    disruptions,
    startCancel,  \* the stream held the cancellation when the daemon started
    stalePublish  \* history: a publish happened although startCancel

vars == <<st, task, auth, requested, disruptions, startCancel, stalePublish>>

Idle == [phase |-> "idle", a |-> 0]
On == [s |-> "on", a |-> 0]
Status(s, a) == [s |-> s, a |-> a]

Resumable == {"queued", "preparing", "verifying"}

Vis(r, k) == Visible(st[r], k)
Val(r, k) == st[r][k].v

(* Clocks a local write on replica r may take for key k: greater than the  *)
(* entry it supersedes, with up to Skew of extra headroom.                 *)
NextT(r, k) == (st[r][k].t + 1)..(st[r][k].t + 1 + Skew)

W(m, r, k, v, t) == [m EXCEPT ![k] = Entry(t, Rank(r), v)]

(* Delete key k on replica state m if it is visible there.                 *)
DelIfVis(m, r, k, t) == IF Visible(m, k) THEN W(m, r, k, Tomb, t) ELSE m

Gate == ~WaitForAuthority \/ auth

Init ==
    /\ st = [r \in R |-> EmptyState]
    /\ task = Idle
    /\ auth = FALSE
    /\ requested = FALSE
    /\ disruptions = 0
    /\ startCancel = FALSE
    /\ stalePublish = FALSE

-----------------------------------------------------------------------------
(* Client actions *)

(* Create the durable setup intent (status 'queued', attempt 1).           *)
UiRequest ==
    /\ ~requested
    /\ requested' = TRUE
    /\ \E t \in NextT("ui", "setup") :
         st' = [st EXCEPT !["ui"] = W(@, "ui", "setup", Status("queued", 1), t)]
    /\ UNCHANGED <<task, auth, disruptions, startCancel, stalePublish>>

(* Retry a dormant task: same key, attempt + 1.  The model does not rely   *)
(* on the client hiding cancelled setups, so no cancellation guard.        *)
UiRetry ==
    /\ Vis("ui", "setup")
    /\ Val("ui", "setup").s = "dormant"
    /\ Val("ui", "setup").a < MaxAttempts
    /\ \E t \in NextT("ui", "setup") :
         st' = [st EXCEPT !["ui"] =
                   W(@, "ui", "setup", Status("queued", Val("ui", "setup").a + 1), t)]
    /\ UNCHANGED <<task, auth, requested, disruptions, startCancel, stalePublish>>

(* Cancel, step 1: the durable marker is the accept boundary.              *)
UiCancelMark ==
    /\ requested
    /\ ~Vis("ui", "cancel")
    /\ \E t \in NextT("ui", "cancel") :
         st' = [st EXCEPT !["ui"] = W(@, "ui", "cancel", On, t)]
    /\ UNCHANGED <<task, auth, requested, disruptions, startCancel, stalePublish>>

(* Cancel, step 2: best-effort deletes whose failures are ignored, so the  *)
(* model lets each happen or not, independently.                           *)
UiCancelDelete(k) ==
    /\ k \in {"setup", "config"}
    /\ Vis("ui", "cancel")
    /\ Vis("ui", k)
    /\ \E t \in NextT("ui", k) :
         st' = [st EXCEPT !["ui"] = W(@, "ui", k, Tomb, t)]
    /\ UNCHANGED <<task, auth, requested, disruptions, startCancel, stalePublish>>

-----------------------------------------------------------------------------
(* Replication *)

Push(r) ==
    /\ r \in {"ui", "dmn"}
    /\ st["srv"] # Merge(st["srv"], st[r])
    /\ st' = [st EXCEPT !["srv"] = Merge(@, st[r])]
    /\ UNCHANGED <<task, auth, requested, disruptions, startCancel, stalePublish>>

(* For the daemon, a Pull that completes is the command room's             *)
(* firstSyncedWithRemote, which is what makes the watcher `ready`.         *)
Pull(r) ==
    /\ r \in {"ui", "dmn"}
    /\ \/ st[r] # Merge(st[r], st["srv"])
       \/ r = "dmn" /\ ~auth
    /\ st' = [st EXCEPT ![r] = Merge(@, st["srv"])]
    /\ auth' = IF r = "dmn" THEN TRUE ELSE auth
    /\ UNCHANGED <<task, requested, disruptions, startCancel, stalePublish>>

-----------------------------------------------------------------------------
(* Daemon actions.  Every write is flushed before it is acknowledged, so   *)
(* st["dmn"] survives a crash; `task` and `auth` do not.                   *)

DmnCrash ==
    /\ disruptions < MaxDisruptions
    /\ disruptions' = disruptions + 1
    /\ task' = Idle
    /\ auth' = FALSE
    /\ startCancel' = Vis("srv", "cancel")
    /\ UNCHANGED <<st, requested, stalePublish>>

(* The command room turns 'disconnected' or 'error': `ready` drops, but a  *)
(* processOne() already running continues.                                 *)
DmnLoseRoom ==
    /\ auth
    /\ disruptions < MaxDisruptions
    /\ disruptions' = disruptions + 1
    /\ auth' = FALSE
    /\ UNCHANGED <<st, task, requested, startCancel, stalePublish>>

(* reconcileCancellations(): the first step of every drain.                *)
DmnReconcile ==
    /\ Gate
    /\ task.phase = "idle"
    /\ Vis("dmn", "cancel")
    /\ Vis("dmn", "setup") \/ Vis("dmn", "config")
    /\ \E t1 \in NextT("dmn", "setup"), t2 \in NextT("dmn", "config") :
         st' = [st EXCEPT !["dmn"] =
                   DelIfVis(DelIfVis(@, "dmn", "setup", t1), "dmn", "config", t2)]
    /\ UNCHANGED <<task, auth, requested, disruptions, startCancel, stalePublish>>

(* processOne() entry: readSetup() hides a cancelled setup; a setup whose  *)
(* config already exists is only cleaned up.                               *)
DmnAdopt ==
    /\ Gate
    /\ task.phase = "idle"
    /\ Vis("dmn", "setup")
    /\ ~Vis("dmn", "cancel")
    /\ Val("dmn", "setup").s \in Resumable
    /\ \E t \in NextT("dmn", "setup") :
         IF Vis("dmn", "config")
         THEN /\ st' = [st EXCEPT !["dmn"] = W(@, "dmn", "setup", Tomb, t)]
              /\ UNCHANGED task
         ELSE /\ st' = [st EXCEPT !["dmn"] =
                           W(@, "dmn", "setup",
                             Status("preparing", Val("dmn", "setup").a), t)]
              /\ task' = [phase |-> "preparing", a |-> Val("dmn", "setup").a]
    /\ UNCHANGED <<auth, requested, disruptions, startCancel, stalePublish>>

(* updateStatus()/fail() re-read the row and require the same attempt.     *)
StillMine ==
    /\ Vis("dmn", "setup")
    /\ ~Vis("dmn", "cancel")
    /\ Val("dmn", "setup").a = task.a

(* Runtime prepared; move to the live probe.                               *)
DmnVerify ==
    /\ task.phase = "preparing"
    /\ IF StillMine
       THEN /\ \E t \in NextT("dmn", "setup") :
                 st' = [st EXCEPT !["dmn"] =
                           W(@, "dmn", "setup", Status("verifying", task.a), t)]
            /\ task' = [task EXCEPT !.phase = "verifying"]
       ELSE /\ task' = Idle
            /\ UNCHANGED st
    /\ UNCHANGED <<auth, requested, disruptions, startCancel, stalePublish>>

(* Runtime or probe failed, or the provider needs interactive auth.        *)
DmnGiveUp ==
    /\ task.phase \in {"preparing", "verifying"}
    /\ task' = Idle
    /\ IF StillMine
       THEN \E t \in NextT("dmn", "setup") :
              st' = [st EXCEPT !["dmn"] =
                        W(@, "dmn", "setup", Status("dormant", task.a), t)]
       ELSE UNCHANGED st
    /\ UNCHANGED <<auth, requested, disruptions, startCancel, stalePublish>>

(* publishVerifiedConfig(): re-read all three rows, then either apply the  *)
(* cancellation, drop a superseded task, clean up, or publish - one commit *)
(* that writes the config and deletes the setup.                           *)
DmnPublish ==
    /\ task.phase = "verifying"
    /\ task' = Idle
    /\ \E t1 \in NextT("dmn", "setup"), t2 \in NextT("dmn", "config") :
         IF Vis("dmn", "cancel")
         THEN /\ st' = [st EXCEPT !["dmn"] =
                           DelIfVis(DelIfVis(@, "dmn", "setup", t1), "dmn", "config", t2)]
              /\ UNCHANGED stalePublish
         ELSE IF \/ ~Vis("dmn", "setup")
                 \/ Val("dmn", "setup").a # task.a
                 \/ Val("dmn", "setup").s # "verifying"
         THEN UNCHANGED <<st, stalePublish>>
         ELSE IF Vis("dmn", "config")
         THEN /\ st' = [st EXCEPT !["dmn"] = W(@, "dmn", "setup", Tomb, t1)]
              /\ UNCHANGED stalePublish
         ELSE /\ st' = [st EXCEPT !["dmn"] =
                           W(W(@, "dmn", "config", On, t2), "dmn", "setup", Tomb, t1)]
              /\ stalePublish' = (stalePublish \/ startCancel)
    /\ UNCHANGED <<auth, requested, disruptions, startCancel>>

(* resumeAfterAuthentication(): an RPC, not part of the gated drain.       *)
DmnResume ==
    /\ Vis("dmn", "setup")
    /\ ~Vis("dmn", "cancel")
    /\ Val("dmn", "setup").s = "dormant"
    /\ Val("dmn", "setup").a < MaxAttempts
    /\ \E t \in NextT("dmn", "setup") :
         st' = [st EXCEPT !["dmn"] =
                   W(@, "dmn", "setup", Status("queued", Val("dmn", "setup").a + 1), t)]
    /\ UNCHANGED <<task, auth, requested, disruptions, startCancel, stalePublish>>

Next ==
    \/ UiRequest \/ UiRetry \/ UiCancelMark
    \/ \E k \in {"setup", "config"} : UiCancelDelete(k)
    \/ \E r \in {"ui", "dmn"} : Push(r) \/ Pull(r)
    \/ DmnCrash \/ DmnLoseRoom
    \/ DmnReconcile \/ DmnAdopt \/ DmnVerify \/ DmnGiveUp \/ DmnPublish \/ DmnResume

(* Clients and the daemon keep synchronizing, and the daemon keeps         *)
(* draining.  Nothing is assumed about whether a user requests, retries    *)
(* or cancels, or about whether verification succeeds.                     *)
Fairness ==
    /\ \A r \in {"ui", "dmn"} : WF_vars(Push(r)) /\ WF_vars(Pull(r))
    /\ WF_vars(DmnReconcile)
    /\ WF_vars(DmnAdopt)
    /\ WF_vars(DmnVerify)
    /\ WF_vars(DmnPublish)

Spec == Init /\ [][Next]_vars /\ Fairness

-----------------------------------------------------------------------------
(* Safety *)

TypeOK ==
    /\ \A r \in R, k \in Keys :
         /\ st[r][k].t \in Nat
         /\ st[r][k].p \in {0, 1, 2}
         /\ st[r][k].v.s \in {"none", "tomb", "on", "dormant"} \cup Resumable
         /\ st[r][k].v.a \in 0..MaxAttempts
    /\ task.phase \in {"idle", "preparing", "verifying"}
    /\ task.a \in 0..MaxAttempts
    /\ auth \in BOOLEAN /\ requested \in BOOLEAN
    /\ startCancel \in BOOLEAN /\ stalePublish \in BOOLEAN

(* P1.  Only the owning daemon authors a published config.                 *)
ConfigOwnedByDaemon ==
    \A r \in R : Vis(r, "config") => st[r]["config"].p = Rank("dmn")

(* P2.  The cancellation marker is never retracted once a replica has it.  *)
CancelIsPermanent ==
    \A r \in R : st[r]["cancel"].v.s \in {"none", "on"}

(* P3.  A stale local setup row never outruns a cancellation that was      *)
(* already in the stream when the daemon started.  Holds only with         *)
(* WaitForAuthority.                                                       *)
NoStalePublish == ~stalePublish

(* P4.  The daemon never works on a setup it can see is cancelled: an      *)
(* in-flight task implies the cancellation arrived after adoption.         *)
PublishStep ==
    /\ ~Vis("dmn", "config")
    /\ Vis("dmn", "config")'

NoPublishOverVisibleCancel == [][PublishStep => ~Vis("dmn", "cancel")]_vars

-----------------------------------------------------------------------------
(* Liveness *)

Converged == st["ui"] = st["srv"] /\ st["srv"] = st["dmn"]

Cancelled ==
    \A r \in R : Vis(r, "cancel") /\ ~Vis(r, "setup") /\ ~Vis(r, "config")

(* L1.  Cancellation wins: once a client holds the marker, every replica   *)
(* ends with the marker and neither a setup nor a config - even if the     *)
(* daemon published concurrently.                                          *)
CancelWins == [](Vis("ui", "cancel") => <>[]Cancelled)

(* L2.  The queue settles: replicas agree, nothing is in flight, and any   *)
(* remaining setup row is dormant (awaiting the user).                     *)
Settled ==
    /\ Converged
    /\ task.phase = "idle"
    /\ Vis("dmn", "setup") => Val("dmn", "setup").s = "dormant"
    /\ Vis("dmn", "setup") => ~Vis("dmn", "config")
    /\ Vis("dmn", "cancel") => ~Vis("dmn", "setup") /\ ~Vis("dmn", "config")

EventuallySettled == <>[]Settled

=============================================================================
