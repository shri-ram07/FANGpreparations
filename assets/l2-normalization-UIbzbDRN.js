var e={id:`dbms-l2-normalization`,subjectId:`dbms`,level:2,title:`Normalization: 1NF → BCNF, One Table's Journey`,whyItMatters:`"Design the schema for X" is a guaranteed interview round, and normalization is how you defend every table you draw. This module takes ONE messy table on the full journey — 1NF → 2NF → 3NF → BCNF — killing one anomaly per step, then shows why real companies deliberately walk part of it back. After this, "is this table in 3NF?" stops being trivia and becomes something you can see.`,estMinutes:55,sections:[{type:`intuition`,title:`One spreadsheet, three ways to lie`,md:`A college registrar keeps everything in one spreadsheet: one row per student, courses crammed into a text cell. It gets imported into a database as-is. It "works" — until the day two rows disagree about who heads the CS department, and nobody can say which row is telling the truth.

- A database that stores the **same fact in many places** will eventually contradict itself. Not "might" — will. Someone always updates one copy and misses another.
- Normalization is the cure: a step-by-step procedure that reshapes tables until every fact has exactly one home.
- The steps are named **1NF, 2NF, 3NF, BCNF** — each one bans a specific way of storing a fact in the wrong place.
- We will push ONE table through all four, and watch a specific bug die at every step.
- Meet the patient first.`},{type:`code`,lang:`sql`,title:`The patient: the registrar's wide table`,code:`-- The registrar's spreadsheet, imported into a database as-is
CREATE TABLE report_card (
  student_id   INTEGER,
  student_name TEXT,
  dept         TEXT,
  dept_head    TEXT,
  courses      TEXT  -- packed: 'course_id:course_name:instructor:grade, ...'
);

INSERT INTO report_card VALUES
  (1, 'Asha',  'CS',   'Dr. Mehta',  'DB101:Databases:Rao:A, ML202:Machine Learning:Iyer:B'),
  (2, 'Bilal', 'CS',   'Dr. Mehta',  'DB101:Databases:Rao:A'),
  (3, 'Chen',  'Math', 'Dr. Kapoor', 'ML202:Machine Learning:Iyer:A');

-- "Who takes ML202?" — forced to grep inside a string:
SELECT student_name FROM report_card WHERE courses LIKE '%ML202%';
-- Asha, Chen. Works today. Silently wrong the day course 'ML202X' exists.`,annotations:{7:`A cell holding a LIST is called a repeating group. The database cannot see inside it — no indexing, no joining, no constraints on the pieces.`,11:`Asha takes two courses, so two facts share one cell. Chen takes one. Ragged, unqueryable.`,16:`String-matching instead of querying is the smell of a 1NF violation. LIKE cannot tell ML202 from ML202X — and it scans every row.`}},{type:`intuition`,title:`Step 1 — 1NF: one value per cell`,md:`**First Normal Form (1NF)**: every cell holds ONE atomic value — no lists, no packed strings, no repeating groups — and every row is unique (there is a key).

- Fix: explode the packed string into one row per (student, course) pair. Each piece gets its own column.
- The key becomes **composite**: (\`student_id\`, \`course_id\`) together identify a row — an enrollment.
- Honesty check: 1NF does not kill the anomalies. It does something more basic — it turns the blob into rows and columns the database can actually reason about.
- Now the diseases become visible. And queryable.`},{type:`code`,lang:`sql`,title:`1NF: the same facts, atomic`,code:`-- 1NF: one atomic value per cell, one row per enrollment fact
CREATE TABLE enrollments_1nf (
  student_id   INTEGER,
  student_name TEXT,
  dept         TEXT,
  dept_head    TEXT,
  course_id    TEXT,
  course_name  TEXT,
  instructor   TEXT,
  grade        TEXT,
  PRIMARY KEY (student_id, course_id)
);

INSERT INTO enrollments_1nf VALUES
  (1, 'Asha',  'CS',   'Dr. Mehta',  'DB101', 'Databases',        'Rao',  'A'),
  (1, 'Asha',  'CS',   'Dr. Mehta',  'ML202', 'Machine Learning', 'Iyer', 'B'),
  (2, 'Bilal', 'CS',   'Dr. Mehta',  'DB101', 'Databases',        'Rao',  'A'),
  (3, 'Chen',  'Math', 'Dr. Kapoor', 'ML202', 'Machine Learning', 'Iyer', 'A');

-- Real queries, at last:
SELECT AVG(CASE grade WHEN 'A' THEN 4 WHEN 'B' THEN 3 END) AS gpa
FROM enrollments_1nf
WHERE course_id = 'ML202';
-- 3.5   (Asha's B = 3, Chen's A = 4)`,annotations:{11:`Composite primary key: a row IS one enrollment. Remember this key — 2NF trouble starts exactly here.`,16:`Asha's name, dept, and dept head are now written once PER COURSE she takes. The redundancy is structural, not accidental.`,24:`Desk-check: ML202 rows are Asha (B→3) and Chen (A→4). AVG = 3.5.`}},{type:`intuition`,title:`Functional dependencies: X decides Y`,md:'A **functional dependency (FD)** is a promise between columns. Write it **X → Y**, read it "X decides Y": any two rows that agree on X must agree on Y.\n\n- `student_id → student_name`: ID 1 cannot be Asha in one row and Bilal in another.\n- `dept → dept_head`: every row saying CS must say the same head.\n- `course_id → course_name`: DB101 is always Databases.\n- `(student_id, course_id) → grade`: the grade needs BOTH — Asha\'s grade depends on which course you ask about.\n- NOT an FD: `dept → student_name` — two CS rows show Asha and Bilal. Agreeing on dept does not force agreeing on name.\n- Vocabulary: the left side is the **determinant**. A **candidate key** is a minimal set of columns that determines the whole row (there can be several; the primary key is the one you picked).\n- Normalization in one line: list every FD, then rearrange tables until every determinant is a key of its own table. The next three steps are exactly that.'},{type:`intuition`,title:`The three anomalies — count the lies waiting in this table`,md:`Look at \`enrollments_1nf\`. Four rows, but "Asha is in CS" is stored twice, "CS is headed by Dr. Mehta" three times, "Rao teaches DB101" twice. Three failure modes are now loaded:

- **Update anomaly**: Dr. Mehta retires. The new head must be written into all three CS rows. Update two, forget one — the table now holds two different CS heads. Two answers means no answer.
- **Insert anomaly**: a new course OS303 is approved, zero students so far. Its row would need a \`student_id\` — part of the primary key. You literally cannot store the course. (Same trap: a new student who hasn't enrolled yet.)
- **Delete anomaly**: Chen drops ML202. Delete that one row and you also erased the only record that Chen exists, that Math exists, and that Dr. Kapoor heads it. One DELETE, three unrelated facts gone.
- All three are ONE disease with three symptoms: a fact living in many rows, or hitchhiking on some other fact's row.`},{type:`hinglish`,md:`Normalization ka poora matlab ek line mein: **har fact ka sirf EK ghar.** "Dr. Mehta CS ke head hain" — yeh ek baat teen rows mein likhi thi. Kal Mehta retire hue, tumne do rows update ki aur teesri bhool gaye — ab database do alag sach bata raha hai, matlab ek bhi nahi. Ek hi baat teen jagah likhoge to ek din teeno alag ho jayengi, aur us din se database jhooth bolne lagega. Isliye har normal form ka kaam ek hi hai: jo fact baar-baar chhap raha hai, usse pakdo aur uska apna table de do. Fact ek jagah → update ek jagah → jhooth namumkin.`},{type:`intuition`,title:`Step 2 — 2NF: depend on the WHOLE key`,md:'**Second Normal Form (2NF)**: 1NF + no **partial dependency** — no non-key column may depend on just PART of a composite key.\n\n- Our key is (`student_id`, `course_id`). But `student_name`, `dept`, `dept_head` depend on `student_id` alone. `course_name` depends on `course_id` alone.\n- That is exactly WHY Asha and "Databases" repeat once per enrollment: student facts and course facts are chained to enrollment rows.\n- Fix: each partial determinant gets its own table where it is the WHOLE key. Enrollment keeps only what genuinely needs both halves: the grade, and (for now) the instructor.\n- Free theorem: if every candidate key is a single column, 2NF cannot be violated — "part of the key" needs a key with parts.'},{type:`code`,lang:`sql`,title:`2NF: student facts and course facts move out`,code:`-- 2NF: every non-key column must depend on the WHOLE key.
-- Violated FDs: student_id → student_name, dept, dept_head   (half the key)
--               course_id  → course_name                     (other half)
CREATE TABLE students (
  student_id   INTEGER PRIMARY KEY,
  student_name TEXT,
  dept         TEXT,
  dept_head    TEXT
);
CREATE TABLE courses (
  course_id    TEXT PRIMARY KEY,
  course_name  TEXT
);
CREATE TABLE enrollments (
  student_id INTEGER REFERENCES students(student_id),
  course_id  TEXT    REFERENCES courses(course_id),
  instructor TEXT,
  grade      TEXT,
  PRIMARY KEY (student_id, course_id)
);

INSERT INTO students VALUES
  (1, 'Asha',  'CS',   'Dr. Mehta'),
  (2, 'Bilal', 'CS',   'Dr. Mehta'),
  (3, 'Chen',  'Math', 'Dr. Kapoor');
INSERT INTO courses VALUES
  ('DB101', 'Databases'),
  ('ML202', 'Machine Learning');
INSERT INTO enrollments VALUES
  (1, 'DB101', 'Rao',  'A'),
  (1, 'ML202', 'Iyer', 'B'),
  (2, 'DB101', 'Rao',  'A'),
  (3, 'ML202', 'Iyer', 'A');

-- Just died: the INSERT anomaly. A course can exist with zero students:
INSERT INTO courses VALUES ('OS303', 'Operating Systems');`,annotations:{8:`Smell it already: dept_head does not belong to a student. It rode along with dept. That is 3NF's target — one step at a time.`,19:`The composite key survives only where the fact truly needs both halves: a grade belongs to a (student, course) pair.`,23:`Asha's name is now written ONCE, ever. Renaming a course touches exactly one row. The update anomaly on student/course facts is dead.`,36:`This INSERT was impossible in the wide table — half its primary key would have been NULL.`}},{type:`intuition`,title:`Step 3 — 3NF: nothing BUT the key`,md:`The \`students\` table still smells: \`student_id → dept → dept_head\`. The head depends on the key only THROUGH dept — a **transitive dependency** (a non-key column deciding another non-key column).

- Symptom: "Dr. Mehta" is still written once per CS student. Hire 3,000 CS students, store the head 3,000 times. The update anomaly survived 2NF — it just changed address.
- **Third Normal Form (3NF)**: 2NF + no transitive dependencies. Every non-key column must depend on the key **directly**.
- Fix: \`dept → dept_head\` is a fact ABOUT DEPARTMENTS. Give departments their own table, where dept is the key.
- Rule of thumb that catches 90% of violations: ask each column "who do you really describe?" If the answer isn't "the key of this table", it's in the wrong table.`},{type:`code`,lang:`sql`,title:`3NF: department facts move out`,code:`-- 3NF: dept_head depends on the key only THROUGH dept. Transitive → split.
CREATE TABLE departments (
  dept      TEXT PRIMARY KEY,
  dept_head TEXT
);
DROP TABLE IF EXISTS students;   -- pasting each step in sequence? drop the old shape first
CREATE TABLE students (
  student_id   INTEGER PRIMARY KEY,
  student_name TEXT,
  dept         TEXT REFERENCES departments(dept)
);

INSERT INTO departments VALUES
  ('CS',   'Dr. Mehta'),
  ('Math', 'Dr. Kapoor');
INSERT INTO students VALUES
  (1, 'Asha',  'CS'),
  (2, 'Bilal', 'CS'),
  (3, 'Chen',  'Math');

-- Just died: the DELETE anomaly. If Chen (the only Math student) drops out,
-- DELETE FROM students WHERE student_id = 3 no longer erases Math itself —
-- departments('Math', 'Dr. Kapoor') stands on its own row.`,annotations:{4:`"Dr. Mehta heads CS" now exists exactly once, whether CS has 2 students or 20,000. His retirement is a one-row UPDATE.`,10:`The foreign key keeps the connection — students still have a dept; the dept just stopped dragging its head along.`,22:`Facts no longer hitchhike on other facts' rows. That is the whole point of the split.`}},{type:`intuition`,title:`Step 4 — BCNF: EVERY determinant is a key`,md:"One table still hides redundancy: `enrollments(student_id, course_id, instructor, grade)`. Add this college's rule: **each instructor teaches exactly one course**. That's a new FD: `instructor → course_id`.\n\n- Candidate keys of enrollments are now TWO: (`student_id`, `course_id`) and (`student_id`, `instructor`) — knowing the instructor tells you the course.\n- 3NF check… passes! 3NF forgives an FD whose right side is a **prime attribute** (a column that belongs to some candidate key). `course_id` is prime, so `instructor → course_id` slips through on a technicality.\n- But look at the data: \"Rao teaches DB101\" is stored once per Rao student. Redundancy is sitting right there, wearing a 3NF certificate.\n- **Boyce-Codd Normal Form (BCNF)** asks the blunt question with no exceptions: for every non-trivial FD, is the determinant a candidate key? `instructor` is not. Split.\n- This student-course-instructor table is THE classic 3NF-but-not-BCNF example — interviewers reach for it by reflex."},{type:`code`,lang:`sql`,title:`BCNF: the teaching fact moves out`,code:`-- College rule: each instructor teaches exactly ONE course.
-- FD instructor → course_id, but 'instructor' is no candidate key. BCNF split:
CREATE TABLE teaching (
  instructor TEXT PRIMARY KEY,
  course_id  TEXT REFERENCES courses(course_id)
);
DROP TABLE IF EXISTS enrollments;   -- replacing the 3NF shape with the BCNF one
CREATE TABLE enrollments (
  student_id INTEGER REFERENCES students(student_id),
  instructor TEXT    REFERENCES teaching(instructor),
  grade      TEXT,
  PRIMARY KEY (student_id, instructor)
);

INSERT INTO teaching VALUES
  ('Rao',  'DB101'),
  ('Iyer', 'ML202');
INSERT INTO enrollments VALUES
  (1, 'Rao',  'A'),
  (1, 'Iyer', 'B'),
  (2, 'Rao',  'A'),
  (3, 'Iyer', 'A');

-- Just died: 'Rao teaches DB101' was stored once per Rao student. Now: once.
-- If Rao moves to OS303 next term, that is ONE update — and a new instructor
-- can be recorded before a single student enrolls.`,annotations:{4:`The offending determinant becomes the primary key of its own table. That is the BCNF move in one line.`,12:`New key: (student_id, instructor). The course is reachable through teaching — stored zero extra times.`,24:`Both remaining anomalies on the teaching fact — update and insert — died together.`}},{type:`note`,md:'The fine print interviewers love: this BCNF split is **lossless** (joins rebuild every original row — proof below) but NOT **dependency-preserving**. The old rule `(student_id, course_id) → instructor` — "a student takes a course from one instructor" — now spans two tables, so no primary key can enforce it. If a second DB101 instructor is hired, a student could enroll with both, and only a trigger or app-level check would catch it. This is the real 3NF-vs-BCNF tradeoff: 3NF can always be reached while preserving every FD; BCNF sometimes cannot. Pragmatic teams facing that choice often stop at 3NF — knowing this beats reciting definitions.'},{type:`code`,lang:`sql`,title:`The lossless-join check: rebuild the original report`,code:`-- Can 5 clean tables reproduce the wide table's facts? Join and see.
SELECT s.student_name, d.dept_head, c.course_name, e.instructor, e.grade
FROM enrollments e
JOIN students    s ON s.student_id = e.student_id
JOIN departments d ON d.dept       = s.dept
JOIN teaching    t ON t.instructor = e.instructor
JOIN courses     c ON c.course_id  = t.course_id
ORDER BY s.student_name, c.course_name;
-- Asha  | Dr. Mehta  | Databases        | Rao  | A
-- Asha  | Dr. Mehta  | Machine Learning | Iyer | B
-- Bilal | Dr. Mehta  | Databases        | Rao  | A
-- Chen  | Dr. Kapoor | Machine Learning | Iyer | A
-- Same 4 facts as the 1NF table. Nothing lost — only the copies are gone.`,annotations:{6:`The course now arrives THROUGH teaching: enrollment knows the instructor, teaching knows the instructor's course.`,13:`Lossless join: the decomposition stored the same information in less space, with zero contradictions possible.`}},{type:`note`,md:`Do the journey with your own hands: paste each step's CREATE + INSERT statements into the [SQL playground](/playground/sql), run the anomaly experiments, then run the rebuild join. Ten minutes of typing makes this permanent.`},{type:`visual`,component:`PointerBoxDiagram`,props:{title:`One table's journey: 1NF → 2NF → 3NF → BCNF`,notice:`Left: the FDs (arrows) and their verdicts. Right: the tables. Step through and watch each flagged FD force a split — until every arrow starts at a key.`,leftLabel:`functional dependencies`,rightLabel:`tables`,frames:[{note:`The raw spreadsheet. One row per student, courses packed into a string. Not even 1NF: a cell holds a list.`,stack:[{name:`courses cell`,value:`a LIST — not atomic`,to:`raw`,danger:!0}],heap:[{id:`raw`,value:`report_card — packed strings`,label:`the wide table`}]},{note:`1NF done: atomic cells, key = (student_id, course_id). Now the FDs are visible — and two of them point at only HALF the key. Partial dependencies: 2NF violated.`,stack:[{name:`student_id → name, dept, head`,value:`partial: half the key`,to:`wide`,danger:!0},{name:`course_id → course_name`,value:`partial: half the key`,to:`wide`,danger:!0},{name:`(student, course) → grade`,value:`whole key — fine`,to:`wide`}],heap:[{id:`wide`,value:`enrollments_1nf — 8 columns`,label:`key: student_id + course_id`}]},{note:`2NF: the partial determinants got their own tables. But inside students, dept → dept_head reaches the key only through dept — a transitive dependency. 3NF violated.`,stack:[{name:`student_id → dept → dept_head`,value:`transitive chain`,to:`s2`,danger:!0},{name:`course_id → course_name`,value:`key of courses`,to:`c2`},{name:`(student, course) → instructor, grade`,value:`whole key`,to:`e2`}],heap:[{id:`s2`,value:`students(id, name, dept, dept_head)`,label:`hiding a department fact`},{id:`c2`,value:`courses(course_id, course_name)`,label:`clean`},{id:`e2`,value:`enrollments(student, course, instructor, grade)`,label:`clean… for now`}]},{note:`3NF: departments extracted. One FD left: instructor → course_id (each instructor teaches one course). Its determinant is NOT a candidate key — 3NF forgives it because course_id is prime; BCNF does not.`,stack:[{name:`dept → dept_head`,value:`dept IS the key now`,to:`d3`},{name:`instructor → course_id`,value:`determinant is not a key`,to:`e3`,danger:!0}],heap:[{id:`d3`,value:`departments(dept, dept_head)`,label:`clean`},{id:`s3`,value:`students(id, name, dept)`,label:`clean`},{id:`c3`,value:`courses(course_id, course_name)`,label:`clean`},{id:`e3`,value:`enrollments(student, course, instructor, grade)`,label:`Rao→DB101 repeats per student`}]},{note:`BCNF: teaching(instructor → course) extracted. Every arrow now starts at a key of its own table. No fact is stored twice. The journey ends here — five tables, zero redundancy.`,stack:[{name:`dept → dept_head`,value:`key`,to:`d4`},{name:`student_id → name, dept`,value:`key`,to:`s4`},{name:`course_id → course_name`,value:`key`,to:`c4`},{name:`instructor → course_id`,value:`key`,to:`t4`},{name:`(student, instructor) → grade`,value:`key`,to:`e4`}],heap:[{id:`d4`,value:`departments`,label:`dept is key`},{id:`s4`,value:`students`,label:`student_id is key`},{id:`c4`,value:`courses`,label:`course_id is key`},{id:`t4`,value:`teaching`,label:`instructor is key`},{id:`e4`,value:`enrollments`,label:`(student, instructor) is key`}]}]}},{type:`intuition`,title:`Denormalization: breaking the rules with eyes open`,md:`Everything above optimized WRITES: every fact once, so an update touches one row and the database cannot contradict itself. The bill went to READS — our simple report became a 5-table join.

- At real scale the bill is real: 100M enrollments, a dashboard hit 1,000×/sec. Five joins per page view is CPU you can feel and latency users can see.
- **Denormalization** = copying data back in ON PURPOSE: an \`enrolled_count\` column on courses (a **materialized aggregate**), a pre-joined wide table for analytics (the warehouse **star schema**: one fact table ringed by descriptive dimension tables), a course name embedded in a read-side report table.
- The eyes-open contract, three clauses: you know WHICH fact is copied; you own WHO updates every copy (trigger, nightly batch, event stream); you state HOW stale a read may be.
- Unnormalized is an accident nobody owns. Denormalized is a decision somebody maintains. Same-looking tables, opposite engineering.
- Where you'll meet it: analytics warehouses (star schemas everywhere), read-heavy catalogs, counters and leaderboards, document stores embedding whole objects to serve one read.
- The interview line: **"normalize until it hurts, denormalize until it works."** Decoded: the OLTP core stays 3NF/BCNF because correctness is non-negotiable; redundancy returns only for a MEASURED read bottleneck — never on vibes.`},{type:`note`,md:`The mnemonic that survives interviews — every non-key column must depend on **the key (1NF gives it a key), the whole key (2NF), and nothing but the key (3NF) — so help me Codd**. BCNF is the fine print: every determinant must be a key, no prime-attribute exceptions. Say the mnemonic, then prove it on this module's table.`}],quiz:[{question:`The FD dept → dept_head means…`,options:[{text:`Any two rows that agree on dept must show the same dept_head`,explanation:`Correct — that is the definition of X → Y: agreeing on X forces agreeing on Y. "dept decides dept_head."`},{text:`Every dept_head runs exactly one dept`,explanation:`That is the reverse arrow, dept_head → dept. Nothing stops one person heading two departments under dept → dept_head.`},{text:`dept must be the table's primary key`,explanation:`An FD is a constraint between columns, not a key declaration. Keys are just FDs that determine the WHOLE row.`}],correct:0},{question:`enrollments_1nf has key (student_id, course_id), and student_name depends on student_id alone. Which normal form breaks first?`,options:[{text:`1NF`,explanation:`Values are atomic and rows have a key — 1NF is satisfied. The problem is where the FD points, not what cells hold.`},{text:`2NF — a partial dependency on part of the composite key`,explanation:`Correct. A non-key column hanging off HALF the key is exactly what 2NF bans — and exactly why Asha's name repeats per enrollment.`},{text:`3NF`,explanation:`3NF targets transitive chains (non-key → non-key). This FD points at part of the key — that is 2NF's department.`}],correct:1},{question:`students(student_id PK, name, dept, dept_head) with FD dept → dept_head. Which form is violated?`,options:[{text:`2NF`,explanation:`The key is a single column — partial dependencies are impossible without a composite key. 2NF holds automatically.`},{text:`3NF — dept_head reaches the key only through dept (transitive)`,explanation:`Correct. student_id → dept → dept_head is a two-hop chain; a non-key column decides another non-key column.`},{text:`1NF`,explanation:`Every cell is atomic and there is a key. The table is fine by 1NF — its problem is subtler.`}],correct:1},{question:`A new course is approved with zero students, and the wide table cannot store it because half its primary key would be NULL. Name the anomaly.`,options:[{text:`Insert anomaly`,explanation:`Correct — a fact (the course exists) cannot be recorded until an unrelated fact (some enrollment) exists.`},{text:`Update anomaly`,explanation:`Update anomalies are about changing a fact stored in many rows and missing copies — nothing is being changed here.`},{text:`Delete anomaly`,explanation:`Delete anomalies are about one DELETE erasing extra facts. This is the mirror image: an INSERT that is impossible.`}],correct:0},{question:`A table is in 3NF but not BCNF exactly when…`,options:[{text:`Some non-trivial FD has a determinant that is not a candidate key, but its right side is a prime attribute`,explanation:`Correct — the prime-attribute exception is the only daylight between the two forms. Our instructor → course_id (course_id prime) is the classic case.`},{text:`The table has two candidate keys`,explanation:`Multiple candidate keys are perfectly legal in BCNF. The trouble is a DETERMINANT that is not one of them.`},{text:`A transitive dependency exists`,explanation:`A transitive dependency already breaks 3NF — such a table would not be in 3NF in the first place.`}],correct:0},{question:`Every candidate key of a table is a single column. Which normal form is guaranteed for free?`,options:[{text:`2NF — partial dependencies need a key with parts`,explanation:`Correct. "Depends on part of the key" is meaningless when no key has parts. 1NF + single-column keys ⇒ 2NF automatically.`},{text:`3NF`,explanation:`Not guaranteed — our students table had a single-column key and still hid the transitive dept → dept_head.`},{text:`BCNF`,explanation:`Not guaranteed — a non-key determinant like dept → dept_head can still exist with a single-column primary key.`}],correct:0},{question:`When is denormalization the RIGHT call?`,options:[{text:`When writing multi-table joins feels tedious`,explanation:`Tedium is solved by a view or an ORM, for free. Denormalization costs correctness risk — it needs a better reason than typing.`},{text:`A measured read bottleneck on a known query, plus an owned plan for keeping every copy in sync`,explanation:`Correct — deliberate redundancy with eyes open: known copy, known updater, known staleness budget.`},{text:`Always at scale — reads dominate writes everywhere`,explanation:`A blanket rule throws away update-safety on tables that never had a read problem. The OLTP core stays normalized; hot READ PATHS get the copies.`}],correct:1},{question:`After the BCNF split of enrollments into teaching + enrollments, what was genuinely lost?`,options:[{text:`Some rows — the decomposition is lossy`,explanation:`No — the rebuild join reproduces all four original facts exactly. The decomposition is lossless.`},{text:`The ability to enforce (student_id, course_id) → instructor with keys alone`,explanation:`Correct. That FD now spans two tables — dependency preservation is lost, and only a trigger or app check can enforce the old rule.`},{text:`The FD instructor → course_id`,explanation:`The opposite — that FD got PROMOTED: instructor is now the primary key of teaching, so the FD is enforced by the schema itself.`}],correct:1}],interviewQuestions:[{question:`Whiteboard: explain normalization in three minutes, with an example.`,answer:`Draw one wide table (student, dept, dept_head, course, instructor, grade) and show the three anomalies in 30 seconds: update (dept head stored per row — miss a copy and the table contradicts itself), insert (can't store a new course with no students), delete (last enrollment erases the department). Then the cure: every fact gets exactly one home. Name the tools — a functional dependency X → Y means "X decides Y" — and the ladder: 1NF atomic cells, 2NF no dependency on part of a composite key, 3NF no transitive non-key → non-key chains, BCNF every determinant is a candidate key. Close with the tradeoff: this optimizes writes; reads now pay joins, which is why read-heavy paths sometimes denormalize deliberately. Story before definitions is what scores.`,isCaseBased:!1},{question:`Give 1NF, 2NF, 3NF, and BCNF in one line each.`,answer:`1NF: every cell atomic, no repeating groups, rows keyed. 2NF: 1NF + no non-key column depends on only part of a composite key. 3NF: 2NF + no transitive dependencies — non-key columns may not decide other non-key columns. BCNF: for every non-trivial FD, the determinant is a candidate key — no exceptions, not even for prime attributes. Bonus line that lands well: "the key, the whole key, and nothing but the key."`,isCaseBased:!1},{question:`Case: changing one customer's address in production requires updating 50,000 order rows, and support keeps finding orders with the OLD address. Diagnose and fix.`,answer:`Diagnosis: the FD customer_id → address lives in the orders table — a fact about customers stored once per order. Classic update anomaly; the "old address" rows are the missed copies. Fix: extract customers(customer_id PK, address, …), keep customer_id as an FK in orders, backfill, then drop the column — with a dual-write window during migration. The senior twist: ASK whether orders need the address AS IT WAS at purchase time. A shipping snapshot is a DIFFERENT fact (address-at-order-time) and legitimately belongs on the order row — that is not redundancy, it is history. Distinguishing "same fact copied" from "point-in-time snapshot" is the answer interviewers wait for.`,isCaseBased:!0},{question:`When would you deliberately stop at 3NF instead of pushing to BCNF?`,answer:`When the BCNF decomposition is not dependency-preserving: some FD would span two tables, becoming unenforceable by keys alone (our (student, course) → instructor after splitting out teaching). Then you choose: BCNF with a trigger/app check guarding the lost FD, or 3NF with a little redundancy guarded by the schema itself. Theory guarantees a lossless, dependency-preserving 3NF decomposition always exists; BCNF has no such guarantee. In practice most tables' 3NF and BCNF coincide — the gap only opens with overlapping composite candidate keys — so "stop at 3NF" is rarer than textbooks imply, but knowing WHY it happens is the differentiator.`,isCaseBased:!1},{question:`Case: your analytics dashboard runs a 6-way join and page loads take 4 seconds. The team shouts "denormalize!" Walk through your actual decision process.`,answer:`Measure first: EXPLAIN the query — which join or scan dominates? Cheapest fixes first: indexes on the join and filter columns, maybe a covering index; often the 4 seconds is a missing index, not a schema problem. Next rung: a materialized view / summary table refreshed on a schedule — precomputed join, base tables untouched. Only then true denormalization: a wide read-optimized table or maintained aggregates, fed by triggers, batch ETL, or an event stream. State the staleness budget out loud ("dashboard may lag 5 minutes") and keep the OLTP write path normalized — this is the write-model/read-model split. Answer shape that wins: index → materialized view → denormalized read table, each step justified by a measurement.`,isCaseBased:!0},{question:`Name the three anomalies and give a one-line example of each.`,answer:`Update anomaly: a fact stored in N rows — change dept_head, update 2 of 3 copies, the table now holds two truths. Insert anomaly: a fact can't exist alone — a new course can't be stored because the primary key demands a student_id. Delete anomaly: removing the last enrollment of the only Math student also erases the fact that Math exists and who heads it. All three are one disease: a fact without its own home.`,isCaseBased:!1},{question:`Construct a table that is in 3NF but not BCNF, and show why both claims hold.`,answer:`enrollments(student, course, instructor) with two rules: an instructor teaches exactly one course (instructor → course), and a student takes a given course under one instructor ((student, course) → instructor). Candidate keys: (student, course) and (student, instructor). 3NF holds: the only suspicious FD is instructor → course, and course is a prime attribute (part of a candidate key) — 3NF's exception forgives it. BCNF fails: instructor is a determinant but not a candidate key. The redundancy is visible: the instructor's course is re-stored for every student they teach. This is THE textbook example — know it cold.`,isCaseBased:!1},{question:`Is a table with only two columns always in BCNF? Argue it.`,answer:`Yes. Take R(A, B). Non-trivial FDs can only be A → B or B → A. If neither holds, the only candidate key is {A, B} and there are no non-trivial FDs to violate anything. If A → B holds, A is a candidate key, so that FD's determinant is a key; symmetrically for B → A; if both hold, both are keys. Every possible determinant is a candidate key — BCNF by exhaustion. Nice corollary to mention: normalization pushed to the extreme produces many tiny tables, and two-column tables are automatically safe.`,isCaseBased:!1},{question:`Document stores like MongoDB embed (denormalize) by default. Why does that make sense there, and what is the price?`,answer:`Why: no server-side joins worth the name, so data read together should live together — one document fetch serves the whole page; and under sharding, cross-node joins are brutal, while a self-contained document lives happily on one shard. The price: shared facts fan out — rename a product embedded in 10M order documents and you run a 10M-document update (or accept stale copies); no FK constraints watching the copies. Working rule: embed what is read together and rarely changes independently; reference what is shared and hot. It is the same normalize-vs-denormalize tradeoff — the storage engine just moves the default.`,isCaseBased:!1},{question:`Case: a users table has a phone_numbers column storing "98331-11111, 98442-22222". What breaks, and how do you fix it without downtime?`,answer:`This is a 1NF violation — a repeating group. What breaks: no index can find "who owns 98442-22222" (full scan with LIKE, plus false substring matches), no uniqueness or format constraint per number, concurrent edits rewrite the whole string and race, and joining numbers to anything is string surgery. Fix: child table phone_numbers(user_id FK, phone, type, UNIQUE(phone)); migrate online — create the table, backfill by splitting, dual-write both shapes behind a flag, switch reads, drop the column. Honest caveat worth saying: if the list is truly opaque (never searched or joined, only displayed), a JSON column is a defensible pragmatic exception — 1NF serves querying, and this data is never queried per-item.`,isCaseBased:!0},{question:`"Normalize until it hurts, denormalize until it works." Defend the line, then attack it.`,answer:`Defense: it encodes the correct priority order — normalization protects write correctness (anomalies are data corruption in slow motion), so it is the default; redundancy returns only when a real read bottleneck exists, i.e., on evidence. Attack: "hurts" and "works" are feelings, not measurements — the line gets abused to denormalize because joins are annoying, or to over-normalize an analytics schema that needed a star schema from day one. The upgraded version: normalize the OLTP write model to 3NF/BCNF, denormalize specific read paths on measured need, and for every copy name its owner and staleness budget. Tradeoffs stated in numbers beat slogans.`,isCaseBased:!1}],flashcards:[{front:`Functional dependency X → Y`,back:`"X decides Y": any two rows agreeing on X must agree on Y. Left side = determinant.`},{front:`1NF`,back:`Every cell atomic — no lists, no repeating groups — and rows have a key.`},{front:`2NF`,back:`1NF + no partial dependency: no non-key column depends on just PART of a composite key.`},{front:`3NF`,back:`2NF + no transitive dependency: non-key columns never decide other non-key columns.`},{front:`BCNF`,back:`Every non-trivial FD's determinant is a candidate key. No prime-attribute exception.`},{front:`The three anomalies`,back:`Update: change one fact, must touch many rows. Insert: fact can't exist without an unrelated fact. Delete: one DELETE erases extra facts.`},{front:`Classic 3NF-but-not-BCNF table`,back:`enrollments(student, course, instructor): instructor → course, keys (student, course) and (student, instructor). course is prime → 3NF passes, BCNF fails.`},{front:`Cost of the BCNF split`,back:`It can lose dependency preservation: an FD ends up spanning two tables, enforceable only by triggers/app code. 3NF never has to lose it.`},{front:`When to denormalize`,back:`Measured read bottleneck + owned sync plan (trigger/batch/event) + stated staleness budget. Decision, not accident.`},{front:`The mnemonic`,back:`"The key, the whole key, and nothing but the key — so help me Codd." (2NF, 3NF; BCNF adds: every determinant IS a key.)`}],mindmapMarkdown:`- Normalization: 1NF → BCNF
  - Functional dependencies
    - X → Y: agree on X ⇒ agree on Y
    - determinant = left side
    - candidate key decides the whole row
  - Anomalies (the disease)
    - update: one fact, many rows
    - insert: fact can't exist alone
    - delete: last row takes facts with it
  - 1NF
    - atomic cells
    - no packed strings / repeating groups
  - 2NF
    - no partial dependency on part of a composite key
    - student & course facts move out
  - 3NF
    - no transitive non-key → non-key chains
    - dept → dept_head gets its own table
  - BCNF
    - every determinant a candidate key
    - instructor → course: the classic catch
    - cost: may lose dependency preservation
  - Denormalization
    - measured read pain: joins at scale
    - star schemas, materialized aggregates
    - copy + owner + staleness budget
    - normalize till it hurts, denormalize till it works`};export{e as default};