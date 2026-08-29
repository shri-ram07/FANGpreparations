import type { Module } from '../types'

const m: Module = {
  id: 'dsa-l1-hashing',
  subjectId: 'dsa',
  level: 1,
  title: 'Hashing: Maps, Sets & Frequency Patterns',
  whyItMatters:
    'Two Sum is the most-attempted interview problem on earth, and its answer is a hash map. Half of all easy-medium rounds reduce to one of two questions — "have I seen this before?" or "how many times?" — and hashing answers both in O(1). This module gives you the machine underneath (buckets, chaining, rehash) so "average O(1)" is a claim you can defend, plus the two pattern families that turn it into accepted solutions.',
  estMinutes: 40,
  sections: [
    {
      type: 'intuition',
      title: 'A key goes in, a mailbox number comes out',
      md: `An apartment lobby has 5 mailboxes, numbered 0–4. The postman's rule: crunch the resident's name into a big number, take it mod 5, drop the letter in that box.

- A **hash function** is that rule: any key → a big number → \`% bucket_count\` → a **bucket index**.
- **Deterministic**: the same key lands in the same bucket, every single time. That is what makes lookup possible — to find "amy", re-run the rule and open exactly one box.
- Hashing a key costs the same whether the table holds 10 items or 10 million.
- That is the whole magic of O(1): jump straight to the right mailbox instead of searching all of them.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'A toy hash function — enough to see the machinery',
      code: `size_t bucketOf(const string& key, size_t buckets) {
    size_t h = 0;
    for (char c : key)
        h = h * 31 + c;    // mix each character into the running value
    return h % buckets;    // fold the huge number into a small index
}
// bucketOf("amy", 5) == 2    (h = 96717)
// bucketOf("ian", 5) == 2    (h = 104022 -- same bucket: COLLISION)
// bucketOf("zed", 5) == 3    (h = 120473)`,
      annotations: {
        4: 'Multiply-by-prime-and-add is the classic string hash (Java uses 31 too). The exact recipe matters less than: deterministic, fast, spreads keys out.',
        5: 'The modulus squeezes an astronomically large space of possible keys into a handful of buckets. That squeeze is where collisions come from.',
        8: '"amy" and "ian" hash to different numbers, but % 5 lands both in bucket 2. Different keys, same box — the table must survive this.',
      },
      py: {
        code: `def bucketOf(key: str, buckets: int) -> int:
    h = 0
    for c in key:
        h = h * 31 + ord(c)   # mix each character into the running value
    return h % buckets        # fold the huge number into a small index

# bucketOf("amy", 5) == 2    (h = 96717)
# bucketOf("ian", 5) == 2    (h = 104022 -- same bucket: COLLISION)
# bucketOf("zed", 5) == 3    (h = 120473)`,
        annotations: {
          4: 'Multiply-by-prime-and-add is the classic string hash (Java uses 31 too). ord(c) is the C++ implicit char-to-int. The exact recipe matters less than: deterministic, fast, spreads keys out.',
          5: 'The modulus squeezes an astronomically large space of possible keys into a handful of buckets. That squeeze is where collisions come from. (Python\'s own hash() for str is salted per process — never persist it.)',
          8: '"amy" and "ian" hash to different numbers, but % 5 lands both in bucket 2. Different keys, same box — the table must survive this.',
        },
      },
    },
    {
      type: 'intuition',
      title: 'Collisions: two letters, one mailbox',
      md: `Six letters, five mailboxes — some box gets two. That is the **pigeonhole principle**, and it is why collisions are not a bug you can fix but a certainty you must handle.

- Infinitely many possible keys, finitely many buckets → some keys MUST share.
- The standard fix is **chaining**: each bucket holds a short list, and colliding keys line up in it.
- Lookup becomes two steps: hash to the bucket (O(1)), then walk that bucket's chain comparing keys with \`==\` until the match.
- Short chains → effectively O(1). Every key in ONE chain → a linked-list scan, O(n).
- Everything the table does from here on has one goal: **keep the chains short**.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Inside the hash table: insert, collide, rehash',
        notice: 'Same three keys as the code above. Watch bucket 2 grow a chain, then watch the rehash dissolve it.',
        leftLabel: 'incoming keys',
        rightLabel: 'buckets 0–4',
        frames: [
          {
            note: 'insert("amy"): hash = 96717, and 96717 % 5 = 2. Straight into bucket 2 — no search, no scan.',
            stack: [{ name: 'amy: 96717 % 5', value: '2', to: 'b2' }],
            heap: [
              { id: 'b0', value: 'empty', label: 'bucket 0' },
              { id: 'b1', value: 'empty', label: 'bucket 1' },
              { id: 'b2', value: 'amy', label: 'bucket 2' },
              { id: 'b3', value: 'empty', label: 'bucket 3' },
              { id: 'b4', value: 'empty', label: 'bucket 4' },
            ],
          },
          {
            note: 'insert("zed"): 120473 % 5 = 3. Different key, different bucket — the ideal case, chains of length ≤ 1.',
            stack: [{ name: 'zed: 120473 % 5', value: '3', to: 'b3' }],
            heap: [
              { id: 'b0', value: 'empty', label: 'bucket 0' },
              { id: 'b1', value: 'empty', label: 'bucket 1' },
              { id: 'b2', value: 'amy', label: 'bucket 2' },
              { id: 'b3', value: 'zed', label: 'bucket 3' },
              { id: 'b4', value: 'empty', label: 'bucket 4' },
            ],
          },
          {
            note: 'insert("ian"): 104022 % 5 = 2 — bucket 2 is taken. COLLISION. Chaining: ian joins amy\'s list. Lookups in bucket 2 now walk a 2-link chain.',
            stack: [{ name: 'ian: 104022 % 5', value: '2', to: 'b2', danger: true }],
            heap: [
              { id: 'b0', value: 'empty', label: 'bucket 0' },
              { id: 'b1', value: 'empty', label: 'bucket 1' },
              { id: 'b2', value: 'amy → ian', label: 'chain, length 2' },
              { id: 'b3', value: 'zed', label: 'bucket 3' },
              { id: 'b4', value: 'empty', label: 'bucket 4' },
            ],
          },
          {
            note: 'REHASH: chains are getting long, so the table doubles to 10 buckets and re-inserts EVERY key with the new modulus (% 10). amy and ian split apart — the chain dissolves. This pass is O(n), but doubling makes it rare: inserts stay amortized O(1).',
            stack: [
              { name: 'amy: 96717 % 10', value: '7', to: 'n7' },
              { name: 'ian: 104022 % 10', value: '2', to: 'n2' },
              { name: 'zed: 120473 % 10', value: '3', to: 'n3' },
            ],
            heap: [
              { id: 'old', value: 'amy → ian | zed', label: 'old 5-bucket table', freed: true },
              { id: 'n2', value: 'ian', label: 'bucket 2 of 10' },
              { id: 'n3', value: 'zed', label: 'bucket 3 of 10' },
              { id: 'n7', value: 'amy', label: 'bucket 7 of 10' },
            ],
          },
        ],
      },
    },
    {
      type: 'note',
      md: `**Load factor** = size ÷ bucket_count = the average chain length. \`unordered_map\` rehashes when it crosses 1.0 (the default \`max_load_factor\`): allocate ~double the buckets, re-hash every key into its new home. One rehash is O(n) — but doubling makes rehashes geometrically rare, so the copies sum to under 2n across n inserts: **amortized O(1)** per insert. Exactly the vector push_back argument, wearing a different hat. Know the final size? \`m.reserve(n)\` skips every rehash.`,
    },
    {
      type: 'intuition',
      title: 'O(1) average, O(n) worst — always say both',
      md: `- **Average O(1)** assumes keys spread evenly across buckets — true for a decent hash on ordinary data, which is why everyone quotes it.
- **Worst case O(n)**: every key crammed into one bucket. The table degrades into a linked list wearing a costume.
- The honest sentence interviewers want: *"average O(1), worst O(n) — and the worst case is reachable on purpose."* **Adversarial inputs** crafted to collide (hash flooding) can force it; competitive-programming judges famously break \`unordered_map\` with anti-hash tests.
- Defenses: a randomized custom hash (so attackers cannot predict buckets), or fall back to \`map\`'s guaranteed O(log n).`,
    },
    {
      type: 'note',
      md: `Hash vs tree, one breath: \`unordered_map\`/\`unordered_set\` = hash table — average O(1), no order. \`map\`/\`set\` = red-black tree — guaranteed O(log n), keys always sorted, so range queries and \`lower_bound\` work. Rule: counting and membership → unordered; ordering, "smallest key ≥ x", sorted output → tree. The full container price list lives in the C++ STL module (*STL Mastery — the DSA Toolkit*).`,
    },
    {
      type: 'intuition',
      title: 'Pattern family 1: frequency counting',
      md: `Trigger phrases: *"how many times"*, *"most frequent"*, *"appears more than"*, *"anagram"*. The recipe never changes: one pass, \`freq[x]++\`, then interrogate the counts.

- **Majority Element** — the value appearing more than n/2 times. Count; the first count to exceed n/2 wins.
- **Top K Frequent** — count, then pick the k largest counts (a heap does the picking — bridge to the heaps module).
- **First Unique Character** — count, then re-scan the *input* for the first count-of-1.
- Same skeleton solves Valid Anagram (two frequency maps, compare) and Ransom Note.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Majority Element — the frequency skeleton',
      code: `int majorityElement(const vector<int>& a) {
    unordered_map<int, int> freq;          // value -> times seen so far
    for (int x : a)
        if (++freq[x] > (int)a.size() / 2)
            return x;                      // majority proven mid-scan
    return -1;                             // unreachable if a majority exists
}
// {2, 2, 1, 1, 2}: count of 2 reaches 3 > 5/2 = 2 -> returns 2`,
      annotations: {
        2: 'operator[] on a missing key inserts 0 first — a landmine in read-only checks, but PERFECT for counting: no "does it exist" dance.',
        4: '++freq[x] increments and tests in one move. O(n) time, O(n) space — n/2 distinct values could appear before the majority shows.',
        8: 'Desk-check: counts of 2 go 1, 2 (both ≤ 2), then the last 2 makes 3 > 2 — return fires on the final element.',
      },
      py: {
        code: `from collections import defaultdict

def majorityElement(a: list[int]) -> int:
    freq = defaultdict(int)                # value -> times seen so far
    for x in a:
        freq[x] += 1
        if freq[x] > len(a) // 2:
            return x                       # majority proven mid-scan
    return -1                              # unreachable if a majority exists

# [2, 2, 1, 1, 2]: count of 2 reaches 3 > 5//2 = 2 -> returns 2`,
        annotations: {
          4: 'defaultdict(int) IS C++ operator[]: a missing key materializes as 0 on first touch. A plain dict would raise KeyError here — that is the one-line difference between the two panes.',
          6: 'No ++ in Python, so increment and test are two lines instead of C++\'s one. O(n) time, O(n) space — n/2 distinct values could appear before the majority shows.',
          11: 'Desk-check: counts of 2 go 1, 2 (both ≤ 2), then the last 2 makes 3 > 2 — return fires on the final element.',
        },
      },
    },
    {
      type: 'note',
      md: `The O(1)-space upgrade — **Boyer–Moore voting**: keep one \`candidate\` and a \`count\`. Same element → count++; different → count−−; count hits 0 → crown the current element as the new candidate. A true majority (> n/2) survives every pair-off, so the final candidate is the answer — one pass, O(1) space. Caveat to say out loud: if a majority is NOT guaranteed, a second verification pass is required. Lead with the hash map, then offer Boyer–Moore as the follow-up flex.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Top K Frequent — frequency map meets a k-sized heap',
      code: `vector<int> topKFrequent(const vector<int>& a, int k) {
    unordered_map<int, int> freq;
    for (int x : a) freq[x]++;                 // phase 1: count, O(n)

    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> heap;
    for (auto& [val, cnt] : freq) {            // phase 2: keep the k best
        heap.push({cnt, val});
        if ((int)heap.size() > k) heap.pop();  // evict the weakest survivor
    }
    vector<int> out;
    while (!heap.empty()) { out.push_back(heap.top().second); heap.pop(); }
    return out;                                // O(n log k) total
}`,
      annotations: {
        5: 'The min-heap incantation (greater<> flips the default max-heap). Pairs compare by .first, so the SMALLEST count sits on top — ready to be evicted.',
        8: 'The heap never exceeds k+1 elements, so every push/pop is O(log k), not O(log n). That cap is the entire trick.',
        12: 'O(n log k) beats sort-everything O(n log n) whenever k is small — say this comparison unprompted. Heaps get their own module; this is the bridge.',
      },
      py: {
        code: `import heapq
from collections import Counter

def topKFrequent(a: list[int], k: int) -> list[int]:
    freq = Counter(a)                      # phase 1: count, O(n)

    heap = []                              # min-heap of (count, value)
    for val, cnt in freq.items():          # phase 2: keep the k best
        heapq.heappush(heap, (cnt, val))
        if len(heap) > k:
            heapq.heappop(heap)            # evict the weakest survivor
    return [val for cnt, val in heap]      # O(n log k) total`,
        annotations: {
          7: 'heapq is ALWAYS a min-heap, so the C++ greater<> incantation just disappears. Tuples compare by their first element, so the smallest count sits at heap[0] — ready to be evicted.',
          10: 'The heap never exceeds k+1 elements, so every push/pop is O(log k), not O(log n). That cap is the entire trick.',
          12: 'O(n log k) beats sort-everything O(n log n) whenever k is small — say this comparison unprompted. (Counter(a).most_common(k) is the library answer: mention it, then show this.)',
        },
      },
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'First Unique Character — the array-as-map trick',
      code: `int firstUniqChar(const string& s) {
    int freq[26] = {0};                    // fixed alphabet: array beats hash map
    for (char c : s) freq[c - 'a']++;      // pass 1: count everything
    for (int i = 0; i < (int)s.size(); i++)
        if (freq[s[i] - 'a'] == 1)
            return i;                      // pass 2: first count-of-1 index
    return -1;
}
// "leetcode" -> 0 ('l' appears once)      "aabb" -> -1`,
      annotations: {
        2: 'When keys are lowercase letters, the "hash function" is c - \'a\': perfect, collision-free, cache-friendly. Reaching for unordered_map here is overkill.',
        6: 'Order comes from re-scanning the INPUT, not the map — hash containers have no useful order to iterate. A classic wrong answer iterates the map.',
      },
      py: {
        code: `def firstUniqChar(s: str) -> int:
    freq = [0] * 26                        # fixed alphabet: array beats hash map
    for c in s:
        freq[ord(c) - ord('a')] += 1       # pass 1: count everything
    for i, c in enumerate(s):
        if freq[ord(c) - ord('a')] == 1:
            return i                       # pass 2: first count-of-1 index
    return -1

# "leetcode" -> 0 ('l' appears once)      "aabb" -> -1`,
        annotations: {
          2: 'When keys are lowercase letters, the "hash function" is ord(c) - ord(\'a\'): perfect, collision-free, cache-friendly. Reaching for a dict here is overkill.',
          5: 'Order comes from re-scanning the INPUT, not the map. Python dicts do preserve insertion order (3.7+), so iterating freq would actually work — but the array-as-map version has no order at all, and the habit of re-scanning the input is what transfers.',
        },
      },
    },
    {
      type: 'intuition',
      title: 'Pattern family 2: the seen-set',
      md: `The other half of hashing interviews is one question asked in a loop: *"have I seen this before?"* An \`unordered_set\` is a memory of the past with O(1) recall.

- **Contains Duplicate** — insert as you scan; if \`insert\` reports the element already exists, there is your duplicate. One line, one pass.
- **Two Sum** — THE canonical. Don't search for pairs; for each element ask whether its **complement** (\`target − a[i]\`) was already seen. One lookup replaces an entire inner loop.
- The storyline to narrate: brute force all pairs O(n²) → sort + two pointers O(n log n), but sorting destroys the indices the answer needs → one-pass hash map, O(n) time, O(n) space.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Two Sum — one pass, complement lookup',
      code: `vector<int> twoSum(const vector<int>& a, int target) {
    unordered_map<int, int> seen;          // value -> index where it appeared
    for (int i = 0; i < (int)a.size(); i++) {
        int need = target - a[i];          // the complement
        auto it = seen.find(need);
        if (it != seen.end())
            return {it->second, i};        // partner seen earlier: done
        seen[a[i]] = i;                    // record AFTER the check
    }
    return {};                             // problem guarantees one answer
}
// {2, 7, 11, 15}, target 9: i=1 needs 2 -> seen at index 0 -> {0, 1}`,
      annotations: {
        5: 'find, never seen[need] — operator[] would INSERT need with index 0 and poison later lookups. Read-only questions use find/count.',
        8: 'Insert after the check, and {3, 3} with target 6 just works: at i=1, "need 3" finds the i=0 entry. Insert-before-check would let an element match itself.',
        12: 'Desk-check: i=0 needs 7 (absent), records 2->0. i=1 needs 2, found at 0. Answer {0, 1} in two iterations.',
      },
      py: {
        code: `def twoSum(a: list[int], target: int) -> list[int]:
    seen = {}                              # value -> index where it appeared
    for i, x in enumerate(a):
        need = target - x                  # the complement
        if need in seen:
            return [seen[need], i]         # partner seen earlier: done
        seen[x] = i                        # record AFTER the check
    return []                              # problem guarantees one answer

# [2, 7, 11, 15], target 9: i=1 needs 2 -> seen at index 0 -> [0, 1]`,
        annotations: {
          5: '"in", then index — the read-only lookup. This is also why seen is a plain dict and not a defaultdict: a defaultdict would INSERT need on every miss and poison later lookups, exactly the C++ operator[] trap.',
          7: 'Insert after the check, and [3, 3] with target 6 just works: at i=1, "need 3" finds the i=0 entry. Insert-before-check would let an element match itself.',
          10: 'Desk-check: i=0 needs 7 (absent), records 2->0. i=1 needs 2, found at 0. Answer [0, 1] in two iterations.',
        },
      },
    },
    {
      type: 'intuition',
      title: 'Longest Consecutive Sequence — only start at heads',
      md: `Given \`{100, 4, 200, 1, 3, 2}\`, the longest run of consecutive integers is 1-2-3-4 → length 4. Sorting solves it in O(n log n); the interviewer wants O(n).

- Dump everything into an \`unordered_set\`. Now any "is x+1 present?" question is O(1).
- The trick: only start counting from a **sequence head** — an x where \`x − 1\` is NOT in the set. Then walk right: x+1, x+2, … until the chain breaks.
- 4 is not a head (3 exists), so it is never a starting point — it gets counted exactly once, during 1's walk.
- Why O(n): every element is visited by at most one walk. Two passes total, despite the loop-inside-a-loop shape.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'The O(n) heads-only walk',
      code: `int longestConsecutive(const vector<int>& a) {
    unordered_set<int> s(a.begin(), a.end());
    int best = 0;
    for (int x : s) {
        if (s.count(x - 1)) continue;      // x-1 exists: x is mid-sequence, skip
        int len = 1;                       // x is a sequence HEAD
        while (s.count(x + len)) len++;    // walk right to the end of the run
        best = max(best, len);
    }
    return best;
}
// {100, 4, 200, 1, 3, 2}: heads are 100, 200, 1. From 1: 1,2,3,4 -> best = 4`,
      annotations: {
        5: 'This guard is the entire algorithm. Without it, starting a walk at every element re-counts each run from every position: O(n²) on a single long run.',
        7: 'Looks nested, is not: across ALL walks, each value is stepped onto at most once. Total work = n head-checks + n walk-steps = O(n) — argue it exactly like this.',
        12: 'Desk-check: 100 has no 99 -> head, run length 1. 4 has 3 -> skipped. 1 has no 0 -> head; 2, 3, 4 present; 5 absent -> length 4.',
      },
      py: {
        code: `def longestConsecutive(a: list[int]) -> int:
    s = set(a)
    best = 0
    for x in s:
        if x - 1 in s:
            continue                       # x-1 exists: x is mid-sequence, skip
        length = 1                         # x is a sequence HEAD
        while x + length in s:             # walk right to the end of the run
            length += 1
        best = max(best, length)
    return best

# [100, 4, 200, 1, 3, 2]: heads are 100, 200, 1. From 1: 1,2,3,4 -> best = 4`,
        annotations: {
          5: 'This guard is the entire algorithm. Without it, starting a walk at every element re-counts each run from every position: O(n²) on a single long run.',
          8: 'Looks nested, is not: across ALL walks, each value is stepped onto at most once. Total work = n head-checks + n walk-steps = O(n) — argue it exactly like this. (len is a builtin, so the counter is named length.)',
          13: 'Desk-check: 100 has no 99 -> head, run length 1. 4 has 3 -> skipped. 1 has no 0 -> head; 2, 3, 4 present; 5 absent -> length 4.',
        },
      },
    },
    {
      type: 'note',
      md: `Custom keys, the C++ tax: \`unordered_set<pair<int,int>>\` does **not compile** — \`std::hash\` has no specialization for \`pair\` or \`tuple\`. Your options, best to worst: (1) write a small hash functor that combines both members; (2) encode the pair into one integer — \`r * 100000LL + c\` for known-range grid coordinates — and hash that; (3) sidestep with \`set<pair<int,int>>\` — the tree only needs \`operator<\`, which pair already has, at O(log n) per op. Python's \`set\` of tuples spoils people; the C++ version of "store visited (row, col)" is a genuine interview gotcha.`,
    },
  ],
  quiz: [
    {
      question: 'hash("amy") = 96717 and the table has 5 buckets. Where does "amy" go — and where will a later lookup search?',
      options: [
        { text: 'Bucket 2 (96717 % 5), both times — hashing is deterministic', explanation: 'Correct. Same key → same hash → same bucket, every run. Lookup re-computes the rule and opens exactly one box.' },
        { text: 'Bucket 96717', explanation: 'The hash value is folded by % bucket_count first — 5 buckets cannot have a slot 96717.' },
        { text: 'A random empty bucket, remembered in an index', explanation: 'Then lookup would need to search that index — the whole point is that the key ITSELF tells you the bucket.' },
      ],
      correct: 0,
    },
    {
      question: 'A table stores 1000 keys in 769 buckets. Can it avoid collisions with a clever enough hash function?',
      options: [
        { text: 'Yes — a perfect hash function spreads any keys evenly', explanation: 'Pigeonhole: 1000 items into 769 boxes forces some box to hold ≥ 2. No function can beat counting.' },
        { text: 'No — pigeonhole guarantees some bucket holds at least two keys', explanation: 'Correct. More keys than buckets means sharing is mathematically forced. Chaining exists because collisions are a certainty, not a defect.' },
        { text: 'Only if the keys are integers', explanation: 'Key type is irrelevant — the counting argument only needs more keys than buckets.' },
      ],
      correct: 1,
    },
    {
      question: 'An unordered_map crosses its max load factor during an insert. What happens, and what does that insert cost?',
      options: [
        { text: 'The insert is rejected until you call reserve', explanation: 'The table manages itself — it never rejects inserts.' },
        { text: 'Only the longest chain is split into two buckets', explanation: 'Rehashing is all-or-nothing: the modulus changed, so EVERY key may live somewhere new.' },
        { text: 'Bucket count roughly doubles, every key is re-hashed — that insert is O(n), but inserts stay amortized O(1)', explanation: 'Correct. The rehash pass is O(n), but doubling makes rehashes geometrically rare — total copies under 2n across n inserts.' },
        { text: 'Chains simply grow longer; nothing else changes', explanation: 'That would slide average lookup toward O(n) — rehashing exists precisely to stop it.' },
      ],
      correct: 2,
    },
    {
      question: 'In one-pass Two Sum, you insert a[i] into the map BEFORE checking for the complement. What breaks?',
      options: [
        { text: 'Nothing — order of the two lines is style', explanation: 'Try {3, 3} with target 6 — the order decides whether an element can match itself.' },
        { text: 'On {3, 3} with target 6, index 0 matches ITSELF: need = 3 finds the entry you just inserted', explanation: 'Correct. Check-then-insert guarantees any hit is a strictly earlier index — self-matching becomes impossible.' },
        { text: 'The map runs out of memory', explanation: 'Same n entries either way — memory is unchanged.' },
      ],
      correct: 1,
    },
    {
      question: 'Longest Consecutive Sequence has a while loop inside a for loop. Why is it still O(n)?',
      options: [
        { text: 'It is not — it is O(n²) and interviewers accept it', explanation: 'The heads-only guard makes it truly linear — that guard is the answer to this exact follow-up.' },
        { text: 'Walks start only at sequence heads, so every element is stepped on at most once across ALL walks', explanation: 'Correct. n head-checks plus at most n total walk-steps = O(n). Nested shape, linear budget.' },
        { text: 'unordered_set lookups are free', explanation: 'They are O(1) each, but the argument must bound HOW MANY lookups happen — that is what the heads trick does.' },
      ],
      correct: 1,
    },
    {
      question: 'You need "the smallest key ≥ x" after many inserts. Which container?',
      options: [
        { text: 'set / map — the tree keeps keys sorted, so lower_bound(x) is one O(log n) walk', explanation: 'Correct. Order queries are exactly what the tree buys with its log factor.' },
        { text: 'unordered_map — O(1) beats O(log n)', explanation: 'Hashing scatters keys on purpose: there is no order, so no "next key after x" without scanning everything.' },
        { text: 'vector, re-sorted before each query', explanation: 'O(n log n) per query. The tree maintains sortedness incrementally instead.' },
      ],
      correct: 0,
    },
    {
      question: 'Why does unordered_set<pair<int,int>> fail to compile in C++?',
      options: [
        { text: 'Pairs cannot be compared for equality', explanation: 'pair has operator== — equality is not the missing piece.' },
        { text: 'Sets only accept arithmetic types', explanation: 'Sets take any hashable type — string works fine. The gap is specifically the missing hash.' },
        { text: 'std::hash has no specialization for pair — you must supply a custom hash (or encode the pair as one integer)', explanation: 'Correct. Hash containers need "which bucket?" and no one taught the table how to hash a pair. set<pair> works because trees only need operator<.' },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Walk me through what actually happens inside a hash map on insert and lookup — buckets, collisions, rehashing, the works.',
      answer:
        'Insert: hash the key to a big number, fold it with % bucket_count into a bucket index, append the (key, value) entry to that bucket\'s chain (checking the chain first for an existing equal key). Lookup: same hash + modulus, then walk the chain comparing keys with == until the match. Collisions are guaranteed by pigeonhole — more possible keys than buckets — so chains, not a cleverer hash, are the survival mechanism. When load factor (size ÷ buckets) crosses the limit, the table roughly doubles its buckets and re-hashes every key — O(n) once, amortized O(1) overall by the geometric-series argument. Complexity summary to volunteer: average O(1) insert/find/erase, worst O(n).',
      isCaseBased: false,
    },
    {
      question: 'You said hash map lookup is O(1). Defend that — and tell me when it is false.',
      answer:
        'It is O(1) *average*, resting on the assumption that the hash spreads keys evenly, so expected chain length is the load factor — a constant the table maintains by rehashing. It is false when many keys share a bucket: worst case every key collides and lookup degrades to an O(n) list scan. That worst case is reachable on purpose — adversarial inputs crafted to collide (hash flooding); competitive judges break std::unordered_map with anti-hash tests. Mitigations: a randomized custom hash the adversary cannot predict, or std::map for a guaranteed O(log n) bound. The honest one-liner: "average O(1), worst O(n), and I can say why for both."',
      isCaseBased: false,
    },
    {
      question: 'Solve Two Sum, narrating brute force → better → best.',
      answer:
        'Brute: try all pairs, O(n²) time, O(1) space. Better: sort and walk two pointers inward, O(n log n) — but sorting scrambles the original indices the answer needs, so you must carry (value, index) pairs. Best: one pass with an unordered_map from value → index. For each a[i], compute the complement target − a[i] and look it up among elements ALREADY seen; hit → return {stored index, i}; miss → record a[i] and move on. O(n) time, O(n) space. Two details worth saying unprompted: use find, not operator[] (which would insert and poison the map), and insert AFTER the check so {3,3} with target 6 cannot self-match.',
      isCaseBased: false,
    },
    {
      question: 'Case: your unordered_map solution passes samples but TLEs on the final hidden test. The setter is known for anti-hash tests. What is happening, and what do you change?',
      answer:
        'The hidden test was generated to collide under the default hash: thousands of keys in one bucket turn every average-O(1) operation into an O(n) chain walk — O(n²) overall, hence the TLE. Fixes in order: (1) supply a custom randomized hash — seed it from a high-resolution clock so the adversary cannot precompute collisions (the classic splitmix64 custom-hash pattern); (2) if order is tolerable, switch to map — guaranteed O(log n), immune to flooding; (3) reserve() up front to remove rehash overhead, which helps constants but does NOT fix flooding — worth saying so the interviewer knows you separate the two issues. Root cause in one line: average-case analysis assumes non-adversarial input, and this input is adversarial.',
      isCaseBased: true,
    },
    {
      question: 'Majority Element: you solved it with a frequency map. Follow-up — do it in O(1) space.',
      answer:
        'Boyer–Moore voting. Keep a candidate and a counter: same element → count++, different → count−−, and when count hits 0 the current element becomes the new candidate. Intuition: pair off each occurrence of the majority against one non-majority occurrence; holding more than n/2 of the votes, the majority cannot be fully cancelled, so it is the last candidate standing. One pass, O(n) time, O(1) space. The caveat that earns points: this only works when a majority is GUARANTEED — otherwise the surviving candidate needs a second verification pass to confirm its count exceeds n/2. The frequency map stays the right first answer; Boyer–Moore is the follow-up.',
      isCaseBased: false,
    },
    {
      question: 'Top K Frequent Elements: why a heap of size k instead of sorting all the counts — and is there anything faster?',
      answer:
        'After the O(n) counting pass there are up to n distinct (value, count) entries. Sorting them is O(n log n). A min-heap capped at size k keeps only the k best seen so far: push each entry, pop when size exceeds k — every operation O(log k), total O(n log k), a real win when k << n. The top of the min-heap is the WEAKEST of the current winners, which is exactly the element you want evictable. Faster still: bucket sort by count — counts are bounded by n, so make an array of buckets indexed by count and walk it from the top: O(n) time, O(n) space. Naming all three tiers (sort / heap / bucket) is the complete answer.',
      isCaseBased: false,
    },
    {
      question: 'Case: you solved Longest Consecutive Sequence by sorting — O(n log n). Interviewer: "the follow-up requires O(n)." Go.',
      answer:
        'Trade the sort for an unordered_set. Insert everything — now "is x+1 present?" is O(1). The key idea: only start counting from sequence HEADS, elements x where x−1 is absent from the set; from each head walk x+1, x+2, … until the run breaks, tracking the best length. Complexity argument the interviewer is fishing for: the loop looks nested, but each element is stepped onto by at most one walk across the entire execution — n head-checks plus at most n walk-steps = O(n) time, O(n) space. Without the head guard it silently degrades to O(n²) on one long run — mentioning that failure mode shows you understand why the guard exists.',
      isCaseBased: true,
    },
    {
      question: 'Give me your decision rule for unordered_map vs map, with one concrete example each way.',
      answer:
        'Ask one question: does the problem ever care about key ORDER? No → unordered_map: average O(1) beats O(log n) for pure lookup/counting — e.g., a frequency count for anagrams or Two Sum\'s seen-map. Yes → map: the red-black tree keeps keys sorted, so ordered iteration, lower_bound ("smallest key ≥ x"), and range queries are native — e.g., a leaderboard printed in rank order, or bucketing timestamps by nearest checkpoint. Two secondary tiebreakers worth naming: map gives a guaranteed O(log n) worst case (no hash-flooding risk), and unordered_map generally spends more memory on buckets. Default for interview counting problems: unordered_map, and say "average O(1)" not "O(1)".',
      isCaseBased: false,
    },
    {
      question: 'You need to store visited (row, col) cells of a grid in a hash set in C++. What is the problem and what are your options?',
      answer:
        'unordered_set<pair<int,int>> does not compile — std::hash has no pair/tuple specialization, so the container cannot answer "which bucket?". Options: (1) custom hash functor combining both members (hash the first, mix with the second via shift/xor) — the general fix; (2) encode the pair as one integer, r * COLS + c or r * 100000LL + c when ranges are known — fastest and my grid default; (3) set<pair<int,int>> — compiles out of the box because trees only need operator<, which pair provides lexicographically, at O(log n) per op; (4) for dense grids, skip hashing entirely: a vector<vector<bool>> visited is O(1) with better cache behavior. Bonus point: mention that Python tuples hash natively, which is why this trips up people porting solutions.',
      isCaseBased: false,
    },
    {
      question: 'Case: a service must detect duplicate event IDs in a stream — billions of events per day. Your teammate proposes one giant unordered_set. Critique and improve.',
      answer:
        'Correctness: yes — a seen-set is the right shape, O(1) per event. Feasibility: no — billions of 8-byte IDs plus per-entry overhead (bucket pointers, chain nodes — easily 3–5× the payload) blows past RAM. Improvements, in order: (1) if IDs are dense integers in a known range, a bitset — one BIT per possible ID, ~125 MB per billion, still O(1); (2) shard the seen-set across machines by hash(ID) % k — the same bucket idea, one level up; (3) if a tiny false-positive rate is acceptable, a Bloom filter cuts memory by ~10× — name it, state the tradeoff (may say "seen" for a fresh ID, never the reverse); (4) bound the window — dedupe per hour/day so the structure can be reset. The pattern transfers unchanged; the engineering is about memory per entry.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Hash function, one sentence', back: 'A deterministic rule mapping any key → big number → % bucket_count → bucket index. Same key, same bucket, every time.' },
    { front: 'Why collisions are unavoidable', back: 'Pigeonhole principle: more possible keys than buckets forces sharing. Chaining (buckets hold lists) is the standard handling, not a fix.' },
    { front: 'Load factor + rehash', back: 'Load factor = size ÷ buckets = avg chain length. Crossing the limit (1.0 default) → ~double buckets, re-hash all keys: O(n) once, amortized O(1) — the vector-doubling argument.' },
    { front: 'Hash table complexity, the honest version', back: 'Average O(1) insert/find/erase; worst O(n) when keys pile into one bucket — reachable on purpose via adversarial inputs (hash flooding).' },
    { front: 'unordered_map vs map, one breath', back: 'Hash: average O(1), no order. Tree: guaranteed O(log n), sorted keys, lower_bound/range queries. Order needed → tree; pure lookup/counting → hash.' },
    { front: 'Two Sum recipe', back: 'One pass. For each a[i]: look up complement target − a[i] among ALREADY-seen values (find, not []); hit → answer; miss → record a[i] AFTER the check (prevents self-match on {3,3}).' },
    { front: 'Longest Consecutive Sequence trick', back: 'Set of all values; start walks ONLY at heads (x with no x−1). Each element walked at most once → O(n) despite the nested-looking loop.' },
    { front: 'Boyer–Moore voting', back: 'Majority Element in O(1) space: candidate + counter; match → ++, mismatch → −−, zero → new candidate. Majority survives all pair-offs. Verify with a 2nd pass if majority not guaranteed.' },
    { front: 'Top K Frequent complexity', back: 'Count O(n), then min-heap capped at size k → O(n log k). Heap top = weakest current winner (evictable). Bucket-sort by count reaches O(n).' },
    { front: 'pair/tuple as hash keys in C++', back: 'std::hash has no pair specialization → unordered_set<pair> won\'t compile. Fix: custom hash functor, encode as one integer (r*COLS+c), or set<pair> (tree needs only operator<).' },
  ],
  mindmapMarkdown: `- Hashing: Maps, Sets & Frequency Patterns
  - Hash function
    - key → number → % buckets → index
    - deterministic: same key, same bucket
  - Collisions
    - pigeonhole: unavoidable
    - chaining: buckets hold lists
    - lookup = hash + walk chain
  - Load factor & rehash
    - size ÷ buckets, limit 1.0
    - double + re-hash all: amortized O(1)
    - reserve(n) skips rehashes
  - Complexity honesty
    - average O(1), worst O(n)
    - adversarial hash flooding
    - defense: custom hash or map
  - Hash vs tree
    - unordered: fast, no order
    - map/set: O(log n), sorted, lower_bound
  - Frequency family
    - Majority Element → Boyer–Moore O(1) space
    - Top K Frequent → heap of size k, O(n log k)
    - First Unique Char → array-as-map
  - Seen-set family
    - Two Sum: complement lookup, insert after check
    - Contains Duplicate: insert reports dupes
    - Longest Consecutive: heads-only walks, O(n)
  - Custom keys (C++)
    - pair/tuple: no std::hash → functor or encode`,
}

export default m
