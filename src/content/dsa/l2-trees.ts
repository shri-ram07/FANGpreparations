import type { Module } from '../types'

const m: Module = {
  id: 'dsa-l2-trees',
  subjectId: 'dsa',
  level: 2,
  title: 'Trees: Traversals, BST, LCA & Views',
  whyItMatters:
    'Trees are the densest cluster in FAANG question banks — and nearly every tree question reduces to five moves: pick the right traversal, freeze the queue size, pass a bounds window down, find the split point, reuse heights on the way up. This module drills exactly those five — including the classic wrong answer (child-only BST check) dissected so you never give it.',
  estMinutes: 70,
  sections: [
    {
      type: 'intuition',
      title: 'One structure, five words',
      md: `A tree is a linked list that learned to branch: every node points DOWN to children instead of across to one next. Picture a company org chart.

- **Root** — the one node with no parent. The CEO. Every walk starts here.
- **Leaf** — a node with no children. Where every path ends.
- **Depth** of a node — edges UP to the root. The root has depth 0.
- **Height** of a node — the longest edge-path DOWN to a leaf. Leaves have height 0; the tree's height is the root's.
- **Balanced** — at every node, left and right subtree heights differ by at most 1. Balanced ⇒ height ≈ log n. A chain degenerates to height n − 1 — and drags every O(h) cost down with it.
- **Binary tree** — at most two children per node. That cap is what makes every pattern below work.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'The node, and the tree every example uses',
      code: `struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v) : val(v), left(nullptr), right(nullptr) {}
};

// The tree every example below uses:
//
//          8          <- root: depth 0. Tree height = 2 (edges 8->3->1)
//         / \\
//        3   10       <- 3: depth 1, height 1
//       / \\    \\
//      1   6    14    <- leaves: no children, height 0`,
      annotations: {
        3: 'Two child pointers instead of one next — that is the entire structural difference from a linked list.',
        4: 'Every interview snippet assumes this struct (LeetCode ships it). Children start null; you wire them up.',
      },
    },
    {
      type: 'intuition',
      title: 'Pre, in, post — the only question is WHEN you speak',
      md: `All three DFS (depth-first search) traversals walk the tree identically: go left as deep as possible, back up, go right. The only difference is when a node announces itself relative to its children.

- **Preorder** (root-left-right): speak, THEN descend. A manager introduces themselves before their team. Use: copying a tree, serialization — the receiver needs the parent before it can attach children.
- **Inorder** (left-root-right): speak between the two sides. On a BST this prints values in **sorted order** — the single most useful tree fact in interviews.
- **Postorder** (left-right-root): children first. Use: anything where a node's answer depends on its children's answers — heights, subtree sums, diameter, safe deletion (free children before parent).
- Memorize by where "root" sits in the name: PRE = root first, IN = root in the middle, POST = root last.
- All three: O(n) time, O(h) recursion stack.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'The three recursive traversals — six lines each',
      code: `void preorder(TreeNode* n) {    // Root -> Left -> Right
    if (!n) return;             // base case: fell off the tree
    cout << n->val << ' ';      // visit FIRST...
    preorder(n->left);
    preorder(n->right);
}                               // prints: 8 3 1 6 10 14

void inorder(TreeNode* n) {     // Left -> Root -> Right
    if (!n) return;
    inorder(n->left);
    cout << n->val << ' ';      // ...visit BETWEEN...
    inorder(n->right);
}                               // prints: 1 3 6 8 10 14  (sorted!)

void postorder(TreeNode* n) {   // Left -> Right -> Root
    if (!n) return;
    postorder(n->left);
    postorder(n->right);
    cout << n->val << ' ';      // ...visit LAST
}                               // prints: 1 6 3 14 10 8`,
      annotations: {
        3: 'Announce, then descend. This root-first property is exactly why preorder can serialize a tree (see the last section).',
        13: 'Our example tree is a BST — and its inorder comes out sorted. This is not a coincidence; it is an alternative way to validate a BST.',
        19: 'The node speaks only after BOTH children finished — which is why every height/subtree-sum/diameter computation is postorder at heart.',
      },
    },
    {
      type: 'intuition',
      title: 'Iterative traversals: recursion with the mask off',
      md: `Recursion is not magic — the language keeps a call stack for you. Interviewers ask for the iterative version to check you can run that machinery by hand (and because a skewed tree with a million nodes overflows the real call stack).

- Iterative **preorder** is the easy one: push root; loop — pop, visit, push right child then left child (right first, so left pops first).
- Iterative **inorder** is the interview favorite, for two reasons.
- Reason 1: the visit sits in the MIDDLE of the recursion — the hardest position to simulate. The explicit stack must hold every ancestor whose left side is finished but who has not spoken yet.
- Reason 2: it converts into a *pausable* traversal — stop after k pops and you have "kth smallest in a BST"; wrap it in a class and it is LeetCode's BST Iterator.
- The shape to memorize: dive the left spine pushing everything, pop-and-visit, hop to the right child, repeat.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Iterative inorder — the left-spine dive',
      code: `vector<int> inorderIter(TreeNode* root) {
    vector<int> out;
    stack<TreeNode*> st;
    TreeNode* cur = root;
    while (cur || !st.empty()) {
        while (cur) {               // dive the left spine,
            st.push(cur);           // bookmarking every ancestor
            cur = cur->left;
        }
        cur = st.top(); st.pop();   // deepest bookmark = next in order
        out.push_back(cur->val);    // visit
        cur = cur->right;           // then repeat inside its right subtree
    }
    return out;                     // 1 3 6 8 10 14 -- O(n) time, O(h) space
}`,
      annotations: {
        6: 'The inner dive is "go left until you cannot". Everything passed on the way is unfinished business — parked on the stack.',
        10: 'Invariant: the stack top is always the next node in inorder. Stop after k pops and you have solved kth-smallest-in-BST.',
        12: 'If cur->right is null, the next loop iteration skips the dive and pops the next ancestor — exactly what recursion would do returning upward.',
      },
    },
    {
      type: 'intuition',
      title: 'Level order: a queue and one frozen number',
      md: `BFS (breadth-first search) reads the tree like a book: top row, then the next row, left to right. The tool is a queue — first in, first out.

- Push the root. Loop: pop a node, visit it, push its children. The queue naturally serves level d completely before level d+1.
- Problem: the queue holds a MIX of "current level" and "next level" nodes — where does one level end?
- The **level-size trick**: at the start of each round, read \`int sz = q.size()\` — exactly the current level's population, frozen before any children join. Pop exactly sz nodes; whatever remains afterward is precisely the next level.
- This one trick powers: level-order-as-lists, zigzag order, right/left views, minimum depth, largest value per row.`,
    },
    { type: 'visual', component: 'GraphTraversal', props: { algorithm: 'bfs' } },
    {
      type: 'note',
      md: 'The visual above runs on a general graph, but watch its queue panel: nodes at distance d all leave the queue before any node at distance d+1 reaches the front — that IS level order. A tree is just a graph with no cycles and exactly one parent per node, so tree BFS drops the visited-set and keeps everything else.',
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Level order with the size trick — plus both views for free',
      code: `vector<vector<int>> levelOrder(TreeNode* root) {
    vector<vector<int>> out;
    if (!root) return out;
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        int sz = q.size();              // freeze THIS level's population
        vector<int> level;
        for (int i = 0; i < sz; i++) {
            TreeNode* n = q.front(); q.pop();
            level.push_back(n->val);
            if (n->left)  q.push(n->left);   // children queue up behind --
            if (n->right) q.push(n->right);  // they are the NEXT level
        }
        out.push_back(level);
    }
    return out;                         // {8} {3, 10} {1, 6, 14}
}

vector<int> rightView(TreeNode* root) {
    vector<int> view;
    for (auto& level : levelOrder(root))
        view.push_back(level.back());   // last node of each level
    return view;                        // 8 10 14. Left view: .front() -> 8 3 1
}`,
      annotations: {
        7: 'THE trick. q.size() changes as children are pushed mid-loop — freezing it into sz is what separates the levels. Write i < q.size() instead and levels bleed together.',
        13: 'Everything pushed during this inner loop is level d+1 by construction — it sits behind all remaining level-d nodes in the queue.',
        23: 'Right view = what you see standing to the tree\'s right = the LAST node of every level. Left view is the same walk taking .front().',
      },
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Top, bottom & vertical views — one map, three answers',
      code: `// Vertical order: BFS carrying a column index (root = 0,
// left child = col-1, right child = col+1).
map<int, vector<int>> cols;                 // col -> nodes top-to-bottom
queue<pair<TreeNode*, int>> q;
q.push({root, 0});
while (!q.empty()) {
  auto [node, c] = q.front(); q.pop();
  cols[c].push_back(node->val);
  if (node->left)  q.push({node->left,  c - 1});
  if (node->right) q.push({node->right, c + 1});
}
// vertical order = each cols[c] left to right
// TOP view    = cols[c].front() for each column (first seen from above)
// BOTTOM view = cols[c].back()  for each column (last one wins looking up)`,
      annotations: {
        3: 'std::map keeps columns sorted left-to-right for free — the ordered-vs-unordered choice actually matters here.',
        8: 'BFS order guarantees the FIRST node recorded per column is the highest one — that is exactly why top view falls out of the same walk.',
        13: 'One traversal, three interview answers: vertical order, top view (fronts), bottom view (backs). Left/right views came from levels; top/bottom come from columns.',
      },
    },
    {
      type: 'note',
      md: 'Views cheat sheet: **left/right** views slice by LEVEL (front/back of each level), **top/bottom** views slice by COLUMN (first/last of each column). Same-position ties in vertical order: BFS order already handles the common interview convention (higher first, then left-to-right).',
    },
    {
      type: 'intuition',
      title: 'BST: the property is about SUBTREES, not children',
      md: `A binary search tree (BST) keeps a promise at every node: **everything** in the left subtree is smaller, **everything** in the right subtree is bigger. That promise makes search O(h) — one comparison discards a whole side. It is binary search wearing pointers.

- The classic wrong answer to "Validate BST": check each node against its two children. It feels right and it fails.
- Counterexample: root 10, left child 5, right child 15 — and 15's children are 6 and 20. Every parent-child pair passes: 5 < 10, 15 > 10, 6 < 15, 20 > 15.
- But 6 lives in 10's RIGHT subtree while being smaller than 10. A search for 6 goes right at the root and never finds it. Inorder prints 5 10 6 15 20 — not sorted. Not a BST.
- The fix: every node must fit a window **(lo, hi)** inherited from ALL its ancestors. Start at (−∞, +∞); going left tightens hi to the parent's value; going right tightens lo.
- 6's window is (10, 15) — the 10 came from the *grandparent*. 6 ≤ 10 → reject. Watch it frame by frame below.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Validate BST — the (lo, hi) window walk on the counterexample',
        notice: 'The child-only check passes every frame until the last one. The window catches what it misses.',
        leftLabel: 'bounds walk (the recursion)',
        rightLabel: 'tree nodes',
        frames: [
          {
            note: 'valid(10, lo = -∞, hi = +∞): 10 fits the wide-open window. Rule: going LEFT tightens hi to the current value; going RIGHT tightens lo.',
            stack: [
              { name: 'cur', to: 'n10' },
              { name: 'lo', value: '-∞' },
              { name: 'hi', value: '+∞' },
            ],
            heap: [
              { id: 'n10', value: '10', label: 'root' },
              { id: 'n5', value: '5', label: '10.left' },
              { id: 'n15', value: '15', label: '10.right' },
              { id: 'n6', value: '6', label: '15.left' },
              { id: 'n20', value: '20', label: '15.right' },
            ],
          },
          {
            note: 'Descend left to 5: window (-∞, 10). 5 < 10 — passes. Left side done; the recursion pops back to 10 and goes right.',
            stack: [
              { name: 'cur', to: 'n5' },
              { name: 'lo', value: '-∞' },
              { name: 'hi', value: '10' },
            ],
            heap: [
              { id: 'n10', value: '10', label: 'root' },
              { id: 'n5', value: '5', label: '10.left' },
              { id: 'n15', value: '15', label: '10.right' },
              { id: 'n6', value: '6', label: '15.left' },
              { id: 'n20', value: '20', label: '15.right' },
            ],
          },
          {
            note: 'Descend right to 15: window (10, +∞). 15 > 10 — passes. A child-only checker agrees with us so far. Now into 15\'s left child.',
            stack: [
              { name: 'cur', to: 'n15' },
              { name: 'lo', value: '10' },
              { name: 'hi', value: '+∞' },
            ],
            heap: [
              { id: 'n10', value: '10', label: 'root' },
              { id: 'n5', value: '5', label: '10.left' },
              { id: 'n15', value: '15', label: '10.right' },
              { id: 'n6', value: '6', label: '15.left' },
              { id: 'n20', value: '20', label: '15.right' },
            ],
          },
          {
            note: 'At 6 the window is (10, 15): hi tightened by parent 15, but lo = 10 was inherited from the GRANDPARENT. 6 < 15, so the child-only check passes — yet 6 ≤ lo. Violation: not a BST.',
            stack: [
              { name: 'cur', to: 'n6', danger: true },
              { name: 'lo', value: '10', danger: true },
              { name: 'hi', value: '15' },
              { name: 'verdict', value: '6 ≤ lo → false', danger: true },
            ],
            heap: [
              { id: 'n10', value: '10', label: 'root' },
              { id: 'n5', value: '5', label: '10.left' },
              { id: 'n15', value: '15', label: '10.right' },
              { id: 'n6', value: '6', label: 'FAILS lo = 10' },
              { id: 'n20', value: '20', label: '15.right' },
            ],
          },
        ],
      },
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Validate BST — the bounds window',
      code: `bool valid(TreeNode* n, long long lo, long long hi) {
    if (!n) return true;                // an empty subtree can't violate
    if (n->val <= lo || n->val >= hi)
        return false;                   // outside the inherited window
    return valid(n->left, lo, n->val)   // left: ceiling tightens to n->val
        && valid(n->right, n->val, hi); // right: floor tightens to n->val
}
bool isValidBST(TreeNode* root) {
    return valid(root, LLONG_MIN, LLONG_MAX);
}`,
      annotations: {
        3: 'One comparison against the whole ancestry, compressed into two numbers. This line is the entire algorithm.',
        5: 'Each recursive call narrows exactly one side of the window — the other side rides along unchanged from higher ancestors.',
        9: 'long long bounds so a node holding INT_MIN or INT_MAX still fits STRICTLY inside the initial window. int bounds fail that hidden test; TreeNode* bounds (null = unbounded) also work.',
      },
    },
    {
      type: 'note',
      md: 'Search and insert are the same walk the window protects: compare, discard a side, step down. Both O(h) — and h is log n only while the tree stays balanced, which is exactly why `std::map` runs a self-balancing red-black tree underneath instead of a plain BST.',
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'BST search and insert — one comparison per level',
      code: `TreeNode* searchBST(TreeNode* root, int target) {
    TreeNode* cur = root;
    while (cur && cur->val != target)
        cur = target < cur->val ? cur->left : cur->right;
    return cur;                          // the node, or nullptr
}

TreeNode* insertBST(TreeNode* root, int v) {
    if (!root) return new TreeNode(v);   // fell off: the hole IS the spot
    if (v < root->val) root->left  = insertBST(root->left, v);
    else               root->right = insertBST(root->right, v);
    return root;
}`,
      annotations: {
        4: 'Binary search, pointer edition: each comparison discards an entire subtree. No recursion needed for search.',
        9: 'Insertion never rewires the middle of a BST — walk until you fall off, and that null is where the new leaf belongs.',
        12: 'Returning root lets the parent re-attach its (possibly new) child: root->left = insertBST(...). O(h) both ops — log n balanced, n skewed.',
      },
    },
    {
      type: 'intuition',
      title: 'LCA: one walk if BST, one postorder if not',
      md: `The lowest common ancestor (LCA) of p and q is the *deepest* node that has both in its subtree — and a node counts as its own ancestor. The root is always a common ancestor; it is just rarely the lowest.

- **In a BST, the values are a map.** Walk from the root: both targets smaller → go left; both bigger → go right; otherwise STOP — p and q split here (or you are standing on one of them). That split point is the LCA. O(h), no recursion, O(1) space.
- **In a plain binary tree** there is no map, so ask the children. Postorder logic: recurse left, recurse right; each side returns "found p, q, or their LCA down here" — or null.
- Both sides non-null → p and q surfaced on *different* sides → the current node is the split point. Return it.
- One side null → pass the other side's answer up unchanged.
- Returning root immediately when root == p or q handles "one node is the other's ancestor" for free.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'LCA twice: value walk (BST) vs postorder (any binary tree)',
      code: `TreeNode* lcaBST(TreeNode* root, TreeNode* p, TreeNode* q) {
    TreeNode* cur = root;
    while (cur) {
        if (p->val < cur->val && q->val < cur->val)
            cur = cur->left;             // both targets live left: descend
        else if (p->val > cur->val && q->val > cur->val)
            cur = cur->right;            // both live right: descend
        else
            return cur;                  // the split point (or cur IS p or q)
    }
    return nullptr;
}

TreeNode* lca(TreeNode* root, TreeNode* p, TreeNode* q) {
    if (!root || root == p || root == q) return root;
    TreeNode* L = lca(root->left,  p, q);
    TreeNode* R = lca(root->right, p, q);
    if (L && R) return root;             // p and q surfaced on DIFFERENT sides
    return L ? L : R;                    // both on one side (or neither found)
}`,
      annotations: {
        9: 'In our BST: lcaBST for 1 and 6 walks 8 -> 3 (both smaller than 8), then stops: 1 < 3 < 6. The paths part ways at 3.',
        15: 'Three base cases in one line: fell off the tree, found p, found q. Finding either one is enough — if the other is below it, this node is already the LCA.',
        18: 'The postorder moment: only after BOTH children report can this node know whether it is the split point. O(n) time, O(h) stack.',
      },
    },
    {
      type: 'intuition',
      title: 'The height-reuse pattern: return one thing, harvest another',
      md: `Diameter of a binary tree = the longest path between ANY two nodes, counted in edges. The trap: the best path often never touches the root — it bends at some middle node.

- Brute force: for every node, compute left height + right height. Height is O(n) per call → O(n²) total.
- The pattern: you were ALREADY computing every node's height in one postorder pass. Don't throw it away — as each node learns L and R, update a global best with L + R (the path bending at that node), then return plain height upward as usual.
- One pass, two outputs: the recursion **returns** height, and **accumulates** the real answer on the side. O(n).
- The same skeleton solves Binary Tree Maximum Path Sum and Longest Univalue Path — FAANG asks this shape constantly.
- The balanced check below is the same idea with a twist: no global needed. Encode failure INTO the return value — −1 means "somebody below is unbalanced"; anything ≥ 0 is an honest height.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Diameter — return height, harvest the bend',
      code: `int best = 0;                       // longest path seen anywhere, in EDGES
int height(TreeNode* n) {           // returns height in NODES (null = 0)
    if (!n) return 0;
    int L = height(n->left);
    int R = height(n->right);
    best = max(best, L + R);        // the path that BENDS at n
    return 1 + max(L, R);           // report plain height upward, as asked
}
int diameterOfBinaryTree(TreeNode* root) {
    best = 0;
    height(root);
    return best;
}`,
      annotations: {
        1: 'Global keeps the snippet short — in the interview, wrap it in a class member or pass int& best.',
        6: 'L and R are heights in NODES, which equals the EDGE count from n down through that child — so L + R is exactly the bending path\'s edge length. The off-by-ones cancel.',
        7: 'The parent only ever needs the height. The diameter answer never travels up the recursion — it leaks out the side into best.',
      },
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Balanced check — bottom-up with the -1 sentinel',
      code: `int check(TreeNode* n) {           // height, or -1 = "unbalanced below"
    if (!n) return 0;
    int L = check(n->left);
    if (L == -1) return -1;        // verdict already in: stop measuring
    int R = check(n->right);
    if (R == -1) return -1;
    if (abs(L - R) > 1) return -1; // THIS node breaks the rule
    return 1 + max(L, R);
}
bool isBalanced(TreeNode* root) { return check(root) != -1; }`,
      annotations: {
        1: 'Heights are never negative, so -1 is a free out-of-band channel: one int carries both the number and the verdict.',
        4: 'Short-circuit: once any subtree fails, no more heights are computed — the -1 just bubbles to the top. This is what keeps it O(n).',
        7: 'The naive version calls a separate height() at every node: O(n²) on a skewed tree. Here every node is visited exactly once.',
      },
    },
    {
      type: 'intuition',
      title: 'Serialize: preorder round-trips because the root comes first',
      md: `Serialize = flatten a tree into a string; deserialize = rebuild the exact tree. The interview-grade answer is preorder with null markers.

- Why preorder: the writer emits the root BEFORE its subtrees, so the reader always knows the next token is "the root of whatever I am building right now". Writer and reader run the *same recursion* in lockstep.
- Why null markers (\`#\`): they mark where a subtree ENDS. Without them, "8 3 1" could be a left chain, a right chain, or a triangle — preorder alone is ambiguous.
- With markers there are no sizes, no lengths, no second pass: the reader recurses left and returns the moment it consumes a \`#\`.
- Level-order with nulls also round-trips (LeetCode's own display format) — preorder is simply less bookkeeping: no queue, no index math.
- Complexity: O(n) both directions. A binary tree with n nodes has exactly n + 1 null pointers, so expect n + 1 markers.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Serialize + deserialize — one recursion, run twice',
      code: `void ser(TreeNode* n, string& out) {
    if (!n) { out += "# "; return; }     // null marker = "subtree ends here"
    out += to_string(n->val) + " ";
    ser(n->left, out);
    ser(n->right, out);
}   // tree above -> "8 3 1 # # 6 # # 10 # 14 # # "

TreeNode* deser(istringstream& in) {     // call: istringstream in(s); deser(in);
    string tok;
    in >> tok;
    if (tok == "#") return nullptr;      // boundary: hand back an empty subtree
    TreeNode* n = new TreeNode(stoi(tok));
    n->left  = deser(in);                // the reader re-runs the writer's
    n->right = deser(in);                // recursion, consuming tokens in sync
    return n;
}`,
      annotations: {
        2: 'The marker is load-bearing: it is the only thing telling the reader "this branch is over, back up".',
        6: 'Desk-check it on the example tree: 8, then all of 3\'s subtree (3 1 # # 6 # #), then all of 10\'s (10 # 14 # #). Preorder, nulls included.',
        13: 'No counters, no lengths: the stream position IS the recursion state. When deser returns from the left subtree, the stream is sitting exactly at the right subtree\'s first token.',
      },
    },
    {
      type: 'note',
      md: `The pattern sheet — recite before any tree question:

- Traversal choice: need sorted (BST)? inorder. Parent before children? preorder. Children's answers first? postorder. By level? BFS + size trick.
- Validate BST: (lo, hi) window passed down. NEVER the child-only comparison.
- LCA: BST → value walk to the split point, O(h). General → postorder, both sides non-null, O(n).
- Longest-path anything: return height, accumulate best = L + R at every node. O(n).
- Balanced: bottom-up height with the −1 sentinel. O(n).
- Views: level order, keep .front() (left) or .back() (right) per level.
- Every DFS: O(n) time, O(h) stack — and h ranges from log n (balanced) to n (chain).`,
    },
  ],
  quiz: [
    {
      question: 'You run inorder traversal on a valid BST. What comes out?',
      options: [
        {
          text: 'Values in sorted ascending order',
          explanation: 'Correct. Left (all smaller) → root → right (all bigger), applied recursively, is ascending order. Checking "inorder is strictly increasing" is a valid alternative BST validation.',
        },
        { text: 'Values level by level', explanation: 'Level-by-level is BFS with a queue — a completely different walk.' },
        { text: 'Root first, then everything else', explanation: 'Root-first is preorder. Inorder buries the root between its two subtrees.' },
        { text: 'Sorted, but only if the tree is balanced', explanation: 'Balance affects the SPEED of operations (h), never the inorder order. Any valid BST inorders sorted.' },
      ],
      correct: 0,
    },
    {
      question: 'Tree: root 10, left 5, right 15; node 15 has children 6 and 20. A validator that checks each node against its direct children says "valid BST". Is it?',
      options: [
        {
          text: 'Yes — every parent-child pair is correctly ordered',
          explanation: 'Every local pair does pass (5<10, 15>10, 6<15, 20>15) — and the tree is still broken. Local pairs are not the BST property.',
        },
        {
          text: 'No — 6 sits in 10\'s right subtree while being smaller than 10',
          explanation: 'Correct. The property covers ENTIRE subtrees. A search for 6 goes right at 10 and never finds it. Fix: (lo, hi) bounds — 6 inherits lo = 10 from its grandparent and fails.',
        },
        { text: 'No — a BST node cannot have two children', explanation: 'Two children is perfectly normal — that is just a full node.' },
      ],
      correct: 1,
    },
    {
      question: 'In the level-order loop, why must sz = q.size() be read BEFORE the inner for loop, instead of writing i < q.size() directly?',
      options: [
        { text: 'q.size() is O(n), so caching it is a speed optimization', explanation: 'q.size() is O(1). This is a correctness issue, not a performance one.' },
        {
          text: 'The inner loop pushes children, so q.size() grows mid-loop and the levels would bleed together',
          explanation: 'Correct. sz freezes the current level\'s population; everything pushed during the loop belongs to the NEXT level. A live q.size() bound would keep consuming into deeper levels.',
        },
        { text: 'Without it the queue is popped while empty — undefined behavior', explanation: 'The loop bound prevents empty pops either way. The bug is merged levels, not underflow.' },
      ],
      correct: 1,
    },
    {
      question: 'In the module\'s BST (root 8; 3 has children 1 and 6; 10 has right child 14), what does the value-walk LCA return for p = 1, q = 6?',
      options: [
        { text: '8', explanation: 'At 8, both 1 and 6 are smaller, so the walk continues left. 8 is a common ancestor — just not the lowest.' },
        {
          text: '3',
          explanation: 'Correct. From 8 both targets are smaller → step to 3. At 3: 1 < 3 but 6 > 3 — the paths split. That split point is the LCA, found in O(h) with no recursion.',
        },
        { text: '1', explanation: '1 is p itself, but 6 is not in 1\'s subtree — so 1 is not a COMMON ancestor at all.' },
      ],
      correct: 1,
    },
    {
      question: 'In the diameter code, height() returns 1 + max(L, R), but best is updated with L + R. What is L + R?',
      options: [
        { text: 'The number of NODES on the longest path through this node', explanation: 'The node count of that path is L + R + 1 (this node included). L + R is its EDGE count.' },
        {
          text: 'The edge-length of the longest path that bends at this node — L edges down one side, R down the other',
          explanation: 'Correct. With null = 0, a subtree\'s height in nodes equals the edge count from this node down through that child — so L + R is exactly the bending path in edges.',
        },
        { text: 'The height of the whole tree', explanation: 'Height is what gets RETURNED (1 + max). L + R measures a different thing: a full left-arm-plus-right-arm path.' },
      ],
      correct: 1,
    },
    {
      question: 'The balanced-check helper returns an int. What does a return value of -1 mean, and why bother?',
      options: [
        { text: 'It is the height of an empty tree', explanation: 'Empty returns 0 in this scheme. -1 is reserved as a verdict, never a height.' },
        {
          text: 'A sentinel meaning "something below is already unbalanced" — it short-circuits all remaining work',
          explanation: 'Correct. Real heights are never negative, so -1 is a free out-of-band signal. Every caller checks it before computing anything — keeping the whole check one O(n) pass.',
        },
        { text: 'An error: the node had a null child', explanation: 'Null children are completely normal (every leaf has two). The base case handles them by returning 0.' },
      ],
      correct: 1,
    },
    {
      question: 'Why do the "#" null markers make preorder serialization uniquely decodable?',
      options: [
        { text: 'They pad the string so every level has equal width', explanation: 'That describes a complete-tree array layout (like a heap), not this format.' },
        {
          text: 'They tell the reader exactly where each subtree ends, so a single preorder pass rebuilds the tree without ambiguity',
          explanation: 'Correct. Without them "8 3 1" could be many different trees. With them the reader recurses left and stops the instant it consumes a "#" — n + 1 markers for n nodes.',
        },
        { text: 'They encode the tree height so the reader can pre-allocate', explanation: 'No sizes or heights are stored anywhere — that is precisely the elegance of the format.' },
      ],
      correct: 1,
    },
    {
      question: 'In iterative inorder, what is true at the moment you pop a node from the stack?',
      options: [
        { text: 'The stack holds that node\'s children', explanation: 'Children are never pre-pushed in this scheme — the right child is walked AFTER the pop, and the left is already done.' },
        {
          text: 'The popped node is the next node in inorder (the smallest unvisited, on a BST); the stack below holds ancestors whose right sides are still pending',
          explanation: 'Correct. The dive pushed the whole left spine, so the top is always the leftmost unvisited node. That invariant is why stopping after k pops solves kth-smallest-in-a-BST.',
        },
        { text: 'The stack is always empty right after a pop', explanation: 'Only near the end of the rightmost path. Usually several ancestors remain parked, waiting for their right subtrees.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'The three DFS traversals visit the same nodes — so when does the ORDER actually matter? Give a concrete use for each.',
      answer:
        'Preorder (root first): copying a tree and serialization — the consumer must have the parent before it can attach children. Inorder (root between): on a BST it is sorted order — powering validate-by-sortedness, kth smallest, closest value. Postorder (root last): any computation where a node needs its children\'s answers first — height, subtree sums, diameter, balanced check, safe deletion. All three: O(n) time, O(h) stack. The meta-skill is reading the dependency direction: parent-needs-children → postorder; children-need-parent → preorder or pass state down as parameters.',
      isCaseBased: false,
    },
    {
      question: 'Convert recursive inorder to iterative. What does the explicit stack actually represent?',
      answer:
        'The stack IS the call stack the language was maintaining for free: it holds every ancestor whose left subtree is in progress but who has not been visited yet. The loop: while cur is non-null, push it and go left (bookmark the whole spine); then pop — that node is next in inorder — visit it; set cur to its right child and repeat. Terminate when cur is null and the stack is empty. O(n) time, O(h) space. Why interviewers love this one: the visit point sits mid-recursion — the hardest of the three to simulate — and the loop converts directly into a pausable BST Iterator (next()/hasNext()) or an O(h + k) kth-smallest.',
      isCaseBased: false,
    },
    {
      question: 'Case: a candidate\'s Validate BST compares each node with its two children, passes the visible tests, and fails a hidden one. Construct the failing input and state the fix.',
      answer:
        'Failing input: root 10, left 5, right 15, where 15 has children 6 and 20. All four local checks pass (5<10, 15>10, 6<15, 20>15), but 6 sits in 10\'s right subtree while being smaller than 10 — inorder gives 5 10 6 15 20, not sorted, and a search for 6 dead-ends. Fix: recurse with a (lo, hi) window — root gets (−∞, +∞); the left child\'s window becomes (lo, node->val), the right child\'s (node->val, hi); reject any node outside its window. Edge case to name unprompted: node values can equal INT_MIN/INT_MAX, so carry long long bounds (or TreeNode* bounds where null means unbounded). Alternative fix: one inorder pass checking strictly-increasing. Both O(n).',
      isCaseBased: true,
    },
    {
      question: 'LCA in a BST vs in a general binary tree — give both algorithms with complexities, and explain why the BST version needs no recursion.',
      answer:
        'BST: walk from the root — both values smaller, go left; both bigger, go right; otherwise stop: this is the split point (or one of the targets), i.e. the LCA. O(h) time, O(1) space. General tree: postorder — recurse left and right; each returns p, q, an LCA found below, or null. Both sides non-null means p and q are on different sides → current node is the LCA; one side null → forward the other side up. O(n) time, O(h) stack. The BST needs no recursion because the ordering property is a routing table: comparing both targets against the current value decides the single subtree that can contain their LCA. A general tree has no such signpost, so you must genuinely search both sides.',
      isCaseBased: false,
    },
    {
      question: 'Explain the height-reuse pattern using Diameter of Binary Tree, then show how the same skeleton solves Maximum Path Sum.',
      answer:
        'Diameter: one postorder pass where the recursion RETURNS each node\'s height and, on the way, updates a global best with L + R — the edge-length of the path bending at that node. O(n), versus O(n²) for calling height() per node. Max Path Sum is the same skeleton with two edits: the return value becomes node->val + max(0, max(Lgain, Rgain)) — the best downward arm, with negative arms clipped to 0 — and the global update becomes node->val + max(0, Lgain) + max(0, Rgain). The transferable idea: the recursion returns the "extendable arm" a parent could use; the global harvests the "full bend" no parent can use. Any best-path-through-a-node problem factors exactly this way.',
      isCaseBased: false,
    },
    {
      question: 'Case: kth smallest in a BST. Your recursive inorder works, but the interviewer follows up: "the tree has 10^7 nodes and k is usually under 10 — improve it." Then: "now inserts happen between queries."',
      answer:
        'Follow-up 1: iterative inorder with early exit — dive the left spine, pop; return after the kth pop. Cost O(h + k) instead of O(n), and no recursion to overflow on a possibly-skewed 10^7-node tree. Follow-up 2: augment each node with its subtree size, maintained during insert (+1 along the insertion path). Then kth smallest is one walk: leftSize + 1 == k → this node; k <= leftSize → go left; else go right with k -= leftSize + 1. O(h) per query and per insert. Name it: an order-statistics tree. Tradeoff to state: augmentation adds 4–8 bytes per node and couples insert code to the query.',
      isCaseBased: true,
    },
    {
      question: 'A naive isBalanced calls height() at every node. What is its complexity on a skewed tree, and how does the -1 sentinel version fix it?',
      answer:
        'Naive: isBalanced(n) computes height(left) and height(right) — O(subtree size) — then recurses into both children, recomputing the same heights again and again. On a chain, node i pays O(n − i): total O(n²). The fix inverts the flow: compute heights bottom-up in ONE postorder pass and smuggle the verdict through the same return value — -1 means "unbalanced somewhere below". Each caller short-circuits on -1; otherwise it checks |L − R| ≤ 1 and returns an honest height. Every node visited once: O(n) time, O(h) stack. The general trick: when a boolean and a number must travel together, encode the failure in the number\'s impossible range.',
      isCaseBased: false,
    },
    {
      question: 'Case: design serialize/deserialize for a binary tree. You propose level-order with nulls (the LeetCode display format); the interviewer asks whether preorder can work and which you would ship.',
      answer:
        'Preorder works — with null markers. The writer emits root before subtrees, so the reader always knows the next token is the root of the subtree it is currently building; "#" tokens terminate subtrees, making the encoding uniquely decodable with zero bookkeeping. Both formats are O(n). I would ship preorder + "#": writer and reader are the same ~6-line recursion, no queue, no index math, and the stream position itself is the parser state. Level-order earns its keep when you want the top of the tree first (breadth-limited streaming or human-readable rows). Traps to name: preorder WITHOUT nulls is ambiguous; reconstructing from a preorder + inorder pair is unique only when values are distinct.',
      isCaseBased: true,
    },
    {
      question: 'BST search and insert — what are the real worst cases, and what do production systems do about them?',
      answer:
        'Both are O(h), one comparison per level. Balanced: h ≈ log₂ n — about 20 comparisons for a million nodes. But insert keys in sorted order and the tree degenerates into a linked list: h = n, so O(n) per operation — the BST\'s promise evaporates exactly when the input looks friendly. Production fix: self-balancing trees that rotate on the way up — AVL (tighter balance, faster lookups) and red-black (fewer rotations, faster inserts; what std::map and std::set use) — guaranteeing O(log n). Interview line worth saying: "I\'ll assume a red-black tree gives me O(log n); I can sketch rotations if you want, but I would not hand-roll one in production."',
      isCaseBased: false,
    },
    {
      question: 'How do you produce the right view of a binary tree? Give two approaches and their tradeoffs.',
      answer:
        'Approach 1: level order with the size trick, keeping the LAST node of each level (left view: the first). O(n) time, O(w) queue memory where w is the max width — up to n/2 on a bushy tree. Approach 2: DFS visiting the RIGHT child first, carrying depth; the first node reached at each new depth is part of the view — record whenever depth == view.size(). O(n) time, O(h) stack — better memory on wide trees. Both are one idea in different clothes: "first node encountered per level", under an ordering that delivers the answer first.',
      isCaseBased: false,
    },
    {
      question: 'Your recursive tree traversal crashes with a stack overflow in production but never in tests. What happened, and what are the escalation options?',
      answer:
        'The production tree was skewed: recursion depth is O(h), and on a chain h = n. At roughly 10^5–10^6 frames the default few-MB call stack dies — while tests used balanced trees with depth log n and never came close. Options, in order: (1) go iterative with an explicit heap-allocated stack or queue — same O(n) work, no frame limit; (2) for inorder specifically, Morris traversal reaches O(1) extra space by temporarily threading each left subtree\'s rightmost node back to the current node, then unthreading — in an interview, the name plus a two-line sketch usually suffices; (3) if the tree is a BST built from sorted input, fix the root cause: balance it (or use std::map). The lesson to say out loud with every tree answer: recursion carries a hidden O(h) memory cost.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    {
      front: 'Pre / in / post — where is the root, and what is each FOR?',
      back: 'PREorder root first → copy/serialize. INorder root between → BST sorted output. POSTorder root last → heights, subtree sums, delete. All O(n) time, O(h) stack.',
    },
    {
      front: 'Inorder of a BST gives…',
      back: 'Sorted ascending — always, balanced or not. Powers: validation (strictly increasing check), kth smallest, closest value.',
    },
    {
      front: 'Iterative inorder skeleton',
      back: 'while (cur || stack not empty): dive left pushing everything; pop = next in order, visit; cur = popped->right. Stack = ancestors with pending right sides.',
    },
    {
      front: 'Level-order: how do you separate the levels?',
      back: 'Freeze int sz = q.size() before the inner loop — exactly this level\'s population. Children pushed during the loop are the next level.',
    },
    {
      front: 'Validate BST — the rule',
      back: 'Every node fits a window (lo, hi) inherited from ALL ancestors: left child → (lo, node), right child → (node, hi). Child-only comparison is the classic wrong answer (10/5/15 with 15.left = 6).',
    },
    {
      front: 'LCA: BST vs general binary tree',
      back: 'BST: walk by value to the first split point — O(h), no recursion. General: postorder; both sides return non-null → current node is the LCA — O(n).',
    },
    {
      front: 'Diameter pattern (height-reuse)',
      back: 'Postorder returns height; at each node update best = max(best, L + R) — the path bending there. One O(n) pass. Same skeleton: Maximum Path Sum.',
    },
    {
      front: 'Balanced check in O(n)',
      back: 'Bottom-up height with a sentinel: return -1 the moment any subtree is unbalanced or |L − R| > 1; short-circuit upward. Works because real heights are never negative.',
    },
    {
      front: 'Serialize a binary tree — the interview default',
      back: 'Preorder with "#" for null. Root-first means the reader always knows what the next token is; markers end subtrees. O(n) both ways; n nodes → n + 1 markers.',
    },
    {
      front: 'Right / left view of a tree',
      back: 'Level order: take .back() of each level (right view) or .front() (left view). Alternative: DFS right-child-first, record the first node at each new depth.',
    },
  ],
  mindmapMarkdown: `- Trees: Traversals, BST, LCA & Views
  - Vocabulary
    - root · leaf · edge
    - depth (edges up) vs height (edges down)
    - balanced: |hL − hR| ≤ 1 at EVERY node
  - DFS
    - preorder: root first → copy, serialize
    - inorder: root between → BST sorted
    - postorder: children first → heights
    - iterative inorder: left spine + stack
    - stack depth O(h) — overflow on skewed
  - BFS level order
    - queue + frozen q.size()
    - right view = .back() per level
    - left view = .front() per level
  - BST
    - property covers WHOLE subtrees
    - validate: (lo, hi) window down
    - child-only check → 10/5/15(6,20) trap
    - search & insert O(h)
    - skewed h = n → red-black fixes
  - LCA
    - BST: walk to the split point O(h)
    - general: postorder, L && R → root
  - Height-reuse pattern
    - return height, harvest best = L + R
    - diameter · max path sum
    - balanced: −1 sentinel short-circuit
  - Serialize
    - preorder + '#' markers
    - reader replays writer's recursion
    - n + 1 nulls, O(n) round trip`,
}

export default m
