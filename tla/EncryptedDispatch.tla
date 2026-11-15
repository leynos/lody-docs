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
(* StartClaim = TRUE is the shipped behaviour; FALSE removes the           *)
(* `agent-start` claim.  ReceiptClaim = TRUE is the shipped behaviour;     *)
(* FALSE lets every delivery claim and offer as if it were the first.      *)
(* Both ablations use the same Prompt and Offer actions as the shipped     *)
(* model, so a difference in outcome is due to the claim alone.            *)
(***************************************************************************)
EXTENDS Naturals, FiniteSets

CONSTANTS MaxCrashes,   \* bound on daemon crashes
          MaxSends,     \* bound on deliveries per accelerated route
          StartClaim,   \* BOOLEAN
          ReceiptClaim  \* BOOLEAN

ASSUME StartClaim \in BOOLEAN /\ ReceiptClaim \in BOOLEAN

Accelerated == {"streams", "iroh"}
Sources == {"stash", "doc"}

VARIABLES sends,       \* route -> deliveries of the original so far
          pending,     \* accelerated routes with a delivery not yet processed
          receipt,     \* durable receipt row: "none" or "started"
          claimedHere, \* memory: this process claimed the receipt, offer pending
          ackKept,     \* durable: the ACK frame is retained
          acks,        \* ACK frames sent to the caller
          offers,      \* times the turn was offered to the dispatch watcher
          stash,       \* memory: the watcher holds the offered turn
          docTurn,     \* durable: the turn row has replicated to the machine
          start,       \* durable agent-start row: "none", "started", "settled"
          permit,      \* memory: an unused start permit held by this process
          ranHere,     \* memory: this process prompted under the current row
          seen,        \* memory: sources this process has already prompted
          runs,        \* times the agent was prompted for this turn
          crashes

vars == <<sends, pending, receipt, claimedHere, ackKept, acks, offers, stash,
          docTurn, start, permit, ranHere, seen, runs, crashes>>

Init ==
    /\ sends = [r \in Accelerated |-> 0]
    /\ pending = {}
    /\ receipt = "none"
    /\ claimedHere = FALSE
    /\ ackKept = FALSE
    /\ acks = 0
    /\ offers = 0
    /\ stash = FALSE
    /\ docTurn = FALSE
    /\ start = "none"
    /\ permit = FALSE
    /\ ranHere = FALSE
    /\ seen = {}
    /\ runs = 0
    /\ crashes = 0

(* The sender appends the same original on an accelerated route. *)
Send(r) ==
    /\ sends[r] < MaxSends
    /\ sends' = [sends EXCEPT ![r] = @ + 1]
    /\ pending' = pending \cup {r}
    /\ UNCHANGED <<receipt, claimedHere, ackKept, acks, offers, stash, docTurn,
                   start, permit, ranHere, seen, runs, crashes>>

(* The durable route: the turn row and its activation replicate. *)
Replicate ==
    /\ ~docTurn
    /\ docTurn' = TRUE
    /\ UNCHANGED <<sends, pending, receipt, claimedHere, ackKept, acks, offers,
                   stash, start, permit, ranHere, seen, runs, crashes>>

(* A delivery claims the receipt row (received -> started).  The offer is *)
(* a separate, later step: the receiver awaits it after the claim.        *)
ClaimReceipt(r) ==
    /\ r \in pending
    /\ ~claimedHere
    /\ (receipt = "none" \/ ~ReceiptClaim)
    /\ receipt' = "started"
    /\ claimedHere' = TRUE
    /\ pending' = pending \ {r}
    /\ UNCHANGED <<sends, ackKept, acks, offers, stash, docTurn, start, permit,
                   ranHere, seen, runs, crashes>>

(* The claiming process offers the turn to the dispatch watcher. *)
Offer ==
    /\ claimedHere
    /\ claimedHere' = FALSE
    /\ offers' = offers + 1
    /\ stash' = TRUE
    /\ UNCHANGED <<sends, pending, receipt, ackKept, acks, docTurn, start,
                   permit, ranHere, seen, runs, crashes>>

(* The ACK is sealed, retained and sent after the offer.  The sealed     *)
(* frame is held in memory until it is retained, so this needs the       *)
(* process that made the offer.                                          *)
RetainAck ==
    /\ receipt = "started"
    /\ ~ackKept
    /\ stash
    /\ ackKept' = TRUE
    /\ acks' = acks + 1
    /\ UNCHANGED <<sends, pending, receipt, claimedHere, offers, stash, docTurn,
                   start, permit, ranHere, seen, runs, crashes>>

