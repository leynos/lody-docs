------------------------------ MODULE FlockLWW ------------------------------
(***************************************************************************)
(* Shared definitions for the Lody Flock protocol models.                  *)
(*                                                                         *)
(* A Flock is a last-writer-wins (LWW) replicated key-value map.  Each key *)
(* holds at most one entry; an entry carries a clock and a value, and a    *)
(* delete is an ordinary clocked entry (a tombstone) rather than an        *)
(* absence.  Two entries for one key are ordered by                        *)
(*                                                                         *)
(*     1. higher physicalTime, then                                        *)
(*     2. higher logicalCounter, then                                      *)
(*     3. lexicographically greater peerId                                 *)
(*                                                                         *)
(* (flock-wasm 0.5.0 README, "Conflict resolution").  This module folds    *)
(* (physicalTime, logicalCounter) into one natural `t` and represents the  *)
(* peer id by a natural rank `p`, which preserves the total order.         *)
(*                                                                         *)
(* Values are records [s, a] so that TLC never has to compare values of    *)
(* different shapes: `s` is a tag and `a` a small natural payload.         *)
(***************************************************************************)
EXTENDS Naturals

CONSTANT Keys

None == [s |-> "none", a |-> 0]   \* key never written
Tomb == [s |-> "tomb", a |-> 0]   \* key deleted (tombstone)

NoEntry == [t |-> 0, p |-> 0, v |-> None]

Entry(t, p, v) == [t |-> t, p |-> p, v |-> v]

(* The LWW order.  Strict; total on entries with distinct (t, p).          *)
Newer(a, b) == a.t > b.t \/ (a.t = b.t /\ a.p > b.p)

(* Join of two entries for one key: commutative, associative, idempotent,  *)
(* provided equal clocks imply equal entries (each peer's clock for a key  *)
(* strictly increases, which every writer in these models respects).       *)
Join(a, b) == IF Newer(b, a) THEN b ELSE a

(* A replica state (or a delta) is a function from Keys to entries.        *)
EmptyState == [k \in Keys |-> NoEntry]

Merge(m1, m2) == [k \in Keys |-> Join(m1[k], m2[k])]

(* What `get`/`scan` consumers treat as a present row.                     *)
Visible(m, k) == m[k].v.s \notin {"none", "tomb"}

=============================================================================
