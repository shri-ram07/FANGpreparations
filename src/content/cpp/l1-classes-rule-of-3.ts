import type { Module } from '../types'

const m: Module = {
  id: 'cpp-l1-classes-rule-of-3',
  subjectId: 'cpp',
  level: 1,
  title: 'Classes, Constructors & the Rule of 3',
  whyItMatters:
    'Every C++ shop asks the same warm-up: "your class owns a char* — what does the compiler-generated copy do?" Answer wrong and the round is over. This module is the ownership story: who allocates, who copies, who frees — and the Rule of 3 that keeps it from crashing.',
  estMinutes: 50,
  sections: [
    {
      type: 'note',
      md: 'Snippet convention: blocks using `std::printf`, `std::strlen`, or `std::strcpy` assume `#include <cstdio>` and `#include <cstring>` — trimmed so the class code stays in focus.',
    },
    {
      type: 'intuition',
      title: 'struct vs class: same house, different default lock',
      md: `Two identical houses. One leaves its doors unlocked by default (struct), one locked (class). Same rooms, same build.

- **struct**: members are *public* by default — anyone can touch them.
- **class**: members are *private* by default — outsiders must go through methods.
- That is the ENTIRE language difference. Both can have methods, constructors, inheritance.
- An **access specifier** (\`public:\`, \`private:\`) is the keyword that flips the lock mid-class.
- Convention: struct for dumb data bundles (a Point, a pair), class when there is an **invariant** — a condition the class promises to keep true (balance never negative).`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'The one difference, in code',
      code: `struct Point {
  int x;
  int y;
};

class Account {
  double balance = 0;

public:
  void deposit(double amt) { balance += amt; }
};

int main() {
  Point p{3, 4};
  p.x = 10;

  Account a;
  a.deposit(100);
  // a.balance = 1e9;  // ERROR: 'balance' is private
}`,
      annotations: {
        2: 'No access specifier written, so struct defaults to public — anyone can read or write x.',
        7: 'class defaults to private. Bonus: the in-class default (= 0) means every constructor starts balance at 0 unless it says otherwise.',
        9: 'public: — an access specifier. Everything below it is reachable from outside.',
        19: 'The compiler enforces the lock. The only door in is deposit() — which is exactly where validation rules would live.',
      },
    },
    {
      type: 'intuition',
      title: 'Constructors: the setup crew',
      md: `A constructor runs once, at the exact moment an object is born. Its only job: leave every member in a valid state.

- Spelling: a function with the **same name as the class** and *no return type* — not even void.
- **Default constructor**: takes no arguments. \`Account a;\`
- **Parameterized constructor**: takes arguments. \`Account b("Raunak", 500);\`
- The compiler writes a default constructor for free — but ONLY if you wrote *no* constructor at all. Add a parameterized one, and \`Account a;\` stops compiling until you add the default back.
- One object, one constructor call. It never runs twice.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Default and parameterized',
      code: `class Account {
  std::string owner;
  double balance;

public:
  Account() : owner("unknown"), balance(0) {}

  Account(std::string o, double b) : owner(o), balance(b) {}
};

int main() {
  Account a;
  Account b("Raunak", 500);
  // Account c();  // TRAP: this declares a FUNCTION named c
}`,
      annotations: {
        6: 'The default constructor, written by hand. Needed here: because the class defines a constructor, the compiler no longer donates one.',
        8: 'Overload resolution picks the constructor whose parameters match the arguments.',
        14: 'The "most vexing parse": empty parentheses declare a function returning Account. Write Account c; or Account c{}; instead.',
      },
    },
    {
      type: 'intuition',
      title: 'Member initializer lists: furnish while building',
      md: `Furnish the house while it is being built — do not move into an empty house and drag furniture in afterwards.

- The **member initializer list** is the colon-list before the constructor body: \`Account() : owner("x"), balance(0) {}\`. Members are *constructed* there.
- By the time the \`{ }\` body starts, every member already exists. Assigning in the body means: build a default first, then overwrite it. Two steps, wasted work — real cost for heavy members like \`std::string\`.
- **const members** and **reference members** can only be set at birth. For them the initializer list is not faster — it is the ONLY way.
- Gotcha interviewers love: members initialize in **declaration order** (top to bottom in the class), *not* in the order you list them.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'When the list is mandatory',
      code: `class Employee {
  const int id;
  std::string& team;

public:
  // Employee(int i, std::string& t) {  // does NOT compile:
  //   id = i;    // assignment to a const member
  //   team = t;  // team was never bound to anything
  // }

  Employee(int i, std::string& t) : id(i), team(t) {}
};`,
      annotations: {
        2: 'A const member gets its value exactly once, at construction. After that: read-only forever.',
        6: 'By the time the body runs, all members are already constructed. Body code can only edit — too late for const and references.',
        11: 'The initializer list runs BEFORE the body: members are born here, with these values, in one step.',
      },
    },
    {
      type: 'intuition',
      title: 'Destructors: exactly when things die',
      md: `Local objects are stacked like dinner plates: the last one placed is the first one removed.

- The **destructor** — \`~ClassName()\`, no arguments, no return — is the teardown routine. You almost never call it; the language does.
- Exactly two triggers. Stack object: the **closing brace** of its scope. Heap object: the moment you \`delete\` it.
- Destruction order is the **reverse of construction** — later objects may depend on earlier ones, so they leave first.
- Forget the \`delete\` on a heap object and its destructor never runs: a **memory leak** (and worse — files never flushed, locks never released).`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Watch the lifetimes',
      code: `struct Loud {
  const char* name;
  Loud(const char* n) : name(n) { std::printf("build %s\\n", name); }
  ~Loud() { std::printf("kill %s\\n", name); }
};

int main() {
  Loud a("a");
  Loud b("b");
  {
    Loud inner("inner");
  }
  Loud* p = new Loud("heap");
  delete p;
}
// prints: build a, build b, build inner, kill inner,
//         build heap, kill heap, kill b, kill a`,
      annotations: {
        4: 'The destructor: ~ClassName, takes nothing, returns nothing, cannot be overloaded.',
        12: 'This closing brace IS the trigger: inner leaves scope, its destructor fires immediately.',
        14: 'Heap objects have one trigger only: delete. Remove this line and "heap" is never killed — a leak.',
        17: 'kill b before kill a: destruction is the exact reverse of construction.',
      },
    },
    {
      type: 'intuition',
      title: 'The this pointer: which object am I?',
      md: `One \`deposit\` method, a million Account objects. \`this\` is how the method knows which account it is working on.

- Every non-static member function receives a hidden extra argument: **this**, a pointer to the object the call was made on.
- \`c.set(10)\` is, under the hood, roughly \`set(&c, 10)\`. Inside, \`this == &c\`.
- Bare member access already means \`this->\`: writing \`count\` inside a method reads \`this->count\`.
- You *write* it explicitly for three reasons: a parameter **shadows** (hides) a member with the same name; returning \`*this\` to allow chained calls; handing your own address to someone else.
- Coming from Python? \`this\` is \`self\` — except hidden, and a pointer.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Shadowing and chaining',
      code: `class Counter {
  int count = 0;

public:
  void set(int count) {
    this->count = count;
  }

  Counter& add(int n) {
    count += n;
    return *this;
  }
};

int main() {
  Counter c;
  c.add(2).add(3);
  c.set(10);
}`,
      annotations: {
        5: 'The parameter count shadows the member count — inside this body, the bare name means the parameter.',
        6: 'this->count is the member; bare count is the parameter. Without this->, the line would assign the parameter to itself.',
        10: 'No shadowing here, so bare count already means this->count. The this-> is implicit.',
        11: 'Return the object itself, by reference — so the caller can chain another call onto the result.',
        17: 'c.add(2) returns c, so .add(3) runs on the same object. count is 5 after this line.',
      },
    },
    {
      type: 'intuition',
      title: 'Two ways to copy — and exactly when each fires',
      md: `Photocopying a filled form onto a blank page vs writing over an already-filled page. Different jobs, different functions.

- **Copy constructor** — \`Text(const Text& other)\` — builds a *brand-new* object from an existing one.
- It fires in exactly three situations: initialization (\`Text b = a;\` or \`Text b(a);\`), **pass-by-value** into a function, and **return-by-value** out of one.
- Return-by-value caveat: compilers elide (skip) that copy — **RVO**, return value optimization — and C++17 makes elision guaranteed for returned temporaries. Name the copy, then name the elision.
- **Copy assignment operator** — \`operator=(const Text&)\` — fires when the target *already exists*: \`d = a;\` where d is alive.
- The tell: is a new object being born? Constructor. Already alive? Assignment. Assignment has extra duties: dispose of the old contents, and survive \`v = v\`.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Spot which one runs',
      code: `// (Text = a class with a Text(const char*) constructor)

void show(Text t) {}

Text make() {
  Text local("made");
  return local;
}

int main() {
  Text a("hi");

  Text b = a;
  Text c(a);

  Text d("old");
  d = a;

  show(a);
  Text e = make();
}`,
      annotations: {
        13: 'Copy CONSTRUCTOR — the = in a declaration is initialization syntax, not assignment. b is being born from a.',
        14: 'Identical meaning, different spelling. Still the copy constructor.',
        17: 'Copy ASSIGNMENT — d already exists and holds "old". operator= must replace the old contents safely.',
        19: 'Pass-by-value: parameter t is copy-constructed from a. This is why large objects travel as const Text& instead.',
        20: 'Return-by-value nominates the copy constructor — but compilers elide the copy (RVO), and C++17 guarantees elision for returned temporaries.',
      },
    },
    {
      type: 'intuition',
      title: 'The default copy is a photocopy of the treasure map',
      md: `The compiler-written copy duplicates your treasure MAP, not the treasure. Now two people hold maps to one chest — and both will burn the chest when they leave.

- Write no copy functions and the compiler generates them: **memberwise copy** — each member copied with its own \`=\`.
- For \`int\`, \`double\`, \`std::string\` members: perfect. For a raw pointer member: it copies the **address**. Two objects, one buffer.
- That is a **shallow copy**: the resource is now shared by objects that each believe they own it.
- A **deep copy** duplicates the resource itself — new buffer, contents copied.
- The timeline of doom: both destructors run \`delete[]\` on the same address. **Double delete** — undefined behavior.
- Rule: any class that *owns* a resource (heap memory, file handle, socket) is broken by the default copy.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'The broken class — compiles clean, crashes at the brace',
      code: `class Text {
  char* data;

public:
  Text(const char* s) {
    data = new char[std::strlen(s) + 1];
    std::strcpy(data, s);
  }

  ~Text() { delete[] data; }

  // no copy ctor, no operator= → the compiler writes SHALLOW ones
};

int main() {
  Text a("hi");
  Text b = a;
}`,
      annotations: {
        6: 'The +1 holds the terminating zero byte: "hi" needs 3 chars.',
        10: 'The class owns a resource: it called new, so it must delete. So far, correct.',
        17: 'The compiler-written copy ctor does data = a.data. One buffer, two objects that both believe they own it.',
        18: 'Scope ends: ~b runs delete[] on the buffer, then ~a runs delete[] on the SAME address. Double delete — undefined behavior, typically a crash.',
      },
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'The shallow-copy disaster, frame by frame',
        notice: 'One buffer, two owners — watch the second delete arrive, then watch the deep-copy fix.',
        frames: [
          {
            note: 'Start: Text a("hi") owns a heap buffer. We are about to write Text b = a.',
            stack: [{ name: 'b.data', value: 'nullptr' }],
            heap: [],
          },
          {
            note: 'Inner scope: Text a("hi"). The constructor calls new char[3] — a owns this buffer.',
            stack: [
              { name: 'b.data', value: 'nullptr' },
              { name: 'a.data', to: 'buf' },
            ],
            heap: [{ id: 'buf', value: '"hi"', label: 'new char[3]' }],
          },
          {
            note: 'Text b = a. The compiler-written copy CONSTRUCTOR copies MEMBERS: b.data = a.data. Two arrows, ONE buffer. No second allocation happened.',
            stack: [
              { name: 'b.data', to: 'buf' },
              { name: 'a.data', to: 'buf' },
            ],
            heap: [{ id: 'buf', value: '"hi"', label: 'shared!' }],
          },
          {
            note: 'Inner scope ends → destructor runs on a → delete[] frees the buffer. b.data still stores that address: a dangling pointer.',
            stack: [{ name: 'b.data', to: 'buf', danger: true }],
            heap: [{ id: 'buf', value: '"hi"', freed: true }],
          },
          {
            note: 'Any use of b now reads freed memory. Worse: when b dies, ~Text() calls delete[] on the SAME address — double delete. Undefined behavior.',
            stack: [{ name: 'b.data', to: 'buf', danger: true }],
            heap: [{ id: 'buf', value: '???', freed: true }],
          },
          {
            note: 'Rewind — now with a hand-written copy constructor. Text b = a allocates b its OWN buffer and copies the characters. Two owners, two buffers.',
            stack: [
              { name: 'b.data', to: 'buf2' },
              { name: 'a.data', to: 'buf' },
            ],
            heap: [
              { id: 'buf', value: '"hi"', label: 'owned by a' },
              { id: 'buf2', value: '"hi"', label: 'owned by b' },
            ],
          },
          {
            note: 'a dies → only ITS buffer is freed. b is untouched and frees its own copy later. Each object deletes exactly what it allocated — that is the whole point of the Rule of 3.',
            stack: [{ name: 'b.data', to: 'buf2' }],
            heap: [
              { id: 'buf', value: '"hi"', freed: true },
              { id: 'buf2', value: '"hi"', label: 'owned by b' },
            ],
          },
        ],
      },
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'The fix: all three, hand-written',
      code: `class Text {
  char* data;

public:
  Text(const char* s) : data(new char[std::strlen(s) + 1]) {
    std::strcpy(data, s);
  }

  Text(const Text& other) : data(new char[std::strlen(other.data) + 1]) {
    std::strcpy(data, other.data);
  }

  Text& operator=(const Text& other) {
    if (this == &other) return *this;
    char* fresh = new char[std::strlen(other.data) + 1];
    std::strcpy(fresh, other.data);
    delete[] data;
    data = fresh;
    return *this;
  }

  ~Text() { delete[] data; }
};`,
      annotations: {
        9: 'The signature is const Text& — by REFERENCE. Taking it by value would need a copy of the argument first… which calls the copy ctor… which needs a copy… Compilers reject it.',
        10: 'Deep copy: allocate a fresh buffer, copy the characters. Each object owns its own memory.',
        14: 'Self-assignment guard: v = v arrives here with this == &other. A careless delete below would destroy the source before reading it.',
        15: 'Allocate the new buffer BEFORE deleting the old: if new throws, the object is still intact. Ordering is exception safety.',
        17: 'Free the old buffer, or every assignment leaks it.',
        22: 'The trio complete: destructor + copy constructor + copy assignment. That is the Rule of 3.',
      },
    },
    {
      type: 'intuition',
      title: 'The Rule of 3',
      md: `If you hired a demolition crew, you also need a plan for the copies of the keys.

- **The rule**: if you write *any one* of destructor, copy constructor, copy assignment — you almost certainly need **all three**.
- The destructor is the tell. A hand-written destructor means the class owns a resource — and then the memberwise defaults for copying are wrong by definition.
- Legitimate alternative: forbid copying entirely with \`= delete\`. Own the resource, refuse the copies. Honest and common (files, sockets, locks).
- The modern escape hatch (**Rule of 0**): hold resources through members that manage themselves — \`std::string\`, \`std::vector\`, smart pointers. Then the compiler defaults are correct and you write *none* of the three.
- Level 3 preview, one line: **move semantics** adds a move constructor and move assignment, upgrading this to the **Rule of 5**.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: '=default and =delete',
      code: `class FileHandle {
public:
  FileHandle() = default;

  FileHandle(const FileHandle&) = delete;
  FileHandle& operator=(const FileHandle&) = delete;

  ~FileHandle() { /* fclose(...) */ }
};

int main() {
  FileHandle f;
  // FileHandle g = f;  // ERROR: use of deleted function
}`,
      annotations: {
        3: '=default: "compiler, write your standard version." Free, explicit, documents intent.',
        5: '=delete: copying is now a compile-time error. The right call when two copies of a resource make no sense — file handles, sockets, locks.',
        13: 'The bug dies at compile time instead of at 3am in production. That is the entire sales pitch of =delete.',
      },
    },
    {
      type: 'note',
      md: `Pre-interview re-read: (1) struct vs class = default access, nothing else. (2) \`Account c();\` declares a function — most vexing parse. (3) const and reference members force the initializer list; members initialize in declaration order. (4) Copy ctor triggers: init from another object, pass-by-value, return-by-value (usually elided — RVO). (5) \`d = a\` on a live object is copy *assignment* — guard self-assignment, allocate before delete. (6) Hand-written destructor → Rule of 3 → (with moves, L3) Rule of 5 → (with self-managing members) Rule of 0.`,
    },
  ],
  quiz: [
    {
      question: 'The complete list of differences between struct and class in C++ is…',
      options: [
        {
          text: 'structs cannot have member functions or constructors',
          explanation: 'They can — a C++ struct supports methods, constructors, destructors, even inheritance. It is not the C struct.',
        },
        {
          text: 'Default access: struct members are public, class members are private. That is all.',
          explanation: 'Correct. One word of difference. Everything else — methods, constructors, inheritance — works identically in both.',
        },
        {
          text: 'structs live on the stack, classes on the heap',
          explanation: 'Storage is decided by HOW you create the object (local vs new), never by which keyword declared its type.',
        },
        {
          text: 'structs are C-only leftovers, deprecated in modern C++',
          explanation: 'Fully alive and idiomatic — the convention is struct for open data bundles, class for guarded invariants.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Text a("hi"); Text b = a; — what runs on the second line?',
      options: [
        {
          text: 'The copy assignment operator, because of the = sign',
          explanation: 'The = in a DECLARATION is initialization syntax, not assignment. No already-existing object is being overwritten.',
        },
        {
          text: 'The default constructor, then copy assignment',
          explanation: 'No two-step happens. b is built in a single copy-construction directly from a.',
        },
        {
          text: 'The copy constructor — a new object is being born from an existing one',
          explanation: 'Correct. Birth of a new object from an existing one = copy constructor, regardless of the = spelling. Text b(a); is the same call.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Which member makes the initializer list mandatory — not just faster?',
      options: [
        {
          text: 'An int member',
          explanation: 'Assignable at any time — the list is merely good style here.',
        },
        {
          text: 'A std::string member',
          explanation: 'Legal to assign in the body — just wasteful: default-construct first, then overwrite. Slower, not illegal.',
        },
        {
          text: 'A const int member or a reference member',
          explanation: 'Correct. Both can only be set at the moment of birth. Once the constructor body starts, they already exist and can never be (re)bound.',
        },
        {
          text: 'A pointer member',
          explanation: 'Raw pointers are freely assignable anywhere — the list is optional for them.',
        },
      ],
      correct: 2,
    },
    {
      question: 'int main() { Text a("1"); Text b("2"); Text c("3"); } — destruction order?',
      options: [
        {
          text: 'a, b, c — same as construction',
          explanation: 'Backwards. That would destroy a while b and c (which might depend on it) still live.',
        },
        {
          text: 'c, b, a — reverse of construction',
          explanation: 'Correct. Locals unwind like a stack of plates: last constructed, first destroyed. Later objects may depend on earlier ones.',
        },
        {
          text: 'Unspecified — the compiler chooses',
          explanation: 'It is strictly defined by the standard: exact reverse of construction order, every time.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Text owns a char* with delete[] in its destructor, no copy functions written. Text b = a; then scope ends. What happens?',
      options: [
        {
          text: 'Compile error — Text is not copyable',
          explanation: 'It compiles clean. The compiler helpfully writes a memberwise (shallow) copy — that helpfulness IS the bug.',
        },
        {
          text: 'b automatically gets its own copy of the buffer',
          explanation: 'Memberwise copy duplicates the POINTER, not what it points at. Deep copies never happen for free.',
        },
        {
          text: 'Both destructors delete[] the same buffer — double delete, undefined behavior',
          explanation: 'Correct. b.data == a.data after the shallow copy. ~b frees the buffer, ~a frees the same address again. Typically a crash.',
        },
      ],
      correct: 2,
    },
    {
      question: 'A copy assignment starts with delete[] data; then copies from other.data. Which input breaks it?',
      options: [
        {
          text: 'v = v — self-assignment',
          explanation: 'Correct. this == &other, so delete[] data just destroyed other.data too. The copy then reads freed memory. Guard with if (this == &other), and allocate before deleting.',
        },
        {
          text: 'Assigning a longer string than the current one',
          explanation: 'Fine — the new buffer is sized from the source, not the old buffer.',
        },
        {
          text: 'Assigning an empty string',
          explanation: 'Fine — a 1-byte buffer holding the terminator. Nothing breaks.',
        },
      ],
      correct: 0,
    },
    {
      question: 'You wrote a destructor to fclose a FILE* member. The Rule of 3 says you must also…',
      options: [
        {
          text: 'Nothing — the destructor already handles cleanup',
          explanation: 'The default copies would duplicate the FILE* — two objects closing the same file. The destructor alone is one third of the job.',
        },
        {
          text: 'Write (or =delete) the copy constructor and copy assignment operator',
          explanation: 'Correct. A hand-written destructor signals resource ownership, and ownership makes the compiler-written copies wrong. Deep-copy them or forbid them.',
        },
        {
          text: 'Write a default constructor',
          explanation: 'Unrelated. The rule covers exactly: destructor, copy constructor, copy assignment.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Inside the call c.add(3), what exactly is this?',
      options: [
        {
          text: 'The class itself',
          explanation: 'A class is a compile-time blueprint. this exists at runtime and refers to one specific object.',
        },
        {
          text: 'A pointer holding the address of c',
          explanation: 'Correct. Every non-static member function receives it as a hidden argument — c.add(3) is roughly add(&c, 3), so this == &c.',
        },
        {
          text: 'A copy of c',
          explanation: 'No copy is made — this points at the real object, which is why mutations through it stick.',
        },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'State the Rule of 3 and, more importantly, the reasoning behind it.',
      answer:
        'The rule: if a class needs any one of destructor / copy constructor / copy assignment written by hand, it almost certainly needs all three. The reasoning: a hand-written destructor signals resource ownership. The compiler-generated copies are memberwise — they duplicate the pointer/handle, not the resource — so two objects end up owning one resource, and the destructor you wrote runs twice on it (double delete, double fclose). Alternatives worth naming: =delete the copies when copying makes no sense, or better, the Rule of 0 — own resources through self-managing members (std::string, std::vector, smart pointers) so the defaults are correct and you write nothing.',
      isCaseBased: false,
    },
    {
      question: 'Exactly when is the copy constructor called, and when the copy assignment operator?',
      answer:
        'Copy constructor: whenever a NEW object is created from an existing one — (1) initialization: Text b = a; or Text b(a);, (2) pass-by-value into a function, (3) return-by-value out of one. Copy assignment: the target already exists — d = a; where d is alive. It has extra duties: dispose of d’s old contents and survive self-assignment. The return-by-value caveat that earns points: compilers elide that copy (RVO), and C++17 guarantees elision when returning a temporary — so name the copy, then name the elision.',
      isCaseBased: false,
    },
    {
      question: 'Case: your service crashes with "double free or corruption" at the end of main. It started after a teammate added log(cfg), where log takes Config by value. Config owns a char* buffer and has a destructor; no copy functions are written. Debug it.',
      answer:
        'Pass-by-value copy-constructs the parameter — using the compiler’s shallow copy, so the parameter’s data points at cfg’s buffer. When log returns, the parameter’s destructor runs delete[] on that shared buffer. cfg now holds a dangling pointer, and at the end of main its destructor deletes the same address again: double free. Fixes, in preference order: give Config value semantics with the Rule of 3 (deep copy) or =delete its copies to make this a compile error; change log to take const Config& (no copy at all — also faster); or dissolve the problem by making the member a std::string (Rule of 0). Tradeoff to say aloud: const& avoids the crash without fixing the class — the landmine stays for the next caller.',
      isCaseBased: true,
    },
    {
      question: 'Why do member initializer lists beat assignment in the constructor body? When are they mandatory?',
      answer:
        'Members are constructed before the body runs. Assignment in the body therefore does double work: default-construct the member, then overwrite it — measurable for members like std::string or vector. The initializer list constructs each member directly with its final value, one step. Mandatory cases: const members and reference members (settable only at birth), plus members or base classes with no default constructor. The gotcha to volunteer: initialization happens in declaration order in the class, not list order — initializing one member from another that is declared below it reads garbage, and compilers only warn.',
      isCaseBased: false,
    },
    {
      question: 'What is the this pointer, mechanically? When must you write it explicitly?',
      answer:
        'Every non-static member function receives a hidden argument: this, a pointer to the object the call was made on. c.set(10) is roughly Counter_set(&c, 10). All member access is implicitly this-> prefixed. Explicit uses: (1) a parameter shadows a member with the same name — this->count = count; (2) return *this by reference to enable chaining (the same idiom operator= uses, and how cout << a << b works); (3) passing your own address out — callbacks, registries, comparing identity (the self-assignment guard is literally this == &other).',
      isCaseBased: false,
    },
    {
      question: 'Case: code review. A teammate’s operator= reads: delete[] data; data = new char[len(other)]; copy(other). All unit tests pass. What is your review comment?',
      answer:
        'Two comments. (1) Self-assignment: v = v (which hides in real code as a[i] = a[j] or via two pointers to one object) makes this == &other — the delete[] destroys the source, then the copy reads freed memory. Tests pass because nobody tested aliasing. (2) Exception safety: even with a guard, deleting before new means a failed allocation leaves the object holding a dangling pointer. Fix: allocate the fresh buffer first, copy into it, then delete the old and swap the pointer — plus the cheap this == &other guard. The idiomatic alternative worth naming: copy-and-swap (take the parameter by value, swap members) — self-assignment-safe and strongly exception-safe by construction, at the cost of always paying for one full copy.',
      isCaseBased: true,
    },
    {
      question: 'When would you =delete the copy operations, and what did codebases do before C++11?',
      answer:
        'Delete them when two copies of the resource are meaningless or dangerous: file handles, sockets, mutexes, unique owners of memory (this is exactly what std::unique_ptr does). The copy attempt then fails at compile time with a clear message — the cheapest possible bug. Pre-C++11 idiom: declare the copy constructor and copy assignment private and never define them — outside code failed to compile, inside code failed at link time with a cryptic error. =default is the flip side: explicitly request the compiler version, useful for bringing back a default constructor that writing another constructor suppressed, and for documenting "the memberwise copy is intentionally correct here".',
      isCaseBased: false,
    },
    {
      question: 'Exactly when does a destructor run? And what actually happens if a new-ed object is never deleted?',
      answer:
        'Two triggers, no others: a stack object’s destructor runs at the closing brace of its scope (in reverse construction order — later objects may depend on earlier ones, so they leave first); a heap object’s destructor runs at the moment of delete. Never deleted → the destructor NEVER runs. That is not only a memory leak: any behavior in the destructor is lost — buffers not flushed to disk, locks not released, connections not closed. Memory returns to the OS at process exit, but a held lock can deadlock the program long before that. This "cleanup tied to lifetime" idea is RAII, formalized at Level 3.',
      isCaseBased: false,
    },
    {
      question: 'Does return-by-value copy the object? Answer like it is 2026, not 2003.',
      answer:
        'On paper, returning by value copy-constructs the result into the caller (which is why the copy ctor must exist and be accessible). In practice: compilers construct the local directly in the caller’s slot — NRVO — skipping the copy almost always, and C++17 makes elision mandatory when returning a temporary (return Text("x") performs zero copies, guaranteed). The practical consequence: do not contort APIs into out-parameters or returned pointers "for performance" — return by value and let elision (and, at L3, move semantics as the fallback) do the work. Tradeoff honesty: NRVO for named locals is near-universal but not guaranteed; the guaranteed case is temporaries.',
      isCaseBased: false,
    },
    {
      question: 'Rule of 3, Rule of 5, Rule of 0 — how do they relate, and which should a new class aim for?',
      answer:
        'Rule of 3 (C++98): destructor, copy ctor, copy assignment travel together — writing one means the class owns a resource, so the other two defaults are wrong. Rule of 5 (C++11): move semantics adds move constructor and move assignment; a class with any of the five declared suppresses or degrades the others, so define all five for resource owners (detailed at Level 3). Rule of 0 — the actual target: own everything through members that already manage themselves (std::string, std::vector, std::unique_ptr) and write none of the five; the compiler defaults become correct by composition. Aim for 0; drop to 5 only when writing the resource manager itself — which is precisely what implementing vector from scratch teaches.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    {
      front: 'struct vs class — the whole difference',
      back: 'Default access only: struct members public, class members private. Everything else is identical. Convention: struct = open data, class = guarded invariant.',
    },
    {
      front: 'When is the member initializer list MANDATORY?',
      back: 'const members, reference members, and members/bases with no default constructor. They can only be set at birth. Everyone else: list is faster (no default-then-overwrite).',
    },
    {
      front: 'Members initialize in which order?',
      back: 'Declaration order (top to bottom in the class) — NOT initializer-list order.',
    },
    {
      front: 'The three copy-constructor triggers',
      back: '(1) Init from another object: Text b = a; / Text b(a); (2) pass-by-value; (3) return-by-value — usually elided (RVO; C++17 guarantees it for temporaries).',
    },
    {
      front: 'Copy ctor vs copy assignment — the tell',
      back: 'New object being born → copy constructor. Target already alive (d = a) → copy assignment, which must also dispose of old contents and survive v = v.',
    },
    {
      front: 'Shallow copy in one line',
      back: 'Memberwise copy: a pointer member is copied as an ADDRESS → two objects, one buffer → double delete when both destructors run.',
    },
    {
      front: 'The Rule of 3',
      back: 'Write any of destructor / copy ctor / copy assignment → write all three (or =delete the copies). Hand-written destructor = resource ownership = default copies are wrong.',
    },
    {
      front: 'Self-assignment guard',
      back: 'if (this == &other) return *this; — and allocate the new buffer BEFORE deleting the old (exception safety).',
    },
    {
      front: 'Destructor: triggers and order',
      back: 'Stack object: scope’s closing brace. Heap object: delete. Order: exact reverse of construction.',
    },
    {
      front: '=default / =delete',
      back: '=default: "compiler, write your standard version" (explicit, free). =delete: using that function is a compile error — right for uncopyable resources (files, locks).',
    },
  ],
  mindmapMarkdown: `- Classes, Constructors & the Rule of 3
  - struct vs class
    - only default access differs
    - struct = open data, class = invariants
  - Constructors
    - default / parameterized
    - initializer list: members built there
    - const & references: list is the ONLY way
    - gotcha: declaration order, not list order
  - Destructor
    - triggers: scope exit or delete
    - reverse of construction
  - this
    - hidden pointer to the object
    - shadowing, return *this chaining
  - Copying
    - copy ctor: init, pass-by-value, return-by-value (RVO)
    - copy assignment: target already alive
    - self-assignment guard + alloc-before-delete
    - shallow = pointer copied, buffer shared
    - deep = duplicate the resource
  - Rule of 3
    - own a resource → all three
    - or =delete the copies (=default asks for the standard one)
    - L3: moves → Rule of 5; Rule of 0 ideal`,
}

export default m
