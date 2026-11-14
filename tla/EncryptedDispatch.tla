------------------------ MODULE EncryptedDispatch ------------------------
(***************************************************************************)
(* One user turn dispatched to a machine in an encrypted workspace.        *)
(*                                                                         *)
(* The same sealed original can reach the machine by three routes: the     *)
(* encrypted Streams channel, Iroh, and the durable route through the      *)
(* session document.  The two accelerated routes share a receipt journal;  *)
(* every route ends at the execution service, which must win an            *)
(* `agent-start` claim before it runs the turn.  See                       *)
(* docs/lody-streams-rpc/encrypted-rpc.md, "Receipt versus actual start"   *)
(* and "Multi-route delivery".                                             *)
(*                                                                         *)
(* StartClaim = TRUE is the shipped behaviour.  StartClaim = FALSE removes *)
(* the `agent-start` claim, to show what it prevents.                      *)
(***************************************************************************)
EXTENDS Naturals, FiniteSets

CONSTANTS MaxCrashes,   \* bound on daemon crashes
          MaxSends,     \* bound on deliveries per accelerated route
          StartClaim    \* BOOLEAN

ASSUME StartClaim \in BOOLEAN

Accelerated == {"streams", "iroh"}

VARIABLES sends,     \* route -> deliveries of the original so far
          pending,   \* accelerated routes with a delivery not yet processed
          receipt,   \* durable receipt row: "none" or "started"
          ackKept,   \* durable: the ACK frame is retained
          acks,      \* ACK frames sent to the caller
          offers,    \* times the turn was offered to the dispatch watcher
          stash,     \* memory: the watcher holds the offered turn
          docTurn,   \* durable: the turn row has replicated to the machine
          start,     \* durable agent-start row: "none", "started", "settled"
          owner,     \* memory: this process holds the start permit
          seen,      \* memory: sources already started (StartClaim = FALSE)
          runs,      \* times the agent was prompted for this turn
          crashes

vars == <<sends, pending, receipt, ackKept, acks, offers, stash, docTurn,
          start, owner, seen, runs, crashes>>

Init ==
    /\ sends = [r \in Accelerated |-> 0]
    /\ pending = {}
    /\ receipt = "none"
    /\ ackKept = FALSE
    /\ acks = 0
    /\ offers = 0
    /\ stash = FALSE
    /\ docTurn = FALSE
    /\ start = "none"
    /\ owner = FALSE
    /\ seen = {}
    /\ runs = 0
    /\ crashes = 0

(* The sender appends the same original on an accelerated route. *)
Send(r) ==
    /\ sends[r] < MaxSends
    /\ sends' = [sends EXCEPT ![r] = @ + 1]
    /\ pending' = pending \cup {r}
    /\ UNCHANGED <<receipt, ackKept, acks, offers, stash, docTurn, start,
                   owner, seen, runs, crashes>>

(* The durable route: the turn row and its activation replicate. *)
Replicate ==
    /\ ~docTurn
    /\ docTurn' = TRUE
    /\ UNCHANGED <<sends, pending, receipt, ackKept, acks, offers, stash,
                   start, owner, seen, runs, crashes>>

(* First delivery: claim the receipt row, then offer the turn. *)
ReceiveFirst(r) ==
    /\ r \in pending
    /\ receipt = "none"
    /\ receipt' = "started"
    /\ offers' = offers + 1
    /\ stash' = TRUE
    /\ pending' = pending \ {r}
    /\ UNCHANGED <<sends, ackKept, acks, docTurn, start, owner, seen, runs,
                   crashes>>

(* The ACK is sealed, retained and sent after the offer.  The sealed     *)
(* frame is held in memory until it is retained, so this needs the       *)
(* process that made the offer.                                          *)
RetainAck ==
    /\ receipt = "started"
    /\ ~ackKept
    /\ stash
    /\ ackKept' = TRUE
    /\ acks' = acks + 1
    /\ UNCHANGED <<sends, pending, receipt, offers, stash, docTurn, start,
                   owner, seen, runs, crashes>>

