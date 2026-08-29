var e={id:`metrics-l1-regression-losses`,subjectId:`metrics`,level:1,title:`Regression Losses: MSE, MAE, Huber, Quantile`,whyItMatters:`The loss you pick decides what number the model settles on. Four losses on the same six deliveries give two different answers, and the gap between them is entirely a choice you made rather than something the data said.`,assumes:[`You can compute an average and square a number`,`You have seen a Python list, a for loop and a function`],estMinutes:22,sections:[{type:`intuition`,title:`What a regression loss does`,md:`A **residual** is the miss on one row: actual minus prediction. A **loss** turns all the residuals into one number, and training moves the prediction to make that number smaller.

The choice of loss is a choice about **how much a big miss should cost relative to a small one**, and it changes the answer.

Five deliveries took 10, 11, 12, 13, 14 minutes. Then a sixth bike breaks down and takes **90**.`},{type:`math`,intro:`The four losses. MSE squares, so a miss of 10 costs 100 times a miss of 1. MAE does not, so it costs 10 times. RMSE is MSE square-rooted back into the original units. Huber is quadratic near zero and linear past δ; quantile charges asymmetrically, with τ setting which side is expensive.`,latex:[`\\text{MSE} = \\frac{1}{n}\\sum_i (y_i - \\hat{y}_i)^2 \\qquad \\text{RMSE} = \\sqrt{\\text{MSE}} \\qquad \\text{MAE} = \\frac{1}{n}\\sum_i \\lvert y_i - \\hat{y}_i \\rvert`,`L_\\delta(e) = \\begin{cases} \\tfrac{1}{2}e^2 & \\lvert e \\rvert \\le \\delta \\\\ \\delta\\left(\\lvert e \\rvert - \\tfrac{1}{2}\\delta\\right) & \\text{otherwise} \\end{cases}`,`L_\\tau(e) = \\begin{cases} \\tau \\, e & e \\ge 0 \\\\ (\\tau - 1)\\, e & e < 0 \\end{cases} \\qquad \\tau = 0.5 \\text{ recovers MAE (halved)}`]},{type:`code`,lang:`python`,title:`MSE and MAE on the five clean deliveries`,code:`y = [10, 11, 12, 13, 14]
guess = 12

sq_total = 0
abs_total = 0
for actual in y:
    error = actual - guess
    sq_total = sq_total + error * error
    abs_total = abs_total + abs(error)

print('MSE', sq_total / len(y))
print('MAE', abs_total / len(y))

# ---- real output ----
# MSE 2.0
# MAE 1.2`,annotations:{7:`The residual. Negative when the actual came in under the prediction — the sign is why both losses have to remove it somehow.`,8:`Squaring removes the sign AND inflates large misses. Those are two separate consequences, and the second one is the whole story of this module.`,9:`abs() removes the sign and does nothing else. A miss of 2 costs exactly twice a miss of 1.`,13:`2.0 against 1.2. Different scales, so the numbers are not comparable — what matters is how each one responds when a residual gets large.`}},{type:`code`,lang:`python`,title:`Add the 90, then price three candidate predictions`,code:`def mse(y, guess):
    return sum((actual - guess) ** 2 for actual in y) / len(y)

def mae(y, guess):
    return sum(abs(actual - guess) for actual in y) / len(y)

dirty = [10, 11, 12, 13, 14, 90]
for guess in [12, 12.5, 25]:
    print(guess, round(mse(dirty, guess), 2), round(mae(dirty, guess), 2))

# ---- real output ----
# 12 1015.67 14.0
# 12.5 1002.92 14.0
# 25 846.67 21.67`,annotations:{7:`Five deliveries that took about 12 minutes, and one that took 90. Only one row in six is unusual.`,11:`Read this as a competition. MSE charges 1015.67 for predicting 12 and only 846.67 for predicting 25 — so MSE actively prefers 25, a number that is wrong for five deliveries out of six.`,13:`MAE charges 14.0 for predicting 12 and 21.67 for 25, so it prefers 12. Same data, same six rows, opposite conclusions.`}},{type:`code`,lang:`python`,title:`Stop guessing: scan for each loss's favourite prediction`,code:`def scan(y, loss):
    best_guess = None
    best_value = None
    g = 0.0
    while g <= 100.0:
        v = loss(y, g)
        if best_value is None or v < best_value - 1e-12:
            best_value, best_guess = v, g
        g = round(g + 0.5, 1)
    return best_guess

clean = [10, 11, 12, 13, 14]
print('clean: MSE fit', scan(clean, mse), ' MAE fit', scan(clean, mae))
print('dirty: MSE fit', scan(dirty, mse), ' MAE fit', scan(dirty, mae))

# ---- real output ----
# clean: MSE fit 12.0  MAE fit 12.0
# dirty: MSE fit 25.0  MAE fit 12.0`,annotations:{7:`The 1e-12 guard means "strictly cheaper", so floating-point noise cannot make an equal value look like an improvement.`,9:`round(g + 0.5, 1) rather than g += 0.5, because repeatedly adding 0.5 as a float accumulates drift and the sweep would eventually miss its own step values.`,15:`Clean data: both land on 12. With no outlier, the losses agree and the choice does not matter.`,16:`Dirty data: MSE lands on 25 and MAE on 12. One row in six moved the MSE answer by thirteen minutes. **MSE fits the mean and MAE fits the median**, which is exactly what you are seeing.`}},{type:`visual`,component:`Plot`,props:{title:`What each loss charges for a miss of e`,notice:`At e = 3 the squared error charges 9 while the absolute error charges 3 — so one point off by 3 outweighs nine points off by 1 under MSE. That is why the single 90 dragged the MSE answer from 12 to 25. Huber is the compromise: curved like MSE near zero so it keeps a useful slope there, straight like MAE past δ = 1 so no single point can dominate.`,kind:`line`,xLabel:`residual e`,yLabel:`loss charged`,series:[{name:`MSE`,points:[[-3,9],[-2.5,6.25],[-2,4],[-1.5,2.25],[-1,1],[-.5,.25],[0,0],[.5,.25],[1,1],[1.5,2.25],[2,4],[2.5,6.25],[3,9]]},{name:`MAE`,points:[[-3,3],[-2,2],[-1,1],[0,0],[1,1],[2,2],[3,3]]},{name:`Huber`,points:[[-3,2.5],[-2.5,2],[-2,1.5],[-1.5,1],[-1,.5],[-.5,.125],[0,0],[.5,.125],[1,.5],[1.5,1],[2,1.5],[2.5,2],[3,2.5]]}]}},{type:`note`,label:`RMSE, and why it exists`,md:`MSE is in **squared minutes**, which is not a unit anyone can reason about. RMSE square-roots it back into minutes, so it can sit next to MAE in a report.

Two consequences worth holding on to:

- **RMSE ≥ MAE always**, with equality only when every residual is identical. So a large gap between them tells you a few big errors dominate — that is information, not noise.
- RMSE inherits MSE's outlier sensitivity completely. Taking the square root changes the units, not the behaviour.`},{type:`note`,label:`Quantile loss, and the range it buys`,md:`MSE, MAE and Huber are all **symmetric** — being 10 minutes early costs exactly what being 10 minutes late does. For a delivery estimate that is plainly wrong.

**Quantile loss** charges the two directions differently. τ = 0.9 makes under-prediction nine times as expensive, so the model settles on the 90th percentile rather than the middle.

Fit twice, at τ = 0.1 and τ = 0.9, and you get a **range** instead of a number — "between 18 and 34 minutes" — which is usually far more useful to a customer than a single point estimate that is wrong in both directions.`},{type:`note`,label:`The decision list`,md:`Learn the mapping, not the formulas.

- **Clean data, and big misses genuinely are much worse** → MSE/RMSE.
- **Outliers you do not want to chase** → MAE.
- **Outliers, but you still want a usable gradient near zero** → Huber.
- **The two directions cost differently, or you want a range** → quantile.

The classic mistake is reaching for MSE by default because it is the default, on data where one row in six is a broken bike.`}],quiz:[{question:`On the dirty data, MSE's best prediction was 25 and MAE's was 12. What does that mean?`,options:[{text:`MSE is broken`,explanation:`It is doing exactly what it is defined to do; the definition is what has this consequence.`},{text:`MSE fits the mean and MAE fits the median, and one outlier moves the mean but not the median`,explanation:`Correct. The mean of [10,11,12,13,14,90] is 25; the median is 12.5, and the half-minute sweep lands on 12.`},{text:`The scan was too coarse`,explanation:`A finer step would give 12.5 for MAE, not change the 25.`},{text:`MAE ignores the 90 entirely`,explanation:`It charges for it — just linearly rather than quadratically.`}],correct:1},{question:`Why did MSE charge 1015.67 for predicting 12 but only 846.67 for predicting 25?`,options:[{text:`Because 25 is closer to more of the deliveries`,explanation:`It is further from five of the six.`},{text:`Because squaring makes the single 78-minute miss dominate the total, and moving toward 90 reduces it faster than it hurts the other five`,explanation:`Correct. 78² = 6,084 dwarfs everything else, so MSE will trade five small errors for one smaller large one.`},{text:`A rounding artefact`,explanation:`The gap is 169, far beyond rounding.`},{text:`Because MSE divides by n`,explanation:`Both predictions divide by the same n = 6.`}],correct:1},{question:`Is RMSE ever smaller than MAE?`,options:[{text:`Yes, when there are outliers`,explanation:`Outliers push RMSE further above MAE, not below.`},{text:`No — RMSE ≥ MAE always, with equality only when every residual is identical`,explanation:`Correct, which is why a large gap between them is a signal that a few big errors dominate.`},{text:`Yes, on small datasets`,explanation:`The inequality holds at any size.`},{text:`Only when residuals are negative`,explanation:`Both remove the sign before averaging.`}],correct:1},{question:`What does Huber buy over MAE?`,options:[{text:`Better outlier resistance`,explanation:`MAE is at least as resistant; Huber is linear past δ precisely to match it.`},{text:`A usable gradient near zero, since it is quadratic there rather than having a constant slope with a kink`,explanation:`Correct. MAE's slope is ±1 everywhere and undefined at 0, so it converges awkwardly near the optimum.`},{text:`Units in the original scale`,explanation:`That is RMSE's contribution.`},{text:`Asymmetry between over- and under-prediction`,explanation:`Huber is symmetric; that is quantile loss.`}],correct:1},{question:`You set τ = 0.9 in quantile loss. What does the model settle on?`,options:[{text:`The 90th percentile — under-prediction is nine times as expensive`,explanation:`Correct, which is why delivery estimates use a high τ: being late is worse than being early.`},{text:`The mean, scaled by 0.9`,explanation:`Quantile loss targets a quantile, not a scaled mean.`},{text:`The 10th percentile`,explanation:`That would be τ = 0.1.`},{text:`The same as MAE`,explanation:`Only τ = 0.5 recovers MAE, up to a factor of a half.`}],correct:0},{question:`RMSE and MAE are far apart on your test set. What does that tell you?`,options:[{text:`A bug in one of the metrics`,explanation:`Both are simple and the inequality is guaranteed; the gap is informative.`},{text:`A few large errors dominate, because RMSE squares before averaging`,explanation:`Correct, and it is worth investigating those rows rather than reporting one number.`},{text:`The model is underfitting`,explanation:`Underfitting raises both roughly together.`},{text:`The target needs rescaling`,explanation:`Rescaling the target scales both proportionally and does not change their ratio.`}],correct:1}],interviewQuestions:[{question:`MSE or MAE — how do you choose?`,answer:`By what a large miss should cost relative to a small one, and by how clean the data is. MSE squares, so a residual of 10 costs 100 times one of 1 — it fits the mean and chases outliers. MAE fits the median and ignores their size. The demonstration is stark: five deliveries near 12 minutes plus one broken bike at 90, and MSE settles on 25 while MAE settles on 12. Neither is wrong; MSE is answering "minimise squared error" faithfully. The question is whether a prediction that is wrong for five rows in six is what you wanted.`,isCaseBased:!0},{question:`Why report both RMSE and MAE?`,answer:`Because their gap is diagnostic. RMSE is always at least MAE, with equality only if every residual is identical, so the size of the gap tells you how much a few large errors are dominating. RMSE alone hides whether your error is spread evenly or concentrated in a handful of rows, and those two situations call for completely different fixes — more capacity in one case, investigating specific rows in the other.`,isCaseBased:!1},{question:`What is Huber loss for?`,answer:`It is the compromise between MSE and MAE. Quadratic within δ of zero, so it keeps a gradient that shrinks as you approach the optimum, which is what makes MSE converge nicely; linear beyond δ, so no single wild residual can dominate the total, which is what makes MAE robust. δ is the changeover point and is a hyperparameter — set it around where you consider a residual to stop being ordinary. It is a good default when you have outliers but MAE is converging badly.`,isCaseBased:!1},{question:`When would you use quantile loss?`,answer:`When the two directions cost differently, or when you want a range rather than a point. Delivery estimates are the clean case: arriving late is far worse than arriving early, so τ around 0.9 targets the 90th percentile and the model deliberately over-estimates. Fitting twice at τ = 0.1 and τ = 0.9 gives a prediction interval directly from the model, which is usually more useful to a customer than a single number that will be wrong in both directions.`,isCaseBased:!1},{question:`Your regression model is badly skewed by a few extreme targets. Options?`,answer:`Several, and they are not equivalent. Change the loss to MAE or Huber, which stops the model chasing them. Transform the target — log for a right-skewed positive quantity — which compresses the tail before the loss ever sees it. Investigate whether the extremes are genuine or data errors, because deleting real signal is worse than modelling it. Or model them separately if they are a distinct regime. I would start by looking at the rows rather than reaching for a loss, since "a broken bike" is often a missing feature rather than noise.`,isCaseBased:!0},{question:`Why is MSE so often the default?`,answer:`Partly good reasons, partly inertia. It has a smooth derivative everywhere, unlike MAE which has a kink at zero, so optimisation is well behaved. It has a closed-form solution for linear models. And it corresponds to maximum likelihood under Gaussian noise, which is a genuine justification when that assumption holds. The inertia part is that it is every library's default, so it gets used on data where the Gaussian assumption is plainly false — like a delivery-time distribution with a long right tail.`,isCaseBased:!1},{question:`What does MAPE add, and when does it break?`,answer:`It expresses error as a percentage of the actual, which makes it comparable across series of different scales and is why business stakeholders like it. It breaks badly near zero — a true value of 0 makes it undefined and small true values make it explode — and it is asymmetric, penalising over-prediction more than under-prediction, which biases models that optimise it downward. sMAPE and MASE are the usual repairs, and MASE has the advantage of being scaled against a naive baseline.`,isCaseBased:!1},{question:`A colleague says their RMSE improved from 5.2 to 4.8. What do you ask?`,answer:`What the units are and what the baseline is — 4.8 what, and what does predicting the mean score? Then whether MAE moved in the same direction, since a large RMSE improvement with flat MAE means they fixed a few extreme rows rather than the typical case, which may or may not be the goal. Then whether it is measured on the same split, and whether the difference exceeds the fold-to-fold variation. A 0.4 improvement is meaningless without knowing the noise on the estimate.`,isCaseBased:!0}],flashcards:[{front:`MSE vs MAE, in one line`,back:`MSE squares the residual and fits the MEAN. MAE takes the absolute value and fits the MEDIAN.`},{front:`The delivery demonstration`,back:`[10,11,12,13,14,90]: MSE's best prediction is 25, MAE's is 12. One row in six moved the MSE answer by thirteen minutes.`},{front:`Why MSE preferred 25`,back:`It charges 1015.67 at 12 and 846.67 at 25 — the 78-minute miss squared to 6,084 dominates, so it trades five small errors for one smaller large one.`},{front:`RMSE`,back:`sqrt(MSE), putting it back into the original units. RMSE ≥ MAE always; equality only when every residual is identical.`},{front:`What an RMSE–MAE gap means`,back:`A few large errors dominate. It is a diagnostic, not noise.`},{front:`Huber`,back:`Quadratic within δ, linear beyond it. Keeps MSE's useful gradient near zero and MAE's resistance to a wild residual.`},{front:`Quantile loss`,back:`Charges the two directions differently. τ = 0.9 makes under-prediction 9× as costly and targets the 90th percentile. τ = 0.5 recovers MAE.`},{front:`The decision list`,back:`Clean + big misses matter → MSE. Outliers → MAE. Outliers + want a gradient → Huber. Asymmetric cost or want a range → quantile.`}],mindmapMarkdown:`- Regression losses
  - The choice
    - how much should a big miss cost vs a small one
    - it changes the ANSWER, not just the score
  - MSE vs MAE
    - MSE squares -> fits the MEAN
    - MAE absolute -> fits the MEDIAN
    - clean [10..14]: both pick 12
    - dirty + one 90: MSE picks 25, MAE picks 12
    - MSE charges 1015.67 at 12, 846.67 at 25
  - RMSE
    - sqrt(MSE), back into real units
    - RMSE >= MAE always
    - the GAP tells you a few big errors dominate
  - Huber
    - quadratic within delta, linear beyond
    - MSE's gradient near zero + MAE's robustness
  - Quantile
    - asymmetric: tau = 0.9 -> 90th percentile
    - fit twice -> a RANGE, not a number
  - Decision list
    - clean -> MSE, outliers -> MAE
    - outliers + gradient -> Huber
    - asymmetric or range -> quantile`};export{e as default};