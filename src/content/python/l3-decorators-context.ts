import type { Module } from '../types'

const m: Module = {
  id: 'py-l3-decorators-context',
  subjectId: 'python',
  level: 3,
  title: 'Decorators, Closures & Context Managers',
  whyItMatters:
    '"Write a timing decorator" and "implement an LRU cache" are two of the most repeated Python interview questions in existence. Both are 10 lines — if you know closures. This module builds that mechanism once, then spends it three ways: decorators, caches, and context managers.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'Closures: a function with a backpack',
      md: `A function defined inside another function can use the outer function's variables. The surprise: it **keeps** them after the outer function returns.

- Think of the inner function leaving home with a **backpack** — it packs every outer variable it touches.
- The outer function's stack frame dies. The backpack survives.
- Call the same factory twice → two separate backpacks. No sharing.
- This inner-function-plus-captured-variables package is a **closure**.
- Why care: a decorator is nothing but a closure that packed one specific thing — *the function it wraps*.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'A closure you can poke',
      code: `def make_counter():
    count = 0                # outer variable
    def bump():
        nonlocal count       # I want to REBIND the captured one
        count += 1
        return count
    return bump              # bump leaves home, backpack packed

c1 = make_counter()
c2 = make_counter()
print(c1(), c1(), c2())      # 1 2 1`,
      annotations: {
        4: 'Reading a captured variable is free. Rebinding it needs nonlocal — without it, count += 1 raises UnboundLocalError (Python assumes a new local).',
        7: 'Returning the inner function is the whole trick. make_counter is done, but bump still owns count.',
        11: 'c1 and c2 each got their own count cell. Two calls to the factory = two independent backpacks.',
      },
    },
    {
      type: 'note',
      md: 'Definition, one line: a **closure** is an inner function bundled with the outer variables it captured. You can inspect the backpack: `c1.__closure__[0].cell_contents` shows the current count. This capture mechanism is exactly how a decorator remembers which function it wrapped.',
    },
    {
      type: 'intuition',
      title: 'Decorator anatomy: func in, wrapper out',
      md: `A decorator is a function that takes a function and returns a **replacement** function. Gift wrapping: same gift inside, new behavior at the boundary.

- Inside the decorator you build \`wrapper\` — a closure that captured \`fn\`.
- \`wrapper\` does its extra thing (time it, cache it, guard it), then calls \`fn\`.
- The \`@decorator\` line is pure sugar: \`@timed\` above \`def slow\` means exactly \`slow = timed(slow)\`.
- It runs **at import time**, once — not on every call. The wrapper runs on every call.
- After decoration, the name \`slow\` points at \`wrapper\`. The original only lives in the backpack.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Build 1: the timing decorator',
      code: `import time, functools

def timed(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        t0 = time.perf_counter()
        result = fn(*args, **kwargs)
        ms = (time.perf_counter() - t0) * 1000
        print(f'{fn.__name__}: {ms:.2f} ms')
        return result
    return wrapper

@timed
def slow(n):
    return sum(i * i for i in range(n))

slow(1_000_000)`,
      annotations: {
        4: 'wraps copies fn\'s __name__, __doc__, __module__ onto wrapper — the wrapper impersonates the original.',
        5: '*args, **kwargs = accept ANY signature and pass it through untouched. Hardcoding parameters here is the #1 rookie bug.',
        11: 'Return the wrapper, not wrapper() — you are handing back a function, not calling it.',
        13: 'Sugar for: slow = timed(slow). Runs once, at import.',
      },
    },
    {
      type: 'note',
      md: 'Why `functools.wraps` matters: without it, `slow.__name__` is `\'wrapper\'`, the docstring is gone, and `help()` lies. Real damage: debuggers and logs show `wrapper` for every decorated function, `pickle` fails, and frameworks that key off `__name__` (Flask builds route endpoints from it) collide. One decorator line prevents all of it — never skip it.',
    },
    {
      type: 'intuition',
      title: 'Build 2: the memo decorator — pay once, answer forever',
      md: `Some functions get asked the same question repeatedly. Caching (memoization): keep a dict from arguments to answers.

- Wrapper logic: seen these args? Return the stored answer. New? Compute once, store, return.
- The cache dict lives in the closure backpack — private, one per decorated function.
- Naive recursive \`fib(20)\` makes 21,891 calls; the same tree re-solves \`fib(10)\` hundreds of times.
- With a memo it makes 21 — each value computed exactly once.
- Run it below and watch the call counts.`,
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `import functools

calls = {'plain': 0, 'memo': 0}

def memo(fn):
    cache = {}
    @functools.wraps(fn)
    def wrapper(n):
        if n not in cache:
            cache[n] = fn(n)
        return cache[n]
    return wrapper

def fib_plain(n):
    calls['plain'] += 1
    return n if n < 2 else fib_plain(n - 1) + fib_plain(n - 2)

@memo
def fib_memo(n):
    calls['memo'] += 1
    return n if n < 2 else fib_memo(n - 1) + fib_memo(n - 2)

print('plain fib(20) =', fib_plain(20), '| function calls:', calls['plain'])
print('memo  fib(20) =', fib_memo(20), '| function calls:', calls['memo'])
print('wrapper still looks like:', fib_memo.__name__)`,
        precomputedOutput: `plain fib(20) = 6765 | function calls: 21891
memo  fib(20) = 6765 | function calls: 21
wrapper still looks like: fib_memo`,
        caption: 'The memo decorator: 21,891 calls collapse to 21. Try fib(30) on both — plain gets slow, memo stays instant.',
      },
    },
    {
      type: 'note',
      md: `You never ship a hand-rolled memo — the stdlib has it: \`@functools.lru_cache(maxsize=128)\` (or \`@functools.cache\` for unbounded). Extras you get free: eviction when full, \`f.cache_info()\` hit/miss stats, \`f.cache_clear()\`, thread-safe bookkeeping. Two constraints to say in interviews: arguments must be **hashable** (a list argument raises TypeError), and it caches on *exact* argument form — \`f(1, 2)\` and \`f(a=1, b=2)\` are separate entries.`,
    },
    {
      type: 'intuition',
      title: 'Decorators with arguments: three layers',
      md: `Build 3, the auth-check idea: a bouncer that checks the caller's role before letting the function run. But \`@require_role('admin')\` has parentheses — that changes the anatomy.

- \`@timed\` hands the function to \`timed\`. Two layers: decorator → wrapper.
- \`@require_role('admin')\` **calls** \`require_role('admin')\` first. Whatever it returns is used as the decorator.
- So you need three layers: a **factory** that takes the argument and returns a decorator, which returns a wrapper.
- Innermost wrapper sees both backpacks: \`role\` from the factory, \`fn\` from the decorator.
- Rule of thumb: parentheses after the @ name → one extra layer of nesting.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Build 3: the auth-check decorator (three layers)',
      code: `import functools

def require_role(role):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(user, *args, **kwargs):
            if role not in user['roles']:
                raise PermissionError(f'{role} required')
            return fn(user, *args, **kwargs)
        return wrapper
    return decorator

@require_role('admin')
def delete_account(user, account_id):
    return f'account {account_id} deleted'`,
      annotations: {
        3: 'Layer 1, the factory: takes the ARGUMENT, returns a decorator. It never sees the function.',
        7: 'The check runs before fn ever executes — the bouncer pattern. role reached here through two closure backpacks.',
        13: 'Two steps at import: require_role(\'admin\') runs and returns decorator; then decorator(delete_account) wraps it.',
      },
    },
    {
      type: 'intuition',
      title: 'The interview classic: implement an LRU cache class',
      md: `\`lru_cache\` evicts the **L**east **R**ecently **U**sed entry when full. "Implement that as a class, get and put in O(1)" is a FAANG staple. Analogy: a tiny desk, a huge library — desk full means the book untouched longest goes back.

- A dict gives O(1) lookup but doesn't track *usage order*.
- A list tracks order, but moving an item to the front is O(n). Fail.
- The trick: **dict + doubly linked list**. Dict maps key → list node; the list holds usage order.
- Unlinking a node and re-linking it at the front is pointer surgery: O(1). Evict = drop the tail node.
- Python shortcut: \`collections.OrderedDict\` *is* this structure, prebuilt.`,
    },
    { type: 'visual', component: 'CacheSimulator', props: {} },
    {
      type: 'code',
      lang: 'python',
      title: 'LRU cache via OrderedDict — the honest shortcut',
      code: `from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.cap = capacity
        self.d = OrderedDict()

    def get(self, key):
        if key not in self.d:
            return -1
        self.d.move_to_end(key)
        return self.d[key]

    def put(self, key, value):
        if key in self.d:
            self.d.move_to_end(key)
        self.d[key] = value
        if len(self.d) > self.cap:
            self.d.popitem(last=False)`,
      annotations: {
        6: 'OrderedDict = hash map + doubly linked list of entries in insertion order. Exactly the structure the interview wants.',
        11: 'Touched → most recent: move_to_end is the O(1) pointer surgery, hidden behind a method.',
        19: 'popitem(last=False) removes the OLDEST entry — the eviction. last=True would be a stack, not an LRU.',
      },
    },
    {
      type: 'note',
      md: 'In the interview, say this sentence: *"I\'d use a dict mapping key to node plus a doubly linked list for recency; OrderedDict is that exact structure, so I\'ll use it and can hand-roll the list if you want."* If they do want it: keep dummy head/tail sentinel nodes so add/remove never special-cases empty ends. That one trick removes most of the edge-case bugs.',
    },
    {
      type: 'intuition',
      title: 'Context managers: cleanup that cannot be skipped',
      md: `A hotel key card: whatever happens during your stay — even a fire alarm — checkout still happens. That's \`with\`.

- \`with open('data.csv') as f:\` guarantees the file closes — return early, raise, crash, doesn't matter.
- Any object with two methods can do this: \`__enter__\` (setup) and \`__exit__\` (teardown).
- \`__enter__\`'s return value is what \`as\` binds.
- \`__exit__\` **always** runs, and gets told *how* the block ended.
- Same pattern covers locks, DB transactions, temp directories, mocked time in tests.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The protocol: __enter__ / __exit__',
      code: `import time

class Timer:
    def __enter__(self):
        self.t0 = time.perf_counter()
        return self
    def __exit__(self, exc_type, exc, tb):
        self.ms = (time.perf_counter() - self.t0) * 1000
        return False

with Timer() as t:
    data = [i ** 2 for i in range(100_000)]
print(f'{t.ms:.1f} ms')`,
      annotations: {
        6: 'Whatever __enter__ returns is bound by "as". Returning self is the common move.',
        7: 'The three args describe the exception that ended the block — all None if it ended cleanly. This is where you inspect failure.',
        9: 'Return False (or None) → the exception re-raises after cleanup. Return True → it is SWALLOWED. Accidental True here silently eats errors — classic bug.',
      },
    },
    {
      type: 'intuition',
      title: 'The generator shortcut: @contextmanager',
      md: `Writing a class for two methods is ceremony. \`contextlib.contextmanager\` turns one generator into a context manager.

- Everything **before** \`yield\` = \`__enter__\`. Everything **after** = \`__exit__\`.
- The \`yield\` is where the \`with\` body runs. Yield a value → that's what \`as\` binds.
- If the body raises, the exception is thrown **into the generator at the yield line**.
- So cleanup after \`yield\` must sit in a \`try/finally\` — otherwise an exception skips it and you're back to leaking.
- One function, no class, same guarantee.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Same timer, generator form',
      code: `import time
from contextlib import contextmanager

@contextmanager
def timer(label):
    t0 = time.perf_counter()
    try:
        yield
    finally:
        ms = (time.perf_counter() - t0) * 1000
        print(f'{label}: {ms:.1f} ms')

with timer('squares'):
    data = [i ** 2 for i in range(100_000)]`,
      annotations: {
        4: 'A decorator from the stdlib that manufactures __enter__/__exit__ around your generator. Decorators building context managers — the module comes full circle.',
        8: 'The with-body executes while the generator is paused here. A body exception is raised at THIS line inside the generator.',
        9: 'finally is the guarantee. Without try/finally, an exception in the body would skip the cleanup lines entirely.',
      },
    },
    {
      type: 'note',
      md: 'The module in three sentences. A **closure** is a function that kept its birth variables. A **decorator** is a closure that kept a function, so it can wrap every call — three layers deep if the decorator itself takes arguments. A **context manager** guarantees paired setup/teardown around a block, via `__enter__`/`__exit__` or a `@contextmanager` generator.',
    },
  ],
  quiz: [
    {
      question: 'What is `@timed` above `def slow(...)` exactly equivalent to?',
      options: [
        {
          text: 'slow = timed(slow), executed once at import time',
          explanation: 'Correct. The @ line is pure sugar for reassigning the name to whatever the decorator returns — and it runs when the module loads, not on each call.',
        },
        { text: 'timed(slow()) on every call', explanation: 'Backwards — the decorator receives the function object, never its result, and runs once, not per call.' },
        { text: 'A hint to the interpreter to optimize slow', explanation: 'Nothing magic happens — it is ordinary function application with a nicer syntax.' },
      ],
      correct: 0,
    },
    {
      question: 'Inside a closure you write `count += 1` on a captured variable, without any declaration. What happens?',
      options: [
        { text: 'It increments the outer variable', explanation: 'Only with `nonlocal count`. Assignment makes Python treat count as a NEW local.' },
        {
          text: 'UnboundLocalError — assignment makes count local, and it is read before being set',
          explanation: 'Correct. Rebinding needs `nonlocal` (or `global` for module scope). Reading captured variables needs nothing; rebinding is the trap.',
        },
        { text: 'A fresh count starting at 0 each call', explanation: 'Python never auto-initializes variables — it errors instead.' },
      ],
      correct: 1,
    },
    {
      question: 'You skip `functools.wraps` in a decorator. What is the observable damage?',
      options: [
        { text: 'The wrapper runs slower', explanation: 'wraps has zero effect on call speed — it only copies metadata at decoration time.' },
        { text: 'The decorator stops working on functions with keyword arguments', explanation: 'Argument handling is *args/**kwargs\'s job, not wraps\'s.' },
        {
          text: '__name__ and __doc__ become the wrapper\'s — breaking help(), logs, and frameworks that key off the name',
          explanation: 'Correct. Every decorated function reports itself as \'wrapper\'; Flask route endpoints collide, docs vanish, tracebacks mislead.',
        },
      ],
      correct: 2,
    },
    {
      question: 'In `@require_role(\'admin\')`, what does the call `require_role(\'admin\')` return?',
      options: [
        { text: 'The wrapped function directly', explanation: 'One layer too deep — the wrapper only exists after the decorator gets the function.' },
        {
          text: 'A decorator — a function still waiting to receive the function below it',
          explanation: 'Correct. Parentheses mean the factory runs first; its return value is applied as the decorator. Three layers: factory → decorator → wrapper.',
        },
        { text: 'True or False depending on the user', explanation: 'No user exists at decoration time — the role check runs inside the wrapper, per call.' },
      ],
      correct: 1,
    },
    {
      question: 'Why does `@functools.lru_cache` raise TypeError when you pass a list argument?',
      options: [
        {
          text: 'Cache keys are built by hashing the arguments, and lists are unhashable',
          explanation: 'Correct. The cache is a dict keyed on args — mutable types cannot be keys. Pass a tuple instead.',
        },
        { text: 'lru_cache only accepts a single integer argument', explanation: 'Any number of arguments works — they just must all be hashable.' },
        { text: 'Lists are too large to cache', explanation: 'Size is irrelevant; hashability is the requirement.' },
      ],
      correct: 0,
    },
    {
      question: 'For an LRU cache with O(1) get AND put, the accepted structure is…',
      options: [
        { text: 'A dict plus a Python list of keys in usage order', explanation: 'list.remove(key) is O(n) — moving a touched key to the front breaks the O(1) requirement.' },
        {
          text: 'A dict mapping key → node, plus a doubly linked list for recency order',
          explanation: 'Correct. Dict finds the node in O(1); unlink/relink at the head and drop the tail are O(1) pointer operations. OrderedDict packages exactly this.',
        },
        { text: 'A max-heap keyed on last-access time', explanation: 'Heap operations are O(log n), and updating an arbitrary entry\'s key is worse. Overkill and too slow.' },
      ],
      correct: 1,
    },
    {
      question: 'A `with` block raises ValueError. `__exit__` runs and returns True. What does the caller see?',
      options: [
        { text: 'The ValueError propagates after cleanup', explanation: 'That is the return-False (or None) behavior — the default and usually what you want.' },
        {
          text: 'Nothing — returning True suppresses the exception',
          explanation: 'Correct. True means \'handled, swallow it\'. Deliberate in contextlib.suppress; a silent bug when returned accidentally.',
        },
        { text: 'RuntimeError: __exit__ may not return values', explanation: 'The return value is the protocol — it is precisely how suppression is requested.' },
      ],
      correct: 1,
    },
    {
      question: 'In a @contextmanager generator, why must cleanup go in try/finally around the yield?',
      options: [
        {
          text: 'A with-body exception is thrown into the generator at the yield — without finally, code after yield never runs',
          explanation: 'Correct. yield is where the body executes; an exception there skips straight past unprotected cleanup lines, leaking the resource.',
        },
        { text: 'Generators cannot contain bare yield statements', explanation: 'They can — bare yield just binds None to the as-name.' },
        { text: 'It is only a style convention', explanation: 'It is load-bearing: skip it and cleanup is skipped on any body exception.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Whiteboard: write a decorator that times any function. Narrate the pieces as you go.',
      answer:
        'Pieces to narrate: (1) `def timed(fn):` — func in; (2) inner `wrapper(*args, **kwargs)` so ANY signature passes through; (3) `time.perf_counter()` around `result = fn(*args, **kwargs)` — and you must capture and **return** result, dropping it is the classic bug; (4) `@functools.wraps(fn)` so the wrapped function keeps its identity; (5) `return wrapper` — the replacement function. Close with: `@timed` is sugar for `slow = timed(slow)`, evaluated once at import. Mentioning wraps and *args/**kwargs unprompted is exactly what separates candidates.',
      isCaseBased: false,
    },
    {
      question: 'What is a closure, and why do decorators need them?',
      answer:
        'A closure is an inner function that captured variables from its enclosing scope — and keeps them alive after that scope returns (stored in `__closure__` cells). A decorator\'s wrapper must call the original function on every future invocation, long after the decorator returned — the ONLY place `fn` survives is the wrapper\'s closure. No closures → the wrapper would have nothing to call. Bonus point: rebinding a captured variable needs `nonlocal`; reading does not.',
      isCaseBased: false,
    },
    {
      question: 'Case: prod bug. A teammate added a logging decorator to every Flask route. Deploy fails with "View function mapping is overwriting an existing endpoint function: wrapper". Walk me through it.',
      answer:
        'Diagnosis: the decorator skipped `functools.wraps`, so every decorated view has `__name__ == \'wrapper\'`. Flask derives endpoint names from `__name__` — the second route registers a duplicate endpoint \'wrapper\' and Flask refuses. Fix: add `@functools.wraps(fn)` on the wrapper and redeploy. Verify: check `view.__name__` in a shell. The transferable lesson: undecorated metadata breaks anything keyed on function identity — Flask endpoints, pickling, doc generators, monitoring dashboards. Ordering note: the logging decorator must sit BELOW `@app.route`, since route registers whatever object it receives at import time.',
      isCaseBased: true,
    },
    {
      question: 'You hand-rolled a dict-based memo decorator. Interviewer: "why would you use functools.lru_cache instead — and when would you not?"',
      answer:
        'lru_cache wins on: bounded memory via maxsize eviction (a bare dict grows forever), `cache_info()` for observable hit rates, `cache_clear()` for tests, C-speed lookup, and lock-protected bookkeeping. When NOT: (1) unhashable arguments (dicts, lists, DataFrames) — the dict-on-args version can key on `id()` or a custom serialization; (2) you need per-argument TTL/expiry — lru_cache has none; (3) cache must be shared across processes — both are per-process, you need Redis/memcached; (4) instance methods where cache lifetime should follow the object (see the leak question). Naming the eviction tradeoff — maxsize too small thrashes, too big hoards memory — is the senior answer.',
      isCaseBased: false,
    },
    {
      question: 'Case: memory leak. A service wraps an instance method with @lru_cache. Memory climbs for days; heap dumps show thousands of dead-looking session objects alive. Walk me through it.',
      answer:
        'Root cause: `self` is the first argument, so every cached entry holds a strong reference to the instance. The module-level cache outlives requests → sessions never get garbage-collected. Confirm: `Method.cache_info()` shows currsize growing; `gc.get_referrers` on a leaked session points into the cache. Fixes, in preference order: (1) cache a pure module-level function keyed on the actual data, not on self; (2) `functools.cached_property` or a per-instance dict, so the cache dies with the object; (3) bounded maxsize as a band-aid — leak becomes a plateau but stale entries persist. Tradeoff to name: per-instance caches lose cross-instance sharing; that is usually the point.',
      isCaseBased: true,
    },
    {
      question: '"Implement an LRU cache with O(1) get and put." Give the interview-grade narration.',
      answer:
        'Requirements first: get returns and marks-recent; put inserts/updates, evicting the least-recently-used at capacity; both O(1). Structure: hash map key → node, doubly linked list in recency order — map gives O(1) find, DLL gives O(1) unlink/relink (move-to-front on touch) and O(1) tail eviction. A list fails: repositioning is O(n). A heap fails: O(log n) plus unfixable stale priorities. Then offer: "OrderedDict is exactly this structure — move_to_end + popitem(last=False) — I can use it or hand-roll." If hand-rolling: dummy head/tail sentinels so no None checks, and update-then-move on existing keys. State that get on a missing key returns -1 (LeetCode convention) before coding.',
      isCaseBased: false,
    },
    {
      question: 'Explain the three arguments of __exit__ and what its return value controls.',
      answer:
        '`__exit__(self, exc_type, exc, tb)` — exception class, exception instance, traceback; all three None when the block finished cleanly. So __exit__ doubles as the error observer: a DB transaction manager commits when exc_type is None and rolls back otherwise. Return value: falsy → the exception re-raises after cleanup (default, safe); True → suppressed. Legit suppression exists — `contextlib.suppress(FileNotFoundError)` — but a blanket `return True` silently eats every error including KeyboardInterrupt-adjacent logic bugs. Tradeoff sentence: suppress narrowly and explicitly, propagate by default.',
      isCaseBased: false,
    },
    {
      question: 'When would you write a class with __enter__/__exit__ versus a @contextmanager generator?',
      answer:
        'Generator form: less ceremony, reads top-to-bottom (setup, yield, teardown), ideal for one-shot pairing like timers, chdir, temp resources — with the non-negotiable try/finally around yield. Class form when: (1) the manager carries state and methods the body calls (`with Timer() as t` then `t.ms` after — the object outlives the block); (2) you need reentrancy or reuse across multiple with statements (generators are single-use — second use raises); (3) fine-grained exception logic in __exit__ reads clearer than except-chains around a yield. Same guarantee either way — pick by whether an object with behavior needs to exist.',
      isCaseBased: false,
    },
    {
      question: 'Why does a decorator with arguments need three nested functions? Could you get away with two?',
      answer:
        'Because two calls happen at decoration: `require_role(\'admin\')` runs FIRST and must return something usable as a decorator; that decorator then receives the function. Factory(arg) → decorator(fn) → wrapper(call args) — each layer captures its input in a closure, so wrapper reaches both role and fn. Two layers cannot serve both calls with plain syntax. Escape hatches worth naming: a class decorator taking role in __init__ and fn in __call__ (still two acceptance points, just spelled differently), or functools.partial. The dual-use pattern (`@dec` and `@dec()` both working) exists but costs an if-branch on the first argument — usually not worth it.',
      isCaseBased: false,
    },
    {
      question: 'Decorators run at import time. What are the practical consequences?',
      answer:
        'Three: (1) decoration cost is paid once per process — heavy work in the decorator body (not the wrapper) slows startup, and side effects fire even if the function is never called; (2) it enables the **registration pattern** — `@app.route`, pytest fixtures, plugin registries all exploit "code runs when the module loads"; (3) stacked decorators apply bottom-up: `@a` over `@b` over f gives `a(b(f))` — so order matters, e.g. `@app.route` must be outermost or Flask registers the unwrapped inner function. Corollary: per-call logic belongs in the wrapper; the decorator body is a one-time setup phase.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Closure in one line', back: 'An inner function bundled with the outer variables it captured — alive after the outer function returns (stored in __closure__ cells).' },
    { front: 'nonlocal — when is it needed?', back: 'Only to REBIND a captured variable (count += 1). Reading captured variables needs nothing.' },
    { front: '@decorator is sugar for…', back: 'f = decorator(f) — executed once, at import time. The wrapper runs on every call.' },
    { front: 'functools.wraps — what and why', back: 'Copies __name__, __doc__, __module__ from fn onto the wrapper. Without it: help() lies, logs say \'wrapper\', Flask endpoints collide, pickle breaks.' },
    { front: 'Decorator WITH arguments — shape', back: 'Three layers: factory(arg) → decorator(fn) → wrapper(*args). Parentheses after @ mean the factory is CALLED first.' },
    { front: 'lru_cache — two constraints', back: 'Arguments must be hashable (no lists/dicts), and cache lives per-process. Bonus: on methods it holds self alive → leaks.' },
    { front: 'LRU cache O(1) structure', back: 'dict (key → node) + doubly linked list (recency order). OrderedDict = that structure prebuilt: move_to_end + popitem(last=False).' },
    { front: '__exit__ signature + return True', back: '__exit__(self, exc_type, exc, tb) — all None on clean exit. Return True = suppress the exception; falsy = re-raise after cleanup.' },
    { front: '@contextmanager mapping', back: 'Before yield = __enter__, after yield = __exit__, yielded value = the as-target. Cleanup MUST be in try/finally — body exceptions are thrown in at the yield.' },
    { front: 'Stacked decorators apply…', back: 'Bottom-up: @a above @b above f = a(b(f)). Order matters — @app.route goes outermost.' },
  ],
  mindmapMarkdown: `- Decorators, Closures & Context Managers
  - Closures
    - inner fn + captured variables
    - survives outer return (backpack)
    - nonlocal to rebind
    - one backpack per factory call
  - Decorator anatomy
    - func in → wrapper out
    - @ = f = dec(f), at import
    - *args/**kwargs passthrough
    - functools.wraps (identity)
  - The three builds
    - timing (perf_counter)
    - memo: dict on args → lru_cache
    - auth check (bouncer)
  - With arguments
    - factory → decorator → wrapper
    - parentheses = extra layer
  - LRU cache class
    - dict + doubly linked list
    - O(1) get/put, evict tail
    - OrderedDict shortcut
  - Context managers
    - with = guaranteed cleanup
    - __enter__ → as-target
    - __exit__(exc_type, exc, tb)
    - return True = suppress
    - @contextmanager: yield splits enter/exit
    - try/finally around yield`,
}

export default m
