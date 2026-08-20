import type { Module } from '../types'

const m: Module = {
  id: 'ml-l2-class-imbalance',
  subjectId: 'ml',
  level: 2,
  title: 'Class Imbalance: When 98% Accuracy Is Worthless',
  whyItMatters:
    'Fraud, disease, spam, churn — the thing you want to find is almost always the rare thing. When only 2 rows in 100 are the interesting ones, a model that never says "interesting" still gets 98 rows right, and the usual score says it is excellent. This module shows that failure with real counts, then shows the three things you can actually do about it — change the data, change the loss, or change the cut-off — with the precision and recall each one produces on one shared dataset.',
  assumes: [
    'Read *The Confusion Matrix: Precision, Recall & F1* in the Metrics & Losses subject first. This module uses precision and recall constantly and does not re-derive them.',
    'You know what a percentage is and can divide two numbers',
    'You have seen a Python list, a for loop, and an if statement',
    'You have seen a model being trained in scikit-learn once (fit, then predict). Every call used here is explained anyway.',
  ],
  estMinutes: 35,
  sections: [
    {
      type: 'intuition',
      title: 'A model that does nothing and scores 98%',
      md: `A bank hands you 1,000 card transactions. 20 of them are fraud. 980 are normal.

- I write a "model" that ignores the input and always answers **not fraud**. One line, no training.
- How many rows did it label correctly? Every normal row, and no fraud row. That is **980 correct out of 1,000**.
- 980 / 1000 = **0.98**. Ninety-eight percent.
- How much fraud did it catch? **0 out of 20**. It has never said the word fraud in its life.
- So the score is 98% and the value is zero rupees.

Nothing lied to you. The score answered the question "what fraction of all rows did you label right?" — and 980 of the 1,000 rows were the boring kind. The bank was asking a different question: "of the 20, how many did you find?" Those are not the same question, and on this data they give wildly different answers.`,
    },
    {
      type: 'intuition',
      title: 'The words for this situation',
      md: `Four terms, all defined here, all used for the rest of the module.

- **Class imbalance** — one label appears far more often than the other. 980 normal against 20 fraud is imbalance. 500 against 500 is not.
- **Majority class** — the common label. Here, normal (980 rows). **Minority class** — the rare label. Here, fraud (20 rows). The minority class is almost always the one you actually care about, because rare things are the interesting things.
- **Positive class** — the label you are trying to detect, written as 1. Fraud is the positive class. Normal is 0. "Positive" does not mean good; it means "the thing we are hunting".
- **Majority-class baseline** — the score you get by always answering with the majority label. It is just 1 minus the fraction of positives: 1 − 0.02 = 0.98. Compute this number before you report any accuracy. If your model does not clearly beat it, you have not built anything.

Run the count rather than trusting the arithmetic above.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The 98% trap, counted by hand in plain Python',
      code: `labels = [1] * 20 + [0] * 980
guesses = [0] * 1000

correct = 0
for i in range(1000):
    if guesses[i] == labels[i]:
        correct = correct + 1

caught = 0
for i in range(1000):
    if guesses[i] == 1 and labels[i] == 1:
        caught = caught + 1

print('accuracy', correct, '/ 1000 =', correct / 1000)
print('fraud caught', caught, 'out of 20')

# ---- real output ----
# accuracy 980 / 1000 = 0.98
# fraud caught 0 out of 20`,
      annotations: {
        1: 'Builds the true labels. [1] * 20 is Python list repetition: it makes a list of twenty 1s. + glues the two lists end to end, giving 20 frauds followed by 980 normals — 1,000 entries.',
        2: 'The model’s answers: a list of 1,000 zeros. Zero means "not fraud". This is the whole model.',
        4: 'A counter, starting at zero. We add 1 to it every time the answer matched the truth.',
        5: 'range(1000) produces 0, 1, 2, ... 999 — one position per row. i is the row we are looking at.',
        6: '== asks whether the guess for row i equals the true label for row i. Both lists are in the same order, so position i means the same transaction in both.',
        7: 'Adds one to the counter. This fires 980 times, once per normal row.',
        9: 'A second counter, this one only for fraud we actually flagged.',
        10: 'The same loop over the same 1,000 rows, asking a different question.',
        11: '"and" means both halves must be true: we said fraud AND it really was fraud. Since every guess is 0, the first half is never true, so this never fires.',
        12: 'Would add one to caught. It never runs.',
        14: 'Prints 980 and the division 980/1000 = 0.98. The accuracy that looks excellent.',
        15: 'Prints 0. The number that matters, and it is zero. One model, two numbers, opposite verdicts.',
      },
    },
    {
      type: 'intuition',
      title: 'Measure the positives only',
      md: `Accuracy failed because it counted the 980 boring rows. The fix is to use numbers that never look at them.

- **Precision** — of the rows I flagged as fraud, what fraction really were fraud? It is TP / (TP + FP). It measures wasted effort.
- **Recall** — of the frauds that existed, what fraction did I flag? It is TP / (TP + FN). It measures misses.
- **F1** — one number combining the two. It is only high when *both* are high, so a model with perfect precision and zero recall scores 0.
- All three ignore the true negatives entirely. The 980 quiet rows never enter any of these formulas. That is exactly why they survive imbalance.

Those three are built from scratch, with worked counts, in *The Confusion Matrix: Precision, Recall & F1*. Threshold-free summaries — ROC-AUC and PR-AUC, and why the first one flatters you when positives are rare — are built in *ROC, AUC & PR Curves: Judging a Model at Every Threshold*. Read those for the definitions; this module only uses them.`,
    },
    {
      type: 'intuition',
      title: 'Three places you can intervene, and only three',
      md: `Everything ever done about imbalance changes one of three things. Naming which one you touched is most of the skill.

- **Change the DATA — resampling.** Edit the training rows so the two classes are closer in size. **Oversampling** adds copies of minority rows. **Undersampling** deletes majority rows. **SMOTE** invents new minority rows.
- **Change the LOSS — class weights.** Leave every row where it is, but tell the training procedure that a mistake on a fraud row counts many times more than a mistake on a normal row.
- **Change the DECISION — threshold moving.** Leave the data and the trained model alone, and only change the cut-off at which a predicted probability becomes a "yes".

The next four snippets run all three on one dataset, so the precision and recall numbers are directly comparable. First we need that dataset and a plain, untouched model to compare against.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The shared dataset and the untouched baseline model',
      code: `from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import confusion_matrix

X, y = make_classification(n_samples=5000, n_features=8, n_informative=4,
                           n_redundant=0, n_clusters_per_class=1,
                           weights=[0.98], flip_y=0.0, class_sep=0.3,
                           random_state=0)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, stratify=y, random_state=0)
print('test rows', len(yte), ' fraud rows in test', yte.sum())
plain = LogisticRegression(max_iter=2000).fit(Xtr, ytr)
tn, fp, fn, tp = confusion_matrix(yte, plain.predict(Xte)).ravel()
print('caught', tp, ' missed', fn, ' false alarms', fp)

# ---- real output ----
# test rows 1500  fraud rows in test 30
# caught 13  missed 17  false alarms 0`,
      annotations: {
        1: 'make_classification builds a fake dataset with labels we control, so the imbalance is exactly the shape we want to study.',
        2: 'train_test_split cuts rows into a training part and a testing part.',
        3: 'LogisticRegression is a standard classifier. It outputs a probability between 0 and 1 for each row.',
        4: 'confusion_matrix counts the four outcomes: correct negatives, false alarms, misses, correct catches.',
        6: 'Asks for 5,000 rows, 8 columns of features, of which 4 actually carry signal about the label.',
        7: 'n_redundant=0 means no column is a copy of another. n_clusters_per_class=1 keeps each class a single blob, so the picture stays simple.',
        8: 'weights=[0.98] is the imbalance dial: 98% of rows get label 0, so 2% are fraud. flip_y=0.0 turns off random label noise. class_sep=0.3 keeps the two classes heavily overlapping, which is what makes this a hard, realistic problem.',
        9: 'random_state=0 fixes the random draws so you get these exact numbers when you run it.',
        10: 'Holds out 30% of rows for testing. stratify=y forces both halves to keep the same 2% fraud rate — without it a random cut can hand the test set almost no frauds and the measurement becomes noise.',
        11: 'yte.sum() adds up the test labels, and since fraud is 1 and normal is 0, the sum IS the number of frauds. 1,500 test rows, 30 of them fraud.',
        12: 'fit() trains on the training rows only. max_iter=2000 just gives the optimiser enough steps to settle; it is not a modelling choice.',
        13: 'predict() applies the default rule: probability above 0.5 means fraud. .ravel() flattens the 2x2 count table into four plain numbers, in the order tn, fp, fn, tp.',
        14: 'The result: 13 of 30 frauds caught, 17 missed, and not one false alarm. Accuracy here is 1483/1500 = 0.9887 — better than the 0.98 baseline, yet it misses more than half the fraud.',
      },
    },
    {
      type: 'note',
      md: `Precision on that baseline is 13/13 = **1.000** and recall is 13/30 = **0.433**. The model has learned something real — every alarm it raises is genuine — but it only speaks up when a row is blatant, because at a 0.5 cut-off almost nothing rare gets over the line. Hold those two numbers. Every fix below is judged against them.`,
    },
    {
      type: 'intuition',
      title: 'Fix 1 — change the loss: class weights',
      md: `While training, the model repeatedly asks "how badly am I doing?" and adjusts itself to make that number smaller. That number is the **loss**, and every row contributes to it.

- With 2% positives, ignoring all fraud is cheap: it only spoils 2% of the rows, so the loss stays low and the model is not pushed to fix it.
- **Class weights** multiply each row’s contribution before it is added up. Give fraud rows a weight of 25 and normal rows a weight of 0.51, and one missed fraud now hurts about fifty times as much as one false alarm.
- Ignoring fraud stops being cheap, so training moves the boundary to catch more of it.
- In scikit-learn this is one keyword: \`class_weight='balanced'\`. It sets each class’s weight to total_rows / (2 × rows_in_that_class). Here: 3500 / (2 × 70) = 25 for fraud, 3500 / (2 × 3430) = 0.51 for normal.
- No row is added, deleted, or invented — which is why this fix cannot leak anything into your test set.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Same data, same model, weighted loss',
      code: `weighted = LogisticRegression(max_iter=2000, class_weight='balanced').fit(Xtr, ytr)
tn, fp, fn, tp = confusion_matrix(yte, weighted.predict(Xte)).ravel()
print('caught', tp, ' missed', fn, ' false alarms', fp)
print('precision %.3f' % (tp / (tp + fp)))
print('recall    %.3f' % (tp / (tp + fn)))

# ---- real output ----
# caught 26  missed 4  false alarms 236
# precision 0.099
# recall    0.867`,
      annotations: {
        1: 'The only change from the baseline is class_weight=\'balanced\'. Same rows, same algorithm, same split.',
        2: 'Counts the four outcomes on the same untouched test set, so the comparison is fair.',
        3: 'Prints the raw counts: 26 caught, 4 missed, 236 false alarms.',
        4: 'precision = 26 / (26 + 236) = 0.099. The %.3f is a format spec meaning "print this float with 3 decimals"; the % in front of the brackets substitutes the value into the text.',
        5: 'recall = 26 / (26 + 4) = 0.867. Recall doubled from 0.433, and precision fell from 1.000 to 0.099. That is the trade, in numbers.',
      },
    },
    {
      type: 'intuition',
      title: 'Fix 2 — change the decision: threshold moving',
      md: `The model never outputs "fraud". It outputs a number between 0 and 1, and something turns that number into a label. That something is a cut-off, and by default it is 0.5.

- **Threshold moving** means picking a different cut-off. Nothing is retrained; the same probabilities are read differently.
- 0.5 is the right cut-off in exactly one situation: equal-sized classes and equally expensive mistakes. You have neither.
- Lower the cut-off to 0.1 and every row the model scores above 0.1 becomes an alarm. More frauds clear the bar, and so do more innocent rows: recall rises, precision falls.
- This costs one line and is reversible. Try it before you touch the data.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'One trained model, five cut-offs',
      code: `prob = plain.predict_proba(Xte)[:, 1]
for t in [0.5, 0.2, 0.1, 0.05, 0.02]:
    pred = (prob >= t).astype(int)
    tn, fp, fn, tp = confusion_matrix(yte, pred).ravel()
    precision = tp / (tp + fp) if tp + fp > 0 else 0.0
    recall = tp / (tp + fn)
    print('t=%.2f  caught=%2d  false_alarms=%3d  precision=%.3f  recall=%.3f'
          % (t, tp, fp, precision, recall))

# ---- real output ----
# t=0.50  caught=13  false_alarms=  0  precision=1.000  recall=0.433
# t=0.20  caught=18  false_alarms=  0  precision=1.000  recall=0.600
# t=0.10  caught=22  false_alarms= 11  precision=0.667  recall=0.733
# t=0.05  caught=25  false_alarms= 63  precision=0.284  recall=0.833
# t=0.02  caught=27  false_alarms=226  precision=0.107  recall=0.900`,
      annotations: {
        1: 'predict_proba returns two columns per row: the probability of class 0 and of class 1. [:, 1] is numpy slicing meaning "every row, column 1" — so prob holds the fraud probability for each test row. This is the ORIGINAL baseline model, untouched.',
        2: 'Loops over five candidate cut-offs, largest first.',
        3: 'prob >= t compares all 1,500 numbers at once and gives 1,500 True/False values. .astype(int) turns True into 1 and False into 0, producing labels.',
        4: 'Counts the four outcomes for this particular cut-off.',
        5: 'precision = caught / flagged. The "if ... else 0.0" guard avoids dividing by zero when a very high cut-off flags nothing at all.',
        6: 'recall = caught / frauds that exist. Its denominator is always 30, so it can never divide by zero.',
        7: 'Builds the report line. %2d and %3d pad the integers to a fixed width so the columns line up.',
        8: 'Supplies the five values, in order, to the five slots on the line above.',
      },
    },
    {
      type: 'note',
      md: `Read that table as a menu, not a result. The same model, with nothing retrained, will give you 0.433 recall at perfect precision, or 0.900 recall at 226 false alarms, or anything in between. Notice t=0.10: **22 caught, 11 false alarms** — better recall than the baseline AND better precision than the class-weighted model. The weighting did not find anything the plain model had missed; it mostly shifted where the line was drawn, and the sweep lets you shift it deliberately instead.`,
    },
    {
      type: 'intuition',
      title: 'Fix 3 — change the data: oversampling, undersampling, SMOTE',
      md: `The last family edits the training rows themselves, so the classes stop being lopsided before training starts.

- **Random oversampling** — copy minority rows at random until the counts match. Nothing is thrown away, but the model sees the same 70 fraud rows fifty times each and can simply memorise them.
- **Random undersampling** — delete majority rows at random until the counts match. Training is fast, but you are throwing away real data. It is only sensible when the majority class is enormous and the discarded rows were redundant.
- **SMOTE** (Synthetic Minority Over-sampling TEchnique) — instead of copying a fraud row, invent a new one. Take a fraud row, find the fraud rows nearest to it, pick one of those neighbours, and place a brand-new fraud row somewhere on the straight line between the two. Repeat until the counts match.
- So SMOTE fills in the space around the minority rows rather than stacking exact duplicates on top of them.

The snippet below uses plain duplication, in eight lines of numpy, so you can see every row that gets added. SMOTE behaves the same way for our purposes here, and it fails the same way in the next section.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Oversample the training rows — and only the training rows',
      code: `import numpy as np

rng = np.random.default_rng(0)
pos = np.flatnonzero(ytr == 1)
n_extra = (ytr == 0).sum() - len(pos)
take = rng.choice(pos, n_extra)
Xo = np.vstack([Xtr, Xtr[take]])
yo = np.concatenate([ytr, ytr[take]])
print('train rows', len(ytr), '->', len(yo), ' fraud rows', ytr.sum(), '->', yo.sum())
over = LogisticRegression(max_iter=2000).fit(Xo, yo)
tn, fp, fn, tp = confusion_matrix(yte, over.predict(Xte)).ravel()
print('caught', tp, ' missed', fn, ' false alarms', fp)

# ---- real output ----
# train rows 3500 -> 6860  fraud rows 70 -> 3430
# caught 25  missed 5  false alarms 219`,
      annotations: {
        1: 'numpy is the array library. np is the conventional short name for it.',
        3: 'default_rng(0) creates a random number generator with a fixed starting point, so the copies chosen are the same every run.',
        4: 'ytr == 1 gives a True/False value per training row. flatnonzero returns the positions where it is True — so pos holds the row numbers of the 70 frauds in the TRAINING set only.',
        5: 'Counts the normal training rows (3,430) and subtracts the 70 frauds: 3,360 copies are needed to even the classes out.',
        6: 'rng.choice picks 3,360 row numbers at random from pos, with repeats allowed. These are the rows we will duplicate.',
        7: 'Xtr[take] pulls out those rows as a block. vstack stacks the original training features and the duplicates into one taller array.',
        8: 'concatenate does the same for the labels, so features and labels stay lined up row for row.',
        9: 'Confirms the surgery: 3,500 rows became 6,860, and 70 frauds became 3,430 — an even split.',
        10: 'Trains a fresh model on the rebalanced rows. No class_weight, no threshold change: the data alone is doing the work.',
        11: 'Scores it against the SAME untouched test set as before. The test set keeps its real 2% fraud rate.',
        12: '25 caught, 219 false alarms: precision 25/244 = 0.102, recall 0.833. Almost identical to the class-weighted model — because duplicating a row fifty times and multiplying its loss by fifty are nearly the same instruction.',
      },
    },
    {
      type: 'note',
      md: `All three fixes on one test set, so you can line them up:

- Baseline, cut-off 0.5: precision **1.000**, recall **0.433**, 0 false alarms.
- Class weights: precision **0.099**, recall **0.867**, 236 false alarms.
- Oversampling: precision **0.102**, recall **0.833**, 219 false alarms.
- Threshold moved to 0.10: precision **0.667**, recall **0.733**, 11 false alarms.

Changing the loss and changing the data landed in nearly the same place, and both overshot. Changing the decision was the cheapest move and gave the most useful point. That is the usual ordering: threshold first, weights second, resampling last — and resampling last for one more reason, which is the next section.`,
    },
    { type: 'visual', component: 'ConfusionMatrixLab', props: {} },
    {
      type: 'note',
      md: `That slider is fix 2, live. Drag it left and recall climbs toward 1.0 while precision collapses, because you are flagging thousands of honest rows to catch the last few frauds. Drag it right and precision approaches 1.0 while recall dies. There is no position where both reach 1.0. You are not looking for a best setting; you are choosing a point on a curve, and which point is right depends on what a miss costs compared to a false alarm.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: the screening clinic, by hand',
      md: `A clinic screens 4,000 people. 40 have the disease (1%). Two models are on the table, and you must pick one with arithmetic, not taste.

- **Model A** flags 45 people. 36 of them have the disease.
- Precision A = 36 / 45 = **0.800**. Recall A = 36 / 40 = **0.900**. It misses 4 patients and sends 9 healthy people for a needless follow-up test.
- **Model B** flags 300 people. 39 of them have the disease.
- Precision B = 39 / 300 = **0.130**. Recall B = 39 / 40 = **0.975**. It misses 1 patient and sends 261 healthy people for a needless test.
- Accuracy, for completeness: A gets 3,987 of 4,000 right = 0.9968; B gets 3,478 right = 0.8695. The do-nothing baseline is 0.9900, so accuracy ranks B *below doing nothing* — which is useless information here.

Now the decision, which is arithmetic about costs. A follow-up test costs ₹2,000 and an afternoon. A missed diagnosis costs a late-stage illness — call it ₹8,00,000 and a life-changing outcome, so roughly 400 times a false alarm.

- Cost of A = 4 misses × 400 + 9 false alarms × 1 = 1,609 units.
- Cost of B = 1 miss × 400 + 261 false alarms × 1 = 661 units.
- **Ship B**, despite precision 0.130 and accuracy below the baseline, because the ratio 400:1 says so — provided the clinic can physically run 300 follow-up tests. If its capacity is 60 tests, B is impossible and A wins by default. Capacity is a constraint, not a metric, and it decides as often as the cost ratio does.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: resampling before the split',
      md: `**Resampling leakage** is what happens when you oversample the whole dataset and split it into train and test afterwards.

- Oversampling makes copies of minority rows. The copies are scattered randomly through the enlarged dataset.
- The split then sends some copies to the training set and their originals to the test set.
- The model memorises the training copies. At test time it meets rows it has literally already seen — with the answers.
- The score that comes out is not optimistic. It is fiction.
- SMOTE leaks the same way, and hides it better: the synthetic row in training is not identical to its parent in the test set, just a hair away from it.

The rule has no exceptions: **split first, then resample the training part only**. The test set must keep the real class ratio, because that is the only ratio production will ever have. Here is the same data proving it — the honest model is the one from the previous snippet, so \`over\`, \`X\` and \`y\` are still in memory.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The leak, measured',
      code: `from sklearn.metrics import f1_score

def oversample(Xa, ya, seed):
    r = np.random.default_rng(seed)
    p = np.flatnonzero(ya == 1)
    t = r.choice(p, (ya == 0).sum() - len(p))
    return np.vstack([Xa, Xa[t]]), np.concatenate([ya, ya[t]])

Xall, yall = oversample(X, y, 1)
Xtr2, Xte2, ytr2, yte2 = train_test_split(Xall, yall, test_size=0.3,
                                          stratify=yall, random_state=0)
leaky = LogisticRegression(max_iter=2000).fit(Xtr2, ytr2)
print('leaky  F1 = %.3f' % f1_score(yte2, leaky.predict(Xte2)))
print('honest F1 = %.3f' % f1_score(yte, over.predict(Xte)))

# ---- real output ----
# leaky  F1 = 0.820
# honest F1 = 0.182`,
      annotations: {
        1: 'f1_score computes F1 for us: the single number that is only high when precision and recall are both high.',
        3: 'Wraps the duplication from the last snippet into a function, so we can point it at any dataset. def starts a function; Xa, ya and seed are the inputs.',
        4: 'A generator seeded from the argument, so this run is reproducible too.',
        5: 'Row numbers of the frauds in whatever dataset was passed in.',
        6: 'How many copies to make: normal rows minus fraud rows. Picks that many fraud row numbers at random.',
        7: 'Returns the enlarged features and labels. return hands both back as a pair.',
        9: 'Here is the bug, deliberately: oversample is called on X and y — the FULL dataset, before any split has happened.',
        10: 'Only now is the data split. Copies and their originals are shuffled together, so the same transaction can land on both sides.',
        11: 'stratify=yall on the enlarged data, which looks careful and does nothing to prevent the leak.',
        12: 'Trains on the leaky training half.',
        13: 'Scores it on the leaky test half: F1 = 0.820. This is the number that gets written into a resume.',
        14: 'The honest model from the previous snippet, scored on a test set it never saw any version of: F1 = 0.182. The leak inflated the result by more than four times.',
      },
    },
    {
      type: 'note',
      md: `So the diagnosis, stated plainly. The leaky run reports 0.820 and the honest run reports 0.182 — same data, same algorithm, same amount of real information. The only difference is the order of two lines. And notice the direction of the error: leakage always flatters, never warns you. If you ever see a strong F1 on a heavily imbalanced dataset, the first question is not "which model?" but **"when did you resample, relative to the split?"** In cross-validation the same rule means resampling inside every fold, on that fold’s training part only.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work each one out on paper first. Solutions follow immediately.

**1.** A dataset has 50,000 rows, 250 of them positive. What does the majority-class baseline score, and what recall does it achieve?

**2.** A model flags 400 rows. 80 of the flags are correct. There were 200 positives in total. Give precision and recall.

**3.** Same model as problem 2. You lower the threshold; now it flags 1,000 rows and 120 flags are correct. Which of precision and recall went up, which went down, and by how much?

**4.** A colleague reports 0.94 F1 on a dataset that is 1% positive, using SMOTE. Name the single most likely bug and the one-line fix.

**5.** Missing a fraud costs ₹8,000. A manual review costs ₹50. At threshold 0.05 you catch 25 of 30 frauds with 63 false alarms; at 0.02 you catch 27 with 226. Which threshold is cheaper?`,
    },
    {
      type: 'intuition',
      title: 'Solutions',
      md: `**1.** Positive rate = 250 / 50,000 = 0.005. Always predicting the majority label gets every one of the 49,750 negatives right and every positive wrong: accuracy = 49,750 / 50,000 = **0.995**. Recall = 0 / 200... careful — recall = 0 correct catches / 250 positives = **0.000**. A 99.5% score that finds nothing.

**2.** Precision = correct flags / all flags = 80 / 400 = **0.200**. Recall = correct flags / all positives = 80 / 200 = **0.400**.

**3.** Precision = 120 / 1000 = **0.120**, down from 0.200. Recall = 120 / 200 = **0.600**, up from 0.400. Lowering the threshold flags 600 more rows and only 40 of them were real, so precision falls while recall rises. That is the trade, every time.

**4.** Most likely bug: SMOTE was run on the full dataset before the train/test split, so synthetic rows in training sit next to their parents in test. Fix: split first, then apply SMOTE to the training part only (inside each fold, if cross-validating). Expect the honest score to be dramatically lower.

**5.** At 0.05: 5 misses × 8,000 = ₹40,000, plus 63 reviews × 50 = ₹3,150. Total **₹43,150**. At 0.02: 3 misses × 8,000 = ₹24,000, plus 226 × 50 = ₹11,300. Total **₹35,300**. The lower threshold is cheaper by ₹7,850 — because a miss costs 160 times a review, so trading 163 extra reviews for 2 extra catches is a good deal. Check the review team can absorb 226 alerts before promising it.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Four points that matter once the basics above are solid.

- **When SMOTE makes rows that cannot exist.** It works by drawing a straight line between two minority rows, which assumes the space between them is also minority territory. That fails on categorical features — halfway between "Delhi" and "Mumbai" is not a city — and in high dimensions, where the nearest neighbour is far away and the line between them crosses majority territory, manufacturing wrong labels. SMOTE is at its best on low-dimensional, continuous features with mild imbalance.
- **Class weights distort the probabilities.** Reweighting makes the model output higher numbers for the minority class than the true frequency justifies. If a downstream system consumes the probability itself — an expected-loss calculation, say — prefer threshold moving, which leaves the probabilities exactly as trained.
- **Precision depends on how rare positives are; recall does not.** Recall only involves positive rows, so the number of negatives cannot change it. Precision has false positives in its denominator, drawn from the negative pool — so halve the fraud rate and precision roughly halves at the same threshold, with no change to the model. This is the deeper reason never to resample a validation set: a precision measured at a fake class ratio does not transfer to production.
- **When positives are almost extinct**, say a few dozen in millions of rows, there is not enough signal to learn what fraud looks like. Flip the question: learn what normal looks like and flag whatever does not fit. That is anomaly detection, and it is built up in the Level 3 module *PCA, t-SNE & Anomaly Detection*.`,
    },
  ],
  quiz: [
    {
      question: 'A dataset is 0.5% fraud. Your model reports 99.5% accuracy. What should you conclude first?',
      options: [
        {
          text: 'It may have learned nothing — always predicting "not fraud" also scores 99.5%',
          explanation: 'Correct. The majority-class baseline is 1 − 0.005 = 0.995. Nothing here shows the model beats doing nothing. Look at recall.',
        },
        { text: 'The model is excellent and ready to ship', explanation: 'Accuracy at a 0.5% positive rate says almost nothing about the class you care about.' },
        { text: 'The model is overfitting', explanation: 'Unsupported. This number fits a model that never predicts positive at all just as well.' },
      ],
      correct: 0,
    },
    {
      question: 'You oversample the full dataset, then split into train and test. What breaks?',
      options: [
        { text: 'Nothing — this is the standard recipe', explanation: 'It is a common recipe and it is wrong. It is the most frequent bug in imbalance projects.' },
        {
          text: 'Copies of a row can sit in training while the original sits in test, so the model is scored on rows it memorised',
          explanation: 'Correct. In the module’s run this inflated F1 from 0.182 to 0.820. Split first, resample the training part only.',
        },
        { text: 'The test set becomes too small to measure anything', explanation: 'The test set actually grows. Size is not the problem; contamination is.' },
      ],
      correct: 1,
    },
    {
      question: "In scikit-learn, what does class_weight='balanced' change?",
      options: [
        {
          text: 'It multiplies each class’s contribution to the loss by total_rows / (n_classes × rows_in_that_class)',
          explanation: 'Correct. At 2% positives that is about 25× for the minority and 0.51× for the majority. No row is added or removed.',
        },
        { text: 'It duplicates minority rows until the classes are equal', explanation: 'That is oversampling. Class weights add no rows at all, which is why they cannot leak.' },
        { text: 'It moves the decision threshold to its best value', explanation: 'It shifts where the trained boundary lands, but prediction still happens at 0.5. Threshold moving is a separate fix.' },
      ],
      correct: 0,
    },
    {
      question: 'Your model ranks rows well but at threshold 0.5 it flags almost nothing. Cheapest first move?',
      options: [
        { text: 'Collect more data', explanation: 'The ranking is already informative, so learning is not the bottleneck.' },
        { text: 'Apply SMOTE and retrain', explanation: 'Possible later, but it changes your data and adds a leakage surface to fix something that is not in the data.' },
        {
          text: 'Sweep the threshold and pick the cut-off that gives the recall you need',
          explanation: 'Correct. Nothing is retrained. In the module’s sweep, moving 0.5 to 0.10 took recall from 0.433 to 0.733 at only 11 false alarms.',
        },
      ],
      correct: 2,
    },
    {
      question: 'When is random undersampling a reasonable choice?',
      options: [
        {
          text: 'Tens of millions of majority rows and a training loop too slow to use them all',
          explanation: 'Correct. With an enormous majority the discarded rows are largely redundant and the speed-up is real.',
        },
        { text: 'A small dataset of 400 rows', explanation: 'Backwards — you would delete data you cannot spare. Use class weights there.' },
        { text: 'Features that are mostly categorical', explanation: 'That is an argument against SMOTE, not an argument for undersampling.' },
      ],
      correct: 0,
    },
    {
      question: 'A screen misses 3 tumours and raises 200 false alarms; another misses 12 and raises 20. Which ships?',
      options: [
        { text: 'The second — far fewer false alarms', explanation: 'Precision is the wrong objective here. A false alarm costs a follow-up test; a miss can cost a life.' },
        {
          text: 'The first, because a miss costs vastly more than a false alarm here',
          explanation: 'Correct. Multiply out the costs: at even 100:1, 3 misses beat 12 misses easily. The only thing that could overturn it is clinic capacity for 200 follow-ups.',
        },
        { text: 'Whichever has the higher F1', explanation: 'F1 weights precision and recall equally, which assumes the two mistakes cost the same. In medicine they do not.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: '"My model has 99% accuracy but it is useless." Explain why, and what you would report instead.',
      answer:
        'Accuracy counts every row equally, and 99% of rows belong to the class nobody cares about, so a constant "negative" predictor already scores 99%. Accuracy therefore cannot separate a real model from no model at all. I would report the majority-class baseline first, then precision, recall and F1 — all of which ignore true negatives — plus PR-AUC if the operating point is not fixed yet. And I would show the raw counts: "caught 26 of 30 frauds at 236 false alarms" tells a stakeholder more than any single number.',
      isCaseBased: false,
    },
    {
      question: 'Rank class weights, resampling and threshold moving in the order you would try them, and justify it.',
      answer:
        'Threshold moving first, class weights second, resampling last, ordered by least damage that could work. Threshold moving costs nothing: no retraining, fully reversible, and often the probabilities were fine and only the 0.5 cut-off was wrong. Class weights are one keyword, add and remove no rows, so there is nothing to leak and no distribution to distort. Resampling goes last because it is the only one that alters the data — undersampling deletes real information, oversampling invites memorisation, and both SMOTE and plain oversampling introduce the split-order leak. In practice I sweep the threshold, and only if the whole curve is unusable do I go further.',
      isCaseBased: false,
    },
    {
      question: 'Explain SMOTE end to end, then tell me when you would refuse to use it.',
      answer:
        'For a minority row, find its k nearest minority neighbours (k=5 by default), pick one at random, and create a new row at a random point on the straight line between them. Repeat until the class counts are acceptable. I would refuse when features are categorical, because interpolating between two category codes produces a row that cannot exist; when dimensionality is high, because neighbours are far apart and the connecting line crosses majority territory, manufacturing wrong labels; and when positives number in the dozens, because a handful of points cannot outline a region — that is the point to switch to anomaly detection instead.',
      isCaseBased: false,
    },
    {
      question: 'Case: a candidate reports 0.95 F1 on a fraud dataset with 0.17% positives. What do you ask first?',
      answer:
        'When the resampling ran relative to the split. At 0.17% positives, 0.95 F1 is close to impossible honestly, and the overwhelmingly likely cause is SMOTE or oversampling applied before splitting, so near-duplicate minority rows sit on both sides. My follow-ups: was the validation fold resampled — it must not be, since precision measured at a fake class ratio does not transfer? Was scaling or feature selection fitted on the full dataset? For time-ordered fraud data, was the split random instead of by time, which lets the model train on the future? I would then ask them to rerun with resampling inside the training fold only and compare. In a demonstration on 2% data, that one reordering moved F1 from 0.82 to 0.18. What I am really testing is whether a suspiciously good number reads to them as a bug report rather than a result.',
      isCaseBased: true,
    },
    {
      question: 'Case: fraud model, strong offline PR-AUC, ships, and the review team drowns in alerts in a week. Debug it.',
      answer:
        'PR-AUC is threshold-free, so a good PR-AUC guarantees nothing about the cut-off actually deployed — that is the first hypothesis: the threshold was picked by maximising F1, which silently assumes a miss and a false alarm cost the same, instead of by review capacity. I would compute the alerts per day implied by the chosen threshold, compare it against how many the team can process, and reset the threshold from that budget — or simply send the top N scores per day. Second hypothesis: the offline positive rate did not match production, because the validation set was resampled or enriched with fraud. Precision depends on prevalence in a way recall does not, so that inflates precision offline and it collapses on real traffic. Third: drift. Fraud patterns move, so a threshold calibrated last quarter sits at a different precision today; I would monitor the score distribution and recalibrate on a schedule.',
      isCaseBased: true,
    },
    {
      question: 'When is F1 the wrong summary metric, and what replaces it?',
      answer:
        'F1 combines precision and recall with equal weight, which hides an assumption that a miss and a false alarm cost the same. They rarely do. Replacements, in order of preference: minimise expected cost directly, cost_of_miss × misses + cost_of_false_alarm × false alarms, which is the honest calculation; or F-beta, where beta above 1 leans toward recall for medical screening and below 1 toward precision for spam. When comparing models before any operating point is fixed, PR-AUC is the better threshold-free summary, because F1 at 0.5 mixes model quality with an arbitrary cut-off.',
      isCaseBased: false,
    },
    {
      question: 'Case: you inherit a churn model. Offline recall 0.80; in production it flags almost nobody. Code unchanged.',
      answer:
        'Recall at a fixed threshold depends entirely on the score distribution, so I look for whatever moved it. First, train-serve skew: a feature computed differently online — a missing value defaulting to zero, a different scaler, a stale lookup — drags scores down. I verify by scoring the same rows through both paths and diffing the outputs. Second, the offline evaluation set may have been resampled or enriched, so the model was tuned at a class ratio production never had. Third, drift: new pricing or a new customer mix shifts scores under a threshold nobody recalibrated. Fourth, label lag: churn labels arrive sixty days late, so recent production performance is not measurable yet and the flagging may be fine. I would compare offline and online score histograms first — that single plot separates skew and drift from evaluation bugs immediately.',
      isCaseBased: true,
    },
    {
      question: 'How do you choose a decision threshold you can defend to a product manager?',
      answer:
        'Not by maximising F1. I get two numbers from the business: what a miss costs and what a false alarm costs, in the same units, plus any hard capacity limit on how many alerts a human team can process per day. Then I sweep the threshold on validation data, compute expected cost at each point, and take the minimum — or, under a capacity limit, the threshold that exactly fills the review budget. I present it in their language: "at this cut-off we catch 83% of fraud and generate about 60 reviews per 1,500 transactions." And I recheck it after every retraining, because the score distribution moves even when the metrics look stable.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Majority-class baseline', back: 'The accuracy of always predicting the common class = 1 − positive rate. At 2% positives that is 98%. Compute it before reporting any model score.' },
    { front: 'Why accuracy dies on imbalance', back: 'It counts all rows equally, and almost all rows are the class nobody cares about. 1,000 rows with 20 frauds: always saying "no" scores 0.98 and catches 0.' },
    { front: 'Precision vs recall', back: 'Precision = of what I flagged, how much was real, TP/(TP+FP). Recall = of what was real, how much I caught, TP/(TP+FN). Neither uses true negatives.' },
    { front: 'The three families of fixes', back: 'Change the DATA (resampling), change the LOSS (class weights), change the DECISION (threshold moving). Try them in reverse order: decision, loss, data.' },
    { front: "class_weight='balanced'", back: 'Weight per class = total_rows / (n_classes × rows_in_that_class). At 2% positives, about 25× on the minority. Adds no rows, so it cannot leak.' },
    { front: 'SMOTE in one sentence', back: 'Create new minority rows on the straight line between an existing minority row and one of its nearest minority neighbours, instead of duplicating rows.' },
    { front: 'Resampling leakage', back: 'Resample before the split and copies land in train while originals land in test. Measured on 2% data: F1 0.820 leaky vs 0.182 honest. Split first, always.' },
    { front: 'The first question on any imbalanced problem', back: 'What does a miss cost compared to a false alarm? The threshold, the weights and the metric all follow from that ratio, plus the team’s review capacity.' },
  ],
  mindmapMarkdown: `- Class Imbalance: When 98% Accuracy Is Worthless
  - The trap
    - 1000 rows, 20 fraud
    - always-no scores 980/1000 = 0.98
    - catches 0 of 20
    - baseline = 1 − positive rate
  - Vocabulary
    - majority vs minority class
    - positive class = the thing hunted
  - Measure the positives only
    - precision = TP/(TP+FP)
    - recall = TP/(TP+FN)
    - F1 high only if both high
    - true negatives never appear
  - Fix: change the DATA
    - oversample = copy minority rows
    - undersample = delete majority rows
    - SMOTE = new rows between neighbours
    - result: recall 0.833, precision 0.102
  - Fix: change the LOSS
    - class_weight='balanced'
    - fraud row counts ~25x
    - result: recall 0.867, precision 0.099
  - Fix: change the DECISION
    - 0.5 is an arbitrary cut-off
    - sweep it, read the menu
    - t=0.10: recall 0.733, precision 0.667
    - cheapest and often best
  - The leak
    - resample before split = copies in both halves
    - F1 0.820 leaky vs 0.182 honest
    - split first, resample train only
  - Deciding
    - cost of a miss vs a false alarm
    - review capacity caps recall
    - very rare positives to anomaly detection`,
}

export default m
