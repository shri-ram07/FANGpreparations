import type { Module } from '../types'

const m: Module = {
  id: 'sysdesign-l0-queues-messaging',
  subjectId: 'sysdesign',
  level: 0,
  title: 'Message Queues: Decoupling, Backpressure & Kafka',
  whyItMatters:
    'The moment your design has more than two boxes, an interviewer asks "what if the payment service is down?" — and the only good answer involves a queue. Queues are also where candidates bluff hardest: they say "Kafka" without knowing it is a log, not a queue, and promise "exactly-once" without knowing what it actually guarantees. This module gives you the four wins, the honest bill, Kafka\'s real model, and the one metric that tells you your async system is dying.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'Two services holding hands',
      md: `Your checkout API does five things on one HTTP request: charge the card, write the order, email a receipt, update the warehouse, refresh the recommendation model.

- Every one of them must succeed *right now*, in the request, while the customer stares at a spinner.
- Latency adds up: 120 ms + 40 ms + 300 ms (email provider) + 200 ms + 500 ms = **over a second**, best case.
- Worse, availability *multiplies*. Five dependencies at 99.9% each → 99.9%⁵ ≈ **99.5%** — you built a system less reliable than any of its parts.
- The email provider hiccups and checkout fails. A customer with money in hand is turned away because a receipt could not be sent.
- The fix is not "make the email service faster". It is: **stop making checkout wait for it.** Put a queue in between.`,
    },
    {
      type: 'intuition',
      title: 'Four wins a queue buys you — name all four',
      md: `Interviewers want the list, not the vibe. A queue buys exactly these:

1. **Decoupling** — the producer knows a topic name, not a service. Checkout and the email worker deploy on different days, scale to different sizes, and fail independently. Restart the worker at noon; checkout never notices.
2. **Buffering / load-levelling** — a spike is *absorbed* instead of dropped. The queue trades **latency for survival**: with 10× traffic the receipts arrive late, but they arrive. Without it they 503.
3. **Asynchrony** — return \`202 Accepted\` in 20 ms, do the 3-second job later. The user-visible path shrinks to "validate + enqueue".
4. **Retries and durability** — the message is written to disk before the producer is acked. A worker that crashes mid-job does not consume the message; it gets redelivered. Compare with an in-process call, where a crash loses the work forever.

The one-line version: *a queue converts a synchronous, all-or-nothing chain into independent steps that can be retried.*`,
    },
    {
      type: 'intuition',
      title: 'The bill — say this before the interviewer does',
      md: `Nothing is free. Volunteering the cost is the senior signal.

- **Eventual consistency.** The order exists; the receipt does not, for a few seconds. Your UI must be honest about it ("processing…"), and any read that assumes the side effect already happened is now a bug.
- **Harder debugging.** The work happens *somewhere else, later*. A stack trace no longer spans the whole operation — you need correlation IDs and distributed tracing to stitch producer and consumer back together.
- **Ordering complications.** Two updates to the same order can be processed out of order by two workers. Order was free inside one function call; now you must design for it.
- **One more system to operate.** Brokers need capacity planning, upgrades, disk, monitoring, and an on-call rotation. A queue is not a library — it is infrastructure.
- Rule of thumb: reach for a queue when the work is **slow, retryable, and not needed for the response**. Otherwise you are paying this bill for nothing.`,
    },
    {
      type: 'intuition',
      title: 'Queue vs log — the distinction interviewers probe',
      md: `"Kafka is a message queue" is the answer that costs you the round. They are two different data structures.

- **Classic message queue** (RabbitMQ, SQS): a message is delivered to *one* consumer, and once that consumer **acknowledges** it, the broker **DELETES** it. Many workers on one queue are **competing consumers** — each message goes to exactly one of them. The queue is a to-do list that shrinks as work gets done.
- **Distributed log** (Kafka): an append-only, **ordered, retained** record. Consuming does not delete anything. Each consumer group tracks its own **offset** — a bookmark saying "I have read up to position 8,412". Ten independent teams read the same stream without stealing from each other, and rewinding the offset **REPLAYS** history.
- Which problem each fits: **queue** → "run this job once" (send email, resize image, charge card). Task distribution, and you never want the task done twice.
- **Log** → "this happened, and several people care" (order placed → billing, analytics, search index, fraud model). Also: rebuilding a broken downstream from scratch, because the events are still there.
- The killer question the log answers and the queue cannot: *"we shipped a bug in the analytics consumer — can you recompute the last 3 days?"* With a queue, that data is gone. With a log, you reset the offset and re-read.`,
    },
    {
      type: 'note',
      md: 'Do not over-read the split. SQS FIFO queues offer ordering; Kafka can be used as a plain work queue; RabbitMQ streams added a log-ish mode. The distinction that survives is **delete-on-ack vs retain-and-offset** — that is what changes your design, not the vendor logo.',
    },
    {
      type: 'intuition',
      title: "Kafka's model in five nouns",
      md: `Learn these five and you can hold a Kafka conversation.

- **Topic** — a named stream ("orders"). Purely a label; the physical unit is below.
- **Partition** — a topic is split into partitions, and a partition is an ordered, append-only file. It is the unit of **parallelism** AND the unit of **ordering**: messages are ordered *within* a partition, and **not across partitions**. This is why the partition key matters — \`hash(key) % partitions\` decides where a message lands, so all events for one order_id land in one partition and stay in order.
- **Consumer group** — a set of workers sharing a topic. Within a group, each partition is assigned to **exactly one** consumer. So 12 partitions and 12 consumers = full parallelism; 12 partitions and 20 consumers = **8 idle consumers**. Partition count is your parallelism ceiling — pick it high enough up front, because increasing it later reshuffles which key goes where.
- **Offset** — the per-group bookmark. **Commit** it *after* processing, not before: commit-then-crash loses the message (at-most-once), process-then-commit-then-crash reprocesses it (at-least-once). Different groups on the same topic have completely independent offsets.
- **Retention** — messages are deleted by policy (7 days, or 500 GB per partition), **not** by consumption. A stopped consumer is fine for a week; a consumer stopped for 8 days on a 7-day retention has silently lost data.`,
    },
    {
      type: 'note',
      md: '**Durability, one line.** Each partition is replicated to `replication.factor` brokers (typically 3); one is the leader, the rest are followers, and the ones that are caught up form the **ISR** (in-sync replicas). With `acks=all` a write is only acked once every ISR member has it — so any single broker can die without losing a committed message. `acks=1` (leader only) is faster and loses the tail if the leader dies before the followers copy it.',
    },
    {
      type: 'intuition',
      title: 'Delivery semantics: the three phrases, honestly',
      md: `- **At-most-once** — ack/commit the offset first, then process. A crash between them loses the message. Only acceptable when the data is cheap: metrics samples, debug logs.
- **At-least-once** — process first, commit after. A crash after processing but before committing means the message is redelivered and processed **again**. This is the **practical default** of essentially every real system, and the one to name in interviews.
- **Exactly-once** — the phrase that eats candidates. What Kafka's EOS actually gives you: **idempotent producers** (a retried produce does not create a duplicate on the broker) plus **transactional writes** that atomically commit "the messages I produced" and "my consumer offset" — *within Kafka*. It is exactly-once **processing inside one system**, not a magic end-to-end guarantee. The moment your consumer writes to Postgres, sends an email, or calls Stripe, that external effect is outside the transaction and can happen twice.
- So the engineering consequence is unavoidable: **duplicates WILL happen, therefore your consumers must be idempotent.** Processing the same message twice must produce the same end state as processing it once — dedupe on a message id in a unique-constrained table, use UPSERT instead of INSERT, use conditional writes ("set status = shipped WHERE status = packed"). This is the same idempotency discipline as the Level 1 resilience module (retries, backoff, circuit breakers); queues are simply where you are guaranteed to need it.
- Say it out loud: *"I design for at-least-once and make the consumer idempotent — that is cheaper and more honest than chasing exactly-once."*`,
    },
    {
      type: 'intuition',
      title: 'Ordering: you probably need less of it than you think',
      md: `- **Total order** — every message across the whole topic in one sequence — costs you a single partition, which means a single consumer, which means **no parallelism**. Your throughput ceiling is one machine. Very few systems can afford this.
- **Per-key order** is almost always the real requirement. You do not care that Alice's order is processed before Bob's. You care that *this* order's "created → paid → shipped" events are not applied out of sequence.
- The mechanism is one design decision: **partition by entity id**. Same key → same partition → one consumer → guaranteed order for that entity, while different entities process fully in parallel.
- Choose the key by what must stay ordered: \`order_id\` for order lifecycle, \`user_id\` for per-user state, \`account_id\` for ledger entries.
- The catch (same as the sharding module): a **hot key** — one celebrity account, one enormous merchant — sends a disproportionate share of traffic into one partition, and that partition's single consumer becomes the bottleneck. Even key spread is not even load spread.`,
    },
    {
      type: 'intuition',
      title: 'Backpressure: what happens when producers outrun consumers',
      md: `A queue does not create capacity. It **defers** the problem, and it only works if the average arrival rate is below the average drain rate.

- Producers at 2000/s, consumers at 500/s: the queue grows by 1500 every second. Nothing is lost — yet.
- What grows with it: **end-to-end latency** (a message enqueued now is processed after everything ahead of it), then **memory or disk** on the broker, then finally hard failure — the broker refuses writes, or your in-memory queue OOMs the process.
- When the buffer is exhausted you have exactly three moves, and you must pick one *in advance*: **slow the producer** (block or rate-limit it — real backpressure, pushing the pain upstream to where it can be handled), **shed load** (reject new requests with 429/503 so the system stays alive for the rest), or **drop** (discard low-value messages — fine for metrics, never for payments).
- **Consumer lag is THE metric.** Lag = how far the consumer's offset trails the newest message. Measured in messages it is meaningless across services; divide by throughput and it becomes **seconds of backlog** — a number a human can act on. Alert on lag *trend*, not just absolute value: steadily rising lag means arrival rate has permanently exceeded drain rate, and the queue will never recover on its own.`,
    },
    {
      type: 'hinglish',
      md: `Backpressure ko dukaan ki line se samjho. Shop ke andar ek time pe sirf 10 log ghus sakte hain — yeh **consumer rate** hai, aur yeh fix hai. Bahar line lag gayi to koi customer khoya nahi, bas sabka **wait time** badh gaya: queue ne latency de kar survival khareed liya. Problem tab hai jab line galli ke bahar tak chali jaye — ab teen hi raaste bachte hain: **aur counter kholo** (consumers/partitions badhao), **guard se bolo naye logon ko andar mat aane do** (shed load, 429 do), ya **line ka end kaat do** (drop — metrics ke liye theek, payments ke liye kabhi nahi). Aur jo cheez alarm pe honi chahiye woh sales nahi hai — woh **line ki lambai aur wo kitni tezi se badh rahi hai**, yaani consumer lag.`,
    },
    { type: 'visual', component: 'RateLimiterSim', props: {} },
    {
      type: 'note',
      md: 'Read the token bucket above as **backpressure made visible**. The bucket is your buffer: it holds a fixed amount of slack (capacity), and it refills at a fixed rate — that refill rate is your consumers\' sustained throughput. Fire a **burst** and watch it drain the bucket instantly: the buffer absorbs the spike, exactly what a queue does for you. Keep firing past the sustained rate and the bucket stays empty, so every extra request **bounces** — that is load shedding, the honest failure. The lesson transfers directly: a buffer converts a short spike into higher latency, but against a *sustained* overload it only delays the moment you must reject.',
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'A spike hits the queue: growth, lag alert, and the long drain',
        notice: 'Baseline 300 orders/s. The consumer group drains a fixed 500/s — it never speeds up. Watch depth, and watch lag (depth ÷ 500) cross the 30s alert line.',
        leftLabel: 'incoming traffic',
        rightLabel: 'queue + consumers',
        frames: [
          {
            note: 'Steady state. 300 messages arrive per second, 4 workers drain 500/s. The queue is a pass-through — depth stays at 0 and end-to-end latency is basically broker latency. Note the headroom: 200/s of unused drain capacity is the only thing that will ever pay a backlog off.',
            stack: [{ name: 'orders: 300/s', to: 'topic' }],
            heap: [
              { id: 'topic', value: 'depth 0 · lag 0s', label: 'orders topic' },
              { id: 'group', value: '4 workers · 500/s', label: 'consumer group — keeping up' },
            ],
          },
          {
            note: 'Flash sale at t=10s: arrivals jump to 2000/s. Consumers do NOT speed up — 500/s is their capacity. Net +1500/s. By t=15s the queue holds 9,000 messages, so a receipt enqueued now waits 18 seconds. Nothing is lost. The queue is doing its job: trading latency for survival.',
            stack: [{ name: 'flash sale: 2000/s', to: 'topic' }],
            heap: [
              { id: 'topic', value: 'depth 9,000 · lag 18s', label: 'growing +1500/s' },
              { id: 'group', value: '4 workers · 500/s', label: 'saturated, still steady' },
            ],
          },
          {
            note: 't=20s: lag crosses the 30-second alert threshold. THIS is the page — not "queue non-empty", which is normal, but "backlog exceeds 30s of work and is still climbing". The trend is the signal: arrival rate is above drain rate, so this will not fix itself. Act now — add consumers (up to the partition count), or start shedding load.',
            stack: [{ name: 'flash sale: 2000/s', to: 'topic', danger: true }],
            heap: [
              { id: 'topic', value: 'depth 16,500 · lag 33s', label: 'LAG ALERT — over 30s and rising', danger: true },
              { id: 'group', value: '4 workers · 500/s', label: 'cannot go faster — this is the ceiling' },
            ],
          },
          {
            note: 't=39s, the peak: 45,000 messages, 90 seconds of backlog. Customers who paid a minute ago still have no receipt. The spike ends at t=40s and arrivals fall back to 300/s — but the debt is already booked. Recovery speed is not the drain rate; it is the SURPLUS: 500 − 300 = 200/s.',
            stack: [{ name: 'sale ends → 300/s', to: 'topic' }],
            heap: [
              { id: 'topic', value: 'depth 45,000 · lag 90s', label: 'peak backlog', danger: true },
              { id: 'group', value: '4 workers · 500/s', label: 'surplus after recovery: only 200/s' },
            ],
          },
          {
            note: 'Drained at t=264s. A 30-second spike cost 224 seconds of recovery — roughly 7× its own length, because the payback rate (200/s) is a fraction of the overload rate (1500/s). That ratio is the whole lesson: size consumers for the surplus you need during recovery, not just for the average load.',
            stack: [{ name: 'orders: 300/s', to: 'topic' }],
            heap: [
              { id: 'topic', value: 'depth 0 · lag 0s', label: 'recovered — 224s after the spike ended' },
              { id: 'group', value: '4 workers · 500/s', label: 'consumer group — caught up' },
            ],
          },
        ],
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Simulate the spike: when does lag peak, and how long to drain?',
      code: `CONSUME = 500        # msgs/sec the consumer group drains (fixed capacity)
BASE = 300           # normal arrival rate
SPIKE = 2000         # arrival rate during a 30-second flash sale
SPIKE_START, SPIKE_END = 10, 40
ALERT_LAG = 30       # page someone when the backlog exceeds 30s of work

depth = 0            # messages sitting in the queue
peak = (0, 0)
alert_on = drained = None

for t in range(300):
    arrivals = SPIKE if SPIKE_START <= t < SPIKE_END else BASE
    depth += arrivals
    depth -= min(depth, CONSUME)      # consumers never speed up
    lag_s = depth / CONSUME           # depth in messages -> lag in SECONDS

    if depth > peak[1]:
        peak = (t, depth)
    if alert_on is None and lag_s > ALERT_LAG:
        alert_on = t
    if alert_on is not None and drained is None and depth == 0:
        drained = t

    if t % 30 == 0 or t == SPIKE_END:
        flag = ' <-- ALERT' if lag_s > ALERT_LAG else ''
        print(f't={t:3d}s  in={arrivals:5d}/s  depth={depth:7d}  lag={lag_s:6.1f}s{flag}')

print()
print(f'peak backlog {peak[1]} msgs at t={peak[0]}s  (lag {peak[1] / CONSUME:.0f}s)')
print(f'lag crossed {ALERT_LAG}s at t={alert_on}s; queue drained at t={drained}s')
print(f'a {SPIKE_END - SPIKE_START}s spike cost {drained - SPIKE_END}s of recovery')

# --- real output ---
# t=  0s  in=  300/s  depth=      0  lag=   0.0s
# t= 30s  in= 2000/s  depth=  31500  lag=  63.0s <-- ALERT
# t= 40s  in=  300/s  depth=  44800  lag=  89.6s <-- ALERT
# t= 60s  in=  300/s  depth=  40800  lag=  81.6s <-- ALERT
# t= 90s  in=  300/s  depth=  34800  lag=  69.6s <-- ALERT
# t=120s  in=  300/s  depth=  28800  lag=  57.6s <-- ALERT
# t=150s  in=  300/s  depth=  22800  lag=  45.6s <-- ALERT
# t=180s  in=  300/s  depth=  16800  lag=  33.6s <-- ALERT
# t=210s  in=  300/s  depth=  10800  lag=  21.6s
# t=240s  in=  300/s  depth=   4800  lag=   9.6s
# t=270s  in=  300/s  depth=      0  lag=   0.0s
#
# peak backlog 45000 msgs at t=39s  (lag 90s)
# lag crossed 30s at t=20s; queue drained at t=264s
# a 30s spike cost 224s of recovery`,
      annotations: {
        14: 'min(depth, CONSUME) — you cannot drain more than you have. This one line IS the model: arrivals vary, capacity does not.',
        15: 'Depth in messages means nothing across services. Depth divided by throughput is lag in SECONDS — the number you alert on and the number you tell a product manager.',
        31: 'The headline: a 30-second spike took 224 seconds to pay off. Overload accrues at 1500/s; recovery pays at only 200/s (500 drain − 300 baseline). Size consumers for the recovery surplus, not the average.',
      },
    },
    {
      type: 'intuition',
      title: 'Three failure modes and the standard escape hatch',
      md: `- **Poison message.** One malformed message (a null field, a 500 MB payload, an unparseable date) throws on every attempt. With at-least-once, the consumer never commits its offset, so it retries the same message forever — and in Kafka that **blocks the entire partition** behind it. One bad record halts a stream of millions.
- **Unbounded retry loop.** A downstream service is down, so every message fails and is retried immediately, at full speed. You have now built a retry storm that hammers the sick service while it tries to recover. Fix: capped retries, exponential backoff with jitter, and a retry counter carried on the message.
- **Duplicate storms.** A consumer processes slowly and exceeds the broker's visibility timeout / \`max.poll.interval\`; the broker assumes it died and hands the message to another worker. Now two workers do the same job. Fix: make handlers fast, extend the timeout deliberately, and keep consumers idempotent.
- **Dead-letter queue (DLQ)** is the standard escape hatch: after N failed attempts, move the message to a separate queue and **commit the offset so the stream keeps flowing**. The DLQ becomes your bug inbox — inspect it, fix the code, replay the messages. Two non-negotiables: alert on DLQ depth (a silent DLQ is a data-loss bucket), and record *why* each message failed alongside it.`,
    },
    {
      type: 'intuition',
      title: 'The four patterns worth naming',
      md: `- **Work queue (competing consumers)** — one queue, N identical workers, each message handled once. Add workers to add throughput. The default for background jobs: image resizing, PDF generation, email sending.
- **Pub/sub fan-out** — one event, many independent subscribers, each with its own offset or its own queue. "OrderPlaced" feeds billing, analytics, the search index, and the fraud model, none of which know the others exist. Adding a fifth consumer requires zero changes to the producer — that is the decoupling payoff made concrete.
- **Request-reply** — send a message with a \`reply_to\` queue and a correlation id, then wait for the response. It works, but you have re-implemented RPC on top of a broker, with worse latency and worse debuggability. Use it only when you specifically need the broker's durability or fan-in; otherwise just make an HTTP call.
- **Outbox pattern** — the correct answer to "how do you write to your DB *and* publish an event atomically?"`,
    },
    {
      type: 'intuition',
      title: 'The outbox pattern — solving the dual-write problem',
      md: `The trap first. Your handler does two writes: \`INSERT order\` into Postgres, then \`publish OrderPlaced\` to Kafka. There is no transaction spanning both.

- Crash between them → the order exists but no event was published. Billing never charges. Silent, permanent inconsistency.
- Publish first instead → the event goes out for an order that then fails to commit. Downstream systems process a phantom order.
- Retrying either half creates duplicates. **There is no ordering of two independent writes that is safe.** This is the dual-write problem.
- **The fix:** make it *one* write. In the same database transaction that inserts the order, also insert a row into an \`outbox\` table holding the event payload. One transaction, one storage system — atomic by construction.
- A separate **relay** process then reads unpublished outbox rows and publishes them to the broker, marking them sent (or reading the DB's replication log directly — this is what change-data-capture tools like Debezium do). If the relay crashes after publishing but before marking, the event is published twice — **at-least-once again**, which is exactly why consumers are idempotent.
- Say this in an interview and you have answered a question most candidates do not know exists.`,
    },
    {
      type: 'intuition',
      title: 'Event-driven vs request-driven — and when NOT to use a queue',
      md: `The architectural choice: **request-driven** services call each other and wait ("charge this card, tell me if it worked"). **Event-driven** services announce facts and move on ("OrderPlaced"), and interested parties react.

- Request-driven gives you an immediate answer, a simple mental model, and one stack trace per operation — at the price of tight coupling and multiplied availability.
- Event-driven gives you loose coupling, easy extension, and independent scaling — at the price of eventual consistency and a flow no single person can see end to end. Producers do not know who consumes them, which is a feature until you need to change the schema.
- Most real systems are **both**: synchronous for the read path and for anything the user must see resolved, asynchronous for everything else.

**When NOT to use a queue:**

- **Synchronous read paths.** "Load my profile" must return data now. Adding a queue adds latency and buys nothing — there is no work to defer.
- **When you need an immediate answer.** Fraud checks and inventory reservations at checkout must resolve before you respond. A queue would only let you promise something you cannot yet verify.
- **Strict cross-service transactions.** Queues give you eventual consistency, not atomicity across services. If you truly need all-or-nothing, that is a saga (with compensating actions) or a single-database design — both covered later.
- **Low volume, low latency, one consumer.** If a direct call is fast and reliable, a broker adds an operational dependency for no benefit. Two services and 10 requests/second do not need Kafka.
- The honest interview sentence: *"I'd use a queue for slow, retryable, fire-and-forget work — and keep anything the user must see confirmed on the synchronous path."*`,
    },
  ],
  quiz: [
    {
      question: 'Team A and Team B both consume "OrderPlaced" — billing and analytics. With a classic message queue (delete-on-ack, competing consumers), what breaks?',
      options: [
        { text: 'Nothing — both receive every message', explanation: 'That is log/pub-sub behavior. On one classic queue, a message acked by billing is deleted, so analytics never sees it.' },
        { text: 'Each message goes to only ONE of them — they steal each other\'s work', explanation: 'Correct. Competing consumers split the stream; delete-on-ack means the message is gone after the first ack. Fan-out needs either one queue per subscriber or a log where each group has its own offset.' },
        { text: 'Messages are duplicated to both, doubling cost', explanation: 'Duplication to every consumer is exactly what a queue does NOT do — that is the log/topic model.' },
        { text: 'Ordering is lost between the two consumers', explanation: 'Ordering is a real concern, but the fatal issue here is delivery: analytics simply does not get the messages billing consumed.' },
      ],
      correct: 1,
    },
    {
      question: 'A Kafka topic has 8 partitions. You scale one consumer group to 12 consumers. What happens?',
      options: [
        { text: 'Throughput increases by 50%', explanation: 'It cannot — only 8 units of parallelism exist. The extra consumers get no work.' },
        { text: 'Kafka splits partitions automatically to match', explanation: 'Partition count is a topic setting you change deliberately; it never auto-scales to consumer count.' },
        { text: '8 consumers get one partition each; 4 sit idle', explanation: 'Correct. Within a group, a partition is assigned to exactly one consumer, so partition count is the hard parallelism ceiling. Adding consumers past it buys nothing — you must add partitions (which reshuffles key-to-partition mapping).' },
        { text: 'Each partition is shared by 1.5 consumers on average', explanation: 'A partition is never split across consumers in the same group — that would destroy the per-partition ordering guarantee.' },
      ],
      correct: 2,
    },
    {
      question: 'Your consumer commits its offset BEFORE processing the message. What delivery semantic did you just build?',
      options: [
        { text: 'At-most-once — a crash after committing loses the message', explanation: 'Correct. The broker believes it is done, so it is never redelivered. Acceptable only for cheap data like metrics samples.' },
        { text: 'At-least-once', explanation: 'That is the opposite ordering: process first, commit after — a crash then causes redelivery, not loss.' },
        { text: 'Exactly-once', explanation: 'Committing early guarantees nothing; it removes the safety net that makes redelivery possible.' },
        { text: 'It depends on the replication factor', explanation: 'Replication protects against broker loss. This is about consumer commit ordering — a completely separate axis.' },
      ],
      correct: 0,
    },
    {
      question: 'Arrivals average 800/s, consumers drain 500/s, sustained. What does the queue do?',
      options: [
        { text: 'Absorbs it — that is what buffers are for', explanation: 'A buffer absorbs a SPIKE, not a sustained excess. Over a permanent 300/s gap it only delays the failure.' },
        { text: 'Consumers automatically speed up under pressure', explanation: 'Consumer throughput is set by code, CPU, and downstream dependencies — a growing backlog does not make handlers faster.' },
        { text: 'The broker starts dropping the oldest messages silently', explanation: 'Retention deletes by age or size on a fixed policy; it is not an overflow valve, and relying on it as one is silent data loss.' },
        { text: 'Grows without bound: +300/s forever, until disk or memory fails', explanation: 'Correct. A queue defers capacity problems, it never creates capacity. Sustained arrival rate above drain rate has exactly three answers: add consumers, shed load, or drop.' },
      ],
      correct: 3,
    },
    {
      question: 'One malformed message keeps throwing in an at-least-once Kafka consumer. What is the impact, and the standard fix?',
      options: [
        { text: 'Kafka skips it after 3 tries automatically; no fix needed', explanation: 'Kafka has no built-in skip. The offset is never committed, so the consumer re-reads the same message forever.' },
        { text: 'Only that message is affected; the rest of the partition flows past it', explanation: 'It cannot flow past — a partition is consumed strictly in order, so everything behind the poison message is stuck.' },
        { text: 'It blocks its whole partition; move it to a dead-letter queue after N attempts and commit the offset', explanation: 'Correct. The DLQ is the escape hatch: park the bad message with its failure reason, commit past it so the stream flows, then alert on DLQ depth and replay after fixing the bug.' },
        { text: 'Increase the replication factor so a healthy replica processes it', explanation: 'Replication copies data across brokers for durability. Every replica holds the same bad bytes — it is a consumer-code problem.' },
      ],
      correct: 2,
    },
    {
      question: 'A handler does `INSERT order` in Postgres, then `publish OrderPlaced` to Kafka. It crashes between the two. What is the clean fix?',
      options: [
        { text: 'Outbox pattern: write the event as a row in the SAME DB transaction, and relay it to the broker separately', explanation: 'Correct. It converts a dual write into one atomic write to one system. The relay may publish twice on its own crash — at-least-once again — which is why consumers stay idempotent.' },
        { text: 'Publish to Kafka first, then insert the order', explanation: 'That just swaps which half is orphaned: downstream systems now process an event for an order that never committed.' },
        { text: 'Wrap both in a distributed transaction (2PC) across Postgres and Kafka', explanation: 'Technically conceivable, practically avoided: 2PC adds a coordinator, blocking locks, and new failure modes — which is precisely why the outbox pattern exists.' },
        { text: 'Retry the publish in a finally block', explanation: 'The process crashed — no finally block runs. Any in-process retry dies with the process.' },
      ],
      correct: 0,
    },
    {
      question: 'Order lifecycle events (created → paid → shipped) must never be applied out of sequence, but you need parallelism. What do you do?',
      options: [
        { text: 'Use a single partition so everything is totally ordered', explanation: 'That guarantees order and destroys parallelism: one partition means one consumer, so your ceiling is one machine.' },
        { text: 'Add timestamps and let consumers sort', explanation: 'Consumers see a stream, not a batch — a later event can arrive before an earlier one is even read, and clock skew across producers makes the sort unreliable.' },
        { text: 'Partition by order_id: same key → same partition → ordered, while different orders run in parallel', explanation: 'Correct. Per-key order is the real requirement; total order is not. Watch for hot keys — one huge merchant can overload the single consumer of its partition.' },
        { text: 'Enable exactly-once semantics', explanation: 'EOS addresses duplicates, not sequencing. Deduplicated events can still be applied in the wrong order.' },
      ],
      correct: 2,
    },
    {
      question: 'You need to reprocess the last 3 days of events because the analytics consumer had a bug. Which system lets you, and why?',
      options: [
        { text: 'A classic queue — just re-request the messages', explanation: 'They were deleted on ack. There is nothing left on the broker to re-request.' },
        { text: 'Either one, if you increase the retry count', explanation: 'Retries apply to messages still pending. Successfully acked-and-deleted messages are unrecoverable regardless of retry settings.' },
        { text: 'A distributed log — messages are retained by policy, not consumption, so you reset the consumer group offset and re-read', explanation: 'Correct. Retention (say 7 days) plus per-group offsets is exactly what makes replay possible — and it is the sharpest practical difference between a log and a queue.' },
        { text: 'Neither — you must restore from a database backup', explanation: 'That is the fallback when you only have a queue. With a log the events are still sitting there, which is the whole point.' },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why put a queue between two services? Give me the wins and the costs.',
      answer:
        'Four wins, named: decoupling (producer targets a topic, not a service — they deploy, scale, and fail independently), buffering (a spike is absorbed rather than dropped; the queue trades latency for survival), asynchrony (return 202 in 20 ms and do the 3-second job later), and retries/durability (the message is on disk, so a worker crash means redelivery, not lost work). Concretely: five synchronous dependencies at 99.9% each multiply to about 99.5% availability — moving four of them behind a queue keeps checkout up when the email provider hiccups. The costs I would volunteer: eventual consistency (the order exists, the receipt does not yet, and the UI must say so), harder debugging (no single stack trace — you need correlation IDs and tracing), ordering complications (two workers can apply updates out of order), and one more piece of infrastructure to run and page on. My rule: queue the work that is slow, retryable, and not needed for the response.',
      isCaseBased: false,
    },
    {
      question: 'Kafka vs RabbitMQ — what is the actual structural difference, and which problems does each fit?',
      answer:
        'RabbitMQ/SQS is a message queue: a message is delivered to one consumer and DELETED on acknowledgment, with competing consumers splitting the work. Kafka is a distributed log: an ordered, retained, append-only record where consuming deletes nothing and each consumer group keeps its own offset. That single difference drives everything else. Queue fits task distribution where the job should run exactly once and history is worthless: send this email, resize this image, charge this card — plus per-message routing, priorities, and delayed delivery, which brokers do well and logs do not. Log fits event streams with multiple independent consumers: OrderPlaced feeds billing, analytics, search indexing, and fraud — each at its own pace, each able to rewind. The question that decides it: "will you ever need to replay?" A queue cannot, because the data is gone; a log can, because retention is by time or size, not by consumption. I would not over-draw the line, though — SQS FIFO gives ordering, Kafka can serve as a plain work queue. The durable distinction is delete-on-ack versus retain-and-offset.',
      isCaseBased: false,
    },
    {
      question: 'Explain Kafka partitions, consumer groups, and offsets — and how they constrain each other.',
      answer:
        'A topic is a label; a partition is the real object — an ordered append-only file. It is simultaneously the unit of parallelism and the unit of ordering: messages are ordered within a partition and unordered across partitions, and hash(key) % partitions decides which partition a message lands in. A consumer group is a set of workers sharing the topic, and within a group each partition is assigned to exactly one consumer. That is the constraint: partition count is a hard parallelism ceiling. Eight partitions and twelve consumers means four idle consumers; the only cure is more partitions, which reshuffles key-to-partition mapping and therefore per-key ordering across the boundary — so pick generously up front. Offsets are per-group bookmarks, which is why five teams read the same topic independently and none can starve the others. Two operational notes worth adding: commit offsets after processing (that choice is your delivery semantic), and retention deletes by time or size, not by consumption — so a consumer down longer than the retention window has silently lost data.',
      isCaseBased: false,
    },
    {
      question: 'Case: your payment-events consumer is 40 minutes behind and lag is still climbing. Walk me through the incident.',
      answer:
        'First, classify: rising lag means arrival rate exceeds drain rate right now, so this will not self-heal — different from a flat backlog left over from a past spike, which will. Then find which side moved. Check arrivals (did a batch job or a retry storm start producing?) and check drain rate per consumer (did p99 handler latency jump because a downstream DB or third-party API slowed down?). Check whether lag is uniform or concentrated in a few partitions — if it is one or two, that is a hot key or a poison message blocking those partitions, not a capacity problem. Mitigations in order of speed: add consumers, but only up to the partition count (if consumers already equal partitions, adding more does literally nothing — this is the trap); if the bottleneck is a slow downstream call, increase per-consumer concurrency or batch the writes; if a poison message is blocking a partition, DLQ it and commit past; if arrivals are the problem, shed load or rate-limit the producer. Then the honest arithmetic for the recovery estimate: recovery speed is the surplus, not the drain rate — draining 45,000 messages at 500/s while 300/s keep arriving takes 225 seconds, not 90. And the permanent fixes: alert on lag in seconds with a rising-trend condition, provision consumers with recovery surplus rather than average load, and give partition count headroom.',
      isCaseBased: true,
    },
    {
      question: 'What does "exactly-once" actually mean in Kafka, and what should you build instead?',
      answer:
        'Kafka EOS is two real mechanisms with a narrow scope. Idempotent producers: each producer gets an ID and sequence numbers, so a retried produce request does not append a duplicate to the log. Transactions: a consume-process-produce cycle can atomically commit both the messages produced and the consumer offset, so a batch is either fully visible or not at all. Both are exactly-once processing WITHIN Kafka. The moment your consumer writes to Postgres, emails a customer, or calls Stripe, that effect sits outside the transaction and can happen twice — no broker feature can prevent that, because the broker does not control the external system. So what I build is at-least-once plus idempotent consumers: dedupe on a message id in a unique-constrained table, UPSERT rather than INSERT, use conditional updates like "set status = shipped WHERE status = packed", and pass idempotency keys to external APIs that support them. That is cheaper to operate, survives redelivery from any cause, and does not depend on every hop supporting transactions. The sentence I would say: exactly-once is a property of your handler, not a checkbox on your broker.',
      isCaseBased: false,
    },
    {
      question: 'Case: design the async pipeline for a food-delivery order — payment, restaurant notification, driver dispatch, analytics. What is sync, what is async, and how do you keep them consistent?',
      answer:
        'Synchronous, because the user must see them resolved: validate the cart, reserve inventory, and authorize the payment. You cannot promise an order you have not verified you can charge, and a queued fraud check would let you accept orders you must later cancel. Asynchronous, published as OrderPlaced events: restaurant notification, driver dispatch, receipt email, loyalty points, and analytics — all slow, retryable, and not needed for the 200 response. A log rather than a queue, because four independent consumers need the same event and analytics will inevitably need replay after a bug. Partition key = order_id, so each order lifecycle stays ordered while orders run in parallel. Consistency: the API commits the order row and an outbox row in one Postgres transaction, and a relay publishes from the outbox — that removes the dual-write hole where the order exists but nothing downstream ever hears about it. Every consumer is idempotent because the relay and the broker both guarantee only at-least-once, so notifying a restaurant twice must be a no-op keyed on order_id. Failure handling: capped retries with exponential backoff and jitter, then a DLQ per consumer with alerting on depth, so one malformed order does not stall dispatch for every other customer. Follow-up I would pre-empt: if dispatch fails permanently, that is a business compensation (refund and notify), a saga concern — not something retries can fix.',
      isCaseBased: true,
    },
    {
      question: 'What is backpressure, and what are your options when producers outrun consumers?',
      answer:
        'Backpressure is the feedback that a downstream stage cannot keep up, pushed back to the producer. Without it, the excess simply accumulates: queue depth grows, end-to-end latency climbs proportionally, broker memory or disk fills, and eventually writes are refused or the process dies. The queue is a shock absorber for spikes, not extra capacity — it only works if the AVERAGE arrival rate is under the average drain rate. When it is not, there are exactly three moves and you should pick one before the incident: slow the producer (blocking sends, or an explicit rate limit — real backpressure, pushing the pain upstream where a caller can retry later), shed load (reject with 429/503 so the system stays alive for the traffic it can serve, which is what a token bucket does when the bucket is empty), or drop (discard low-value messages — fine for metrics, never for payments). The metric is consumer lag, expressed in seconds of backlog rather than message count so it is comparable across services, alerted on its trend rather than a single threshold, because steadily rising lag means the system will never recover unaided.',
      isCaseBased: false,
    },
    {
      question: 'Case: a bug in your recommendation consumer corrupted three days of user profiles. The events flowed through Kafka. How do you recover, and what would the answer be if you had used SQS instead?',
      answer:
        'With Kafka, if retention covers those three days: fix the consumer, make the rebuild idempotent (recompute profiles from events rather than incrementing counters), then reset that consumer group offset to the timestamp three days back and re-read. Only that group is affected — billing and search keep their own offsets and never notice. Practical care: replay into a shadow table or a new group ID and swap after validation rather than overwriting live profiles, and expect the replay to run at full speed, so rate-limit it or it becomes its own overload incident on the profile store. If retention was 24 hours, you have lost the window — which is exactly why retention is a design decision, not a default. With SQS the honest answer is that you cannot: acked messages are deleted, so the events no longer exist. Your options are rebuilding from whatever system of record still holds the source data, or accepting the corruption. The generalizable point is that replayability is the reason to pick a log for event streams, and that the value of the log is realized only if your consumers are idempotent enough to be re-run.',
      isCaseBased: true,
    },
    {
      question: 'A poison message and an unbounded retry loop are different failures. Distinguish them, and give me the escape hatch.',
      answer:
        'A poison message fails deterministically because of its own content — a null field, an unparseable date, a payload too large. Retrying is pointless: it will fail identically forever, and under at-least-once the offset is never committed, so in Kafka everything behind it in that partition is blocked too. One record halts a stream. An unbounded retry loop is the systemic version: a downstream dependency is down, so every message fails and is retried immediately at full rate, which hammers the sick service and prevents its recovery — a retry storm. The distinction matters because the fixes differ: poison messages need to be removed from the path, while a downstream outage needs the retries slowed and eventually stopped. The shared escape hatch is a dead-letter queue: cap attempts, apply exponential backoff with jitter between them, and after N failures move the message to a DLQ with its failure reason attached and commit the offset so the stream flows again. Then the two operational rules: alert on DLQ depth — an unwatched DLQ is a silent data-loss bucket — and make replaying from it a routine, tested action, not a one-off script written during an incident.',
      isCaseBased: false,
    },
    {
      question: 'Explain the dual-write problem and how the outbox pattern solves it.',
      answer:
        'Dual write: a handler must insert an order into Postgres and publish OrderPlaced to Kafka, but no transaction spans both systems. DB-then-publish crashes leave an order nobody downstream hears about — billing never charges, silently and permanently. Publish-then-DB crashes leave a phantom event for an order that never committed. Retrying either half creates duplicates. There is no ordering of two independent writes that is safe, which is the point most candidates miss. The outbox pattern turns two writes into one: in the same transaction that inserts the order, insert a row into an outbox table containing the event payload. One transaction, one storage system, atomic by construction. A separate relay then reads unpublished outbox rows and publishes them, marking them sent — or change-data-capture (Debezium) tails the database replication log and publishes from there, which avoids polling and cannot miss rows. The relay can crash after publishing and before marking, so events can be published twice: at-least-once, again, which is exactly why consumers are idempotent. Cost to acknowledge: added latency (the event lands after the relay picks it up, typically sub-second) and one more component to operate.',
      isCaseBased: false,
    },
    {
      question: 'When would you NOT use a queue? Talk me out of one.',
      answer:
        'Four cases. Synchronous read paths: "load my profile" must return data now, so there is nothing to defer — a queue only adds latency and a dependency. Anything needing an immediate answer: fraud checks, inventory reservation, payment authorization at checkout must resolve before you respond, or you are promising something you cannot verify. Anything needing atomicity across services: queues give eventual consistency, not all-or-nothing; if you truly need transactional semantics across boundaries, that is a saga with explicit compensating actions or a single-database design, and pretending a queue provides it is how you get orphaned state. And low volume with a reliable direct call: two services at 10 requests per second do not need a broker, an on-call rotation, and a new class of failure mode — the operational cost exceeds the benefit. The general framing: event-driven buys loose coupling and independent scaling at the price of eventual consistency and a flow nobody can see end to end; request-driven buys an immediate answer and one stack trace at the price of coupling and multiplied availability. Most real systems are both — synchronous for what the user must see confirmed, asynchronous for everything else.',
      isCaseBased: false,
    },
    {
      question: 'Case: an interviewer says "just add more consumers" when your queue is backing up. When is that wrong, and what do you say?',
      answer:
        'It is right only when consumers are genuinely the bottleneck and there is parallelism left to claim. Four situations where it does nothing or makes things worse. One: consumers already equal partition count — in Kafka each partition goes to exactly one consumer in a group, so extra consumers sit idle. The fix is more partitions, and I would flag that repartitioning changes key-to-partition mapping and thus per-key ordering across the change. Two: the bottleneck is downstream, not in the consumer — if handlers are blocked on a database at 100% CPU or a third-party API rate limit, more consumers just add more concurrent pressure on the thing that is already failing, and can tip it over. Three: lag is concentrated in one partition, which means a hot key or a poison message; more consumers cannot help a single-consumer partition. Four: the arrival rate is permanently above any sane consumer count, in which case the answer is shedding load or fixing the producer, not scaling forever. What I would say: "Let me check whether lag is uniform across partitions and whether handler latency or arrival rate changed — that tells us if adding consumers is even the right lever. And whatever we add, recovery runs at the surplus over baseline, not at full drain rate, so let me size it for how fast we need the backlog gone."',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'The four wins a queue buys', back: 'Decoupling (deploy/scale/fail independently), buffering (absorb spikes — trade latency for survival), asynchrony (202 now, work later), retries + durability (redeliver instead of lose).' },
    { front: 'The four costs of going async', back: 'Eventual consistency, harder debugging (work happens elsewhere, later), ordering complications, and one more system to operate and page on.' },
    { front: 'Queue vs log — the one structural difference', back: 'Queue (RabbitMQ/SQS): delete-on-ack, competing consumers, one message → one worker. Log (Kafka): retained and ordered, each consumer group has its own offset → many readers + replay.' },
    { front: 'Kafka partition — why it matters twice', back: 'It is the unit of PARALLELISM and the unit of ORDERING. Order holds only within a partition, and hash(key) picks it. Within a group one partition → exactly one consumer, so partition count is a hard parallelism ceiling (consumers > partitions = idle consumers).' },
    { front: 'Commit order = delivery semantic', back: 'Commit then process = at-most-once (crash loses it). Process then commit = at-least-once (crash redelivers it) — the practical default.' },
    { front: 'What Kafka "exactly-once" really is', back: 'Idempotent producers + transactional writes committing messages and offsets together WITHIN Kafka. Not end-to-end: any external write (DB, email, Stripe) can still happen twice. Therefore consumers must be idempotent.' },
    { front: 'Ordering: total vs per-key', back: 'Total order = one partition = one consumer = no parallelism. Per-key order is the real requirement: partition by entity id (order_id, user_id). Watch for hot keys.' },
    { front: 'Backpressure — the three moves', back: 'When producers outrun consumers: slow the producer, shed load (429/503), or drop. A queue defers a capacity problem, it never creates capacity.' },
    { front: 'Consumer lag + DLQ', back: 'Lag = offset distance from the newest message; divide by throughput for SECONDS of backlog — alert on the rising trend. DLQ = park a message after N failures and commit past it, so one poison message stops blocking its partition.' },
    { front: 'Outbox pattern (dual-write fix)', back: 'Insert the event into an outbox table in the SAME DB transaction as the business write; a relay (or CDC) publishes it later. Two writes become one atomic write. The relay can republish → at-least-once again.' },
  ],
  mindmapMarkdown: `- Message Queues: Decoupling, Backpressure & Kafka
  - Four wins
    - Decoupling: deploy/scale/fail independently
    - Buffering: absorb spikes — latency for survival
    - Asynchrony: 202 now, slow work later
    - Retries + durability: redeliver, not lose
  - The bill
    - Eventual consistency, harder debugging
    - Ordering complications, one more system to run
  - Queue vs log
    - Queue: delete-on-ack, competing consumers, run once
    - Log: retained + per-group offsets → fan-out, REPLAY
  - Kafka model
    - Partition = parallelism AND ordering unit
    - Group: 1 partition → 1 consumer, extras idle
    - Offsets: commit AFTER processing
    - Retention by time or size, not consumption
    - Replication factor + ISR, acks=all
  - Delivery semantics
    - At-most-once / at-least-once (default) / exactly-once
    - EOS = idempotent producer + txn, inside Kafka only
    - Consumers MUST be idempotent (see resilience)
  - Ordering
    - Total order = 1 partition = no parallelism
    - Per-key: partition by entity id; hot keys melt one
  - Backpressure
    - Depth → latency → disk → refused writes
    - Slow the producer / shed load / drop
    - Consumer lag in SECONDS = the alert metric
    - Recovery runs on the surplus, not the drain rate
  - Failure modes
    - Poison message blocks a whole partition
    - Retry storm; DLQ escape hatch + alert on its depth
  - Patterns
    - Work queue, pub/sub fan-out, request-reply
    - Outbox: one txn + relay (dual-write fix)
  - Event-driven vs request-driven
    - Loose coupling + eventual vs answer now + coupled
    - NOT for sync reads, immediate answers, low volume
    - Cross-service atomicity → saga, not a queue`,
}

export default m
