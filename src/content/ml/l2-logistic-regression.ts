import type { Module } from '../types'

const m: Module = {
  id: 'ml-l2-logistic-regression',
  subjectId: 'ml',
  level: 2,
  title: 'Logistic Regression: Sigmoid, Cross-Entropy & Decision Boundaries',
  whyItMatters:
    'This is the model FAANG interviewers reach for when they want to see if you understand losses. "Why cross-entropy and not MSE?" has a real answer with a gradient in it, and most candidates only manage "because it works better". Logistic regression is also still shipped in production at banks, hospitals and ad servers — it is fast, calibrated, and it explains itself.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'Regression gives a number. Classification gives a verdict.',
      md: `Level 1 predicted rent: **14.2k**. A number on a continuous line. Now change the question.

- Is this email spam? Will this loan default? Is this tumour malignant?
- The answer is a **class** — yes/no, or one of K options. Not a quantity.
- But the honest answer isn't even a class. It's a **probability**: "83% likely spam".
- Probability first, label second. The label appears only after you pick a cutoff.
- The machinery barely changes: still **w·x + b**, with one function bolted onto the end.`,
    },
    {
      type: 'intuition',
      title: 'Why not just fit a line and threshold it?',
      md: `Tempting: encode y as 0/1, run linear regression, call anything above 0.5 "spam". A ruler measuring temperature — it keeps going past boiling. It breaks three ways.

- **Unbounded output.** w·x + b happily returns 1.7 or −0.4. What is a −40% chance of spam?
- **Outliers drag the fit.** One correctly-labelled point far out on the x-axis tilts the whole line, which shifts the 0.5 crossing, which *misclassifies points that were already fine*.
- **No probability semantics.** Fitting MSE to 0/1 labels optimises nothing you can calibrate. A 0.6 from that model does not mean "60% of such cases are positive".
- One function fixes all three: squash the line's output into the open interval (0, 1).`,
    },
    {
      type: 'intuition',
      title: 'The sigmoid: a volume knob with hard stops',
      md: `Turn a volume knob past maximum and it stays at maximum. Turn it below zero and it stays at zero. The sigmoid is that knob, applied to w·x + b.

- Takes **any** real number, returns something strictly between 0 and 1.
- Very negative z → near 0. Very positive z → near 1. z = 0 → exactly **0.5**.
- The shape is an **S**: steep in the middle, flat at both ends.
- We did not throw away linear regression. We *wrapped* it: **ŷ = σ(w·x + b)**.
- The line still does all the thinking. The sigmoid only translates its verdict into a probability.`,
    },
    {
      type: 'math',
      intro: 'The sigmoid, its fixed point, and its derivative — the derivative is the one you must remember.',
      latex: [
        '\\sigma(z) = \\frac{1}{1 + e^{-z}}, \\qquad z = w \\cdot x + b, \\qquad \\hat{y} = \\sigma(z)',
        '\\sigma(0) = \\tfrac{1}{2}, \\qquad \\sigma(z) \\to 0 \\text{ as } z \\to -\\infty, \\qquad \\sigma(z) \\to 1 \\text{ as } z \\to +\\infty',
        '\\sigma^{\\prime}(z) = \\sigma(z)\\bigl(1 - \\sigma(z)\\bigr) \\;\\le\\; \\tfrac{1}{4} \\quad \\text{(max at } z = 0\\text{, } \\to 0 \\text{ at both tails)}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The S-curve and its slope — watch the tails go flat',
      code: `import numpy as np

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

z = np.array([-8.0, -2.0, 0.0, 2.0, 8.0])
p = sigmoid(z)                        # squashed into (0, 1)
slope = p * (1 - p)                   # sigma'(z) = sigma(z)*(1 - sigma(z))
for zi, pi, si in zip(z, p, slope):
    print(f"z={zi:5.1f}  sigma={pi:.4f}  slope={si:.6f}")

# z= -8.0  sigma=0.0003  slope=0.000335
# z= -2.0  sigma=0.1192  slope=0.104994
# z=  0.0  sigma=0.5000  slope=0.250000
# z=  2.0  sigma=0.8808  slope=0.104994
# z=  8.0  sigma=0.9997  slope=0.000335`,
      annotations: {
        4: 'The whole model in one line. Everything else in logistic regression is loss and optimisation.',
        8: 'Cheap derivative: you already computed p, so the slope costs one multiply. This is why sigmoid survived so long.',
        12: 'Saturated: 99.97% sure of class 0, slope 0.000335. Almost no learning signal gets through here.',
        14: 'Peak slope 0.25, at z = 0. The steepest the sigmoid ever gets is a quarter — remember that ceiling.',
      },
    },
    {
      type: 'note',
      md: `Read the slope column again: at z = ±8 the slope is **0.000335**, roughly **750× smaller** than at z = 0. That flatness is **saturation**. Any learning signal that must pass through a saturated sigmoid gets multiplied by nearly zero, so the weight barely moves. With one sigmoid it is survivable. Stack ten of them in a deep network and the signal gets multiplied by ≤ 0.25 ten times over — that is the **vanishing gradient** problem, and it is exactly why ReLU replaced sigmoid in hidden layers. You will meet it again in the Deep Learning subject.`,
    },
    {
      type: 'intuition',
      title: 'The output is a probability. The threshold is a business decision.',
      md: `The model says 0.62. That number *is* the model's entire output. It is not a class yet.

- **0.5 is a default, not a law.** Nothing in the math blesses it. It is just "more likely than not".
- Cancer screening: a miss is catastrophic, a false alarm costs one more test → threshold **0.2**.
- Sending a ₹5,000 retention offer: acting wrongly is expensive → threshold **0.9**.
- Fraud blocking at a bank: the threshold is literally set by the fraud team's budget, not by the data scientist.
- Moving the threshold is **free** — one number, no retraining. Changing the loss is not.
- Choosing it properly means precision, recall, F1 and ROC curves. That is the Metrics subject; this module just hands you the probability.`,
    },
    {
      type: 'intuition',
      title: 'The thing people get wrong: this is a LINEAR classifier',
      md: `The sigmoid is curved, so people assume the decision boundary is curved. It is not. Trace the logic:

- Predict class 1 when σ(z) ≥ 0.5.
- σ(z) ≥ 0.5 happens **exactly when z ≥ 0**. The sigmoid is monotonic, so it never reorders anything.
- So the boundary is **w·x + b = 0** — a line in 2D, a plane in 3D, a hyperplane above that.
- The curvature lives in the *probability*, not in the *boundary*. The sigmoid only controls how fast confidence ramps up as you walk away from the line.
- Consequence: XOR-shaped data is **impossible** for logistic regression, same as for a perceptron.
- Fixes: engineer nonlinear features yourself (x₁·x₂, x², kernels) or switch to a model that bends (trees, SVM with an RBF kernel, a neural net).`,
    },
    {
      type: 'math',
      intro: 'The boundary, and the quantity that is actually linear in x.',
      latex: [
        '\\hat{y} \\ge 0.5 \\iff z \\ge 0 \\iff w \\cdot x + b \\ge 0 \\quad \\text{(a hyperplane: flat, always)}',
        '\\log\\!\\frac{p}{1-p} = w \\cdot x + b \\qquad \\text{the \\textbf{logit} is linear in } x \\text{; the probability is not}',
      ],
    },
    { type: 'visual', component: 'DecisionBoundaryPlayground', props: { model: 'logistic' } },
    {
      type: 'note',
      md: `That straight line separating the two colours **is** w·x + b = 0 — the linear decision surface, drawn. The colour *fade* around it is the sigmoid: solid far from the line, washed out near it, because σ(z) → 0.5 as z → 0. Now switch the model selector to **kNN** or **Tree** on the same dataset: those boundaries are jagged and curved, because those models are not constrained to a hyperplane. Same points, same labels — the shape of the boundary is a property of the *model*, not of the data.`,
    },
    {
      type: 'intuition',
      title: 'Why cross-entropy and not MSE — the interview question',
      md: `Imagine a coach who shouts loudest when you are already doing fine, and whispers when you are about to walk off a cliff. That is MSE paired with a sigmoid. Two problems, both fatal.

- **It is non-convex.** MSE(σ(w·x + b)) is not convex in w — the bowl grows bumps and flat shelves, so gradient descent can park in a local minimum. Cross-entropy with a sigmoid **is** convex: one bottom, guaranteed.
- **Its gradient vanishes exactly when you are wrong.** MSE's gradient carries a σ′(z) factor. "Confidently wrong" means |z| is large, which means σ′(z) ≈ 0, which means **no update**. Learning stalls at the precise moment it should be fastest.
- Cross-entropy is built so that σ′ **cancels** in the chain rule. What survives is **(ŷ − y)·x** — the same "error × input" from Level 1, with no killer factor attached.
- One-line answer to memorise: *"Cross-entropy's gradient is proportional to how wrong the model is; MSE's is proportional to how wrong it is times how unwilling the sigmoid is to move."*`,
    },
    {
      type: 'math',
      intro: 'Log loss for one sample, then the full objective. y is 0 or 1, so exactly one term survives per sample.',
      latex: [
        '\\mathcal{L}(\\hat{y}, y) = -\\bigl[\\, y \\log \\hat{y} + (1-y) \\log (1 - \\hat{y}) \\,\\bigr]',
        'y = 1 \\;\\Rightarrow\\; \\mathcal{L} = -\\log \\hat{y} \\qquad \\bigl(\\, 0 \\text{ when } \\hat{y} = 1, \\quad \\to \\infty \\text{ when } \\hat{y} \\to 0 \\,\\bigr)',
        'J(w, b) = -\\frac{1}{m} \\sum_{i=1}^{m} \\Bigl[\\, y^{(i)} \\log \\hat{y}^{(i)} + (1-y^{(i)}) \\log (1 - \\hat{y}^{(i)}) \\,\\Bigr]',
      ],
    },
    {
      type: 'math',
      intro: 'The cancellation — the three lines an interviewer wants to see on the whiteboard. The denominator of the first factor is exactly the second factor, so they annihilate.',
      latex: [
        '\\frac{\\partial \\mathcal{L}}{\\partial \\hat{y}} = \\frac{\\hat{y} - y}{\\hat{y}(1 - \\hat{y})}, \\qquad \\frac{\\partial \\hat{y}}{\\partial z} = \\sigma^{\\prime}(z) = \\hat{y}(1 - \\hat{y})',
        '\\frac{\\partial \\mathcal{L}}{\\partial z} = \\frac{\\hat{y} - y}{\\hat{y}(1-\\hat{y})} \\cdot \\hat{y}(1-\\hat{y}) = \\hat{y} - y \\;\\;\\Longrightarrow\\;\\; \\frac{\\partial \\mathcal{L}}{\\partial w} = (\\hat{y} - y)\\, x',
        '\\text{MSE instead: } \\frac{\\partial}{\\partial w} \\tfrac{1}{2}(\\hat{y} - y)^2 = (\\hat{y} - y) \\cdot \\underbrace{\\hat{y}(1 - \\hat{y})}_{\\to\\; 0 \\text{ at the tails}} \\cdot\\, x',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The two gradients, side by side, for one confidently-wrong sample',
      code: `import numpy as np

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

x, y = 1.0, 1.0                                # one sample, true label = 1
for z in [-6.0, -2.0, 0.0, 2.0]:               # z = w*x + b
    p = sigmoid(z)
    g_ce = (p - y) * x                         # cross-entropy gradient
    g_mse = (p - y) * p * (1 - p) * x          # MSE gradient: extra sigma'(z)
    print(f"z={z:5.1f} p={p:.4f} |dCE|={abs(g_ce):.5f} |dMSE|={abs(g_mse):.5f}")

# z= -6.0 p=0.0025 |dCE|=0.99753 |dMSE|=0.00246
# z= -2.0 p=0.1192 |dCE|=0.88080 |dMSE|=0.09248
# z=  0.0 p=0.5000 |dCE|=0.50000 |dMSE|=0.12500
# z=  2.0 p=0.8808 |dCE|=0.11920 |dMSE|=0.01252`,
      annotations: {
        7: 'z goes from catastrophically wrong (−6, true label is 1) to right (+2). Watch which loss reacts.',
        9: 'The whole cross-entropy gradient: prediction minus truth, times input. Nothing else.',
        10: 'The same thing, throttled by sigma\'(z). That extra factor is the entire argument against MSE.',
        13: 'The disaster row: model 99.75% sure of the WRONG answer. CE pushes with 0.998, MSE with 0.0025.',
      },
    },
    {
      type: 'note',
      md: `Row one is the whole interview answer. The model is **99.75% confident of the wrong label** — the worst state it can be in. Cross-entropy pushes back with **0.998**; MSE pushes with **0.0025**, about **400× weaker**, at the exact moment correction matters most. Worse, MSE's *strongest* push (0.125) lands at z = 0, where the model has no opinion at all. That is the backwards coach: loud when you are fine, silent at the cliff edge.`,
    },
    {
      type: 'note',
      md: `**More than two classes.** Replace the sigmoid with **softmax**: K linear scores in, a proper probability distribution out (all positive, sums to 1), trained with **categorical cross-entropy** — same formula, summed over classes, and with one-hot labels only the true class's term survives. Two ways to get there: **one-vs-rest** trains K independent binary classifiers ("class k vs everything else") and takes the argmax — simple, parallel, but the K scores are calibrated separately and do not sum to 1. **Multinomial** trains a single model over all classes at once, which is what you want when the classes genuinely compete and you need comparable probabilities; it is scikit-learn's default. And softmax with K = 2 collapses algebraically back to the sigmoid — it is the same object, generalised.`,
    },
    {
      type: 'math',
      intro: 'Softmax and categorical cross-entropy. Note the gradient is still the same beautiful shape.',
      latex: [
        '\\text{softmax}(z)_k = \\frac{e^{z_k}}{\\sum_{j=1}^{K} e^{z_j}}, \\qquad J = -\\sum_{k=1}^{K} y_k \\log \\hat{y}_k',
        '\\frac{\\partial J}{\\partial z_k} = \\hat{y}_k - y_k \\qquad \\text{(prediction minus one-hot truth — again)}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'scikit-learn: fit, predict_proba, coefficients — and the C gotcha',
      code: `import numpy as np
from sklearn.linear_model import LogisticRegression

rng = np.random.default_rng(0)
hours = rng.uniform(0, 10, 400)                  # hours studied
attend = rng.uniform(0, 100, 400)                # attendance %
z = 0.7 * hours + 0.03 * attend - 5.0            # the truth hidden in the data
y = (rng.random(400) < 1 / (1 + np.exp(-z))).astype(int)
X = np.c_[hours, attend]

clf = LogisticRegression(C=1.0).fit(X, y)        # C = INVERSE regularization strength
print("coef       :", clf.coef_.round(3), "intercept:", clf.intercept_.round(3))
print("odds ratio :", np.exp(clf.coef_).round(3))
print("accuracy   :", round(clf.score(X, y), 3))

new = np.array([[2.0, 40.0], [5.0, 35.0], [8.0, 90.0]])
proba = clf.predict_proba(new)[:, 1]
print("P(pass)    :", proba.round(3))
print("thr 0.5    :", (proba >= 0.5).astype(int))
print("thr 0.3    :", (proba >= 0.3).astype(int))

strong = LogisticRegression(C=0.01).fit(X, y)    # SMALL C = STRONG regularization
print("C=0.01 coef:", strong.coef_.round(3))

# coef       : [[0.707 0.028]] intercept: [-5.01]
# odds ratio : [[2.028 1.029]]
# accuracy   : 0.82
# P(pass)    : [0.078 0.381 0.96 ]
# thr 0.5    : [0 0 1]
# thr 0.3    : [0 1 1]
# C=0.01 coef: [[0.525 0.023]]`,
      annotations: {
        7: 'We plant a known truth: 0.7 per study hour, 0.03 per attendance point, −5.0 intercept. Now see if the fit finds it.',
        11: 'Reads like "capacity" and behaves like it: C is 1/lambda. Bigger C = weaker penalty = larger coefficients.',
        17: 'predict_proba returns both columns; [:, 1] is P(class 1). predict() is just this thresholded at 0.5.',
        20: 'Same model, same coefficients, one different number — the borderline student flips to "pass". No retraining.',
        25: 'Recovered 0.707 and 0.028 against the planted 0.7 and 0.03. Logistic regression is estimating the real log-odds.',
        27: '82%, not 100% — the labels were generated with randomness, so this is the irreducible ceiling, not underfitting.',
        31: 'C dropped 100x and the coefficients shrank 0.707 to 0.525. Small C, strong penalty. That is the gotcha.',
      },
    },
    {
      type: 'note',
      md: `**C is inverse regularization strength** — the classic scikit-learn trap. Small C = strong penalty = shrunk coefficients (0.707 → 0.525 above, dragged toward zero). Large C = weak penalty = the model follows the data. Every *other* regularized sklearn model — Ridge, Lasso, ElasticNet — uses \`alpha\`, where **bigger means more** regularization. Opposite direction, same library, no warning. Two more things people miss: \`LogisticRegression\` applies **L2 by default at C=1.0**, so you are regularizing whether you meant to or not; and the penalty is scale-sensitive, so an unscaled column gets penalised differently from a scaled one — **standardize your features** before you trust any coefficient.`,
    },
    {
      type: 'intuition',
      title: 'Reading the coefficients: log-odds and odds ratios',
      md: `The coefficient on *hours* was 0.707. That is **not** "+0.707 probability per hour" — probability is not linear here. The log-odds are.

- One extra study hour adds **0.707 to the log-odds** of passing.
- Exponentiate to get the **odds ratio**: e^0.707 ≈ **2.03**.
- Plain English: *"one more study hour roughly doubles the odds of passing."* That sentence **is** the model.
- Attendance: e^0.028 ≈ 1.029 → each attendance point adds ~2.9% to the odds. Small per unit, but the range is 0–100.
- This is why banks, insurers and hospitals still ship logistic regression: a regulator can be handed the exact reason an application was rejected. A gradient-boosted forest cannot do that without extra machinery.
- Honest caveat: coefficients only read cleanly if features are **scaled comparably and not collinear**. Two correlated features split the credit arbitrarily between themselves, and both coefficients then lie.`,
    },
    {
      type: 'intuition',
      title: 'When logistic regression is still the right answer',
      md: `It is 70 years old and it is not going anywhere. Five situations where it wins outright:

- **As the baseline, always.** Seconds to fit, gives you a number to beat. If XGBoost only beats it by 0.4% AUC, that *is* your result — ship the simple one.
- **High-dimensional sparse text.** Bag-of-words or TF-IDF with 100k features plus L2/L1: competitive with anything, trains in seconds, no GPU.
- **You need calibrated probabilities.** It optimises log loss directly, so its outputs usually mean what they say out of the box. Trees and forests do not — they need Platt scaling or isotonic regression bolted on.
- **You must explain the decision.** Credit, insurance, medicine, anything a regulator reads.
- **Tight latency or memory budget.** One dot product per prediction; the model is a vector of floats.
- Walk away when the signal genuinely lives in **feature interactions and nonlinearity** and nobody will hand-engineer them. Then it is trees, boosting, or a network.`,
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `import numpy as np

THRESHOLD = 0.5   # <-- change me: 0.3, 0.5, 0.8

sigmoid = lambda z: 1 / (1 + np.exp(-z))

X = np.array([[1., 1.], [2., 1.], [1., 2.], [4., 4.], [5., 4.], [4., 5.]])
y = np.array([0., 0., 0., 1., 1., 1.])

w, b = np.zeros(2), 0.0
for _ in range(400):                       # plain gradient descent on log loss
    g = sigmoid(X @ w + b) - y             # the whole gradient lives in this residual
    w -= 0.3 * (X.T @ g) / len(y)
    b -= 0.3 * g.mean()

print('weights', w.round(3), ' bias', round(b, 3))
p = sigmoid(X @ w + b)
print('train p', p.round(3))
print('train y', (p >= THRESHOLD).astype(int), ' true', y.astype(int))

probe = np.array([[2.5, 2.5], [3.0, 2.8], [3.5, 3.0], [9., 9.]])
pp = sigmoid(probe @ w + b)
for pt, prob in zip(probe, pp):
    print(f'  x={pt}  p={prob:.3f}  ->  label {int(prob >= THRESHOLD)}')
print(f'saturation: z at [9,9] = {probe[3] @ w + b:.2f}  ->  p = {pp[3]:.8f} (never exactly 1)')`,
        precomputedOutput: `weights [1.171 1.171]  bias -6.097
train p [0.023 0.07  0.07  0.963 0.988 0.988]
train y [0 0 0 1 1 1]  true [0 0 0 1 1 1]
  x=[2.5 2.5]  p=0.440  ->  label 0
  x=[3.  2.8]  p=0.667  ->  label 1
  x=[3.5 3. ]  p=0.820  ->  label 1
  x=[9. 9.]  p=1.000  ->  label 1
saturation: z at [9,9] = 14.98  ->  p = 0.99999969 (never exactly 1)`,
        caption: 'Weights and probabilities are fixed after training — only THRESHOLD moves. Watch the four probe labels: 0.3 gives [1 1 1 1], 0.5 gives [0 1 1 1], 0.8 gives [0 0 1 1]. Nothing was retrained. Then look at the last line: z = 14.98 is 15 units from the boundary and p is still 0.99999969, not 1 — that flatness is why the sigmoid gradient dies far from the boundary.',
      },
    },
  ],
  quiz: [
    {
      question: 'Why does logistic regression apply a sigmoid instead of using w·x + b directly as the answer?',
      options: [
        {
          text: 'To squash any real number into (0, 1) so the output can be read as a probability',
          explanation: 'Correct. The raw line is unbounded — it returns 1.7 or −0.4, which are not probabilities. The sigmoid bounds it and gives calibratable output.',
        },
        { text: 'To make the decision boundary curved', explanation: 'It does not. σ is monotonic, so σ(z) ≥ 0.5 exactly when z ≥ 0 — the boundary stays a hyperplane.' },
        { text: 'To speed up training', explanation: 'The sigmoid adds work, not speed. Its value is bounded, probabilistic output.' },
      ],
      correct: 0,
    },
    {
      question: 'A model outputs z = w·x + b = −3 for a sample whose true label is 1. Which loss produces the larger weight update?',
      options: [
        { text: 'MSE — squaring amplifies large errors', explanation: 'Squaring amplifies the LOSS value, not the gradient. MSE\'s gradient is multiplied by σ′(z), which is ~0.045 here, throttling it.' },
        { text: 'Both are identical after the chain rule', explanation: 'They differ by exactly the σ′(z) factor. That factor is the whole point of the question.' },
        {
          text: 'Cross-entropy — its gradient is (ŷ − y)·x with no σ′(z) factor',
          explanation: 'Correct. σ′ cancels in cross-entropy\'s chain rule. MSE keeps it, and at z = −3 it is tiny, so MSE barely moves the weights while the model is confidently wrong.',
        },
      ],
      correct: 2,
    },
    {
      question: 'In scikit-learn, you change LogisticRegression(C=1.0) to LogisticRegression(C=0.01). What happens?',
      options: [
        { text: 'Regularization gets weaker; coefficients grow', explanation: 'Backwards. C is INVERSE strength — lowering C strengthens the penalty.' },
        {
          text: 'Regularization gets stronger; coefficients shrink toward zero',
          explanation: 'Correct. C = 1/λ. This is the opposite convention from Ridge/Lasso\'s alpha, which is the classic API gotcha.',
        },
        { text: 'Nothing — C only affects the solver', explanation: 'C is the regularization hyperparameter, not a solver setting.' },
      ],
      correct: 1,
    },
    {
      question: 'Your logistic regression gets ~50% accuracy on XOR-shaped data (two diagonal corner pairs). Why?',
      options: [
        { text: 'The learning rate is too high', explanation: 'This is not an optimisation failure. Perfect optimisation still cannot solve it.' },
        { text: 'The data needs more samples', explanation: 'Infinite XOR data would not help. The problem is representational, not statistical.' },
        {
          text: 'The decision boundary is a hyperplane, and no single line separates XOR',
          explanation: 'Correct. Logistic regression is a linear classifier. Fix by engineering an interaction feature (x₁·x₂) or switching to a model that can bend.',
        },
      ],
      correct: 2,
    },
    {
      question: 'A fraud model outputs 0.62 for a transaction. What is the correct statement?',
      options: [
        {
          text: 'That number is the model\'s full output; converting it to block/allow requires a threshold chosen from business cost',
          explanation: 'Correct. 0.5 is a convention, not a result. Threshold moving is free and is where precision/recall tradeoffs get made.',
        },
        { text: 'It is fraud, because 0.62 > 0.5', explanation: 'Only if you accepted 0.5 as the cutoff. For fraud, the cutoff is set by the cost of a false block vs a missed fraud.' },
        { text: 'The model is 62% accurate on this sample', explanation: 'Confuses a per-sample probability with a dataset-level metric. Accuracy is not defined for one prediction.' },
      ],
      correct: 0,
    },
    {
      question: 'A coefficient on "number of late payments" is 0.9. What does that mean in plain language?',
      options: [
        { text: 'Each late payment adds 0.9 to the predicted probability of default', explanation: 'Probability is not linear in x. Adding 0.9 would push probabilities past 1 immediately.' },
        { text: 'Late payments explain 90% of defaults', explanation: 'Coefficients are not variance shares. That is a different quantity entirely.' },
        {
          text: 'Each late payment adds 0.9 to the log-odds; e^0.9 ≈ 2.46, so the odds of default roughly 2.5×',
          explanation: 'Correct. Coefficients are log-odds; exponentiating gives the odds ratio. This is exactly how logistic regression is reported in regulated industries.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Why is σ′(z) ≈ 0 at large |z| a problem beyond the MSE-vs-cross-entropy argument?',
      options: [
        { text: 'It makes predict_proba return exactly 0 or 1', explanation: 'Values get very close to 0/1 but the real issue is the learning signal, not the printed number.' },
        {
          text: 'Stacked sigmoids multiply these small factors together, so gradients vanish in deep networks',
          explanation: 'Correct. σ′ ≤ 0.25, so ten layers multiply by ≤ 0.25^10. This vanishing-gradient problem is why ReLU replaced sigmoid in hidden layers.',
        },
        { text: 'It breaks convexity of the cross-entropy loss', explanation: 'Cross-entropy with a sigmoid stays convex regardless. Saturation affects gradient magnitude, not convexity.' },
      ],
      correct: 1,
    },
    {
      question: 'You need probabilities from a 5-class classifier that sum to 1 and are comparable across classes. Which setup?',
      options: [
        { text: 'One-vs-rest: 5 independent binary logistic regressions', explanation: 'Works for picking a winner, but the 5 scores come from separately-calibrated models and do not form a proper distribution.' },
        {
          text: 'Multinomial: one model with softmax + categorical cross-entropy',
          explanation: 'Correct. Softmax normalises across classes by construction, and the single joint fit makes the probabilities mutually comparable.',
        },
        { text: 'Five regressions with MSE, then normalise the outputs', explanation: 'Normalising after the fact does not make the numbers probabilities, and MSE reintroduces the vanishing-gradient problem.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why cross-entropy and not MSE for classification? Give the gradient argument.',
      answer:
        'Two reasons. (1) **Convexity**: MSE composed with a sigmoid is non-convex in w, so gradient descent can land in a local minimum; cross-entropy with a sigmoid is convex — one global bottom. (2) **The gradient**, which is the real answer. For MSE, ∂L/∂w = (ŷ−y)·σ′(z)·x, and σ′(z) = ŷ(1−ŷ) → 0 at both tails. So when the model is *confidently wrong* (large |z|, wrong side), σ′ ≈ 0 and the update is ~0 — learning stalls exactly when it should be fastest. For cross-entropy, ∂L/∂ŷ = (ŷ−y)/[ŷ(1−ŷ)] and ∂ŷ/∂z = ŷ(1−ŷ); the two cancel, leaving ∂L/∂z = ŷ−y, so ∂L/∂w = (ŷ−y)·x — the same "error × input" as linear regression, with no throttling factor. Concretely: at z = −6 with true label 1, |dCE/dw| = 0.998 while |dMSE/dw| = 0.0025 — 400× weaker. Third reason if they want it: cross-entropy is the negative log-likelihood of a Bernoulli model, so minimising it is maximum likelihood, which is why the outputs are calibrated probabilities.',
      isCaseBased: false,
    },
    {
      question: 'Is logistic regression a linear or nonlinear model? Defend the answer.',
      answer:
        'Linear classifier, nonlinear link. The decision boundary is σ(z) = 0.5 ⟺ z = 0 ⟺ w·x + b = 0 — a hyperplane, always, because σ is monotonic and cannot reorder points. What is nonlinear is the map from z to probability. Precisely: the **log-odds** log(p/(1−p)) are linear in x; the probability is not. Practical consequence: XOR is unlearnable, and to fit curved boundaries you must supply the nonlinearity yourself as engineered features (products, powers, splines, kernel expansions). The name "regression" also survives for this reason — it is a linear regression on the logit.',
      isCaseBased: false,
    },
    {
      question: 'Derive the cross-entropy gradient on a whiteboard, starting from the loss.',
      answer:
        'L = −[y log ŷ + (1−y) log(1−ŷ)], with ŷ = σ(z), z = w·x + b. Step 1: ∂L/∂ŷ = −y/ŷ + (1−y)/(1−ŷ) = (ŷ−y)/[ŷ(1−ŷ)]. Step 2: ∂ŷ/∂z = σ′(z) = ŷ(1−ŷ). Step 3: multiply — the denominators cancel — ∂L/∂z = ŷ − y. Step 4: ∂z/∂w = x, so ∂L/∂w = (ŷ−y)x and ∂L/∂b = (ŷ−y). Averaged over m samples for the full objective. Say the punchline out loud: "error times input, averaged" — identical in form to linear regression with MSE, which is not a coincidence; both are the natural-parameter gradient of a generalised linear model.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague trained a classifier with MSE on sigmoid outputs. Training loss drops for a few epochs then flatlines high, and the model predicts one class for almost everything. Diagnose.',
      answer:
        'Classic MSE-plus-sigmoid failure. The model has pushed z far to one side; for the misclassified minority, |z| is large and wrong-signed, so σ′(z) ≈ 0 and their gradient contribution is nearly zero — they cannot pull the boundary back. The majority class is already fine and contributes little too. Result: a plateau that looks like convergence but is a dead gradient. Order of fixes: (1) switch the loss to binary cross-entropy — this alone usually fixes it; (2) check for class imbalance, which makes the collapse-to-majority far easier, and add class weights or move the threshold; (3) reduce initial weight magnitude / scale features so the model does not start out saturated. Distinguish it from a genuine plateau by inspecting gradient norms per sample: if the *wrongest* samples have the *smallest* gradients, it is saturation, not underfitting.',
      isCaseBased: true,
    },
    {
      question: 'What does the C parameter do in sklearn\'s LogisticRegression, and what mistake does everyone make with it?',
      answer:
        'C is **inverse** regularization strength: C = 1/λ. Small C → strong penalty → coefficients shrunk toward zero → higher bias, lower variance. Large C → weak penalty → the fit follows the data. The mistake is assuming it matches `alpha` in Ridge/Lasso, where bigger means more regularization — the two conventions run in opposite directions inside the same library, so people accidentally over-regularize when tuning a grid copied from Ridge. Two follow-ups worth volunteering: LogisticRegression applies **L2 by default at C=1.0**, so an unscaled, unregularized fit is not what you got; and because the penalty acts on raw coefficient magnitudes, features on wildly different scales are penalised unequally — standardize first, or the regularization is arbitrary.',
      isCaseBased: false,
    },
    {
      question: 'How do you decide the classification threshold? Why is 0.5 not automatically right?',
      answer:
        '0.5 is only optimal if false positives and false negatives cost the same and the classes are balanced — rarely both true. The threshold is a *decision-theoretic* choice: pick the t that minimises expected cost, C_FP·P(FP|t) + C_FN·P(FN|t). Practically: get probabilities on a validation set, sweep t, and read the precision/recall curve against the business constraint (e.g. "recall ≥ 95% for cancer screening", "precision ≥ 90% before we auto-block a card"). Key engineering point: threshold moving costs nothing — no retraining, one config value, instantly reversible — whereas changing the loss or resampling the data does. So exhaust threshold tuning before touching the model. Caveat: this only works if the probabilities are calibrated; check with a reliability diagram first.',
      isCaseBased: false,
    },
    {
      question: 'One-vs-rest versus multinomial softmax for multi-class. When does the choice matter?',
      answer:
        'OvR trains K independent binary models ("class k vs the rest") and takes the argmax. It is trivially parallel, works with any binary learner, and each model can be tuned separately — but the K scores come from K separately-calibrated sigmoids, so they do not sum to 1 and comparing them is only loosely justified. It also inherits an imbalance problem: each sub-problem is 1-vs-(K−1). Multinomial fits one model with softmax and categorical cross-entropy, producing a genuine distribution over classes and a single convex objective. Choose multinomial when classes are mutually exclusive and you need comparable/calibrated probabilities (ranking, thresholding, downstream expected-cost decisions); choose OvR for multi-*label* problems, where a sample really can belong to several classes at once, or when you need per-class models for operational reasons. Note softmax with K = 2 reduces algebraically to the sigmoid.',
      isCaseBased: false,
    },
    {
      question: 'Interpret a fitted logistic regression for a non-technical stakeholder.',
      answer:
        'Translate coefficients into odds ratios: exponentiate. A coefficient of 0.707 becomes e^0.707 ≈ 2.03 — "one extra unit roughly doubles the odds". The sign tells direction, the magnitude tells strength (only comparable across features if they were standardized). State it in the units the stakeholder uses, not in log-odds. Be honest about the three caveats: (1) odds ≠ probability, and the same odds ratio moves probability a lot near 0.5 and barely at all near 0 or 1; (2) collinear features split credit arbitrarily, so two correlated predictors can each look weak while their combination is strong; (3) these are associations from observational data — not causal effects. This interpretability, with those caveats stated, is precisely why credit and clinical models still use logistic regression.',
      isCaseBased: false,
    },
    {
      question: 'Case: your logistic model scores 0.94 AUC offline. In production, precision collapses. Nothing about the code changed. Walk through it.',
      answer:
        'AUC is threshold-free and prevalence-independent, so a high AUC is fully compatible with terrible production precision. Hypotheses in order: (1) **Prevalence shift** — offline the positive rate was 20%, in production it is 0.5%; precision at a fixed threshold falls with base rate even at identical AUC. Test: compare positive rates; switch to PR-AUC and precision@k as the offline metric. (2) **Threshold carried over blindly** from a balanced or resampled training set — if you used SMOTE or class weights, the output probabilities are shifted and 0.5 means something different. Test: reliability diagram on production scores; recalibrate. (3) **Leakage offline** — a feature available at training time but not at prediction time, or computed after the label. Test: rebuild the feature set with strict point-in-time cuts. (4) **Covariate/feature drift** — an upstream pipeline changed units or started emitting nulls that impute to a very different value. Test: compare feature distributions train vs prod. Order matters: check prevalence and calibration first, because they are cheap and they explain this exact symptom most often.',
      isCaseBased: true,
    },
    {
      question: 'Case: two engineers fit logistic regression on the same data. One standardizes features, one does not. Coefficients differ wildly and so does accuracy. Explain and say who is right.',
      answer:
        'Two separate effects. (1) **Coefficients**: without scaling, a coefficient is "per raw unit", so a feature measured in rupees gets a tiny coefficient and one measured in 0/1 gets a large one — the *models* can still be equivalent, and unstandardized fits are actually easier to explain in domain units. (2) **Accuracy**, which means they are *not* equivalent: sklearn regularizes by default (L2, C=1.0), and the L2 penalty is applied to raw coefficient magnitudes, so unscaled features are penalised unequally — the large-scale feature is effectively over-shrunk. Solvers like lbfgs/saga also converge more slowly or hit max_iter on unscaled data, which can leave the fit unconverged. Verdict: the one who standardized is right for *fitting*; for *reporting*, back-transform to raw units or quote odds ratios per meaningful unit. If you genuinely want no scaling effect, set the penalty to none — then the fits agree up to a linear reparametrisation.',
      isCaseBased: true,
    },
    {
      question: 'Where does the cross-entropy loss actually come from? Do not just say "it works better".',
      answer:
        'Maximum likelihood on a Bernoulli model. Assume y | x ~ Bernoulli(p) with p = σ(w·x + b). The likelihood of one sample is p^y (1−p)^(1−y). Take logs: y log p + (1−y) log(1−p). Sum over the dataset, negate to turn maximisation into minimisation, divide by m — that is exactly binary cross-entropy. So minimising log loss *is* maximum likelihood estimation, and that is why the outputs behave like probabilities rather than arbitrary scores. It also explains the alternative name: log loss, cross-entropy and negative log-likelihood are the same object seen from information theory, ML practice and statistics respectively. Bonus link: minimising cross-entropy is equivalent to minimising the KL divergence between the empirical label distribution and the model\'s.',
      isCaseBased: false,
    },
    {
      question: 'When would you still pick logistic regression over gradient boosting in 2025?',
      answer:
        'Five concrete cases. (1) **Baseline** — always fit it first; if boosting gains only a fraction of a point of AUC, the simpler model wins on maintenance. (2) **High-dimensional sparse text** — TF-IDF with 10⁵–10⁶ features and L2/L1 is where linear models are genuinely state-of-the-art-adjacent and train in seconds. (3) **Calibrated probabilities needed** — it optimises log loss directly, so it is well-calibrated by default; trees need Platt/isotonic post-hoc. (4) **Regulatory explainability** — credit, insurance, clinical decisions, where "why was this rejected" must be answerable in one sentence per feature. (5) **Latency/memory** — one dot product, a vector of floats, trivially servable at the edge. The tradeoff to state honestly: on tabular data with real interactions and nonlinearity, gradient boosting usually wins on raw accuracy, and no amount of feature engineering fully closes that gap cheaply.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Logistic regression hypothesis', back: 'ŷ = σ(w·x + b), σ(z) = 1/(1+e⁻ᶻ). A linear score squashed into (0, 1) and read as P(class = 1).' },
    { front: 'Sigmoid key facts', back: 'Maps ℝ → (0,1). σ(0) = 0.5. S-shaped. σ′(z) = σ(z)(1−σ(z)), max 0.25 at z = 0, → 0 at both tails (saturation).' },
    { front: 'Why not linear regression for classification?', back: 'Unbounded outputs (probabilities > 1 or < 0), outliers tilt the line and shift the boundary, and the outputs carry no probability meaning.' },
    { front: 'Decision boundary of logistic regression', back: 'σ(z) = 0.5 ⟺ z = 0 ⟺ w·x + b = 0. A hyperplane — always LINEAR, despite the curved sigmoid. XOR is unlearnable.' },
    { front: 'Binary cross-entropy (log loss)', back: 'L = −[y log ŷ + (1−y) log(1−ŷ)]. Only one term survives per sample. It is the negative log-likelihood of a Bernoulli model.' },
    { front: 'Why cross-entropy over MSE (one line)', back: 'MSE with sigmoid is non-convex AND its gradient carries σ′(z), which vanishes when the model is confidently wrong. CE cancels σ′ → gradient is (ŷ−y)·x.' },
    { front: 'Cross-entropy gradient', back: '∂L/∂z = ŷ − y, so ∂L/∂w = (ŷ−y)·x. "Error × input" — identical in form to linear regression, no vanishing factor.' },
    { front: 'Multi-class logistic regression', back: 'Softmax: eᶻᵏ / Σⱼ eᶻʲ + categorical cross-entropy. Multinomial = one joint model, probabilities sum to 1. OvR = K independent binary fits, scores not comparable.' },
    { front: 'The sklearn C gotcha', back: 'C = INVERSE regularization strength (C = 1/λ). Small C = strong penalty. Ridge/Lasso use alpha, where bigger = MORE regularization. Opposite convention.' },
    { front: 'Interpreting a coefficient', back: 'It is the change in LOG-ODDS per unit. Exponentiate for the odds ratio: coef 0.7 → e⁰·⁷ ≈ 2.0 → "one unit roughly doubles the odds". Valid only if features are scaled and non-collinear.' },
  ],
  mindmapMarkdown: `- Logistic Regression: Sigmoid, Cross-Entropy & Decision Boundaries
  - Classification vs regression
    - Predict a class / probability, not a number
    - Plain line fails: unbounded, outlier-dragged, no probability meaning
  - Sigmoid
    - σ(z) = 1/(1+e⁻ᶻ): any real number into (0,1), σ(0) = 0.5
    - σ′ = σ(1−σ), max 0.25 at z = 0
  - Saturation
    - Flat tails kill the learning signal
    - Stacked sigmoids → vanishing gradients (Deep Learning)
  - Probability out, threshold in
    - 0.5 is a default, not a law — set it from business cost
    - Free to move, no retraining (Metrics subject)
  - Linear decision boundary
    - w·x + b = 0 is a hyperplane; curved sigmoid, straight boundary
    - Log-odds linear in x; XOR unlearnable
  - Why cross-entropy, not MSE
    - MSE + sigmoid: non-convex, gradient throttled by σ′(z)
    - CE cancels σ′ → gradient = (ŷ − y)·x, vanishes nowhere
  - Multi-class
    - Softmax + categorical cross-entropy
    - Multinomial (probs sum to 1) vs one-vs-rest (K binary fits)
  - sklearn: L2 by default, C is INVERSE strength, scale your features
  - Coefficients are log-odds: exp(coef) = odds ratio, so it explains itself
  - Still wins as: baseline, sparse text, calibration, low latency`,
}

export default m
