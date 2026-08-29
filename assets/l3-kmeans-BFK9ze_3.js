var e={id:`ml-l3-kmeans`,subjectId:`ml`,level:3,title:`K-Means Clustering`,whyItMatters:`The first method here with no answer column to learn from. It is two lines of arithmetic repeated until nothing moves — and it has a failure mode that is guaranteed rather than unlucky, which is worth seeing before you trust it.`,assumes:[`You know how to compute a distance between two points, and an average`,`You have seen a Python list and a for loop`],estMinutes:24,sections:[{type:`intuition`,title:`What K-Means is`,md:`Every method before this was **supervised** — you supplied the right answers and the model learned to reproduce them. **Clustering** is unsupervised: there is no answer column, and the job is to find groups that were already there.

**K-Means** does it with two steps repeated until nothing changes:

1. **Assign** — put each point with the nearest **centroid** (a group's centre).
2. **Update** — move each centroid to the average position of its points.

You must supply **K**, the number of groups, before it runs.`},{type:`math`,intro:`What the two steps are minimising. Inertia is the total squared distance from each point to its own centroid — a single number for how tight the grouping is. Each step can only lower it or leave it unchanged, which is why the algorithm always stops.`,latex:[`\\text{inertia} \\;=\\; \\sum_{i=1}^{n} \\lVert x_i - c_{a(i)} \\rVert^{2} \\qquad a(i) = \\text{the cluster point } i \\text{ belongs to}`]},{type:`code`,lang:`python`,title:`One assignment step, by hand`,code:`points = [(1, 1), (2, 1), (1, 2), (8, 8), (9, 8), (8, 9)]

def sq_dist(p, q):
    return (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2

c0 = (1, 1)
c1 = (2, 1)

labels = []
for p in points:
    d0 = sq_dist(p, c0)
    d1 = sq_dist(p, c1)
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
# labels: [0, 1, 0, 1, 1, 1]`,annotations:{3:`Squared distance, with no square root. Comparing squares gives the same ordering as comparing distances and avoids the cost — every K-Means implementation does this.`,7:`A deliberately bad start: both centroids sit in the same corner, right on top of the left-hand group.`,16:`The three far points all get label 1, and so does (2, 1) — which is a left-hand point stuck with the right-hand group because c1 happens to sit on it. The next round fixes that.`}},{type:`code`,lang:`python`,title:`The update step, and three rounds of both`,code:`def assign(points, centroids):
    labels = []
    for p in points:
        best = 0
        for j in range(len(centroids)):
            if sq_dist(p, centroids[j]) < sq_dist(p, centroids[best]):
                best = j
        labels.append(best)
    return labels

def update(points, labels, k):
    out = []
    for j in range(k):
        group = [points[i] for i in range(len(points)) if labels[i] == j]
        out.append((round(sum(p[0] for p in group) / len(group), 3),
                    round(sum(p[1] for p in group) / len(group), 3)))
    return out

def inertia(points, labels, centroids):
    return round(sum(sq_dist(points[i], centroids[labels[i]]) for i in range(len(points))), 3)

c = [(1, 1), (2, 1)]
for r in (1, 2, 3):
    lab = assign(points, c)
    c = update(points, lab, 2)
    print('round', r, lab, c, 'inertia', inertia(points, lab, c))

# ---- real output ----
# round 1 [0, 1, 0, 1, 1, 1] [(1.0, 1.5), (6.75, 6.5)] inertia 72.25
# round 2 [0, 0, 0, 1, 1, 1] [(1.333, 1.333), (8.333, 8.333)] inertia 2.667
# round 3 [0, 0, 0, 1, 1, 1] [(1.333, 1.333), (8.333, 8.333)] inertia 2.667`,annotations:{14:`A list comprehension collecting the points that belong to cluster j, then averaging their x and y separately. That average IS the new centroid.`,27:`Round 1 to round 2: the stranded point (2, 1) rejoins the left group, and inertia collapses 72.25 → 2.667.`,28:`Round 3 is identical to round 2. Nothing moved, so the algorithm has converged and would keep printing this forever.`}},{type:`visual`,component:`KMeansStepper`,props:{}},{type:`note`,label:`Initialisation decides the answer`,md:`Step through the panel with K = 3 from a **good spread** start, then reset to a **clustered** start and step again. The same points, the same algorithm, and a different final answer.

The blunt fix is to run it many times from different random starts and keep the run with the lowest inertia — scikit-learn's \`n_init\` does exactly this. The better fix is **k-means++**, which spreads the initial centroids on purpose by choosing each new one with probability proportional to its squared distance from the nearest existing centroid.

Initialisation is not a detail here. It selects which answer you get.`},{type:`intuition`,title:`Where K-Means is guaranteed to be wrong`,md:`Not "might be". Sixteen points in two long horizontal rows — two conveyor belts, one at height 0 and one at height 2.

The obvious grouping is by row. K-Means will prefer to cut them left and right instead, and it is not making a mistake: by its own objective, the left/right split really is better.

The reason is that inertia rewards **round, equal-sized, similarly-spread** clusters. Two long thin rows are none of those.`},{type:`code`,lang:`python`,title:`Scoring the two groupings, and running it from three starts`,code:`bars = []
for x in range(8):
    bars.append((x, 0))
    bars.append((x, 2))

by_row  = [0, 1] * 8
by_side = [0] * 8 + [1] * 8
print('by row ', inertia(bars, by_row, update(bars, by_row, 2)))
print('by side', inertia(bars, by_side, update(bars, by_side, 2)))

for start in ([(0, 0), (0, 2)], [(0, 0), (7, 2)], [(3, 0), (4, 2)]):
    c = start
    for step in range(20):
        lab = assign(bars, c)
        c = update(bars, lab, 2)
    print(start, lab, inertia(bars, lab, c))

# ---- real output ----
# by row  84.0
# by side 36.0
# [(0, 0), (0, 2)] [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1] 84.0
# [(0, 0), (7, 2)] [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1] 36.0
# [(3, 0), (4, 2)] [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1] 36.0`,annotations:{6:`[0, 1] * 8 repeats the pattern to label alternating points — which, given how bars was built, is exactly the by-row grouping.`,18:`The true grouping scores 84.0 and the wrong one scores 36.0. K-Means is not failing to find the answer; it has been asked for the lowest inertia and the wrong answer has lower inertia.`,20:`Only the start whose two centroids sit in the same column recovers the rows, and it does so with the WORSE score — so multiple restarts would discard it in favour of the left/right split.`}},{type:`note`,label:`Choosing K`,md:`K is not learned, which is awkward, because the number of groups is often the thing you wanted to find out.

- **Elbow method** — plot inertia against K and look for the bend. Inertia always falls as K rises (at K = n it reaches 0), so the bend, not the minimum, is the signal. It is often not obvious.
- **Silhouette score** — for each point, compare its distance to its own cluster against the nearest other cluster. Ranges −1 to 1, and it has an actual maximum, so it is less subjective.
- **Domain knowledge** — usually the best answer. If marketing needs three segments, K is three.`},{type:`note`,label:`The classic mistake`,md:`K-Means is distance-based, so an unscaled column dominates it exactly as it dominates k-NN.

Six visitors described by (hours on site, rupees spent): hours span single digits, rupees span tens of thousands. Squared, the hours contribute nothing at all, and the "clusters" are just bands of spending with the behavioural signal discarded.

Standardise every column first, unless the columns are already in the same unit.`}],quiz:[{question:`What are the two steps of K-Means?`,options:[{text:`Assign each point to the nearest centroid; move each centroid to the mean of its points`,explanation:`Correct, repeated until nothing changes.`},{text:`Split the data in half, then recurse`,explanation:`That describes a divisive hierarchical method.`},{text:`Fit a line, then measure residuals`,explanation:`That is regression, and it needs labels.`},{text:`Count neighbours, then chain core points`,explanation:`That is DBSCAN.`}],correct:0},{question:`Inertia went 72.25 → 2.667 → 2.667. What does the repeat mean?`,options:[{text:`The algorithm is stuck in a loop and should be restarted`,explanation:`An unchanging assignment is exactly the stopping condition, not a fault.`},{text:`It has converged — no point changed cluster, so nothing can move again`,explanation:`Correct. Both steps can only lower inertia or leave it, so once it stops falling the algorithm is done.`},{text:`K was chosen too small`,explanation:`Convergence says nothing about whether K is right.`},{text:`The centroids have collapsed onto each other`,explanation:`They are at (1.333, 1.333) and (8.333, 8.333) — well separated.`}],correct:1},{question:`On the two rows, the correct grouping scored inertia 84.0 and the left/right split scored 36.0. What does that show?`,options:[{text:`A bug in the inertia calculation`,explanation:`Both numbers are correct for their groupings.`},{text:`K-Means is not failing to find the answer — its objective genuinely prefers the wrong one`,explanation:`Correct. Inertia rewards round, equal, similarly-spread clusters, and two long thin rows are none of those. No number of restarts fixes this.`},{text:`The data needs scaling`,explanation:`Both coordinates are already on comparable scales here.`},{text:`K should have been 4`,explanation:`The truth is two groups; the problem is the shape, not the count.`}],correct:1},{question:`Why would running K-Means from many random starts NOT fix the two-rows case?`,options:[{text:`Because restarts keep the lowest inertia, which is the wrong answer here at 36.0`,explanation:`Correct. The only start that recovered the rows scored 84.0 and would be discarded.`},{text:`Because K-Means is deterministic`,explanation:`It is not — the start decides the outcome, which is why restarts exist at all.`},{text:`Because 20 iterations is too few`,explanation:`All three runs had converged well before 20.`},{text:`Because the points are integers`,explanation:`Coordinate type is irrelevant.`}],correct:0},{question:`Why does the code compare squared distances rather than distances?`,options:[{text:`Squaring gives the same ordering and avoids computing a square root`,explanation:`Correct. Only the comparison matters in the assignment step, and sqrt is monotonic.`},{text:`Because inertia is defined on squared distances only`,explanation:`True of inertia, but the assignment step could use either — it uses squares for speed.`},{text:`To keep the numbers positive`,explanation:`Distances are already non-negative.`},{text:`It changes which centroid wins, favouring closer points`,explanation:`It changes nothing about which wins — that is the point.`}],correct:0},{question:`Which is the soundest way to choose K?`,options:[{text:`Take the K with the lowest inertia`,explanation:`Inertia always falls with K and reaches 0 at K = n, so this always picks the largest K you tried.`},{text:`Domain knowledge where it exists, otherwise silhouette, with the elbow as a rough guide`,explanation:`Correct. Silhouette has a genuine maximum; the elbow is a bend rather than an optimum and is often unclear.`},{text:`Always use K = 3`,explanation:`No default is right across datasets.`},{text:`Increase K until every cluster is pure`,explanation:`There are no labels to be pure with respect to.`}],correct:1}],interviewQuestions:[{question:`Explain K-Means and why it always terminates.`,answer:`Pick K centroids, assign each point to the nearest, move each centroid to the mean of its points, repeat. It terminates because both steps can only lower inertia or leave it unchanged — reassigning a point to a nearer centroid cannot increase its squared distance, and the mean is provably the point minimising total squared distance to a group. Since there are finitely many possible assignments and inertia never rises, it must stop. On six points it went 72.25 → 2.667 → 2.667, converged in two rounds.`,isCaseBased:!1},{question:`Your K-Means gives different answers on different runs. Is that a bug?`,answer:`No — the initialisation decides which local optimum it reaches, and the objective has many. The standard mitigation is many random restarts keeping the lowest inertia, which is what n_init does, plus k-means++ initialisation, which spreads the starting centroids by choosing each with probability proportional to its squared distance from the nearest existing one. But I would be careful about calling the lowest-inertia run "right": on data with elongated clusters the lowest inertia is the wrong grouping.`,isCaseBased:!0},{question:`What shape of cluster does K-Means assume, and what breaks it?`,answer:`Roughly spherical, similar in size, and similar in spread — that is what minimising within-cluster squared distance rewards. It breaks on elongated clusters, on clusters of very different sizes where a big one gets split and a small one absorbed, on different densities, and on anything non-convex like concentric rings. The two-rows demonstration is the clean version: the true grouping scores 84.0 and the wrong one 36.0, so the algorithm prefers the wrong answer by its own measure. DBSCAN or a Gaussian mixture handles those cases.`,isCaseBased:!0},{question:`How do you choose K in practice?`,answer:`If the business already knows — three market segments, five shift patterns — that is the answer and no method beats it. Otherwise silhouette score, because it has a genuine maximum rather than requiring you to eyeball a bend. The elbow method is worth plotting but is often ambiguous, and it cannot be optimised directly since inertia falls monotonically to zero at K = n. Gap statistic is more principled but slower. I would also sanity-check the resulting clusters for interpretability — a mathematically optimal K that produces segments nobody can name is not useful.`,isCaseBased:!1},{question:`Does K-Means need feature scaling?`,answer:`Yes, as much as k-NN does, and for the same reason: the objective is squared distance, so a column with a larger range dominates it. With hours on site in single digits and rupees spent in tens of thousands, the squared contribution of hours is effectively zero and the "clusters" are just spending bands. Standardise unless the columns share a unit and their relative scale is meaningful.`,isCaseBased:!1},{question:`How does K-Means scale, and what do you do when it does not?`,answer:`Each iteration is O(n·K·d), which is linear in rows and usually fine, but it needs many passes over the whole dataset. MiniBatchKMeans samples a batch per iteration and is dramatically faster with a small quality cost, which is the standard answer for millions of rows. For very high dimensions I would reduce first with PCA, both for speed and because distances concentrate. And k-means++ initialisation itself costs K passes, which matters when K is large.`,isCaseBased:!1},{question:`You cluster customers and get one cluster with 95% of them. What is happening?`,answer:`Usually one of three things. Unscaled features, where a single wide column has flattened everything else. Outliers pulling centroids away, since a squared-distance objective is very sensitive to extremes — a handful of extreme customers can each capture their own cluster and leave everyone else in one bucket. Or genuinely one dominant group with a few small ones, in which case K-Means is the wrong tool because it wants similar-sized clusters. I would check scaling first, then plot the feature distributions before touching K.`,isCaseBased:!0},{question:`Why is the mean the right update, rather than the median?`,answer:`Because the objective is squared distance, and the mean is exactly the point minimising the sum of squared distances to a set of points — so the update step is solving that sub-problem optimally, which is what guarantees inertia cannot rise. If you switched the objective to absolute distance, the median would become the correct update, and that variant is K-Medians. It is more robust to outliers, precisely because it is no longer minimising a squared quantity.`,isCaseBased:!1}],flashcards:[{front:`K-Means, in one sentence`,back:`Assign each point to the nearest centroid, move each centroid to the mean of its points, repeat until nothing changes.`},{front:`Inertia`,back:`Total squared distance from each point to its own centroid. Both steps can only lower it, which is why the algorithm always terminates.`},{front:`The six-point run`,back:`Inertia 72.25 → 2.667 → 2.667. Round 3 identical to round 2 means converged.`},{front:`Why squared distances?`,back:`Same ordering as distance, no square root to compute. Every implementation does this.`},{front:`The guaranteed failure`,back:`Two long rows: the correct grouping scores 84.0, the left/right split scores 36.0. K-Means prefers the wrong answer by its own objective — restarts cannot help.`},{front:`What shape does it assume?`,back:`Round, equal-sized, similarly-spread clusters. Elongated, unequal, different-density or non-convex shapes all break it.`},{front:`Initialisation`,back:`Decides which local optimum you land in. Fix with many restarts keeping lowest inertia (n_init) and k-means++ spreading of the starts.`},{front:`Choosing K`,back:`Domain knowledge first. Then silhouette, which has a real maximum. Elbow is a bend, not an optimum, and inertia falls to 0 at K = n.`}],mindmapMarkdown:`- K-Means
  - Two steps
    - assign to nearest centroid
    - update centroid to the mean
    - repeat until nothing changes
  - Inertia
    - sum of squared distance to own centroid
    - both steps can only lower it -> always terminates
    - six points: 72.25 -> 2.667 -> 2.667
  - Initialisation decides the answer
    - many restarts, keep lowest inertia (n_init)
    - k-means++ spreads the starts
  - The guaranteed failure
    - two rows of 8 points
    - by row: 84.0, by side: 36.0
    - the WRONG answer has lower inertia
    - restarts make it worse, not better
    - assumes round, equal, similar spread
  - Choosing K
    - domain knowledge first
    - silhouette (has a real maximum)
    - elbow (a bend; inertia -> 0 at K = n)
  - Trap
    - distance-based, so scale the columns first`};export{e as default};