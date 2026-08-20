import type { Module } from '../types'

const m: Module = {
  id: 'dsa-l0-bigo-binary-search',
  subjectId: 'dsa',
  level: 0,
  title: 'Big-O & Binary Search',
  whyItMatters:
    'Every FAANG answer ends the same way: "…and this runs in O(n log n)." Say it wrong and the interview is over, whatever your code did. This module makes complexity something you can see, and gives you the single most-asked algorithm on top of it.',
  estMinutes: 45,
  sections: [
    {
      type: 'intuition',
      title: 'Stop timing code. Start counting steps.',
      md: `Two chefs make biryani for 4 people. Both taste great. Now 400 guests show up.

- Chef A's recipe: chop everything once, cook in one big pot. Work grows *with* the guests.
- Chef B's recipe: cook one plate at a time, and re-taste **every previous plate** before serving the next. Work explodes.
- Same job, wildly different **scaling**. That difference is what Big-O measures.
- We don't care how fast your laptop is. We care: **if the input gets 10× bigger, how much more work happens?**
- So we count *operations as a function of input size n* — not seconds.`,
    },
    {
      type: 'intuition',
      title: 'The six growth speeds you will meet forever',
      md: `- **O(1)** — same work no matter what. Array index, hash lookup.
- **O(log n)** — halve the problem each step. Binary search.
- **O(n)** — touch everything once. A single loop.
- **O(n log n)** — sort-speed. Merge sort, heap sort.
- **O(n²)** — compare everything with everything. Nested loops.
- **O(2ⁿ)** — try every subset. Brute-force recursion. Dies at n≈25.`,
    },
    { type: 'visual', component: 'BigOGrowthChart', props: {} },
    {
      type: 'note',
      md: 'Definition, one line: **O(g(n))** means "for big n, the work grows no faster than g(n), times some constant". `3n² + 5n + 20` is O(n²) — for large n, the n² term is the whole story.',
    },
    {
      type: 'intuition',
      title: 'Why we throw away constants',
      md: `A 300 km road trip is "a highway drive". Nobody mentions the 2 minutes of driveway.

- O(2n) and O(n) are the same family: double speed hardware makes them identical.
- Big-O compares **shapes of growth**, not exact counts.
- Interviewers *will* test this: "my loop runs n/2 times, so O(n/2)?" — no. It's O(n).
- Keep the dominant term, drop its constant: \`4n² + 100n\` → O(n²).`,
    },
    {
      type: 'math',
      intro: 'The formal version — read once, then never worry again.',
      latex: [
        'f(n) = O(g(n)) \\iff \\exists\\, c > 0,\\ n_0 : \\; f(n) \\le c \\cdot g(n) \\;\\; \\forall n \\ge n_0',
        '3n^2 + 5n = O(n^2) \\quad \\text{take } c = 4,\\ n_0 = 5',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Read complexity straight off the code',
      code: `def pairs(a):            # n = len(a)
    total = 0
    for x in a:          # runs n times
        for y in a:      # n times PER outer step
            total += x * y
    return total         # O(n * n) = O(n^2)

def halves(n):
    steps = 0
    while n > 1:         # 1000 -> 500 -> 250 -> ...
        n //= 2
        steps += 1
    return steps         # O(log n): only ~10 steps for n=1000`,
      annotations: {
        4: 'Nested loop over the same input = multiply the counts. n × n = n².',
        10: 'Anything that halves the problem each iteration is O(log n). Memorize this shape.',
        13: 'log₂(1000) ≈ 10. log₂(1,000,000) ≈ 20. Doubling n adds ONE step.',
      },
    },
    {
      type: 'intuition',
      title: 'Binary search: the phone book move',
      md: `Find "Mehta" in a 1000-page phone book. You don't read page 1.

- Open the **middle**. "Kumar" — too early. The entire first half is now garbage.
- One look killed 500 pages.
- Repeat on what's left. 500 → 250 → 125 → … → 1.
- That's binary search: **one comparison, half the problem gone**.
- The only entry fee: the data must be **sorted**. No order → no way to know which half to throw.`,
    },
    {
      type: 'hinglish',
      md: `Binary search sirf sorted array pe nahi — **answer pe bhi** lagta hai. Formula yaad rakho: *"answer guess karo, check karo, range aadha karo."* Jab question bole "minimum speed jisse kaam ho jaye" ya "smallest X that works" — samajh jao ki answer ek number line pe hai, aur woh line sorted hai (chhota X fail, bada X pass). Bas us line pe binary search maar do.`,
    },
    { type: 'visual', component: 'BinarySearchStepper', props: {} },
    {
      type: 'code',
      lang: 'cpp',
      title: 'The interview-grade implementation (C++)',
      code: `int binarySearch(const vector<int>& a, int target) {
    int lo = 0, hi = (int)a.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        if (a[mid] < target)
            lo = mid + 1;      // mid already checked
        else
            hi = mid - 1;
    }
    return -1;                 // lo crossed hi: not present
}`,
      annotations: {
        2: 'Invariant: if target exists, its index is always inside [lo, hi]. Every line protects this.',
        4: 'NOT (lo+hi)/2 — that can overflow int when lo and hi are both huge. Interviewers look for this.',
        7: 'mid+1, not mid — mid is already ruled out. Writing "lo = mid" here causes infinite loops.',
      },
    },
    {
      type: 'intuition',
      title: 'Level up: binary search on the ANSWER',
      md: `Classic: "Koko eats bananas at speed k. Piles must be done in h hours. Find the **minimum** k."

- The answer k lives on a number line: 1, 2, 3, … max pile.
- Small k → too slow → *fail*. Big k → *pass*. So the line looks like: FAIL FAIL FAIL **PASS** PASS PASS.
- A sorted yes/no pattern — a **monotonic predicate**. Binary search the boundary.
- You never search the array. You search the *space of possible answers*.
- This one idea solves: ship capacity, split array largest sum, min days to make bouquets, aggressive cows…`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The reusable template',
      code: `def min_answer(lo, hi, works):
    # smallest x in [lo, hi] with works(x) == True
    while lo < hi:
        mid = (lo + hi) // 2
        if works(mid):
            hi = mid        # mid might BE the answer: keep it
        else:
            lo = mid + 1    # mid failed: answer is right of it
    return lo`,
      annotations: {
        6: 'hi = mid (not mid-1): a passing mid stays in range because it may be the minimum.',
        8: 'The asymmetry (hi=mid vs lo=mid+1) + (lo<hi) is what makes this terminate correctly.',
      },
    },
  ],
  quiz: [
    {
      question: 'A loop runs n/2 times. Its complexity is…',
      options: [
        { text: 'O(n/2)', explanation: 'Big-O drops constants — n/2 is the same growth shape as n.' },
        { text: 'O(n)', explanation: 'Correct. Halving the count changes the constant, not the family.' },
        { text: 'O(log n)', explanation: 'log n means the problem SHRINKS each step. Running half as many times is still linear.' },
        { text: 'O(1)', explanation: 'The work still grows with n — not constant.' },
      ],
      correct: 1,
    },
    {
      question: 'Two separate (not nested) loops over the same array: for x in a: … then for y in a: …',
      options: [
        { text: 'O(n²)', explanation: 'n² needs one loop INSIDE the other. These run one after another.' },
        { text: 'O(2n) — which is O(n)', explanation: 'Correct. Sequential work adds: n + n = 2n → O(n).' },
        { text: 'O(n log n)', explanation: 'No halving, no sorting here — just two linear passes.' },
      ],
      correct: 1,
    },
    {
      question: 'Binary search on 1,048,576 (2²⁰) sorted values needs at most about how many comparisons?',
      options: [
        { text: '20', explanation: 'Correct. Each comparison halves: 2²⁰ → 1 in 20 halvings. This number is worth memorizing.' },
        { text: '1000', explanation: 'Far too many — that would be closer to √n territory.' },
        { text: '524,288', explanation: 'That is n/2 — linear thinking. Binary search is logarithmic.' },
      ],
      correct: 0,
    },
    {
      question: 'Why is `int mid = lo + (hi - lo) / 2` preferred over `(lo + hi) / 2`?',
      options: [
        { text: 'It is faster', explanation: 'Same speed — that is not the reason.' },
        { text: 'lo + hi can overflow the integer type', explanation: 'Correct. With lo, hi near INT_MAX, their sum wraps around. The subtraction form cannot.' },
        { text: 'It rounds differently', explanation: 'Both round the same way for non-negative indices.' },
      ],
      correct: 1,
    },
    {
      question: 'Binary search requires the array to be…',
      options: [
        { text: 'Sorted', explanation: 'Correct — without order, discarding half is impossible: the target could be anywhere.' },
        { text: 'Distinct', explanation: 'Duplicates are fine (they only change which index you land on).' },
        { text: 'Small', explanation: 'The bigger the array, the MORE binary search wins.' },
      ],
      correct: 0,
    },
    {
      question: '"Minimum ship capacity to deliver all packages in D days" — why does binary search apply?',
      options: [
        {
          text: 'Capacities form a sorted FAIL…PASS line (monotonic predicate)',
          explanation: 'Correct. If capacity c works, every capacity above c works. That monotonic boundary is searchable.',
        },
        { text: 'The packages are sorted', explanation: 'The array need not be sorted at all — you search the ANSWER space, not the array.' },
        { text: 'It doesn\'t — you must try every capacity', explanation: 'That is the O(n·range) brute force this pattern exists to kill.' },
      ],
      correct: 0,
    },
    {
      question: 'Your O(2ⁿ) brute force passes n=20 but times out at n=40. Roughly how much MORE work is n=40?',
      options: [
        { text: '2× more', explanation: '2ⁿ doubles with EVERY +1 of n — twenty doublings, not one.' },
        { text: '~1,000,000× more', explanation: 'Correct. 2⁴⁰/2²⁰ = 2²⁰ ≈ a million. Exponential means +1 input, ×2 work.' },
        { text: '4× more', explanation: 'That would be true for O(n²) when n doubles — not for exponential.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Walk me through why binary search is O(log n) — not just the answer, the argument.',
      answer:
        'Each comparison removes half the remaining candidates. Starting from n, after k comparisons, n/2^k candidates remain. The search ends when that hits 1: n/2^k = 1 → k = log₂(n). So worst case ⌈log₂(n)⌉+1 comparisons. The key sentence: **the input halves every step, so steps count the halvings — and that is a logarithm by definition.**',
      isCaseBased: false,
    },
    {
      question: 'What is the difference between O(n + m) and O(n·m), and when does each appear?',
      answer:
        'O(n+m): two independent phases, one after the other — e.g. traverse array A, then array B (merge step of merge sort). O(n·m): for EVERY element of A you do work proportional to B — nested iteration (naive substring search). Rule: sequential work **adds**, nested work **multiplies**.',
      isCaseBased: false,
    },
    {
      question: 'Case: your service must find whether a user ID exists in a list, millions of times per second. The list changes once per day. Design the lookup.',
      answer:
        'The list is effectively static → pay a one-time O(n log n) sort at deploy, then O(log n) binary search per query. Even better: build a hash set — O(n) build, O(1) average lookup. Tradeoffs worth saying out loud: hash set costs extra memory and has no ordering; sorted array + binary search is cache-friendly, supports range queries ("nearest ID"), and has hard O(log n) worst case (hashes can degrade). At millions of QPS, either beats rescanning; mention that the daily rebuild happens off the hot path.',
      isCaseBased: true,
    },
    {
      question: 'When is linear search actually the better choice than binary search?',
      answer:
        'Three honest cases: (1) tiny n — for n < ~50 the simplicity and cache behavior of a linear scan often wins in real time; (2) unsorted data queried once — sorting first costs O(n log n), which a single O(n) scan beats; (3) linked lists — no random access, so "jump to mid" is itself O(n). Binary search pays off when data is sorted AND queried repeatedly.',
      isCaseBased: false,
    },
    {
      question: 'Case: "First Bad Version" — versions 1…n, a bad version exists and everything after it is bad. API isBadVersion(v) is expensive. Minimize calls.',
      answer:
        'The versions form GOOD GOOD … GOOD BAD BAD … BAD — a monotonic predicate. Binary search the boundary: while lo < hi, mid = lo+(hi-lo)/2; if isBadVersion(mid) → hi = mid (mid could be the first bad); else lo = mid+1. Answer lo, with ⌈log₂ n⌉ API calls. Named things to say: monotonic predicate, boundary search, hi=mid vs lo=mid+1 asymmetry, overflow-safe mid.',
      isCaseBased: true,
    },
    {
      question: 'Your loop is: for i in range(n): j = i; while j > 1: j //= 2. Total complexity?',
      answer:
        'Inner while halves j, so it runs O(log i) ≤ O(log n) times. Total: n iterations × O(log n) = **O(n log n)**. Recognizing "loop that halves inside a linear loop = n log n" instantly is the pattern interviewers probe.',
      isCaseBased: false,
    },
    {
      question: 'Why does "lo = mid" (instead of mid+1) cause an infinite loop, and in which situation exactly?',
      answer:
        'When hi = lo+1, mid = lo. If the branch takes lo = mid, nothing changed — same lo, same hi, forever. The fix is built into the invariant: mid has already been examined, so the surviving range must EXCLUDE it on the failing side (lo = mid+1) — or, in boundary-search form, the loop condition and update must guarantee the range strictly shrinks every iteration.',
      isCaseBased: false,
    },
    {
      question: 'Case: sorted array rotated at an unknown pivot ([4,5,6,7,0,1,2]). Can you still search in O(log n)? Sketch the approach.',
      answer:
        'Yes. At every mid, ONE side is still properly sorted (compare a[lo] vs a[mid] to know which). Check if the target lies inside that sorted side\'s range: if yes, recurse there; if no, recurse into the other side. Still one half discarded per step → O(log n). The transferable idea: binary search needs a way to discard half with certainty — full sortedness is just the most common way to get it.',
      isCaseBased: true,
    },
    {
      question: 'Estimate: how many times can you halve 1 billion before hitting 1? Why does this number matter in practice?',
      answer:
        'log₂(10⁹) ≈ 30. So ANY halving algorithm — binary search, balanced BST ops, heap push/pop — costs ~30 steps on a billion items. This is why log-factors are treated as "almost free" in system design: a billion-row index lookup is ~30 page comparisons, not a billion.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Big-O in one sentence', back: 'How the number of operations GROWS as input size n grows — constants and small terms dropped.' },
    { front: 'The 6 growth families, fastest to slowest', back: 'O(1), O(log n), O(n), O(n log n), O(n²), O(2ⁿ)' },
    { front: 'Nested loop over same input vs sequential loops', back: 'Nested multiplies → O(n²). Sequential adds → O(n).' },
    { front: 'log₂(1,000,000) ≈ ?', back: '≈ 20. Binary search on a million items = ~20 comparisons. (1 billion ≈ 30.)' },
    { front: 'Binary search precondition', back: 'Sorted data (or any structure where one comparison certainly discards half).' },
    { front: 'Overflow-safe mid', back: 'mid = lo + (hi − lo) / 2   — because lo + hi can overflow.' },
    { front: 'Binary search invariant', back: 'If the target exists, it is always within [lo, hi]. Every update must preserve this.' },
    { front: 'Binary search on answer — recipe', back: 'Guess an answer, check it, halve the range. Works when check(x) is monotonic: FAIL…FAIL PASS…PASS.' },
    { front: '"lo = mid" bug', back: 'When hi = lo+1, mid = lo → range never shrinks → infinite loop. Use lo = mid+1 (mid already checked).' },
  ],
  mindmapMarkdown: `- Big-O & Binary Search
  - Counting, not timing
    - Operations as function of n
    - 10× input → how much more work?
  - Growth families
    - O(1) hash/index
    - O(log n) halving
    - O(n) one pass
    - O(n log n) sorting
    - O(n²) all pairs
    - O(2ⁿ) all subsets
  - Rules
    - Drop constants: O(2n)=O(n)
    - Keep dominant term
    - Nested × , sequential +
  - Binary search
    - Sorted → discard half per comparison
    - Invariant: target ∈ [lo, hi]
    - mid = lo + (hi−lo)/2 (overflow)
    - lo = mid+1 / hi = mid−1
    - ~20 steps for a million
  - On the answer space
    - Monotonic predicate FAIL…PASS
    - hi = mid keeps passing candidate
    - Koko bananas, ship capacity, first bad version`,
}

export default m
