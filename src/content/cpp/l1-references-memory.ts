import type { Module } from '../types'

const m: Module = {
  id: 'cpp-l1-references-memory',
  subjectId: 'cpp',
  level: 1,
  title: 'References, new/delete & Stack vs Heap',
  whyItMatters:
    'In C++ there is no garbage collector — YOU are the garbage collector. Every classic C++ crash story (leak, dangling pointer, double delete) is the same failure: a new without its matching delete on some path. Interviewers probe this before anything else, because a candidate who cannot say where an object lives and who kills it cannot be trusted with systems code.',
  estMinutes: 50,
  sections: [
    {
      type: 'intuition',
      title: 'A reference is a nickname, not a new box',
      md: `Your friend Rajesh also answers to "Raj". Two names, one person. That is a reference.

- \`int& ref = score\` makes \`ref\` a **second name for score** — no new object, no new memory.
- A reference must be initialized at birth. A name attached to nobody is illegal.
- It can never **reseat** (re-aim at another object): \`ref = other\` does not move the name — it copies \`other\`'s value *into* \`score\`. Assignment always goes through.
- It can never be null. A reference always names a real, existing object.
- A **pointer** is the opposite on all three counts: its own variable holding an address, can be \`nullptr\`, can re-aim any time.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Aliases vs addresses, caught in the act',
      code: `int score = 90;
int& ref = score;   // a second name for score — no new object
ref = 95;           // writes through the alias: score is now 95

int other = 20;
ref = other;        // does NOT re-aim. Copies 20 INTO score
// score == 20, ref still names score, forever

int* ptr = &score;  // a pointer: its own box, holding an address
ptr = &other;       // pointers CAN re-aim (reseat)
*ptr = 7;           // writes to other; score untouched
// int& broken;     // error: a reference must be initialized`,
      annotations: {
        2: 'No allocation happens here. The compiler simply lets the name "ref" mean the object "score".',
        6: 'THE trap. There is no syntax to reseat a reference — assignment through it always writes to the original object. score is 20 now.',
        10: 'This is what reseating looks like — and only pointers can do it. ptr is its own variable with its own address box.',
        12: 'Uncomment and it will not compile. References have no null and no "later" — they bind at birth or not at all.',
      },
    },
    {
      type: 'note',
      md: `The parameter decision table — interviewers ask this verbatim:
- **\`const T&\`** — the default for anything bigger than a pointer. No copy, read-only, and the caller must pass a real object.
- **\`T&\`** — the function modifies the caller's object. Say it in the name: \`applyDiscount(Order& o)\`.
- **\`T*\`** — "no object" is a legal input, or the function must re-aim or store the target. The null check documents the optionality.
- **plain \`T\`** — cheap copies only: \`int\`, \`double\`, \`bool\`, pointers themselves.
- The one-liner: *reference when it must exist, pointer when it might not.*`,
    },
    {
      type: 'intuition',
      title: 'Stack vs heap: your desk vs the warehouse',
      md: `The stack is your desk: drop things on the next free spot, and everything vanishes the moment you leave the room. The heap is a warehouse across town: a clerk finds you a shelf, and it stays yours until you tell him you are done.

- **Stack**: every local variable lives here. Allocating = moving one pointer forward (a "bump" — nearly free). Scope ends → everything from that scope dies, automatically.
- **Heap**: \`new\` asks the allocator (the clerk) to find a free block — searching, splitting, bookkeeping. Slower — but the block **survives until your \`delete\`**.
- Size limits: the stack is tiny, typically 1–8 MB total. One huge local array or runaway recursion → **stack overflow**, instant crash. The heap is as big as your RAM.
- Rule: stack by default. Heap only when the object must **outlive the function**, its **size is unknown until runtime**, or it is **too big for the desk**.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Scope death vs manual lifetime',
        notice: 'The stack column empties itself. The heap column only empties when YOUR delete runs.',
        frames: [
          {
            note: 'Inside f(): int x = 42 sits on the stack. new int(7) sits on the heap — reachable only through p.',
            stack: [
              { name: 'x', value: '42' },
              { name: 'p', to: 'h1' },
            ],
            heap: [{ id: 'h1', value: '7', label: 'new int(7)' }],
          },
          {
            note: 'f() returns without delete. x and p die automatically — free of charge. The heap cell does NOT. Nothing remembers its address anymore: a leak.',
            stack: [],
            heap: [{ id: 'h1', value: '7', label: 'leaked' }],
          },
          {
            note: 'Call f() again: another new, another orphan. In a long-running server this climbs for hours — then the OS kills the process.',
            stack: [],
            heap: [
              { id: 'h1', value: '7', label: 'leaked' },
              { id: 'h2', value: '7', label: 'leaked' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'new and delete: you asked for it, you free it',
      md: `\`new\` is a contract, not a convenience. The allocator hands you memory and writes your name in its ledger — nothing gets crossed out until you say so.

- \`new int(7)\` — allocate on the heap, construct with value 7, return the address. You now **own** it.
- \`delete p\` — destroy the object, return the memory. Exactly once, and only on an address that came from \`new\`.
- Arrays have their own pair: \`new int[n]\` must be freed with \`delete[]\`. The runtime stashed the element count where only \`delete[]\` knows to look.
- Mixing the forms — plain \`delete\` on a \`new[]\` — is **undefined behavior** (UB: the standard permits anything, including "seems to work today").
- \`delete\` on a \`nullptr\` is a guaranteed no-op. Remember this — it powers the safety habit coming up.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'The four forms — and the mismatch bug',
      code: `int* one = new int(7);    // heap: one int, constructed as 7
delete one;               // new -> delete
one = nullptr;            // habit: dead pointers get nulled

int* many = new int[5];   // heap: 5 ints (uninitialized!)
many[0] = 42;
delete[] many;            // new[] -> delete[] — always
many = nullptr;

int* bad = new int[5];
delete bad;               // MISMATCH: undefined behavior`,
      annotations: {
        1: 'new returns an address; from this moment you own the allocation. Every path forward must reach exactly one delete.',
        3: 'delete does not touch the pointer variable — it keeps holding the old address. Nulling it makes accidents harmless: delete nullptr is a no-op.',
        7: 'delete[] runs the right number of destructors and hands the allocator the true block start. Plain delete here would read garbage bookkeeping.',
        11: 'The mismatch bug. May "work" for ints on your compiler — still UB, and it corrupts the heap for real classes. The form of delete mirrors the form of new.',
      },
    },
    {
      type: 'intuition',
      title: 'Memory leaks: rent you pay forever',
      md: `A leak is heap memory you never freed — usually because no pointer remembers the address anymore. The allocator still counts it as yours.

- One leak is invisible: a few bytes, no error, no crash.
- A leak **per request** in a server is a slow bleed: memory climbs for hours, then the OS kills the process — at 3am, on a weekend.
- The usual suspects: an early \`return\` or exception that skips the \`delete\`; a pointer reassigned before its old target was freed; the last pointer to an allocation going out of scope.
- Tools help — \`valgrind --leak-check=full\` and AddressSanitizer print the allocation stack of every unfreed block — but the cheapest tool is reading every exit path.
- Below: the memory-leak hunt. Real-looking code, one leak. Find it before reading the annotations.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Practical: the memory-leak hunt',
      code: `// THE LEAK HUNT: compiles clean, tests pass. One path leaks.
double average(const int* data, int n) {
    int* copy = new int[n];        // defensive copy on the heap
    long long sum = 0;
    for (int i = 0; i < n; ++i) {
        copy[i] = data[i];
        sum += copy[i];
    }
    if (n == 0)
        return 0.0;                // <-- found it?
    double result = static_cast<double>(sum) / n;
    delete[] copy;
    return result;
}`,
      annotations: {
        3: 'Ownership starts here. From this line on, EVERY path out of the function must run delete[] copy — that is the whole game.',
        10: 'The leak. This early return skips the delete[] below. new int[0] is a real allocation that must still be freed. Fix: delete[] copy; before this return — or check n first and never allocate.',
        12: 'Frees the normal path only. An exception thrown between lines 3 and 12 would leak too — hold that thought for RAII in Level 3.',
      },
    },
    {
      type: 'intuition',
      title: 'Dangling pointers: an address slip for a demolished house',
      md: `\`delete\` demolishes the building. The address slips in everyone's pockets still look exactly the same.

- A **dangling pointer** is a pointer still holding the address of freed memory. The pointer's bits are fine; the target is gone.
- Using it — read or write — is **use-after-free**: UB. The nightmare property: it usually *works in tests*, because the allocator has not reused the block yet. In production it has — and you silently corrupt whatever object lives there now.
- Three factories for dangling pointers: use-after-\`delete\`; returning the address of a local variable (its stack frame died at return); two pointers to one allocation, and one of them deletes.
- **Double delete** is the sibling bug: \`delete\` the same address twice and you corrupt the allocator's own ledger. The crash surfaces later, in unrelated code.
- The discipline: every allocation has **one owner** who deletes; right after \`delete p\`, write \`p = nullptr\` — since \`delete nullptr\` is a no-op, an accidental second delete becomes harmless and \`if (p)\` tells the truth.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'new, delete, dangling: the full story',
        notice: 'Red dashed arrows are the bug: pointers aimed at memory that is no longer yours.',
        frames: [
          {
            note: 'int* p = new int(7) — the allocator hands back an address; p aims at the fresh cell.',
            stack: [{ name: 'p', to: 'h1' }],
            heap: [{ id: 'h1', value: '7', label: 'new int(7)' }],
          },
          {
            note: 'int* q = p — copying a pointer copies the ADDRESS. Two arrows, one cell. Remember this frame.',
            stack: [
              { name: 'p', to: 'h1' },
              { name: 'q', to: 'h1' },
            ],
            heap: [{ id: 'h1', value: '7', label: 'shared' }],
          },
          {
            note: 'delete p — the cell goes back to the allocator. Neither pointer changed: both still hold the old address. Both are dangling.',
            stack: [
              { name: 'p', to: 'h1', danger: true },
              { name: 'q', to: 'h1', danger: true },
            ],
            heap: [{ id: 'h1', value: '7', freed: true }],
          },
          {
            note: '*q now is use-after-free. delete q would be double delete. Both undefined behavior — and both may "work" today, which is worse than crashing.',
            stack: [
              { name: 'p', to: 'h1', danger: true },
              { name: 'q', to: 'h1', danger: true },
            ],
            heap: [{ id: 'h1', value: '7', freed: true }],
          },
          {
            note: 'The fix: null every pointer that held the address. delete nullptr is a guaranteed no-op, and if (p) checks become honest again.',
            stack: [
              { name: 'p', value: 'nullptr' },
              { name: 'q', value: 'nullptr' },
            ],
            heap: [{ id: 'h1', value: '?', freed: true }],
          },
        ],
      },
    },
    {
      type: 'note',
      md: `The recap — this module in five lines:
- References: a second name. Must initialize, never reseats, never null. Params: \`const T&\` by default, \`T*\` when "maybe nothing".
- Stack: automatic, bump-fast, a few MB, dies at scope end. Heap: manual, bookkeeping-slow, huge, dies at \`delete\`.
- Pair exactly: \`new\` → \`delete\`, \`new[]\` → \`delete[]\` — one delete per allocation, on **every** exit path.
- Leak = never freed. Dangling = freed but still used. Double delete = freed twice. All three are ownership failures.
- Modern C++ automates the whole contract with destructors that delete for you — **RAII and smart pointers, the Level 3 module**.`,
    },
  ],
  quiz: [
    {
      question: 'int x = 1, y = 2; int& r = x; r = y; — what happened?',
      options: [
        { text: 'r now refers to y', explanation: 'References cannot reseat — no syntax exists for it. The assignment went through the alias instead.' },
        { text: 'x is now 2', explanation: 'Correct. Assignment through a reference writes to the referenced object. r named x at birth and names x forever.' },
        { text: 'Compile error', explanation: 'Perfectly legal C++ — that is exactly why the reseating misconception is dangerous.' },
      ],
      correct: 1,
    },
    {
      question: 'Which of these is impossible in legal C++?',
      options: [
        { text: 'A pointer holding nullptr', explanation: 'That is the everyday state of a pointer with nothing to point at — completely legal.' },
        { text: 'Two pointers aimed at one object', explanation: 'Legal and common — that sharing is exactly how dangling and double-delete bugs get manufactured.' },
        { text: 'A reference bound to no object', explanation: 'Correct. A reference must be initialized with a real object and has no null state. That guarantee is why const T& params need no null check.' },
        { text: 'A pointer to a pointer', explanation: 'int** is legal and appears in real APIs — a pointer is an object, so it has an address too.' },
      ],
      correct: 2,
    },
    {
      question: 'A function only READS a 10 MB struct that callers always have. Best parameter type?',
      options: [
        { text: 'BigStruct s', explanation: 'Pass-by-value copies all 10 MB on every call — the exact waste const T& exists to prevent.' },
        { text: 'const BigStruct& s', explanation: 'Correct. No copy, read-only enforced by const, and no null check needed — a reference always names a real object.' },
        { text: 'BigStruct* s', explanation: 'Works, but the signature now says "might be null", forcing checks for an object that is always present. Wrong tool.' },
      ],
      correct: 1,
    },
    {
      question: 'int* a = new int[8]; — the only correct cleanup is…',
      options: [
        { text: 'delete a', explanation: 'Wrong form. new[] stored an element count that only delete[] knows how to read — plain delete here is undefined behavior.' },
        { text: 'delete[] a', explanation: 'Correct. The form of delete must mirror the form of new: new[] pairs with delete[], always.' },
        { text: 'free(a)', explanation: 'Never mix the C allocator with new/delete — free skips destructors and may use a different heap. Undefined behavior.' },
        { text: 'Nothing — it dies at scope end', explanation: 'Only the POINTER a dies at scope end. The 8 ints are on the heap and live until your delete[] — otherwise they leak.' },
      ],
      correct: 1,
    },
    {
      question: 'Immediately after delete p; — what does the variable p hold?',
      options: [
        { text: 'nullptr', explanation: 'delete never touches the pointer variable. Nulling it is YOUR job — that is why the p = nullptr habit exists.' },
        { text: 'Random garbage bits', explanation: 'The bits are not scrambled — they are unchanged. That is precisely the danger: the pointer looks valid.' },
        { text: 'The same address as before — now dangling', explanation: 'Correct. p still holds the old address of memory you no longer own. Any use through it is use-after-free.' },
      ],
      correct: 2,
    },
    {
      question: 'delete p; p = nullptr; delete p; — what is the outcome?',
      options: [
        { text: 'Safe — delete on nullptr is a guaranteed no-op', explanation: 'Correct. The nulling turned a would-be double delete into nothing. This is exactly why the habit pays.' },
        { text: 'Double delete: undefined behavior', explanation: 'It would be — without the p = nullptr in between. The second delete sees null and does nothing.' },
        { text: 'Compile error', explanation: 'All three statements compile fine — memory bugs are runtime stories, not compile-time ones.' },
      ],
      correct: 0,
    },
    {
      question: 'A function declares int buf[2000000]; as a local and the program crashes on entry. Why?',
      options: [
        { text: 'The heap is exhausted', explanation: 'A local array does not touch the heap at all — no new was involved.' },
        { text: 'Arrays cannot be that large in C++', explanation: 'Arrays that size are fine — on the heap. WHERE it lives is the problem, not the size itself.' },
        { text: 'Stack overflow: locals live on the stack, which is only a few MB', explanation: 'Correct. ~8 MB of ints on a 1–8 MB stack blows the limit instantly. Big buffers belong on the heap (or in a std::vector).' },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'When do you take a parameter as const T&, T&, T*, or plain T? Give the decision rule.',
      answer:
        'Default: `const T&` for anything bigger than a pointer — no copy, read-only, caller guaranteed to pass a real object. `T&` when the function must modify the caller\'s object. `T*` when "no object" is a legal input or the function must re-aim/store the target — the null check then documents the optionality. Plain `T` for cheap copies: int, double, bool, pointers, tiny structs. The interview one-liner: reference when it must exist, pointer when it might not.',
      isCaseBased: false,
    },
    {
      question: 'Case: a server crashes randomly, hours after deploy, in different places each time. Valgrind reports a use-after-free. Walk me through the investigation.',
      answer:
        'Random location + delayed crash is the use-after-free signature: a write through a dangling pointer corrupts whatever object the allocator later placed in that block, so the crash appears in innocent code, long after the real bug ran. Method: (1) valgrind names BOTH sites — where the invalid access happened AND where the block was freed; the bug is the ownership story between them. (2) Find every copy of that pointer: who else held the address when delete ran? The usual root cause is shared ownership with no agreed owner — an object deleted while a callback, container, or thread still holds it. (3) Fix ownership, not the symptom: one clear owner, null-after-delete as a tripwire, and ideally smart pointers so the type system enforces the lifetime. (4) Add AddressSanitizer to CI so the class of bug fails fast in tests instead of at 3am.',
      isCaseBased: true,
    },
    {
      question: 'Why is stack allocation faster than heap allocation?',
      answer:
        'Stack allocation is one instruction: bump the stack pointer. Deallocation is bumping it back — the entire scope frees at once, for free. The memory is also cache-hot, since the top of the stack is constantly touched. Heap allocation calls into the allocator: find a fitting free block, maybe split it, update bookkeeping, maybe take a lock under multithreading, maybe ask the OS for more pages. Then deallocation costs again, and fragmentation accumulates. Orders of magnitude difference — which is why the rule is stack by default, heap only when lifetime or size demands it.',
      isCaseBased: false,
    },
    {
      question: 'What actually goes wrong when delete is used on memory from new[]?',
      answer:
        'new T[n] typically stores n in a hidden header just before the array, so delete[] knows how many destructors to run and where the raw block really starts. Plain delete assumes a single object: it runs at most one destructor and hands the allocator the wrong address — undefined behavior. For trivially-destructible types like int it may seem to work on your compiler, which makes it worse: the bug ships, then corrupts the heap the day someone changes the element type to a class. Rule: the form of delete must mirror the form of new — and the same logic forbids mixing malloc/free with new/delete.',
      isCaseBased: false,
    },
    {
      question: 'Case: a long-running service\'s memory climbs steadily for days — no crash, no errors — until the OS OOM-killer takes it down. Walk me through the hunt.',
      answer:
        'Steady growth proportional to work done = per-request leak (first rule out an unbounded cache — memory that is still reachable and grows by design). (1) Confirm: plot memory against requests handled; linear correlation means each request leaks a fixed amount. (2) Instrument: valgrind --leak-check=full or LeakSanitizer prints the allocation stack of every block never freed — that stack names the guilty new. (3) Audit that function\'s EXIT paths: early returns, error branches, exceptions. The leak is almost always on the sad path, because tests exercise the happy one. (4) Fix and prevent: delete on every path today; structurally, move the allocation into an RAII owner so no future path can leak; add the sanitizer to CI. Bonus point in interviews: "definitely lost" in valgrind means no pointer remains — a true leak — versus "still reachable", which is the unbounded-cache case.',
      isCaseBased: true,
    },
    {
      question: 'Can a reference be null?',
      answer:
        'Not legally — a reference must bind to an object at creation and has no null state, which is exactly why const T& parameters need no null check. You can manufacture one through undefined behavior: int* p = nullptr; int& r = *p; — but the UB already happened at *p, the dereference; everything after is a broken program. The design consequence: a function taking T& never checks for null, so if "nothing" is a possible input, the signature should have been T* in the first place. A "null reference" crash in production always means a caller upstream dereferenced a null pointer to create the binding.',
      isCaseBased: false,
    },
    {
      question: 'Why is returning a pointer or reference to a local variable a bug — and why does it often appear to work?',
      answer:
        'Locals live in the function\'s stack frame. Return pops the frame — the memory is not erased, just marked reusable. The returned address is dangling from that instant. It "works" in quick tests because nothing has overwritten that stack region yet; the very next function call scribbles over it and the value turns to garbage. Compilers warn about the direct case; the indirect ones (storing &local in a longer-lived structure) they cannot catch. Fixes: return by value (the normal answer — cheap, and Level 3\'s move semantics makes it cheaper), allocate on the heap with a clear owner, or let the caller pass in a buffer it owns.',
      isCaseBased: false,
    },
    {
      question: 'Explain double delete: what breaks, and what is the standard defense?',
      answer:
        'The first delete returns the block to the allocator\'s free structures. The second delete "frees" memory the allocator already owns — or has since handed to someone else — corrupting its bookkeeping. Undefined behavior: typically a crash inside a later, unrelated allocation, which makes it miserable to trace; historically it is also a classic heap-exploitation primitive, so it is a security bug, not just a stability one. Defense in this module\'s world: one owner per allocation, and p = nullptr immediately after delete — delete nullptr is defined as a no-op, so an accidental repeat becomes harmless. The real defense is Level 3: unique_ptr makes a second delete unwritable.',
      isCaseBased: false,
    },
    {
      question: 'Give the legitimate reasons to allocate on the heap at all.',
      answer:
        'Three: (1) Lifetime — the object must outlive the function that created it and returning by value does not fit (it is shared, or its address must stay stable). (2) Size — unknown until runtime, or too big for a stack that is only a few MB (buffers, large graphs). (3) Runtime polymorphism — you need a base-class pointer to a derived object whose concrete type is chosen while the program runs. Everything else defaults to the stack: faster, automatically cleaned, immune to every bug in this module. And in modern code, when you do go to the heap, the address goes straight into a smart pointer, not a raw one.',
      isCaseBased: false,
    },
    {
      question: 'Why do modern C++ style guides effectively ban raw new/delete — and what replaces them?',
      answer:
        'Because every bug in this module — leak, dangling pointer, double delete, mismatch — is a failure to manually pair new with exactly one delete on every path, including paths added years later and paths taken only by exceptions. RAII flips the model: the delete lives in a destructor, and the language guarantees destructors run on every exit from a scope, no matter how it exits. Smart pointers (unique_ptr, shared_ptr) are RAII prepackaged for heap memory — ownership becomes a type, and the compiler enforces what code review used to miss. That is the Level 3 module; this module is why it exists.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Reference in one line', back: 'A second name (alias) for an existing object. Must be initialized, can never reseat, can never be null.' },
    { front: 'Parameter decision rule', back: 'const T& by default (read-only, must exist) · T& to modify · T* when null/reseating is legal · plain T for cheap copies.' },
    { front: 'Stack vs heap lifetime', back: 'Stack: dies automatically at scope end. Heap: lives until YOUR delete — survives the function that made it.' },
    { front: 'Why the stack is fast', back: 'Allocation = one pointer bump; scope end frees everything at once. Heap = allocator bookkeeping: search, split, maybe lock.' },
    { front: 'Stack overflow causes', back: 'Huge local arrays or deep/runaway recursion — the whole stack is only ~1–8 MB. Big data belongs on the heap.' },
    { front: 'The pairing rule', back: 'new → delete, new[] → delete[], on EVERY exit path. Mismatch or mixing with free() = undefined behavior.' },
    { front: 'Dangling pointer', back: 'A pointer still holding the address of freed memory. Using it = use-after-free (UB that often "works" in tests).' },
    { front: 'Why null-after-delete works', back: 'delete nullptr is a guaranteed no-op — an accidental second delete becomes harmless, and if (p) tells the truth.' },
    { front: 'Memory leak', back: 'Heap memory never freed — usually an early return or exception skipping delete. Invisible per call; kills long-running processes.' },
    { front: 'Double delete', back: 'Freeing one address twice corrupts the allocator\'s bookkeeping — UB, crashes later in unrelated code. Defense: one owner + null-after-delete.' },
  ],
  mindmapMarkdown: `- References, new/delete & Stack vs Heap
  - References
    - alias: second name, no new object
    - must init · no reseat · no null
    - assignment writes THROUGH
    - params: const T& default, T* if nullable
  - Stack
    - automatic scope death
    - alloc = pointer bump (fast)
    - ~1–8 MB → stack overflow
  - Heap
    - new … lives until YOUR delete
    - allocator bookkeeping (slower)
    - RAM-sized; survives the function
  - new/delete
    - new → delete, new[] → delete[]
    - mismatch = UB
    - delete nullptr = safe no-op
  - The bug family
    - leak: some path skips delete
    - dangling: use-after-free
    - double delete: heap corruption
    - defense: one owner + null-after-delete
  - L3 preview: RAII & smart pointers automate delete`,
}

export default m
