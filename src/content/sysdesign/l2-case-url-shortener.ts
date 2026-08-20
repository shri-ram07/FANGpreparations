import type { Module } from '../types'

const m: Module = {
  id: 'sysdesign-l2-case-url-shortener',
  subjectId: 'sysdesign',
  level: 2,
  title: 'Case Study: URL Shortener (and Pastebin)',
  whyItMatters:
    'This is the "hello world" of design interviews — and the module where you learn the METHOD, not just one answer. Seven steps, in order, every time: requirements, estimation, API, data model, HLD, deep-dive two components, bottlenecks. Candidates who jump straight to boxes-and-arrows lose the round even when the boxes are right. Run the script once here and you can run it on Twitter, Uber, or anything else the interviewer invents.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'The seven-step script — this is the whole subject',
      md: `Read this before the problem. The problem is just the excuse to practise the script.

1. **Requirements** — functional and non-functional, plus what you deliberately cut.
2. **Estimation** — QPS, storage, bandwidth. Numbers pick your architecture for you.
3. **API design** — the contract. Endpoints, status codes, errors.
4. **Data model** — tables, keys, and what does *not* go in the hot path.
5. **HLD** — the box diagram, with the write path and the read path drawn separately.
6. **Deep dive on two components** — the interviewer chooses, or you offer the two that actually decide the design.
7. **Bottlenecks and tradeoffs** — where it breaks first, and what you would trade next.

- This sequence is the script for **every** design question you will ever get. Memorise the order, not the answers.
- Each step below is posed as a **question first**. Stop, answer it out loud or on paper, *then* read on. Reading the answer without attempting it teaches you a URL shortener; attempting it teaches you the method.
- One warning that applies to all seven: an interviewer is grading your **reasoning under pressure**, not your recall of one diagram. Every mechanism you name needs four things attached — what problem it solves, how it works, what it costs, and when you would *not* use it.`,
    },
    {
      type: 'intuition',
      title: 'Step 1 — Requirements. Your turn first',
      md: `**Attempt this:** write down what the system must *do* (functional), what qualities it must have (non-functional), and three things you would cut from v1. Then read on.

Functional — what a user can do:

- **Shorten**: give a long URL, get back a short one (\`sho.rt/k7Qm2Xa\`).
- **Redirect**: hitting the short link sends the browser to the original URL.
- **Custom alias** (optional): the user picks \`sho.rt/summer-sale\` instead of a random code.
- **Expiry** (optional): the link stops working after a TTL.
- **Click analytics**: how many clicks, from where, from which referrer.

Non-functional — the qualities that shape the architecture:

- **Extremely read-heavy.** Roughly 100 reads per write. This single fact drives almost every later decision.
- **Low redirect latency.** The redirect sits on the critical path of *someone else's* page load. Target p99 under ~100 ms.
- **High availability.** A dead shortener breaks every link ever printed, tweeted, or put on a poster. Here availability beats consistency: a link resolvable a second late is fine; a link that will not resolve at all is a disaster.
- **Unpredictable codes**, if privacy matters. Sequential codes let anyone walk \`/1\`, \`/2\`, \`/3\` and read every link in the system.`,
    },
    {
      type: 'note',
      md: `**Asking clarifying questions IS part of the answer.** Silence here reads as "I have memorised one design". Three questions always pay: *What is the read-to-write ratio?* (it decides caching vs sharding). *Do users pick their own aliases?* (it adds a global-namespace contention problem). *Do links expire?* (it adds a cleanup subsystem). Then cut scope **out loud**: "No user accounts in v1 — but I will carry an \`owner_id\` column so adding them later is not a migration." Also cut: link editing, a web UI, real-time analytics dashboards, geo-routing. Saying what you cut and *why* proves the cut was deliberate, not ignorance. An interviewer will forgive a missing feature; they will not forgive not noticing it was missing.`,
    },
    {
      type: 'intuition',
      title: 'Step 2 — Estimation. Your turn first',
      md: `**Attempt this:** given **100M new URLs per day** and a **100:1 read-to-write ratio**, compute write QPS, read QPS, peak read QPS, and storage per year. Then read on. (The mechanics — seconds per day, rounding, per-row arithmetic — are drilled in the back-of-envelope estimation module in Level 1.)

- A day is 86,400 seconds. Round it to 100K if you like; interviewers want the order of magnitude, not the decimals.
- Writes: 100M / 86,400 ≈ **1,160 writes/sec**. That is nothing. One database handles it half asleep.
- Reads: 100 × that ≈ **116,000 reads/sec** sustained. Peak traffic runs 2–3× the average, so plan for **~350,000 reads/sec**.
- Storage: work out one row's bytes, multiply. See the math below.
- Bandwidth: a redirect response is just headers — roughly 500 bytes. 116K × 500 B ≈ **58 MB/s ≈ 0.5 Gbps**. Also nothing.`,
    },
    {
      type: 'math',
      intro: 'The arithmetic, written out. Do it this slowly in the interview — out loud, on the whiteboard.',
      latex: [
        '\\text{write QPS} = \\frac{100{,}000{,}000}{86{,}400} \\approx 1{,}160\\ \\text{writes/sec}',
        '\\text{read QPS} = 100 \\times 1{,}160 \\approx 116{,}000\\ \\text{reads/sec} \\quad \\Rightarrow \\quad \\text{peak} \\approx 350{,}000',
        '\\text{row} = \\underbrace{7}_{\\text{code}} + \\underbrace{100}_{\\text{long\\_url}} + \\underbrace{8}_{\\text{created}} + \\underbrace{8}_{\\text{expires}} + \\underbrace{8}_{\\text{owner}} = 131\\ \\text{B}',
        '131\\ \\text{B} \\times 4\\ (\\text{row overhead} + \\text{index}) \\approx 500\\ \\text{B/row}',
        '\\text{storage/day} = 10^{8} \\times 500\\,\\text{B} = 50\\ \\text{GB} \\quad \\Rightarrow \\quad \\approx 18\\ \\text{TB/year}',
        '\\text{redirect bandwidth} = 116{,}000 \\times 500\\,\\text{B} \\approx 58\\ \\text{MB/s} \\approx 0.5\\ \\text{Gbps}',
      ],
    },
    {
      type: 'intuition',
      title: 'What those numbers just told you',
      md: `Read the two figures side by side. They point in opposite directions, and that contrast *is* the design.

- **18 TB/year is boring.** That is a handful of commodity NVMe drives. One well-provisioned machine plus replicas holds several years of it. You shard for size when a *single node* can no longer hold or write the data — you are nowhere near that.
- **116K reads/sec is not boring.** A single relational database serves maybe 10–50K simple point lookups per second on good hardware. You are 3–10× over that before peak, and 10–30× over at peak.
- So the pressure is entirely on the **read path**, not on data volume. The answer is therefore **caching plus read replicas**, not sharding.
- The hot set is small too: even if 500M distinct links are clicked in a day, at ~150 bytes per cache entry that is 500M × 150 B ≈ **75 GB** — a small Redis cluster holds every link anyone actually clicks.
- Say this conclusion out loud: *"The data is small and cold; the traffic is large and hot. I will spend my complexity budget on the cache, not on sharding."* That one sentence is worth more than the next twenty minutes of diagram.`,
    },
    {
      type: 'intuition',
      title: 'Step 3 — API design. Your turn first',
      md: `**Attempt this:** write the two endpoints, their request bodies, their success status codes, and their error codes. Then decide: does the redirect return **301** or **302**? Justify it.

- **POST /urls** — body \`{ long_url, alias?, ttl_seconds? }\` → **201 Created**, body \`{ code, short_url, expires_at }\`. Errors: **400** malformed or non-http(s) URL, **409** alias already taken, **429** rate limited.
- **GET /{code}** → **302 Found** with \`Location: <long_url>\`. Errors: **404** unknown or expired, **410 Gone** for a link you disabled (a takedown says "this existed and is dead", which is a different fact from "never existed").
- **Why POST, not \`GET /shorten?url=...\`**: creation changes state, and GET must stay safe and cacheable. A URL inside a query string also has to be escaped and then lands in every access log and browser history along the way.
- **Idempotency**: POST is not naturally idempotent — a client retrying a timeout creates a second code for the same URL. Accept an \`Idempotency-Key\` header and return the original 201 on a repeat, or deduplicate on \`(owner_id, long_url)\` if "same user, same URL, same link" is the semantics you want. Decide which; do not leave it unsaid.
- **Rate limiting**: on POST, per API key — token bucket, covered in the rate limiting module in Level 0. Creation is the expensive, abusable direction. Redirects get a much looser per-IP limit whose only job is to slow down someone enumerating codes.`,
    },
    {
      type: 'note',
      md: `**301 vs 302 — the decision they are actually probing.** **301 Moved Permanently** tells the browser (and every proxy in between) to remember the mapping — often forever, with no way to revoke it. Every click after the first resolves *inside the browser*: your server is never contacted. That is faster and cheaper, and it silently destroys your product. Your click counter freezes at 1. You can never repoint the link. You can never take a malicious link down for anyone who already clicked it. **302 Found** (temporary) makes the browser ask you every single time — you keep tracking, repointing, and takedown, at the cost of serving every click. **307** is a 302 that also guarantees the HTTP method is preserved on redirect; for GET-only redirects the difference does not bite, but naming it shows you know the RFC. **Choose 302/307 when you need click tracking or the right to change the target — which is nearly always. Choose 301 only if the link is genuinely permanent and you truly never want to see the traffic.**`,
    },
    {
      type: 'intuition',
      title: 'Step 4 — Data model. Your turn first',
      md: `**Attempt this:** write the table. Choose the primary key and justify it. Then decide where a click event goes.

One table is enough:

- \`code\` VARCHAR(8) **PRIMARY KEY** · \`long_url\` TEXT · \`created_at\` · \`expires_at\` (nullable) · \`owner_id\` (nullable) · \`disabled\` BOOLEAN.
- **Why \`code\` is the primary key**: 100% of reads are point lookups by code. In a clustered-index store (InnoDB, and effectively any index-organised table) the row lives *in* the index leaf — one lookup, no second hop to fetch the row. Making an auto-increment \`id\` the PK and putting a secondary index on \`code\` costs you an extra hop on the single hottest query in the system.
- **The honest cost**: random codes as a clustered key mean every insert lands at a random position in the B-tree — page splits, write amplification, a colder buffer pool. Sequential codes (the counter approach, next section) insert at the end of the tree and are far kinder to the index. That is a real tradeoff between write efficiency and unpredictability, and naming it is exactly the kind of depth these rounds reward.
- **No secondary indexes on the hot path.** Add an index on \`owner_id\` only when you build "my links", and know it costs you on every insert.
- Keep the mapping **immutable** in v1. Immutable rows make caching trivial: nothing to invalidate. The only mutation is \`disabled\`, and TTLs bound how long a stale cached entry can survive it.`,
    },
    {
      type: 'note',
      md: `**Where analytics go — and the mistake that kills the design.** Never write \`UPDATE codes SET clicks = clicks + 1\` on redirect. It converts your read-only hot path into a write path, doubles database load, and — worse — serialises every click on one viral link behind a single row lock, so the most popular link in your system becomes the slowest. Instead: the app emits an **event** \`(code, timestamp, ip_hash, referrer, user_agent)\` to a **queue** (Kafka), a consumer batches it into an append-only columnar store or warehouse, and dashboards read from there. If you need a live counter, \`INCR\` in Redis and flush periodically — approximate, cheap, and off the critical path. The general rule to state: **the redirect path does zero synchronous writes.** Anything that must be recorded gets fired at a queue and forgotten.`,
    },
    {
      type: 'intuition',
      title: 'The heart of the problem — how do you generate the short code?',
      md: `**Attempt this before reading:** name at least two ways to produce a unique short code, and say what each one leaks or costs. This is the part of the interview that separates answers.

**Approach 1 — Random base62 + collision retry.** Pick 7 random characters from \`[0-9a-zA-Z]\`, INSERT, and let the **UNIQUE primary key** reject a duplicate; retry on conflict.

- Wins: dead simple, completely stateless, codes are unpredictable, no coordination service to run.
- Costs: an occasional extra round trip on conflict, and random inserts scatter across the B-tree.
- Critical detail: uniqueness must be enforced by the **insert**, never by a SELECT-then-INSERT — two concurrent writers can both pass the SELECT and both think they won.

**Approach 2 — Global counter + base62 encode.** Keep one counter (a DB sequence, Redis \`INCR\`, or ranges handed out by ZooKeeper); encode the integer in base62.

- Wins: zero collisions by construction, and the densest possible use of the keyspace, so codes stay shortest.
- Costs: codes are **sequential and therefore enumerable** — anyone can walk \`/1\`, \`/2\`, \`/3\` and read every link in your system, and by watching how the codes advance they can measure your daily volume. It is also a single point of coordination.
- Fix without losing the win: run the integer through a **Feistel network** or a xor-and-multiply-mod permutation before encoding. That is a bijection over the keyspace — still collision-free, but the output looks random and leaks nothing.

**Approach 3 — Hash the URL and truncate.** \`base62(sha256(long_url))[:7]\`.

- Wins: deterministic, so the same long URL always yields the same code — identical URLs deduplicate for free, and no counter or coordination exists at all. It leaks nothing about your volume.
- Costs: truncating a hash **collides** (two different URLs, same 7-char prefix), so you still need the uniqueness check plus a salt-and-retry. Determinism also breaks per-user links, per-link expiry, and per-link analytics when two users shorten the same URL, and anyone can test whether a given URL was ever shortened simply by hashing it themselves.

**Approach 4 — Pre-generated key ranges (a key generation service).** A separate service pre-generates unused codes into a table and hands out **blocks** (say 10,000 at a time) to app servers.

- Wins: the hot path does zero coordination — pop the next code from a block held in local memory. No collision check on the insert at all.
- Costs: one more stateful service to run and make highly available, the handout itself needs a transaction so no block goes to two servers, and a server that dies mid-block leaks the rest of that block.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'How long should the code be? Run the numbers, then choose',
      code: `PER_DAY = 100_000_000          # new URLs per day

print("length -> keyspace -> how long it lasts at 100M new URLs/day")
for L in range(5, 9):
    space = 62 ** L
    print(f"  62^{L} = {space:>19,}   lasts {space / PER_DAY / 365:8.2f} years")

print()
print("random codes: chance a fresh code is already taken")
for years in (1, 5, 10):
    n = PER_DAY * 365 * years
    for L in (6, 7, 8):
        space = 62 ** L
        if n >= space:
            print(f"  year {years:2d}  len {L}:  KEYSPACE EXHAUSTED")
            continue
        p = n / space
        print(f"  year {years:2d}  len {L}:  corpus {n/1e9:5.1f}B   P(collide) {p*100:7.4f}%   retries/insert {p/(1-p):.4f}")

# --- real output ---
# length -> keyspace -> how long it lasts at 100M new URLs/day
#   62^5 =         916,132,832   lasts     0.03 years
#   62^6 =      56,800,235,584   lasts     1.56 years
#   62^7 =   3,521,614,606,208   lasts    96.48 years
#   62^8 = 218,340,105,584,896   lasts  5981.92 years
#
# random codes: chance a fresh code is already taken
#   year  1  len 6:  corpus  36.5B   P(collide) 64.2603%   retries/insert 1.7980
#   year  1  len 7:  corpus  36.5B   P(collide)  1.0365%   retries/insert 0.0105
#   year  1  len 8:  corpus  36.5B   P(collide)  0.0167%   retries/insert 0.0002
#   year  5  len 6:  KEYSPACE EXHAUSTED
#   year  5  len 7:  corpus 182.5B   P(collide)  5.1823%   retries/insert 0.0547
#   year  5  len 8:  corpus 182.5B   P(collide)  0.0836%   retries/insert 0.0008
#   year 10  len 6:  KEYSPACE EXHAUSTED
#   year 10  len 7:  corpus 365.0B   P(collide) 10.3646%   retries/insert 0.1156
#   year 10  len 8:  corpus 365.0B   P(collide)  0.1672%   retries/insert 0.0017`,
      annotations: {
        1: 'The single input the whole decision hangs on. This is why estimation comes BEFORE the algorithm — change this number and the right code length changes with it.',
        5: 'base62 = digits + lowercase + uppercase = 62 symbols. Length L gives 62^L codes: every extra character multiplies the keyspace by 62, not by 2.',
        18: 'The estimate: with n codes taken out of a space of 62^L, a fresh random code hits a taken one with probability n / 62^L. Expected extra INSERT attempts is p/(1-p).',
        23: 'Six characters exhaust in 19 months at this volume. That is not a keyspace, it is a deadline.',
        29: 'Seven characters with a full year of traffic already in the table: one insert in a hundred needs a retry. A non-problem — and precisely why the boring random-code approach wins.',
        36: 'Eight characters buys ~62x more headroom for one extra character. Worth it only if you expect far more than 100M/day or want collisions invisible for decades.',
      },
    },
    {
      type: 'note',
      md: `**The choice, defended.** Take **7 characters, random base62, uniqueness enforced by the UNIQUE primary key, retry on conflict.** Reasons, in the order an interviewer wants them: (1) 62^7 ≈ 3.5 trillion codes, ~96 years of runway at 100M/day, while 62^6 dies in 19 months — the arithmetic, not taste, rejects 6. (2) Collision retries measured, not guessed: ~1% after one year, ~10% after ten. One retry is not an architecture problem. (3) Random codes are unpredictable, which is a *requirement*, not a nicety — the counter approach fails this outright unless you bolt a Feistel permutation on top. (4) It needs no extra service, so there is one less thing to page you at 3am. And name the upgrade path: if the uniqueness insert ever becomes the write bottleneck, switch to pre-generated key ranges — the API and the data model do not change, only the generator behind them.`,
    },
    {
      type: 'intuition',
      title: 'Step 5 — HLD. Your turn first',
      md: `**Attempt this:** draw the boxes. Then draw the **write path** and the **read path** as two separate lines through them, because they touch different components in a different order.

The components, left to right:

- **Client** → **DNS** → **CDN / edge PoP** → **L7 load balancer** → **stateless app tier** (auto-scaled) → **Redis cache** → **database** (one leader, several read replicas).
- Off to the side: **Kafka** → analytics consumer → warehouse. Plus a **blocklist/safe-browsing service** and a **background expiry job**.
- The app tier is **stateless** on purpose: no session, no local data, so you scale it by adding instances and lose nothing when one dies. All state lives in Redis and the database.

**Write path**: client → LB → app → generate code → INSERT (unique PK decides) → 201. It does *not* touch the cache. Roughly 1,160/sec: one leader, comfortably.

**Read path**: client → LB → app → Redis → (hit) 302, done. On a miss: → replica → 302, and write the value back into Redis. Roughly 116,000/sec, of which the cache absorbs the overwhelming majority.

**Analytics path**: app fires an event at Kafka and returns immediately. Nothing on the redirect waits for it.

One honest note about the CDN: you cannot cache a *tracked* 302 at the edge — caching it is exactly the thing that stops the tracking. What the edge still buys you is TLS termination and a shorter round trip, which on a redirect is most of the latency. Say that rather than drawing a CDN and hoping nobody asks.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Write path, read path, and what a 301 does to your click counter',
        notice: 'Step through it. Frames 1–3 are the write path, 4–5 the read path, 6 is the trap.',
        leftLabel: 'request',
        rightLabel: 'system',
        frames: [
          {
            note: 'Write path, step 1. POST /urls with the long URL. The app tier is stateless, so any instance can serve this — nothing is stored on the box itself.',
            stack: [{ name: 'POST /urls', value: 'long_url = https://…/very/long/path', to: 'app' }],
            heap: [
              { id: 'app', value: 'stateless instance', label: 'app tier' },
              { id: 'cache', value: '(does not participate in writes)', label: 'Redis' },
              { id: 'db', value: 'codes: 8.2B rows', label: 'database (leader)' },
            ],
          },
          {
            note: 'Generate a random 7-character base62 code and try to INSERT it. The UNIQUE primary key on code is what actually detects a collision. Never SELECT-then-INSERT: two concurrent writers can both pass the SELECT and both believe they won.',
            stack: [{ name: 'code = "k7Qm2Xa"', value: 'INSERT … ON CONFLICT → retry', to: 'db' }],
            heap: [
              { id: 'app', value: 'random base62 x7', label: 'app tier' },
              { id: 'cache', value: '(untouched)', label: 'Redis' },
              { id: 'db', value: 'unique PK check: free', label: 'database (leader)', moved: true },
            ],
          },
          {
            note: '201 Created with the short URL. Note what did NOT happen: the cache was not populated. A brand-new link may never be clicked, and writing it now would evict something that is actually hot.',
            stack: [{ name: '201 Created', value: 'short_url = sho.rt/k7Qm2Xa' }],
            heap: [
              { id: 'app', value: 'done, holds no state', label: 'app tier' },
              { id: 'cache', value: 'still no entry for k7Qm2Xa', label: 'Redis — deliberately cold' },
              { id: 'db', value: 'k7Qm2Xa → https://…', label: 'database (leader)' },
            ],
          },
          {
            note: 'Read path. GET /k7Qm2Xa — the first real click. Cache MISS, so the app falls through to a read replica, returns the 302, and writes the mapping back into Redis with a TTL. This is cache-aside: the cache is filled by misses, not by writes.',
            stack: [{ name: 'GET /k7Qm2Xa', value: 'cache miss → replica', to: 'db' }],
            heap: [
              { id: 'app', value: 'lookup, then populate', label: 'app tier' },
              { id: 'cache', value: 'k7Qm2Xa → https://… (TTL 1h)', label: 'Redis — now warm', moved: true },
              { id: 'db', value: 'one point lookup on the PK', label: 'database (replica)' },
            ],
          },
          {
            note: 'Same link one second later. Cache HIT: a memory lookup and a 302 in about 1 ms, database untouched. The click event goes to Kafka and the response does not wait for it. At a 95% hit rate the DB sees 5% of 116K/sec — about 5,800 QPS, which a replica set handles easily.',
            stack: [{ name: 'GET /k7Qm2Xa', value: 'cache hit → 302 Found' }],
            heap: [
              { id: 'cache', value: 'k7Qm2Xa → https://…', label: 'Redis — serves ~95% of all reads' },
              { id: 'db', value: 'never contacted on this request', label: 'database (idle here)', freed: true },
              { id: 'queue', value: 'click event appended (async)', label: 'Kafka → warehouse' },
            ],
          },
          {
            note: 'The trap. Return 301 Moved Permanently instead, and the browser caches the mapping — often forever, with no way for you to revoke it. Every later click resolves inside the browser: your servers are never contacted, the analytics queue receives nothing, and you can never repoint or take down that link. Your click counter is frozen at 1 while the link goes viral. Use 302 or 307 whenever you need tracking or the right to change the target.',
            stack: [{ name: 'GET /k7Qm2Xa', value: 'answered by the browser itself', danger: true }],
            heap: [
              { id: 'browser', value: 'k7Qm2Xa → https://… (301 cached)', label: 'browser cache — unrevokable', danger: true },
              { id: 'app', value: 'never contacted again', label: 'app tier — blind', freed: true },
              { id: 'queue', value: 'clicks: 1 (frozen forever)', label: 'analytics — dead', danger: true },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Step 6a — Deep dive: the cache',
      md: `**Attempt this:** what exactly do you cache, for how long, and what happens when one link goes viral? Then read on.

- **What to cache**: \`code → long_url\`, and nothing else. Not the whole row — small values mean more links per gigabyte and a higher hit rate. The full hot set is ~75 GB, so a small Redis cluster covers it.
- **Cache-aside (lazy loading)**: fill on miss, not on write. Most created links are never clicked; populating on write would evict genuinely hot entries to store cold ones. Details in the caching module in Level 0.
- **TTL**: set it to \`min(link expiry, a few hours)\`. The TTL is not about memory — it is your **bound on staleness** after a takedown or a repoint. Also delete the key explicitly whenever a link is disabled; the TTL is the backstop for the delete you missed.
- **The hot-key reality**: click distribution is Zipfian. A tiny fraction of links takes most of the traffic, and one viral link can pull tens of thousands of QPS to a **single Redis key on a single node**. Sharding does not help — every request wants the same key. Real fixes: (1) replicate that key across N nodes under suffixed names and pick one at random; (2) an in-process LRU in each app instance with a very short TTL, so the hottest links never leave the app box; (3) let the edge answer it, accepting that you lose per-click tracking for that link.
- **Negative caching**: someone scanning random 7-character codes gets a 100% miss rate, and every miss falls straight through to the database — your cache stops protecting you at exactly the moment you are under attack. Cache the "not found" answer too, with a short TTL (~60 s), or keep a Bloom filter of existing codes in front of the lookup. Bound the memory so the scan cannot evict your real data.
- The number to watch is the **hit rate**, and only the hit rate. Everything else in this design is downstream of it.`,
    },
    {
      type: 'intuition',
      title: 'Step 6b — Deep dive: the code generator',
      md: `**Attempt this:** with a hundred app servers running, how do you guarantee no two of them ever produce the same code? And what happens when a server dies halfway through generating? Then read on.

- **With random codes, the database is the only arbiter.** The UNIQUE primary key is the uniqueness guarantee — full stop. Any application-level "check if it exists, then insert" is a race with a window between the two statements. Use \`INSERT … ON CONFLICT DO NOTHING\` (or catch the duplicate-key error), and treat zero rows affected as "retry with a new code".
- **With a counter, coordination becomes the design.** One Redis \`INCR\` is a single point of failure and a hot key at 1,160 writes/sec × retries. The standard fix is **range allocation**: each app server claims \`[n, n + 10000)\` in one transaction against a small allocation table, then serves 10,000 codes from local memory with zero network calls. Coordination cost drops by a factor of 10,000.
- **When a node dies mid-range** — the interviewer's favourite follow-up — the remaining codes in its block are simply **never used**. A gap. That is fine: gaps cost nothing in a 3.5-trillion keyspace. What you must *not* do is reclaim the block, because you cannot prove the dead node had not already handed some of those codes to clients whose writes were in flight. **Leak the block; never risk reissuing it.**
- **The restart hazard**: if the counter lives in Redis and Redis loses its persistence, it restarts at a number it already issued — and starts minting duplicates. Guard it by persisting the high-water mark durably and by having every server claim a **fresh** block on startup rather than resuming the one it thinks it held.
- **The related pattern** is the Snowflake-style ID: timestamp bits, machine-id bits, sequence bits, concatenated. It gives roughly time-sortable IDs with no coordination after machine assignment — covered in the distributed ID generator module. Note its cost is the counter's cost: time-sortable means guessable and volume-leaking, which is exactly what a shortener must not be.`,
    },
    {
      type: 'intuition',
      title: 'Step 7 — Bottlenecks and tradeoffs. Your turn first',
      md: `**Attempt this:** name where this system breaks first, second, and third. Then read on.

- **First and always: the read path.** The **cache hit rate is the single most important number in the design.** At 95% the database sees 5,800 QPS; at 90% it sees 11,600. A five-point drop *doubles* database load. That is the sentence to say out loud — it reframes "add more DB capacity" as "find out why the hit rate fell".
- **The database becomes a bottleneck only at extreme scale.** 18 TB/year fits on commodity hardware for years; you shard when a single node genuinely cannot hold or write it. Then shard **by the code**, because the code is in 100% of queries — every read routes to exactly one shard, never a scatter-gather.
- **And note what you do not need**: consistent hashing exists to give you an even spread *and* cheap resizing. Random base62 codes are already uniformly distributed, so you get the even spread for free from a plain hash. Unless you resize often, pre-splitting into a fixed number of logical shards (say 1,024) mapped onto physical nodes is simpler and does the same job. The ring earns its keep in stores that manage their own membership — see the sharding module.
- **Expiry and cleanup**: never scan the whole table synchronously. Combine **lazy deletion** (check \`expires_at\` on read and return 404 if past) with a **background batch job** that deletes in small chunks. Better still, partition the table by expiry month and \`DROP PARTITION\` — instant, versus a billion-row DELETE and its vacuum aftermath.
- **Custom alias contention**: aliases share one global namespace, first come first served. The same unique-PK insert picks the winner; losers get **409 Conflict**. Keep a reserved-word blocklist (\`api\`, \`login\`, \`admin\`, \`static\`) so no alias can shadow your own routes. And note the irony: custom aliases are the one place where users deliberately choose *predictable* codes, so anything private must never use one.
- **Abuse — do not skip this.** Shorteners are phishing infrastructure: the whole product is hiding a destination. You need a blocklist / safe-browsing check at creation, an **asynchronous re-scan** because a link can turn malicious after it is created, an interstitial warning page for flagged links, per-key and per-IP rate limits, and a \`disabled\` flag checked on read. Tie it back: this is the second reason the 301 answer is wrong — a cached 301 makes takedown physically impossible.`,
    },
    {
      type: 'intuition',
      title: 'Pastebin — the same shape with a heavy body',
      md: `Interviewers pivot to this in the last ten minutes to see whether you learned a *shape* or memorised one answer. Same seven steps, and almost everything transfers.

- **Same**: create → get a code, read by code. Same code generation, same cache-aside read path, same 302 question if you redirect, same expiry and abuse problems.
- **Different**: the body is 10 KB–10 MB of text, not a 100-byte URL. That one change moves the design.
- **Do not put the blob in the row.** A multi-megabyte TEXT column bloats the table, wrecks cache locality (you now fit far fewer rows per page), and every backup and replica drags the bytes along. Put the content in **blob storage** (S3) at key \`pastes/{code}\`, and keep only metadata in the database: code, size, content type, created_at, expires_at, owner, visibility. See the blob storage and CDN module in Level 0.
- **The estimate flips.** 100M pastes/day × 10 KB average = **1 TB/day ≈ 365 TB/year**. Storage is now the dominant cost, exactly the opposite of the shortener — so expiry, deduplication, compression, and lifecycle tiering (hot → infrequent access → delete) stop being hygiene and become the budget.
- **Read path**: the metadata lookup returns a blob URL and the client fetches the content **through a CDN** — a signed, short-lived URL if the paste is private. Your app tier never streams bytes; it hands out pointers. Redis caches metadata, never content.
- **Why the CDN is safe here and not for redirects**: a paste is immutable once written, and immutability is what makes aggressive caching correct. A redirect is a mutable, trackable decision, which is why it stays with you.`,
    },
    {
      type: 'note',
      md: `**Take the script, not the answer.** You now have one worked example of all seven steps: requirements with a deliberate scope cut, estimation that *chose* the architecture, an API with real status codes, a data model with a defended primary key, an HLD with the write and read paths drawn apart, two deep dives, and a bottleneck list ending in abuse. Run that same order on the next case study — feed, chat, video, ride matching — and the only thing that changes is which numbers dominate. In the shortener the reads dominated, so you spent on cache. In Pastebin the bytes dominated, so you spent on blob storage and CDN. **Let the estimate pick the bottleneck, then spend your complexity there and nowhere else.**`,
    },
  ],
  quiz: [
    {
      question: 'Estimation gives 1,160 writes/sec, 116,000 reads/sec, and 18 TB/year. What does that combination immediately imply?',
      options: [
        { text: 'Shard the database from day one — 18 TB is too much for one machine', explanation: 'It is not. 18 TB/year is a handful of NVMe drives; sharding is for when a single node cannot hold or write the data, and you are years from that.' },
        { text: 'Caching and read replicas: the data is small and cold, the read traffic is large and hot', explanation: 'Correct. The pressure is entirely on the read path — one relational node does maybe 10–50K point lookups/sec, so 116K sustained needs a cache in front, not a size-driven shard.' },
        { text: 'Move to a column-family store to absorb the write volume', explanation: '1,160 writes/sec is trivial for a single leader. There is no write-scale problem here to solve.' },
        { text: 'Buy more bandwidth — 0.5 Gbps is the constraint', explanation: '0.5 Gbps is nothing for a service at this scale. Bandwidth was computed to rule it out, which is exactly what estimation is for.' },
      ],
      correct: 1,
    },
    {
      question: 'Your shortener returns 301 Moved Permanently. Six months later, why is the analytics dashboard useless?',
      options: [
        { text: 'The Kafka consumer fell behind', explanation: 'Lag delays events; it does not stop them arriving. The events here were never generated at all.' },
        { text: 'The click counter overflowed', explanation: 'A counter type problem would show as wrong big numbers, not as counts frozen at 1.' },
        { text: 'Browsers cached the 301, so later clicks never reach your servers and no click event is ever emitted', explanation: 'Correct. 301 tells the browser and every intermediary to remember the mapping permanently. Every subsequent click resolves locally — you also lose the ability to repoint or take down the link. Use 302/307 when you need tracking.' },
        { text: 'The cache TTL expired and the entries were evicted', explanation: 'Eviction affects your server-side latency, not whether the browser contacts you at all.' },
      ],
      correct: 2,
    },
    {
      question: 'At 100M new URLs/day, why is a 6-character base62 code rejected?',
      options: [
        { text: '62^6 ≈ 56.8 billion codes — exhausted in about 19 months', explanation: 'Correct. 56.8B / 100M per day / 365 ≈ 1.56 years. Six characters is not a keyspace, it is a deadline. 62^7 ≈ 3.5 trillion gives ~96 years.' },
        { text: 'Six characters are too easy for users to type by mistake', explanation: 'Shorter is better for usability. The rejection is purely arithmetic.' },
        { text: 'base62 cannot encode 6 characters', explanation: 'It encodes any length. The question is how many distinct values that length holds.' },
        { text: 'Six-character codes are more predictable than seven', explanation: 'Predictability comes from HOW you generate the code (random vs sequential), not from its length.' },
      ],
      correct: 0,
    },
    {
      question: 'Two app servers concurrently generate the same random code. What actually prevents a duplicate mapping?',
      options: [
        { text: 'A SELECT to check the code before inserting', explanation: 'That is the classic race: both servers pass the SELECT in the window before either INSERT lands, and both believe they won.' },
        { text: 'A distributed lock held during generation', explanation: 'It would work, and it would also put a lock acquisition on every write in the system — expensive and unnecessary when the database already enforces uniqueness for free.' },
        { text: 'The random generator is seeded per server so codes never collide', explanation: 'Different seeds reduce nothing — random draws from the same 3.5-trillion space collide at exactly the computed rate regardless of seeding.' },
        { text: 'The UNIQUE primary key on `code` — one INSERT wins, the loser retries with a new code', explanation: 'Correct. The database index is the only true arbiter, and the check is atomic with the write. Catch the duplicate-key error (or use ON CONFLICT) and retry.' },
      ],
      correct: 3,
    },
    {
      question: 'A counter-plus-base62 generator produces codes 1, 2, 3, … encoded. What are the two real costs?',
      options: [
        { text: 'Collisions and wasted keyspace', explanation: 'Backwards: a counter has zero collisions and uses the keyspace most densely. Those are its strengths.' },
        { text: 'Codes are enumerable (anyone can walk the whole system) and they leak your daily volume', explanation: 'Correct. Sequential codes let anyone read every link by counting, and watching the codes advance measures your traffic. The fix that keeps the benefits is a Feistel or xor-multiply permutation before encoding — a bijection, so still collision-free but scrambled.' },
        { text: 'Codes get longer over time and break existing links', explanation: 'Codes do grow in length as the counter grows, but old codes keep working — that is not the objection interviewers are after.' },
        { text: 'It requires hashing every URL', explanation: 'That is the hash-and-truncate approach, a different option entirely.' },
      ],
      correct: 1,
    },
    {
      question: 'Someone runs a scanner hitting millions of random 7-character codes. Almost all are 404s and your database load spikes. The fix?',
      options: [
        { text: 'Increase the cache size so more links fit', explanation: 'The requests are for codes that do not exist. No amount of caching real links helps, because none of them is being asked for.' },
        { text: 'Switch the redirect from 302 to 301', explanation: 'Status codes on the miss path do not matter — the request already reached your database before any response existed.' },
        { text: 'Negative caching: store the "not found" answer with a short TTL, or put a Bloom filter of existing codes in front', explanation: 'Correct. Every miss falling through to the DB means the cache stops protecting you exactly when you are under attack. Cache the negative result with a short TTL and bounded memory, plus a per-IP rate limit on redirects.' },
        { text: 'Add read replicas until the load is absorbed', explanation: 'That is paying for an attack rather than stopping it — and the scanner scales up for free while your bill does not.' },
      ],
      correct: 2,
    },
    {
      question: 'On every redirect the app runs `UPDATE codes SET clicks = clicks + 1`. Why is this the worst line in the design?',
      options: [
        { text: 'It makes the read path a write path, and a viral link serialises every click behind one row lock', explanation: 'Correct. It roughly doubles DB load and makes the most popular link the slowest in the system. Emit an event to a queue instead, batch it into a warehouse, and keep the redirect path free of synchronous writes.' },
        { text: 'Integer counters overflow at scale', explanation: 'BIGINT handles more clicks than the universe will produce. Contention, not overflow, is the problem.' },
        { text: 'It cannot work with read replicas', explanation: 'True that writes must go to the leader, but the real damage is the lock contention on a single hot row.' },
        { text: 'Click counts should be stored in the cache instead', explanation: 'A Redis INCR is a fine approximate live counter, but the core point is that the durable analytics path belongs on a queue, off the critical path.' },
      ],
      correct: 0,
    },
    {
      question: 'Pastebin instead of a shortener: same API shape, but the body is 10 KB–10 MB of text. What changes most?',
      options: [
        { text: 'The code generator has to be longer', explanation: 'The number of pastes is the same as the number of links — the keyspace arithmetic is unchanged.' },
        { text: 'You need strong consistency because text is more important than URLs', explanation: 'A paste is written once and read; immutability makes it easier to cache, not harder to keep consistent.' },
        { text: 'The cache must hold the content instead of the mapping', explanation: 'Exactly backwards: Redis holds metadata, and the bytes are served from blob storage through a CDN so the app tier never streams them.' },
        { text: 'Storage becomes the dominant cost (~1 TB/day), so content moves to blob storage with metadata in the DB and reads served via CDN', explanation: 'Correct. 100M × 10 KB = 1 TB/day ≈ 365 TB/year — the opposite of the shortener, where reads dominated. Expiry, compression and lifecycle tiering become budget items, and immutability makes aggressive CDN caching safe.' },
      ],
      correct: 3,
    },
  ],
  interviewQuestions: [
    {
      question: 'Design a URL shortener. Where do you start?',
      answer:
        'Not with boxes. I start by clarifying requirements, because they change the architecture: what is the read-to-write ratio, do users pick custom aliases, do links expire, and do the codes need to be unpredictable. Then I state functional scope — shorten, redirect, optional alias, optional TTL, click analytics — and non-functional: extremely read-heavy, low redirect latency because it sits on someone else\'s page load, and very high availability since a dead shortener breaks every link ever printed. I cut explicitly: no user accounts in v1, though I carry an owner_id column so adding them later is not a migration. Then estimation, and only then the design, because the numbers decide it. My whole sequence is fixed: requirements, estimation, API, data model, HLD, deep dive on two components, bottlenecks — the same seven steps for any design question.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through the estimation for 100M new URLs a day with a 100:1 read ratio, and tell me what it decides.',
      answer:
        'Writes: 100M over 86,400 seconds is about 1,160 per second — trivial, one leader handles it. Reads: 100× that, so about 116,000 per second sustained, and at a typical 2–3× peak call it 350,000. Storage: a row is roughly 7 bytes of code plus about 100 for the URL plus three 8-byte fields, so ~131 bytes; multiply by about 4 for row overhead and the index and call it 500 bytes. 100M × 500 B = 50 GB/day, so ~18 TB/year. Bandwidth: a redirect is just headers, ~500 bytes, so 116K × 500 B ≈ 58 MB/s, half a gigabit — negligible. What it decides: 18 TB/year is boring, a handful of NVMe drives, so this is not a sharding-for-size problem. But 116K reads/sec is 3–10× what a single relational node does on point lookups. The data is small and cold; the traffic is large and hot. So I spend my complexity budget on cache and read replicas, not on sharding.',
      isCaseBased: false,
    },
    {
      question: '301 or 302 for the redirect? Defend it, and then defend the other side.',
      answer:
        '302 (or 307, which additionally preserves the HTTP method). Reason: 301 Moved Permanently tells the browser and every intermediary to remember the mapping, often forever and with no way for me to revoke it. Every click after the first resolves inside the browser and never reaches my servers, which kills three things at once — click analytics freeze at 1, I can never repoint the link, and I can never take a malicious link down for anyone who already clicked it. Since analytics is a stated feature and abuse takedown is a legal necessity for a shortener, 302 wins. The other side is real though: 301 is genuinely faster for users and cheaper for me, because the browser skips a whole round trip and I serve nothing. So 301 is correct precisely when the mapping is permanent, immutable, and untracked — a vanity domain redirect, a moved documentation site. The decision is not about HTTP trivia; it is about whether you need to remain in the request path.',
      isCaseBased: false,
    },
    {
      question: 'Give me every way you could generate the short code, and pick one.',
      answer:
        'Four. (1) Random base62 with collision retry: stateless, unpredictable, uniqueness enforced by the UNIQUE primary key on insert; costs an occasional retry and random B-tree insert positions. (2) Counter plus base62 encode: zero collisions, densest keyspace use, sequential inserts that are kind to the index — but the codes are enumerable, so anyone can walk the whole system, and watching them advance leaks your daily volume; a Feistel or xor-multiply permutation before encoding fixes that while staying a bijection. (3) Hash the URL and truncate: deterministic, so identical URLs deduplicate for free and there is no counter at all — but truncation collides so you still need the uniqueness check, determinism breaks per-user links and per-link expiry, and anyone can test whether a URL was shortened by hashing it. (4) Pre-generated key ranges from a key-generation service: zero coordination on the hot path since each server pops from a local block — at the cost of one more stateful service to run. I pick 7-character random base62 with a unique-index retry, and the length falls out of arithmetic rather than taste: 62^6 ≈ 56.8 billion exhausts in about 19 months at 100M/day — a deadline, not a keyspace — while 62^7 ≈ 3.52 trillion gives ~96 years and 62^8 ≈ 218 trillion is overkill. Collision probability for a fresh random code is n/62^L: at 7 characters that is 1.04% after one year of traffic, 5.2% after five, 10.4% after ten — expected retries per insert of 0.01 to 0.12, a non-issue. It also satisfies the unpredictability requirement with no extra service. If the uniqueness insert ever becomes the write bottleneck I switch to pre-generated ranges — the API and schema do not change.',
      isCaseBased: false,
    },
    {
      question: 'Case: your redirect p99 jumped from 15 ms to 400 ms overnight and the database CPU is at 90%. Nothing was deployed. Diagnose.',
      answer:
        'The read path is entirely cache-shaped, so my first metric is the cache hit rate, not the database. The math makes it obvious why: at a 95% hit rate the DB sees about 5,800 QPS of the 116K; at 90% it sees 11,600. A five-point drop doubles database load. So the hypothesis is that the hit rate fell, and there are only a few causes. (1) A Redis node was evicted, restarted, or failed over, so the cache is cold and every request is a miss until it refills — check uptime and eviction counters. (2) Someone is scanning random codes: near-100% miss rate, all of it falling through to the DB, and the fix is negative caching with a short TTL plus a per-IP rate limit on redirects. (3) Memory pressure raised the eviction rate, so the working set no longer fits — check evicted_keys and used_memory. (4) A viral link is hammering one hot key on one Redis node, which shows as skewed per-node latency rather than a hit-rate drop; the fix is replicating that key under suffixed names or an in-process LRU in the app tier. What I would not do first is add database replicas — that treats the symptom and hides the cause. I would only reach for replicas if the hit rate is healthy and genuine traffic simply grew.',
      isCaseBased: true,
    },
    {
      question: 'Where do click analytics live, and what is the wrong answer?',
      answer:
        'The wrong answer is UPDATE codes SET clicks = clicks + 1 on the redirect. It converts a read-only hot path into a write path, roughly doubles database load, forces writes to the leader so you lose the ability to serve redirects entirely from replicas, and worst of all serialises every click on a viral link behind a single row lock — the most popular link in your system becomes the slowest. The right answer: the app emits an event (code, timestamp, hashed IP, referrer, user agent) to a queue like Kafka and returns the 302 immediately, without waiting. A consumer batches those events into an append-only columnar store or warehouse where dashboards run. If a live count is needed, INCR in Redis and flush periodically — approximate but cheap. The general rule to state is that the redirect path does zero synchronous writes; anything that must be recorded is fired at a queue and forgotten. That also buys durability against traffic spikes, since the queue absorbs bursts the warehouse cannot.',
      isCaseBased: false,
    },
    {
      question: 'Case: marketing wants custom aliases like sho.rt/summer-sale, self-serve for any customer. What breaks, and how do you handle it?',
      answer:
        'Aliases share one global namespace, which introduces contention that random codes never had. Mechanics: the alias goes into the same table with the same UNIQUE primary key, so the insert decides the winner and the loser gets 409 Conflict — no lock, no check-then-insert race. Then the problems. First, squatting: valuable aliases get grabbed in bulk, so I rate-limit alias creation per API key harder than random creation and consider reserving aliases to paying accounts. Second, route shadowing: an alias like "api" or "login" or "static" can shadow my own paths, so I need a reserved-word blocklist checked at creation, and ideally the redirect namespace on a separate hostname so the collision cannot happen at all. Third, impersonation: sho.rt/paypal-login is a phishing gift, so brand terms need a blocklist and flagged aliases need review. Fourth, and worth volunteering: custom aliases are inherently predictable, so anything private must never use one — the unpredictability requirement and the custom-alias feature are in direct tension and users should be told which one they are choosing. Finally, deletion policy: if an alias is released, reusing it means old printed links now point somewhere new, so I would tombstone released aliases rather than recycle them.',
      isCaseBased: true,
    },
    {
      question: 'Deep-dive the cache. What do you cache, for how long, and what is the failure mode nobody mentions?',
      answer:
        'I cache code → long_url and nothing else — small values mean more entries per gigabyte and a higher hit rate; the full hot set at ~500M distinct daily links × ~150 bytes is about 75 GB, so a small Redis cluster holds everything anyone actually clicks. Cache-aside: fill on miss, never on write, because most created links are never clicked and populating on write evicts hot entries to store cold ones. TTL is min(link expiry, a few hours), and its real job is not memory but bounding staleness after a takedown or repoint — I also delete the key explicitly on disable, with the TTL as the backstop for the delete that failed. Two failure modes people skip. First, hot keys: click distribution is Zipfian, and one viral link pulls tens of thousands of QPS onto a single key on a single node — sharding does not help because every request wants that same key. Fixes are replicating the key across N nodes under suffixed names, or a short-TTL in-process LRU in each app instance. Second, negative caching: a scanner of random codes has a 100% miss rate and every miss falls through to the DB, so the cache stops protecting you exactly when you are under attack. Cache the not-found answer with a ~60 second TTL under a bounded memory budget, or front the lookup with a Bloom filter of existing codes.',
      isCaseBased: false,
    },
    {
      question: 'A hundred app servers, and the code generator uses pre-allocated ranges. What happens when a server dies mid-range?',
      answer:
        'Nothing bad, if the policy is right. Each server claims a block like [n, n+10000) in one transaction against an allocation table and then serves those codes from local memory with no network calls, which cuts coordination by a factor of ten thousand. When a server dies holding a partially used block, the remaining codes in that block are simply never used — a gap in the keyspace. That is fine: gaps are free when the space holds 3.5 trillion codes. The mistake is trying to reclaim the block, because you cannot prove the dead node had not already handed some of those codes to clients whose writes were in flight; reissuing them means two different long URLs mapping to one code, which is data corruption, not a performance issue. So the rule is leak the block, never risk reissuing it. The related hazard is restart: if the allocation counter lives in Redis and Redis loses persistence, it restarts at a number it already issued and starts minting duplicates. Guard it by persisting the high-water mark durably and having every server claim a fresh block on startup rather than resuming one it believes it held. And if I wanted a belt-and-braces answer, I would keep the UNIQUE primary key anyway — it costs nothing on insert and turns a catastrophic corruption into a retry.',
      isCaseBased: false,
    },
    {
      question: 'When does this design actually need sharding, how would you shard it, and why is consistent hashing not required?',
      answer:
        'Not for a long time. 18 TB/year on commodity NVMe with read replicas covers several years, and 1,160 writes/sec never stresses a leader — so the trigger is a single node genuinely failing to hold the dataset or absorb the write rate, which at this volume is roughly 5–10 years out or an order-of-magnitude traffic change. When it comes, I shard by the code itself, because the code appears in 100% of queries: every read routes to exactly one shard and there is never a scatter-gather. On consistent hashing: the ring exists to give you two things, an even key spread and cheap resizing. Random base62 codes are already uniformly distributed, so a plain hash gives an even spread for free — the ring buys me only the resizing half. And since I reshard roughly never, the simpler production answer is to pre-split into a fixed number of logical shards, say 1,024, and map those onto physical nodes; growing the cluster then means moving whole logical shards, with no rehashing and no ring. Consistent hashing earns its keep in stores that manage their own membership and add or remove nodes routinely, which a shortener\'s database does not.',
      isCaseBased: false,
    },
    {
      question: 'Case: the same system, but the payload is a paste of 10 KB to 10 MB of text instead of a URL. Redesign it.',
      answer:
        'The shape survives — create returns a code, read fetches by code, same generator, same cache-aside metadata lookup, same expiry and abuse machinery. One thing changes and it changes the budget: the body. First re-estimate: 100M pastes/day × 10 KB average is 1 TB/day, about 365 TB/year, so storage is now the dominant cost, the exact opposite of the shortener where reads dominated. So the content does not go in the row — a multi-megabyte TEXT column bloats the table, wrecks cache locality by fitting far fewer rows per page, and drags bytes through every backup and replica. Content goes to blob storage at pastes/{code}; the database keeps metadata only: code, size, content type, created_at, expires_at, owner, visibility. The read path returns a blob URL and the client fetches through a CDN — a short-lived signed URL for private pastes — so the app tier hands out pointers and never streams bytes. Redis caches metadata, never content. Because storage is the budget, lifecycle policy becomes real design: TTL-driven deletion, compression, dedupe by content hash, and tiering from hot to infrequent-access before delete. And one note worth volunteering: the CDN is safe here precisely because a paste is immutable once written, whereas a tracked redirect is a mutable decision — which is why the shortener could not cache at the edge but this can.',
      isCaseBased: true,
    },
    {
      question: 'Case: a link you shortened is being used in a phishing campaign and legal wants it dead in five minutes. Can you do it?',
      answer:
        'With 302 redirects, yes. Flip the disabled flag in the database, delete the cache key so no stale entry serves it, and start returning 410 Gone. Every subsequent click reaches my servers because 302 is not cached, so the takedown is effectively immediate — the TTL on the cache entry is my worst-case bound if the delete fails. With 301, no, and that is the second reason 301 is the wrong choice for a shortener: every browser that already resolved the link holds an unrevokable mapping, and I have no mechanism to reach it. Beyond the takedown itself, this failure should push three things into the design: a safe-browsing or blocklist check at creation time, an asynchronous re-scan because a link that was benign at creation can be repointed to malware later, and an interstitial warning page for links flagged after the fact — which is also useful when the check is uncertain rather than conclusive. Plus per-key and per-IP rate limits, since phishing campaigns create links in bulk. The general point I would make: a shortener\'s core function is hiding a destination, so abuse handling is a first-class requirement, not an operational afterthought.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'The seven-step design interview script', back: 'Requirements (functional + non-functional) → estimation → API design → data model → HLD → deep-dive two components → bottlenecks and tradeoffs. Same order for every design question.' },
    { front: 'URL shortener estimation, 100M new URLs/day at 100:1 reads', back: '~1,160 writes/sec, ~116,000 reads/sec (peak ~350K), ~500 B/row → 50 GB/day → ~18 TB/year, ~0.5 Gbps. Conclusion: small cold data, huge hot traffic → cache + read replicas, not sharding.' },
    { front: '301 vs 302 for a redirect', back: '301 is cached by browsers permanently — clicks never reach you, so analytics freeze and takedown becomes impossible. 302/307 re-asks every time: you keep tracking, repointing, and takedown. Choose 301 only for permanent untracked redirects.' },
    { front: 'base62 code length arithmetic', back: '62^6 ≈ 56.8B → exhausted in ~1.6 years at 100M/day. 62^7 ≈ 3.52T → ~96 years. 62^8 ≈ 218T → ~6,000 years. Pick 7: shortest length that outlives the product.' },
    { front: 'Four ways to generate a short code', back: 'Random base62 + unique-index retry (simple, unpredictable — usual pick). Counter + base62 (no collisions, but enumerable and leaks volume — fix with a Feistel permutation). Hash + truncate (dedupes identical URLs, still collides). Pre-generated key ranges (no hot-path coordination, extra service).' },
    { front: 'What enforces short-code uniqueness across many servers', back: 'The UNIQUE primary key on the INSERT — never SELECT-then-INSERT, which two concurrent writers can both pass. Catch the duplicate-key error and retry with a new code.' },
    { front: 'Where click analytics must NOT go', back: 'Never UPDATE codes SET clicks = clicks + 1 on redirect: it makes the read path a write path and serialises a viral link on one row lock. Fire an event at a queue → warehouse; Redis INCR if you need a live approximate count.' },
    { front: 'The single most important number in this design', back: 'The cache hit rate. At 95% the DB sees ~5,800 QPS of 116K; at 90% it sees ~11,600 — a five-point drop doubles database load.' },
    { front: 'Negative caching, and why it matters', back: 'A scanner hitting random codes gets 100% misses that all fall through to the DB — the cache stops protecting you exactly when attacked. Cache the "not found" answer with a short TTL (bounded memory) or front the lookup with a Bloom filter.' },
    { front: 'Pastebin as the variant', back: 'Same shape, heavy body: 100M × 10 KB = 1 TB/day ≈ 365 TB/year, so STORAGE dominates instead of reads. Content → blob storage (pastes/{code}) served via CDN; only metadata in the DB; Redis caches metadata, never content. Immutability is what makes CDN caching safe.' },
  ],
  mindmapMarkdown: `- Case Study: URL Shortener (and Pastebin)
  - Seven-step script for EVERY design question
    - Requirements → estimation → API → data model → HLD → 2 deep dives → bottlenecks; attempt each step first
  - 1. Requirements
    - Functional: shorten, redirect, custom alias, TTL, click analytics
    - Non-functional: 100:1 read-heavy, low redirect latency, HA, unpredictable codes
    - Clarifying questions ARE the answer; cut scope out loud (no accounts in v1, keep owner_id)
  - 2. Estimation
    - 1,160 writes/sec · 116K reads/sec · peak 350K
    - 131 B row → 500 B → 50 GB/day → 18 TB/year · 0.5 Gbps
    - Small cold data, huge hot traffic → cache + replicas, not sharding
  - 3. API design
    - POST /urls → 201 · GET /{code} → 302 · 400 / 409 alias / 410 / 429
    - 301 caches in the browser → analytics die, takedown impossible
  - 4. Data model
    - One table, code as PRIMARY KEY (100% point lookups); random codes scatter inserts
    - Analytics → queue → warehouse, never a counter UPDATE on the hot path
  - 5. Short-code generation
    - Random base62 + unique-index retry (the pick)
    - Counter + base62: enumerable, leaks volume → Feistel permutation
    - Hash + truncate dedupes but collides · pre-generated ranges: no hot-path coordination
    - 62^6 = 1.6 years vs 62^7 = 96 years → 7 chars
  - 6. HLD: client → CDN/LB → stateless app → Redis → DB
    - Write path and read path drawn apart; analytics through Kafka
  - 7. Deep dives
    - Cache: cache-aside, TTL, Zipf hot keys, negative caching; hit rate is THE number
    - Generator: unique index is the arbiter; node dies mid-range → leak the block
  - 8. Bottlenecks: 95% → 90% hit rate doubles DB load
    - Shard by code only at extreme scale (random codes uniform → no ring); expiry lazy + DROP PARTITION; alias 409 + reserved blocklist; abuse blocklist and async rescan
  - 9. Pastebin: 1 TB/day → storage dominates; blob storage + CDN, metadata in DB, immutability makes edge caching safe`,
}

export default m
