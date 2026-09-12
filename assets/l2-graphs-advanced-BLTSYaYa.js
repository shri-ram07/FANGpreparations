var e={id:`dsa-l2-graphs-advanced`,subjectId:`dsa`,level:2,title:`Graphs II: Dijkstra, Bellman-Ford, DSU & MST`,whyItMatters:`Weighted graphs are where interview difficulty jumps. BFS counts hops; real edges have prices. This module is the four tools behind every "cheapest path" and "cheapest network" question — Dijkstra, Bellman-Ford, Floyd-Warshall, and DSU-powered Kruskal/Prim — plus the one-line proofs of why each greedy is legal, which is what senior interviewers actually probe.`,estMinutes:60,sections:[{type:`note`,md:"Snippet convention: `#include <bits/stdc++.h>` and `using namespace std;` assumed, as in the STL module. This module builds on Graphs I — BFS/DFS, adjacency lists, and topological sort are prerequisites."},{type:`intuition`,title:`Dijkstra: the ripple that respects prices`,md:`Drop a stone in a pond where water moves slower through thicker weeds. The wavefront reaches every point exactly at its cheapest travel time — never early, never late.

- BFS finds the **fewest edges** — correct only when every edge costs 1. Weighted graphs need fewest *total cost*.
- Dijkstra = BFS with the queue swapped for a **min-heap keyed on total distance from the source**. That swap is the whole algorithm.
- **Relaxing** edge u→v with weight w: if \`dist[u] + w < dist[v]\`, a cheaper route into v was found — record it.
- Pop rule: the node with the smallest tentative distance is **done**. Every other frontier path already costs more, and non-negative edges mean extending a path never makes it cheaper.
- Canonical problem: **Network Delay Time** — the template below, verbatim.`},{type:`visual`,component:`GraphTraversal`,props:{algorithm:`dijkstra`}},{type:`code`,lang:`cpp`,title:`Dijkstra with lazy deletion — the interview template`,code:`vector<int> dijkstra(int n, vector<vector<pair<int,int>>>& adj, int src) {
    vector<int> dist(n, INT_MAX);      // adj[u] = list of {v, w}
    priority_queue<pair<int,int>, vector<pair<int,int>>,
                   greater<pair<int,int>>> pq;   // min-heap of {dist, node}
    dist[src] = 0;
    pq.push({0, src});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;         // stale entry -- skip it
        for (auto [v, w] : adj[u])
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;     // relax the edge
                pq.push({dist[v], v});     // old entry stays: now stale
            }
    }
    return dist;
}`,annotations:{4:`pair compares by first, so the distance goes FIRST in the pair. greater<> flips the default max-heap into a min-heap — the incantation from the STL module.`,9:`Lazy deletion: dist[u] improved after this entry was pushed, so the entry is outdated. Skipping it on the way OUT is the poor man's decrease-key.`,13:`std::priority_queue has no decrease-key — push a duplicate instead. The heap holds up to O(E) entries: O(E log E) total, and log E ≤ 2 log V, so O(E log V).`},py:{code:`import heapq

def dijkstra(n: int, adj: list[list[tuple[int, int]]], src: int) -> list[float]:
    dist = [float('inf')] * n          # adj[u] = list of (v, w)
    pq = [(0, src)]                    # min-heap of (dist, node)
    dist[src] = 0
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue                   # stale entry -- skip it
        for v, w in adj[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w              # relax the edge
                heapq.heappush(pq, (dist[v], v))   # old entry stays: now stale
    return dist`,annotations:{5:`Tuples compare element-wise, so the DISTANCE goes first. heapq is already a min-heap, so the whole greater<> incantation from the C++ pane disappears — a bare list is the heap.`,9:`Lazy deletion: dist[u] improved after this entry was pushed, so the entry is outdated. Skipping it on the way OUT is the poor man's decrease-key.`,14:`heapq has no decrease-key either — push a duplicate instead. The heap holds up to O(E) entries: O(E log E) total, and log E ≤ 2 log V, so O(E log V).`}}},{type:`note`,md:'**Network Delay Time** (LeetCode 743), the canonical: signal starts at node k, travel times on edges — when does the LAST node hear it? Run the template from k; answer is `max(dist)`, or −1 if any node stays at INT_MAX. One Dijkstra, O(E log V). Trigger phrase: *"cheapest/fastest path, weights all non-negative"*.'},{type:`intuition`,title:`The 3-node graph that kills Dijkstra`,md:`Nodes S, A, B. Edges: S→A costs 2, S→B costs 5, B→A costs **−4**.

- Dijkstra from S relaxes both neighbors: dist[A] = 2, dist[B] = 5. The heap pops A first — cheapest — and seals it at 2.
- But the true shortest path is S→B→A = 5 + (−4) = **1**. The discount arrives after A is already sealed.
- The greedy proof needs one promise: *adding more edges never makes a path cheaper*. A negative edge breaks that promise, so the "pop = final" argument dies.
- The lazy-deletion variant can stumble into the right answer on tiny cases — but the guarantee and the runtime bound are both gone (worst cases degrade to exponential re-processing).
- Rule: **one negative edge anywhere → Dijkstra is off the table.** Say it before the interviewer asks.`},{type:`intuition`,title:`Bellman-Ford: brute-force relaxation, with a proof`,md:`A rumor spreads through an office in rounds. Each round, everyone repeats it to their neighbors. After i rounds, anyone within i handshakes has heard the *best* version.

- Bellman-Ford: relax **every edge**, and repeat that sweep **V−1 times**. No heap, no order, no cleverness.
- Why V−1 is enough: a shortest path (when no negative cycle exists) repeats no vertex, so it uses at most V−1 edges. After pass i, every shortest path of ≤ i edges is locked in.
- Negative edges are fine — nothing is ever "sealed", so late discounts still land.
- The bonus: run one **extra pass (the V-th)**. If any edge still relaxes, some path keeps improving with more edges — only a **negative cycle** does that.
- Price: O(V·E). That is exactly why Dijkstra exists — but Bellman-Ford is the tool when weights go negative.`},{type:`code`,lang:`cpp`,title:`Bellman-Ford with negative-cycle detection`,code:`// edges: {u, v, w}. Empty result = negative cycle reachable from src.
vector<long long> bellmanFord(int n, vector<array<int,3>>& edges, int src) {
    const long long INF = 1e18;
    vector<long long> dist(n, INF);
    dist[src] = 0;
    for (int pass = 1; pass <= n - 1; pass++)   // V-1 passes
        for (auto& [u, v, w] : edges)           // relax EVERY edge
            if (dist[u] != INF && dist[u] + w < dist[v])
                dist[v] = dist[u] + w;
    for (auto& [u, v, w] : edges)               // the V-th pass
        if (dist[u] != INF && dist[u] + w < dist[v])
            return {};                          // still improving = neg cycle
    return dist;
}`,annotations:{6:`The invariant: after pass i, every shortest path using ≤ i edges is final. A shortest path has at most V−1 edges, so V−1 passes cover them all.`,8:`The INF guard: never relax FROM an unreached node — INF + w would masquerade as a real (huge) distance and can overflow.`,12:`An improvement on pass V means some path still gets shorter with more edges. Only a negative cycle can feed that forever.`},py:{code:`# edges: (u, v, w). Empty result = negative cycle reachable from src.
def bellmanFord(n: int, edges: list[tuple[int, int, int]], src: int) -> list[float]:
    INF = float('inf')
    dist = [INF] * n
    dist[src] = 0
    for _ in range(n - 1):                  # V-1 passes
        for u, v, w in edges:               # relax EVERY edge
            if dist[u] != INF and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
    for u, v, w in edges:                   # the V-th pass
        if dist[u] != INF and dist[u] + w < dist[v]:
            return []                       # still improving = neg cycle
    return dist`,annotations:{6:`The invariant: after pass i, every shortest path using ≤ i edges is final. A shortest path has at most V−1 edges, so V−1 passes cover them all. The pass counter is never read — hence _.`,8:`Never relax FROM an unreached node. Python is kinder than C++ here (inf + w is inf, so nothing overflows and nothing beats a real distance), but keep the guard: it states the intent, and it is required the moment you swap inf for a sentinel like 10**18.`,12:`An improvement on pass V means some path still gets shorter with more edges. Only a negative cycle can feed that forever.`}}},{type:`note`,md:`When do you actually reach for Bellman-Ford?

- **Negative edge weights** — the only single-source tool that survives them.
- **Negative-cycle detection** — currency arbitrage, "infinite discount loop" bugs.
- Edge list is all you have and V·E is affordable — the code is 10 lines with zero data structures.
- Early exit trick worth saying: if a full pass changes nothing, stop — already converged.
- Everything else (non-negative weights): Dijkstra, always.`},{type:`intuition`,title:`Floyd-Warshall: all pairs, three loops`,md:`Flight prices between all cities. Start with direct flights only. Now ask, one airport at a time: *"what gets cheaper if flights may stop over at airport k?"*

- DP state: after processing k, \`dist[i][j]\` = cheapest i→j route using only airports 0..k as **intermediate stops**.
- The update is one line: going through k either helps (\`dist[i][k] + dist[k][j]\`) or it doesn't.
- V stages × V² pairs = **O(V³)**. Fine up to n ≈ 400 — and that constraint is your hint to use it.
- Negative edges: handled. Negative cycle: any \`dist[i][i] < 0\` afterwards.
- The appeal is the size: no heap, no adjacency list, no visited array. Three loops on a matrix.`},{type:`code`,lang:`cpp`,title:`Floyd-Warshall, complete`,code:`// dist[i][j] = edge weight; 0 on the diagonal; INF (1e9) if no edge
for (int k = 0; k < n; k++)          // allow k as an intermediate stop
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]);`,annotations:{2:`k is the DP dimension, not a plain loop: it MUST be outermost. Each stage builds on the finished previous stage — move k inside and half-updated stages corrupt each other.`,5:`With int, pick INF = 1e9: INF + INF = 2·10⁹ still fits. If edges can be negative, also guard dist[i][k] < INF && dist[k][j] < INF so "unreachable + discount" cannot fake a path.`},py:{code:`# dist[i][j] = edge weight; 0 on the diagonal; float('inf') if no edge
for k in range(n):                   # allow k as an intermediate stop
    for i in range(n):
        for j in range(n):
            dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])`,annotations:{2:`k is the DP dimension, not a plain loop: it MUST be outermost. Each stage builds on the finished previous stage — move k inside and half-updated stages corrupt each other.`,5:`float('inf') retires the whole C++ sentinel problem: inf + inf is inf, never a wrapped-around fake shortcut, even with negative edges. Price: the matrix goes float. Want to stay integral? Use 10**9 and add the two "< INF" guards, exactly like the C++ pane.`}}},{type:`intuition`,title:`Union-Find (DSU): who is your boss?`,md:`Companies keep merging. Every employee points at a manager; follow the pointers up and you reach the CEO. Two people are in the same company iff they share a CEO.

- DSU stores a **parent forest**: \`find(x)\` walks parent pointers to the root — the set's representative. \`union(a, b)\` makes one root report to the other.
- Optimization 1, **path compression**: after meeting the CEO once, report to them directly — find repoints the whole walked path at the root.
- Optimization 2, **union by size** (or rank): the smaller tree hangs under the bigger root, so trees stay shallow.
- Together: amortized **O(α(n))** per operation — inverse Ackermann, ≤ 4 for any n that fits in the universe. Say "near-constant amortized", not "O(1)".
- The superpower: answers "are u and v connected?" **online**, edge by edge, with no traversal at all.`},{type:`visual`,component:`PointerBoxDiagram`,props:{title:`DSU: three unions, then one compressing find`,notice:`Watch the parent arrows. union redirects one root; find(4) flattens the whole path it walked.`,leftLabel:`parent[] pointers`,rightLabel:`elements`,frames:[{note:`Start: four singletons. Every element is its own parent — four one-node trees.`,stack:[{name:`parent[1]`,to:`n1`},{name:`parent[2]`,to:`n2`},{name:`parent[3]`,to:`n3`},{name:`parent[4]`,to:`n4`}],heap:[{id:`n1`,value:`1`,label:`root · size 1`},{id:`n2`,value:`2`,label:`root · size 1`},{id:`n3`,value:`3`,label:`root · size 1`},{id:`n4`,value:`4`,label:`root · size 1`}]},{note:`union(1, 2): both are roots, sizes tie — 2 attaches under 1. One tree of size 2.`,stack:[{name:`parent[1]`,to:`n1`},{name:`parent[2]`,to:`n1`},{name:`parent[3]`,to:`n3`},{name:`parent[4]`,to:`n4`}],heap:[{id:`n1`,value:`1`,label:`root · size 2`},{id:`n2`,value:`2`,label:`child of 1`},{id:`n3`,value:`3`,label:`root · size 1`},{id:`n4`,value:`4`,label:`root · size 1`}]},{note:`union(3, 4): same story — 4 attaches under 3. Two trees, size 2 each.`,stack:[{name:`parent[1]`,to:`n1`},{name:`parent[2]`,to:`n1`},{name:`parent[3]`,to:`n3`},{name:`parent[4]`,to:`n3`}],heap:[{id:`n1`,value:`1`,label:`root · size 2`},{id:`n2`,value:`2`,label:`child of 1`},{id:`n3`,value:`3`,label:`root · size 2`},{id:`n4`,value:`4`,label:`child of 3`}]},{note:`union(2, 4): find(2) = 1, find(4) = 3. Roots tie at size 2, so root 3 attaches under root 1. Note 4 still points at 3 — reaching the root from 4 now takes two hops.`,stack:[{name:`parent[1]`,to:`n1`},{name:`parent[2]`,to:`n1`},{name:`parent[3]`,to:`n1`},{name:`parent[4]`,to:`n3`}],heap:[{id:`n1`,value:`1`,label:`root · size 4`},{id:`n2`,value:`2`,label:`child of 1`},{id:`n3`,value:`3`,label:`child of 1`},{id:`n4`,value:`4`,label:`2 hops from root`}]},{note:`find(4): walks 4 → 3 → 1, then PATH COMPRESSION repoints 4 straight at the root. The next find(4) is one hop — the tree flattens itself as a side effect of being read.`,stack:[{name:`parent[1]`,to:`n1`},{name:`parent[2]`,to:`n1`},{name:`parent[3]`,to:`n1`},{name:`parent[4]`,to:`n1`}],heap:[{id:`n1`,value:`1`,label:`root · size 4`},{id:`n2`,value:`2`,label:`child of 1`},{id:`n3`,value:`3`,label:`child of 1`},{id:`n4`,value:`4`,label:`compressed`}]}]}},{type:`code`,lang:`cpp`,title:`DSU — the 15 lines to memorize`,code:`struct DSU {
    vector<int> parent, sz;
    DSU(int n) : parent(n), sz(n, 1) { iota(parent.begin(), parent.end(), 0); }
    int find(int x) {
        if (parent[x] == x) return x;
        return parent[x] = find(parent[x]);   // path compression
    }
    bool unite(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return false;             // already in one set
        if (sz[a] < sz[b]) swap(a, b);        // union by size
        parent[b] = a; sz[a] += sz[b];
        return true;
    }
};`,annotations:{6:`Path compression: on the way back from the recursion, every node on the walked path is re-pointed DIRECTLY at the root. Reading the structure flattens it.`,10:`find(a) == find(b) means edge {a, b} would close a cycle. Returning false here IS the answer to Redundant Connection.`,11:`Union by size: the smaller tree hangs under the bigger root. A node gets deeper only when its tree at least doubles — depth O(log n) even before compression.`},py:{code:`class DSU:
    def __init__(self, n: int):
        self.parent = list(range(n))   # every node starts as its own root
        self.size = [1] * n

    def find(self, x: int) -> int:
        if self.parent[x] == x:
            return x
        self.parent[x] = self.find(self.parent[x])   # path compression
        return self.parent[x]

    def unite(self, a: int, b: int) -> bool:
        a, b = self.find(a), self.find(b)
        if a == b:
            return False                             # already in one set
        if self.size[a] < self.size[b]:
            a, b = b, a                              # union by size
        self.parent[b] = a
        self.size[a] += self.size[b]
        return True`,annotations:{3:`list(range(n)) is std::iota — the whole constructor in one expression.`,9:`Path compression: on the way back from the recursion, every node on the walked path is re-pointed DIRECTLY at the root. C++ fuses assign-and-return; Python needs two lines. On a deep chain this can hit the 1000-frame recursion limit — the iterative find (walk to the root, then a second pass to re-point) is the version that never blows up.`,14:`find(a) == find(b) means edge (a, b) would close a cycle. Returning False here IS the answer to Redundant Connection.`,17:`Union by size, with the tuple swap standing in for std::swap. The smaller tree hangs under the bigger root, so a node gets deeper only when its tree at least doubles — depth O(log n) even before compression.`}}},{type:`note`,md:'The two named problems DSU one-lines:\n\n- **Redundant Connection**: a tree plus one extra edge — feed edges to `unite` in order; the first edge where it returns false is the one to remove. O(n α(n)).\n- **Number of Provinces**: start with `components = n`; every `unite` that returns true merges two groups — decrement. Final count is the answer. No DFS needed.\n- Interview one-liner on complexity: *"amortized inverse-Ackermann per operation — α(n) ≤ 4 for anything physical, so effectively constant, but I won\'t call it O(1)."*'},{type:`intuition`,title:`MST and the cut property, in plain words`,md:`Wire n villages with cable so everyone is connected, minimum total cost. The cheapest wiring is always a tree — a cycle always carries a removable edge — the **Minimum Spanning Tree**.

- **Cut property**: split the villages into two camps, *any* split. The cheapest cable crossing the split is always safe to buy.
- Why: any complete wiring must cross the split somewhere. If it crosses on a pricier cable, swap that one for the cheapest crossing cable — still connected, never costlier.
- **Kruskal**: sort all cables by price; buy each unless it links two already-connected villages (DSU answers that). Every purchase is the cheapest cable crossing *some* split → safe by the cut property.
- **Prim**: grow one connected blob from any village; repeatedly buy the cheapest cable leaving the blob. The split is {blob, everyone else} — same property, same guarantee.
- Two greedies, one theorem, identical total cost.`},{type:`code`,lang:`cpp`,title:`Kruskal — sort edges, let DSU veto cycles`,code:`long long kruskal(int n, vector<array<int,3>>& edges) {  // {w, u, v}
    sort(edges.begin(), edges.end());     // lightest first (w is [0])
    DSU dsu(n);
    long long cost = 0; int used = 0;
    for (auto& [w, u, v] : edges)
        if (dsu.unite(u, v)) {            // false = would close a cycle
            cost += w; used++;
        }
    return used == n - 1 ? cost : -1;     // -1 = graph not connected
}`,annotations:{2:`Weight stored FIRST in the array so plain sort works with no comparator — the pair-sorts-by-first trick again. The sort dominates: O(E log E).`,6:`This is why Kruskal and DSU are taught together: unite is simultaneously the cycle check and the merge. Reject = the edge is useless for spanning.`,9:`A spanning tree has exactly n−1 edges. Fewer accepted = the graph was never connected.`},py:{code:`def kruskal(n: int, edges: list[tuple[int, int, int]]) -> int:  # (w, u, v)
    edges.sort()                          # lightest first (w is [0])
    dsu = DSU(n)
    cost = used = 0
    for w, u, v in edges:
        if dsu.unite(u, v):               # False = would close a cycle
            cost += w
            used += 1
    return cost if used == n - 1 else -1  # -1 = graph not connected`,annotations:{2:`Tuples sort lexicographically, so storing the weight FIRST means a bare .sort() with no key= — the same trick as the C++ array. The sort dominates: O(E log E).`,6:`This is why Kruskal and DSU are taught together: unite is simultaneously the cycle check and the merge. Reject = the edge is useless for spanning.`,9:`A spanning tree has exactly n−1 edges. Fewer accepted = the graph was never connected.`}}},{type:`intuition`,title:`Prim: grow the blob`,md:`- Keep a heap of **edges leaving the current tree**, keyed on edge weight. Pop the cheapest, absorb its far endpoint, push that node's edges.
- It is Dijkstra's twin: same heap, same lazy-deletion skip, ONE changed line — the key is a single edge weight, not the total distance from a source.
- Binary-heap Prim: O(E log V). On dense graphs, the heapless O(V²) array version is actually faster.`},{type:`code`,lang:`cpp`,title:`Prim with a heap — Dijkstra with one line changed`,code:`long long prim(int n, vector<vector<pair<int,int>>>& adj) {  // adj[u]: {v, w}
    vector<bool> inTree(n, false);
    priority_queue<pair<int,int>, vector<pair<int,int>>,
                   greater<pair<int,int>>> pq;    // {edge weight, node}
    pq.push({0, 0});                              // start anywhere: node 0
    long long cost = 0; int taken = 0;
    while (!pq.empty() && taken < n) {
        auto [w, u] = pq.top(); pq.pop();
        if (inTree[u]) continue;                  // stale entry -- skip
        inTree[u] = true; cost += w; taken++;
        for (auto [v, wt] : adj[u])
            if (!inTree[v]) pq.push({wt, v});
    }
    return taken == n ? cost : -1;
}`,annotations:{4:`THE one-line difference from Dijkstra: the key is the single crossing-edge weight. Dijkstra keys on dist[u] + w — total path cost from the source.`,9:`The same lazy-deletion idiom: a node may sit in the heap several times with different entry costs; only its first (cheapest) pop counts.`},py:{code:`import heapq

def prim(n: int, adj: list[list[tuple[int, int]]]) -> int:  # adj[u]: (v, w)
    in_tree = [False] * n
    pq = [(0, 0)]                             # (edge weight, node); start at 0
    cost = taken = 0
    while pq and taken < n:
        w, u = heapq.heappop(pq)
        if in_tree[u]:
            continue                          # stale entry -- skip
        in_tree[u] = True
        cost += w
        taken += 1
        for v, wt in adj[u]:
            if not in_tree[v]:
                heapq.heappush(pq, (wt, v))
    return cost if taken == n else -1`,annotations:{5:`THE one-line difference from Dijkstra: the key is the single crossing-edge weight. Dijkstra keys on dist[u] + w — total path cost from the source.`,9:`The same lazy-deletion idiom: a node may sit in the heap several times with different entry costs; only its first (cheapest) pop counts.`}}},{type:`note`,md:`Spotting an MST question in the wild — the keywords are "connect ALL" + "minimum total cost", with no specific pair to route between:

- **Min Cost to Connect All Points** — points in a plane, Manhattan distances: a complete graph in disguise; run MST on it.
- Connecting Cities With Minimum Cost, network cabling, laying pipes — all MST verbatim.
- Asked "cheapest path from X to Y" instead? That is Dijkstra territory — a shortest-path tree and an MST are different trees.`},{type:`note`,md:`The decision table — recite before touching the keyboard:

- Unweighted shortest path → **BFS** (Graphs I).
- Non-negative weights, one source → **Dijkstra**, O(E log V).
- Negative edges, or "detect a profitable loop" → **Bellman-Ford**, O(V·E).
- All pairs, n ≤ ~400 → **Floyd-Warshall**, O(V³).
- "Connect everything, cheapest" → **MST**: Kruskal (edge list / sparse) or Prim (adjacency / dense).
- "Are u, v connected?" asked online, or grouping things → **DSU**, amortized O(α(n)).`}],quiz:[{question:`Graph: S→A costs 2, S→B costs 5, B→A costs −4. What does textbook Dijkstra (from S) report for A, and what is the truth?`,options:[{text:`Reports dist[A] = 2 — but the true shortest is 1 via S→B→A`,explanation:`Correct. A pops first (2 < 5) and gets sealed before the −4 discount via B is ever seen. Negative edges break the "pop = final" guarantee.`},{text:`Reports dist[A] = 1 — Dijkstra explores all paths eventually`,explanation:`Dijkstra is not exhaustive — that is its entire selling point. A is finalized at 2 before B is even processed.`},{text:`Reports dist[A] = −4`,explanation:`−4 is one edge's weight, not a path from S. No path from S to A costs −4.`}],correct:0},{question:"In the C++ Dijkstra template, what does `if (d > dist[u]) continue;` accomplish?",options:[{text:`It detects negative cycles`,explanation:`Cycle detection is Bellman-Ford's V-th pass. Dijkstra assumes non-negative edges and never checks for cycles.`},{text:`It prevents duplicate nodes from being pushed into the heap`,explanation:`Duplicates ARE pushed freely — look at the relax branch. The guard handles them at pop time, not push time.`},{text:`It discards stale heap entries — the lazy-deletion idiom that replaces decrease-key`,explanation:`Correct. std::priority_queue cannot update an entry, so a better relaxation pushes a new one. The old entry surfaces later with an outdated distance and this line throws it away.`}],correct:2},{question:`Why are exactly V−1 relaxation passes enough in Bellman-Ford (when no negative cycle exists)?`,options:[{text:`Because a graph can have at most V−1 edges`,explanation:`That is a tree. A general graph has up to V(V−1)/2 edges — the bound comes from path length, not edge count.`},{text:`A shortest path repeats no vertex, so it uses ≤ V−1 edges — and after pass i, every shortest path of ≤ i edges is final`,explanation:`Correct. Each pass extends the "locked in" horizon by one edge; V−1 edges is the longest any simple path can be.`},{text:`It is a tuned heuristic — more passes give better accuracy`,explanation:`Bellman-Ford is exact, not approximate. After V−1 passes nothing can improve unless a negative cycle exists.`}],correct:1},{question:`After V−1 passes, a V-th Bellman-Ford pass still relaxes some edge. What is the correct conclusion?`,options:[{text:`A negative cycle is reachable from the source`,explanation:`Correct. Only a negative cycle lets paths keep improving with more edges — distances would fall forever around it.`},{text:`The graph is disconnected`,explanation:`Disconnection shows up as nodes stuck at INF — they never relax at all, which is the opposite symptom.`},{text:`You need to run V more passes to converge`,explanation:`No finite number of passes converges on a negative cycle. The improvement is the proof, not a sign of slow convergence.`}],correct:0},{question:`In Floyd-Warshall, why must k be the OUTERMOST loop?`,options:[{text:`Cache performance — the memory access pattern is better`,explanation:`The issue is correctness, not speed. All three orders touch the same matrix.`},{text:`k is the DP stage — "intermediates 0..k allowed" — and each stage must be complete before the next builds on it`,explanation:`Correct. dist after stage k answers "shortest using only stops 0..k". Move k inside and updates mix half-finished stages, missing real paths.`},{text:`Any loop order gives the same result`,explanation:`It does not — with k innermost, a path needing two intermediates discovered "later" is never assembled. The stage structure is load-bearing.`}],correct:1},{question:`Complexity of m operations on a DSU with path compression AND union by size?`,options:[{text:`O(m log n) — each find walks a log-depth tree`,explanation:`log n is what union-by-size ALONE guarantees. Adding path compression drops it much further.`},{text:`O(m) exactly — every operation is O(1)`,explanation:`Near-true in practice, but not the theorem. The proven bound keeps a tiny α(n) factor — saying strictly O(1) is the trap.`},{text:`O(m α(n)) — inverse Ackermann, ≤ 4 for any physical n, effectively constant`,explanation:`Correct. α(n) grows so slowly it is ≤ 4 for n far beyond atoms in the universe. "Near-constant amortized" is the honest phrasing.`}],correct:2},{question:`During Kruskal, dsu.unite(u, v) returns false for an edge. What does that mean?`,options:[{text:`u and v are already connected — this edge would close a cycle, so skip it`,explanation:`Correct. Same root = same component = the edge adds cost but no connectivity. DSU is Kruskal's cycle detector.`},{text:`The edge weight is too heavy for the MST`,explanation:`DSU knows nothing about weights — the sort already handled weight order. The veto is purely about connectivity.`},{text:`The graph is disconnected`,explanation:`Connectivity is judged at the END: fewer than n−1 accepted edges. A false from unite is routine, not an error.`}],correct:0},{question:`The heap in Prim vs the heap in Dijkstra — the real difference?`,options:[{text:`Prim uses a max-heap, Dijkstra a min-heap`,explanation:`Both are min-heaps — both always want the cheapest thing next.`},{text:`Prim keys on the single edge weight crossing the frontier; Dijkstra keys on total distance from the source`,explanation:`Correct. One changed line, different theorem: cheapest connection (MST) vs cheapest journey (shortest path). The trees they build differ.`},{text:`There is no difference — they are the same algorithm`,explanation:`The code is eerily similar, which is the trap. Swap the keys and both answers become wrong.`}],correct:1}],interviewQuestions:[{question:`Why is Dijkstra's greedy choice safe — why can a node be finalized the moment it pops from the heap?`,answer:`When u pops with distance d, every other frontier candidate already costs ≥ d (min-heap invariant). Any undiscovered route to u must first pass through some frontier node — cost ≥ d — and then add more edges. With non-negative weights, adding edges never decreases cost, so no future route can beat d: u is final. Name the dependency out loud: this argument uses non-negativity exactly once, and that single use is what negative edges destroy. Complexity: O(E log V) with a binary heap.`,isCaseBased:!1},{question:`std::priority_queue has no decrease-key. How do you implement Dijkstra with it anyway, and what does that cost?`,answer:`Lazy deletion: when a node's distance improves, push a fresh {dist, node} entry and leave the old one in the heap. On pop, compare: if (d > dist[u]) continue — the entry is stale, skip it. Cost: the heap can hold O(E) entries instead of O(V), giving O(E log E); since log E ≤ 2 log V, that is still O(E log V) — same asymptotic class as a decrease-key heap, with far simpler code. Memory grows to O(E) worst case. Tradeoff summary: three extra lines versus implementing an indexed heap; interviews expect the lazy version.`,isCaseBased:!1},{question:`Case: your rideshare pricing graph gained "promo" edges with negative weights, and the shortest-path service (Dijkstra) now returns overpriced routes for some queries. Diagnose and fix.`,answer:`Diagnosis: Dijkstra's correctness proof needs non-negative edges. Concrete failure: S→A = 2, S→B = 5, B→A = −4 — Dijkstra seals A at 2, but S→B→A costs 1. Promo edges create exactly this: a cheap route revealed only after its endpoint is finalized. Fix options, in order: (1) Bellman-Ford, O(V·E) — handles negatives and detects negative cycles, which here would mean an infinite-discount loop, itself a pricing bug worth alerting on; (2) if the graph is a DAG, relax in topological order — O(V+E), negatives free; (3) for all-pairs on this graph, Johnson's algorithm: one Bellman-Ford to compute potentials, reweight to non-negative, then Dijkstra per source. State the cost jump honestly: V·E versus E log V is the price of negative edges.`,isCaseBased:!0},{question:`Bellman-Ford: state the loop invariant, why V−1 passes suffice, and the negative-cycle test.`,answer:`Invariant: after pass i, dist[] is correct for every vertex whose shortest path uses ≤ i edges — provable by induction, since pass i+1 relaxes the last edge of any (i+1)-edge shortest path whose prefix is already correct. A shortest path repeats no vertex (absent negative cycles), so ≤ V−1 edges, so V−1 passes finish the job. Detection: run pass V; any successful relaxation means some distance still improves with path length — impossible unless a negative cycle is reachable. Complexity O(V·E), space O(V). Practical touch: early-exit when a pass changes nothing.`,isCaseBased:!1},{question:`Case: given currency exchange rates, detect whether an arbitrage loop exists (trade around a cycle and end with more money than you started).`,answer:`Arbitrage means a cycle where the product of rates exceeds 1. Turn the product into a sum: take weights w = −log(rate). Then product(rates) > 1 ⇔ sum(−log rate) < 0 — a negative cycle. Build the currency graph with those weights and run Bellman-Ford: if the V-th pass still relaxes an edge, a negative cycle (arbitrage) exists. To output the loop, track parent pointers from the improving edge and walk back V steps to guarantee landing inside the cycle. Complexity O(V·E) with V = currencies, E = quoted pairs. This is THE canonical "why Bellman-Ford exists" story — worth telling unprompted.`,isCaseBased:!0},{question:`Floyd-Warshall: what exactly is the DP state, and when do you choose it over running Dijkstra from every vertex?`,answer:`State: dp[k][i][j] = shortest i→j path using only vertices 0..k as intermediates. Transition: the path either avoids k (dp[k−1][i][j]) or passes through k exactly once (dp[k−1][i][k] + dp[k−1][k][j]). The k layer can be updated in place, giving the three-loop V³ form with k outermost. Choose Floyd-Warshall when: all pairs are needed, V is small (≤ ~400), the graph is dense, or edges can be negative (negative cycle shows as dist[i][i] < 0). Choose Dijkstra × V — O(V·E log V) — for sparse non-negative graphs, where it is asymptotically far cheaper. Also fair to mention: FW is 5 lines and nearly impossible to get wrong under pressure.`,isCaseBased:!1},{question:`Explain DSU's two optimizations and give the honest complexity claim.`,answer:`Structure: a parent forest — find(x) follows parents to the root (the set representative); union links two roots. Optimization 1, path compression: find repoints every node it walked directly at the root, flattening the tree as a side effect of queries. Optimization 2, union by size/rank: attach the smaller tree under the larger root, so a node deepens only when its component doubles — depth O(log n) from this alone. Together, m operations cost O(m·α(n)) amortized, where α is the inverse Ackermann function — at most 4 for any input that fits in physical reality. The honest phrasing interviewers reward: "near-constant amortized, technically inverse-Ackermann, not literally O(1)".`,isCaseBased:!1},{question:`Solve Redundant Connection with DSU, and Number of Provinces while you are at it.`,answer:`Redundant Connection: the input is a tree plus one extra edge. Feed edges to unite() in input order; the first edge where unite returns false has both endpoints already connected — adding it closes the cycle, so it is the answer. One pass, O(n α(n)), no DFS, no adjacency list. Number of Provinces: start components = n; call unite for every friendship; each true return merges two groups, so decrement. The remaining count is the answer. Both illustrate DSU's niche: connectivity questions asked incrementally, where rerunning a traversal per edge would cost O(n·E).`,isCaseBased:!1},{question:`State the cut property in plain words and use it to justify Kruskal.`,answer:`Cut property: partition the vertices into two camps, any partition — the lightest edge crossing it belongs to some MST. Proof by exchange: take any spanning tree; it must cross the cut somewhere. If it crosses on a heavier edge, swap that edge for the lightest crossing one — the result is still spanning and no more expensive. Kruskal application: when Kruskal accepts an edge {u, v}, u's current component versus everything else forms a cut, and this edge is the lightest crossing it — every lighter edge was already processed and either lies inside a component or was rejected for closing a cycle. So every accepted edge is safe, and n−1 safe acceptances form an MST. Complexity: O(E log E) for the sort, DSU work is noise.`,isCaseBased:!1},{question:`Kruskal vs Prim — when do you pick which?`,answer:`Kruskal: input is already an edge list, the graph is sparse, or DSU is in play anyway — sort dominates at O(E log E), and the code is short given a DSU. Prim: adjacency-list input, or dense graphs — binary-heap Prim is O(E log V), and on truly dense graphs (E ≈ V²) the heapless O(V²) array version beats both by dropping the log. Both are correct by the same cut property, and when all edge weights are distinct the MST is unique, so they return the identical tree. One more differentiator worth saying: Kruskal processes global cheapest edges and may hold many fragments mid-run; Prim grows a single connected blob — useful when you need partial results to stay connected.`,isCaseBased:!1},{question:`Case: Min Cost to Connect All Points — 1000 points in a plane, edge cost = Manhattan distance. Interviewer: which MST algorithm, and what breaks first if you scale to 100k points?`,answer:`It is a complete graph in disguise: E = n(n−1)/2 ≈ 500k edges at n = 1000. Kruskal works — materialize and sort 500k edges, O(E log E) — but the cleaner fit is Prim in its O(V²) array form: keep minDist[v] = cheapest connection into the tree, do n rounds of "pick closest point, update the rest". That is ~10⁶ operations, O(n) extra memory, and no edge list at all. Dense graph → Prim's home turf; say that sentence. At 100k points, V² = 10¹⁰ breaks: you must stop materializing the complete graph and exploit geometry — for Manhattan distance there is a classic O(n log n) construction using sweeps over 8 octants (Euclidean analog: MST over the Delaunay triangulation). Naming that upgrade path, not coding it, is what the follow-up wants.`,isCaseBased:!0}],flashcards:[{front:`Dijkstra in one breath`,back:`Min-heap of {dist, node}; pop the cheapest — its distance is final; relax its edges. Non-negative weights only. O(E log V).`},{front:`Lazy deletion idiom (C++ Dijkstra/Prim)`,back:`No decrease-key in priority_queue → push duplicates; on pop: if (d > dist[u]) continue. Heap grows to O(E) → O(E log E) = O(E log V).`},{front:`Why negative edges break Dijkstra`,back:`Pop-and-seal assumes more edges never make a path cheaper. Counterexample: S→A 2, S→B 5, B→A −4 — A sealed at 2, truth is 1.`},{front:`Bellman-Ford recipe`,back:`Relax ALL edges, V−1 passes. Invariant: pass i finalizes shortest paths of ≤ i edges. O(V·E). Negative edges fine.`},{front:`Negative-cycle detection`,back:`One extra (V-th) Bellman-Ford pass: any edge still relaxing ⇒ negative cycle reachable. Arbitrage = negative cycle on −log(rate) weights.`},{front:`Floyd-Warshall`,back:`All-pairs DP: dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]) with k OUTERMOST — k = "intermediates allowed so far". O(V³), n ≤ ~400, negatives OK.`},{front:`DSU optimizations + honest complexity`,back:`Path compression (find repoints walked path at root) + union by size (small under big) → amortized O(α(n)), inverse Ackermann ≤ 4. Say "near-constant", not O(1).`},{front:`unite(u, v) returns false →`,back:`Same root already: the edge closes a cycle. First such edge = Redundant Connection. Provinces: components = n − successful unites.`},{front:`Cut property, plain words`,back:`Split the vertices any way — the lightest edge crossing the split is always MST-safe (swap argument). Legalizes both Kruskal and Prim.`},{front:`Shortest-path / connectivity tool selector`,back:`Unweighted → BFS. Non-negative → Dijkstra O(E log V). Negatives/cycle check → Bellman-Ford O(VE). All pairs, small n → Floyd-Warshall O(V³). Connect-all-cheapest → MST. Online connectivity → DSU.`}],mindmapMarkdown:`- Graphs II: Dijkstra, Bellman-Ford, DSU & MST
  - Dijkstra
    - min-heap of {dist, node}
    - pop cheapest = final, then relax
    - lazy deletion: skip d > dist[u]
    - O(E log V), non-negative only
    - Network Delay Time
  - Negative edges
    - break the pop-and-seal proof
    - S→A 2, S→B 5, B→A −4
  - Bellman-Ford
    - relax ALL edges, V−1 passes
    - pass i fixes ≤ i-edge paths
    - V-th pass improves ⇒ neg cycle
    - O(V·E) · arbitrage via −log(rate)
  - Floyd-Warshall
    - "allow intermediate k" DP
    - k outermost, O(V³)
    - all pairs, n ≤ ~400
  - DSU
    - parent forest, find → root
    - path compression + union by size
    - amortized O(α(n)) ≈ constant
    - Redundant Connection · Provinces
  - MST
    - cut property: lightest crossing edge is safe
    - Kruskal: sort + DSU veto, O(E log E)
    - Prim: grow blob, heap on edge weight
    - Min Cost to Connect All Points`};export{e as default};