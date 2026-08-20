import type { Module } from '../types'

const m: Module = {
  id: 'sysdesign-l1-resilience-patterns',
  subjectId: 'sysdesign',
  level: 1,
  title: 'Resilience: Idempotency, Retries, Circuit Breakers & Timeouts',
  whyItMatters:
    'Every real outage story is the same story: one dependency got slow, and nothing in the system was built to stop waiting. This module is the toolkit that turns that story into a shrug — timeouts, retries with jitter, idempotency keys, circuit breakers, bulkheads, degradation — plus the sentence interviewers listen for: "a retry on a non-idempotent write is a bug, so here is the idempotency key." Idempotency is a named interview theme; the rest is how senior engineers are recognised.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'The founding assumption',
      md: `You call a shop to place an order. Three things can happen: nobody picks up, someone picks up and then the line goes dead mid-sentence, or they confirm the order and the call drops **before you hear the confirmation**. That last one is the dangerous one — you have no idea whether the order exists.

- A remote call is not a function call. It can **fail**, **hang forever**, or **succeed while losing the response**.
- The third case has no local equivalent, and it is the one that creates duplicate charges, duplicate emails, duplicate orders.
- So you can never assume a call worked, and you can never assume it did not. You only know you did not hear back.
- That is why resilience is not a feature bolted on before launch. It is the **shape** of the code: every remote call needs a time limit, a retry rule, and a plan for when it stays broken.
- The patterns below are all answers to one question: *what does my service do while a dependency is being useless?*`,
    },
    {
      type: 'intuition',
      title: 'Timeouts first — everything else depends on them',
      md: `Start here, because a retry policy on a call that never returns is decoration.

- **A call with no timeout is an unbounded resource leak.** Every hung call parks a thread, a socket, a connection-pool slot and its memory — forever. Enough of them and your service stops serving requests it could have answered.
- Most HTTP and DB clients ship with **no read timeout by default**. The default is "wait until the OS gives up", which can be minutes.
- Two different numbers, and people set only one:
  - **Connect timeout** — how long to wait for a TCP connection to be established. Should be small (100–500 ms): either the host is reachable or it is not.
  - **Read (or request) timeout** — how long to wait for the response after connecting. This is the one that matters, and the one people forget.
- Also cap the **total** time including retries. Three attempts with a 2 s timeout each is a 6 s call, and the user upstream may have given up at 3 s.`,
    },
    {
      type: 'math',
      intro: 'Why a missing timeout kills the whole service — one line of queueing theory does the arithmetic.',
      latex: [
        '\\text{in-flight requests} \\;=\\; \\text{arrival rate} \\times \\text{latency} \\qquad (\\text{Little\'s Law})',
        '500\\ \\text{rps} \\times 0.05\\ \\text{s} \\;=\\; 25 \\text{ busy threads} \\qquad \\text{healthy}',
        '500\\ \\text{rps} \\times 9\\ \\text{s} \\;=\\; 4500 \\text{ threads needed}, \\quad \\text{pool} = 200 \\;\\Rightarrow\\; \\text{exhausted in } \\tfrac{200}{500} = 0.4\\ \\text{s}',
        '500\\ \\text{rps} \\times 0.3\\ \\text{s} \\;=\\; 150 \\;<\\; 200 \\qquad \\text{same outage, 300 ms timeout, service survives}',
      ],
    },
    {
      type: 'intuition',
      title: 'Picking the number, and why it must shrink going inward',
      md: `Pick timeouts from **measurements, not from hope**. "5 seconds feels safe" is how you get a 5-second thread leak.

- Start from the downstream's observed **p99 latency** and add headroom: roughly p99 × 1.5 to × 2. If the DB answers 99% of queries in 60 ms, a 150 ms timeout is honest — it fails the slow 1% instead of dragging everyone.
- A timeout is a **statement about what you will tolerate**, not a prediction of the downstream. Setting it to the downstream's worst case means you inherit their worst case.
- The rule people get backwards: **timeouts must DECREASE as you go deeper into a call chain.**
- Correct: browser 5 s → gateway 3 s → order service 2 s → inventory service 1 s → DB 400 ms. Every layer has time to handle the failure it will see.
- Broken: gateway 2 s but the inventory call is set to 10 s. The gateway gives up at 2 s and returns an error, while the inventory work keeps running, still holding threads and DB locks. You paid the full cost and threw the result away — **wasted work at exactly the moment you have none to spare**.`,
    },
    {
      type: 'note',
      md: `**Deadline propagation**, in one line: instead of each hop setting its own fixed timeout, the caller sends an absolute deadline with the request ("this is worthless after 14:02:07.300") and every hop computes its own timeout as *time remaining*, so the whole chain gives up together and nobody does work for a caller who already left. gRPC does this natively; in HTTP you pass it as a header and enforce it yourself. It is also the correct fix for the decreasing-timeout rule — the numbers shrink automatically instead of by convention.`,
    },
    {
      type: 'intuition',
      title: 'Retries: two conditions, both required',
      md: `A retry is a bet that the failure was transient. Make the bet only when both conditions hold.

- **Condition 1 — the operation is idempotent.** Retrying a non-idempotent write is not a resilience pattern, it is a duplicate-charge generator. (The next sections are about how to earn this condition.)
- **Condition 2 — the error is retriable.** Retriable: connection refused, connection reset, timeouts, 500/502/503/504, and 429 (obey its \`Retry-After\`). Not retriable: 400, 401, 403, 404, 409, 422 — the request itself is wrong, and sending it again just wastes both sides' capacity.
- The nasty middle case: a **timeout on a POST**. You do not know whether it succeeded. Condition 2 says retriable; condition 1 says you are not allowed to — until you add an idempotency key.
- Cap the attempts. Three total (one try, two retries) covers almost all transient blips; attempt seven is not fixing anything, it is a load test you are running against a sick service.
- Retry at **exactly one layer** of the stack. See the multiplication arithmetic two sections down.`,
    },
    {
      type: 'intuition',
      title: 'Exponential backoff, and why jitter is not optional',
      md: `Retrying immediately is the worst possible moment: the downstream is at its most overloaded right after it failed you.

- **Exponential backoff**: wait \`base × 2^attempt\`. With base = 100 ms the sleeps are 100, 200, 400, 800 ms — a total of 1.5 s across four attempts, and each retry gives the downstream twice as long to recover.
- Always **cap the delay** (say 20 s) so the last retry does not land ten minutes later, when the answer no longer matters.
- The problem backoff alone does not solve: if 20 clients failed at the same instant — and during an outage they did — they all wake at 100 ms, all at 300 ms, all at 700 ms. Backoff spaced the retries out **in time but not across clients**. You get a **synchronised thundering herd**: perfectly-timed load spikes that re-break the service each time it stands up.
- **Full jitter** fixes it: sleep a random amount in \`[0, base × 2^attempt)\` instead of the exact value. Same average delay, same growth, but the clients scatter.
- Run the numbers below — the difference is not subtle.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Retry schedules: lockstep vs spread (real output pasted)',
      code: `import random
from collections import Counter

BASE, ATTEMPTS, CLIENTS = 100, 4, 20   # ms, retries per client, clients failing together

def schedule(jitter):
    t, out = 0, []
    for k in range(ATTEMPTS):
        window = BASE * 2 ** k             # 100, 200, 400, 800 ms
        t += random.uniform(0, window) if jitter else window
        out.append(round(t))
    return out

def report(title, jitter):
    random.seed(7)
    print(title)
    rows = [schedule(jitter) for _ in range(CLIENTS)]
    for i in (0, 1, 2):
        print(f"  client {i} retries at ms: {rows[i]}")
    hits = Counter(t for r in rows for t in r)
    print(f"  -> {len(hits)} distinct arrival instants, worst burst = "
          f"{max(hits.values())} retries in the SAME millisecond")

report("NO JITTER    sleep = 100 * 2**k", False)
print()
report("FULL JITTER  sleep = uniform(0, 100 * 2**k)", True)

# ---------------- real output ----------------
# NO JITTER    sleep = 100 * 2**k
#   client 0 retries at ms: [100, 300, 700, 1500]
#   client 1 retries at ms: [100, 300, 700, 1500]
#   client 2 retries at ms: [100, 300, 700, 1500]
#   -> 4 distinct arrival instants, worst burst = 20 retries in the SAME millisecond
#
# FULL JITTER  sleep = uniform(0, 100 * 2**k)
#   client 0 retries at ms: [32, 63, 323, 381]
#   client 1 retries at ms: [54, 127, 150, 556]
#   client 2 retries at ms: [4, 90, 118, 191]
#   -> 76 distinct arrival instants, worst burst = 2 retries in the SAME millisecond`,
      annotations: {
        10: 'The whole difference is this one line. Without jitter the sleep is a constant, so identical clients stay identical forever.',
        22: 'The metric that matters is not total retries — both runs send exactly 80. It is how many land at once.',
        33: 'Every client is a clone: 4 arrival instants with 20 retries stacked on each. Four instantaneous 20x spikes, aimed at a service that is already struggling.',
        39: 'Same 80 retries, now spread over 76 different milliseconds with at most 2 colliding. The downstream sees a trickle instead of a wall — and gets quiet gaps in which to recover.',
      },
    },
    {
      type: 'intuition',
      title: 'The retry storm: how retries turn a brownout into an outage',
      md: `This is the classic cascading failure, and it is entirely self-inflicted.

1. A service handling **1000 rps** slows down. 30% of calls now fail or time out.
2. Clients retry those 300 failures up to 3 times: 700 good + 300 × 3 = **1600 rps** against a service that could not handle 1000.
3. The extra load makes it slower, so now 60% fail: 400 + 600 × 3 = **2200 rps**. The loop feeds itself.
4. The service was *degraded* at step 1. By step 3 it is *down*, and the traffic keeping it down is your own retries.

- Worse, retries **multiply across layers**. Mobile app retries 3× → gateway retries 3× → service retries 3× = **27 requests** for one user tap. Retry at one layer only, and say so in the design.
- **Retry budget**: allow retries only up to a fixed share of the request rate — typically 10%. Track them in a token bucket; when the budget is empty, fail immediately instead of retrying. Load can then rise to 1.1× at worst, never 3×.
- **Circuit breakers** (below) are the other half of the answer: they stop the retries entirely once the failure is clearly not transient.
- The one-line takeaway: *retries help when failures are rare and independent; they are gasoline when the failure is overload.*`,
    },
    {
      type: 'intuition',
      title: 'Idempotency: the property that makes retries legal',
      md: `**Definition**: an operation is idempotent if applying it twice has the same effect as applying it once. A light switch labelled "OFF" is idempotent; a switch labelled "TOGGLE" is not.

- Note it is about the **effect on state**, not about getting a byte-identical response. \`DELETE /orders/7\` twice leaves one deleted order — the second call returning 404 is fine.
- Idempotent by HTTP spec: **GET, HEAD, PUT, DELETE, OPTIONS, TRACE**. Not idempotent: **POST, PATCH**.
- **Safe** is a stronger property — no state change at all: GET, HEAD, OPTIONS. Every safe method is idempotent; the reverse is not true (DELETE changes state).
- PATCH depends on the body: \`{"status": "shipped"}\` is idempotent, \`{"increment_views": 1}\` is not. The spec cannot know, so it declares PATCH non-idempotent.
- The spec is a promise about **your implementation**, not a guarantee you get for free. A GET that bumps a view counter is neither safe nor idempotent, whatever the verb says.
- Cheapest fix, when it applies: express the write as a **set**, not a delta. \`UPDATE seats SET status='booked', holder=42 WHERE id=9 AND status='free'\` runs twice safely — the second run matches zero rows.`,
    },
    {
      type: 'intuition',
      title: 'The idempotency key — making POST safe to retry',
      md: `Some operations are genuinely "create a new thing" and cannot be rewritten as a set. Charging a card is the canonical example. The pattern:

1. The **client** generates a unique key (a UUID) for the *business intent*, before the first attempt, and sends it as \`Idempotency-Key: <uuid>\`.
2. The client reuses **the same key on every retry** of that intent. A new key means a new charge — that is the point.
3. The **server** stores key → result. First time: do the work, store the response. Repeat: return the stored response and do nothing.

- The key must come from the client, not the server: the server cannot tell a retry from a genuinely new identical order.
- Store the **request fingerprint** (a hash of the body) alongside the key. Same key with a different body is a client bug — return 422, do not silently replay the old response.
- **Scope** keys per account or per API credential, so two customers cannot collide on a guessable UUID.
- **TTL**: keep keys for as long as a client might plausibly retry — 24 hours is the industry norm (Stripe's number). Storage cost is real: 10M writes/day × 200 bytes × 1 day ≈ 2 GB of key state. Expire with a TTL index or a nightly delete.
- The race is the part people miss, and it is next.`,
    },
    {
      type: 'code',
      lang: 'sql',
      title: 'The key IS the lock — a unique constraint, not a SELECT-then-INSERT',
      code: `CREATE TABLE idempotency (
  key          text PRIMARY KEY,        -- client-generated UUID
  account_id   bigint      NOT NULL,    -- scope: your key cannot collide with mine
  request_hash text        NOT NULL,    -- same key + different body = client bug -> 422
  status       text        NOT NULL,    -- 'in_progress' | 'done'
  response     jsonb,                   -- replayed verbatim on a repeat
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Step 1: CLAIM the key. Concurrent duplicates race here, and one loses loudly.
INSERT INTO idempotency (key, account_id, request_hash, status)
VALUES ('7f3c-uuid', 42, 'sha256:ab12', 'in_progress');
-- unique_violation -> this is a duplicate, so read the existing row:
--   status = 'done'        -> return its stored response, charge nothing
--   status = 'in_progress' -> 409 Conflict, tell the client to retry shortly

-- Step 2: same transaction that records the charge, so both commit or neither.
UPDATE idempotency
   SET status = 'done', response = '{"charge_id": "ch_88"}'
 WHERE key = '7f3c-uuid';

-- Step 3: retention. Keys are only useful while a client might still retry.
DELETE FROM idempotency WHERE created_at < now() - interval '24 hours';`,
      annotations: {
        2: 'PRIMARY KEY = a unique index. This single constraint is the entire concurrency control; no application lock is needed, and it works across processes and regions.',
        11: 'The bug this prevents: SELECT "does the key exist?" then INSERT. Two concurrent retries both read "no" and both charge the card. Check-then-act across a network is never atomic.',
        19: 'Storing the response inside the same transaction as the charge is what makes the replay honest. Commit them separately and a crash between the two leaves a charge with no record of it.',
        23: 'Without this line the table grows forever. The TTL is a design decision, not cleanup: it is how long you promise to remember a retry. 24 h is the industry norm.',
      },
    },
    {
      type: 'note',
      md: `**Exactly-once delivery does not exist.** Over an unreliable network the sender can never know whether a lost acknowledgement means "not delivered" or "delivered, ack lost" — so it must choose: send again (at-least-once, risking duplicates) or not (at-most-once, risking loss). What you can actually build is **at-least-once delivery + an idempotent consumer = exactly-once *effect***, which is all anyone ever wanted. Kafka's "exactly-once semantics" is exactly this construction — an idempotent producer plus transactional offset commits — and it holds only inside Kafka, not across a call to your payment provider. See the message-queues module for the consumer side; the practical rule there is to give every message a business-level id and make the handler safe to run twice.`,
    },
    {
      type: 'intuition',
      title: 'Circuit breakers: stop calling something that is clearly broken',
      md: `A house fuse does not politely keep trying. It cuts the circuit, and it stays cut until someone checks. A circuit breaker wraps one dependency and has three states.

- **CLOSED** (normal): calls pass through, outcomes are counted. Trip when a threshold is crossed — typically "more than 50% of the last 100 calls failed", with a minimum call volume so 2-out-of-3 does not trip it.
- **OPEN**: calls are rejected **instantly**, without touching the network, and the fallback runs. Stay open for a cooldown, typically 10–60 s.
- **HALF-OPEN**: after the cooldown, let a handful of trial calls through. All succeed → back to CLOSED. Any fail → back to OPEN, usually with a longer cooldown.
- **Why failing fast is kinder than queueing**: a doomed request that waits 2 s for its timeout holds a thread, a connection and its memory for 2 s — and then fails anyway. Multiply by your request rate and the waiting itself is the outage. Failing in microseconds keeps the pool free for the 90% of traffic that does not touch the broken dependency.
- **It protects the downstream as much as you.** A struggling service needs quiet to recover: finish its GC, drain its queue, let its connection pool refill. Retries and queued calls deny it exactly that. An open breaker is the only pattern here that actively *reduces* load on a sick dependency.
- Tune one breaker **per dependency, per endpoint** — not one global breaker. A slow report endpoint should not cut off the login call to the same service.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One slow query, two endings',
        notice: 'Frames 1-5: the cascade, with no timeout and no breaker. Frames 6-8: rewind, same failure, patterns in place. Watch the thread pool.',
        leftLabel: 'incoming requests',
        rightLabel: 'services',
        frames: [
          {
            note: 'Steady state. 500 requests/sec, each holding a thread for about 50 ms, so roughly 25 of the 200 threads are busy. The database answers in 40 ms at p99. Nothing here needs a single resilience pattern — which is why nobody added one.',
            stack: [
              { name: 'req 1', to: 'api' },
              { name: 'req 2', to: 'api' },
              { name: '…498 more/sec', to: 'api' },
            ],
            heap: [
              { id: 'api', value: 'threads busy 25 / 200', label: 'order service' },
              { id: 'db', value: 'p99 = 40 ms', label: 'orders DB — healthy' },
            ],
          },
          {
            note: 'A statistics refresh flips one query to a bad plan. The database has not crashed and is not throwing errors — it simply answers in 9 s instead of 40 ms. This is a brownout, and every cascade starts as one.',
            stack: [
              { name: 'req 1', to: 'api' },
              { name: 'req 2', to: 'api' },
              { name: '…498 more/sec', to: 'api' },
            ],
            heap: [
              { id: 'api', value: 'threads busy 180 / 200', label: 'order service — filling up' },
              { id: 'db', value: 'p99 = 9 s (bad plan)', label: 'orders DB — SLOW, not down', danger: true },
            ],
          },
          {
            note: 'Little\'s Law does the rest: 500 rps x 9 s = 4500 threads needed, and the pool holds 200. It fills in 200/500 = 0.4 s. The DB client has no read timeout, so every thread is alive and parked on a socket, doing nothing. Requests that never touch the database now fail too.',
            stack: [
              { name: 'req 1', to: 'api', danger: true },
              { name: 'req 2', to: 'api', danger: true },
              { name: 'health check', to: 'api', danger: true },
            ],
            heap: [
              { id: 'api', value: 'threads 200 / 200 BLOCKED', label: 'order service — pool exhausted', danger: true },
              { id: 'db', value: 'p99 = 9 s', label: 'orders DB', danger: true },
            ],
          },
          {
            note: 'Callers hit their own 2 s timeout and retry — 3 attempts each, no jitter, so every client fires at the same instants. 500 rps becomes 1500 rps aimed at a service that can currently serve none of it. The retries are now the load.',
            stack: [
              { name: 'req 1 (try 3)', to: 'api', danger: true },
              { name: 'req 2 (try 3)', to: 'api', danger: true },
              { name: '1500 rps total', to: 'api', danger: true },
            ],
            heap: [
              { id: 'api', value: 'queue depth 12,000', label: 'order service — drowning', danger: true },
              { id: 'db', value: 'p99 = 26 s', label: 'orders DB — worse than before', danger: true },
            ],
          },
          {
            note: 'Health checks share the exhausted pool, so they time out too. The load balancer pulls instances out and routes their traffic to the survivors, which die faster. Checkout, search and the mobile app are down. Root cause: one query got slower.',
            stack: [{ name: 'every caller', to: 'api', danger: true }],
            heap: [
              { id: 'api', value: 'REMOVED FROM LB', label: 'order service — total outage', danger: true },
              { id: 'db', value: 'still up, still slow', label: 'orders DB — never crashed', danger: true },
            ],
          },
          {
            note: 'Rewind. Same bad plan, but now the DB client has a 300 ms read timeout. Calls fail at 300 ms instead of parking forever: 500 rps x 0.3 s = 150 threads, under the pool of 200. The service stays up and returns errors for the affected endpoint only.',
            stack: [
              { name: 'req 1', to: 'api' },
              { name: 'req 2', to: 'api' },
              { name: '…498 more/sec', to: 'api' },
            ],
            heap: [
              { id: 'api', value: 'threads busy 150 / 200', label: 'order service — alive, erroring' },
              { id: 'db', value: 'p99 = 9 s (still bad)', label: 'orders DB — SLOW', danger: true },
            ],
          },
          {
            note: 'The breaker has been counting outcomes: over half of the last 100 calls failed, so it trips to OPEN. Calls no longer reach the database at all — they are rejected in microseconds. The pool empties. Just as important, the database finally gets silence in which to recover.',
            stack: [
              { name: 'req 1', to: 'cache' },
              { name: 'req 2', to: 'cache' },
            ],
            heap: [
              { id: 'api', value: 'breaker = OPEN, threads 6 / 200', label: 'order service — failing fast' },
              { id: 'cache', value: 'order history, 6 min old', label: 'Redis — the planned fallback' },
              { id: 'db', value: 'incoming 0 rps', label: 'orders DB — draining its queue' },
            ],
          },
          {
            note: 'The fallback was decided in a design review months ago: serve order history from a stale cache and hide the recommendations strip. Users see slightly old data, not an error page. After a 30 s cooldown the breaker goes HALF-OPEN, one trial call returns in 45 ms, and it closes. Damage: a few minutes of stale reads.',
            stack: [
              { name: 'req 1', to: 'cache' },
              { name: 'trial call', to: 'db' },
            ],
            heap: [
              { id: 'api', value: 'breaker = HALF-OPEN → CLOSED', label: 'order service — recovered' },
              { id: 'cache', value: 'served 100% of reads', label: 'Redis — degraded but useful' },
              { id: 'db', value: 'p99 = 45 ms', label: 'orders DB — healthy again' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Bulkheads and load shedding: contain, then refuse',
      md: `A ship's hull is divided into sealed compartments. One flooded compartment is an incident; without the walls it is a sinking.

- **Bulkhead**: give each dependency its own bounded resource pool — threads, connections, or a concurrency semaphore — so one slow dependency cannot consume everything.
- Concretely: 200 worker threads total, but at most 20 may be in-flight to the recommendations service. Recommendations hangs → 20 threads stuck, 180 still serving checkout. Without the cap, frame 3 above happens to the whole service.
- Bulkheads convert "everything is down" into "one feature is down", which is the difference between an outage and a graph nobody pages you for.
- **Load shedding** is the other half: under overload, **reject early and cheaply** rather than accepting work you cannot finish. A 503 returned at the edge in 1 ms costs almost nothing; the same request accepted, queued for 8 s and then failed costs a thread, a connection and the user's patience.
- Shed **by request class**, decided in advance: paying customers over free tier, writes over reads, interactive over batch, and health checks always. "Shed 30% of traffic" is a plan; "fall over" is not.
- Two rules that catch people out: watch **queue depth**, not just CPU — a growing queue is already a latency failure — and **drop requests whose deadline has already passed** instead of serving them. Serving a reply nobody is waiting for is pure waste.`,
    },
    {
      type: 'intuition',
      title: 'Graceful degradation is a product decision, not a code one',
      md: `The question "what should the user see when the recommendations service is down?" has no correct engineering answer. It has a **product** answer, and it must exist before the incident.

- For every dependency, write down three things: is it **critical** (no feature without it) or **optional**, what the **fallback** is, and how stale the fallback may be.
- The fallback menu, cheapest first: serve **stale cache** (a 10-minute-old price beats an error page), return a **static default** (a generic "popular items" list), **hide the widget** entirely, or **disable the feature** behind a flag.
- Amazon's product page still sells when recommendations are down. Netflix still plays when personalisation is down. That is not luck — the fallback was specified with the feature.
- Write-path degradation is its own choice: accept the write into a queue and process it later ("your order is confirmed, tracking will appear shortly"), or refuse it. For payments, refusing is usually correct.
- Keep a **kill switch** (a feature flag) per non-critical dependency, so a human can disable it in seconds without a deploy. This is the single highest-value hour of work in this whole module.
- Say the tradeoff out loud in interviews: degradation trades **correctness or freshness for availability**. For a price display that is a good trade. For a bank balance it may not be — and knowing the difference is the answer they want.`,
    },
    {
      type: 'intuition',
      title: 'Cascading failure — the synthesis',
      md: `Here is the whole chain from the visual, and exactly where each pattern cuts it.

1. A dependency gets **slow** (bad plan, GC pause, lost replica, noisy neighbour). Nothing crashes.
2. Callers **wait**, because their calls have no bound. → **TIMEOUT** cuts here: waiting becomes bounded, so the loss is bounded.
3. Threads and connections are **exhausted**, so unrelated endpoints fail too. → **BULKHEAD** cuts here: only that dependency's pool drains.
4. The service stops answering **health checks** and the LB removes it, concentrating traffic on the survivors. → **separate readiness from liveness, and shed load** so the instance stays honest instead of dying.
5. Callers time out and **retry**, tripling the load on something already failing. → **CIRCUIT BREAKER + retry budget + jitter** cut here: retries stop, and the downstream gets quiet.
6. Callers of the callers repeat steps 2–5. The **whole system** is down over a 200 ms blip. → **DEGRADATION** cuts the user-visible part: stale data instead of an error.

- Notice the shape: the original fault was small and never fixed itself into a crash. **The amplification was entirely built by us** — unbounded waits and unbudgeted retries.
- The interview sentence: *"Slowness propagates further than failure, because a failure returns immediately and a slow call holds resources. So I bound every wait, isolate every pool, and make retries pay a budget."*`,
    },
    {
      type: 'note',
      md: `**Health checks, in one line each.** *Liveness* answers "is this process wedged — should you restart me?" and must depend on nothing external; wiring a database check into liveness means one slow DB restarts your entire fleet. *Readiness* answers "should traffic be sent to me right now?" and may check dependencies, so an instance with a full connection pool quietly leaves rotation and returns when it recovers. Give health checks their own thread pool so they stay answerable while the main pool is exhausted — that is what breaks step 4 above. The mechanics (probes, gating, rolling updates) are in the Kubernetes module.`,
    },
    {
      type: 'note',
      md: `**SLOs make reliability a number instead of a vibe.** Pick a target — 99.9% means 43 minutes of allowed downtime per month, 99.99% means 4.3 — and the remainder is your **error budget**. Budget left over: ship features, take risks. Budget burned: freeze features and spend the sprint on reliability. The honest part is that 100% is not a goal, it is a fantasy: your cloud provider, your DNS and your payment gateway are not 100%, so your product cannot be either. Each extra nine costs roughly ten times more than the last, and past a point the user cannot perceive it. The value of an SLO is not the number — it is that it converts "should we build this feature or fix that flakiness?" from an argument into a lookup.`,
    },
  ],
  quiz: [
    {
      question: 'Your service calls a payment provider with no read timeout. The provider starts taking 60 s to respond instead of 200 ms. What breaks FIRST?',
      options: [
        { text: 'The payment provider, from the extra load', explanation: 'Your traffic has not increased at all — you are sending the same number of calls, just waiting longer for each.' },
        { text: 'Nothing until the provider errors out', explanation: 'This is the trap. The provider never errors — it just gets slow, and slow is what kills you.' },
        { text: 'Your own thread and connection pool: in-flight requests = rate x latency, so a 300x latency jump needs 300x the concurrency', explanation: 'Correct. Little\'s Law: 500 rps x 60 s needs 30,000 in-flight slots. Your pool of 200 fills in well under a second, and then endpoints that never touch payments fail too.' },
        { text: 'The load balancer runs out of connections', explanation: 'It may eventually, but the first resource to run out is the caller\'s own bounded pool — that is the resource each hung call is holding.' },
      ],
      correct: 2,
    },
    {
      question: 'Which failure is safe to retry automatically, with no other machinery in place?',
      options: [
        { text: 'A 503 from GET /products/42', explanation: 'Correct. GET is idempotent and safe (no state change), and 503 is a transient server-side error — both retry conditions are satisfied.' },
        { text: 'A timeout on POST /charges', explanation: 'The error is retriable, but you do not know whether the charge went through. Retrying without an idempotency key risks double-charging.' },
        { text: 'A 400 Bad Request on any endpoint', explanation: 'The request itself is malformed. Sending it again produces the identical 400 and wastes capacity on both sides.' },
        { text: 'A 403 Forbidden on GET /admin/users', explanation: 'GET is idempotent, but 403 is not transient — the credentials will not become valid because you asked twice.' },
      ],
      correct: 0,
    },
    {
      question: 'Twenty clients fail at the same instant and all use exponential backoff with base 100 ms and no jitter. What actually happens?',
      options: [
        { text: 'The retries spread out naturally because each client\'s clock differs slightly', explanation: 'Millisecond clock differences are nothing next to the 100 ms, 300 ms, 700 ms spacing the schedule imposes. They stay in lockstep.' },
        { text: 'All 20 retry at 100 ms, then all at 300 ms, then all at 700 ms — synchronised spikes that re-break the service each time it stands up', explanation: 'Correct. This is exactly the measured result in the code section: 4 distinct arrival instants with a worst burst of 20. Backoff spaced retries in time, not across clients.' },
        { text: 'Backoff alone already prevents a thundering herd', explanation: 'Backoff solves "retrying too fast". It does nothing about "everyone retrying at the same moment", which is what a herd is.' },
        { text: 'Total retry volume drops, so the downstream is fine', explanation: 'Volume is identical with or without jitter — 80 retries either way. The peak is what differs, and the peak is what kills.' },
      ],
      correct: 1,
    },
    {
      question: 'Which of these is NOT idempotent?',
      options: [
        { text: 'DELETE /orders/7', explanation: 'Idempotent. Repeat calls leave the same state — one deleted order. Returning 404 the second time is fine; idempotency is about effect, not response bytes.' },
        { text: 'PUT /users/3 with the full user body', explanation: 'Idempotent by spec and in practice: you are setting the resource to a given value, so the tenth call leaves the same state as the first.' },
        { text: 'UPDATE seats SET status=\'booked\' WHERE id=9 AND status=\'free\'', explanation: 'Idempotent. The second run matches zero rows and changes nothing — a conditional set, the cheapest way to earn idempotency.' },
        { text: 'PATCH /posts/5 with {"increment_views": 1}', explanation: 'Correct — this is the non-idempotent one. It is a delta, not a set: run it twice and views go up by two. This is why the spec declares PATCH non-idempotent in general.' },
      ],
      correct: 3,
    },
    {
      question: 'Your idempotency handler does: SELECT the key; if absent, charge the card and INSERT the key. Two retries of the same request arrive 5 ms apart. What happens and what is the fix?',
      options: [
        { text: 'The second is correctly deduplicated — that is what the SELECT is for', explanation: 'Only if the first request finished before the second read. At 5 ms apart it has not, so both SELECTs return nothing.' },
        { text: 'Both SELECTs miss, both charge the card; fix it by making the INSERT first with a UNIQUE constraint and letting the loser read the winner\'s row', explanation: 'Correct. Check-then-act is never atomic across a network. Claim the key with an INSERT and let the database\'s unique index arbitrate: the loser gets a constraint violation and knows it is the duplicate.' },
        { text: 'The database prevents it automatically', explanation: 'Not with this code. Under normal isolation two transactions can both read "no such key" and both proceed — nothing was declared unique.' },
        { text: 'Add a longer TTL on the key', explanation: 'TTL controls how long a key is remembered, which is irrelevant to a race that happens 5 ms in.' },
      ],
      correct: 1,
    },
    {
      question: 'A circuit breaker has been OPEN for its 30 s cooldown. What should happen next?',
      options: [
        { text: 'It closes and all traffic resumes', explanation: 'That is a stampede: the full request rate hits a dependency that may still be broken, and you are back to the original outage.' },
        { text: 'It stays open until an operator resets it', explanation: 'That describes a manual kill switch, which is a useful separate tool. A breaker\'s whole value is automatic recovery.' },
        { text: 'It goes HALF-OPEN and lets a few trial calls through: all succeed, it closes; any fail, it reopens with a longer cooldown', explanation: 'Correct. Half-open is a cheap probe. It tests recovery with a handful of requests instead of betting the full load on a guess.' },
        { text: 'It halves the timeout and retries harder', explanation: 'Retrying harder against a dependency that just failed 50% of calls is precisely the retry storm the breaker exists to stop.' },
      ],
      correct: 2,
    },
    {
      question: 'Chain: gateway (timeout 2 s) → order service (timeout 3 s) → inventory service (timeout 5 s). What is wrong?',
      options: [
        { text: 'Timeouts increase going inward, so the gateway abandons the request at 2 s while the inner work keeps running and holding resources', explanation: 'Correct. The caller is gone but the callee is still burning threads and locks for a result nobody will read — wasted work at the moment you have the least to spare. Timeouts must decrease with depth: 2 s → 1.5 s → 800 ms.' },
        { text: 'Nothing — deeper services legitimately need more time', explanation: 'If a deep call genuinely needs 5 s, the outer budget must be larger than 5 s. Otherwise the inner timeout can never fire before the outer one gives up.' },
        { text: 'The gateway timeout is too aggressive', explanation: 'Two seconds at the edge is reasonable. The defect is the ordering, not the specific number.' },
        { text: 'The inventory service should have no timeout at all', explanation: 'That is strictly worse — an unbounded wait is the original sin this module opens with.' },
      ],
      correct: 0,
    },
    {
      question: 'Mobile app retries 3x, the API gateway retries 3x, and the order service retries 3x. One user tap fails at the database. How many database calls result?',
      options: [
        { text: '9 — the retries add up', explanation: 'Retries at nested layers multiply, they do not add. Each outer attempt triggers a full set of inner attempts.' },
        { text: '27 — retries multiply across layers, which is why you retry at exactly one layer and give it a budget', explanation: 'Correct. 3 x 3 x 3 = 27 requests for one tap. Pick one layer to retry (usually the one closest to the failure), and cap it with a retry budget so total load can rise 1.1x, not 27x.' },
        { text: '3 — only the innermost retry counts', explanation: 'The outer layers cannot see that the inner one already retried; each of their attempts starts the whole cascade again.' },
        { text: '1 — the gateway deduplicates', explanation: 'Nothing deduplicates by default. Deduplication is what an idempotency key buys, and it prevents duplicate *effects*, not duplicate calls.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'How do you choose a timeout value? Walk me from the number to the consequence.',
      answer:
        'From the downstream\'s measured p99, not from intuition: roughly p99 x 1.5 to x 2. If the DB serves 99% of queries in 60 ms, 150 ms is honest — it sacrifices the slow 1% to protect everyone else. I set connect and read timeouts separately (connect small, 100-500 ms, since a host is either reachable or not) and I cap total time including retries, because three attempts at 2 s is a 6 s call the user already abandoned. Then the rule people invert: timeouts must decrease with depth — 3 s at the gateway, 2 s in the service, 800 ms at the DB — otherwise the outer caller gives up while inner work keeps burning threads and locks for a result nobody will read. The cleanest version of this is deadline propagation: the caller sends an absolute deadline, each hop computes its timeout as time remaining, and the whole chain abandons together. The justification is Little\'s Law: in-flight = rate x latency, so an unbounded latency means unbounded concurrency, and a timeout is what converts a dependency\'s outage into a bounded, survivable error rate on my side.',
      isCaseBased: false,
    },
    {
      question: 'Case: users report being charged twice for one order. The mobile client retries on timeout. Design the fix end to end.',
      answer:
        'The mechanism first: the charge succeeded server-side but the response was lost or slow, the client timed out, retried, and a second unrelated charge was created. Retrying a non-idempotent POST is the bug. Fix: idempotency keys. The client generates a UUID per business intent, before the first attempt, and reuses it on every retry of that intent — a new key must mean a new charge, so key generation belongs to the client, not the server. Server side, the key is a PRIMARY KEY in an idempotency table and the first thing the handler does is INSERT it with status in_progress. That INSERT is the concurrency control: two simultaneous retries race, one wins, the loser gets a unique violation and reads the winner\'s row — if status is done it returns the stored response, if in_progress it returns 409 and asks the client to retry shortly. Never SELECT-then-INSERT; check-then-act across a network is not atomic. Details I would volunteer: store a hash of the request body so the same key with a different body returns 422 instead of silently replaying the wrong result; scope keys per account so customers cannot collide; write the stored response in the same transaction as the charge so a crash cannot leave one without the other; and keep keys 24 hours, which for 10M writes/day at ~200 bytes is about 2 GB of state. On the client, add jittered backoff and a cap of three attempts so a provider brownout is not amplified.',
      isCaseBased: true,
    },
    {
      question: 'When is it safe to retry, and when is a retry actively harmful?',
      answer:
        'Two conditions, both required. One: the operation is idempotent — either by nature (GET, PUT, DELETE, a conditional UPDATE that sets rather than increments) or because I made it so with an idempotency key. Two: the error is retriable — connection refused or reset, timeouts, 500/502/503/504, and 429 with its Retry-After honoured. Never retry 400, 401, 403, 404, 409 or 422: the request is wrong, and resending burns capacity on both sides for a guaranteed identical answer. Harmful cases: retrying a non-idempotent write (duplicate side effects); retrying under overload, where retries are the load and turn a brownout into an outage; and retrying at multiple layers, where 3 x 3 x 3 becomes 27 calls per user action. So: retry at exactly one layer, cap attempts at about three, use jittered exponential backoff, enforce a retry budget of roughly 10% of the request rate, and put a circuit breaker in front so retries stop entirely once the failure is clearly not transient.',
      isCaseBased: false,
    },
    {
      question: 'Why does jitter matter? Backoff already spaces the retries out.',
      answer:
        'Backoff spaces retries in time for a single client; it does nothing about clients relative to each other. During an outage clients fail together, so with a deterministic schedule they also retry together: with base 100 ms and four attempts, everyone fires at 100 ms, 300 ms, 700 ms and 1500 ms. I ran exactly this — 20 clients, 80 retries — and got 4 distinct arrival instants with a worst burst of 20 retries in the same millisecond. Those synchronised spikes re-break the service every time it tries to stand up, and they can stay in phase for hours. Full jitter — sleep uniformly in [0, base x 2^attempt) instead of the exact value — keeps the same average delay and the same growth, but the same 80 retries landed across 76 distinct milliseconds with at most 2 colliding. The number that matters is not total retries, which is identical either way; it is the peak. Systems fail on peaks.',
      isCaseBased: false,
    },
    {
      question: 'Case: a service handling 1000 rps starts returning errors for 30% of requests. Ten minutes later it is completely down and the database looks fine. Reconstruct what happened.',
      answer:
        'A retry storm. Step one: 300 rps are failing. Step two: clients retry three times, so offered load becomes 700 + 300 x 3 = 1600 rps against a service that could not handle 1000 — the retries are now the majority of the traffic. Step three: the extra load pushes the failure rate to 60%, giving 400 + 600 x 3 = 2200 rps. It is a positive feedback loop: more failures produce more retries produce more failures. Meanwhile the original trigger — say a slow dependency or a GC pause — may have healed, and the system stays down purely on its own retries. The database looks fine because the exhausted resource is the service\'s thread pool, not the DB. I would confirm it from metrics: request count climbing while unique user actions stay flat is the retry-storm fingerprint, and per-layer retry counters localise it. Fixes: circuit breakers so retries stop once failure is systemic rather than transient; a retry budget capping retries at 10% of the request rate, which bounds amplification to 1.1x instead of 3x; full jitter so the surviving retries do not arrive in phase; retry at one layer only; and load shedding at the edge so the service refuses excess work in 1 ms rather than accepting and failing it in 8 s. The general lesson: retries help against rare independent failures and are gasoline against overload.',
      isCaseBased: true,
    },
    {
      question: 'Define idempotency precisely. Which HTTP methods are idempotent, and what is the catch?',
      answer:
        'An operation is idempotent if applying it twice has the same effect on state as applying it once. It is about effect, not about identical responses — DELETE /orders/7 twice leaves one deleted order, and the second returning 404 is perfectly idempotent. By spec: GET, HEAD, PUT, DELETE, OPTIONS and TRACE are idempotent; POST and PATCH are not. Safe is stronger — no state change at all — and covers GET, HEAD and OPTIONS; every safe method is idempotent but not the reverse. PATCH is the interesting one: a body of {"status": "shipped"} is idempotent while {"increment_views": 1} is not, and since the spec cannot inspect the body it declares PATCH non-idempotent. The catch is that the spec describes a promise you are supposed to keep, not a guarantee you receive: a GET that bumps a view counter is neither safe nor idempotent whatever the verb says, and caches, proxies and retry libraries will assume otherwise and break you. Practical consequence: when a write can be expressed as a set rather than a delta, do it — a conditional UPDATE ... WHERE status = \'free\' is idempotent for free, no extra table required.',
      isCaseBased: false,
    },
    {
      question: 'Case: design the idempotency layer for a payments API. Cover storage, the concurrency race, and expiry.',
      answer:
        'Contract: clients send Idempotency-Key, a UUID they generate per business intent and reuse across retries of that intent. Storage: a table keyed on the UUID as PRIMARY KEY with account_id (scope, so two customers cannot collide), request_hash, status in {in_progress, done}, the serialised response, and created_at. Flow: INSERT the key first with status in_progress; if that raises a unique violation this is a duplicate, so read the row — done means return the stored response and perform no charge, in_progress means return 409 and ask the client to retry shortly. Then perform the charge and, in the same transaction, set status to done with the response; committing them separately allows a crash to leave a charge with no record of it, which is exactly the failure the whole design exists to prevent. The race is the crux: SELECT-then-INSERT lets two retries 5 ms apart both read "absent" and both charge. The unique index is the lock — cheaper and more reliable than any application-level lock, and it works across processes and regions in a way an in-memory mutex does not. Body hash guards the case of the same key with different content: return 422 rather than replaying an unrelated response. Expiry: 24 hours is the industry norm; at 10M writes/day and ~200 bytes per row that is roughly 2 GB, cleaned by a TTL index or a nightly delete. Follow-up I would pre-empt: if the payment provider itself is the non-idempotent hop, pass the key through to them — most providers support one — otherwise record the provider\'s transaction id before returning, so reconciliation can settle any ambiguous attempt.',
      isCaseBased: true,
    },
    {
      question: 'A candidate says their queue gives exactly-once delivery. How do you respond?',
      answer:
        'Politely: exactly-once delivery is not achievable over an unreliable network. When an acknowledgement is lost, the sender cannot distinguish "not delivered" from "delivered, ack lost", so it must pick at-least-once (resend, risk duplicates) or at-most-once (do not, risk loss) — the two-generals problem. What is achievable is exactly-once effect: at-least-once delivery plus an idempotent consumer. In practice that means every message carries a business-level id, the consumer records processed ids (or writes with a conditional update keyed on that id), and reprocessing is a no-op. Kafka\'s "exactly-once semantics" is precisely this construction — an idempotent producer plus transactional writes and offset commits — and it holds only for reads and writes inside Kafka. The moment your consumer calls a payment provider or sends an email, you are back to at-least-once and the idempotency is your job. The senior framing: stop trying to make delivery exactly-once and make the handler safe to run twice; it is cheaper and it survives failures the delivery guarantee never covered.',
      isCaseBased: false,
    },
    {
      question: 'Explain the circuit breaker states, and how the breaker helps the downstream and not just you.',
      answer:
        'Three states. CLOSED: traffic flows and outcomes are counted; trip when a threshold is crossed, typically more than 50% failures over the last 100 calls with a minimum volume so two-of-three cannot trip it. OPEN: reject instantly without touching the network and run the fallback, for a cooldown of roughly 10-60 s. HALF-OPEN: after the cooldown let a handful of trial calls through — all succeed, close; any fail, reopen with a longer cooldown. On my side, failing fast frees resources: a doomed call that waits out a 2 s timeout holds a thread, a connection and its memory for 2 s and then fails anyway, and at a few hundred rps that waiting is the outage. On the downstream side it is the only pattern here that actively reduces the load on a sick dependency. A struggling service needs quiet to recover — finish a GC pause, drain its queue, refill its pool — and retries and queued calls deny it exactly that. Under a follow-up about a wrongly-tripped breaker I would defend the design and fix the tuning: breakers are per dependency and per endpoint, never global, so a slow reporting endpoint cannot cut off login on the same service; and if it trips on normal noise the threshold or the minimum volume is wrong, which is a config problem, not an argument against the pattern.',
      isCaseBased: false,
    },
    {
      question: 'Case: the recommendations service is flaky, and when it degrades the whole product page goes down with it. Fix it.',
      answer:
        'Recommendations is optional; the product page sells without it. So the target state is that a recommendations outage costs one widget, not the page. Three layers. Bulkhead: give recommendations its own bounded pool — say at most 20 of 200 worker threads, enforced with a semaphore — so a hang costs 20 threads while 180 keep serving checkout. This is what stops thread-pool exhaustion from spreading. Timeout: aggressive, around 100-150 ms from its p99, because the page must not wait on a nice-to-have; if it misses, render without it. Circuit breaker plus fallback: after the failure threshold, stop calling it entirely and serve a cached or static "popular in this category" list, or hide the strip. I would also put a feature flag on it so a human can disable the dependency in seconds without a deploy. On the write path, nothing here needs a retry at all — a missed recommendation is not worth one extra request against a failing service. Tradeoffs to state: personalisation quality drops during the incident, which is a product decision I would get agreed in advance, and the caching adds staleness. The wider principle: classify every dependency as critical or optional up front, and specify the fallback with the feature rather than at 3am.',
      isCaseBased: true,
    },
    {
      question: 'What is load shedding, and how is it different from rate limiting?',
      answer:
        'Rate limiting is a policy: this client gets 100 requests per minute, enforced whether or not the system is busy, mainly for fairness, abuse prevention and cost control. Load shedding is a reaction: the system is beyond capacity right now, so refuse work early and cheaply rather than accept what it cannot finish. The economics drive it — a 503 returned at the edge in 1 ms costs almost nothing, while the same request accepted, queued for 8 s and then failed costs a thread, a connection and the user\'s patience, and produces a retry. Shedding must be prioritised by request class decided in advance: paying customers over free tier, writes over reads, interactive over batch, and health checks always admitted so the instance does not get killed for being busy. Two implementation details that catch people out: trigger on queue depth or latency rather than CPU, because a growing queue is already a latency failure while CPU still looks fine; and drop requests whose deadline has already passed instead of serving them, since a reply nobody is waiting for is pure waste. Done well, shedding is what keeps a service at 100% of its real capacity instead of collapsing to 0%.',
      isCaseBased: false,
    },
    {
      question: 'How do SLOs and error budgets change the reliability conversation?',
      answer:
        'They convert an argument into a number. An SLO is a target — 99.9% availability is 43 minutes of allowed downtime per month, 99.99% is 4.3 — and the remainder is the error budget. Budget remaining means you may ship features and take deployment risk; budget exhausted means the next sprint goes to reliability. That single rule ends the permanent standoff between product and infrastructure, because both sides are reading the same meter. The honest part is that 100% is not a target but a fantasy: your cloud provider, DNS and payment gateway are not 100%, so your product mathematically cannot be, and each additional nine costs roughly ten times more than the last while becoming progressively imperceptible to users. It also disciplines the patterns in this module: degradation, shedding and breakers all trade some correctness or freshness for availability, and an SLO is what tells you how much of that trade you are allowed to make. Choose the SLO from what users actually notice, measure it on user-visible symptoms rather than server-side counters, and treat a comfortably unspent budget as a signal you are over-investing in reliability rather than a badge.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Why a missing timeout kills a service', back: 'Little\'s Law: in-flight = rate x latency. 500 rps x 9 s = 4500 threads needed; a 200-thread pool exhausts in 0.4 s. A hung call holds a thread, socket and pool slot forever. Unbounded latency means unbounded concurrency.' },
    { front: 'Timeout rule for a call chain', back: 'Timeouts must DECREASE with depth (3 s gateway → 2 s service → 800 ms DB). Otherwise the outer caller gives up while inner work keeps burning threads and locks. Best form: deadline propagation — send an absolute deadline, each hop uses time remaining.' },
    { front: 'The two conditions for a retry', back: '(1) The operation is idempotent. (2) The error is retriable: timeouts, connection errors, 5xx, 429. Never retry 400/401/403/404/422 — the request itself is wrong.' },
    { front: 'Full jitter, and why', back: 'sleep = uniform(0, base x 2^attempt) instead of the exact value. Without it, clients that failed together retry together: 20 clients hit 4 instants, 20 at a time. With it: 76 distinct instants, worst burst 2. Same total retries — different peak.' },
    { front: 'Retry storm arithmetic', back: '1000 rps, 30% failing, 3 attempts → 700 + 900 = 1600 rps; at 60% failing → 2200 rps. Retries multiply across layers too: 3 x 3 x 3 = 27 calls per user tap. Fix: one retry layer, cap ~3 attempts, retry budget ~10% of request rate.' },
    { front: 'Idempotent, precisely + the HTTP list', back: 'Applying it twice has the same EFFECT as once (not the same response bytes). Idempotent: GET, HEAD, PUT, DELETE, OPTIONS, TRACE. Not: POST, PATCH. Safe (no state change): GET, HEAD, OPTIONS.' },
    { front: 'Idempotency key pattern', back: 'Client generates a UUID per business intent and reuses it on every retry. Server stores key → result: first call does the work and stores the response, repeats replay it. Also store a body hash (same key + different body → 422), scope per account, TTL ~24 h.' },
    { front: 'The idempotency-key race and its fix', back: 'SELECT-then-INSERT lets two concurrent retries both miss and both charge. Fix: INSERT the key FIRST under a UNIQUE constraint — the loser gets a violation and reads the winner\'s row (done → replay response, in_progress → 409). The constraint is the lock.' },
    { front: 'Exactly-once — the honest version', back: 'Exactly-once DELIVERY is impossible over an unreliable network (lost ack is indistinguishable from lost message). What exists: at-least-once delivery + idempotent consumer = exactly-once EFFECT. Kafka EOS is this, and only inside Kafka.' },
    { front: 'Circuit breaker: 3 states + the point', back: 'CLOSED (count failures) → OPEN on threshold (~50% of last 100; reject instantly, run fallback, 10-60 s cooldown) → HALF-OPEN trial calls → CLOSED or OPEN again. Failing fast frees your pool AND gives the sick downstream the quiet it needs to recover.' },
  ],
  mindmapMarkdown: `- Resilience: Idempotency, Retries, Circuit Breakers & Timeouts
  - Founding assumption
    - Calls fail, hang, or succeed-but-lose-the-response
    - Slowness propagates further than failure
  - Timeouts (first, everything depends on them)
    - No timeout = unbounded resource leak
    - Connect vs read timeout; cap total incl. retries
    - Pick from downstream p99 x1.5-2, not hope
    - Must DECREASE with call depth
    - Deadline propagation: send absolute deadline, use time remaining
    - Little's Law: in-flight = rate x latency
  - Retries
    - Only idempotent ops, only retriable errors (5xx, 429, timeouts)
    - Never 400/401/403/404/422
    - Exponential backoff: 100, 200, 400, 800 ms; cap delay and attempts
    - Full jitter: uniform(0, base x 2^k) — 4 instants vs 76
    - Retry budget ~10% of request rate
    - Retry at ONE layer: 3x3x3 = 27
    - Retry storm: 1000 -> 1600 -> 2200 rps
  - Idempotency
    - Same effect twice as once (effect, not response)
    - GET/HEAD/PUT/DELETE/OPTIONS/TRACE yes; POST/PATCH no
    - Safe = no state change at all
    - Prefer set over delta (conditional UPDATE)
    - Idempotency key: client UUID, server stores key -> result
    - Body hash, per-account scope, 24 h TTL
    - Race: INSERT under UNIQUE, never SELECT-then-INSERT
    - Exactly-once delivery is a fiction
    - at-least-once + idempotent consumer = exactly-once effect
  - Circuit breakers
    - CLOSED -> OPEN (threshold) -> HALF-OPEN (trial) -> CLOSED
    - Fail fast beats queueing doomed requests
    - Protects the downstream: gives it quiet to recover
    - Per dependency and endpoint, never global
  - Containment
    - Bulkheads: bounded pool per dependency (20 of 200 threads)
    - Load shedding: reject early, prioritise by request class
    - Watch queue depth; drop expired-deadline requests
  - Graceful degradation
    - Product decision, chosen before the incident
    - Stale cache, static default, hide widget, kill switch
    - Trades freshness for availability
  - Cascading failure — synthesis
    - Slow dep -> waits -> pool exhausted -> LB drops -> retries -> total outage
    - Timeout / bulkhead / shedding / breaker / degradation cut each link
  - Operational edges
    - Liveness (restart me) vs readiness (stop routing to me)
    - Health checks need their own pool
    - SLO 99.9% = 43 min/month; error budget governs feature freeze`,
}

export default m
