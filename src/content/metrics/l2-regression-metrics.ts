import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l2-regression-metrics',
  subjectId: 'metrics',
  level: 2,
  title: 'Regression Metrics: R², Adjusted R² & the MAPE Trap',
  whyItMatters:
    'The loss is what your model optimizes; these are the numbers you put in the results table and defend in a review. Interviewers probe here because almost everyone can recite "R² is variance explained" and almost nobody can say why R² never decreases, why the same model scores differently on a narrower test set, or why MAPE quietly rewards a model that under-forecasts. Get these four numbers right and you can talk to a PM without lying to them.',
  estMinutes: 45,
  sections: [
    {
      type: 'intuition',
      title: 'Loss is for the optimizer. This module is for the report.',
      md: `The sibling module **Regression Losses** (MSE / MAE / Huber / quantile) is about what the model *minimizes* during training. Different job.

- A **loss** must be differentiable, cheap, and stable — the optimizer has to follow its gradient a million times.
- A **metric** must be *understandable*. It goes in a slide. A human decides something because of it.
- They are often the same formula wearing a different hat (MSE trained, RMSE reported) — and sometimes deliberately different (train on Huber, report RMSE and MAE side by side).
- One rule holds for every metric below: **a metric without a baseline is a number without a meaning.** We come back to that at the end, and it is the single most reusable habit in this module.`,
    },
    {
      type: 'intuition',
      title: 'RMSE: the number you actually quote',
      md: `You predict flat rents. Your MSE is 144,000,000. What does that mean? Nothing — the units are rupees *squared*.

- Take the square root and the units come back: **RMSE = ₹12,000**.
- Now you have a sentence a PM understands: *"on a typical flat we are off by about ₹12,000 a month."*
- That translatability is the whole reason RMSE exists. MSE is what the optimizer eats; RMSE is what the room hears.
- Cost: the square root does **not** undo the squaring inside. RMSE inherits every bit of MSE's outlier sensitivity — it just relabels the axis.
- So RMSE is a *slightly pessimistic* average error: it sits above the typical miss, pulled up by the worst ones.`,
    },
    {
      type: 'intuition',
      title: 'MAE, and the gap that is a free diagnostic',
      md: `**MAE** = average absolute miss. No squaring, so every point pays in proportion to how wrong it is. One catastrophic miss counts once, not 100 times.

- Both are in the target's units, so both are quotable. RMSE ≥ MAE **always** — squaring lets big errors dominate the average before the root pulls it back.
- They are only equal when every single error has the same size. That never happens.
- So the **ratio RMSE / MAE is a diagnostic you get for free**: it measures how concentrated your error is.
- Near **1.0** → errors are uniform. Your model is evenly mediocre; improving it means improving everything.
- **1.5 – 2.0** → a normal spread of errors, some points harder than others.
- Above **~2** → a handful of rows are eating your metric. Do not tune hyperparameters. Go read those rows.
- Report both. "RMSE ₹19.8k, MAE ₹10.4k" tells a reviewer more than either number alone: the average miss is ₹10k, but some misses are far worse.`,
    },
    {
      type: 'math',
      intro: 'Both in the target\'s units. The inequality is not a coincidence — it is Cauchy–Schwarz.',
      latex: [
        '\\text{RMSE} = \\sqrt{\\frac{1}{n}\\sum_{i=1}^{n}\\left(\\hat{y}_i - y_i\\right)^2} \\qquad \\text{MAE} = \\frac{1}{n}\\sum_{i=1}^{n}\\left|\\hat{y}_i - y_i\\right|',
        '\\text{RMSE} \\;\\ge\\; \\text{MAE} \\quad \\text{for every dataset; equality iff all } |e_i| \\text{ are identical.}',
        '\\frac{\\text{RMSE}}{\\text{MAE}} \\approx 1 \\Rightarrow \\text{errors uniform} \\qquad \\frac{\\text{RMSE}}{\\text{MAE}} \\gg 2 \\Rightarrow \\text{a few rows own your error}',
      ],
    },
    {
      type: 'intuition',
      title: 'R²: how much better than the laziest model?',
      md: `RMSE has one fatal flaw for comparison: it is in the target's units. Is RMSE 12,000 good? Depends — rupees of rent, or milligrams? You cannot compare across problems.

- Fix: compare your errors against a fixed, universally available opponent — **always predict the mean of y**. That model is free, honest, and knows nothing.
- **SS_tot** = the squared error that mean-predictor makes. **SS_res** = the squared error *you* make.
- **R² = 1 − SS_res / SS_tot** = the fraction of the target's variance your model explains, *relative to just predicting the mean*.
- R² = 0.75 → you removed 75% of the variance the mean-predictor left on the table.
- It is a **ratio of two errors**, so the units cancel. R² is unitless and comparable across problems in a way RMSE never is.`,
    },
    {
      type: 'math',
      intro: 'One formula, and the crucial reading of the denominator.',
      latex: [
        'R^2 \\;=\\; 1 - \\frac{SS_{res}}{SS_{tot}} \\;=\\; 1 - \\frac{\\sum_i (y_i - \\hat{y}_i)^2}{\\sum_i (y_i - \\bar{y})^2}',
        'SS_{tot} \\text{ is the error of the dumbest honest model: always predict } \\bar{y}. \\text{ The baseline is built in.}',
        'R^2 = 1 \\text{ (perfect)} \\qquad R^2 = 0 \\text{ (= the mean)} \\qquad R^2 < 0 \\text{ (worse than the mean)}',
      ],
    },
    {
      type: 'note',
      md: `Read the scale properly, because two of the three points get misquoted constantly. **R² = 0 does not mean "no signal at all"** — it means *exactly as good as predicting the mean*. **R² < 0 is not a bug.** On training data with an intercept, least squares can never do worse than the mean, so R² ≥ 0 there. On *test* data it absolutely can go negative, and that is a superb sanity signal: it says your model would help more if you deleted it and returned the training mean. Any time you see a negative test R², suspect leakage, distribution shift, or a scaler fitted on the wrong split — check those before you touch the model.`,
    },
    {
      type: 'intuition',
      title: 'R²\'s trap: it depends on your test set, not just your model',
      md: `Look at the denominator again. SS_tot is the **variance of the test set you happened to evaluate on**. Change the test set, change R² — with the model frozen.

- Ship one model. Score it on flats priced ₹8k–₹80k: wide spread, huge SS_tot, R² = 0.88. Impressive.
- Score the *same* model on flats priced ₹18k–₹24k: tiny SS_tot, R² = 0.31. Identical predictions, identical RMSE, a third of the score.
- Nothing got worse. Predicting a narrow target is simply a harder game against the mean, because the mean is already a good answer.
- Practical consequences: never compare R² across two different test sets; be suspicious of R² on a tiny sample; and if someone reports only R², ask what the target's spread was.
- The complement is also true, and it is the honest defence of RMSE: **RMSE is comparable across models on the same data; R² is comparable across problems.** Report both and neither trap fires.`,
    },
    {
      type: 'intuition',
      title: 'Adjusted R²: because raw R² can never go down',
      md: `Here is the property that disqualifies R² for model selection: **adding any feature — including a column of pure random noise — can never decrease R².**

- Why: least squares can always set the new coefficient to 0 and reproduce the old fit exactly. That is the floor.
- It never actually chooses 0, because the noise column will correlate with the residuals *by chance* on this particular sample. So R² goes up. Slightly, but always up.
- Consequence: "we added features and R² improved" is not evidence of anything. It is arithmetic.
- **Adjusted R²** charges rent for parameters: it scales the leftover error term by (n−1)/(n−p−1), so each extra feature p has to earn more than the penalty it costs.
- A feature that helps → adjusted R² rises. A feature that is noise → adjusted R² *falls*. Now you have a selection signal.
- Small-sample warning: with n = 30 and p = 25 the denominator n−p−1 is 4, and adjusted R² collapses — correctly. That is the formula screaming that you are fitting noise.`,
    },
    {
      type: 'math',
      intro: 'The penalty, and the worked example the code below runs for real.',
      latex: [
        'R^2_{adj} \\;=\\; 1 - \\left(1 - R^2\\right)\\frac{n - 1}{n - p - 1}',
        'n = 30, \\quad p: 2 \\rightarrow 5 \\;\\text{(three noise columns added)}',
        'R^2: 0.6458 \\rightarrow 0.6788 \\;\\uparrow \\qquad R^2_{adj}: 0.6195 \\rightarrow 0.6119 \\;\\downarrow',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Add three columns of pure noise. Watch R² rise and adjusted R² fall.',
      code: `import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score

rng = np.random.default_rng(0)
n = 30
X = rng.normal(size=(n, 2))
y = 3 * X[:, 0] - 2 * X[:, 1] + rng.normal(scale=1.5, size=n)
noise = rng.normal(size=(n, 3))          # pure garbage, zero relation to y

for tag, Xm in [('2 real features    ', X), ('+ 3 pure noise cols', np.hstack([X, noise]))]:
    p = Xm.shape[1]
    r2 = r2_score(y, LinearRegression().fit(Xm, y).predict(Xm))
    adj = 1 - (1 - r2) * (n - 1) / (n - p - 1)
    print('%s  p=%d  R2=%.4f  adjR2=%.4f' % (tag, p, r2, adj))

# ---- real output ----
# 2 real features      p=2  R2=0.6458  adjR2=0.6195
# + 3 pure noise cols  p=5  R2=0.6788  adjR2=0.6119`,
      annotations: {
        9: 'Drawn from the same generator as X and never used to build y. There is nothing here to learn.',
        13: 'Scored on the SAME data it was fitted on — that is the point. In-sample R² is the quantity that cannot decrease.',
        14: 'The whole of adjusted R²: inflate the unexplained fraction by (n-1)/(n-p-1). Bigger p, bigger penalty.',
        18: 'R² gained 0.033 from noise. If you select features on R², you will happily keep all three.',
        19: 'Adjusted R² fell 0.008 — it charged more rent than the noise paid. That is the signal you wanted.',
      },
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One set of predictions, scored three ways',
        notice: 'Five points, five residuals, three metrics. Step through and watch WHICH cell pays the bill each time — that is the whole difference between RMSE, MAE and R².',
        leftLabel: 'predictions',
        rightLabel: 'what the metric charges',
        frames: [
          {
            note: 'Five predictions of daily units sold. Four are close. Point 5 is a 12-unit miss — the outlier. No metric applied yet.',
            stack: [
              { name: 'y=10   yhat=12', to: 'e1' },
              { name: 'y=20   yhat=18', to: 'e2' },
              { name: 'y=30   yhat=33', to: 'e3' },
              { name: 'y=40   yhat=38', to: 'e4' },
              { name: 'y=50   yhat=62', to: 'e5' },
            ],
            heap: [
              { id: 'e1', value: 'e = +2' },
              { id: 'e2', value: 'e = -2' },
              { id: 'e3', value: 'e = +3' },
              { id: 'e4', value: 'e = -2' },
              { id: 'e5', value: 'e = +12', label: 'the outlier' },
            ],
          },
          {
            note: 'RMSE squares first. Point 5 contributes 144 of the 165 total — 87% of the score comes from one row out of five. RMSE = sqrt(165/5) = 5.74.',
            stack: [
              { name: 'y=10   yhat=12', to: 'e1' },
              { name: 'y=20   yhat=18', to: 'e2' },
              { name: 'y=30   yhat=33', to: 'e3' },
              { name: 'y=40   yhat=38', to: 'e4' },
              { name: 'y=50   yhat=62', to: 'e5', danger: true },
            ],
            heap: [
              { id: 'e1', value: 'e2 = 4', label: '2%' },
              { id: 'e2', value: 'e2 = 4', label: '2%' },
              { id: 'e3', value: 'e2 = 9', label: '5%' },
              { id: 'e4', value: 'e2 = 4', label: '2%' },
              { id: 'e5', value: 'e2 = 144', label: '87% of the bill' },
            ],
          },
          {
            note: 'MAE takes absolute values. Same outlier now pays 12 of 21 — 57%, not 87%. Every cell is weighted by its size, not its size squared. MAE = 21/5 = 4.20.',
            stack: [
              { name: 'y=10   yhat=12', to: 'e1' },
              { name: 'y=20   yhat=18', to: 'e2' },
              { name: 'y=30   yhat=33', to: 'e3' },
              { name: 'y=40   yhat=38', to: 'e4' },
              { name: 'y=50   yhat=62', to: 'e5' },
            ],
            heap: [
              { id: 'e1', value: '|e| = 2', label: '10%' },
              { id: 'e2', value: '|e| = 2', label: '10%' },
              { id: 'e3', value: '|e| = 3', label: '14%' },
              { id: 'e4', value: '|e| = 2', label: '10%' },
              { id: 'e5', value: '|e| = 12', label: '57% of the bill' },
            ],
          },
          {
            note: 'RMSE 5.74 vs MAE 4.20 — ratio 1.37. The gap IS the outlier, quantified. Above ~2 you stop tuning and start reading rows.',
            stack: [
              { name: 'RMSE', value: '5.74' },
              { name: 'MAE', value: '4.20' },
              { name: 'ratio', value: '1.37', danger: true },
            ],
            heap: [
              { id: 'g', value: 'error is concentrated', label: 'diagnostic' },
            ],
          },
          {
            note: 'R² divides our error by the mean-predictor\'s error. Predicting 30 for everything costs 1000; we cost 165. R² = 1 - 165/1000 = 0.835 — we removed 83.5% of the variance.',
            stack: [
              { name: 'our model SS_res', to: 'res' },
              { name: 'predict mean(30)', to: 'tot' },
              { name: 'R2 = 1 - 165/1000', value: '0.835' },
            ],
            heap: [
              { id: 'res', value: '165', label: 'we pay' },
              { id: 'tot', value: '1000', label: 'baseline pays' },
            ],
          },
          {
            note: 'Now bolt on 3 columns of pure noise (the code above, n=30). R² rises because least squares always finds some accidental fit. Adjusted R² falls because it charges for the parameters. Only one of these can select features.',
            stack: [
              { name: 'add 3 noise cols', value: 'p: 2 -> 5' },
              { name: 'R2', to: 'r2', danger: true },
              { name: 'adjusted R2', to: 'adj' },
            ],
            heap: [
              { id: 'r2', value: '0.6458 -> 0.6788', label: 'UP: never decreases' },
              { id: 'adj', value: '0.6195 -> 0.6119', label: 'DOWN: sees the cost' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'MAPE: the metric the business asks for by name',
      md: `Someone will say *"just tell me the percentage error"*. That is **MAPE — Mean Absolute Percentage Error**: average of |error| ÷ |actual|.

- It is genuinely attractive: unitless, intuitive, and it makes a ₹10 miss on a ₹100 item count the same as a ₹1,000 miss on a ₹10,000 item — which is often the right business framing.
- It is also the most dangerous metric in this module, and it has three separate failure modes.
- **(1) It divides by the actual.** An actual of 0 makes it undefined; an actual of 2 makes it explode. In demand forecasting, slow-moving SKUs sit near zero every single day.
- **(2) It is asymmetric.** Over-prediction is punished without limit; under-prediction is capped at 100%. Arithmetic next section.
- **(3) Because of (2), it systematically rewards models that under-forecast.** A team optimizing MAPE quietly ships a model that runs the warehouse short.`,
    },
    {
      type: 'math',
      intro: 'The asymmetry, done as arithmetic. Truth is 100 in every row.',
      latex: [
        '\\text{MAPE} = \\frac{100}{n}\\sum_{i=1}^{n}\\left|\\frac{y_i - \\hat{y}_i}{y_i}\\right|\\%',
        '\\hat{y} = 50 \\Rightarrow 50\\% \\qquad \\hat{y} = 150 \\Rightarrow 50\\% \\qquad \\text{(so far, symmetric)}',
        '\\hat{y} = 0 \\Rightarrow 100\\% \\;(\\text{the worst possible under-prediction}) \\qquad \\hat{y} = 200 \\Rightarrow 100\\% \\qquad \\hat{y} = 400 \\Rightarrow 300\\%',
        '\\hat{y} \\in [0, y] \\Rightarrow \\text{APE} \\le 100\\% \\quad\\text{but}\\quad \\hat{y} \\rightarrow \\infty \\Rightarrow \\text{APE} \\rightarrow \\infty',
      ],
    },
    {
      type: 'note',
      md: `Sit with that third line. Predicting **200** when the truth is 100 costs 100%. Predicting **0** — being as wrong as it is physically possible to be while under-forecasting — *also* costs 100%. Under-prediction has a ceiling; over-prediction does not. So when a model tunes itself against MAPE, shading every forecast downward is a free win: it caps the downside penalty. Optimizing MAE gives the conditional **median**; optimizing MAPE gives something *below* the median. That is not a rounding artefact — it is a systematic low bias that ends with empty shelves, and it is exactly what an interviewer wants you to name.`,
    },
    {
      type: 'intuition',
      title: 'The usual fixes: sMAPE, WAPE, MASE — and what they cost',
      md: `Three standard patches, in increasing order of how much I trust them.

- **sMAPE** ("symmetric" MAPE) divides by (|actual| + |prediction|)/2 instead of just the actual. That bounds it at 200% and softens the near-zero blow-up.
- But the name lies: sMAPE is **not actually symmetric**, and it is still undefined when actual and prediction are both 0. It is a patch, not a fix.
- **WAPE** (weighted APE, a.k.a. WMAPE) = **Σ|error| ÷ Σ|actual|** — one ratio over the whole set instead of an average of per-row ratios.
- No row-level division, so a single near-zero actual cannot detonate it. Notice the identity: **WAPE = MAE ÷ mean(y)**. It is just MAE rescaled to a percentage. That is why it behaves.
- **MASE** (mean absolute scaled error) = MAE ÷ MAE of the naive forecast (predict yesterday's value). For time series this is the best of the lot: unitless, no division by actuals, and **MASE < 1 literally means "better than repeating yesterday"** — the baseline is welded into the metric.
- Honest recommendation: optimize and report **MAE/RMSE**. When the business insists on a percentage, give them **WAPE** and say out loud that it is MAE over the mean. For time series, **MASE**. Reach for raw MAPE only when every actual is comfortably far from zero — and say so.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Every metric on one 8-row dataset — with one near-zero actual to detonate MAPE',
      code: `import numpy as np
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

y    = np.array([120., 95., 130., 110., 105.,  2., 140., 98.])   # units sold that day
pred = np.array([124., 100., 126., 108., 160.,  9., 137., 95.])  # hand-written, NOT fitted
n, p = len(y), 3                                 # p = 3 is a SUPPOSITION, not a fitted count

rmse = mean_squared_error(y, pred) ** 0.5
mae  = mean_absolute_error(y, pred)
r2   = r2_score(y, pred)
adj  = 1 - (1 - r2) * (n - 1) / (n - p - 1)
ape  = np.abs(pred - y) / np.abs(y)
print('RMSE   %.2f   MAE %.2f   ratio %.2f' % (rmse, mae, rmse / mae))
print('R2     %.4f  adjR2 IF p=3 %.4f' % (r2, adj))
print('MAPE   %.1f%%  (drop the y=2 row -> %.1f%%)' % (100*ape.mean(), 100*np.delete(ape, 5).mean()))
print('sMAPE  %.1f%%  WAPE %.1f%%' % (100*(2*np.abs(pred-y)/(np.abs(y)+np.abs(pred))).mean(),
                                       100*np.abs(pred-y).sum()/np.abs(y).sum()))
print('baseline(mean): RMSE %.2f  MAE %.2f' % (np.sqrt(((y-y.mean())**2).mean()), np.abs(y-y.mean()).mean()))

# ---- real output ----
# RMSE   19.85   MAE 10.38   ratio 1.91
# R2     0.7509  adjR2 IF p=3 0.5641
# MAPE   52.6%  (drop the y=2 row -> 10.2%)
# sMAPE  23.4%  WAPE 10.4%
# baseline(mean): RMSE 39.78  MAE 26.25`,
      annotations: {
        4: 'One slow SKU sold 2 units. Everything else is around 100. This single row is the whole demo.',
        5: 'These predictions are hand-authored so every metric below can be checked with a calculator. No model was fitted, so there is no real parameter count anywhere in this file.',
        6: 'Which is why p = 3 is a SUPPOSITION, stated so the penalty is visible: "if these numbers had come out of a 3-predictor model on 8 rows, what would adjusted R² do to R²?" Answer below: it takes 0.19 off.',
        12: 'Per-row absolute percentage error. Row 6 is |9-2|/2 = 350% on its own.',
        13: 'RMSE 19.85 vs MAE 10.38 — ratio 1.91, right at the "a few rows own your error" line. The 55-unit miss on row 5 is why.',
        15: '52.6% vs 10.2%. Deleting ONE row of eight moves MAPE by 42 points. No decision should ever rest on a number that unstable.',
        16: 'sMAPE 23.4% — bounded, so less absurd, but still inflated by the same row. WAPE 10.4% barely notices it.',
        18: 'The baseline, printed on purpose: predicting the mean gives MAE 26.25. Our 10.38 is a real 2.5x gain. Without this line, 10.38 means nothing.',
      },
    },
    {
      type: 'note',
      md: `Two numbers in that output deserve a second look. First, be precise about what the adjusted R² line is: nothing was fitted here — those predictions were typed by hand — so p = 3 is a **supposition**, a "what if these had come from a 3-predictor model on 8 rows". Under that supposition **adjusted R² = 0.5641 against R² = 0.7509**, and the gap is enormous because (n−1)/(n−p−1) = 7/4 = 1.75 inflates the unexplained fraction by 75%. That is the honest reading: adjusted R² is arithmetic on n and p, so you can only quote it when you can name a real p — which for a boosted-tree model, say, you cannot. And **WAPE 10.4% versus MAPE 52.6%** on the identical predictions. Same model, same errors, a 5× difference in the headline percentage — decided entirely by whether you divide per row or once at the end. When someone quotes you a percentage error, ask which one they computed.`,
    },
    {
      type: 'intuition',
      title: 'Choosing the metric: start from the decision, not the metric list',
      md: `Do not ask "which metric is best". Ask **what decision does this number drive, and what does each kind of mistake cost?**

- **Errors cost roughly the same in both directions, and big misses hurt disproportionately** (capacity planning, pricing) → **RMSE**. Report MAE next to it so the outlier story is visible.
- **Errors cost the same in both directions, and a big miss is just a big miss** (ETAs, robust baselines) → **MAE**. Note it optimizes toward the median, which is often what you wanted anyway.
- **The business genuinely thinks in percentages** (forecasting, finance) → **WAPE**, with the caveat stated: "this is MAE divided by the average actual; I avoided MAPE because our low-volume SKUs make it explode."
- **Time series with any trend or seasonality** → **MASE**, because its baseline is the naive forecast and MASE < 1 is a self-explaining claim.
- **You need a range, not a point** ("what is the 90th-percentile delivery time?") → not a point metric at all: **pinball / quantile loss**, covered in the Regression Losses module.
- **Comparing across different problems or reporting to a stats-literate audience** → **R²**, always paired with an RMSE so the units survive, and never compared across different test sets.
- **Selecting features or comparing models with different parameter counts** → **adjusted R²**, or better, out-of-sample error via cross-validation, which needs no penalty term because the test set already punishes noise.`,
    },
    {
      type: 'intuition',
      title: 'The closing discipline: always ship the baseline',
      md: `Every number above is a *ratio to something*, whether or not the formula shows it. R² makes its baseline explicit. RMSE, MAE and MAPE hide theirs — so you have to add it yourself.

- Before reporting any regression result, compute the same metric for the dumb model: **predict the mean** (or the median for MAE, or **last value** for a time series).
- One extra line of code. It converts "RMSE 19.85" — which is unfalsifiable — into "RMSE 19.85 vs baseline 39.78, a 50% reduction", which is a claim.
- For time series the last-value baseline is brutal and essential: many "successful" forecasting models never beat *yesterday's number*, and nobody noticed because nobody computed it.
- This is the regression twin of the majority-class baseline in classification. Same habit, same reason: a metric alone cannot tell you whether you built anything.
- The senior sentence: *"MAE 10.4 against a mean-baseline of 26.3 and a last-value baseline of 14.1 — so the model is real but the easy win is only about 25% of it."*`,
    },
  ],
  quiz: [
    {
      question: 'You report RMSE = 40 and MAE = 11 on the same predictions. What should you do next?',
      options: [
        {
          text: 'Nothing — RMSE is always larger, this is normal',
          explanation: 'RMSE ≥ MAE always, true. But a ratio of 3.6 is far outside the normal 1–2 band and is telling you something specific.',
        },
        {
          text: 'Go inspect the worst-scoring rows — a few outliers are dominating the error',
          explanation: 'Correct. The RMSE/MAE ratio measures error concentration. Above ~2, a handful of rows own your metric; read those rows before tuning anything.',
        },
        {
          text: 'Switch the loss to MAE so the numbers agree',
          explanation: 'That hides the symptom instead of diagnosing it. The gap is information — you would be deleting your only free diagnostic.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Your model scores R² = −0.12 on the test set. What does that actually mean?',
      options: [
        { text: 'A calculation bug — R² cannot be negative', explanation: 'It can, on any data the model was not fitted on. Only in-sample OLS with an intercept is guaranteed R² ≥ 0.' },
        { text: 'The model explains 12% of the variance in the negative direction', explanation: 'Not a real reading. R² is not signed variance; it is 1 minus an error ratio, and a ratio above 1 pushes it below zero.' },
        {
          text: 'Your model has larger squared error than simply predicting the training mean for every row',
          explanation: 'Correct — SS_res > SS_tot. It is a strong sanity alarm: check for leakage, distribution shift, or a transform fitted on the wrong split.',
        },
      ],
      correct: 2,
    },
    {
      question: 'You add a column of random numbers to a linear regression and refit. What happens to in-sample R²?',
      options: [
        {
          text: 'It rises slightly — R² can never decrease when a feature is added',
          explanation: 'Correct. The old fit is always reachable by setting the new coefficient to 0, so R² has a floor; chance correlation with the residuals pushes it above that floor. This is exactly why R² cannot select features.',
        },
        { text: 'It stays exactly the same, since the column carries no information', explanation: 'Only if the fitted coefficient were exactly 0. On a finite sample the noise column always correlates a little with the residuals, so it gets a non-zero weight.' },
        { text: 'It falls, because the model wastes capacity on noise', explanation: 'That is what adjusted R² does. Raw in-sample R² has no notion of parameter count at all.' },
      ],
      correct: 0,
    },
    {
      question: 'The truth is 100. Model A predicts 0; model B predicts 200. What does MAPE charge each?',
      options: [
        { text: 'A: 100%, B: 50%', explanation: 'B\'s error is 100 on an actual of 100, which is 100%, not 50%. Check the denominator — it is always the actual.' },
        { text: 'A: 0%, B: 100%', explanation: 'A is off by the full 100, so it is charged 100%. Predicting 0 is not free.' },
        {
          text: 'Both 100% — and that is the asymmetry, because A is as wrong as under-prediction can possibly be while B can keep getting worse',
          explanation: 'Correct. Under-prediction saturates at 100%; over-prediction is unbounded (predict 400 and pay 300%). That ceiling is why MAPE-tuned models drift low.',
        },
      ],
      correct: 2,
    },
    {
      question: 'A demand dataset has many SKUs selling 0–3 units per day. Which percentage-style metric do you report?',
      options: [
        { text: 'MAPE, since the business asked for a percentage', explanation: 'Those are exactly the rows that break it: division by 0 is undefined and division by 1 or 2 produces 300%+ values that swamp the average.' },
        {
          text: 'WAPE = Σ|error| / Σ|actual| — it divides once at the end, so no single tiny actual can explode it',
          explanation: 'Correct, and it equals MAE ÷ mean(y), so it inherits MAE\'s stability while reading as a percentage. Say that identity out loud when you present it.',
        },
        { text: 'sMAPE, since it is symmetric and bounded', explanation: 'Bounded at 200%, yes — but it is not genuinely symmetric despite the name, and it is still undefined when actual and prediction are both 0.' },
      ],
      correct: 1,
    },
    {
      question: 'The same frozen model is evaluated on a wide-price test set (R² = 0.88) and a narrow-price one (R² = 0.31). Why?',
      options: [
        {
          text: 'R²\'s denominator is the test set\'s own variance — a narrow target makes the mean-baseline hard to beat',
          explanation: 'Correct. SS_tot shrinks, so the same SS_res is a much larger fraction of it. Predictions and RMSE are unchanged; only the opponent got stronger.',
        },
        { text: 'The model overfits the wide range', explanation: 'Overfitting would change the errors themselves. Here the predictions are identical on both sets — only the reference varies.' },
        { text: 'R² is unstable and should never be trusted', explanation: 'Too strong. R² is fine — it just must never be compared across different test sets. Report RMSE beside it and the ambiguity disappears.' },
      ],
      correct: 0,
    },
    {
      question: 'A forecasting team reports MASE = 0.92. What have they demonstrated?',
      options: [
        { text: 'The model explains 92% of the variance', explanation: 'That is an R²-style reading. MASE is a ratio of absolute errors, not a variance-explained fraction.' },
        { text: 'The average error is 92% of the actual value', explanation: 'That would be a percentage-error metric like MAPE or WAPE. MASE scales by a baseline\'s error, not by the actuals.' },
        {
          text: 'Their MAE is 92% of the naive "predict yesterday" forecast\'s MAE — a genuine but small 8% gain',
          explanation: 'Correct, and this is why MASE is the good time-series metric: the baseline is inside the number, so MASE < 1 is a self-verifying claim. 0.92 is honest but modest.',
        },
      ],
      correct: 2,
    },
    {
      question: 'With n = 8 rows and p = 3 features, R² = 0.75. What is adjusted R², and what is it saying?',
      options: [
        { text: 'About 0.80 — the adjustment rewards a compact model', explanation: 'Adjusted R² is never above R² when p ≥ 1; the factor (n−1)/(n−p−1) is ≥ 1, so it can only pull the score down.' },
        {
          text: 'About 0.56 — with only 4 residual degrees of freedom the parameter penalty is severe, and correctly so',
          explanation: 'Correct: 1 − 0.25 × (7/4) = 0.5625. Three parameters on eight rows is close to fitting noise, and the formula says so loudly.',
        },
        { text: 'Also 0.75 — the penalty only applies out of sample', explanation: 'The penalty is purely a function of n and p and applies wherever you compute it. Out-of-sample error needs no penalty at all, which is why CV is the better tool.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain R² to a product manager, then to me.',
      answer:
        'To the PM: "if we had no model at all, the best guess for every flat would be the average rent. R² = 0.75 means our model wipes out three quarters of the error that guessing the average would have made." To the interviewer: R² = 1 − SS_res/SS_tot, where SS_tot is the squared error of the mean-predictor, so R² is a normalized comparison against a fixed baseline. Being a ratio of two errors it is unitless, which makes it portable across problems in a way RMSE is not. The cost of that portability is that the denominator is the evaluation set\'s variance, so R² is a property of the model *and* the test set — the same model scores differently on a narrow versus a wide sample. That is why I always report an RMSE beside it.',
      isCaseBased: false,
    },
    {
      question: 'Why can raw R² never be used for feature selection, and what do you use instead?',
      answer:
        'Because adding a feature can never reduce in-sample R²: least squares can always assign the new coefficient 0 and recover the previous fit, so that is a floor — and on a finite sample the new column correlates with the residuals by chance, so R² actually rises even for pure noise. I demonstrated this with 30 rows: adding three random columns moved R² from 0.6458 to 0.6788. Adjusted R² = 1 − (1−R²)(n−1)/(n−p−1) charges for parameters and fell from 0.6195 to 0.6119 on the same data, which is the signal you want. In practice, though, I would select on out-of-sample error via cross-validation: the held-out set penalizes noise automatically, with no penalty term to justify, and it works for models where "p" is not even well defined, like gradient-boosted trees.',
      isCaseBased: false,
    },
    {
      question: 'When do you report RMSE and when MAE? Do not say "it depends".',
      answer:
        'RMSE when large errors are disproportionately expensive — the squaring encodes that, and it is the right default for capacity, inventory and pricing where one huge miss costs far more than several small ones. MAE when a miss is a miss and the cost is linear, such as ETA error, and when the data has genuine outliers you do not want dominating the score. Concretely: RMSE optimizes toward the conditional mean, MAE toward the conditional median — that is the real difference, and it decides which one is right if the target is skewed. My actual practice is to report both, because the ratio RMSE/MAE is a free diagnostic of error concentration: near 1 means uniform errors, above 2 means a few rows own the metric and I should read those rows before touching a hyperparameter.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through everything wrong with MAPE.',
      answer:
        'Three separate defects. (1) It divides by the actual, so it is undefined at 0 and explodes near 0 — in demand forecasting, low-volume SKUs make it unusable; on an 8-row example of mine, deleting one row where the actual was 2 moved MAPE from 52.6% to 10.2%. (2) It is asymmetric: with truth 100, predicting 0 costs 100% and predicting 200 also costs 100%, but predicting 400 costs 300% — under-prediction is capped at 100% while over-prediction is unbounded. (3) Therefore it systematically favours under-forecasting: shading predictions down caps the penalty, so a MAPE-optimal forecast sits below the conditional median and the warehouse runs short. Fixes in order of quality: sMAPE bounds it at 200% but is not truly symmetric and still breaks at 0; WAPE = Σ|error|/Σ|actual| removes per-row division entirely and is just MAE/mean(y); MASE scales by the naive forecast and is the right default for time series. My recommendation is to optimize MAE or RMSE and, if a percentage is demanded, present WAPE while naming what it is.',
      isCaseBased: false,
    },
    {
      question: 'Case: a vendor pitches you a demand-forecasting model, reporting R² = 0.93 and MAPE = 8%. What do you ask before believing it?',
      answer:
        'Four questions. (1) What was the variance of the evaluation set? R² is inflated by a wide-spread sample, so if they scored across high- and low-volume SKUs together, 0.93 mostly reflects that some SKUs sell 10,000 and others sell 3 — a model that only distinguishes big from small products would score well. Ask for R² per volume band. (2) Which rows entered the MAPE? An 8% MAPE with any near-zero actuals present is arithmetically implausible, so they have almost certainly filtered low-volume SKUs — exactly the ones I care about for stockouts. Ask for WAPE on the full set. (3) What is the baseline? Give me MASE, or MAE against last-week-repeated; in retail the seasonal-naive baseline is strong and many vendor models do not beat it. (4) Was the split by time? A random split on time-series data leaks the future and produces precisely these numbers. My headline point: R² and MAPE are the two most gameable metrics in the list, and they picked both.',
      isCaseBased: true,
    },
    {
      question: 'Your model gets R² = 0.42 on test. Is that good?',
      answer:
        'Unanswerable as stated, and saying so is the point. It depends on (a) the irreducible noise in the target — 0.42 predicting next-quarter revenue is excellent, 0.42 predicting a physical measurement is broken; (b) the test set\'s spread, since a narrow target makes the mean hard to beat and depresses R² with no change to the predictions; and (c) what the alternative is. The number I would actually want is the comparison: what does the current production system or a simple baseline score on the identical set? R² is a comparison against the mean-predictor, which is a very weak opponent — beating it by 42% may or may not be beating the thing you are replacing. I would answer with a table: baseline, current system, new model, on one test set, with both R² and RMSE.',
      isCaseBased: false,
    },
    {
      question: 'Adjusted R² decreases when you add a feature. Does that prove the feature is useless?',
      answer:
        'It proves the feature did not pay for its degree of freedom *in this sample under a linear model* — that is weaker than "useless". Adjusted R² is a fixed penalty derived from n and p, not a test of predictive value: with small n the penalty is brutal (8 rows and 3 features gives a factor of 1.75), and a genuinely useful feature can fail it. It is also blind to non-linear or interaction value, since it is computed from a linear fit. And it says nothing about causal usefulness or about feature cost in production. I treat a fall in adjusted R² as a prompt to check the feature with cross-validated error, which is the measurement that actually matters; if held-out error improves and adjusted R² fell, I keep the feature.',
      isCaseBased: false,
    },
    {
      question: 'How do you compare two models when one predicts in log-space and the other in raw units?',
      answer:
        'You cannot compare their metrics directly — R² and RMSE computed on log-targets are answering a different question, and log-space RMSE corresponds roughly to relative rather than absolute error. Bring both back to the same space: exponentiate the log model\'s predictions and score everything in the original units. Watch the retransformation bias: exp(mean of logs) is the geometric mean, which is below the arithmetic mean, so a naively back-transformed log model under-predicts and needs a smearing or variance correction. Then note what the log model was implicitly optimizing — proportional error — and decide whether that is what the business wants; if it is, WAPE or MAPE-style reporting in raw units is the honest comparison, and a log-space model will look good on it by construction.',
      isCaseBased: false,
    },
    {
      question: 'Case: a delivery-ETA model shows RMSE 8 min, MAE 3 min, and R² 0.61. A PM asks "how good is it?" What do you tell them and what do you do next?',
      answer:
        'What I tell them: "typical order is off by about 3 minutes, but the errors are lopsided — a small set of deliveries are off by a lot." The RMSE/MAE ratio of 2.7 is the finding here: with uniform errors that ratio sits near 1.2, so this says a minority of trips dominate the squared error. What I do next: segment the residuals — by city, hour, courier, distance bucket, weather — and find the segment that owns the tail; it is usually a distinct regime (traffic incidents, a new city, orders above some distance) rather than random noise, and it often deserves its own model or a feature the current one lacks. Then the business question: for ETAs, being 15 minutes late is far worse than being 15 minutes early, so a symmetric metric is the wrong objective. I would move to quantile/pinball loss and quote a P90 ETA the customer sees, because the product decision is "what time do we promise", not "what is the mean". Finally I would report the baseline — RMSE of a simple distance/speed heuristic — because R² 0.61 against the mean says nothing about beating the rule the ops team already uses.',
      isCaseBased: true,
    },
    {
      question: 'Case: your quarterly report shows R² fell from 0.81 to 0.64. The model is unchanged and retraining did not help. What is your investigation order?',
      answer:
        'First hypothesis, and the cheapest to test: the evaluation population\'s variance changed. R² = 1 − SS_res/SS_tot, so a quarter with a narrower target range shrinks SS_tot and drops R² with identical predictions — check whether RMSE and MAE also moved. If they held steady, this is the answer and there is no model problem at all, just a reporting artefact. Second: if RMSE also rose, it is genuine degradation — split the residuals by segment and by week to see whether the loss is broad (covariate or concept drift; compare feature distributions across quarters) or concentrated in a new segment (a new market, a new product line the model never saw). Third: pipeline damage — a feature silently turning null and defaulting to 0, or a category encoder meeting unseen levels; compare feature-level summary stats quarter over quarter, which usually finds it in minutes. Fourth: label quality, since a change in how the target is recorded raises measured error with no model change. The habit worth naming: a metric with a moving denominator should never be a standalone KPI — I would put RMSE and a baseline-relative number on the dashboard beside it so this class of false alarm cannot happen again.',
      isCaseBased: true,
    },
    {
      question: 'Why insist on a baseline when R² already has one built in?',
      answer:
        'Because R²\'s baseline is the mean-predictor, which is the weakest opponent available and almost never the thing you are actually replacing. For time series the honest baseline is the last value or the seasonal naive, and beating the mean while losing to "repeat last week" is common and embarrassing — MASE exists precisely to make that comparison unavoidable. For an existing product, the baseline is the current rule or model in production. So the rule I apply: report the metric, then the same metric for the dumbest defensible predictor and for the incumbent, on the identical evaluation set. It costs one line of code, turns an unfalsifiable float into a claim, and it is the regression twin of the majority-class baseline in classification.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'RMSE vs MSE — why bother with the root?', back: 'RMSE is in the target\'s units, so it is quotable: "off by ₹12,000 on average". The root does NOT remove the squaring\'s outlier sensitivity.' },
    { front: 'RMSE / MAE ratio', back: 'RMSE ≥ MAE always. Ratio ≈ 1 → uniform errors. 1.5–2 → normal spread. > 2 → a few rows own your error; go read them.' },
    { front: 'R² in one sentence', back: '1 − SS_res/SS_tot: the fraction of the target\'s variance you explain, measured against always predicting the mean.' },
    { front: 'R² = 0 and R² < 0', back: '0 = exactly as good as predicting the mean. Negative = WORSE than the mean. Possible on test data; a top-tier alarm for leakage or shift.' },
    { front: 'R²\'s trap', back: 'Its denominator is the TEST SET\'s variance. The same frozen model scores 0.88 on a wide sample and 0.31 on a narrow one. Never compare R² across test sets.' },
    { front: 'Why R² cannot select features', back: 'Adding any column — even pure noise — can never lower in-sample R² (the old fit is reachable with coefficient 0) and chance correlation pushes it up. Demo: 0.6458 → 0.6788 from 3 noise columns.' },
    { front: 'Adjusted R²', back: '1 − (1−R²)(n−1)/(n−p−1). Charges rent per parameter, so noise features make it FALL (0.6195 → 0.6119 in the same demo).' },
    { front: 'MAPE\'s three defects', back: 'Divides by the actual (explodes near 0); asymmetric (under-prediction capped at 100%, over-prediction unbounded); therefore systematically favours under-forecasting.' },
    { front: 'WAPE', back: 'Σ|error| / Σ|actual| — one division at the end, so near-zero actuals cannot detonate it. Identity: WAPE = MAE / mean(y).' },
    { front: 'MASE and the baseline habit', back: 'MAE ÷ MAE of the naive (yesterday) forecast; MASE < 1 beats "repeat last value". Generally: always report the mean/median/last-value baseline — a metric without a baseline is a number without a meaning.' },
  ],
  mindmapMarkdown: `- Regression Metrics: R², Adjusted R² & the MAPE Trap
  - Loss vs metric
    - loss = optimizer food; metric = the report
    - MSE/MAE/Huber as losses → sibling module
  - RMSE and MAE
    - RMSE: target's units, quotable, outlier-sensitive
    - MAE: robust, linear, aims at the median
    - RMSE ≥ MAE always
    - gap ≈1 uniform · 1.5–2 normal · >2 outliers own it
  - R²
    - 1 − SS_res/SS_tot, baseline = predict the mean
    - unitless → comparable across problems
    - 0 = the mean · <0 = worse than the mean
    - trap: denominator is the TEST SET's variance
  - Adjusted R²
    - raw R² never decreases when p grows
    - 1 − (1−R²)(n−1)/(n−p−1)
    - noise demo: R² 0.646→0.679, adj 0.620→0.612
    - better still: cross-validated error
  - MAPE traps
    - divides by the actual → explodes near 0
    - one row moved MAPE 52.6% → 10.2%
    - asymmetric: under capped 100%, over unbounded
    - favours under-forecasting → stockouts
  - Fixes
    - sMAPE — bounded 200%, not truly symmetric
    - WAPE = Σ|e|/Σ|y| = MAE/mean(y)
    - MASE = MAE / naive MAE, <1 beats yesterday
  - Choose from the decision
    - symmetric costs → RMSE / MAE
    - percentage demanded → WAPE, caveat stated
    - time series → MASE · intervals → pinball loss
  - Always ship the baseline
    - mean · median · last value
    - twin of the majority-class baseline`,
}

export default m
