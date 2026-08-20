import type { Module } from '../types'

const m: Module = {
  id: 'sysdesign-l1-consensus-coordination',
  subjectId: 'sysdesign',
  level: 1,
  title: 'Consensus, Leader Election & Failure Detection',
  whyItMatters:
    'Every design answer eventually says "and then a follower gets promoted" or "we take a distributed lock". Both sentences hide the hardest problem in distributed systems: getting several machines to agree on ONE value while nodes crash and messages vanish. This module gives you Raft at the level interviews actually test, the majority-quorum argument you can prove on a whiteboard, fencing tokens for the split-brain follow-up, and the honest answer to "is your Redis lock safe?".',
  estMinutes: 50,
  sections: [
    {
      type: 'intuition',
      title: 'Why anything needs to agree',
      md: `Five friends must pick ONE restaurant. Everyone is texting on a flaky network, two phones are on 2%, and messages arrive late or not at all. The hard part is not picking well. The hard part is making sure nobody walks into a different restaurant believing everyone agreed.

- **Consensus** = several nodes agree on one value, despite crashes and lost or delayed messages, and never *un*-agree later.
- The values that matter in real systems are small and deadly: *who is the leader*, *is this lock held*, *what is entry #12 in the log*.
- Two nodes each believing "I am the leader" is not a slow system. It is a **corrupt** system — two writers, two truths.
- **Two Generals**, one line: two armies must attack together, every messenger can be captured, and no finite exchange of messages ever makes both sides certain. Perfect agreement over an unreliable channel is impossible.
- So consensus protocols do not chase certainty. They buy a weaker, sufficient promise: **at most one decision, ever** — even if reaching it takes another round.`,
    },
    {
      type: 'note',
      md: `**FLP, honestly.** Fischer, Lynch and Paterson (1985) proved that in a *fully asynchronous* system — no upper bound on message delay or processing time — **no deterministic protocol can guarantee consensus if even one node may crash**. The reason is the thing you cannot engineer away: a crashed node and a very slow node look identical from the outside, so no algorithm can safely decide "it is gone, proceed without it". Real systems escape by assuming *partial synchrony*: they add **timeouts**, i.e. they bet that a node silent for 300 ms is dead. The bet can be wrong, so what they give up is guaranteed *termination* (an election can, in theory, keep retrying forever) in order to keep **safety** (never two leaders in the same term). Raft and Paxos are always safe and, on any real network, terminate in milliseconds. That tradeoff — always correct, usually fast — is the shape of every practical answer here.`,
    },
    {
      type: 'intuition',
      title: 'Raft: three states and a logical clock',
      md: `Raft was designed to be *understandable*, and it mostly is. Every node is in exactly one of three states.

- **Follower** — the default. Passive: it answers requests and resets a timer whenever the leader speaks.
- **Candidate** — it stopped hearing the leader and is now campaigning for votes.
- **Leader** — the only node that accepts client writes. It sends heartbeats so followers stay followers.
- **Term** — an integer that only ever increases, incremented on every election attempt. It is a **logical clock**: it counts elections, not seconds, so nothing depends on wall clocks agreeing.
- The one rule that kills most stale-leader bugs: *every* message carries a term, and **a node that sees a higher term immediately steps down to follower and adopts it**. An old leader waking from a pause is demoted by the first packet it reads.
- Guarantee to memorize: **at most one leader per term**. Zero leaders in a term is allowed (a failed election); two is never.`,
    },
    {
      type: 'intuition',
      title: 'The election, step by step',
      md: `- Each follower runs an **election timeout** — typically 150–300 ms of silence. Every heartbeat (an empty AppendEntries) resets it.
- Timeout fires → the follower becomes a **candidate**: it increments the term, votes for itself, and sends RequestVote to everyone.
- Voting rules, both essential: a node votes **at most once per term** (first come, first served), and only for a candidate whose **log is at least as up to date as its own**. The second rule is what stops a node with missing entries from ever winning.
- A **majority** of votes → leader. It starts heartbeating immediately, which stops everyone else\'s timers.
- **Split vote**: two candidates fire at once in the same term, votes divide, nobody reaches a majority. Nothing breaks — the term simply produces no leader and everyone waits again.
- The fix is embarrassingly simple: **randomize each node\'s timeout** inside the range. One node almost always fires clearly first, so repeated split votes become vanishingly unlikely.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Raft: an election, a commit, and a split-brain that resolves itself',
        notice: 'Three-node cluster A, B, C. Watch the term number and, in the last frames, who is allowed to COMMIT.',
        leftLabel: 'timers / messages',
        rightLabel: 'cluster nodes',
        frames: [
          {
            note: 'Term 5. The leader has crashed, so heartbeats stopped and all three nodes are followers with election timers running. The timeouts are RANDOMIZED — A drew 160 ms, B 240 ms, C 290 ms — which is the whole defence against split votes.',
            stack: [{ name: 'election timers', value: 'A 160ms · B 240ms · C 290ms' }],
            heap: [
              { id: 'A', value: 'follower · term 5 · log …11', label: 'timer expires first' },
              { id: 'B', value: 'follower · term 5 · log …11' },
              { id: 'C', value: 'follower · term 5 · log …11' },
            ],
          },
          {
            note: 'A\'s timer fires. It becomes a CANDIDATE: term 5 → 6, votes for itself, and sends RequestVote(term 6, lastLogIndex 11) to B and C. One self-vote is not a majority — it must convince someone.',
            stack: [
              { name: 'RequestVote(term 6)', to: 'B' },
              { name: 'RequestVote(term 6)', to: 'C' },
            ],
            heap: [
              { id: 'A', value: 'CANDIDATE · term 6 · votes: 1 (self)', label: 'campaigning' },
              { id: 'B', value: 'follower · term 5 → 6' },
              { id: 'C', value: 'follower · term 5 → 6' },
            ],
          },
          {
            note: 'B and C both grant: term 6 is newer than theirs, they have not voted in term 6 yet, and A\'s log is at least as up to date as their own. A now has 3 of 3 — but 2 of 3 was already a MAJORITY, so it became leader the moment B answered.',
            stack: [
              { name: 'voteGranted', to: 'A' },
              { name: 'voteGranted', to: 'A' },
            ],
            heap: [
              { id: 'A', value: 'LEADER · term 6 · votes: 3/3', label: 'majority reached at 2/3' },
              { id: 'B', value: 'follower · term 6 · votedFor A' },
              { id: 'C', value: 'follower · term 6 · votedFor A' },
            ],
          },
          {
            note: 'A client writes x=7. The leader appends it at index 12 as UNCOMMITTED and replicates. B persists and acks: leader + B = 2 of 3 = a majority, so entry 12 is now COMMITTED and only now is the client told "ok". C is still catching up — and that is fine, commit never waits for everyone.',
            stack: [{ name: 'client: set x=7', to: 'A' }],
            heap: [
              { id: 'A', value: 'LEADER · log …11, [12: x=7] COMMITTED', label: 'majority acked' },
              { id: 'B', value: 'follower · log …11, [12: x=7]', label: 'the ack that committed it' },
              { id: 'C', value: 'follower · log …11', label: 'lagging — harmless' },
            ],
          },
          {
            note: 'DANGER: the network partitions A away from B and C. A has not crashed and still BELIEVES it is leader of term 6 — nothing has told it otherwise. B times out, runs an election in term 7 and gets C\'s vote: 2 of 3, a majority. Two nodes now call themselves leader. This is split-brain.',
            stack: [
              { name: 'client: set x=9', to: 'A', danger: true },
              { name: 'RequestVote(term 7)', to: 'C' },
            ],
            heap: [
              { id: 'A', value: 'thinks LEADER · term 6 · [13: x=9] stuck uncommitted', label: 'minority of 1 — cannot commit', danger: true },
              { id: 'B', value: 'LEADER · term 7 · 2/3 votes', label: 'real leader — has the majority' },
              { id: 'C', value: 'follower · term 7 · votedFor B' },
            ],
          },
          {
            note: 'The majority rule resolves it without anyone arbitrating. A can append locally but can never reach 2 acks, so x=9 is NEVER committed and the client never gets an ok. When the partition heals, A sees term 7 > 6, steps down to follower, and its uncommitted tail is overwritten by the leader\'s log. Safety held: no committed value was ever contradicted.',
            stack: [{ name: 'AppendEntries(term 7)', to: 'A' }],
            heap: [
              { id: 'A', value: 'follower · term 7 · [13] discarded', label: 'stepped down on higher term' },
              { id: 'B', value: 'LEADER · term 7 · log …12', label: 'kept every committed entry' },
              { id: 'C', value: 'follower · term 7 · log …12' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Log replication: what "committed" actually means',
      md: `The leader does not just decide who is boss. It decides the **order of everything**, and the log is that order.

- A client write becomes an entry appended to the leader\'s log — **uncommitted**, and the client is told nothing yet.
- The leader ships it with AppendEntries, which carries the *previous* index and term. A follower whose log does not match there rejects the message, and the leader rewinds until they agree. **The leader\'s log is the truth**; divergent follower tails get overwritten.
- Once a **majority** has persisted the entry, the leader marks it **committed**, applies it to the state machine, and only then acks the client.
- "Committed" is a promise with teeth: this entry survives any future leader change. That is exactly what the majority bought.
- Waiting for a majority, not for everyone, is also a latency decision: one slow follower cannot stall writes, but your write latency is the **median** replica\'s round trip, not the fastest.`,
    },
    {
      type: 'intuition',
      title: 'Why a MAJORITY — the one argument to know',
      md: `Take any two majorities of the same 5 nodes: 3 + 3 = 6 > 5, so they must share at least one node. That is the entire trick.

- Committing needs a majority. Winning an election needs a majority. **Those two sets always overlap in at least one node.**
- That shared node saw the old leader\'s committed entry. By the voting rule it refuses to vote for any candidate whose log is behind it — so the winner is guaranteed to already have every committed entry.
- No hand-off, no state transfer, no coordinator: the new leader **cannot** be missing committed data. The arithmetic enforces it.
- Price of the guarantee: you need more than half the nodes alive and reachable. A minority partition is **unavailable by design** — this is the CP corner of CAP, chosen deliberately.
- And "majority" means majority of *configured* nodes, not of surviving ones. Two nodes out of five cannot lower the bar for themselves; that is the point.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Quorum arithmetic, checked by brute force',
      code: `from itertools import combinations

for n in range(3, 8):
    maj = n // 2 + 1                  # majority = strictly more than half
    tolerated = n - maj               # crashes survivable while a quorum still forms
    quorums = list(combinations(range(n), maj))
    worst = min(len(set(a) & set(b)) for a in quorums for b in quorums)
    print(f"n={n}  majority={maj}  tolerates={tolerated}  "
          f"quorums={len(quorums):3d}  worst-case overlap={worst}")

old, new = {0, 1, 2}, {2, 3, 4}       # old leader's commit quorum vs new leader's voters
print("shared node:", old & new)

# --- actual output ---
# n=3  majority=2  tolerates=1  quorums=  3  worst-case overlap=1
# n=4  majority=3  tolerates=1  quorums=  4  worst-case overlap=2
# n=5  majority=3  tolerates=2  quorums= 10  worst-case overlap=1
# n=6  majority=4  tolerates=2  quorums= 15  worst-case overlap=2
# n=7  majority=4  tolerates=3  quorums= 35  worst-case overlap=1
# shared node: {2}`,
      annotations: {
        4: 'Strictly more than half — 2 of 3, 3 of 5, 4 of 7. Never "half", which is what allows two disjoint halves and therefore split-brain.',
        7: 'Not a proof sketch: this compares EVERY pair of possible quorums and reports the smallest intersection found. It is never 0.',
        11: 'The concrete case interviewers draw: the old leader committed with {0,1,2}; the new leader was elected by {2,3,4}. Node 2 is in both and carries the entry across.',
        16: 'n=4 tolerates exactly one failure — same as n=3. The extra machine buys zero fault tolerance and costs you a bigger quorum to wait for on every write.',
        19: 'Worst-case overlap of 1 is all you ever need: one honest node that saw the committed entry is enough to block a stale candidate.',
      },
    },
    {
      type: 'note',
      md: `**Run odd numbers.** 3 tolerates 1 failure, 5 tolerates 2, 7 tolerates 3. Adding one node to make it even buys nothing: 4 still tolerates only 1, and 6 still only 2 — you paid for a machine, enlarged the quorum every write must wait for, and added one more thing that can break. Practical sizing: **3** for dev and small clusters, **5** for anything you care about (the etcd and ZooKeeper default — it survives two failures, including one during a rolling upgrade), **7** only when you specifically need to lose three nodes, since write latency tracks the slowest node in the quorum. Never **2**: a majority of 2 is 2, so it tolerates *zero* failures — strictly worse availability than a single machine, at twice the cost. And for a two-datacenter deployment there is no honest split — 3/2 means DC-B alone is dead in the water; use three failure domains (2/2/1) or accept a designated primary DC.`,
    },
    {
      type: 'intuition',
      title: 'Split-brain and the fencing token',
      md: `The classic failure, and a favourite interview follow-up. Client A holds a lock with a 30-second lease and starts writing to shared storage.

- A\'s process **pauses for 40 seconds** — a stop-the-world GC, a hypervisor stealing the CPU, a laptop lid closing. It is not dead. It is frozen mid-operation.
- The lease expires. The lock service correctly hands the lock to client B, which does its work.
- A wakes up. From inside its own process **no time has passed** and it still holds a lock object that says "valid". It completes its write, over B\'s. Data corrupted, no error anywhere.
- No lease length fixes this, because any pause can exceed any timeout. Checking "am I still the holder?" right before writing does not fix it either — the pause can land between the check and the write.
- **Fencing token**: the lock service returns a number that increases with every grant. A holds token 33, B holds 34. Every write carries its token, and **the storage service rejects any token lower than the highest it has already seen**. A\'s late write arrives with 33, gets refused. Done.
- The load-bearing detail: the check lives at the **resource**, not in the client. A client that wrongly believes it holds a lock is precisely the thing you cannot trust to police itself.`,
    },
    {
      type: 'note',
      md: `**Paxos, in one line.** Paxos (Lamport, 1989) is the ancestor — the same safety guarantees, and famously hard to understand and harder to implement completely, which is exactly why Raft was designed for understandability and now dominates open source (etcd, Consul, CockroachDB, TiKV, Kafka\'s KRaft). Google\'s Chubby and Spanner run Paxos variants; ZooKeeper runs ZAB, a close cousin. Interview move: name Paxos as the origin in one sentence, then reason in Raft, because Raft\'s vocabulary — terms, election timeout, commit on majority — is what the follow-up questions are made of.`,
    },
    {
      type: 'intuition',
      title: 'Failure detection: every detector is a bet',
      md: `The mechanism is boring: send a heartbeat every T milliseconds, declare a node dead after k missed beats. The interesting part is that it **cannot be made correct**.

- From the outside, a crashed node and a slow network are **indistinguishable**. There is no observation that separates them. So a failure detector never *measures* death — it **bets** on it.
- Bet too aggressively (say 500 ms): a healthy leader gets deposed every time it GC-pauses. You get election churn, and every needless failover is a short write outage. False positives are self-inflicted downtime.
- Bet too slowly (say 30 s): a genuine crash means 30 seconds of real outage while everyone politely waits.
- **Phi-accrual detectors** (Cassandra, Akka) refuse the binary: they track the distribution of recent heartbeat arrival times and output a *suspicion level* φ that rises as silence gets statistically unusual. Each caller picks its own threshold, and the detector adapts to a network that is normally 5 ms and occasionally 200 ms.
- The practical rule: **tune against your measured p99 heartbeat gap, not a blog default**. Same-rack is a different world from cross-region; a 1-second threshold that is generous inside one DC is reckless across an ocean.
- Related trick worth naming: Raft\'s **PreVote** — a candidate first asks "would you vote for me?" without incrementing the term, so a node flapping in and out of a partition cannot repeatedly inflate the term and disrupt a perfectly healthy leader.`,
    },
    {
      type: 'intuition',
      title: 'Gossip: membership without a coordinator',
      md: `Office rumour. Nobody sends a company-wide email; each person tells two others, and by lunchtime everyone knows. No coordinator, and it works even if the CEO is out sick.

- **Gossip protocol**: every node picks a few random peers each second and exchanges state — who is alive, which version of what, node metadata.
- Spread is exponential: each round roughly triples the number of informed nodes, so everyone learns in **O(log n) rounds**. Thousands of nodes converge in seconds.
- No central registry means no single point of failure, no scaling ceiling on the registry, and bandwidth per node stays constant as the cluster grows.
- Used for exactly this: **Cassandra** and **Consul** (via Serf) for cluster membership and health; Dynamo before them.
- The cost, and you must say it: membership is **eventually consistent**. Mid-propagation, different nodes disagree about who is up, and there is **no single authority to ask**. You cannot get a definitive answer to "is X alive right now" — only opinions.
- So the division of labour: **gossip for membership and health at scale; consensus for decisions that must be unique** — who is leader, who holds the lock, what is entry #12. Cassandra does exactly this split.`,
    },
    {
      type: 'intuition',
      title: 'Where you actually meet this: ZooKeeper, etcd, Consul',
      md: `You will almost certainly never implement consensus. You will *use* it, and knowing which box to point at — and why — is the interview signal.

- These are small, strongly consistent stores that run consensus for you: **ZooKeeper** (ZAB), **etcd** (Raft), **Consul** (Raft). Kubernetes keeps its entire cluster state in etcd; Kafka used ZooKeeper for years and now runs its own Raft (KRaft).
- What you use them for: **leader election**, **service discovery**, **configuration**, **distributed locks**, **membership**. Not for application data.
- Why not build it yourself: the happy path is a weekend, and it is not the problem. The problem is log compaction, snapshotting, membership changes while the cluster is live, and the one-in-ten-thousand partition that silently loses a committed write. Use the boring, battle-tested box.
- What to say out loud: *"leader election goes in etcd — quorum-replicated writes, linearizable reads, and leases with a monotonically increasing revision I can use as a fencing token."* That sentence answers the question and pre-empts the follow-up.
- Their nature is **CP**: a minority partition becomes unavailable rather than wrong. Correct for coordination, fatal for traffic.
- So never put a hot path through them. They handle a few thousand coordination ops per second, not your request volume — and a design that reads etcd on every user request is a design that falls over.`,
    },
    {
      type: 'intuition',
      title: 'The distributed lock question, done properly',
      md: `"Use Redis SETNX with a TTL" is the answer everyone gives, and it is a fine **optimization**. It is not **safety**. Know the difference and you pass this follow-up.

- Two killers, neither fixable by tuning: a **process pause** longer than the TTL (your lease expired while you believed you held it), and **clock skew** (the store expires the key on its own clock, which is not yours).
- Redlock across five Redis nodes does not rescue it either — Kleppmann\'s critique lands because the failure is on the *client* side of the lease, and no amount of server-side voting can see into a paused client.
- Honest option 1: **fencing token** checked at the resource. The only mechanism that actually survives an arbitrary pause, because the late write is rejected by the thing being protected.
- Honest option 2: a **CP store** — etcd or ZooKeeper — with a session/lease and its monotonic revision number as the token. Same idea, implemented by people who have been paged for it.
- Honest option 3, and the best one: **make the operation idempotent** so running it twice is harmless. Then the lock is a performance optimization (avoid duplicate work) rather than a correctness requirement (avoid corruption). See the resilience module for idempotency keys and safe retries.
- The line to deliver: *"A lock stops work from happening twice; idempotency makes it not matter when it does anyway. I want the second property, and I will use the lock to save the wasted effort."*`,
    },
  ],
  quiz: [
    {
      question: 'Why does Raft randomize each node\'s election timeout instead of using one fixed value?',
      options: [
        { text: 'To spread network load evenly across the cluster', explanation: 'Heartbeat traffic is tiny and unaffected by timeout jitter — load is not the concern.' },
        { text: 'To keep the nodes\' clocks synchronized', explanation: 'Raft deliberately avoids depending on wall clocks; terms are a logical clock precisely so synchronization is never needed.' },
        { text: 'So two followers rarely time out together — simultaneous candidates split the vote, nobody gets a majority, and the term is wasted', explanation: 'Correct. With identical timeouts, split votes repeat and elections can drag. Randomizing means one node almost always fires clearly first and wins uncontested.' },
        { text: 'To let the node with the most up-to-date log always fire first', explanation: 'The log-freshness rule is enforced by the voting condition, not by timer ordering. Randomization is blind to log state.' },
      ],
      correct: 2,
    },
    {
      question: 'A 5-node etcd cluster runs 3 nodes in DC-A and 2 in DC-B. The link between the datacenters fails. What happens?',
      options: [
        { text: 'DC-A keeps (or elects) a leader and serves writes; DC-B has 2 of 5 and can neither elect nor commit, so it is unavailable for writes', explanation: 'Correct. 3 of 5 is a majority, so the DC-A side is fully functional. If the old leader was in DC-B it may still think it leads, but it can never gather 3 acks — so it commits nothing. Unavailable, never wrong.' },
        { text: 'Both sides elect a leader and the cluster splits into two working halves', explanation: 'This is exactly what the majority rule forbids: two disjoint majorities of 5 cannot exist, so DC-B can never win an election.' },
        { text: 'The whole cluster stops until an operator intervenes', explanation: 'The majority side keeps working automatically — that is the entire point of tolerating 2 failures out of 5.' },
        { text: 'Writes succeed on both sides and merge when the link returns', explanation: 'Merging conflicting committed writes is what consensus exists to prevent; there is no merge step in Raft.' },
      ],
      correct: 0,
    },
    {
      question: 'You run a 3-node consensus cluster and add a 4th node. What did the extra machine buy?',
      options: [
        { text: 'Tolerance of 2 failures instead of 1', explanation: 'A majority of 4 is 3, so only 1 node may fail. You need 5 nodes to tolerate 2.' },
        { text: 'Nothing in fault tolerance — 3 and 4 both tolerate exactly one failure — while the quorum every write must wait for grew from 2 to 3', explanation: 'Correct, and it is why consensus clusters are sized odd. You paid for a machine, made writes wait on one more ack, and added another thing that can fail.' },
        { text: 'Roughly 33% more write throughput', explanation: 'Backwards. Every node still applies every write, and the commit quorum got larger — writes get slower, not faster.' },
        { text: 'Immunity to split-brain, since ties are now impossible', explanation: 'Split-brain was already impossible at 3 — a majority is *strictly* more than half, so no tie can ever produce two leaders.' },
      ],
      correct: 1,
    },
    {
      question: 'A client holds a 30-second lease on a lock, GC-pauses for 40 seconds, and wakes up mid-operation while another client now holds the lock. What actually prevents corruption?',
      options: [
        { text: 'A longer lease TTL', explanation: 'Any TTL can be exceeded by a long enough pause. This trades a rare bug for a slower recovery, not a fix.' },
        { text: 'Redlock across five Redis nodes', explanation: 'The failure is on the client side of the lease — a paused process. No amount of server-side voting can observe it.' },
        { text: 'Re-checking that the lock is still held immediately before writing', explanation: 'The pause can land between the check and the write. Check-then-act across a network is never atomic.' },
        { text: 'A fencing token: the resource itself rejects any write carrying a token lower than the highest it has already accepted', explanation: 'Correct. The stale client writes with token 33 after the new holder used 34, and the storage service refuses it. The check must live at the resource, because a paused client cannot police itself.' },
      ],
      correct: 3,
    },
    {
      question: 'What does the FLP impossibility result actually say?',
      options: [
        { text: 'Consensus is impossible in practice, so all distributed systems are eventually inconsistent', explanation: 'Far too strong. etcd and ZooKeeper reach consensus thousands of times a second; FLP constrains guarantees, not practice.' },
        { text: 'In a fully asynchronous system with no bound on message delay, no deterministic protocol guarantees consensus if even one node may crash — so real systems add timeouts and trade guaranteed termination for safety', explanation: 'Correct. The root cause is that a crashed node is indistinguishable from a slow one. Raft assumes partial synchrony (timeouts): it stays always-safe and terminates fast in practice, without a theoretical termination guarantee.' },
        { text: 'Consensus requires synchronized physical clocks across all nodes', explanation: 'The opposite of how Raft works — terms are a logical clock precisely so that no wall-clock agreement is needed.' },
        { text: 'A majority quorum is impossible to achieve when the network partitions', explanation: 'A majority side keeps working during a partition; that is the design. FLP is about asynchrony and crashes, not partitions specifically.' },
      ],
      correct: 1,
    },
    {
      question: 'Cassandra uses gossip for cluster membership. Which tradeoff must you name?',
      options: [
        { text: 'Membership is only eventually consistent — mid-propagation, nodes disagree about who is alive and there is no single authority to ask', explanation: 'Correct. Gossip buys coordinator-free scale to thousands of nodes and pays with the absence of one definitive answer to "is X up right now".' },
        { text: 'Gossip needs an elected coordinator to seed each round', explanation: 'The absence of a coordinator is exactly what gossip is for — each node picks random peers independently.' },
        { text: 'Gossip scales worse than a central registry as the cluster grows', explanation: 'Reversed: bandwidth per node stays roughly constant and information reaches everyone in O(log n) rounds, while a central registry becomes the bottleneck.' },
        { text: 'Gossip cannot detect node failures at all', explanation: 'It detects them well — missing gossip updates feed the failure detector (phi-accrual in Cassandra). What it cannot provide is a single agreed answer.' },
      ],
      correct: 0,
    },
    {
      question: 'Your failover threshold declares a leader dead after 500 ms of missed heartbeats, in a JVM cluster with occasional 800 ms GC pauses. What symptom should you expect?',
      options: [
        { text: 'Slow failovers when the leader genuinely crashes', explanation: 'That is the opposite failure mode — it comes from a threshold that is too generous, not too tight.' },
        { text: 'Nothing: elections are safe, so extra ones are free', explanation: 'Elections are safe but not free. Each one has no leader for a moment, so writes stall until the new leader is heartbeating.' },
        { text: 'False failovers — a perfectly healthy leader is deposed on every long pause, causing repeated elections and a brief write stall each time', explanation: 'Correct. The detector cannot distinguish "paused" from "dead", so a threshold below your real pause distribution converts routine GC into self-inflicted downtime. Tune against the measured p99 gap.' },
        { text: 'Permanent split-brain with two leaders serving writes', explanation: 'The majority rule still holds through all the churn — the deposed leader can never commit. You get instability, not corruption.' },
      ],
      correct: 2,
    },
    {
      question: 'In Raft, an entry is "committed" at the moment that…',
      options: [
        { text: 'the leader has written it to its own log', explanation: 'If the leader crashes now, an election could produce a leader that never saw the entry — nothing has been promised yet.' },
        { text: 'a majority of nodes have persisted it, after which it survives any leader change because the next leader\'s electing majority overlaps this one', explanation: 'Correct. Overlap plus the log-freshness voting rule means the next leader is guaranteed to already hold the entry. Only now is the client acked.' },
        { text: 'all followers have acknowledged it', explanation: 'That would let a single slow or dead follower stall every write — precisely the availability problem majority quorums solve.' },
        { text: 'the client has received the acknowledgement', explanation: 'Backwards: the commit is what authorizes the ack. The client learning about it is a consequence, not the condition.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why is consensus hard? Explain it to someone who says "just have the nodes vote".',
      answer:
        'Voting is easy when messages arrive. The difficulty is that they may not, and that a node cannot tell a crashed peer from a slow one — those two look identical from the outside. Two Generals makes the limit concrete: over an unreliable channel, no finite exchange of messages makes both sides certain the other agreed. FLP sharpens it: in a fully asynchronous model, no deterministic protocol guarantees consensus if even one node can crash. So practical protocols change the goal. They do not guarantee they will always decide quickly; they guarantee they will never decide *twice differently* — at most one leader per term, at most one committed value per log index. They get liveness by assuming partial synchrony, i.e. adding timeouts and betting that silence means death. Raft and Paxos are always safe and terminate in milliseconds on real networks. Naming that split — safety always, liveness by assumption — is the answer interviewers are listening for.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through Raft leader election end to end.',
      answer:
        'Every node is a follower, candidate, or leader, and every message carries a term — a counter that only increases and acts as a logical clock, with at most one leader per term. Followers run a randomized election timeout, typically 150-300 ms, reset by each leader heartbeat. When one fires, that follower becomes a candidate: it increments the term, votes for itself, and sends RequestVote to everyone. Two voting rules matter: a node votes at most once per term, and only for a candidate whose log is at least as up to date as its own — the second rule is what makes majority overlap sufficient for safety. A majority of votes makes it leader, and it immediately heartbeats to stop everyone else\'s timers. If two candidates fire at once, votes split, nobody reaches a majority, and the term produces no leader — nothing breaks, everyone just waits; the randomized timeouts make repeated splits vanishingly unlikely. Finally, the rule that cleans up stragglers: any node seeing a higher term steps down and adopts it, so an old leader returning from a pause is demoted by the first packet it reads. Worth adding: PreVote, where a candidate asks "would you vote for me?" without incrementing the term, so a flapping node cannot disrupt a healthy leader by inflating terms.',
      isCaseBased: false,
    },
    {
      question: 'Why a majority quorum specifically? Why not "any two nodes agree"?',
      answer:
        'Because majorities of the same set always intersect, and no smaller rule does. In a 5-node cluster, any two 3-node sets share at least one node — 3 + 3 > 5 forces it. Commit requires a majority and election requires a majority, so the set that committed the last entry and the set that elects the next leader always share at least one node. That node saw the committed entry, and the log-freshness voting rule makes it refuse to vote for a candidate that is behind — so the new leader is guaranteed to already hold every committed entry, with no state transfer or coordinator. "Any two nodes" breaks immediately: {A,B} and {C,D} are disjoint, so a partition gives you two leaders that both believe they committed different values. Costs to state honestly: you need more than half alive, so a minority partition is unavailable by design (this is CP), and the quorum is over configured nodes, not surviving ones — a stranded minority cannot lower the bar for itself. Also, write latency is the median replica\'s round trip, which is why quorums stay small.',
      isCaseBased: false,
    },
    {
      question: 'Case: your team runs a 5-node etcd cluster with 3 nodes in DC-A and 2 in DC-B. The inter-DC link drops for ten minutes. Describe what happens and what you would change.',
      answer:
        'During the outage: DC-A has 3 of 5, a majority, so it keeps or elects a leader and serves reads and writes normally. DC-B has 2 — it can neither elect nor commit. If the old leader happened to be in DC-B, it will keep believing it leads until it hears a higher term, but it can never gather 3 acks, so nothing commits and no client gets an ok. Anything in DC-B that depends on etcd (service discovery, leader election, config) is effectively down. Safety is never at risk; availability is, asymmetrically. What I would change depends on what "DC-B must keep working" actually means. If it must, the cluster needs three failure domains — 2/2/1 across three DCs, so any single DC loss leaves a majority. If a third location is impossible, a light tiebreaker/witness node in a third zone gets the same effect cheaply. Otherwise, be explicit that DC-A is the primary and design DC-B services to degrade gracefully: cache last-known config, keep serving reads, fail closed only on operations that genuinely need coordination. What I would not do is shrink the cluster to DC-A alone to "avoid the problem" — that just moves the outage to a single-DC failure. And I would push back hard on any "let the minority elect its own leader" suggestion: that is asking for two leaders and lost writes.',
      isCaseBased: true,
    },
    {
      question: 'How many nodes should a consensus cluster have, and why never an even number?',
      answer:
        'Fault tolerance is n minus the majority size, so 3 tolerates 1, 5 tolerates 2, 7 tolerates 3 — and 4 tolerates 1 (same as 3), 6 tolerates 2 (same as 5). An even size buys zero extra tolerance while enlarging the quorum every write must wait for and adding another machine that can fail, so odd sizes are strictly better. Defaults I would actually pick: 3 for development or a small internal cluster; 5 for anything I care about, because it survives two failures — meaning I can lose a node and still do a rolling upgrade; 7 only if the requirement is explicitly to survive three simultaneous failures, since write latency tracks the slowest node needed for the quorum and grows as the quorum does. Two nodes is the trap: a majority of 2 is 2, so it tolerates zero failures — worse availability than one machine, at twice the cost. And the sizing question is really a placement question: five nodes in one rack tolerate two node failures and zero rack failures, so spread across failure domains or the arithmetic is theatre.',
      isCaseBased: false,
    },
    {
      question: 'Case: a nightly billing job must run exactly once, but it is deployed on 50 worker instances. Design it.',
      answer:
        'I start by refusing the premise that a lock alone can give me "exactly once". Layer one, and the one that actually saves me: make the job idempotent — derive a deterministic run key (job name + date), write it with a unique constraint before doing work, and make each side effect keyed so a repeat is a no-op. Now a duplicate execution is wasteful, not wrong. Layer two, to avoid the waste: leader election through etcd or ZooKeeper — workers contend for a lease-backed key, the winner runs, and the lease auto-expires if it dies, so another worker picks up without human intervention. Layer three, for anything the job writes to shared storage: carry the lease revision as a fencing token so a paused winner that wakes up late is rejected by the resource rather than trusted by itself. The follow-up is always "what if the leader pauses mid-job?" — and the honest answer is that it will, so the lease expires, a second worker starts, and only idempotency plus fencing keeps that safe; no lease length makes the pause impossible. If the team already runs Kubernetes, I would say the boring version out loud: a CronJob with concurrencyPolicy Forbid already gives me single execution through the same etcd, and I still keep the idempotency because the process can be killed after the side effect and before the acknowledgement.',
      isCaseBased: true,
    },
    {
      question: 'Is a Redis lock with SETNX and a TTL safe? Defend your answer.',
      answer:
        'It is a good optimization and not a safety mechanism. Two failures kill it, neither fixable by tuning. First, process pauses: a stop-the-world GC or a hypervisor stealing CPU can exceed any TTL, so the lease expires while the client still believes it holds the lock — and from inside that process no time has passed. Second, clock skew: expiry happens on the store\'s clock, which is not the client\'s. Redlock across five Redis nodes does not fix it, and Kleppmann\'s critique is the citation — the failure is on the client side of the lease, invisible to any server-side voting. Nor does re-checking the lock before writing: the pause can land between the check and the write. The three honest options: a fencing token validated at the resource, which is the only thing that survives an arbitrary pause because the late write is rejected by the thing being protected; a CP store like etcd or ZooKeeper with a session lease whose monotonic revision *is* the fencing token; or, best, an idempotent operation so a duplicate run is harmless and the lock degrades to a performance optimization. What I would say to close: a lock stops work happening twice, idempotency makes it not matter when it does anyway — I want the second, and I will still take the lock to avoid the wasted work.',
      isCaseBased: false,
    },
    {
      question: 'How do you choose a failure-detection timeout? Walk me through the reasoning, not a number.',
      answer:
        'First the framing: a failure detector cannot be correct, because a crashed node and a slow network are indistinguishable from the outside. So I am choosing where to be wrong. Too aggressive and I get false positives: healthy leaders deposed on every GC pause, election churn, and a write stall each time — self-inflicted downtime that looks like flakiness. Too slow and a real crash means a long outage while everyone waits politely. The method is empirical: measure the actual distribution of heartbeat inter-arrival times in *this* deployment, take p99 or p99.9, and set the threshold above it with headroom for known pause sources — JVM GC, VM steal, cross-region jitter. Same-rack and cross-region are different worlds; a 1-second threshold that is generous inside a datacenter is reckless across an ocean. Where the network is bimodal, a phi-accrual detector is better than a fixed threshold: it tracks the recent arrival distribution and emits a suspicion level that each caller thresholds itself, so it adapts to a link that is usually 5 ms and sometimes 200 ms. I would also separate detection from action — suspecting a node can trigger cheap responses (stop routing new work to it) long before the expensive one (failover). And I would add PreVote so a flapping node cannot inflate terms and disturb a healthy leader.',
      isCaseBased: false,
    },
    {
      question: 'Gossip or a central registry for service membership? Pick one and defend it.',
      answer:
        'They answer different questions, so I pick by what the caller needs. Gossip — each node exchanging state with a few random peers every second — spreads information in O(log n) rounds, has no coordinator to fail or to become a bottleneck, keeps per-node bandwidth roughly constant as the cluster grows, and scales to thousands of nodes. That is why Cassandra and Consul use it for membership and health. The cost is that membership is eventually consistent: mid-propagation, nodes disagree about who is up, and there is no authority to ask for the definitive answer. A registry backed by consensus (etcd, ZooKeeper) gives exactly that definitive answer — a linearizable view of who is registered — but the coordination cluster is a scaling ceiling and a CP dependency, and it becomes unavailable to a minority partition. So: gossip for health and membership at large scale, where an approximate and slightly stale view is fine because you are load balancing, not deciding; consensus for anything that must be unique and agreed — who is the leader, who holds the lock, what is entry #12 in the log. Cassandra makes exactly this split, and saying it that way shows the concepts are not interchangeable.',
      isCaseBased: false,
    },
    {
      question: 'Case: you inherit a service whose leader "flaps" several times a day, and each flap causes a five-second write stall. Diagnose and fix.',
      answer:
        'Flapping with no correlated crashes means the failure detector is firing on live nodes — the question is what makes them look dead. I would correlate flap timestamps with three things: GC logs (a stop-the-world pause longer than the threshold is the usual culprit), host metrics (CPU steal on a noisy neighbour, disk fsync latency spikes, since Raft persists before acking), and network telemetry (packet loss or a micro-blip on a cross-AZ link). Then I would plot the actual heartbeat inter-arrival distribution and compare its p99.9 against the configured threshold — if the threshold sits inside the normal tail, the config is the bug. Fixes in order of cost: raise the threshold above the measured tail with headroom; reduce the pauses themselves (heap tuning or a low-pause collector, faster fsync, move off the noisy host); switch to a phi-accrual detector if the link is genuinely bimodal; and add PreVote so a partitioned node cannot inflate the term and depose a healthy leader on rejoining. Separately, the five-second stall is its own bug — an election should take a couple of timeouts, so I would check whether clients are missing leader-redirect handling or holding stale connections, and make the client retry with backoff on NotLeader. What I would resist is the reflex fix of disabling automatic failover: that trades frequent short stalls for rare long outages that need a human at 3am.',
      isCaseBased: true,
    },
    {
      question: 'Case: two workers must never process the same payment. Design the mechanism, and defend it when I tell you the lock service went down.',
      answer:
        'I do not start with the lock. Payments have a natural idempotency key — the payment id, or a client-supplied request id — so I make the write itself exclusive: a unique constraint on that key in the transactional database, with the state transition (pending to captured) done as a conditional update guarded by the current state. Now two workers racing produce one success and one constraint violation, which the loser treats as "already done" rather than an error. The database is already a consensus system, and it is the one the money lives in — putting the decision anywhere else means coordinating two systems. Calls to an external payment provider carry the same idempotency key so the provider deduplicates on its side too. Only then do I add a lock, and only to avoid wasted duplicate work — an etcd or Redis lease that says "someone is probably on this one". When you tell me the lock service is down, the answer is that nothing about correctness changes: workers proceed without the lock, may duplicate effort, and the unique constraint plus the provider\'s idempotency key still guarantee one charge. That is the whole reason the lock is not load-bearing. If instead the design had leaned on the lock for correctness, that outage would be a double-charge incident — and if the requirement forces a lock over a resource with no such constraint, then I need a fencing token checked by that resource, because a paused holder is otherwise indistinguishable from a live one.',
      isCaseBased: true,
    },
    {
      question: 'Would you ever implement Raft yourself? And where does Paxos fit?',
      answer:
        'Almost never, and being able to say why is the point. Leader election and log replication on the happy path are a weekend project; the parts that page you are the rest — log compaction and snapshotting, membership changes while the cluster is live, restart and recovery correctness, and the one-in-ten-thousand partition that quietly loses a committed entry. That surface has been debugged for a decade in etcd, ZooKeeper and Consul, and reproducing it is pure cost with no product value. So: leader election, service discovery, config and locks go in one of those boxes, and I would say which and why — etcd for quorum writes, linearizable reads, and leases whose monotonic revision doubles as a fencing token. The one caveat is that they are CP and modest in throughput, so they carry coordination, never the request hot path; a design that reads etcd on every user request falls over. On Paxos: it is the ancestor, same safety guarantees, notoriously hard to understand and harder to implement completely — which is exactly why Raft was designed for understandability and now dominates open source. Chubby and Spanner run Paxos variants and ZooKeeper runs ZAB, a close cousin. In an interview I name Paxos as the origin in one sentence and then reason entirely in Raft, because terms, election timeouts and commit-on-majority are the vocabulary the follow-ups are made of.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Consensus — and why it is genuinely hard', back: 'Several nodes agree on ONE value (leader, lock holder, log entry #12) despite crashes and lost messages, and never un-agree. Two Generals: no certainty over an unreliable channel. FLP: fully async + one possible crash → no deterministic protocol GUARANTEES consensus, because crashed and slow are indistinguishable.' },
    { front: 'How real systems escape FLP', back: 'They assume partial synchrony — add timeouts and bet that silence means death. They give up guaranteed termination (an election may retry) to keep safety: never two leaders in one term. Always correct, usually fast.' },
    { front: 'Raft: three states + terms', back: 'Follower (default), candidate (campaigning), leader (only node taking writes). Term = ever-increasing logical clock, one leader max per term. See a higher term → step down and adopt it.' },
    { front: 'The Raft election, and split votes', back: 'Election timeout fires → candidate, term+1, self-vote, RequestVote to all. One vote per node per term, only for a log at least as up to date. Majority → leader, heartbeat immediately. Two candidates at once → split vote, no leader that term; fix = randomized 150-300 ms timeouts.' },
    { front: 'Commit on majority — and why a majority', back: 'Committed = a MAJORITY has persisted the entry; only then does the leader apply it and ack the client (not on leader-append, not on all-followers — one slow node would stall every write). Safety comes from intersection: any two majorities share a node (3+3 > 5), so the electing quorum always contains someone who saw the committed entry and refuses to vote for a behind candidate.' },
    { front: 'Cluster sizing arithmetic', back: '3 tolerates 1, 5 tolerates 2, 7 tolerates 3. Even buys nothing: 4 tolerates 1, 6 tolerates 2. Never 2 (tolerates 0 — worse than one machine). Default 5; 7 only when latency allows.' },
    { front: 'Split-brain and fencing tokens', back: 'A paused holder wakes believing it still owns the lock and overwrites the new holder. Fix: monotonically increasing token per grant; the RESOURCE rejects any token below the highest seen. Not the client — it cannot police itself.' },
    { front: 'Failure detection = a bet', back: 'Heartbeat + timeout; crashed and slow are indistinguishable. Too tight → false failovers on GC pauses; too loose → long outages. Tune to measured p99; phi-accrual emits a suspicion level instead of a binary verdict.' },
    { front: 'Gossip vs consensus', back: 'Gossip: random peer exchange, O(log n) rounds, no coordinator, thousands of nodes (Cassandra, Consul) — but eventually consistent membership, no single truth. Consensus: for decisions that must be unique.' },
    { front: 'The distributed lock answer', back: 'Redis SETNX+TTL is an optimization, not safety (pauses > TTL, clock skew; Redlock does not fix a client-side pause). Honest options: fencing token at the resource, a CP store (etcd/ZK) lease, or best — an idempotent operation.' },
  ],
  mindmapMarkdown: `- Consensus, Leader Election & Failure Detection
  - Why consensus
    - Agree on ONE value: leader, lock holder, log entry #12
    - Two Generals: no certainty over an unreliable channel
    - FLP: async + one crash → no guaranteed protocol
    - Escape: timeouts (partial synchrony) — safety over liveness
  - Raft, conceptually
    - Follower / candidate / leader
    - Term = logical clock; higher term seen → step down
    - Election: timeout → term+1 → self-vote → RequestVote
    - Vote once per term, only for an up-to-date log
    - Split vote → randomized timeouts (+ PreVote)
    - Commit = a majority has persisted the entry
  - Why a majority
    - Any two majorities intersect
    - Overlap node carries committed entries to the new leader
    - 3→1, 5→2, 7→3; even buys nothing, never run 2
    - Price: minority partition unavailable (CP)
  - Split-brain
    - Paused holder wakes still believing it owns the lock
    - Fencing token: monotonic, checked AT THE RESOURCE
    - Paxos = the ancestor; ZAB in ZooKeeper
  - Failure detection
    - Heartbeat + timeout = a bet; crashed vs slow is invisible
    - Too tight → false failovers; too slow → long outages
    - Phi-accrual suspicion level; tune to measured p99
  - Gossip
    - Random peers, spreads in O(log n), no coordinator
    - Cassandra, Consul membership at thousands of nodes
    - Eventually consistent — no single truth to query
  - Where you meet it
    - ZooKeeper / etcd / Consul; k8s state lives in etcd
    - Election, discovery, config, locks — never build it yourself
    - CP and low throughput → coordination, not the hot path
  - The distributed lock question
    - Redis TTL: optimization, not safety (pauses, clock skew)
    - Fencing token · CP store lease · idempotency (best)`,
}

export default m
