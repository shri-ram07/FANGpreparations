import type { Module } from '../types'

const m: Module = {
  id: 'dsa-l2-graphs-traversal',
  subjectId: 'dsa',
  level: 2,
  title: 'Graphs I: BFS, DFS, Components, Cycles & Topo Sort',
  whyItMatters:
    'Graphs feel like the boss level, but the secret is embarrassing: interviews test exactly two moves — BFS and DFS — wearing different costumes. Islands, course schedules, word ladders, deadlock detection: all the same two traversals. Learn the two moves and their costumes, and a third of LeetCode "medium" collapses into template-filling.',
  estMinutes: 55,
  sections: [
    {
      type: 'note',
      md: 'Snippet convention: graph snippets assume `#include <bits/stdc++.h>` and `using namespace std;` — standard interview shorthand. Nodes are `0..n-1`, `n` = node count, `m` = edge count.',
    },
    {
      type: 'intuition',
      title: 'A graph is a contact list, not a picture',
      md: `Forget the circles-and-arrows drawing. In code, a graph is just: **for each node, who are its neighbors?** That is a contact list.

- **Adjacency list** — \`vector<vector<int>> adj\`: \`adj[u]\` holds u's neighbors. Space **O(n + m)**. Iterating u's neighbors costs exactly deg(u) — you touch only edges that exist.
- **Adjacency matrix** — \`n × n\` grid of 0/1. Space **O(n²)** whether edges exist or not. "Is u→v an edge?" is O(1), but visiting u's neighbors costs O(n) even if u has 2 friends.
- Real interview graphs are **sparse** (m ≈ n, not n²): 10⁵ nodes with a matrix = 10¹⁰ cells = dead before you start.
- Default: adjacency list. Always. Say it before the interviewer asks.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Edge list in, adjacency list out — the 6-line ritual',
      code: `int n = 5;                                  // nodes are 0..4
vector<pair<int,int>> edges = {{0,1},{0,2},{1,3},{2,4}};

vector<vector<int>> adj(n);                 // n empty neighbor lists
for (auto [u, v] : edges) {
    adj[u].push_back(v);
    adj[v].push_back(u);                    // undirected: store BOTH directions
}
// adj[0]={1,2}  adj[1]={0,3}  adj[2]={0,4}  adj[3]={1}  adj[4]={2}
// directed graph? delete line 7 -- that is the entire difference`,
      annotations: {
        4: 'vector of vectors, sized n up front. Space O(n + m). Every graph problem starts with this line.',
        7: 'An undirected edge is two directed edges. Forgetting this line is the #1 "my BFS finds nothing" bug.',
      },
    },
    {
      type: 'note',
      md: 'When the matrix DOES win: the graph is **dense** (m close to n²), n is small (≤ ~1000), and you ask "is u→v an edge?" constantly — Floyd–Warshall all-pairs shortest paths is the classic case. Everywhere else, list.',
    },
    {
      type: 'intuition',
      title: 'BFS: the ripple in the pond',
      md: `Drop a stone where the source node is. The ripple hits everything **1 edge away**, then everything **2 edges away**, then 3 — rings, in order, never skipping.

- The engine is a **queue** (FIFO): you finish ring k completely before anything from ring k+1 gets processed, because ring-k nodes entered the queue first.
- That ordering is the whole shortest-path proof: when v is discovered from u, v's distance is dist(u) + 1, and **no shorter route can appear later** — later means an equal or bigger ring, never a smaller one.
- This only works **unweighted** (every edge costs 1). Weighted edges break the rings — that is Dijkstra's job, next module.
- A \`visited\` mark stops the ripple from bouncing back inward.
- In the visual below, run BFS and watch the queue readout: nodes enter in ring order, like a wave front frozen mid-splash.`,
    },
    { type: 'visual', component: 'GraphTraversal', props: { algorithm: 'bfs' } },
    {
      type: 'code',
      lang: 'cpp',
      title: 'BFS — the template you will type 100 times',
      code: `vector<int> bfs(int src, vector<vector<int>>& adj) {
    int n = adj.size();
    vector<int> dist(n, -1);           // -1 = never seen
    queue<int> q;
    dist[src] = 0;
    q.push(src);
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (int v : adj[u])
            if (dist[v] == -1) {       // dist doubles as the visited array
                dist[v] = dist[u] + 1; // v sits one ring farther out than u
                q.push(v);
            }
    }
    return dist;                       // fewest edges src->v, or -1 unreachable
}`,
      annotations: {
        3: 'One array, two jobs: dist[v] == -1 means "not visited". No separate visited vector needed.',
        10: 'Mark visited when PUSHING, not when popping. Mark-on-pop lets the same node enter the queue many times — O(m)-sized queue blow-ups and TLE at n = 1e5.',
        11: 'The shortest-path line. Correct because the queue processes ring k fully before ring k+1 — a shorter path to v would have discovered v earlier.',
      },
    },
    {
      type: 'intuition',
      title: 'DFS: the maze runner with a ball of string',
      md: `BFS floods. DFS **commits**: pick a corridor, walk it to the dead end, backtrack one step, try the next corridor. The ball of string is the call stack — it remembers the way back.

- Recursive DFS is 5 lines; the runtime's call stack does the bookkeeping for free.
- Iterative DFS swaps the call stack for an explicit \`stack<int>\` — same order of exploration (roughly), zero recursion.
- Why bother with iterative? **Stack overflow.** Default stacks die around 10⁴–10⁵ deep frames; a path graph (one long chain) or a 1000×1000 grid goes deeper. Recursive DFS crashing with no error message on big inputs is a rite of passage.
- In the visual below, switch to DFS and watch the **stack** readout instead: it grows as the runner dives, shrinks as it backtracks — depth breathing in and out, nothing like BFS's steady ring-order queue.`,
    },
    { type: 'visual', component: 'GraphTraversal', props: { algorithm: 'dfs' } },
    {
      type: 'code',
      lang: 'cpp',
      title: 'DFS both ways — recursive and stack-based',
      code: `void dfs(int u, vector<vector<int>>& adj, vector<bool>& vis) {
    vis[u] = true;                 // mark on ENTRY, before recursing
    for (int v : adj[u])
        if (!vis[v])
            dfs(v, adj, vis);      // the call stack remembers the way back
}

void dfsIter(int src, vector<vector<int>>& adj, vector<bool>& vis) {
    stack<int> st;
    st.push(src);
    while (!st.empty()) {
        int u = st.top(); st.pop();
        if (vis[u]) continue;      // a node can be pushed twice -- skip repeats
        vis[u] = true;
        for (int v : adj[u])
            if (!vis[v]) st.push(v);
    }
}`,
      annotations: {
        2: 'Mark before recursing, or two branches can both enter the same node and you loop forever.',
        5: 'Each recursive frame = one unit of string in the maze. Depth = longest simple path from src — the stack-overflow risk lives here.',
        13: 'The iterative version tolerates duplicates in the stack and filters them on pop. Simpler than preventing them, and still O(n + m).',
      },
    },
    {
      type: 'intuition',
      title: 'Connected components: count the friend circles',
      md: `"How many separate friend circles in this school?" One traversal from any student finds their WHOLE circle — everyone reachable. Circles the traversal never touched are still unvisited.

- So: loop over all nodes; every time you meet an **unvisited** one, that is a brand-new component — count it and traverse from it.
- The traversal (BFS or DFS, either works) eats the whole component, marking everyone.
- Total cost stays **O(n + m)**: every node and edge is touched exactly once across ALL the calls, not per call.
- This wrapper loop is mandatory in ANY graph problem where the graph might be disconnected — forget it and you silently process only the first component.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Number of Connected Components',
      code: `int countComponents(int n, vector<vector<int>>& adj) {
    vector<bool> vis(n, false);
    int comps = 0;
    for (int i = 0; i < n; i++)
        if (!vis[i]) {             // still unvisited = a brand-new circle
            comps++;
            dfs(i, adj, vis);      // one call eats the WHOLE component
        }
    return comps;
}`,
      annotations: {
        5: 'The pattern: outer loop finds component starters, inner traversal claims the rest. Memorize the shape.',
        7: 'BFS works identically here. Component counting does not care which traversal you use.',
        9: 'O(n + m) total — the loop looks like it multiplies, but each node is traversed once ever, thanks to vis.',
      },
    },
    {
      type: 'intuition',
      title: 'Grids ARE graphs: Number of Islands',
      md: `Nobody hands you \`adj\` in grid problems — because it is implicit. Each cell is a node; its edges go to the 4 neighbors (up/down/left/right). "Number of Islands" is literally \`countComponents\` on that hidden graph.

- The traversal here is called **flood fill**: from one land cell, spread to all connected land.
- The \`dr/dc\` direction-arrays trick replaces four copy-pasted if-blocks with one loop. Diagonals allowed? Extend the arrays to 8 entries — the code does not change.
- **Visited-in-place trick**: instead of a separate visited grid, overwrite visited land \`'1'\` → water \`'0'\`. Sunk land can never be counted twice. Zero extra memory.
- Say the caveat out loud: this mutates the input — if the interviewer wants it intact, use a real visited grid (or restore afterwards).`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Number of Islands — flood fill, count the starts',
      code: `int numIslands(vector<vector<char>>& g) {
    int rows = g.size(), cols = g[0].size(), islands = 0;
    int dr[4] = {-1, 1, 0, 0};
    int dc[4] = {0, 0, -1, 1};                // up, down, left, right
    function<void(int, int)> sink = [&](int r, int c) {
        g[r][c] = '0';                        // visited-in-place: land -> water
        for (int k = 0; k < 4; k++) {
            int nr = r + dr[k], nc = c + dc[k];
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && g[nr][nc] == '1')
                sink(nr, nc);
        }
    };
    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++)
            if (g[r][c] == '1') {             // untouched land = a new island
                islands++;
                sink(r, c);                   // flood the whole island away
            }
    return islands;                           // O(rows*cols): each cell dies once
}`,
      annotations: {
        5: 'A recursive lambda needs std::function (a plain auto lambda cannot name itself). A free helper function works too — pick one and move on.',
        6: 'Sink BEFORE exploring neighbors — same "mark on entry" rule as DFS. This line IS the visited check.',
        9: 'Bounds check first, then the land check. Grid problems live and die on this one if-condition.',
        15: 'Identical shape to countComponents: unvisited starter → count → traverse. Grids are graphs.',
      },
    },
    {
      type: 'intuition',
      title: 'Cycle detection, part 1: undirected — the parent trick',
      md: `Walking an undirected graph, every neighbor v of u falls in one of three buckets:

- **Unvisited** — recurse into it. Normal.
- **Visited, and it is my parent** — of course: the edge I just walked in on points back. Not a cycle, just the same edge seen from the other side.
- **Visited, and NOT my parent** — someone I have already met, reachable by a *different* route. Two routes to one node = **cycle**.
- So DFS carries one extra argument: the node it came from. One \`v != parent\` check does everything.
- Caveat you should volunteer: parallel edges and self-loops need extra care — the parent trick assumes a simple graph.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Undirected cycle detection — DFS with parent',
      code: `bool hasCycle(int u, int parent, vector<vector<int>>& adj, vector<bool>& vis) {
    vis[u] = true;
    for (int v : adj[u]) {
        if (!vis[v]) {
            if (hasCycle(v, u, adj, vis)) return true;
        } else if (v != parent) {
            return true;           // visited, and NOT where I came from: cycle
        }
    }
    return false;
}
// caller: for every unvisited i: if (hasCycle(i, -1, adj, vis)) ...`,
      annotations: {
        6: 'The whole algorithm is this else-if. Visited neighbor that is not the immediate parent = a second route exists.',
        12: 'Component loop again — a cycle might hide in a component your first DFS never reached. Root gets parent -1.',
      },
    },
    {
      type: 'intuition',
      title: 'Cycle detection, part 2: directed needs three colors',
      md: `Try the parent trick on a directed graph and it lies to you. Take edges 0→1, 0→2, 1→3, 2→3 (a diamond). DFS visits 3 via 1; later, 2 also points at the already-visited 3. Not the parent → "cycle!" — but there is no cycle. You cannot drive 2→3→ back to 2; the arrows do not allow a round trip.

- "Visited" is too crude for directed graphs. What matters is: visited **on the current path**, or visited-and-finished long ago?
- Three colors: **white** = untouched · **gray** = on the recursion stack right now (the path under your feet) · **black** = fully explored, provably cycle-free.
- An edge into a **gray** node points back into your own current path — a genuine round trip. Cycle.
- An edge into a **black** node is harmless — that region was finished and contains no way back.
- The diamond above: when 2 examines 3, 3 is black, not gray. No false alarm.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Directed cycle detection — white / gray / black',
      code: `// color: 0 white (untouched) · 1 gray (on current path) · 2 black (done)
bool hasCycleDir(int u, vector<vector<int>>& adj, vector<int>& color) {
    color[u] = 1;                          // entering: u joins the current path
    for (int v : adj[u]) {
        if (color[v] == 1) return true;    // edge INTO the current path: cycle
        if (color[v] == 0 && hasCycleDir(v, adj, color)) return true;
    }
    color[u] = 2;                          // leaving: fully explored, harmless
    return false;
}`,
      annotations: {
        3: 'Gray = "the recursion stack passes through here". Some people literally call this array onStack.',
        5: 'Gray hit = back edge = cycle. Black hit falls through both ifs — correctly ignored.',
        8: 'Painting black on exit is what the parent trick lacks. Without it, every cross edge to a finished node is a false positive.',
      },
    },
    {
      type: 'intuition',
      title: 'Topological sort: the getting-dressed order',
      md: `Socks before shoes, shirt before jacket. A topological order lines up nodes so **every arrow points forward** — each node appears after all its prerequisites. Only possible on a DAG (directed acyclic graph — directed, no cycles): socks-need-shoes-need-socks has no valid order.

- The canonical interview wrapper: **Course Schedule** (LeetCode 207/210). Courses = nodes, prerequisite pairs = edges. "Can you finish all courses?" = is there a topo order (no cycle)? "Give an order" = print one.
- Way 1 — **Kahn's algorithm** (BFS flavor): repeatedly take a course with **indegree 0** (no unmet prerequisites), "complete" it, decrement its dependents.
- Kahn's detects cycles for free: nodes trapped in a cycle never reach indegree 0, so the output comes up short — \`count < n\` = cycle.
- Way 2 — **DFS postorder, reversed**: push each node AFTER exploring everything it points to, then reverse.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Kahn\'s algorithm = Course Schedule II, solved',
      code: `vector<int> findOrder(int n, vector<vector<int>>& adj) {
    vector<int> indeg(n, 0);
    for (int u = 0; u < n; u++)
        for (int v : adj[u]) indeg[v]++;    // count prerequisites per course
    queue<int> q;
    for (int i = 0; i < n; i++)
        if (indeg[i] == 0) q.push(i);       // zero prereqs: available right now
    vector<int> order;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        order.push_back(u);
        for (int v : adj[u])
            if (--indeg[v] == 0) q.push(v); // u done -> v's last prereq cleared?
    }
    if ((int)order.size() < n) return {};   // stuck nodes = cycle: no valid order
    return order;                           // one valid course order
}`,
      annotations: {
        4: 'indeg[v] = how many arrows point AT v = unmet prerequisites. Edge u->v reads "u before v".',
        7: 'Several zeros may coexist — any of them is a legal next course. That is why topo orders are usually not unique.',
        13: 'The heartbeat of Kahn\'s: completing u peels one prerequisite off each dependent. Hitting zero unlocks it.',
        15: 'Cycle detection for free. Nodes on a cycle wait forever for each other — none ever reaches indegree 0. Course Schedule I is just: return order.size() == n.',
      },
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Topo sort, way 2 — DFS postorder, reversed',
      code: `void dfsTopo(int u, vector<vector<int>>& adj, vector<bool>& vis, vector<int>& out) {
    vis[u] = true;
    for (int v : adj[u])
        if (!vis[v]) dfsTopo(v, adj, vis, out);
    out.push_back(u);              // POSTorder: u lands after everything it needs done
}

vector<int> topoDFS(int n, vector<vector<int>>& adj) {
    vector<bool> vis(n, false);
    vector<int> out;
    for (int i = 0; i < n; i++)
        if (!vis[i]) dfsTopo(i, adj, vis, out);
    reverse(out.begin(), out.end());   // reverse postorder = topological order
    return out;                        // valid ONLY if a cycle check passed first
}`,
      annotations: {
        5: 'The one load-bearing line: u is appended only after every node it points to is already in out. Reversed, u precedes them all.',
        13: 'Forgetting the reverse is the classic bug — unreversed postorder is exactly backwards.',
        14: 'Unlike Kahn\'s, this produces a confident-looking "order" even on cyclic graphs. Pair it with the three-color check, or use Kahn\'s and get detection built in.',
      },
    },
    {
      type: 'intuition',
      title: 'Bipartite check: two teams, no traitors',
      md: `Split all nodes into two teams so that every edge crosses teams — no edge inside a team. Possible? The graph is **bipartite**. (Real costume: "match interns to mentors", "can these couples be seated at two tables".)

- Test by **2-coloring with BFS**: color the start node 0; every neighbor gets color 1; their neighbors get 0; alternate forever.
- If an edge ever connects two same-colored nodes — impossible. And the reason is always the same: an **odd cycle**.
- Why odd: walking a cycle alternates colors 0,1,0,1,… An even cycle arrives back on the opposite color — consistent. An odd cycle arrives back demanding the start node be BOTH colors. Contradiction.
- Theorem worth quoting: bipartite ⟺ no odd cycle.
- Disconnected graphs: color every component — same outer loop as component counting.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Bipartite via BFS 2-coloring',
      code: `bool isBipartite(int n, vector<vector<int>>& adj) {
    vector<int> color(n, -1);              // -1 uncolored, else team 0 or 1
    for (int s = 0; s < n; s++) {
        if (color[s] != -1) continue;      // already colored by an earlier BFS
        color[s] = 0;
        queue<int> q;
        q.push(s);
        while (!q.empty()) {
            int u = q.front(); q.pop();
            for (int v : adj[u]) {
                if (color[v] == -1) {
                    color[v] = 1 - color[u];   // neighbor takes the OTHER team
                    q.push(v);
                } else if (color[v] == color[u]) {
                    return false;              // same-team edge: odd cycle exists
                }
            }
        }
    }
    return true;
}`,
      annotations: {
        4: 'The component loop, third appearance. Each component gets colored independently — a free choice of which team starts.',
        12: '1 - color[u] flips 0<->1. The alternation IS the algorithm.',
        14: 'The contradiction detector. The edge u-v plus the two equal colors traces back to an odd cycle through u and v.',
      },
    },
    {
      type: 'note',
      md: `The cost sheet — everything in this module is the same price:

- BFS, DFS, components, flood fill, both cycle detectors, both topo sorts, bipartite: **O(n + m)** time, O(n) extra space (grid: O(rows·cols)).
- Choosing BFS vs DFS: need **shortest path / nearest / fewest steps** (unweighted) → BFS, no debate. Need **any full exploration** (components, cycles, flood fill) → either; DFS is less code. Deep graphs (chains, big grids) with recursion → iterative, or BFS.
- Topo sort: Kahn's when you also want cycle detection or level-by-level processing; DFS postorder when you are already DFS-ing anyway.`,
    },
  ],
  quiz: [
    {
      question: 'A graph has n = 10⁵ nodes and m = 2×10⁵ edges. Why is an adjacency matrix a non-starter?',
      options: [
        { text: 'Matrix lookups are O(log n)', explanation: 'Matrix edge lookups are O(1) — speed of lookup is its one strength. The problem is elsewhere.' },
        { text: 'It needs n² = 10¹⁰ cells — roughly 10 GB for a graph whose real data is 2×10⁵ edges', explanation: 'Correct. O(n²) space regardless of how few edges exist. Sparse graph + matrix = memory death before the first query.' },
        { text: 'Matrices cannot represent directed graphs', explanation: 'They represent directed graphs fine (just drop the symmetry). Space is the killer.' },
        { text: 'BFS does not work on matrices', explanation: 'BFS works — each neighbor scan just costs O(n) instead of O(deg). Slower, but the fatal issue is the 10¹⁰ cells.' },
      ],
      correct: 1,
    },
    {
      question: 'Why does BFS find shortest paths in an UNWEIGHTED graph?',
      options: [
        { text: 'It visits fewer nodes than DFS', explanation: 'Both visit every reachable node once — O(n + m) each. Visit count is not the reason.' },
        { text: 'The queue processes all nodes at distance k before ANY node at distance k+1, so the first discovery of v is via a shortest route', explanation: 'Correct — the rings argument. FIFO order means no shorter path can show up later; later = same or farther ring.' },
        { text: 'It marks nodes visited, so paths never repeat nodes', explanation: 'DFS also marks visited and its first arrival can be wildly longer. Marking prevents revisits, not long paths.' },
        { text: 'It works for weighted graphs too, so unweighted is a special case', explanation: 'Backwards — a heavy edge inside an early ring breaks the ring logic entirely. Weighted needs Dijkstra.' },
      ],
      correct: 1,
    },
    {
      question: 'Your BFS marks nodes visited when POPPING them instead of when pushing. What actually goes wrong?',
      options: [
        { text: 'Nothing — the answers come out the same', explanation: 'Distances happen to survive, but the queue does not: the same node enters many times before its first pop marks it.' },
        { text: 'The same node can be enqueued once per incoming edge — the queue balloons toward O(m) and big inputs TLE or MLE', explanation: 'Correct. Every neighbor that sees v before v is popped pushes v again. Dense test cases turn this into a blow-up. Mark on push.' },
        { text: 'It becomes DFS', explanation: 'The container decides BFS vs DFS (queue vs stack), not the marking moment.' },
        { text: 'It infinite-loops', explanation: 'It terminates — pops still mark eventually. It just does massively redundant work first.' },
      ],
      correct: 1,
    },
    {
      question: 'Directed edges: 0→1, 0→2, 1→3, 2→3. You run UNDIRECTED cycle detection (visited + parent check). What happens?',
      options: [
        { text: 'It correctly reports no cycle', explanation: 'It reports a cycle that does not exist. When 2 examines 3, 3 is visited and is not 2\'s parent — false alarm.' },
        { text: 'It falsely reports a cycle — 3 is visited via 1, then 2 sees visited-non-parent 3, but no round trip exists', explanation: 'Correct. In directed graphs a visited non-parent may be a harmless cross edge. You need gray (on current path) vs black (finished) — the three colors.' },
        { text: 'It crashes on directed input', explanation: 'It runs fine mechanically — it just answers the wrong question.' },
        { text: 'It misses real cycles', explanation: 'The parent trick over-reports on directed graphs (false positives), it does not under-report here.' },
      ],
      correct: 1,
    },
    {
      question: 'Kahn\'s algorithm on 9 nodes finishes with order.size() == 7. What do you know?',
      options: [
        { text: 'Two nodes were unreachable from the start node', explanation: 'Kahn\'s has no start node — every indegree-0 node is seeded. Reachability is not the issue.' },
        { text: 'The graph has at least one cycle, and the 2 missing nodes are on or behind it — their indegree never reached 0', explanation: 'Correct. Nodes in a cycle wait on each other forever. count < n is Kahn\'s built-in cycle detector — this IS Course Schedule I.' },
        { text: 'The queue was popped in the wrong order', explanation: 'Any pop order of indegree-0 nodes is valid — order choice changes WHICH valid answer you get, never the count.' },
        { text: 'You forgot to reverse the output', explanation: 'Reversing belongs to the DFS-postorder method. Kahn\'s output is already forward.' },
      ],
      correct: 1,
    },
    {
      question: '"Can you finish all courses given these prerequisite pairs?" (Course Schedule I). The question is really asking…',
      options: [
        { text: 'Whether the prerequisite graph is connected', explanation: 'Disconnected is fine — unrelated courses just have no constraints between them.' },
        { text: 'Whether the directed prerequisite graph has a cycle — no cycle means a valid order exists', explanation: 'Correct. Topo order exists ⟺ DAG. Answer with Kahn\'s (order.size() == n) or DFS three-color.' },
        { text: 'The shortest path from the first course to the last', explanation: 'No distances involved — only whether a consistent ordering exists.' },
        { text: 'Whether the graph is bipartite', explanation: 'Bipartite is about 2-coloring undirected graphs — different costume, different question.' },
      ],
      correct: 1,
    },
    {
      question: 'During BFS 2-coloring, you find an edge whose endpoints have the SAME color. What does that prove?',
      options: [
        { text: 'The graph is disconnected', explanation: 'Disconnection is handled by restarting BFS per component — it never causes a same-color edge.' },
        { text: 'The graph contains an odd-length cycle, so it is not bipartite', explanation: 'Correct. Colors alternate along any walk; only a cycle of odd length forces a node to need both colors. Bipartite ⟺ no odd cycle.' },
        { text: 'The graph has an even cycle', explanation: 'Even cycles are the harmless ones — alternation comes back consistent (0,1,0,1 arrives back opposite).' },
        { text: 'You started BFS from the wrong node', explanation: 'Start choice only flips team labels. Bipartiteness is a property of the graph, not the starting point.' },
      ],
      correct: 1,
    },
    {
      question: 'Complexity of Number of Islands on an R×C grid via flood fill?',
      options: [
        { text: 'O(R·C · islands)', explanation: 'Feels right, is wrong: sunk cells (turned to water) are never re-entered, so islands do not multiply the cost.' },
        { text: 'O(R·C)', explanation: 'Correct. Each cell is sunk at most once and scanned by the outer loop once — constant work per cell overall.' },
        { text: 'O((R·C)²)', explanation: 'That would need each fill to rescan the whole grid. The visited-in-place trick is exactly what prevents this.' },
        { text: 'O(R + C)', explanation: 'You must at least look at every cell — R·C of them.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Adjacency list vs adjacency matrix — give the full tradeoff and a case where the matrix is the right call.',
      answer:
        'List: O(n + m) space, iterating u\'s neighbors costs deg(u), edge-existence check costs O(deg(u)). Matrix: O(n²) space always, O(1) edge check, but scanning u\'s neighbors costs O(n) even for isolated nodes. Interview graphs are sparse (m ≈ n), so the list wins by default — at n = 10⁵ a matrix is 10¹⁰ cells and unallocatable. Matrix wins when the graph is dense, n is small (≤ ~1000), and edge queries dominate: Floyd–Warshall all-pairs shortest paths is the textbook case, since its triple loop reads "is there an edge/path u→v" constantly.',
      isCaseBased: false,
    },
    {
      question: 'Prove, not just state: why does BFS give shortest paths in unweighted graphs?',
      answer:
        'Invariant: the queue only ever contains nodes from at most two consecutive rings (distance k and k+1), in ring order. Induction: initially only the source (ring 0). When a ring-k node u is popped, every neighbor it discovers gets distance k+1 and joins behind any remaining ring-k nodes. So all of ring k is processed before any of ring k+1 — FIFO guarantees it. Therefore when v is first discovered, the route found has the minimum possible edge count: any other route would have discovered v from an equal-or-earlier ring, i.e. no later. This breaks the moment edges have weights — a "short" 2-edge path can cost more than a "long" 5-edge one — which is exactly the gap Dijkstra fills.',
      isCaseBased: false,
    },
    {
      question: 'Case: your BFS solution passes small tests but MLEs (memory limit) at n = 10⁵ on a dense graph. The code looks correct. Interviewer: "walk me through your visited logic."',
      answer:
        'Prime suspect: marking visited on POP instead of on PUSH. With mark-on-pop, every neighbor that scans v before v is popped enqueues v again — a node with 1000 incoming edges can sit in the queue 1000 times, so the queue grows toward O(m) instead of O(n). Fix: set visited (or dist) at push time, so a node can enter the queue exactly once. Same complexity class on paper for time, but the constant and the memory collapse back to O(n) queue size. This is the single most common "correct-looking BFS that dies at scale" bug; the fingerprint is small-tests-pass, big-dense-tests-MLE/TLE.',
      isCaseBased: true,
    },
    {
      question: 'Case: your recursive DFS crashes with no error message on a test with n = 10⁶ nodes forming one long chain. What happened and what do you do?',
      answer:
        'Stack overflow. Each recursive call adds a frame; a chain graph recurses n deep, and default thread stacks die around 10⁴–10⁵ frames — the process is killed before any exception can be thrown, hence the silent crash. Same trap on big grids (a 1000×1000 all-land grid can flood-fill 10⁶ deep). Fixes, in order: (1) rewrite with an explicit stack<int> — same traversal, heap-backed, no depth limit; (2) if the problem allows it, use BFS instead — the queue lives on the heap too; (3) mention but do not rely on raising the stack limit. The conversion is mechanical: push start, loop pop-mark-push-neighbors, tolerate duplicates by checking visited at pop.',
      isCaseBased: true,
    },
    {
      question: 'Solve Number of Islands. Then two follow-ups: the input grid must not be modified; and islands connect diagonally too.',
      answer:
        'Base: grids are implicit graphs — cells are nodes, 4-direction neighbors are edges. Loop all cells; each unvisited land cell is a new island: count it and flood fill (DFS/BFS) the whole island, marking cells visited by overwriting \'1\'→\'0\' in place. O(R·C) time — each cell is sunk once — O(1) extra space beyond recursion. Follow-up 1: replace the in-place overwrite with a vector<vector<bool>> visited — costs O(R·C) space, or restore the grid after counting if mutation-during is acceptable. Follow-up 2: extend dr/dc from 4 entries to 8 — the direction-array pattern means zero structural change, which is precisely why you write it that way instead of four hardcoded ifs.',
      isCaseBased: false,
    },
    {
      question: 'Why does the parent trick detect cycles in undirected graphs but fail on directed graphs? What replaces it?',
      answer:
        'Undirected: a visited neighbor that is not your immediate parent proves a second route to that node exists — two routes between two nodes = cycle. Directed: "visited" conflates two very different states. A visited node might be on your current path (a back edge — genuine cycle, you can loop around) or finished long ago (a cross/forward edge — no way back, harmless). Diamond counterexample: 0→1, 0→2, 1→3, 2→3; when 2 reaches the visited 3, the parent trick screams cycle, but no round trip exists. Replacement: three colors — white untouched, gray on the current recursion stack, black fully explored. Only an edge into GRAY is a cycle; edges into black are ignored. Both run O(n + m).',
      isCaseBased: false,
    },
    {
      question: 'Model Course Schedule II as a graph problem and solve it end to end. Name your complexity.',
      answer:
        'Nodes = courses 0..n-1. Each prerequisite pair (a, b) — "take b before a" — becomes edge b→a. The answer is a topological order of this DAG, or empty if a cycle exists. Kahn\'s: compute indegrees O(n + m); seed a queue with all indegree-0 courses; repeatedly pop u, append to order, decrement each dependent\'s indegree, enqueueing any that hit 0. If order.size() < n, some courses never unlocked — a prerequisite cycle — return {}. Otherwise return order. Time O(n + m), space O(n). Course Schedule I is the same code returning order.size() == n. Worth volunteering: read the pair direction carefully — LeetCode gives [a, b] meaning b before a, and flipping it is the classic silent wrong answer.',
      isCaseBased: false,
    },
    {
      question: 'Kahn\'s algorithm vs DFS-postorder-reverse for topological sort — when do you pick which?',
      answer:
        'Both are O(n + m) and both correct on DAGs, so the choice is about extras. Kahn\'s: iterative (no stack-overflow risk), detects cycles for free (count < n), processes nodes in "levels" (all currently-available tasks) which maps directly to parallel scheduling — and swapping the queue for a min-heap gives the lexicographically smallest order at O(m log n). DFS postorder: less code if you are already running DFS for other reasons, and reverse postorder is the natural input to SCC algorithms — but it happily emits a garbage "order" on cyclic input unless you bolt on the three-color check separately. Default for interviews: Kahn\'s, because Course-Schedule-style questions always ask about cycles anyway.',
      isCaseBased: false,
    },
    {
      question: 'Explain the bipartite check, and prove the "odd cycle = impossible" claim.',
      answer:
        'BFS 2-coloring: color the start 0, each discovered neighbor gets the opposite color, and any edge joining two same-colored nodes means not bipartite. Run it per component. Proof of the odd-cycle theorem, both directions: (⇐) if an odd cycle exists, walk it — colors must alternate 0,1,0,1,…, and after an odd number of steps you return to the start needing the opposite of its color. Contradiction, so no valid 2-coloring. (⇒) if no odd cycle exists, color each node by parity of its BFS distance from the component root; an edge between same-parity nodes would close a walk of odd total length, which contains an odd cycle — excluded. So the parity coloring is proper. O(n + m). Trigger phrases in the wild: "two teams", "no two adjacent share", "seat enemies apart".',
      isCaseBased: false,
    },
    {
      question: 'Case: your team\'s package manager hangs on "resolving install order" for one customer. You suspect circular dependencies. Design the diagnostic — and the interviewer adds: "print the actual cycle for the error message."',
      answer:
        'Model packages as nodes, dependency a-needs-b as edge b→a (or the reverse, consistently). A valid install order is a topo sort; a hang under a naive resolver means a cycle. Diagnostic: run Kahn\'s — if count < n, the leftover nodes (nonzero indegree) are the cycle members and everything downstream of them. To print one concrete cycle, switch to three-color DFS and keep the current path on an explicit stack: when an edge u→v hits a GRAY v, the cycle is v → … → u → v, read by popping the path stack back to v. Report that list to the user. O(n + m) total, so it runs fine even on huge dependency graphs. Prevention worth mentioning: run this check at package-publish time, not install time.',
      isCaseBased: true,
    },
    {
      question: 'There is no graph in the input at all — just words. How is Word Ladder a graph problem?',
      answer:
        'The graph is implicit: nodes = dictionary words, and an edge joins two words differing in exactly one letter. "Transform hit→cog in fewest steps" = shortest path in an unweighted graph = BFS, full stop. The lesson generalizes: any state space with legal moves is a graph — grid cells, puzzle configurations, (position, keys-held) pairs. You never build adj explicitly; you generate neighbors on the fly (for words: try all 26 letters in each position, keep dictionary hits — O(26·L) per word with a hash set). Whenever a problem says "minimum number of steps/moves/transformations", the answer is BFS on the implicit state graph.',
      isCaseBased: false,
    },
    {
      question: 'Rotting Oranges: every minute, rot spreads to adjacent fresh oranges. Minutes until all rot? Which pattern is this?',
      answer:
        'Multi-source BFS. Seed the queue with ALL initially rotten oranges at distance 0 — conceptually a virtual super-source connected to each of them — then run standard BFS on the grid; each ring is one minute. The rings argument still holds with multiple sources: every fresh orange is reached at exactly its distance from the NEAREST rotten one. Answer = the largest distance assigned; if any fresh orange is never reached (isolated by walls/empties), return -1. O(R·C). The general trigger: "spreads simultaneously from several points" or "distance to the nearest X" — push all sources up front instead of running BFS per source (which would be O(sources · R·C)).',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Adjacency list vs matrix — space', back: 'List: O(n + m), neighbor scan = deg(u). Matrix: O(n²) always, O(1) edge check. Sparse (interview) graphs → list. Matrix only for dense + small n (Floyd–Warshall).' },
    { front: 'Undirected edge in an adjacency list', back: 'Store it twice: adj[u].push_back(v) AND adj[v].push_back(u). Forgetting the second line = "my BFS finds nothing".' },
    { front: 'Why BFS = shortest path (unweighted)', back: 'Queue processes ring k fully before ring k+1 (FIFO). First discovery of v is via a minimum-edge route. Breaks with weights → Dijkstra.' },
    { front: 'BFS visited rule', back: 'Mark when PUSHING, not popping. Mark-on-pop lets a node enter once per incoming edge → O(m) queue, MLE/TLE on dense inputs.' },
    { front: 'Recursive DFS danger + fix', back: 'Stack overflow ~10⁴–10⁵ depth (chains, big grids) — silent crash. Fix: explicit stack<int> (tolerate duplicates, check visited at pop) or BFS.' },
    { front: 'Connected components recipe', back: 'for i in 0..n-1: if unvisited → count++, traverse (BFS or DFS) to eat the whole component. O(n + m) total. Same loop guards cycles/bipartite on disconnected graphs.' },
    { front: 'Number of Islands trick', back: 'Grid = implicit graph (4-dir neighbors via dr/dc arrays). Flood fill each new land cell; mark visited in place: \'1\'→\'0\' (sunk land can\'t recount). O(R·C).' },
    { front: 'Cycle detection: undirected vs directed', back: 'Undirected: DFS + parent — visited neighbor ≠ parent = cycle. Directed: three colors — edge into GRAY (on current path) = cycle; black is harmless. Parent trick false-positives on directed cross edges.' },
    { front: 'Kahn\'s algorithm in one breath', back: 'indegree array → queue all zeros → pop, append, decrement dependents, enqueue new zeros. count < n = cycle (Course Schedule I). Output = topo order (II).' },
    { front: '"Two teams / no adjacent pair together" →', back: 'Bipartite check: BFS 2-coloring, neighbor gets 1 − color. Same-color edge = odd cycle = impossible. Bipartite ⟺ no odd cycle.' },
  ],
  mindmapMarkdown: `- Graphs I: BFS, DFS & Friends
  - Representation
    - Adjacency list O(n+m) — the default
    - Matrix O(n²) — dense, small n, Floyd–Warshall
    - Undirected edge = stored twice
  - BFS
    - Queue, mark on PUSH
    - Rings → shortest path (unweighted)
    - dist array doubles as visited
    - Multi-source: seed all starts (Rotting Oranges)
  - DFS
    - Recursive: mark on entry
    - Iterative: explicit stack, skip repeats on pop
    - Deep graph → stack overflow → go iterative
  - Components
    - Loop unvisited → count++ → traverse
    - Grids are graphs: dr/dc neighbors
    - Number of Islands: flood fill, sink in place
  - Cycles
    - Undirected: DFS + parent check
    - Directed: white/gray/black — gray hit = cycle
    - Parent trick fails on directed (diamond)
  - Topological sort (DAG only)
    - Kahn's: indegree 0 queue, count < n = cycle
    - DFS postorder reversed
    - Course Schedule I/II
  - Bipartite
    - BFS 2-coloring, flip 1 − color
    - Same-color edge = odd cycle
  - Everything here: O(n + m)`,
}

export default m
