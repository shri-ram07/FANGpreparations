import type { Module } from '../types'

const m: Module = {
  id: 'py-l3-typing-dataclasses',
  subjectId: 'python',
  level: 3,
  title: 'Type Hints & Dataclasses',
  whyItMatters:
    'FAANG interviewers read your Python like a code review. Untyped functions and bare dicts passed around scream "junior". Hints plus dataclasses are the cheapest way to make code look — and be — production-grade, and "why is this a dict and not a dataclass?" is a real interview question.',
  estMinutes: 40,
  sections: [
    {
      type: 'intuition',
      title: 'Type hints are labels, not laws',
      md: `A jar labeled "sugar" can hold salt. The label helps the *reader* — the jar never checks.

- A **type hint** is a label on a variable, parameter, or return value: \`age: int\`.
- The #1 misconception: *hints are NOT enforced at runtime*. Python ignores them while running.
- Pass a string where the hint says \`int\` — no error, no warning. The code just runs.
- So who reads the labels? **You, your editor, and a checker tool** — before the code ever runs.
- Python stays dynamically typed. Hints add a documentation layer that machines can verify.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Proof: Python never checks the labels',
      code: `def add(a: int, b: int) -> int:
    return a + b

print(add('ab', 'cd'))        # no error — prints 'abcd'
age: int = 'twenty nine'      # wrong label, runs anyway
print(add.__annotations__)    # the hints, just sitting in a dict`,
      annotations: {
        4: 'Strings passed where ints were promised. Python runs it happily — hints are invisible at runtime.',
        5: 'A variable annotation is metadata too. No check, ever.',
        6: 'Hints are stored in __annotations__: {\'a\': int, \'b\': int, \'return\': int}. Tools read this; the interpreter does not act on it.',
      },
    },
    {
      type: 'note',
      md: 'One-line definitions: an **annotation** is the hint text itself (stored in `__annotations__`, never executed as a check). **mypy** is the standard external tool that reads annotations and reports type errors *before you run* — like a spell-checker for types.',
    },
    {
      type: 'intuition',
      title: 'The syntax you will actually write',
      md: `Three places to hang a label, one pattern each:

- Parameters: \`def greet(name: str)\` — after the name, before any default.
- Returns: \`def greet(name: str) -> str\` — the arrow says what comes back.
- Variables: \`total: float = 0.0\` — rarely needed; editors infer most of these.
- Containers take **generics** — the type *inside* the brackets: \`list[int]\` is "a list of ints", \`dict[str, float]\` is "str keys, float values".
- Generic just means "a type with a slot for another type". Read it left to right, outside in.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Params, returns, generics, and "maybe None"',
      code: `def top_scores(scores: dict[str, float], limit: int = 3) -> list[str]:
    ranked = sorted(scores, key=lambda name: scores[name], reverse=True)
    return ranked[:limit]

def find_user(user_id: int) -> str | None:
    users: dict[int, str] = {1: 'asha', 2: 'ravi'}
    return users.get(user_id)     # a miss returns None — the hint admits it`,
      annotations: {
        1: 'Read it aloud: takes a dict of str-to-float and an int (default 3), returns a list of str. The signature IS the documentation.',
        5: 'str | None — "a str, or nothing". The modern (3.10+) spelling of Optional[str].',
        7: '.get() returns None on a miss. Because the hint says so, every caller is warned to handle the None case — this kills a whole class of production crashes.',
      },
    },
    {
      type: 'note',
      md: `Same meaning, three spellings — write the modern one:

- \`str | None\` (Python 3.10+) = \`Optional[str]\` = \`Union[str, None]\`. **Optional means "or None"** — not "optional argument".
- \`int | str\` (3.10+) = \`Union[int, str]\` — a value that can be either type.
- \`list[int]\`, \`dict[str, float]\` (3.9+) replaced \`List[int]\`, \`Dict[str, float]\` from the \`typing\` module.
- You will still see the old spellings in codebases and interviews — recognize both, write the new.`,
    },
    {
      type: 'intuition',
      title: 'When hints pay off — and when to skip them',
      md: `Hints cost keystrokes. Here is what they buy:

- **Editors:** \`user.\` autocompletes correctly only when the editor knows \`user\` is a \`User\`. Hints power every good suggestion you get.
- **mypy:** catches "this can be None and you never checked" *before* production does.
- **Refactoring:** rename a field or change a return type — the checker lists every broken call site. Untyped code makes you find them by crashing.
- Payoff scales with code size and team size. A 20-line throwaway script? Skip them.
- Interview one-liner: *hints move a class of runtime crashes to before-you-run — for free at runtime, since Python ignores them.*`,
    },
    {
      type: 'intuition',
      title: 'Structural typing: it is the shape that matters',
      md: `Duck typing (recap): if it walks like a duck and quacks like a duck, Python treats it as a duck — no family tree required. Two typing tools bottle exactly that:

- **TypedDict** — a label for a *dict with a known shape*: these keys, these value types. Perfect for JSON at API boundaries, where data really is a dict.
- **Protocol** — a label for *any object with these methods*. No inheritance, no registration: match the shape and you fit.
- This is **structural typing** — membership by shape — versus nominal typing (membership by inheritance, like a normal base class).
- One taste of each below. Deep dives can wait; recognizing them cannot.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'TypedDict and Protocol, one taste each',
      code: `from typing import TypedDict, Protocol

class MovieRow(TypedDict):
    title: str
    year: int

def describe(row: MovieRow) -> str:
    return f"{row['title']} ({row['year']})"

class Closable(Protocol):
    def close(self) -> None: ...

def shutdown(resource: Closable) -> None:
    resource.close()`,
      annotations: {
        3: 'MovieRow is still a plain dict at runtime — this only tells the checker which keys and value types exist. Typo row[\'yaer\'] and mypy flags it.',
        10: 'A Protocol lists required methods. Any object that HAS close() fits — file, socket, DB connection — with zero inheritance.',
        13: 'shutdown() accepts by shape, not by ancestry. That is structural typing in one line.',
      },
    },
    {
      type: 'intuition',
      title: 'Dataclasses: the boilerplate robot',
      md: `Every data-holding class needs the same three dunders, and you have written them a hundred times:

- \`__init__\` to store the fields, \`__repr__\` to print readably, \`__eq__\` to compare by value.
- \`@dataclass\` is a decorator (recap: a function that rewrites your class) that **writes all three for you** from the field hints.
- You declare *what the class holds*; the robot writes *how*.
- This is also where type hints become load-bearing: the decorator finds fields BY their annotations. No hint, no field.
- Less code you write = less code with bugs in it.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Sixteen lines become four',
      code: `from dataclasses import dataclass

class PointOld:                    # life without dataclasses
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f'PointOld(x={self.x}, y={self.y})'

    def __eq__(self, other):
        return (self.x, self.y) == (other.x, other.y)

@dataclass
class Point:                       # the same class
    x: float
    y: float`,
      annotations: {
        11: 'Hand-written __eq__ is where bugs hide: forget it and == silently compares object identity, so two equal points are "not equal".',
        14: 'The decorator reads the annotated fields below and generates __init__, __repr__, and __eq__.',
        16: 'Field order = __init__ parameter order. The type hints are mandatory here — they are how @dataclass finds the fields.',
      },
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `from dataclasses import dataclass, field

@dataclass
class Order:
    order_id: int
    customer: str
    items: list[str] = field(default_factory=list)

a = Order(1, 'Asha')
b = Order(1, 'Asha')

print(a)                     # __repr__ written for you
print(a == b)                # __eq__ compares field values
print(a.items is b.items)    # each instance got its OWN list

a.items.append('mouse')
print(a)
print(b)                     # b untouched — no shared default
print(a == b)                # values differ now`,
        precomputedOutput: `Order(order_id=1, customer='Asha', items=[])
True
False
Order(order_id=1, customer='Asha', items=['mouse'])
Order(order_id=1, customer='Asha', items=[])
False`,
        caption:
          'Free __repr__, free value-based __eq__, and default_factory giving every instance its own fresh list.',
      },
    },
    {
      type: 'note',
      md: `Remember the L1 mutable-default trap? \`def f(x, acc=[])\` builds ONE list at definition time, silently shared by every call. Dataclasses meet the same trap and handle it better:

- \`items: list[str] = []\` inside a \`@dataclass\` raises **ValueError at class definition** — Python refuses the shared-list foot-gun outright.
- The fix: \`field(default_factory=list)\` — store a *recipe* ("call \`list()\`"), not a value. Each instance runs the recipe and gets a fresh list.
- Same rule for any mutable default: \`field(default_factory=dict)\`, \`field(default_factory=set)\`.`,
    },
    {
      type: 'intuition',
      title: 'frozen=True and __post_init__: locks and bouncers',
      md: `Two upgrades you reach for constantly:

- \`@dataclass(frozen=True)\` **locks instances after construction** — any later assignment raises. Config objects, money amounts, cache keys: things that must not drift.
- Frozen instances get \`__hash__\` for free, so they work as dict keys and set members. Regular dataclasses are unhashable (mutable things make unsafe keys).
- The lock is **shallow**: a frozen dataclass holding a list cannot be re-pointed at a new list, but the list itself can still be mutated.
- \`__post_init__\` is the bouncer: a method that runs right after the generated \`__init__\`, made for validation — reject bad values at the door instead of discovering them three layers deep.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'A frozen, self-validating Price',
      code: `from dataclasses import dataclass

@dataclass(frozen=True)
class Price:
    amount: float
    currency: str = 'INR'

    def __post_init__(self):
        if self.amount < 0:
            raise ValueError('price cannot be negative')

p = Price(499.0)
# p.amount = 0   -> dataclasses.FrozenInstanceError
# Price(-5)      -> ValueError: price cannot be negative
print(hash(p) == hash(Price(499.0)))   # True`,
      annotations: {
        3: 'frozen=True: assignment after construction raises FrozenInstanceError. Reading fields is of course fine.',
        8: '__post_init__ runs immediately after the generated __init__ — the official hook for validation, so you never hand-write __init__ just to add a check.',
        15: 'frozen (with eq) generates __hash__ — a Price can now be a dict key or live in a set.',
      },
    },
    {
      type: 'intuition',
      title: 'Why not just a dict or a tuple?',
      md: `You can carry a user as \`('asha', 29)\` or \`{'name': 'asha', 'age': 29}\`. Here is what that costs:

- **Tuple:** \`user[1]\` — what is index 1? Unnamed fields mean every reader re-derives the meaning. Insert a field and every index shifts.
- **Dict:** \`user['nmae']\` returns a KeyError *at runtime, on the unlucky path*. No autocomplete, no checker help, any key can appear.
- **Dataclass:** \`user.name\` — **named** (self-documenting), **typed** (mypy and your editor see every field), **comparable** (\`==\` by value, for free).
- Rule of thumb: data crossing a boundary as real JSON → dict (label it with TypedDict). Data *your code owns* → dataclass.`,
    },
  ],
  quiz: [
    {
      question: 'def add(a: int, b: int) -> int — what happens when you call add(\'ab\', \'cd\')?',
      options: [
        {
          text: 'TypeError at the call',
          explanation: 'This is the #1 misconception. Python never checks hints at runtime — no error is raised.',
        },
        {
          text: 'It runs and returns \'abcd\'',
          explanation: 'Correct. Hints are metadata for tools and readers; the interpreter ignores them completely.',
        },
        {
          text: 'SyntaxError when the file loads',
          explanation: 'The syntax is perfectly legal — annotations parse fine; they just are not enforced.',
        },
        {
          text: 'A warning is printed',
          explanation: 'Not even a warning. Only an external checker like mypy would complain — before running, not during.',
        },
      ],
      correct: 1,
    },
    {
      question: 'The modern (3.10+) way to hint "a str, or None"?',
      options: [
        {
          text: 'str | None',
          explanation: 'Correct. It means exactly Optional[str] and Union[str, None] — same meaning, current spelling.',
        },
        {
          text: 'str or None',
          explanation: 'That is the runtime `or` operator — it evaluates to just str here, not a type union.',
        },
        {
          text: 'Maybe[str]',
          explanation: 'Maybe is from other languages (Haskell). Python spells it Optional[str] or str | None.',
        },
        {
          text: 'nullable str',
          explanation: 'Not Python syntax — that is closer to SQL or C# vocabulary.',
        },
      ],
      correct: 0,
    },
    {
      question: 'dict[str, float] describes…',
      options: [
        {
          text: 'A dict whose keys are str and values are float',
          explanation: 'Correct. Generics read outside-in, left to right: key type first, value type second.',
        },
        {
          text: 'A dict that can hold either str or float',
          explanation: 'That would be dict[str | float, ...] or a value-type union — the two slots are key type and value type, not alternatives.',
        },
        {
          text: 'A dict with exactly two entries',
          explanation: 'Generics say nothing about size — only about the types inside.',
        },
      ],
      correct: 0,
    },
    {
      question: 'Inside a @dataclass you write items: list[str] = []. What happens?',
      options: [
        {
          text: 'Every instance silently shares one list',
          explanation: 'That is what a plain function default would do — dataclasses specifically refuse to let this happen.',
        },
        {
          text: 'ValueError the moment the class is defined',
          explanation: 'Correct. Dataclasses reject mutable defaults outright at class-definition time. The fix is field(default_factory=list).',
        },
        {
          text: 'It works: each instance gets a fresh list',
          explanation: 'A fresh list per instance is what field(default_factory=list) gives you — the bare [] is refused before any instance exists.',
        },
      ],
      correct: 1,
    },
    {
      question: 'By default, @dataclass generates which methods?',
      options: [
        {
          text: '__init__, __repr__, __eq__',
          explanation: 'Correct. Store the fields, print readably, compare by value — the three every data class needs.',
        },
        {
          text: '__init__ only',
          explanation: 'It also writes __repr__ and __eq__ — that is most of its value over hand-rolling.',
        },
        {
          text: '__init__, __repr__, __eq__, __hash__',
          explanation: '__hash__ is NOT generated by default — a mutable object is an unsafe dict key. frozen=True adds it.',
        },
        {
          text: 'All dunder methods',
          explanation: 'Only the data-holding trio by default; things like __lt__ need order=True, __hash__ needs frozen=True.',
        },
      ],
      correct: 0,
    },
    {
      question: 'What does frozen=True buy you — and what is its limit?',
      options: [
        {
          text: 'Assignment after construction raises, and instances become hashable — but the freeze is shallow',
          explanation: 'Correct on all three counts. A frozen dataclass holding a list still has a mutable list inside.',
        },
        {
          text: 'Deep immutability of everything the instance holds',
          explanation: 'The freeze is shallow: you cannot re-point a field, but a mutable value behind it can still change.',
        },
        {
          text: 'It only makes the class faster',
          explanation: 'Not a performance feature — it is about preventing mutation and enabling hashing.',
        },
      ],
      correct: 0,
    },
    {
      question: 'A class matches a Protocol when it…',
      options: [
        {
          text: 'has the methods the Protocol declares — no inheritance needed',
          explanation: 'Correct. That is structural typing: membership by shape, exactly duck typing made checkable.',
        },
        {
          text: 'inherits from the Protocol class',
          explanation: 'Inheritance is the nominal-typing route (ABCs). Protocols deliberately do not require it.',
        },
        {
          text: 'is registered with @Protocol.register',
          explanation: 'No registration step exists for matching a Protocol — the shape alone decides.',
        },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Python is dynamically typed — so what do type hints actually do, and what do they NOT do?',
      answer:
        'They do NOT change runtime behavior: the interpreter stores them in `__annotations__` and never checks them — wrong types pass straight through. What they DO: feed editors (accurate autocomplete, inline errors), feed checkers like mypy (type errors caught before running), and document intent in the signature itself. Tradeoff to name: zero runtime cost and zero runtime protection — if you need values validated at runtime (user input, API payloads), hints alone are not validation; you need explicit checks or a library like pydantic.',
      isCaseBased: false,
    },
    {
      question: 'Prod bug: `AttributeError: \'NoneType\' object has no attribute \'email\'` at 2am, from code calling get_user(id).email. The function is hinted `-> User`. Walk me through it.',
      answer:
        'The hint is lying: somewhere get_user returns None (a miss path, a DB timeout branch) while promising User. Steps: (1) reproduce — find the input where the miss path fires; (2) fix the *hint* to `-> User | None` so the signature tells the truth; (3) run mypy — it now flags EVERY call site that touches `.email` without a None check, which is the complete blast radius, found without grepping; (4) decide per call site: handle None, or raise early in get_user (`-> User`, raises NotFound) so callers cannot forget. Name the tradeoff: return-None APIs push handling to every caller; raise-early APIs centralize it. The meta-lesson interviewers want: an honest Optional hint plus a checker turns a 2am crash into a pre-commit error.',
      isCaseBased: true,
    },
    {
      question: 'When would you carry data as a dataclass vs a plain dict vs a tuple? Name the tradeoffs.',
      answer:
        'Dataclass: named fields (self-documenting), typed (checker + autocomplete see every field), comparable by value for free — the default for data your code owns. Dict: right at JSON/API boundaries where the data genuinely IS a dict — but keys are unchecked strings (typos become runtime KeyErrors), so label the shape with TypedDict. Tuple: cheapest and immutable, fine for tiny local pairs, but positional — `row[2]` documents nothing and inserting a field shifts every index. Honest cost of dataclass: a definition to write and import, and slight overhead versus a raw tuple. Rule: boundary data → dict + TypedDict; owned domain data → dataclass; two-element throwaway → tuple.',
      isCaseBased: false,
    },
    {
      question: 'Why does @dataclass raise ValueError for `items: list = []` when plain function defaults silently share a list? Explain both behaviors.',
      answer:
        'Both come from the same fact: defaults are evaluated ONCE, at definition time. In `def f(x, acc=[])`, that one list object becomes the default and every call without the argument shares it — the classic mutable-default trap, a silent bug. Dataclasses hit the identical situation (a class-level default would be shared by all instances) but choose to fail loudly at class definition instead of letting the sharing happen. The escape hatch is `field(default_factory=list)`: store a zero-argument callable, run it per instance, fresh list each time. Good design point to name: the dataclass behavior is the better API — it converts a heisenbug into an immediate, obvious error.',
      isCaseBased: false,
    },
    {
      question: 'What does frozen=True actually guarantee — and where does that guarantee stop?',
      answer:
        'Guarantees: any attribute assignment after __init__ raises FrozenInstanceError, and (with eq, the default) the class gets __hash__ — instances become valid dict keys and set members. Stops: the freeze is SHALLOW. `@dataclass(frozen=True)` holding `tags: list[str]` cannot be re-pointed at a new list, but `p.tags.append(...)` still mutates it — and mutating a hashed object corrupts its use as a key. Fix: use immutable field types (tuple over list) inside frozen classes. Also honest: frozen costs a little (object.__setattr__ indirection in __init__) and makes evolving an instance clumsier — you create modified copies (dataclasses.replace) instead of mutating.',
      isCaseBased: false,
    },
    {
      question: 'Protocol vs ABC — both define an interface. When do you reach for which?',
      answer:
        'ABC is nominal: implementers must inherit from it, which you control only for YOUR classes. Protocol is structural: anything with the right methods matches, including third-party and stdlib types you cannot make inherit from anything — a Protocol with close() already matches files, sockets, DB connections. Reach for Protocol when you are typing parameters ("I accept anything closable") especially across library boundaries. Reach for ABC when you own the hierarchy and want inherited shared behavior, or a hard runtime guarantee (instantiating an incomplete subclass fails immediately). Tradeoffs: Protocol conformance is checked by mypy, not enforced at runtime; ABC couples implementers to your base class.',
      isCaseBased: false,
    },
    {
      question: 'You are ingesting JSON from an external API. TypedDict or dataclass for the rows?',
      answer:
        'At the parse boundary, the data IS a dict — TypedDict types it with zero conversion cost: keys and value types get checked, typos in key names get flagged, and you have not built any objects. Convert to a dataclass one step in, when the data becomes YOUR domain object: you gain attribute access, methods, validation in __post_init__, and value equality. Tradeoff to name: TypedDict is only a checker-time promise — the API can still send garbage, so the boundary needs real runtime validation (explicit checks or pydantic) if you cannot trust the source. Pattern: TypedDict at the edge, dataclass in the core, validation at the crossing.',
      isCaseBased: false,
    },
    {
      question: 'Case: a teammate says "mypy passes, so this cannot be a type bug" — then prod throws TypeError anyway. What happened? Walk through your debugging.',
      answer:
        'mypy only checks what has types. The usual leaks: (1) **Any poisoning** — an untyped third-party lib or `json.loads` returns Any, and Any silently satisfies EVERY annotation downstream, so wrong shapes flow through unchecked; (2) untyped functions in your own code — mypy skips their bodies by default; (3) `# type: ignore` comments hiding real errors; (4) runtime data simply not matching the declared types (hints are promises, not checks). Debugging: find where the bad value entered — it is almost always a boundary (JSON, DB row, env var); add real validation there. Prevention: `mypy --strict` (flags untyped defs and Any leaks), and treat every external boundary as untrusted. Key sentence: mypy verifies internal consistency of your claims, not the honesty of your inputs.',
      isCaseBased: true,
    },
    {
      question: 'Why does __post_init__ exist — why not just write your own __init__ with validation in it?',
      answer:
        'Writing your own __init__ throws away the main thing @dataclass gives you: the generated __init__ that stores every field in order, stays in sync when fields are added, and handles defaults and default_factory correctly. __post_init__ lets you keep all of that and bolt validation on after: the generated code stores the fields, then your hook checks or derives values. Also composable: computed fields (`field(init=False)`) get filled in there. Tradeoff: __post_init__ runs AFTER assignment, so for a frozen class a derived field needs object.__setattr__ — slightly ugly, still better than hand-maintaining a 10-field __init__.',
      isCaseBased: false,
    },
    {
      question: 'Case: code review — a 30-line script with zero hints, and a 3000-line service with zero hints. Same feedback?',
      answer:
        'No — and saying why shows judgment. The script: hints would be cosmetic; a throwaway with one author and no call sites gets little from them — approve, maybe hint the one non-obvious return. The service: request hints on the public boundaries at minimum — function signatures of shared modules, data shapes crossing team lines — because that is where editors, mypy, and refactoring pay: hundreds of call sites, multiple authors, constant change. Tradeoffs to say out loud: hints are free at runtime but cost writing/reading noise; the payoff scales with code lifetime, team size, and call-site count. Suggest gradual adoption: type the boundaries first, run mypy on new code only, tighten over time — retrofitting a whole codebase in one PR is how typing efforts die.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    {
      front: 'Are type hints enforced at runtime?',
      back: 'NO — the #1 misconception. They sit in __annotations__; only editors and checkers (mypy) read them. Wrong types run without error.',
    },
    {
      front: 'Modern spelling of Optional[str]',
      back: 'str | None (3.10+). All equal: Optional[str] = Union[str, None] = str | None. "Optional" means or-None, not optional-argument.',
    },
    {
      front: 'list[int] vs List[int]',
      back: 'Same meaning. list[int]/dict[str, float] are the modern (3.9+) built-in generics; List/Dict from typing are the legacy spellings.',
    },
    {
      front: '@dataclass generates…',
      back: '__init__, __repr__, __eq__ — from the annotated class-level fields. (Not __hash__; frozen=True adds that.)',
    },
    {
      front: 'Mutable default in a dataclass',
      back: 'items: list = [] → ValueError at class definition. Use field(default_factory=list) — a per-instance recipe, fresh list each time.',
    },
    {
      front: 'frozen=True gives / does not give',
      back: 'Gives: assignment raises after construction + __hash__ (dict-key safe). Does not give: deep immutability — a list field can still be mutated.',
    },
    {
      front: '__post_init__',
      back: 'Runs right after the generated __init__. The validation hook — reject bad values without hand-writing __init__.',
    },
    {
      front: 'Protocol in one line',
      back: 'Structural typing: any object WITH the declared methods matches — no inheritance. Duck typing made checkable.',
    },
    {
      front: 'TypedDict in one line',
      back: 'A checker-time label for a dict\'s shape (keys + value types). Still a plain dict at runtime. Made for JSON boundaries.',
    },
    {
      front: 'Dataclass over dict/tuple — the 3 words',
      back: 'Named, typed, comparable. user.name over user[1] and user[\'nmae\'] — self-documenting, checker-visible, == by value.',
    },
  ],
  mindmapMarkdown: `- Type Hints & Dataclasses
  - Hints = labels, not laws
    - NOT enforced at runtime
    - live in __annotations__
    - read by editors + mypy
  - Syntax
    - params, -> return, variables
    - generics: list[int], dict[str, float]
    - str | None = Optional[str] = Union
  - Payoff
    - autocomplete
    - mypy: crash → pre-run error
    - refactor with confidence
  - Structural typing
    - TypedDict: dict shapes (JSON)
    - Protocol: match by methods
  - Dataclasses
    - @dataclass writes __init__/__repr__/__eq__
    - field(default_factory=list)
      - mutable-default trap, solved loudly
    - frozen=True → locked + hashable (shallow)
    - __post_init__ → validation hook
    - vs dict/tuple: named, typed, comparable`,
}

export default m
