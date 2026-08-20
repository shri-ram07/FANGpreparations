import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l2-regression-metrics',
  subjectId: 'metrics',
  level: 2,
  title: 'Regression Metrics: RMSE, MAE, R-squared and the MAPE Trap',
  whyItMatters:
    'When a model predicts a number - a rent, a delivery time, tomorrow\'s units sold - nobody can read the raw errors. You have to compress them into one or two numbers a person can act on. This module builds four of those numbers from five hand-written predictions, using plain Python lists and for loops, so you can compute each one yourself. It also shows, with real printed numbers, the two ways these numbers lie: a percentage error that swings from 13 percent to 123 percent when one row has a small actual, and an R-squared of 0.9968 for a model that knows nothing.',
  assumes: [
    'You have read *Regression Losses* in this subject, so you already know MSE (average squared error) and MAE (average absolute error) as things a model minimises while training',
    'You know what an average is, and what a percentage is',
    'You have seen a Python list, a for loop, and range(len(x))',
    'No statistics background is needed. R-squared, adjusted R-squared, MAPE, sMAPE and WAPE are all defined here from scratch.',
  ],
  estMinutes: 42,
  sections: [
    {
      type: 'intuition',
      title: 'Five days of sales, five predictions, one pile of errors',
      md: `A shop sells some number of units each day. A model predicts that number the night before. Five days went like this.

- True units sold: **10, 20, 30, 40, 50**.
- The model predicted: **12, 18, 33, 38, 62**.
- Subtract, prediction minus truth, one day at a time: **+2, -2, +3, -2, +12**.

Four of the five days are close. The last day is a 12-unit miss on a 50-unit day. Nobody can read five errors out loud in a meeting, so we squash them into a single number. The rest of this module is four different ways of squashing, and what each one hides.

Note what changed since *Regression Losses*. There, MSE and MAE were the numbers the model **minimised while training**. Here they are the numbers you **report afterwards**. Same arithmetic, different job: a reported number does not need a slope, it needs to mean something to a person.`,
    },
    {
      type: 'intuition',
      title: 'RMSE and MAE: two averages of the same five errors',
      md: `**MAE**, mean absolute error, is the plain answer: drop the plus and minus signs, then average. (2 + 2 + 3 + 2 + 12) / 5 = 21 / 5 = **4.2 units**. Sentence for a meeting: "on a typical day we are off by about 4 units."

**MSE**, mean squared error, squares each error first: (4 + 4 + 9 + 4 + 144) / 5 = 165 / 5 = **33**. That 33 is in *units squared*, which nobody can picture. So take the square root: **RMSE = 5.745 units**. RMSE stands for root mean squared error, and the root exists only to put the number back into units you can say out loud.

Two facts follow from the squaring, and both matter.

- The 12-unit miss contributed 144 out of the 165 total, so **87 percent of MSE comes from one day out of five**. Under MAE that same day contributes 12 out of 21, which is 57 percent. Squaring makes big misses dominate.
- RMSE is therefore always at least as large as MAE. They are equal only if every error has exactly the same size, which never happens with real data.`,
    },
    {
      type: 'intuition',
      title: 'The RMSE-to-MAE ratio is a free diagnostic',
      md: `Because RMSE is pulled up by big errors and MAE is not, the gap between them tells you how the error is spread out. You get it for free, from two numbers you were reporting anyway.

- Here: 5.745 / 4.2 = **1.37**.
- Ratio close to **1.0** means every day is about equally wrong. The model is evenly mediocre, and improving it means improving everything.
- Ratio around **1.5 to 2.0** is the normal spread: some rows are harder than others.
- Ratio above about **2** means a handful of rows own your error. Stop tuning settings and go read those rows - they are usually a distinct situation the model never saw, not random noise.

So report both numbers, not one. "RMSE 5.7, MAE 4.2" says more than either alone.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'RMSE and MAE with two running totals and one loop',
      code: `y    = [10, 20, 30, 40, 50]
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
# RMSE / MAE = 1.37`,
      annotations: {
        1: 'The five true values, as a plain Python list of whole numbers.',
        2: 'The five predictions, in the same order, so pred[3] and y[3] describe the same day.',
        4: 'A running total for the squared errors. Written 0.0 rather than 0 to make clear it will hold decimals.',
        5: 'A second running total, for the absolute errors. Two totals from one pass over the data.',
        6: 'len(y) is 5, so range(len(y)) hands out i = 0, 1, 2, 3, 4 - the five positions in both lists.',
        7: 'Prediction minus truth for day i. Positive means the model guessed too high, negative too low.',
        8: 'error * error squares it. Squaring throws away the sign and makes a 12 count 36 times as much as a 2.',
        9: 'abs(error) is the built-in absolute value: it drops the sign and changes nothing else. Here a 12 counts 6 times as much as a 2.',
        11: 'Divide the squared total by 5 to get the mean squared error: 165 / 5 = 33, in units squared.',
        12: '** 0.5 raises to the power one half, which is the square root. This is the R in RMSE, and it puts the number back into units.',
        13: 'Divide the absolute total by 5 to get the mean absolute error: 21 / 5 = 4.2.',
        14: 'round(x, 3) cuts a float to three decimal places, so 5.744562646538029 prints as 5.745.',
        15: 'The ratio, printed on purpose. 1.37 means the errors are moderately concentrated - the 12-unit day is doing extra work.',
      },
    },
    {
      type: 'intuition',
      title: 'R-squared: how much better are you than the laziest possible model?',
      md: `RMSE is 5.745. Is that good? You cannot say, because it depends on the problem. Off by 5.7 units on a 50-unit day is respectable; off by 5.7 rupees on a 6-rupee item is a disaster. RMSE carries the units of the target, so it is not comparable across problems.

The fix is to compare yourself against a fixed opponent that is always available: the **mean model**. Ignore every input and predict the average of the true values for each row. Here the average of 10, 20, 30, 40, 50 is 30, so the mean model answers 30 five times. It is free, honest, and knows nothing.

- **SS_res** (residual sum of squares) is the total squared error *you* make: 4 + 4 + 9 + 4 + 144 = **165**.
- **SS_tot** (total sum of squares) is the total squared error the *mean model* makes: 400 + 100 + 0 + 100 + 400 = **1000**.
- **R-squared = 1 - SS_res / SS_tot** = 1 - 165/1000 = **0.835**.

In words: the mean model wastes 1000 units of squared error, you waste 165, so you removed **83.5 percent** of the error the lazy model left behind. That is what the phrase "explained variance" means - SS_tot is the target's total spread around its own average, and R-squared is the share of that spread your predictions account for. Being a ratio of two errors, the units cancel, so R-squared is comparable across problems in a way RMSE is not.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'R-squared from two sums, same five rows',
      code: `y    = [10, 20, 30, 40, 50]
pred = [12, 18, 33, 38, 62]

mean_y = sum(y) / len(y)
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
# R2 = 0.835`,
      annotations: {
        1: 'The same five true values as before.',
        2: 'The same five predictions, so the R-squared below describes the exact model we already scored.',
        4: 'sum(y) adds the list up and len(y) counts it, so this is the average: 150 / 5 = 30.0. This one number IS the mean model.',
        5: 'Running total of our own squared errors.',
        6: 'Running total of the mean model\'s squared errors. Two competitors, two totals.',
        7: 'One pass over the five positions, exactly as in the previous snippet.',
        8: 'Our error on day i, squared, added on. ** 2 means raise to the power 2.',
        9: 'The mean model\'s error on the same day: truth minus 30, squared. Note it never looks at pred - the baseline ignores the model entirely.',
        11: 'Prints 30.0, confirming what the mean model predicts.',
        12: 'Prints 165.0 and 1000.0 - the two numbers added up by hand above.',
        13: '1 minus the ratio. 165/1000 is the fraction of the baseline error we failed to remove, so 1 minus it is the fraction we did remove: 0.835.',
      },
    },
    {
      type: 'math',
      intro: 'The three formulas so far, in symbols. n is the number of rows, y is the true value for row i, y-hat is the prediction, and y-bar is the average of all the true values.',
      latex: [
        '\\text{MAE} = \\frac{1}{n}\\sum_{i=1}^{n}\\left|\\hat{y}_i - y_i\\right| = \\frac{21}{5} = 4.2 \\qquad \\text{RMSE} = \\sqrt{\\frac{1}{n}\\sum_{i=1}^{n}(\\hat{y}_i - y_i)^2} = \\sqrt{33} = 5.745',
        'R^2 = 1 - \\frac{SS_{res}}{SS_{tot}} = 1 - \\frac{\\sum_i (y_i - \\hat{y}_i)^2}{\\sum_i (y_i - \\bar{y})^2} = 1 - \\frac{165}{1000} = 0.835',
        'R^2 = 1 \\text{ perfect} \\qquad R^2 = 0 \\text{ exactly as good as predicting } \\bar{y} \\qquad R^2 < 0 \\text{ worse than predicting } \\bar{y}',
      ],
    },
    {
      type: 'note',
      md: `Two readings that get misquoted constantly. **R-squared = 0 does not mean "no signal"** - it means your squared error exactly equals the mean model's squared error. **R-squared below 0 is not a bug**: it means SS_res is bigger than SS_tot, so your model is worse than a constant. That cannot happen on the data a linear model was fitted on, but on fresh held-out data it happens all the time, and it is a loud alarm. Check whether a scaler or encoder was fitted on the wrong split, or whether the new data simply looks different from the training data.`,
    },
    {
      type: 'intuition',
      title: 'R-squared depends on the test set, not only on the model',
      md: `Look at the denominator once more. SS_tot is computed from the true values of whichever rows you evaluated on. Freeze the model, change the rows, and R-squared changes.

- Suppose your predictions are off by the same amounts on two different test sets, so SS_res = 200 on both.
- Test set A holds flats renting from 8,000 to 80,000 rupees. Wide spread, so SS_tot is large - say 4,000. R-squared = 1 - 200/4000 = **0.95**.
- Test set B holds only flats renting from 18,000 to 24,000. Narrow spread, so SS_tot is small - say 500. R-squared = 1 - 200/500 = **0.60**.
- Same model, same errors, same RMSE. Only the opponent changed: when the target barely moves, the mean is already a good answer, and beating it is harder.

Three rules fall out. Never compare R-squared across two different test sets. Be suspicious of R-squared computed on very few rows. And always print RMSE beside it, so a reader can see whether the errors actually changed.`,
    },
    {
      type: 'intuition',
      title: 'Adjusted R-squared: why raw R-squared cannot choose features',
      md: `Now a specific defect, and the patch built for it. Suppose you fit a linear model on some input columns, then add one more column - the number of letters in the customer's name, or literally a column of random numbers - and refit. What happens to R-squared measured on the same rows you fitted on?

- It **cannot go down**. The fitting procedure could always set the new column's weight to exactly zero and reproduce the old predictions, so the old R-squared is a floor.
- It essentially always goes **up a little**, because on a finite sample even a random column lines up with the leftover error slightly by luck, and the fit takes that free gain.
- So "we added features and R-squared improved" is not evidence of anything. It is arithmetic.

**Adjusted R-squared** exists exactly to fix this. It charges rent for each input column. Write n for the number of rows and p for the number of input columns the model was fitted on. Then adjusted R-squared = 1 - (1 - R-squared) x (n - 1) / (n - p - 1).

The factor (n-1)/(n-p-1) is always at least 1 and grows as p grows, so it inflates the leftover-error fraction (1 - R-squared) before it is subtracted. A column that genuinely helps raises R-squared by more than the penalty costs, so adjusted R-squared rises. A useless column raises R-squared by less than the penalty, so adjusted R-squared **falls**. That fall is the selection signal you wanted.

Because p is a count of fitted parameters, adjusted R-squared can only be quoted when you can honestly name p. The snippet below fits real models, so p there is real: 2, then 5.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Fit twice: two real columns, then the same two plus three columns of pure noise',
      code: `import numpy as np
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
# +3 noise p = 5 R2 = 0.6788 adjR2 = 0.6119`,
      annotations: {
        1: 'numpy is a library for tables of numbers. "as np" gives it the short name np, which is the universal convention.',
        2: 'LinearRegression is the standard least-squares fitter: give it input columns and true values, it finds the best weights.',
        3: 'r2_score computes exactly the 1 - SS_res/SS_tot you wrote by hand two snippets ago.',
        5: 'A random-number generator seeded with 0, so this file prints the same numbers on every machine, forever.',
        6: 'Thirty rows. Deliberately small, so the parameter penalty is visible.',
        7: 'A table of 30 rows and 2 columns of random numbers. These are the two genuine input features.',
        8: 'Build the true values FROM those two columns, plus random wobble. X[:, 0] means "every row, column 0" - the colon is numpy for "all of them". So y really does depend on both columns.',
        9: 'Three more columns of random numbers, drawn separately and never used to build y. There is nothing here to learn.',
        11: 'Loop over two experiments. Each list item is a pair (label, columns), and "for tag, cols in" unpacks the pair into two names at once. np.hstack glues tables side by side, giving 5 columns.',
        12: '.shape is (rows, columns), so .shape[1] is the number of columns - the real, honest p for this fit.',
        13: 'Create a fresh model and fit it: find the weights that minimise squared error on these columns.',
        14: 'Score the fitted model on the SAME rows it was fitted on. In-sample R-squared is the quantity that cannot decrease when a column is added.',
        15: 'The adjusted formula, written out. A bigger p makes n - p - 1 smaller, which makes the whole factor bigger.',
        16: '%.4f inside a string is a placeholder meaning "put a number here with 4 decimal places", and the % after the string supplies it. Result: R-squared went UP by 0.033 on pure noise, adjusted R-squared went DOWN by 0.008.',
      },
    },
    {
      type: 'note',
      md: `That is the whole argument in two printed lines. Selecting features on R-squared would keep all three noise columns. Adjusted R-squared charged more rent than the noise paid, so it correctly rejected them. One caveat to carry: adjusted R-squared is arithmetic on n and p only, so you can compute it whenever you can count fitted parameters - and for a model like a gradient-boosted forest, you cannot. There the honest tool is error measured on held-out rows, which punishes noise automatically with no penalty formula at all.`,
    },
    {
      type: 'intuition',
      title: 'MAPE: the percentage the business asks for by name',
      md: `Sooner or later someone says "just tell me the percentage error". The metric they mean is **MAPE - mean absolute percentage error**. For each row, take the size of the error, divide by the size of the true value, and average those fractions.

On our five sales days: 2/10, 2/20, 3/30, 2/40, 12/50 = 20%, 10%, 10%, 5%, 24%, averaging to **13.8%**.

It is genuinely appealing. It is unitless, so it travels across problems, and it treats a 10-rupee miss on a 100-rupee item as equal to a 1,000-rupee miss on a 10,000-rupee item, which is often the right business framing.

It also has two failures that are easy to walk into. Both are visible in printed numbers rather than arguments, and the next two sections show each one.`,
    },
    {
      type: 'intuition',
      title: 'MAPE failure 1: it divides by the actual, so small actuals detonate it',
      md: `Three rows. Two normal days with an actual of 100, and one slow day where only 2 units sold.

- Row 1: actual 100, predicted 110. Error 10, so 10/100 = **10%**.
- Row 2: actual 100, predicted 90. Error 10, so 10/100 = **10%**.
- Row 3: actual 2, predicted 9. Error 7 - genuinely tiny in units - but 7/2 = **350%**.
- MAPE = (10 + 10 + 350) / 3 = **123.3%**.

The model's worst mistake was 10 units and MAPE reported 123 percent. Worse, if any actual is exactly 0 then MAPE is not large, it is undefined, because you cannot divide by zero. In demand forecasting, low-volume products sit at 0, 1 or 2 units every single day, so this is the normal case, not an edge case.

**WAPE** - weighted absolute percentage error - is the standard repair. Instead of averaging per-row ratios, add all the errors, add all the actuals, and divide **once at the end**: (10 + 10 + 7) / (100 + 100 + 2) = 27/202 = **13.4%**. No row ever divides by its own tiny actual, so no row can detonate the score. And notice what WAPE really is: total error over total actual is the same thing as MAE divided by the average actual. It is MAE rescaled into a percentage, which is exactly why it behaves.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'MAPE versus WAPE on the same three rows',
      code: `y    = [100.0, 100.0, 2.0]
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
# WAPE % 13.4`,
      annotations: {
        1: 'Three true values. The 2.0 is the slow day that breaks MAPE.',
        2: 'Three predictions. The errors are 10, 10 and 7 units - all small.',
        4: 'Running total of the per-row percentage errors, for MAPE.',
        5: 'Running total of the raw error sizes, for the top of the WAPE fraction.',
        6: 'Running total of the actuals, for the bottom of the WAPE fraction.',
        7: 'One pass over the three rows.',
        8: 'The size of this row\'s error, sign dropped.',
        9: 'Divide by this row\'s own actual and add it on. THIS is the line that explodes: on row 3 it adds 7/2 = 3.5 all by itself.',
        10: 'WAPE adds the error itself, undivided.',
        11: 'WAPE adds the actual separately, so the division happens once, later.',
        12: 'Print the row and its own percentage error, so you can watch 350.0 appear.',
        14: 'MAPE: average the three ratios, times 100 to read as a percentage. 123.3.',
        15: 'WAPE: divide the two totals, times 100. 13.4 - which is an honest description of three misses of 10, 10 and 7 units.',
      },
    },
    {
      type: 'intuition',
      title: 'MAPE failure 2: it punishes over-prediction and under-prediction differently',
      md: `Hold the truth fixed at 100 and slide the prediction. The percentage error is the size of (prediction - 100), divided by 100.

- Predict 50, you are 50 low: **50%**. Predict 150, you are 50 high: **50%**. So far it looks even-handed.
- Predict **0**. That is as wrong as an under-prediction can physically be, since a count cannot go below nothing. The charge is 100/100 = **100%**.
- Predict **200**: also **100%**. Predict **400**: **300%**. Predict 1000: 900%.

There is the asymmetry, in numbers. Under-prediction is **capped at 100%** no matter how badly you undershoot. Over-prediction has **no ceiling at all**. So if anyone tunes a forecast to minimise MAPE, shading every prediction downward is a cheap win: it moves error into the half of the scale where the penalty is bounded. The result is a model that systematically forecasts low, and a warehouse that systematically runs out of stock.

**sMAPE** - "symmetric" MAPE - is the usual first patch. It divides by the average of the actual and the prediction, that is (size of actual + size of prediction) / 2, instead of by the actual alone. That gives it a ceiling of 200% and softens the near-zero blow-up. Read the printed column below before trusting the name, though: predicting 150 is charged 40% while predicting 50 is charged 66.7%, so sMAPE is not actually symmetric either. It is a patch, not a fix.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The truth is 100. Slide the prediction and print both percentages.',
      code: `truth = 100.0
for pred in [0.0, 50.0, 100.0, 150.0, 200.0, 400.0]:
    ape = abs(pred - truth) / truth
    smape = abs(pred - truth) / ((truth + pred) / 2)
    print('pred', pred, ' APE%', round(100 * ape, 1), ' sAPE%', round(100 * smape, 1))

# ---- real output ----
# pred 0.0  APE% 100.0  sAPE% 200.0
# pred 50.0  APE% 50.0  sAPE% 66.7
# pred 100.0  APE% 0.0  sAPE% 0.0
# pred 150.0  APE% 50.0  sAPE% 40.0
# pred 200.0  APE% 100.0  sAPE% 66.7
# pred 400.0  APE% 300.0  sAPE% 120.0`,
      annotations: {
        1: 'One fixed true value, so every row below differs only in the prediction.',
        2: 'Six predictions to try: two far below, one exact, three above. The loop variable is the prediction itself, not an index.',
        3: 'The MAPE ingredient for this row: error size divided by the actual, which is always 100 here.',
        4: 'The sMAPE ingredient: the same error size divided by the average of actual and prediction. A bigger prediction means a bigger denominator, which is where sMAPE\'s ceiling comes from.',
        5: 'Print both. Read the APE column first: 0 and 200 both cost 100%, but 400 costs 300% - under-prediction stops at 100, over-prediction keeps climbing. Then read sAPE: 50 costs 66.7 while 150 costs 40.0, so the word "symmetric" is not accurate.',
      },
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One set of predictions, scored three ways',
        notice: 'Five days, five errors, three metrics. Step through and watch WHICH row pays the bill each time - that is the whole difference between RMSE, MAE and R-squared.',
        leftLabel: 'predictions',
        rightLabel: 'what the metric charges',
        frames: [
          {
            note: 'The five days. Four are close, day 5 is a 12-unit miss. No metric applied yet.',
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
              { id: 'e5', value: 'e = +12', label: 'the big miss' },
            ],
          },
          {
            note: 'RMSE squares first. Day 5 contributes 144 of the 165 total - 87 percent of the score from one row out of five. RMSE = sqrt(165/5) = 5.745.',
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
            note: 'MAE takes absolute values instead. The same day now pays 12 of 21 - 57 percent, not 87. MAE = 21/5 = 4.2, and RMSE/MAE = 1.37.',
            stack: [
              { name: 'y=10   yhat=12', to: 'e1' },
              { name: 'y=20   yhat=18', to: 'e2' },
              { name: 'y=30   yhat=33', to: 'e3' },
              { name: 'y=40   yhat=38', to: 'e4' },
              { name: 'y=50   yhat=62', to: 'e5' },
            ],
            heap: [
              { id: 'e1', value: 'abs = 2', label: '10%' },
              { id: 'e2', value: 'abs = 2', label: '10%' },
              { id: 'e3', value: 'abs = 3', label: '14%' },
              { id: 'e4', value: 'abs = 2', label: '10%' },
              { id: 'e5', value: 'abs = 12', label: '57% of the bill' },
            ],
          },
          {
            note: 'R-squared divides our squared error by the mean model\'s squared error. Predicting 30 every day costs 1000; we cost 165. R-squared = 1 - 165/1000 = 0.835.',
            stack: [
              { name: 'our SS_res', to: 'res' },
              { name: 'mean model SS_tot', to: 'tot' },
              { name: 'R2 = 1 - 165/1000', value: '0.835' },
            ],
            heap: [
              { id: 'res', value: '165', label: 'we pay' },
              { id: 'tot', value: '1000', label: 'baseline pays' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Worked case: six days, every metric by hand',
      md: `A bakery forecasts loaves sold. Six days of truth and prediction, computed with a calculator and nothing else.

- Truth: **10, 20, 30, 40, 50, 60**. Predictions: **12, 18, 34, 38, 55, 63**.
- Errors (prediction minus truth): **+2, -2, +4, -2, +5, +3**. Sizes 2, 2, 4, 2, 5, 3, adding to **18**.
- **MAE** = 18 / 6 = **3.0 loaves**.
- Squares 4, 4, 16, 4, 25, 9 add to **62**. MSE = 62/6 = 10.333, so **RMSE = 3.214 loaves**.
- **RMSE / MAE** = 3.214 / 3.0 = **1.07**. Very close to 1, so the error is spread evenly across all six days. There is no single bad row to go and read; improving this model means improving everything.
- **R-squared.** Mean of the truths = 210/6 = 35. Squared distances from 35 are 625, 225, 25, 25, 225, 625, adding to SS_tot = **1750**. SS_res is the 62 from above. R-squared = 1 - 62/1750 = **0.9646**.
- **MAPE.** Per row: 2/10 = 20%, 2/20 = 10%, 4/30 = 13.3%, 2/40 = 5%, 5/50 = 10%, 3/60 = 5%. Average = 63.3/6 = **10.6%**.
- **WAPE** = 18 / 210 = **8.6%**.

What to say out loud: "we are off by about 3 loaves a day, which is 8.6 percent of typical volume; the errors are even, with no bad day carrying the score; and against a bakery that just baked the average every day, we cut squared error by 96 percent." MAPE 10.6% and WAPE 8.6% differ only mildly here, because no actual is near zero. That gap is the thing to watch - when it grows, a small actual is doing the damage.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: a wonderful R-squared for a model that knows nothing',
      md: `A health startup predicts daily admissions. Its test set has six rows, three from a large city hospital and three from a small rural clinic. The model is trivial: it predicts each site's historical average and ignores the day entirely. The team reports **R-squared = 0.9968** and everyone applauds.

- City hospital truths: **200, 210, 220**. The model predicts 210 for all three. Errors -10, 0, +10.
- Rural clinic truths: **4, 6, 5**. The model predicts 5 for all three. Errors +1, -1, 0.
- SS_res = 100 + 0 + 100 + 1 + 1 + 0 = **202**.
- The overall mean of all six truths is 645/6 = **107.5**. Distances from 107.5 are 92.5, 102.5, 112.5, -103.5, -101.5, -102.5; squared and added, SS_tot = **63,239.5**.
- R-squared = 1 - 202/63239.5 = **0.9968**.

Now diagnose it. That 63,239.5 is almost entirely the gap between a 200-admission hospital and a 5-admission clinic. The mean model has to answer 107.5 everywhere, which is absurd at both sites, so it racks up an enormous SS_tot. Beating it only requires knowing **which site the row came from** - and the model does exactly that and nothing more.

The honest test is R-squared computed **within** each site. At the city hospital the truths are 200, 210, 220 and the model predicts their average, 210, which is precisely the mean model for that site. SS_res equals SS_tot there, so within-site R-squared is exactly **0.000**. Same at the clinic. The model has zero day-to-day predictive power and a headline of 0.9968.

- The same trap sits in the percentage column. The city hospital's MAPE is (10/200 + 0 + 10/220)/3 = **3.2%**, which sounds superb - but only because the actuals are around 200. That identical 10-admission error at the clinic would be a 200% row.
- The rule: when a test set mixes groups of wildly different scale, R-squared measures your ability to tell the groups apart, and MAPE measures how large the actuals happen to be. Neither is measuring the model.
- The fix costs one line. Compute the metric **within each group**, and compute the same metric for that group's mean model. If the two match, you have built nothing.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Do these on paper before reading the solutions. All the arithmetic is small on purpose.

1. Truths **4, 8, 12, 16**; predictions **5, 7, 14, 15**. Compute MAE, RMSE, the RMSE/MAE ratio, and R-squared.
2. Same numbers as problem 1. Compute MAPE and WAPE. Which is larger, and why?
3. A model fitted on n = 20 rows with p = 4 input columns scores R-squared = 0.75. Compute adjusted R-squared. Then recompute it for the same R-squared with p = 15 columns, and say what the second answer means.
4. The truth is 50. What is the largest absolute percentage error an under-prediction can produce? What prediction would produce an APE of 400 percent? What does the pair of answers tell you?
5. A frozen model produces SS_res = 200 on two different test sets. Set A has SS_tot = 4000, set B has SS_tot = 500. Give both R-squared values and say which model is better.`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `Check each step against your own working, not just the final number.

1. Errors are +1, -1, +2, -1. Sizes add to 5, so **MAE = 5/4 = 1.25**. Squares are 1, 1, 4, 1, adding to 7, so MSE = 7/4 = 1.75 and **RMSE = 1.323**. Ratio = 1.323/1.25 = **1.06**, so the errors are almost uniform. Mean of the truths = 40/4 = 10; squared distances from 10 are 36, 4, 4, 36, so SS_tot = 80. **R-squared = 1 - 7/80 = 0.9125**.
2. Per-row percentages: 1/4 = 25%, 1/8 = 12.5%, 2/12 = 16.7%, 1/16 = 6.25%. Average = 60.4/4 = **MAPE 15.1%**. WAPE = total error over total actual = 5/40 = **12.5%**. MAPE is larger because it gives every row an equal vote and the smallest actual (4) carries the largest percentage; WAPE effectively weights each row by its actual, so the small row counts less.
3. The factor is (n-1)/(n-p-1) = 19/15 = 1.267, so adjusted = 1 - 0.25 x 1.267 = **0.6833**. With p = 15 the factor is 19/4 = 4.75, so adjusted = 1 - 0.25 x 4.75 = **-0.1875**. A negative adjusted R-squared is the formula shouting that 15 parameters on 20 rows is fitting noise: whatever fit you achieved is not worth the parameters it took.
4. The largest under-prediction error is being 50 too low, which means predicting 0, giving 50/50 = **100%**. For 400% you need an error of 200 on an actual of 50, so the prediction is 50 + 200 = **250**. The pair is the asymmetry: all of under-prediction lives inside 0 to 100 percent, while over-prediction runs off without limit. Any tuning that minimises MAPE will therefore drift low.
5. Set A: 1 - 200/4000 = **0.95**. Set B: 1 - 200/500 = **0.60**. Neither is better, because it is the same model with the same errors - only SS_tot changed. This is why R-squared must never be compared across test sets, and why RMSE belongs beside it: RMSE would have been identical on both.`,
    },
    {
      type: 'intuition',
      title: 'Choosing which number to report',
      md: `Do not ask which metric is best. Ask what decision this number drives, and what each kind of mistake costs.

- **Big misses hurt much more than small ones** (stock levels, capacity, pricing) - report **RMSE**, with MAE next to it so the concentration is visible.
- **A miss is a miss, cost grows in proportion** (delivery-time error, robust baselines) - report **MAE**.
- **The audience genuinely thinks in percentages** - report **WAPE**, and say what it is: total error divided by total actual, which is MAE over the average actual. Avoid raw MAPE unless every actual is comfortably far from zero.
- **Comparing across different problems, or writing for a statistics-literate reader** - **R-squared**, always with an RMSE beside it, and never compared across test sets.
- **Comparing linear models with different column counts** - **adjusted R-squared**, or better, error measured on held-out rows.

And one habit that outranks all of them: **compute the same metric for the dumb model and print it next to yours.** Predict the mean for every row, or the last known value for a time series. "RMSE 3.21" is unfalsifiable. "RMSE 3.21 against a mean model's 17.1" is a claim.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands alone. This section names ideas you will meet later, so the words are not new when you get there.

- **MASE**, mean absolute scaled error. For data ordered in time, it is MAE divided by the MAE of the naive forecast that just repeats yesterday's value. MASE below 1 literally means "better than repeating yesterday", so the baseline is welded into the number. It is the best default for time series, and many real forecasting models quietly fail it.
- **Adjusted R-squared can go negative** even when R-squared is comfortably positive, as problem 3 showed. That is not a defect - it is the formula reporting that p is too large for n.
- **Comparing a model trained on log values with one trained on raw values.** Their metrics are not comparable at all. Convert the log model's predictions back to raw units first, and beware that undoing a log by exponentiating pulls the result below the true average, so the back-transformed model under-predicts unless corrected.
- **When you need a range, not a point.** "What is the 90th-percentile delivery time?" is not a question any metric here answers. That needs quantile or pinball loss, covered in *Regression Losses*.
- **Where the RMSE-versus-MAE choice really comes from.** Minimising squared error drives predictions toward the conditional mean; minimising absolute error drives them toward the conditional median. On a skewed target those are different numbers, and which one you want is a business decision, not a statistical one.`,
    },
  ],
  quiz: [
    {
      question: 'You report RMSE = 40 and MAE = 11 on the same predictions. What should you do next?',
      options: [
        { text: 'Nothing - RMSE is always larger, so this is normal', explanation: 'RMSE is always at least MAE, true. But a ratio of 3.6 is far outside the usual 1 to 2 band, and that is specific information.' },
        {
          text: 'Go and read the worst-scoring rows, because a few of them are dominating the error',
          explanation: 'Correct. The ratio measures how concentrated the error is. Above about 2, a handful of rows own the metric, and they are usually a distinct situation rather than noise.',
        },
        { text: 'Switch to MAE so the two numbers agree', explanation: 'That hides the symptom. The gap between the two numbers was the only free diagnostic you had.' },
      ],
      correct: 1,
    },
    {
      question: 'Your model scores R-squared = -0.12 on held-out data. What does that mean?',
      options: [
        { text: 'A calculation bug, since R-squared cannot be negative', explanation: 'It can, on any rows the model was not fitted on. Only the in-sample linear-fit case is guaranteed non-negative.' },
        { text: 'The model explains 12 percent of the variance in the negative direction', explanation: 'Not a real reading. R-squared is 1 minus an error ratio, and a ratio above 1 simply pushes it below zero.' },
        {
          text: 'Your squared error is larger than the error of just predicting the average of the true values',
          explanation: 'Correct: SS_res is bigger than SS_tot. Check for a transform fitted on the wrong split, or new data that looks unlike the training data.',
        },
      ],
      correct: 2,
    },
    {
      question: 'You add a column of random numbers to a linear model and refit. What happens to R-squared measured on the fitting data?',
      options: [
        {
          text: 'It rises slightly, because R-squared can never decrease when a column is added',
          explanation: 'Correct. Setting the new weight to zero reproduces the old fit, so that is a floor, and chance alignment with the leftover error pushes it a little above the floor.',
        },
        { text: 'It stays identical, since the column carries no information', explanation: 'Only if the fitted weight came out exactly zero. On a finite sample the random column always lines up with the leftover error a little.' },
        { text: 'It falls, because the model wastes capacity on noise', explanation: 'That is what adjusted R-squared does. Raw R-squared has no notion of how many columns you used.' },
      ],
      correct: 0,
    },
    {
      question: 'The truth is 100. Model A predicts 0, model B predicts 200. What does MAPE charge each, and what is the lesson?',
      options: [
        { text: 'A gets 100 percent, B gets 50 percent', explanation: 'B is off by 100 on an actual of 100, which is 100 percent. The denominator is always the actual.' },
        { text: 'A gets 0 percent, B gets 100 percent', explanation: 'A is off by the full 100, so it is charged 100 percent. Predicting zero is not free.' },
        {
          text: 'Both get 100 percent - and that is the asymmetry, because A is as wrong as under-prediction can get while B can keep getting worse',
          explanation: 'Correct. Under-prediction saturates at 100 percent; over-prediction is unbounded, since predicting 400 costs 300 percent. That ceiling is why MAPE-tuned forecasts drift low.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Two rows have an actual of 100 and one row has an actual of 2. All three errors are about 10 units. Which percentage metric do you report?',
      options: [
        { text: 'MAPE, because the business asked for a percentage', explanation: 'That is exactly the row that breaks it: an error of 7 on an actual of 2 is a 350 percent row, which drags the average to 123 percent.' },
        {
          text: 'WAPE - total error divided by total actual - because it divides once at the end, so no single small actual can explode it',
          explanation: 'Correct, and it equals MAE divided by the average actual, so it inherits MAE\'s stability while still reading as a percentage.',
        },
        { text: 'sMAPE, because it is symmetric and bounded', explanation: 'Bounded at 200 percent, yes, but not genuinely symmetric: against a truth of 100 it charges 66.7 percent for predicting 50 and only 40 percent for predicting 150.' },
      ],
      correct: 1,
    },
    {
      question: 'A test set mixes a hospital with 200 admissions a day and a clinic with 5. A model that only predicts each site\'s historical average scores R-squared = 0.9968. What is the correct reading?',
      options: [
        {
          text: 'Almost all of SS_tot is the gap between the two sites, so beating the overall mean only requires knowing which site a row came from - within each site R-squared is 0.000',
          explanation: 'Correct. The number measures the ability to tell the groups apart, not day-to-day predictive power. Recompute the metric within each group to see it.',
        },
        { text: 'The model is excellent and should ship', explanation: 'It predicts a constant per site, so it has no day-to-day signal at all. The headline came entirely from the between-site spread.' },
        { text: 'R-squared is broken and should never be used', explanation: 'Too strong. R-squared did exactly what it says; the mistake was computing it on a test set that mixes wildly different scales.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain R-squared to a product manager, then to me.',
      answer:
        'To the PM: if we had no model, the best guess for every row would be the overall average. R-squared of 0.75 means we wipe out three quarters of the error that guessing the average would have made. To you: R-squared is 1 minus SS_res over SS_tot, where SS_tot is the squared error of the mean predictor, so it is a normalised comparison against a fixed baseline. Being a ratio of two errors it is unitless, and therefore portable across problems in a way RMSE is not. The cost of that portability is that the denominator is the evaluation set\'s own spread, so R-squared is a property of the model and the test set together. Same model, narrower test set, lower score. That is why I always print RMSE beside it.',
      isCaseBased: false,
    },
    {
      question: 'Why can R-squared not be used to choose features, and what does adjusted R-squared change?',
      answer:
        'Adding a column can never reduce in-sample R-squared, because the fit can always set the new weight to zero and reproduce the old predictions, so the old value is a floor. On a finite sample the new column lines up with the leftover error by luck, so R-squared actually rises even for pure noise. I ran it on 30 rows: three random columns moved R-squared from 0.6458 to 0.6788. Adjusted R-squared multiplies the unexplained fraction by (n-1)/(n-p-1), which grows with p, so a column must earn more than its rent. On the same data it fell from 0.6195 to 0.6119, which is the signal you wanted. In practice I would still select on held-out error, since that needs no penalty formula and works for models where p is not even defined.',
      isCaseBased: false,
    },
    {
      question: 'When do you report RMSE and when MAE? Do not say it depends.',
      answer:
        'RMSE when large errors cost disproportionately more than small ones, which is the usual case for stock levels, capacity and pricing, where one huge miss costs far more than several small ones - the squaring encodes exactly that. MAE when a miss is a miss and cost grows in proportion, such as delivery-time error, and when the data has genuine outliers you do not want dominating the score. Underneath, squared error drives predictions toward the conditional mean and absolute error toward the conditional median, which settles the choice on a skewed target. My real practice is to report both, because their ratio is a free diagnostic: near 1 the errors are uniform, above about 2 a few rows own the metric and I go read those rows before touching a setting.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through everything wrong with MAPE, and what you would use instead.',
      answer:
        'Two defects, both showable in numbers. First, it divides by the actual, so it is undefined at zero and explodes near it. On three rows with errors of 10, 10 and 7 units, where one actual was 2, MAPE reports 123.3 percent while WAPE reports 13.4 percent on the identical predictions. Second, it is asymmetric: with a truth of 100, predicting 0 costs 100 percent and predicting 200 also costs 100 percent, but predicting 400 costs 300 percent. Under-prediction is capped at 100 percent while over-prediction is unbounded, so anything tuned on MAPE drifts low and the warehouse runs short. What I use instead is WAPE, which is total error over total actual and is just MAE rescaled by the average actual; and for time series MASE, which divides by the naive forecast\'s error so that below 1 means better than repeating yesterday.',
      isCaseBased: false,
    },
    {
      question: 'Case: a vendor pitches a demand-forecasting model reporting R-squared 0.93 and MAPE 8 percent. What do you ask before believing it?',
      answer:
        'Four questions, in order of how cheaply they can kill the claim. First, what was the spread of the evaluation set. R-squared is inflated by a wide-spread sample, so if they scored high-volume and low-volume products together, 0.93 may only mean the model can tell a product selling 10,000 from one selling 3. I would ask for R-squared computed within each volume band, and for the score of a model that just predicts each band\'s average - if those two match, the model has no within-band signal at all. Second, which rows entered the MAPE. An 8 percent MAPE with any near-zero actuals present is arithmetically implausible, so they have almost certainly filtered out the low-volume products, which are exactly the ones that cause stockouts. I would ask for WAPE on the unfiltered set. Third, what is the baseline: give me MASE, or MAE against last-week-repeated, because in retail the seasonal naive forecast is strong and many vendor models do not beat it. Fourth, was the split made by time. A random split on time-ordered data lets the model see the future and produces exactly these numbers. The summary point is that R-squared and MAPE are the two most inflatable numbers in the list, and they chose to lead with both.',
      isCaseBased: true,
    },
    {
      question: 'Your model gets R-squared 0.42 on the test set. Is that good?',
      answer:
        'Unanswerable as stated, and saying so is the point. It depends on how much irreducible noise the target has, since 0.42 predicting next-quarter revenue is excellent while 0.42 predicting a physical measurement means something is broken. It depends on the test set\'s spread, because a narrow target depresses R-squared with no change in the predictions at all. And it depends on what the alternative is: R-squared compares against the mean predictor, which is a very weak opponent and almost never what you are replacing. The number I would actually want is a small table on one identical test set - the mean baseline, whatever is in production today, and the new model - each with both R-squared and RMSE so the units survive.',
      isCaseBased: false,
    },
    {
      question: 'Case: a delivery-ETA model shows RMSE 8 minutes, MAE 3 minutes, R-squared 0.61. A PM asks how good it is. What do you say, and what do you do next?',
      answer:
        'What I say: a typical order is off by about 3 minutes, but the errors are lopsided, with a small set of deliveries off by a lot. The finding is the ratio: 8 over 3 is 2.7, and uniform errors would put that near 1.2, so a minority of trips dominate the squared error. What I do next is segment the errors by city, hour, courier, distance and weather to find the segment that owns the tail. It is usually a distinct regime such as a new city or trips above some distance, not random noise, and it often deserves its own feature or its own model. Then I would question the objective itself: for an ETA, being 15 minutes late is far worse than being 15 minutes early, so a symmetric metric is the wrong target and a quantile objective with a P90 promised time fits the actual product decision better. Finally I would report a baseline, such as the RMSE of a simple distance-over-average-speed rule, because R-squared 0.61 against the mean says nothing about beating the rule the ops team already uses.',
      isCaseBased: true,
    },
    {
      question: 'Case: your quarterly report shows R-squared fell from 0.81 to 0.64. The model is unchanged and retraining did not help. What is your investigation order?',
      answer:
        'First and cheapest: the evaluation population\'s spread changed. R-squared is 1 minus SS_res over SS_tot, so a quarter with a narrower target range shrinks SS_tot and drops the score with identical predictions. I check whether RMSE and MAE also moved. If they held steady, that is the whole answer and there is no model problem, only a reporting artefact. Second, if RMSE also rose, it is real degradation, so I split the errors by segment and by week to see whether the loss is broad, which points to the input distribution shifting, or concentrated in a new segment such as a market the model never saw. Third, pipeline damage: a feature silently going null and defaulting to zero, or an encoder meeting unseen categories. Comparing feature-level summary statistics quarter over quarter usually finds this in minutes. Fourth, label quality, since a change in how the target is recorded raises measured error with no model change at all. The habit worth naming afterwards is that a metric with a moving denominator should not be a standalone dashboard number - I would put RMSE and a baseline-relative number beside it so this class of false alarm cannot recur.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'RMSE and MAE on the five-day example', back: 'Errors +2, -2, +3, -2, +12. MAE = 21/5 = 4.2. MSE = 165/5 = 33, so RMSE = 5.745. The root exists only to put the number back into the target\'s units.' },
    { front: 'RMSE over MAE ratio', back: 'RMSE is always at least MAE. Near 1 means uniform errors. 1.5 to 2 is a normal spread. Above about 2 means a few rows own the metric - go read those rows.' },
    { front: 'R-squared in one sentence', back: '1 - SS_res/SS_tot. SS_tot is the squared error of always predicting the average of the true values, so R-squared is the share of that baseline error you removed. Five-day example: 1 - 165/1000 = 0.835.' },
    { front: 'R-squared equal to 0, and below 0', back: 'Zero means exactly as good as predicting the average. Negative means worse than that constant. Impossible in-sample for a linear fit, common on held-out data, and a loud alarm.' },
    { front: 'The R-squared test-set trap', back: 'The denominator is the test set\'s own spread. SS_res 200 against SS_tot 4000 gives 0.95; the same errors against SS_tot 500 give 0.60. Never compare R-squared across test sets.' },
    { front: 'Adjusted R-squared and why it exists', back: 'Raw R-squared can never fall when a column is added, so it cannot select features. Adjusted = 1 - (1-R2)(n-1)/(n-p-1) charges rent per fitted column, so noise columns make it fall: 0.6195 down to 0.6119 in the demo.' },
    { front: 'MAPE\'s two failures', back: 'It divides by the actual, so an actual of 2 with a 7-unit error is a 350 percent row and MAPE reads 123.3 where WAPE reads 13.4. And it is asymmetric: under-prediction caps at 100 percent, over-prediction is unbounded, so MAPE-tuned forecasts drift low.' },
    { front: 'WAPE', back: 'Total absolute error divided by total actual - one division at the end, so no small actual can explode it. Identity: WAPE = MAE divided by the average actual.' },
  ],
  mindmapMarkdown: `- Regression Metrics
  - The five-day example
    - truth 10 20 30 40 50
    - pred 12 18 33 38 62
    - errors +2 -2 +3 -2 +12
  - RMSE and MAE
    - MAE = 21/5 = 4.2, target units
    - MSE = 165/5 = 33, RMSE = 5.745
    - squaring: one row is 87% of MSE, 57% of MAE
    - ratio 1.37; above 2 means a few rows own the error
  - R-squared
    - baseline = always predict the mean (30)
    - SS_res 165 vs SS_tot 1000 gives 0.835
    - unitless, comparable across problems
    - 0 = the mean, below 0 = worse than the mean
    - trap: denominator is the TEST SET's spread
  - Adjusted R-squared
    - raw R2 never falls when a column is added
    - 1 - (1-R2)(n-1)/(n-p-1)
    - real fit: R2 0.6458 to 0.6788, adj 0.6195 to 0.6119
    - only quotable when p is a real fitted count
  - MAPE traps
    - divides by the actual: a 350% row, MAPE 123.3%
    - asymmetric: under capped at 100%, over unbounded
    - so MAPE-tuned models forecast low
  - Fixes
    - WAPE = total error / total actual = MAE / mean(y) = 13.4%
    - sMAPE bounded at 200% but not truly symmetric
  - Classic mistake
    - hospital 200/day and clinic 5/day mixed
    - R2 = 0.9968 from between-site spread alone
    - within-site R2 = 0.000
  - Always print the baseline`,
}

export default m
