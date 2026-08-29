import type { Module } from '../types'

const m: Module = {
  id: 'dsa-l3-advanced-topics',
  subjectId: 'dsa',
  level: 3,
  title: 'Hard Patterns: Windows, Binary Search II, Segment Trees & KMP',
  whyItMatters:
    'These are the problems that end onsites: Minimum Window Substring, Sliding Window Maximum, Median of Two Sorted Arrays — all LeetCode Hard, all built from moves you already know plus ONE twist each. This module gives you the six twists: the debt ledger, the monotonic deque, the partition cut, binary search on the answer, log-time range structures, and string matching that never re-reads.',
  estMinutes: 60,
  sections: [
    {
      type: 'note',
      md: 'Snippet convention: to stay short, snippets assume `#include <bits/stdc++.h>` and `using namespace std;`. In production, include precisely and skip the using-directive.',
    },
    {
      type: 'intuition',
      title: 'Minimum Window Substring: run a debt ledger',
      md: `t is a shopping list; s is one long shelf. Walk right grabbing everything; the instant the basket covers the whole list, start returning items from the left end — stop just before the list breaks.

- \`need[c]\`: how many of character c the window still owes. Starts at t's counts; surplus copies drive it negative.
- \`have\`: how many required characters the window currently covers. Window valid ⟺ have == t.length.
- Grow r until valid. Then the shrink condition: shrink WHILE valid — record the window each time, hand back s[l], and watch for the moment need[s[l]] turns positive: coverage just broke.
- Every character enters the window once and leaves at most once: **O(|s| + |t|)** time, O(alphabet) space.
- Trigger phrase: "smallest substring containing…" → this exact ledger.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Minimum Window Substring — need/have ledger',
      code: `string minWindow(const string& s, const string& t) {
    vector<int> need(128, 0);
    for (char c : t) need[c]++;
    int have = 0, want = (int)t.size();  // have: useful chars in window
    int bestLen = INT_MAX, bestStart = 0, l = 0;
    for (int r = 0; r < (int)s.size(); r++) {
        if (need[s[r]] > 0) have++;      // this char was still owed
        need[s[r]]--;                    // negative = surplus copies
        while (have == want) {           // window covers t: shrink it
            if (r - l + 1 < bestLen) { bestLen = r - l + 1; bestStart = l; }
            need[s[l]]++;                // hand the left char back
            if (need[s[l]] > 0) have--;  // it was needed: coverage broke
            l++;
        }
    }
    return bestLen == INT_MAX ? "" : s.substr(bestStart, bestLen);
}`,
      annotations: {
        7: 'need[c] > 0 means the window is still short of c. A surplus copy (need already ≤ 0) does not bump have.',
        9: 'The shrink condition. Every entry into this loop means the window is valid: record it, then try to make it smaller. Shrink WHILE valid, never before.',
        12: 'The exact moment coverage breaks: giving back s[l] pushed its need positive. have drops, the while exits, r resumes growing. On "ADOBECODEBANC" / "ABC" this lands on "BANC".',
      },
      py: {
        code: `from collections import Counter

def minWindow(s: str, t: str) -> str:
    need = Counter(t)                    # char -> copies still owed
    have, want = 0, len(t)               # have: useful chars in window
    best_len, best_start, l = float('inf'), 0, 0
    for r, c in enumerate(s):
        if need[c] > 0:
            have += 1                    # this char was still owed
        need[c] -= 1                     # negative = surplus copies
        while have == want:              # window covers t: shrink it
            if r - l + 1 < best_len:
                best_len, best_start = r - l + 1, l
            need[s[l]] += 1              # hand the left char back
            if need[s[l]] > 0:
                have -= 1                # it was needed: coverage broke
            l += 1
    return "" if best_len == float('inf') else s[best_start:best_start + best_len]`,
        annotations: {
          8: 'Counter returns 0 for a char it has never seen — the same free "zero for missing" the C++ pane buys by pre-sizing a 128-slot array. need[c] > 0 means the window is still short of c; a surplus copy does not bump have.',
          11: 'The shrink condition. Every entry into this loop means the window is valid: record it, then try to make it smaller. Shrink WHILE valid, never before.',
          15: 'The exact moment coverage breaks: giving back s[l] pushed its need positive. have drops, the while exits, r resumes growing. On "ADOBECODEBANC" / "ABC" this lands on "BANC".',
        },
      },
    },
    {
      type: 'intuition',
      title: 'Sliding Window Maximum: the deque of undefeated champions',
      md: `A gym runs a moving 3-day tryout window. The day a stronger athlete walks in, every weaker athlete already inside can never again be "best in window" — the newcomer both outlifts AND outlasts them. Cut them immediately.

- Keep a deque of **indices** whose values run decreasing front → back. New element: pop the back while it is ≤ the newcomer, then push.
- Front = oldest survivor = larger than everything behind it = **the window max**. Read it in O(1).
- The front dies only of old age: pop it when its index slides out of the window.
- Each index is pushed once and popped at most once → ≤ 2n deque ops total: **amortized O(n)**. Naive rescan is O(nk); a multiset gives O(n log k).
- Same "evict the dominated" move as the monotonic stack (next-greater-element family) from the stacks module — here a deque, because windows also expire at the front.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Sliding Window Maximum — monotonic deque',
      code: `vector<int> maxSlidingWindow(const vector<int>& a, int k) {
    deque<int> dq;                    // indices; their values run decreasing
    vector<int> out;
    for (int i = 0; i < (int)a.size(); i++) {
        if (!dq.empty() && dq.front() <= i - k)
            dq.pop_front();           // front aged out of the window
        while (!dq.empty() && a[dq.back()] <= a[i])
            dq.pop_back();            // a[i] dominates weaker elders: evict
        dq.push_back(i);
        if (i >= k - 1) out.push_back(a[dq.front()]);
    }
    return out;   // a = 1 3 -1 -3 5 3 6 7, k = 3  ->  3 3 5 5 6 7
}`,
      annotations: {
        2: 'Indices, not values: only an index can tell you when the front has aged out of the window. Values alone cannot.',
        8: 'An older element that is ≤ the newcomer can never again be any future window\'s max — the newcomer beats it and stays longer. Evicting it is safe forever.',
        10: 'The invariant pays out: front is the oldest surviving index of the largest value. One O(1) read per window.',
        12: 'Desk-checked: windows [1,3,-1] [3,-1,-3] [-1,-3,5] [-3,5,3] [5,3,6] [3,6,7] → 3 3 5 5 6 7.',
      },
      py: {
        code: `from collections import deque

def maxSlidingWindow(a: list[int], k: int) -> list[int]:
    dq = deque()                      # indices; their values run decreasing
    out = []
    for i, x in enumerate(a):
        if dq and dq[0] <= i - k:
            dq.popleft()              # front aged out of the window
        while dq and a[dq[-1]] <= x:
            dq.pop()                  # x dominates weaker elders: evict
        dq.append(i)
        if i >= k - 1:
            out.append(a[dq[0]])
    return out   # a = 1 3 -1 -3 5 3 6 7, k = 3  ->  3 3 5 5 6 7`,
        annotations: {
          4: 'Indices, not values: only an index can tell you when the front has aged out. And it must be a real deque — popleft() is O(1), while list.pop(0) is O(n) and would sink the whole O(n) argument.',
          9: 'An older element that is ≤ the newcomer can never again be any future window\'s max — the newcomer beats it and stays longer. Evicting it is safe forever.',
          13: 'The invariant pays out: dq[0] is the oldest surviving index of the largest value. One O(1) read per window.',
          14: 'Desk-checked: windows [1,3,-1] [3,-1,-3] [-1,-3,5] [-3,5,3] [5,3,6] [3,6,7] → 3 3 5 5 6 7.',
        },
      },
    },
    {
      type: 'intuition',
      title: 'Median of Two Sorted Arrays: cut, don\'t merge',
      md: `Merging both arrays is O(m+n) — correct, and exactly what the interviewer is testing you to beat. The insight: a median is a **cut**, not a sort.

- Cut A after i elements and B after j elements with i + j = (m+n+1)/2 — the two left halves together hold exactly half the elements.
- The cut is valid when the halves don't cross: A[i−1] ≤ B[j] **and** B[j−1] ≤ A[i]. Two comparisons check everything.
- If A[i−1] > B[j], A gave too much → move i left. If B[j−1] > A[i], too little → move i right. Monotonic → **binary search on i**.
- Search only the smaller array (j follows automatically): **O(log min(m, n))**.
- Valid cut found: odd total → median = max of the left halves. Even → average of max(left) and min(right).`,
    },
    {
      type: 'note',
      md: 'Worked cut: A = [1, 3, 8], B = [2, 4, 6, 9]. Seven elements → left side holds 4. Try i = 1: left = {1} ∪ {2, 4, 6}; check B[j−1] ≤ A[i]: 6 ≤ 3 fails — B over-contributed, grow i. Try i = 2: left = {1, 3} ∪ {2, 4}; checks 3 ≤ 6 ✓ and 4 ≤ 8 ✓ — valid. Median = max(3, 4) = **4**. Confirm against the merge 1 2 3 4 6 8 9: middle element is 4. Edge guard in real code: an empty side compares as ∓∞ (INT_MIN / INT_MAX).',
    },
    {
      type: 'intuition',
      title: 'Split Array Largest Sum: the pilot\'s template returns',
      md: `"Split the array into k parts, minimizing the largest part-sum." Smells like DP. It is secretly the L0 binary-search-on-answer template.

- Flip the question into a predicate: "can we split with every part-sum ≤ cap?" — one greedy pass: stuff each part until it would overflow, then open a new part.
- The predicate is monotonic: a cap that works still works when raised. FAIL…FAIL PASS…PASS — binary search the boundary.
- Range: lo = max element (some part must hold it), hi = total sum (one part holds everything).
- **O(n log(sum))** — versus O(n²k) DP. Same skeleton solves ship capacity, Koko's bananas, aggressive cows.
- Trigger phrase: "minimize the maximum" (or "maximize the minimum") → binary search on the answer.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Split Array Largest Sum — binary search on the answer',
      code: `bool canSplit(const vector<int>& a, int k, long long cap) {
    long long cur = 0;
    int parts = 1;
    for (int x : a)
        if (cur + x > cap) { parts++; cur = x; }   // open a new part
        else cur += x;
    return parts <= k;             // greedy uses the fewest parts possible
}

int splitArray(const vector<int>& a, int k) {
    long long lo = *max_element(a.begin(), a.end());
    long long hi = accumulate(a.begin(), a.end(), 0LL);
    while (lo < hi) {              // the L0 template, verbatim
        long long mid = lo + (hi - lo) / 2;
        if (canSplit(a, k, mid)) hi = mid;   // works: might be the answer
        else lo = mid + 1;                   // too tight: push lo up
    }
    return (int)lo;                // [7,2,5,10,8], k=2 -> 18 (7+2+5 | 10+8)
}`,
      annotations: {
        5: 'Greedy is optimal for the CHECK: extending the current part never hurts, so this pass finds the minimum number of parts for this cap.',
        7: 'Monotonic predicate: raise cap and parts can only shrink or stay. That FAIL…PASS shape is the license to binary search.',
        11: 'lo = max(a) is load-bearing, not an optimization: below it, an oversized element fits in no part and the simple greedy miscounts.',
        18: 'Desk-checked: cap 18 → parts {7,2,5} and {10,8} = 2 ✓; cap 17 forces 3 parts. Answer 18.',
      },
      py: {
        code: `def canSplit(a: list[int], k: int, cap: int) -> bool:
    cur, parts = 0, 1
    for x in a:
        if cur + x > cap:
            parts += 1
            cur = x                    # open a new part
        else:
            cur += x
    return parts <= k                  # greedy uses the fewest parts possible

def splitArray(a: list[int], k: int) -> int:
    lo, hi = max(a), sum(a)
    while lo < hi:                     # the L0 template, verbatim
        mid = (lo + hi) // 2
        if canSplit(a, k, mid):
            hi = mid                   # works: might be the answer
        else:
            lo = mid + 1               # too tight: push lo up
    return lo                          # [7,2,5,10,8], k=2 -> 18 (7+2+5 | 10+8)`,
        annotations: {
          4: 'Greedy is optimal for the CHECK: extending the current part never hurts, so this pass finds the minimum number of parts for this cap.',
          9: 'Monotonic predicate: raise cap and parts can only shrink or stay. That FAIL…PASS shape is the license to binary search.',
          12: 'max(a) and sum(a): one builtin each, no iterators and no 0LL accumulator. lo = max(a) is load-bearing, not an optimization — below it, an oversized element fits in no part and the greedy check miscounts.',
          19: 'Desk-checked: cap 18 → parts {7,2,5} and {10,8} = 2 ✓; cap 17 forces 3 parts. Answer 18.',
        },
      },
    },
    {
      type: 'intuition',
      title: 'When prefix sums stop being enough',
      md: `Prefix sums answer range-sum in O(1) — until the array changes. One point update invalidates every later prefix: **O(n) per write**. Heavy reads AND writes need a different deal.

- A **segment tree** is a tournament bracket over the array: each node caches an answer (sum, min, max…) for its segment; the root covers everything.
- Point update: only the changed leaf's ancestors go stale — walk up, **O(log n)**.
- Range query: stitch the answer from the few nodes whose segments exactly tile [l, r] — **O(log n)**.
- That balance is the whole product. Prefix sums: O(1) read / O(n) write. Segment tree: O(log n) / O(log n).
- Array-backed: node x's children are 2x and 2x+1. No pointers, ~4n slots.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Segment tree — build, range query, point update',
      code: `struct SegTree {
    int n;
    vector<long long> t;                     // t[1] is the root; ~4n slots
    SegTree(const vector<int>& a) : n((int)a.size()), t(4 * a.size()) {
        build(a, 1, 0, n - 1);
    }
    void build(const vector<int>& a, int node, int lo, int hi) {
        if (lo == hi) { t[node] = a[lo]; return; }        // leaf
        int mid = (lo + hi) / 2;
        build(a, 2 * node, lo, mid);
        build(a, 2 * node + 1, mid + 1, hi);
        t[node] = t[2 * node] + t[2 * node + 1];          // sum of my range
    }
    long long query(int node, int lo, int hi, int l, int r) {
        if (r < lo || hi < l) return 0;         // disjoint: contribute nothing
        if (l <= lo && hi <= r) return t[node]; // fully inside: cached answer
        int mid = (lo + hi) / 2;
        return query(2 * node, lo, mid, l, r)
             + query(2 * node + 1, mid + 1, hi, l, r);
    }
    void update(int node, int lo, int hi, int pos, int val) {
        if (lo == hi) { t[node] = val; return; }
        int mid = (lo + hi) / 2;
        if (pos <= mid) update(2 * node, lo, mid, pos, val);
        else update(2 * node + 1, mid + 1, hi, pos, val);
        t[node] = t[2 * node] + t[2 * node + 1];          // repair going up
    }
};  // usage: st.query(1, 0, n-1, l, r)   st.update(1, 0, n-1, i, v)`,
      annotations: {
        3: 'Heap layout: node x owns children 2x and 2x+1. 4n slots safely covers any n, even when the last level is lopsided.',
        8: 'Build touches every node once: O(n) total — the one-time cost that buys log-time everything after.',
        15: 'The query trichotomy: disjoint → identity (0 for sum), fully covered → cached value, partial → split. At most ~4 nodes per level stay partial → O(log n).',
        26: 'Only the O(log n) ancestors of the changed leaf are touched. This line is exactly what prefix sums cannot afford.',
      },
      py: {
        code: `class SegTree:
    def __init__(self, a: list[int]):
        self.n = len(a)
        self.t = [0] * (4 * self.n)          # t[1] is the root; ~4n slots
        self.build(a, 1, 0, self.n - 1)

    def build(self, a, node, lo, hi):
        if lo == hi:
            self.t[node] = a[lo]             # leaf
            return
        mid = (lo + hi) // 2
        self.build(a, 2 * node, lo, mid)
        self.build(a, 2 * node + 1, mid + 1, hi)
        self.t[node] = self.t[2 * node] + self.t[2 * node + 1]

    def query(self, node, lo, hi, l, r):
        if r < lo or hi < l:
            return 0                         # disjoint: contribute nothing
        if l <= lo and hi <= r:
            return self.t[node]              # fully inside: cached answer
        mid = (lo + hi) // 2
        return (self.query(2 * node, lo, mid, l, r)
                + self.query(2 * node + 1, mid + 1, hi, l, r))

    def update(self, node, lo, hi, pos, val):
        if lo == hi:
            self.t[node] = val
            return
        mid = (lo + hi) // 2
        if pos <= mid:
            self.update(2 * node, lo, mid, pos, val)
        else:
            self.update(2 * node + 1, mid + 1, hi, pos, val)
        self.t[node] = self.t[2 * node] + self.t[2 * node + 1]  # repair upward

# usage: st.query(1, 0, n-1, l, r)   st.update(1, 0, n-1, i, v)`,
        annotations: {
          4: 'Heap layout: node x owns children 2x and 2x+1. 4n slots safely covers any n, even when the last level is lopsided. Be honest about the cost in Python: every node is an interpreted call, so this is ~50x slower than the C++ pane — for pure prefix sums, reach for the BIT below.',
          7: 'Build touches every node once: O(n) total — the one-time cost that buys log-time everything after. Depth is O(log n), so the 1000-frame recursion limit is never a threat here.',
          17: 'The query trichotomy: disjoint → identity (0 for sum), fully covered → cached value, partial → split. At most ~4 nodes per level stay partial → O(log n).',
          34: 'Only the O(log n) ancestors of the changed leaf are touched. This line is exactly what prefix sums cannot afford.',
        },
      },
    },
    {
      type: 'intuition',
      title: 'Fenwick tree (BIT): prefix sums that survive updates',
      md: `A Fenwick tree does the point-update + prefix-query job in a quarter of the code — powered by one bit trick.

- **lowbit**: \`i & -i\` isolates the lowest set bit of i (two's complement flips everything above it). 12 = 1100₂ → lowbit 4.
- \`t[i]\` stores the sum of the lowbit(i) elements ending at position i — block sizes dictated by i's own binary form.
- Prefix query: strip lowbits. 13 → 12 → 8 → 0 reads three blocks that exactly tile a[1..13]. Hops = set bits = **O(log n)**.
- Point update: add lowbits — climb through every block that contains position i. Also **O(log n)**.
- ~15 lines and half the memory of a segment tree.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Fenwick / Binary Indexed Tree in 15 lines',
      code: `struct BIT {
    int n;
    vector<long long> t;              // 1-based; t[i] covers lowbit(i) slots
    BIT(int n) : n(n), t(n + 1, 0) {}
    void add(int i, long long d) {    // a[i] += d   (i is 0-based outside)
        for (i++; i <= n; i += i & -i)
            t[i] += d;                // climb: every block containing i
    }
    long long prefix(int i) {         // sum of a[0..i]
        long long s = 0;
        for (i++; i > 0; i -= i & -i)
            s += t[i];                // strip: blocks tiling the prefix
        return s;
    }
    long long rangeSum(int l, int r) {
        return prefix(r) - (l ? prefix(l - 1) : 0);
    }
};`,
      annotations: {
        3: 't[12] (1100₂, lowbit 4) covers a[9..12] in 1-based terms. Every index owns a power-of-two block ending at itself.',
        6: 'add climbs: 5 → 6 → 8 → 16… each +lowbit jump lands on the next larger block that contains position i.',
        11: 'prefix(12) internally reads t[13] + t[12] + t[8]: 13 = 1101₂ has three set bits → three hops. Set-bit count bounds the loop at O(log n).',
      },
      py: {
        code: `class BIT:
    def __init__(self, n: int):
        self.n = n
        self.t = [0] * (n + 1)        # 1-based; t[i] covers lowbit(i) slots

    def add(self, i: int, d: int) -> None:   # a[i] += d   (i is 0-based outside)
        i += 1
        while i <= self.n:
            self.t[i] += d            # climb: every block containing i
            i += i & -i

    def prefix(self, i: int) -> int:  # sum of a[0..i]
        s = 0
        i += 1
        while i > 0:
            s += self.t[i]            # strip: blocks tiling the prefix
            i -= i & -i
        return s

    def rangeSum(self, l: int, r: int) -> int:
        return self.prefix(r) - (self.prefix(l - 1) if l else 0)`,
        annotations: {
          4: 't[12] (1100₂, lowbit 4) covers a[9..12] in 1-based terms. Every index owns a power-of-two block ending at itself.',
          10: 'add climbs: 5 → 6 → 8 → 16… each +lowbit jump lands on the next larger block that contains position i. i & -i works exactly as in C++ — this is where Python\'s two\'s complement semantics quietly pay off.',
          17: 'prefix(12) internally reads t[13] + t[12] + t[8]: 13 = 1101₂ has three set bits → three hops. Set-bit count bounds the loop at O(log n).',
        },
      },
    },
    {
      type: 'note',
      md: 'BIT vs segment tree: reach for the **BIT** when the operation is invertible and prefix-decomposable — sum, count, XOR — and you need point update + range query. Shorter to write under pressure, smaller constants. Reach for the **segment tree** when you need min/max/gcd (no subtraction trick exists), or range updates via lazy propagation (beyond this module). One-liner: *BIT is the compact special case; the segment tree is the general machine.*',
    },
    {
      type: 'intuition',
      title: 'KMP: the pattern already knows itself',
      md: `The naive matcher has amnesia. It matches 7 characters, fails on the 8th, then re-reads those 7 from scratch one position over — O(n·m).

- KMP's insight: the matched characters ARE the pattern's own prefix. The pattern can interrogate itself, in advance, about every possible failure point.
- The tool: **fail[i] = length of the longest proper prefix of p[0..i] that is also its suffix** ("proper" = not the whole string).
- On a mismatch after j matches, slide the pattern so its fail[j−1]-length prefix lines up with what already matched — and continue. The text pointer **never moves backward**.
- Text read once + table built once: **O(n + m)**.
- The table itself is built with two pointers over the pattern — the diagram below runs it on "ababaca".`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'KMP failure-function build on "ababaca"',
        notice: 'len is both the length of the current prefix-suffix match AND the index of the next prefix char to compare.',
        leftLabel: 'pointers',
        rightLabel: 'pattern p = "ababaca"',
        frames: [
          {
            note: 'Goal: fail[i] = length of the longest proper prefix of p[0..i] that is also its suffix. fail[0] = 0 by definition. i scans the pattern; len tracks the running prefix match.',
            stack: [
              { name: 'i', value: '1', to: 'c1' },
              { name: 'len', value: '0', to: 'c0' },
            ],
            heap: [
              { id: 'c0', value: 'a', label: 'fail 0' },
              { id: 'c1', value: 'b', label: 'fail ?' },
              { id: 'c2', value: 'a', label: 'fail ?' },
              { id: 'c3', value: 'b', label: 'fail ?' },
              { id: 'c4', value: 'a', label: 'fail ?' },
              { id: 'c5', value: 'c', label: 'fail ?' },
              { id: 'c6', value: 'a', label: 'fail ?' },
            ],
          },
          {
            note: 'i=1: p[1]=b vs p[0]=a — mismatch with len already 0 → fail[1]=0. i=2: p[2]=a matches p[0]=a → len=1, fail[2]=1. The 1-char prefix "a" is also a suffix of "aba".',
            stack: [
              { name: 'i', value: '3', to: 'c3' },
              { name: 'len', value: '1', to: 'c1' },
            ],
            heap: [
              { id: 'c0', value: 'a', label: 'fail 0' },
              { id: 'c1', value: 'b', label: 'fail 0' },
              { id: 'c2', value: 'a', label: 'fail 1' },
              { id: 'c3', value: 'b', label: 'fail ?' },
              { id: 'c4', value: 'a', label: 'fail ?' },
              { id: 'c5', value: 'c', label: 'fail ?' },
              { id: 'c6', value: 'a', label: 'fail ?' },
            ],
          },
          {
            note: 'Matches keep coming: p[3]=b matches p[1] → fail[3]=2; p[4]=a matches p[2] → fail[4]=3. Now the prefix "aba" equals the suffix "aba" of "ababa" — and no character was read twice.',
            stack: [
              { name: 'i', value: '5', to: 'c5' },
              { name: 'len', value: '3', to: 'c3' },
            ],
            heap: [
              { id: 'c0', value: 'a', label: 'fail 0' },
              { id: 'c1', value: 'b', label: 'fail 0' },
              { id: 'c2', value: 'a', label: 'fail 1' },
              { id: 'c3', value: 'b', label: 'fail 2' },
              { id: 'c4', value: 'a', label: 'fail 3' },
              { id: 'c5', value: 'c', label: 'fail ?' },
              { id: 'c6', value: 'a', label: 'fail ?' },
            ],
          },
          {
            note: 'i=5: p[5]=c vs p[3]=b — MISMATCH with len=3. Do NOT restart at 0. Fall back: len = fail[len−1] = fail[2] = 1. The 3-char prefix failed, but its own table entry says a 1-char prefix "a" still matches the suffix — reuse it.',
            stack: [
              { name: 'i', value: '5', to: 'c5' },
              { name: 'len', value: '1', to: 'c1', danger: true },
            ],
            heap: [
              { id: 'c0', value: 'a', label: 'fail 0' },
              { id: 'c1', value: 'b', label: 'fail 0' },
              { id: 'c2', value: 'a', label: 'fail 1' },
              { id: 'c3', value: 'b', label: 'fail 2' },
              { id: 'c4', value: 'a', label: 'fail 3' },
              { id: 'c5', value: 'c', label: 'fail ?' },
              { id: 'c6', value: 'a', label: 'fail ?' },
            ],
          },
          {
            note: 'Still mismatched: p[5]=c vs p[1]=b → fall back again: len = fail[0] = 0. Then p[5]=c vs p[0]=a mismatches at len=0 → fail[5]=0, i moves on. Two fallbacks, zero rescans of older text.',
            stack: [
              { name: 'i', value: '6', to: 'c6' },
              { name: 'len', value: '0', to: 'c0' },
            ],
            heap: [
              { id: 'c0', value: 'a', label: 'fail 0' },
              { id: 'c1', value: 'b', label: 'fail 0' },
              { id: 'c2', value: 'a', label: 'fail 1' },
              { id: 'c3', value: 'b', label: 'fail 2' },
              { id: 'c4', value: 'a', label: 'fail 3' },
              { id: 'c5', value: 'c', label: 'fail 0' },
              { id: 'c6', value: 'a', label: 'fail ?' },
            ],
          },
          {
            note: 'i=6: p[6]=a matches p[0] → len=1, fail[6]=1. Done: fail = [0,0,1,2,3,0,1]. During search, every mismatch consults this table to realign the pattern — the text pointer never backs up.',
            stack: [
              { name: 'i', value: '7 (done)' },
              { name: 'len', value: '1', to: 'c1' },
            ],
            heap: [
              { id: 'c0', value: 'a', label: 'fail 0' },
              { id: 'c1', value: 'b', label: 'fail 0' },
              { id: 'c2', value: 'a', label: 'fail 1' },
              { id: 'c3', value: 'b', label: 'fail 2' },
              { id: 'c4', value: 'a', label: 'fail 3' },
              { id: 'c5', value: 'c', label: 'fail 0' },
              { id: 'c6', value: 'a', label: 'fail 1' },
            ],
          },
        ],
      },
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'KMP — failure table + search',
      code: `vector<int> failTable(const string& p) {
    int m = (int)p.size();
    vector<int> fail(m, 0);            // fail[i]: longest proper prefix of
    int len = 0;                       //   p[0..i] that is also its suffix
    for (int i = 1; i < m; ) {
        if (p[i] == p[len]) fail[i++] = ++len;
        else if (len > 0) len = fail[len - 1];   // fall back, never restart
        else fail[i++] = 0;
    }
    return fail;                       // "ababaca" -> 0 0 1 2 3 0 1
}

vector<int> kmpSearch(const string& text, const string& p) {
    vector<int> fail = failTable(p);
    vector<int> hits;
    int j = 0;                                   // chars of p matched so far
    for (int i = 0; i < (int)text.size(); i++) {
        while (j > 0 && text[i] != p[j])
            j = fail[j - 1];                     // slide the needle, keep i
        if (text[i] == p[j]) j++;
        if (j == (int)p.size()) {                // full match ends at i
            hits.push_back(i - j + 1);
            j = fail[j - 1];                     // allow overlapping matches
        }
    }
    return hits;                       // "aba" in "ababa" -> 0 2
}`,
      annotations: {
        6: 'Match: both pointers advance. Note i only ever moves forward — in both functions.',
        7: 'The subtle line: the failed prefix of length len has its own fail entry — jump to the next-shorter prefix that could still work. i does NOT move.',
        19: 'On mismatch after j matches, only the pattern realigns; the text is read exactly once. j falls at most as much as it ever rose → total work O(n + m).',
        23: 'Do not reset j to 0 after a hit — fail[j−1] preserves overlaps: "aba" occurs at 0 AND 2 in "ababa".',
      },
      py: {
        code: `def failTable(p: str) -> list[int]:
    m = len(p)
    fail = [0] * m                     # fail[i]: longest proper prefix of
    length = 0                         #   p[0..i] that is also its suffix
    i = 1
    while i < m:
        if p[i] == p[length]:
            length += 1
            fail[i] = length
            i += 1
        elif length > 0:
            length = fail[length - 1]  # fall back, never restart
        else:
            fail[i] = 0
            i += 1
    return fail                        # "ababaca" -> 0 0 1 2 3 0 1

def kmpSearch(text: str, p: str) -> list[int]:
    fail = failTable(p)
    hits = []
    j = 0                                    # chars of p matched so far
    for i, c in enumerate(text):
        while j > 0 and c != p[j]:
            j = fail[j - 1]                  # slide the needle, keep i
        if c == p[j]:
            j += 1
        if j == len(p):                      # full match ends at i
            hits.append(i - j + 1)
            j = fail[j - 1]                  # allow overlapping matches
    return hits                        # "aba" in "ababa" -> 0 2`,
        annotations: {
          8: 'C++ compresses this branch into fail[i++] = ++len. With no ++ and no assignment-in-expression, Python spells it out in three lines — clearer, and the same thing. Note i only ever moves forward, in both functions.',
          12: 'The subtle line: the failed prefix of length "length" has its own fail entry — jump to the next-shorter prefix that could still work. i does NOT move. (len is a builtin, so the variable is named length.)',
          23: 'On mismatch after j matches, only the pattern realigns; the text is read exactly once. j falls at most as much as it ever rose → total work O(n + m).',
          29: 'Do not reset j to 0 after a hit — fail[j−1] preserves overlaps: "aba" occurs at 0 AND 2 in "ababa".',
        },
      },
    },
    {
      type: 'intuition',
      title: 'Rabin-Karp: fingerprints, not faces',
      md: `Comparing strings character by character is checking faces. Rabin-Karp checks fingerprints: hash the pattern once, hash each text window, compare numbers.

- The **rolling hash** makes each slide O(1): treat the window as an m-digit number in base B — drop the left digit, shift, add the right digit, all mod a large prime.
- Hashes equal ≠ strings equal (pigeonhole). On a hash hit, **verify with a real comparison** — skipping this is THE Rabin-Karp bug.
- Expected O(n + m); adversarial collisions can force O(n·m). Randomizing B and the modulus makes engineering that practically impossible.
- Where it beats KMP: **many patterns of one length** — hash all 500 into a set, scan the text once. KMP would need 500 passes.
- Mixed pattern lengths at scale → name-drop Aho-Corasick, the multi-pattern automaton.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Rabin-Karp — rolling hash with verification',
      code: `vector<int> rabinKarp(const string& text, const string& p) {
    const long long B = 131, MOD = 1000000007LL;
    int n = (int)text.size(), m = (int)p.size();
    vector<int> hits;
    if (m > n) return hits;
    long long ph = 0, th = 0, pw = 1;            // pw = B^(m-1) mod MOD
    for (int i = 0; i < m; i++) {
        ph = (ph * B + p[i]) % MOD;
        th = (th * B + text[i]) % MOD;
        if (i) pw = pw * B % MOD;
    }
    for (int i = 0; i + m <= n; i++) {
        if (th == ph && text.compare(i, m, p) == 0)
            hits.push_back(i);                   // verified, not just hashed
        if (i + m < n) {
            th = (th - text[i] * pw % MOD + MOD) % MOD;  // drop left digit
            th = (th * B + text[i + m]) % MOD;           // pull right digit
        }
    }
    return hits;
}`,
      annotations: {
        13: 'th == ph proves nothing on its own — different strings can share a hash. The compare() is mandatory; true hits plus rare collisions keep expected cost O(n + m).',
        16: 'The + MOD before the final % keeps the subtraction non-negative. Forgetting it yields negative hashes that never match anything.',
        17: 'The rolling slide: O(1) per window instead of O(m) rehashing. This line is the entire speedup.',
      },
      py: {
        code: `def rabinKarp(text: str, p: str) -> list[int]:
    B, MOD = 131, 1_000_000_007
    n, m = len(text), len(p)
    hits = []
    if m > n:
        return hits
    ph = th = 0
    pw = pow(B, m - 1, MOD)                     # B^(m-1) mod MOD, in O(log m)
    for i in range(m):
        ph = (ph * B + ord(p[i])) % MOD
        th = (th * B + ord(text[i])) % MOD
    for i in range(n - m + 1):
        if th == ph and text[i:i + m] == p:
            hits.append(i)                      # verified, not just hashed
        if i + m < n:
            th = (th - ord(text[i]) * pw) % MOD     # drop left digit
            th = (th * B + ord(text[i + m])) % MOD  # pull right digit
    return hits`,
        annotations: {
          8: 'Three-argument pow IS modular exponentiation, built in: pow(base, exp, mod) in O(log exp). The C++ pane has to fold it into the setup loop.',
          13: 'th == ph proves nothing on its own — different strings can share a hash. The slice compare is mandatory; true hits plus rare collisions keep expected cost O(n + m).',
          16: 'No "+ MOD" correction needed: Python\'s % always returns a value with the sign of the modulus, so a negative intermediate comes back non-negative on its own. The classic C++ bug here simply cannot occur.',
          17: 'The rolling slide: O(1) per window instead of O(m) rehashing. This line is the entire speedup.',
        },
      },
    },
  ],
  quiz: [
    {
      question: 'Minimum Window Substring: the window currently covers all of t. What is the next move?',
      options: [
        { text: 'Keep extending r — a longer window might score better', explanation: 'Extending a valid window only makes it longer. The best window ending here needs the tightest left edge first.' },
        { text: 'Record the window, then shrink from the left while it stays valid', explanation: 'Correct. Shrink WHILE valid: each shrink step is a new candidate answer, until giving back one more char breaks coverage.' },
        { text: 'Reset l = r and start a fresh window', explanation: 'That throws away coverage you paid for — the counters would have to rebuild from nothing.' },
        { text: 'Stop — the first valid window is the answer', explanation: 'The smallest window can appear anywhere. "ADOBEC" is valid first, but "BANC" comes later.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is the front of the monotonic deque always the current window\'s maximum?',
      options: [
        { text: 'The deque is re-sorted on every step', explanation: 'Sorting per step would cost O(k log k) per window — the invariant is maintained incrementally, never by sorting.' },
        { text: 'Everything behind the front is smaller (dominated elders were evicted on arrival), and expired fronts are popped by age', explanation: 'Correct. The decreasing invariant plus age-based eviction leaves the front as the largest value still inside the window.' },
        { text: 'Only maximums are ever pushed', explanation: 'Every index gets pushed. Domination is enforced by popping the back, not by refusing entry.' },
      ],
      correct: 1,
    },
    {
      question: 'Total deque operations for Sliding Window Maximum over an array of n elements?',
      options: [
        { text: 'O(nk) — each window is rescanned', explanation: 'That is the naive approach the deque exists to kill.' },
        { text: 'O(n log k) — heap-style costs', explanation: 'That is the multiset/heap alternative. The deque does better.' },
        { text: 'O(n) — each index is pushed once and popped at most once', explanation: 'Correct. ≤ 2n deque operations across the whole run: amortized O(1) per element.' },
      ],
      correct: 2,
    },
    {
      question: 'In the partition solution to Median of Two Sorted Arrays, what exactly is binary-searched?',
      options: [
        { text: 'The cut position i in the smaller array', explanation: 'Correct. j = (m+n+1)/2 − i follows automatically — one degree of freedom, searched in O(log min(m,n)).' },
        { text: 'The median\'s index in the merged array', explanation: 'Building the merged array is O(m+n) — the exact cost this algorithm exists to beat.' },
        { text: 'Both cut positions independently', explanation: 'i + j is fixed, so there is only ONE free variable. Searching both would be redundant work.' },
      ],
      correct: 0,
    },
    {
      question: 'Split Array Largest Sum: why must the binary-search range start at lo = max(a)?',
      options: [
        { text: 'The answer can never be below the largest element — it has to land in some part', explanation: 'Correct. And it is load-bearing: below max(a), the simple greedy check miscounts, because an oversized element fits in no part.' },
        { text: 'Any lo works; max(a) just saves iterations', explanation: 'Not just speed. With cap < max(a) the greedy silently places an element that exceeds cap, so canSplit can return a wrong true.' },
        { text: 'Starting at 0 would overflow long long', explanation: 'No overflow issue — the bound is about predicate correctness, not arithmetic.' },
      ],
      correct: 0,
    },
    {
      question: 'You face q range-sum queries interleaved with u point updates on an array of size n. Prefix sums or segment tree?',
      options: [
        { text: 'Segment tree: O((u + q) log n) total; prefix sums pay O(n) per update to rebuild', explanation: 'Correct. Prefix sums total O(u·n + q) — the updates kill them. Log-time on both sides is the segment tree\'s whole pitch.' },
        { text: 'Prefix sums — queries are O(1), which always wins', explanation: 'O(1) reads only pay off when writes are rare or absent. Each update invalidates every later prefix entry.' },
        { text: 'They cost the same asymptotically', explanation: 'O(u·n + q) vs O((u+q) log n) — at u = q = n that is O(n²) vs O(n log n).' },
      ],
      correct: 0,
    },
    {
      question: 'What does i & -i compute, and how does a BIT update use it?',
      options: [
        { text: 'The lowest set bit; update climbs with i += i & -i through every block covering position i', explanation: 'Correct. Two\'s complement negation flips all bits above the lowest set bit, so AND isolates it. 12 & -12 = 4.' },
        { text: 'The highest set bit', explanation: 'Negation preserves the LOWEST set bit and flips everything above it — the AND keeps only the bottom one.' },
        { text: 'The number of set bits in i', explanation: 'That is popcount. It bounds the LOOP LENGTH of a prefix query, but it is not what i & -i returns.' },
      ],
      correct: 0,
    },
    {
      question: 'Rabin-Karp: a window\'s hash equals the pattern\'s hash. You should…',
      options: [
        { text: 'Report a match immediately — equal hashes mean equal strings', explanation: 'Pigeonhole: far more strings than hash values, so spurious hits exist. Reporting unverified hits is the classic Rabin-Karp bug.' },
        { text: 'Compare the actual characters and report only if they match', explanation: 'Correct. Verification keeps the algorithm correct; since true matches plus collisions are rare, expected time stays O(n + m).' },
        { text: 'Recompute the hash with the same function to double-check', explanation: 'Same function, same inputs, same collision. Only a real character comparison settles it.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Walk me through Minimum Window Substring — the counters, the loop shape, and the complexity.',
      answer:
        'Two counters: need[c] = how many of c the window still owes (initialized to t\'s counts, surplus goes negative), and have = how many required characters the window covers. Expand r: if need[s[r]] > 0 before decrementing, have++. When have == |t| the window is valid: record it, then shrink l WHILE valid — increment need[s[l]] on the way out, and the moment it turns positive, have drops and expansion resumes. Every character enters the window once and leaves at most once → O(|s| + |t|) time, O(alphabet) space. The invariant to say out loud: the window between l and r always reflects the ledger exactly.',
      isCaseBased: false,
    },
    {
      question: 'Case: your Sliding Window Maximum recomputes max(window) on every slide and TLEs at n = 1e5, k = 5e4. The interviewer asks you to fix it and prove the new complexity.',
      answer:
        'The rescan is O(nk) ≈ 5·10⁹ — dead. Replace it with a monotonic deque of indices whose values run decreasing front to back: on arrival, pop the back while its value ≤ the newcomer (an older, smaller element can never again be a window max while the newcomer is alive), push the index, pop the front when it ages out; the front is the answer per window. Proof of O(n): each index is pushed exactly once and popped at most once — from either end — so total deque operations ≤ 2n, amortized O(1) per element. Middle option worth naming: a multiset gives O(n log k), fine but strictly worse. Note the loop bound: "each element pays for its own eviction" is the amortized argument interviewers want verbatim.',
      isCaseBased: true,
    },
    {
      question: 'In the sliding-window-maximum deque, why store indices instead of values?',
      answer:
        'Age. The front must be evicted when it leaves the window, and only an index can tell you that (dq.front() <= i - k). Values alone cannot distinguish an in-window 9 from an expired 9 — duplicates make it ambiguous. Storing indices also gives you the value for free (a[dq.front()]) while the reverse is not true. General rule for monotonic structures over windows: store positions, derive values.',
      isCaseBased: false,
    },
    {
      question: 'Explain the partition idea behind Median of Two Sorted Arrays in O(log min(m, n)).',
      answer:
        'Cut A after i elements and B after j = (m+n+1)/2 − i elements, so the left halves jointly hold exactly half the elements. The cut is valid when the halves do not cross: A[i−1] ≤ B[j] and B[j−1] ≤ A[i] — two comparisons, because within each array order is already guaranteed. If A[i−1] > B[j], i is too big — move left; if B[j−1] > A[i], too small — move right. That monotone behavior makes i binary-searchable; search over the smaller array so the range is min(m, n) wide → O(log min(m, n)). On a valid cut: odd total → median = max(A[i−1], B[j−1]); even → average of that and min(A[i], B[j]). Edge cases: an empty side contributes ∓∞ sentinels. The sentence that wins the follow-up: the median is a property of the CUT, so I search cuts, not elements.',
      isCaseBased: false,
    },
    {
      question: 'Case: for Split Array Largest Sum you offered the O(n²k) DP. Interviewer: "n is 1e5 and k is 50 — that\'s 5·10¹¹ operations. What now?"',
      answer:
        'Switch to binary search on the answer. Predicate: canSplit(cap) — greedily stuff each part until adding the next element would exceed cap, count parts, return parts ≤ k. Greedy is optimal for the check, and the predicate is monotonic: any cap that works still works when raised — FAIL…FAIL PASS…PASS. Binary search that boundary between lo = max(a) (the largest element must fit somewhere; below this the greedy miscounts) and hi = sum(a). Cost: O(n log(sum)) ≈ 1e5 × 45 ≈ 4.5e6 — five orders of magnitude better. Then generalize out loud: "minimize the maximum" or "maximize the minimum" is the trigger for this family — ship capacity within D days, Koko\'s bananas, aggressive cows.',
      isCaseBased: true,
    },
    {
      question: 'When do prefix sums stop being enough, and what replaces them?',
      answer:
        'Prefix sums are unbeatable on static data: O(n) build, O(1) range query. They break the moment updates arrive — one point update invalidates every later prefix entry, O(n) per write. The replacements, in order of reach: a Fenwick tree (BIT) for point update + prefix-decomposable, invertible ops (sum, count, XOR) at O(log n) both ways in ~15 lines; a segment tree for the general case — min/max/gcd have no subtraction trick, so range queries need cached node answers — also O(log n) both ways; and lazy propagation on a segment tree when RANGE updates arrive. Decision rule: static → prefix sums; updates + sums → BIT; updates + min/max/gcd or range updates → segment tree.',
      isCaseBased: false,
    },
    {
      question: 'Segment tree: what does each node store, why is the backing array sized 4n, and what are the complexities?',
      answer:
        'Node x caches the query answer (sum, min, …) for its segment; children 2x and 2x+1 own the two halves; leaves own single elements. 4n: the tree has height ⌈log₂ n⌉, and a complete array layout of that height can need up to ~4n slots when n is not a power of two — 4n is the safe constant you state without deriving. Costs: build O(n) (each node computed once), point update O(log n) (leaf plus its ancestors), range query O(log n) — the recursion resolves each node as disjoint (identity), fully covered (cached answer), or partial (split), and at most about four nodes per level stay partial. The phrase to land: query answers are STITCHED from node caches that exactly tile the range.',
      isCaseBased: false,
    },
    {
      question: 'Explain the two BIT loops — why does add climb with i += i & -i while prefix strips with i -= i & -i?',
      answer:
        't[i] covers the lowbit(i)-sized block ending at i. A prefix [1..i] decomposes into disjoint blocks by repeatedly stripping the lowest set bit: 13 = 1101₂ → t[13] + t[12] + t[8], three set bits, three hops — so prefix descends with i -= i & -i and runs in O(log n). An update at position i must touch every block that CONTAINS i; those are exactly the indices reached by repeatedly adding the lowbit: 5 → 6 → 8 → 16, each jump landing on the next larger enclosing block — so add climbs with i += i & -i, also O(log n). And i & -i itself: two\'s complement negation flips every bit above the lowest set bit, so the AND isolates it.',
      isCaseBased: false,
    },
    {
      question: 'Define the KMP failure function precisely, and argue why the total running time is O(n + m).',
      answer:
        'fail[i] is the length of the longest PROPER prefix of p[0..i] that is also a suffix of p[0..i] — proper meaning not the entire substring, or every entry would trivially be i+1. During search, after j matched characters, a mismatch sets j = fail[j−1]: the pattern realigns to the longest prefix consistent with what already matched, and the text pointer i never moves backward. Complexity by amortization: i advances exactly n times; j increases only with i (at most n times total) and every fallback strictly decreases j, so total fallbacks ≤ total increases ≤ n. Search is O(n); the same argument on the table build gives O(m). Total O(n + m), versus O(n·m) naive.',
      isCaseBased: false,
    },
    {
      question: 'Why must Rabin-Karp verify on a hash hit, what is its worst case, and how do you defend it?',
      answer:
        'Pigeonhole: there are far more length-m strings than hash values mod p, so distinct windows can collide with the pattern\'s hash — an unverified hit can be a false positive. Verification (an O(m) character compare on each hit) keeps the algorithm correct; expected time stays O(n + m) because true matches plus random collisions are rare. Worst case: adversarial input engineered to collide on every window forces O(n·m). Defenses: pick the base and modulus randomly at runtime so an adversary cannot precompute collisions, use a large prime modulus (~1e9+7), or double-hash (two independent mod pairs) to make collision probability negligible.',
      isCaseBased: false,
    },
    {
      question: 'Case: you must scan a 100 MB chat log for 500 banned words, all exactly 8 characters. Design the matcher.',
      answer:
        'This is Rabin-Karp\'s home turf: KMP handles one pattern per pass — 500 passes over 100 MB is 50 GB of reads. Instead, hash all 500 patterns into an unordered_set (O(500·8) preprocessing), then roll one 8-char window across the log: O(1) hash update per position, membership check per window, and on a hash hit verify against the actual candidate words that share the hash. Expected O(n + total pattern length) — one pass. Follow-ups to pre-empt: mixed pattern lengths break the single rolling window — either run one pass per distinct length or move to Aho-Corasick, the multi-pattern automaton with O(n + matches) scanning; and mention streaming: the rolling hash needs only an 8-char buffer, so the log never has to fit in memory.',
      isCaseBased: true,
    },
    {
      question: 'Rapid-fire triggers: map each phrase to its pattern. "Smallest window containing…", "maximum of each window", "minimize the largest part", "range sums with updates", "find a pattern in text without re-scanning".',
      answer:
        '"Smallest window containing…" → sliding window with need/have counters, shrink while valid, O(n). "Maximum of each window" → monotonic deque, front = max, amortized O(n). "Minimize the largest / maximize the smallest" → binary search on the answer over a greedy monotonic predicate, O(n log range). "Range sums with updates" → BIT if it is sums (O(log n), 15 lines), segment tree for min/max/gcd or range updates. "Pattern in text, no rescanning" → KMP failure function, O(n + m); many same-length patterns → Rabin-Karp with a hash set. Interviewers score the recognition speed as much as the implementation.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Minimum Window Substring — loop shape', back: 'Expand r until have == |t| (valid). Then shrink l WHILE valid, recording each candidate. Each char enters/leaves once: O(|s| + |t|), O(alphabet) space.' },
    { front: 'Monotonic deque invariant (sliding window max)', back: 'Indices front→back hold decreasing values. Evict back while ≤ newcomer; pop front when it ages out. Front is ALWAYS the window max.' },
    { front: 'Sliding Window Maximum complexity', back: 'Amortized O(n): every index pushed once, popped at most once (≤ 2n ops). Naive rescan O(nk); multiset O(n log k).' },
    { front: 'Median of two sorted arrays — valid cut', back: 'i + j = (m+n+1)/2 with A[i−1] ≤ B[j] and B[j−1] ≤ A[i]. Binary search i over the SMALLER array: O(log min(m,n)).' },
    { front: '"Minimize the maximum" / "maximize the minimum"', back: 'Binary search on the answer: greedy feasibility check → monotonic FAIL…PASS predicate. Split Array, ship capacity, Koko, aggressive cows.' },
    { front: 'Prefix sums vs BIT vs segment tree', back: 'Static → prefix sums (O(1) query, O(n) per update). Point update + sum/XOR → BIT. Min/max/gcd or range updates (lazy) → segment tree. Both trees: O(log n).' },
    { front: 'The lowbit trick', back: 'i & −i = lowest set bit. BIT add: i += lowbit (climb enclosing blocks). Prefix: i −= lowbit (strip tiling blocks). Hops = set bits = O(log n).' },
    { front: 'KMP failure function fail[i]', back: 'Length of the longest PROPER prefix of p[0..i] that is also its suffix. Mismatch after j matches → j = fail[j−1]; text pointer never retreats → O(n + m).' },
    { front: 'Rabin-Karp golden rule', back: 'Hash hit ≠ match — verify with a real character compare (pigeonhole). Rolling hash slide: drop left digit, shift by base, add right digit — O(1).' },
    { front: 'When Rabin-Karp beats KMP', back: 'Many patterns of ONE length: hash all patterns into a set, scan the text once. Mixed lengths at scale → Aho-Corasick.' },
  ],
  mindmapMarkdown: `- Hard Patterns: Windows, Binary Search II, Segment Trees & KMP
  - Sliding window (hard)
    - Min Window Substring: need[] + have
      - shrink WHILE valid · O(|s|+|t|)
    - Sliding Window Max: monotonic deque
      - decreasing values → front = max
      - push once, pop once → O(n)
  - Binary search (hard)
    - Median: cut, don't merge
      - i + j = (m+n+1)/2, halves must not cross
      - search the smaller array → O(log min(m,n))
    - Split Array Largest Sum
      - greedy check → FAIL…PASS predicate
      - lo = max(a), hi = sum(a)
  - Range structures
    - prefix sums break on updates
    - segment tree: query + update O(log n)
    - BIT: lowbit = i & −i
      - update climbs, prefix query strips
      - BIT compact · segtree general (min/max, lazy)
  - String matching
    - KMP: fail[i] = longest proper prefix that is a suffix
      - mismatch → j = fail[j−1]; i never retreats → O(n+m)
    - Rabin-Karp: O(1) rolling hash slide
      - hash hit → verify (collisions!)
      - many same-length patterns → RK over KMP`,
}

export default m
