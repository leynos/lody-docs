# References

Citations of the form `[n]` in this documentation resolve to the entries
below. Each entry says what it is cited for.

The **Link check** column records how each link was verified on
14 November 2026:

- **Resolved**: the URL was fetched and returned the document.
- **Metadata**: the DOI's registered metadata (authors, title, venue) was
  confirmed, and the DOI redirects to the publisher, but the publisher
  refused an automated fetch. The link opens in a browser.
- **Unverified**: stated in the entry.

## Replicated data types and consistency

| # | Reference | Cited for | Link check |
| - | --------- | --------- | ---------- |
| <a id="ref-1"></a>1 | M. Shapiro, N. Preguiça, C. Baquero and M. Zawirski. "Conflict-Free Replicated Data Types." _SSS 2011_, LNCS 6976, pp. 386–400. [doi:10.1007/978-3-642-24550-3_29](https://doi.org/10.1007/978-3-642-24550-3_29) | Strong eventual consistency; the convergence condition for state-based CRDTs | Resolved |
| <a id="ref-2"></a>2 | M. Shapiro, N. Preguiça, C. Baquero and M. Zawirski. "A comprehensive study of Convergent and Commutative Replicated Data Types." INRIA Research Report RR-7506, 2011. [hal:inria-00555588](https://inria.hal.science/inria-00555588) | Definitions of the LWW-register and LWW-element-set | Resolved |
| <a id="ref-10"></a>10 | P. S. Almeida, A. Shoker and C. Baquero. "Delta state replicated data types." _Journal of Parallel and Distributed Computing_ 111, pp. 162–173, 2018. [doi:10.1016/j.jpdc.2017.08.003](https://doi.org/10.1016/j.jpdc.2017.08.003); [arXiv:1603.01529](https://arxiv.org/abs/1603.01529) | Delta exchange and the causal-closure condition it needs | Resolved |
| <a id="ref-11"></a>11 | V. B. F. Gomes, M. Kleppmann, D. P. Mulligan and A. R. Beresford. "Verifying strong eventual consistency in distributed systems." _PACMPL_ 1 (OOPSLA), article 109, 2017. [doi:10.1145/3133933](https://doi.org/10.1145/3133933); [arXiv:1707.01747](https://arxiv.org/abs/1707.01747) | Mechanized, unbounded convergence proofs for CRDTs | Resolved (arXiv) |
| <a id="ref-12"></a>12 | S. Burckhardt, A. Gotsman, H. Yang and M. Zawirski. "Replicated data types: specification, verification, optimality." _POPL 2014_, pp. 271–284. [doi:10.1145/2535838.2535848](https://doi.org/10.1145/2535838.2535848) | A specification framework for replicated data types, including the LWW register | Metadata |
| <a id="ref-34"></a>34 | S. Burckhardt. "Principles of Eventual Consistency." _Foundations and Trends in Programming Languages_ 1(1–2), pp. 1–150, 2014. [doi:10.1561/2500000011](https://doi.org/10.1561/2500000011); [author's page](https://www.microsoft.com/en-us/research/publication/principles-of-eventual-consistency/) | Background on consistency models | Resolved (author's page) |
| <a id="ref-7"></a>7 | M. Kleppmann, A. Wiggins, P. van Hardenberg and M. McGranaghan. "Local-first software: you own your data, in spite of the cloud." _Onward! 2019_, pp. 154–178. [doi:10.1145/3359591.3359737](https://doi.org/10.1145/3359591.3359737); [essay](https://www.inkandswitch.com/essay/local-first/) | The local-first ideals that write-while-offline serves | Resolved (essay) |

_Table 1: References on replicated data types and consistency._

## Clocks and versions

| # | Reference | Cited for | Link check |
| - | --------- | --------- | ---------- |
| <a id="ref-3"></a>3 | L. Lamport. "Time, Clocks, and the Ordering of Events in a Distributed System." _Communications of the ACM_ 21(7), pp. 558–565, 1978. [doi:10.1145/359545.359563](https://doi.org/10.1145/359545.359563); [PDF](https://lamport.azurewebsites.net/pubs/time-clocks.pdf) | Logical clocks; a total order by clock then process identifier | Resolved (PDF) |
| <a id="ref-4"></a>4 | S. S. Kulkarni, M. Demirbas, D. Madappa, B. Avva and M. Leone. "Logical Physical Clocks." _OPODIS 2014_, LNCS 8878, pp. 17–32. [doi:10.1007/978-3-319-14472-6_2](https://doi.org/10.1007/978-3-319-14472-6_2); [technical report](https://cse.buffalo.edu/tech-reports/2014-04.pdf) | Hybrid logical clocks: close to physical time, monotonic per node | Resolved |
| <a id="ref-5"></a>5 | D. S. Parker et al. "Detection of Mutual Inconsistency in Distributed Systems." _IEEE Transactions on Software Engineering_ SE-9(3), pp. 240–247, 1983. [doi:10.1109/TSE.1983.236733](https://doi.org/10.1109/TSE.1983.236733) | Version vectors | Metadata |
| <a id="ref-29"></a>29 | C. Baquero and N. Preguiça. "Why logical clocks are easy." _Communications of the ACM_ 59(4), pp. 43–47, 2016. [doi:10.1145/2890782](https://doi.org/10.1145/2890782) | An accessible account of causality and version vectors | Metadata |
| <a id="ref-9"></a>9 | K. Kingsbury. "The trouble with timestamps." 2013. [aphyr.com/posts/299](https://aphyr.com/posts/299-the-trouble-with-timestamps) | The hazards of wall-clock last-writer-wins under clock skew | Resolved |

_Table 2: References on clocks and versions._

## Replication, logs and anti-entropy

| # | Reference | Cited for | Link check |
| - | --------- | --------- | ---------- |
| <a id="ref-6"></a>6 | A. Demers et al. "Epidemic Algorithms for Replicated Database Maintenance." _PODC 1987_, pp. 1–12. [doi:10.1145/41840.41841](https://doi.org/10.1145/41840.41841) | Anti-entropy; death certificates (tombstones) | Metadata |
| <a id="ref-8"></a>8 | G. DeCandia et al. "Dynamo: Amazon's Highly Available Key-value Store." _SOSP 2007_, pp. 205–220. [doi:10.1145/1294261.1294281](https://doi.org/10.1145/1294261.1294281); [PDF](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf) | Timestamp reconciliation and its trade-offs in a production store | Resolved (PDF) |
| <a id="ref-18"></a>18 | J. Kreps. "The Log: What every software engineer should know about real-time data's unifying abstraction." LinkedIn Engineering, 2013. [linkedin.com/blog](https://www.linkedin.com/blog/engineering/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying) | The append-only log as a replication primitive | Resolved |
| <a id="ref-19"></a>19 | D. B. Terry et al. "Managing update conflicts in Bayou, a weakly connected replicated storage system." _SOSP 1995_, pp. 172–182. [doi:10.1145/224056.224070](https://doi.org/10.1145/224056.224070) | Anti-entropy sessions against a write log | Metadata |
| <a id="ref-32"></a>32 | D. B. Terry et al. "Session guarantees for weakly consistent replicated data." _PDIS 1994_, pp. 140–149. [doi:10.1109/PDIS.1994.331722](https://doi.org/10.1109/PDIS.1994.331722) | Read-your-writes and monotonic reads, as background to cursor semantics | Metadata |

_Table 3: References on replication, logs, and anti-entropy._

## Durability, delivery and retries

| # | Reference | Cited for | Link check |
| - | --------- | --------- | ---------- |
| <a id="ref-16"></a>16 | C. Mohan et al. "ARIES: a transaction recovery method supporting fine-granularity locking and partial rollbacks using write-ahead logging." _ACM Transactions on Database Systems_ 17(1), pp. 94–162, 1992. [doi:10.1145/128765.128770](https://doi.org/10.1145/128765.128770) | The write-ahead rule that "data before cursor" instantiates | Metadata |
| <a id="ref-17"></a>17 | Apache Kafka documentation. "Message Delivery Semantics." [kafka.apache.org/documentation](https://kafka.apache.org/documentation/#design_deliverysemantics) | Persist before committing the offset gives at-least-once delivery | Resolved |
| <a id="ref-13"></a>13 | P. Helland. "Life beyond Distributed Transactions: an Apostate's Opinion." _CIDR 2007_. [PDF](https://www.cidrdb.org/cidr2007/papers/cidr07p15.pdf) | At-least-once messaging between independently durable entities | Resolved |
| <a id="ref-14"></a>14 | P. Helland. "Idempotence Is Not a Medical Condition." _ACM Queue_ 10(4), pp. 30–46, 2012. [doi:10.1145/2181796.2187821](https://doi.org/10.1145/2181796.2187821) | At-least-once delivery requires idempotent receivers | Metadata |
| <a id="ref-21"></a>21 | M. Brooker. "Exponential Backoff And Jitter." AWS Architecture Blog, 2015. [aws.amazon.com/blogs/architecture](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) | Why retries use jittered exponential backoff | Resolved |
| <a id="ref-30"></a>30 | SQLite documentation. "Write-Ahead Logging" and "PRAGMA synchronous". [sqlite.org/wal.html](https://www.sqlite.org/wal.html); [sqlite.org/pragma.html](https://www.sqlite.org/pragma.html#pragma_synchronous) | Durability of WAL commits, which the SQLite checkpoint ordering relies on | Resolved |
| <a id="ref-31"></a>31 | MDN. "IDBTransaction: durability property." [developer.mozilla.org](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/durability); W3C, "Indexed Database API 3.0", [transaction durability hint](https://www.w3.org/TR/IndexedDB-3/#transaction-durability-hint) | The `"strict"` durability hint used for renderer checkpoints | Resolved |

_Table 4: References on durability, delivery, and retries._

## Reconciliation

| # | Reference | Cited for | Link check |
| - | --------- | --------- | ---------- |
| <a id="ref-15"></a>15 | J. Bowes. "Level Triggering and Reconciliation in Kubernetes." 2017. [hackernoon.com](https://hackernoon.com/level-triggering-and-reconciliation-in-kubernetes-1f17fe30333d); Kubernetes documentation, "Controllers", [kubernetes.io](https://kubernetes.io/docs/concepts/architecture/controller/) | Level-triggered versus edge-triggered control: rescans survive missed events | Resolved |
| <a id="ref-28"></a>28 | B. Burns, B. Grant, D. Oppenheimer, E. Brewer and J. Wilkes. "Borg, Omega, and Kubernetes." _ACM Queue_ 14(1), pp. 70–93, 2016. [doi:10.1145/2898442.2898444](https://doi.org/10.1145/2898442.2898444) | Reconciliation controllers driven by observed state | Metadata |

_Table 5: References on reconciliation._

## Formal methods

| # | Reference | Cited for | Link check |
| - | --------- | --------- | ---------- |
| <a id="ref-22"></a>22 | L. Lamport. _Specifying Systems: The TLA+ Language and Tools for Hardware and Software Engineers._ Addison-Wesley, 2002. [Book page](https://lamport.azurewebsites.net/tla/book.html) | The TLA+ language | Resolved |
| <a id="ref-23"></a>23 | L. Lamport. "The temporal logic of actions." _ACM Transactions on Programming Languages and Systems_ 16(3), pp. 872–923, 1994. [doi:10.1145/177492.177726](https://doi.org/10.1145/177492.177726); [PDF](https://lamport.azurewebsites.net/pubs/lamport-actions.pdf) | Stuttering, weak and strong fairness | Resolved (PDF) |
| <a id="ref-24"></a>24 | Y. Yu, P. Manolios and L. Lamport. "Model Checking TLA+ Specifications." _CHARME 1999_, LNCS 1703, pp. 54–66. [doi:10.1007/3-540-48153-2_6](https://doi.org/10.1007/3-540-48153-2_6) | The TLC model checker | Resolved |
| <a id="ref-25"></a>25 | C. Newcombe, T. Rath, F. Zhang, B. Munteanu, M. Brooker and M. Deardeuff. "How Amazon Web Services uses formal methods." _Communications of the ACM_ 58(4), pp. 66–73, 2015. [doi:10.1145/2699417](https://doi.org/10.1145/2699417) | Why model checking a design finds bugs that testing misses | Metadata |
| <a id="ref-26"></a>26 | "Specifying and verifying CRDT protocols using TLA+." _Journal of Software_, 2020 (in Chinese). Repository: [JYwellin/CRDT-TLA](https://github.com/JYwellin/CRDT-TLA) | Prior TLA+ specifications of CRDT protocols | Repository resolved; authorship and volume unverified |
| <a id="ref-27"></a>27 | The TLA+ examples repository. [tlaplus/Examples](https://github.com/tlaplus/Examples) | Prior specifications, including hybrid logical clocks | Resolved |

_Table 6: References on formal methods._

## Upstream software

| # | Reference | Cited for | Link check |
| - | --------- | --------- | ---------- |
| <a id="ref-20"></a>20 | Z. Chen. "CRDT is not enough." Loro blog, 21 September 2026. [loro.dev/blog/crdt-is-not-enough](https://loro.dev/blog/crdt-is-not-enough); Loro Streams, [streams.loro.dev](https://streams.loro.dev) | The stream model; the statement that Flock will be open-sourced later | Resolved |
| <a id="ref-33"></a>33 | npm packages [`@loro-dev/flock-wasm` 0.5.0](https://www.npmjs.com/package/@loro-dev/flock-wasm/v/0.5.0), [`loro-repo` 0.25.0](https://www.npmjs.com/package/loro-repo/v/0.25.0) and [`@loro-dev/streams-crdt` 0.20.0](https://www.npmjs.com/package/@loro-dev/streams-crdt/v/0.20.0). Loro documentation: [loro.dev/docs](https://loro.dev/docs) | Every statement about upstream behaviour; see the [evidence index](evidence.md#upstream-packages) | Registry metadata resolved; the source repositories named by the packages returned 404 |
| <a id="ref-35"></a>35 | TLA+ tools, release 1.7.4. [github.com/tlaplus/tlaplus/releases](https://github.com/tlaplus/tlaplus/releases/tag/v1.7.4) | TLC 2.19, used for every result here | Resolved |
| <a id="ref-36"></a>36 | Lody. [github.com/LodyAI/Lody](https://github.com/LodyAI/Lody), commit `61bd9701a5ed6899a9f42787df682acfc3fd7d4b` | The system documented | Local clone read; the public URL was not fetched |

_Table 7: References to upstream software._