(* A repeated delivery replays the retained ACK and offers nothing.  If  *)
(* no ACK was retained, the receiver returns silently.                   *)
ReceiveAgain(r) ==
    /\ ReceiptClaim
    /\ r \in pending
    /\ receipt = "started"
    /\ pending' = pending \ {r}
    /\ acks' = IF ackKept THEN acks + 1 ELSE acks
    /\ UNCHANGED <<sends, receipt, claimedHere, ackKept, offers, stash,
                   docTurn, start, permit, ranHere, seen, runs, crashes>>

Presented(src) == (src = "stash" /\ stash) \/ (src = "doc" /\ docTurn)

(* The execution service claims the start in one transaction and holds   *)
(* the resulting permit.                                                 *)
ClaimStart ==
    /\ StartClaim
    /\ \E src \in Sources : Presented(src)
    /\ start = "none"
    /\ start' = "started"
    /\ permit' = TRUE
    /\ UNCHANGED <<sends, pending, receipt, claimedHere, ackKept, acks, offers,
                   stash, docTurn, ranHere, seen, runs, crashes>>

(* The agent is prompted for a presented turn.  With the claim, a prompt *)
(* consumes the permit.  Without it, each source that presents the turn  *)
(* to this process is prompted once.  Every prompt increments `runs`.    *)
Prompt(src) ==
    /\ Presented(src)
    /\ src \notin seen
    /\ IF StartClaim THEN permit ELSE TRUE
    /\ permit' = FALSE
    /\ ranHere' = TRUE
    /\ seen' = seen \cup {src}
    /\ runs' = runs + 1
    /\ UNCHANGED <<sends, pending, receipt, claimedHere, ackKept, acks, offers,
                   stash, docTurn, start, crashes>>

(* After the turn, the owner finishes the start row as settled. *)
Finish ==
    /\ StartClaim
    /\ ranHere
    /\ start = "started"
    /\ start' = "settled"
    /\ ranHere' = FALSE
    /\ UNCHANGED <<sends, pending, receipt, claimedHere, ackKept, acks, offers,
                   stash, docTurn, permit, seen, runs, crashes>>

(* A crash loses memory.  Both journals and the document survive. *)
Crash ==
    /\ crashes < MaxCrashes
    /\ crashes' = crashes + 1
    /\ claimedHere' = FALSE
    /\ stash' = FALSE
    /\ permit' = FALSE
    /\ ranHere' = FALSE
    /\ seen' = {}
    /\ UNCHANGED <<sends, pending, receipt, ackKept, acks, offers, docTurn,
                   start, runs>>

Next ==
    \/ \E r \in Accelerated : Send(r) \/ ClaimReceipt(r) \/ ReceiveAgain(r)
    \/ Replicate
    \/ Offer
    \/ RetainAck
    \/ ClaimStart
    \/ \E src \in Sources : Prompt(src)
    \/ Finish
    \/ Crash

Spec == Init /\ [][Next]_vars

-----------------------------------------------------------------------------

TypeOK ==
    /\ sends \in [Accelerated -> 0..MaxSends]
    /\ pending \subseteq Accelerated
    /\ receipt \in {"none", "started"}
    /\ start \in {"none", "started", "settled"}
    /\ seen \subseteq Sources
    /\ offers \in Nat
    /\ runs \in Nat
    /\ crashes \in 0..MaxCrashes

(* X1.  The agent is prompted at most once for the turn, whichever       *)
(* routes delivered it and however often.                                *)
RunAtMostOnce == runs <= 1

(* X2.  The turn is offered to the watcher at most once. *)
OfferAtMostOnce == offers <= 1

(* X3.  A settled start row means that the agent was prompted. *)
SettledImpliesRan == (start = "settled") => runs >= 1

(* Not guaranteed by the shipped protocol: a start claim with no live    *)
(* owner means that the agent ran.  After a crash between the claim and  *)
(* the prompt, the row reads as uncertain and the turn is not run.       *)
ClaimImpliesRan == (start = "started" /\ ~permit /\ ~ranHere) => runs >= 1

(* Not guaranteed by the shipped protocol: every claimed receipt leads   *)
(* to an offer.  A crash between the receipt claim and the offer leaves  *)
(* the receipt started and never offered; the durable route remains.     *)
ReceiptImpliesOffer == (receipt = "started" /\ ~claimedHere) => offers >= 1

(* Not guaranteed by the shipped protocol: every processed delivery on   *)
(* an accelerated route is acknowledged.  A crash between the receipt    *)
(* claim and the retained ACK silences that request identifier.          *)
DeliveryAcknowledged ==
    (receipt = "started" /\ pending = {} /\ ~stash /\ ~claimedHere) => ackKept

(* Reachability witnesses.  Each must be violated: it shows that the     *)
(* states that X1, X2 and X3 constrain are reachable.                    *)
NeverPrompted == runs = 0
NeverOffered == offers = 0
NeverSettled == start # "settled"

=============================================================================
