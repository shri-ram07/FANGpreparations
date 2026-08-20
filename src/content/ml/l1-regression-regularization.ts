import type { Module } from '../types'

const m: Module = {
  id: 'ml-l1-regression-regularization',
  subjectId: 'ml',
  level: 1,
  title: 'Polynomials, Overfitting, and Regularisation: Ridge vs Lasso',
  whyItMatters:
    'A model that gets every training point exactly right can still be useless. This module builds that failure on purpose with nine data points and a curve that threads all nine, then shows the error on unseen points blowing up from 0.04 to 10.5. You will see the fitted numbers that cause it, and you will fix them with one extra term in the objective. Everything here is printed from a real run, so no step is taken on trust.',
  assumes: [
    'You have read *Linear Regression* — you know that a model predicts y from x with a straight line, that each input gets a number called a weight, and that MSE is the average of the squared errors',
    'You have read *Gradient Descent* — you know that training means repeatedly nudging the weights to make the loss smaller',
    'You know from school maths what x squared and x cubed are, and what a curve on a graph looks like',
    'You have seen a Python list, a for loop, and a function definition',
  ],
  estMinutes: 38,
  sections: [
    {
      type: 'intuition',
      title: 'Nine measurements, and a straight line through them',
      md: `A sensor is measured at nine positions. Position is **x**, the reading is **y**. Here is all the data:

- x = 0, 1, 2, 3, 4, 5, 6, 7, 8
- y = 2.0, 3.6, 3.1, 5.3, 4.8, 6.9, 6.2, 8.4, 7.9

Read the y values in order and you can see the shape: they climb, but not smoothly. Up, down a bit, up, down a bit. The climb is the real signal. The wobble is **noise** — measurement error that will not repeat if you measure again.

We also have eight extra measurements taken at the half-positions (0.5, 1.5, ... 7.5) that the model will **not** be allowed to see while it learns. Data kept back like this is called **held-out data**. Its whole purpose is to answer one question: does this model work on inputs it has never seen?

- held-out x = 0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5
- held-out y = 2.9, 3.2, 4.4, 4.9, 6.0, 6.4, 7.5, 8.0

First, fit the simplest thing there is: a straight line ŷ = w·x + b, with w the slope and b the height at x = 0.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 1: the straight line, in plain Python',
      code: `x  = [0, 1, 2, 3, 4, 5, 6, 7, 8]
y  = [2.0, 3.6, 3.1, 5.3, 4.8, 6.9, 6.2, 8.4, 7.9]
xh = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5]
yh = [2.9, 3.2, 4.4, 4.9, 6.0, 6.4, 7.5, 8.0]

mx = sum(x) / len(x)
my = sum(y) / len(y)
top = sum((x[i] - mx) * (y[i] - my) for i in range(len(x)))
bot = sum((x[i] - mx) ** 2 for i in range(len(x)))
w = top / bot
b = my - w * mx
print('slope', round(w, 3), 'intercept', round(b, 3))

def mse(xs, ys):
    return sum((w * xs[i] + b - ys[i]) ** 2 for i in range(len(xs))) / len(xs)

print('train MSE', round(mse(x, y), 4), ' held-out MSE', round(mse(xh, yh), 4))

# ---- real output ----
# slope 0.763 intercept 2.302
# train MSE 0.4024  held-out MSE 0.0356`,
      annotations: {
        1: 'The nine training positions, as a plain Python list of numbers.',
        2: 'The nine readings, in the same order, so y[3] is the reading taken at x[3].',
        3: 'The eight held-out positions. The fitting code below never touches these while computing w and b.',
        4: 'The eight held-out readings. Used once, at the very end, only to score the model.',
        6: 'The average of the x values. sum() adds a list up, len() counts it, so this is the ordinary mean.',
        7: 'The average of the y values, the same way.',
        8: 'For each point, multiply how far x is above its mean by how far y is above its mean, then add all nine products. This is the top half of the standard least-squares slope formula. The bracketed expression inside sum() is a generator expression: it produces one number per i and hands them to sum() one at a time.',
        9: 'The bottom half: how far x is from its mean, squared, added over all nine points. ** is Python\'s power operator, so ** 2 is squaring.',
        10: 'Dividing the two gives the slope that makes the total squared error as small as a straight line can make it. This is the closed-form least-squares answer from the previous module, written out by hand.',
        11: 'The intercept is fixed once the slope is known: the fitted line must pass through the point (mean of x, mean of y).',
        12: 'Prints the fitted line: slope 0.763, intercept 2.302. So the model says ŷ = 0.763·x + 2.302.',
        14: 'A small function that scores the line on any pair of lists. Defining it once means we can score training and held-out data with the same code.',
        15: 'For each point: predict w·x + b, subtract the true y, square it. Average over all the points. That average is the mean squared error, MSE.',
        17: 'The result: 0.4024 on data it was fitted to, 0.0356 on data it has never seen. Both small, and the held-out score is not worse than the training score. This model generalises.',
      },
    },
    {
      type: 'intuition',
      title: 'A straight line has one shape. What if we want more?',
      md: `The line scored 0.4024 on training data. Some of that error is the wobble, which no line can capture. A natural thought: give the model more freedom and it will do better.

The way to give a linear model freedom is not to change the model. It is to **add columns**. Feed it x, and also x², and also x³, and let it pick a weight for each:

ŷ = w₁·x + w₂·x² + w₃·x³ + b

That is **polynomial regression**: fitting a curve by handing a straight-line fitter the powers of x as extra inputs. The highest power used is called the **degree**. Degree 1 is the straight line we just fitted. Degree 8 uses x, x², ..., x⁸ — eight inputs, eight weights.

The number of weights a model has to play with is its **model complexity**. More weights means more shapes it can draw. Degree 8 gives eight weights and nine training points, which is exactly enough freedom to pass through every single point.

That sounds like a good thing. Watch what it actually does.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 2: degree 8 — a curve through all nine points',
      code: `import numpy as np

x  = np.array([0, 1, 2, 3, 4, 5, 6, 7, 8], dtype=float)
y  = np.array([2.0, 3.6, 3.1, 5.3, 4.8, 6.9, 6.2, 8.4, 7.9])
xh = np.array([0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5])
yh = np.array([2.9, 3.2, 4.4, 4.9, 6.0, 6.4, 7.5, 8.0])

coef = np.polyfit(x, y, 8)
print('coefficients', np.round(coef, 2))
print('train MSE   ', round(float(np.mean((np.polyval(coef, x) - y) ** 2)), 6))
print('held-out MSE', round(float(np.mean((np.polyval(coef, xh) - yh) ** 2)), 3))
print('it predicts ', np.round(np.polyval(coef, xh), 2))
print('truth is    ', yh)

# ---- real output ----
# coefficients [  -0.     0.14   -1.8   12.43  -48.66  106.53  -118.89   51.86   2.  ]
# train MSE    0.0
# held-out MSE 10.543
# it predicts  [ 8.84  1.64  4.86  4.87  5.68  7.21  5.55 14.47]
# truth is     [2.9 3.2 4.4 4.9 6.  6.4 7.5 8. ]`,
      annotations: {
        1: 'numpy is a library for arrays of numbers. "as np" gives it a short name so we can write np.something. We need it only because it has a ready-made polynomial fitter.',
        3: 'np.array turns a Python list into a numpy array — a list that supports arithmetic on the whole thing at once. dtype=float says store these as decimals, not whole numbers.',
        4: 'The same nine readings as before, as an array.',
        5: 'The held-out positions.',
        6: 'The held-out readings.',
        8: 'np.polyfit(x, y, 8) finds the nine numbers of the best-fitting degree-8 polynomial: the weights on x⁸, x⁷, ... x, and the constant. It returns them highest power first. This is the same least-squares maths as before, just with eight input columns instead of one.',
        9: 'Print those fitted weights, rounded to 2 decimals. Look hard at the printed row — it is the point of this whole snippet.',
        10: 'np.polyval(coef, x) evaluates the fitted polynomial at every training x. Subtract the true y, square, and np.mean averages. So this is the training MSE, printed to 6 decimals.',
        11: 'The identical calculation on the held-out positions the fit never saw.',
        12: 'The model\'s actual predictions at the eight held-out positions.',
        13: 'The true readings at those positions, printed underneath so the two rows line up.',
      },
    },
    {
      type: 'intuition',
      title: 'Reading that output: what just went wrong',
      md: `Three things in that printout, in order of importance.

**1. Training error is 0.0 and held-out error is 10.5.** The straight line scored 0.0356 on the same held-out points. The fancier model is roughly **300 times worse** on new data while being perfect on old data. That gap is the definition of **overfitting**: the model learned the noise in the nine training readings as if it were signal.

**2. The predictions in between are absurd.** At x = 0.5 the true reading is 2.9 and the curve says **8.84**. At x = 7.5 the truth is 8.0 and the curve says **14.47**. At x = 1.5 the truth is 3.2 and it says **1.64**. The curve hits all nine training points exactly and then swings violently between them, because nothing in the objective told it what to do between points.

**3. The fitted weights are enormous and they alternate in sign:** +12.43, −48.66, +106.53, −118.89, +51.86. Compare that to the straight line, whose one weight was 0.763.

That third point is the useful one. The violent swings are *built out of* those big opposing numbers: a large positive term and a large negative term that nearly cancel at the nine training points and stop cancelling everywhere else. Big weights are not a side effect of overfitting here — they are the mechanism.

So if you want to stop the swings, make big weights expensive.`,
    },
    {
      type: 'intuition',
      title: 'Regularisation: charge rent on the weights',
      md: `Right now the training objective is one thing: make the squared error small. Nothing pushes back on a weight of −118.89, because it does buy a slightly better fit on the nine points.

**Regularisation** means adding a second term to the objective that grows when the weights grow:

**new objective = fit error + λ × (a measure of how big the weights are)**

That second term is the **penalty term**. **λ** (the Greek letter lambda, written **alpha** in scikit-learn) is the price tag on weight size.

- λ = 0: the penalty is switched off. You are back to plain least squares.
- λ small: a weight of −118 has to earn its keep. If it only shaves a sliver of error, it gets cut down.
- λ huge: every weight is crushed toward 0 and the model predicts nearly a flat line.

Pulling weights toward zero like this is called **shrinkage**. The model still chooses the weights; it just now pays for them.

There are two standard ways to measure "how big the weights are", and they differ in exactly one respect.

- **L2, called Ridge**: add up the *squares* of the weights, λ·(w₁² + w₂² + ... ).
- **L1, called Lasso**: add up the *absolute values*, λ·(|w₁| + |w₂| + ... ). Absolute value just means drop the minus sign: |−5| = 5.

That single difference — squares versus absolute values — produces two very different models, and you are about to see it in the printed numbers rather than be told about it.`,
    },
    {
      type: 'math',
      intro: 'The two objectives. Same fit term, one different penalty. m is the number of training points, d the number of weights.',
      latex: [
        'J_{\\text{ridge}}(w) = \\underbrace{\\frac{1}{m}\\sum_{i=1}^{m}(\\hat{y}_i - y_i)^2}_{\\text{fit error, as before}} + \\underbrace{\\lambda \\sum_{j=1}^{d} w_j^2}_{\\text{L2 penalty}}',
        'J_{\\text{lasso}}(w) = \\frac{1}{m}\\sum_{i=1}^{m}(\\hat{y}_i - y_i)^2 + \\lambda \\sum_{j=1}^{d} \\lvert w_j \\rvert',
        '\\text{The intercept } b \\text{ is never penalised: shifting every } y \\text{ up by 10 should not cost the model anything.}',
      ],
    },
    {
      type: 'intuition',
      title: 'Before any penalty: the features must share a scale',
      md: `There is a step you cannot skip, and it comes from one line of the formulas above: the penalty **adds weights from different features together**. Adding them up only makes sense if a weight of 1 means a comparable amount of work whichever feature it sits on.

In our data it emphatically does not. At x = 8, the column x is 8 and the column x⁸ is 16,777,216. To contribute the same amount to a prediction, the weight on x⁸ has to be about two million times smaller than the weight on x. So the x⁸ weight would pay almost no penalty regardless of what it does, and the x weight would be punished heavily for doing an honest job. The penalty would be aimed at the units, not at the model.

The fix is **feature scaling** — also called standardisation. For each column separately:

1. Subtract that column's mean, so the column is centred on 0.
2. Divide by that column's standard deviation, a measure of how spread out the column is.

After this, every column has mean 0 and spread 1, and a weight of 1 means the same thing on every column. Only now is the penalty comparing like with like.

**This is not a tuning tip. Regularisation without scaling is a different, wrong model** — you will see it break at the end of the module.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 3: build the eight polynomial columns and scale them',
      code: `import numpy as np
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
# column 8  (x^8) scaled: [-0.52 -0.52 -0.52 -0.52 -0.51 -0.45 -0.2   0.57  2.66]`,
      annotations: {
        1: 'numpy again, for arrays and rounding.',
        2: 'StandardScaler is scikit-learn\'s implementation of the two-step scaling described above: subtract each column\'s mean, divide by its spread.',
        4: 'The nine training positions.',
        5: 'The eight held-out positions.',
        6: 'Builds the feature table. The bracketed part is a list comprehension: for k = 1..8 it computes the whole column x**k at once, giving eight columns. np.column_stack glues those eight columns side by side into a 9-row, 8-column table called Z.',
        7: 'The same eight columns for the held-out positions, so the trained model can be scored on them later.',
        8: 'Z[8] is the ninth row, the one for x = 8. .astype(int) prints it as whole numbers so it fits on a line: 8, 64, 512, ... 16777216. That spread across one row is the scaling problem, in numbers.',
        10: '.fit(Z) measures the mean and spread of each of the eight columns and stores them inside the scaler object. It changes nothing yet.',
        11: '.transform(Z) applies the stored means and spreads, returning the scaled table Zs. Every column of Zs now has mean 0 and spread 1.',
        12: 'The held-out table is scaled with the SAME stored numbers from the training data. Never re-measure on held-out data — that would leak information about it into the model.',
        13: 'The scaled x column: a tidy spread from -1.55 to +1.55.',
        14: 'The scaled x⁸ column: also now in the -0.52 to 2.66 range. Sixteen million became a number the penalty can compare fairly against the others.',
      },
    },
    {
      type: 'intuition',
      title: 'Step 4: the same data, four values of λ, two penalties',
      md: `Now fit both penalties on the scaled table, at λ = 0.01, 0.1, 1 and 10, and print the eight fitted weights each time plus the held-out MSE. Remember the numbers to beat: the unpenalised degree-8 fit scored **10.543** held out, and the straight line scored **0.0356**.

Nothing in this code is new except the two model objects. Read the printed weight rows carefully — the whole L1-versus-L2 argument is visible in them.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 4 in code: Ridge and Lasso side by side (continues the snippet above)',
      code: `from sklearn.linear_model import Ridge, Lasso

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
#    lasso [ 0.    0.    0.    0.    0.    0.    0.    0.  ]  held-out MSE 3.112`,
      annotations: {
        1: 'Ridge is scikit-learn\'s L2 model, Lasso its L1 model. Both take the penalty strength as a keyword called alpha, which is the λ of the formulas.',
        3: 'The nine training readings.',
        4: 'The eight held-out readings, used only for scoring.',
        6: 'A small helper so each model is reported the same way. tag is a label to print, model is an already-fitted Ridge or Lasso.',
        7: 'model.predict(Zhs) runs the fitted model on the scaled held-out table. Subtract the truth, square, average: held-out MSE.',
        8: 'model.coef_ is the list of eight fitted weights — the trailing underscore is scikit-learn\'s convention for "this exists only after fitting". Rounded to 2 decimals so the row is readable.',
        10: 'Loop over four penalty strengths spanning three factors of ten. Penalty strength acts multiplicatively, so a grid like this is spaced by multiplying, not by adding.',
        11: 'Print which λ the next two rows belong to.',
        12: '.fit(Zs, y) runs the fitting and returns the fitted model, which is handed straight to report. Ridge minimises fit error + λ·(sum of squared weights).',
        13: 'The same call for Lasso, which minimises fit error + λ·(sum of absolute weights). max_iter is raised because Lasso is solved by an iterative search rather than a formula, and the default iteration cap warns on small awkward problems like this one.',
      },
    },
    {
      type: 'note',
      md: `**What those rows show, in numbers rather than claims.**

- **Both fixed the overfit.** Held-out MSE went from 10.543 with no penalty to 0.037 (Ridge) and 0.035 (Lasso) at λ = 0.01. The huge alternating weights (+106, −118) are gone; the largest surviving weight is 2.29.
- **Ridge never prints a zero.** At λ = 0.01 the weights are −0.71, −0.15, 0.48 ... At λ = 10 they are 0.5, 0.36, 0.25 ... down to 0.01. Every one gets smaller as λ rises, and not one of them ever arrives at 0. That is **shrinkage** without deletion.
- **Lasso prints exact zeros immediately.** At λ = 0.01, four of the eight weights are exactly 0.0. At λ = 0.1, seven of eight are 0 and only the weight on plain x survives at 1.87 — Lasso rediscovered the straight line by itself. Having most weights be exactly zero is called **sparsity**.
- **A weight of exactly 0 means the feature is gone.** 0 × x⁵ contributes nothing, so the model no longer uses x⁵ at all. This is why L1 is described as doing automatic feature selection.
- **Too much penalty is its own failure.** At λ = 10 Lasso has zeroed everything (held-out MSE 3.112) and Ridge has crushed all weights toward zero (0.474). λ is a dial with a bad setting at each end, so it is chosen by trying values and scoring on held-out data — never by training error, which always prefers λ = 0.`,
    },
    {
      type: 'intuition',
      title: 'Why absolute values hit exactly zero and squares do not',
      md: `Take one weight, currently at 0.1, and ask what each penalty saves if you push it the rest of the way to 0.

- **L1 penalty λ|w|:** going from 0.1 to 0 saves λ × 0.1. Going from 5.1 to 5.0 also saves λ × 0.1. The saving per step is the same everywhere, including at the last step into zero. So the pressure to finish the job never weakens.
- **L2 penalty λw²:** going from 0.1 to 0 saves λ × (0.1² − 0²) = λ × 0.01. Going from 5.1 to 5.0 saves λ × (26.01 − 25) = λ × 1.01 — a hundred times more. The pressure fades as the weight gets small, so the weight approaches zero and never finishes.

That is the whole difference, and it matches the printed rows exactly: Lasso's small weights snap to 0.0, Ridge's small weights become 0.01 and stay there.

The same fact has a picture, which is the version interviewers usually ask for. Set it up like this. Draw a flat plane whose two axes are two weights, w₁ across and w₂ up. Every possible model is one point on that plane. Two objects live on it:

1. **Loss contours** — rings around the point of best possible fit (the unpenalised answer). Every point on one ring has the same fit error; rings further out are worse fits. They come out as tilted ellipses.
2. **The budget region** — everywhere the penalty will let you go. Capping |w₁| + |w₂| draws a **diamond**: a square rotated 45°, whose four corners sit exactly **on the axes**. Capping w₁² + w₂² draws a **circle**.

The regularised answer is the point where the smallest ring **first touches** the budget region. And a pointy region gets touched at its point.`,
    },
    { type: 'visual', component: 'RegularizationGeometry', props: { kind: 'l1' } },
    {
      type: 'note',
      md: `**What to do with the picture above, in order.**

1. Leave it as it opens: L1 selected, budget 0.70. The marker sits on the corner of the diamond, on the horizontal axis. Read the w line underneath — the second number is 0.00. That is a weight driven to exactly zero, the same event as the 0.0 entries printed by Lasso.
2. Press **L2 / Ridge (circle)** without touching the slider. Same data, same budget, and the marker slides off the axis: both weights are now small and neither is zero. Nothing changed but the shape of the region.
3. Drag the budget slider up towards 3 with L1 selected. The diamond grows, the penalty weakens, and eventually the touch point leaves the corner — the second weight comes back. Big λ means small budget, and small budget is what puts you on a corner.
4. Drag it back down to 0.25 on L2 and watch: both weights shrink towards zero together, and neither reaches it. That is the same behaviour as the Ridge rows in the printout.

The reason a corner is not a lucky accident: a corner is a single point that many different ring orientations all touch first, because it sticks out furthest in a whole range of directions. A circle has no such point — for every orientation the ring touches somewhere different, and only one exact orientation would land on an axis.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: one weight, computed by hand',
      md: `Let us do the smallest possible complete example with a pen, so the two behaviours come out as arithmetic rather than a picture.

One weight w. Suppose the fit error, as a function of that weight, is (w − 0.3)², so the unpenalised best answer is w = 0.3.

**Ridge.** Minimise (w − 0.3)² + λw². Take the derivative and set it to 0:

- 2(w − 0.3) + 2λw = 0
- 2w − 0.6 + 2λw = 0, so w(2 + 2λ) = 0.6, so **w = 0.3 / (1 + λ)**.
- λ = 0.2 → w = 0.250. λ = 1 → w = 0.150. λ = 10 → w = 0.027. λ = 1000 → w = 0.0003.

Dividing by a bigger and bigger number never gives exactly zero. That is Ridge, in one formula.

**Lasso.** Minimise (w − 0.3)² + λ|w|. Absolute value has no single slope at 0, so check the two sides separately.

- Assume the answer is positive. Then |w| = w, derivative 2(w − 0.3) + λ = 0, giving w = 0.3 − λ/2.
- Assume it is negative. Then |w| = −w, derivative 2(w − 0.3) − λ = 0, giving w = 0.3 + λ/2.
- Take λ = 0.2. The first gives w = 0.2, which is positive — consistent, so **w = 0.2**.
- Now take λ = 0.8. The first gives w = 0.3 − 0.4 = −0.1, which is *negative*, contradicting the assumption. The second gives w = 0.3 + 0.4 = 0.7, which is *positive*, contradicting that assumption too. Neither side works, so the minimum is not on either side: it is at the join, **w = 0 exactly**.

Both λ = 0.8 and λ = 5 and λ = 50 give the same answer: w = 0. Once λ passes twice the fit pressure (here 2 × 0.3 = 0.6), the weight is not shrunk, it is deleted. Compare with Ridge at λ = 0.8: w = 0.3/1.8 = 0.167, alive and well.

That is the exact-zero mechanism, done by hand, with no geometry required.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: regularising without scaling',
      md: `This is the bug that ships. Two features, both genuinely useful, both with a true weight of 2.0. Then someone records the first one in kilometres instead of metres — the same information, multiplied by 0.001. No information was lost; only the unit changed.

Fit Lasso on those raw columns, and separately on the scaled columns, at the same λ = 0.1. A correct procedure would give the same answer both times.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same data in different units, and a deleted feature',
      code: `import numpy as np
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
# scaled   coefficients: [1.712 1.692]`,
      annotations: {
        1: 'numpy, for the random data and the rounding.',
        2: 'The L1 model, so we can watch a weight hit exactly zero.',
        3: 'The scaler from the previous snippet.',
        5: 'A random number generator with the seed 1 fixed, so this run reproduces exactly on your machine too.',
        6: 'A table of 200 rows and 2 columns of random numbers. normal means the numbers are drawn from the usual bell-shaped spread around 0.',
        7: 'Build the target: both columns contribute with a true weight of 2.0, plus a little noise. A[:, 0] means "every row, column 0" — the colon stands for all rows. By construction the two features are equally useful.',
        8: 'Multiply column 0 by 0.001. This is the unit change: metres to kilometres. The information is untouched, so any honest procedure must give the same model as before.',
        10: 'Fit Lasso on the raw columns, one of which now has tiny numbers in it.',
        11: 'Fit the same Lasso on scaled columns. .fit_transform measures the means and spreads and applies them in one call.',
        12: 'The unscaled result: the first weight is EXACTLY 0. The feature was deleted.',
        13: 'The scaled result: 1.712 and 1.692, both close to the true 2.0 and to each other. Correct — and one line of code away from the wrong answer.',
      },
    },
    {
      type: 'note',
      md: `**Why that happened, precisely.** After the unit change, column 0 has values a thousand times smaller. To contribute the same amount to the prediction, its weight has to be a thousand times *larger* — around 2000 instead of 2. The L1 penalty charges λ × |w|, so that feature is now being asked to pay roughly a thousand times more penalty for doing the identical job. It cannot afford it, so the solver zeroes it and lets the other feature absorb what it can (1.54 instead of 2.0, so even the surviving weight is now wrong).

The failure is silent. No exception, no warning, a confident model. The three-line rule: **scale first, fit second, and fit the scaler on training data only.** Plain unpenalised least squares genuinely does not care about units — it just rescales the weight and gives an identical prediction. Every penalised model cares.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work these with a pen before reading the solutions in the next section.

1. A degree-12 polynomial fitted to 13 points gives training MSE 0.000 and held-out MSE 41.7. Name what is happening, name the one number in the fitted output you would look at to confirm it, and say what you expect to see.
2. Using the hand-worked example, fit error (w − 0.3)² with penalty strength λ = 0.4: what does Ridge give, and what does Lasso give? Show the arithmetic.
3. You fit Lasso and get weights [1.8, 0.0, 0.0, 0.9, 0.0]. Your colleague fits Ridge on the same scaled data and gets [1.2, 0.05, 0.03, 0.8, 0.02]. Which model would you hand to someone who has to explain the system to a regulator, and what have you given up?
4. A model uses two features: house area in square feet (values around 1000) and number of bedrooms (values 1 to 5). You fit Ridge on the raw, unscaled columns. Which feature is likely to be shrunk harder, and why?
5. You sweep λ over 0.001, 0.01, 0.1, 1, 10 and pick the λ with the lowest **training** error. Which λ will you always pick, and what should you have done instead?`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `**1.** Overfitting: 13 free weights for 13 points means the curve can pass through every one, so training error goes to zero while the fit between points is unconstrained. Confirm it by printing the fitted weights and looking for large values with alternating signs, like the +106.53 / −118.89 pair in this module. Large opposing weights are what a violently wiggling curve is made of.

**2.** Ridge: w = 0.3 / (1 + λ) = 0.3 / 1.4 = **0.214**. Lasso: assume positive, w = 0.3 − λ/2 = 0.3 − 0.2 = **0.1**, which is positive, so it is consistent and 0.1 is the answer. Note 0.4 is still below the cut-off 2 × 0.3 = 0.6, so Lasso has shrunk the weight but not yet deleted it.

**3.** Hand over the Lasso model. It uses two features instead of five, so the explanation is "the prediction is 1.8 × feature 1 plus 0.9 × feature 4", which a person can check. What you gave up: (a) accuracy, potentially, since the dropped features may have carried a little real signal, and (b) stability of the selection — if two features are near-duplicates, L1 keeps one of them roughly arbitrarily, so a slightly different data sample can produce a different list of survivors. If the *list* is the deliverable, that instability matters and you should say so.

**4.** Bedrooms. Area has values around 1000, so a small weight on it already moves the prediction a lot; bedrooms has values 1 to 5, so it needs a weight roughly 300 times larger to have comparable influence. The penalty charges by weight size, so bedrooms pays hundreds of times more for the same contribution and is shrunk far harder. The unscaled penalty is measuring units, not usefulness. Scale first.

**5.** You will always pick λ = 0.001, the smallest one, and if 0 were on the grid you would pick 0. Training error is lowest exactly when the penalty is switched off, by definition — the penalty can only ever add to the training objective. Instead score each λ on data the fit did not see: split off a validation set, or use k-fold cross-validation, and pick the λ with the best held-out score. In this module, the held-out MSE column is doing exactly that job: it is the only column in which λ = 0.01 and λ = 0.1 beat λ = 0.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Four extra facts, useful once everything above is solid.

- **Elastic Net** uses both penalties at once, λ₁·Σ|w| + λ₂·Σw², so you get L1's exact zeros while L2's sharing keeps correlated features entering and leaving together instead of one being picked at random.
- **Ridge has a closed-form solution**, w = (XᵀX + λI)⁻¹Xᵀy — the normal equation with λ added down the diagonal. Adding that diagonal also makes the matrix invertible when features are perfectly correlated or when you have more features than rows, which is a reason to use Ridge even without an overfitting problem. Lasso has no closed form, because |w| has no derivative at 0; solvers use an iterative method called coordinate descent, which is why the code needed max_iter.
- **Choosing λ properly** is k-fold cross-validation over a multiplicative grid; scikit-learn ships RidgeCV and LassoCV to do the sweep in one call. The full treatment is in the Level 3 module *Cross-Validation & Hyperparameter Tuning*.
- **Correlated features** are where L1 and L2 differ most. Ridge splits a shared signal between near-duplicate columns, because for a squared penalty 1.5² + 1.5² = 4.5 is cheaper than 3² = 9. Lasso is indifferent to how the total is split and its corner geometry ends up keeping one column and zeroing the rest.`,
    },
  ],
  quiz: [
    {
      question: 'A degree-8 fit on 9 points gives training MSE 0.0 and held-out MSE 10.5, while a straight line gives 0.40 and 0.036. What does that tell you?',
      options: [
        {
          text: 'The degree-8 model is better, since its training error is zero',
          explanation: 'Zero training error on a model with enough weights to pass through every point is evidence of nothing. The only honest score is the held-out one, and there the line wins by 300x.',
        },
        {
          text: 'The degree-8 model is overfitting: it fitted the noise in the nine points, so it fails between them',
          explanation: 'Correct. The gap between a perfect training score and a terrible held-out score is the definition of overfitting.',
        },
        {
          text: 'The held-out data must be from a different distribution',
          explanation: 'It is the same sensor at half-positions between the training positions. The straight line scores 0.036 on it, so the data is fine — the model is not.',
        },
      ],
      correct: 1,
    },
    {
      question: 'What visible symptom in the fitted numbers confirms a polynomial has overfitted?',
      options: [
        {
          text: 'All the weights are close to zero',
          explanation: 'That is what a strongly regularised model looks like — the opposite problem.',
        },
        {
          text: 'Large weights with alternating signs, like +106.53 then -118.89',
          explanation: 'Correct. The violent swings between training points are built out of large opposing terms that nearly cancel at the training points and stop cancelling between them.',
        },
        {
          text: 'The intercept is large',
          explanation: 'The intercept just sets the overall height. It is not penalised and it does not cause wiggles.',
        },
      ],
      correct: 1,
    },
    {
      question: 'You raise λ on a Ridge model. What happens to a weight that is currently 0.02?',
      options: [
        {
          text: 'It becomes exactly 0 and the feature drops out',
          explanation: 'That is Lasso. In the printed runs, Ridge weights go 0.05, 0.02, 0.01 and never reach 0.',
        },
        {
          text: 'It gets smaller but stays non-zero',
          explanation: 'Correct. The squared penalty saves λ x 0.0004 for deleting a weight of 0.02 — almost nothing — so there is never enough pressure to finish the job.',
        },
        {
          text: 'It grows, to compensate for the penalty',
          explanation: 'Nothing rewards growth. The penalty only ever makes large weights more expensive.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Why does the L1 penalty produce weights that are exactly 0.0?',
      options: [
        {
          text: 'Because absolute value cannot represent very small numbers, so they collapse',
          explanation: 'Absolute value represents small numbers perfectly. Nothing numerical is going wrong.',
        },
        {
          text: 'Because the saving from shrinking a weight is the same at every size, including the final step into zero, so the pressure never fades',
          explanation: 'Correct. Moving 0.1 to 0 saves the same as moving 5.1 to 5.0. Geometrically, the same fact appears as the diamond having corners that sit on the axes.',
        },
        {
          text: 'Because the L1 penalty is always numerically larger than L2',
          explanation: 'Not always true — for a weight below 1 the square is the smaller of the two — and size is not the mechanism anyway.',
        },
      ],
      correct: 1,
    },
    {
      question: 'You fit Lasso on raw columns: annual income (values around 1,000,000) and number of rooms (1 to 6). What goes wrong?',
      options: [
        {
          text: 'Nothing — scikit-learn scales internally for penalised models',
          explanation: 'It does not. Ridge and Lasso fit exactly the columns you hand them.',
        },
        {
          text: 'Income needs a tiny weight and so pays almost no penalty, while rooms needs a large weight and gets shrunk or zeroed regardless of how useful it is',
          explanation: 'Correct. The penalty adds weights across features and so assumes comparable scales. The module demo drops a genuinely useful feature purely by changing metres to kilometres.',
        },
        {
          text: 'Lasso raises an error on badly scaled input',
          explanation: 'It fits happily and returns a confident, wrong model. Silence is what makes this bug dangerous.',
        },
      ],
      correct: 1,
    },
    {
      question: 'You sweep λ and pick the value with the lowest training error. What will you always pick?',
      options: [
        {
          text: 'The largest λ on the grid',
          explanation: 'Backwards. A large λ crushes the weights and makes training error worse, not better.',
        },
        {
          text: 'The smallest λ, because training error is minimised when the penalty is switched off',
          explanation: 'Correct — the penalty can only add to the training objective, so training error votes for no regularisation every time. Score on held-out data instead.',
        },
        {
          text: 'Whichever λ is best, since training error is a fair comparison here',
          explanation: 'It is not fair: the models being compared differ precisely in how much extra cost they are paying, and training error ignores that cost entirely.',
        },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain L1 and L2 regularisation, and when you would pick each.',
      answer:
        'Both add a penalty term to the same squared-error objective, and they differ only in how weight size is measured. L2 (Ridge) adds λ times the sum of squared weights: it shrinks every weight smoothly toward zero and none of them arrive, so the model stays dense. Because squaring makes sharing cheap, it splits signal between correlated features. L1 (Lasso) adds λ times the sum of absolute weights: the saving per unit of shrinkage is constant right down to zero, so weak weights land exactly on 0 and those features leave the model — automatic feature selection and a sparse, explainable result. The cost is instability: among near-duplicate features L1 keeps one roughly arbitrarily. Pick Ridge when you think most features carry a little signal and are correlated, Lasso when you suspect most are useless and want them named, Elastic Net when you want sparsity and your features come in correlated clusters. All of them require scaled features.',
      isCaseBased: false,
    },
    {
      question: 'Why does L1 give exactly zero and L2 not? Give both a plain argument and the geometric one.',
      answer:
        'Plain argument: ask what the penalty saves when you push a weight the last bit into zero. For L1, moving 0.1 to 0 saves λ times 0.1, exactly the same as moving 5.1 to 5.0 — the pressure to shrink is the same at every size, including at zero, so a weight can be pushed all the way and held there whenever the fit gradient is smaller than λ. For L2, moving 0.1 to 0 saves λ times 0.01 while moving 5.1 to 5.0 saves λ times 1.01 — the pressure fades as the weight shrinks, so the weight only approaches zero. Geometric version: write each as constrained optimisation, minimise squared error subject to a cap on the sum of absolute weights (L1) or squared weights (L2). The L1 region is a diamond whose corners lie on the axes; the L2 region is a circle. The answer is where the expanding loss contour first touches the region, and a pointy region gets touched at its point — at that corner one coordinate is exactly zero. A circle has no corners, so an on-axis touch would be a coincidence.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague ships a Lasso model, and the coefficient on the feature the business swears is most important came out 0. Debug it.',
      answer:
        'First hypothesis, and usually the answer: the features were not scaled. The L1 penalty adds weights across features, so a feature recorded in large units needs a tiny weight and pays almost nothing, while a small-unit feature needs a large weight and gets zeroed regardless of how predictive it is. Check whether a scaler is in the pipeline and that it was fitted on training data only. Second: λ is simply too high — sweep it and watch when the coefficient reappears, scoring each value on held-out data. Third: correlation. If the feature is a near-duplicate of another column, Lasso keeps exactly one of the pair and the signal is still in the model under a different name; test by dropping the rival column and refitting, or switch to Elastic Net so the cluster is kept or dropped together. Fourth, only after those: the feature genuinely adds nothing beyond the other columns, which is a real finding. Frame the conclusion carefully — a weight of zero means "not needed given the other columns", not "unrelated to the target".',
      isCaseBased: true,
    },
    {
      question: 'Case: training R-squared is 0.92, test is 0.31, and the fitted coefficients are huge with alternating signs (+4100, -38000, +91000). Diagnose and fix.',
      answer:
        'That is overfitting, and the coefficients are the fingerprint: large opposing weights are what a violently wiggling fit is made of, so this is most likely a high-degree polynomial or a feature set that is wide relative to the number of rows. Fixes in order of effort: (1) regularise, Ridge first since it penalises exactly the squared magnitudes that are exploding, with λ chosen by cross-validation; (2) reduce capacity directly — lower the polynomial degree, or use Lasso to cut the feature count; (3) get more rows, the only fix that adds capacity without adding variance; (4) verify the split itself, because a collapsing test score can also mean a distribution shift or a leaky train set. Scale the features before any of the penalised options. Confirm the fix by watching the gap between training and validation error close, not by watching training error, which will get worse and should.',
      isCaseBased: true,
    },
    {
      question: 'How do you choose λ, and what would you never do?',
      answer:
        'Never choose it by training error: the penalty can only add to the training objective, so training error is minimised at λ = 0 and will always vote against regularising. Use k-fold cross-validation over a multiplicative grid — something like 0.001 to 100, stepping by factors of ten, because the effect of λ is multiplicative — and take the value with the best mean held-out score. RidgeCV and LassoCV do the sweep in one call. Two refinements worth mentioning: the one-standard-error rule, where among all values within one standard error of the best you take the largest, giving the simplest model that is statistically as good; and putting the scaler inside the cross-validation pipeline so it is refitted on each fold and no information about the held-out fold leaks into the fit.',
      isCaseBased: false,
    },
    {
      question: 'Case: a product manager sees a small coefficient on "number of bedrooms" and concludes bedrooms do not affect rent. Respond.',
      answer:
        'Three corrections. First, coefficient size is not importance unless the features share a scale: bedrooms runs 1 to 5 while area runs 300 to 3000, so the same real effect appears as a much smaller number on bedrooms. Compare standardised coefficients, or use permutation importance instead. Second, a coefficient is a conditional statement — it means bedrooms adds little given that area is already in the model, and the two are heavily correlated, so the signal is present but attributed to the other column. Drop area and the bedroom coefficient will jump. Third, it is not causal; it is what the fit needed given the columns that happen to be present. The honest phrasing is "holding area fixed, an extra bedroom adds about X, but bedrooms and area move together, so this data cannot separate them cleanly".',
      isCaseBased: true,
    },
    {
      question: 'Why is polynomial regression still called linear regression?',
      answer:
        'Because "linear" describes how the weights enter the equation, not what the fitted curve looks like on a plot. Fitting y = w1·x + w2·x² + w3·x³ is just ordinary linear regression on three input columns that happen to be x, x squared and x cubed. You changed the data, not the algorithm: the same least-squares maths, the same solver, the same closed-form solution. This matters practically because everything that applies to linear regression continues to apply — including that the fit is unique and cheap, and including that the penalty terms and the scaling requirement work exactly as before. It also sets up the trap: because adding powers is so easy, capacity grows faster than people expect, and with n points a degree n-1 polynomial can pass through all of them.',
      isCaseBased: false,
    },
    {
      question: 'Why must features be scaled before Ridge or Lasso, but not before plain least squares?',
      answer:
        'The penalty adds the weights of different features together, which silently assumes a weight of 1 means comparable work on every feature. If one column is in millions and another is in single digits, the first needs a microscopic weight and pays almost no penalty while the second needs a large weight and is punished for it, so the penalty ends up targeting units rather than usefulness. In the demo in this module, changing a single feature from metres to kilometres — the same information — makes Lasso delete it entirely. Plain least squares has no such term: if you rescale a column, the fitted weight rescales by the inverse and predictions are identical, so it is genuinely invariant. Practically: standardise each column to mean 0 and spread 1, fit the scaler on training data only, and keep it inside the pipeline so cross-validation refits it per fold.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    {
      front: 'Polynomial regression, in one line',
      back: 'Hand a straight-line fitter extra columns x², x³, ... x^p. Same solver, new data. The highest power p is the degree, and it controls how many shapes the model can draw.',
    },
    {
      front: 'What overfitting looks like in printed numbers',
      back: 'Training error near 0 while held-out error is far worse than a simple baseline. In this module: degree-8 fit scored 0.0 training and 10.5 held out, where a straight line scored 0.036 held out.',
    },
    {
      front: 'The symptom to look for in the weights',
      back: 'Large weights with alternating signs, e.g. +106.53 then -118.89. A wildly wiggling curve is built out of big opposing terms that cancel at training points and stop cancelling between them.',
    },
    {
      front: 'The shape of every regularised objective',
      back: 'fit error + λ x (a measure of weight size). λ = 0 is plain least squares. λ large crushes all weights toward 0. λ is chosen by held-out score, never by training error.',
    },
    {
      front: 'Ridge (L2)',
      back: 'Penalty λ x sum of w². Shrinks every weight smoothly, none reach exactly 0, model stays dense. One weight: w = 0.3 / (1 + λ) — always non-zero. Shares signal between correlated features.',
    },
    {
      front: 'Lasso (L1)',
      back: 'Penalty λ x sum of |w|. Weak weights land on exactly 0.0, so features leave the model: automatic feature selection, sparse result. Among near-duplicate features it keeps one, roughly arbitrarily.',
    },
    {
      front: 'Why L1 hits exactly zero',
      back: 'The saving from shrinking is constant at every size, including the last step into 0 (0.1 to 0 saves the same as 5.1 to 5.0), while for L2 it fades to nothing. Picture version: the diamond has corners on the axes; the circle has no corners.',
    },
    {
      front: 'Scaling and regularisation',
      back: 'Mandatory. The penalty adds weights across features, so it assumes comparable scales. Recording one feature in km instead of m made Lasso delete it entirely. Scale first, fit second, fit the scaler on training data only.',
    },
  ],
  mindmapMarkdown: `- Polynomials, Overfitting, and Regularisation
  - The setup
    - 9 training points, 8 held-out points
    - Straight line: train 0.40, held out 0.036
    - Degree 8: train 0.0, held out 10.5
  - Polynomial regression
    - Add columns x, x², ... x^p
    - Degree = model complexity
    - Same solver, new data
  - Overfitting
    - Perfect on training, terrible between points
    - Predicts 8.84 where truth is 2.9
    - Fingerprint: big alternating weights (+106, -118)
  - Regularisation
    - objective = fit error + λ x weight size
    - λ = the price of a weight; shrinkage
    - λ = 0 is plain least squares, λ huge is a flat line
  - Feature scaling
    - Penalty adds weights across features
    - x column is 8, x⁸ column is 16,777,216
    - Subtract mean, divide by spread, fit on train only
  - Ridge (L2)
    - Penalty λ x sum of w²
    - Weights shrink smoothly, never reach 0
    - Hand example: w = 0.3 / (1 + λ)
  - Lasso (L1)
    - Penalty λ x sum of |w|
    - Weights hit exactly 0 - sparsity, feature selection
    - At λ = 0.1 it rediscovered the straight line
  - Why L1 zeroes
    - Saving per step constant down to 0; L2 saving fades
    - Diamond corners lie on the axes; circle has none
    - Hand example: λ > 0.6 gives w = 0 exactly
  - Choosing λ
    - Score on held-out data, never training error
    - Both ends are bad: λ = 10 scored 3.11
  - The classic mistake
    - Metres to kilometres, same information
    - Lasso deleted the feature: weight exactly 0
    - Silent - no error, just a wrong model`,
}

export default m
