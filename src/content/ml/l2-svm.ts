import type { Module } from '../types'

const m: Module = {
  id: 'ml-l2-svm',
  subjectId: 'ml',
  level: 2,
  title: 'SVM: Max Margin & the Kernel Trick',
  whyItMatters:
    'SVM is the interview\'s favourite geometry question: it forces you to say what a "good" boundary actually is, instead of "the one .fit() gave me". And the kernel trick is the single most elegant idea in classical ML — compute in a million-dimensional space you never build. Boosting beat SVM on Kaggle, but SVM still owns the whiteboard.',
  estMinutes: 50,
  sections: [
    {
      type: 'intuition',
      title: 'Many lines separate the data. Which one is best?',
      md: `Two classes of points, cleanly split. Draw a line between them.

- Now draw another. And another. **Infinitely many lines** separate the same data perfectly — all score 100% on training.
- Training accuracy can't pick between them. So what should?
- SVM's answer: *the line with the most breathing room*.
- Picture the boundary as a **street**, not a line. Widen the street until it touches points on both sides. The widest possible street wins.
- Why widest? A new point lands slightly off from where its class usually sits. A wide street absorbs that wobble; a line hugging the training points does not.
- The formal name: the **maximum-margin** classifier. Margin = half the street width.`,
    },
    {
      type: 'intuition',
      title: 'Support vectors: the only points that matter',
      md: `Push the street as wide as it goes. It stops when it hits a few points on each kerb. Those points are the **support vectors**.

- Take any *other* point — one far from the street — and **delete it**. Re-train. You get the **exact same boundary**. It was never touching the kerb.
- Delete a support vector and the street moves. That's the definition: the points holding the kerbs in place.
- Two consequences interviewers ask about:
- **Memory-efficient at predict time** — the trained model stores only the support vectors, often a small fraction of the data. The other 95% is thrown away.
- **Robust to far-away points** — a distant outlier of the correct class contributes literally nothing. (Contrast logistic regression, where every point pushes on the loss forever.)
- Flip side: SVM is *very* sensitive to points sitting near or across the boundary. Those are the ones with all the votes.`,
    },
    { type: 'visual', component: 'SVMMarginExplorer', props: {} },
    {
      type: 'note',
      md: 'Do these two things before reading on. **One:** drag a point far from the street — the boundary barely twitches, because its hinge loss is already exactly zero. **Two:** now drag a *ringed* one; the whole street swings. That contrast is the entire support-vector idea, and the live count tells you how many points are currently doing the work. Then drag the **C** slider to each end: at C = 0.2 the street is wide and simply eats the planted outlier; at C = 100 the street collapses to a sliver and the boundary rotates hard to capture it. Watch the *street width* number, not just the picture.',
    },
    { type: 'visual', component: 'DecisionBoundaryPlayground', props: { model: 'logistic' } },
    {
      type: 'note',
      md: 'Different question, same data: how do *other* models cut this plane? Click through all three. **Logistic** draws one straight line — but nothing in its loss says "put the line in the *middle* of the gap"; it just wants every point on the right side, which is exactly what the street above adds. **k-NN at k=1** wraps islands around noise points. **Tree** cuts blocky, axis-aligned steps. An RBF SVM draws a smooth curve like k-NN\'s, without memorizing every point to do it.',
    },
    {
      type: 'intuition',
      title: 'Hard margin is brittle. Soft margin is the real one.',
      md: `**Hard margin** = the street must be perfectly empty. Zero points inside, zero misclassified.

- It requires the data to be *perfectly* linearly separable. Real data almost never is.
- One mislabelled point deep in the wrong class and there is **no solution at all** — the optimizer fails outright.
- Even when a solution exists, one near-outlier can squeeze the street down to a sliver. A model shaped by a single weird row is not a model.
- **Soft margin** = allow violations, but charge for them. Each point that sits inside the street, or on the wrong side, pays a penalty proportional to how far it trespasses (its *slack*).
- Now the optimizer trades: a wide street with a few violations often beats a razor-thin street with none.
- Every SVM you will ever run is soft margin. \`SVC(C=1.0)\` is soft margin — hard margin is just \`C → ∞\`.`,
    },
    {
      type: 'intuition',
      title: 'C: the price of a violation',
      md: `**C is the fine you charge for each margin violation.** One number, and it decides everything about the fit.

- **Large C** — violations are expensive. The optimizer contorts to satisfy every point → **narrow margin**, boundary bends around noise → **high variance, overfit risk**.
- **Small C** — violations are cheap. The optimizer buys a **wide margin** and eats the errors → smoother boundary, **more bias**, underfits if too small.
- The trap to remember: **C is the INVERSE of regularization strength** (this is sklearn's convention, and it is backwards from the α/λ you saw in Ridge and Lasso). Big C = *weak* regularization. Small C = *strong* regularization.
- Sanity check when tuning: as C falls, the number of support vectors should *rise* (a wider street touches more points). If it doesn't, something is wrong with your scaling.
- Tune it on a log grid: \`C in [0.01, 0.1, 1, 10, 100]\`, cross-validated. Never eyeball it.`,
    },
    {
      type: 'math',
      intro:
        'The soft-margin objective — two terms fighting, with C as the referee. y is coded ±1 here (not 0/1), which is what makes the formula clean.',
      latex: [
        '\\text{margin width} = \\frac{2}{\\lVert w \\rVert} \\quad\\Longrightarrow\\quad \\text{widen the street} \\equiv \\text{shrink } \\lVert w \\rVert',
        '\\min_{w,\\,b} \\;\\; \\underbrace{\\tfrac{1}{2}\\lVert w \\rVert^{2}}_{\\text{wide margin}} \\;+\\; C \\sum_{i=1}^{n} \\underbrace{\\max\\!\\left(0,\\; 1 - y_i\\,(w \\cdot x_i + b)\\right)}_{\\text{hinge loss}}, \\qquad y_i \\in \\{-1, +1\\}',
        '\\text{Hinge} = 0 \\text{ once a point is past the margin on its own side; then it grows } \\textbf{linearly} \\text{ with how far it trespasses.}',
      ],
    },
    {
      type: 'note',
      md: 'That hinge term is where SVM meets the **Metrics & Losses** subject. Read it as a loss and everything clicks: it is exactly zero for confidently-correct points — which is *why* those points can be deleted without changing the model. Compare cross-entropy, which is never zero, so every point keeps pulling forever. Hinge is also non-differentiable at the kink (margin = 1), which is why SVMs are solved with quadratic programming rather than plain gradient descent.',
    },
    {
      type: 'intuition',
      title: 'The wall: some data has no separating line',
      md: `Draw a small circle of red points, and a ring of blue points around it. Now separate them with a straight line.

- You can't. No line, no rotation, no intercept. The classes are **not linearly separable** in this space.
- Real data does this constantly: XOR patterns, ring shapes, "too high AND too low are both bad" features.
- Option A: hand-engineer new features. Add \`x² + y²\` (distance from centre) and suddenly a *threshold* on that one feature splits the rings perfectly.
- That's the whole idea: **the data isn't separable in the space you gave it — so change the space.**
- Option B is what SVM does, and it's better, because it lets you change to a space so large you couldn't write it down.`,
    },
    {
      type: 'hinglish',
      md: `Socho do classes plate pe aise padi hain ki ek ring ke andar doosri ring — koi bhi seedhi line unhe alag nahi kar sakti. Ab andar wale points ko **upar utha do**, teesre dimension mein. Ab beech mein ek flat plane aa jaata hai, kaam khatam. Kernel ka asli jaadu yeh hai: woh uthana **karna hi nahi padta**. Algorithm ko sirf points ke beech ke **dot products** chahiye hote hain — aur kernel function seedha bata deta hai *"agar utha dete, to yeh do points kitne paas hote"*. Utha kisi ko nahi, hisaab poora. Isi liye woh space 3D ho ya infinite-dimensional, cost same rehti hai.`,
    },
    {
      type: 'intuition',
      title: 'The kernel trick, properly',
      md: `Here is the two-step version everyone knows, and the third step that makes it a *trick*.

1. **The problem** — data not separable in its own space.
2. **The lift** — map every point through some φ into a higher-dimensional space where a flat boundary *does* work. Trouble: φ can be huge. A degree-4 polynomial on 1000 features means ~40 billion new features. You cannot store one row, let alone the dataset.
3. **The trick** — you never compute φ. Look at the SVM's optimization problem and you find the data appears **only inside dot products** x_i · x_j. Nowhere else. So if some cheap function K(x, z) returns the *value* that φ(x) · φ(z) would have had, you can substitute it and the algorithm is none the wiser.

- You get every benefit of the huge space and pay the cost of the small one.
- This is why the Math subject's *Vectors & the Dot Product* module was load-bearing: **dot product = similarity**. A kernel is just "similarity, measured in a space we never visit".`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Proof in 10 lines: the kernel equals the lifted dot product',
      code: `import numpy as np

x = np.array([1.0, 2.0])
z = np.array([3.0, 1.0])

# the explicit lift: 2D -> 3D, where a flat plane can cut what no line could
phi = lambda v: np.array([v[0] ** 2, np.sqrt(2) * v[0] * v[1], v[1] ** 2])

print("lift then dot :", phi(x) @ phi(z))   # 25.0
print("kernel only   :", (x @ z) ** 2)      # 25.0  <- same number, no lift`,
      annotations: {
        7: 'This is the explicit feature map for the degree-2 polynomial kernel. The √2 is what makes the algebra line up exactly.',
        9: 'Path A: build the 3D vectors, then dot them. Costs 3 multiplications per point plus the mapping.',
        10: 'Path B: one dot product in the ORIGINAL 2D space, then square it. Same answer, φ never built. Scale this up and φ can be infinite-dimensional (RBF) while this line stays O(d).',
      },
    },
    {
      type: 'math',
      intro: 'A kernel is any function that equals a dot product in some lifted space. The three you must know by name:',
      latex: [
        'K(x, z) = \\phi(x) \\cdot \\phi(z) \\quad \\text{— evaluated without ever constructing } \\phi',
        '\\text{linear: } K = x \\cdot z \\qquad \\text{poly: } K = (x \\cdot z + c)^{d} \\qquad \\text{RBF: } K = \\exp\\!\\left(-\\gamma \\lVert x - z \\rVert^{2}\\right)',
        'f(z) = \\text{sign}\\!\\left( \\sum_{i \\in \\text{SV}} \\alpha_i\\, y_i\\, K(x_i, z) + b \\right) \\quad \\text{— the sum runs over support vectors ONLY}',
      ],
    },
    {
      type: 'intuition',
      title: 'Which kernel, and what γ does',
      md: `- **Linear** — no lift at all. Fast, and the winner whenever the data is already nearly separable in its own space.
- **Polynomial** — feature *interactions* up to degree d. Powerful but fiddly: two hyperparameters (d, c) and it blows up numerically at high degree. Rarely the answer.
- **RBF / Gaussian** — the default workhorse. Read it as similarity that decays with distance: identical points score 1, far-apart points score ~0. Its implicit space is infinite-dimensional.
- **γ (gamma) = how far one training example's influence reaches.**
- Small γ → wide reach → each point votes across the whole plane → smooth, near-linear boundary → **underfit**.
- Large γ → tiny reach → each point only speaks for its own neighbourhood → **islands of prediction around individual points** → overfit, and it looks exactly like 1-NN.
- Practical guidance: **start linear** when features are many and rows are few (text, TF-IDF, genomics — high-dim data is usually already separable). **Reach for RBF** on low-dimensional, clearly non-linear data. Tune C and γ *together* on a log grid — they interact.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Linear vs RBF on data no line can split — real numbers',
      code: `from sklearn.datasets import make_circles
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

# two concentric rings: NO straight line separates them
X, y = make_circles(n_samples=500, factor=0.45, noise=0.12, random_state=0)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=0)

for name, kern in [('linear', SVC(kernel='linear', C=1.0)),
                   ('rbf   ', SVC(kernel='rbf', C=1.0, gamma='scale'))]:
    clf = make_pipeline(StandardScaler(), kern).fit(Xtr, ytr)
    n_sv = clf[-1].support_vectors_.shape[0]
    print(f"{name} | test acc {clf.score(Xte, yte):.3f} | support vectors {n_sv}/{len(Xtr)}")

# linear | test acc 0.440 | support vectors 334/350
# rbf    | test acc 0.973 | support vectors 61/350`,
      annotations: {
        8: 'Inner disc vs surrounding ring. This is the canonical "linearly inseparable" shape — the toy version of every real non-linear problem.',
        13: 'StandardScaler is NOT optional for SVM — always inside a Pipeline so the test fold never leaks into the fit.',
        14: 'The trained model IS these vectors. The other 289 training rows were discarded and are not needed at predict time.',
        17: '0.440 — worse than a coin flip. A linear kernel on rings cannot do better than guess, and 334/350 points are support vectors: every single one is violating a margin. That SV count is the smell of a hopeless kernel.',
        18: 'Same data, same C, same code path. Only the similarity function changed — 0.440 to 0.973, and it now needs 61 points instead of 334.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'γ and C, swept — watch overfitting appear',
      code: `# continues the script above — same rings, same split
for g in [0.01, 0.1, 1, 10, 100]:
    clf = make_pipeline(StandardScaler(), SVC(kernel='rbf', C=1.0, gamma=g)).fit(Xtr, ytr)
    print(f"gamma={g:<6} train {clf.score(Xtr, ytr):.3f}  test {clf.score(Xte, yte):.3f}")

# gamma=0.01   train 0.526  test 0.440
# gamma=0.1    train 0.989  test 0.973
# gamma=1      train 0.989  test 0.973
# gamma=10     train 0.994  test 0.960
# gamma=100    train 1.000  test 0.933

for C in [0.01, 1, 1000]:
    clf = make_pipeline(StandardScaler(), SVC(kernel='rbf', C=C, gamma=1.0)).fit(Xtr, ytr)
    print(f"C={C:<6} train {clf.score(Xtr, ytr):.3f}  test {clf.score(Xte, yte):.3f}  SVs {clf[-1].support_vectors_.shape[0]}")

# C=0.01   train 0.526  test 0.440  SVs 335
# C=1      train 0.989  test 0.973  SVs 58
# C=1000   train 1.000  test 0.973  SVs 18`,
      annotations: {
        6: 'gamma=0.01: influence so wide every point blurs into every other. The boundary goes near-linear and collapses to the linear kernel score — classic underfit.',
        10: 'gamma=100: train hits a PERFECT 1.000 while test falls to 0.933. Tiny islands memorized around individual points. Train-perfect + test-dropping is the overfitting signature.',
        13: 'C sweep at fixed gamma=1. C is the violation fine, gamma is the influence radius — different knobs, both able to overfit, which is why you grid them together.',
        18: 'C=1000 (near hard margin): zero slack tolerated, so the street shrinks until only 18 points touch it. Fewer support vectors here means a TIGHTER fit, not a simpler model.',
      },
    },
    {
      type: 'intuition',
      title: 'The honest limits — say these before the interviewer does',
      md: `- **Scaling is mandatory, not advice.** SVM measures *distances*. A salary column in the tens of thousands and an age column under 100 means salary is the only feature that exists. Always \`StandardScaler\` inside a \`Pipeline\`.
- **Training cost is roughly O(n²) to O(n³)** in the number of rows, and the kernel matrix alone is n×n memory. At 100k rows that's a 10-billion-entry matrix. SVM effectively **fades out above ~100k rows** — this, not accuracy, is why gradient boosting and neural nets took the crown.
- Escape hatch: \`LinearSVC\` / \`SGDClassifier(loss='hinge')\` optimize the same hinge objective in roughly linear time — but only for the linear kernel.
- **No native probabilities.** SVM outputs a signed distance, not P(y=1). \`probability=True\` fits a separate Platt-scaling model — slow and often poorly calibrated.
- **SVR** — same machinery for regression: instead of keeping points *outside* the street, fit a tube of width ε and only points landing *outside* the tube pay a penalty.
- **Multi-class** — SVM is binary at heart. sklearn's \`SVC\` builds **one-vs-one**: n(n−1)/2 classifiers that vote (10 classes → 45 models, but each trains on only 2 classes' data). \`LinearSVC\` uses **one-vs-rest**: n classifiers, each "this class vs everything else". OvO costs more models, OvR costs more rows per model.`,
    },
  ],
  quiz: [
    {
      question: 'You delete a training point that sits far from the decision boundary and re-train the SVM. What happens?',
      options: [
        { text: 'The boundary shifts slightly toward the deleted point\'s class', explanation: 'That is logistic-regression behaviour — every point contributes to its loss. In SVM a point past its margin has hinge loss exactly 0.' },
        {
          text: 'Nothing — the boundary is identical, because only support vectors define it',
          explanation: 'Correct. Non-support-vectors have zero hinge loss and zero influence. This is why the trained model can throw the rest of the data away.',
        },
        { text: 'The margin widens, since there is one fewer constraint', explanation: 'It was never a binding constraint. Only points on or inside the margin constrain the street.' },
      ],
      correct: 1,
    },
    {
      question: 'Your SVM overfits badly. Which change to C is the right direction, and why?',
      options: [
        {
          text: 'Decrease C — it makes violations cheaper, widening the margin and increasing regularization',
          explanation: 'Correct. C is the INVERSE of regularization strength: smaller C = stronger regularization = wider, smoother margin.',
        },
        { text: 'Increase C — more regularization pressure', explanation: 'Backwards. Larger C punishes violations harder, narrowing the margin and bending the boundary around noise — more overfitting, not less.' },
        { text: 'C does not affect overfitting; only gamma does', explanation: 'Both do. C controls violation tolerance, gamma controls influence radius — either one alone can overfit you.' },
      ],
      correct: 0,
    },
    {
      question: 'What exactly is the "trick" in the kernel trick?',
      options: [
        { text: 'Mapping data to a higher-dimensional space where it becomes separable', explanation: 'That is the LIFT — the setup, not the trick. Explicit lifting is what the trick avoids.' },
        { text: 'Using a faster algorithm to compute the feature mapping φ', explanation: 'No faster mapping is computed. φ is never evaluated at all.' },
        {
          text: 'The algorithm only ever needs dot products between points, so a kernel returns that lifted dot product directly — φ is never built',
          explanation: 'Correct. Data enters the optimization solely as x_i · x_j, so substituting K(x_i, x_j) buys the huge space at the small space\'s cost.',
        },
      ],
      correct: 2,
    },
    {
      question: 'With an RBF kernel you set gamma very large. What do you expect?',
      options: [
        { text: 'A smooth, almost straight boundary', explanation: 'That is SMALL gamma — wide influence, everything blurs together, underfit.' },
        {
          text: 'Tight islands of prediction around individual training points — high training accuracy, poor test accuracy',
          explanation: 'Correct. Large gamma = tiny influence radius, so each point only speaks for its immediate neighbourhood. It behaves like 1-NN. The sweep in the module: train 1.000, test 0.933.',
        },
        { text: 'The kernel degenerates to a linear kernel', explanation: 'It is small gamma that flattens toward near-linear behaviour, not large.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is hard-margin SVM almost never used in practice?',
      options: [
        {
          text: 'It demands perfect linear separability — one mislabelled point and there is no solution at all',
          explanation: 'Correct. And even when a solution exists, a single near-outlier can crush the margin to a sliver. Soft margin buys robustness with a penalty term.',
        },
        { text: 'It is too slow to train', explanation: 'Speed is not the issue — feasibility is. Hard margin can simply have no solution.' },
        { text: 'It cannot use kernels', explanation: 'Kernels are orthogonal to hard/soft margin; both formulations kernelize fine.' },
      ],
      correct: 0,
    },
    {
      question: 'Hinge loss for a correctly classified point sitting well beyond the margin is…',
      options: [
        { text: 'Small but positive, shrinking with distance', explanation: 'That is cross-entropy behaviour — never quite zero, so every point keeps nudging the model.' },
        { text: 'Negative, rewarding confidence', explanation: 'Losses are never negative here; max(0, ·) floors it at zero. There is no reward for extra confidence.' },
        {
          text: 'Exactly zero',
          explanation: 'Correct: max(0, 1 − y·f(x)) = 0 once y·f(x) ≥ 1. This zero is precisely why non-support-vectors have no influence on the model.',
        },
      ],
      correct: 2,
    },
    {
      question: 'You have 800k rows and 20 features. Your kernel SVM has been training for six hours. Best diagnosis?',
      options: [
        { text: 'gamma is misconfigured — retune it', explanation: 'Hyperparameters change the fit, not the fundamental cost. The n×n kernel matrix is 640 billion entries regardless of gamma.' },
        {
          text: 'Expected — kernel SVM training is roughly O(n²)–O(n³); at this scale switch to LinearSVC/SGD or gradient boosting',
          explanation: 'Correct. This scaling wall — not accuracy — is why boosting and neural nets displaced SVM on large tabular data.',
        },
        { text: 'The data needs scaling; scaling would fix the runtime', explanation: 'Scaling is mandatory for correctness and helps convergence, but it does not change the quadratic-to-cubic complexity.' },
      ],
      correct: 1,
    },
    {
      question: 'For text classification with 50,000 TF-IDF features and 5,000 documents, which kernel do you try first?',
      options: [
        {
          text: 'Linear — high-dimensional sparse data is usually already linearly separable, and it is far cheaper',
          explanation: 'Correct. With features ≫ rows, a separating hyperplane almost always exists in the original space. RBF adds cost and overfitting risk for no gain.',
        },
        { text: 'RBF — it is the default workhorse, so it is always the safe first try', explanation: 'RBF is the default for LOW-dimensional non-linear data. In 50k dimensions it tends to overfit and buys nothing.' },
        { text: 'Polynomial degree 4 — text needs feature interactions', explanation: 'Degree-4 on 50k features is numerically nasty and enormously expensive. Word interactions are better captured by n-gram features than by a high-degree kernel.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Whiteboard: explain SVM in two minutes without writing a single formula.',
      answer:
        'Infinitely many lines separate two clean classes, and training accuracy cannot choose between them. SVM picks the one with the widest empty street around it, because a wide street tolerates new points landing slightly off. The street stops widening when it hits points on both kerbs — the support vectors; every other point can be deleted with zero effect on the model. Real data is messy, so we let points cross into the street and charge a fine per violation — that fine is C. And when no straight boundary exists at all, we conceptually lift the data into a higher-dimensional space where one does; the kernel trick computes what that lift would have produced without ever performing it, because the algorithm only ever needs dot products between points. Delivering that story before touching notation is what scores.',
      isCaseBased: false,
    },
    {
      question: 'Explain the kernel trick to someone who understands dot products but not SVMs.',
      answer:
        'Start with the fact that a dot product is a similarity score. The SVM\'s optimization problem, written in its dual form, touches your data in exactly one way: dot products x_i · x_j. It never needs a coordinate. So imagine mapping each point through φ into a much bigger space where the classes separate — the algorithm still only needs φ(x_i) · φ(x_j). If some cheap function K(x, z) returns that number directly, you can drop it in and the solver is none the wiser. Concrete: (x·z)² in 2D equals the honest dot product of the 3D features (x₁², √2·x₁x₂, x₂²) — I can show that with two numbers. RBF corresponds to an infinite-dimensional φ, and still costs one exponential of a squared distance. The trick is not the lift, it is that the lift never happens.',
      isCaseBased: false,
    },
    {
      question: 'Case: your RBF SVM scores 100% on training data and 71% on the test set. Walk through your diagnosis and fixes, in order.',
      answer:
        'Train-perfect plus a large test gap is the overfitting signature, and RBF has exactly two knobs that produce it. (1) gamma too high — influence radius so small that each point becomes its own island (effectively 1-NN); check by inspecting the support-vector count, which balloons toward n. (2) C too high — near-hard margin, zero tolerance for violations, boundary contorted around noise. (3) Check whether scaling is present and *inside* a Pipeline — an unscaled feature can make the effective gamma per-feature absurd, and scaling fitted outside CV leaks. Fix: cross-validated log-grid over C × gamma jointly, not one at a time — they interact. Then sanity-check that the grid optimum is not on the edge of the grid. If the honest CV score still sits near 71%, the model is not the problem; get more data or better features. Also worth naming: with n small and features many, an RBF SVM has enough capacity to memorize anything — try the linear kernel as a baseline first.',
      isCaseBased: true,
    },
    {
      question: 'Why does maximizing the margin help generalization? Give an intuitive and a slightly formal answer.',
      answer:
        'Intuitive: a test point is a training point plus a small perturbation. If the boundary sits in the middle of a wide empty street, perturbations up to half the street width cannot flip the prediction. A boundary hugging the training points flips on the tiniest wobble. Formal-ish: the margin bounds generalization independently of dimensionality — VC-style bounds for margin classifiers depend on the ratio of data radius to margin, not on the number of features. That is exactly why an SVM can operate in an infinite-dimensional RBF space and not automatically overfit: capacity is controlled by margin, not by dimension count. Honest caveat: those bounds are loose in practice; the intuitive argument is the one that predicts real behaviour.',
      isCaseBased: false,
    },
    {
      question: 'C in sklearn — what is it, and which direction regularizes?',
      answer:
        'C is the penalty weight on the total hinge loss: minimize ½‖w‖² + C·Σ hinge. Large C makes violations expensive, so the optimizer sacrifices margin width to satisfy points — narrow margin, high variance, WEAK regularization. Small C makes violations cheap, so it buys a wide margin and eats errors — high bias, STRONG regularization. The one thing to say out loud: C is the *inverse* of regularization strength, which is backwards from Ridge/Lasso\'s alpha, and it trips people up in interviews. A useful diagnostic to mention: as C decreases, the support-vector count should increase, because a wider street touches more points.',
      isCaseBased: false,
    },
    {
      question: 'Compare SVM with logistic regression. When would you pick each?',
      answer:
        'Both draw a linear boundary in the (possibly kernelized) feature space; the loss differs and that difference is everything. Hinge loss is exactly zero past the margin, so SVM is defined by a handful of boundary points and ignores far-away points entirely — robust to distant outliers, compact at predict time. Log loss is never zero, so every point keeps voting, which gives logistic regression a calibrated probability. Pick logistic when you need P(y=1) for thresholding, ranking, or expected-value decisions, when n is large (it scales linearly), or when you must explain coefficients. Pick SVM for small-to-medium n with a clear separation gap, for high-dimensional data like text, or when the kernel trick buys you non-linearity without feature engineering. Above ~100k rows the choice usually collapses to logistic regression or gradient boosting anyway, on cost alone.',
      isCaseBased: false,
    },
    {
      question: 'Case: you ship an SVM that scored 0.94 in your notebook. In production it scores 0.61. The data distribution has not shifted. What do you check first?',
      answer:
        'The number one suspect for an SVM specifically is **scaling**: if StandardScaler was fitted in the notebook but the production path feeds raw features (or refits the scaler on each incoming batch), every distance the model computes is meaningless — and SVM is pure distance. Check that scaler and model travel together as one serialized Pipeline. Second: the same bug in reverse during evaluation — a scaler fitted on the full dataset before splitting leaks test statistics and inflates the notebook number, so 0.94 was never real. Third: feature ordering and dtype at the serving boundary — a silently reordered column vector is catastrophic for a distance-based model and silent for a tree. Fourth: if the pipeline uses probability=True, check whether the Platt calibration was refit consistently. Order matters here: verify the exact preprocessing artifact before touching hyperparameters.',
      isCaseBased: true,
    },
    {
      question: 'Why is feature scaling mandatory for SVM but optional for a decision tree?',
      answer:
        'SVM works in distances and dot products: ‖x − z‖² in the RBF kernel, x·z in the linear one. A feature ranging 0–100,000 dominates one ranging 0–1 by nine orders of magnitude in squared distance, so the small feature is effectively deleted, and a single gamma cannot serve both scales. The margin itself is measured in those same units. A decision tree only asks "is feature j above threshold t?" — a monotone rescaling changes t and nothing else, so splits, and therefore the tree, are unchanged. General rule to state: distance- and gradient-based models (SVM, k-NN, k-means, PCA, neural nets, regularized linear models) need scaling; tree-based ones do not.',
      isCaseBased: false,
    },
    {
      question: 'SVM was the state of the art in 2005 and is rarely a first choice in 2025. What changed?',
      answer:
        'Data volume plus complexity. Kernel SVM training is roughly O(n²)–O(n³) and stores an n×n kernel matrix, so it hits a wall around 10⁵ rows — precisely when datasets started routinely exceeding that. Gradient boosting (XGBoost/LightGBM) matched or beat it on tabular data while training in near-linear time, handling mixed types and missing values natively, and needing no scaling. Neural nets took over unstructured data by learning features instead of relying on a fixed kernel. SVM also gives no calibrated probabilities and no native multi-class. Where it still wins: small-to-medium n with high dimensionality — text with few labelled documents, bioinformatics with a thousand samples and twenty thousand genes.',
      isCaseBased: false,
    },
    {
      question: 'How does an SVM handle 10 classes, and what does that cost?',
      answer:
        'It does not, natively — the formulation is binary. sklearn\'s SVC uses **one-vs-one**: train n(n−1)/2 = 45 binary classifiers, each on only the rows of its two classes, and have them vote. sklearn\'s LinearSVC uses **one-vs-rest**: 10 classifiers, each "class k vs everything else", and take the highest decision value. The tradeoff: OvO trains many more models but each sees a small, balanced slice — good when per-model cost is superlinear in n, which is exactly SVM\'s situation, hence the default. OvR trains few models but each sees all n rows and a heavily imbalanced 1:9 target. Worth adding: OvR decision values are on different scales across classifiers, so argmax over them is a heuristic, not a probability.',
      isCaseBased: false,
    },
    {
      question: 'Case: on a fraud dataset with 0.5% positives your RBF SVM reports 99.5% accuracy. The stakeholder is delighted. What do you say?',
      answer:
        'That 99.5% is exactly what "predict negative always" scores — accuracy is meaningless at that base rate, and the SVM has probably learned the majority class because every fraud case is cheap to misclassify relative to the margin gain. Report precision, recall, and PR-AUC instead. Fixes in order: (1) class_weight=\'balanced\', which scales C per class so each fraud violation costs ~200× a normal one — this is the SVM-native lever and costs nothing; (2) threshold moving on decision_function rather than sign(), tuned to the business cost of a missed fraud versus a false alarm; (3) resampling (SMOTE) only inside CV folds, never before splitting; (4) honestly, at fraud-scale row counts a gradient-boosted model with the same class weighting is usually the better tool. Assumption to state out loud: the right operating point depends on the cost ratio between a missed fraud and a blocked good customer — ask for that number before tuning anything.',
      isCaseBased: true,
    },
    {
      question: 'Can you use SVM for regression? How does it change?',
      answer:
        'Yes — SVR. The geometry inverts: for classification you want points *outside* the street, for regression you fit a tube of width ε around the prediction line and want points *inside* it. Points landing within ±ε pay zero loss (the ε-insensitive loss — the direct analogue of hinge being zero past the margin), and only the ones outside pay, linearly, weighted by C. Consequences carry over exactly: only the points on or outside the tube become support vectors, kernels work unchanged so you get non-linear regression for free, scaling is still mandatory — including the target, since ε is in the target\'s units — and the O(n²)–O(n³) wall is still there.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Max-margin idea in one line', back: 'Infinitely many lines separate the data; pick the one with the widest empty street around it, because a wide street tolerates new points landing slightly off.' },
    { front: 'Support vectors', back: 'The points touching the margin kerbs. They alone define the boundary — delete any other point and the model is identical. Predict time needs only these.' },
    { front: 'Hard vs soft margin', back: 'Hard: zero violations allowed, needs perfect separability, one outlier kills it. Soft: violations allowed at a price. Every real SVM is soft; hard = C→∞.' },
    { front: 'C (sklearn)', back: 'Fine per margin violation. Large C = narrow margin, overfit. Small C = wide margin, more bias. C is the INVERSE of regularization strength.' },
    { front: 'Hinge loss', back: 'max(0, 1 − y·f(x)) with y = ±1. Exactly zero past the margin — which is why non-support-vectors have zero influence. Non-differentiable at the kink.' },
    { front: 'The kernel trick', back: 'The algorithm touches data only through dot products x_i·x_j. A kernel K(x,z) returns φ(x)·φ(z) directly, so you get the huge lifted space at the small space\'s cost — φ is never built.' },
    { front: 'The three kernels', back: 'linear: x·z. poly: (x·z + c)^d. RBF: exp(−γ‖x−z‖²) — the default workhorse, implicitly infinite-dimensional.' },
    { front: 'gamma (RBF)', back: 'How far one example\'s influence reaches. Small γ = wide reach = smooth/underfit. Large γ = tiny reach = islands around points = overfit (behaves like 1-NN).' },
    { front: 'Kernel choice, practical', back: 'High-dim/sparse (text, TF-IDF, genomics) → start LINEAR, it is usually already separable. Low-dim non-linear → RBF. Tune C and γ together on a log grid.' },
    { front: 'SVM\'s scaling wall', back: 'Training ~O(n²)–O(n³) with an n×n kernel matrix → fades above ~100k rows. That cost, not accuracy, is why boosting and neural nets took over. Scaling features is mandatory.' },
  ],
  mindmapMarkdown: `- SVM: Max Margin & the Kernel Trick
  - Max margin
    - Many lines separate; pick widest street
    - Margin = half street width = 1/||w||
    - Wide street absorbs new-point wobble
  - Support vectors
    - Only kerb-touching points define boundary
    - Delete the rest: identical model
    - Memory-light at predict time
    - Robust to far outliers, sensitive near boundary
  - Hard vs soft margin
    - Hard: needs perfect separability, one outlier kills it
    - Soft: allow violations, pay slack penalty
    - Every real SVM is soft
  - C hyperparameter
    - Large C: narrow margin, overfit
    - Small C: wide margin, more bias
    - INVERSE of regularization strength (sklearn)
  - Hinge loss
    - max(0, 1 - y*f(x)), y = +/-1
    - Zero past the margin -> zero influence
    - Non-differentiable kink -> QP not plain GD
    - Cross-ref: Metrics & Losses
  - Kernel trick
    - Problem: not linearly separable here
    - Lift: phi to higher dim where it is
    - Trick: algorithm needs only dot products
    - K(x,z) = phi(x).phi(z), phi never built
    - Cross-ref: math dot product = similarity
  - Kernels
    - linear: x.z
    - poly: (x.z + c)^d
    - RBF: exp(-gamma*||x-z||^2)
    - gamma small: smooth, underfit
    - gamma large: islands, overfit
    - Practice: linear for high-dim/text, RBF for low-dim
  - Limits
    - Scaling mandatory (distance-based)
    - O(n^2)-O(n^3) -> fades above ~100k rows
    - LinearSVC/SGD hinge for linear at scale
    - No native probabilities (Platt scaling)
    - SVR: epsilon-tube instead of street
    - Multi-class: OvO (SVC) vs OvR (LinearSVC)`,
}

export default m
