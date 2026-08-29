var e={id:`py-l1-files-exceptions-modules`,subjectId:`python`,level:1,title:`Files, Exceptions & Project Hygiene`,whyItMatters:`Take-home assignments are graded on this before anyone reads your algorithm: does the file close, does the error get caught by NAME, does the project install with one command? And "what does finally do when try returns?" is a favorite Python screening question — it separates people who ran code from people who read blog posts.`,estMinutes:50,sections:[{type:`intuition`,title:`A file is a borrowed resource`,md:"`open()` is checking a book out of a library. You must say what you intend to do with it — that's the **mode**:\n\n- `'r'` — read. The default. File must already exist.\n- `'w'` — write. Creates the file, or **silently wipes it** if it exists. The classic data-loss mode.\n- `'a'` — append. Writes go to the end; existing content is safe.\n- `'x'` — exclusive create. Fails loudly if the file exists — use when overwriting would be a disaster.\n- Add `'b'` for binary (`'rb'`, `'wb'`): raw bytes, no text decoding. Images, models, pickles.\n- `'r+'` — read and write, no wipe. Rarely what you want; usually read-then-rewrite is cleaner."},{type:`code`,lang:`python`,title:`Write, append, and the three ways to read`,code:`# --- writing ---
f = open('notes.txt', 'w')     # 'w': create, or WIPE if it exists
f.write('line one\\n')          # write() adds no newline for you
f.write('line two\\n')
f.close()                      # data may sit in a buffer until this

f = open('notes.txt', 'a')     # 'a': append, never wipes
f.write('line three\\n')
f.close()

# --- reading: sip, gulp, or stream ---
f = open('notes.txt')          # default mode is 'r'
whole = f.read()               # ONE string: the entire file in memory
f.close()

f = open('notes.txt')
lines = f.readlines()          # list of lines, '\\n' still attached
f.close()

f = open('notes.txt')
for line in f:                 # THE idiom: one line at a time
    print(line.strip())
f.close()`,annotations:{2:`Opening an existing file in 'w' truncates it to zero bytes BEFORE you write anything. No warning, no undo.`,5:`Writes go to an in-memory buffer first. Skip close() and a crash can lose the tail of your file.`,13:`read() is fine for a config file. On a 10 GB log it loads 10 GB into RAM.`,21:`Iterating the file object streams line by line — constant memory at any file size. Default to this.`}},{type:`intuition`,title:`with: the door that closes itself`,md:"Every `open()` above needed a matching `close()`. Now imagine an exception fires between them — `close()` never runs, the file handle leaks, buffered writes may vanish.\n\n- `with open(...) as f:` makes a promise: **however the block ends** — success, crash, early return — the file closes.\n- No cleanup code to forget. No leak on the error path.\n- This is why `with` is the default, not a nice-to-have. Manual `close()` in review is a bug until proven otherwise.\n- One `with` can manage several files at once: `with open(a) as f, open(b, 'w') as g:`."},{type:`code`,lang:`python`,title:`The only file-handling shape you should ship`,code:`with open('notes.txt') as f:
    for line in f:
        print(line.strip())
# f is CLOSED here -- even if the loop raised

# read one file, write another, both auto-closed
with open('raw.csv') as src, open('kept.csv', 'w') as out:
    for line in src:
        if line.strip():           # drop blank lines
            out.write(line)`,annotations:{1:`with calls close() for you on ANY exit from the block. This is a context manager — you will build your own in Level 3.`,7:`Two files, one line. If writing out crashes, src still gets closed.`}},{type:`intuition`,title:`Real work: cleaning a messy CSV`,md:`A CSV is just text: one row per line, columns split by commas. Real ones arrive dirty — blank fields, broken rows. The cleaning loop is always the same four moves:

1. Read line by line (stream, never \`read()\`).
2. \`strip()\` — kill the trailing newline and stray spaces.
3. \`split(',')\` — one string becomes a list of fields.
4. Filter — wrong column count or empty field means the row is dropped, not "fixed".

Run it below. Two of five rows fail the filter.`},{type:`visual`,component:`PythonPlayground`,props:{code:`raw = """name,age,city
Asha,29,Pune
Ravi,,Delhi
Meena,34,Mumbai
this row is broken
Karan,41,Jaipur
"""

with open('users.csv', 'w') as f:
    f.write(raw)

clean = []
with open('users.csv') as f:
    header = next(f).strip().split(',')
    for line in f:
        parts = line.strip().split(',')
        if len(parts) != 3 or not all(parts):
            continue  # bad row: wrong shape or empty field
        clean.append(parts)

print(header)
for row in clean:
    print(row)
print(f'kept {len(clean)} of 5 data rows')`,precomputedOutput:`['name', 'age', 'city']
['Asha', '29', 'Pune']
['Meena', '34', 'Mumbai']
['Karan', '41', 'Jaipur']
kept 3 of 5 data rows`,caption:`strip → split → filter. Ravi has an empty age; the broken row has one field instead of three.`}},{type:`note`,md:"For real-world CSVs, the stdlib `csv` module does the splitting for you — and correctly handles the case plain `split(',')` gets wrong: quoted fields containing commas, like `\"Pune, MH\"`. Same loop shape: `for row in csv.reader(f):` gives you the parts list directly. Plain split for quick scripts, `csv` module the moment data comes from strangers."},{type:`intuition`,title:`try / except / else / finally: what runs when`,md:`A trapeze act with four parts:

- **try** — the trick. The code that might fail.
- **except** — the safety net. Runs **only if** the try block raised, and only for the exception type it names.
- **else** — the bow. Runs **only if** the try block finished clean. Keeps your success-path code out of the try, so its own bugs are not swallowed by your except.
- **finally** — the stage lights. Runs **always**: after success, after a caught exception, after an uncaught one, even after a \`return\`.
- That last point is the interview trap: \`finally\` runs on the way out of a \`return\`. Watch it happen below.`},{type:`visual`,component:`PythonPlayground`,props:{code:`def divide(a, b):
    try:
        result = a / b
    except ZeroDivisionError:
        print('  except: caught division by zero')
        return None
    else:
        print('  else: no exception happened')
        return result
    finally:
        print('  finally: runs no matter what')

print('divide(10, 2)')
print('  returned:', divide(10, 2))
print('divide(10, 0)')
print('  returned:', divide(10, 0))`,precomputedOutput:`divide(10, 2)
  else: no exception happened
  finally: runs no matter what
  returned: 5.0
divide(10, 0)
  except: caught division by zero
  finally: runs no matter what
  returned: None`,caption:`Both paths print finally — even though both paths hit a return first. Exactly one of except/else runs.`}},{type:`note`,md:"Memorize the sentence: **except and else are exclusive — one or the other; finally is unconditional — always.** And never put a `return` inside `finally`: it silently overwrites the try/except return value AND eats in-flight exceptions. That one is a real code-review flag."},{type:`intuition`,title:`Raising: pulling the fire alarm`,md:"`raise` is how your code refuses bad input instead of limping on with it. You don't handle the fire — you signal it, loudly, and let a caller who has context decide.\n\n- `raise ValueError('amount must be positive')` — use built-in types for built-in-shaped problems (bad value, bad type, missing key).\n- When your *domain* has its own failure modes — insufficient funds, expired token — write a **custom exception class**: a class inheriting from `Exception`.\n- Why bother? Callers can then catch *your* failure specifically: `except InsufficientFunds:` — without also catching every unrelated `ValueError` in the stack.\n- Custom exceptions can carry data on the instance — not just a message string."},{type:`code`,lang:`python`,title:`A custom exception that carries data`,code:`class InsufficientFunds(Exception):
    """Withdrawal exceeds the balance."""
    def __init__(self, balance, amount):
        super().__init__(f'need {amount}, have {balance}')
        self.balance = balance
        self.amount = amount

def withdraw(balance, amount):
    if amount <= 0:
        raise ValueError('amount must be positive')
    if amount > balance:
        raise InsufficientFunds(balance, amount)
    return balance - amount

try:
    withdraw(100, 250)
except InsufficientFunds as e:
    print('declined, short by', e.amount - e.balance)`,annotations:{1:`Inherit from Exception — never from BaseException (that would tangle you with Ctrl+C and system exit).`,4:`super().__init__(msg) sets the printable message; extra fields make the error machine-readable.`,10:`Bad-input-shaped problem → built-in ValueError. No custom class needed for this.`,17:`"as e" binds the exception object — the caller reads e.amount and e.balance to react precisely.`}},{type:`intuition`,title:`Bare except: taping over the check-engine light`,md:"`except:` with no type catches **everything**. It feels safe. It is the opposite.\n\n- It eats your own typos: a `NameError` from a misspelled variable disappears into `pass`. The bug is now invisible and permanent.\n- It catches `KeyboardInterrupt` — Ctrl+C stops stopping your program.\n- It catches `SystemExit` — clean shutdowns get blocked.\n- The rule: **catch what you expect, by name. Let everything else crash loudly** — a stack trace is information; silence is data corruption with extra steps.\n- Widest acceptable net: `except Exception as e` **with logging**, at a top-level boundary (request handler, worker loop) — never deep inside logic."},{type:`code`,lang:`python`,title:`The bug and the fix`,code:`# THE BUG
try:
    process(order)
except:                  # catches EVERYTHING...
    pass                 # ...and destroys the evidence

# what that just ate:
#   NameError          -> your typo, now invisible
#   KeyboardInterrupt  -> Ctrl+C no longer works

# THE FIX: name what you expect
try:
    process(order)
except (KeyError, ValueError) as e:
    log.warning('bad order skipped: %s', e)`,annotations:{4:`Bare except catches BaseException — including KeyboardInterrupt and SystemExit, which are not even errors.`,14:`A tuple catches several named types in one clause. Everything unexpected still crashes with a full stack trace.`}},{type:`intuition`,title:`Modules and packages: drawers and cabinets`,md:"Past ~200 lines, one file becomes a junk drawer. Python's unit of organization:\n\n- **Module** — one `.py` file. `pricing.py` is the module `pricing`.\n- **Package** — a folder of modules with an `__init__.py` file inside. The cabinet holding the drawers.\n- `import shop.pricing` — bring in the module, access as `shop.pricing.with_tax`.\n- `from shop.pricing import with_tax` — pull one name into your namespace directly.\n- Key mechanic: importing a module **executes it top to bottom, once** — then it's cached (in `sys.modules`, Python's registry of loaded modules). A second import is free and runs nothing."},{type:`code`,lang:`python`,title:`A package, and the double life of every .py file`,code:`# shop/                    <- PACKAGE: folder of modules
#   __init__.py            <- marks the folder importable
#   pricing.py             <- MODULE: one .py file
#   billing.py

# --- pricing.py ---
TAX = 0.18

def with_tax(amount):
    return round(amount * (1 + TAX), 2)

if __name__ == '__main__':
    # runs only via: python pricing.py
    assert with_tax(100) == 118.0
    print('pricing self-test passed')

# --- billing.py ---
from shop.pricing import with_tax  # runs pricing.py once, silently
print(with_tax(500))               # the self-test did NOT print`,annotations:{2:`Without __init__.py (even empty), the folder is just a folder — imports from it fail.`,12:`Python sets __name__ per file: '__main__' when you RUN it directly, 'shop.pricing' when it's imported. This if is how one file is both a script and a library.`,18:`Import executes the module top to bottom — everything except the guarded block. No guard = your test code runs inside every importer.`}},{type:`note`,md:"The `if __name__ == '__main__':` guard is non-negotiable in shared code. Without it, `import` triggers whatever loose code sits at the bottom of the file — print statements, test runs, even network calls — in every program that imports you. Everything meant for direct execution goes under the guard."},{type:`intuition`,title:`Virtual environments: one toolbox per project`,md:"Project A needs `pandas 1.5`. Project B needs `pandas 2.2`. One shared system-wide Python can hold exactly one — upgrading for B silently breaks A.\n\n- A **virtual environment** (`venv`) is a private, per-project copy of Python's package space. Installs land there and nowhere else.\n- `pip` is Python's package installer. Inside an activated venv, `pip install` fills that project's toolbox only.\n- `requirements.txt` is the packing list: exact package versions, one per line. Commit it; never commit the `.venv` folder itself.\n- Payoff: any teammate, server, or CI machine rebuilds your exact setup with one command. \"Works on my machine\" stops being a sentence you say."},{type:`code`,lang:`bash`,title:`The whole workflow: four commands`,code:`# once, inside the project folder
python -m venv .venv

# activate (per terminal session)
source .venv/bin/activate       # macOS / Linux
.venv\\Scripts\\activate          # Windows

pip install requests            # lands INSIDE .venv only
pip freeze > requirements.txt   # snapshot exact versions

# anyone else, on any machine:
pip install -r requirements.txt`,annotations:{2:`Creates a .venv folder holding a private Python + empty package space. Add .venv to .gitignore.`,8:`With the venv active, pip and python both point inside .venv — the system Python is untouched.`,9:`freeze writes pinned versions like requests==2.32.3 — 'exactly this', not 'whatever is newest today'.`}},{type:`note`,md:"Module recap, one line each: `with` closes files on every exit path. Stream files line by line. except/else are exclusive, `finally` is unconditional. Raise built-ins for generic problems, custom `Exception` subclasses for domain problems. Never bare `except:`. One `.py` = module, folder + `__init__.py` = package, `__main__` guard splits script from library. One venv per project + `requirements.txt` = reproducible installs."}],quiz:[{question:`data.txt already contains 500 lines. You run open('data.txt', 'w'). What happened, before you write anything?`,options:[{text:`The file is now empty — w truncates on open`,explanation:`Correct. 'w' wipes the file the moment it opens, not when you write. The most common accidental data loss in Python.`},{text:`Nothing until the first write()`,explanation:`Truncation happens at open() time — even if you never write and just close, the 500 lines are gone.`},{text:`An error — the file exists`,explanation:`That's 'x' (exclusive create). 'w' happily overwrites without asking.`},{text:`New writes go after the 500 lines`,explanation:`That's 'a' (append). 'w' starts from a clean, empty file.`}],correct:0},{question:`In try/except/else/finally, the else block runs when…`,options:[{text:`The try block raised an exception`,explanation:`That's except's job. else is the opposite case.`},{text:`The try block finished without raising`,explanation:`Correct. else is the clean-success branch — one of except/else runs, never both.`},{text:`Always, like finally`,explanation:`Only finally is unconditional. else is conditional on a clean try.`},{text:`Only when there is no finally`,explanation:`else and finally are independent — both can appear, and a clean try runs both.`}],correct:1},{question:`A function has return 42 inside try, and a finally block. What does finally do?`,options:[{text:`It is skipped — return exits immediately`,explanation:`finally is the one block return cannot skip. It runs on the way out.`},{text:`It runs before the function actually returns 42`,explanation:`Correct. Python holds the return value, executes finally, then returns. (And a return inside finally would override the 42 — the classic trap.)`},{text:`It runs after the caller receives 42`,explanation:`finally belongs to the function — it completes before control leaves it.`}],correct:1},{question:`Why is a bare except: a bug rather than a safety measure?`,options:[{text:`It catches everything — including your own typos (NameError) and Ctrl+C — and hides them`,explanation:`Correct. It intercepts BaseException: programming errors, KeyboardInterrupt, SystemExit. Failures become silent, which is worse than loud.`},{text:`It is slower than naming the exception type`,explanation:`Performance is identical — the problem is what it swallows, not speed.`},{text:`It is a syntax error in Python 3`,explanation:`It is legal syntax — that is exactly why linters and reviewers have to hunt for it.`}],correct:0},{question:`You must process a 20 GB log file on a machine with 8 GB RAM. Which read style works?`,options:[{text:`f.read()`,explanation:`One 20 GB string in 8 GB of RAM — the process dies.`},{text:`f.readlines()`,explanation:`Same problem, shaped as a list — the whole file still lands in memory.`},{text:`for line in f:`,explanation:`Correct. Iterating the file object streams one line at a time — memory use stays flat no matter the file size.`}],correct:2},{question:`In shop/pricing.py, what is __name__ when billing.py does 'from shop.pricing import with_tax'?`,options:[{text:`'__main__'`,explanation:`Only when you run 'python pricing.py' directly. On import, Python uses the module's real name.`},{text:`'shop.pricing'`,explanation:`Correct. Imported modules get their dotted module path as __name__ — which is why the __main__ guard stays False and self-test code stays quiet.`},{text:`'pricing.py'`,explanation:`__name__ is a module path, not a filename — no .py, and the package prefix is included.`},{text:`'billing'`,explanation:`__name__ describes the file it lives in, not whoever imported it.`}],correct:1},{question:`A custom exception class should inherit from…`,options:[{text:`Exception`,explanation:`Correct. Subclassing Exception makes it catchable by normal handlers while staying clear of KeyboardInterrupt/SystemExit's branch.`},{text:`BaseException`,explanation:`Too high — your error would sit beside Ctrl+C and system exit, and except Exception handlers would miss it.`},{text:`ValueError, always`,explanation:`Inherit ValueError only when your error truly IS a bad-value error. For domain failures, Exception is the right parent.`},{text:`Nothing — any class can be raised`,explanation:`Python 3 refuses to raise non-exception classes: TypeError. It must descend from BaseException, and in practice from Exception.`}],correct:0},{question:`What problem does one-venv-per-project actually solve?`,options:[{text:`It makes Python run faster`,explanation:`A venv changes where packages live, not how fast anything runs.`},{text:`Two projects can depend on different versions of the same package without breaking each other`,explanation:`Correct. Each venv is an isolated package space — pandas 1.5 in one, 2.2 in another, no fight. requirements.txt then makes each setup reproducible.`},{text:`It encrypts your dependencies`,explanation:`Nothing security-related — it is pure isolation of installed packages.`}],correct:1}],interviewQuestions:[{question:`Prod bug: your script crashed mid-run, and the log file it was writing is missing its last ~200 lines — lines your print-debugging says were definitely written. Walk me through it.`,answer:"Written is not flushed. `f.write()` puts data in an in-memory buffer; it hits disk on flush or close. The crash killed the process with the buffer unflushed — the tail evaporated. Fixes, in order of preference: (1) open the file in a `with` block scoped so close runs on the failure path; (2) for logs specifically, call `f.flush()` after critical writes, or use the `logging` module which manages handlers properly; (3) for must-survive-a-power-cut data, `flush()` + `os.fsync()` — and name the tradeoff: fsync per line is brutally slow, so you batch. The interview point: distinguish write → buffer → OS → disk, and know `with` guarantees the close even on exceptions.",isCaseBased:!0},{question:`Exact semantics: in try/except/else/finally, what runs in which order for (a) no exception, (b) a caught exception, (c) an uncaught exception?`,answer:"(a) try → else → finally. (b) try (up to the raise) → the matching except → finally. (c) try → finally → the exception keeps propagating to the caller. Rules worth saying out loud: except and else are mutually exclusive; finally is unconditional — it even runs on the way out of a `return` or `break`. Bonus point: why use else at all — it keeps success-path code OUT of the try, so its own exceptions are not accidentally caught by your except clause. That precision is what the question is testing.",isCaseBased:!1},{question:"Why is `except:` a bug, and when is `except Exception:` acceptable?",answer:"Bare `except:` catches BaseException — which includes KeyboardInterrupt and SystemExit, so it breaks Ctrl+C and clean shutdowns, and it swallows programming errors like NameError, turning bugs into silence. `except Exception as e:` at least spares the interpreter-control exceptions, but it is still a blanket — acceptable only at a top-level boundary (request handler, worker loop, main) where the alternative is the whole process dying, and only WITH logging plus re-raise or error response. Deep inside logic, catch specific types by name. The tradeoff to name: broad catches buy availability at the cost of debuggability; the boundary is where that trade is worth it.",isCaseBased:!1},{question:`Case: a teammate's script runs fine on their laptop but the server throws ModuleNotFoundError: No module named 'requests'. Diagnose and fix — properly, not with a one-off pip install.`,answer:"Their laptop has requests installed in whatever environment they ran; the server does not — classic works-on-my-machine, and it means dependencies were never captured. Proper fix: on the working machine, activate the project venv (create one if they were using the global Python — the actual root cause), `pip freeze > requirements.txt`, commit it. On the server: `python -m venv .venv`, activate, `pip install -r requirements.txt`. Also check both sides run compatible Python versions. Why not just `pip install requests` on the server? It fixes today's module and leaves the next missing one — and an unpinned version can differ from the laptop's, giving subtler breakage. The lesson: environments are part of the code.",isCaseBased:!0},{question:`When do you write a custom exception class instead of raising ValueError, and what goes into a good one?`,answer:`Use built-ins when the failure is generic (bad value, bad type). Write a custom class when the failure is part of your domain's contract — InsufficientFunds, TokenExpired — because callers can then catch YOUR failure precisely without netting every unrelated ValueError below them. A good one: inherits from Exception (never BaseException); calls super().__init__ with a human-readable message; carries structured fields (e.amount, e.balance) so handlers can react programmatically instead of parsing strings. For a library, add one root class (class ShopError(Exception)) so users can catch everything-yours with one clause. Tradeoff: every class is API surface you must keep stable — add them for real contracts, not for every if-statement.`,isCaseBased:!1},{question:`read() vs readlines() vs iterating the file object — memory story, and which do you actually use?`,answer:"read() → one string, whole file in RAM. readlines() → list of line strings, whole file in RAM plus per-string overhead. `for line in f:` → the file object is an iterator yielding one line at a time; memory stays constant at any size. Default to iteration; read() is fine for small files you need as one blob (config, template); readlines() is almost never right — if you need a list, `list(f)` is the same thing and if you don't, you paid for nothing. The senior phrasing: file size is unbounded input, so streaming is the only shape that doesn't have a cliff.",isCaseBased:!1},{question:`What actually happens when Python executes 'import shop.pricing'? Include why a second import is free and why circular imports break.`,answer:`Steps: (1) check sys.modules — if 'shop.pricing' is already there, bind the name and stop; (2) otherwise find the file via the package path, (3) create a module object, register it in sys.modules, (4) execute pricing.py top to bottom in that module's namespace. So imports are code execution, once — module-level prints, connections, everything runs. Second import: pure cache hit, nothing re-runs (that's also why editing a module mid-session needs a restart or importlib.reload). Circular imports: A imports B while B imports A — B finds A already in sys.modules but only PARTIALLY executed, so the attribute it wants may not exist yet → ImportError/AttributeError. Fixes: restructure the shared piece into a third module (best), or defer the import to inside the function that needs it.`,isCaseBased:!1},{question:`Your utils.py prints test output every time anyone imports it. What's wrong, and what is the __main__ guard actually checking?`,answer:"Loose test code sits at module top level, and import EXECUTES the module — so every importer runs the tests. Fix: move it under `if __name__ == '__main__':`. The mechanism: Python sets a per-module variable __name__ — '__main__' when the file is run directly (`python utils.py`), the module's dotted path ('utils' or 'pkg.utils') when imported. The guard is just an if on that variable, making one file live a double life: script when run, silent library when imported. This is also why entry points, argument parsing, and demo code all belong under the guard.",isCaseBased:!1},{question:`Interviewer: "Python people say EAFP — easier to ask forgiveness than permission. Explain, versus LBYL, and give a case where EAFP is strictly better."`,answer:"LBYL (look before you leap): check first — `if key in d: d[key]`. EAFP: just do it, catch the failure — `try: d[key] except KeyError:`. EAFP is idiomatic Python because exceptions are cheap when not raised and the operation is attempted once. The strictly-better case is anything with a race: `if os.path.exists(path): open(path)` can still crash — the file can vanish between the check and the open. `try: open(path) except FileNotFoundError:` has no gap; the check and the act are atomic. Tradeoff to name: EAFP costs more when failures are the common case (raising is slower than a check), and LBYL reads more naturally for simple validation — so EAFP for races and rare failures, either for the rest.",isCaseBased:!1},{question:`You catch an exception, log it, but the caller still needs to know. What are your options and their tradeoffs?`,answer:"Three: (1) bare `raise` inside the except block — re-raises the SAME exception with its original traceback intact; right default for log-and-propagate. (2) `raise NewError(...) from e` — wraps in your own type while chaining the cause (traceback shows 'The above exception was the direct cause…'); right at API boundaries where callers shouldn't depend on your internals. (3) return an error value (None, a result object) — turns the failure into data; fine for expected outcomes, but callers can silently ignore it, which exceptions cannot be. Anti-pattern to flag: `raise e` re-raises but from the current line, and wrapping WITHOUT `from e` buries the original cause. Naming `from e` is usually the point the interviewer is fishing for.",isCaseBased:!1}],flashcards:[{front:`File modes: r / w / a / x / b`,back:`r read (default, must exist) · w write (WIPES on open) · a append · x create-only (fails if exists) · +b for binary bytes.`},{front:`What does with open(...) as f guarantee?`,back:`f.close() runs on EVERY exit from the block — normal end, exception, or return. Default way to touch files.`},{front:`read() vs readlines() vs for line in f`,back:`read(): whole file, one string. readlines(): whole file, list. Iteration: one line at a time, constant memory — the default.`},{front:`try/except/else/finally — one sentence`,back:`except and else are exclusive (raised vs clean); finally is unconditional — it even runs past a return.`},{front:`Why is bare except: a bug?`,back:`Catches BaseException: your typos (NameError), Ctrl+C, SystemExit — all silenced. Catch specific types; except Exception only at boundaries, with logging.`},{front:`Custom exception recipe`,back:`class MyError(Exception) + super().__init__(message) + data fields on self. Lets callers catch your domain failure by name.`},{front:`__name__ equals…`,back:`'__main__' when the file is run directly; the module's dotted path when imported. The guard makes one file both script and library.`},{front:`Module vs package`,back:`Module = one .py file. Package = folder of modules containing __init__.py. Import executes the module once, then caches it in sys.modules.`},{front:`venv workflow, 4 commands`,back:`python -m venv .venv → activate → pip install X → pip freeze > requirements.txt. Rebuild anywhere: pip install -r requirements.txt.`}],mindmapMarkdown:`- Files, Exceptions & Project Hygiene
  - Files
    - modes: r / w(wipes!) / a / x / b
    - read() gulp · readlines() list · iterate = stream
    - with: auto-close on every exit
    - CSV loop: strip → split → filter
  - Exceptions
    - try / except / else / finally
      - except+else exclusive; finally always
      - finally runs past return
    - raise: built-ins for generic errors
    - custom: class X(Exception) + data fields
    - bare except = silenced bugs
      - name types; Exception only at boundaries
  - Modules & packages
    - module = .py · package = folder + __init__.py
    - import executes once, cached (sys.modules)
    - __main__ guard: script vs library
  - Environments
    - venv: per-project package space
    - pip install → pip freeze
    - requirements.txt = reproducible setup`};export{e as default};