import type { Module } from '../types'

const m: Module = {
  id: 'dsa-l3-dp-knapsack-lis',
  subjectId: 'dsa',
  level: 3,
  title: 'DP II: Knapsack Family & LIS Family',
  whyItMatters:
    'DP fails more FAANG candidates than any other topic, and inside DP these two families are most of what actually gets asked: knapsack (subset sum, partition, coin change all ride on it) and LIS (envelopes and chain problems ride on it). Each carries one signature trap — the 1D loop direction, and what the tails array really means — that separates memorizers from people who understand their own state. This module makes both traps impossible to fall into.',
  estMinutes: 60,
  sections: [
    {
      type: 'intuition',
      title: 'Knapsack: stand before each item, ask one question',
      md: `A thief's bag holds W kg. Every item has a weight and a value. Maximize the value that fits.

- Brute force tries all 2ⁿ subsets. Dead at n ≈ 25.
- The fix: stop thinking in subsets. Stand before ONE item and ask: **take it, or skip it?**
- Skip → the problem shrinks to: best value from the remaining items, same capacity.
- Take → collect its value, and the problem shrinks to: remaining items, capacity minus its weight.
- Both branches are smaller copies of the same question — overlapping subproblems — DP.
- Answer = max(skip world, take world). Everything after this line is bookkeeping.`,
    },
    {
      type: 'hinglish',
      md: `0/1 knapsack ka poora game ek hi sawaal hai. Har item ke saamne khade ho aur pooch: **lena hai ya chhodna hai?** Chhoda — to value wahi hai jo pichhle items se bani thi. Liya — to iski value milegi, par bag mein iska weight ghusega, matlab baaki sab ke liye chhota bag. Dono duniya ka answer nikalo, **jo badi ho woh rakh lo** — \`max(skip, take)\`. Bas. Yehi recurrence hai, yehi table hai, yehi 1D array hai. Subset sum, partition, coin change — sab isi ek sawaal ke alag-alag costume hain.`,
    },
    {
      type: 'intuition',
      title: 'The 2D table: dp[i][w]',
      md: `- **State:** dp[i][w] = best value using only the *first i items* at capacity w. Two things vary between subproblems — items considered, room left — so two dimensions.
- **Base:** dp[0][w] = 0. Zero items, zero value.
- **Transition:** dp[i][w] = max(dp[i−1][w], dp[i−1][w−wt] + val) — skip vs take (take only if wt ≤ w).
- Read the take term slowly: it consults row **i−1**. The item being decided can never appear inside its own subproblem — that is exactly what makes it 0/1.
- Cost: O(n·W) time and space. Named problems in this costume: 0/1 Knapsack, Target Sum, Last Stone Weight II.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: '0/1 knapsack — the honest 2D version',
      code: `// 0/1 knapsack: each item taken once or not at all
int knapsack(const vector<int>& wt, const vector<int>& val, int W) {
    int n = wt.size();
    // dp[i][w] = best value using only the FIRST i items, capacity w
    vector<vector<int>> dp(n + 1, vector<int>(W + 1, 0));
    for (int i = 1; i <= n; i++) {
        for (int w = 0; w <= W; w++) {
            dp[i][w] = dp[i - 1][w];            // world 1: SKIP item i
            if (wt[i - 1] <= w)                 // does it even fit?
                dp[i][w] = max(dp[i][w],
                    dp[i - 1][w - wt[i - 1]] + val[i - 1]);  // world 2: TAKE
        }
    }
    return dp[n][W];
}`,
      annotations: {
        5: 'Row 0 stays all zeros — the base case "no items" — so every later row has something to read.',
        8: 'Skip: same capacity, one fewer item to think about. Row i−1, same column.',
        9: 'The table index i is 1-based ("first i items"), the arrays are 0-based — hence wt[i - 1].',
        11: 'Take reads row i−1: the sub-world where THIS item was never available. That single index is the whole 0/1 guarantee.',
      },
      py: {
        code: `# 0/1 knapsack: each item taken once or not at all
def knapsack(wt: list[int], val: list[int], W: int) -> int:
    n = len(wt)
    # dp[i][w] = best value using only the FIRST i items, capacity w
    dp = [[0] * (W + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for w in range(W + 1):
            dp[i][w] = dp[i - 1][w]                 # world 1: SKIP item i
            if wt[i - 1] <= w:                      # does it even fit?
                dp[i][w] = max(dp[i][w],
                               dp[i - 1][w - wt[i - 1]] + val[i - 1])  # TAKE
    return dp[n][W]`,
        annotations: {
          5: 'Row 0 stays all zeros — the base case "no items" — so every later row has something to read. The comprehension is not optional: [[0] * (W+1)] * (n+1) would alias one row into all of them.',
          8: 'Skip: same capacity, one fewer item to think about. Row i−1, same column.',
          9: 'The table index i is 1-based ("first i items"), the lists are 0-based — hence wt[i - 1].',
          11: 'Take reads row i−1: the sub-world where THIS item was never available. That single index is the whole 0/1 guarantee.',
        },
      },
    },
    {
      type: 'intuition',
      title: '2D → 1D: keep only yesterday',
      md: `Look at the transition again: row i reads ONLY row i−1. Every row below that is dead weight.

- So keep one array dp[0..W] and overwrite it item by item.
- New danger: mid-overwrite, some cells still hold row i−1 (good — take must read those) and some already hold row i (poison — reading one means using the item twice).
- The take term reads dp[w − wt] — always to the **left** of the cell being written.
- Sweep **right to left**, and every cell left of the writer is still yesterday's row. Item used at most once.
- Sweep left to right, and the left cells are already today's row — the item stacks onto itself. That is a real, different problem (unbounded knapsack, below) — arrived at by accident.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'The 1D backwards sweep, one item, frame by frame',
        notice: 'Watch where the READ lands relative to the WRITE. Backwards: every read hits a pre-item value. Forwards: reads hit cells this same item already updated.',
        leftLabel: 'loop state',
        rightLabel: 'dp[0..5] (capacity 5)',
        frames: [
          {
            note: 'One item exists: weight 2, value 3. After zero items the row is all zeros. The write index starts at the RIGHT end, w = 5, and will walk left.',
            stack: [
              { name: 'item', value: 'wt 2 · val 3' },
              { name: 'w (write)', to: 'c5' },
            ],
            heap: [
              { id: 'c0', value: '0', label: 'w=0' },
              { id: 'c1', value: '0', label: 'w=1' },
              { id: 'c2', value: '0', label: 'w=2' },
              { id: 'c3', value: '0', label: 'w=3' },
              { id: 'c4', value: '0', label: 'w=4' },
              { id: 'c5', value: '0', label: 'w=5' },
            ],
          },
          {
            note: 'w = 5: TAKE reads dp[5−2] = dp[3]. That cell sits LEFT of the writer — untouched, still the before-this-item value 0. Write dp[5] = max(0, 0 + 3) = 3.',
            stack: [
              { name: 'item', value: 'wt 2 · val 3' },
              { name: 'w (write)', to: 'c5' },
              { name: 'reads w−2', to: 'c3' },
            ],
            heap: [
              { id: 'c0', value: '0', label: 'w=0' },
              { id: 'c1', value: '0', label: 'w=1' },
              { id: 'c2', value: '0', label: 'w=2' },
              { id: 'c3', value: '0', label: 'w=3' },
              { id: 'c4', value: '0', label: 'w=4' },
              { id: 'c5', value: '3', label: 'w=5 ✎' },
            ],
          },
          {
            note: 'w = 4: reads dp[2] = 0 (still untouched), writes dp[4] = 3. Updated cells pile up on the RIGHT, always behind the writer — never in front of it.',
            stack: [
              { name: 'item', value: 'wt 2 · val 3' },
              { name: 'w (write)', to: 'c4' },
              { name: 'reads w−2', to: 'c2' },
            ],
            heap: [
              { id: 'c0', value: '0', label: 'w=0' },
              { id: 'c1', value: '0', label: 'w=1' },
              { id: 'c2', value: '0', label: 'w=2' },
              { id: 'c3', value: '0', label: 'w=3' },
              { id: 'c4', value: '3', label: 'w=4 ✎' },
              { id: 'c5', value: '3', label: 'w=5' },
            ],
          },
          {
            note: 'w = 3, then w = 2: same story — every read lands left of the writer, on pre-item values. The sweep stops below w = 2 (the item no longer fits). Final row 0 0 3 3 3 3: the item is counted at most ONCE at every capacity.',
            stack: [
              { name: 'item', value: 'wt 2 · val 3' },
              { name: 'w (write)', to: 'c2' },
              { name: 'reads w−2', to: 'c0' },
            ],
            heap: [
              { id: 'c0', value: '0', label: 'w=0' },
              { id: 'c1', value: '0', label: 'w=1' },
              { id: 'c2', value: '3', label: 'w=2 ✎' },
              { id: 'c3', value: '3', label: 'w=3' },
              { id: 'c4', value: '3', label: 'w=4' },
              { id: 'c5', value: '3', label: 'w=5' },
            ],
          },
          {
            note: 'Contrast — replay the SAME item FORWARD (w = 2 up). At w = 4 the read lands on dp[2], already rewritten to 3 by this item two steps ago. dp[4] = 3 + 3 = 6: one item counted twice. Forward turns 0/1 into unbounded knapsack by accident.',
            stack: [
              { name: 'item', value: 'wt 2 · val 3' },
              { name: 'w (write)', to: 'c4', danger: true },
              { name: 'reads w−2', to: 'c2', danger: true },
            ],
            heap: [
              { id: 'c0', value: '0', label: 'w=0' },
              { id: 'c1', value: '0', label: 'w=1' },
              { id: 'c2', value: '3', label: 'this item, again' },
              { id: 'c3', value: '3', label: 'w=3' },
              { id: 'c4', value: '6', label: 'WRONG: item ×2' },
              { id: 'c5', value: '0', label: 'w=5' },
            ],
          },
        ],
      },
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'The 1D compression — same answer, O(W) space',
      code: `int knapsack1D(const vector<int>& wt, const vector<int>& val, int W) {
    vector<int> dp(W + 1, 0);        // one row: dp[w] = best value at capacity w
    for (int i = 0; i < (int)wt.size(); i++)
        for (int w = W; w >= wt[i]; w--)         // BACKWARDS -- load-bearing
            dp[w] = max(dp[w],                   // skip
                        dp[w - wt[i]] + val[i]); // take: reads a LEFT cell
    return dp[W];
}`,
      annotations: {
        2: 'The all-zero row doubles as the base case. After item i finishes, the array IS row i of the 2D table.',
        4: 'The interview question hiding in this line: backwards keeps every left cell on the previous item\'s row. Forward would let the item pay for itself twice.',
        6: 'dp[w − wt[i]] is left of the writer — still untouched this round — so it is genuinely row i−1. The 2D correctness argument survives compression intact.',
      },
      py: {
        code: `def knapsack1D(wt: list[int], val: list[int], W: int) -> int:
    dp = [0] * (W + 1)           # one row: dp[w] = best value at capacity w
    for i in range(len(wt)):
        for w in range(W, wt[i] - 1, -1):        # BACKWARDS -- load-bearing
            dp[w] = max(dp[w],                   # skip
                        dp[w - wt[i]] + val[i])  # take: reads a LEFT cell
    return dp[W]`,
        annotations: {
          2: 'The all-zero list doubles as the base case. After item i finishes, dp IS row i of the 2D table.',
          4: 'The interview question hiding in this line: backwards keeps every left cell on the previous item\'s row; forward would let the item pay for itself twice. Read the range carefully — the stop is exclusive, so wt[i] - 1 is what keeps w == wt[i] in the sweep.',
          6: 'dp[w − wt[i]] is left of the writer — still untouched this round — so it is genuinely row i−1. The 2D correctness argument survives compression intact.',
        },
      },
    },
    {
      type: 'note',
      md: 'Interview flex, one line: O(n·W) *looks* polynomial but is not — W is a numeric value that the input encodes in log W bits, so O(n·W) is exponential in input length. The term is **pseudo-polynomial**. That is how knapsack stays NP-hard while this DP happily chews through W = 10⁵ instances.',
    },
    {
      type: 'intuition',
      title: 'Knapsack in disguise: Subset Sum and Partition',
      md: `**Subset Sum:** can some subset of nums hit a target sum exactly? Same skeleton — weight = value = the number, capacity = target — and "max value" downgraded to yes/no: dp[s] = "some subset makes s".

- max() becomes ||. Everything else, including the backwards sweep, is identical — each number usable once.
- **Partition Equal Subset Sum:** split the array into two halves with equal sums. Odd total → impossible, return false. Even total → find ONE subset hitting total/2; the leftovers are automatically the other half.
- One reduction, and a scary-sounding problem collapses into ten lines.
- Same disguise family: Target Sum (assign + and − signs) reduces to subset-sum with target = (total + S) / 2.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Partition Equal Subset Sum — knapsack with the mask off',
      code: `bool canPartition(vector<int>& nums) {
    int total = accumulate(nums.begin(), nums.end(), 0);
    if (total % 2) return false;     // odd total: two equal halves impossible
    int target = total / 2;
    vector<char> dp(target + 1, 0);  // dp[s] = "some subset sums to exactly s"
    dp[0] = 1;                       // the empty subset makes 0
    for (int x : nums)               // 0/1: each number usable once...
        for (int s = target; s >= x; s--)  // ...so the sweep is BACKWARDS again
            dp[s] = dp[s] || dp[s - x];    // skip x  OR  take x on top of s-x
    return dp[target];
}`,
      annotations: {
        3: 'Say this check out loud before coding — interviewers count it. Odd sum ends the problem in O(n).',
        5: 'vector<char> over vector<bool> dodges the bit-proxy weirdness; either passes. This is value-knapsack with max() swapped for ||.',
        8: 'Same direction, same reason: forward would let one number contribute to a sum twice — 5 alone "making" 10.',
        9: 'Flex upgrade: bitset<10001> dp; dp[0]=1; for x: dp |= dp << x. Same DP, 64 sums per instruction.',
      },
      py: {
        code: `def canPartition(nums: list[int]) -> bool:
    total = sum(nums)
    if total % 2:
        return False                 # odd total: two equal halves impossible
    target = total // 2
    dp = [False] * (target + 1)      # dp[s] = "some subset sums to exactly s"
    dp[0] = True                     # the empty subset makes 0
    for x in nums:                   # 0/1: each number usable once...
        for s in range(target, x - 1, -1):   # ...so the sweep is BACKWARDS
            dp[s] = dp[s] or dp[s - x]       # skip x  OR  take x on top of s-x
    return dp[target]`,
        annotations: {
          3: 'Say this check out loud before coding — interviewers count it. Odd sum ends the problem in O(n).',
          6: 'A plain list of bools: none of the C++ vector<bool> bit-proxy weirdness to dodge. This is value-knapsack with max() swapped for or.',
          9: 'Same direction, same reason: forward would let one number contribute to a sum twice — 5 alone "making" 10.',
          10: 'Flex upgrade, and Python has it built in: bits = 1, then bits |= bits << x for each x, and the answer is (bits >> target) & 1. Arbitrary-precision ints ARE std::bitset — 64 sums per machine word, no size to declare.',
        },
      },
    },
    {
      type: 'intuition',
      title: 'Unbounded knapsack: the mirror',
      md: `Now the shop has infinite copies of every item. Take one — you may take it again.

- The 1D bug becomes the feature. Sweeping FORWARD makes dp[w − wt] a cell this item already updated — a world where the item was already taken once. Reading it means taking another copy. For unbounded, that is exactly legal.
- One loop direction flips the problem. The rule: **0/1 → backwards. Unbounded → forwards.**
- **Coin Change (min coins):** unbounded knapsack where every coin costs 1 and you minimize. dp[a] = fewest coins making amount a.
- Why not greedy? Coins {1, 3, 4}, amount 6: greedy grabs 4+1+1 = 3 coins; DP finds 3+3 = 2. Biggest-coin-first is only safe on *canonical* systems (real currencies) — arbitrary coin sets need the DP.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Coin Change — minimum coins, forward on purpose',
      code: `int coinChange(vector<int>& coins, int amount) {
    const int INF = 1e9;             // "unreachable" -- NOT INT_MAX
    vector<int> dp(amount + 1, INF);
    dp[0] = 0;                       // amount 0 needs 0 coins
    for (int c : coins)
        for (int a = c; a <= amount; a++)   // FORWARD: reuse is legal now
            dp[a] = min(dp[a], dp[a - c] + 1);
    return dp[amount] == INF ? -1 : dp[amount];
}`,
      annotations: {
        2: 'INT_MAX + 1 overflows to a huge negative and "wins" every min(). 1e9 survives the +1. A real submitted-and-failed classic.',
        6: 'The mirror insight in one line: the direction that was a bug in 0/1 is the definition of unbounded.',
        7: 'dp[a − c] may already include coin c — that is a second copy of c, which unbounded explicitly allows.',
      },
      py: {
        code: `def coinChange(coins: list[int], amount: int) -> int:
    INF = float('inf')               # "unreachable"
    dp = [INF] * (amount + 1)
    dp[0] = 0                        # amount 0 needs 0 coins
    for c in coins:
        for a in range(c, amount + 1):      # FORWARD: reuse is legal now
            dp[a] = min(dp[a], dp[a - c] + 1)
    return -1 if dp[amount] == INF else dp[amount]`,
        annotations: {
          2: 'The C++ trap here — INT_MAX + 1 overflowing to a huge negative and "winning" every min() — simply cannot happen: inf + 1 is inf. Price: dp holds floats. Want it integral? Use 10**9, exactly like the C++ pane.',
          6: 'The mirror insight in one line: the direction that was a bug in 0/1 is the definition of unbounded.',
          7: 'dp[a − c] may already include coin c — that is a second copy of c, which unbounded explicitly allows.',
        },
      },
    },
    {
      type: 'intuition',
      title: 'Coin Change II: the loop order IS the answer',
      md: `Now COUNT the ways to make the amount. Suddenly the loop nesting — which never mattered for min/max — decides *what you count*.

- **Coins outer:** finish all decisions about coin 1, then coin 2, … A "way" can only be "how many of each coin" — order inside a way is inexpressible. You count **combinations**. Coins {1, 2}, amount 3: {1,1,1}, {1,2} → 2 ways.
- **Amount outer:** at every amount, every coin may be appended next. 1+2 and 2+1 arrive by different paths and both count. You count **permutations** → 3 ways.
- Why min/max never cared: max(x, x) = x — duplicate paths are harmless. Counting cares: x + x ≠ x — duplicate paths poison sums.
- Combinations = Coin Change II. Permutations = Combination Sum IV. Interviewers ask for the difference by name.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Coin Change II — coins outer counts combinations',
      code: `// Coin Change II: COUNT ways to make amount (order irrelevant)
long long countWays(vector<int>& coins, int amount) {
    vector<long long> dp(amount + 1, 0);
    dp[0] = 1;                       // one way to make 0: take nothing
    for (int c : coins)              // coins OUTER
        for (int a = c; a <= amount; a++)
            dp[a] += dp[a - c];
    return dp[amount];
}

// Swap the loops and you count something ELSE:
//   for (int a = 1; a <= amount; a++)
//       for (int c : coins) if (c <= a) dp[a] += dp[a - c];
// Now 1+2 and 2+1 count separately: PERMUTATIONS
// (that exact variant is LeetCode "Combination Sum IV")`,
      annotations: {
        4: 'Counting DPs seed with 1, not 0 — the empty selection is one valid way to make zero.',
        5: 'Coin types are committed in a fixed order, so every multiset of coins is built exactly once. That is the whole combinations argument.',
        7: 'At this moment dp[a − c] = ways to build a−c using only coins seen SO FAR — later coins cannot sneak back in.',
      },
      py: {
        code: `# Coin Change II: COUNT ways to make amount (order irrelevant)
def countWays(coins: list[int], amount: int) -> int:
    dp = [0] * (amount + 1)
    dp[0] = 1                        # one way to make 0: take nothing
    for c in coins:                  # coins OUTER
        for a in range(c, amount + 1):
            dp[a] += dp[a - c]
    return dp[amount]

# Swap the loops and you count something ELSE:
#   for a in range(1, amount + 1):
#       for c in coins:
#           if c <= a: dp[a] += dp[a - c]
# Now 1+2 and 2+1 count separately: PERMUTATIONS
# (that exact variant is LeetCode "Combination Sum IV")`,
        annotations: {
          4: 'Counting DPs seed with 1, not 0 — the empty selection is one valid way to make zero. (No long long line to worry about: the counts can grow past 2⁶⁴ and Python will not care.)',
          5: 'Coin types are committed in a fixed order, so every multiset of coins is built exactly once. That is the whole combinations argument.',
          7: 'At this moment dp[a − c] = ways to build a−c using only coins seen SO FAR — later coins cannot sneak back in.',
        },
      },
    },
    {
      type: 'intuition',
      title: 'LIS: the best chain ending here',
      md: `Longest Increasing Subsequence of [10, 9, 2, 5, 3, 7, 101, 18] → [2, 3, 7, 18], length 4. Delete freely, keep order, strictly increase.

- Tempting-but-wrong state: "LIS of the first i elements". Knowing its length tells you nothing about whether a[i] can extend it — that depends on which last element the chain happened to keep.
- Right state: **dp[i] = length of the longest increasing subsequence that ENDS exactly at index i.** Now extension is checkable: a[i] extends a chain ending at j iff a[j] < a[i].
- dp[i] = 1 + max(dp[j]) over j < i with a[j] < a[i]; just 1 if no such j.
- Answer = max over ALL i — the LIS can end anywhere, not at the last index.
- O(n²). Fine to n ≈ 5000. Interviewer says n = 10⁵ → next section.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'LIS in n² — the state that makes chaining checkable',
      code: `int lisN2(vector<int>& a) {
    int n = a.size(), best = 0;
    vector<int> dp(n, 1);            // dp[i] = length of the LIS ENDING at i
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < i; j++)
            if (a[j] < a[i])         // strict <: equal elements cannot chain
                dp[i] = max(dp[i], dp[j] + 1);
        best = max(best, dp[i]);
    }
    return best;                     // the LIS can end ANYWHERE
}`,
      annotations: {
        3: 'The word "ENDING" is the entire trick. It pins down the one fact extension needs: the chain\'s last value is a[i].',
        6: 'Flip to <= and you compute longest NON-decreasing subsequence — a different problem. Know which one is being asked.',
        10: 'Returning dp[n−1] is the classic bug: [2, 3, 4, 1] gives dp = [1, 2, 3, 1] — answer 3 lives in the middle.',
      },
      py: {
        code: `def lisN2(a: list[int]) -> int:
    n, best = len(a), 0
    dp = [1] * n                     # dp[i] = length of the LIS ENDING at i
    for i in range(n):
        for j in range(i):
            if a[j] < a[i]:          # strict <: equal elements cannot chain
                dp[i] = max(dp[i], dp[j] + 1)
        best = max(best, dp[i])
    return best                      # the LIS can end ANYWHERE`,
        annotations: {
          3: 'The word "ENDING" is the entire trick. It pins down the one fact extension needs: the chain\'s last value is a[i].',
          6: 'Flip to <= and you compute longest NON-decreasing subsequence — a different problem. Know which one is being asked.',
          9: 'Returning dp[-1] is the classic bug: [2, 3, 4, 1] gives dp = [1, 2, 3, 1] — the answer 3 lives in the middle. max(dp) is the one-liner.',
        },
      },
    },
    {
      type: 'intuition',
      title: 'LIS in n log n: the tails array',
      md: `Keep one array, *tails*, while scanning left to right:

- **tails[k] = the smallest value that can end an increasing subsequence of length k+1**, over everything seen so far.
- Why smallest? Chains compete to be extended. A length-3 chain ending in 3 beats one ending in 5 — anything that extends the 5-chain extends the 3-chain too. Only the cheapest tail per length matters.
- New number x: find the FIRST tail ≥ x and replace it — x now ends that length more cheaply. No tail ≥ x → x extends the longest chain: append.
- tails is always sorted (if a length-4 chain could end below a length-3 tail, chopping its last element would beat that length-3 tail — contradiction). Sorted → "first ≥ x" is \`lower_bound\`, the exact binary search from the Big-O module. O(log n) per element.
- The answer is tails' **length**. Its contents are usually NOT the LIS — proof in the note below.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'LIS in n log n — tails + lower_bound',
      code: `int lis(vector<int>& a) {
    vector<int> tails;   // tails[k] = SMALLEST tail of any increasing
                         //            subsequence of length k+1
    for (int x : a) {
        auto it = lower_bound(tails.begin(), tails.end(), x); // first >= x
        if (it == tails.end()) tails.push_back(x);  // x extends the longest
        else *it = x;                    // x ends that length more cheaply
    }
    return (int)tails.size();
}
// [10, 9, 2, 5, 3, 7, 101, 18]:
// [10] -> [9] -> [2] -> [2,5] -> [2,3] -> [2,3,7] -> [2,3,7,101] -> [2,3,7,18]
// answer: 4. (Here tails happens to equal a real LIS -- pure luck, see note.)`,
      annotations: {
        5: 'lower_bound = first element >= x. Using upper_bound (first > x) instead would let equal values chain — that computes longest NON-decreasing.',
        7: 'Replacing never changes the length — it only makes future extensions easier. Lengths only grow via push_back.',
        12: 'Trace it by hand once: 5 gets appended, then 3 replaces it — length stays 2, but the length-2 chain now ends cheaper.',
      },
      py: {
        code: `import bisect

def lis(a: list[int]) -> int:
    tails = []   # tails[k] = SMALLEST tail of any increasing
                 #            subsequence of length k+1
    for x in a:
        i = bisect.bisect_left(tails, x)     # first index with tails[i] >= x
        if i == len(tails):
            tails.append(x)                  # x extends the longest
        else:
            tails[i] = x                     # x ends that length more cheaply
    return len(tails)

# [10, 9, 2, 5, 3, 7, 101, 18]:
# [10] -> [9] -> [2] -> [2,5] -> [2,3] -> [2,3,7] -> [2,3,7,101] -> [2,3,7,18]
# answer: 4. (Here tails happens to equal a real LIS -- pure luck, see note.)`,
        annotations: {
          7: 'bisect_left IS lower_bound: the first index whose value is >= x, returned as an int rather than an iterator. bisect_right (upper_bound) would let equal values chain — that computes longest NON-decreasing.',
          11: 'Replacing never changes the length — it only makes future extensions easier. Lengths only grow via append.',
          16: 'Trace it by hand once: 5 gets appended, then 3 replaces it — length stays 2, but the length-2 chain now ends cheaper.',
        },
      },
    },
    {
      type: 'note',
      md: 'Proof that tails ≠ the subsequence, in three numbers: [3, 4, 1] → [3] → [3, 4] → **[1, 4]**. Length 2 is correct (the real LIS is [3, 4]), but [1, 4] is not a subsequence at all — the 1 appears *after* the 4. The replace step rewrites history cheaper without rebuilding a chain. Need the actual sequence? Keep parent pointers — interview question below.',
    },
    {
      type: 'intuition',
      title: 'Russian Doll Envelopes: LIS in a costume',
      md: `Envelope (w, h) fits inside (W, H) iff w < W **and** h < H — strict on both. Deepest nesting?

- Sort by width ascending — widths handled — then LIS on heights… almost.
- The trap: equal widths. [3,4] and [3,5] sort adjacent; heights 4, 5 look increasing — but equal-width envelopes can never nest. A plain height-LIS chains them anyway. Wrong answer.
- The fix: on width ties, sort height **DESCENDING**. Equal-width envelopes become a decreasing run of heights, and a strictly increasing LIS can pick at most one from any decreasing run. The tiebreak encodes "same width can't nest" into the data — zero special-case code.
- Then run the tails LIS on heights. O(n log n) total.
- Same costume elsewhere: Maximum Length of Pair Chain, box stacking — any 2D "strictly dominates" problem becomes sort-one-dimension + LIS-on-the-other.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Russian Doll Envelopes — sort trick + tails LIS',
      code: `int maxEnvelopes(vector<vector<int>>& env) {
    sort(env.begin(), env.end(), [](const vector<int>& a, const vector<int>& b) {
        if (a[0] != b[0]) return a[0] < b[0];  // width ascending
        return a[1] > b[1];                    // tie: height DESCENDING
    });
    vector<int> tails;                         // plain LIS on heights
    for (auto& e : env) {
        auto it = lower_bound(tails.begin(), tails.end(), e[1]);
        if (it == tails.end()) tails.push_back(e[1]);
        else *it = e[1];
    }
    return (int)tails.size();
}`,
      annotations: {
        4: 'The whole problem lives in this line. Height-descending on ties makes equal-width envelopes mutually unpickable in a strict LIS.',
        6: 'From here down it is character-for-character the LIS from the previous snippet — the reduction is total.',
      },
      py: {
        code: `import bisect

def maxEnvelopes(env: list[list[int]]) -> int:
    env.sort(key=lambda e: (e[0], -e[1]))   # width ASC, height DESC on ties
    tails = []                              # plain LIS on heights
    for w, h in env:
        i = bisect.bisect_left(tails, h)
        if i == len(tails):
            tails.append(h)
        else:
            tails[i] = h
    return len(tails)`,
        annotations: {
          4: 'The whole problem lives in this line. Python sorts by a KEY, not a comparator, so "ascending then descending" is spelled with a minus sign on the second field — works for numbers; for strings you would need functools.cmp_to_key. Height-descending on ties makes equal-width envelopes mutually unpickable in a strict LIS.',
          6: 'From here down it is character-for-character the LIS from the previous snippet — the reduction is total.',
        },
      },
    },
    {
      type: 'note',
      md: `Trigger phrases → reflex:

- "pick items / capacity / budget, each at most once" → 0/1 knapsack, 1D array, **backwards**
- "can we hit sum X" / "split into two equal halves" → subset sum, target = total/2
- "unlimited supply / coins / reuse allowed" → unbounded, **forwards**
- "how many ways, order irrelevant" → coins outer · "sequences counted separately" → amount outer
- "longest increasing / chain of things fitting inside each other" → LIS: n ≤ 5000 → n² DP, bigger → tails + lower_bound`,
    },
  ],
  quiz: [
    {
      question: 'In the 1D 0/1 knapsack, why must the capacity loop run from W down to wt[i]?',
      options: [
        {
          text: 'Cache efficiency — backward sweeps are faster',
          explanation: 'Direction has no meaningful speed effect here. The issue is correctness, not performance.',
        },
        {
          text: 'The take term reads dp[w − wt], a cell to the LEFT — backwards guarantees left cells still hold the previous item\'s row, so the item is used at most once',
          explanation: 'Correct. Backwards preserves the invariant "left of the writer = row i−1". Forward would let the item pay for itself repeatedly.',
        },
        {
          text: 'To avoid reading outside the array',
          explanation: 'Bounds are handled by stopping the loop at wt[i] — that works in either direction.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Partition Equal Subset Sum on [1, 5, 11, 5]. What do you actually compute?',
      options: [
        {
          text: 'Subset-sum with target = total/2 = 11 — if one subset hits 11, the leftovers are automatically the other half',
          explanation: 'Correct. Total 22, target 11, and {11} vs {1, 5, 5} splits it. One boolean knapsack answers the whole question.',
        },
        {
          text: 'Try all ways of splitting into two arrays — O(2ⁿ) is unavoidable',
          explanation: 'The reduction kills the exponential: you never enumerate the second half, it is defined by the first.',
        },
        {
          text: 'Sort descending and deal elements to the lighter pile greedily',
          explanation: 'Greedy balancing approximates; it cannot certify EXACT equality. [1, 5, 11, 5] needs 11 alone on one side — the DP finds that, greedy dealing may not.',
        },
      ],
      correct: 0,
    },
    {
      question: 'Unbounded knapsack — infinite copies of each item. Loop direction for the 1D capacity sweep?',
      options: [
        {
          text: 'Backwards, same as 0/1 — direction is just a convention',
          explanation: 'Backwards actively PREVENTS reuse — the one thing unbounded is supposed to allow.',
        },
        {
          text: 'Either direction gives the same result',
          explanation: 'They differ exactly when capacity fits an item twice — which is the entire 0/1 vs unbounded distinction.',
        },
        {
          text: 'Forward — reading a cell this item already updated means taking another copy, which is now legal',
          explanation: 'Correct. The 0/1 bug is the unbounded feature. One loop direction flips the problem.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Coin Change II, coins {1, 2}, amount 3, coins as the OUTER loop. What does dp[3] end up holding?',
      options: [
        {
          text: '3 — all ordered sequences: 1+1+1, 1+2, 2+1',
          explanation: 'That is what AMOUNT-outer computes — permutations (Combination Sum IV). Coins-outer cannot tell 1+2 from 2+1.',
        },
        {
          text: '2 — the combinations {1,1,1} and {1,2}; each coin type is fully committed before the next, so order is inexpressible',
          explanation: 'Correct. Coins-outer builds every multiset exactly once. Swap the loops and the same code counts permutations.',
        },
        {
          text: '1 — only the single-coin-type way {1,1,1}',
          explanation: 'Mixing types is fine: when coin 2 is processed, dp[1] already holds ways using coin 1, so {1,2} is counted.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Your LIS code returns dp[n−1] (the n² version). Find an input where it fails.',
      options: [
        {
          text: 'It cannot fail — the LIS always ends at the last element',
          explanation: 'Any array ending in its minimum breaks that: the last element ends only chains of length 1.',
        },
        {
          text: '[1, 2, 3] — it returns 3, which is wrong',
          explanation: '3 is correct here. Passing one friendly test is not correctness — you need an adversarial one.',
        },
        {
          text: '[2, 3, 4, 1] — dp = [1, 2, 3, 1], so dp[n−1] = 1 but the LIS is 3. The answer is max over ALL i',
          explanation: 'Correct. dp[i] means "best chain ENDING at i", and the best chain can end anywhere in the array.',
        },
      ],
      correct: 2,
    },
    {
      question: 'After processing [3, 4, 1], tails = [1, 4]. Which statement is true?',
      options: [
        {
          text: 'The LIS length is 2, and tails[0] = 1 means: some increasing subsequence of length 1 now ends as cheaply as 1',
          explanation: 'Correct. tails stores the cheapest possible tail per length — bookkeeping for the future, not the answer sequence itself.',
        },
        {
          text: 'The LIS is [1, 4]',
          explanation: '[1, 4] is not even a subsequence — the 1 comes after the 4 in the input. The real LIS is [3, 4]. Only the LENGTH is the output.',
        },
        {
          text: 'The algorithm is broken, since [1, 4] never appears in the array in that order',
          explanation: 'It never claims tails is a subsequence. The length (2) is provably right; the contents are cheap-tail bookkeeping.',
        },
      ],
      correct: 0,
    },
    {
      question: 'Russian Doll Envelopes: why sort equal widths by height DESCENDING before the height-LIS?',
      options: [
        {
          text: 'Descending ties make lower_bound faster',
          explanation: 'Tie order has zero effect on speed — this is a correctness device.',
        },
        {
          text: 'It only matters when two envelopes are fully identical',
          explanation: 'It matters for DISTINCT heights sharing a width — [3,4] and [3,5] — which ascending order would wrongly chain.',
        },
        {
          text: 'Equal-width envelopes cannot nest; a descending height run means a strictly increasing LIS can pick at most one of them',
          explanation: 'Correct. The tiebreak encodes the "strict on both dimensions" rule into the data, so the plain LIS stays correct.',
        },
      ],
      correct: 2,
    },
    {
      question: 'The 0/1 knapsack DP runs in O(n·W). Is that polynomial time?',
      options: [
        {
          text: 'Yes — n·W is a polynomial expression',
          explanation: 'Polynomial in W\'s numeric VALUE — but the input encodes W in log W bits, so the runtime is exponential in input size.',
        },
        {
          text: 'No — it is pseudo-polynomial: W can be exponential in its own bit-length, which is why knapsack remains NP-hard despite this DP',
          explanation: 'Correct. Doubling the bits of W squares the numeric value. O(n·W) is polynomial in magnitude, exponential in encoding length.',
        },
        {
          text: 'No — it is O(2ⁿ) in disguise',
          explanation: 'The blow-up lives in W, not in the item count. For small W the DP is genuinely fast at any n.',
        },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Whiteboard: derive the 0/1 knapsack DP from nothing — state, base case, transition, complexity.',
      answer:
        'Start from the decision: for each item, take or skip. What varies between subproblems? Items still available and capacity left — so the state is dp[i][w] = best value using the first i items at capacity w. Base: dp[0][w] = 0. Transition: dp[i][w] = max(dp[i−1][w], dp[i−1][w−wt] + val), take allowed only if wt ≤ w — and stress that the take term reads row i−1, which is what enforces "once or never". Complexity O(n·W) time, O(n·W) space, compressible to O(W) with a backwards sweep. Close by naming the reconstruction: walk from dp[n][W]; wherever dp[i][w] ≠ dp[i−1][w], item i was taken.',
      isCaseBased: false,
    },
    {
      question: 'Explain the 2D → 1D compression, and prove the capacity loop must run backwards.',
      answer:
        'Row i reads only row i−1, so one array suffices — overwrite it per item. The invariant during item i\'s right-to-left sweep: cells RIGHT of the writer already hold row i; cells LEFT still hold row i−1. The take term reads dp[w−wt], which is left of the writer, hence row i−1 — the item cannot see a world where it was already taken. Sweep forward and the invariant flips: left cells hold row i, so dp[w−wt] may already include this item, and the item stacks onto itself — you have silently implemented unbounded knapsack. Same answer, O(W) memory, and one direction carrying the entire correctness argument.',
      isCaseBased: false,
    },
    {
      question: 'Case: a teammate\'s 1D knapsack passes several tests but returns impossibly high values on others. The loop reads: for (w = wt[i]; w <= W; w++). Diagnose — and explain why SOME tests still pass.',
      answer:
        'Forward sweep in a 0/1 knapsack = item reuse: dp[w−wt] may already contain this item, so it gets counted twice, three times, up to capacity. The give-away symptom is answers EXCEEDING the sum of all values. Why some tests pass: reuse needs room — if W < 2×(the item\'s weight) for the relevant items, or the optimum never benefits from a duplicate, forward accidentally matches. Small friendly tests rarely trip it; the fix is one token, w = W down to wt[i]. Interview meta: being able to state the row-invariant ("left of the writer = previous row") is what turns this from memorized trivia into a 30-second diagnosis.',
      isCaseBased: true,
    },
    {
      question: 'Reduce Partition Equal Subset Sum to knapsack and give the full complexity story.',
      answer:
        'Two halves with equal sums exist iff some subset hits total/2 — the complement is the other half for free. Odd total → return false immediately (say it before coding). Then boolean 0/1 knapsack: dp[s] = "some subset makes s", dp[0] = true, per number x sweep s from target down to x with dp[s] |= dp[s−x]. Time O(n · total/2), space O(total/2) — pseudo-polynomial, worth flagging. Flex ending: with a bitset the transition becomes dp |= dp << x — the same DP, 64 sums per machine word, routinely 50× faster in practice.',
      isCaseBased: false,
    },
    {
      question: 'Coin Change (min coins): why is greedy wrong, and what does the DP do instead? Name complexities.',
      answer:
        'Greedy (always biggest coin) fails on non-canonical systems: coins {1, 3, 4}, amount 6 — greedy takes 4+1+1 = 3 coins, optimal is 3+3 = 2. Real currencies are designed canonical, which is why intuition says greedy works. DP: dp[a] = fewest coins for amount a; dp[0] = 0; forward sweep per coin with dp[a] = min(dp[a], dp[a−c] + 1) — forward because coins are reusable (unbounded knapsack in disguise). Guard unreachable states with INF = 1e9, not INT_MAX (INT_MAX + 1 overflows negative and wins every min). O(amount × #coins) time, O(amount) space; dp[amount] == INF → return −1.',
      isCaseBased: false,
    },
    {
      question: 'Case: your Coin Change II solution outputs 3 on the sample coins {1, 2}, amount 3 — expected 2. The transition dp[a] += dp[a−c] is untouched. What did you change, and why does it matter?',
      answer:
        'The loops got swapped. Amount-outer means every amount considers appending every coin, so 1+2 and 2+1 arrive via different paths and both count — that is permutation counting (which is exactly LeetCode Combination Sum IV, a different problem). Coins-outer commits each coin type fully before the next, so a way can only be "how many of each coin" — every multiset counted once: combinations, the 2 the judge expects. The trap exists because for min/max DPs loop order is irrelevant (max(x,x) = x, duplicate paths harmless) while counting is order-sensitive (x + x ≠ x). Fix: coins outer, amount inner, and say the rule out loud.',
      isCaseBased: true,
    },
    {
      question: 'Walk me through the n log n LIS: what exactly does tails store, and why is binary search legal on it?',
      answer:
        'tails[k] = the smallest value that can end an increasing subsequence of length k+1 seen so far — cheapest tail per length, because a cheaper tail is strictly easier to extend. Per element x: lower_bound for the first tail ≥ x; if none, x extends the longest chain (append); otherwise replace that tail with x (that length now ends cheaper — length unchanged). Binary search is legal because tails is always sorted: if a length-4 chain could end at or below the length-3 tail, dropping its last element would produce a cheaper length-3 tail — contradiction. The answer is tails.size(); its CONTENTS are generally not the LIS ([3,4,1] ends with tails = [1,4], not a subsequence). O(n log n).',
      isCaseBased: false,
    },
    {
      question: 'In the tails algorithm, lower_bound vs upper_bound — what changes and when do you want each?',
      answer:
        'lower_bound finds the first tail ≥ x: an equal value REPLACES its own length rather than extending it, so equal elements never chain — strictly increasing LIS. upper_bound finds the first tail > x: an equal value lands one slot further right and extends the chain — longest NON-decreasing subsequence. One comparator, two different problems. Rule to recite: strict problem → lower_bound; "non-decreasing" or duplicates-allowed → upper_bound. Russian Doll needs the strict version on heights — with upper_bound, two envelopes of equal height would nest, which is wrong.',
      isCaseBased: false,
    },
    {
      question: 'Solve Russian Doll Envelopes and justify every piece — especially the sort tiebreak.',
      answer:
        'Nesting needs strict inequality on BOTH width and height. Sort by width ascending so width is non-decreasing along the array; then a height-LIS handles the second dimension. The subtlety is width ties: [3,4] and [3,5] cannot nest, but ascending heights 4,5 would chain in the LIS. Sorting ties by height DESCENDING turns every equal-width block into a decreasing height run — a strictly increasing LIS picks at most one per block, encoding "equal width cannot nest" into the data with no special-case code. Then the standard tails + lower_bound LIS on heights. O(n log n) total; the reduction pattern — 2D strict dominance → sort one dimension, LIS the other — recurs in pair-chain and box-stacking problems.',
      isCaseBased: false,
    },
    {
      question: 'Case: 0/1 knapsack, n = 40 items, but W up to 10⁹. Your O(n·W) table is dead on arrival. Options?',
      answer:
        'First name why it died: O(n·W) is pseudo-polynomial — W\'s value, not its bit-length, drives the cost, and 4×10¹⁰ cells is out. Options: (1) Swap dimensions — dp[v] = minimum weight achieving value v, O(n·ΣV) — wins when values are small even if weights are huge; answer = largest v with dp[v] ≤ W. (2) n = 40 screams meet-in-the-middle: split 20/20, enumerate 2²⁰ subsets per half, sort one half by weight keeping prefix-max value, binary search it from each subset of the other — O(2^{n/2} · n), about a million entries per side. (3) If fractional taking is allowed, the problem changes class: greedy by value/weight ratio, O(n log n). Choosing the dimension the constraints keep small is the actual skill being tested.',
      isCaseBased: true,
    },
    {
      question: 'Follow-up: your LIS returns the length. The interviewer wants the actual subsequence. Do it in both versions.',
      answer:
        'n² version: alongside dp[i], keep parent[i] = the j that gave dp[i] its max (−1 if none). Find argmax dp, walk parents backwards, reverse — O(n) extra, trivial. n log n version: tails positions are not the sequence, so record per element its landing position len[i] (index where lower_bound placed it) and pred[i] = the element currently sitting at position len[i]−1 at insertion time. Walk pred from the last element that achieved the maximum length, reverse. Still O(n log n), O(n) memory. Saying unprompted "tails itself is NOT the subsequence, so I need the extra bookkeeping" is exactly the understanding this follow-up probes.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    {
      front: '0/1 knapsack recurrence',
      back: 'dp[i][w] = max(dp[i−1][w], dp[i−1][w−wt] + val). Take consults row i−1 — the item can never reuse itself. O(n·W) time.',
    },
    {
      front: '1D knapsack loop-direction rule',
      back: '0/1 → capacity BACKWARDS (left cells still = previous row). Unbounded → FORWARDS (reuse legal). One direction flips the problem.',
    },
    {
      front: 'Partition Equal Subset Sum → ?',
      back: 'Odd total: false. Else subset-sum with target = total/2 — boolean 0/1 knapsack (max → ||), backwards sweep. Bitset flex: dp |= dp << x.',
    },
    {
      front: 'Coin Change II loop order',
      back: 'Coins outer → combinations (Coin Change II). Amount outer → permutations (Combination Sum IV). Counting is path-sensitive; min/max are not.',
    },
    {
      front: 'LIS n² state',
      back: 'dp[i] = LIS ending exactly at i. dp[i] = 1 + max dp[j] over j < i with a[j] < a[i]. Answer = max over ALL i, never just dp[n−1].',
    },
    {
      front: 'tails[k] means…',
      back: 'Smallest value that can end an increasing subsequence of length k+1. Always sorted → binary search. Length = answer; contents ≠ the LIS.',
    },
    {
      front: 'LIS: lower_bound or upper_bound?',
      back: 'Strictly increasing → lower_bound (first ≥ x: equals replace, never chain). Non-decreasing → upper_bound (first > x: equals extend).',
    },
    {
      front: 'Russian Doll sort rule',
      back: 'Width ascending; on width ties, height DESCENDING; then LIS on heights. Descending ties make equal widths unpickable together in a strict LIS.',
    },
    {
      front: 'Why O(n·W) is "pseudo-polynomial"',
      back: 'W is a numeric value the input stores in log W bits — n·W is exponential in input length. Hence knapsack stays NP-hard despite the DP.',
    },
    {
      front: 'Coin Change greedy trap',
      back: 'Biggest-coin greedy fails non-canonical systems: {1,3,4}, amount 6 → greedy 4+1+1 = 3 coins; DP finds 3+3 = 2. DP: unbounded knapsack, forward sweep.',
    },
  ],
  mindmapMarkdown: `- DP II: Knapsack Family & LIS Family
  - 0/1 knapsack
    - one question: take or skip
    - dp[i][w] = max(skip, take) via row i−1
    - O(n·W) — pseudo-polynomial
    - 1D: sweep capacity BACKWARDS
    - forward = accidental reuse
  - Disguises
    - Subset Sum: max → ||
    - Partition: target = total/2, odd → false
    - Target Sum: (total+S)/2
  - Unbounded knapsack
    - reuse legal → FORWARD sweep
    - Coin Change: min coins, greedy fails {1,3,4}→6
    - Coin Change II: coins outer = combinations
    - amount outer = permutations
  - LIS in n²
    - dp[i] = LIS ENDING at i
    - answer = max over all i
  - LIS in n log n
    - tails[k] = smallest tail, length k+1
    - sorted → lower_bound (L0 bridge)
    - length = answer, contents ≠ LIS
    - upper_bound → non-decreasing variant
  - Russian Doll Envelopes
    - sort width asc, height DESC on ties
    - LIS on heights
    - desc tie = equal widths can't chain`,
}

export default m
