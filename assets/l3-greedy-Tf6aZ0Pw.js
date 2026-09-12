var e={id:`dsa-l3-greedy`,subjectId:`dsa`,level:3,title:`Greedy: Intervals, Jumps & Proof Intuition`,whyItMatters:`Greedy is the highest-risk answer in an interview: when it works it beats DP by a complexity class, and when it does not, it is simply wrong — with full confidence. This module gives you the safety check (the exchange argument), the interval and jump patterns where greedy provably wins, and the counterexample that tells you to retreat to DP.`,estMinutes:45,sections:[{type:`intuition`,title:`Commit and never look back`,md:`A greedy algorithm is a hiker who, at every fork, takes the path that looks best *right now* — and never walks back.

- **Greedy = local best choice, committed forever.** No undo, no revisiting, no "what if".
- That is why greedy code is short and fast: one sort, one sweep, done.
- It is also why greedy is dangerous: a locally great choice can wreck the global answer.
- DP explores alternatives and remembers them. Greedy bets everything on one rule.
- So the real skill is not writing greedy code — it is knowing **when the bet is safe**.`},{type:`intuition`,title:`The exchange argument — when the bet is safe`,md:`The safety proof has one shape, and interviewers accept it in plain words. It is called the **exchange argument**.

- Claim: greedy's first choice is safe.
- Take ANY optimal solution. If it already starts with the greedy choice — done.
- If not, **swap** its first choice for the greedy one. Show the swap never makes the solution worse (never breaks feasibility, never shrinks the answer).
- So *some* optimal solution starts with the greedy choice. Repeat the argument on the rest.
- One sentence to say out loud: "any optimal solution can be rewritten to start with the greedy choice without getting worse."`},{type:`note`,md:'The interview decision line, worth memorizing verbatim: **"greedy needs a proof sketch, DP needs a state definition."** If you can tell the exchange story, say it and go greedy. If you cannot — if the best choice now depends on choices you have not made yet — stop, define `dp[state]`, and build the table. Guessing greedy without the story is how confident wrong answers happen.'},{type:`intuition`,title:`Interval scheduling: the canonical greedy`,md:`Problem (activity selection): given intervals, pick the **maximum number that do not overlap**. The classic wrong instinct is to sort by start time.

- Counterexample: [1,10), [2,3), [4,5). Sort by start → you grab [1,10) first — one giant interval that blocks both others. Answer 1. Optimal is 2.
- The fix: **sort by END time** and always take the interval that finishes earliest (if it fits).
- The proof story: the earliest finisher **leaves maximum room** for everything after it. Any optimal solution's first interval can be exchanged for the earliest finisher — it ends no later, so nothing that fit before stops fitting. Exchange argument, done.
- After picking, keep one number: \`lastEnd\`. An interval fits iff its start >= lastEnd.
- This is LeetCode's whole interval-greedy family in one rule.`},{type:`code`,lang:`cpp`,title:`Activity selection — maximum non-overlapping intervals`,code:`int maxNonOverlapping(vector<pair<int,int>>& iv) {   // {start, end}
    sort(iv.begin(), iv.end(), [](auto& a, auto& b) {
        return a.second < b.second;   // by END time. The whole algorithm is this line
    });
    int count = 0, lastEnd = INT_MIN;
    for (auto& [s, e] : iv) {
        if (s >= lastEnd) {           // fits after the last pick
            count++;
            lastEnd = e;              // commit. Never reconsider
        }
    }
    return count;                     // O(n log n) sort + O(n) sweep
}`,annotations:{3:`Sorting by end is the entire insight. Sort by start and the [1,10) trap eats you.`,7:`>= means touching intervals ([1,3) then [3,5)) are compatible — half-open ranges.`,9:`The greedy commit: one variable of state. No table, no backtracking.`},py:{code:`def maxNonOverlapping(iv: list[tuple[int, int]]) -> int:  # (start, end)
    iv.sort(key=lambda p: p[1])       # by END time. The whole algorithm is this
    count, last_end = 0, float('-inf')
    for s, e in iv:
        if s >= last_end:             # fits after the last pick
            count += 1
            last_end = e              # commit. Never reconsider
    return count                      # O(n log n) sort + O(n) sweep`,annotations:{2:`Sorting by end is the entire insight. Sort by start and the [1,10) trap eats you. Python sorts by a KEY function, not a comparator — one lambda naming the field, and .sort() is stable and in place.`,5:`>= means touching intervals ([1,3) then [3,5)) are compatible — half-open ranges.`,7:`The greedy commit: one variable of state. No table, no backtracking.`}}},{type:`visual`,component:`PointerBoxDiagram`,props:{title:`Activity selection, frame by frame`,notice:`Sorted by END time. One pointer — lastEnd — decides everything: keep iff start >= lastEnd.`,leftLabel:`greedy state`,rightLabel:`intervals (sorted by end)`,frames:[{note:`Sorted by end: [1,3) [2,5) [4,6). lastEnd starts at -inf. Nothing picked yet.`,stack:[{name:`lastEnd`,value:`-inf`},{name:`picked`,value:`0`}],heap:[{id:`iv1`,value:`[1,3)`,label:`ends first`},{id:`iv2`,value:`[2,5)`},{id:`iv3`,value:`[4,6)`}]},{note:`[1,3): start 1 >= -inf. No conflict — take it. lastEnd jumps to 3.`,stack:[{name:`lastEnd`,value:`3`,to:`iv1`},{name:`picked`,value:`1`}],heap:[{id:`iv1`,value:`[1,3)`,label:`PICKED`},{id:`iv2`,value:`[2,5)`},{id:`iv3`,value:`[4,6)`}]},{note:`[2,5): start 2 < lastEnd 3 — it overlaps the pick. Reject. lastEnd does not move.`,stack:[{name:`lastEnd`,value:`3`,to:`iv1`},{name:`cursor`,to:`iv2`,danger:!0},{name:`picked`,value:`1`}],heap:[{id:`iv1`,value:`[1,3)`,label:`PICKED`},{id:`iv2`,value:`[2,5)`,label:`REJECTED: 2 < 3`},{id:`iv3`,value:`[4,6)`}]},{note:`[4,6): start 4 >= 3 — fits. Take it. Answer: 2. Finishing early at 3 is what left room for this.`,stack:[{name:`lastEnd`,value:`6`,to:`iv3`},{name:`picked`,value:`2`}],heap:[{id:`iv1`,value:`[1,3)`,label:`PICKED`},{id:`iv2`,value:`[2,5)`,label:`REJECTED: 2 < 3`},{id:`iv3`,value:`[4,6)`,label:`PICKED`}]}]}},{type:`intuition`,title:`Non-overlapping Intervals: the same problem, flipped`,md:`LeetCode "Non-overlapping Intervals": remove the **minimum** number of intervals so the rest do not overlap.

- Erasing the minimum IS keeping the maximum. Same problem, complement view.
- Run activity selection, then return \`n - kept\`. No new algorithm exists here.
- Spotting the flip is the entire interview: interviewers dress the canonical problem in "delete" clothes and watch whether you re-derive or recognize.`},{type:`code`,lang:`cpp`,title:`Non-overlapping Intervals (LC 435)`,code:`int eraseOverlapIntervals(vector<vector<int>>& iv) {
    sort(iv.begin(), iv.end(),
         [](auto& a, auto& b) { return a[1] < b[1]; });   // by end, as always
    int kept = 0, lastEnd = INT_MIN;
    for (auto& v : iv)
        if (v[0] >= lastEnd) { kept++; lastEnd = v[1]; }
    return (int)iv.size() - kept;     // erase minimum == n - keep maximum
}`,annotations:{3:`Same sort, same sweep as activity selection — the pattern transfers verbatim.`,7:`The one-line flip. If you wrote a fresh algorithm for this, you missed the complement.`},py:{code:`def eraseOverlapIntervals(iv: list[list[int]]) -> int:
    iv.sort(key=lambda v: v[1])       # by end, as always
    kept, last_end = 0, float('-inf')
    for v in iv:
        if v[0] >= last_end:
            kept += 1
            last_end = v[1]
    return len(iv) - kept             # erase minimum == n - keep maximum`,annotations:{2:`Same sort, same sweep as activity selection — the pattern transfers verbatim. float('-inf') stands in for INT_MIN and can never be beaten by a real start.`,8:`The one-line flip. If you wrote a fresh algorithm for this, you missed the complement.`}}},{type:`intuition`,title:`Merge Intervals: different job, different sort key`,md:`Merge Intervals is NOT selection — you keep everything, you just glue overlaps into blocks. The sort key changes with the job.

- **Picking max non-overlapping → sort by END.** **Merging → sort by START.**
- Sorted by start, overlapping intervals become neighbors. Sweep left to right with one open block.
- Next interval starts inside the block (\`start <= block.end\`)? Extend the block's end (max of the two — a short interval can be swallowed whole).
- Starts after the block? Close it, open a new one.
- O(n log n), one pass, and the output is sorted for free.`},{type:`code`,lang:`cpp`,title:`Merge Intervals (LC 56)`,code:`vector<vector<int>> merge(vector<vector<int>>& iv) {
    sort(iv.begin(), iv.end());       // by START -- merging walks left to right
    vector<vector<int>> out;
    for (auto& v : iv) {
        if (!out.empty() && v[0] <= out.back()[1])
            out.back()[1] = max(out.back()[1], v[1]);   // overlap: extend the block
        else
            out.push_back(v);         // gap: open a new block
    }
    return out;
}`,annotations:{2:`Default vector<vector<int>> sort is lexicographic: by start, ties by end. Exactly what merging needs.`,5:`v starts at or before the open block ends — they touch or overlap.`,6:`max, not v[1]: [1,10] then [2,3] must keep end 10. Forgetting max is the classic slip.`},py:{code:`def merge(iv: list[list[int]]) -> list[list[int]]:
    iv.sort()                         # by START -- merging walks left to right
    out = []
    for v in iv:
        if out and v[0] <= out[-1][1]:
            out[-1][1] = max(out[-1][1], v[1])   # overlap: extend the block
        else:
            out.append(v)             # gap: open a new block
    return out`,annotations:{2:`A bare .sort() compares the inner lists element-wise: by start, ties by end. Exactly what merging needs — no key function at all.`,5:`"if out" is the not-empty test, and out[-1] is back(). v starts at or before the open block ends — they touch or overlap.`,6:`max, not v[1]: [1,10] then [2,3] must keep end 10. Forgetting max is the classic slip. (Note this mutates the caller's inner lists — append out[-1][:] instead if that matters.)`}}},{type:`intuition`,title:`Meeting Rooms II: the bridge to heaps`,md:`"Minimum rooms so all meetings run" = the **maximum number of meetings alive at once**. Brute force checks every pair: O(n²). Greedy plus a heap does it in one sweep.

- Sort meetings by start. Keep a **min-heap of end times** — one entry per occupied room.
- The heap's top is the room that frees up **soonest**. That is the only room worth asking about.
- New meeting starts at s: if \`top <= s\`, that room is free — pop it (reuse). Either way, push the new end time.
- The heap never shrinks below the peak concurrency, so its final size IS the answer.
- This is where greedy meets your heap module: "give me the soonest-ending thing" is exactly what a min-heap sells for O(log n).`},{type:`code`,lang:`cpp`,title:`Meeting Rooms II — min-heap of end times`,code:`int minMeetingRooms(vector<vector<int>>& iv) {
    sort(iv.begin(), iv.end());       // meetings in start order
    priority_queue<int, vector<int>, greater<int>> ends;
    for (auto& v : iv) {
        if (!ends.empty() && ends.top() <= v[0])
            ends.pop();               // earliest-ending room is free: reuse it
        ends.push(v[1]);              // occupy a room until v[1]
    }
    return (int)ends.size();          // peak simultaneous meetings
}`,annotations:{3:`The min-heap incantation from the STL module. Default priority_queue is a MAX-heap — flipping it here is mandatory.`,5:`top() <= start: the soonest-free room is free in time. If IT is not free, no room is. <= lets back-to-back meetings share a room.`,9:`Rooms are only added when every existing room is busy, so the heap size equals peak overlap. O(n log n).`},py:{code:`import heapq

def minMeetingRooms(iv: list[list[int]]) -> int:
    iv.sort()                         # meetings in start order
    ends = []                         # min-heap of end times
    for v in iv:
        if ends and ends[0] <= v[0]:
            heapq.heappop(ends)       # earliest-ending room is free: reuse it
        heapq.heappush(ends, v[1])    # occupy a room until v[1]
    return len(ends)                  # peak simultaneous meetings`,annotations:{5:`No incantation this time: heapq is a min-heap by default, so the C++ line that flips a max-heap simply has no counterpart. The top is ends[0].`,7:`ends[0] <= start: the soonest-free room is free in time. If IT is not free, no room is. <= lets back-to-back meetings share a room.`,10:`Rooms are only added when every existing room is busy, so the heap size equals peak overlap. O(n log n).`}}},{type:`intuition`,title:`Jump Game I: the furthest-reach sweep`,md:`Array of jump lengths; can you reach the last index from index 0? Trying every jump is exponential. Greedy needs one integer.

- Sweep left to right, tracking \`reach\` = the furthest index reachable so far.
- At index i: if \`i > reach\`, you are standing on an island — nothing before it could jump this far. Return false.
- Otherwise \`reach = max(reach, i + nums[i])\`.
- Why safe: reach only ever grows, and any index <= reach genuinely is reachable — some earlier index jumps to or past it. No decision is even being made, just a running maximum.
- O(n) time, O(1) space. The brute → best gap here is exponential → linear.`},{type:`code`,lang:`cpp`,title:`Jump Game (LC 55)`,code:`bool canJump(vector<int>& nums) {
    int reach = 0;                    // furthest index reachable so far
    for (int i = 0; i < (int)nums.size(); i++) {
        if (i > reach) return false;  // unreachable index: everything past it is too
        reach = max(reach, i + nums[i]);
    }
    return true;                      // O(n) time, O(1) space
}`,annotations:{4:`The only failure mode: a gap opens between reach and i. [3,2,1,0,4] dies here at i=4.`,5:`Not "where should I jump" — just "how far COULD anything reach". Greedy as a running max.`},py:{code:`def canJump(nums: list[int]) -> bool:
    reach = 0                         # furthest index reachable so far
    for i, n in enumerate(nums):
        if i > reach:
            return False              # unreachable index: so is everything past
        reach = max(reach, i + n)
    return True                       # O(n) time, O(1) space`,annotations:{4:`The only failure mode: a gap opens between reach and i. [3,2,1,0,4] dies here at i=4.`,6:`Not "where should I jump" — just "how far COULD anything reach". Greedy as a running max, and enumerate hands you the index and the jump length together.`}}},{type:`intuition`,title:`Jump Game II: minimum jumps = BFS layers`,md:'Now count the MINIMUM jumps to the last index. The O(n²) DP works — but the greedy reframe is the interview gold: **minimum jumps is BFS**, where layer k = every index reachable in k jumps.\n\n- Layer 0 = {index 0}. Layer 1 = everything one jump from it. Layer k+1 = everything one jump from layer k.\n- The answer is "which layer contains the last index" — exactly BFS depth on an implicit graph.\n- The array trick: each layer is a contiguous range, so no queue is needed. Track `edge` = where the current layer ends, and `furthest` = the furthest anything in this layer can reach.\n- When the sweep hits `i == edge`, the current layer is exhausted: you are FORCED to jump. `jumps++`, and the next layer ends at `furthest`.\n- That level-edge insight — "increment when you cross the layer boundary" — turns O(n²) DP into O(n).'},{type:`code`,lang:`cpp`,title:`Jump Game II (LC 45) — BFS layers without a queue`,code:`int jump(vector<int>& nums) {
    int jumps = 0, edge = 0, furthest = 0;
    for (int i = 0; i + 1 < (int)nums.size(); i++) {
        furthest = max(furthest, i + nums[i]);
        if (i == edge) {              // current BFS layer exhausted
            jumps++;                  // forced to jump into the next layer
            edge = furthest;          // next layer ends where this one could reach
        }
    }
    return jumps;
}`,annotations:{3:`i + 1 < size: stop BEFORE the last index — standing on the goal needs no jump out of it.`,5:`The level-edge insight. On [2,3,1,1,4]: layers are {0}, {1,2}, {3,4} -> 2 jumps.`,7:`edge = furthest, not i + nums[i]: the next layer is what the BEST member of this layer reaches.`},py:{code:`def jump(nums: list[int]) -> int:
    jumps = edge = furthest = 0
    for i in range(len(nums) - 1):    # stop BEFORE the last index
        furthest = max(furthest, i + nums[i])
        if i == edge:                 # current BFS layer exhausted
            jumps += 1                # forced to jump into the next layer
            edge = furthest           # next layer ends where this one reached
    return jumps`,annotations:{3:`range(len(nums) - 1) stops one short of the end — standing on the goal needs no jump out of it. Same intent as the C++ i + 1 < size.`,5:`The level-edge insight. On [2,3,1,1,4]: layers are {0}, {1,2}, {3,4} -> 2 jumps.`,7:`edge = furthest, not i + nums[i]: the next layer is what the BEST member of this layer reaches.`}}},{type:`intuition`,title:`Gas Station: the total-surplus argument`,md:`Circular route, \`gas[i]\` fuel at station i, \`cost[i]\` to reach the next. Find a start that completes the loop. Brute force tries every start: O(n²). One pass suffices, on two facts.

- Fact 1: if total gas >= total cost, **a valid start exists** (the global surplus has to pool up somewhere — the station right after the worst deficit stretch).
- Fact 2: if you start at s and the tank first goes negative at i, then **no start in [s..i] works**. Any such start reaches i with *at most* the fuel you had (it skipped the early pickups but not the costs), so it dies at i too — or sooner.
- So on failure, do not retry s+1 — skip the whole doomed range: \`start = i + 1\`, reset the tank.
- Each station is visited once. O(n), O(1) space.
- Say both facts in the interview: fact 2 justifies the skip, fact 1 justifies returning the surviving start without a second verification pass.`},{type:`code`,lang:`cpp`,title:`Gas Station (LC 134) — reset at failure`,code:`int canCompleteCircuit(vector<int>& gas, vector<int>& cost) {
    int total = 0, tank = 0, start = 0;
    for (int i = 0; i < (int)gas.size(); i++) {
        int gain = gas[i] - cost[i];
        total += gain;                // circuit-wide surplus
        tank += gain;                 // fuel since the current start
        if (tank < 0) {
            start = i + 1;            // every start in [start..i] just died with us
            tank = 0;
        }
    }
    return total >= 0 ? start : -1;   // surplus decides feasibility
}`,annotations:{5:`total never resets — it answers "is the loop possible at all".`,8:`The skip. Retrying start+1 would be O(n^2); fact 2 lets you leap past the whole failed stretch.`,12:`total >= 0 guarantees the last surviving start works — no verification loop needed.`},py:{code:`def canCompleteCircuit(gas: list[int], cost: list[int]) -> int:
    total = tank = start = 0
    for i, (g, c) in enumerate(zip(gas, cost)):
        gain = g - c
        total += gain                 # circuit-wide surplus
        tank += gain                  # fuel since the current start
        if tank < 0:
            start = i + 1             # every start in [start..i] died with us
            tank = 0
    return start if total >= 0 else -1   # surplus decides feasibility`,annotations:{3:`zip walks the two lists in lockstep and enumerate numbers the stops — one loop header instead of an index and two lookups.`,5:`total never resets — it answers "is the loop possible at all".`,8:`The skip. Retrying start+1 would be O(n²); fact 2 lets you leap past the whole failed stretch.`,10:`total >= 0 guarantees the last surviving start works — no verification loop needed.`}}},{type:`intuition`,title:`When greedy fails: the coin counterexample`,md:`Coin change: coins {1, 3, 4}, make 6 with fewest coins. Greedy says "always grab the biggest coin".

- Greedy: 4 → remainder 2 → 1 → 1. **Three coins.**
- Optimal: 3 + 3. **Two coins.**
- The exchange argument breaks: swapping the optimal first coin (3) for the greedy choice (4) leaves remainder 2, which costs MORE to finish. The swap makes things worse — no proof, no greedy.
- Greedy works for {1, 5, 10, 25} style systems (each coin dominates smaller combinations), but that is a property of those specific coins, not of the problem.
- The moment the local best depends on the future — "taking 4 now poisons the remainder" — you are in DP land: define \`dp[amount]\` = fewest coins for that amount, and build up.`},{type:`code`,lang:`cpp`,title:`The counterexample, runnable`,code:`// coins {1, 3, 4}, target 6
int greedyCoins(int target) {
    int coins[] = {4, 3, 1}, used = 0;
    for (int c : coins)
        while (target >= c) { target -= c; used++; }
    return used;   // greedy: 4+1+1 = 3 coins. Optimal: 3+3 = 2. WRONG
}`,annotations:{5:`Biggest-coin-first, fully committed — the textbook greedy that quietly fails.`,6:`Memorize this exact instance: {1,3,4}, target 6. It is the standard "prove greedy wrong" card.`},py:{code:`# coins {1, 3, 4}, target 6
def greedyCoins(target: int) -> int:
    coins, used = [4, 3, 1], 0
    for c in coins:
        while target >= c:
            target -= c
            used += 1
    return used   # greedy: 4+1+1 = 3 coins. Optimal: 3+3 = 2. WRONG`,annotations:{5:`Biggest-coin-first, fully committed — the textbook greedy that quietly fails.`,8:`Memorize this exact instance: {1,3,4}, target 6. It is the standard "prove greedy wrong" card.`}}},{type:`note`,md:`The pocket checklist before you say "greedy" out loud:

- Can I tell the exchange story in one sentence? If not — DP.
- Intervals: picking max → sort by **end**; merging → sort by **start**; counting rooms → **min-heap of ends**.
- Jumps: reachability → running max; minimum jumps → BFS layers over the array.
- Circular feasibility (Gas Station): total surplus + reset-at-failure.
- Suspicious? Hunt a small counterexample for 60 seconds before committing — {1,3,4}/6 energy.`}],quiz:[{question:`Maximum number of non-overlapping intervals — what do you sort by?`,options:[{text:`Start time`,explanation:`The trap: [1,10), [2,3), [4,5). Sorting by start grabs the giant [1,10) first and blocks both others — 1 instead of 2.`},{text:`End time`,explanation:`Correct. The earliest finisher leaves maximum room for the rest — provable by the exchange argument.`},{text:`Interval length`,explanation:`Tempting heuristic, still wrong: a short interval straddling two others can block both. Shortest-first has its own counterexamples.`},{text:`No sort needed`,explanation:`Without ordering there is no notion of "finishes earliest" — the sweep has nothing to commit to.`}],correct:1},{question:`The exchange argument proves greedy safe by showing…`,options:[{text:`Greedy runs faster than DP`,explanation:`Speed is the reward, not the proof. A fast wrong answer is still wrong.`},{text:`Any optimal solution can be rewritten to start with the greedy choice, without getting worse`,explanation:`Correct. Swap optimal's first choice for greedy's, show no loss, recurse on the rest. That is the whole proof shape.`},{text:`The greedy choice is unique`,explanation:`Uniqueness is irrelevant — ties are fine as long as the swap costs nothing.`}],correct:1},{question:`"Non-overlapping Intervals" asks you to ERASE the minimum number of intervals. The solution is…`,options:[{text:`Run activity selection (sort by end, keep what fits) and return n minus kept`,explanation:`Correct. Erasing the minimum IS keeping the maximum — the complement of the canonical problem.`},{text:`Sort by length and remove the longest intervals first`,explanation:`Longest-first has counterexamples — the number kept, not the length removed, is what matters.`},{text:`It requires O(n²) DP`,explanation:`DP on sorted ends works but is unnecessary — the greedy complement is optimal and O(n log n).`}],correct:0},{question:`In Meeting Rooms II, the top of the min-heap represents…`,options:[{text:`The meeting that started earliest`,explanation:`Start order is handled by the sort. The heap holds only END times.`},{text:`The room that frees up soonest`,explanation:`Correct. If even that room is still busy when a meeting starts, no room is free — open a new one. Final heap size = rooms.`},{text:`The longest meeting so far`,explanation:`Duration never matters — only when each occupied room becomes free.`}],correct:1},{question:"Jump Game II: when does the greedy increment `jumps`?",options:[{text:"Every time `furthest` improves",explanation:`furthest improves constantly within a layer — that would count reach updates, not jumps.`},{text:`When i reaches the edge of the current BFS layer`,explanation:`Correct. i == edge means everything reachable in k jumps is behind you — you are forced into layer k+1.`},{text:`At every index visited`,explanation:`That counts steps of the sweep, which would just return n-1.`}],correct:1},{question:`Gas Station: starting from s, the tank first goes negative at station i. What did you learn?`,options:[{text:`Only s fails — try s+1 next`,explanation:`Too weak, and it makes the algorithm O(n²). The failure kills a whole range of starts, not one.`},{text:`Every start in [s..i] fails — jump to i+1`,explanation:`Correct. Any start inside the range reaches i with at most the fuel you had, so it dies there too. That skip is what makes one pass enough.`},{text:`The answer is -1`,explanation:`Only total gas < total cost proves impossibility. A local failure just moves the candidate start.`}],correct:1},{question:`Coins {1, 3, 4}, target 6. Biggest-coin-first greedy returns…`,options:[{text:`2 coins`,explanation:`2 is the OPTIMAL answer (3+3) — exactly what greedy misses by grabbing the 4 first.`},{text:`3 coins — and that gap to the optimal 2 is the proof greedy fails here`,explanation:`Correct. 4+1+1 = 3 coins vs 3+3 = 2. Taking 4 poisons the remainder — future-dependent choices mean DP.`},{text:`Greedy cannot run on these coins`,explanation:`It runs fine — it just returns a confidently wrong answer. That is what makes unproven greedy dangerous.`}],correct:1},{question:`Merge Intervals sorts by start; activity selection sorts by end. Why the difference?`,options:[{text:`No reason — either key works for both`,explanation:`Sort by end and try merging: overlapping intervals are no longer guaranteed adjacent in the way the one-block sweep needs; sort by start for selection and [1,10) blocks everything.`},{text:`Merging needs overlaps adjacent in sweep order (start order); selection needs the earliest finisher first (end order)`,explanation:`Correct. The sort key follows the job: glue neighbors → start; leave maximum room → end.`},{text:`Sorting by start is faster`,explanation:`Both are the same O(n log n) sort — the key changes correctness, not cost.`}],correct:1}],interviewQuestions:[{question:`What makes an algorithm "greedy", and what is the one-sentence test for whether greedy is safe on a problem?`,answer:`Greedy commits to the locally best choice at every step and never revisits a decision — no backtracking, no table of alternatives. The safety test is the exchange argument: can I show that ANY optimal solution can be rewritten to start with the greedy choice without getting worse? If yes, induction finishes the proof and greedy is optimal. If the local best can poison future choices (coin change with {1,3,4}), the swap loses value and greedy is out. The decision line to say verbatim: greedy needs a proof sketch, DP needs a state definition.`,isCaseBased:!1},{question:`Prove that earliest-finish-first is optimal for activity selection. A sketch is fine.`,answer:`Exchange argument. Let OPT be any optimal solution, sorted by time, and let g be the interval with the globally earliest end. If OPT starts with g, done. Otherwise swap OPT's first interval f for g: g ends no later than f (g has the earliest end of all), so every later interval in OPT still fits after g — feasibility survives, size is unchanged. So some optimal solution starts with g. Remove g and everything overlapping it; the remaining problem is a smaller instance and the same argument repeats. Hence greedy's picks match an optimal solution's size at every step. Complexity: O(n log n) sort + O(n) sweep.`,isCaseBased:!1},{question:`Case: a candidate solves "max non-overlapping intervals" by sorting on start time and greedily keeping whatever fits. The interviewer offers the test [[1,10],[2,3],[4,5]]. Walk through what happens and the fix.`,answer:`Sorted by start: [1,10] comes first and gets picked; [2,3] and [4,5] both start inside it and get rejected — output 1. Optimal is 2: {[2,3],[4,5]}. The bug: an early-starting but LONG interval hogs the timeline. The fix is sorting by END time: [2,3] first (pick, lastEnd=3), [4,5] fits (pick, lastEnd=5), [1,10]'s start 1 < 5 — rejected. Output 2. The recovery script for the interview: name the counterexample class ("early start, late end"), state the corrected rule, and give the one-line proof — the earliest finisher leaves maximum room, and any optimal first pick can be exchanged for it at no cost.`,isCaseBased:!0},{question:`Merge Intervals: approach, complexity, and why the sort key differs from activity selection.`,answer:`Sort by start — after that, any two overlapping intervals are neighbors in sweep order. Keep one open block: if the next interval starts at or before the block's end, extend the block end to max(block.end, interval.end) — the max matters because a short interval can be swallowed whole ([1,10] then [2,3]). Otherwise close the block and open a new one. O(n log n) for the sort, O(n) sweep, output sorted for free. The key differs because the job differs: selection wants the earliest FINISHER available first (leave room), merging wants overlaps ADJACENT (glue neighbors). Sort key follows the job, not habit.`,isCaseBased:!1},{question:`Meeting Rooms II: why a min-heap of end times, what is the complexity, and what alternative approach gives the same answer?`,answer:`Sort meetings by start; the heap holds the end time of every meeting currently occupying a room. Its top is the room that frees soonest — the ONLY room worth checking: if that one is still busy at the new meeting's start, all are. top <= start → pop (reuse the room); always push the new end. Rooms are only added at genuine peak overlap, so the final heap size is the answer. O(n log n). Alternative: the sweep-line/two-pointer trick — sort all starts and all ends separately, walk both arrays, +1 room on a start before the next end, -1 otherwise, track the running max. Same O(n log n), no heap. Name both; the heap version generalizes better (e.g., WHICH room).`,isCaseBased:!1},{question:`Jump Game I: describe the furthest-reach sweep and argue why this greedy cannot be wrong.`,answer:`One variable, reach = furthest index reachable so far. Sweep i from 0: if i > reach, index i is unreachable — and since every jump from before i lands at or before reach, nothing beyond i is reachable either: return false. Otherwise reach = max(reach, i + nums[i]). Return true if the sweep completes. Why it cannot be wrong: there is no real "choice" being committed — reach is an exact invariant (i is reachable iff i <= reach at that point), maintained by a running max. Greedy problems where the "choice" collapses into an invariant are the safest kind. O(n) time, O(1) space, versus exponential brute force.`,isCaseBased:!1},{question:`Jump Game II: explain the "minimum jumps = BFS layers" insight and how the code exploits it without a queue.`,answer:`Model indices as graph nodes with an edge i → j whenever j <= i + nums[i]; minimum jumps is the shortest path from 0 to n-1, i.e. BFS depth. The array structure collapses BFS: layer k is a contiguous range of indices, so instead of a queue you track edge (last index of the current layer) and furthest (max i + nums[i] seen inside it). Sweeping i, when i == edge the current layer is exhausted — you are forced to jump: jumps++, edge = furthest. Loop stops before the last index (standing on the goal needs no jump out). On [2,3,1,1,4]: layers {0}, {1,2}, {3,4} → 2 jumps. O(n) versus the O(n²) dp[i] = 1 + min over reachable j. The transferable phrase: "min steps" on an array with local moves is BFS, and contiguous layers let you run BFS with two integers.`,isCaseBased:!1},{question:`Gas Station: justify the single-pass reset-at-failure algorithm. Why is no second verification pass needed?`,answer:`Two facts. Fact 1 (feasibility): if total gas >= total cost, some start completes the loop — the global surplus must accumulate somewhere; the start just after the deepest deficit stretch works. So total >= 0 alone decides between "answer exists" and -1. Fact 2 (the skip): if starting at s the tank first goes negative at i, then any start strictly inside (s..i] reaches i with at most the fuel the s-run had — it paid the same costs but skipped some pickups — so it also fails by i. Therefore jump start to i+1 and reset the tank; no start inside the dead range deserves a retry. Each station is visited once → O(n), O(1) space. Fact 2 makes one pass sufficient to find the only surviving candidate; fact 1 guarantees that candidate works, which is why no verification loop is needed.`,isCaseBased:!1},{question:`Case: your coin-change greedy (largest coin first) passes the sample tests with coins {1,2,5,10} but fails a hidden test. The interviewer reveals coins {1,3,4}, target 6. What went wrong, and what do you do next?`,answer:`Greedy takes 4, leaving 2, then 1+1 — three coins; the optimum is 3+3 — two. The exchange argument breaks: swapping the optimal first coin (3) for the greedy pick (4) leaves a remainder (2) that is strictly more expensive to finish, so the swap loses value. Greedy on {1,2,5,10} only worked because that coin system is canonical — each coin dominates any combination of smaller ones — a property of those denominations, not of coin change. The recovery: switch tools and say the decision line out loud — greedy needs a proof sketch, DP needs a state definition — then define the state: dp[a] = fewest coins to make amount a, dp[0]=0, dp[a] = 1 + min over coins c<=a of dp[a-c]. O(amount × coins) time, O(amount) space. Bonus point: mention that testing greedy-vs-DP on small amounts is how you detect non-canonical systems quickly.`,isCaseBased:!0},{question:`Non-overlapping Intervals (erase minimum): what is the relationship to activity selection, and why does spotting it matter?`,answer:`They are complements of the same quantity: erasing the minimum number of intervals so none overlap is identical to keeping the maximum non-overlapping set — answer = n − (activity selection count). So the entire solution is: sort by end, sweep with lastEnd counting what fits, return n − kept. O(n log n). It matters because interviewers deliberately re-skin canonical problems; recognizing "this is activity selection wearing delete clothes" saves ten minutes of re-derivation and signals pattern fluency. The same flip appears elsewhere: min removals to make a sequence valid = length − longest valid subsequence.`,isCaseBased:!1},{question:`An interviewer asks: "You claim your greedy is correct. Convince me without a formal proof." What do you say?`,answer:`Three moves. (1) Name the proof shape: "exchange argument — take any optimal solution; if it doesn't start with my greedy choice, swap its first choice for mine and nothing gets worse, so an optimal solution starting with my choice exists; repeat on the rest." (2) Instantiate the swap for THIS problem in one concrete sentence (for intervals: "my pick ends earliest, so the swap can only free up room"). (3) Show you hunted for counterexamples: mention the adversarial cases you checked (giant early interval, ties, empty input). If any of the three fails, say so and pivot to DP with a state definition. What loses the room is confident greedy with no story — the counterexample the interviewer is holding will land on you.`,isCaseBased:!1}],flashcards:[{front:`Greedy in one sentence`,back:`Commit to the locally best choice at every step and never look back — no backtracking, no table.`},{front:`Exchange argument`,back:`Any optimal solution can be rewritten to START with the greedy choice without getting worse → some optimal solution agrees with greedy → recurse. That sentence IS the proof sketch.`},{front:`The interview decision line`,back:`"Greedy needs a proof sketch, DP needs a state definition." No exchange story → define dp[state] instead.`},{front:`Activity selection recipe`,back:`Sort by END time; keep an interval iff start >= lastEnd; update lastEnd. Earliest finish leaves maximum room. O(n log n).`},{front:`Why not sort by start?`,back:`[1,10), [2,3), [4,5): start-order picks the giant [1,10) and blocks both others — 1 vs optimal 2.`},{front:`Interval sort keys, by job`,back:`Pick max non-overlapping → sort by END. Merge overlaps → sort by START. Count rooms → sort by start + min-heap of END times.`},{front:`Meeting Rooms II recipe`,back:`Sort by start; min-heap of end times; top <= start → pop (reuse room); push new end. Final heap size = rooms = peak overlap.`},{front:`Jump Game II trigger`,back:`Min jumps = BFS layers over the array. Sweep with furthest and edge; when i == edge → jumps++, edge = furthest.`},{front:`Gas Station recipe`,back:`One pass: tank += gas[i]−cost[i]; tank < 0 → start = i+1, tank = 0 (whole range [start..i] is dead). Answer exists iff TOTAL surplus >= 0.`},{front:`Greedy-fails canary`,back:`Coins {1,3,4}, target 6: greedy 4+1+1 = 3 coins, optimal 3+3 = 2. Local best poisons the remainder → back to DP.`}],mindmapMarkdown:`- Greedy: Intervals, Jumps & Proof Intuition
  - What greedy is
    - local best, committed forever
    - fast but dangerous without proof
  - Exchange argument
    - swap optimal's first pick for greedy's
    - no loss → greedy optimal
  - Decision line
    - greedy → proof sketch
    - DP → state definition
  - Interval scheduling
    - sort by END time
    - keep iff start >= lastEnd
    - sort-by-start trap: [1,10)
    - Non-overlapping Intervals = n − kept
  - Merge Intervals
    - sort by START
    - extend block or open new
  - Meeting Rooms II
    - min-heap of end times
    - heap size = peak overlap = rooms
  - Jump Game
    - I: furthest-reach sweep, O(n)
    - II: BFS layers, i == edge → jump++
  - Gas Station
    - total surplus >= 0 → feasible
    - tank < 0 → restart at i+1
  - When greedy fails
    - coins {1,3,4}, target 6: 3 vs 2
    - fallback: define dp[state]`};export{e as default};