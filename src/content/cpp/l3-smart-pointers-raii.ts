import type { Module } from '../types'

const m: Module = {
  id: 'cpp-l3-smart-pointers-raii',
  subjectId: 'cpp',
  level: 3,
  title: 'RAII & Smart Pointers — Why Raw new Is Dead',
  whyItMatters:
    '"Explain RAII" and "unique_ptr vs shared_ptr" are the two most reliable C++ interview questions in existence — they separate people who write C++ from people who fight it. This module gives you the ownership model that makes leaks and double-frees structurally impossible, plus the 25-line UniquePtr you may be asked to write on a whiteboard.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'RAII: the resource that returns itself',
      md: `Imagine a rental car that drives itself back the moment you step out — front door, side door, or ejected through the window. You cannot forget to return it.

- **RAII** (*Resource Acquisition Is Initialization* — worst name in programming, best idea): tie a resource's lifetime to an object's lifetime.
- Acquire the resource in the **constructor** (the function that runs when an object is created). Release it in the **destructor** (the function that runs when it dies).
- The destructor runs **whenever the object leaves scope** — normal end, early \`return\`, or an exception flying through.
- Works for anything you must give back: memory, files, mutex locks, sockets, DB connections.
- Manual cleanup loses because a function has *many* exits and you must remember every one. RAII wins because the compiler remembers for you, on all of them.`,
    },
    {
      type: 'note',
      md: `Exceptions in 30 seconds, because RAII needs them: \`throw\` raises an error object; a \`try { } catch (...) { }\` block downstream catches it. Between throw and catch, the runtime performs **stack unwinding** — it walks back out of every function in between, destroying each local object in reverse creation order, *running their destructors*. That is the whole magic: an exception cannot skip cleanup, because cleanup lives in destructors. One rule to say in interviews: a destructor must never throw during unwinding — two live exceptions means \`std::terminate\`, instant death.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'try / catch — the working grammar',
      code: `#include <iostream>
#include <stdexcept>
#include <string>

double divide(double a, double b) {
  if (b == 0.0)
    throw std::invalid_argument("division by zero");
  return a / b;
}

int main() {
  try {
    std::cout << divide(10, 2) << '\\n';   // 5
    std::cout << divide(1, 0) << '\\n';    // throws - next line never runs
    std::cout << "unreachable";
  } catch (const std::invalid_argument& e) {
    std::cout << "bad input: " << e.what() << '\\n';
  } catch (const std::exception& e) {      // base class catches the rest
    std::cout << "other failure: " << e.what() << '\\n';
  }
  return 0;
}`,
      annotations: {
        7: 'Throw types from <stdexcept> (or your own class deriving std::exception) — never throw raw strings or ints; catchers need a type and a what().',
        14: 'The throw abandons this line mid-expression; control transfers to the first matching catch, unwinding on the way.',
        16: 'Catch by CONST REFERENCE — by value would slice a derived exception (the slicing lesson from the vtables module, again).',
        18: 'Order matters: most-derived first. A std::exception& clause before invalid_argument would swallow everything.',
      },
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'One function, three exits — zero cleanup code',
      code: `#include <fstream>
#include <mutex>
#include <stdexcept>
#include <string>

std::mutex m;

void appendLog(const std::string& msg) {
    std::lock_guard<std::mutex> guard(m);
    std::ofstream file("app.log", std::ios::app);

    if (!file) return;
    if (msg.empty())
        throw std::runtime_error("empty line");

    file << msg << '\\n';
}`,
      annotations: {
        9: 'Constructor locks the mutex. Destructor unlocks. No unlock() call will ever appear in this function.',
        10: 'Constructor opens the file. Destructor closes it. Same deal.',
        12: 'Exit 1 — early return: both destructors run. Lock released, file closed.',
        14: 'Exit 2 — exception: unwinding destroys file, then guard (reverse order). Still released.',
        17: 'Exit 3 — normal end. Three exits, one behavior. THAT is why RAII beats manual cleanup.',
      },
    },
    {
      type: 'intuition',
      title: 'unique_ptr: one owner, zero overhead',
      md: `A \`std::unique_ptr<T>\` is a car key that exactly one person can hold. Losing the holder returns the car.

- **Sole ownership**: the unique_ptr owns the heap object; its destructor calls \`delete\`. No sharing, ever.
- Create with \`std::make_unique<T>(args)\` — no raw \`new\` in your code, and it is exception-safe.
- **Cannot copy** (the compiler deletes the copy constructor — two owners would mean double delete). **Can move**: \`std::move\` hands the key over and leaves the source holding nothing (null).
- **Zero overhead**: same size as a raw pointer, no reference count, the \`delete\` inlines. There is no performance excuse to avoid it.
- Custom deleter in one line: \`std::unique_ptr<FILE, decltype(&fclose)> f(fopen("a.txt", "r"), &fclose)\` — now RAII manages a C API.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'unique_ptr in real code',
      code: `#include <cstdio>
#include <memory>

struct Texture { int id; };   // stand-in for a big GPU resource

std::unique_ptr<Texture> load() {
    auto t = std::make_unique<Texture>();
    return t;
}

int main() {
    auto a = load();
    // auto b = a;               // ERROR: copy constructor is deleted
    auto b = std::move(a);       // ownership transferred; a is now null

    std::unique_ptr<FILE, decltype(&fclose)> f(fopen("cfg.txt", "r"), &fclose);
}`,
      annotations: {
        7: 'make_unique: the only place the object is born. Your code never says new.',
        8: 'Returning moves it out — ownership transfers up the call chain for free. Factory functions love this.',
        13: 'The compiler enforces sole ownership. This bug cannot compile — that is the point.',
        14: 'After the move, a.get() == nullptr. Using *a here is the classic self-inflicted bug.',
        16: 'The one-line custom deleter: when f dies, fclose runs. Any C resource becomes RAII.',
      },
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'The whiteboard classic: build UniquePtr yourself',
      code: `template <typename T>
class UniquePtr {
  T* p_ = nullptr;

 public:
  explicit UniquePtr(T* p = nullptr) : p_(p) {}
  ~UniquePtr() { delete p_; }

  UniquePtr(const UniquePtr&) = delete;
  UniquePtr& operator=(const UniquePtr&) = delete;

  UniquePtr(UniquePtr&& o) noexcept : p_(o.p_) { o.p_ = nullptr; }
  UniquePtr& operator=(UniquePtr&& o) noexcept {
    if (this != &o) {
      delete p_;
      p_ = o.p_;
      o.p_ = nullptr;
    }
    return *this;
  }

  T& operator*() const { return *p_; }
  T* operator->() const { return p_; }
  T* get() const { return p_; }
  explicit operator bool() const { return p_ != nullptr; }
};`,
      annotations: {
        7: 'The entire RAII contract is this line. delete on nullptr is safe — no if needed.',
        9: 'Deleting copy IS the design: sole ownership enforced by the compiler, not by discipline.',
        12: 'Move = steal the pointer, null the source. noexcept matters: containers only use your move if it cannot throw.',
        14: 'Self-move guard: x = std::move(x) must not delete the pointer it is about to keep.',
        17: 'Nulling the source is what prevents double delete when both objects later die.',
      },
    },
    {
      type: 'intuition',
      title: 'shared_ptr: counted owners',
      md: `Last person out of the office turns off the lights. Not the first — the *last*.

- \`std::shared_ptr<T>\` allows **many owners**. A hidden **control block** (a small heap struct) counts them; each copy increments, each destruction decrements, and the owner that drops the count to **0** deletes the object.
- You already own this idea from Python: CPython frees every object by reference counting — \`shared_ptr\` is the same machinery, opted into per object (see the Python GIL & memory module).
- Always create with \`std::make_shared<T>(args)\`: **one allocation** holds object + control block together (faster, cache-friendly), versus two allocations for \`shared_ptr<T>(new T)\`.
- **The cost**: every copy/destroy is an **atomic** counter operation (thread-safe increment — the CPU synchronizes it across cores). In hot loops and contended code, that is real money.
- **When it is right**: lifetime genuinely shared or unknowable — caches, observer lists, async callbacks that may outlive the caller. **When it is a smell**: \`shared_ptr\` sprinkled everywhere because nobody decided who owns what. Default to \`unique_ptr\`; upgrade only with a reason you can say out loud.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'shared_ptr: the refcount, drawn',
        notice: 'The control block counts owners. The LAST owner to die frees the object — no delete anywhere in your code.',
        leftLabel: 'stack (owners)',
        rightLabel: 'heap',
        frames: [
          {
            note: 'auto sp1 = std::make_shared<Data>() — one owner exists. Control block: refs 1.',
            stack: [{ name: 'sp1', to: 'd' }],
            heap: [{ id: 'd', value: 'Data · refs: 1', label: 'control block' }],
          },
          {
            note: 'auto sp2 = sp1 — copying bumps the count (an atomic increment). Two owners, one object.',
            stack: [{ name: 'sp1', to: 'd' }, { name: 'sp2', to: 'd' }],
            heap: [{ id: 'd', value: 'Data · refs: 2' }],
          },
          {
            note: 'sp2 leaves scope. Its destructor decrements: refs 1. Object untouched — an owner remains.',
            stack: [{ name: 'sp1', to: 'd' }],
            heap: [{ id: 'd', value: 'Data · refs: 1' }],
          },
          {
            note: 'sp1 dies. refs hit 0 — Data destructor runs, memory freed. Automatic, on every exit path.',
            stack: [],
            heap: [{ id: 'd', value: 'Data · refs: 0', freed: true }],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'weak_ptr: the cycle breaker',
      md: `Reference counting has exactly one blind spot, and Python taught it to you already: **cycles**.

- Node A holds a \`shared_ptr\` to B; B holds one back to A. Even when every outside owner dies, each keeps the other's count at 1. Counts never reach 0 — **leaked forever**. (Python ships a cycle-collecting gc for this; C++ ships *you*.)
- \`std::weak_ptr<T>\` observes an object **without owning it** — it points at the control block but does not raise the count.
- The rule of thumb: in any parent/child or doubly-linked design, **back-pointers are weak**. Ownership flows one way; observation flows back.
- A weak_ptr cannot be dereferenced directly (the object might be gone). The idiom: \`if (auto s = wp.lock()) { use(s); }\` — \`lock()\` atomically returns a real \`shared_ptr\` if the object is alive, or an empty one if not.
- No crash either way: alive means \`s\` keeps it alive for the block; dead means the \`if\` simply skips.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'The cycle leak — and the weak_ptr fix',
        notice: 'The diagram cannot draw heap-to-heap arrows, so each box names its heap owner: A.next owns B, B.prev owns A. That mutual grip is the bug.',
        leftLabel: 'stack (owners)',
        rightLabel: 'heap (the cycle)',
        frames: [
          {
            note: 'a owns A, b owns B — plus A.next = b and B.prev = a, both shared_ptr. Every node has 2 owners.',
            stack: [{ name: 'a', to: 'A' }, { name: 'b', to: 'B' }],
            heap: [
              { id: 'A', value: 'A · refs: 2', label: 'a + B.prev' },
              { id: 'B', value: 'B · refs: 2', label: 'b + A.next' },
            ],
          },
          {
            note: 'Scope ends: a and b die. But A.next and B.prev still grip each other — refs stuck at 1. Leaked forever.',
            stack: [],
            heap: [
              { id: 'A', value: 'A · refs: 1', label: 'leaked' },
              { id: 'B', value: 'B · refs: 1', label: 'leaked' },
            ],
          },
          {
            note: 'The fix: B.prev becomes a weak_ptr. Weak arrows do NOT count — now A has 1 owner (a), B still has 2.',
            stack: [{ name: 'a', to: 'A' }, { name: 'b', to: 'B' }],
            heap: [
              { id: 'A', value: 'A · refs: 1', label: 'weak: B.prev' },
              { id: 'B', value: 'B · refs: 2', label: 'b + A.next' },
            ],
          },
          {
            note: 'Scope ends: A hits 0 and is freed, which kills A.next, so B hits 0 and is freed. The chain collapses cleanly.',
            stack: [],
            heap: [
              { id: 'A', value: 'A · refs: 0', freed: true },
              { id: 'B', value: 'B · refs: 0', freed: true },
            ],
          },
        ],
      },
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'make_shared + the lock() idiom',
      code: `#include <memory>

struct Session { void send() {} };

auto sp = std::make_shared<Session>();
std::weak_ptr<Session> wp = sp;

void poke() {
    if (auto s = wp.lock()) {
        s->send();
    }
}`,
      annotations: {
        5: 'ONE allocation carries the Session and its control block. shared_ptr<Session>(new Session) would take two.',
        6: 'weak_ptr observes: the refcount does not change. It can only tell you alive-or-dead, never keep alive.',
        9: 'lock() is the whole idiom: atomically "if still alive, hand me a real owner". Empty shared_ptr if dead.',
        10: 'Safe by construction — s holds a count while this block runs, so no other thread can free it mid-call.',
      },
    },
    {
      type: 'note',
      md: `Raw pointers are not dead — raw **owning** pointers are. A plain \`T*\` (or \`T&\`) is still the correct way to *observe* an object someone else owns: function parameters, non-owning class members, iteration. The modern contract, one sentence to memorize: **ownership lives in the type system** — \`unique_ptr\` says "I own alone", \`shared_ptr\` says "we own together", \`weak_ptr\` says "I watch", raw \`T*\` says "I just look, I never delete". Under that contract, a bare \`new\`/\`delete\` pair in application code is a review-blocker: it reintroduces every leak, double-free, and exception-path bug this whole system exists to kill. \`new\` survives only *inside* the implementations of containers and smart pointers — code you use, not write.`,
    },
  ],
  quiz: [
    {
      question: 'A function locks a std::lock_guard, then an exception is thrown halfway through. The mutex is…',
      options: [
        { text: 'Still locked — exceptions skip cleanup code', explanation: 'Backwards: exceptions skip ordinary statements, but stack unwinding RUNS destructors. That is the entire design.' },
        { text: 'Released — unwinding destroys the guard, and its destructor unlocks', explanation: 'Correct. Every exit path — return, throw, normal end — runs local destructors. RAII rides that guarantee.' },
        { text: 'Released only if a try/catch exists in this function', explanation: 'Unwinding runs destructors in every frame it exits, whether or not this function catches anything.' },
      ],
      correct: 1,
    },
    {
      question: 'auto b = a; where a is a std::unique_ptr<Texture>. What happens?',
      options: [
        { text: 'Compile error — the copy constructor is deleted', explanation: 'Correct. Two owners would mean two deletes of one object, so the type forbids copying at compile time.' },
        { text: 'Both point at the Texture; it is deleted twice at scope end', explanation: 'That is exactly the bug unique_ptr makes impossible — the copy never compiles.' },
        { text: 'b gets the pointer, a becomes null', explanation: 'That is a MOVE — it requires writing std::move(a) explicitly. Plain assignment does not compile.' },
      ],
      correct: 0,
    },
    {
      question: 'Why prefer make_shared<T>() over shared_ptr<T>(new T)?',
      options: [
        { text: 'Only make_shared creates a control block', explanation: 'Both create one — every shared_ptr needs it for the count.' },
        { text: 'make_shared avoids reference counting entirely', explanation: 'Counting is the whole point of shared_ptr; nothing avoids it.' },
        { text: 'One allocation holds object + control block together — fewer allocs, better cache locality', explanation: 'Correct. The new-T form pays two separate allocations and scatters the pieces in memory.' },
      ],
      correct: 2,
    },
    {
      question: 'The runtime cost of copying a shared_ptr (versus copying a raw pointer) is…',
      options: [
        { text: 'An atomic increment now, an atomic decrement later — noticeable in hot, contended code', explanation: 'Correct. Thread-safe counter updates force CPU synchronization; in tight loops this is real cost. Pass by const& to skip it.' },
        { text: 'Zero — it is just a pointer copy', explanation: 'That is unique_ptr (moves) or raw pointers. shared_ptr must bump the count, atomically.' },
        { text: 'A deep copy of the pointed-to object', explanation: 'Never — copying the handle shares the one object; the object itself is untouched.' },
      ],
      correct: 0,
    },
    {
      question: 'Nodes A and B hold shared_ptr to each other. The last outside owner of both dies. Result?',
      options: [
        { text: 'Both freed — the count reaches 0', explanation: 'It cannot reach 0: A holds B at 1 and B holds A at 1, forever.' },
        { text: 'The runtime detects the cycle and frees it eventually', explanation: 'C++ has no cycle-collecting garbage collector (Python does — that is the gc module). Here, nothing saves you.' },
        { text: 'Neither is freed — each keeps the other alive. A permanent leak', explanation: 'Correct. Reference counting is blind to cycles. The fix is making one direction weak_ptr.' },
      ],
      correct: 2,
    },
    {
      question: 'weak_ptr<T>::lock() returns…',
      options: [
        { text: 'A raw T* you must null-check', explanation: 'A raw pointer could not keep the object alive while you use it — that would be a race.' },
        { text: 'A shared_ptr<T> — real and counting if the object is alive, empty if it already died', explanation: 'Correct. The returned shared_ptr owns the object for as long as you hold it — safe use, no crash either way.' },
        { text: 'Nothing — it throws if the object is gone', explanation: 'lock() never throws for a dead object; it just hands back an empty shared_ptr that tests false.' },
      ],
      correct: 1,
    },
    {
      question: 'Overhead of std::unique_ptr with the default deleter, compared to a raw owning pointer?',
      options: [
        { text: 'A hidden reference count', explanation: 'No count exists — sole ownership needs nothing to count. That is shared_ptr.' },
        { text: 'Essentially zero — same size as T*, and the delete call inlines', explanation: 'Correct. This is the interview line: unique_ptr is a zero-cost abstraction; there is no performance excuse for raw new.' },
        { text: 'One extra heap allocation for bookkeeping', explanation: 'No control block, no extra allocation — the unique_ptr IS just the pointer.' },
      ],
      correct: 1,
    },
    {
      question: 'In modern C++, a raw pointer T* in an interface should mean…',
      options: [
        { text: 'Nothing — raw pointers are banned outright', explanation: 'Too strong. Raw OWNING pointers are dead; raw observing pointers are idiomatic and everywhere.' },
        { text: '"I observe an object someone else owns — I will never delete it"', explanation: 'Correct. Ownership lives in the type system: unique_ptr owns alone, shared_ptr owns together, T* just looks.' },
        { text: 'The same as unique_ptr, but faster', explanation: 'unique_ptr already costs nothing extra — and unlike T*, it states and enforces ownership.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain RAII to me like I have never heard the term. Why is it called the most important idea in C++?',
      answer:
        'RAII ties a resource to an object: the constructor acquires (open the file, lock the mutex, allocate the memory), the destructor releases. Because C++ guarantees destructors run when a scope exits — by normal flow, early return, OR exception via stack unwinding — cleanup becomes impossible to forget and impossible to skip. It is the most important idea because it generalizes: vector, string, lock_guard, unique_ptr, ofstream are all just RAII over different resources. Contrast to name: garbage-collected languages free memory eventually and non-deterministically, and need finally/with/defer for non-memory resources; RAII frees everything deterministically, at scope end, with zero cleanup code at call sites.',
      isCaseBased: false,
    },
    {
      question: 'unique_ptr vs shared_ptr — when do you reach for each, and what does each cost?',
      answer:
        'Default is unique_ptr: sole ownership, zero overhead (same size as a raw pointer, delete inlines), moves but never copies — ownership transfers are explicit and free. Reach for shared_ptr only when lifetime is genuinely shared or unknowable: caches, callbacks that may outlive callers, objects referenced from multiple independent owners. Its costs: a control block allocation, atomic refcount on every copy/destroy (contended atomics hurt in hot paths), and vulnerability to cycles. The senior framing: shared_ptr everywhere is a design smell meaning nobody decided who owns what; the tradeoff you name is flexibility of lifetime versus cost and reasoning clarity.',
      isCaseBased: false,
    },
    {
      question: 'Case: you inherit a service where every request handler does "Foo* f = new Foo; … ; delete f;" and the process leaks memory under load. Walk me through diagnosis and refactor.',
      answer:
        'Diagnosis first: leaks under load with manual new/delete almost always mean an exit path that skips the delete — early returns added later, or exceptions thrown between new and delete (stack unwinding destroys locals but a raw pointer\'s destructor frees nothing). Confirm with ASan/valgrind pointing at the allocation site. Refactor: replace with auto f = std::make_unique<Foo>() — every exit path now frees; delete lines disappear rather than get audited. If handlers hand the object to async work that outlives them, that specific handoff becomes shared_ptr — but only there. Tradeoff to state: the refactor is mechanical and zero-cost with unique_ptr; upgrading everything to shared_ptr instead would "fix" it too but buys atomic overhead and hides the real ownership story.',
      isCaseBased: true,
    },
    {
      question: 'Why exactly is unique_ptr\'s copy constructor deleted, and what does its move constructor do instead?',
      answer:
        'If copying were allowed, two unique_ptrs would hold the same raw pointer, and both destructors would delete it — double free, undefined behavior. Deleting the copy constructor turns that bug into a compile error: sole ownership enforced by the type, not by code review. The move constructor transfers instead: steal the raw pointer into the new object and null the source, so exactly one deleter ever fires. Two details that impress: the move is noexcept (containers like vector only use your move during reallocation if it cannot throw), and move-assignment must guard self-move and delete its old pointee first.',
      isCaseBased: false,
    },
    {
      question: 'make_shared versus shared_ptr<T>(new T) — difference, and is there ever a downside to make_shared?',
      answer:
        'make_shared performs ONE allocation holding the object and control block together: faster, cache-friendly, and historically exception-safer in multi-argument calls. shared_ptr(new T) pays two allocations. The downside worth naming (senior points): with make_shared, the object\'s memory cannot be returned until the control block dies too — and the control block lives while any weak_ptr remains. So a large object watched by long-lived weak_ptrs keeps its full memory pinned after "death". If that pattern exists, the two-allocation form releases the object memory promptly. Tradeoff: allocation speed and locality versus memory retention under heavy weak_ptr use.',
      isCaseBased: false,
    },
    {
      question: 'Case: your team\'s LRU cache stores nodes with shared_ptr next AND shared_ptr prev. Memory profiler shows evicted entries never free. Diagnose and fix.',
      answer:
        'This is the textbook reference cycle: each adjacent pair of nodes owns each other through next and prev, so evicting a node from the map drops its external count to… not zero — its neighbors still hold it, and it holds them. Reference counts stabilize at nonzero and the whole chain leaks. Verify by logging use_count() after eviction (it stays ≥1). Fix: ownership must flow ONE way — keep next as shared_ptr (or better, let the map own nodes via unique_ptr) and make prev a raw pointer or weak_ptr, since it only observes. Rule to state: in any doubly-linked or parent/child structure, back-edges never own. Then say the broader lesson: this is why "just use shared_ptr" is not a memory-management strategy.',
      isCaseBased: true,
    },
    {
      question: 'What is stack unwinding, precisely? And what happens if a destructor throws during it?',
      answer:
        'When an exception is thrown, the runtime searches outward for a matching catch; every stack frame between the throw and that handler is exited, and each frame\'s local objects are destroyed in reverse construction order — their destructors run. That process is stack unwinding, and it is the guarantee RAII is built on. If a destructor itself throws while unwinding is in progress, two exceptions would be live simultaneously — the language gives up and calls std::terminate. Consequence: destructors are implicitly noexcept in modern C++, and cleanup that can fail (like a final flush) should be offered as an explicit close() so callers can handle the error, with the destructor swallowing failures as a last resort.',
      isCaseBased: false,
    },
    {
      question: 'When is shared_ptr the honest design choice rather than a smell?',
      answer:
        'Honest when no single owner can be identified even after thinking hard: a cache and its clients both legitimately extend an entry\'s life; an async callback may fire after its creator died; multiple documents share immutable loaded assets. The test: can you name the owner in one sentence? If yes — unique_ptr there, raw observers elsewhere. If genuinely no — shared_ptr, and you accept its costs deliberately: control block, atomic count traffic, cycle risk. Smell version: shared_ptr as a "make lifetime problems go away" button — it hides the design question instead of answering it, and usually shows up with cycles and mystery lifetimes attached.',
      isCaseBased: false,
    },
    {
      question: 'Are raw pointers dead in modern C++? Where do they still belong?',
      answer:
        'Raw OWNING pointers are dead — nothing in application code should new into a T* and remember to delete. Raw pointers survive, correctly, as non-owning observers: a function parameter that uses an object during the call (or T& when null is impossible), a back-pointer to a parent that certainly outlives you, iteration over container internals. The sentence that lands: ownership lives in the type system — unique_ptr means I own alone, shared_ptr means we own together, weak_ptr means I watch something that may die, raw T* means I only look and never delete. Under that convention a reader learns the lifetime story from signatures alone.',
      isCaseBased: false,
    },
    {
      question: 'A profiler shows a hot function spending time in shared_ptr copies. What do you change?',
      answer:
        'Stop copying at the boundary: take const shared_ptr<T>& — or better, T& / T* — as the parameter, since a function that merely USES the object does not need to share ownership; the caller\'s reference already keeps it alive for the call. Reserve pass-by-value shared_ptr for functions that genuinely store a new owner (then std::move it into the member). Each avoided copy removes an atomic increment/decrement pair, which under multi-thread contention also removes cache-line ping-pong on the control block. Broader tradeoff to voice: ownership transfers should be rare and explicit; observation should be the cheap common case.',
      isCaseBased: false,
    },
    {
      question: 'Sketch how you would implement unique_ptr from scratch. What are the load-bearing members?',
      answer:
        'A template class holding one T*. Load-bearing pieces: (1) explicit constructor taking T*, (2) destructor calling delete — the RAII core, (3) copy constructor and copy assignment both = delete — sole ownership as a compile-time rule, (4) move constructor that steals the pointer and nulls the source, noexcept, (5) move assignment guarding self-move, deleting its current pointee, then stealing, (6) operator*, operator->, get(), and explicit operator bool for ergonomics. About 25 lines. The two answers interviewers fish for: WHY copies are deleted (double free otherwise), and why nulling the moved-from source matters (its destructor still runs — delete nullptr is harmlessly safe, delete a stolen pointer is not).',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'RAII in one sentence', back: 'Acquire the resource in the constructor, release in the destructor — so every scope exit (return, exception, normal end) releases automatically.' },
    { front: 'Stack unwinding', back: 'On throw, every frame between throw and catch is exited and its locals destroyed in reverse order — destructors RUN. A destructor that throws during it → std::terminate.' },
    { front: 'unique_ptr — the three facts', back: 'Sole owner. Zero overhead (raw-pointer size, delete inlines). Copy deleted, move transfers and nulls the source.' },
    { front: 'Custom deleter one-liner', back: "std::unique_ptr<FILE, decltype(&fclose)> f(fopen(…), &fclose) — RAII over any C API." },
    { front: 'shared_ptr cost', back: 'Control block allocation + ATOMIC refcount ops on every copy/destroy. Pass by const& (or T&) in hot paths.' },
    { front: 'Why make_shared', back: 'One allocation for object + control block: faster, cache-friendly. Caveat: weak_ptrs pin the whole block, so the object memory lingers.' },
    { front: 'weak_ptr + lock()', back: 'Observes without counting. if (auto s = wp.lock()) { … } — alive: real shared_ptr keeps it alive; dead: empty, if skips. No crash either way.' },
    { front: 'The cycle rule', back: 'shared_ptr cycles never reach refcount 0 → leak. In parent/child or doubly-linked designs, back-pointers are weak_ptr (or raw).' },
    { front: 'Raw pointers today', back: 'Fine as NON-OWNING observers only. Ownership lives in the type: unique=own alone, shared=own together, weak=watch, T*=look, never delete.' },
    { front: 'Why raw new/delete is dead', back: 'Manual delete must cover every exit path and always misses one (usually the exception path). Smart pointers make the compiler do it.' },
  ],
  mindmapMarkdown: `- RAII & Smart Pointers — Why Raw new Is Dead
  - RAII
    - Acquire in ctor, release in dtor
    - Every exit path runs destructors
    - Memory, files, locks, sockets
    - Stack unwinding on throw
    - Dtor that throws while unwinding → terminate
  - unique_ptr
    - Sole owner, zero overhead
    - Copy deleted, move steals + nulls
    - make_unique, never raw new
    - Custom deleter: fclose in one line
  - shared_ptr
    - Control block counts owners
    - Last owner (refs 0) frees
    - make_shared: one allocation
    - Cost: atomic count ops
    - Everywhere = design smell
  - weak_ptr
    - Observes, does not count
    - Back-pointers break cycles
    - lock() → shared_ptr or empty
  - Raw pointers today
    - Non-owning observer only
    - Ownership lives in the type
    - new/delete: implementation-only`,
}

export default m
