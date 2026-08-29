var e={id:`backend-l2-production-patterns`,subjectId:`backend`,level:2,title:`Production Patterns: Middleware, Caching, Rate Limits & Testing`,whyItMatters:`A working CRUD API and a production API differ by about six patterns — the request pipeline, injected dependencies, a cache, a rate limiter, pagination that survives page 5000, and tests that run in a second. Interviewers do not ask "can you write a route"; they ask "your p99 tripled, what do you check" and "how do you keep one client from taking the database down". This module is those answers.`,estMinutes:60,sections:[{type:`intuition`,title:`Middleware: the onion, not the checklist`,md:`Every request comes through the same front door. Middleware is what stands in that doorway.

- Picture an onion. The request travels **inward** through each layer, reaches your route handler in the centre, then the response travels **back out** through the same layers in reverse order.
- So each middleware gets two moments: the code *before* \`call_next\` runs on the way in, the code *after* it runs on the way out.
- Way in is for setup — attach a request ID, start a timer, read a header.
- Way out is for finishing — add response headers, record the status, log the duration.
- Order matters, and it inverts: the middleware registered **last** sits outermost, so it runs **first** on the way in and last on the way out.`},{type:`code`,lang:`python`,title:`Two layers of the onion`,code:`import time
import uuid
import logging
from fastapi import FastAPI, Request

app = FastAPI()
log = logging.getLogger("api")

@app.middleware("http")            # registered FIRST -> sits INSIDE
async def timing(request: Request, call_next):
    start = time.perf_counter()               # way in
    response = await call_next(request)       # into the next layer, and back
    ms = (time.perf_counter() - start) * 1000 # way out
    response.headers["Server-Timing"] = f"app;dur={ms:.1f}"
    log.info(
        "request done",
        extra={
            "path": request.url.path,
            "status": response.status_code,
            "ms": round(ms, 1),
            "request_id": request.state.request_id,
        },
    )
    return response

@app.middleware("http")            # registered LAST -> sits OUTSIDE
async def request_id(request: Request, call_next):
    rid = request.headers.get("X-Request-ID") or uuid.uuid4().hex
    request.state.request_id = rid            # set before any inner layer runs
    response = await call_next(request)
    response.headers["X-Request-ID"] = rid
    return response`,annotations:{12:`call_next IS the rest of the onion — every inner middleware plus your route. Everything above this line runs on the way in, everything below on the way out.`,21:`Readable only because request_id sits OUTSIDE this layer, so it already ran. Swap the registration order and this line is an AttributeError.`,26:`The counter-intuitive rule worth memorizing: Starlette wraps each newly added middleware AROUND everything added before it. Last registered = outermost = runs first.`,28:`Reuse the caller's ID when it sends one. That is how a single trace survives a hop between two services.`}},{type:`note`,md:`What belongs in middleware, and what does not:

- **Belongs**: work that is identical for every route and needs no route knowledge — request IDs, access logs, timing, CORS, gzip, catching unhandled exceptions.
- **Does not belong**: anything route-specific — auth on *some* routes, a DB session, permission checks, per-endpoint rate limits. Those are **dependencies**.
- The test: if you find yourself writing \`if request.url.path.startswith(...)\` inside a middleware, it should have been a dependency.
- Middleware runs on **every** request, including \`/health\` and \`/metrics\`. Keep it cheap — no DB calls, no Redis round trips you can avoid.
- CORS is the textbook middleware: it is about the browser, it applies globally, and it needs to touch the response on the way out.`},{type:`intuition`,title:`Depends: say what you need, not how to get it`,md:"A route declares `db: Session = Depends(get_db)`. FastAPI calls `get_db()`, hands the result in, and cleans it up afterwards. You never write the wiring.\n\n- Dependencies can depend on dependencies — `get_current_user` needs `get_db`. FastAPI resolves the whole tree, once, per request.\n- Within one request each dependency is **cached**: asking for `get_db` in three places gives you one session, not three connections and three transactions.\n- A dependency that uses `yield` is a context manager: code before the yield is setup, code after runs *after the response is sent* — that is where `close()` and `rollback()` live.\n- The real payoff is not tidiness, it is testing: `app.dependency_overrides[get_db] = fake` swaps the real database for a test one with no mocking library and no import patching.\n- Rule of thumb: if two routes need the same thing before they can run, that thing is a dependency."},{type:`code`,lang:`python`,title:`The dependency tree`,code:`from typing import Annotated
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

def get_db():
    db = SessionLocal()
    try:
        yield db          # the request runs HERE
    finally:
        db.close()        # teardown: runs after the response

def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    authorization: Annotated[str, Header()],
) -> User:
    user = decode_token(authorization.removeprefix("Bearer "))
    if user is None:
        raise HTTPException(401, "invalid token")
    return user

# Name the wiring once, use it everywhere.
Db = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

@app.get("/notes")
def list_notes(db: Db, user: CurrentUser):
    return db.scalars(select(Note).where(Note.owner_id == user.id)).all()`,annotations:{8:`yield, not return. Everything before it is setup; everything after is teardown that FastAPI runs once the response is out the door.`,13:`A dependency depending on a dependency. FastAPI walks the whole tree and calls each node in order.`,22:`An Annotated alias collapses the wiring to one word. Every route now reads db: Db instead of repeating Depends(...) forever.`,26:`This Db and the Db inside get_current_user resolve to the SAME session — dependencies are cached per request. Two sessions here would mean two transactions and a very confusing bug.`}},{type:`intuition`,title:`Background tasks: after the response, same process`,md:`\`BackgroundTasks\` runs a function *after* the response has been sent — in the same worker process.

- Good for: the welcome email, an audit row, warming a cache, pinging a webhook. Work the caller does not need to wait for and does not need a guarantee about.
- What you accept in exchange: no retries, no persistence, no visibility. A restart — and every deploy is a restart — drops the task silently.
- It also shares the process: a heavy background task steals CPU from request handling, and a *blocking* one inside an async app stalls the event loop for everyone.
- When it is not enough: anything that must not be lost (payments, order fulfilment), anything slow (video transcode), anything needing retries or a schedule.
- Then you graduate to a real queue — Celery/RQ/Arq over Redis or RabbitMQ — where tasks are durable, retried, monitored, and run on separate workers you can scale independently. That is the L3 production module.`},{type:`code`,lang:`python`,title:`Fire-and-forget, with the emphasis on forget`,code:`from fastapi import BackgroundTasks

@app.post("/signup", status_code=201)
def signup(payload: SignupIn, tasks: BackgroundTasks, db: Db):
    user = create_user(db, payload)
    tasks.add_task(send_welcome_email, user.email)   # queued, not run
    return {"id": user.id}                           # response goes out FIRST

# Same process, same box. If uvicorn restarts before the email is sent,
# the task is gone and nobody finds out. No retry, no dead-letter, no queue.`,annotations:{6:`add_task only RECORDS the call. FastAPI invokes it after the response is written to the socket.`,7:`The client gets its 201 immediately — a 400 ms email never enters the request latency.`,9:`The whole tradeoff in one line: fire-and-forget means "forget" is a real, silent outcome.`}},{type:`intuition`,title:`Cache-aside: ask the shelf before you walk to the warehouse`,md:`A barista keeps the popular syrups on the counter; the rare ones live in the store room. Counter first, store room only on a miss — and whatever you fetch, you leave on the counter.

- That is **cache-aside** (lazy loading): check Redis → miss → read the DB → write the value back into Redis with a TTL → return it.
- Your application owns the logic. Redis is a fast dumb box; it has no idea your database exists.
- A **TTL** (time to live) is the safety net for the invalidation you will forget. Even a wrong cached value expires by itself.
- The cache is **not** a source of truth. If Redis disappears, every request must still work — just slower. A cache read that raises should log and fall through to the DB.
- Cache hit ≈ 0.3 ms; a joined DB read ≈ 20 ms. That ratio is why one hot endpoint can carry 100× the traffic on the same database.`},{type:`code`,lang:`python`,title:`Cache-aside, plus the invalidation that goes with it`,code:`import json
import redis

r = redis.Redis(decode_responses=True)
TTL = 300  # seconds — the safety net for the invalidation you forgot

def get_profile(db, user_id: int) -> dict:
    key = f"profile:{user_id}"          # per-user key, never a shared one
    cached = r.get(key)
    if cached is not None:
        return json.loads(cached)       # HIT: no DB involved at all
    row = db.get(User, user_id)         # MISS: the slow path
    data = {"id": row.id, "name": row.name, "plan": row.plan}
    r.set(key, json.dumps(data), ex=TTL)
    return data

def rename(db, user_id: int, name: str) -> None:
    db.execute(update(User).where(User.id == user_id).values(name=name))
    db.commit()
    r.delete(f"profile:{user_id}")      # invalidate AFTER the commit`,annotations:{5:`Every cached value gets a TTL. A key written with no expiry is a stale answer waiting for the right deploy to embarrass you.`,8:`The user id is IN the key. A shared key that serves one user the wrong profile is a real, common, and very expensive bug.`,11:`Return and stop. This branch existing is the entire point of the cache.`,14:`The app populates the cache on the way out — that is what "aside" means. Redis never talks to your database.`,20:`Order is load-bearing. Delete BEFORE the commit and a concurrent reader can re-cache the OLD row and keep serving it for 300 seconds.`}},{type:`visual`,component:`CacheSimulator`,props:{capacity:3}},{type:`note`,md:'That stepper is Redis eviction. When Redis reaches `maxmemory` it drops keys according to `maxmemory-policy`; `allkeys-lru` — evict the least recently used key, whatever it is — is the setting you want for a pure cache. The default, `noeviction`, makes *writes fail* when memory fills, which turns a full cache into an outage. Watch capacity 3 thrash on a working set of 4, then raise it to 4 and watch every request hit. That cliff is what "cache sizing" means in practice: a cache slightly too small for the working set performs like no cache at all.'},{type:`intuition`,title:`What to cache, and what to leave alone`,md:`- **Cache**: expensive reads that are read far more than they are written — a computed feed, a rendered product page, a config blob, an aggregate count, a third-party API response you pay for.
- **Do not bother**: things already cheap. A primary-key lookup on a warm table is ~1 ms; caching it adds a network hop and a consistency bug to save nothing.
- **Careful**: anything per-user. The key must contain the user id, and the value must not outlive a permission change. Getting this wrong leaks one customer's data to another.
- **Never** cache raw secrets, tokens, or full payment data. If you truly must, key by a hash, keep the TTL tiny, and know that anyone with Redis access now has them — Redis is usually unencrypted and often unauthenticated inside a VPC.
- **Hot keys**: one celebrity key can pin a single Redis shard while the rest idle. Fix with a small in-process cache in front of Redis, or by splitting the key across N replicas.`},{type:`intuition`,title:`Invalidation: the second hard problem, and why`,md:`Three strategies, cheapest first:

- **TTL only** — you accept stale data for up to N seconds and say so out loud. Simplest thing that works; start here.
- **Delete on write** — after a successful commit, \`DEL\` the key. Cheap, correct for most things, and the default for anything users edit and immediately re-read.
- **Write-through** — write the DB and the cache in the same operation. Freshest, but every write pays the cost and a partial failure leaves two systems disagreeing.
- The famous quip — *there are only two hard things in computer science: cache invalidation and naming things* — is earned here, and not because \`DEL\` is hard. It is because **knowing every key one UPDATE invalidates** is hard: a single row change can stale the row cache, the list cache, three filtered variants, and a count.
- Practical rule: keep the key space small enough that you can name every key a write touches. When you cannot, shorten the TTL and stop pretending you have consistency.`},{type:`note`,md:"One more failure mode: a hot key expires, 500 requests miss in the same millisecond, and all 500 run the same expensive query against the database — a **cache stampede** (thundering herd), which arrives exactly when you are busiest. Three fixes, cheapest first: **jitter** the TTL (`300 + random(0, 60)` seconds) so keys stop expiring together; take a short **lock** so one request recomputes while the rest wait or serve the stale value; or **refresh ahead**, rebuilding the value just before it expires."},{type:`intuition`,title:`Rate limiting: the bucket of coins that refills`,md:`Your database has a fixed capacity. One buggy client in a retry loop can eat all of it, and every other user gets a 500. Rate limiting is how you stay up for the polite majority.

- Three reasons, all worth saying: **protect the backend** (the DB is the scarce resource), **fairness** (one tenant must not starve the rest), **abuse** (scraping, credential stuffing, cost attacks on paid APIs).
- The **token bucket**: a bucket holds up to 20 tokens and refills at 5 per second. Each request takes one token. No token, no service.
- Idle for a minute → the bucket is full → a **burst** of 20 requests is served instantly. That is deliberate. Real users are bursty: opening one page fires a dozen requests, and a naive "5 per second" limiter would reject a normal human.
- Sustained rate is still 5/s, because that is the drip. **Capacity and refill are two separate knobs** — burst tolerance and steady rate — which is exactly what a fixed-window counter cannot give you.
- Fixed windows also have the boundary bug: 100 requests at 11:59:59.9 and 100 more at 12:00:00.1 is 200 in a fifth of a second, and both windows say "within limit".`},{type:`visual`,component:`RateLimiterSim`,props:{}},{type:`code`,lang:`python`,title:`A token bucket that survives four workers`,code:`import time
from fastapi import Depends, HTTPException

CAPACITY = 20    # burst: how many tokens the bucket holds
REFILL = 5.0     # steady rate: tokens added per second

BUCKET = """
local cap, refill, now = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])
local b = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(b[1]) or cap
local ts = tonumber(b[2]) or now
tokens = math.min(cap, tokens + (now - ts) * refill)
if tokens < 1 then return 0 end
redis.call('HSET', KEYS[1], 'tokens', tokens - 1, 'ts', now)
redis.call('EXPIRE', KEYS[1], 60)
return 1
"""
take = r.register_script(BUCKET)

def rate_limit(user: CurrentUser):
    key = f"rl:user:{user.id}"                  # per user, not per IP
    if take(keys=[key], args=[CAPACITY, REFILL, time.time()]) == 0:
        raise HTTPException(
            429,
            "rate limit exceeded",
            headers={"Retry-After": "1"},
        )

@app.get("/search", dependencies=[Depends(rate_limit)])
def search(q: str, db: Db):
    ...`,annotations:{4:`Two knobs, two behaviours. CAPACITY is the burst you forgive; REFILL is the rate you actually enforce.`,12:`The refill is lazy — there is no background timer. You compute how many tokens WOULD have dripped in since this key was last touched.`,14:`One Lua script runs atomically inside Redis. A read-modify-write over two round trips lets concurrent workers oversell the bucket.`,18:`The counter lives in Redis because four uvicorn workers with in-memory counters quietly enforce 4x your limit.`,26:`429 without Retry-After makes things worse: clients retry immediately. This header tells them when to come back.`,29:`A dependency, not middleware — so an expensive endpoint gets a tighter bucket than /health, and unauthenticated routes can use a different key.`}},{type:`note`,md:`Keys and placement:

- **Per user** (user id or API key) is the fair key — one abuser cannot punish everyone behind the same office NAT.
- **Per IP** is what you have before a user exists: login, signup, password reset. Coarse (carriers share IPs), dodgeable (proxies), still essential.
- In practice, both: per-IP at the edge, per-user inside.
- **Where it lives**: the gateway or proxy (nginx, Envoy, API Gateway, Cloudflare) is right for coarse per-IP limits — rejected traffic never reaches Python, which is the whole point under attack. In-app is where per-user, per-plan and per-endpoint-cost rules live, because only the app knows the plan.
- Whatever you pick, the counter must be **shared and atomic**. Local counters and non-atomic read-then-write are the two ways a rate limiter quietly does nothing.`},{type:`intuition`,title:`Pagination: OFFSET is not a jump, it is a walk`,md:`\`LIMIT 20 OFFSET 0\` is instant. \`LIMIT 20 OFFSET 100000\` makes the database produce, sort, and then throw away 100,000 rows to hand you 20.

- Cost grows with the page number. Page 1 is free, page 5000 times out — and the users crawling deepest are the ones you least want to serve slowly.
- Second bug, subtler: the **shifting window**. Someone inserts a row while you page, and page 2 repeats an item from page 1. A delete makes you skip one. Neither shows up in testing.
- **Keyset (cursor) pagination** asks a different question: not "skip 100,000 rows" but "give me what comes *after this exact row*". With a matching index that is a seek, not a walk, and every page costs the same.
- It needs a **stable, unique** sort key. \`created_at\` alone is not unique — tie-break with the primary key and compare the pair.
- The price you accept: no "jump to page 500" and no total count. That is precisely why cursor-based UIs show "Load more" instead of page numbers.`},{type:`code`,lang:`sql`,title:`The same page, two costs`,code:`-- Deep offset: the database produces 100,020 rows, sorts them,
-- and discards 100,000 of them to give you 20.
SELECT id, title, created_at
FROM notes
WHERE owner_id = 42
ORDER BY created_at DESC, id DESC
LIMIT 20 OFFSET 100000;

-- Keyset: "give me what comes after this exact row."
SELECT id, title, created_at
FROM notes
WHERE owner_id = 42
  AND (created_at, id) < ('2026-03-01 10:00:00', 8842)
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- The index that turns the second query into a seek:
CREATE INDEX notes_owner_feed ON notes (owner_id, created_at DESC, id DESC);`,annotations:{7:`OFFSET does not skip work, it does work and throws it away. Cost is linear in the offset, so latency is worst on the deepest pages.`,13:`Row comparison, not "created_at < x AND id < y" — that second form silently drops rows that share a timestamp. Compare the tuple.`,14:`ORDER BY must match the index and the tuple exactly. Mismatch it and the planner falls back to a sort of the whole result.`,18:`Same cost at row 20 and at row 2,000,000: the index seeks straight to the cursor position and reads 20 entries.`}},{type:`code`,lang:`python`,title:`Returning a next-cursor`,code:`import base64, json
from fastapi import Query
from sqlalchemy import select, tuple_

def encode(row) -> str:
    raw = json.dumps([row.created_at.isoformat(), row.id])
    return base64.urlsafe_b64encode(raw.encode()).decode()

@app.get("/notes")
def list_notes(
    db: Db,
    user: CurrentUser,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    q = select(Note).where(Note.owner_id == user.id)
    if cursor:
        ts, last_id = json.loads(base64.urlsafe_b64decode(cursor))
        q = q.where(tuple_(Note.created_at, Note.id) < (ts, last_id))
    q = q.order_by(Note.created_at.desc(), Note.id.desc()).limit(limit + 1)
    rows = db.scalars(q).all()
    has_more = len(rows) > limit
    rows = rows[:limit]
    return {
        "items": rows,
        "next_cursor": encode(rows[-1]) if has_more else None,
    }`,annotations:{7:`Base64 makes the cursor look opaque so clients stop parsing it. It is NOT security — the ownership filter below is what protects the data. Sign the cursor if forging it must be impossible.`,14:`Cap the page size at the boundary. Without le=100, one client asks for limit=1000000 and your rate limiter never sees the damage coming.`,20:`limit + 1 is the trick: one extra row tells you a next page exists without a COUNT query over the whole table.`,26:`The cursor is the LAST row of the page you are returning, so the next request continues strictly after it.`}},{type:`intuition`,title:`Testing: fast, isolated, and about your contract`,md:"`TestClient(app)` calls your application in-process — no server, no sockets — while still running real routing, validation, and serialization. Fast enough to run on every save.\n\n- Test the **contract**: the status code, the response shape, and what changed in the database. Do not test that FastAPI parsed JSON; that is their test suite.\n- The test database: SQLite in-memory is instant and zero-setup, but it is not Postgres (different JSON support, looser constraints, no real concurrency). Use it for speed, and keep one Postgres-backed suite for the SQL you actually depend on.\n- Isolation beats recreation: the fastest correct pattern is to open a transaction per test and **roll it back** at the end, so nothing leaks between tests and nothing is rebuilt.\n- Every external call gets faked: `monkeypatch.setattr` for your own functions, `respx`/`responses` for HTTP at the transport layer. A test that really calls Stripe is not a test, it is a flake.\n- `dependency_overrides` is the FastAPI-native mock — swap `get_db`, `get_current_user`, the Redis client. This is the payoff `Depends` was buying you all along."},{type:`code`,lang:`python`,title:`conftest.py — the fixtures that do all the work`,code:`import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.deps import get_db, get_current_user
from app.models import Base, User

engine = create_engine(
    "sqlite://",                                  # in-memory
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,                         # one shared connection
)

@pytest.fixture()
def db():
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()
    Base.metadata.drop_all(engine)

@pytest.fixture()
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: User(id=1, name="test")
    yield TestClient(app)
    app.dependency_overrides.clear()`,annotations:{12:`A URL with no path is a fresh in-memory database: fast, disposable, and not Postgres. Keep a real-Postgres suite for queries whose behaviour you rely on.`,14:`Without StaticPool every connection opens its OWN empty in-memory database — the classic "my tables disappeared" test bug.`,27:`THE payoff of Depends: one line swaps the real database for the test one. No import patching, no mock library, no dependency-injection framework.`,28:`Override auth too, and every test stops performing a login it was never trying to test.`,30:`Clear the overrides, or they leak into every test that runs after this one.`}},{type:`code`,lang:`python`,title:`What a useful test actually asserts`,code:`def test_create_note_returns_201_and_persists(client, db):
    r = client.post("/notes", json={"title": "buy milk"})
    assert r.status_code == 201
    assert r.json()["title"] == "buy milk"          # the CONTRACT
    assert db.scalar(select(func.count()).select_from(Note)) == 1

def test_title_too_long_is_422(client):
    r = client.post("/notes", json={"title": "x" * 500})
    assert r.status_code == 422

def test_signup_queues_exactly_one_email(client, monkeypatch):
    sent = []
    monkeypatch.setattr("app.main.send_welcome_email", sent.append)
    client.post("/signup", json={"email": "a@b.com", "password": "correct-horse"})
    assert sent == ["a@b.com"]

@respx.mock
def test_payment_failure_returns_502(client):
    respx.post("https://api.stripe.com/v1/charges").respond(500)
    assert client.post("/orders", json={"item": 7}).status_code == 502`,annotations:{4:`Status code, response body, and the database effect. Those three are your contract; everything else is testing the framework.`,9:`One 422 test per model pins YOUR validation rules — the part that changes when someone "just relaxes a constraint".`,13:`monkeypatch replaces the name where it is USED (app.main), not where it is defined. Getting this backwards is why "the mock did not take".`,15:`TestClient runs background tasks to completion before returning, so the fire-and-forget email is already recorded by this line.`,19:`respx fakes HTTP at the transport layer, so your real client code still runs. A test that hits Stripe for real is a flake with a green tick.`}},{type:`intuition`,title:`Logging: one JSON object per line, with the request id on it`,md:`\`{"level":"info","msg":"order paid","order_id":91,"ms":42}\` can be filtered, grouped and alerted on. \`"Order 91 paid in 42ms"\` needs a regex before it means anything.

- Put the **request id** on every line. That is the single string that turns 40,000 interleaved lines from eight workers into one readable story — and, passed downstream as a header, into a distributed trace.
- Use levels honestly: DEBUG local only; INFO for "this happened" (request done, order paid); WARNING for "recovered, but suspicious"; ERROR for "this request failed and a human should look"; CRITICAL for "the service is down". If everything is ERROR, the alerts get muted and you are blind.
- **Never log**: passwords, tokens, JWTs, API keys, card numbers, full addresses, health data, session cookies. Logs are copied to five systems and kept for a year — treat every line as public.
- Log the **id**, not the object. \`user_id=42\`, not the user row that carries the email and the password hash.
- Log at the boundaries: one line in, one line out, with status and duration. That is exactly what the timing middleware at the top of this module was doing.`},{type:`code`,lang:`python`,title:`Structured logs with an allowlist`,code:`import json, logging, sys

class JsonFormatter(logging.Formatter):
    KEEP = ("request_id", "user_id", "path", "status", "ms")

    def format(self, record: logging.LogRecord) -> str:
        out = {
            "ts": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        out.update({k: getattr(record, k) for k in self.KEEP if hasattr(record, k)})
        return json.dumps(out)

handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JsonFormatter())
logging.basicConfig(level=logging.INFO, handlers=[handler])

log.info("order paid", extra={"request_id": rid, "user_id": 42, "email": u.email})
# -> {"ts": "...", "level": "INFO", "logger": "api", "msg": "order paid",
#     "request_id": "9f3c1a...", "user_id": 42}        <- email was DROPPED

# Never, in any field: passwords, tokens, JWTs, API keys, card numbers,
# full addresses, health data, session cookies.`,annotations:{13:`An allowlist, not a dump of every extra field. The stray email on line 20 never reaches disk — which is the only PII defence that survives a hurried teammate.`,16:`Log to stdout. In a container the platform collects and ships the stream; an app that manages its own log files is one you cannot run twice.`,20:`One line per event, machine-parseable, carrying the request id that stitches this line to the other nine from the same request.`}},{type:`note`,md:'Health checks, and why there are two. **Liveness** (`/health`): "is this process alive?" — return 200 and check *nothing*. If it fails, the orchestrator kills and restarts the pod, so wiring a database check here means one DB blip restarts every pod you own, simultaneously. **Readiness** (`/ready`): "can I serve traffic right now?" — check the DB connection, the cache, migrations, the loaded model. Failing it removes the pod from the load balancer without killing it, and it rejoins by itself when the dependency recovers. One endpoint doing both, wired to the database, is a recurring cause of full outages from a partial one.'}],quiz:[{question:`You register middleware A, then middleware B. On the way IN, which runs first?`,options:[{text:`A — registration order is execution order`,explanation:`The intuitive answer, and wrong. Starlette wraps each new middleware around everything registered before it.`},{text:`B — the last registered sits outermost`,explanation:`Correct. Last in, outermost, so B runs first on the way in and LAST on the way out.`},{text:`Whichever is faster; the order is not defined`,explanation:`The order is completely deterministic — it is just the reverse of what most people expect.`}],correct:1},{question:"Why is `app.dependency_overrides[get_db] = fake` described as the real payoff of Depends?",options:[{text:`It makes the production app faster`,explanation:`Overrides are a test-time mechanism; they do nothing for production performance.`},{text:`It swaps a real dependency for a test one without patching imports or using a mocking library`,explanation:`Correct. Because routes ask for what they need instead of importing a global, the test controls what they get — one line, no monkeypatching.`},{text:`It validates request bodies automatically`,explanation:`That is Pydantic on the route signature, unrelated to overrides.`}],correct:1},{question:`In cache-aside, when do you delete the cached key on a write?`,options:[{text:`Before the UPDATE, so readers never see the old value`,explanation:`Worst option: between your DELETE and your COMMIT a reader misses, reads the OLD row, and re-caches it for the full TTL.`},{text:`After the commit succeeds`,explanation:`Correct. The new value is durable first, so any repopulation after the delete reads the new row.`},{text:`It does not matter — the TTL fixes it either way`,explanation:`The TTL is a safety net, not a plan. "Wrong for 300 seconds" is exactly the bug you are trying to avoid.`}],correct:1},{question:`A popular key expires and 500 concurrent requests all run the same expensive query. Cheapest first fix?`,options:[{text:`Add TTL jitter so hot keys stop expiring at the same instant`,explanation:`Correct. A one-line change (300 + random 0-60s) spreads the misses; locks and refresh-ahead are the next rungs if it is still not enough.`},{text:`Increase Redis memory`,explanation:`The key expired by TTL, not by eviction — more memory changes nothing here.`},{text:`Switch to write-through caching`,explanation:`Write-through affects writes. The stampede is a read-path problem at expiry time.`}],correct:0},{question:`A token bucket has capacity 20 and refills at 5 tokens/second. The client is idle for a minute, then fires 20 requests at once, then keeps going.`,options:[{text:`Only 5 are accepted; the rest get 429`,explanation:`That is a fixed-rate limiter. The bucket exists precisely so idle time earns burst capacity.`},{text:`All 20 are accepted immediately, then the client is limited to about 5/s`,explanation:`Correct. The bucket refilled to its capacity of 20 while idle; after that the drip rate is the ceiling. Burst and steady rate are separate knobs.`},{text:`All 20 are rejected because the burst exceeds the rate`,explanation:`A limiter that rejects a normal page load of 12 requests would be unusable — this is the exact problem token bucket solves.`}],correct:1},{question:`You run 4 uvicorn workers and keep rate-limit counters in a Python dict. Effective limit?`,options:[{text:`Exactly the configured limit`,explanation:`Only with one worker. Each process has its own dict and its own idea of the count.`},{text:`About 4x the configured limit`,explanation:`Correct — the load balancer spreads requests across four independent counters. Shared state (Redis) plus an atomic check-and-decrement is the fix.`},{text:`A quarter of the limit`,explanation:`Backwards: each worker allows a full quota, so the totals add up rather than divide.`}],correct:1},{question:"Why does `LIMIT 20 OFFSET 100000` get slower as users page deeper?",options:[{text:`The result set is bigger`,explanation:`It returns the same 20 rows on every page — the returned size is constant.`},{text:`The database must generate and discard all 100,000 skipped rows first`,explanation:`Correct. OFFSET is a walk, not a seek, so cost grows linearly with the offset. Keyset pagination replaces it with an index seek at constant cost.`},{text:`Index lookups get slower on later pages`,explanation:`A B-tree seek costs the same anywhere; the cost here is the rows produced and thrown away before the LIMIT applies.`}],correct:1},{question:"What happens if your liveness probe (`/health`) checks the database?",options:[{text:`Nothing bad — it is a more honest health check`,explanation:`It sounds more thorough, and that is the trap. Liveness failure means "kill this process".`},{text:`A brief DB outage restarts every pod at once, turning a partial outage into a full one`,explanation:`Correct. Liveness = "is the process alive", no dependency checks. Dependency checks belong in readiness, which only removes the pod from the load balancer.`},{text:`Requests get queued until the database returns`,explanation:`Probes do not queue traffic; a failed liveness probe triggers a restart.`}],correct:1}],interviewQuestions:[{question:`Middleware or dependency — where does authentication go, and why?`,answer:'Dependency, in almost every real API. Middleware runs on every request including /health and /metrics, and it has no route context, so auth-in-middleware immediately grows a path allowlist — the smell that says "this should have been a dependency". As a dependency, `user: CurrentUser` is per-route, self-documenting, appears in the OpenAPI schema, and is trivially overridable in tests. Middleware keeps what is genuinely universal and route-agnostic: request IDs, access logging, timing, CORS, gzip, the catch-all exception handler. The one-line rule: cross-cutting and identical everywhere → middleware; needed by some routes, or needing route context → dependency.',isCaseBased:!1},{question:`Explain the middleware onion, including execution order, in a way that shows you have debugged one.`,answer:'A request travels inward through each layer, hits the handler, and the response travels back out through the same layers in reverse. Inside each middleware, code before `await call_next(...)` is the way in, code after it is the way out, and `call_next` itself IS everything inside. The order gotcha: Starlette wraps each newly added middleware around the ones added before it, so the LAST registered is outermost and runs FIRST inbound. That matters concretely — a timing middleware registered before a request-id middleware sits inside it, so it can read `request.state.request_id`; flip the registration and you get an AttributeError on a line that "worked yesterday". Also worth saying: every middleware taxes every request, so a Redis call in middleware is a Redis call on your health checks too.',isCaseBased:!1},{question:`Case: p99 latency tripled right after a deploy. p50 barely moved. Walk me through the debug.`,answer:`p50 flat with p99 tripled means the median path is fine and a tail is being punished — that is contention, a timeout, or a new per-request cost that only sometimes bites. Sequence: (1) Diff the deploy — new middleware, a new dependency, an ORM change. (2) Read the access logs by route and status; structured logs with duration and request id let you group instantly. Is it every route (middleware/global) or one route (query/dependency)? Every route points at middleware or the pool; one route points at its query. (3) If it is global, suspect a middleware doing I/O or a blocking call inside an async path, which stalls the event loop and shows up as a tail, not a median. (4) Check the connection pool — a new dependency that no longer shares the cached session doubles checkouts, and requests queue for a connection at exactly the p99. (5) Check the cache hit rate: a changed cache key silently drops it to zero, so p50 stays warm-ish while misses form the tail. (6) Confirm with EXPLAIN on the suspect query and by reverting one change. The habit to show: name the hypothesis class from the shape of the metric BEFORE opening code.`,isCaseBased:!0},{question:`Design the caching for a product page read 5,000 times per second and updated a few times a day.`,answer:"Read-heavy and rarely written is the ideal cache-aside case. Key `product:{id}:v{schema}`, value the fully rendered JSON, TTL ~5 minutes with jitter. Read path: Redis get → hit returns in under a millisecond; miss reads Postgres, writes the key, returns. Write path: commit, then DEL the key (and the small set of derived keys — the category listing and the count). Because writes are rare, delete-on-write is cheap and consistency is effectively immediate. Tradeoffs to name out loud: (a) a stampede on expiry of a 5,000 rps key — jitter the TTL and take a short lock so one request rebuilds; (b) Redis must be optional — wrap reads so a Redis failure logs and falls through to the DB rather than 500-ing; (c) `maxmemory-policy allkeys-lru`, never `noeviction`; (d) if one product is a celebrity key hitting a single shard, add a small in-process TTL cache in front of Redis. The version prefix in the key means a schema change invalidates everything with a deploy instead of a script.",isCaseBased:!0},{question:`Compare TTL-only, delete-on-write, and write-through invalidation. Which do you reach for?`,answer:`TTL-only: simplest, no write-path coupling, and you explicitly accept staleness up to N seconds — correct for feeds, aggregates, and third-party data. Delete-on-write: after a successful commit, DEL the affected keys; near-immediate consistency for a little write-path coupling, and the default for anything a user edits and then re-reads. Write-through: update DB and cache together; freshest reads, but every write pays and a partial failure leaves two systems disagreeing, so it needs care. I start at TTL, add delete-on-write for user-editable entities, and only consider write-through when reads must never be stale and writes are rare. The real difficulty is never the DEL — it is enumerating every key one UPDATE staled: the row, the list, three filtered variants, a count. When I cannot enumerate them, I shorten the TTL instead of pretending I have consistency.`,isCaseBased:!1},{question:`Case: Redis went down at 3am and the whole site went down with it. What was wrong, and how do you fix it?`,answer:`The cache became a dependency instead of an optimisation. Two likely causes: cache reads were not wrapped, so a connection error propagated as a 500; and/or the database was sized only for the cached hit rate, so when every request fell through, the DB collapsed and the site would have died even with correct error handling. Fixes, in order: (1) wrap cache reads and writes so failures log-and-continue — a miss must be a slow path, not an error path; (2) short Redis timeouts (tens of milliseconds) with a circuit breaker, so a hung Redis does not add latency to every request; (3) shed load on the fallback — rate limits and a request cap keep the DB alive at a degraded but non-zero service level; (4) run Redis with replication and failover if the hit rate is genuinely load-bearing; (5) load-test with the cache disabled so you know the real floor before 3am does. The sentence that scores: "a cache you cannot lose is not a cache, it is an undocumented database".`,isCaseBased:!0},{question:`Token bucket vs fixed window vs sliding window log — compare them.`,answer:`Fixed window: one counter per key per minute. Trivial and O(1) memory, but has the boundary bug — 100 requests at the end of one window and 100 at the start of the next is 200 in a moment, both "legal". Sliding window log: store a timestamp per request and count those inside the trailing window; exact, but memory grows with the rate and you pay for trimming (the practical middle ground is a sliding-window counter that weights the previous window). Token bucket: capacity plus refill rate, stored as two numbers per key and refilled lazily from a timestamp. It is O(1) memory, has no boundary artefact, and — the reason it wins — separates burst tolerance from sustained rate, which is what real bursty clients need. Leaky bucket is its sibling: it shapes output to a constant rate rather than allowing bursts, which is what you want for a downstream that cannot absorb spikes.`,isCaseBased:!1},{question:`Where do you put the rate limiter — gateway or application — and what do you key it on?`,answer:`Usually both, at different granularities. At the edge (nginx, Envoy, API Gateway, Cloudflare): coarse per-IP limits, so abusive traffic is rejected before it costs a Python worker, a connection, or a log line — which is the only thing that helps under a real flood. In the app: per-user, per-plan and per-endpoint rules, because only the app knows that this caller is on the free tier and that this endpoint costs a 200 ms aggregate query. Keys: per-user (user id or API key) for authenticated traffic since it is fair and cannot be dodged by rotating IPs; per-IP for pre-auth endpoints (login, signup, password reset) where no user exists yet, accepting that NATs share IPs and proxies dodge it. Two non-negotiables regardless of placement: the state is shared (Redis, not a per-worker dict) and the check is atomic (a Lua script or an atomic INCR, not read-then-write). And reject with 429 plus Retry-After, or clients retry instantly and amplify the problem.`,isCaseBased:!1},{question:`Case: "page 3000 of our listing times out." Migrate it to cursor pagination — what breaks, and how do you roll it out?`,answer:'Diagnosis: OFFSET 60000 makes the database produce and discard 60,000 rows per request, so cost is linear in page depth. Fix: keyset pagination — `WHERE (created_at, id) < (:ts, :id) ORDER BY created_at DESC, id DESC LIMIT n`, backed by an index on (owner_id, created_at DESC, id DESC), fetching n+1 rows to know whether a next page exists without a COUNT. What breaks: no jump-to-page-N, no total count, and existing clients send `?page=`. Rollout: add `cursor` alongside `page`, return `next_cursor` in every response, move the UI to a "Load more"/infinite scroll (or keep numbered pages only for the shallow first few, which offset handles fine), then deprecate `page` behind a metric that shows nobody uses it. Extras worth mentioning: the sort key must be unique — hence the id tie-break — and the same change fixes the shifting-window bug where inserts made page 2 repeat a row from page 1. If a total count is truly required, serve an approximate one from statistics rather than a COUNT on every page.',isCaseBased:!0},{question:`How do you test a route that writes to Postgres and calls Stripe? What do you deliberately not test?`,answer:"Structure: a `client` fixture wrapping TestClient with `app.dependency_overrides[get_db]` pointed at a test session and `get_current_user` returning a fixed user. The DB is either SQLite in-memory (fast, but not Postgres) or a real Postgres container with each test wrapped in a transaction that is rolled back at the end — rollback-per-test is faster and more isolated than dropping and recreating schemas. Stripe is faked at the transport layer with respx so my actual client code, retries and error mapping still execute; for my own functions, monkeypatch at the place they are used, not defined. What I assert: status code, response body shape, the database effect, and the failure mapping (Stripe 500 → my 502). What I deliberately do not test: that FastAPI parses JSON, that Pydantic rejects a wrong type, that SQLAlchemy emits SQL — those are their test suites, and asserting them just makes my suite break on upgrades that changed nothing about my behaviour.",isCaseBased:!1},{question:`What goes into a log line, what never does, and how do you follow one request across eight workers?`,answer:`One JSON object per line to stdout: timestamp, level, logger, message, and structured fields — request_id, user_id, path, status, duration_ms. Structured because filtering and alerting need fields, not sentences. Following a request: generate or accept an X-Request-ID in the outermost middleware, put it on every log record for that request, return it in the response header, and forward it to downstream services — that one string turns interleaved worker output into a single story and is the seed of a distributed trace. Never logged, in any field: passwords, tokens, JWTs, API keys, card numbers, full addresses, health data, session cookies; log the id, not the object, because the object carries the email and the hash. An allowlist in the formatter beats good intentions, since logs are copied to several systems and retained for a year. Levels must mean something — if routine failures are ERROR, the alerts get muted and you are effectively blind.`,isCaseBased:!1},{question:`When is BackgroundTasks enough, and what exactly makes you move to Celery or another queue?`,answer:`BackgroundTasks is enough when the work is short, idempotent-ish, and genuinely losable: a welcome email, an audit row, warming a cache. It runs after the response in the same process, so it costs nothing to set up and adds no infrastructure. You move to a queue the moment any of these are true: the task must not be lost (payments, fulfilment, anything a customer is owed) — a deploy restarts the process and drops it silently; the task is slow or CPU-heavy and would steal capacity from request handling, or block the event loop; you need retries with backoff, a dead-letter queue, or scheduling; you need to see whether it ran. A broker-backed worker pool (Celery/RQ/Arq over Redis or RabbitMQ) buys durability, retries, observability and independent scaling, and costs you a broker to operate plus a new failure mode — a growing queue depth you must actually monitor. Then the API just enqueues an id and returns 202, and the client polls or gets a webhook.`,isCaseBased:!1}],flashcards:[{front:`Middleware onion — order rule`,back:`Request goes IN through each layer, response comes OUT in reverse. The LAST registered middleware is outermost, so it runs first inbound and last outbound.`},{front:`Middleware or dependency?`,back:`Identical for every route and route-agnostic (request id, timing, CORS, gzip) → middleware. Needs route context or applies to some routes (auth, DB session, per-endpoint limits) → dependency.`},{front:`The real payoff of Depends`,back:`app.dependency_overrides[get_db] = fake — swap any dependency in tests with one line. No import patching, no mock library.`},{front:`BackgroundTasks — ceiling`,back:`Runs after the response in the SAME process: no retries, no persistence, no visibility. Lost on every deploy. Needs durability/retries/scheduling → Celery or another queue.`},{front:`Cache-aside, in one line`,back:`Check cache → miss → read DB → write it back with a TTL → return. The app owns the logic; Redis never touches your database.`},{front:`Invalidation on write — the order`,back:`Commit FIRST, then DEL the key. Deleting before the commit lets a concurrent reader re-cache the old row for a full TTL.`},{front:`Cache stampede`,back:`A hot key expires and every concurrent request hits the DB with the same query. Fixes: jitter the TTL, a short lock so one request rebuilds, or refresh-ahead.`},{front:`Token bucket — the two knobs`,back:`Capacity = burst you forgive. Refill rate = the rate you actually enforce. Reject with 429 + Retry-After; keep the counter in Redis and check it atomically.`},{front:`Offset vs keyset pagination`,back:`OFFSET n makes the DB produce and discard n rows — cost grows with page depth. Keyset: WHERE (sort_key, id) < cursor, index-backed, same cost on every page. Price: no jump-to-page, no total count.`},{front:`Never log`,back:`Passwords, tokens/JWTs/API keys, card numbers, full addresses, health data, session cookies. Log the id, not the object. Put the request_id on every line.`}],mindmapMarkdown:`- Production Patterns
  - Middleware onion
    - In through layers, out in reverse
    - Last registered runs first
    - Cross-cutting only; route-specific -> dependency
  - Dependency injection
    - Depends resolves the tree, cached per request
    - yield = setup, then teardown after the response
    - dependency_overrides = the test payoff
  - Background tasks
    - After the response, same process
    - No retry, no persistence, lost on deploy
    - Graduate to Celery / queue (L3)
  - Caching with Redis
    - Cache-aside: check, miss, DB, populate
    - Always a TTL; cache expensive reads only
    - Invalidate: TTL / delete-on-write / write-through
    - Delete AFTER the commit
    - Stampede: jitter, lock, refresh-ahead
    - maxmemory-policy allkeys-lru
  - Rate limiting
    - Protect the DB, fairness, abuse
    - Token bucket: capacity = burst, refill = rate
    - Per-user inside, per-IP at the edge
    - 429 + Retry-After
    - Shared atomic state in Redis
  - Pagination
    - OFFSET walks and discards rows
    - Keyset: WHERE (sort_key, id) < cursor
    - Index must match the ORDER BY
    - limit + 1 gives next_cursor without COUNT
  - Testing
    - TestClient in-process, real routing
    - SQLite in-memory or rollback per test
    - monkeypatch and respx for external calls
    - Test contracts, not the framework
  - Logging and health
    - JSON lines with request_id
    - Never log secrets or PII
    - Liveness: no dependency checks
    - Readiness: dependencies checked`};export{e as default};