var e={id:`dsa-l2-tries`,subjectId:`dsa`,level:2,title:`Tries: Prefix Power`,whyItMatters:`A hashmap answers one question: "is this exact word stored?" A trie answers the question interviews actually ask: "what starts with these letters?" That single upgrade powers autocomplete, spellcheck, and Word Search II — and the implementation is 30 lines you should be able to write cold.`,estMinutes:40,sections:[{type:`intuition`,title:`Store words as paths, not as blobs`,md:`Type "ca" on your phone and it offers cat, car, care. It is not scanning a million words — it walked two letters down a tree and everything below is the answer.

- A **trie** (prefix tree) stores words as **paths from the root**. Each edge is one letter.
- A node is dead simple: an array of 26 child pointers (one per lowercase letter) + one flag.
- **isEnd** flag = "a stored word ends exactly here". Without it, you cannot tell the stored word *cat* from the mere prefix *ca*.
- The **root is the empty prefix** "" — every word starts there, so the root spells nothing.
- Words sharing a prefix **share the path**: cat and car split only at the third letter. Storage does the deduplication for you.`},{type:`visual`,component:`PointerBoxDiagram`,props:{title:`Building the trie: insert("cat"), then insert("car")`,notice:`Watch the second word. The shared "ca" path is walked, not rebuilt — "car" costs exactly one new node.`,leftLabel:`edges (parent → child)`,rightLabel:`trie nodes`,frames:[{note:`Empty trie. Only the root exists — it represents the empty prefix "", so it spells nothing.`,stack:[{name:`root`,to:`root`}],heap:[{id:`root`,value:`( )`,label:`empty prefix`}]},{note:`insert("cat"), letter 1: root has no c child. Allocate a node, wire root→c.`,stack:[{name:`root`,to:`root`},{name:`root→c`,to:`n-c`}],heap:[{id:`root`,value:`( )`,label:`empty prefix`},{id:`n-c`,value:`c`}]},{note:`Letter 2: c has no a child. Allocate, wire c→a. The path root→c→a now spells the prefix "ca".`,stack:[{name:`root`,to:`root`},{name:`root→c`,to:`n-c`},{name:`c→a`,to:`n-a`}],heap:[{id:`root`,value:`( )`,label:`empty prefix`},{id:`n-c`,value:`c`},{id:`n-a`,value:`a`}]},{note:`Letter 3: allocate t, wire a→t, and set isEnd = true there. "cat" is now a STORED WORD, not just a path.`,stack:[{name:`root`,to:`root`},{name:`root→c`,to:`n-c`},{name:`c→a`,to:`n-a`},{name:`a→t`,to:`n-t`}],heap:[{id:`root`,value:`( )`,label:`empty prefix`},{id:`n-c`,value:`c`},{id:`n-a`,value:`a`},{id:`n-t`,value:`t ✓`,label:`isEnd — "cat"`}]},{note:`insert("car"), letter 1: root ALREADY has a c child. No allocation — just step into it.`,stack:[{name:`root`,to:`root`},{name:`root→c`,to:`n-c`},{name:`c→a`,to:`n-a`},{name:`a→t`,to:`n-t`},{name:`cur (in c)`,to:`n-c`}],heap:[{id:`root`,value:`( )`,label:`empty prefix`},{id:`n-c`,value:`c`,label:`reused`},{id:`n-a`,value:`a`},{id:`n-t`,value:`t ✓`,label:`isEnd — "cat"`}]},{note:`Letter 2: a exists too. The entire "ca" prefix is shared with "cat" — two letters in, zero new nodes.`,stack:[{name:`root`,to:`root`},{name:`root→c`,to:`n-c`},{name:`c→a`,to:`n-a`},{name:`a→t`,to:`n-t`},{name:`cur (in a)`,to:`n-a`}],heap:[{id:`root`,value:`( )`,label:`empty prefix`},{id:`n-c`,value:`c`,label:`reused`},{id:`n-a`,value:`a`,label:`reused`},{id:`n-t`,value:`t ✓`,label:`isEnd — "cat"`}]},{note:`Letter 3: a has no r child. Allocate ONE node, mark isEnd. Total cost of "car": one allocation. That sharing is the whole trie idea.`,stack:[{name:`root`,to:`root`},{name:`root→c`,to:`n-c`},{name:`c→a`,to:`n-a`},{name:`a→t`,to:`n-t`},{name:`a→r`,to:`n-r`}],heap:[{id:`root`,value:`( )`,label:`empty prefix`},{id:`n-c`,value:`c`,label:`reused`},{id:`n-a`,value:`a`,label:`reused`},{id:`n-t`,value:`t ✓`,label:`isEnd — "cat"`},{id:`n-r`,value:`r ✓`,label:`isEnd — "car"`}]}]}},{type:`intuition`,title:`The selling point: O(L), no matter how many words`,md:`Every trie operation walks one node per letter. For a word of length L:

- **insert** — O(L). Walk down, creating missing nodes on the way.
- **search** — O(L). Walk down; found only if the walk survives AND ends on isEnd.
- **startsWith** — O(L). Walk down; surviving the walk is enough.
- L is the word's length — **the number of stored words never appears**. Ten words or ten million: same cost.
- The hashmap comparison, said precisely: a hashmap also does exact lookup in O(L) (hashing reads every character). The trie wins on the question a hashmap **cannot answer**: "give me everything starting with *ca*". Hashing scatters keys on purpose — cat and car land in unrelated buckets. A trie clusters them under one node, so a prefix query is an O(prefix) walk, then everything below is your answer.`},{type:`note`,md:`Trigger phrases → trie: "starts with", "prefix", "autocomplete", "words on a board", "shortest root of a word". If the problem is pure exact membership with no prefix angle, a hash set is simpler and wins — the trie is not a default, it is a prefix specialist.`},{type:`code`,lang:`cpp`,title:`Trie, interview-grade (LeetCode 208)`,code:`struct TrieNode {
    TrieNode* child[26] = {};   // = {} zero-inits: all 26 start as nullptr
    bool isEnd = false;         // a stored word ends exactly here
};

class Trie {
    TrieNode* root = new TrieNode();   // the empty prefix

    TrieNode* walk(const string& s) {  // follow s letter by letter
        TrieNode* cur = root;
        for (char ch : s) {
            cur = cur->child[ch - 'a'];
            if (!cur) return nullptr;  // path breaks: prefix not present
        }
        return cur;
    }

public:
    void insert(const string& w) {
        TrieNode* cur = root;
        for (char ch : w) {
            int i = ch - 'a';
            if (!cur->child[i]) cur->child[i] = new TrieNode();
            cur = cur->child[i];
        }
        cur->isEnd = true;             // stamp the word's last node
    }
    bool search(const string& w)     { TrieNode* n = walk(w); return n && n->isEnd; }
    bool startsWith(const string& p) { return walk(p) != nullptr; }
};`,annotations:{2:`The node IS the structure: 26 slots + 1 flag. child[i] non-null means "some stored word continues with letter (i + a) here".`,12:`ch - 'a' maps a..z to 0..25 — the letter is the array index. This is why the array version assumes lowercase-only input.`,23:`Create-on-demand: insert only allocates where the path is missing. Shared prefixes cost nothing — see the diagram above.`,26:`Without this line "cat" would be indistinguishable from the prefix "ca". isEnd is the entire difference between search and startsWith.`,28:`search = the walk survives AND isEnd is set. Both O(L), L = length of the query — the word count N never enters.`,29:`startsWith = the walk survives, full stop. This one-line difference is a favorite quiz question.`},py:{code:`class TrieNode:
    def __init__(self):
        self.child = {}             # letter -> TrieNode; absent = no such path
        self.isEnd = False          # a stored word ends exactly here

class Trie:
    def __init__(self):
        self.root = TrieNode()      # the empty prefix

    def _walk(self, s: str):        # follow s letter by letter
        cur = self.root
        for ch in s:
            cur = cur.child.get(ch)
            if cur is None:
                return None         # path breaks: prefix not present
        return cur

    def insert(self, w: str) -> None:
        cur = self.root
        for ch in w:
            if ch not in cur.child:
                cur.child[ch] = TrieNode()
            cur = cur.child[ch]
        cur.isEnd = True            # stamp the word's last node

    def search(self, w: str) -> bool:
        n = self._walk(w)
        return n is not None and n.isEnd

    def startsWith(self, p: str) -> bool:
        return self._walk(p) is not None`,annotations:{3:`A dict of letter -> node replaces the 26-slot array: no lowercase-only assumption, unused branches cost nothing, and the node stays 2 attributes. The C++ array is faster and cache-friendlier — say you know both, and which you would pick.`,13:`.get(ch) hands back None on a miss instead of raising KeyError — the dict spelling of "child[i] is nullptr". All the ord(ch) - ord('a') arithmetic disappears with it.`,21:`Create-on-demand: insert only allocates where the path is missing. Shared prefixes cost nothing — see the diagram above.`,24:`Without this line "cat" would be indistinguishable from the prefix "ca". isEnd is the entire difference between search and startsWith.`,28:`search = the walk survives AND isEnd is set. Both O(L), L = length of the query — the word count N never enters.`,31:`startsWith = the walk survives, full stop. This one-line difference is a favorite quiz question.`}}},{type:`code`,lang:`cpp`,title:`Desk-check the three operations`,code:`Trie t;
t.insert("cat");
t.insert("car");
cout << t.search("car");       // 1
cout << t.search("ca");        // 0 -- the a node exists but isEnd is false
cout << t.startsWith("ca");    // 1 -- for a prefix, existing is enough
cout << t.search("cab");       // 0 -- a has no b child: the walk breaks`,annotations:{5:`The classic trap: "ca" is a path in the trie but not a stored word. search says no; startsWith says yes.`,7:`walk reaches a, then child['b'-'a'] is nullptr → return nullptr → false. Same code path handles missing words and missing prefixes.`},py:{code:`t = Trie()
t.insert("cat")
t.insert("car")
print(t.search("car"))       # True
print(t.search("ca"))        # False -- the a node exists but isEnd is False
print(t.startsWith("ca"))    # True -- for a prefix, existing is enough
print(t.search("cab"))       # False -- a has no b child: the walk breaks`,annotations:{5:`The classic trap: "ca" is a path in the trie but not a stored word. search says no; startsWith says yes.`,7:`_walk reaches a, then child.get("b") is None → return None → False. Same code path handles missing words and missing prefixes.`}}},{type:`note`,md:"Ownership, said out loud: the raw-pointer version **leaks every node** when the Trie dies — acceptable in a 40-minute interview, but say it before the interviewer does. The clean fix is one type change: `unique_ptr<TrieNode> child[26]`. Then each node owns its children, destroying the root cascades through the whole trie, and the only edits are `child[i] = make_unique<TrieNode>()` and stepping with `cur = cur->child[i].get()`. Same logic, zero leaks."},{type:`intuition`,title:`Word Search II: one trie beats W searches`,md:`Problem: a letter grid + a dictionary of W words. Find every dictionary word traceable through adjacent cells (LeetCode 212 — a top-tier hard).

- Brute force: for each word, DFS the board looking for it. W words × a full board search each — the same board paths re-walked W times. TLE.
- The trie move: build ONE trie of all W words, then DFS the board **once**, moving a trie pointer alongside the board position.
- At each cell the question flips from "does this match word #k?" to "does **any** dictionary word continue with this letter?" — one array lookup.
- **Pruning is the payoff**: the board path spells "xq" and no word starts with "xq"? The child is nullptr, and that single check kills every longer path through this cell. Dead prefixes never get explored.
- Hitting a node with isEnd = true mid-walk means a whole word matched — record it and keep going (longer words may continue below).`},{type:`code`,lang:`cpp`,title:`Word Search II — the DFS with trie pruning`,code:`void dfs(vector<vector<char>>& b, int r, int c,
         TrieNode* node, string& path, vector<string>& found) {
    if (r < 0 || r >= (int)b.size() || c < 0 || c >= (int)b[0].size()) return;
    char ch = b[r][c];
    if (ch == '#') return;                 // cell already used on this path
    TrieNode* nxt = node->child[ch - 'a'];
    if (!nxt) return;                      // no dictionary word continues here: PRUNE
    path.push_back(ch);
    if (nxt->isEnd) {
        found.push_back(path);             // a full word matched mid-walk
        nxt->isEnd = false;                // report each word once
    }
    b[r][c] = '#';                         // the board itself is the visited set
    dfs(b, r + 1, c, nxt, path, found);
    dfs(b, r - 1, c, nxt, path, found);
    dfs(b, r, c + 1, nxt, path, found);
    dfs(b, r, c - 1, nxt, path, found);
    b[r][c] = ch;                          // backtrack: restore the letter
    path.pop_back();
}`,annotations:{7:`THE line. One nullptr check discards every extension of a dead prefix — this is why the trie version passes where per-word search TLEs.`,11:`Flipping isEnd off after recording is the standard dedupe: the same word reachable via two board paths gets reported once.`,13:`No separate visited[][] — overwrite the cell with a sentinel, restore on the way out. Less state, same guarantee.`,18:`Backtracking in two lines (18–19): undo the board mark, undo the path letter. Forgetting either corrupts every later branch.`},py:{code:`def dfs(b: list[list[str]], r: int, c: int, node: TrieNode,
        path: list[str], found: list[str]) -> None:
    if not (0 <= r < len(b) and 0 <= c < len(b[0])):
        return
    ch = b[r][c]
    if ch == '#':
        return                             # cell already used on this path
    nxt = node.child.get(ch)
    if nxt is None:
        return                             # no dictionary word continues: PRUNE
    path.append(ch)
    if nxt.isEnd:
        found.append(''.join(path))        # a full word matched mid-walk
        nxt.isEnd = False                  # report each word once
    b[r][c] = '#'                          # the board itself is the visited set
    dfs(b, r + 1, c, nxt, path, found)
    dfs(b, r - 1, c, nxt, path, found)
    dfs(b, r, c + 1, nxt, path, found)
    dfs(b, r, c - 1, nxt, path, found)
    b[r][c] = ch                           # backtrack: restore the letter
    path.pop()`,annotations:{9:`THE line. One None check discards every extension of a dead prefix — this is why the trie version passes where per-word search TLEs.`,11:`path is a LIST of characters, not a str: strings are immutable, so there is no append/pop on one. Build the word only when a match fires, with join.`,14:`Flipping isEnd off after recording is the standard dedupe: the same word reachable via two board paths gets reported once.`,15:`No separate visited grid — overwrite the cell with a sentinel, restore on the way out. Less state, same guarantee. (Only works because the board is a list of LISTS; a list of strings would be immutable.)`,20:`Backtracking in two lines (20–21): undo the board mark, undo the path letter. Forgetting either corrupts every later branch.`}}},{type:`note`,md:`Complexity, stated the way an interviewer wants: build the trie in O(total characters in the dictionary). The DFS is O(R·C · 3^(L−1)) worst case — each start cell branches 4 ways once, then at most 3 (no going back), down to the longest word length L. Crucially, W (word count) is not a factor of the search: all W words ride the same walk.`},{type:`intuition`,title:`Prefix walks: Replace Words & Longest Word in Dictionary`,md:`Two more problems that are the *same walk* wearing different clothes:

- **Replace Words** (LeetCode 648): given roots like *cat*, replace *cattle* in a sentence with its **shortest** root. Put the roots in a trie; walk each sentence word down it; the **first isEnd you meet is the shortest root** — the walk visits prefixes in length order, shortest first, so you can stop immediately.
- **Longest Word in Dictionary** (LeetCode 720): find the longest word buildable one letter at a time, every prefix itself a stored word. Build the trie, then DFS **only through children with isEnd = true** — a node without the flag breaks the "every prefix is a word" chain, so its whole subtree is unreachable. Track the deepest node (ties: lexicographically smaller — visit children a→z and keep the first best). O(total characters).
- Shared shape: the trie turns "compare this word against N candidates" into a single root-to-leaf walk where flags on the path ARE the answer.`},{type:`code`,lang:`cpp`,title:`Replace Words — the shortest-root walk`,code:`string shortestRoot(TrieNode* root, const string& w) {
    TrieNode* cur = root;
    for (int i = 0; i < (int)w.size(); i++) {
        cur = cur->child[w[i] - 'a'];
        if (!cur) return w;                    // no root is a prefix: keep the word
        if (cur->isEnd) return w.substr(0, i + 1);  // FIRST flag = shortest root
    }
    return w;   // walked the whole word without a flag
}`,annotations:{5:`The walk dies before any isEnd → no dictionary root prefixes this word → it stays as-is.`,6:`Roots {"cat"}, word "cattle": c, a, then t has isEnd → return substr(0, 3) = "cat". Stopping at the FIRST flag is what makes it the shortest.`},py:{code:`def shortestRoot(root: TrieNode, w: str) -> str:
    cur = root
    for i, ch in enumerate(w):
        cur = cur.child.get(ch)
        if cur is None:
            return w                       # no root is a prefix: keep the word
        if cur.isEnd:
            return w[:i + 1]               # FIRST flag = shortest root
    return w   # walked the whole word without a flag`,annotations:{6:`The walk dies before any isEnd → no dictionary root prefixes this word → it stays as-is.`,8:`Roots {"cat"}, word "cattle": c, a, then t has isEnd → return w[:3] = "cat". The slice end is exclusive, hence i + 1. Stopping at the FIRST flag is what makes it the shortest.`}}},{type:`intuition`,title:`The bill: 26 pointers per node`,md:`The children[26] array is fast — and fat.

- On 64-bit: 26 pointers × 8 bytes = **208 bytes per node**, ~216 with the flag and padding — even when a node has ONE child. Deep chains of single-child nodes (long words, few shared prefixes) are almost pure wasted slots.
- A million-node trie ≈ 200+ MB. That is a real interview follow-up, not trivia.
- The fix: \`unordered_map<char, TrieNode*>\` children — memory proportional to children that actually exist, and it handles big alphabets (digits, unicode) the array cannot.
- The price: a hash lookup per step instead of an array index — bigger constants, worse cache behavior. Same O(L) on paper, measurably slower in practice.
- Rule of thumb: 26 lowercase letters and dense sharing → array. Large or sparse alphabet, memory-constrained → map. Name-drop for depth: a **compressed trie / radix tree** collapses single-child chains into one edge storing a whole substring.`},{type:`note`,md:`Forward reference, one line: autocomplete at real scale — millions of users, ranked top-k suggestions, sharding — is a System Design chapter; this module is the data structure it starts from.`}],quiz:[{question:`After insert("cat"), what do search("ca") and startsWith("ca") return?`,options:[{text:`true and true`,explanation:`search needs more than an existing path — the a node exists but no word ENDS there.`},{text:`false and true`,explanation:`Correct. The walk to a succeeds, but isEnd is false there: not a stored word, definitely a prefix.`},{text:`false and false`,explanation:`startsWith only asks whether the path exists — root→c→a does, so it returns true.`},{text:`true and false`,explanation:`Backwards: the prefix check is the one that passes, the exact-word check is the one that fails.`}],correct:1},{question:`A trie stores 10 million words. Complexity of search for a word of length L?`,options:[{text:`O(log N) where N is the word count`,explanation:`No halving happens anywhere — the walk never even learns how many words are stored.`},{text:`O(L) — one node per letter, independent of the 10 million`,explanation:`Correct. The walk touches exactly L nodes. Ten words or ten million: identical cost.`},{text:`O(N · L)`,explanation:`That is the cost of comparing against every stored word — precisely what the trie exists to avoid.`},{text:`O(26^L)`,explanation:`That is the trie's worst-case SIZE, not a search cost — search follows one path, never branches.`}],correct:1},{question:`A hash set also checks a length-L word in O(L). What does the trie do that the hash set cannot?`,options:[{text:`Faster exact lookups`,explanation:`The hash set is at least as fast on exact lookups, usually faster in constants.`},{text:`Answer prefix queries — hashing scatters cat and car; the trie keeps them under one node`,explanation:`Correct. "Everything starting with ca" is an O(2) walk in a trie; a hash set can only scan all N keys.`},{text:`Use less memory in all cases`,explanation:`Often the opposite — 26 pointers per node is expensive. The trie wins on capability, not memory.`},{text:`Handle duplicate words`,explanation:`Both handle duplicates fine (the trie just re-marks the same isEnd).`}],correct:1},{question:`insert("cat"), then insert("car"). How many nodes did the second insert allocate?`,options:[{text:`3 — one per letter`,explanation:`That ignores sharing: the walk found c and a already in place from "cat".`},{text:`1 — only the r; the "ca" path is reused`,explanation:`Correct. Insert allocates only where the path is missing. Shared prefixes are stored once.`},{text:`0 — car is covered by cat`,explanation:`The words diverge at letter 3: a has a t child but no r child, so one node is created.`},{text:`2 — a and r`,explanation:`The a node already exists from "cat" — the walk steps through it without allocating.`}],correct:1},{question:`In Word Search II, the DFS reads a cell and finds node->child[ch - 'a'] == nullptr. What does that prune?`,options:[{text:`Just this cell — the DFS tries the other three directions from here`,explanation:`Bigger than that: the return abandons this path entirely; no directions are tried from a dead prefix.`},{text:`Every board path extending the current prefix through this cell — no dictionary word starts that way`,explanation:`Correct. One nullptr check discards the entire subtree of continuations. This is why one trie beats W per-word searches.`},{text:`The word currently being matched, moving on to the next word`,explanation:`The trie version has no "current word" — all W words are matched simultaneously by one walk.`}],correct:1},{question:`Why does Replace Words stop at the FIRST isEnd on the walk down?`,options:[{text:`Later flags might be other words, not roots`,explanation:`Everything in this trie is a root — the reason is about length, not membership.`},{text:`The walk meets prefixes shortest-first, so the first flag IS the shortest root`,explanation:`Correct. Depth on the walk equals prefix length — the earliest flag cannot be beaten by anything deeper.`},{text:`Continuing would corrupt the trie`,explanation:`Walking is read-only — continuing is safe, just pointless once the shortest root is found.`}],correct:1},{question:`A trie node with children[26] on a 64-bit machine costs about how much, and when is a map of children better?`,options:[{text:`~26 bytes; the array is always better`,explanation:`Each slot is an 8-byte POINTER: 26 × 8 = 208 bytes before the flag and padding.`},{text:`~208 bytes; switch to a map when the alphabet is large or nodes are mostly single-child`,explanation:`Correct. Sparse branching wastes most of the 26 slots; a map pays only for children that exist — at the cost of slower steps.`},{text:`~208 bytes; the map is better because it makes search O(1)`,explanation:`The map does not change O(L) — it trades memory for slower per-step constants, not a better complexity.`}],correct:1}],interviewQuestions:[{question:`Describe the trie data structure and explain why the root represents the empty prefix.`,answer:`A trie stores strings as root-to-node paths: each node holds child[26] (one slot per lowercase letter, nullptr = no word continues that way) and an isEnd flag marking "a stored word ends here". A node's meaning is the path spelling that reaches it — node identity IS the prefix. The root is reached by spelling nothing, so it represents "" — the one prefix every word shares — which is exactly why every insert and search starts there. Words with a common prefix share that path physically: cat and car share root→c→a and diverge only at the third node.`,isCaseBased:!1},{question:`State and justify the complexity of insert, search, and startsWith. Where does the number of stored words appear?`,answer:`All three are O(L) for a string of length L: each does exactly one node-step per character, and each step is an O(1) array index (ch − 'a'). The word count N appears nowhere — the walk never inspects any node outside its own path. That independence is the headline: a hashmap matches O(L) on exact lookup (hashing reads all L characters anyway), but the trie also answers prefix queries in O(prefix), which a hashmap cannot do at all because hashing deliberately scatters similar keys. Space is the honest tradeoff: O(total characters) nodes, each carrying 26 pointers.`,isCaseBased:!1},{question:`You implemented the trie with raw new-ed nodes. The interviewer asks: "any problems with this code in production?"`,answer:`Two, and naming them unprompted scores points. (1) Memory leak: nothing deletes the nodes — the fix is unique_ptr<TrieNode> child[26], so each node owns its children and destroying the root cascades through the trie; the only code changes are make_unique on creation and .get() when stepping. (2) Input assumptions: ch − 'a' silently corrupts on uppercase, digits, or unicode — validate or widen the alphabet (which then raises the array-vs-map children question). Bonus: a recursive destructor on a very deep trie can overflow the stack; an iterative teardown or arena allocation fixes that.`,isCaseBased:!1},{question:`Case: Word Search II — your per-word DFS solution TLEs with 10^4 dictionary words on a 12×12 board. The interviewer asks what you change.`,answer:`The per-word approach re-walks the same board paths once per word: W × O(R·C·3^(L−1)). Replace it with one trie of the whole dictionary and ONE DFS over the board, advancing a trie pointer with the board position. Two wins: (1) all 10^4 words are matched simultaneously — W drops out of the search cost entirely, leaving O(R·C·3^(L−1)) plus O(total characters) to build the trie; (2) pruning — if the current cell's letter has a nullptr child, no dictionary word continues that way, and one check abandons every extension of that path. Details worth saying: mark visited by overwriting the cell with '#' and restoring on backtrack, and flip isEnd off after recording a word so duplicate board paths report it once.`,isCaseBased:!0},{question:`Walk me through Replace Words: dictionary of roots, replace every word in a sentence with its shortest root.`,answer:`Build a trie of the roots — O(total root characters), one-time. For each sentence word, walk it down the trie: if the walk hits a nullptr child before any isEnd, no root prefixes this word — keep it unchanged; the first isEnd encountered is returned as w.substr(0, i+1). Correctness of "first = shortest": the walk visits prefixes in strictly increasing length, so the earliest flag is the shortest root by construction. Total: O(sentence characters) for all queries — each word costs at most its own length. The brute force this kills: comparing every word against every root, O(W × R × L).`,isCaseBased:!1},{question:`Longest Word in Dictionary: longest word buildable one character at a time, where every prefix is itself in the dictionary. Approach?`,answer:`Trie of all words, then DFS from the root that only descends into children whose isEnd is true — a child without the flag breaks the every-prefix-is-a-word chain, so its entire subtree is unreachable and gets pruned. Track the deepest node reached; for the lexicographic tie-break, iterate children a→z and only replace the answer on strictly greater depth. Complexity: O(total characters) to build and O(nodes) to DFS — linear in input size. The elegant part to point out: isEnd flags, which normally answer queries, here act as the traversal permission — the same structure, read a different way.`,isCaseBased:!1},{question:`Case: your autocomplete trie holds 10^6 product names and memory profiling shows 400 MB. The interviewer asks why, and what you would do.`,answer:`Diagnosis: children[26] costs 26 × 8 = 208 bytes per node before padding, paid even by single-child nodes — and product names share few prefixes, so the trie is mostly long single-child chains of nearly-empty arrays. Fixes in escalation order: (1) unordered_map<char, TrieNode*> children — memory proportional to real children, same O(L), slower constants per step (hash vs array index, worse cache locality); (2) a compressed trie / radix tree — collapse single-child chains into one edge holding a substring, typically cutting node count by an order of magnitude; (3) if the query pattern is exact-match only, admit the trie is the wrong structure and use a hash set. Closing the loop: ranked top-k autocomplete at scale is a system-design problem — precomputed top-k per node, sharding — beyond a single in-memory trie.`,isCaseBased:!0},{question:`How would you delete a word from a trie? What is the subtle part?`,answer:`The cheap version: walk to the word's last node and set isEnd = false — O(L), and the word is gone from every query. The subtle part is the now-dead nodes: if "cattle" is removed and no other word uses those nodes, a chain of childless, flagless nodes remains, wasting memory. Full cleanup: recurse to the end, unset isEnd, and on the way back delete any child that has no children and no flag — still O(L). Stop condition: a node keeps living if it has other children (shared prefix) or its own isEnd (it terminates another word, e.g. "cat" inside "cattle"). In interviews, offer the lazy version first and name the cleanup as the follow-up — that ordering shows judgment.`,isCaseBased:!1},{question:`Case: interviewer follow-up — "your trie powers search-box suggestions; users expect the top 5 completions ranked by popularity, in milliseconds. Is a plain startsWith walk enough?"`,answer:`No — startsWith finds the prefix node in O(prefix), but enumerating everything below it is O(subtree), which for a short prefix like "a" can be most of the dictionary, then a sort on top. The in-memory upgrade: store at every node a cached top-k list (or a count and a small heap) maintained on insert — the query becomes O(prefix + k), reading precomputed answers off the node. Costs to name: k extra entries per node of memory, and updates now touch every node on the inserted word's path to refresh caches. Beyond one machine — millions of users, personalization, freshness — this becomes the autocomplete system-design question: sharded tries, precomputed suggestion stores. The data structure here is the seed of that design, not the whole answer.`,isCaseBased:!0},{question:`When is a hash set the better tool than a trie? Give the honest decision rule.`,answer:`Whenever the queries are exact membership only. The hash set does O(L) average lookups with better constants (one hash + one bucket probe vs L dependent pointer hops, each a potential cache miss), takes one line to use, and typically less memory than a pointer-heavy trie. The trie earns its complexity only when prefixes are load-bearing: startsWith queries, autocomplete, shortest-root lookups, multi-word matching with shared-prefix pruning (Word Search II), or ordered enumeration of words. Decision rule in one sentence: no prefix requirement, no trie. Reaching for a trie on a plain "have we seen this word" problem is over-engineering an interviewer will poke at.`,isCaseBased:!1}],flashcards:[{front:`Trie node, definition`,back:`child[26] pointers (nullptr = no word continues with that letter) + isEnd flag ("a stored word ends here"). Root = the empty prefix "".`},{front:`insert / search / startsWith complexity`,back:`All O(L), L = string length. One node-step per character. INDEPENDENT of how many words the trie stores.`},{front:`search vs startsWith`,back:`Both walk the string. search additionally requires isEnd at the final node. After insert("cat"): search("ca") = false, startsWith("ca") = true.`},{front:`Trie vs hashmap, one breath`,back:`Hashmap: exact membership, O(L), no prefix ability (hashing scatters keys). Trie: O(L) exact AND O(prefix) prefix queries — similar keys share a physical path.`},{front:`Trigger phrases → trie`,back:`"starts with…", "prefix", "autocomplete", "shortest root", "find all dictionary words on a board".`},{front:`Word Search II recipe`,back:`One trie of the dictionary + one DFS over the board with a trie pointer. nullptr child → prune the whole subtree. Mark cells with # in place; restore on backtrack.`},{front:`Word Search II dedupe trick`,back:`After recording a matched word, set that node's isEnd = false — the same word found by another board path is not reported twice.`},{front:`Trie memory bill`,back:`26 pointers × 8 B ≈ 208 B per node, even single-child ones. Large/sparse alphabet → unordered_map children (memory ∝ real children, slower steps). Name-drop: radix tree collapses chains.`},{front:`Raw-pointer trie leak fix`,back:`unique_ptr<TrieNode> child[26]: nodes own their children, destruction cascades from the root. Create with make_unique, step with .get().`}],mindmapMarkdown:`- Tries: Prefix Power
  - Structure
    - node = child[26] + isEnd
    - root = empty prefix ""
    - path from root SPELLS the word
    - shared prefixes stored once (cat/car share "ca")
  - Operations — all O(L)
    - insert: create-on-demand walk
    - search: walk survives + isEnd
    - startsWith: walk survives
    - word count N never appears
  - vs hashmap
    - hashmap: exact "is it there", scatters keys
    - trie: "what starts with this" in O(prefix)
  - Word Search II
    - one trie + one board DFS
    - nullptr child → prune subtree
    - isEnd = false after report (dedupe)
    - '#' mark on board = visited set
  - Prefix-walk applications
    - Replace Words: first isEnd = shortest root
    - Longest Word: DFS only through isEnd nodes
  - Memory
    - 26 ptrs ≈ 208 B per node
    - sparse/large alphabet → map children
    - radix tree collapses single-child chains
    - unique_ptr children: no leaks
  - Autocomplete at scale → System Design`};export{e as default};