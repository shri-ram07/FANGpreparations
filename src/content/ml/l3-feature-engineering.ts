import type { Module } from '../types'

const m: Module = {
  id: 'ml-l3-feature-engineering',
  subjectId: 'ml',
  level: 3,
  title: 'Feature Engineering & Data Leakage',
  whyItMatters:
    'Two things happen in this module. First, you watch the same model, on the same rows, jump from 0.855 to 0.986 because one extra column was added by hand — that is what feature engineering buys you. Second, you watch a score climb to 0.742 on data that contains no signal at all, because one line of code was placed on the wrong side of the split. That second thing is called data leakage, it is the most expensive bug in applied machine learning, and nothing in Python errors when you do it. Both effects are shown with real numbers from real runs, not described.',
  assumes: [
    'You know what a Python list, a dictionary, a for loop and a function are',
    'You know what an average is, and what a square root is',
    'You have met the idea of splitting data into a training part and a test part: you fit the model on one part and score it on the other, because a score measured on rows the model already memorised means nothing',
    'You have seen a model being fitted at least once, for example linear regression. Nothing deeper is assumed. Every other term used here is defined here.',
  ],
  estMinutes: 42,
  sections: [
    {
      type: 'intuition',
      title: 'The same model, the same rows, one extra column',
      md: `Here is a small dataset of 400 houses. For each house we know two things: its **area** in square feet, and how many **rooms** it has. We want to predict its price.

- The prices in this dataset were built with a rule: price is about 4000 rupees for every square foot *per room*, plus some random noise. So a 2000 sq ft house with 4 rooms has 500 sq ft per room, and costs about 4000 x 500 = 2,000,000.
- We fit a linear regression on the two columns we were given, area and rooms, and score it on 120 houses the model never saw. The score is **0.855**.
- Now we add exactly one more column, computed with a division we do ourselves: **area divided by rooms**. No new data. No new houses. No different model. The same linear regression, refitted.
- The score on the same 120 unseen houses becomes **0.986**.

That is the whole subject in one comparison. Linear regression can multiply each column by a number and add the results up. It cannot divide one column by another — that operation is simply not available to it. The information was in the table the whole time, and the model could not reach it until a human wrote the division down as a column.

The score used here is **R-squared**: 1.0 means the predictions match the true prices exactly, 0.0 means the model is no better than always guessing the average price.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 1: the two columns we were given',
      code: `import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split

rng = np.random.default_rng(0)
area = rng.uniform(500, 3000, 400)
rooms = rng.integers(2, 7, 400)
price = 4000 * (area / rooms) + rng.normal(0, 150000, 400)

X = np.column_stack([area, rooms])
Xtr, Xte, ytr, yte = train_test_split(X, price, test_size=0.3, random_state=0)
print(round(LinearRegression().fit(Xtr, ytr).score(Xte, yte), 3))

# ---- real output ----
# 0.855`,
      annotations: {
        1: 'numpy is a library for arrays of numbers. "as np" gives it the short name np, which is what everyone types.',
        2: 'LinearRegression is the model: it fits price = w1*column1 + w2*column2 + ... + b, choosing the w numbers to fit the data best.',
        3: 'train_test_split is the function that cuts the rows into a part to learn from and a part to be scored on.',
        5: 'default_rng(0) makes a random number generator whose 0 is a fixed seed, so this script prints the same numbers on your machine as on mine.',
        6: 'uniform(500, 3000, 400) draws 400 random areas, each equally likely to be anywhere between 500 and 3000 square feet.',
        7: 'integers(2, 7, 400) draws 400 whole numbers from 2 up to 6 (the upper end is excluded). These are the room counts.',
        8: 'This is the rule that generates the true prices. area / rooms divides the two arrays element by element: house 1 area divided by house 1 rooms, and so on. normal(0, 150000, 400) adds 400 random wobbles averaging zero, so the data is not perfectly clean.',
        10: 'column_stack glues the two 400-long arrays side by side into a 400-row, 2-column table. That table is what the model gets to see.',
        11: 'Cuts the 400 rows into 280 training rows and 120 test rows. test_size=0.3 is the 30 percent, and random_state=0 fixes which rows go where so the split is repeatable.',
        12: 'Three things on one line, read left to right: LinearRegression() builds a brand new unfitted model, .fit(Xtr, ytr) trains it on the training rows only, and .score(Xte, yte) computes R-squared on the 120 test rows. Building the model fresh on this line matters: a model instance that has already been fitted elsewhere carries its old numbers.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 2: add one column that we compute ourselves',
      code: `X2 = np.column_stack([area, rooms, area / rooms])
X2tr, X2te, ytr, yte = train_test_split(X2, price, test_size=0.3, random_state=0)
print(round(LinearRegression().fit(X2tr, ytr).score(X2te, yte), 3))

# ---- real output ----
# 0.986`,
      annotations: {
        1: 'The same two columns as before, plus a third one: area divided by rooms, computed for every house. This column is the new information — not new data, just an arithmetic combination the model could not perform itself.',
        2: 'The same split settings and the same random_state, so the very same 120 houses are held out. Only the columns changed, which is what makes the comparison fair.',
        3: 'A fresh LinearRegression again, fitted on the three columns. R-squared on the same unseen houses goes from 0.855 to 0.986.',
      },
    },
    {
      type: 'intuition',
      title: 'The words for what we just did',
      md: `- A **feature** is one column of input that the model gets to see. Area is a feature. Rooms is a feature. Area divided by rooms is now also a feature — we made it.
- **Feature engineering** is the work of turning the raw table you were given into the columns the model can actually use. Creating new columns, rewriting existing ones into a form the model can read, and repairing the broken ones.
- The column we invented has a name too: it is an **interaction feature** — a column built by combining two other columns (here by dividing, but multiplying and subtracting are just as common). Use one when the thing that really drives the answer is a *relationship* between columns rather than either column alone.
- Ratios like price per square foot, clicks per impression, or spend per visit are the most common useful interaction features in real work, because they are the numbers the domain expert already thinks in.

The rest of this module covers the other four jobs: putting numbers on a comparable scale, turning words into numbers, handling gaps, and — the one that gets people fired — not accidentally letting the answer into the input.`,
    },
    {
      type: 'intuition',
      title: 'Scaling: two ways to rewrite a column',
      md: `Here are four salaries: **20000, 35000, 50000, 90000**. Two standard ways to rewrite them.

**Min-max scaling** squashes the column into the range 0 to 1. Take each value, subtract the smallest, divide by (largest minus smallest). The smallest becomes exactly 0, the largest exactly 1. For 35000: (35000 - 20000) / (90000 - 20000) = 15000 / 70000 = **0.214**.

**Standardisation** (also called z-score scaling) rewrites each value as "how many typical distances is it above or below the average". Subtract the mean, divide by the standard deviation. Two words to define first:

- The **mean** is the plain average: (20000 + 35000 + 50000 + 90000) / 4 = **48750**.
- The **standard deviation** is the typical distance of a value from the mean. Compute each gap from the mean, square each gap, average the squares, then take the square root. Here that gives **26070.8**. The squaring is there so that gaps below the mean do not cancel gaps above it.
- So 35000 becomes (35000 - 48750) / 26070.8 = **-0.527**. Negative means below average.

Which to use: standardisation is the default. Min-max is for when you genuinely need every value inside 0 to 1, and it is fragile — a single salary of 10,000,000 in the column would push every other value down near 0.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Both scalings, by hand, no library',
      code: `salary = [20000, 35000, 50000, 90000]
lo = min(salary)
hi = max(salary)
for s in salary:
    print(s, round((s - lo) / (hi - lo), 3))

mean = sum(salary) / len(salary)
var = sum((s - mean) ** 2 for s in salary) / len(salary)
sd = var ** 0.5
print(round(mean, 1), round(sd, 1))
for s in salary:
    print(s, round((s - mean) / sd, 3))

# ---- real output ----
# 20000 0.0
# 35000 0.214
# 50000 0.429
# 90000 1.0
# 48750.0 26070.8
# 20000 -1.103
# 35000 -0.527
# 50000 0.048
# 90000 1.582`,
      annotations: {
        1: 'The four raw salaries, as a plain Python list.',
        2: 'min() returns the smallest item in the list: 20000.',
        3: 'max() returns the largest: 90000.',
        4: 'Walk through the list one salary at a time. s is the current salary.',
        5: 'The min-max formula. Subtract the smallest, divide by the spread. round(x, 3) keeps three decimal places so the output is readable. 20000 lands on 0.0 and 90000 on 1.0, exactly as promised.',
        7: 'The mean: sum of the list divided by how many items it has.',
        8: 'The average squared gap from the mean, called the variance. The part inside sum(...) is a generator expression: it produces (s - mean) ** 2 for each s in turn, and sum adds them up. ** is Python for "to the power of", so ** 2 squares.',
        9: 'Square root undoes the squaring, giving the standard deviation back in rupees. ** 0.5 is the square root.',
        10: 'Prints 48750.0 and 26070.8 — the two numbers the standardisation needs.',
        11: 'Walk the list again, this time to standardise.',
        12: 'The z-score formula: how far above or below the mean, measured in standard deviations. 50000 is barely above average, so it prints 0.048.',
      },
    },
    {
      type: 'intuition',
      title: 'Which models care about scale, and which do not',
      md: `This is usually taught as a list to memorise. It is easier to just see it happen, so the next two snippets run the same data through two models.

The dataset has two columns. Column 1 has been rewritten into rupees, so its values sit around 60000. Column 2 is left alone, so its values sit between roughly -3 and 3. Nothing else about the data changed — the same rows, the same labels.

- **k-nearest neighbours (kNN)** classifies a new row by finding the rows closest to it and copying their answer. "Closest" means adding up the squared differences across all columns. A gap of 5000 rupees in column 1 completely drowns a gap of 2 in column 2, so the model is effectively using one column and ignoring the other.
- A **decision tree** asks yes/no questions of the form "is this column less than or equal to some threshold?" and splits the rows accordingly. It only ever compares values *within one column*, and it only cares about their order, not their size.

So the prediction is: scaling should rescue kNN and do nothing at all to the tree. Watch it.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'A distance-based model: scaling changes the answer',
      code: `import numpy as np
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler

X, y = make_classification(n_samples=600, n_features=2, n_redundant=0, n_informative=2, random_state=7)
X[:, 0] = X[:, 0] * 5000 + 60000
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=0)
print('knn raw   ', round(KNeighborsClassifier().fit(Xtr, ytr).score(Xte, yte), 3))
sc = StandardScaler().fit(Xtr)
print('knn scaled', round(KNeighborsClassifier().fit(sc.transform(Xtr), ytr).score(sc.transform(Xte), yte), 3))

# ---- real output ----
# knn raw    0.811
# knn scaled 0.917`,
      annotations: {
        1: 'numpy again, for the array indexing on line 8.',
        2: 'make_classification builds a synthetic two-class dataset for us, so the whole demonstration runs on any machine with no data file.',
        3: 'The train/test cutter, same as before.',
        4: 'KNeighborsClassifier is the distance-based model. By default it looks at the 5 nearest rows and takes the majority answer.',
        5: 'StandardScaler applies the z-score formula from the previous snippet to every column of a table.',
        7: 'Makes 600 rows with 2 useful columns and 2 classes. random_state=7 fixes the data so the numbers below are reproducible.',
        8: 'X[:, 0] means "every row, column 0" — the colon is numpy for all of them. We multiply that column by 5000 and add 60000, turning it into something that looks like a salary. The information in the column is unchanged; only its units are.',
        9: 'Split into 420 training rows and 180 test rows.',
        10: 'A brand new KNeighborsClassifier, fitted on the raw unscaled table, scored on the test rows: 0.811 accuracy. Accuracy is the fraction of test rows classified correctly.',
        11: 'Fit the scaler on the TRAINING rows only, and remember it in sc. It now holds the mean and standard deviation of each training column. Fitting it on all 600 rows instead would be the leakage bug this module ends with.',
        12: 'Another brand new classifier — not the one from line 10, which is already fitted and would keep its old neighbours. sc.transform applies the stored mean and standard deviation to a table without re-reading it. Accuracy rises to 0.917.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'A tree on the exact same data: scaling changes nothing',
      code: `from sklearn.tree import DecisionTreeClassifier

print('tree raw   ', round(DecisionTreeClassifier(random_state=0).fit(Xtr, ytr).score(Xte, yte), 3))
print('tree scaled', round(DecisionTreeClassifier(random_state=0).fit(sc.transform(Xtr), ytr).score(sc.transform(Xte), yte), 3))

# ---- real output ----
# tree raw    0.878
# tree scaled 0.878`,
      annotations: {
        1: 'The tree model. It reuses Xtr, Xte, ytr, yte and sc from the previous snippet, so run that one first.',
        3: 'A fresh tree on the raw table. random_state=0 fixes its internal tie-breaking so repeated runs agree. Accuracy 0.878.',
        4: 'Another fresh tree on the standardised table. Identical accuracy, 0.878 — not close, the same. Standardising is subtract-then-divide-by-a-positive-number, which never changes the order of the values in a column, and order is all a split threshold uses. Every split available before is still available after, just at a moved threshold.',
      },
    },
    {
      type: 'note',
      md: `**The rule, now that you have seen it.** Ask one question about the model: does it compare magnitudes across different columns?

- **Yes, so scale**: kNN, K-Means and SVM with an RBF kernel, because they measure distances across columns. Linear regression, logistic regression and neural networks, because they are trained by gradient descent and wildly different column sizes make that search crawl. Ridge and Lasso, because their penalty is on the size of each coefficient, and coefficient size depends entirely on the units of the column. PCA, because it hunts for directions of largest variance, and variance is unit-dependent.
- **No, do not bother**: decision trees and everything built from them — Random Forest, XGBoost, LightGBM — because a split only compares values inside one column, in order.`,
    },
    {
      type: 'intuition',
      title: 'Turning words into numbers: three encodings',
      md: `A model can only do arithmetic on numbers. A column holding the words red, green, blue has to be rewritten. There are three common ways, and picking the wrong one silently damages the model.

- **One-hot encoding** replaces the one word column with one 0/1 column per category. A red row becomes is_red=1, is_green=0, is_blue=0. No ordering is implied, which is exactly right for colours, cities and payment methods. Cost: a column with 20,000 pin codes becomes 20,000 columns that are almost entirely zeros — this is called cardinality explosion, and the usual fix is to one-hot the top 20 categories and lump the rest into a single "Other".
- **Ordinal encoding** replaces each word with a single number: red=0, green=1, blue=2. It is correct only when the categories genuinely have an order *and* roughly even spacing — small/medium/large, or a rating from 1 to 5. Using it on colours tells the model that blue is twice green and that green sits exactly halfway between red and blue. Both statements are nonsense, and the next snippet shows what they cost.
- **Target encoding** replaces each category with the average target value for that category. If houses in Pune average 4,200,000 and houses in Nashik average 2,100,000, the city column becomes 4200000 and 2100000. It is compact and handles thousands of categories, and it is the single easiest way to leak the answer into the input. That is the second half of this module.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Ordinal encoding on an unordered column, and what it costs',
      code: `import numpy as np
from sklearn.linear_model import LinearRegression

rng = np.random.default_rng(1)
code = rng.integers(0, 3, 300)
true_price = np.array([100.0, 300.0, 150.0])
y = true_price[code] + rng.normal(0, 10, 300)

ordinal = code.reshape(-1, 1)
print('ordinal R2:', round(LinearRegression().fit(ordinal, y).score(ordinal, y), 3))
onehot = np.column_stack([code == 0, code == 1, code == 2]).astype(float)
print('one-hot R2:', round(LinearRegression().fit(onehot, y).score(onehot, y), 3))
print('ordinal says:', np.round(LinearRegression().fit(ordinal, y).predict(np.array([[0], [1], [2]])), 1))

# ---- real output ----
# ordinal R2: 0.05
# one-hot R2: 0.988
# ordinal says: [156.4 179.3 202.1]`,
      annotations: {
        1: 'numpy, for arrays and the indexing trick on line 7.',
        2: 'Linear regression again, so the two encodings are compared on identical footing.',
        4: 'Fixed seed, so these exact numbers reproduce.',
        5: 'Draws 300 random category codes from 0, 1, 2. Read them as red=0, green=1, blue=2.',
        6: 'The true average price for each colour: red 100, green 300, blue 150. Deliberately not in increasing order, because real categories are not.',
        7: 'true_price[code] is fancy indexing: for each of the 300 codes, numpy looks up that position in true_price, giving a 300-long array of true prices. Then a small random wobble is added.',
        9: 'reshape(-1, 1) turns the flat 300-long array into a 300-row, 1-column table, because sklearn always wants a 2D table of features. The -1 means "work out this dimension yourself".',
        10: 'Fit on the single ordinal column. R-squared is 0.05 — the model explains essentially nothing, even though the colour determines the price almost exactly.',
        11: 'The one-hot version: three true/false columns, one per colour. astype(float) turns True/False into 1.0/0.0, which is what the model needs.',
        12: 'Same model, same information, honest encoding: R-squared 0.988. The gap between 0.05 and 0.988 is the entire cost of the wrong encoding.',
        13: 'Asks the ordinal model what it predicts for red, green and blue. It answers 156.4, 179.3, 202.1 — a straight line, evenly spaced, because a linear model on one column can only produce a straight line. The truth was 100, 300, 150. It could not represent green being the expensive one.',
      },
    },
    {
      type: 'intuition',
      title: 'Binning and the log transform',
      md: `Two more rewrites you will reach for often.

**Binning** replaces a number with the range it falls into. Ages 23, 31, 47 become "20-29", "30-39", "40-49", which is then one-hot encoded. You lose precision on purpose. It is worth doing when the effect is not a straight line — risk might be high for teenagers, low in middle age, high again at 70, and a linear model cannot draw that shape from raw age but can from three bin columns.

**The log transform** fixes right-skew: a column where most values are small and a few are enormous. Take incomes of 20000, 40000, 80000 and 10,000,000. The huge one sits about 400 standard deviations away from the others and will dominate any model that squares its errors. Replacing each value x with log(x) compresses the top end hard while barely touching the bottom:

- log(20000) = 9.90, log(40000) = 10.60, log(80000) = 11.29, log(10000000) = 16.12.
- The gaps between the first three are now about 0.7 each, and the monster is 4.8 away instead of thousands of times away. Everything is on speaking terms again.
- Logs also turn multiplication into addition, which is why a linear model on log(price) is really modelling percentage changes in price — usually the right way to think about prices and counts.
- Use log1p, which computes log(1 + x), when the column contains zeros: log(0) is undefined, log1p(0) is 0.`,
    },
    {
      type: 'intuition',
      title: 'Missing values',
      md: `Real tables have holes. A row where income was never filled in is not a row you can hand to most models — they will refuse or crash.

**Imputation** means filling the hole with a substitute value. The standard choices:

- **Median** for numeric columns. It is the middle value when sorted, and unlike the mean it is not dragged around by a few enormous values.
- **Most frequent value** for categorical columns, or a new explicit category called "Missing", which is often better because it does not pretend to know.
- Whatever you choose, **add a second 0/1 column recording that the value was missing**. Missingness itself is frequently a strong signal: someone who declined to state their income is telling you something, and plain imputation erases that message.
- The value you fill in must be computed from the training rows only. A median computed over the whole table before splitting has already looked at the test rows. That is the bug the rest of this module is about.`,
    },
    {
      type: 'intuition',
      title: 'Data leakage, stated plainly',
      md: `**Data leakage is when information reaches the model during training that will not be available at the moment you actually need a prediction.**

Why it is the most dangerous bug in this subject: the model looks excellent in your notebook, and there is no error, no warning, no red text. Every number on your screen agrees that you did a great job. Then the model goes to production, where that information genuinely does not exist yet, and it performs like a coin flip. The gap between the notebook and reality is entirely invisible until it costs money.

The four shapes it takes:

- **Target leakage** — a column that is only filled in *after* the outcome happened. account_closed_date predicting customer churn is the classic: it is empty for everyone who has not churned, so it is not a prediction, it is the answer.
- **Train-test contamination** — fitting a scaler, an imputer, an encoder or a feature selector on the whole table before splitting it. The transform then carries facts about the test rows.
- **Temporal leakage** — randomly splitting time-ordered data, so the model trains on March and is tested on February. In production you only ever have the past.
- **Group leakage** — the same patient, user or product appearing in both the training and test rows. The model memorises the individual rather than the pattern.

The next two snippets show shape 2 happening, on data that contains no signal whatsoever.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'The leakage path — and where the fit belongs instead',
        notice: 'Follow the arrow out of the transform. Any step where an arrow reaches the test cell is a step where the test set stopped being held out.',
        leftLabel: 'pipeline step',
        rightLabel: 'data',
        frames: [
          {
            note: 'Start: one table, 400 rows, nothing split yet. So far nothing is wrong.',
            stack: [{ name: 'raw_data', to: 'all' }],
            heap: [{ id: 'all', value: '400 rows, unsplit', label: 'dataset' }],
          },
          {
            note: 'The mistake: compute the per-city average of the target across the whole table. That average reads the labels of every row, including the rows we will test on.',
            stack: [{ name: 'encode(all rows)', to: 'all', danger: true }],
            heap: [{ id: 'all', value: '400 rows, unsplit', label: 'every label read here' }],
          },
          {
            note: 'Now we split. Too late — each test row already contributed its own label to its city average, so the encoded column quietly contains the answer.',
            stack: [
              { name: 'encoded -> train', to: 'tr' },
              { name: 'encoded -> test', to: 'te', danger: true },
            ],
            heap: [
              { id: 'tr', value: 'train, 280 rows' },
              { id: 'te', value: 'test, 120 rows', label: 'labels already used' },
            ],
          },
          {
            note: 'The score reads 0.742 on data made of coin flips. Not absurd enough to disbelieve — which is exactly why leakage survives review.',
            stack: [
              { name: 'test score', value: '0.742 (inflated)' },
              { name: 'reported to team', to: 'te', danger: true },
            ],
            heap: [
              { id: 'tr', value: 'train, 280 rows' },
              { id: 'te', value: 'test, contaminated', label: 'not held out' },
            ],
          },
          {
            note: 'The fix: split first, then compute the city averages from training labels only, then apply those stored averages to the test rows.',
            stack: [
              { name: 'split', value: 'first' },
              { name: 'encode(train only)', to: 'tr' },
            ],
            heap: [
              { id: 'tr', value: 'train, 280 rows', label: 'averages computed HERE only' },
              { id: 'te', value: 'test, 120 rows', label: 'averages applied, not computed' },
            ],
          },
          {
            note: 'Honest score: 0.45, which is a coin flip, which is the truth. A smaller number that survives contact with production is the only kind worth reporting.',
            stack: [{ name: 'test score', value: '0.45 (honest)' }],
            heap: [
              { id: 'tr', value: 'train, 280 rows', label: 'fit + apply' },
              { id: 'te', value: 'test, 120 rows', label: 'apply only' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Worked by hand first: six rows, one city column',
      md: `Before the code, do the arithmetic yourself on six rows. The column is city, the target is churned (1 = the customer left).

- Row 1: Pune, 1. Row 2: Pune, 0. Row 3: Pune, 1. Row 4: Nashik, 0. Row 5: Nashik, 0. Row 6: Nashik, 1.
- **The leaky way.** Compute each city average over all six rows. Pune: (1 + 0 + 1) / 3 = **0.667**. Nashik: (0 + 0 + 1) / 3 = **0.333**. Now split, sending rows 3 and 6 to the test set. Row 3 gets the value 0.667 — and row 3 is one of the three rows that produced 0.667. Its own label is inside its own feature.
- Make the categories rarer and it gets worse. If Pune had appeared only once, in row 3, its average would be exactly row 3's label. The feature becomes a perfect copy of the answer.
- **The honest way.** Split first: training rows are 1, 2, 4, 5; test rows are 3 and 6. Compute Pune from training rows only: (1 + 0) / 2 = **0.5**. Nashik from training rows only: (0 + 0) / 2 = **0.0**. Now apply those two stored numbers to the test rows: row 3 gets 0.5, row 6 gets 0.0. Neither test label was ever touched.
- The honest encoding is worse at describing these six rows and correct about every future row. That trade is the whole point.

Now the same thing at 400 rows, where a real score can be measured.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The classic mistake, part 1: encode first, split second',
      code: `import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

rng = np.random.default_rng(3)
city = rng.integers(0, 200, 400)
y = rng.integers(0, 2, 400)

def encode(cities, labels, rows):
    means = {c: labels[cities == c].mean() for c in np.unique(cities)}
    return np.array([[means.get(c, labels.mean())] for c in rows])

Xleak = encode(city, y, city)
Xa, Xb, ya, yb = train_test_split(Xleak, y, test_size=0.3, random_state=0)
print('leaky  :', round(LogisticRegression().fit(Xa, ya).score(Xb, yb), 3))

# ---- real output ----
# leaky  : 0.742`,
      annotations: {
        1: 'numpy, for the arrays and the comparison trick inside encode.',
        2: 'LogisticRegression is a standard classifier. Any model would do here; the bug is not in the model.',
        3: 'The splitter, same as before.',
        5: 'Fixed seed so these numbers reproduce exactly.',
        6: 'A city code for each of 400 customers, drawn from 200 different cities. That is about two customers per city, which is what makes the leak large.',
        7: 'The labels: 400 independent coin flips. There is no relationship whatsoever between city and label. Any honest score above roughly 0.5 is impossible.',
        9: 'A function that target-encodes: given some cities, their labels, and a list of rows to encode, return one number per row.',
        10: 'Builds a dictionary from city code to average label. np.unique(cities) lists each distinct city once. cities == c produces a True/False mask, one entry per row, and labels[mask] keeps only the labels where the mask is True — so .mean() is that city average. The whole thing in braces is a dict comprehension: it builds the dictionary in one pass.',
        11: 'Looks up each requested row and returns a 400-row, 1-column table. means.get(c, labels.mean()) returns the stored city average, or falls back to the overall average for a city never seen before.',
        13: 'The bug, on one line. encode is called with all 400 cities and all 400 labels, before any split exists. Every row helped compute its own city average.',
        14: 'Only now do we split. The damage is already inside the column.',
        15: 'A fresh LogisticRegression, fitted on the training part and scored on the held-out part: 0.742 accuracy on data made of coin flips. No error, no warning. Just a number that looks like a good afternoon of work.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The classic mistake, part 2: split first, encode second',
      code: `ctr, cte, ytr, yte = train_test_split(city, y, test_size=0.3, random_state=0)
Xtr = encode(ctr, ytr, ctr)
Xte = encode(ctr, ytr, cte)
print('honest :', round(LogisticRegression().fit(Xtr, ytr).score(Xte, yte), 3))
print('base   :', round(max(yte.mean(), 1 - yte.mean()), 3))

# ---- real output ----
# honest : 0.45
# base   : 0.525`,
      annotations: {
        1: 'Split the raw city codes and labels, with the same random_state, so the exact same 120 rows are held out as in part 1. Nothing but the ordering of two steps has changed.',
        2: 'Encode the training rows using training cities and training labels only.',
        3: 'Encode the test rows using the training averages — note the first two arguments are still ctr and ytr. The test labels yte are never passed to encode at all.',
        4: 'A fresh LogisticRegression on the honest column: 0.45. That is the truth about a dataset with no signal, and it is 0.29 below what the leaky version reported.',
        5: 'The do-nothing baseline for comparison: always predict whichever class is more common in the test rows, which scores 0.525. The honest model is no better than that, which is correct — there was never anything to learn.',
      },
    },
    {
      type: 'note',
      md: `**Read those two numbers again.** 0.742 and 0.45, same rows, same model, same feature idea. The only difference is which side of the split the averaging happened on. If this dataset had contained a little real signal, the leaky run might have printed 0.91 and the honest run 0.78 — and 0.91 is believable enough that nobody in the review would have asked.

**How leakage is actually caught**, in order of how often each one works:

- The score is too good for the problem. Compare against a do-nothing baseline and against what the business already achieves.
- One feature dominates the importance ranking. Read its definition and ask the person who owns the data: *when is this field written?* Anything written at or after the outcome is disqualified.
- Drop the suspect column and refit. If the score falls off a cliff, you have your answer.
- The score collapses in production. This is the expensive way to find out.

**The structural fix.** Do not rely on remembering. Put every fitted transform — imputer, scaler, encoder, selector — inside a scikit-learn Pipeline and hand that Pipeline to the cross-validation call. The framework then refits every transform inside each fold and merely applies it to the held-out part, so the ordering is enforced by the code instead of by your attention. Folds, cross-validation and how that call works are the subject of *Cross-Validation & Hyperparameter Tuning*; the only thing to carry there from here is: split first, fit second.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work each one out before reading the solution below it.

**1.** You have a t_shirt_size column with values S, M, L, XL, and you are fitting a linear regression. Which encoding, and why?

**2.** A column payment_method has values card, upi, netbanking, wallet. A colleague encodes them as 0, 1, 2, 3 and reports that the Random Forest works fine but the logistic regression is terrible. Explain both halves.

**3.** Your table has a transaction_amount column ranging from 5 to 4,000,000, and you are fitting a kNN classifier. Name two transforms you would apply, in order, and say what each fixes.

**4.** A teammate writes: median = X['income'].median(); X['income'] = X['income'].fillna(median); then splits into train and test, then cross-validates and gets 0.88. What is wrong, and what would you expect the honest number to do?`,
    },
    {
      type: 'intuition',
      title: 'Solutions',
      md: `**1.** Ordinal encoding: S=0, M=1, L=2, XL=3. Shirt sizes genuinely have an order and roughly even steps, so a single number carries real information and a linear model can use it with one coefficient. One-hot would also work but spends four columns and throws away the ordering, so the model would have to relearn from the data that L sits between M and XL.

**2.** Both halves come from the same fact: 0, 1, 2, 3 asserts an order and a spacing that payment methods do not have. Logistic regression fits one coefficient for the column, which forces the effect of netbanking to be exactly twice the effect of upi, and the effect of wallet to be three times it. That is a straight line through categories with no order, exactly like the 0.05 R-squared in the encoding snippet. A Random Forest is not stuck with a straight line: it can isolate wallet with two splits, "greater than 2.5" after "greater than 1.5", so it recovers the categories at the cost of extra depth. Fix it properly with one-hot encoding and the logistic regression becomes usable.

**3.** First a log transform, log1p(amount), which fixes the right-skew: without it the few multi-million transactions sit so far from everything else that all other rows look identical to each other. Then standardisation, so that this column and the other columns contribute comparably to the distance kNN computes. Order matters — standardising a wildly skewed column leaves it wildly skewed, just recentred.

**4.** The median was computed over the whole table, so it contains information from the rows that later become the test rows: train-test contamination. Nothing errors, and 0.88 is a believable number, which is what makes it dangerous. The fix is to compute the median from the training rows only and apply that stored value to the test rows — structurally, put the imputer inside a Pipeline. Expect the honest score to be lower. How much lower depends on how much the missing values matter: for a column with 2 percent missing it may move by nothing at all, and for a column with 40 percent missing it can move a lot. The important part is that after the fix the number means something, whatever it turns out to be.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Four things that matter in real projects and are not needed to understand anything above.

- **Target encoding done properly** needs two additions beyond splitting first. *Out-of-fold* encoding: split the training rows into folds and encode each fold using the others, so no training row contributes to its own encoding either. *Smoothing*: blend each category average toward the overall average, weighted by how many rows the category has, so a city with 2 customers is pulled back toward the global rate instead of being trusted. scikit-learn's TargetEncoder does both internally.
- **Cyclical encoding.** Hour 23 and hour 0 are one hour apart in reality and 23 apart as integers. Replace hour h with two columns, sin(2 x pi x h / 24) and cos(2 x pi x h / 24), which places the hours on a circle so every consecutive pair is equally close, midnight included. Both columns are needed — sin alone puts 5:00 and 7:00 in the same place. Same trick for day-of-week and compass bearing. Trees do not need it.
- **The dummy-variable trap.** One-hot a k-category column, keep all k columns, and also keep an intercept: the k columns add up to 1 in every row, which is exactly what the intercept already is. Plain ordinary least squares then has no unique solution and its coefficients become unstable. Drop one category as the reference (drop='first'). Ridge, Lasso and trees are unaffected.
- **Missingness mechanisms.** Missing completely at random (a dropped sensor packet) is harmless to impute. Missing at random, meaning explained by the other columns you do have, justifies a model-based imputer. Missing not at random, meaning it depends on the hidden value itself (high earners decline to state income), cannot be recovered by any imputer — there the missingness is the signal, so keep the indicator column and say the limitation out loud.`,
    },
  ],
  quiz: [
    {
      question: 'You switch a Random Forest from unscaled to StandardScaler-scaled features. What happens to its predictions?',
      options: [
        {
          text: 'Essentially nothing — a split only compares values inside one column, in order',
          explanation: 'Correct. Standardising never reorders a column, so every split that existed before exists after at a moved threshold. We measured it: 0.878 both ways.',
        },
        { text: 'Accuracy improves, because scaling always helps', explanation: 'Scaling helps distance-based, gradient-trained, regularised and variance-based methods. A tree is none of those.' },
        { text: 'Accuracy drops, because information is lost', explanation: 'Nothing is lost. Subtracting the mean and dividing by a positive number can be undone exactly.' },
      ],
      correct: 0,
    },
    {
      question: 'You encode colour as red=0, green=1, blue=2 and fit a linear regression. What goes wrong?',
      options: [
        { text: 'Nothing — the numbers are just identifiers', explanation: 'They are identifiers to you. The model fits one coefficient for the column, which forces evenly spaced, ordered effects.' },
        {
          text: 'The single coefficient forces the three colours onto an evenly spaced straight line',
          explanation: 'Correct. In the snippet the true averages were 100, 300, 150 and the ordinal model predicted 156.4, 179.3, 202.1 — R-squared 0.05 against 0.988 for one-hot.',
        },
        { text: 'It breaks trees but is fine for linear models', explanation: 'Backwards. A tree can isolate any single value with two splits; the linear model is the one stuck with a straight line.' },
      ],
      correct: 1,
    },
    {
      question: 'A column has 20,000 unique pin codes. What is the main cost of one-hot encoding it directly?',
      options: [
        { text: 'The model will treat the pin codes as ordered', explanation: 'One-hot is precisely the encoding that removes ordering. That risk belongs to ordinal encoding.' },
        {
          text: 'Cardinality explosion: 20,000 columns that are almost entirely zeros',
          explanation: 'Correct. Memory blows up and each column carries so few rows that the model overfits them. Usual fix: one-hot the top N categories and lump the rest into Other, or use a smoothed out-of-fold target encoding.',
        },
        { text: 'One-hot cannot represent more than 100 categories', explanation: 'There is no such limit. The problem is practical, not a hard cap.' },
      ],
      correct: 1,
    },
    {
      question: 'You target-encode a customer_id column that appears exactly once per row, computed over the full training set. What have you built?',
      options: [
        { text: 'A strong high-cardinality feature — this is the standard recipe', explanation: 'The recipe is standard only when computed out-of-fold and smoothed. Computed in place on unique ids, it is not a feature.' },
        {
          text: 'A copy of the label: the average of one row is that row itself',
          explanation: 'Correct. Each row reads its own answer off the column. This is the extreme version of the 0.742 result in the module.',
        },
        { text: 'A frequency encoding in disguise', explanation: 'Frequency encoding counts how often a category appears and never touches the target. This one is built entirely from the target.' },
      ],
      correct: 1,
    },
    {
      question: 'A numeric column is 30 percent missing and you impute the median. What extra step is usually worth taking?',
      options: [
        {
          text: 'Add a 0/1 column recording that the value was missing',
          explanation: 'Correct. Missingness is often signal on its own, and imputation erases it. The indicator keeps the message while the imputed value keeps the row usable.',
        },
        { text: 'Drop those rows as well, to be safe', explanation: 'That throws away 30 percent of the data and contradicts having imputed at all.' },
        { text: 'Use the mean instead, for consistency', explanation: 'The median is the more robust default; switching to the mean makes the fill value more sensitive to extreme values, not better.' },
      ],
      correct: 0,
    },
    {
      question: 'You fit a StandardScaler on the full table, then split, then cross-validate. Which leakage shape is this?',
      options: [
        {
          text: 'Train-test contamination — the scaler carries the test rows mean and standard deviation',
          explanation: 'Correct. The test rows were never truly held out. Structural fix: put the scaler inside a Pipeline so it is refitted inside every fold.',
        },
        { text: 'Temporal leakage — use a chronological split', explanation: 'Temporal leakage is about randomly splitting time-ordered data. Nothing here concerns time.' },
        { text: 'Group leakage — use GroupKFold', explanation: 'Group leakage is the same entity appearing on both sides. The issue here is a transform fitted on all rows.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Which algorithms need feature scaling and which do not? Give the reason in each direction.',
      answer:
        'Ask one question: does the algorithm compare magnitudes across different columns? Yes, so scale: kNN, K-Means and RBF-kernel SVM, because they add up squared differences across columns and a large-unit column dominates the distance; linear regression, logistic regression and neural nets, because gradient descent on badly scaled inputs crawls; ridge and lasso, because the penalty is on coefficient size and coefficient size depends on the column units, so measuring height in metres instead of centimetres changes how hard the penalty hits it; PCA, because it maximises variance and variance is unit-dependent. No: decision trees and every ensemble built from them, because a split is the ordinal test "is x less than or equal to t" and any monotonic rescaling preserves row order. I have measured both: kNN went 0.811 to 0.917 with standardisation and a tree on the same data stayed at 0.878.',
      isCaseBased: false,
    },
    {
      question: 'Define data leakage in one sentence, then name the common shapes with an example of each.',
      answer:
        'Leakage is information available to the model at training time that will not exist at prediction time. Four shapes. Target leakage: a column filled in after the outcome, like account_closed_date predicting churn, or collections_agency_assigned predicting default. Train-test contamination: fitting a scaler, imputer, encoder or feature selector on the whole table before splitting, so the transform carries test-row statistics. Temporal leakage: randomly splitting time-ordered data, so the model trains on the future and is scored on the past. Group leakage: the same patient or user in both train and test, so the model memorises the individual. Fixes in order: audit when each field is written, put transforms in a Pipeline, split chronologically, and group the folds by entity id.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague fraud model scores 0.98 AUC offline and 0.61 in production. Walk me through the investigation.',
      answer:
        'A 37-point gap points at leakage before overfitting, because overfitting normally shows up as a train-versus-validation gap, not a validation-versus-production gap. Order I would work in. First, feature importances: is one odd column carrying the model? Drop it and refit — a collapse names the culprit. Second, for every top feature ask the data owner when the field is written; anything populated at or after the outcome, like investigation_opened or chargeback_flag, is target leakage. Third, check the split: was it random on time-ordered transactions? Re-score with a chronological split. Fourth, check groups: is the same card or merchant on both sides? Re-score grouped by card_id. Fifth, check preprocessing: were scalers, encoders or resampling fitted before the split instead of inside a Pipeline? Only if all of that is clean do I look at non-leakage causes: distribution drift since the training window, or the serving code computing a feature differently from the training notebook. The thing to say out loud is that the honest offline number will be far lower than 0.98, and that is the point — a number that lies cannot be managed.',
      isCaseBased: true,
    },
    {
      question: 'How do you target-encode a high-cardinality column without leaking, and when would you avoid it?',
      answer:
        'Two mandatory pieces. Out-of-fold: encode each training row using only the other folds, so no row contributes to its own encoding; scikit-learn TargetEncoder does this internally, hand-rolled versions must do it explicitly. Smoothing: blend each category average toward the global average weighted by the category count, so a category with two rows is pulled back instead of trusted. I would avoid it when categories are near-unique, because then the encoding is a copy of the label; when the category-to-target relationship shifts over time; and when someone has to defend the model, since a column of unexplained numbers between 0 and 1 is hard to justify. Cheaper things to try first: top-N one-hot plus Other, frequency encoding, or a gradient boosting library that handles categories natively.',
      isCaseBased: false,
    },
    {
      question: 'Case: a hospital readmission model scores 0.94 in cross-validation and 0.68 on the next quarter. Preprocessing is already inside a Pipeline and no feature is obviously recorded after the outcome. What else do you check?',
      answer:
        'Two shapes remain. Group leakage: patients appear more than once, so the same person sits in both train and validation and the model memorises the individual. Re-run with the folds grouped by patient_id and expect the cross-validated number to fall toward 0.68. Temporal leakage: the folds are random across a time span, so the model trains on later admissions and validates on earlier ones, while production is strictly forward-looking. Re-run with a chronological split. I would also check for duplicate rows straddling folds, and for any oversampling applied before splitting, which copies synthetic training rows into validation. If the honest cross-validated number then lands near 0.68, nothing is broken — the original evaluation was. If it stays at 0.94, the cause is drift or a mismatch between training and serving instead, so I would compare feature distributions between the training window and the new quarter and verify the serving code computes each feature identically.',
      isCaseBased: true,
    },
    {
      question: 'What features would you engineer for a house-price model, and why those?',
      answer:
        'Start from what a domain expert asks. Ratios the model cannot derive itself: area per room, land-to-building ratio, rooms per floor. A plain linear model cannot divide one column by another, so these have to be handed to it — in a small synthetic version of exactly this, adding area divided by rooms took R-squared from 0.855 to 0.986. Date and time: listing month for seasonality, property age as sale year minus build year, years since renovation. Location: distance to the city centre or nearest station, plus a smoothed out-of-fold target encoding of the neighbourhood rather than one-hot on thousands of pin codes. Transform: model log of price, because prices are right-skewed and errors are really percentages. Each feature costs a computation in the serving path and a chance to leak, so I would add them in blocks and keep only what improves an honest split.',
      isCaseBased: false,
    },
    {
      question: 'What do you do about outliers, and how does the answer depend on the model?',
      answer:
        'Detect first: values more than about three standard deviations from the mean for a roughly symmetric column, or the interquartile rule for a skewed one. Then choose deliberately. Leave them alone for trees and ensembles, which barely care, and whenever the outliers are the thing you are trying to predict, as in fraud or equipment failure. Cap at the 1st and 99th percentile when the extremes are plausible but noisy and the model is linear, distance-based or gradient-trained, since a squared-error loss lets one far point drag the whole fit. Remove a row only when you can name why it is invalid, like a negative age. Often a log transform or a median-and-IQR based scaler solves the problem without touching a single row, and any capping threshold must be learned on the training rows and then applied to the test rows.',
      isCaseBased: false,
    },
    {
      question: 'Case: you are handed a notebook reporting 0.99 accuracy on a churn dataset. In five minutes, how do you decide whether to trust it?',
      answer:
        'Five checks, about a minute each. One, baseline: what is the class balance? On a 1 percent churn rate, 0.99 accuracy is what you get by predicting nobody ever churns, so ask for precision and recall instead. Two, scan the feature list for any name containing closed, cancelled, refund, final or exit, and ask when each field is written relative to the outcome. Three, split hygiene: search the notebook for any fit or fit_transform that runs before the train/test split, and for resampling applied outside the folds. Four, split appropriateness: is the data time-ordered, or does one customer appear many times? If so a random split was already wrong and I would ask for a chronological or grouped one. Five, ablation: drop the top-importance feature and refit; a large collapse identifies the leak. What I would tell the author is that the deliverable is not the 0.99, it is the number that survives all five checks — 0.78 that holds beats 0.99 that evaporates in the first production week.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Feature engineering, in one line', back: 'Turning the raw table into the columns the model can actually use. A linear model cannot divide one column by another — adding area/rooms took R-squared from 0.855 to 0.986 on the same rows.' },
    { front: 'Min-max vs standardisation', back: 'Min-max: (x - min) / (max - min), lands in 0 to 1, fragile to one huge value. Standardisation: (x - mean) / standard deviation, no bounded range, the default choice.' },
    { front: 'Who needs scaling', back: 'Yes: kNN, K-Means, RBF-SVM (distance), linear/logistic/neural nets (gradient descent), ridge and lasso (penalty is unit-dependent), PCA (variance is unit-dependent). No: trees and tree ensembles.' },
    { front: 'Why trees ignore scaling', back: 'A split is "is x less than or equal to t", which only uses the order of values inside one column. Standardising never reorders a column. Measured: 0.878 before and after.' },
    { front: 'One-hot vs ordinal encoding', back: 'One-hot: one 0/1 column per category, implies no order — use for colours, cities, payment methods. Ordinal: a single number, valid only when the categories are genuinely ordered and evenly spaced, like S/M/L/XL.' },
    { front: 'Target encoding, safely', back: 'Category becomes the average target for that category. Requires computing it out-of-fold and smoothing toward the global average. Without both, the column is a partial copy of the label.' },
    { front: 'Data leakage, defined', back: 'Information present at training time that will not exist at prediction time. Four shapes: target, train-test contamination, temporal, group. Nothing errors when it happens.' },
    { front: 'Split first, fit second', back: 'Every fitted transform — scaler, imputer, encoder, selector — learns its numbers from the training rows only. Target-encoding before splitting scored 0.742 on pure coin flips; after splitting, the honest 0.45.' },
  ],
  mindmapMarkdown: `- Feature Engineering & Data Leakage
  - Why features matter
    - The model can only combine what you hand it
    - area/rooms: 0.855 -> 0.986
    - interaction features = ratios, products
  - Scaling
    - min-max: (x-min)/(max-min), 0 to 1
    - standardise: (x-mean)/sd, the default
    - log transform fixes right-skew
  - Who needs scaling
    - YES distance: kNN, K-Means, RBF-SVM
    - YES gradient: linear, logistic, neural nets
    - YES penalty: ridge, lasso
    - YES PCA: variance is unit-dependent
    - NO trees: splits use order only (0.878 = 0.878)
  - Encoding categories
    - one-hot: no order implied
    - cardinality explosion -> top-N + Other
    - ordinal: only if truly ordered (0.05 vs 0.988)
    - target encoding: out-of-fold + smoothing
  - Missing values
    - median / most frequent / explicit Missing
    - always add an is_missing column
    - fill value learned on train only
  - Data leakage
    - info absent at prediction time
    - target: column written after the outcome
    - contamination: fit before split (0.742 vs 0.45)
    - temporal: random split on time-ordered rows
    - group: same entity on both sides
    - catch: too-good score, one dominant feature, drop-and-refit
    - fix: Pipeline, split first, fit second`,
}

export default m
