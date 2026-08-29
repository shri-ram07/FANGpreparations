import type { Module } from '../types'

const m: Module = {
  id: 'dsa-l3-dp-1d-grid',
  subjectId: 'dsa',
  level: 3,
  title: 'DP I: The Ladder Begins — 1D & Grid DP',
  whyItMatters:
    'DP is the most feared word in FAANG prep — and the most reliably asked hard topic. The fear is a marketing problem: every DP problem is the same 4-step recipe wearing a different costume. This module installs that recipe on the two easiest families, 1D and grids, so the rest of the ladder (knapsack, LIS, strings, trees) becomes reps, not new theory.',
  estMinutes: 60,
  sections: [
    {
      type: 'intuition',
      title: 'DP is remembering, nothing more',
      md: `You did homework yesterday: 23 × 47 = 1081. Today the same question appears. You don't recompute — you look at yesterday's page.

- **Dynamic programming** = solve each subproblem once, write the answer down, reuse it forever. The name is historical noise; the idea is a notebook.
- It applies when two things hold. **Overlapping subproblems**: the same smaller question keeps reappearing. **Optimal substructure**: the big answer is built from the best answers to smaller questions.
- Hello-world: Fibonacci. \`fib(n) = fib(n-1) + fib(n-2)\`. Compute \`fib(5)\` naively and the call tree solves \`fib(3)\` twice and \`fib(2)\` three times. Same question, re-derived from scratch, again and again.
- The tree doubles as n grows: **O(2ⁿ)**. Add a notebook and there are only n+1 distinct questions: **O(n)**.
- One sentence for interviews: *"DP is a carefully organized brute force — same recursion, but no question is ever answered twice."*`,
    },
    {
      type: 'hinglish',
      md: `DP ka matlab bas itna: ek **register** rakho. Jo sawal ek baar solve kar liya, uska jawab likh ke rakh lo — agli baar *wahi* sawal aaye to dobara mat socho, seedha register se utha lo. Fibonacci pe dekho: bina yaaddasht ke \`fib(5)\` apne andar \`fib(3)\` do baar aur \`fib(2)\` teen baar solve karta hai — tree phat ke **2ⁿ** ban jaata hai. Yaaddasht ke saath har sawal sirf EK baar solve hota hai — 2ⁿ se seedha **n**. Bas. Poora DP yehi hai: recursion + register.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'The brute force: fib straight from the definition',
      code: `long long fibNaive(int n) {
    if (n <= 1) return n;                    // fib(0)=0, fib(1)=1
    return fibNaive(n - 1) + fibNaive(n - 2);
}
// fibNaive(5) alone recomputes fib(3) twice and fib(2) three times.
// fibNaive(45): seconds. fibNaive(80): ~2 years at a billion calls/sec.`,
      annotations: {
        3: 'Two recursive calls per call — a binary tree of work. Depth n, so the call count explodes exponentially: O(2ⁿ).',
        6: 'Not hyperbole: the fib(80) call tree has ~7×10¹⁶ nodes. The answer itself needs 12 digits — hence long long.',
      },
      py: {
        code: `def fibNaive(n: int) -> int:
    if n <= 1:
        return n                             # fib(0)=0, fib(1)=1
    return fibNaive(n - 1) + fibNaive(n - 2)

# fibNaive(5) alone recomputes fib(3) twice and fib(2) three times.
# fibNaive(35) already takes seconds in Python; fibNaive(80) is geological.`,
        annotations: {
          4: 'Two recursive calls per call — a binary tree of work. Depth n, so the call count explodes exponentially: O(2ⁿ). And Python\'s per-call overhead is ~50x C++\'s, so the wall hits sooner.',
          7: 'Not hyperbole: the fib(80) call tree has ~7×10¹⁶ nodes. No long long needed for the answer though — Python ints are arbitrary precision, so fib(80) = 23416728348467685 comes out exact.',
        },
      },
    },
    {
      type: 'note',
      md: 'On the chart below, find the **2ⁿ** curve and the **n** curve, then drag the slider. That vertical gap — the one that stops fitting on the screen — is what ONE array of remembered answers buys. Same function, same recursion, one notebook.',
    },
    { type: 'visual', component: 'BigOGrowthChart', props: {} },
    {
      type: 'intuition',
      title: 'Style 1 — memoization: recursion plus a cache',
      md: `**Memoization** (top-down DP) = keep the recursive function, add a lookup before computing and a save after.

- Before working: *"have I answered this exact question before?"* If yes, return the stored answer — O(1).
- After working: store the answer before returning it.
- The recursion itself is untouched. That is the superpower: **any correct brute-force recursion becomes DP in two lines.**`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Memoized fib — the same function, now with a register',
      code: `long long fibMemo(int n, vector<long long>& memo) {
    if (n <= 1) return n;
    if (memo[n] != -1) return memo[n];   // asked before? read the register
    return memo[n] = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
}

// call site
int n = 80;
vector<long long> memo(n + 1, -1);       // -1 = "never solved"
long long ans = fibMemo(n, memo);        // n+1 real computations, total`,
      annotations: {
        3: 'The line that turns 2ⁿ into n. Every duplicate branch of the call tree dies here in O(1).',
        4: 'Assign and return in one move — the answer is saved on the way out, so the NEXT asker hits line 3.',
        9: '-1 works as "empty" because fib values are never negative. Pick a sentinel your real values cannot collide with.',
      },
      py: {
        code: `from functools import lru_cache

def fibMemo(n: int, memo: list[int]) -> int:
    if n <= 1:
        return n
    if memo[n] != -1:
        return memo[n]                       # asked before? read the register
    memo[n] = fibMemo(n - 1, memo) + fibMemo(n - 2, memo)
    return memo[n]                           # saved on the way out

# call site
n = 80
memo = [-1] * (n + 1)                        # -1 = "never solved"
ans = fibMemo(n, memo)                       # n+1 real computations, total

# the Python shortcut for the same thing:
@lru_cache(maxsize=None)
def fib(n: int) -> int:
    return n if n <= 1 else fib(n - 1) + fib(n - 2)`,
        annotations: {
          6: 'The line that turns 2ⁿ into n. Every duplicate branch of the call tree dies here in O(1).',
          8: 'No assign-and-return in one expression, so this is two lines where C++ is one. Same effect: the answer is stored on the way out, and the next asker stops at line 6.',
          13: '-1 works as "empty" because fib values are never negative. Pick a sentinel your real values cannot collide with — or use a dict and "if n in memo", which needs no sentinel at all.',
          17: 'functools.cache (3.9+) — or lru_cache(maxsize=None) — memoizes any pure function on its arguments: one decorator replaces the whole table. Name it in the interview, then show the explicit version: they want to see you know what it does. Caveat: arguments must be hashable, so a list state has to become a tuple.',
        },
      },
    },
    {
      type: 'intuition',
      title: 'Style 2 — tabulation: start from the base, loop up',
      md: `**Tabulation** (bottom-up DP) flips the direction: no recursion, no waiting for questions. Fill a table from the smallest answers upward.

- \`dp[0]\` and \`dp[1]\` are known. \`dp[2]\` needs only those. \`dp[3]\` needs \`dp[1]\`, \`dp[2]\`. A plain loop, left to right.
- Every value you read is already final — because you chose an order that guarantees it.
- No recursion means no call-stack limit and less overhead. And once the loop exists, a space trick unlocks (below).`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Tabulated fib, then the O(1)-space version',
      code: `long long fibTab(int n) {                // bottom-up: no recursion at all
    if (n <= 1) return n;
    vector<long long> dp(n + 1);
    dp[0] = 0; dp[1] = 1;                // base cases go in FIRST
    for (int i = 2; i <= n; i++)
        dp[i] = dp[i - 1] + dp[i - 2];   // reads only already-final cells
    return dp[n];
}

long long fibRolling(int n) {            // space-optimized: O(1)
    if (n <= 1) return n;
    long long prev2 = 0, prev1 = 1;
    for (int i = 2; i <= n; i++) {
        long long cur = prev1 + prev2;
        prev2 = prev1;                   // slide the two-value window
        prev1 = cur;
    }
    return prev1;
}`,
      annotations: {
        5: 'Left to right IS a decision — the iteration order must ensure every dp value you read is already computed.',
        12: 'The transition only ever looks back two slots. So keep two variables and throw the whole array away: O(n) → O(1) space.',
      },
      py: {
        code: `def fibTab(n: int) -> int:               # bottom-up: no recursion at all
    if n <= 1:
        return n
    dp = [0] * (n + 1)
    dp[0], dp[1] = 0, 1                  # base cases go in FIRST
    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]    # reads only already-final cells
    return dp[n]

def fibRolling(n: int) -> int:           # space-optimized: O(1)
    if n <= 1:
        return n
    prev2, prev1 = 0, 1
    for _ in range(2, n + 1):
        prev2, prev1 = prev1, prev1 + prev2   # slide the two-value window
    return prev1`,
        annotations: {
          6: 'range(2, n + 1) — the stop is EXCLUSIVE, so the +1 is what makes the loop reach n. Left to right is a decision, not a habit: the order must guarantee every value you read is already final.',
          15: 'The transition only ever looks back two slots, so two names replace the whole list. Simultaneous assignment evaluates the entire right side first — no temp, and no way to clobber prev1 before it is used. C++ needs three statements for this one line.',
        },
      },
    },
    {
      type: 'intuition',
      title: 'Memoization vs tabulation — when each feels natural',
      md: `Both cost the same: **O(number of states × work per transition)**. The choice is ergonomics:

- **Memoization** feels natural when you already have the brute-force recursion (add two lines), when the transition is easiest to state recursively, or when only a fraction of states is ever reachable — it computes only what is actually asked.
- **Tabulation** feels natural when all states get used anyway, when n is big enough that recursion depth would blow the stack (~10⁵ frames), and when you want the rolling space trick — that needs a loop.
- Interview default: derive top-down to find the recurrence, then present bottom-up if the interviewer pushes on space or stack depth. Saying that plan out loud scores points.`,
    },
    {
      type: 'intuition',
      title: 'THE recipe — four steps, every DP problem, forever',
      md: `This is the spine of the entire DP ladder. Every problem below runs it verbatim.

1. **Define the state** — one sentence: *"dp[i] = the answer to what question?"* If you can't say it in one sentence, the state is wrong.
2. **Write the transition** — express dp[i] using smaller states. The trick that always works: ask *"what was the LAST choice?"* and take max/min/sum over its options.
3. **Set base cases** — the smallest questions with obvious answers. Get these wrong and everything downstream is politely, confidently wrong.
4. **Pick the iteration order** — every value you read must already be final. (Top-down skips this step: recursion finds the order for you.)`,
    },
    {
      type: 'intuition',
      title: 'Climbing Stairs — fib in a costume',
      md: `*"You climb a staircase of n steps, taking +1 or +2 at a time. How many distinct ways to reach the top?"*

- **State**: \`dp[i]\` = number of ways to stand on step i.
- **Transition**: the LAST hop was +1 (from step i−1) or +2 (from step i−2). Those two groups of paths share no member — disjoint groups **add**: \`dp[i] = dp[i-1] + dp[i-2]\`.
- **Base**: \`dp[0] = 1\` (one way to be at the bottom: do nothing), \`dp[1] = 1\`.
- **Order**: left to right. That's fib with different base cases — same skeleton, new costume.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Climbing Stairs — the recipe, executed',
      code: `int climbStairs(int n) {
    // 1. state: dp[i] = number of distinct ways to stand on step i
    // 2. transition: dp[i] = dp[i-1] + dp[i-2]  (last hop was +1 or +2)
    // 3. base: dp[0] = 1, dp[1] = 1
    // 4. order: i = 2 .. n, left to right
    int prev2 = 1, prev1 = 1;
    for (int i = 2; i <= n; i++) {
        int cur = prev1 + prev2;
        prev2 = prev1;
        prev1 = cur;
    }
    return prev1;
}`,
      annotations: {
        3: 'ADD, not max — nothing is "best" here, we are counting. The two groups are disjoint because they differ in the final hop.',
        4: 'dp[0] = 1, not 0: there is exactly one way to have gone nowhere. "Ways to do nothing = 1" is a recurring base-case idiom.',
        6: 'Straight to the rolling form — fib already taught us the array is optional when lookback is fixed at 2.',
      },
      py: {
        code: `def climbStairs(n: int) -> int:
    # 1. state: dp[i] = number of distinct ways to stand on step i
    # 2. transition: dp[i] = dp[i-1] + dp[i-2]  (last hop was +1 or +2)
    # 3. base: dp[0] = 1, dp[1] = 1
    # 4. order: i = 2 .. n, left to right
    prev2, prev1 = 1, 1
    for _ in range(2, n + 1):
        prev2, prev1 = prev1, prev1 + prev2
    return prev1`,
        annotations: {
          3: 'ADD, not max — nothing is "best" here, we are counting. The two groups are disjoint because they differ in the final hop.',
          4: 'dp[0] = 1, not 0: there is exactly one way to have gone nowhere. "Ways to do nothing = 1" is a recurring base-case idiom.',
          6: 'Straight to the rolling form — fib already taught us the list is optional when lookback is fixed at 2. The loop variable is never read, hence _.',
        },
      },
    },
    {
      type: 'intuition',
      title: 'House Robber — the adjacent constraint',
      md: `*"Houses in a row hold loot \`a[i]\`. Rob any subset, but never two adjacent houses. Maximize loot."*

- Greedy ("grab the richest house") dies fast: \`[2, 7, 9]\` — grabbing 7 blocks both neighbors; the answer is 2+9=11.
- **State**: \`dp[i]\` = best loot using only houses 0..i.
- **Transition** — last choice, two options at house i. **Skip it**: keep \`dp[i-1]\`. **Rob it**: house i−1 is now forbidden, so the best partner is \`dp[i-2] + a[i]\`. Take the max: \`dp[i] = max(dp[i-1], dp[i-2] + a[i])\`.
- **Base**: \`dp[0] = a[0]\`, \`dp[1] = max(a[0], a[1])\`. **Order**: left to right.
- This transition shape — *max(skip, take + jump)* — returns in knapsack, LIS, and half the ladder. Learn it by name.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'House Robber — dp array version',
      code: `int rob(vector<int>& a) {
    int n = a.size();
    if (n == 1) return a[0];
    vector<int> dp(n);                   // dp[i] = best loot from houses 0..i
    dp[0] = a[0];
    dp[1] = max(a[0], a[1]);
    for (int i = 2; i < n; i++)
        dp[i] = max(dp[i - 1],           // choice 1: skip house i
                    dp[i - 2] + a[i]);   // choice 2: rob it (i-1 forbidden)
    return dp[n - 1];
}`,
      annotations: {
        4: 'Say the state out loud in interviews: "dp[i] is the best loot considering houses 0 through i." One sentence — step 1 of the recipe.',
        8: 'Skipping house i means yesterday\'s best simply carries forward. dp[i-1] does NOT mean house i-1 was robbed — it means the best plan so far.',
        9: 'Robbing house i bans i-1, but i-2 and earlier are untouched — and dp[i-2] is already the best of those. Optimal substructure doing the work.',
      },
      py: {
        code: `def rob(a: list[int]) -> int:
    n = len(a)
    if n == 1:
        return a[0]
    dp = [0] * n                         # dp[i] = best loot from houses 0..i
    dp[0] = a[0]
    dp[1] = max(a[0], a[1])
    for i in range(2, n):
        dp[i] = max(dp[i - 1],           # choice 1: skip house i
                    dp[i - 2] + a[i])    # choice 2: rob it (i-1 forbidden)
    return dp[-1]`,
        annotations: {
          5: 'Say the state out loud in interviews: "dp[i] is the best loot considering houses 0 through i." One sentence — step 1 of the recipe.',
          9: 'Skipping house i means yesterday\'s best simply carries forward. dp[i-1] does NOT mean house i-1 was robbed — it means the best plan so far.',
          10: 'Robbing house i bans i-1, but i-2 and earlier are untouched — and dp[i-2] is already the best of those. Optimal substructure doing the work.',
          11: 'dp[-1] is the last cell — Python\'s negative index, and the one place where it reads better than dp[n-1].',
        },
      },
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'House Robber on a = [2, 7, 9, 3, 1] — watch each max() decide',
        notice: 'dp[i] = max(skip, take) where skip = dp[i-1] and take = dp[i-2] + a[i]. Final answer: 12 (houses 0, 2, 4).',
        leftLabel: 'decision at house i',
        rightLabel: 'houses a[] and the dp[] register',
        frames: [
          {
            note: 'Base cases — no decisions yet. dp[0] = 2 (one house: rob it). dp[1] = max(2, 7) = 7 (adjacent pair: take the richer).',
            stack: [
              { name: 'i', value: '1' },
              { name: 'rule', value: 'dp[i] = max(skip, take)' },
            ],
            heap: [
              { id: 'a0', value: '2', label: 'a[0]' },
              { id: 'a1', value: '7', label: 'a[1]' },
              { id: 'a2', value: '9', label: 'a[2]' },
              { id: 'a3', value: '3', label: 'a[3]' },
              { id: 'a4', value: '1', label: 'a[4]' },
              { id: 'd0', value: '2', label: 'dp[0]' },
              { id: 'd1', value: '7', label: 'dp[1]' },
            ],
          },
          {
            note: 'i = 2: skip = dp[1] = 7. take = dp[0] + a[2] = 2 + 9 = 11. max → 11: robbing house 2 (with house 0) beats keeping 7.',
            stack: [
              { name: 'i', value: '2', to: 'a2' },
              { name: 'skip = dp[1]', value: '7' },
              { name: 'take = dp[0]+9', value: '11' },
            ],
            heap: [
              { id: 'a0', value: '2', label: 'a[0]' },
              { id: 'a1', value: '7', label: 'a[1]' },
              { id: 'a2', value: '9', label: 'a[2]' },
              { id: 'a3', value: '3', label: 'a[3]' },
              { id: 'a4', value: '1', label: 'a[4]' },
              { id: 'd0', value: '2', label: 'dp[0]' },
              { id: 'd1', value: '7', label: 'dp[1]' },
              { id: 'd2', value: '11', label: 'dp[2]' },
            ],
          },
          {
            note: 'i = 3: skip = dp[2] = 11. take = dp[1] + a[3] = 7 + 3 = 10. max → 11: house 3 is not worth breaking adjacency for. dp copies forward.',
            stack: [
              { name: 'i', value: '3', to: 'a3' },
              { name: 'skip = dp[2]', value: '11' },
              { name: 'take = dp[1]+3', value: '10' },
            ],
            heap: [
              { id: 'a0', value: '2', label: 'a[0]' },
              { id: 'a1', value: '7', label: 'a[1]' },
              { id: 'a2', value: '9', label: 'a[2]' },
              { id: 'a3', value: '3', label: 'a[3]' },
              { id: 'a4', value: '1', label: 'a[4]' },
              { id: 'd0', value: '2', label: 'dp[0]' },
              { id: 'd1', value: '7', label: 'dp[1]' },
              { id: 'd2', value: '11', label: 'dp[2]' },
              { id: 'd3', value: '11', label: 'dp[3]' },
            ],
          },
          {
            note: 'i = 4: skip = dp[3] = 11. take = dp[2] + a[4] = 11 + 1 = 12. max → 12. Done: dp[4] = 12, achieved by houses 0, 2, 4.',
            stack: [
              { name: 'i', value: '4', to: 'a4' },
              { name: 'skip = dp[3]', value: '11' },
              { name: 'take = dp[2]+1', value: '12' },
            ],
            heap: [
              { id: 'a0', value: '2', label: 'a[0]' },
              { id: 'a1', value: '7', label: 'a[1]' },
              { id: 'a2', value: '9', label: 'a[2]' },
              { id: 'a3', value: '3', label: 'a[3]' },
              { id: 'a4', value: '1', label: 'a[4]' },
              { id: 'd0', value: '2', label: 'dp[0]' },
              { id: 'd1', value: '7', label: 'dp[1]' },
              { id: 'd2', value: '11', label: 'dp[2]' },
              { id: 'd3', value: '11', label: 'dp[3]' },
              { id: 'd4', value: '12', label: 'dp[4]' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Space optimization, the 1D rule',
      md: `Look at every transition so far: \`dp[i]\` reads \`dp[i-1]\` and \`dp[i-2]\`. Never anything older.

- **The rule**: when the transition looks back only a fixed window, keep just that window — two variables — and delete the array. O(n) → **O(1) space**.
- The price: you lose the history, so you can't reconstruct WHICH houses were robbed — only the best total. If the interviewer asks for the actual path, keep the array (or a parent table).
- Say the upgrade unprompted: *"…and since I only look back two, this is O(1) space."* It's a free point.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'House Robber in O(1) space',
      code: `int rob(vector<int>& a) {                // rolling-variables version
    int prev2 = 0, prev1 = 0;            // best through i-2, best through i-1
    for (int x : a) {
        int cur = max(prev1, prev2 + x); // the same max, zero arrays
        prev2 = prev1;
        prev1 = cur;
    }
    return prev1;
}`,
      annotations: {
        2: 'Starting both at 0 = "robbing zero houses earns 0". This also erases the n==1 special case the array version needed.',
        4: 'Identical decision, identical answer, O(1) memory. Time is still O(n) — space tricks never change time.',
      },
      py: {
        code: `def rob(a: list[int]) -> int:            # rolling-variables version
    prev2, prev1 = 0, 0                  # best through i-2, best through i-1
    for x in a:
        prev2, prev1 = prev1, max(prev1, prev2 + x)  # same max, zero arrays
    return prev1`,
        annotations: {
          2: 'Starting both at 0 = "robbing zero houses earns 0". This also erases the n == 1 special case the list version needed.',
          4: 'Identical decision, identical answer, O(1) memory — and iterating the values directly (no index) is what makes it a one-liner. Time is still O(n): space tricks never change time.',
        },
      },
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Min Cost Climbing Stairs — the recipe, third rep',
      code: `int minCostClimbingStairs(vector<int>& cost) {
    // state: dp[i] = cheapest total paid to STAND on step i
    // the "top" is step n -- one past the last priced step
    int n = cost.size();
    int prev2 = 0, prev1 = 0;            // dp[0] = dp[1] = 0: starting is free
    for (int i = 2; i <= n; i++) {
        int cur = min(prev1 + cost[i - 1],   // arrive from i-1, pay its price
                      prev2 + cost[i - 2]);  // arrive from i-2, pay its price
        prev2 = prev1;
        prev1 = cur;
    }
    return prev1;                        // dp[n] = cost to reach the top
}`,
      annotations: {
        5: 'The problem lets you START on step 0 or 1 for free — that sentence in the statement IS the base case. Base cases come from the problem text, not habit.',
        7: 'You pay a step\'s cost when you LEAVE it. That is why cost[i-1] pairs with prev1 (dp[i-1]). Desk-check [10,15,20]: dp = 0,0,10,15 → answer 15.',
        12: 'Counting problems ADD the two arrows, best-cost problems MIN/MAX them. Same skeleton as stairs and robber — only the operator changed.',
      },
      py: {
        code: `def minCostClimbingStairs(cost: list[int]) -> int:
    # state: dp[i] = cheapest total paid to STAND on step i
    # the "top" is step n -- one past the last priced step
    n = len(cost)
    prev2, prev1 = 0, 0                  # dp[0] = dp[1] = 0: starting is free
    for i in range(2, n + 1):
        cur = min(prev1 + cost[i - 1],   # arrive from i-1, pay its price
                  prev2 + cost[i - 2])   # arrive from i-2, pay its price
        prev2, prev1 = prev1, cur
    return prev1                         # dp[n] = cost to reach the top`,
        annotations: {
          5: 'The problem lets you START on step 0 or 1 for free — that sentence in the statement IS the base case. Base cases come from the problem text, not habit.',
          7: 'You pay a step\'s cost when you LEAVE it. That is why cost[i-1] pairs with prev1 (dp[i-1]). Desk-check [10,15,20]: dp = 0,0,10,15 → answer 15.',
          10: 'Counting problems ADD the two arrows, best-cost problems MIN/MAX them. Same skeleton as stairs and robber — only the operator changed.',
        },
      },
    },
    {
      type: 'intuition',
      title: 'Grid DP: Unique Paths — the recipe goes 2D',
      md: `*"A robot starts at the top-left of an m×n grid and only moves right or down. How many paths to the bottom-right?"*

- **State**: \`dp[i][j]\` = number of paths from (0,0) to cell (i,j). Two indices now — that's the only new thing.
- **Transition** — last move: the robot entered (i,j) from above or from the left. Disjoint groups add: \`dp[i][j] = dp[i-1][j] + dp[i][j-1]\`.
- **Base**: top row and left column are all 1 — one straight-line path each.
- **Order**: row by row, left to right — up and left neighbors are always final before you read them.
- Climbing Stairs had two arrows into each state; so does this. 1D → 2D changed the indexing, not the thinking.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Unique Paths',
      code: `int uniquePaths(int m, int n) {
    // state: dp[i][j] = number of paths from (0,0) to (i,j)
    // transition: dp[i][j] = dp[i-1][j] + dp[i][j-1]  (from up or from left)
    vector<vector<int>> dp(m, vector<int>(n, 1));
    for (int i = 1; i < m; i++)
        for (int j = 1; j < n; j++)
            dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
    return dp[m - 1][n - 1];
}`,
      annotations: {
        4: 'Initializing everything to 1 bakes in the base cases: row 0 and column 0 keep their 1s because the loops start at index 1.',
        5: 'Row-major order = step 4 of the recipe in the flesh. Both neighbors are final when read. (Column-major would also work — the dependencies allow either.)',
        7: 'For a 3×7 grid this fills to 28. Time O(mn), space O(mn) — rolling-row upgrade below.',
      },
      py: {
        code: `def uniquePaths(m: int, n: int) -> int:
    # state: dp[i][j] = number of paths from (0,0) to (i,j)
    # transition: dp[i][j] = dp[i-1][j] + dp[i][j-1]  (from up or from left)
    dp = [[1] * n for _ in range(m)]
    for i in range(1, m):
        for j in range(1, n):
            dp[i][j] = dp[i - 1][j] + dp[i][j - 1]
    return dp[-1][-1]`,
        annotations: {
          4: 'Filling with 1 bakes in the base cases: row 0 and column 0 keep their 1s because both loops start at 1. And the comprehension is mandatory — [[1] * n] * m would alias ONE row m times, so every write would land in every row.',
          5: 'Row-major order = step 4 of the recipe in the flesh. Both neighbors are final when read. (Column-major would also work — the dependencies allow either.)',
          8: 'For a 3×7 grid this fills to 28. Time O(mn), space O(mn) — rolling-row upgrade below.',
        },
      },
    },
    {
      type: 'note',
      md: 'Combinatorics flex: every path is exactly m−1 downs and n−1 rights in some order, so the answer is the closed form **C(m+n−2, m−1)** — for 3×7 that is C(8,2) = 28. Mention it AFTER the DP: it shows range, and it earns the follow-up "so why DP at all?" — answer: the closed form dies the moment cells get obstacles or costs; the DP shrugs and keeps working. (If you do compute it: multiplicative formula, not factorials — factorials overflow instantly.)',
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Min Path Sum — same grid, counting becomes cost',
      code: `int minPathSum(vector<vector<int>>& g) {
    int m = g.size(), n = g[0].size();
    vector<vector<int>> dp(m, vector<int>(n));
    dp[0][0] = g[0][0];
    for (int j = 1; j < n; j++)          // top row: only the left neighbor
        dp[0][j] = dp[0][j - 1] + g[0][j];
    for (int i = 1; i < m; i++)          // left column: only the up neighbor
        dp[i][0] = dp[i - 1][0] + g[i][0];
    for (int i = 1; i < m; i++)
        for (int j = 1; j < n; j++)
            dp[i][j] = g[i][j] + min(dp[i - 1][j], dp[i][j - 1]);
    return dp[m - 1][n - 1];
}`,
      annotations: {
        5: 'Edges are the base cases here: one way in, nothing to min over — just accumulate.',
        11: 'The same two arrows as Unique Paths. Counting ADDED them; cheapest-cost MINS them and pays the current cell. One skeleton, two operators.',
      },
      py: {
        code: `def minPathSum(g: list[list[int]]) -> int:
    m, n = len(g), len(g[0])
    dp = [[0] * n for _ in range(m)]
    dp[0][0] = g[0][0]
    for j in range(1, n):                # top row: only the left neighbor
        dp[0][j] = dp[0][j - 1] + g[0][j]
    for i in range(1, m):                # left column: only the up neighbor
        dp[i][0] = dp[i - 1][0] + g[i][0]
    for i in range(1, m):
        for j in range(1, n):
            dp[i][j] = g[i][j] + min(dp[i - 1][j], dp[i][j - 1])
    return dp[-1][-1]`,
        annotations: {
          5: 'Edges are the base cases here: one way in, nothing to min over — just accumulate.',
          11: 'The same two arrows as Unique Paths. Counting ADDED them; cheapest-cost MINS them and pays the current cell. One skeleton, two operators.',
        },
      },
    },
    {
      type: 'note',
      md: 'Why not greedy on Min Path Sum? Grid \`[[1,3,1],[1,5,1],[4,2,1]]\`: greedy at each cell picks the cheaper neighbor and walks 1→1→4→2→1 = 9. DP finds 1→3→1→1→1 = 7. A locally cheap step can funnel you into an expensive region — DP wins because \`dp[i][j]\` already contains the consequences of everything before it.',
    },
    {
      type: 'intuition',
      title: 'Unique Paths II — obstacles, plus the rolling row',
      md: `Drop obstacles into the grid (cell = 1 means blocked). Two updates, zero new theory:

- An obstacle cell has **0 paths ending there** — write 0 and move on. Everything else is unchanged.
- Space upgrade for ALL grid DP: \`dp[i][j]\` reads only the current row and the row above. Keep **one row** and overwrite it in place — O(mn) → **O(n) space**.
- The magic of in-place: at cell (i,j), \`row[j]\` still holds row i−1's value (that's "up") and \`row[j-1]\` was just overwritten (that's "left"). One \`+=\` does the whole transition.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Unique Paths II with a rolling row',
      code: `int uniquePathsWithObstacles(vector<vector<int>>& g) {
    int m = g.size(), n = g[0].size();
    vector<long long> row(n, 0);         // ONE row, reused m times
    row[0] = (g[0][0] == 0) ? 1 : 0;
    for (int i = 0; i < m; i++)
        for (int j = 0; j < n; j++) {
            if (g[i][j] == 1) row[j] = 0;      // obstacle: WRITE the zero
            else if (j > 0) row[j] += row[j - 1];
        }
    return (int)row[n - 1];
}`,
      annotations: {
        3: 'O(n) space instead of O(mn). The 1D lookback rule, grown up: fixed lookback of one row → keep one row.',
        7: 'The classic bug: skipping the cell with continue leaves LAST row\'s count sitting in row[j] — paths flow straight through the wall. The zero must be written.',
        8: 'row[j] (not yet touched this row) = up. row[j-1] (just updated) = left. Desk-check the 3×3 grid with a center obstacle: result 2.',
      },
      py: {
        code: `def uniquePathsWithObstacles(g: list[list[int]]) -> int:
    m, n = len(g), len(g[0])
    row = [0] * n                        # ONE row, reused m times
    row[0] = 1 if g[0][0] == 0 else 0
    for i in range(m):
        for j in range(n):
            if g[i][j] == 1:
                row[j] = 0               # obstacle: WRITE the zero
            elif j > 0:
                row[j] += row[j - 1]
    return row[-1]`,
        annotations: {
          3: 'O(n) space instead of O(mn). The 1D lookback rule, grown up: fixed lookback of one row → keep one row.',
          8: 'The classic bug: skipping the cell with continue leaves LAST row\'s count sitting in row[j] — paths flow straight through the wall. The zero must be written.',
          10: 'row[j] (not yet touched this row) = up. row[j-1] (just updated) = left. Desk-check the 3×3 grid with a center obstacle: result 2.',
        },
      },
    },
    {
      type: 'intuition',
      title: 'How to SPOT a DP problem',
      md: `The exam is recognizing DP inside an unseen problem. Triggers, strongest first:

- *"How many ways / count the paths…"* — counting DP (stairs, unique paths).
- *"Minimum / maximum cost, profit, score to reach…"* — optimization DP (min path sum, robber).
- Choices now that constrain choices later — rob a house, lose a neighbor. Overlapping futures are the tell.
- The confirming test: write the brute-force recursion. If the same arguments appear more than once in the call tree → memoize → done, it's DP.
- Anti-signals: subproblems never repeat (merge sort — that's divide & conquer, not DP), or a greedy exchange argument holds (interval scheduling). Greedy correct beats DP — but you must be able to say WHY greedy is safe.`,
    },
    {
      type: 'note',
      md: 'Where the ladder goes next: knapsack (House Robber\'s max(skip, take) with a capacity dimension), LIS, string DP (edit distance, LCS), DP on trees, bitmask DP. Every rung is the same 4-step recipe with a richer state. The recipe you ran five times in this module IS the whole skill.',
    },
  ],
  quiz: [
    {
      question: 'Why is naive recursive fib exponential?',
      options: [
        {
          text: 'Recursion is always exponential',
          explanation: 'No — binary search is recursive and O(log n). The problem is the SHAPE of this recursion, not recursion itself.',
        },
        {
          text: 'Each call spawns two more, and the same subproblems are re-solved over and over',
          explanation: 'Correct. Two branches per node → a tree with ~2ⁿ nodes, most of which repeat questions already answered elsewhere in the tree.',
        },
        {
          text: 'Fibonacci numbers grow exponentially, so computing them must too',
          explanation: 'Output size is not the issue — memoized fib produces the same huge numbers in O(n) additions.',
        },
      ],
      correct: 1,
    },
    {
      question: 'The two properties a problem needs for DP to apply are…',
      options: [
        {
          text: 'Sorted input + a monotonic predicate',
          explanation: 'Those are the preconditions for binary search (on the answer) — a different pattern entirely.',
        },
        {
          text: 'A greedy-choice property + disjoint subproblems',
          explanation: 'Greedy-choice belongs to greedy algorithms, and DISJOINT subproblems is plain divide & conquer. DP needs the opposite: subproblems that OVERLAP.',
        },
        {
          text: 'Overlapping subproblems + optimal substructure',
          explanation: 'Correct. Repeating subquestions make the notebook worth keeping; optimal substructure lets big answers be assembled from stored small ones.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Your teammate writes a recursive function with a cache lookup at the top. You write a loop filling an array from index 0 upward. Who is doing what?',
      options: [
        {
          text: 'Teammate: memoization (top-down). You: tabulation (bottom-up)',
          explanation: 'Correct. Recursion + cache = memoization; loop from base cases = tabulation. Same states, same complexity — different direction of travel.',
        },
        {
          text: 'The reverse — the loop is memoization',
          explanation: 'Backwards. Memoization memorizes answers to recursive calls; the loop version tabulates from the bottom.',
        },
        {
          text: 'Both are tabulation; memoization means precomputing before the program runs',
          explanation: 'Memoization happens at runtime, inside the recursion — it is not compile-time precomputation.',
        },
      ],
      correct: 0,
    },
    {
      question: 'In House Robber, dp[i] = max(dp[i-1], dp[i-2] + a[i]). What exactly is dp[i-1] here?',
      options: [
        {
          text: 'The loot if you rob house i-1',
          explanation: 'dp[i-1] does not commit to robbing house i-1 — it is the best PLAN over houses 0..i-1, which may well skip i-1.',
        },
        {
          text: 'The best loot achievable from houses 0..i-1 — used when house i is skipped',
          explanation: 'Correct. Skipping house i means the best answer so far simply carries forward, whatever subset it used.',
        },
        {
          text: 'a[i-1], the cash inside house i-1',
          explanation: 'That is a raw array value. dp values are answers to subproblems, not inputs.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Climbing Stairs uses dp[i] = dp[i-1] + dp[i-2]. Why ADD instead of max?',
      options: [
        {
          text: 'The last hop was +1 or +2 — two disjoint groups of paths, and counting disjoint groups means adding their sizes',
          explanation: 'Correct. Every path ends in exactly one of the two hops, no path is in both groups, so the counts add. Counting → add; best-value → max/min.',
        },
        {
          text: 'max would also work; add is just convention',
          explanation: 'max would return the larger of two counts — nonsense for "how many ways total". The operator is dictated by the question.',
        },
        {
          text: 'Multiply — the choices are independent',
          explanation: 'They are not independent choices made together; they are mutually exclusive endings. Multiplication counts pairs, which is not what is asked.',
        },
      ],
      correct: 0,
    },
    {
      question: 'In the rolling-row Unique Paths II, the loop reaches an obstacle cell. What must the code do?',
      options: [
        {
          text: 'Skip the cell with continue',
          explanation: 'The classic bug: row[j] still holds LAST row\'s count, so paths leak straight through the wall. Stale state must be overwritten.',
        },
        {
          text: 'Subtract the obstacle\'s value from the total',
          explanation: 'There is nothing to subtract — path counts are not a running total you can adjust after the fact.',
        },
        {
          text: 'Write 0 into row[j]',
          explanation: 'Correct. Zero paths end on an obstacle, and in a reused row that zero must be physically written to kill the previous row\'s value.',
        },
      ],
      correct: 2,
    },
    {
      question: 'When can a 1D dp array be replaced by two rolling variables?',
      options: [
        {
          text: 'Always — 1D arrays are just style',
          explanation: 'Not always: a transition like dp[i] = best over ALL j < i (LIS-style) needs the whole history. The lookback must be bounded.',
        },
        {
          text: 'When the transition reads only a fixed recent window, like dp[i-1] and dp[i-2]',
          explanation: 'Correct. Keep exactly the window the transition touches, slide it forward. O(n) space → O(1). Grid version: one rolling row.',
        },
        {
          text: 'Only when the answer fits in an int',
          explanation: 'Value range decides int vs long long — it has nothing to do with how many past states the transition reads.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Why does tabulation care about iteration order at all?',
      options: [
        {
          text: 'Every dp value you read must already be final — e.g. row-by-row, left-to-right works when cells need "up" and "left"',
          explanation: 'Correct. Order is step 4 of the recipe: it must topologically respect the dependencies. Memoization dodges this — recursion discovers the order.',
        },
        {
          text: 'It doesn\'t — the array is preallocated, so any order works',
          explanation: 'Allocated ≠ computed. Read a cell before its turn and you consume garbage (or a stale zero) and propagate it everywhere.',
        },
        {
          text: 'Only diagonal order is ever correct for grids',
          explanation: 'Diagonal order happens to satisfy up+left dependencies too, but row-major is equally valid and simpler. "Must be diagonal" is false.',
        },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain dynamic programming in two minutes, using Fibonacci, to someone who has never heard the term.',
      answer:
        'Story first: naive fib(n) calls fib(n-1) and fib(n-2), which call more — a tree of ~2ⁿ calls where the same questions (fib(3), fib(2)…) are re-answered constantly. DP is one fix: write every answer down the first time; on repeat questions, read instead of recompute. There are only n+1 distinct questions, so time collapses from O(2ⁿ) to O(n). Then name the two preconditions: overlapping subproblems (questions repeat) and optimal substructure (big answers assemble from best small answers). Close with the one-liner: DP is carefully organized brute force — same recursion, no question answered twice.',
      isCaseBased: false,
    },
    {
      question: 'Memoization vs tabulation — define both, give the complexity, and say when you would pick each.',
      answer:
        'Memoization: keep the recursive function, add a cache check before computing and a store after — top-down. Tabulation: fill an array from base cases upward with a loop — bottom-up. Both cost O(states × transition work); for fib that is O(n) either way. Pick memoization when you already have the brute-force recursion, or when only a fraction of the state space is reachable (it computes only what is asked). Pick tabulation when all states are needed anyway, when recursion depth (~1e5) threatens the stack, or when you want rolling-window space optimization — that requires the loop. Interview strategy: derive top-down to FIND the recurrence, present bottom-up when pushed on space or stack.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through House Robber with the full 4-step recipe, then optimize the space.',
      answer:
        'State: dp[i] = max loot using houses 0..i — one sentence. Transition via the last choice at house i: skip it → dp[i-1]; rob it → i-1 is forbidden, so dp[i-2] + a[i]; take the max. Base: dp[0] = a[0], dp[1] = max(a[0], a[1]). Order: left to right. Time O(n), space O(n). Optimization: the transition looks back only two slots, so keep two variables (prev2, prev1) and drop the array — O(1) space, same O(n) time. Starting both at 0 ("zero houses = zero loot") even removes the n==1 edge case. Caveat to volunteer: rolling variables lose the ability to reconstruct WHICH houses were robbed.',
      isCaseBased: false,
    },
    {
      question: 'Case: your correct brute-force recursion TLEs at n = 1e5. The interviewer says "make it pass". What is your exact process?',
      answer:
        'First, diagnose WHY it TLEs: print or reason about the call tree — if the same arguments recur, it is overlapping subproblems, and memoization is the two-line fix: cache keyed by the arguments, check before computing, store before returning. That alone usually drops exponential to O(states × transition). Second, count states out loud: if the function takes (i) only, that is n states; (i, j) is n² — confirm the new complexity fits the constraint. Third, if n = 1e5 also threatens recursion depth, convert to tabulation: base cases first, loop in dependency order. Fourth, apply the rolling window if lookback is fixed. Naming that pipeline — memoize, count states, tabulate, roll — is exactly what the interviewer is grading.',
      isCaseBased: true,
    },
    {
      question: 'Case: you solve House Robber and the interviewer smiles: "now the houses are arranged in a CIRCLE — house 0 and house n-1 are adjacent." What changes?',
      answer:
        'The circle adds exactly one new constraint: houses 0 and n-1 cannot both be robbed. So split into two linear problems: (A) rob among houses 0..n-2 (house n-1 excluded), (B) rob among houses 1..n-1 (house 0 excluded). Every valid circular plan omits house 0 or house n-1, so it lives entirely inside A or B — answer = max(A, B), each solved with the standard linear robber in O(n) time, O(1) space. Edge case: n == 1 returns a[0] directly. The transferable lesson: when a new constraint couples the two ends, case-split on the coupling and reuse the solved subproblem — House Robber II is two House Robber I calls, not a new algorithm.',
      isCaseBased: true,
    },
    {
      question: 'Unique Paths can be solved at least three ways. Name them with complexities and tradeoffs.',
      answer:
        '(1) Grid DP: dp[i][j] = dp[i-1][j] + dp[i][j-1] — O(mn) time, O(mn) space, trivially extends to obstacles and weighted cells. (2) Rolling row: same recurrence, one row reused — O(mn) time, O(n) space; loses easy path reconstruction. (3) Combinatorics: every path is m-1 downs and n-1 rights, so C(m+n-2, m-1) — O(m+n) time with the multiplicative formula; the tightest solution but brittle: factorials overflow (compute multiplicatively, or with __int128/long double care), and the closed form dies the instant obstacles or costs appear. Ranking those tradeoffs unprompted — and noting DP generalizes while the formula does not — is the senior answer.',
      isCaseBased: false,
    },
    {
      question: 'Why does greedy fail on Min Path Sum, and what does DP guarantee that greedy cannot?',
      answer:
        'Counter-example: [[1,3,1],[1,5,1],[4,2,1]]. Greedy at each cell takes the cheaper neighbor: 1→1→4→2→1 = 9. Optimal is 1→3→1→1→1 = 7. A locally cheap move can commit you to an expensive region — greedy never looks past the next cell. DP guarantees global optimality because dp[i][j] is the FULL best cost to reach (i,j): by the time you use it, every consequence of every earlier decision is already priced in (optimal substructure). Complexity honesty: greedy is O(m+n) and wrong; DP is O(mn) and right. Bonus point: when a greedy IS correct (e.g. interval scheduling), you must be able to state the exchange argument — otherwise default to DP.',
      isCaseBased: false,
    },
    {
      question: 'What makes a GOOD dp state? How do you know your state is wrong?',
      answer:
        'A good state is the minimal information that makes the future independent of the past — you can decide everything ahead knowing only the state, not how you got there. Test: say it in one sentence ("dp[i] = best loot from houses 0..i"); if you need a paragraph, it is wrong. Two failure smells: (1) the transition needs information the state does not carry (e.g. robber state without "index" — you cannot express adjacency) — the fix is adding a dimension; (2) the state carries irrelevant history — state count explodes and so does time, since complexity = states × transition. Interviews on the DP ladder are mostly state-design interviews; transitions follow almost mechanically from "what was the last choice?".',
      isCaseBased: false,
    },
    {
      question: 'When is DP space optimization valid, and what do you permanently give up?',
      answer:
        'Valid when the transition reads only a bounded recent window: dp[i-1], dp[i-2] → two variables (O(1)); previous row only → one rolling row (O(n) for a grid). Invalid when transitions reach arbitrarily far back — LIS\'s dp[i] = max over all j < i needs the full array. What you give up: the history. Reconstructing the actual path/subset requires walking the table backwards, and the table is gone — so if the question says "return the path", keep the full table or a parent-pointer array. Time never changes: rolling is purely a memory trade. Stating "O(1) space, still O(n) time, but we lose reconstruction" is the complete answer interviewers want.',
      isCaseBased: false,
    },
    {
      question: 'Case: your memoized solution is accepted for n = 1e4 but crashes with a stack overflow at n = 1e6. Fix it without changing the algorithm.',
      answer:
        'Diagnosis: memoization recurses to depth O(n) before any base case returns — at n = 1e6 that is a million stack frames, far past the ~1e5-frame default limit. The algorithm (states + transition) is fine; the EXECUTION ORDER is the problem. Fix: convert to tabulation — write base cases into the table, loop i from small to large applying the identical transition. Same O(n) time, same answers, zero recursion. Then check for the free upgrade: if lookback is a fixed window, roll it into variables for O(1) space. Alternatives worth naming and rejecting: raising the stack limit (fragile, platform-dependent) or an explicit stack (needless complexity when a loop exists). This conversion question is a favorite because it tests whether you know memoization and tabulation are the same DP in different clothes.',
      isCaseBased: true,
    },
    {
      question: 'An unseen problem lands. What signals make you try DP, and what is your first move?',
      answer:
        'Signals, strongest first: "how many ways / count paths" (counting DP); "minimum/maximum cost, profit, score" over sequential decisions (optimization DP); choices now that constrain choices later (rob → neighbor banned); constraints around n ≤ a few thousand (hinting O(n²) states is fine). First move: write the brute-force recursion on (index, leftover constraints) and inspect the call tree — same arguments appearing twice confirms overlap, and memoizing it IS the solution. Then run the recipe: state in one sentence, transition via last choice, base cases from the problem text, iteration order (or let recursion handle it). Anti-signals to say out loud: no repeating subproblems → divide & conquer; a provable exchange argument → greedy beats DP.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    {
      front: 'The two properties a problem needs for DP',
      back: 'Overlapping subproblems (same smaller question repeats) + optimal substructure (big answer built from best small answers).',
    },
    {
      front: 'The 4-step DP recipe',
      back: '1. Define state (one sentence) → 2. Write transition (ask: what was the LAST choice?) → 3. Base cases → 4. Iteration order (reads must already be final).',
    },
    {
      front: 'Memoization vs tabulation',
      back: 'Memoization: top-down, recursion + cache, computes only reachable states. Tabulation: bottom-up loop from base cases, no stack risk, enables rolling-space tricks. Same O(states × transition).',
    },
    {
      front: 'fib: naive vs DP complexity',
      back: 'Naive: O(2ⁿ) — the call tree re-solves the same subproblems. With memory: n+1 distinct subproblems, each once → O(n).',
    },
    {
      front: 'House Robber transition',
      back: 'dp[i] = max(dp[i-1], dp[i-2] + a[i]) — skip house i, or rob it (adjacent i-1 forbidden). The max(skip, take) shape returns in knapsack.',
    },
    {
      front: 'Climbing Stairs recurrence + base',
      back: 'dp[i] = dp[i-1] + dp[i-2] (last hop +1 or +2 — disjoint groups ADD). Base dp[0] = dp[1] = 1. It is fib in a costume.',
    },
    {
      front: 'Grid transitions: counting vs cost',
      back: 'Same two arrows (up, left). Counting: dp[i][j] = up + left. Min cost: dp[i][j] = cell + min(up, left). Operator comes from the question.',
    },
    {
      front: 'Unique Paths closed form',
      back: 'C(m+n−2, m−1): every path = (m−1) downs + (n−1) rights in some order. Dies when obstacles/costs appear — DP survives.',
    },
    {
      front: 'Space-optimization rule',
      back: 'Transition reads a fixed window → keep only the window. dp[i-1], dp[i-2] → two variables (O(1)); previous row → one rolling row (O(n)). Price: path reconstruction is lost.',
    },
    {
      front: 'DP trigger phrases',
      back: '"How many ways…", "min/max cost/profit to reach…", choices with overlapping futures. Confirm: brute-force recursion repeats the same arguments → memoize.',
    },
  ],
  mindmapMarkdown: `- DP I: 1D & Grid DP
  - Why DP
    - fib naive = 2ⁿ call tree, subproblems re-solved
    - with memory: each solved once → O(n)
  - Prerequisites
    - overlapping subproblems
    - optimal substructure
  - Two styles
    - memoization: top-down, recursion + cache
    - tabulation: bottom-up loop from base
  - Recipe: state → transition → base → order
  - 1D
    - Climbing Stairs = fib in costume
    - House Robber: max(dp[i-1], dp[i-2]+a[i])
    - Min Cost Stairs: pay when you leave a step
  - Grid
    - Unique Paths: up + left
    - closed form C(m+n-2, m-1)
    - Min Path Sum: cell + min(up, left)
    - Unique Paths II: obstacle WRITES 0
  - Space optimization
    - 1D: two rolling variables
    - grid: one rolling row
    - price: path reconstruction lost
  - Spot DP: "count ways", "min/max cost", overlapping futures`,
}

export default m
