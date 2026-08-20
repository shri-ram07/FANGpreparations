import type { Module } from '../types'

const m: Module = {
  id: 'ml-l3-dimensionality-anomaly',
  subjectId: 'ml',
  level: 3,
  title: 'PCA, t-SNE & Anomaly Detection',
  whyItMatters:
    '"PCA assumptions" is a named FAANG interview theme, and most candidates fail it — they can recite "maximize variance" but cannot say when that is a lie. This module gives you the mechanism, the four gotchas with a live counterexample where PCA keeps 99.66% of the variance and destroys the model, the honest limits of a t-SNE picture, and Isolation Forest: the one algorithm that finds outliers by refusing to model the normal data at all.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'Why throw columns away on purpose',
      md: `You have 4,000 features. Deleting information sounds insane. Five reasons it is not.

- **Storage and speed.** Half the columns, half the RAM, and most algorithms scale badly in feature count (kernel SVM, k-NN distance loops, anything inverting a matrix).
- **The curse of dimensionality.** In high dimensions every point is far from every other point, and "nearest neighbour" stops meaning anything. Distance-based models rot.
- **Visualization.** Humans see 2-D. To eyeball whether classes are separable at all, you must get to 2-D.
- **Noise removal.** Directions with almost no variance are usually measurement jitter. Dropping them can raise test accuracy.
- **Decorrelation.** Many models hate correlated features (unstable regression coefficients, redundant splits). The output of PCA is uncorrelated by construction.`,
    },
    {
      type: 'note',
      md: `The curse, concretely. Sample 1,000 random points in a unit cube. In 2-D the nearest neighbour of a point is roughly 0.03 away and the farthest is 1.2 — a 40x gap, so "near" is meaningful. Run the same measurement in 500-D and the farthest of those 1,000 points is only about **17%** farther than the nearest (~11% at 1,000-D — the L2 module measures exactly this). A 40x spread has collapsed to a 1.17x one: near and far stop being different questions, and k-NN is choosing between neighbours that are all equally useless. Related fact: to keep the same density you would need exponentially more data per added dimension. This is why the L2 module warned you about k-NN in wide data.`,
    },
    {
      type: 'intuition',
      title: 'PCA: find the long axis of the cloud',
      md: `Photograph a chair. Straight from the front it is a blob. Rotate to a three-quarter angle and you see legs, back, seat — same object, one *good* viewing direction. PCA finds that direction, mathematically.

- Plot your data as a cloud of points. It is almost never a round ball — it is stretched, like a cigar or a pancake.
- **PC1** = the single direction along which the data varies MOST. The long axis of the cigar.
- **PC2** = the direction with the next most variance, forced to be *orthogonal* (perpendicular) to PC1. Then PC3 orthogonal to both, and so on.
- With d features you get d components, ranked by how much variance each captures.
- **Reduction = keep the top k, project every point onto them, discard the rest.** Each row now has k numbers instead of d.
- PCA is a rotation of the axes, not a selection of columns. You are re-describing the same cloud from a better angle.`,
    },
    {
      type: 'math',
      intro:
        'The mechanism in one line: PCA is the eigen-decomposition of the covariance matrix. This is the payoff for the eigen-intuition in Math L0 "Matrices as Transformations" — eigenvectors are the directions a matrix leaves alone, and here the matrix is your data covariance.',
      latex: [
        'C = \\frac{1}{n-1} X^{\\top} X \\quad (X \\text{ centred}), \\qquad C v_k = \\lambda_k v_k',
        '\\text{PC}_k = v_k \\ (\\text{unit vector}), \\qquad \\text{explained variance ratio}_k = \\frac{\\lambda_k}{\\sum_{j} \\lambda_j}',
        'X = U \\Sigma V^{\\top} \\; \\Rightarrow \\; \\text{columns of } V \\text{ are those same } v_k, \\quad \\lambda_k = \\frac{\\sigma_k^2}{n-1}',
      ],
    },
    {
      type: 'note',
      md: `Read the eigen line as English: the eigenvector of the covariance matrix with the biggest eigenvalue IS the direction of maximum variance, and its eigenvalue IS that variance. Nothing more mystical is happening. In practice libraries never build C — they run **SVD** on the centred data directly, because it is numerically safer (squaring X to form XᵀX squares the condition number too) and works when d is huge.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'PCA on five points: rotate, project, discard',
        notice:
          'Left column = the five data points. Right column = what PCA has decided to keep. Watch two numbers per point become one — and watch what falls on the floor in the last frame.',
        leftLabel: 'points (x, y)',
        rightLabel: 'what PCA keeps',
        frames: [
          {
            note: 'Frame 1. Five 2-D points. They are not scattered randomly — they lie almost along one diagonal. That "almost" is the entire opportunity: two columns are storing what is nearly one number.',
            stack: [
              { name: 'p1', value: '(2.0, 2.2)' },
              { name: 'p2', value: '(4.0, 3.8)' },
              { name: 'p3', value: '(6.0, 6.3)' },
              { name: 'p4', value: '(8.0, 7.7)' },
              { name: 'p5', value: '(10.0, 10.1)' },
            ],
            heap: [{ id: 'store', value: '2 numbers per row', label: 'nothing chosen yet' }],
          },
          {
            note: 'Frame 2. Centre the cloud, then find the direction of maximum variance: PC1 = (0.711, 0.703), essentially the 45-degree diagonal. PC2 is not chosen freely — it is forced perpendicular to PC1, and gets whatever variance is left.',
            stack: [
              { name: 'p1', value: 'projects onto', to: 'pc1' },
              { name: 'p2', value: 'projects onto', to: 'pc1' },
              { name: 'p3', value: 'projects onto', to: 'pc1' },
              { name: 'p4', value: 'projects onto', to: 'pc1' },
              { name: 'p5', value: 'projects onto', to: 'pc1' },
            ],
            heap: [
              { id: 'pc1', value: 'PC1 = (0.711, 0.703)', label: '99.83% of variance' },
              { id: 'pc2', value: 'PC2 = (-0.703, 0.711)', label: '0.17% — orthogonal' },
            ],
          },
          {
            note: 'Frame 3. Project: drop each point perpendicularly onto the PC1 line and keep only how far along it landed. Two numbers collapse to one. Explained variance ratio of the kept component: 0.9983 — we removed half the columns and lost 0.17% of the variance.',
            stack: [
              { name: 'p1', value: 't = -5.53', to: 'pc1' },
              { name: 'p2', value: 't = -2.98', to: 'pc1' },
              { name: 'p3', value: 't = +0.20', to: 'pc1' },
              { name: 'p4', value: 't = +2.60', to: 'pc1' },
              { name: 'p5', value: 't = +5.71', to: 'pc1' },
            ],
            heap: [
              { id: 'pc1', value: '1 number per row', label: 'kept: 99.83%' },
              { id: 'pc2', value: 'PC2 coordinates', label: 'discarded', freed: true },
            ],
          },
          {
            note: 'Frame 4. What exactly did we lose? The PC2 residuals — the tiny wobble off the line. Rebuild p1 from PC1 alone and you get (2.07, 2.13), not (2.0, 2.2). Now the interview question: is that wobble measurement noise, or is it the only thing that tells your two classes apart? PCA cannot tell you. It never saw your labels.',
            stack: [
              { name: 'p1 residual', value: '+0.09', danger: true },
              { name: 'p2 residual', value: '-0.17', danger: true },
              { name: 'p3 residual', value: '+0.20', danger: true },
              { name: 'p4 residual', value: '-0.21', danger: true },
              { name: 'p5 residual', value: '+0.09', danger: true },
            ],
            heap: [
              { id: 'rec', value: 'p1 rebuilt = (2.07, 2.13)', label: 'truth was (2.0, 2.2)' },
              { id: 'gone', value: 'residuals thrown away', label: 'noise? or signal?', freed: true },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'How many components? Scree plot and the 95% rule',
      md: `Each component comes with an **explained variance ratio**: its share of the total variance. They sum to 1 and always decrease.

- **Scree plot** = plot those ratios in order. It usually falls off a cliff then flattens. The flat part is the "scree" — rubble at the base of the mountain.
- Rule of thumb 1: **keep enough components to reach 95% cumulative variance** (90% and 99% are used too — say which you picked and why).
- Rule of thumb 2: keep components up to the **elbow**, where the curve stops dropping steeply.
- For plotting, you take 2 or 3 no matter what the variance says — and you report how little variance those 2 actually captured, honestly.
- In scikit-learn you can pass the target directly: n_components=0.95 asks for "however many I need for 95%".`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'PCA on the wine dataset — and what happens if you skip the scaler',
      code: `import numpy as np
from sklearn.datasets import load_wine
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA

X, y = load_wine(return_X_y=True)          # 178 rows, 13 chemical features
Xs = StandardScaler().fit_transform(X)     # PCA is scale-sensitive: standardize FIRST

evr = PCA().fit(Xs).explained_variance_ratio_
print('top 5 explained variance:', evr[:5].round(3))
print('cumulative              :', np.cumsum(evr)[:5].round(3))
print('components for 95%%     : %d' % PCA(n_components=0.95).fit(Xs).n_components_)

raw = PCA().fit(X)                         # same data, NOT standardized
print('unscaled PC1 share      :', raw.explained_variance_ratio_[0].round(4))
print('it just copied          :', load_wine().feature_names[np.argmax(abs(raw.components_[0]))])

# ---- real output ----
# top 5 explained variance: [0.362 0.192 0.111 0.071 0.066]
# cumulative              : [0.362 0.554 0.665 0.736 0.802]
# components for 95%     : 10
# unscaled PC1 share      : 0.9981
# it just copied          : proline`,
      annotations: {
        7: 'The single most important line. Skip it and PCA answers a different question than you asked — see the last two prints.',
        9: 'One array, 13 numbers, summing to 1. This is the scree plot as data.',
        12: '13 features -> 10 components for 95%. Honest result: this dataset is NOT very compressible. PCA is not always a win, and reporting "10 of 13" is a better answer than pretending you found 2.',
        14: 'Same rows, same code, no scaler. Watch what PC1 becomes.',
        16: 'PC1 captures 99.81% of the variance and is essentially just the proline column — proline is measured in the hundreds, every other feature is order 1. Variance in raw units is a unit-of-measurement contest, not a discovery.',
      },
    },
    {
      type: 'note',
      md: `That last result is the interview answer to "why standardize before PCA", in one sentence: **PCA maximizes variance, and variance is measured in the units of your columns** — so a salary in rupees (variance ~10⁸) will annihilate an age in years (variance ~100) and PC1 becomes a copy of the salary column. StandardScaler puts every feature at mean 0, variance 1, so components are chosen on *shared structure* rather than on who was measured with the biggest ruler. And always fit the scaler and PCA on the training split only — fitting on all data before splitting leaks test information into your components.`,
    },
    {
      type: 'intuition',
      title: 'PCA assumptions — the question they actually ask',
      md: `"What does PCA assume?" is a named interview theme. Four assumptions, and every one of them can be false on your data.

- **The interesting structure is LINEAR.** PCA can only rotate and project. Data on a spiral or a Swiss roll has its real structure in a curve; no linear projection recovers it. (Kernel PCA or a non-linear method is the fix.)
- **High variance = high information.** Nothing guarantees this. A noisy sensor has huge variance and zero information; a clean binary flag has tiny variance and perfect information.
- **Scale is meaningful.** It is not, unless you made it so. PCA is scale-sensitive, so standardize first — always, unless every feature is already in identical units.
- **You do not need interpretable features.** After PCA, "PC1" is a weighted mix of ALL original features. You can no longer tell a regulator "we declined the loan because of income". Interpretability is gone.
- Plus the big structural one: **PCA is unsupervised.** It never looks at y. It ranks directions by variance, not by usefulness for your task.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The counterexample: PCA keeps 99.66% of the variance and destroys the model',
      code: `import numpy as np
from sklearn.decomposition import PCA
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score

rng = np.random.default_rng(0)
y = np.repeat([0, 1], 200)
noise = rng.normal(0, 10, 400)                 # loud, carries no class info
signal = y + rng.normal(0, 0.3, 400)           # quiet, separates the classes perfectly
X = np.column_stack([noise, signal])

print('both features :', cross_val_score(LogisticRegression(), X, y, cv=5).mean().round(3))
p = PCA(n_components=1).fit(X)
print('PC1 keeps     :', p.explained_variance_ratio_[0].round(4), 'of the variance')
print('after PCA(1)  :', cross_val_score(LogisticRegression(), p.transform(X), y, cv=5).mean().round(3))

# ---- real output ----
# both features : 0.955
# PC1 keeps     : 0.9966 of the variance
# after PCA(1)  : 0.532`,
      annotations: {
        8: 'Standard deviation 10. Pure noise, identical for both classes. This column will win the variance contest by a mile.',
        9: 'Standard deviation 0.3 around the class label. This column alone separates the classes almost perfectly.',
        14: 'PCA reports 99.66% variance retained — a number that would sail through any review. It is retaining the noise.',
        15: '0.955 accuracy becomes 0.532, i.e. coin flip. The discarded low-variance direction WAS the signal. Say this example out loud in the interview; it beats any definition.',
      },
    },
    {
      type: 'note',
      md: `The fix when labels exist: **LDA (Linear Discriminant Analysis)** projects to maximize class *separation* rather than variance — supervised by design, and it would have kept the signal direction here. Alternatives worth naming: supervised feature selection (mutual information, L1 regularization from the L1 module), or simply letting a tree ensemble pick features itself. PCA is not a feature-selection method; it is a decorrelating compressor.`,
    },
    {
      type: 'note',
      md: `**Use PCA when:** features are many and heavily correlated; a distance-based or O(d³) model is choking on width; you need a 2-D picture; the noise directions are genuinely noise (image pixels, sensor arrays, spectra). **Skip PCA when:** you need interpretable coefficients; features are few or already independent; the model is a tree ensemble (trees are scale-invariant and handle irrelevant columns, and PCA's oblique combinations actively hurt axis-aligned splits); the structure is non-linear; or the signal you care about is rare and quiet. Default reflex: try the model without PCA first, and make PCA prove it earns its place.`,
    },
    {
      type: 'intuition',
      title: 't-SNE and UMAP: pictures, not features',
      md: `PCA asks "which straight directions vary most". t-SNE asks a different question: "can I place these points on a page so that **things that were neighbours stay neighbours**?"

- It preserves **local neighbourhoods** — who is near whom — and deliberately does not care about the global map.
- The result is often gorgeous: tight, well-separated blobs where PCA showed mush.
- Price paid: global distances are **distorted on purpose**. The optimization is non-convex and randomly initialized.
- **UMAP** is the modern alternative: much faster, similar quality, and preserves somewhat more global structure. It also has a transform() for new points, which t-SNE genuinely lacks.
- Both are **for visualization only**. That is not a stylistic preference — it is the plan's rule and the interview's expected answer.`,
    },
    {
      type: 'note',
      md: `How to read a t-SNE plot without lying to yourself. **Cluster sizes mean nothing** — t-SNE expands sparse regions and shrinks dense ones, so a fat blob is not a big group. **Distances between clusters mean nothing** — two blobs far apart may be more similar than two blobs touching. **Perplexity changes the picture** (roughly "how many neighbours count"; 5 vs 50 can turn one cluster into four — try several before believing any). **Run-to-run variation is real** — different seeds give different pictures, so no single run is "the" answer. And the hard rule: **never fit a model, cluster, or compute a distance on t-SNE coordinates.** They are a rendering, not features; the axes have no units and no meaning, and there is no honest way to map new data into the same picture.`,
    },
    {
      type: 'intuition',
      title: 'Anomaly detection: a different shape of problem',
      md: `Not "is this transaction class A or class B". It is: **this one does not look like anything I usually see.**

- **Rare.** Anomalies are 0.1% of the data, or 0.001%. Accuracy is meaningless — always-normal scores 99.9%.
- **Unlabeled.** Usually nobody has labeled the fraud, the failing bearing, the intrusion. You cannot train a classifier on labels you do not have.
- **Not a class.** Next month's fraud pattern will not resemble last month's. You are detecting *difference*, not membership. A classifier trained on known fraud misses the new kind by construction.
- Two honest framings: **novelty detection** (train on clean normal data, flag anything unlike it) and **outlier detection** (the training data itself is contaminated; find the odd rows inside it).
- Real uses: card fraud, machine failure from vibration sensors, server metric spikes, data-quality gates in an ML pipeline.`,
    },
    {
      type: 'intuition',
      title: 'Isolation Forest: the elegant inversion',
      md: `Every other method says "build a model of normal, then measure distance from it". Isolation Forest refuses. It goes straight at the anomalies.

- Pick a random feature, pick a random split value, cut. Repeat, building a tree, until every point sits alone in its own leaf.
- Count how many cuts it took to isolate each point — its **path length**.
- A normal point sits inside a dense crowd: you must slice again and again to separate it from its neighbours. **Long path.**
- An anomaly sits out on its own: one or two random cuts and it is already alone. **Short path.**
- Build ~100 such random trees, average each point's path length. **Short average path = anomaly.** That is the whole algorithm.
- Why it is beautiful: no distance metric, no density estimate, no assumption about the shape of "normal", and it is O(n log n) — it even *subsamples* (256 rows per tree by default), because anomalies are easier to spot in small samples.`,
    },
    {
      type: 'math',
      intro:
        'Path length is normalized against the average depth of a random binary search tree, c(n), so scores are comparable across dataset sizes. h(x) is the path length of point x.',
      latex: [
        's(x, n) = 2^{-\\frac{E[h(x)]}{c(n)}}, \\qquad c(n) = 2H(n-1) - \\frac{2(n-1)}{n}',
        's \\to 1 \\ (\\text{short path, anomaly}), \\qquad s \\to 0.5 \\ (\\text{average path, normal})',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Isolation Forest on payment amounts — no labels used',
      code: `import numpy as np
from sklearn.ensemble import IsolationForest

rng = np.random.default_rng(0)
normal = rng.normal(loc=[50, 3.0], scale=[8, 0.4], size=(300, 2))   # 300 ordinary payments
planted = np.array([[250, 3.1], [48, 9.0], [230, 8.5]])             # 3 odd ones we injected
X = np.vstack([normal, planted])

iso = IsolationForest(contamination=0.02, random_state=0).fit(X)    # never sees a label
pred = iso.predict(X)                       # -1 = anomaly, +1 = normal
print('flagged        :', (pred == -1).sum(), 'of', len(X))
print('planted rows   :', pred[-3:])
print('planted scores :', iso.score_samples(X[-3:]).round(3))
print('normal median  :', np.median(iso.score_samples(normal)).round(3))

# ---- real output ----
# flagged        : 7 of 303
# planted rows   : [-1 -1 -1]
# planted scores : [-0.796 -0.795 -0.868]
# normal median  : -0.39`,
      annotations: {
        6: 'Three different kinds of weird: huge amount, weird hour, and both. Only the third is an outlier in each column separately — the middle two need the model to notice one axis at a time.',
        9: 'contamination = your prior on "what fraction is anomalous". It does not change the ranking of scores at all; it only decides where the -1/+1 cutoff falls. 0.02 x 303 = 6.1, and the score threshold lands so that 7 rows fall below it — roughly your quota, whether or not 7 rows are actually weird.',
        11: '7 flagged: our 3 planted ones plus 4 ordinary rows that happened to sit at the edge of the cloud. That is contamination doing exactly what you told it to. Set it too high and you drown analysts in false alarms.',
        13: 'The scores are the real output. All three planted rows sit near -0.8 while the normal median is -0.39 — a clean gap. In production you rank by score and send the top N to a human, rather than trusting a hard cutoff.',
      },
    },
    {
      type: 'note',
      md: `Two alternatives, one line each. **One-Class SVM**: fits a boundary that wraps the normal data (an SVM with only one class) and calls everything outside it an anomaly — good on small, clean, novelty-style data, but it is roughly O(n²)–O(n³), very sensitive to the kernel and nu parameters, and needs scaled features. **LOF (Local Outlier Factor)**: compares a point's local density to the density of its k neighbours, so it catches an outlier that is *locally* odd even while sitting inside the global cloud — the one thing Isolation Forest can miss — at the cost of neighbour searches and a k you must choose. Default reflex: Isolation Forest first (fast, few knobs, robust in higher dimensions); LOF when anomalies are local; One-Class SVM when you have genuinely clean training data and few rows.`,
    },
    {
      type: 'note',
      md: `**Evaluating without labels is the hard part, and interviewers know it.** With no ground truth you cannot compute precision or recall — so do these instead: (1) inject synthetic anomalies you designed and check they rank top; (2) have analysts label a sample of the top-N alerts and report **precision@K**, which is what the business actually feels; (3) measure stability — rerun with different seeds/subsamples and check the same rows keep surfacing; (4) track alert volume drift over time as a canary. And whenever a few hundred labels do exist, evaluate with **PR-AUC**, never ROC-AUC or accuracy: at 0.1% positives, ROC-AUC flatters garbage.`,
    },
    {
      type: 'intuition',
      title: 'Association rules: what gets bought together',
      md: `Different problem entirely: no model, no loss function. Just counting baskets to find rules of the form "customers who bought A also bought B".

- An **itemset** is any group of items appearing in one basket: {nappies}, {nappies, beer}.
- **Support(A)** = fraction of all baskets containing A. "How common is this at all?" It is the popularity filter.
- **Confidence(A ⇒ B)** = of baskets with A, what fraction also have B. "If A, how likely is B?"
- **Lift(A ⇒ B)** = confidence divided by support(B). "How much MORE likely than baseline?"
- **Apriori** is the algorithm that makes this tractable: if {beer} is rare, then {beer, nappies} must be at least as rare — so prune it before ever counting it. That downward-closure trick is the entire idea.`,
    },
    {
      type: 'math',
      intro: 'The three quantities, with N = total number of baskets.',
      latex: [
        '\\text{support}(A) = \\frac{\\#\\{\\text{baskets containing } A\\}}{N}',
        '\\text{confidence}(A \\Rightarrow B) = \\frac{\\text{support}(A \\cup B)}{\\text{support}(A)}',
        '\\text{lift}(A \\Rightarrow B) = \\frac{\\text{confidence}(A \\Rightarrow B)}{\\text{support}(B)} = \\frac{\\text{support}(A \\cup B)}{\\text{support}(A)\\,\\text{support}(B)}',
      ],
    },
    {
      type: 'intuition',
      title: 'The beer-and-nappies arithmetic',
      md: `The famous (and probably apocryphal) retail story: young fathers sent out for nappies come back with beer. Run the numbers on 1,000 baskets — nappies in 200, beer in 300, both in 100.

- support(nappies) = 200/1000 = **0.20**. support(beer) = 300/1000 = **0.30**. support(both) = 100/1000 = **0.10**.
- confidence(nappies ⇒ beer) = 0.10 / 0.20 = **0.50**. Half of nappy buyers also buy beer.
- lift = 0.50 / 0.30 = **1.67**. Buying nappies makes beer 1.67x more likely than for a random shopper.
- **Lift > 1 is the only one of the three that means anything.** It says the two are associated beyond chance. Lift = 1 means independent, lift < 1 means they repel.
- The trap high confidence hides: bread is in 800 baskets, and 160 of the 200 nappy baskets have bread. confidence(nappies ⇒ bread) = 160/200 = **0.80** — sounds fantastic. But lift = 0.80/0.80 = **1.00**. Bread is just always bought. Zero information, and a rule engine ranked by confidence would put it at the top.`,
    },
    {
      type: 'note',
      md: `**The honest status of Apriori.** It was a 1990s breakthrough and it still gets asked, so know support/confidence/lift cold. But almost nobody ships it now: it explodes combinatorially on real catalogues, handles only binary "in the basket / not" data, ignores quantity, price, time, and sequence, and produces thousands of rules that a human must sift. Modern replacements do the same job better — item **embeddings** (item2vec) and collaborative filtering learn "bought together" as geometry rather than as enumerated rules, generalize to items with few co-occurrences, and rank by predicted value rather than raw counts. Correct interview posture: explain lift precisely, then say you would reach for a recommender.`,
    },
  ],
  quiz: [
    {
      question: 'You run PCA on raw (unscaled) features where salary is in rupees and age is in years. What does PC1 most likely become?',
      options: [
        {
          text: 'Essentially a copy of the salary column, because its raw variance dwarfs everything else',
          explanation:
            'Correct. Variance is measured in the units of the column. In the wine demo above, unscaled PC1 captured 99.81% of variance and was just the proline column. Standardize first.',
        },
        { text: 'A balanced blend of both features', explanation: 'Only if their variances were comparable — which unscaled rupees and years are not, by six orders of magnitude.' },
        { text: 'Unaffected — PCA normalizes internally', explanation: 'It does not. PCA centres the data but never scales it; StandardScaler is your job.' },
      ],
      correct: 0,
    },
    {
      question: 'PCA on your data reports that PC1 explains 99% of the variance, yet a classifier trained on PC1 alone performs at chance. What happened?',
      options: [
        { text: 'A bug — 99% variance guarantees the information is preserved', explanation: 'It guarantees nothing about your labels. Variance and class-relevance are different quantities.' },
        {
          text: 'The class signal lived in a low-variance direction that PCA discarded, because PCA never sees y',
          explanation:
            'Correct — exactly the demo above: 0.955 accuracy fell to 0.532 while PCA "kept" 99.66% of variance. LDA or supervised selection is the fix when labels exist.',
        },
        { text: 'Too few components — you should keep more variance', explanation: 'You already kept 99%. Adding a threshold does not solve a problem caused by the ranking criterion itself.' },
      ],
      correct: 1,
    },
    {
      question: 'In a t-SNE plot, two clusters sit far apart on opposite sides of the page. What can you conclude?',
      options: [
        { text: 'They are very dissimilar groups', explanation: 'No. Inter-cluster distances in t-SNE are not meaningful — the objective only preserves local neighbourhoods.' },
        { text: 'One is a subset of the other', explanation: 'Nothing in the layout supports a containment claim.' },
        {
          text: 'Almost nothing — inter-cluster distances in t-SNE are not meaningful',
          explanation:
            'Correct. Cluster sizes and between-cluster distances are both artifacts. What you may read is which points are neighbours of which, and even that changes with perplexity and seed.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Why does Isolation Forest isolate anomalies in FEWER random splits?',
      options: [
        { text: 'Because it splits on the most informative feature first, like a decision tree', explanation: 'It does the opposite: features and split values are chosen at random. That randomness is the point — no criterion, no labels.' },
        {
          text: 'Because anomalies sit alone in sparse regions, so a random cut separates them from everything else almost immediately',
          explanation:
            'Correct. Points in a dense crowd need cut after cut to be separated from neighbours; a lone point falls out fast. Short average path length = anomaly.',
        },
        { text: 'Because it removes them from the data before building trees', explanation: 'Nothing is removed beforehand — that would require knowing the answer already.' },
      ],
      correct: 1,
    },
    {
      question: 'What does the contamination parameter in IsolationForest actually control?',
      options: [
        {
          text: 'Only the threshold on the anomaly score that decides the -1/+1 label — the score ranking is unchanged',
          explanation:
            'Correct. In the demo, contamination=0.02 on 303 rows flagged 7 (3 real, 4 false alarms). Set it wrong and you change alert volume, not detection quality. Rank by score_samples instead when you can.',
        },
        { text: 'How many trees are built', explanation: 'That is n_estimators.' },
        { text: 'The fraction of features sampled per split', explanation: 'That is max_features. Contamination is about the label cutoff.' },
      ],
      correct: 0,
    },
    {
      question: 'A rule "nappies ⇒ bread" has confidence 0.80 and lift 1.00. Ship it?',
      options: [
        { text: 'Yes — 80% confidence is very strong', explanation: 'Confidence alone is a trap: bread appears in 80% of ALL baskets, so 80% among nappy buyers is exactly baseline.' },
        {
          text: 'No — lift 1.00 means independence: bread is just always bought, so the rule carries zero information',
          explanation: 'Correct. Lift is confidence divided by support(B); lift = 1 means knowing about nappies changes nothing about bread.',
        },
        { text: 'Yes, if support is also high', explanation: 'High support on an independent pair just means both items are popular. It adds nothing.' },
      ],
      correct: 1,
    },
    {
      question: 'For which model does applying PCA first typically HURT the most?',
      options: [
        {
          text: 'A gradient-boosted tree ensemble',
          explanation:
            'Correct. Trees are already scale-invariant and cope with irrelevant columns; PCA replaces clean axis-aligned features with oblique mixtures that axis-aligned splits approximate badly — and destroys feature importances.',
        },
        { text: 'k-NN on 2,000 correlated features', explanation: 'This is a classic PCA win: fewer dimensions makes distances meaningful again and the search far cheaper.' },
        { text: 'A kernel SVM on wide, correlated data', explanation: 'Also usually a win — kernel methods scale badly in n and d, and decorrelated inputs help.' },
      ],
      correct: 0,
    },
    {
      question: 'You have an anomaly model in production and no labels at all. Which evaluation is defensible?',
      options: [
        { text: 'Accuracy on the flagged rows', explanation: 'With no labels there is nothing to be accurate against — and at 0.1% anomalies, accuracy is meaningless even with labels.' },
        { text: 'ROC-AUC against the contamination parameter', explanation: 'Contamination is your assumption, not ground truth. Scoring against your own prior measures nothing.' },
        {
          text: 'Have analysts label a sample of the top-N alerts and report precision@K, plus check stability across seeds',
          explanation:
            'Correct. Precision@K is what the business feels, a small labeled sample is affordable, and stability across reruns catches a model that is merely surfacing noise.',
        },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'What assumptions does PCA make, and where does each one break?',
      answer:
        'Four. (1) **Structure is linear** — PCA only rotates and projects, so data on a spiral or manifold keeps its real structure hidden; kernel PCA or UMAP is the escape. (2) **High variance = high information** — false whenever a loud, useless feature exists; a noisy sensor outranks a clean predictive flag. (3) **Scale is meaningful** — false by default, so standardization is mandatory: unscaled, PC1 becomes whichever column was measured with the biggest ruler. (4) **Interpretability is expendable** — every PC is a mix of all original features, which kills any "we declined the loan because of X" explanation and any regulatory story. On top of those: PCA is unsupervised, so it optimizes a criterion (variance) that has no formal connection to your label. Also worth naming: PCA assumes the mean and covariance describe the data usefully, which is a Gaussian-flavoured assumption, and it is sensitive to outliers because they inflate variance in their own direction.',
      isCaseBased: false,
    },
    {
      question: 'Explain how PCA works mechanically, in the order you would draw it on a whiteboard.',
      answer:
        'Centre the data (subtract the column means). Compute the covariance matrix C = XᵀX/(n−1) — entry (i,j) is how features i and j vary together. Take the eigenvectors of C: each is a direction, each has an eigenvalue equal to the variance along it. Sort by eigenvalue descending — that ordering IS PC1, PC2, PC3. Keep the top k eigenvectors as a d×k matrix W, and project: X_reduced = X_centred · W. Explained variance ratio of component k is λ_k / Σλ. In practice libraries skip forming C and run SVD on the centred X directly — the right singular vectors are the same eigenvectors, and it is numerically safer since forming XᵀX squares the condition number. The one-sentence version: PCA is the eigen-decomposition of the covariance matrix, and the eigenvectors are the axes of the data cloud.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague reports that adding PCA lifted cross-validated accuracy from 0.81 to 0.94, but the deployed model scores 0.79. Debug it.',
      answer:
        'First hypothesis, and usually correct: **leakage through the preprocessing fit**. If StandardScaler and PCA were fit on the whole dataset before splitting, every fold\'s "validation" rows contributed to the means, variances, and component directions — the CV score is contaminated while production genuinely sees unseen data. The fix is a Pipeline(StandardScaler, PCA, model) passed to cross_val_score, so both are refit inside each fold. Second hypothesis: n_components was tuned on the same CV that reported the score, so the 0.94 is an optimistic selection artifact — needs a nested CV or a held-out set. Third: distribution shift, where the component directions learned in training no longer describe production data (check by scoring production rows\' reconstruction error against training). The tell that separates them: leakage gives a gap immediately at deploy; drift gives a gap that grows over time.',
      isCaseBased: true,
    },
    {
      question: 'How do you decide the number of components, and what would you tell a stakeholder?',
      answer:
        'Three tools, used together. (1) **Cumulative explained variance** — pick the smallest k reaching a stated threshold, commonly 95%; scikit-learn accepts n_components=0.95 directly. (2) **Scree plot** — plot the ratios and find the elbow where the curve flattens into rubble. (3) **The honest one: treat k as a hyperparameter** and tune it inside cross-validation against the metric you actually care about, since 95% variance is a rule of thumb with no connection to downstream accuracy. To a stakeholder I would say what it cost: "13 features became 10 for 95% of the variance" is a legitimate finding that PCA is *not* buying much here — the wine dataset does exactly that. Reporting a poor compression ratio honestly is better than forcing 2 components because they plot nicely.',
      isCaseBased: false,
    },
    {
      question: 'Why must you standardize before PCA, and is there ever a case where you should not?',
      answer:
        'PCA maximizes variance, and variance carries the units of the column — so a feature in rupees (variance ~10⁸) beats one in years (variance ~10²) purely by measurement choice, and PC1 degenerates into a copy of the largest-unit column. Standardizing to mean 0, variance 1 makes components reflect shared structure rather than unit choice. The exception: when all features are already in the same physical unit and their *relative* magnitudes are genuinely meaningful — grayscale pixel intensities, spectra, or repeated readings of the same sensor. There, scaling each column to unit variance would amplify near-dead pixels into equal citizens and inject noise. Rule: same units and meaningful magnitudes, consider skipping; mixed units, always scale. And fit the scaler on the training split only.',
      isCaseBased: false,
    },
    {
      question: 'Can PCA be used as feature selection? What would you use instead?',
      answer:
        'No, and the distinction matters. Feature selection *keeps a subset of your original columns*; PCA *replaces all of them* with linear combinations, so you cannot drop a data source or explain a decision afterward. It is a decorrelating compressor, not a selector. Alternatives depending on the goal: for supervised dimensionality reduction, **LDA** projects to maximize class separation (at most C−1 dimensions for C classes); for keeping real columns, **L1/Lasso** drives coefficients to exactly zero, mutual information or ANOVA F-tests rank univariate relevance, and permutation importance on a tree ensemble ranks them accounting for interactions. If the requirement is "stop paying for this data feed", only true selection answers it.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague ran t-SNE on customer data, saw six blobs, clustered on the t-SNE coordinates, and is presenting "six customer segments" tomorrow. What do you say?',
      answer:
        'Three problems, in order of severity. (1) **Never cluster on t-SNE coordinates.** The axes have no units and the algorithm distorts distances by design, so any distance-based method (k-means, DBSCAN) is optimizing against an artifact. Cluster in the original or PCA space, then use t-SNE only to *colour and display* those clusters. (2) **The blob count is not stable.** t-SNE is non-convex and randomly initialized, and perplexity strongly controls apparent granularity — perplexity 5 versus 50 can split one group into four. Rerun across seeds and perplexities; only structure that survives is worth presenting. (3) **Cluster sizes and gaps mean nothing**, so any claim like "segment 3 is our biggest and most distinct" is unsupported. What I would ship instead: cluster in the real feature space, validate with silhouette and business sense, check the segments differ on interpretable features, and use the t-SNE plot purely as the picture on the slide.',
      isCaseBased: true,
    },
    {
      question: 'Compare PCA, t-SNE and UMAP — when do you reach for each?',
      answer:
        'PCA: linear, deterministic, fast, invertible, and it has a transform() so new data maps into the same space — the only one of the three you may use as a preprocessing step feeding a model. Choose it for compression, decorrelation, and speed. t-SNE: non-linear, preserves local neighbourhoods, slow (roughly O(n log n) with Barnes-Hut but heavy in practice), stochastic, no meaningful transform for new points — visualization only. UMAP: same neighbourhood-preserving family, substantially faster, retains a bit more global structure, and does offer a transform() — but it is still a stochastic embedding with distorted distances, so treat it as visualization plus, at best, cautious downstream use. Common professional pipeline: PCA down to ~50 dimensions to kill noise and cost, then t-SNE or UMAP on that for the picture.',
      isCaseBased: false,
    },
    {
      question: 'Explain Isolation Forest to a non-ML engineer, and say why the idea is unusual.',
      answer:
        'Imagine cutting a scatter of points with random straight lines until each point sits alone in its own region. A point in the middle of a crowd needs many cuts before it is separated from its neighbours. A point sitting off by itself gets isolated after one or two. Count the cuts, average over a hundred random attempts: few cuts means anomaly. What is unusual is the inversion — every other approach first builds a model of "normal" (a density, a boundary, a cluster centre) and measures distance from it, which is expensive and requires assuming a shape. Isolation Forest targets the anomalies directly and needs no distance metric, no density estimate, and no assumption about normal. It runs in O(n log n), subsamples 256 rows per tree by default (anomalies are easier to isolate in small samples), and handles moderately high dimensions better than density methods.',
      isCaseBased: false,
    },
    {
      question: 'Isolation Forest, LOF, One-Class SVM — how do you choose?',
      answer:
        'Isolation Forest is the default: fast, O(n log n), few hyperparameters, no scaling requirement, degrades gracefully in higher dimensions. LOF wins when anomalies are **local** — a point sitting inside the global cloud but in a locally sparse pocket, which Isolation Forest can miss because global random cuts do not notice local density; the cost is neighbour searches (roughly O(n²) naively) and a k you must pick. One-Class SVM fits a boundary around the normal region and suits genuine **novelty detection** where training data is known-clean and small; it needs scaled features, is very sensitive to nu and gamma, and scales badly beyond a few thousand rows. Also name the boring baselines you would try first: robust z-scores or IQR per feature, and for time series a residual from a forecast. The tradeoff to state out loud: Isolation Forest gives you global outliers cheaply, LOF gives you local outliers expensively.',
      isCaseBased: false,
    },
    {
      question: 'Case: your fraud anomaly model sends 500 alerts a day; analysts say 9 in 10 are useless, but the model "found" the big incident last month. What do you change?',
      answer:
        'Diagnosis first: 10% precision is the contamination parameter set far above the true anomaly rate — the model is obliged to label a fixed fraction as anomalies whether or not that many are weird. Actions, in order. (1) Stop thresholding, start **ranking**: use score_samples and send the top N the team can actually review, so alert volume becomes a capacity decision rather than a modelling accident. (2) Measure **precision@K** on the reviewed alerts — that is the number the analysts feel — and track it weekly. (3) Harvest the analyst verdicts as labels; within a few weeks you have enough to evaluate with PR-AUC and possibly train a supervised model for the known fraud types, keeping the unsupervised detector to catch new ones. (4) Check for a feature that trivially explains the false alarms (a new product line, a batch job at 3am) and either add it as context or exclude the segment. Tradeoff to name explicitly: lowering alert volume raises precision and lowers recall — the business has to state what a missed fraud costs versus an analyst hour.',
      isCaseBased: true,
    },
    {
      question: 'Define support, confidence and lift, and explain why a high-confidence rule can be worthless.',
      answer:
        'Support(A) = fraction of baskets containing A (how common at all). Confidence(A⇒B) = support(A∪B)/support(A) (given A, how often B). Lift(A⇒B) = confidence/support(B) (how much more often than baseline). Confidence alone is misleading because it ignores how popular B already is: if bread appears in 80% of all baskets, then "nappies ⇒ bread" with 80% confidence has lift 1.00 — exactly independence, zero information — yet it would top any list ranked by confidence. Lift > 1 means genuine association, = 1 means independent, < 1 means the items repel. Worked example: 1,000 baskets, nappies 200, beer 300, both 100 → confidence 0.50, lift 0.50/0.30 = 1.67, a real association. Closing note that shows judgment: Apriori is largely legacy — it explodes on big catalogues, ignores quantity, price and time, and modern systems use item embeddings and collaborative filtering instead.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'PCA in one sentence', back: 'Rotate the axes to the directions of maximum variance (eigenvectors of the covariance matrix, ranked by eigenvalue), then keep the top k and project.' },
    { front: 'PC1 vs PC2', back: 'PC1 = direction of maximum variance. PC2 = next most variance, forced orthogonal to PC1. And so on, always orthogonal, always decreasing.' },
    { front: 'Explained variance ratio', back: 'λ_k / Σλ — component k\'s share of total variance. Sums to 1, always decreasing. Scree plot = these in order; common rule is keep 95% cumulative.' },
    { front: 'Why standardize before PCA', back: 'Variance carries the column\'s units, so the biggest-unit feature wins by default. Unscaled wine data: PC1 = 99.81% of variance and it was just the proline column.' },
    { front: 'PCA\'s four assumptions', back: 'Structure is linear; high variance = high information; scale is meaningful; interpretability is expendable. Plus: it is unsupervised — it never sees y.' },
    { front: 'The PCA counterexample', back: 'Loud noise feature + quiet perfectly-separating feature. PCA(1) keeps 99.66% of variance, accuracy falls 0.955 → 0.532. Variance ≠ class signal. Use LDA when labels exist.' },
    { front: 't-SNE: what is NOT meaningful', back: 'Cluster sizes, distances between clusters, and any single run. Perplexity and seed change the picture. Never fit a model or cluster on t-SNE coordinates.' },
    { front: 'UMAP vs t-SNE', back: 'UMAP: faster, keeps a bit more global structure, has transform() for new points. Both are still neighbourhood-preserving visualizations with distorted distances.' },
    { front: 'Isolation Forest', back: 'Random feature, random split, repeat until each point is alone. Anomalies isolate in FEW cuts because they sit alone. Short average path length = anomaly. O(n log n), no density model.' },
    { front: 'Support / confidence / lift', back: 'support(A)=baskets with A ÷ N. confidence(A⇒B)=support(A∪B)/support(A). lift=confidence/support(B). Only lift>1 means real association; lift=1 is independence.' },
  ],
  mindmapMarkdown: `- PCA, t-SNE & Anomaly Detection
  - Why reduce dimensions
    - Storage & speed
    - Curse of dimensionality (distances collapse)
    - Visualization (humans see 2-D)
    - Noise removal
    - Decorrelation
  - PCA: the idea
    - PC1 = max variance direction
    - PC2 orthogonal, next most
    - Project onto top k
    - Eigenvectors of covariance (SVD in practice)
  - Choosing k
    - Explained variance ratio
    - Scree plot & elbow
    - Keep 95% cumulative
    - Or tune k inside CV
  - PCA gotchas
    - Assumes LINEAR structure
    - High variance ≠ high information
    - Scale-sensitive → standardize first
    - Interpretability lost
    - Unsupervised → can discard the class signal
    - Fix with labels: LDA
  - When NOT to use PCA
    - Need explainable features
    - Tree ensembles
    - Non-linear structure
  - t-SNE / UMAP
    - Visualization ONLY
    - Preserve local neighbours
    - Sizes & gaps meaningless
    - Perplexity & seed change picture
    - UMAP: faster, has transform()
  - Anomaly detection
    - Rare, unlabeled, "different" not a class
    - Isolation Forest: few random cuts = outlier
    - contamination = threshold, not quality
    - LOF (local density), One-Class SVM (clean data)
    - Evaluate: precision@K, injected anomalies, stability
  - Association rules
    - Itemsets, Apriori pruning
    - support / confidence / lift
    - Beer & nappies: lift 1.67
    - Lift = 1 → worthless rule
    - Legacy: embeddings & recommenders won`,
}

export default m
