import type { Module } from '../types'

const m: Module = {
  id: 'ml-l3-cross-validation',
  subjectId: 'ml',
  level: 3,
  title: 'Cross-Validation',
  whyItMatters:
    'One train/test split gives you one number, and that number moves by ten points depending on which rows happened to land where. Cross-validation replaces it with a mean and a spread — and the spread is the half people throw away.',
  assumes: [
    'You know why data is split into train and test',
    'You have seen a Python list and a for loop',
  ],
  estMinutes: 22,
  sections: [
    {
      type: 'intuition',
      title: 'What cross-validation is',
      md: `**k-fold cross-validation** cuts the data into k equal **folds**, then runs k rounds. Each round trains on k−1 folds and scores on the one left out, so every row is judged exactly once and teaches in every other round.

You get k scores instead of one. Report their **mean** and their **spread**.

The reason it exists: a single split hands you a number that depends heavily on which rows landed in the test set.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same model and data, five different cuts',
      code: `from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

X, y = make_classification(n_samples=200, n_features=8, n_informative=3, random_state=0)

for seed in range(1, 6):
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
        8: 'Only random_state changes. Same data, same model, same 80/20 proportion — the only difference is which rows land in the test set.',
        13: '0.825 to 0.925. Ten percentage points of spread, produced entirely by the split. Any single one of these numbers, reported alone, is a coin toss dressed as a measurement.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The folds, cut by hand',
      code: `rows = list(range(20))
K = 5
size = len(rows) // K

folds = []
for f in range(K):
    folds.append(rows[f * size:(f + 1) * size])
    print('fold', f, '->', folds[f])

print()
for f in range(2):
    test = folds[f]
    train = [r for g in range(K) if g != f for r in folds[g]]
    print('round', f, 'TEST ', test)
    print('        TRAIN', train)

# ---- real output ----
# fold 0 -> [0, 1, 2, 3]
# fold 1 -> [4, 5, 6, 7]
# fold 2 -> [8, 9, 10, 11]
# fold 3 -> [12, 13, 14, 15]
# fold 4 -> [16, 17, 18, 19]
#
# round 0 TEST  [0, 1, 2, 3]
#         TRAIN [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
# round 1 TEST  [4, 5, 6, 7]
#         TRAIN [0, 1, 2, 3, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]`,
      annotations: {
        7: 'rows[a:b] is a slice — items a up to but not including b. Cutting at multiples of size gives k contiguous blocks.',
        14: 'A double comprehension: for every fold g that is not the test fold, take every row r in it. That flattening is what builds the training set.',
        24: 'Sixteen rows train, four are judged, and which four rotates. That is the entire algorithm — sklearn KFold does exactly this and nothing more.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Five folds, five scores, and the library agreeing',
      code: `from sklearn.model_selection import cross_val_score, KFold

model = DecisionTreeClassifier(max_depth=4, random_state=0)
scores = cross_val_score(model, X, y, cv=KFold(n_splits=5))
print([round(float(s), 4) for s in scores])
print('mean', round(float(scores.mean()), 4), 'std', round(float(scores.std()), 4))
print('spread', round(float(scores.max() - scores.min()), 4))

# ---- real output ----
# [0.9, 0.825, 0.9, 0.9, 0.8]
# mean 0.865 std 0.0436
# spread 0.1`,
      annotations: {
        4: 'cross_val_score does the loop for you: fit on k−1 folds, score on the held-out one, k times. It returns the k scores, not their mean.',
        10: '[0.9, 0.825, 0.9, 0.9, 0.8]. Mean 0.865, and a spread of 0.1 across folds.',
        11: 'Reporting only 0.865 discards the more useful half. The std of 0.0436 says two models differing by 2 points are not distinguishable on this data, which is exactly the thing you needed to know before choosing between them.',
      },
    },
    {
      type: 'visual',
      component: 'Plot',
      props: {
        title: 'One split versus five folds, on the same 200 rows',
        notice:
          'Each blue dot is what a single 80/20 split reported, for five different random seeds — 0.825 up to 0.925, a ten-point range with nothing changing but which rows landed where. The orange line is the 5-fold mean of 0.865, which is the number that does not move when you re-roll the seed.',
        kind: 'scatter',
        xLabel: 'random seed of the split',
        yLabel: 'reported accuracy',
        yMin: 0.75,
        yMax: 0.97,
        series: [
          { name: 'single split', points: [[1, 0.825], [2, 0.85], [3, 0.875], [4, 0.925], [5, 0.825]] },
          { name: '5-fold mean', dashed: true, points: [[1, 0.865], [5, 0.865]] },
        ],
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stratified k-fold: when folds must all look alike',
      code: `import numpy as np
from sklearn.model_selection import StratifiedKFold

Xs, ys = make_classification(n_samples=60, n_features=8, n_informative=3,
                             weights=[0.93], random_state=0)
print('positives in the whole dataset:', int(ys.sum()), 'out of', len(ys))
for name, splitter in [('KFold', KFold(5)), ('StratifiedKFold', StratifiedKFold(5))]:
    counts = [int(ys[test_idx].sum()) for train_idx, test_idx in splitter.split(Xs, ys)]
    print(name, 'positives per test fold:', counts)

# ---- real output ----
# positives in the whole dataset: 5 out of 60
# KFold positives per test fold: [2, 2, 0, 1, 0]
# StratifiedKFold positives per test fold: [1, 1, 1, 1, 1]`,
      annotations: {
        8: 'splitter.split yields (train, test) index arrays per round. Summing ys over the test indices counts the positives that landed in that fold.',
        12: 'Plain KFold gave [2, 2, 0, 1, 0]. Folds 2 and 4 contain NO positive rows, so on those rounds the model was graded entirely on negatives — recall is undefined and the score is meaningless.',
        13: 'Stratified gives [1, 1, 1, 1, 1]: every fold keeps the same class balance as the whole dataset. For classification this should be the default, not the fallback.',
      },
    },
    {
      type: 'note',
      label: 'Three other cutters, and what each fixes',
      md: `- **Leave-one-out (LOOCV)** — k = n. Nearly unbiased, very high variance, and it costs n fits. Worth it only when data is tiny.
- **GroupKFold** — keeps all rows of a group in the same fold. Use when several rows describe the same customer, patient or device, otherwise the same entity teaches and is tested.
- **TimeSeriesSplit** — always trains on the past and tests on the future. Required whenever the rows have an order.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The classic mistake: shuffling data that has a time order',
      code: `from sklearn.neighbors import KNeighborsRegressor
from sklearn.model_selection import TimeSeriesSplit

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
        6: 'A metric drifting slowly upward over 240 days, plus noise. There is a real trend, so a model should be able to say something.',
        12: 'Shuffled: 0.974. Every test day sits between two training days the model has already memorised, so it interpolates. That is not forecasting.',
        13: 'Forward-chaining: −2.486, worse than predicting the mean. Every test day is beyond the training range, and k-NN cannot extrapolate at all. Same model, same 240 rows, and the honest number is catastrophic.',
      },
    },
    {
      type: 'note',
      label: 'How to read those two numbers',
      md: `0.974 is not a bug in the code — it is a correct answer to the wrong question. Shuffled folds ask "can you fill in a gap between days you have seen?", and production asks "what happens tomorrow?".

The gap between 0.974 and −2.486 is the entire value of choosing the right splitter. If your rows have an order — time, a sequence, anything where the future must not leak backwards — shuffling makes the number meaningless in the flattering direction.`,
    },
  ],
  quiz: [
    {
      question: 'Five single splits of the same data gave 0.825, 0.85, 0.875, 0.925, 0.825. What changed between them?',
      options: [
        { text: 'The model hyperparameters', explanation: 'Identical: max_depth 4, random_state 0.' },
        { text: 'Only which rows landed in the test set', explanation: 'Correct. A ten-point range produced purely by the split, which is why a single number is not a measurement.' },
        { text: 'The amount of training data', explanation: 'Every split was 80/20.' },
        { text: 'The random seed of the model', explanation: 'The model seed was fixed; only the split seed moved.' },
      ],
      correct: 1,
    },
    {
      question: 'In 5-fold CV, how many times is each row used for training?',
      options: [
        { text: 'Once', explanation: 'Each row is TESTED once; it trains far more often.' },
        { text: 'Four times — every round except the one where its fold is the test set', explanation: 'Correct. Each row teaches in k−1 rounds and is judged in exactly one.' },
        { text: 'Five times', explanation: 'That would mean training on the test fold too.' },
        { text: 'It depends on the fold size', explanation: 'It is k−1 regardless of fold size.' },
      ],
      correct: 1,
    },
    {
      question: 'Fold scores were [0.9, 0.825, 0.9, 0.9, 0.8], mean 0.865, std 0.0436. Why report the std?',
      options: [
        { text: 'It is conventional', explanation: 'It carries real decision-making information.' },
        { text: 'It tells you two models differing by 2 points are not distinguishable on this data', explanation: 'Correct. Without the spread you cannot tell a real improvement from fold noise.' },
        { text: 'It corrects the mean for bias', explanation: 'It describes the spread; it does not adjust the mean.' },
        { text: 'It is needed to compute the mean', explanation: 'The mean is independent of it.' },
      ],
      correct: 1,
    },
    {
      question: 'Plain KFold gave positives per test fold of [2, 2, 0, 1, 0]. What is wrong?',
      options: [
        { text: 'Nothing — the folds are equal in size', explanation: 'Equal size is not the issue; class balance is.' },
        { text: 'Two folds contain no positives at all, so those rounds grade the model entirely on negatives', explanation: 'Correct. Recall is undefined there and the score is meaningless. StratifiedKFold gives [1, 1, 1, 1, 1].' },
        { text: 'The dataset is too small for CV', explanation: '60 rows is small but stratification handles it, as the second line shows.' },
        { text: 'The folds should have been shuffled', explanation: 'Shuffling alone does not guarantee each fold gets a positive when there are only 5 in 60.' },
      ],
      correct: 1,
    },
    {
      question: 'A time-ordered series scored 0.974 shuffled and −2.486 forward-chaining. Which is right?',
      options: [
        { text: '0.974 — the higher score is the better estimate', explanation: 'It is the more flattering estimate, which is not the same thing.' },
        { text: '−2.486 — shuffling let every test day sit between memorised training days, which production will never do', explanation: 'Correct. 0.974 answers "can you interpolate a gap?" and production asks "what happens tomorrow?".' },
        { text: 'Neither; the model needs retraining', explanation: 'The model is fine — the splitter was wrong.' },
        { text: 'The average of the two', explanation: 'One is measuring the wrong thing entirely, so averaging is meaningless.' },
      ],
      correct: 1,
    },
    {
      question: 'You have several rows per customer. Which splitter?',
      options: [
        { text: 'GroupKFold, keyed on customer', explanation: 'Correct. Otherwise the same customer teaches in training and is tested in the same run, which inflates the score.' },
        { text: 'StratifiedKFold', explanation: 'That balances classes, not entities.' },
        { text: 'Plain KFold with shuffling', explanation: 'Shuffling actively spreads one customer\'s rows across folds, which is the problem.' },
        { text: 'LeaveOneOut', explanation: 'It leaves out one ROW, so the customer\'s other rows are still in training.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why is cross-validation better than a single train/test split?',
      answer:
        'Because a single split gives you one number with no sense of how much it moves. On 200 rows, five different split seeds produced 0.825, 0.85, 0.875, 0.925 and 0.825 — a ten-point range from nothing but which rows landed where. k-fold uses every row for both training and testing, so you get a mean plus a spread, and the spread tells you whether a difference between two models is real. It also uses the data more efficiently, which matters most when data is scarce.',
      isCaseBased: true,
    },
    {
      question: 'How do you choose k?',
      answer:
        'Five or ten by convention, and the trade-off is worth stating. Larger k means more training data per fold, so less bias in the estimate, but the training sets overlap more so the fold scores are correlated and the variance of their mean does not fall as fast as it looks. It also costs k fits. LOOCV is the extreme: nearly unbiased, high variance, n fits. I would use 10 for small data, 5 as the default, and fewer if training is expensive.',
      isCaseBased: false,
    },
    {
      question: 'When is plain k-fold wrong?',
      answer:
        'Three common cases. Imbalanced classification, where a fold can end up with no positives at all — [2, 2, 0, 1, 0] on a 5-in-60 dataset — so use StratifiedKFold. Grouped data, where several rows describe the same customer or patient and the same entity would teach and be tested, so use GroupKFold. And ordered data, where shuffling lets the model see the future: on a drifting series that turned −2.486 into 0.974. Each has a purpose-built splitter and the cost of using the wrong one is always in the flattering direction.',
      isCaseBased: false,
    },
    {
      question: 'Where exactly does preprocessing go in a cross-validation loop?',
      answer:
        'Inside each fold, fitted on that fold\'s training portion only. Scaling, imputation, feature selection, resampling — anything that learns from data — must be refitted per fold, because fitting on the whole dataset lets the held-out rows influence the transform and quietly inflates every fold score. The practical way to guarantee it is to wrap the steps in a Pipeline and pass the pipeline to cross_val_score, so the framework refits it per fold rather than relying on you to remember.',
      isCaseBased: true,
    },
    {
      question: 'Two models score 0.865 and 0.881 in 5-fold CV. Is the second better?',
      answer:
        'Not on that evidence. With a fold std of 0.0436, a 1.6-point gap is well inside the noise. I would look at the paired fold scores rather than the means, since the same folds were used for both, and check whether the second model wins on most folds or just on one. Repeated k-fold gives more estimates and a more stable comparison. If the difference remains inside a standard error I would take the simpler or faster model, because there is no evidence to pay for the other one.',
      isCaseBased: true,
    },
    {
      question: 'What is nested cross-validation for?',
      answer:
        'For getting an honest performance estimate when you are also tuning. If you tune on the same folds you report on, the reported score is contaminated by the selection — the winner\'s curse. Nested CV puts an inner loop around hyperparameter search and an outer loop around performance measurement, so each outer fold is scored by a model tuned without ever seeing it. The cost is multiplicative: k_outer × k_inner × configs fits. It is the right thing for a paper or a decision, and often too expensive for routine work, where three fixed piles do the same job more cheaply.',
      isCaseBased: false,
    },
    {
      question: 'Explain forward-chaining validation.',
      answer:
        'Each round trains on everything up to a point in time and tests on the next block, then the training window extends and the process repeats — so the model is never shown the future. It mirrors how the model will actually be used. It gives fewer training rows in the early folds, and the fold scores are not directly comparable to each other since they are trained on different amounts of data, but those are honest limitations rather than distortions. sklearn\'s TimeSeriesSplit implements it.',
      isCaseBased: false,
    },
    {
      question: 'Your CV score is excellent and production performance is poor. Where do you look?',
      answer:
        'At the splitter before the model. Almost always the CV setup violated something production does not: rows shuffled across time, one entity split across folds, or a preprocessing step fitted before splitting. All three inflate in the same direction. I would then check whether the production data distribution has moved from the training window, and whether any feature is computed differently at serving time than it was in training — a feature available in the training table but not at prediction time produces exactly this pattern.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'k-fold cross-validation', back: 'Cut into k folds; each round trains on k−1 and tests on the held-out one. Every row is judged once and teaches k−1 times.' },
    { front: 'Why not one split?', back: 'Five seeds on the same 200 rows gave 0.825 to 0.925 — a ten-point range from nothing but which rows landed where.' },
    { front: 'Report what, exactly?', back: 'Mean AND spread. [0.9, 0.825, 0.9, 0.9, 0.8] → mean 0.865, std 0.0436. The std tells you a 2-point difference is not distinguishable.' },
    { front: 'StratifiedKFold', back: 'Keeps each fold\'s class balance equal to the whole. Plain KFold on 5-in-60 gave [2, 2, 0, 1, 0] — two folds with no positives at all.' },
    { front: 'GroupKFold', back: 'Keeps all rows of one entity in the same fold. Needed whenever several rows describe the same customer, patient or device.' },
    { front: 'TimeSeriesSplit', back: 'Train on the past, test on the future. On a drifting series, shuffling scored 0.974 and forward-chaining −2.486.' },
    { front: 'Where does preprocessing go?', back: 'Inside each fold, fitted on that fold\'s training portion. Wrap it in a Pipeline so the framework enforces it.' },
    { front: 'Nested CV', back: 'Inner loop tunes, outer loop measures. Removes the winner\'s curse from a tuned model\'s reported score. Costs k_outer × k_inner × configs fits.' },
  ],
  mindmapMarkdown: `- Cross-validation
  - Why
    - one split, five seeds: 0.825 to 0.925
    - ten points of range from the split alone
  - k-fold
    - k folds, each takes a turn as test
    - every row judged once, teaches k-1 times
    - report MEAN and SPREAD
    - [0.9, 0.825, 0.9, 0.9, 0.8] -> 0.865, std 0.0436
  - Choosing the splitter
    - StratifiedKFold: imbalanced classes
      - plain KFold gave [2,2,0,1,0] positives
      - stratified gives [1,1,1,1,1]
    - GroupKFold: repeated entities
    - TimeSeriesSplit: ordered rows
    - LOOCV: tiny data only
  - The time trap
    - shuffled 0.974, forward-chaining -2.486
    - shuffling asks "fill the gap", production asks "tomorrow"
  - Preprocessing
    - fit INSIDE each fold, on train only
    - use a Pipeline so it is enforced`,
}

export default m
