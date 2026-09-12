var e={id:`metrics-l2-regression-metrics`,subjectId:`metrics`,level:2,title:`Regression Metrics: RMSE, MAE, R² and MAPE`,whyItMatters:`Four numbers people report for the same model. Two of them can be gamed by adding columns of pure noise, and one of them is undefined on any row where the truth is zero — so knowing which to quote matters more than knowing the formulas.`,assumes:[`You have read Regression Losses — MSE, MAE and RMSE`,`You know what a mean is`],estMinutes:22,sections:[{type:`intuition`,title:`What each of the four answers`,md:`Same predictions, four questions.

- **RMSE** — how far off am I, in the original units, with big misses weighted heavily?
- **MAE** — how far off am I typically, treating all misses proportionally?
- **R²** — how much better am I than just predicting the mean?
- **MAPE** — how far off am I, as a percentage of the truth?

RMSE and MAE are absolute; you cannot tell whether 4.2 is good without knowing the scale. R² and MAPE are relative, and each buys that at a specific cost.`},{type:`math`,intro:`The four, written out. SS_res is the squared error of your model; SS_tot is the squared error of predicting the mean — so R² is one minus the ratio, i.e. the fraction of variance you removed. Adjusted R² subtracts a penalty for each extra column, and p is the number of predictors.`,latex:[`\\text{RMSE} = \\sqrt{\\tfrac{1}{n}\\textstyle\\sum_i (\\hat{y}_i - y_i)^2} \\qquad \\text{MAE} = \\tfrac{1}{n}\\textstyle\\sum_i \\lvert \\hat{y}_i - y_i \\rvert`,`R^2 = 1 - \\frac{SS_{\\text{res}}}{SS_{\\text{tot}}} = 1 - \\frac{\\sum_i (\\hat{y}_i - y_i)^2}{\\sum_i (y_i - \\bar{y})^2}`,`R^2_{\\text{adj}} = 1 - (1 - R^2)\\,\\frac{n-1}{n-p-1} \\qquad \\text{MAPE} = \\frac{1}{n}\\sum_i \\frac{\\lvert \\hat{y}_i - y_i \\rvert}{\\lvert y_i \\rvert}`]},{type:`code`,lang:`python`,title:`RMSE and MAE on five rows, and their ratio`,code:`y    = [10, 20, 30, 40, 50]
pred = [12, 18, 33, 38, 62]

sq_total = 0.0
abs_total = 0.0
for i in range(len(y)):
    error = pred[i] - y[i]
    sq_total = sq_total + error * error
    abs_total = abs_total + abs(error)

mse = sq_total / len(y)
rmse = mse ** 0.5
mae = abs_total / len(y)
print('MSE', mse, 'RMSE', round(rmse, 3), 'MAE', mae)
print('RMSE / MAE =', round(rmse / mae, 2))

# ---- real output ----
# MSE 33.0 RMSE 5.745 MAE 4.2
# RMSE / MAE = 1.37`,annotations:{2:`Four predictions are off by 2 or 3; the last is off by 12. One row is much worse than the others, which is what the ratio below detects.`,14:`RMSE 5.745 against MAE 4.2. RMSE is larger, and it always is unless every residual is identical.`,15:`The ratio 1.37 is the diagnostic. Near 1.0 means errors are evenly spread; well above means a few rows dominate, and those rows are worth looking at individually.`}},{type:`code`,lang:`python`,title:`R² from two sums`,code:`mean_y = sum(y) / len(y)
ss_res = 0.0
ss_tot = 0.0
for i in range(len(y)):
    ss_res = ss_res + (pred[i] - y[i]) ** 2
    ss_tot = ss_tot + (y[i] - mean_y) ** 2

print('mean of y =', mean_y)
print('SS_res =', ss_res, '  SS_tot =', ss_tot)
print('R2 =', round(1 - ss_res / ss_tot, 4))

# ---- real output ----
# mean of y = 30.0
# SS_res = 165.0   SS_tot = 1000.0
# R2 = 0.835`,annotations:{5:`SS_res is your model's squared error — 165.0.`,6:`SS_tot is the squared error of the dumbest possible model, predicting the mean 30.0 for everything — 1000.0.`,11:`R² = 1 − 165/1000 = 0.835. So the model removed 83.5% of the error that predicting the mean would have left. That is the honest reading: **R² is a comparison against a baseline**, not an absolute grade.`}},{type:`code`,lang:`python`,title:`R² rises when you add columns of pure noise`,code:`import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score

rng = np.random.default_rng(0)
n = 30
X = rng.normal(size=(n, 2))
y = 3 * X[:, 0] - 2 * X[:, 1] + rng.normal(scale=1.5, size=n)
noise = rng.normal(size=(n, 3))

for tag, cols in [('2 real  ', X), ('+3 noise', np.hstack([X, noise]))]:
    p = cols.shape[1]
    fit = LinearRegression().fit(cols, y)
    r2 = r2_score(y, fit.predict(cols))
    adj = 1 - (1 - r2) * (n - 1) / (n - p - 1)
    print(tag, 'p =', p, 'R2 = %.4f' % r2, 'adjR2 = %.4f' % adj)

# ---- real output ----
# 2 real   p = 2 R2 = 0.6458 adjR2 = 0.6195
# +3 noise p = 5 R2 = 0.6788 adjR2 = 0.6119`,annotations:{9:`Three columns drawn from a normal distribution with no relationship to y whatsoever. They are pure noise by construction.`,11:`np.hstack glues the noise columns on beside the real ones, so the second fit has five predictors instead of two.`,19:`R² rose from 0.6458 to 0.6788 by adding columns containing nothing. It can never fall when you add a predictor, because the fit can always set the new coefficient to zero.`,20:`Adjusted R² fell, 0.6195 to 0.6119. It charges for each extra column, so it can go down — which is the whole reason it exists.`}},{type:`note`,label:`How to read R² honestly`,md:`**R² is a comparison against predicting the mean**, so what counts as good depends entirely on the domain. R² 0.3 is excellent for predicting individual human behaviour and terrible for a physical measurement.

Three properties worth knowing:

- **It can never decrease when you add a predictor**, which is why in-sample R² cannot be used for model selection. Adjusted R² or held-out R² can.
- **It can go negative** on held-out data — that means your model is worse than predicting the training mean.
- **It is not "the fraction of variance explained" in a causal sense.** It is the fraction of squared error removed, which is a statement about fit, not about explanation.`},{type:`code`,lang:`python`,title:`MAPE against WAPE, on three rows`,code:`y    = [100.0, 100.0, 2.0]
pred = [110.0, 90.0, 9.0]

ape_sum = 0.0
err_sum = 0.0
act_sum = 0.0
for i in range(len(y)):
    err = abs(pred[i] - y[i])
    ape_sum = ape_sum + err / y[i]
    err_sum = err_sum + err
    act_sum = act_sum + y[i]
    print('actual', y[i], 'pred', pred[i], 'APE%', round(100 * err / y[i], 1))

print('MAPE %', round(100 * ape_sum / len(y), 1))
print('WAPE %', round(100 * err_sum / act_sum, 1))

# ---- real output ----
# actual 100.0 pred 110.0 APE% 10.0
# actual 100.0 pred 90.0 APE% 10.0
# actual 2.0 pred 9.0 APE% 350.0
# MAPE % 123.3
# WAPE % 13.4`,annotations:{9:`Dividing by the actual is what makes it a percentage — and what makes a small actual explode. The third row is off by 7 units and scores 350%.`,14:`MAPE 123.3% is dominated by one tiny-denominator row. Two rows off by 10% and one small row wreck the average.`,15:`WAPE 13.4% — nearly ten times lower. It divides TOTAL error (27) by TOTAL actual (202) instead of averaging percentages, so the tiny denominator cannot dominate. Same three rows, same predictions, and the two numbers disagree by an order of magnitude.`}},{type:`note`,label:`When MAPE breaks`,md:`- **Undefined at y = 0**, and explosive near it — one row with a true value of 2 scored 350% above.
- **Asymmetric.** Over-prediction is capped: you can be at most 100% under, but unboundedly over. A model tuned to minimise MAPE is therefore biased to under-predict.
- **Rewards forecasting low** on intermittent demand for exactly that reason.

Alternatives: **WAPE** (total error over total actual), **sMAPE** (symmetric but with its own quirks), or **MASE**, which scales the error against a naive baseline and is therefore comparable across series.`},{type:`note`,label:`What to report`,md:`**RMSE and MAE together**, in the units, so the gap tells you whether error is concentrated. Add **R²** when the audience needs to know you beat the mean, and be ready to say what R² a good model gets in this domain. Use **WAPE** rather than MAPE when a percentage is genuinely wanted.

And always give the baseline alongside. "RMSE 5.745" means nothing; "RMSE 5.745 against a mean-prediction baseline of 14.1" means something.`}],quiz:[{question:`RMSE 5.745 and MAE 4.2 gives a ratio of 1.37. What does that tell you?`,options:[{text:`One metric is computed wrongly`,explanation:`RMSE ≥ MAE always; the ratio is expected and informative.`},{text:`Errors are not evenly spread — a few rows are much worse than the rest`,explanation:`Correct. Here four rows are off by 2–3 and one is off by 12. A ratio near 1.0 would mean even errors.`},{text:`The model is underfitting`,explanation:`Underfitting raises both roughly together and leaves the ratio unchanged.`},{text:`The units are wrong`,explanation:`Both are in the same units, which is why they are comparable at all.`}],correct:1},{question:`R² = 0.835 came from SS_res 165 and SS_tot 1000. What is SS_tot?`,options:[{text:`The total of the true values`,explanation:`That would be 150, not 1000.`},{text:`The squared error of predicting the mean 30.0 for every row`,explanation:`Correct — R² is a comparison against that baseline, which is why it is a relative measure.`},{text:`The squared error of the model`,explanation:`That is SS_res, 165.`},{text:`The variance of the predictions`,explanation:`It is computed from the true values and their mean, not from predictions.`}],correct:1},{question:`Adding three columns of pure noise took R² from 0.6458 to 0.6788. Why can that happen?`,options:[{text:`The noise columns happened to correlate with y`,explanation:`Slightly, by chance — but the deeper point is that R² can never fall when a predictor is added.`},{text:`R² can never decrease when a predictor is added, since the fit can always set its coefficient to zero`,explanation:`Correct, which is exactly why in-sample R² cannot be used to choose between models.`},{text:`The random seed was unlucky`,explanation:`The direction is guaranteed regardless of seed.`},{text:`The model overfitted the noise, which lowers R²`,explanation:`Overfitting raises in-sample R²; it lowers held-out R².`}],correct:1},{question:`Adjusted R² fell from 0.6195 to 0.6119 on the same change. What does it do differently?`,options:[{text:`It uses held-out data`,explanation:`Both are computed in-sample; the difference is the penalty term.`},{text:`It charges a penalty for each extra predictor, so it can decrease`,explanation:`Correct — the (n−1)/(n−p−1) factor grows with p, which is what lets it fall.`},{text:`It uses MAE instead of squared error`,explanation:`Both are built on squared error.`},{text:`It caps R² at 0.62`,explanation:`There is no cap; the value depends on the data.`}],correct:1},{question:`MAPE on [100, 100, 2] with predictions [110, 90, 9] was 123.3%. Why so high?`,options:[{text:`The model is genuinely terrible`,explanation:`Two of three rows are off by exactly 10%.`},{text:`The third row is off by 7 units on a true value of 2, which is 350% — a tiny denominator dominates the average`,explanation:`Correct. WAPE gives 13.4% on the same rows by dividing total error by total actual — an order of magnitude apart.`},{text:`MAPE was computed wrongly`,explanation:`It is the standard mean of absolute percentage errors.`},{text:`Because predictions exceed actuals`,explanation:`Row 2 under-predicts and still scores 10%.`}],correct:1},{question:`Why does optimising MAPE bias a model toward under-prediction?`,options:[{text:`Because it uses absolute values`,explanation:`MAE uses absolute values too and is symmetric.`},{text:`It is asymmetric: you can be at most 100% under but unboundedly over, so under-predicting is cheaper`,explanation:`Correct, and it is why MAPE is a poor objective for intermittent demand.`},{text:`Because it divides by n`,explanation:`The division by n is symmetric.`},{text:`It does not — MAPE is symmetric`,explanation:`It is specifically not; that asymmetry is its best-known flaw.`}],correct:1}],interviewQuestions:[{question:`Which regression metric would you report, and why?`,answer:`RMSE and MAE together, in the target units, because their gap is diagnostic — a ratio of 1.37 as in this data means a few rows dominate the error, while a ratio near 1.0 means it is spread evenly. I would add R² when the audience needs to know the model beats predicting the mean, with the caveat that what counts as a good R² is entirely domain-dependent. And I would always state the baseline: "RMSE 5.745" is not interpretable without knowing what the naive model scores.`,isCaseBased:!1},{question:`What exactly does R² measure?`,answer:`The fraction of squared error removed relative to predicting the mean: 1 − SS_res/SS_tot. On five rows with SS_res 165 and SS_tot 1000 that is 0.835, meaning the model removed 83.5% of the error the mean baseline would have left. Two things people get wrong: it is a comparison against a baseline rather than an absolute grade, so 0.3 can be excellent in one domain and dreadful in another; and it is not "variance explained" in any causal sense — it is a statement about fit.`,isCaseBased:!0},{question:`Can R² be negative?`,answer:`In-sample, for a model with an intercept, no — the mean-prediction fit is always available so R² is at least 0. On held-out data, yes, and it is worth knowing what it means: your model is doing worse on those rows than simply predicting the training mean. It usually indicates severe overfitting, a distribution shift between train and test, or a bug in how predictions are being generated. It is a genuinely useful alarm rather than an oddity.`,isCaseBased:!1},{question:`Why can in-sample R² not be used to compare models?`,answer:`Because it never decreases when you add a predictor — the fit can always assign the new coefficient zero, so at worst it stays flat. I demonstrated it by adding three columns of pure noise: R² rose from 0.6458 to 0.6788 on data where those columns contained nothing. Adjusted R² fixes it by charging (n−1)/(n−p−1) for each predictor, and it duly fell from 0.6195 to 0.6119 on the same change. Held-out R² is the better answer in practice.`,isCaseBased:!0},{question:`When is MAPE the wrong choice?`,answer:`Whenever the target can be zero or near it. It is undefined at zero and explodes nearby — one row with a true value of 2 and an error of 7 scored 350% and dragged the average to 123.3%. It is also asymmetric: under-prediction is capped at 100% while over-prediction is unbounded, so a model optimising MAPE systematically forecasts low. For intermittent demand, where zeros are common and the asymmetry bites, it is close to the worst available choice. WAPE or MASE instead.`,isCaseBased:!1},{question:`What is WAPE and why is it safer?`,answer:`Total absolute error divided by total actual, rather than the mean of per-row percentage errors. Because the denominator is aggregated, a single small actual cannot dominate — on the same three rows it gave 13.4% where MAPE gave 123.3% — an order of magnitude apart, and the 13.4% is the one that reflects the actual error. It also has a natural business reading: total units of error as a fraction of total volume, which is usually what a stakeholder actually meant when they asked for a percentage.`,isCaseBased:!1},{question:`Your RMSE improved but MAE got worse. What happened?`,answer:`The model traded many small errors for fewer large ones, or the reverse. Since RMSE squares before averaging, it rewards reducing the biggest residuals even at the cost of many small increases; MAE weights every unit of error equally. Divergence in opposite directions means the error *distribution* changed shape, and which one you should care about depends on whether one large miss is genuinely worse than several small ones in your domain. It is exactly the kind of thing a single metric hides.`,isCaseBased:!0},{question:`How do you make a regression metric comparable across different series?`,answer:`Scale it against a baseline rather than against the values. MASE divides MAE by the MAE of a naive forecast on the training data, so 1.0 means "no better than naive" and the number means the same thing across series of any magnitude. Percentage metrics like MAPE appear to do this but break near zero and are asymmetric. Reporting raw RMSE across series of different scales is the common mistake — it just tells you which series has bigger numbers.`,isCaseBased:!1}],flashcards:[{front:`The four metrics`,back:`RMSE (units, big misses weighted), MAE (units, proportional), R² (vs predicting the mean), MAPE (percentage of truth).`},{front:`RMSE/MAE ratio`,back:`A diagnostic. 1.37 here means a few rows dominate. Near 1.0 means errors are evenly spread.`},{front:`R², properly stated`,back:`1 − SS_res/SS_tot. SS_res 165, SS_tot 1000 → 0.835: the model removed 83.5% of the error predicting the mean would have left.`},{front:`Why in-sample R² cannot select models`,back:`It never decreases when a predictor is added. Three columns of pure noise took it 0.6458 → 0.6788.`},{front:`Adjusted R²`,back:`1 − (1−R²)(n−1)/(n−p−1). Charges for each predictor, so it CAN fall: 0.6195 → 0.6119 on that same noise.`},{front:`Negative R²`,back:`Possible on held-out data. It means the model is worse than predicting the training mean — overfitting, shift, or a bug.`},{front:`Why MAPE breaks`,back:`Undefined at y = 0 and explosive near it — a true value of 2 with error 7 scores 350%. Also asymmetric, so it biases models to under-predict.`},{front:`WAPE`,back:`Total error / total actual — 27/202 = 13.4% where MAPE gave 123.3%. A small actual cannot dominate, and it reads as units of error per unit of volume.`}],mindmapMarkdown:`- Regression metrics
  - The four questions
    - RMSE: units, big misses weighted
    - MAE: units, proportional
    - R2: vs predicting the mean
    - MAPE: percentage of truth
  - RMSE vs MAE
    - 5.745 vs 4.2, ratio 1.37
    - ratio near 1 = even errors
    - ratio high = a few rows dominate
  - R2
    - 1 - SS_res/SS_tot = 1 - 165/1000 = 0.835
    - a comparison against a BASELINE
    - never falls when you add a predictor
      - 3 noise columns: 0.6458 -> 0.6788
      - adjusted R2 falls: 0.6195 -> 0.6119
    - can go negative on held-out data
  - MAPE
    - undefined at y=0, explodes near it
    - true value 2, error 7 -> APE 350%
    - MAPE 123.3% vs WAPE 13.4%
    - asymmetric -> biases toward under-predicting
    - use WAPE or MASE`};export{e as default};