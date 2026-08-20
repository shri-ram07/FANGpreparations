import type { Module } from '../types'

const m: Module = {
  id: 'dbms-l3-query-execution',
  subjectId: 'dbms',
  level: 3,
  title: 'Inside the Engine: Plans, Pages, Buffer Pool & WAL',
  whyItMatters:
    'EXPLAIN is the line between "writes SQL" and "understands databases" — and senior interviews live on that line. "Query was fast yesterday, slow today: debug it" is a stock question, and the answer runs through plans, statistics, pages, the buffer pool, and WAL. This module gives you the whole journey of one query, so every internals question lands on ground you have already walked.',
  estMinutes: 45,
  sections: [
    {
      type: 'intuition',
      title: 'Your SQL is a wish, not a program',
      md: `You type a destination into a GPS. You do NOT type the turns. The database works the same way — SQL says *what* you want, never *how* to get it.

- The **parser** checks grammar and builds a **syntax tree** — "is this even valid SQL, and which tables/columns does it name?"
- The **optimizer** (planner) is the GPS: it generates several possible routes — scan the whole table vs use an index, which table to join first, which join algorithm — and estimates a **cost** for each.
- Cost estimates come from **statistics** the database keeps about your data (row counts, value distributions). Cheapest estimated plan wins.
- The **executor** then drives the chosen route and produces rows.
- Everything in this module hangs off one sentence: **the database picks a plan by estimated cost, and executes it against pages of data cached in memory.**`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'The journey of one query',
        notice: 'One SELECT, four stages. Each stage consumes the previous artifact and produces the next.',
        leftLabel: 'stage',
        rightLabel: 'artifact',
        frames: [
          {
            note: 'PARSE: the SQL string becomes a syntax tree. Grammar checked, table and column names resolved. No data touched yet — a typo dies here, cheaply.',
            stack: [{ name: 'parser', to: 'tree' }],
            heap: [
              { id: 'sql', value: 'SELECT … WHERE …', label: 'SQL text (your wish)' },
              { id: 'tree', value: 'syntax tree', label: 'validated structure' },
            ],
          },
          {
            note: 'PLAN: the optimizer generates candidate plans and prices each one using table STATISTICS. Same result, wildly different costs — this is where fast vs slow is decided.',
            stack: [
              { name: 'optimizer', to: 'p1' },
              { name: 'stats: ~1M rows', to: 'p2' },
            ],
            heap: [
              { id: 'p1', value: 'seq scan + hash join', label: 'candidate A — cost 2400' },
              { id: 'p2', value: 'index scan + nested loop', label: 'candidate B — cost 16' },
            ],
          },
          {
            note: 'CHOOSE: cheapest estimated plan wins. Candidate A is discarded. Note the word ESTIMATED — if the statistics are stale, the "cheapest" plan can be a lie.',
            stack: [{ name: 'chosen plan', to: 'p2' }],
            heap: [
              { id: 'p1', value: 'cost 2400', label: 'discarded', freed: true },
              { id: 'p2', value: 'cost 16', label: 'winner: index + nested loop' },
            ],
          },
          {
            note: 'EXECUTE: the plan is a tree of iterators. The top node PULLS a row from its child, which pulls from its child… down to the scan touching actual pages. Rows stream up one at a time.',
            stack: [{ name: 'executor', to: 'rows' }],
            heap: [
              { id: 'p2', value: 'iterator tree', label: 'pull-based pipeline' },
              { id: 'rows', value: '3 rows', label: 'result, streamed up' },
            ],
          },
        ],
      },
    },
    {
      type: 'note',
      md: `The executor detail worth one breath: plans run as **pull-based iterators** (the *volcano model*). Every plan node implements one method — \`next()\`, "give me one row" — and calls \`next()\` on its children to get input. Rows stream through the tree one at a time, so a \`LIMIT 10\` can stop the whole pipeline after 10 pulls without ever computing the full result. That is why LIMIT is genuinely cheap, not cosmetic.`,
    },
    {
      type: 'intuition',
      title: 'Reading EXPLAIN: the three things that matter',
      md: `\`EXPLAIN\` prints the chosen plan; \`EXPLAIN ANALYZE\` also runs the query and prints what actually happened. Read a plan in this order:

- **Scan type** — \`Seq Scan\` (read every row) vs \`Index Scan\` (jump via the B+ tree). A Seq Scan on a huge table with a selective WHERE is the classic missing-index smell.
- **Rows: estimate vs actual** — the plan says \`rows=3\`, ANALYZE says \`actual rows=3\`. When these diverge by 100× the optimizer was flying blind, and every choice downstream (join order, algorithm) is suspect.
- **Join strategy** — Nested Loop, Hash Join, or Merge Join, and which table is the outer/driving side.
- Ignore the cost numbers' absolute values — they are unitless estimates, only useful for comparing plans against each other.`,
    },
    {
      type: 'code',
      lang: 'sql',
      title: 'A Postgres-style EXPLAIN, annotated',
      code: `-- Plan for: one customer's orders, joined to the customer's name.
EXPLAIN ANALYZE
SELECT c.name, o.total
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.customer_id = 42;

-- Nested Loop  (cost=0.57..16.63 rows=3 width=36)
--              (actual time=0.031..0.052 rows=3 loops=1)
--   -> Index Scan using idx_orders_customer on orders o
--        (cost=0.29..8.32 rows=3 width=12) (actual rows=3 loops=1)
--        Index Cond: (customer_id = 42)
--   -> Index Scan using customers_pkey on customers c
--        (cost=0.28..2.77 rows=1 width=32) (actual rows=1 loops=3)
--        Index Cond: (id = o.customer_id)`,
      annotations: {
        2: 'EXPLAIN shows the plan without running it. EXPLAIN ANALYZE runs the query too — never point it at a DELETE in prod unless you mean it.',
        8: 'Read plans top-down for strategy, inner-to-outer for data flow. Top node: Nested Loop join. cost=startup..total, in unitless "page fetch" currency.',
        10: 'Scan type check: Index Scan, not Seq Scan — the WHERE on customer_id is being answered by the B+ tree, not by reading all of orders.',
        11: 'The health check: rows=3 estimated, actual rows=3. Estimate ≈ actual means statistics are fresh and the optimizer chose with good information.',
        14: 'loops=3: this inner index scan re-ran once per outer row — the literal definition of a nested loop join. actual rows is PER loop.',
      },
    },
    {
      type: 'code',
      lang: 'sql',
      title: 'SQLite: EXPLAIN QUERY PLAN, before and after an index',
      code: `EXPLAIN QUERY PLAN
SELECT * FROM orders WHERE customer_id = 42;
-- QUERY PLAN
-- \`--SCAN orders                <- read EVERY row to test the WHERE

CREATE INDEX idx_orders_customer ON orders(customer_id);

EXPLAIN QUERY PLAN
SELECT * FROM orders WHERE customer_id = 42;
-- QUERY PLAN
-- \`--SEARCH orders USING INDEX idx_orders_customer (customer_id=?)`,
      annotations: {
        4: 'SCAN = sequential scan, the whole table. Fine at 1,000 rows, a disaster at 10 million.',
        6: 'One index on the filtered column is the entire fix here.',
        11: 'SEARCH = jump straight to matching rows via the index. SCAN → SEARCH is the before/after you are always trying to produce.',
      },
    },
    {
      type: 'note',
      md: `Run that pair yourself — [Open the SQL playground](/playground/sql), pick the ecommerce database, and prefix any query with \`EXPLAIN QUERY PLAN\`. Watching SCAN flip to SEARCH after your own CREATE INDEX beats any paragraph about it.`,
    },
    {
      type: 'intuition',
      title: 'Join algorithms: the honest three-item tour',
      md: `Every JOIN in every database runs as one of three algorithms. The optimizer picks per query, based on sizes, indexes, and sort order.

- **Nested loop** — for each row of the outer table, probe the inner table. Naive version is O(n·m); with an index on the inner join key each probe is O(log m). Picked when the outer side is *small* and the inner side is *indexed* — the plan above did exactly this, 3 outer rows × 1 index probe each.
- **Hash join** — build a hash table on the smaller table's join key (O(m)), then stream the bigger table and probe (O(n)). Picked for *large tables with equality joins and no helpful index*. Needs memory for the hash table; only works for \`=\` joins.
- **Merge join** — if both inputs are sorted on the join key (or an index provides that order), zip them together in one pass, like the merge step of merge sort. Picked when *sort order is already free*; also handles range joins.
- Interview one-liner: small-driving-side + index → nested loop; big + equality + no index → hash; both sides pre-sorted → merge.`,
    },
    {
      type: 'intuition',
      title: 'Rows live in pages — the unit of I/O',
      md: `A library does not lend you one sentence. It lends you the whole book. Disks are the same: the database never reads one row — it reads the **page** the row lives in.

- A **page** (block) is a fixed-size chunk, typically **4–16 KB** (Postgres 8 KB, MySQL/InnoDB 16 KB). It is the atomic unit of disk I/O.
- A table's rows are packed into pages, and the pages form a **heap file** — "heap" as in *unordered pile*, nothing to do with the priority-queue heap.
- So "read one 100-byte row" = "read one 8 KB page". Cost is counted in **pages touched**, not rows touched — this is the currency EXPLAIN's cost numbers are denominated in.
- It also means neighbors ride free: once a page is in memory, every other row on it is free to read. Sequential scans exploit this; random index hops fight it.`,
    },
    {
      type: 'intuition',
      title: 'The buffer pool: why the second run is fast',
      md: `Disk is ~100,000× slower than RAM. The database's survival strategy is the **buffer pool**: a big slab of memory holding copies of recently used pages.

- Every read goes through it: page already in the pool → **hit**, served from RAM. Not there → **miss**, read from disk *and keep it in the pool*.
- The pool is finite, so something must be evicted to make room — an **LRU-ish** policy (least recently used, with tweaks so one big scan cannot flush everything hot).
- This is THE reason a repeated query gets fast: run one pays disk misses, run two finds the pages already resident.
- It is also why benchmarks lie: a "cold cache" query and a "warm cache" query are different animals. Time both.
- Writes go through it too: a modified page (a **dirty page**) is changed *in memory* and flushed to disk later — which raises an obvious terrifying question: what if we crash first?`,
    },
    { type: 'visual', component: 'CacheSimulator', props: {} },
    {
      type: 'note',
      md: `The buffer pool IS this LRU — caching disk pages instead of letters. Capacity = pool size in pages; each key = a page id; a miss = one real disk read. Step it and watch which page gets evicted when the pool is full: that eviction is the moment a future query silently gets slow again.`,
    },
    {
      type: 'intuition',
      title: 'WAL: durability without paying for it',
      md: `A shopkeeper scribbles every sale in a ledger the second it happens, and restocks the shelves when there is a quiet moment. If the shop burns down, the ledger rebuilds the truth. That ledger is the **write-ahead log**.

- Rule: **log the change BEFORE the data page** — a small record ("row 42: total 100 → 250") is appended to the WAL and flushed to disk at COMMIT.
- Appending to a log is a **sequential write** — the cheapest thing a disk can do. Rewriting the actual data page is a random write — expensive, and there may be many dirty pages per transaction.
- So COMMIT only waits for the tiny sequential log flush. The dirty pages stay in the buffer pool and get written whenever convenient.
- Crash? On restart, **recovery replays the log**: every committed change recorded in the WAL is re-applied to the pages. Nothing committed is lost.
- This is the answer to "how is it durable without writing the whole page synchronously?": durability lives in the log, not in the pages. The pages are just a cache of the log's truth.`,
    },
    {
      type: 'note',
      md: `**Checkpoint**: periodically the database flushes all dirty pages to disk and marks a point in the WAL meaning "everything before here is safely in the data files". Recovery then replays only the log *after* the last checkpoint — bounding restart time — and older log segments can be recycled. The tradeoff: frequent checkpoints = fast recovery but constant write pressure; rare checkpoints = smooth running but a long replay after a crash.`,
    },
    {
      type: 'note',
      md: `Last piece, one line: the optimizer's cost estimates come from **statistics** (row counts, distinct values, value histograms) collected by \`ANALYZE\` — and **stale stats produce bad plans**. A table that grew 100× since the last ANALYZE still looks tiny to the planner, which will happily nested-loop a million rows. This is the root cause behind the classic case question coming up in the interview section.`,
    },
  ],
  quiz: [
    {
      question: 'The same SELECT takes 4s on first run, 80ms on second run. Nothing else changed. Why?',
      options: [
        {
          text: 'The buffer pool: run one pulled the needed pages from disk into memory; run two found them already resident',
          explanation: 'Correct. Same plan, same rows — the difference is disk misses vs RAM hits. This is the buffer pool doing its one job.',
        },
        {
          text: 'The database memorized the result of the query',
          explanation: 'Most engines (including Postgres) do not cache query results — they cache PAGES. The second run re-executes the full plan, just against RAM.',
        },
        {
          text: 'The optimizer found a better plan the second time',
          explanation: 'Plans are chosen fresh from statistics, not improved by repetition. Same query + same stats = same plan both runs.',
        },
        {
          text: 'An index was built automatically during the first run',
          explanation: 'No mainstream engine builds indexes on its own mid-query. Indexes only exist when someone creates them.',
        },
      ],
      correct: 0,
    },
    {
      question: 'EXPLAIN ANALYZE shows an estimate of rows=200000 but actual rows=12. What is your first suspicion?',
      options: [
        {
          text: 'The index is corrupted',
          explanation: 'Corruption causes errors or wrong results, not wrong ESTIMATES. Estimates come from statistics, not from the index.',
        },
        {
          text: 'Stale statistics — run ANALYZE so the planner sees current data',
          explanation: 'Correct. A 10,000× estimate miss means the planner priced its plans with outdated numbers. Every downstream choice (join order, algorithm) is now suspect.',
        },
        {
          text: 'The buffer pool is too small',
          explanation: 'Pool size affects TIME (hits vs misses), never the row estimates printed in the plan.',
        },
        {
          text: 'WAL is disabled',
          explanation: 'WAL is about durability of writes — it has nothing to do with row estimation.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Two large tables, equality join on an un-indexed column. Which algorithm does the optimizer most likely pick?',
      options: [
        {
          text: 'Nested loop',
          explanation: 'Without an index, each outer row forces a full scan of the inner table — O(n·m). The optimizer avoids this shape at large sizes.',
        },
        {
          text: 'Hash join',
          explanation: 'Correct. Build a hash table on the smaller side, stream the bigger side and probe — one pass over each table, no index needed, equality is exactly what hashing handles.',
        },
        {
          text: 'Merge join',
          explanation: 'Merge needs both inputs sorted on the join key. With no index and no order, sorting both large tables first usually costs more than hashing one.',
        },
        {
          text: 'Cross join',
          explanation: 'A cross join is a RESULT shape (every pair), not a join algorithm the optimizer picks for an equality join.',
        },
      ],
      correct: 1,
    },
    {
      question: 'A row is 100 bytes; the page size is 8 KB. What does reading that one row from disk actually cost?',
      options: [
        { text: '100 bytes of I/O', explanation: 'Disks and databases do not do 100-byte reads. The page is the unit of I/O.' },
        {
          text: 'One 8 KB page read — the page is the atomic unit of I/O',
          explanation: 'Correct. "Read one row" = "read the page it lives in". This is why costs are counted in pages touched, and why row neighbors ride free once a page is in memory.',
        },
        { text: 'The whole table', explanation: 'Only a sequential scan reads every page. A targeted read fetches just the one page holding the row.' },
        { text: 'Nothing — rows are read from the WAL', explanation: 'The WAL is for recovering writes, not for serving reads. Reads come from pages via the buffer pool.' },
      ],
      correct: 1,
    },
    {
      question: 'Why does write-ahead logging make COMMIT both durable and fast?',
      options: [
        {
          text: 'The log flush is a small sequential append; dirty data pages can be written lazily because the log can replay them after a crash',
          explanation: 'Correct. Durability lives in the log. COMMIT waits only for the cheap sequential write; the expensive random page writes happen later, off the critical path.',
        },
        {
          text: 'WAL skips the disk entirely, keeping changes in RAM',
          explanation: 'Then a crash would lose committed data. The log IS flushed to disk at commit — that flush is the durability.',
        },
        {
          text: 'Pages are written twice, so one copy always survives',
          explanation: 'Writing pages twice would be slower, not faster. WAL wins by writing something much SMALLER (the change record) sequentially.',
        },
        {
          text: 'The log stores the query text so it can be re-run later',
          explanation: 'The WAL records data CHANGES, not SQL. Re-running queries would not be deterministic (think NOW() or random()).',
        },
      ],
      correct: 0,
    },
    {
      question: 'What does the optimizer actually use to decide between candidate plans?',
      options: [
        { text: 'Timings from previous runs of the same query', explanation: 'Classic engines do not learn from history (that is an active research area). Each plan is priced fresh.' },
        {
          text: 'Cost estimates computed from table statistics — row counts, distinct values, value distributions',
          explanation: 'Correct. ANALYZE gathers the stats; the planner prices each candidate plan with them and takes the cheapest ESTIMATE. Garbage stats in, garbage plan out.',
        },
        { text: 'It reads the data first to check which plan is faster', explanation: 'Reading the data IS the expensive part — planning must be cheap and happen before any data is touched.' },
        { text: 'The order tables are written in the FROM clause', explanation: 'The optimizer is free to reorder joins; FROM order is a suggestion at best.' },
      ],
      correct: 1,
    },
    {
      question: 'When is a nested loop join the RIGHT choice, not a failure?',
      options: [
        {
          text: 'Small outer side, and an index on the inner table\'s join key',
          explanation: 'Correct. 3 outer rows × O(log m) index probes beats building a hash table over anything. This is the most common join in OLTP plans.',
        },
        { text: 'Never — hash join always wins', explanation: 'Hash join pays to build the hash table. For a handful of outer rows with an indexed inner side, that build cost is pure waste.' },
        { text: 'When both tables are already sorted on the join key', explanation: 'Already-sorted inputs are the merge join\'s home turf, not the nested loop\'s.' },
      ],
      correct: 0,
    },
    {
      question: 'What does a checkpoint do?',
      options: [
        {
          text: 'Flushes dirty pages to disk and marks a WAL position, so crash recovery replays only the log written after it',
          explanation: 'Correct. Checkpoints bound recovery time and let old log segments be recycled. Frequency is a tradeoff: recover fast vs run smooth.',
        },
        { text: 'Takes a full backup of the database', explanation: 'Backups are a separate operation. A checkpoint only synchronizes the data files with what the WAL already promised.' },
        { text: 'Verifies all indexes for corruption', explanation: 'No — checkpoints move dirty pages, they do not validate structures.' },
        { text: 'Blocks all queries until every transaction commits', explanation: 'Checkpoints run alongside normal traffic; stopping the world would defeat the whole lazy-write design.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Walk me through everything that happens between typing a SELECT and getting the first row back.',
      answer:
        'Four stages. (1) Parse: the SQL string becomes a syntax tree — grammar checked, tables/columns resolved against the catalog. (2) Plan: the optimizer generates candidate plans (scan vs index per table, join order, join algorithm per join) and prices each using statistics; cheapest estimate wins. (3) Execute: the plan runs as a tree of pull-based iterators — each node calls next() on its children, rows stream up one at a time (which is why LIMIT can short-circuit the pipeline). (4) I/O underneath: scans read fixed-size pages through the buffer pool — RAM hit if the page is hot, disk miss otherwise. Bonus sentence that signals depth: the plan is chosen from ESTIMATES, so the whole pipeline is only as smart as its statistics.',
      isCaseBased: false,
    },
    {
      question: 'Case: a query that ran in 200ms every day for months suddenly takes 90 seconds today. No code deploy, no schema change. Walk me through your debugging.',
      answer:
        'This is a plan regression hunt. (1) Confirm the plan changed: run EXPLAIN ANALYZE now, compare against any saved plan or reconstruct what it must have been (index scan + nested loop for a 200ms query). (2) Look for the estimate-vs-actual gap: rows=500 estimated, actual rows=2,000,000 means the planner priced plans with stale statistics — a big data load or a table that crossed a size threshold overnight will do it. Fix: ANALYZE the table, re-check the plan. (3) If stats are fresh, check what else feeds the cost model: an index dropped or bloated, a parameter value with wildly different selectivity than usual (fast for customer 42, slow for the customer with half the rows), or autovacuum/analyze falling behind. (4) Warm-vs-cold: a restart empties the buffer pool, turning RAM hits into disk misses with the SAME plan — the plan diff tells you which world you are in. The structure interviewers want: plan changed vs plan same-but-slower, and statistics are the prime suspect for the first.',
      isCaseBased: true,
    },
    {
      question: 'Case: after a nightly server restart, the 9am dashboard takes 30s to load, then is instant for everyone all day. Explain, and what would you do about it?',
      answer:
        'The restart emptied the buffer pool. The 9am query pays real disk I/O for every page it touches; those pages then sit in the pool and everyone after rides RAM hits. Same query, same plan — only the hit rate differs. Options: (1) accept it — one slow query a day may not be worth engineering; (2) pre-warm the cache after restart by running the dashboard queries (or pg_prewarm on the hot tables) before users arrive; (3) reduce the pages the query needs at all — a covering index or pre-aggregated table shrinks the working set so even the cold run is fast; (4) avoid the restart. Tradeoff worth saying: pre-warming treats the symptom and costs startup time; shrinking the working set fixes cold AND warm runs but costs storage and write overhead.',
      isCaseBased: true,
    },
    {
      question: 'Case: a teammate added the perfect index for a slow query, but EXPLAIN still shows a Seq Scan. Walk through the possible reasons.',
      answer:
        'In rough order of likelihood: (1) Stale statistics — the planner does not know the filter is selective, so it prices the index scan as expensive; ANALYZE first, always. (2) The predicate defeats the index: a function or cast on the column (WHERE lower(email) = …, or comparing a text column to a number) means the raw-column index cannot serve it — fix the query or build an expression index. (3) The optimizer is RIGHT: if the filter matches a big fraction of the table, seq scan genuinely wins — index reads are random I/O plus a heap lookup per row, and sequential reads of whole pages beat that past roughly 5–10% selectivity. (4) Small table — everything fits in a couple of pages, scan is cheapest no matter what. (5) Wrong column order in a composite index (the query filters on the second column only). The takeaway sentence: an ignored index is a message from the cost model — read the message before overriding it.',
      isCaseBased: true,
    },
    {
      question: 'Compare nested loop, hash join, and merge join. When does the optimizer pick each?',
      answer:
        'Nested loop: for each outer row, probe the inner side — O(n·m) naive, O(n log m) with an index on the inner join key. Picked when the outer side is small and the inner side is indexed; the workhorse of OLTP point queries. Hash join: build a hash table on the smaller input (O(m) and memory), stream the larger and probe (O(n)). Picked for large inputs with equality predicates and no useful index; useless for range joins. Merge join: both inputs sorted on the join key (natively or via index order), zip in one pass — picked when order comes free, and it handles ranges. The tradeoff summary: nested loop scales with outer×probe cost, hash pays memory for one-pass speed, merge pays sorting unless the sort is free.',
      isCaseBased: false,
    },
    {
      question: 'Durability says committed data survives a crash. Why does that NOT require writing data pages to disk at commit time?',
      answer:
        'Because the write-ahead log carries durability instead. At commit, the engine flushes a small log record of the change — a sequential append, the cheapest disk operation. The modified data pages stay dirty in the buffer pool and are written lazily. After a crash, recovery replays the WAL from the last checkpoint: every committed change is re-applied to the pages, so nothing promised is lost. Writing pages synchronously would mean many random writes per transaction; the WAL converts that to one small sequential write on the critical path. One-liner: the pages are a cache of the log\'s truth, not the other way round.',
      isCaseBased: false,
    },
    {
      question: 'You get an EXPLAIN ANALYZE output. What are the first three things you check?',
      answer:
        '(1) Scan types: any Seq Scan on a large table under a selective filter is the first suspect — missing or unusable index. (2) Estimated rows vs actual rows at each node: a large divergence means stale or insufficient statistics, and invalidates every choice the planner made downstream. (3) Join strategy and order: which algorithm, and which side is driving — a nested loop with a million-row outer side, or a hash join whose hash table spills past memory, is the structural problem. Everything else — costs, widths, timing breakdowns — is detail you read after those three. Costs are unitless: only compare them between plans, never across databases or to milliseconds.',
      isCaseBased: false,
    },
    {
      question: 'Why can a sequential scan legitimately beat an index scan? Most people assume the index always wins.',
      answer:
        'An index scan does random I/O: for each match, hop the B+ tree, then fetch the row\'s heap page — potentially one page read per row. A sequential scan reads whole pages in order — the access pattern disks and read-ahead love — and gets every row on each page for free. If the filter matches, say, 30% of the table, the index path touches most pages anyway, in random order, plus tree overhead. Past a selectivity threshold (rule of thumb: more than ~5–10% of rows), the scan wins. The optimizer knows this, which is exactly why it sometimes ignores your index — and why "add an index" is not a universal answer.',
      isCaseBased: false,
    },
    {
      question: 'What is the volcano (iterator) model, and what is the practical payoff of being pull-based?',
      answer:
        'Every plan node — scan, filter, join, sort, limit — implements one interface: next(), returning one row or "done". Parents pull from children; the root pulls the whole pipeline. Payoffs: (1) composability — any node stacks on any other, so the optimizer assembles arbitrary plans from a small vocabulary; (2) streaming — rows flow through without materializing intermediate results (except at pipeline breakers like sort and hash build, which must consume all input first); (3) early termination — LIMIT 10 stops after 10 pulls, doing a fraction of the work. Worth knowing the modern footnote: per-row next() calls have interpretive overhead, so newer engines batch rows (vectorized execution) or compile plans to machine code — same tree, faster plumbing.',
      isCaseBased: false,
    },
    {
      question: 'What is a checkpoint, and what goes wrong if checkpoints are too frequent or too rare?',
      answer:
        'A checkpoint flushes all dirty pages from the buffer pool to the data files and records a WAL position meaning "everything before this is durable in the data files". Crash recovery replays only the log after the last checkpoint, and older WAL segments become recyclable. Too frequent: constant page-flush pressure competes with foreground I/O, and the same hot page gets written over and over instead of absorbing many changes in memory — smooth recovery, rough runtime. Too rare: WAL grows large and recovery must replay a huge log — smooth runtime, long outage after a crash. Real engines spread checkpoint writes over time to soften the spike; the knob is a recovery-time vs runtime-overhead dial, and saying it as a dial is the answer.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'The journey of a query, four words per stage', back: 'Parser: SQL → syntax tree. Optimizer: candidates priced by statistics, cheapest estimate wins. Executor: pull-based iterator tree. I/O: pages via the buffer pool.' },
    { front: 'Cost-based optimizer, one sentence', back: 'Generates candidate plans (scan vs index, join order, join algorithm) and picks the cheapest ESTIMATED cost — estimates computed from statistics, so stale stats = bad plans.' },
    { front: 'The three join algorithms + when each', back: 'Nested loop: small outer + indexed inner. Hash join: big tables, equality, no index — build small side, probe with big. Merge join: both inputs already sorted (or index-ordered).' },
    { front: 'Page', back: 'Fixed-size block (~4–16 KB; PG 8 KB, InnoDB 16 KB) — the atomic unit of disk I/O. "Read one row" = read its whole page. Costs are counted in pages touched.' },
    { front: 'Heap file', back: 'A table\'s pages as an unordered pile — rows go wherever there is room. No relation to the priority-queue heap.' },
    { front: 'Buffer pool', back: 'In-memory cache of recently used pages with LRU-ish eviction. Hit = RAM, miss = disk. THE reason a repeated query is fast, and why cold-vs-warm benchmarks differ.' },
    { front: 'WAL rule + why it is fast', back: 'Log the change BEFORE the data page; flush only the log at COMMIT. Sequential append is cheap; dirty pages flush lazily. Recovery replays the log — durability lives in the log.' },
    { front: 'Checkpoint', back: 'Flush dirty pages + mark a WAL position; recovery replays only the log after it. Frequent = fast recovery, constant write pressure. Rare = smooth runtime, long replay.' },
    { front: 'Reading EXPLAIN: the three checks', back: '(1) Scan type — Seq Scan on big filtered table = smell. (2) Rows estimate vs actual — big gap = stale stats. (3) Join strategy + driving side.' },
    { front: 'EXPLAIN vs EXPLAIN ANALYZE', back: 'EXPLAIN: show the chosen plan, run nothing. EXPLAIN ANALYZE: run the query, show estimates AND actuals — the est/actual gap is the diagnostic gold.' },
  ],
  mindmapMarkdown: `- Inside the Engine: Plans, Pages, Buffer Pool & WAL
  - The journey
    - parser → syntax tree
    - optimizer → cheapest estimated plan
    - executor → pull-based iterators (volcano)
    - LIMIT short-circuits the pull pipeline
  - Optimizer choices
    - scan vs index
    - join order
    - join algorithm
    - priced from statistics (ANALYZE)
    - stale stats → bad plans
  - Reading EXPLAIN
    - scan type: Seq vs Index
    - rows: estimate vs actual
    - join strategy + driving side
    - SQLite: SCAN vs SEARCH
  - Join algorithms
    - nested loop: small outer + indexed inner
    - hash join: big + equality, no index
    - merge join: inputs already sorted
  - Storage
    - page ~4–16 KB = unit of I/O
    - heap file = unordered pile of pages
    - one row read = one page read
  - Buffer pool
    - cache of hot pages, LRU-ish
    - hit = RAM, miss = disk
    - why run two is fast
    - dirty pages flushed lazily
  - WAL
    - log BEFORE page, sequential append
    - COMMIT waits only for log flush
    - recovery replays the log
    - checkpoint bounds replay, recycles log`,
}

export default m
