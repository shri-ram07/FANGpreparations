import type { Module } from '../types'

const m: Module = {
  id: 'ml-l3-from-scratch-and-projects',
  subjectId: 'ml',
  level: 3,
  title: 'From Scratch in NumPy + The Projects That Get You Hired',
  whyItMatters:
    'Two things separate a candidate who has read about ML from one who has done it: they can write linear regression on a whiteboard without a library, and they have three projects they can defend for twenty minutes each. This module builds both — the from-scratch code you will be asked to derive, and the exact project briefs that read as senior instead of tutorial.',
  estMinutes: 60,
  sections: [
    {
      type: 'intuition',
      title: 'Why implement from scratch at all',
      md: `You will never ship your own linear regression. scikit-learn's is faster, tested, and handles edge cases you have not thought of. So why write one?

- **Because the interview asks you to derive it.** "Write the gradient descent update for logistic regression" is a real question. You cannot fake it from memory of \`.fit()\`.
- **Because a library hides exactly the parts that break.** Convergence, learning rate, feature scale, numeric overflow — \`.fit()\` swallows all four silently.
- Every production bug you will ever debug lives in the hidden part: loss going NaN, weights exploding, a model that trains but predicts one class.
- Once you have written the loop, the library stops being magic. You read its docs as *options*, not as spells.
- Budget: one afternoon. You write three algorithms, you own them forever.`,
    },
    {
      type: 'intuition',
      title: 'One skeleton, three algorithms',
      md: `Analogy: a car, a truck and a bus are different vehicles with the *same* steering wheel. Linear regression, logistic regression and K-Means look different but share one loop shape.

- **Init** — start the parameters somewhere.
- **Repeat**: compute what the model currently thinks → measure the miss → move the parameters to shrink the miss.
- **Stop** when the movement gets tiny, or the budget runs out.
- The only thing that changes between algorithms is *what "the miss" means* and *how you move*.
- Vectorize everything: **no Python loop over samples, ever.** Loop over iterations only.`,
    },
    {
      type: 'math',
      intro: 'Linear regression, written in matrix form. X is (m × n): m samples down, n features across.',
      latex: [
        '\\hat{y} = X w + b \\qquad J(w,b) = \\frac{1}{m}\\lVert \\hat{y} - y \\rVert^2',
        '\\frac{\\partial J}{\\partial w} = \\frac{1}{m} X^{\\top}(\\hat{y} - y) \\qquad \\frac{\\partial J}{\\partial b} = \\frac{1}{m}\\sum_i (\\hat{y}_i - y_i)',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Linear regression from scratch — the whole thing',
      code: `import numpy as np

class LinearRegressionGD:
    def __init__(self, lr=0.1, epochs=200):
        self.lr, self.epochs = lr, epochs

    def fit(self, X, y):
        m, n = X.shape
        self.w, self.b = np.zeros(n), 0.0
        for e in range(self.epochs):
            err = X @ self.w + self.b - y
            self.w -= self.lr * (X.T @ err) / m
            self.b -= self.lr * err.mean()
            if e % 40 == 0:
                print(f"epoch {e:3d}  mse {(err ** 2).mean():7.4f}  w {self.w.round(2)}")
        return self

    def predict(self, X):
        return X @ self.w + self.b

rng = np.random.default_rng(0)
X = rng.normal(size=(200, 3))
y = X @ np.array([2.0, -3.0, 0.5]) + 1.0 + rng.normal(scale=0.1, size=200)
model = LinearRegressionGD().fit(X, y)
print("learned w", model.w.round(3), " b", round(model.b, 3))

# epoch   0  mse 13.9242  w [ 0.2  -0.3   0.04]
# epoch  40  mse  0.0145  w [ 1.96 -2.97  0.49]
# epoch  80  mse  0.0100  w [ 1.99 -3.01  0.5 ]
# epoch 120  mse  0.0100  w [ 1.99 -3.01  0.51]
# epoch 160  mse  0.0100  w [ 1.99 -3.01  0.51]
# learned w [ 1.991 -3.01   0.505]  b 0.996`,
      annotations: {
        9: 'Zeros are a fine start for a convex problem — there is one bottom, any start reaches it. Neural nets need random init to break symmetry; this does not.',
        11: 'Predict AND measure the miss in one line, for all 200 samples at once. X @ self.w is a matrix-vector product: 200 dot products, one BLAS call.',
        12: 'The whole lesson. X.T is (n x m), err is (m,) — so X.T @ err sums err_i * x_i over every sample i, per feature. That IS "error times input, summed"; the / m makes it "averaged".',
        13: 'b has no input factor, so its gradient is just the mean error. Same formula with x = 1.',
        23: 'True weights are [2, -3, 0.5] with intercept 1.0, plus noise of scale 0.1.',
        27: 'Read the output: MSE falls 13.92 -> 0.0100 and stops. 0.01 is the noise variance (0.1^2) — the model has learned everything learnable. Weights land within 0.01 of the truth.',
      },
    },
    {
      type: 'intuition',
      title: 'Reading X.T @ err out loud',
      md: `This one line is the thing people get wrong in interviews. Say it slowly.

- \`err\` is a column of m numbers — one miss per sample.
- \`X.T\` has one **row per feature**, and that row holds that feature's value across all m samples.
- So row *j* of \`X.T\` dotted with \`err\` = Σᵢ errᵢ · xᵢⱼ — "for feature j, how much do the misses line up with this feature?"
- If a feature is large exactly where we over-predict, its weight is too high — the sum is positive — so we subtract. That is the whole update.
- Loop version: \`for i in range(m): dw += err[i] * X[i]\`. Same numbers, ~100× slower.`,
    },
    {
      type: 'note',
      md: `**Shape discipline saves hours.** Before running anything, write the shapes down: X is (m, n), w is (n,), X @ w is (m,), err is (m,), X.T @ err is (n,) — same shape as w, which is exactly what \`w -= ...\` needs. If your shapes do not end where the parameter lives, the math is wrong regardless of what NumPy broadcasts into existence. A silent (m, m) result means you transposed the wrong side.`,
    },
    {
      type: 'math',
      intro: 'Logistic regression: same model, wrapped in a squash, with a different loss.',
      latex: [
        '\\hat{y} = \\sigma(Xw + b), \\quad \\sigma(z) = \\frac{1}{1 + e^{-z}}',
        'J = -\\frac{1}{m}\\sum_i \\left[ y_i \\log \\hat{y}_i + (1-y_i)\\log(1-\\hat{y}_i) \\right]',
        '\\frac{\\partial J}{\\partial w} = \\frac{1}{m} X^{\\top}(\\hat{y} - y) \\quad \\text{— identical to linear regression.}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Logistic regression from scratch — spot the difference',
      code: `import numpy as np

def sigmoid(z):
    out = np.empty_like(z, dtype=float)
    pos = z >= 0
    out[pos] = 1.0 / (1.0 + np.exp(-z[pos]))
    ez = np.exp(z[~pos])
    out[~pos] = ez / (1.0 + ez)
    return out

class LogisticRegressionGD:
    def __init__(self, lr=0.5, epochs=400):
        self.lr, self.epochs = lr, epochs

    def fit(self, X, y):
        m, n = X.shape
        self.w, self.b = np.zeros(n), 0.0
        for e in range(self.epochs):
            err = sigmoid(X @ self.w + self.b) - y
            self.w -= self.lr * (X.T @ err) / m
            self.b -= self.lr * err.mean()
        return self

    def predict(self, X):
        return (sigmoid(X @ self.w + self.b) > 0.5).astype(int)

rng = np.random.default_rng(1)
X = rng.normal(size=(400, 2))
y = (X @ np.array([3.0, -2.0]) + 0.5 + rng.normal(scale=0.5, size=400) > 0).astype(int)
clf = LogisticRegressionGD().fit(X, y)
print("accuracy", (clf.predict(X) == y).mean(), " w", clf.w.round(2))
print("sigmoid(-800) =", sigmoid(np.array([-800.0]))[0], "- no overflow")

# accuracy 0.955  w [ 5.26 -3.79]
# sigmoid(-800) = 0.0 - no overflow`,
      annotations: {
        3: 'The naive 1/(1+np.exp(-z)) overflows for z around -800: exp(800) is inf, and you get a RuntimeWarning plus garbage. Two branches, no overflow, no clipping hack.',
        7: 'For negative z compute exp(z) (tiny, safe) and use e^z / (1 + e^z) — algebraically identical, numerically clean.',
        19: 'The ONLY changed line versus linear regression: the prediction goes through sigmoid. Everything after is byte-identical.',
        20: 'Compare to the linear version. Same characters. Not a coincidence — see the note below.',
        29: 'A linearly separable-ish problem with label noise (scale 0.5), so ~95% is the ceiling, not a bug.',
      },
    },
    {
      type: 'intuition',
      title: 'Why both gradients are the same expression',
      md: `Two different losses, two different link functions, one gradient formula: **∂J/∂w = Xᵀ(ŷ − y)/m**. That is not luck — it is design.

- Squared error pairs with the identity link. Cross-entropy pairs with the sigmoid.
- Each pairing was chosen so the messy derivative factors cancel exactly. σ′(z) = σ(z)(1−σ(z)) cancels against the cross-entropy denominator.
- The general name: these are **canonical link functions** in generalized linear models. Softmax + cross-entropy does the same trick for multi-class.
- Practical payoff: the same backprop code runs regression and classification heads. Only the last layer changes.
- Interview line: *"Use MSE with sigmoid and you break the cancellation — the gradient picks up a σ′ factor that vanishes when the model is confidently wrong, so learning stalls exactly where you need it most."*`,
    },
    {
      type: 'math',
      intro: 'K-Means: minimize inertia — total squared distance from each point to its assigned centroid.',
      latex: [
        'J = \\sum_{i=1}^{m} \\lVert x_i - \\mu_{c(i)} \\rVert^2',
        '\\text{assign: } c(i) = \\arg\\min_j \\lVert x_i - \\mu_j \\rVert^2 \\qquad \\text{update: } \\mu_j = \\text{mean}\\{x_i : c(i)=j\\}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'K-Means from scratch — the distance matrix without a single loop over points',
      code: `import numpy as np

rng = np.random.default_rng(7)
X = np.vstack([rng.normal(c, 0.6, size=(60, 2)) for c in ([0, 0], [4, 4], [8, 0])])

k = 3
C = X[rng.choice(len(X), k, replace=False)]
for it in range(10):
    d = ((X[:, None, :] - C[None, :, :]) ** 2).sum(-1)
    lab = d.argmin(1)
    inertia = d[np.arange(len(X)), lab].sum()
    C_new = np.array([X[lab == j].mean(0) for j in range(k)])
    shift = np.abs(C_new - C).max()
    print(f"iter {it}  inertia {inertia:8.2f}  max centroid move {shift:.5f}")
    if shift < 1e-6:
        break
    C = C_new
print("centroids", C.round(2).tolist())
print("cluster sizes", np.bincount(lab).tolist())

# iter 0  inertia  1819.93  max centroid move 1.80894
# iter 1  inertia   863.90  max centroid move 2.05177
# iter 2  inertia   141.25  max centroid move 0.51238
# iter 3  inertia   107.21  max centroid move 0.00000
# centroids [[3.94, 3.88], [7.97, 0.02], [-0.11, -0.06]]
# cluster sizes [60, 60, 60]`,
      annotations: {
        7: 'Init by sampling k REAL data points, never uniform random coordinates — a centroid in empty space can win zero points and produce a NaN mean. K-Means++ upgrades this by spreading the picks apart.',
        9: 'The broadcasting trick. X[:, None, :] is (m, 1, 2); C[None, :, :] is (1, k, 2). NumPy broadcasts to (m, k, 2), squares, sums the last axis -> an (m, k) matrix of squared distances. No loops.',
        10: 'ASSIGN step: each point takes the nearest centroid. argmin along the k axis.',
        11: 'Inertia = sum of each point distance to ITS centroid. Fancy-index the (m, k) matrix with (row indices, labels).',
        12: 'UPDATE step: each centroid becomes the mean of its members. This is the only place the mean appears — and it is why K-Means minimizes SQUARED distance specifically (the mean is the minimizer of squared error; the median would need L1).',
        13: 'Convergence on centroid movement. Inertia change works too. Never converge on "labels unchanged" alone if you also cap iterations — you want both.',
        21: 'Inertia falls 1819 -> 863 -> 141 -> 107 and then the centroids stop moving. Monotonic by construction: assign can only lower it, update can only lower it. That guarantees termination, NOT a good answer — it can converge to a bad local minimum, which is why n_init exists.',
      },
    },
    { type: 'visual', component: 'KMeansStepper', props: { k: 3 } },
    {
      type: 'note',
      md: `**Three facts about that convergence guarantee.** (1) It is guaranteed to stop, because inertia decreases every step and there are finitely many assignments. (2) It is *not* guaranteed to be good — a bad init converges happily to a bad answer. (3) Therefore you always run it multiple times with different seeds and keep the lowest inertia — that is exactly what scikit-learn's \`n_init\` does, and "why does K-Means need n_init?" is a real interview question with this exact answer.`,
    },
    {
      type: 'intuition',
      title: 'The baseline discipline',
      md: `Before any model, ship a stupid one. Majority class for classification. The median for regression. Last-known-value for time series.

- The baseline is a **ruler**. Without it, "94% accuracy" is a number with no meaning.
- With it, "94% vs a 93.5% baseline" is a verdict — and usually an embarrassing one.
- Report every model against the baseline, in the same table, on the same split. Always.
- A model that cannot beat the baseline is **a finding, not a failure** — it says the features carry no signal for this target, which is genuinely useful information delivered in an afternoon instead of a quarter.
- Say it in the interview: *"My first commit on any project is the dumb baseline."* It is the single cheapest senior signal you can send.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The baseline that makes accuracy look like a liar',
      code: `import numpy as np
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, average_precision_score

X, y = make_classification(n_samples=4000, n_informative=5, weights=[0.94], random_state=0)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, stratify=y, random_state=0)

for name, clf in [("baseline (majority)", DummyClassifier(strategy="most_frequent")),
                  ("logistic regression", LogisticRegression(max_iter=1000))]:
    clf.fit(Xtr, ytr)
    acc = accuracy_score(yte, clf.predict(Xte))
    ap = average_precision_score(yte, clf.predict_proba(Xte)[:, 1])
    print(f"{name:20s}  accuracy {acc:.3f}   PR-AUC {ap:.3f}")

# baseline (majority)   accuracy 0.935   PR-AUC 0.065
# logistic regression   accuracy 0.963   PR-AUC 0.708`,
      annotations: {
        8: '6% positives — the shape of churn, fraud, and clicks. Every imbalanced problem you will meet in industry.',
        9: 'stratify=y keeps the 6% positive rate in BOTH splits. Without it a small test set can drift to 4% or 8% and your metric moves for reasons that are not the model.',
        11: 'DummyClassifier is one import. There is no excuse for skipping the baseline.',
        18: 'The whole point. The baseline predicts "not-positive" for everyone and scores 93.5% ACCURACY while finding zero positives — PR-AUC 0.065, near the 0.06 base rate. Accuracy on imbalanced data is a lie detector test that always passes.',
        19: 'The real model: +2.8 accuracy points looks boring; PR-AUC 0.065 -> 0.708 is the honest 11x improvement. Report the metric that moves when the model gets better.',
      },
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'The end-to-end pipeline, and the mistake that kills each step',
        notice:
          'Left column = what your code is holding right now. Right column = the data objects. Red = the test set, which stays locked until the very last frame. Every note names the specific mistake that destroys that step.',
        leftLabel: 'your code',
        rightLabel: 'data',
        frames: [
          {
            note: 'FRAME 1 — raw data lands. THE MISTAKE: cleaning, imputing, or scaling now. Any statistic computed here has already seen the test rows, and every number you report afterwards is inflated. Do nothing but load and look.',
            stack: [{ name: 'df', value: '10,000 rows', to: 'raw' }],
            heap: [{ id: 'raw', value: 'raw table: 10,000 x 28', label: 'untouched' }],
          },
          {
            note: 'FRAME 2 — split FIRST, before anything else. THE MISTAKE: a random split when rows are not independent. Multiple rows per customer, or a time-ordered target, means random splitting leaks the answer. Group-split by entity, or split by date.',
            stack: [
              { name: 'X_train, y_train', value: '7,000 rows', to: 'tr' },
              { name: 'X_test, y_test', value: 'LOCKED', to: 'te', danger: true },
            ],
            heap: [
              { id: 'tr', value: 'train: 7,000 x 28', label: 'stratified on y' },
              { id: 'te', value: 'test: 3,000 x 28', label: 'do not open', freed: true },
            ],
          },
          {
            note: 'FRAME 3 — fit transforms on TRAIN ONLY. THE MISTAKE: scaler.fit_transform(X_all). The scaler now carries the test set mean and std; the encoder knows test-only categories. This is the single most common leak in real projects, and it is invisible — nothing errors, your score is just quietly wrong.',
            stack: [
              { name: 'scaler.fit(X_train)', value: 'mean, std of TRAIN', to: 'sc' },
              { name: 'enc.fit(X_train)', value: 'train categories', to: 'en' },
            ],
            heap: [
              { id: 'sc', value: 'StandardScaler(mean=.., std=..)', label: 'train stats only' },
              { id: 'en', value: 'OneHotEncoder(handle_unknown=ignore)', label: 'unseen -> all zeros' },
            ],
          },
          {
            note: 'FRAME 4 — fit and tune INSIDE train, using cross-validation. THE MISTAKE: tuning hyperparameters against the test score. Do that twenty times and the test set is now your validation set: it is optimized against, so it no longer estimates anything. Use a Pipeline so the scaler refits inside every CV fold.',
            stack: [
              { name: 'Pipeline(scaler, model)', value: 'one object', to: 'pipe' },
              { name: 'GridSearchCV(cv=5)', value: 'splits TRAIN 5 ways', to: 'cv' },
            ],
            heap: [
              { id: 'pipe', value: 'scaler -> model', label: 'refit per fold' },
              { id: 'cv', value: 'best params, CV score 0.71', label: 'chosen without test' },
            ],
          },
          {
            note: 'FRAME 5 — the test set opens, exactly once. THE MISTAKE: calling fit_transform on test, or picking the decision threshold here. Transform test with the TRAIN scaler. Pick the threshold on a validation fold, then apply that frozen number.',
            stack: [
              { name: 'scaler.transform(X_test)', value: 'transform, not fit', to: 'te2' },
              { name: 'pipe.predict_proba', value: 'probabilities', to: 'pred' },
            ],
            heap: [
              { id: 'te2', value: 'test scaled by TRAIN stats', label: 'unlocked once' },
              { id: 'pred', value: 'p(y=1) for 3,000 rows', label: 'threshold = 0.23 (frozen)' },
            ],
          },
          {
            note: 'FRAME 6 — the one number you report. THE MISTAKE: reporting accuracy on imbalanced data, or reporting the best of many test evaluations. Report the metric that matches the cost, next to the baseline, with the split described in one sentence.',
            stack: [
              { name: 'baseline PR-AUC', value: '0.065' },
              { name: 'model PR-AUC', value: '0.708', to: 'rep' },
            ],
            heap: [{ id: 'rep', value: 'PR-AUC 0.708 vs 0.065 baseline', label: 'reported once' }],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Project A — tabular classification (churn or fraud)',
      md: `The brief: ~10k–200k rows, 20–50 mixed columns, a rare positive class (2–10%). Telco churn, credit default, or IEEE fraud all fit.

- **Questions to answer:** who churns, how much better than a coin flip, and what does the business do with the score?
- **Pipeline, in order:** load → stratified train/test split → dumb baseline → EDA on train only → encode + scale inside a Pipeline → logistic regression → gradient boosting → threshold chosen by cost → calibration check.
- **Imbalance:** try \`class_weight='balanced'\` first (free, no new rows). SMOTE only inside CV folds, never before the split. Evaluate on PR-AUC, not ROC-AUC, when positives are rare.
- **README must show:** the class balance, the baseline row, the metric choice defended in one sentence, and the confusion matrix at your chosen threshold.
- **The senior move:** choose the threshold with a **cost matrix**, not 0.5. "A missed fraud costs ₹8,000, a false alarm costs ₹40 of review time, so the optimal threshold is 0.23 and it catches 71% of fraud at 12% of volume reviewed." Then check calibration — if you quote probabilities, they must mean something.`,
    },
    {
      type: 'intuition',
      title: 'Project B — regression (house prices, demand, delivery time)',
      md: `The brief: a continuous target with a skewed distribution and a mix of numeric and categorical drivers. Ames Housing is the classic; delivery-time or demand data is fresher.

- **Questions:** what drives price, how wrong is the model in rupees, and where is it wrong?
- **Pipeline:** split → median baseline → EDA (distributions, missingness, target skew) → log-transform the target if right-skewed → feature engineering → Ridge/Lasso → gradient boosting → residual analysis.
- **Log target:** prices are right-skewed, so \`log1p(y)\` makes errors multiplicative and stops the ₹5-crore houses from owning the loss. Remember to \`expm1\` before reporting — the metric must be in rupees, not log-rupees.
- **RMSE vs MAE:** RMSE punishes big misses (use it when one huge error is genuinely worse — capacity planning); MAE is the typical error in the unit people understand (use it when all errors cost the same per rupee). Say which you chose and why. Both, if you like — but defend the primary one.
- **The senior move:** **residual analysis.** Plot residuals against predictions and against each key feature. Fan shape = heteroscedasticity, fix with the log target. A curve = a missing nonlinearity. A cluster of big residuals in one neighborhood = a missing feature. That plot turns "0.89 R²" into a paragraph about *what the model does not know*.`,
    },
    {
      type: 'intuition',
      title: 'Project C — clustering + PCA (customer segmentation)',
      md: `The brief: unlabeled customer data — recency, frequency, monetary value, category mix. No target, so no accuracy. The deliverable is *a decision*, not a score.

- **Pipeline:** clean → scale (mandatory — K-Means is distance-based and spend in rupees would drown order count) → PCA to 2D for a picture → K-Means over k = 2..8 → pick k by silhouette (and the elbow, and whether the segments are *actionable*) → profile → name.
- **PCA here is for viewing and de-correlating**, not compression. Say which — an interviewer will ask.
- **What everyone skips:** they produce a coloured scatter plot and stop. That is not a result. Nobody can act on "cluster 2".
- **The senior move:** **profile and name the segments.** Compute the mean of each original (unscaled) feature per cluster, size each segment, and give each a name and a recommended action: "Segment 1 — *Loyal Whales*, 200 customers, order every 3 weeks, ₹901 average spend: early access, no discounting." Now it is a business artifact.
- Also state the honest caveat: cluster labels are **not ground truth**. Rerun with a different seed and check the profiles survive.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Choosing k by silhouette, then the profile table that makes it a deliverable',
      code: `import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

rng = np.random.default_rng(3)
centres = [(20, 12, 900), (150, 2, 120), (60, 6, 400)]   # recency, orders, spend
X = np.vstack([rng.normal(c, [8, 1.2, 60], size=(200, 3)) for c in centres])

Z = StandardScaler().fit_transform(X)
for k in range(2, 6):
    lab = KMeans(k, n_init=10, random_state=0).fit_predict(Z)
    print(f"k={k}  silhouette {silhouette_score(Z, lab):.3f}")

lab = KMeans(3, n_init=10, random_state=0).fit_predict(Z)
print("segment  n   recency  orders  spend")
for j in range(3):
    r, o, s = X[lab == j].mean(0)
    print(f"   {j}    {(lab == j).sum():3d}   {r:6.0f}  {o:6.1f}  {s:5.0f}")

# k=2  silhouette 0.651
# k=3  silhouette 0.780
# k=4  silhouette 0.624
# k=5  silhouette 0.464
# segment  n   recency  orders  spend
#    0    200      149     2.1    122
#    1    200       21    12.1    901
#    2    200       60     6.0    405`,
      annotations: {
        10: 'Scale BEFORE clustering. Spend ranges to 900 and orders to 12 — unscaled, the distance is 99% spend and you have clustered on one column with extra steps.',
        12: 'Silhouette per point: (nearest-other-cluster distance - own-cluster distance) / max of the two. Ranges -1 to 1; the mean over all points scores the whole clustering. Unlike inertia it does NOT fall monotonically with k, so it can actually choose.',
        18: 'Profile on the ORIGINAL X, not the scaled Z. Nobody can read "recency = -1.4 standard deviations".',
        22: 'k=3 wins at 0.780 and the neighbours drop off — a clean peak. If silhouette were flat across k, that is a finding too: the data has no crisp cluster structure and you should say so rather than force one.',
        27: 'Now name them. Segment 1 = Loyal Whales (3 weeks between orders, 901 spend). Segment 0 = Lapsed (5 months quiet, 122 spend) -> win-back campaign. Segment 2 = Steady Middle -> upsell. THIS table, with names and actions, is the deliverable.',
      },
    },
    {
      type: 'intuition',
      title: 'The Kaggle entry — how to actually do one',
      md: `One competition, done properly, beats ten notebooks copied. Pick a **tabular Playground** competition — they run monthly, the data is clean, and the skill transfers to interviews.

- **Day one: submit something.** Predict the training mean. Get a leaderboard number. The psychological barrier is the submission pipeline, and you have now cleared it.
- **Build CV that matches the split.** If the leaderboard is a random split, use stratified k-fold. If it is time-based, use a time-series split. When your CV and the leaderboard move together, you can iterate a hundred times without submitting.
- **Iterate on features, not on models.** Gradient boosting with default parameters plus good features beats tuned everything with bad features, almost always.
- **Read the top public notebooks — AFTER your own attempt.** Before, and you copy without understanding; after, and every trick lands on a problem you already felt.
- **Stop when the learning stops.** Chasing the fourth decimal teaches nothing.`,
    },
    {
      type: 'note',
      md: `**What a bronze medal is worth, honestly.** It is worth: proof you finished something competitive, a real story about a CV/leaderboard gap you diagnosed, and fluency with tabular tooling. It is *not* worth: a job, on its own — top-10% on a Playground competition is mostly persistence, and interviewers know it. Never lead with the medal. Lead with **"here is the one insight that moved my score, and here is why it worked"**. One sentence of genuine understanding outranks any rank.`,
    },
    {
      type: 'intuition',
      title: 'Presenting the work',
      md: `A project nobody can read is a project you did not do. The README is the product; the code is the appendix.

- **README template, in this order:** Problem (2 lines, including who cares) → Data (rows, columns, source, class balance) → Approach (split strategy, baseline, models tried) → Results (a table: baseline vs each model on the same metric and split) → What I'd do next (3 honest bullets) → How to run it (\`pip install -r requirements.txt && python train.py\`).
- **Why notebooks alone read as junior:** out-of-order cells, no seed, no reproducibility, no split discipline visible. Keep the notebook for EDA, and move training into a \`.py\` file that runs top to bottom.
- Show the **negative results**. "SMOTE made PR-AUC worse, so I kept class weights" is more convincing than a page of wins.
- Pin your seeds and your requirements. A reviewer who cannot reproduce your number will not trust it.
- **Every project needs one "so what" sentence** at the top: *"This model flags the 12% of transactions that contain 71% of fraud, saving ~₹4.2L/month at current review capacity."* Not "I achieved 0.708 PR-AUC". Impact first, metric second.`,
    },
    {
      type: 'note',
      md: `**The twenty-minute defence.** Assume the interviewer picks one project and asks: what was the baseline, how did you split, where could data leak, why that metric, what did you try that failed, and what would break in production? If you cannot answer all six for a project, take it off your resume — a project you cannot defend is worse than no project, because it fails you *and* costs you the resume space.`,
    },
  ],
  quiz: [
    {
      question: 'In the from-scratch loop, why is the gradient written `X.T @ err / m` instead of a Python loop over samples?',
      options: [
        {
          text: 'It computes something different — the loop version is an approximation',
          explanation: 'They produce identical numbers. X.T @ err is exactly Σᵢ errᵢ·xᵢ, which is what the loop accumulates.',
        },
        {
          text: 'Same result, but one BLAS call instead of m interpreted iterations — orders of magnitude faster',
          explanation: 'Correct. NumPy hands the matrix product to optimized compiled code. The loop stays in the Python interpreter, one sample at a time.',
        },
        {
          text: 'It avoids needing the learning rate',
          explanation: 'The learning rate is unrelated to how the gradient is computed. You still multiply by α either way.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Linear and logistic regression end up with the identical gradient expression Xᵀ(ŷ − y)/m. Why?',
      options: [
        {
          text: 'The loss and link function are paired so the derivative factors cancel — the canonical-link property of GLMs',
          explanation: 'Correct. σ′(z) = σ(1−σ) cancels against the cross-entropy denominator, leaving the clean form. Same trick for softmax + cross-entropy.',
        },
        { text: 'Coincidence — the two derivations happen to land on the same place', explanation: 'It is deliberate design. Pair sigmoid with MSE instead and the cancellation breaks immediately.' },
        { text: 'Because logistic regression is linear regression on the labels', explanation: 'It is not — the sigmoid makes the model nonlinear in its output, and the loss is different.' },
      ],
      correct: 0,
    },
    {
      question: 'Your fraud model reports 93.5% accuracy. The majority-class baseline reports 93.5%. What do you conclude?',
      options: [
        { text: 'The model is solid — it matches a strong baseline', explanation: 'Matching a baseline that predicts "no fraud" for everyone means the model finds no fraud either.' },
        { text: 'Accuracy is the wrong metric here and the model has demonstrated nothing', explanation: 'Correct. With 6.5% positives, predicting all-negative scores 93.5%. Switch to PR-AUC or recall at a fixed review budget.' },
        { text: 'Add more data', explanation: 'More data will not fix a metric that cannot distinguish a real model from a constant.' },
      ],
      correct: 1,
    },
    {
      question: 'K-Means inertia decreases every iteration. What does that guarantee?',
      options: [
        { text: 'That the final clustering is the global optimum', explanation: 'No — it can decrease all the way into a bad local minimum. This is exactly why n_init exists.' },
        { text: 'That the chosen k is correct', explanation: 'Inertia falls monotonically as k rises too, so it cannot choose k. That is what silhouette or the elbow is for.' },
        {
          text: 'Only that the algorithm terminates — both steps can only lower inertia, and there are finitely many assignments',
          explanation: 'Correct. Termination is guaranteed; quality is not. Run several seeds and keep the lowest inertia.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Where does `scaler.fit()` belong in a train/test pipeline?',
      options: [
        {
          text: 'Fit on train only, then transform train and test with those stored statistics',
          explanation: 'Correct. Fitting on all data lets test-set mean and std into training — silent leakage, inflated score, nothing errors.',
        },
        { text: 'Fit on the full dataset before splitting, so both sides are on the same scale', explanation: 'This is the single most common leak in real projects. The scaler now carries test information.' },
        { text: 'Fit separately on train and on test so each is properly normalized', explanation: 'Worse: train and test end up in different coordinate systems, so the model sees features it was never trained on.' },
      ],
      correct: 0,
    },
    {
      question: 'Why write `sigmoid` with two branches instead of `1 / (1 + np.exp(-z))`?',
      options: [
        { text: 'The two-branch version is faster', explanation: 'It is slightly slower — it does boolean masking and two exponentials. Speed is not the reason.' },
        { text: 'It gives more accurate results near z = 0', explanation: 'Near zero the naive form is perfectly accurate. The problem lives in the tails.' },
        {
          text: 'For very negative z, `np.exp(-z)` overflows to inf and emits a warning; the branch for negative z exponentiates a safe value instead',
          explanation: 'Correct. exp(800) is inf. Computing e^z/(1+e^z) for z < 0 is algebraically identical and numerically clean.',
        },
      ],
      correct: 2,
    },
    {
      question: 'A house-price target is heavily right-skewed. You train on `log1p(y)` and report RMSE of 0.14. What is wrong?',
      options: [
        { text: 'log1p is the wrong transform — use log', explanation: 'log1p is the right choice; it handles y = 0 safely. That is not the problem.' },
        {
          text: 'The metric is in log units — inverse-transform predictions with expm1 and report the error in currency',
          explanation: 'Correct. 0.14 log-units means nothing to a stakeholder. Report RMSE or MAE in rupees, on the original scale.',
        },
        { text: 'RMSE cannot be used on transformed targets at all', explanation: 'It can — the issue is only that the number must be reported in units people can act on.' },
      ],
      correct: 1,
    },
    {
      question: 'You finish a customer segmentation. Which output makes it a senior deliverable?',
      options: [
        { text: 'A PCA scatter plot with clusters in different colours', explanation: 'This is where most projects stop. Nobody can act on a coloured dot.' },
        { text: 'The silhouette score for the chosen k', explanation: 'It justifies k — necessary, but it is a diagnostic, not a deliverable.' },
        {
          text: 'A profile table of the original features per segment, with each segment named and given a recommended action',
          explanation: 'Correct. "Lapsed, 200 customers, 5 months quiet, ₹122 spend → win-back campaign" is something a business can execute.',
        },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Whiteboard: derive and write the gradient descent update for logistic regression, vectorized.',
      answer:
        'Model: ŷ = σ(Xw + b). Loss: J = −(1/m)Σ[y log ŷ + (1−y) log(1−ŷ)]. Chain rule: ∂J/∂ŷ = (ŷ−y)/(ŷ(1−ŷ)) and ∂ŷ/∂z = ŷ(1−ŷ) — the two factors cancel exactly, leaving ∂J/∂z = (ŷ−y)/m. Then ∂z/∂w = X, so **∂J/∂w = Xᵀ(ŷ−y)/m** and ∂J/∂b = mean(ŷ−y). Update: w := w − α·Xᵀ(ŷ−y)/m. Two things to say out loud: the cancellation is *why* cross-entropy is paired with the sigmoid (canonical link), and the resulting expression is identical to linear regression\'s — the same code trains both, only the forward pass changes. Add the numerically stable sigmoid if asked to code it: for z < 0, use e^z/(1+e^z) so you never exponentiate a large positive.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through a project on your resume.',
      answer:
        'Structure the answer in six beats and keep it under three minutes before pausing: (1) **Problem and who cares** — "predict which subscribers churn next month so retention can spend its budget on the right 5%". (2) **Data** — rows, columns, class balance, and how it was split (stratified, or grouped by customer if a customer has multiple rows). (3) **Baseline** — "majority class scored 93.5% accuracy, which is why I moved to PR-AUC". (4) **Approach** — logistic regression first for interpretability, then gradient boosting; scaler and encoder inside a Pipeline so CV folds never leak. (5) **Result against the baseline, in business units** — "PR-AUC 0.065 → 0.708; at the threshold chosen from a cost matrix, we flag 12% of accounts and catch 71% of churners". (6) **What failed and what I\'d do next** — "SMOTE hurt, class weights won; next I\'d add tenure-window features and monitor drift on the score distribution". The single biggest differentiator is naming the baseline and one failed experiment unprompted.',
      isCaseBased: true,
    },
    {
      question: 'Case: a candidate reports 99.2% accuracy on fraud detection. What do you ask, in order?',
      answer:
        'Four questions, in this order. (1) **What is the class balance?** If fraud is 0.8%, predicting "never fraud" scores 99.2% — the model may literally be a constant. (2) **What did the baseline score?** A number without a ruler is not a result. (3) **How did you split, and when did you fit the transforms?** A random split on data with repeated customers, or a scaler fit before splitting, both inflate scores silently. (4) **Are any features unavailable at prediction time?** "chargeback_flag" or "investigation_opened" are the answer wearing a disguise — target leakage is the usual cause of suspiciously good numbers. Then ask for PR-AUC and the confusion matrix at their operating threshold. Tradeoff worth naming: leakage is often not malice but a join done before the split.',
      isCaseBased: true,
    },
    {
      question: 'Why implement algorithms from scratch when production always uses libraries?',
      answer:
        'Two honest reasons and one dishonest one to avoid. Real reason one: the failure modes live in the parts the library hides — divergence, feature scale, numeric overflow, convergence criteria. Someone who has written the loop diagnoses a NaN loss in a minute; someone who has only called .fit() files a ticket. Real reason two: interviews test derivation, and you cannot derive from memory of an API. The dishonest reason to avoid: "libraries are black boxes and I don\'t trust them" — scikit-learn is better tested than anything you will write, and saying otherwise signals inexperience. The correct posture: implement once to understand, then use the library forever.',
      isCaseBased: false,
    },
    {
      question: 'How do you choose a classification threshold, and why is 0.5 usually wrong?',
      answer:
        '0.5 is the threshold that minimizes error count when both mistakes cost the same and classes are balanced — conditions that essentially never hold. Instead: build a cost matrix (cost of a false negative vs a false positive), sweep the threshold on a **validation** fold, and pick the point minimizing expected cost — or the point that hits an operational constraint like "we can only review 500 cases a day". Then freeze that number and apply it to test. Two traps: choosing the threshold on the test set (it stops being an unbiased estimate), and quoting probabilities that are not calibrated — a boosted model\'s 0.8 is often not an 80% chance, so check a calibration curve or wrap in CalibratedClassifierCV before anyone makes rupee decisions from the score.',
      isCaseBased: false,
    },
    {
      question: 'RMSE or MAE — how do you decide?',
      answer:
        'Ask what the cost of error looks like. RMSE squares errors, so it punishes large misses disproportionately and is minimized by predicting the conditional **mean** — right when one huge error is genuinely worse than several small ones (capacity planning, safety margins). MAE treats all errors linearly, is minimized by the conditional **median**, and is robust to outliers — right when cost scales with the size of the miss and the data has a fat tail (delivery-time ETA, price prediction with a few mansions). Practical framing: report both, name one as primary, and defend it in a sentence. If they diverge wildly, that itself is a finding — you have outliers driving the model, and a log target or Huber loss is the next move.',
      isCaseBased: false,
    },
    {
      question: 'Explain the K-Means assign step as vectorized NumPy, and why the update uses the mean specifically.',
      answer:
        'Assign: `d = ((X[:, None, :] - C[None, :, :]) ** 2).sum(-1)` broadcasts (m,1,n) against (1,k,n) into (m,k,n), squares, sums the feature axis, giving an (m,k) squared-distance matrix; `d.argmin(1)` picks the nearest centroid per point. No loop over points. Memory caveat worth naming: that intermediate is m·k·n floats, so for large m you chunk it or use the ‖x‖² − 2x·c + ‖c‖² expansion. The update uses the **mean** because the mean is precisely the minimizer of summed squared distance — which is the objective. Change the objective to L1 (sum of absolute distances) and the correct update becomes the median: that algorithm is K-Medians. The pairing of objective and update step is not arbitrary.',
      isCaseBased: false,
    },
    {
      question: 'Case: your CV score is 0.84 and the Kaggle leaderboard gives 0.71. Diagnose.',
      answer:
        'A CV/leaderboard gap that large means your validation does not reproduce the leaderboard\'s split. Hypotheses in order of likelihood: (1) **Leakage in your pipeline** — a scaler, encoder, target-encoding, or imputer fit outside the CV loop, so every fold saw the full training set. Fix: put everything in a Pipeline. (2) **Mismatched split scheme** — the leaderboard splits by time or by group and you used random k-fold, so your folds share entities the leaderboard separates. Fix: mirror their split. (3) **Overfitting to CV by selection** — you tried 200 configurations and picked the max, which is itself an optimistic estimate; use nested CV or hold out a final fold you never tune on. (4) **Distribution shift** between public train and test, which you diagnose with adversarial validation: train a classifier to tell train from test — if it succeeds, the sets differ and the discriminative features tell you where.',
      isCaseBased: true,
    },
    {
      question: 'You have no labels. How do you know your clustering is any good?',
      answer:
        'There is no accuracy, so you triangulate three ways. (1) **Internal metrics** — silhouette (cohesion vs separation, −1 to 1; unlike inertia it does not fall monotonically with k so it can actually choose), Davies-Bouldin, Calinski-Harabasz. (2) **Stability** — rerun with different seeds and different subsamples; if the segment profiles survive, the structure is real, and if labels reshuffle every run, you are clustering noise. (3) **Actionability, the one that matters** — do the segments differ on features you did *not* cluster on, and can the business do different things to them? A statistically clean clustering that yields no different action is a failed project. State the honest caveat too: K-Means will always return k clusters, even from uniform noise, so a flat silhouette curve across k is a legitimate finding to report rather than a problem to force through.',
      isCaseBased: false,
    },
    {
      question: 'What does a bronze Kaggle medal actually tell an interviewer?',
      answer:
        'It tells them you finished something competitive, can operate a submission pipeline, and are comfortable with tabular tooling. It does not tell them you can define a problem, source data, choose a metric, or ship — the competition handed you all four. So never lead with the rank. Lead with the reasoning: "my CV and the leaderboard disagreed by 0.1, I traced it to target encoding fit outside the folds, and fixing it moved me 400 places" — that story demonstrates diagnosis, which is what the job is. Honest self-assessment of a credential\'s value is itself a strong signal; overselling it is a weak one.',
      isCaseBased: false,
    },
    {
      question: 'Why ship a dumb baseline first, and what do you do when the real model cannot beat it?',
      answer:
        'The baseline turns a metric into a verdict: "0.94" is meaningless, "0.94 versus a 0.935 baseline" is a decision. It also catches leakage and metric-choice errors on day one instead of week six, and it costs one import (DummyClassifier / DummyRegressor). When the model cannot beat it, that is **a finding, not a failure** — report it: the available features carry little signal for this target, which is genuinely valuable and cheap information. Then investigate rather than tune: is the target defined correctly, is the signal available at prediction time, is there a data source you have not joined? The failure mode to avoid is quietly grinding hyperparameters for three weeks against a baseline you never measured.',
      isCaseBased: false,
    },
    {
      question: 'A hiring manager will read your GitHub for ninety seconds. What has to be there?',
      answer:
        'A README that opens with a one-sentence "so what" in business units — "flags the 12% of transactions holding 71% of fraud" — not a metric. Then, in order: problem, data (rows, columns, class balance, source), approach (split strategy, baseline, models), a results **table** with the baseline as a row, what I would do next, and a two-line run command. Seeds pinned, requirements pinned. Training in a `.py` that runs top to bottom; the notebook kept for EDA only, because out-of-order cells with no seed read as junior regardless of the modelling inside. Include one negative result — "SMOTE hurt, class weights won" — since a project with no failures reads as a project with no experiments.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Vectorized gradient for linear regression', back: 'dw = X.T @ err / m, db = err.mean(). X.T @ err sums err_i · x_i over samples, per feature — "error × input, summed", then averaged.' },
    { front: 'Why linear and logistic share one gradient', back: 'dJ/dw = Xᵀ(ŷ−y)/m for both. Canonical link: sigmoid + cross-entropy is chosen so σ′ cancels. Same code, different forward pass.' },
    { front: 'Numerically stable sigmoid', back: 'For z ≥ 0: 1/(1+e^(−z)). For z < 0: e^z/(1+e^z). Never exponentiate a large positive — exp(800) is inf.' },
    { front: 'K-Means assign step, vectorized', back: '((X[:,None,:] − C[None,:,:])**2).sum(-1) → (m,k) distances; argmin(1) = labels. Memory is m·k·n — chunk for large m.' },
    { front: 'What monotone inertia guarantees', back: 'Termination only. Both steps lower inertia and assignments are finite. Quality is NOT guaranteed — hence n_init with multiple seeds.' },
    { front: 'Why K-Means updates with the mean', back: 'The mean minimizes summed squared distance, which is the objective. L1 objective → median → K-Medians.' },
    { front: 'The baseline rule', back: 'Ship majority class / median / last value first; report every model against it on the same split. Losing to it is a finding, not a failure.' },
    { front: 'Fit-transform discipline', back: 'fit on TRAIN only, transform train and test with those stats. fit_transform(X_all) is the most common silent leak in real projects.' },
    { front: 'RMSE vs MAE', back: 'RMSE punishes big misses, minimized by the mean — use when one huge error is worse. MAE is typical error, minimized by the median — robust to outliers.' },
    { front: 'What makes a clustering project senior', back: 'Not the scatter plot — the profile table on ORIGINAL features, each segment sized, named, and given an action.' },
  ],
  mindmapMarkdown: `- From Scratch in NumPy + The Projects That Get You Hired
  - Why from scratch
    - Interviews ask you to derive it
    - Libraries hide scale, NaN, convergence
  - Shared skeleton
    - init - predict - miss - step - stop
    - Vectorize: no loop over samples
  - Linear regression
    - dw = X.T @ err / m
    - error x input, averaged
  - Logistic regression
    - Stable sigmoid: two branches
    - SAME gradient - canonical link
  - K-Means
    - Broadcast (m,k) distance matrix
    - Inertia falls: terminates, not optimal
  - Baseline discipline
    - Majority / median / last value
    - Losing to it is a finding
  - Project A - classification
    - PR-AUC not accuracy
    - Senior: threshold by cost + calibration
  - Project B - regression
    - Log target for skew, expm1 back
    - Senior: residual analysis
  - Project C - clustering + PCA
    - Scale first, k by silhouette
    - Senior: profile and NAME segments
  - Pipeline leaks
    - Split before touching anything
    - Fit transforms on train only
  - Kaggle entry
    - Submit day one, CV matches the split
    - Bronze = persistence, not a job
  - Presenting
    - README: problem-data-approach-results-next-run
    - One "so what" in business units`,
}

export default m
