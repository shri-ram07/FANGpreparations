import type { Module } from '../types'

const m: Module = {
  id: 'ml-l3-dbscan-and-friends',
  subjectId: 'ml',
  level: 3,
  title: 'DBSCAN, Hierarchical Clustering and GMM',
  whyItMatters:
    'K-Means fails on a whole category of data by design. These three take different definitions of what a cluster is — a crowd, a family tree, a mixture of distributions — and each one solves a problem K-Means cannot.',
  assumes: [
    'You have read K-Means Clustering — these are defined by contrast with it',
    'You know what a distance between two points is',
  ],
  estMinutes: 22,
  sections: [
    {
      type: 'intuition',
      title: 'What DBSCAN is',
      md: `**DBSCAN** — density-based spatial clustering — abandons centres entirely. A cluster is a region where points are packed close together, whatever shape that region happens to be.

Two settings, and no K:

- **eps** — how far apart two points can be and still count as neighbours.
- **min_pts** — how many neighbours a point needs to be a **core point**, i.e. genuinely inside a crowd.

Clusters grow by chaining core points to their neighbours. Anything left over is labelled **noise** rather than forced into a group — which no method so far could do.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Neighbourhoods and core points',
      code: `bars = []
for x in range(8):
    bars.append((x, 0))
    bars.append((x, 2))

def sq_dist(p, q):
    return (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2

eps = 1.5
min_pts = 3

def neighbours(points, i):
    return [j for j in range(len(points)) if sq_dist(points[i], points[j]) <= eps * eps]

core = [len(neighbours(bars, i)) >= min_pts for i in range(len(bars))]
print('(3,0) is index 6, neighbours', neighbours(bars, 6), 'core?', core[6])
print('(0,0) is index 0, neighbours', neighbours(bars, 0), 'core?', core[0])

# ---- real output ----
# (3,0) is index 6, neighbours [4, 6, 8] core? True
# (0,0) is index 0, neighbours [0, 2] core? False`,
      annotations: {
        9: 'eps = 1.5, so the two rows sitting 2 apart vertically are NOT neighbours, while points 1 apart along a row are. That single choice is what will separate the rows.',
        14: 'Compare squared distance to eps squared, so no square root is needed. A point is always its own neighbour, which is why the counts include i itself.',
        18: 'Index 6 is (3,0), mid-row: it has 3 neighbours — itself and the points either side — so it is core.',
        19: 'Index 0 is (0,0), the end of a row: only 2 neighbours, so it is NOT core. It will still join a cluster, as a border point reached from a core point.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Growing clusters by chaining core points',
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
        1: '-1 is the noise label. Every point starts as noise and only escapes by being reached.',
        4: 'Only a CORE point may start a new cluster. A border point cannot found one, which is what stops thin trails of stragglers becoming clusters of their own.',
        11: 'Reached points join the cluster, but only core ones go back on the queue. That is the chaining rule, and it is why a cluster can be any shape — it grows along wherever the density goes.',
        16: 'Alternating labels, which given how bars was built is exactly the by-row grouping. DBSCAN found the answer K-Means scored as worse, and it was never told there were two clusters.',
      },
    },
    {
      type: 'note',
      label: 'The comparison worth remembering',
      md: `Same sixteen points, two methods, two answers.

**K-Means** split them left and right and scored that split (inertia 36.0) as better than the truth (84.0). It was not unlucky — its objective genuinely prefers the wrong grouping.

**DBSCAN**, given no K at all, recovered the rows. It can do this because it never assumes a shape; it only asks where the points are dense.

The price is two new settings, and eps is genuinely hard to pick.`,
    },
    {
      type: 'intuition',
      title: 'Hierarchical clustering: choose K afterwards',
      md: `A third idea, which sidesteps K rather than solving it. **Agglomerative** clustering starts with every point as its own cluster and repeatedly merges the two closest, until everything is one cluster.

What you get is not a grouping but a **dendrogram** — a tree of every merge that happened, and at what distance. Cut it high for few clusters, low for many, and you can decide *after* seeing the structure.

The one real choice is the **linkage**: how to measure the distance between two *clusters* rather than two points.`,
    },
    {
      type: 'note',
      label: 'The four linkages, and what each does',
      md: `- **Single** — distance between the two *closest* members. Follows chains, so it finds elongated shapes, and for the same reason a single bridging point can merge two real clusters.
- **Complete** — distance between the two *furthest* members. Produces compact, roughly equal clusters, and breaks up elongated ones.
- **Average** — the mean over all cross-pairs. The usual compromise.
- **Ward** — merges the pair that increases total within-cluster variance least. Behaves most like K-Means, and is the common default.

Cost is the catch: O(n²) memory at least, so it does not scale to large n.`,
    },
    {
      type: 'intuition',
      title: 'GMM: letting a point be 70% one group',
      md: `Everything so far forces each point into exactly one group. A customer sitting halfway between two segments is assigned to one and the ambiguity is thrown away.

A **Gaussian mixture model** assumes the data was produced by K overlapping Gaussian distributions and works out, for each point, the **probability** it came from each. That is **soft assignment**.

It is fitted by **expectation–maximisation**, which is K-Means' two steps with the hard choice replaced by a probability — E computes the responsibilities, M refits each Gaussian weighted by them.`,
    },
    {
      type: 'math',
      intro:
        'The model: a weighted sum of K Gaussians, with weights π summing to 1. Because each component has its own covariance Σ, a GMM can fit elongated and tilted clusters — which is precisely the shape K-Means cannot. K-Means is the special case where every Σ is the same multiple of the identity and the assignment is hardened.',
      latex: [
        'p(x) \\;=\\; \\sum_{k=1}^{K} \\pi_k \\, \\mathcal{N}(x \\mid \\mu_k, \\Sigma_k), \\qquad \\sum_{k=1}^{K} \\pi_k = 1',
      ],
    },
    {
      type: 'note',
      label: 'Which one do I reach for?',
      md: `Read down and stop at the first line that matches:

- **Many rows, roughly round groups, K known** → K-Means. By far the fastest.
- **Odd shapes, unknown K, or outliers you want labelled rather than absorbed** → DBSCAN.
- **You want to see the structure before committing to K, and n is modest** → hierarchical.
- **Overlapping groups, or you need a probability rather than a label** → GMM.
- **Very high dimensions** → reduce with PCA first, whatever you then use. Every one of these is distance-based, and distances concentrate.`,
    },
  ],
  quiz: [
    {
      question: 'What is a core point in DBSCAN?',
      options: [
        { text: 'The centre of a cluster', explanation: 'DBSCAN has no centres — that is the whole departure from K-Means.' },
        { text: 'A point with at least min_pts neighbours within eps', explanation: 'Correct. (3,0) had 3 neighbours and qualified; (0,0) had 2 and did not.' },
        { text: 'The first point of each cluster', explanation: 'The first point happens to be core, but being first is not what defines it.' },
        { text: 'A point with no neighbours', explanation: 'That is noise.' },
      ],
      correct: 1,
    },
    {
      question: 'DBSCAN labelled the two rows correctly where K-Means preferred the left/right split. Why?',
      options: [
        { text: 'DBSCAN was given the right K', explanation: 'DBSCAN was given no K at all — it discovered two clusters.' },
        { text: 'It never assumes a shape; it only asks where points are dense, and eps = 1.5 makes along-row neighbours but not across-row ones', explanation: 'Correct. The rows are dense along their length and separated across it, which is exactly what density-based clustering keys on.' },
        { text: 'It ran for more iterations', explanation: 'It makes a single pass over the points.' },
        { text: 'The data was scaled differently', explanation: 'The same coordinates were used for both.' },
      ],
      correct: 1,
    },
    {
      question: 'Why may only core points start a new cluster?',
      options: [
        { text: 'To make the algorithm deterministic', explanation: 'Border-point assignment can still depend on visit order; that is a separate quirk.' },
        { text: 'So that thin trails of sparse stragglers cannot found clusters of their own', explanation: 'Correct. A border point can join a cluster but not seed one, which is what keeps clusters anchored in genuine density.' },
        { text: 'Because border points have no neighbours', explanation: 'They have some — just fewer than min_pts.' },
        { text: 'To keep the cluster count equal to K', explanation: 'There is no K.' },
      ],
      correct: 1,
    },
    {
      question: 'What does a dendrogram give you that K-Means does not?',
      options: [
        { text: 'Faster clustering', explanation: 'Agglomerative clustering is far slower — O(n²) memory at least.' },
        { text: 'The whole merge structure, so K can be chosen after seeing it rather than before', explanation: 'Correct. You cut the tree at whatever height gives a sensible number of groups.' },
        { text: 'Probabilities for each point', explanation: 'That is GMM.' },
        { text: 'Automatic outlier detection', explanation: 'That is DBSCAN\'s noise label.' },
      ],
      correct: 1,
    },
    {
      question: 'Single linkage merges on the distance between the two closest members. What follows?',
      options: [
        { text: 'It finds elongated shapes well, but one bridging point can chain two real clusters into one', explanation: 'Correct. Chaining is both its strength and its characteristic failure.' },
        { text: 'It always produces equal-sized clusters', explanation: 'That is closer to complete linkage.' },
        { text: 'It is the most robust choice', explanation: 'It is the most sensitive to a single stray point.' },
        { text: 'It behaves like K-Means', explanation: 'Ward linkage is the one that behaves like K-Means.' },
      ],
      correct: 0,
    },
    {
      question: 'How does a GMM differ from K-Means?',
      options: [
        { text: 'Soft assignment plus a per-component covariance, so it fits elongated and tilted clusters and returns probabilities', explanation: 'Correct. K-Means is the special case with hard assignment and identical spherical covariances.' },
        { text: 'It requires no K', explanation: 'K is still required.' },
        { text: 'It does not use distances at all', explanation: 'The Gaussian density is a function of a distance, just a covariance-weighted one.' },
        { text: 'It is faster', explanation: 'EM on full covariances is considerably slower.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'When would you use DBSCAN over K-Means?',
      answer:
        'When the clusters are not round, when you do not know K, or when outliers should be labelled rather than absorbed. The two-rows case is the clean demonstration: K-Means scored the wrong grouping at inertia 36.0 against the truth at 84.0, so no number of restarts would recover it, while DBSCAN found the rows with no K supplied. The trade is that eps is genuinely hard to choose and DBSCAN struggles when clusters have very different densities, since one eps has to serve all of them.',
      isCaseBased: true,
    },
    {
      question: 'How do you choose eps and min_pts?',
      answer:
        'min_pts by rule of thumb first — often twice the number of dimensions — and raise it if the data is noisy, since it directly controls how much density is needed to count. For eps, the standard method is a k-distance plot: for every point compute the distance to its min_pts-th nearest neighbour, sort those descending, and look for the knee. Points to the left of the knee are the sparse ones that will become noise. It is still the weakest part of the method, which is why HDBSCAN — which varies the density threshold rather than fixing one — is often the better modern choice.',
      isCaseBased: false,
    },
    {
      question: 'Explain the difference between hard and soft assignment.',
      answer:
        'Hard assignment puts each point in exactly one cluster and discards the ambiguity — a customer halfway between two segments is filed under one of them with no record that it was a close call. Soft assignment, as in a GMM, gives each point a probability per cluster, so that customer might come out 55% one and 45% the other. That matters when the downstream decision is a risk or a spend, because 55/45 and 99/1 should not lead to the same action, and hard assignment cannot tell them apart.',
      isCaseBased: false,
    },
    {
      question: 'What is EM, and how does it relate to K-Means?',
      answer:
        'Expectation–maximisation alternates two steps: E computes, for each point, the probability it belongs to each component given the current parameters; M refits each component\'s mean, covariance and weight using those probabilities as weights. It is exactly K-Means\' assign-and-update loop with the hard choice replaced by a distribution. In fact K-Means is the limiting case — fix every covariance to the same multiple of the identity and let that multiple go to zero, and the responsibilities collapse to 0/1 and EM becomes K-Means. Like K-Means, EM only finds a local optimum and depends on initialisation.',
      isCaseBased: false,
    },
    {
      question: 'You cluster 2 million rows and hierarchical clustering will not run. What now?',
      answer:
        'Agglomerative needs the pairwise distance matrix, which at 2 million rows is 4×10¹² entries — it is not a tuning problem, it cannot run. Options: MiniBatchKMeans, which handles this size comfortably; DBSCAN with a spatial index, which is roughly O(n log n) if the dimensionality is low enough for the index to help; or cluster a representative sample hierarchically to understand the structure and pick K, then apply K-Means to the full data with that K. The last one is often the most useful, because it keeps the diagnostic value of the dendrogram.',
      isCaseBased: true,
    },
    {
      question: 'How do you evaluate a clustering with no labels?',
      answer:
        'Internal measures, then judgement. Silhouette compares each point\'s distance to its own cluster against the nearest other one and has a real maximum. Davies–Bouldin and Calinski–Harabasz are alternatives with the same spirit. All of them embed an assumption about cluster shape — silhouette favours round clusters, so it will also prefer K-Means\' wrong answer on the two rows. So I would combine them with stability checks, clustering bootstrapped subsamples to see whether the same structure keeps appearing, and with whether the clusters are describable in domain terms.',
      isCaseBased: false,
    },
    {
      question: 'DBSCAN labels 40% of your points as noise. What do you do?',
      answer:
        'That usually means eps is too small or min_pts too large for the density of this data, so I would look at the k-distance plot rather than guess. But it can also be honest — genuinely sparse data has genuinely few dense regions, and forcing those points into clusters would be worse. I would also check scaling first, since eps is a distance and an unscaled column makes it meaningless. If the density varies a lot across the dataset, one eps cannot serve all of it and HDBSCAN is the right escalation.',
      isCaseBased: true,
    },
    {
      question: 'Is DBSCAN deterministic?',
      answer:
        'Almost. Core points and their cluster membership are fully determined by eps and min_pts. The exception is border points reachable from two different clusters — whichever core point is processed first claims them, so the result can depend on the order of the input. It affects only points at the edges and rarely changes anything material, but it is worth knowing if you need exactly reproducible output.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'DBSCAN, in one sentence', back: 'A cluster is a dense region of any shape. Chain core points to their neighbours; leftovers are labelled noise. No K required.' },
    { front: 'Core point', back: 'A point with at least min_pts neighbours within eps. (3,0) had 3 → core; (0,0) had 2 → border, not core.' },
    { front: 'Why can only core points seed a cluster?', back: 'So sparse trails of stragglers cannot found clusters. A border point may join one but never start one.' },
    { front: 'The two-rows comparison', back: 'K-Means preferred the left/right split (36.0) over the truth (84.0). DBSCAN, given no K, recovered the rows.' },
    { front: 'Dendrogram', back: 'The full merge tree from agglomerative clustering. Cut it high for few clusters, low for many — K is chosen after seeing the structure.' },
    { front: 'The four linkages', back: 'Single = closest pair (chains, finds elongated shapes). Complete = furthest pair (compact, equal). Average = the compromise. Ward = least variance increase, behaves like K-Means.' },
    { front: 'GMM', back: 'Data assumed to come from K overlapping Gaussians; each point gets a PROBABILITY per cluster. Per-component covariance lets it fit tilted, elongated clusters.' },
    { front: 'EM vs K-Means', back: 'E computes responsibilities, M refits weighted by them. K-Means is EM with hard 0/1 responsibilities and identical spherical covariances.' },
  ],
  mindmapMarkdown: `- DBSCAN, hierarchical, GMM
  - DBSCAN
    - cluster = dense region, ANY shape
    - eps + min_pts, no K
    - core point: >= min_pts neighbours within eps
      - (3,0): 3 neighbours -> core
      - (0,0): 2 -> border, not core
    - only core points seed clusters
    - leftovers = noise (-1)
    - found the two rows K-Means got wrong
    - weakness: choosing eps, varying densities
  - Hierarchical
    - merge the two closest, repeatedly
    - dendrogram -> choose K AFTER
    - linkage: single / complete / average / Ward
    - O(n^2) memory: does not scale
  - GMM
    - K overlapping Gaussians, soft assignment
    - per-component covariance -> tilted, elongated
    - fitted by EM (E = responsibilities, M = refit)
    - K-Means is the hard, spherical special case
  - Choosing
    - round + K known + big -> K-Means
    - odd shapes / outliers / no K -> DBSCAN
    - want to see structure -> hierarchical
    - overlapping / need probabilities -> GMM`,
}

export default m
