import type { Module } from '../types'

const m: Module = {
  id: 'ml-l2-decision-trees',
  subjectId: 'ml',
  level: 2,
  title: 'Decision Trees: Splits, Entropy & Pruning',
  whyItMatters:
    'The decision tree is the only model you can hand to a regulator and to a five-year-old and have both follow it. It is also the atom of the two algorithms that still win most tabular problems — Random Forest and gradient boosting. Interviewers probe here to see whether you can compute a split by hand, and whether you know why one tree is never enough.',
  estMinutes: 50,
  sections: [
    {
      type: 'intuition',
      title: 'A flowchart nobody wrote by hand',
      md: `Twenty questions. "Is it alive? Does it fly? Bigger than a car?" Each yes/no halves what is left. Twenty questions is enough for almost anything.

- A decision tree is that game, with the questions **learned from data** instead of guessed by a person.
- Each internal node asks one question about one feature: *is petal_length <= 2.45?*
- Yes goes left, no goes right. Repeat until you land on a **leaf**.
- The leaf holds the answer: a class (classification) or a number (regression).
- Predicting is just walking one path, root to leaf. Nothing else happens — no matrix multiply, no distance.
- Training is the hard part: which question, in which order, and when to stop asking.`,
    },
    {
      type: 'intuition',
      title: 'The one model that prints its own receipt',
      md: `Most models give you a prediction and a shrug. A tree gives you the reason, in a sentence.

- Ask a logistic regression why it denied a loan: 30 weights, multiplied and summed. Good luck.
- Ask a tree: *income < 40k AND late_payments >= 2 AND tenure < 1 year → deny*. That is the whole explanation.
- The path is printable and arguable — sklearn's **export_text** dumps it verbatim, no extra tooling.
- Regulated domains need this. US lending law requires giving an applicant a concrete adverse-action reason.
- Debugging value too: a wrong prediction is one traceable path you can read, not a numeric mystery.
- Interpretability is the tree's headline feature — and exactly what ensembles trade away for accuracy.`,
    },
    {
      type: 'intuition',
      title: 'How a split is chosen: brute force with a scorer',
      md: `There is no cleverness in the search. It tries everything and keeps the winner.

- For **every feature**, for **every candidate threshold** (midpoints between sorted unique values), split the rows in two.
- Score each candidate by how much it reduces **impurity** — how mixed the labels are in a node.
- Keep the single best split. Recurse into each child. Stop when a stopping rule fires.
- Cost is roughly O(features × samples × depth) once features are pre-sorted. Cheap enough to be practical.
- The catch: this is **greedy**. It takes the best split available *now*, with zero lookahead.
- So a tree is **locally optimal, never globally optimal**. Finding the truly optimal tree is NP-hard; no library attempts it.`,
    },
    {
      type: 'math',
      intro: 'Two ways to score "how mixed is this node". p_k = fraction of the node\'s rows with class k.',
      latex: [
        'G(S) = 1 - \\sum_{k=1}^{K} p_k^2 \\qquad\\qquad H(S) = - \\sum_{k=1}^{K} p_k \\log_2 p_k',
        '\\text{Gain} \\;=\\; I(\\text{parent}) \\;-\\; \\sum_{c \\,\\in\\, \\text{children}} \\frac{n_c}{n} \\, I(c) \\qquad I \\in \\{G, H\\}',
        '\\text{Regression: } \\; I(S) = \\frac{1}{n_S}\\sum_{i \\in S} \\left(y_i - \\bar{y}_S\\right)^2 \\quad \\text{(variance, i.e. MSE about the leaf mean)}',
        '\\text{Gini} = \\text{P(two random picks disagree)}. \\quad \\text{Entropy} = \\text{bits of surprise}. \\quad \\text{Both } = 0 \\text{ when pure.}',
      ],
    },
    {
      type: 'intuition',
      title: 'Worked example: one split, every number',
      md: `Ten emails. Five spam, five ham. Two candidate questions. Do the arithmetic by hand once and you own this forever.

- **Parent node**: 5 spam, 5 ham → p = (0.5, 0.5). Gini = 1 − 0.5² − 0.5² = **0.500**. Entropy = −2(0.5 × log₂ 0.5) = **1.000 bit**. Maximum mess.
- **Candidate A — "contains a link?"** Yes: 6 rows (5 spam, 1 ham). No: 4 rows (0 spam, 4 ham).
- Left child Gini = 1 − (5/6)² − (1/6)² = 1 − 0.694 − 0.028 = **0.278**. Right child is pure → **0.000**.
- Weighted child impurity = (6/10)(0.278) + (4/10)(0.000) = **0.167**. Gini gain = 0.500 − 0.167 = **0.333**.
- Redo it with entropy: left = −(5/6)log₂(5/6) − (1/6)log₂(1/6) = **0.650 bits**, right = 0. Weighted = 0.6 × 0.650 = 0.390. **Information gain = 1.000 − 0.390 = 0.610 bits**.`,
    },
    {
      type: 'note',
      md: `Now the loser. **Candidate B — "subject in ALL CAPS?"** Yes: 5 rows (3 spam, 2 ham). No: 5 rows (2 spam, 3 ham). Both children have Gini = 1 − 0.6² − 0.4² = **0.480**, so the weighted impurity is 0.480 and the gain is a pathetic 0.500 − 0.480 = **0.020**. Entropy agrees: gain 0.029 bits. So 0.333 versus 0.020 — the link question wins by more than 16×, the tree takes it, and never reconsiders. Note that the "no link" child came out **pure**, so it becomes a leaf immediately; only the impure 6-row child recurses.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One split, step by step',
        notice: 'Left column = the question being tested. Right column = the nodes it produces, with their impurity. The tree keeps whichever question drops the weighted impurity most.',
        leftLabel: 'question tested',
        rightLabel: 'resulting nodes',
        frames: [
          {
            note: 'Start. 10 emails at the root, 5 spam / 5 ham — the most mixed a binary node can be. Gini 0.500, entropy 1.000 bit.',
            stack: [{ name: 'root (no question yet)', to: 'p' }],
            heap: [{ id: 'p', value: '10 rows — 5 spam / 5 ham', label: 'Gini 0.500 · H 1.000 bit' }],
          },
          {
            note: 'Candidate A: "contains a link?" Children are 6 rows (5/1) and 4 rows (0/4). Weighted Gini = 0.6(0.278) + 0.4(0) = 0.167 → gain 0.333.',
            stack: [
              { name: 'has_link = yes', to: 'a1' },
              { name: 'has_link = no', to: 'a2' },
            ],
            heap: [
              { id: 'a1', value: '6 rows — 5 spam / 1 ham', label: 'Gini 0.278' },
              { id: 'a2', value: '4 rows — 0 spam / 4 ham', label: 'Gini 0.000 — pure' },
            ],
          },
          {
            note: 'Candidate B: "subject in ALL CAPS?" Children are 5 rows (3/2) and 5 rows (2/3). Weighted Gini = 0.480 → gain 0.020. Almost no information; both children are still coin flips.',
            stack: [
              { name: 'all_caps = yes', to: 'b1', danger: true },
              { name: 'all_caps = no', to: 'b2', danger: true },
            ],
            heap: [
              { id: 'b1', value: '5 rows — 3 spam / 2 ham', label: 'Gini 0.480' },
              { id: 'b2', value: '5 rows — 2 spam / 3 ham', label: 'Gini 0.480' },
            ],
          },
          {
            note: 'Winner: 0.333 beats 0.020. Keep A. The pure child becomes a leaf right away; only the 6-row impure child recurses, and the whole search runs again inside it.',
            stack: [
              { name: 'chosen: has_link', to: 'a1' },
              { name: 'leaf (done)', to: 'a2' },
            ],
            heap: [
              { id: 'a1', value: '6 rows — recurse here', label: 'search all features again' },
              { id: 'a2', value: 'LEAF → predict ham', label: 'pure, nothing left to gain' },
            ],
          },
        ],
      },
    },
    {
      type: 'note',
      md: `**Gini vs entropy, honestly.** People oversell this. The two criteria pick the *same split* the overwhelming majority of the time — in the example above both ranked A far above B. Entropy needs a logarithm, Gini needs a square, so Gini is a little cheaper; that is why it is sklearn's default. Entropy punishes very impure nodes slightly harder and can give marginally more balanced trees. If someone claims a meaningful accuracy difference, ask for the benchmark. The interview-safe answer: **pick either and go tune max_depth instead** — that knob matters far more than the criterion.`,
    },
    {
      type: 'intuition',
      title: 'Regression trees: same machine, different scorer',
      md: `Swap "how mixed are the labels" for "how spread out are the numbers". Everything else is identical.

- Node impurity becomes **variance** — equivalently MSE around the node's mean y.
- Splits are scored by variance reduction, using the exact same row-weighted formula as Gini.
- A leaf predicts the **mean of the training y values that landed in it**. One constant per leaf.
- So the prediction surface is a **staircase**: flat steps, vertical jumps at the thresholds. No slopes anywhere.
- A tree therefore **cannot extrapolate**. Ask for x far beyond the training range and you get the outermost leaf's mean, forever.
- That is a ready-made answer to "why not use a tree for trending time-series forecasting".`,
    },
    {
      type: 'intuition',
      title: 'Read the playground: why boundaries are always staircases',
      md: `Set the model to tree and drag the depth slider. Watch the *shape*, not the accuracy number.

- Depth 1: a single straight cut, parallel to an axis. That is all one split can ever produce — it tests one feature against one number.
- Every extra level cuts an existing rectangle into two rectangles. The regions are always **axis-aligned boxes**.
- A clean diagonal boundary is therefore impossible. The tree approximates it with a **staircase** of many small steps.
- Push the slider to its maximum, depth 6: train accuracy climbs and the regions shrink into small islands around individual points. Let a real tree grow unlimited and it drives train accuracy to 100% the same way, one island per row.
- Those islands are memorization. This is overfitting you can literally see.
- Rotate the data 45° and the same tree suddenly needs many more splits. Trees are not rotation-invariant; linear models are.`,
    },
    { type: 'visual', component: 'DecisionBoundaryPlayground', props: { model: 'tree' } },
    {
      type: 'intuition',
      title: 'A fully grown tree always overfits',
      md: `Not "can". **Always**, given continuous features and no duplicate rows.

- With no stopping rule, the algorithm keeps splitting until every leaf is **pure**.
- If two rows have different labels, some threshold separates them. The search will find it.
- Endpoint: one leaf per training row. Training accuracy 1.000, training error 0.
- That model memorized the dataset instead of learning the pattern — the textbook definition of overfitting.
- Trees are the classic **low-bias, high-variance** model: flexible enough to fit anything, including the noise.
- So every usable tree is a *constrained* tree. The constraints have names, and they are the next section.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Shallow vs grown vs pruned — the overfit gap, measured',
      code: `from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier, export_text

d = load_breast_cancer()
Xtr, Xte, ytr, yte = train_test_split(
    d.data, d.target, test_size=0.3, random_state=0, stratify=d.target)

models = {
    'depth=2 (pre-pruned)':  DecisionTreeClassifier(max_depth=2, random_state=0),
    'unlimited (grown)':     DecisionTreeClassifier(random_state=0),
    'ccp_alpha=0.01 (post)': DecisionTreeClassifier(ccp_alpha=0.01, random_state=0),
}
for name, mdl in models.items():
    mdl.fit(Xtr, ytr)
    print(f'{name:<22} leaves {mdl.get_n_leaves():>2}  train {mdl.score(Xtr, ytr):.3f}  test {mdl.score(Xte, yte):.3f}')

print(export_text(models['depth=2 (pre-pruned)'], feature_names=list(d.feature_names)))

# depth=2 (pre-pruned)   leaves  4  train 0.942  test 0.906
# unlimited (grown)      leaves 16  train 1.000  test 0.906
# ccp_alpha=0.01 (post)  leaves  5  train 0.972  test 0.918
#
# |--- worst perimeter <= 106.10
# |   |--- worst concave points <= 0.16
# |   |   |--- class: 1
# |   |--- worst concave points >  0.16
# |   |   |--- class: 0
# |--- worst perimeter >  106.10
# |   |--- worst concave points <= 0.14
# |   |   |--- class: 0
# |   |--- worst concave points >  0.14
# |   |   |--- class: 0`,
      annotations: {
        7: 'stratify keeps the class ratio identical in train and test — without it a small test split can drift and make the comparison meaningless.',
        11: 'No max_depth, no min_samples — this grows until every leaf is pure. That is sklearn\'s default, and it is a trap.',
        12: 'ccp_alpha = post-pruning: grow fully, then cut back subtrees that do not pay for their leaves.',
        18: 'The interpretability payoff: four printed lines ARE the entire model. Try that with a neural net.',
        21: 'Train 1.000 with 16 leaves — perfectly memorized, and test 0.906 is no better than the 4-leaf tree. The extra 12 leaves bought exactly nothing.',
        22: 'The pruned tree wins on test (0.918) with 5 leaves. Smaller AND better — pruning is not a sacrifice you make for interpretability.',
      },
    },
    {
      type: 'intuition',
      title: 'Pre-pruning: stop before you memorize',
      md: `Two philosophies exist. Stop early (pre-pruning), or grow then cut back (post-pruning). Pre-pruning first — it is cheaper and it is what you tune day to day.

- **max_depth** — hard cap on question count per path. Blunt, effective, and the first knob to tune. Always.
- **min_samples_split** — refuse to split a node holding fewer than N rows. Stops decisions being made on 3 examples.
- **min_samples_leaf** — refuse any split that would create a leaf smaller than N. This one directly kills one-row leaves, so it attacks overfitting most precisely.
- **max_features** — consider only a random subset of features at each split. Speeds things up and decorrelates trees; this is literally half of what Random Forest does.
- **min_impurity_decrease** — reject splits whose gain is below a floor. Kills the 0.020-gain splits from our example.
- Set them by cross-validation, not by feel. A grid over max_depth × min_samples_leaf covers most of the value.`,
    },
    {
      type: 'math',
      intro: 'Post-pruning: cost-complexity pruning makes the tree pay rent for every leaf.',
      latex: [
        'R_\\alpha(T) \\;=\\; R(T) \\;+\\; \\alpha \\, |\\widetilde{T}|',
        '\\text{where } R(T) = \\text{training error}, \\; |\\widetilde{T}| = \\text{number of leaves}, \\; \\alpha \\ge 0 = \\text{price per leaf}',
        '\\alpha = 0 \\Rightarrow \\text{keep the full tree.} \\qquad \\alpha \\to \\infty \\Rightarrow \\text{prune down to the root.}',
      ],
    },
    {
      type: 'intuition',
      title: 'Post-pruning: grow it, then cut it back',
      md: `Grow the tree fully, then repeatedly delete the subtree with the worst error-reduction-per-leaf, until only the root remains. That produces a sequence of candidate trees, one per α.

- sklearn's **cost_complexity_pruning_path** returns exactly that list of α values — you do not guess them.
- Pick α by cross-validation, then refit with **ccp_alpha=α**. Two lines of code, real gains.
- Why post-pruning can beat pre-pruning: a mediocre split sometimes *enables* an excellent one just below it.
- Pre-pruning stops at the mediocre split and never discovers the good one. This is the **horizon effect**.
- Post-pruning sees the whole tree before deciding, so it can keep that pair and cut elsewhere.
- Price: you grow the full tree first. On huge data, pre-pruning is the pragmatic choice; on normal tabular data, do both.`,
    },
    {
      type: 'note',
      md: `**Feature importance, and why to distrust it.** sklearn's **feature_importances_** is total impurity reduction per feature, weighted by how many rows reached each node, normalized to sum to 1. Free, fast, and biased: continuous or high-cardinality columns (user_id, timestamp, zip code) offer *far more candidate thresholds*, so they accumulate spurious reductions and can outrank genuinely predictive features. A pure-noise ID column routinely lands in the top five. The honest alternative is **permutation importance** — shuffle one column on held-out data and measure how much the score drops. Slower, model-agnostic, and measured on data the tree never fit. Report that one when the number will influence a decision.`,
    },
    {
      type: 'intuition',
      title: 'No scaling needed — and what about categoricals',
      md: `Trees compare, they never compute distances or dot products. That single fact buys two wins and one annoyance.

- A split asks *is x <= t?* — an **ordinal comparison**. Multiply the column by 1000 and every row still goes the same way. **No scaling required.**
- Same reason: monotone transforms (log, sqrt) change nothing at all, and extreme x values barely matter — they just sit in an extreme leaf.
- Say this when asked "which algorithms need scaling": k-NN, SVM, PCA, k-means and anything gradient-descent-based do; **trees, forests and boosted trees do not**. It is a genuine, checkable advantage.
- Careful: outliers in **y** still hurt a regression tree, because the leaf mean gets dragged. Different axis, different rule.
- Categoricals: sklearn takes numbers only, so one-hot or ordinal-encode. One-hot on a 500-level column produces 500 weak binary splits and a bad, deep tree.
- **LightGBM** and CatBoost support categorical features natively — they group categories by target statistics and split on groups. Better trees, one less preprocessing step.`,
    },
    {
      type: 'intuition',
      title: 'The fatal flaw: instability',
      md: `Add ten rows to a thousand. Retrain. The root split can change — and if the root changes, every node beneath it is rebuilt differently.

- The greedy choice is a hard argmax. Two candidates scoring 0.331 and 0.333 are decided by noise.
- Flip the root and the whole downstream structure is different, even when accuracy is nearly identical.
- That is **variance**, and it is the tree's defining weakness: low bias, high variance.
- The fix is not a smarter tree. The fix is **many trees**: train each on a bootstrap resample, then average the predictions.
- Averaging cancels independent errors while bias stays put. That is **bagging**; the tree-specific version is **Random Forest**.
- Which is why the ensembles module comes next. It exists to solve exactly this paragraph — at the cost of the printable path you learned to love at the top.`,
    },
  ],
  quiz: [
    {
      question: 'A node with Gini 0.500 splits into a left child (6 rows, Gini 0.278) and a right child (4 rows, Gini 0.000). What is the Gini gain?',
      options: [
        {
          text: '0.278 — the impurity of the impure child',
          explanation: 'That is one child\'s impurity, not a gain. Gain always compares the parent against the weighted average of ALL children.',
        },
        {
          text: '0.333 — parent minus the row-weighted child impurity',
          explanation: 'Correct. (6/10)(0.278) + (4/10)(0.000) = 0.167, and 0.500 − 0.167 = 0.333. Weight by row count, always.',
        },
        {
          text: '0.222 — parent minus the plain average of the two children',
          explanation: 'The classic slip. (0.278 + 0)/2 = 0.139 pretends both children are the same size, but the left one holds 6 of 10 rows. The n_c/n weighting is not optional.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Why is decision-tree training called greedy, and what does that cost you?',
      options: [
        {
          text: 'It consumes a lot of memory; the cost is RAM',
          explanation: '"Greedy" describes the search strategy, not resource usage. Trees are actually quite memory-light.',
        },
        {
          text: 'It enumerates all possible trees and keeps the best; the cost is training time',
          explanation: 'The opposite of what happens. Searching all trees is NP-hard — no production library attempts it.',
        },
        {
          text: 'It takes the best split at each node with no lookahead; the cost is that the tree is locally, not globally, optimal',
          explanation: 'Correct. Two splits that are superb together can lose to a single split that merely looks better right now, and the greedy search never sees the pair.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Your unlimited-depth tree scores 1.000 accuracy on the training set. What does that tell you about the model?',
      options: [
        {
          text: 'Almost nothing — an unconstrained tree can always reach 1.000 by making one leaf per row',
          explanation: 'Correct. Perfect training accuracy is the DEFAULT behaviour of an unconstrained tree, not evidence of quality. Only the held-out score carries information.',
        },
        {
          text: 'The tree has found the true underlying pattern',
          explanation: 'It has found *a* function that separates the training rows — most likely by memorizing them. Check the test score before celebrating.',
        },
        {
          text: 'The data must be linearly separable',
          explanation: 'Irrelevant. Trees fit non-linear data perfectly too, by carving it into enough axis-aligned boxes.',
        },
      ],
      correct: 0,
    },
    {
      question: 'Which preprocessing step is genuinely unnecessary before fitting a decision tree?',
      options: [
        {
          text: 'Encoding categorical strings into numbers',
          explanation: 'Still required in scikit-learn — it cannot split on raw strings. LightGBM can, sklearn cannot.',
        },
        {
          text: 'Deciding what to do about missing values',
          explanation: 'Still a modelling decision. sklearn trees historically required imputation, and even with native support, "missing" is information you should handle deliberately.',
        },
        {
          text: 'Standardizing or min-max scaling numeric features',
          explanation: 'Correct. Splits are ordinal comparisons (is x <= t?), so any monotone rescaling moves the thresholds along with the data and yields an identical tree.',
        },
      ],
      correct: 2,
    },
    {
      question: 'What is the practical difference between Gini and entropy as split criteria?',
      options: [
        {
          text: 'Very little — they usually select the same split, and Gini avoids a logarithm so it is slightly cheaper',
          explanation: 'Correct, and this is the answer that sounds senior. Tuning max_depth changes outcomes far more than swapping criteria.',
        },
        {
          text: 'Entropy is for classification, Gini is for regression',
          explanation: 'Neither is for regression — regression trees score splits by variance (MSE) reduction instead.',
        },
        {
          text: 'Gini supports multi-class problems, entropy only handles binary ones',
          explanation: 'Both handle any number of classes; both formulas sum over k = 1..K.',
        },
      ],
      correct: 0,
    },
    {
      question: 'A fraud model built on a decision tree reports transaction_id as its second most important feature. Most likely explanation?',
      options: [
        {
          text: 'Transaction ids genuinely encode fraud risk',
          explanation: 'Occasionally true in a leaky dataset where ids correlate with time — but then it is a leakage bug to fix, not a feature to ship.',
        },
        {
          text: 'Impurity-based importance is biased toward high-cardinality features: an id column offers thousands of thresholds, so it accumulates spurious impurity reduction',
          explanation: 'Correct. Confirm it with permutation importance on held-out data — a useless id will score near zero there — then drop the column.',
        },
        {
          text: 'The tree is underfitting',
          explanation: 'Underfitting means too few splits. This is the reverse: plenty of splits, all meaningless.',
        },
      ],
      correct: 1,
    },
    {
      question: 'A regression tree is trained on x in [0, 100]. You ask it to predict at x = 500. What comes back?',
      options: [
        {
          text: 'A value extrapolated along the training trend',
          explanation: 'Trees never extrapolate. There is no slope anywhere in the model — only constants stored in leaves.',
        },
        {
          text: 'An error, because x is out of range',
          explanation: 'No error. x = 500 simply takes the ">" branch at every relevant node and lands in a leaf.',
        },
        {
          text: 'The mean of the training rows in the outermost leaf — the same constant for every x beyond the training range',
          explanation: 'Correct. Predictions are leaf means, so the staircase goes permanently flat outside the observed range. This is why trees are weak on trending time series.',
        },
      ],
      correct: 2,
    },
    {
      question: 'You add 10 rows to a 1,000-row dataset, retrain, and the root split changes from income to age. Test accuracy is roughly unchanged. What is happening?',
      options: [
        {
          text: 'A library bug — fitting should be deterministic',
          explanation: 'Fitting IS deterministic given the same data; the data changed. Determinism and stability are different properties.',
        },
        {
          text: 'Normal high-variance behaviour: the greedy argmax flipped between two near-tied splits and the entire subtree below rearranged',
          explanation: 'Correct. This structural instability is precisely why single trees are rarely shipped, and why bagging averages many of them.',
        },
        {
          text: 'Proof that the model is overfitting the 10 new rows',
          explanation: 'Overfitting shows up as a train-versus-test gap. This is structural instability — a variance property that appears even in well-regularized trees.',
        },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Walk me through exactly how a decision tree chooses its first split.',
      answer:
        'Compute the parent impurity (Gini or entropy). Then for every feature, sort its values and consider every midpoint between consecutive distinct values as a threshold. Each threshold defines a two-way partition; compute each child\'s impurity, take the row-weighted average, and subtract it from the parent to get the gain. Keep the (feature, threshold) pair with the largest gain, then recurse into each child. Complexity is roughly O(features × samples × depth) with pre-sorted features. Name the assumption out loud: the search is greedy, so the result is locally optimal only — the globally optimal tree is NP-hard to find.',
      isCaseBased: false,
    },
    {
      question: 'Gini or entropy — which do you use, and why?',
      answer:
        'Either; I default to Gini because it is sklearn\'s default and skips a logarithm, so it is marginally faster. Gini = 1 − Σp², the probability that two random draws from the node disagree. Entropy = −Σp log₂ p, the bits needed to encode the node\'s labels. Both peak at a 50/50 node and hit 0 when pure. In practice they select the same split the vast majority of the time; entropy penalizes very impure nodes slightly harder. The honest framing: this choice is worth a fraction of a percent, while max_depth and min_samples_leaf are worth several — so I spend tuning budget there.',
      isCaseBased: false,
    },
    {
      question: 'Why does an unpruned decision tree always overfit? Name four ways to stop it.',
      answer:
        'Because the stopping condition is leaf purity. With continuous features and no duplicate rows, some threshold always separates any two differently-labelled rows, so splitting continues until each leaf holds essentially one row: training error 0, zero generalization. Controls: (1) max_depth — cap path length, the first knob to tune; (2) min_samples_leaf — no leaf below N rows, which attacks one-row leaves most directly; (3) min_samples_split — do not even consider splitting a small node; (4) ccp_alpha — cost-complexity post-pruning. Plus min_impurity_decrease to reject near-zero-gain splits, and max_features for decorrelation. All chosen by cross-validation, never by feel.',
      isCaseBased: false,
    },
    {
      question: 'Explain cost-complexity pruning. How does it differ from just setting max_depth?',
      answer:
        'Grow the tree fully, then minimize R_α(T) = training error + α × (number of leaves). α is a price per leaf: α = 0 keeps everything, large α prunes to the root. Weakest-link pruning removes the subtree with the worst error-reduction-per-leaf first, producing a finite sequence of nested trees indexed by α — sklearn hands you those α values via cost_complexity_pruning_path — and you pick one by cross-validation. The difference from max_depth: max_depth is pre-pruning, a uniform global cap, and it suffers the horizon effect — a weak split can enable a strong one below it, and stopping early never discovers that pair. ccp sees the whole tree before cutting, so it can prune non-uniformly: deep where the data supports it, shallow where it does not. Cost: you must grow the full tree first.',
      isCaseBased: false,
    },
    {
      question: 'Case: a credit team ships a depth-20 tree. Offline test accuracy 0.91. Three months later they retrain on refreshed data, get a structurally completely different tree with similar accuracy, and compliance is alarmed. Diagnose and fix.',
      answer:
        'Two separate problems. (1) Instability: a depth-20 tree has thousands of greedy argmax decisions, many between near-tied candidates, so a modest data refresh reshuffles the structure. That is variance, not a bug — but it destroys the stable, auditable rule set compliance was promised. (2) A depth-20 tree was never interpretable anyway; a 40-condition path is not an adverse-action reason. Fix: cross-validate a heavily constrained tree (depth 3–5 with min_samples_leaf in the hundreds) and accept the accuracy cost in exchange for a stable, printable rule set — check stability explicitly by refitting on bootstrap resamples and measuring how often the top splits agree. If the accuracy cost is unacceptable, switch to a Random Forest or gradient boosting for the score and supply explanations via SHAP or a monotonic-constraint model, then get that explanation route signed off by compliance. The tradeoff to name: interpretability, stability, and accuracy are three axes, and a single deep tree is bad at all three.',
      isCaseBased: true,
    },
    {
      question: 'Do decision trees need feature scaling? Which algorithms do?',
      answer:
        'No. A split is the ordinal test x <= t, so any monotone rescaling maps the threshold along with the data and produces an identical tree — same for log or sqrt transforms. Scaling matters when an algorithm computes distances or sums weighted inputs: k-NN and k-means (Euclidean distance), SVM (margins and RBF kernels), PCA (variance is scale-dependent), and every gradient-descent-trained model (gradient ∝ input, so unequal scales create a ravine). Ridge and Lasso need it too, because the penalty is applied uniformly across coefficients. Caveat worth adding: trees are robust to outliers in x, but a regression tree is still sensitive to outliers in y, since the leaf prediction is a mean.',
      isCaseBased: false,
    },
    {
      question: 'How does a regression tree differ from a classification tree?',
      answer:
        'Only the impurity measure and the leaf output change. Impurity becomes variance (MSE about the node mean) instead of Gini or entropy, and the split score is still parent impurity minus the row-weighted child impurity. A leaf predicts the mean of the training targets that reached it — with MAE as the criterion it predicts the median instead, which is more robust to outlier targets. Consequences: the prediction surface is a piecewise-constant staircase, and the model cannot extrapolate beyond the training range at all, because there is no slope stored anywhere. That is why plain trees are a poor fit for trending time series unless you detrend first or model differences.',
      isCaseBased: false,
    },
    {
      question: 'Case: your tree scores 0.99 training accuracy and 0.62 test accuracy on a 5,000-row churn dataset with 200 features. Give me a debugging order.',
      answer:
        'Classic high-variance signature. (1) Check the tree size — get_depth and get_n_leaves; if leaves approach n_samples, it memorized, and the fix is constraints. (2) Sweep max_depth 2–12 with cross-validation and plot train vs validation; the elbow tells you the real capacity. (3) Add min_samples_leaf around 1% of rows — with 5,000 rows and 200 features, deep leaves are pure noise. (4) Try ccp_alpha via the pruning path. (5) Only now question the data: 200 features on 5,000 rows invites spurious splits, so check feature_importances_ for id-like or timestamp columns and confirm with permutation importance — and if any feature looks suspiciously perfect, hunt for leakage. (6) Confirm the split is stratified and that test rows are not near-duplicates of training rows. If a well-tuned single tree still lands near 0.7, that is the honest ceiling for one tree here; a Random Forest is the next move, trading the printable path for variance reduction.',
      isCaseBased: true,
    },
    {
      question: 'What does sklearn\'s feature_importances_ actually measure, and when would you not trust it?',
      answer:
        'Mean decrease in impurity: for each feature, sum the impurity reduction of every split using it, weighted by the fraction of rows reaching that node, then normalize to sum to 1. Three failure modes. (1) Cardinality bias — continuous and high-cardinality features get far more candidate thresholds, so noise columns like ids and timestamps accumulate importance. (2) It is computed on training data, so it rewards exactly the splits that overfit. (3) Correlated features split the credit arbitrarily; drop one and its twin\'s importance jumps, which makes the ranking look unstable. Alternative: permutation importance on a held-out set — shuffle a column, measure the score drop. It is model-agnostic and measured on unseen data, though it still misreports under strong correlation. SHAP values when you need per-prediction attribution rather than a global ranking.',
      isCaseBased: false,
    },
    {
      question: 'How would you handle a categorical feature with 500 levels in a tree model?',
      answer:
        'One-hot is the wrong default here: it creates 500 nearly-empty binary columns, each supporting only a weak "is level k" split, so the tree grows deep and splinters. Options, roughly in order: (1) group rare levels into "other" and keep the top 20–30 by frequency; (2) target/mean encoding computed inside cross-validation folds — powerful but the standard leakage trap if you fit it on the full training set; (3) use LightGBM or CatBoost, which handle categoricals natively by sorting levels on target statistics and splitting on groups of levels, which is both faster and usually more accurate; CatBoost specifically uses ordered target statistics to blunt the leakage. (4) Plain ordinal encoding is defensible for a tree only when the levels have a genuine order — otherwise it invents a false ordering that splits will exploit.',
      isCaseBased: false,
    },
    {
      question: 'Case: a PM asks "we already have gradient boosting at 0.94 AUC — why would we ever ship a single tree at 0.88?"',
      answer:
        'Usually you would not, and I would say so. But there are real cases: when a human must apply the rule without a computer (triage in a clinic, a field checklist); when a regulator or an internal audit demands the literal decision path per applicant, and a post-hoc explanation is not accepted; when the model is a first baseline whose job is to reveal what the data actually contains; when latency or footprint is extreme, since a depth-4 tree is four comparisons; and when the tree is a communication artifact used to get domain experts to challenge the logic — that conversation catches leakage and bad features that no AUC number surfaces. The tradeoff to state explicitly: 6 AUC points is the price of interpretability, and whether that price is worth paying is a business decision, not an ML one. Often the right answer is to ship both — the ensemble for scoring, the shallow tree as the explanation people can read.',
      isCaseBased: true,
    },
    {
      question: 'Why are decision-tree boundaries always axis-parallel, and when does that actually hurt?',
      answer:
        'Because every split tests exactly one feature against one threshold, which is a hyperplane perpendicular to that feature\'s axis. Intersecting many such cuts can only produce axis-aligned boxes. It hurts when the true boundary is diagonal or otherwise depends on a combination of features: the tree approximates it with a staircase, which needs many splits, and each split spends data, so a diagonal costs both accuracy and stability. Two consequences worth naming: trees are not rotation-invariant — rotate the data and the same problem suddenly needs a much bigger tree — and an engineered feature that expresses the combination (a ratio, a difference, a PCA component) can collapse dozens of splits into one. That is why feature engineering still pays off for tree models even though they are "non-linear".',
      isCaseBased: false,
    },
  ],
  flashcards: [
    {
      front: 'Decision tree, one line',
      back: 'A learned flowchart: each internal node asks "is feature <= threshold?", each leaf stores a prediction. Predicting = walking one root-to-leaf path.',
    },
    {
      front: 'Gini vs entropy',
      back: 'Gini = 1 − Σp², probability two random picks disagree. Entropy = −Σp log₂p, bits of surprise. Both 0 when pure, max at 50/50. Gini skips the log → cheaper, sklearn default. They pick the same split almost always.',
    },
    {
      front: 'Information / impurity gain',
      back: 'I(parent) − Σ (n_c/n)·I(child). Weight children by ROW COUNT, never a plain average. The split with the biggest gain wins.',
    },
    {
      front: 'Why splitting is greedy',
      back: 'Best split at each node, zero lookahead → locally optimal only. Finding the globally optimal tree is NP-hard; nobody does it.',
    },
    {
      front: 'Regression tree',
      back: 'Impurity = variance (MSE about the node mean). Leaf predicts the mean of its training y. Surface = piecewise-constant staircase; cannot extrapolate beyond the training range.',
    },
    {
      front: 'Why a full tree always overfits',
      back: 'No stopping rule → split until every leaf is pure → one leaf per row. Train accuracy 1.000 is the DEFAULT, not an achievement. Low bias, high variance.',
    },
    {
      front: 'Pre- vs post-pruning',
      back: 'Pre (stop early): max_depth, min_samples_split, min_samples_leaf, max_features, min_impurity_decrease. Post (grow then cut): ccp_alpha minimizing error + α·leaves, α chosen by CV. Post avoids the horizon effect.',
    },
    {
      front: 'feature_importances_ caveat',
      back: 'Mean decrease in impurity is biased toward high-cardinality/continuous features (ids, timestamps) — more thresholds, more chances — and is computed on training data. Use permutation importance on held-out data instead.',
    },
    {
      front: 'Trees and feature scaling',
      back: 'Not needed: splits are ordinal (x <= t), invariant to any monotone rescaling. k-NN, SVM, PCA, k-means and GD-trained models DO need scaling. Regression trees are still sensitive to outliers in y.',
    },
    {
      front: 'Instability → bagging',
      back: 'A few new rows can flip a near-tied root split and rearrange the whole tree. Fix is many trees on bootstrap samples, averaged — bagging, i.e. Random Forest. Cost: you lose the printable path.',
    },
  ],
  mindmapMarkdown: `- Decision Trees: Splits, Entropy & Pruning
  - The idea
    - 20 questions, learned from data
    - Node = one feature vs one threshold
    - Leaf = class or number
  - Interpretability
    - Print the exact path (export_text)
    - Compliance / adverse-action reasons
  - Choosing a split
    - Try every feature x every threshold
    - Keep the largest impurity gain
    - Greedy: local optimum, never global
  - Impurity
    - Gini = 1 - sum p^2
    - Entropy = -sum p log2 p
    - Gain = parent - row-weighted children
    - Gini ~ entropy in practice; Gini cheaper
  - Regression trees
    - Variance / MSE reduction
    - Leaf = mean of its y
    - Staircase surface, no extrapolation
  - Overfitting
    - Pure leaves = one leaf per row, train 1.000 by default
    - Low bias, high variance
  - Control
    - Pre: max_depth, min_samples_leaf/split, max_features
    - Post: ccp_alpha = error + a x leaves
    - Pick by cross-validation
  - Feature importance
    - Impurity reduction, biased to high-cardinality features
    - Permutation importance is the honest one
  - Practical wins
    - No scaling needed (ordinal splits), robust to x outliers
    - Categoricals: encode in sklearn, native in LightGBM
  - Weakness -> ensembles
    - Small data change flips the root
    - Axis-parallel boundaries only
    - Bagging / Random Forest averages it away`,
}

export default m
