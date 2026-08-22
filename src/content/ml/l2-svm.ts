import type { Module } from '../types'

const m: Module = {
  id: 'ml-l2-svm',
  subjectId: 'ml',
  level: 2,
  title: 'SVM and the Kernel Trick',
  whyItMatters:
    'Every classifier before this draws a boundary and stops. SVM asks whether the boundary is in a good place, and answers with a ruler. It also contains the one genuinely surprising idea in classical machine learning.',
  assumes: [
    'You have read Logistic Regression — you know what a straight decision boundary is',
    'School maths: distance from a point to a line, and squaring a number',
    'Python: lists, tuples, for loops, f-strings',
  ],
  estMinutes: 26,
  sections: [
    {
      type: 'intuition',
      title: 'What an SVM is',
      md: `A **support vector machine** picks, out of all the boundaries that separate the classes, the one with the widest empty gap around it.

- The **margin** is the distance from the boundary to the nearest point.
- The **street** is the empty band of width 2 × margin.
- A **support vector** is a point sitting on the kerb. Those points alone determine the boundary; every other point could be deleted without moving it.

Six points, three candidate lines, measured rather than eyeballed.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Measure the three candidates',
      code: `from math import sqrt

A = [(1, 2), (2, 1), (2, 3)]
B = [(5, 2), (6, 3), (6, 1)]

def half_width(a, b, c):
    best = 99.0
    for (x, y) in A + B:
        d = abs(a * x + b * y + c) / sqrt(a * a + b * b)
        if d < best:
            best = d
    return best

for name, a, b, c in [("x = 2.5", 1, 0, -2.5), ("x = 3.5", 1, 0, -3.5), ("tilted ", 1, 0.5, -4)]:
    h = half_width(a, b, c)
    print(name, " margin", round(h, 3), " street width", round(2 * h, 3))

# ---- real output ----
# x = 2.5  margin 0.5  street width 1.0
# x = 3.5  margin 1.5  street width 3.0
# tilted   margin 0.447  street width 0.894`,
      annotations: {
        9: 'The standard point-to-line distance: |ax + by + c| divided by the length of (a, b). abs() because we want distance, not side.',
        11: 'Keep the SMALLEST distance over all points — the margin is set by the nearest point, not the average one.',
        20: 'x = 3.5 wins with a street of width 3.0, against 1.0 and 0.894. All three lines separate the data perfectly; only one of them has room to spare.',
      },
    },
    {
      type: 'visual',
      component: 'SVMMarginExplorer',
      props: {},
    },
    {
      type: 'note',
      label: 'Two experiments to run above',
      md: `**Which points matter.** Drag a point far from the boundary. Nothing moves. Now drag one on the kerb: the boundary follows it immediately. That is what "support vector" means, and it is why SVMs are unusually robust to outliers *away* from the boundary.

**What C does.** Push a point across the street and watch the boundary either bend to accommodate it (low C) or ignore it and pay the fee (high C).`,
    },
    {
      type: 'intuition',
      title: 'Hinge loss: the fee for trespassing',
      md: `Demanding a completely empty street — **hard margin** — breaks on real data: one mislabelled point can make separation impossible, or squeeze the street to nothing.

**Soft margin** allows trespass and charges for it. Relabel the classes −1 and +1, then for each point compute y·f(x), where f is the raw boundary score. That product is positive when the point is on the correct side.

The **hinge loss** is max(0, 1 − y·f). Zero for anything comfortably right; growing linearly for anything inside the street or on the wrong side.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Hinge loss for seven points, including one trespasser',
      code: `w = 1 / 1.5
b = -3.5 / 1.5

points = [((1, 2), -1), ((2, 1), -1), ((2, 3), -1),
          ((5, 2), 1), ((6, 3), 1), ((6, 1), 1), ((3.2, 2), 1)]

for (x, y), label in points:
    f = w * x + b
    score = label * f
    hinge = max(0.0, 1 - score)
    print(f"point ({x}, {y}) label {label:+d}  y*f = {score:6.3f}  hinge = {hinge:.3f}")

# ---- real output ----
# point (1, 2) label -1  y*f =  1.667  hinge = 0.000
# point (2, 1) label -1  y*f =  1.000  hinge = 0.000
# point (2, 3) label -1  y*f =  1.000  hinge = 0.000
# point (5, 2) label +1  y*f =  1.000  hinge = 0.000
# point (6, 3) label +1  y*f =  1.667  hinge = 0.000
# point (6, 1) label +1  y*f =  1.667  hinge = 0.000
# point (3.2, 2) label +1  y*f = -0.200  hinge = 1.200`,
      annotations: {
        1: 'w and b are scaled so the kerbs sit at y·f = 1 exactly. That normalisation is what makes the number 1 appear in the hinge formula.',
        11: 'f-string format specs: {label:+d} always prints the sign, {score:6.3f} pads to six characters with three decimals. They line the table up.',
        16: 'The three points at the kerbs score exactly 1.000 and pay nothing. Scoring exactly 1 IS the definition of a support vector.',
        21: 'The trespasser scores −0.200 — negative, so it is on the wrong side entirely — and pays 1.200. That fee is what the optimiser has to weigh against widening the street.',
      },
    },
    {
      type: 'math',
      intro:
        'The first line is the link that makes the whole thing an optimisation: margin is 1/‖w‖, so widening the street IS shrinking ‖w‖. The objective then has two terms pulling opposite ways, and C is the exchange rate between them — the price of one unit of trespass.',
      latex: [
        '\\text{margin} = \\frac{1}{\\lVert w \\rVert} \\quad\\Longrightarrow\\quad \\text{widen the street} \\;\\equiv\\; \\text{shrink } \\lVert w \\rVert',
        '\\min_{w,\\,b} \\;\\; \\underbrace{\\tfrac{1}{2}\\lVert w \\rVert^{2}}_{\\text{wide street}} \\;+\\; C \\sum_{i=1}^{n} \\underbrace{\\max\\!\\left(0,\\; 1 - y_i\\,(w \\cdot x_i + b)\\right)}_{\\text{hinge fee, per point}}, \\qquad y_i \\in \\{-1, +1\\}',
      ],
    },
    {
      type: 'note',
      label: 'Two consequences of that objective',
      md: `**Hinge is exactly zero for confidently-correct points**, unlike log loss, which always returns something small but positive. That is why an SVM's answer depends on so few points — most rows contribute literally nothing to the objective.

**Low C means a cheap fee**, so the optimiser tolerates trespass to keep a wide street — more regularisation. **High C means an expensive fee**, so it contorts the boundary to avoid mistakes — less regularisation, and eventually overfitting.`,
    },
    {
      type: 'intuition',
      title: 'The kernel trick',
      md: `Some data no straight boundary can split. Seven points on a line at x = −3…3, with the middle three one class and the outer four the other: no single cut works.

Add a second coordinate x², and suddenly a horizontal line separates them cleanly. That is a **lift** — moving to a higher-dimensional space where the data *is* separable.

The **kernel trick** is the observation that the optimiser only ever needs **dot products** between points, never the points themselves. So you can compute the dot product *in the lifted space* directly from the original coordinates, and never build the lift at all.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The lift, on seven points',
      code: `xs = [-3, -2, -1, 0, 1, 2, 3]
for x in xs:
    label = "in " if abs(x) <= 1 else "out"
    print(f"x = {x:>2}   label {label}   lifted point = ({x}, {x * x})")

# ---- real output ----
# x = -3   label out   lifted point = (-3, 9)
# x = -2   label out   lifted point = (-2, 4)
# x = -1   label in    lifted point = (-1, 1)
# x =  0   label in    lifted point = (0, 0)
# x =  1   label in    lifted point = (1, 1)
# x =  2   label out   lifted point = (2, 4)
# x =  3   label out   lifted point = (3, 9)`,
      annotations: {
        3: 'A ternary: the value before `if` when the condition holds, the value after `else` otherwise. The three points with |x| ≤ 1 are the inner class.',
        6: 'Read the second coordinate: the "in" points have x² of 1, 0, 1 and the "out" points have 4, 9, 4, 9. A horizontal line at x² = 2.5 now separates them, and no line on the original single axis could.',
      },
    },
    {
      type: 'math',
      intro:
        'K is the kernel: it returns what the dot product WOULD have been in the lifted space, computed from the original coordinates. The last line is the prediction rule, and notice it sums only over support vectors — which is why a trained SVM stores those points and discards the rest.',
      latex: [
        'K(x, z) \\;=\\; \\phi(x) \\cdot \\phi(z) \\qquad \\text{computed without ever constructing } \\phi',
        '\\text{linear: } K = x \\cdot z \\qquad \\text{polynomial: } K = (x \\cdot z + c)^{d} \\qquad \\text{RBF: } K = \\exp\\!\\left(-\\gamma \\lVert x - z \\rVert^{2}\\right)',
        'f(z) \\;=\\; \\text{sign}\\!\\left( \\sum_{i \\,\\in\\, \\text{support vectors}} \\alpha_i\\, y_i\\, K(x_i, z) \\;+\\; b \\right)',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Linear vs RBF on two rings no line can split',
      code: `from sklearn.datasets import make_circles
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

X, y = make_circles(n_samples=500, factor=0.45, noise=0.12, random_state=0)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=0)

for name in ["linear", "rbf"]:
    clf = make_pipeline(StandardScaler(), SVC(kernel=name, C=1.0)).fit(Xtr, ytr)
    n_sv = len(clf[-1].support_vectors_)
    print(f"{name:7} test accuracy {clf.score(Xte, yte):.3f}   support vectors {n_sv}/{len(Xtr)}")

# ---- real output ----
# linear  test accuracy 0.440   support vectors 334/350
# rbf     test accuracy 0.973   support vectors 61/350`,
      annotations: {
        11: 'make_pipeline chains the scaler and the SVM so the scaler is fitted on training data only, inside each fit. clf[-1] then reaches the SVM at the end of the chain.',
        16: 'Linear scores 0.440 — worse than guessing — and needs 334 of 350 points as support vectors, because with no valid boundary nearly every point is a violation.',
        17: 'RBF scores 0.973 using 61. Same data, same C, same code path. The only change is which dot product is used.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'What gamma and C actually control',
      code: `for g in [0.01, 1, 100]:
    clf = make_pipeline(StandardScaler(), SVC(kernel="rbf", C=1.0, gamma=g)).fit(Xtr, ytr)
    print(f"gamma {g:<6} train {clf.score(Xtr, ytr):.3f}   test {clf.score(Xte, yte):.3f}")

for C in [0.01, 1, 1000]:
    clf = make_pipeline(StandardScaler(), SVC(kernel="rbf", C=C, gamma=1.0)).fit(Xtr, ytr)
    print(f"C {C:<7} test {clf.score(Xte, yte):.3f}   support vectors {len(clf[-1].support_vectors_)}")

# ---- real output ----
# gamma 0.01   train 0.526   test 0.440
# gamma 1      train 0.989   test 0.973
# gamma 100    train 1.000   test 0.933
#
# C 0.01    test 0.440   support vectors 335
# C 1       test 0.973   support vectors 58
# C 1000    test 0.973   support vectors 18`,
      annotations: {
        10: 'gamma 0.01: every point looks close to every other, the boundary is nearly flat, and train and test are both terrible. Underfitting.',
        12: 'gamma 100: train hits 1.000 while test falls to 0.933. Each point now influences only its immediate neighbourhood, so the boundary wraps individual points. Overfitting, visible as the gap.',
        15: 'C 0.01: the fee is so cheap the optimiser gives up entirely — 335 support vectors and 0.440 accuracy.',
        17: 'C 1000: same accuracy as C = 1 but only 18 support vectors. The boundary is now determined by a handful of points, which is a far more fragile model for the same score.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The classic mistake: RBF without scaling',
      code: `Xbad = X.copy()
Xbad[:, 1] = Xbad[:, 1] * 10000
Xbtr, Xbte, ybtr, ybte = train_test_split(Xbad, y, test_size=0.3, random_state=0)

raw = SVC(kernel="rbf", C=1.0).fit(Xbtr, ybtr)
scaled = make_pipeline(StandardScaler(), SVC(kernel="rbf", C=1.0)).fit(Xbtr, ybtr)
print("unscaled test accuracy", round(raw.score(Xbte, ybte), 3))
print("scaled   test accuracy", round(scaled.score(Xbte, ybte), 3))

# ---- real output ----
# unscaled test accuracy 0.753
# scaled   test accuracy 0.973`,
      annotations: {
        2: 'Only the units of the second feature change — metres to tenths of a millimetre, say. The information is identical.',
        8: '0.753 against 0.973. The RBF kernel is exp(−γ‖x − z‖²), and ‖x − z‖² is now dominated entirely by the second column, so the first feature has effectively vanished. Anything distance-based must be scaled first.',
      },
    },
  ],
  quiz: [
    {
      question: 'Of three lines that all separate the six points perfectly, x = 3.5 had street width 3.0 and the tilted line 0.894. Why prefer x = 3.5?',
      options: [
        { text: 'It is vertical, which is simpler', explanation: 'Orientation is irrelevant; the widest street happens to be vertical here.' },
        { text: 'The widest gap leaves the most room for a new point to land without being misclassified', explanation: 'Correct. All three fit the training data perfectly, so training accuracy cannot choose between them — the margin can.' },
        { text: 'It has the smallest training error', explanation: 'All three have zero training error.' },
        { text: 'It uses fewer support vectors', explanation: 'Support-vector count is not what is being optimised.' },
      ],
      correct: 1,
    },
    {
      question: 'Three points scored y·f = 1.000 exactly. What are they?',
      options: [
        { text: 'Misclassified points', explanation: 'Misclassified points have negative y·f, like the trespasser at −0.200.' },
        { text: 'The support vectors — points sitting exactly on the kerb', explanation: 'Correct. Scoring exactly 1 is the definition, and those are the only points that determine the boundary.' },
        { text: 'Points furthest from the boundary', explanation: 'Those score higher, 1.667 here, and pay nothing.' },
        { text: 'Points the model is uncertain about', explanation: 'SVMs do not produce uncertainty directly; these points are confidently classified and precisely on the margin.' },
      ],
      correct: 1,
    },
    {
      question: 'What does raising C do?',
      options: [
        { text: 'Widens the street', explanation: 'It does the opposite — a higher fee makes the optimiser sacrifice street width to avoid trespass.' },
        { text: 'Raises the price of trespass, so the boundary contorts to avoid mistakes — less regularisation', explanation: 'Correct. At C = 1000 the model reached the same 0.973 using only 18 support vectors, which is a far more fragile fit.' },
        { text: 'Changes which kernel is used', explanation: 'C and the kernel are independent settings.' },
        { text: 'Increases the number of support vectors', explanation: 'It reduces them — 335 at C = 0.01, 58 at C = 1, 18 at C = 1000.' },
      ],
      correct: 1,
    },
    {
      question: 'The kernel trick avoids what, exactly?',
      options: [
        { text: 'Computing dot products', explanation: 'It computes dot products — that is precisely what a kernel returns.' },
        { text: 'Ever constructing the lifted coordinates φ(x)', explanation: 'Correct. K(x, z) returns what φ(x)·φ(z) would have been, so the high-dimensional space is never built. For the RBF kernel it is infinite-dimensional.' },
        { text: 'Storing the training data', explanation: 'An SVM must store its support vectors to predict at all.' },
        { text: 'Choosing a value for C', explanation: 'C is still required regardless of kernel.' },
      ],
      correct: 1,
    },
    {
      question: 'gamma 0.01 gave train 0.526 / test 0.440; gamma 100 gave train 1.000 / test 0.933. Read those.',
      options: [
        { text: 'Both are fine; 100 is better', explanation: 'gamma 100 has a 0.067 train–test gap and scores worse on test than gamma 1.' },
        { text: 'gamma 0.01 underfits (both bad) and gamma 100 overfits (perfect train, worse test)', explanation: 'Correct. gamma sets how far one point\'s influence reaches; too small flattens the boundary, too large wraps individual points.' },
        { text: 'gamma 0.01 overfits and gamma 100 underfits', explanation: 'Reversed — small gamma means wide influence and a flatter boundary.' },
        { text: 'The difference is random noise', explanation: 'A move from 0.526 to 1.000 training accuracy is systematic.' },
      ],
      correct: 1,
    },
    {
      question: 'Multiplying one feature by 10,000 dropped RBF accuracy from 0.973 to 0.753. Why?',
      options: [
        { text: 'The RBF kernel uses ‖x − z‖², which is now dominated by that one column, so the other feature effectively disappears', explanation: 'Correct. Any distance-based method must be scaled, and the kernel is a function of distance.' },
        { text: 'SVMs cannot handle large numbers', explanation: 'The magnitude alone is not the issue; the imbalance between columns is.' },
        { text: 'The labels were corrupted', explanation: 'y is untouched — only the second column of X was rescaled.' },
        { text: 'C needs to grow with the feature scale', explanation: 'Tuning C cannot recover a feature the distance metric has drowned out.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'What is a support vector machine trying to maximise?',
      answer:
        'The margin — the distance from the decision boundary to the nearest training point. Since margin equals 1/‖w‖, maximising it is the same as minimising ‖w‖², which turns the geometric idea into a convex optimisation. The soft-margin version adds C times the total hinge loss, so the objective trades street width against how much trespass it tolerates.',
      isCaseBased: false,
    },
    {
      question: 'Explain the kernel trick to someone who has not seen it.',
      answer:
        'Some data cannot be separated by a straight boundary in its own space but can be in a higher-dimensional one — seven points on a line become separable once you add x². Building that space explicitly is expensive and often impossible. The trick is that the SVM optimisation only ever needs dot products between pairs of points, never the points themselves, so you can compute what the dot product would have been in the lifted space directly from the original coordinates. The RBF kernel corresponds to an infinite-dimensional lift you could never construct, and it costs one exponential to evaluate.',
      isCaseBased: true,
    },
    {
      question: 'How do C and gamma differ?',
      answer:
        'C is the price of a margin violation and applies to any kernel: low C tolerates errors and keeps a wide, smooth boundary, high C contorts to avoid them. Gamma belongs to the RBF kernel and sets how far a single point\'s influence reaches: low gamma means each point affects a wide region and the boundary is flat, high gamma means a tight neighbourhood and a boundary that wraps individual points. On the rings, gamma 0.01 underfit at 0.440 test and gamma 100 overfit with train 1.000 against test 0.933. Both push toward overfitting when raised, so they must be tuned jointly on a grid.',
      isCaseBased: false,
    },
    {
      question: 'When would you not use an SVM?',
      answer:
        'On large datasets — kernel SVM training is roughly quadratic to cubic in the number of rows, so beyond a hundred thousand or so it becomes impractical while a gradient-boosted tree trains in minutes. When you need calibrated probabilities, since SVMs produce a distance and Platt scaling is a bolt-on requiring extra cross-validation. And on tabular data with mixed types and missing values, where trees handle the messiness natively. LinearSVC on high-dimensional sparse text data is still a genuinely good default.',
      isCaseBased: false,
    },
    {
      question: 'Your SVM has 90% of the training set as support vectors. What does that tell you?',
      answer:
        'Something is wrong. A healthy SVM is determined by a small fraction of points. Almost everything being a support vector means almost every point is inside the margin or violating it — which happens when C is far too low, when the kernel is wrong for the data, or when the features are unscaled so the kernel cannot see structure. The linear kernel on the rings showed exactly this: 334 of 350 support vectors and 0.440 accuracy. It is also a practical warning, since prediction cost scales with support-vector count.',
      isCaseBased: true,
    },
    {
      question: 'Why is hinge loss zero for correctly classified points, and does that matter?',
      answer:
        'Because the loss is max(0, 1 − y·f), and once y·f exceeds 1 the point is beyond the kerb and contributes nothing. It matters a great deal: it is why the solution depends only on support vectors, why the model is robust to outliers that sit far from the boundary on the correct side, and why prediction only needs those stored points. Log loss never reaches zero, so in logistic regression every point keeps nudging the boundary forever.',
      isCaseBased: false,
    },
    {
      question: 'How do you extend SVM to more than two classes?',
      answer:
        'It is binary by construction, so you build several. One-vs-rest trains k classifiers and takes the highest score — cheap, but the scores are not calibrated against each other. One-vs-one trains k(k−1)/2 classifiers on each pair and votes; each fit is on a smaller subset so it is often faster in total despite the count, and it is what scikit-learn\'s SVC uses. There are true multiclass formulations, but they are rarely worth the complexity.',
      isCaseBased: false,
    },
    {
      question: 'You must classify 200,000 text documents with 50,000 sparse features. What do you do?',
      answer:
        'LinearSVC, or SGDClassifier with hinge loss. High-dimensional sparse text is usually close to linearly separable, so the RBF lift buys little, and the linear solver scales to this size where a kernel SVM would not — the kernel matrix alone would be 200,000² entries. I would keep TF-IDF features, skip standardisation since the data is sparse and centring would destroy that, and tune C by cross-validation. If probabilities are needed, logistic regression on the same features is the easier choice.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'SVM, in one sentence', back: 'Of all boundaries that separate the classes, choose the one with the widest empty street around it.' },
    { front: 'Margin, street, support vector', back: 'Margin = distance to the nearest point. Street = the empty band, width 2 × margin. Support vector = a point on the kerb, scoring y·f = 1 exactly.' },
    { front: 'The key identity', back: 'margin = 1/‖w‖, so maximising the margin is minimising ‖w‖² — a convex problem.' },
    { front: 'Hinge loss', back: 'max(0, 1 − y·f). Exactly zero for confidently-correct points, which is why only support vectors matter.' },
    { front: 'What C controls', back: 'The price of trespass. Low C = wide street, tolerate errors, more regularisation. High C = contort to avoid errors, fewer support vectors, more fragile.' },
    { front: 'The kernel trick', back: 'The optimiser only needs dot products. K(x, z) returns what φ(x)·φ(z) would be, so the lifted space is never built — for RBF it is infinite-dimensional.' },
    { front: 'Three kernels', back: 'linear K = x·z; polynomial K = (x·z + c)^d; RBF K = exp(−γ‖x − z‖²).' },
    { front: 'Why scale before RBF?', back: 'The kernel is a function of ‖x − z‖². One feature scaled 10,000× dominates the distance and erases the other: accuracy 0.973 → 0.753.' },
  ],
  mindmapMarkdown: `- SVM
  - The idea
    - widest street between the classes
    - margin = distance to nearest point
    - support vector = point on the kerb (y*f = 1)
    - three lines, all perfect: widths 1.0, 3.0, 0.894
  - The objective
    - margin = 1/||w||, so maximise margin = minimise ||w||^2
    - hinge = max(0, 1 - y*f), zero when comfortably right
    - min 0.5||w||^2 + C sum hinge
    - trespasser at (3.2,2): y*f = -0.200, hinge 1.200
  - C
    - low: cheap fee, wide street, more regularisation
    - high: contort to avoid errors, few support vectors
    - 0.01 -> 0.440 acc, 335 SVs; 1000 -> 0.973, 18 SVs
  - Kernel trick
    - lift x to (x, x^2) makes the unsplittable splittable
    - optimiser needs only DOT PRODUCTS
    - K(x,z) = phi(x).phi(z) without building phi
    - linear / polynomial / RBF
  - Rings
    - linear 0.440 with 334 SVs
    - rbf 0.973 with 61 SVs
    - gamma 0.01 underfits, 100 overfits (train 1.000, test 0.933)
  - Trap
    - RBF uses ||x-z||^2, so scale first: 0.973 -> 0.753`,
}

export default m
