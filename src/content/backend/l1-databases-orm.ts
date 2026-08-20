import type { Module } from '../types'

const m: Module = {
  id: 'backend-l1-databases-orm',
  subjectId: 'backend',
  level: 1,
  title: 'Talking to Databases: SQLAlchemy, Sessions & the N+1 Trap',
  whyItMatters: `"Tell me about the N+1 query problem" is on this plan's interview-theme list for one reason: it is the bug that passes code review, passes dev, and then triples your p99 in production. This module gives you the mechanism, the two-line fix, and the exact sentences an interviewer is listening for — plus the session, migration and pooling habits that separate a toy CRUD app from one that survives traffic.`,
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'An ORM is a translator, not a replacement for the language',
      md: `You land in a country you don't speak and hire a translator. Fast, fluent, saves you a year of grammar. But you still need to know *what you are saying* — and this translator bills per sentence, and sometimes turns your one sentence into five.

- **ORM** (Object-Relational Mapper) = a library that maps database rows to Python objects and back. SQLAlchemy is the Python one.
- **What it buys:** rows become typed objects; parameters are *bound*, not string-glued, so SQL injection dies; one codebase runs on SQLite and PostgreSQL; relationships, migrations and change-tracking come along free.
- **What it costs:** the SQL is generated *out of sight*. One innocent attribute access can be a network round trip. The abstraction leaks the moment you need a window function, a real query plan, or a bulk write.
- The sentence to say in an interview: **the ORM is a convenience, not a substitute for knowing SQL.**
- You still read \`EXPLAIN\`. You still know what a join costs and which index it uses. That is the DBMS subject, and it does not stop being your job here.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'SQLAlchemy 2.0 declarative models',
      code: `from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class Author(Base):
    __tablename__ = 'authors'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), index=True)
    books: Mapped[list['Book']] = relationship(back_populates='author')

class Book(Base):
    __tablename__ = 'books'
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str]
    author_id: Mapped[int] = mapped_column(ForeignKey('authors.id'))
    author: Mapped['Author'] = relationship(back_populates='books')`,
      annotations: {
        9: 'The 2.0 style: the Python type annotation IS the column type. Mapped[int] + primary_key gives INTEGER PRIMARY KEY.',
        10: 'mapped_column carries the SQL-side details: length, index, nullable, server defaults.',
        11: 'relationship() is NOT a column — no data lives here. It is the Python-side navigation handle, and it is LAZY by default. Remember this line; it is where N+1 is born.',
        16: 'Bare Mapped[str] means NOT NULL. Mapped[str | None] would be nullable. The annotation is load-bearing, not decoration.',
        17: 'ForeignKey is the real database constraint. relationship() needs it to know how to join — one is the contract, the other is the convenience.',
        18: "back_populates wires both sides: appending to author.books also sets book.author in memory, before any SQL runs.",
      },
    },
    {
      type: 'intuition',
      title: 'Engine, Session, and one unit of work per request',
      md: `Two objects, two very different lifetimes. Mixing them up is the most common SQLAlchemy bug.

- **Engine** = the connection pool + the SQL dialect. Expensive to build. Create **exactly one, at process startup**, and never per request.
- **Session** = the workspace for one unit of work. Cheap, short-lived, **not thread-safe**, one per request.
- Inside a session there is an **identity map**: one database row = one Python object. Query the same author twice, get the *same* object back — no second SELECT.
- **Unit of work**: \`db.add()\` and attribute edits are only *queued*. \`flush()\` sends the SQL. \`commit()\` makes it permanent and ends the transaction.
- Never a module-level global session. It grows forever, holds a connection hostage, and two concurrent requests will corrupt each other's transaction.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The FastAPI session dependency — the pattern to memorize',
      code: `from fastapi import Depends, FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

