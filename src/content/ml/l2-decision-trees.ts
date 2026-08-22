import type { Module } from '../types'

const m: Module = {
  id: 'ml-l2-decision-trees',
  subjectId: 'ml',
  level: 2,
  title: 'Decision Trees',
  whyItMatters:
    'The one model whose reasoning you can read out loud, and the building block of the two methods that still win most spreadsheet-shaped problems. The whole algorithm is one arithmetic score applied over and over.',
  assumes: [
    'You know what accuracy is and how to count correct predictions',
    'You have seen a Python list, a for loop and an if statement',
    'School maths: fractions and squaring a number',
  ],
  estMinutes: 24,
  sections: [
    {
      type: 'intuition',
      title: 'What a decision tree is',
      md: `A **decision tree** is a flowchart of yes/no questions, written by an algorithm reading data. Each internal **node** asks one question about one feature; each **leaf** gives an answer.

Training means choosing the questions. The algorithm needs a way to score a candidate question, and that score is the entire algorithm — everything else is repetition.

Ten flowers, petal length and width in cm, five of class A and five of class B.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'A finished tree, written as plain if-statements',
      code: `rows = [(1.4, 0.2, 'A'), (1.3, 0.2, 'A'), (1.5, 0.4, 'A'), (1.7, 0.6, 'A'),
        (3.0, 1.1, 'A'), (2.2, 1.0, 'B'), (4.7, 1.4, 'B'), (4.5, 1.5, 'B'),
        (4.9, 1.5, 'B'), (4.0, 1.3, 'B')]

def predict(length, width):
    if width <= 0.8:
        return 'A'
    if length > 3.5:
        return 'B'
    if length <= 2.6:
        return 'B'
    return 'A'

wrong = [r for r in rows if predict(r[0], r[1]) != r[2]]
print('rows misclassified:', len(wrong))

# ---- real output ----
# rows misclassified: 0`,
      annotations: {
        5: 'A tree IS this: nested if-statements on single features. Nothing is hidden — the model and its explanation are the same object, which no other model here can say.',
        14: 'A list comprehension keeping only the rows where the prediction disagrees with the truth. It is empty, so the tree classifies all ten correctly.',
      },
    },
    {
      type: 'intuition',
      title: 'Scoring a question: Gini impurity',
      md: `**Gini impurity** measures mess. Pick two rows from a node at random, one after the other: Gini is the chance their labels disagree.

- All ten rows, 5 A and 5 B — maximum mess, Gini 0.5.
- Four rows all A — no mess at all, Gini 0.0.
- Six rows, 1 A and 5 B — mostly settled, Gini 0.278.

A good question is one whose children are **less messy than the parent**.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Gini, checked on those three nodes',
      code: `def gini(labels):
    total = len(labels)
    score = 1.0
    for name in ['A', 'B']:
        p = labels.count(name) / total
        score = score - p * p
    return score

root = [r[2] for r in rows]
print(round(gini(root), 4))
print(round(gini(['A', 'A', 'A', 'A']), 4))
print(round(gini(['A', 'B', 'B', 'B', 'B', 'B']), 4))

# ---- real output ----
# 0.5
# 0.0
# 0.2778`,
      annotations: {
        5: "labels.count(name) counts how many entries equal that label, so p is that class's share of the node.",
        6: 'Subtract each share squared. p² is the chance of drawing that class twice in a row, so 1 minus the sum is the chance of drawing two that differ.',
        12: '0.5 for a 50/50 node, 0.0 for a pure one, 0.2778 for 1-in-6. Lower is tidier, and 0 means done.',
      },
    },
    {
      type: 'math',
      intro:
        'Gini and entropy are two rulers for the same mess; both are 0 for a pure node. Gain is what the algorithm maximises: parent impurity minus the impurity of the children, each child weighted by its SHARE of the rows. That weighting is the step people get wrong.',
      latex: [
        'G(S) \\;=\\; 1 - \\sum_{k=1}^{K} p_k^2 \\qquad\\qquad H(S) \\;=\\; -\\sum_{k=1}^{K} p_k \\log_2 p_k',
        '\\text{Gain} \\;=\\; I(\\text{parent}) \\;-\\; \\sum_{c \\,\\in\\, \\text{children}} \\frac{n_c}{n}\\, I(c) \\qquad I \\in \\{G, H\\}',
        '\\text{Regression: } \\; I(S) = \\frac{1}{n_S}\\sum_{i \\in S}\\left(y_i - \\bar{y}_S\\right)^2',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Two candidate questions, scored',
      code: `def split_score(col, threshold):
    left = [r[2] for r in rows if r[col] <= threshold]
    right = [r[2] for r in rows if r[col] > threshold]
    n = len(rows)
    after = (len(left) / n) * gini(left) + (len(right) / n) * gini(right)
    return len(left), len(right), round(after, 4), round(gini(root) - after, 4)

print('petal_length <= 2.5 ->', split_score(0, 2.5))
print('petal_width  <= 0.8 ->', split_score(1, 0.8))

# ---- real output ----
# petal_length <= 2.5 -> (5, 5, 0.32, 0.18)
# petal_width  <= 0.8 -> (4, 6, 0.1667, 0.3333)`,
      annotations: {
        5: 'Each child is weighted by len(child)/n — its share of the rows. Averaging the two children equally would let a 1-row pure leaf outvote a 9-row mess, and the tree would choose nonsense.',
        11: 'Length ≤ 2.5 splits 5/5 and leaves impurity 0.32, a gain of 0.18.',
        12: 'Width ≤ 0.8 splits 4/6 and leaves 0.1667, a gain of 0.3333 — nearly double. It wins because its left child is perfectly pure, and that is why the finished tree asks about width first.',
      },
    },
    {
      type: 'visual',
      component: 'DecisionBoundaryPlayground',
      props: {},
    },
    {
      type: 'note',
      label: 'Why tree boundaries are staircases',
      md: `Set the model to **tree** in the panel above and drag max depth from 1 to 6. The boundary is always made of horizontal and vertical steps, never a diagonal.

That is forced by the question form: every split is "feature ≤ value", which is a cut perpendicular to one axis. A diagonal boundary has to be approximated by many small steps — which is why a tree needs surprising depth for a relationship a straight line would capture instantly.

It is also why trees need no feature scaling: "≤ 0.8" means the same thing whatever units the neighbouring column uses.`,
    },
    {
      type: 'intuition',
      title: 'Greedy, and what that costs',
      md: `The search is **greedy**: at each node take the question that looks best right now, and never reconsider. It never checks whether a slightly worse first question would have allowed a much better second one.

Greedy is not optimal — finding the smallest perfect tree is NP-hard, so every practical implementation is greedy. In exchange it is fast, and the cost is that trees are **unstable**: change a few rows and a different first split can win, producing a visibly different tree that performs about the same.

That instability is precisely what Random Forest turns into an advantage.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The classic mistake: a perfect training score',
      code: `memo = {}
for r in rows:
    memo[(r[0], r[1])] = r[2]

correct = 0
for r in rows:
    if memo[(r[0], r[1])] == r[2]:
        correct = correct + 1
print('train accuracy', correct / len(rows))

new_flower = (1.6, 0.3)
print('new flower ->', memo.get(new_flower, 'no rule matches'))

# ---- real output ----
# train accuracy 1.0
# new flower -> no rule matches`,
      annotations: {
        3: 'A dictionary keyed by the exact measurement pair. This is what an unlimited tree converges to: one leaf per row.',
        9: 'Training accuracy 1.0. An unpruned tree ALWAYS reaches this, provided no two rows have identical features and different labels — so the number carries no information.',
        13: 'And on a flower it has not memorised, it has nothing to say. The mistake is not the 1.0; it is concluding anything from it.',
      },
    },
    {
      type: 'note',
      label: 'The brakes',
      md: `Since an unlimited tree memorises, every usable tree is a limited tree. Two families:

- **Stop early** — \`max_depth\`, \`min_samples_leaf\`, \`min_samples_split\`. Cheap, but the stopping rule is blind to what a split might have led to.
- **Grow then cut back** — cost-complexity pruning (\`ccp_alpha\`), which builds the full tree and removes subtrees that do not pay for themselves. Slower and generally better.

Either way, the limit is a hyperparameter and gets chosen on validation data.`,
    },
    {
      type: 'note',
      label: 'Reading feature importance carefully',
      md: `A tree reports **feature importance** by adding up the impurity drop of every split on that feature, weighted by rows reaching it.

Two cautions. It is biased toward high-cardinality features, which get more thresholds to try and so more chances to look good. And with two correlated features, whichever is chosen first absorbs the credit while the other looks worthless — even though either alone would have served.`,
    },
  ],
  quiz: [
    {
      question: 'Gini for a node with 1 A and 5 B is 0.278. What does that number mean?',
      options: [
        { text: 'The accuracy of predicting B at this node', explanation: 'That would be 5/6 = 0.833.' },
        { text: 'The chance that two rows drawn at random from the node have different labels', explanation: 'Correct. 1 − (1/6)² − (5/6)² = 0.2778.' },
        { text: 'The fraction of rows that are A', explanation: 'That is 1/6 = 0.167.' },
        { text: 'The information gain from splitting here', explanation: 'Gain is the parent impurity minus the weighted child impurities, a separate quantity.' },
      ],
      correct: 1,
    },
    {
      question: 'Why must each child be weighted by its share of the rows?',
      options: [
        { text: 'To keep the gain positive', explanation: 'Weighting does not determine the sign; a good split has positive gain either way.' },
        { text: 'Otherwise a tiny pure leaf could outvote a large messy one and the tree would choose nonsense', explanation: 'Correct. Splitting off one row into a pure leaf gives impurity 0 for that child, which an unweighted average would reward absurdly.' },
        { text: 'Because Gini is only valid on equal-sized nodes', explanation: 'Gini is defined for any node size.' },
        { text: 'To normalise for the number of features', explanation: 'Feature count plays no part in this formula.' },
      ],
      correct: 1,
    },
    {
      question: 'Width ≤ 0.8 gained 0.3333 and length ≤ 2.5 gained 0.18. Why did width win?',
      options: [
        { text: 'Because it splits the rows more evenly', explanation: 'It splits 4/6 while length splits 5/5 — width is the LESS even split, and still wins.' },
        { text: 'Because its left child is perfectly pure, so the weighted impurity after the split is far lower', explanation: 'Correct. 0.1667 after, against 0.32 for length. Purity of the children is what is scored, not balance.' },
        { text: 'Because width has smaller numbers', explanation: 'Scale is irrelevant to a tree.' },
        { text: 'Because it was tried first', explanation: 'The search evaluates all candidates and takes the maximum gain.' },
      ],
      correct: 1,
    },
    {
      question: 'An unpruned tree scores 1.0 training accuracy. What can you conclude?',
      options: [
        { text: 'The model has learned the pattern well', explanation: 'It has learned the rows, which is different.' },
        { text: 'Nothing — an unlimited tree always reaches 1.0 unless two rows conflict exactly', explanation: 'Correct. It is the default behaviour of the algorithm, so it carries no information about quality.' },
        { text: 'The data is linearly separable', explanation: 'Trees do not produce linear boundaries and this says nothing about separability.' },
        { text: 'The tree is too shallow', explanation: 'A perfect training score means it grew until every leaf was pure — the opposite of shallow.' },
      ],
      correct: 1,
    },
    {
      question: 'Why are tree decision boundaries always axis-aligned staircases?',
      options: [
        { text: 'Because every split has the form "one feature ≤ one value", which is a cut perpendicular to an axis', explanation: 'Correct. A diagonal must be approximated by many steps, which is why trees need depth for relationships a line would capture at once.' },
        { text: 'Because Gini impurity is piecewise constant', explanation: 'The impurity measure does not constrain the geometry; the question form does.' },
        { text: 'Because the features were not scaled', explanation: 'Trees are scale-invariant — scaling changes nothing about the boundary shape.' },
        { text: 'They are not — trees can produce diagonal boundaries', explanation: 'Not with univariate splits, which is what every standard implementation uses.' },
      ],
      correct: 0,
    },
    {
      question: 'Two features are strongly correlated. What does feature importance report?',
      options: [
        { text: 'Both get equal credit', explanation: 'The credit goes to whichever is split on, not shared evenly.' },
        { text: 'Whichever is chosen first absorbs the credit and the other can look worthless', explanation: 'Correct. Once one has removed the impurity, the second has nothing left to gain — even though either alone would have served.' },
        { text: 'Both are reported as zero', explanation: 'The chosen one gets a high score.' },
        { text: 'The tree refuses to split on either', explanation: 'It splits on one of them quite happily.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'How does a decision tree choose a split?',
      answer:
        'It scores every candidate threshold on every feature by impurity reduction. Compute the parent impurity, then the weighted average impurity of the children — weighted by each child\'s share of the rows — and take the largest drop. On the ten flowers, width ≤ 0.8 leaves impurity 0.1667 for a gain of 0.3333, against length ≤ 2.5 at 0.32 and a gain of 0.18, so width wins and becomes the root question. Then it recurses on each child.',
      isCaseBased: true,
    },
    {
      question: 'Gini or entropy — does it matter?',
      answer:
        'Almost never in practice. They are both zero at purity and maximal at a uniform mix, and they usually pick the same split; published comparisons find the difference in accuracy is negligible. Gini is marginally cheaper because it avoids a logarithm, which is why it is scikit-learn\'s default. Entropy has the cleaner information-theoretic interpretation — expected bits needed to encode the label — which makes it easier to explain.',
      isCaseBased: false,
    },
    {
      question: 'Why do trees overfit so readily, and how do you control it?',
      answer:
        'Because the greedy search will keep splitting until every leaf is pure, and it always can unless two rows are identical with different labels. The end state is one leaf per row — a lookup table with 1.0 training accuracy and nothing to say about a new row. Control is either pre-pruning (max_depth, min_samples_leaf, min_samples_split) or post-pruning by cost-complexity (ccp_alpha), which grows the full tree and removes subtrees that do not justify their complexity. Post-pruning is usually better because a stopping rule cannot see what a split would have led to.',
      isCaseBased: false,
    },
    {
      question: 'Why do trees not need feature scaling?',
      answer:
        'Because every split compares one feature against a threshold from that same feature. "Is width ≤ 0.8" is unaffected by what units the neighbouring column uses, and the impurity score depends only on how rows are partitioned, not on distances. That is a real practical advantage over anything distance-based or regularised, both of which are broken by an unscaled column.',
      isCaseBased: false,
    },
    {
      question: 'Your tree gives a different structure every time you refit. Is it broken?',
      answer:
        'No — that is expected instability, and it comes from the greedy search. When two candidate splits have nearly equal gain, a handful of different rows can flip which one wins, and every split below inherits the change. Predictive performance is usually similar despite the visible difference. If you need a stable explanation, use a shallow tree, average importances over bootstrap refits, or accept a forest and explain it with SHAP instead. The instability is exactly what bagging exploits.',
      isCaseBased: true,
    },
    {
      question: 'How does a regression tree differ?',
      answer:
        'Two changes only. Impurity becomes the variance of the target within the node instead of Gini, so a good split makes the y values in each child tighter around their own mean. And the leaf prediction becomes the mean of its rows rather than the majority class. Everything else — greedy search, weighting by row share, the same pruning controls — is identical. A consequence is that regression trees cannot extrapolate: any input beyond the training range gets the nearest leaf\'s mean.',
      isCaseBased: false,
    },
    {
      question: 'A stakeholder wants to know why one applicant was rejected. What do you give them?',
      answer:
        'For a single tree, the literal path: petal width was above 0.8, then length above 3.5, so the leaf said B. That is a genuine causal account of the model\'s decision, not a reconstruction, and it is the reason single trees survive in regulated settings. Note it explains the model, not the world — the tree may be relying on a proxy. For a forest or boosted model there is no such path, and you fall back to SHAP values, which are an approximation.',
      isCaseBased: true,
    },
    {
      question: 'How do trees handle categorical features and missing values?',
      answer:
        'Categoricals: some implementations split on subsets of levels directly, which is powerful but risks overfitting on high-cardinality columns; scikit-learn requires you to encode first, and one-hot encoding a high-cardinality column tends to produce weak splits. Missing values: CART uses surrogate splits — a correlated backup feature — while LightGBM and XGBoost learn a default direction for missing rows at each node, which is simpler and usually works better. Trees handle both far more gracefully than linear models, which is a large part of their appeal on real tabular data.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Decision tree, in one sentence', back: 'A flowchart of "feature ≤ value" questions, chosen by maximising impurity reduction at each node.' },
    { front: 'Gini impurity', back: 'G = 1 − Σpₖ². The chance two rows drawn at random from the node disagree. 0.5 for 50/50, 0.0 for pure, 0.2778 for 1-in-6.' },
    { front: 'Information gain', back: 'Parent impurity minus the child impurities, each weighted by its SHARE of the rows. Unweighted, a one-row pure leaf would win everything.' },
    { front: 'The flower split, scored', back: 'width ≤ 0.8 → children 4/6, impurity 0.1667, gain 0.3333. length ≤ 2.5 → 5/5, impurity 0.32, gain 0.18. Width wins on child purity, not balance.' },
    { front: 'Why is training accuracy 1.0 meaningless here?', back: 'An unlimited tree always reaches it unless two rows are identical with different labels. It is the algorithm\'s default, not a result.' },
    { front: 'Why staircase boundaries?', back: 'Every split is perpendicular to one axis. A diagonal needs many small steps, which is why trees need depth for what a line captures instantly.' },
    { front: 'Greedy search', back: 'Best split now, never reconsidered. Optimal trees are NP-hard. The cost is instability: a few changed rows can flip the root and reshape everything below.' },
    { front: 'Regression tree', back: 'Impurity becomes within-node variance; the leaf predicts the mean. Cannot extrapolate beyond the training range.' },
  ],
  mindmapMarkdown: `- Decision trees
  - What it is
    - nested "feature <= value" questions
    - node asks, leaf answers
    - the model IS its explanation
  - Scoring a split
    - Gini = 1 - sum p^2
      - 5A/5B -> 0.5, pure -> 0.0, 1A/5B -> 0.2778
    - entropy = -sum p log2 p (agrees in practice)
    - gain = parent - weighted children
    - weight by SHARE of rows
  - The ten flowers
    - width <= 0.8 -> 4/6, 0.1667, gain 0.3333 WINS
    - length <= 2.5 -> 5/5, 0.32, gain 0.18
  - Properties
    - greedy, not optimal (optimal is NP-hard)
    - unstable -> which is what forests exploit
    - staircase boundaries, axis-aligned
    - no scaling needed
  - Overfitting
    - unlimited tree ALWAYS hits 1.0 training
    - brakes: max_depth, min_samples_leaf, ccp_alpha
  - Feature importance
    - summed weighted impurity drop
    - biased to high cardinality
    - correlated features: first one takes the credit`,
}

export default m