(* A repeated delivery replays the retained ACK and offers nothing.  If  *)
(* no ACK was retained, the receiver returns silently.                   *)
ReceiveAgain(r) ==
    /\ r \in pending
    /\ receipt = "started"
    /\ pending' = pending \ {r}
    /\ acks' = IF ackKept THEN acks + 1 ELSE acks
    /\ UNCHANGED <<sends, receipt, ackKept, offers, stash, docTurn, start,
                   owner, seen, runs, crashes>>

(* The execution service claims the start in one transaction. *)
ClaimStart ==
    /\ StartClaim
    /\ stash \/ docTurn
    /\ start = "none"
    /\ start' = "started"
    /\ owner' = TRUE
    /\ UNCHANGED <<sends, pending, receipt, ackKept, acks, offers, stash,
                   docTurn, seen, runs, crashes>>

(* The owner of the permit prompts the agent, once. *)
Run ==
    /\ StartClaim
    /\ owner
    /\ start = "started"
    /\ runs = 0
    /\ runs' = 1
    /\ UNCHANGED <<sends, pending, receipt, ackKept, acks, offers, stash,
                   docTurn, start, owner, seen, crashes>>

Finish ==
    /\ StartClaim
    /\ owner
    /\ runs = 1
    /\ start = "started"
    /\ start' = "settled"
    /\ owner' = FALSE
    /\ UNCHANGED <<sends, pending, receipt, ackKept, acks, offers, stash,
                   docTurn, seen, runs, crashes>>

(* Without the claim, each source that presents the turn starts it. *)
RunUnclaimed(src) ==
    /\ ~StartClaim
    /\ src \notin seen
    /\ \/ src = "stash" /\ stash
       \/ src = "doc" /\ docTurn
    /\ seen' = seen \cup {src}
    /\ runs' = runs + 1
    /\ UNCHANGED <<sends, pending, receipt, ackKept, acks, offers, stash,
                   docTurn, start, owner, crashes>>

(* A crash loses memory.  Both journals and the document survive. *)
Crash ==
    /\ crashes < MaxCrashes
    /\ crashes' = crashes + 1
    /\ stash' = FALSE
    /\ owner' = FALSE
    /\ seen' = {}
    /\ UNCHANGED <<sends, pending, receipt, ackKept, acks, offers, docTurn,
                   start, runs>>

Next ==
    \/ \E r \in Accelerated : Send(r) \/ ReceiveFirst(r) \/ ReceiveAgain(r)
    \/ Replicate
    \/ RetainAck
    \/ ClaimStart
    \/ Run
    \/ Finish
    \/ \E src \in {"stash", "doc"} : RunUnclaimed(src)
    \/ Crash

Spec == Init /\ [][Next]_vars

-----------------------------------------------------------------------------

TypeOK ==
    /\ sends \in [Accelerated -> 0..MaxSends]
    /\ pending \subseteq Accelerated
    /\ receipt \in {"none", "started"}
    /\ start \in {"none", "started", "settled"}
    /\ offers \in Nat
    /\ runs \in Nat
    /\ crashes \in 0..MaxCrashes

(* X1.  The agent is prompted at most once for the turn, whichever       *)
(* routes delivered it and however often.                                *)
RunAtMostOnce == runs <= 1

(* X2.  The turn is offered to the watcher at most once. *)
OfferAtMostOnce == offers <= 1

(* X3.  A settled start row means that the agent was prompted. *)
SettledImpliesRan == (start = "settled") => runs = 1

(* Not guaranteed by the shipped protocol: a start claim with no live    *)
(* owner means that the agent ran.  After a crash between the claim and  *)
(* the prompt, the row reads as uncertain and the turn is not run.       *)
ClaimImpliesRan == (start = "started" /\ ~owner) => runs = 1

(* Not guaranteed by the shipped protocol: every processed delivery on   *)
(* an accelerated route is acknowledged.  A crash between the receipt    *)
(* claim and the retained ACK silences that request identifier.          *)
DeliveryAcknowledged ==
    (receipt = "started" /\ pending = {} /\ ~stash) => ackKept

=============================================================================
