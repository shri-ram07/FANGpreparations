import type { Module } from '../types'

const m: Module = {
  id: 'sysdesign-l2-case-search-crawler',
  subjectId: 'sysdesign',
  level: 2,
  title: 'Case Studies: Search Autocomplete & Web Crawler',
  whyItMatters:
    'These two look like easy case studies and are not. Autocomplete is a latency problem — top-5 suggestions in under 100ms while every keystroke is a request — and the answer is precomputation, not a cleverer search. The crawler is a politeness problem — one queue design decides whether you crawl a billion pages or get firewalled by every host on the internet. Both are asked constantly, and both reward the same senior move: find the one thing that must happen on the hot path, and shove everything else off it.',
  estMinutes: 60,
  sections: [
    {
      type: 'intuition',
      title: 'One method, applied twice',
      md: `Two designs, one lesson: **the request path should do almost nothing.**

- Autocomplete: the ranking is computed offline; the request is a single in-memory lookup.
- Crawler: there is no request path at all — but there is a queue that must obey rules other people's servers impose on you.
- Both follow the same seven steps: requirements → estimation → API → data model → HLD → two deep dives → bottlenecks.
- Each step below is posed as a **question first**. Stop, answer it yourself, then read on. That order *is* the interview.`,
    },

    {
      type: 'intuition',
      title: 'A1. Requirements — what does typeahead owe the user?',
      md: `*Question: list the functional and non-functional requirements before reading.*

**Functional**
- As the user types a prefix, return the top **k** (say 5) most likely completions.
- Ranked by popularity — how often that full query has been searched — and updated as trends move.
- Optional: personalization (your own history) and locale/language filtering.

**Non-functional**
- p99 under **~100ms** end to end. Slower and the suggestion arrives after the next keystroke, which makes it worse than nothing.
- Extremely read-heavy: reads outnumber updates by orders of magnitude.
- Availability over consistency. A slightly stale suggestion list is fine; a blank box on every request is not.

Say the scope out loud: full search ranking and spell correction are **out** — spell correction comes back as a bottleneck at the end.`,
    },
    {
      type: 'intuition',
      title: 'A2. Estimation — and the keystroke multiplier',
      md: `*Question: 10M daily active users, 10 searches each. What QPS must the service serve?*

- 10M × 10 = **100M searches/day** → 100M / 86,400 ≈ **1,160 search QPS**. Peak 2× ≈ 2.4K.
- The trap: a *search* is not a *request*. Every **keystroke** is a request. An average query is ~20 characters → ~20 requests per search.
- Real load ≈ 20 × 1,160 ≈ **23K QPS**, peak ≈ 46K. Twenty times the number you first wrote down.
- So the **first optimization is on the client, not the server: debounce.** Fire only after the user pauses ~50ms, and skip prefixes under 2–3 characters.
- Debounce typically collapses 20 requests into 4–5 → back to **~6K QPS**, peak ~12K. You deleted 75% of your traffic before designing anything.
- Latency budget: 100ms total − ~40ms network round trip − client render → **server budget ~10–20ms**. That single number rules out any subtree walk.`,
    },
    {
      type: 'intuition',
      title: 'A3. API design',
      md: `*Question: what is the smallest API that serves this?*

- \`GET /suggestions?prefix=lap&k=5&lang=en\` → \`{ suggestions: ["laptop", "laptop bag", ...] }\`
- **GET, always.** A GET is cacheable by browsers, CDNs and proxies by definition; a POST here silently throws that away.
- Cap \`k\` server-side (5 or 10). A client asking for 10,000 is a scraping attack on your ranking data.
- There is **no write API on this service.** Frequencies arrive from the logging pipeline, never from the query path.
- Include the client's request sequence number so late responses can be dropped — out-of-order responses overwriting newer suggestions is *the* classic typeahead bug.`,
    },
    {
      type: 'intuition',
      title: 'A4. Data model — the trie, and why the plain one fails',
      md: `*Question: you already know tries (DSA Level 2, "Tries: Prefix Power"). Is a plain trie enough?*

- A **trie** stores each word as a path from the root, one character per edge. Walking a prefix of length L costs **O(L)** — and L ≤ 20, so that walk is effectively free.
- Then the real work starts. To *rank*, you must find the most frequent complete queries in the **subtree** under that node.
- For the prefix \`"a"\` that subtree is millions of nodes. Walking it per keystroke, at 6K QPS, inside a 15ms budget — impossible.
- The trie solves **prefix lookup**. It does not solve **top-k**. Those are two different problems, and only the second one is hard.`,
    },
    {
      type: 'intuition',
      title: 'A5. HLD — the pieces, and the line that splits them',
      md: `*Question: draw the boxes. Which of them does a keystroke actually touch, and which ones never see a request at all?*

- **Client** — debounces ~50ms, skips prefixes under 2–3 characters, and drops any response whose sequence number is older than the newest one already shown. This box deletes ~75% of the traffic before it leaves the phone.
- **CDN / edge** — short prefixes (1–3 characters) for a given locale are identical for every user, so they are answered at the edge with a TTL matching the build cadence. Prefix popularity is Zipfian, so this handful of keys absorbs a large share of all requests.
- **Autocomplete service** — stateless. Route on the first 1–2 characters to a shard, walk L ≤ 20 characters, read a 5-element list, return. No writes, no locks, no fan-out.
- **In-memory trie shards** — the structure itself (~2.4GB), split by first-character range and replicated per region, so a request never crosses a continent.
- **Build pipeline** — *offline*. Aggregate → decay → build → **one immutable snapshot file**, shipped to the shards and swapped atomically.
- **Log sink** — every search emits one line into a log stream landing in object storage. It is the *only* input the build pipeline has, and nothing on the read path ever writes to it synchronously.

**The line that splits the diagram.** Client → CDN → service → trie shard is the **read path**: four hops ending in one memory lookup, and it is read-only from end to end. Log sink → aggregate → build → ship is the **offline path**, running on its own clock (hourly or daily) with no request ever waiting on it. The only thing that crosses the line is the snapshot swap, which is why the serving tier never performs a write — and the one deliberate exception, a tiny real-time layer for surging terms, is deferred to A8 precisely because it is the exception. The two deep dives that follow are one box each: what is inside a shard, then the pipeline that fills it.`,
    },
    {
      type: 'intuition',
      title: 'A6. Deep dive 1 — store the top-k AT each node',
      md: `The fix is one sentence: **store the answer where the question is asked.** Every trie node keeps its own precomputed list of the top k completions of its prefix.

- The query becomes: walk L characters, read a 5-element list, return. **No subtree traversal, ever.** O(L) with a tiny constant, comfortably inside 15ms.
- The bill is **memory**. You are duplicating query strings along every prefix path: "laptop" sits in the top-k list of \`l\`, \`la\`, \`lap\`, \`lapt\`, \`lapto\` and \`laptop\`.
- **Mitigation 1 — threshold.** Only keep top-k lists for prefixes whose frequency clears a bar (say 50 searches/week). The tail returns nothing or falls back to a slower path.
- **Mitigation 2 — radix tree.** Merge single-child chains: if nothing branches between \`lapt\` and \`laptop\`, store one compressed node instead of three. Typically cuts node count several-fold.
- **Mitigation 3 — shard by first characters.** Prefixes \`a–c\` on one box, \`d–f\` on the next. The routing key is the first 1–2 characters, which every request already has.
- Sizing it: ~20M kept prefixes × 5 suggestions × ~24 bytes ≈ **2.4 GB** — fits in RAM on one machine. That is the point: the whole structure is served from memory. If it gets tight, store suggestion **ids** plus one string table per shard.`,
    },
    {
      type: 'note',
      md: 'This is the same move as denormalization in a sharded database: **precompute the answer and store it under the key you will look it up by.** You pay in duplicated storage and in staleness, and you buy a constant-time read. Recognizing it as one pattern — not two tricks — is what makes it transfer to the next design.',
    },
    {
      type: 'intuition',
      title: 'A7. Deep dive 2 — the build-and-ship pipeline',
      md: `*Question: how do frequencies get into that trie without the serving tier ever performing a write?*

1. **Log.** Every search emits one line — query, timestamp, locale — into a log stream (Kafka) landing in object storage.
2. **Aggregate.** An offline job (hourly or daily) counts queries over a window, drops rare and abusive ones, and applies **time decay** so last month does not outvote this week.
3. **Build.** A builder job constructs the trie and the top-k list at each node, and writes it as **one immutable snapshot file**.
4. **Ship.** Serving nodes download the snapshot, load it into memory, and **atomically swap** old for new. Rollback is just loading the previous snapshot.

- Because of step 4, the serving path is **read-only**: no locks, no write contention, no cache invalidation, no partial updates to reason about.
- The price is **freshness**: a query that starts trending now cannot appear until the next build completes — an hour, or a day.`,
    },
    {
      type: 'intuition',
      title: 'A8. Freshness, caching, and the edge',
      md: `- **Real-time layer.** A streaming job counts the last few minutes and holds a *small* set of surging terms. At query time the server unions those few entries with the snapshot's top-k and re-ranks. Breaking news appears in minutes instead of hours.
- Keep that layer deliberately tiny. It is the one live-write component in an otherwise immutable design, so it is where the bugs and the load spikes will live.
- **Cache the hot prefixes.** Prefix popularity is Zipfian — a small LRU over \`a\`, \`am\`, \`ama\` absorbs a large share of all traffic.
- **CDN the short prefixes.** For a given locale, the response for \`"la"\` is identical for everyone → cache it at the edge with a TTL matching the build cadence. Personalized responses must be marked private and never edge-cached.
- **Replicate per region.** The snapshot is a few GB, so put a full copy in every region. Cheap replication kills cross-continent latency, which was over a third of your budget.`,
    },
    {
      type: 'intuition',
      title: 'A9. Bottlenecks and the honest limits',
      md: `- **Memory is the binding constraint.** Top-k-per-node duplication *is* the design's cost. Threshold, radix compression and first-character sharding are the three levers; when they run out, lower k or serve the tail from a slower store.
- **The long tail of rare prefixes.** Most distinct prefixes are searched almost never. Storing top-k for all of them costs everything and serves almost nobody — so accept degraded suggestions below the threshold, and *measure* how often real users land there.
- **Personalization multiplies the state.** A per-user trie is impossible. The practical shape: one global structure plus a short per-user list (your recent queries) merged and re-ranked at request time. It also makes those responses uncacheable at the edge — a real, quotable cost.
- **Spelling correction is not the trie's job.** A trie matches prefixes exactly: \`"lpatop"\` walks off the tree at character 2. Handle it separately — a dedicated corrector (edit-distance candidates from a symmetric-delete index, or a learned model) rewrites the prefix *before* lookup. Bolting fuzzy matching into the trie means exploring many branches per keystroke and losing the exact latency budget this design exists to protect.
- **Rebuild time sets your floor on freshness.** The snapshot is rebuilt whole — simple and safe — but build duration grows with the corpus, and that duration is your minimum staleness.`,
    },

    {
      type: 'intuition',
      title: 'B1. Requirements — what a crawler owes the web',
      md: `*Question: functional and non-functional requirements for a web crawler. Try it before reading.*

**Functional**
- Start from **seed URLs**, fetch pages, extract links, follow them.
- Store page content for a downstream indexer.
- **Revisit** pages over time so the index does not rot.

**Non-functional**
- **Politeness** — never overload a host. This is a hard requirement, not manners: violate it and you get firewalled, which ends the crawl.
- Scalable horizontally; robust against malformed HTML, dead servers and traps; extensible to new content types.
- **Coverage** and **freshness**, which trade directly against each other under one fixed crawl budget.

Scope you should state: HTML only, robots.txt respected, nothing behind a login.`,
    },
    {
      type: 'intuition',
      title: 'B2. Estimation — pages/sec, bandwidth, storage, machines',
      md: `*Question: target 1 billion pages per month, average page 500 KB. Compute the rate, bandwidth, storage and fetcher count.*

- 1e9 pages / (30 × 86,400 = 2.59e6 s) ≈ **386 pages/sec**. Peak 2× ≈ 800/s.
- Bandwidth in: 386 × 500 KB ≈ **193 MB/s ≈ 1.5 Gbps**, sustained, forever.
- Storage raw: 1e9 × 500 KB = **500 TB/month**. Gzip at roughly 5:1 → **~100 TB/month**, ~6 PB over five years. This is blob storage, not a database.
- Fetchers: a fetch takes 1–2s wall clock but is almost entirely *waiting*, so one machine with 100+ concurrent connections does ~25–50 pages/s → **~10–16 fetcher machines**. Crawling is I/O-bound; the CPU goes to parsing, not fetching.
- The seen-set: if you have discovered 10 billion URLs, a real hash set at ~100 bytes each is **~1 TB of RAM**. Hold that number — it forces the Bloom filter later.`,
    },
    {
      type: 'intuition',
      title: 'B3. API design — the internal contracts',
      md: `A crawler has no public API. The honest framing — and interviewers prefer it — is that the "API design" step here means the **contracts between components**.

- **Frontier**: \`add(url, priority, host)\` and \`next() -> url\`. \`next()\` must be non-blocking and must **never** hand back a URL whose host is on cooldown.
- **Fetcher**: \`fetch(url) -> (status, headers, body, fetched_at)\`, with a hard connect/read timeout and a maximum body size.
- **Content store**: \`put(content_hash, gzip(body))\` to blob storage, plus one metadata row \`(url_hash, url, content_hash, fetched_at, status, next_due)\`.
- **Robots cache**: \`allowed(host, path) -> bool\` and \`crawl_delay(host) -> seconds\`, with its own TTL per host.`,
    },
    {
      type: 'intuition',
      title: 'B4. Data model',
      md: `- **URL metadata**, keyed by \`hash(normalized_url)\`: last_fetched, next_fetch_due, http_status, content_hash, observed change rate.
- **Page bodies** in blob storage keyed by **content hash** — identical bodies deduplicate for free, and the metadata row just points at the blob.
- **Per-host record**: robots rules, crawl delay, last request time, recent error rate, current back-queue id.
- Notice what is absent: no joins, no multi-row transactions, everything keyed by a hash. That is a **wide-column store** (Cassandra/Bigtable) plus object storage — not Postgres.`,
    },
    {
      type: 'intuition',
      title: 'B5. HLD — the pieces and the loop',
      md: `- **URL frontier** — the queue of what to fetch next. The heart of the whole design.
- **Fetchers** — many workers, high concurrency, hard timeouts, capped body size.
- **Parser** — pull text and links out of HTML, resolve relative links to absolute URLs.
- **Duplicate detection** — two questions: have we seen this **URL**? have we seen this **content**?
- **Storage** — blobs for bodies, wide-column for metadata, plus the output stream feeding the indexer.
- **DNS resolver** with its own cache, sitting in front of every single fetch.

The loop: frontier → fetcher → parser → dedup → storage, and every newly discovered link flows **back into the frontier**. It is a graph traversal with a very opinionated queue.`,
    },
    {
      type: 'note',
      md: 'Read the traversal below as a crawl. Seeds are the start nodes, pages are vertices, links are edges. The **queue is the URL frontier**, the **visited set is URL dedup**, and the frontier only grows when the parser finds a link the visited set has never seen. Step it and watch how quickly one seed fans out.',
    },
    { type: 'visual', component: 'GraphTraversal', props: { algorithm: 'bfs' } },
    {
      type: 'note',
      md: 'One difference to say out loud in the room: a real frontier is **not FIFO**. It is ordered by priority (important and fast-changing pages first) and gated by politeness (a host on cooldown gets skipped even when its URL sits at the head of the queue). Same traversal, completely different scheduler — and that scheduler is the next section.',
    },
    {
      type: 'intuition',
      title: 'B6. Deep dive 1 — the frontier, where politeness meets priority',
      md: `*Question: one queue must satisfy two demands that fight each other. What are they, and what structure resolves it?*

- **Politeness**: at most one in-flight request per host, with a delay between requests (robots.txt \`Crawl-delay\`, or your own default of 1–2s).
- **Priority**: crawl important and fast-changing pages first — PageRank-ish importance, observed update frequency, crawl depth.
- A single priority queue cannot do both: pop the top 1,000 URLs and they are all from one big news site. You just DDoSed it.
- The standard answer is **two levels**: **front queues** decide *what*, **back queues** decide *when*.
- **Front queues**: f queues, one per priority band. A prioritizer scores each URL and drops it into the matching band. A biased selector pulls from high bands more often — but not always, so low-priority URLs are not starved forever.
- **Back queues**: b queues, each holding URLs for **exactly one host**, with a host → queue mapping table. A worker binds to one back queue, so two workers can never hit the same host at once.
- A min-heap of \`(next_allowed_time, queue_id)\` tells a worker which back queue is due. After a fetch, push \`next_allowed_time = now + crawl_delay\`. A slow or throttled host stalls only its own back queue — never the crawl.`,
    },
    {
      type: 'intuition',
      title: 'B7. Deep dive 2 — duplicate detection at two levels',
      md: `**Level 1 — exact URL dedup.** Normalize first, then check a seen-set.

- Normalize: lowercase the host, drop the default port, resolve \`.\` and \`..\`, strip the \`#fragment\`, sort or strip query parameters, remove known session ids. A large share of "duplicates" die right here, for free.
- Then look up \`hash(normalized_url)\` in the seen-set. At 10B URLs a real hash set is ~1 TB of RAM; a **Bloom filter** at 10 bits/URL is ~12 GB. That ratio is the whole argument.

**Level 2 — near-duplicate content.** Different URLs constantly serve the same page: print views, tracking parameters, mirrors, syndicated articles.

- An exact **content hash** catches byte-identical bodies only. Change one ad slot or one footer timestamp and the hash changes completely — that is what a cryptographic hash is *for*.
- **SimHash** (or MinHash) instead maps a document to a fingerprint where *similar documents get similar fingerprints*, so "near-duplicate" becomes "Hamming distance ≤ 3" — checkable against an index rather than by comparing every pair of pages.
- Why bother: near-duplicates burn crawl budget, inflate storage, and put the same article into the index ten times.`,
    },
    {
      type: 'note',
      md: 'The **Bloom filter tradeoff**, stated honestly. It is a bit array plus k hash functions: `add` sets k bits, and a lookup returns either "definitely new" or "maybe seen". It can say *maybe seen* about a URL you never saw — a **false positive** — and you then silently skip a page you should have crawled. It can **never** say *new* about a URL you already saw. That asymmetry points the right way here: one missed page in a billion is a rounding error, while a false negative would mean re-crawling and link loops. Tune the rate with bits per URL. And note the other cost: you cannot delete from a plain Bloom filter, so "forget this URL" needs a counting variant or a periodic rebuild.',
    },
    {
      type: 'math',
      intro: 'False-positive rate for m bits, n inserted items and k hash functions — plus the k that minimizes it.',
      latex: [
        'p \\;\\approx\\; \\left(1 - e^{-kn/m}\\right)^{k}',
        'k_{\\text{opt}} = \\frac{m}{n}\\ln 2 \\quad\\Longrightarrow\\quad \\frac{m}{n} = 10 \\text{ bits} \\;\\Rightarrow\\; k \\approx 7,\\;\\; p \\approx 0.8\\%',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'A tiny Bloom filter — measured false-positive rate vs a hash set',
      code: `import hashlib, math

class Bloom:
    def __init__(self, m_bits, k):
        self.m, self.k, self.bits = m_bits, k, bytearray(m_bits // 8)

    def _slots(self, url):                       # k slots from ONE real hash
        h = hashlib.blake2b(url.encode(), digest_size=16).digest()
        a, b = int.from_bytes(h[:8], 'big'), int.from_bytes(h[8:], 'big')
        return [(a + i * b) % self.m for i in range(self.k)]

    def add(self, url):
        for i in self._slots(url):
            self.bits[i // 8] |= 1 << (i % 8)

    def __contains__(self, url):                 # "maybe seen" or "definitely new"
        return all(self.bits[i // 8] >> (i % 8) & 1 for i in self._slots(url))

n, m, k = 100_000, 1_000_000, 7                  # 10 bits/URL, k=7 is near-optimal
bf = Bloom(m, k)
crawled = [f'https://site.com/page/{i}' for i in range(n)]
for u in crawled:
    bf.add(u)

fresh = [f'https://other.com/page/{i}' for i in range(n)]
fp = sum(u in bf for u in fresh)
missed = sum(u not in bf for u in crawled)

print(f'URLs inserted        : {n:,}   bits: {m:,} ({m//n} bits/URL, k={k})')
print(f'false positives      : {fp:,}/{n:,} = {100*fp/n:.3f}%   (theory {100*(1-math.exp(-k*n/m))**k:.3f}%)')
print(f'false negatives      : {missed}   <- impossible by construction')
print(f'bloom memory         : {len(bf.bits):,} B  ({m/8/1024:.0f} KB)')
print(f'hash set, same URLs  : ~{n*124:,} B  (~{n*124/2**20:.1f} MB)  ->  {n*124//len(bf.bits)}x more')

assert missed == 0                               # never lie about "new"
assert fp / n < 0.02                             # and stay near the predicted rate

# ---- real output ----
# URLs inserted        : 100,000   bits: 1,000,000 (10 bits/URL, k=7)
# false positives      : 775/100,000 = 0.775%   (theory 0.819%)
# false negatives      : 0   <- impossible by construction
# bloom memory         : 125,000 B  (122 KB)
# hash set, same URLs  : ~12,400,000 B  (~11.8 MB)  ->  99x more`,
      annotations: {
        5: 'The entire filter is one flat bit array. No stored keys, no pointers — that is where the 99x saving comes from.',
        10: 'Double hashing: split one 128-bit digest into a and b, then generate k indices as a + i*b. Real filters do this — k independent hash functions would cost k times the CPU.',
        17: 'all() short-circuits: the FIRST zero bit proves the URL is new. Most lookups on a fresh URL stop after one or two bit reads.',
        19: 'The only real knob is bits per URL (m/n). 10 bits gives ~0.8%; 16 bits gives ~0.05%. You buy accuracy with memory, linearly in bits and exponentially in payoff.',
        35: 'The safety-critical assertion: a Bloom filter must never claim a crawled URL is new. Only the false-positive direction is allowed to be wrong.',
        43: '99x smaller for the same 100K URLs — and the ratio holds at 10B URLs, which is the difference between ~1 TB of RAM and ~12 GB.',
      },
    },
    {
      type: 'intuition',
      title: 'B8. Traps, hazards, and DNS',
      md: `- **Infinite URL spaces.** A calendar page with a "next month" link generates URLs forever. Cap crawl depth per host, cap pages per host, and detect near-identical page templates.
- **Spider traps.** Dynamically generated link mazes, sometimes deliberate. Same defence — per-host budgets, plus a URL-length limit and a path-repetition check (\`/a/b/a/b/a/b/...\`).
- **Session ids in URLs.** The same page under a thousand ids. Strip them during normalization, and let content dedup catch whatever leaks through.
- **Huge files and slow servers.** Cap the response body (say 10 MB), set connect and read timeouts of a few seconds, cap redirects at ~5 to kill loops. Never let one tarpit hold a worker forever.
- **DNS is a genuine bottleneck.** Every fetch needs a resolution, and DNS is a synchronous network call costing tens of milliseconds — at 400 fetches/s that alone caps your throughput. Fix: an aggressive local DNS cache honouring TTLs, plus asynchronous resolution so a lookup never blocks a fetcher thread.
- **Malformed everything.** Broken HTML, lying Content-Type headers, non-HTML bodies. Parse defensively: a crawler that crashes on bad input crawls nothing.`,
    },
    {
      type: 'intuition',
      title: 'B9. Recrawl policy and distributed crawling',
      md: `*Question: how often do you refetch a page you already have — and how do you split the crawl across machines?*

- Freshness and coverage spend the **same** budget. Every recrawl is a page you did not discover.
- Policy: **poll frequency proportional to observed change rate.** Track whether the content hash changed between fetches; a news homepage that changes hourly earns hourly crawls, a 2009 PDF earns a yearly one.
- Cheap signals first: a conditional GET with \`If-Modified-Since\` / \`If-None-Match\` returns **304 Not Modified** and costs almost no bandwidth. Sitemaps and RSS tell you what changed instead of making you guess.
- Distributed crawling: **partition by \`hash(host)\`, not by \`hash(url)\`.** All URLs of one host land on one worker, so politeness stays a purely local decision — no distributed coordination for crawl delay, which would be the expensive part.
- The cost of that choice is **skew**: one giant site becomes one hot worker. Mitigate by splitting only the largest hosts across workers behind an explicit shared rate limiter — pay coordination cost exactly where it is needed, nowhere else.
- The seen-set partitions the same way, so each worker's Bloom filter covers only its own hosts and stays small.`,
    },
    {
      type: 'note',
      md: 'The honest legal and ethical note. **robots.txt is a convention, not a law** — but ignoring it is how you get IP-banned, and crawling that breaches a site\'s terms of service or degrades its availability has drawn real legal liability in several jurisdictions. The defensible position: fetch and cache robots.txt per host and honour `Disallow` and `Crawl-delay`; identify yourself in the User-Agent with a contact URL; keep request rates well under what a host can absorb; honour takedown requests; and never crawl behind a login or a paywall. Volunteering this unprompted is a senior signal — it shows you understand a crawler is a system that acts on **other people\'s** infrastructure.',
    },
    {
      type: 'intuition',
      title: 'B10. Bottlenecks and tradeoffs',
      md: `- **DNS** — the first ceiling you actually hit. Cache aggressively, resolve asynchronously, and measure resolution latency as a first-class metric.
- **Politeness caps throughput.** You cannot go faster against one host, so total speed comes from crawling **many hosts in parallel**. Your real ceiling is host diversity, not bandwidth.
- **Storage growth never stops.** ~100 TB/month compressed, forever. Compress, dedupe by content hash, tier cold pages to cheaper storage, and be willing to simply drop low-value pages.
- **Freshness vs coverage** — one budget, two demands. Make it an explicit knob (x% of capacity to recrawl, the rest to discovery) and tune it against index-staleness metrics rather than by feel.
- **The frontier itself.** It must be durable — a crash must not lose the queue — and at 10B URLs it does not fit in RAM, so it spills to disk with only the hot head cached in memory.`,
    },
    {
      type: 'intuition',
      title: 'The two sentences that carry both designs',
      md: `- **Autocomplete:** *"I move all the ranking work offline and store the top-k at each trie node, so the request path is one in-memory lookup — and I pay for that in freshness, which I buy back with a small real-time layer."*
- **Crawler:** *"The design is the frontier: front queues decide what to crawl, per-host back queues decide when, and dedup, storage and recrawl policy all hang off it."*
- Both share one shape: **name the single thing that must happen on the hot path, then move everything else off it.** That sentence is what a senior answer sounds like in both rounds.`,
    },
  ],
  quiz: [
    {
      question:
        '100M searches/day, average query 20 characters, no client-side debounce. What QPS does the autocomplete service actually see?',
      options: [
        {
          text: '~1,200 QPS',
          explanation:
            'That is the SEARCH rate (100M / 86,400 ≈ 1,160). But the service is hit once per keystroke, not once per search.',
        },
        {
          text: '~23,000 QPS',
          explanation:
            'Correct. 1,160 searches/s × ~20 keystrokes per search ≈ 23K QPS, peaking near 46K. This multiplier is the whole reason debounce is the first optimization.',
        },
        {
          text: '~120 QPS',
          explanation: 'A 10× slip in the day-to-seconds arithmetic: 100M / 86,400 ≈ 1,160, not 116.',
        },
        {
          text: '~2,000,000 QPS',
          explanation: 'That would require ~20 requests per keystroke. The multiplier is per search, not per character-per-character.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Why is a plain trie — one character per edge, frequency stored at terminal nodes — not enough for autocomplete?',
      options: [
        {
          text: 'Walking the prefix is too slow',
          explanation: 'The walk is O(L) with L ≤ 20 — effectively free. The prefix walk was never the problem.',
        },
        {
          text: 'Tries cannot store frequencies',
          explanation: 'They can: a count on each terminal node is trivial. Storing frequencies is not what costs.',
        },
        {
          text: 'Ranking requires finding the top k across the entire SUBTREE under the prefix, which can be millions of nodes',
          explanation:
            'Correct. Prefix lookup and top-k are two different problems; only the second is hard, and no per-keystroke subtree walk fits a 15ms budget.',
        },
        {
          text: 'Tries require the input sorted first',
          explanation: 'Insertion order is irrelevant to a trie — it is built path by path.',
        },
      ],
      correct: 2,
    },
    {
      question: 'You precompute and store the top-k completions at every trie node. What is the primary cost?',
      options: [
        {
          text: 'Memory — each popular query is duplicated into the top-k list of every one of its prefixes',
          explanation:
            'Correct. "laptop" appears in the lists for l, la, lap, lapt, lapto, laptop. The mitigations are a frequency threshold, radix compression, and sharding by first characters.',
        },
        {
          text: 'Query latency grows with k',
          explanation: 'Reading a 5-element list is constant work. The point of the design is that latency stops depending on the subtree at all.',
        },
        {
          text: 'Writes become slow',
          explanation: 'There are no writes on the serving path — the structure is built offline and shipped as an immutable snapshot.',
        },
        {
          text: 'Prefix matching breaks',
          explanation: 'The trie still matches prefixes exactly as before; only the payload stored at each node changed.',
        },
      ],
      correct: 0,
    },
    {
      question: 'The serving tier loads an immutable snapshot rebuilt hourly and never writes. What is the main consequence?',
      options: [
        {
          text: 'Servers give inconsistent answers to each other',
          explanation: 'Nodes swap atomically, and a briefly mixed fleet is harmless — both snapshots are valid rankings, one is just newer.',
        },
        {
          text: 'The trie can no longer be sharded',
          explanation: 'Sharding is orthogonal: each shard simply loads its own snapshot for its character range.',
        },
        {
          text: 'Query latency increases',
          explanation: 'It decreases. An immutable in-memory structure needs no locks, no invalidation, and no write contention.',
        },
        {
          text: 'Freshness lag — a newly trending query cannot appear until the next build finishes',
          explanation:
            'Correct, and it is the deliberate trade. Buy some back with a small real-time layer that unions surging terms onto the snapshot at query time.',
        },
      ],
      correct: 3,
    },
    {
      question: 'A crawler uses a Bloom filter as its seen-URL set. What does a false positive actually cost?',
      options: [
        {
          text: 'A page gets crawled twice',
          explanation: 'That would be a false NEGATIVE — the filter claiming an already-seen URL is new. Bloom filters cannot produce those.',
        },
        {
          text: 'A never-seen URL is treated as already seen, so that page is silently skipped',
          explanation:
            'Correct. You lose coverage, quietly. At ~0.8% with 10 bits/URL that is an acceptable tax for cutting ~1 TB of RAM to ~12 GB.',
        },
        {
          text: 'The filter is corrupted and must be rebuilt',
          explanation: 'False positives are the expected, tuned behaviour of a correctly working filter — not corruption.',
        },
        {
          text: 'Nothing — with k ≥ 7 hash functions false positives are impossible',
          explanation: 'More hash functions past the optimum makes the rate worse, not zero. k_opt = (m/n)·ln2, and p is never 0.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Why is the URL frontier built as two levels of queues instead of one priority queue?',
      options: [
        {
          text: 'To hold more URLs than fit in RAM',
          explanation: 'Capacity is solved by spilling to disk. That is a storage concern, separate from ordering.',
        },
        {
          text: 'To parallelise HTML parsing',
          explanation: 'Parsing happens after the fetch. The frontier only decides the order of fetches.',
        },
        {
          text: 'Priority and politeness are different questions: front queues pick WHAT to crawl, per-host back queues decide WHEN',
          explanation:
            'Correct. One priority queue would pop 1,000 URLs from the same big site and hammer it. Splitting the two concerns is what makes both satisfiable at once.',
        },
        {
          text: 'Because robots.txt mandates two queues',
          explanation: 'robots.txt specifies access rules and a crawl delay — it says nothing about your data structures.',
        },
      ],
      correct: 2,
    },
    {
      question: 'You partition crawl work across workers by hash(URL) instead of hash(host). What breaks?',
      options: [
        {
          text: 'Politeness — one host is now spread over every worker, so one-request-at-a-time per host needs distributed coordination',
          explanation:
            'Correct. Host-based partitioning exists precisely so the crawl delay stays a local, single-machine decision with zero coordination.',
        },
        {
          text: 'Nothing — hash(URL) spreads load more evenly',
          explanation: 'It does spread more evenly, and that even spread is exactly what destroys per-host rate limiting.',
        },
        {
          text: 'Content deduplication stops working',
          explanation: 'Content dedup runs on body fingerprints and is unaffected by how fetch work is partitioned.',
        },
        {
          text: 'The frontier can no longer be made durable',
          explanation: 'Durability is a storage property, independent of the partition key.',
        },
      ],
      correct: 0,
    },
    {
      question:
        'Two different URLs return the same article; one has a rotating ad slot and a different footer timestamp. Exact content hashing…',
      options: [
        {
          text: 'catches it — hashes ignore small differences',
          explanation: 'The opposite: a cryptographic hash changes completely when one byte changes. That avalanche property is its purpose.',
        },
        {
          text: 'catches it after whitespace normalization',
          explanation: 'Normalizing whitespace does not remove a changed advert or a changed timestamp — the bytes still differ.',
        },
        {
          text: 'is unnecessary — URL normalization already handles this',
          explanation: 'URL normalization cannot see the body. These are genuinely distinct URLs serving near-identical content.',
        },
        {
          text: 'misses it — you need a similarity fingerprint like SimHash, where near-identical documents land within a small Hamming distance',
          explanation:
            'Correct. SimHash/MinHash make "near-duplicate" an indexable distance query instead of an all-pairs comparison, saving crawl budget, storage and index quality.',
        },
      ],
      correct: 3,
    },
  ],
  interviewQuestions: [
    {
      question: 'Design search autocomplete. Take me from requirements through estimation to the serving design.',
      answer:
        'Functional: given a prefix, return the top 5 completions ranked by query popularity, refreshed as trends move. Non-functional: p99 under 100ms or the suggestion is useless, extremely read-heavy, availability over consistency. Estimation: 10M DAU × 10 searches = 100M searches/day ≈ 1,160 search QPS — but every keystroke is a request, so at ~20 characters that is ~23K QPS. My first optimization is client-side debounce (fire after a ~50ms pause, skip prefixes under 3 characters), which cuts it to ~6K. Subtracting network round trip from the 100ms budget leaves the server ~15ms, which rules out any subtree walk. So: a trie for the prefix walk, with the **top-k precomputed and stored at each node** — the query becomes walk L characters, read a list, return. The structure is built offline from aggregated query logs and shipped to serving nodes as an immutable snapshot, so the serving path never writes: no locks, no invalidation. I pay for that in freshness and buy some back with a small real-time layer for surging terms. Then cache hot prefixes in an LRU and CDN the short, non-personalized ones.',
      isCaseBased: true,
    },
    {
      question: 'Why not just hit the search index with a prefix query — SELECT … WHERE query LIKE \'lap%\' ORDER BY count DESC LIMIT 5?',
      answer:
        'Because you are asking a general-purpose engine to do ranking work per keystroke inside a 15ms budget, at 6K+ QPS. Even with a well-chosen index, a prefix range scan over a popular prefix touches a huge number of candidate rows and then sorts them — the cost scales with how many queries share the prefix, which is exactly backwards: the most common prefixes (short ones) are the most expensive. The precomputed-top-k trie makes cost depend on prefix LENGTH, not on how many queries match. And it moves the ranking work to an offline job that can afford to be slow. The honest caveat: at small scale the LIKE query is completely fine, and I would ship it first — the trie design is what you build when you can name the QPS and latency number it fails at.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through the top-k-at-each-node structure. What does it cost and how do you keep it in memory?',
      answer:
        'Every trie node stores its own precomputed list of the k best completions of its prefix, so a query is: walk L characters, read the list, return — O(L) with no subtree traversal. The cost is duplication: "laptop" occupies a slot in the top-k list of l, la, lap, lapt, lapto and laptop. Three mitigations, in the order I would apply them. (1) Frequency threshold: only keep lists for prefixes above a bar, since most distinct prefixes are searched almost never; the tail degrades rather than costing memory. (2) Radix/compressed trie: merge single-child chains, so a non-branching run like "lapt→lapto→laptop" collapses to one node. (3) Shard by the first one or two characters — a routing key every request already carries. Sizing it: ~20M kept prefixes × 5 × ~24 bytes ≈ 2.4 GB, which fits in RAM, and if it gets tight I store suggestion ids plus a per-shard string table instead of raw strings.',
      isCaseBased: false,
    },
    {
      question:
        'Case: autocomplete p99 has crept from 60ms to 400ms and users complain suggestions "lag behind typing". Diagnose it and give me the fix order.',
      answer:
        'First separate client from server. If server p99 is flat, the problem is request volume or ordering: check whether a client release removed or lengthened debounce (a 20× traffic swing from one client change is common), and check for out-of-order responses — a late reply for "lap" overwriting a fresh one for "lapto" looks exactly like lag even at 20ms. If server p99 really rose: (a) is the box swapping or GC-thrashing because the snapshot outgrew RAM — the top failure mode for this design; (b) did a snapshot build regress and start shipping a much larger structure; (c) is the real-time layer (the one component that writes) contending with reads; (d) has cache hit rate on hot prefixes dropped. Fix order, cheapest first: restore/strengthen debounce and sequence-number dropping on the client, re-check the LRU and CDN hit rates, shard the trie by first character to get the working set back in memory, and only then look at more nodes. What I would NOT do first is add servers — if the structure no longer fits in memory, every new node has the same problem.',
      isCaseBased: true,
    },
    {
      question: 'A query starts trending in the last five minutes. Your snapshot rebuilds hourly. What do you do?',
      answer:
        'Accept that the immutable snapshot cannot cover it, and add a deliberately small real-time layer beside it: a streaming job counts queries over a short sliding window and holds a few thousand surging terms with their counts. At request time the server unions those against the snapshot top-k for the prefix and re-ranks. Two things to say about the tradeoff. First, keep it small on purpose — it is the only live-write component in an otherwise read-only design, so it is where contention and bugs will concentrate, and a bounded size bounds the blast radius. Second, it needs abuse resistance: a "surging term" detector is trivially gamed by a botnet, so require a minimum distinct-user count, not just a raw query count. If the business does not actually need minute-level freshness, the cheaper answer is to shorten the build cadence and skip the layer entirely.',
      isCaseBased: false,
    },
    {
      question: 'How would you personalize autocomplete, and what does personalization cost you architecturally?',
      answer:
        'Not with a per-user trie — that multiplies your single biggest constraint (memory) by your user count. The practical shape is one global structure plus a small per-user list: the user\'s recent queries and clicked results, fetched by user_id from a key-value store, merged with the global top-k and re-ranked at request time with a blend weight. Costs, all worth volunteering: (1) those responses are user-specific, so they must be marked private and can never be edge-cached — you lose the CDN for your most engaged users; (2) latency now includes a second lookup, which eats into a 15ms budget; (3) it creates a privacy surface — the suggestion box will show a user\'s own history, which needs incognito handling and deletion support. My default is to personalize only the top slot or two and keep the rest global, so most of the CDN benefit survives.',
      isCaseBased: false,
    },
    {
      question: 'Spelling correction in autocomplete — where does it live, and why not build it into the trie?',
      answer:
        'It lives BEFORE the lookup, as a separate corrector. A trie matches prefixes exactly, so "lpatop" walks off the tree at character two and returns nothing. The tempting fix — explore neighbouring branches within edit distance 1 or 2 — multiplies the work per node by the alphabet size at every level, and you blow the exact latency budget the precomputed design exists to protect. Instead: a dedicated corrector maps the typed prefix to one or a few likely corrections (a symmetric-delete index or a BK-tree over the query vocabulary, or a learned model trained on query-reformulation logs), and you look those up in the trie normally. Two extras interviewers like: keyboard-adjacency-weighted edit distance beats plain Levenshtein for typos, and you should show the correction ("showing results for laptop") rather than silently rewriting, because silent rewrites destroy trust when they are wrong.',
      isCaseBased: false,
    },
    {
      question: 'Case: design a web crawler that fetches one billion pages per month. Requirements through architecture.',
      answer:
        'Functional: fetch from seeds, extract and follow links, store content for an indexer, revisit pages over time. Non-functional: politeness is a hard requirement — overload a host and you get firewalled — plus horizontal scalability, robustness against traps and malformed input, and an explicit freshness-versus-coverage split. Estimation: 1e9 / 2.59e6 s ≈ 386 pages/sec (peak ~800); at 500 KB average that is ~193 MB/s ≈ 1.5 Gbps in, and 500 TB/month raw or ~100 TB compressed. Fetching is I/O-bound, so ~10–16 machines at 100+ concurrent connections cover it. Components: URL frontier, fetchers, parser, duplicate detection, storage, and a DNS cache in front of everything. Data model is hash-keyed with no joins — wide-column store for metadata, blob storage keyed by content hash for bodies. The two things I would deep-dive are the frontier (priority front queues plus per-host back queues) and dedup (normalized-URL Bloom filter for exact, SimHash for near-duplicate content). Bottlenecks: DNS first, then politeness capping throughput, then storage growth.',
      isCaseBased: true,
    },
    {
      question: 'Design the URL frontier. Be specific about how politeness and priority coexist.',
      answer:
        'Two levels, because they answer different questions. Front queues answer WHAT: f queues, one per priority band, and a prioritizer scores each URL on importance (PageRank-like), observed change rate, and depth, then routes it to a band. A biased selector reads from high bands more often but never exclusively, so low-priority URLs are not starved. Back queues answer WHEN: b queues, each dedicated to exactly ONE host, with a host→queue mapping table; a worker binds to one back queue, which makes "one in-flight request per host" true by construction rather than by coordination. A min-heap of (next_allowed_time, queue_id) tells a worker which queue is due, and after each fetch it pushes next_allowed_time = now + crawl_delay, taken from robots.txt or a safe default. The properties worth naming: a slow host stalls only its own back queue; the frontier must be durable, since losing it loses the crawl; and at 10B URLs it does not fit in RAM, so it spills to disk with the hot head in memory.',
      isCaseBased: false,
    },
    {
      question: 'Bloom filter versus a real hash set for the seen-URL set. Defend the choice and tell me what it breaks.',
      answer:
        'At 10 billion discovered URLs a hash set is roughly 1 TB of RAM (key plus overhead per entry); a Bloom filter at 10 bits/URL is about 12 GB — two orders of magnitude, and I measured ~0.8% false positives at that size, matching the (1−e^(−kn/m))^k prediction. The error direction is what makes it acceptable: a false positive means treating a new URL as seen and silently skipping one page in a billion, while a false negative — which the structure cannot produce — would mean re-crawling and link loops. What it breaks: you cannot delete (so "recrawl this URL" or "forget this host" needs a counting Bloom filter or a periodic rebuild from the metadata store), you cannot enumerate what is in it, and the miss is invisible — you lose coverage without any signal, so I would sample-audit against the authoritative URL table. If exactness mattered more than memory, the middle path is a sharded on-disk hash set with the Bloom filter as a front-line negative cache.',
      isCaseBased: false,
    },
    {
      question:
        'Case: within one week, three major sites have IP-banned your crawler and one has sent a legal complaint. What went wrong, and how do you fix it?',
      answer:
        'The near-certain cause is broken politeness, and the usual root is a partitioning bug: if work is sharded by hash(URL) rather than hash(host), many workers hold URLs for the same host and each independently believes it is respecting a crawl delay — so the host sees N times the intended rate. Second candidate: robots.txt is fetched but its Crawl-delay is ignored, or the robots cache TTL is so long that a site tightening its rules never takes effect. Third: retry storms — a host starts returning 503, every worker retries immediately without backoff, and the crawler amplifies a site that was already struggling. Fixes, in order: repartition by hash(host) so per-host rate limiting is a local decision; honour robots.txt Disallow and Crawl-delay with a short cache TTL and a conservative default; add exponential backoff with jitter plus a per-host circuit breaker on error rate; identify the crawler in the User-Agent with a contact URL and publish an opt-out path; and add per-host request-rate dashboards with alerts, because this class of failure is invisible until someone bans you. On the legal side the honest position is that robots.txt is a convention, not a law — but terms of service and availability damage are real liability, so I would stop crawling the complaining host immediately and treat compliance as a requirement, not a nicety.',
      isCaseBased: true,
    },
    {
      question: 'How do you decide how often to recrawl a page, given a fixed crawl budget?',
      answer:
        'Start from the constraint: freshness and coverage spend the same budget, so every recrawl is a page not discovered. Make that split an explicit tunable (say 30% recrawl, 70% discovery) driven by an index-staleness metric rather than intuition. Within the recrawl share, set poll frequency proportional to the observed change rate: store the content hash on each fetch and track how often it changes, so a news homepage that changes hourly earns hourly crawls and a static 2009 PDF earns a yearly one. Weight that by page importance — a rarely-changing but heavily-linked page still deserves attention. Use cheap signals before expensive ones: conditional GETs with If-Modified-Since/If-None-Match return 304 and cost almost no bandwidth, so a "check" is far cheaper than a fetch; sitemaps and RSS/feeds report changes directly. Two failure modes to name: near-duplicate churn (an ad slot or timestamp changes every fetch) makes a static page look volatile, which is why change detection should run on a SimHash of the main content rather than a raw byte hash — and unbounded recrawl of a huge fast-changing site can quietly eat the entire budget, so cap per-host share.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    {
      front: 'Autocomplete: the keystroke multiplier',
      back: 'Every keystroke is a request, not every search. 100M searches/day ≈ 1,160 search QPS, but ~20 chars/query ≈ 23K real QPS. First fix is client-side debounce (~50ms pause, skip prefixes < 3 chars) → back to ~6K.',
    },
    {
      front: 'Why a plain trie fails for typeahead',
      back: 'Prefix walk is O(L) and free. Ranking means finding the top-k in the SUBTREE under the node — millions of nodes for "a". Prefix lookup and top-k are different problems; only top-k is hard.',
    },
    {
      front: 'The autocomplete trick, one line',
      back: 'Precompute and store the top-k completions AT EACH NODE. Query = walk L chars, read a 5-element list, return. Cost: memory duplication along every prefix path.',
    },
    {
      front: 'Three ways to shrink the top-k trie',
      back: '(1) Frequency threshold — only keep lists for prefixes above a bar. (2) Radix tree — merge single-child chains. (3) Shard by first 1–2 characters. Then store ids + a string table instead of raw strings.',
    },
    {
      front: 'Why the autocomplete serving path never writes',
      back: 'Logs → hourly/daily aggregation with time decay → builder makes ONE immutable snapshot → nodes load it and swap atomically. No locks, no invalidation. Price: freshness lag, softened by a small real-time layer for surging terms.',
    },
    {
      front: 'Fuzzy matching in autocomplete — where?',
      back: 'NOT in the trie. A trie matches prefixes exactly; edit-distance exploration multiplies branches per keystroke and blows the 15ms budget. Use a separate corrector (symmetric-delete index / BK-tree / learned model) that rewrites the prefix BEFORE lookup.',
    },
    {
      front: 'Crawler estimation, 1B pages/month',
      back: '1e9 / 2.59e6 s ≈ 386 pages/s (peak ~800). × 500 KB ≈ 193 MB/s ≈ 1.5 Gbps. 500 TB/month raw, ~100 TB gzipped. I/O-bound → ~10–16 fetchers at 100+ concurrent connections.',
    },
    {
      front: 'The two-level URL frontier',
      back: 'Front queues = priority (one per band, biased selector, no starvation). Back queues = politeness (one host per queue, worker bound to a queue, min-heap on next_allowed_time = now + crawl_delay). What vs when, separated.',
    },
    {
      front: 'Bloom filter tradeoff for the seen-set',
      back: 'Answers "definitely new" or "maybe seen". False positives possible (skip a page); false negatives impossible (never re-crawl or loop). 10 bits/URL → ~0.8%; 10B URLs → ~12 GB vs ~1 TB for a hash set. Cannot delete or enumerate.',
    },
    {
      front: 'Two levels of crawler dedup',
      back: 'URL: normalize (lowercase host, strip fragment/session ids, sort params) then hash into a Bloom filter. CONTENT: exact content hash catches byte-identical only — near-duplicates need SimHash/MinHash, i.e. small Hamming distance on a fingerprint.',
    },
  ],
  mindmapMarkdown: `- Case Studies: Search Autocomplete & Web Crawler
  - Method (both)
    - Requirements → estimation → API → data model → HLD → 2 deep dives → bottlenecks
    - Move everything off the hot path
  - A. Autocomplete
    - Requirements
      - Top-k by popularity, p99 < 100ms
      - Read-heavy, availability > consistency
    - Estimation
      - 100M searches/day ≈ 1,160 QPS
      - Keystroke multiplier ×20 → 23K QPS
      - Debounce first → ~6K QPS
      - Server budget ~15ms
    - API
      - GET /suggestions?prefix&k — cacheable
      - No write API on the serving path
    - Trie at scale
      - Prefix walk O(L) is free
      - Subtree top-k is the hard part
      - Deep dive 1: top-k stored AT each node
      - Memory: threshold, radix tree, shard by first chars
    - Deep dive 2: build & ship pipeline
      - Logs → aggregate + decay → build → immutable snapshot
      - Atomic swap, rollback = previous snapshot
      - Freshness lag + small real-time layer
    - Caching
      - LRU on hot prefixes (Zipf)
      - CDN short prefixes; personalized = private
    - Bottlenecks
      - Memory, long tail of rare prefixes
      - Personalization multiplies state, kills CDN
      - Spelling correction lives outside the trie
  - B. Web crawler
    - Requirements
      - Seeds → fetch → links → store → recrawl
      - Politeness is a hard requirement
    - Estimation
      - 386 pages/s, 1.5 Gbps, ~100 TB/month gzipped
      - ~10–16 I/O-bound fetchers
    - Architecture
      - Frontier, fetchers, parser, dedup, storage, DNS cache
      - BFS from seeds; visited set = URL dedup
    - Deep dive 1: the frontier
      - Front queues = priority band
      - Back queues = one host each, crawl delay
      - Heap on next_allowed_time
    - Deep dive 2: dedup
      - URL normalize → Bloom filter (12 GB vs 1 TB)
      - False positive = skipped page; no false negatives
      - Near-duplicate content → SimHash / MinHash
    - Traps & hazards
      - Infinite calendars, spider traps, session ids
      - Body caps, timeouts, redirect limits
      - DNS is the first bottleneck — cache it
    - Recrawl & distribution
      - Poll ∝ change rate; 304 / sitemaps are cheap
      - Partition by hash(host) → politeness stays local
      - Skew: split giant hosts with a shared limiter
    - Ethics & law
      - robots.txt, Crawl-delay, User-Agent contact
      - No login/paywall content
    - Bottlenecks
      - DNS, politeness caps throughput
      - Storage growth, freshness vs coverage`,
}

export default m
