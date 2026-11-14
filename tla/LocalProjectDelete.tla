------------------------- MODULE LocalProjectDelete -------------------------
(***************************************************************************)
(* The durable delete-local-project command carried by a Machine Flock,    *)
(* for one local project id.                                               *)
(*                                                                         *)
(* Rows (packages/shared/src/machine-flock.ts):                            *)
(*   ['localProject', id]               -> "project"  (LocalProjectMeta)   *)
(*   ['cmd', 'deleteLocalProject', id]  -> "cmd"      (the command)        *)
(*                                                                         *)
(* Participants: "ui" (a client), "srv" (the stream, as the join of all    *)
(* uploads) and "dmn" (the owning daemon:                                  *)
(* MessageHandler.processDeleteLocalProjectRequests in                     *)
(* apps/cli/src/lib/message-handler.ts).                                   *)
(*                                                                         *)
(* A project value is [s |-> "proj", a |-> createdAtMs]; a command value   *)
(* is [s |-> status, a |-> requestedAt] with status "pending",             *)
(* "pendingClean" (cleanupWorktrees requested) or "completed".             *)
(*                                                                         *)
(* `now` is the server-synchronized clock (getServerNow()).  Registering   *)
(* a project and requesting a delete each advance it, so createdAtMs and   *)
(* requestedAt values are distinct.                                        *)
(***************************************************************************)
EXTENDS FlockLWW, FiniteSets

CONSTANTS
    MaxNow,        \* bound on the server clock
    MaxTouches,    \* bound on client whole-row rewrites of the project row
    Skew,          \* extra LWW clock headroom a writer may take
    StaleGuard,    \* TRUE (shipped): skip commands older than the project
    UiRowUpdates   \* TRUE (shipped): clients rewrite the project row in place

ASSUME /\ Keys = {"project", "cmd"}
       /\ StaleGuard \in BOOLEAN
       /\ UiRowUpdates \in BOOLEAN

Rank(r) == IF r = "ui" THEN 1 ELSE 2
R == {"ui", "srv", "dmn"}

VARIABLES
    st,            \* st[r]: rows held by replica r
    now,           \* server clock
    touches,
    removedGens,   \* history: createdAtMs of every project the daemon removed
    removedFresh   \* history: the daemon removed a project newer than the command

vars == <<st, now, touches, removedGens, removedFresh>>

Vis(r, k) == Visible(st[r], k)
Val(r, k) == st[r][k].v

NextT(r, k) == (st[r][k].t + 1)..(st[r][k].t + 1 + Skew)
W(m, r, k, v, t) == [m EXCEPT ![k] = Entry(t, Rank(r), v)]

Proj(c) == [s |-> "proj", a |-> c]
Cmd(s, q) == [s |-> s, a |-> q]

Init ==
    /\ st = [r \in R |-> EmptyState]
    /\ now = 0
    /\ touches = 0
    /\ removedGens = {}
    /\ removedFresh = FALSE

