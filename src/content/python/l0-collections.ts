import type { Module } from '../types'

const m: Module = {
  id: 'py-l0-collections',
  subjectId: 'python',
  level: 0,
  title: 'The Big Four Collections — and When to Use Which',
  whyItMatters:
    'Every Python interview has a moment where the interviewer watches WHICH container you reach for. Write `if x in my_list` inside a loop and a FAANG screener marks you down before you finish the function. This module gives you the four core structures (plus strings), and the 10-second rule for picking the right one.',
  estMinutes: 60,
  sections: [
    {
      type: 'intuition',
      title: 'Pick the container before you write the code',
      md: `Python gives you four everyday containers. Each is a thing you already own:

- **list** — a whiteboard to-do list: items in order, you add, remove, and reorder freely.
- **tuple** — a laminated ID card: a few fields, fixed forever.
- **set** — a bouncer's guest list: no duplicates, instant "are you in or not?"
- **dict** — your phone contacts: name → number, jump straight to the entry.
- Strings are the warm-up act: a sequence like a list, but carved in stone.
- Two cost words for this page: **O(1)** means the same tiny work no matter how big the collection; **O(n)** means the work grows with the number of items.`,
    },
    {
      type: 'intuition',
      title: 'str — carved in stone',
      md: `A string is a printed receipt. Spot a typo? You cannot edit the paper — you print a **new** receipt.

- That is **immutability**: no string method ever changes the string. Every method hands back a fresh one.
- \`s.lower()\` does nothing to \`s\`. It *returns* a lowercase copy. Forgetting to catch the return value is the #1 beginner string bug.
- The methods worth knowing cold: \`lower/upper\`, \`strip\`, \`split\`, \`join\`, \`replace\`, \`startswith/endswith\`, \`in\` for substring checks.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The string methods interviews assume you know',
      code: `s = 'FAANG prep'
print(s.lower())              # 'faang prep' -- a NEW string comes back
print(s)                      # 'FAANG prep' -- original untouched
print(s.replace(' ', '_'))    # 'FAANG_prep'
print(s.split(' '))           # ['FAANG', 'prep']
print('-'.join(['a', 'b', 'c']))                 # 'a-b-c'
print(s.strip(), s.startswith('FA'), 'AN' in s)  # 'FAANG prep' True True`,
      annotations: {
        2: 'Methods never edit the string — they return a new one. s itself cannot change, ever.',
        3: 'Proof of immutability: after .lower() and .replace(), s is exactly what it was.',
        6: 'join lives on the SEPARATOR string and takes the list. It is the inverse of split.',
      },
    },
    {
      type: 'note',
      md: 'Gotcha with a price tag: `result += piece` in a loop copies the whole string every time (immutable → each += prints a new receipt). n pieces → O(n²) copying. The idiom: collect pieces in a list, then `\'\'.join(pieces)` once — O(n).',
    },
    {
      type: 'intuition',
      title: 'list — the whiteboard',
      md: `The workhorse. Ordered, mutable (you can change it in place), duplicates welcome.

- \`append(x)\` — stick it on the end. O(1).
- \`pop()\` — take from the end. O(1). But \`pop(0)\` takes from the front and every other item shifts left: O(n).
- \`sort()\` — sorts the list **in place** and returns \`None\`. \`sorted(a)\` returns a **new** sorted list and leaves \`a\` alone.
- Indexing \`a[i]\` is O(1). But asking \`x in a\` walks the list item by item: O(n). Remember that line — it comes back below.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'append / pop / sort — and the sort() trap',
      code: `tasks = ['email', 'standup', 'review']
tasks.append('deploy')     # add at the END: O(1)
tasks.pop()                # remove from the END: O(1) -> 'deploy'
tasks.pop(0)               # remove from the FRONT: O(n) -- all items shift left
tasks.sort()               # sorts IN PLACE, returns None
print(tasks)               # ['review', 'standup']
nums = [3, 1, 2]
print(sorted(nums), nums)  # [1, 2, 3] [3, 1, 2] -- sorted() builds a NEW list`,
      annotations: {
        4: 'pop(0) shifts every remaining item one slot left — that is why the front is expensive.',
        5: 'x = tasks.sort() sets x to None. Classic bug: sort() mutates and returns nothing.',
        8: 'sort() mutates, sorted() copies. Pick by whether you still need the original order.',
      },
    },
    {
      type: 'intuition',
      title: 'tuple — the laminated card',
      md: `A tuple is a small fixed record: \`(lat, lon)\`, \`(name, age)\`, an RGB color. Position carries meaning.

- **Immutable**: once made, no appends, no edits. That is a feature — nobody can quietly corrupt your record.
- Because it can never change, a tuple is **hashable** — one line: *hashable = has a fingerprint number that stays valid for life*, which is what dicts and sets file things under.
- So a tuple can be a **dict key** or live in a set. A list cannot — it could change after being filed, and its fingerprint would lie.
- Unpacking is free style points: \`lat, lon = point\`.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Tuples as dict keys — the thing lists cannot do',
      code: `point = (28.61, 77.21)          # fixed record: lat, lon -- meaning by POSITION
lat, lon = point                # unpacking
visits = {}
visits[point] = 3               # tuple as a dict key: works -- tuples are hashable
print(visits[(28.61, 77.21)])   # 3
bad = [28.61, 77.21]
# visits[bad] = 3  ->  TypeError: unhashable type: 'list'`,
      annotations: {
        4: 'The dict files the entry under hash(point). Immutable tuple → the hash stays honest forever.',
        7: 'A list can mutate after being filed, so its hash would go stale. Python refuses up front.',
      },
    },
    {
      type: 'intuition',
      title: 'set — the bouncer',
      md: `A set answers exactly two questions, both instantly: *"is this in here?"* and *"what are the uniques?"*

- Add a duplicate → it silently vanishes. Uniqueness is automatic, not something you check.
- \`x in my_set\` is **O(1)**: Python hashes x and jumps straight to where it would be. No scanning.
- The price: **no order** (never rely on how a set prints), and members must be hashable (numbers, strings, tuples — not lists).
- \`set(my_list)\` is the one-line dedupe every data-cleaning script uses.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Uniqueness and instant membership',
      code: `emails = {'a@x.com', 'b@x.com', 'a@x.com'}
print(len(emails))            # 2 -- the duplicate silently vanished
print('a@x.com' in emails)    # True, in O(1) -- the whole point of a set
emails.add('c@x.com')
emails.discard('b@x.com')     # no error even if missing (remove() would raise)
print(sorted(emails))         # ['a@x.com', 'c@x.com'] -- sort to display: sets have NO order`,
      annotations: {
        3: 'Membership is a hash jump, not a scan. Same cost at 10 items or 10 million.',
        6: 'Never print or iterate a set expecting an order. If order matters, you wanted a list.',
      },
    },
    {
      type: 'intuition',
      title: 'dict — the contacts app',
      md: `You do not scroll through 900 contacts to call Mom. You type the name and jump. That jump is a dict lookup.

- \`d[key]\` — **O(1)** lookup, same hashing trick as sets (a set is basically a dict with no values).
- \`d[key]\` on a missing key **crashes** with \`KeyError\`. \`d.get(key)\` returns \`None\` instead, and \`d.get(key, default)\` returns your fallback.
- \`d.items()\` is the loop idiom: \`for k, v in d.items():\` — both halves at once.
- Keys must be hashable (strings, numbers, tuples). Values can be anything.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: '.get and .items — the two idioms',
      code: `stock = {'apple': 3, 'mango': 0}
print(stock['apple'])         # 3 -- O(1) jump by key
print(stock.get('kiwi'))      # None -- missing key, no crash
print(stock.get('kiwi', 0))   # 0 -- with a default
stock['kiwi'] = 5             # insert (or overwrite if the key exists)
for fruit, qty in stock.items():
    print(fruit, qty)         # .items() yields (key, value) pairs`,
      annotations: {
        3: "stock['kiwi'] here would raise KeyError. .get is the safe read for maybe-missing keys.",
        6: 'THE way to loop over both halves. .keys() / .values() when you only need one side.',
      },
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `n = 1_000_000
big_list = list(range(n))
big_set = set(big_list)

def list_in_steps(lst, x):
    steps = 0
    for item in lst:
        steps += 1
        if item == x:
            break
    return steps

for target in (0, 500_000, 999_999):
    print(f'find {target:>7}: list walks {list_in_steps(big_list, target):>9,} items')

print('set lookup: hash once, jump straight to the answer')
print('all found:', 0 in big_set, 500_000 in big_set, 999_999 in big_set)`,
        precomputedOutput: `find       0: list walks         1 items
find  500000: list walks   500,001 items
find  999999: list walks 1,000,000 items
set lookup: hash once, jump straight to the answer
all found: True True True`,
        caption:
          'The interview point, made visible: "x in list" walks up to a MILLION items; "x in set" hashes once and jumps — same cost wherever the item hides.',
      },
    },
    {
      type: 'intuition',
      title: 'When to use which — the 10-second decision',
      md: `This is the part interviewers actually grade. Ask three questions, in order:

1. Looking things up **by a name/id**? → **dict**.
2. Only care about **uniqueness** or fast **"is it there?"** checks? → **set**.
3. Need **order** and you will **add/remove/edit**? → **list**.
- Fixed few-field record that never changes — maybe used as a dict key? → **tuple**.
- The killer line: membership on a **list is O(n) per check**; on a **set/dict it is O(1)**. A membership test *inside a loop* over n items turns a list into O(n²) — that is the difference between 1 second and 3 hours at a million items.`,
    },
    {
      type: 'note',
      md: 'Say it out loud in interviews, exactly like this: **"I\'ll keep a set of seen ids — checking a list would be O(n) per lookup, and inside this loop that becomes O(n²)."** That one sentence signals more Python maturity than any syntax trick.',
    },
    {
      type: 'intuition',
      title: 'Slicing — one syntax, every sequence',
      md: `\`a[start:stop:step]\` cuts a copy out of any sequence — list, string, tuple.

- **stop is excluded**: \`a[2:5]\` gives indexes 2, 3, 4. Length of a slice = stop − start.
- Leave parts empty for "from the start" / "to the end": \`a[:3]\`, \`a[3:]\`.
- **Negative index = count from the end**: \`a[-1]\` is the last item, \`a[-2:]\` the last two.
- \`a[::2]\` — every 2nd item. \`a[::-1]\` — step backwards through everything: a **reversed copy**, the most famous slice in Python.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Slices, negative indices, and [::-1]',
      code: `a = [0, 1, 2, 3, 4, 5]
print(a[2:5])       # [2, 3, 4] -- start included, stop EXCLUDED
print(a[:3])        # [0, 1, 2] -- from the start
print(a[-2:])       # [4, 5] -- negative = count from the end
print(a[::2])       # [0, 2, 4] -- step of 2
print(a[::-1])      # [5, 4, 3, 2, 1, 0] -- reversed COPY of the whole thing
print('hello'[-1], 'hello'[::-1])   # o olleh -- same rules on strings`,
      annotations: {
        2: 'Stop excluded means a[2:5] has 5 - 2 = 3 items. That subtraction is the mental check.',
        6: '[::-1] builds a NEW list: O(n) time and memory. reversed(a) iterates lazily if you only loop once.',
        7: 'Strings are sequences too — index, slice, reverse, all identical rules.',
      },
    },
    {
      type: 'intuition',
      title: 'Comprehensions — a loop folded into one line',
      md: `A comprehension is a loop whose only job is to **produce a collection**, compressed to one line. The brackets tell you what comes out:

- \`[x * x for x in nums]\` → **list**
- \`{w: len(w) for w in words}\` → **dict** (key: value before the for)
- \`{w.lower() for w in words}\` → **set** (no colon — dedupes as it builds)
- Add a filter at the end: \`[x for x in nums if x > 0]\`.
- Reads as English: "a list of x squared, for each x in nums, if x is positive."
- If the loop has side effects (printing, appending to two places) — it is not a comprehension job. Write the loop.`,
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `words = ['spam', 'eggs', 'spam', 'ham', 'spam']

squares = [x * x for x in range(6)]
evens = [x for x in range(10) if x % 2 == 0]
lengths = {w: len(w) for w in words}
unique = {w for w in words}
counts = {w: words.count(w) for w in sorted(set(words))}

print('squares:', squares)
print('evens:  ', evens)
print('lengths:', lengths)
print('unique: ', sorted(unique))
print('counts: ', counts)

s = 'interview'
print(s[0], s[-1], s[2:5], s[::-1])
nums = [10, 20, 30, 40, 50]
print(nums[1:4], nums[-2:], nums[::2], nums[::-1])`,
        precomputedOutput: `squares: [0, 1, 4, 9, 16, 25]
evens:   [0, 2, 4, 6, 8]
lengths: {'spam': 4, 'eggs': 4, 'ham': 3}
unique:  ['eggs', 'ham', 'spam']
counts:  {'eggs': 1, 'ham': 1, 'spam': 3}
i w ter weivretni
[20, 30, 40] [40, 50] [10, 30, 50] [50, 40, 30, 20, 10]`,
        caption:
          'The gallery: all three comprehension types plus every slicing move from this module. Change a filter or a step and rerun.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Nested comprehensions — where to stop',
      code: `matrix = [[1, 2, 3], [4, 5, 6]]
flat = [x for row in matrix for x in row]
print(flat)         # [1, 2, 3, 4, 5, 6]

# past this point, comprehension stops being clever and starts being hostile:
pairs = [(i, j) for i in range(3) if i != 1 for j in range(3) if j > i if i + j < 3]
# same logic as plain nested loops -- in an interview, WRITE THE LOOPS`,
      annotations: {
        2: "'for row ... for x' reads left to right, exactly like the nested for-loops it replaces.",
        6: 'Three clauses deep = unreadable. Rule: two clauses max, no nested conditions.',
      },
    },
    {
      type: 'note',
      md: 'Readability warning, worth stating in interviews: a comprehension is for a **simple map/filter**. The moment it needs two loops *plus* conditions, the plain loop is faster to read, easier to debug, and scores better with reviewers. Compressing logic is not the goal — producing a collection clearly is.',
    },
  ],
  quiz: [
    {
      question: 'You check `user_id in collection` millions of times against 1M ids. Best structure?',
      options: [
        { text: 'list — it keeps them in order', explanation: 'Order is irrelevant here, and each list check scans up to 1M items: O(n) per check.' },
        { text: 'set — membership is O(1)', explanation: 'Correct. The set hashes the id and jumps: same cost at any size. Millions of checks stay cheap.' },
        { text: 'tuple — it is faster because immutable', explanation: 'Immutability does not speed up membership — a tuple still scans like a list: O(n).' },
        { text: 'str — join ids into one string and use `in`', explanation: 'Substring search is O(n) and buggy: "12" in "5123" is True. Wrong tool entirely.' },
      ],
      correct: 1,
    },
    {
      question: 'Why can a tuple be a dict key while a list cannot?',
      options: [
        { text: 'Tuples are smaller in memory', explanation: 'Memory size is irrelevant — the dict cares about hashability, not bytes.' },
        { text: 'Tuples are immutable, so their hash stays valid — lists could mutate and their hash would go stale', explanation: 'Correct. Dicts file entries under hash(key). A key that can change would be filed under a lie, so Python only allows hashable (immutable) keys.' },
        { text: 'Lists can be dict keys — you just need to convert them first', explanation: 'Converting to a tuple IS the fix, but that proves the point: the list itself is refused (TypeError: unhashable).' },
      ],
      correct: 1,
    },
    {
      question: "s = 'hi'; s.upper(); print(s) — what prints?",
      options: [
        { text: "'HI'", explanation: 'Only if you had written s = s.upper(). Methods return a new string; they never edit s.' },
        { text: "'hi'", explanation: 'Correct. Strings are immutable — s.upper() built a new string that was thrown away unassigned.' },
        { text: 'An error — strings have no upper method', explanation: '.upper() exists and runs fine; its return value was simply discarded.' },
      ],
      correct: 1,
    },
    {
      question: 'nums = [1, 2, 3, 4]. What is nums[::-1]?',
      options: [
        { text: '[4, 3, 2, 1] — a new reversed list; nums is unchanged', explanation: 'Correct. Step −1 walks backwards and a slice always builds a copy. nums itself stays [1, 2, 3, 4].' },
        { text: '[4, 3, 2, 1] — and nums is now reversed too', explanation: 'Slicing never mutates. In-place reversal is nums.reverse(), a different thing.' },
        { text: '[1, 2, 3] — it drops the last element', explanation: 'That would be nums[:-1] (stop at −1). [::-1] is a step of −1: walk the whole list backwards.' },
      ],
      correct: 0,
    },
    {
      question: "d = {'a': 1}. Compare d['b'] and d.get('b').",
      options: [
        { text: 'Both return None', explanation: "d['b'] does not return — it raises KeyError. Only .get returns None." },
        { text: "d['b'] raises KeyError; d.get('b') returns None", explanation: "Correct. And d.get('b', 0) returns your chosen default — the safe read for maybe-missing keys." },
        { text: 'Both raise KeyError', explanation: '.get never raises for a missing key — returning None (or a default) is its entire purpose.' },
      ],
      correct: 1,
    },
    {
      question: 'What does [x * x for x in range(5) if x % 2 == 1] produce?',
      options: [
        { text: '[1, 9]', explanation: 'Correct. The filter keeps odd x (1 and 3), then squares them: 1, 9.' },
        { text: '[0, 1, 4, 9, 16]', explanation: 'That ignores the filter — the if clause drops even x before squaring.' },
        { text: '[1, 3]', explanation: 'Those are the surviving x values, but the expression is x * x — they get squared on the way out.' },
      ],
      correct: 0,
    },
    {
      question: 'Why is list.pop() O(1) but list.pop(0) O(n)?',
      options: [
        { text: 'pop(0) must search for the value 0 first', explanation: 'pop(0) takes an INDEX, not a value — no searching involved.' },
        { text: 'Removing the front forces every remaining item to shift one slot left', explanation: 'Correct. A list is a contiguous array: the end pops free, the front leaves a hole that n−1 items must fill. (Need cheap pops at both ends? That is collections.deque.)' },
        { text: 'It is not — both are O(1)', explanation: 'The shift is real and interviewers probe it: draining a list with pop(0) in a loop is a hidden O(n²).' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Prod bug: a dedupe job on 2M events ran in seconds last month, now it takes hours. The code keeps `seen = []` and does `if event_id not in seen: seen.append(event_id)`. Walk me through it.',
      answer:
        'The membership check is the whole story: `not in` on a **list** scans linearly — O(n) per check — and it runs once per event, so the job is O(n²). At 2M events that is ~2×10¹² comparisons; last month\'s smaller volume hid it. Fix: `seen = set()` and `seen.add(event_id)` — O(1) membership makes the job O(n) total. Tradeoffs to name: the set costs extra memory (hash table overhead) and loses insertion order — if output order matters, keep the set for checking and a list for output, or use `dict.fromkeys(ids)` which dedupes while preserving order. Close with the diagnosis pattern: *"worked at small n, dies at big n" almost always means an accidental O(n²) — look for list membership or string += inside a loop*.',
      isCaseBased: true,
    },
    {
      question: "Debugging: a teammate's cache maps grid coordinates to results with `cache[[row, col]] = value` and gets `TypeError: unhashable type: 'list'`. Explain the error and fix it.",
      answer:
        'Dict keys are filed under their hash, and the hash must stay valid for the key\'s lifetime. A list is mutable — it could change after being filed, making its hash a lie — so Python refuses lists as keys up front. Fix: use a tuple, `cache[(row, col)] = value` — immutable, hashable, and it reads as the fixed record it is. Same rule explains set members. Tradeoff worth naming: if the coordinate genuinely needs to mutate, it was never a valid key — you would delete and re-insert under the new key. Bonus point: any nested value inside the tuple must also be hashable — `((1, 2), "a")` works, `([1, 2], "a")` fails for the same reason.',
      isCaseBased: true,
    },
    {
      question: 'List vs tuple — when do you actually choose the tuple? Name the tradeoffs.',
      answer:
        'Tuple when the data is a **fixed record**: coordinates, an (r, g, b) color, a function returning multiple values, a dict key. List when it is a **collection that grows or changes**: search results, a queue of tasks. Tradeoffs: tuples are hashable (dict keys, set members — lists cannot), slightly smaller and faster to create, and immutability documents intent — a reader knows nobody appends to it. Lists buy mutation: append/pop/sort in place. The smell test: if the elements are *different kinds of things by position* (name, age), tuple; if they are *many of the same kind of thing* (many names), list.',
      isCaseBased: false,
    },
    {
      question: "Why is `''.join(parts)` preferred over `result += part` in a loop, and what is the complexity of each?",
      answer:
        'Strings are immutable, so `result += part` cannot extend in place — it allocates a brand-new string and copies everything so far, every iteration. Total copying: 1 + 2 + … + n ≈ O(n²). `join` first measures all pieces, allocates once, and copies each character exactly once: O(n). Nuance worth naming: CPython has an optimization that sometimes makes += behave better, but it is implementation-specific and vanishes with multiple references — never rely on it. The idiom: accumulate in a list (append is O(1)), join once at the end.',
      isCaseBased: false,
    },
    {
      question: "Three ways to read a maybe-missing dict key: d[k], d.get(k, default), and d.setdefault / collections.defaultdict. When is each right?",
      answer:
        '`d[k]` when the key SHOULD exist — the KeyError is a feature: it crashes loudly at the bug instead of quietly propagating None. `d.get(k, default)` for a read-only lookup with a sensible fallback — missing is a normal case, and the dict is not modified. `setdefault(k, [])` / `defaultdict(list)` when you also want to WRITE: grouping items into buckets (`d.setdefault(key, []).append(x)`). Tradeoffs: get with a default can mask genuine bugs (typo\'d key silently returns the fallback); defaultdict creates entries on mere reads too, which can bloat the dict and surprise `in` checks. Rule: crash-loud for invariants, get for optional reads, defaultdict for accumulation.',
      isCaseBased: false,
    },
    {
      question: 'Count word frequencies in a document. Which structure, what complexity, and what does your loop look like?',
      answer:
        'A dict, word → count: one pass, `counts[w] = counts.get(w, 0) + 1` — each lookup and insert is O(1), so O(n) total for n words. Interview polish: `collections.Counter(words)` does exactly this and adds `.most_common(k)`. Name the alternatives to show judgment: a list of (word, count) pairs would make each update O(n) → O(n²) overall; sorting the words first then counting runs is O(n log n) and only worth it if you need sorted output anyway. If asked for top-k, mention Counter.most_common uses a heap-style selection rather than a full sort.',
      isCaseBased: false,
    },
    {
      question: 'You claim set membership is O(1). Defend that — how does it work, and when is it NOT O(1)?',
      answer:
        'A set is a hash table: `hash(x)` maps the element to a bucket index, so membership jumps straight to the candidate slot — no scan, average O(1). The honest caveats: (1) worst case is O(n) when many elements collide into the same buckets — pathological or adversarial hashes (Python randomizes string hashing per process partly to blunt crafted-collision attacks); (2) hashing large objects (a huge tuple) costs O(size of object) per lookup; (3) constants: for a handful of items a list scan can beat the hash machinery. And two functional prices: elements must be hashable, and you surrender order. Average O(1), amortized across resizes, is the claim to make precisely.',
      isCaseBased: false,
    },
    {
      question: 'What is the difference between a[::-1] and reversed(a)? When does it matter?',
      answer:
        '`a[::-1]` builds a full reversed **copy**: O(n) time and O(n) extra memory, available immediately as a real list (or string). `reversed(a)` returns a lazy **iterator**: O(1) to create, items produced on demand, no copy — but single-use and not indexable. Matters when: iterating once over something large → reversed (no memory bill); needing a reversed string → `s[::-1]` (reversed gives an iterator you would have to join anyway); needing to keep both orders or index into the result → the slice. In-place `a.reverse()` is the third option: O(1) memory but destroys the original order.',
      isCaseBased: false,
    },
    {
      question: 'When is a plain list actually the better membership structure than a set? Give real cases.',
      answer:
        'Three honest cases: (1) **tiny n** — under a few dozen items, a linear scan is competitive or faster than hashing overhead, and the code is simpler; (2) **unhashable elements** — a collection of lists or dicts cannot go in a set at all; (3) **order and duplicates are the data** — a set silently destroys both; if you need "how many times" or "in what sequence", the list IS the answer, not a compromise. Also: one-shot membership on data you already hold as a list — building a set first costs O(n) anyway, so a single `in` check gains nothing. The set wins specifically for *repeated* membership tests on hashable items.',
      isCaseBased: false,
    },
    {
      question: 'Flatten [[1, 2], [3, 4]] with a comprehension — then tell me when you would refuse to use a comprehension at all.',
      answer:
        "`flat = [x for row in matrix for x in row]` — the clauses read left to right exactly like the nested loops. Refuse when: (1) three or more for/if clauses — the line becomes write-only; (2) side effects — printing, writing to two structures, network calls: a comprehension's contract is 'build one collection', nothing else; (3) complex per-item logic needing try/except or intermediate variables. The tradeoff to name: comprehensions are faster (the loop runs in C) and signal intent, but readability is the currency of interviews and code review — a plain loop that a reviewer parses in five seconds beats a clever one-liner they re-read three times.",
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'The big four, one line each', back: 'list: ordered + mutable. tuple: fixed record, hashable. set: unique + O(1) membership. dict: key → value, O(1) lookup.' },
    { front: 'Membership cost: list vs set/dict', back: 'list: O(n) scan per check. set/dict: O(1) hash jump. In a loop, the list version becomes O(n²).' },
    { front: 'Hashable — definition + why tuples qualify', back: 'Has a hash value that never changes over its lifetime. Immutable types (str, int, tuple) qualify → usable as dict keys / set members. Lists do not.' },
    { front: 'String immutability consequence', back: 'No method edits a string — all return a new one. s.upper() alone does nothing; write s = s.upper().' },
    { front: "d[k] vs d.get(k, default)", back: 'd[k]: KeyError if missing (crash-loud). d.get(k, default): returns default (None if omitted), never raises, never modifies.' },
    { front: 'a[::-1]', back: 'Reversed COPY of any sequence (list, str, tuple). O(n) time and memory. reversed(a) = lazy iterator, no copy.' },
    { front: 'Slice rule a[start:stop:step]', back: 'start included, stop EXCLUDED (length = stop − start). Negative index counts from the end: a[-1] is last.' },
    { front: 'append/pop() vs insert(0,·)/pop(0)', back: 'End operations: O(1). Front operations: O(n) — every item shifts. Need both ends cheap → collections.deque.' },
    { front: 'Comprehension skeletons', back: '[f(x) for x in xs if c] → list. {k: v for …} → dict. {f(x) for …} → set. Max two clauses, no side effects.' },
    { front: 'sort() vs sorted()', back: 'a.sort(): in place, returns None. sorted(a): new list, original untouched. Works on any iterable.' },
  ],
  mindmapMarkdown: `- The Big Four Collections
  - str
    - immutable — methods return new
    - split / join / strip / replace
    - += in loop O(n²) → ''.join
  - list
    - ordered, mutable, duplicates
    - append/pop() O(1); pop(0) O(n)
    - sort() in place vs sorted() copy
    - x in list: O(n)
  - tuple
    - fixed record, position = meaning
    - immutable → hashable → dict key
    - unpacking: a, b = t
  - set
    - uniqueness automatic
    - x in set: O(1) hash jump
    - no order, hashable members only
  - dict
    - key → value, O(1) lookup
    - .get(k, default) vs KeyError
    - .items() loop idiom
  - Choosing
    - lookup by id → dict
    - uniqueness / membership → set
    - order + mutation → list
    - fixed record → tuple
    - list-in-loop membership = O(n²) trap
  - Comprehensions
    - [ ] list, { : } dict, { } set
    - if filter at the end
    - 3+ clauses → write the loop
  - Slicing
    - stop excluded; negatives from end
    - a[::2] step, a[::-1] reversed copy`,
}

export default m
