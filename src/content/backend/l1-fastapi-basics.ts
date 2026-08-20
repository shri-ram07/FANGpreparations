import type { Module } from '../types'

const m: Module = {
  id: 'backend-l1-fastapi-basics',
  subjectId: 'backend',
  level: 1,
  title: 'FastAPI: Routes, Pydantic & Your First CRUD API',
  whyItMatters:
    '"Can you ship an API?" is the question that separates an ML person from an ML engineer. FastAPI is the shortest honest answer: you write typed Python, and validation, error responses and live API docs appear for free. This module builds a real CRUD service end to end — and hands you the schema-separation habit that stops you from ever leaking a password hash in a JSON response.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'Why FastAPI: one type hint does three jobs',
      md: `In the Python track you learned that type hints are *labels* — Python itself never checks them (see the **Type Hints & Dataclasses** module). FastAPI is the framework that finally enforces them.

- Write \`note_id: int\` once. You get: parsing, validation, a 422 error for bad input, and a line in the API documentation. Three jobs, one hint.
- **Async-native**: it runs on ASGI (the async web standard), so a handler can be \`async def\` and thousands of waiting requests share one thread. Flask's older WSGI world blocks a worker per request.
- The docs are not a chore you write later. They are generated from your code and can never drift out of date.
- Speed comes from the same place: validation is done by **pydantic-core**, which is compiled Rust, not a hand-written pile of \`if\` statements.
- The mental model: *your function signature IS the API contract.*`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The whole framework in 13 lines (main.py)',
      code: `from fastapi import FastAPI

app = FastAPI(title="Notes API", version="1.0.0")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/notes/{note_id}")
def read_note(note_id: int):
    return {"note_id": note_id, "doubled": note_id * 2}`,
      annotations: {
        3: 'One application object. Everything — routes, middleware, docs, startup hooks — hangs off it. title and version show up in the generated docs.',
        6: 'The decorator IS the routing table. HTTP method (get) and path, together, pick this function. No separate routes file.',
        8: 'Return a dict, a list, or a Pydantic model — FastAPI serializes it to JSON and sets content-type for you.',
        12: 'note_id: int is not a comment. FastAPI parses "7" out of the URL into the integer 7, and rejects "abc" with a 422 before your function body ever runs.',
      },
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'Run it — the exact command',
      code: `pip install "fastapi[standard]" uvicorn

# module path : the app variable inside it
uvicorn app.main:app --reload --port 8000

# single-file version, if main.py sits in the current folder
uvicorn main:app --reload

curl http://127.0.0.1:8000/notes/7
# {"note_id":7,"doubled":14}

curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/notes/abc
# 422

# open these in a browser — you wrote zero lines for them:
#   http://127.0.0.1:8000/docs          Swagger UI, with a "Try it out" button
#   http://127.0.0.1:8000/redoc         ReDoc, the readable version
#   http://127.0.0.1:8000/openapi.json  the machine-readable spec`,
      annotations: {
        4: 'Read it as import-path : variable-name. "app.main:app" means "from app/main.py, take the object called app".',
        7: '--reload watches your files and restarts on save. Development only — in production you run Uvicorn workers under a process manager (Level 3).',
        13: 'Bad type in the URL gives 422 Unprocessable Entity, not a 500 crash and not a silent string. Validation happens at the door.',
        16: 'This is the free win: OpenAPI is generated from your type hints, so the docs cannot drift from the code. Frontends and clients can be generated from that JSON.',
      },
    },
    {
      type: 'intuition',
      title: 'Three doors data comes through',
      md: `Every request carries data in exactly three places, and FastAPI decides which by looking at your signature.

- **Path** — the identity of the thing: \`/notes/7\`. Declared inside \`{ }\` in the route string.
- **Query** — how you want it: \`/notes?limit=20&q=milk\`. Optional filters, paging, sorting.
- **Body** — the payload you are sending: JSON on POST/PUT.
- The rule FastAPI applies: name appears in the path → path param. Simple type (int, str, bool) not in the path → query param. **Pydantic model** → request body.
- Never put a secret or a big blob in a query string — URLs land in browser history, proxy logs and server access logs.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Path and query params, typed',
      code: `from typing import Literal
from fastapi import FastAPI, Query

app = FastAPI()


@app.get("/notes")
def list_notes(
    limit: int = Query(20, ge=1, le=100),
    offset: int = 0,
    q: str | None = None,
    sort: Literal["new", "old"] = "new",
):
    # GET /notes?limit=5&q=milk  ->  limit=5, offset=0, q="milk", sort="new"
    return {"limit": limit, "offset": offset, "q": q, "sort": sort}


@app.get("/users/{user_id}/notes/{note_id}")
def read_user_note(user_id: int, note_id: int):
    # /users/3/notes/7 -> both strings coerced to int; /users/abc/... -> 422
    return {"user_id": user_id, "note_id": note_id}`,
      annotations: {
        9: 'Query() adds constraints: ge=1, le=100. They are enforced (422 outside the range) AND published in the docs. A default value makes the param optional.',
        11: 'str | None = None is how you say "optional, may be absent". Requires Python 3.10+; on 3.9 use Optional[str].',
        12: 'Literal becomes a dropdown in /docs and a 422 for anything else — a free enum without writing an enum.',
        19: 'Two path params, both typed. Query strings arrive as text; the hint is what turns "7" into 7.',
      },
    },
    {
      type: 'intuition',
      title: 'Pydantic v2: the model is the door guard',
      md: `A Pydantic model is a class whose job is to say *"this dict is either the shape I declared, or it is rejected"*.

- Subclass \`BaseModel\`, declare fields with types. That is the whole API surface for 90% of use.
- \`Field(...)\` attaches constraints and metadata: \`min_length\`, \`max_length\`, \`ge\`, \`le\`, \`default_factory\`, \`description\`.
- Parsing, not just checking: \`"7"\` becomes \`7\`, \`"2026-08-20"\` becomes a \`date\`. Pydantic coerces where it is safe and refuses where it is not.
- Invalid input never reaches your handler. Your function body can assume the data is clean — that is the whole point.
- One model, one direction. The next section is why that matters more than anything else here.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The Notes schemas — three shapes, one resource',
      code: `from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class NoteCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    body: str = ""
    tags: list[str] = Field(default_factory=list, max_length=10)
    pinned: bool = False

    @field_validator("title")
    @classmethod
    def strip_and_reject_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("title cannot be whitespace only")
        return v.strip()


class NoteUpdate(BaseModel):
    title: str | None = None
    body: str | None = None
    pinned: bool | None = None


class NoteRead(BaseModel):
    id: int
    title: str
    body: str
    tags: list[str]
    pinned: bool
    created_at: datetime`,
      annotations: {
        6: 'Constraints live on the field, not in your handler. min_length/max_length are enforced and documented in one stroke.',
        8: 'default_factory=list gives each instance its own list. Pydantic does copy plain defaults, but default_factory is the habit that keeps you safe in ordinary classes too.',
        11: 'field_validator runs after the type is parsed. @classmethod under it is required in Pydantic v2 — swap the order and you get a confusing error.',
        15: 'raise ValueError inside a validator. FastAPI catches it and turns it into a 422 with your message — never a 500.',
        19: 'Update = every field optional. Combined with exclude_unset, this is how "change only what I sent" works.',
        25: 'Read carries id and created_at, which the client never sends. Same resource, different direction, different class.',
      },
    },
    {
      type: 'note',
      md: 'Validators in one box: `@field_validator("x")` checks one field; `@model_validator(mode="after")` checks *relationships between* fields (e.g. `end_date > start_date`); `mode="before"` sees the raw value before type coercion — use it for cleanup like stripping currency symbols. Rule of thumb: if a constraint fits in `Field(...)`, use `Field(...)`; write a validator only when the rule needs logic.',
    },
    {
      type: 'intuition',
      title: 'The schema-separation lesson: never leak the hash',
      md: `The single most common junior bug in an API: **one model used for input, storage and output.**

- The client sends \`password\`. The database stores \`password_hash\`. The response must contain **neither**.
- One shared model means every one of those fields is reachable from every direction. Add \`is_admin\` for internal use and you just published it.
- So: **Create** (what the client may send) · **InDB / model** (what you store) · **Read** (what you promise to return).
- \`response_model=UserRead\` on the route is the enforcement. FastAPI serializes your returned object *through* that model and drops everything not declared in it.
- It is a filter and a contract at once: the same declaration writes the response schema in the docs.
- Say this in interviews: *"the response model is a whitelist, not a courtesy."*`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'response_model as a whitelist',
      code: `from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):     # what the client SENDS
    email: EmailStr
    password: str                # plain text in transit only, never stored


class UserInDB(BaseModel):       # what the DATABASE holds
    id: int
    email: EmailStr
    password_hash: str
    is_admin: bool = False


class UserRead(BaseModel):       # what the API RETURNS
    id: int
    email: EmailStr


@app.post("/users", response_model=UserRead, status_code=201)
def create_user(payload: UserCreate):
    user = UserInDB(
        id=next_id(),
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db[user.id] = user
    return user`,
      annotations: {
        1: 'EmailStr validates the address shape. It needs the email-validator package — already there if you installed fastapi[standard].',
        6: 'password exists on exactly one schema, pointing in exactly one direction: inbound.',
        12: 'The field that must never appear in a response. It exists on the storage model and nowhere else.',
        16: 'Three classes, three audiences. This is not boilerplate — it is the boundary between what you accept, what you keep, and what you promise.',
        21: 'response_model is the output filter AND the documented schema. status_code=201 because a POST that created something is not a plain 200.',
        29: 'You returned an object containing password_hash and is_admin. The client receives only id and email. With one shared model, that hash ships.',
      },
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One request: raw JSON in, filtered JSON out',
        notice: 'Left = what your code holds. Right = the actual data. Watch the untrusted blob become a typed object, and watch password_hash never make it out.',
        leftLabel: 'the request',
        rightLabel: 'the data',
        frames: [
          {
            note: 'POST /users arrives. At this instant the body is untrusted bytes — no types, no guarantees, possibly hostile.',
            stack: [{ name: 'POST /users', to: 'raw' }],
            heap: [{ id: 'raw', value: '{"email": "asha@x.com", "password": "hunter2"}', label: 'untrusted JSON' }],
          },
          {
            note: 'Pydantic parses the blob against UserCreate: email shape checked, password present, unknown keys handled. Only now does a typed object exist.',
            stack: [{ name: 'payload: UserCreate', to: 'model' }],
            heap: [
              { id: 'raw', value: '{"email": "asha@x.com", "password": "hunter2"}', label: 'raw body' },
              { id: 'model', value: 'UserCreate(email=..., password=...)', label: 'typed + validated' },
            ],
          },
          {
            note: 'A different request, bad payload: email is not an address. Validation fails at the door — your handler is never called, and FastAPI answers 422 with the exact field that failed.',
            stack: [{ name: 'payload: UserCreate', value: 'REJECTED', to: 'bad', danger: true }],
            heap: [{ id: 'bad', value: '{"email": "not-an-email"}', label: '422 Unprocessable Entity', freed: true }],
          },
          {
            note: 'Back to the good request. create_user() runs on clean data and builds the internal object — which deliberately holds fields the client must never see.',
            stack: [{ name: 'create_user()', to: 'row' }],
            heap: [{ id: 'row', value: 'UserInDB(id=7, email, password_hash, is_admin)', label: 'internal object' }],
          },
          {
            note: 'You returned UserInDB, but the route declared response_model=UserRead. FastAPI serializes through that whitelist: id and email survive, password_hash and is_admin are dropped before a single byte leaves the process.',
            stack: [{ name: 'HTTP 201 response', to: 'out' }],
            heap: [
              { id: 'out', value: '{"id": 7, "email": "asha@x.com"}', label: 'filtered by UserRead' },
              { id: 'gone', value: 'password_hash, is_admin — dropped', freed: true },
            ],
          },
        ],
      },
    },
    {
      type: 'note',
      md: 'The five routes and their status codes: `GET /notes` list → **200** · `GET /notes/{id}` one → **200** or **404** · `POST /notes` create → **201** · `PUT /notes/{id}` update → **200** or **404** · `DELETE /notes/{id}` → **204** (done, empty body). Pick the code deliberately — a 200 with `{"error": "..."}` inside is the classic amateur tell.',
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Notes API, part 1: the router and the reads',
      code: `from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/notes", tags=["notes"])

_notes: dict[int, NoteRead] = {}   # the "database" for now
_next_id = 1


@router.get("", response_model=list[NoteRead])
def list_notes(limit: int = 20, offset: int = 0):
    rows = sorted(_notes.values(), key=lambda n: n.id)
    return rows[offset : offset + limit]


@router.get("/{note_id}", response_model=NoteRead)
def get_note(note_id: int):
    note = _notes.get(note_id)
    if note is None:
        raise HTTPException(status_code=404, detail=f"note {note_id} not found")
    return note`,
      annotations: {
        4: 'APIRouter is a mini-app. prefix mounts every route under /notes; tags groups them into one section in the docs.',
        6: 'In-memory on purpose: the routing and validation lessons are the point. SQLAlchemy and a real database are the next module.',
        10: 'Path "" means the prefix itself → GET /notes. response_model=list[NoteRead] filters and documents every element of the list.',
        13: 'offset/limit paging — simple and fine at this size. It drifts when rows are inserted mid-scroll; cursor pagination (Level 2) is the fix.',
        20: 'raise, do not return. HTTPException unwinds to a JSON body with the right status. Returning an error dict would still send 200 OK, and every client would believe it worked.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Notes API, part 2: create, update, delete',
      code: `@router.post("", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
def create_note(payload: NoteCreate):
    global _next_id
    note = NoteRead(
        id=_next_id,
        created_at=datetime.now(timezone.utc),
        **payload.model_dump(),
    )
    _notes[note.id] = note
    _next_id += 1
    return note


@router.put("/{note_id}", response_model=NoteRead)
def update_note(note_id: int, payload: NoteUpdate):
    note = _notes.get(note_id)
    if note is None:
        raise HTTPException(404, f"note {note_id} not found")
    patch = payload.model_dump(exclude_unset=True)
    _notes[note_id] = note.model_copy(update=patch)
    return _notes[note_id]


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: int):
    if _notes.pop(note_id, None) is None:
        raise HTTPException(404, f"note {note_id} not found")
    return None`,
      annotations: {
        1: 'status.HTTP_201_CREATED is just the integer 201 with a readable name. status_code sets the default for the success path.',
        2: 'One Pydantic parameter = the JSON body. FastAPI reads it, validates it, and hands you a typed object — no request.json(), no manual checks.',
        7: 'model_dump() turns the model into a plain dict. It is Pydantic v2 naming; v1 called it .dict(). Same for model_dump_json / .json().',
        19: 'exclude_unset is the whole trick: it distinguishes "the client sent pinned=null" from "the client never mentioned pinned". Without it, every absent field would overwrite with None.',
        20: 'Honest caveat: model_copy(update=...) does NOT re-run validators. For a real PATCH, merge into a dict and rebuild through NoteRead so the rules run again.',
        24: '204 means "done, nothing to say" — the body must be empty, so no response_model here. Deleting an already-deleted id is where idempotency arguments start.',
      },
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'All five routes, from the terminal',
      code: `# CREATE -> 201
curl -s -X POST localhost:8000/notes -H "content-type: application/json" -d '{"title": "Buy milk", "tags": ["home"]}'
# {"id":1,"title":"Buy milk","body":"","tags":["home"],"pinned":false,"created_at":"2026-08-20T09:14:02Z"}

# LIST -> 200
curl -s "localhost:8000/notes?limit=5"
# [{"id":1,"title":"Buy milk", ... }]

# READ ONE -> 200
curl -s localhost:8000/notes/1

# UPDATE, only the field you sent -> 200
curl -s -X PUT localhost:8000/notes/1 -H "content-type: application/json" -d '{"pinned": true}'
# {"id":1,"title":"Buy milk","body":"","tags":["home"],"pinned":true, ... }

# DELETE -> 204, empty body
curl -i -s -X DELETE localhost:8000/notes/1
# HTTP/1.1 204 No Content

# gone now -> 404 from our HTTPException
curl -s localhost:8000/notes/1
# {"detail":"note 1 not found"}`,
      annotations: {
        2: 'Body is JSON, so the content-type header must say so. Forget it and FastAPI cannot know how to parse the payload.',
        3: 'body and pinned came back with defaults you never sent — Field defaults filled them in during validation.',
        14: 'title and tags are untouched because exclude_unset dropped them from the patch. This is PUT behaving like PATCH; strict REST would demand the full object on PUT.',
        22: 'Your detail string became the JSON body. Keep these messages useful but never leak internals — no SQL, no stack traces, no file paths.',
      },
    },
    {
      type: 'intuition',
      title: 'Errors: three layers, one shape',
      md: `Clients need failures that are as predictable as successes.

- **HTTPException** — the workhorse: \`raise HTTPException(404, "note not found")\`. Sets status and a JSON \`detail\`. Raise it anywhere, even deep in a helper.
- **Validation (422)** — automatic. Pydantic builds a list under \`detail\`, one entry per bad field, each with \`loc\` (where), \`msg\` (what), \`type\` (machine-readable code).
- **Custom exception handlers** — register once, and your domain exceptions (\`NoteNotFound\`, \`QuotaExceeded\`) get converted to responses at the edge. Services stay free of HTTP imports.
- Unhandled exception → **500**, and FastAPI deliberately tells the client nothing else. Details go to your logs, never to the response.
- Rule: **4xx is your caller's fault, 5xx is yours.** Never dress a bug up as a 400 to keep your error dashboard clean.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'HTTPException, plus a handler for your own exception',
      code: `from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

app = FastAPI()


class NoteNotFound(Exception):          # domain error: knows nothing about HTTP
    def __init__(self, note_id: int):
        self.note_id = note_id


@app.exception_handler(NoteNotFound)
def handle_note_not_found(request: Request, exc: NoteNotFound):
    return JSONResponse(
        status_code=404,
        content={"error": "note_not_found", "id": exc.note_id},
    )


@app.get("/notes/{note_id}/raw")
def raw_note(note_id: int):
    if note_id not in _notes:
        raise NoteNotFound(note_id)
    if not owns(note_id):
        raise HTTPException(403, "not your note", headers={"X-Reason": "owner"})
    return _notes[note_id]`,
      annotations: {
        7: 'A plain Exception. Your service layer can raise it without importing FastAPI — that is how business logic stays testable and framework-free.',
        12: 'Registered once at the app level. Every route that raises NoteNotFound now answers with the same body — errors stay consistent as the codebase grows.',
        16: 'A stable machine-readable error code beats a prose message. Mobile clients switch on "note_not_found"; they cannot switch on a sentence you might reword.',
        23: 'Raised from four frames deep if you like — it still becomes a clean 404.',
        24: 'HTTPException also carries response headers. Useful for 401 WWW-Authenticate and 429 Retry-After later.',
      },
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'The 422 shape — memorize this body',
      code: `curl -s localhost:8000/notes/abc
# {"detail":[{"type":"int_parsing","loc":["path","note_id"],
#             "msg":"Input should be a valid integer, unable to parse string as an integer",
#             "input":"abc"}]}

curl -s -X POST localhost:8000/notes -H "content-type: application/json" -d '{"body": "no title here"}'
# {"detail":[{"type":"missing","loc":["body","title"],
#             "msg":"Field required","input":{"body":"no title here"}}]}`,
      annotations: {
        2: 'detail is a LIST — one entry per failing field, so a form with four bad inputs comes back in one round trip, not four.',
        3: 'msg is human text that may be reworded between versions. Display it, never branch on it.',
        7: 'loc is a path: ["path","note_id"], ["body","title"], ["query","limit"] — it tells a frontend exactly which input to highlight. type is the stable machine code ("missing", "int_parsing", "string_too_short") your client switches on.',
      },
    },
    {
      type: 'intuition',
      title: 'The layout that survives file number six',
      md: `A single \`main.py\` is fine until route number twenty. Then it is a 900-line file nobody can review.

- **APIRouter** is a mini-FastAPI: same decorators, own \`prefix\` and \`tags\`. \`app.include_router(notes.router)\` mounts it.
- Split by *layer*, not by feature-of-the-week: \`routers/\` (HTTP), \`schemas/\` (wire shapes), \`models/\` (database rows), \`services/\` (business logic), \`core/\` (config, security).
- The discipline that pays: **no FastAPI import inside \`services/\`**. Business logic that knows nothing about HTTP can be tested without a server and reused by a Celery worker later.
- \`schemas/\` and \`models/\` are different files for a reason — one is the shape on the wire, the other the shape on disk. They diverge fast.
- Do this on day one. Retrofitting structure onto a 900-line main.py is a weekend you will not enjoy.`,
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'The app/ package layout',
      code: `app/
  main.py            # FastAPI() + include_router calls. Nothing else.
  core/
    config.py        # Settings via pydantic-settings — the ONLY place env vars are read
    security.py      # hashing, tokens (Level 2)
  routers/
    notes.py         # APIRouter(prefix="/notes")
    users.py         # APIRouter(prefix="/users")
  schemas/
    note.py          # NoteCreate / NoteUpdate / NoteRead — the shape ON THE WIRE
  models/
    note.py          # DB rows (SQLAlchemy, next module) — the shape ON DISK
  services/
    notes.py         # business rules. No FastAPI imports here.
tests/
  test_notes.py
.env                 # local secrets. Git-ignored, always.`,
      annotations: {
        2: 'main.py should be boring: build the app, wire the routers, register handlers. If logic creeps in here, it is untestable without HTTP.',
        4: 'One place reads the environment. Every other module imports Settings — so nobody hunts for a stray os.environ call at 2am.',
        14: 'The layer that survives a rewrite. Swap FastAPI for something else and services/ does not change a line.',
        17: 'Committing .env is how secrets end up on GitHub. Commit a .env.example with empty values instead.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Settings from the environment (core/config.py)',
      code: `from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Notes API"
    database_url: str = "sqlite:///./notes.db"
    secret_key: str                      # no default: the app refuses to boot without it
    debug: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()

# .env (git-ignored):
#   SECRET_KEY=dev-only-not-a-real-secret
#   DATABASE_URL=postgresql+psycopg://user:pass@localhost/notes
#   DEBUG=true`,
      annotations: {
        5: 'Same Pydantic validation, different source: environment variables instead of a JSON body. Field names map to env vars case-insensitively.',
        8: 'A required setting with no default is a feature — the process crashes at startup instead of running for a week with a blank signing key.',
        9: 'DEBUG=true in the environment arrives as the string "true" and is parsed into the boolean True. Types work here too.',
        11: 'env_file is a developer convenience. In production the real environment wins — that is 12-factor config: same image, different env, zero code change.',
        14: 'lru_cache means the environment is read once per process, not once per request.',
        19: 'Never hardcode a secret or a connection string in source. It leaks through git history, forks, and screenshots.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Wiring it together (app/main.py)',
      code: `from fastapi import FastAPI

from app.core.config import get_settings
from app.routers import notes, users

settings = get_settings()
app = FastAPI(title=settings.app_name, debug=settings.debug)

app.include_router(notes.router)
app.include_router(users.router)


@app.get("/health", tags=["ops"])
def health():
    return {"status": "ok", "app": settings.app_name}`,
      annotations: {
        9: 'The router already carries its own prefix and tags, so mounting is one line. Adding a resource = one new file plus one line here.',
        13: 'A health endpoint is not optional in production: load balancers and Kubernetes probes call it to decide whether your process still deserves traffic.',
      },
    },
    {
      type: 'note',
      md: 'Two loose ends worth naming. **Trimming a response further**: `response_model_exclude={"created_at"}` drops fields for one route, and `response_model_exclude_none=True` hides nulls — but the schema-separation habit is still the real defence; these are for edge cases. **Testing**: FastAPI ships `TestClient`, so a full request/response test is three lines of pytest with no server running — the dedicated pytest module comes in Level 2.',
    },
    {
      type: 'intuition',
      title: 'Practical: a URL shortener in one file',
      md: `The other classic starter project, and a better interview story than CRUD because every design decision is visible.

- Two routes only: **POST /shorten** takes a long URL and returns a short code; **GET /{code}** redirects to the original.
- The short code is the whole design question. Random base62 (a-z A-Z 0-9) of length 7 gives 62⁷ ≈ 3.5 trillion codes — collisions are rare but not impossible, so you must handle them.
- Two strategies, name both: **random + retry on collision** (simple, needs a uniqueness check) or **counter + base62 encode** (no collisions ever, but sequential codes leak how many links you have and are guessable).
- Redirect status matters: **301** is permanent and browsers CACHE it — your click counter stops firing. **302/307** is temporary, so every click comes back through you. Analytics needs 302.
- At scale this becomes a system-design question — read-heavy, cacheable, shardable by code. That version lives in the System Design subject.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The whole thing — 30 lines',
      code: `import secrets, string
from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, HttpUrl

app = FastAPI()
ALPHABET = string.ascii_letters + string.digits   # base62
links: dict[str, str] = {}                        # code -> long url
hits: dict[str, int] = {}

class ShortenIn(BaseModel):
    url: HttpUrl                  # Pydantic rejects "not-a-url" with 422, free

def new_code(n: int = 7) -> str:
    while True:
        code = ''.join(secrets.choice(ALPHABET) for _ in range(n))
        if code not in links:     # collision retry: the loop IS the strategy
            return code

@app.post('/shorten', status_code=201)
def shorten(body: ShortenIn) -> dict[str, str]:
    code = new_code()
    links[code] = str(body.url)
    hits[code] = 0
    return {'code': code, 'short_url': f'http://localhost:8000/{code}'}

@app.get('/{code}')
def follow(code: str) -> RedirectResponse:
    if code not in links:
        raise HTTPException(404, 'no such link')
    hits[code] += 1                        # counted because 302, not 301
    return RedirectResponse(links[code], status_code=302)`,
      annotations: {
        7: 'base62 = 62 symbols. Length 7 gives 62^7 ~ 3.5 trillion codes; length 6 gives 56 billion. Pick length from expected volume, not vibes.',
        12: 'HttpUrl is the validation win: garbage input never reaches your dict, and the 422 body says exactly why.',
        16: 'secrets, not random — random is seeded and predictable, and guessable short codes leak links that were meant to be private.',
        18: 'The collision check. With a real DB this becomes a UNIQUE constraint plus a retry on IntegrityError — same idea, enforced by the database.',
        31: 'THE decision: 302 keeps every click coming through you so hits increments. Switch to 301 and the browser caches the redirect — your counter silently freezes.',
      },
    },
    {
      type: 'note',
      md: 'In-memory dicts vanish on restart — fine for learning, wrong for anything real. The production version swaps them for a table with `code` as the primary key (so the DB enforces uniqueness), adds an optional expiry, and puts the hot code→URL lookup in Redis because reads outnumber writes by orders of magnitude.',
    },
  ],
  quiz: [
    {
      question: 'A request hits `GET /notes/abc` where the handler is `def get_note(note_id: int)`. What happens?',
      options: [
        { text: 'The handler runs with note_id = "abc"', explanation: 'No. The type hint is enforced by FastAPI — a value that cannot become an int never reaches your body.' },
        { text: 'FastAPI returns 422 before the handler runs', explanation: 'Correct. Validation happens at the door; the response names the failing location as ["path","note_id"].' },
        { text: 'A 500 error, because int("abc") raises', explanation: 'That would be true if you parsed manually. Pydantic converts the failure into a clean client error instead.' },
        { text: 'A 404, because the note does not exist', explanation: 'The type never validated, so no lookup was attempted. Bad input beats missing resource.' },
      ],
      correct: 1,
    },
    {
      question: 'You declare `def create(payload: NoteCreate, limit: int = 20)`. Where does FastAPI look for each value?',
      options: [
        { text: 'Both in the JSON body', explanation: 'Only the Pydantic model is read from the body. A plain scalar with a default is a query param.' },
        { text: 'payload from the body, limit from the query string', explanation: 'Correct. Pydantic model → body; simple type not in the path → query param; name inside the path string → path param.' },
        { text: 'Both from the query string', explanation: 'A Pydantic model cannot come from the query string by default — it maps to the request body.' },
        { text: 'FastAPI raises an error for the mixed signature', explanation: 'Mixing body, query and path params in one signature is normal and encouraged.' },
      ],
      correct: 1,
    },
    {
      question: 'Your route returns a `UserInDB` object containing `password_hash`, but declares `response_model=UserRead` which has only id and email. The client receives…',
      options: [
        { text: 'Only id and email — response_model filters the output', explanation: 'Correct. FastAPI serializes your return value through the declared model; undeclared fields are dropped before the response is written.' },
        { text: 'Everything, including password_hash', explanation: 'This is the bug response_model exists to prevent. It does not happen here.' },
        { text: 'A 500, because the types do not match', explanation: 'No mismatch error: FastAPI validates and narrows your object into the response model.' },
        { text: 'Nothing — response_model only affects the documentation', explanation: 'It does both: it documents the response AND filters it. That dual role is the exam question.' },
      ],
      correct: 0,
    },
    {
      question: 'In a PUT handler, why call `payload.model_dump(exclude_unset=True)`?',
      options: [
        { text: 'It is faster than model_dump()', explanation: 'Speed is not the point — correctness of the merge is.' },
        { text: 'To distinguish fields the client actually sent from fields left out', explanation: 'Correct. Without it, every unmentioned optional field arrives as None and would overwrite good stored data.' },
        { text: 'To strip fields that failed validation', explanation: 'Failed validation never gets this far — the request is already a 422.' },
        { text: 'To exclude fields with a None value', explanation: 'That is exclude_none. exclude_unset is about what was *provided*, regardless of value — a deliberately sent null still counts as set.' },
      ],
      correct: 1,
    },
    {
      question: 'Which status code should a successful `DELETE /notes/1` return in this module\'s design?',
      options: [
        { text: '204 No Content, with an empty body', explanation: 'Correct — the work is done and there is nothing to say. Which is also why the route declares no response_model.' },
        { text: '200 with the deleted object', explanation: 'Legal, but you are returning something you just destroyed. 204 states the outcome more honestly.' },
        { text: '201 Created', explanation: '201 announces that a new resource exists. The opposite happened.' },
        { text: '404, since the note no longer exists', explanation: 'The delete succeeded. 404 would describe the *next* request for that id.' },
      ],
      correct: 0,
    },
    {
      question: 'Inside a handler you write `return {"error": "note not found"}` instead of raising HTTPException. What breaks?',
      options: [
        { text: 'Nothing — the client sees the message', explanation: 'It sees the message wrapped in 200 OK. Every retry policy, cache and monitor will treat a failure as a success.' },
        { text: 'FastAPI converts it to a 404 automatically', explanation: 'There is no such inference. FastAPI sends what you return with the route\'s declared status code.' },
        { text: 'The response is 200 OK, so clients believe the call succeeded', explanation: 'Correct. The status line is the contract; a payload that says "error" inside a 200 is invisible to proxies, dashboards and client error handling.' },
        { text: 'It raises a validation error', explanation: 'It might, if a response_model is declared — but the core problem is the wrong status code.' },
      ],
      correct: 2,
    },
    {
      question: 'What exactly is under `detail` in a 422 validation response?',
      options: [
        { text: 'A single human-readable string', explanation: 'That is the shape of an HTTPException detail, not a validation error.' },
        { text: 'A stack trace', explanation: 'FastAPI never sends tracebacks to clients. Those belong in your logs.' },
        { text: 'The raw request body', explanation: 'The offending input appears per-entry, but detail itself is the list of errors.' },
        { text: 'A list of objects, each with loc, msg, type and input', explanation: 'Correct. One entry per failing field — loc pinpoints it (["body","title"]), type is the stable machine code to branch on.' },
      ],
      correct: 3,
    },
    {
      question: 'Why keep `services/` free of FastAPI imports?',
      options: [
        { text: 'To make the import graph smaller', explanation: 'A marginal effect, not the reason anyone does this.' },
        { text: 'FastAPI forbids imports outside routers', explanation: 'No such rule exists. This is a design discipline, not a constraint.' },
        { text: 'So business logic can be tested and reused without HTTP — by a worker, a CLI, or a script', explanation: 'Correct. Logic coupled to Request/HTTPException can only run inside a web request; decoupled logic outlives the framework.' },
        { text: 'Because Pydantic models cannot be used in services', explanation: 'Pydantic is independent of FastAPI and is perfectly usable anywhere.' },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why FastAPI over Flask for a new ML-serving API? Give real reasons, not marketing.',
      answer:
        'Three concrete ones. (1) ASGI/async-native: an inference endpoint spends most of its time waiting on a model server, a database or another API — async handlers let one process hold thousands of in-flight requests instead of one per worker thread. (2) Validation is declarative and compiled: the type hints are enforced by pydantic-core (Rust), so malformed input becomes a structured 422 at the boundary rather than a TypeError three layers deep. (3) OpenAPI comes free and cannot drift, which matters when a mobile team or another service consumes you. The honest counterweight: Flask/Django have a bigger plugin ecosystem and Django brings an admin and ORM out of the box — if you need those, FastAPI means assembling more pieces yourself.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through everything that happens between the raw bytes of a POST and your handler running.',
      answer:
        'Uvicorn (the ASGI server) parses the HTTP request and hands FastAPI a scope plus a body stream. FastAPI matches the method and path to a route, extracts path params from the URL, query params from the query string, and reads the body. Each declared parameter is then validated by Pydantic: path/query values are coerced from strings into their annotated types, and the body is parsed into the Pydantic model. If any of that fails, the request short-circuits into a 422 whose detail lists every failing location — the handler is never called. Dependencies (Level 2) resolve next. Only then does your function run, with everything already typed and validated. On the way out, the return value is filtered and validated through response_model, JSON-encoded, and given the route\'s status code.',
      isCaseBased: false,
    },
    {
      question: 'Why three schemas per resource instead of one? Argue the cost too.',
      answer:
        'Because the three directions have genuinely different fields. Create accepts what a client is allowed to set — never id, never created_at, never is_admin. The storage model holds what you persist, including password_hash. Read declares what you promise to return. One shared model means any field is reachable from every direction: clients can attempt to set is_admin, and any internal column you add is published to the world by default. The cost is real — more classes, and duplicated field lists that must be kept in sync — and you can soften it with a shared base class. But the failure mode of the cheap approach is a leaked credential hash or a privilege-escalation field, which is not a refactor, it is an incident.',
      isCaseBased: false,
    },
    {
      question: 'Case: a security review finds your /users endpoint has been returning password_hash and is_admin for months. Explain how it happened and how you prevent the whole class of bug.',
      answer:
        'The cause is almost always one model used for storage and response: the route returned the ORM/DB object directly, or declared response_model as the storage model, so every column serialized. Immediate fix: introduce a UserRead schema with the exact public field list and set response_model=UserRead on every route touching users; force a password reset for exposed accounts and treat the hashes as compromised. Preventing the class, not the instance: (1) a rule that no route ever returns a storage object without a response_model, checkable in review or with a small test that asserts the OpenAPI schema for each 2xx response contains no field from a denylist; (2) contract tests that assert the response keys exactly; (3) name public schemas *Read/Public* so a reviewer notices instantly when a storage model appears in a route signature. The senior move is the automated check — humans forget, CI does not.',
      isCaseBased: true,
    },
    {
      question: 'When do you use HTTPException versus a custom exception handler?',
      answer:
        'HTTPException where the HTTP meaning is local and obvious — a router-layer 404 or 403. A custom exception handler when the same domain failure occurs in many places and should look identical everywhere, and especially when the failure is raised deep in a service that should not import FastAPI at all. The pattern: services raise domain exceptions (NoteNotFound, QuotaExceeded, PaymentDeclined); one handler per exception maps it to a status code and a stable error body at the edge. Benefits: consistent error contract, business logic that is testable without a web framework, and one place to change if you later add a request id or an error catalogue.',
      isCaseBased: false,
    },
    {
      question: 'What is the difference between 400, 404, 409, 422 and 500 — and who is at fault in each?',
      answer:
        '400: the request is malformed in a way you reject yourself (bad combination of params, unparseable input). 404: the resource identified does not exist. 409: the request is valid but conflicts with current state — duplicate email, editing a stale version. 422: the request parsed as JSON but failed schema validation; this is FastAPI\'s automatic validation answer. 500: your bug — an unhandled exception. Fault line: 4xx means the caller must change something and retrying identically will fail the same way; 5xx means the caller may retry and the fix is on your side. Never return 4xx for your own crash to keep an error budget looking healthy — you destroy the signal that tells clients whether to retry.',
      isCaseBased: false,
    },
    {
      question: 'Case: your team ships a POST /notes that returns 200 with {"ok": false, "reason": "..."} on failure. The mobile team says errors are "invisible". Diagnose and propose the fix.',
      answer:
        'Everything between the client and your app reads the status line, not the body: HTTP client libraries only raise on 4xx/5xx, load balancers and CDNs count 200s as success, retry middleware never retries, and your error-rate dashboard shows a flat zero while users fail. Fix: map failures to real status codes — 422 for validation, 404 for missing, 409 for conflict, 401/403 for auth — with a consistent body carrying a stable machine code plus a human message. Migrate without breaking clients: ship the correct status alongside the existing body shape, announce a version, and give the mobile app a release window before removing the legacy field. Add a test asserting that no error path returns 2xx. The transferable point: the status code is part of the API contract, not decoration.',
      isCaseBased: true,
    },
    {
      question: 'Where do configuration and secrets live, and why not in the code?',
      answer:
        'In the environment, read once through a pydantic-settings Settings class in core/config.py, with .env only as a local developer convenience. Reasons: the same image must run in dev, staging and production with no code change (12-factor); secrets in source leak through git history, forks, screenshots and every developer laptop that ever cloned the repo; and rotating a key should be a restart, not a deploy. Practical details worth saying: required settings get no default so the process fails loudly at startup instead of running with a blank signing key; production secrets come from a secret manager or the orchestrator\'s secret store injected as env vars; .env is git-ignored and a .env.example with empty values is committed instead.',
      isCaseBased: false,
    },
    {
      question: 'Design the REST surface for "notes belonging to users", including one non-CRUD action.',
      answer:
        'Resources are nouns, methods are verbs: GET /notes (list, paginated, filterable), POST /notes (201 + Location header), GET /notes/{id}, PUT or PATCH /notes/{id}, DELETE /notes/{id} (204). Ownership as a nested collection where it is the natural parent: GET /users/{user_id}/notes. Non-CRUD action — "archive" — has two honest options: model it as state (PATCH /notes/{id} with {"archived": true}), which keeps the surface pure, or as a sub-resource action (POST /notes/{id}/archive) when the operation has side effects beyond a field change. Say the tradeoff out loud: the field version is idempotent and cache-friendly; the action version is clearer in logs and permissions. Plus the cross-cutting habits: paginate every list from day one, version the API, and never leak internal ids you did not intend to expose.',
      isCaseBased: false,
    },
    {
      question: 'A junior asks: "Pydantic validated my data, so why did my endpoint still 500?" What do you tell them?',
      answer:
        'Pydantic guarantees *shape*, not *truth*. It confirms the payload matched your declared types and constraints — it says nothing about whether the referenced user exists, whether the database is reachable, whether your business rule holds, or whether your code has a bug. Validation moves an entire class of errors from 500 to 422 at the boundary; everything after that is still your job: existence checks (404), conflict checks (409), permission checks (403), and honest 500s for real failures. The second thing to teach them: read the traceback in the logs — FastAPI intentionally sends the client a bare 500 so internal details never reach the network.',
      isCaseBased: false,
    },
    {
      question: 'Case: an endpoint that used to answer in 30 ms now takes 400 ms after you added a Pydantic response_model over a list of 10,000 rows. What is happening and what do you do?',
      answer:
        'response_model does not just document — every element is validated and re-serialized through the model, so a 10,000-row list pays 10,000 validations plus JSON encoding. Diagnosis: time the handler with and without response_model, and profile to confirm serialization dominates rather than the query. Fixes, in order of laziness: (1) paginate — nobody needed 10,000 rows in one response, and this fixes latency, memory and the client at once; (2) return fewer fields, since the cost scales with field count; (3) if the payload really must be huge, skip the model layer for that route and return a pre-serialized JSONResponse, accepting that you lose the output filter and must be certain about which fields you write; (4) stream it. Name the tradeoff explicitly: option 3 trades a safety net for speed, so it needs a test that pins the exact response keys.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'What does one FastAPI type hint buy you?', back: 'Parsing + validation + a 422 on bad input + a line in the auto-generated OpenAPI docs. The signature IS the contract.' },
    { front: 'Run command', back: 'uvicorn app.main:app --reload --port 8000  — "import path : app variable". --reload is dev only.' },
    { front: 'Where does FastAPI look for each parameter?', back: 'Name inside the path string → path param. Simple type not in the path → query param. Pydantic model → request body.' },
    { front: 'Status code for a failed validation', back: '422 Unprocessable Entity, with detail = a LIST of {type, loc, msg, input} — one entry per failing field.' },
    { front: 'Why separate Create / storage / Read schemas?', back: 'Different directions expose different fields. One shared model publishes password_hash and lets clients set is_admin.' },
    { front: 'response_model does what, exactly?', back: 'Two things: filters the returned object down to the declared fields (a whitelist), and documents the response schema.' },
    { front: 'exclude_unset vs exclude_none', back: 'exclude_unset drops fields the client never sent (partial update). exclude_none drops fields whose value is None. Different questions.' },
    { front: 'HTTPException vs custom exception handler', back: 'HTTPException for local, obvious HTTP meaning. Custom handler to map a domain exception (raised in HTTP-free service code) to one consistent response.' },
    { front: 'The five CRUD routes and their codes', back: 'GET list 200 · GET one 200/404 · POST 201 · PUT 200/404 · DELETE 204 (empty body).' },
    { front: 'Where do settings and secrets come from?', back: 'Environment variables, read once via a pydantic-settings Settings class; .env for local dev only, git-ignored. Required settings get no default so boot fails loudly.' },
  ],
  mindmapMarkdown: `- FastAPI: Routes, Pydantic & Your First CRUD API
  - Why FastAPI
    - ASGI, async-native
    - Type hints ARE the validation
    - Type hints ARE the docs
    - pydantic-core (Rust) does the parsing
  - Routing
    - app = FastAPI(), decorators
    - uvicorn app.main:app --reload
    - Path params: typed, coerced, 422
    - Query params: defaults, optional, Query(ge, le)
    - Body = a Pydantic model
  - Pydantic v2
    - BaseModel + field types
    - Field(min_length, ge, default_factory)
    - field_validator / model_validator
    - model_dump(exclude_unset)
  - Schema per direction
    - Create / InDB / Read
    - response_model = whitelist + contract
    - Never leak password_hash
    - response_model_exclude for edges
  - Notes API CRUD
    - GET list + GET one
    - POST -> 201
    - PUT -> partial via exclude_unset
    - DELETE -> 204 empty body
  - Errors
    - raise HTTPException, never return an error dict
    - Custom handler for domain exceptions
    - 422 body: detail[].loc / msg / type
    - 4xx caller's fault, 5xx yours
  - Structure that scales
    - APIRouter(prefix, tags)
    - app/: routers, schemas, models, services, core
    - No FastAPI imports in services/
    - pydantic-settings + .env, 12-factor
  - Free wins
    - /docs, /redoc, /openapi.json
    - TestClient + pytest (Level 2)`,
}

export default m