(* Register the project on replica r: the daemon's `local-project/add`     *)
(* handler, or a client's put-if-absent.  An existing row keeps its        *)
(* createdAtMs, so only an absent row is modelled.                         *)
Add(r) ==
    /\ r \in {"ui", "dmn"}
    /\ now < MaxNow
    /\ ~Vis(r, "project")
    /\ now' = now + 1
    /\ \E t \in NextT(r, "project") :
         st' = [st EXCEPT ![r] = W(@, r, "project", Proj(now + 1), t)]
    /\ UNCHANGED <<touches, removedGens, removedFresh>>

(* A client rewrites the whole project row (history catalogue, standalone  *)
(* visibility, GitHub remote), keeping createdAtMs.                        *)
UiTouch ==
    /\ UiRowUpdates
    /\ touches < MaxTouches
    /\ Vis("ui", "project")
    /\ touches' = touches + 1
    /\ \E t \in NextT("ui", "project") :
         st' = [st EXCEPT !["ui"] = W(@, "ui", "project", Val("ui", "project"), t)]
    /\ UNCHANGED <<now, removedGens, removedFresh>>

(* A client asks the owning machine to remove the project.  The client     *)
(* hides a project that has a command row, so it cannot ask twice.         *)
UiRequestDelete(clean) ==
    /\ now < MaxNow
    /\ Vis("ui", "project")
    /\ ~Vis("ui", "cmd")
    /\ now' = now + 1
    /\ \E t \in NextT("ui", "cmd") :
         st' = [st EXCEPT !["ui"] =
                   W(@, "ui", "cmd",
                     Cmd(IF clean THEN "pendingClean" ELSE "pending", now + 1), t)]
    /\ UNCHANGED <<touches, removedGens, removedFresh>>

(* A client acknowledges a completed command by deleting its row.          *)
UiAck ==
    /\ Vis("ui", "cmd")
    /\ Val("ui", "cmd").s = "completed"
    /\ \E t \in NextT("ui", "cmd") :
         st' = [st EXCEPT !["ui"] = W(@, "ui", "cmd", Tomb, t)]
    /\ UNCHANGED <<now, touches, removedGens, removedFresh>>

Push(r) ==
    /\ r \in {"ui", "dmn"}
    /\ st["srv"] # Merge(st["srv"], st[r])
    /\ st' = [st EXCEPT !["srv"] = Merge(@, st[r])]
    /\ UNCHANGED <<now, touches, removedGens, removedFresh>>

Pull(r) ==
    /\ r \in {"ui", "dmn"}
    /\ st[r] # Merge(st[r], st["srv"])
    /\ st' = [st EXCEPT ![r] = Merge(@, st["srv"])]
    /\ UNCHANGED <<now, touches, removedGens, removedFresh>>

(* One successful pass of processDeleteLocalProjectRequests() over the     *)
(* command.  A pass that throws changes nothing and is retried by the next *)
(* rescan, so it is a stuttering step.                                     *)
(*   - A project created after the request is left alone (stale command).  *)
(*   - A project still referenced by the catalogue or a session is only    *)
(*     unlinked, not removed.                                              *)
(*   - Otherwise the project row is removed.                               *)
(* The command row is then deleted, or rewritten as "completed" when a     *)
(* worktree clean-up result has to reach the client.                       *)
DmnProcess ==
    /\ Vis("dmn", "cmd")
    /\ Val("dmn", "cmd").s # "completed"
    /\ LET c == Val("dmn", "cmd")
           hasP == Vis("dmn", "project")
           fresh == hasP /\ Val("dmn", "project").a > c.a
       IN \E referenced \in BOOLEAN, tp \in NextT("dmn", "project"),
             tc \in NextT("dmn", "cmd") :
            IF (fresh /\ StaleGuard) \/ (hasP /\ referenced)
            THEN /\ st' = [st EXCEPT !["dmn"] = W(@, "dmn", "cmd", Tomb, tc)]
                 /\ UNCHANGED <<removedGens, removedFresh>>
            ELSE /\ LET m1 == IF hasP
                              THEN W(st["dmn"], "dmn", "project", Tomb, tp)
                              ELSE st["dmn"]
                        m2 == IF c.s = "pendingClean"
                              THEN W(m1, "dmn", "cmd", Cmd("completed", c.a), tc)
                              ELSE W(m1, "dmn", "cmd", Tomb, tc)
                    IN st' = [st EXCEPT !["dmn"] = m2]
                 /\ removedGens' = IF hasP
                                   THEN removedGens \cup {Val("dmn", "project").a}
                                   ELSE removedGens
                 /\ removedFresh' = (removedFresh \/ fresh)
    /\ UNCHANGED <<now, touches>>

Next ==
    \/ \E r \in {"ui", "dmn"} : Add(r) \/ Push(r) \/ Pull(r)
    \/ UiTouch \/ UiAck
    \/ \E clean \in BOOLEAN : UiRequestDelete(clean)
    \/ DmnProcess

Fairness ==
    /\ \A r \in {"ui", "dmn"} : WF_vars(Push(r)) /\ WF_vars(Pull(r))
    /\ WF_vars(DmnProcess)
    /\ WF_vars(UiAck)

Spec == Init /\ [][Next]_vars /\ Fairness

-----------------------------------------------------------------------------

TypeOK ==
    /\ \A r \in R, k \in Keys :
         /\ st[r][k].t \in Nat
         /\ st[r][k].p \in {0, 1, 2}
         /\ st[r][k].v.s \in {"none", "tomb", "proj", "pending", "pendingClean", "completed"}
         /\ st[r][k].v.a \in 0..MaxNow
    /\ now \in 0..MaxNow
    /\ removedGens \subseteq 0..MaxNow
    /\ removedFresh \in BOOLEAN

(* D1.  A delete request never removes a project registered after it.      *)
FreshProjectNeverRemoved == ~removedFresh

Converged == st["ui"] = st["srv"] /\ st["srv"] = st["dmn"]

(* D2.  A project registration the daemon removed does not come back.      *)
(* This is NOT a property of the shipped protocol: it fails when clients   *)
(* rewrite the project row (UiRowUpdates), because a rewrite concurrent    *)
(* with the removal can carry the later LWW clock.                         *)
NoResurrection ==
    Converged => ~(Vis("dmn", "project") /\ Val("dmn", "project").a \in removedGens)

(* L1.  Every command row eventually drains from every replica.            *)
CommandsDrain == <>[](Converged /\ ~Vis("dmn", "cmd"))

=============================================================================
