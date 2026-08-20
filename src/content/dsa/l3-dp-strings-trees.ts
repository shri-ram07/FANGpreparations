import type { Module } from '../types'

const m: Module = {
  id: 'dsa-l3-dp-strings-trees',
  subjectId: 'dsa',
  level: 3,
  title: 'DP III: String DP & DP on Trees',
  whyItMatters:
    'Edit distance is a FAANG evergreen — Google has asked it for two decades — and House Robber III is the classic "DP but no array" curveball. Both families are one idea each: a table indexed by two PREFIXES, and a postorder walk where children report before parents. Learn the two shapes and a dozen "hard" problems become fill-in-the-blanks.',
  estMinutes: 60,
  sections: [
    {
      type: 'intuition',
      title: 'One state to rule all string DP',
      md: `Two books, one bookmark in each. Every two-string problem is a question about where the bookmarks stand.

- **dp[i][j] = the answer for the first i characters of s and the first j characters of t** — the prefixes s[0..i) and t[0..j).
- i and j count characters *consumed*, not indices. So the table is (n+1)×(m+1): row 0 and column 0 are the empty-prefix base cases.
- Filling a cell means asking one question: *what happens with the LAST characters of these two prefixes?*
- The answer always comes from at most three neighbors: **diagonal** dp[i-1][j-1], **up** dp[i-1][j], **left** dp[i][j-1] — both bookmarks back, s's back, t's back.
- LCS, edit distance, and palindromic subsequence are this same table with different cell rules. Master the state once.`,
    },
    {
      type: 'intuition',
      title: 'LCS — the ancestor of string DP',
      md: `Longest Common Subsequence: the longest string you can get by deleting characters from BOTH s and t. ("abcde", "ace") → "ace", length 3.

- Stand at dp[i][j] and look at the last characters s[i-1] and t[j-1].
- **Match:** pair them up. Both consumed → 1 + dp[i-1][j-1]. The diagonal, plus one.
- **Mismatch:** they can't both end the common subsequence — so one of them is dead weight. Drop s's last (**up**) or drop t's last (**left**), keep the better: max(dp[i-1][j], dp[i][j-1]).
- Base: LCS of anything with an empty string is 0 — row 0 and column 0 stay 0.
- Cost: fill n·m cells, O(1) each → **O(n·m) time and space**.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'LCS — the table, verbatim from the recurrence',
      code: `int lcs(const string& s, const string& t) {
    int n = s.size(), m = t.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++) {
            if (s[i-1] == t[j-1])
                dp[i][j] = 1 + dp[i-1][j-1];             // match: diagonal + 1
            else
                dp[i][j] = max(dp[i-1][j], dp[i][j-1]);  // drop one last char
        }
    return dp[n][m];   // lcs("abcde", "ace") == 3
}`,
      annotations: {
        3: 'The (n+1)×(m+1) shape: row 0 / col 0 mean "empty prefix" and stay 0 — the base case costs zero code.',
        6: 'dp index i = "first i chars", so the newest char is s[i-1]. THE string-DP off-by-one — interviewers watch this line.',
        7: 'The +1 is earned by pairing THIS s-char with THIS t-char. Only the diagonal state has both of them removed.',
        9: 'Mismatch: try losing s\'s last char (up) or t\'s last char (left). The diagonal is never needed here — it can\'t beat either.',
      },
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'LCS corner logic — s = "AB", t = "AC"',
        notice: 'Every cell is decided by at most three neighbors. A match reads one (diagonal); a mismatch reads two (up, left).',
        leftLabel: 'decision at the current cell',
        rightLabel: 'dp grid (rows i = s prefix, cols j = t prefix)',
        frames: [
          {
            note: 'Filling dp[1][1]: compare s[0]=A with t[0]=A. MATCH — take the diagonal and add 1. Up and left are not even consulted.',
            stack: [
              { name: 'current', to: 'd11' },
              { name: 'diag', to: 'd00' },
              { name: 'up', to: 'd01' },
              { name: 'left', to: 'd10' },
              { name: 's[0] / t[0]', value: 'A / A — MATCH' },
            ],
            heap: [
              { id: 'd00', value: '0', label: 'dp[0][0]' },
              { id: 'd01', value: '0', label: 'dp[0][1]' },
              { id: 'd02', value: '0', label: 'dp[0][2]' },
              { id: 'd10', value: '0', label: 'dp[1][0]' },
              { id: 'd11', value: '?', label: 'dp[1][1]' },
              { id: 'd12', value: '·', label: 'dp[1][2]' },
              { id: 'd20', value: '0', label: 'dp[2][0]' },
              { id: 'd21', value: '·', label: 'dp[2][1]' },
              { id: 'd22', value: '·', label: 'dp[2][2]' },
            ],
          },
          {
            note: 'dp[1][1]=1 written. Now dp[1][2]: s[0]=A vs t[1]=C. MISMATCH — one of the two chars is dead weight. Up = LCS("", "AC") = 0, left = LCS("A", "A") = 1. Take max = 1. Diagonal is ignored on a mismatch.',
            stack: [
              { name: 'current', to: 'd12' },
              { name: 'diag', to: 'd01' },
              { name: 'up', to: 'd02' },
              { name: 'left', to: 'd11' },
              { name: 's[0] / t[1]', value: 'A / C — MISMATCH' },
            ],
            heap: [
              { id: 'd00', value: '0', label: 'dp[0][0]' },
              { id: 'd01', value: '0', label: 'dp[0][1]' },
              { id: 'd02', value: '0', label: 'dp[0][2]' },
              { id: 'd10', value: '0', label: 'dp[1][0]' },
              { id: 'd11', value: '1', label: 'dp[1][1]' },
              { id: 'd12', value: '?', label: 'dp[1][2]' },
              { id: 'd20', value: '0', label: 'dp[2][0]' },
              { id: 'd21', value: '·', label: 'dp[2][1]' },
              { id: 'd22', value: '·', label: 'dp[2][2]' },
            ],
          },
          {
            note: 'Row 2 fills the same way — B matches nothing, so every cell copies its best neighbor: dp[2][1]=1, dp[2][2]=1. The answer is the bottom-right corner: LCS("AB", "AC") = 1 (the letter A).',
            stack: [{ name: 'answer', to: 'd22' }],
            heap: [
              { id: 'd00', value: '0', label: 'dp[0][0]' },
              { id: 'd01', value: '0', label: 'dp[0][1]' },
              { id: 'd02', value: '0', label: 'dp[0][2]' },
              { id: 'd10', value: '0', label: 'dp[1][0]' },
              { id: 'd11', value: '1', label: 'dp[1][1]' },
              { id: 'd12', value: '1', label: 'dp[1][2]' },
              { id: 'd20', value: '0', label: 'dp[2][0]' },
              { id: 'd21', value: '1', label: 'dp[2][1]' },
              { id: 'd22', value: '1', label: 'dp[2][2]' },
            ],
          },
        ],
      },
    },
    {
      type: 'note',
      md: 'Recovering the actual subsequence: stand on dp[n][m] and walk BACKWARDS. If s[i-1] == t[j-1], that character is in the LCS — record it, step diagonally. Otherwise step to the larger of up/left (ties: either). You record in reverse, so flip at the end. Cost: O(n+m) steps on top of the O(n·m) fill. The same walk on the edit-distance table prints the actual operation script — say this when the interviewer follows up with "which edits, exactly?"',
    },
    {
      type: 'intuition',
      title: 'Edit Distance — three doors at every mismatch',
      md: `Autocorrect\'s core question: fewest single-character operations (insert, delete, replace) to turn "horse" into "ros". Answer: 3.

- **dp[i][j] = min operations to turn the first i chars of s into the first j chars of t.**
- Last characters equal? The move is free: dp[i][j] = dp[i-1][j-1]. Just the diagonal, no +1.
- Not equal? Three doors, each costing 1 + an already-solved neighbor:
- **Replace** s\'s last char with t\'s → both prefixes shrink → **diagonal** dp[i-1][j-1].
- **Insert** t\'s last char at s\'s end → it matches t[j-1], so only t shrinks → **left** dp[i][j-1].
- **Delete** s\'s last char → only s shrinks → **up** dp[i-1][j].
- Base cases: "" → first j chars of t costs j inserts; first i chars of s → "" costs i deletes.`,
    },
    {
      type: 'hinglish',
      md: `Edit distance ka poora khel ek line mein: ek string ko doosri mein badalne ki **minimum mehnat**. Table ke har cell pe wahi scene chalta hai — akhri characters match nahi hue to teen raste khulte hain: **badlo** (replace — diagonal wala padosi), **ghusao** (insert — left wala), **hatao** (delete — upar wala). Teeno padosiyon se unki keemat poochho, jo sabse sasta ho usse apna +1 joda ke likh do. Aur agar characters match ho gaye? Paisa lagta hi nahi — seedha diagonal utha lo, free. Bas — yehi decision n×m baar repeat hota hai, aur "horse → ros = 3" nikal aata hai.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Edit distance — the three ops ARE the three neighbors',
      code: `int editDistance(const string& s, const string& t) {
    int n = s.size(), m = t.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));
    for (int i = 0; i <= n; i++) dp[i][0] = i;    // s-prefix -> "": i deletes
    for (int j = 0; j <= m; j++) dp[0][j] = j;    // "" -> t-prefix: j inserts
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++) {
            if (s[i-1] == t[j-1])
                dp[i][j] = dp[i-1][j-1];           // free move: chars agree
            else
                dp[i][j] = 1 + min({dp[i-1][j-1],  // replace  = diagonal
                                    dp[i][j-1],    // insert   = left
                                    dp[i-1][j]});  // delete   = up
        }
    return dp[n][m];   // editDistance("horse", "ros") == 3
}`,
      annotations: {
        4: 'Unlike LCS, the base cases are NOT zero: emptying or building a prefix costs one op per character.',
        9: 'Matching chars cost nothing — no +1. Forgetting that and writing 1 + dp[i-1][j-1] here is the classic wrong-answer.',
        11: 'Replace rewrites s[i-1] into t[j-1]: both last chars are now dealt with — both prefixes shrink, hence diagonal.',
        12: 'Insert appends a copy of t[j-1] to s: t\'s prefix shrinks, s\'s doesn\'t — hence left.',
        13: 'Delete throws away s[i-1]: s\'s prefix shrinks — hence up. horse→rorse→rose→ros: replace, delete, delete = 3.',
      },
    },
    {
      type: 'intuition',
      title: 'Longest Palindromic Subsequence — the mirror trick',
      md: `LPS of "agbcba" is "abcba" (length 5). New algorithm? No — a one-line reduction.

- A palindrome reads the same forwards and backwards.
- So a palindromic subsequence of s appears in s AND in reverse(s).
- **LPS(s) = LCS(s, reverse(s)).** Reverse the string, reuse the LCS table, done.
- Check: s = "agbcba", reverse = "abcbga" — LCS = "abcba", length 5. Matches.
- Free bonus formulas: **min insertions to make s a palindrome = n − LPS(s)**. Min deletions: same number. (Every character outside the palindromic core needs one fix.)`,
    },
    {
      type: 'note',
      md: 'Trigger phrases → string DP: *"given two strings…"*, *"convert / transform s into t"*, *"minimum operations / insertions / deletions"*, and the word **subsequence**. One trap: **substring** (contiguous) usually wants a different tool — longest palindromic *substring* is expand-around-center, not this table. Subsequence → prefix table. Substring → pointers/expansion. Hearing the difference is half the problem.',
    },
    {
      type: 'intuition',
      title: 'DP on trees — everyone reports to their manager',
      md: `Headcount audit at a company: a manager can only report a team size after **every direct report** has reported theirs. Numbers flow leaves → root.

- That order has a name: **postorder DFS** — finish the left subtree, finish the right subtree, THEN process the node.
- Every tree DP is two design decisions: what does a node **report** upward, and how does it **combine** its children\'s reports.
- The problem\'s constraint lives entirely in the combine step.
- Two examples next: House Robber III reports a *pair*; diameter reports a *height* and drops the real answer into a global.`,
    },
    {
      type: 'intuition',
      title: 'House Robber III — one number is not enough',
      md: `Houses form a binary tree; robbing two directly-connected houses (parent + child) trips the alarm. Maximize loot.

- Ask a node "best loot in your subtree?" — one number can\'t answer. The parent\'s decision depends on whether this node was robbed, so the report must expose both worlds.
- **Each node returns a PAIR: (best if I am robbed, best if I am skipped).**
- Robbed = my value + both children\'s *skipped* — the alarm constraint, in one line.
- Skipped = each child independently picks its own max(robbed, skipped). Skipping me does NOT force robbing them.
- Root answer = max of its pair. One visit per node → **O(n) time, O(height) stack**.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'House Robber III — the pair pattern',
      code: `struct TreeNode { int val; TreeNode *left, *right; };

// {best if this node IS robbed, best if it is SKIPPED}
pair<int, int> solve(TreeNode* node) {
    if (!node) return {0, 0};
    auto [lRob, lSkip] = solve(node->left);    // children fully solved FIRST
    auto [rRob, rSkip] = solve(node->right);   // -- postorder
    int rob  = node->val + lSkip + rSkip;      // rob me: kids must sit out
    int skip = max(lRob, lSkip) + max(rRob, rSkip);
    return {rob, skip};
}

int robTree(TreeNode* root) {
    auto [r, s] = solve(root);
    return max(r, s);                          // the root chooses freely
}`,
      annotations: {
        5: 'Empty subtree contributes 0 to both worlds — the base case that ends the recursion.',
        8: 'The alarm constraint compiled to code: robbing this node forces BOTH children into their skipped value.',
        9: 'The subtle line: skipping me frees each child to pick its own best. Writing lSkip + rSkip here (forcing kids to skip too) silently underpays.',
        15: 'Both worlds flow to the top; only the root converts the pair into a single answer.',
      },
    },
    {
      type: 'intuition',
      title: 'You already wrote tree DP — diameter',
      md: `The diameter problem from the Trees module (Level 2) — longest path between any two nodes — is this exact shape with a twist.

- Report upward: the subtree\'s **height**. Combine at the node: left height + right height = the best path that bends *through* this node.
- The twist: the best path may bend anywhere, not at the root. So the combine step updates a **global best** instead of flowing up.
- Two flavors of tree DP, same postorder skeleton: answer flows UP (robber — read the root\'s pair) vs answer is caught MID-TREE (diameter — read the global).
- Binary Tree Maximum Path Sum (a "hard" tag) is diameter with node values and one extra move: clamp negative arms to 0. Same eight lines.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Diameter — report height, catch the answer mid-tree',
      code: `int best = 0;                        // longest path seen anywhere (edges)

int height(TreeNode* node) {
    if (!node) return 0;
    int l = height(node->left);      // postorder again: children first
    int r = height(node->right);
    best = max(best, l + r);         // path bending THROUGH this node
    return 1 + max(l, r);            // report ONE arm upward
}`,
      annotations: {
        7: 'The combine step: this node as the bend point. The answer never flows up — it is caught here, in the global.',
        8: 'The report: a parent can extend only one arm. Returning l + r would count a forked path twice — the classic diameter bug.',
      },
    },
    {
      type: 'note',
      md: 'Where is the memo table? There isn\'t one — and nothing is missing. Grid DP needs a table plus a fill order YOU design so sources are ready before they\'re read. In a tree, **postorder IS that order**: both children return before the parent combines. Each node is visited exactly once, and its "memo" is its return value sitting on the call stack. O(n) time, O(height) space. A table only reappears when the state is more than "which node" — e.g. tree DP with a distance budget per node.',
    },
  ],
  quiz: [
    {
      question: 'In the LCS table for strings s and t, what does dp[3][5] mean?',
      options: [
        {
          text: 'The LCS length of the first 3 characters of s and the first 5 characters of t',
          explanation: 'Correct. dp[i][j] always speaks about PREFIXES — the first i and first j characters, i.e. s[0..3) and t[0..5).',
        },
        {
          text: 'The LCS of subsequences ending exactly at s[3] and t[5]',
          explanation: 'That is LIS-style "ending here" state design. String DP over two strings uses prefix states, not ending-here states.',
        },
        {
          text: 'The LCS of the suffixes s[3..] and t[5..]',
          explanation: 'A suffix formulation exists (top-down direction), but the standard table here is prefixes — and mixing the two corrupts every transition.',
        },
      ],
      correct: 0,
    },
    {
      question: 'LCS: s[i-1] == t[j-1]. What is dp[i][j]?',
      options: [
        {
          text: '1 + dp[i-1][j-1] — pair the two chars, take the diagonal',
          explanation: 'Correct. The +1 is earned by pairing THIS char of s with THIS char of t; only the diagonal state has both removed.',
        },
        {
          text: '1 + max(dp[i-1][j], dp[i][j-1])',
          explanation: 'Up and left still CONTAIN one of the matching chars — adding 1 on top can count a pairing that never happened. Overcounts.',
        },
        {
          text: 'dp[i-1][j-1] — the diagonal as-is',
          explanation: 'That forgets the +1: the match itself extends the common subsequence by one character.',
        },
      ],
      correct: 0,
    },
    {
      question: 'In edit distance, the transition 1 + dp[i][j-1] corresponds to which operation?',
      options: [
        {
          text: 'Insert — add a copy of t[j-1] to s, so only t\'s prefix shrinks',
          explanation: 'Correct. The inserted char matches t[j-1]; s\'s first i chars still must become t\'s first j-1. Left neighbor = insert.',
        },
        {
          text: 'Delete — remove s[i-1]',
          explanation: 'Delete shrinks s\'s prefix, which is the UP neighbor: 1 + dp[i-1][j].',
        },
        {
          text: 'Replace — rewrite s[i-1] into t[j-1]',
          explanation: 'Replace consumes the last char of BOTH prefixes — the diagonal: 1 + dp[i-1][j-1].',
        },
      ],
      correct: 0,
    },
    {
      question: 'Edit distance base case: dp[0][j] = ?',
      options: [
        { text: '0 — nothing to convert yet', explanation: 'dp[0][j] means turning the EMPTY string into j characters of t. That is not free.' },
        { text: 'j — build t\'s prefix with j inserts', explanation: 'Correct. From "" the only move is inserting, once per character. Symmetrically dp[i][0] = i deletes.' },
        { text: '1 — one bulk operation', explanation: 'Operations are single-character. Building j characters costs j separate inserts.' },
      ],
      correct: 1,
    },
    {
      question: 'Longest Palindromic Subsequence of s (length n) is computed as…',
      options: [
        { text: 'LCS(s, reverse(s))', explanation: 'Correct. A palindromic subsequence reads the same in s and in reverse(s) — reuse the LCS table, zero new code.' },
        { text: 'LCS(s, s)', explanation: 'LCS of a string with itself is always n — the whole string. It tells you nothing about palindromes.' },
        { text: 'n − LCS(s, reverse(s))', explanation: 'n − LPS is the MIN INSERTIONS to make s a palindrome — a different (bonus) formula built on top of the trick.' },
      ],
      correct: 0,
    },
    {
      question: 'House Robber III: a node returns {rob, skip}. What is skip?',
      options: [
        {
          text: 'max(lRob, lSkip) + max(rRob, rSkip) — each child picks its own best',
          explanation: 'Correct. Skipping this node removes the constraint on the children — they choose freely and independently.',
        },
        {
          text: 'lRob + rRob — if I skip, the children must be robbed',
          explanation: 'Nothing forces robbing them. If a child\'s own skip value is higher (rich grandchildren), forcing rob loses money.',
        },
        {
          text: 'lSkip + rSkip — skipping cascades down',
          explanation: 'Too restrictive the other way: this silently skips the whole tree and underpays badly.',
        },
      ],
      correct: 0,
    },
    {
      question: 'Which traversal order does tree DP require, and why?',
      options: [
        {
          text: 'Postorder — a node combines its children\'s answers, so children must finish first',
          explanation: 'Correct. Postorder is the topological order of the dependency "parent needs children" — the recursion delivers it for free.',
        },
        { text: 'Preorder — decide at the node, then push decisions down', explanation: 'Preorder visits the parent before the children exist as solved subproblems — nothing to combine yet.' },
        { text: 'Level order (BFS) — process the tree row by row', explanation: 'BFS goes top-down; the parent is processed long before its children report. (A reverse-BFS works but is just postorder with extra steps.)' },
      ],
      correct: 0,
    },
    {
      question: 'Time complexity of LCS / edit distance on strings of lengths n and m?',
      options: [
        { text: 'O(n·m) — one O(1) decision per table cell', explanation: 'Correct. (n+1)(m+1) cells, three-neighbor lookup each. Space is also O(n·m), or O(min(n,m)) with two rolling rows.' },
        { text: 'O(n + m)', explanation: 'That is the cost of the reconstruction WALK on a finished table — the fill itself touches every cell.' },
        { text: 'O(2ⁿ)', explanation: 'That is the memo-less recursion trying every subsequence — exactly what the table exists to kill.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Whiteboard: derive the edit distance recurrence from scratch, and map each operation to its table cell.',
      answer:
        'Define the state first: dp[i][j] = min ops to turn the first i chars of s into the first j chars of t. Look at the last characters. Equal → free move: dp[i][j] = dp[i-1][j-1]. Unequal → three options, each 1 + a solved neighbor: replace s[i-1] with t[j-1] handles both last chars → diagonal dp[i-1][j-1]; insert a copy of t[j-1] into s → t shrinks → left dp[i][j-1]; delete s[i-1] → s shrinks → up dp[i-1][j]. Take the min. Bases: dp[i][0]=i (deletes), dp[0][j]=j (inserts). O(n·m) time and space, O(min(n,m)) space with two rolling rows. Saying "the three operations ARE the three neighbors" is what makes the answer land.',
      isCaseBased: false,
    },
    {
      question: 'In the LCS mismatch case you take max(up, left). Why is the diagonal not a third candidate?',
      answer:
        'Because it is dominated. The LCS table is monotone: adding a character to either string can never shrink the LCS, so dp[i-1][j-1] ≤ dp[i-1][j] and dp[i-1][j-1] ≤ dp[i][j-1]. Including the diagonal in the max changes nothing — it can never be the strict winner. Contrast with edit distance, where the table measures COST (smaller is better) and the diagonal (replace) genuinely can be the cheapest door — that is why edit distance mins over three and LCS maxes over two. Knowing WHY the two recurrences differ in arity is a strong signal.',
      isCaseBased: false,
    },
    {
      question: 'Your LCS returns the length. The interviewer asks for the actual subsequence. Go.',
      answer:
        'Walk the finished table backwards from dp[n][m]. At (i, j): if s[i-1] == t[j-1], that char is part of the LCS — record it and step diagonally to (i-1, j-1). Otherwise step to whichever of dp[i-1][j] / dp[i][j-1] is larger (ties: either — both lead to valid LCSs). Stop at row 0 or column 0. Characters come out in reverse — flip at the end. Cost: O(n+m) extra on top of the O(n·m) fill, no extra memory beyond the table you already have. Same technique on edit distance recovers the actual edit script.',
      isCaseBased: false,
    },
    {
      question: 'Case: edit distance with n = m = 50,000. Your 2D int table is 50k × 50k ≈ 10 GB and the grader MLEs. What now?',
      answer:
        'Row i of the table only reads row i-1 — so keep two rows (or even one, with a saved diagonal): space drops from O(n·m) to O(min(n,m)) by iterating over the longer string and keeping rows of the shorter. Time stays O(n·m). Two honest caveats to volunteer: (1) rolling rows destroy the reconstruction walk — if the interviewer wants the edit SCRIPT under low memory, name Hirschberg\'s divide-and-conquer: O(n·m) time, O(n+m) space; (2) if the real question is "is the distance ≤ k", compute only a band of width 2k+1 around the diagonal — O(n·k) time. Naming the constraint you\'re trading is the senior move.',
      isCaseBased: true,
    },
    {
      question: '"Minimum deletions to make two strings equal" and "shortest common supersequence length" — solve both in one line each.',
      answer:
        'Both reduce to LCS — the shared skeleton both strings can keep. Min deletions: everything outside the LCS must go, from both sides → (n − LCS) + (m − LCS) = n + m − 2·LCS. Shortest common supersequence: write both strings but share the LCS once → n + m − LCS. Bonus member of the family: min insertions to make s a palindrome = n − LPS(s) = n − LCS(s, reverse(s)). The interview meta-skill: when a two-string problem smells like "keep what\'s shared, fix the rest", compute LCS and do arithmetic.',
      isCaseBased: false,
    },
    {
      question: 'Why does LCS(s, reverse(s)) equal the longest palindromic subsequence? Argue it.',
      answer:
        'Easy direction: any palindromic subsequence of s reads the same forwards and backwards, so it is a subsequence of s AND of reverse(s) — hence LPS ≤ LCS(s, rev). The converse (every LCS length is achievable by a palindrome) is the subtle half: the interview-grade move is to state the identity, prove the easy direction, and verify on an example — s = "agbcba", rev = "abcbga", LCS = "abcba" = LPS = 5. If pushed for rigor, sketch the pairing argument: a common subsequence matches positions i in s with positions n−1−j in s, and from any such matching a palindrome of the same length can be assembled. Most interviewers accept identity + easy direction + example.',
      isCaseBased: false,
    },
    {
      question: 'Case: your plain recursive LCS (no memo) passes n = 20 but TLEs at n = 3,000. Explain the blow-up and the fix.',
      answer:
        'The recursion branches on every mismatch — two calls — so the call tree is O(2^(n+m)) paths. But the function\'s arguments are only (i, j): there are just (n+1)(m+1) DISTINCT states, ~9M for n = m = 3,000. The exponential tree is recomputing the same 9M answers astronomically many times — the definition of overlapping subproblems. Fix: memoize the recursion (top-down) or fill the table with two loops (bottom-up) — both O(n·m) ≈ 9M constant-time cells, well inside limits. Bottom-up also unlocks the rolling-row space trick; recursion depth n+m may also need the iterative form in stack-limited environments.',
      isCaseBased: true,
    },
    {
      question: 'Why does greedy fail on House Robber III — say, "rob every other level"?',
      answer:
        'Counterexample: the chain 4 → 1 → 2 → 3 (each node a single child). Alternate levels gives max(4+2, 1+3) = 6. Optimal is 4 + 3 = 7 — depths 0 and 3 are not adjacent, so both can be robbed. The alarm rule is LOCAL (no parent-child pair), not global-by-level, so the optimal pattern is irregular and input-dependent — exactly the signature of DP over greedy. The fix is the pair recurrence: each node reports (rob, skip); rob = val + children\'s skip, skip = sum of each child\'s own max. O(n) time, O(height) stack.',
      isCaseBased: false,
    },
    {
      question: 'Design House Robber III\'s recursion: what exactly does each node return, and why does one value fail?',
      answer:
        'One value ("best loot in this subtree") fails because it hides a fact the parent needs: whether this node itself was robbed. The parent\'s legality depends on it, so the report must expose both worlds — return a pair (bestIfRobbed, bestIfSkipped). Transitions: robbed = node->val + leftSkip + rightSkip (the alarm constraint); skipped = max(leftRob, leftSkip) + max(rightRob, rightSkip) (children free). Root answer = max of its pair. This is the general tree-DP design recipe: when the parent\'s choice depends on the child\'s choice, the child returns one value PER choice — states-per-node, not one number.',
      isCaseBased: false,
    },
    {
      question: 'Case: you just solved diameter. The interviewer says "same tree, nodes now have values, possibly negative — return the maximum path sum." Adapt on the spot.',
      answer:
        'Same postorder shape, two upgrades. Report upward: best DOWNWARD path starting at this node = node->val + max(leftArm, rightArm, 0)... careful — clamp each arm: arm = max(0, childReport), because a negative arm is better dropped than carried. Combine mid-tree: candidate = node->val + leftArmClamped + rightArmClamped — the path bending through this node — and update a global best (initialize to -infinity, not 0, since all-negative trees must still pick a node). Return the report, read the global at the end. O(n), one visit per node. The mapping to say out loud: height → arm value, edge count → value sum, clamping = the only genuinely new idea.',
      isCaseBased: true,
    },
    {
      question: 'Grid DP needed a table and a fill order you designed. Your tree DP has neither. Where did they go?',
      answer:
        'They didn\'t disappear — the recursion absorbed them. A DP fill order is just a topological order of the dependency graph "cell needs its sources first". In a tree, the dependency is "parent needs children", and postorder DFS IS that topological order, delivered free by the call stack. The memo table collapses too: each node is a state, each state is visited exactly once, and its return value is its memo entry — held on the stack exactly as long as the parent needs it. O(n) time, O(height) space. Caveat worth volunteering: if the state grows beyond "which node" (e.g. node + remaining budget), distinct calls per node reappear and so does an explicit memo map.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'String DP state, one sentence', back: 'dp[i][j] = the answer for PREFIXES: first i chars of s, first j chars of t. Table is (n+1)×(m+1); row/col 0 = empty prefix.' },
    { front: 'LCS recurrence', back: 'Match (s[i-1]==t[j-1]): dp[i][j] = 1 + dp[i-1][j-1]. Mismatch: max(dp[i-1][j], dp[i][j-1]) — drop one last char. O(n·m).' },
    { front: 'Edit distance: ops → cells', back: 'Replace = diagonal, insert = left, delete = up — each 1 + neighbor. Match = free diagonal. Bases: dp[i][0]=i, dp[0][j]=j.' },
    { front: 'Longest Palindromic Subsequence trick', back: 'LPS(s) = LCS(s, reverse(s)). Bonus: min insertions (or deletions) to make s a palindrome = n − LPS.' },
    { front: 'LCS arithmetic family', back: 'Min deletions to make s, t equal = n+m−2·LCS. Shortest common supersequence = n+m−LCS.' },
    { front: 'String DP trigger phrases', back: '"Given two strings", "transform/convert s into t", "min operations", "subsequence". Warning: SUBSTRING (contiguous) usually wants pointers/expansion, not this table.' },
    { front: 'Tree DP pattern, one line', back: 'Postorder-accumulate: solve both children first, combine at the parent. Design = what to REPORT up + how to COMBINE.' },
    { front: 'House Robber III recurrence', back: 'Node returns {rob, skip}: rob = val + lSkip + rSkip; skip = max(lRob,lSkip) + max(rRob,rSkip). Answer = max at root. O(n).' },
    { front: 'Diameter / max path sum shape', back: 'Return ONE arm up (height / clamped path); update a GLOBAL with left+right through the node. Answer caught mid-tree, not at root.' },
    { front: 'Why tree DP has no memo table', back: 'Postorder IS the fill order; each node = one state, visited once; the return value is the memo. O(n) time, O(height) stack.' },
  ],
  mindmapMarkdown: `- DP III: String DP & DP on Trees
  - The state
    - dp[i][j] = prefixes s[0..i), t[0..j)
    - (n+1)×(m+1): row/col 0 = empty prefix
    - every cell ← diagonal / up / left
  - LCS
    - match → 1 + diagonal
    - mismatch → max(up, left)
    - walk-back reconstructs the string
  - Edit distance
    - match = free diagonal
    - replace = diagonal + 1
    - insert = left + 1
    - delete = up + 1
    - bases: i deletes / j inserts
  - Tricks & triggers
    - LPS = LCS(s, reverse(s))
    - insertions to palindrome = n − LPS
    - "two strings" / "subsequence" → table
    - substring ≠ subsequence
    - rolling rows: O(min(n,m)) space
  - DP on trees
    - postorder: children report first
    - recursion IS the order — no table
    - House Robber III: pair {rob, skip}
    - rob = val + kids\' skip
    - skip = each kid\'s own max
    - diameter: return height, update global
    - max path sum = diameter + clamp at 0`,
}

export default m
