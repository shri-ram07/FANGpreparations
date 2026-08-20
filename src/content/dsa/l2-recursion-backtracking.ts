import type { Module } from '../types'

const m: Module = {
  id: 'dsa-l2-recursion-backtracking',
  subjectId: 'dsa',
  level: 2,
  title: 'Recursion & Backtracking: Subsets, Permutations, N-Queens',
  whyItMatters:
    'Every "generate ALL the X" question at FAANG — subsets, permutations, combination sum, N-Queens — is one 10-line template in different costumes. This module gives you the template, the mental model that stops you tracing recursion on the whiteboard, and the pruning moves that separate "runs in milliseconds" from "2ⁿ forever".',
  estMinutes: 60,
  sections: [
    {
      type: 'intuition',
      title: 'Trust the smaller call',
      md: `You are a CEO. You do not do every employee's job — you hand the task down and trust the org chart. A recursive function is exactly that: it delegates a *smaller version of its own job* to itself.

- The #1 interview failure mode: tracing recursion 5 levels deep and freezing. **Never trace.**
- Verify exactly two things: (1) the **base case** handles the smallest input directly, (2) every call makes **progress** toward it — smaller n, next index, shorter range.
- If both hold, the whole function works. That is induction wearing work clothes.
- Design recipe: write the base case, then write ONE step assuming the recursive call *already works*.
- This assumption has a name worth saying out loud: the **leap of faith**.`,
    },
    {
      type: 'intuition',
      title: 'What the machine actually does: the call stack',
      md: `The leap of faith is for *you*. The machine keeps receipts: a stack of paper on a desk, where only the top sheet can be worked on.

- Every call pushes a **frame**: that call's parameters, its locals, and where to resume when it returns.
- Every return pops the top frame — the caller resumes mid-sentence, exactly where it left off.
- Depth-n recursion = n live frames = **O(n) space**, even if your code allocates nothing.
- No base case, or no progress? Frames pile up until the stack segment (typically a few MB, roughly 10⁴–10⁵ deep frames) runs out: **stack overflow**, a crash.
- So "recursion depth" is a real complexity answer — say it unprompted.`,
    },
    {
      type: 'intuition',
      title: 'Read complexity off the recursion tree',
      md: `Draw every call as a node, every call it makes as a child. Total work ≈ **number of nodes × work per node**.

- The shortcut: k choices per call, depth d → about **kᵈ nodes**. Branches to the power depth.
- Subsets: 2 branches (include/exclude), depth n → **2ⁿ** leaves.
- Permutations: n choices, then n−1, then n−2… → **n!** leaves.
- Do not forget output cost: copying each answer of length n multiplies by n. Subsets = O(2ⁿ · n).
- When output is itself exponential, exponential time is *optimal* — say that too.`,
    },
    {
      type: 'intuition',
      title: 'Backtracking: choose, explore, un-choose',
      md: `A maze and a piece of chalk. At each junction: mark one corridor (**choose**), walk it (**explore**), and when it dead-ends, walk back and *erase the mark* (**un-choose**) so the next corridor starts from a clean junction.

- One shared \`path\` object, mutated in place — not a fresh copy per call. That is the memory win.
- **The undo is the whole trick.** After exploring a choice, restore state EXACTLY so the next sibling choice starts clean.
- Forget the undo → branch 2 inherits branch 1's leftovers → corrupted answers. The single most common backtracking bug.
- Invariant to memorize: *state on function exit == state on function entry*.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'The universal template — every problem below is this',
      code: `// The shape of EVERY problem in this module
void backtrack(/* shared state */) {
    if (complete()) {            // base case: a full candidate
        record();                // snapshot the answer
        return;
    }
    for (/* each choice */) {
        if (!valid()) continue;  // PRUNE: kill hopeless branches early
        choose();                // mutate the ONE shared state
        backtrack();             // EXPLORE: trust the smaller call
        unchoose();              // UN-CHOOSE: restore state exactly
    }
}`,
      annotations: {
        8: 'Pruning lives here. A prune near the root deletes an entire exponential subtree — this line is why backtracking finishes and brute force does not.',
        9: 'One shared state for the whole tree. Copies per call would be correct but cost O(n) time and memory at every node.',
        11: 'The undo. It must mirror choose() exactly, in reverse order if there are several mutations. Delete it and every sibling branch starts dirty.',
      },
    },
    {
      type: 'intuition',
      title: 'Subsets: every element answers one yes/no question',
      md: `A subset is n independent yes/no decisions: is element 0 in? Is element 1 in? Each element doubles the possibilities.

- 2 × 2 × … × 2 = **2ⁿ subsets**. The recursion tree: 2 branches per level, n levels.
- The code asks one question per call: include \`a[i]\`, recurse; un-choose; exclude \`a[i]\`, recurse.
- Base case: \`i == n\` — every element decided, snapshot the path.
- Named problem: *Subsets* (LeetCode 78). Complexity **O(2ⁿ · n)** — 2ⁿ snapshots, each copying up to n elements.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Subsets — include/exclude branching',
      code: `vector<vector<int>> ans;
vector<int> path;

void dfs(int i, const vector<int>& a) {
    if (i == (int)a.size()) {   // every element decided
        ans.push_back(path);    // snapshot one finished subset
        return;
    }
    path.push_back(a[i]);       // CHOOSE: a[i] goes in
    dfs(i + 1, a);              // explore the include branch
    path.pop_back();            // UN-CHOOSE: restore path
    dfs(i + 1, a);              // explore the exclude branch
}
// dfs(0, a) on a=[1,2] fills ans: [1,2] [1] [2] []`,
      annotations: {
        6: 'push_back(path) copies the whole path — O(n) per snapshot. That copy is where the ·n in O(2ⁿ·n) comes from.',
        11: 'This pop_back IS the backtracking. Delete it and every subset after the first branch carries stale elements.',
        12: 'Two recursive calls per element = 2 branches per level = 2ⁿ leaves. Read the complexity straight off the code.',
      },
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'The call stack during subsets([1, 2])',
        notice: 'Left: recursion frames (top = deepest call). Right: the ONE shared path, plus every subset collected so far.',
        leftLabel: 'call stack',
        rightLabel: 'path + collected answers',
        frames: [
          {
            note: 'dfs(0) starts. One frame on the stack. path is empty; nothing collected.',
            stack: [{ name: 'dfs(i=0)', value: 'deciding on 1' }],
            heap: [{ id: 'path', value: '[]', label: 'shared path' }],
          },
          {
            note: 'CHOOSE 1: push 1 onto path, call dfs(1). A new frame stacks on top of the old one — the old frame waits, mid-sentence.',
            stack: [
              { name: 'dfs(i=1)', value: 'deciding on 2' },
              { name: 'dfs(i=0)', value: 'chose 1' },
            ],
            heap: [{ id: 'path', value: '[1]', label: 'shared path' }],
          },
          {
            note: 'CHOOSE 2: dfs(2) hits the base case i == n. Snapshot the path — first subset [1,2] recorded.',
            stack: [
              { name: 'dfs(i=2)', value: 'base: record' },
              { name: 'dfs(i=1)', value: 'chose 2' },
              { name: 'dfs(i=0)', value: 'chose 1' },
            ],
            heap: [
              { id: 'path', value: '[1, 2]', label: 'shared path' },
              { id: 'a0', value: '[1, 2]', label: 'ans[0]' },
            ],
          },
          {
            note: 'dfs(2) pops. dfs(1) resumes: UN-CHOOSE 2 (pop_back), then the exclude branch calls dfs(2) again — records [1].',
            stack: [
              { name: 'dfs(i=2)', value: 'base: record' },
              { name: 'dfs(i=1)', value: 'excluded 2' },
              { name: 'dfs(i=0)', value: 'chose 1' },
            ],
            heap: [
              { id: 'path', value: '[1]', label: 'shared path' },
              { id: 'a0', value: '[1, 2]', label: 'ans[0]' },
              { id: 'a1', value: '[1]', label: 'ans[1]' },
            ],
          },
          {
            note: 'Everything above dfs(0) has popped. dfs(0) UN-chooses 1 — path is [] again, exactly as on entry. Its exclude branch runs: dfs(1) chooses 2, and [2] is recorded.',
            stack: [
              { name: 'dfs(i=2)', value: 'base: record' },
              { name: 'dfs(i=1)', value: 'chose 2' },
              { name: 'dfs(i=0)', value: 'excluded 1' },
            ],
            heap: [
              { id: 'path', value: '[2]', label: 'shared path' },
              { id: 'a0', value: '[1, 2]', label: 'ans[0]' },
              { id: 'a1', value: '[1]', label: 'ans[1]' },
              { id: 'a2', value: '[2]', label: 'ans[2]' },
            ],
          },
          {
            note: 'Last branch: exclude 2 as well. dfs(2) records the empty subset. Every frame now pops in turn and the stack drains. 4 answers = 2² leaves — one per include/exclude route.',
            stack: [
              { name: 'dfs(i=2)', value: 'base: record' },
              { name: 'dfs(i=1)', value: 'excluded 2' },
              { name: 'dfs(i=0)', value: 'excluded 1' },
            ],
            heap: [
              { id: 'path', value: '[]', label: 'shared path' },
              { id: 'a0', value: '[1, 2]', label: 'ans[0]' },
              { id: 'a1', value: '[1]', label: 'ans[1]' },
              { id: 'a2', value: '[2]', label: 'ans[2]' },
              { id: 'a3', value: '[]', label: 'ans[3]' },
            ],
          },
        ],
      },
    },
    {
      type: 'note',
      md: 'Name the connection out loud in interviews: **backtracking IS depth-first search** — not "like" DFS, it *is* DFS, run on the implicit tree of partial solutions instead of an explicit graph. The call stack is the current root-to-node path; the un-choose is what happens as DFS retreats along an edge. Watch DFS below and see the same dive-deep-then-retreat motion.',
    },
    { type: 'visual', component: 'GraphTraversal', props: { algorithm: 'dfs' } },
    {
      type: 'intuition',
      title: 'Permutations: fill the slots, two ways',
      md: `A permutation is n slots filled one at a time. Slot 1 has n options, slot 2 has n−1, … → **n! leaves**, O(n · n!) with output copies. Two standard implementations — know both and the tradeoff:

- **used[] + path**: try every unused element for the current slot. Extra O(n) bookkeeping, output comes in input order (sorted input → lexicographic output), and duplicate inputs are handled with a one-line skip.
- **Swap-in-place**: elements before \`start\` are placed; swap each candidate into position \`start\`. Zero extra structures, cache-friendly — but output order is scrambled and duplicates get ugly.
- Named problems: *Permutations* (LC 46) → either way; *Permutations II* (LC 47, duplicates) → used[] with sort + skip.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Permutations two ways: used[] vs swap-in-place',
      code: `// Way 1: used[] -- keeps input order, dup-skip is easy
void permUsed(vector<int>& a, vector<int>& path,
              vector<bool>& used, vector<vector<int>>& ans) {
    if (path.size() == a.size()) { ans.push_back(path); return; }
    for (int i = 0; i < (int)a.size(); i++) {
        if (used[i]) continue;         // prune: already placed
        used[i] = true;                // choose (two mutations)
        path.push_back(a[i]);
        permUsed(a, path, used, ans);  // explore
        path.pop_back();               // un-choose in reverse order
        used[i] = false;
    }
}

// Way 2: swap-in-place -- O(1) extra space, scrambled order
void permSwap(vector<int>& a, int start, vector<vector<int>>& ans) {
    if (start == (int)a.size()) { ans.push_back(a); return; }
    for (int i = start; i < (int)a.size(); i++) {
        swap(a[start], a[i]);          // choose: a[i] fills slot start
        permSwap(a, start + 1, ans);   // slots after start still open
        swap(a[start], a[i]);          // un-choose: same swap undoes it
    }
}`,
      annotations: {
        6: 'used[] is the constraint check — O(1) per candidate. For duplicates (LC 47): sort first, then also skip when a[i]==a[i-1] && !used[i-1].',
        10: 'Two mutations in choose → two undos, in REVERSE order. Undoing out of order is the classic multi-mutation bug.',
        19: 'The array splits at start: prefix = decided slots, suffix = remaining candidates. The swap moves one candidate across the border.',
        21: 'A swap is its own inverse — the cheapest un-choose in this module. The price: ans collects permutations in non-lexicographic order.',
      },
    },
    {
      type: 'intuition',
      title: 'Combination Sum: reuse allowed, duplicates forbidden',
      md: `*Combination Sum* (LC 39): candidates [2,3,6,7], target 7 → [2,2,3] and [7]. Each candidate may be used **any number of times**, but [2,2,3] and [3,2,2] are the SAME answer — return it once.

- The one-index trick: recurse with **the same i, not i+1**. Same i = "you may pick me again".
- But the for-loop still only moves forward from \`start\` — you may repeat the current candidate, never *return to an earlier one*. That forces every combination out in one canonical (non-decreasing) order. No duplicates, no seen-set needed.
- Passing \`i + 1\` instead = the no-reuse variant (*Combination Sum II*, LC 40).
- Passing 0 every time = permutations of the same multiset — duplicate answers. This is THE follow-up trap.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Combination Sum with the sort + break prune',
      code: `// sort(cand.begin(), cand.end()) BEFORE the first call
void dfs(int start, int remain, vector<int>& cand,
         vector<int>& path, vector<vector<int>>& ans) {
    if (remain == 0) { ans.push_back(path); return; }
    for (int i = start; i < (int)cand.size(); i++) {
        if (cand[i] > remain) break;   // prune: all later ones are bigger
        path.push_back(cand[i]);       // choose
        dfs(i, remain - cand[i], cand, path, ans);
        path.pop_back();               // un-choose
    }
}
// cand=[2,3,6,7], target=7 -> [2,2,3] and [7]`,
      annotations: {
        6: 'break, not continue — the array is sorted, so once one candidate overshoots, every later one does too. One comparison kills the rest of the loop at EVERY node of the tree.',
        8: 'dfs(i, …), not i+1: reuse allowed. And never less than i — looking backwards would generate [2,3] and [3,2] as separate answers.',
      },
    },
    {
      type: 'note',
      md: 'Pruning is the entire difference between backtracking and blind brute force. The tree is exponential; a prune one level below the root does not save one node — it deletes an **exponential subtree**. Sort + break in Combination Sum, the O(1) constraint checks in N-Queens below: without them these problems are 2ⁿ-forever; with them, milliseconds. When your backtracking TLEs, the fix is almost never "recurse differently" — it is "prune earlier".',
    },
    {
      type: 'intuition',
      title: 'N-Queens: three sets make safety O(1)',
      md: `Place n queens on an n×n board, none attacking another (*N-Queens II*, LC 52: count the solutions). The setup does half the work:

- Place **one queen per row**, recursing row by row — row conflicts become impossible *by construction*.
- Columns: one bool array, \`col[c]\`.
- Diagonals are the beautiful part: every cell on the same ↗ diagonal has the same **r + c**; every cell on the same ↘ diagonal has the same **r − c** (shift by n−1 to index an array).
- So "is (r, c) safe?" = three array lookups — **O(1)**, versus O(n) for scanning the board.
- Unpruned tree: n choices per row, n rows → nⁿ. The three checks collapse it to thousands of nodes for n=8.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'N-Queens — count solutions',
      code: `int total = 0;
vector<bool> col, d1, d2;   // d1 indexes r+c, d2 indexes r-c+n-1

void place(int r, int n) {
    if (r == n) { total++; return; }   // n queens placed: a solution
    for (int c = 0; c < n; c++) {
        if (col[c] || d1[r + c] || d2[r - c + n - 1]) continue;
        col[c] = d1[r + c] = d2[r - c + n - 1] = true;    // choose
        place(r + 1, n);                                  // explore
        col[c] = d1[r + c] = d2[r - c + n - 1] = false;   // un-choose
    }
}

int solveNQueens(int n) {
    total = 0;
    col.assign(n, false);
    d1.assign(2 * n - 1, false);       // r+c ranges 0 .. 2n-2
    d2.assign(2 * n - 1, false);
    place(0, n);
    return total;                      // n=4 -> 2, n=8 -> 92
}`,
      annotations: {
        5: 'Counting means the base case is total++ — no board to copy. For LC 51 (print boards), keep a queens-per-row vector and render it here.',
        7: 'The whole trick in one line: three O(1) lookups replace an O(n) board scan. r-c can be negative, hence the +n-1 shift into array range.',
        20: 'Sanity anchors worth memorizing: n=4 has 2 solutions, n=8 has 92. If your code says otherwise, the diagonal indexing is off.',
      },
    },
    {
      type: 'intuition',
      title: 'Sudoku: the same template with heavier constraints',
      md: `A Sudoku solver is the same 10 lines. Only the constraint bookkeeping got promoted.

- Choose: a digit 1–9 for the next empty cell. Explore. Un-choose: clear the cell.
- Valid = digit unused in its **row**, its **column**, and its **3×3 box** — three sets again, just like N-Queens. Box index: \`(r / 3) * 3 + c / 3\`.
- Raw branching: up to 9 per cell, ~50 empty cells → 9⁵⁰ unpruned. The three constraints prune so hard that real puzzles solve in milliseconds.
- Name the upgrades if asked: bitmask the three sets (an int per row/col/box), and fill the **most-constrained cell first** (MRV heuristic) so failures happen near the root — where pruning pays exponentially.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Sudoku solver — the template, promoted',
      code: `bool rowSet[9][10], colSet[9][10], boxSet[9][10];

bool solve(vector<vector<char>>& g, int pos) {
  if (pos == 81) return true;              // every cell placed
  int r = pos / 9, c = pos % 9, b = (r / 3) * 3 + c / 3;
  if (g[r][c] != '.') return solve(g, pos + 1);

  for (int d = 1; d <= 9; d++) {
    if (rowSet[r][d] || colSet[c][d] || boxSet[b][d]) continue;
    g[r][c] = '0' + d;                     // choose
    rowSet[r][d] = colSet[c][d] = boxSet[b][d] = true;
    if (solve(g, pos + 1)) return true;    // explore
    g[r][c] = '.';                         // un-choose
    rowSet[r][d] = colSet[c][d] = boxSet[b][d] = false;
  }
  return false;                            // no digit fits: backtrack
}`,
      annotations: {
        4: 'pos walks 0..80 in row-major order — one linear index replaces two nested loops.',
        5: 'The box formula (r/3)*3 + c/3 maps any cell to its 3x3 box id 0..8 — memorize it, interviewers ask.',
        9: 'Three O(1) constraint checks — the same sets idea as N-Queens cols/diagonals, one size bigger.',
        13: 'Returning true UP the chain the moment a full board exists — Sudoku wants one solution, not all of them.',
      },
    },
  ],
  quiz: [
    {
      question: 'An array has 20 distinct elements. How many subsets does it have?',
      options: [
        { text: '20² = 400', explanation: 'That counts pairs of elements, not subsets. Subsets are yes/no decisions per element.' },
        { text: '2²⁰ ≈ 1 million — each element is independently in or out', explanation: 'Correct. n independent yes/no choices multiply: 2ⁿ. The recursion tree has 2 branches per level, 20 levels.' },
        { text: '20! — all orderings', explanation: '20! counts permutations (arrangements). Subsets ignore order entirely.' },
        { text: '20 × 19 = 380', explanation: 'That is ordered pairs. Subsets can have any size from 0 to 20.' },
      ],
      correct: 1,
    },
    {
      question: 'You delete the path.pop_back() line from the subsets code. What happens?',
      options: [
        { text: 'Compile error — the recursion becomes invalid', explanation: 'It compiles fine. The bug is logical: the shared state is never restored.' },
        { text: 'path keeps growing; every subset after the first branch carries stale elements', explanation: 'Correct. Sibling branches share ONE path object. Without the undo, the exclude branch inherits the include branch\'s leftovers — corrupted answers.' },
        { text: 'Only the empty subset goes missing', explanation: 'Far worse — almost every collected subset is wrong, not just one.' },
        { text: 'Stack overflow', explanation: 'Recursion depth is unchanged (still n levels). The damage is to the answers, not the stack.' },
      ],
      correct: 1,
    },
    {
      question: 'Combination Sum recurses with dfs(i, remain − cand[i], …). Why i and not i + 1?',
      options: [
        { text: 'Passing i keeps the current candidate reusable, while still never looking backwards — each combination appears exactly once, in non-decreasing order', explanation: 'Correct. Same i = "may pick me again"; never going below i kills duplicate orderings like [2,3] vs [3,2].' },
        { text: 'i + 1 would cause infinite recursion', explanation: 'No — i+1 terminates fine. It just forbids reuse, which is the Combination Sum II variant, a different problem.' },
        { text: 'It is a micro-optimization that saves one addition', explanation: 'It is correctness, not speed: i vs i+1 is the difference between "reuse allowed" and "reuse forbidden".' },
      ],
      correct: 0,
    },
    {
      question: 'Two queens at (r1, c1) and (r2, c2) share a ↗ diagonal exactly when…',
      options: [
        { text: 'r1 + c1 == r2 + c2', explanation: 'Correct. Moving up-right changes r by −1 and c by +1 — the sum stays constant along the whole ↗ diagonal.' },
        { text: 'r1 − c1 == r2 − c2', explanation: 'That is the OTHER family: the ↘ diagonals, where the difference stays constant.' },
        { text: 'r1 == r2', explanation: 'Same row — which the row-by-row placement already makes impossible by construction.' },
        { text: 'r1 · c1 == r2 · c2', explanation: 'Products have no diagonal meaning — (1,4) and (2,2) share no line at all.' },
      ],
      correct: 0,
    },
    {
      question: 'A recursive function has a correct base case, but one branch calls itself with the SAME arguments. What physically happens?',
      options: [
        { text: 'The compiler rejects it as infinite recursion', explanation: 'Compilers rarely prove non-termination; this compiles and runs.' },
        { text: 'It loops forever in constant memory', explanation: 'That is an iterative infinite loop. Recursion pays a stack frame per call — memory grows.' },
        { text: 'Frames push without ever popping until stack memory runs out — stack overflow crash', explanation: 'Correct. No progress toward the base case means frames accumulate until the stack segment (a few MB) is exhausted.' },
      ],
      correct: 2,
    },
    {
      question: 'Total complexity of generating all subsets of n elements (including producing the output)?',
      options: [
        { text: 'O(2ⁿ)', explanation: 'That counts the leaves but forgets the snapshot: ans.push_back(path) copies up to n elements per subset.' },
        { text: 'O(2ⁿ · n) — 2ⁿ subsets, each copied in O(n)', explanation: 'Correct. Tree size gives 2ⁿ; the per-answer copy contributes the ·n. Both factors belong in your stated answer.' },
        { text: 'O(n²)', explanation: 'Polynomial cannot even write down 2ⁿ answers — output size alone is exponential.' },
        { text: 'O(n · n!)', explanation: 'That is permutations. Subsets branch 2 ways per element, not n ways per slot.' },
      ],
      correct: 1,
    },
    {
      question: 'Which statement about swap-in-place permutations (vs used[]) is TRUE?',
      options: [
        { text: 'It needs a used[] array to avoid repeats', explanation: 'No — the prefix/suffix split replaces used[]: everything before start is placed, everything after is available.' },
        { text: 'It uses O(1) extra bookkeeping, but the output is not in lexicographic order', explanation: 'Correct. The swap trick costs nothing extra and undoes itself, but scrambles output order — and handles duplicate inputs poorly.' },
        { text: 'It produces duplicate permutations even on distinct inputs', explanation: 'On distinct elements it produces exactly n! distinct permutations — duplicates only become a problem when the INPUT has repeats.' },
      ],
      correct: 1,
    },
    {
      question: 'cand is sorted ascending. Inside the loop, cand[i] > remain. break or continue?',
      options: [
        { text: 'continue — a later candidate might still fit', explanation: 'Sorted order says the opposite: every later candidate is ≥ this one, so all of them overshoot too.' },
        { text: 'break — everything after i is even larger, so the whole rest of the loop is hopeless', explanation: 'Correct. This is the sort + break prune: one comparison discards all remaining siblings, at every node of an exponential tree.' },
        { text: 'Either — identical results and identical speed', explanation: 'Identical results, yes. Identical speed, no: continue still visits and tests every remaining candidate at every node — exponentially many wasted checks in aggregate.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why can you trust a recursive call without tracing it? Convince me this is rigorous, not hand-waving.',
      answer:
        'It is induction. Base case: the function is correct on the smallest input by direct inspection. Inductive step: ASSUMING the function is correct on all smaller inputs, the current call combines those results correctly. Both verified → correct for all inputs, no tracing needed. Practically, I check three things: base case handles the floor, every recursive call makes strict progress toward it, and the combining step is right. Tracing five levels by hand is not extra rigor — it is how people run out of whiteboard and time.',
      isCaseBased: false,
    },
    {
      question: 'What does the machine actually do during recursion, and what exactly is a stack overflow?',
      answer:
        'Each call pushes a stack frame holding parameters, locals, and the return address; each return pops it and the caller resumes exactly where it stopped. Depth-d recursion therefore costs O(d) memory even if the code allocates nothing — recursion depth IS a space complexity answer. Stack overflow: frames accumulate faster than they pop — missing base case, no progress, or simply legitimate depth beyond the stack segment (a few MB, so ~10⁴–10⁵ deep frames). Interview follow-up worth pre-empting: even CORRECT recursion overflows on deep inputs (DFS on a 10⁶-node path graph), and the fix is an explicit stack or iteration.',
      isCaseBased: false,
    },
    {
      question: 'Derive the complexity of generating all subsets and all permutations from their recursion trees.',
      answer:
        'Rule: total work ≈ nodes × work per node, and a tree with k branches and depth d has about k^d nodes. Subsets: 2 branches (include/exclude) × depth n → 2ⁿ leaves; each leaf snapshots a path of up to n elements → O(2ⁿ · n). Permutations: branching shrinks — n, then n−1, then n−2 — so leaves number n!; each copy costs n → O(n · n!). Internal nodes are dominated by the leaf level in both trees. Closing point that scores: the OUTPUT is exponential, so exponential time is optimal here — the interviewer is testing whether you know when exponential is acceptable.',
      isCaseBased: false,
    },
    {
      question: 'Case: your subsets function returns garbage — subsets contain elements that should not be there, and later subsets are longer than expected. You recently deleted one line during cleanup. Which line, and why did everything break?',
      answer:
        'The pop_back() after the include-branch recursion — the un-choose. All branches share ONE path object; the undo guarantees the invariant "state on exit == state on entry". Without it, when the include branch returns, a[i] is still sitting in path, so the exclude branch and every later sibling explore with contaminated state — answers grow and carry stale elements, exactly the symptom described. Fixes: restore the pop_back, or pass path BY VALUE so each call owns a copy — correct but O(n) copy per node, turning O(2ⁿ·n) into a noticeably heavier constant and O(n²) extra stack memory. Name that tradeoff; the shared-state + undo version is the interview standard.',
      isCaseBased: true,
    },
    {
      question: 'Permutations: swap-in-place vs used[] — give the full tradeoff. Which handles duplicate input elements better?',
      answer:
        'Both are O(n · n!) time. used[] + path: O(n) extra bookkeeping, output follows input order (sort first → lexicographic output), and duplicates are one line — sort, then skip a[i]==a[i−1] when used[i−1] is false, which forces equal elements to be placed left-to-right and kills duplicate permutations. Swap-in-place: O(1) extra state, the swap is its own inverse, cache-friendly — but output order is scrambled and duplicate handling is ugly (you need a per-recursion-level seen-set, which reintroduces the bookkeeping you saved). Verdict: swap for distinct elements when asked to minimize space; used[] the moment duplicates or ordered output enter the conversation.',
      isCaseBased: false,
    },
    {
      question: 'In Combination Sum, why is the recursive call dfs(i, …) — not i+1, and not 0?',
      answer:
        'Three behaviors, one index. Pass i: the current candidate stays available → unlimited reuse, but the loop never revisits earlier candidates, so every combination is emitted exactly once in non-decreasing order — no duplicate answers, no dedup set. Pass i+1: each candidate used at most once — that is Combination Sum II (LC 40), which also needs the sort + skip-equal-siblings trick because the INPUT can contain duplicates. Pass 0: you would regenerate the same multiset in every order — [2,2,3], [2,3,2], [3,2,2] as three "different" answers. The start index is doing silent deduplication work; being able to articulate that is the point of the follow-up.',
      isCaseBased: false,
    },
    {
      question: 'Explain the N-Queens three-sets trick. Why does row-by-row placement matter, and why is the safety check O(1)?',
      answer:
        'Recurse one row at a time, placing exactly one queen per row — row conflicts are now impossible by construction, no check needed. Remaining threats: columns and the two diagonal families. col[c] handles columns. Diagonals reduce to arithmetic invariants: all cells on a ↗ diagonal share r+c (step up-right: r−1, c+1, sum unchanged); all cells on a ↘ diagonal share r−c (shifted by n−1 to index an array of size 2n−1). So "safe?" is three array lookups — O(1) — versus O(n) for scanning the partial board. That factor-n saving applies at EVERY node of the tree. Sanity anchors: n=4 → 2 solutions, n=8 → 92.',
      isCaseBased: false,
    },
    {
      question: 'Case: your N-Queens counts correctly but TLEs at n=14. Your isSafe() walks the column and both diagonals of the partial board. The interviewer says: same algorithm, make it fast. What do you do?',
      answer:
        'Three upgrades, in order of payoff. (1) Replace the O(n) board scan with the col/d1/d2 boolean arrays → O(1) checks; that alone is a factor-n speedup across the whole tree. (2) Since only the COUNT is needed, store no board at all — the base case is total++. (3) Bitmask version: cols, d1, d2 as integers; free = ~(cols | d1 | d2) & ((1<<n) − 1); repeatedly take the lowest set bit (bit = free & −free) and recurse with (cols|bit, (d1|bit)<<1, (d2|bit)>>1) — branchless candidate generation, the standard fastest counting solution. Bonus symmetry prune: only try first-row columns in the left half and double the count (handle the middle column separately for odd n) — halves the work. Complexity stays exponential; the constant collapses.',
      isCaseBased: true,
    },
    {
      question: 'Sketch a Sudoku solver. What changes compared to subsets or N-Queens, and what would you name as optimizations?',
      answer:
        'Identical template: find the next empty cell; for each digit 1–9, check validity, place (choose), recurse (explore), erase (un-choose); base case = no empty cell left. Validity = three constraint sets again — digit unused in row r, column c, and box (r/3)*3 + c/3 — each O(1). What changed vs N-Queens is only weight: branching up to 9 and ~50 empty cells → 9⁵⁰ unpruned, but three simultaneous constraints prune brutally, so real puzzles finish in milliseconds. Optimizations to name: bitmasks for the 27 sets (test/set/clear in single ops), and MRV — always fill the cell with the FEWEST legal digits next, so contradictions surface near the root where cutting a subtree saves exponential work.',
      isCaseBased: false,
    },
    {
      question: 'Backtracking is still exponential. Why is it acceptable in interviews when brute force is not — and when is it NOT acceptable?',
      answer:
        'Two separate defenses. (1) When the task is "output all X", the output itself is exponential (2ⁿ subsets, n! permutations) — no algorithm beats the output size, so exponential is optimal, not sloppy. (2) When the task is "find/count valid X", pruning is the argument: each early constraint check deletes an exponential subtree, collapsing nⁿ-shaped trees to thousands of nodes (N-Queens n=8: 92 solutions found in ~2000 placements, versus 64-choose-8 ≈ 4.4 × 10⁹ raw). NOT acceptable: when constraints barely prune and n is large, or when the question only asks for a count or an optimum with overlapping subproblems — that is the cue for DP, greedy, or math, and saying so is the senior move.',
      isCaseBased: false,
    },
    {
      question: 'Case: an unseen problem — "return all valid IP addresses formed by inserting dots into a digit string". Walk me through recognizing it and setting up the recursion, without having memorized the solution.',
      answer:
        'Recognition: "return ALL valid X built from choices under constraints" — backtracking trigger phrase. Map to the template. State: index into the string + segments chosen so far. Choices: next segment = 1, 2, or 3 characters. Constraints (prune before recursing): numeric value ≤ 255, no leading zero unless the segment is exactly "0", never more than 4 segments, and enough characters must remain for the segments left (remaining length between 1× and 3× the remaining slots — a strong prune). Base case: exactly 4 segments consuming the entire string → join and record. Choose = append segment, explore, un-choose = pop it. Complexity: depth ≤ 4, branching ≤ 3 → at most 3⁴ = 81 paths — effectively O(1), and saying that shows the recursion-tree reflex. The meta-point interviewers reward: the template transferred to a problem you had never seen.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Recursion checklist — the only 2 things to verify', back: '(1) Base case handles the smallest input directly. (2) Every recursive call makes strict progress toward it. Both hold → the function is correct. Never trace deep.' },
    { front: 'The leap of faith', back: 'Assume the recursive call already works on the smaller input; design only the base case + one combining step. It is induction in code.' },
    { front: 'Backtracking template', back: 'if complete → record. Else for each choice: prune → CHOOSE → EXPLORE (recurse) → UN-CHOOSE. One shared state, mutated then restored exactly.' },
    { front: 'Why the un-choose is the whole trick', back: 'Sibling branches share ONE state object. Skip the undo and branch 2 starts with branch 1\'s leftovers — corrupted answers. Invariant: state on exit == state on entry.' },
    { front: 'Recursion tree complexity shortcut', back: 'Nodes ≈ branches^depth, total = nodes × work per node. Subsets: 2ⁿ. Permutations: n!. Add ×n when each answer is copied out.' },
    { front: 'Subsets — count and generation cost', back: '2ⁿ subsets (in/out per element). Generating them: O(2ⁿ · n) — the ·n is the snapshot copy at each leaf.' },
    { front: 'Permutations: used[] vs swap-in-place', back: 'used[]: O(n) extra, ordered output, one-line duplicate skip. Swap: O(1) extra, self-inverse undo, scrambled order, poor with duplicates. Both O(n · n!).' },
    { front: 'Combination Sum start-index rule', back: 'Reuse allowed → recurse with i (not i+1). Never pass less than i, or the same combination appears in every order. i+1 = the no-reuse variant (LC 40).' },
    { front: 'N-Queens O(1) safety check', back: 'col[c], d1[r+c], d2[r−c+n−1]. Same ↗ diagonal ⇔ same r+c; same ↘ ⇔ same r−c. Anchors: n=4 → 2, n=8 → 92.' },
    { front: 'Trigger phrases → backtracking', back: '"Generate ALL…", "every combination/arrangement/placement", constraints on partial solutions, n small (≲ 20). Then: decision tree + DFS + undo + prune early.' },
  ],
  mindmapMarkdown: `- Recursion & Backtracking
  - Mental model
    - Base case + strict progress
    - Trust the smaller call (induction)
    - Never trace 5 levels deep
  - Call stack
    - Frame = params + locals + return address
    - Depth n → O(n) space
    - No progress → stack overflow
  - Recursion tree
    - Total = nodes × per-node work
    - Nodes ≈ branches^depth
    - Output copies add ×n
  - The template
    - choose → explore → un-choose
    - ONE shared state
    - Missing undo = corrupted siblings
    - Backtracking IS DFS on the decision tree
  - Subsets (LC 78)
    - Include/exclude → 2ⁿ
    - O(2ⁿ · n) with snapshots
  - Permutations (LC 46/47)
    - used[]: ordered, dup-skip easy
    - Swap-in-place: O(1) extra, scrambled
    - O(n · n!)
  - Combination Sum (LC 39/40)
    - Reuse → recurse with i, not i+1
    - Sort + break prune
  - N-Queens (LC 51/52)
    - One queen per row
    - col / r+c / r−c sets → O(1) check
    - n=4 → 2, n=8 → 92
  - Sudoku idea
    - Same template, 9-way branching
    - Row/col/box sets · bitmask · MRV
  - Pruning
    - One check deletes an exponential subtree
    - Feasible vs 2ⁿ-forever`,
}

export default m
