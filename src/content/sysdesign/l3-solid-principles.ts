import type { Module } from '../types'

const m: Module = {
  id: 'sysdesign-l3-solid-principles',
  subjectId: 'sysdesign',
  level: 3,
  title: 'SOLID: Each Principle as a Bad-to-Good Refactor',
  whyItMatters:
    'The HLD round asks you to draw boxes. The LLD round asks you to write classes — and then changes the requirements to see if your classes survive. SOLID is the vocabulary for that survival: five named forces that decide whether "now also support UPI" is a new file or a week of edits. This module gives each principle as a runnable bad-to-good refactor, plus the part most candidates skip — what each principle COSTS and when applying it makes the code worse.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'What an LLD round actually tests',
      md: `You will be handed a small system — parking lot, elevator, splitwise — and asked for classes. Then the interviewer does the real thing: **changes the requirements.** "Now bikes get a different pricing rule." "Now we also send SMS."

- The question is never "do you know what a class is". It is: **when the requirement moves, how much of your design has to move with it?**
- A good design absorbs the change in a NEW file. A bad one forces edits in five existing files, each one a chance to break something already working.
- SOLID is five names for five ways that goes wrong. Naming them out loud is half the signal — "this is an Open/Closed problem" beats "this feels messy".
- Every principle below has the same shape: a smell, a refactor, and a **cost**. The cost part is what separates a senior answer from a bootcamp answer.
- SOLID is not a checklist you run before writing code. It is a set of responses to pain you have already felt. We will come back to that at the end, hard.`,
    },
    {
      type: 'intuition',
      title: 'S — Single Responsibility: one reason to change',
      md: `**The principle in one sentence:** a class should have one reason to change — one stakeholder, one axis of change, one job.

- Note the wording: *reason to change*, not *number of methods*. A class with twelve methods that all serve one job is fine.
- **The smell:** you describe the class and need the word "and". *"Order holds the items **and** formats the invoice **and** talks to the database **and** sends mail."*
- Second smell: two unrelated teams keep editing the same file. Marketing changes the invoice layout; infra changes the DB driver; both land in \`Order.py\` and collide in review.
- Third smell: you cannot unit-test one behaviour without dragging in a database, an SMTP server, or a template engine.
- The refactor is always the same move: name each reason to change, give each one its own class.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'S — Order does everything, then Order does one thing',
      code: `# ================= BAD: one class, four reasons to change =================
class Order:
    def __init__(self, lines):
        self.lines = lines                       # [(name, price, qty)]

    def total(self):                             # business rule
        return sum(p * q for _, p, q in self.lines)

    def invoice_text(self):                      # presentation
        rows = [f'{n} x{q} = {p * q}' for n, p, q in self.lines]
        return '\\n'.join(rows) + f'\\nTOTAL {self.total()}'

    def save(self, db):                          # persistence
        db.append(('orders', self.total()))

    def notify(self, outbox):                    # delivery
        outbox.append('mail: ' + self.invoice_text())

# ================= GOOD: one reason to change each =================
class Order:                                     # data + business rules ONLY
    def __init__(self, lines):
        self.lines = lines

    def total(self):
        return sum(p * q for _, p, q in self.lines)

class InvoiceFormatter:                          # changes when marketing changes
    def render(self, order):
        rows = [f'{n} x{q} = {p * q}' for n, p, q in order.lines]
        return '\\n'.join(rows) + f'\\nTOTAL {order.total()}'

class OrderRepository:                           # changes when the DB changes
    def __init__(self, db): self.db = db
    def save(self, order): self.db.append(('orders', order.total()))

class OrderNotifier:                             # changes when mail becomes SMS
    def __init__(self, outbox, fmt): self.outbox, self.fmt = outbox, fmt
    def send(self, order): self.outbox.append('mail: ' + self.fmt.render(order))

db, outbox = [], []
order = Order([('mouse', 500, 2), ('pad', 200, 1)])
OrderRepository(db).save(order)
OrderNotifier(outbox, InvoiceFormatter()).send(order)
print(order.total())
print(db)
print(outbox[0].splitlines()[-1])

# 1200
# [('orders', 1200)]
# TOTAL 1200`,
      annotations: {
        2: 'Four reasons to change live in this class: pricing rules, invoice layout, the DB schema, the mail provider. Any one of them forces you to open — and risk — this file.',
        11: 'Presentation. Change the invoice layout and you are editing the same class that owns money arithmetic. A formatting typo now sits in the same diff as pricing.',
        14: 'Persistence. Order now knows a database exists. Testing total() means having a db object — the class stopped being testable in isolation.',
        20: 'Where the fix lands: Order keeps data and the rules that define it, nothing else. This is the piece the business owns and the piece that almost never changes.',
        32: 'Persistence moved out. Swap Postgres for DynamoDB and exactly one class changes. Order never hears about it.',
        43: 'Wiring moved to the edge — main(), a factory, or a DI container. The classes stay dumb; assembly happens in one place you can read top to bottom.',
      },
    },
    {
      type: 'note',
      md: `**The cost of SRP.** One readable class became four, plus wiring code that did not exist before. A newcomer now opens four files to follow one checkout, and "where does the invoice get built?" needs a grep instead of a scroll. You also lost the ability to just call \`order.notify()\` — someone must assemble the pieces.

**When NOT to split:** when the "responsibilities" always change together (a 40-line CSV parser that reads and validates is one job, not two); when the class is small enough to read in one screen and nobody has ever edited it for two different reasons; when the split would produce anaemic classes that only shuffle data between each other. Split on **observed** change, not imagined change — the second time two different reasons touch the same file is the honest trigger.`,
    },
    {
      type: 'intuition',
      title: 'O — Open/Closed: extend without editing',
      md: `**The principle in one sentence:** a module should be open for extension and closed for modification — you add behaviour by adding code, not by editing code that already works.

- **The smell:** a conditional that grows one branch per new type. \`if payment_type == 'card' … elif 'upi' … elif 'wallet' …\` — and you know a new \`elif\` is coming.
- Second smell: adding a feature makes you edit a file whose tests you did not want to re-run. Every edit to working code is a chance to break it.
- Third smell: the same \`if\` chain over the same type appears in three places (charge, refund, receipt). Add a method and you must find all three.
- The refactor: pull the varying behaviour behind an **interface**, and look it up in a **registry** (a dict) instead of branching on a string.
- Add a payment method → write a new class in a new file. The dispatch function is never opened again.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'O — the if-chain, then the protocol + registry',
      code: `from typing import Protocol

# ================= BAD: every new method edits this function =================
def charge(payment_type, amount):
    if payment_type == 'card':
        return f'card charged {amount}'
    elif payment_type == 'upi':
        return f'upi charged {amount}'
    elif payment_type == 'wallet':          # then crypto, EMI, netbanking, forever
        return f'wallet charged {amount}'
    raise ValueError(payment_type)

# ================= GOOD: a protocol + a registry =================
class PaymentMethod(Protocol):
    def charge(self, amount: int) -> str: ...

METHODS: dict[str, PaymentMethod] = {}

def register(name):
    def deco(cls):
        METHODS[name] = cls()
        return cls
    return deco

@register('card')
class Card:
    def charge(self, amount): return f'card charged {amount}'

@register('upi')
class Upi:
    def charge(self, amount): return f'upi charged {amount}'

def charge(name, amount):                   # never edited again
    return METHODS[name].charge(amount)

# EXTENSION: a brand-new file adds this. Zero existing lines touched.
@register('crypto')
class Crypto:
    def charge(self, amount): return f'crypto charged {amount}'

print(charge('upi', 250))
print(charge('crypto', 900))
print(sorted(METHODS))

# upi charged 250
# crypto charged 900
# ['card', 'crypto', 'upi']`,
      annotations: {
        4: 'The smell: one branch per type, and you can feel the next elif coming. Every new payment method means editing shipped, tested, production code.',
        9: 'Three branches today, eleven next year — and the same chain will be copy-pasted into refund() and receipt(). Now a new method means finding all three.',
        14: 'The abstraction: anything with charge(amount) IS a payment method. Protocol means structural typing — implementers inherit nothing and need not know this line exists.',
        17: 'The extension point. Behaviour now lives in DATA (a dict), and data grows at import time without anyone editing code.',
        33: 'Now CLOSED for modification: this function has no idea how many payment methods exist, and will not change when the twelfth arrives.',
        37: 'Open for extension — adding crypto touched zero existing lines. This IS the Strategy pattern from the patterns module: the Protocol is the Strategy interface, each class a concrete strategy, the dict the strategy lookup. OCP is the principle; Strategy is the shape it usually takes.',
      },
    },
    {
      type: 'note',
      md: `**The cost of OCP.** You traded one obvious function for a protocol, a registry, a decorator and N classes. Control flow became invisible: "what runs for \`upi\`?" is no longer answerable by reading one file — you must know the registry exists and find who registers that key. Import-time registration also means a method silently disappears if its module is never imported.

**When NOT to apply it:** when the set of cases is genuinely closed (\`if role in ('admin', 'user')\` — there will never be a third), when there are two branches and no history of a third, and when the branches are one line each. Three \`elif\`s and a ticket asking for a fourth is the trigger. **Guessing the axis of change wrong is worse than the if-chain** — you get a plugin system that is extensible in exactly the direction nobody needed.`,
    },
    {
      type: 'intuition',
      title: 'L — Liskov Substitution: subclasses must not surprise the caller',
      md: `**The principle in one sentence:** anywhere the parent type works, a subclass must work too — without the caller knowing or caring which one it got.

- **The smell:** an overridden method that raises \`NotImplementedError\`, silently ignores an argument, or adds a restriction the parent never had.
- Second smell: \`isinstance(x, Square)\` checks appearing inside callers. That is the caller being told the substitution is a lie.
- Third smell: a subclass whose docs say "same as parent, except…". The word "except" is the violation.
- The formal version, worth saying in an interview: a subtype may not **narrow a precondition** (accept less than the parent promised to accept) or **widen a postcondition** (guarantee less than the parent promised to deliver). Everything else is commentary.
- Inheritance is a promise about **behaviour**, not a taxonomy of nouns. A square is a rectangle in geometry; a mutable Square is not a mutable Rectangle in code.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'L — Square breaks a working caller, then the re-model',
      code: `# ================= BAD: "a Square IS A Rectangle" =================
class Rectangle:
    def __init__(self, w, h): self._w, self._h = w, h
    def set_width(self, w): self._w = w
    def set_height(self, h): self._h = h
    def area(self): return self._w * self._h

class Square(Rectangle):
    def set_width(self, w): self._w = self._h = w    # keeps ITS invariant...
    def set_height(self, h): self._w = self._h = h   # ...breaks the CALLER's

def stretch(rect):                # written once, against Rectangle
    rect.set_width(5)
    rect.set_height(4)
    return rect.area()            # caller's expectation: 5 * 4 = 20

print(stretch(Rectangle(1, 1)))
print(stretch(Square(1, 1)))      # substitution silently broke a working caller

# ================= GOOD: re-model the hierarchy, do not add a type check =====
class Rect:
    def __init__(self, w, h): self.w, self.h = w, h
    def area(self): return self.w * self.h
    def scaled(self, k): return Rect(self.w * k, self.h * k)

class Sq:
    def __init__(self, side): self.side = side
    def area(self): return self.side ** 2
    def scaled(self, k): return Sq(self.side * k)

def total_area(shapes):           # depends only on what BOTH really support
    return sum(s.area() for s in shapes)

print(total_area([Rect(5, 4), Sq(4)]))
print([s.scaled(2).area() for s in (Rect(5, 4), Sq(4))])

# 20
# 16
# 36
# [80, 64]`,
      annotations: {
        8: 'Geometry says yes, behaviour says no. Square must keep width == height; Rectangle promised callers those two are independent. Both cannot be true.',
        10: 'The formal violation, precisely: Rectangle\'s postcondition for set_height is "height changes, width does not". Square WIDENS it to "both change" — it guarantees less than the parent promised.',
        15: 'The caller is correct and was never edited. It broke because a subclass arrived. That is the whole definition of an LSP violation.',
        18: 'Prints 16, not 20. Nothing raised, no test crashed, no stack trace — the answer is just wrong. Silent is the worst failure mode a design can have.',
        21: 'The fix is re-modelling, not policing. Drop the shared mutable setters and there is no promise left to break. Rect and Sq are now siblings that share a capability, not parent and child.',
        31: 'Notice what is absent: no isinstance(shape, Sq) branch. A type check inside a caller is the SMELL of an unfixed LSP violation, never the fix — it just moves the surprise into an if.',
      },
    },
    {
      type: 'note',
      md: `**The cost of LSP.** Honest hierarchies are shallower and more repetitive. \`Rect\` and \`Sq\` both implement \`area()\` and \`scaled()\` with no shared base — a reviewer will call that duplication. Going immutable (returning a new object instead of mutating) is often the cleanest fix, and it costs allocations and a rewrite of every caller that expected setters.

**When NOT to worry about it:** if nothing ever substitutes the subclass for the parent — a subclass used only in its own concrete type cannot violate substitution, because nobody is substituting. And in Python specifically, most real code passes objects around structurally (duck typing), so the practical rule is narrower than the theory: **do not weaken a method that an existing caller already relies on.** Adding new methods in a subclass is always safe; changing what an inherited one promises is not.`,
    },
    {
      type: 'intuition',
      title: 'I — Interface Segregation: no client depends on methods it does not use',
      md: `**The principle in one sentence:** many small, focused interfaces beat one fat one — nobody should be forced to implement or depend on methods they never touch.

- **The smell:** a method implemented as \`raise NotImplementedError\` or \`pass\` just to satisfy a base class. That stub is a lie the type system now tells for you.
- Second smell: a function takes a big interface and calls one method on it. Its signature over-claims, so mocking it in a test means stubbing eight methods.
- Third smell: adding a method to a base class breaks six subclasses that do not care about it. The interface is coupling unrelated implementers to each other.
- The refactor: split the fat interface by **capability**, and let each client ask for exactly the capability it uses.
- In Python use \`typing.Protocol\`, not ABCs. Protocols are **structural**: any class with the right methods conforms, with no inheritance and no registration. That is what makes ISP nearly free here.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'I — fat Worker ABC, then capability protocols',
      code: `from abc import ABC, abstractmethod
from typing import Protocol, runtime_checkable

# ================= BAD: one fat interface everybody must implement ==========
class Worker(ABC):
    @abstractmethod
    def work(self): ...
    @abstractmethod
    def eat(self): ...
    @abstractmethod
    def sleep(self): ...

class Robot(Worker):
    def work(self): return 'welding'
    def eat(self): raise NotImplementedError('robots do not eat')   # forced stub
    def sleep(self): raise NotImplementedError                      # forced stub

# A scheduler that only ever calls .work() still receives an object carrying two
# methods that explode. The interface lied about what a Robot can do.

# ================= GOOD: small protocols, structural typing =================
@runtime_checkable
class Workable(Protocol):
    def work(self) -> str: ...

@runtime_checkable
class Feedable(Protocol):
    def eat(self) -> str: ...

class Robot2:                     # no base class, no stubs, no inheritance
    def work(self): return 'welding'

class Human:
    def work(self): return 'reviewing'
    def eat(self): return 'lunch'

def run_shift(crew: list[Workable]):     # asks for the ONE method it uses
    return [w.work() for w in crew]

def lunch_break(crew: list[Feedable]):
    return [p.eat() for p in crew]

print(run_shift([Robot2(), Human()]))
print(lunch_break([Human()]))
print(isinstance(Robot2(), Workable), isinstance(Robot2(), Feedable))

# ['welding', 'reviewing']
# ['lunch']
# True False`,
      annotations: {
        5: 'The smell in its natural habitat: one interface bundling three unrelated capabilities, so every implementer inherits all three whether or not they can honour them.',
        15: 'A stub that raises is the loudest ISP smell there is. The type says "this can eat", the object disagrees at runtime — and every caller now needs defensive knowledge.',
        23: 'One capability per protocol. A scheduler that only assigns work depends on exactly one method and can never be handed an object whose eat() explodes.',
        30: 'Robot2 inherits nothing and writes no stubs. With Protocol, conformance is by SHAPE — having work() is the entire requirement. That is why ISP is cheap in Python and expensive in Java.',
        37: 'Read the annotation as a contract: "give me things that can work". Test doubles become one-method classes instead of eight-method mocks.',
        45: 'True False — Robot2 satisfies Workable and not Feedable, with zero inheritance. runtime_checkable makes the structural check visible at runtime (it checks method NAMES only, not signatures).',
      },
    },
    {
      type: 'note',
      md: `**The cost of ISP.** Interface count explodes. A component that genuinely needs five capabilities now lists five protocols in its signature, and \`Workable\`/\`Feedable\`/\`Sleepable\` files start to outnumber the classes that implement them. Taken too far you get one-method interfaces for everything, which is just functions with extra ceremony.

**When NOT to apply it:** when every implementer genuinely supports every method (a \`Comparable\` with one job does not need splitting); when there is exactly one implementer and one client — the interface itself is probably unnecessary, never mind segregating it; and in Python, when nothing is annotated anyway, since duck typing already gives you the effect for free. **Practical trigger:** the first \`NotImplementedError\` stub, or the first test that mocks seven methods to exercise one.`,
    },
    {
      type: 'intuition',
      title: 'D — Dependency Inversion: the high-level module owns the interface',
      md: `**The principle in one sentence:** high-level policy should not depend on low-level details — both depend on an abstraction, and the **high-level module is the one that defines it.**

- That second half is the part people drop, and it is the whole principle. If the database team writes the interface and your service imports it, nothing was inverted — you renamed the coupling.
- **The smell:** a constructor that constructs. \`self.db = MySQLDatabase()\` inside \`__init__\` welds policy to a specific detail with no seam to cut.
- Second smell: to run one unit test you need a live server, a network, or an API key. "Untestable" is not a moral failing — it is a **design report**.
- The refactor: the service declares the tiny interface it needs, in its own vocabulary (\`all_users()\`, not \`execute_sql()\`), and receives an implementation through its constructor.
- **Testability is the practical payoff.** You are not doing this for architectural purity; you are doing it so a test double is three lines and the suite runs in milliseconds.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'D — hard-wired MySQL, then constructor injection',
      code: `from typing import Protocol

# ================= BAD: the service builds its own dependency ==============
class MySQLDatabase:
    def query(self, sql): return [('ada', 36), ('kid', 9)]

class UserService:
    def __init__(self):
        self.db = MySQLDatabase()          # hard-wired: cannot swap, cannot test
    def adults(self):
        rows = self.db.query('SELECT name, age FROM users')
        return [n for n, age in rows if age >= 18]

# To unit-test adults() you must install and run MySQL. That IS the bug.

# ================= GOOD: the HIGH-level module owns the interface ==========
class UserStore(Protocol):                 # declared in UserService's own layer
    def all_users(self) -> list[tuple[str, int]]: ...

class UserService:
    def __init__(self, store: UserStore):  # injected through the constructor
        self.store = store
    def adults(self):
        return [n for n, age in self.store.all_users() if age >= 18]

class MySQLUserStore:                      # low-level detail, conforms upward
    def __init__(self, conn): self.conn = conn
    def all_users(self): return self.conn.query('SELECT name, age FROM users')

class FakeUserStore:                       # the payoff: a test double in 3 lines
    def __init__(self, rows): self.rows = rows
    def all_users(self): return self.rows

svc = UserService(FakeUserStore([('ada', 36), ('kid', 9)]))
assert svc.adults() == ['ada']             # runs in microseconds, no database
print(svc.adults())
print(UserService(MySQLUserStore(MySQLDatabase())).adults())

# ['ada']
# ['ada']`,
      annotations: {
        9: 'The smell: a constructor call inside a constructor. UserService reached DOWN and picked its own implementation, so high-level policy now depends on a low-level detail with no seam between them.',
        14: 'The practical cost, stated plainly. Untestable is a design report: this class has a dependency it refuses to let you replace.',
        17: 'Inversion happens on this line. The interface is named in the SERVICE\'s vocabulary (all_users, not execute_sql) and lives in the service\'s layer — the database module now conforms upward. That direction is the whole principle.',
        21: 'Constructor injection: the caller decides. UserService can no longer name MySQL even if it wanted to — the import is gone from this layer entirely.',
        30: 'Testability, made concrete. The fake is three lines: no server, no fixtures, no docker-compose, no network flake.',
        35: 'The runnable check. Real business logic, zero I/O, microseconds. If writing this fake were hard, the dependency would still be pointing the wrong way.',
      },
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Dependency inversion, drawn: which way do the arrows point?',
        notice: 'Left column = the classes. Right column = what each one depends on. Watch the arrow flip from a concrete server to a contract the service itself owns.',
        leftLabel: 'classes',
        rightLabel: 'depends on',
        frames: [
          {
            note: 'Before. UserService constructs MySQLDatabase inside __init__. The arrow points DOWN from policy to detail, and it is welded — there is no parameter, no seam, nothing to cut.',
            stack: [{ name: 'UserService.adults()', to: 'mysql', danger: true }],
            heap: [
              { id: 'mysql', value: 'MySQLDatabase()', label: 'concrete class, built inside __init__', danger: true },
            ],
          },
          {
            note: 'The bill arrives at test time. test_adults() wants to check one comparison (age >= 18) but inherits the whole dependency: a live MySQL, a schema, seed rows. The only seam left is monkey-patching the module — a test smell that means the design, not the test, is wrong.',
            stack: [
              { name: 'UserService.adults()', to: 'mysql', danger: true },
              { name: 'test_adults()', to: 'mysql', danger: true },
            ],
            heap: [
              { id: 'mysql', value: 'MySQLDatabase() — live server', label: 'the unit test now needs a database running', danger: true },
            ],
          },
          {
            note: 'After. UserService declares the interface it needs — UserStore, one method, named in its own vocabulary — and takes it as a constructor argument. It depends on a shape, not on a server. Note who OWNS the protocol: the high-level module, not the database layer.',
            stack: [{ name: 'UserService(store)', to: 'proto' }],
            heap: [
              { id: 'proto', value: 'UserStore (Protocol)', label: 'owned by the HIGH-level module' },
            ],
          },
          {
            note: 'Both details now point UP at the same contract. Production wires MySQLUserStore, the test wires a three-line FakeUserStore, and UserService cannot tell the difference. That is the inversion — and testability is the payoff you can actually measure.',
            stack: [
              { name: 'UserService(store)', to: 'proto' },
              { name: 'MySQLUserStore', to: 'proto' },
              { name: 'FakeUserStore', to: 'proto' },
            ],
            heap: [
              { id: 'proto', value: 'UserStore (Protocol)', label: 'one contract, three classes agree on it' },
            ],
          },
        ],
      },
    },
    {
      type: 'note',
      md: `**The cost of DIP.** Nothing constructs itself any more, so somebody must wire everything — and that somebody is either a long \`main()\` or a DI framework nobody on the team fully understands. Jumping to a definition now lands on a protocol with no body, so "what actually runs here?" needs a runtime answer. And each indirection is a real reading cost for a newcomer chasing a bug at 3am.

**When NOT to apply it:** when there is exactly one implementation and there will only ever be one — an interface with a single implementer, added "in case we swap databases", is the textbook speculative abstraction (see YAGNI below). Standard library and pure functions need no inversion either: \`json.dumps\` and \`math.sqrt\` are not dependencies worth abstracting. **The honest trigger is testing, not swapping.** If the dependency does I/O — network, disk, clock, randomness — inject it. Otherwise let the class build what it needs.`,
    },
    {
      type: 'intuition',
      title: 'DRY, KISS, YAGNI — the three that actually save you',
      md: `SOLID is about structure. These three are about restraint, and they prevent more damage in practice.

- **DRY — do not repeat yourself.** The real statement (from *The Pragmatic Programmer*) is about **knowledge**, not text: every piece of knowledge should have one authoritative representation. Two identical lines that change for **different reasons are not duplication** — deduplicating them creates coupling, and the day one caller needs different behaviour, you add a boolean flag, then a second, and the shared "helper" becomes a switchboard nobody can change safely.
- The test to apply: *"when this rule changes, must both copies change together?"* Yes → one representation. No → leave them apart. **Duplication is far cheaper than the wrong abstraction** — you can always merge two copies later; unpicking a bad abstraction touches every caller.
- **KISS — keep it simple.** Clever code is code you will decode at 3am with a pager going off. Prefer the boring construct, the obvious name, the flat function. If explaining the design takes longer than reading a dumber version, the dumber version wins.
- **YAGNI — you are not gonna need it.** Do not build for requirements nobody has asked for. Speculative generality — the plugin system for one plugin, the config for a value that never changes, the interface with one implementation — is unfinished code that still costs full price in reading, testing and migration.
- The senior framing: YAGNI beats *maybe*, KISS beats *clever*, DRY beats *copy-paste of one idea* — and DRY loses to *coincidental similarity*.`,
    },
    {
      type: 'note',
      md: `**A concrete DRY trap.** \`validate_signup_email()\` and \`validate_invoice_email()\` are the same six lines today. Merge them into \`validate_email()\` and you have declared that signup rules and invoicing rules are the same knowledge. Six months later, signup must accept plus-addressing and invoicing must not — so a \`strict=True\` parameter appears, then \`allow_plus=\`, then a branch on the caller. The "duplication" you removed was coincidental; the coupling you introduced was real. Ask which stakeholder owns each copy: same owner → deduplicate; different owners → leave them alone and let them drift.`,
    },
    {
      type: 'intuition',
      title: 'The real failure mode: SOLID applied by reflex',
      md: `A 40-line problem, solved by a candidate who has just learned SOLID: an interface, a factory, an abstract base, a strategy, a config object, a DI container, twelve files. The requirement was "print an invoice".

- Every principle above costs **indirection** — and indirection is a debt paid by every future reader, including you.
- The principles are a **response to observed pain**, not a checklist you run upfront. You cannot know the axis of change before the change arrives; guessing wrong builds flexibility in the wrong direction, which is worse than no flexibility at all.
- Practical order of operations: write the boring, direct version. When a change hurts, notice **which** principle would have absorbed it, and refactor exactly that. Two data points before an abstraction; three before a framework.
- In an LLD interview, this is the difference between a mid and a senior answer. Anyone can recite five acronyms. Saying *"I would keep this one class for now — it has one reason to change today; the moment we add a second notification channel I would extract a Notifier protocol"* shows you know what the principles are **for**.
- Say the cost out loud, always. "This buys me X, it costs me Y, and I would do it when Z happens" is the sentence interviewers are listening for — in LLD exactly as much as in HLD.`,
    },
  ],
  quiz: [
    {
      question: 'A class `InvoiceService` has methods `calculate_tax()`, `render_pdf()`, and `upload_to_s3()`. Which principle does this snippet violate first?',
      options: [
        { text: 'Single Responsibility', explanation: 'Correct. Three reasons to change in one class: tax law, document layout, and storage infrastructure. Three different stakeholders will send three different change requests to the same file.' },
        { text: 'Open/Closed', explanation: 'Nothing here branches on a type or resists extension. OCP is about adding cases without editing; this is about unrelated jobs living together.' },
        { text: 'Liskov Substitution', explanation: 'There is no inheritance and no subclass in sight. LSP only applies when something substitutes for something else.' },
        { text: 'Interface Segregation', explanation: 'Close in spirit, but ISP is about what a CLIENT is forced to depend on. Here the problem is inside one concrete class with no interface at all.' },
      ],
      correct: 0,
    },
    {
      question: 'A function `area(shape)` is a chain of `if shape.kind == "circle" … elif "square" … elif "triangle"`, and every new shape means editing it. Which principle does this violate?',
      options: [
        { text: 'Liskov Substitution', explanation: 'LSP is about subclasses surprising callers. Here there are no subclasses — just a string tag and a branch.' },
        { text: 'Open/Closed', explanation: 'Correct. The function is closed for extension and open for modification — exactly backwards. Fix: each shape owns its own area(), dispatch via a protocol or registry.' },
        { text: 'Interface Segregation', explanation: 'No client is being forced to depend on unused methods. The problem is the dispatch, not the interface width.' },
        { text: 'Dependency Inversion', explanation: 'Nothing low-level is being constructed or hard-wired here. The coupling is to a set of TYPES, not to an implementation detail.' },
      ],
      correct: 1,
    },
    {
      question: '`class ReadOnlyList(list)` overrides `append()` to raise `NotImplementedError`. Which principle does this snippet violate?',
      options: [
        { text: 'Single Responsibility', explanation: 'The class has exactly one job. The problem is what it promises, not how many jobs it holds.' },
        { text: 'Dependency Inversion', explanation: 'No dependency direction is involved — this is a subclass making a promise it will not keep.' },
        { text: 'Liskov Substitution', explanation: 'Correct. Any function written against `list` may call `append()`. Passing a ReadOnlyList breaks it — the subtype narrows what the parent accepted. The fix is not to subclass list: expose a read-only VIEW that never claimed to append.' },
        { text: 'Open/Closed', explanation: 'Nothing is being extended by modification here. The damage happens at substitution time, in the caller.' },
      ],
      correct: 2,
    },
    {
      question: '`class PriceService: def __init__(self): self.client = StripeClient()`. Which principle does this violate, and what is the practical symptom?',
      options: [
        { text: 'KISS — it is too clever', explanation: 'It is the opposite of clever; it is direct. Directness is not the problem here, coupling is.' },
        { text: 'Liskov Substitution', explanation: 'No subclass, no substitution. LSP has nothing to say about a constructor call.' },
        { text: 'Interface Segregation', explanation: 'No fat interface, no forced stubs. The problem is what the class CONSTRUCTS, not what it must implement.' },
        { text: 'Dependency Inversion — and the symptom is that a unit test now needs Stripe', explanation: 'Correct. High-level pricing policy hard-wires a low-level detail with no seam. The tell is always testability: no way to pass a fake means no way to test without the network.' },
      ],
      correct: 3,
    },
    {
      question: 'What is the FORMAL statement of a Liskov violation?',
      options: [
        { text: 'The subclass adds methods the parent does not have', explanation: 'Adding methods is always safe — no existing caller can be affected by a method it does not know about.' },
        { text: 'The subclass narrows a precondition (accepts less) or widens a postcondition (guarantees less) than the parent promised', explanation: 'Correct. Square widening set_height\'s postcondition from "height changes" to "both change" is exactly this. Everything else — raised stubs, ignored arguments, isinstance checks in callers — is a symptom of one of these two.' },
        { text: 'The subclass overrides a parent method', explanation: 'Overriding is the entire point of inheritance. It only becomes a violation when the override weakens the contract.' },
        { text: 'The subclass has more fields than the parent', explanation: 'Fields are implementation. LSP is about the observable contract callers rely on.' },
      ],
      correct: 1,
    },
    {
      question: 'Two modules contain the identical six-line email validation. Should you extract a shared helper?',
      options: [
        { text: 'Always — duplication is the root of all evil', explanation: 'This reflex is what produces switchboard helpers full of boolean flags. DRY is about knowledge, not matching characters.' },
        { text: 'Only if both copies must change together when the rule changes', explanation: 'Correct. Same knowledge, one owner, changes together → extract. Coincidentally identical text owned by different stakeholders → leave it. Duplication is cheaper than the wrong abstraction: merging later is easy, unpicking is not.' },
        { text: 'Never — shared code always causes coupling', explanation: 'Too far the other way. Genuinely shared knowledge with one owner (a tax rule, a currency format) belongs in exactly one place.' },
        { text: 'Only if the two modules are in the same package', explanation: 'Physical location says nothing about whether the two rules represent the same knowledge.' },
      ],
      correct: 1,
    },
    {
      question: 'A teammate\'s PR adds `UserRepository` (an interface) with exactly one implementation, `PostgresUserRepository`, "in case we swap databases later". Best review comment?',
      options: [
        { text: 'Approve — this is textbook Dependency Inversion', explanation: 'DIP is about a real seam, usually a testing one. Ceremony with one implementer and no test double is not inversion, just an extra file.' },
        { text: 'Reject — interfaces are always over-engineering', explanation: 'Also wrong. The interface earns its place the moment it enables a test double or a second implementation actually exists.' },
        { text: 'Ask what it buys today: if it enables a test double, keep it; if it exists only for a hypothetical swap, that is YAGNI', explanation: 'Correct. The question is never "is this SOLID" but "what does this cost and what does it buy now". A fake in the test suite is a real second implementation and settles the argument.' },
        { text: 'Ask them to add three more implementations for symmetry', explanation: 'Building implementations nobody asked for multiplies the speculative cost instead of removing it.' },
      ],
      correct: 2,
    },
    {
      question: 'A candidate solves a 40-line invoice problem with an abstract base, a factory, a strategy, a config object and twelve files. What is the honest senior critique?',
      options: [
        { text: 'The abstractions were applied upfront by reflex — SOLID responds to observed pain, and guessing the axis of change wrong builds flexibility in the wrong direction', explanation: 'Correct. Each layer is indirection every future reader pays for, and the design is now extensible along axes nobody needed while still rigid where change actually arrives.' },
        { text: 'It is correct SOLID and should be praised', explanation: 'Reciting five acronyms is the mid-level answer. Naming the cost and the trigger is the senior one.' },
        { text: 'It violates Liskov Substitution', explanation: 'Nothing described breaks substitutability. The problem is volume of abstraction, not a broken contract.' },
        { text: 'The problem is that Python does not need interfaces', explanation: 'Python has protocols and uses them well. The issue is applying abstraction before there is a second case, in any language.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Give me SOLID in five sentences — one per letter, no textbook phrasing.',
      answer:
        'S: a class should have one reason to change — if two different stakeholders send change requests to the same file, split it. O: you should be able to add a case by writing a new class, not by editing a tested if-chain. L: anywhere the parent works the subclass must work, without the caller knowing which it got. I: no client should be forced to depend on methods it never calls, so prefer several small protocols to one fat interface. D: high-level policy must not construct low-level details — it declares the interface it needs and receives an implementation, which is what makes it testable. The sixth sentence, the one that matters: every one of these costs indirection, so I apply them when a change hurts, not before.',
      isCaseBased: false,
    },
    {
      question: 'Case: here is a class. `Order` holds line items, computes the total, renders an invoice string, writes itself to Postgres, and emails the customer. Refactor it out loud.',
      answer:
        'First I name the reasons to change, because that is the split: pricing rules (business), invoice layout (marketing/design), the DB schema (infra), the mail provider (infra again, different vendor). Four owners, one file — SRP violation. The refactor: Order keeps line items and total() only, since that is the knowledge the business owns and it almost never changes. InvoiceFormatter takes an Order and returns text. OrderRepository takes an Order and persists it. OrderNotifier takes an Order plus a formatter and sends. Wiring moves to main() or a factory, so assembly is readable in one place. Two things I would say unprompted: the repository should be injected against a protocol the service layer owns, so tests use a fake instead of Postgres — that is DIP, and testability is the payoff. And the cost: one class became four plus wiring, so a newcomer opens four files to follow a checkout. I would still do it here, because these four genuinely change at different times for different people. If the invoice were three lines and never touched, I would leave it on Order.',
      isCaseBased: true,
    },
    {
      question: 'Case: I hand you a 40-line ImportJob class that both parses a CSV and validates the rows. When would you NOT split a class, even though it clearly does two things?',
      answer:
        'When the two things always change together. A 40-line CSV importer that parses and validates has two nouns but one reason to change: the file format. Splitting produces two anaemic classes and a wiring line, and every future format change edits both anyway — pure cost, no benefit. Other honest cases: the class fits on one screen and no one has ever edited it for two different reasons; the "split" would just move fields into a class whose only job is to pass them back; or the code is a leaf that will be deleted in a quarter. My trigger is observed, not imagined: the second time two different reasons touch the same file — two different people, two different tickets — I split, and I split along the seam those tickets actually revealed rather than the seam I guessed. In an interview I say exactly that out loud, because "I would keep this as one class for now, and here is the event that would make me split it" is a stronger answer than splitting on reflex.',
      isCaseBased: true,
    },
    {
      question: 'Case: you inherit a `process_payment()` function with a 300-line if/elif chain over eight payment providers, and you have been asked to add a ninth. What do you do, and how do you ship it safely?',
      answer:
        'The diagnosis is Open/Closed: nine providers means nine edits to one shipped, tested function, and the same chain is probably duplicated in refund() and receipt(). Target design: a PaymentMethod protocol with charge/refund/receipt, one class per provider in its own file, and a registry dict mapping provider key to instance so the dispatch function never changes again. That is the Strategy pattern — worth naming, because OCP is the principle and Strategy is the usual shape. How I ship it safely, which is the real question: first characterization tests around the existing function so I have a behavioural net; then extract providers one at a time, strangler-style, with the if-chain falling through to the registry for the ones already moved; then the ninth provider is written directly as a new class, proving the seam works; then delete the chain when it is empty. What I would not do is rewrite all eight in one PR — the diff is unreviewable and the rollback is all-or-nothing. Cost I would state: control flow becomes indirect, and a provider whose module is never imported silently disappears from the registry, so I would add a startup assertion on the expected key set.',
      isCaseBased: true,
    },
    {
      question: 'Explain Liskov Substitution with a real example, and tell me why adding a type check is not the fix.',
      answer:
        'The classic honest one: Rectangle has independent set_width and set_height; Square inherits and makes each set both, to keep its own invariant. A caller written long ago does set_width(5), set_height(4), expects area 20 — and gets 16 for a Square. Nothing raises. The caller was correct and unchanged; it broke because a subclass arrived. Formally, Square widened set_height\'s postcondition — it guarantees less than Rectangle promised. Why isinstance(shape, Square) in the caller is not a fix: it makes every caller responsible for knowing about every subclass, which is an Open/Closed violation bolted on top of the Liskov one, and the next caller written by someone else will forget the check. The fix is re-modelling: drop the shared mutable setters, make both immutable with a scaled(k) operation and an area(), and let them be siblings that share a capability rather than parent and child. General rule: model the shared BEHAVIOUR, not the noun taxonomy — inheritance is a promise about how objects behave, not a statement about what they are.',
      isCaseBased: false,
    },
    {
      question: 'Interface Segregation and Single Responsibility sound like the same thing. Untangle them.',
      answer:
        'They point at the same instinct from opposite sides. SRP is about the IMPLEMENTATION: how many reasons does this class have to change? ISP is about the CLIENT: how much is this caller forced to depend on to do its one job? A class can satisfy SRP and still violate ISP — a well-factored Repository with one reason to change but fifteen methods, where a read-only report handler is forced to depend on all fifteen, mocks all fifteen in tests, and recompiles when any of them changes. And the reverse exists too: tiny segregated interfaces implemented by one god class that still has six reasons to change. Practical tells: SRP violations show up as merge conflicts between teams and as tests that need unrelated infrastructure; ISP violations show up as NotImplementedError stubs and as test doubles with a pile of methods that are never called.',
      isCaseBased: false,
    },
    {
      question: 'Why does `typing.Protocol` make Interface Segregation cheaper in Python than ABCs do?',
      answer:
        'Protocols are structural: a class conforms by having the right methods, with no inheritance, no registration, and no import of the protocol at all. So splitting one fat interface into five capability protocols costs the implementers nothing — they do not change, they do not gain base classes, and there is no diamond to reason about. ABCs are nominal: conformance requires inheriting or explicitly registering, so every split ripples into every implementer, and multiple inheritance becomes the mechanism for combining capabilities. Protocols also let you declare an interface for code you do not own — the third-party client with the right method shape conforms automatically. Two honest caveats: protocol checks are static (mypy) unless you add @runtime_checkable, and runtime_checkable isinstance only verifies method NAMES, not signatures — so it will happily accept an object whose method takes the wrong arguments. ABCs still win when you want shared implementation in a base class or a hard runtime guarantee at construction time.',
      isCaseBased: false,
    },
    {
      question: 'Dependency Injection, Dependency Inversion, and an IoC container are three different things. Distinguish them.',
      answer:
        'Dependency Inversion is the principle: high-level modules and low-level modules both depend on an abstraction, and crucially the high-level module OWNS that abstraction — it is named in the policy layer\'s vocabulary (all_users, not execute_sql) and the database module conforms upward. Dependency Injection is one technique for achieving it: pass the dependency in, usually through the constructor, instead of constructing it inside. An IoC container is a tool that automates the injection wiring by resolving a dependency graph for you. The distinction that catches people: you can do DI with zero inversion — passing in a concrete MySQLDatabase parameter is injection, but the service still depends on a detail, so nothing was inverted. And you never need a container: a plain main() that constructs objects in order is dependency injection, and for most services it is the better choice because the wiring stays readable.',
      isCaseBased: false,
    },
    {
      question: 'What is the strongest practical argument for Dependency Inversion, and when do you skip it?',
      answer:
        'Testability, and it is measurable rather than philosophical. With the dependency injected, a fake store is three lines and the test runs in microseconds with no server, no fixtures, no docker-compose, no network flake — so people actually write the tests. With it hard-wired, testing one comparison requires a live database, so the test either does not exist or is slow and flaky. Where I skip it: pure functions and standard library calls — nobody should abstract math.sqrt or json.dumps; and any dependency with exactly one implementation that does no I/O, where the interface is pure ceremony. My rule of thumb: if the dependency touches the outside world — network, disk, clock, randomness, environment — inject it, because those are exactly the things a test needs to control. Otherwise let the class construct what it needs and keep the code readable.',
      isCaseBased: false,
    },
    {
      question: 'DRY is supposed to be obvious. Where does it go wrong?',
      answer:
        'DRY is about knowledge, not text. Two blocks that look identical but change for different reasons are not duplication, and merging them creates coupling between things that were independent. The failure sequence is always the same: extract validate_email() from signup and invoicing; six months later signup must allow plus-addressing and invoicing must not; a strict=True parameter appears, then allow_plus=, then a branch on the caller — and the shared helper becomes a switchboard nobody can change without auditing every call site. The test I apply before extracting: when this rule changes, must both copies change together? Yes, same owner, same knowledge — extract. No — leave them apart and let them drift. The asymmetry is the point: merging two duplicates later is a small mechanical change, while unpicking a wrong abstraction touches every caller. Duplication is cheaper than the wrong abstraction.',
      isCaseBased: false,
    },
    {
      question: 'Case: a junior on your team writes a plugin system, a config file and a factory for a feature with exactly one variant. Their defense is "we will need it later". How do you handle the review?',
      answer:
        'I would not argue about SOLID, because they can quote it back at me. I would ask three concrete questions. What does this buy us today — is there a second implementation, or a test double that uses the seam? What does it cost — how many files does a newcomer open to answer "what runs when a user clicks pay"? And if the change we are guessing at arrives shaped differently, what happens — because that is the real risk: flexibility built along the wrong axis is worse than none, since now you must dismantle it before you can adapt. Then I would offer the cheaper path: ship the direct version, and add a one-line note about where the seam would go. The second variant is the moment to extract it, and by then we will know the actual axis of change instead of guessing. I would also be honest that this is judgement, not law: if the second plugin is already specced for next sprint, the abstraction is not speculative and I would keep it.',
      isCaseBased: true,
    },
    {
      question: 'How do SOLID principles relate to design patterns — are they the same thing?',
      answer:
        'Principles are the WHY, patterns are the HOW. SOLID names a force; a pattern is a shape people converged on for obeying it. Open/Closed is usually satisfied by Strategy (swap the algorithm behind an interface) or by Observer (add a listener without editing the publisher); Dependency Inversion usually shows up as constructor injection plus a Factory or a container that does the wiring; Interface Segregation shows up as Adapter, which fits a fat third-party interface into the narrow one your client actually wants; Single Responsibility is what pushes construction logic out into a Builder. Two things to say in an interview: patterns are not goals — reaching for Factory before you have two products is the same reflex error as applying SOLID upfront. And you can honour every principle with no named pattern at all: a plain dict of functions satisfies Open/Closed perfectly well, and is usually the lazier, more readable option than a class hierarchy.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'S — Single Responsibility, one sentence + its smell', back: 'One reason to change — one stakeholder, one axis. Smell: you need the word "and" to describe the class, or two teams keep colliding in the same file. Cost: more classes plus wiring; do not split things that always change together.' },
    { front: 'O — Open/Closed, one sentence + its smell', back: 'Open for extension, closed for modification: add a class, do not edit a tested function. Smell: an if/elif chain that grows one branch per new type. Fix: interface + registry (this is Strategy).' },
    { front: 'L — Liskov Substitution, one sentence + its smell', back: 'A subclass must work anywhere the parent works, without the caller knowing. Smell: an override that raises NotImplementedError, or isinstance checks appearing in callers.' },
    { front: 'The FORMAL Liskov violation', back: 'The subtype narrows a precondition (accepts less than the parent promised to accept) or widens a postcondition (guarantees less than the parent promised to deliver). Square widening set_height from "height changes" to "both change" is exactly this.' },
    { front: 'I — Interface Segregation, one sentence + its smell', back: 'No client should depend on methods it does not use. Smell: a stub method that raises just to satisfy a base class; a test that mocks eight methods to exercise one. Fix: small capability protocols.' },
    { front: 'D — Dependency Inversion, and the half people forget', back: 'Policy and details both depend on an abstraction — and the HIGH-level module owns it, named in its vocabulary (all_users, not execute_sql). If the DB layer writes the interface, nothing was inverted.' },
    { front: 'DIP vs DI vs IoC container', back: 'DIP = the principle (depend on an abstraction the high-level module owns). DI = the technique (pass it in, usually via the constructor). IoC container = a tool that automates the wiring. You can inject a concrete class and invert nothing.' },
    { front: 'The practical payoff of DIP', back: 'Testability. Injected → a fake is three lines and the test runs in microseconds. Hard-wired → testing one comparison needs a live database. Rule: if it does I/O (network, disk, clock, randomness), inject it.' },
    { front: 'DRY, stated correctly', back: 'One authoritative representation per piece of KNOWLEDGE, not per matching text. Test: when the rule changes, must both copies change together? No → not duplication. Duplication is cheaper than the wrong abstraction.' },
    { front: 'The SOLID failure mode', back: 'Applied by reflex it produces a 12-file maze for a 40-line problem. The principles respond to observed pain; guessing the axis of change wrong builds flexibility in the wrong direction. Write the direct version, refactor when a change hurts.' },
  ],
  mindmapMarkdown: `- SOLID: Bad-to-Good Refactors
  - What LLD rounds test
    - "Now add X" — how much of the design moves?
  - S — Single Responsibility
    - One reason to change; smell is the word "and"
    - Split: Order / Formatter / Repository / Notifier
    - Skip it when things always change together
  - O — Open/Closed
    - Smell: an if/elif chain growing per type
    - Fix: Protocol + registry dict (this is Strategy)
    - Cost: control flow becomes invisible
  - L — Liskov Substitution
    - Square breaks stretch(): prints 16, not 20
    - Formal: narrowed precondition / widened postcondition
    - Fix by re-modelling, never by isinstance
  - I — Interface Segregation
    - Smell: NotImplementedError stubs
    - typing.Protocol is structural, so ISP is cheap here
    - Cost: interface explosion
  - D — Dependency Inversion
    - The HIGH-level module owns the interface
    - Smell: a constructor calling a constructor
    - Payoff: testability — a fake in three lines
  - DRY / KISS / YAGNI
    - DRY = knowledge, not matching text
    - The wrong abstraction costs more than duplication
    - YAGNI: no interface for one implementation
  - The failure mode
    - 12 files for a 40-line problem
    - Response to observed pain, not a checklist`,
}

export default m
