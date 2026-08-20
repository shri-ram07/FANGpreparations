import { mod, type SubjectDef } from '../types'

export const dsa: SubjectDef = {
  id: 'dsa',
  title: 'DSA',
  short: 'DSA',
  why: 'THE FAANG filter. 60–70% of interview weight for new grads. Daily habit, forever.',
  prereqs: ['cpp'],
  levelTitles: ['Foundations', 'Linear structures', 'Non-linear structures', 'The hard stuff'],
  interviewThemes: [
    'Explain your complexity out loud',
    'Optimize brute → better → best',
    'Follow-up variations on every pattern',
    'Every roadmap topic IS the interview',
  ],
  mindmapMarkdown: `- DSA
  - Complexity
    - Big-O intuition: n, log n, n², 2ⁿ
    - Time vs space tradeoffs
  - Array / String patterns
    - Two pointers, sliding window
    - Prefix sums, Kadane
    - Binary search — arrays AND answer space
  - Linked list / Stack / Queue
    - Reverse, cycle detect (Floyd), LRU cache
    - Monotonic stack — next greater element
  - Trees / Heaps / Tries
    - Traversals, BST, LCA, diameter
    - k-largest, two-heap median
    - Prefix problems
  - Graphs
    - BFS / DFS, components, cycles
    - Topo sort, Dijkstra, Bellman-Ford
    - Union-Find, MST, bipartite
  - DP ladder
    - 1D → grid → knapsack → LIS
    - String DP → trees → bitmask → MCM
  - Greedy & Bits
    - Intervals, Jump Game family
    - Bit manipulation patterns`,
  modules: [
    mod('dsa-l0-practice-system', 0, 'The Practice System — How to Actually Get Good', 20, () => import('./l0-practice-system')),
    mod('dsa-l0-bigo-binary-search', 0, 'Big-O & Binary Search', 45, () => import('./l0-bigo-binary-search')),
    mod('dsa-l0-array-patterns', 0, 'Array Patterns: Two Pointers, Sliding Window, Prefix Sums & Kadane', 60, () => import('./l0-array-patterns')),
    mod('dsa-l0-string-patterns', 0, 'String Patterns: Hashing Basics, Palindromes & Anagrams', 45, () => import('./l0-string-patterns')),
    mod('dsa-l1-linked-lists', 1, 'Linked Lists: Reverse, Cycles, Merge & LRU', 55, () => import('./l1-linked-lists')),
    mod('dsa-l1-stacks-queues', 1, 'Stacks, Queues & the Monotonic Stack', 50, () => import('./l1-stacks-queues')),
    mod('dsa-l1-hashing', 1, 'Hashing: Maps, Sets & Frequency Patterns', 40, () => import('./l1-hashing')),
    mod('dsa-l2-recursion-backtracking', 2, 'Recursion & Backtracking: Subsets, Permutations, N-Queens', 60, () => import('./l2-recursion-backtracking')),
    mod('dsa-l2-trees', 2, 'Trees: Traversals, BST, LCA & Views', 70, () => import('./l2-trees')),
    mod('dsa-l2-heaps', 2, 'Heaps: k-Largest, Two-Heap Median & Merge k Lists', 45, () => import('./l2-heaps')),
    mod('dsa-l2-tries', 2, 'Tries: Prefix Power', 40, () => import('./l2-tries')),
    mod('dsa-l2-graphs-traversal', 2, 'Graphs I: BFS, DFS, Components, Cycles & Topo Sort', 55, () => import('./l2-graphs-traversal')),
    mod('dsa-l2-graphs-advanced', 2, 'Graphs II: Dijkstra, Bellman-Ford, DSU & MST', 60, () => import('./l2-graphs-advanced')),
    mod('dsa-l3-dp-1d-grid', 3, 'DP I: The Ladder Begins — 1D & Grid DP', 60, () => import('./l3-dp-1d-grid')),
    mod('dsa-l3-dp-knapsack-lis', 3, 'DP II: Knapsack Family & LIS Family', 60, () => import('./l3-dp-knapsack-lis')),
    mod('dsa-l3-dp-strings-trees', 3, 'DP III: String DP & DP on Trees', 60, () => import('./l3-dp-strings-trees')),
    mod('dsa-l3-dp-bitmask-partition', 3, 'DP IV: Bitmask & Partition (MCM)', 55, () => import('./l3-dp-bitmask-partition')),
    mod('dsa-l3-greedy', 3, 'Greedy: Intervals, Jumps & Proof Intuition', 45, () => import('./l3-greedy')),
    mod('dsa-l3-advanced-topics', 3, 'Hard Patterns: Windows, Binary Search II, Segment Trees & KMP', 60, () => import('./l3-advanced-topics')),
    mod('dsa-l3-bits', 3, 'Bit Manipulation Patterns', 40, () => import('./l3-bits')),
  ],
}
