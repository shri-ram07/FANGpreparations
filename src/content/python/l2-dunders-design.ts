import type { Module } from '../types'

const m: Module = {
  id: 'py-l2-dunders-design',
  subjectId: 'python',
  level: 2,
  title: 'Dunders, Properties & Object Design',
  whyItMatters:
    '"Make this class behave like a list" and "why composition over inheritance?" are two of the most reliable Python-round questions at FAANG. Dunders are how a class stops being a struct and starts being a tool — pandas, Django and PyTorch are built from exactly the tricks in this module. We build one mini ORM-style Table class and plug it into Python\'s syntax, socket by socket.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'Dunders: teach your object Python\'s grammar',
      md: `Python's syntax — \`len(x)\`, \`x == y\`, \`x[0]\`, \`print(x)\` — is a set of standard wall sockets. A **dunder** (double-underscore method like \`__len__\`) is the plug you weld onto YOUR class so it fits those sockets.

- \`len(t)\` secretly calls \`t.__len__()\`. \`t[0]\` calls \`t.__getitem__(0)\`. \`t == u\` calls \`t.__eq__(u)\`.
- You never call dunders by name — you *implement* them, Python calls them.
- Payoff: your class stops feeling bolted-on and starts feeling built-in.
- This module builds one class — a mini **ORM**-style \`Table\` (ORM = code that lets you query data as objects instead of writing raw SQL) — and plugs it into socket after socket.`,
    },
    {
      type: 'intuition',
      title: '__str__ vs __repr__: shop window vs stockroom label',
      md: `Same product, two labels for two audiences.

- **__str__** is the shop window: pretty, human-friendly — what *users* see when you \`print()\`.
- **__repr__** is the stockroom label: exact, unambiguous — what *developers* see in the debugger, the REPL, and logs.
- Gold standard for \`__repr__\`: a string you could paste back into Python to recreate the object.
- Only writing one? Write \`__repr__\` — \`str()\` falls back to it. The reverse is not true.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Two labels in action',
      code: `from datetime import date

d = date(2026, 8, 19)
print(d)          # 2026-08-19 — str: pretty, for users
print(repr(d))    # datetime.date(2026, 8, 19) — exact, for devs

class Money:
    def __init__(self, amount, currency):
        self.amount, self.currency = amount, currency

    def __repr__(self):
        return f'Money({self.amount!r}, {self.currency!r})'

    def __str__(self):
        return f'{self.amount} {self.currency}'

m = Money(499, 'INR')
print(m)      # 499 INR
print([m])    # [Money(499, 'INR')]`,
      annotations: {
        12: '!r means "use the repr of this field". The result — Money(499, \'INR\') — pastes back into Python and recreates the object. That is the repr gold standard.',
        18: 'print() calls str(), which calls __str__ — and silently falls back to __repr__ if __str__ is missing.',
        19: 'The classic surprise: containers ALWAYS use the repr of their elements, even inside print(). Pretty __str__ never shows up in a list.',
      },
    },
    {
      type: 'note',
      md: 'Log-file rule of thumb: logs are read by developers at 3am, so log `repr(obj)`, not `str(obj)`. An ambiguous "499 INR" tells you nothing about *which* object misbehaved; `Money(499, \'INR\')` at least names its type and exact state.',
    },
    {
      type: 'intuition',
      title: '__eq__: same person, or identical twin?',
      md: `Default \`==\` in Python is an identity check — literally \`a is b\`, "are these the *same object in memory*?"

- Two \`Money(499, 'INR')\` objects are twins: different memory, same value. Default \`==\` says False. Users expect True.
- \`__eq__\` lets you define equality **by value**: compare the fields that matter.
- The correct pattern has three parts: check the type with \`isinstance\`, compare fields, and for a foreign type return \`NotImplemented\` — not False.
- \`NotImplemented\` tells Python "I don't know this type" so it can ask the OTHER object's \`__eq__\` before giving up. Returning False steals that chance.`,
    },
    {
      type: 'note',
      md: 'Gotcha with a blast radius: the moment you define `__eq__`, Python silently sets `__hash__ = None` — your objects can no longer live in a `set` or be `dict` keys (TypeError: unhashable). The contract: objects that compare equal MUST hash equal, and Python refuses to guess your hash. Fix: define `__hash__` over the *same fields* as `__eq__`, e.g. `return hash((self.amount, self.currency))` — but only if those fields never change. A mutable object that mutates after entering a set gets filed under its old hash and is simply lost inside it.',
    },
    {
      type: 'intuition',
      title: 'The practical: a Table that feels like a database',
      md: `Time to cash in. A table is just a list of dict rows — but raw lists make callers do all the work. We wrap it and make it *feel* like a tiny ORM:

- \`len(users)\` — how many rows → \`__len__\`
- \`users[0]\` and \`users[1:3]\` — indexing and slicing → \`__getitem__\`
- \`users(city='Pune')\` — the object called *like a function* is the query → \`__call__\`
- \`t == u\` — same rows means equal → \`__eq__\`
- \`__call__\` is the least known of these: it makes an *instance* callable. Frameworks live on it — every PyTorch \`model(x)\` is \`__call__\`.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The mini ORM: five dunders, one class',
      code: `class Table:
    """A tiny ORM-ish table: dict rows + query sugar."""

    def __init__(self, rows):
        self._rows = list(rows)

    def __repr__(self):
        return f'Table({self._rows!r})'

    def __len__(self):
        return len(self._rows)

    def __getitem__(self, i):
        got = self._rows[i]
        return Table(got) if isinstance(i, slice) else got

    def __eq__(self, other):
        if not isinstance(other, Table):
            return NotImplemented
        return self._rows == other._rows

    def __call__(self, **conds):
        keep = [r for r in self._rows
                if all(r.get(k) == v for k, v in conds.items())]
        return Table(keep)`,
      annotations: {
        10: '__len__ powers len(t) AND truthiness: an empty Table is falsy, so "if table:" just works — same as lists.',
        13: 't[0] and t[1:3] both land here. An integer index returns the row; a slice returns a NEW Table — exactly how pandas and Django QuerySets behave.',
        19: 'NotImplemented (not False!) lets Python try the other object\'s __eq__ before concluding they differ.',
        22: 'users(city=\'Pune\') — the instance called like a function IS the query. Returning a Table means queries chain: users(city=\'Pune\')(name=\'Asha\').',
      },
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `class Table:
    def __init__(self, rows):
        self.rows = list(rows)
    def __repr__(self):
        return f'Table({len(self.rows)} rows)'
    def __len__(self):
        return len(self.rows)
    def __getitem__(self, i):
        return self.rows[i]
    def __eq__(self, other):
        return isinstance(other, Table) and self.rows == other.rows
    def __call__(self, **conds):
        return Table(r for r in self.rows
                     if all(r.get(k) == v for k, v in conds.items()))

users = Table([
    {'name': 'Asha', 'city': 'Pune'},
    {'name': 'Ravi', 'city': 'Delhi'},
    {'name': 'Meera', 'city': 'Pune'},
])
print(users)                       # __repr__
print(len(users), users[0])        # __len__, __getitem__
pune = users(city='Pune')          # __call__ = filter
print(pune, pune[1]['name'])
print(users == Table(users.rows))  # __eq__ compares VALUES`,
        precomputedOutput: `Table(3 rows)
3 {'name': 'Asha', 'city': 'Pune'}
Table(2 rows) Meera
True`,
        caption: 'The Table in action. Try adding a row, or a query that matches nothing — an empty Table still prints and compares correctly.',
      },
    },
    {
      type: 'note',
      md: 'Hidden freebie: define `__getitem__` alone and `for row in t` plus `row in t` both work with NO `__iter__` anywhere. Python falls back to a legacy protocol — call `t[0]`, `t[1]`, … until `IndexError`. Handy, and a famous "explain why this works" interview moment.',
    },
    {
      type: 'intuition',
      title: 'property: validation without the get_/set_ noise',
      md: `Java-style classes bury every field under \`get_balance()\` / \`set_balance()\` — defensive noise written on day one, "just in case".

- Python's deal: start with a **plain attribute**. Zero ceremony.
- The day you need validation, upgrade it to a \`@property\` — and every caller keeps writing \`acc.balance\`, unchanged. No migration, no noise.
- A property is a method wearing an attribute costume: reads call the getter, \`=\` calls the setter, \`del\` calls the deleter.
- That is why Python code has no get_/set_ convention: the language made it unnecessary.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'getter, setter, deleter — a validated attribute',
      code: `class Account:
    def __init__(self, balance):
        self.balance = balance    # routes through the setter below

    @property
    def balance(self):            # read:  acc.balance
        return self._balance

    @balance.setter
    def balance(self, value):     # write: acc.balance = x
        if value < 0:
            raise ValueError('balance cannot be negative')
        self._balance = value

    @balance.deleter
    def balance(self):            # del acc.balance
        raise AttributeError('balance cannot be deleted')

acc = Account(100)
acc.balance += 50                 # still reads like a plain attribute
# acc.balance = -1  ->  ValueError — validation for free`,
      annotations: {
        3: 'Even __init__ assigns through the setter — so objects are validated from birth. Account(-5) dies immediately, not three modules later.',
        5: '@property turns the method into the GETTER. Callers write acc.balance with no parentheses — attribute syntax, method power.',
        13: 'The real storage is _balance (note the underscore). The property named balance is the gate in front of it.',
      },
    },
    {
      type: 'note',
      md: 'Property etiquette: attribute access should be *cheap and surprise-free*. A getter that hits the network or takes seconds is a lie — readers assume `x.balance` costs nothing. Slow or side-effecting work belongs in a method with a verb name (`refresh_balance()`), so the cost is visible at the call site.',
    },
    {
      type: 'intuition',
      title: 'Name mangling: a surname, not a lock',
      md: `Python has no \`private\` keyword. It has two conventions and one mechanism:

- \`_name\` (one underscore): pure convention — "internal, please don't touch". Nothing enforces it.
- \`__name\` (two underscores, no trailing ones): the compiler **renames** it to \`_ClassName__name\`. That is name mangling.
- Analogy: two kids named "x" in one school — you write the family surname on each lunchbox so they can't get swapped. The box still has no lock.
- Real purpose: stop a *subclass* from accidentally overwriting a parent's internal attribute of the same name. It is a clash guard, not security.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Mangling mechanics: _Class__attr',
      code: `class A:
    def __init__(self):
        self._hint = 'convention'   # underscore = social signal only
        self.__secret = 42          # double underscore = mangled

a = A()
print(a._hint)         # works — nothing stops you, style guides do
# print(a.__secret)    # AttributeError!
print(a._A__secret)    # 42 — the "private" attr, fully reachable
print(a.__dict__)      # {'_hint': 'convention', '_A__secret': 42}`,
      annotations: {
        4: 'The compiler rewrites every __secret inside class A\'s body to _A__secret. Inside class B(A), the SAME spelling becomes _B__secret — that asymmetry is the whole clash-guard trick.',
        9: 'Mangling renames; it does not protect. Anyone who knows the formula gets in — and that is by design. "We are all consenting adults here" is the Python phrase for it.',
      },
    },
    {
      type: 'intuition',
      title: '@classmethod: the factory door',
      md: `\`__init__\` is one door into your class. Real data arrives in many shapes — CSV text, JSON, a database cursor — and Python has no constructor overloading.

- The idiom: a \`@classmethod\` per shape — \`Table.from_csv(text)\`, \`Table.from_json(s)\`. Named constructors that read like English. \`dict.fromkeys\` and \`datetime.fromtimestamp\` are the stdlib doing exactly this.
- It receives \`cls\` (the class itself) instead of \`self\` — and builds via \`cls(...)\`, so a *subclass* calling the factory gets an instance of *itself* for free.
- \`@staticmethod\` gets neither \`self\` nor \`cls\`: a plain function stored in the class purely for organization.
- Honest tradeoff: if a staticmethod touches nothing of the class, a module-level function is often the simpler home.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'from_csv: the factory idiom',
      code: `class Table:
    def __init__(self, rows):
        self._rows = list(rows)

    @classmethod
    def from_csv(cls, text):        # alternative constructor
        header, *lines = text.strip().splitlines()
        cols = header.split(',')
        return cls(dict(zip(cols, ln.split(','))) for ln in lines)

    @staticmethod
    def _clean(cell):               # needs no self, no cls
        return cell.strip()

data = 'name,city\\nAsha,Pune\\nRavi,Delhi'
t = Table.from_csv(data)            # reads like English

class AuditedTable(Table): ...
a = AuditedTable.from_csv(data)     # returns an AuditedTable!`,
      annotations: {
        6: 'cls, not self: a classmethod receives the CLASS. No instance exists yet — this method\'s whole job is to create one.',
        9: 'Building via cls(...) instead of Table(...) is the load-bearing detail: subclasses inherit the factory and it constructs THEIR type.',
        19: 'The payoff of cls: AuditedTable wrote zero code and its from_csv already returns AuditedTable, not Table.',
      },
    },
    {
      type: 'intuition',
      title: 'abc.ABC: a contract the language enforces',
      md: `Building code says a house must have wiring and plumbing *before anyone moves in* — the inspector blocks occupancy, not the first cold shower.

- An **abstract base class** (ABC) is that inspector for classes: inherit from \`abc.ABC\`, mark required methods with \`@abstractmethod\`, and Python refuses to instantiate anything that hasn't implemented them all.
- The failure happens at object-creation time — loud, early, at startup — instead of an \`AttributeError\` at 3am in production.
- Use it when you own a *family* of implementations (CsvStorage, S3Storage, FakeStorage-for-tests) and want the contract written down in code.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The contract in code',
      code: `from abc import ABC, abstractmethod

class Storage(ABC):
    @abstractmethod
    def save(self, table): ...

    @abstractmethod
    def load(self): ...

class CsvStorage(Storage):
    def save(self, table): print('writing csv...')
    def load(self): return Table([])

# Storage()  ->  TypeError: can't instantiate abstract class
# A subclass missing load() refuses to instantiate the same way
store = CsvStorage()    # complete implementation: allowed`,
      annotations: {
        3: 'Inherit ABC + at least one @abstractmethod = the class (and any incomplete subclass) cannot be instantiated.',
        5: 'The body can be literally "..." — the signature IS the contract. Subclasses supply the behavior.',
        14: 'The error names the missing methods too — the inspector tells you exactly which wiring is absent.',
      },
    },
    {
      type: 'intuition',
      title: 'Duck typing: Python never asks for ID',
      md: `"If it walks like a duck and quacks like a duck, it's a duck." Python checks *behavior at the moment of use*, never lineage.

- \`len(x)\` works on a list, a string, our \`Table\` — anything with \`__len__\`. No shared parent class required.
- The interview sentence: **in Python, an interface is just the set of methods you actually call.**
- Write functions that accept "anything with a \`.read()\`", not "a File" — that's why \`json.load\` happily takes a file, a socket wrapper, or an in-memory \`StringIO\`.
- ABCs are the *opt-in* formal contract; duck typing is the default culture. Modern middle ground: \`typing.Protocol\` — duck typing a static type checker can verify, with no inheritance at all.`,
    },
    {
      type: 'intuition',
      title: 'Composition vs inheritance: the question you WILL get',
      md: `Inheritance is **is-a** (AuditedTable *is a* Table). Composition is **has-a** (a Report *has a* table inside). Interviewers want to hear why composition usually wins:

- Inheritance hands you the parent's ENTIRE API, forever — including methods that break your invariants. Joe Armstrong's line: "you wanted a banana but got a gorilla holding the banana and the entire jungle."
- The **fragile base class** problem: an innocent change in the parent silently breaks every child. The coupling is invisible until it bites.
- Composition exposes only the surface you choose, and the inner part is swappable — hand a \`FakeTable\` to tests, an \`S3Table\` to prod, no subclassing.
- Inheritance still earns its place: a genuine is-a where the subclass honors every parent promise, ABC contracts, and framework hook points (\`class MyModel(nn.Module)\`).`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Same feature, both shapes',
      code: `# Inheritance: AuditedTable IS-A Table — takes everything, forever
class AuditedTable(Table):
    def __call__(self, **conds):
        print('QUERY', conds)
        return super().__call__(**conds)

# Composition: Audited HAS-A table — exposes only what it chooses
class Audited:
    def __init__(self, table):
        self._table = table

    def query(self, **conds):
        print('QUERY', conds)
        return self._table(**conds)`,
      annotations: {
        2: 'AuditedTable inherits ALL of Table — __getitem__, __eq__, future methods — wanted or not. Its public API is now coupled to Table\'s forever.',
        10: 'The wrapped table is a replaceable part, not a parent: pass a fake in tests, a different implementation in prod. Cost: you must forward each method you want to expose.',
      },
    },
    {
      type: 'note',
      md: 'Decision rules to say out loud in an interview: default to **composition**; inherit only when the subclass is truly usable everywhere the parent is (the Liskov idea — a subclass must honor every promise the parent makes). Reach for an **ABC** when you own a family of implementations and want missing methods to fail at startup. At the edges, trust **duck typing**: accept "anything with the methods I call", and name that shape with `typing.Protocol` if you want the type checker on your side.',
    },
  ],
  quiz: [
    {
      question: 'print(obj) shows <__main__.Money object at 0x7f...>. Which method(s) could fix it?',
      options: [
        {
          text: '__str__ — or just __repr__, since str() falls back to it',
          explanation: 'Correct. print calls str() → __str__ → falls back to __repr__. Defining only __repr__ covers print, the REPL, and containers in one shot.',
        },
        { text: 'Only __str__ — __repr__ is never used by print', explanation: 'print prefers __str__, but when __str__ is absent it uses __repr__. The fallback is the whole reason "write __repr__ first" is the advice.' },
        { text: '__print__', explanation: 'No such dunder exists. Printing routes through str()/repr().' },
      ],
      correct: 0,
    },
    {
      question: 'Money defines a pretty __str__, but print([m1, m2]) still shows Money(499, \'INR\'). Why?',
      options: [
        { text: 'The list is broken and needs its own __str__', explanation: 'list already has a __str__ — and it deliberately uses each element\'s repr, whatever you do.' },
        {
          text: 'Containers always render their elements with __repr__',
          explanation: 'Correct. Inside lists, dicts, sets, the elements\' __repr__ is used — pretty __str__ never appears. This is by design: debugging output must be unambiguous.',
        },
        { text: '__str__ only works when calling str() explicitly', explanation: 'print(m) alone WOULD use __str__. The container is what switches to repr.' },
      ],
      correct: 1,
    },
    {
      question: 'You add __eq__ to a class and suddenly `set_of_users.add(u)` raises TypeError: unhashable. What happened?',
      options: [
        { text: 'Sets require __lt__ for ordering', explanation: 'Sets are hash-based, not ordered — __lt__ is never consulted.' },
        {
          text: 'Defining __eq__ silently sets __hash__ to None',
          explanation: 'Correct. Equal objects must hash equal, and Python won\'t guess your hash — so it removes the default one. Define __hash__ over the same fields (if they are immutable) to restore set/dict membership.',
        },
        { text: 'The __eq__ has a bug — a correct one keeps hashing working', explanation: 'Even a perfect __eq__ triggers this: it is automatic language behavior, not an error in your code.' },
      ],
      correct: 1,
    },
    {
      question: 'A class defines ONLY __getitem__ (integer indexes, raises IndexError past the end). What works for free?',
      options: [
        {
          text: 'for row in t — iteration via the legacy protocol',
          explanation: 'Correct. With no __iter__, Python calls t[0], t[1], … until IndexError. Membership tests (x in t) ride the same fallback.',
        },
        { text: 'len(t)', explanation: 'len needs __len__ — there is no fallback from __getitem__ for it.' },
        { text: 't == u by value', explanation: 'Equality needs __eq__; the default remains an identity check.' },
      ],
      correct: 0,
    },
    {
      question: 'users(city=\'Pune\') filters the Table. Which dunder makes an instance callable like a function?',
      options: [
        { text: '__call__', explanation: 'Correct. Any object with __call__ can be invoked with (). PyTorch\'s model(x) and every decorator class work this way.' },
        { text: '__getitem__', explanation: '__getitem__ answers square brackets — users[\'Pune\'] — not parentheses.' },
        { text: '__init__', explanation: '__init__ runs once at construction (Table(...)). Calling an existing instance is __call__.' },
      ],
      correct: 0,
    },
    {
      question: 'Inside class B(A), a method assigns self.__cache = {}. Which attribute name lands in the instance dict?',
      options: [
        { text: '_B__cache', explanation: 'Correct. Mangling uses the class whose BODY the code sits in — B — even on an instance of a subclass. That is exactly how it prevents clashes with A\'s own __cache.' },
        { text: '_A__cache', explanation: 'Mangling doesn\'t look at the inheritance chain — only at the class where the code is written. That would defeat the clash guard.' },
        { text: '__cache, unchanged', explanation: 'Double leading underscores inside a class body are always rewritten — that is the mangling mechanism itself.' },
      ],
      correct: 0,
    },
    {
      question: 'Why is from_csv a @classmethod rather than a @staticmethod that returns Table(...)?',
      options: [
        {
          text: 'It builds via cls(...), so subclasses inherit a factory that constructs their own type',
          explanation: 'Correct. AuditedTable.from_csv(...) returns an AuditedTable with zero extra code. A staticmethod hard-coding Table(...) would return the wrong type for every subclass.',
        },
        { text: 'staticmethods cannot return new objects', explanation: 'They can return anything — the problem is the hard-coded class name, not the return.' },
        { text: 'classmethods are faster', explanation: 'Performance is identical in practice — the difference is the cls parameter and what it enables.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'What is the difference between __str__ and __repr__, and which one do you implement first?',
      answer:
        'Different audiences: __str__ is for end users (pretty, `print`), __repr__ is for developers (unambiguous, debugger/REPL/containers — ideally paste-back-into-Python like `Money(499, \'INR\')`). Implement __repr__ first: str() falls back to it, so one method covers printing, logging, and container display; __str__ is an optional cosmetic layer on top. Bonus point: log repr, not str — 3am debugging needs exact state, not pretty text.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through implementing __eq__ correctly. What are the parts people get wrong?',
      answer:
        'Three parts: (1) `isinstance(other, MyClass)` guard; (2) compare the value-defining fields; (3) for a foreign type return **NotImplemented**, not False — that lets Python try the other object\'s __eq__ (reflected comparison) before concluding inequality. The two classic misses: returning False for unknown types (breaks symmetric comparisons with cooperative classes), and forgetting that defining __eq__ kills the default __hash__ — restore it with `hash(tuple_of_same_fields)` only if those fields are immutable.',
      isCaseBased: false,
    },
    {
      question: 'Prod bug: a refactor added __eq__ to the User class so tests could compare users by value. That night, the dedupe job — `unique = set(users)` — starts crashing with TypeError: unhashable type. Walk me through it.',
      answer:
        'Root cause: defining __eq__ makes Python set __hash__ = None (equal objects must hash equal; Python won\'t guess). The set constructor now refuses User objects. Fixes, in order of preference: (1) if User is effectively immutable, define `__hash__` over the same fields __eq__ uses — contract restored; (2) if User is mutable, do NOT make it hashable — a user mutated after entering the set is lost under its old hash bucket; dedupe on an immutable key instead: `{u.id: u for u in users}.values()`. The transferable lesson: __eq__ and __hash__ are one design decision, never two.',
      isCaseBased: true,
    },
    {
      question: 'Debugging case: you\'re reading unfamiliar code — `for row in table:` works fine, but grep finds no __iter__ anywhere in the Table class. Explain what\'s happening.',
      answer:
        'Legacy iteration protocol: when __iter__ is absent, Python falls back to calling table[0], table[1], … until IndexError — so any class with an integer-indexed __getitem__ is automatically iterable. Membership (`x in table`) rides the same fallback. Worth adding: if __getitem__ is dict-like (keyed, never raises IndexError), that fallback loops forever or crashes strangely — which is the argument for defining an explicit __iter__ once iteration is an intended feature rather than an accident.',
      isCaseBased: true,
    },
    {
      question: 'Why does Python use @property instead of Java-style get_x()/set_x() methods? When is a property the wrong choice?',
      answer:
        'Uniform access: callers write `acc.balance` whether it\'s a plain attribute today or a validated property tomorrow — you can add validation later with zero caller changes, so nobody writes defensive getters "just in case". Wrong choice when: (1) the computation is expensive or does I/O — attribute syntax promises cheapness; use a verb-named method (`refresh_balance()`) so cost is visible; (2) it can fail in ways callers must handle explicitly; (3) it takes arguments — properties can\'t. Tradeoff to name: properties hide code behind innocent-looking access, which is power AND a debugging trap.',
      isCaseBased: false,
    },
    {
      question: 'Explain name mangling. Is __attr real privacy? Why did Python choose this design?',
      answer:
        'Inside a class body, __attr (two leading underscores) is rewritten by the compiler to _ClassName__attr. Not privacy — anyone can access `obj._ClassName__attr` deliberately. Its actual purpose is preventing accidental name clashes when a subclass reuses an attribute name the parent uses internally: parent code mangles to _Parent__x, subclass code to _Child__x, so they can\'t stomp each other. Python\'s philosophy ("consenting adults"): conventions (`_attr`) over enforcement, because enforced privacy blocks legitimate debugging/testing while stopping no determined caller. Tradeoff: freedom over guarantees — teams enforce discipline with review and linters instead of the language.',
      isCaseBased: false,
    },
    {
      question: '@classmethod vs @staticmethod — when do you use each, and when neither?',
      answer:
        'classmethod receives cls: use it for alternative constructors (from_csv, from_json — the stdlib\'s dict.fromkeys, datetime.fromtimestamp) and anything that must construct or inspect the class polymorphically; building via cls(...) means subclasses inherit factories that return their own type. staticmethod receives nothing: a plain function namespaced inside the class for discoverability — validation helpers, converters. Neither: if the function touches nothing of the class, a module-level function is simpler, easier to import, and easier to test — staticmethod is organization, not power. The factory idiom is the star: Python has no constructor overloading, so named classmethods ARE Python\'s answer to multiple constructors.',
      isCaseBased: false,
    },
    {
      question: 'ABCs vs duck typing vs typing.Protocol — how do you choose in a real codebase?',
      answer:
        'Duck typing (default): just call the methods; any object providing them works. Zero coupling, maximum flexibility — but the contract lives only in your head and fails at call time. ABC: explicit inheritance-based contract; instantiation fails LOUDLY if a method is missing — best when you own a family of implementations (CsvStorage/S3Storage/FakeStorage) and want startup-time enforcement plus shared helper code in the base. typing.Protocol: structural typing — classes conform by shape without inheriting anything, checked statically by mypy; best for accepting third-party objects you can\'t make inherit from you. Rule of thumb: Protocol at public API boundaries, ABC inside a family you control, raw duck typing for small internal code.',
      isCaseBased: false,
    },
    {
      question: 'Why does composition usually beat inheritance? Steelman inheritance too.',
      answer:
        'Composition wins by default because: (1) inheritance exposes the parent\'s ENTIRE API forever — your class makes promises it never meant (the gorilla-and-jungle problem); (2) fragile base class — parent changes silently break children through an invisible coupling; (3) composition\'s inner object is swappable — inject fakes for tests, alternate implementations for prod; (4) is-a is rarer than it looks: most "is-a" claims fail Liskov (the subclass can\'t honor every parent promise — the classic Square(Rectangle) trap). Steelman for inheritance: genuine is-a with both ends owned by you, ABC contract families, and framework hook points (nn.Module, unittest.TestCase) where the framework calls YOUR overrides. Cost of composition to name honestly: forwarding boilerplate for each exposed method.',
      isCaseBased: false,
    },
    {
      question: 'Case: a teammate shipped `class Table(list)` — "we get indexing, len, and append for free!" Six months later there are data-corruption bugs. Predict what went wrong and propose the redesign.',
      answer:
        'Predictable failures: (1) the class inherited ~40 list methods — extend, insert, sort, +=, clear — every one a door that bypasses whatever row validation Table wants to enforce; callers used them because they were there; (2) list\'s methods return plain lists, not Tables — `t[1:3]` and `t + u` silently drop the subclass (and its behavior); (3) CPython sometimes calls list internals directly, skipping overridden methods, so even careful overriding leaks. Redesign with composition: Table HAS-A private list, exposes __len__/__getitem__/__eq__ plus intentional mutators that validate — small forwarding cost, total control of the surface. The interview close: inheriting from built-ins for convenience is the textbook case of inheritance for code reuse instead of true is-a; if you truly need a full list-like type, collections.UserList exists precisely because subclassing list is treacherous.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: '__str__ vs __repr__ — one line', back: '__str__: pretty, for users (print). __repr__: exact, for developers (REPL, logs, containers) — ideally recreates the object. Write __repr__ first; str() falls back to it.' },
    { front: 'What do containers use to display elements?', back: 'Always __repr__ — a pretty __str__ never shows inside a printed list/dict/set.' },
    { front: 'Default == behavior with no __eq__', back: 'Identity: a == b is a is b — same object in memory, not same value.' },
    { front: 'The __eq__ / __hash__ contract', back: 'Defining __eq__ sets __hash__ = None (unhashable). Equal objects must hash equal — define __hash__ over the same (immutable) fields to restore set/dict use.' },
    { front: 'Freebies from __getitem__ alone', back: 'Slicing support (i can be a slice object) + legacy iteration: for/in work by calling t[0], t[1], … until IndexError — no __iter__ needed.' },
    { front: 'property trio', back: '@property (getter), @name.setter, @name.deleter — attribute syntax, method power. Store the real value in _name.' },
    { front: 'Name mangling formula + purpose', back: '__attr inside class C becomes _C__attr. Purpose: prevent subclass name clashes. NOT security — _C__attr is reachable by anyone.' },
    { front: '@classmethod vs @staticmethod', back: 'classmethod gets cls → factories (from_csv) that build the right type for subclasses. staticmethod gets nothing → plain function stored in the class for organization.' },
    { front: 'abc.ABC in one line', back: 'Inherit ABC + @abstractmethod = class refuses to instantiate until every abstract method is implemented. Contract failure at startup, not at 3am.' },
    { front: 'Duck typing + the default design rule', back: '"An interface is the set of methods you actually call" — behavior over lineage. Design rule: composition by default; inherit only for true is-a (Liskov holds), ABCs, framework hooks.' },
  ],
  mindmapMarkdown: `- Dunders, Properties & Object Design
  - str vs repr
    - str: users, print
    - repr: devs, containers, eval-able
    - write repr first (fallback)
  - __eq__
    - default == is identity
    - NotImplemented for foreign types
    - defining eq → hash gone
  - Table (mini ORM)
    - __len__: len() + truthiness
    - __getitem__: index, slice, free iteration
    - __call__: users(city='Pune')
  - property
    - getter / setter / deleter
    - validate without get_/set_
    - upgrade attr later, callers unchanged
  - name mangling
    - __x → _Class__x
    - clash guard, not security
  - classmethod vs staticmethod
    - from_csv factory via cls
    - staticmethod: no self, no cls
  - Contracts
    - abc.ABC + @abstractmethod
    - duck typing: behavior, not lineage
    - typing.Protocol: checkable ducks
  - Composition vs inheritance
    - is-a vs has-a
    - fragile base class
    - default: compose`,
}

export default m
