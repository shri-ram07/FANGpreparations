import type { Module } from '../types'

const m: Module = {
  id: 'ml-l3-clustering',
  subjectId: 'ml',
  level: 3,
  title: 'Clustering: K-Means, Hierarchical, DBSCAN & GMM',
  whyItMatters:
    'Labels are expensive; raw data is free. Clustering is how you find structure in the free stuff — customer segments, anomaly groups, document topics. Interviewers love it because there is no accuracy score to hide behind: you have to defend your choice of algorithm, your k, and your definition of "worked". "When does K-Means fail?" is a guaranteed question.',
  estMinutes: 60,
  sections: [
    {
      type: 'intuition',
      title: 'No labels, no answer key',
      md: `Supervised learning is a graded exam: you predict, you check against y, you get a number. Clustering hands you the same exam with the answer sheet burned.

- **Unsupervised** = you get X only. No y. Nothing to be right or wrong about.
- The goal is *structure*: groups where points inside are similar and points across are not.
- There is no accuracy, no F1, no test set to appeal to.
- So the honest headline: **the hardest part of clustering is knowing whether you succeeded.**
- Every clustering result looks like a result. A bad k still returns k tidy-looking clusters.
- That is why this module spends as much time on *how you check* as on the algorithms.`,
    },
    {
      type: 'intuition',
      title: 'K-Means: two steps, forever',
      md: `You are opening 3 delivery hubs in a city. You do not know where. So you guess 3 spots, then improve.

- **Step 1 — assign.** Every house goes to its nearest hub. (Points get colored.)
- **Step 2 — update.** Every hub moves to the average location of its own houses.
- Repeat. Assign, average, assign, average.
- Stop when no house switches hubs. That is convergence — nothing left to improve.
- That is the entire algorithm. Two lines you can say out loud in an interview.
- "Nearest" means Euclidean distance, and "average" means the arithmetic mean — those two choices are what make it K-*Means*.`,
    },
    {
      type: 'math',
      intro: 'The objective K-Means secretly minimizes, and why the loop must stop.',
      latex: [
        'J = \\sum_{j=1}^{k} \\sum_{x \\in C_j} \\lVert x - \\mu_j \\rVert^2 \\qquad \\text{(inertia, a.k.a. WSS: within-cluster sum of squares)}',
        '\\textbf{Assign: } c(x) = \\arg\\min_j \\lVert x - \\mu_j \\rVert^2 \\qquad \\textbf{Update: } \\mu_j = \\frac{1}{|C_j|} \\sum_{x \\in C_j} x',
        '\\text{Assign cannot raise } J \\text{ (each point picks its cheapest home).}',
        '\\text{Update cannot raise } J \\text{ (the mean is the point minimizing squared distance).}',
      ],
    },
    {
      type: 'note',
      md: `So **J only ever falls**, and there are finitely many ways to assign m points to k clusters — therefore K-Means *always converges*, in practice within a few dozen iterations. But read the guarantee precisely: it converges to a point where no single step improves things. That is a **local minimum**. It says nothing about being the best clustering. Hold that thought and go play with the visual — the "one corner" start proves it.`,
    },
    { type: 'visual', component: 'KMeansStepper', props: {} },
    {
      type: 'note',
      md: `What you should have seen: with **good spread**, inertia lands near 62,000 and each blob gets its own centroid — the answer you wanted. With **one corner** (all centroids stacked in a corner), the loop still converges happily, still refuses to improve — at inertia around 336,000, five times worse. Two centroids waste themselves splitting one blob while a third swallows the other two. Nothing is broken. K-Means did exactly its job. **That gap is the local-minimum lesson**: the algorithm finds A minimum, decided by where you started, never THE minimum. The fix is embarrassingly simple, which is why it is the default: run it several times from different starts and keep the lowest inertia. That parameter is **n_init** — sklearn runs 10 by default.`,
    },
    {
      type: 'intuition',
      title: 'K-Means++: stop starting stupid',
      md: `n_init brute-forces the problem: try 10 random starts, hope one is good. K-Means++ makes each start good on purpose.

- Pick the first centroid at random from the data.
- For every remaining point, compute D(x) = distance to the nearest centroid chosen *so far*.
- Pick the next centroid at random, with probability proportional to **D(x)²**.
- In one line: **far-away points are far more likely to be chosen**. The seeds spread themselves.
- Result: "all in one corner" becomes vanishingly unlikely, and it comes with a theoretical bound on how bad the final inertia can be.
- This is why **init='k-means++'** is the sklearn default. Keep n_init anyway — cheap insurance, not a replacement.`,
    },
    {
      type: 'intuition',
      title: 'Choosing k: the elbow, and why it disappoints',
      md: `k is not learned. You must hand it over before the algorithm runs. So how do you pick it?

- Run K-Means for k = 2, 3, 4, … and plot inertia against k.
- Inertia **always** falls as k rises — at k = m every point is its own cluster and inertia is 0. So "lowest inertia" is a useless rule.
- The **elbow method**: look for the k where the curve stops dropping steeply and flattens. Before the elbow you are splitting real clusters; after it you are splitting noise.
- Honest weakness: **real elbow plots rarely have an elbow.** They have a gentle bend, and three people read three different k's off it.
- Better tiebreaker: **silhouette score** — for each point, how much closer it is to its own cluster than to the next nearest one, averaged. Range −1 to 1, higher is better, and it actually has a peak.
- Full treatment of silhouette (and Davies-Bouldin, Calinski-Harabasz) lives in the **Metrics & Losses** subject. Here, use it as the tiebreaker.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Elbow vs silhouette on data with a known k of 4',
      code: `from sklearn.datasets import make_blobs
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

X, _ = make_blobs(n_samples=400, centers=4, cluster_std=1.1, random_state=42)

print(' k   inertia   silhouette')
for k in range(2, 8):
    km = KMeans(n_clusters=k, n_init=10, random_state=0).fit(X)
    print(f'{k:2d}  {km.inertia_:8.1f}   {silhouette_score(X, km.labels_):.3f}')

#  k   inertia   silhouette
#  2   13029.8   0.586
#  3    3044.9   0.747
#  4     927.5   0.773
#  5     837.5   0.681
#  6     752.0   0.548
#  7     667.2   0.425`,
      annotations: {
        5: 'The true answer is 4 — we throw the labels away with _ and pretend we never knew.',
        9: 'n_init=10: ten independent K-Means++ starts, best inertia kept. Without it a bad seed poisons the whole row.',
        10: 'silhouette_score takes the DATA and the LABELS — it never sees centroids, so it works for DBSCAN and hierarchical too.',
        15: 'Inertia keeps falling forever (927 -> 837 -> 752 -> 667). Silhouette peaks HERE at 0.773 and then collapses. One of these two answers is decisive.',
      },
    },
    {
      type: 'note',
      md: `Read that table like an interviewer would. Inertia drops 13029 → 3045 → 928 (huge) then 928 → 838 → 752 (small). The bend is at k=4 — but is the "real" elbow at 3 or 4? On a plot, honestly arguable. Silhouette has no such ambiguity: 0.586, 0.747, **0.773**, 0.681, 0.548, 0.425. Single clean peak at 4, the true answer. **Elbow to narrow the range, silhouette to pick inside it, domain knowledge to overrule both** — "marketing can only run 5 campaigns" is a better reason for k=5 than any curve.`,
    },
    {
      type: 'intuition',
      title: 'When K-Means fails (the interview question)',
      md: `Every K-Means weakness follows from one sentence: *it draws straight-line boundaries halfway between centroids and scores everything by squared Euclidean distance.* Memorize the causes, not the list.

- **Shape.** It assumes round (spherical) blobs. Elongated, crescent, nested-ring, or snake-shaped clusters get sliced across, not traced.
- **Size.** It prefers clusters of similar size — a genuine tiny cluster next to a huge one gets absorbed, because moving the boundary costs the big cluster more than it saves the small one.
- **Density.** Similar densities assumed. A dense cluster and a diffuse one of the same count will have their border pushed into the diffuse one.
- **Outliers.** The mean is not robust — one point 100 units away drags its centroid noticeably. K-Medoids (uses actual data points) is the robust cousin.
- **Scaling.** Distance sums squared feature differences, so a column measured in rupees crushes a column measured in 0–1. **Always StandardScaler before K-Means.** Skipping this is the single most common real bug.
- **k up front.** You must guess the number of clusters before you have seen any clusters.`,
    },
    {
      type: 'intuition',
      title: 'Hierarchical clustering: never commit to k',
      md: `Different idea: do not guess k. Build the whole family tree and cut it wherever you like, later.

- **Agglomerative** (bottom-up, the one people use): start with every point as its own cluster. Repeatedly merge the two closest clusters. Stop when one cluster remains.
- The output is not labels — it is a **dendrogram**, a tree of merges with the merge distance as height.
- **The advantage:** slice the dendrogram horizontally at any height and read off the clusters. Cut low → many small clusters. Cut high → few big ones. **One run, every k.**
- A tall vertical gap in the tree (a big jump in merge distance) is a natural place to cut — that is the dendrogram's version of an elbow.
- Divisive (top-down, split repeatedly) exists and is basically never used — splitting is combinatorially harder than merging.
- "Closest clusters" is undefined until you pick a **linkage**. That choice decides everything.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The four linkages on identical data — same algorithm, four answers',
      code: `import numpy as np
from sklearn.datasets import make_moons
from sklearn.cluster import AgglomerativeClustering

X, y = make_moons(n_samples=300, noise=0.08, random_state=0)
purity = lambda lab: sum(max((lab[y == c] == j).sum() for j in (0, 1)) for c in (0, 1)) / len(y)

for lk in ('ward', 'complete', 'average', 'single'):
    m = AgglomerativeClustering(n_clusters=2, linkage=lk).fit(X)
    print(f'{lk:9} purity {purity(m.labels_):.3f}  sizes {np.bincount(m.labels_)}')

# ward      purity 0.860  sizes [192 108]
# complete  purity 0.770  sizes [219  81]
# average   purity 0.860  sizes [192 108]
# single    purity 1.000  sizes [150 150]`,
      annotations: {
        5: 'Two interleaved crescents. The perfect answer is 150/150 — the moon each point came from.',
        6: 'We peek at y ONLY to grade the demo. Real clustering has no y; this is a lab, not a workflow.',
        9: 'Only the linkage string changes. Nothing else. The spread in the results is entirely the linkage.',
        15: 'Single linkage nails it: 150/150, purity 1.000. Chaining is a WEAKNESS on blobs and a SUPERPOWER on crescents.',
      },
    },
    {
      type: 'note',
      md: `The four linkages, by how they define the distance between two clusters. **Single** = distance between the two *closest* members → follows thin trails, traces arbitrary shapes (it won above), but "chains" unrelated clusters together through a single bridge of noise points. **Complete** = distance between the two *farthest* members → compact, ball-like clusters, sensitive to outliers (0.770 here, the worst). **Average** = mean over all pairs → the middle road. **Ward** = merge the pair that increases within-cluster variance least → tight, similar-sized clusters; it is the sklearn default and your default too, because it behaves like K-Means with a dendrogram attached. Cost is the catch: distances between all pairs is **O(n²) memory and O(n² log n)–O(n³) time**. Past roughly 10k–50k points, hierarchical clustering stops being an option — that is when you go back to K-Means or DBSCAN.`,
    },
    {
      type: 'intuition',
      title: 'DBSCAN: clusters are crowds, not circles',
      md: `Forget centroids. A cluster is any region where points are packed tightly together, whatever shape that region happens to be.

- Two knobs. **eps** = the radius of a point's neighborhood. **min_samples** = how many neighbors make a neighborhood "crowded".
- **Core point:** has at least min_samples points within eps. It is inside a dense region.
- **Border point:** not core itself, but sits within eps of a core point. It is on the edge.
- **Noise point:** neither. DBSCAN labels it **−1** and refuses to cluster it.
- Clusters grow by linking core points that are within eps of each other, then absorbing their borders. A cluster can therefore snake anywhere the density goes.
- Two superpowers, both free: **arbitrary shapes**, and **outliers come out labeled as noise** instead of being forced into a cluster. And **you never specify k** — the number of clusters is whatever the density says.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Same data, two algorithms: K-Means vs DBSCAN on two moons',
      code: `from sklearn.datasets import make_moons
from sklearn.cluster import KMeans, DBSCAN

X, y = make_moons(n_samples=300, noise=0.08, random_state=0)

def report(name, labels):
    print(name)
    for c in sorted(set(labels)):
        m = labels == c
        tag = 'noise' if c == -1 else f'cluster {c}'
        print(f'  {tag:9} n={m.sum():3d}   moon0={int((y[m] == 0).sum()):3d}  moon1={int((y[m] == 1).sum()):3d}')

km = KMeans(n_clusters=2, n_init=10, random_state=0).fit(X)
report(f'KMeans  k=2  inertia={km.inertia_:.1f}', km.labels_)

db = DBSCAN(eps=0.15, min_samples=5).fit(X)
report('DBSCAN  eps=0.15  min_samples=5', db.labels_)

# KMeans  k=2  inertia=123.1
#   cluster 0 n=152   moon0= 40  moon1=112
#   cluster 1 n=148   moon0=110  moon1= 38
# DBSCAN  eps=0.15  min_samples=5
#   noise     n=  4   moon0=  3  moon1=  1
#   cluster 0 n=149   moon0=  0  moon1=149
#   cluster 1 n=147   moon0=147  moon1=  0`,
      annotations: {
        4: 'Two interleaved crescents. Each moon wraps around the other, so no straight line separates them.',
        11: 'This prints the crosstab: how many points of each TRUE moon landed in each predicted cluster. Perfect = one number per row, one zero.',
        13: 'K-Means gets every advantage: correct k, ten restarts. It still cannot win — the failure is structural, not tuning.',
        16: 'No k given to DBSCAN. It discovered "2" from the density alone.',
        19: 'K-Means: 40 and 38 misplaced, 78/300 = 26% wrong. It cut the plane in half vertically, slicing both moons.',
        22: 'DBSCAN: 149/0 and 0/147 — the moons recovered exactly, plus 4 sparse stragglers honestly flagged as noise.',
      },
    },
    {
      type: 'note',
      md: `Look at what K-Means could not do even with k=2 handed to it and 10 restarts: its boundary is a straight line, and no straight line separates two interlocking crescents. DBSCAN got there with no k at all, and *additionally* told you which 4 points it did not trust. That is the trade you are buying — and now the price.`,
    },
    {
      type: 'intuition',
      title: 'What DBSCAN costs you',
      md: `The same design that gives DBSCAN its powers gives it its failures.

- **One global eps.** Density is defined once for the whole dataset. If cluster A is dense and cluster B is loose, no single eps works: tight eps shreds B into noise, loose eps melts A into its neighbors.
- That is the headline weakness — **varying-density clusters**. (HDBSCAN fixes it by varying the density threshold; name-drop it and move on.)
- **eps is hard to pick**, and badly so in high dimensions, where the curse of dimensionality makes all pairwise distances converge to about the same value — so "within eps" stops distinguishing anything. Reduce dimensions first (PCA) or use a different algorithm.
- Heuristic that works in 2–10 dimensions: the **k-distance plot**. For every point, compute the distance to its k-th nearest neighbor (k = min_samples), sort those distances, and plot them. The sharp knee in that curve is your eps.
- Rule of thumb for min_samples: start at 2 × (number of dimensions); raise it for noisy data.
- **No predict for new points.** DBSCAN has no centroids or model to score against — sklearn gives it *fit_predict* and no *predict*. Re-fit, or train a classifier on the labels.`,
    },
    {
      type: 'intuition',
      title: 'GMM: let a point belong 60/40',
      md: `K-Means makes every point pick a side. Reality has customers who are 60% "budget" and 40% "premium". A **Gaussian Mixture Model** lets them say so.

- Assume the data was generated by k Gaussian distributions ("bells") mixed together, each with its own weight π, mean μ, and **covariance Σ**.
- Fitting means recovering those parameters. Then for each point you get **responsibilities**: the probability it came from each Gaussian. That is the **soft assignment**.
- Because each cluster carries its own full covariance matrix, a cluster can be **elliptical, stretched, and rotated** — not just a ball.
- Which makes the relationship exact: **K-Means is GMM with spherical, equal covariance and hard assignments.** Force every Σ to be σ²I and round every responsibility to 0 or 1, and EM literally becomes the assign/update loop.
- Soft assignments are the practical win: you can rank a point's confidence, flag the ambiguous ones for a human, or threshold at 0.9 and leave the rest unlabeled.`,
    },
    {
      type: 'math',
      intro: 'The mixture, and the EM loop that fits it. γ (gamma) is the responsibility of cluster j for point i.',
      latex: [
        'p(x) = \\sum_{j=1}^{k} \\pi_j \\, \\mathcal{N}(x \\mid \\mu_j, \\Sigma_j), \\qquad \\sum_j \\pi_j = 1',
        '\\textbf{E-step: } \\gamma_{ij} = \\frac{\\pi_j \\, \\mathcal{N}(x_i \\mid \\mu_j, \\Sigma_j)}{\\sum_{l} \\pi_l \\, \\mathcal{N}(x_i \\mid \\mu_l, \\Sigma_l)}',
        '\\textbf{M-step: } \\mu_j = \\frac{\\sum_i \\gamma_{ij} x_i}{\\sum_i \\gamma_{ij}}, \\qquad \\pi_j = \\frac{1}{m} \\sum_i \\gamma_{ij}, \\qquad \\Sigma_j \\text{ likewise, } \\gamma\\text{-weighted}',
      ],
    },
    {
      type: 'note',
      md: `**E** = *expectation*: freeze the Gaussians, compute how much each cluster is responsible for each point — the soft version of "assign". **M** = *maximization*: freeze the responsibilities, refit each Gaussian to its weighted share of the data — the soft version of "update". Alternate. Each round provably raises the data's log-likelihood, so EM converges for the same reason K-Means does — **and inherits the same caveat: a local maximum, dependent on initialization.** sklearn's **n_init** on GaussianMixture exists for exactly the reason K-Means' does.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Elongated clusters: where GMM sees what K-Means cannot',
      code: `import numpy as np
from sklearn.cluster import KMeans
from sklearn.mixture import GaussianMixture

rng = np.random.default_rng(0)
n = 200
X = np.vstack([np.c_[rng.normal(0, 6, n), rng.normal(0.0, 0.6, n)],
               np.c_[rng.normal(0, 6, n), rng.normal(3.0, 0.6, n)]])
y = np.r_[np.zeros(n), np.ones(n)].astype(int)
purity = lambda lab: sum(max((lab[y == c] == j).sum() for j in (0, 1)) for c in (0, 1)) / len(y)

km = KMeans(2, n_init=10, random_state=0).fit(X)
gm = GaussianMixture(2, covariance_type='full', n_init=10,
                     init_params='random_from_data', random_state=0).fit(X)
print(f'KMeans purity {purity(km.labels_):.3f}   GMM purity {purity(gm.predict(X)):.3f}')

r = gm.predict_proba(X)
print('most ambiguous point ->', r[np.abs(r[:, 0] - 0.5).argmin()].round(2))
print('undecided points (max responsibility < 0.9):', int((r.max(1) < 0.9).sum()), 'of', len(X))

# KMeans purity 0.512   GMM purity 0.990
# most ambiguous point -> [0.5 0.5]
# undecided points (max responsibility < 0.9): 6 of 400`,
      annotations: {
        7: 'Two long horizontal bars: 10x wider than tall (sd 6 in x, 0.6 in y), stacked with a gap of 3.0 in y.',
        13: "covariance_type='full' is the whole point — each cluster gets its own 2x2 covariance, so it can be a stretched, tilted ellipse.",
        14: "init_params defaults to 'kmeans', which here seeds EM with K-Means' wrong vertical split and traps it. Seeding from random data points escapes it — a live demo of EM's local-optimum caveat.",
        17: 'predict_proba is the soft assignment: one probability row per point, summing to 1. K-Means has no equivalent.',
        21: 'K-Means 0.512 = coin flip. Its straight boundary cuts the bars vertically (left half / right half) instead of along the real seam.',
        23: 'Exactly 6 of 400 points are genuinely uncertain — the ones near the seam. GMM can name them; K-Means cannot.',
      },
    },
    {
      type: 'intuition',
      title: 'Which one do I reach for?',
      md: `Run down the list and stop at the first line that matches your data. This is the answer to "how would you approach this clustering problem".

- **Big data, round-ish clusters, k roughly known** → **K-Means** (with StandardScaler, k-means++, n_init≥10). Nearly O(n) per iteration; it is the only one on this list that scales to millions comfortably.
- **You do not know k, and want to see the structure at every k** → **hierarchical + Ward**, read the dendrogram. Only under ~10k–50k points.
- **Weird shapes, unknown k, and outliers you want *named*** → **DBSCAN**. Scale features first, pick eps from a k-distance plot.
- **Overlapping clusters, elliptical shapes, or you need a confidence per point** → **GMM**. Also gives you a real likelihood, so BIC/AIC can choose k for you — the most principled k-selection on this page.
- **Varying density** → HDBSCAN. **Outliers dominate** → K-Medoids or DBSCAN.
- Whatever you pick: **scale the features, run it more than once, and validate with silhouette plus a human eyeballing the clusters.** Numbers alone cannot tell you a clustering is meaningful — only that it is tight.`,
    },
  ],
  quiz: [
    {
      question: 'Why is K-Means guaranteed to converge, and what exactly does that guarantee promise?',
      options: [
        {
          text: 'Both steps can only lower inertia, and assignments are finite — so it stops, but at a local minimum',
          explanation:
            'Correct. Assign picks each point\'s cheapest centroid; update moves each centroid to the variance-minimizing mean. J is monotonically non-increasing over finitely many assignments, so it must halt — with zero promise that it halted at the best clustering.',
        },
        {
          text: 'The objective is convex, so any run reaches the global optimum',
          explanation: 'K-Means\' objective is NOT convex in the assignments — that is precisely why different initializations give different answers.',
        },
        {
          text: 'It runs a fixed number of iterations and then stops',
          explanation: 'max_iter is a safety cap, not the reason it converges. It normally stops far earlier because assignments stabilize.',
        },
      ],
      correct: 0,
    },
    {
      question: 'Your inertia-vs-k plot falls smoothly with no visible elbow. What is the right next move?',
      options: [
        { text: 'Pick the largest k you tried — lowest inertia wins', explanation: 'Inertia always falls with k and hits 0 when every point is its own cluster. "Lowest inertia" is a degenerate rule.' },
        {
          text: 'Compute silhouette score across the same k range and take the peak, then sanity-check against domain constraints',
          explanation:
            'Correct. Silhouette balances cohesion against separation, so it actually has a maximum instead of falling forever. Ambiguous elbows are the normal case, not a bug — this is why silhouette is the standard tiebreaker.',
        },
        { text: 'Conclude the data has no clusters and stop', explanation: 'A missing elbow is extremely common even on genuinely clustered data. It is evidence the metric is weak, not that structure is absent.' },
      ],
      correct: 1,
    },
    {
      question: 'K-Means++ chooses the next initial centroid by sampling a point with probability proportional to D(x)², where D(x) is the distance to the nearest already-chosen centroid. What does that achieve?',
      options: [
        { text: 'It guarantees the global minimum', explanation: 'It gives a probabilistic bound on how bad the result can be — a much weaker claim than a guarantee. n_init still earns its keep.' },
        { text: 'It removes the need to choose k', explanation: 'k-means++ is purely about WHERE the k centroids start. You still supply k.' },
        {
          text: 'It spreads the seeds far apart, making degenerate starts (all centroids in one region) very unlikely',
          explanation: 'Correct. Weighting by squared distance makes far-away points overwhelmingly likely to be picked, so the seeds self-distribute — usually fewer iterations and a better final inertia.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Which single property of K-Means explains why it fails on two interlocking crescents?',
      options: [
        {
          text: 'Assignment by nearest centroid produces straight-line (linear) boundaries, and no straight line separates the crescents',
          explanation:
            'Correct. The decision boundary between two centroids is the perpendicular bisector — always a line/hyperplane. Non-convex shapes are structurally out of reach, no matter the k or n_init.',
        },
        { text: 'It has not been given enough iterations to converge', explanation: 'It converges fine and quickly. The converged answer is the wrong shape — this is not an optimization failure.' },
        { text: 'The crescents contain too many outliers', explanation: 'The two-moons data is clean. Even with zero noise K-Means splits it wrongly.' },
      ],
      correct: 0,
    },
    {
      question: 'You cut a dendrogram at a lower height. What happens to the clustering?',
      options: [
        { text: 'You get fewer, larger clusters', explanation: 'Backwards. Cutting HIGH keeps only the late merges, giving fewer, larger clusters.' },
        {
          text: 'You get more, smaller clusters — and you get them from the same single run',
          explanation:
            'Correct. Height on the dendrogram is the merge distance. A low cut keeps only tight merges. That "any k from one run" property is hierarchical clustering\'s main advantage over K-Means.',
        },
        { text: 'The linkage criterion changes', explanation: 'Linkage is fixed when the tree is built. Cutting only reads the finished tree at a chosen height.' },
      ],
      correct: 1,
    },
    {
      question: 'A DBSCAN point has 3 neighbors within eps, min_samples is 5, and one of those neighbors is a core point. What is it?',
      options: [
        { text: 'A core point', explanation: 'Core requires min_samples points within eps. It has 3 < 5, so no.' },
        { text: 'A noise point', explanation: 'Noise means neither core nor reachable from a core point. This point IS within eps of a core point.' },
        {
          text: 'A border point — it joins that core point\'s cluster but cannot grow the cluster further',
          explanation:
            'Correct, and the second half matters: clusters expand only through core points. A border point is absorbed as a passenger. It can even sit within eps of two clusters, in which case the assignment depends on processing order.',
        },
      ],
      correct: 2,
    },
    {
      question: 'DBSCAN on customer data returns one giant cluster plus 40% noise, whichever eps you try. Most likely cause?',
      options: [
        {
          text: 'Clusters of genuinely different densities — one global eps cannot serve both, so you either merge everything or shred the sparse groups',
          explanation:
            'Correct, and it is DBSCAN\'s defining weakness. The see-saw behaviour across eps values is the signature. HDBSCAN, which varies the density threshold per cluster, is the standard fix.',
        },
        { text: 'min_samples is set too low', explanation: 'Lower min_samples produces MORE and larger clusters with LESS noise. It would not create the see-saw across eps values.' },
        { text: 'DBSCAN needs k specified and you did not give it', explanation: 'DBSCAN never takes k. That is one of its selling points.' },
      ],
      correct: 0,
    },
    {
      question: 'In precisely what sense is K-Means a special case of a Gaussian Mixture Model?',
      options: [
        { text: 'GMM is K-Means run several times and averaged', explanation: 'Unrelated. That description is closer to consensus clustering.' },
        { text: 'They are the same algorithm with different names', explanation: 'GMM has covariance matrices and soft assignments — strictly more expressive. It fits elliptical clusters K-Means cannot.' },
        {
          text: 'Fix every covariance to spherical and equal (σ²I) and harden every responsibility to 0/1 — then EM reduces to the assign/update loop',
          explanation:
            'Correct. E-step with hardened responsibilities is "assign to nearest centroid"; M-step with equal spherical covariance is "move to the mean". The two restrictions are exactly what K-Means throws away.',
        },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain K-Means to me as if I have never seen it, then tell me why it converges.',
      answer:
        'Two alternating steps. Assign: every point joins its nearest centroid. Update: every centroid moves to the mean of the points that joined it. Repeat until no point switches. It converges because both steps monotonically lower the same objective — inertia, the total squared distance from points to their assigned centroid. Assign lowers it because each point picks its cheapest centroid; update lowers it because the arithmetic mean is the point minimizing squared distance to a set. A non-increasing quantity over finitely many possible assignments must terminate. The sentence interviewers are waiting for next: it converges to a LOCAL minimum determined by the initialization — never guaranteed to be the global one.',
      isCaseBased: false,
    },
    {
      question: 'When does K-Means fail? Give me the failure cases and the underlying reason for each.',
      answer:
        'All of them fall out of one fact: assignment is by squared Euclidean distance to a centroid, so boundaries are straight lines and clusters are implicitly round. (1) Non-spherical shapes — crescents, rings, elongated bars: a linear boundary cannot trace them, so it slices across. (2) Unequal cluster sizes: the boundary sits where squared-distance cost balances, so a large cluster steals points from an adjacent small one. (3) Unequal densities: same mechanism, the diffuse cluster loses its border to the dense one. (4) Outliers: the mean is not robust, one far point drags its centroid; K-Medoids is the robust swap. (5) Unscaled features: distance is a sum of squared feature differences, so a large-range column dominates entirely — always StandardScaler first. (6) k must be chosen up front and inertia will not choose it for you. (7) High dimensions: distance concentration makes "nearest" meaningless — reduce with PCA first. Fixes to name: k-means++ and n_init for the local-minimum problem, DBSCAN for shapes and outliers, GMM for ellipses and overlap, spectral clustering for connectivity-defined shapes.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague clusters users with K-Means on columns [age (18–70), monthly_spend (₹0–500,000), num_logins (0–300)]. The clusters look like nothing but spend brackets. Debug it.',
      answer:
        'The features are unscaled, and monthly_spend has a range three orders of magnitude larger than the others. Inertia sums squared differences per feature, so spend contributes ~10⁶ times the variance of age — K-Means is effectively clustering on spend alone and the "segments" are just spend quantiles. Fix: StandardScaler (or RobustScaler if spend is heavy-tailed, which it will be — money always is; consider a log transform first). Then re-run and re-check silhouette. Second-order issues to raise: spend is probably long-tailed, so a handful of whales will each capture their own centroid — cap or log-transform, or move to K-Medoids. And confirm the clusters are actionable and stable, not just tight: re-run on a bootstrap sample and see whether the same segments reappear.',
      isCaseBased: true,
    },
    {
      question: 'Elbow method versus silhouette score for choosing k. Which do you trust and why?',
      answer:
        'The elbow plots inertia against k and looks for the bend. Its problem is structural: inertia falls monotonically to zero at k=m, so the criterion is a visual judgement about the rate of decrease, and on real data the curve is usually a smooth bend that three people read three ways. Silhouette computes, per point, (b−a)/max(a,b) where a is the mean distance to its own cluster and b to the nearest other cluster — so it penalizes both loose clusters and clusters too close to each other, giving it a genuine maximum. I use the elbow to bracket a plausible range and silhouette to pick within it. For GMM specifically, BIC/AIC are better still because a mixture model has a real likelihood, so model selection is principled rather than heuristic. And I overrule all of them with a business constraint when one exists — "the ops team can staff 5 segments" is a stronger reason than any curve.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through the linkage criteria in hierarchical clustering and when each one wins.',
      answer:
        'Linkage defines the distance between two clusters. Single = distance between their two closest members: it follows thin trails, so it recovers arbitrary elongated shapes (it is the only linkage that solves two-moons cleanly), but it chains — one bridge of noise points welds two distinct clusters together. Complete = distance between their two farthest members: compact, ball-like clusters, but a single outlier inflates the distance and distorts merges. Average = mean over all cross-pairs: a compromise, reasonably robust. Ward = merge the pair that increases total within-cluster variance least: tight, comparably-sized, spherical-ish clusters. Ward is sklearn\'s default and my default too, because it is essentially K-Means\' objective with a dendrogram attached. Requirement worth naming: Ward is only defined for Euclidean distance; with cosine or precomputed distances you must use average or complete.',
      isCaseBased: false,
    },
    {
      question: 'What does the dendrogram buy you that K-Means labels do not?',
      answer:
        'A dendrogram encodes the entire merge history with merge distance as height, so one fit answers every k: cut at any height and read the clusters off. Practical consequences: you can inspect nested structure (segments within segments), you can pick k by looking for the tallest vertical gap — the height range where nothing wanted to merge, which is the tree\'s honest version of an elbow — and you can hand a domain expert a picture instead of a number. The cost is O(n²) memory for the pairwise distances and O(n² log n)–O(n³) time, so it caps out around 10k–50k points. Above that I sample, cluster the sample hierarchically to choose k, then run K-Means on everything with that k.',
      isCaseBased: false,
    },
    {
      question: 'Explain DBSCAN\'s core/border/noise trichotomy and why "no k" is not a free lunch.',
      answer:
        'Core: at least min_samples points within radius eps. Border: not core, but within eps of a core point. Noise: neither, labelled −1. Clusters form by connecting core points within eps of each other and absorbing their borders, so a cluster is a connected dense region of any shape. You never specify k — but you specify eps and min_samples instead, and eps is genuinely harder to pick than k, because k is often known from the business while eps is a distance in feature space with no intuitive meaning. The honest trade: you swapped one hyperparameter for two less interpretable ones, and gained arbitrary shapes plus explicit outlier labelling. For eps, use the k-distance plot: distance to the k-th nearest neighbour for every point (k = min_samples), sorted, and take the knee. Also note DBSCAN has no predict() — no centroids means nothing to score a new point against.',
      isCaseBased: false,
    },
    {
      question: 'Case: DBSCAN on 200k rows of 60-dimensional sensor data returns everything as one cluster, or everything as noise, depending on eps. Nothing in between. What is going on and what do you do?',
      answer:
        'Two things, and the second is the real one. (1) Varying density: one global eps cannot serve a dense cluster and a sparse one, producing exactly this see-saw. (2) Sixty dimensions: the curse of dimensionality makes all pairwise distances concentrate around the same value, so the ratio between the nearest and farthest neighbour approaches 1 and "within eps" stops discriminating — every point is effectively equidistant, so the density estimate is flat and the eps threshold behaves as an on/off switch. Plan: check the k-distance plot first — if it has no knee, that confirms distance concentration. Then reduce dimensions (PCA to retain ~90% variance, or a learned embedding), verify features are scaled, and re-run. If density genuinely varies, switch to HDBSCAN, which selects a density threshold per cluster instead of globally. Also confirm the scale: at 200k rows DBSCAN needs a spatial index to stay near O(n log n), and those indexes degrade to brute force in high dimensions — another reason dimensionality reduction comes first.',
      isCaseBased: true,
    },
    {
      question: 'What does a GMM give you that K-Means cannot, and what does it cost?',
      answer:
        'Three things. Soft assignments — a probability per cluster per point, so you can rank confidence, route ambiguous points to a human, or abstain below a threshold. Per-cluster covariance — with covariance_type="full" each cluster is an ellipse with its own orientation and spread, so it fits elongated and overlapping clusters that K-Means cuts through. And a real likelihood, which makes BIC/AIC available for choosing k. Costs: more parameters (a full covariance is d(d+1)/2 numbers per cluster, so it overfits or goes singular in high dimensions — hence covariance_type "diag"/"tied"/"spherical" and the reg_covar floor), slower per iteration, a Gaussianity assumption that heavy-tailed data violates, and the same local-optimum sensitivity as K-Means, so n_init matters just as much.',
      isCaseBased: false,
    },
    {
      question: 'Describe the EM algorithm for a GMM, and say why it is guaranteed to improve each round.',
      answer:
        'E-step: hold the parameters (π, μ, Σ) fixed and compute the responsibility γ_ij — the posterior probability that point i came from component j, which is just each component\'s weighted density divided by the total. M-step: hold responsibilities fixed and refit each component as a γ-weighted maximum-likelihood estimate — μ_j is the weighted mean, Σ_j the weighted covariance, π_j the average responsibility. Alternate. Each round is guaranteed not to decrease the observed-data log-likelihood, because EM is maximizing a lower bound (the ELBO) that touches the true likelihood exactly at the current parameters — so improving the bound improves the likelihood. A bounded, monotonically non-decreasing sequence converges. Same caveat as K-Means: convergence is to a local maximum, and a degenerate one exists where a component collapses onto a single point with zero variance and infinite likelihood — which is what reg_covar prevents.',
      isCaseBased: false,
    },
    {
      question: 'You have run clustering. How do you decide whether it worked, given there are no labels?',
      answer:
        'Three layers, in order. (1) Internal metrics: silhouette (cohesion vs separation, higher better), Davies-Bouldin (lower better), Calinski-Harabasz. These say the clusters are geometrically tight and separated — never that they are meaningful. (2) Stability: re-run on bootstrap samples or with different seeds and measure agreement with Adjusted Rand Index. Clusters that dissolve under resampling are artifacts of the algorithm, not structure in the data. (3) External validity, which is the one that decides it: profile each cluster on features the model never saw and check the story holds — do the segments differ in churn, in lifetime value, in support tickets? Can a domain expert name them? If the clusters cannot be described in a sentence a stakeholder recognizes, the clustering has not worked regardless of silhouette. The one-liner: internal metrics tell you the clusters are tight; only downstream utility tells you they are real.',
      isCaseBased: false,
    },
    {
      question: 'Case: overnight, your production customer-segmentation job (K-Means, k=5) starts producing segments that no longer match last week\'s. Nobody changed the model. Diagnose.',
      answer:
        'Order of suspicion. (1) Cluster labels are arbitrary integers — a fresh fit renumbers them, so "segment 3" today need not be "segment 3" yesterday. Check whether the partitions actually differ (Adjusted Rand Index against the old labels) before assuming anything broke; if ARI is high, this is a labelling bug, fixed by matching centroids to the previous run. (2) If the partition genuinely changed: the seed is unset or n_init is low, so the job landed in a different local minimum. Pin random_state, raise n_init. (3) Scaler refitted on new data — if StandardScaler is fit inside the nightly job, shifting means and variances silently move every point; fit the scaler once and persist it. (4) Genuine data drift — an upstream schema change, a new market, a broken ETL introducing nulls imputed as zeros. Compare feature distributions week over week. Preventive fix: freeze the scaler and the centroids, run assignment-only in production, and re-fit on a deliberate schedule with a stability check (ARI vs the previous fit) gating the release.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    {
      front: 'K-Means in two steps (and where it lands)',
      back: 'Assign each point to the nearest centroid, move each centroid to its cluster mean, repeat until nothing switches. Both steps only lower inertia → it always converges, but to a LOCAL minimum set by the initialization.',
    },
    { front: 'K-Means++ and n_init', back: 'k-means++: seed centroids by distance-weighted (D²) sampling so they spread out. n_init: run the whole thing 10× and keep the lowest inertia. sklearn does both by default.' },
    { front: 'K-Means failure cases', back: 'Non-spherical shapes, unequal sizes, unequal densities, outliers (mean is not robust), unscaled features, k needed up front. All from: linear boundaries + squared Euclidean distance.' },
    {
      front: 'Inertia (WSS), the elbow, and silhouette',
      back: 'Inertia = Σ squared distance from each point to its centroid. It always falls as k rises (0 at k=m), so the elbow — the bend in inertia-vs-k — is a judgement call and often ambiguous. Silhouette = (b−a)/max(a,b), range −1..1, has a real peak. Elbow to bracket, silhouette to decide.',
    },
    {
      front: 'Dendrogram — the advantage',
      back: 'Agglomerative bottom-up merging recorded as a tree, merge distance as height. Cut at any height for any k, from one single run. Cost: O(n²) memory, O(n² log n)–O(n³) time → small data only.',
    },
    { front: 'Linkage cheat sheet', back: 'Single = closest pair (chains; the only one that solves two-moons). Complete = farthest pair (compact, outlier-sensitive). Average = middle. Ward = least variance increase; the sklearn default and yours.' },
    {
      front: 'DBSCAN core / border / noise',
      back: 'Core: ≥ min_samples points within eps. Border: within eps of a core but not core itself. Noise: neither, labelled −1. Clusters grow only through core points, so they can take any shape.',
    },
    {
      front: 'DBSCAN: superpowers and the price',
      back: 'Wins: arbitrary shapes, outliers labelled as noise, no k needed. Price: one global eps → fails on varying-density clusters (use HDBSCAN), eps is hard to pick in high dimensions (k-distance plot knee), and there is no predict() for new points.',
    },
    { front: 'GMM vs K-Means', back: 'GMM = soft assignments (responsibilities) + per-cluster covariance → elliptical, rotated, overlapping clusters. K-Means = GMM with spherical equal covariance and hardened 0/1 assignments.' },
    { front: 'EM in one line each', back: 'E: freeze the Gaussians, compute each point\'s responsibility per cluster. M: freeze responsibilities, refit each Gaussian weighted by them. Log-likelihood never decreases — local maximum only.' },
  ],
  mindmapMarkdown: `- Clustering: K-Means, Hierarchical, DBSCAN & GMM
  - Unsupervised framing
    - X only, no y, no accuracy score
    - Hardest part: knowing if it worked
    - Validate: silhouette + stability + domain sense
  - K-Means
    - Assign to nearest centroid, move centroid to mean
    - Inertia (WSS) only falls -> always converges
    - ...but to a LOCAL minimum (init decides)
    - k-means++ (D-squared seeding) + n_init=10
  - Choosing k
    - Elbow on inertia: often ambiguous
    - Silhouette peak: the tiebreaker
    - BIC/AIC for GMM; domain constraint overrules all
  - K-Means failure cases
    - Non-spherical shapes; unequal sizes and densities
    - Outliers drag the mean; unscaled features dominate
    - k required up front
    - Root cause: linear boundaries + squared Euclidean
  - Hierarchical
    - Agglomerative bottom-up merging
    - Dendrogram: cut at any height -> any k
    - Linkage: single chains, complete compact, Ward default
    - O(n^2)-O(n^3) -> small data only
  - DBSCAN
    - eps + min_samples; core / border / noise(-1)
    - Arbitrary shapes, no k, outliers labelled
    - One global eps -> varying density fails (HDBSCAN)
    - eps via k-distance knee; bad in high dimensions
  - GMM + EM
    - Soft assignments + per-cluster covariance -> ellipses
    - E: responsibilities. M: refit weighted Gaussians
    - Log-likelihood rises -> local maximum only
    - K-Means = spherical, equal-covariance, hard GMM
  - Decision list
    - Big + round -> K-Means (scaled)
    - Want every k -> Ward dendrogram
    - Weird shapes + outliers -> DBSCAN
    - Overlap + confidence -> GMM`,
}

export default m
