import type { Module } from '../types'

const m: Module = {
  id: 'backend-l2-auth',
  subjectId: 'backend',
  level: 2,
  title: 'Auth: Sessions vs JWT, Hashing & OAuth',
  whyItMatters:
    '"Sessions or JWT?" is the most-asked backend design question after REST, and the wrong answer ("JWT, it scales") ends the round. Auth is also the one area where a single sloppy line — a fast hash, a missing cookie flag, a token in localStorage — becomes a breach. This module gives you the flows, the tradeoffs, and the exact FastAPI code.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'Two different questions: who are you, and what may you touch',
      md: `At an airport, the gate agent checks two things, in order.

- **Authentication (authn)** — your passport. *Who are you?* Proving identity.
- **Authorization (authz)** — your boarding pass. *What may you do?* Business class or economy, this flight or none.
- Passing the first says nothing about the second. A valid passport does not seat you in first class.
- In HTTP this is literally two status codes: **401 Unauthorized** = "I do not know who you are" (authn failed). **403 Forbidden** = "I know exactly who you are, and no" (authz failed).
- Interviewers hand you 401 vs 403 as a trap. Say the sentence: *authentication is identity, authorization is permission.*`,
    },
    {
      type: 'intuition',
      title: 'Passwords: never store what the user gave you',
      md: `A **hash** is a one-way function: easy forwards, impossible backwards. You store the hash, and check logins by hashing again and comparing.

- Rule zero: **never store plaintext**. Your database *will* leak one day; a leak of hashes is an incident, a leak of passwords is a catastrophe across every other site the user reused it on.
- Rule one: **MD5 and SHA-256 are the wrong tool**. They are designed to be *fast* — a GPU does billions per second, so an attacker brute-forces common passwords in minutes. Fast is a feature for checksums and a bug for passwords.
- Rule two: **salt every password**. A salt is a random per-user string mixed in before hashing. Without it, two users with password \`123456\` get identical hashes, and precomputed *rainbow tables* crack the whole dump at once.
- Rule three: use a **deliberately slow** algorithm — **bcrypt** or **argon2** — with a **cost factor** you can raise as hardware gets faster. bcrypt cost 12 means 2¹² internal rounds.
- The salt is not a secret. bcrypt stores it inside the hash string, so verification needs nothing else.
- One line for the interview: *slow, salted, and tunable — bcrypt or argon2, never a plain SHA.*`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Hashing done right',
      code: `from passlib.context import CryptContext
import hmac

pwd = CryptContext(schemes=["bcrypt"], bcrypt__rounds=12)

def register(password: str) -> str:
    return pwd.hash(password)

def login(password: str, stored: str) -> bool:
    return pwd.verify(password, stored)

# a stored bcrypt hash is ONE string carrying everything needed:
# $2b$12$Xy7Qk1sD0mR4uP9wLtVeOu8HcA2Fz3JbNq6RgTk1SvW0YxZmCpUdK
#  algo cost  22-char salt + 31-char digest

# comparing raw secrets (API keys, session ids, HMAC digests):
def token_ok(sent: str, real: str) -> bool:
    return hmac.compare_digest(sent, real)`,
      annotations: {
        4: 'The cost factor is the whole point: 12 -> 2^12 rounds. Raise it every few years as CPUs get faster. Old hashes keep working — the cost is stored inside them.',
        7: 'A fresh random salt is generated per call, so hashing the SAME password twice gives two different strings. That is correct, not a bug.',
        10: 'verify() reads the salt and cost out of the stored string, re-hashes the input the same way, and compares in constant time for you.',
        13: 'Anatomy: $algo$cost$salt+digest. This is why you never need a separate salt column.',
        18: 'compare_digest compares in CONSTANT time. A normal == returns early on the first differing byte, and timing that leak lets an attacker guess a secret byte by byte.',
      },
    },
    {
      type: 'note',
      md: 'Do not roll your own. `passlib`/`bcrypt`/`argon2-cffi` already handle salting, encoding, cost upgrades and constant-time comparison. The one thing you must decide is the cost factor: tune it so a login takes roughly **200–300 ms** on your production hardware — slow enough to hurt an attacker, fast enough that users do not notice.',
    },
    {
      type: 'intuition',
      title: 'Session auth: the server remembers you',
      md: `A nightclub stamps your hand. The stamp means nothing on its own — the bouncer's list is what says the stamp is yours.

- On login the server creates a **session**: a random id plus your user id, stored server-side (Redis, or a \`sessions\` table).
- It sends that id back as a **cookie**. The browser then attaches it to every request to that domain, automatically, forever.
- Every request: look the id up in the store, get the user, proceed. **Stateful** — the truth lives on the server.
- The cookie holds an opaque random id and nothing else. No name, no role, no email.
- Logout = delete the row. The next request with that cookie is instantly anonymous. **Revocation is free.**`,
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'What the browser actually receives',
      code: `$ curl -i -X POST https://app.com/login -d 'user=raj&pass=hunter2'

HTTP/1.1 200 OK
Set-Cookie: sid=8f3a91c0d2b7; HttpOnly; Secure; SameSite=Lax; Max-Age=1209600; Path=/

# every later request carries it with no client-side code at all
$ curl -b 'sid=8f3a91c0d2b7' https://app.com/me
{"id":"u_42","name":"Raj","role":"editor"}`,
      annotations: {
        4: 'Four flags, four different attacks blocked. Missing any one of them is a finding in a security review.',
        7: 'The browser does this by itself — which is exactly why CSRF exists as a class of attack.',
      },
    },
    {
      type: 'note',
      md: 'Cookie flags, and what each one blocks. **HttpOnly** — JavaScript cannot read the cookie, so an XSS payload cannot steal the session (it can still *use* it, but it cannot exfiltrate it). **Secure** — never sent over plain HTTP, so nobody on the café Wi-Fi reads it. **SameSite=Lax/Strict** — the browser withholds the cookie on cross-site requests, which kills most CSRF. **Max-Age / Expires** — bounds the damage of a stolen cookie. Add **Path** and **Domain** to narrow where it is sent at all.',
    },
    {
      type: 'intuition',
      title: 'JWT: the server remembers nothing',
      md: `A concert wristband with your seat printed on it and a hologram over the print. The gate does not phone the box office — it checks the hologram.

- A **JSON Web Token** is three base64url chunks joined by dots: \`header.payload.signature\`.
- **header** — which algorithm (\`HS256\`, \`RS256\`). **payload** — the *claims*: \`sub\` (who), \`exp\` (expiry), \`iat\` (issued at), plus anything you add like \`role\`.
- **signature** = HMAC (or RSA signature) over \`header.payload\` using a key only the server holds.
- The gotcha every interviewer plants: **the payload is encoded, NOT encrypted**. base64 is not a lock. Anyone holding the token reads every claim in it. Never put a password, a card number, or a secret in a JWT.
- What the signature proves is **integrity and origin**: this token came from us and nobody edited it. It proves nothing about secrecy.
- Verification is pure math: recompute the signature with the key, compare, then check \`exp\`. **No database call.** That is the entire appeal — and the entire problem.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Issued by one server, readable by everyone, verifiable by one',
      code: `import jwt   # PyJWT
from datetime import datetime, timedelta, timezone

SECRET = "server-only-secret"

def issue(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "role": "editor",
        "iat": now,
        "exp": now + timedelta(minutes=15),
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")

token = issue("u_42")
print(token.count("."))
# 2   -> header . payload . signature

print(jwt.decode(token, options={"verify_signature": False}))
# {'sub': 'u_42', 'role': 'editor', 'iat': ..., 'exp': ...}

claims = jwt.decode(token, SECRET, algorithms=["HS256"])
# raises ExpiredSignatureError past exp, InvalidSignatureError if edited`,
      annotations: {
        12: 'exp is a UNIX timestamp, checked by the library on every decode. Short is safety: a leaked token dies on its own.',
        14: 'The signature is computed over the ENCODED header and payload. Change one byte of either and it no longer matches.',
        17: 'Three parts, two dots. Worth being able to say instantly.',
        20: 'THE gotcha: no secret needed to READ it. Decoding is just base64. Only verifying needs the key.',
        23: 'Always pin `algorithms=`. Leaving it open invites the classic alg=none / HS-vs-RS confusion attack, where an attacker downgrades the algorithm and signs a token you then accept.',
      },
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'The life of a JWT — and the session it replaced',
        notice: 'Frames 1-4 follow a JWT: issued, used, tampered with, expired. Frames 5-7 replay the same login as a SESSION — watch where the state lives, and what logout can actually do. Red dashed = rejected.',
        leftLabel: 'client',
        rightLabel: 'server',
        frames: [
          {
            note: 'Login. Password is checked against the bcrypt hash, then a token is signed with the secret and handed back. Nothing is stored server-side.',
            stack: [
              { name: 'password', value: 'hunter2' },
              { name: 'access_token', to: 'jwt1' },
            ],
            heap: [
              { id: 'db', value: 'bcrypt.verify OK', label: 'users' },
              { id: 'jwt1', value: 'hdr.payload.sig', label: 'signed' },
            ],
          },
          {
            note: 'Each request sends the token in the Authorization header. The server recomputes the signature with its key — a few microseconds of math, zero database calls.',
            stack: [
              { name: 'hdr', value: 'Bearer eyJ...' },
              { name: 'GET /me', to: 'chk1' },
            ],
            heap: [
              { id: 'chk1', value: 'HMAC match', label: 'valid' },
              { id: 'ok', value: '200 sub=u_42', label: 'served' },
            ],
          },
          {
            note: 'Attacker base64-decodes the payload, flips role to admin, re-encodes. Reading it was free — but the signature was computed over the OLD payload and no longer matches.',
            stack: [{ name: 'payload', value: 'role=admin', to: 'chk2', danger: true }],
            heap: [{ id: 'chk2', value: 'HMAC mismatch', label: '401' }],
          },
          {
            note: 'Fifteen minutes later exp has passed and the same token is dead. The long-lived refresh token is spent once to mint a fresh access token — and is itself rotated.',
            stack: [
              { name: 'access', value: 'exp passed', to: 'dead', danger: true },
              { name: 'refresh', to: 'fresh' },
            ],
            heap: [
              { id: 'dead', value: 'ExpiredSignature', label: '401' },
              { id: 'fresh', value: 'new access token', label: 'rotated' },
            ],
          },
          {
            note: 'CONTRAST — the session version of the same login. The server keeps the state and hands back only an opaque id. The cookie carries no claims at all; it is a coat-check ticket.',
            stack: [{ name: 'Cookie: sid', to: 'sess' }],
            heap: [{ id: 'sess', value: 'session store: {user: 42, role: admin}', label: 'server-side' }],
          },
          {
            note: 'Session request: the server looks the id up on EVERY request, so the data is always current — a role change takes effect instantly, unlike a JWT claim frozen at signing time.',
            stack: [
              { name: 'GET /notes + sid', to: 'sess' },
              { name: 'role', value: 'read fresh from store' },
            ],
            heap: [{ id: 'sess', value: 'session store: {user: 42, role: viewer}', label: 'just demoted' }],
          },
          {
            note: 'Logout, the difference that decides the whole tradeoff: DELETE the session row and the ticket is dead this millisecond. A JWT cannot be recalled — you wait for exp, or run a denylist and give up statelessness.',
            stack: [{ name: 'Cookie: sid', to: 'gone', danger: true }],
            heap: [{ id: 'gone', value: 'session deleted', freed: true, label: '401 next request' }],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Access + refresh: two tokens, two jobs',
      md: `One token cannot be both short-lived and convenient. So you use two.

- **Access token** — short (5–15 min), sent on every request, carries the claims. If stolen, it is worthless within minutes.
- **Refresh token** — long (days or weeks), sent *only* to the \`/refresh\` endpoint, and stored server-side so it *can* be revoked.
- When the access token expires the client silently posts the refresh token and gets a new access token. The user never sees a login screen.
- **Rotation:** every refresh issues a *new* refresh token and invalidates the old one. Each one is single-use.
- That gives you **reuse detection**: if an already-spent refresh token shows up, someone cloned it — kill the entire token family and force a re-login.
- The pattern's whole trick: keep the *frequently sent* credential short-lived, and the *revocable* one rare.`,
    },
    {
      type: 'intuition',
      title: 'Sessions vs JWT — the tradeoff you will be asked',
      md: `Same job, opposite storage. Six axes settle every argument.

- **Revocation:** session → delete the row, dead on the next request. JWT → valid until \`exp\`, because the server checks math, not a list.
- **Scaling:** session → every server needs the shared store (a Redis hop per request). JWT → stateless, any server verifies with the key alone.
- **Size:** a session cookie is ~32 bytes. A JWT is 300–800 bytes on *every single request*.
- **Logout:** session → real. JWT → cosmetic, you delete the client's copy and hope nobody kept one.
- **Fresh data:** session reads the user row each request, so a demotion applies immediately. JWT claims are a snapshot — stale until expiry.
- **Failure mode:** session store down → nobody can log in. Signing key leaked → the attacker mints admin tokens at will, and you cannot tell.`,
    },
    {
      type: 'note',
      md: 'The honest recommendation, and say it exactly like this: **sessions for classic web apps** (one domain, a browser, and you want real logout), **JWT for APIs and service-to-service** (many services, no shared store, mobile clients, third parties). If you need JWT *and* revocation, the workarounds are: keep \`exp\` very short (5–15 min) so the window is small, plus a **denylist** of revoked token ids in Redis checked on each request — at which point you have quietly reinvented a session store, so admit it and justify the size difference.',
    },
    {
      type: 'intuition',
      title: 'OAuth2: "Log in with Google", narrated',
      md: `The problem OAuth solves: let an app act on your behalf **without ever seeing your password**. Like a valet key — starts the car, will not open the boot.

- **Four parties:** you (*resource owner*), the app (*client*), Google (*authorization server*), the API holding your data (*resource server*).
- The app redirects your browser to Google with its \`client_id\`, a \`redirect_uri\`, the \`scope\` it wants, and a random \`state\`.
- You log in **on Google's own page** and approve the scope. The app never touches your credentials.
- Google redirects your browser back to \`redirect_uri\` carrying a short-lived, single-use **authorization code**.
- The app's **backend** then swaps that code plus its \`client_secret\` for an access token, over a direct server-to-server call.
- Why a code instead of the token? The code travels through the browser (URL, logs, history) and is useless without the secret. The token never touches the browser.
- The app calls the resource server with the access token. The \`state\` value is compared on return to kill CSRF on the callback.`,
    },
    {
      type: 'note',
      md: 'OAuth2 is about **authorization** ("this app may read my Drive"), not identity. **OpenID Connect (OIDC)** is the thin identity layer on top: request the `openid` scope and you additionally get an **id_token** — a JWT describing *who* logged in (`sub`, `email`, `name`) — plus a standard `/userinfo` endpoint. "Log in with Google" is OIDC; "let this app read my Drive" is plain OAuth2. One more name to drop: **PKCE**, which mobile apps and SPAs use because they cannot keep a `client_secret` — the client sends a hash of a random verifier up front and the real verifier at exchange time, so a stolen code alone is useless.',
    },
    {
      type: 'intuition',
      title: 'Where do you keep the token in a browser?',
      md: `Two choices, and each is vulnerable to the attack the other survives. There is no free option.

- **localStorage:** any JavaScript on your page can read it — so **one XSS bug leaks the token** to an attacker's server. Immune to CSRF, because the client must attach it deliberately.
- **Cookie (HttpOnly, Secure, SameSite):** JavaScript cannot read it, so XSS cannot exfiltrate it — but the browser sends it **automatically**, which is precisely what CSRF abuses.
- The senior answer: **HttpOnly cookie + SameSite=Lax** (plus a CSRF token on state-changing routes). You get a mitigated CSRF risk instead of an unmitigable XSS one.
- Never sessionStorage-vs-localStorage as the *security* argument — the difference there is lifetime, not safety.
- For a mobile app, none of this applies: use the OS keychain/keystore.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'FastAPI: protect a route in one line',
      code: `from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import jwt

app = FastAPI()
oauth2 = OAuth2PasswordBearer(tokenUrl="/token")

@app.post("/token")
def login(form: OAuth2PasswordRequestForm = Depends()):
    user = authenticate(form.username, form.password)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "bad credentials")
    return {"access_token": issue(user.id), "token_type": "bearer"}

def get_current_user(token: str = Depends(oauth2)):
    try:
        claims = jwt.decode(token, SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid token")
    return {"id": claims["sub"], "role": claims["role"]}

@app.get("/me")
def me(user=Depends(get_current_user)):
    return user

def require_role(role: str):
    def dep(user=Depends(get_current_user)):
        if user["role"] != role:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "not allowed")
        return user
    return dep

@app.delete("/posts/{post_id}")
def delete_post(post_id: int, user=Depends(require_role("admin"))):
    ...`,
      annotations: {
        6: 'OAuth2PasswordBearer does two things: pulls the token out of the "Authorization: Bearer ..." header, and tells the generated OpenAPI docs where to log in — that is what puts the Authorize button in /docs.',
        10: 'authenticate() does the bcrypt verify. Return the SAME generic error for unknown user and wrong password, or you have built a username-enumeration oracle.',
        13: 'token_type "bearer" is the OAuth2 password-flow response shape. "Bearer" literally means whoever holds it is trusted — which is why HTTPS is non-negotiable.',
        15: 'This one function is your auth layer. Every route that names it as a dependency is protected; every route that does not, is not.',
        18: 'Catch the PyJWT base class: expired, malformed and tampered tokens all collapse into one 401 — never tell the client which. A production version also sets the WWW-Authenticate: Bearer header on that response.',
        23: 'That Depends() IS the protection. No decorator, no middleware, no per-route boilerplate — and the resolved user arrives as a typed argument.',
        29: '403, not 401: we know who this is (authn passed), they just may not do this (authz failed).',
        34: 'RBAC, complete: roles live on the user, the dependency asserts one. Scale up by checking permissions ("post:delete") instead of role names once roles multiply.',
      },
    },
    {
      type: 'note',
      md: '**RBAC (role-based access control)** in one note: attach a role to each user (`viewer`, `editor`, `admin`), attach a required role or permission to each route, and check it in one shared dependency — never with `if` statements scattered across handlers. When roles start multiplying, switch from role names to **permissions** (`post:delete`) and map roles to permission sets; the route asks for the permission, not the title.',
    },
    {
      type: 'note',
      md: 'Three vulnerabilities every backend round touches. **SQL injection** — user input concatenated into a query becomes query *code* (`\' OR 1=1 --`); defense: **parameterized queries** (or an ORM), always, no exceptions for "internal" endpoints. **XSS** — attacker-supplied text is rendered as HTML/JS in someone else\'s browser; defense: escape on output, a Content-Security-Policy, and HttpOnly cookies so a payload cannot steal the session. **CSRF** — a malicious site makes *your* browser fire an authenticated request using cookies it sends automatically; defense: `SameSite` cookies plus a CSRF token on every state-changing request. Note the pattern: injection bugs are all "data got treated as code" — the fix is always to keep the two in separate channels.',
    },
  ],
  quiz: [
    {
      question: 'A logged-in user with role "viewer" calls DELETE /posts/7. What status code should the API return?',
      options: [
        { text: '401 Unauthorized', explanation: '401 means "I do not know who you are". Here the token was valid — identity is established.' },
        { text: '403 Forbidden', explanation: 'Correct. Authentication passed, authorization failed: we know who they are and they may not do this.' },
        { text: '404 Not Found', explanation: 'Sometimes used deliberately to hide a resource\'s existence, but the honest answer to the authn/authz question is 403.' },
        { text: '400 Bad Request', explanation: 'The request is perfectly well-formed. Nothing is wrong with its syntax.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is SHA-256 the wrong algorithm for storing passwords?',
      options: [
        { text: 'It is too fast — a GPU computes billions of guesses per second', explanation: 'Correct. Password hashing must be deliberately slow and tunable: bcrypt or argon2 with a cost factor.' },
        { text: 'It is reversible', explanation: 'It is not reversible — that is not the problem. The problem is how cheaply it can be guessed.' },
        { text: 'It produces collisions', explanation: 'SHA-256 has no practical collisions, and collisions are not how password dumps get cracked anyway.' },
        { text: 'It cannot be salted', explanation: 'You can salt it. Salting fixes rainbow tables; it does nothing about raw brute-force speed.' },
      ],
      correct: 0,
    },
    {
      question: 'What does a per-user salt actually prevent?',
      options: [
        { text: 'Brute-forcing one specific password', explanation: 'It barely slows a targeted attack — that is what the cost factor is for.' },
        { text: 'The database from leaking', explanation: 'Salting assumes the dump already leaked. It limits what the leak is worth.' },
        {
          text: 'Identical passwords producing identical hashes, and precomputed rainbow-table lookups',
          explanation: 'Correct. The salt makes every hash unique, so an attacker must attack each row separately instead of the whole dump at once.',
        },
        { text: 'Timing attacks on comparison', explanation: 'That is constant-time comparison (hmac.compare_digest), a different defense.' },
      ],
      correct: 2,
    },
    {
      question: 'An attacker intercepts a JWT. Without knowing the signing secret, what can they do?',
      options: [
        { text: 'Nothing — the payload is encrypted', explanation: 'The classic mistake. JWTs are SIGNED, not encrypted; base64 is encoding, not a lock.' },
        {
          text: 'Read every claim in the payload, but not forge a valid modified token',
          explanation: 'Correct. Decoding needs no key; only verification (and forging) needs the secret. Never put secrets in a JWT payload.',
        },
        { text: 'Change the role claim and keep it valid', explanation: 'Editing the payload breaks the signature — that is precisely what signing prevents.' },
        { text: 'Only read the header', explanation: 'All three parts are base64url-encoded and readable; the signature is just meaningless without the key.' },
      ],
      correct: 1,
    },
    {
      question: 'What does the HttpOnly cookie flag block?',
      options: [
        { text: 'CSRF attacks', explanation: 'CSRF is blocked by SameSite plus CSRF tokens. HttpOnly does not help there at all.' },
        { text: 'Sending the cookie over plain HTTP', explanation: 'That is the Secure flag.' },
        { text: 'The cookie being sent to other domains', explanation: 'That is Domain/Path scoping and SameSite.' },
        { text: 'JavaScript on the page from reading the cookie', explanation: 'Correct — an XSS payload cannot exfiltrate the session id, though it may still ride along on requests from that page.' },
      ],
      correct: 3,
    },
    {
      question: 'Your product requires that banning a user takes effect within one second. Which scheme fits with the least extra machinery?',
      options: [
        { text: 'Stateless JWTs with a 24-hour expiry', explanation: 'The worst fit — the ban is invisible for up to 24 hours, since the server checks a signature, not a list.' },
        { text: 'Server-side sessions', explanation: 'Correct. Delete the session row and the very next request is anonymous. Revocation is a single DELETE.' },
        { text: 'JWTs plus a Redis denylist checked per request', explanation: 'It works, but you added a store hit per request — you have rebuilt sessions with bigger cookies. Say so if you propose it.' },
        { text: 'Longer refresh tokens', explanation: 'Longer lifetimes make revocation slower, not faster.' },
      ],
      correct: 1,
    },
    {
      question: 'Why use a short access token plus a long refresh token instead of one long-lived token?',
      options: [
        { text: 'It makes tokens smaller', explanation: 'Size is unchanged — a refresh flow adds a token rather than shrinking one.' },
        { text: 'Refresh tokens cannot be stolen', explanation: 'They absolutely can — which is why they are single-use, rotated, and reuse-detected.' },
        {
          text: 'The credential sent on every request expires fast, while the revocable one is used rarely',
          explanation: 'Correct. A stolen access token dies in minutes; the refresh token is stored server-side, so it can be revoked and rotated.',
        },
        { text: 'It removes the need for HTTPS', explanation: 'Nothing removes the need for HTTPS. Bearer tokens are usable by whoever holds them.' },
      ],
      correct: 2,
    },
    {
      question: 'In the OAuth2 authorization code flow, why does the redirect return a CODE instead of the access token itself?',
      options: [
        { text: 'The code is smaller', explanation: 'True but irrelevant — this is a security decision, not a bandwidth one.' },
        {
          text: 'The code travels through the browser and is useless without the client_secret exchanged server-to-server',
          explanation: 'Correct. URLs land in history, logs and referrers; the token never goes there, and the single-use code alone buys an attacker nothing.',
        },
        { text: 'Google cannot issue tokens directly', explanation: 'It can — the implicit flow did exactly that, and was deprecated for this very reason.' },
        { text: 'To let the user approve twice', explanation: 'Consent happens once, on the authorization server\'s page.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Case: you are designing auth for a new product — a React web app, an iOS app, and three internal microservices behind one gateway. Sessions or JWT? Defend it.',
      answer:
        'Split by client, and say why out loud. Browser app: **session cookie** (HttpOnly, Secure, SameSite=Lax) — one domain, real logout, instant revocation, tiny cookie, and no token-storage-in-JS problem. Mobile app: **access + refresh tokens**, access short (15 min) in memory, refresh in the OS keychain — no cookie jar to rely on, and rotation with reuse detection covers theft. Service-to-service behind the gateway: **short-lived signed JWTs** (or mTLS) — stateless verification means no shared session store on the internal hot path. Then name the cost you accepted: the internal JWTs cannot be revoked mid-life, which is fine because they live 5 minutes and the gateway is the only issuer. The failing answer is "JWT because it scales" with no mention of revocation.',
      isCaseBased: true,
    },
    {
      question: 'Walk through password storage end to end, as if reviewing a PR.',
      answer:
        'Register: take the plaintext over HTTPS, never log it, hash with **bcrypt or argon2** at a cost tuned to ~200–300 ms on prod hardware; a random per-user salt is generated automatically and stored inside the hash string. Store only that string. Login: look up the user, run `verify(input, stored)` which re-derives with the stored salt and cost and compares in constant time. Return an identical generic error for unknown-user and wrong-password so the endpoint is not a username oracle. Rate-limit login attempts per account and per IP. On successful login, if the stored cost is below current policy, transparently re-hash and update. Red flags in review: MD5/SHA anywhere near a password, a hand-rolled salt column, `==` on digests, plaintext in logs or error messages.',
      isCaseBased: false,
    },
    {
      question: 'What exactly does a JWT signature prove — and what does it NOT?',
      answer:
        'It proves **integrity and origin**: the header and payload have not been altered since a holder of the signing key produced them. It does **not** provide secrecy — the payload is base64url, readable by anyone holding the token, so no secrets go inside. It also does not prove the *bearer* is the legitimate user: a stolen token works perfectly, which is what "bearer token" means and why HTTPS plus short expiry are mandatory. And it says nothing about current state — the claims are a snapshot from issue time, so a revoked or demoted user keeps their old role until expiry.',
      isCaseBased: false,
    },
    {
      question: 'Case: support reports that a user you banned ten minutes ago is still posting. Your API uses JWTs with a 24-hour expiry. Diagnose and fix, short-term and long-term.',
      answer:
        'Diagnosis: nothing is broken. Verification is pure signature math with no lookup, so the ban flag in the database is never consulted — the token stays valid until `exp`, up to 24 hours away. Short-term (today): a Redis **denylist** of revoked `jti` (token ids) or a per-user `tokens_valid_after` timestamp, checked in the auth dependency; entries expire when the token would have anyway, so the set stays small. Long-term: cut access-token lifetime to 5–15 minutes and move the durable credential to a **refresh token** that is stored server-side, single-use and rotated — then a ban only needs to kill the refresh row and the window shrinks to one access-token lifetime. Be honest in the interview that the denylist reintroduces a per-request store hit — you are buying revocation back at the price you originally avoided.',
      isCaseBased: true,
    },
    {
      question: 'Narrate the OAuth2 authorization code flow, and say what OpenID Connect adds.',
      answer:
        'Four parties: resource owner (the user), client (your app), authorization server (Google), resource server (the API with the data). (1) Your app redirects the browser to Google with client_id, redirect_uri, scope and a random `state`. (2) The user authenticates **on Google** and consents to the scope — your app never sees the password. (3) Google redirects back to redirect_uri with a single-use **authorization code**. (4) Your backend POSTs that code plus its `client_secret` directly to Google and receives an access token (and often a refresh token). (5) Your app calls the resource server with the access token. `state` is compared on return to prevent CSRF on the callback; the code is used because it passes through the browser and is worthless without the secret. **OIDC** layers identity on top: request the `openid` scope and you also get an **id_token**, a JWT with `sub`/`email`/`name`, plus a standard userinfo endpoint. OAuth2 alone answers "may this app do X"; OIDC answers "who is this".',
      isCaseBased: false,
    },
    {
      question: 'Cookie or localStorage for the token in a browser? Argue both sides and then choose.',
      answer:
        'localStorage: readable by any JavaScript on the page, so a single XSS bug exfiltrates the token to the attacker\'s server — full account takeover, and it is not sent automatically so CSRF does not apply. Cookie with HttpOnly + Secure + SameSite: JS cannot read it, so XSS cannot steal it, but the browser attaches it to every request to your domain, which is exactly the mechanism CSRF abuses. Choose the **cookie**, because the residual risk is mitigable: SameSite=Lax plus a CSRF token on state-changing routes closes CSRF, while there is no comparable mitigation for "the token is readable by any injected script". A third option worth naming: keep the access token in a JS variable in memory only, with the refresh token in an HttpOnly cookie — no persistent JS-readable credential at all.',
      isCaseBased: false,
    },
    {
      question: 'What is the cost factor in bcrypt and how do you pick a number?',
      answer:
        'It is a work parameter — cost 12 means 2¹² internal iterations — so each +1 doubles the time to hash and therefore doubles an attacker\'s cost per guess. Pick it by measuring on production hardware and targeting ~200–300 ms per verify: slow enough that offline cracking is expensive, fast enough that logins feel instant and a login burst does not saturate CPU. Because the cost is stored inside the hash string, old hashes keep verifying after you raise the policy, and you upgrade them transparently on the user\'s next successful login. The knob exists because hardware keeps getting faster — an algorithm without one ages badly.',
      isCaseBased: false,
    },
    {
      question: 'Case: p99 on POST /login jumped from 120 ms to 1.4 s after a security review. Nothing else changed. Debug it.',
      answer:
        'First hypothesis, from the timing shape alone: the review raised the bcrypt cost factor, and each +1 doubles hashing time — 12 → 15 is roughly 8×, which matches. Confirm by timing `pwd.hash` in isolation and reading the cost prefix in stored hashes. Then decide, do not just revert: bcrypt is CPU-bound, so a login burst also pins cores and inflates the queue — that is why p99 moved more than p50. Options with tradeoffs: settle at the cost that measures ~250 ms on this hardware; make sure the hash runs in a thread pool so it does not block the async event loop (a very common FastAPI mistake); scale login capacity separately since it is the only CPU-heavy endpoint; and add per-account rate limiting so brute force is throttled before it reaches the hash at all. Cutting the cost factor without any of that trades security for latency silently.',
      isCaseBased: true,
    },
    {
      question: 'Explain CSRF, and how it differs from XSS.',
      answer:
        'CSRF: a malicious site causes *your already-authenticated browser* to send a request to your bank — the browser attaches the session cookie automatically, so the request is genuine and the attacker never reads the response. It exploits ambient authority. Defenses: `SameSite=Lax/Strict` cookies so the browser withholds them cross-site, plus an unguessable CSRF token on every state-changing request, and never using GET for mutations. XSS: the attacker gets *their JavaScript* running on your origin — they can read the DOM, call your API as the user, and steal anything JS-readable. Defenses: escape all untrusted output, a Content-Security-Policy, and HttpOnly cookies to limit the loot. One-liner: CSRF abuses the user\'s credentials without seeing them; XSS runs code inside your origin and sees everything.',
      isCaseBased: false,
    },
    {
      question: 'Why compare secrets with hmac.compare_digest instead of ==?',
      answer:
        '`==` on bytes short-circuits at the first differing byte, so comparison time leaks how many leading bytes were correct. An attacker who can send many requests and measure timing recovers an API key or session id byte by byte — slow but entirely practical over a LAN or with enough samples. `compare_digest` always examines the full length, so the time carries no information. It matters for anything an attacker supplies and you compare against a secret: API keys, session ids, webhook HMAC signatures, password-reset tokens. (Password libraries already do this inside `verify`.)',
      isCaseBased: false,
    },
    {
      question: 'How does refresh token rotation with reuse detection work, and what attack does it catch?',
      answer:
        'Each refresh is single-use: presenting refresh token R returns a new access token plus a new refresh token R′, and R is immediately invalidated but remembered as part of a token *family*. If R is ever presented again, exactly one of two things happened — the legitimate client retried, or someone cloned it — and you cannot distinguish them, so you assume theft: invalidate the whole family and force a re-login. That catches the otherwise-invisible case where an attacker copies a refresh token and uses it in parallel with the real user; without rotation both parties refresh happily forever. Cost to acknowledge: refresh tokens must be stored server-side (they are stateful by design), and flaky networks can trigger false positives, so keep a short grace window on the immediately-previous token.',
      isCaseBased: false,
    },
    {
      question: 'Case: a security scan flags "SQL injection possible in /search". The handler builds its query with an f-string. Explain the bug, the fix, and what else you would check in that codebase.',
      answer:
        'Bug: user input is concatenated into the query text, so input becomes query *code* — `\' OR 1=1 --` turns a filter into "return everything", and a stacked statement can drop a table or dump the users table. Fix: **parameterized queries** — pass values as bind parameters (`WHERE name = :q`) so the driver ships data and SQL over separate channels and no escaping is ever needed; an ORM does this by default. Never "fix" it by escaping quotes by hand. Then sweep the codebase, because one f-string query is rarely alone: grep for string formatting near `execute(`, check dynamic ORDER BY / table names (those cannot be bound — use an allowlist), confirm the app\'s DB user has least privilege (no DROP, no access to other schemas), and check whether errors leak SQL text to clients. Same root cause elsewhere: any place data gets interpreted as code — shell commands, HTML output (XSS), template rendering.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Authentication vs authorization', back: 'Authn = who are you (401). Authz = what may you do (403). Passing the first says nothing about the second.' },
    { front: 'Why not MD5/SHA for passwords?', back: 'They are FAST — billions of guesses/sec on a GPU. Passwords need deliberately slow, tunable hashing: bcrypt or argon2 with a cost factor.' },
    { front: 'What does a salt prevent?', back: 'Identical passwords hashing identically, and rainbow-table lookups. It is per-user, random, not secret — bcrypt stores it inside the hash.' },
    { front: 'JWT anatomy', back: 'header.payload.signature — three base64url chunks, two dots. Signature = HMAC/RSA over header.payload with the server key.' },
    { front: 'The JWT gotcha', back: 'The payload is ENCODED, not encrypted. Anyone reads it without the key; signing proves integrity and origin only. Never put secrets in it.' },
    { front: 'Cookie flags and what each blocks', back: 'HttpOnly → JS cannot read it (XSS theft). Secure → HTTPS only. SameSite → cross-site sends (CSRF). Max-Age → bounds a stolen cookie.' },
    { front: 'Sessions vs JWT — the one-liner', back: 'Sessions: stateful, instant revocation, needs a shared store. JWT: stateless, no store, but valid until exp. Web app → sessions; APIs/service-to-service → JWT.' },
    { front: 'Access + refresh pattern', back: 'Access 5–15 min, sent everywhere. Refresh days/weeks, only to /refresh, stored server-side, single-use and rotated — reuse means theft, kill the family.' },
    { front: 'OAuth2 authorization code flow', back: 'User → auth server login/consent → single-use CODE back via redirect → backend swaps code + client_secret for tokens. The token never touches the browser. state kills callback CSRF.' },
    { front: 'What OIDC adds to OAuth2', back: 'Identity: the `openid` scope returns an id_token (a JWT with sub/email/name) plus a userinfo endpoint. OAuth2 = permission, OIDC = who.' },
  ],
  mindmapMarkdown: `- Auth: Sessions vs JWT, Hashing & OAuth
  - Authn vs authz
    - 401 = who are you · 403 = you may not
    - RBAC: role/permission checked per route
  - Password storage
    - Never plaintext; MD5/SHA are too fast
    - Salt per user kills rainbow tables
    - bcrypt/argon2 + cost factor (~250 ms)
    - compare_digest = constant time
  - Sessions
    - Server-side store + opaque cookie
    - Stateful: revocation is a DELETE
    - HttpOnly · Secure · SameSite · Max-Age
  - JWT
    - header.payload.signature
    - Signed, NOT encrypted — base64 is readable
    - Verify = math, no DB call; pin the alg
    - Short exp + refresh token, rotated
  - Sessions vs JWT
    - Revocation: instant vs valid until exp
    - Scaling: shared store vs stateless
    - Size, logout, stale claims
    - Web app → sessions · API → JWT
    - JWT revocation: short exp + denylist
  - OAuth2 & OIDC
    - Four parties, authorization code flow
    - Code via browser, token server-to-server
    - state (CSRF) · PKCE for mobile/SPA
    - OIDC adds id_token + userinfo
  - Token in the browser
    - localStorage → one XSS steals it
    - HttpOnly cookie → CSRF, but mitigable
  - FastAPI
    - OAuth2PasswordBearer → get_current_user
    - Depends() on a route = protected
  - Vulnerabilities
    - SQLi → parameterized queries
    - XSS → escape output + CSP
    - CSRF → SameSite + CSRF token`,
}

export default m
