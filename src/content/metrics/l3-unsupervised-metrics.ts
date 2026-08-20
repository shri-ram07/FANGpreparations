import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l3-unsupervised-metrics',
  subjectId: 'metrics',
  level: 3,
  title: 'Judging a Clustering When There Is No Correct Answer',
  whyItMatters:
    'Every metric you have met so far compares a prediction to a true label. Clustering hands you a pile of points and no labels at all, so there is nothing to compare against and the usual metrics cannot even be computed. This module builds the three numbers people actually use in that situation, from nine points you can draw on paper: inertia, silhouette, and Davies-Bouldin. You will compute one point\'s silhouette fully by hand, and see why the obvious idea - "pick the number of groups that makes inertia smallest" - always returns the most useless possible answer.',
  assumes: [
    'You know what an average is: add the numbers, divide by how many there are',
    'You know how to measure the distance between two points on a graph',
    'You have seen a Python list, a for loop, and an if statement',
    'No clustering background is needed. Cluster, centroid and every other term used here is defined here.',
  ],
  estMinutes: 38,
  sections: [
    {
      type: 'intuition',
      title: 'Nine points, three obvious groups, and no label column',
      md: `Here are nine points. Each one is just a pair of coordinates - across, then up.

- **(1,1) (2,1) (1,2)** sit in the bottom-left corner, all within one step of each other.
- **(8,1) (9,1) (8,2)** sit in the bottom-right corner, the same tight little triangle, seven steps away.
- **(4,7) (5,7) (4,8)** sit near the top-middle.

Draw them on graph paper and your eye does the work instantly: three groups. Now look at what you were actually given. Nine coordinate pairs. That is all. There is no tenth column saying which group each point belongs to, and there never will be - nobody wrote one, and nobody is going to.

That is the whole difference from everything you have studied so far. Accuracy, precision and recall all work the same way: take the model's answer, take the true answer, compare them. Here there is no true answer. So accuracy is not a *bad* choice for this problem - it **cannot be computed at all**, because there is no second column to put into the comparison.

So the question this module answers is: given only the coordinates and your proposed grouping, what number tells you the grouping is any good?`,
    },
    {
      type: 'intuition',
      title: 'Two words you need first: cluster and centroid',
      md: `Both are simple, and both get used in every sentence from here on.

- A **cluster** is one of the groups. Nothing more. If you decide (1,1), (2,1) and (1,2) belong together, those three points are a cluster. A **clustering** is the full list of which point went into which cluster.
- **K** is the number of clusters you asked for. Here K = 3.
- A **centroid** is the average position of a cluster - the average of all its across-values, and separately the average of all its up-values. It is the balance point of the group, and it is usually not one of your actual points.
- Centroid of the bottom-left cluster: across = (1 + 2 + 1)/3 = 1.333, up = (1 + 1 + 2)/3 = 1.333. So the centroid sits at **(1.333, 1.333)**, just inside the little triangle.
- **Distance** between two points is the ordinary straight-line distance from school maths: square the difference across, square the difference up, add them, take the square root.

Compute that centroid in code, so the number is not just my word for it.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 1: the centroid of one cluster',
      code: `pts = [(1,1), (2,1), (1,2), (8,1), (9,1), (8,2), (4,7), (5,7), (4,8)]
group_a = [0, 1, 2]

sx = 0.0
sy = 0.0
for i in group_a:
    sx = sx + pts[i][0]
    sy = sy + pts[i][1]
cx = sx / len(group_a)
cy = sy / len(group_a)
print('centroid of A =', round(cx, 4), round(cy, 4))

# ---- real output ----
# centroid of A = 1.3333 1.3333`,
      annotations: {
        1: 'All nine points in one list. Each item is a tuple - a small fixed pair written with round brackets. So pts[0] is the pair (1,1), and pts[0][0] is its across-value, 1.',
        2: 'Which points belong to cluster A. We store positions in pts rather than the coordinates themselves, so the same list of positions can be looked up again later.',
        4: 'A running total for the across-values, starting at zero. Written 0.0 so it accumulates decimals.',
        5: 'The same running total for the up-values.',
        6: 'Walk over the three positions in cluster A: i takes the value 0, then 1, then 2.',
        7: 'Add this point\'s across-value to the across total. pts[i][0] means "item i of pts, then item 0 of that pair".',
        8: 'Add this point\'s up-value to the up total. pts[i][1] is the second half of the pair.',
        9: 'Divide the across total by how many points there were. len(group_a) is 3, so this is just an average.',
        10: 'The same average for the up-values. Together (cx, cy) is the centroid.',
        11: 'Print both to 4 decimal places: 1.3333 and 1.3333, matching the hand calculation above.',
      },
    },
    {
      type: 'intuition',
      title: 'Inertia: how far every point sits from its own centroid',
      md: `The first idea anyone has is that a good cluster is a **tight** cluster. Measure tightness like this.

- For every point, measure the distance to the centroid of its own cluster, and square it.
- Add up all those squared distances, over every point in every cluster. That single total is called **inertia**. You will also see it written WCSS, short for within-cluster sum of squares.
- Squaring does two things: it makes every term positive, and it makes one far-flung point count for much more than two mildly-off points.
- Small inertia means every point sits close to its group's balance point. Large inertia means the groups are loose and spread out.
- Inertia is also exactly the number the K-Means algorithm is built to reduce. Every step it takes lowers inertia.

Compute it for our nine points, split the obvious way.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 2: inertia for all three clusters',
      code: `def dist(p, q):
    return ((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2) ** 0.5

def centroid(group):
    sx = sum(pts[i][0] for i in group)
    sy = sum(pts[i][1] for i in group)
    return (sx / len(group), sy / len(group))

groups = [[0, 1, 2], [3, 4, 5], [6, 7, 8]]
inertia = 0.0
for g in groups:
    c = centroid(g)
    for i in g:
        inertia = inertia + dist(pts[i], c) ** 2
print('inertia at K = 3:', round(inertia, 4))

# ---- real output ----
# inertia at K = 3: 4.0`,
      annotations: {
        1: 'A function taking two points. p and q are each a coordinate pair like (1,1).',
        2: 'The straight-line distance: difference across squared, plus difference up squared, then ** 0.5, which is Python for square root - raising to the power one half.',
        4: 'A function returning the centroid of any group, so step 1 does not have to be written out three times.',
        5: 'sum(pts[i][0] for i in group) is a generator expression: it produces pts[i][0] for each i in group, and sum adds them all up. It is the loop from step 1 written on one line.',
        6: 'The same one-line total for the up-values.',
        7: 'Hand both averages back as a pair. return gives the value to whoever called the function.',
        9: 'The clustering being judged: three lists of positions, one list per cluster.',
        10: 'The running total of squared distances, starting at zero.',
        11: 'Take one cluster at a time. g is a list of positions such as [0, 1, 2].',
        12: 'Compute this cluster\'s centroid once, before looping over its points.',
        13: 'Now walk over each point in this cluster.',
        14: 'Distance from the point to its own centroid, squared, added to the running total. This one line is the whole definition of inertia.',
        15: 'Print the total: 4.0 for these nine points split into three tight triangles.',
      },
    },
    {
      type: 'intuition',
      title: 'Why "make inertia as small as possible" is not a valid goal',
      md: `Inertia is a real measurement, but it cannot be used to choose K. The argument is short enough to check yourself.

- Start at K = 1: one cluster holding all nine points, centroid somewhere in the middle, every point far from it. Inertia is large.
- Now allow K = 2. The best two-way split can always do at least as well as the one-way split, because one option available to it is to put everything in the first cluster and leave the second empty. So the best inertia at K = 2 is never worse than at K = 1.
- The same argument runs at every step. **Adding a cluster can never increase the best achievable inertia.** It can only help, or do nothing.
- Push it to the end. At K = 9, one cluster per point, each cluster holds a single point - and the average of one point is that point itself. Every distance is zero, so **inertia is exactly 0**.
- So "choose the K with the smallest inertia" has a guaranteed answer: K = the number of points. That is not a grouping of your data. It is your data, listed.

This is not a subtle flaw. Any procedure that minimises inertia returns the most useless answer available, every single time.`,
    },
    {
      type: 'intuition',
      title: 'The elbow method, and why it is a judgement call',
      md: `Since the minimum is useless, people look at the *shape* of the inertia curve instead. Take six points on a line at 0, 1, 2, 10, 11, 12, and compute the best inertia at each K.

- K = 1: everything in one cluster, centroid at 6. Squared distances 36, 25, 16, 16, 25, 36. Inertia = **154**.
- K = 2: split into {0,1,2} and {10,11,12}. Centroids 1 and 11. Squared distances 1, 0, 1 and 1, 0, 1. Inertia = **4**.
- K = 3, 4, 5, 6 give **2.5, 1.0, 0.5, 0**.
- The drop from K = 1 to K = 2 is 150. The drop from K = 2 to K = 3 is 1.5. After that the curve is nearly flat.
- Plot those six numbers and the line falls off a cliff, then flattens. The bend is at K = 2. The **elbow method** is exactly this: pick the K where the curve stops dropping steeply, because after that point extra clusters buy almost nothing.

Now the honest part. The elbow is something a person reads off a picture, not something a formula outputs. On these six points the bend is unmissable. On real data the curve is often a smooth arc with no bend anywhere, and two competent engineers will read 3 and 5 off the same plot. Treat the elbow as a shortlist of candidate values for K, never as the decision.`,
    },
    { type: 'visual', component: 'KMeansStepper', props: {} },
    {
      type: 'note',
      md: `Step through the widget and watch the inertia readout in the top-right. On the default start it falls at every frame and settles near **62,351**. Now switch the start to **"one corner"** and step again. Inertia still falls at every frame, still stops changing, still reports success - and settles at about **336,333**, five times worse, with two centroids splitting one blob while a third swallows the other two. So a falling inertia only tells you the algorithm is running; it is not evidence that the answer is good. And notice what inertia measured in both runs: distance from each point to its own centroid, and nothing else. It never once asked whether the clusters are far from **each other**. That missing half is what the next metric adds.`,
    },
    {
      type: 'intuition',
      title: 'Silhouette: ask each point whether it is in the right cluster',
      md: `Silhouette changes the question. Instead of one number for the whole clustering, it scores **each point separately**, by asking that point two things.

- **a** = the average distance from this point to every *other* point in **its own** cluster. Read it as "how far am I from my own group". Small is good.
- **b** = the average distance from this point to every point in the **nearest other** cluster. If there are several other clusters, work out the average for each and keep the smallest. Read it as "how far away is the best alternative group". Big is good.
- **s = (b - a) / max(a, b)**. The gap between the two, divided by whichever of them is larger. That division forces the answer to land between -1 and +1.

What the three regions of that scale mean, in words:

- **s close to +1**: b is much bigger than a. The point is close to its own group and far from every other one. It is comfortably where it belongs.
- **s close to 0**: a and b are about equal. The point is the same distance from its own group as from the neighbouring group. It sits on the boundary and could honestly go either way.
- **s below 0**: a is bigger than b. The point is on average **closer to another cluster than to its own**, so it is in the wrong cluster. Inertia can never tell you this, because inertia only ever looks at the a side.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 3a: compute a for one point',
      code: `i = 3
own = [4, 5]

a = 0.0
for j in own:
    a = a + dist(pts[i], pts[j])
a = a / len(own)
print('a =', round(a, 4))

# ---- real output ----
# a = 1.0`,
      annotations: {
        1: 'The point being scored: position 3 in pts, which is the pair (8,1) in the bottom-right group.',
        2: 'The other members of its own cluster: positions 4 and 5, that is (9,1) and (8,2). Point 3 itself is deliberately left out, because a is the distance to the OTHERS.',
        4: 'A running total of distances, starting at zero.',
        5: 'Visit each clustermate in turn.',
        6: 'Add the distance from our point to that clustermate, using the dist function from step 2.',
        7: 'Divide by how many clustermates there were, giving the average. (8,1) is 1 step from (9,1) and 1 step from (8,2), so a = 1.0.',
        8: 'Print it. a = 1.0 means the point sits one unit, on average, from its own group.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 3b: compute b, then the score s',
      code: `other_groups = [[0, 1, 2], [6, 7, 8]]
b = None
for g in other_groups:
    total = 0.0
    for j in g:
        total = total + dist(pts[i], pts[j])
    mean_d = total / len(g)
    print('mean distance to', g, '=', round(mean_d, 4))
    if b is None or mean_d < b:
        b = mean_d
s = (b - a) / max(a, b)
print('b =', round(b, 4))
print('s =', round(s, 4))

# ---- real output ----
# mean distance to [0, 1, 2] = 6.6904
# mean distance to [6, 7, 8] = 7.3272
# b = 6.6904
# s = 0.8505`,
      annotations: {
        1: 'The two clusters our point does NOT belong to: the bottom-left group and the top-middle group.',
        2: 'b starts as None, which is Python\'s "no value yet" placeholder. We will replace it with the first average we compute, and then with anything smaller.',
        3: 'Take one rival cluster at a time.',
        4: 'A running total of distances to that rival cluster, reset for each cluster.',
        5: 'Visit every point in the rival cluster - all of them this time, since our point is not a member of it.',
        6: 'Add the distance from our point to that rival point.',
        7: 'Average it. This is how far our point sits, on average, from that whole rival cluster.',
        8: 'Print it, so you can see both candidates before the smaller one is chosen.',
        9: 'Keep this average if it is the first one, or if it beats the best so far. That is exactly what "nearest other cluster" means.',
        10: 'Store the new best. When the loop ends, b holds the smaller of the two averages: 6.6904.',
        11: 'The silhouette formula itself. max(a, b) returns whichever of the two is larger, here 6.6904, and dividing by it keeps s inside -1 to +1.',
        12: 'Print b, the distance to the nearest rival group.',
        13: 'Print s = (6.6904 - 1.0) / 6.6904 = 0.8505. Close to +1, so this point is firmly in the right cluster.',
      },
    },
    {
      type: 'note',
      md: `Two details that are easy to trip on. First, **a excludes the point itself** - its distance to itself is zero and would drag the average down for no reason. That also means a cluster holding only one point has no a at all, and the convention is to score such a point **s = 0**. Second, silhouette needs the distance from every point to every other point, which is about n squared distances for n points. On a million rows that is slow and memory-hungry, which is why people subsample, or use the cheaper metric two sections down.`,
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `xs = [0, 1, 2, 10, 11, 12]
lab = [0, 0, 0, 0, 1, 1]
for i in range(len(xs)):
    sums = {0: 0.0, 1: 0.0}
    counts = {0: 0, 1: 0}
    for j in range(len(xs)):
        if i != j:
            sums[lab[j]] = sums[lab[j]] + abs(xs[i] - xs[j])
            counts[lab[j]] = counts[lab[j]] + 1
    a = sums[lab[i]] / counts[lab[i]]
    b = sums[1 - lab[i]] / counts[1 - lab[i]]
    s = (b - a) / max(a, b)
    bar = ('#' if s > 0 else '<') * int(round(abs(s) * 20))
    print('x=%2d  cluster %d  a=%5.2f  b=%5.2f  s=%+.2f  %s' % (xs[i], lab[i], a, b, s, bar))`,
        precomputedOutput: `x= 0  cluster 0  a= 4.33  b=11.50  s=+0.62  ############
x= 1  cluster 0  a= 3.67  b=10.50  s=+0.65  #############
x= 2  cluster 0  a= 3.67  b= 9.50  s=+0.61  ############
x=10  cluster 0  a= 9.00  b= 1.50  s=-0.83  <<<<<<<<<<<<<<<<<
x=11  cluster 1  a= 1.00  b= 7.75  s=+0.87  #################
x=12  cluster 1  a= 1.00  b= 8.75  s=+0.89  ##################`,
        caption: 'One bar per point. A # bar means a positive score; a < bar means the point is closer to the other cluster than to its own. Only x = 10 is broken. Edit line 2 to move it into cluster 1 and run again - every bar turns positive.',
        annotations: {
          1: 'Six points on a number line. Using one dimension means every distance is just a subtraction, so you can check every printed number by hand.',
          2: 'Which cluster each point was put in, in the same order. The point at x = 10 has been put in cluster 0 alongside 0, 1 and 2 - the mistake this plot is about to expose.',
          3: 'Score one point at a time. range(len(xs)) gives i = 0, 1, 2, 3, 4, 5, the six positions in the list.',
          4: 'A dictionary holding one running distance total per cluster id. A dictionary is a lookup table, so sums[0] is cluster 0\'s total and sums[1] is cluster 1\'s.',
          5: 'The matching count of how many points went into each total, so the totals can be turned into averages.',
          6: 'Inner loop: compare our point i against every point j in the whole dataset.',
          7: 'Skip the point itself. Its distance to itself is zero and must not be averaged in.',
          8: 'Add the distance from point i to point j into the total for whichever cluster j belongs to. abs() gives the size of the difference, ignoring the sign.',
          9: 'Count that point, so this cluster\'s total can be divided correctly afterwards.',
          10: 'a is the average distance to our own cluster: take the total for lab[i] and divide by its count.',
          11: 'b is the average distance to the other cluster. With only two clusters, 1 - lab[i] flips 0 into 1 and 1 into 0, so it names the other cluster directly.',
          12: 'The silhouette score for this point: the gap between b and a, divided by the larger of the two.',
          13: 'Build the bar - a # for a positive score or a < for a negative one, repeated a number of times proportional to the size of s.',
          14: 'Print one line per point. %5.2f means "a decimal padded to 5 characters with 2 digits after the point"; %+.2f is the same but always shows the + or - sign.',
        },
      },
    },
    {
      type: 'note',
      md: `Read the bars, not the average. Five of the six points score above +0.6, so the average silhouette over all six is **+0.469** - a number most people would glance at and move on from. But one point, x = 10, scores **-0.83**, and that single line is the whole finding: x = 10 was put with 0, 1 and 2 and sits nine units from them on average, while 11 and 12 are one and two units away. The average hid it. The per-point list did not. That is why silhouette is worth reading point by point rather than reporting as a single summary number.`,
    },
    {
      type: 'intuition',
      title: 'Davies-Bouldin: a cheaper score built from centroids',
      md: `Silhouette needs every pairwise distance. **Davies-Bouldin** needs only the centroids, so it is far cheaper on large data, and it measures the same idea with different arithmetic.

- For each cluster compute its **spread**: the average distance from its points to its own centroid. (A plain average distance, not the squared sum inertia uses.)
- For each **pair** of clusters compute (spread of the first + spread of the second) divided by (distance between their two centroids). A big ratio means two fat clusters sitting close together, which is bad.
- For each cluster keep only its **worst** such ratio - its most confusable neighbour. Then average those worst cases over all the clusters. That average is the Davies-Bouldin index.
- **Lower is better**, and 0 would be perfect. This is the opposite direction to silhouette, and it is the thing people get backwards most often.

Work it on the six line points split correctly as {0,1,2} and {10,11,12}. Centroids are 1 and 11. Spread of the first: distances 1, 0, 1, average 0.667. The second is the same, 0.667. Distance between the centroids is 10, so DB = (0.667 + 0.667)/10 = **0.133**, which is very good. Now use the broken split {0,1,2,10} and {11,12}: centroids 3.25 and 11.5, spreads 3.375 and 0.5, centroid distance 8.25, so DB = 3.875/8.25 = **0.470** - much higher, correctly reporting a much worse clustering.`,
    },
    {
      type: 'intuition',
      title: 'ARI and NMI need true labels, so they are a different situation',
      md: `You will see two more scores quoted for clustering: **ARI** (adjusted Rand index) and **NMI** (normalized mutual information). They are useful, but they answer a different question, and it matters that you notice the switch.

- Inertia, silhouette and Davies-Bouldin use only the coordinates and your grouping. They work on any dataset, which is the entire point of them.
- ARI and NMI compare your grouping against a **known correct grouping**. They need a true label for every point.
- So they are back in the world you already know - the world with an answer key. They are for benchmark datasets, for a small sample somebody hand-labelled, or for checking a new algorithm against an old one.
- If you had true labels for your production data you would usually train a classifier on them rather than cluster at all. That is why these two are rarely the metric you report from a live system.
- What they add over accuracy is that they ignore the *names* of the clusters. Cluster numbers are arbitrary tags handed out by the algorithm, so a perfect grouping can score 0 accuracy purely because it called group 0 "group 2". ARI and NMI compare which points were grouped together, not what the groups were called.

How they are computed is in "Beyond the basics" at the end. For a first read the line that matters is: **if you do not have labels, these two are not available to you**, and the three metrics above are the whole toolkit.`,
    },
    {
      type: 'math',
      intro: 'The three label-free metrics in symbols. n is the number of points, K the number of clusters, mu_j the centroid of cluster j, and sigma_i the mean distance of cluster i to its own centroid.',
      latex: [
        '\\text{Inertia} \\;=\\; \\sum_{j=1}^{K} \\; \\sum_{x \\in C_j} \\lVert x - \\mu_j \\rVert^2 \\qquad \\text{falls as } K \\text{ rises; } K = n \\Rightarrow 0',
        's(i) \\;=\\; \\frac{b(i) - a(i)}{\\max\\{a(i),\\, b(i)\\}} \\;\\in\\; [-1, +1] \\qquad \\text{higher is better}',
        'DB \\;=\\; \\frac{1}{K} \\sum_{i=1}^{K} \\; \\max_{j \\neq i} \\; \\frac{\\sigma_i + \\sigma_j}{d(\\mu_i, \\mu_j)} \\qquad \\text{lower is better}',
      ],
    },
    {
      type: 'intuition',
      title: 'Worked case: one point\'s silhouette, computed fully by hand',
      md: `Six points on a line at **0, 1, 2, 10, 11, 12**. Someone proposes cluster A = {0, 1, 2, 10} and cluster B = {11, 12}. Score the point at **x = 10** completely, with no code.

1. **Find a.** The point is in cluster A, so a is its average distance to the other members of A: 0, 1 and 2.
2. Those distances are |10 - 0| = 10, |10 - 1| = 9, |10 - 2| = 8.
3. Average them: (10 + 9 + 8)/3 = 27/3 = **a = 9.0**.
4. **Find b.** The only other cluster is B = {11, 12}. Distances |10 - 11| = 1 and |10 - 12| = 2.
5. Average them: (1 + 2)/2 = 1.5. There is no other cluster to beat it, so **b = 1.5**.
6. **Find max(a, b)** = max(9.0, 1.5) = **9.0**.
7. **Apply the formula.** s = (b - a) / max(a, b) = (1.5 - 9.0)/9.0 = -7.5/9.0 = **-0.833**.

Now read the number. It is negative, so a > b, so this point is on average **closer to cluster B than to its own cluster A** - six times closer. The point at x = 10 does not belong in A. Move it into B and rescore everything: all six points then land between +0.83 and +0.90, and the average silhouette rises from **+0.469** to **+0.866**. The playground above prints the before picture; change line 2 to \`lab = [0, 0, 0, 1, 1, 1]\` and run it to see the after.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: choosing K by minimising inertia',
      md: `A team clusters the six line points 0, 1, 2, 10, 11, 12. They write a loop over K = 1 to 6, record the inertia at each K, and keep the K with the smallest value. That is a reasonable-looking script, and it is broken.

- The inertias they measure are **154, 4, 2.5, 1.0, 0.5, 0** for K = 1 through 6. Every one is lower than the last.
- Their script therefore returns **K = 6** with inertia **0.0** - a perfect score.
- K = 6 means six clusters holding one point each. The centroid of a one-point cluster *is* that point, so its distance to its own centroid is zero, so the total is zero. Perfect by construction, on any dataset.
- The team has produced a grouping with as many groups as data points. It groups nothing. And they report a flawless metric alongside it.
- The failure is not a bug in the loop and not a bad dataset. It is that inertia is defined so that it can only fall as K rises, so its minimum sits at K = n no matter what the data looks like.

Two repairs, both used in practice. Read the **shape** of the inertia curve rather than its minimum - the elbow is at K = 2, where the drop goes from 150 to 1.5. Or use a metric that does not have this property at all: silhouette scores **+0.866** at K = 2 here, and it would fall, not rise, if you split those tidy groups further, because splitting a real group leaves points whose a shoots up while their b stays small.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Do these on paper first. Every number is small on purpose.

1. Four points on a line at 0, 2, 9, 10, with cluster A = {0, 2} and cluster B = {9, 10}. Compute the centroid of each cluster and the total inertia.
2. Same clustering as problem 1. Compute the silhouette score of the point at **x = 2**, showing a, b, max(a, b) and s.
3. Someone reports "our clustering scored an average silhouette of -0.4". Without seeing the data, what do you know about it?
4. A colleague runs K from 2 to 10, plots inertia, sees it fall the whole way, and concludes "this data has no cluster structure, since no K stands out". What is wrong with the reasoning?
5. Same four points as problem 1, but now the clustering is A = {0, 2, 9} and B = {10}. Compute the silhouette of the point at x = 9. What does the sign tell you?`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `Check each step against your own working, not only the final number.

1. Centroid of A = (0 + 2)/2 = **1**. Centroid of B = (9 + 10)/2 = **9.5**. Inertia sums squared distances to the own centroid: 1 + 1 + 0.25 + 0.25 = **2.5**.
2. x = 2 is in A, so a is its average distance to A's other members - only x = 0 - giving a = |2 - 0| = **2**. The other cluster is B: distances |2 - 9| = 7 and |2 - 10| = 8, average 7.5, so **b = 7.5**. max(2, 7.5) = 7.5, so s = (7.5 - 2)/7.5 = 5.5/7.5 = **+0.733**. Comfortably positive, so the point is correctly placed.
3. A negative average means that, across the points on average, a is bigger than b - points are typically closer to some other cluster than to their own. That is not a mediocre clustering, it is a broken one: the boundaries have been drawn through the middle of the real structure instead of around it. You do not need to see the data to say it should be thrown away and rerun.
4. Inertia falling the whole way is what inertia does on *every* dataset, structured or not, because adding a cluster can never make the best achievable inertia worse, and K = n forces it to zero. So a falling curve is evidence of nothing at all. To claim there is no structure you need a metric that can express "no structure" - for example a silhouette that stays near 0 at every K, meaning points are equally far from their own cluster and from the next one.
5. x = 9 is in A with 0 and 2, so a = (|9 - 0| + |9 - 2|)/2 = (9 + 7)/2 = **8**. B = {10}, so b = |9 - 10| = **1**. max(8, 1) = 8, so s = (1 - 8)/8 = **-0.875**. The sign is negative, so x = 9 is much closer to cluster B than to its own cluster - it has been put in the wrong group. Note also that B holds a single point, so B's own score is undefined and set to 0 by convention.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. This section fills in the label-based metrics and a few practical points you will meet later.

- **The Rand index.** With true labels available, look at every *pair* of points and ask two yes/no questions: did the true grouping put them together, and did your clustering put them together? The Rand index is the fraction of pairs where the two answers match. Pairs are used rather than labels because renaming a cluster changes no pair, which is what makes the score immune to arbitrary cluster ids.
- **Why raw Rand is unusable, and what ARI fixes.** When there are several clusters most pairs are "apart" under both groupings, and Rand counts every one of those as a free agreement. Measured on 500 points with 4 true classes, a completely random 4-way labelling averages a Rand index of about **0.62**. The **adjusted** Rand index subtracts the score expected from random labelling and rescales so perfect agreement is 1; those same random labellings then average about **0.0001**. ARI runs from -1 to +1, and a negative value means you agree less than chance would.
- **NMI and AMI.** Mutual information asks: if I tell you a point's cluster id, how much of my uncertainty about its true label disappears? Normalized mutual information scales that into the range 0 to 1. Its catch is the same one raw Rand has - it drifts upward as K grows, so it quietly rewards splitting. **AMI** applies the same chance correction ARI does. When comparing clusterings with *different* K, use ARI or AMI, never plain NMI.
- **Accuracy on cluster ids is meaningless.** Nine points with true labels 0,0,0,1,1,1,2,2,2, grouped identically but tagged 2,2,2,0,0,0,1,1,1, score accuracy **0.000** and ARI **1.000**. To use accuracy at all you must first match cluster ids to labels optimally, which is a separate assignment problem on a contingency table, and you must not fit that matching on the same rows you score.
- **Calinski-Harabasz** is a fourth label-free metric: between-cluster spread divided by within-cluster spread, scaled by (n - K)/(K - 1). Higher is better. Like Davies-Bouldin it is centroid-based and cheap. It tends to favour more clusters where silhouette tends to favour fewer, so the two disagreeing is normal rather than a bug.
- **Shape assumptions.** All four label-free metrics assume clusters are roughly round and comparably sized. On long thin or nested shapes they will confidently prefer the wrong answer, and a stability check - does the same grouping reappear across seeds and resamples? - is worth more than any of them.
- **Anomaly detection has the same missing column.** You flag the top scoring points and a human reviews exactly those, so precision on them is computable. Recall is not, because it needs the number of true anomalies among everything you never flagged and nobody ever looked at. Track precision at the number of cases your review team can process per day.`,
    },
  ],
  quiz: [
    {
      question: 'Why can inertia never be used to choose K by simply taking the smallest value?',
      options: [
        { text: 'Inertia is too slow to compute for large K', explanation: 'It is cheap - one distance per point. Speed is not the problem.' },
        {
          text: 'Adding a cluster can never increase the best achievable inertia, so the minimum is always K = the number of points, where inertia is exactly 0',
          explanation: 'Correct. Each point becomes its own cluster, sits on its own centroid, and contributes zero. The minimum is guaranteed, and guaranteed useless.',
        },
        { text: 'Inertia can be negative, which breaks the comparison', explanation: 'It is a sum of squared distances, so it is never negative. The problem is where its minimum sits, not its sign.' },
      ],
      correct: 1,
    },
    {
      question: 'A point has a = 4.0 and b = 4.1. What does its silhouette score say?',
      options: [
        { text: 'The point is comfortably inside the right cluster', explanation: 'That would need b much larger than a. Here they are nearly equal, so s = (4.1 - 4.0)/4.1 = 0.024, barely above zero.' },
        { text: 'The point is in the wrong cluster', explanation: 'That needs a larger than b, which gives a negative score. Here b is slightly larger, so the score is slightly positive.' },
        {
          text: 'The point sits on a boundary - it is about as far from its own cluster as from the next one, so the assignment is close to arbitrary',
          explanation: 'Correct. s near 0 is the boundary case: a and b are almost equal, so nothing in the geometry prefers one cluster over the other.',
        },
      ],
      correct: 2,
    },
    {
      question: 'In the hand-worked case the point at x = 10 had a = 9.0 and b = 1.5, giving s = -0.833. What is the correct action?',
      options: [
        {
          text: 'Move it into the other cluster - a negative score means it is on average closer to that cluster than to its own',
          explanation: 'Correct. a larger than b is exactly the statement "my own group is further away than the neighbouring group". Moving it raised the average silhouette from 0.469 to 0.866.',
        },
        { text: 'Nothing - one weak point out of six is normal variation', explanation: 'A score of -0.83 is not variation, it is a definite misplacement: the point is six times closer to the other cluster.' },
        { text: 'Raise K so that the point gets a cluster of its own', explanation: 'A one-point cluster has no a at all and scores 0 by convention. It also hides the real fact, which is that this point belongs with 11 and 12.' },
      ],
      correct: 0,
    },
    {
      question: 'Two clusterings of the same data score Davies-Bouldin 0.13 and 0.47. Which is better?',
      options: [
        { text: '0.47, because a higher score means better separated', explanation: 'Backwards. DB is a ratio of cluster spread to centroid distance, so a big value means fat clusters sitting close together.' },
        {
          text: '0.13, because Davies-Bouldin is a ratio of spread to separation, so lower means tighter clusters that are further apart',
          explanation: 'Correct. This is the metric whose direction is opposite to silhouette, which is why it is worth stating the direction out loud each time you quote it.',
        },
        { text: 'Cannot say - Davies-Bouldin has no fixed direction', explanation: 'It has a fixed direction: lower is better, with 0 as the ideal.' },
      ],
      correct: 1,
    },
    {
      question: 'You have a production dataset of customer records with no labels of any kind. Which metrics can you actually compute?',
      options: [
        { text: 'ARI and NMI, since they are the standard clustering scores', explanation: 'Both compare your grouping against a known correct grouping. With no labels there is nothing to compare against, so neither can be computed.' },
        {
          text: 'Inertia, silhouette and Davies-Bouldin, because all three use only the coordinates and your own cluster assignments',
          explanation: 'Correct. Needing nothing but the data and the grouping is what makes them usable on real unlabelled problems.',
        },
        { text: 'Accuracy, once you map cluster ids to customer segments', explanation: 'Mapping ids to segments requires knowing the true segment of each customer, which is exactly the label you do not have.' },
      ],
      correct: 1,
    },
    {
      question: 'A perfect clustering of nine points scores accuracy 0.000 against the true labels. What happened?',
      options: [
        { text: 'The clustering is not actually perfect and the accuracy is right', explanation: 'It put exactly the same points together as the true labels do, which is what perfect means here. ARI on the same pair of groupings scores 1.000.' },
        {
          text: 'Cluster numbers are arbitrary tags, and accuracy compares tags rather than groupings, so relabelling a perfect grouping scores zero',
          explanation: 'Correct. Group 0 was called group 2, and so on. ARI and NMI compare which points sit together rather than what the groups are named, which is why they exist.',
        },
        { text: 'The dataset is too small for accuracy to be meaningful', explanation: 'Size is not the issue - the same thing happens with a million points. The issue is that cluster ids carry no meaning.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'How do you evaluate a clustering when there are no labels?',
      answer:
        'By measuring geometry instead of correctness, because there is no correct answer to compare against. Three metrics do this using only the data and the assignments. Inertia is the total squared distance from each point to its own cluster centroid - it measures tightness only, and it falls automatically as K rises, so it can diagnose a bad run but cannot choose K. Silhouette scores each point as (b - a)/max(a, b), where a is its mean distance to its own cluster and b its mean distance to the nearest other cluster, giving a number from -1 to +1 - so it captures tightness and separation together, and a negative value names a point that is in the wrong cluster. Davies-Bouldin averages, over clusters, the worst ratio of combined spread to centroid distance, and lower is better. I would compute all three and treat their agreement as the signal.',
      isCaseBased: false,
    },
    {
      question: 'Explain the silhouette score to someone who has never seen it.',
      answer:
        'Take one point and ask it two questions. First, how far is it on average from the other points in its own cluster - call that a. Second, for each other cluster, how far is it on average from that cluster, keeping the smallest of those - call that b, the nearest alternative. The score is (b - a) divided by whichever of a and b is larger, which forces the result between -1 and +1. Close to +1 means the alternative is much further away than home, so the point is well placed. Near 0 means a and b are about equal, so the point sits on a boundary and could go either way. Below 0 means a is larger than b: the point is closer to another cluster than to its own and is very likely misassigned. Concretely, six points at 0, 1, 2, 10, 11, 12 with 10 grouped wrongly alongside 0, 1 and 2 gives that point a = 9, b = 1.5, and s = -0.833.',
      isCaseBased: false,
    },
    {
      question: 'Why is minimising inertia not a valid way to pick K, and what do you do instead?',
      answer:
        'Because the best achievable inertia can never rise when you add a cluster - a new centroid either helps or sits unused - so the curve falls monotonically, and at K equal to the number of points every point sits on its own centroid and inertia is exactly zero. Minimising it therefore always returns one cluster per point, which is not a clustering. On six points at 0, 1, 2, 10, 11, 12 the inertias run 154, 4, 2.5, 1.0, 0.5, 0. Instead I read the shape of the curve: the drop from K = 1 to 2 is 150 and from 2 to 3 it is 1.5, so the elbow is at 2. But an elbow is read off a plot by a person, and on real data the curve is often a smooth arc with no bend, so I treat it as a shortlist and let silhouette or Davies-Bouldin, which do have interior optima, make the call.',
      isCaseBased: false,
    },
    {
      question: 'What is the difference between label-free (internal) and label-based (external) clustering metrics?',
      answer:
        'Label-free metrics use only the data points and your cluster assignments: inertia, silhouette, Davies-Bouldin, Calinski-Harabasz. They need no labels, so they work on real unlabelled problems and they are what you use to choose K. Their weakness is that they encode an assumption about cluster shape - roughly round, comparably sized - and will confidently prefer a clustering that matches that assumption over one that matches reality. Label-based metrics compare your grouping against a known correct grouping: ARI, AMI, NMI. They require a true label for every point, so they are legitimate on benchmarks, on a hand-labelled validation sample, or when comparing algorithms in a controlled study. They are not production metrics, because in production the labels do not exist - and if they did, the right move is usually a classifier rather than a clustering.',
      isCaseBased: false,
    },
    {
      question: 'Why can you not just compute accuracy between cluster ids and true labels?',
      answer:
        'Because cluster ids are arbitrary. The algorithm hands out those numbers in whatever order its centroids happened to be initialised, so they carry no meaning. A clustering can group exactly the right points together and still score zero accuracy purely because it called group 0 "group 2". Nine points with true labels 0,0,0,1,1,1,2,2,2 grouped identically but tagged 2,2,2,0,0,0,1,1,1 give accuracy 0.000 and ARI 1.000. To use accuracy you would first have to match cluster ids to labels optimally, which is a separate assignment problem solved on a contingency table, and you would then have to be careful not to fit that matching on the same rows you score. ARI and NMI compare which points sit together rather than what the groups are called, so they need none of that.',
      isCaseBased: false,
    },
    {
      question: 'Case: a data scientist reports "our customer segmentation is 89% accurate" against a hand-labelled sample of 500 customers. What do you ask?',
      answer:
        'First: how were cluster ids mapped to segment labels? Accuracy on raw cluster ids is meaningless - a perfect clustering with permuted ids scores 0.0 while ARI scores 1.0. And if they did match ids by picking the best assignment, they must say whether that matching was fitted on the same 500 rows they then scored, because optimising the mapping on the evaluation set inflates the number. The defensible version is an optimal matching on a contingency table, fixed on a held-out split. Second: report ARI or AMI instead, since both ignore cluster naming by construction and both are corrected for chance, so a random grouping scores about zero rather than the 0.62 the raw Rand index would give. Third, the strategic point - if you have labels good enough to grade against, why is this unsupervised at all? Usually the honest answer is that 500 labels are a small validation sample and full labelling does not scale - fine, but then quote an uncertainty range, because 500 rows spread over six segments is thin. The cost of getting this wrong is a segmentation that drives marketing spend being justified by a metric that does not measure what it claims.',
      isCaseBased: true,
    },
    {
      question: 'Case: you cluster users for a marketing campaign. Silhouette peaks at K = 3, Calinski-Harabasz peaks at K = 4, and the elbow is ambiguous. What do you ship?',
      answer:
        'Do not break the tie with another metric - the disagreement is itself the finding, and it means the geometric structure is genuinely ambiguous. This happens systematically when clusters have unequal spread: silhouette penalises wide clusters and prefers merging two fat overlapping ones, so it tends to under-count, while Calinski-Harabasz tends to favour more clusters. So: first, check stability - recluster on bootstrap resamples and different random seeds and see whether the fourth cluster reappears or dissolves, because an unstable cluster is not real. Second, look at the per-point silhouette scores inside each cluster at both values of K, because if the extra cluster at K = 4 is small with low or negative scores it is a split of a real group, not a new segment. Third, take both candidates to the marketing team and ask which they can name and target differently. The decisive argument is operational: if segments 3 and 4 would receive the same campaign, K = 4 costs work and buys nothing, so ship K = 3. If they would be targeted differently and the split is stable, K = 4 pays for itself. The metric shortlists; the intervention decides.',
      isCaseBased: true,
    },
    {
      question: 'Case: your anomaly detector reports 92% precision in production. Your manager asks what fraction of the fraud you are catching. What do you say?',
      answer:
        'That the number they want - recall - is not measurable with the current setup, and then explain why rather than estimating it. Precision on the flagged points is observable because analysts review exactly those and return verdicts. Recall needs the total number of true anomalies, which includes every fraud that scored below the cutoff and that nobody ever looked at, so that quantity is structurally unobservable. Then offer the ways to buy an estimate, with their costs. One, a random-sample audit of unflagged transactions to estimate the missed rate - expensive and statistically painful at low prevalence, since finding a one-in-a-thousand event needs a large sample. Two, delayed ground truth: chargebacks and disputes surface some misses weeks later, giving a lagged, partial recall, which is the usual practical answer in payments. Three, inject known synthetic cases and measure how many get flagged, which gives a detection rate on that specific distribution only. Four, track proxies now - score distributions, flag volume and precision over time will show decay even without recall. The framing is the point: 92% precision says review time is not being wasted, and says nothing about exposure. Those are two different risks.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Why clustering needs its own metrics', back: 'There is no label column, so there is no true answer to compare a prediction against. Accuracy here is not bad, it is impossible to compute. The metrics must judge geometry instead.' },
    { front: 'Cluster and centroid', back: 'Cluster = one of the groups you formed. Centroid = its average position, computed separately for each coordinate. For (1,1), (2,1), (1,2) the centroid is (1.333, 1.333).' },
    { front: 'Inertia', back: 'The total squared distance from every point to its own cluster centroid. It measures tightness only, never separation. Small means tight groups.' },
    { front: 'Why inertia cannot choose K', back: 'Adding a cluster can never raise the best achievable inertia, so the curve only falls, and at K = the number of points every point sits on its own centroid and inertia is exactly 0. The minimum is always the useless answer.' },
    { front: 'Elbow method', back: 'Plot inertia against K and pick where the steep drop stops. On 0,1,2,10,11,12 the inertias are 154, 4, 2.5, 1.0, 0.5, 0, so the elbow is K = 2. It is a person reading a plot, not a formula - use it as a shortlist.' },
    { front: 'Silhouette: a, b and s', back: 'a = mean distance to my own cluster. b = mean distance to the nearest other cluster. s = (b - a)/max(a, b), always between -1 and +1.' },
    { front: 'Reading a silhouette score', back: 'Near +1: close to home, far from every other cluster. Near 0: on the boundary, a and b nearly equal, the assignment is arbitrary. Below 0: closer to another cluster than to my own, so wrongly assigned.' },
    { front: 'Davies-Bouldin, and its direction', back: 'For each cluster take the worst ratio of (its spread + a neighbour spread) to (distance between their centroids), then average over clusters. LOWER is better, the opposite of silhouette. Centroid-based, so much cheaper.' },
  ],
  mindmapMarkdown: `- Judging a clustering with no answer key
  - The setup
    - nine points, three visible groups, no label column
    - accuracy cannot be computed, not merely a bad choice
    - cluster = a group; centroid = its average position
  - Inertia
    - sum of squared distances to own centroid
    - measures tightness only, never separation
    - always falls as K rises; K = n gives exactly 0
    - so its minimum is always one cluster per point
    - elbow method reads the bend, and is a judgement call
  - Silhouette
    - a = mean distance to my own cluster
    - b = mean distance to the nearest other cluster
    - s = (b - a) / max(a, b), from -1 to +1
    - +1 snug, 0 on the boundary, below 0 wrongly assigned
    - worked point: a = 9.0, b = 1.5, s = -0.833
    - read per point, not as one average
  - Davies-Bouldin
    - spread of two clusters over distance between centroids
    - keep each cluster worst neighbour, then average
    - LOWER is better; centroid-based so it is cheap
  - Needs true labels, a different situation
    - ARI and NMI compare against a known grouping
    - they ignore cluster names, unlike accuracy
    - unavailable in production, where labels do not exist
  - The classic mistake
    - loop over K, keep the smallest inertia
    - returns K = n with inertia 0, every time`,
}

export default m
