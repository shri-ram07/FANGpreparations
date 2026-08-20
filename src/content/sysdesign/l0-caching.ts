import type { Module } from '../types'

const m: Module = {
  id: 'sysdesign-l0-caching',
  subjectId: 'sysdesign',
  level: 0,
  title: 'Caching: Every Layer, Every Strategy',
  whyItMatters:
    'Caching is the cheapest large win in system design — a few lines of code that cut latency by 10x and remove most of the load from your database. It is also the fastest way to serve wrong data to a million people. Interviewers know both halves, so "add a cache" earns nothing; naming the layer, the strategy, the eviction policy, the invalidation plan, and the failure mode earns the round. This module is the whole toolkit.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'Why caching is the highest-leverage thing you can do',
      md: `A library holds two million books. Two hundred of them account for most checkouts. You do not reorganize the building — you put those two hundred on the front desk.

- **Reads dominate.** A typical product reads far more than it writes: 100:1 is common, 1000:1 for feeds, catalogs, and profiles. Optimizing the read path is optimizing almost everything.
- **The same items come back.** Request popularity follows a **Zipf** distribution — a few items are asked for constantly, a long tail almost never. Roughly 20% of items serve 80% of traffic.
- Those two facts together are what makes a cache work: a *small* amount of memory covers a *large* fraction of requests.
- One change buys two things: **latency** (a 40 ms query becomes a 1 ms memory read) and **capacity** (that query never reaches the database at all, so your existing DB now serves 10x the traffic).
- Nothing else in system design has that ratio of benefit to effort. Which is exactly why the interview pressure is on the costs, not the benefits.
- The cost, in one line: **a cache is a second copy of the truth, and copies go stale.** Everything after this section is about paying that bill.`,
    },
    {
      type: 'intuition',
      title: 'The layers, outermost to innermost',
      md: `A request can be answered at six different places. The earlier it is answered, the cheaper it is — so design from the outside in.

- **Browser cache** — 0 ms, 0 network. The fastest cache is the request you never send.
- **CDN / edge PoP** — 10–30 ms. A server in the user's city answers instead of your datacenter.
- **Reverse-proxy cache** (nginx, Varnish) — inside your datacenter, in front of the app. Absorbs identical requests before any application code runs; also where you cache full rendered pages.
- **Application cache** (Redis, Memcached) — 0.5–2 ms over the network, **shared by your whole fleet**. This is "the cache" people mean, and the one you configure most.
- **Local in-process cache** — nanoseconds, no network at all. Fastest by far, but **per-instance**: 50 app servers hold 50 slightly different copies of the truth.
- **Database buffer pool** — the database's own RAM cache of disk pages, managed for you (see the DBMS query-execution module). It is why the second run of a query is always faster than the first.`,
    },
    {
      type: 'note',
      md: `**Browser cache, the three headers that matter.** \`Cache-Control: max-age=31536000, immutable\` means the browser sends **no request at all** for a year — the strongest cache there is. \`ETag\` + \`If-None-Match\` is weaker: the request still goes out, but the server can answer \`304 Not Modified\` with no body — you save bandwidth, not the round trip. And the classic trap: \`no-cache\` does **not** mean "do not cache" — it means "cache it, but revalidate every time"; only \`no-store\` means do not keep it. One more: \`private\` restricts storage to the user's own browser, \`public\` allows shared caches (CDN, proxy) to keep it. Mark a personalized page \`public\` by accident and a CDN will happily serve one user's dashboard to the next visitor.

**Cache-busting a filename** is the trick that makes the year-long \`max-age\` safe. You ship \`app.9f2c1b.js\` — a hash of the file's contents inside its name. Deploy a change and the filename changes, so the HTML points at a **new URL** that no cache has ever seen. You never invalidate anything; you change the key. Hold that thought — it comes back as **versioned keys** later, and it is the single cleanest answer to cache invalidation.`,
    },
    {
      type: 'intuition',
      title: 'CDN: caching in the user\'s city',
      md: `A **CDN** is a few hundred **PoPs** (points of presence — small datacenters worldwide). DNS or anycast routes the user to the nearest one, which serves from its own cache and only asks your **origin** on a miss.

- Classic job: static assets — images, JS, CSS, video segments. Increasingly also **dynamic** content: cached HTML, API responses with short TTLs, and edge functions that run your code at the PoP.
- Physics, not software: a user in Mumbai hitting a Virginia origin pays ~250 ms round trip *before* any work happens. A Mumbai PoP answers in 10 ms. No amount of backend tuning beats moving the bytes closer.
- **Origin shield**: designate one mid-tier PoP that all other PoPs must go through on a miss. Without it, a cold object makes 200 edge PoPs each fetch from your origin — 200 identical requests. With it, they collapse into one. It is stampede protection at the CDN layer.
- **Cache key design** decides your hit rate. The key defaults to the URL plus a few headers, and every distinct key is a separate stored object.
- The query-parameter trap: \`/logo.png?utm_source=twitter\` and \`?utm_source=email\` are two different keys for one identical image. Fifty marketing tags means fifty copies, a hit rate divided by fifty, and fifty times the origin load. **Fix: strip unknown query parameters from the cache key** and whitelist only the ones that actually change the response (\`?w=400\`).
- Same failure via headers: \`Vary: User-Agent\` splits your cache across thousands of UA strings. Vary only on something with a handful of values (\`Accept-Encoding\`).`,
    },
    {
      type: 'intuition',
      title: 'Cache-aside: the default, and why',
      md: `**Cache-aside** (also called lazy loading): the application owns the cache. On a read it checks the cache; on a miss it reads the database, writes the value into the cache, and returns it.

- Why it is the default: it is a few lines of code, it works with any store, and it caches **only what is actually requested** — memory goes to real traffic, not to guesses.
- **Resilient to cache failure.** Redis dies and every request simply becomes a miss: the site is slower, but alive. That property alone wins most arguments.
- Cost 1 — **the first request per key is slow**: it pays the cache lookup *plus* the full database read. After a deploy or a cache restart, *every* key is a first request at once.
- Cost 2 — **stale data is possible.** Anything that writes the database without going through your cache code (a batch job, an admin tool, a migration) leaves the old value sitting there until its TTL.
- **Read-through** is the same read semantics with the plumbing moved: the cache library or proxy holds a loader function and fetches from the DB on a miss itself. Less repeated application code, one place to fix bugs — but you need a cache that supports it, and now the cache is on the critical path for correctness, not just speed.`,
    },
    {
      type: 'intuition',
      title: 'Write strategies: through, behind, ahead',
      md: `Reads are the easy half. How a write reaches the cache is where the tradeoffs get sharp.

- **Write-through** — write the cache and the database together, synchronously. That key is never stale, and reads after a write are always correct. Costs: every write pays both systems, and you fill memory with keys **nobody ever reads**. Great for write-once-read-often data, wasteful for a high-write, low-read table.
- **Write-behind / write-back** — write the cache, acknowledge the client immediately, flush to the database asynchronously in batches. Fastest writes there are, absorbs traffic spikes, and batching cuts database load hugely. Cost: **if the cache node dies before the flush, those writes are gone.** Only for data you can afford to lose (view counters, analytics, last-seen timestamps) or with a durable log in front of it.
- **Refresh-ahead** — the cache proactively re-fetches a hot key shortly before its TTL expires, so no user ever pays for the miss. Buys latency at the price of refreshing things nobody asked for.
- The sentence to say out loud: **"cache-aside plus a TTL is my default; I would only move to write-through if reads must never see a stale value, and to write-behind only for data I can lose."** A named default plus a named trigger is what a senior answer sounds like.`,
    },
    { type: 'visual', component: 'CacheSimulator', props: { capacity: 4 } },
    {
      type: 'note',
      md: `**Read the simulator as a capacity lesson.** The stream is a working set of exactly four keys (A B C D looping) with two intruders (E, and the warm-up order). At **capacity 4** it lands **11 hits out of 18 — a 61% hit rate**, and once the loop settles it hits every single time. Drop capacity to **3** and LRU evicts each key *just before* it is needed again: **2 hits out of 18, an 11% hit rate**. Same policy, same requests, memory one slot smaller — and the cache went from useful to useless. That is **thrashing**, and it is exactly what an undersized Redis looks like in production: you are paying for a cache and receiving misses *plus* the extra latency of asking it.

**This maps directly onto Redis \`maxmemory-policy\`.** \`allkeys-lru\` is the standard choice for a pure cache — evict the least recently used of everything. \`allkeys-lfu\` when popularity is stable rather than bursty. \`volatile-lru\` only evicts keys that have a TTL set — a trap, because if you forget TTLs, Redis has nothing it is allowed to evict and **writes start failing with OOM**. \`noeviction\` (the default!) returns an error instead of evicting: correct when Redis is your database, catastrophic when it is your cache. Setting \`maxmemory\` and choosing this policy deliberately is a real interview answer.`,
    },
    {
      type: 'intuition',
      title: 'Eviction: who gets thrown out when memory is full',
      md: `- **LRU** (least recently used) — evict whatever was touched longest ago. The default nearly everywhere because **recency predicts reuse** in almost every real workload, and it is cheap to approximate (Redis samples a handful of keys rather than maintaining a perfect list). Its weakness: one big **scan** — a batch job reading every row once — walks in and flushes your entire working set.
- **LFU** (least frequently used) — evict the least-requested key. Better when popularity is stable, and immune to that scan problem. Needs **aging**, or an item that was hot last Tuesday keeps its counter forever and never leaves.
- **FIFO** — evict the oldest inserted, regardless of use. Simple, and ignores popularity completely: a key served a million times is evicted on schedule anyway. Rarely the right choice.
- **Random** — evict anything. Sounds absurd, performs surprisingly close to LRU on Zipf traffic, and costs nothing to track. Genuinely used when metadata overhead matters.
- **TTL is orthogonal to all of them.** Eviction is what happens when *memory* runs out; TTL is what happens when *time* runs out. A key can die from either, and you want both: TTL bounds how stale data can get, eviction bounds how much memory you spend.`,
    },
    {
      type: 'intuition',
      title: 'Failure mode 1: cache stampede (thundering herd)',
      md: `One hot key expires. Between that instant and the moment someone repopulates it, **every** request for it is a miss — and they all go to the database at once.

- The arithmetic is brutal: a key served 5,000 times a second, backed by a 40 ms query. In the 40 ms after expiry, ~200 requests arrive and all 200 issue the identical query.
- Your connection pool holds 100. Request 101 queues, latency climbs, clients time out and **retry** — and retries add load to a system that is already drowning.
- Nothing failed. The cache simply stopped hiding a load the database was never sized to carry.
- Three fixes, in the order you should offer them. Step through the diagram below first.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Cache stampede, and the single-flight fix',
        notice: 'One hot key, 5,000 req/s, a 40 ms database query behind it. Watch how many queries reach Postgres in each version.',
        leftLabel: 'requests',
        rightLabel: 'cache + database',
        frames: [
          {
            note: 'Steady state. The key feed:home holds the result of a 40 ms query with a 60 s TTL. Every one of 5,000 requests per second is answered from Redis in about 1 ms. Postgres is idle — this is the cache doing exactly its job.',
            stack: [{ name: '5000 req/s', to: 'redis' }],
            heap: [
              { id: 'redis', value: 'feed:home = [...]  TTL 2s left', label: 'Redis — hot key, every request hits' },
              { id: 'db', value: '0 queries/s', label: 'Postgres — idle' },
            ],
          },
          {
            note: 'The TTL runs out and Redis deletes the key. Nothing is wrong yet: the next request will miss and repopulate it. The problem is that there is never just one next request.',
            stack: [{ name: '5000 req/s', to: 'redis' }],
            heap: [
              { id: 'redis', value: 'feed:home = (expired)', label: 'key gone', danger: true, freed: true },
              { id: 'db', value: '0 queries/s', label: 'Postgres — idle' },
            ],
          },
          {
            note: 'The repopulating query takes 40 ms. In that window another ~200 requests arrive, all miss, and all fire the SAME query. The pool holds 100 connections, so request 101 onward queues. Latency climbs, clients time out and retry, and the retries add more load. The cache did not fail — it stopped hiding a load the database was never sized for.',
            stack: [
              { name: 'req #1 MISS', to: 'db', danger: true },
              { name: 'req #2 MISS', to: 'db', danger: true },
              { name: '... req #200 MISS', to: 'db', danger: true },
            ],
            heap: [
              { id: 'redis', value: 'feed:home = (still empty)', label: 'nobody has repopulated yet', danger: true },
              { id: 'db', value: '200 identical queries, pool 100/100', label: 'Postgres — saturated', danger: true },
            ],
          },
          {
            note: 'The fix: single-flight. Every request that misses first tries SET lock:feed:home NX EX 10 — an atomic "set only if absent". Exactly one wins and is allowed to query the database. The other 199 lose the race and either wait briefly or serve the previous value, which is deliberately kept around past its logical expiry for this exact purpose.',
            stack: [
              { name: 'req #1 won the lock', to: 'db' },
              { name: 'req #2 waits', to: 'redis' },
              { name: '... req #200 waits', to: 'redis' },
            ],
            heap: [
              { id: 'redis', value: 'lock:feed:home = held by #1', label: 'single-flight lock, 10 s safety expiry' },
              { id: 'db', value: '1 query, pool 1/100', label: 'Postgres — calm' },
            ],
          },
          {
            note: 'The winner writes the fresh value with a jittered TTL — 60 s plus a random 0-10 s, so a thousand keys populated together never expire together — then releases the lock. The waiters read from Redis. One database query covered the entire spike. Cheaper variants of the same idea: never expire hot keys at all and refresh them from a background job, or use probabilistic early expiry so one unlucky request refreshes slightly before the deadline while everyone else still hits.',
            stack: [{ name: '200 requests', to: 'redis' }],
            heap: [
              { id: 'redis', value: 'feed:home = [...]  TTL 67s', label: 'repopulated once, TTL jittered' },
              { id: 'db', value: '1 query total', label: 'Postgres — survived' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Failure modes 2, 3, 4: penetration, avalanche, hot keys',
      md: `- **Cache penetration** — requests for keys that **do not exist**. The cache misses (correctly, there is nothing to store), so every single one reaches the database. An attacker requesting random user IDs at 10,000 QPS bypasses your cache entirely. **Fix: cache the negative result** — store a null marker with a short TTL (30–60 s) so the second request for a missing key is a hit. At huge key spaces, put a **Bloom filter** in front: a small probabilistic structure that answers "definitely absent" or "maybe present", so definitely-absent lookups never touch the database.
- **Cache avalanche** — a large number of keys expiring at the *same moment*. Classic cause: a warm-up script loading a million keys at 09:00 with an identical 1-hour TTL, so at 10:00 all million expire in one second and the whole cache tier is cold at once. **Fix: jitter the TTLs** — \`ttl = 3600 + random(0, 600)\` spreads the expiries over ten minutes. Same fix protects against the other avalanche: a cache node restarting empty (mitigate with replicas and gradual warm-up).
- **Hot key** — one celebrity key that a single shard cannot serve. Your keys are spread evenly across ten Redis shards, but one key gets 40% of all traffic, so one shard runs at 100% while nine idle. Even key distribution is not even *load* distribution. **Fixes: replicate the key** under N suffixed names (\`post:99:copy0\` … \`copy9\`, read a random one, write all) so the load spreads across shards; or put a **short-TTL local in-process cache** in front of Redis — one second of local caching collapses a million QPS into one request per server per second.
- Notice the shape of all four: each is a normal cache behaving correctly, under a traffic pattern nobody sized for. That is why they get asked.`,
    },
    {
      type: 'intuition',
      title: 'Cache invalidation: the genuinely hard problem',
      md: `The joke ("there are only two hard problems: cache invalidation and naming things") is a real engineering warning. Four strategies, cheapest to cleanest:

1. **TTL only** — let entries expire. Zero invalidation code, and staleness is *bounded and known*: a 60 s TTL means "at most one minute behind". Wrong for anything that must be right immediately, and note that a TTL both bounds staleness **and** creates the expiry stampede you just saw.
2. **Explicit delete-on-write** — every code path that writes the database also deletes the cache key. Correct when complete, and **easy to get incomplete**: a batch job, an admin panel, a data migration, or a second service writing the same table leaves a stale value that never heals. *Always keep a TTL underneath as a seatbelt* — it turns "stale forever" into "stale for a minute".
3. **Versioned keys** — put a version or content hash in the key: \`product:42:v7\`. A write bumps the version, so readers ask for \`v8\`, which is simply cold. You **never invalidate anything** — old keys age out through LRU or TTL. This is the same trick as the hashed JS filename, and it is often the cleanest answer. Cost: memory briefly holds both versions, and you need a cheap way to know the current version (a counter on the row, or its \`updated_at\`).
4. **Delete, do not update.** When you do invalidate, remove the key rather than writing the new value into it. Two concurrent writers can set the cache out of order and leave the loser's value there permanently; a delete has no ordering to get wrong, and the next reader repopulates from the source of truth.`,
    },
    {
      type: 'note',
      md: `**The ordering trap — this is an interview favourite.** Update the database **first**, then delete the cache. Never the reverse.

Do it backwards (delete cache, then update DB) and a reader can slip into the gap: it misses, reads the **old** row from the database, and writes that stale value back into the cache — where it now sits until its TTL, contradicting a database that has already been updated. You created exactly the bug you were trying to prevent.

**The race that survives even the correct order**: a reader misses and reads value V1; before its cache write lands, a writer commits V2 and deletes the (still empty) key; then the reader's slow write finally stores V1. Stale again. This needs the read to be slower than an entire write cycle, so it is rare — but it is real, and naming it is a senior signal. Mitigations, in the order you should offer them: (1) a short TTL, so the window is bounded — usually enough; (2) **delayed double delete** — delete the key again ~500 ms after the write, killing anything that landed late; (3) versioned keys, which sidestep the whole race because a stale write goes to a key nobody will ever read again.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Where a cache stops helping — run the numbers',
      code: `# A miss pays BOTH the cache lookup AND the DB read:
#   effective = hit_ms + (1 - h) * db_ms     vs.  db_ms with no cache at all
# So the break-even hit rate is just hit_ms / db_ms. Nothing else matters.

def report(name, hit_ms, db_ms):
    print(f"{name}: cache {hit_ms} ms, DB {db_ms} ms -> break-even h = {hit_ms/db_ms:.0%}")
    for h in (0.0, 0.2, 0.4, 0.6, 0.8, 0.95, 0.99):
        eff = hit_ms + (1 - h) * db_ms
        d = eff - db_ms
        verdict = "WORSE" if d > 0.01 else ("break-even" if abs(d) <= 0.01 else "better")
        print(f"   h={h:4.0%}  effective {eff:6.2f} ms  ({d:+.2f} ms vs no cache)  {verdict}")
    print()

report("Expensive query (5-table join)", 1.0, 80.0)
report("Cheap query (indexed PK lookup)", 2.0, 5.0)

# ------------------------------ real output ------------------------------
# Expensive query (5-table join): cache 1.0 ms, DB 80.0 ms -> break-even h = 1%
#    h=  0%  effective  81.00 ms  (+1.00 ms vs no cache)  WORSE
#    h= 20%  effective  65.00 ms  (-15.00 ms vs no cache)  better
#    h= 40%  effective  49.00 ms  (-31.00 ms vs no cache)  better
#    h= 60%  effective  33.00 ms  (-47.00 ms vs no cache)  better
#    h= 80%  effective  17.00 ms  (-63.00 ms vs no cache)  better
#    h= 95%  effective   5.00 ms  (-75.00 ms vs no cache)  better
#    h= 99%  effective   1.80 ms  (-78.20 ms vs no cache)  better
#
# Cheap query (indexed PK lookup): cache 2.0 ms, DB 5.0 ms -> break-even h = 40%
#    h=  0%  effective   7.00 ms  (+2.00 ms vs no cache)  WORSE
#    h= 20%  effective   6.00 ms  (+1.00 ms vs no cache)  WORSE
#    h= 40%  effective   5.00 ms  (+0.00 ms vs no cache)  break-even
#    h= 60%  effective   4.00 ms  (-1.00 ms vs no cache)  better
#    h= 80%  effective   3.00 ms  (-2.00 ms vs no cache)  better
#    h= 95%  effective   2.25 ms  (-2.75 ms vs no cache)  better
#    h= 99%  effective   2.05 ms  (-2.95 ms vs no cache)  better`,
      annotations: {
        2: 'The key modelling insight: a miss is not "no benefit", it is a NET LOSS — you paid for the cache round trip and still did the database read.',
        8: 'There is no separate hit term. Every request pays hit_ms; only the (1 - h) fraction pays db_ms on top of it.',
        27: 'Break-even 40%: when the database read is already fast, a Redis hop two milliseconds away needs a genuinely good hit rate to earn its place.',
        29: 'This is the row people do not expect. At a 20% hit rate this cache makes every request 1 ms SLOWER on average — plus the memory bill, plus the staleness bugs. Measure before you believe.',
      },
    },
    {
      type: 'intuition',
      title: 'Sizing and measurement: hit rate is THE metric',
      md: `You cannot reason about a cache you are not measuring. Four numbers, and one of them matters more than the rest.

- **Hit rate = hits / (hits + misses).** This is the metric. A well-tuned cache on Zipf traffic sits at 80–95%+. Below ~70% something is wrong: keys are too specific, the TTL is too short, or memory is too small.
- The code above gives the honest rule: a cache helps only when **hit rate > cache latency / database latency**. In front of an 80 ms join, almost any hit rate wins. In front of a 5 ms primary-key lookup, **40% is exactly break-even** — below that you are adding latency, memory cost, and staleness bugs in exchange for nothing.
- Also track **evictions/sec** (a spike means the working set outgrew the box — hit rate is about to fall off the cliff you saw at capacity 3), **memory used vs maxmemory**, and **p99 of the miss path** (misses are where your tail latency lives).
- **Memory sizing arithmetic.** 50M products × 2 KB serialized = 100 GB — far too big for one node. But the 80/20 rule says the top 20% serve ~80% of requests: 10M × 2 KB = **20 GB**, which fits a single 32 GB Redis node with headroom. You do not cache the dataset; you cache the **working set**.
- Two corrections to that arithmetic interviewers like to hear: leave **~30% headroom** (fragmentation, replication buffers, spikes), and remember Redis spends **roughly 50–100 bytes of overhead per key** — which dominates if your values are small.`,
    },
    {
      type: 'note',
      md: `**Say this before you choose a strategy, not after.** A cache is a *deliberate correctness compromise for speed*: you are choosing to sometimes serve data that is out of date. So the first question is never "Redis or Memcached" — it is **"how stale can this specific data be?"**

The answer varies enormously within one product, and stating it picks the strategy for you. A product name or a follower count: minutes are fine, so TTL-only is enough. A user's own profile after they edit it: they must see their change immediately, so delete-on-write, or read-your-own-writes from the source. An account balance or remaining inventory at checkout: zero staleness tolerated, so do not cache the value at all — cache the expensive things *around* it. Pricing shown before a legally binding checkout: cache the display, re-validate at the transaction.

The interview-ready sentence: **"before caching this I would ask what staleness the product tolerates — that number picks the strategy, and if the answer is zero, the honest design is not to cache it."**`,
    },
  ],
  quiz: [
    {
      question: 'Your Redis sits 2 ms away and the database query it fronts is a 5 ms indexed primary-key lookup. The measured hit rate is 20%. What is the effect of the cache?',
      options: [
        { text: 'It cuts average latency by about 20%', explanation: 'A hit rate is not a latency reduction. You must account for what a MISS costs — and a miss pays the cache lookup on top of the full database read.' },
        { text: 'Average latency is 6 ms versus 5 ms without it — the cache is making things slower', explanation: 'Correct. effective = 2 + 0.8 × 5 = 6 ms, against 5 ms with no cache at all. Break-even here is hit_ms / db_ms = 40%, so 20% is a net loss — plus memory cost and staleness risk.' },
        { text: 'Neutral — hits and misses cancel out', explanation: 'They do not cancel: a hit saves 3 ms, a miss costs an extra 2 ms, and misses are four times as common here.' },
        { text: 'It always helps; a cache can never add latency', explanation: 'It can, and this is exactly how. Every miss pays the cache round trip for nothing.' },
      ],
      correct: 1,
    },
    {
      question: 'A key served 5,000 times per second expires. The query behind it takes 40 ms. What happens in the next 40 ms?',
      options: [
        { text: 'One request repopulates the cache; the rest wait for it automatically', explanation: 'Nothing coordinates them by default. Each request independently sees a miss and independently queries the database.' },
        { text: 'Requests are served stale until the refresh completes', explanation: 'Only if you deliberately built that (keeping the old value past its logical expiry). A plain TTL deletes the value outright — there is no stale copy left.' },
        { text: 'About 200 requests all miss and fire the same query at once, saturating the connection pool', explanation: 'Correct — a cache stampede. 5,000/s × 0.04 s = 200 concurrent identical queries against a pool of ~100 connections. Fixes: single-flight lock, probabilistic early expiry, or background refresh of hot keys.' },
        { text: 'Redis blocks new reads until the key is rewritten', explanation: 'Redis has no idea the key is popular or that anyone is fetching it. It just answers "not found" to everyone.' },
      ],
      correct: 2,
    },
    {
      question: 'You must invalidate a cached row after a write. Which ordering is correct, and why?',
      options: [
        { text: 'Update the database, then delete the cache key', explanation: 'Correct. Delete-first opens a window where a reader misses, reads the OLD row, and repopulates the cache with stale data that then outlives the write. DB-first keeps that window from existing (a rarer race remains — a slow reader writing back a pre-update value — bounded by a short TTL or a delayed second delete).' },
        { text: 'Delete the cache key, then update the database', explanation: 'This is the trap. Between the delete and the commit, a reader misses, reads the pre-update row, and caches it — leaving the cache stale after the write lands.' },
        { text: 'Update the database, then write the new value into the cache', explanation: 'Better than delete-first, but writing (rather than deleting) lets two concurrent writers land out of order and leave the loser\'s value in place permanently. Delete, do not update.' },
        { text: 'Order does not matter as long as both happen', explanation: 'Order is the entire question. The two orderings have different failure windows and different failure durations.' },
      ],
      correct: 0,
    },
    {
      question: 'An attacker requests 10,000 random non-existent user IDs per second. Your cache hit rate barely moves and the database is dying. What is happening and what fixes it?',
      options: [
        { text: 'Cache avalanche — jitter the TTLs', explanation: 'Avalanche is many EXISTING keys expiring together. Nothing here ever expired, because nothing was ever cached.' },
        { text: 'Hot key — replicate the key across shards', explanation: 'A hot key is one key with too much traffic. This is the opposite: ten thousand distinct keys, each requested once.' },
        { text: 'Cache penetration — cache the negative result with a short TTL, or add a Bloom filter', explanation: 'Correct. Keys that do not exist are never stored, so every request is a guaranteed miss straight through to the database. Storing a null marker for 30-60 s stops repeats; a Bloom filter answers "definitely absent" before you even ask Redis.' },
        { text: 'The eviction policy should be changed to LFU', explanation: 'No policy helps: there is nothing in the cache to evict or retain. The requests are for data that does not exist.' },
      ],
      correct: 2,
    },
    {
      question: 'Your CDN hit rate for a single logo image is 4%. Every request reaches the origin. Most likely cause?',
      options: [
        { text: 'The TTL is too short', explanation: 'Possible, but a 4% hit rate on one static image points at something splitting the object rather than expiring it.' },
        { text: 'Marketing query parameters are part of the cache key, so each utm_source value creates a separate cached copy', explanation: 'Correct. /logo.png?utm_source=X is a distinct key per value, so one image becomes dozens of separate objects, each cold. Fix: strip unknown query parameters from the cache key and whitelist only the ones that change the response.' },
        { text: 'The CDN has too few PoPs', explanation: 'More PoPs would slightly LOWER per-PoP hit rate for cold objects, not cause a 4% floor. And an origin shield exists precisely to handle the many-PoP case.' },
        { text: 'The image is too large to cache', explanation: 'CDNs cache multi-gigabyte video segments. Size is not the issue at logo scale.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is LRU the default eviction policy in most caches, and what breaks it?',
      options: [
        { text: 'Recency predicts reuse on real traffic and it is cheap to approximate; a full-table scan breaks it by flushing the working set', explanation: 'Correct. LRU exploits temporal locality and needs only sampling to approximate well. Its weakness is a one-pass scan (a nightly batch job) that touches everything once, evicting the genuinely hot keys in favour of data nobody will ask for again.' },
        { text: 'It guarantees the highest possible hit rate for any workload', explanation: 'No policy does. LFU beats LRU on stable popularity, and even random is competitive on Zipf traffic.' },
        { text: 'It is the only policy that respects TTLs', explanation: 'TTL is orthogonal to eviction. Every policy honours expiry; eviction is what happens when MEMORY runs out, not time.' },
        { text: 'It never evicts frequently used items', explanation: 'It absolutely can. A key hit a million times yesterday and not touched since is the first thing LRU throws out — that is exactly what LFU exists to fix.' },
      ],
      correct: 0,
    },
    {
      question: 'You run 60 application instances, each with a local in-process cache holding user permissions for 5 minutes. An admin revokes a user\'s access. What is the real problem?',
      options: [
        { text: 'The local cache is too slow for permissions', explanation: 'Local in-process caching is the fastest tier there is — nanoseconds, no network. Speed is not the issue.' },
        { text: 'There is no way to invalidate 60 independent copies, so the revoked user keeps access on some instances for up to 5 minutes', explanation: 'Correct. A local cache is per-instance: 60 servers hold 60 truths and nothing can delete a key inside another process. For security-relevant state, use a shared cache you can invalidate centrally (or a very short TTL and accept the named window).' },
        { text: 'Local caches cannot store permission data', explanation: 'They can store anything. The problem is the invalidation story, not the data type.' },
        { text: 'The TTL should be increased to reduce database load', explanation: 'That makes the security window longer, which is the exact opposite of what this situation needs.' },
      ],
      correct: 1,
    },
    {
      question: 'A warm-up script loads 1M keys into Redis at 09:00 with an identical 3600 s TTL. At 10:00 the site falls over. Best fix?',
      options: [
        { text: 'Increase the TTL to 24 hours', explanation: 'It only moves the cliff to 09:00 tomorrow. Every key still expires in the same second.' },
        { text: 'Switch the eviction policy to allkeys-lfu', explanation: 'Eviction policy governs what leaves when MEMORY is full. These keys left because TIME ran out — the policy is not involved.' },
        { text: 'Jitter the TTLs: ttl = 3600 + random(0, 600), spreading expiry over ten minutes', explanation: 'Correct. This is a cache avalanche — a million simultaneous expiries leaving the tier cold at once. Randomising the TTL de-synchronises them; combine with a single-flight lock so each individual hot key still only triggers one refill.' },
        { text: 'Add more Redis nodes', explanation: 'More memory does not help when the keys were deleted by expiry rather than evicted. Every node would empty at 10:00 together.' },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Walk me through the caching layers a request can hit, from the user\'s browser down to disk.',
      answer:
        'Six, outermost first. (1) Browser cache — controlled by Cache-Control and ETag; 0 ms, 0 network, and the best cache is the request you never send. (2) CDN edge PoP — 10-30 ms, serves static assets and increasingly cached HTML and API responses; an origin shield collapses misses from many PoPs into one origin fetch. (3) Reverse-proxy cache (nginx, Varnish) inside my datacenter, absorbing identical requests before application code runs. (4) Application cache — Redis or Memcached, ~1 ms over the network, shared by the whole fleet; this is the tier I actually configure. (5) Local in-process cache — nanoseconds, but per-instance, so N servers hold N slightly different truths and there is no way to invalidate one from outside. (6) The database buffer pool, its own RAM cache of pages, managed for me. The design principle: the earlier a request is answered, the cheaper it is, so I push caching outward as far as the correctness requirements allow.',
      isCaseBased: false,
    },
    {
      question: 'Cache-aside versus write-through versus write-behind. Which is your default, and what would move you off it?',
      answer:
        'Cache-aside is my default: the app checks the cache, on a miss reads the database and populates it. It is a few lines of code, it caches only what is genuinely requested, and critically it degrades gracefully — if Redis dies, everything becomes a miss and the site is slow but alive. Its two costs are that the first request per key is slow and that any write path bypassing my invalidation code leaves stale data. Write-through (write cache and DB together) removes staleness for that key and makes reads-after-write correct, but every write pays both systems and you fill memory with keys nobody reads — I would move to it when reads must never see a stale value and the read:write ratio is high. Write-behind (write cache, ack, flush later in batches) gives the fastest writes and huge database load reduction through batching, but a cache node dying loses the un-flushed writes — so only for data I can afford to lose, like view counters and analytics, or with a durable log in front. Refresh-ahead sits alongside these: proactively refresh hot keys before expiry so users never pay for a miss.',
      isCaseBased: false,
    },
    {
      question: 'Case: design the cache invalidation strategy for a product detail page on an e-commerce site. Price, stock, title, images, and reviews all render together.',
      answer:
        'First I split the page by staleness tolerance, because one strategy for the whole page is the mistake. Title, description, images: change rarely, staleness of minutes is harmless — TTL-only, say 10 minutes, cached at the CDN too. Reviews and the aggregate rating: minutes are fine — TTL, and recompute the aggregate asynchronously. Price: staleness here is a legal and trust problem, so cache with a short TTL (30-60 s) AND delete-on-write from the pricing service, and re-validate the real price at checkout — the cart is the transaction boundary, the page is only a display. Stock: never cache the exact number; cache a coarse bucket ("in stock" / "low stock") with a short TTL and check the real count at add-to-cart. Mechanism: versioned keys — product:42:v7, where the version is the row\'s updated_at or a counter — so a write bumps the version and readers naturally ask for a cold key; I never invalidate, which means no missed invalidation path. Ordering, if I do use explicit invalidation: update the database first, then DELETE (not update) the key, and keep a TTL underneath as a seatbelt so any missed path heals within a minute. Follow-up I would pre-empt: an admin bulk price update touching 100k products must not delete 100k keys at once or I create an avalanche — so bump versions and let LRU reclaim the old ones.',
      isCaseBased: true,
    },
    {
      question: 'What is a cache stampede, and give me three fixes ranked by when you would use each.',
      answer:
        'A hot key expires and every request for it misses simultaneously, so they all hit the database with the same query. Concretely: 5,000 req/s against a 40 ms query means ~200 concurrent identical queries in the refill window, against a pool of maybe 100 connections — the pool saturates, latency spikes, clients time out and retry, and the retries make it worse. Fixes: (1) Single-flight / mutex — every misser tries SET lock:key NX EX 10; exactly one wins and repopulates while the others wait briefly or serve the previous value deliberately kept past its logical expiry. Simple, and the one I reach for first. (2) Probabilistic early expiry — each request refreshes with a probability that rises as the TTL approaches, so one unlucky request refreshes early while everyone else still hits; no locks, no coordination, elegant for very hot keys. (3) Never expire hot keys — refresh them from a background job so the user path never has a miss at all; best for a known, small set of hot keys, and it needs monitoring because a broken refresher serves stale data forever. And always jitter TTLs, so you are solving one key\'s stampede rather than a thousand keys\' avalanche.',
      isCaseBased: false,
    },
    {
      question: 'Case: your feed endpoint is fine at p50 but terrible at p99. Redis hit rate reads 95%. Where do you look?',
      answer:
        'A 95% average hit rate is consistent with a very bad tail — the 5% is where the p99 lives, so I stop looking at the average. Four hypotheses, checked in order. (1) The miss path itself: p99 is roughly the cost of a miss, so I measure the database query behind a miss — if it is 800 ms, the cache was hiding a query that was never acceptable. (2) Stampede on expiry: I check whether latency spikes correlate with TTL boundaries; if so, one key expiring is dragging hundreds of requests into a saturated pool. Fix with single-flight plus jitter. (3) Hot key on one shard: even key spread is not even load spread — I check per-shard CPU in Redis; if one node is at 100% while others idle, requests for that key are queueing behind each other. Fix by replicating the key under N suffixes or adding a one-second local cache in front. (4) Big values: a 5 MB serialized feed makes every hit slow to transfer and deserialize, and Redis is single-threaded per shard, so one large value blocks everyone behind it. Fix by storing IDs in the cache and hydrating them, or compressing. The general lesson I would state: hit rate is a mean, and tail latency is never explained by a mean.',
      isCaseBased: true,
    },
    {
      question: 'Someone proposes caching every database query in the application automatically. What do you say?',
      answer:
        'I would push back with arithmetic rather than opinion. A cache helps only when hit rate exceeds cache latency divided by database latency. In front of an 80 ms five-table join, break-even is about 1% — cache it, obviously. In front of a 5 ms indexed primary-key lookup with Redis 2 ms away, break-even is 40%: below that, the cache makes every request slower on average because a miss pays the Redis round trip AND the database read. Blanket caching guarantees a pile of low-hit-rate keys sitting under that line. Three more costs it ignores: memory spent on keys nobody re-reads, an invalidation obligation on every one of those keys (each a potential correctness bug), and a much harder debugging story because "is this stale?" now applies everywhere. My counter-proposal: measure, find the queries that are both expensive and repeated, and cache those specifically — usually a handful of endpoints carry most of the win.',
      isCaseBased: false,
    },
    {
      question: 'Explain eviction policies. Why LRU by default, when LFU, and how does TTL relate?',
      answer:
        'LRU evicts the least recently used entry. It is the default because temporal locality is real — recently used items are usually the ones about to be used again — and because it approximates cheaply: Redis samples a few keys and evicts the oldest of them rather than maintaining a perfect list. Its known weakness is scan resistance: a nightly batch job that reads every row once touches everything, so LRU evicts your genuinely hot working set in favour of data nobody will ever ask for again. LFU evicts by frequency instead, which fixes that and suits stable popularity, but it needs aging or last week\'s hot item keeps its counter forever and becomes immortal. FIFO ignores usage entirely — simple and rarely right. Random is surprisingly competitive on Zipf traffic and costs nothing to track. Crucially, TTL is orthogonal: eviction is what happens when memory runs out, TTL is what happens when time runs out, and a key can die either way. You want both — TTL bounds staleness, eviction bounds memory. In Redis this is the maxmemory-policy setting, and I would point out that the default, noeviction, makes writes fail with an error when full, which is correct for Redis-as-a-database and catastrophic for Redis-as-a-cache.',
      isCaseBased: false,
    },
    {
      question: 'Case: at 10:00 every morning your site goes down for two minutes. A warm-up job loads 1M keys into Redis at 09:00 with a one-hour TTL. Diagnose and fix.',
      answer:
        'That is a cache avalanche: a million keys created in the same second share an identical TTL, so they all expire in the same second, the entire cache tier goes cold at once, and every request falls through to a database sized for a 90% cache hit rate. The two-minute outage is how long the herd takes to refill it. Fix, layered: (1) Jitter — ttl = 3600 + random(0, 600), spreading expiry over ten minutes instead of one second. This alone probably ends the outage. (2) Single-flight per key, so that even within the spread, each individual hot key triggers exactly one database refill rather than hundreds. (3) Refresh-ahead for the known-hot subset — a background job re-populates them before expiry, so those never miss. (4) A load-shedding backstop: if the miss rate spikes past a threshold, serve stale-while-revalidate rather than queueing everything onto the database. I would also ask why the warm-up exists at all — if it is compensating for a cold restart, replicas plus gradual warm-up is the better structural answer.',
      isCaseBased: true,
    },
    {
      question: 'How do you size a cache? Give me the arithmetic.',
      answer:
        'Start from the working set, not the dataset. Say 50M products at 2 KB serialized: the full dataset is 100 GB, which is a bad target. Zipf says roughly the top 20% serve 80% of requests, so 10M x 2 KB = 20 GB gets me most of the benefit and fits a single 32 GB node. Then two corrections. First, headroom: I would size for about 70% utilisation to absorb fragmentation, replication buffers, and traffic spikes, so 20 GB of data wants ~28-32 GB of machine. Second, per-key overhead: Redis spends roughly 50-100 bytes of metadata per key, which is negligible for 2 KB values but dominates if I am caching 20-byte counters — 100M tiny keys can cost more in overhead than in data. Then I validate empirically rather than trusting the model: push traffic, watch the hit-rate curve as I vary maxmemory, and stop where the curve flattens — that knee is the working set, and paying for memory past it buys nothing. The operational signal afterwards is evictions per second: a sustained spike means the working set outgrew the box and the hit rate is about to collapse.',
      isCaseBased: false,
    },
    {
      question: 'Why is cache invalidation famously hard? Compare TTL, explicit deletion, and versioned keys.',
      answer:
        'It is hard because a cache is a second copy of the truth with no automatic link back to the source — the database has no idea your cache exists, so every path that changes data carries an obligation the type system will not enforce. TTL: zero code, and staleness is bounded and known ("at most 60 s behind"). Wrong when a user must see their own change immediately, and it creates expiry stampedes. Explicit delete-on-write: correct when complete, but completeness is the problem — a batch job, an admin tool, a migration, or a second service writing the same table all leave a stale value that never heals. I therefore always keep a TTL underneath as a seatbelt, converting "stale forever" into "stale for a minute". Versioned keys: put the version in the key (product:42:v7); a write bumps the version, so readers ask for a key that was never populated, and old keys age out through LRU. Nothing is ever invalidated, so there is no invalidation path to miss — which is why it is often the cleanest design, and it is the same trick as a content-hashed JS filename. Its costs are brief double memory and needing a cheap consistent source for the current version. One rule that applies to all three: when you do invalidate, DELETE the key rather than writing the new value, because concurrent writers can land out of order and leave the loser\'s value permanently in place.',
      isCaseBased: false,
    },
    {
      question: 'Case: a celebrity posts and one Redis shard hits 100% CPU while the other nine sit at 15%. Explain and fix.',
      answer:
        'This is the hot key problem: keys are distributed evenly by hash, but REQUESTS are not distributed evenly across keys. One post is taking, say, 40% of all traffic, and every request for it lands on the one shard that owns that key — so the cluster scales like a single machine for that key, and because Redis is single-threaded per shard, requests queue behind each other. Fixes, cheapest first. (1) A short-TTL local in-process cache in front of Redis: caching the celebrity post for one second locally collapses a million QPS into one request per app server per second — usually this alone solves it, and one second of staleness on a public post is free. (2) Key replication: store the value under N suffixed keys (post:99:copy0 ... copy9) which hash to different shards, read a random copy, and write all copies on update. Costs N times the memory and makes writes fan out. (3) A read-replica per shard, if the store supports serving reads from replicas — helps read-heavy hot keys without changing key layout. Detection matters too: I would need per-key or per-shard metrics (Redis hotkeys sampling, or client-side instrumentation) to know it is happening, because the aggregate hit rate looks perfectly healthy throughout.',
      isCaseBased: true,
    },
    {
      question: 'How do you decide what staleness is acceptable, and does that ever mean not caching?',
      answer:
        'I ask it before choosing any mechanism, because the answer picks the strategy. The question is per-field, not per-page: within one product page, the title tolerates ten minutes, the review count tolerates one minute, the price tolerates seconds and needs re-validation at checkout, and the exact stock count tolerates nothing. So the design is different caching for each. And yes, the honest answer is sometimes not to cache: an account balance, a remaining-inventory count at the point of purchase, or a permission check after a revocation should be read from the source of truth. When something is both hot and cannot be stale, I cache the expensive things around it — the rendered page, the product metadata, the join results — and read the single volatile value live, which usually turns out to be a cheap primary-key lookup anyway. The framing I would state explicitly: a cache is a deliberate correctness compromise bought for speed, so the design conversation should begin by naming the compromise, in seconds, out loud.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Why caching works at all (two facts)', back: 'Reads dominate writes (100:1 or more), and request popularity is Zipf — ~20% of items serve ~80% of traffic. So a small amount of memory covers a large fraction of requests.' },
    { front: 'The six cache layers, outermost to innermost', back: 'Browser → CDN edge PoP → reverse proxy (nginx/Varnish) → application cache (Redis/Memcached) → local in-process cache → database buffer pool.' },
    { front: 'no-cache vs no-store', back: 'no-cache = store it but revalidate every time (ETag / 304). no-store = never keep it. Only no-store actually disables caching.' },
    { front: 'Why a CDN cache key must ignore utm parameters', back: 'Each distinct query string is a separate cached object. Fifty utm values = fifty copies of one image, hit rate divided by fifty, origin load multiplied. Strip unknown params, whitelist the ones that change the response.' },
    { front: 'Cache-aside in one line, plus its killer feature', back: 'Check cache → on miss read DB → populate cache → return. Killer feature: if the cache dies, everything is just a miss — slower but alive.' },
    { front: 'Write-through vs write-behind', back: 'Write-through: cache + DB together — never stale, slower writes, caches things nobody reads. Write-behind: cache now, DB later in batches — fastest writes, but a node crash loses the un-flushed writes.' },
    { front: 'The four cache failure modes and their fixes', back: 'Stampede (hot key expires → herd): single-flight lock / early probabilistic expiry / background refresh. Penetration (missing keys): cache the null, or a Bloom filter. Avalanche (mass expiry): jitter the TTLs. Hot key (one shard melts): replicate the key, or a short-TTL local cache.' },
    { front: 'The invalidation ordering rule', back: 'Update the DB FIRST, then DELETE the cache key (never update it). Delete-first lets a reader repopulate with the pre-update value. A short TTL bounds the rarer surviving race.' },
    { front: 'Versioned keys', back: 'Put a version in the key (product:42:v7). A write bumps the version, readers request a cold key, old keys age out via LRU. You never invalidate, so there is no invalidation path to miss.' },
    { front: 'When does a cache stop helping?', back: 'When hit rate < cache_latency / db_latency, because a miss pays BOTH. Redis 2 ms in front of a 5 ms lookup breaks even at 40% — below that the cache adds latency. Hit rate is THE metric; healthy is 80-95%+.' },
  ],
  mindmapMarkdown: `- Caching: Every Layer, Every Strategy
  - Why it wins
    - Reads dominate writes (100:1+)
    - Zipf long tail: 20% of items = 80% of requests
    - Buys latency AND database capacity
    - Bill: a second copy of the truth goes stale
  - Layers (outermost first)
    - Browser: Cache-Control, ETag/304, no-cache vs no-store
    - Cache-busting filename = hashed URL
    - CDN: edge PoPs, origin shield, cache-key design
    - Query params shatter CDN hit rate
    - Reverse proxy: nginx / Varnish
    - App cache: Redis / Memcached, shared by the fleet
    - Local in-process: fastest, per-instance, uninvalidatable
    - DB buffer pool (see DBMS internals)
  - Strategies
    - Cache-aside: the default, survives cache death
    - Read-through: library owns the miss
    - Write-through: consistent, slow writes, caches unread keys
    - Write-behind: fastest writes, can lose data
    - Refresh-ahead: refresh hot keys before expiry
  - Eviction
    - LRU default: recency predicts reuse, scans break it
    - LFU: stable popularity, needs aging
    - FIFO and random
    - TTL is orthogonal: time vs memory
    - Redis maxmemory-policy, noeviction trap
  - Failure modes
    - Stampede: single-flight, early expiry, background refresh
    - Penetration: cache the null, Bloom filter
    - Avalanche: jitter the TTLs
    - Hot key: replicate key, local L1 cache
  - Invalidation
    - TTL: bounded, known staleness
    - Delete-on-write: correct but easy to miss a path
    - Versioned keys: never invalidate, change the key
    - Order: DB first, then DELETE (not update)
  - Sizing and measurement
    - Hit rate is THE metric (80-95%)
    - Break-even h = cache_ms / db_ms
    - Cache the working set, not the dataset
    - Headroom ~30%, per-key overhead 50-100 B
  - Consistency framing
    - A deliberate correctness compromise
    - Name the tolerable staleness BEFORE choosing
    - Zero tolerance = do not cache that value`,
}

export default m
