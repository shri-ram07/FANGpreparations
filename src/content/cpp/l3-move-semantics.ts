import type { Module } from '../types'

const m: Module = {
  id: 'cpp-l3-move-semantics',
  subjectId: 'cpp',
  level: 3,
  title: 'Move Semantics, rvalue References & the Rule of 5',
  whyItMatters:
    '"What does std::move actually do?" is C++ interviewing\'s favorite trap — the honest answer is "nothing", and most candidates walk into it. Move semantics is also why modern C++ returns vectors by value for free, why push_back stays fast, and half of what unique_ptr even is. One module buys you the Rule of 5, the noexcept-vector story, and the implement-vector practical every systems interview loves.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'The problem: paying full price to copy something about to die',
      md: `You return a 10 MB \`std::string\` from a function. Pre-2011 C++ made a full duplicate — allocate 10 MB, copy 10 MB — then destroyed the original a microsecond later.

- Copying a resource-owning object (heap buffer, file handle, socket) means duplicating the resource. That is O(n) work and an allocation.
- But very often the source is a **temporary** — an object with no name that dies at the end of the expression.
- Duplicating something that is about to be destroyed is pure waste: build a copy, burn the original.
- The fix is obvious once said aloud: if the source is dying anyway, just *take* its resource.
- C++11 made that legal and automatic. The machinery: rvalue references, \`std::move\`, and move constructors.`,
    },
    {
      type: 'intuition',
      title: 'lvalues, rvalues, and T&&',
      md: `The compiler needs a rule for "is this source dying?" That rule is the expression's **value category**.

- **lvalue** — an expression with a name and an address: \`x\`, \`v[3]\`, \`*p\`. It lives on after this line; someone may use it again. Stealing from it would be theft.
- **rvalue** — a temporary: \`x + 5\`, \`makeVec()\`, \`std::string("hi")\`. No name, no future. After this line it is gone; stealing from it harms nobody.
- \`T&&\` is an **rvalue reference**: a reference that binds ONLY to rvalues. It is how a function says "hand me the dying ones".
- Overload resolution does the routing: \`f(const T&)\` catches lvalues, \`f(T&&)\` catches rvalues. Same call syntax, different treatment.
- That is the entire trick: mark dying objects in the type system, then write special constructors for them.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Value categories, caught in the act',
      code: `#include <utility>          // std::move lives here

int x = 10;                 // x is an lvalue: it has a name and an address
int* p = &x;                // proof: you can take its address

int&& r = x * 2;            // x * 2 is a temporary (an rvalue) -- && binds
// int&& bad = x;           // does NOT compile: && refuses lvalues

int&& ok = std::move(x);    // the cast relabels x as an rvalue -- now it binds
// x STILL HOLDS 10. Nothing moved. Permission was granted, never used.`,
      annotations: {
        3: 'Named and addressable = lvalue. It lives on after this line, so the language will not let it be silently stolen from.',
        6: 'A temporary has no name and dies at the end of the full expression. Stealing from it harms nobody — that is exactly who && exists to catch.',
        7: 'This refusal is the safety rail: an lvalue never binds to && by accident. To offer one up, you must opt in with std::move.',
        9: 'std::move(x) is a cast to int&&. It transfers nothing — it only makes x ELIGIBLE for overloads that take &&.',
      },
    },
    {
      type: 'note',
      md: `\`std::move\` moves nothing. It is a cast — essentially \`static_cast<T&&>(x)\` — that relabels an lvalue as an rvalue, making it eligible to bind to \`T&&\`. It grants *permission* to steal; the actual theft (if any) happens inside whichever move constructor or move assignment receives the result. Call \`std::move(x)\` and hand the result to nobody, and x is untouched. The name is famously misleading — read it as \`std::rvalue_cast\` and half the confusion in this topic disappears.`,
    },
    {
      type: 'intuition',
      title: 'The move constructor: take the key, not the house',
      md: `A copy constructor duplicates the resource. A move constructor **steals** it, in two mandatory steps:

- **Steal:** copy the source's pointer (and size fields) into yourself. Three word-sized copies — O(1), no allocation, whether the buffer holds 3 ints or 3 GB.
- **Null the source:** set the source's pointer to \`nullptr\`. Not politeness — correctness. Both objects' destructors WILL run; if both still point at one buffer, that buffer gets deleted twice.
- Signature: \`MiniVec(MiniVec&& o) noexcept\` — it takes \`T&&\`, so it is only chosen for rvalues: temporaries, or lvalues you explicitly \`std::move\`d.
- Move assignment is the same steal, plus one extra duty first: free whatever *you* were already holding, or it leaks.`,
    },
    {
      type: 'hinglish',
      md: `Copy constructor ka matlab: naya plot kharido, waisa hi ghar banao, purane ghar ka saara saaman ek-ek karke duplicate karo. Jitna bada ghar, utna bada bill — O(n). Move constructor bolta hai: purana malik waise bhi shehar chhod raha hai (temporary hai, marne wala hai) — construction kis liye? Bas uski **chaabi** le lo. Saaman wahi ka wahi, address wahi, sirf malik badla — teen pointer copies, O(1). Purana malik ab khaali haath hai, lekin *legal* state mein: usse naya saaman de do (assign) ya retire kar do (destroy) — bas uske purane saaman ke baare mein kuch mat poochho. Aur \`std::move\`? Woh sirf stamp lagata hai — "yeh malik ja raha hai, chaabi lena allowed hai." Khud kuch nahi uthata.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Copy vs move: duplicate the house, or hand over the key',
        notice: 'Step through: the same starting point, first down the copy timeline, then the move timeline.',
        frames: [
          {
            note: 'Setup: MiniVec a owns one heap buffer of 3 ints. Everything that follows is about the fate of this buffer.',
            stack: [{ name: 'a', to: 'buf' }],
            heap: [{ id: 'buf', value: '[10, 20, 30]', label: 'owned by a' }],
          },
          {
            note: 'COPY — MiniVec b = a: allocate a second buffer, duplicate all 3 elements. Two owners, two buffers. For 3 million elements: 3 million copies.',
            stack: [
              { name: 'a', to: 'buf' },
              { name: 'b', to: 'buf2' },
            ],
            heap: [
              { id: 'buf', value: '[10, 20, 30]', label: 'original' },
              { id: 'buf2', value: '[10, 20, 30]', label: 'duplicate' },
            ],
          },
          {
            note: 'Rewind — MOVE instead: MiniVec b = std::move(a). b takes a\'s pointer; a is nulled to an empty shell. Nothing was copied — one pointer changed hands.',
            stack: [
              { name: 'a', to: 'hollow' },
              { name: 'b', to: 'buf' },
            ],
            heap: [
              { id: 'buf', value: '[10, 20, 30]', label: 'same buffer' },
              { id: 'hollow', value: '(empty)', moved: true },
            ],
          },
          {
            note: 'Aftermath: a is valid-but-unspecified — assign it a new value or let it die. Both destructors will run: a deletes nullptr (no-op), b deletes the buffer. One buffer, one delete.',
            stack: [
              { name: 'a', to: 'hollow' },
              { name: 'b', to: 'buf' },
            ],
            heap: [
              { id: 'buf', value: '[10, 20, 30]', label: 'same buffer' },
              { id: 'hollow', value: '(empty)', moved: true },
            ],
          },
        ],
      },
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'MiniVec, part 1: the copy half (Rule of 3)',
      code: `#include <cstddef>      // std::size_t
#include <algorithm>    // std::copy

class MiniVec {
  int* data_ = nullptr;      // the owned resource: a raw heap buffer
  std::size_t size_ = 0;     // elements in use
  std::size_t cap_ = 0;      // slots allocated

 public:
  MiniVec() = default;

  ~MiniVec() { delete[] data_; }            // 1/5: destructor

  MiniVec(const MiniVec& o)                 // 2/5: copy ctor -- deep copy
      : data_(o.cap_ ? new int[o.cap_] : nullptr),
        size_(o.size_),
        cap_(o.cap_) {
    std::copy(o.data_, o.data_ + o.size_, data_);
  }

  MiniVec& operator=(const MiniVec& o) {    // 3/5: copy assign
    if (this == &o) return *this;
    int* fresh = o.cap_ ? new int[o.cap_] : nullptr;
    std::copy(o.data_, o.data_ + o.size_, fresh);
    delete[] data_;                         // free old only AFTER new succeeded
    data_ = fresh;
    size_ = o.size_;
    cap_ = o.cap_;
    return *this;
  }
  // 4/5 and 5/5 (the move half) + push_back: next block
};`,
      annotations: {
        5: 'A raw owning pointer. The moment this line exists, every compiler-generated special member is wrong (they copy the pointer, not the buffer) — Rule of 5 territory.',
        12: 'delete[] on nullptr is a legal no-op — which is exactly what lets a moved-from MiniVec (holding nullptr) be destroyed safely.',
        14: 'Deep copy: a NEW allocation plus copying every element. O(n). This cost is the villain move semantics was invented to avoid.',
        22: 'Self-assignment guard. With the allocate-first ordering below it is technically just an optimization — but it is free insurance and reviewers look for it.',
        25: 'Exception safety: if new threw two lines up, *this was not yet touched — the object survives intact. Allocate first, free second.',
      },
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'MiniVec, part 2: the move half + push_back',
      code: `// inside class MiniVec -- add #include <utility> for std::exchange

MiniVec(MiniVec&& o) noexcept             // 4/5: move ctor -- steal the key
    : data_(std::exchange(o.data_, nullptr)),
      size_(std::exchange(o.size_, 0)),
      cap_(std::exchange(o.cap_, 0)) {}

MiniVec& operator=(MiniVec&& o) noexcept { // 5/5: move assign
  if (this == &o) return *this;           // self-move guard -- REQUIRED here
  delete[] data_;                         // release what we already owned
  data_ = std::exchange(o.data_, nullptr);
  size_ = std::exchange(o.size_, 0);
  cap_ = std::exchange(o.cap_, 0);
  return *this;
}

void push_back(int v) {
  if (size_ == cap_) {                    // full -> grow
    std::size_t nc = cap_ ? cap_ * 2 : 1; // amortized doubling
    int* fresh = new int[nc];
    std::copy(data_, data_ + size_, fresh);
    delete[] data_;
    data_ = fresh;
    cap_ = nc;
  }
  data_[size_++] = v;
}`,
      annotations: {
        3: 'noexcept is load-bearing: std::vector only uses your move during regrowth if it promises not to throw. Stealing a pointer cannot throw — so say so.',
        4: 'std::exchange(o.data_, nullptr): grab the old value, leave nullptr behind — steal and null in one expression. The whole ctor is three word copies: O(1) for 3 ints or 3 GB.',
        6: 'The source leaves as {nullptr, 0, 0} — empty but valid: its destructor deletes nullptr (no-op), and it can be assigned a fresh value.',
        9: 'Unlike copy assign, this guard is mandatory: v = std::move(v) would delete data_ and then "steal" the pointer it just freed — double delete at destruction.',
        10: 'A move CTOR starts empty; move ASSIGN does not. Skip this delete and the buffer we held leaks forever.',
        21: 'Our elements are ints, so copying is the transfer. Real std::vector<T> moves each T here — but only if T\'s move ctor is noexcept; otherwise it copies, to keep rollback possible.',
      },
    },
    {
      type: 'intuition',
      title: 'noexcept: the password std::vector checks',
      md: `\`noexcept\` is a promise to the compiler: this function will not throw. On move operations it is not decoration — it changes which code path the STL takes.

- When \`std::vector<T>\` grows, it must transfer every element into the new, bigger buffer.
- It WANTS to move them (cheap). But if a move threw halfway, half the elements live in the new buffer and half in the old — the strong exception guarantee ("fully succeed or leave the vector untouched") is unrecoverable.
- So vector asks at compile time: is T's move constructor \`noexcept\`? Yes → it moves. No → it copies every element, purely to keep rollback possible.
- Forget \`noexcept\` on your move ctor and every regrowth silently deep-copies. Correct program, invisible slowdown — the classic "why is my vector slow" bug.
- Steal-a-pointer moves cannot throw anyway. Writing \`noexcept\` costs nothing and is simply the truth.`,
    },
    {
      type: 'intuition',
      title: 'The moved-from object: valid but unspecified',
      md: `After \`MiniVec b = std::move(a)\`, what is \`a\`? The standard's exact phrase: **valid but unspecified**.

- *Valid*: \`a\` is still a real object. Its invariants hold, and its destructor will run safely (ours holds \`nullptr\`; \`delete[] nullptr\` is a no-op).
- *Unspecified*: you may not assume WHAT it contains. Ours happens to be empty; other types promise nothing at all.
- Exactly two things are always legal: **assign it a new value** (\`a = MiniVec{}\` — it becomes fully usable again) or **let it be destroyed**.
- Do NOT read it, iterate it, or branch on its size. Even when that happens to work, it is a landmine for the next refactor.
- Interview phrasing: "std::move leaves the source valid but unspecified — I may assign to it or destroy it, nothing else."`,
    },
    {
      type: 'intuition',
      title: 'Rule of 5, Rule of 0',
      md: `- **Rule of 5:** if a class directly owns a raw resource (raw \`new\` pointer, file descriptor, OS handle), the compiler-generated special members are all wrong — they copy the pointer, not the resource. Write all five: destructor, copy ctor, copy assign, move ctor, move assign. MiniVec above is the rule in living code.
- Writing only SOME is a trap: declare just a destructor and the compiler stops generating move operations — your class silently copies everywhere it could have moved.
- **Rule of 0:** own nothing raw and write NONE of the five. Hold resources through members that manage themselves — \`std::vector\`, \`std::string\`, \`std::unique_ptr\` — and the generated five do the right thing member by member.
- Rule of 0 is the modern default. Rule of 5 is reserved for the classes that *implement* the managing layer: containers, smart pointers, RAII wrappers.
- Code-review heuristic: a class with a destructor but no move ops is either pre-C++11 or a bug.`,
    },
    {
      type: 'note',
      md: `When do moves fire without you typing \`std::move\`? Two cases. **Returning a local by value**: the local is dying, so \`return v\` treats \`v\` as an rvalue automatically — and usually does even better: with **RVO** (return value optimization — the compiler constructs the local directly in the caller's memory) there is *zero* copy and zero move. **Passing a temporary**: \`take(MiniVec{})\` is already an rvalue, no cast needed. Corollary worth repeating in interviews: \`return std::move(local)\` is an anti-pattern — it disables RVO and forces the very move it was trying to guarantee. Write \`return local\` and let the compiler choose: elide if it can, move if it must, copy never (for movable types).`,
    },
  ],
  quiz: [
    {
      question: 'What does std::move(x) do to x?',
      options: [
        {
          text: 'Transfers x\'s contents to the destination',
          explanation: 'std::move has no destination — it takes one argument and returns a reference. Any transferring is done later, by a move ctor/assign.',
        },
        {
          text: 'Nothing — it is a cast to T&& so that move overloads can bind; the stealing (if any) happens in whoever receives the result',
          explanation: 'Correct. std::move is essentially static_cast<T&&>(x): a relabeling. Permission, not action.',
        },
        {
          text: 'Destroys x immediately',
          explanation: 'x\'s destructor runs at the end of its scope as always. std::move changes no lifetimes.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Which of these expressions is an rvalue?',
      options: [
        { text: 'x (a named int variable)', explanation: 'Named and addressable — an lvalue with a future. It will not bind to &&.' },
        { text: 'x + 1', explanation: 'Correct. The sum is a temporary: no name, dies at the end of the expression — exactly what && binds to.' },
        { text: '*p (dereferencing an int*)', explanation: 'Dereferencing yields an lvalue — the object p points at has an address and lives on.' },
      ],
      correct: 1,
    },
    {
      question: 'Why must a move constructor null the source\'s pointer?',
      options: [
        { text: 'To free the source\'s memory', explanation: 'Nulling frees nothing — it just disowns. The buffer lives on, now owned by the destination.' },
        {
          text: 'Both objects\' destructors will run; two owners of one buffer means delete[] runs twice on it',
          explanation: 'Correct. The moved-from object still gets destroyed. If it still points at the buffer, that is a double delete — nulling makes its destructor a harmless no-op.',
        },
        {
          text: 'So the compiler knows the object was moved from',
          explanation: 'The compiler tracks nothing at runtime — "moved-from" is a programmer convention, enforced only by your own steal-and-null code.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Cost of MiniVec\'s move constructor for a 1M-element vector?',
      options: [
        { text: 'O(n) — every element is transferred', explanation: 'That is the COPY constructor. The move never touches elements at all.' },
        { text: 'O(1) — three word-sized copies, zero allocation', explanation: 'Correct. Steal the pointer, steal two size fields, null the source. Size of the buffer is irrelevant.' },
        { text: 'O(n log n)', explanation: 'Nothing is sorted or searched in a move — there is no n in it at all.' },
      ],
      correct: 1,
    },
    {
      question: 'You forget noexcept on your move constructor. What does std::vector<YourType> do when it regrows?',
      options: [
        { text: 'Fails to compile', explanation: 'It compiles fine — the choice between move and copy is made silently via type traits.' },
        { text: 'Moves the elements anyway', explanation: 'It will not risk it: a throwing move halfway through regrowth would break the strong exception guarantee with no way to roll back.' },
        {
          text: 'Falls back to copying every element into the new buffer',
          explanation: 'Correct. vector checks is_nothrow_move_constructible; without the noexcept promise it copies so a failure can be rolled back. Silent, legal, slow.',
        },
      ],
      correct: 2,
    },
    {
      question: 'After MiniVec b = std::move(a), which use of a is guaranteed safe by the general moved-from contract?',
      options: [
        { text: 'Read a.size() and branch on the value', explanation: 'Moved-from state is unspecified — the value you read means nothing, and relying on it is a latent bug.' },
        { text: 'a = MiniVec{} — assign it a fresh value', explanation: 'Correct. Assignment (and destruction) are the two always-legal operations; assignment fully reanimates the object.' },
        { text: 'Nothing — a was destroyed by the move', explanation: 'a is alive and valid; its destructor runs at scope end as usual. Moving changes contents, not lifetime.' },
      ],
      correct: 1,
    },
    {
      question: 'Your class holds only a std::string and a std::vector<int>. How many of the five special members should you write?',
      options: [
        { text: 'All five — Rule of 5', explanation: 'Rule of 5 is for classes owning RAW resources. Here the members already manage themselves; handwritten specials just add bug surface.' },
        {
          text: 'Zero — Rule of 0',
          explanation: 'Correct. The compiler-generated five copy/move/destroy member by member, and string and vector each do the right thing. Modern default.',
        },
        {
          text: 'Just the destructor, to be safe',
          explanation: 'The worst option: a user-declared destructor suppresses the generated move operations, so the class silently copies where it could move.',
        },
      ],
      correct: 2,
    },
    {
      question: 'A teammate writes return std::move(local) "to make sure it moves". Verdict?',
      options: [
        { text: 'Good — it guarantees the move', explanation: 'It does force a move — which is the problem. Without it the compiler could do even better than a move.' },
        {
          text: 'Bad — it blocks RVO; plain return local elides the object entirely or moves automatically',
          explanation: 'Correct. Returning a local is already move-eligible, and RVO can construct it directly in the caller — zero moves. std::move disqualifies that elision. Compilers even warn (-Wpessimizing-move).',
        },
        { text: 'Required — otherwise the local is copied', explanation: 'False since C++11: return of a local by value moves automatically when it cannot be elided. Copy is the last resort, not the default.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Whiteboard: explain move semantics in two minutes — story first, then mechanics.',
      answer:
        'Story: copying a resource-owning object is buying a new plot and rebuilding the house — O(n) plus allocation. When the seller is leaving town forever (a temporary), that is waste: just take the key. A move copies the pointer and nulls the source — O(1) whatever the size. Mechanics: value categories decide who is "leaving town" (rvalues — temporaries, no name, no future); T&& is a reference that binds only to those, so overload resolution routes rvalues to the move constructor and lvalues to the copy constructor; std::move is a cast that lets you mark a named object as leaving. The move ctor steals, nulls the source (or double delete), and is noexcept (or vector will not use it). Close with the payoff: returning containers by value is free, and move-only types like unique_ptr become possible.',
      isCaseBased: false,
    },
    {
      question: '"std::move doesn\'t move." Defend that statement, and name the two follow-up traps interviewers attach to it.',
      answer:
        'Defense: std::move is a cast — static_cast<T&&> in essence. It changes the value category of the expression, nothing about the object. Transfer happens only if the result binds to a move ctor/assign, which does the actual stealing. Trap 1: std::move on a CONST object — a const rvalue cannot bind to T&&, so overload resolution quietly falls back to the copy constructor (const T& binds anything). Your "move" compiles, runs, and copies. Trap 2: std::move with no receiver — std::move(x); on its own line does literally nothing to x. Tradeoff worth naming: this permission-not-action design keeps moves visible and opt-in for named objects, at the cost of a badly named function that misleads every beginner.',
      isCaseBased: false,
    },
    {
      question: 'Case: a teammate profiles your service and finds std::vector<Widget> regrowth is deep-copying Widgets — even though Widget "has move support". Diagnose.',
      answer:
        'Two usual suspects, in order. (1) The move ctor is not noexcept: vector checks is_nothrow_move_constructible<Widget> before regrowth; without the promise it copies so a mid-transfer exception can be rolled back (strong guarantee). Fix: mark move ctor/assign noexcept, and pin it with static_assert(std::is_nothrow_move_constructible_v<Widget>) so a future edit cannot regress silently. (2) Widget never actually had generated moves: a user-declared destructor or copy operation suppresses move generation, and "it compiles" proves nothing — is_move_constructible stays true because T&& happily binds to the COPY ctor. Also check (3): a single const or non-movable member degrades the whole memberwise move to copies. Tradeoff to mention: noexcept is a hard promise — if the move ever could throw, lying with noexcept means std::terminate, so the correct fix for genuinely-throwing moves is redesign, not annotation.',
      isCaseBased: true,
    },
    {
      question: 'Rule of 5 vs Rule of 0 — when do you apply each, and what is the tradeoff?',
      answer:
        'Rule of 5: the class directly owns a raw resource (raw new pointer, fd, OS handle), so generated specials are wrong — write destructor, copy ctor, copy assign, move ctor, move assign. Rule of 0: own nothing raw — hold resources via self-managing members (vector, string, unique_ptr) and write none; the generated five are correct memberwise. Tradeoff: Rule of 5 gives full control and is required at the resource-management layer (containers, smart pointers, RAII wrappers), but it is five hand-written chances for double-frees, leaks and missed self-moves. Rule of 0 is correct by composition with zero code, but forces you to push raw ownership down into a managing member — unique_ptr with a custom deleter covers almost every exotic handle. Senior default: Rule of 0 everywhere, Rule of 5 only in the thin layer that implements ownership.',
      isCaseBased: false,
    },
    {
      question: 'Why does the standard leave the moved-from state "valid but unspecified" instead of guaranteeing "empty"?',
      answer:
        'Performance freedom. Mandating "empty" would force every move to pay for a defined reset even when nobody looks at the source. Concrete example: a small std::string stores its chars inline (SSO) — moving it COPIES the bytes, and the cheapest legal implementation may leave the source\'s bytes as they were; forcing "empty" adds a pointless write. So the contract is: valid (invariants hold, destructor and assignment are safe) but unspecified (no promised value) — the caller may assign or destroy, nothing else. The tradeoff is programmer certainty: you cannot portably read a moved-from object. Some types opt into stronger promises where it is free — unique_ptr is guaranteed null after move. Interviewers reward knowing both the rule and why it is loose.',
      isCaseBased: false,
    },
    {
      question: 'Case: in code review you find return std::move(result); sprinkled through a codebase "for performance". Flag or approve, and what are the legitimate uses?',
      answer:
        'Flag. Returning a local by name is already move-eligible, and better: NRVO can construct result directly in the caller\'s slot — zero copies, zero moves. Wrapping it in std::move changes the returned expression so elision no longer applies: you forced a move where the compiler offered free. Compilers agree — clang/gcc emit -Wpessimizing-move exactly for this, so turn the warning on and let tooling do the review. Legitimate std::move in a return: returning a SUBOBJECT (return std::move(pair_.first) — implicit move never applies to members), or moving out of an lvalue you genuinely own and will not reuse. Tradeoff to state: the rule "never std::move a plain returned local" is worth a slightly longer style guide, because the failure mode of the cargo-cult version is silent pessimization.',
      isCaseBased: true,
    },
    {
      question: 'Our copy assignment\'s self-assignment guard was "just an optimization", but the move assignment\'s self-move guard is mandatory. Why the asymmetry?',
      answer:
        'Ordering. The copy assign allocates and copies FROM the source before deleting its own buffer — under self-assignment the source is still intact when read, so the result is correct even without the guard (just wasteful). The move assign does the opposite: it deletes its own buffer FIRST, and under self-move that buffer IS the source — the subsequent steal grabs a just-freed pointer and the destructor double-frees. Alternatives and tradeoffs: (a) the if (this == &o) guard — one predictable branch, essentially free; (b) the move-and-swap idiom — no guard needed and gives the strong guarantee, but costs extra swaps and holds both buffers alive momentarily. Either is acceptable in interviews; forgetting both is the fail.',
      isCaseBased: false,
    },
    {
      question: 'Whiteboard: a class holds char* buf; size_t len. Write its move constructor and name each obligation.',
      answer:
        'Type(Type&& o) noexcept : buf(std::exchange(o.buf, nullptr)), len(std::exchange(o.len, 0)) {}. Three obligations: (1) STEAL — take the pointer and length; O(1), no allocation. (2) NULL THE SOURCE — o.buf = nullptr so the source\'s destructor becomes a no-op; skip this and both destructors delete one buffer (double free). (3) NOEXCEPT — pointer theft cannot throw, and the promise is what lets std::vector move your type during regrowth instead of copying. Bonus points: mention the matching move assignment adds two more duties — free your OWN old buffer first (else leak) and guard against self-move (else double free).',
      isCaseBased: false,
    },
    {
      question: 'Why did C++ add a whole new reference type (T&&) instead of having the compiler just detect temporaries automatically?',
      answer:
        'Because "is this dying?" must be visible to OVERLOAD RESOLUTION: the routing between copy ctor and move ctor is nothing but overloading on const T& vs T&&, decided at compile time. A hidden compiler analysis could not do two things the type gives for free: (1) safety — lvalues can never accidentally route to the stealing overload; binding an lvalue to && is a compile error unless you explicitly opt in with std::move; (2) opt-in for named objects — sometimes YOU know a named object is done (last use before return) and want to hand it over; that needs a syntax, and std::move casting into the && world is that syntax. The cost side of the tradeoff is real and worth admitting: C++ bought this with a whole value-category taxonomy (lvalue/prvalue/xvalue) and the notorious reference-collapsing rules — power paid for in language complexity.',
      isCaseBased: false,
    },
    {
      question: 'Case: after a teammate "added move support" to a legacy class, production intermittently crashes with "double free or corruption". Where do you look?',
      answer:
        'The crash signature says one buffer, two deletes. Suspects in order: (1) the move ctor steals but never nulls the source — both objects\' destructors delete the same pointer; grep the move ops for the null/exchange step first. (2) The move ASSIGN lacks a self-move guard — it deletes its own buffer, then steals the freed pointer from itself; happens via algorithms that can self-move-assign (some erase/remove and rotate paths). (3) Distinguish the near-miss: move assign that forgot to delete its OWN old buffer is a LEAK, not a crash — if you see rising RSS instead of crashes, it is that one. Diagnosis tooling: AddressSanitizer reports both free sites and the alloc site — usually pinpoints it in one run; valgrind if ASan is unavailable. Fix pattern: write both move ops with std::exchange so steal-and-null is a single idiom, add noexcept, and add a unit test that moves, destroys both, and self-move-assigns under ASan.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'lvalue vs rvalue, one line each', back: 'lvalue: named, addressable, lives on (x, v[3], *p). rvalue: nameless temporary, dies at end of expression (x+1, makeVec()).' },
    { front: 'What does T&& bind to?', back: 'Only rvalues — temporaries and std::move-d lvalues. It is the routing signal that sends dying objects to move overloads.' },
    { front: 'std::move in one line', back: 'A cast (≈ static_cast<T&&>) — moves NOTHING. It grants permission; the theft happens in the move ctor/assign that receives it.' },
    { front: 'The move constructor\'s two steps', back: 'Steal (copy pointer + sizes, O(1)) and NULL THE SOURCE — both destructors will run, and two owners of one buffer = double delete.' },
    { front: 'Extra duties of move ASSIGNMENT over move construction', back: 'Free your own old buffer first (else leak) and guard self-move (else double delete: you free, then steal the freed pointer).' },
    { front: 'Why noexcept on move ops', back: 'std::vector regrowth only moves elements if the move cannot throw (strong guarantee); otherwise it silently deep-copies. noexcept is the password.' },
    { front: 'The moved-from state', back: 'Valid but unspecified: invariants hold, destructor is safe — but the value is unknowable. Only assign or destroy.' },
    { front: 'Rule of 5', back: 'Class owns a raw resource → write all five: destructor, copy ctor, copy assign, move ctor, move assign. (Destructor alone suppresses generated moves.)' },
    { front: 'Rule of 0', back: 'Own nothing raw → write NONE of the five; self-managing members (vector, string, unique_ptr) make the generated ones correct. The modern default.' },
    { front: 'return std::move(local) — verdict?', back: 'Anti-pattern: blocks RVO/NRVO. Plain "return local" elides entirely or moves automatically — never copies (for movable types).' },
  ],
  mindmapMarkdown: `- Move Semantics, rvalue References & the Rule of 5
  - The problem
    - copying a dying temporary = pure waste
    - fix: steal the resource, don't duplicate
  - Value categories
    - lvalue: named, addressable, has a future
    - rvalue: temporary, about to die
    - T&& binds only to rvalues
    - std::move = a cast, moves nothing
  - Move operations
    - move ctor: steal pointer + null source
    - null the source or double delete
    - move assign: free own buffer first
    - self-move guard is mandatory
    - noexcept → vector moves on regrowth
  - Moved-from state
    - valid but unspecified
    - assign or destroy, nothing else
  - Rule of 5 / Rule of 0
    - raw resource → write all five
    - a lone destructor kills generated moves
    - own nothing raw → write none (default)
  - Automatic moves
    - return local → move, RVO often elides
    - return std::move(local) = anti-pattern`,
}

export default m
