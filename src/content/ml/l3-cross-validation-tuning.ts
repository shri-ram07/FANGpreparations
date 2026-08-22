import type { Module } from '../types'

const m: Module = {
  id: 'ml-l3-cross-validation-tuning',
  subjectId: 'ml',
  level: 3,
  title: 'Cross-Validation & Hyperparameter Tuning',
  whyItMatters:
    'You train a model, you test it on some rows you held back, and you get a number. That number is what you tell people. This module is about how much you should trust it. The answer, on a small dataset, is: much less than you think. We will take 200 rows, split them five different ways, and watch the same model score anywhere from 0.825 to 0.925 without anything about the model changing. Then we build the standard fix, k-fold cross-validation, by hand out of plain Python lists so you can see there is no magic in it. Then we show what happens when you tune a model against the same rows you use to judge it: a configuration that scored 0.900 on the split it was chosen on drops to 0.725 on rows it never touched.',
  assumes: [
    'You have read *What "Learning From Data" Actually Means* — you know what training data and test data are, and why a model is judged on rows it has not seen',
    'You know what an average is, and what it means for a set of numbers to be spread out',
    'You have seen a Python list, a for loop, an if statement, and list slicing like myList[0:4]',
    'Everything else used here, including every sklearn function call, is explained on the line where it appears',
  ],
  estMinutes: 60,
  sections: [
    {
      type: 'intuition',
      title: 'One split gives you one number, and that number moves',
      md: `You have 200 rows of data. You do the normal thing: keep 80% for training and 20% for testing, train a model, score it on the 20%. You get 0.825. You write that down.

- The 20% test set is **40 rows**. Your entire published number rests on how the model did on those 40 rows.
- Which 40 rows? Whichever ones the random shuffle picked. Change the shuffle and you get a different 40 rows.
- If that new set of 40 happens to contain a few more of the easy cases, the score goes up. A few more hard ones, it goes down.
- Nothing about the model changed. Nothing about the data changed. Only the *cut* changed.

That is not a hypothesis. Run it.`,
    },
    {
      type: 'visual',
      component: 'Plot',
      props: {
          title: 'The curve every hyperparameter search is walking along',
          notice: 'Training error only ever falls — a more flexible model can always fit the data it has seen, so it can never tell you when to stop. Validation error falls, bottoms out at degree 10, then climbs: past that point the extra flexibility is memorising noise. Cross-validation exists to find that turn, and the gap between the two lines at the right-hand end is exactly how much the model is overfitting.',
          kind: 'line',
          xLabel: 'model complexity (polynomial degree)',
          yLabel: 'error',
          yMin: 0,
          series: [
            {
              name: 'validation',
              points: [[1, 0.7893], [2, 0.586], [3, 0.4396], [4, 0.3351], [5, 0.2617], [6, 0.2113], [7, 0.1781], [8, 0.1577], [9, 0.1471], [10, 0.144], [11, 0.1466], [12, 0.1538], [13, 0.1646], [14, 0.1783], [15, 0.1945]],
              dots: true,
            },
            {
              name: 'training',
              points: [[1, 0.7882], [2, 0.582], [3, 0.4312], [4, 0.3208], [5, 0.2401], [6, 0.181], [7, 0.1378], [8, 0.1062], [9, 0.0831], [10, 0.0661], [11, 0.0538], [12, 0.0447], [13, 0.0381], [14, 0.0332], [15, 0.0297]],
              dots: true,
            },
          ],
          markers: [{ x: 10, y: 0.144, text: 'best: degree 10' }],
        },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same model, the same data, five different cuts',
      code: `from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

X, y = make_classification(n_samples=200, n_features=8, n_informative=3, random_state=0)

for seed in [1, 2, 3, 4, 5]:
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=seed)
    model = DecisionTreeClassifier(max_depth=4, random_state=0)
    model.fit(Xtr, ytr)
    print(seed, round(model.score(Xte, yte), 4))

# ---- real output ----
# 1 0.825
# 2 0.85
# 3 0.875
# 4 0.925
# 5 0.825`,
      annotations: {
        1: 'make_classification is a sklearn function that invents a fake dataset for you. We use fake data so you can re-run every number on this page yourself.',
        2: 'train_test_split cuts a dataset into two pieces: one to train on, one to test on.',
        3: 'DecisionTreeClassifier is the model we will use throughout. What it does internally does not matter here — it is just something that learns from rows and then predicts.',
        5: 'Builds 200 rows. Each row has 8 columns of numbers (n_features) of which only 3 actually carry a signal (n_informative); the other 5 are noise. random_state=0 fixes the invented data so it is the same every run. X holds the columns, y holds the true answer (0 or 1) for each row.',
        7: 'Loop over five different shuffle settings. Everything below is identical on each pass except this number.',
        8: 'Cut the 200 rows into 160 training rows and 40 test rows. test_size=0.2 means "20% goes to test". random_state=seed decides WHICH rows go where, so a different seed gives a different pair of piles. The four names on the left unpack the four returned pieces in order: train inputs, test inputs, train answers, test answers.',
        9: 'Build a fresh, untrained model. max_depth=4 limits how many questions deep the tree may go. random_state=0 fixes the model\'s own internal randomness, so the model is NOT the thing changing between passes.',
        10: '.fit() is sklearn\'s name for "train". It looks at the 160 training rows and their answers and adjusts itself.',
        11: '.score() runs the trained model on the 40 test rows and returns the fraction it got right. round(x, 4) trims the printout to 4 decimal places.',
      },
    },
    {
      type: 'note',
      md: `Read the five numbers again: **0.825, 0.850, 0.875, 0.925, 0.825**. The lowest and the highest are **10 percentage points apart**, and the only difference between them is which 40 rows landed in the test pile. If your colleague reports 0.925 and you report 0.825, you are not disagreeing about the model. You are each holding one draw from the same lottery.`,
    },
    {
      type: 'intuition',
      title: 'The fix: let every row take a turn as test data',
      md: `The problem with one split is that 160 rows were used for training and never got to be judged on, while 40 rows were judged on and never got to teach. So do it several times, rotating the job around.

- A **fold** is one of the equal-sized chunks you cut the data into. If you cut 20 rows into 5 chunks of 4, each chunk of 4 is a fold.
- **k-fold cross-validation** is this procedure: cut the data into k folds; then run k separate experiments. In experiment number *i*, fold *i* is the test set and the other k−1 folds are joined together as the training set. You end up with k scores.
- The letter **k** is just how many folds you chose. k=5 means five folds and five experiments; k=10 means ten of each.
- Two things come out of it that a single split cannot give you: every row is tested exactly once, and you get k numbers instead of one, so you can see how much they disagree.

It costs k model trainings instead of one. That is the whole price.

Before touching any library, let us build the folds out of a plain Python list.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 1: cut 20 row numbers into 5 folds, by hand',
      code: `rows = list(range(20))
K = 5
size = len(rows) // K

folds = []
for f in range(K):
    folds.append(rows[f * size:(f + 1) * size])

for f in range(K):
    print('fold', f, '->', folds[f])

# ---- real output ----
# fold 0 -> [0, 1, 2, 3]
# fold 1 -> [4, 5, 6, 7]
# fold 2 -> [8, 9, 10, 11]
# fold 3 -> [12, 13, 14, 15]
# fold 4 -> [16, 17, 18, 19]`,
      annotations: {
        1: 'range(20) counts 0 to 19; list(...) turns that count into a real list. These are row NUMBERS, not the data itself — we are only deciding who goes where.',
        2: 'How many folds we want. Five.',
        3: 'How big each fold must be. len(rows) is 20, and // is integer division: it divides and throws away any remainder, so 20 // 5 is exactly 4.',
        5: 'An empty list that will hold the five folds. Each item in it will itself be a list of row numbers.',
        6: 'Run once per fold, with f taking the values 0, 1, 2, 3, 4.',
        7: 'rows[a:b] is a slice: it means "the part of rows from position a up to but not including position b". For f=0 that is rows[0:4], for f=1 it is rows[4:8], and so on. .append adds that slice to folds as one item.',
        9: 'Loop over the five folds again, this time only to look at them.',
        10: 'Print the fold number and the row numbers it contains. Notice the five folds together contain all 20 rows, with no row appearing twice.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 2: rotate — each fold takes a turn as the test set',
      code: `for f in range(K):
    test = folds[f]
    train = []
    for g in range(K):
        if g != f:
            train = train + folds[g]
    print('round', f, 'TEST ', test)
    print('        TRAIN', train)

# ---- real output ----
# round 0 TEST  [0, 1, 2, 3]
#         TRAIN [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
# round 1 TEST  [4, 5, 6, 7]
#         TRAIN [0, 1, 2, 3, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
# round 2 TEST  [8, 9, 10, 11]
#         TRAIN [0, 1, 2, 3, 4, 5, 6, 7, 12, 13, 14, 15, 16, 17, 18, 19]
# round 3 TEST  [12, 13, 14, 15]
#         TRAIN [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 16, 17, 18, 19]
# round 4 TEST  [16, 17, 18, 19]
#         TRAIN [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]`,
      annotations: {
        1: 'One pass per round. f is the number of the fold that is on test duty this round.',
        2: 'The test set for this round is simply fold number f — 4 row numbers.',
        3: 'Start an empty training list. We are about to fill it with everything that is not fold f.',
        4: 'Walk over all five folds again, using a second counter g so we do not lose track of f.',
        5: '!= means "is not equal to". So this skips the fold currently on test duty and lets all the others through.',
        6: 'Adding two lists with + glues them end to end into a longer list. After this inner loop finishes, train holds the 16 row numbers from the other four folds.',
        7: 'Print which rows are being tested on this round.',
        8: 'Print which rows are being trained on. Check the output: TEST and TRAIN never share a row, and across the five rounds every row is in TEST exactly once.',
      },
    },
    {
      type: 'note',
      md: `That is the entire algorithm. Sixteen rows train, four rows are judged, and the four judged rows rotate. sklearn's \`KFold\` does exactly this and nothing more — you have just written it. The only reason libraries exist for it is convenience, not difficulty.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 3: the same construction on the real 200 rows',
      code: `from sklearn.datasets import make_classification
from sklearn.tree import DecisionTreeClassifier

X, y = make_classification(n_samples=200, n_features=8, n_informative=3, random_state=0)
rows = list(range(200))
folds = []
for f in range(5):
    folds.append(rows[f * 40:(f + 1) * 40])
print('fold sizes:', [len(f) for f in folds])

# ---- real output ----
# fold sizes: [40, 40, 40, 40, 40]`,
      annotations: {
        1: 'The same fake-data generator as before.',
        2: 'The same model type as before.',
        4: 'The identical 200 rows we used for the five-split experiment, so the numbers stay comparable.',
        5: 'Row numbers 0 to 199.',
        6: 'The empty holder for our five folds.',
        7: 'Five folds again.',
        8: '200 rows divided by 5 folds is 40 rows each, so the slices are rows[0:40], rows[40:80], and so on. This is the Part 1 code with 20 replaced by 200 and 4 replaced by 40.',
        9: 'A list comprehension: "len(f) for f in folds" builds a new list holding the length of each fold. Read it as "the size of every fold". It confirms all five came out at 40.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 4: five folds, five scores, one mean',
      code: `scores = []
for f in range(5):
    test = folds[f]
    train = []
    for g in range(5):
        if g != f:
            train = train + folds[g]
    model = DecisionTreeClassifier(max_depth=4, random_state=0)
    model.fit(X[train], y[train])
    scores.append(round(model.score(X[test], y[test]), 4))

print('five fold scores:', scores)
print('mean  ', round(sum(scores) / 5, 4))
print('spread', round(max(scores) - min(scores), 4))

# ---- real output ----
# five fold scores: [0.9, 0.825, 0.9, 0.9, 0.8]
# mean   0.865
# spread 0.1`,
      annotations: {
        1: 'Somewhere to collect the five scores.',
        2: 'Five rounds, exactly the rotation from Part 2.',
        3: 'This round\'s test rows: fold f.',
        4: 'Start this round\'s training list empty.',
        5: 'Walk the folds with the second counter.',
        6: 'Skip the fold on test duty.',
        7: 'Glue every other fold onto the training list, giving 160 row numbers.',
        8: 'A brand new untrained model for this round. This matters: reusing the previous round\'s trained model would let it remember rows it is about to be tested on.',
        9: 'X[train] means "the rows of X at these row numbers". Handing a list of positions to X like this is a numpy feature called fancy indexing, and it is why we kept row numbers rather than rows all along. y[train] picks the matching answers.',
        10: 'Score the trained model on this round\'s 40 test rows and store the result.',
        12: 'The five scores, one per fold.',
        13: 'sum(scores) adds all five, dividing by 5 gives the average.',
        14: 'The gap between the best fold and the worst fold. This one number is what a single split can never tell you.',
      },
    },
    {
      type: 'intuition',
      title: 'The mean is not the whole story',
      md: `The five fold scores are **0.900, 0.825, 0.900, 0.900, 0.800**. Their mean is 0.865. Reporting only 0.865 throws away the most useful half of what you just measured.

- The **spread** here is 0.900 − 0.800 = **0.100**. On any given 40 rows, this model might land ten points either side of 0.865.
- A tighter summary of the spread is the **standard deviation**: the typical distance of a fold score from the mean. Compute it by hand. The five gaps from the mean 0.865 are +0.035, −0.040, +0.035, +0.035, −0.065.
- Square each gap so the minus signs stop cancelling the plus signs: 0.001225, 0.001600, 0.001225, 0.001225, 0.004225. They add up to 0.009500.
- Divide by 5 to average them: 0.001900. Take the square root to undo the squaring: **0.0436**.
- So the honest report is **0.865, give or take about 0.044**, not "0.865".

Now the practical payoff. Suppose you try a second model and its cross-validation mean is 0.873. That is 0.008 better. Your fold-to-fold noise is 0.044 — five times larger than the difference. **You have not shown the second model is better.** You have shown the two are indistinguishable with 200 rows.

A wide spread means one of two things, and both are worth knowing: either the dataset is small enough that 40 test rows are simply noisy, or the folds are genuinely different from each other because the data is not uniform — for example, one fold contains most of the rare class, or most of one customer's records. The next two sections are about that second case.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The library version gives exactly the same numbers',
      code: `from sklearn.model_selection import cross_val_score, KFold

model = DecisionTreeClassifier(max_depth=4, random_state=0)
scores = cross_val_score(model, X, y, cv=KFold(n_splits=5))
print([round(float(s), 4) for s in scores])
print('mean', round(float(scores.mean()), 4), 'std', round(float(scores.std()), 4))

# ---- real output ----
# [0.9, 0.825, 0.9, 0.9, 0.8]
# mean 0.865 std 0.0436`,
      annotations: {
        1: 'cross_val_score runs the whole rotation for you. KFold is the fold-cutter — the Part 1 slicing code, packaged.',
        3: 'One untrained model. cross_val_score never trains this object itself; it makes a fresh copy for each fold, the same discipline as line 8 of Part 4.',
        4: 'Hand it the model, the data, and how to cut. cv=KFold(n_splits=5) says "five contiguous folds, no shuffling", which is precisely what we built by hand. It returns the five scores.',
        5: 'float(s) converts numpy\'s number type to a plain Python float so it prints as 0.9 and not as np.float64(0.9). The rest is the list comprehension from Part 3.',
        6: '.mean() averages the five scores and .std() is the standard deviation — the same 0.0436 we computed by hand above, which is how you know the hand calculation was right.',
      },
    },
    {
      type: 'intuition',
      title: 'Stratified k-fold: when the folds must all look alike',
      md: `Cutting the rows into five contiguous blocks assumes the rows are in no particular order. Sometimes they are, and sometimes even random order is not enough.

- **Stratified k-fold** is k-fold with one extra rule: each fold must contain roughly the same proportion of each class as the whole dataset does. If 10% of your rows are class 1, then about 10% of every fold is class 1.
- Why classification needs it: the thing you are measuring is how well the model handles each class. If a fold contains **zero** rows of the rare class, that fold's score says nothing at all about the rare class — and yet it goes into your average with equal weight.
- The smaller the dataset and the rarer the class, the more likely that is. It is not a corner case; it is the normal outcome.
- Regression has no classes to balance, so plain k-fold is the default there. If the target is very skewed, people sometimes group it into bands and stratify on the bands.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Two folds with zero positives, and the fix',
      code: `import numpy as np
from sklearn.datasets import make_classification
from sklearn.model_selection import KFold, StratifiedKFold

Xs, ys = make_classification(n_samples=60, n_features=8, n_informative=3, weights=[0.93], random_state=0)
print('positives in the whole dataset:', int(ys.sum()), 'out of', len(ys))
for name, splitter in [('KFold', KFold(5)), ('StratifiedKFold', StratifiedKFold(5))]:
    counts = []
    for train_idx, test_idx in splitter.split(Xs, ys):
        counts.append(int(ys[test_idx].sum()))
    print(name, 'positives per test fold:', counts)

# ---- real output ----
# positives in the whole dataset: 5 out of 60
# KFold positives per test fold: [2, 2, 0, 1, 0]
# StratifiedKFold positives per test fold: [1, 1, 1, 1, 1]`,
      annotations: {
        1: 'numpy is the array library sklearn returns its data in. We need it here only because ys is a numpy array.',
        2: 'The dataset generator again.',
        3: 'The two fold-cutters we are comparing.',
        5: 'A deliberately small, deliberately lopsided dataset: 60 rows, and weights=[0.93] asks for about 93% of them to be class 0. So class 1 is rare.',
        6: 'ys is a list of 0s and 1s, so ys.sum() adds them up and therefore counts the 1s. int(...) drops the numpy wrapper so it prints cleanly. Result: 5 positives out of 60.',
        7: 'A list of two (name, cutter) pairs, unpacked into the two loop variables name and splitter on each pass — so the body below runs once for KFold and once for StratifiedKFold.',
        8: 'Somewhere to record, for each fold, how many positives landed in it.',
        9: '.split() hands back one (training row numbers, test row numbers) pair per fold — five pairs here. This is what our hand-written rotation loop produced, in library form.',
        10: 'ys[test_idx] picks the true answers for this fold\'s test rows, and .sum() counts how many of them are 1.',
        11: 'Print the per-fold counts. Plain KFold left two folds with zero positives; the stratified version put exactly one in each.',
      },
    },
    {
      type: 'note',
      md: `Look at what plain KFold produced: **[2, 2, 0, 1, 0]**. Folds 2 and 4 contain no positive rows at all, so on those two rounds the model was graded entirely on class 0 — and a model that answers "class 0" to everything scores 100% there. Two of your five numbers were measuring nothing. Stratified k-fold gives **[1, 1, 1, 1, 1]** and every round tests what you meant to test. This is why stratification is the default for classification and not an option you switch on when things look odd.`,
    },
    {
      type: 'intuition',
      title: 'Three more ways to cut, and the specific problem each one solves',
      md: `Plain and stratified k-fold cover most tabular data. Three other cutters exist because three other things can go wrong.

- **Leave-one-out cross-validation** is k-fold taken to its limit: k equals the number of rows, so each fold is a single row. With 200 rows that is 200 model trainings, each judged on exactly one row. It uses every scrap of data for training, which is attractive when you have very little. The costs are real: 200 trainings instead of 5, and 200 models that are nearly identical to each other (they differ by one row), so averaging their scores cancels less noise than you would hope.
- **Group k-fold** is for data where rows come in clumps that belong to the same thing — 3 scans from one patient, 40 clicks from one user, 12 monthly rows for one shop. Group k-fold guarantees that all rows from one group land in the *same* fold. Without it, patient 17's scan number 1 is in the training set and their scan number 2 is in the test set, so the model can score well by recognising the patient rather than the disease. That is called **leakage**: information reaching the model at judging time that it will not have in real use. Group k-fold prevents exactly that leak, and it usually makes your score go *down*, because the inflated number was the wrong one.
- **Time-series split** is for data with a time order — sales by day, transactions by hour. Instead of random folds it trains on the first stretch of time and tests on the stretch immediately after, then extends the training stretch and rolls forward. Fold 1 might train on days 1–40 and test on 41–80; fold 2 trains on days 1–80 and tests on 81–120; and so on. Shuffling this data is cheating in a very literal sense: it puts *future* days in the training set and asks the model to predict a day in the *past*. In real use the future has not happened yet. The last section of this module walks into that mistake on purpose and measures how big the lie is.`,
    },
    {
      type: 'intuition',
      title: 'Hyperparameters: the settings you choose, not the ones the model learns',
      md: `Everything so far measured *one* model. Tuning is about choosing between many. First, the vocabulary.

- When \`.fit()\` runs, the model works out numbers from the data — where each tree split goes, what each coefficient is. Those learned numbers are the model's **parameters**. You never set them by hand; that is what training is.
- A **hyperparameter** is a setting you choose *before* \`.fit()\` runs, which controls how the fitting happens. \`max_depth=4\` in our tree is one. So is \`min_samples_leaf\`, the smallest number of rows a tree is allowed to leave in a final branch.
- The simple test: if \`.fit()\` changes it, it is a parameter. If you had to type it before calling \`.fit()\`, it is a hyperparameter.
- Parameters are *solved for*, because training has a direct method for finding them. Hyperparameters have no such method — changing \`max_depth\` changes the entire fitting procedure, so the only way to find out whether 4 beats 6 is to train both and compare.
- That is why every tuning method in existence has the same shape: pick a setting, train, score, decide what to try next. They differ only in how they pick.`,
    },
    {
      type: 'intuition',
      title: 'Tuning must not touch the set you report on',
      md: `Here is the trap, and it is the single most common way a model looks better on a slide than in production.

You try 40 different settings. You score each one on the same held-out rows. You pick the winner. You report the winner's score.

- Every one of those 40 scores is the true quality of that setting **plus some luck**, because it was measured on only 40 rows.
- Picking the maximum of 40 noisy numbers does not pick the setting with the best true quality. It picks the setting with the best true quality *plus the best luck*, and mostly it is the luck doing the work.
- So the winner's score is systematically too high. Not "sometimes too high" — too high on average, every time, by more the more settings you try. This has a name: the **winner's curse**.
- The defence is a third pile of rows. Split the data three ways: a **training set** to fit on, a **validation set** to compare settings on, and a **test set** that nothing in the tuning process is ever allowed to look at. Score the winner on the test set once, at the end.

Watch it happen.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 1: three piles, not two',
      code: `from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split

X, y = make_classification(n_samples=200, n_features=8, n_informative=3, flip_y=0.15, random_state=0)
Xrest, Xte, yrest, yte = train_test_split(X, y, test_size=0.2, random_state=9)
Xtr, Xva, ytr, yva = train_test_split(Xrest, yrest, test_size=0.25, random_state=9)
print('train', len(Xtr), 'validation', len(Xva), 'test', len(Xte))

# ---- real output ----
# train 120 validation 40 test 40`,
      annotations: {
        1: 'The generator again.',
        2: 'The splitter again.',
        4: 'Same 200 rows as before with one addition: flip_y=0.15 flips the true answer on about 15% of rows, which makes the problem genuinely hard. Real data is noisy; a spotless dataset would hide the effect we are hunting.',
        5: 'First cut: 20% goes to the test set (40 rows), the remaining 160 rows are called Xrest for now. The test rows are put away and not looked at again until the very last line of Step 3.',
        6: 'Second cut, applied to those 160 rows only: 25% of 160 is 40 rows for validation, leaving 120 for training. Two cuts is how you get three piles.',
        7: 'Confirm the sizes: 120 / 40 / 40.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 2: try 40 settings, keep the best',
      code: `from sklearn.tree import DecisionTreeClassifier

results = []
for depth in [2, 3, 4, 5, 6, 8, 10, None]:
    for leaf in [1, 2, 3, 5, 8]:
        mo = DecisionTreeClassifier(max_depth=depth, min_samples_leaf=leaf, random_state=0)
        mo.fit(Xtr, ytr)
        results.append((mo.score(Xva, yva), depth, leaf))

best = results[0]
for r in results:
    if r[0] > best[0]:
        best = r
print('configs tried:', len(results))
print('best on validation:', best)

# ---- real output ----
# configs tried: 40
# best on validation: (0.9, 4, 3)`,
      annotations: {
        1: 'The model type we are tuning.',
        3: 'A list to collect one entry per setting we try.',
        4: 'Eight values for max_depth. None means "no depth limit at all" — grow the tree until it cannot split further.',
        5: 'Five values for min_samples_leaf. A loop inside a loop means every depth is paired with every leaf value: 8 times 5 gives 40 combinations.',
        6: 'Build a model with this particular pair of settings. random_state=0 is fixed so any score difference comes from the settings, not from luck inside the model.',
        7: 'Train it on the 120 training rows only.',
        8: 'Score it on the 40 validation rows and store a three-item tuple: (score, depth, leaf). A tuple is just a fixed group of values written with commas; we keep the settings alongside the score so we can identify the winner later.',
        10: 'Assume the first entry is the best so far, so we have something to compare against.',
        11: 'Walk through every entry.',
        12: 'r[0] is the score, position 0 of the tuple. If this entry scored higher than the current champion...',
        13: '...it becomes the new champion. A plain loop, deliberately, instead of a sort with a key function.',
        14: 'Confirm how many settings were actually tried: 8 depths times 5 leaf sizes is 40.',
        15: 'Print the winner. It scored 0.900 on validation, using max_depth=4 and min_samples_leaf=3.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 3: the same winner, on rows nothing has touched',
      code: `winner = DecisionTreeClassifier(max_depth=best[1], min_samples_leaf=best[2], random_state=0)
winner.fit(Xtr, ytr)
print('validation score that won the search:', round(best[0], 4))
print('same model on the untouched test set:', round(winner.score(Xte, yte), 4))

# ---- real output ----
# validation score that won the search: 0.9
# same model on the untouched test set: 0.725`,
      annotations: {
        1: 'Rebuild the winning model from the settings stored in the tuple: best[1] is the depth, best[2] is the leaf size.',
        2: 'Train it on the same 120 training rows. Nothing here is different from Step 2 — this is literally the winning model.',
        3: 'The number the search reported: 0.900.',
        4: 'The same trained model, scored on the 40 test rows that were sealed away in Step 1 and never influenced a single decision. It scores 0.725.',
      },
    },
    {
      type: 'note',
      md: `**0.900 on the set it was chosen on. 0.725 on rows it was not.** A drop of 17.5 points, and the model is identical in both lines — same settings, same training rows, same code. Only the rows being scored changed.

Two more numbers make the mechanism obvious. The average validation score across all 40 settings was **0.848**. The winner's 0.900 sits five points above that average, and the test set says the truth is nearer 0.725. The search did not find a better model; it found the setting whose luck on those particular 40 validation rows was best. If you had reported 0.900, you would have been reporting luck.

Honest caveat: these are the numbers for one particular split. Repeat the whole experiment on twelve different splits and the winner beats its own test score in most of them but not all — the average best-validation score across the twelve was 0.833 and the average test score was 0.783. The gap is about five points on average and 17.5 points on a bad day. The direction is always the same, and that is the part you can rely on.`,
    },
    {
      type: 'intuition',
      title: 'Grid search and random search',
      md: `Two ways to choose which settings to try. Both are exactly the "try, measure, keep the best" loop from Step 2; they differ only in the list of things tried.

- **Grid search** lists a few values for each hyperparameter and tries every combination. Step 2 was a grid search: 8 depths times 5 leaf sizes is 40 fits.
- **Random search** picks each setting at random from a range you specify, and does that as many times as your budget allows. 40 fits means 40 random combinations.

Now the part worth understanding, rather than memorising. In almost every real model, **one or two hyperparameters matter a lot and the rest barely matter at all** — and you do not know in advance which ones.

- Say you have 2 hyperparameters and a budget of 9 fits. A grid uses 3 values of each: 3 × 3 = 9.
- If only the first one matters, then across all 9 fits you tested it at **3 distinct values**. The other 6 fits re-tested those same 3 values with a knob that changes nothing.
- Random search with the same 9 fits tries **9 distinct values** of the first hyperparameter, because every draw is a fresh value.
- Three times the resolution on the axis that matters, for the same money. And it gets better as you add hyperparameters: with 4 knobs, a 3-value grid costs 81 fits and still tests each knob at only 3 values.`,
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `grid = []
for a in [0.01, 0.1, 1.0]:
    for b in [1, 5, 10]:
        grid.append((a, b))
print('grid  : points tried', len(grid), '| distinct a values', len(set(g[0] for g in grid)))

import random
random.seed(0)
rand = []
for _ in range(9):
    rand.append((round(random.uniform(0.01, 1.0), 3), random.randint(1, 10)))
print('random: points tried', len(rand), '| distinct a values', len(set(r[0] for r in rand)))
print(rand)`,
        precomputedOutput: `grid  : points tried 9 | distinct a values 3
random: points tried 9 | distinct a values 9
[(0.846, 7), (0.05, 9), (0.491, 5), (0.968, 6), (0.588, 4), (0.51, 5), (0.148, 2), (0.622, 5), (0.987, 9)]`,
        caption: 'Nine fits either way. The grid tests hyperparameter a at three values; random search tests it at nine.',
        annotations: {
          1: 'A list to hold the grid points. Each point will be a pair of settings.',
          2: 'Three chosen values for hyperparameter a. Pretend a is the one that actually matters.',
          3: 'Three chosen values for hyperparameter b. Pretend b barely affects anything.',
          4: 'Store the pair. The loop inside a loop gives 3 times 3 = 9 pairs in total.',
          5: 'g[0] for g in grid means "the a value of every pair". set(...) throws away duplicates, so len(set(...)) counts how many DISTINCT a values were ever tried. Answer: 3.',
          7: 'Python\'s built-in random number module.',
          8: 'Fix the random seed so this prints the same numbers for you as it did for me.',
          9: 'A list to hold the random points.',
          10: 'Nine draws, matching the grid\'s budget exactly. The underscore is the conventional name for a loop variable you never use.',
          11: 'random.uniform(0.01, 1.0) picks any decimal in that range — so a fresh value nearly every time. random.randint(1, 10) picks a whole number from 1 to 10. round(x, 3) keeps the printout short.',
          12: 'The same distinct-count as line 5, now on the random points. Answer: 9.',
          13: 'Print the actual pairs so you can see that no a value repeats.',
        },
      },
    },
    {
      type: 'note',
      md: `There is a second, blunter argument for random search. Suppose 5% of the possible settings are good enough for you. Each random draw has a 5% chance of landing in that region, so it misses with probability 0.95. Twenty independent draws all miss with probability 0.95 to the power of 20, which is 0.358 — so twenty draws find a good setting 64% of the time. Sixty draws miss with probability 0.95 to the power 60 = 0.046, so they succeed **95%** of the time. That is where the folklore "about 60 random trials is usually enough" comes from, and now you can derive it instead of quoting it.

**Bayesian optimisation** is the next step up: instead of drawing blindly, it fits a cheap model of "settings in, score out" from the trials finished so far and uses it to choose where to look next, spending more of the budget near settings that already scored well. Optuna is the library most people use for it. It pays off when a single training run is expensive; when fits are cheap, random search finds the answer before the extra cleverness earns its keep.`,
    },
    {
      type: 'intuition',
      title: 'Nested cross-validation, briefly',
      md: `We fixed the winner's curse with three fixed piles. **Nested cross-validation** is the same fix expressed as two loops instead.

- The **outer loop** is an ordinary k-fold. It exists only to *measure*. Each outer fold is set aside untouched.
- Inside each outer training set, an **inner loop** runs its own complete k-fold to *tune* — trying settings, comparing them, picking a winner. That inner loop never sees the outer fold.
- The chosen model is then scored once on the outer fold. Average those outer scores and you have an honest estimate of "my whole procedure, tuning included" rather than of one lucky setting.
- The cost is multiplication: 5 outer folds times 5 inner folds times 40 settings is 1,000 model trainings for one number.
- And it gives you a *number*, not a model to deploy. Most teams therefore use the cheap version — hold out a test set once, tune on the rest, report the test score — and simply know that it is a compromise.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: choosing between two models, by hand',
      md: `A team has 200 labelled support tickets and two candidate models. They run 5-fold cross-validation on each and bring you the fold scores.

- **Model A** folds: 0.900, 0.825, 0.900, 0.900, 0.800. **Model B** folds: 0.875, 0.900, 0.850, 0.875, 0.865.
- Model A mean: 0.900 + 0.825 + 0.900 + 0.900 + 0.800 = 4.325, divided by 5 = **0.8650**.
- Model B mean: 0.875 + 0.900 + 0.850 + 0.875 + 0.865 = 4.365, divided by 5 = **0.8730**. So B is ahead by 0.0080.
- Model A standard deviation, from earlier: **0.0436**.
- Model B standard deviation: gaps from its mean 0.873 are +0.002, +0.027, −0.023, +0.002, −0.008. Squared: 0.000004, 0.000729, 0.000529, 0.000004, 0.000064, adding to 0.001330. Divide by 5: 0.000266. Square root: **0.0163**.
- The difference in means is 0.0080. Model A alone wobbles by 0.0436 from fold to fold. **The gap is one fifth of the noise.** On this evidence B is not better than A.

What you can say, and it is worth saying: B is far more *consistent*. Its worst fold is 0.850 while A's worst is 0.800. If the ticket routing has to be reliable rather than occasionally brilliant, B's tighter spread is a genuine reason to prefer it — that is a decision about risk, not a claim that its mean is higher.

What to do next, in order: (1) run repeated cross-validation — the same 5-fold done with several different shuffles — to get more than five numbers before deciding; (2) if the choice still cannot be called, pick the simpler or cheaper model, because a 0.008 difference will not survive contact with next month's data; (3) whatever you pick, confirm it once on a test set that neither model's tuning ever saw.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: shuffling data that has a time order',
      md: `A team has 240 days of a metric that drifts slowly upward. They build a model and cross-validate it with ordinary shuffled 5-fold, because that is what everyone does. The score comes back at 0.974 out of a possible 1.0. They deploy it. It is useless.

Here is the setup, so you can see the trick the model is playing.

- The data is one column: the day number, 0 to 239. The target is roughly 0.05 times the day number, plus a bit of random noise. So it climbs steadily.
- The model is k-nearest-neighbours with k=5: to predict a day, it finds the 5 most similar days in its training data and averages their targets. "Similar" here means "closest day number".
- Under shuffled 5-fold, day 137 goes into the test set while days 135, 136, 138 and 139 sit in the training set. The model is being asked about a day whose immediate neighbours it has already been told the answer for. That is not forecasting, it is looking it up.
- In real use you predict day 240 having only seen days 0 to 239. There are no neighbours on the far side. The model must extrapolate, and k-nearest-neighbours cannot extrapolate at all — beyond the end of its training data it just keeps repeating the last average it knows.

Run both ways of cutting and compare.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Shuffled folds versus forward-chaining folds',
      code: `import numpy as np
from sklearn.neighbors import KNeighborsRegressor
from sklearn.model_selection import cross_val_score, KFold, TimeSeriesSplit

t = np.arange(240).reshape(-1, 1)
rng = np.random.default_rng(0)
target = 0.05 * t.ravel() + rng.normal(0, 0.5, 240)

knn = KNeighborsRegressor(n_neighbors=5)
shuffled = cross_val_score(knn, t, target, cv=KFold(5, shuffle=True, random_state=0))
forward = cross_val_score(knn, t, target, cv=TimeSeriesSplit(5))
print('shuffled 5-fold :', [round(float(s), 3) for s in shuffled], 'mean', round(float(shuffled.mean()), 3))
print('forward-chaining:', [round(float(s), 3) for s in forward], 'mean', round(float(forward.mean()), 3))

# ---- real output ----
# shuffled 5-fold : [0.974, 0.98, 0.97, 0.977, 0.97] mean 0.974
# forward-chaining: [-2.074, -1.704, -1.081, -5.554, -2.017] mean -2.486`,
      annotations: {
        1: 'numpy, for building the day numbers.',
        2: 'The nearest-neighbours model described above, in its regression form (it predicts a number, not a class).',
        3: 'cross_val_score and the two fold-cutters we are comparing.',
        5: 'np.arange(240) counts 0 to 239. .reshape(-1, 1) turns that flat list into a column, because sklearn always expects rows-by-columns input; the -1 means "work out this dimension yourself".',
        6: 'A random number generator with a fixed seed, so the noise below is the same for you as for me.',
        7: 't.ravel() flattens the column back to a flat list so the arithmetic is easy. The target is 0.05 per day of steady climb, plus rng.normal(0, 0.5, 240): 240 random wobbles centred on 0 with a typical size of 0.5.',
        9: 'The model: predict a day by averaging the 5 nearest days it was trained on.',
        10: 'shuffle=True mixes the days up before cutting the folds, so each test fold is scattered across the whole timeline. This is the mistake, written out.',
        11: 'TimeSeriesSplit(5) instead cuts the timeline into blocks in order: train on the earliest block, test on the next, then extend the training block and roll forward. No future day is ever in a training set. This is what the deployed model will actually face.',
        12: 'Print the five shuffled scores and their mean. For a regressor, cross_val_score reports R-squared: 1.0 is a perfect fit, 0.0 means "no better than always predicting the average", and negative means worse than that.',
        13: 'The same for the forward-chaining scores.',
      },
    },
    {
      type: 'intuition',
      title: 'Diagnosing it',
      md: `**Shuffled: 0.974. Forward-chaining: −2.486.** The same model and the same 240 rows produced a near-perfect score and a catastrophic one.

- 0.974 is close to 1.0, so the shuffled setup says the model explains almost all the movement in the data. That is the number that went in the deck.
- −2.486 is *negative*, which for R-squared means the model does worse than a rule that ignores the input and always predicts the average. That is the number that reflects real use.
- The mechanism is not subtle once you see it: under shuffling, roughly four out of every five neighbouring days are in the training set, so every test day has its answer effectively surrounded. The model interpolates between two known points, which is easy. Forward-chaining asks it to continue past the end of everything it has seen, which for this model is impossible — it flattens out while the true series keeps climbing, and the error grows with every day.
- The tell that this is leakage and not ordinary overfitting: the gap appears the moment you change *how the data is cut*, with the model untouched. Overfitting would show up as a poor score under both cutters.
- The fix is the cutter, not the model. Use TimeSeriesSplit. If your label describes something 7 days ahead, also leave a 7-day gap between the end of each training block and the start of its test block, otherwise the last few training rows already contain the answer.

The honest cost of doing it right: forward-chaining trains its first fold on very little history, so its early folds are pessimistic. Your reported number will be lower than the shuffled one. That is not a loss of accuracy. It is the deletion of a number that was never true.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work these with pen and paper first. All the arithmetic is small.

1. You have 12 rows numbered 0 to 11 and you want 4 folds of equal size, cut in contiguous blocks. Write out the four folds, and then write the training row numbers for round 2.
2. A 5-fold cross-validation gives scores 0.70, 0.90, 0.80, 0.85, 0.75. Compute the mean and the standard deviation by hand. A second model scores a mean of 0.83. Is it better?
3. A dataset has 50 rows of which 6 are class 1. You run plain 5-fold. What is the largest number of folds that could contain zero class-1 rows, and what does stratified k-fold guarantee instead?
4. You have 3 hyperparameters and a budget of 27 model trainings. A grid uses 3 values of each. If only one hyperparameter actually affects the score, how many distinct values of it does the grid test, and how many would random search test?
5. A teammate tunes 200 settings on a validation set, picks the best at 0.91, and reports 0.91 as the model's accuracy. Name what is wrong in one sentence, and say the one measurement that would settle it.`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `Check each step against your own working, not only the final answer.

1. 12 rows into 4 folds means 12 // 4 = 3 rows per fold. Fold 0 = [0, 1, 2], fold 1 = [3, 4, 5], fold 2 = [6, 7, 8], fold 3 = [9, 10, 11]. Round 2 tests on fold 2, so it trains on everything else: **[0, 1, 2, 3, 4, 5, 9, 10, 11]** — 9 training rows, 3 test rows, no overlap.
2. Sum = 0.70 + 0.90 + 0.80 + 0.85 + 0.75 = 4.00, so the **mean is 0.8000**. Gaps from the mean: −0.10, +0.10, 0.00, +0.05, −0.05. Squared: 0.0100, 0.0100, 0.0000, 0.0025, 0.0025, adding to 0.0250. Divide by 5: 0.0050. Square root: **0.0707**. The second model is 0.03 ahead, which is well inside a fold-to-fold wobble of 0.0707, so **no, you cannot call it better** — you can only say the two are indistinguishable on this data.
3. 50 rows into 5 folds gives 10 rows per fold, and there are only 6 class-1 rows to go round. In the worst case all 6 land inside a single fold, leaving **4 folds with zero class-1 rows**. Stratified k-fold instead spreads them: 6 positives over 5 folds gives one fold with 2 and four folds with 1, so **every fold contains at least one**, and every fold's score actually measures something about class 1.
4. The grid tests each hyperparameter at exactly **3 distinct values**, no matter that it spent 27 trainings (3 × 3 × 3 = 27) doing it — the other 24 runs re-tested those same 3 values while wiggling knobs that do nothing. Random search with 27 draws tests **27 distinct values** of the one that matters. Nine times the resolution for the identical budget, which is the whole argument for random search.
5. The wrong part: 0.91 is the maximum of 200 noisy measurements taken on the same rows, so it is inflated by whichever setting got the luckiest on that particular validation set — the winner\'s curse. The settling measurement: score that one chosen setting on a **test set that took no part in the search**, and report that number instead.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. These are the ideas you will meet next, named here so the words are not new later.

- **Repeated k-fold.** Run the whole 5-fold procedure several times with different shuffles and pool all the scores. Five folds give you five numbers, which is a thin basis for a standard deviation; five repeats give you twenty-five. It is the cheapest real improvement to the estimate you have, and it costs exactly as many extra fits as repeats.
- **How Bayesian optimisation actually chooses.** It keeps a cheap model of the score surface and an *acquisition function* that scores each candidate setting by a blend of "the surface predicts this will be good" and "the surface is very unsure here, so trying it teaches us a lot". Optuna\'s default, TPE, does it by modelling the settings of the good trials and the bad trials separately and preferring settings that look far more like the good group. Optuna can also *prune*: a trial reporting weak intermediate scores is killed before finishing.
- **Successive halving and Hyperband.** Race many settings against each other on a small budget — few trees, few epochs, a fraction of the data — throw away the worst half, double the budget for the survivors, repeat. It finds good settings with far less total compute than running everything to completion, at the risk of eliminating a setting that only shines when trained fully.
- **Preprocessing must live inside the fold.** If you scale your features, or fill in missing values, or select features by their correlation with the target, and you do it *before* cutting the folds, then every fold's training data has been shaped by information from the rows it is about to be tested on. sklearn\'s \`Pipeline\` object exists to prevent this: it bundles the preprocessing and the model together so \`cross_val_score\` refits the preprocessing separately on each fold's training portion. Moving a step inside a Pipeline usually makes the score go *down*, and the smaller number is the true one.
- **What sklearn does when you write cv=5.** Passing a plain integer with a classifier silently gives you StratifiedKFold; with a regressor it gives you KFold. Passing your own \`KFold(5)\` object turns stratification off without warning you. Worth knowing before you wonder why your scores changed.`,
    },
  ],
  quiz: [
    {
      question: 'The same model on the same 200 rows scored 0.825, 0.850, 0.875, 0.925 and 0.825 across five different 80/20 splits. What does that tell you?',
      options: [
        {
          text: 'A single test score on 40 rows carries a large uncertainty, so one number on its own is not a result',
          explanation: 'Correct. Nothing changed except which rows landed in the test pile. Any one of those five numbers, reported alone, would look like a fact.',
        },
        { text: 'The model is unstable and should be replaced', explanation: 'The model was rebuilt identically each time with random_state fixed. The variation lives in the measurement, not in the model.' },
        { text: 'The training set is too small', explanation: 'More training data would help in general, but it is the small TEST set of 40 rows that makes the score jump around this much.' },
      ],
      correct: 0,
    },
    {
      question: 'Five folds score 0.900, 0.825, 0.900, 0.900, 0.800 — mean 0.865, standard deviation 0.044. A rival model has a cross-validation mean of 0.873. What can you claim?',
      options: [
        { text: 'The rival is better by 0.008 and should be shipped', explanation: 'The gap of 0.008 is about a fifth of the 0.044 fold-to-fold wobble. That is reading noise as a result.' },
        {
          text: 'Nothing yet — the difference is much smaller than the spread, so the two are indistinguishable on this data',
          explanation: 'Correct. A difference only means something when it is large relative to how much the measurement itself moves. Repeated cross-validation would give you more numbers to decide with.',
        },
        { text: 'The rival is worse, because a higher mean with unknown folds is suspicious', explanation: 'There is no reason to call it worse either. The honest answer is that this evidence cannot separate them.' },
      ],
      correct: 1,
    },
    {
      question: 'On a 60-row dataset with 5 positives, plain KFold gave test-fold positive counts of [2, 2, 0, 1, 0]. Why does that ruin the average?',
      options: [
        { text: 'The folds are unequal in size', explanation: 'The folds were 12 rows each. The imbalance is in which CLASS landed where, not in fold size.' },
        {
          text: 'Two folds contained no positives at all, so those two scores measured performance on class 0 only, yet they count equally in the mean',
          explanation: 'Correct. On those rounds a model that answers class 0 to everything scores perfectly, so two of your five numbers carry no information about the thing you care about.',
        },
        { text: 'Five positives is too few to model at all, so cross-validation cannot help', explanation: 'Five is very few, but stratified k-fold still puts one in each fold and gives you five scores that at least all measure the same thing.' },
      ],
      correct: 1,
    },
    {
      question: 'A search over 40 settings picked a winner scoring 0.900 on the validation set; the same model scored 0.725 on the untouched test set. What happened?',
      options: [
        { text: 'The test set is harder than the validation set, so the test number should be discarded', explanation: 'Both sets were cut at random from the same 200 rows. The asymmetry comes from the fact that one of them was used to choose the winner.' },
        { text: 'The model overfitted the training rows', explanation: 'Overfitting the training rows would show up as a poor score on BOTH held-out sets. Here validation was fine and only the truly unseen set fell over.' },
        {
          text: 'Picking the maximum of 40 noisy validation scores selects for luck as well as quality, so the winner\'s validation score is inflated',
          explanation: 'Correct — the winner\'s curse. The average validation score across all 40 settings was 0.848, and 0.725 on unseen rows is the honest reading.',
        },
      ],
      correct: 2,
    },
    {
      question: 'With a budget of 9 fits and 2 hyperparameters, why does random search usually beat a 3-by-3 grid?',
      options: [
        {
          text: 'The grid tests each hyperparameter at only 3 distinct values however many fits it spends, while 9 random draws test 9 distinct values of each — so the one that matters gets far more resolution',
          explanation: 'Correct. Since you do not know in advance which hyperparameter matters, spending resolution on all of them at once is the better bet.',
        },
        { text: 'Random search trains faster per fit', explanation: 'A fit costs the same either way. The difference is entirely in which settings get tried.' },
        { text: 'Random search cannot get stuck in a local optimum', explanation: 'Neither method climbs anywhere, so neither can get stuck. Both just try points and keep the best.' },
      ],
      correct: 0,
    },
    {
      question: 'On 240 days of a steadily climbing series, shuffled 5-fold scored 0.974 while TimeSeriesSplit scored −2.486. What is the correct reading?',
      options: [
        { text: 'TimeSeriesSplit is broken — a negative score is impossible', explanation: 'R-squared is negative whenever a model does worse than always predicting the average, which is exactly what happens when this model is forced to extrapolate.' },
        {
          text: 'Shuffling puts future days in the training set, so the model interpolates between known neighbours instead of forecasting; the −2.486 is what real use looks like',
          explanation: 'Correct. The model is unchanged between the two lines; only the way the data was cut changed, which is the signature of leakage rather than overfitting.',
        },
        { text: 'The model needs more neighbours than k=5', explanation: 'Changing k moves both numbers a little but cannot fix the fact that the shuffled setup is answering a question the deployed model will never be asked.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain k-fold cross-validation to someone who only knows train/test split, and say what problem it actually solves.',
      answer:
        'Cut the data into k equal folds. Run k experiments: in each one, a different fold is the test set and the other k−1 folds are joined as the training set. That gives you k scores. What it solves is measurement noise, not overfitting. A single split gives one score with an unknown error bar — on 200 rows I have measured the same model scoring anywhere from 0.825 to 0.925 depending only on which rows landed in the test pile. k-fold gives you a mean and a standard deviation, so you can tell whether a 0.01 improvement means anything. It also lets every row be tested exactly once, which matters when data is scarce. The cost is k trainings instead of one.',
      isCaseBased: false,
    },
    {
      question: 'What does increasing k trade off, and why is leave-one-out not automatically the best choice?',
      answer:
        'A larger k means each fold trains on more of the data, so each fold model is closer to the model you will finally ship on all the data, and the estimate is less pessimistic. But larger k also means the k training sets overlap almost entirely, so the k scores are highly correlated and averaging them cancels less noise than the count suggests — and you pay k trainings. Leave-one-out is the extreme case, k equal to the number of rows: 200 rows means 200 trainings, each judged on a single row, and 200 models that differ from each other by one row. Minimum pessimism, maximum cost, and a noisy estimate. In practice k=5 is the default, k=10 or repeated k-fold on small data, and a single large hold-out when data is plentiful and each fit is expensive.',
      isCaseBased: false,
    },
    {
      question: 'Define parameter and hyperparameter, and explain why you find them by completely different methods.',
      answer:
        'Parameters are the numbers the fitting procedure works out from the data: the coefficients in a linear model, the split thresholds in a tree, the weights in a network. Hyperparameters are the settings you choose before fitting, which control how the fitting happens: regularisation strength, tree depth, k in k-nearest-neighbours, learning rate. The test is simple — if .fit() changes it, it is a parameter; if you had to type it before calling .fit(), it is a hyperparameter. They are found differently because training has a direct method for parameters, whereas changing a hyperparameter changes the whole fitting procedure, so there is no way to solve for it. The only way to compare max_depth=4 with max_depth=6 is to train both models and score them on held-out data. That is why every tuning method is some version of "try a setting, measure it, decide where to try next".',
      isCaseBased: false,
    },
    {
      question: 'Grid search versus random search on an equal compute budget. Make the argument precisely.',
      answer:
        'The premise is that performance usually depends strongly on one or two hyperparameters and barely on the rest, and you do not know which in advance. A grid with v values across d hyperparameters spends v to the power d fits but tests each individual hyperparameter at only v distinct values — so along the axis that matters, its resolution is v no matter how large the budget grows. Random search with n trials tests n distinct values of every hyperparameter, because each draw is fresh. Concretely, nine fits: a 3-by-3 grid tests the important knob at 3 values, nine random draws test it at 9. There is a second argument too. If 5% of the search space is good enough, one draw misses with probability 0.95, so sixty draws all miss with probability 0.95 to the power 60, which is 0.046 — sixty random trials find a good setting about 95% of the time. Random search also handles continuous ranges, can be stopped at any point, and parallelises perfectly. Grid still wins when you have one or two genuinely discrete settings you must cover exhaustively.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague reports 0.94 AUC in cross-validation on a churn model. In production it does 0.72. Walk through your diagnosis.',
      answer:
        'A 22-point gap is almost never plain overfitting, so I assume leakage until shown otherwise, and I check the cheapest causes first. One, group leakage: are there several rows per customer? If so, the same customer appears in both the training and the test fold and the model can score well by recognising the customer instead of predicting churn. Switch to GroupKFold on customer id and expect the score to fall to something honest. Two, time leakage: was the data shuffled even though it is time-ordered? Rebuild with TimeSeriesSplit, and add a gap between train and test equal to the horizon the label describes. Three, feature leakage: is any feature computed from information that will not exist at prediction time — a post-churn event, a target encoding fitted on all rows, a scaler fitted before the split? Everything that learns from data must sit inside a Pipeline so it is refitted per fold. Four, only after those: distribution shift, and the inflation from tuning many settings on the same folds. The tell that separates the first three from the fourth is timing — leakage shows up as a fixed gap between cross-validation and production from day one, while drift shows up as a score that decays over the weeks.',
      isCaseBased: true,
    },
    {
      question: 'Case: your team ran 5,000 tuning trials on a 3,000-row dataset. The best validation score is 0.91, up from a 0.86 baseline. Do you believe it?',
      answer:
        'Not on that evidence. The reported 0.91 is the maximum of 5,000 noisy estimates, so it is inflated by selection — the winner\'s curse — and the inflation grows with the number of trials. I have measured this on a small dataset: forty settings, best validation 0.900, the same model on untouched rows 0.725. Four checks. One, what is the fold-to-fold standard deviation for the winner? If it is 0.04, then a 0.05 gain is inside the noise. Two, is the winner an isolated spike or does it sit on a plateau of similar settings? A lone spike is usually luck; a broad well-scoring region usually is not. Three, score the winner once on a test set that took no part in the search — that is the only clean number available. Four, score a sensible-defaults model on that same test set, because the honest gain over defaults is often a fraction of the gain the search claimed. Going forward: cap the trial budget relative to dataset size, use repeated cross-validation so each trial is judged on more folds, and if the estimate genuinely must be unbiased, use nested cross-validation and accept the cost.',
      isCaseBased: true,
    },
    {
      question: 'Case: your cross-validation score drops 4 points when you move feature scaling from before the split to inside a Pipeline. Which number do you trust?',
      answer:
        'The lower one. Fitting the scaler on the full dataset lets every validation fold\'s mean and variance influence the transform applied to the training data — a small but real leak of information from rows the model is about to be judged on, and it inflated the original number. Inside a Pipeline, cross_val_score refits the scaler on each fold\'s training portion only, so the validation fold is genuinely unseen. You did not lose four points of accuracy; you deleted four points of illusion. The same argument applies with a much larger effect to target or mean encoding, imputation statistics, feature selection by correlation with the target, and resampling methods like SMOTE — all of them learn from data and so all of them must be refitted per fold. A useful side observation: the size of the drop tells you how leaky the step was. A StandardScaler usually leaks a fraction of a point; a target encoder can leak ten.',
      isCaseBased: true,
    },
    {
      question: 'Case: after thousands of trials your best score is 0.913 and the runner-up is 0.905, with a fold standard deviation of 0.03. What do you do?',
      answer:
        'I do not treat the ranking at the top as meaningful. A gap of 0.008 inside a noise band of 0.03 is not a measurable difference, and with thousands of trials the top of the list is exactly where selection luck concentrates. Three concrete steps. First, look at the shape of the region rather than the single point: if a group of nearby settings all score around 0.905 to 0.913, prefer a setting from the middle of that group, because a broad plateau survives a change of data and a lone spike usually does not. Second, if the two finalists differ in cost or complexity, take the cheaper and simpler one — there is no evidence to pay for the other. Third, settle it on the test set that the search never touched, and report that number rather than either search score. What I would not do is run more trials to break the tie: more trials make the top score more inflated, not more reliable, because you are searching harder for a setting that got lucky on these particular folds.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Why one train/test split is not a result', back: 'The score depends on which rows landed in the test pile. Same model, same 200 rows, five different splits: 0.825, 0.850, 0.875, 0.925, 0.825 — a 10-point range with nothing about the model changed.' },
    { front: 'Fold, and k-fold cross-validation', back: 'A fold is one equal chunk of the data. k-fold: cut into k folds, run k experiments where each fold is the test set once and the other k−1 are joined for training. Output: k scores, so you get a mean AND a spread. Cost: k trainings.' },
    { front: 'The mean is not the whole story', back: 'Folds 0.900, 0.825, 0.900, 0.900, 0.800 give mean 0.865 and standard deviation 0.0436. A rival mean of 0.873 is only 0.008 better — one fifth of the noise, so it is not better at all.' },
    { front: 'Stratified k-fold, and why classification needs it', back: 'Every fold keeps roughly the whole dataset\'s class proportions. On 60 rows with 5 positives, plain KFold gave positives per fold [2, 2, 0, 1, 0] — two folds measured nothing about the rare class. Stratified gave [1, 1, 1, 1, 1].' },
    { front: 'Group k-fold and the leak it stops', back: 'All rows belonging to one patient, user or shop go into the same fold. Without it the model scores well by recognising the group across the train/test boundary rather than by predicting the outcome. Expect the honest score to be lower.' },
    { front: 'The winner\'s curse', back: 'Pick the best of many noisy validation scores and you select for luck as well as quality. Measured: 40 settings, best validation 0.900 (average across all 40 was 0.848), same model on untouched test rows 0.725. Fix: a test set the tuning never sees.' },
    { front: 'Grid vs random search', back: 'A v-value grid over d knobs costs v^d fits but tests each knob at only v values. n random draws test n distinct values of every knob. If 5% of settings are good enough, 60 draws find one with probability 1 − 0.95^60 = 0.954.' },
    { front: 'Nested cross-validation, in one line', back: 'An inner k-fold loop tunes the hyperparameters; an outer k-fold loop measures the tuned result on folds the inner loop never saw. Honest estimate of the whole procedure. Cost: outer × inner × settings fits, and it returns a number, not a deployable model.' },
  ],
  mindmapMarkdown: `- Cross-Validation & Tuning
  - The problem with one split
    - 200 rows, 40-row test set
    - five splits: 0.825 0.850 0.875 0.925 0.825
    - 10-point range, model unchanged
  - k-fold, built by hand
    - fold = one equal chunk of rows
    - 20 rows, K=5, size=4 per fold
    - rotate: each fold is test exactly once
    - 200 rows: [0.9, 0.825, 0.9, 0.9, 0.8]
    - mean 0.865, spread 0.100, std 0.0436
  - The spread matters
    - report mean give-or-take
    - 0.008 gap inside 0.044 noise = no result
    - wide spread = tiny data or uneven folds
  - Choosing the cutter
    - stratified: keeps class balance per fold
    - plain KFold on 5 positives: [2,2,0,1,0]
    - leave-one-out: k = n rows, costly, noisy
    - group k-fold: all of one patient in one fold
    - time-series split: train past, test future
  - Tuning vocabulary
    - parameter = learned by .fit()
    - hyperparameter = set before .fit()
    - grid search = every combination
    - random search = n fresh draws
    - Bayesian / Optuna = learns where to look
  - The winner's curse
    - 40 settings, best validation 0.900
    - average across all 40: 0.848
    - same model, untouched test: 0.725
    - fix: train / validation / test, three piles
  - Grid vs random
    - 3x3 grid = 9 fits, 3 values per knob
    - 9 random draws = 9 values per knob
    - 1 - 0.95^60 = 0.954
  - Nested CV
    - inner loop tunes
    - outer loop measures
    - cost outer x inner x settings
  - The classic mistake
    - shuffled 5-fold on 240 days: 0.974
    - TimeSeriesSplit on the same data: -2.486
    - shuffling puts the future in training
    - fix the cutter, not the model`,
}

export default m