engine = create_engine(
    'postgresql+psycopg://user:pw@localhost/app',
    pool_size=10, max_overflow=5, pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

app = FastAPI()

@app.post('/authors')
def create_author(name: str, db: Session = Depends(get_db)):
    a = Author(name=name)
    db.add(a)
    db.flush()
    return {'id': a.id}`,
      annotations: {
        5: 'ONE engine, at import/startup. It owns the pool. Building an engine per request throws away pooling entirely and is a classic latency bug.',
        9: 'expire_on_commit=False: objects stay readable after commit. The default (True) marks every attribute stale, so touching a.name after commit fires a fresh SELECT — surprise queries during response serialization.',
        14: 'yield hands the session to the route. Everything after yield runs at request teardown. One session per request, created here, destroyed here.',
        15: 'One transaction per request: commit once, at the end. A half-written request never lands.',
        17: 'Any exception rolls back. Without this the connection goes back to the pool holding a dirty, open transaction.',
        20: 'close() ALWAYS runs — it returns the connection to the pool. Forget it and the pool drains until every request hangs.',
        28: 'flush() sends the INSERT and fills in the database-generated id, without ending the transaction. The commit still happens in get_db.',
      },
    },
    {
      type: 'note',
      md: 'Transaction rule for the whole request lifecycle, in one line: **open on first query, commit once at the end, roll back on any exception, always close.** If a route needs a partial save that survives a later failure, that is a *separate* transaction and you should say so out loud — silently sprinkling `commit()` mid-route is how half-created orders happen.',
    },
    {
      type: 'intuition',
      title: 'Lazy loading: the default that sets the trap',
      md: `You order a pizza. It arrives. Then you phone back to ask what's on it — one call per topping.

- \`relationship()\` defaults to **lazy loading**: \`author.books\` is an empty placeholder until you *touch* it. Touching it runs SQL, right there.
- Why is that the default? Because eager-loading everything could pull half your database for one row — an author, their books, each book's reviews, each review's user…
- The consequence, and it is the whole module: **your query count depends on what your code touches, not on what your query says.**
- That is the leak. The SQL is real, it costs real milliseconds, and it is invisible at the call site.`,
    },
    {
      type: 'intuition',
      title: 'The N+1 query problem',
      md: `You ask the librarian for 5 authors — one walk to the desk. Then, for each author, you walk *back* to the desk to ask what they wrote. Six walks for information one question could have fetched.

- **1** query fetches the parents. **N** more queries fetch each parent's children, one at a time. Hence **N+1**.
- The cost is not rows — it is **round trips**. Each is ~0.5–2 ms of network, parse and plan. 500 authors ≈ 500 ms of pure waiting, on a query that returns almost no data.
- It never shows up in code review, because *the second query has no code*. It is an attribute access.
- It never shows up in dev, because you seeded 3 rows. It shows up in prod, on page 40, at 3am.
- Fix names to have ready: **selectinload**, **joinedload**, or drop to a real join / aggregate.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The bug — and the SQL it actually sends',
      code: `from sqlalchemy import select

@app.get('/authors')
def list_authors(db: Session = Depends(get_db)):
    authors = db.scalars(select(Author).limit(5)).all()
    return [
        {'name': a.name, 'books': [b.title for b in a.books]}
        for a in authors
    ]

# What echo=True prints:
# SELECT ... FROM authors LIMIT 5               <- 1
# SELECT ... FROM books WHERE author_id = 1     <- 2
# SELECT ... FROM books WHERE author_id = 2     <- 3
# SELECT ... FROM books WHERE author_id = 3     <- 4
# SELECT ... FROM books WHERE author_id = 4     <- 5
# SELECT ... FROM books WHERE author_id = 5     <- 6`,
      annotations: {
        5: 'Query 1. It reads the authors table and nothing else — books is still an unloaded placeholder.',
        7: 'a.books is an ATTRIBUTE ACCESS that secretly runs SQL. Nothing on this line spells "query". That is exactly why N+1 survives review.',
        12: 'The 1.',
        13: 'The N. Five authors, five extra round trips. Five hundred authors, five hundred. Latency multiplies; the payload barely changes.',
      },
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'The N+1 storm, one query at a time',
        notice: 'Left column = queries actually sent to the database. Right column = author rows in memory. Red arrows are the queries nobody wrote.',
        leftLabel: 'queries sent',
        rightLabel: 'rows in memory',
        frames: [
          {
            note: 'Query 1: SELECT * FROM authors LIMIT 5. One round trip, five author rows. books is NOT loaded — it is a lazy placeholder.',
            stack: [{ name: 'Q1 authors', value: '5 rows' }],
            heap: [
              { id: 'a1', value: 'author 1', label: 'books ?' },
              { id: 'a2', value: 'author 2', label: 'books ?' },
              { id: 'a3', value: 'author 3', label: 'books ?' },
              { id: 'a4', value: 'author 4', label: 'books ?' },
              { id: 'a5', value: 'author 5', label: 'books ?' },
            ],
          },
          {
            note: 'The loop touches author 1. Reading a.books fires a hidden SELECT — query 2. No line of your code asked for it.',
            stack: [
              { name: 'Q1 authors', value: '5 rows' },
              { name: 'Q2 books a=1', to: 'a1', danger: true },
            ],
            heap: [
              { id: 'a1', value: 'author 1', label: 'loaded' },
              { id: 'a2', value: 'author 2', label: 'books ?' },
              { id: 'a3', value: 'author 3', label: 'books ?' },
              { id: 'a4', value: 'author 4', label: 'books ?' },
              { id: 'a5', value: 'author 5', label: 'books ?' },
            ],
          },
          {
            note: 'Authors 2 and 3: two more hidden SELECTs. Each is a full network round trip — connect, send, parse, plan, return.',
            stack: [
              { name: 'Q1 authors', value: '5 rows' },
              { name: 'Q2 books a=1', to: 'a1', danger: true },
              { name: 'Q3 books a=2', to: 'a2', danger: true },
              { name: 'Q4 books a=3', to: 'a3', danger: true },
            ],
            heap: [
              { id: 'a1', value: 'author 1', label: 'loaded' },
              { id: 'a2', value: 'author 2', label: 'loaded' },
              { id: 'a3', value: 'author 3', label: 'loaded' },
              { id: 'a4', value: 'author 4', label: 'books ?' },
              { id: 'a5', value: 'author 5', label: 'books ?' },
            ],
          },
          {
            note: 'Loop done: 5 authors, 6 queries. That is 1 + N. Swap 5 for 500 and it is 501 round trips — roughly a second of waiting for a page of JSON.',
            stack: [
              { name: 'Q1 authors', value: '5 rows' },
              { name: 'Q2 books a=1', to: 'a1', danger: true },
              { name: 'Q3 books a=2', to: 'a2', danger: true },
              { name: 'Q4 books a=3', to: 'a3', danger: true },
              { name: 'Q5 books a=4', to: 'a4', danger: true },
              { name: 'Q6 books a=5', to: 'a5', danger: true },
            ],
            heap: [
              { id: 'a1', value: 'author 1', label: 'loaded' },
              { id: 'a2', value: 'author 2', label: 'loaded' },
              { id: 'a3', value: 'author 3', label: 'loaded' },
              { id: 'a4', value: 'author 4', label: 'loaded' },
              { id: 'a5', value: 'author 5', label: 'loaded' },
            ],
          },
          {
            note: 'The fix: .options(selectinload(Author.books)). Query 1 for authors, query 2 is WHERE author_id IN (1,2,3,4,5). Two queries — for 5 authors or 5000.',
            stack: [
              { name: 'Q1 authors', value: '5 rows' },
              { name: 'Q2 books IN(..)', value: 'all' },
            ],
            heap: [
              { id: 'a1', value: 'author 1', label: 'loaded' },
              { id: 'a2', value: 'author 2', label: 'loaded' },
              { id: 'a3', value: 'author 3', label: 'loaded' },
              { id: 'a4', value: 'author 4', label: 'loaded' },
              { id: 'a5', value: 'author 5', label: 'loaded' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'How you SEE it — because you will not guess it',
      md: `You cannot fix a query you cannot count. Three tools, cheapest first.

- **\`echo=True\`** on the engine in dev: every statement printed to stdout. Hit the endpoint once and the storm is on your screen.
- **Query logging**: point the \`sqlalchemy.engine\` logger at your log pipeline instead of stdout — same information, production-shaped, sampleable.
- **APM** (Datadog, New Relic, OpenTelemetry): shows *queries per request* and a waterfall of 500 identical statements. The shape is unmistakable — a picket fence of tiny bars.
- **The one that lasts: a query-count assertion in a test.** N+1 always comes back, six months later, when someone adds one field to a serializer.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Three ways to count your queries',
      code: `# 1. Cheapest: make SQLAlchemy print every statement (dev only)
engine = create_engine(URL, echo=True)

# 2. Same data, through logging, so it lands in your log pipeline
import logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

# 3. Assert it in a test -- the only fix that STAYS fixed
from sqlalchemy import event

count = 0

@event.listens_for(engine, 'before_cursor_execute')
def _count(conn, cursor, statement, params, context, executemany):
    global count
    count += 1

def test_list_authors_is_two_queries(client):
    global count
    count = 0
    client.get('/authors')
    assert count == 2`,
      annotations: {
        2: 'echo=True in dev and you see the storm the first time you hit the route. Never ship it: it logs every bound parameter, personal data included.',
        6: 'Production version. Route SQLAlchemy through logging, sample it, and let your APM count queries per request.',
        13: 'before_cursor_execute fires once per statement. Every "assert query count" helper in every framework is built on this hook.',
        22: 'The regression test. Without it, the fix has a shelf life of one careless pull request.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The fixes — eager loading, and knowing when to skip the ORM',
      code: `from sqlalchemy import func, select
from sqlalchemy.orm import joinedload, selectinload

# FIX A -- selectinload: 2 queries total, whatever N is
stmt = select(Author).options(selectinload(Author.books)).limit(5)
authors = db.scalars(stmt).all()
# SELECT ... FROM authors LIMIT 5
# SELECT ... FROM books WHERE author_id IN (1, 2, 3, 4, 5)

# FIX B -- joinedload: 1 query, but the parent repeats per child
stmt = select(Author).options(joinedload(Author.books))
authors = db.scalars(stmt).unique().all()
# SELECT ... FROM authors LEFT OUTER JOIN books ON books.author_id = authors.id

# FIX C -- do not build objects at all when you only need numbers
rows = db.execute(
    select(Author.name, func.count(Book.id).label('n'))
    .join(Book, isouter=True)
    .group_by(Author.id, Author.name)
).all()
# one query, one row per author, zero ORM objects constructed`,
      annotations: {
        5: 'selectinload = "run a second query with WHERE id IN (...)". Two round trips, no duplicated rows, and it batches large IN lists automatically. Default choice for one-to-many collections.',
        11: 'joinedload = LEFT OUTER JOIN inside the SAME statement. One round trip — the right pick for many-to-one (a Book to its single Author), where nothing duplicates.',
        12: '.unique() is MANDATORY for joinedload on a collection: the join returns one row per book, so the same Author comes back repeatedly. SQLAlchemy 2.0 raises and tells you to add it.',
        18: 'isouter=True keeps authors with zero books. An inner join silently drops them — the same trap as in the DBMS joins module, now hidden behind ORM syntax.',
        21: 'The senior move: an endpoint showing "author + book count" never needs Book objects. COUNT in the database beats loading 10,000 rows to call len() on them.',
      },
    },
    {
      type: 'intuition',
      title: 'selectinload vs joinedload — the real tradeoff',
      md: `One big join or two small queries? Neither wins always, and the interviewer wants to hear *why*.

- **joinedload**: 1 round trip. But every parent column repeats once per child. 5 authors × 20 books = 100 rows, each carrying the author's name and bio again. Bandwidth up, plus client-side de-duplication.
- **selectinload**: 2 round trips, zero duplication. Second query is a clean \`WHERE author_id IN (...)\`, chunked automatically for huge ID lists.
- **Rule of thumb:** many-to-one (\`Book.author\`) → **joinedload**. One-to-many collection (\`Author.books\`) → **selectinload**.
- **A raw join wins** when you need filtering or sorting *by the child's columns* ("authors who wrote a book after 2020") — eager loading only changes *how* rows are fetched, never *which* rows the query selects.`,
    },
    {
      type: 'note',
      md: '**Cartesian blowup — the trap behind joinedload.** Eager-load two collections at once (an author\'s 20 books *and* their 15 reviews) and the join returns 20 × 15 = **300 rows per author**, of which 265 are duplicates. `selectinload` never does this: each collection gets its own query. Second gotcha: `joinedload` on a collection combined with `LIMIT` forces SQLAlchemy to wrap your query in a subquery — otherwise the LIMIT would cut a collection in half.',
    },
    {
      type: 'intuition',
      title: 'When you should just write the SQL',
      md: `Dropping to SQL is not a defeat. It is the answer to specific shapes of work.

- **Aggregates and reports**: \`COUNT\`, \`SUM\`, \`GROUP BY\`, window functions. Never load rows into Python to count them.
- **Bulk writes**: one \`INSERT ... SELECT\` or a bulk-insert statement beats constructing 10,000 ORM objects and their change tracking.
- **Plan control**: when you need a specific index, a CTE, or an \`EXPLAIN\` you can reason about.
- SQLAlchemy Core (\`select()\`, \`text()\` with bind parameters) still gives you **parameter binding** — leaving the ORM does *not* mean string concatenation.
- The one non-negotiable: never f-string user input into a query. \`text('... WHERE id = :id')\` with \`{'id': x}\`, always.`,
    },
    {
      type: 'intuition',
      title: 'Alembic: git for your schema',
      md: `Your models changed. The production database did not. Something has to carry the diff across — and it must be reviewable, ordered and reversible.

- **Alembic** is SQLAlchemy's migration tool. Each migration is a versioned Python file with \`upgrade()\` and \`downgrade()\`, chained by revision id — a linked list of schema states.
- \`--autogenerate\` **diffs your models against the live database** and writes the migration for you. It is a **draft**, not an answer.
- What autogenerate gets wrong: a column *rename* becomes DROP + ADD (**data loss**), and it routinely misses server defaults, CHECK constraints, enum edits and index renames. **Read every diff before merging.**
- **Never ALTER TABLE by hand on prod.** The next autogenerate then diffs against a database no migration file describes — your staging and prod schemas fork silently, and the next deploy fails on the machine you cannot afford to break.
- Zero-downtime shape, worth naming: **expand then contract** — add a nullable column, backfill, start writing to it, make it NOT NULL, drop the old one. Never one big breaking ALTER while traffic is live.`,
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'The Alembic loop',
      code: `alembic init migrations
alembic revision --autogenerate -m "add books table"
# now OPEN migrations/versions/ab12cd34_add_books_table.py and read it
alembic upgrade head      # apply everything pending, in order
alembic downgrade -1      # undo the last migration
alembic current           # which revision is this database on?`,
      annotations: {
        2: 'Autogenerate compares model metadata to the real database and writes the delta. Treat its output like generated code from a junior: usually right, occasionally destructive.',
        3: 'The step people skip. A rename written as DROP + ADD passes tests on an empty test database and deletes a production column.',
        4: 'upgrade head is what your deploy pipeline runs — not a human at a psql prompt at 2am.',
      },
    },
    {
      type: 'intuition',
      title: 'SQLite for dev, PostgreSQL for prod — and the gotchas between',
      md: `SQLite is a file. Zero setup, instant tests. That convenience is exactly what makes it a dangerous stand-in.

- **Type affinity**: SQLite will happily store the string \`'banana'\` in an INTEGER column. PostgreSQL refuses. Bugs sail through dev and explode in prod.
- **One writer at a time**: a write locks the whole file. Two concurrent writers → \`database is locked\`. Any concurrency test on SQLite is measuring the wrong thing.
- **Foreign keys are OFF by default** in SQLite. Your carefully declared \`ForeignKey\` constraints silently do nothing.
- **Missing features**: no native \`JSONB\`, \`ARRAY\` or \`ENUM\`; a much weaker \`ALTER TABLE\`; different date/time functions. Your migrations may not even replay.
- **The rule:** run tests against the **same engine as production** — a PostgreSQL container is one line of docker-compose. "It's the same ORM anyway" is precisely the leaky-abstraction assumption this whole module is about.`,
    },
    {
      type: 'intuition',
      title: 'Connection pooling: why you never open a connection per query',
      md: `Opening a PostgreSQL connection means a TCP handshake, TLS, authentication, and a **whole new server-side process**. That is 5–50 ms and real memory — per connection.

- A **pool** keeps a small set of connections open and hands them out. Checkout and return cost microseconds.
- \`pool_size\` = how many stay open permanently. \`max_overflow\` = extra connections allowed during a burst, closed afterwards. Hard ceiling = \`pool_size + max_overflow\`.
- **Pool exhaustion symptom: requests do not error — they HANG.** They queue for a free connection, then fail after \`pool_timeout\` (30s default) with *"QueuePool limit of size 10 overflow 5 reached"*.
- The sizing arithmetic nobody does until it breaks: \`workers × (pool_size + max_overflow) ≤ postgres max_connections\` (default 100). Eight Gunicorn workers × 15 = 120. You are already over.
- \`pool_pre_ping=True\` costs one tiny round trip and kills the classic *"server closed the connection unexpectedly"* after an idle firewall timeout.`,
    },
    {
      type: 'note',
      md: 'The three causes of pool exhaustion, in order of how often they actually happen: (1) a session that is never closed — a missing `finally: db.close()` or a background task holding one forever; (2) a **long transaction** that holds its connection while calling a slow external API (never make a network call to a third party with an open transaction); (3) worker count × pool size exceeding the database\'s `max_connections`. If many services share one database, put **PgBouncer** in front of it and stop arguing about pool sizes.',
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The async driver note — the mistake that undoes async entirely',
      code: `# Sync driver: blocking. Fine for plain-def routes, which FastAPI
# runs in a threadpool so the event loop stays free.
engine = create_engine('postgresql+psycopg://user:pw@host/app')

# Async driver: required the moment a route is async def AND touches the DB
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

aengine = create_async_engine('postgresql+asyncpg://user:pw@host/app', pool_size=10)
ASession = async_sessionmaker(aengine, expire_on_commit=False)

async def get_db():
    async with ASession() as db:
        try:
            yield db
            await db.commit()
        except Exception:
            await db.rollback()
            raise`,
      annotations: {
        3: 'A blocking driver called inside an async def route freezes the WHOLE event loop — the exact failure mode from the Python concurrency module. FastAPI only protects you when the route is plain def.',
        8: 'asyncpg, not psycopg2. The driver itself must be non-blocking, or async buys you complexity and nothing else. Note the pool still exists — async does not remove the connection ceiling.',
        12: 'async with closes the session on every exit path: the async equivalent of finally: db.close().',
        15: 'Same transaction rule as the sync version — commit at the end, rollback on exception. Only the awaits changed.',
      },
    },
  ],
  quiz: [
    {
      question: 'You fetch 200 orders, then read `order.customer.name` inside a loop (200 distinct customers, lazy relationship). How many queries hit the database?',
      options: [
        { text: '1', explanation: 'Only if the relationship were eagerly loaded. Lazy loading means the customer is fetched on first access, not with the orders.' },
        { text: '2', explanation: 'That is what it becomes AFTER you add selectinload/joinedload — the fix, not the current behaviour.' },
        { text: '201', explanation: 'Correct. One query for the orders, then one per customer as each attribute access triggers a lazy load. Classic N+1.' },
        { text: '200', explanation: 'Close, but you are forgetting the original query that fetched the orders. The name is literally N **+ 1**.' },
      ],
      correct: 2,
    },
    {
      question: 'What physically causes the extra N queries?',
      options: [
        { text: 'The ORM re-runs the parent query for each row', explanation: 'No — the parent query runs once. The extras are child queries, one per parent.' },
        { text: 'Accessing a lazy relationship attribute emits a SELECT at that moment', explanation: 'Correct. `a.books` looks like a plain attribute read but is a database round trip. That invisibility is why N+1 survives code review.' },
        { text: 'Missing indexes on the child table', explanation: 'A missing index makes each query slower, but the count stays the same. N+1 is about the NUMBER of round trips, not their individual speed.' },
        { text: 'The connection pool retrying', explanation: 'Pools hand out connections; they do not duplicate statements.' },
      ],
      correct: 1,
    },
    {
      question: 'You `joinedload` both `Author.books` (20 each) and `Author.reviews` (15 each) in one statement. What does the database return per author?',
      options: [
        { text: '35 rows — the two collections concatenated', explanation: 'A join multiplies, it does not concatenate. There is no SQL construct that stacks two collections side by side in one result set.' },
        { text: '300 rows — a cartesian product of the two collections', explanation: 'Correct. 20 × 15 = 300, of which 265 are duplicated data. This is why you never joinedload two collections at once — selectinload gives each its own query.' },
        { text: '20 rows — SQLAlchemy de-duplicates in SQL', explanation: '.unique() de-duplicates the OBJECTS in Python, after the database has already sent every one of those rows over the wire.' },
        { text: '1 row', explanation: 'Only if both collections were empty.' },
      ],
      correct: 1,
    },
    {
      question: 'Engine has `pool_size=10, max_overflow=5`. Forty concurrent requests each hold a connection for 3 seconds. What do users see?',
      options: [
        { text: 'Immediate 500 errors', explanation: 'Nothing errors immediately — the pool queues the waiters first. That delay is what makes this so confusing to debug.' },
        { text: 'Requests hang, then fail after pool_timeout with "QueuePool limit ... reached"', explanation: 'Correct. Fifteen run, the rest queue, and after 30 seconds the waiters give up. Hanging (not erroring) is the signature symptom of pool exhaustion.' },
        { text: 'SQLAlchemy opens more connections automatically', explanation: 'pool_size + max_overflow is a hard ceiling. Automatic growth is exactly what a pool exists to prevent.' },
        { text: 'The database rejects the connections', explanation: 'The database never sees them — the ceiling is enforced client-side, in the pool.' },
      ],
      correct: 1,
    },
    {
      question: 'You rename a column in your model and run `alembic revision --autogenerate`. What does the generated migration most likely contain?',
      options: [
        { text: 'ALTER TABLE ... RENAME COLUMN', explanation: 'Autogenerate compares two schema snapshots; it has no way to know a dropped column and an added one are "the same" column.' },
        { text: 'drop_column(old) + add_column(new) — silently destroying the data', explanation: 'Correct, and it is the single best argument for reading every autogenerated diff. It passes tests against an empty database and deletes a production column.' },
        { text: 'Nothing — renames are not detected at all', explanation: 'It definitely detects a difference; the problem is how it expresses it.' },
        { text: 'A data-migration script that copies values across', explanation: 'Autogenerate only ever writes schema operations. Backfilling data is always your job.' },
      ],
      correct: 1,
    },
    {
      question: 'Tests pass on SQLite; the same code raises a type error against PostgreSQL in prod. Most likely reason?',
      options: [
        { text: 'PostgreSQL is stricter — SQLite type affinity accepted a value the real column type rejects', explanation: 'Correct. SQLite will store `\'banana\'` in an INTEGER column; PostgreSQL will not. Same ORM, different guarantees — run tests on the production engine.' },
        { text: 'The ORM generates different SQL per dialect', explanation: 'It does differ slightly, but dialect differences are not what turns a passing test into a type error on the same insert.' },
        { text: 'PostgreSQL is slower to validate', explanation: 'Speed is unrelated to a rejected value.' },
        { text: 'A missing index', explanation: 'Indexes affect performance, never type validity.' },
      ],
      correct: 0,
    },
    {
      question: 'Where does `commit()` belong in a FastAPI request that uses a yielding session dependency?',
      options: [
        { text: 'After every db.add(), so nothing is lost', explanation: 'That turns one request into many transactions — a failure halfway leaves half-written data with no way to roll it back.' },
        { text: 'Once at the end of the request, with rollback on exception and close in finally', explanation: 'Correct. One request = one unit of work. Everything lands or nothing does, and the connection always returns to the pool.' },
        { text: 'Never — SQLAlchemy autocommits', explanation: 'SQLAlchemy 2.0 is explicitly "commit as you go"; without a commit your writes are rolled back when the session closes.' },
        { text: 'In a background task after the response', explanation: 'The transaction and its connection would outlive the request, and the client would be told "created" before anything was.' },
      ],
      correct: 1,
    },
    {
      question: 'For a one-to-many collection (`Author.books`) on a list endpoint, which loader is the better default and why?',
      options: [
        { text: 'joinedload — fewer round trips always wins', explanation: 'One round trip, but the author columns repeat once per book, and it forces a subquery wrapper when combined with LIMIT. Fewer round trips is not automatically less work.' },
        { text: 'selectinload — 2 queries, but zero duplicated parent rows', explanation: 'Correct. A second `WHERE author_id IN (...)` query, automatically batched, with no cartesian duplication. joinedload is the better pick for many-to-one instead.' },
        { text: 'lazy (the default) — load only what you use', explanation: 'That IS the N+1 bug. On a list endpoint you use every child, so "only what you use" means all of them, one query at a time.' },
        { text: 'It makes no difference — same SQL either way', explanation: 'They generate genuinely different SQL: one JOIN versus two separate SELECTs.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Case: the /dashboard endpoint takes 4 seconds in production but 40 ms on your laptop. The database CPU is idle. Debug it.',
      answer:
        'Idle database CPU plus high latency says the time is in **waiting**, not computing — so suspect round trips, not slow queries. Step 1: count queries per request (APM waterfall, or `echo=True` locally against a production-sized dataset). The signature of N+1 is hundreds of near-identical tiny statements differing only in one id. Step 2: confirm it is my dev data that hid it — 3 seeded rows means 4 queries, 500 prod rows means 501. Step 3: find the attribute access in the loop or the serializer that triggers the lazy load. Step 4: fix with `selectinload` for collections, `joinedload` for many-to-one, or drop to a single aggregate query if I only need counts. Step 5: lock it in with a query-count assertion in a test so it cannot regress. Alternatives I would rule out out loud: missing index (would show database CPU/IO), pool exhaustion (would show hangs at a fixed 30s timeout, not 4s), N+1 fits the evidence best.',
      isCaseBased: true,
    },
    {
      question: 'Explain the N+1 query problem in three sentences, then give the fix.',
      answer:
        'One query fetches N parent rows; then touching a lazily-loaded relationship on each parent fires one more query per parent, giving N+1 round trips instead of 1 or 2. The cost is latency, not data volume — each round trip is network plus parse plus plan, so 500 parents can add half a second to an endpoint that returns almost nothing. It is invisible in review because the extra query has no code: it is an attribute access. The fix is eager loading — `selectinload` for one-to-many collections (2 queries, no duplication), `joinedload` for many-to-one (1 query, a LEFT JOIN) — or bypass the ORM entirely and let the database do the aggregation.',
      isCaseBased: false,
    },
    {
      question: 'selectinload vs joinedload: when do you use each, and what goes wrong if you pick the other one?',
      answer:
        '`joinedload` emits a LEFT OUTER JOIN inside the same statement: one round trip, but the parent columns repeat once per child row. Best for many-to-one (`Book.author`), where nothing duplicates. `selectinload` emits a second `WHERE parent_id IN (...)` query: two round trips, no duplication, batched for big ID lists. Best for one-to-many collections. Picking joinedload for a collection costs you duplicated bandwidth, a mandatory `.unique()` call, a subquery wrapper when combined with LIMIT, and — if you eager-load two collections at once — a cartesian product (20 books × 15 reviews = 300 rows per author). Picking selectinload for a many-to-one just wastes a round trip. And neither one lets you FILTER by child columns; for that you need an explicit join.',
      isCaseBased: false,
    },
    {
      question: 'Why is a SQLAlchemy Session created per request rather than once at startup?',
      answer:
        'The Session is a unit-of-work buffer, not a connection manager — that is the Engine\'s job. A Session holds an identity map, pending changes and an open transaction; it is explicitly not thread-safe. A global session would (1) grow forever as objects accumulate, (2) hold a pooled connection and an open transaction indefinitely, blocking vacuum and holding locks, and (3) let two concurrent requests commit each other\'s half-finished work. Correct split: one Engine per process, created at startup, owning the pool; one Session per request, created and closed by a dependency.',
      isCaseBased: false,
    },
    {
      question: 'Case: after shipping a feature that charges a card via a third-party API, all endpoints start hanging under moderate load and then time out. Diagnose.',
      answer:
        'Hanging rather than erroring is the fingerprint of **connection-pool exhaustion**: requests are queued waiting for a free connection and give up after `pool_timeout` (30s default) with "QueuePool limit of size N overflow M reached". Root cause here is almost certainly the payment call being made *inside an open transaction* — the connection is checked out for the full multi-second external round trip, so effective concurrency collapses to `pool_size + max_overflow`. Fix, in order: commit (or do not yet open) the transaction before the external call and reopen after; make the charge a background task or an outbox row; only then consider raising pool_size — and check `workers × (pool_size + max_overflow) ≤ max_connections` before you do, or you just move the failure into the database. Longer term: PgBouncer, plus a timeout on the third-party client so it cannot hold a connection forever.',
      isCaseBased: true,
    },
    {
      question: 'What does an ORM buy you, what does it cost, and when do you drop to raw SQL?',
      answer:
        'Buys: rows mapped to typed objects, automatic parameter binding (so SQL injection is off the table), relationship navigation, change tracking, migrations, and portability across dialects. Costs: the SQL is generated where you cannot see it, so query count depends on what your code touches (N+1); it is a leaky abstraction that stops helping exactly when the query gets interesting; and it constructs objects you may not need. Drop to SQL for aggregates and reports (COUNT/SUM/GROUP BY/window functions — never load rows into Python to count them), bulk writes (`INSERT ... SELECT` beats 10,000 objects), and anywhere you must control the plan. Say the framing sentence: the ORM is a convenience, not a substitute for knowing SQL — I still read EXPLAIN.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through your FastAPI database session dependency. Where do commit, rollback and close go, and why each?',
      answer:
        'A generator dependency: create the Session, `yield` it to the route, and in the code after the yield `commit()`; wrap in try/except to `rollback()` and re-raise on any exception; `close()` in `finally`. Reasons: one transaction per request means the request lands atomically or not at all; rollback on exception prevents returning a connection to the pool with a dirty open transaction; close in `finally` runs on every path, and it is what returns the connection to the pool — omit it and the pool drains until everything hangs. Detail worth mentioning: `expire_on_commit=False` on the sessionmaker, otherwise every attribute read after commit triggers a fresh SELECT during response serialization — an N+1 you created while fixing an N+1.',
      isCaseBased: false,
    },
    {
      question: 'Alembic autogenerate produced a migration. What do you check before merging it, and why never edit the production schema by hand?',
      answer:
        'Autogenerate is a diff of model metadata against the live database — a draft. I check: any `drop_column` paired with an `add_column` (that is a rename, and it destroys data); missing server defaults and CHECK constraints, which autogenerate often does not see; enum value changes; index and constraint names; whether the `downgrade()` is actually correct; and whether the migration is safe on a live table (a NOT NULL add or a long-locking ALTER on a big table needs the expand-then-contract sequence: nullable column, backfill, dual-write, enforce, drop). Never hand-editing prod is about the source of truth: once the database contains changes no migration file describes, the next autogenerate diffs against a phantom state, environments fork silently, and the failure shows up in the deploy you least want to break.',
      isCaseBased: false,
    },
    {
      question: 'Why not develop and test on SQLite and deploy on PostgreSQL? "It is the same ORM."',
      answer:
        'That sentence is the leaky-abstraction assumption in person. Concretely: SQLite has type affinity, so it stores a string in an INTEGER column that PostgreSQL rejects — dev-green, prod-red. It enforces foreign keys only if you turn them on, so constraint bugs go undetected. It allows one writer at a time (whole-file lock), so any concurrency, deadlock or isolation-level test is measuring fiction. It lacks JSONB, ARRAY, native ENUM and a full ALTER TABLE, so migrations may not even replay. SQLite is fine for a quick local spike; the test suite runs against a PostgreSQL container, which is one line of docker-compose.',
      isCaseBased: false,
    },
    {
      question: 'Case: you move routes to `async def` for throughput and latency gets worse under load. What happened?',
      answer:
        'Two likely causes, both classic. (1) The database driver is still synchronous (`psycopg2` behind `create_engine`): a blocking call inside `async def` runs *on the event loop*, so one slow query freezes every other in-flight request. Previously, plain `def` routes were run by FastAPI in a threadpool, which quietly protected you. Fix: `create_async_engine` with `asyncpg`, or move the route back to plain `def`. (2) Async removed the natural concurrency limit the threadpool imposed, so far more requests now race for the same `pool_size + max_overflow` connections — you converted a queue you could see into hangs you cannot. The general point: async only helps when the whole path down to the driver is non-blocking, and it never increases the number of connections the database can serve.',
      isCaseBased: true,
    },
    {
      question: 'How do you make sure an N+1 fix stays fixed?',
      answer:
        'A query-count assertion in the test suite. Register a `before_cursor_execute` event listener on the engine, count statements around a request through the test client, and assert an exact number for the important endpoints. That converts a performance property into a normal failing test. Supporting layers: `echo=True` (or the `sqlalchemy.engine` logger) in dev so the storm is visible the first time you hit a route; an APM dashboard alerting on queries-per-request; and seeding dev/staging with production-scale row counts, because three seeded rows hide every N+1 there is.',
      isCaseBased: false,
    },
    {
      question: 'Does using an ORM mean you are safe from SQL injection?',
      answer:
        'Mostly, and for a precise reason: the ORM sends your values as **bound parameters**, so they are never parsed as SQL — no amount of quoting in user input changes the statement structure. But it is a property of parameter binding, not of the ORM badge. The moment you f-string user input into `text()` or into a raw `execute()` string, you are injectable again; the safe form is `text(\'... WHERE id = :id\')` with a parameter dict. Also worth naming: identifiers (table and column names) cannot be bound as parameters, so anything dynamic there must be validated against an allow-list, ORM or not.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'The N+1 query problem, one line', back: '1 query for N parents, then 1 lazy-load query per parent = N+1 round trips. Cost is latency, not rows.' },
    { front: 'Why N+1 is invisible in code review', back: 'The extra query has no code — it is an attribute access on a lazy relationship (`a.books`) that secretly emits SELECT.' },
    { front: 'selectinload vs joinedload', back: 'selectinload = 2 queries, WHERE id IN (...), no duplication → one-to-many. joinedload = 1 query, LEFT JOIN, parent repeats → many-to-one.' },
    { front: 'joinedload on a collection requires…', back: '`.unique()` on the result — the join returns one row per child, so the same parent object comes back repeatedly.' },
    { front: 'joinedload two collections at once', back: 'Cartesian blowup: 20 books × 15 reviews = 300 rows per parent. Use selectinload; each collection gets its own query.' },
    { front: 'Engine vs Session', back: 'Engine = connection pool + dialect, ONE per process at startup. Session = unit of work, one per request, not thread-safe.' },
    { front: 'FastAPI session dependency shape', back: 'Create → `yield db` → commit after yield → rollback + re-raise on exception → `close()` in finally (returns the connection to the pool).' },
    { front: 'How to SEE your query count', back: '`echo=True` in dev, the `sqlalchemy.engine` logger in prod, APM queries-per-request, and a `before_cursor_execute` count assertion in a test.' },
    { front: 'Alembic autogenerate — trust level', back: 'A draft, always reviewed. A column rename comes out as DROP + ADD, which destroys data. Never hand-edit a prod schema.' },
    { front: 'Pool exhaustion symptom + arithmetic', back: 'Requests HANG, then fail at pool_timeout with "QueuePool limit reached". Check workers × (pool_size + max_overflow) ≤ max_connections.' },
  ],
  mindmapMarkdown: `- Databases & the ORM
  - Raw SQL vs ORM
    - Buys: mapping, bound params, portability
    - Costs: hidden queries, leaky abstraction
    - Convenience, not a substitute for SQL
  - SQLAlchemy 2.0 basics
    - Mapped / mapped_column
    - ForeignKey = constraint, relationship = navigation
    - Engine once per process
    - Session once per request
  - Session lifecycle
    - FastAPI dependency yields the session
    - Commit at end, rollback on error, always close
    - expire_on_commit=False
  - The N+1 problem
    - Lazy loading is the default
    - 1 parent query + N child queries
    - Round trips, not rows
    - Invisible: it is an attribute access
    - Hidden in dev by tiny seed data
  - Seeing it
    - echo=True in dev
    - sqlalchemy.engine logger + APM
    - Query-count assertion in a test
  - Fixes
    - selectinload → 2 queries, no duplication
    - joinedload → 1 join, needs .unique()
    - Cartesian blowup on two collections
    - Raw join / aggregate when you need numbers
  - Alembic migrations
    - Autogenerate = draft, review the diff
    - Rename becomes DROP + ADD
    - Never hand-edit prod schema
    - Expand then contract
  - SQLite vs PostgreSQL
    - Type affinity accepts junk
    - One writer, file lock
    - Foreign keys off by default
    - Test on the prod engine
  - Connection pooling
    - Connections are expensive
    - pool_size + max_overflow = ceiling
    - Exhaustion = hangs, then timeout
    - Async needs an async driver`,
}

export default m
