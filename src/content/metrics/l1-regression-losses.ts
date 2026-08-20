import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l1-regression-losses',
  subjectId: 'metrics',
  level: 1,
  title: 'Regression Losses: MSE, MAE, Huber & Quantile',
  whyItMatters:
    'Picking a regression loss is not a style choice — it silently decides what your model predicts. MSE predicts the mean, MAE predicts the median, quantile loss predicts whatever percentile the business needs. Interviewers ask "why this loss?" precisely because most candidates answer "it is the default", and one dirty row is enough to show the difference: in this module a single outlier drags the MSE fit 13 units and the MAE fit 0.5.',
  estMinutes: 50,
  sections: [
    {
      type: 'intuition',
      title: 'A loss is a definition of "typical"',
      md: `Five delivery times: 10, 11, 12, 13, 14 minutes. Predict one number for all of them. Easy — 12.

Now a sixth order comes in at **90** minutes. The driver's bike broke. Predict one number again.

- Say 25 and you are wrong about every single normal delivery.
- Say 12 and you are catastrophically wrong about one.
- There is no "correct" answer. There is only **what you decided to be wrong about**.
- The loss function is where you write that decision down. It is not a technicality — it is the spec.
- MSE says 25. MAE says 12.5. Both are minimising *their* loss perfectly. They just disagree about what "typical" means.`,
    },
    {
      type: 'intuition',
      title: 'MSE: square the miss',
      md: `**MSE — Mean Squared Error.** For each row take the residual (actual minus prediction), square it, average.

- One convention for this whole module: **r = y − ŷ**. Actual minus prediction. Positive r means you predicted too low.
- Miss by 2 → pay 4. Miss by 10 → pay 100. Miss by 78 → pay 6,084.
- Squaring is a **quadratic** penalty: doubling the error quadruples the cost. Big misses are not slightly worse, they are catastrophically worse.
- That is a feature when big misses really are catastrophic (a bridge, a dosage) and a bug when big misses are just bad data.
- Second reason it is everywhere: it is **smooth everywhere**. The derivative is −2r — continuous, and it shrinks as you approach the answer.
- That shrinking is what makes gradient descent settle down instead of jittering: big error → big step, small error → small step, automatically.`,
    },
    {
      type: 'math',
      intro: 'MSE, its derivative, and the one fact that actually matters about it.',
      latex: [
        '\\text{MSE} = \\frac{1}{n}\\sum_{i=1}^{n}\\left(y_i - \\hat{y}_i\\right)^2 \\qquad \\frac{\\partial}{\\partial \\hat{y}}\\left(y - \\hat{y}\\right)^2 = -2\\left(y - \\hat{y}\\right)',
        '\\arg\\min_{c}\\;\\mathbb{E}\\!\\left[(Y - c)^2\\right] \\;=\\; \\mathbb{E}[Y] \\qquad \\text{(the conditional MEAN)}',
      ],
    },
    {
      type: 'intuition',
      title: 'What MSE really is: Gaussian maximum likelihood',
      md: `That second line is the whole point. Train with MSE and your model is estimating **E[y | x]** — the conditional mean. Not "the value", not "the typical case". The mean.

- Where does the mean come from? Assume the noise is Gaussian: y = f(x) + ε with ε ~ N(0, σ²).
- Write the log-likelihood of your data under that assumption. The Gaussian's exponent is −(y − ŷ)²/2σ².
- Everything else is a constant, so **maximising the likelihood is exactly minimising the sum of squared errors**.
- MSE is not a convenient formula somebody invented. It is the **maximum-likelihood estimator under Gaussian noise** — see MLE in *Probability, Bayes & the Statistics ML Actually Uses* in the Math subject.
- Flip it around and you get the honest warning: **if your noise is not Gaussian, MSE is optimising the wrong thing.** Heavy tails, spikes, one-in-a-thousand disasters — those are exactly non-Gaussian, and exactly where MSE misbehaves.
- Same trick names MAE too: absolute error is the maximum-likelihood loss under **Laplace** (double-exponential) noise, which has fatter tails than Gaussian. Fat tails assumed → outliers surprise it less.`,
    },
    {
      type: 'math',
      intro: 'The derivation, in three lines. Worth being able to reproduce on a whiteboard.',
      latex: [
        'y_i = f(x_i) + \\varepsilon_i, \\qquad \\varepsilon_i \\sim \\mathcal{N}(0, \\sigma^2)',
        '\\log \\mathcal{L} = \\sum_{i=1}^{n} \\log \\frac{1}{\\sqrt{2\\pi\\sigma^2}}\\exp\\!\\left(-\\frac{(y_i - \\hat{y}_i)^2}{2\\sigma^2}\\right) = -\\frac{1}{2\\sigma^2}\\sum_{i=1}^{n}\\left(y_i - \\hat{y}_i\\right)^2 + \\text{const}',
        '\\max_{\\hat{y}} \\log \\mathcal{L} \\;\\iff\\; \\min_{\\hat{y}} \\sum_i \\left(y_i - \\hat{y}_i\\right)^2 \\;\\iff\\; \\min_{\\hat{y}} \\text{MSE}',
      ],
    },
    {
      type: 'intuition',
      title: 'MAE: pay the distance, not the square',
      md: `**MAE — Mean Absolute Error.** Same residuals, but you pay |r| instead of r².

- Miss by 2 → pay 2. Miss by 78 → pay 78. Linear. A big miss is exactly as bad as it is big.
- Consequence: **one outlier cannot buy the model.** Under MSE, a residual of 78 is worth 6,084 units of "please move toward me". Under MAE it is worth 78.
- What MAE estimates is the **conditional median**, not the mean. That is a different quantity, and often the one a human actually wanted: "half our deliveries take under X minutes".
- Its cost is in the gradient. The derivative of |r| is **−sign(r)** — a constant ±1, whatever the distance.
- Far from the answer? Step size 1. Nearly there? Still step size 1. There is no automatic slowdown, so training **wobbles around the optimum** instead of settling into it. You fix it with a learning-rate schedule, which is one more thing to tune.
- And at r = 0 exactly the derivative **does not exist** — there is a kink. Frameworks use the **subgradient** convention: any value in [−1, 1] is valid, and they pick 0. Harmless in practice, but it is the thing to say out loud when asked "is MAE differentiable?".`,
    },
    {
      type: 'math',
      intro: 'MAE, its (sub)gradient, and its minimiser.',
      latex: [
        '\\text{MAE} = \\frac{1}{n}\\sum_{i=1}^{n}\\left|y_i - \\hat{y}_i\\right| \\qquad \\frac{\\partial}{\\partial \\hat{y}}\\left|y - \\hat{y}\\right| = -\\operatorname{sign}\\!\\left(y - \\hat{y}\\right)',
        '\\arg\\min_{c}\\;\\mathbb{E}\\!\\left[\\,\\left|Y - c\\right|\\,\\right] \\;=\\; \\operatorname{median}(Y)',
        '\\text{At } r = 0 \\text{ the derivative does not exist. Subgradient } \\in [-1, 1]; \\text{ libraries take } 0.',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The outlier demo: add ONE bad row, watch each loss move',
      code: `import numpy as np

clean = np.array([10., 11., 12., 13., 14.])
dirty = np.append(clean, 90.)           # ONE bad row: a typo, a whale, a broken bike
grid = np.arange(0, 100.001, 0.001)     # every candidate constant prediction

def fit(loss):                          # a FLAT minimum is a tie -> report its midpoint
    hit = grid[loss <= loss.min() + 1e-9]
    return 0.5 * (hit[0] + hit[-1])

def best(y, delta=2.0):
    r = y[None, :] - grid[:, None]      # residual = actual - prediction
    a = np.abs(r)
    hub = np.where(a <= delta, 0.5 * r ** 2, delta * (a - 0.5 * delta))
    return dict(MSE=fit((r ** 2).mean(1)), MAE=fit(a.mean(1)), Huber=fit(hub.mean(1)))

for tag, y in (('clean', clean), ('dirty', dirty)):
    b = best(y)
    print('%s  MSE-fit=%5.2f  MAE-fit=%5.2f  Huber-fit=%5.2f' % (tag, b['MSE'], b['MAE'], b['Huber']))

# ---- real output ----
# clean  MSE-fit=12.00  MAE-fit=12.00  Huber-fit=12.00
# dirty  MSE-fit=25.00  MAE-fit=12.50  Huber-fit=12.50`,
      annotations: {
        5: 'Brute-force grid instead of a formula, on purpose: MAE has no closed form beyond "the median", and I want the actual minimiser of each loss, not a claim about it.',
        7: 'MAE does not always have a unique minimiser. On an even-sized sample its loss surface is dead FLAT across a whole interval and every point in that interval is equally optimal, so a plain argmin would silently report the left edge. This helper reports the midpoint of the flat floor instead - which is exactly the median convention.',
        12: 'One convention for the whole module: residual = actual - prediction. Sign only matters for the quantile loss later.',
        14: 'Huber in one line: half-squared inside delta, then a straight line. delta=2 means "more than 2 minutes off is an outlier, stop escalating".',
        17: 'Same data, same grid, three losses. Nothing differs except what each one charges for a miss.',
        23: 'One bad row moved the MSE fit by 13.0 (12 -> 25) and the MAE/Huber fit by 0.5 (12 -> 12.5). That is the entire argument. Footnote on the MAE number: here the loss is flat across the whole of [12, 13], so 12.50 is the midpoint of that tie - and it is the median of [10, 11, 12, 13, 14, 90]. MSE and Huber each have a single sharp minimum, no tie to break.',
      },
    },
    {
      type: 'note',
      md: `Read the two output lines like an interviewer. On clean data all three losses agree perfectly — **12.00, 12.00, 12.00**. Loss choice looks like a non-issue. Then one row out of six goes bad, and MSE relocates the prediction to **25.0**, a value that is wrong about every single real delivery, while MAE and Huber move by half a minute. The lesson is not "MSE is bad" — it is that *the loss you pick is invisible until your data gets dirty, and then it is the only thing that matters.* Corollary you can say out loud: if switching MSE to MAE changes your predictions a lot, you have an outlier problem you have not looked at yet.`,
    },
    {
      type: 'intuition',
      title: 'Huber: quadratic where it helps, linear where it hurts',
      md: `MSE has a good gradient and a bad temper. MAE has a good temper and a bad gradient. Huber glues the good halves together.

- Within **δ** of zero: behave like MSE (½r²) — smooth, self-slowing, converges cleanly.
- Beyond δ: behave like MAE (a straight line of slope δ) — an outlier at 78 stops screaming.
- The two pieces are chosen so the value *and* the slope match at |r| = δ. No kink, no jump — that is why it is differentiable everywhere, unlike MAE.
- So: **smooth near the optimum AND robust to outliers.** That sentence is the whole interview answer.
- The price is a hyperparameter. δ is where you draw the line between "a normal miss" and "an outlier".
- Rules of thumb for δ: set it near the residual size you would call suspicious in domain terms; or standardise residuals and use **δ ≈ 1.345·σ**, which retains ~95% of MSE's efficiency on genuinely Gaussian data while capping outlier influence (this is scikit-learn's \`HuberRegressor(epsilon=1.35)\` default). Small δ → more like MAE. Huge δ → back to MSE.
- **log-cosh** is the smooth cousin: log(cosh r) is ≈ ½r² for small r and ≈ |r| − log 2 for large r, infinitely differentiable, no δ to tune — you trade the knob for a fixed transition, which is why gradient-boosting libraries offer it as a drop-in.`,
    },
    {
      type: 'math',
      intro: 'Huber and log-cosh. r = y − ŷ throughout.',
      latex: [
        'L_\\delta(r) = \\begin{cases} \\tfrac{1}{2}r^2 & |r| \\le \\delta \\\\[4pt] \\delta\\left(|r| - \\tfrac{1}{2}\\delta\\right) & |r| > \\delta \\end{cases}',
        '\\frac{dL_\\delta}{dr} = \\begin{cases} r & |r| \\le \\delta \\\\[4pt] \\delta\\,\\operatorname{sign}(r) & |r| > \\delta \\end{cases} \\quad\\Longrightarrow\\quad \\text{gradient magnitude is capped at } \\delta',
        'L_{\\text{logcosh}}(r) = \\log\\!\\left(\\cosh r\\right) \\;\\approx\\; \\tfrac{1}{2}r^2 \\;(\\text{small } r), \\qquad \\approx\\; |r| - \\log 2 \\;(\\text{large } r)',
      ],
    },
    {
      type: 'note',
      md: `The line worth memorising is the derivative, not the loss: **Huber caps the gradient magnitude at δ.** No single row can push harder than δ, no matter how wrong it is. That is *exactly* what gradient clipping does in deep learning, and it is why "Huber loss" and "clip the gradients" solve the same problem from two directions. Reinforcement learning's DQN uses Huber for this reason — a rare, enormous TD error would otherwise blow up the network.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'All four losses, same residual vector, one outlier — the penalty table',
      code: `import numpy as np

y = np.array([10., 11., 12., 13., 14., 90.])   # the last row is the outlier
r = y - 12.0                                   # residual = actual - prediction
a, delta, tau = np.abs(r), 2.0, 0.9

mse = r ** 2
mae = a
hub = np.where(a <= delta, 0.5 * r ** 2, delta * (a - 0.5 * delta))
pin = np.maximum(tau * r, (tau - 1) * r) + 0.0   # pinball / quantile, tau = 0.9

print('  resid       MSE     MAE     Huber   Pinball')
for row in np.c_[r, mse, mae, hub, pin]:
    print('%7.1f %9.2f %7.2f %9.2f %9.2f' % tuple(row))
print('   mean %9.2f %7.2f %9.2f %9.2f' % (mse.mean(), mae.mean(), hub.mean(), pin.mean()))
print('one outlier vs the five good rows: MSE %.0fx  MAE %.0fx  Huber %.0fx'
      % tuple(v[-1] / v[:-1].sum() for v in (mse, mae, hub)))

# ---- real output ----
#   resid       MSE     MAE     Huber   Pinball
#    -2.0      4.00    2.00      2.00      0.20
#    -1.0      1.00    1.00      0.50      0.10
#     0.0      0.00    0.00      0.00      0.00
#     1.0      1.00    1.00      0.50      0.90
#     2.0      4.00    2.00      2.00      1.80
#    78.0   6084.00   78.00    154.00     70.20
#    mean   1015.67   14.00     26.50     12.20
# one outlier vs the five good rows: MSE 608x  MAE 13x  Huber 31x`,
      annotations: {
        4: 'Everything is evaluated at the same prediction (12.0) so the columns are directly comparable: identical residuals, four different price lists.',
        9: 'Huber uses HALF the square inside delta, so its quadratic column reads as half of MSE. Compare shapes across a column, not absolute levels across rows.',
        10: 'Pinball with tau=0.9 charges 0.9 per unit of UNDER-prediction (r > 0) and only 0.1 per unit of over-prediction. The +0.0 just cleans up a "-0.00" print artefact at r = 0.',
        16: 'The number that decides everything: under MSE the single outlier outweighs the five good rows 608 to 1. Under MAE, 13 to 1. Under Huber, 31 to 1.',
        26: 'Look at the outlier row across the table: 6084 vs 78 vs 154 vs 70.2. Same mistake, four completely different opinions about how much it should cost you.',
      },
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One residual vector, four price lists',
        notice: 'Step through the losses. The residuals never change — only what each loss charges for them. Watch the bottom row.',
        leftLabel: 'residual  r = y - y_hat',
        rightLabel: 'penalty charged',
        frames: [
          {
            note: 'MSE: total 6094.00, mean 1015.67. The outlier alone is 608x the five good rows combined. Minimise this and the fitted prediction jumps to 25.0 - a number that is wrong about every real delivery.',
            stack: [
              { name: 'r1 = -2.0', to: 'p1' },
              { name: 'r2 = -1.0', to: 'p2' },
              { name: 'r3 =  0.0', to: 'p3' },
              { name: 'r4 = +1.0', to: 'p4' },
              { name: 'r5 = +2.0', to: 'p5' },
              { name: 'r6 = +78.0  OUTLIER', to: 'p6', danger: true },
            ],
            heap: [
              { id: 'p1', value: 'r^2 = 4.00' },
              { id: 'p2', value: 'r^2 = 1.00' },
              { id: 'p3', value: 'r^2 = 0.00' },
              { id: 'p4', value: 'r^2 = 1.00' },
              { id: 'p5', value: 'r^2 = 4.00' },
              { id: 'p6', value: 'r^2 = 6084.00', label: 'explodes' },
            ],
          },
          {
            note: 'MAE: total 84.00, mean 14.00. Same outlier, now 13x the good rows instead of 608x. Fitted prediction 12.5 - it barely moved. Cost: the gradient is a flat +/-1 everywhere, so training wobbles at the bottom.',
            stack: [
              { name: 'r1 = -2.0', to: 'p1' },
              { name: 'r2 = -1.0', to: 'p2' },
              { name: 'r3 =  0.0', to: 'p3' },
              { name: 'r4 = +1.0', to: 'p4' },
              { name: 'r5 = +2.0', to: 'p5' },
              { name: 'r6 = +78.0  OUTLIER', to: 'p6' },
            ],
            heap: [
              { id: 'p1', value: '|r| = 2.00' },
              { id: 'p2', value: '|r| = 1.00' },
              { id: 'p3', value: '|r| = 0.00' },
              { id: 'p4', value: '|r| = 1.00' },
              { id: 'p5', value: '|r| = 2.00' },
              { id: 'p6', value: '|r| = 78.00', label: 'stays linear' },
            ],
          },
          {
            note: 'Huber, delta = 2: total 159.00, mean 26.50. Inside +/-2 it is half-squared (smooth, self-slowing); beyond that it charges a flat slope of 2 per unit. Fitted prediction 12.5, same as MAE - but differentiable everywhere.',
            stack: [
              { name: 'r1 = -2.0', to: 'p1' },
              { name: 'r2 = -1.0', to: 'p2' },
              { name: 'r3 =  0.0', to: 'p3' },
              { name: 'r4 = +1.0', to: 'p4' },
              { name: 'r5 = +2.0', to: 'p5' },
              { name: 'r6 = +78.0  OUTLIER', to: 'p6' },
            ],
            heap: [
              { id: 'p1', value: '0.5r^2 = 2.00', label: 'quadratic' },
              { id: 'p2', value: '0.5r^2 = 0.50', label: 'quadratic' },
              { id: 'p3', value: '0.5r^2 = 0.00', label: 'quadratic' },
              { id: 'p4', value: '0.5r^2 = 0.50', label: 'quadratic' },
              { id: 'p5', value: '0.5r^2 = 2.00', label: 'quadratic' },
              { id: 'p6', value: '2(|r|-1) = 154.00', label: 'linear' },
            ],
          },
          {
            note: 'Pinball, tau = 0.9: total 73.20, mean 12.20. Now the price depends on the SIGN. Under-predicting (r > 0) costs 0.9 per unit; over-predicting costs 0.1. Minimising this fits the 90th percentile, not the middle - deliberately biased high.',
            stack: [
              { name: 'r1 = -2.0  over', to: 'p1' },
              { name: 'r2 = -1.0  over', to: 'p2' },
              { name: 'r3 =  0.0', to: 'p3' },
              { name: 'r4 = +1.0  under', to: 'p4' },
              { name: 'r5 = +2.0  under', to: 'p5' },
              { name: 'r6 = +78.0  under', to: 'p6' },
            ],
            heap: [
              { id: 'p1', value: '0.1 x 2.0 = 0.20', label: 'cheap' },
              { id: 'p2', value: '0.1 x 1.0 = 0.10', label: 'cheap' },
              { id: 'p3', value: '0.00' },
              { id: 'p4', value: '0.9 x 1.0 = 0.90', label: 'expensive' },
              { id: 'p5', value: '0.9 x 2.0 = 1.80', label: 'expensive' },
              { id: 'p6', value: '0.9 x 78.0 = 70.20', label: 'expensive' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Quantile (pinball) loss: when being wrong up costs more than wrong down',
      md: `All three losses so far are symmetric — a miss of +5 costs exactly what a miss of −5 costs. In business that is almost never true.

- You run a warehouse. **Stock out** and you lose the sale plus a customer, say ₹900. **Overstock** and you carry one unit, say ₹100.
- A symmetric loss will happily balance those, and you will run out of stock roughly half the time. That is not a modelling error — you told it they cost the same.
- **Pinball loss** fixes it by charging different rates for the two directions: τ per unit of under-prediction, (1 − τ) per unit of over-prediction.
- Minimise it and the model no longer predicts the middle. It predicts the **τ-th quantile** of y.
- τ = 0.5 charges both sides 0.5, which is just half of MAE — hence the median. τ = 0.9 charges under-prediction 9× more, so the model deliberately aims high.
- The τ you want is not a hyperparameter to tune, it is arithmetic: **τ = C_under / (C_under + C_over)**. With 900 and 100 that is 0.9. Stock the 90th percentile of demand.
- This is the classic newsvendor result, and saying it in an interview lands hard, because it turns "which loss?" into a finance question with one right answer.`,
    },
    {
      type: 'math',
      intro: 'Pinball loss and what it estimates. r = y − ŷ, so r > 0 means you predicted too low.',
      latex: [
        'L_\\tau(r) = \\max\\!\\left(\\tau r,\\; (\\tau - 1) r\\right) = \\begin{cases} \\tau\\, r & r \\ge 0 \\;\\;(\\text{under-predicted}) \\\\[4pt] (\\tau - 1)\\, r & r < 0 \\;\\;(\\text{over-predicted}) \\end{cases}',
        '\\arg\\min_{c}\\;\\mathbb{E}\\!\\left[L_\\tau(Y - c)\\right] \\;=\\; Q_\\tau(Y) \\qquad \\tau = 0.5 \\;\\Rightarrow\\; \\tfrac{1}{2}\\text{MAE} \\;\\Rightarrow\\; \\text{median}',
        '\\tau^{*} = \\frac{C_{\\text{under}}}{C_{\\text{under}} + C_{\\text{over}}} \\qquad \\text{stockout } 900,\\; \\text{holding } 100 \\;\\Rightarrow\\; \\tau^{*} = 0.9',
      ],
    },
    {
      type: 'intuition',
      title: 'The bonus: prediction intervals for free',
      md: `Fit the same model twice with two different τ and you stop shipping a number — you ship a range.

- Fit τ = 0.1 → a line with ~10% of actuals below it. Fit τ = 0.9 → ~90% below it.
- The gap between them is an **80% prediction interval**. No Gaussian assumption, no bootstrap, no conformal machinery — just two fits.
- Why it beats a confidence interval from a linear model: the width is learned per-row, so it can be narrow where the data is tight and wide where it is noisy. Real data is heteroscedastic (spread changes with x) and this handles it natively.
- Sanity check you must run: on held-out data, is the fraction below the τ = 0.1 line actually near 0.1? If not, the quantiles are not calibrated and the interval is decoration.
- Two known warts. **Quantile crossing**: models fitted independently can predict the 0.9 line *below* the 0.1 line for some rows — fix by sorting the outputs or fitting them jointly. And coverage is only approximate; if you need a guarantee, conformal prediction is the tool.
- Where this pays off: delivery ETAs ("12–19 min", not "15 min"), demand planning, capacity forecasting, anything a human reads and makes a decision from.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Two quantile fits become an interval — with the calibration check',
      code: `import numpy as np
from sklearn.ensemble import GradientBoostingRegressor

rng = np.random.default_rng(0)
X = rng.uniform(0, 10, 4000).reshape(-1, 1)
y = 5 + 2 * X.ravel() + rng.normal(0, 1 + 0.4 * X.ravel())   # spread GROWS with x
Xtr, Xte, ytr, yte = X[:3000], X[3000:], y[:3000], y[3000:]

band = {}
for tau in (0.1, 0.5, 0.9):
    gb = GradientBoostingRegressor(loss='quantile', alpha=tau, max_depth=3,
                                   n_estimators=200, random_state=0).fit(Xtr, ytr)
    band[tau] = gb.predict(Xte)
    print('tau=%.1f -> fraction of test rows BELOW the line: %.3f' % (tau, (yte < band[tau]).mean()))

w = band[0.9] - band[0.1]
print('80%% interval coverage = %.3f' % ((yte >= band[0.1]) & (yte <= band[0.9])).mean())
print('interval width: x<2 -> %.2f    x>8 -> %.2f' % (w[Xte.ravel() < 2].mean(), w[Xte.ravel() > 8].mean()))

# ---- real output ----
# tau=0.1 -> fraction of test rows BELOW the line: 0.125
# tau=0.5 -> fraction of test rows BELOW the line: 0.511
# tau=0.9 -> fraction of test rows BELOW the line: 0.904
# 80% interval coverage = 0.779
# interval width: x<2 -> 3.69    x>8 -> 11.56`,
      annotations: {
        6: 'Noise std is 1 + 0.4x, so the target is heteroscedastic on purpose. A single MSE fit would report one error number and hide this completely.',
        11: "sklearn spells pinball loss loss='quantile' with alpha=tau. LightGBM: objective='quantile', alpha=tau. XGBoost: reg:quantileerror.",
        14: 'The calibration check, not an afterthought. 0.125 / 0.511 / 0.904 against targets 0.1 / 0.5 / 0.9 - close, and the 0.1 line is slightly loose, which is exactly the kind of thing you report rather than hide.',
        24: 'Coverage 0.779 against a nominal 0.80. Quantile intervals are approximate, not guaranteed - say so before someone else does.',
        25: 'The payoff line: the interval is 3.69 wide where the data is tight and 11.56 wide where it is noisy. One MSE number could never have told you that.',
      },
    },
    {
      type: 'intuition',
      title: 'The decision list',
      md: `Four losses, four situations. Memorise the mapping, not the formulas.

- **Clean data, symmetric costs, you want the average** → **MSE**. It is the default for a reason: correct under Gaussian noise, best-behaved gradient, and every downstream tool (R², standard errors) assumes it.
- **Outliers you cannot clean** → **MAE** if you genuinely want the median and can live with the gradient, **Huber** if you are training with gradient descent and want convergence to behave. Huber is the safe default of the two.
- **Over- and under-prediction cost different amounts** → **quantile loss**, with τ read off the cost ratio, not tuned.
- **Heavy-tailed target** (revenue, session length, income, city population) → before changing the loss, consider **log-transforming the target** and fitting MSE on log(y). Often that is all it needed: the tail was multiplicative, not an error.
- One caveat with teeth: MSE on log(y) estimates the mean of log y. Exponentiate it and you get roughly the **geometric mean / conditional median** of y, *not* the mean of y. If someone downstream sums your predictions to a total, that total will be biased low. Duan's smearing estimator exists for this; knowing it is needed is the interview point.
- First move on any outlier problem is still not a loss change. **Look at the rows.** A residual of 78 minutes is usually a bug — a unit mix-up, a test order, a missing value coded as 0 — and deleting it beats any amount of robust loss engineering.`,
    },
    {
      type: 'note',
      md: `The honest note about log-transforming, because it flatters you and people fall for it. RMSE computed **in log space** will look wonderful: a prediction of 100 against an actual of 200 is a log error of 0.69, which reads as tiny next to an error of 100 in the original units. You have not become accurate, you have changed the units so that large multiplicative errors look small. Rule: you may *train* in whatever space helps, but **report the error in the units the business uses** — and report it separately for the small and large targets, because a single averaged number in original units will be dominated by the tail you transformed away in the first place.`,
    },
    {
      type: 'intuition',
      title: 'The sentences that make you sound senior',
      md: `Every one of these is one line long, and each one ends an argument.

- *"MSE estimates the conditional mean, MAE the conditional median. Which one does the business want?"*
- *"MSE is the maximum-likelihood loss under Gaussian noise. My residuals have a fat right tail, so that assumption is false here."*
- *"Huber caps the gradient at δ — it is gradient clipping expressed as a loss."*
- *"Our stockout costs 9× our holding cost, so τ = 0.9. I am fitting the 90th percentile, not the mean, on purpose."*
- *"I fitted τ = 0.1 and τ = 0.9 to ship an interval instead of a point, and here is the held-out coverage."*
- And the one that separates levels: *"Before I changed the loss, I looked at the 12 rows driving the error. Nine of them were data bugs."*`,
    },
  ],
  quiz: [
    {
      question: 'You train the same model twice, once with MSE and once with MAE, and the predictions differ noticeably. What does that tell you?',
      options: [
        {
          text: 'One of the two runs did not converge',
          explanation: 'Possible but not the first conclusion. Both losses have different optima by design — they estimate different quantities.',
        },
        {
          text: 'The target distribution is skewed or has outliers — mean and median genuinely differ',
          explanation: 'Correct. MSE targets the conditional mean, MAE the conditional median. They agree only on symmetric, outlier-free data, so a gap between them is a diagnostic: go look at the tail.',
        },
        {
          text: 'MAE is simply less accurate',
          explanation: '"Accurate" is undefined until you say against which loss. MAE wins on MAE, MSE wins on MSE. Neither is more correct in the abstract.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Why is MSE, specifically, the maximum-likelihood loss under Gaussian noise?',
      options: [
        { text: 'Because the Gaussian is symmetric', explanation: 'Symmetry alone gives you many losses — MAE is symmetric too. The link is more specific than that.' },
        { text: 'Because the Gaussian has finite variance', explanation: 'True but irrelevant; the derivation never uses it. What matters is the shape of the exponent.' },
        {
          text: 'Because the Gaussian density has exp(−(y−ŷ)²/2σ²), so its log-likelihood is a negative constant times the sum of squared errors',
          explanation: 'Correct. Take logs, everything except the exponent becomes a constant, and maximising the log-likelihood collapses exactly to minimising the sum of squares. Assume Laplace noise instead and the same derivation yields MAE.',
        },
      ],
      correct: 2,
    },
    {
      question: 'What is the practical consequence of MAE having a constant ±1 gradient?',
      options: [
        {
          text: 'Steps do not shrink as you approach the optimum, so training oscillates around it unless you decay the learning rate',
          explanation: 'Correct. MSE has gradient −2r, which self-anneals as r → 0. MAE does not, so the final convergence is noisy and a learning-rate schedule becomes mandatory rather than optional.',
        },
        { text: 'Training diverges', explanation: 'It does not diverge — the gradient is bounded, which is precisely why MAE is stable against outliers. The problem is at the destination, not on the way there.' },
        { text: 'The loss becomes non-convex', explanation: 'MAE is convex. A kink at zero is not the same as non-convexity.' },
      ],
      correct: 0,
    },
    {
      question: 'Huber loss with a very large δ behaves like which loss?',
      options: [
        { text: 'MAE, because it always ends up linear', explanation: 'Backwards. A very large δ means almost every residual falls inside the quadratic region and never reaches the linear branch.' },
        { text: 'Quantile loss with τ = 0.5', explanation: 'That is half of MAE — the small-δ limit, not the large-δ one.' },
        {
          text: 'MSE, since almost every residual stays inside the quadratic region',
          explanation: 'Correct. δ → ∞ recovers MSE (up to the ½ factor); δ → 0 recovers MAE. δ is literally the dial between the two, which is the cleanest way to state what Huber is.',
        },
      ],
      correct: 2,
    },
    {
      question: 'A stockout costs ₹900 and holding one extra unit costs ₹100. What τ do you fit, and what does the model then predict?',
      options: [
        { text: 'τ = 0.5 — the median demand, since that minimises average error', explanation: 'That is the symmetric answer, and it is the mistake: it assumes the two costs are equal when they differ by 9×.' },
        {
          text: 'τ = 0.9 — the 90th percentile of demand',
          explanation: 'Correct. τ = C_under/(C_under + C_over) = 900/1000 = 0.9, so the model deliberately over-forecasts, stocking out roughly 10% of the time. This is the newsvendor result.',
        },
        { text: 'τ = 0.1 — because you only want to be short 10% of the time', explanation: 'Right intent, wrong number: τ = 0.1 fits the 10th percentile, which makes you stock LESS and run out about 90% of the time.' },
      ],
      correct: 1,
    },
    {
      question: 'Your target is revenue, extremely right-skewed. You fit MSE on log(revenue) and report an excellent RMSE. What should you be worried about?',
      options: [
        {
          text: 'RMSE in log space flatters you, and exponentiating the fit gives roughly a conditional median, so any total your predictions are summed into will be biased low',
          explanation: 'Correct on both halves. Log space compresses large multiplicative errors into small numbers, and exp(E[log y]) is the geometric mean, not E[y]. Report error in business units and apply a smearing correction if anyone sums your output.',
        },
        { text: 'Nothing — log-transforming is the standard fix for skew', explanation: 'It is a standard and often correct fix, but it silently changes both the quantity being estimated and the scale the error is reported on. Those are the two things you must declare.' },
        { text: 'Logs make the loss non-differentiable', explanation: 'log is perfectly differentiable for positive targets. That is not the issue.' },
      ],
      correct: 0,
    },
    {
      question: 'You fit τ = 0.1 and τ = 0.9 separately and use the gap as an 80% prediction interval. What must you check before shipping it?',
      options: [
        { text: 'That both models used the same learning rate', explanation: 'Irrelevant to whether the interval is honest. Optimisation settings are not the risk here.' },
        { text: 'That the interval is symmetric around the τ = 0.5 fit', explanation: 'It should NOT be symmetric on skewed data — asymmetry is the feature you paid for by fitting quantiles instead of assuming a Gaussian.' },
        {
          text: 'Held-out coverage, plus that the 0.9 line never dips below the 0.1 line',
          explanation: 'Correct. Independently fitted quantiles can cross (fix by sorting or joint fitting), and nominal 80% is only approximate — measured coverage here was 0.779. Report the measured number, not the nominal one.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Adding a single extreme row to a five-point dataset moved the MSE-optimal constant from 12.0 to 25.0 and the MAE-optimal one from 12.0 to 12.5. Why the 26× difference?',
      options: [
        { text: 'MAE ignores the outlier entirely', explanation: 'It does not ignore it — the outlier still contributes 78 units of loss, more than every other row combined. Its influence on the fitted value is bounded, not zero.' },
        {
          text: 'MSE weights each row by its residual, so the outlier pulls with force proportional to 78, while MAE pulls with a constant force of 1 regardless of distance',
          explanation: 'Correct. The gradient of r² is 2r (unbounded), the gradient of |r| is ±1 (bounded). Bounded influence is the entire definition of a robust loss — and it is why Huber, which caps the gradient at δ, lands at 12.5 too.',
        },
        { text: 'MSE is not convex, so it found a different local minimum', explanation: 'MSE in the prediction is a perfect parabola — one global minimum, no local traps. 25.0 is the true optimum; the loss, not the optimiser, is what moved.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'When would you use MAE instead of MSE, and what do you give up?',
      answer:
        'Use MAE when the target has outliers you cannot remove, or when the business genuinely wants a typical value rather than an average — "half of deliveries arrive within X" is a median statement. MAE is robust because the gradient of |r| is bounded at ±1, so no single row can dominate the fit. What you give up: (1) that same constant gradient never shrinks near the optimum, so training oscillates and needs a decaying learning rate; (2) the derivative is undefined at r = 0, so frameworks fall back to the subgradient 0; (3) you are now estimating the conditional median, so if anyone downstream sums your predictions to get a total, that total will be biased whenever the distribution is skewed. If the only motivation is outlier robustness, Huber is usually the better trade — it buys the robustness without breaking the gradient.',
      isCaseBased: false,
    },
    {
      question: 'Explain the statistical meaning of MSE and MAE. What is each one actually estimating?',
      answer:
        'MSE minimised over a constant gives the mean: argmin_c E[(Y−c)²] = E[Y]. MAE gives the median: argmin_c E[|Y−c|] = median(Y). Conditioned on x, an MSE-trained model estimates E[y|x] and an MAE-trained model estimates median(y|x). Both come from maximum likelihood under different noise assumptions: Gaussian noise makes the log-likelihood proportional to −Σ(y−ŷ)², so MLE is exactly least squares; Laplace noise gives −Σ|y−ŷ|, so MLE is exactly MAE. That framing is the useful one, because it converts "which loss?" into "what does my noise actually look like?" — a question you can answer by plotting a residual histogram.',
      isCaseBased: false,
    },
    {
      question: 'Derive, or at least argue clearly, why minimising E[(Y−c)²] gives the mean and E[|Y−c|] gives the median.',
      answer:
        'For MSE: differentiate E[(Y−c)²] with respect to c to get −2E[Y−c], set it to zero, and you get c = E[Y]. For MAE: the derivative of |Y−c| with respect to c is −1 when Y > c and +1 when Y < c, so the derivative of the expectation is P(Y < c) − P(Y > c). Setting that to zero requires exactly as much probability mass above c as below it — the definition of the median. The mechanism worth naming out loud is that the squared loss weights each point by its distance while the absolute loss weights every point equally by count, which is precisely why one is dragged by outliers and the other is not.',
      isCaseBased: false,
    },
    {
      question: 'What is Huber loss, why does it exist, and how do you choose δ?',
      answer:
        'Huber is ½r² for |r| ≤ δ and δ(|r| − δ/2) beyond, with the two pieces built so both value and slope match at the boundary — quadratic where you want smooth self-slowing convergence, linear where you want an outlier to stop screaming. It exists because MSE has the good gradient and the bad temper while MAE has the reverse. The key derivative fact: the gradient magnitude is capped at δ, so Huber is gradient clipping written as a loss. Choosing δ: set it at the residual size you would call suspicious in domain units, or standardise residuals and use δ ≈ 1.345σ, which keeps ~95% of MSE efficiency on truly Gaussian data (scikit-learn defaults to epsilon 1.35). δ → ∞ recovers MSE, δ → 0 recovers MAE. If you would rather not tune it, log-cosh is the smooth cousin with the same shape and no knob.',
      isCaseBased: false,
    },
    {
      question: 'Case: you forecast daily demand for a warehouse. Stocking out costs about 9× more than holding one extra unit. Your current model uses MSE and stocks out roughly half the time. What do you change and why?',
      answer:
        'Nothing is broken — the model is doing exactly what MSE asks. MSE estimates the conditional mean, and actual demand lands above the mean roughly half the time, so you stock out roughly half the time. Switch to pinball loss with τ = C_under/(C_under + C_over) = 9/(9+1) = 0.9, which fits the 90th percentile of demand and brings the stockout rate to about 10%. τ is computed from the cost ratio, not tuned by cross-validation, and that is the point being tested. Then check on held-out data that ~10% of actuals really do exceed the forecast, because a miscalibrated quantile silently reintroduces the original problem. Two extensions worth mentioning: also fit τ = 0.1 to give planners an interval rather than a number, and revisit τ whenever the cost ratio changes — a promotion or a perishable SKU changes it, and the model should follow.',
      isCaseBased: true,
    },
    {
      question: 'Case: your house-price model has MAE ₹40k and RMSE ₹180k on the same test set. What does that gap tell you, and what do you do next?',
      answer:
        'RMSE being 4.5× MAE means the squared-error average is dominated by a small number of very large residuals — RMSE is always ≥ MAE, and the ratio grows with the heaviness of the error tail. So this is not a uniformly mediocre model; it is a decent model with a handful of disasters. Next steps in order: (1) sort by absolute residual and read the worst 20 rows — in practice a large share turn out to be data bugs (unit mix-ups, a listing in a different currency, a missing field coded as 0) and deleting or fixing them beats any loss engineering; (2) if the extremes are genuine, ask whether they are a distinct segment (luxury properties, commercial listings) that deserves its own model or a feature that currently is not there; (3) only then change the loss — Huber to cap their influence, or log-transform the target if the spread is multiplicative. And decide which metric to report from the cost function: if being ₹1M wrong is more than 25× as bad as being ₹40k wrong, RMSE is the honest headline and MAE is the flattering one.',
      isCaseBased: true,
    },
    {
      question: 'How do you produce prediction intervals without assuming Gaussian errors?',
      answer:
        'Fit the same model twice with pinball loss at τ = 0.1 and τ = 0.9; the gap between the two predictions is an ~80% prediction interval. No distributional assumption, and because each quantile is learned per-row the interval widens exactly where the data is noisy — in my demo it was 3.69 wide at low x and 11.56 wide at high x on deliberately heteroscedastic data, which no single Gaussian error bar could express. The mandatory checks: measured held-out coverage (I got 0.779 against a nominal 0.80 — approximate, not guaranteed) and quantile crossing, since independently fitted models can put the 0.9 line below the 0.1 line for some rows; sort the outputs or fit jointly. Alternatives to name: bootstrap or ensemble spread, which capture model uncertainty rather than target spread, and conformal prediction when you need an actual finite-sample coverage guarantee.',
      isCaseBased: false,
    },
    {
      question: 'Is MAE differentiable? Answer precisely.',
      answer:
        'Almost everywhere, but not at r = 0. For r ≠ 0 the derivative is −sign(r), a constant ±1. At r = 0 there is a kink and no derivative exists; the subdifferential is the whole interval [−1, 1], and libraries pick 0 by convention. Practically it never matters, because hitting exactly zero in floating point has measure zero and the subgradient is a valid descent direction anyway. What does matter is the neighbourhood of zero: the gradient magnitude stays at 1 right up to the optimum, so there is no automatic step-size annealing and the parameters wobble instead of settling — which is the real cost of MAE, and why Huber replaces that neighbourhood with a quadratic.',
      isCaseBased: false,
    },
    {
      question: 'Your target is heavy-tailed — customer lifetime value, say. Walk me through your options.',
      answer:
        'Four in escalating order. (1) Look at the tail first: is it real behaviour or bad data? Whales are real; a ₹40 crore order from a test account is not. (2) Log-transform the target and fit MSE on log(y), which is right when the spread is multiplicative — but declare the two consequences: RMSE in log space looks great without you being more accurate, and exponentiating the fit gives roughly a conditional median, so summed totals come out biased low unless you apply a smearing correction. (3) Change the loss — Huber or log-cosh to bound the tail\'s influence while keeping a usable gradient. (4) Change the problem: heavy-tailed targets are often better as a two-stage model (probability of any spend × expected spend given spend) or as a quantile problem, because for CLV nobody actually wants the mean — they want "who will be in the top decile", which is a ranking or classification task. Naming that reframe is usually what the question is looking for.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague swapped MSE for Huber and the model got worse on the holdout. Diagnose it.',
      answer:
        'Start with what "worse" was measured on. If the holdout metric is still RMSE, this is expected and not a regression: Huber deliberately refuses to chase large residuals, so it will lose on the metric that rewards chasing them. You changed the training objective without changing the evaluation objective, so the comparison is rigged. If the metric was MAE or business cost and it still got worse, then look at δ — δ far below the typical residual scale turns Huber into MAE on the entire dataset, throwing away the smooth quadratic region for no robustness benefit; standardise the residuals or set δ from their empirical spread rather than copying a default. Third possibility: there were no meaningful outliers to begin with, in which case the data was Gaussian enough that MSE was already the maximum-likelihood answer and Huber can only lose efficiency. The general principle to state: train loss and eval metric must be chosen together, and a loss swap should always be judged on the metric the business actually pays for.',
      isCaseBased: true,
    },
    {
      question: 'Why does every regression loss have to be differentiable, and how do MAE and Huber get away with their corners?',
      answer:
        'Gradient-based training needs a direction to step in, and that direction comes from the derivative of the loss with respect to the prediction. Strictly, what you need is a subgradient at every point plus differentiability almost everywhere — not differentiability everywhere. MAE qualifies: it is convex with a single non-differentiable point, and the subgradient 0 at that point is a valid descent direction. Huber qualifies more comfortably: it is C¹, built so that value and slope match at |r| = δ, so there is no corner at all. This is also the distinction between a loss and a metric — a metric like R² or MAPE never needs a gradient because nothing optimises it directly, which is exactly why you are free to train on one thing and report another, as long as you say which is which.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'MSE — formula and what it estimates', back: 'mean((y − ŷ)²). Quadratic penalty, smooth everywhere, derivative −2r shrinks near the optimum. Estimates the conditional MEAN.' },
    { front: 'MSE and maximum likelihood', back: 'Assume Gaussian noise: the density exponent is −(y−ŷ)²/2σ², so max log-likelihood ⇔ min sum of squares. MSE IS Gaussian MLE. (MAE is Laplace MLE.)' },
    { front: 'MAE — formula and what it estimates', back: 'mean(|y − ŷ|). Linear penalty so outliers cannot dominate. Estimates the conditional MEDIAN.' },
    { front: "MAE's two gradient problems", back: 'Derivative is a constant ±1 — no slowdown near the optimum, so training wobbles and needs a decaying LR. Undefined at r = 0; subgradient ∈ [−1,1], libraries use 0.' },
    { front: 'The outlier demo, with numbers', back: '[10,11,12,13,14] fits 12.0 under every loss. Add one 90: MSE-fit → 25.0 (+13.0), MAE/Huber-fit → 12.5 (+0.5). 26× difference from one row.' },
    { front: 'Huber loss', back: '½r² for |r| ≤ δ, then δ(|r| − δ/2). Smooth near zero AND robust far out. δ→∞ is MSE, δ→0 is MAE.' },
    { front: 'The one Huber fact to memorise', back: 'It caps the gradient magnitude at δ. No row pushes harder than δ, however wrong it is — gradient clipping expressed as a loss.' },
    { front: 'Picking δ (and log-cosh)', back: 'Set δ where a residual becomes "an outlier" in domain units, or δ ≈ 1.345σ on standardised residuals (~95% Gaussian efficiency; sklearn epsilon=1.35). log-cosh: same shape, smooth everywhere, no knob.' },
    { front: 'Pinball / quantile loss', back: 'max(τr, (τ−1)r) with r = y − ŷ. Charges τ per unit of under-prediction, (1−τ) per unit of over-prediction. Minimiser = the τ-th quantile. τ=0.5 is ½·MAE ⇒ median.' },
    { front: 'Choosing τ, and free intervals', back: 'τ = C_under/(C_under + C_over) — arithmetic, not tuning. Stockout 900 vs holding 100 ⇒ τ = 0.9. Fit τ=0.1 and τ=0.9 for an 80% prediction interval; check held-out coverage and quantile crossing.' },
  ],
  mindmapMarkdown: `- Regression Losses: MSE, MAE, Huber & Quantile
  - The core idea
    - A loss defines what "typical" means
    - You are choosing what to be wrong about
    - r = y − ŷ (actual − prediction)
  - MSE
    - mean((y − ŷ)²), derivative −2r
    - Quadratic: doubling error quadruples cost
    - Smooth everywhere → gradient self-slows
    - Estimates the conditional MEAN
    - = maximum likelihood under Gaussian noise
    - Fails when noise is not Gaussian
  - MAE
    - mean(|y − ŷ|), derivative −sign(r)
    - Linear: outliers cannot dominate
    - Estimates the conditional MEDIAN
    - = MLE under Laplace noise
    - Gradient constant ±1 → wobble at the optimum
    - Undefined at 0 → subgradient convention (0)
  - Outlier demo
    - [10,11,12,13,14] → all losses fit 12.0
    - add one 90 → MSE 25.0, MAE/Huber 12.5
    - MSE outlier weight 608× the good rows
  - Huber
    - ½r² inside δ, linear beyond
    - Smooth near zero AND robust far out
    - Caps gradient magnitude at δ
    - δ ≈ 1.345σ, or "where a miss is suspicious"
    - δ→∞ = MSE, δ→0 = MAE
    - log-cosh = smooth cousin, no knob
  - Quantile (pinball)
    - max(τr, (τ−1)r) — asymmetric
    - Minimiser = the τ-th quantile
    - τ = C_under/(C_under + C_over)
    - Inventory: stockout 9× holding → τ = 0.9
    - τ=0.1 + τ=0.9 → 80% prediction interval
    - Check coverage; watch quantile crossing
  - Decision list
    - Clean data → MSE
    - Outliers you cannot clean → MAE / Huber
    - Asymmetric costs → quantile
    - Heavy tail → log-transform the target
    - But logs change what "average" means
    - And log-space RMSE flatters you
    - First move: read the worst rows, not the loss`,
}

export default m
