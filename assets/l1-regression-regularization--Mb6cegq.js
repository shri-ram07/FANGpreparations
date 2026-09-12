var e={id:`ml-l1-regression-regularization`,subjectId:`ml`,level:1,title:`Regularisation: Ridge and Lasso`,whyItMatters:`A model that gets every training point exactly right can be useless. This builds that failure on purpose — held-out error going from 0.04 to 10.5 — and then fixes it with one extra term in the objective.`,assumes:[`You know that a model predicts y from x with weights, and that MSE is the average squared error`,`You have read Overfitting, Underfitting & the Bias–Variance Trade-off`,`You know what x² and x³ are`],estMinutes:26,sections:[{type:`intuition`,title:`What regularisation is`,md:`**Regularisation** adds a penalty on the size of the weights to the training objective, so the model pays rent for every unit of weight it uses.

Without it, nothing pushes back on a weight of −118.89 as long as that weight buys a slightly better fit on the training rows. With it, a weight has to *earn* its size.

Two standard penalties:

- **Ridge (L2)** charges the sum of **squared** weights.
- **Lasso (L1)** charges the sum of **absolute** weights.

They behave differently in a way that matters, and the difference falls out of that one choice.`},{type:`code`,lang:`python`,title:`Nine measurements and a straight line`,code:`x  = [0, 1, 2, 3, 4, 5, 6, 7, 8]
y  = [2.0, 3.6, 3.1, 5.3, 4.8, 6.9, 6.2, 8.4, 7.9]
xh = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5]
yh = [2.9, 3.2, 4.4, 4.9, 6.0, 6.4, 7.5, 8.0]

mx = sum(x) / len(x)
my = sum(y) / len(y)
top = sum((x[i] - mx) * (y[i] - my) for i in range(len(x)))
bot = sum((x[i] - mx) ** 2 for i in range(len(x)))
w = top / bot
b = my - w * mx

def mse(xs, ys):
    return sum((w * xs[i] + b - ys[i]) ** 2 for i in range(len(xs))) / len(xs)

print('slope', round(w, 3), 'intercept', round(b, 3))
print('train MSE', round(mse(x, y), 4), ' held-out MSE', round(mse(xh, yh), 4))

# ---- real output ----
# slope 0.763 intercept 2.302
# train MSE 0.4024  held-out MSE 0.0356`,annotations:{3:`xh and yh are eight points measured half-way between the training positions. The model never sees them, so they are the honest test.`,10:`The closed-form least-squares slope: covariance of x and y over variance of x.`,17:`Train 0.4024, held-out 0.0356. Held-out is LOWER than training here, which is fine — the training rows happen to carry more of the sensor wobble. Remember 0.0356; it is the number to beat.`}},{type:`code`,lang:`python`,title:`Degree 8: a curve through all nine points`,code:`import numpy as np

x  = np.array([0, 1, 2, 3, 4, 5, 6, 7, 8], dtype=float)
y  = np.array([2.0, 3.6, 3.1, 5.3, 4.8, 6.9, 6.2, 8.4, 7.9])
xh = np.array([0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5])
yh = np.array([2.9, 3.2, 4.4, 4.9, 6.0, 6.4, 7.5, 8.0])

coef = np.polyfit(x, y, 8)
print('coefficients', np.round(coef, 2))
print('train MSE   ', round(float(np.mean((np.polyval(coef, x) - y) ** 2)), 6))
print('held-out MSE', round(float(np.mean((np.polyval(coef, xh) - yh) ** 2)), 3))
print('it predicts ', np.round(np.polyval(coef, xh), 2))

# ---- real output ----
# coefficients [  -0.     0.14   -1.8   12.43  -48.66  106.53  -118.89   51.86   2.  ]
# train MSE    0.0
# held-out MSE 10.543
# it predicts  [ 8.84  1.64  4.86  4.87  5.68  7.21  5.55 14.47]`,annotations:{8:`Eight degrees of freedom for nine points, so the curve can thread every single one exactly.`,15:`Train MSE is 0.0 — a perfect fit — and held-out MSE is 10.543, nearly 300x worse than the straight line's 0.0356.`,16:`Look at the coefficients: 106.53 and −118.89 sitting next to each other. Enormous opposing weights that cancel on the training points and stop cancelling anywhere else.`,17:`It predicts 8.84 where the truth is 2.9, and 14.47 where the truth is 8.0. Between the points it has learned, the curve is wild.`}},{type:`math`,intro:`The fit term is unchanged; the second term is new. λ (lambda) sets how much rent the weights pay: λ = 0 is no penalty at all, and large λ crushes every weight toward zero. Note the last line — the intercept is never penalised, because shifting all your y values up by 10 should not cost the model anything.`,latex:[`J_{\\text{ridge}}(w) = \\underbrace{\\frac{1}{m}\\sum_{i=1}^{m}(\\hat{y}_i - y_i)^2}_{\\text{fit error, as before}} + \\underbrace{\\lambda \\sum_{j=1}^{d} w_j^2}_{\\text{L2 penalty}}`,`J_{\\text{lasso}}(w) = \\frac{1}{m}\\sum_{i=1}^{m}(\\hat{y}_i - y_i)^2 + \\lambda \\sum_{j=1}^{d} \\lvert w_j \\rvert`]},{type:`intuition`,title:`Scaling is not optional here`,md:`The penalty **adds weights from different features together**, so it only makes sense if a unit of weight means the same thing in every column.

For x = 8, the polynomial columns run from 8 up to 8⁸ = 16,777,216. The weight on x⁸ has to be tiny to contribute anything at all — and a penalty on raw weights would therefore leave it almost untouched while crushing the weight on x.

So every column is **standardised** to mean 0 and variance 1 first. Fit the scaler on training data only, then apply it to held-out data.`},{type:`code`,lang:`python`,title:`Build the eight polynomial columns and scale them`,code:`import numpy as np
from sklearn.preprocessing import StandardScaler

x  = np.array([0, 1, 2, 3, 4, 5, 6, 7, 8], dtype=float)
xh = np.array([0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5])
Z  = np.column_stack([x ** k for k in range(1, 9)])
Zh = np.column_stack([xh ** k for k in range(1, 9)])
print('raw row for x = 8:', Z[8].astype(int))

scaler = StandardScaler().fit(Z)
Zs  = scaler.transform(Z)
Zhs = scaler.transform(Zh)
print('column 1  (x)   scaled:', np.round(Zs[:, 0], 2))
print('column 8  (x^8) scaled:', np.round(Zs[:, 7], 2))

# ---- real output ----
# raw row for x = 8: [       8       64      512     4096    32768   262144  2097152 16777216]
# column 1  (x)   scaled: [-1.55 -1.16 -0.77 -0.39  0.    0.39  0.77  1.16  1.55]
# column 8  (x^8) scaled: [-0.52 -0.52 -0.52 -0.52 -0.51 -0.45 -0.2   0.57  2.66]`,annotations:{6:`np.column_stack builds a table whose k-th column is x**k, so one row of Z is [x, x², …, x⁸] for a single position.`,8:`The raw row runs 8 to 16,777,216 — six orders of magnitude across one row. This is what makes an unscaled penalty meaningless.`,10:`fit() on the TRAINING columns computes each column's mean and spread; transform() applies them. Fitting the scaler on held-out data too would be leakage.`,14:`After scaling both columns span roughly the same range. Now a unit of weight costs the same wherever it sits.`}},{type:`code`,lang:`python`,title:`Ridge and Lasso side by side, four values of λ`,code:`from sklearn.linear_model import Ridge, Lasso

y  = np.array([2.0, 3.6, 3.1, 5.3, 4.8, 6.9, 6.2, 8.4, 7.9])
yh = np.array([2.9, 3.2, 4.4, 4.9, 6.0, 6.4, 7.5, 8.0])

def report(tag, model):
    err = np.mean((model.predict(Zhs) - yh) ** 2)
    print(tag, np.round(model.coef_, 2), ' held-out MSE', round(float(err), 3))

for a in (0.01, 0.1, 1.0, 10.0):
    print('lambda =', a)
    report('   ridge', Ridge(alpha=a).fit(Zs, y))
    report('   lasso', Lasso(alpha=a, max_iter=100000).fit(Zs, y))

# ---- real output ----
# lambda = 0.01
#    ridge [ 2.29 -0.71 -0.15  0.48  0.81  0.63 -0.11 -1.36]  held-out MSE 0.037
#    lasso [ 2.07  0.02  0.02  0.    0.    0.   -0.   -0.2 ]  held-out MSE 0.035
# lambda = 0.1
#    ridge [ 1.68  0.38  0.17  0.12  0.08 -0.02 -0.17 -0.37]  held-out MSE 0.034
#    lasso [ 1.87  0.    0.    0.    0.   -0.   -0.   -0.  ]  held-out MSE 0.044
# lambda = 1.0
#    ridge [ 1.17  0.62  0.33  0.15  0.01 -0.09 -0.17 -0.24]  held-out MSE 0.051
#    lasso [ 0.97  0.    0.    0.    0.    0.    0.    0.  ]  held-out MSE 0.832
# lambda = 10.0
#    ridge [ 0.5   0.36  0.25  0.17  0.12  0.07  0.04  0.01]  held-out MSE 0.474
#    lasso [ 0.    0.    0.    0.    0.    0.    0.    0.  ]  held-out MSE 3.112`,annotations:{11:`alpha is scikit-learn's name for λ. max_iter is raised because Lasso is solved iteratively and the default stops early here.`,17:`Both fix the overfit immediately: held-out MSE goes from 10.543 to 0.037 and 0.035 at λ = 0.01. The weights are now single digits instead of ±118.`,21:`Look at Lasso's row: exact zeros. Not 0.001 — zero. It has deleted six of the eight features outright, which is why L1 is called feature selection.`,25:`Ridge shrinks everything but keeps everything: 1.17, 0.62, 0.33 … all still present, all smaller.`,29:`Too much penalty is its own failure. At λ = 10 Lasso has zeroed every weight and predicts a constant, giving MSE 3.112. λ is a hyperparameter and it is tuned on validation data like any other.`}},{type:`visual`,component:`RegularizationGeometry`,props:{}},{type:`note`,label:`Why L1 hits exactly zero and L2 does not`,md:`Take one weight sitting at 0.1 and ask what pushing it the rest of the way to 0 saves.

- **L1, λ|w|:** going 0.1 → 0 saves λ × 0.1. The saving per unit moved is λ, the *same* however small w gets. So there is always a constant incentive to finish the job.
- **L2, λw²:** going 0.1 → 0 saves λ × 0.01. The saving shrinks with w itself, so the incentive fades as the weight approaches zero and never quite pushes it over.

That is the whole difference. L1 selects; L2 shrinks.`},{type:`code`,lang:`python`,title:`The classic mistake: regularising without scaling`,code:`import numpy as np
from sklearn.linear_model import Lasso
from sklearn.preprocessing import StandardScaler

rng = np.random.default_rng(1)
A = rng.normal(size=(200, 2))
y = 2.0 * A[:, 0] + 2.0 * A[:, 1] + rng.normal(scale=0.3, size=200)
A[:, 0] = A[:, 0] * 0.001

raw = Lasso(alpha=0.1).fit(A, y)
scaled = Lasso(alpha=0.1).fit(StandardScaler().fit_transform(A), y)
print('unscaled coefficients:', np.round(raw.coef_, 3))
print('scaled   coefficients:', np.round(scaled.coef_, 3))

# ---- real output ----
# unscaled coefficients: [0.    1.54 ]
# scaled   coefficients: [1.712 1.692]`,annotations:{7:`Both features genuinely matter: the true weight on each is 2.0. Nothing about the data favours one over the other.`,8:`Only the units change — feature 0 is now recorded in kilometres instead of metres, say. The information content is identical.`,14:`Unscaled, Lasso deletes feature 0 entirely. Its weight would have to be 1000x larger to say the same thing, and the penalty charges for that size, so the cheapest option is to drop a genuinely useful feature.`,15:`Scaled, both come back at 1.712 and 1.692 — close to the true 2.0. Same data, same λ, opposite conclusion, decided purely by a unit change.`}}],quiz:[{question:`The degree-8 fit had training MSE 0.0 and held-out MSE 10.543. What does training MSE 0.0 tell you?`,options:[{text:`The model is excellent`,explanation:`It is the worst model on the page by the only measure that matters.`},{text:`Only that eight free weights can thread nine points — it says nothing about new data`,explanation:`Correct. A perfect training fit is a capacity fact, not a quality fact.`},{text:`The data is noise-free`,explanation:`The sensor wobble is still there; the curve absorbed it rather than ignoring it.`},{text:`The polynomial degree was too low`,explanation:`It was too high — that is why it could interpolate every point.`}],correct:1},{question:`Why does the intercept escape the penalty?`,options:[{text:`Because it is usually small`,explanation:`It is often the largest coefficient of all.`},{text:`Because shifting every y value up by a constant should not cost the model anything`,explanation:`Correct. Penalising the intercept would make the fit depend on where you happen to put zero on the y axis.`},{text:`Because it does not multiply a feature, so it has no scale`,explanation:`True that it multiplies no feature, but the reason it is exempt is the shift-invariance argument.`},{text:`It does get penalised in Lasso`,explanation:`Neither Ridge nor Lasso penalises the intercept by default.`}],correct:1},{question:`At λ = 0.1, Lasso returned weights of exactly 0 while Ridge returned 0.38, 0.17, 0.12… Why the difference?`,options:[{text:`Lasso converged early`,explanation:`max_iter was raised to 100,000 precisely to rule that out.`},{text:`L1 saves a constant λ per unit moved, so the incentive to reach zero never fades; L2's saving shrinks with w`,explanation:`Correct. Moving 0.1 → 0 saves λ×0.1 under L1 but only λ×0.01 under L2.`},{text:`Ridge cannot produce zeros because of floating point`,explanation:`It is not a numerical issue — the penalty's shape is what stops it.`},{text:`Lasso removes correlated features only`,explanation:`It zeroes weights whenever the fit gain does not cover the penalty, correlated or not.`}],correct:1},{question:`At λ = 10, Lasso zeroed every weight and held-out MSE rose to 3.112. What does that show?`,options:[{text:`Lasso is unsuitable for this data`,explanation:`At λ = 0.01 it gave the best score on the page, 0.035.`},{text:`Too much regularisation is its own failure mode — the model underfits to a constant`,explanation:`Correct. λ trades overfitting for underfitting, which is why it is tuned on validation data.`},{text:`The scaling step was wrong`,explanation:`The same scaled columns work fine at smaller λ.`},{text:`The held-out set is too small`,explanation:`It is small, but the monotone rise with λ is a real effect.`}],correct:1},{question:`Unscaled, Lasso gave [0.0, 1.54]; scaled, [1.712, 1.692]. Both features had a true weight of 2.0. What happened?`,options:[{text:`Feature 0 was genuinely useless`,explanation:`Its true weight was 2.0, identical to feature 1.`},{text:`Feature 0 was recorded on a 1000× smaller scale, so its weight had to be huge — and the penalty charges for size`,explanation:`Correct. The cheapest way to satisfy the penalty was to delete a genuinely useful feature. A unit change silently changed the model.`},{text:`Lasso always deletes the first feature`,explanation:`It has no positional preference.`},{text:`λ = 0.1 is too large`,explanation:`The same λ works correctly once the columns are standardised.`}],correct:1},{question:`Where must the scaler be fitted?`,options:[{text:`On the training columns only, then applied to held-out data`,explanation:`Correct. Fitting on everything lets held-out statistics influence training, which is leakage.`},{text:`On the full dataset before splitting`,explanation:`That is the leak — the held-out rows contribute their mean and spread to the transform.`},{text:`Separately on each set`,explanation:`Then the two sets are on different scales and the model's weights mean different things for each.`},{text:`It does not matter for standardisation`,explanation:`It matters for any fitted transform, standardisation included.`}],correct:0}],interviewQuestions:[{question:`Explain the difference between L1 and L2 regularisation.`,answer:`Both add a penalty on weight size; L2 penalises the sum of squares, L1 the sum of absolute values. The consequence is that L1 drives weights to exactly zero and L2 only shrinks them. The reason is the saving per unit moved: pushing a weight from 0.1 to 0 saves λ×0.1 under L1, a constant rate that does not fade, but only λ×0.01 under L2, a saving that vanishes as the weight approaches zero. So L1 performs feature selection and L2 distributes weight smoothly.`,isCaseBased:!1},{question:`Why must you standardise features before regularising?`,answer:`Because the penalty sums weights across features, so it implicitly assumes a unit of weight means the same in every column. It does not if the columns have different scales. In the demonstration, two features both had a true weight of 2.0; recording one of them on a 1000× smaller scale made Lasso delete it entirely — coefficients [0.0, 1.54] instead of [1.712, 1.692]. A pure unit change flipped the model's conclusion, and nothing in the output announces it.`,isCaseBased:!0},{question:`How do you choose λ?`,answer:`Cross-validation over a log-spaced grid, and never on the test set. The numbers here show why both extremes fail: λ = 0 gives held-out MSE 10.543, λ = 10 with Lasso gives 3.112, and the useful region is in between. Plot validation error against log λ and take the minimum — or, if you want a more conservative model, the largest λ within one standard error of the minimum.`,isCaseBased:!1},{question:`When would you prefer Ridge to Lasso?`,answer:`When you believe many features each contribute a little, and when features are correlated. Ridge splits weight between correlated features and keeps them all, which is stable; Lasso picks one essentially arbitrarily and zeroes the others, so a tiny change in the data can swap which one survives. Ridge also has a closed-form solution. Lasso wins when you want a sparse, readable model or genuinely believe most features are irrelevant. Elastic Net does both.`,isCaseBased:!1},{question:`What is the Bayesian reading of these penalties?`,answer:`Each corresponds to a prior on the weights, with the penalised objective being the negative log posterior. L2 is a Gaussian prior centred at zero — most weights near zero, large ones increasingly unlikely, nothing exactly zero. L1 is a Laplace prior, which has a sharp peak at zero and puts real probability mass there, so the posterior mode genuinely sits at zero for weak features. λ is the inverse of the prior variance: a stronger prior means more shrinkage.`,isCaseBased:!1},{question:`Your model has 10,000 features and 500 rows. What do you do?`,answer:`Regularise heavily, and prefer L1 or Elastic Net. With p far above n the unregularised problem is underdetermined — infinitely many weight vectors fit the training data perfectly, which is the degree-8 situation at a larger scale. L1 gives a sparse solution that is both computable and readable. I would standardise first, choose λ by cross-validation, and be careful that the CV itself is not leaking: any scaling or feature selection has to happen inside each fold.`,isCaseBased:!0},{question:`A colleague reports that adding regularisation made training error worse. Is that a problem?`,answer:`No — it is expected and is the point. The objective is no longer pure fit, so the fit term must get worse when a penalty is added. The number to check is held-out error, which here went from 10.543 unregularised to 0.034 at λ = 0.1. If held-out error also got worse, then λ is too large and the model has moved from overfitting to underfitting.`,isCaseBased:!0},{question:`How does regularisation relate to the bias–variance trade-off?`,answer:`It buys a reduction in variance by accepting some bias. Shrinking weights makes the fitted model less sensitive to which rows it saw — that is variance falling — while pulling it systematically away from the least-squares solution, which is bias rising. λ is the dial: at zero, minimum bias and maximum variance; at large λ, the model approaches a constant, which is maximum bias and near-zero variance. The best λ is wherever their sum bottoms out on validation data.`,isCaseBased:!1}],flashcards:[{front:`Regularisation, in one sentence`,back:`Add a penalty on weight size to the objective, so a weight has to earn its magnitude.`},{front:`Ridge vs Lasso`,back:`Ridge (L2) penalises Σw² and shrinks everything. Lasso (L1) penalises Σ|w| and drives weights to exactly zero.`},{front:`Why does L1 reach zero?`,back:`Moving 0.1 → 0 saves λ×0.1 under L1 (constant rate) but only λ×0.01 under L2 (fading rate). L1's incentive never runs out.`},{front:`The overfit being fixed`,back:`Degree 8 on 9 points: train MSE 0.0, held-out 10.543, weights ±118. With λ = 0.01 held-out drops to ~0.036 and weights become single digits.`},{front:`Why standardise first?`,back:`The penalty adds weights across columns, so it assumes a unit of weight means the same everywhere. Unscaled, Lasso deleted a feature whose true weight was 2.0 purely because it was recorded on a 1000× smaller scale.`},{front:`Is the intercept penalised?`,back:`No. Shifting every y up by a constant should not cost the model anything.`},{front:`Too much λ`,back:`Its own failure. Lasso at λ = 10 zeroed every weight and predicted a constant: held-out MSE 3.112.`},{front:`Ridge or Lasso with correlated features?`,back:`Ridge — it splits weight between them and is stable. Lasso picks one arbitrarily, so small data changes swap which survives.`}],mindmapMarkdown:`- Regularisation
  - The idea
    - add a penalty on weight SIZE to the objective
    - lambda sets the rent
    - intercept never penalised
  - The overfit
    - 9 points, degree 8
    - train MSE 0.0, held-out 10.543
    - weights 106.53 and -118.89, cancelling
    - straight line held-out: 0.0356
  - Two penalties
    - Ridge L2: sum w^2, shrinks all
    - Lasso L1: sum |w|, exact zeros
    - why: saving per unit is constant for L1, fades for L2
  - Scaling first
    - x to x^8 spans 8 to 16,777,216
    - unscaled Lasso deleted a true-weight-2.0 feature
    - fit the scaler on TRAIN only
  - Choosing lambda
    - 0.01 -> 0.035, 0.1 -> 0.034
    - 1.0 -> 0.832, 10 -> 3.112 (all zeros)
    - cross-validate, never on test`};export{e as default};