------------------------- MODULE RpcHistoryClaim -------------------------
(***************************************************************************)
(* Admission of one `session/history-write` request.                       *)
(*                                                                         *)
(* The daemon saves a durable claim for the request identifier before it   *)
(* attempts the write.  A replayed request that finds the claim is refused *)
(* with `session_history_write_already_claimed`.  See                      *)
(* docs/lody-streams-rpc/protocol.md, "Duplicates and deduplication" and   *)
(* "Crash windows on the daemon".                                          *)
(*                                                                         *)
(* ClaimFirst = TRUE is the shipped order.  ClaimFirst = FALSE writes      *)
(* first and claims afterwards, to show what the order prevents.           *)
(***************************************************************************)
EXTENDS Naturals

CONSTANTS MaxCrashes,   \* bound on daemon crashes
          ClaimFirst    \* BOOLEAN

ASSUME ClaimFirst \in BOOLEAN

VARIABLES pc,        \* phase of the in-memory request task
          claim,     \* durable: the admission claim exists
          writes,    \* durable: number of times the write was applied
          answers,   \* responses appended to the reply stream
          expired,   \* the request has passed its deadline
          crashes

vars == <<pc, claim, writes, answers, expired, crashes>>

Init ==
    /\ pc = "idle"
    /\ claim = FALSE
    /\ writes = 0
    /\ answers = {}
    /\ expired = FALSE
    /\ crashes = 0

(* The request is read, for the first time or on replay.  A claimed      *)
(* request is refused; otherwise it is authorized and proceeds.          *)
Deliver ==
    /\ pc = "idle"
    /\ ~expired
    /\ IF claim
       THEN /\ answers' = answers \cup {"already_claimed"}
            /\ pc' = pc
       ELSE /\ pc' = "authorized"
            /\ answers' = answers
    /\ UNCHANGED <<claim, writes, expired, crashes>>

SaveClaim ==
    /\ pc = IF ClaimFirst THEN "authorized" ELSE "written"
    /\ claim' = TRUE
    /\ pc' = IF ClaimFirst THEN "claimed" ELSE "ready"
    /\ UNCHANGED <<writes, answers, expired, crashes>>

Write ==
    /\ pc = IF ClaimFirst THEN "claimed" ELSE "authorized"
    /\ writes' = writes + 1
    /\ pc' = IF ClaimFirst THEN "ready" ELSE "written"
    /\ UNCHANGED <<claim, answers, expired, crashes>>

Respond ==
    /\ pc = "ready"
    /\ answers' = answers \cup {"accepted"}
    /\ pc' = "idle"
    /\ UNCHANGED <<claim, writes, expired, crashes>>

Expire ==
    /\ ~expired
    /\ expired' = TRUE
    /\ UNCHANGED <<pc, claim, writes, answers, crashes>>

(* A crash discards the task.  The claim and the history survive. *)
Crash ==
    /\ crashes < MaxCrashes
    /\ crashes' = crashes + 1
    /\ pc' = "idle"
    /\ UNCHANGED <<claim, writes, answers, expired>>

Next == Deliver \/ SaveClaim \/ Write \/ Respond \/ Expire \/ Crash

Spec == Init /\ [][Next]_vars

-----------------------------------------------------------------------------

TypeOK ==
    /\ pc \in {"idle", "authorized", "claimed", "written", "ready"}
    /\ claim \in BOOLEAN
    /\ writes \in 0..(MaxCrashes + 1)
    /\ answers \subseteq {"accepted", "already_claimed"}
    /\ expired \in BOOLEAN
    /\ crashes \in 0..MaxCrashes

(* H1.  A history write is applied at most once per request identifier. *)
WriteAtMostOnce == writes <= 1

(* H2.  An accepted response is sent only after the write was applied.  *)
AcceptedImpliesWritten == ("accepted" \in answers) => writes >= 1

(* Not guaranteed by the shipped protocol: a claim at rest means that   *)
(* the write happened.  A crash between the claim and the write leaves  *)
(* the write undone and the identifier refused.                         *)
ClaimImpliesWritten == (pc = "idle" /\ claim) => writes = 1

=============================================================================
