import type { Module } from '../types'

const m: Module = {
  id: 'dsa-l3-bits',
  subjectId: 'dsa',
  level: 3,
  title: 'Bit Manipulation Patterns',
  whyItMatters:
    'Bit problems look like magic and are actually three facts: what AND/OR/XOR do per bit, what subtracting 1 does to the bits, and that an int can BE a set. Interviewers use them as speed checks — Single Number in one pass, power-of-two in one line. This module turns the magic into moves you can replay.',
  estMinutes: 40,
  sections: [
    {
      type: 'intuition',
      title: 'A number is a row of switches',
      md: `An 8-bit number is 8 light switches. Each switch has a fixed price: 1, 2, 4, 8, 16, 32, 64, 128 — right to left, doubling.

- The number's value = sum of the prices of the ON switches. \`1100\` = 8 + 4 = 12.
- Bit i is worth 2^i. Bit 0 is the rightmost — the "ones" switch.
- Everything in this module is just flipping, reading, and combining switches.
- One habit fixes most bit bugs: when stuck, **write the binary out on paper**. Never reason about bits in decimal.`,
    },
    {
      type: 'note',
      md: `Two's complement, the honest version: **-n = ~n + 1** (flip all bits, add one). Why: for any n, \`n + ~n\` = all 1s (each column is 1+0 or 0+1 — no carries). All 1s is -1 in two's complement, because adding 1 to it carries off the end and leaves 0 — the odometer rolls over. So n + ~n = -1, which rearranges to ~n + 1 = -n. This one identity powers \`n & -n\` below, and explains why \`~12\` prints -13 (~n = -n - 1).`,
    },
    {
      type: 'intuition',
      title: 'The toolkit: six operators, six jobs',
      md: `- \`&\` AND — 1 only where **both** are 1. Job: **mask** — keep only the bits you care about, zero the rest.
- \`|\` OR — 1 where **either** is 1. Job: **combine** — turn bits on without touching the others.
- \`^\` XOR — 1 where they **differ**. Job: **toggle** — flip chosen bits; also "difference detector".
- \`~\` NOT — flip every bit. Job: **invert** — usually to build a "everything except bit i" mask: \`~(1 << i)\`.
- \`<<\` shift left — Job: **scale up** — \`x << k\` is x · 2^k, and \`1 << i\` manufactures the bit-i mask.
- \`>>\` shift right — Job: **scale down** — \`x >> k\` is x / 2^k (floor), and \`(x >> i) & 1\` reads bit i.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'All six, on real numbers',
      code: `int a = 12, b = 10;        // binary: a = 1100, b = 1010
int m1 = a & b;            // 8  (1000)  AND: 1 only where BOTH are 1
int m2 = a | b;            // 14 (1110)  OR: 1 where EITHER is 1
int m3 = a ^ b;            // 6  (0110)  XOR: 1 where they DIFFER
int m4 = ~a;               // -13        NOT: flip every bit
int m5 = a << 1;           // 24         shift left: multiply by 2
int m6 = a >> 2;           // 3          shift right: divide by 4`,
      annotations: {
        2: 'Check column by column: 1100 & 1010 — only the 8s column has 1 in both. Masking = ANDing with a pattern of "keep" bits.',
        4: 'XOR is its own undo: (x ^ k) ^ k == x. That self-inverse property is the engine of every XOR trick below.',
        5: '~12 = -13 because ~n = -n - 1 (the two\'s complement note above). ~ flips ALL 32 bits, sign bit included.',
        7: 'Integer division, floored: 12 >> 2 = 3. For non-negative numbers, >> k and / 2^k agree exactly.',
      },
    },
    {
      type: 'intuition',
      title: 'n & (n-1): the borrow that kills exactly one bit',
      md: `Subtracting 1 from a binary number is a **borrow ripple**: it turns the lowest 1 into 0, and every 0 below it into 1. Bits above the lowest 1 are untouched.

- Example: 12 = \`1100\`. Subtract 1 → the lowest 1 (bit 2) dies, bits below flood to 1: \`1011\` = 11.
- Now AND them. Above the lowest set bit: both numbers agree → those bits survive.
- At the lowest set bit: n has 1, n-1 has 0 → dies. Below: n has all 0s → already dead.
- So **n & (n-1) clears exactly the lowest set bit** — one bit per operation, guaranteed.
- Watch it frame by frame below, then meet its two famous children: popcount and the power-of-two test.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'n & (n-1) — the borrow ripple, frame by frame',
        notice: 'n = 12. Watch which bit columns change between frames — and which one is missing at the end.',
        leftLabel: 'values',
        rightLabel: 'bit columns (8 · 4 · 2 · 1)',
        frames: [
          {
            note: 'n = 12 = 1100. The lowest SET bit is bit 2 (the 4s column). Everything below it is already 0.',
            stack: [{ name: 'n', value: '12 (1100)' }],
            heap: [
              { id: 'b3', value: '1', label: '8s — above the lowest set bit' },
              { id: 'b2', value: '1', label: '4s — the lowest SET bit' },
              { id: 'b1', value: '0', label: '2s' },
              { id: 'b0', value: '0', label: '1s' },
            ],
          },
          {
            note: 'n-1 = 11 = 1011. The borrow ripple: the lowest 1 flipped to 0, every 0 below it flipped to 1. Bit 3 never felt it.',
            stack: [
              { name: 'n', value: '12 (1100)' },
              { name: 'n-1', value: '11 (1011)' },
            ],
            heap: [
              { id: 'b3', value: '1', label: 'unchanged' },
              { id: 'b2', value: '0', label: 'was 1 — the borrow ate it' },
              { id: 'b1', value: '1', label: 'was 0 — flooded to 1' },
              { id: 'b0', value: '1', label: 'was 0 — flooded to 1' },
            ],
          },
          {
            note: 'AND the columns: bit 3 is 1 in both — survives. Bit 2: 1 & 0 — dies. Bits 1, 0: n had 0 — dead already. Result 1000 = 8: exactly the lowest set bit removed.',
            stack: [
              { name: 'n', value: '12 (1100)' },
              { name: 'n-1', value: '11 (1011)' },
              { name: 'n & (n-1)', value: '8 (1000)' },
            ],
            heap: [
              { id: 'b3', value: '1 & 1 = 1', label: 'both agree — survives' },
              { id: 'b2', value: '1 & 0 = 0', label: 'the lowest set bit — killed', freed: true },
              { id: 'b1', value: '0 & 1 = 0', label: 'n had 0 — nothing to keep' },
              { id: 'b0', value: '0 & 1 = 0', label: 'n had 0 — nothing to keep' },
            ],
          },
        ],
      },
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'The two famous children of n & (n-1)',
      code: `int countSetBits(int n) {          // Brian Kernighan's algorithm
    int count = 0;
    while (n) {
        n &= (n - 1);              // kill the lowest set bit
        count++;
    }
    return count;                  // countSetBits(13) == 3   (1101)
}

bool isPowerOfTwo(int n) {
    return n > 0 && (n & (n - 1)) == 0;
}`,
      annotations: {
        4: 'One kill per iteration, so the loop runs once per SET bit — O(k), not O(32). For 13: 1101 → 1100 → 1000 → 0000. Three kills.',
        7: 'Production one-liner worth naming: __builtin_popcount(n) (GCC/Clang) or C++20 std::popcount — hardware instruction speed.',
        11: 'A power of two has exactly ONE set bit, so killing it leaves 0. The n > 0 guard matters: without it, n = 0 passes (0 & -1 == 0) and 0 is not a power of two.',
      },
    },
    {
      type: 'intuition',
      title: 'n & -n: isolate, don\'t kill',
      md: `Same borrow story, opposite product. \`-n\` is \`~n + 1\`: flipping makes every bit disagree with n, then the +1 carry ripples up through the flipped low 1s and stops exactly at n's lowest set bit — putting a 1 back there.

- So n and -n agree at **exactly one position**: the lowest set bit. AND keeps only that.
- 12 = \`1100\`, -12 = \`...10100\` → \`12 & -12\` = \`0100\` = 4. Not the index — the bit's **value**.
- The one-line bridge: a Fenwick tree (BIT) walks its array in steps of \`i & -i\` — that is the entire reason this trick exists in library code.
- Pairing: \`n & (n-1)\` **removes** the lowest set bit; \`n & -n\` **extracts** it. Same ripple, two tools.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Lowest set bit: value and index',
      code: `int n = 12;                  // 1100
int low = n & -n;            // 4 (0100) -- only the lowest set bit survives
int idx = __builtin_ctz(n);  // 2 -- count trailing zeros = INDEX of that bit`,
      annotations: {
        2: 'Fenwick/BIT in one line: the tree moves between nodes with i += i & -i (update) and i -= i & -i (query). This trick IS that data structure\'s engine.',
        3: 'ctz = count trailing zeros. low gives the bit as a value (4); ctz gives its position (2). Interviews accept either — know both names.',
      },
    },
    {
      type: 'intuition',
      title: 'XOR: the pair annihilator',
      md: `Two identities do all the work: **x ^ x = 0** (a thing cancels itself) and **x ^ 0 = x** (zero is invisible). XOR is also commutative — order never matters. So XOR a whole list, and everything that appears an even number of times vanishes.

- **Single Number**: every element appears twice except one. XOR all → pairs annihilate → the loner remains. O(n) time, O(1) space, no hash map.
- **Missing Number**: array holds 0…n with one missing. XOR every index with every value — each present number pairs with its own index and cancels; the missing one's index survives unpartnered.
- Trigger phrase: "everything appears twice except…" or "find the missing/odd one out" → think XOR before you think hash map.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Single Number and Missing Number',
      code: `int singleNumber(const vector<int>& a) {
    int x = 0;
    for (int v : a) x ^= v;        // pairs annihilate: x ^ x = 0
    return x;                      // {4,1,2,1,2} -> 4
}

int missingNumber(const vector<int>& a) {  // a holds 0..n, one missing
    int x = 0, n = (int)a.size();
    for (int i = 0; i < n; i++)
        x ^= i ^ a[i];             // index XOR value: matched pairs cancel
    return x ^ n;                  // n itself had no index -- fold it in last
}`,
      annotations: {
        3: 'Order never matters (commutative), so no sorting needed. Every duplicate pair self-destructs regardless of position.',
        10: 'Each value v in the array eventually meets index v somewhere in the stream and cancels. Only the missing number\'s index survives.',
        11: 'Indices run 0..n-1 but values run 0..n — the value n never got an index partner. XOR it in at the end. Trace {3,0,1}: x ends at 1, 1 ^ 3 = 2. Correct.',
      },
    },
    {
      type: 'note',
      md: `The XOR swap — \`a ^= b; b ^= a; a ^= b;\` — swaps two ints with no temp. Know it, then say out loud why it stays out of production: it **silently zeroes both** if a and b alias the same memory (swap(v[i], v[i]) with i == j), it is not faster than \`std::swap\` on any modern compiler, and it is harder to read. It is a party trick — mentioning those three reasons IS the interview answer.`,
    },
    {
      type: 'intuition',
      title: 'A mask is a set',
      md: `An int has 32 switches — so an int can BE a set over up to 32 items: bit i on means "item i is in". Set operations become single instructions.

- Membership: \`(mask >> i) & 1\`. Insert: \`mask |= (1 << i)\`. Remove: \`mask &= ~(1 << i)\`. Toggle: \`mask ^= (1 << i)\`.
- These four are the interview one-liners for "get/set the i-th bit" — write them without thinking.
- Union of two sets = \`|\`, intersection = \`&\`, difference = \`a & ~b\`. All O(1).
- The killer feature: the integers 0 to 2ⁿ−1 **enumerate every subset** of an n-item set. One for-loop visits all of them.
- One line of foreshadowing: bitmask DP (Traveling Salesman, "assign n tasks to n people") uses exactly this — the DP state is a mask of "who is already used".`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Bit-set one-liners and the subset loop',
      code: `int mask = 0;                     // {} -- the empty set
mask |= (1 << 0);                 // insert 0  -> {0}    mask = 1 (0001)
mask |= (1 << 3);                 // insert 3  -> {0,3}  mask = 9 (1001)
bool has3 = (mask >> 3) & 1;      // membership -> true
mask ^= (1 << 0);                 // toggle 0  -> {3}    mask = 8 (1000)
mask &= ~(1 << 3);                // remove 3  -> {}     mask = 0

int n = 3;
for (int m = 0; m < (1 << n); m++)   // m = 0..7: EVERY subset of {0,1,2}
    for (int i = 0; i < n; i++)
        if ((m >> i) & 1)
            useItem(i);              // m = 5 (101) uses items 0 and 2`,
      annotations: {
        6: 'The remove idiom: build the bit with 1 << i, invert it with ~ (all 1s except position i), AND to clear. |= with ~ is a classic wrong answer.',
        9: '1 << n subsets, each checked in n steps: O(2^n · n) total. Fine to n ≈ 20-ish; state that ceiling before the interviewer asks.',
        12: 'Read m = 5 = 101 right to left: bit 0 on, bit 1 off, bit 2 on — the subset {0, 2}. The loop counter IS the subset.',
      },
    },
    {
      type: 'note',
      md: `Signed-shift caution — the two bugs hiding in \`<<\` and \`>>\`:

- \`1 << 31\` overflows a 32-bit int — undefined behavior (1 is an int literal). Building high bits or 2ⁿ beyond 30: write \`1LL << i\` or use \`unsigned\`/\`uint64_t\`.
- \`>>\` on a **negative** signed value is an arithmetic shift (it drags the sign bit in, keeping the number negative) — so \`>>\` is NOT "divide by 2" for negatives: \`-7 >> 1\` is -4, but \`-7 / 2\` is -3.
- House rule for bit tricks: keep values non-negative or use unsigned types, and say so in the interview — it reads as scar tissue, in a good way.`,
    },
    {
      type: 'note',
      md: `C++ bonus tool: \`std::bitset<N>\` — a fixed-size (compile-time N) array of bits with the set API built in: \`bs.set(i)\`, \`bs.reset(i)\`, \`bs.flip(i)\`, \`bs.test(i)\`, and the star, \`bs.count()\` — popcount over all N bits, machine-word fast. Prints as a binary string, which also makes it the quickest way to **debug** bit code: \`bitset<8>(x)\` shows you the switches. Fixed size is the tradeoff — for a runtime-sized bit array you are back to \`vector<bool>\` or manual masks.`,
    },
  ],
  quiz: [
    {
      question: 'n = 12 (binary 1100). What is n & (n - 1)?',
      options: [
        { text: '8 (1000)', explanation: 'Correct. 12 & 11 = 1100 & 1011 = 1000. The lowest set bit (the 4s column) is cleared; everything above survives.' },
        { text: '4 (0100)', explanation: 'That is n & -n — the ISOLATE trick. n & (n-1) removes the lowest set bit, leaving the rest.' },
        { text: '11 (1011)', explanation: 'That is just n - 1 itself. The AND with n still has to happen.' },
        { text: '0', explanation: 'Only a power of two collapses to 0 — it has a single set bit. 12 has two.' },
      ],
      correct: 0,
    },
    {
      question: 'Why does isPowerOfTwo need "n > 0 &&" in front of (n & (n-1)) == 0?',
      options: [
        { text: 'To avoid undefined behavior on negative n', explanation: 'n - 1 on a negative int is well-defined. The guard is about a wrong ANSWER, not UB.' },
        { text: 'Because n = 0 passes the bit test but is not a power of two', explanation: 'Correct. 0 & -1 == 0, so without the guard, 0 is declared a power of two. The guard also rejects negatives in the same stroke.' },
        { text: 'It is just defensive style — the bit test alone is correct', explanation: 'It is load-bearing: feed 0 to the bare bit test and it returns true. That is a wrong answer, not style.' },
      ],
      correct: 1,
    },
    {
      question: 'n = 12 (1100). What is n & -n?',
      options: [
        { text: '4 (0100)', explanation: 'Correct. -12 = ~12 + 1 ends in ...10100; the only column where 12 and -12 agree is the lowest set bit.' },
        { text: '8 (1000)', explanation: 'That is n & (n-1) — the REMOVE trick. n & -n isolates, giving only the lowest set bit.' },
        { text: '2', explanation: 'n & -n returns the bit VALUE (2^index), and the lowest set bit of 12 is bit 2 — value 4, not index 2.' },
        { text: '-12', explanation: 'AND cannot return a value with bits set where n has none — and n = 12 has a 0 sign bit.' },
      ],
      correct: 0,
    },
    {
      question: 'Array {7, 3, 5, 3, 7}. What does XOR-ing all elements produce, and why?',
      options: [
        { text: '5 — the pairs (7,7) and (3,3) annihilate via x ^ x = 0', explanation: 'Correct. XOR is commutative, so position is irrelevant: duplicates cancel wherever they sit, and 5 ^ 0 = 5 remains.' },
        { text: '0 — XOR of many numbers always cancels out', explanation: 'Only matched pairs cancel. 5 appears once, so it survives the massacre.' },
        { text: 'It depends on the order of elements', explanation: 'XOR is commutative and associative — any order gives the same result. That is exactly why the trick needs no sorting.' },
        { text: '25 — XOR adds the unique elements', explanation: 'XOR is not addition; there are no carries. Each bit column just counts parity.' },
      ],
      correct: 0,
    },
    {
      question: 'Which expression tests whether bit i of mask is on?',
      options: [
        { text: 'mask & i', explanation: 'This ANDs with the VALUE i, not with bit i. Testing bit 3 needs the pattern 1000, not the number 3 (0011).' },
        { text: '(mask >> i) & 1', explanation: 'Correct. Slide bit i down to position 0, then keep only that. mask & (1 << i) works too — nonzero means set.' },
        { text: 'mask | (1 << i)', explanation: 'OR turns the bit ON — that is insert, not test. It always evaluates truthy for any nonzero result.' },
        { text: 'mask ^ (1 << i)', explanation: 'XOR toggles the bit — that is flip, not test.' },
      ],
      correct: 1,
    },
    {
      question: 'You need the 2^40 mask in C++. What is wrong with 1 << 40?',
      options: [
        { text: 'Nothing — shifts work for any amount', explanation: 'The literal 1 is a 32-bit int; shifting past bit 31 is undefined behavior, not a big number.' },
        { text: '1 is an int, so shifting by 40 (or even 31 into the sign bit) is undefined behavior — write 1LL << 40', explanation: 'Correct. The result type comes from the LEFT operand. 1LL makes it a 64-bit shift, which is well-defined up to bit 62.' },
        { text: 'It compiles to 0 on all platforms, silently', explanation: 'It is UB — compilers may warn, wrap, or produce anything. "Silently 0 everywhere" is exactly the kind of guarantee UB does not give.' },
      ],
      correct: 1,
    },
    {
      question: 'The XOR swap (a ^= b; b ^= a; a ^= b;) is applied where a and b refer to the SAME variable. Result?',
      options: [
        { text: 'The value is unchanged — swapping with itself is a no-op', explanation: 'That is std::swap behavior. The XOR version has a landmine here.' },
        { text: 'The variable becomes 0 — the first x ^= x annihilates it', explanation: 'Correct. a ^= b with a and b aliased is x ^= x = 0, and the next two steps keep it 0. This aliasing bug is reason one why it is a party trick, not production code.' },
        { text: 'Undefined behavior', explanation: 'It is perfectly defined — defined to destroy your data. Every step is a legal XOR; the LOGIC is what breaks.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain WHY n & (n-1) clears exactly the lowest set bit — the argument, not just the fact.',
      answer:
        'Subtracting 1 triggers a borrow ripple: the lowest 1 of n becomes 0, every 0 below it becomes 1, and all bits above are untouched. Now AND the two numbers, column by column: above the lowest set bit both agree, so those bits survive; at the lowest set bit n has 1 and n-1 has 0, so it dies; below it n was all 0s already. Net effect: exactly one bit removed, O(1). Bonus sentence: its sibling n & -n keeps ONLY that bit, because -n = ~n + 1 and the carry from +1 recreates a 1 at precisely that position.',
      isCaseBased: false,
    },
    {
      question: 'Count the set bits of an integer. Give the ladder: brute force, Kernighan, and the production answer, with complexities.',
      answer:
        'Brute: check all 32 positions with (n >> i) & 1 — O(32) always. Better — Brian Kernighan: while (n) { n &= n - 1; count++; } — each iteration kills one set bit, so O(k) where k = number of set bits; for sparse numbers that is far fewer than 32 iterations. Best in practice: __builtin_popcount(n) (GCC/Clang) or C++20 std::popcount — a single hardware POPCNT instruction. In the interview: write Kernighan, name the builtin. Kernighan is what they are testing; knowing the builtin exists is the seniority signal.',
      isCaseBased: false,
    },
    {
      question: 'Case: you solved Single Number with XOR. Interviewer follows up: "now every element appears THREE times except one." Your XOR trick returns garbage. What now?',
      answer:
        'XOR cancels PAIRS — parity mod 2 — so triples leave residue and the trick genuinely breaks. Generalize the idea instead of the operator: for each of the 32 bit positions, count how many array elements have that bit set. Elements appearing 3 times contribute multiples of 3 to every column; the loner contributes its own bits. So (count % 3) != 0 exactly at the loner\'s set bits — rebuild it bit by bit. O(32n) time, O(1) space. Name the framing: XOR is per-bit counting mod 2; this is the same machine upgraded to mod 3, and it generalizes to "appears k times except one" with mod k.',
      isCaseBased: true,
    },
    {
      question: 'Missing Number (0..n, one absent): give three approaches and the tradeoff that makes XOR the safe one.',
      answer:
        'Approach 1 — sum formula: expected n(n+1)/2 minus actual sum. O(n), one pass, but n(n+1)/2 can overflow the accumulator type for large n unless you use a 64-bit sum. Approach 2 — sort and scan for the gap: O(n log n), needless. Approach 3 — XOR every index with every value, then XOR n at the end: each present value cancels against its own index, only the missing one survives. O(n) time, O(1) space, and NO overflow risk — XOR never carries. Tradeoffs stated: sum is equally fast but has the overflow footgun; XOR is the same speed with no footgun. That comparison is the answer they want.',
      isCaseBased: false,
    },
    {
      question: 'Case: your brute-force over all subsets — for (int m = 0; m < (1 << n); m++) — passes n = 20 but TLEs at n = 30. Walk through why, and what you would try next.',
      answer:
        'The loop is O(2^n · n): at n = 20 that is ~2·10^7 checks — fine; at n = 30 it is ~3·10^10 — dead, and no constant-factor tuning survives a 1000× blowup. Escalation ladder: (1) meet in the middle — split the items into two halves of 15, enumerate 2^15 subsets of each, combine via sorting/binary search: O(2^(n/2) · n), ~10^5 per side; classic for subset-sum style questions. (2) If subproblems repeat, bitmask DP over states: O(2^n · n) but per-STATE, not per-subset-re-enumeration — turns TSP from n! into 2^n · n². (3) Prune: if constraints allow, backtracking with bounds beats blind enumeration. Also flag the correctness bug waiting at n = 31: 1 << n overflows int — switch to 1LL.',
      isCaseBased: true,
    },
    {
      question: 'What does n & -n compute, why does it work, and where does a real data structure depend on it?',
      answer:
        'It isolates the lowest set bit as a value: 12 (1100) & -12 → 4 (0100). Why: -n = ~n + 1. The ~ makes every bit disagree with n; the +1 carry ripples through the flipped low 1s and stops at n\'s lowest set bit, planting a 1 exactly there — the only position where n and -n both hold 1, so AND keeps only it. Real dependency: the Fenwick tree (Binary Indexed Tree) — node i covers a range of length i & -i, updates climb with i += i & -i, prefix queries descend with i -= i & -i. The entire O(log n) prefix-sum structure is this one trick walked repeatedly.',
      isCaseBased: false,
    },
    {
      question: 'Show how to swap two integers without a temporary, then tell me whether you would ship it.',
      answer:
        'a ^= b; b ^= a; a ^= b; — after step one a holds a^b, step two gives b = (a^b)^b = a, step three gives a = (a^b)^a_original... net: swapped, using x^x=0 and x^0=x. Would I ship it? No, and here is why: (1) aliasing bug — if a and b are the same object (swap(v[i], v[j]) with i == j), the first XOR zeroes it and the data is gone; (2) zero performance win — std::swap compiles to register moves, often FASTER than the three dependent XORs; (3) readability cost. Interviewers ask this to see if you know the trick AND know better than to use it. Give both halves.',
      isCaseBased: false,
    },
    {
      question: 'Follow-up chain: test if n is a power of two. Then: a power of FOUR. No loops allowed.',
      answer:
        'Power of two: n > 0 && (n & (n - 1)) == 0 — exactly one set bit, so removing the lowest leaves nothing. Power of four: must be a power of two AND that single bit must sit at an even index (bit 0, 2, 4, … since 4^k = 2^(2k)). Mask the even positions: n > 0 && (n & (n - 1)) == 0 && (n & 0x55555555) != 0. 0x5 is 0101, so 0x55555555 is a 1 at every even bit position. Both O(1). The transferable move: constant masks with a repeating pattern (0x5555…, 0x3333…, 0x0F0F…) select bit positions by residue class — the same family powers the divide-and-conquer popcount.',
      isCaseBased: false,
    },
    {
      question: 'Case: a teammate stores 8 boolean feature flags in 8 separate bool fields, then serializes them one by one over the network. Propose the bit version and its API.',
      answer:
        'Pack them into one uint8_t: flag i lives at bit i — 1 byte on the wire instead of 8, and comparisons/copies become single instructions. API is the four one-liners: isSet: (flags >> i) & 1; set: flags |= (1u << i); clear: flags &= ~(1u << i); toggle: flags ^= (1u << i). Bulk ops come free — "any flag on" is flags != 0, "these three flags all on" is (flags & mask) == mask, diffing two states is flags ^ old (set bits mark what changed). Caveats to volunteer: use unsigned types for flag words; and if the flag set will grow past the word size or needs names, an enum-backed mask or std::bitset keeps it readable — bit packing is an encoding, not an excuse to lose the names.',
      isCaseBased: true,
    },
    {
      question: 'Why is x >> 1 NOT always the same as x / 2 in C++, and what is the safe practice?',
      answer:
        'For negative signed values they disagree: >> on a negative is an arithmetic shift that rounds toward negative infinity (-7 >> 1 = -4), while integer division rounds toward zero (-7 / 2 = -3). Additionally, left-shifting into or past the sign bit (1 << 31 on int) is undefined behavior. Safe practice: do bit manipulation on unsigned types (or provably non-negative values), use 1LL or 1u/1ull literals when building masks near or past bit 31, and let the compiler turn honest x / 2 into a shift when it is legal — write intent, not micro-optimizations. Saying "I use unsigned for bit tricks" unprompted is a credibility point.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'The six operators, one job each', back: '& mask · | combine · ^ toggle/differ · ~ invert · << scale up (×2^k) · >> scale down (÷2^k)' },
    { front: 'Two\'s complement: -n = ?', back: '-n = ~n + 1. Because n + ~n = all 1s = -1. Also explains ~n = -n - 1 (so ~12 = -13).' },
    { front: 'n & (n-1) does what? Two famous uses?', back: 'Clears the LOWEST set bit. Uses: Kernighan popcount (loop once per set bit) and power-of-two test: n > 0 && (n & (n-1)) == 0.' },
    { front: 'n & -n does what? Which structure runs on it?', back: 'Isolates the lowest set bit as a value (12 → 4). The Fenwick tree/BIT: i += i & -i to update, i -= i & -i to query.' },
    { front: 'XOR identities and their trigger phrase', back: 'x ^ x = 0, x ^ 0 = x, order irrelevant. Trigger: "every element appears twice except one" / "find the missing one" → XOR, O(1) space.' },
    { front: 'Missing Number via XOR', back: 'XOR every index with every value, then XOR n. Matched value-index pairs cancel; the missing one survives. No overflow, unlike the sum formula.' },
    { front: 'The four bit one-liners (i-th bit)', back: 'test: (x >> i) & 1 · set: x |= (1 << i) · clear: x &= ~(1 << i) · toggle: x ^= (1 << i)' },
    { front: 'Enumerate all subsets of n items', back: 'for (int m = 0; m < (1 << n); m++) — each m IS a subset (bit i on = item i in). O(2^n · n). Ceiling: n ≈ 20-25. Bitmask DP state = same idea.' },
    { front: 'The two shift traps', back: '1 << 31 on int = UB → use 1LL << i or unsigned. >> on negatives = arithmetic shift, rounds toward -∞ (-7 >> 1 = -4, but -7/2 = -3).' },
    { front: 'std::bitset<N>', back: 'Fixed compile-time size. set/reset/flip/test per bit, .count() = popcount, prints as binary string (best bit debugger). Runtime size → back to manual masks.' },
  ],
  mindmapMarkdown: `- Bit Manipulation Patterns
  - Binary basics
    - bit i is worth 2^i
    - two's complement: -n = ~n + 1
  - Operator toolkit
    - & mask · | combine · ^ toggle
    - ~ invert · << ×2 · >> ÷2
  - n & (n-1) — remove lowest set bit
    - borrow ripple explains it
    - Kernighan popcount: O(set bits)
    - power of two: n>0 && !(n&(n-1))
  - n & -n — isolate lowest set bit
    - carry stops at the lowest 1
    - Fenwick/BIT: i += i & -i
  - XOR patterns
    - x^x = 0, x^0 = x
    - Single Number · Missing Number
    - swap without temp = party trick
  - Mask as a set
    - test/set/clear/toggle one-liners
    - for m in [0, 2^n): all subsets
    - bridge → bitmask DP (TSP)
  - Caution: 1 << 31 is UB → use 1LL / unsigned
  - Caution: >> on negatives ≠ divide
  - std::bitset — fixed size, .count()`,
}

export default m
