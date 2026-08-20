import type { Module } from '../types'

const m: Module = {
  id: 'dbms-l1-window-functions',
  subjectId: 'dbms',
  level: 1,
  title: 'Window Functions: Where FAANG SQL Rounds Live',
  whyItMatters:
    'Ask anyone who just did a data or ML SQL round what was on it: rank rows within groups, nth-highest salary, month-over-month delta, dedupe a table. Every one of those is a window function question — or a question whose best answer is a window function. GROUP BY got you to the door; OVER gets you the offer.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'An aggregate that refuses to collapse rows',
      md: `A principal summarizes: "Section A average: 72." The students are gone — one number replaced thirty rows. That is **GROUP BY**. A class teacher instead writes on *each student's own report card*: "your score, your rank in section, your section's average." Every student keeps their row and gains context. That is a **window function**.

- Same aggregate math (SUM, AVG, COUNT…) — **zero collapsing**. Rows in = rows out. Always.
- GROUP BY answers *"what happened per group?"* Window functions answer *"how does each row compare to its group?"*
- Mental model: for each row, the database looks through a **window** at some set of related rows, computes one value, and writes it onto that row.
- The window is declared with \`OVER (…)\` — the single keyword that separates the two worlds.`,
    },
    {
      type: 'code',
      lang: 'sql',
      title: 'One schema for the whole module — collapse vs context',
      code: `CREATE TABLE employees (
  id     INTEGER PRIMARY KEY,
  name   TEXT,
  dept   TEXT,
  salary INTEGER
);
INSERT INTO employees VALUES
  (1, 'Asha', 'Eng',   120),
  (2, 'Bala', 'Eng',   100),
  (3, 'Chen', 'Eng',   100),
  (4, 'Devi', 'Sales',  90),
  (5, 'Esha', 'Sales',  80);

-- GROUP BY collapses: 5 rows in, 2 rows out
SELECT dept, AVG(salary) AS dept_avg
FROM employees
GROUP BY dept;
-- Eng | 106.67 (320/3, shown rounded)    Sales | 85.0

-- Window: 5 rows in, 5 rows OUT
SELECT name, dept, salary,
       AVG(salary) OVER (PARTITION BY dept) AS dept_avg
FROM employees;
-- Asha | Eng   | 120 | 106.67…
-- Bala | Eng   | 100 | 106.67…
-- Chen | Eng   | 100 | 106.67…
-- Devi | Sales |  90 | 85.0
-- Esha | Sales |  80 | 85.0`,
      annotations: {
        14: 'The GROUP BY version cannot show name or salary — those columns died in the collapse. That limitation is exactly what windows remove.',
        22: 'Same AVG, but OVER (PARTITION BY dept) means: compute it over my department, then attach it to MY row. No rows lost.',
        24: 'Every row now carries its own value AND its group context side by side — "who earns above their department average?" becomes a one-subquery follow-up.',
      },
    },
    {
      type: 'note',
      md: 'Everything in this module runs verbatim in the live sandbox: [Open the SQL playground](/playground/sql). Its seeded **employees** database has checked exercises for exactly this module — a DENSE_RANK ranking task and a running-total task. Do them as you read, not after.',
    },
    {
      type: 'intuition',
      title: 'OVER, dissected — three dials',
      md: `Everything a window does is set by what is inside \`OVER (…)\`. There are only three dials.

- \`OVER ()\` — empty: the window is the **whole table**. \`SUM(salary) OVER ()\` puts the grand total on every row.
- \`OVER (PARTITION BY dept)\` — the window is **my group only**, and every computation **restarts at each new dept**. GROUP BY's grouping, without the collapse.
- \`OVER (PARTITION BY dept ORDER BY salary DESC)\` — orders rows *inside* each partition. Ordering is what makes ranks meaningful and turns SUM into a *running* SUM.
- The \`ORDER BY\` inside OVER and the query's final \`ORDER BY\` are strangers: one decides what the function sees, the other sorts the output. Set both, independently.
- Dial three is the **frame** (\`ROWS BETWEEN …\`) — which slice of the ordered partition the function reads. It gets an honest note below.`,
    },
    {
      type: 'code',
      lang: 'sql',
      title: 'ROW_NUMBER vs RANK vs DENSE_RANK — one dataset, three outputs',
      code: `SELECT name, salary,
       ROW_NUMBER() OVER (ORDER BY salary DESC) AS row_num,
       RANK()       OVER (ORDER BY salary DESC) AS rnk,
       DENSE_RANK() OVER (ORDER BY salary DESC) AS dense
FROM employees;
-- name | salary | row_num | rnk | dense
-- Asha |  120   |    1    |  1  |  1
-- Bala |  100   |    2    |  2  |  2
-- Chen |  100   |    3    |  2  |  2
-- Devi |   90   |    4    |  4  |  3
-- Esha |   80   |    5    |  5  |  4

-- THE pattern interviews are built on: top earner per department
SELECT name, dept, salary FROM (
  SELECT name, dept, salary,
         ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC, id) AS rn
  FROM employees
) AS ranked
WHERE rn = 1;
-- Asha | Eng | 120        Devi | Sales | 90`,
      annotations: {
        9: 'The tie row. ROW_NUMBER invents an order (2 then 3 — arbitrary between Bala and Chen unless you add a tiebreaker). RANK repeats the 2.',
        10: 'After the tie, RANK jumps to 4 — Olympic style: two silvers, no bronze. DENSE_RANK refuses to skip: 3. This one line is the whole tie-behavior question.',
        16: 'PARTITION BY dept restarts numbering in each department. The ", id" tiebreaker makes ROW_NUMBER deterministic — say it unprompted.',
        19: 'WHERE rn = 1 must live OUTSIDE, in a wrapping query: WHERE runs before window functions are computed, so the inner query cannot filter on rn.',
      },
    },
    {
      type: 'note',
      md: 'Memory hook for ties: **ROW_NUMBER never ties** (1,2,3,4 — invents an order), **RANK ties then skips** (1,2,2,4 — medal logic), **DENSE_RANK ties and stays dense** (1,2,2,3 — no gaps). Interviewers show one dataset and ask for all three columns; the honest extra sentence is that ROW_NUMBER among tied rows is *nondeterministic* until you add a unique tiebreaker to the ORDER BY.',
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'The running-total frame: grow, grow, grow — RESET',
        notice: 'SUM(salary) OVER (PARTITION BY dept ORDER BY id). The frame swallows one more row per step — until the partition boundary wipes it clean.',
        leftLabel: 'current row + running SUM',
        rightLabel: 'employees, partitioned by dept',
        frames: [
          {
            note: 'Partition Eng, row 1 (Asha): the frame holds just her. Running SUM = 120.',
            stack: [
              { name: 'current row', value: 'Asha', to: 'r1' },
              { name: 'frame', value: 'Asha' },
              { name: 'running SUM', value: '120' },
            ],
            heap: [
              { id: 'r1', value: 'Eng · Asha · 120', label: 'in frame' },
              { id: 'r2', value: 'Eng · Bala · 100' },
              { id: 'r3', value: 'Eng · Chen · 100' },
              { id: 'r4', value: 'Sales · Devi · 90' },
              { id: 'r5', value: 'Sales · Esha · 80' },
            ],
          },
          {
            note: 'Row 2 (Bala): the frame GROWS — it now spans partition start through the current row. Running SUM = 120 + 100 = 220.',
            stack: [
              { name: 'current row', value: 'Bala', to: 'r2' },
              { name: 'frame', value: 'Asha, Bala' },
              { name: 'running SUM', value: '220' },
            ],
            heap: [
              { id: 'r1', value: 'Eng · Asha · 120', label: 'in frame' },
              { id: 'r2', value: 'Eng · Bala · 100', label: 'in frame' },
              { id: 'r3', value: 'Eng · Chen · 100' },
              { id: 'r4', value: 'Sales · Devi · 90' },
              { id: 'r5', value: 'Sales · Esha · 80' },
            ],
          },
          {
            note: 'Row 3 (Chen): frame = all of Eng so far. Running SUM = 320. Notice the frame only ever grows within a partition.',
            stack: [
              { name: 'current row', value: 'Chen', to: 'r3' },
              { name: 'frame', value: 'Asha, Bala, Chen' },
              { name: 'running SUM', value: '320' },
            ],
            heap: [
              { id: 'r1', value: 'Eng · Asha · 120', label: 'in frame' },
              { id: 'r2', value: 'Eng · Bala · 100', label: 'in frame' },
              { id: 'r3', value: 'Eng · Chen · 100', label: 'in frame' },
              { id: 'r4', value: 'Sales · Devi · 90' },
              { id: 'r5', value: 'Sales · Esha · 80' },
            ],
          },
          {
            note: 'Row 4 (Devi): dept changed Eng → Sales — PARTITION BOUNDARY. The frame RESETS: nothing from Eng carries over. Running SUM = 90, not 410.',
            stack: [
              { name: 'current row', value: 'Devi', to: 'r4', danger: true },
              { name: 'frame', value: 'Devi — reset!' },
              { name: 'running SUM', value: '90' },
            ],
            heap: [
              { id: 'r1', value: 'Eng · Asha · 120', label: 'done (Eng)' },
              { id: 'r2', value: 'Eng · Bala · 100', label: 'done (Eng)' },
              { id: 'r3', value: 'Eng · Chen · 100', label: 'done (Eng)' },
              { id: 'r4', value: 'Sales · Devi · 90', label: 'in frame' },
              { id: 'r5', value: 'Sales · Esha · 80' },
            ],
          },
          {
            note: 'Row 5 (Esha): the Sales frame grows. Running SUM = 90 + 80 = 170. Two independent running totals — that is PARTITION BY.',
            stack: [
              { name: 'current row', value: 'Esha', to: 'r5' },
              { name: 'frame', value: 'Devi, Esha' },
              { name: 'running SUM', value: '170' },
            ],
            heap: [
              { id: 'r1', value: 'Eng · Asha · 120', label: 'done (Eng)' },
              { id: 'r2', value: 'Eng · Bala · 100', label: 'done (Eng)' },
              { id: 'r3', value: 'Eng · Chen · 100', label: 'done (Eng)' },
              { id: 'r4', value: 'Sales · Devi · 90', label: 'in frame' },
              { id: 'r5', value: 'Sales · Esha · 80', label: 'in frame' },
            ],
          },
        ],
      },
    },
    {
      type: 'code',
      lang: 'sql',
      title: 'Running total — the query the visual just stepped through',
      code: `SELECT name, dept, salary,
       SUM(salary) OVER (
         PARTITION BY dept
         ORDER BY id
       ) AS running
FROM employees
ORDER BY dept, id;
-- Asha | Eng   | 120 | 120
-- Bala | Eng   | 100 | 220
-- Chen | Eng   | 100 | 320
-- Devi | Sales |  90 |  90    <- partition boundary: the sum RESTARTS
-- Esha | Sales |  80 | 170`,
      annotations: {
        4: 'ORDER BY inside OVER is what turns plain SUM into a RUNNING sum: the frame becomes "partition start through current row".',
        7: 'The outer ORDER BY only sorts the printed output. Delete it and the running values stay correct — the display order just becomes unspecified.',
        11: 'The reset the diagram showed. Without PARTITION BY dept, Devi would read 410 — one long total across departments.',
      },
    },
    {
      type: 'note',
      md: 'The honest frame-clause note. With ORDER BY inside OVER, the default frame is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` — and **RANGE includes peers**, rows tied on the ORDER BY value. Order that running total by `salary` instead of `id` and Bala and Chen (both 100) would EACH show 320: the "running" total moves in tied clumps. Fixes: order by a unique key, or state the frame yourself with `ROWS`, which counts physical rows. The same clause buys **moving averages**: `AVG(revenue) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)` = 3-month moving average — on monthly revenues 100, 150, 110, 130 it yields 100, 125, 120, 130 (early rows just have shorter frames).',
    },
    {
      type: 'code',
      lang: 'sql',
      title: 'LAG for month-over-month — plus strftime date bucketing',
      code: `CREATE TABLE sales (
  sale_date TEXT,     -- 'YYYY-MM-DD'
  amount    INTEGER
);
-- assume rows that bucket to: 2024-01: 100, 2024-02: 150,
--                             2024-03: 110, 2024-04: 130

WITH monthly AS (
  SELECT strftime('%Y-%m', sale_date) AS month,
         SUM(amount) AS revenue
  FROM sales
  GROUP BY month
)
SELECT month, revenue,
       LAG(revenue) OVER (ORDER BY month) AS prev_rev,
       revenue - LAG(revenue) OVER (ORDER BY month) AS delta
FROM monthly;
-- 2024-01 | 100 | NULL |  NULL
-- 2024-02 | 150 | 100  |    50
-- 2024-03 | 110 | 150  |   -40
-- 2024-04 | 130 | 110  |    20`,
      annotations: {
        9: "strftime('%Y-%m', …) is SQLite's date bucketing: '2024-03-17' -> '2024-03'. Postgres spells it DATE_TRUNC('month', …) — name both and you sound bilingual.",
        15: 'LAG(x) = x from the PREVIOUS row in this ordering; LEAD(x) looks at the NEXT row. LAG(revenue, 12) = same month last year — the offset argument is free.',
        18: 'First month has no previous row, so LAG returns NULL (not 0) — and any arithmetic with NULL is NULL. Say this before the interviewer points at the first row.',
      },
    },
    {
      type: 'note',
      md: `Two more to recognize on sight. **NTILE(4) OVER (ORDER BY salary DESC)** deals rows into 4 near-equal buckets — instant quartiles (when rows don't divide evenly, the earlier buckets get the extras). And the **consecutive-days trick**: \`date(login_date, '-' || ROW_NUMBER() OVER (ORDER BY login_date) || ' days')\` is CONSTANT within a streak — logins on the 1st, 2nd, 3rd minus row numbers 1, 2, 3 all land on the same anchor date. GROUP BY that anchor and \`COUNT(*)\` is the streak length. This one idea solves every "active N days in a row" question.`,
    },
    {
      type: 'intuition',
      title: 'The nth-highest-salary family — why interviewers adore it',
      md: `"Find the second-highest salary" looks trivial. It survives in every interview loop because it has **four correct answers and two traps**, and your choices expose exactly what you know.

- The traps: **ties** (two people share the top salary — is the "second highest" the other 120, or the 100?) and **absence** (one employee — what do you return? Zero rows and NULL are different answers).
- Convention the family uses: rank *distinct* salaries. With 120, 120, 100 the second highest is 100.
- What is actually scored: any correct way fast, then the tradeoffs *unprompted*, then "now do nth" and "now per department" without rewriting from scratch.
- Learn all four ways below — each is the best answer somewhere.`,
    },
    {
      type: 'code',
      lang: 'sql',
      title: 'Second-highest salary, four ways',
      code: `-- Way 1: MAX below the MAX (the classic)
SELECT MAX(salary) AS second_highest
FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);
-- 100

-- Way 2: DISTINCT + ORDER BY + LIMIT/OFFSET
SELECT DISTINCT salary
FROM employees
ORDER BY salary DESC
LIMIT 1 OFFSET 1;
-- 100    (zero rows -- not NULL -- when no 2nd salary exists)

-- Way 3: DENSE_RANK = 2 (the one that generalizes)
SELECT DISTINCT salary
FROM (
  SELECT salary,
         DENSE_RANK() OVER (ORDER BY salary DESC) AS r
  FROM employees
) AS ranked
WHERE r = 2;
-- 100    (DISTINCT matters: Bala AND Chen both hold rank 2)

-- Way 4: correlated count -- "exactly 1 distinct salary above mine"
SELECT DISTINCT salary
FROM employees e
WHERE (SELECT COUNT(DISTINCT salary)
       FROM employees
       WHERE salary > e.salary) = 1;
-- 100`,
      annotations: {
        4: 'The subquery pins the ceiling (120); MAX of everything strictly below it is 100. Bonus: MAX over an empty set is NULL — the when-absent behavior LeetCode wants, for free.',
        11: 'OFFSET n-1 gives the nth. WITHOUT the DISTINCT this is the classic wrong answer: on salaries 120, 120, 100 it skips one ROW and returns 120 as the "second highest".',
        18: 'DENSE_RANK, not RANK. With a tie at the top (120, 120, 100), RANK goes 1, 1, 3 — "rank 2" returns nothing. DENSE_RANK goes 1, 1, 2.',
        29: 'The subquery re-runs per row e: count distinct salaries strictly above mine; exactly n-1 above means I am the nth. Quadratic-ish, but proves you can think correlated.',
      },
    },
    {
      type: 'note',
      md: `The tradeoffs — this is the part that gets scored:

- **Ties.** All four, as written, rank distinct salaries. The two classic bugs: dropping DISTINCT from way 2 (returns a duplicate top salary as "second"), and swapping DENSE_RANK for RANK in way 3 (rank 2 may not exist).
- **NULL when absent.** One employee → no second salary. Way 1 returns NULL naturally. Ways 2–4 return ZERO ROWS — wrap them as a scalar subquery, \`SELECT (…) AS second_highest\`, to convert no-rows into NULL when the judge (or the report) demands a row.
- **Generalizing to nth.** Way 2: \`OFFSET n-1\`. Way 3: \`WHERE r = n\`. Way 4: \`= n-1\`. Way 1 dies — the nth needs n nested MAXes.
- **Per group.** Only way 3 extends to "nth-highest per department": add \`PARTITION BY dept\` inside OVER. This is why the window version is the senior answer.
- Interview script: lead with way 3, offer way 1 as the no-window fallback, and name the tie and NULL traps before being asked.`,
    },
    {
      type: 'code',
      lang: 'sql',
      title: 'Duplicates: find them, then delete keeping one',
      code: `CREATE TABLE contacts (
  id    INTEGER PRIMARY KEY,
  email TEXT
);
INSERT INTO contacts VALUES
  (1, 'a@x.com'), (2, 'b@x.com'), (3, 'a@x.com'), (4, 'a@x.com');

-- Step 1: find the duplicates
SELECT email, COUNT(*) AS n
FROM contacts
GROUP BY email
HAVING COUNT(*) > 1;
-- a@x.com | 3

-- Step 2: delete them, keeping the earliest row per email
DELETE FROM contacts
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) AS rn
    FROM contacts
  ) AS dupes
  WHERE rn > 1
);
-- deletes ids 3 and 4 -- survivors: (1, 'a@x.com'), (2, 'b@x.com')`,
      annotations: {
        12: 'HAVING filters GROUPS after aggregation; WHERE filters rows before it. "COUNT(*) > 1" reads: this email appears on two or more rows.',
        21: "Number each email's rows by id: the keeper gets rn = 1, every extra copy gets rn = 2, 3, … Per-partition numbering is what makes keep-one trivial.",
        24: 'rn > 1 selects exactly the copies. The ORDER BY decides WHICH row survives — ORDER BY id keeps the oldest; flip to id DESC to keep the newest.',
      },
    },
    {
      type: 'note',
      md: 'Now go earn it: [Open the SQL playground](/playground/sql) and clear the two checked exercises on the employees database — DENSE_RANK ranking and the per-department running total. Both are lifted straight from real screens; if they take you under ten minutes, this module is done.',
    },
  ],
  quiz: [
    {
      question: 'A table has 8 rows across 3 departments. Query A: SELECT dept, AVG(salary) … GROUP BY dept. Query B: SELECT dept, AVG(salary) OVER (PARTITION BY dept) … . How many rows does each return?',
      options: [
        { text: 'A: 3, B: 3', explanation: 'B has no GROUP BY — window functions never collapse. Every input row survives.' },
        { text: 'A: 3, B: 8', explanation: 'Correct. GROUP BY collapses to one row per group; the window attaches the group average to all 8 original rows.' },
        { text: 'A: 8, B: 8', explanation: 'GROUP BY definitely collapses — 3 departments means 3 rows from query A.' },
        { text: 'Both depend on the data values', explanation: 'Row counts here depend only on structure: groups collapse, windows never do.' },
      ],
      correct: 1,
    },
    {
      question: 'Salaries ordered DESC: 120, 100, 100, 90. For the 90 row, what are RANK and DENSE_RANK?',
      options: [
        { text: 'RANK 4, DENSE_RANK 3', explanation: 'Correct. RANK counts how many rows sit strictly above you plus one: three rows beat the 4th salary, so it gets 4 — the tied pair consumed ranks 2 and 3. DENSE_RANK counts distinct salary LEVELS above you, so it stays gapless: 1, 2, 2, 3.' },
        { text: 'RANK 3, DENSE_RANK 3', explanation: 'RANK counts rows ahead of you: three rows outrank 90, so RANK is 4 — it skips 3 entirely.' },
        { text: 'RANK 4, DENSE_RANK 4', explanation: 'DENSE_RANK never leaves gaps — after a tie at 2 it continues at 3.' },
        { text: 'RANK 3, DENSE_RANK 4', explanation: 'Backwards — RANK is the one that skips, DENSE_RANK is the one that stays dense.' },
      ],
      correct: 0,
    },
    {
      question: 'What does PARTITION BY dept inside OVER actually do?',
      options: [
        { text: 'Filters the result to a single department', explanation: 'Filtering is WHERE\'s job. PARTITION BY keeps all rows — it only scopes what each window sees.' },
        { text: 'Restarts the window per department: each dept is computed independently, and no rows are collapsed', explanation: 'Correct. It is GROUP BY\'s grouping logic applied to the window, minus the collapse — ranks, sums, and LAG all reset at each new dept.' },
        { text: 'Sorts the output by department', explanation: 'Output order is the outer ORDER BY\'s job. PARTITION BY affects computation, not display.' },
        { text: 'Exactly the same thing as GROUP BY dept', explanation: 'GROUP BY collapses to one row per dept. PARTITION BY computes per dept while every row survives — that difference is the whole topic.' },
      ],
      correct: 1,
    },
    {
      question: 'LAG(revenue) OVER (ORDER BY month) — what does the FIRST month get?',
      options: [
        { text: '0', explanation: 'LAG does not invent a zero. Missing previous row means NULL — and NULL arithmetic stays NULL, which 0 would silently hide.' },
        { text: 'Its own revenue', explanation: 'That would be LAG with offset 0 — the default offset is 1: the previous row.' },
        { text: 'NULL — there is no previous row, and NULL is the default filler', explanation: 'Correct. And revenue − NULL is NULL, so the first delta is NULL too. (LAG takes a third argument to substitute a default.)' },
        { text: 'An error', explanation: 'No error — SQL fills the gap with NULL and moves on.' },
      ],
      correct: 2,
    },
    {
      question: 'SUM(amount) OVER (ORDER BY salary) — and two rows tie on salary. What do the tied rows show?',
      options: [
        { text: 'Each shows its own cumulative stopping point', explanation: 'That is ROWS behavior. The DEFAULT frame is RANGE, which treats tied rows as one clump.' },
        { text: 'Both show the total INCLUDING both tied rows — the default RANGE frame includes peers', explanation: 'Correct. RANGE extends the frame through all rows tied on the ORDER BY value. Fix: order by a unique key, or write ROWS explicitly.' },
        { text: 'The query throws an ambiguity error', explanation: 'SQL never errors on ties — it silently applies the peers rule, which is exactly why this gotcha survives code review.' },
        { text: 'One of them is dropped from the output', explanation: 'Window functions never drop rows — rows in, rows out.' },
      ],
      correct: 1,
    },
    {
      question: 'SELECT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1 — salaries are 500, 500, 400. What comes back?',
      options: [
        { text: '400', explanation: 'Only with DISTINCT. Without it, OFFSET skips one physical ROW — and the second row is the other 500.' },
        { text: '500 — OFFSET skips rows, not distinct values; the missing DISTINCT is the bug', explanation: 'Correct. This is the single most common wrong answer to "second highest". SELECT DISTINCT salary makes it return 400.' },
        { text: 'NULL', explanation: 'There are plenty of rows — something is returned; it is just the wrong something (500).' },
        { text: 'Zero rows', explanation: 'Zero rows happens when there is nothing beyond the OFFSET — here row 2 exists and is 500.' },
      ],
      correct: 1,
    },
    {
      question: 'In the dedupe DELETE, rows are numbered ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) and rows with rn > 1 are deleted. What survives?',
      options: [
        { text: 'No rows of any duplicated email', explanation: 'rn = 1 is excluded from deletion — exactly one row per email always survives.' },
        { text: 'Exactly one row per email — the lowest id, because ORDER BY id makes it rn = 1', explanation: 'Correct. The partition numbers each email\'s rows 1, 2, 3…; deleting rn > 1 keeps the first. Change the ORDER BY to choose a different survivor.' },
        { text: 'A random row per email', explanation: 'ORDER BY id inside the window makes the survivor deterministic — that determinism is why the ORDER BY is there.' },
        { text: 'Only emails that were never duplicated', explanation: 'Unique emails get rn = 1 and are untouched — but duplicated emails also keep their rn = 1 row.' },
      ],
      correct: 1,
    },
    {
      question: 'Why does WHERE ROW_NUMBER() OVER (…) = 1 fail directly in a query?',
      options: [
        { text: 'It is just a style convention', explanation: 'It is a hard error, not style — the engine refuses window functions in WHERE.' },
        { text: 'WHERE is evaluated BEFORE window functions are computed, so the value does not exist yet — wrap the window in a subquery or CTE and filter outside', explanation: 'Correct. Logical order: FROM → WHERE → GROUP BY → HAVING → SELECT (windows computed here) → ORDER BY → LIMIT. Windows are only legal in SELECT and ORDER BY.' },
        { text: 'ROW_NUMBER can only appear in ORDER BY', explanation: 'It is fine in the SELECT list too — that is where it usually lives. WHERE and HAVING are the forbidden zones.' },
        { text: 'It works in SQLite, just not in other databases', explanation: 'No mainstream engine allows it — the evaluation-order reasoning is universal.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'What is a window function, and how is it different from GROUP BY?',
      answer:
        'A window function computes an aggregate-style value over a set of related rows (the window) and writes the result onto each row — WITHOUT collapsing anything. Rows in = rows out. GROUP BY answers "what happened per group" and destroys row identity to say it; a window answers "how does each row compare to its group" and keeps every row. Mechanically, OVER (…) declares the window: PARTITION BY scopes it (restarting per group), ORDER BY sequences it (enabling ranks, running totals, LAG), and the frame clause narrows which slice of the ordered partition the function reads. The one-line contrast to lead with: GROUP BY collapses, OVER annotates.',
      isCaseBased: false,
    },
    {
      question: 'One dataset, three columns: explain ROW_NUMBER vs RANK vs DENSE_RANK, and when each is the right pick.',
      answer:
        'On salaries 120, 100, 100, 90 ordered DESC: ROW_NUMBER gives 1,2,3,4 — unique numbers, ties broken arbitrarily (nondeterministic until the ORDER BY includes a unique tiebreaker). RANK gives 1,2,2,4 — ties share, then it skips (medal logic: two silvers, no bronze). DENSE_RANK gives 1,2,2,3 — ties share, no gaps. Picks: ROW_NUMBER when you need exactly N rows (top-1 per group, dedupe keep-one, pagination); RANK when the skip is semantically honest ("tied for 2nd means nobody is 3rd"); DENSE_RANK when ranking distinct VALUES — which is why the nth-highest-salary answer uses it. Bonus point: name the nondeterminism of ROW_NUMBER on ties before the interviewer does.',
      isCaseBased: false,
    },
    {
      question: 'Find the second-highest salary. Now do it three more ways. Which one do you ship?',
      answer:
        'Way 1: MAX below MAX — SELECT MAX(salary) WHERE salary < (SELECT MAX(salary)…); returns NULL naturally when absent, but does not generalize to nth. Way 2: SELECT DISTINCT salary ORDER BY salary DESC LIMIT 1 OFFSET 1 — nth via OFFSET n−1, but returns zero rows (not NULL) when absent, and dropping DISTINCT is the classic tie bug. Way 3: DENSE_RANK() OVER (ORDER BY salary DESC), filter rank = 2 in a wrapper, SELECT DISTINCT to collapse tied holders — generalizes to nth (r = n) AND per-department (PARTITION BY dept). Way 4: correlated count — exactly one distinct salary above mine; portable, quadratic-ish, proves correlation skills. I ship way 3: it is the only one that survives both follow-ups ("nth" and "per group"). Traps to name unprompted: ties rank distinct salaries, and absence needs a NULL story (wrap ways 2–4 in a scalar subquery).',
      isCaseBased: false,
    },
    {
      question: 'Case: a teammate\'s "second-highest salary" query — ORDER BY salary DESC LIMIT 1 OFFSET 1 — passed review and ran fine for months. This week two people share the top salary and the report shows the wrong number. Debug it.',
      answer:
        'Root cause: OFFSET skips physical ROWS, not distinct values. With salaries 120, 120, 100 the sorted rows are 120, 120, 100 — OFFSET 1 lands on the second 120, so the "second highest" is reported as the top salary. It worked for months because salaries happened to be unique. Fix: SELECT DISTINCT salary before the ORDER BY/LIMIT — distinct values 120, 100, OFFSET 1 → 100. Then harden: if the table could ever hold one distinct salary, the query returns zero rows, so wrap it as a scalar subquery to yield NULL for the report. The senior close: rewrite with DENSE_RANK so the next request — "second highest per department" — is a one-line PARTITION BY change instead of another incident.',
      isCaseBased: true,
    },
    {
      question: 'Write month-over-month revenue growth. What happens in the first month, and how do you report percentage growth safely?',
      answer:
        'Bucket to months (SQLite: strftime(\'%Y-%m\', sale_date); Postgres: DATE_TRUNC), SUM per month in a CTE, then delta = revenue − LAG(revenue) OVER (ORDER BY month). The first month has no previous row, so LAG is NULL and the delta is NULL — correct behavior, since "growth" is undefined there; do not coalesce it to 0, which would fake a flat month. Percentage: 100.0 * (revenue − prev) / prev — two safety notes: multiply by 100.0 (not 100) to force real division in engines that truncate integers, and guard prev = 0 (NULLIF(prev, 0)) or a dead month becomes a division error. Mention LAG\'s offset argument: LAG(revenue, 12) gives same-month-last-year for YoY in the same shape.',
      isCaseBased: false,
    },
    {
      question: 'Case: a finance dashboard shows a running total that repeats the same value across several consecutive rows, then jumps. The query is SUM(amount) OVER (ORDER BY txn_date). Walk through the debugging.',
      answer:
        'The repeated-then-jumping pattern is the RANGE-peers signature. With ORDER BY inside OVER, the default frame is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW, and RANGE includes all PEERS — rows tied on txn_date. Several transactions on the same day are peers, so every row of that day shows the day-end total, and the "running" line moves in daily clumps. Fixes, by intent: (1) per-row running total → make the ordering unique: ORDER BY txn_date, txn_id; (2) keep date-only ordering but count physical rows → say ROWS explicitly (honest caveat: with a non-unique ORDER BY, which row gets which intermediate value is nondeterministic); (3) if the business actually wants daily balances → aggregate to one row per day first, then window over days. The transferable lesson: any time a window ORDER BY key can tie, decide RANGE vs ROWS deliberately instead of inheriting the default.',
      isCaseBased: true,
    },
    {
      question: 'A contacts table accumulated duplicate emails. Find them, then delete keeping one — and name an alternative approach with its tradeoff.',
      answer:
        'Find: GROUP BY email HAVING COUNT(*) > 1 — HAVING, because the predicate is about the group\'s count, which does not exist until after aggregation. Delete keeping the earliest: number rows per email with ROW_NUMBER() OVER (PARTITION BY email ORDER BY id), delete WHERE id IN (…rn > 1); the ORDER BY chooses the survivor (id DESC keeps the newest instead). Alternative: SELECT DISTINCT (or GROUP BY with MIN(id)) into a new table, then swap it in — simpler SQL and it rebuilds fresh, but it needs a maintenance window, must recreate indexes/constraints/FKs, and loses concurrent writes during the swap. In-place windowed DELETE wins on a live table; rebuild wins when the table is mostly duplicates. Close by preventing recurrence: add a UNIQUE constraint on email.',
      isCaseBased: false,
    },
    {
      question: 'Explain the frame clause. Write a 7-day moving average, and say why ROWS vs RANGE matters there.',
      answer:
        'The frame is the third dial of OVER: within the ordered partition, which slice does the function read? ROWS BETWEEN 6 PRECEDING AND CURRENT ROW reads the current row plus six physical rows back; RANGE defines the slice by VALUE distance and lumps ties together. Moving average: AVG(revenue) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW). The honesty that scores: "6 preceding ROWS" equals "last 7 days" only when there is exactly one row per day with no gaps. With missing days it silently averages the last 7 EXISTING rows — a longer real window. Fixes: join against a calendar/date spine so every day has a row, or use a value-based range where the engine supports date-interval frames. Also note the early rows: frames shorter than 7 just average what exists — decide whether to show or suppress them.',
      isCaseBased: false,
    },
    {
      question: 'What does NTILE(4) do, where would you use it, and what happens when rows do not divide evenly?',
      answer:
        'NTILE(4) OVER (ORDER BY x) deals the ordered rows into 4 buckets as evenly as possible and labels each row 1–4 — instant quartiles. Uses: spend quartiles for customer segmentation, latency quartiles in performance reports, splitting a workload into k roughly equal chunks. Uneven case: with n = 10 and 4 buckets, sizes are 3, 3, 2, 2 — the EARLIER buckets absorb the extras, so bucket sizes can differ by one. Two distinctions worth volunteering: NTILE assigns by position, so rows with equal values can land in different buckets (unlike a percentile cutoff on the value); and it is not PERCENT_RANK, which returns a continuous 0–1 rank rather than a bucket label.',
      isCaseBased: false,
    },
    {
      question: 'Case: product asks, "which users had a streak of 3+ consecutive active days last month?" Sketch the SQL idea.',
      answer:
        'The date-minus-ROW_NUMBER trick. Per user, take distinct login dates, number them by date: ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) AS rn. Inside a run of consecutive days, the date advances by 1 exactly as rn does — so date(login_date, \'-\' || rn || \' days\') is a CONSTANT anchor for the whole streak, and the anchor changes the moment a day is skipped. GROUP BY user_id, anchor; HAVING COUNT(*) >= 3 gives every qualifying streak (MIN/MAX of login_date give its endpoints). Details that show care: dedupe multiple logins per day first (DISTINCT date), or rn advances without the date advancing and the anchor drifts; and bound to last month in a WHERE before windowing. The idea generalizes to any "gaps and islands" question — consecutive IDs, unbroken sensor readings, subscription continuity.',
      isCaseBased: true,
    },
    {
      question: 'Why can\'t you filter on a window function in WHERE, and what evaluation order explains it?',
      answer:
        'Logical evaluation order: FROM → WHERE → GROUP BY → HAVING → SELECT (window functions computed here) → DISTINCT → ORDER BY → LIMIT. WHERE runs long before any window value exists, so WHERE rank = 1 references a number that has not been computed — engines reject it outright. Same reasoning bans windows in HAVING and in GROUP BY. The idiom: compute the window in a subquery or CTE, filter in the wrapper — SELECT … FROM (SELECT …, ROW_NUMBER() OVER (…) AS rn FROM t) WHERE rn = 1. Windows ARE legal in ORDER BY, which runs after SELECT. This order also explains a subtlety worth volunteering: window functions see rows AFTER the WHERE filter — filter first, rank second, and if you need ranks over the unfiltered table, window first in the CTE and filter outside.',
      isCaseBased: false,
    },
    {
      question: 'Give the general recipe for "top N per group". Which ranking function do you pick, and why does the pick matter?',
      answer:
        'Recipe: in a subquery or CTE, compute a rank per group — ROW_NUMBER() OVER (PARTITION BY group_col ORDER BY metric DESC, tiebreaker) — then filter the wrapper with WHERE rn <= N. The function choice is the whole question: ROW_NUMBER returns EXACTLY N rows per group, ties broken by your tiebreaker (add one, or the choice among ties is nondeterministic); DENSE_RANK <= N returns all tie-mates — possibly more than N rows — which is right when "top 3 salaries" means salary VALUES; RANK <= N can return fewer distinct values after big ties. So ask the clarifying question out loud: "top N rows, or top N values, and how should ties resolve?" — then the function picks itself. State the cost too: one sort per partition, O(n log n)-ish, no self-join — strictly better than the old correlated-subquery version.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Window function, one sentence', back: 'An aggregate computed over a set of related rows (the window) and written onto EACH row — no collapsing. Rows in = rows out.' },
    { front: 'The three dials of OVER (…)', back: 'PARTITION BY — restart per group. ORDER BY — sequence the partition (enables ranks, running totals, LAG). Frame (ROWS BETWEEN …) — which slice of the ordered partition the function reads.' },
    { front: 'Tie behavior on 100, 100, 90 (DESC)', back: 'ROW_NUMBER: 1, 2, 3 (never ties, arbitrary among equals). RANK: 1, 1, 3 (ties then SKIPS). DENSE_RANK: 1, 1, 2 (ties, no gaps).' },
    { front: 'LAG / LEAD', back: 'LAG(x) = x from the previous row in the window order; LEAD(x) = next row. First row\'s LAG is NULL (a default third argument can replace it). LAG(x, 12) = 12 rows back — YoY.' },
    { front: 'Running total idiom + its gotcha', back: 'SUM(x) OVER (PARTITION BY grp ORDER BY key). Gotcha: default frame is RANGE, which includes PEERS — tied ORDER BY values share one clumped total. Fix: unique key in ORDER BY, or explicit ROWS.' },
    { front: 'Moving average frame', back: 'AVG(x) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) = 7-point moving average. ROWS counts physical rows — equals 7 days only if no gaps; else join a calendar spine.' },
    { front: '2nd-highest salary — the four ways', back: '(1) MAX below MAX subquery. (2) DISTINCT + ORDER BY DESC + LIMIT 1 OFFSET 1. (3) DENSE_RANK = 2 in a wrapper. (4) Correlated count of distinct salaries above. Ship (3): it generalizes to nth and per-dept.' },
    { front: 'Nth-highest: the two traps', back: 'Ties — rank DISTINCT salaries (DISTINCT in way 2, DENSE_RANK not RANK in way 3). Absence — way 1 returns NULL free (MAX of empty set); ways 2–4 return zero rows, wrap as scalar subquery to get NULL.' },
    { front: 'Dedupe: find + delete keeping one', back: 'Find: GROUP BY col HAVING COUNT(*) > 1. Delete: ROW_NUMBER() OVER (PARTITION BY col ORDER BY id), delete rn > 1 — the ORDER BY picks the survivor. Then add a UNIQUE constraint.' },
    { front: 'Consecutive-days streak trick', back: 'Per user: date(login_date, \'-\' || ROW_NUMBER() OVER (ORDER BY login_date) || \' days\') is CONSTANT within a streak. GROUP BY that anchor; COUNT(*) = streak length. Dedupe dates first.' },
  ],
  mindmapMarkdown: `- Window Functions
  - Core idea: rows in = rows out — context, not collapse
  - OVER dials
    - PARTITION BY: restart per group
    - ORDER BY: ranking + running
    - frame: ROWS BETWEEN …
  - Ranking trio
    - ROW_NUMBER 1,2,3,4 — never ties
    - RANK 1,2,2,4 · DENSE_RANK 1,2,2,3
    - top-N per group: rn = 1 in a wrapper
  - LAG / LEAD: MoM delta; first row → NULL
  - Running & moving
    - SUM OVER ORDER BY — resets per partition
    - default RANGE includes peers (gotcha)
    - moving avg: ROWS 2 PRECEDING
    - NTILE(n): quartile buckets
  - Nth-highest, 4 ways
    - MAX below MAX — NULL for free
    - DISTINCT + LIMIT/OFFSET — DISTINCT or bust
    - DENSE_RANK = n — generalizes, per-dept
    - correlated count = n − 1
  - Duplicates: HAVING COUNT(*) > 1 → find; delete rn > 1
  - Dates: strftime('%Y-%m') buckets · streak = date − ROW_NUMBER`,
}

export default m
