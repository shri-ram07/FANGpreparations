import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l3-unsupervised-metrics',
  subjectId: 'metrics',
  level: 3,
  title: 'Judging a Clustering With No Labels',
  whyItMatters:
    'Clustering hands you a pile of points and no correct answer, so accuracy, F1 and every metric you have met cannot even be computed. These three can — and one of them, used naively, always returns the most useless possible clustering.',
  assumes: [
    'You know how to measure the distance between two points on a graph',
    'You have seen a Python list and a for loop',
  ],
  estMinutes: 20,
  sections: [
    {
      type: 'intuition',
      title: 'No label column, so nothing to compare against',
      md: `Every metric so far compared a prediction to a truth. Clustering has no truth column — you hand it points and it hands back groups.

So the metrics change what they measure. Instead of "is this right?", they ask **is this clustering internally sensible?** — are points close to their own group and far from the others.

Two words first. A **cluster** is one group. Its **centroid** is the average position of its members: average the x's, average the y's. The centroid is not a data point; it is the group's centre of mass.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Nine points, three visible groups, centroid of each',
      code: `pts = [(1,1),(1,2),(2,1), (8,8),(9,8),(8,9), (1,8),(2,8),(1,9)]
lab = [0,0,0, 1,1,1, 2,2,2]

for k in range(3):
    grp = [p for p, l in zip(pts, lab) if l == k]
    cx = sum(p[0] for p in grp) / len(grp)
    cy = sum(p[1] for p in grp) / len(grp)
    spread = sum((p[0]-cx)**2 + (p[1]-cy)**2 for p in grp)
    print('cluster %d  centroid=(%.3f, %.3f)  spread=%.4f' % (k, cx, cy, spread))

# ---- real output ----
# cluster 0  centroid=(1.333, 1.333)  spread=1.3333
# cluster 1  centroid=(8.333, 8.333)  spread=1.3333
# cluster 2  centroid=(1.333, 8.333)  spread=1.3333`,
      annotations: {
        8: 'Squared distance from each point to its own centroid, summed. Added over all clusters this is **inertia** — the standard measure of how tight a clustering is.',
        13: 'All three spreads are identical at 1.3333 because the three groups are the same shape translated. Total inertia is 4.0000.',
      },
    },
    {
      type: 'intuition',
      title: 'Why minimising inertia is not a valid goal',
      md: `Inertia is the number K-means itself descends, so the obvious move is to pick the K that makes it smallest.

That is guaranteed to fail, and not slightly. Inertia falls every time you add a cluster, because a new centroid can only shorten the distances assigned to it. It has one minimum, and it is always the same clustering.

The next snippet finds it.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Inertia against K, and where it bottoms out',
      code: `import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score, davies_bouldin_score

X = np.array(pts, dtype=float)
print(' K   inertia   silhouette   davies-bouldin')
for K in range(2, 7):
    km = KMeans(n_clusters=K, n_init=10, random_state=0).fit(X)
    print('%2d %9.4f %11.4f %14.4f' % (
        K, km.inertia_,
        silhouette_score(X, km.labels_),
        davies_bouldin_score(X, km.labels_)))
print('K=9 inertia =', KMeans(n_clusters=9, n_init=10, random_state=0).fit(X).inertia_)

# ---- real output ----
#  K   inertia   silhouette   davies-bouldin
#  2   77.5000      0.5762         0.5349
#  3    4.0000      0.8357         0.1869
#  4    3.1667      0.5870         0.3170
#  5    2.3333      0.3401         0.3924
#  6    1.5000      0.0976         0.4472
# K=9 inertia = 0.0`,
      annotations: {
        14: 'Nine points, nine clusters, inertia exactly 0.0 — every point is its own centroid. That is the global minimum of inertia and it is a clustering that tells you nothing.',
        18: 'Inertia keeps falling past K=3 (4.0 → 3.17 → 2.33 → 1.5) with no signal that it has gone too far. Silhouette peaks at 0.8357 for K=3 and then collapses, and Davies-Bouldin is at its minimum 0.1869 there.',
        19: 'The big inertia drop is 77.5 → 4.0, then it flattens. That corner is the **elbow method** — a judgement call read off a chart, not a number you can optimise.',
      },
    },
    {
      type: 'visual',
      component: 'Plot',
      props: {
        title: 'Inertia, silhouette and Davies-Bouldin against K',
        notice:
          'Inertia (scaled here to fit the same axis) falls monotonically and reaches 0 at K = 9, so its minimum is useless — the only signal it carries is the sharp corner at K = 3. Silhouette instead has a genuine maximum at 0.8357, and Davies-Bouldin a genuine minimum at 0.1869, both at K = 3. That is the difference between a quantity you optimise and a quantity you read a corner off.',
        kind: 'line',
        xLabel: 'number of clusters K',
        yLabel: 'score',
        series: [
          { name: 'inertia / 100', points: [[2, 0.775], [3, 0.04], [4, 0.0317], [5, 0.0233], [6, 0.015]] },
          { name: 'silhouette', points: [[2, 0.5762], [3, 0.8357], [4, 0.587], [5, 0.3401], [6, 0.0976]] },
          { name: 'Davies-Bouldin', points: [[2, 0.5349], [3, 0.1869], [4, 0.317], [5, 0.3924], [6, 0.4472]] },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Silhouette asks each point whether it is in the right group',
      md: `Inertia only ever looks inside a cluster. **Silhouette** looks at both sides at once, one point at a time.

For a point, compute **a** — its average distance to the other members of its own cluster — and **b** — its average distance to the members of the nearest other cluster. The score is how much better b is than a, normalised.

It lands in −1 to +1: near **+1** the point is far from every other group, near **0** it sits on a boundary, and **negative** means the nearest other cluster is closer than its own — the point is in the wrong group.`,
    },
    {
      type: 'math',
      intro:
        'The silhouette of one point. The max in the denominator is what bounds the result to [−1, 1] whichever of a and b is larger. The reported silhouette score is this averaged over every point.',
      latex: ['s = \\frac{b - a}{\\max(a,\\, b)}'],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'One point\'s silhouette, computed fully',
      code: `import math

def dist(p, q):
    return math.hypot(p[0]-q[0], p[1]-q[1])

def mean_to(p, k):
    grp = [q for q, l in zip(pts, lab) if l == k and q != p]
    return sum(dist(p, q) for q in grp) / len(grp)

p = (1, 1)
a = mean_to(p, 0)
others = [mean_to(p, k) for k in (1, 2)]
b = min(others)
print('a (own cluster)   =', round(a, 4))
print('to other clusters =', [round(v, 4) for v in others])
print('s =', round((b - a) / max(a, b), 4))

# ---- real output ----
# a (own cluster)   = 1.0
# to other clusters = [10.3866, 7.357]
# s = 0.8641`,
      annotations: {
        7: 'q != p excludes the point from its own average. A distance of 0 to itself would drag every silhouette upward for free.',
        13: 'b is the min, not the mean. Averaging over both other clusters would let a distant third cluster flatter a point that sits right beside its neighbour.',
        21: '(7.357 − 1.0) / 7.357 = 0.8641. Read it as: this point is about 86% of the way to being unambiguously in its own cluster.',
      },
    },
    {
      type: 'note',
      label: 'Reading a silhouette score, and where it lies to you',
      md: `Rough bands: above **0.7** is strong structure, **0.5–0.7** reasonable, **0.25–0.5** weak, below **0.25** essentially none. The 0.8357 above is high because the toy data is three well-separated blobs; real data rarely clears 0.5.

The trap: silhouette is built from distances to a centre, so it **assumes clusters are roughly round and similar in size**. Give it two interleaved crescents and it will score the correct clustering badly while praising a wrong one that happens to be spherical. For density-based clustering (DBSCAN and friends) it is the wrong instrument.

It is also **O(n²)** — every point against every other. On a million points, sample.`,
    },
    {
      type: 'note',
      label: 'Davies-Bouldin, and the metrics that need labels after all',
      md: `**Davies-Bouldin** measures the same idea more cheaply: for each cluster, the worst ratio of (its spread + a neighbour's spread) to the distance between their centroids, averaged. **Lower is better** — the reverse of silhouette — and it minimised at 0.1869 for K = 3, agreeing with silhouette. It uses centroids only, so it is O(n·K) rather than O(n²), and it inherits the same round-cluster assumption.

**ARI and NMI are a different situation.** They compare a clustering to true labels — so they are not available in the case this module is about. Reach for them only when you have labels and are testing whether an algorithm recovers them, which is a benchmark question, not a deployment one.`,
    },
  ],
  quiz: [
    {
      question: 'Why can you not choose K by minimising inertia?',
      options: [
        { text: 'Inertia is expensive to compute', explanation: 'It is cheap — K-means computes it anyway.' },
        { text: 'It falls every time K increases and hits exactly 0 when every point is its own cluster', explanation: 'Correct — 9 points, 9 clusters, inertia 0.0. The global minimum is the least informative clustering possible.' },
        { text: 'Inertia can be negative', explanation: 'It is a sum of squared distances, so never negative.' },
        { text: 'It only works for K = 2', explanation: 'It is defined for any K.' },
      ],
      correct: 1,
    },
    {
      question: 'In the silhouette calculation, why is b the distance to the NEAREST other cluster rather than the average over all of them?',
      options: [
        { text: 'It is faster', explanation: 'Both require computing all the distances first.' },
        { text: 'Averaging would let a distant third cluster flatter a point sitting right beside its neighbour', explanation: 'Correct. The nearest cluster is the one that threatens the assignment, so it is the one that matters.' },
        { text: 'The nearest cluster is always the true cluster', explanation: 'If it were, the point would be misassigned — which is what a negative silhouette reports.' },
        { text: 'Averaging can produce values outside [−1, 1]', explanation: 'The max in the denominator bounds the result either way.' },
      ],
      correct: 1,
    },
    {
      question: 'A point gets silhouette −0.3. What does that mean?',
      options: [
        { text: 'The clustering failed to converge', explanation: 'Silhouette says nothing about convergence.' },
        { text: 'Its nearest other cluster is closer on average than its own — the point is in the wrong group', explanation: 'Correct. A negative score means b < a.' },
        { text: 'The point is an outlier far from everything', explanation: 'That would give a score near 0 or positive, not negative.' },
        { text: 'K is too small', explanation: 'Possibly, but the score reports a specific misassignment, not a K.' },
      ],
      correct: 1,
    },
    {
      question: 'Silhouette scored 0.8357 on the toy data. Why should you not expect that on real data?',
      options: [
        { text: 'Real data has more dimensions, and silhouette is undefined above 2D', explanation: 'It is defined in any number of dimensions.' },
        { text: 'The toy data is three well-separated round blobs; real clusters overlap and are rarely round, so above 0.5 is already good', explanation: 'Correct — the bands are roughly 0.7+ strong, 0.5–0.7 reasonable, below 0.25 essentially none.' },
        { text: 'sklearn normalises differently on large datasets', explanation: 'The formula is unchanged.' },
        { text: 'Real data always has negative silhouettes', explanation: 'Some points do; the average is usually positive but modest.' },
      ],
      correct: 1,
    },
    {
      question: 'You cluster two interleaved crescent shapes with DBSCAN and silhouette scores the result badly. What went wrong?',
      options: [
        { text: 'DBSCAN produced the wrong clustering', explanation: 'DBSCAN handles crescents well — this is exactly its case.' },
        { text: 'Silhouette is built from distances to a centre, so it assumes roughly round clusters and penalises correct non-convex ones', explanation: 'Correct. It is the wrong instrument for density-based clustering.' },
        { text: 'Silhouette requires K to be specified', explanation: 'It reads the labels, whatever produced them.' },
        { text: 'Noise points break the formula', explanation: 'They affect the average but do not break it; the shape assumption is the real problem.' },
      ],
      correct: 1,
    },
    {
      question: 'Davies-Bouldin came out at 0.1869 for K = 3 and 0.4472 for K = 6. Which is better and why?',
      options: [
        { text: 'K = 6, because higher is better', explanation: 'Davies-Bouldin runs the opposite way to silhouette.' },
        { text: 'K = 3, because Davies-Bouldin is a ratio of spread to separation and lower is better', explanation: 'Correct, and it agrees with silhouette, which peaked at K = 3.' },
        { text: 'Neither — the values are not comparable across K', explanation: 'They are comparable; that is the point of computing them across K.' },
        { text: 'K = 6, because more clusters always separate better', explanation: 'That is the inertia fallacy; Davies-Bouldin explicitly penalises it.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'How do you evaluate a clustering with no ground truth?',
      answer:
        'With internal metrics, which measure whether the clustering is self-consistent rather than correct. Silhouette per point — average distance to its own cluster versus to the nearest other, giving a score in −1 to 1. Davies-Bouldin, a spread-to-separation ratio where lower is better and which is much cheaper because it only uses centroids. Inertia is the one people reach for and the one that cannot be optimised, since it falls monotonically with K. In practice I would also say the honest answer: an internal metric can only tell you the clustering is geometrically tidy, not that the groups mean anything, so it gets checked against whatever the clusters are for.',
      isCaseBased: false,
    },
    {
      question: 'Why does minimising inertia not choose K, and what do you do instead?',
      answer:
        'Because adding a cluster can only shorten the distances assigned to it, so inertia falls every single time K rises — on nine points it reaches exactly 0.0 at K = 9, where every point is its own centroid. The global minimum is the least informative clustering possible. What inertia does carry is the shape of the fall: 77.5 at K = 2 down to 4.0 at K = 3 and then nearly flat, and that corner is the elbow. But an elbow is read off a chart, not optimised, so I would cross-check with silhouette, which has a real maximum — 0.8357 at K = 3 here — and Davies-Bouldin, which has a real minimum in the same place.',
      isCaseBased: true,
    },
    {
      question: 'Walk me through computing a silhouette score by hand.',
      answer:
        'For one point: a is its average distance to the other members of its own cluster, excluding itself, and b is its average distance to the members of the nearest other cluster. The score is (b − a) / max(a, b). On the toy data, point (1,1) is distance 1 from both of its clustermates so a = 1.0; the two other clusters average 10.3866 and 7.357 away, so b = 7.357; the score is 6.357 / 7.357 = 0.8641. The reported silhouette is that averaged over every point. Two details matter: excluding the point itself, since a zero distance would inflate every score, and taking the nearest other cluster rather than the mean over all of them, since the nearest one is the only one threatening the assignment.',
      isCaseBased: true,
    },
    {
      question: 'When is silhouette the wrong metric?',
      answer:
        'Whenever the clusters are not roughly convex and similar in size. Silhouette is built entirely from distances, so it implicitly rewards spherical, comparably sized groups — give it two interleaved crescents and it will score the correct clustering badly while praising a spherical but wrong one. That makes it a poor referee for DBSCAN or any density-based method, where the whole point is arbitrary shapes. It is also O(n²), so on large data it has to be sampled. In those cases I would use density-based validity indices, or evaluate the clusters against a downstream task instead.',
      isCaseBased: false,
    },
    {
      question: 'What is the difference between silhouette and ARI?',
      answer:
        'They answer different questions. Silhouette is internal — it needs no labels and asks whether the clustering is geometrically coherent. ARI is external: it compares a clustering to true labels, correcting for the agreement you would get by chance. So ARI is only available in a benchmark setting where you happen to have labels and are testing whether an algorithm recovers them. In the deployment case this module is about, you do not have labels, which is why you are clustering in the first place, so ARI simply cannot be computed.',
      isCaseBased: false,
    },
    {
      question: 'Silhouette says K = 5 but the business wants three segments. What do you do?',
      answer:
        'Take the business constraint seriously — silhouette measures geometry, not usefulness, and a segmentation nobody can act on has zero value however tidy it is. Concretely I would look at what K = 5 is separating: if two of the five are genuinely distinct behaviours, that is an argument to make to the business with evidence. If the extra clusters are splitting one group on a dimension nobody cares about, three is right and the silhouette drop is the price of an actionable answer. I would also report both: the K = 3 clustering as the deliverable, and the K = 5 structure as a note on what is hiding inside it.',
      isCaseBased: true,
    },
    {
      question: 'Your silhouette score is 0.15. Is the clustering worthless?',
      answer:
        'It is weak by the usual bands, but 0.15 is a diagnosis rather than a verdict. First I would check whether the data has cluster structure at all — plenty of real data is one continuous cloud, and no algorithm can find groups that are not there. Then whether the shape assumption is the problem, since non-convex clusters score badly even when correct. Then scaling, because an unscaled feature in the hundreds dominates every distance and destroys the geometry silhouette measures. If the structure is genuinely absent, the honest deliverable is saying so, not tuning K until a number looks better.',
      isCaseBased: true,
    },
    {
      question: 'Why is Davies-Bouldin cheaper than silhouette, and does that matter?',
      answer:
        'Silhouette needs every pairwise distance, which is O(n²) — at a million points that is a trillion distances. Davies-Bouldin only compares cluster centroids and within-cluster spreads, so it is O(n·K). On large data that is the difference between a metric you can run and one you have to sample. It does matter, but with a caveat: they encode nearly the same geometric assumption, so a cheap agreement between them is not independent confirmation. On the toy data both picked K = 3, which is reassuring about consistency, not about correctness.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Why clustering needs different metrics', back: 'There is no truth column. Internal metrics ask "is this clustering self-consistent?" not "is it right?"' },
    { front: 'Centroid', back: 'The average position of a cluster\'s members — average the x\'s, average the y\'s. Not a data point.' },
    { front: 'Inertia', back: 'Sum of squared distances from each point to its own centroid. On the toy data: 4.0000 at K=3.' },
    { front: 'Why inertia cannot choose K', back: 'It falls every time K rises and hits exactly 0.0 at K = n (9 points, 9 clusters). Its global minimum is the useless clustering.' },
    { front: 'The elbow', back: 'Inertia 77.5 → 4.0 → 3.17 → 2.33 → 1.5. The corner at K=3 is a judgement call read off a chart, not something you optimise.' },
    { front: 'Silhouette', back: '(b − a) / max(a, b). a = mean distance to own cluster, b = mean distance to the NEAREST other. Point (1,1): (7.357 − 1.0)/7.357 = 0.8641.' },
    { front: 'Silhouette bands and its trap', back: '0.7+ strong, 0.5–0.7 reasonable, under 0.25 none. Assumes round clusters, so it is the wrong referee for DBSCAN. O(n²).' },
    { front: 'Davies-Bouldin vs ARI/NMI', back: 'DB: spread-to-separation ratio, LOWER is better, 0.1869 at K=3, O(n·K). ARI/NMI need true labels, so they answer a benchmark question, not this one.' },
  ],
  mindmapMarkdown: `- Judging a clustering with no labels
  - The situation
    - no truth column
    - ask "self-consistent?" not "correct?"
    - centroid = average position of members
  - Inertia
    - sum of squared distances to own centroid
    - toy data: 4.0000 at K=3
    - falls with every K, hits 0.0 at K=9
    - CANNOT be minimised to choose K
    - only the elbow (77.5 -> 4.0 -> flat) is signal
  - Silhouette
    - (b - a) / max(a, b), range -1..1
    - a = own cluster, b = NEAREST other
    - point (1,1): a=1.0, b=7.357 -> 0.8641
    - peak 0.8357 at K=3
    - bands: 0.7+ strong, under 0.25 none
    - assumes ROUND clusters; wrong for DBSCAN
    - O(n^2)
  - Davies-Bouldin
    - spread / separation, LOWER better
    - 0.1869 at K=3, agrees with silhouette
    - O(n*K), centroids only
  - ARI / NMI
    - need TRUE labels
    - benchmark question, not this one`,
}

export default m
