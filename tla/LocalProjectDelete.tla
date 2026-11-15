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
(* `now` is the server-synchronized clock (getServerNow()).  With         *)
(* TieClock = FALSE, registering a project and requesting a delete each    *)
(* advance it, so createdAtMs and requestedAt values are distinct.  With   *)
(* TieClock = TRUE, either may reuse the latest timestamp, as two writes   *)
(* in the same millisecond would.  Each value also carries a ghost `g`,    *)
(* the real order of the event that wrote it, so that "registered after    *)
(* the request" is judged by real order rather than by timestamp.          *)
(***************************************************************************)
EXTENDS FlockLWW, FiniteSets

CONSTANTS
    MaxNow,        \* bound on the server clock
    MaxTouches,    \* bound on client whole-row rewrites of the project row
    Skew,          \* extra LWW clock headroom a writer may take
    StaleGuard,    \* TRUE (shipped): skip commands older than the project
    UiRowUpdates,  \* TRUE (shipped): clients rewrite the project row in place
    TieClock       \* TRUE: two events may share a millisecond timestamp

ASSUME /\ Keys = {"project", "cmd"}
       /\ StaleGuard \in BOOLEAN
       /\ UiRowUpdates \in BOOLEAN
       /\ TieClock \in BOOLEAN

Rank(r) == IF r = "ui" THEN 1 ELSE 2
R == {"ui", "srv", "dmn"}

VARIABLES
    st,            \* st[r]: rows held by replica r
    now,           \* server clock
    ord,           \* ghost: real order of registration and request events
    touches,
    removedGens,   \* history: ghost order of every project the daemon removed
    removedFresh   \* history: the daemon removed a project newer than the command

vars == <<st, now, ord, touches, removedGens, removedFresh>>

Vis(r, k) == Visible(st[r], k)
Val(r, k) == st[r][k].v

NextT(r, k) == (st[r][k].t + 1)..(st[r][k].t + 1 + Skew)
W(m, r, k, v, t) == [m EXCEPT ![k] = Entry(t, Rank(r), v)]

Proj(c, g) == [s |-> "proj", a |-> c, g |-> g]
Cmd(s, q, g) == [s |-> s, a |-> q, g |-> g]

(* Advances of the clock an event may take: a tie reuses the timestamp.  *)
Steps == IF TieClock THEN {0, 1} ELSE {1}

Init ==
    /\ st = [r \in R |-> EmptyState]
    /\ now = 0
    /\ ord = 0
    /\ touches = 0
    /\ removedGens = {}
    /\ removedFresh = FALSE

(* Register the project on replica r: the daemon's `local-project/add`     *)
(* handler, or a client's put-if-absent.  An existing row keeps its        *)
(* createdAtMs, so only an absent row is modelled.                         *)
Add(r) ==
    /\ r \in {"ui", "dmn"}
    /\ now < MaxNow
    /\ ord < MaxNow
    /\ ~Vis(r, "project")
    /\ ord' = ord + 1
    /\ \E d \in Steps, t \in NextT(r, "project") :
         /\ now' = now + d
         /\ st' = [st EXCEPT ![r] = W(@, r, "project", Proj(now + d, ord + 1), t)]
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
    /\ UNCHANGED <<now, ord, removedGens, removedFresh>>

(* A client asks the owning machine to remove the project.  The client     *)
(* hides a project that has a command row, so it cannot ask twice.         *)
UiRequestDelete(clean) ==
    /\ now < MaxNow
    /\ ord < MaxNow
    /\ Vis("ui", "project")
    /\ ~Vis("ui", "cmd")
    /\ ord' = ord + 1
    /\ \E d \in Steps, t \in NextT("ui", "cmd") :
         /\ now' = now + d
         /\ st' = [st EXCEPT !["ui"] =
                   W(@, "ui", "cmd",
                     Cmd(IF clean THEN "pendingClean" ELSE "pending", now + d,
                         ord + 1), t)]
    /\ UNCHANGED <<touches, removedGens, removedFresh>>

(* A client acknowledges a completed command by deleting its row.          *)
UiAck ==
    /\ Vis("ui", "cmd")
    /\ Val("ui", "cmd").s = "completed"
    /\ \E t \in NextT("ui", "cmd") :
         st' = [st EXCEPT !["ui"] = W(@, "ui", "cmd", Tomb, t)]
    /\ UNCHANGED <<now, ord, touches, removedGens, removedFresh>>

Push(r) ==
    /\ r \in {"ui", "dmn"}
    /\ st["srv"] # Merge(st["srv"], st[r])
    /\ st' = [st EXCEPT !["srv"] = Merge(@, st[r])]
    /\ UNCHANGED <<now, ord, touches, removedGens, removedFresh>>

Pull(r) ==
    /\ r \in {"ui", "dmn"}
    /\ st[r] # Merge(st[r], st["srv"])
    /\ st' = [st EXCEPT ![r] = Merge(@, st["srv"])]
    /\ UNCHANGED <<now, ord, touches, removedGens, removedFresh>>

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
           later == hasP /\ Val("dmn", "project").g > c.g
       IN \E referenced \in BOOLEAN, tp \in NextT("dmn", "project"),
             tc \in NextT("dmn", "cmd") :
            IF (fresh /\ StaleGuard) \/ (hasP /\ referenced)
            THEN /\ st' = [st EXCEPT !["dmn"] = W(@, "dmn", "cmd", Tomb, tc)]
                 /\ UNCHANGED <<removedGens, removedFresh>>
            ELSE /\ LET m1 == IF hasP
                              THEN W(st["dmn"], "dmn", "project", Tomb, tp)
                              ELSE st["dmn"]
                        m2 == IF c.s = "pendingClean"
                              THEN W(m1, "dmn", "cmd", Cmd("completed", c.a, c.g), tc)
                              ELSE W(m1, "dmn", "cmd", Tomb, tc)
                    IN st' = [st EXCEPT !["dmn"] = m2]
                 /\ removedGens' = IF hasP
                                   THEN removedGens \cup {Val("dmn", "project").g}
                                   ELSE removedGens
                 /\ removedFresh' = (removedFresh \/ later)
    /\ UNCHANGED <<now, ord, touches>>

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
    /\ ord \in 0..MaxNow
    /\ removedGens \subseteq 0..MaxNow
    /\ removedFresh \in BOOLEAN

(* D1.  A delete request never removes a project registered after it,     *)
(* judged by the real order of the two events.                             *)
FreshProjectNeverRemoved == ~removedFresh

Converged == st["ui"] = st["srv"] /\ st["srv"] = st["dmn"]

(* D2.  A project registration the daemon removed does not come back.      *)
(* This is NOT a property of the shipped protocol: it fails when clients   *)
(* rewrite the project row (UiRowUpdates), because a rewrite concurrent    *)
(* with the removal can carry the later LWW clock.                         *)
NoResurrection ==
    Converged => ~(Vis("dmn", "project") /\ Val("dmn", "project").g \in removedGens)

(* L1.  Every command row eventually drains from every replica.            *)
CommandsDrain == <>[](Converged /\ ~Vis("dmn", "cmd"))

=============================================================================
