var e={id:`dsa-l1-stacks-queues`,subjectId:`dsa`,level:1,title:`Stacks, Queues & the Monotonic Stack`,whyItMatters:`A stack is trivial. The MONOTONIC stack is a superpower: it collapses an entire family of "for each element, find the nearest bigger/smaller X" problems from O(n²) to O(n). Next Greater Element, Daily Temperatures, Stock Span, Largest Rectangle in Histogram — one pattern, four famous interview problems. Learn the invariant once, cash it in forever.`,estMinutes:50,sections:[{type:`intuition`,title:`LIFO and FIFO — disciplines, not structures`,md:"Ctrl+Z undoes your *last* edit — never your first. A printer prints jobs in arrival order — never the newest first. Two opposite disciplines, two containers.\n\n- **stack** — LIFO (last in, first out): `push`, `top`, `pop`. Undo, matched brackets, call stacks, iterative DFS.\n- **queue** — FIFO (first in, first out): `push`, `front`, `pop`. Printers, BFS, anything fair.\n- Both are C++ **adapters**: thin wrappers over a `deque` that expose only the discipline. No indexing, no iteration — needing to peek the middle means you picked the wrong tool.\n- **deque** is the raw machine underneath: O(1) push/pop at BOTH ends, plus O(1) indexing.\n- The gotcha that bites everyone once: `pop()` returns **void**. Read with `top()`/`front()` first, then pop."},{type:`code`,lang:`cpp`,title:`The three containers in sixteen lines`,code:`stack<int> st;                  // LIFO adapter (a deque underneath)
st.push(10);
st.push(20);
int t = st.top();               // 20 -- most recent first
st.pop();                       // removes 20. Returns VOID

queue<int> q;                   // FIFO adapter (also a deque underneath)
q.push(1);
q.push(2);
int f = q.front();              // 1 -- oldest first
q.pop();                        // removes 1, also returns void

deque<int> d = {2, 3};          // the raw structure: O(1) at BOTH ends
d.push_front(1);                // {1, 2, 3}
d.push_back(4);                 // {1, 2, 3, 4}
int mid = d[2];                 // 3 -- and O(1) indexing too`,annotations:{1:`Adapters strip the deque down to one discipline. The tiny API is the feature: the wrong access pattern becomes a compile error, not a slow program.`,5:`int x = st.pop() does not compile — pop() returns void. The idiom used in every snippet below: top()/front() to read, pop() to drop. Two calls.`,13:`Reach for raw deque when BOTH ends are hot. This is the sliding-window-maximum tool — forward-ref at the end of this module.`},py:{code:`st = []                         # LIFO: a plain list IS the stack
st.append(10)
st.append(20)
t = st[-1]                      # 20 -- most recent first
top = st.pop()                  # removes AND RETURNS 20

from collections import deque
q = deque()                     # FIFO: deque, never a list
q.append(1)
q.append(2)
f = q[0]                        # 1 -- oldest first
oldest = q.popleft()            # removes and returns 1, O(1)

d = deque([2, 3])               # the raw structure: O(1) at BOTH ends
d.appendleft(1)                 # deque([1, 2, 3])
d.append(4)                     # deque([1, 2, 3, 4])
mid = d[2]                      # 3 -- but a deque indexes in O(n), not O(1)`,annotations:{1:`Python ships no stack adapter: list.append/pop ARE the stack, amortized O(1). You lose the C++ safety net where the wrong access pattern fails to compile — the discipline is now yours to keep.`,5:`The opposite of C++: pop() RETURNS the element, so top() + pop() collapses into one call. st[-1] is the peek that does not remove.`,8:`Never use a list as a queue: list.pop(0) shifts every remaining element, O(n). deque.popleft() is O(1). This is the single most common Python performance bug in interview code.`,17:`Reach for deque when BOTH ends are hot — it is the sliding-window-maximum tool. But unlike a C++ deque, indexing the middle walks the blocks: O(n). Ends only.`}}},{type:`intuition`,title:`Valid Parentheses — the canonical stack warm-up`,md:`Nested boxes: you can only close the box you opened **most recently**. That sentence IS a stack.

- Scan left to right. Open bracket → push it (it now waits for its closer).
- Close bracket → it must match the **top** of the stack. Pop on match.
- Three ways to fail, and interviewers check all three:
  - the closer does not match the top — \`"(]"\`
  - a closer arrives with an **empty** stack — \`")("\`
  - the scan ends but opens remain — \`"((("\`
- O(n) time, O(n) stack space. Every bracket touched once.`},{type:`code`,lang:`cpp`,title:`Valid Parentheses (LeetCode 20)`,code:`bool isValid(const string& s) {
    stack<char> st;                       // opens waiting for their closer
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') {
            st.push(c);                   // open: park it, keep reading
        } else {
            if (st.empty()) return false; // closer, but nothing is open
            char open = st.top();
            st.pop();
            if ((c == ')' && open != '(') ||
                (c == ']' && open != '[') ||
                (c == '}' && open != '{'))
                return false;             // closes the WRONG bracket
        }
    }
    return st.empty();                    // leftovers = opens never closed
}`,annotations:{7:`The ")(" trap: the very first character is a closer and the stack is empty. Forgetting this check is the number-one bug in this problem.`,9:`top() to read, pop() to remove — two calls, because pop() returns void.`,16:`The "(((" trap: the loop finishes clean but unclosed opens remain. Only an empty stack means fully matched.`},py:{code:`def isValid(s: str) -> bool:
    st = []                               # opens waiting for their closer
    pairs = {')': '(', ']': '[', '}': '{'}
    for c in s:
        if c in '([{':
            st.append(c)                  # open: park it, keep reading
        else:
            if not st:
                return False              # closer, but nothing is open
            if st.pop() != pairs[c]:
                return False              # closes the WRONG bracket
    return not st                         # leftovers = opens never closed`,annotations:{3:`A dict of closer -> opener replaces the three-way if chain: data instead of control flow. Adding a new bracket pair is now one entry, not three lines.`,8:`The ")(" trap: the very first character is a closer and the stack is empty. "not st" is the empty test — forgetting it is the number-one bug in this problem.`,10:`One call does what C++ needs two for: pop() removes and returns, so the compare reads as a single line.`,12:`The "(((" trap: the loop finishes clean but unclosed opens remain. Only an empty stack means fully matched.`}}},{type:`intuition`,title:`Min Stack — every element remembers its era`,md:"Design a stack where `push`, `pop`, `top`, AND `getMin` are all **O(1)** (LeetCode 155).\n\n- Naive: keep one `minSoFar` variable. Works until you **pop the minimum** — what is the new min? You would rescan: O(n). Fail.\n- The fix: like a receipt with a running total printed on every line — tear off the last line and the previous total is *right there*.\n- Push `{value, min-so-far}` as a pair. Pop discards the pair, and the pair below already carries the older min. No recomputation, ever.\n- Variant with less memory: a second stack that only pushes when a new value ≤ current min — pop it only when the main pop equals its top. Same O(1) bounds."},{type:`code`,lang:`cpp`,title:`Min Stack with a pair stack`,code:`class MinStack {
    stack<pair<int, int>> st;        // {value, min of the stack up to here}
public:
    void push(int x) {
        int mn = st.empty() ? x : min(x, st.top().second);
        st.push({x, mn});            // the min travels WITH the element
    }
    void pop() { st.pop(); }         // previous min re-surfaces: O(1)
    int top() { return st.top().first; }
    int getMin() { return st.top().second; }
};`,annotations:{2:`Cost: two ints per node. The two-stack variant stores mins only when they change — cheaper when new minimums are rare.`,5:`Each node records the min AS OF its push. History is frozen into the stack itself — nothing to recompute later.`,8:`This is the whole trick: popping automatically exposes the pair below, which carries the correct older min.`},py:{code:`class MinStack:
    def __init__(self):
        self.st = []                     # (value, min of the stack up to here)

    def push(self, x: int) -> None:
        mn = x if not self.st else min(x, self.st[-1][1])
        self.st.append((x, mn))          # the min travels WITH the element

    def pop(self) -> None:
        self.st.pop()                    # previous min re-surfaces: O(1)

    def top(self) -> int:
        return self.st[-1][0]

    def getMin(self) -> int:
        return self.st[-1][1]`,annotations:{3:`A tuple per node, immutable and cheap. The two-stack variant stores mins only when they change — cheaper when new minimums are rare.`,7:`Each node records the min AS OF its push. History is frozen into the stack itself — nothing to recompute later.`,10:`This is the whole trick: popping automatically exposes the tuple below, which carries the correct older min.`}}},{type:`intuition`,title:`THE pattern: the monotonic stack`,md:`Next Greater Element: for each value, find the first bigger value to its right. Picture a waiting room.

- Each element enters and **waits** for the first bigger value to arrive. Smaller arrivals cannot help it — they just queue up behind.
- When a big value walks in, it **dismisses** every smaller waiter in one sweep: "I am your answer." Pop, pop, pop. Then it starts waiting itself.
- The waiting room is the stack — and it stays **sorted (decreasing toward the top)** automatically. That standing invariant is why it is called *monotonic*.
- Brute force checks every pair: O(n²). The stack does it in one pass.
- Trigger phrases in problem statements: *"next greater/smaller"*, *"nearest taller to the left/right"*, *"days until warmer"*, *"span"*. Hear one → monotonic stack.`},{type:`visual`,component:`PointerBoxDiagram`,props:{title:`Next Greater Element on {4, 2, 1, 5, 3}, frame by frame`,notice:`The stack holds INDICES of elements still waiting. Values on it always decrease toward the top — a new bigger value pops (resolves) every smaller waiter, then joins.`,leftLabel:`stack (waiting indices)`,rightLabel:`array a[]`,frames:[{note:`i=0, value 4: the stack is empty — nothing to resolve. Index 0 starts waiting.`,stack:[{name:`i = 0`,to:`a0`},{name:`top: idx 0 (4)`,to:`a0`}],heap:[{id:`a0`,value:`4`,label:`NGE ?`},{id:`a1`,value:`2`,label:`NGE ?`},{id:`a2`,value:`1`,label:`NGE ?`},{id:`a3`,value:`5`,label:`NGE ?`},{id:`a4`,value:`3`,label:`NGE ?`}]},{note:`i=1, value 2 < 4: it resolves nobody. Push. Stack values top-down: 2, 4 — decreasing holds.`,stack:[{name:`i = 1`,to:`a1`},{name:`top: idx 1 (2)`,to:`a1`},{name:`idx 0 (4)`,to:`a0`}],heap:[{id:`a0`,value:`4`,label:`NGE ?`},{id:`a1`,value:`2`,label:`NGE ?`},{id:`a2`,value:`1`,label:`NGE ?`},{id:`a3`,value:`5`,label:`NGE ?`},{id:`a4`,value:`3`,label:`NGE ?`}]},{note:`i=2, value 1 < 2: push again. Three waiters now — 1, 2, 4 — all hoping for someone bigger.`,stack:[{name:`i = 2`,to:`a2`},{name:`top: idx 2 (1)`,to:`a2`},{name:`idx 1 (2)`,to:`a1`},{name:`idx 0 (4)`,to:`a0`}],heap:[{id:`a0`,value:`4`,label:`NGE ?`},{id:`a1`,value:`2`,label:`NGE ?`},{id:`a2`,value:`1`,label:`NGE ?`},{id:`a3`,value:`5`,label:`NGE ?`},{id:`a4`,value:`3`,label:`NGE ?`}]},{note:`i=3, value 5 arrives — the popping cascade begins. 5 > 1: index 2 is resolved. NGE[2] = 5. Pop.`,stack:[{name:`i = 3`,to:`a3`},{name:`idx 2 (1) POPPED`,to:`a2`,danger:!0},{name:`idx 1 (2)`,to:`a1`},{name:`idx 0 (4)`,to:`a0`}],heap:[{id:`a0`,value:`4`,label:`NGE ?`},{id:`a1`,value:`2`,label:`NGE ?`},{id:`a2`,value:`1`,label:`NGE = 5`},{id:`a3`,value:`5`,label:`NGE ?`},{id:`a4`,value:`3`,label:`NGE ?`}]},{note:`The cascade continues: 5 > 2 resolves index 1, then 5 > 4 resolves index 0. Stack empty — 5 pushes and starts its own wait.`,stack:[{name:`i = 3`,to:`a3`},{name:`top: idx 3 (5)`,to:`a3`}],heap:[{id:`a0`,value:`4`,label:`NGE = 5`},{id:`a1`,value:`2`,label:`NGE = 5`},{id:`a2`,value:`1`,label:`NGE = 5`},{id:`a3`,value:`5`,label:`NGE ?`},{id:`a4`,value:`3`,label:`NGE ?`}]},{note:`i=4, value 3 < 5: push. End of array reached with two waiters left.`,stack:[{name:`i = 4`,to:`a4`},{name:`top: idx 4 (3)`,to:`a4`},{name:`idx 3 (5)`,to:`a3`}],heap:[{id:`a0`,value:`4`,label:`NGE = 5`},{id:`a1`,value:`2`,label:`NGE = 5`},{id:`a2`,value:`1`,label:`NGE = 5`},{id:`a3`,value:`5`,label:`NGE ?`},{id:`a4`,value:`3`,label:`NGE ?`}]},{note:`Survivors never met anyone bigger: NGE = -1. Count the work: every index pushed ONCE, popped at most ONCE. At most 2n stack operations total — O(n), despite the nested-looking loop.`,stack:[{name:`top: idx 4 (3)`,to:`a4`},{name:`idx 3 (5)`,to:`a3`}],heap:[{id:`a0`,value:`4`,label:`NGE = 5`},{id:`a1`,value:`2`,label:`NGE = 5`},{id:`a2`,value:`1`,label:`NGE = 5`},{id:`a3`,value:`5`,label:`NGE = -1`},{id:`a4`,value:`3`,label:`NGE = -1`}]}]}},{type:`code`,lang:`cpp`,title:`Next Greater Element — the template`,code:`vector<int> nextGreater(const vector<int>& a) {
    int n = (int)a.size();
    vector<int> ans(n, -1);              // default: no greater exists
    stack<int> st;                       // indices; values DECREASE toward top
    for (int i = 0; i < n; i++) {
        while (!st.empty() && a[i] > a[st.top()]) {
            ans[st.top()] = a[i];        // a[i] is the first bigger they met
            st.pop();                    // resolved -- leaves forever
        }
        st.push(i);                      // i now waits for ITS bigger value
    }
    return ans;                          // {4,2,1,5,3} -> {5,5,5,-1,-1}
}`,annotations:{4:`The invariant: values on the stack strictly decrease toward the top. A bigger arrival must pop from the top until the invariant holds again — that popping IS the algorithm.`,6:`The nested-loop LOOK. But the while can only pop what a previous iteration pushed — each index enters once and leaves at most once.`,7:`Correctness in one line: everything between st.top() and i was smaller (already popped), so a[i] really is the NEAREST greater to the right.`},py:{code:`def nextGreater(a: list[int]) -> list[int]:
    n = len(a)
    ans = [-1] * n                       # default: no greater exists
    st = []                              # indices; values DECREASE toward top
    for i in range(n):
        while st and a[i] > a[st[-1]]:
            ans[st[-1]] = a[i]           # a[i] is the first bigger they met
            st.pop()                     # resolved -- leaves forever
        st.append(i)                     # i now waits for ITS bigger value
    return ans                           # [4,2,1,5,3] -> [5,5,5,-1,-1]`,annotations:{4:`The invariant: values on the stack strictly decrease toward the top (st[-1]). A bigger arrival must pop from the top until the invariant holds again — that popping IS the algorithm.`,6:`"while st and ..." — an empty list is falsy, so this is !st.empty() in Python spelling. The nested-loop LOOK is a lie: the while can only pop what a previous iteration pushed, so each index enters once and leaves at most once.`,7:`Correctness in one line: everything between st[-1] and i was smaller (already popped), so a[i] really is the NEAREST greater to the right.`}}},{type:`note`,md:`The O(n) argument, interview-ready: do not count loop nesting — **count stack operations**. Each of the n indices is pushed exactly once and popped at most once, so all iterations of the inner while across the whole run total at most n pops. Work ≤ 2n → **O(n)**. Same amortized logic as vector push_back: charge the work to the element, not to the loop.`},{type:`code`,lang:`cpp`,title:`Daily Temperatures (LeetCode 739) — same skeleton, new payout`,code:`vector<int> dailyTemperatures(const vector<int>& t) {
    int n = (int)t.size();
    vector<int> ans(n, 0);               // 0 = no warmer day ever comes
    stack<int> st;                       // indices of days still waiting
    for (int i = 0; i < n; i++) {
        while (!st.empty() && t[i] > t[st.top()]) {
            ans[st.top()] = i - st.top();    // answer = DISTANCE in days
            st.pop();
        }
        st.push(i);
    }
    return ans;   // {73,74,75,71,69,72,76,73} -> {1,1,4,2,1,1,0,0}
}`,annotations:{7:`The ONLY change from Next Greater Element: store the gap i - st.top() instead of the value. Storing indices (not values) on the stack is what makes the whole family solvable with one template.`,12:`Trace day 2 (temp 75): it waits through 71, 69, 72 and is finally resolved by 76 at day 6 — distance 4. The stack skipped every non-answer in O(1) amortized.`},py:{code:`def dailyTemperatures(t: list[int]) -> list[int]:
    n = len(t)
    ans = [0] * n                        # 0 = no warmer day ever comes
    st = []                              # indices of days still waiting
    for i in range(n):
        while st and t[i] > t[st[-1]]:
            ans[st[-1]] = i - st[-1]     # answer = DISTANCE in days
            st.pop()
        st.append(i)
    return ans   # [73,74,75,71,69,72,76,73] -> [1,1,4,2,1,1,0,0]`,annotations:{7:`The ONLY change from Next Greater Element: store the gap i - st[-1] instead of the value. Storing indices (not values) on the stack is what makes the whole family solvable with one template.`,10:`Trace day 2 (temp 75): it waits through 71, 69, 72 and is finally resolved by 76 at day 6 — distance 4. The stack skipped every non-answer in O(1) amortized.`}}},{type:`intuition`,title:`Largest Rectangle in Histogram — the boss fight`,md:`Every bar dreams of the widest rectangle at **its own height**. That rectangle extends left and right until a **shorter** bar blocks it on each side (LeetCode 84).

- So each bar's answer needs: nearest shorter bar on the left, nearest shorter on the right. "Nearest shorter" — that is a monotonic stack sentence.
- Keep an **increasing** stack of indices. When a shorter bar arrives, every taller bar on the stack just met its **right wall** — pop each one and settle its area on the spot.
- For a popped bar: right wall = current index \`i\`, left wall = the index now under it on the stack. Width = \`i − left − 1\`.
- End of array: append a phantom bar of height 0 (the *sentinel*) — shorter than everything, it flushes every survivor.
- One pass, each bar pushed once and popped once: **O(n)**. Brute force per-bar expansion is O(n²).`},{type:`code`,lang:`cpp`,title:`Largest Rectangle in Histogram`,code:`int largestRectangleArea(const vector<int>& h) {
    int n = (int)h.size(), best = 0;
    stack<int> st;                       // indices; heights INCREASE toward top
    for (int i = 0; i <= n; i++) {
        int cur = (i == n) ? 0 : h[i];   // sentinel bar of height 0 at the end
        while (!st.empty() && h[st.top()] > cur) {
            int height = h[st.top()];
            st.pop();
            int left = st.empty() ? -1 : st.top();
            best = max(best, height * (i - left - 1));
        }
        st.push(i);
    }
    return best;                         // {2,1,5,6,2,3} -> 10
}`,annotations:{5:`The sentinel trick: i runs to n with a phantom height of 0. It is shorter than every bar, so the stack fully drains and every bar gets settled — no leftover cases.`,6:`Increasing stack this time (Next Greater used decreasing). Rule of thumb: hunting for nearest SMALLER neighbors → keep the stack increasing.`,10:`The popped bar spans (left, i) exclusive: first shorter bar on each side. Width = i - left - 1. Trace {2,1,5,6,2,3}: when 2 arrives at i=4, bar 6 settles 6x1, bar 5 settles 5x2 = 10 — the answer.`},py:{code:`def largestRectangleArea(h: list[int]) -> int:
    n, best = len(h), 0
    st = []                              # indices; heights INCREASE toward top
    for i in range(n + 1):
        cur = 0 if i == n else h[i]      # sentinel bar of height 0 at the end
        while st and h[st[-1]] > cur:
            height = h[st.pop()]         # read and remove in one move
            left = st[-1] if st else -1
            best = max(best, height * (i - left - 1))
        st.append(i)
    return best                          # [2,1,5,6,2,3] -> 10`,annotations:{5:`The sentinel trick: i runs to n with a phantom height of 0. It is shorter than every bar, so the stack fully drains and every bar gets settled — no leftover cases.`,6:`Increasing stack this time (Next Greater used decreasing). Rule of thumb: hunting for nearest SMALLER neighbors → keep the stack increasing.`,9:`The popped bar spans (left, i) exclusive: first shorter bar on each side. Width = i - left - 1. Trace [2,1,5,6,2,3]: when 2 arrives at i=4, bar 6 settles 6x1, bar 5 settles 5x2 = 10 — the answer.`}}},{type:`intuition`,title:`Queue from two stacks — two wrongs make a right`,md:"Classic design question (LeetCode 232): build a FIFO queue using only LIFO stacks.\n\n- Two stacks: `in` collects arrivals, `out` serves departures.\n- A stack reverses order. Pour `in` into `out` and it reverses **again** — the oldest element lands on top of `out`. Two reversals = arrival order restored.\n- The rule that makes it correct: pour **only when `out` is empty**. Elements already in `out` are older than everything in `in` and must leave first.\n- The amortized argument: any single `pop` might pour n elements — O(n). But each element, over its whole lifetime, is pushed at most twice and popped at most twice (once per stack). Total work for n elements ≤ 4n → **amortized O(1)** per operation."},{type:`code`,lang:`cpp`,title:`Queue via two stacks, amortized O(1)`,code:`class MyQueue {
    stack<int> in, out;             // in: arrivals. out: departures (reversed)
    void shift() {
        if (!out.empty()) return;   // pour ONLY when out is empty
        while (!in.empty()) {
            out.push(in.top());
            in.pop();
        }
    }
public:
    void push(int x) { in.push(x); }                             // O(1)
    int pop() { shift(); int f = out.top(); out.pop(); return f; }
    int peek() { shift(); return out.top(); }
    bool empty() { return in.empty() && out.empty(); }
};`,annotations:{4:`Pouring while out still holds elements would bury older elements under newer ones — order corrupted. The guard IS the correctness.`,6:`The double reversal happening live: in has newest-on-top; pushing across flips it, so out ends with OLDEST on top. Exactly FIFO.`,12:`Worst case for one call: O(n) full pour. Amortized: each element moves at most twice ever, so n operations cost O(n) total. Say both numbers in the interview.`},py:{code:`class MyQueue:
    def __init__(self):
        self.inbox = []                 # arrivals ("in" is a keyword)
        self.outbox = []                # departures (reversed)

    def _shift(self) -> None:
        if self.outbox:
            return                      # pour ONLY when outbox is empty
        while self.inbox:
            self.outbox.append(self.inbox.pop())

    def push(self, x: int) -> None:
        self.inbox.append(x)            # O(1)

    def pop(self) -> int:
        self._shift()
        return self.outbox.pop()

    def peek(self) -> int:
        self._shift()
        return self.outbox[-1]

    def empty(self) -> bool:
        return not self.inbox and not self.outbox`,annotations:{7:`Pouring while outbox still holds elements would bury older elements under newer ones — order corrupted. The guard IS the correctness.`,10:`The double reversal happening live, in one line: inbox.pop() takes the newest, append puts it on outbox — so outbox ends with the OLDEST on top. Exactly FIFO.`,17:`Worst case for one call: O(n) full pour. Amortized: each element moves at most twice ever, so n operations cost O(n) total. Say both numbers in the interview.`}}},{type:`note`,md:`Forward reference, one line: **Sliding Window Maximum** (LeetCode 239) is this module's pattern rotated 90° — a monotonic **deque** where the front always holds the window's max, smaller values are popped from the back on arrival, and expired indices are popped from the front. Full walkthrough in the hard-patterns module; for now just wire the trigger: *"max/min of every window"* → deque.`}],quiz:[{question:`The Next Greater Element solution has a while loop inside a for loop. Its time complexity is…`,options:[{text:`O(n²) — nested loops multiply`,explanation:`Nesting multiplies only when the inner loop can run fresh work each iteration. This while can only pop indices that were pushed once — total pops across the ENTIRE run ≤ n.`},{text:`O(n) — each index is pushed once and popped at most once, so total stack operations ≤ 2n`,explanation:`Correct. Count stack operations, not loop nesting. The inner while's lifetime total is bounded by the number of pushes: n. Work ≤ 2n → O(n).`},{text:`O(n log n) — the stack acts like a sorted structure`,explanation:`The stack stays sorted by the push/pop discipline alone — no log-cost searches or rebalancing ever happen.`}],correct:1},{question:`isValid(")(") — one closer, one opener, equal counts. What does the stack solution return, and why?`,options:[{text:`true — every open has a matching close`,explanation:`Counting matches is not enough — ORDER matters. The first character is a closer while nothing is open. This is exactly why the problem needs a stack, not counters.`},{text:`false — the first ")" arrives when the stack is empty`,explanation:`Correct. A closer with an empty stack is failure mode #2. The st.empty() check catches it immediately.`},{text:`false — but only because the stack is non-empty at the end`,explanation:`It never gets that far: the ")" fails on the empty-stack check at index 0. The end-of-scan check catches a DIFFERENT failure ("(((").`}],correct:1},{question:`Min Stack: why does keeping a single minSoFar variable fail?`,options:[{text:`It works — min only changes on push`,explanation:`Min also changes on POP: pop the minimum and the variable is stale, with no way to recover the previous min without an O(n) rescan.`},{text:`Because when the current minimum is popped, the previous minimum is unrecoverable without a rescan`,explanation:`Correct. The fix stores the min-so-far WITH each element (pair stack), so popping automatically exposes the older min. All ops O(1).`},{text:`Because getMin must also remove the minimum`,explanation:`getMin only reads — it never removes. The problem is history: one variable cannot remember all the previous minimums.`}],correct:1},{question:`In the Next Greater Element stack, the values (bottom to top) are always…`,options:[{text:`Increasing — smallest at the bottom`,explanation:`Backwards. If a new value were bigger than the top, it would have popped it. What survives below is bigger, not smaller.`},{text:`Decreasing — every survivor is bigger than everything above it`,explanation:`Correct. A new element pops everything smaller before pushing, so the stack stays sorted decreasing toward the top. That standing order is the "monotonic" invariant.`},{text:`Unordered — it depends on the input`,explanation:`The input varies, the invariant does not: the pop-before-push discipline enforces sorted order on every possible input.`}],correct:1},{question:`Two-stack queue: you push 1, 2, 3 (so "in" has 3 on top), then call pop(). What comes out and what is the cost of that call?`,options:[{text:`3, in O(1) — stacks pop the top`,explanation:`That would be LIFO — the whole point is to build FIFO. The pour into "out" reverses the order before anything leaves.`},{text:`1, and this particular call costs O(n) because "out" was empty and all elements were poured`,explanation:`Correct. The pour flips 3-2-1 into 1-on-top: FIFO restored. This call is O(n), but each element moves at most twice ever → amortized O(1).`},{text:`1, in O(1) always — the structure is a real queue`,explanation:`The RESULT is right but the cost is not: an empty "out" forces a full O(n) pour on this call. O(1) is only the amortized figure.`}],correct:1},{question:`Largest Rectangle: bar at index t is popped because h[t] > cur at index i, and the new stack top is "left". The popped bar's rectangle width is…`,options:[{text:`i − t`,explanation:`That measures from the bar to the right wall only — it ignores how far the bar extends LEFT (everything between left and t was taller and already popped).`},{text:`i − left − 1`,explanation:`Correct. First shorter bar on the right is at i, first shorter on the left is at "left" — the bar spans the open interval between them: (i − 1) − (left + 1) + 1 = i − left − 1.`},{text:`t − left`,explanation:`That ignores the right side entirely — the bar extends right past t until index i blocks it.`}],correct:1},{question:`"Return the maximum of every window of size k as it slides" — which container drives the O(n) solution?`,options:[{text:`stack — monotonic, like Next Greater Element`,explanation:`Close family, wrong end-count: a window expires elements at the FRONT while new ones arrive at the BACK. A stack only works one end.`},{text:`deque — pop smaller values from the back, pop expired indices from the front`,explanation:`Correct. The monotonic deque: front always holds the current max, both ends do O(1) work, each index enters and leaves once → O(n).`},{text:`priority_queue — always gives the max`,explanation:`It gives A max in O(log n), but cannot evict expired elements from the middle — the standard workarounds are lazily deferred deletes or accepting O(n log n). The deque is the O(n) answer.`}],correct:1}],interviewQuestions:[{question:`Your Next Greater Element solution has a loop inside a loop. Convince me it is O(n) — the full argument.`,answer:`Count stack operations, not loop nesting. Each of the n indices is pushed exactly once (line: st.push(i)) and popped at most once — once popped, an index never returns. The inner while only ever pops, so ALL its iterations across the entire run total at most n. Work ≤ n pushes + n pops = 2n → O(n). The general principle is amortized analysis: charge each unit of work to the element that caused it, and bound per-element lifetime cost. Same argument shape as vector push_back doubling and the two-stack queue.`,isCaseBased:!1},{question:`Solve Valid Parentheses and name every edge case before I ask for them.`,answer:`Scan once: open brackets push; a closer must match the stack top, which then pops. Edge cases, unprompted: (1) closer on empty stack — ")(" — check st.empty() before top(); (2) mismatched pair — "(]" — compare against the popped open; (3) leftover opens — "(((" — the final answer is st.empty(), not true. O(n) time, O(n) space worst case (all opens). Bonus flourish: with only one bracket type, a counter that must never go negative replaces the stack — O(1) space. Multiple types need the stack because the counter forgets WHICH bracket is open.`,isCaseBased:!1},{question:`Design a Min Stack: push, pop, top, getMin — all O(1). Compare your options.`,answer:`Option A, pair stack: each node stores {value, min-of-stack-at-push-time}. getMin = top().second; pop automatically restores the previous min because the node below carries it. All O(1), cost: 2 ints per node. Option B, two stacks: main stack plus a min stack that pushes only when x <= current min, and pops only when the popped value equals its top (<= not < — duplicates of the min must each get an entry, or one pop strands a stale min). Less memory when minimums are rare, slightly trickier correctness. Interview default: pair stack — simpler to get right under pressure. The transferable idea: make each element carry the aggregate of its era, so popping restores history for free.`,isCaseBased:!1},{question:`Case: your Daily Temperatures brute force — for every day, scan right until a warmer day — TLEs at n = 1e5. The interviewer asks what you do now.`,answer:`First name the damage: worst case is a decreasing array, every scan runs to the end, O(n²) = 1e10 operations — hopeless at 1e5. Then name the pattern: "first warmer day to the right" is Next Greater Element in costume → monotonic stack. Keep a stack of indices of days still waiting; when today is warmer than the top, resolve it with ans[top] = i − top (distance, not value) and pop; repeat, then push today. Each index pushed once, popped at most once → O(n) time, O(n) stack. The interview meta-skill: TLE on a "nearest greater/smaller" scan is the cue to say "monotonic stack" out loud.`,isCaseBased:!0},{question:`Explain Largest Rectangle in Histogram: the core insight, the width formula, and the sentinel.`,answer:`Insight: the best rectangle is some bar stretched to its limits — it extends left and right until the first SHORTER bar on each side. So the problem reduces to nearest-smaller-neighbor on both sides: a monotonic stack job. Keep an increasing stack of indices. When h[i] is shorter than the top, the top bar has found its right wall (i); its left wall is the index beneath it on the stack (left) — everything between was taller and already popped. Settle area = h[t] × (i − left − 1); if the stack empties, left = −1 (the bar reaches the array edge). The sentinel: run i to n with a phantom height 0, shorter than everything, so the stack drains and every bar settles — no special end-of-array handling. Each bar pushed once, popped once → O(n), versus O(n²) brute-force expansion. Follow-up worth knowing: Maximal Rectangle in a binary matrix = run this per row over accumulated column heights.`,isCaseBased:!1},{question:`Case: you implement a queue with two stacks. The interviewer objects: "your pop is O(n) — that is worse than a normal queue." Defend or concede.`,answer:`Defend, with the amortized argument: a single pop can indeed cost O(n) when "out" is empty and everything pours across. But follow one element's lifetime: pushed onto "in" once, moved to "out" at most once, popped once — at most 2 pushes + 2 pops ever, regardless of interleaving. So n operations cost at most about 4n stack ops → amortized O(1) per operation, same guarantee class as vector push_back. Concede the honest caveat: the WORST-CASE latency of one call is O(n), so for a hard real-time system a real deque is better. Also volunteer the invariant that makes it correct: pour only when "out" is empty, otherwise older elements get buried under newer ones.`,isCaseBased:!0},{question:`Case: Online Stock Span — a stream of daily prices; for each new price, return how many consecutive previous days (including today) had price ≤ today. The interviewer wants better than rescanning.`,answer:`Rescanning is O(n) per day, O(n²) total. This is "nearest STRICTLY GREATER to the left" in disguise: today's span runs back to the previous day with a higher price. Monotonic stack of {price, span} pairs: while the top's price ≤ today, pop it and absorb its span into today's (it can never end anyone's streak again — today dominates it); push {today, span}. Each day pushed once, popped at most once → amortized O(1) per query, O(n) total. The compression insight worth saying: popped days do not need to be remembered individually — their span total is all the future needs. Direction rule: "to the left" patterns process the stream forward with the stack holding the past.`,isCaseBased:!0},{question:`When do you keep the monotonic stack decreasing, and when increasing? Give the rule, not memorized cases.`,answer:`The rule: the arriving element pops everything it RESOLVES, so the stack keeps only elements the current arrival cannot answer. Hunting next GREATER → a big arrival resolves smaller waiters → smaller ones get popped → survivors are bigger → stack decreases toward the top. Hunting next SMALLER (histogram walls) → mirror image → stack increases. Memory hook: the stack stays sorted in the direction that keeps every element still hopeful. Second axis: nearest-to-the-RIGHT resolves elements at pop time (NGE, Daily Temperatures); nearest-to-the-LEFT reads the answer at push time — it is whatever remains on top after popping (Stock Span, histogram left wall).`,isCaseBased:!1},{question:`Pick the C++ container for each and justify: iterative DFS, BFS, sliding-window maximum. And why does std::stack refuse to let you iterate?`,answer:`Iterative DFS → stack<node> (LIFO mirrors the recursion call stack). BFS → queue<node> (FIFO guarantees level order — visit distance-k nodes before k+1). Sliding-window maximum → raw deque<int> of indices, because BOTH ends work: back pops smaller values on arrival, front pops indices that slid out of the window; neither adapter exposes both ends. std::stack blocks iteration by design: adapters sell a discipline, and hiding begin()/end() makes violating LIFO a compile error instead of a subtle bug. Needing to inspect the middle is the signal you wanted a deque or vector all along.`,isCaseBased:!1},{question:`A teammate writes: int x = st.pop(); — it does not compile. Explain the design decision behind pop() returning void.`,answer:`C++ separates reading (top()) from removing (pop()) deliberately. If pop() returned the element by value, the copy out could throw (for a non-trivial element type) AFTER the stack had already removed the node — the element would be lost forever, violating the strong exception guarantee. Two smaller operations, each safe, compose better than one risky one. The idiom: int x = st.top(); st.pop(); — read first, then drop. Same story for queue::front()/pop(). Worth a sentence in interviews because it shows you know the API is shaped by exception safety, not oversight.`,isCaseBased:!1}],flashcards:[{front:`Monotonic stack — trigger phrases`,back:`"Next greater/smaller", "nearest taller/shorter to the left/right", "days until warmer", "span". Any per-element nearest-X hunt → monotonic stack, O(n).`},{front:`Why Next Greater Element is O(n) despite the nested while`,back:`Each index is pushed once and popped at most once → total stack ops ≤ 2n. Count operations per ELEMENT, not loop nesting.`},{front:`Min Stack recipe`,back:`Push pairs {value, min-so-far}. getMin = top's second field. Pop automatically restores the previous min — all ops O(1).`},{front:`Valid Parentheses — the three failure modes`,back:`(1) closer mismatches the stack top; (2) closer arrives on an EMPTY stack — ")("; (3) stack non-empty at the end — "(((". Return st.empty() at the end.`},{front:`Queue from two stacks — rule + cost`,back:`Push onto "in"; pop/peek from "out"; pour in→out ONLY when out is empty. Each element moves ≤ 2 times ever → amortized O(1), worst single call O(n).`},{front:`The pop() gotcha in C++`,back:`stack/queue pop() returns VOID. Idiom: top()/front() to read, then pop() to remove. Reason: exception safety — remove-and-return could lose the element.`},{front:`Histogram — popped bar's area`,back:`height = h[top]; right wall = i (first shorter right); left wall = new stack top (first shorter left, −1 if empty). Area = height × (i − left − 1).`},{front:`Decreasing vs increasing monotonic stack`,back:`Hunting next GREATER → stack decreases toward top (bigger arrivals pop smaller waiters). Hunting next SMALLER → stack increases. Survivors are the still-hopeful.`},{front:`Histogram sentinel trick`,back:`Loop i from 0 to n with height 0 at i = n. The phantom shortest bar drains the stack, settling every bar — no end-of-array special case.`},{front:`Sliding window maximum — the tool`,back:`Monotonic DEQUE of indices: front = current max, pop_back smaller values on arrival, pop_front expired indices. O(n) total. (Hard-patterns module.)`}],mindmapMarkdown:`- Stacks, Queues & the Monotonic Stack
  - Adapters over deque
    - stack LIFO: push / top / pop
    - queue FIFO: push / front / pop
    - pop() returns VOID — top() first
    - deque: O(1) both ends + indexing
  - Valid Parentheses
    - open → push · close → must match top
    - fail: mismatch · empty-stack closer · leftovers
  - Min Stack
    - pair {value, min-so-far}
    - pop restores old min → all O(1)
  - Monotonic stack (the star)
    - invariant: stack stays sorted
    - push once + pop once → O(n)
    - Next Greater Element: decreasing stack
    - Daily Temperatures: store distance i − top
    - Stock Span: nearest greater LEFT
    - Largest Rectangle in Histogram
      - pop = bar met its right wall
      - width = i − left − 1
      - sentinel height 0 drains the stack
  - Queue via two stacks
    - pour only when out is empty
    - element moves ≤ 2× → amortized O(1)
  - Deque → sliding window max (hard patterns)`};export{e as default};