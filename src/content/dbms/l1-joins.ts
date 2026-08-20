import type { Module } from '../types'

const m: Module = {
  id: 'dbms-l1-joins',
  subjectId: 'dbms',
  level: 1,
  title: 'Joins: Every Kind, Row by Row',
  whyItMatters:
    'No SQL screen skips joins — and none of them ask for definitions. They put two small tables on the screen and ask what a query returns, row by row. This module builds that prediction reflex, and drills the bug every data team has shipped at least once: a WHERE clause that silently turned a LEFT JOIN into an INNER and made customers vanish from a report.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'A join is a loop, not a Venn diagram',
      md: `Print the users table on one stack of cards and the cities table on another. Pick up each user card, walk the city stack, and every time \`user.city_id = city.id\` is true, staple the two cards together and drop the pair in the output tray.

- That is the entire mystery: a join **pairs rows from two tables wherever a condition is true**.
- Output rows are *wider* — left columns glued to right columns.
- The ON condition is just a boolean test on each candidate pair. Any test works; \`=\` is merely the common one.
- The join *types* answer one follow-up only: **what happens to rows that never matched?** Drop them (INNER), keep them NULL-padded (LEFT/RIGHT/FULL), or skip the test entirely (CROSS).
- Engines execute this with hash joins and merge joins for speed, but the *meaning* is always this nested loop. Predict output with the loop, every time.`,
    },
    { type: 'visual', component: 'JoinVisualizer', props: {} },
    {
      type: 'note',
      md: `Every query in this module runs as-is. [Open the SQL playground](/playground/sql), paste the CREATE/INSERT block below once, and follow along — the *employees* database used in the self-join section is already seeded there. The two tables are the exact tables in the visual above, planted traps included: Dev's NULL city_id, Eli's city_id 9 that points nowhere, and Agra, which no user points at.`,
    },
    {
      type: 'code',
      lang: 'sql',
      title: 'INNER JOIN: matches only, everything else silently gone',
      code: `CREATE TABLE users  (id INTEGER PRIMARY KEY, name TEXT, city_id INTEGER);
CREATE TABLE cities (id INTEGER PRIMARY KEY, city TEXT);
INSERT INTO users  VALUES (1,'Ana',10),(2,'Ben',20),(3,'Cai',30),(4,'Dev',NULL),(5,'Eli',9);
INSERT INTO cities VALUES (10,'Pune'),(20,'Delhi'),(30,'Goa'),(40,'Agra');

SELECT u.name, c.city
FROM users u
INNER JOIN cities c ON u.city_id = c.id;
-- Ana|Pune   Ben|Delhi   Cai|Goa               (3 rows)
-- gone: Dev (NULL matches nothing), Eli (no city 9), Agra (no user points at it)`,
      annotations: {
        3: 'The planted misses: Dev has NULL, Eli points at a city that does not exist. Watch what each join type does with them.',
        8: 'ON is the pairing test, run per candidate pair. u and c are aliases — short names for the two card stacks.',
        10: 'INNER\'s whole personality: unmatched rows on EITHER side are dropped without a sound. No error, no NULL — just absent.',
      },
    },
    {
      type: 'intuition',
      title: 'LEFT: every left row, plus NULL receipts',
      md: `INNER answers "who matched?" LEFT answers a different question: "show me **everyone** on the left — and the match, *if any*."

- LEFT JOIN = INNER's rows **plus** one NULL-padded row for every left row that matched nothing.
- The NULLs are receipts: *"we looked for Dev's city; there wasn't one."* No data is invented — the right-hand columns are simply NULL.
- Step through LEFT in the visual above: Dev and Eli survive with receipts. Row count 5 — one per user, because each city_id hits at most one city.
- RIGHT JOIN is the same machine driven from the other side: every *cities* row survives, Agra gets the receipt. 4 rows.
- Nobody writes RIGHT in practice: swap the table order and write LEFT. One habit, one mental model, fewer bugs.`,
    },
    {
      type: 'code',
      lang: 'sql',
      title: 'LEFT, RIGHT, and why RIGHT is just LEFT in a mirror',
      code: `SELECT u.name, c.city
FROM users u
LEFT JOIN cities c ON u.city_id = c.id;
-- Ana|Pune  Ben|Delhi  Cai|Goa  Dev|NULL  Eli|NULL   (5 rows)

SELECT u.name, c.city
FROM users u
RIGHT JOIN cities c ON u.city_id = c.id;
-- Ana|Pune  Ben|Delhi  Cai|Goa  NULL|Agra            (4 rows)

-- every RIGHT is just a LEFT with the tables swapped:
SELECT u.name, c.city
FROM cities c
LEFT JOIN users u ON u.city_id = c.id;                -- same 4 rows`,
      annotations: {
        3: 'Same ON as INNER — different policy for failures: keep the left row, pad the city columns with NULL.',
        4: 'Row-count law: with a unique right key, LEFT returns EXACTLY one row per left row — 5 here. Fewer than 5 in a report means something downstream ate rows. Remember that sentence.',
        12: 'Identical result, easier to read: the driving table comes first. This is why RIGHT JOIN barely exists in real codebases.',
      },
    },
    {
      type: 'intuition',
      title: 'FULL OUTER: nobody loses',
      md: `FULL OUTER JOIN keeps the unmatched rows from **both** sides: INNER's matches, plus left-side receipts, plus right-side receipts.

- On our tables: 3 matches + Dev + Eli + Agra = **6 rows**. Flip the visual to FULL and count them.
- Real use: **reconciliation**. Payments export vs orders table, FULL join on order id — NULLs on one side are payments with no order, NULLs on the other are orders never paid. One query, both discrepancy lists.
- Support gap interviewers love: **MySQL has no FULL OUTER JOIN**, and SQLite only added it in 3.39 (2022).
- The portable workaround: a LEFT join already gives matches + left receipts; UNION ALL a second query that fetches *only* the right-side receipts.`,
    },
    {
      type: 'code',
      lang: 'sql',
      title: 'FULL OUTER — native, then the portable UNION workaround',
      code: `SELECT u.name, c.city
FROM users u
FULL OUTER JOIN cities c ON u.city_id = c.id;
-- 3 matches + Dev|NULL + Eli|NULL + NULL|Agra        (6 rows)

-- portable version (MySQL has no FULL; SQLite gained it only in 3.39):
SELECT u.name, c.city
FROM users u
LEFT JOIN cities c ON u.city_id = c.id
UNION ALL
SELECT u.name, c.city
FROM cities c
LEFT JOIN users u ON u.city_id = c.id
WHERE u.id IS NULL;`,
      annotations: {
        3: 'FULL = LEFT\'s output plus RIGHT\'s receipts. The playground\'s SQLite is new enough to run this natively — try both forms and compare.',
        10: 'UNION ALL, not UNION — UNION deduplicates, and that dedupe would silently merge genuinely identical rows from the two halves.',
        14: 'The anti-filter keeps only cities where no user matched. Test a NOT NULL column (the primary key) — then NULL provably means "no match", never "the data happened to be NULL".',
      },
    },
    {
      type: 'note',
      md: `The Venn picture, in words: INNER = the overlap, LEFT = the whole left circle, RIGHT = the whole right circle, FULL = both circles. Fine as a memory aid, bad as an execution model — Venn draws *sets of key values*, so it hides duplicates (one key matching 3 right rows emits 3 rows, not 1) and cannot draw CROSS at all. When predicting output, drop the circles and run the row loop from the visual: **per left row, which right rows pass the test?**`,
    },
    {
      type: 'intuition',
      title: 'CROSS: the cartesian product, and when it is legitimate',
      md: `CROSS JOIN skips the test: every left row pairs with every right row. m × n rows — 5 users × 4 cities = the 20-row wall at the end of the visual.

- Usually it is an accident: a forgotten ON (or a join condition on the wrong column) and a 10k × 10k join tries to emit 100 million rows.
- But it has honest jobs. **Spines**: build all (date × product) pairs, then LEFT join sales onto the spine — days with zero sales still appear in the report instead of vanishing.
- **Grids**: every (size × color) variant of a t-shirt, generated in one line.
- Rule: CROSS is legitimate exactly when you *want* every combination to exist. Otherwise it is a missing ON clause wearing a trench coat.
- Write the keyword \`CROSS JOIN\` when you mean it — it tells reviewers the explosion is intentional.`,
    },
    {
      type: 'intuition',
      title: 'Self join: one table, two roles',
      md: `A self join is not a new kind of join — it is the same table playing two parts, told apart by aliases. The classic: \`employees\` has a \`manager_id\` column pointing back into \`employees\` itself.

- Alias the table twice: \`e\` (acting as "the employee") and \`m\` (acting as "the manager").
- The condition \`e.manager_id = m.id\` pairs each employee row with its manager's row — mechanically identical to users→cities.
- Aliases are mandatory: without them, every column reference is ambiguous.
- The seeded *employees* database has this exact shape, heads-with-no-manager included — [Open the SQL playground](/playground/sql) and run the next block against it.`,
    },
    {
      type: 'code',
      lang: 'sql',
      title: 'The employees–manager self join, plus the classic question',
      code: `SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
-- 15 rows; the four heads (Ananya, Farhan, Jai, Nikhil) get manager = NULL

-- the classic: who out-earns their own manager?
SELECT e.name, e.salary, m.name AS manager
FROM employees e
JOIN employees m ON e.manager_id = m.id
WHERE e.salary > m.salary;
-- Harsh|2750000|Farhan    Mahi|1550000|Jai           (2 rows)`,
      annotations: {
        2: 'Aliases e and m are the entire trick: one physical table, two logical copies. The engine treats them as two independent card stacks.',
        3: 'LEFT, deliberately: heads have manager_id NULL. An INNER here silently deletes all four heads — the vanishing-rows trap in a self-join costume.',
        10: 'WHERE compares two columns of the SAME output row — the pairing already happened in ON. Desk-check in the playground: Harsh 2,750,000 > Farhan 2,600,000; Mahi 1,550,000 > Jai 1,400,000.',
      },
    },
    {
      type: 'intuition',
      title: 'ON vs WHERE — and the trap that loses rows',
      md: `Two clauses, two moments in time. **ON** runs *during* pairing: it decides whether a candidate pair is a match. **WHERE** runs *after* the join: it filters the finished rows.

- For an INNER join the two are interchangeable — a pair killed during pairing or after, same result.
- For a LEFT join they are **not**. A left row failing every ON test still survives, NULL-padded. A row failing WHERE is gone, full stop.
- The trap: put a right-table filter in WHERE after a LEFT join. Every NULL-padded row has NULL in that column, and \`NULL = 'anything'\` is not true — WHERE deletes them all.
- Net effect: your LEFT join silently behaves as INNER. No error, no warning — just rows missing from a report.
- The rule: **left-table filters → WHERE. Right-table filters on a LEFT join → into the ON.**
- One deliberate exception: \`WHERE right.id IS NULL\` *keeps only* the receipts — "left rows with no match", the standard anti-join.`,
    },
    {
      type: 'code',
      lang: 'sql',
      title: 'The row-loss bug, broken and fixed (ecommerce playground DB)',
      code: `-- goal: delivered-order count per customer, INCLUDING zero-order customers
SELECT c.name, COUNT(o.id) AS delivered
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.status = 'delivered'          -- BROKEN
GROUP BY c.id;
-- 7 rows. Zoya vanished: her padded row has status NULL,
-- NULL = 'delivered' is not TRUE, so WHERE deletes it.

SELECT c.name, COUNT(o.id) AS delivered
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
                  AND o.status = 'delivered'
GROUP BY c.id;
-- 8 rows, Zoya|0 restored. Kabir|1: his cancelled order simply
-- fails the ON (not a match); his delivered order still pairs.`,
      annotations: {
        2: 'COUNT(o.id) counts non-NULL values only — Zoya\'s padded row contributes 0. COUNT(*) counts rows and would report her as 1. Pick per intent, on purpose.',
        5: 'The trap fires here: a WHERE on the right table converts LEFT into INNER — silently. A left-table filter (c.city = \'Delhi\') in WHERE is completely fine.',
        13: 'The fix: right-table conditions join the pairing test. Failing ON means "not a match" — so LEFT pads instead of deleting.',
      },
    },
    {
      type: 'intuition',
      title: 'Non-key joins: the duplicate explosion',
      md: `Every join so far hit a PRIMARY KEY on one side, so each left row found **at most one** match. Join on a non-key column and that guarantee dies.

- If a value appears m times on the left and n times on the right, the join emits **m × n rows** for that value. This is *fan-out*.
- Fan-out corrupts aggregates silently: SUM a price over fanned-out rows and every duplicate is counted again. The report doesn't error — it reports wrong money.
- Classic incident shape: two child tables (payments, shipments) joined to each other through a shared order_id — 3 payments × 2 shipments = 6 rows per order.
- Defense 1: before writing any join, know whether each join column is unique. Key → at most one match; non-key → expect multiplication.
- Defense 2: sanity-check row counts. A LEFT join to a "unique" key returning more rows than the left table proves the key wasn't unique.`,
    },
    {
      type: 'intuition',
      title: 'Multi-table chains: joins feed joins',
      md: `Real queries chain three, four, five tables. The model stays one sentence: **joins evaluate left to right, and each join's output becomes the next join's left input.**

- customers → orders → order_items → products: each hop is one ON clause following one foreign key.
- Track the grain at every hop: customers (one row per customer) → orders (per order) → order_items (per item line). The final result carries order_items' grain.
- Subtle trap: a LEFT join upstream, then an INNER join downstream *on the padded columns*, re-kills the padded rows — NULL cannot pass the next ON either. If unmatched rows must survive to the end, keep the chain LEFT from the first LEFT onward.`,
    },
    {
      type: 'code',
      lang: 'sql',
      title: 'A four-table chain (ecommerce playground DB)',
      code: `SELECT c.name, p.name AS product, oi.qty
FROM customers c
JOIN orders o       ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id   = o.id
JOIN products p     ON p.id          = oi.product_id
WHERE o.id = 101;
-- Aarav|Wireless Mouse|1    Aarav|Clean Code|2      (2 rows)`,
      annotations: {
        3: 'Pipeline reading: (customers ⋈ orders) is built first, and THAT intermediate result is the left input of the next join.',
        5: 'Three ON clauses — each one glues exactly ONE new table onto the pile. A join missing its ON is an accidental CROSS.',
        7: 'Grain check: the output has order_items\' grain (one row per item line) — which is why Aarav appears twice and nothing is wrong.',
      },
    },
    {
      type: 'intuition',
      title: 'Output prediction: the skill they actually test',
      md: `SQL screens rarely ask "define LEFT JOIN". They show two small tables and a query, and ask what comes out. The mechanical method:

1. Name the driving (left) table. Go row by row.
2. For each left row, list every right row passing ON. Emit one output row per pair.
3. Zero matches? INNER: emit nothing. LEFT/FULL: emit once, right columns NULL.
4. RIGHT/FULL only: sweep the right table for rows nothing matched; emit them NULL-padded — that is the visual's final sweep.
5. Then — and only then — apply WHERE to the finished rows, then GROUP BY, then HAVING.

Two drills below. Work them on paper before reading the answers — the interview is paper.`,
    },
    {
      type: 'code',
      lang: 'sql',
      title: 'Drill 1 — predict the output',
      code: `-- authors            posts
-- id | name          id | author_id
-- 10 | Asha           1 | 10
-- 20 | Ravi           2 | 20
-- 30 | Zara           3 | 20
--                     4 | NULL

SELECT a.name, COUNT(p.id) AS n
FROM authors a
LEFT JOIN posts p ON p.author_id = a.id
GROUP BY a.id;

-- predict the full output before scrolling: how many rows, and each n?`,
    },
    {
      type: 'intuition',
      title: 'Drill 1 — worked answer',
      md: `Drive from \`authors\`, row by row.

- Asha (10): post 1 matches → one pair. n = 1.
- Ravi (20): posts 2 and 3 match → two pairs. n = 2.
- Zara (30): nothing matches → LEFT emits her anyway, post columns NULL. \`COUNT(p.id)\` skips NULLs → n = **0**.
- Post 4 (author_id NULL): a *right-side* row that matched nothing. LEFT rescues left rows only — post 4 simply never appears. And NULL matches nothing, not even another NULL.
- Final: **3 rows** — Asha 1, Ravi 2, Zara 0.
- One-character bug: \`COUNT(*)\` instead of \`COUNT(p.id)\` reports Zara as 1 — it counts her padded row itself.`,
    },
    {
      type: 'code',
      lang: 'sql',
      title: 'Drill 2 — predict the row count',
      code: `-- logins             purchases
-- user_id | day      user_id | item
--    1    | Mon         1    | book
--    1    | Tue         1    | pen
--    2    | Mon         2    | mug
--                       3    | hat

SELECT l.user_id, l.day, pu.item
FROM logins l
JOIN purchases pu ON pu.user_id = l.user_id;

-- predict: exactly how many rows come back?`,
    },
    {
      type: 'intuition',
      title: 'Drill 2 — worked answer',
      md: `Neither side's \`user_id\` is unique — so expect multiplication, value by value.

- user 1: 2 login rows × 2 purchase rows = **4 output rows** (Mon·book, Mon·pen, Tue·book, Tue·pen).
- user 2: 1 × 1 = 1 row (Mon·mug).
- user 3: bought a hat but never logged in — INNER drops it. 0 rows.
- Total: **5 rows**. Not 4 (the bigger table), not 3 (one per matching pair of users) — the fan-out IS the answer.
- Now imagine summing purchase amounts over this result: user 1's book and pen each count twice. That is how a dashboard doubles revenue without a single error message.`,
    },
  ],
  quiz: [
    {
      question: 'Predict: users (Ana→10, Ben→20, Cai→30, Dev→NULL, Eli→9) INNER JOIN cities (10 Pune, 20 Delhi, 30 Goa, 40 Agra) ON users.city_id = cities.id. How many rows?',
      options: [
        { text: '5 — one per user', explanation: 'That is LEFT-join thinking. INNER drops Dev (NULL matches nothing) and Eli (no city with id 9).' },
        { text: '3', explanation: 'Correct. Only Ana, Ben, Cai find a match. Dev, Eli, and Agra are all dropped silently — INNER keeps matched pairs only.' },
        { text: '4', explanation: '4 is the RIGHT-join count (Agra rescued with a NULL user). INNER rescues no one on either side.' },
        { text: '20', explanation: '20 is the CROSS count (5 × 4). INNER only emits pairs where the ON test is true.' },
      ],
      correct: 1,
    },
    {
      question: 'Predict: table A has k values 1, 1, 2. Table B has k values 1, 1. How many rows from A JOIN B ON A.k = B.k?',
      options: [
        { text: '2 — one per B row', explanation: 'Joins are not first-match lookups. EACH A row with k=1 pairs with BOTH B rows.' },
        { text: '3 — one per A row', explanation: 'Same mistake mirrored: every passing pair emits a row, and A\'s two k=1 rows each pair twice.' },
        { text: '4', explanation: 'Correct. k=1 appears 2× in A and 2× in B → 2 × 2 = 4 pairs. A\'s k=2 matches nothing and is dropped. Fan-out in miniature.' },
        { text: '6', explanation: '6 would be the full 3 × 2 cartesian product — but the ON test kills the two pairs involving k=2.' },
      ],
      correct: 2,
    },
    {
      question: 'SELECT … FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.status = \'delivered\'. What did the WHERE do to the join?',
      options: [
        { text: 'Nothing structural — it just removes cancelled orders', explanation: 'It also removes every NULL-padded row: padded rows have status NULL, which never equals \'delivered\'. Order-less customers vanish.' },
        { text: 'Silently converted the LEFT join into an INNER join', explanation: 'Correct. WHERE runs after the join and only keeps rows where the test is TRUE — every receipt row fails, so exactly the INNER result survives.' },
        { text: 'It raises an error because status can be NULL', explanation: 'Comparing with NULL is never an error in SQL — the comparison just isn\'t TRUE, and WHERE drops the row. That silence is what makes the bug dangerous.' },
        { text: 'Converted it into a FULL join', explanation: 'No clause ever promotes a join type. The failure direction here is losing rows, not gaining them.' },
      ],
      correct: 1,
    },
    {
      question: 'You want delivered-order counts per customer, keeping zero-order customers. Where does the status filter belong?',
      options: [
        { text: 'In WHERE — filters belong in WHERE', explanation: 'For right-table columns after a LEFT join, WHERE is exactly the trap: it deletes the NULL-padded rows and loses the zero-order customers.' },
        { text: 'ANDed into the ON clause (or pre-filter orders in a subquery, then LEFT join that)', explanation: 'Correct. A row failing ON is simply "not a match", so LEFT still pads and keeps the customer. Both forms produce identical results.' },
        { text: 'In HAVING', explanation: 'HAVING filters whole groups after aggregation — the count would already include cancelled orders, and the zero-order customer\'s NULL-status group still dies.' },
        { text: 'It cannot be done with a LEFT join', explanation: 'It is the canonical LEFT-join report. Only the placement of the filter decides whether it works.' },
      ],
      correct: 1,
    },
    {
      question: 'MySQL has no FULL OUTER JOIN. Which emulation is fully correct?',
      options: [
        { text: 'LEFT JOIN query, UNION ALL, the mirrored LEFT JOIN filtered to right-only rows (WHERE left.pk IS NULL)', explanation: 'Correct. The first half gives matches + left receipts; the anti-filtered second half adds exactly the right receipts. No dedupe involved.' },
        { text: 'LEFT JOIN query UNION RIGHT JOIN query', explanation: 'Near-correct and commonly taught — but it relies on UNION\'s dedupe to remove the overlap, and that same dedupe silently merges genuinely identical rows. Also assumes RIGHT support.' },
        { text: 'CROSS JOIN plus a WHERE clause', explanation: 'Filtering a cartesian product can only reproduce INNER. No WHERE can create NULL-padded rows that were never emitted.' },
        { text: 'INNER JOIN wrapped in COALESCE', explanation: 'COALESCE fills NULLs inside existing rows — it cannot resurrect rows INNER already dropped.' },
      ],
      correct: 0,
    },
    {
      question: 'products has 12 rows, days has 30 rows. SELECT * FROM products CROSS JOIN days returns…',
      options: [
        { text: '42 rows', explanation: 'That is addition. CROSS multiplies: every product pairs with every day.' },
        { text: '360 rows', explanation: 'Correct — 12 × 30, every pair. Legitimate as a report spine: LEFT join sales onto it so zero-sales days still appear.' },
        { text: 'An error — there is no ON clause', explanation: 'CROSS is the one join defined to have no ON. Missing ON on other joins is the accident; on CROSS it is the point.' },
        { text: '12 rows with day columns NULL-padded', explanation: 'Padding is LEFT-join behavior for failed matches. CROSS has no test to fail — it pairs everything.' },
      ],
      correct: 1,
    },
    {
      question: 'What makes a self join possible?',
      options: [
        { text: 'A special SELF JOIN keyword', explanation: 'No such keyword exists — a self join is a completely ordinary join that happens to name the same table twice.' },
        { text: 'Aliasing the same table twice, so one physical table plays two roles', explanation: 'Correct. The engine treats e and m as two independent inputs; the ON pairs rows across the two roles. Aliases are mandatory to disambiguate columns.' },
        { text: 'A foreign key from the table to itself', explanation: 'manager_id-style FKs are the common REASON for a self join, but not a requirement — any condition works, e.g. e1.salary > e2.salary.' },
        { text: 'Copying the table with CREATE TEMP TABLE first', explanation: 'Never needed — an alias gives you the logical second copy for free.' },
      ],
      correct: 1,
    },
    {
      question: 'After customers LEFT JOIN orders, Zoya (zero orders) has one NULL-padded row. Grouped per customer, what do COUNT(*) and COUNT(o.id) report for her?',
      options: [
        { text: 'Both 0', explanation: 'COUNT(*) counts rows, and her padded row is a real row in the result — it counts.' },
        { text: 'Both 1', explanation: 'COUNT(o.id) counts non-NULL values of that column, and her padded o.id is NULL — skipped.' },
        { text: 'COUNT(*) = 1, COUNT(o.id) = 0', explanation: 'Correct. The padded row exists (so * counts it) but every order column in it is NULL (so the column-count skips it). "Orders per customer" reports must use COUNT(o.id).' },
        { text: 'COUNT(*) = 0, COUNT(o.id) = 1', explanation: 'Exactly backwards — * counts rows, the column form skips NULLs.' },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain what a join actually does — no Venn diagrams allowed.',
      answer:
        'A join pairs rows from two tables wherever a condition is true. Mental model: for each row of the left table, test every row of the right table against the ON condition; each passing pair becomes one wider output row. The join types differ only in their policy for rows that never matched: INNER drops them, LEFT/RIGHT/FULL keep them with NULL padding on the missing side, CROSS skips the test and emits all m×n pairs. Engines execute this as hash joins or merge joins for speed, but all of them produce exactly the nested-loop semantics — so you predict output with the loop and let the optimizer worry about speed. Worth adding: the Venn picture hides duplicates (one key matching three rows emits three rows) and cannot draw CROSS, which is why the row-level model is the one to trust.',
      isCaseBased: false,
    },
    {
      question: 'Two tables: users (5 rows — one NULL FK, one FK pointing at a nonexistent city) and cities (4 rows — one city no user references). Give the row counts for all five join types and justify each.',
      answer:
        'INNER 3: only the three real matches survive; the NULL FK matches nothing, the dangling FK finds no city, the orphan city is never emitted. LEFT 5: the 3 matches plus 2 NULL-padded receipts — with a unique right key, LEFT returns exactly one row per left row. RIGHT 4: 3 matches plus the orphan city padded — the mirror image. FULL 6: 3 + 2 + 1, unmatched rows from both sides kept. CROSS 20: 5 × 4, no test at all. The two laws to state: LEFT against a unique key preserves the left row count exactly (fewer rows in a report means something downstream ate them), and any non-unique join key multiplies instead.',
      isCaseBased: false,
    },
    {
      question: 'Case: the "orders per customer" report showed all 8 customers for months. A teammate added a filter for delivered orders; now it shows 7 and finance is asking where the eighth went. Debug it live.',
      answer:
        'First move: diff the query — the new predicate almost certainly landed in WHERE on a right-table column after a LEFT JOIN. Mechanism: the missing customer has no orders, so her row was NULL-padded; NULL = \'delivered\' is not TRUE; WHERE deletes the row — the LEFT join silently became INNER. Fix: move the predicate into the ON clause (LEFT JOIN orders o ON o.customer_id = c.id AND o.status = \'delivered\'), or pre-filter orders in a subquery/CTE and LEFT join that — identical results, pick per house style. Verify: row count returns to the customer-table count, and the restored customer shows 0 via COUNT(o.id) — not COUNT(*), which would count her padded row as 1. Prevention: code-review rule — any WHERE on the nullable side of an outer join is a red flag unless it is IS NULL, the deliberate anti-join.',
      isCaseBased: true,
    },
    {
      question: 'ON vs WHERE: when are they interchangeable and when not?',
      answer:
        'ON runs during pairing and decides whether a candidate pair matches; WHERE runs after the join and filters finished rows. For INNER joins the two are interchangeable — a pair killed during pairing or after gives the same result, and optimizers treat them identically. For OUTER joins they diverge: a left row failing every ON test still survives NULL-padded, while a row failing WHERE is deleted — so a right-table predicate in WHERE silently converts LEFT to INNER. Style rule even where it doesn\'t matter: join conditions in ON, filters in WHERE — the reader can then tell pairing logic from filtering logic at a glance.',
      isCaseBased: false,
    },
    {
      question: 'Case: revenue on the dashboard doubled overnight — right after shipping data was joined into the revenue query. Walk through it.',
      answer:
        'Classic fan-out. Orders were joined to shipments, and some orders ship in multiple boxes — each such order row duplicates once per shipment, and SUM(amount) counts the amount once per duplicate. Diagnose: compare COUNT(*) with COUNT(DISTINCT order_id) on the joined result — if they differ, the join multiplied rows; also re-run the old query and confirm the delta appears exactly on multi-shipment orders. Fix, best first: (1) pre-aggregate shipments to one row per order in a CTE (or pick one shipment) BEFORE joining — the join is then key-to-key again; (2) if shipments only gate existence, use EXISTS instead of a join — a semi-join never duplicates; (3) restructure to sum revenue at order grain and join the aggregate. Prevention: know the grain of every table you join; joining two tables where the key is non-unique on both sides multiplies m × n per key, and aggregates silently inflate.',
      isCaseBased: true,
    },
    {
      question: 'When would you use RIGHT JOIN?',
      answer:
        'Honest answer: almost never, and interviewers respect hearing why. Every RIGHT JOIN is a LEFT JOIN with the tables swapped, and LEFT reads better — the driving table whose rows are all preserved comes first, matching how the query is read top to bottom. Teams standardize on LEFT so every outer join in the codebase has one shape and review eyes are trained for one trap. The skill that still matters is READING RIGHT joins, because legacy code has them — and the one-line conversion (swap the operands, keep the ON) should be reflexive.',
      isCaseBased: false,
    },
    {
      question: 'Give a real use case for FULL OUTER JOIN, and emulate it on an engine that lacks it.',
      answer:
        'Use case: reconciliation. Payment-gateway export vs internal orders table, FULL join on order_id: rows NULL on the orders side are payments with no matching order (investigate fraud/import bugs), rows NULL on the payments side are orders never paid (chase or cancel) — both discrepancy lists in one query. Emulation where FULL is missing (MySQL today, SQLite before 3.39): SELECT with LEFT JOIN, UNION ALL, then the mirrored LEFT JOIN filtered to WHERE left.pk IS NULL — the anti-filter fetches exactly the right-only rows. Two precision points: UNION ALL, not UNION, because UNION\'s dedupe can merge genuinely identical rows; and anti-filter on a NOT NULL column (the primary key) so NULL provably means "no match" rather than "the data was NULL".',
      isCaseBased: false,
    },
    {
      question: 'Write and explain the classic self-join question: employees who earn more than their manager.',
      answer:
        'SELECT e.name FROM employees e JOIN employees m ON e.manager_id = m.id WHERE e.salary > m.salary. The table is aliased twice — e plays "employee", m plays "manager" — and the ON follows the self-referencing foreign key to pair each employee row with its manager\'s row. The WHERE then compares two columns of the same output row. INNER is correct here: heads have manager_id NULL, and a head has no manager to out-earn. Flip side worth volunteering: for "list every employee WITH their manager\'s name" the join must be LEFT, or the heads silently vanish — the row-loss trap wearing a self-join costume.',
      isCaseBased: false,
    },
    {
      question: 'Find customers who have never ordered — three ways, with tradeoffs.',
      answer:
        '(1) Anti-join: LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL — keeps only the NULL receipts; readable and fast, and the one legitimate right-table WHERE after a LEFT join. (2) NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id) — clearest intent, NULL-safe, and optimizers turn it into the same anti-join plan. (3) NOT IN (SELECT customer_id FROM orders) — the trap: if the subquery returns even one NULL, three-valued logic makes NOT IN return zero rows, total silent failure. Rule: prefer NOT EXISTS or the LEFT/IS NULL anti-join; NOT IN only with a proven NOT NULL column. Mentioning the NOT IN failure mode unprompted is exactly the depth signal interviewers look for.',
      isCaseBased: false,
    },
    {
      question: 'Does join order matter in a four-table chain?',
      answer:
        'Two separate questions. Semantics: for pure INNER joins, no — INNER is commutative and associative, any order yields the same rows. Outer joins break that: (A LEFT B) then INNER C is not the same as reordering, and specifically an INNER join downstream of a LEFT join re-kills the padded rows if its ON touches the padded columns — NULL cannot pass that test either. So the moment a chain contains a LEFT, order and join types downstream are load-bearing. Performance: the optimizer reorders INNER joins freely while searching for the cheapest plan, so you write the readable order and it picks the fast one; outer joins constrain its freedom, one more reason chains full of unnecessary LEFTs are a smell.',
      isCaseBased: false,
    },
    {
      question: 'CROSS JOIN: when is it the right tool, and how do you guard against the accidental version?',
      answer:
        'Legitimate uses share one property — you genuinely want every combination: (1) report spines — CROSS JOIN a calendar table with products, then LEFT join sales onto the spine so zero-sales days appear as 0 instead of vanishing; (2) variant grids — every (size × color) combination; (3) test matrices and parameter sweeps. The accidental version is a missing or wrong ON clause, and its symptom is a row-count explosion with values visibly repeating. Guards: write the explicit CROSS JOIN keyword when you mean it (self-documenting, reviewers don\'t hunt for a lost ON), never use comma-separated FROM lists where a forgotten WHERE silently produces the cartesian, and sanity-check output row counts against the driving table.',
      isCaseBased: false,
    },
    {
      question: 'How does NULL behave in join conditions, and what if you actually need NULLs to match?',
      answer:
        'NULL compared with anything — including another NULL — yields UNKNOWN, and both ON and WHERE keep only TRUE. Consequences: a row with a NULL foreign key never matches anything (INNER drops it, LEFT pads it), and two NULLs on opposite sides do not pair. This also powers the anti-join (WHERE right.pk IS NULL) and explains the NOT IN trap. If NULLs must match deliberately: use a NULL-safe equality where the engine has one — standard SQL IS NOT DISTINCT FROM, SQLite\'s IS, MySQL\'s <=> — or COALESCE both sides to a sentinel. Tradeoffs to name: sentinels can collide with real data, and NULL-safe operators can defeat index usage on some engines; the cleanest fix is often upstream — don\'t allow NULL in a column you intend to join on.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'A join, in one sentence', back: 'Pair rows from two tables wherever the ON condition is true; output rows are left columns glued to right columns. Join types only decide what happens to rows that never matched.' },
    { front: 'Row counts on the demo tables (5 users / 4 cities, 3 real matches)', back: 'INNER 3 (matches only) · LEFT 5 (+ Dev, Eli receipts) · RIGHT 4 (+ Agra) · FULL 6 (all receipts) · CROSS 20 (5 × 4, no test).' },
    { front: 'LEFT JOIN, precisely', back: 'INNER\'s rows PLUS one NULL-padded row per unmatched left row. With a unique right key: exactly one output row per left row — fewer means rows were eaten downstream.' },
    { front: 'The LEFT→INNER trap', back: 'A WHERE on a right-table column after a LEFT JOIN deletes every NULL-padded row (NULL comparison is never TRUE) — silently converting LEFT to INNER. Fix: move the predicate into ON.' },
    { front: 'FULL OUTER JOIN workaround (MySQL, old SQLite)', back: 'LEFT JOIN query, UNION ALL, mirrored LEFT JOIN with WHERE left.pk IS NULL (right-only rows). UNION ALL not UNION — dedupe eats identical legit rows. Anti-filter a NOT NULL column.' },
    { front: 'CROSS JOIN — size and legit uses', back: 'm × n rows, no ON. Legitimate when every combination is wanted: report spines (calendar × products, then LEFT join facts), variant grids, test matrices. Otherwise it\'s a missing ON.' },
    { front: 'Self join', back: 'Same table aliased twice, playing two roles (e = employee, m = manager), paired by ON e.manager_id = m.id. No special keyword. LEFT keeps the heads; INNER drops them.' },
    { front: 'Fan-out rule (non-key joins)', back: 'A value appearing m times left and n times right emits m × n rows. SUMs silently inflate over the duplicates — check each join column\'s uniqueness before joining.' },
    { front: 'NULL in join conditions', back: 'NULL = anything (even NULL) is UNKNOWN, never TRUE → NULL FKs match nothing. Powers the IS NULL anti-join; explains the NOT IN trap. NULL-safe match: IS NOT DISTINCT FROM / SQLite IS.' },
    { front: 'COUNT(*) vs COUNT(col) after a LEFT join', back: 'COUNT(*) counts rows — a NULL-padded receipt counts as 1. COUNT(right.col) skips NULLs — the receipt counts as 0. Zero-orders reports need COUNT(o.id).' },
  ],
  mindmapMarkdown: `- Joins: Every Kind, Row by Row
  - What a join is
    - pair rows where ON is true
    - types = unmatched-row policy
  - The five
    - INNER: matches only (3)
    - LEFT: + NULL receipts (5)
    - RIGHT: mirrored LEFT (4)
    - FULL: both sides kept (6)
    - CROSS: all pairs, m×n (20)
  - NULL rules
    - NULL matches nothing, even NULL
    - COUNT(col) skips receipts, COUNT(*) doesn't
  - ON vs WHERE
    - ON: during pairing · WHERE: after
    - right-table WHERE turns LEFT into INNER
    - fix: predicate into ON
    - exception: IS NULL anti-join
  - Fan-out
    - non-key join: m × n per value
    - SUMs silently inflate
  - Chains
    - each join feeds the next; downstream INNER re-kills LEFT padding
  - Prediction method
    - drive left, pad misses, sweep right
    - WHERE → GROUP → HAVING last`,
}

export default m
