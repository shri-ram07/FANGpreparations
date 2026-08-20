import type { Module } from '../types'

const m: Module = {
  id: 'ml-l3-clustering',
  subjectId: 'ml',
  level: 3,
  title: 'Clustering: Finding Groups When Nobody Labelled the Data',
  whyItMatters:
    'Every method you have met so far came with an answer column: here is the input, here is the correct output, learn the link. Real data almost never arrives that way. You get a spreadsheet of customers, or sensor readings, or support tickets, and nobody has written down which group each row belongs to. Clustering is the set of methods that draw the groups themselves. This module builds K-Means from scratch with six points you can add up on paper, then shows you exactly where it breaks and what to use instead.',
  assumes: [
    'You can read a pair of numbers as a point on a grid: (3, 5) means three steps right, five steps up',
    'You know how to average a few numbers',
    'You have seen a Python list, a tuple, a for loop, and an if statement',
    'No machine learning background is needed. Every term used here is defined here.',
  ],
  estMinutes: 60,
  sections: [
    {
      type: 'intuition',
      title: 'The same table, with the answer column deleted',
      md: `Every method before this one worked like a graded exam. You handed the computer a table of inputs and a column of correct answers, and it learned the link between them. Delete that answer column and none of those methods can run — there is nothing to compare against.

Here are six customers. Each one is described by two numbers: **visits per month** and **items bought per visit**. That is the whole table.

- (1, 1) · (2, 1) · (1, 2) · (8, 8) · (9, 8) · (8, 9)

Plot them in your head. The first three sit near the bottom-left corner. The last three sit far away, up and to the right. Two groups, obviously — and nobody wrote that down anywhere. There is no seventh column saying "bargain shopper" or "regular". You are seeing the groups yourself, from the positions alone.

A **cluster** is a group of points that are close to each other and far from the rest. **Clustering** is any method that produces those groups from positions alone, with no answer column. You will notice immediately that this means there is no score to check against — nothing can be marked right or wrong. That difficulty is real and it never goes away, so we will meet it head-on later.

First, the mechanics: how does a program find those two groups without being told?`,
    },
    {
      type: 'intuition',
      title: 'K-Means, round 1: guess two centres, then measure',
      md: `The oldest method is also the simplest. Guess where the centres of the groups are, then let the points correct you.

- **K** is the number of groups you want. You choose it before you start. Here K = 2.
- A **centroid** is a proposed centre of one group. It is just a point, and it does not have to be one of your data points.
- Start with two centroids. Deliberately bad ones, so you can watch the fix happen: **c0 = (1, 1)** and **c1 = (2, 1)**. Both sit in the bottom-left corner, so at the start the top-right group has no centre near it at all.

The **assignment step**: every point joins whichever centroid is nearer. To measure "nearer" we use squared distance — square the gap in the first number, square the gap in the second, add them. Squaring keeps everything positive and saves us a square root we do not need, since whichever distance is smaller is also the one whose square is smaller.

- (1, 1): to c0 is 0² + 0² = **0**. To c1 is 1² + 0² = **1**. Nearer to c0.
- (2, 1): to c0 is 1² + 0² = **1**. To c1 is **0**. Nearer to c1.
- (1, 2): to c0 is 0 + 1 = **1**. To c1 is 1 + 1 = **2**. Nearer to c0.
- (8, 8): to c0 is 49 + 49 = **98**. To c1 is 36 + 49 = **85**. Nearer to c1.
- (9, 8): to c0 is 64 + 49 = **113**. To c1 is 49 + 49 = **98**. Nearer to c1.
- (8, 9): to c0 is 49 + 64 = **113**. To c1 is 36 + 64 = **100**. Nearer to c1.

Group 0 is {(1, 1), (1, 2)}. Group 1 is {(2, 1), (8, 8), (9, 8), (8, 9)} — a mess, with one bottom-left point stuck in with the three far ones. That is what a bad starting guess buys you. Now we fix it.`,
    },
    {
      type: 'intuition',
      title: 'Round 1, second half: move each centre to its own average',
      md: `The **update step**: each centroid moves to the average position of the points that just joined it. Average the first numbers, average the second numbers, and that pair is the new centroid.

- Group 0 holds (1, 1) and (1, 2). Average of the first numbers: (1 + 1) / 2 = 1.0. Average of the second: (1 + 2) / 2 = 1.5. **New c0 = (1.0, 1.5)**.
- Group 1 holds (2, 1), (8, 8), (9, 8), (8, 9). First numbers: (2 + 8 + 9 + 8) / 4 = 27 / 4 = 6.75. Second numbers: (1 + 8 + 8 + 9) / 4 = 26 / 4 = 6.5. **New c1 = (6.75, 6.5)**.

Look at what just happened to c1. It started at (2, 1), stuck in the bottom-left corner. The three far points outvoted the one near point and dragged it to (6.75, 6.5), most of the way to the top-right group. One round of arithmetic and the bad guess is already half repaired.

That is the entire algorithm: **assign, then update**. Repeat both steps until nothing changes.`,
    },
    {
      type: 'intuition',
      title: 'Round 2, and then it stops',
      md: `Now redo the assignment step with the new centroids c0 = (1.0, 1.5) and c1 = (6.75, 6.5). The interesting point is (2, 1) — the one that got stuck in the wrong group.

- (2, 1) to c0: (2 − 1)² + (1 − 1.5)² = 1 + 0.25 = **1.25**. To c1: (2 − 6.75)² + (1 − 6.5)² = 22.56 + 30.25 = **52.81**. It switches back to group 0.
- (1, 1) to c0: 0 + 0.25 = **0.25**. To c1: 33.06 + 30.25 = **63.31**. Stays in group 0.
- (1, 2) to c0: 0 + 0.25 = **0.25**. To c1: 33.06 + 20.25 = **53.31**. Stays in group 0.
- (8, 8) to c0: 49 + 42.25 = **91.25**. To c1: 1.56 + 2.25 = **3.81**. Stays in group 1. The other two far points behave the same way.

Group 0 = {(1, 1), (2, 1), (1, 2)}, group 1 = {(8, 8), (9, 8), (8, 9)}. The update step gives c0 = (4/3, 4/3) = (1.333, 1.333) and c1 = (25/3, 25/3) = (8.333, 8.333).

Run round 3 and every point picks the same group it already had, so both centroids land in the same places again. Nothing can change any more. That is **convergence**: a round that produces no switches, so every future round would be identical too. K-Means always reaches it, usually within a handful of rounds.

One last number. **Inertia** is the score K-Means is quietly improving: take each point, measure the squared distance to its own centroid, and add all of those up. Lower is tighter.

- Group 0 to (1.333, 1.333): (1,1) gives 0.111 + 0.111 = 0.222; (2,1) gives 0.444 + 0.111 = 0.556; (1,2) gives 0.111 + 0.444 = 0.556. Subtotal **1.333**.
- Group 1 is the same shape around (8.333, 8.333), so its subtotal is also **1.333**.
- Total inertia = **2.667**.

Both steps can only push inertia down — assignment because each point moves to a cheaper centroid, update because the average is the position with the smallest total squared distance to a set of points. A number that only falls, over a finite list of possible groupings, must stop falling. That is the whole convergence argument.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 1: the six points and one assignment step',
      code: `points = [(1, 1), (2, 1), (1, 2), (8, 8), (9, 8), (8, 9)]
centroids = [(1, 1), (2, 1)]

def sq_dist(p, c):
    return (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2

labels = []
for p in points:
    d0 = sq_dist(p, centroids[0])
    d1 = sq_dist(p, centroids[1])
    print(p, 'to c0:', d0, ' to c1:', d1)
    labels.append(0 if d0 <= d1 else 1)
print('labels:', labels)

# ---- real output ----
# (1, 1) to c0: 0  to c1: 1
# (2, 1) to c0: 1  to c1: 0
# (1, 2) to c0: 1  to c1: 2
# (8, 8) to c0: 98  to c1: 85
# (9, 8) to c0: 113  to c1: 98
# (8, 9) to c0: 113  to c1: 100
# labels: [0, 1, 0, 1, 1, 1]`,
      annotations: {
        1: 'The six customers. Each one is a tuple — a pair of numbers written in round brackets, which behaves like a two-item list you are not allowed to change. points[0] is the tuple (1, 1), and points[0][0] is the number 1.',
        2: 'The two starting centroids, kept in a list so centroids[0] is c0 and centroids[1] is c1. These are guesses, not data.',
        4: 'Defines a function taking a point p and a centroid c. Both are (x, y) tuples.',
        5: 'p[0] - c[0] is the gap in the first number and ** 2 squares it; the same for the second number. Adding the two squares is the squared distance we did by hand.',
        7: 'An empty list that will collect one group number per point, in the same order as points.',
        8: 'Walk the six points one at a time. p is the current tuple.',
        9: 'Squared distance from this point to centroid 0. Same arithmetic as the first column of the hand-worked table.',
        10: 'Squared distance to centroid 1. Now we have both numbers for this point.',
        11: 'Prints the point and both distances, so the output below is the hand table, recomputed.',
        12: 'The choice. "0 if d0 <= d1 else 1" is a Python if-expression: it checks the test and the whole thing becomes 0 when the test passes, 1 when it fails. So the point joins the nearer centroid, and ties go to group 0. append adds that number to the end of the labels list.',
        13: 'Prints the finished group numbers. Read it against the points list: positions 0 and 2 went to group 0, the rest to group 1 — exactly the split we got on paper.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 2: the update step, in the same session',
      code: `def mean_of(group):
    sx = 0
    sy = 0
    for p in group:
        sx = sx + p[0]
        sy = sy + p[1]
    return (round(sx / len(group), 3), round(sy / len(group), 3))

for j in (0, 1):
    group = []
    for i in range(len(points)):
        if labels[i] == j:
            group.append(points[i])
    print('cluster', j, group, 'new centroid', mean_of(group))

# ---- real output ----
# cluster 0 [(1, 1), (1, 2)] new centroid (1.0, 1.5)
# cluster 1 [(2, 1), (8, 8), (9, 8), (8, 9)] new centroid (6.75, 6.5)`,
      annotations: {
        1: 'Defines a function that takes a list of points and returns their average position.',
        2: 'A running total for the first numbers, starting at zero.',
        3: 'A running total for the second numbers.',
        4: 'Walk every point in the group.',
        5: 'Add this point\'s first number to the first total.',
        6: 'Add its second number to the second total.',
        7: 'len(group) is how many points there are, so each total divided by it is an average. round(value, 3) trims to three decimal places so the printed output stays readable. The pair is returned as a tuple, the same shape as a centroid.',
        9: 'Loop over the two group numbers, 0 and then 1. points and labels are still in memory from the previous snippet.',
        10: 'Start an empty list to collect the points belonging to this group.',
        11: 'range(len(points)) gives 0, 1, 2, 3, 4, 5 — the six positions. We need the position, not just the point, because labels[i] and points[i] describe the same customer.',
        12: 'Keep this point only if its label matches the group we are currently collecting.',
        13: 'Add it to the group list.',
        14: 'Print the group and its average. Compare with the hand arithmetic: (1.0, 1.5) and (6.75, 6.5), the same two numbers.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 3: the assignment step, written once for any number of centroids',
      code: `def assign(points, centroids):
    labels = []
    for p in points:
        best = 0
        for j in range(len(centroids)):
            if sq_dist(p, centroids[j]) < sq_dist(p, centroids[best]):
                best = j
        labels.append(best)
    return labels`,
      annotations: {
        1: 'The same assignment step as step 1, now a function, so we can call it once per round instead of retyping it.',
        2: 'The list of group numbers this call will build and hand back.',
        3: 'One pass per point.',
        4: 'best holds the number of the closest centroid found so far. Start by assuming centroid 0 is closest.',
        5: 'Check every centroid by number. This inner loop is why the function works for K = 2, K = 3 or K = 50 without change.',
        6: 'If centroid j is strictly closer than the current best, we have a new winner. Strictly closer, so a tie leaves the earlier centroid in place — the same tie rule as step 1.',
        7: 'Record the new winner.',
        8: 'After checking all centroids, store the winning centroid number for this point.',
        9: 'Hand back all six group numbers.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 4: the update step, written once for any number of clusters',
      code: `def update(points, labels, k):
    new_centroids = []
    for j in range(k):
        group = []
        for i in range(len(points)):
            if labels[i] == j:
                group.append(points[i])
        new_centroids.append(mean_of(group))
    return new_centroids`,
      annotations: {
        1: 'Takes the points, the labels the assignment step just produced, and k — how many clusters there are.',
        2: 'The list of fresh centroids this call will return, one per cluster.',
        3: 'Handle cluster 0, then cluster 1, and so on up to k - 1.',
        4: 'Collect the points belonging to this cluster — the same gathering loop as step 2, now inside a function.',
        5: 'Walk the positions so labels[i] and points[i] stay lined up.',
        6: 'Keep the point only if its label is the cluster we are building.',
        7: 'Add it to the group.',
        8: 'The average of that group is the cluster\'s new centroid. mean_of is the function from step 2 — reused, not rewritten.',
        9: 'Hand back the full list of new centroids.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 5: three rounds, and the score that falls',
      code: `def inertia(points, labels, centroids):
    total = 0.0
    for i in range(len(points)):
        total = total + sq_dist(points[i], centroids[labels[i]])
    return round(total, 3)

centroids = [(1, 1), (2, 1)]
for round_no in (1, 2, 3):
    labels = assign(points, centroids)
    centroids = update(points, labels, 2)
    print('round', round_no, labels, centroids, 'inertia', inertia(points, labels, centroids))

# ---- real output ----
# round 1 [0, 1, 0, 1, 1, 1] [(1.0, 1.5), (6.75, 6.5)] inertia 72.25
# round 2 [0, 0, 0, 1, 1, 1] [(1.333, 1.333), (8.333, 8.333)] inertia 2.667
# round 3 [0, 0, 0, 1, 1, 1] [(1.333, 1.333), (8.333, 8.333)] inertia 2.667`,
      annotations: {
        1: 'Defines the score: points, their labels, and the centroids those labels point at.',
        2: 'A running total, written 0.0 to make clear it accumulates decimals.',
        3: 'One pass per point.',
        4: 'labels[i] is the cluster number of point i, so centroids[labels[i]] is that point\'s own centroid. Add the squared distance between them to the total.',
        5: 'Return the total, trimmed to three decimals.',
        7: 'Back to the same two deliberately bad starting centroids.',
        8: 'Run three rounds. Two would be enough; the third is there to prove nothing more happens.',
        9: 'The assignment step. Every point picks its nearest current centroid.',
        10: 'The update step. Every centroid moves to the average of its own points. The 2 is k, the number of clusters.',
        11: 'Print the round number, the labels, the centroids and the score. Read the output: the labels change once (round 1 to round 2) and then freeze, and inertia falls 72.25 to 2.667 and then stops. Frozen labels is exactly what convergence means, and 2.667 is the number we added up by hand.',
      },
    },
    {
      type: 'note',
      md: `Notice which line of output does the real work. Between round 1 and round 2 the point (2, 1) moved from group 1 to group 0, and inertia dropped from 72.25 to 2.667. Between round 2 and round 3 nothing moved and the score did not budge. K-Means has no separate stopping rule beyond that: when a round changes no labels, it is finished.`,
    },
    {
      type: 'visual',
      component: 'KMeansStepper',
      props: {},
    },
    {
      type: 'note',
      md: `Step through this one deliberately. Leave K at 3 and choose the **good spread** start, then press the step button repeatedly and watch two things only: the colours of the points on the assign frames, and the small diamonds moving on the update frames. It settles with one diamond inside each of the three blobs, at an inertia of about **62,000**.

Now press reset, choose the **one corner** start — all three diamonds stacked in the bottom-left — and step through it again. It converges just as calmly, and stops at an inertia of about **336,000**, more than five times worse. Look at where the diamonds ended: two of them are sharing the left blob, and the third one is stretched across both remaining blobs.

Nothing failed. Every round lowered inertia, and the run ended when no single point wanted to switch. That is the honest limit of the guarantee: **K-Means finds a grouping that no single step can improve, not the best grouping.** Which one you land in is decided entirely by where the centroids started.`,
    },
    {
      type: 'intuition',
      title: 'Initialisation: the fix for the 336,000 run',
      md: `**Initialisation** just means choosing the starting centroids. The visual shows it is not a detail — it decided the entire answer.

The blunt fix is to run the whole algorithm several times from different random starts, keep the labels from the run with the lowest inertia, and throw the rest away. In scikit-learn that count is the setting **n_init**, and it defaults to 10. It works because a bad start like "all in one corner" is unlikely to repeat ten times in a row.

**K-Means++** is the smarter fix, and it solves one specific problem: random starting points can land close together, which is precisely what causes runs like the 336,000 one. It picks the starting centroids like this.

- Pick the first centroid by choosing one of your data points at random.
- For every remaining point, measure the distance to the nearest centroid chosen **so far**.
- Pick the next centroid at random too, but with each point's chance of being picked proportional to that distance squared. A point far from everything chosen so far is enormously more likely to be picked than a point sitting on top of an existing centroid.
- Repeat until you have K of them.

The result is starting centroids that are spread out on purpose rather than by luck. It is the default in scikit-learn, and you keep n_init anyway, because a spread-out start is still a random start.`,
    },
    {
      type: 'intuition',
      title: 'Choosing K',
      md: `K is not learned. You hand it over before the algorithm runs, which is awkward, because the number of groups is often exactly what you wanted to find out.

Two facts make the choice harder than it sounds. First, inertia always falls as K rises — with one cluster per point every distance is zero, so "pick the K with the lowest inertia" is a rule that always answers "as many clusters as you have points". Second, a bad K still returns a tidy-looking answer; K-Means will happily cut one real group into four.

The standard tools are the **elbow** (plot inertia against K and look for the bend where it stops dropping steeply) and the **silhouette score** (a per-point number saying how much closer a point is to its own cluster than to the next nearest one). Both are measurement questions rather than algorithm questions, so they are taught properly in the Metrics subject, in *Judging a Clustering When There Is No Correct Answer* — including why the elbow is often ambiguous on real data and silhouette usually is not. Read that module when you need to defend a value of K.

One thing that outranks both: a constraint from the actual problem. If the marketing team can run five campaigns, K = 5 needs no curve.`,
    },
    {
      type: 'intuition',
      title: 'Where K-Means is guaranteed to be wrong',
      md: `Here is a second dataset, and it is designed to break things. Sixteen points in two long horizontal rows — think of two conveyor belts, one at height 0 and one at height 2.

- Bottom row: (0, 0) (1, 0) (2, 0) (3, 0) (4, 0) (5, 0) (6, 0) (7, 0)
- Top row: (0, 2) (1, 2) (2, 2) (3, 2) (4, 2) (5, 2) (6, 2) (7, 2)

Any human says the groups are the two rows. Now score that answer with inertia. Grouping by row puts one centroid at (3.5, 0) and the other at (3.5, 2). Each point's squared distance is just its horizontal gap from 3.5: 12.25 + 6.25 + 2.25 + 0.25 + 0.25 + 2.25 + 6.25 + 12.25 = **42** per row, so **84** in total.

Now score the answer no human would give — split left half from right half, cutting both rows in the middle. The left centroid is at (1.5, 1). Horizontal gaps from 1.5 are 1.5, 0.5, 0.5, 1.5 for each row, squaring to 2.25 + 0.25 + 0.25 + 2.25 = 5 per row, 10 for both. Vertical gaps are 1 for all eight points, adding 8. Left side total **18**, and the right side is a mirror image, so **36** in total.

**36 beats 84.** The wrong grouping is not a bad local minimum that better initialisation would avoid — it is the better answer by K-Means' own score. No number of restarts helps, because every restart is trying to reach exactly this.

The reason is the shape. K-Means measures everything by distance to a single centre point, so the groups it likes are round blobs of roughly equal size. These groups are 8 long and 0 tall. A method built on "close to one centre" cannot describe "strung out along a line".`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 6: scoring both groupings of the two rows',
      code: `bars = []
for x in range(8):
    bars.append((x, 0))
    bars.append((x, 2))

by_row = []
by_side = []
for (x, y) in bars:
    by_row.append(0 if y == 0 else 1)
    by_side.append(0 if x < 4 else 1)
print('by row ', inertia(bars, by_row, update(bars, by_row, 2)))
print('by side', inertia(bars, by_side, update(bars, by_side, 2)))

# ---- real output ----
# by row  84.0
# by side 36.0`,
      annotations: {
        1: 'An empty list to build the sixteen points in.',
        2: 'range(8) gives 0 through 7 — the eight horizontal positions.',
        3: 'Add the bottom-row point at this position.',
        4: 'Add the top-row point directly above it. So bars alternates bottom, top, bottom, top.',
        6: 'The grouping a human would give: one label per point, cluster by row.',
        7: 'The grouping K-Means prefers: cluster by left or right half.',
        8: 'Walk the points, unpacking each tuple into x and y at the same time. This is tuple unpacking: because every item is a pair, Python hands the first number to x and the second to y.',
        9: 'Bottom row gets label 0, top row gets label 1.',
        10: 'Left half (positions 0 to 3) gets label 0, right half gets label 1.',
        11: 'update() turns a grouping into its two centroids, and inertia() then scores it. So this line reads: score the by-row grouping.',
        12: 'The same for the left/right grouping. The output is the hand arithmetic confirmed: 84 for the answer we want, 36 for the answer we do not.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 7: K-Means run from three different starts',
      code: `for start in ([(0, 0), (0, 2)], [(0, 0), (7, 2)], [(3, 0), (4, 2)]):
    c = start
    for step in range(20):
        lab = assign(bars, c)
        c = update(bars, lab, 2)
    print(start, lab, inertia(bars, lab, c))

# ---- real output ----
# [(0, 0), (0, 2)] [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1] 84.0
# [(0, 0), (7, 2)] [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1] 36.0
# [(3, 0), (4, 2)] [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1] 36.0`,
      annotations: {
        1: 'Three different pairs of starting centroids, tried one after another. The first pair sits in the same column, the other two are spread apart.',
        2: 'c holds the current centroids for this run.',
        3: 'Twenty rounds is far more than needed; it just guarantees the run has settled.',
        4: 'The assignment step on the sixteen row points.',
        5: 'The update step. Together these two lines are one round of K-Means.',
        6: 'Print the start, the final labels and the final score. Read the labels against the alternating order of bars: 0,1,0,1... means grouping by row, while eight 0s then eight 1s means grouping by left and right half.',
      },
    },
    {
      type: 'note',
      md: `Two of the three starts land on the left/right split at inertia 36. One start — the pair sitting in the same column, one above the other — lands on the row split at 84. And here is the sting: if you followed the standard advice and ran K-Means ten times keeping the lowest inertia, you would **throw away the run that got it right**, because 84 is a worse score than 36. The scoring rule itself is what disagrees with you. That is a shape problem, and no amount of tuning fixes a shape problem.`,
    },
    {
      type: 'intuition',
      title: 'DBSCAN: a cluster is a crowd, not a circle',
      md: `DBSCAN starts from a different definition. Forget centres entirely. A cluster is a region where points are packed close together, and it can be any shape that packing happens to take.

It needs two settings, and both are about crowding.

- **eps** (short for epsilon) is a radius. A point's **neighbourhood** is every point within eps of it, including itself.
- **minPts** is how many points must be in that neighbourhood before we call the spot crowded.

From those two, every point gets one of three names.

- A **core point** has at least minPts points in its neighbourhood. It sits inside a dense region.
- A **border point** does not, but is inside some core point's neighbourhood. It sits on the edge of a dense region.
- A **noise point** is neither: too few neighbours, and not close to any core point. DBSCAN labels it **−1** and refuses to put it in any cluster.

Now walk one point by hand, on the two rows from before, with **eps = 1.5** and **minPts = 3**.

- Take (3, 0). Its neighbours within 1.5: itself, distance 0. (2, 0), distance 1. (4, 0), distance 1. What about (3, 2), straight above it? That distance is 2, which is more than 1.5, so no. Total **3 points**, which reaches minPts = 3, so (3, 0) is a **core point**.
- Take (0, 0), at the end of the row. Neighbours: itself and (1, 0). That is **2 points**, below minPts, so it is **not core**. But it lies within 1.5 of (1, 0), which is core, so it is a **border point** and joins that cluster as a passenger.
- Add a stray point at (4, 8), far above everything. Its nearest neighbour is (4, 2), a distance of 6. Its neighbourhood holds only itself: **1 point**, not core, and not within eps of any core point. It is **noise**, labelled −1.

Clusters are then built by chaining: start at any core point, take in everything in its neighbourhood, and for each of those that is itself core, take in its neighbourhood too, and keep going. Because the chain follows the crowding, a cluster can stretch along a line as far as the density holds — which is exactly what K-Means could not do. And notice what you never supplied: **K**. The number of clusters is however many separate dense regions turn up.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 8: neighbourhoods and core points',
      code: `eps = 1.5
min_pts = 3

def neighbours(points, i):
    found = []
    for j in range(len(points)):
        if sq_dist(points[i], points[j]) <= eps * eps:
            found.append(j)
    return found

core = []
for i in range(len(bars)):
    core.append(len(neighbours(bars, i)) >= min_pts)
print('(3,0) is index 6, neighbours', neighbours(bars, 6), 'core?', core[6])
print('(0,0) is index 0, neighbours', neighbours(bars, 0), 'core?', core[0])

# ---- real output ----
# (3,0) is index 6, neighbours [4, 6, 8] core? True
# (0,0) is index 0, neighbours [0, 2] core? False`,
      annotations: {
        1: 'The radius. Chosen so a point reaches its side-neighbours 1 step away but not the other row 2 steps up.',
        2: 'How many points make a neighbourhood crowded, counting the point itself.',
        4: 'Takes the list of points and the position i of the one we are asking about.',
        5: 'A list to collect the positions of the neighbours found.',
        6: 'Compare point i against every point in the list, including itself.',
        7: 'sq_dist is squared distance, so we compare it against eps squared rather than taking a square root. Same test, less arithmetic.',
        8: 'Record the position of this neighbour.',
        9: 'Hand back all the neighbour positions.',
        11: 'A list that will hold True or False for each point: is it a core point?',
        12: 'One pass per point.',
        13: 'len(...) is the size of the neighbourhood, and >= min_pts turns that into True or False. That comparison is the definition of a core point, written directly.',
        14: 'Check the point we walked by hand. bars alternates bottom, top, so (3, 0) is at position 6, and its neighbours come back as positions 4, 6 and 8 — that is (2, 0), itself, and (4, 0). Three points, so core.',
        15: 'The end-of-row point: only positions 0 and 2, which is itself and (1, 0). Two points, so not core — a border point.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 9: growing the clusters by chaining core points',
      code: `labels = [-1] * len(bars)
cluster = 0
for i in range(len(bars)):
    if core[i] and labels[i] == -1:
        labels[i] = cluster
        queue = [i]
        while queue:
            q = queue.pop()
            for j in neighbours(bars, q):
                if labels[j] == -1:
                    labels[j] = cluster
                    if core[j]:
                        queue.append(j)
        cluster = cluster + 1
print('labels ', labels)

# ---- real output ----
# labels  [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1]`,
      annotations: {
        1: 'Every point starts labelled −1, which means noise. Multiplying a one-item list by a number repeats it, so [-1] * 16 is a list of sixteen −1s. Points earn a real label only by being reached.',
        2: 'The number to hand out to the next cluster we discover. Clusters are numbered 0, 1, 2 in the order they are found.',
        3: 'Try every point as a possible starting seed.',
        4: 'Only start a new cluster from a core point that has not been claimed yet. Starting from a border point would grow a cluster out of a thin spot.',
        5: 'Claim the seed for the current cluster number.',
        6: 'A queue: the list of claimed core points whose neighbourhoods we still have to look inside.',
        7: 'Keep going while the queue is not empty. An empty list counts as false in Python, so this stops exactly when there is nothing left to expand.',
        8: 'pop() removes the last item from the list and hands it back. That is the point we expand now.',
        9: 'Look at every neighbour of the point we just took out.',
        10: 'Only act on neighbours that are still unclaimed.',
        11: 'Claim the neighbour for this cluster. If it was a noise label a moment ago, it is not noise any more.',
        12: 'Only core neighbours get expanded further. This one line is why a border point joins a cluster but cannot extend it — the chain stops at the edge of the crowd.',
        13: 'Put the core neighbour in the queue so its own neighbourhood gets scanned too.',
        14: 'The cluster is complete, so move the counter on for the next one.',
        15: 'Print the labels. Against the alternating order of bars, 0,1,0,1... means bottom row in cluster 0 and top row in cluster 1 — the two rows recovered exactly, with no K given.',
      },
    },
    {
      type: 'note',
      md: `Same sixteen points, two methods, two answers. K-Means split them left and right and scored that split as better than the truth. DBSCAN, given no K at all, returned the two rows. And it comes with a third answer K-Means cannot give: the stray point at (4, 8) is labelled −1 rather than being forced into whichever row is nearer.

The price is that eps and minPts are harder to choose than K. K is often known from the problem — "we need five customer segments" — while eps is a distance in whatever units your columns happen to use, and nobody has an intuition for that. DBSCAN also assumes one level of crowding fits the whole dataset: if one group is packed tight and another is loose, a small eps shreds the loose group into noise and a large eps melts the tight group into its neighbours. That is its defining weakness.`,
    },
    {
      type: 'intuition',
      title: 'Hierarchical clustering: build the family tree, choose K later',
      md: `A third idea, which sidesteps the choice of K instead of solving it. **Hierarchical clustering** (the bottom-up form is called **agglomerative**) starts with every point as its own cluster and repeatedly merges the two closest clusters, until only one is left.

Run it on the original six customers. The closest pairs are (1, 1) with (2, 1) at distance 1, and (1, 1) with (1, 2) at distance 1 — so the bottom-left points merge first, at height 1. The same happens up in the top-right corner. The last merge joins those two groups, at a distance of roughly 10. Record all of it as a tree, where the height of each join is the distance at which the merge happened, and you have a **dendrogram**.

The dendrogram is the payoff. Draw a horizontal line across it at any height and count the branches it crosses — that is your clustering at that height. Cut low and you get many small clusters; cut high and you get a few large ones. **One run answers every K**, and a tall vertical gap in the tree (a big jump between one merge distance and the next) is a natural place to cut.

"The two closest clusters" needs one more definition, because a cluster of five points has no single position. **Linkage** is the rule for measuring the distance between two clusters, and the choice changes the answer.

- **Single linkage:** the distance between their two closest members. Follows thin trails, so it traces long, snaking shapes well — but a single bridge of stray points welds two real clusters together.
- **Complete linkage:** the distance between their two farthest members. Produces compact clusters, and one outlier can distort the merges.
- **Average linkage:** the average over all pairs, one from each cluster. The middle road.
- **Ward linkage:** merge the pair that increases total inertia the least. Behaves like K-Means with a tree attached, and it is the usual default.

The cost is why this is not the answer to everything: it compares every pair of points, so memory grows with the square of the number of points. Past a few tens of thousands of rows it stops being practical.`,
    },
    {
      type: 'intuition',
      title: 'GMM: letting a point be 70 percent one group',
      md: `Everything so far forces each point into exactly one group. Look again at a customer sitting halfway between the bargain group and the premium group. Calling it "premium" is a coin flip you are recording as a fact.

A **Gaussian Mixture Model**, or **GMM**, allows the honest answer. Instead of a label, each point gets a number per cluster saying how strongly it belongs, and those numbers add to 1. A point can come out **70 percent cluster A and 30 percent cluster B**. That is a **soft assignment**, as against the hard, all-or-nothing assignment K-Means makes. A point deep inside one group comes out 99 to 1, and the genuinely ambiguous ones come out near 50-50, which lets you find them and hand them to a human instead of guessing.

The method that fits it is called **EM**, and its shape is the K-Means loop with the hardness removed. E step: with the clusters held fixed, work out each point's percentages. M step: with the percentages held fixed, re-fit each cluster using every point, weighted by its percentage — so a 70-30 point contributes 0.7 of itself to one cluster and 0.3 to the other. Alternate until nothing moves. Like K-Means, it always settles, and like K-Means, where it settles depends on where it started.

The other practical difference: each GMM cluster can be a stretched, tilted oval rather than a circle, so it handles elongated and overlapping groups that K-Means cuts through. The details of what a Gaussian is and why EM improves every round are under *Beyond the basics* at the end.`,
    },
    {
      type: 'intuition',
      title: 'Which one do I reach for?',
      md: `Read down and stop at the first line that matches your data.

- **Lots of rows, roughly round groups, and you know how many** → K-Means. It is by far the fastest of these and the only one that runs comfortably on millions of rows. Scale your columns first, and run it several times.
- **You do not know how many groups, and the data is small** → hierarchical with Ward linkage, then read the dendrogram and cut it.
- **Odd shapes, unknown number of groups, and outliers you want named** → DBSCAN. Scale your columns first here too, since eps is a distance.
- **Groups that overlap, or you want a confidence per point** → GMM.
- Whichever you pick: scale the columns, run it more than once, and get a human to look at the groups and say what they are. A tight clustering and a meaningful clustering are different claims.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: seven shoppers, by hand, start to finish',
      md: `A shop has seven customers described by (visits per month, items per visit). Cluster them into two groups, then check the answer with DBSCAN.

- (1, 2) · (2, 1) · (2, 3) · (9, 8) · (10, 9) · (8, 9) · (5, 5)

The last one is deliberately awkward: it sits between the two obvious groups. Start K-Means with centroids at two real data points, c0 = (1, 2) and c1 = (9, 8).

**Round 1, assign.** (1, 2) is at distance 0 from c0, so group 0. (2, 1): to c0 is 1 + 1 = 2, to c1 is 49 + 49 = 98 — group 0. (2, 3): to c0 is 1 + 1 = 2, to c1 is 49 + 25 = 74 — group 0. (9, 8) is at 0 from c1 — group 1. (10, 9): to c0 is 81 + 49 = 130, to c1 is 1 + 1 = 2 — group 1. (8, 9): to c0 is 49 + 49 = 98, to c1 is 1 + 1 = 2 — group 1. And (5, 5): to c0 is 16 + 9 = **25**, to c1 is 16 + 9 = **25**. An exact tie, broken by the tie rule, so it goes to group 0.

**Round 1, update.** Group 0 is (1, 2), (2, 1), (2, 3), (5, 5): averages are 10/4 = 2.5 and 11/4 = 2.75, so c0 = (2.5, 2.75). Group 1 is (9, 8), (10, 9), (8, 9): averages are 27/3 = 9 and 26/3 = 8.667, so c1 = (9, 8.667).

**Round 2, assign.** Recheck the awkward point. (5, 5) to c0 is (5 − 2.5)² + (5 − 2.75)² = 6.25 + 5.06 = **11.31**; to c1 it is (5 − 9)² + (5 − 8.667)² = 16 + 13.44 = **29.44**. It stays in group 0. Nothing else moves either, so the centroids do not move, and we have converged in two rounds.

**Inertia.** Group 0: (1, 2) gives 2.25 + 0.5625 = 2.81; (2, 1) gives 0.25 + 3.06 = 3.31; (2, 3) gives 0.25 + 0.0625 = 0.31; (5, 5) gives 11.31. Subtotal 17.75. Group 1: (9, 8) gives 0 + 0.44 = 0.44; (10, 9) gives 1 + 0.11 = 1.11; (8, 9) gives 1 + 0.11 = 1.11. Subtotal 2.67. **Total inertia 20.42** — and note that the single point (5, 5) contributes 11.31 of it, more than half.

**Now DBSCAN on the same seven points, with eps = 2 and minPts = 3.** Inside the bottom-left group all three pairwise distances are small: (1, 2) to (2, 1) is about 1.41, (1, 2) to (2, 3) is 1.41, (2, 1) to (2, 3) is exactly 2. So each of those three has a neighbourhood of 3 including itself, and all three are core points forming one cluster. The top-right group is identical in shape, so it forms a second cluster. And (5, 5)? Its nearest neighbour is (2, 3), at a distance of about 3.61, well beyond eps = 2. Its neighbourhood holds only itself: **noise, label −1**.

Both answers are defensible, and they say different things. K-Means says the shop has two groups and this customer is a weak member of the bargain group. DBSCAN says the shop has two groups and this customer belongs to neither. The inertia breakdown agrees with DBSCAN — that one point cost more than the other six combined.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: running K-Means on unscaled columns',
      md: `Six website visitors, described by (hours on site this month, rupees spent this month).

- (1, 10000) · (2, 50000) · (3, 30000) · (8, 20000) · (9, 40000) · (10, 10000)

The real structure is in the first column: three light visitors at 1 to 3 hours, three heavy ones at 8 to 10 hours. The spending column is noise — every visitor happens to have spent somewhere between 10,000 and 50,000, regardless of how long they stayed.

Run K-Means with K = 2 straight on those numbers. It returns the groups {(1, 10000), (8, 20000), (10, 10000)} and {(2, 50000), (3, 30000), (9, 40000)}, at an inertia of **266,666,740**. Both light and heavy visitors are mixed into each group. The real split by hours scores an inertia of **1,266,666,671** — nearly five times worse, so K-Means correctly rejected it.

Here is why, in one line of arithmetic. Squared distance adds the squared gap in each column. Between the first two visitors, the hours gap is 1, contributing 1. The rupees gap is 40,000, contributing 1,600,000,000. The hours column contributes about one billionth of the distance. It might as well not exist. K-Means was not confused — it clustered the only column it could see.

**The fix is to put both columns on the same footing before clustering.** The simplest version: for each column, subtract its smallest value and divide by its range, so every column ends up between 0 and 1. Hours run 1 to 10, a range of 9; rupees run 10,000 to 50,000, a range of 40,000. That turns the six points into (0, 0), (0.111, 1), (0.222, 0.5), (0.778, 0.25), (0.889, 0.75), (1, 0).

Score both groupings again on the scaled points. Splitting by hours now gives an inertia of **0.841**; the spend-driven grouping gives **1.072**. The order has flipped, and K-Means now returns the light and heavy groups. Same algorithm, same data, one preparation step.

Two warnings while you are here. First, this is not optional or occasional — any time your columns are in different units, distance is meaningless until you scale, and this is the most common real bug in clustering code. Second, on the scaled data a start with both centroids near the top-left still converges to the wrong grouping at 1.072. Scaling fixed the units. It did not remove the need to run the algorithm several times.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work these on paper before reading the solutions. All the arithmetic is small on purpose.

1. Points (0, 0), (1, 0), (6, 0), (7, 0), with starting centroids c0 = (0, 0) and c1 = (1, 0). Do the assignment step, then the update step, then a second round. Where does it converge, and what is the final inertia?
2. Four points: (0, 0), (5, 0), (0, 1), (5, 1). Compute the inertia of grouping them by row (the two points with the same second number together) and of grouping them by column. Which one does K-Means choose, and what does that tell you about the shape of these groups?
3. Six points along a line: (0, 0), (1, 0), (2, 0), (5, 0), (6, 0), (7, 0). With eps = 1.5 and minPts = 3, label every point core, border or noise, and say how many clusters DBSCAN finds. Then answer the same question with minPts = 4.
4. Two customers, described by (age in years, annual spend in rupees): A = (25, 400000) and B = (55, 420000). Compute the squared distance between them and say what share of it comes from the age column. Then scale both columns to 0-to-1 using an age range of 40 years and a spend range of 800,000 rupees, and recompute the share.`,
    },
    {
      type: 'intuition',
      title: 'Solutions',
      md: `**1.** Assignment: (0, 0) is at distance 0 from c0 and 1 from c1, so group 0. (1, 0) is at 1 from c0 and 0 from c1, so group 1. (6, 0) is at 36 from c0 and 25 from c1, so group 1. (7, 0) is at 49 versus 36, so group 1. Update: c0 is the average of just (0, 0), so it stays at (0, 0); c1 is the average of 1, 6 and 7, which is 14/3 = 4.667, so c1 = (4.667, 0). Round 2: (1, 0) is now at 1 from c0 and 13.44 from c1, so it switches to group 0; (6, 0) and (7, 0) stay in group 1. Update gives c0 = (0.5, 0) and c1 = (6.5, 0). Round 3 changes nothing, so it has converged. Inertia: each of the four points is 0.5 from its centroid, so 0.25 each, **total 1.0**.

**2.** By row, the centroids are (2.5, 0) and (2.5, 1); each point is 2.5 away horizontally, giving 6.25 each, so **inertia 25**. By column, the centroids are (0, 0.5) and (5, 0.5); each point is 0.5 away vertically, giving 0.25 each, so **inertia 1**. K-Means chooses the column grouping. These groups are 5 wide and 1 tall — wide and flat, not round — so the split that cuts across the long direction wins on score. It is the two-rows failure in miniature.

**3.** With minPts = 3: (0, 0) has neighbours itself and (1, 0), so 2 — not core. (1, 0) has itself, (0, 0) and (2, 0), so 3 — core. (2, 0) has itself and (1, 0), so 2 — not core, but within eps of the core point (1, 0), so border. The right-hand trio behaves identically, with (6, 0) core. Result: **two clusters, no noise**, the ends being border points. With minPts = 4, no point in this data has four neighbours within 1.5, so there are no core points at all, and **every point is noise**. One step in a setting turned six clustered points into six outliers — which is exactly why eps and minPts have to be checked, not guessed once.

**4.** Raw: the age gap is 30, squaring to 900; the spend gap is 20,000, squaring to 400,000,000. Total 400,000,900, of which age is 900 — about **0.0002 percent**. Scaled: dividing a column by its range divides every gap in that column by the same number, so the age gap becomes 30/40 = 0.75, squaring to 0.5625, and the spend gap becomes 20,000/800,000 = 0.025, squaring to 0.000625. Total 0.563125, of which age is now about **99.9 percent**. The two columns swapped roles entirely, and nothing about the customers changed.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Depth for a second pass, once everything above is comfortable.

**Why the update step cannot raise inertia.** Fix a group of points and ask which single position minimises the total squared distance to all of them. Write the total as a function of the candidate position, differentiate, set it to zero, and the answer is the arithmetic mean. So moving a centroid to the mean of its group is not a heuristic, it is the exact minimiser — which is where the word *Means* in K-Means comes from. Combined with the assignment step, which lowers inertia by construction, this gives the convergence argument in full.

**What a Gaussian actually is.** A Gaussian, or normal distribution, is the bell-shaped curve: most values near a centre, fewer as you move away, described by a mean and a spread. In two or more columns the spread becomes a **covariance matrix**, which records not just how wide the cluster is in each direction but how the directions tilt together — that is what lets a GMM cluster be a rotated oval. A GMM assumes the data came from K such bells mixed together, each with its own weight, centre and covariance, and fitting means recovering all of those.

**Why EM improves every round.** Each round maximises a quantity that sits below the true likelihood of the data and touches it exactly at the current parameters, so pushing that quantity up also pushes the likelihood up. The likelihood is bounded, and a bounded quantity that never decreases must settle. Same caveat as K-Means: it settles at a local best, so restart it more than once. There is also a degenerate case where one cluster shrinks onto a single point and its likelihood blows up, which is why libraries add a small floor to every covariance.

**K-Means as a special case of GMM.** Force every cluster to be a perfect circle of the same size, and round every soft percentage to 0 or 1. The E step becomes "assign to the nearest centre" and the M step becomes "move to the mean". K-Means is exactly GMM with those two restrictions applied.

**Varying density and HDBSCAN.** DBSCAN's single eps is one crowding threshold for the whole dataset. HDBSCAN instead builds clusters across all thresholds at once and keeps the ones that persist longest, so a dense cluster and a loose cluster can both survive. It is the standard replacement when DBSCAN gives you one giant cluster plus a pile of noise no matter what eps you try.

**Picking eps in practice.** For every point, measure the distance to its minPts-th nearest neighbour, sort those distances, and plot them. The plot rises gently and then turns sharply upward; the distance at the turn is a good eps, because beyond it you are reaching into empty space. In many columns this stops working, because distances all converge to a similar value and there is no turn — reduce dimensions first, or use another method.

**Outliers and K-Medoids.** The mean is not robust: one point far away drags its centroid noticeably. K-Medoids uses an actual data point as each cluster centre instead of an average, which cannot be dragged, at a higher computational cost.

**No predict for DBSCAN.** K-Means and GMM keep something you can score a new point against — centres, or bells. DBSCAN keeps nothing of the kind, so there is no way to assign a new point without re-running it. In production, people re-fit on a schedule, or train a classifier on the labels DBSCAN produced and use that for new points.`,
    },
  ],
  quiz: [
    {
      question: 'K-Means always converges. What exactly does that guarantee promise?',
      options: [
        {
          text: 'That it stops at a grouping no single step can improve — which need not be the best grouping',
          explanation:
            'Correct. Both steps only push inertia down, and there are finitely many ways to group the points, so the score must stop falling. Nothing in that argument says the resting point is the lowest one possible.',
        },
        { text: 'That it finds the lowest possible inertia for that K', explanation: 'The visual in this module shows two runs on identical data settling at about 62,000 and about 336,000. Both converged; only one is good.' },
        { text: 'That it runs a fixed number of rounds and then stops', explanation: 'A round limit is a safety cap. K-Means normally stops earlier, the moment a round changes no labels.' },
      ],
      correct: 0,
    },
    {
      question: 'On the sixteen points in two rows, grouping by row scores inertia 84 and grouping left/right scores 36. What does that tell you?',
      options: [
        { text: 'The starting centroids were unlucky; more restarts would find the rows', explanation: 'Backwards. Restarts keep the lowest inertia, which is 36 — the split you did not want. More restarts make it more likely you get the wrong answer.' },
        {
          text: 'K-Means prefers the wrong grouping by its own score, because the groups are long and thin rather than round',
          explanation:
            'Correct. Inertia measures distance to one centre, so it rewards compact round groups. Two long rows are not that shape, so the score itself disagrees with the answer you want. Tuning cannot fix it.',
        },
        { text: 'The data needs scaling', explanation: 'Both columns here are already small whole numbers in similar ranges. Scaling changes nothing about this failure.' },
      ],
      correct: 1,
    },
    {
      question: 'What problem does K-Means++ solve?',
      options: [
        { text: 'It removes the need to choose K', explanation: 'K-Means++ only decides where the K centroids start. You still supply K.' },
        { text: 'It guarantees the lowest possible inertia', explanation: 'It makes a bad start much less likely, not impossible. That is why n_init is still used alongside it.' },
        {
          text: 'Random starting centroids can land close together; K-Means++ picks them spread apart on purpose',
          explanation:
            'Correct. Each new centroid is chosen with a chance proportional to its squared distance from the nearest one already chosen, so far-away points are heavily favoured and the "all in one corner" start becomes very unlikely.',
        },
      ],
      correct: 2,
    },
    {
      question: 'A point has 3 neighbours within eps, minPts is 5, and one of those neighbours is a core point. What is this point?',
      options: [
        { text: 'A core point', explanation: 'Core requires at least minPts points in the neighbourhood. Three is fewer than five.' },
        { text: 'A noise point', explanation: 'Noise means not core AND not inside any core point\'s neighbourhood. This point is inside one.' },
        {
          text: 'A border point: it joins that core point\'s cluster but cannot extend it further',
          explanation:
            'Correct, and the second half matters. Only core points get expanded, so a border point is taken in as a passenger and the chain stops there.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Whatever eps you try, DBSCAN returns either one giant cluster or almost everything as noise. Most likely cause?',
      options: [
        {
          text: 'The groups have genuinely different crowding, and one eps cannot serve both',
          explanation:
            'Correct, and it is DBSCAN\'s defining weakness. A small eps shreds the loose group; a large one melts the tight group into its neighbours. HDBSCAN, which handles many thresholds at once, is the usual replacement.',
        },
        { text: 'minPts is too low', explanation: 'A lower minPts produces more and bigger clusters with less noise. It would not produce the see-saw as eps changes.' },
        { text: 'You forgot to pass K', explanation: 'DBSCAN never takes K. Finding the number of clusters itself is one of its selling points.' },
      ],
      correct: 0,
    },
    {
      question: 'What does a soft assignment give you that a hard one does not?',
      options: [
        { text: 'Faster fitting', explanation: 'Fitting a GMM with EM is slower per round than K-Means, not faster.' },
        {
          text: 'A number per cluster per point, so you can tell a 99-to-1 point from a 51-to-49 point',
          explanation:
            'Correct. K-Means gives both of those points a plain label and no way to tell them apart. The percentages let you find the genuinely ambiguous points and treat them differently.',
        },
        { text: 'The right number of clusters', explanation: 'A GMM still needs the number of components handed to it, just as K-Means needs K.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain K-Means as if I have never seen it, then tell me why it converges.',
      answer:
        'Two steps that alternate. Assign: every point joins its nearest centroid, where a centroid is a proposed centre of a group. Update: every centroid moves to the average position of the points that joined it. Repeat until a round changes no assignments. It converges because both steps lower the same score, inertia, which is the total squared distance from each point to its own centroid. Assign lowers it because each point moves to a cheaper centre. Update lowers it because the average is the position with the smallest total squared distance to a set of points. A score that only falls, over a finite list of possible groupings, has to stop falling. The important qualification: it stops at a grouping no single step improves, which is decided by where the centroids started, not at the best grouping overall.',
      isCaseBased: false,
    },
    {
      question: 'When does K-Means fail, and what is the underlying reason?',
      answer:
        'Every failure comes from one fact: points are assigned by distance to a single centre, so the groups it can describe are round and roughly equal in size. Long or curved groups get cut across rather than traced — I can show this with two rows of points where the correct grouping scores worse on inertia than the wrong one, so restarts make it worse rather than better. Groups of very different size or crowding get their border pushed into the sparser one. A single far-off point drags its centroid, because a mean is not robust. Columns in different units break it completely, since a column measured in rupees swamps a column measured in hours, so scaling first is mandatory. And K has to be supplied up front, which is often the thing you wanted to learn. The replacements: DBSCAN for odd shapes and for outliers you want named, GMM for overlapping or elongated groups and for a confidence per point, K-Medoids when outliers dominate.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague clusters users with K-Means on the columns age (18 to 70), monthly spend (0 to 500,000 rupees) and number of logins (0 to 300). The clusters look like nothing but spend brackets. Debug it.',
      answer:
        'The columns are unscaled and spend has a range three orders of magnitude larger than age. Distance adds the squared gap per column, so a 100,000-rupee gap contributes ten billion while a 30-year age gap contributes 900. K-Means is effectively clustering on spend alone, and the segments are just spend quantiles. Fix: scale every column to a comparable range before clustering — standardising each column, or dividing by its range. Since spend is money it will be long-tailed, so take a log first, or use a scaler based on quantiles rather than the mean, otherwise a few very large spenders each capture their own centroid. Then re-run and re-check the grouping. After that, two follow-ups. Confirm the segments are stable: re-run on a resample and see whether the same groups reappear, since clusters that dissolve under resampling were an artefact. And confirm they are describable: if nobody can say in a sentence what each segment is, the clustering has not done its job however tight it looks.',
      isCaseBased: true,
    },
    {
      question: 'How do you choose K?',
      answer:
        'Not from inertia alone, because inertia falls every time K rises and hits zero when every point is its own cluster, so the lowest-inertia rule always answers "as many clusters as rows". The usual pair of tools is the elbow, where you plot inertia against K and look for the bend where it stops dropping steeply, and the silhouette score, which measures for each point how much closer it is to its own cluster than to the next nearest one, and which has a real peak rather than falling forever. In practice I use the elbow to bracket a plausible range and silhouette to pick inside it. Above both of those sits any constraint from the problem itself: if the team can only run five campaigns, K is five and no curve overrules that. For a GMM there is a more principled option, because a mixture model has a real likelihood, so information criteria can compare values of K directly.',
      isCaseBased: false,
    },
    {
      question: 'Explain DBSCAN, and why "no K needed" is not a free lunch.',
      answer:
        'DBSCAN defines a cluster as a region where points are packed together. Two settings: eps, a radius, and minPts, how many points must sit within that radius to call the spot crowded. A core point has at least minPts points within eps. A border point does not, but lies within eps of a core point. A noise point is neither and gets labelled minus one. Clusters grow by chaining core points that fall inside each other\'s neighbourhoods and absorbing their borders, so a cluster follows the crowding into any shape. You never pass K. But you pass eps and minPts instead, and eps is harder to choose than K, because K is often known from the business while eps is a raw distance in whatever units your columns use. It also assumes one level of crowding fits the whole dataset, so groups of genuinely different density defeat it. And it keeps no model, so there is no way to assign a new point without re-running it.',
      isCaseBased: false,
    },
    {
      question: 'What does a dendrogram give you that K-Means labels do not?',
      answer:
        'A dendrogram records the whole merge history as a tree, with the height of each join being the distance at which those two clusters merged. So one run answers every K: draw a horizontal line at any height and the branches it crosses are your clusters. Cut low for many small groups, cut high for a few large ones. It also shows nested structure — segments inside segments — and a tall vertical gap, meaning a height range where nothing wanted to merge, is a natural place to cut. Practically it is also something you can show a domain expert, which a list of cluster numbers is not. The cost is that it compares every pair of points, so memory grows with the square of the row count and it stops being usable past a few tens of thousands of rows. Above that I cluster a sample hierarchically to choose K, then run K-Means on everything with that K.',
      isCaseBased: false,
    },
    {
      question: 'Case: DBSCAN on 200,000 rows of 60-column sensor data returns everything as one cluster, or everything as noise, depending on eps. Nothing in between. What is going on and what do you do?',
      answer:
        'Two causes, and the second is usually the real one. First, genuinely different crowding across the data, which one global eps cannot serve — that alone produces this see-saw. Second, sixty columns: as the number of columns grows, distances between points all drift towards the same value, so the nearest and the farthest neighbour end up almost equally far away. Once that happens the "within eps" test stops separating anything, and eps behaves as an on-off switch, which is exactly the symptom described. Plan: plot the sorted distance to each point\'s minPts-th nearest neighbour and look for the turn. If there is no turn, that confirms the distances have flattened. Then check the columns are scaled, reduce the number of columns — principal components keeping most of the variance, or a learned embedding — and re-run. If the crowding genuinely varies after that, switch to HDBSCAN, which works across many thresholds instead of one. Scale is also a factor: at 200,000 rows DBSCAN needs a spatial index to stay fast, and those indexes degrade towards brute force in high dimensions, which is another reason to cut the columns first.',
      isCaseBased: true,
    },
    {
      question: 'Case: overnight, your production customer-segmentation job (K-Means, K = 5) starts producing segments that no longer match last week\'s. Nobody changed the model. Diagnose.',
      answer:
        'In order of suspicion. First, cluster numbers are arbitrary: a fresh fit hands them out in whatever order it found the clusters, so segment 3 today need not be segment 3 yesterday. Check whether the actual partition differs before assuming anything broke, by measuring agreement with last week\'s labels; if agreement is high, this is a numbering bug, fixed by matching this run\'s centroids to the previous ones. Second, if the partition really changed: the random seed is unset or the number of restarts is low, so the job settled in a different local answer. Pin the seed and raise the restart count. Third, the scaler. If the scaling step is re-fitted inside the nightly job, then shifting column means and ranges silently move every point even when the underlying customers did not change — fit the scaler once and save it. Fourth, genuine drift: an upstream schema change, a new market, or a broken pipeline filling nulls with zeros. Compare the column distributions week over week. The preventive fix is to freeze the scaler and the centroids, run assignment only in production, and re-fit deliberately on a schedule with a stability check gating the release.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    {
      front: 'K-Means in two steps',
      back: 'Assign: every point joins its nearest centroid. Update: every centroid moves to the average of its own points. Repeat until a round changes no labels. Both steps only lower inertia, so it always converges — but to a grouping decided by where it started, not the best one.',
    },
    {
      front: 'Inertia',
      back: 'Add up the squared distance from every point to its own centroid. It is the score K-Means lowers. It always falls as K rises and reaches zero when every point is its own cluster, so lowest inertia is never a rule for choosing K.',
    },
    {
      front: 'Initialisation, n_init and K-Means++',
      back: 'Initialisation is the choice of starting centroids, and it decides the final answer. n_init runs the whole thing several times and keeps the lowest inertia. K-Means++ picks each new starting centroid with a chance proportional to its squared distance from the nearest one already chosen, so the starts spread out on purpose.',
    },
    {
      front: 'Why K-Means fails on long thin groups',
      back: 'Two rows of eight points: grouping by row scores inertia 84, splitting left from right scores 36. The wrong answer wins on K-Means\' own score, so restarts make it worse. Distance to one centre can only describe round, similar-sized groups.',
    },
    {
      front: 'DBSCAN: core, border, noise',
      back: 'Core: at least minPts points within radius eps, counting itself. Border: not core, but inside a core point\'s neighbourhood. Noise: neither, labelled −1. Clusters grow only by chaining core points, so they follow the crowding into any shape and no K is needed.',
    },
    {
      front: 'What DBSCAN costs',
      back: 'eps is a raw distance and harder to choose than K. One eps assumes one level of crowding for the whole dataset, so groups of different density defeat it — that is its defining weakness. And it keeps no model, so a new point cannot be assigned without re-running.',
    },
    {
      front: 'Dendrogram and linkage',
      back: 'Merge the two closest clusters repeatedly and record the tree, with merge distance as height; cut at any height for any K from one run. Linkage is how you measure the distance between two clusters: single (closest pair, follows trails, chains), complete (farthest pair, compact), average (middle), Ward (least inertia increase, the usual default).',
    },
    {
      front: 'Soft assignment (GMM)',
      back: 'Instead of one label per point, a percentage per cluster adding to 1 — a point can be 70 percent A and 30 percent B. It separates confident points from genuinely ambiguous ones, and each GMM cluster can be a tilted oval rather than a circle. Fitted by EM, which is the K-Means loop with the percentages left soft.',
    },
  ],
  mindmapMarkdown: `- Clustering: finding groups with no answer column
  - The setting
    - Inputs only, no correct-answer column
    - A cluster: points close together, far from the rest
    - No score to check against; a bad K still looks tidy
  - K-Means
    - Assign to nearest centroid, move centroid to the mean
    - Inertia: total squared distance to own centroid
    - Only falls -> always converges
    - ...but to a grouping decided by the start
  - Initialisation
    - n_init: run several times, keep lowest inertia
    - K-Means++: seed spread out, chance by squared distance
  - Choosing K
    - Inertia alone is useless (falls to zero)
    - Elbow to bracket, silhouette to decide
    - Taught in Metrics: judging a clustering with no answer
    - A business constraint overrules any curve
  - Where K-Means breaks
    - Two rows: correct grouping scores 84, wrong one 36
    - Long, thin, curved or uneven groups
    - Unscaled columns: rupees swamp hours
    - Outliers drag the mean; K must be given up front
  - DBSCAN
    - eps radius + minPts crowd size
    - Core / border / noise (-1)
    - Chains core points -> any shape, no K, outliers named
    - One eps for all -> varying density defeats it
  - Hierarchical
    - Merge the two closest clusters, record the tree
    - Dendrogram: cut at any height -> any K, one run
    - Linkage: single, complete, average, Ward
    - Compares every pair -> small data only
  - GMM
    - Soft assignment: 70 percent A, 30 percent B
    - Clusters can be tilted ovals
    - EM: percentages, then re-fit weighted; local best only
  - Choosing a method
    - Big and round -> K-Means (scaled, restarted)
    - Unknown K, small data -> Ward dendrogram
    - Odd shapes plus outliers -> DBSCAN
    - Overlap or confidence needed -> GMM`,
}

export default m
