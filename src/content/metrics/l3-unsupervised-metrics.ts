import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l3-unsupervised-metrics',
  subjectId: 'metrics',
  level: 3,
  title: 'Unsupervised Metrics: Inertia, Silhouette & Agreement Scores',
  whyItMatters:
    'Every supervised metric you know needs a label column. Clustering has none — so "is this clustering good?" becomes a genuinely hard question, and it is the one interviewers use to find out whether you can reason about a model without a scoreboard. It is also where the most confident wrong answers live: people pick k by inertia (impossible), report accuracy on cluster ids (meaningless), and read Davies-Bouldin backwards.',
  estMinutes: 45,
  sections: [
    {
      type: 'intuition',
      title: 'The problem: there is no answer key',
      md: `Supervised learning grades itself. You predicted 1, the truth was 0, that is a mistake — count it. Clustering has no truth column at all.

- So "accuracy" does not merely perform badly here. It **cannot be computed**. There is nothing to compare against.
- Which leaves exactly two ways to judge a clustering, and every metric in this module is one of them.
- **Internal metrics** — judge the *geometry*, using only the data and the cluster assignments. Are the groups tight? Are they far apart? No labels needed, so these work on real problems.
- **External metrics** — compare your clusters against *known* labels. Only possible when you happen to have them: a benchmark dataset, a hand-labelled sample, an old rules-based system.
- Say which family you are in before you quote a number. Reporting ARI on a production dataset with no labels is not a strict metric — it is an impossible one.`,
    },
    {
      type: 'intuition',
      title: 'Inertia: what K-Means actually minimizes',
      md: `K-Means has one objective, and it has a name: **inertia**, also written WCSS (within-cluster sum of squares).

- For every point, take the squared distance to its own cluster centroid. Add them all up. That is inertia.
- The whole algorithm — assign, average, repeat — is a hill-descent on this single number. It is the loss.
- So inertia is a perfectly good *training* diagnostic: it must fall every iteration, and if it ever rises you have a bug.
- It is also the number that tells you a bad initialization happened: two runs, same k, different inertia means one of them landed in a worse local minimum.
- What it is **not** is a way to choose k. That is the next section, and it is the trap.`,
    },
    {
      type: 'math',
      intro: 'Inertia, and the one property that disqualifies it as a k-chooser.',
      latex: [
        '\\text{Inertia} \\;=\\; \\sum_{j=1}^{k} \\; \\sum_{x \\in C_j} \\lVert x - \\mu_j \\rVert^2 \\qquad \\mu_j = \\text{centroid (mean) of cluster } j',
        'k \\uparrow \\;\\Longrightarrow\\; \\text{Inertia} \\downarrow \\;\\text{ always} \\qquad k = n \\;\\Longrightarrow\\; \\text{Inertia} = 0',
      ],
    },
    {
      type: 'note',
      md: `Read that second line slowly, because it is the entire argument. Adding a cluster can never *increase* inertia — the extra centroid either helps or sits unused. Push it to the limit: give every point its own cluster and each point sits exactly on its own centroid, so inertia is **zero**. "Minimize inertia" therefore has a trivial answer, k = n, which is not a clustering, it is a list. Any procedure that picks k by taking the lowest inertia is guaranteed to return the most useless possible answer. This is why the **elbow method** exists: you do not look for the minimum, you look for the bend — the k after which extra clusters stop buying much. And the honest caveat is that the bend is a judgement call. On clean synthetic blobs it is obvious; on real data the curve is often a smooth arc with no elbow at all, and two engineers read 3 and 5 off the same plot. Treat the elbow as a shortlist, not a decision. (The algorithm itself — assignment, centroid update, k-means++, the local-minimum problem — lives in the clustering module of **Machine Learning**.)`,
    },
    { type: 'visual', component: 'KMeansStepper', props: {} },
    {
      type: 'note',
      md: `Step through it and watch the **inertia readout in the top-right corner**. On the default "good spread" start it falls at every single frame — 3 clusters, converging around **62,351** — and never once goes up. That is the loss doing its job. Now switch the init to **"one corner"** and step again. Inertia still falls monotonically, still converges, still reports "no point switched cluster" in green — and it settles at roughly **336,333**, five times worse. Two centroids are splitting the left blob while one lonely centroid swallows the other two. Nothing in the run flags this as a failure, because inertia falling is not evidence of a good answer; it is only evidence that the algorithm is running. And notice *what* inertia measured in both runs: distance from points to their own centroid. Compactness. Nothing else. It never asked whether the clusters are far from **each other** — which is exactly the blind spot the corner run fell into, and exactly what silhouette fixes.`,
    },
    {
      type: 'intuition',
      title: 'Silhouette: compactness AND separation, per point',
      md: `Ask a single point two questions. "How comfortable am I at home?" and "how much better is the neighbourhood next door?"

- **a** = mean distance from this point to every *other* point in **its own** cluster. Its discomfort at home. Small is good.
- **b** = mean distance from this point to every point in the **nearest other** cluster. How tempting the alternative is. Big is good.
- **s = (b − a) / max(a, b)**. The gap between them, scaled to land in [−1, +1].
- **s ≈ +1**: b is much bigger than a — the point is snug in its cluster and the alternatives are far away. Textbook.
- **s ≈ 0**: a ≈ b — the point sits on the boundary. It could belong to either cluster; the assignment is a coin flip.
- **s < 0**: a > b — the point is *closer on average to another cluster than to its own*. It is very likely in the wrong cluster.
- That third case is what inertia can never say. Inertia only ever sees the *a* half.`,
    },
    {
      type: 'math',
      intro: 'The two distances and the score. Note the max in the denominator — that is what bounds it.',
      latex: [
        'a(i) = \\frac{1}{|C_i| - 1} \\sum_{j \\in C_i,\\; j \\neq i} d(i, j) \\qquad b(i) = \\min_{C \\neq C_i} \\; \\frac{1}{|C|} \\sum_{j \\in C} d(i, j)',
        's(i) = \\frac{b(i) - a(i)}{\\max\\{\\, a(i),\\; b(i) \\,\\}} \\;\\in\\; [-1, +1]',
        '\\text{Convention: } s(i) = 0 \\text{ for a singleton cluster, where } a(i) \\text{ is undefined.}',
      ],
    },
    {
      type: 'intuition',
      title: 'Work one by hand — five points on a line',
      md: `Five 1-D points. The clustering under test puts **{0, 1, 2}** in cluster A and **{3, 20}** in cluster B. Just distances on a number line, so you can check every step.

- Point **3** is the interesting one. a = its only clustermate is 20, so a = 17. b = mean distance to A = (3 + 2 + 1)/3 = 2.
- s(3) = (2 − 17) / max(2, 17) = −15/17 = **−0.88**. Strongly negative: point 3 is screaming that it belongs with A.
- Point **20**: a = 17, b = (20 + 19 + 18)/3 = 19 → s = (19 − 17)/19 = **+0.11**. Barely positive — it is only in B because B is where it was put.
- Cluster A is fine: s(0) = **0.87**, s(1) = **0.91**, s(2) = **0.84**. Mean for A = **0.87**.
- Mean for cluster **B** = (−0.88 + 0.11)/2 = **−0.39**. That cluster is not a cluster.
- Overall mean silhouette = **0.368**.`,
    },
    {
      type: 'note',
      md: `Look at what just happened to the summary number. Cluster B has a mean silhouette of **−0.39** — an outright broken cluster containing one badly misplaced point and one outlier — and the overall score is **+0.368**, a number most people would shrug at and move on from. The good cluster paid for the bad one. This is the part everyone skips: **the mean silhouette is the least informative thing silhouette gives you**. What you actually want is the **silhouette plot** — the per-point scores sorted within each cluster and drawn as horizontal bars, one block per cluster. Then the pathology is visible instantly: you see a block that is thin (a tiny cluster), or short (a low-quality one), or dipping below zero (a wrong one). Two clusterings can tie at 0.55 mean silhouette where one is five even, healthy blocks and the other is four excellent blocks plus one disaster. Only the plot separates them. In an interview, "I would look at the silhouette plot per cluster, not just the average" is a line that lands.`,
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `import numpy as np

K = 3                                  # <-- change me: run it at 2, then 3, then 4

rng = np.random.default_rng(0)         # fixed toy data: 3 genuine blobs, 7 points each
X = np.vstack([c + rng.normal(0, 1.0, (7, 2)) for c in ([0., 0.], [8., 0.], [4., 2.5])])

cen = [X[0]]                           # farthest-point init, so the run is deterministic
while len(cen) < K:
    cen.append(X[((X[:, None] - np.array(cen)) ** 2).sum(2).min(1).argmax()])
cen = np.array(cen)
for _ in range(30):                    # Lloyd: assign to nearest centroid, re-average
    lab = ((X[:, None] - cen) ** 2).sum(2).argmin(1)
    cen = np.array([X[lab == j].mean(0) for j in range(K)])

D = np.sqrt(((X[:, None] - X) ** 2).sum(2))    # every pairwise distance
s = np.zeros(len(X))
for i in range(len(X)):
    own = lab == lab[i]
    a = D[i][own].sum() / max(own.sum() - 1, 1)                      # mean distance at home
    b = min(D[i][lab == j].mean() for j in range(K) if j != lab[i])  # nearest other cluster
    s[i] = (b - a) / max(a, b)

W = 20
print('K = %d   bar length = s;  # is positive, < points the WRONG way' % K)
for j in range(K):
    idx = np.where(lab == j)[0]
    print('cluster %d  n=%d  mean s = %+.3f' % (j, len(idx), s[idx].mean()))
    for i in idx[np.argsort(-s[idx])]:
        n = int(round(abs(s[i]) * W))
        bar = ' ' * (W - n) + '<' * n + '|' if s[i] < 0 else ' ' * W + '|' + '#' * n
        print('  %s  %+.2f' % (bar, s[i]))
print('OVERALL mean silhouette = %+.3f' % s.mean())`,
        precomputedOutput: `K = 3   bar length = s;  # is positive, < points the WRONG way
cluster 0  n=7  mean s = +0.644
                      |###############  +0.76
                      |###############  +0.74
                      |###############  +0.73
                      |##############  +0.70
                      |#############  +0.65
                      |#############  +0.64
                      |######  +0.29
cluster 1  n=7  mean s = +0.711
                      |###############  +0.77
                      |###############  +0.74
                      |##############  +0.72
                      |##############  +0.72
                      |##############  +0.70
                      |#############  +0.67
                      |#############  +0.64
cluster 2  n=7  mean s = +0.728
                      |################  +0.81
                      |################  +0.81
                      |###############  +0.76
                      |###############  +0.75
                      |##############  +0.68
                      |#############  +0.66
                      |#############  +0.63
OVERALL mean silhouette = +0.694`,
        caption:
          'The silhouette plot, in ASCII. K=3 (shown): three even blocks, every bar positive, overall +0.694. K=2 merges two blobs and the merged block collapses to a mean of +0.462 with bars down at +0.13, overall +0.516, and one point in the surviving cluster flips to -0.12. K=4 splits a real blob into a 2-point splinter (mean +0.094) and a 5-point remnant (+0.283), overall +0.509, with two bars pointing the wrong way at -0.16 and -0.09. Change K on line 3 and run it.',
      },
    },
    {
      type: 'note',
      md: `That is the plot the previous section asked for, and the three runs say three different things.

- **K = 3** is the truth: three blocks of 7, all bars positive, cluster means +0.644 / +0.711 / +0.728, overall **+0.694**.
- **K = 2** merges two blobs. Overall drops to **+0.516** — but look *where* it drops: the merged block averages +0.462 and its worst bars sag to +0.13, because those points now sit far from half their own cluster.
- **K = 4** splits a genuine blob. Overall **+0.509**, and now bars point the **wrong way**: −0.16 and −0.09. Those points are closer on average to the other half of their original blob than to the sub-cluster they were assigned to.
- The tell for over-clustering is the **shape of the block**, not the average: a block of 2 with mean +0.094 is not a cluster, it is a split.
- Compare to inertia on the same data: it would fall at every one of K = 2, 3, 4 and name none of them. Silhouette gives a maximum at 3 *and* a reason.`,
    },
    {
      type: 'intuition',
      title: 'Two more internal metrics: Davies-Bouldin and Calinski-Harabasz',
      md: `Silhouette is O(n²) in distances, which hurts on big data. These two are cheaper and use centroids instead of all pairs.

- **Davies-Bouldin index**: for each cluster, find its *most similar* neighbour — the one with the worst ratio of (spread of the two) to (distance between them). Average that worst case over all clusters.
- So DB is measuring the single most confusable pairing per cluster. High DB = fat clusters sitting close together.
- **LOWER is better.** DB = 0 is perfect. This is the direction people get backwards constantly, because every other metric in this module points the other way.
- **Calinski-Harabasz** (variance ratio criterion): between-cluster dispersion divided by within-cluster dispersion, scaled by (n − k)/(k − 1). **Higher is better.**
- Mnemonic that survives interview pressure: *silhouette high, CH high, DB low.* One of these is not like the others.`,
    },
    {
      type: 'math',
      intro: 'Both in closed form. s_i is the average spread of cluster i around its own centroid.',
      latex: [
        'DB = \\frac{1}{k} \\sum_{i=1}^{k} \\max_{j \\neq i} \\; \\frac{s_i + s_j}{d(\\mu_i, \\mu_j)} \\qquad \\text{lower is better}',
        'CH = \\frac{\\mathrm{tr}(B_k)}{\\mathrm{tr}(W_k)} \\cdot \\frac{n - k}{k - 1} \\qquad \\text{higher is better}',
      ],
    },
    {
      type: 'intuition',
      title: 'External metrics: when you do have labels',
      md: `Sometimes labels exist — a benchmark, a hand-labelled sample, an old rules engine you are trying to replace. Now you can ask a sharper question: does my clustering *agree* with the truth?

- The trick that makes this work is to stop comparing labels and start comparing **pairs of points**.
- For every pair, both groupings answer one yes/no question: are these two in the same group?
- Agreement means both said "together", or both said "apart". Disagreement is the other two cases.
- The **Rand index** is simply the fraction of pairs where they agree. Range 0 to 1.
- Pairs are the whole point: they are immune to what the groups are *called*. Renaming cluster 0 to cluster 7 changes no pair.
- But raw Rand has a flaw that makes it unusable, and fixing it gives you ARI.`,
    },
    {
      type: 'note',
      md: `The flaw: **random labelings score embarrassingly well on the raw Rand index.** With many clusters, most pairs of points are "apart" under both groupings — and the Rand index counts every one of those as an agreement, for free. I measured it: 500 points, 4 true classes, and a *purely random* 4-way labeling scored a mean Rand index of **0.624**. Nearly two thirds "correct" from noise. Report 0.72 and it sounds decent; it is barely above chance. The **adjusted Rand index (ARI)** subtracts the expected Rand index under random labeling and rescales so that perfect agreement is 1. On those same random labelings, mean ARI came out at **0.0001**. That is the fix working: chance now scores zero, so any positive number means something real. ARI ranges **−1 to +1** — below zero means you agree *less* than random chance, which usually signals a systematically inverted grouping rather than mere noise. Range aside, this is the only reason ARI is quotable and Rand is not.`,
    },
    {
      type: 'math',
      intro: 'Rand, then the adjustment. The adjustment is the whole metric.',
      latex: [
        'RI = \\frac{a + b}{\\binom{n}{2}} \\qquad a = \\text{pairs together in both}, \\quad b = \\text{pairs apart in both}',
        'ARI = \\frac{RI - \\mathbb{E}[RI]}{\\max(RI) - \\mathbb{E}[RI]} \\;\\in\\; [-1, +1], \\qquad \\mathbb{E}[ARI] = 0 \\text{ under random labeling}',
      ],
    },
    {
      type: 'intuition',
      title: 'NMI: how much does the cluster tell you about the label?',
      md: `A different question, borrowed from information theory. If I tell you a point's cluster id, how much of your uncertainty about its true label disappears?

- That quantity is **mutual information** I(U; V). Zero if cluster and label are independent; maximal if one determines the other.
- Raw MI is unbounded and grows with the number of clusters, so it is normalized by the entropies into **NMI**, which lands in **0 to 1**.
- NMI = 1 means the clustering and the labels are the same partition (under any renaming). NMI = 0 means knowing the cluster tells you nothing.
- The catch nobody mentions: **NMI is not adjusted for chance by default.** Like the raw Rand index, it drifts upward as k grows, so it quietly rewards you for splitting more.
- The fix has a name: **AMI (adjusted mutual information)** — same chance correction ARI applies. Compare clusterings with *different k*? Use AMI or ARI, never plain NMI.`,
    },
    {
      type: 'intuition',
      title: 'Why you can never use accuracy on cluster ids',
      md: `Cluster ids are arbitrary tags. The algorithm assigned them by whichever centroid happened to be initialized first. They carry no meaning at all.

- A clustering can be **perfect** and score **zero accuracy**, purely because the numbers do not line up.
- I ran exactly that: nine points, truth [0,0,0,1,1,1,2,2,2], a clustering that groups them identically but tags them [2,2,2,0,0,0,1,1,1].
- \`accuracy_score\` = **0.000**. ARI = **1.000**. NMI = **1.000**. The clustering is flawless; accuracy calls it a total failure.
- To use accuracy you would first have to *match* cluster ids to labels optimally — build the k×k contingency matrix and solve the assignment problem with the **Hungarian algorithm** (\`scipy.optimize.linear_sum_assignment\`), then compute accuracy on the remapped ids. That is what "clustering accuracy" means in papers.
- It is extra machinery to reach a worse metric. ARI and NMI are permutation-invariant by construction — that is precisely why they exist.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'All five metrics, k = 2 to 6, same data — and they do not agree',
      code: `from sklearn.cluster import KMeans
from sklearn.datasets import make_blobs
from sklearn.metrics import (silhouette_score, davies_bouldin_score, calinski_harabasz_score,
                             adjusted_rand_score, normalized_mutual_info_score)

X, y = make_blobs(n_samples=600, centers=4, cluster_std=[0.9, 2.8, 0.9, 2.0], random_state=3)

print(' k   inertia  silh^  DB_v    CH^   ARI^   NMI^')
for k in range(2, 7):
    km = KMeans(k, n_init=10, random_state=0).fit(X)
    lab = km.labels_
    print('%2d %9.0f  %.3f  %.3f  %5.0f  %.3f  %.3f'
          % (k, km.inertia_, silhouette_score(X, lab), davies_bouldin_score(X, lab),
             calinski_harabasz_score(X, lab), adjusted_rand_score(y, lab),
             normalized_mutual_info_score(y, lab)))

# ---- real output ----
#  k   inertia  silh^  DB_v    CH^   ARI^   NMI^
#  2     11390  0.599  0.589   1524  0.432  0.565
#  3      5257  0.614  0.509   1996  0.629  0.737
#  4      3228  0.600  0.647   2289  0.816  0.825
#  5      2559  0.600  0.675   2201  0.769  0.782
#  6      2086  0.560  0.795   2183  0.705  0.736`,
      annotations: {
        6: 'Four true blobs, but deliberately uneven spread (0.9 to 2.8). Real clusters are never all the same width — and that is what makes the metrics disagree below.',
        10: 'n_init=10 runs the whole algorithm 10 times and keeps the lowest-inertia result. Without it, one bad init (the corner run in the visual) silently poisons a row.',
        13: 'Inertia: 11390 -> 5257 -> 3228 -> 2559 -> 2086. Monotonically down, no minimum, no winner. Exactly why it cannot pick k.',
        20: 'k=3 wins BOTH internal metrics: highest silhouette (0.614) and lowest DB (0.509). If you had no labels, you would ship k=3.',
        21: 'k=4 is the truth, and only CH (2289) and the external metrics see it — ARI 0.816, NMI 0.825, both peaking here. The internal metrics were off by one.',
      },
    },
    {
      type: 'note',
      md: `That output is the honest version, so read the disagreement rather than around it. Inertia declines forever and names no k. **Silhouette says 3** (0.614) and **Davies-Bouldin says 3** (0.509, lowest). **Calinski-Harabasz says 4** (2289). **ARI and NMI both say 4** — and they are right, because the data was generated with four centers. The internal metrics lost by one, and the reason is visible in the generator: two blobs have std 0.9 and two have std 2.8 and 2.0. Silhouette penalizes wide clusters, so it prefers merging the two fat overlapping ones into a single tidy group. Nothing is broken here — this is just what internal metrics are: geometric heuristics that assume clusters are round and comparably sized. Three lessons to keep. **Compute several, not one.** **When they disagree, that disagreement is the finding** — it means the structure is ambiguous, and a range of plausible k is a more truthful answer than a false decision. And **the metrics that got it right are the ones that had the labels** — which you will not have.`,
    },
    {
      type: 'intuition',
      title: 'The playbook',
      md: `Four rules, in the order you apply them.

- **Choosing k**: internal metrics only, because that is all you have. Silhouette leads, DB and CH corroborate, inertia contributes an elbow shortlist and nothing more.
- **External metrics (ARI, NMI, AMI)**: only on labelled benchmarks — validating that your pipeline works, comparing algorithms in a paper, checking against a hand-labelled sample. Never as a production metric, because in production the labels do not exist. If they did, you would be training a classifier.
- **Report a range, not a point.** "Silhouette favours 3, CH favours 4, both are defensible" is a real finding. A single k quoted to three decimals from a flat curve is false precision.
- **The final word**: the real test of a clustering is whether a **domain expert can name the clusters**. Silhouette 0.61 means nothing to anyone. "Cluster 2 is weekend bulk buyers, cluster 3 is churning trial users" means everything — it survives contact with the business, it drives a decision, and no geometric score can produce it. Every metric here is a filter to shortlist candidates for that conversation, not a substitute for it.`,
    },
    {
      type: 'intuition',
      title: 'One note on anomaly detection',
      md: `Anomaly detection is unsupervised too, and its evaluation has the same missing-denominator problem in a sharper form.

- The model outputs a score per point. You flag the top k as anomalies and hand them to a human.
- **Precision@k** — of the k you flagged, how many were genuinely anomalous — is computable, because someone reviews exactly those k and tells you.
- **Recall is not computable.** Recall needs the total number of true anomalies in the data, including every one you never flagged and nobody ever looked at. That number is unknown by definition.
- So the operational metric is precision@k at the k your review team can actually process per day, tracked over time.
- If you ever see a full recall or PR-AUC on an unlabelled anomaly system, someone had labels — ask where they came from, because that changes what the number means.`,
    },
  ],
  quiz: [
    {
      question: 'Why can inertia (within-cluster sum of squares) never be used to select k by simply minimizing it?',
      options: [
        { text: 'Inertia is not differentiable, so it cannot be optimized', explanation: 'It is perfectly computable and is exactly what K-Means minimizes at fixed k. Differentiability is not the issue.' },
        {
          text: 'It decreases monotonically with k and reaches 0 when every point is its own cluster',
          explanation: 'Correct. Minimizing it has the trivial answer k = n, which is a list of points, not a clustering. Hence the elbow heuristic instead of the minimum.',
        },
        { text: 'Inertia is only defined for k = 2', explanation: 'It is defined for any k — it is just the summed squared distance from each point to its own centroid.' },
        { text: 'It requires ground-truth labels', explanation: 'Backwards: inertia is a purely internal metric and needs no labels at all. That is its one virtue.' },
      ],
      correct: 1,
    },
    {
      question: 'A point has a = 4.0 (mean distance to its own cluster) and b = 3.0 (mean distance to the nearest other cluster). What is its silhouette, and what does it mean?',
      options: [
        { text: 's = +0.25 — the point is well placed', explanation: 'Sign error. b − a = −1.0 here, so s must be negative.' },
        { text: 's = 0 — the point is exactly on the boundary', explanation: 's = 0 requires a = b. Here a is strictly larger, so the point is past the boundary and into the wrong side.' },
        {
          text: 's = −0.25 — the point is closer to another cluster than to its own, so it is probably misassigned',
          explanation: 'Correct. s = (3 − 4)/max(4, 3) = −0.25. Negative silhouette is the signal that this point belongs elsewhere — something inertia can never tell you.',
        },
        { text: 's = −1.0 — the point is maximally misassigned', explanation: 'The max in the denominator is 4, not 1, so the score is −1/4. s = −1 would require b to be essentially 0.' },
      ],
      correct: 2,
    },
    {
      question: 'Two clusterings both score a mean silhouette of 0.55. What does the silhouette PLOT give you that the mean does not?',
      options: [
        {
          text: 'Per-cluster quality — one clustering may be uniformly decent while the other hides a cluster with negative silhouette behind good ones',
          explanation: 'Correct. Averaging lets a healthy cluster pay for a broken one. The by-hand example: cluster B averaged −0.39 while the overall mean was a respectable-looking +0.368.',
        },
        { text: 'The exact value of k that is optimal', explanation: 'The plot shows quality per cluster at a given k. Choosing k still means comparing plots or scores across several k values.' },
        { text: 'Statistical significance of the difference', explanation: 'The plot is descriptive, not inferential — it reports no p-value or confidence interval.' },
        { text: 'The training time of each clustering', explanation: 'Nothing about runtime appears in a silhouette plot.' },
      ],
      correct: 0,
    },
    {
      question: 'Your clustering scores Davies-Bouldin = 0.51 and a colleague reports 1.34 on the same data. Whose clustering looks better on that metric?',
      options: [
        { text: 'The colleague — DB is a similarity score, higher is better', explanation: 'This is the classic reversal. DB measures how similar each cluster is to its most confusable neighbour, so a bigger value is worse.' },
        {
          text: 'Yours — DB is LOWER is better, with 0 as the ideal',
          explanation: 'Correct. DB averages (spread_i + spread_j)/distance(centroids) over each cluster’s worst neighbour. Tighter and farther apart drives it down. Remember: silhouette high, CH high, DB low.',
        },
        { text: 'Neither — DB values are not comparable across runs on the same data', explanation: 'On the same dataset and distance metric, DB values are directly comparable. That is exactly what it is for.' },
        { text: 'Cannot say without the ground-truth labels', explanation: 'DB is an internal metric — it uses only the data and the assignments, never labels.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is the adjusted Rand index preferred over the raw Rand index?',
      options: [
        { text: 'Raw Rand is undefined when the number of clusters differs from the number of classes', explanation: 'Raw Rand is perfectly well defined for mismatched counts — it works on pairs, not on label alignment.' },
        { text: 'ARI is much faster to compute on large datasets', explanation: 'Both are computed from the same contingency table at essentially the same cost. Speed is not the reason.' },
        {
          text: 'Raw Rand scores high by chance (a random 4-way labeling averaged 0.624), while ARI subtracts the chance level so random scores ~0',
          explanation: 'Correct. Most pairs are "apart" under both groupings and raw Rand counts each as free agreement. ARI on the same random labelings averaged 0.0001, making a positive score meaningful.',
        },
        { text: 'ARI works without labels while raw Rand needs them', explanation: 'Both are external metrics and both require ground-truth labels. Neither can run on an unlabelled production dataset.' },
      ],
      correct: 2,
    },
    {
      question: 'A clustering perfectly reproduces the true grouping, but the cluster ids are permuted relative to the label ids. What do accuracy and ARI report?',
      options: [
        { text: 'Both report 1.0 — the grouping is identical', explanation: 'ARI does, accuracy does not. Accuracy compares ids elementwise and a permutation destroys that alignment.' },
        {
          text: 'Accuracy can be 0.0 while ARI is 1.0, because ARI compares pairs and is invariant to renaming',
          explanation: 'Correct — measured exactly: truth [0,0,0,1,1,1,2,2,2] vs clusters [2,2,2,0,0,0,1,1,1] gives accuracy 0.000 and ARI 1.000. To use accuracy you would first match ids with the Hungarian algorithm.',
        },
        { text: 'Both report 0.0 — a permutation is a genuine error', explanation: 'A permutation is not an error at all. Cluster ids are arbitrary tags assigned by initialization order; only the partition carries meaning.' },
        { text: 'Accuracy reports 1.0 and ARI reports 0.0', explanation: 'Reversed. It is accuracy that is fooled by renaming; ARI is constructed to be immune to it.' },
      ],
      correct: 1,
    },
    {
      question: 'You want to compare clusterings with different numbers of clusters (k = 3 vs k = 8) against known labels. Which metric is the wrong tool?',
      options: [
        { text: 'ARI, because it is chance-adjusted', explanation: 'Chance adjustment is exactly what makes ARI valid across different k. It is a correct choice here.' },
        { text: 'AMI, because it adjusts mutual information for chance', explanation: 'AMI is the adjusted variant built for precisely this comparison. It is a correct choice.' },
        {
          text: 'Plain NMI, because it is not chance-adjusted by default and drifts upward as k grows',
          explanation: 'Correct. NMI quietly rewards splitting, so k = 8 gets an unearned advantage over k = 3. Use AMI (or ARI) whenever k varies between the things you are comparing.',
        },
        { text: 'All three are equally invalid across different k', explanation: 'Only NMI has the chance-drift problem. ARI and AMI were designed to remove exactly that bias.' },
      ],
      correct: 2,
    },
    {
      question: 'An anomaly-detection system scores transactions and flags the top 200 daily. Why is recall not reported?',
      options: [
        { text: 'Recall is only defined for balanced datasets', explanation: 'Recall is defined at any class ratio — imbalance makes it more important, not undefined.' },
        { text: 'Recall is always 1.0 for anomaly detectors', explanation: 'Nothing guarantees an unsupervised scorer ranks every anomaly into the top k — it is usually far from it.' },
        { text: 'Anomaly scores are continuous, so no confusion matrix exists', explanation: 'Thresholding at the top k produces a perfectly ordinary confusion matrix — the FN cell is simply unobservable.' },
        {
          text: 'Recall needs the total count of true anomalies including the ones never flagged and never reviewed — an unknowable number',
          explanation: 'Correct. Only the flagged 200 get human review, so TP and FP are observable but FN is not. Precision@k at the review team’s capacity is the operational metric.',
        },
      ],
      correct: 3,
    },
  ],
  interviewQuestions: [
    {
      question: 'How do you evaluate a clustering when you have no labels at all?',
      answer:
        'Say the split out loud first: internal metrics (geometry only) versus external metrics (need labels), and with no labels only internal ones exist. Then be specific. Silhouette per point, s = (b − a)/max(a, b), read as a plot per cluster rather than as one average, because a broken cluster hides inside a decent mean. Davies-Bouldin (lower better) and Calinski-Harabasz (higher better) as cheaper corroboration, since silhouette costs O(n²) in distances. Inertia only for the elbow shortlist and for detecting bad initializations — never as a selection criterion. Then the sentence that separates seniors: none of these validate the clustering, they only shortlist candidates. The real validation is stability (do the clusters survive resampling and reseeding?) and whether a domain expert can name each cluster and act on it.',
      isCaseBased: false,
    },
    {
      question: 'Define silhouette from scratch and walk through the three regimes of its range.',
      answer:
        'For point i: a(i) is the mean distance to the other points in its own cluster (cohesion), b(i) is the mean distance to the points of the nearest other cluster (separation), and s(i) = (b − a)/max(a, b), which bounds it to [−1, +1]. Near +1 means b >> a — snug at home, alternatives far away. Near 0 means a ≈ b — the point sits on the boundary and the assignment is arbitrary. Negative means a > b — the point is on average closer to a different cluster than its own, so it is probably misassigned. Two things to add unprompted: the mean over all points is the usual summary but is the weakest reading of it, and silhouette is the metric that penalizes poor separation, which is exactly the axis inertia is blind to.',
      isCaseBased: false,
    },
    {
      question: 'Why does the elbow method exist, and why do people distrust it?',
      answer:
        'It exists because inertia decreases monotonically in k and hits exactly zero at k = n, so "pick the k that minimizes inertia" is guaranteed to return the degenerate answer of one point per cluster. Since the minimum is useless, you look at the shape instead: the k after which additional clusters stop buying meaningful reduction. People distrust it because that bend is a judgement call. Clean synthetic blobs give a sharp corner; real data usually gives a smooth arc where two competent engineers read 3 and 5 off the same plot, and there is no principled tie-breaker. How I use it: elbow to produce a shortlist of two or three candidate k, then silhouette/DB/CH to score them, then a domain check on which one produces nameable groups. The elbow narrows the search; it does not decide.',
      isCaseBased: false,
    },
    {
      question: 'What is ARI, and why is the "adjusted" part the whole metric?',
      answer:
        'The Rand index counts, over all pairs of points, the fraction where two groupings agree on "same group or not" — pair-based so it is immune to cluster renaming. The problem is that with several clusters most pairs are "apart" under both groupings, and Rand counts every one of those as a free agreement. Empirically: 500 points, 4 true classes, a purely random 4-way labeling averages a Rand index of about 0.62. So a reported 0.72 is barely above noise, and the metric is not interpretable. ARI subtracts the expected Rand index under a random labeling and rescales so perfect agreement is 1 — those same random labelings then average ~0.0001. Range −1 to +1, with negative meaning worse-than-chance, which typically indicates a systematically inverted grouping. Business relevance: an unadjusted score lets someone ship a clustering that is statistically indistinguishable from noise while reporting a healthy-looking number.',
      isCaseBased: false,
    },
    {
      question: 'Case: a data scientist reports "our customer segmentation is 89% accurate" against a hand-labelled sample of 500 customers. What do you ask?',
      answer:
        'First: how were cluster ids mapped to segment labels? Accuracy on raw cluster ids is meaningless — a perfect clustering with permuted ids scores 0.0 while ARI scores 1.0, and conversely, if they matched ids by picking the best assignment they must say whether that matching was fit on the same 500 rows they scored, because optimizing the mapping on the evaluation set inflates the number. The right answer is the Hungarian algorithm on a contingency matrix, with the matching fixed on a held-out split. Second: report ARI or AMI instead, since both are permutation-invariant by construction and chance-adjusted. Third, the strategic question: if you have labels good enough to grade against, why is this unsupervised at all? Usually the honest answer is that the 500 labels are a small validation sample and full labelling does not scale — fine, but then quote a confidence interval, because 500 rows over 6 segments is thin. Business cost of getting this wrong: a segmentation that drives marketing spend is being justified by a metric that does not measure what it claims.',
      isCaseBased: true,
    },
    {
      question: 'Case: you cluster users for a marketing campaign. Silhouette peaks at k = 3, Calinski-Harabasz peaks at k = 4, and the elbow is ambiguous. What do you ship?',
      answer:
        'Do not break the tie with a metric — the disagreement is itself the finding, and it means the geometric structure is genuinely ambiguous. This happens systematically when clusters have unequal spread: silhouette penalizes wide clusters and prefers merging two fat overlapping ones, so it tends to under-count. I saw exactly this on data generated with 4 centers and uneven std: silhouette and DB both chose 3, CH and the label-aware metrics both chose 4. So: (1) check stability — recluster on bootstrap resamples and different seeds, and see whether the fourth cluster reappears or dissolves; an unstable cluster is not real. (2) Look at the silhouette plot per cluster at both k, because if the extra cluster at k = 4 is thin with low or negative silhouette it is a split, not a segment. (3) Take both candidates to the marketing team and ask which they can name and target differently. The decisive business argument: if segments 3 and 4 would receive the same campaign, k = 4 costs work and buys nothing, so ship k = 3. If they would be targeted differently and the split is stable, k = 4 pays for itself. The metric shortlists; the intervention decides.',
      isCaseBased: true,
    },
    {
      question: 'Case: your anomaly detector reports 92% precision in production. Your manager asks what fraction of fraud you are catching. What do you say?',
      answer:
        'That the number they want — recall — is not measurable with the current setup, and explain why rather than estimating it. Precision@k is observable because analysts review exactly the flagged k and return verdicts, giving TP and FP. Recall needs total true anomalies, which includes every fraud that scored below the cutoff and that nobody ever looked at, so the FN cell is structurally unobservable. Then offer the ways to buy an estimate, with costs. (1) Random-sample audit: review a random sample of unflagged transactions to estimate the missed rate — expensive and statistically painful at low prevalence, since finding a 0.1% event needs a large sample. (2) Delayed ground truth: chargebacks and customer disputes surface some misses weeks later, giving a lagged, partial recall — the usual practical answer in payments. (3) Injected known cases: seed labelled synthetic fraud and measure how much gets flagged, which gives detection rate on that specific distribution only. (4) Track proxies now: score distributions, flag volume, and precision@k over time will show decay even without recall. The business framing is the point — "92% precision" tells you review time is not being wasted; it says nothing about exposure, and those are two different risks.',
      isCaseBased: true,
    },
    {
      question: 'When would you deliberately choose Davies-Bouldin or Calinski-Harabasz over silhouette?',
      answer:
        'Mainly cost and shape. Silhouette needs pairwise distances, so it is O(n²) in time and memory — at a million points you either subsample (and inherit sampling noise in the estimate) or switch metrics. DB and CH are centroid-based and effectively linear in n, so they scale. CH additionally has an explicit (n − k)/(k − 1) penalty for adding clusters, which makes it better behaved when comparing across many k. The caveats to volunteer: all three assume convex, roughly spherical, comparably sized clusters, so all three mislead on DBSCAN output with elongated or nested shapes — density-based clustering wants DBCV or a stability argument instead. And CH tends to favour more clusters while silhouette tends to favour fewer, so a CH-versus-silhouette disagreement is expected behaviour, not a bug. I would compute all three cheaply and treat their agreement as the actual signal.',
      isCaseBased: false,
    },
    {
      question: 'Explain the difference between internal and external clustering metrics, and when each is legitimate to report.',
      answer:
        'Internal metrics — inertia, silhouette, Davies-Bouldin, Calinski-Harabasz — score the geometry using only the data and the assignments. They need no labels, so they are the only option on real unlabelled problems, and they are what you use to choose k. Their weakness is that they encode an assumption about cluster shape (compact, convex, similar size) and will confidently prefer a clustering that matches that assumption over one that matches reality. External metrics — ARI, AMI, NMI, purity, V-measure — compare your partition against known labels. They are legitimate on benchmarks, on hand-labelled validation samples, and when comparing algorithms in a controlled study. They are not production metrics, because in production the labels do not exist — and if they did, the correct move is usually a classifier, not a clustering. The failure mode to name: tuning k on a labelled benchmark and assuming that k transfers to unlabelled production data with a different distribution.',
      isCaseBased: false,
    },
    {
      question: 'What would you check about a clustering that no metric in this module measures?',
      answer:
        'Three things, and they are what actually decide whether it ships. Stability: rerun with different seeds, different initializations, and bootstrap resamples — if cluster membership churns, the structure is not real regardless of silhouette. Actionability: do the clusters correspond to different decisions? Two segments that receive the same treatment are one segment, no matter how well separated they are geometrically. Interpretability: can a domain expert look at each cluster’s feature profile and name it — "weekend bulk buyers", "churning trial users"? That is the real test, because a clustering exists to change what someone does, and no geometric score can establish that. The failure mode I would call out: an excellent silhouette on a clustering that is really splitting on one dominant unscaled feature, which is a measurement artifact wearing a good score.',
      isCaseBased: false,
    },
    {
      question: 'Two K-Means runs on the same data with the same k return different inertia. What happened, and does the lower one win?',
      answer:
        'Different initializations landed in different local minima. K-Means is guaranteed to decrease inertia every iteration and to converge, but only to a local optimum — the objective is non-convex in the assignments. In the stepper visual, the same k = 3 on the same points converges to about 62,000 from a well-spread start and about 336,000 from a corner start, five times worse, and the bad run reports convergence just as confidently. So yes, at fixed k the lower inertia is the better solution to the stated objective, and that is exactly what n_init does — run it multiple times and keep the best. k-means++ initialization reduces how often it happens. But two cautions: lower inertia only wins at the SAME k, since it is not comparable across k, and "solves the objective better" is not the same as "clusters the data better" — inertia measures compactness only. Confirm with silhouette, which also sees separation.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Internal vs external clustering metrics', back: 'Internal = geometry only, no labels (inertia, silhouette, DB, CH) — use these to pick k. External = compare to known labels (ARI, NMI, AMI) — benchmarks only, never production.' },
    { front: 'Inertia (WCSS) — and why it cannot pick k', back: 'Sum of squared distances from each point to its own centroid; what K-Means minimizes. Falls monotonically with k and hits 0 at k = n. Hence the elbow, and the elbow is a judgement call.' },
    { front: 'Silhouette formula', back: 'a = mean distance to own cluster, b = mean distance to nearest other cluster. s = (b − a)/max(a, b), range [−1, +1].' },
    { front: 'Reading a silhouette score', back: '+1 = comfortably in its own cluster. 0 = on the boundary, assignment is a coin flip. Negative = closer to another cluster, probably misassigned.' },
    { front: 'Silhouette plot beats the mean', back: 'Per-cluster bars expose a bad cluster that a good one hides in the average. Worked example: cluster B averaged −0.39 while the overall mean was +0.368.' },
    { front: 'Davies-Bouldin direction', back: 'Average over clusters of (spread_i + spread_j)/distance(centroids) for the most similar neighbour j. LOWER is better, 0 ideal. Silhouette high, CH high, DB low.' },
    { front: 'Calinski-Harabasz', back: 'Between-cluster dispersion / within-cluster dispersion, scaled by (n−k)/(k−1). Higher is better. Centroid-based so it scales where silhouette (O(n²)) does not.' },
    { front: 'ARI and why "adjusted" matters', back: 'Fraction of point PAIRS grouped consistently, chance-corrected. Random 4-way labeling: raw Rand ≈ 0.624 (flattering), ARI ≈ 0.0001. Range −1..+1.' },
    { front: 'NMI vs AMI', back: 'NMI = how much the cluster id tells you about the true label, 0..1 — NOT chance-adjusted by default, so it drifts up with k. Use AMI (or ARI) when comparing different k.' },
    { front: 'Never accuracy on cluster ids', back: 'Ids are arbitrary tags. Perfect clustering with permuted ids: accuracy 0.000, ARI 1.000. Needs Hungarian matching (scipy linear_sum_assignment) first — so just use ARI.' },
  ],
  mindmapMarkdown: `- Unsupervised Metrics: Inertia, Silhouette & Agreement Scores
  - The core difficulty
    - no labels → accuracy is not computable
    - internal = geometry, external = needs labels
  - Inertia / WCSS
    - what K-Means minimizes
    - falls monotonically, zero at k = n
    - cannot choose k → elbow, and elbow is ambiguous
    - two runs differ → local minima (use n_init)
  - Silhouette
    - a = own cluster, b = nearest other cluster
    - s = (b − a)/max(a,b), range −1..+1
    - +1 snug, 0 boundary, −1 wrong cluster
    - sees separation, not just compactness
    - PLOT per cluster beats the mean
  - Davies-Bouldin — LOWER is better
  - Calinski-Harabasz — between/within, higher better
  - External metrics
    - ARI: fraction of PAIRS grouped consistently
    - adjusted → random ~0 (raw Rand ≈ 0.62 flatters)
    - NMI 0..1, not chance-adjusted → AMI is
    - never accuracy on ids (acc 0.00 vs ARI 1.00) — needs Hungarian matching
  - Playbook
    - internal to choose k
    - external only on labelled benchmarks
    - metrics disagree → report a range
    - check stability across seeds
    - real test: a domain expert can name them
  - Anomaly detection
    - precision@k on the flagged set
    - recall not computable without labels`,
}

export default m
