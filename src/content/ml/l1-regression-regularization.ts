import type { Module } from '../types'

const m: Module = {
  id: 'ml-l1-regression-regularization',
  subjectId: 'ml',
  level: 1,
  title: 'Regression II: Polynomials, Ridge vs Lasso & Evaluation',
  whyItMatters:
    '"L1 vs L2" is the most asked ML theory question after bias-variance, and "why does L1 give exactly zero?" is where most candidates hand-wave. Here you get the picture, the calculus, and real scikit-learn output where four coefficients print as 0.0. You also get the silent bug that quietly ruins regularized models in production: forgetting to scale.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'From one feature to many',
      md: `Last module you fit ŷ = w·x + b with one x and one w, and trained it with gradient descent or the normal equation. All of that machinery is reused here unchanged — only the input widens.

- Rent does not depend on size alone: size, bedrooms, distance to metro, floor, age.
- Give each feature its own weight: ŷ = w₁x₁ + w₂x₂ + ... + w_dx_d + b.
- Collect the weights into a **vector w**, the features into a vector x. Now ŷ = wᵀx + b — one dot product.
- Stack all m rows into a matrix **X** (m rows × d features). Every prediction at once: **ŷ = Xw**.
- Same MSE, same gradient, same "error × input, averaged" — just written with matrices.
- Nothing new in the optimizer. What IS new: with many weights, the *weights themselves* start misbehaving.`,
    },
    {
      type: 'math',
      intro: 'Multiple linear regression in matrix form. A column of 1s in X absorbs the bias b, so there is only w.',
      latex: [
        '\\hat{y} = w_1 x_1 + w_2 x_2 + \\cdots + w_d x_d + b = \\mathbf{w}^\\top \\mathbf{x} + b',
        '\\hat{\\mathbf{y}} = X\\mathbf{w}, \\qquad J(\\mathbf{w}) = \\frac{1}{2m} \\lVert X\\mathbf{w} - \\mathbf{y} \\rVert_2^2',
        '\\nabla_{\\mathbf{w}} J = \\frac{1}{m} X^\\top (X\\mathbf{w} - \\mathbf{y}) \\qquad \\text{(still error} \\times \\text{input, averaged)}',
      ],
    },
    {
      type: 'intuition',
      title: 'Reading a coefficient without lying',
      md: `A coefficient is a **conditional, per-unit** statement. Say it in full or do not say it.

- w₃ = 4.2 on "distance to metro in km" means: *holding every other feature fixed*, one more km adds 4.2 to ŷ.
- Units matter. Switch km to metres and the same model reports 0.0042. The model did not change; the number did.
- So "bigger coefficient = more important feature" is **false** unless every feature shares a scale.
- It is not causal. It is what the fit needed, *given the other columns that happen to be present*.`,
    },
    {
      type: 'note',
      md: `**The correlated-features trap.** Put "size in m²" and "size in ft²" in the same model and the fit can hand you w = (+120, −11) or (−4, +13) — both fit the data equally well, because two columns carry one signal that can be split infinitely many ways. Symptoms: coefficients that flip sign when you add a row, absurd magnitudes, huge standard errors. Predictions may still be fine; the *explanation* is what breaks. Regularization is the standard cure — and the rest of this module.`,
    },
    {
      type: 'intuition',
      title: 'Curves from a straight-line model',
      md: `Your data curves. Your model draws flat planes. The fix is not a new model — it is new columns.

- Want a parabola? Add x² as a second feature. Want a cubic? Add x³ too.
- The model is still ŷ = w₁z₁ + w₂z₂ + w₃z₃ where z₁ = x, z₂ = x², z₃ = x³.
- The interview line: **linear in the parameters, not in x**. "Linear" describes how **w** enters the equation, never what the curve looks like on a plot.
- Same solver, same gradient, same normal equation. You changed the data, not the algorithm.
- In scikit-learn this is literally **PolynomialFeatures** piped into the same **LinearRegression**.`,
    },
    {
      type: 'math',
      intro: 'Polynomial regression is a change of variables, nothing more.',
      latex: [
        '\\hat{y} = w_0 + w_1 x + w_2 x^2 + \\cdots + w_p x^p',
        'z_1 = x,\\quad z_2 = x^2,\\quad \\ldots,\\quad z_p = x^p \\;\\Longrightarrow\\; \\hat{y} = \\mathbf{w}^\\top \\mathbf{z}',
        '\\text{Nonlinear in } x. \\text{ Perfectly linear in } \\mathbf{w}. \\text{ That is the only thing the solver cares about.}',
      ],
    },
    {
      type: 'note',
      md: `**Degree is a bias-variance dial** — the Level 0 bias-variance module has the interactive version of exactly this. Degree 1 on curved data: underfit, high bias, wrong no matter how much data you feed it. Degree 15 on 20 points: the curve threads every single point, training error goes to ~0, and predictions *between* points swing violently — high variance. The fingerprint of that overfit curve is **enormous coefficients with alternating signs**: +4100, −38000, +91000. Big opposing weights are what a model buys its violent wiggles with. Which suggests the fix.`,
    },
    {
      type: 'intuition',
      title: 'Regularization: charge rent on the weights',
      md: `If big weights are the fingerprint of overfitting, make big weights expensive.

- Old objective: minimize fit error. New objective: minimize **fit error + λ × (size of the weights)**.
- The model now negotiates. A wiggle that cuts error a lot is worth its weight cost; a wiggle that cuts error slightly is not.
- **λ** (spelled **alpha** in scikit-learn) is the price tag. λ = 0 → plain least squares. λ → ∞ → all weights crushed toward 0, model predicts a flat line.
- Analogy: a shopping budget. You can still buy the expensive thing — if it genuinely earns its place.
- Two penalties dominate practice. They differ in **one thing only**: how they measure "size".`,
    },
    {
      type: 'math',
      intro: 'The shared shape: fit + λ·penalty. Only the penalty term differs.',
      latex: [
        'J_{\\text{ridge}}(\\mathbf{w}) = \\underbrace{\\frac{1}{2m} \\lVert X\\mathbf{w} - \\mathbf{y} \\rVert_2^2}_{\\text{fit}} + \\underbrace{\\lambda \\sum_{j=1}^{d} w_j^2}_{\\text{L2 penalty}}',
        'J_{\\text{lasso}}(\\mathbf{w}) = \\frac{1}{2m} \\lVert X\\mathbf{w} - \\mathbf{y} \\rVert_2^2 + \\lambda \\sum_{j=1}^{d} \\lvert w_j \\rvert',
        '\\text{The intercept } b \\text{ is never penalised — shifting the target up should not cost you anything.}',
      ],
    },
    {
      type: 'intuition',
      title: 'Ridge (L2): shrink everything, drop nothing',
      md: `Ridge measures weight size with **squares**: λ·Σw².

- Squaring punishes one big weight far more than several medium ones, so Ridge **spreads** signal out.
- Two near-duplicate features? Ridge gives each about half rather than letting one take everything: 3² = 9 costs more than 1.5² + 1.5² = 4.5. Sharing is literally cheaper.
- Weights shrink **smoothly toward zero and never arrive**. Every feature stays in the model.
- Bonus: XᵀX + λI is always invertible, so the normal equation survives perfectly correlated features and even d > m.
- Reach for Ridge when you believe most features carry a little signal, and when features are correlated.`,
    },
    {
      type: 'math',
      intro: 'Ridge has a closed form — the normal equation with one extra term.',
      latex: [
        '\\mathbf{w}_{\\text{ridge}} = (X^\\top X + \\lambda I)^{-1} X^\\top \\mathbf{y}',
        '\\text{Lasso has no closed form: } \\lvert w \\rvert \\text{ is not differentiable at } 0. \\text{ Solvers use coordinate descent.}',
      ],
    },
    {
      type: 'intuition',
      title: 'Lasso (L1): shrink, and delete',
      md: `Lasso measures size with **absolute values**: λ·Σ|w|.

- To L1, moving a weight 0.1 → 0 saves exactly as much penalty as moving 5.1 → 5.0. The final step to zero is fully worth taking.
- To L2, moving 0.1 → 0 saves 0.01 — almost nothing. So it never bothers. **That single sentence is the whole difference.**
- Result: Lasso pushes weak coefficients to **exactly 0.0** and the feature disappears from the model. **Automatic feature selection.**
- You get a sparse, readable model: "of 200 features, 12 matter" — and a faster one at inference.
- Weakness: among correlated features it keeps one and zeroes the rest, roughly arbitrarily. Resample the data and it may pick a different one.`,
    },
    {
      type: 'intuition',
      title: 'Why L1 zeroes weights: the picture',
      md: `Draw a plane whose two axes are w₁ and w₂. Every possible model is one point on it. Two objects live there.

1. **Loss contours** — ellipses centred on the unpenalized best fit. Every point on one ellipse has the same training error; bigger ellipse = worse.
2. **The budget region** — every weight vector the penalty allows. L1's |w₁| + |w₂| ≤ t draws a **diamond**, a square rotated 45°, with its four corners sitting **on the axes**. L2's w₁² + w₂² ≤ t draws a **circle**.

The regularized answer is where the smallest ellipse first **touches** the region. Step through it.`,
    },
    { type: 'visual', component: 'RegularizationGeometry', props: { kind: 'l1' } },
    {
      type: 'note',
      md: 'Read the picture in one sentence: the **contours** are lines of equal loss (the innermost is the unpenalised best fit), the **blue region** is everywhere the penalty lets you go, and the answer is where the smallest contour first touches that region. The diamond touches on a corner — a corner sits ON an axis, so one weight is exactly zero. The circle has no corners, so the touch point lands off-axis almost every time. Now step through the same story as boxes:',
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'L1 vs L2 geometry: why one gives exact zeros',
        notice: 'Left column = Lasso (L1, the diamond). Right column = Ridge (L2, the circle). Same data, same loss contours — only the shape of the budget differs.',
        leftLabel: 'L1 — diamond',
        rightLabel: 'L2 — circle',
        frames: [
          {
            note: 'Setup. Axes are w₁ (horizontal) and w₂ (vertical). Both methods must keep the weight vector inside a budget region — same idea, different shape.',
            stack: [
              { name: 'penalty', value: '|w₁| + |w₂| ≤ t' },
              { name: 'region', value: 'diamond (square, rotated 45°)' },
              { name: 'corners', value: '4 — and all of them sit ON an axis' },
            ],
            heap: [
              { id: 'p', value: 'w₁² + w₂² ≤ t', label: 'penalty' },
              { id: 'r', value: 'circle (a disc)', label: 'region' },
              { id: 'c', value: 'none — smooth all the way round', label: 'corners' },
            ],
          },
          {
            note: 'Grow the loss ellipse outward from the unpenalized best fit. The first point where it meets the region is the answer: the lowest error you can afford inside the budget.',
            stack: [
              { name: 'ellipse', value: 'still outside the diamond' },
              { name: 'answer', value: 'not decided yet' },
              { name: 'w₂', value: '—' },
            ],
            heap: [
              { id: 'e', value: 'still outside the circle', label: 'ellipse' },
              { id: 'a', value: 'not decided yet', label: 'answer' },
              { id: 'w', value: '—', label: 'w₂' },
            ],
          },
          {
            note: 'Touch. A pointy region gets hit at its point: the corner sticks out furthest toward the incoming ellipse, so that is where they meet.',
            stack: [
              { name: 'touch point', value: 'the corner at (t, 0)' },
              { name: 'w₁', value: '= t' },
              { name: 'w₂', value: '= 0 EXACTLY — feature dropped' },
            ],
            heap: [
              { id: 'e', value: 'somewhere on the smooth arc', label: 'touch point' },
              { id: 'a', value: '= 0.62 (small)', label: 'w₁' },
              { id: 'w', value: '= 0.31 — small, but NOT zero', label: 'w₂' },
            ],
          },
          {
            note: 'Why a corner and not an edge? A corner is the one place with no single tangent direction, so ellipses arriving from a whole RANGE of angles all land on it. On a circle every point has exactly one tangent angle.',
            stack: [
              { name: 'angles landing there', value: 'a whole range of them' },
              { name: 'so w₂ = 0', value: 'happens routinely, not by luck' },
              { name: 'geometry name', value: 'the corner is non-differentiable' },
            ],
            heap: [
              { id: 'e', value: 'exactly one', label: 'angles landing on an axis' },
              { id: 'a', value: 'a one-in-infinity coincidence', label: 'so w₂ = 0' },
              { id: 'w', value: 'the boundary is smooth everywhere', label: 'geometry name' },
            ],
          },
          {
            note: 'Turn λ up (which shrinks t). The diamond shrinks and drops features one at a time — that is feature selection. The circle shrinks too, but every weight just gets quietly smaller together.',
            stack: [
              { name: 'λ up', value: 'more coefficients hit exactly 0' },
              { name: 'model', value: 'sparse — some features gone' },
              { name: 'correlated pair', value: 'keeps ONE, arbitrarily', danger: true },
            ],
            heap: [
              { id: 'e', value: 'all weights shrink smoothly together', label: 'λ up' },
              { id: 'a', value: 'dense — every feature kept', label: 'model' },
              { id: 'w', value: 'SHARES the weight between them', label: 'correlated pair' },
            ],
          },
        ],
      },
    },
    {
      type: 'note',
      md: `**Say it in one breath in an interview.** "The L1 constraint region is a diamond whose corners lie on the axes. The loss contour expands until it touches, and a pointy region gets touched at its point — and at that corner one coordinate is exactly zero. The L2 region is a circle with no corners, so the touch point lands on an axis only by coincidence. Hence L1 gives sparsity and L2 only shrinkage." Then, if they push: the calculus says the same thing.`,
    },
    {
      type: 'math',
      intro: 'The same argument in derivatives — this is the version that convinces a mathematician.',
      latex: [
        '\\min_{\\mathbf{w}} \\lVert X\\mathbf{w}-\\mathbf{y}\\rVert^2 \\;\\text{ s.t. }\\; \\sum_j \\lvert w_j \\rvert \\le t \\;\\;(\\text{L1}) \\qquad \\text{or} \\qquad \\sum_j w_j^2 \\le t \\;\\;(\\text{L2})',
        '\\frac{\\partial}{\\partial w_j} \\lambda \\lvert w_j \\rvert = \\lambda \\cdot \\operatorname{sign}(w_j): \\;\\; \\text{a constant } \\pm\\lambda \\text{ push, still full strength as } w_j \\to 0',
        '\\frac{\\partial}{\\partial w_j} \\lambda w_j^2 = 2\\lambda w_j: \\;\\; \\text{the push fades with } w_j, \\text{ reaching } 0 \\text{ only in the limit}',
        'w_j = 0 \\text{ is a fixed point of L1 whenever } \\left\\lvert \\tfrac{\\partial \\text{fit}}{\\partial w_j} \\right\\rvert < \\lambda \\;\\Rightarrow\\; \\textbf{exact sparsity}',
      ],
    },
    {
      type: 'note',
      md: `**Elastic Net** is simply both penalties at once — λ₁·Σ|w| + λ₂·Σw² — buying Lasso's sparsity while keeping Ridge's grouping, so correlated features get selected or dropped *together* instead of one being picked at random. Use it when you want feature selection but your features arrive in correlated clusters (which, in real tabular data, they usually do).`,
    },
    {
      type: 'intuition',
      title: 'Picking λ',
      md: `λ is not learned from the training data. It is chosen from outside, by asking held-out data.

- Never pick λ by training error. Training error is always minimized at λ = 0 — it will forever tell you not to regularize.
- Standard recipe: **k-fold cross-validation** across a log-spaced grid — 0.001, 0.01, 0.1, 1, 10, 100 — take the λ with the best mean validation score.
- scikit-learn ships the sweep: **RidgeCV**, **LassoCV**, **ElasticNetCV**.
- Refinement worth naming in an interview — the **one-standard-error rule**: among all λ within one standard error of the best, take the *largest*. Simplest model that is statistically as good.
- Full treatment of cross-validation and the search over λ lands in the Level 3 module *Cross-Validation & Hyperparameter Tuning*; the scaling and leakage traps that surround it are in *Feature Engineering & Data Leakage*.`,
    },
    {
      type: 'note',
      md: `**Scaling is not optional here — it is part of the model.** The penalty sums weights *across* features, which silently assumes they are comparable. Give one feature units of rupees (~10⁶) and another a room count (1–6): the rupee feature needs a microscopic coefficient to do its job, pays almost no penalty, and survives — while the room count needs a large coefficient, pays heavily, and gets shrunk or zeroed no matter how predictive it is. Always **StandardScaler** (fit on train only) before Ridge, Lasso, or ElasticNet. Plain OLS genuinely does not care. Every penalized model does.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Ridge vs Lasso on the same data — watch the coefficient vectors',
      code: `import numpy as np
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.preprocessing import StandardScaler

np.set_printoptions(precision=3, suppress=True)
rng = np.random.default_rng(0)
n = 120
X = rng.normal(size=(n, 6))
X[:, 1] = X[:, 0] + rng.normal(scale=0.05, size=n)   # x1 is a near-copy of x0
y = 3.0 * X[:, 0] + 2.0 * X[:, 4] + rng.normal(scale=0.5, size=n)   # only x0, x4 matter

Xs = StandardScaler().fit_transform(X)               # MANDATORY before any penalty
for name, model in [('OLS  ', LinearRegression()), ('Ridge', Ridge(alpha=10.0)), ('Lasso', Lasso(alpha=0.3))]:
    print(name, model.fit(Xs, y).coef_)

# OLS   [ 3.06  -0.146  0.003  0.033  2.049  0.035]
# Ridge [1.419 1.38  0.023 0.023 1.889 0.061]
# Lasso [ 2.625  0.     0.    -0.     1.765  0.   ]`,
      annotations: {
        9: 'A deliberately correlated pair: x1 is x0 plus a whisper of noise. Watch how differently each model handles it.',
        10: 'Ground truth: only x0 and x4 drive y. Columns 1, 2, 3, 5 are decoration. A good model should say so.',
        12: 'Delete this line and everything below is garbage. The penalty compares weights across features, so features must share a scale.',
        16: 'OLS: the correlated pair is split nonsensically (3.06 vs -0.15), and not one junk weight is actually zero.',
        17: 'Ridge: SHARES the signal across the correlated pair — 1.42 + 1.38 ≈ 2.8, split almost evenly and landing just under the true 3.0 — and squashes junk to ~0.02, tiny but never exactly 0.',
        18: 'Lasso: four coefficients are EXACTLY 0.0 — feature selection, free. Note it keeps only one of the correlated pair, and shrinks the survivors (2.63 < 3.0): sparsity costs a little bias.',
      },
    },
    {
      type: 'note',
      md: `Read those three rows side by side and the whole module is in them. **OLS** keeps everything and splits correlated signal at random. **Ridge** keeps everything but shares correlated signal sensibly and squashes noise to near-zero. **Lasso** deletes. Also notice Lasso's surviving weights are pulled *below* their true values (2.63 vs 3.0) — every penalty trades a little bias for a lot of variance reduction. That is the deal you are signing.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The silent bug: the same feature, a different unit, a deleted model',
      code: `import numpy as np
from sklearn.linear_model import Lasso
from sklearn.preprocessing import StandardScaler

np.set_printoptions(precision=3, suppress=True)
rng = np.random.default_rng(1)
X = rng.normal(size=(200, 3))
y = 2.0 * X[:, 0] + 2.0 * X[:, 1] + rng.normal(scale=0.3, size=200)
X[:, 0] *= 0.001          # identical feature, now recorded in km instead of metres

print('raw   ', Lasso(alpha=0.1).fit(X, y).coef_)
print('scaled', Lasso(alpha=0.1).fit(StandardScaler().fit_transform(X), y).coef_)

# raw    [ 0.     1.781 -0.088]
# scaled [ 1.804  1.717 -0.   ]`,
      annotations: {
        8: 'x0 and x1 are equally predictive by construction — both true coefficients are 2.0.',
        9: 'Nothing about the information changed. Only the unit did. A model that reacts to this is broken.',
        14: 'Unscaled: x0 is GONE (exactly 0), and the junk feature x2 survives with -0.088. Both answers are wrong.',
        15: 'Scaled: both real features kept at roughly equal weight, junk driven to zero. Correct — and one line of code apart.',
      },
    },
    {
      type: 'intuition',
      title: 'Grading a regression',
      md: `You need one number to compare models and one number to say out loud to a human. They are often different numbers.

- **MSE** — mean squared error. What you optimize. Units are y-squared, so "MSE = 4.7 rupees²" means nothing to anybody.
- **RMSE** — the square root of MSE. **Same units as y.** "Typically off by ₹2,300 a month." *This is the one you quote.*
- **MAE** — mean absolute error. Also in y's units, but nothing is squared, so one wild outlier cannot dominate it. **Robust.**
- RMSE much larger than MAE is itself a signal: a few big misses are carrying your error. Go find them.
- **R²** — the share of variance in y your model explains, scored against the dumbest honest baseline: always guessing ȳ.`,
    },
    {
      type: 'math',
      intro: 'The four metrics, and the correction that makes R² comparable across model sizes.',
      latex: [
        '\\text{MSE} = \\frac{1}{m}\\sum_i (\\hat{y}_i - y_i)^2 \\qquad \\text{RMSE} = \\sqrt{\\text{MSE}} \\qquad \\text{MAE} = \\frac{1}{m}\\sum_i \\lvert \\hat{y}_i - y_i \\rvert',
        'R^2 = 1 - \\frac{\\sum_i (\\hat{y}_i - y_i)^2}{\\sum_i (\\bar{y} - y_i)^2} = 1 - \\frac{\\text{your squared error}}{\\text{squared error of always guessing } \\bar{y}}',
        'R^2_{\\text{adj}} = 1 - (1 - R^2)\\,\\frac{m-1}{m-d-1} \\qquad (d = \\text{number of features})',
      ],
    },
    {
      type: 'note',
      md: `**R² has no floor.** R² = 1 is perfect. R² = 0 means you tied "always predict the mean". R² **negative** means you lost to that baseline — entirely possible on a test set, and a red flag for leakage, a broken train/test split, or a model fitted on the wrong target. And on *training* data R² only ever goes UP as you add features, even pure noise ones, because the fit can always give the new column a nonzero weight and shave a sliver of error. **Adjusted R²** subtracts a penalty for the feature count so it is allowed to fall — that is the one to use when comparing models of different sizes.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'R² always rises with more features. Adjusted R² does not.',
      code: `import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

rng = np.random.default_rng(7)
n = 40
X = rng.normal(size=(n, 1))
y = 5.0 * X[:, 0] + rng.normal(scale=1.0, size=n)

def adj(r2, d):
    return 1 - (1 - r2) * (n - 1) / (n - d - 1)

for d in (1, 20, 35):
    Xd = np.hstack([X, rng.normal(size=(n, d - 1))]) if d > 1 else X   # pure junk columns
    p = LinearRegression().fit(Xd, y).predict(Xd)
    r2, rmse = r2_score(y, p), mean_squared_error(y, p) ** 0.5
    print(f'd={d:2d}  R2={r2:.3f}  adjR2={adj(r2, d):6.3f}  RMSE={rmse:.2f}  MAE={mean_absolute_error(y, p):.2f}')

print('always predict mean(y) -> R2 =', round(r2_score(y, np.full(n, y.mean())), 3))
print('always predict 100     -> R2 =', round(r2_score(y, np.full(n, 100.0)), 3))

# d= 1  R2=0.951  adjR2= 0.950  RMSE=0.89  MAE=0.71
# d=20  R2=0.969  adjR2= 0.937  RMSE=0.71  MAE=0.60
# d=35  R2=0.993  adjR2= 0.934  RMSE=0.33  MAE=0.26
# always predict mean(y) -> R2 = 0.0
# always predict 100     -> R2 = -638.094`,
      annotations: {
        14: 'Every added column is pure random noise. It carries no information about y whatsoever.',
        15: 'Scored on the SAME data it was fit on — that is the whole point: training R² cannot tell you the truth here.',
        24: 'R2 climbed 0.951 -> 0.969 -> 0.993 on nothing but noise. adjR2 fell 0.950 -> 0.937 -> 0.934 and correctly called it out.',
        25: 'R2 = 0 IS the mean baseline, by definition. Anything worse than the mean must score below it.',
        26: 'R2 = -638. Negative R2 is not a bug — it means "far worse than a constant guess". Seeing it on test means stop and check the pipeline.',
      },
    },
    {
      type: 'note',
      md: `**The four assumptions, and how much to care.** (1) **Linearity** — the true relation is linear in your features; violated means biased predictions, fixed with transforms or a nonlinear model. (2) **Independence** of errors — broken by time series and repeated measures. (3) **Homoscedasticity** — error spread is constant across ŷ; a funnel shape in the residual plot says it is not. (4) **Normality of residuals** — needed only for p-values and confidence intervals, never for prediction. Practical stance: **plot residuals against ŷ**. Curvature means you got linearity wrong. A funnel means your intervals lie. Violations do not make your predictions useless — they make your *uncertainty claims* useless.`,
    },
  ],
  quiz: [
    {
      question: 'Polynomial regression fits curves. Why is it still called *linear* regression?',
      options: [
        {
          text: 'It is not, really — the name is historical sloppiness',
          explanation: 'There is a precise reason, and interviewers want it. The name is exact, just not about the shape of the curve.',
        },
        {
          text: 'Because the model is linear in the PARAMETERS w — x², x³ are simply new input columns',
          explanation: 'Correct. Linearity refers to how w enters the equation, not to how the fitted curve looks. Same solver, new columns.',
        },
        {
          text: 'Because the fitted curve becomes straight if you zoom in far enough',
          explanation: 'True of any smooth curve and irrelevant here. The definition is about the parameters, not local geometry.',
        },
      ],
      correct: 1,
    },
    {
      question: 'You fit Ridge with a large λ. What happens to a useless feature\'s coefficient?',
      options: [
        {
          text: 'It becomes exactly 0 and the feature is dropped',
          explanation: 'That is Lasso. Ridge shrinks but does not delete — a square penalty stops pushing as the weight approaches 0.',
        },
        {
          text: 'It grows, to compensate for the penalty',
          explanation: 'Backwards. The penalty makes large weights expensive; nothing rewards growth.',
        },
        {
          text: 'It shrinks smoothly toward 0 but never reaches it — the feature stays in the model',
          explanation: 'Correct. The derivative of λw² is 2λw, which fades to nothing as w → 0. Ridge models are always dense.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Two features in your data are near-duplicates. How do Ridge and Lasso differ on them?',
      options: [
        {
          text: 'Ridge splits the weight between them; Lasso keeps one and zeroes the other',
          explanation: 'Correct. Squaring makes sharing cheaper (1.5²+1.5² < 3²), while L1 is indifferent to how the total is split and its corner geometry lands on an axis.',
        },
        {
          text: 'Both drop one of them',
          explanation: 'Ridge never drops anything. Its coefficients approach zero but stay nonzero.',
        },
        {
          text: 'Both split the weight evenly',
          explanation: 'Only Ridge does. Lasso has no incentive to split and its solution sits at a corner of the constraint region.',
        },
      ],
      correct: 0,
    },
    {
      question: 'What is the geometric reason L1 produces exactly-zero coefficients?',
      options: [
        {
          text: 'The L1 penalty is always numerically larger than L2 for the same weights',
          explanation: 'Not always true (for |w| < 1 the square is smaller), and size is not the mechanism anyway.',
        },
        {
          text: 'The L1 constraint region is a diamond whose corners lie ON the axes; an expanding loss contour touches a pointy region at its point, and at that corner one coordinate is exactly 0',
          explanation: 'Correct — and the circle has no corners, so its touch point lands on an axis only by coincidence. This is the answer to memorize.',
        },
        {
          text: 'Absolute value cannot represent very small numbers, so they collapse to zero',
          explanation: 'Absolute value represents small numbers perfectly. Nothing numerical is happening — it is the shape of the constraint region.',
        },
      ],
      correct: 1,
    },
    {
      question: 'You fit Lasso on raw features: annual income (~10⁶) and number of rooms (1–6). What is the silent bug?',
      options: [
        {
          text: 'The penalty is scale-sensitive: income needs a tiny coefficient and escapes the penalty, while rooms needs a large one and gets zeroed — you drop the wrong feature',
          explanation: 'Correct. The penalty sums weights across features and so assumes comparable scales. StandardScaler before any penalized model, always.',
        },
        {
          text: 'Nothing — scikit-learn standardizes internally for Lasso',
          explanation: 'It does not. Lasso and Ridge fit on exactly the columns you hand them.',
        },
        {
          text: 'Lasso will raise an error on badly scaled input',
          explanation: 'It fits happily and returns a confident, wrong model. That is what makes this bug silent and dangerous.',
        },
      ],
      correct: 0,
    },
    {
      question: 'Your model scores R² = −0.4 on the test set. What does that mean?',
      options: [
        {
          text: 'Impossible — R² is bounded between 0 and 1',
          explanation: 'That bound only holds on the training set for a fitted linear model. On held-out data R² can go arbitrarily negative.',
        },
        {
          text: 'Your model does worse than always predicting the mean of y',
          explanation: 'Correct. R² = 0 IS the mean baseline, so negative means you lost to a constant. Check for leakage, a bad split, or a target mix-up.',
        },
        {
          text: 'The correlation between predictions and truth is negative',
          explanation: 'A different thing. You can have positive correlation and still a badly negative R² if the predictions are shifted or badly scaled.',
        },
      ],
      correct: 1,
    },
    {
      question: 'You add 20 columns of pure random noise to a regression and refit. What happens to training R²?',
      options: [
        {
          text: 'It goes up — every extra column can only reduce training error. Adjusted R² penalizes the feature count and falls',
          explanation: 'Correct, and this is exactly why raw R² cannot compare models of different sizes. The demo in this module shows 0.951 → 0.993 on noise alone.',
        },
        {
          text: 'It stays the same, because noise carries no information',
          explanation: 'On the training set the fit can always give a noise column a nonzero weight and shave off a little error. R² strictly rises.',
        },
        {
          text: 'It goes down, because noise hurts the model',
          explanation: 'True on TEST data. On training data the fit can only improve — that is the trap this question is about.',
        },
      ],
      correct: 0,
    },
    {
      question: 'A stakeholder asks how good your rent model is. Which metric do you say out loud, and why?',
      options: [
        {
          text: 'MSE, because it is what the model optimizes',
          explanation: 'MSE is in rupees-squared. Nobody, including you, has intuition for rupees-squared.',
        },
        {
          text: 'RMSE, because it is in the same units as y — "we are typically off by ₹2,300 a month"',
          explanation: 'Correct. Same units as the target is exactly why RMSE is the quotable one. Add MAE if outliers are inflating it.',
        },
        {
          text: 'R², because it reads like a percentage',
          explanation: 'Useful as a supporting number, but it says nothing about the size of a typical error in rupees — which is what the stakeholder actually needs.',
        },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'L1 vs L2 regularization — explain the difference and when you would pick each.',
      answer:
        'Both add λ·penalty to the same MSE loss; they differ only in how "size" is measured. L2 (Ridge) uses Σw²: it shrinks weights smoothly toward zero, never to zero, and because squaring makes sharing cheap it spreads weight across correlated features. L1 (Lasso) uses Σ|w|: it drives weak weights to exactly zero, giving automatic feature selection and a sparse, interpretable, faster model — but among correlated features it keeps one arbitrarily, so the selection is unstable across resamples. Pick Ridge when you believe most features carry some signal and are correlated; pick Lasso when you suspect most features are useless and you want them named; pick Elastic Net when you want sparsity AND your features come in correlated clusters. Both are mandatory-scaling models.',
      isCaseBased: false,
    },
    {
      question: 'Why does L1 give exactly zero and L2 not? Give both the geometric and the calculus argument.',
      answer:
        'Geometric: rewrite each as constrained optimization — minimize squared error subject to Σ|w| ≤ t (L1) or Σw² ≤ t (L2). The solution is where the expanding loss contour first touches the constraint region. The L1 region is a diamond whose corners sit ON the axes; a pointy region gets touched at its point, and a corner has a coordinate that is exactly zero. The L2 region is a circle — no corners, so the touch point lies on an axis only for one exact contour orientation, a measure-zero coincidence. Calculus: ∂/∂w of λ|w| is λ·sign(w), a constant ±λ push that is still at full strength as w → 0, so it can push a weight all the way to zero and hold it there whenever the fit gradient is smaller than λ. ∂/∂w of λw² is 2λw, which fades as w shrinks, so it asymptotes to zero and never arrives.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague ships a Lasso model. The coefficient on the feature the business swears is most important came out 0. Debug it.',
      answer:
        'First hypothesis, and usually the answer: no feature scaling. The L1 penalty sums weights across features, so a feature measured in large units needs a tiny coefficient and pays almost no penalty, while a small-unit feature needs a large coefficient and gets executed regardless of how predictive it is. Check whether StandardScaler is in the pipeline (and fitted on train only). Second: λ (alpha) is simply too high — sweep it with LassoCV and watch when the coefficient reappears. Third: correlation. If the feature is a near-duplicate of another column, Lasso keeps exactly one of them essentially arbitrarily; the signal is still in the model under a different name. Test by dropping the rival column and refitting, or switch to Elastic Net so the cluster is kept or dropped together. Fourth, only then: the feature genuinely adds nothing beyond the others, which is a real and useful finding. Note the framing: "coefficient = 0" means "not needed given the other columns", not "unrelated to y".',
      isCaseBased: true,
    },
    {
      question: 'Case: training R² is 0.92, test R² is 0.31, and the fitted coefficients are enormous with alternating signs (+4100, −38000, +91000). Diagnose and fix.',
      answer:
        'Classic overfit, and the coefficients are the fingerprint: huge opposing weights are what a model buys violent wiggles with, so it is almost certainly a high-degree polynomial or a very wide feature set relative to sample size. Fixes in order of effort: (1) regularize — Ridge first since it directly penalizes the squared magnitudes that are exploding, with λ chosen by k-fold CV; (2) reduce capacity — lower the polynomial degree, or use Lasso to cut the feature count outright; (3) get more data, which is the only fix that raises capacity without raising variance; (4) verify the split itself — a test R² that collapses can also mean a distribution shift or a leaky/duplicated train set, so check before blaming the model. Confirm the fix by watching the gap between train and validation error close, not by watching training error.',
      isCaseBased: true,
    },
    {
      question: 'How do you choose λ (alpha)? What would you never do?',
      answer:
        'Never choose it by training error — training error is minimized at λ = 0 by construction, so it will always tell you not to regularize. Use k-fold cross-validation over a log-spaced grid (1e-3 to 1e2 typically, since the interesting behaviour is multiplicative not additive), scoring on the held-out fold, and take the λ with the best mean score. RidgeCV/LassoCV do this in one call. Two refinements worth naming: the one-standard-error rule (among λ within one SE of the best, take the largest — the simplest model that is statistically as good), and using the same CV loop to select λ jointly with other preprocessing choices inside a Pipeline so the scaler is refit per fold and no test information leaks in.',
      isCaseBased: false,
    },
    {
      question: 'Case: a PM sees that "number of bedrooms" has a small coefficient and concludes bedrooms do not affect rent. Respond.',
      answer:
        'Three corrections. (1) Coefficient magnitude is not importance unless features are on a common scale — bedrooms ranges 1–5 while area ranges 300–3000, so the same real effect shows up as a much smaller number. Compare standardized coefficients, or better, use permutation importance. (2) It is a conditional statement: it means bedrooms adds little *given area is already in the model*, and bedrooms is heavily correlated with area — the signal is in the model, just attributed to a different column. Drop area and the bedroom coefficient will jump. (3) It is not causal; it is what the fit needed given the other columns present. The honest phrasing: "holding area fixed, an extra bedroom adds about X — but bedrooms and area move together, so we cannot cleanly separate them from this data."',
      isCaseBased: true,
    },
    {
      question: 'How do you choose the degree in polynomial regression, and what goes wrong at high degree?',
      answer:
        'Choose it by validation error, never training error: sweep degree 1..n, plot train and validation error together, and pick the degree where validation error bottoms out — that is the bias-variance minimum. High degree fails in three ways: coefficients explode with alternating signs; the fit oscillates wildly between data points and behaves catastrophically outside the training range (extrapolation with a degree-15 polynomial is a guaranteed disaster); and the feature count blows up combinatorially once you include interaction terms across many inputs, which brings its own overfitting and compute cost. In practice, prefer a low degree plus regularization to a high degree alone, or switch to splines / a tree model, which get flexibility without the global oscillation.',
      isCaseBased: false,
    },
    {
      question: 'R², adjusted R², RMSE, MAE — which one do you report, and when?',
      answer:
        'RMSE for the headline, because it is in the units of y and a human can act on it ("off by ₹2,300 a month"). MAE alongside it when outliers matter: MAE weights every miss linearly, so a large RMSE/MAE gap tells you a handful of big misses are dominating your error and are worth investigating individually. R² to communicate explanatory power relative to the mean baseline, since it is scale-free and comparable across datasets. Adjusted R² instead of raw R² whenever you are comparing models with different numbers of features, because raw R² on training data can only rise as features are added. And MSE stays the training objective — it is the thing you optimize, not the thing you quote.',
      isCaseBased: false,
    },
    {
      question: 'Why is the intercept excluded from the regularization penalty?',
      answer:
        'The intercept is not a sensitivity to any feature — it is the baseline level of y. Penalizing it would mean the model is punished for the target simply being large, so adding a constant to every y would change the fitted relationship, which is nonsense. Formally, we want the estimator to be equivariant under a shift of the target; leaving b unpenalized delivers that. Practically, scikit-learn handles this for you (fit_intercept=True centers the data and excludes b), which is also why you center features — an uncentered X makes the intercept absorb feature means and muddies the penalty.',
      isCaseBased: false,
    },
    {
      question: 'What are the assumptions of linear regression, and which of them actually matter for a prediction task?',
      answer:
        'Linearity (the true relation is linear in the features), independence of errors, homoscedasticity (constant error variance), and approximately normal residuals. For pure prediction, only linearity really threatens you — get it wrong and predictions are systematically biased, visible as curvature in a residuals-vs-fitted plot. Independence matters when it is violated structurally: time series or repeated measures give you optimistically small errors and an invalid CV scheme, which is a real bug. Homoscedasticity and normality mostly affect *inference*: standard errors, p-values, confidence and prediction intervals. The clean stance to state in an interview: "violations do not make my point predictions useless, they make my uncertainty claims useless" — and the one diagnostic that catches most of it is plotting residuals against fitted values.',
      isCaseBased: false,
    },
    {
      question: 'When is Ridge preferable to plain OLS purely for numerical reasons, independent of overfitting?',
      answer:
        'When XᵀX is singular or ill-conditioned, which happens whenever features are perfectly (or nearly) collinear, or when d > m — more features than samples, common in genomics and text. The plain normal equation needs (XᵀX)⁻¹ and there is no unique solution in those cases. Ridge solves (XᵀX + λI)⁻¹XᵀY, and adding λI to the diagonal makes the matrix positive definite and therefore invertible for any λ > 0. That is where the name "ridge" comes from — a ridge added along the diagonal. So even with λ tiny, Ridge turns an ill-posed problem into a well-posed one with a unique, stable solution.',
      isCaseBased: false,
    },
    {
      question: 'Elastic Net exists because Lasso has a specific weakness. Name it and explain how Elastic Net helps.',
      answer:
        'Lasso is unstable on correlated feature groups: among near-duplicates it keeps exactly one and zeroes the rest, and which one it keeps can flip with a small change in the data — so your "selected features" are not reproducible, which is fatal if the selection is the deliverable. Lasso also cannot select more than m features when d > m. Elastic Net adds both penalties, λ₁Σ|w| + λ₂Σw². The L1 part still delivers exact zeros; the L2 part restores the grouping effect, so correlated features tend to enter or leave together with shared weight. Cost: a second hyperparameter (in scikit-learn, alpha plus l1_ratio) and therefore a 2-D CV search.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    {
      front: 'Multiple linear regression, compactly',
      back: 'ŷ = wᵀx + b, or ŷ = Xw for all m rows at once. Loss and gradient are identical to the single-feature case: (1/m)Xᵀ(Xw − y).',
    },
    {
      front: 'How to read a coefficient honestly',
      back: 'Conditional and per-unit: "holding all other features fixed, +1 unit of x adds w to ŷ". Depends on units, is not importance unless scaled, and is not causal.',
    },
    {
      front: 'Polynomial regression — the one line',
      back: 'Add x², x³ as new columns and reuse the same model. Linear in the PARAMETERS, not in x. New data, same algorithm.',
    },
    {
      front: 'The shape of every regularized loss',
      back: 'fit error + λ · penalty(w). λ = 0 → plain least squares. λ → ∞ → all weights crushed. λ is chosen from outside the training data.',
    },
    {
      front: 'Ridge (L2)',
      back: 'Penalty λΣw². Shrinks weights smoothly, never to exactly 0. Shares weight across correlated features. Makes (XᵀX + λI) invertible. Dense model.',
    },
    {
      front: 'Lasso (L1)',
      back: 'Penalty λΣ|w|. Drives weak weights to EXACTLY 0 → automatic feature selection, sparse model. Among correlated features keeps one, arbitrarily.',
    },
    {
      front: 'Why L1 zeroes weights',
      back: 'Geometry: the diamond has corners ON the axes, and a contour touches a pointy region at its point → one coordinate exactly 0. The circle has no corners. Calculus: d(λ|w|)/dw = ±λ, constant even at w → 0; d(λw²)/dw = 2λw, which fades.',
    },
    {
      front: 'Elastic Net + picking λ',
      back: 'Elastic Net = λ₁Σ|w| + λ₂Σw²: Lasso sparsity with Ridge grouping for correlated clusters. Pick λ by k-fold CV on a log grid (RidgeCV/LassoCV) — never by training error.',
    },
    {
      front: 'Scaling and regularization',
      back: 'MANDATORY. The penalty sums weights across features, so it assumes comparable scales. Unscaled → the large-unit feature escapes the penalty and the small-unit one gets zeroed. Silent, no error raised.',
    },
    {
      front: 'Regression metrics cheat sheet',
      back: 'MSE: optimize it. RMSE: quote it (same units as y). MAE: robust to outliers. R²: variance explained vs the mean baseline; 0 = tied the mean, negative = worse than the mean. Adjusted R²: use when feature counts differ, since raw training R² only ever rises.',
    },
  ],
  mindmapMarkdown: `- Regression II: Polynomials, Ridge vs Lasso & Evaluation
  - Multiple linear regression
    - ŷ = wᵀx + b, all rows: ŷ = Xw
    - Same MSE, same gradient as one feature
    - Coefficient = conditional, per-unit, not causal
    - Correlated features → unstable, uninterpretable weights
  - Polynomial regression
    - New columns x², x³ — not a new model
    - Linear in the PARAMETERS, not in x
    - Degree = bias-variance dial (see Level 0)
    - Overfit fingerprint: huge alternating coefficients
  - Regularization
    - fit error + λ · penalty
    - λ = the price of a weight
    - Trades a little bias for a lot less variance
  - Ridge (L2)
    - λΣw², shrinks smoothly
    - Never exactly zero — dense model
    - Shares weight across correlated features
    - (XᵀX + λI) always invertible
  - Lasso (L1)
    - λΣ|w|, weights hit exactly 0
    - Automatic feature selection, sparse model
    - Keeps one of a correlated pair, arbitrarily
    - No closed form — coordinate descent
  - Why L1 zeroes
    - Diamond corners lie ON the axes
    - Contour touches a pointy region at its point
    - Circle has no corners → axis hit is a coincidence
    - d(λ|w|)/dw = ±λ constant vs d(λw²)/dw = 2λw fades
  - Elastic Net
    - Both penalties: sparsity + grouping
  - Choosing λ
    - k-fold cross-validation, log-spaced grid
    - RidgeCV / LassoCV, one-standard-error rule
    - Never by training error
  - Feature scaling
    - Mandatory before any penalty
    - Silent bug: the wrong feature gets zeroed
  - Evaluation
    - MSE — optimize
    - RMSE — quote, same units as y
    - MAE — robust to outliers
    - R² vs the mean baseline; negative = worse than the mean
    - Adjusted R² when feature counts differ
  - Assumptions
    - Linearity, independence, homoscedasticity, normal residuals
    - Check residuals vs fitted
    - Violations break intervals, not necessarily predictions`,
}

export default m
