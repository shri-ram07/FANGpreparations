import type { Module } from '../types'

const m: Module = {
  id: 'dsa-l2-heaps',
  subjectId: 'dsa',
  level: 2,
  title: 'Heaps: k-Largest, Two-Heap Median & Merge k Lists',
  whyItMatters:
    '"Return the k largest…", "top k frequent…", "median of a stream…" — the letter k in a problem statement is practically a heap summons. This module gives you the machine (an array pretending to be a tree) and the three patterns that convert it into offers: the size-k club, the two-heap median, and the k-way merge.',
  estMinutes: 45,
  sections: [
    {
      type: 'intuition',
      title: 'A heap is a tournament, not a sorted list',
      md: `A knockout tournament guarantees ONE thing: the champion is on top. It does not rank everyone else — two quarter-finalists were never compared.

- A **max-heap** makes the same promise: every parent beats both children. That is the whole **heap property**. Min-heap: every parent *loses* to both children.
- Siblings are never compared. A valid max-heap array is **not sorted** — only the root is special.
- Shape rule: a heap is a **complete binary tree** — every level full, except possibly the last, which fills left to right. No gaps, ever.
- That one promise buys: read the max in O(1), insert or remove in O(log n).
- Weaker promise than sorting = cheaper maintenance. That is the whole trade.`,
    },
    {
      type: 'intuition',
      title: 'The array trick — a tree with no pointers',
      md: `Theater seating: row 1 has 1 seat, row 2 has 2, row 3 has 4… Nobody needs a map to find their parent's row — seat numbers alone encode the tree.

- Flatten the complete tree level by level into an array. Node at index **i**: parent at **(i−1)/2**, children at **2i+1** and **2i+2**.
- This only works because the tree is complete: no gaps means no wasted slots, and the formulas never point at a hole.
- Zero pointers stored. The structure is pure index arithmetic — plus contiguous memory, so the CPU cache loves it.
- "Move to parent" = one integer division. "Move to child" = one multiply-add. That is the entire navigation API.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'The whole machine: sift-up, sift-down, build (max-heap)',
      code: `void push(vector<int>& h, int x) {
    h.push_back(x);                       // new leaf at the end
    int i = (int)h.size() - 1;
    while (i > 0 && h[i] > h[(i - 1) / 2]) {   // sift-up: beat your parent?
        swap(h[i], h[(i - 1) / 2]);
        i = (i - 1) / 2;                  // climb one level
    }
}

void siftDown(vector<int>& h, int i) {
    int n = (int)h.size();
    while (true) {
        int big = i, l = 2 * i + 1, r = 2 * i + 2;
        if (l < n && h[l] > h[big]) big = l;
        if (r < n && h[r] > h[big]) big = r;
        if (big == i) return;             // both children smaller: settled
        swap(h[i], h[big]);               // sink one level
        i = big;
    }
}

int popMax(vector<int>& h) {
    int top = h[0];
    h[0] = h.back();                      // last leaf -> root: tree stays complete
    h.pop_back();
    siftDown(h, 0);                       // restore the property
    return top;
}

void buildHeap(vector<int>& h) {          // O(n), NOT O(n log n) -- note below
    for (int i = (int)h.size() / 2 - 1; i >= 0; i--)
        siftDown(h, i);
}`,
      annotations: {
        4: 'The climb is at most the tree height. A complete tree with n nodes is ⌈log₂ n⌉ tall — so push is O(log n).',
        13: 'The child formulas, live. big tracks the largest of {parent, left, right}; the parent must beat both to stay.',
        24: 'Why the LAST element? Removing any other slot punches a hole mid-array and the tree is no longer complete. Overwrite root, shrink from the end: gapless, then fix the one violation by sifting.',
        31: 'Start at the last internal node, n/2 − 1. Every index after it is a leaf — a leaf is already a valid one-node heap, so half the array needs zero work.',
      },
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'popMax on [90, 80, 70, 40, 50, 60, 30] — the sift-down walk',
        notice: 'The right column IS the array. Watch 30 sink until both children are smaller (or missing).',
        leftLabel: 'sift-down state',
        rightLabel: 'the array is the heap',
        frames: [
          {
            note: 'pop(): the root 90 is handed to the caller. The LAST element (30, idx 6) is copied onto idx 0 and the array shrinks to size 6. The property is broken exactly once, at the root. Compare cur (30) with children idx 1 (80) and idx 2 (70).',
            stack: [
              { name: 'returned', value: '90' },
              { name: 'cur', to: 'i0', danger: true },
              { name: 'childL = 2·0+1', to: 'i1' },
              { name: 'childR = 2·0+2', to: 'i2' },
            ],
            heap: [
              { id: 'i0', value: '30', label: 'idx 0 — was 90' },
              { id: 'i1', value: '80', label: 'idx 1' },
              { id: 'i2', value: '70', label: 'idx 2' },
              { id: 'i3', value: '40', label: 'idx 3' },
              { id: 'i4', value: '50', label: 'idx 4' },
              { id: 'i5', value: '60', label: 'idx 5' },
              { id: 'i6', value: '30', label: 'idx 6 — moved to root', moved: true, freed: true },
            ],
          },
          {
            note: 'Bigger child wins the right to challenge: 80 beats 70, and 30 < 80 → swap idx 0 ↔ idx 1. The 30 sinks a level. New children by formula: 2·1+1 = idx 3 (40) and 2·1+2 = idx 4 (50).',
            stack: [
              { name: 'cur', to: 'i1', danger: true },
              { name: 'childL = 2·1+1', to: 'i3' },
              { name: 'childR = 2·1+2', to: 'i4' },
            ],
            heap: [
              { id: 'i0', value: '80', label: 'idx 0' },
              { id: 'i1', value: '30', label: 'idx 1' },
              { id: 'i2', value: '70', label: 'idx 2' },
              { id: 'i3', value: '40', label: 'idx 3' },
              { id: 'i4', value: '50', label: 'idx 4' },
              { id: 'i5', value: '60', label: 'idx 5' },
            ],
          },
          {
            note: 'Bigger child is 50 (40 lost the sibling contest), and 30 < 50 → swap idx 1 ↔ idx 4. cur is now idx 4. Its children would be idx 9 and idx 10 — both past size 6, so 30 has become a leaf.',
            stack: [
              { name: 'cur', to: 'i4', danger: true },
              { name: 'childL = idx 9', value: '≥ size: none' },
              { name: 'childR = idx 10', value: '≥ size: none' },
            ],
            heap: [
              { id: 'i0', value: '80', label: 'idx 0' },
              { id: 'i1', value: '50', label: 'idx 1' },
              { id: 'i2', value: '70', label: 'idx 2' },
              { id: 'i3', value: '40', label: 'idx 3' },
              { id: 'i4', value: '30', label: 'idx 4' },
              { id: 'i5', value: '60', label: 'idx 5' },
            ],
          },
          {
            note: 'No children left to lose to — sift-down stops. Two swaps for a three-level heap: the walk can never exceed the tree height, so pop is O(log n). Property restored everywhere; the new max (80) sits at idx 0.',
            stack: [
              { name: 'cur', to: 'i4' },
              { name: 'top()', to: 'i0' },
            ],
            heap: [
              { id: 'i0', value: '80', label: 'idx 0 — new max' },
              { id: 'i1', value: '50', label: 'idx 1' },
              { id: 'i2', value: '70', label: 'idx 2' },
              { id: 'i3', value: '40', label: 'idx 3' },
              { id: 'i4', value: '30', label: 'idx 4' },
              { id: 'i5', value: '60', label: 'idx 5' },
            ],
          },
        ],
      },
    },
    {
      type: 'note',
      md: 'Build-heap honesty: "n nodes × O(log n) sift = O(n log n)" is a TRUE upper bound — just a lazy one. The tight count: half the nodes are leaves and sift 0 levels, a quarter sift at most 1, an eighth at most 2… only ONE node can sift the full log n. The costs shrink faster than the node counts grow, and the sum collapses to under 2n swaps → **O(n)**. Pushing n elements one by one really is Θ(n log n) — bottom-up build is the free lunch.',
    },
    {
      type: 'math',
      intro: 'The build-heap sum, if the interviewer pushes for it.',
      latex: [
        '\\text{cost} = \\sum_{h=0}^{\\log n} \\underbrace{\\frac{n}{2^{h+1}}}_{\\text{nodes at height } h} \\cdot h \\;\\le\\; n \\sum_{h=0}^{\\infty} \\frac{h}{2^{h+1}} \\;=\\; n \\cdot 1 \\;=\\; O(n)',
        '\\text{versus } n \\text{ pushes: } \\sum_{i=1}^{n} \\log i \\;=\\; \\log(n!) \\;=\\; \\Theta(n \\log n)',
      ],
    },
    {
      type: 'intuition',
      title: 'priority_queue — the three lines you type',
      md: `In interviews you rarely hand-roll the heap — you drive \`std::priority_queue\` (the full container price list lives in the C++ STL module; here we only need its heap lines).

- **Default is a MAX-heap.** Python's heapq is min — porting without flipping is the classic silent wrong answer.
- Min-heap: \`priority_queue<int, vector<int>, greater<int>>\`. Memorize the whole line.
- Custom order: define a lambda, pass its TYPE via \`decltype(cmp)\` and the instance to the constructor.
- Comparator intuition: it answers "does a bury deeper than b?" — whatever sorts LAST surfaces on \`top()\`. It feels inverted versus \`sort\`. It is.
- Costs: push O(log n), pop O(log n), top O(1).`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Max by default, min by incantation, custom by decltype',
      code: `priority_queue<int> mx;                              // MAX-heap by default
priority_queue<int, vector<int>, greater<int>> mn;   // the min-heap line

auto cmp = [](const pair<int,int>& a, const pair<int,int>& b) {
    return a.second > b.second;      // "a buries deeper" -> smallest .second on top
};
priority_queue<pair<int,int>, vector<pair<int,int>>, decltype(cmp)> pq(cmp);`,
      annotations: {
        1: 'The single most common C++ heap slip. If your answers come out inverted, this line is why.',
        2: 'greater<int> flips every comparison: smallest on top. Same O(log n) costs.',
        7: 'priority_queue takes the comparator TYPE as a template argument — hence decltype(cmp) — plus the instance in the constructor. sort just takes the lambda.',
      },
    },
    {
      type: 'intuition',
      title: 'Kth Largest — why a MIN-heap answers a LARGEST question',
      md: `Run a club that only admits the k best people seen so far. The bouncer never ranks the whole city — every newcomer is compared against exactly one person: the **weakest current member**.

- The heap IS the club: it holds the current top-k. Newcomer beats the weakest → weakest out, newcomer in. Otherwise newcomer walks.
- Who must be instantly findable? The **weakest of the k**. A MIN-heap keeps exactly that on top, in O(1).
- And here is the punchline: the weakest member of the top-k club **is** the kth largest. The root is not bookkeeping — it is the answer.
- Cost: n arrivals × O(log k) per decision = **O(n log k)**, memory **O(k)**. A max-heap of everything also works — at O(n) memory and O(n + k log n) time. Say why you did not do that.
- Named problem: **Kth Largest Element in an Array** (and its stream variant, where the same heap just persists between calls).`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Kth Largest Element — the size-k club',
      code: `int findKthLargest(vector<int>& nums, int k) {
    priority_queue<int, vector<int>, greater<int>> club;   // MIN-heap, capped at k
    for (int x : nums) {
        club.push(x);                  // everyone steps inside for a moment
        if ((int)club.size() > k)
            club.pop();                // bouncer evicts the weakest of the k+1
    }
    return club.top();                 // weakest of the top-k = kth largest
}`,
      annotations: {
        2: 'MIN-heap for a LARGEST question — the eviction candidate (weakest member) must sit on top.',
        6: 'push-then-pop keeps the invariant "club holds the k best seen so far" true after every element.',
        8: 'O(n log k) time, O(k) space. For one-shot arrays quickselect averages O(n) — name it as the alternative.',
      },
    },
    {
      type: 'intuition',
      title: 'The mirror rule — same skeleton, two more problems',
      md: `The club generalizes with one flip: keep a size-k heap whose root is the **eviction candidate**.

- k LARGEST → evict the smallest → **min-heap**. k SMALLEST / k CLOSEST → evict the biggest → **max-heap**. The heap direction is always the *opposite* of the question.
- **Top K Frequent Elements**: count with a hash map first (O(n)), then run the club over (count, value) pairs — O(m log k) for m distinct values. Beats sorting all counts at O(m log m).
- **K Closest Points to Origin**: "closest" = smallest distance = a k-SMALLEST question → max-heap of size k, evict the farthest.
- Distance trick: compare **squared** distances — same ordering, no sqrt, no floating point.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Top K Frequent + K Closest — the skeleton, twice',
      code: `vector<int> topKFrequent(vector<int>& nums, int k) {
    unordered_map<int, int> freq;
    for (int x : nums) freq[x]++;              // value -> count, O(n)
    priority_queue<pair<int,int>, vector<pair<int,int>>,
                   greater<pair<int,int>>> club;   // min-heap on count
    for (auto& [val, cnt] : freq) {
        club.push({cnt, val});
        if ((int)club.size() > k) club.pop();  // weakest count leaves
    }
    vector<int> out;
    while (!club.empty()) { out.push_back(club.top().second); club.pop(); }
    return out;                                // O(n + m log k), m = distinct values
}

vector<vector<int>> kClosest(vector<vector<int>>& pts, int k) {
    priority_queue<pair<long long, int>> club;     // MAX-heap this time
    for (int i = 0; i < (int)pts.size(); i++) {
        long long d = 1LL * pts[i][0] * pts[i][0]
                    + 1LL * pts[i][1] * pts[i][1];
        club.push({d, i});                     // (dist², index)
        if ((int)club.size() > k) club.pop();  // farthest of the k+1 leaves
    }
    vector<vector<int>> out;
    while (!club.empty()) { out.push_back(pts[club.top().second]); club.pop(); }
    return out;
}`,
      annotations: {
        5: 'Pairs compare by .first, so (count, value) heaps on count for free. greater<pair> flips it to a min-heap.',
        16: 'The mirror rule live: a SMALLEST-distance question keeps a MAX-heap — the farthest point must sit on top, ready for eviction.',
        18: 'Squared distance: sqrt preserves order, so skip it. 1LL forces 64-bit math before the multiply can overflow.',
      },
    },
    {
      type: 'intuition',
      title: 'Two heaps, one median — the net between two teams',
      md: `Median of a growing stream. Sorting per query is O(n log n) every time. Instead: split the numbers into two halves facing each other across a net.

- **lo** = max-heap of the smaller half → its top is the *biggest of the small*. **hi** = min-heap of the bigger half → its top is the *smallest of the big*. The median lives at the net.
- Invariant 1 (order): every element of lo ≤ every element of hi.
- Invariant 2 (balance): sizes differ by at most 1 — lo holds the extra when the count is odd.
- Insert = push through lo, hand lo's max to hi, rebalance if hi got heavier: **O(log n)**. Median = one or two \`top()\` calls: **O(1)**.
- Named problem: **Find Median from Data Stream**. Trigger phrase: "running median", "median so far".`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'MedianFinder — insert O(log n), median O(1)',
      code: `class MedianFinder {
    priority_queue<int> lo;                             // max-heap: lower half
    priority_queue<int, vector<int>, greater<int>> hi;  // min-heap: upper half
public:
    void addNum(int x) {
        lo.push(x);                      // 1. enter through the lower half
        hi.push(lo.top()); lo.pop();     // 2. lower half's BEST crosses the net
        if (hi.size() > lo.size()) {     // 3. keep lo == hi or lo == hi + 1
            lo.push(hi.top()); hi.pop();
        }
    }
    double findMedian() {
        if (lo.size() > hi.size()) return lo.top();   // odd count: lo holds the extra
        return (lo.top() + hi.top()) / 2.0;           // even: average the two tops
    }
};`,
      annotations: {
        7: 'The push-through is what enforces order: whatever crosses to hi is lo\'s current maximum, so every lo element stays ≤ every hi element — no explicit comparison needed.',
        8: 'Balance invariant: after every insert, |lo| − |hi| is 0 or 1. Two pushes and up to two pops = O(log n) per insert.',
        14: '/ 2.0, not / 2 — integer division silently floors the median of an even count. Small bug, real rejections.',
      },
    },
    {
      type: 'intuition',
      title: 'Merge K Sorted Lists — one dispatcher, k queues',
      md: `k sorted queues at an airport, one dispatcher building a single sorted line. The dispatcher never looks past the FRONT of each queue — the k front people are the only candidates for "next".

- Naive: scan all k fronts for the minimum, every time. N total nodes × k scans = **O(Nk)**. At k = 10⁴, N = 10⁶ that is 10¹⁰ — dead.
- Heap: keep the k current fronts in a MIN-heap. Pop the global minimum (O(log k)), append it, push its successor from the same list.
- Every node enters and leaves the heap exactly once: **O(N log k)** time, **O(k)** memory. The heap never holds more than k nodes — never all N.
- log k, not log n, is the interview tell. Say it unprompted.
- Also correct: divide and conquer — merge lists pairwise like merge sort, also O(N log k). Know both; code the heap.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Merge K Sorted Lists — heap of the k heads',
      code: `ListNode* mergeKLists(vector<ListNode*>& lists) {
    auto cmp = [](ListNode* a, ListNode* b) {
        return a->val > b->val;          // smallest val surfaces on top
    };
    priority_queue<ListNode*, vector<ListNode*>, decltype(cmp)> heads(cmp);
    for (ListNode* h : lists)
        if (h) heads.push(h);            // k heads enter; empty lists stay out

    ListNode dummy(0), *tail = &dummy;
    while (!heads.empty()) {
        ListNode* node = heads.top(); heads.pop();   // global min of all k fronts
        tail->next = node; tail = node;
        if (node->next) heads.push(node->next);      // that list sends its next head
    }
    return dummy.next;                   // N pops x O(log k) = O(N log k)
}`,
      annotations: {
        3: 'Comparing raw pointers would order by ADDRESS — the lambda orders by value. greater-than makes a min-heap, same inversion as always.',
        7: 'The null check here and on line 13 is the whole robustness story: empty lists never enter, exhausted lists never re-enter.',
        11: 'The invariant: the heap holds exactly the unmerged front of every non-empty list, so its top is provably the next output node.',
        15: 'Each of the N nodes is pushed once and popped once through a size-≤k heap. O(N log k) time, O(k) extra space.',
      },
    },
  ],
  quiz: [
    {
      question: 'A heap lives in an array. The node at index 7 — where are its parent and children?',
      options: [
        {
          text: 'Parent at 3, children at 15 and 16',
          explanation: 'Correct. Parent (7−1)/2 = 3; children 2·7+1 = 15 and 2·7+2 = 16. Pure index arithmetic, no pointers.',
        },
        {
          text: 'Parent at 6, children at 8 and 9',
          explanation: 'That is adjacent-index thinking — the tree levels are not neighbors in the array. Use the formulas: (i−1)/2, 2i+1, 2i+2.',
        },
        {
          text: 'Parent at 3, children at 14 and 15',
          explanation: '2i and 2i+1 are the 1-indexed formulas. This module (and C++) is 0-indexed: children are 2i+1 and 2i+2.',
        },
      ],
      correct: 0,
    },
    {
      question: 'Which of these does a valid MAX-heap array actually guarantee?',
      options: [
        {
          text: 'a[0] is the maximum of the whole array',
          explanation: 'Correct. The root beats its children, they beat theirs — transitively the root beats everyone. That is the ONLY global guarantee.',
        },
        {
          text: 'The array is sorted in descending order',
          explanation: 'No — siblings are never compared. [90, 80, 70, 40, 50, 60, 30] is a valid max-heap and clearly unsorted.',
        },
        {
          text: 'a[1] ≥ a[2]',
          explanation: 'Indexes 1 and 2 are siblings — the heap property says nothing about them, in either direction.',
        },
      ],
      correct: 0,
    },
    {
      question: 'You need the 5th largest element of a huge stream. Which heap and why?',
      options: [
        {
          text: 'A max-heap of everything, then pop 5 times',
          explanation: 'Works, but costs O(n) memory for a stream — the whole point of the size-k pattern is refusing to store n items.',
        },
        {
          text: 'A MIN-heap capped at size 5',
          explanation: 'Correct. It holds the current top-5; the root is the weakest member — the eviction candidate AND the answer. O(log 5) per element, O(5) memory.',
        },
        {
          text: 'A min-heap of everything',
          explanation: 'The min-heap direction is right but uncapped it stores all n elements and the 5th largest is buried, not on top.',
        },
      ],
      correct: 1,
    },
    {
      question: 'buildHeap (sift-down from n/2 − 1 down to 0) is O(n). Why is it not O(n log n)?',
      options: [
        {
          text: 'It actually is O(n log n); O(n) is a simplification',
          explanation: 'Backwards — O(n log n) is the lazy bound. The tight sum over levels really collapses to under 2n swaps.',
        },
        {
          text: 'Most nodes sit near the bottom and sift a short distance — Σ (n/2^(h+1))·h ≤ n, only the root can sift the full log n',
          explanation: 'Correct. Half the nodes are leaves (0 work), a quarter sift ≤1 level… the costs shrink faster than the counts grow.',
        },
        {
          text: 'Because sift-down is O(1)',
          explanation: 'Sift-down from the root is genuinely O(log n). The saving is that almost no nodes start at the root.',
        },
      ],
      correct: 1,
    },
    {
      question: 'priority_queue<pair<int,int>> pq; pq.push({1, 9}); pq.push({2, 0}); — what is pq.top()?',
      options: [
        {
          text: '{1, 9}',
          explanation: 'That is min-heap thinking. Default priority_queue is a MAX-heap — the lexicographically largest pair surfaces.',
        },
        {
          text: '{2, 0}',
          explanation: 'Correct. Pairs compare by .first (ties by .second), and the default heap is MAX: {2,0} > {1,9} because 2 > 1.',
        },
        {
          text: '{1, 9}, because 9 is the largest value present',
          explanation: 'The .second only breaks ties on .first. 9 never gets looked at here since 1 ≠ 2.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Two-heap median: lo (max-heap) has 6 elements, hi (min-heap) has 5. The median is…',
      options: [
        {
          text: 'lo.top()',
          explanation: 'Correct. 11 elements total — odd — and the invariant parks the extra element in lo, so its top IS the middle value. O(1).',
        },
        {
          text: 'hi.top()',
          explanation: 'hi holds the upper half; its top is the 6th smallest of 11 — one past the median when lo carries the extra.',
        },
        {
          text: '(lo.top() + hi.top()) / 2.0',
          explanation: 'Averaging the tops is the EVEN-count case. With sizes 6 and 5 the count is odd.',
        },
      ],
      correct: 0,
    },
    {
      question: 'Merging k = 1000 sorted lists with N total nodes via the heap approach: heap size and total cost?',
      options: [
        {
          text: 'Heap holds all N nodes; O(N log N)',
          explanation: 'That is "dump everything into a heap" — correct output, wasted memory, and log N instead of log k per operation.',
        },
        {
          text: 'Heap holds at most k heads; O(N log k)',
          explanation: 'Correct. Only the k current fronts are candidates for "next", and each of the N nodes passes through the size-k heap once.',
        },
        {
          text: 'O(N·k) — every output requires scanning the k heads',
          explanation: 'That is the naive scan the heap exists to kill: at k=1000 it is 1000× slower than O(N log k) ≈ 10·N.',
        },
      ],
      correct: 1,
    },
    {
      question: 'In popMax, why overwrite the root with the LAST array element specifically?',
      options: [
        {
          text: 'Because it is the smallest element, so it will sift all the way down anyway',
          explanation: 'The last element is a leaf but not necessarily the minimum — and "it sinks far" is a side effect, not the reason.',
        },
        {
          text: 'Removing the last slot is the only removal that keeps the array gapless — the tree stays complete, and one sift-down fixes the one violation',
          explanation: 'Correct. Deleting any middle slot punches a hole, breaking completeness — and with it the index formulas.',
        },
        {
          text: 'Pure convention — any element would work',
          explanation: 'Any other choice leaves a gap in the array. Completeness is load-bearing: the parent/child math assumes no holes.',
        },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'A heap is a binary tree, yet your implementation has no pointers. Explain how that works and why it is a win.',
      answer:
        'A heap is a COMPLETE binary tree — every level full except the last, filled left to right. Flattened level-by-level into an array, node i has its parent at (i−1)/2 and children at 2i+1 and 2i+2, and completeness guarantees those formulas never point into a gap. Wins to name: zero pointer memory (2 pointers per node saved), O(1) navigation by arithmetic, contiguous memory so traversal is cache-friendly, and "add/remove at the end" maps to vector push_back/pop_back. This is why std::priority_queue is an adapter over vector.',
      isCaseBased: false,
    },
    {
      question: 'Prove that heap push and pop are O(log n).',
      answer:
        'A complete binary tree with n nodes has height ⌈log₂ n⌉ — each level doubles the capacity, so n nodes fit in log n levels. Push appends a leaf and sifts UP: each step moves one level toward the root, so at most height swaps. Pop moves the last leaf to the root and sifts DOWN: each step moves one level toward the leaves, again at most height swaps, each costing O(1) comparisons (two children). Both walks are bounded by the height → O(log n). And top() is O(1): the answer sits at index 0 by the heap property.',
      isCaseBased: false,
    },
    {
      question: 'Why is buildHeap O(n)? "n sift-downs at log n each" says O(n log n).',
      answer:
        'O(n log n) is a valid but loose bound — it charges every node the ROOT\'s worst case. Charge each node its actual maximum sift distance instead: the n/2 leaves sift 0, the n/4 nodes above them sift at most 1, n/8 sift at most 2 — only one node can sift the full log n. Total: Σ over heights h of (n/2^(h+1))·h ≤ n·Σ h/2^(h+1) = n → O(n). The intuition to say out loud: almost all nodes live near the bottom where sifting is nearly free. Contrast: building by n pushes really is Θ(n log n), since late pushes each pay log n — bottom-up build is strictly better and free.',
      isCaseBased: false,
    },
    {
      question: 'Kth largest element in an array — walk me through brute force to best, and justify the heap direction.',
      answer:
        'Brute: sort descending, take index k−1 — O(n log n), simple, sorts everything for one value. Better: MIN-heap capped at size k — the heap holds the current top-k, and its root is the weakest member, which is simultaneously the eviction candidate and, at the end, the kth largest itself. O(n log k) time, O(k) space — the win grows as k << n, and it works on streams. Why MIN for a LARGEST question: the only element you ever need instant access to is the weakest of the club, and a min-heap keeps exactly that on top. Best for one-shot arrays: quickselect, average O(n), worst O(n²) — name the tradeoff and pick: stream or repeated queries → heap; single in-memory array → quickselect.',
      isCaseBased: false,
    },
    {
      question: 'Case: dashboard showing the top 100 hashtags across ~1 billion events per day. Memory is constrained. Design it and state costs.',
      answer:
        'Two stages. (1) Counting: a hash map hashtag → count. Honest caveat: the map is the real memory consumer — it scales with m distinct hashtags, not with the 10⁹ events; if even m is too large, the exact answer is impossible in-memory and you name count-min sketch (bounded memory, approximate counts) feeding the same heap. (2) Selection: a MIN-heap capped at 100 over (count, tag) — never sort all m counts. Total: O(events) map updates + O(m log 100) selection, O(m + 100) memory. Anti-pattern to call out: maintaining the heap incrementally WHILE counts change fails, because a priority_queue cannot re-position a key whose count grew — count first, select after (or re-select periodically for a live dashboard).',
      isCaseBased: true,
    },
    {
      question: 'Design a data structure for the median of a stream: state the invariants, walk one insert, give complexities.',
      answer:
        'Two heaps: lo = max-heap of the lower half, hi = min-heap of the upper half. Invariant 1 (order): max(lo) ≤ min(hi) — every element in lo ≤ every element in hi. Invariant 2 (balance): |lo| − |hi| ∈ {0, 1}. Insert x: push into lo; move lo.top() to hi (this single push-through is what enforces invariant 1 — whatever crosses is lo\'s max); if hi outgrew lo, move hi.top() back. That is ≤3 heap ops → O(log n). Median: odd count → lo.top(); even → average of both tops → O(1). Follow-up they love — sliding-window median: a plain priority_queue cannot evict arbitrary expired elements, so switch to two multisets (or heaps + lazy deletion with a "dead" hash map).',
      isCaseBased: false,
    },
    {
      question: 'Case: your merge-k-lists solution scans all k heads to find each minimum. It passes small tests but TLEs at k = 10⁴, N = 10⁶ total nodes. Fix it.',
      answer:
        'The scan is O(k) per output node → O(Nk) = 10¹⁰ operations — that is the TLE, not a constant-factor problem. Replace the scan with a MIN-heap of the k current heads: pop the global minimum in O(log k), append it, push that list\'s next node. Every node enters and leaves the heap exactly once → O(N log k) ≈ 10⁶ × 14 ≈ 1.4×10⁷ — roughly a 700× speedup, and O(k) extra memory. Alternative with the same complexity: divide-and-conquer pairwise merging (merge lists in rounds like merge sort) — O(N log k) with O(1) extra space beyond recursion; mention it, code the heap.',
      isCaseBased: true,
    },
    {
      question: 'When would you reach for a multiset instead of a priority_queue, given both cost O(log n) per operation?',
      answer:
        'priority_queue only exposes the top — you cannot erase an arbitrary element, see both min and max, or iterate. multiset (a balanced BST) gives ordered iteration, erase(find(x)) of any element, and both ends. So: sliding-window problems where expired elements must leave (window median, window max with deletions) → multiset or lazy-deletion heap; need min AND max → multiset (or two heaps). When top-only suffices, prefer priority_queue: same O(log n) but a flat array underneath — better cache behavior, lower constants, less memory than a node-based tree.',
      isCaseBased: false,
    },
    {
      question: 'Explain the comparator in the merge-k solution: why does "return a->val > b->val" produce a MIN-heap?',
      answer:
        'The comparator defines an ordering, and top() is whatever sorts LAST in it. Default less puts small first, large last → max on top. Flipping to greater-than puts large first, small last → MIN on top. Mnemonic: the priority_queue comparator answers "does a bury deeper than b?" — the inverse feel of sort\'s comparator. Two more things to say unprompted: with pointer elements the lambda is mandatory (default would compare addresses — garbage order), and priority_queue takes the comparator TYPE as a template parameter, hence decltype(cmp) plus passing cmp to the constructor. The lambda-comparator mechanics are covered in the STL module.',
      isCaseBased: false,
    },
    {
      question: 'Case: K closest points to origin, k = 10. Follow-up 1: the points arrive as an unbounded stream. Follow-up 2: now they want the k FARTHEST instead. What changes?',
      answer:
        'Base: "closest" is a k-SMALLEST question, so keep a MAX-heap capped at k on squared distance — the root is the farthest of the current k, i.e. the eviction candidate. Squared distance avoids sqrt: monotone transform, same order, no floats. O(n log k), O(k). Follow-up 1: nothing structural changes — that is the beauty of the capped-heap pattern; it never stores more than k points, so it is already streaming-ready (sorting or quickselect, by contrast, die here — they need all n in memory). Follow-up 2: apply the mirror rule — k FARTHEST is a k-largest question, so flip to a MIN-heap of size k, evicting the nearest. One comparator flip, same complexity.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    {
      front: 'Heap array index math',
      back: 'Parent (i−1)/2 · left child 2i+1 · right child 2i+2 (0-indexed). Works only because the tree is COMPLETE — no gaps, so no pointers needed.',
    },
    {
      front: 'Heap property — and what it does NOT promise',
      back: 'Max-heap: every parent ≥ both children (min-heap: ≤). Siblings never compared → the array is NOT sorted; only a[0] is globally special.',
    },
    {
      front: 'push / pop mechanics + costs',
      back: 'push: append as last leaf, sift-UP. pop: save root, move LAST leaf to root (keeps completeness), sift-DOWN. Both O(log n) = tree height. top() O(1).',
    },
    {
      front: 'buildHeap in O(n) — the one-line why',
      back: 'Sift-down from n/2−1 to 0. Half the nodes are leaves (0 work), costs shrink faster than counts grow: Σ (n/2^(h+1))·h ≤ 2n. n pushes instead = Θ(n log n).',
    },
    {
      front: 'Trigger: "kth largest / top k" →',
      back: 'MIN-heap capped at size k. It holds the current top-k; the root = weakest member = eviction candidate = the answer. O(n log k) time, O(k) space.',
    },
    {
      front: 'The mirror rule for size-k heaps',
      back: 'Heap direction is the OPPOSITE of the question: k largest → min-heap; k smallest / k closest → max-heap. Root is always the eviction candidate.',
    },
    {
      front: 'Two-heap median — structure + invariants',
      back: 'lo = max-heap (lower half), hi = min-heap (upper half). Invariants: max(lo) ≤ min(hi), sizes differ ≤ 1. Insert O(log n), median O(1) from the tops.',
    },
    {
      front: 'Trigger: "merge k sorted lists/streams" →',
      back: 'MIN-heap of the k current heads. Pop global min, push its successor. O(N log k) vs naive scan O(Nk). Heap never exceeds k nodes.',
    },
    {
      front: 'C++ min-heap + custom comparator',
      back: 'priority_queue<int, vector<int>, greater<int>>. Custom: lambda cmp, type via decltype(cmp), instance in constructor. Comparator = "a buries deeper" — inverted vs sort.',
    },
    {
      front: 'Top K Frequent — recipe + cost',
      back: 'unordered_map value→count O(n), then min-heap of (count, value) capped at k → O(n + m log k), m = distinct. Pairs compare by .first = count, free.',
    },
  ],
  mindmapMarkdown: `- Heaps: k-Largest, Two-Heap Median & Merge k Lists
  - Structure
    - complete binary tree → flat array, no pointers
    - parent (i−1)/2 · children 2i+1, 2i+2
    - property: parent beats children — siblings unordered
  - Operations
    - push = append + sift-up, O(log n)
    - pop = last leaf → root + sift-down, O(log n)
    - top O(1)
    - build-heap O(n): bottom-up, leaves free
  - priority_queue
    - MAX-heap by default
    - greater<int> → min-heap
    - custom: lambda + decltype(cmp)
  - The size-k club
    - Kth Largest: MIN-heap capped at k
    - root = weakest of top-k = the answer
    - mirror rule: k closest → MAX-heap
    - Top K Frequent: freq map + heap, O(n + m log k)
  - Two-heap median
    - max-heap lo · min-heap hi
    - max(lo) ≤ min(hi), sizes differ ≤ 1
    - insert O(log n) · median O(1)
  - Merge k sorted lists
    - min-heap of the k heads only
    - O(N log k) beats naive O(Nk)`,
}

export default m
