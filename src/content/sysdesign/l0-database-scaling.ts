import type { Module } from '../types'

const m: Module = {
  id: 'sysdesign-l0-database-scaling',
  subjectId: 'sysdesign',
  level: 0,
  title: 'Scaling the Database: Replication, Sharding & Consistent Hashing',
  whyItMatters:
    'The database is where almost every design interview goes to die. "Just shard it" is the answer that ends the round — because sharding costs you joins, transactions and a quiet on-call rotation, and there are four cheaper rungs before it. This module gives you the ladder in order, the replication anomalies by name, the shard-key decision that no refactor can undo, consistent hashing with the arithmetic, and the capacity numbers an interviewer expects you to produce on the spot.',
  estMinutes: 60,
  sections: [
    {
      type: 'intuition',
      title: 'The ladder — and why sharding is the last rung',
      md: `A restaurant kitchen is slow. You do not start by building a second kitchen across town. You check whether the chef is walking to the wrong fridge first.

The honest progression, cheapest and least risky first:

1. **Indexes and query tuning.** Run \`EXPLAIN\` on your top ten queries. A missing index turns a 2 ms lookup into a 2 s full scan; an N+1 loop turns one page load into 500 round trips. Most "we need to shard" pain dies here, for free.
2. **Caching.** Put Redis or the app's own memory in front of the hot reads. A 90% hit rate cuts database load by 10×. Cost: staleness and invalidation logic.
3. **Read replicas.** Copies of the whole database serving reads. Ten replicas ≈ ten times the read throughput. Cost: replication lag, and a pile of anomalies with names — the next half of this module.
4. **Vertical scaling.** Buy a bigger machine. 64 → 512 GB RAM, faster NVMe. Cost: money, a hard ceiling, and one reboot of downtime — but it is the last move that keeps your system *simple*.
5. **Sharding.** Split the data across machines. The only rung that scales **writes** and **storage**.

Notice where vertical scaling sits. It is not "beginner stuff" — it is the thing you do to postpone rung 5, because rung 5 is the one you can never undo.`,
    },
    {
      type: 'note',
      md: `**Say this out loud in interviews: sharding is a last resort, and here is its bill.** You lose *joins* (rows on different machines cannot be matched cheaply), *transactions* (multi-row ACID across shards needs 2PC or a saga), and *operational simplicity* (every shard is its own database with its own replicas, backups, failover, schema migrations and monitoring). You also lose global uniqueness — auto-increment IDs and \`UNIQUE\` constraints stop working across the cluster. A candidate who reaches for sharding first is telling the interviewer they have never operated one.`,
    },
    {
      type: 'intuition',
      title: 'Replication: one leader, many followers',
      md: `A teacher writes the master answer key; photocopies go to every classroom. Students read any copy. Corrections go through the teacher only.

- **Single-leader (leader-follower)** replication is the default in Postgres, MySQL, MongoDB, and nearly every managed cloud database. Assume it unless you argue otherwise.
- **All writes go to the leader.** It appends every change to a replication log and streams it to followers, who apply the changes **in the same order**.
- **Reads can go to any follower.** That is the whole point: reads scale with replica count.
- **Writes do not scale.** Every node still applies every write, so write capacity stays that of one machine. Replication buys read throughput and failure survival — nothing else.
- Followers run behind by **replication lag**: single-digit milliseconds when healthy, seconds under write bursts, minutes when a follower is rebuilding or the network is degraded.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Replication lag, frame by frame',
        notice: 'The leader is at log position 4102; the follower is one frame behind. Watch which node answers each request — and what it knows at that instant.',
        leftLabel: 'requests',
        rightLabel: 'replicas',
        frames: [
          {
            note: 'You post comment #42. Writes only ever reach the leader. It commits at log position 4102, acks you immediately (async replication — it does not wait for anyone), and queues the change for the follower, which is still at 4101.',
            stack: [{ name: 'POST /comment #42', value: 'ack, LSN 4102', to: 'leader' }],
            heap: [
              { id: 'leader', value: 'LSN 4102 · …#40 #41 #42', label: 'leader — has your write' },
              { id: 'follower', value: 'LSN 4101 · …#40 #41', label: 'follower — one frame behind' },
            ],
          },
          {
            note: 'You refresh 40 ms later. The load balancer sees a READ and routes it to the follower — any replica will do, that is the design. The follower answers honestly from LSN 4101: your comment is not there. Nothing is broken and nothing is lost. You simply outran the replication stream.',
            stack: [{ name: 'GET /my-comments', value: 'returns …#40 #41', to: 'follower', danger: true }],
            heap: [
              { id: 'leader', value: 'LSN 4102 · …#40 #41 #42', label: 'leader (not consulted)' },
              { id: 'follower', value: 'LSN 4101 · STALE', label: 'read-your-own-writes VIOLATED', danger: true },
            ],
          },
          {
            note: 'The stream lands, the follower applies 4102 and catches up. Refresh again and #42 is there. This self-healing is exactly what makes lag bugs miserable to debug: by the time anyone looks, the evidence has replicated away.',
            stack: [{ name: 'GET /my-comments', value: 'returns …#41 #42', to: 'follower' }],
            heap: [
              { id: 'leader', value: 'LSN 4102 · …#40 #41 #42', label: 'leader' },
              { id: 'follower', value: 'LSN 4102 · caught up', label: 'follower — converged' },
            ],
          },
          {
            note: 'The fix, and it is cheap. The write returns its log position (4102) and the client carries that token on the next read. The router then only picks a replica whose applied position is >= 4102 — or falls back to the leader. Same rule, coarser version: send a user\'s reads to the leader for ~1 s after any write of theirs. Note what you did NOT do: make every write in the system synchronous.',
            stack: [{ name: 'GET /my-comments', value: 'read-after LSN 4102', to: 'leader' }],
            heap: [
              { id: 'leader', value: 'LSN 4102 · serves this read', label: 'leader — satisfies the token' },
              { id: 'follower', value: 'LSN 4098 · lagging', label: 'skipped: applied < 4102' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'The three lag anomalies — know them by name',
      md: `"Eventual consistency" is not one bug. It is three, and interviewers ask for them by name.

- **Read-your-own-writes.** You post a comment, refresh, and it is gone. Your write hit the leader; your read hit a lagging follower. *Fix:* for a short window after a user writes, route **that user's** reads to the leader — or carry the write's log position as a token and pick only replicas that have applied it. Route by session, not globally.
- **Monotonic reads.** You see the comment, refresh, and it vanishes again — because the second read hit a *more* lagged replica. Time appears to run backwards. *Fix:* **sticky routing** — hash the user ID to one replica so a given user always reads the same copy. Their view may be stale, but it never goes backwards.
- **Consistent-prefix reads.** Mr. Bakshi asks "how far into the future can you see?" and Mrs. Bakshi answers "about ten seconds" — and an observer receives the *answer before the question*. Writes arrived out of causal order because they lived on different partitions. *Fix:* keep causally related writes in the same partition, or track the dependency explicitly.

The transferable idea: each anomaly is a different **guarantee** you can buy per-request instead of paying for global strong consistency. That is the senior move — spend consistency where the user can see it.`,
    },
    {
      type: 'note',
      md: `**Synchronous vs asynchronous vs semi-synchronous.** *Async:* the leader acks the client immediately and ships the change later — lowest write latency, but if the leader dies, its un-shipped tail of commits dies with it. *Sync:* the leader waits for a follower to confirm before acking — no committed write can be lost, but every write pays a network round trip (~1 ms same-AZ, ~30–70 ms cross-region), and one slow or dead follower stalls **all** writes. *Semi-synchronous* is what production actually runs: exactly **one** follower is synchronous, the rest are async. You get "at least two copies of every acked write" for one round trip, and if the sync follower dies another is promoted into the sync slot so writes keep flowing. The tradeoff in one line: **durability is paid for in write latency, and the currency is round trips.**`,
    },
    {
      type: 'intuition',
      title: 'Failover: where replication actually hurts you',
      md: `Failover = the leader dies, a follower is promoted. It sounds like a checkbox. It is the most dangerous ten seconds your system has.

- **Promoting a lagging follower loses writes.** Under async replication the new leader never saw the old leader's last commits. Standard practice is to *discard* them — the writes were acked to users and then silently deleted.
- That is not theoretical: GitHub's well-known outage discarded MySQL rows on promotion, then the auto-increment counter **reused those primary keys**, and a Redis cache keyed by ID handed some users other users' data. Lost writes turn into wrong data.
- **Split-brain.** The old leader was not dead, only unreachable — a GC pause or a network blip. It comes back still believing it is leader, and now two nodes accept writes. Whoever wrote to the wrong one loses.
- **Fencing tokens** are the fix. Every leadership change increments a number. Writes carry the token; the storage layer rejects any write with a token lower than the highest it has seen. The zombie leader's writes bounce, no coordination needed.
- **Timeout tuning is a real tradeoff.** Too short → a load spike triggers an unnecessary failover, which adds load, which triggers another. Too long → a longer outage. There is no safe default; you tune it against your observed p99 latency.`,
    },
    {
      type: 'intuition',
      title: 'Multi-leader: several leaders that gossip',
      md: `Two leaders, one in Mumbai and one in Virginia, each accepting writes and replicating to the other.

- **When it is worth it:** multi-datacenter writes (local write latency, and each region survives the other's outage), offline-capable clients (your phone's calendar is a leader with a very long lag), and collaborative editing (every browser tab is a leader).
- **The problem is write conflicts.** Two leaders accept edits to the same row *concurrently* — neither saw the other. Single-leader replication never has this: the leader serializes everything.
- **Nothing resolves conflicts for free.** Either you avoid them (route all writes for a given user or record to one home leader — the most common real answer), or you merge them.
- Auto-merge options, weakest first: **last-write-wins** (keep the highest timestamp), **version vectors** (detect concurrency, then let the application merge), **CRDTs** (data types whose merge is provably convergent).
- The cost you inherit: replication topology (all-to-all, star, circular) becomes something you have to reason about, and a broken link can reorder writes into a consistent-prefix violation.`,
    },
    {
      type: 'intuition',
      title: 'Leaderless: quorums, Dynamo-style',
      md: `No leader at all. The client (or a coordinator node) writes to several replicas directly and reads from several replicas directly. This is Dynamo, Cassandra, Riak.

- Every key lives on **N** replicas. A write is acked once **W** of them confirm. A read waits for **R** of them to answer, and takes the newest version returned.
- Choose **W + R > N** and the write set and the read set must share at least one node — so every read touches at least one replica holding the latest write.
- Typical: N=3, W=2, R=2. One node can be down for both reads and writes and nothing stops.
- Repair happens in the background: **read repair** (the reader notices a stale replica and writes back the fresh value) and **anti-entropy** (a background process compares Merkle trees and syncs differences).
- **Sloppy quorum + hinted handoff:** when the home replicas are unreachable, writes are accepted by whatever nodes *are* reachable and handed back later. Availability goes up; the W+R>N guarantee quietly does not hold during that window.
- Blunt truth for interviews: a quorum is **not** strong consistency. Concurrent writes still need conflict resolution, and sloppy quorums, read repair timing and clock skew all leak.`,
    },
    {
      type: 'math',
      intro: 'The quorum condition, and what the knobs buy you.',
      latex: [
        'W + R > N \\;\\;\\Longrightarrow\\;\\; \\text{write set and read set overlap in} \\ge 1 \\text{ node}',
        'N = 3,\\; W = 2,\\; R = 2 \\;\\Rightarrow\\; W + R = 4 > 3 \\quad \\text{(1 node may be down)}',
        'W = 1,\\; R = N \\;\\Rightarrow\\; \\text{fastest writes, slowest reads (write-heavy logs)}',
        'W = N,\\; R = 1 \\;\\Rightarrow\\; \\text{fastest reads, but ANY replica down blocks all writes}',
        '\\text{tolerated failures} = N - \\max(W, R)',
      ],
    },
    {
      type: 'note',
      md: `**Conflict resolution, ranked.** *Last-write-wins* (Cassandra's default): keep the write with the highest timestamp, discard the rest. It always converges and it **silently loses data** — the discarded write was acked to a user, "highest timestamp" depends on clocks that drift between machines, and truly concurrent writes have no meaningful order to begin with. Safe only when writes are immutable events or a lost update genuinely does not matter. *Version vectors* (per-replica counters): they tell you whether two versions are causally ordered or genuinely concurrent — they do not merge for you, they hand both siblings to your application to resolve (shopping cart: union the items). *CRDTs*: data types (counters, sets, sequences) whose merge function is commutative, associative and idempotent, so replicas provably converge with no coordination — the machinery behind Google Docs-style editors and Redis CRDT.`,
    },
    {
      type: 'intuition',
      title: 'Partitioning: three ways to decide where a row lives',
      md: `Sharding splits the data horizontally: each shard holds a subset of rows, together they hold everything. The only question is *how you decide*.

- **By key range.** Shard 1 holds A–F, shard 2 holds G–M, and so on; sorted within each shard. **Wins:** range scans are cheap — "all events in March" hits one shard. **Loses:** ranges are rarely uniform, and monotonic keys are lethal. Shard by timestamp and every insert is "now", so 100% of writes land on the newest shard while the rest sit cold. That is the single most common sharding mistake.
- **By hash of key.** Route by \`hash(key) mod N\`, or better, a ring. **Wins:** even distribution regardless of how skewed the key values are; kills the monotonic-key hotspot. **Loses:** neighbouring keys scatter, so range scans must hit every shard.
- **By directory (lookup table).** An explicit map from key → shard, kept in a coordination service (ZooKeeper, etcd) and cached in the clients. **Wins:** total control — move one noisy tenant to its own shard, split a range without touching anything else, run heterogeneous hardware. **Loses:** an extra hop, and the directory becomes a critical dependency that must be replicated and cached carefully.
- Real systems compose: Cassandra **hashes** the partition key across nodes, then **range-sorts** rows inside a partition. Even spread outside, cheap scans inside — which is exactly why choosing the partition key is the whole design.`,
    },
    {
      type: 'intuition',
      title: 'The shard key: your highest-stakes decision',
      md: `You can add indexes later. You can add replicas later. Changing the shard key means rewriting every row and every query while the system is live.

Three properties, all required:

- **High cardinality** — enough distinct values to spread over any future cluster size. \`country\` has ~200 values and no room to grow.
- **Even load distribution** — no value carrying a large share of traffic. Even key spread is not even *load* spread.
- **Present in your most common queries** — otherwise the router cannot tell which shard to ask, so it asks **all of them and merges**: a **scatter-gather**. One scatter-gather is fine. A scatter-gather on your hottest endpoint means your p99 is now the slowest of 64 shards, every single request.

The **celebrity / hot-shard problem**: \`user_id\` looks perfectly even until one account has 100M followers and every write fans out through its partition. Mitigations, in the order you should offer them:

- **Cache the hot entity** in front of the shard — cheapest, fixes read hotspots entirely.
- **Split the hot key only:** append a suffix, \`(celebrity_id, 0..99)\`, turning one partition into 100. Reads must now fan out over 100 sub-keys, so apply this to *known-hot keys only*, tracked in a small list.
- **Isolate the whale:** directory-based routing lets you give one tenant or one account its own shard, and the noisy neighbour stops hurting everyone else.
- **Change the algorithm, not the key:** for celebrity fan-out specifically, stop fanning out on write and pull their posts at read time (covered in the feed case study).`,
    },
    {
      type: 'intuition',
      title: 'The operational bill people forget to mention',
      md: `Every one of these is a follow-up question waiting to happen.

- **Cross-shard joins basically do not exist.** Matching rows across machines means shipping data over the network per query. You either *denormalize* (copy the joined fields into the row and chase them on update), *co-locate* (give a user and their orders the same shard key so the join stays local), or push analytics to a warehouse where joins are cheap again.
- **Cross-shard transactions are worse.** Two-phase commit gives you atomicity but blocks holding locks if the coordinator dies mid-commit — an availability hole. A **saga** replaces the transaction with a sequence of local commits plus explicit compensating actions ("refund the payment"), which means intermediate states are visible. Avoid needing it; design shard boundaries so transactions stay inside one shard. (Both are unpacked in the resilience module.)
- **Rebalancing.** Never rehash the whole cluster to add a node. Pre-create a fixed, large number of **logical partitions** (say 1024) and map many of them to each physical node; adding a node just moves whole partitions — a file copy — and the routing function never changes. Throttle the copy, or the rebalance becomes the outage.
- **Every shard needs its own replicas.** 64 shards with 2 followers each is 192 machines, 64 independent failover procedures, 64 backup streams, and one schema migration that has to run 64 times without drifting.`,
    },
    {
      type: 'intuition',
      title: 'Consistent hashing: the fix for "we added one node"',
      md: `Route with \`hash(key) mod N\` and the routing answer depends on N. Change N and you change the answer *for almost every key at once*.

- Go from 4 nodes to 5. A key stays put only when \`k mod 4 == k mod 5\` — which happens for 1 key in 5. **80% of your data must move**, live, while serving traffic. For a cache tier that means an 80% miss rate slamming the database at the exact moment you were trying to add capacity.
- **The ring.** Hash servers *and* keys into the same space (0 … 2³²−1) and bend it into a circle. A key belongs to the **first server clockwise** from its position.
- Add a server: it lands somewhere on the circle and takes over exactly the arc between itself and its counter-clockwise neighbour. Only **K/N** keys move — the ones in that arc. Everybody else stays home, because the routing rule never mentioned N.
- Remove a server: its arc spills to the next node clockwise. Again only that node's keys move, and no other key changes owner.
- **Virtual nodes** are the production detail. With one point per server the arcs come out wildly uneven (see the run below: 3,046 vs 39,169 keys on a 5-node ring). Place each server at 100–256 points instead and the law of large numbers evens it out. Two bonuses: a departing node's load spreads across *many* survivors instead of dumping on one neighbour, and you can weight a machine that is twice as big by giving it twice as many points.`,
    },
    {
      type: 'math',
      intro: 'The arithmetic, before the code confirms it.',
      latex: [
        'P(\\text{key stays}) = P(k \\bmod 4 = k \\bmod 5) = \\tfrac{1}{5} \\;\\Rightarrow\\; 80\\%\\ \\text{of keys move}',
        '\\text{ring, } N \\to N+1: \\quad \\mathbb{E}[\\text{keys moved}] = \\frac{K}{N+1}',
        '4 \\to 5 \\text{ nodes},\\ K = 100{,}000: \\quad \\frac{100{,}000}{5} = 20{,}000 = 20\\%',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'mod-N vs the ring — 100,000 keys, one node added (real output)',
      code: `import hashlib, bisect

def h(s):                                  # deterministic 32-bit hash
    return int(hashlib.md5(s.encode()).hexdigest()[:8], 16)

def build_ring(nodes, vnodes):             # ring = sorted list of (angle, owner)
    r = sorted((h(f'{n}#{v}'), n) for n in nodes for v in range(vnodes))
    return [a for a, _ in r], [n for _, n in r]

def ring_owner(key, angles, owners):       # first ring point clockwise
    return owners[bisect.bisect(angles, h(key)) % len(owners)]

KEYS = [f'user:{i}' for i in range(100_000)]
OLD = [f'node{i}' for i in range(4)]
NEW = OLD + ['node4']                      # grow the cluster by ONE machine

mv = sum(OLD[h(k) % 4] != NEW[h(k) % 5] for k in KEYS)
print(f'mod-N        moved {mv:6d}/100000 = {mv/1000:.1f}%')

for v in (1, 150):
    ao, oo = build_ring(OLD, v)
    an, on = build_ring(NEW, v)
    mv = sum(ring_owner(k, ao, oo) != ring_owner(k, an, on) for k in KEYS)
    load = {n: 0 for n in NEW}
    for k in KEYS:
        load[ring_owner(k, an, on)] += 1
    print(f'ring vnodes={v:<4} moved {mv:6d}/100000 = {mv/1000:.1f}%'
          f'   per-node load {min(load.values())}..{max(load.values())} (ideal 20000)')

# --- actual output -------------------------------------------------
# mod-N        moved  79729/100000 = 79.7%
# ring vnodes=1    moved  20809/100000 = 20.8%   per-node load 3046..39169 (ideal 20000)
# ring vnodes=150  moved  18174/100000 = 18.2%   per-node load 17673..25014 (ideal 20000)`,
      annotations: {
        7: 'One physical node is placed at `vnodes` positions on the ring. That single parameter is the difference between the last two output lines.',
        11: 'The entire routing rule: binary-search the sorted ring for the first point clockwise, wrapping at the end. O(log(N x vnodes)) per lookup.',
        17: 'The naive router. Note it never asks where a key USED to live — the modulus changed, so the answer changed for nearly everyone.',
        31: '79.7% vs the predicted 80%. mod-N does not "rebalance"; it reshuffles.',
        32: '20.8% moved — the K/N prediction — but look at the load column: one node holds 3,046 keys and another holds 39,169. Correct movement, useless balance.',
        33: '150 virtual nodes per server: movement stays at ~K/N and the spread collapses to 17.6k-25k. This is why every production ring uses vnodes.',
      },
    },
    { type: 'visual', component: 'ConsistentHashRing', props: {} },
    {
      type: 'note',
      md: `**Drive it, do not just look at it.** Press *+ Add server* once: server D lands on the ring, and the readout compares the keys the ring moved against what naive mod-N would have moved — the same gap the Python run measured, at toy scale. Now click a server and remove it: only *its* arc changes owner, and the readout confirms the neighbours were untouched. Finally toggle **virtual nodes ×3** and watch the two \`keys/server\` bars: with one point per server the arcs are lumpy, with three each they even out. That bar is the 3,046-vs-39,169 problem, visible.`,
    },
    {
      type: 'note',
      md: `**Where consistent hashing actually runs.** *Distributed caches* — memcached client libraries hash keys onto a ring so adding a cache node does not cold-start the tier. *Dynamo-style databases* — Cassandra, Riak, DynamoDB place data on a ring with vnodes; that ring is also how they pick the N replicas (the next N distinct nodes clockwise). *Load balancers* — Envoy's ring-hash and Maglev keep a user pinned to the same backend across deploys, which is what makes sticky sessions and local caches survive. *CDNs* — edge nodes choose which peer holds an object by ring position, so a cache miss goes to a predictable sibling rather than to origin.`,
    },
    {
      type: 'intuition',
      title: 'The capacity arithmetic an interviewer expects',
      md: `Messaging app. 500M messages a day, ~400 bytes of payload per row. You get sixty seconds and a whiteboard.

1. **Storage per row.** 400 B payload plus indexes and per-row overhead — use ×1.5 → **600 B**. Say the multiplier out loud; indexes are routinely half your disk.
2. **Storage per day and per year.** 500M × 600 B = **300 GB/day** → ×365 ≈ **110 TB/year**. Retain two years → **220 TB** of primary data.
3. **Shard count.** A node has 8 TB of SSD; never plan past ~50% (compaction, index bloat, headroom to survive a neighbour's failover) → **4 TB usable**. 220 TB ÷ 4 TB = 55 → round up to **64 shards** (a power of two, so growth is a clean split).
4. **QPS.** 500M ÷ 86,400 ≈ **5,800 writes/s** average; peak is 2–3× → **~17,400 writes/s**. Reads are typically 10× writes → ~58,000/s average, **~174,000/s peak**.
5. **Which resource binds?** At ~5,000 writes/s per node you would need only 4 nodes for throughput, but 55 for storage. **Storage binds — 64 shards.**
6. **Machines, not shards.** Each shard needs its own replicas: 64 × (1 leader + 2 followers) = **192 machines**. Spread the 174k peak reads across those and it is ~900 reads/s per node — comfortable.

The one-line summary interviewers wait for: *"Storage binds before throughput here, so 64 shards, 192 machines, and I would pre-create 1024 logical partitions so growth is a remap and not a resplit."*`,
    },
    {
      type: 'math',
      intro: 'The same estimate as formulas — memorize the shape, not the numbers.',
      latex: [
        '\\text{bytes/day} = \\text{rows/day} \\times \\text{bytes/row} \\times \\text{index factor}',
        '5\\times10^{8} \\times 400\\,\\text{B} \\times 1.5 = 300\\,\\text{GB/day} \\;\\Rightarrow\\; 110\\,\\text{TB/year}',
        '\\text{shards} = \\left\\lceil \\frac{\\text{total bytes}}{\\text{usable bytes/node}} \\right\\rceil = \\left\\lceil \\frac{220\\,\\text{TB}}{4\\,\\text{TB}} \\right\\rceil = 55 \\to 64',
        '\\text{peak QPS} \\approx \\frac{5\\times10^{8}}{86{,}400} \\times 3 \\approx 17{,}400\\ \\text{writes/s}',
        '\\text{machines} = \\text{shards} \\times (1 + \\text{followers}) = 64 \\times 3 = 192',
      ],
    },
  ],
  quiz: [
    {
      question: 'Reads are slow. The database sits at 70% CPU and the product team is nervous. What is your first move?',
      options: [
        { text: 'Shard the biggest table', explanation: 'The most expensive, least reversible rung, chosen before anyone has looked at a query plan. This is the answer that ends interviews.' },
        { text: 'Add three read replicas', explanation: 'Rung 3, and it may well help — but replicas multiply a bad query plan across three more machines and hand you replication lag for free.' },
        { text: 'EXPLAIN the top ten queries and fix the missing indexes and N+1 loops', explanation: 'Correct. Rung 1 is nearly free, instantly reversible, and it resolves most "we need to scale" incidents outright. Measure before you buy machines.' },
        { text: 'Migrate to Cassandra', explanation: 'A rewrite that trades away joins, transactions and ad-hoc queries to fix a problem nobody has diagnosed yet.' },
      ],
      correct: 2,
    },
    {
      question: 'A user sees a comment, refreshes, and it disappears — then a third refresh brings it back. Which guarantee was violated?',
      options: [
        { text: 'Read-your-own-writes', explanation: 'Close, but that anomaly is about not seeing YOUR OWN write. Here the user already saw the data and then lost it — the data was somebody else\'s write.' },
        { text: 'Monotonic reads', explanation: 'Correct. Successive reads landed on replicas with different lag, so the user\'s view of time went backwards. Fix: sticky routing — hash the user to one replica so they always read the same copy.' },
        { text: 'Consistent prefix reads', explanation: 'That is about seeing writes out of causal order (an answer before its question), usually across partitions — not about data appearing and disappearing.' },
        { text: 'Linearizability of the leader', explanation: 'The leader is fine. Every read here was served by a follower; the leader never disagreed with itself.' },
      ],
      correct: 1,
    },
    {
      question: 'A payments ledger must not lose an acknowledged write when the leader dies. What is the honest cost of the standard fix?',
      options: [
        { text: 'Nothing — modern replication is fast enough', explanation: 'Durability is always paid for in round trips. Claiming it is free is the tell that you have not run it.' },
        { text: 'Reads become slower', explanation: 'Read path is untouched. Synchronous replication taxes writes, not reads.' },
        { text: 'You must shard first', explanation: 'Unrelated. Sharding is about write volume and storage; this is about durability on failover.' },
        { text: 'Semi-synchronous replication: every write pays one network round trip, and if the sync follower is slow, writes slow with it', explanation: 'Correct. One follower acks synchronously so every committed write exists on two machines; the price is added write latency and a dependency on that follower being healthy (hence automatic promotion into the sync slot).' },
      ],
      correct: 3,
    },
    {
      question: 'After a failover, the OLD leader comes back — it was only unreachable, not dead — and starts accepting writes again. What prevents corruption?',
      options: [
        { text: 'Synchronous replication', explanation: 'Sync replication protects against losing the write tail. It says nothing about two nodes both believing they are leader.' },
        { text: 'Fencing tokens: each leadership change increments a number, and storage rejects writes carrying a stale token', explanation: 'Correct. The zombie leader still holds the old token, so its writes are refused at the storage layer without any node needing to coordinate. This is the standard answer to split-brain.' },
        { text: 'A longer failover timeout', explanation: 'It reduces how often you failover unnecessarily, but once a failover has happened, a returning old leader is exactly as dangerous.' },
        { text: 'Read replicas', explanation: 'Replicas serve reads; they have no say in who is allowed to write.' },
      ],
      correct: 1,
    },
    {
      question: 'A leaderless store runs N=3. You configure W=3, R=1. What did you buy, and what did you break?',
      options: [
        { text: 'Faster writes, slower reads', explanation: 'Backwards. Waiting for all three replicas is the SLOW write configuration; R=1 is the fast read.' },
        { text: 'Strong consistency in all cases', explanation: 'W+R>N only guarantees overlap. Sloppy quorums, concurrent writes and clock skew still leak — a quorum is not linearizability.' },
        { text: 'The fastest possible reads, but any single replica being down blocks every write', explanation: 'Correct. R=1 answers from one node, but W=3 requires all three, so the write path now has zero fault tolerance: tolerated failures = N − max(W,R) = 0.' },
        { text: 'Nothing changes — only W + R > N matters', explanation: 'The sum controls correctness; the split between W and R controls latency and which side survives a failure. Both matter.' },
      ],
      correct: 2,
    },
    {
      question: 'Orders are sharded by `user_id`. Support\'s busiest tool looks up an order by `order_id`. What happens?',
      options: [
        { text: 'Every lookup becomes a scatter-gather across all shards, so p99 equals the slowest shard', explanation: 'Correct. Without the shard key the router cannot pick a shard, so it asks all of them and merges. Fine occasionally, fatal on a hot path. Fix: a secondary index mapping order_id → user_id, or embed the shard hint inside order_id.' },
        { text: 'The query fails', explanation: 'It works — that is the trap. It works and quietly costs 64× the resources.' },
        { text: 'The router falls back to the leader', explanation: 'Leader/follower is the replication axis. Shard routing is a separate decision; there is no "leader shard" holding everything.' },
        { text: 'Nothing — hash sharding handles any key', explanation: 'Hashing decides WHERE a key lands. It cannot invert order_id into user_id.' },
      ],
      correct: 0,
    },
    {
      question: 'On a consistent hash ring, what problem do virtual nodes actually solve?',
      options: [
        { text: 'They reduce the fraction of keys that move when a node joins', explanation: 'That fraction is already K/N with or without vnodes — the measured run showed 20.8% vs 18.2%, essentially the same. Movement was never the issue.' },
        { text: 'They remove the need for replication', explanation: 'Unrelated. Each ring position still needs its own replicas; vnodes only change which node owns which arc.' },
        { text: 'They make hashing faster', explanation: 'More points means a slightly larger structure to binary-search. Speed is not the argument.' },
        { text: 'Uneven arcs: with one point per server, load ranged 3,046 to 39,169 keys; with 150 points it tightened to 17.6k–25k — and extra points let you weight bigger machines', explanation: 'Correct. Random placement of a handful of points is lumpy. Many points per server average out, spread a departing node\'s load across many survivors, and give you a knob for heterogeneous hardware.' },
      ],
      correct: 3,
    },
    {
      question: '500M rows/day at 600 bytes each (indexes included), retained 2 years, on nodes with 4 TB of usable disk. Shards?',
      options: [
        { text: '~8', explanation: 'That would be about one month of data. Check the multiplication: 300 GB/day is 110 TB/year.' },
        { text: '~14', explanation: 'That is one year divided by 8 TB raw — two mistakes: one year instead of two, and no headroom on the disk.' },
        { text: '~64 (55 rounded up), and 192 machines once every shard has two followers', explanation: 'Correct. 300 GB/day → 110 TB/year → 220 TB retained; 220 / 4 = 55 → 64 for a clean power of two. Then remember replicas: 64 × 3 = 192 machines, which is the number people forget to say.' },
        { text: '~220', explanation: 'That is total terabytes, not shards — divide by what one node can usefully hold.' },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Take me up the database scaling ladder. Why is sharding last?',
      answer:
        'In order: (1) indexes and query tuning — EXPLAIN the top queries, kill full scans and N+1 loops; free and reversible, and it resolves most incidents. (2) Caching in front of hot reads — a 90% hit rate is a 10× reduction in database load, paid for in staleness and invalidation. (3) Read replicas — read throughput scales with replica count, paid for in replication lag and its named anomalies. (4) Vertical scaling — a bigger box is one reboot and it is the last move that keeps the system simple: real joins, real transactions, one thing to operate. (5) Sharding, which is the only rung that scales writes and storage. It is last because it is the only one you cannot undo: you lose cheap joins, multi-row transactions, global uniqueness and auto-increment IDs, and every shard becomes its own database with its own replicas, failover, backups and migrations. The framing I would give: rungs 1–4 buy time, rung 5 buys write capacity and charges you in permanent complexity.',
      isCaseBased: false,
    },
    {
      question: 'Case: support tickets say "my comment vanishes right after I post it, then comes back". Postgres, one leader, three async replicas behind a load balancer. Debug it and fix it.',
      answer:
        'The self-healing is the fingerprint: the write committed (nothing was lost) but the immediate read was load-balanced to a replica that had not applied it yet — a read-your-own-writes violation. Confirm by correlating ticket timestamps with replica lag metrics, and by reproducing: write, then read each replica directly by address. Fixes, cheapest first: (1) carry the write\'s LSN back to the client and have the router only pick replicas whose applied LSN is at or past it, falling back to the leader — precise, per-request; (2) the coarse version — route a user\'s reads to the leader for ~1 second after any write of theirs, keyed by session; (3) surgical — have just the comment widget read the leader, leaving the heavy anonymous read traffic on replicas. Also add sticky routing per user so they at least get monotonic reads and never watch time run backwards. What I would not do is switch to synchronous replication globally: that taxes every write in the system to fix one UI path, and one slow follower would then stall all writes.',
      isCaseBased: true,
    },
    {
      question: 'Name the replication lag anomalies and their fixes. Be precise.',
      answer:
        'Three, each a different guarantee. Read-your-own-writes: you do not see your own write because your read hit a lagging follower — fix by routing that user\'s reads to the leader for a short window after their write, or by passing the write\'s log position as a token and selecting only replicas that have applied it. Monotonic reads: you saw a value and then a later read did not show it, because the second read hit a more-lagged replica; time appears to go backwards — fix with sticky routing, hashing the user to one replica so their view can be stale but never regresses. Consistent prefix reads: writes are observed out of causal order — an answer arrives before its question, because the two writes lived on different partitions — fix by keeping causally related writes in one partition or tracking the dependency explicitly. The point worth making: these are per-request guarantees you can buy individually, instead of paying for global strong consistency everywhere.',
      isCaseBased: false,
    },
    {
      question: 'Synchronous, asynchronous, semi-synchronous — pick one for a payments ledger and defend it.',
      answer:
        'Semi-synchronous, and I would say why the other two lose. Fully async gives the lowest write latency but the leader\'s un-shipped tail dies with it — for a ledger that means acked payments disappearing, which is unacceptable. Fully synchronous to all followers means every write waits for every replica, so one slow node stalls the entire write path and availability collapses as you add replicas. Semi-sync waits for exactly one follower, so every acked write exists on at least two machines for the cost of a single round trip (~1 ms same-AZ), and if that follower degrades another is promoted into the sync slot so writes keep flowing. Under follow-up "make it cross-region": I would keep the sync follower in the same region and replicate across regions asynchronously, because a 30–70 ms cross-region round trip on every payment write is usually a worse business outcome than the residual risk — and if regulation demands cross-region durability, I would say so and budget the latency explicitly rather than pretend it is free.',
      isCaseBased: false,
    },
    {
      question: 'Case: the leader died at 3am, automatic failover promoted a follower, and by morning ~900 orders are missing while some order IDs appear to belong to the wrong customers. Explain and prevent.',
      answer:
        'Two failures stacked. First, async replication plus promotion: the new leader never received the old leader\'s final commits, and the standard recovery is to discard them — those are the 900 acked-then-deleted orders. Second, the discarded rows freed their auto-increment primary keys, the new leader reissued the same IDs to new orders, and anything caching by ID — a Redis layer, a CDN, a downstream index — served the old occupant\'s data under the new ID. That is the GitHub MySQL/Redis incident in miniature. Prevention: a semi-synchronous follower so no acked write exists on only one machine; non-reusable identifiers (UUIDs or Snowflake IDs) so a discarded row can never have its key handed out again; fencing tokens incremented on every leadership change so a returning old leader cannot write; and caches keyed or versioned so a reused key cannot alias. Operationally: alert on the discarded-write count at promotion instead of letting it stay silent, and tune the failover timeout against observed p99 so a load spike does not trigger promotions that make the spike worse.',
      isCaseBased: true,
    },
    {
      question: 'When is multi-leader replication worth the conflicts it creates?',
      answer:
        'Three cases where the alternative is worse. Multi-datacenter writes: users write to their local leader at local latency and each region keeps accepting writes when the link or the other region dies — with single-leader, everyone outside the leader\'s region pays the cross-region round trip on every write. Offline clients: a phone editing a calendar is literally a leader with hours of lag, and there is no design in which it refuses writes while offline. Collaborative editing: every open browser tab is a leader. The cost is write conflicts, which single-leader never has because the leader serializes everything. The mitigation I would reach for first is avoidance — route all writes for a given record or user to one home leader so concurrent edits to the same row are structurally rare — and only then merging: version vectors to detect genuine concurrency and hand siblings to the application, or CRDTs where the data type makes the merge provably convergent. What I would avoid is treating multi-leader as a generic write-scaling technique; it scales writes only when the writes naturally partition by region or by user.',
      isCaseBased: false,
    },
    {
      question: 'Explain W + R > N. Is a quorum the same as strong consistency?',
      answer:
        'Each key lives on N replicas; a write is acked after W confirm, a read waits for R responses and takes the newest version. If W + R > N the two sets must overlap in at least one node, so every read sees at least one replica carrying the latest acked write. N=3, W=2, R=2 is the standard: one node can be down on either path. Tolerated failures are N − max(W, R), which is why W=N, R=1 gives the fastest reads and zero write fault tolerance. And no, it is not strong consistency. Reasons to name: sloppy quorums accept writes on non-home nodes when the home replicas are unreachable, and during that window the overlap guarantee simply does not hold; concurrent writes still produce siblings that something must resolve; read repair is best-effort and timing-dependent; and clock-based ordering drifts. A quorum bounds staleness in the common case — it does not give you linearizability, and saying that distinction out loud is what separates a memorized formula from understanding.',
      isCaseBased: false,
    },
    {
      question: 'Why is last-write-wins dangerous, and what would you use instead?',
      answer:
        'LWW keeps the write with the highest timestamp and discards the others, so it always converges — that is its only virtue. It loses data silently in three ways: the discarded write was already acked to a user who has no idea it is gone; "highest timestamp" depends on wall clocks that drift between machines, so the winner can be the write that actually happened first; and for genuinely concurrent writes there is no true order to recover, so the choice is arbitrary by definition. It is acceptable when writes are immutable events with unique keys (nothing is overwritten) or when a lost update genuinely does not matter, like a cached counter. Alternatives: version vectors — per-replica counters that distinguish causally-ordered from concurrent versions and hand both siblings to the application to merge, the shopping-cart union being the classic. CRDTs — types whose merge is commutative, associative and idempotent, so replicas converge with no coordination at all; used for counters, sets and collaborative text. If I had to pick a default: avoid the conflict by homing each record to one leader, and use LWW only where I can name why a lost write is harmless.',
      isCaseBased: false,
    },
    {
      question: 'Hash, range, or directory partitioning — pick one for each of: a time-series metrics store, a global user table, a multi-tenant B2B SaaS.',
      answer:
        'Metrics store: range on time, but never time alone as the top-level key — a pure time range makes the newest shard absorb 100% of writes. Cassandra\'s composition is the answer: hash a (metric_id, day-bucket) partition key across nodes for even writes, then range-sort by timestamp inside the partition so "last 24 hours" is one sequential scan. Global user table: hash of user_id — high cardinality, even spread, and it appears in essentially every query, so lookups route to exactly one shard. There are no meaningful range scans over user IDs, which is precisely what hashing costs you. Multi-tenant SaaS: directory. Tenant sizes differ by orders of magnitude, so hashing tenant_id gives even key spread but wildly uneven load; a lookup table lets me place a whale tenant on its own shard, colocate thousands of small ones, and move a noisy neighbour without rehashing anything. The price is an extra hop and a coordination service to keep highly available, which I would mitigate by caching the map in the clients and versioning it.',
      isCaseBased: false,
    },
    {
      question: 'Case: a multi-tenant analytics SaaS where 0.1% of tenants hold 60% of the data and drive most of the traffic. Design the sharding.',
      answer:
        'Hashing tenant_id fails here: keys spread evenly, load does not, and one whale melts its shard while the cluster idles. I would use directory-based routing over a fixed set of ~1024 logical partitions. Small tenants are hashed into shared partitions; whales are explicitly pinned, one per partition or one per physical shard, and their partition mapping is a row in the directory I can change without moving anyone else. Inside a whale, tenant_id alone is too coarse, so the shard key becomes a composite — (tenant_id, sub-key) where the sub-key is something the queries already filter on, a project or a date bucket — so one tenant\'s data spreads across several partitions and its queries still route rather than scatter. Operationally: track per-partition bytes and QPS, and promote a growing tenant to a dedicated partition before it becomes a hotspot, throttling the copy so the rebalance is not the outage. Tradeoffs I would volunteer: the directory is now a critical dependency (replicate it, cache it in clients, version it so a stale client is detectable), cross-tenant analytics becomes scatter-gather and belongs in a warehouse rather than a live query, and each shard still needs its own replicas — so the machine count is shards × replication factor, not shards.',
      isCaseBased: true,
    },
    {
      question: 'Case: your memcached tier has 12 nodes and is at capacity two days before Black Friday. You need 4 more. Walk me through it.',
      answer:
        'The danger is not the nodes, it is the routing. If clients use hash(key) mod N, going 12 → 16 changes the modulus for nearly every key: an almost-total cache miss storm arriving at the database at the exact moment you were adding capacity. That is how a capacity increase causes the outage. So: step zero, verify the client library is using a consistent hash ring, not mod-N — every major memcached client offers ketama or equivalent. With a ring, adding four nodes moves roughly 4/16 = 25% of keys, and it moves them as four separate arcs rather than one reshuffle. Then: use virtual nodes (100–200 points per server) so the four new arcs land evenly instead of one new node inheriting a huge arc; add the nodes one at a time, watching origin load and hit rate settle between each; and pre-warm if the miss traffic is still too spiky — either read-through with a short lock so only one request per key hits the database (stampede protection), or replay a sample of traffic against the new nodes before they take live reads. Tradeoff to say out loud: even a perfect ring gives up ~25% of the cache; if the database cannot absorb that transient, do it in two waves of two nodes, or accept the miss cost off-peak rather than the day before Black Friday.',
      isCaseBased: true,
    },
    {
      question: 'Estimate the data layer: 500M messages/day, ~400 bytes per row, two years retention. How many shards, how many machines, and what binds?',
      answer:
        'Row size first: 400 B payload × 1.5 for indexes and overhead ≈ 600 B — indexes are routinely half the disk, so I state the multiplier rather than hide it. 500M × 600 B = 300 GB/day → ~110 TB/year → 220 TB retained. Nodes have 8 TB SSD but I plan at 50% for compaction, index bloat and headroom to absorb a failover, so 4 TB usable: 220 / 4 = 55 shards, rounded to 64 so growth is a clean doubling. Throughput: 500M / 86,400 ≈ 5,800 writes/s average, ×3 for peak ≈ 17,400/s; reads at 10:1 give ~174,000/s peak. At ~5,000 writes/s per node, throughput alone would need only 4 nodes — so storage binds, not QPS, and that is the sentence the interviewer is waiting for. Machines: every shard needs its own replicas, so 64 × (1 leader + 2 followers) = 192, which puts peak reads at ~900/s per node — comfortable. Final detail: pre-create 1024 logical partitions mapped onto the 64 nodes so adding capacity is a partition remap and file copy, never a rehash of the cluster.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'The scaling ladder, in order', back: 'Indexes and query tuning → caching → read replicas → vertical scaling → sharding. Sharding is LAST: it is the only rung that scales writes, and the only one you cannot undo.' },
    { front: 'What sharding actually costs you', back: 'Cheap joins, multi-row transactions, global uniqueness and auto-increment IDs, plus operational simplicity: every shard has its own replicas, failover, backups and migrations.' },
    { front: 'Single-leader replication — what it scales', back: 'Writes → leader only; followers apply its log in order; reads from any replica. Scales READS and survives failures. Never scales writes: every node applies every write.' },
    { front: 'The three lag anomalies + fixes', back: 'Read-your-own-writes → read the leader briefly after a write, or use an LSN token. Monotonic reads → sticky routing per user. Consistent prefix → keep causal writes in one partition.' },
    { front: 'Sync vs async vs semi-sync', back: 'Async: fastest, loses the un-shipped tail on leader death. Sync: no lost writes, but one slow follower stalls all writes. Semi-sync (production default): exactly one follower acks — two copies for one round trip.' },
    { front: 'Failover hazards', back: 'Promoting a lagging follower discards acked writes (and freed auto-increment IDs get reused). Split-brain when the old leader returns → fencing tokens: a number that increments per leadership change; storage rejects stale tokens.' },
    { front: 'Quorum rule', back: 'W + R > N forces read and write sets to overlap. N=3, W=2, R=2 is standard. Tolerated failures = N − max(W, R). Not strong consistency: sloppy quorums and concurrent writes still leak.' },
    { front: 'Conflict resolution, ranked', back: 'Last-write-wins: converges, silently discards acked writes, depends on drifting clocks. Version vectors: detect concurrency, hand siblings to the app. CRDTs: merge is provably convergent, no coordination.' },
    { front: 'Shard key checklist + the celebrity problem', back: 'High cardinality, even LOAD spread, present in your common queries (else every read is scatter-gather). Celebrity: even keys ≠ even load — cache the hot entity, salt the hot key (id, 0..99), or isolate the whale on its own shard.' },
    { front: 'mod-N vs consistent hashing (measured)', back: 'hash % N, 4→5 nodes: 79.7% of 100k keys move. Ring: 20.8% = K/N. But 1 point per server gave 3,046–39,169 keys/node; 150 virtual nodes tightened it to 17.6k–25k and let you weight bigger machines.' },
  ],
  mindmapMarkdown: `- Scaling the Database
  - The ladder (sharding LAST)
    - Indexes + query tuning (EXPLAIN, N+1)
    - Caching (90% hit = 10x less DB load)
    - Read replicas (read scale, lag)
    - Vertical scaling (buys time, keeps it simple)
    - Sharding (only rung that scales writes)
  - Replication
    - Single-leader = the default
    - Writes to leader, reads from followers
    - Lag: ms healthy, seconds under burst
    - Sync (durable, slow) / async (fast, lossy) / semi-sync (production)
  - Lag anomalies
    - Read-your-own-writes → leader window or LSN token
    - Monotonic reads → sticky routing per user
    - Consistent prefix → same partition for causal writes
  - Failover
    - Promoting a laggard discards acked writes
    - Reused auto-increment IDs leak wrong data
    - Split-brain → fencing tokens
    - Timeout too short = failover storm
  - Multi-leader
    - Multi-DC, offline clients, collab editing
    - Write conflicts: avoid by homing, else merge
  - Leaderless (Dynamo)
    - W + R > N overlap; N=3 W=2 R=2
    - Read repair + anti-entropy
    - Sloppy quorum breaks the guarantee
    - LWW loses data / version vectors / CRDTs
  - Partitioning
    - Key range: cheap scans, timestamp hotspot
    - Hash: even spread, no range scans
    - Directory: full control, extra hop
  - Shard key
    - Cardinality + even LOAD + in every query
    - Missing key = scatter-gather p99
    - Celebrity: cache, salt (id,0..99), isolate whale
  - Operational bill
    - Cross-shard joins: denormalize or co-locate
    - Cross-shard txn: 2PC blocks, saga compensates
    - Rebalance via fixed logical partitions
    - Every shard needs its own replicas
  - Consistent hashing
    - mod-N: 4→5 moves ~80% of keys
    - Ring: owner = next server clockwise, K/N move
    - Virtual nodes: even arcs + weighted machines
    - Used by memcached, Cassandra, Envoy, CDNs
  - Capacity arithmetic
    - 500M/day x 600B = 300 GB/day = 110 TB/yr
    - 220 TB / 4 TB usable = 55 → 64 shards
    - Peak 17.4k writes/s; storage binds, not QPS
    - 64 x 3 replicas = 192 machines`,
}

export default m
