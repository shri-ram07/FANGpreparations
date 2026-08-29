# Do the Python twins in the DSA modules actually compute the right answers?
#
# dsa-lang.test.mjs proves they PARSE and that their line notes line up. That is
# not the same as being correct, and a hand-translated algorithm that parses but
# returns the wrong thing is the exact defect this catches.
#
# Each module's blocks are exec'd cumulatively — later blocks legitimately use
# classes defined by earlier ones, the same way a reader meets them — and then
# every function is driven against a known answer. Where a comment in the module
# claims a specific result (n=8 -> 92 queens, "aba" in "ababa" -> 0 2), the
# assertion here uses that exact claim, so the prose and the code cannot drift.
#
# Run by dsa-lang.test.mjs; not meant to be invoked directly.

import json, collections, sys, io as _io, contextlib
tw = json.load(open(sys.argv[1], encoding='utf-8'))
bymod = collections.OrderedDict()
for t in tw: bymod.setdefault(t['mod'], []).append(t)
ns = {}
for mod, blocks in bymod.items():
    g = {'__name__': '__main__'}
    for t in blocks:
        try:
            # Some blocks demo their output by printing; swallow it so the
            # report stays readable. Fragments that reference a caller's
            # variable raise here and are skipped -- faithful to the C++.
            with contextlib.redirect_stdout(_io.StringIO()):
                exec(compile(t['py'], '<twin>', 'exec'), g)
        except Exception:
            pass
    ns[mod] = g

# Some modules need a structure built before their functions mean anything.
SETUP = {
 'dsa-l2-trees': (
   "def _n(v, l=None, r=None):"+chr(10)+
   "    x = TreeNode(v); x.left, x.right = l, r; return x"+chr(10)+
   "root = _n(8, _n(3, _n(1), _n(6)), _n(10, None, _n(14)))"
 ),
}

