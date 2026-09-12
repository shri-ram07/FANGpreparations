var e={id:`dsa-l1-linked-lists`,subjectId:`dsa`,level:1,title:`Linked Lists: Reverse, Cycles, Merge & LRU`,whyItMatters:`Nobody ships a linked list — interviewers ask them anyway, because nothing exposes sloppy pointer thinking faster. "Reverse a list" is the most-asked warmup in FAANG history, and LRU cache is the most-asked design-a-structure question. This module is both, plus the runner tricks that live between them.`,estMinutes:55,sections:[{type:`intuition`,title:`A treasure hunt, not a bookshelf`,md:`An array is a bookshelf: slot 7 starts exactly where slot 6 ends, so you jump straight to any slot. A linked list is a treasure hunt: each clue holds one item and the **address of the next clue**.

- A **node** = one value + one pointer called \`next\` that stores the address of the following node.
- The whole list is just the **head** pointer. Lose the head, lose everything.
- The last node's \`next\` is \`nullptr\` — the "hunt ends here" marker.
- No indexing: reaching item k costs O(k) hops.
- The payoff: **insert or delete at a node you already hold is O(1)** — rewire two pointers, shift nothing.`},{type:`code`,lang:`cpp`,title:`The node — four lines that power every problem here`,code:`struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v) : val(v), next(nullptr) {}
};

ListNode* head = new ListNode(1);
head->next = new ListNode(2);
head->next->next = new ListNode(3);   // 1 -> 2 -> 3 -> nullptr`,annotations:{3:`The entire data structure is this one pointer. Every trick in this module is a different way of rewriting it.`,4:`Constructor sets next to nullptr — a fresh node is a complete one-element list by itself.`,9:`Chains are built by assignment, walked by ->next hops. There is no operator[] and never will be.`},py:{code:`class ListNode:
    def __init__(self, val: int):
        self.val = val
        self.next = None              # a fresh node is a one-element list already

head = ListNode(1)
head.next = ListNode(2)
head.next.next = ListNode(3)          # 1 -> 2 -> 3 -> None`,annotations:{2:`__init__ IS the constructor; self.next = None is the C++ member initializer : next(nullptr). No struct, no new, no delete — the GC reclaims unreachable nodes.`,4:`The entire data structure is this one attribute, and None is nullptr. Every trick in this module is a different way of rewriting it.`,8:`Chains are built by assignment, walked by .next hops. There is no indexing and never will be.`}}},{type:`note`,md:"Honest engineering note: real systems mostly use `vector`. Array elements sit side by side, so the CPU cache pre-loads your next reads for free; list nodes are scattered heap allocations, and every `->next` hop risks a cache miss. Benchmarks show `vector` beating `list` even at middle-insertion for realistic sizes. Interviews still love lists because they test **pointer discipline** — the skill transfers to trees, graphs, and allocators. Learn the patterns here; reach for `vector` at work."},{type:`intuition`,title:`Reversal: flip every arrow, one at a time`,md:`You walk a one-way street flipping every sign to point backward. Problem: the moment you flip a sign, you can no longer read where the street continued. So before each flip, **write down the next address**.

- That is the whole algorithm — three pointers doing a repeating dance:
- **prev** = the already-flipped territory behind you. **cur** = the sign in your hand. **next** = the saved escape route.
- Four beats per node: save \`next\`, flip \`cur->next\` to prev, slide prev up, slide cur up.
- Invariant after every iteration: prev heads a correctly reversed list; cur heads the untouched rest.
- Loop ends when cur runs off the end — and the answer is **prev**, not cur.`},{type:`visual`,component:`PointerBoxDiagram`,props:{title:`The three-pointer dance on 1 → 2 → 3`,notice:`Watch one arrow flip per step. The saved next pointer is what keeps the rest of the list reachable.`,leftLabel:`pointers`,rightLabel:`nodes`,frames:[{note:`Start: prev = nullptr, cur = head. The list is 1 → 2 → 3 → null. Nothing flipped yet.`,stack:[{name:`prev`,value:`nullptr`},{name:`cur`,to:`n1`},{name:`next`,value:`—`}],heap:[{id:`n1`,value:`1`,label:`next → n2`},{id:`n2`,value:`2`,label:`next → n3`},{id:`n3`,value:`3`,label:`next → null`}]},{note:`Beat 1 — save the escape route: next = cur->next. Flip anything before this and the rest of the list is lost forever.`,stack:[{name:`prev`,value:`nullptr`},{name:`cur`,to:`n1`},{name:`next`,to:`n2`}],heap:[{id:`n1`,value:`1`,label:`next → n2`},{id:`n2`,value:`2`,label:`next → n3`},{id:`n3`,value:`3`,label:`next → null`}]},{note:`Beat 2 — the flip: cur->next = prev. Node 1 now points backward (at null). First arrow reversed.`,stack:[{name:`prev`,value:`nullptr`},{name:`cur`,to:`n1`},{name:`next`,to:`n2`}],heap:[{id:`n1`,value:`1`,label:`next → null (flipped)`},{id:`n2`,value:`2`,label:`next → n3`},{id:`n3`,value:`3`,label:`next → null`}]},{note:`Beats 3–4 — slide up: prev = cur, cur = next. Then the same dance on node 2: save n3, flip node 2 to point at node 1.`,stack:[{name:`prev`,to:`n1`},{name:`cur`,to:`n2`},{name:`next`,to:`n3`}],heap:[{id:`n1`,value:`1`,label:`next → null`},{id:`n2`,value:`2`,label:`next → n1 (flipped)`},{id:`n3`,value:`3`,label:`next → null`}]},{note:`Last round: node 3 flips to point at node 2, cur slides off the end (nullptr) — loop exits. prev holds the new head: 3 → 2 → 1.`,stack:[{name:`prev`,to:`n3`},{name:`cur`,value:`nullptr`},{name:`next`,value:`nullptr`}],heap:[{id:`n1`,value:`1`,label:`next → null`},{id:`n2`,value:`2`,label:`next → n1`},{id:`n3`,value:`3`,label:`next → n2 (flipped)`}]}]}},{type:`code`,lang:`cpp`,title:`Reverse Linked List — iterative, the flagship`,code:`ListNode* reverseList(ListNode* head) {
    ListNode* prev = nullptr;
    ListNode* cur = head;
    while (cur != nullptr) {
        ListNode* next = cur->next;   // 1. save the escape route
        cur->next = prev;             // 2. flip the arrow
        prev = cur;                   // 3. slide prev up
        cur = next;                   // 4. slide cur up
    }
    return prev;                      // cur fell off the end; prev is the new head
}`,annotations:{5:`This line MUST come before the flip. Reverse the order and cur->next already points backward — the rest of the list is unreachable.`,6:`The only line that mutates the list. Everything else is bookkeeping to survive this mutation.`,10:`Returning cur is THE classic slip — cur is nullptr here. The reversed list hangs off prev. O(n) time, O(1) space.`},py:{code:`def reverseList(head: ListNode | None) -> ListNode | None:
    prev = None
    cur = head
    while cur is not None:
        nxt = cur.next        # 1. save the escape route (next is a builtin -> nxt)
        cur.next = prev       # 2. flip the arrow
        prev = cur            # 3. slide prev up
        cur = nxt             # 4. slide cur up
    return prev               # cur fell off the end; prev is the new head`,annotations:{5:`This line MUST come before the flip. Reverse the order and cur.next already points backward — the rest of the list is unreachable.`,6:`The only line that mutates the list. Everything else is bookkeeping to survive this mutation.`,9:`Returning cur is THE classic slip — cur is None here. The reversed list hangs off prev. O(n) time, O(1) space.`}}},{type:`intuition`,title:`Recursive reversal: trust the recursion`,md:`Do not trace recursive calls node by node — you will drown. Instead **trust the contract**: assume \`reverseRec(head->next)\` already works and hands back the rest, perfectly reversed.

- If the rest is reversed, your old neighbor \`head->next\` is now the **tail** of that reversed part.
- Two moves finish the job: make that neighbor point back at you, then point yourself at null.
- Base case: an empty or single-node list is already reversed — return it.
- Cost: O(n) time, but O(n) **stack space** — one frame per node. Say unprompted: "iterative wins on space, O(1) vs O(n)."`},{type:`code`,lang:`cpp`,title:`Reverse Linked List — recursive`,code:`ListNode* reverseRec(ListNode* head) {
    if (head == nullptr || head->next == nullptr)
        return head;                              // already reversed
    ListNode* newHead = reverseRec(head->next);   // trust: rest is reversed now
    head->next->next = head;                      // old neighbor points back at me
    head->next = nullptr;                         // I am the new tail (for now)
    return newHead;                               // same head bubbles all the way up
}`,annotations:{4:`The leap of faith. newHead is the last node of the original list, and it never changes on the way back up.`,5:`The famous line. head->next is my old neighbor — currently the tail of the reversed part. This hooks me on after it.`,6:`Without this, node 1 and node 2 point at each other forever — a two-node cycle. The most common recursive-reversal bug.`},py:{code:`def reverseRec(head: ListNode | None) -> ListNode | None:
    if head is None or head.next is None:
        return head                           # already reversed
    new_head = reverseRec(head.next)          # trust: rest is reversed now
    head.next.next = head                     # old neighbor points back at me
    head.next = None                          # I am the new tail (for now)
    return new_head                           # same head bubbles all the way up`,annotations:{4:`The leap of faith: new_head is the last node of the original list, and it never changes on the way back up. Python caveat the C++ pane does not have — the default recursion limit is 1000, so a long list raises RecursionError. Say that, then offer the iterative version.`,5:`The famous line. head.next is my old neighbor — currently the tail of the reversed part. This hooks me on after it.`,6:`Without this, node 1 and node 2 point at each other forever — a two-node cycle. The most common recursive-reversal bug.`}}},{type:`intuition`,title:`Floyd: two runners on a circular track`,md:`Does the list loop back on itself? Brute force: store every visited node in a hash set, O(n) space. Floyd does it in O(1) — two runners.

- **slow** moves 1 node per tick, **fast** moves 2. If the track has an exit (a null), fast reaches it first: no cycle.
- If there is a cycle, both runners eventually orbit inside it. Now think relatively: fast gains **exactly 1 step per tick** on slow.
- A gap that shrinks by exactly 1 cannot jump over 0: gap g goes g−1, g−2, … 0. They MUST land on the same node.
- That is the entire proof — no jumping over is possible because the relative speed is 1.
- Named problem: *Linked List Cycle*. O(n) time, O(1) space — the space is the whole point.`},{type:`code`,lang:`cpp`,title:`Cycle detection — Floyd phase 1`,code:`bool hasCycle(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;            // 1 step
        fast = fast->next->next;      // 2 steps
        if (slow == fast)
            return true;              // same NODE: they met on the track
    }
    return false;                     // fast found an end: no cycle
}`,annotations:{4:`Only fast needs null checks — it runs ahead, so it hits any end first. Checking fast->next before fast->next->next is the crash guard.`,7:`Compare pointers, never values — duplicated values are everywhere, but two pointers equal means the SAME node.`},py:{code:`def hasCycle(head: ListNode | None) -> bool:
    slow = head
    fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next              # 1 step
        fast = fast.next.next         # 2 steps
        if slow is fast:
            return True               # same NODE: they met on the track
    return False                      # fast found an end: no cycle`,annotations:{4:`Only fast needs None checks — it runs ahead, so it hits any end first. Checking fast.next before fast.next.next is the crash guard.`,7:`"is", not "==": identity, not equality. == would call __eq__ and could compare values — two different nodes holding 3 are not the same node. This is precisely the C++ pointer comparison.`}}},{type:`intuition`,title:`Finding where the cycle starts`,md:`Follow-up the interviewer always asks: not "is there a cycle" but "where does it **begin**?" (*Linked List Cycle II*).

- The move: after the runners meet, send one pointer back to head. Now walk BOTH one step at a time.
- They meet again exactly at the cycle's first node. Looks like magic; it is arithmetic.
- Let L = head to cycle start, d = cycle start to meeting point, C = cycle length.
- Fast traveled twice slow's distance: 2(L + d) = L + d + kC, so **L = kC − d**.
- Meaning: L steps from the head and L steps from the meeting point land on the same node — the cycle start. Equal distances.`},{type:`math`,intro:`The equal-distances argument, written out — for when the interviewer asks why resetting to head works.`,latex:[`L = \\text{head} \\to \\text{start}, \\quad d = \\text{start} \\to \\text{meeting}, \\quad C = \\text{cycle length}`,`\\text{fast} = 2 \\times \\text{slow}: \\quad 2(L + d) = L + d + kC \\implies L + d = kC`,`L = kC - d \\quad \\Rightarrow \\quad L \\text{ steps from meeting point} \\equiv \\text{cycle start}`]},{type:`code`,lang:`cpp`,title:`Cycle start — Floyd phase 2`,code:`ListNode* cycleStart(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {           // phase 1: met somewhere inside the cycle
            slow = head;              // phase 2: reset ONE pointer to head
            while (slow != fast) {
                slow = slow->next;    // both walk 1 step now -- equal speeds
                fast = fast->next;
            }
            return slow;              // first shared node = cycle start
        }
    }
    return nullptr;                   // no cycle
}`,annotations:{8:`Reset slow, keep fast at the meeting point. Both are now L steps away from the cycle start — that is the L = kC − d identity.`,10:`Phase 2 speeds are BOTH 1. Keeping fast at 2x here is the classic way to fail the follow-up.`},py:{code:`def cycleStart(head: ListNode | None) -> ListNode | None:
    slow = head
    fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:              # phase 1: met somewhere inside the cycle
            slow = head               # phase 2: reset ONE pointer to head
            while slow is not fast:
                slow = slow.next      # both walk 1 step now -- equal speeds
                fast = fast.next
            return slow               # first shared node = cycle start
    return None                       # no cycle`,annotations:{8:`Reset slow, keep fast at the meeting point. Both are now L steps away from the cycle start — that is the L = kC − d identity.`,10:`Phase 2 speeds are BOTH 1. Keeping fast at 2x here is the classic way to fail the follow-up.`}}},{type:`intuition`,title:`Merge two sorted lists: a zipper with a fake first tooth`,md:`Two sorted queues merging through one door — always let the smaller front person through. That part is easy. The pain is elsewhere: **who becomes the head of the merged list?**

- Without a trick, the first append is a special case, and each possibly-empty input adds another branch. Three edge cases before real work starts.
- The fix: a **dummy head** (sentinel) — a throwaway node parked *before* the answer.
- Now every append, including the very first, is the identical move: \`tail->next = winner\`. Zero special cases.
- Return \`dummy.next\` — the real head was built right behind the sentinel.
- One sentence to say out loud: "the dummy makes the empty-list and first-node cases identical to the general case." That sentence is the pattern.`},{type:`code`,lang:`cpp`,title:`Merge Two Sorted Lists — the dummy-head pattern`,code:`ListNode* mergeTwoLists(ListNode* a, ListNode* b) {
    ListNode dummy(0);                     // sentinel: parked before the real list
    ListNode* tail = &dummy;
    while (a != nullptr && b != nullptr) {
        if (a->val <= b->val) { tail->next = a; a = a->next; }
        else                  { tail->next = b; b = b->next; }
        tail = tail->next;
    }
    tail->next = (a != nullptr) ? a : b;   // splice the leftover chain in O(1)
    return dummy.next;                     // real head lives right after the sentinel
}`,annotations:{2:`Lives on the stack — no new, no delete. Its value is never read; only its next slot matters.`,5:`<= (not <) keeps the merge stable: equal elements keep their original relative order. Worth saying out loud.`,9:`One list ran dry; the survivor is already sorted. One pointer write splices the WHOLE remaining chain — no loop needed. Total: O(n+m) time, O(1) space.`},py:{code:`def mergeTwoLists(a: ListNode | None, b: ListNode | None) -> ListNode | None:
    dummy = ListNode(0)                    # sentinel: parked before the real list
    tail = dummy
    while a is not None and b is not None:
        if a.val <= b.val:
            tail.next = a
            a = a.next
        else:
            tail.next = b
            b = b.next
        tail = tail.next
    tail.next = a if a is not None else b  # splice the leftover chain in O(1)
    return dummy.next                      # real head lives right after the sentinel`,annotations:{2:`Just another node — no stack/heap distinction to make, and the GC drops it when the function returns. Its value is never read; only its next slot matters.`,5:`<= (not <) keeps the merge stable: equal elements keep their original relative order. Worth saying out loud.`,12:`One list ran dry; the survivor is already sorted. One attribute write splices the WHOLE remaining chain — no loop needed. Total: O(n+m) time, O(1) space.`}}},{type:`intuition`,title:`The runner technique: one pass, two speeds`,md:`No random access means no jumping to index n/2 or n−k. The workaround: two pointers with a controlled offset — **runners**.

- **Middle of the list**: slow 1x, fast 2x. When fast hits the end, slow stands at the middle. One pass. (*Middle of the Linked List*)
- **Nth from end**: the **gap runner**. Send lead n nodes ahead, then march both together. When lead falls off, trail is exactly n from the end. (*Remove Nth Node From End*)
- The brute alternative — walk once to count length, walk again to position — is two passes. The runner does it in one, and "one pass" is usually the stated constraint.
- Removing the nth node? The head might be the victim — park a dummy in front. The sentinel pattern, again.`},{type:`code`,lang:`cpp`,title:`Middle and nth-from-end — both runners`,code:`ListNode* middleNode(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;            // 1x speed
        fast = fast->next->next;      // 2x speed
    }
    return slow;                      // fast at the end => slow at the middle
}

ListNode* nthFromEnd(ListNode* head, int n) {
    ListNode* lead = head;
    for (int i = 0; i < n; i++)       // open a gap of exactly n nodes
        lead = lead->next;
    ListNode* trail = head;
    while (lead != nullptr) {         // march both; the gap stays frozen
        lead = lead->next;
        trail = trail->next;
    }
    return trail;                     // lead fell off; trail is n from the end
}`,annotations:{8:`Even length picks the SECOND middle: on 1→2→3→4 this returns node 3. Interviewers ask which one — know your loop.`,13:`The gap IS the answer encoded as a distance. After this loop, lead and trail are n apart and stay n apart.`,20:`trail points AT the nth from end. To DELETE that node, run trail from a dummy in front of head and stop one earlier.`},py:{code:`def middleNode(head: ListNode | None) -> ListNode | None:
    slow = head
    fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next              # 1x speed
        fast = fast.next.next         # 2x speed
    return slow                       # fast at the end => slow at the middle

def nthFromEnd(head: ListNode | None, n: int) -> ListNode | None:
    lead = head
    for _ in range(n):                # open a gap of exactly n nodes
        lead = lead.next
    trail = head
    while lead is not None:           # march both; the gap stays frozen
        lead = lead.next
        trail = trail.next
    return trail                      # lead fell off; trail is n from the end`,annotations:{7:`Even length picks the SECOND middle: on 1→2→3→4 this returns node 3. Interviewers ask which one — know your loop.`,11:`The gap IS the answer encoded as a distance. _ is the throwaway loop variable: the count matters, the index does not. After this loop lead and trail are n apart and stay n apart.`,17:`trail points AT the nth from end. To DELETE that node, run trail from a dummy in front of head and stop one earlier.`}}},{type:`intuition`,title:`LRU cache: the design classic`,md:`The spec: capacity k, \`get(key)\` and \`put(key, value)\`, both **O(1)**, and when full, evict the **least-recently-used** entry. Every structure alone fails — the combination is the answer.

- Hashmap alone: O(1) lookup, but "which key is oldest?" needs an O(n) scan. Fail.
- Timestamps in the map: put is O(1) but eviction still scans for the minimum. Fail.
- Doubly-linked list alone: perfect recency order (front = hottest, back = coldest), but finding a key is O(n). Fail.
- The combo: **hashmap maps key → the node's address inside a doubly-linked list**. Find in O(1) via the map, move-to-front in O(1) by relinking pointers.
- Why *doubly* linked: unlinking a node in O(1) requires instant access to its predecessor. Singly linked would walk O(n) to find it.`},{type:`visual`,component:`CacheSimulator`,props:{}},{type:`code`,lang:`cpp`,title:`LRU Cache — std::list + unordered_map, all O(1)`,code:`class LRUCache {
    int cap;
    list<pair<int,int>> items;    // doubly-linked {key, value}; front = most recent
    unordered_map<int, list<pair<int,int>>::iterator> pos;   // key -> its node
public:
    LRUCache(int capacity) : cap(capacity) {}

    int get(int key) {
        auto it = pos.find(key);
        if (it == pos.end()) return -1;
        items.splice(items.begin(), items, it->second);   // move node to front, O(1)
        return it->second->second;
    }

    void put(int key, int value) {
        auto it = pos.find(key);
        if (it != pos.end()) {
            it->second->second = value;                   // overwrite value
            items.splice(items.begin(), items, it->second);
            return;
        }
        if ((int)items.size() == cap) {
            pos.erase(items.back().first);                // evict the coldest: the back
            items.pop_back();
        }
        items.push_front({key, value});
        pos[key] = items.begin();
    }
};`,annotations:{3:`std::list IS a doubly-linked list — you rarely hand-roll the nodes in C++. Front = just used, back = candidate for eviction.`,4:`The map stores list ITERATORS — effectively node addresses. This is the O(1) bridge between "find by key" and "move in recency order".`,11:`splice relinks pointers to move an existing node — no copy, no allocation, and list iterators stay valid through it. The whole design hinges on this.`,23:`Eviction order matters: erase the map entry FIRST (you need back() alive to read its key), then pop the node.`},py:{code:`from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.items = OrderedDict()          # key -> value, in recency order

    def get(self, key: int) -> int:
        if key not in self.items:
            return -1
        self.items.move_to_end(key)         # mark most recent, O(1)
        return self.items[key]

    def put(self, key: int, value: int) -> None:
        if key in self.items:
            self.items[key] = value         # overwrite value
            self.items.move_to_end(key)
            return
        if len(self.items) == self.cap:
            self.items.popitem(last=False)  # evict the coldest: the front
        self.items[key] = value             # new keys land at the recent end`,annotations:{6:`OrderedDict is the C++ list + unordered_map already fused: a dict with a doubly-linked list threaded through it. That is why there is no map-of-iterators here — the stdlib ships the whole design. Say that, then show you know what it is made of.`,11:`move_to_end IS splice: it relinks the node inside the recency list without copying the value. O(1), and it is the line the entire design hinges on.`,20:`popitem(last=False) pops the least-recently-used end and drops the key in one move — so the C++ ordering trap (erase the map entry while back() is still alive) simply cannot happen here.`}}},{type:`note`,md:`Trigger phrases → pattern, for the road:

- "reverse in place" → the prev/cur/next dance, return prev
- "does it loop" / "O(1) space" → Floyd's two runners
- "merge sorted anything" / "build a new list" → dummy head
- "middle" / "kth from end" / "one pass" → runner with a gap
- "O(1) get and put with eviction" → hashmap + doubly-linked list`}],quiz:[{question:`The iterative reversal loop ends when cur becomes nullptr. What do you return?`,options:[{text:`cur`,explanation:`cur is nullptr at that moment — returning it returns an empty list. The classic final-line slip.`},{text:`prev`,explanation:`Correct. prev holds the last real node processed — the head of the fully reversed list.`},{text:`head`,explanation:`head still points at the ORIGINAL first node — now the tail of the reversed list.`},{text:`next`,explanation:`next is also nullptr when the loop exits — it mirrors cur one step ahead.`}],correct:1},{question:`In the reversal loop you write cur->next = prev BEFORE saving next = cur->next. What happens?`,options:[{text:`Works fine — order does not matter`,explanation:`Order is everything here. The flip destroys the only pointer to the rest of the list.`},{text:`The rest of the list is lost — next reads the already-flipped pointer and the loop ends after node 1`,explanation:`Correct. cur->next now points backward, so "save next" saves prev. You return a one-node list; nodes 2…n leak.`},{text:`Infinite loop`,explanation:`It actually terminates fast — cur becomes prev (nullptr on the first pass) and the loop exits early.`},{text:`Compile error`,explanation:`It compiles perfectly. Pointer bugs rarely announce themselves at compile time.`}],correct:1},{question:`Why MUST fast and slow meet if a cycle exists — why can fast not jump over slow?`,options:[{text:`Because the list is finite`,explanation:`Finiteness alone allows orbiting forever without meeting. The real argument is about the relative speed.`},{text:`The gap between them shrinks by exactly 1 per tick, so it hits every value down to 0 — no skipping`,explanation:`Correct. Relative speed is 2−1 = 1. A gap decreasing by exactly 1 cannot pass over 0.`},{text:`fast is twice as fast, so it meets slow within n/2 steps of the start`,explanation:`The bound is roughly right once both are in the cycle, but it does not explain why a jump-over is impossible — the unit relative speed does.`},{text:`They only meet if the cycle length is even`,explanation:`Cycle length parity is irrelevant — the gap walks down 1 per tick regardless.`}],correct:1},{question:`The runners met inside the cycle. What finds the cycle START?`,options:[{text:`Reset one pointer to head; walk both ONE step at a time; they meet at the start`,explanation:`Correct. L = kC − d makes head and meeting point equidistant from the cycle start. Equal speeds, equal distances.`},{text:`Reset one pointer to head; keep fast at 2 steps`,explanation:`Phase 2 needs EQUAL speeds — keeping 2x breaks the equal-distances argument and they meet somewhere meaningless.`},{text:`Count the cycle length first, then walk from head`,explanation:`This can be made to work, but it is extra passes and extra code. The reset trick does it directly.`},{text:`Store visited nodes in a hash set and return the first repeat`,explanation:`Works — in O(n) extra space. The whole point of Floyd is doing it in O(1).`}],correct:0},{question:`What does the dummy (sentinel) node in mergeTwoLists actually buy you?`,options:[{text:`Faster merging`,explanation:`Complexity is identical — O(n+m) either way. The dummy buys correctness simplicity, not speed.`},{text:`The first append and the empty-list cases become identical to the general case — no special-case branches`,explanation:`Correct. Every append is tail->next = winner, including the first. Return dummy.next and the edge cases never existed.`},{text:`It stores the length of the merged list`,explanation:`The dummy's value is never even read — only its next slot matters.`},{text:`It prevents cycles in the result`,explanation:`Nothing about a sentinel prevents cycles — that is not its job.`}],correct:1},{question:"middleNode with the loop `while (fast && fast->next)` runs on 1→2→3→4. Which node comes back?",options:[{text:`Node 2`,explanation:`That would be the FIRST middle — this loop overshoots it. Tracing: slow lands on 3.`},{text:`Node 3`,explanation:`Correct. slow: 1→2→3, fast: 1→3→null. Even-length lists return the SECOND middle with this loop shape.`},{text:`Node 4`,explanation:`fast reaches the end; slow travels half as far — never the last node on length 4.`},{text:`Depends on the compiler`,explanation:`Pure pointer logic — fully deterministic on every compiler.`}],correct:1},{question:`Why does LRU need a DOUBLY-linked list — why not singly linked?`,options:[{text:`Doubly-linked lists use less memory`,explanation:`Opposite — the extra prev pointer costs MORE memory. The win is elsewhere.`},{text:`Unlinking an arbitrary node in O(1) requires reaching its predecessor instantly — singly linked must walk O(n) to find it`,explanation:`Correct. get() must move a middle node to the front. Without prev, finding who points at you is a full scan.`},{text:`Singly-linked lists cannot store key-value pairs`,explanation:`They store any payload fine. The limitation is navigation, not storage.`},{text:`The hashmap only works with doubly-linked nodes`,explanation:`The map stores node addresses — it is agnostic about the node type.`}],correct:1},{question:`Space complexity of RECURSIVE list reversal?`,options:[{text:`O(1) — no containers allocated`,explanation:`No heap allocations, true — but every recursive call is a stack frame, and there are n of them.`},{text:`O(n) — one stack frame per node`,explanation:`Correct. The recursion goes n deep before unwinding. Iterative reversal is the O(1)-space version.`},{text:`O(log n) — like binary search`,explanation:`log-depth needs the problem to HALVE per call. This recursion shrinks by one node per call: depth n.`}],correct:1}],interviewQuestions:[{question:`Reverse a singly linked list in place. Walk me through the pointers and state the invariant.`,answer:`Three pointers: prev (starts nullptr), cur (starts head), next (scratch). Loop while cur: save next = cur->next; flip cur->next = prev; advance prev = cur, cur = next. Return prev. The invariant to state out loud: after every iteration, prev heads a correctly reversed prefix and cur heads the untouched suffix — the list is never in a broken state you cannot recover from. O(n) time, O(1) space. The two graded details: saving next BEFORE the flip, and returning prev (cur is nullptr at exit).`,isCaseBased:!1},{question:`Now reverse it recursively. What is the "trust the recursion" framing, and what does it cost?`,answer:`Base case: null or single node returns itself. Otherwise trust that reverseRec(head->next) returns the rest fully reversed — do not trace it. After that call, head->next is the TAIL of the reversed part, so two writes finish: head->next->next = head (old neighbor points back at me), head->next = nullptr (I am the new tail). newHead passes through unchanged from the deepest call. Cost: O(n) time, O(n) stack — one frame per node, and a 10⁵-node list can overflow the stack. Conclusion worth volunteering: iterative is strictly better here; recursive proves you understand the structure.`,isCaseBased:!1},{question:`Prove Floyd's cycle detection works — why must fast and slow meet, and what are the complexities?`,answer:`If no cycle, fast hits null in O(n) — done. If a cycle exists, both runners eventually enter it. Inside the cycle, look at the gap from fast to slow (measured along the running direction): each tick, slow moves 1 and fast moves 2, so the gap shrinks by exactly 1 (mod cycle length C). A quantity that decreases by exactly 1 per step must pass through 0 — it cannot jump over it. Gap 0 means same node: they met, within at most C ticks of both being inside. Total O(n) time, O(1) space. The O(1) space is the entire reason this beats the hash-set approach.`,isCaseBased:!1},{question:`Case: you answered cycle detection with a visited hash set, and the interviewer follows up: "Do it in O(1) space." Respond, including why your reset-to-head trick finds the cycle start.`,answer:`Acknowledge the tradeoff first: the set is O(n) time AND O(n) space; Floyd keeps O(n) time at O(1) space. Phase 1: slow 1x, fast 2x until they meet (proof: gap shrinks by 1 per tick). Phase 2 for the start: let L = head→start, d = start→meeting point, C = cycle length. Fast traveled twice slow's distance: 2(L+d) = L+d+kC, so L = kC − d. That means walking L steps from the head and L steps from the meeting point both arrive at the cycle start. So: reset one pointer to head, advance both at 1x, and their first meeting IS the start. Same O(n)/O(1).`,isCaseBased:!0},{question:`Merge two sorted lists. Why does everyone use a dummy head, and what is the complexity story?`,answer:`Compare fronts, append the smaller to a growing tail, advance that list. Without a dummy: the first append must special-case "the result is empty", and each input being empty adds branches. With a stack-allocated dummy node and tail = &dummy, EVERY append — including the first — is the same two lines, and empty inputs fall through naturally. When one list dries up, splice the survivor with one pointer write (it is already sorted). Return dummy.next. O(n+m) time, O(1) extra space since nodes are reused, not copied. Use <= to keep the merge stable. The dummy-head sentence to say: it makes edge cases identical to the general case.`,isCaseBased:!1},{question:`Case: after your two-list merge, the interviewer follows up — "now merge k sorted lists, total N nodes." Take it brute → better → best.`,answer:`Brute: merge lists into an accumulator one by one — the accumulator grows toward N, so cost is O(N·k). Better: divide and conquer — merge in pairs, then pairs of pairs; each of the log k rounds touches all N nodes: O(N log k), O(1) extra space reusing the two-list merge. Equally good: a min-heap of the k current heads — pop the smallest, push its successor; N pops at O(log k) each = O(N log k), O(k) heap space (in C++: priority_queue with a greater-comparator on node values). I would code the heap version — shorter and the "merge k streams" idea generalizes to external sorting and log merging.`,isCaseBased:!0},{question:`Find the middle of a linked list in ONE pass. Why does the one-pass constraint even exist, and which middle does your loop return for even lengths?`,answer:`Runner technique: slow 1x, fast 2x, loop while fast && fast->next; slow ends at the middle. One pass matters because the obvious alternative — count length, walk n/2 — is two passes, and interviewers use the constraint to test whether you know the pattern (it also matters for genuinely stream-like inputs). With this loop shape, even length returns the SECOND middle (on 1→2→3→4, node 3); stopping at fast->next->next instead shifts to the first middle. Knowing which one your loop gives — and being able to flip it — is exactly the follow-up. O(n) time, O(1) space.`,isCaseBased:!1},{question:`Remove the nth node from the end in one pass. Where do people go wrong?`,answer:`Gap runner: advance lead n steps from a DUMMY node in front of head, then march lead and trail together until lead->next is null (or lead is null, depending on the offset you chose); trail now sits just BEFORE the victim, so trail->next = trail->next->next unlinks it. Two failure spots: (1) forgetting the dummy — if the head itself is the nth from end, there is no "node before it" without a sentinel; (2) off-by-one in the gap — decide whether trail should land ON the victim or BEFORE it, and size the gap for that. O(n) one pass, O(1) space. In non-GC C++, mention deleting the removed node.`,isCaseBased:!1},{question:`Design an LRU cache with O(1) get and put. Walk through why the hashmap + doubly-linked-list combination is forced.`,answer:`Requirements: O(1) find by key, O(1) recency update, O(1) eviction of the oldest. Eliminate candidates: hashmap alone has no recency order (eviction O(n)); map + timestamps still scans for the minimum; a list alone finds keys in O(n); a balanced tree gives O(log n), not O(1). The forced design: a doubly-linked list ordered by recency (front = just used, back = evict next), plus a hashmap from key to that node's address. get: map lookup, unlink node, relink at front — all O(1). put: update-and-move if present; if full, evict the back node (its key removes the map entry), push the new node at front. Doubly-linked because O(1) unlink needs the prev pointer. In C++: std::list + unordered_map, with list::splice doing the move-to-front without invalidating stored iterators.`,isCaseBased:!1},{question:`Case: a teammate's LRU cache passes correctness tests but TLEs at scale. Their recency order is a vector<int> of keys, moved-to-front on every get. Diagnose and fix.`,answer:`The vector is the bottleneck: moving a key to the front means finding it — O(n) scan — then erasing from the middle — O(n) shift. Every get is O(n), so a workload of m gets is O(m·n): correct, and hopeless at scale. The fix is the standard combo: replace the vector with a doubly-linked list (std::list) and store each key's node iterator in the hashmap; move-to-front becomes list::splice — pure pointer relinking, O(1), no shifting, and std::list iterators stay valid across splice. Same public behavior, get/put drop from O(n) to O(1). The transferable lesson: vectors pay O(n) for middle removal; when a structure's job is "reorder cheaply", linked lists earn their existence.`,isCaseBased:!0},{question:`Honest systems question: if linked lists solve all these problems, why do real codebases almost always use vector?`,answer:`Cache locality. A vector's elements are contiguous — iterating streams through cache lines the prefetcher fills ahead of you. List nodes are separate heap allocations scattered across memory: every ->next is a potential cache miss (~100x slower than a cache hit), plus per-node allocation cost and pointer overhead. Benchmarks show vector beating list even for middle-insertion workloads at realistic sizes, because O(n) contiguous shifting is faster than O(n) pointer-chasing to find the spot. Lists win narrowly: O(1) splice between containers, iterators/references that survive insertion elsewhere, and intrusive lists in kernels and allocators where nodes must not move. Interviewers love this answer because it shows you know Big-O is not the whole story.`,isCaseBased:!1}],flashcards:[{front:`Iterative reversal — the four beats`,back:`next = cur->next (save) → cur->next = prev (flip) → prev = cur → cur = next. Loop while cur. Return PREV. O(n) time, O(1) space.`},{front:`Recursive reversal — the two magic lines`,back:`head->next->next = head; head->next = nullptr; (after trusting reverseRec(head->next)). Costs O(n) stack — iterative wins on space.`},{front:`Why fast & slow MUST meet in a cycle`,back:`Relative speed = 1: the gap shrinks by exactly 1 per tick (mod C), so it hits 0 — no jumping over. O(n) time, O(1) space.`},{front:`Cycle START after the meeting`,back:`Reset one pointer to head; both walk 1x; first meeting = cycle start. Because 2(L+d) = L+d+kC ⟹ L = kC − d: equal distances.`},{front:`Dummy head (sentinel) — when and why`,back:`Any "build/modify a list where the head might change" problem. Makes first-append and empty cases identical to the general case. Return dummy.next.`},{front:`Middle of list — loop shape`,back:`slow 1x, fast 2x, while (fast && fast->next). Even length → SECOND middle (1→2→3→4 gives 3).`},{front:`Nth from end — gap runner`,back:`lead goes n ahead; then lead and trail march together; lead falls off ⟹ trail is nth from end. One pass. Deleting? Start trail at a dummy.`},{front:`LRU cache — the structure combo`,back:`unordered_map (key → node address) + doubly-linked list (front = most recent, evict from back). get and put both O(1).`},{front:`Why LRU needs DOUBLY linked`,back:`Move-to-front requires unlinking an arbitrary node in O(1) — impossible without an instant prev pointer. In C++, list::splice does the move.`},{front:`List vs vector — the honest line`,back:`Vectors win real systems via cache locality (contiguous memory, prefetching). Lists win O(1) splice + stable iterators. Interviews test lists for pointer discipline.`}],mindmapMarkdown:`- Linked Lists: Reverse, Cycles, Merge & LRU
  - Node anatomy
    - val + next pointer; list = head pointer
    - O(k) to reach index k; O(1) insert at a held node
    - Honest note: vector wins real systems (cache locality)
  - Reversal
    - Iterative: prev/cur/next dance, return prev
    - Save next BEFORE the flip
    - Recursive: trust the recursion
    - head->next->next = head; head->next = nullptr
    - O(n) stack vs iterative O(1)
  - Floyd cycles
    - slow 1x, fast 2x — gap shrinks by 1, must hit 0
    - Compare pointers, not values
    - Start: reset to head, both 1x — L = kC − d
  - Merge sorted lists
    - Dummy head kills edge cases
    - <= keeps it stable; splice leftovers O(1)
    - Follow-up: k lists → heap or pairwise, O(N log k)
  - Runner technique
    - Middle: fast && fast->next → second middle
    - Nth from end: gap of n, march together
    - Deleting? dummy in front, again
  - LRU cache
    - unordered_map + doubly-linked list
    - front = hottest, evict from back
    - splice = O(1) move-to-front
    - Doubly because O(1) unlink needs prev`};export{e as default};