import type { Module } from '../types'

const m: Module = {
  id: 'py-l1-mutability-traps',
  subjectId: 'python',
  level: 1,
  title: 'Mutability, Copies & the Classic Traps',
  whyItMatters:
    'Three of the most-asked Python interview questions — is vs ==, the mutable default argument, the [[0]*3]*3 grid — are ONE idea wearing three costumes: variables are references, not boxes. Learn the idea once and all three become obvious. Skip it and you will ship each of these bugs to production at least once.',
  estMinutes: 45,
  sections: [
    {
      type: 'intuition',
      title: 'Variables are sticky notes, not boxes',
      md: `A Python object is a thing sitting in a warehouse. A variable is a **sticky note** with a name on it, stuck to that thing.

- \`x = [1, 2]\` builds one list in the warehouse and sticks the note \`x\` on it.
- \`y = x\` sticks a **second note on the same list**. Assignment NEVER copies. Ever.
- Two names, one object — that's called **aliasing**.
- Mutate the list through either name and "both" change — because there is only one list.
- \`id(obj)\` returns the object's unique number (its warehouse address). Two names with the same \`id\` = same object.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Aliasing caught in the act',
      code: `a = [1, 2, 3]
b = a                 # second sticky note, same list
b.append(4)
print(a)              # [1, 2, 3, 4] — "a" changed too

print(id(a) == id(b)) # True: literally one object

c = [1, 2, 3, 4]      # a fresh, separate list
print(a == c)         # True  — same contents
print(a is c)         # False — different objects`,
      annotations: {
        2: 'No list is built here. Python copies the reference (the sticky note), never the object.',
        4: 'You appended "through b" but a sees it — there was never a second list to protect a.',
        6: 'id() is the object\'s identity number. Same id = same object = aliasing.',
        10: '"is" compares identities (id), "==" compares contents. They answer different questions.',
      },
    },
    {
      type: 'intuition',
      title: 'is vs ==: same person vs identical twins',
      md: `Identical twins pass the "look the same" test but they are two people. That's the whole distinction.

- \`==\` asks: **same contents?** (equality). Twins pass.
- \`is\` asks: **literally the same object?** (identity). Only one person passes with themselves.
- \`a is b\` is exactly \`id(a) == id(b)\`.
- Rule for interviews and code review: use \`==\` for values. Use \`is\` only for \`None\`: \`if x is None:\`.
- Why \`is None\` is safe: a running Python has exactly ONE \`None\` object, and \`is\` can't be tricked by a class that overrides \`__eq__\` (some do — comparing a NumPy array with \`== None\` doesn't even return a bool).`,
    },
    {
      type: 'note',
      md: `The interning gotcha — why \`is\` on ints sometimes "works": CPython pre-creates the integers **−5 to 256** and caches (interns) many short strings. So \`a = 256; b = 256; a is b\` → \`True\`, while \`a = 1000; b = 1000; a is b\` is typically \`False\`. It's a caching optimization, an implementation detail — never proof that \`is\` compares values. If your code's correctness depends on interning, it's already broken.`,
    },
    {
      type: 'intuition',
      title: 'Shallow copy: a new folder full of the OLD addresses',
      md: `A list of lists is a folder holding address slips pointing to other folders. A **shallow copy** photocopies only the outer folder — the address slips inside still point to the *same* inner folders.

- All three spellings are shallow and identical in effect: \`list(a)\`, \`a[:]\`, \`copy.copy(a)\`.
- Shallow gives you a new OUTER list — appending/removing on the copy doesn't touch the original.
- But the inner objects are **shared**. Mutate one nested list and both "copies" see it.
- \`copy.deepcopy(a)\` photocopies everything, recursively — fully independent, but slower.
- Shallow is enough when the contents are immutable (ints, strings, tuples of those) — you can't mutate through an immutable, so sharing it is harmless.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Shallow vs deep, side by side',
      code: `import copy

team = [['ana', 100], ['raj', 200]]

shallow = team[:]           # same as list(team) or copy.copy(team)
shallow[0][1] = 999         # reaches through to the SHARED inner list
print(team)                 # [['ana', 999], ['raj', 200]] — original hit!

shallow.append(['new', 0])  # outer list IS separate
print(len(team))            # still 2 — the append didn't leak

deep = copy.deepcopy(team)
deep[0][1] = -1
print(team)                 # [['ana', 999], ['raj', 200]] — untouched`,
      annotations: {
        5: 'Three spellings, one behavior: new outer list, same inner objects. All shallow.',
        6: 'shallow[0] IS team[0] — one inner list, two routes to it. Mutation travels.',
        9: 'The outer list really is new — structural changes (append/remove) stay local.',
        12: 'deepcopy recurses into every nested object and rebuilds it. Independence costs time and memory.',
      },
    },
    {
      type: 'intuition',
      title: 'The [[0]*3]*3 grid bug, frame by frame',
      md: `You want a 3×3 grid of zeros. You write \`grid = [[0] * 3] * 3\`. Here is exactly what Python does:

1. \`[0] * 3\` builds **one** list: \`[0, 0, 0]\`. Fine so far.
2. The outer \`* 3\` does NOT build three rows. It writes the same row's sticky note three times: \`[row, row, row]\`.
3. Your "grid" is three references to ONE row — a tower of aliases.
4. \`grid[0][0] = 99\` mutates that single shared row → all three "rows" show 99.
5. Why the inner \`* 3\` was safe but the outer wasn't: the inner repeats \`0\`, which is **immutable** — you can't mutate through it. The outer repeats a **list** — you can.

The fix: \`[[0] * 3 for _ in range(3)]\`. The comprehension re-runs the row-builder on every iteration, so you get three fresh, independent lists.`,
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `grid = [[0] * 3] * 3          # the trap
grid[0][0] = 99
print('buggy grid:')
for row in grid:
    print(row)
print('rows are the same object?', grid[0] is grid[1])

fixed = [[0] * 3 for _ in range(3)]
fixed[0][0] = 99
print('fixed grid:')
for row in fixed:
    print(row)
print('rows are the same object?', fixed[0] is fixed[1])`,
        precomputedOutput: `buggy grid:
[99, 0, 0]
[99, 0, 0]
[99, 0, 0]
rows are the same object? True
fixed grid:
[99, 0, 0]
[0, 0, 0]
[0, 0, 0]
rows are the same object? False`,
        caption: 'One write, three changed rows — because there is only one row. The comprehension builds three real ones.',
      },
    },
    {
      type: 'intuition',
      title: 'The mutable default argument: one bread basket for every table',
      md: `\`def add(item, acc=[])\` looks like "acc starts empty on every call". It doesn't.

- The default \`[]\` is evaluated **once — at \`def\` time** — and stored on the function object.
- Every call that omits \`acc\` gets that SAME stored list. Like a restaurant reusing one bread basket for all tables without emptying it.
- First call returns \`[1]\`. Second call returns \`[1, 2]\`. The leftovers stayed.
- You can catch it red-handed: \`add.__defaults__\` shows the growing list.
- The idiom: default to \`None\` (a safe, immutable sentinel — a placeholder value meaning "nothing passed"), then build the fresh list **inside** the body, which runs at CALL time.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The bug and the idiom',
      code: `def buggy(item, acc=[]):      # [] built ONCE, when def runs
    acc.append(item)
    return acc

print(buggy(1))               # [1]
print(buggy(2))               # [1, 2]  <- leftovers from call 1
print(buggy.__defaults__)     # ([1, 2],) — the shared list, exposed

def fixed(item, acc=None):
    if acc is None:           # the idiom — and note: "is", not "=="
        acc = []              # fresh list per call, built at CALL time
    acc.append(item)
    return acc

print(fixed(1))               # [1]
print(fixed(2))               # [2]  <- clean`,
      annotations: {
        1: 'def is a statement that RUNS. It evaluates defaults right then and staples them to the function object.',
        7: '__defaults__ is where the stapled defaults live. Watching it grow is the proof.',
        10: 'is None — identity check against the one-and-only None object. This is THE approved use of "is".',
        11: 'The body runs on every call, so this [] really is new each time. That is the entire fix.',
      },
    },
    {
      type: 'note',
      md: `The five-line recap — everything in this module:
- Assignment never copies: \`b = a\` is aliasing (two names, one object; check with \`id()\` or \`is\`).
- \`==\` compares contents, \`is\` compares identity. Use \`is\` only for \`None\`.
- \`list(a)\`, \`a[:]\`, \`copy.copy(a)\` are shallow — new outer, shared insides. \`copy.deepcopy(a)\` is total independence.
- \`*\` on a list holding mutables repeats **references** → the \`[[0]*3]*3\` grid bug. Fix with a comprehension.
- Defaults evaluate once at \`def\` time → mutable defaults persist across calls. Fix with the \`acc=None\` sentinel idiom.`,
    },
  ],
  quiz: [
    {
      question: 'After a = [1, 2]; b = a; b.append(3) — what is a?',
      options: [
        { text: '[1, 2]', explanation: 'That would require b = a to have copied the list. Assignment never copies — it aliases.' },
        { text: '[1, 2, 3]', explanation: 'Correct. a and b are two names for one list; the append is visible through both.' },
        { text: 'It raises an error', explanation: 'Nothing illegal happened — appending through an alias is perfectly valid Python.' },
      ],
      correct: 1,
    },
    {
      question: 'x == y is True but x is y is False. What do you know?',
      options: [
        { text: 'Same contents, different objects', explanation: 'Correct. == passed (equal values), is failed (two distinct objects — different ids). Identical twins.' },
        { text: 'That combination is impossible', explanation: 'It is the NORMAL case for equal values: two separately-built [1,2] lists compare == True, is False.' },
        { text: 'Same object, different contents', explanation: 'Backwards — one object cannot differ from itself in contents; is True would force == True for sane types.' },
      ],
      correct: 0,
    },
    {
      question: 'a = 256; b = 256; a is b → True. But a = 1000; b = 1000; a is b → usually False. Why?',
      options: [
        { text: 'Python compares small numbers by value', explanation: 'is never compares values — it always compares identity. Something else made the ids equal.' },
        {
          text: 'CPython interns integers −5..256, so both names point at the one cached 256 object',
          explanation: 'Correct. Small ints are pre-created and reused; 1000 gets a fresh object per occurrence. Implementation detail — never rely on it.',
        },
        { text: '1000 is too large to store as an int', explanation: 'Python ints are arbitrary precision — size is not the issue; caching is.' },
      ],
      correct: 1,
    },
    {
      question: 'Which produces a FULLY independent copy of data = [[1], [2]]?',
      options: [
        { text: 'data[:]', explanation: 'Shallow — new outer list, but both inner lists are shared. Mutating copy[0] hits data[0].' },
        { text: 'list(data)', explanation: 'Same shallow behavior as [:] — just a different spelling. Insides still shared.' },
        { text: 'copy.deepcopy(data)', explanation: 'Correct. deepcopy recurses into every nested object and rebuilds it — no sharing at any depth.' },
        { text: 'copy.copy(data)', explanation: 'copy.copy is the third spelling of a SHALLOW copy — identical to [:] and list() here.' },
      ],
      correct: 2,
    },
    {
      question: 'grid = [[0] * 2] * 2; grid[0][0] = 5 — what is grid now?',
      options: [
        { text: '[[5, 0], [0, 0]]', explanation: 'That is what the fixed comprehension version gives. Here both "rows" are one shared list.' },
        { text: '[[5, 0], [5, 0]]', explanation: 'Correct. The outer * 2 repeated a reference to ONE row, so writing through grid[0] shows through grid[1].' },
        { text: '[[5, 5], [5, 5]]', explanation: 'Only index 0 of the shared row was written — the 0s at index 1 are untouched.' },
      ],
      correct: 1,
    },
    {
      question: 'Why does def f(x, acc=[]) accumulate values across calls?',
      options: [
        { text: 'Lists are global in Python', explanation: 'Lists have normal scoping. The issue is WHEN the default is created, not where it lives.' },
        {
          text: 'The default [] is evaluated once at def time and every call shares that one list',
          explanation: 'Correct. Defaults are stapled to the function object (see f.__defaults__); calls that omit acc all mutate the same list.',
        },
        { text: 'append leaks memory', explanation: 'append works fine — it is appending to a list that outlives each call that is the surprise.' },
        { text: 'Python passes arguments by value', explanation: 'Python passes object references — and that fact alone would not make calls share state; the once-evaluated default does.' },
      ],
      correct: 1,
    },
    {
      question: 'The standard fix for the mutable default bug is…',
      options: [
        { text: 'def f(x, acc=list())', explanation: 'list() is also evaluated once at def time — identical bug, fancier spelling.' },
        {
          text: 'def f(x, acc=None): if acc is None: acc = []',
          explanation: 'Correct. None is an immutable sentinel; the real list is built in the body, which runs fresh on every call.',
        },
        { text: 'def f(x, acc=None): if acc == None: acc = []', explanation: 'Works for plain None but the idiom is "is None": identity is exact, and == can be hijacked by a custom __eq__ on whatever gets passed in.' },
        { text: 'Call f(x, []) every time', explanation: 'Pushing the burden to every caller is not a fix — one forgetful call site brings the bug back.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain is vs == and state the one place is belongs in production code.',
      answer:
        '`==` asks "equal contents?" and dispatches to `__eq__`, which classes can override. `is` asks "same object?" — it compares identities (`id(a) == id(b)`) and cannot be overridden or fooled. Production use of `is`: comparisons with `None` (and other module-level sentinels), because None is a singleton and `is` is both faster and immune to weird `__eq__` implementations (a NumPy array compared with `== None` returns an array, not a bool — `is None` never breaks). Everything else: `==`.',
      isCaseBased: false,
    },
    {
      question: 'Prod bug: an API handler is defined as def handle(event, errors=[]). QA reports that error messages from OTHER requests are appearing in responses. Walk me through the diagnosis and fix.',
      answer:
        'Symptom pattern — state bleeding across independent calls — points straight at a mutable default. The `[]` was evaluated once when the module loaded; every request that omits `errors` appends into that one shared list, so request N sees requests 1..N−1\'s errors. Confirm in 30 seconds: `print(handle.__defaults__)` after a few calls — the list is growing. Fix: `errors=None` + `if errors is None: errors = []`. Then grep the codebase for `=[]`, `={}`, `=set()` in signatures — this bug travels in herds. Tradeoff worth naming: the None idiom loses the "obvious" signature; document the real default in the docstring or use a typed sentinel if None is a legal value.',
      isCaseBased: true,
    },
    {
      question: 'Whiteboard: dissect exactly why [[0]*3]*3 breaks and [[0]*3 for _ in range(3)] does not.',
      answer:
        'Step 1: `[0]*3` builds one list `[0,0,0]`. Step 2: the outer `*3` repeats the REFERENCE to that row, not the row — result is `[row, row, row]`, three aliases of one object (`grid[0] is grid[1]` → True). Any `grid[i][j] = v` mutates the single shared row, so every row shows it. The inner `*3` was harmless because it repeats `0`, an immutable — you cannot mutate through an int, so sharing it has no observable effect. The comprehension fixes it because its body `[0]*3` is re-executed on each of the 3 iterations, constructing 3 distinct lists. General rule: `*` on sequences copies references — it is only safe when the elements are immutable.',
      isCaseBased: false,
    },
    {
      question: 'When is a shallow copy the right choice over deepcopy? Name the tradeoffs.',
      answer:
        'Shallow (`a[:]`, `list(a)`, `copy.copy`) when: (1) the elements are immutable — ints, strings, tuples of immutables — sharing them is invisible; (2) you only need structural independence — you will append/remove/reorder but never mutate elements in place; (3) the structure is large and hot — deepcopy walks every nested object, costing time and memory. deepcopy when nested mutables will be mutated and the copies must diverge. Two deepcopy facts worth volunteering: it handles cycles via its memo dict, and its cost is proportional to the entire object graph — inside a tight loop it is a classic hidden performance bug.',
      isCaseBased: false,
    },
    {
      question: 'Prod bug: a multi-tenant service does tenant_cfg = dict(default_cfg), then tenant_cfg["limits"]["rate"] = custom. Later, OTHER tenants start getting that custom rate. Why, and how do you fix it?',
      answer:
        '`dict(default_cfg)` is a shallow copy: new outer dict, but `tenant_cfg["limits"]` is the SAME inner dict object as `default_cfg["limits"]`. Writing `["rate"]` through it mutated the shared default, silently reconfiguring every tenant copied afterward (and any live alias). Fixes, in order of preference: (1) `copy.deepcopy(default_cfg)` per tenant — correct and simple; cost is fine for config-sized objects; (2) treat defaults as immutable — build them from tuples/frozen dataclasses (or types.MappingProxyType) so the mutation raises instead of corrupting; (3) merge-on-read (compute the effective config instead of copying a template). Also check whether the corrupted default was persisted anywhere — the data may need repair, not just the code.',
      isCaseBased: true,
    },
    {
      question: 'Is Python pass-by-value or pass-by-reference? Answer like a senior, with the observable consequences.',
      answer:
        'Neither — it is pass-by-object-reference (call-by-sharing): the reference is passed by value. Consequences: (1) mutating a passed-in object (`lst.append`) is visible to the caller — same object; (2) REBINDING the parameter (`lst = []`) is invisible — you only re-stuck your local sticky note; (3) immutables appear "pass-by-value" only because you cannot mutate them, so rebinding is all you can do. This framing also explains why the mutable default bug bites: the default reference is shared across calls, and mutation through it is globally visible.',
      isCaseBased: false,
    },
    {
      question: 'What does id() actually guarantee, and what does it NOT guarantee?',
      answer:
        'Guarantee: the id is unique among objects alive AT THE SAME TIME, and constant for one object over its lifetime. Not guaranteed: uniqueness across time — after an object is garbage-collected, its id can be reused by a new object, so storing ids as long-lived keys is a bug (use the object, or a weakref). Also implementation-specific: in CPython id() happens to be the memory address; other Pythons (PyPy) just return some stable integer. `a is b` is the honest API — it is exactly `id(a) == id(b)` evaluated while both are alive.',
      isCaseBased: false,
    },
    {
      question: 'A teammate writes if user_input == None instead of is None and the tests pass. Do you flag it in review? Justify.',
      answer:
        'Flag it. It works today because None\'s `__eq__` behaves — the risk is on the OTHER operand: `==` dispatches to `user_input.__eq__`, which any class can override. Real offenders: a NumPy array returns an element-wise array (making the `if` raise "truth value is ambiguous"), an ORM field object builds a query expression, a Mock happily returns another Mock. `is None` is identity — unoverridable, constant-time, and states intent ("checking for the sentinel", not "comparing values"). PEP 8 mandates it. Low-cost change, removes an entire class of surprise — easy accept.',
      isCaseBased: false,
    },
    {
      question: 'Design question: why does Python make assignment aliasing instead of copying, like C structs do?',
      answer:
        'Cost and semantics. Cost: everything in Python is a heap object — copying on every assignment would make passing a million-element list to a function O(n), and function calls, loops and comprehensions do assignments constantly. Semantics: aliasing makes identity meaningful — many objects (open files, sockets, locks) cannot be sensibly copied at all, and shared mutable state is often the point (a cache passed to many functions). The language\'s bargain: assignment is always O(1) reference copy, and when you DO want a copy you say so explicitly — `a[:]`, `copy.copy`, `copy.deepcopy` — choosing how deep. The traps in this module are the tuition for that bargain.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'What does b = a copy?', back: 'Nothing. It binds a second name to the SAME object (aliasing). Assignment never copies in Python.' },
    { front: 'is vs == in one line', back: 'is → same object (identity, id(a)==id(b)). == → same contents (equality, via __eq__).' },
    { front: 'The one approved use of "is"', back: 'x is None (and other singleton sentinels). None is unique, and "is" cannot be fooled by a custom __eq__.' },
    { front: 'The three spellings of a shallow copy', back: 'list(a), a[:], copy.copy(a) — new outer container, inner objects still shared.' },
    { front: 'When is shallow copy enough?', back: 'When the elements are immutable, or you only change the STRUCTURE (append/remove) — never nested contents.' },
    { front: 'Why [[0]*3]*3 breaks', back: 'Outer *3 repeats a REFERENCE to one row → 3 aliases. Fix: [[0]*3 for _ in range(3)] — builds 3 fresh rows.' },
    { front: 'Why def f(x, acc=[]) accumulates', back: 'Defaults are evaluated ONCE, at def time, and stored on the function (f.__defaults__). All calls share that one list.' },
    { front: 'The mutable-default fix idiom', back: 'acc=None in the signature; if acc is None: acc = [] in the body — fresh list at CALL time.' },
    { front: 'Small-int interning', back: 'CPython caches ints −5..256 (and short strings), so "is" on them can be True by accident. Implementation detail — never rely on it.' },
  ],
  mindmapMarkdown: `- Mutability, Copies & the Classic Traps
  - Variables = references
    - sticky note, not box
    - b = a → aliasing, no copy
    - id() = object's identity number
  - is vs ==
    - is: identity (id match)
    - ==: contents (__eq__)
    - only "is None" in real code
    - interning: −5..256 cached (trap)
  - Copies
    - shallow: list(a), a[:], copy.copy
    - new outer, shared insides
    - deep: copy.deepcopy — recursive, slower
    - shallow OK if contents immutable
  - The grid bug
    - [[0]*3]*3 = 3 refs, 1 row
    - grid[0][0]=99 → all rows change
    - fix: comprehension builds fresh rows
  - Mutable default arg
    - defaults run ONCE at def time
    - stored in f.__defaults__
    - calls share the one list
    - fix: acc=None + is None check`,
}

export default m
