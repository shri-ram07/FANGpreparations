import type { Module } from '../types'

const m: Module = {
  id: 'sysdesign-l0-scaling-basics',
  subjectId: 'sysdesign',
  level: 0,
  title: 'Client-Server, Vertical vs Horizontal Scaling & Load Balancers',
  whyItMatters:
    'This is the first five minutes of every system design interview. Before caches, queues or sharding, you must be able to trace one request through the stack, say where it slows down, choose between a bigger box and more boxes, and point at your own single points of failure before the interviewer does. Get this module wrong and every later answer is built on sand.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'One box works. Then the traffic arrives.',
      md: `A single restaurant with one chef serves the neighbourhood perfectly. The day a review goes viral, nothing about the food is wrong — the kitchen just has one of everything.

- **Client-server** is the whole model: a client (browser, mobile app, another service) sends a request, a server does work and returns a response. Everything else in system design is layers added between those two.
- Your first architecture is one machine: web server, application code and database on the same box. That is correct, and it is what you should say you would start with.
- It breaks in one of three ways: CPU saturates, memory fills, or disk/network IO stalls. *Which* one breaks first tells you what to fix — guessing is what juniors do.
- The two escape routes are the whole of this module: give that box **more** (vertical), or add **more boxes** (horizontal).
- Everything after that — load balancers, caches, replicas, queues — exists to make "more boxes" actually work.`,
    },
    {
      type: 'intuition',
      title: 'The journey of one request',
      md: `Type a URL, press enter. Before your code runs a single line, four other systems have already had an opinion.

1. **DNS** — turn \`api.example.com\` into an IP. Cached: ~0 ms. Cold: 20–120 ms, and it happens before anything else can start.
2. **CDN / edge** — a server near the user answers static content directly. A hit costs 10–30 ms and your origin never hears about the request at all.
3. **Load balancer** — picks a healthy app server and terminates TLS. Adds ~1 ms, plus one more hop that can fail.
4. **App server** — your code. Its own CPU time is usually small; what it *waits on* is not.
5. **Cache** (Redis/Memcached) — 0.5–2 ms in the same datacenter. Hit here and the database never wakes up.
6. **Database** — 1–10 ms for an indexed read, tens to hundreds of ms for a bad one. This is usually the hop that owns your p99.

Read that list as a **latency budget**: a 200 ms target is spent, not earned. Every hop you add spends some of it, and the slowest hop owns your tail latency.`,
    },
    {
      type: 'note',
      md: `**Latency numbers every engineer should know** — memorize the *shapes*, not the digits.

- **Main memory** read: ~100 ns. Effectively free. Not worth optimizing until everything else is done.
- **SSD** random read: ~100 µs — about **1,000×** slower than memory.
- **Network round trip inside one datacenter**: ~0.5 ms — ~5× an SSD read, ~5,000× a memory read.
- **Cross-continent round trip**: ~150 ms — that is physics, not engineering. Light in fibre from London to Sydney simply takes that long.
- The practical reading: one cross-continent trip costs more than a *million* memory reads. So the wins come in this order — do not cross the ocean (CDN/edge), do not touch disk (cache), do not make N calls where 1 would do (batch). Micro-optimizing CPU is last.`,
    },
    {
      type: 'intuition',
      title: 'Vertical scaling: buy a bigger machine',
      md: `The kitchen is slow, so you hire a faster chef and install a bigger stove. Nothing about the recipes changes.

- **Vertical scaling (scale up)** = same machine, more CPU/RAM/IOPS. In the cloud it is one instance-type change and a reboot.
- The huge advantage: **zero code changes**. No distributed state, no coordination, no new failure modes. One modern Postgres box handles far more than juniors assume — tens of thousands of simple QPS is routine.
- First problem is the cost curve: price grows *faster* than the specs. The top-end instance is often 3–4× the price of the one half its size.
- Second problem is the hard ceiling: there is a largest machine that exists. You cannot buy the next one.
- The real killer: it is still **one box**. One power supply, one kernel panic, one maintenance window — a single point of failure, and no amount of money buys redundancy this way.`,
    },
    {
      type: 'intuition',
      title: 'Horizontal scaling: buy more machines',
      md: `Instead of one superhuman chef, open five identical kitchens and send each order to whichever is free.

- **Horizontal scaling (scale out)** = more machines, each ordinary. Capacity is near-unlimited: need 2× throughput, run 2× the boxes.
- Commodity hardware is cheaper per unit of work — ten mid-size servers usually beat one giant one for the same total CPU.
- **A node dying stops being an outage.** Traffic moves to the survivors. That is the property vertical scaling can never buy at any price.
- Autoscaling only exists here: add instances for the evening peak, remove them at 3 a.m., pay for what you use.
- The bill comes in three parts: servers must not care which one gets the request (**statelessness**), they must agree on shared decisions (**coordination** — leader election, distributed locks), and the data must live somewhere splittable (**partitioning**, the sharding module). Debugging is now distributed too.`,
    },
    {
      type: 'note',
      md: `**The line to say in an interview:** *scale up until it hurts, then scale out — and design from day one so that you CAN scale out.* It respects both truths at once. Vertical scaling really is the cheaper, simpler answer for the first few years, and horizontal scaling is brutal to retrofit onto code that assumes one machine. The day-one design work is not building a cluster; it is three refusals — do not keep state in the process, do not write to local disk, do not assume the same user hits the same server. Those refusals cost nothing today and *are* the migration later.`,
    },
    {
      type: 'intuition',
      title: 'Statelessness is what makes scale-out work',
      md: `A ticket counter where any clerk can serve you, because your ticket carries everything they need. Nobody has to hunt for "your" clerk.

- A server is **stateless** when it keeps nothing between requests that another server would need. All context arrives in the request (token, IDs) or is fetched from shared storage.
- This is the enabling property. If any server can handle any request: load balancing becomes trivial (pick anyone healthy), autoscaling works (a new instance is instantly useful), and a crash is harmless (retry elsewhere).
- Stateless does **not** mean the system has no state. It means the state does not live *inside the process*.
- The test: could you kill any app server at random, right now, and lose nothing but in-flight requests? If not, you have hidden state.
- The usual hiding places: in-memory sessions, uploaded files on local disk, an in-process cache treated as the truth, and a background scheduler that only one instance is allowed to run.`,
    },
    {
      type: 'note',
      md: `**So where does the state actually go?** Three honest homes: a **session store** (Redis with a TTL — the standard answer), a **cache** for expensive-but-reconstructible data, and the **database** for anything that must survive. Or push it to the client: a signed token (JWT) carries identity in the request itself, so no server-side lookup is needed at all — at the price of tokens you cannot easily revoke.

**Sticky sessions** — the load balancer pins a user to the server that first served them — are the workaround for having skipped all that. They work, and they are a smell: that instance is now special, so its death logs those users out; load spreads unevenly (a freshly added instance only ever gets new users); and every deploy becomes disruptive. Acceptable as a stopgap, or for genuinely long-lived connections like WebSockets. Never as the plan.`,
    },
    {
      type: 'intuition',
      title: 'What a load balancer actually does',
      md: `A restaurant host at the door: sees which tables are free, seats you there, and notices the table with a broken leg and stops using it.

- **Distribute** — spread incoming requests across a pool of servers by some algorithm.
- **Health-check** — stop sending traffic to instances that fail a probe, resume when they pass. This is the mechanism that turns a dead server into a non-event.
- **Terminate TLS** — decrypt once at the edge so backends speak plain HTTP internally. One place to manage certificates, less CPU burned per app server.
- **Retry and shed** — resend a failed request to a different instance; reject or queue traffic beyond capacity instead of letting everyone drown together.
- Beat the interviewer to the obvious follow-up: **the load balancer itself must not be a single point of failure.** Run a pair (active-passive with a floating IP), or use a managed one whose redundancy is somebody else's problem.`,
    },
    {
      type: 'intuition',
      title: 'L4 vs L7 — bytes versus requests',
      md: `- **L4 (transport layer)** balances on IP and port. It forwards packets without reading them: fast, cheap, protocol-agnostic — any TCP traffic works, including databases, game servers and raw gRPC streams. It cannot see the URL, so it cannot route on one.
- **L7 (application layer)** parses the HTTP request. Now it can route by **path** (\`/api/*\` to one pool, \`/static/*\` to another), by header, by cookie; run **canary releases** (5% of traffic to the new version); rewrite headers; cache; and enforce per-route rate limits.
- L7 costs more: it terminates and re-establishes connections, burns more CPU per request, and adds a millisecond or so.
- Choose L4 for raw throughput or non-HTTP protocols. Choose **L7 for normal application traffic** — the routing intelligence is worth far more than the millisecond.
- One clean sentence to remember: *L4 moves bytes, L7 understands requests.*`,
    },
    {
      type: 'intuition',
      title: 'The algorithms, and what each one costs',
      md: `- **Round-robin** — server 1, 2, 3, 1, 2, 3… Perfectly fair in *counts*, and wrong the moment requests cost wildly different amounts. Fine default when servers and requests are uniform.
- **Weighted round-robin** — give bigger machines a bigger share. The fix for a heterogeneous fleet, and the knob for slow-rolling traffic onto a new version.
- **Least-connections** — send to whoever is handling the fewest right now. Beats round-robin whenever request costs are uneven: an instance stuck on three slow uploads automatically stops receiving new work.
- **Least-response-time** — least-connections plus measured latency. Best signal, most sensitive to noise; it can herd all traffic onto whichever instance just happened to look fast.
- **IP-hash / consistent hash** — the same key always maps to the same server. Buys session affinity without a session store, and **cache locality** (that instance already has the object in memory). Consistent hashing is what stops a node change from reshuffling everything — see the sharding module.
- Rule of thumb: uniform work → round-robin; uneven work → least-connections; affinity or cache locality needed → consistent hash.`,
    },
    {
      type: 'note',
      md: `**Passive vs active health checks.** *Passive*: watch real traffic — an instance returning 5xx or timing out repeatedly gets ejected. Free, but it only notices after real users have already been hurt. *Active*: the balancer calls \`/health\` every few seconds on its own. Catches failure before users do, at the cost of a probe per instance per interval — and now you must decide what \`/health\` means. Shallow (the process answers) misses a broken database; deep (checks every dependency) marks an instance unhealthy for problems it did not cause and cannot fix. Real systems run both: a shallow liveness probe and a slightly deeper readiness probe.

**The cascading failure worth naming in an interview:** the check is too aggressive — say a 200 ms timeout — and a traffic spike pushes every instance to 250 ms. The balancer dutifully pulls out *all* of them, the pool is empty, everything 503s, the instances recover under zero load, get added back, get flooded by the backlog, and time out again. A perfectly healthy fleet, taken down by its own health check. The fix is hysteresis and honesty: generous timeouts, several consecutive failures before ejection, slow re-admission, and a floor that refuses to eject below a minimum healthy count (Envoy calls it the panic threshold).`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One request through the stack — then a server dies',
        notice: 'Follow the arrow. Each frame is one hop; watch what the health check does when an app server stops answering, and what is left holding everything up.',
        leftLabel: 'in flight',
        rightLabel: 'infrastructure',
        frames: [
          {
            note: 'The browser has an IP for nothing yet. Hop 1 is DNS: resolver to root to TLD to authoritative, then cached. Warm, this costs ~0 ms; cold it costs 20-120 ms before your system is even contacted.',
            stack: [{ name: 'GET /feed', to: 'dns' }],
            heap: [
              { id: 'dns', value: 'api.example.com -> 203.0.113.9', label: 'DNS - answers before your system exists' },
              { id: 'lb', value: 'L7, health-checking 3 targets', label: 'load balancer' },
              { id: 'app1', value: 'app-1  healthy  12 conns', label: 'app server' },
              { id: 'app2', value: 'app-2  healthy   9 conns', label: 'app server' },
              { id: 'app3', value: 'app-3  healthy  14 conns', label: 'app server' },
              { id: 'cache', value: 'redis: feed:u42 -> MISS', label: 'cache' },
              { id: 'db', value: 'postgres primary', label: 'database' },
            ],
          },
          {
            note: 'Hop 2: the request reaches the load balancer, which terminates TLS and picks a target. Least-connections sends it to app-2 (9 in flight, the lowest). Because the app servers are stateless, any of the three would have been correct.',
            stack: [{ name: 'GET /feed', to: 'lb' }, { name: 'LB picks', to: 'app2' }],
            heap: [
              { id: 'dns', value: 'api.example.com -> 203.0.113.9', label: 'DNS (cached now)' },
              { id: 'lb', value: 'least-connections -> app-2', label: 'load balancer - TLS terminated here' },
              { id: 'app1', value: 'app-1  healthy  12 conns', label: 'app server' },
              { id: 'app2', value: 'app-2  healthy  10 conns', label: 'app server - serving this request' },
              { id: 'app3', value: 'app-3  healthy  14 conns', label: 'app server' },
              { id: 'cache', value: 'redis: feed:u42 -> MISS', label: 'cache' },
              { id: 'db', value: 'postgres primary', label: 'database' },
            ],
          },
          {
            note: 'Hop 3 and 4: app-2 checks the cache (0.5 ms) and MISSES, so it must ask the database (about 6 ms for an indexed read) and then fill the cache. The cache miss is what makes this request 10x more expensive than the next identical one.',
            stack: [{ name: 'app-2 reads', to: 'cache' }, { name: 'on miss ->', to: 'db' }],
            heap: [
              { id: 'dns', value: 'api.example.com -> 203.0.113.9', label: 'DNS (cached)' },
              { id: 'lb', value: 'least-connections -> app-2', label: 'load balancer' },
              { id: 'app1', value: 'app-1  healthy  12 conns', label: 'app server' },
              { id: 'app2', value: 'app-2  healthy  10 conns', label: 'app server - waiting on IO' },
              { id: 'app3', value: 'app-3  healthy  14 conns', label: 'app server' },
              { id: 'cache', value: 'MISS -> then SET feed:u42 ttl=60s', label: 'cache - 0.5 ms' },
              { id: 'db', value: 'SELECT ... WHERE user_id=42', label: 'database - ~6 ms, the slow hop' },
            ],
          },
          {
            note: 'app-2 dies mid-shift. Two active health checks fail in a row, so the balancer ejects it from the pool and its share of traffic redistributes across app-1 and app-3. Users notice nothing except slightly higher load elsewhere. This is the payoff of horizontal scaling plus statelessness: a dead box is a non-event, not an outage.',
            stack: [{ name: 'GET /feed', to: 'lb' }, { name: 'app-2 ejected', to: 'app2', danger: true }],
            heap: [
              { id: 'dns', value: 'api.example.com -> 203.0.113.9', label: 'DNS' },
              { id: 'lb', value: '2 failed probes -> pool = {app-1, app-3}', label: 'load balancer - health check fired' },
              { id: 'app1', value: 'app-1  healthy  18 conns', label: 'app server - absorbing the share' },
              { id: 'app2', value: 'app-2  DOWN  probe timeout', label: 'app server - out of rotation', danger: true },
              { id: 'app3', value: 'app-3  healthy  19 conns', label: 'app server - absorbing the share' },
              { id: 'cache', value: 'redis: feed:u42 -> HIT', label: 'cache - warm now' },
              { id: 'db', value: 'postgres primary', label: 'database' },
            ],
          },
          {
            note: 'Now the discipline: point at every box that exists exactly once. The app tier is redundant, but ONE database sits under all of it, and every surviving path still ends there. Lose it and three healthy app servers serve three healthy errors. Same story for a lone load balancer. Either make it redundant (replica ready for promotion, LB pair on a floating IP) or accept the risk out loud.',
            stack: [
              { name: 'app-1 ->', to: 'db', danger: true },
              { name: 'app-3 ->', to: 'db', danger: true },
            ],
            heap: [
              { id: 'lb', value: 'single LB instance', label: 'SPOF unless paired', danger: true },
              { id: 'app1', value: 'app-1  healthy', label: 'redundant - fine' },
              { id: 'app3', value: 'app-3  healthy', label: 'redundant - fine' },
              { id: 'cache', value: 'redis (single node)', label: 'SPOF - but degradable to DB reads' },
              { id: 'db', value: 'postgres primary - ONE copy', label: 'SPOF - everything depends on it', danger: true },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'DNS: the hop before your system',
      md: `DNS is the phone book, and it answers before your architecture even gets a vote.

- The resolution journey: your **resolver** (ISP, or 8.8.8.8) asks a **root** server "who handles .com?", then the **TLD** server "who is authoritative for example.com?", then the **authoritative** nameserver "what is the A record for api.example.com?" — two referrals, then an answer.
- Almost every real lookup skips all of it: results are cached at the resolver, the OS and the browser. Cold path 20–120 ms; warm path ~0.
- **TTL** is the entire tradeoff. Low TTL (30–60 s) means you can move traffic quickly, at the cost of far more queries. High TTL (hours) is cheap and fast, but a change takes hours to reach everyone.
- **DNS load balancing**: hand back several A records, or rotate them, and clients spread themselves — crude (no health awareness, no load awareness) but free and global. **Geo-routing**: answer with the IP nearest the resolver, which is how one hostname sends Europeans to Frankfurt and Indians to Mumbai.
- **Anycast**, one line: many datacenters announce the *same* IP address and the network routes each user to the nearest one — how root DNS servers and CDN edges work.`,
    },
    {
      type: 'note',
      md: `**DNS failover is slow, and volunteering that fact is a senior tell.** You control the TTL you publish; you do not control who obeys it. Resolvers cache past expiry, browsers keep their own cache for the life of a tab, and stale entries outlive the record change by a lot. So "we will fail over with DNS" means minutes of some users still hammering a dead IP — occasionally much longer. Use DNS for *coarse* decisions (which region, which CDN, which provider) and something faster for real failover: a load balancer with health checks in front of the servers, or a floating/anycast IP that moves while the name never changes. "DNS failover is minutes, not seconds" is the sentence to have ready.`,
    },
    {
      type: 'intuition',
      title: 'The single-point-of-failure discipline',
      md: `The method is mechanical, and interviewers watch for it: **draw the system, then point at every box that exists exactly once.**

- The list is usually shorter than people fear: the load balancer, the primary database, the cache (if you treat it as required), the message broker, the auth service, the single region you deploy to.
- For each one, choose out loud: make it **redundant** (a second LB on a floating IP, a replica ready for promotion, a multi-AZ deployment), **degrade gracefully** (cache down → serve from the database, slower but alive), or **accept the risk explicitly** ("a single-region outage takes us down; that is fine at our scale, and here is what fixing it would cost").
- Accepting a risk *out loud* scores points. Not noticing it does not.
- Redundancy is never free: two of everything doubles cost, adds failover logic that is itself a source of bugs, and raises split-brain questions ("who is the leader now?").
- The pattern to remember: **N+1, spread across failure domains.** Two instances in the same rack share a power supply; two in different availability zones do not.`,
    },
    {
      type: 'intuition',
      title: 'Availability arithmetic interviews actually run',
      md: `"Four nines" sounds like a slogan until you convert it into minutes.

- 99% → 5,256 min/year (about 3.65 days). 99.9% → 526 min (**~8.7 hours**). 99.99% → 53 min (**~52 minutes**). 99.999% → 5 min.
- Each extra nine costs roughly 10× more engineering. That is the real reason to ask "what does this genuinely need?" before promising five nines.
- **Dependencies in series multiply.** If a request needs services A, B and C, all three must be up: 0.999 × 0.999 × 0.999 = **0.997**. Three 99.9% services chained give 99.7% — 1,575 minutes a year. A chain is always weaker than its weakest link.
- **Redundancy in parallel multiplies the FAILURE probabilities instead.** Two independent 99% instances are both down only 0.01 × 0.01 = 0.0001 of the time → **99.99%**. Two 99% boxes beat one 99.9% box.
- The word doing all the work is *independent*. Two replicas in the same rack, on the same power feed, running the same buggy release, do not fail independently — and the arithmetic quietly stops being true.`,
    },
    {
      type: 'math',
      intro: 'The two rules, formally. Series always drags you down; parallel always lifts you up.',
      latex: [
        'A_{\\text{series}} = \\prod_{i=1}^{n} A_i \\quad \\text{(every dependency must be up)}',
        'A_{\\text{parallel}} = 1 - \\prod_{i=1}^{n} (1 - A_i) \\quad \\text{(only one replica must be up)}',
        'D_{\\text{minutes/year}} = (1 - A) \\times 525{,}600',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Do the arithmetic, do not eyeball it',
      code: `MIN_PER_YEAR = 365 * 24 * 60                  # 525,600

def downtime(a):                              # minutes down per year
    return (1 - a) * MIN_PER_YEAR

def series(*parts):        # a chain: EVERY part must be up
    p = 1.0
    for a in parts:
        p *= a             # availabilities MULTIPLY -> always worse
    return p

def parallel(*parts):      # redundancy: ANY one up is enough
    fail = 1.0
    for a in parts:
        fail *= (1 - a)    # FAILURE probabilities multiply -> always better
    return 1 - fail

def show(name, a):
    print(f"{name:26} {a*100:9.4f}%  {downtime(a):7.0f} min/yr")

for a in (0.99, 0.999, 0.9999, 0.99999):
    show(f"{a*100:g}% alone", a)
show("3 x 99.9% in series", series(0.999, 0.999, 0.999))
show("LB+app+cache+1 DB",   series(0.9999, 0.999, 0.9999, 0.995))
show("2 x 99% in parallel", parallel(0.99, 0.99))
show("same chain, 2 DBs",   series(0.9999, 0.999, 0.9999, parallel(0.995, 0.995)))

# ---------------- real output ----------------
# 99% alone                    99.0000%     5256 min/yr
# 99.9% alone                  99.9000%      526 min/yr
# 99.99% alone                 99.9900%       53 min/yr
# 99.999% alone                99.9990%        5 min/yr
# 3 x 99.9% in series          99.7003%     1575 min/yr
# LB+app+cache+1 DB            99.3806%     3255 min/yr
# 2 x 99% in parallel          99.9900%       53 min/yr
# same chain, 2 DBs            99.8775%      644 min/yr`,
      annotations: {
        9: 'The whole reason long service chains disappoint: each hop multiplies by a number below 1, so the answer only ever goes down.',
        15: 'The one line worth memorizing. Redundancy multiplies FAILURE probabilities: 0.01 × 0.01 = 0.0001, so two 99% boxes give 99.99%.',
        24: 'A realistic request path: 99.99% load balancer, 99.9% app tier, 99.99% cache, and one 99.5% database.',
        26: 'The same chain, but with that database replicated — two 99.5% nodes in parallel instead of one alone.',
        33: 'Three 99.9% services in series = 99.7% = 1,575 min/yr. The chain is worse than every link inside it.',
        34: 'The single 99.5% database drags a mostly-four-nines system down to 99.38% — 54 hours a year. Find the weakest box; it IS your SLA.',
        36: 'Replicating just that one database takes 3,255 min/yr down to 644 — a 5× win from fixing one SPOF, nothing else touched.',
      },
    },
    {
      type: 'intuition',
      title: 'The script for the first five minutes',
      md: `In order, out loud, every time:

1. **One box first.** "I would start with a single application server and one database — honestly enough for the first N users." That signals judgment, not naivety.
2. **Name the breaking number.** "This falls over around X QPS or Y GB, because Z saturates first." A number beats an adjective every time.
3. **Scale up, then out.** A bigger instance while that is still the cheap move; then a load balancer in front of a stateless fleet.
4. **Make it stateless and say why.** Sessions in Redis, uploads in blob storage, nothing on local disk. Now autoscaling works and instance death is a non-event.
5. **Point at your own single points of failure** before you are asked, and pick redundancy, graceful degradation, or an explicitly accepted risk.
6. **Do the availability arithmetic out loud** when a target is mentioned, then hand the remaining bottleneck to the next layer: caching, replication, sharding, queues.

That last step is the rest of this subject. From here, everything you add is an answer to a bottleneck you can name.`,
    },
  ],
  quiz: [
    {
      question: 'Your app runs comfortably on one 8-core box at 55% CPU. Traffic will roughly double in six months. Cheapest sane next step?',
      options: [
        {
          text: 'Shard the database now, before it becomes urgent',
          explanation: 'Sharding is the most expensive lever in the toolbox — routing, no cross-shard joins, painful migrations. Nothing here says the data layer is the constraint.',
        },
        {
          text: 'Split the app into microservices so each part scales independently',
          explanation: 'This adds network hops, deploy complexity, and multiplies availabilities in series. It is an organizational answer to a capacity question.',
        },
        {
          text: 'Move to a 16-core instance, and meanwhile make the app stateless so you can add boxes later',
          explanation: 'Correct. Scale up while it is still the cheap, zero-code move — and spend the bought time removing in-process state, which is the only part of scaling out you cannot retrofit cheaply.',
        },
        {
          text: 'Add a CDN',
          explanation: 'A CDN helps static and cacheable content, which may be worth doing anyway — but it does nothing for a CPU-bound application tier.',
        },
      ],
      correct: 2,
    },
    {
      question: 'What single property makes horizontal scaling actually work?',
      options: [
        {
          text: 'Stateless app servers — any server can handle any request',
          explanation: 'Correct. If any instance can serve any request, load balancing is trivial, autoscaling is useful immediately, and a crashed instance costs only in-flight requests.',
        },
        { text: 'Identical hardware in every instance', explanation: 'Nice to have (it makes round-robin fair), but weighted algorithms handle mixed fleets fine. Not the enabling property.' },
        { text: 'A faster load balancer', explanation: 'The balancer distributes traffic; it cannot make a request work on a server that lacks that user\'s in-memory session.' },
        { text: 'A shared filesystem mounted on every node', explanation: 'That is one way to move state off local disk, but it becomes its own bottleneck and single point of failure. The property is statelessness, not shared disk.' },
      ],
      correct: 0,
    },
    {
      question: 'You need `/api/*` sent to one pool, `/static/*` to another, and 5% of traffic mirrored to a canary version. Which load balancer layer?',
      options: [
        { text: 'L4 — it is faster and that is what matters at scale', explanation: 'L4 sees IP and port only. It cannot read the URL path, so none of these rules are even expressible.' },
        {
          text: 'L7 — it parses HTTP, so it can route by path, header or cookie and split traffic by percentage',
          explanation: 'Correct. Path routing, canaries, header rewrites and per-route rate limits all require reading the request. That is exactly the L7 job, worth its extra millisecond.',
        },
        { text: 'Either — the layer does not affect routing capability', explanation: 'It is the whole difference. L4 moves bytes without understanding them; L7 understands requests.' },
        { text: 'DNS-based routing', explanation: 'DNS answers with an IP before any HTTP request exists — it has never seen the path. It can do coarse geo-routing, not path routing.' },
      ],
      correct: 1,
    },
    {
      question: 'Your endpoints range from 5 ms lookups to 30-second report generations, on identical servers. Which algorithm?',
      options: [
        { text: 'Round-robin — identical servers make it fair', explanation: 'Equal request COUNTS, not equal work. A server that catches three report jobs still gets its next turn while it is drowning.' },
        { text: 'IP-hash', explanation: 'Gives affinity and cache locality, but distributes by client identity — it is blind to how loaded a server currently is.' },
        { text: 'Weighted round-robin', explanation: 'Weights fix heterogeneous SERVERS. Here the servers are identical; the requests are what vary.' },
        {
          text: 'Least-connections',
          explanation: 'Correct. It routes to whoever is handling the fewest in-flight requests, so a server tied up on long reports naturally stops receiving new work. Uneven request cost is exactly its use case.',
        },
      ],
      correct: 3,
    },
    {
      question: 'At 9 a.m. a traffic spike pushes every instance past the load balancer\'s 200 ms health-check timeout. The balancer ejects all of them; the site 503s, recovers, floods, and dies again in a loop. What is the correct fix?',
      options: [
        { text: 'Remove health checks — they are causing the outage', explanation: 'Then a genuinely dead instance keeps receiving traffic forever. The checks are not the problem; their sensitivity is.' },
        {
          text: 'Loosen it: generous timeout, several consecutive failures before ejection, slow re-admission, and a minimum-healthy-count floor',
          explanation: 'Correct. This is a cascading failure caused by an over-aggressive probe. Hysteresis stops a slow-but-alive fleet from being ejected, and the panic threshold refuses to empty the pool entirely.',
        },
        { text: 'Switch from active to passive health checking', explanation: 'Passive checks watch real traffic — under this spike real traffic is also timing out, so it ejects everything just the same, only later and after users are hurt.' },
        { text: 'Add more instances', explanation: 'Capacity may well help the spike, but the loop repeats at the next one. The self-inflicted eject-everything behaviour has to be fixed regardless.' },
      ],
      correct: 1,
    },
    {
      question: 'Your primary datacenter dies. You update the DNS A record, TTL 60 s. When is all traffic on the backup?',
      options: [
        {
          text: 'Not reliably — many resolvers and browsers ignore TTL, so a tail of users keeps hitting the dead IP for minutes or longer',
          explanation: 'Correct. You publish a TTL; you do not enforce it. This is why DNS is for coarse decisions and real failover uses a load balancer or a floating/anycast IP.',
        },
        { text: 'In 60 seconds, guaranteed by the TTL', explanation: 'TTL is a request, not a contract. Resolver and browser caches routinely serve stale records past expiry.' },
        { text: 'Immediately — DNS changes propagate instantly today', explanation: 'Nothing about DNS is instant. Caching at resolver, OS and browser is the entire reason DNS is fast in the normal case.' },
        { text: 'Never — DNS records cannot be changed after publication', explanation: 'They change fine. The problem is only how long the old answer survives in caches.' },
      ],
      correct: 0,
    },
    {
      question: 'A request path touches three services, each independently 99.9% available. What is the end-to-end availability?',
      options: [
        { text: '99.9% — the weakest link sets the number', explanation: 'That intuition is for a chain of physical strength. For availability the numbers multiply, so the chain is strictly WORSE than any link.' },
        { text: '99.99% — three services back each other up', explanation: 'That would be redundancy in parallel. These are dependencies in series: all three must be up simultaneously.' },
        {
          text: '99.7% — roughly 1,575 minutes of downtime a year',
          explanation: 'Correct. 0.999 x 0.999 x 0.999 = 0.997003. Adding hops to a request path always spends availability, which is the hidden bill on splitting a system into services.',
        },
        { text: '99.999%', explanation: 'Nothing here adds nines. Series dependencies can only remove them.' },
      ],
      correct: 2,
    },
    {
      question: 'You can deploy either one 99.9% server or two independent 99% servers behind a load balancer. Which gives better availability?',
      options: [
        { text: 'The single 99.9% server — it has more nines', explanation: 'Per box, yes. But it is one box: any failure is a full outage, with no path around it.' },
        {
          text: 'The two 99% servers — 1 - (0.01 x 0.01) = 99.99%',
          explanation: 'Correct. In parallel the FAILURE probabilities multiply, so two mediocre boxes beat one good one — provided the failures are genuinely independent (different racks, zones, power).',
        },
        { text: 'They are equivalent: 99% + 99% averages out to 99%', explanation: 'Availabilities never average. Parallel redundancy multiplies failure probabilities, which makes the pair far better than either member.' },
        { text: 'The pair is worse — two machines means twice the chance something breaks', explanation: 'True for "something breaks", false for "service is down". The service is down only when BOTH are down at once, which is far rarer.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Vertical or horizontal scaling — how do you actually decide?',
      answer:
        'I scale up first, because it costs zero code change: one instance-type bump, no distributed state, no coordination, no new failure modes. I keep doing it while the price-per-unit-of-work stays reasonable, which for most products is longer than people expect — a single modern box handles tens of thousands of simple QPS. I switch to scaling out when one of three things is true: the cost curve turns (the top instances cost 3-4x for 2x the specs), I approach the hard ceiling of the largest machine available, or — most often — I need redundancy, because a single box is a single point of failure that no amount of money fixes. The line I hold to: scale up until it hurts, then scale out, but design from day one so I CAN scale out. That day-one work is cheap and non-negotiable: no state in the process, nothing written to local disk, no assumption that the same user hits the same server.',
      isCaseBased: false,
    },
    {
      question: 'What does "stateless" really mean, and how would you make an existing app stateless?',
      answer:
        'Stateless means the server keeps nothing between requests that another server would need — everything arrives in the request or is fetched from shared storage. It does not mean the system has no state; it means the state is not in the process. The test I apply: could I kill any app server at random right now and lose nothing but in-flight requests? Making an app stateless is a hunt for four usual suspects. In-memory sessions go to Redis with a TTL, or to a signed token carried by the client (JWT — fast and lookup-free, at the price of hard revocation). Files written to local disk go to blob storage, with the app handing back a URL. In-process caches stop being the source of truth and become a pure optimization, so a cold instance is still correct. And singleton background jobs move to a scheduler with leader election or a queue with a single consumer group, so it does not matter which instance is running. Once those are gone, the load balancer can pick anyone, autoscaling actually helps, and an instance dying is a non-event.',
      isCaseBased: false,
    },
    {
      question: 'Case: your service uses sticky sessions. Every deploy logs a chunk of users out, and after autoscaling adds instances they sit nearly idle while the old ones stay hot. Diagnose and fix.',
      answer:
        'Both symptoms are the same root cause: session state lives in each app server\'s memory, so the load balancer had to pin users to a specific instance. Restart that instance on deploy and its sessions vanish — hence the logouts. And stickiness means existing users stay pinned to old instances, so a newly added instance only ever receives NEW sessions, which is why it idles. Fix, in order: (1) move sessions to a shared store — Redis with a TTL is the standard answer — or to a signed token so no server-side lookup is needed at all; (2) turn stickiness off once sessions are external, and let the balancer use least-connections; (3) verify by killing a random instance in staging and checking that nobody is logged out. Interim mitigations if I cannot ship that this week: connection draining on deploy so in-flight users finish, and rolling restarts to spread the pain. The tradeoff to state honestly: a shared session store adds a network hop (~0.5 ms) to every authenticated request and becomes a dependency in series, so it needs replication itself — that is still far cheaper than the deploy pain and the wasted capacity.',
      isCaseBased: true,
    },
    {
      question: 'L4 versus L7 load balancing — explain the difference and when you would pick each.',
      answer:
        'L4 balances on transport-level information: IP and port. It forwards packets without parsing them, so it is fast, cheap on CPU, and protocol-agnostic — it will happily balance database connections, game traffic or raw TCP streams. Its limitation is exactly its speed: it never sees the URL, headers or cookies, so it cannot make any decision based on them. L7 parses the HTTP request, which unlocks path-based routing (/api to one pool, /static to another), header and cookie routing, canary releases by percentage, header rewriting, response caching, and per-route rate limiting. The cost is a millisecond or so plus more CPU, since it terminates the client connection and opens its own to the backend. My default for application traffic is L7 — the routing intelligence is worth far more than the latency. I reach for L4 when the protocol is not HTTP, when I need extreme throughput with minimal per-connection cost, or when I want end-to-end TLS with no decryption at the edge. Summary line: L4 moves bytes, L7 understands requests.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through the load balancing algorithms and when each is the wrong choice.',
      answer:
        'Round-robin cycles through servers: simple and fair in request counts, wrong when request costs vary wildly, because a server stuck on three heavy jobs still gets its turn. Weighted round-robin gives bigger machines a bigger share — the fix for a heterogeneous fleet and the knob for shifting traffic to a new version gradually; wrong when the imbalance is in the requests rather than the servers. Least-connections routes to the fewest in-flight requests, which self-corrects under uneven workloads; it can misbehave when connections are long-lived and idle (WebSockets look "busy" while doing nothing) and it needs the balancer to hold real state per backend. Least-response-time adds measured latency — the best signal, but the twitchiest: a lucky fast sample can herd all traffic onto one instance until it too slows. IP-hash or consistent hash maps the same key to the same server, buying session affinity without a session store and cache locality; the price is uneven distribution when clients sit behind shared NATs, and hot keys landing repeatedly on one node. My defaults: round-robin for uniform work, least-connections for uneven work, consistent hash only when locality or affinity genuinely buys something.',
      isCaseBased: false,
    },
    {
      question: 'Case: at 9 a.m. every morning your entire service goes down for ten minutes in a flapping loop — all instances ejected, then re-added, then ejected again. CPU never exceeds 60%. What is happening?',
      answer:
        'This is a health-check-induced cascading failure, and the flat CPU is the tell — nothing is actually broken. The morning spike raises latency above the health-check timeout (say the probe times out at 200 ms and everything is now answering in 250 ms), so the balancer marks EVERY instance unhealthy at once and empties the pool. Everything 503s, load drops to zero, the instances recover instantly, get re-admitted, get hit by the backlog plus the spike, and time out again — a self-sustaining loop. I would confirm by correlating ejection events with latency percentiles and confirming the ejections precede rather than follow the errors. The fix is hysteresis and a floor: raise the probe timeout well above normal p99, require several consecutive failures before ejection and several successes before re-admission, re-admit slowly (slow-start so a cold instance is not flooded), and set a minimum-healthy-count panic threshold so the balancer keeps sending traffic to everyone rather than to nobody. Then separate the probes: a shallow liveness check that only proves the process is alive, plus a deeper readiness check that does not fail for a dependency the instance cannot fix. Capacity work for the 9 a.m. spike — pre-warmed autoscaling — is the follow-up, not the fix.',
      isCaseBased: true,
    },
    {
      question: 'Trace a DNS lookup end to end, and tell me why DNS is a poor failover mechanism.',
      answer:
        'The resolver — your ISP\'s, or 8.8.8.8 — walks the hierarchy: it asks a root server which nameservers own .com, asks the TLD server which nameservers are authoritative for example.com, then asks that authoritative server for the A record of api.example.com. Two referrals, one answer, 20-120 ms cold. Almost no real lookup does this, because the result is cached at the resolver, the OS and the browser, making the warm path effectively free. TTL is the knob: a low TTL (30-60 s) buys agility at the cost of query volume; a high TTL is cheap and fast but changes take hours to spread. That caching is exactly why DNS failover is weak: you publish a TTL, you do not enforce it. Resolvers serve stale records past expiry and browsers cache for the lifetime of a tab, so after you repoint a record a tail of users keeps hitting the dead IP for minutes and sometimes far longer. So I use DNS for coarse, slow-moving decisions — which region, which CDN, geo-routing users to their nearest datacenter — and something faster for actual failover: a health-checking load balancer in front of the fleet, or a floating/anycast IP that moves while the hostname never changes. Anycast is the cleanest version: many sites announce the same IP and the network itself routes to the nearest healthy one.',
      isCaseBased: false,
    },
    {
      question: 'Case: a product with users in the US, Europe and India needs p95 under 200 ms. Design the request path and justify each hop.',
      answer:
        'The binding constraint is physics: a cross-continent round trip is about 150 ms, so a single-region deployment cannot meet 200 ms p95 for the far side of the world — one round trip eats the entire budget before any work happens. So the design is driven by "how few long-haul trips can I make". First, a CDN with edge points of presence in all three regions serving static assets and cacheable API responses — a hit is 10-30 ms and never crosses an ocean. Second, geo-routing at DNS (or anycast) so each user reaches the nearest entry point. Third, regional application tiers behind a regional L7 load balancer: stateless app servers plus a regional Redis cache, so a cached read costs about 1 ms locally instead of 150 ms remotely. The hard part is data. If the workload is read-dominated, I keep a single write region and place read replicas in each region — regional reads are fast, writes pay the 150 ms trip, and I accept replication lag with read-your-own-writes handling for the user who just wrote. If writes must be local everywhere, the honest answer is multi-master with conflict resolution, or partitioning users by home region so each user\'s data has exactly one owner — the latter is simpler and I would defend it first. The budget arithmetic I would say out loud: 20 ms DNS/TLS amortized, 30 ms user-to-edge, 5 ms edge-to-region, 1 ms cache, 10 ms app — comfortably under 200 ms, provided nothing crosses an ocean synchronously. The tradeoff to name: three regions triples infrastructure cost and operational surface, and every hop I added is another multiplication in the availability chain.',
      isCaseBased: true,
    },
    {
      question: 'A stakeholder says "we need 99.99% availability." What do you tell them?',
      answer:
        'First I convert it: 99.99% is 53 minutes of downtime a year — under five minutes a month, including deploys, migrations and cloud provider incidents. 99.9% is 8.7 hours a year, and each extra nine costs roughly 10x more engineering. Then I do the arithmetic on the actual design, because availability is not a wish, it is a product. Dependencies in series multiply: three 99.9% services on the request path give 0.999^3 = 99.7%, or 1,575 minutes a year — worse than any individual component. So a four-nines target means every component on the critical path must be better than four nines, or must be made redundant. Redundancy in parallel is the lever, because it multiplies FAILURE probabilities: two independent 99% instances are both down only 0.01 x 0.01 of the time, which is 99.99%. The word to press on is independent — same rack, same power feed, same buggy release means correlated failure and the arithmetic silently breaks, which is why redundancy is spread across availability zones. Finally I ask the question they usually have not: 99.99% of what? Availability of the checkout path is worth paying for; availability of the analytics dashboard is not. Tiering the SLA by path is nearly always the cheapest honest answer.',
      isCaseBased: false,
    },
    {
      question: 'Case: single app server, single database, both in one region, doing well and growing. Find the single points of failure and prioritize the fixes.',
      answer:
        'I draw it and point at every box that exists once: the app server, the database, the region itself, and — once I add one — the load balancer. Priority is by blast radius against cost. First, the app tier: add a load balancer and a second stateless instance. That is the cheapest big win, because it also removes deploy downtime, and in parallel two 99% instances give 99.99%. It forces the statelessness work — sessions to Redis, uploads to blob storage — which is required for everything after it anyway. Second, the database: a replica with a defined promotion procedure. It is more expensive because failover is not automatic-and-safe by default, and I would say out loud that async replication can lose the un-shipped tail of writes on promotion, while sync replication taxes every write. Third, the load balancer I just introduced: a pair with a floating IP, or a managed one where the provider owns redundancy. Fourth, the cache, if I have one — I design it as an optimization so a cache outage degrades to slower database reads rather than an outage, which is cheaper than replicating it. Region redundancy I would explicitly ACCEPT as a risk at this stage, and say so: multi-region roughly doubles cost and complexity, and until the business can put a number on an hour of downtime it is not justified. Naming that acceptance is the point — an unnoticed SPOF is a mistake, a chosen one is a decision.',
      isCaseBased: true,
    },
    {
      question: 'Why do interviewers care that you know latency numbers like 100 ns, 100 µs, 0.5 ms, 150 ms?',
      answer:
        'Because they turn design into arithmetic instead of taste. Memory read ~100 ns, SSD random read ~100 µs, intra-datacenter round trip ~0.5 ms, cross-continent round trip ~150 ms. The ratios are what matter: SSD is about 1,000x memory, a network hop is thousands of times a memory read, and a cross-ocean trip costs more than a million memory reads. That immediately ranks optimizations: do not cross an ocean synchronously (CDN, edge, regional deployment), then do not touch disk (cache), then do not make N calls where one batched call would do, and only then optimize CPU. It also makes claims checkable on the spot — if someone proposes a design where one user request fans out to 50 sequential service calls, the numbers say that is 25 ms of pure network floor inside one datacenter and far worse across regions, before any work happens. And it lets you sanity-check a budget: with a 200 ms p95 target, you can say exactly how many long-haul round trips fit, which is one, and design accordingly.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'The journey of one request', back: 'Client -> DNS -> CDN/edge -> load balancer -> app server -> cache -> database. Each hop spends part of the latency budget; the slowest hop owns your p99.' },
    { front: 'Vertical vs horizontal scaling, one breath', back: 'Vertical: bigger box, zero code change, but hard ceiling, steep cost curve, and still one SPOF. Horizontal: more boxes, near-unlimited and survives node death, but demands statelessness, coordination and partitioning.' },
    { front: 'The scaling line to say in interviews', back: 'Scale up until it hurts, then scale out — and design from day one so you CAN scale out (no in-process state, no local disk, no same-user-same-server assumption).' },
    { front: 'Stateless — definition and test', back: 'Nothing kept between requests that another server would need. Test: could you kill any app server at random and lose only in-flight requests? State lives in a session store, cache, database, or a signed token.' },
    { front: 'Why sticky sessions are a smell', back: 'They pin a user to one instance: its death logs those users out, new instances stay idle (they only get new users), and deploys become disruptive. Stopgap only — fix the state instead.' },
    { front: 'L4 vs L7', back: 'L4 routes on IP/port — fast, protocol-agnostic, blind to the request. L7 parses HTTP — routes by path/header/cookie, canaries, rewrites, per-route limits, at ~1 ms. L4 moves bytes, L7 understands requests.' },
    { front: 'LB algorithm picker', back: 'Uniform work -> round-robin. Mixed server sizes -> weighted. Uneven request cost -> least-connections. Latency-aware but twitchy -> least-response-time. Affinity or cache locality -> IP-hash / consistent hash.' },
    { front: 'Health checks: passive vs active + the trap', back: 'Passive watches real traffic (free, notices late); active probes /health (catches failure early). Trap: a too-aggressive check ejects EVERY instance during a spike -> empty pool -> flapping outage. Fix with hysteresis, slow re-admission, minimum-healthy floor.' },
    { front: 'DNS: journey, TTL, and its weakness', back: 'Resolver -> root -> TLD -> authoritative, then cached everywhere. TTL trades agility (low) against query load (high). Weakness: clients ignore TTL, so DNS failover takes minutes, not seconds. Anycast = many sites announce one IP; nearest wins.' },
    { front: 'Availability arithmetic', back: '99.9% = 8.7 h/yr, 99.99% = 52 min/yr. Series multiplies availabilities: 0.999^3 = 99.7% (1,575 min/yr). Parallel multiplies FAILURE probabilities: two 99% = 99.99% — only if the failures are independent.' },
  ],
  mindmapMarkdown: `- Client-Server, Scaling & Load Balancers
  - Journey of one request
    - DNS -> CDN/edge -> LB -> app -> cache -> DB
    - Latency budget: 200 ms is spent, not earned
    - Slowest hop owns p99
  - Latency numbers
    - Memory 100 ns, SSD 100 us
    - Datacenter RTT 0.5 ms
    - Cross-continent 150 ms (physics)
    - Order: no ocean, no disk, no N calls, then CPU
  - Vertical scaling
    - Bigger box, zero code change
    - Hard ceiling + steep cost curve
    - Still one SPOF
  - Horizontal scaling
    - More commodity boxes, node death survivable
    - Autoscaling only works here
    - Bill: statelessness, coordination, partitioning
    - Line: scale up till it hurts, then out
  - Statelessness
    - Any server, any request
    - State -> session store / cache / DB / signed token
    - Hidden state: memory sessions, local disk, singleton jobs
    - Sticky sessions = smell
  - Load balancers
    - Distribute, health-check, terminate TLS, retry/shed
    - L4 = IP/port, fast, blind
    - L7 = HTTP, path/header/cookie, canaries
    - The LB itself must not be a SPOF
  - Algorithms
    - Round-robin / weighted
    - Least-connections (uneven cost)
    - Least-response-time (twitchy)
    - IP-hash / consistent hash (affinity, cache locality)
  - Health checks
    - Passive vs active, shallow vs deep
    - Too aggressive -> eject everything -> cascading failure
    - Hysteresis, slow re-admit, panic threshold
  - DNS
    - Resolver -> root -> TLD -> authoritative
    - TTL: agility vs load
    - Geo-routing, DNS round-robin, anycast
    - Failover is minutes, not seconds
  - SPOF discipline
    - Find every box that exists once
    - Redundant / degrade / accept explicitly
    - N+1 across failure domains
  - Availability arithmetic
    - 99.9% = 8.7 h, 99.99% = 52 min
    - Series multiplies: 3 x 99.9% = 99.7%
    - Parallel multiplies failures: 2 x 99% = 99.99%
    - Independence is the load-bearing word`,
}

export default m