CHECKS = {
 'dsa-l0-bigo-binary-search': [
   ('binarySearch([1,3,5,7,9,11], 7)', 3), ('binarySearch([1,3,5,7,9,11], 4)', -1),
   ('halves(1000)', 9), ('halves(1024)', 10), ('pairs([1,2,3])', 36),
 ],
 'dsa-l0-array-patterns': [
   ('twoSumSorted([2,7,11,15], 9)', [0,1]),
   ('lengthOfLongestSubstring("abcabcbb")', 3),
   ('lengthOfLongestSubstring("bbbbb")', 1),
   ('maxSubArray([-2,1,-3,4,-1,2,1,-5,4])', 6),
   ('subarraySum([1,2,3], 3)', 2),
   ('maxArea([1,8,6,2,5,4,8,3,7])', 49),
   ('maxSumK([2,1,5,1,3,2], 3)', 9),
 ],
 'dsa-l0-string-patterns': [
   ('isAnagram("anagram","nagaram")', True), ('isAnagram("rat","car")', False),
   ('validPalindrome("aba")', True), ('validPalindrome("abca")', True),
   ('validPalindrome("abc")', False), ('isPal("abcba", 0, 4)', True),
   ('longestPalindrome("babad") in ("bab","aba")', True),
   ('sorted(map(sorted, groupAnagrams(["eat","tea","tan","ate","nat","bat"]))) == sorted(map(sorted,[["eat","tea","ate"],["tan","nat"],["bat"]]))', True),
 ],
 'dsa-l1-stacks-queues': [
   ('isValid("()[]{}")', True), ('isValid("(]")', False), ('isValid("([)]")', False),
   ('nextGreater([4,2,1,5,3])', [5,5,5,-1,-1]),
   ('dailyTemperatures([73,74,75,71,69,72,76,73])', [1,1,4,2,1,1,0,0]),
   ('largestRectangleArea([2,1,5,6,2,3])', 10),
 ],
 'dsa-l1-hashing': [
   ('twoSum([2,7,11,15], 9)', [0,1]),
   ('firstUniqChar("leetcode")', 0), ('firstUniqChar("aabb")', -1),
   ('majorityElement([2,2,1,1,1,2,2])', 2),
   ('longestConsecutive([100,4,200,1,3,2])', 4),
   ('sorted(topKFrequent([1,1,1,2,2,3], 2))', [1,2]),
 ],
 'dsa-l2-recursion-backtracking': [
   ('solveNQueens(4)', 2), ('solveNQueens(8)', 92), ('solveNQueens(6)', 4),
 ],
 'dsa-l2-trees': [
   # the three printed traversals the module's own comments claim
   ('_cap(preorder, root)', '8 3 1 6 10 14'),
   ('_cap(inorder, root)', '1 3 6 8 10 14'),
   ('_cap(postorder, root)', '1 6 3 14 10 8'),
   ('levelOrder(root)', [[8],[3,10],[1,6,14]]),
   ('inorderIter(root)', [1,3,6,8,10,14]),
   ('height(root)', 3),                       # in NODES, as the comment states
   ('isValidBST(root)', True), ('isBalanced(root)', True),
   ('diameterOfBinaryTree(root)', 4),
   ('rightView(root)', [8,10,14]),
   ('searchBST(root, 6).val', 6),
   ('lcaBST(root, _n(1), _n(6)).val', 3),
 ],
 'dsa-l2-heaps': [
   ('findKthLargest([3,2,1,5,6,4], 2)', 5),
   ('sorted(map(tuple, kClosest([[1,3],[-2,2]], 1)))', [(-2,2)]),
   ('sorted(topKFrequent([1,1,1,2,2,3], 2))', [1,2]),
 ],
 'dsa-l2-graphs-traversal': [
   ('numIslands([["1","1","0"],["1","0","0"],["0","0","1"]])', 2),
   ('countComponents(5, [[1],[0,2],[1],[4],[3]])', 2),
   ('isBipartite(4, [[1,3],[0,2],[1,3],[0,2]])', True), ('isBipartite(3, [[1,2],[0,2],[0,1]])', False),
   ('findOrder(2, [[1],[]])', [0,1]),
   ('findOrder(2, [[1],[0]])', []),
   ('findOrder(4, [[1,2],[3],[3],[]])', [0,1,2,3]),
 ],
 'dsa-l3-dp-1d-grid': [
   ('fib(10)', 55), ('fibMemo(30, [-1]*31)', 832040), ('fibMemo(80, [-1]*81)', 23416728348467685), ('fibTab(30)', 832040), ('fibRolling(30)', 832040),
   ('climbStairs(5)', 8), ('rob([2,7,9,3,1])', 12),
   ('uniquePaths(3,7)', 28), ('minPathSum([[1,3,1],[1,5,1],[4,2,1]])', 7),
   ('minCostClimbingStairs([10,15,20])', 15),
   ('uniquePathsWithObstacles([[0,0,0],[0,1,0],[0,0,0]])', 2),
 ],
 'dsa-l3-dp-knapsack-lis': [
   ('coinChange([1,2,5], 11)', 3), ('coinChange([2], 3)', -1),
   ('canPartition([1,5,11,5])', True), ('canPartition([1,2,3,5])', False),
   ('lis([10,9,2,5,3,7,101,18])', 4), ('lisN2([10,9,2,5,3,7,101,18])', 4),
   ('knapsack([1,3,4,5],[1,4,5,7],7)', 9), ('knapsack1D([1,3,4,5],[1,4,5,7],7)', 9),
 ],
 'dsa-l3-dp-strings-trees': [
   ('lcs("abcde","ace")', 3), ('editDistance("horse","ros")', 3),
   ('editDistance("intention","execution")', 5),
 ],
 'dsa-l3-greedy': [
   ('canJump([2,3,1,1,4])', True), ('canJump([3,2,1,0,4])', False),
   ('jump([2,3,1,1,4])', 2),
   ('canCompleteCircuit([1,2,3,4,5],[3,4,5,1,2])', 3),
   ('merge([[1,3],[2,6],[8,10],[15,18]])', [[1,6],[8,10],[15,18]]),
   ('eraseOverlapIntervals([[1,2],[2,3],[3,4],[1,3]])', 1),
   ('minMeetingRooms([[0,30],[5,10],[15,20]])', 2),
 ],
 'dsa-l3-advanced-topics': [
   ('minWindow("ADOBECODEBANC","ABC")', "BANC"),
   ('maxSlidingWindow([1,3,-1,-3,5,3,6,7], 3)', [3,3,5,5,6,7]),
   ('kmpSearch("ababcabcabababd","ababd")', [10]),
   ('kmpSearch("ababa","aba")', [0,2]),
   ('failTable("ababd")', [0,0,1,2,0]),
   ('splitArray([7,2,5,10,8], 2)', 18),
 ],
 'dsa-l3-bits': [
   ('singleNumber([4,1,2,1,2])', 4), ('countSetBits(11)', 3),
   ('isPowerOfTwo(16)', True), ('isPowerOfTwo(18)', False),
   ('missingNumber([3,0,1])', 2),
 ],
 'dsa-l3-dp-bitmask-partition': [
   ('maxCoins([3,1,5,8])', 167), ('mcm([40,20,30,10,30])', 26000),
 ],
}
def _cap(fn, *a):
    buf = _io.StringIO()
    with contextlib.redirect_stdout(buf): fn(*a)
    return buf.getvalue().strip()

passed = failed = 0
for mod, cases in CHECKS.items():
    g = ns.get(mod)
    if g is None:
        print(f'{mod}: MODULE MISSING'); failed += len(cases); continue
    if mod in SETUP:
        with contextlib.redirect_stdout(_io.StringIO()):
            exec(SETUP[mod], g)
    bad = []
    for expr, want in cases:
        try:
            with contextlib.redirect_stdout(_io.StringIO()):
                got = eval(expr, {**g, '_cap': _cap})
            if got == want: passed += 1
            else: failed += 1; bad.append(f'      {expr}\n        got  {got!r}\n        want {want!r}')
        except Exception as e:
            failed += 1; bad.append(f'      {expr}  -> {type(e).__name__}: {e}')
    mark = 'ok' if not bad else f'{len(bad)} FAILED'
    print(f'{mod:34} {len(cases)-len(bad):2}/{len(cases):2} {mark}')
    for b in bad: print(b)
print(f'dsa-behaviour: {passed} assertions passed, {failed} failed')
if failed:
    raise SystemExit(1)
