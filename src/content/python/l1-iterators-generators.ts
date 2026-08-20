import type { Module } from '../types'

const m: Module = {
  id: 'py-l1-iterators-generators',
  subjectId: 'python',
  level: 1,
  title: 'Iterators, Generators & the Lazy Toolbox',
  whyItMatters:
    '"Difference between an iterable and an iterator?" and "why do generators save memory?" are Python screening questions — asked in the first ten minutes, answered badly by most candidates. Every data pipeline you will ever write (files, DataFrames, DataLoaders) is built on lazy iteration. This module gives you the protocol, the memory numbers to quote, and the sorting/lambda toolkit that rides along with it.',
  estMinutes: 50,
  sections: [
    {
      type: 'intuition',
      title: 'Iterable vs iterator: the book and the bookmark',
      md: `A book can be read by many people, any number of times. A bookmark tracks ONE person's position, moves forward only, and is useless once the book ends.

- **Iterable** = the book. Anything that can hand out a fresh bookmark: lists, strings, dicts, files, ranges. Technically: has an \`__iter__\` method.
- **Iterator** = the bookmark. The thing that actually remembers *where you are*. Technically: has \`__next__\`, and raises \`StopIteration\` when done.
- \`iter(book)\` → a new bookmark. \`next(bookmark)\` → the next item.
- Every iterator is also iterable (its \`__iter__\` returns itself) — but most iterables are NOT iterators. A list has no \`__next__\`.
- Interviews love this exact confusion. The one-liner: *"an iterable can be looped over; an iterator is the object doing the looping."*`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The for loop, desugared',
      code: `nums = [10, 20, 30]

for x in nums:          # what you write
    print(x)

it = iter(nums)         # what Python runs: nums.__iter__()
while True:
    try:
        x = next(it)    # it.__next__()
    except StopIteration:
        break           # the loop ends here -- silently
    print(x)`,
      annotations: {
        6: 'iter() asks the iterable for a fresh bookmark. This is why one list can power many loops at once.',
        9: 'next() moves the bookmark and returns one item. A for loop is just next() on repeat.',
        10: 'StopIteration is not an error — it is the protocol\'s "no more items" signal. The for loop catches it for you.',
      },
    },
    {
      type: 'note',
      md: `The trap, spelled out: a **list is iterable, not an iterator** — \`next([1, 2])\` is a \`TypeError\`. \`iter([1, 2])\` gives you a \`list_iterator\`, and THAT answers to \`next()\`. Iterators are **one-way and single-use**: once \`StopIteration\` fires, that iterator is empty forever — you get a fresh one from the iterable, never from the spent iterator.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Build one by hand: the whole protocol is two methods',
      code: `class Countdown:
    def __init__(self, start):
        self.current = start

    def __iter__(self):
        return self

    def __next__(self):
        if self.current <= 0:
            raise StopIteration
        self.current -= 1
        return self.current + 1

for n in Countdown(3):
    print(n)            # 3, 2, 1`,
      annotations: {
        6: 'Iterators return themselves from __iter__ — that is what lets an iterator sit directly in a for loop.',
        10: 'raise, not return. StopIteration ends the loop; returning None would just print None forever.',
        14: 'The for loop calls iter(), then next() until StopIteration. You just built what lists get for free.',
      },
    },
    {
      type: 'intuition',
      title: 'yield: a function with a pause button',
      md: `Writing \`__iter__\`/\`__next__\` classes by hand is boilerplate. Python's shortcut: put \`yield\` in a function and the whole protocol is generated for you.

- A function with \`yield\` anywhere in it is a **generator function**. Calling it runs *zero* lines of the body — it returns a **generator object** (a ready-made iterator).
- Each \`next()\` runs the body until the next \`yield\`, hands out that value, and **pauses right there**.
- All local variables are **frozen between calls** — like pausing a movie: the scene, the actors, everything waits exactly where you left it.
- The next \`next()\` resumes from the pause point, not from the top.
- When the body ends, \`StopIteration\` is raised automatically. No class, no \`self.current\`, no manual raise.`,
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `def countdown(n):
    print('  (body starts running)')
    while n > 0:
        yield n
        n -= 1
    print('  (body finished)')

g = countdown(3)
print('generator created - no code ran yet')
print('next ->', next(g))
print('next ->', next(g))
print('next ->', next(g))
try:
    next(g)
except StopIteration:
    print('StopIteration: the generator is empty')`,
        precomputedOutput: `generator created - no code ran yet
  (body starts running)
next -> 3
next -> 2
next -> 1
  (body finished)
StopIteration: the generator is empty`,
        caption: 'Watch the pause button: nothing runs until next(), and n survives between calls',
      },
    },
    {
      type: 'intuition',
      title: 'Generator expressions: a comprehension with lazy brackets',
      md: `Swap a list comprehension's \`[]\` for \`()\` and nothing is computed until asked.

- \`[x * x for x in big]\` — builds the WHOLE list in memory, right now.
- \`(x * x for x in big)\` — builds a generator: a recipe, not the dishes.
- Feed it straight into a consumer: \`sum(x * x for x in big)\` — no extra parentheses needed inside a call.
- Same single-use rule as every iterator: consume it twice and the second pass sees nothing.
- Rule of thumb: result gets stored or reused → list comprehension. Result flows straight into \`sum\`/\`max\`/\`any\`/a loop → generator expression.`,
    },
    {
      type: 'intuition',
      title: 'The memory advantage — the numbers to say out loud',
      md: `A list of a million squares is a banquet: every dish cooked and on the table before anyone eats. A generator is the recipe card — one dish exists at a time.

- The list must hold **1,000,000 integer objects at once**.
- The generator holds only its frozen state: the code position and current variables. Its size does **not grow with n** — a generator over a billion items is the same ~200 bytes.
- Run the demo below: the real numbers are the answer interviewers want quoted.`,
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `import sys

n = 1_000_000
squares_list = [x * x for x in range(n)]
squares_gen = (x * x for x in range(n))

print('list of 1M squares:', sys.getsizeof(squares_list), 'bytes')
print('generator         :', sys.getsizeof(squares_gen), 'bytes')
ratio = sys.getsizeof(squares_list) // sys.getsizeof(squares_gen)
print('ratio             :', str(ratio) + 'x smaller')

print('same answer?')
print(sum(squares_list) == sum(x * x for x in range(n)))`,
        precomputedOutput: `list of 1M squares: 8448728 bytes
generator         : 208 bytes
ratio             : 40618x smaller
same answer?
True`,
        caption: 'sys.getsizeof: ~8.4 MB of list vs 208 bytes of generator — a 40,000× gap',
      },
    },
    {
      type: 'note',
      md: `Honesty box — generators are not always the answer. They are **single-pass** (no second loop), have **no \`len()\`**, **no indexing** (\`gen[3]\` fails), and are harder to inspect while debugging. Need the data twice, need its length, or need random access → pay for the list. Streaming once through data too big to hold → generator, every time.`,
    },
    {
      type: 'intuition',
      title: 'lambda: a function the size of one expression',
      md: `\`lambda\` is a sticky note where \`def\` is a signed letter — no name, no envelope, one line of content.

- \`lambda x: x * x\` — parameters, colon, **exactly one expression**. Its value is auto-returned; the word \`return\` is banned.
- Statements are banned too: no \`if\` blocks, no \`for\` loops, no assignments inside.
- An \`if\`-*expression* is fine: \`lambda x: x if x > 0 else 0\` — because it produces a value.
- Real home: a throwaway function passed to \`sorted\`, \`map\`, \`filter\`, \`max\`.
- Assigning a lambda to a name (\`square = lambda x: ...\`) defeats the purpose — use \`def\`, which gives real tracebacks instead of anonymous \`<lambda>\` frames.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'lambda in its natural habitat',
      code: `square = lambda x: x * x          # legal, but def is better for named funcs
print(square(4))                  # 16

# statements are banned inside lambda:
# broken = lambda x: if x > 0: x        -> SyntaxError
safe = lambda x: x if x > 0 else 0      # if-EXPRESSION: allowed

# where lambda actually belongs: a throwaway key
print(sorted(['bb', 'a', 'ccc'], key=lambda s: len(s)))`,
      annotations: {
        1: 'No name, no return keyword — the expression IS the return value.',
        6: '"x if cond else y" produces a value, so it fits in a lambda. An if-statement never will.',
        9: 'This is the real use. (Here key=len alone would be even cleaner — see the map/filter rule next.)',
      },
    },
    {
      type: 'intuition',
      title: 'map/filter vs comprehensions: when each',
      md: `\`map(f, xs)\` applies \`f\` to every item; \`filter(f, xs)\` keeps items where \`f\` returns something truthy. Both return **lazy iterators**, same rules as generators.

- Default choice: the **comprehension**. \`[x * 2 for x in nums]\` reads left-to-right; \`map\` + \`lambda\` reads inside-out.
- \`map\` earns its place when the function **already exists**: \`map(str, nums)\` beats \`[str(x) for x in nums]\`.
- Writing \`map(lambda x: ..., xs)\` is a smell — the comprehension says the same thing without the lambda.
- Need laziness with comprehension syntax? A generator expression gives you both.
- Interview phrasing: *"comprehensions for readability, map when I'm passing an existing function, generator expressions when I want lazy."*`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Same jobs, both styles',
      code: `nums = [1, 2, 3, 4, 5]

doubled = map(lambda x: x * 2, nums)   # lazy iterator -- nothing ran yet
odds = filter(lambda x: x % 2, nums)   # keeps items where result is truthy

# the same jobs as comprehensions:
doubled2 = [x * 2 for x in nums]
odds2 = [x for x in nums if x % 2]

# where map genuinely wins: the function already exists
strings = list(map(str, nums))         # cleaner than [str(x) for x in nums]`,
      annotations: {
        3: 'map is lazy and single-use, exactly like a generator. Wrap in list() when you need the items materialized.',
        7: 'Reads in one direction, no lambda ceremony. This line beats line 3 in any code review.',
        11: 'Existing function, no lambda: the one case where map is the cleaner spelling.',
      },
    },
    {
      type: 'intuition',
      title: 'sorted(key=): sort by anything',
      md: `Judges at a singing contest don't sort the singers — they sort the **scorecards**. \`key=\` is the scorecard function.

- \`sorted(items, key=f)\` calls \`f\` once per item and orders by what \`f\` **returns**. The items themselves are untouched.
- \`sorted\` always returns a **new list** and works on any iterable; \`list.sort()\` sorts in place and returns \`None\` (classic bug: \`nums = nums.sort()\`).
- Dicts and tuples have no natural "sort by field" — \`key=\` is how you point at the field.
- Return a **tuple** from \`key\` to get tiebreakers: sort by score, then name.
- Python's sort is **stable**: equal keys keep their original order — that is what makes tuple-key tiebreaking trustworthy.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Sorting dicts and tuples by field',
      code: `users = [
    {'name': 'Asha', 'age': 31},
    {'name': 'Dev', 'age': 25},
    {'name': 'Mira', 'age': 28},
]
by_age = sorted(users, key=lambda u: u['age'])
# Dev(25), Mira(28), Asha(31)

scores = [('asha', 91), ('dev', 78), ('mira', 91)]
top = sorted(scores, key=lambda s: (-s[1], s[0]))
# ('asha', 91), ('mira', 91), ('dev', 78)

d = {'b': 2, 'c': 3, 'a': 1}
by_value = sorted(d.items(), key=lambda kv: kv[1])
# [('a', 1), ('b', 2), ('c', 3)]`,
      annotations: {
        6: 'key receives one user dict and returns the thing to compare. The dicts are never modified.',
        10: 'Tuple key = multi-level sort: -s[1] gives high-score-first, s[0] breaks ties alphabetically. One line, no cmp function.',
        15: 'A dict itself cannot be sorted — sort its .items() pairs by value, wrap in dict() if you need a dict back.',
      },
    },
  ],
  quiz: [
    {
      question: 'nums = [1, 2, 3]. What does next(nums) do?',
      options: [
        { text: 'Returns 1', explanation: 'That would need nums to be an iterator. A list is only an iterable — it has no __next__.' },
        { text: 'Raises TypeError — a list is iterable, not an iterator', explanation: 'Correct. next() needs __next__. You must ask for a bookmark first: it = iter(nums), then next(it) returns 1.' },
        { text: 'Raises StopIteration', explanation: 'StopIteration comes from an EXHAUSTED iterator. This call never gets that far — there is no iterator at all.' },
      ],
      correct: 1,
    },
    {
      question: 'How does a for loop know when to stop?',
      options: [
        { text: 'It checks len() of the iterable first', explanation: 'Generators and files have no len() at all, yet for loops over them work fine.' },
        { text: 'The iterator returns None when finished', explanation: 'None is a legal value to yield — using it as a stop signal would break iterators that produce None.' },
        { text: 'It catches the StopIteration raised by next()', explanation: 'Correct. The protocol signals "done" with an exception, and the for loop silently catches it. That is the entire stopping mechanism.' },
      ],
      correct: 2,
    },
    {
      question: 'g = (x for x in range(5)). You run sum(g) and get 10, then sum(g) again. Second result?',
      options: [
        { text: '10 again', explanation: 'That would need the generator to rewind. Generators are one-way — there is no rewind.' },
        { text: '0 — the generator is exhausted', explanation: 'Correct. The first sum() consumed everything; the second sees an empty iterator, and sum of nothing is 0. This silent 0 is a classic production bug.' },
        { text: 'StopIteration crashes the program', explanation: 'sum() handles StopIteration internally, exactly like a for loop — you get 0, not a crash. That silence is what makes the bug nasty.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is sys.getsizeof a generator ~208 bytes even for a billion items?',
      options: [
        { text: 'Generators compress their items', explanation: 'Nothing is compressed — nothing is STORED. The items never exist until requested.' },
        { text: 'It stores only frozen state (code position + local variables), not items', explanation: 'Correct. A generator is a paused recipe, not a pantry. Size depends on the state, never on n.' },
        { text: 'getsizeof cannot measure generators', explanation: 'It measures them fine — the object really is that small.' },
      ],
      correct: 1,
    },
    {
      question: 'Which of these is a SyntaxError?',
      options: [
        { text: 'lambda x: x if x > 0 else 0', explanation: 'Legal — the conditional EXPRESSION produces a value, so it fits in a lambda.' },
        { text: 'lambda x: return x * 2', explanation: 'Correct — SyntaxError. return is a statement, and a lambda body must be a single expression. The expression is returned automatically.' },
        { text: 'lambda: 42', explanation: 'Legal — a lambda with zero parameters is fine.' },
      ],
      correct: 1,
    },
    {
      question: 'You need every number in nums as a string. Most Pythonic?',
      options: [
        { text: 'list(map(lambda x: str(x), nums))', explanation: 'The lambda just forwards to str — wrap-nothing lambdas are the #1 map smell.' },
        { text: 'list(map(str, nums))', explanation: 'Correct. The function already exists, so map with no lambda is clean — this is exactly the case where map beats a comprehension.' },
        { text: 'A for loop appending str(x)', explanation: 'Works, but three lines for a one-line transform — comprehension or map(str, …) says it directly.' },
      ],
      correct: 1,
    },
    {
      question: 'd = {"a": 3, "b": 1}. What does sorted(d.items(), key=lambda kv: kv[1]) order by?',
      options: [
        { text: 'The keys ("a", "b")', explanation: 'kv[0] would be the key. kv[1] is the other half of each (key, value) pair.' },
        { text: 'The values (3, 1)', explanation: 'Correct. items() yields (key, value) tuples; kv[1] picks the value, so you get [("b", 1), ("a", 3)].' },
        { text: 'Insertion order', explanation: 'sorted() always re-orders by the key function — insertion order only survives when you never sort.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'What is the difference between an iterable and an iterator?',
      answer:
        'An **iterable** is anything that can produce an iterator — it has `__iter__` (lists, strings, dicts, files). An **iterator** is the object that walks: it has `__next__`, remembers its position, and raises `StopIteration` when done. Every iterator is also iterable (returns itself from `__iter__`), but not vice versa — `next([1,2])` is a TypeError. The book/bookmark line lands well: the iterable is the book, reusable by many readers; the iterator is one bookmark, forward-only and single-use.',
      isCaseBased: false,
    },
    {
      question: 'Why would you use a generator instead of a list? Give the memory argument with real numbers, then say when a list is still the right call.',
      answer:
        'A list of a million squares holds a million integer objects — ~8.4 MB via `sys.getsizeof`. The equivalent generator is ~208 bytes, a ~40,000× gap, and its size is **independent of n**: it stores only frozen state (code position + locals), producing one item at a time. That is why you can stream a 100 GB file on a laptop. Tradeoffs a strong answer names: generators are **single-pass** (exhausted after one loop), have **no len()**, **no indexing**, and are harder to debug (you cannot print what has not been produced). Need multiple passes, random access, or the data is small → use the list. Streaming once through big data → generator.',
      isCaseBased: false,
    },
    {
      question: 'Prod bug: a metrics job reads a 20 GB log file with lines = f.readlines(), then filters and aggregates. It OOMs on the new bigger logs. Walk me through the fix.',
      answer:
        'Root cause: `readlines()` materializes all 20 GB of lines as a list before any filtering happens. Fix: iterate lazily end-to-end. A file object is already a lazy iterator over lines, so `for line in f:` holds one line at a time. Chain the pipeline lazily: `errors = (l for l in f if "ERROR" in l)` then aggregate with `sum(...)`/`Counter` — generator expressions stack without ever materializing. Memory goes from O(file) to O(1 line). Tradeoffs to mention: the file must stay open while the generators are consumed (keep the `with` block around the consumption), and it is single-pass — needing two passes means re-opening the file or aggregating both stats in one pass.',
      isCaseBased: true,
    },
    {
      question: 'Prod bug: a function receives `readings` and computes peak = max(readings), then avg = sum(readings) / len(list(readings)) — avg crashes or comes out as 0 for some callers. Debug it.',
      answer:
        'The callers that break are passing a **generator**, not a list. `max()` consumes it entirely; `sum()` then sees an exhausted iterator and returns 0, and `len(list(...))` gives 0 → ZeroDivisionError or garbage averages. Callers passing lists work fine, which is why it is intermittent. Fixes, in preference order: (1) materialize once at the boundary — `readings = list(readings)` — if it fits in memory; (2) compute all stats in one pass (single loop tracking max/sum/count) if it does not; (3) document that the function requires a sequence. The transferable lesson: any function that iterates its argument twice silently breaks on iterators — exhaustion produces wrong *values*, not errors.',
      isCaseBased: true,
    },
    {
      question: 'What actually happens when you CALL a generator function? When does the body run?',
      answer:
        'Calling it runs zero lines of the body — it returns a generator object implementing the iterator protocol. The body runs only when `next()` is called: it executes to the first `yield`, emits that value, and pauses with **all locals frozen**. Each later `next()` resumes from the pause point. When the body returns, `StopIteration` is raised automatically. Interviewers probe this with "what does print inside the generator show at call time?" — answer: nothing. Bonus point: this also means argument-validation errors inside a generator do not fire until the first `next()`, which surprises people in code review.',
      isCaseBased: false,
    },
    {
      question: 'Desugar a for loop for me — what does `for x in nums` actually execute?',
      answer:
        '`it = iter(nums)` (i.e. `nums.__iter__()`), then a loop of `x = next(it)` (i.e. `it.__next__()`) with the body run per item, until `next` raises `StopIteration`, which the for loop catches and treats as normal termination. Two consequences worth stating: (1) anything implementing `__iter__`/`__next__` works in a for loop — that is the whole plugin contract; (2) because a fresh iterator is requested each time, one list supports many simultaneous or repeated loops, while a generator — being its own iterator — does not.',
      isCaseBased: false,
    },
    {
      question: 'map and filter exist, comprehensions exist — which do you use, and when?',
      answer:
        'Default: comprehensions — `[x * 2 for x in nums]` reads left-to-right and needs no lambda. `map`/`filter` win in one honest case: the function already exists — `map(str, nums)` is cleaner than `[str(x) for x in nums]`. `map(lambda x: ..., xs)` is strictly worse than the comprehension saying the same thing. Laziness is not a differentiator in map\'s favor: generator expressions give comprehension syntax AND laziness. Tradeoff to name: map/filter return single-use lazy iterators — a team that forgets this ships the exhausted-iterator bug; a list comprehension costs the memory but is reusable and printable.',
      isCaseBased: false,
    },
    {
      question: 'Sort a list of dicts by score descending, ties broken by name ascending — and tell me why your solution is trustworthy.',
      answer:
        "`sorted(rows, key=lambda r: (-r['score'], r['name']))`. The key returns a tuple, and tuples compare element-by-element: negated score gives descending order for numbers, name breaks ties ascending. Trustworthy for two reasons: (1) Python's Timsort is **stable** — equal keys keep their original relative order, so multi-key sorts compose predictably; (2) `key` is called once per element (O(n) key calls), not once per comparison. Tradeoffs to volunteer: the minus trick only works for numbers — for strings descending you need `reverse=True` or two sorts exploiting stability (sort by name first, then by score with reverse=True). And `sorted()` returns a new list while `.sort()` mutates and returns None.",
      isCaseBased: false,
    },
    {
      question: 'Why does Python restrict lambda to a single expression, and when is using a lambda the wrong call?',
      answer:
        'By design lambda is for throwaway, inline functions — one expression whose value is the return. No statements means no temptation to grow logic in an unnamed, untestable place. Wrong calls: (1) assigning it — `f = lambda x: ...` loses nothing vs `def` except a proper name in tracebacks (`<lambda>` is all you get when it crashes); (2) any logic needing branches, loops, or reuse; (3) wrapping an existing function — `key=lambda s: len(s)` should be `key=len`. Right call: a one-shot `key=`/`filter` predicate too trivial to name.',
      isCaseBased: false,
    },
    {
      question: 'Your teammate says: "generators are just slower lists, I always use lists." Argue both sides honestly.',
      answer:
        'Their half-truth: per-item, a generator has resume/pause overhead, and if you eventually need all items in memory anyway (multiple passes, indexing, len), building the list once is simpler and often faster. The other side: generators are O(1) memory regardless of n — the difference between a pipeline that runs and one that OOMs; they start producing immediately (no wait for the full build), can express infinite streams, and chain into pipelines where no intermediate list ever exists. The senior framing: it is not lists vs generators, it is **materialize once at the right boundary** — stream through transformations lazily, call list() exactly where reuse begins.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Iterable vs iterator, one line each', back: 'Iterable: has __iter__, can hand out iterators (the book). Iterator: has __next__ + raises StopIteration, remembers position (the bookmark).' },
    { front: 'What a for loop desugars to', back: 'it = iter(x), then next(it) repeatedly, body per item, until StopIteration is caught.' },
    { front: 'Calling a generator function runs…', back: 'Zero lines of the body. It returns a generator object; the body runs on next(), pausing at each yield with locals frozen.' },
    { front: 'Generator vs list memory (1M squares)', back: 'List: ~8.4 MB (all items exist). Generator: ~208 bytes, independent of n — only frozen state is stored.' },
    { front: 'The three things generators CANNOT do', back: 'No second pass (single-use), no len(), no indexing. Need any of these → materialize a list.' },
    { front: 'Generator expression syntax', back: '(x * x for x in xs) — a comprehension with () instead of []. Lazy, single-use. sum(x * x for x in xs) needs no extra parens.' },
    { front: 'lambda restriction', back: 'Exactly one EXPRESSION — no statements, no return keyword (the expression is auto-returned). Conditional expressions (a if c else b) allowed.' },
    { front: 'map vs comprehension rule', back: 'Comprehension by default. map only when the function already exists: map(str, nums). map + lambda is a smell.' },
    { front: 'Sort dicts by field, with tiebreaker', back: "sorted(rows, key=lambda r: (-r['score'], r['name'])) — key returns a tuple; stable sort makes ties predictable." },
    { front: 'sorted() vs list.sort()', back: 'sorted(): new list, works on any iterable. .sort(): in place, list only, returns None — nums = nums.sort() is the classic bug.' },
  ],
  mindmapMarkdown: `- Iterators, Generators & the Lazy Toolbox
  - Iterable vs iterator
    - iterable: __iter__, the book
    - iterator: __next__ + StopIteration, the bookmark
    - iterators are single-use
  - for loop desugared
    - iter() → next() → catch StopIteration
  - Generators
    - yield = pause button
    - locals frozen between next() calls
    - genexp: () instead of []
    - memory: 8.4 MB list vs 208 B
    - no len / index / second pass
  - lambda
    - one expression only
    - throwaway key= functions
    - named logic → def
  - map / filter
    - lazy single-use iterators
    - comprehension by default
    - map(str, xs): existing function wins
  - sorted(key=)
    - key returns the scorecard
    - tuple key = tiebreakers
    - stable sort
    - sorted() new list vs .sort() in place`,
}

export default m
