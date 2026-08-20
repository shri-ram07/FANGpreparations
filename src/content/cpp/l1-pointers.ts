import type { Module } from '../types'

const m: Module = {
  id: 'cpp-l1-pointers',
  subjectId: 'cpp',
  level: 1,
  title: 'Pointers — the Full Story',
  whyItMatters:
    '"What does this print, and why?" pointer questions open most C++ interviews — and DSA in C++ (linked lists, trees, graphs) is pointer surgery all day. Everything that comes after — new/delete, smart pointers, move semantics — stands on this module. One mental picture, a slip of paper with an address on it, makes all of it mechanical.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'A pointer is an address written down',
      md: `Memory is one huge street of numbered houses — each house is one byte, each house number is an **address**. Every variable lives somewhere on that street.

- \`int x = 42\` rents a 4-byte house and moves 42 in. The house number might be \`0x7ffc...\`.
- A **pointer** is just another variable whose stored value is a house number. An address. Nothing more.
- \`int* p = &x\` — p is a slip of paper with x's house number written on it.
- Copy the slip and you have two slips, one house. Copying an address never copies the object.
- The pointer itself is small and fixed-size (8 bytes on a 64-bit machine) whether it points at an int or a 2 GB buffer.
- Hold this picture. Every rule in this module is this picture plus grammar.`,
    },
    {
      type: 'intuition',
      title: 'Two operators, one confusing symbol',
      md: `Two operators do all the work — and one of them moonlights.

- \`&x\` — **address-of**: "what is x's house number?" Produces a pointer value.
- \`*p\` — **dereference**: "GO to the address stored in p." Produces the object itself — read it or assign into it.
- The trap: \`*\` also appears in **declarations**. In \`int* p\`, the star is part of the *type* — it only says "p is a pointer-to-int". Nobody goes anywhere.
- In an **expression**, \`*p\` is an *action* — follow the arrow. Same symbol, two grammars. Most beginner pointer confusion is exactly this.
- Grammar landmine: \`int* a, b\` makes \`a\` an \`int*\` but \`b\` a plain \`int\` — the star binds to the name, not the type. Rule: one pointer declaration per line.
- (\`&\` moonlights too — \`int&\` declares a *reference*. Different tool, next module.)`,
    },
    {
      type: 'hinglish',
      md: `Pointer ka dar yahin khatam karo: pointer sirf ek **parchi** hai jis pe kisi ghar ka **address** likha hai. \`int x = 42\` — ek ghar bana, andar 42 rakha. \`int* p = &x\` — \`&\` ne bola *"iska address batao"*, aur woh address parchi \`p\` pe likh diya. Ab do baatein pakki: parchi photocopy karne se (\`q = p\`) **ghar copy nahi hota** — do parchi, ek hi ghar. Aur \`*p\` ka matlab: *"parchi pe likhe address pe JAO, jo mile use chhuo"*. \`*p = 7\` likha to postman x ke ghar gaya aur andar 7 rakh aaya — parchi waisi ki waisi. Confusion sirf ek jagah hai: declaration wale \`int* p\` ka \`*\` bas type bata raha hai (*"p ek parchi hai"*), par expression wale \`*p\` ka \`*\` ek **action** hai (*"address pe jao"*). Same symbol, do kaam. Bas — yehi poora khel hai, aage sab isi ki packaging hai.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One int, one pointer, one write',
        leftLabel: 'pointers',
        rightLabel: 'objects',
        frames: [
          {
            note: 'int x = 42 — the compiler carves out a 4-byte box for x. It lives at a real address; call it 0x7ffc.',
            stack: [],
            heap: [{ id: 'x', value: 'x = 42', label: '0x7ffc' }],
          },
          {
            note: 'int* p = &x — & reads the address off x. p is a second box that stores that address. The arrow IS the value of p.',
            stack: [{ name: 'int* p', to: 'x' }],
            heap: [{ id: 'x', value: 'x = 42', label: '0x7ffc' }],
          },
          {
            note: '*p = 7 — * follows the arrow. The write lands in x\'s box. p itself did not change; only what it points AT did.',
            stack: [{ name: 'int* p', to: 'x' }],
            heap: [{ id: 'x', value: 'x = 7', label: '0x7ffc' }],
          },
          {
            note: 'p = nullptr — the slip now says "no address". Dereferencing here crashes loudly and catchably — far better than a garbage address that corrupts silently.',
            stack: [{ name: 'int* p', value: 'nullptr' }],
            heap: [{ id: 'x', value: 'x = 7', label: '0x7ffc' }],
          },
        ],
      },
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Address-of, dereference, write-through — the whole grammar',
      code: `#include <iostream>

int main() {
  int x = 42;
  int* p = &x;              // & = "give me x's address"

  std::cout << p << '\\n';   // prints an address, e.g. 0x7ffc1a2b
  std::cout << *p << '\\n';  // 42 — * = "go to that address"

  *p = 7;                   // write THROUGH the pointer
  std::cout << x << '\\n';   // 7 — x changed, via p

  int* q = p;               // copies the ADDRESS, not the int
  *q = 9;
  std::cout << x << '\\n';   // 9 — one object, two slips

  p = nullptr;              // "points at nothing", said out loud
}`,
      annotations: {
        5: 'Two different stars live in C++. This one is in a DECLARATION: it only says "p\'s type is pointer-to-int".',
        8: 'This star is in an EXPRESSION: an action — follow the stored address and hand me the object.',
        10: 'The write lands at the address p holds — x\'s box. p itself is untouched.',
        13: 'Pointer assignment copies the address. Same aliasing you saw in Python — two names, one object.',
        17: 'From this line, *p is a guaranteed bug — but a LOUD one. nullptr crashes on dereference; a garbage address may corrupt silently. Loud is a feature.',
      },
    },
    {
      type: 'note',
      md: `Three ways to spell "points at nothing" — only one is right. \`NULL\` is a C-era macro that in C++ is usually literally the integer \`0\`. So with overloads \`f(int)\` and \`f(int*)\`, the call \`f(NULL)\` picks \`f(int)\` — your null-POINTER call silently takes the non-pointer path. \`nullptr\` (C++11) has its own type, \`std::nullptr_t\`, which converts to any pointer type and to nothing else: it picks \`f(int*)\`, survives template type deduction, and can't be mixed into arithmetic. Habit to build today: every pointer is born holding either a real address or \`nullptr\`. Never garbage.`,
    },
    {
      type: 'intuition',
      title: 'Pointer arithmetic counts elements, not bytes',
      md: `An array is a row of identical lockers, each exactly \`sizeof(T)\` bytes wide. Pointer math moves locker-to-locker, never byte-by-byte.

- \`p + 1\` means "next element". The compiler silently multiplies by \`sizeof(T)\`: for an \`int*\` on a typical machine, +1 moves 4 bytes.
- \`p + k\` → address plus \`k * sizeof(T)\` bytes. Subtraction works the same way.
- \`q - p\` between two pointers into the same array gives the **element count** between them — not bytes.
- The rules hold only **inside one array** (plus its one-past-the-end position). Arithmetic between unrelated variables is *undefined behavior* — UB, the standard's term for "anything may happen, including looking correct".
- One-past-the-end (\`arr + N\`) is legal to *form* and compare — every loop's stop condition needs it — but never to dereference.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Pointer arithmetic: walking an int array',
        notice: 'Watch the address labels — every hop is exactly sizeof(int) = 4 bytes, whatever number you add.',
        leftLabel: 'pointer',
        rightLabel: 'int arr[4]',
        frames: [
          {
            note: 'int* p = arr — the array name decays to the address of arr[0]. p lands on 0x100.',
            stack: [{ name: 'int* p', to: 'a0' }],
            heap: [
              { id: 'a0', value: 'arr[0] = 10', label: '0x100' },
              { id: 'a1', value: 'arr[1] = 20', label: '0x104' },
              { id: 'a2', value: 'arr[2] = 30', label: '0x108' },
              { id: 'a3', value: 'arr[3] = 40', label: '0x10c' },
            ],
          },
          {
            note: 'p + 1 is 0x104, not 0x101 — one step is one whole int. The compiler scales every step by sizeof(T).',
            stack: [{ name: 'p + 1', to: 'a1' }],
            heap: [
              { id: 'a0', value: 'arr[0] = 10', label: '0x100' },
              { id: 'a1', value: 'arr[1] = 20', label: '0x104' },
              { id: 'a2', value: 'arr[2] = 30', label: '0x108' },
              { id: 'a3', value: 'arr[3] = 40', label: '0x10c' },
            ],
          },
          {
            note: '*(p + 3) reads 40 at 0x10c — and arr[3] compiles to exactly this. Indexing is pointer arithmetic in a costume.',
            stack: [{ name: 'p + 3', to: 'a3' }],
            heap: [
              { id: 'a0', value: 'arr[0] = 10', label: '0x100' },
              { id: 'a1', value: 'arr[1] = 20', label: '0x104' },
              { id: 'a2', value: 'arr[2] = 30', label: '0x108' },
              { id: 'a3', value: 'arr[3] = 40', label: '0x10c' },
            ],
          },
          {
            note: 'p + 4 is 0x110 — one PAST the end. Legal to point there (loops use it as the stop sign), undefined behavior to dereference.',
            stack: [{ name: 'p + 4', to: 'end', danger: true }],
            heap: [
              { id: 'a0', value: 'arr[0] = 10', label: '0x100' },
              { id: 'a1', value: 'arr[1] = 20', label: '0x104' },
              { id: 'a2', value: 'arr[2] = 30', label: '0x108' },
              { id: 'a3', value: 'arr[3] = 40', label: '0x10c' },
              { id: 'end', value: '???', label: '0x110 past end' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Arrays and pointers: the decay deal',
      md: `In most expressions an array's name **decays** — auto-converts — to a pointer to its first element. \`arr\` quietly becomes \`&arr[0]\`.

- Indexing is defined as pointer math: \`a[i]\` **is** \`*(a + i)\`. That is the standard's actual definition, not a metaphor.
- A function call is an expression, so parameters decay too: \`void f(int a[10])\` is rewritten by the compiler as \`void f(int* a)\`. The 10 is decoration.
- Inside \`f\`, \`sizeof(a)\` is therefore the size of a *pointer* — the array's length did not survive the call. This is THE historical source of buffer overflows.
- Consequence: raw-array APIs must ship the length separately — the \`(ptr, size)\` pair pattern all over C.
- Decay has exceptions: \`sizeof(arr)\`, \`&arr\`, and binding to a reference all keep the true \`int[N]\` type.
- Modern answer: \`std::vector\` (owns its data, knows its size) or \`std::span\` (borrows, knows its size). Raw arrays across function boundaries are C legacy.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Decay: where arrays lose their size',
      code: `#include <iostream>

void print_size(int a[4]) {          // the 4 is decoration
  std::cout << sizeof(a) << '\\n';    // 8 — pointer size, not 16!
}

int main() {
  int arr[4] = {10, 20, 30, 40};
  std::cout << sizeof(arr) << '\\n';  // 16 — the real array, 4 * 4 bytes

  int* p = arr;                      // decay: arr becomes &arr[0]
  std::cout << *(p + 2) << '\\n';     // 30
  std::cout << arr[2] << '\\n';       // 30 — a[i] IS *(a + i)
  std::cout << p[2] << '\\n';         // 30 — [] works on any pointer

  print_size(arr);                   // prints 8 — the size is gone
}`,
      annotations: {
        3: 'The compiler rewrites this parameter to int* a. Any number in the brackets is ignored — you cannot pass a raw array by value.',
        4: 'sizeof(a) here is sizeof(int*): 8 on a 64-bit machine (this file assumes 64-bit, 4-byte int). The 16-byte array identity never crossed the function boundary.',
        9: 'In main the full type int[4] is still known, so sizeof gives the honest 16.',
        11: 'No & needed — in this expression the array name auto-converts (decays) to a pointer to its first element.',
        13: 'The standard defines a[i] as *(a + i). Indexing is not an array feature; it is pointer arithmetic.',
        16: 'This is why C APIs take (pointer, length) pairs — and why modern C++ passes std::vector or std::span instead.',
      },
    },
    {
      type: 'intuition',
      title: 'Pointer to pointer: when the arrow itself must move',
      md: `\`int** pp\` — a slip whose written address leads to *another slip*. Sounds exotic; the use is boringly practical.

- Passing \`int* p\` to a function copies the slip. The function can change the pointed-at value (\`*p = 5\`) but **not** where the caller's p points — it would only reseat its own copy.
- To reseat the caller's pointer, the function needs the pointer's OWN address: an \`int**\`.
- You already own one: \`main(int argc, char** argv)\` — argv points at the first of several \`char*\` strings.
- That's the honest list. Deeper nesting (\`***\`) is a code smell, not a skill.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Reseating someone else\'s arrow',
      code: `#include <iostream>

int fallback = -1;

void reseat(int** pp) {        // pp = address OF a pointer
  *pp = &fallback;             // one hop in: change WHERE p points
}

int main() {
  int x = 42;
  int* p = &x;
  reseat(&p);                  // hand over p's own address
  std::cout << *p << '\\n';     // -1 — p was redirected
}`,
      annotations: {
        5: 'int** reads right to left: "pp is a pointer to a pointer to int". One extra level, same rules as always.',
        6: '*pp is the caller\'s pointer itself. Writing to it reseats p. (**pp would be the int at the far end.)',
        12: 'Passing p by value would copy the slip — reseat would redirect the copy and change nothing. The pointer\'s ADDRESS must travel.',
        13: 'Desk-check: pp holds p\'s address, *pp = &fallback makes p point at fallback, so *p reads -1.',
      },
    },
    {
      type: 'intuition',
      title: 'const and pointers: read right to left',
      md: `Two things could be locked: the value at the end of the arrow, or the arrow itself. The declaration tells you which — if you read it **right to left**.

- \`const int* p\` → "p is a pointer to an int that is const": writing \`*p\` is an error; reseating \`p\` is fine.
- \`int* const p\` → "p is a const pointer to int": reseating is an error; writing \`*p\` is fine.
- \`const int* const p\` → both locked.
- Mnemonic: \`const\` locks whatever sits immediately to its **left**; with nothing on the left it falls to the right (\`int const*\` means the same as \`const int*\`).
- Why interviewers care: \`f(const char* s)\` is a compiler-enforced promise to only read. Good APIs are built from these promises.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Who is locked?',
      code: `int x = 1, y = 2;

const int* a = &x;   // pointer to const int
// *a = 5;           // ERROR: the VALUE is protected
a = &y;              // ok: the pointer itself may move

int* const b = &x;   // const pointer to int
*b = 5;              // ok: the value is writable
// b = &y;           // ERROR: the POINTER is locked

const int* const c = &x;  // locked both ways: read-only, welded`,
      annotations: {
        3: 'Right to left: "a is a pointer to an int that is const". You promise not to write through it.',
        5: 'const int* protects the destination, not the arrow. Reseating is allowed.',
        7: 'Right to left: "b is a const pointer to int". The arrow is welded in place; the destination is fair game.',
        11: 'Function signatures use the first form constantly: f(const char* s) means "I will only read your string".',
      },
    },
    {
      type: 'note',
      md: `Preview of the two classic killers — both are arrows pointing at garbage. **Uninitialized pointer**: \`int* p;\` holds whatever bytes were lying on the stack — a random address. Dereferencing it is a lottery: crash if you're lucky, silent corruption if you're not. The fix is a habit, not a technique: every pointer is born \`= something\` (a real address or \`nullptr\`). **Dangling pointer**: the object died — freed, or fell out of scope — but your arrow still points at its old house. Full treatment next module, alongside \`new\`/\`delete\` and stack frames.`,
    },
    {
      type: 'note',
      md: `The whole module in five lines:
- A pointer is a variable that stores an **address**. \`&\` reads an address; \`*\` follows one.
- In \`int* p\` the star is TYPE; in \`*p = 7\` the star is ACTION. (And \`int* a, b\` makes b a plain int — one pointer per line.)
- \`nullptr\`, never \`NULL\` or \`0\` — it is pointer-typed, so overloads and templates cannot misread it.
- \`p + 1\` moves \`sizeof(T)\` bytes; \`a[i]\` is \`*(a + i)\`; arrays decay to pointers and lose their size at function boundaries — pass \`std::span\` or \`std::vector\`.
- \`const int*\` locks the value, \`int* const\` locks the pointer — read right to left.`,
    },
  ],
  quiz: [
    {
      question: 'A pointer is best described as…',
      options: [
        {
          text: 'A special alias for the object it points to',
          explanation: 'That is closer to a reference (next module). A pointer is its own variable, with its own address and size.',
        },
        {
          text: 'A variable whose stored value is a memory address',
          explanation: 'Correct. That is the entire definition — everything else in this module is grammar around it.',
        },
        {
          text: 'A copy of another variable',
          explanation: 'No copy of the pointee ever happens. Copying a pointer copies only the address written on the slip.',
        },
      ],
      correct: 1,
    },
    {
      question: 'int x = 5; int* p = &x; *p = 10; — what is x now?',
      options: [
        {
          text: '5 — p holds its own copy of the value',
          explanation: 'p stores x\'s ADDRESS, not a copy of 5. The write through *p lands in x\'s own box.',
        },
        {
          text: '10 — the write went through the address into x itself',
          explanation: 'Correct. *p on the left of = means "assign at the address p holds" — which is x.',
        },
        {
          text: 'Undefined behavior',
          explanation: 'p validly points at a live object — this is the textbook-legal use of a pointer, fully defined.',
        },
      ],
      correct: 1,
    },
    {
      question: 'int* a, b; — what is the type of b?',
      options: [
        {
          text: 'int* — the star distributes across the line',
          explanation: 'It does not. The star binds to each declarator NAME individually, and b has no star.',
        },
        {
          text: 'int — the star belongs to a only',
          explanation: 'Correct. This trap is exactly why style guides say one pointer declaration per line.',
        },
        {
          text: 'It is a compile error',
          explanation: 'Perfectly legal C++ — which is what makes it treacherous instead of merely annoying.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Why prefer nullptr over NULL or 0?',
      options: [
        {
          text: 'nullptr compiles to faster machine code',
          explanation: 'Identical machine code. The win is in the type system, not the CPU.',
        },
        {
          text: 'NULL is usually plain int 0, so f(NULL) can pick f(int) over f(int*); nullptr has its own pointer-only type',
          explanation: 'Correct. std::nullptr_t converts to any pointer type and nothing else — overloads and template deduction stay honest.',
        },
        {
          text: 'NULL was removed from modern C++',
          explanation: 'NULL still exists — the problem is that it works just well enough to hide bugs.',
        },
      ],
      correct: 1,
    },
    {
      question: 'int* p holds address 0x100 and sizeof(int) == 4. What is p + 3?',
      options: [
        {
          text: '0x103 — add 3 bytes',
          explanation: 'Pointer arithmetic counts ELEMENTS, never raw bytes. The compiler scales by sizeof(T).',
        },
        {
          text: '0x10c — 3 elements of 4 bytes each',
          explanation: 'Correct. 0x100 + 3 × 4 = 0x100 + 12 = 0x10c. One step is always one whole T.',
        },
        {
          text: '0x104 — pointers always advance one element',
          explanation: '0x104 is p + 1. Adding 3 moves three elements, not one.',
        },
      ],
      correct: 1,
    },
    {
      question: 'void f(int a[100]) { … } — inside f, what is sizeof(a)?',
      options: [
        {
          text: '400 — one hundred 4-byte ints',
          explanation: 'The array never arrives — only an address does. There is no 400-byte object inside f.',
        },
        {
          text: '100',
          explanation: 'sizeof never returns element counts — and a is not even an array here.',
        },
        {
          text: 'sizeof(int*) — typically 8 — because the parameter decayed to a pointer',
          explanation: 'Correct. The compiler rewrites the signature to f(int* a); the 100 is decoration. The size must be passed separately (or use std::span).',
        },
      ],
      correct: 2,
    },
    {
      question: 'Which expression is EXACTLY equivalent to arr[2]?',
      options: [
        {
          text: '*(arr + 2)',
          explanation: 'Correct — this is the standard\'s literal definition of indexing. (Addition commutes, so even 2[arr] compiles.)',
        },
        {
          text: '*arr + 2',
          explanation: 'Precedence trap: this dereferences first, giving arr[0] + 2 — a different number entirely.',
        },
        {
          text: '&arr[2]',
          explanation: 'That is an ADDRESS (equal to arr + 2), not the value stored there.',
        },
      ],
      correct: 0,
    },
    {
      question: 'You need a pointer that always points at the same int but lets you modify that int. Which declaration?',
      options: [
        {
          text: 'const int* p',
          explanation: 'Backwards — this locks the VALUE and leaves the pointer free to move.',
        },
        {
          text: 'int* const p',
          explanation: 'Correct. Read right to left: "const pointer to int" — the arrow is welded, the value stays writable.',
        },
        {
          text: 'const int* const p',
          explanation: 'Locked both ways — you could not modify the int through it.',
        },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Whiteboard: explain a pointer to a junior in one minute — then explain why int* p and *p mean different things.',
      answer:
        'Minute one: memory is numbered houses; every variable lives at an address; a pointer is a variable whose VALUE is an address — a slip of paper with a house number. & reads an address (&x), * follows one (*p). Then the star: in a declaration, * is part of the TYPE — int* p says "p is pointer-to-int", no action happens. In an expression, *p is an ACTION — go to the stored address. Same symbol, two grammars; naming that distinction out loud is what separates candidates who memorized syntax from ones who can debug it. Bonus point: int* a, b makes b a plain int — the star binds to the name.',
      isCaseBased: false,
    },
    {
      question: 'Why does p + 1 advance by sizeof(T) instead of one byte? And why does void* have no arithmetic?',
      answer:
        'Design choice: pointer arithmetic counts ELEMENTS. Loops, indexing, and q − p (element distance) all become natural, and it is impossible to land mid-object with a misaligned, garbage read. The tradeoff: you give up byte math — when you genuinely need bytes (serialization, allocators) you cast to char* or std::byte*, making the intent explicit. void* has no arithmetic precisely because sizeof(void) does not exist — the compiler cannot scale the step. That is a feature: it forces you to declare what type you believe the memory holds before walking it.',
      isCaseBased: false,
    },
    {
      question: 'What is array decay, why did C++ inherit it, and what do you reach for instead today?',
      answer:
        'Decay: in most expressions an array name auto-converts to a pointer to its first element, and function parameters like int a[10] are rewritten to int* a. Inherited from C for two reasons: performance (a call never copies a whole array — O(1) address pass) and compatibility. The cost: the size is silently lost at every function boundary, which bought the industry forty years of buffer overflows. Modern replacements and their tradeoffs: std::vector — owns its data, knows its size, but allocates; std::span (C++20) — non-owning view with a size, zero-cost, but you must guarantee the underlying data outlives it; std::array — fixed size kept in the type, passable by reference. Default advice: span for read/write views, vector for ownership.',
      isCaseBased: false,
    },
    {
      question: 'Case: a teammate "simplified" void fill(int arr[], int n) by computing n INSIDE fill as sizeof(arr) / sizeof(arr[0]). Now every array is treated as length 2. Diagnose and fix.',
      answer:
        'Diagnosis: inside fill, arr is int* (decay), so sizeof(arr) is 8 (64-bit pointer) and sizeof(arr[0]) is 4 — 8/4 = 2, always, for every caller. The trick only works where the true array type is visible. Fixes, with tradeoffs: (1) compute the count at each call site — works, but fragile and repetitive; (2) template<size_t N> void fill(int (&arr)[N]) — the size travels in the type, zero runtime cost, but one instantiation per array size and it rejects heap arrays; (3) std::span<int> — one function, works for arrays, vectors, and subranges, carries .size(); the caller must keep the data alive. Recommend span; add a static_assert or test that would have caught the constant-2. Also worth saying: the compiler warns about sizeof on a decayed parameter — the warning was ignored.',
      isCaseBased: true,
    },
    {
      question: 'const int* vs int* const — explain both, give the reading trick, and say which belongs on a read-only parameter and why.',
      answer:
        'Read right to left. const int* p: "pointer to const int" — cannot write *p, can reseat p. int* const p: "const pointer to int" — can write *p, cannot reseat. For a read-only parameter you want const int* (or const T&): it is a compiler-enforced promise not to modify, it lets callers pass const objects (a plain int* parameter rejects them), and it documents the API. int* const is nearly useless in a signature — top-level const on a parameter is even ignored in the declaration; it only constrains the function body. Tradeoff to name: const on the pointee widens your callable audience while narrowing what the function may do — the right direction for an interface.',
      isCaseBased: false,
    },
    {
      question: 'C++11 added nullptr when NULL had existed for decades. What bug class motivated it?',
      answer:
        'NULL in C++ is typically the integer literal 0. Two failure modes: (1) overload resolution — f(int) vs f(int*): f(NULL) calls f(int), so the "null pointer" call silently takes the integer path; (2) template deduction — forwarding NULL deduces int, and the forwarded value stops being a pointer at all. nullptr has its own type, std::nullptr_t, convertible to every pointer type and nothing else: both failure modes become correct or become compile errors. Tradeoff: essentially none — it is a strict upgrade; NULL survives only for C interop and old codebases. Interview flourish: this is the same lesson as Python\'s "is None" — a dedicated sentinel beats an overloadable value.',
      isCaseBased: false,
    },
    {
      question: 'Case: production crash. int* p; if (rare_cond) p = &slot; … later *p = val;. Debug builds run clean; release crashes about once a day. Walk through the diagnosis like a senior.',
      answer:
        'Pattern recognition first: works-in-debug + rare release crash = undefined behavior, and an uninitialized pointer is the prime suspect. When rare_cond is false, p holds leftover stack bytes; in debug builds the stack is often pattern-filled or the layout happens to hold a survivable address, in release the optimizer reshuffles and the garbage finally lands somewhere lethal. Diagnosis toolchain, cheapest first: compiler warnings (-Wuninitialized, -Wmaybe-uninitialized — this exact bug is usually already flagged), then sanitizers (ASan/MSan in CI), then int* p = nullptr — which converts the once-a-day silent corruption into a deterministic, catchable null-deref at the true fault site. Tradeoff: nullptr-init makes the bug LOUD but it is still a bug; the structural fix is making "unset" unrepresentable — initialize at declaration, or restructure so the assignment and the use cannot be separated by a branch.',
      isCaseBased: true,
    },
    {
      question: 'Give one honest use of a pointer-to-pointer, and name the modern alternatives.',
      answer:
        'Honest uses: a function that must RESEAT the caller\'s pointer (C-style out-param: reseat(&p)), argv as char** in main, and C-style linked-structure code that edits a head pointer via node**. Alternatives with tradeoffs: return the new pointer (clearest data flow, but occupies the return channel); take int*& — a reference to pointer (cleaner syntax, but the call site "reseat(p)" no longer signals mutation, which is why some style guides prefer the pointer form &p precisely for its visible ampersand); at the ownership level, unique_ptr<T>& or returning unique_ptr replaces the whole pattern. Anything beyond two stars is a design smell, not advanced skill.',
      isCaseBased: false,
    },
    {
      question: 'What is a one-past-the-end pointer, and why does the standard permit forming it but forbid dereferencing it?',
      answer:
        'arr + N for an N-element array: an address just after the last element. No object lives there, so dereferencing is UB — but FORMING and comparing it is explicitly legal because half-open ranges [begin, end) need it as the stop value. The half-open design pays for itself three ways: size is end − begin with no ±1 errors, the empty range is representable (begin == end), and ranges split cleanly at any midpoint. This is the exact contract behind every STL iterator pair and range-based for. Tradeoff framing: the standard permits exactly as much as the idiom needs — one step past, never two, and never a read.',
      isCaseBased: false,
    },
    {
      question: '2[arr] compiles and equals arr[2]. Why — and what deeper fact about C++ arrays does it expose?',
      answer:
        'Because a[i] is defined as *(a + i), and addition commutes: 2[arr] is *(2 + arr). The deeper fact: indexing is not an array feature — it is pointer arithmetic, and arrays barely exist as expression-level types. That one fact explains the whole cluster: why arrays decay, why there is no bounds checking (a pointer carries no size to check against), why sizeof stops working across function calls, and why std::vector::at() had to be invented to get a checked read. In an interview, connect the party trick to the consequences; in production, never write it.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'What does a pointer store?', back: 'A memory address. It is an ordinary variable whose value is a house number — 8 bytes on 64-bit, whatever it points at.' },
    { front: '& vs * in one line', back: '&x = address-of ("what is x\'s address?"). *p = dereference ("go to the address stored in p").' },
    { front: 'int* p vs *p', back: 'Declaration: the star is part of the TYPE (p is pointer-to-int). Expression: *p is an ACTION (follow the arrow). Same symbol, two grammars.' },
    { front: 'Why nullptr, not NULL or 0?', back: 'NULL is usually int 0 → f(NULL) picks f(int) over f(int*). nullptr has its own type (std::nullptr_t) that converts only to pointers.' },
    { front: 'What does p + 1 actually add?', back: 'sizeof(T) bytes — pointer arithmetic counts elements, never bytes. Valid only within one array plus its one-past-the-end position.' },
    { front: 'The definition of a[i]', back: '*(a + i) — indexing IS pointer arithmetic (hence 2[arr] compiles). No bounds checking because a pointer carries no size.' },
    { front: 'Array decay', back: 'In most expressions arr becomes &arr[0]; f(int a[10]) is rewritten to f(int* a). The size is lost — pass it separately, or use std::span/vector.' },
    { front: 'const int* vs int* const', back: 'Read right to left. const int*: value locked, pointer reseatable. int* const: pointer welded, value writable.' },
    { front: 'The two classic pointer bugs', back: 'Uninitialized (holds garbage — always init to an address or nullptr) and dangling (object died, arrow survived — next module).' },
  ],
  mindmapMarkdown: `- Pointers — the Full Story
  - What it is
    - a variable holding an ADDRESS
    - copying p copies the address, not the object
  - & and *
    - &x: address-of
    - *p: go to the address
    - declaration * = type, expression * = action
  - nullptr
    - NULL is int 0 → overload trap
    - pointers are born initialized
  - Arithmetic
    - p + 1 = + sizeof(T) bytes
    - one-past-end: point yes, deref no
  - Arrays
    - decay: arr → &arr[0]
    - a[i] is *(a + i)
    - size lost in calls → span / vector
  - const
    - const int*: value locked
    - int* const: pointer locked
    - read right to left
  - Bug preview (next module)
    - uninitialized: garbage arrow
    - dangling: dead pointee`,
}

export default m
