import type { Module } from '../types'

const m: Module = {
  id: 'py-l2-oop-pillars',
  subjectId: 'python',
  level: 2,
  title: 'Classes & the Four Pillars',
  whyItMatters:
    'Every ML codebase you will ever touch — PyTorch models, sklearn estimators, FastAPI apps — is classes talking to classes. And Python interview rounds love two traps hiding here: "what is self, really?" and MRO predict-the-output. This module builds a bank account from one class to a full inheritance tree, and both traps die on the way.',
  estMinutes: 60,
  sections: [
    {
      type: 'intuition',
      title: 'A class is the rulebook. An object is one account.',
      md: `A bank writes ONE rulebook: what an account stores, how deposits work. Then it opens a million accounts — each with its own balance, all following the same rules.

- **Class** = the rulebook. Written once. Stores no money itself.
- **Object** (instance) = one real account made from that rulebook, with its own data.
- \`BankAccount('Raunak', 500)\` — calling the class like a function opens a new account.
- We build this exact bank all module: deposit, withdraw, balance protection, then a SavingsAccount with stricter rules.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The smallest real class',
      code: `class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self._balance = balance

    def deposit(self, amount):
        self._balance += amount

acct = BankAccount('Raunak', 500)
acct.deposit(100)
print(acct.owner, acct._balance)   # Raunak 600`,
      annotations: {
        2: '__init__ is the setup routine — Python calls it automatically the moment a new object is created. It initializes; it does not create.',
        3: 'self.owner = ... attaches data to THIS object. Different account, different owner.',
        9: 'Calling the class = make a blank object, run __init__ on it, hand it back.',
        10: 'This line is pure sugar. What actually runs: BankAccount.deposit(acct, 100).',
      },
    },
    {
      type: 'note',
      md: `**What self actually is:** nothing magic — it is the object itself, passed as the first argument. \`acct.deposit(100)\` is rewritten by Python into \`BankAccount.deposit(acct, 100)\`. The name \`self\` is just convention (you could call it \`this\` — don't). Methods (functions defined inside a class) need \`self\` because the class is shared: the method must be told WHICH account it is operating on.`,
    },
    {
      type: 'intuition',
      title: 'Instance attributes vs class attributes',
      md: `Each account has its own locker (balance, owner). But the bank's name hangs on the branch wall — one poster, seen by everyone.

- **Instance attribute**: \`self.owner\` — lives on the object. Per account.
- **Class attribute**: defined directly in the class body — lives on the class. Shared by all.
- Lookup order when you read \`acct.x\`: the object's own attributes first, then the class.
- The trap: **writing** \`acct.x = ...\` never touches the class. It creates a new instance attribute that *shadows* the class one — for that object only.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The shadowing trap — predict each print',
      code: `class BankAccount:
    bank_name = 'PyBank'

a = BankAccount()
b = BankAccount()
print(a.bank_name, b.bank_name)  # PyBank PyBank

a.bank_name = 'MyBank'
print(a.bank_name, b.bank_name)  # MyBank PyBank

BankAccount.bank_name = 'NewBank'
print(a.bank_name, b.bank_name)  # MyBank NewBank`,
      annotations: {
        2: 'One value, stored on the class. Both a and b read it through the lookup chain.',
        8: 'THE trap: this does not update the class attribute. It plants a new instance attribute on a, which now hides the class one.',
        12: 'b still reads from the class, so it sees NewBank. a is stuck on its shadow. Worse version of this trap: a MUTABLE class attribute (a list) that all instances silently share.',
      },
    },
    {
      type: 'intuition',
      title: 'Three kinds of methods',
      md: `Ask of every method: what does it need to do its job?

- Needs one specific account → **instance method**, gets \`self\`. \`deposit\`, \`withdraw\`.
- Needs the class but no particular account → **@classmethod**, gets \`cls\`. Classic use: alternate constructors like \`from_string\`.
- Needs neither — just a related helper that belongs in this namespace → **@staticmethod**, gets nothing.
- A **decorator** (the \`@\` line) is a tag that changes how the function below it behaves — written in full in Level 3.
- This is the intro; the next module goes deeper on when each shines.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'All three on the bank account',
      code: `class BankAccount:
    rate = 0.03

    def __init__(self, owner, balance=0):
        self.owner = owner
        self._balance = balance

    def add_interest(self):
        self._balance += self._balance * self.rate

    @classmethod
    def from_string(cls, text):
        owner, balance = text.split(':')
        return cls(owner, int(balance))

    @staticmethod
    def is_valid_amount(amount):
        return amount > 0

acct = BankAccount.from_string('Raunak:500')`,
      annotations: {
        8: 'Instance method: touches self._balance, so it must know which account.',
        12: 'Gets cls = the class itself, not an object. An alternate way to build accounts.',
        14: 'cls(...) not BankAccount(...): if a subclass calls from_string, cls IS the subclass — you get a SavingsAccount back for free.',
        17: 'No self, no cls. A plain function parked inside the class because it belongs to the topic.',
        20: 'Called on the class — no account exists yet. That is the point of a constructor.',
      },
    },
    {
      type: 'intuition',
      title: 'The four pillars — the map before the territory',
      md: `Every OOP interview question is one of these four wearing a costume:

- **Encapsulation** — bundle data with the methods that guard it; mark internals hands-off.
- **Abstraction** — expose a simple interface, hide the machinery.
- **Inheritance** — a new class reuses and extends an existing one.
- **Polymorphism** — one method name, different behavior per class.
- Each gets a crisp bank-account example below. Learn the examples, not the definitions.`,
    },
    {
      type: 'intuition',
      title: 'Pillar 1: Encapsulation',
      md: `Nobody edits a bank balance by reaching into the vault. You go through \`deposit\` and \`withdraw\` — the methods that enforce the rules.

- Python has **no true private**. It has agreements.
- \`_balance\` — single underscore: "internal, please go through my methods". A convention, not a lock.
- \`__pin\` — double underscore: Python *renames* it to \`_BankAccount__pin\` (**name mangling**). Purpose: stop subclasses from accidentally clashing with your internals — not security.
- Level 3 adds \`@property\` for validated access; for now, underscore + methods is the whole game.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'One underscore vs two',
      code: `class BankAccount:
    def __init__(self):
        self._balance = 0
        self.__pin = '1234'

acct = BankAccount()
print(acct._balance)             # 0
print(acct._BankAccount__pin)    # 1234`,
      annotations: {
        3: 'Convention only. Anyone CAN read it — the underscore says they shouldn\'t.',
        4: 'Mangled at class-definition time into _BankAccount__pin.',
        8: 'acct.__pin would raise AttributeError — the attribute literally has a different name now. Mangling is a renaming trick, not encryption.',
      },
    },
    {
      type: 'intuition',
      title: 'Pillar 2: Abstraction',
      md: `An ATM gives you four buttons. Behind them: ledgers, networks, fraud checks. You never see any of it — and that is the product.

- Encapsulation hides the **data** (\`_balance\`); abstraction hides the **process**.
- Bank example: a \`transfer(other, amount)\` method. The caller writes one line; inside it is withdraw + deposit + rollback on failure. Swap the internals for a real database tomorrow — no caller changes.
- Rule of thumb: design the interface a stranger would enjoy calling, then hide everything else.
- Python's formal tool for "subclasses MUST implement this interface" is abstract base classes (\`abc\`) — next module.`,
    },
    {
      type: 'intuition',
      title: 'Pillar 3: Inheritance (single)',
      md: `The bank launches a savings account. Rules: same as a normal account, except withdrawals must leave a minimum balance.

- Wrong move: copy-paste BankAccount and edit. Two copies of every bug forever.
- Right move: \`class SavingsAccount(BankAccount)\` — inherit everything, override only what changes.
- Test with **is-a**: a SavingsAccount *is a* BankAccount → inheritance fits.
- The child overrides \`withdraw\`, adds its rule, then calls \`super().withdraw(amount)\` to reuse the parent's logic instead of re-writing it.
- Run the whole bank below — then try softening the minimum-balance rule.`,
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `class BankAccount:
    bank_name = 'PyBank'               # class attribute: shared by ALL accounts

    def __init__(self, owner, balance=0):
        self.owner = owner             # instance attributes: this object only
        self._balance = balance

    def withdraw(self, amount):
        if amount > self._balance:
            raise ValueError('insufficient funds')
        self._balance -= amount

class SavingsAccount(BankAccount):
    def withdraw(self, amount):        # same method name, stricter rule
        if self._balance - amount < 500:
            raise ValueError('savings needs a 500 minimum')
        super().withdraw(amount)

s = SavingsAccount('Raunak', 1000)
s.withdraw(400)
print(s.owner, s._balance, s.bank_name)
try:
    s.withdraw(200)
except ValueError as e:
    print('blocked:', e)`,
        precomputedOutput: `Raunak 600 PyBank
blocked: savings needs a 500 minimum`,
        caption: 'The running bank — inheritance, encapsulation and an override in 25 lines',
      },
    },
    {
      type: 'intuition',
      title: 'Multiple inheritance and the MRO',
      md: `Python lets a class inherit from several parents: \`class D(B, C)\`. Immediate problem — if both B and C define \`who()\`, whose wins?

- Python resolves this with a fixed lookup queue: the **Method Resolution Order (MRO)**.
- Computed by the **C3 linearization** algorithm. Two rules cover 95% of questions: children before parents, and parents in the order you listed them (B before C).
- Inspect it any time: \`D.__mro__\` or \`D.mro()\`.
- The famous shape is the **diamond**: B and C both inherit from A, D inherits from both. Without MRO, "which A?" would be chaos.
- This is a top FAANG Python screening question — always as predict-the-output.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Predict the output before reading the annotations',
      code: `class A:
    def who(self): return 'A'

class B(A):
    def who(self): return 'B'

class C(A):
    def who(self): return 'C'

class D(B, C):
    pass

d = D()
print(d.who())
print([cls.__name__ for cls in D.__mro__])`,
      annotations: {
        10: 'The diamond: D → B → A and D → C → A. Listing order (B, C) matters.',
        13: 'Prints B. Lookup walks the MRO and stops at the FIRST class that has who(). D has none, B does — done. C never gets a vote.',
        14: "Prints ['D', 'B', 'C', 'A', 'object']. Note A appears ONCE, after both children — C3 guarantees that. Every class ends at object, the root of everything in Python.",
      },
    },
    {
      type: 'intuition',
      title: 'super() is not "my parent"',
      md: `The lie most tutorials tell: \`super()\` calls the parent class. The truth: \`super()\` calls **the next class in the MRO** — which may not be your parent at all.

- In the diamond, D's MRO is D → B → C → A. Inside \`B.__init__\`, \`super()\` points at **C** — a class B has never heard of.
- This is the feature, not a bug: if every class calls \`super().__init__()\`, the chain walks the whole MRO exactly once. That is **cooperative init**.
- Hardcoding \`A.__init__(self)\` instead breaks the chain: A runs twice or C gets skipped.
- Predict the print order below, then run it.`,
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `class A:
    def __init__(self):
        print('A init')

class B(A):
    def __init__(self):
        print('B init')
        super().__init__()

class C(A):
    def __init__(self):
        print('C init')
        super().__init__()

class D(B, C):
    def __init__(self):
        print('D init')
        super().__init__()

D()
print(' -> '.join(c.__name__ for c in D.__mro__))`,
        precomputedOutput: `D init
B init
C init
A init
D -> B -> C -> A -> object`,
        caption: "Cooperative init: watch B's super() land on C, not on A",
      },
    },
    {
      type: 'intuition',
      title: 'Pillar 4: Polymorphism',
      md: `End-of-day, the bank processes withdrawals for every account — normal, savings, whatever comes next.

- The loop calls one thing: \`acct.withdraw(amount)\`. It never asks "which type are you?"
- Each object answers with **its own** version of \`withdraw\` — the override, if it has one.
- That is polymorphism: **shared method names, per-object behavior, chosen at runtime**.
- Payoff: add a new account type tomorrow — the loop does not change. Zero \`if isinstance(...)\` chains.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'One loop, many behaviors',
      code: `accounts = [BankAccount('ravi', 900), SavingsAccount('priya', 900)]

for acct in accounts:
    try:
        acct.withdraw(600)
        print(type(acct).__name__, 'ok, balance =', acct._balance)
    except ValueError as e:
        print(type(acct).__name__, 'refused:', e)

# BankAccount ok, balance = 300
# SavingsAccount refused: savings needs a 500 minimum`,
      annotations: {
        5: 'Same line for both objects. Python looks up withdraw on each object\'s class at call time — each finds its own version.',
        10: 'Same call, two outcomes. New account types plug into this loop with no edits.',
      },
    },
    {
      type: 'note',
      md: `Gotchas worth a re-read before any interview: (1) \`self\` is just the object, passed explicitly — \`a.m(x)\` is \`C.m(a, x)\`. (2) Assigning through an instance shadows a class attribute; it never updates it — and a mutable class attribute is shared state across ALL instances. (3) \`__name\` mangling is subclass-clash protection, not privacy. (4) Method lookup follows \`Class.__mro__\`, first hit wins. (5) \`super()\` means next-in-MRO, not parent — which is exactly why cooperative init works.`,
    },
  ],
  quiz: [
    {
      question: 'acct.deposit(100) — what does Python actually execute?',
      options: [
        {
          text: 'BankAccount.deposit(acct, 100) — the object is passed as self',
          explanation: 'Correct. Dot-call on an instance is sugar for calling the class function with the object as the first argument. That is all self is.',
        },
        {
          text: 'deposit(100) with self created fresh by Python',
          explanation: 'self is never created — it IS the existing object, passed in. No new object appears.',
        },
        {
          text: 'A copy of acct is sent, so the original is safe',
          explanation: 'No copy. self is a reference to the same object — that is why self._balance += 100 changes the real account.',
        },
      ],
      correct: 0,
    },
    {
      question: "bank_name = 'PyBank' is a class attribute. After a.bank_name = 'MyBank' and then BankAccount.bank_name = 'NewBank', what does print(a.bank_name, b.bank_name) show?",
      options: [
        {
          text: 'MyBank NewBank',
          explanation: "Correct. The instance assignment planted a shadow on a, so a never looks at the class again. b has no shadow and reads the class's new value.",
        },
        {
          text: 'NewBank NewBank',
          explanation: "The class update can't reach a — a now has its own instance attribute shadowing the class one.",
        },
        {
          text: 'MyBank PyBank',
          explanation: 'b has no instance attribute, so it reads the CLASS — which was updated to NewBank.',
        },
        {
          text: 'MyBank MyBank',
          explanation: "a's assignment created an attribute on a only. It never wrote to the class, so b cannot see MyBank.",
        },
      ],
      correct: 0,
    },
    {
      question: 'Why does the alternate constructor from_string use @classmethod with cls(...) rather than @staticmethod with BankAccount(...)?',
      options: [
        {
          text: 'cls is whatever class the call came through — SavingsAccount.from_string returns a SavingsAccount automatically',
          explanation: 'Correct. Hardcoding BankAccount(...) would return the wrong type for every subclass. cls keeps constructors inheritance-friendly.',
        },
        {
          text: '@staticmethod cannot create objects',
          explanation: 'It can — any function can call BankAccount(...). The problem is the hardcoded class name, not ability.',
        },
        {
          text: '@classmethod is faster',
          explanation: 'Performance is identical. The win is correctness under inheritance, not speed.',
        },
      ],
      correct: 0,
    },
    {
      question: 'self.__pin is set in BankAccount.__init__. Outside the class, acct.__pin raises AttributeError. Why?',
      options: [
        {
          text: 'Python made it truly private',
          explanation: 'Python has no true private. The attribute exists and is readable — under a different name.',
        },
        {
          text: 'Name mangling renamed it to _BankAccount__pin at class-definition time',
          explanation: 'Correct. Double-underscore names are rewritten with the class name prefixed. acct._BankAccount__pin works fine — mangling prevents subclass name clashes, nothing more.',
        },
        {
          text: '__init__ attributes are deleted after construction',
          explanation: 'Attributes set in __init__ live as long as the object does — including this one, under its mangled name.',
        },
      ],
      correct: 1,
    },
    {
      question: 'class D(B, C) — B and C both define who(), and both inherit from A which also defines it. d.who() returns…',
      options: [
        {
          text: "B's version — the MRO is D, B, C, A and lookup stops at the first hit",
          explanation: "Correct. C3 puts listed parents in order (B before C) and children before parents. B has who(), so the search never reaches C or A.",
        },
        {
          text: "A's version — the original definition wins",
          explanation: "Backwards: children come BEFORE parents in the MRO. A is checked last, not first.",
        },
        {
          text: 'TypeError — Python refuses ambiguous methods',
          explanation: 'No error: the MRO makes it unambiguous. TypeError only appears when C3 cannot build a consistent order at class-definition time.',
        },
      ],
      correct: 0,
    },
    {
      question: "In the diamond D(B, C), all __init__ methods call super().__init__(). During D(), what does the super() inside B.__init__ call?",
      options: [
        {
          text: "A.__init__ — A is B's parent",
          explanation: 'The tutorial lie. super() does not mean parent — it means the next class in the RUNNING object\'s MRO.',
        },
        {
          text: "C.__init__ — the next class in D's MRO after B",
          explanation: "Correct. D's MRO is D, B, C, A. That is cooperative init: each super() hands off down the MRO, so every class runs exactly once.",
        },
        {
          text: 'Nothing — super() in multiple inheritance is undefined',
          explanation: 'It is precisely defined — by the MRO of the instance being constructed. That determinism is the whole point of C3.',
        },
      ],
      correct: 1,
    },
    {
      question: 'The end-of-day loop calls acct.withdraw(600) on a mixed list of account types and each behaves differently. Which pillar, and what makes it work?',
      options: [
        {
          text: 'Polymorphism — the method is looked up on each object\'s own class at call time',
          explanation: 'Correct. Shared name, per-class implementation, resolved at runtime via the MRO. The loop needs zero type checks.',
        },
        {
          text: 'Encapsulation — _balance is hidden',
          explanation: 'Encapsulation is in play elsewhere, but the different-behavior-per-object effect is polymorphism.',
        },
        {
          text: 'Abstraction — withdraw hides its internals',
          explanation: 'True but not the answer: abstraction hides HOW one method works. The many-shapes dispatch across types is polymorphism.',
        },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'What exactly is self in Python? Not the textbook line — the mechanism.',
      answer:
        'self is the instance, passed explicitly as the first argument. `acct.deposit(100)` is resolved as: find `deposit` via the class (through the MRO), bind it to `acct`, call `BankAccount.deposit(acct, 100)`. The name self is pure convention — Python only cares about position. Strong add-on: `acct.deposit` without calling it gives a **bound method** — a function with self pre-filled — which is why you can pass `acct.deposit` around as a callback.',
      isCaseBased: false,
    },
    {
      question: 'Prod bug: every BankAccount in the system shows the SAME transaction history. The class starts with `class BankAccount:` then `transactions = []` and __init__ never touches it. Walk me through it.',
      answer:
        'Classic mutable-class-attribute bug. `transactions = []` lives on the CLASS — one list object, shared by every instance. `self.transactions.append(...)` never assigns, so no shadowing happens; every account mutates the one shared list. It "worked" in testing because tests used one account. Fix: make it per-instance — `self.transactions = []` inside __init__. The precise rule: instance ASSIGNMENT shadows a class attribute, but instance MUTATION reaches through and edits the shared object. Immutable class attributes (numbers, strings) are safe for defaults; mutable ones are a trap.',
      isCaseBased: true,
    },
    {
      question: 'Instance method vs @classmethod vs @staticmethod — when do you reach for each?',
      answer:
        'Decide by what the method needs. Needs one object\'s data → instance method (`withdraw` touches self._balance). Needs the class but no instance → @classmethod; the canonical use is alternate constructors (`from_string`, like `dict.fromkeys`), and `cls(...)` keeps them subclass-correct — `SavingsAccount.from_string` returns a SavingsAccount. Needs neither → @staticmethod; a pure helper kept in the class for discoverability (`is_valid_amount`). Tradeoff worth naming: a @staticmethod could always be a module-level function — putting it in the class is an organizational choice, not a technical one.',
      isCaseBased: false,
    },
    {
      question: 'Python has no private keyword. So how do you do encapsulation, and what do _name and __name actually do?',
      answer:
        '`_name` is a convention: "internal, go through my methods" — nothing enforces it. `__name` triggers name mangling: rewritten to `_ClassName__name` at class-definition time. Its real purpose is preventing accidental attribute clashes in subclasses, NOT privacy — `acct._BankAccount__pin` reads it trivially. The philosophy: Python trusts developers ("consenting adults") and provides signals instead of walls. Tradeoff: less protection than Java/C++ private, but no getter/setter boilerplate — and when validation becomes necessary later, @property adds it without changing any caller.',
      isCaseBased: false,
    },
    {
      question: 'Encapsulation and abstraction sound identical. Distinguish them with one concrete example.',
      answer:
        'Encapsulation hides **state**: _balance is not touched directly; deposit/withdraw guard it with rules. Abstraction hides **process**: `transfer(other, amount)` is one call for the user, while inside it is withdraw + deposit + failure handling — and those internals can be swapped for a real database without any caller changing. Litmus test: encapsulation answers "who may touch this data?"; abstraction answers "how little must the caller know?" They cooperate — you abstract an interface, then encapsulate the state behind it.',
      isCaseBased: false,
    },
    {
      question: 'Predict-the-output: class D(B, C), where B and C both override who() from A. What prints, and HOW does Python decide?',
      answer:
        "B's version. Python computes the MRO with C3 linearization; for the diamond it is D → B → C → A → object, and attribute lookup takes the first hit. The two C3 rules that answer 95% of these questions: every class appears before its parents, and listed parents keep their listing order (B before C because you wrote D(B, C)). Verify with `D.__mro__`. Bonus point: some hierarchies CANNOT be linearized consistently — e.g. one base demands A-before-B while another demands B-before-A — and Python raises TypeError at class-definition time rather than guess.",
      isCaseBased: false,
    },
    {
      question: 'Why call super().__init__() instead of just Parent.__init__(self)? Give the case where hardcoding actually breaks.',
      answer:
        "super() targets the next class in the instance's MRO, not the textual parent. Single inheritance: both look identical. Diamond D(B, C): D's MRO is D→B→C→A. With cooperative super() calls, construction runs D, B, C, A — each exactly once, because super() inside B points at C. Hardcode `A.__init__(self)` inside B and C instead, and A initializes TWICE (fine for a print, dangerous for opening connections or registering listeners) while any sibling in between can be skipped entirely. Rule: in a hierarchy designed for multiple inheritance, every class calls super() — even the ones that think they are last, because object.__init__ terminates the chain.",
      isCaseBased: false,
    },
    {
      question: 'Prod bug: a new dev ships SavingsAccount with its own __init__ that only sets self.interest_rate. Now every SavingsAccount crashes with AttributeError: no attribute _balance — but plain BankAccount works. Debug it.',
      answer:
        "Defining __init__ in the subclass OVERRIDES the parent's — Python does not merge them, and the parent's __init__ no longer runs automatically. So self._balance and self.owner are never created; the first withdraw() touches a missing attribute and dies. Fix: `def __init__(self, owner, balance=0): super().__init__(owner, balance)` then `self.interest_rate = ...`. Interview-grade detail: call super().__init__ FIRST so parent invariants exist before subclass code relies on them. The general lesson — overriding replaces; reuse of parent behavior is always explicit, via super().",
      isCaseBased: true,
    },
    {
      question: 'Show me polymorphism without inheritance being the point — why does the batch-processing loop never need isinstance checks?',
      answer:
        "The loop calls `acct.withdraw(600)` and lets each object resolve the name through its own class's MRO — BankAccount finds its version, SavingsAccount finds its override. Behavior is chosen at runtime by the object, not at the call site by if/elif type checks. Payoff: open for extension — a new CurrentAccount with overdraft rules drops into the same loop with zero edits. Tradeoff to name: the dispatch is invisible at the call site, so debugging means checking `type(acct).__mro__` to see which implementation actually ran. (Python goes further: ANY object with a withdraw method works, inheritance or not — duck typing, deepened next module.)",
      isCaseBased: true,
    },
    {
      question: 'When would you AVOID multiple inheritance even though Python supports it well?',
      answer:
        "When the classes weren't designed to cooperate: parents whose __init__ signatures differ make cooperative super() chains painful (each link must pass along **kwargs it doesn't understand), and state clashes between parents create silent bugs mangling can't fully prevent. Prefer it only for the disciplined cases — mixins: small, stateless-ish classes adding one behavior (LoggingMixin, JSONSerializableMixin) onto one real base. Otherwise composition (hold the other object as an attribute) is simpler to reason about. Honest summary: MRO makes multiple inheritance well-defined, not free — the complexity moves into every __init__ signature in the tree.",
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'What is self, mechanically?', back: 'The instance, passed as the first argument: a.m(x) executes C.m(a, x). The name is convention; the position is the rule.' },
    { front: 'Attribute lookup order for acct.x', back: 'Instance attributes first, then the class (walking the MRO). First hit wins.' },
    { front: 'The class-attribute shadowing trap', back: 'acct.x = v never updates the class — it creates an instance attribute that shadows it. Mutation (acct.x.append) DOES reach the shared class object.' },
    { front: '@classmethod vs @staticmethod', back: 'classmethod gets cls (alternate constructors; subclass-correct via cls(...)). staticmethod gets nothing — a namespaced helper.' },
    { front: '_name vs __name', back: '_name: hands-off convention, unenforced. __name: mangled to _ClassName__name — prevents subclass clashes, not privacy.' },
    { front: 'MRO in one line + how to see it', back: 'The fixed class-lookup order from C3: children before parents, listed parents in order. Inspect: Class.__mro__.' },
    { front: 'Diamond D(B, C): MRO?', back: 'D → B → C → A → object. A appears once, after both children.' },
    { front: 'super() really means…', back: 'The NEXT class in the instance\'s MRO — not necessarily the parent. In D(B, C), super() inside B calls C.' },
    { front: 'Why cooperative __init__?', back: 'Every class calls super().__init__() → the chain walks the MRO exactly once. Hardcoding Parent.__init__(self) double-runs or skips classes in diamonds.' },
    { front: 'The 4 pillars, bank edition', back: 'Encapsulation: _balance behind deposit/withdraw. Abstraction: transfer() hides the steps. Inheritance: SavingsAccount(BankAccount). Polymorphism: one withdraw call, per-class behavior.' },
  ],
  mindmapMarkdown: `- Classes & the Four Pillars
  - Class vs object
    - class = rulebook, object = one account
    - __init__ initializes new objects
    - self = the instance, passed explicitly
  - Attributes
    - instance: self.owner (per object)
    - class: bank_name (shared)
    - trap: assignment shadows, mutation shares
  - Method kinds
    - instance → self
    - @classmethod → cls (from_string)
    - @staticmethod → neither
  - Encapsulation
    - _balance convention
    - __pin → _BankAccount__pin (mangling)
  - Abstraction
    - transfer() hides the steps
    - abc → next module
  - Inheritance
    - single: SavingsAccount(BankAccount)
    - multiple: D(B, C) diamond
    - MRO: C3, Class.__mro__
    - super() = next in MRO
    - cooperative __init__
  - Polymorphism
    - shared name, per-class behavior
    - one loop, no isinstance`,
}

export default m
