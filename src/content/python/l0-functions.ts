import type { Module } from '../types'

const m: Module = {
  id: 'py-l0-functions',
  subjectId: 'python',
  level: 0,
  title: 'Functions, Scope & *args/**kwargs',
  whyItMatters:
    'Python screeners love three cheap kills: a function that silently returns None, a *args signature you cannot read, and a scope question that throws UnboundLocalError. This module closes all three. Bonus: *args/**kwargs is the literal syntax of every decorator you will write at Level 3 — learn the shape now and that whole level becomes easy.',
  estMinutes: 45,
  sections: [
    {
      type: 'intuition',
      title: 'A function is a vending machine',
      md: `You feed it inputs, it hands something back through the flap. The flap is \`return\`.

- \`def\` builds the machine and gives it a name. Nothing runs yet.
- Calling it — \`area(3, 4)\` — is pressing the button: NOW the body runs.
- \`return\` does two jobs at once: **stop the function** and **hand a value back**.
- No \`return\`? The machine still drops something: \`None\` — Python's object meaning "nothing here".
- This is the number one silent bug: you call a function, forget it never returns, and carry \`None\` around until something crashes three files later.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'return vs no return',
      code: `def area(w, h):
    return w * h          # stop here, hand back 12

def log(msg):
    print('[LOG]', msg)   # prints to screen, returns nothing

x = area(3, 4)
y = log('hello')          # y is None -- print is not return
print(x, y)               # 12 None`,
      annotations: {
        2: 'return exits immediately. Any line after a hit return never runs.',
        5: 'No return statement -> Python inserts an invisible "return None".',
        8: 'The classic trap. Printing a value and returning it are different things — y caught None.',
      },
    },
    {
      type: 'intuition',
      title: 'Positional vs keyword: boxes vs labels',
      md: `Think of a courier form. Positional arguments are blank boxes filled **in order**. Keyword arguments are **labeled** boxes — order stops mattering.

- \`connect('db', 5432)\` — positional: first value → first parameter, second → second.
- \`connect(port=5432, host='db')\` — keyword: name each one, any order.
- Parameters can carry **default values**: \`def connect(host, port=5432)\`. Skip \`port\` at the call and the default fills in.
- Defaulted parameters must come *after* plain ones in the \`def\` line.
- One hard rule at call sites: positional args first, keyword args after. \`f(x=1, 2)\` is a SyntaxError.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'All the legal (and one illegal) ways to call',
      code: `def connect(host, port=5432, timeout=30):
    print(host, port, timeout)

connect('db.prod')                  # defaults fill port and timeout
connect('db.prod', 5433)            # positional, in order
connect('db.prod', timeout=5)       # skip port, name what you change
connect(port=5433, host='db.prod')  # keywords: any order
# connect(timeout=5, 'db.prod')     # SyntaxError: positional after keyword`,
      annotations: {
        1: 'Parameters with = have defaults. They must sit after the ones without.',
        6: 'The killer feature of keywords: jump over defaults you like and set only what you need.',
        8: 'Once you go keyword at a call site, you cannot go back to positional.',
      },
    },
    {
      type: 'note',
      md: 'One trap to forward-book: never use a **mutable** default like `def f(items=[])` — the list is built once at `def` time and shared across every call. Full story (and the fix) in the mutability module.',
    },
    {
      type: 'intuition',
      title: '*args and **kwargs: the overflow bags',
      md: `You host a party without knowing how many guests come. You need two containers for the extras.

- \`*args\` is the bag for extra **unnamed** guests: every leftover positional argument, collected into a **tuple**.
- \`**kwargs\` is the guestbook for extra **named** guests: every leftover keyword argument, collected into a **dict**.
- The names \`args\`/\`kwargs\` are convention only — the stars do the work.
- You already use this daily: \`print(1, 2, 3, sep='-')\` is a \`*args\` + \`**kwargs\` signature.
- Full signature order, worth memorizing: plain params → defaults → \`*args\` → \`**kwargs\`.`,
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `def inspect(*args, **kwargs):
    print('args   =', args, type(args).__name__)
    print('kwargs =', kwargs, type(kwargs).__name__)

inspect(1, 2, 3, mode='fast', retries=2)

nums = [10, 20, 30]
opts = {'sep': ' | '}
print(*nums, **opts)      # unpacking at the CALL site

def greet(name):
    return 'hi ' + name

say = greet               # functions are values: new name, same function
print(say('ada'))

result = print('no return here')
print(result)             # a function without return gives back None`,
        precomputedOutput: `args   = (1, 2, 3) tuple
kwargs = {'mode': 'fast', 'retries': 2} dict
10 | 20 | 30
hi ada
no return here
None`,
        caption:
          'Positional extras land in a tuple, keyword extras in a dict. Change the call to inspect() and predict both lines before running.',
      },
    },
    {
      type: 'intuition',
      title: 'The stars work in reverse too: unpacking at the call',
      md: `In a \`def\` line the stars **collect**. At a call site the same stars **explode**.

- \`draw(*point)\` — unzip the sequence: each element becomes one positional argument.
- \`draw(**style)\` — unzip the dict: each key=value becomes one keyword argument.
- Collect on the way in, explode on the way out — chain them and a function forwards *everything* it received: \`def wrapper(*args, **kwargs): return real(*args, **kwargs)\`.
- That pass-through line IS the decorator pattern you will meet at Level 3. Same syntax, nothing new to learn later.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Unpack, then forward',
      code: `def draw(x, y, color='black'):
    print('point', x, y, color)

point = (3, 7)
style = {'color': 'red'}

draw(*point, **style)     # same as draw(3, 7, color='red')

def wrapper(*args, **kwargs):
    print('forwarding...')
    return draw(*args, **kwargs)

wrapper(1, 2, color='blue')`,
      annotations: {
        7: '* explodes the tuple into positional args, ** explodes the dict into keyword args.',
        9: 'Stars in the def line: collect whatever arrives.',
        11: 'Stars at the call: hand it all onward untouched. This exact shape is every decorator ever written.',
      },
    },
    {
      type: 'intuition',
      title: 'LEGB: where Python looks for a name',
      md: `You lost your keys. You check your jacket pocket, then the room you are in, then the whole house, then the city lost-and-found. First hit wins — you stop looking.

- **L**ocal — inside the current function.
- **E**nclosing — the function wrapping this one (if any).
- **G**lobal — the top level of the file (module).
- **B**uilt-in — Python's own names: \`len\`, \`print\`, \`range\`.
- That exact order, every time you *read* a name. Writing is a different story — next code block.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'LEGB in action',
      code: `x = 'global'

def outer():
    x = 'enclosing'
    def inner():
        x = 'local'
        print(x)      # 'local'
    inner()
    print(x)          # 'enclosing'

outer()
print(x)              # 'global'`,
      annotations: {
        6: 'Assignment inside a function creates a NEW local name. It shadows the outer ones; it never touches them.',
        7: 'Lookup walks L -> E -> G -> B and stops at the first hit: local wins here.',
        9: 'inner() changed nothing out here — its x lived and died inside inner.',
      },
    },
    {
      type: 'note',
      md: 'Gotcha with a name: assign to `x` **anywhere** in a function and Python treats `x` as local for the *whole* function. So `n += 1` with no local `n` dies with **UnboundLocalError** — the read of local `n` happens before it exists. The fixes are the two keywords below.',
    },
    {
      type: 'code',
      lang: 'python',
      title: 'nonlocal and global: permission to write outward',
      code: `def counter():
    n = 0
    def bump():
        nonlocal n    # 'n' now means the enclosing n
        n += 1
        return n
    return bump

c = counter()
print(c(), c(), c())  # 1 2 3

total = 0
def add(x):
    global total      # write the module-level total
    total += x`,
      annotations: {
        4: 'Without this line, n += 1 raises UnboundLocalError — assignment made n local, and local n has no value yet.',
        7: 'bump remembers its enclosing n between calls — a closure. Deep dive at Level 3.',
        14: 'global works but reads as a design smell: hidden shared state. Prefer return values, or a class once you learn OOP.',
      },
    },
    {
      type: 'intuition',
      title: 'Functions are things, not just actions',
      md: `In Python a function is a value, exactly like \`42\` or \`'hello'\`. This is called being a **first-class object**.

- Assign it: \`speak = shout\` — two names, one function. No parentheses: \`shout\` is the object, \`shout()\` is a *call*.
- Pass it: \`sorted(words, key=len)\` hands the \`len\` function to \`sorted\`, which calls it once per word.
- Store it: a dict of functions replaces an if/elif chain — pick behavior by key.
- This one idea powers callbacks, \`map\`/\`filter\`, sort keys, and decorators. It is why \`def\` matters: it *creates a function object* and binds a name to it — at runtime, like any other assignment.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Assign it, pass it',
      code: `def shout(s):
    return s.upper() + '!'

def whisper(s):
    return s.lower() + '...'

speak = shout                  # assign: a function is a value
print(speak('hey'))            # HEY!

def apply(fn, word):
    return fn(word)            # call whatever function arrived

print(apply(whisper, 'HEY'))   # hey...

words = ['banana', 'fig', 'apple']
print(sorted(words, key=len))  # ['fig', 'apple', 'banana']`,
      annotations: {
        7: 'No parentheses. speak = shout copies the reference; speak = shout() would call it and store the RESULT.',
        11: 'fn is whatever the caller handed over — a callback in one line.',
        16: 'Pass len itself as the sorting rule. sorted calls it per element. key=len() would crash: that calls len with no argument.',
      },
    },
    {
      type: 'note',
      md: 'Recap in four lines: `return` or you get `None`. Extras collect into `*args` (tuple) and `**kwargs` (dict); the same stars explode sequences and dicts at call sites. Names resolve L→E→G→B; writing outward needs `nonlocal`/`global`. And a function is a value — `f` passes it, `f()` runs it.',
    },
  ],
  quiz: [
    {
      question: 'def f(): print("hi")  — then x = f(). What is x?',
      options: [
        { text: 'The string "hi"', explanation: 'print sends "hi" to the screen — it does not hand it back to the caller. Only return does that.' },
        { text: 'None', explanation: 'Correct. No return statement means Python inserts an invisible "return None". Printing and returning are different channels.' },
        { text: 'An error — f returns nothing to assign', explanation: 'No error: every function call produces a value, and the fallback value is None.' },
      ],
      correct: 1,
    },
    {
      question: 'Inside def f(*args), what type is args?',
      options: [
        { text: 'list', explanation: 'Close — it is a sequence, but an immutable one. Python packs extras into a tuple.' },
        { text: 'tuple', explanation: 'Correct. Extra positional arguments arrive frozen in a tuple — you can read and loop, not append.' },
        { text: 'dict', explanation: 'The dict is what **kwargs collects — named arguments. *args holds the unnamed ones.' },
      ],
      correct: 1,
    },
    {
      question: 'What does the call f(x=1, 2) do?',
      options: [
        { text: 'Passes x=1 and 2 normally', explanation: 'It never runs — the parser rejects it before Python executes anything.' },
        { text: 'SyntaxError: positional argument after keyword argument', explanation: 'Correct. Call-site rule: all positional args first, keywords after. Once you name one, no more bare values.' },
        { text: 'TypeError at runtime', explanation: 'TypeError is for wrong argument counts or duplicate values at runtime — this one dies earlier, at parse time.' },
      ],
      correct: 1,
    },
    {
      question: 'nums = [1, 2, 3]. What does f(*nums) mean?',
      options: [
        { text: 'Pass the list as one argument', explanation: 'That is plain f(nums) — one parameter receives the whole list. The star changes the game.' },
        { text: 'Exactly f(1, 2, 3) — the star explodes the list into separate positional args', explanation: 'Correct. At a call site * unpacks a sequence; each element becomes its own argument.' },
        { text: 'Multiply nums before passing', explanation: 'No arithmetic here — in argument position the star means unpack, not multiply.' },
      ],
      correct: 1,
    },
    {
      question: 'x = 1 at module level. Inside outer(): x = 2, and inside its nested g(): print(x). Calling g prints…',
      options: [
        { text: '1', explanation: 'Global is checked only if Local and Enclosing miss. The enclosing outer() has an x, so the search stops there.' },
        { text: '2', explanation: 'Correct. LEGB: g has no local x, so Python finds the Enclosing x = 2 before ever reaching the global.' },
        { text: 'UnboundLocalError', explanation: 'That needs an ASSIGNMENT to x inside g. Pure reads never trigger it.' },
      ],
      correct: 1,
    },
    {
      question: 'n = 0 at module level. def f(): n += 1. Calling f() gives…',
      options: [
        { text: 'n becomes 1', explanation: 'It would with "global n". Without it, the assignment makes n local — and the local n has no starting value.' },
        { text: 'UnboundLocalError', explanation: 'Correct. n += 1 assigns to n, so Python marks n local for the whole function — then the read of local n finds nothing.' },
        { text: 'A fresh local n each call, global untouched, no error', explanation: 'That happens with n = 1 (pure assignment). n += 1 must READ n first, and the local n does not exist yet.' },
      ],
      correct: 1,
    },
    {
      question: 'sorted(words, key=len) vs sorted(words, key=len()) — which is right and why?',
      options: [
        { text: 'key=len — pass the function itself; sorted calls it once per element', explanation: 'Correct. Functions are first-class values: no parentheses hands over the function as the sorting rule.' },
        { text: 'key=len() — you must call it to activate it', explanation: 'len() runs immediately, with no argument — TypeError before sorted even starts.' },
        { text: 'Both work the same', explanation: 'They are completely different: len is an object you pass, len() is a call you make right now.' },
      ],
      correct: 0,
    },
    {
      question: 'def f(**kwargs) is called as f(a=1, b=2). Inside, kwargs is…',
      options: [
        { text: "{'a': 1, 'b': 2} — a dict of the keyword arguments", explanation: 'Correct. ** collects every unclaimed keyword argument into a plain dict, keys as strings.' },
        { text: '(1, 2) — a tuple of the values', explanation: 'The tuple is *args territory, and it would also lose the names — the whole point of keywords.' },
        { text: "[('a', 1), ('b', 2)] — a list of pairs", explanation: 'Python gives you a real dict, so kwargs["a"] just works.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain *args and **kwargs. When do you actually reach for them — and when should you not?',
      answer:
        'In a def line, *args collects extra positional arguments into a tuple, **kwargs collects extra keyword arguments into a dict. Reach for them when you genuinely cannot know the arguments in advance: wrappers and decorators that must forward everything (`return fn(*args, **kwargs)`), APIs like print() that take any count, or adapters passing options through layers. Do NOT use them as laziness in normal APIs: `def save(*args, **kwargs)` destroys discoverability, IDE help, and type checking — callers cannot see what is legal. Tradeoff in one line: flexibility for the wrapper, opacity for the caller. Explicit parameters win unless forwarding is the job.',
      isCaseBased: false,
    },
    {
      question: 'Prod bug: a call crashes with "TypeError: draw() got multiple values for argument \'x\'". Walk me through the debugging.',
      answer:
        "That error means x arrived twice: once positionally, once by name. Steps: (1) Read the signature — say `def draw(x, y, **opts)`. (2) Find the call site. The classic cause is a dict unpack that also contains the key: `draw(3, 7, **style)` where style = {'x': 9, ...} — 3 filled x positionally, then **style delivered x again. (3) Confirm by printing the dict's keys before the call. Fixes, by preference: clean the dict so it only carries true options; or pass everything by keyword; or make the function accept positional-only params (`def draw(x, y, /, **opts)`) so a stray 'x' key cannot collide. The transferable lesson: ** unpacking makes dict CONTENTS part of the call — audit what is in the dict, not just the call line.",
      isCaseBased: true,
    },
    {
      question: 'Prod bug: a helper "sometimes returns None" and the caller crashes with AttributeError: \'NoneType\' object has no attribute … Walk me through it.',
      answer:
        "NoneType errors are rarely about None — they are about a function with a path that forgets to return. Steps: (1) Find where the None was BORN, not where it crashed: trace the value backward to the producing function. (2) Read that function looking for branches — typically `if cond: return result` with no else, so the fall-through returns None implicitly. Another classic: `return items.sort()` — list.sort() mutates and returns None (use sorted()). (3) Fix by making every path return explicitly, and raise on truly invalid input rather than silently returning None. (4) Prevent recurrence: a return-type hint (`-> Result`) plus mypy flags missing-return branches at commit time, and a unit test for the branch that fell through. Tradeoff worth naming: returning None as a sentinel is fine IF documented and checked; the crime is the implicit accidental None.",
      isCaseBased: true,
    },
    {
      question: 'What is the full ordering rule for parameters in a def line?',
      answer:
        'Plain (required) parameters → parameters with defaults → *args → keyword-only parameters → **kwargs. Example: `def f(a, b=2, *args, mode, **kwargs)` — everything after *args can only be passed by name (mode here is keyword-only). Two things interviewers probe: defaults cannot come before required params (Python cannot tell which box you meant), and a bare `*` with no name (`def f(a, *, verbose=False)`) exists purely to force keyword-only style — great for boolean flags, since `f(data, verbose=True)` reads and `f(data, True)` does not.',
      isCaseBased: false,
    },
    {
      question: 'Explain the LEGB rule — and why assignment can cause UnboundLocalError for a variable that clearly exists.',
      answer:
        'Name lookup order: Local scope, then Enclosing function, then Global (module), then Built-ins — first hit wins. The twist: scope membership is decided at COMPILE time, not line by line. If a name is assigned anywhere in a function, it is local for the entire function. So with global n = 0, a function containing only `n += 1` fails: the assignment made n local, and the read half of += looks up local n before it has any value → UnboundLocalError. The variable "clearly exists" — but in a scope the function was told to ignore. Fixes: `global n`, `nonlocal n` (enclosing case), or better, take it as a parameter and return the new value.',
      isCaseBased: false,
    },
    {
      question: 'global vs nonlocal — when is each correct, and why do reviewers frown at global?',
      answer:
        'nonlocal rebinds a variable in the nearest ENCLOSING function — the closure case, e.g. a counter() factory whose inner bump() does `nonlocal n; n += 1`. global rebinds a MODULE-level name. nonlocal has legitimate daily use (closures, decorators keeping state). global is a smell because it creates hidden shared state: any caller anywhere can be affected, tests must reset it, and under threads it becomes a race condition. Alternatives, in order: return the new value and let the caller keep it; wrap state in a class; pass state explicitly. Honest exception: a module-level cache or config initialized once — say the tradeoff (convenience vs hidden coupling) out loud and reviewers relax.',
      isCaseBased: false,
    },
    {
      question: 'Functions are "first-class objects" in Python. What does that actually mean, and what does it buy you?',
      answer:
        'A function is a value like any other: created by def at runtime, it can be assigned to names, passed as an argument, returned from another function, and stored in containers. What it buys: sort keys (`sorted(words, key=len)`), callbacks (hand the "what to do" into the "when to do it"), map/filter, dispatch tables — `handlers = {"GET": do_get, "POST": do_post}; handlers[method](req)` replaces an if/elif ladder and is open for extension — and decorators, which are just functions that take and return functions. The mental shift interviewers look for: def is not a declaration, it is an assignment of a function object to a name.',
      isCaseBased: false,
    },
    {
      question: 'What is the difference between passing f and passing f() — and where does this bite in real code?',
      answer:
        'f is the function object; f() is a call, evaluated immediately, passing its RESULT. Bites: `sorted(words, key=len())` — len() runs now, with no argument, TypeError. `button.on_click(handler())` — the handler fires during setup instead of on click, and on_click receives its return value (often None). `Thread(target=work())` — work runs in the CURRENT thread; the new thread gets None. Rule of thumb: if you are configuring "call this LATER", pass the name without parentheses; if you need arguments bound in, wrap it — `lambda: work(x)` or functools.partial — rather than calling early.',
      isCaseBased: false,
    },
    {
      question: 'When should a caller use keyword arguments even though positional would work?',
      answer:
        'Whenever the value does not explain itself. `retry(True, False, 3)` is unreadable at review time — which True is which? `retry(verbose=True, strict=False, attempts=3)` documents itself and survives parameter reordering in the library. Costs: a little typing, and keyword names become public API (renaming a parameter breaks callers — why libraries use positional-only `/` for internals). Guideline that scores in interviews: booleans and config values always by keyword; obvious payloads (the data itself) positionally. And as the API author, enforce it with `*` so future callers cannot write the unreadable version.',
      isCaseBased: false,
    },
    {
      question: 'What actually happens when Python executes a def statement? (Not when the function is called — at the def itself.)',
      answer:
        'def is executable code, not a compile-time declaration. At def time Python: (1) creates a function object from the already-compiled body; (2) evaluates the DEFAULT values right then, once, and stores them on the function object; (3) binds the function name in the current scope, like any assignment. Consequences: defaults are shared across all calls — the root of the mutable-default trap (`def f(x=[])` shares one list forever); functions can be defined conditionally, nested, or built in loops; and since def is assignment, redefining a name silently replaces the old function. Saying "defaults evaluate once, at def time" is the sentence that shows you know the model.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Function with no return statement returns…', back: 'None — Python inserts an invisible "return None". Printing is not returning.' },
    { front: '*args collects…', back: 'Extra positional arguments, into a tuple.' },
    { front: '**kwargs collects…', back: 'Extra keyword arguments, into a dict (string keys).' },
    { front: 'Stars at the CALL site', back: '* explodes a sequence into positional args; ** explodes a dict into keyword args. In a def they collect; at a call they unpack.' },
    { front: 'LEGB', back: 'Name lookup order: Local → Enclosing → Global → Built-in. First hit wins.' },
    { front: 'Cause of UnboundLocalError', back: 'Assigning to a name ANYWHERE in a function makes it local for the whole function — a read before the assignment finds nothing.' },
    { front: 'nonlocal vs global', back: 'nonlocal: rebind a variable of the enclosing function (closures). global: rebind a module-level name (usually a design smell).' },
    { front: 'f vs f()', back: 'f is the function object (pass it, store it). f() calls it now and yields its result.' },
    { front: 'Parameter order in a def', back: 'required → defaults → *args → keyword-only → **kwargs.' },
    { front: 'When are default values evaluated?', back: 'Once, at def time — not per call. (Why mutable defaults are a trap — see the mutability module.)' },
  ],
  mindmapMarkdown: `- Functions, Scope & *args/**kwargs
  - def & return
    - return = stop + hand back
    - no return → None
    - def runs at runtime: builds object, binds name
  - Calling
    - positional: by order
    - keyword: by name, any order
    - defaults fill the gaps (evaluated once)
    - rule: positional before keyword
  - Collect & unpack
    - *args → tuple of extras
    - **kwargs → dict of extras
    - call site: * explodes sequence, ** explodes dict
    - forward: fn(*args, **kwargs) — decorator shape
  - Scope: LEGB
    - Local → Enclosing → Global → Built-in
    - assignment makes it local → UnboundLocalError
    - nonlocal: write enclosing (closures)
    - global: write module level (smell)
  - First-class functions
    - assign: speak = shout
    - pass: sorted(key=len)
    - dispatch dict replaces if/elif
    - f passes, f() calls`,
}

export default m
