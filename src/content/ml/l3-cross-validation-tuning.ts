import type { Module } from '../types'

const m: Module = {
  id: 'ml-l3-cross-validation-tuning',
  subjectId: 'ml',
  level: 3,
  title: 'Cross-Validation & Hyperparameter Tuning',
  whyItMatters:
    'Every number you report about a model comes from a split you chose. Choose it badly and you ship a lie — a model that scored 0.82 on your lucky slice and 0.68 in production. This module is how you get an estimate you can defend, and how you tune without quietly overfitting the very set you tune on.',
  estMinutes: 50,
  sections: [
    {
      type: 'intuition',
      title: 'One split is one measurement',
      md: `You weigh yourself once and the scale says 71.4 kg. Is that your weight? Roughly. Step off and on again: 71.1. Again: 71.8. One reading was never the truth — it was the truth plus noise.

- A single train/test split is exactly one reading. The test score you get depends on *which rows landed in the test set*.
- With 150 rows and a 25% test set, your score rests on ~38 rows. A handful of hard ones shift it by points.
- Same model, same data, different \`random_state\` → different score. Nothing about the model changed.
- So a bare "accuracy 0.82" is not a result. It is a result *plus an unknown error bar*.
- Cross-validation's whole job: take several readings and report the mean **and** the spread.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same model, scored five different ways — twice',
      code: `import numpy as np
from sklearn.datasets import make_classification
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold

X, y = make_classification(n_samples=150, n_features=12, n_informative=4,
                           class_sep=1.3, flip_y=0.05, random_state=0)
clf = RandomForestClassifier(n_estimators=100, random_state=0)

single = []
for seed in range(5):                        # same model, same data, 5 different splits
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, stratify=y, random_state=seed)
    single.append(clf.fit(Xtr, ytr).score(Xte, yte))
print('one split, 5 seeds :', np.round(single, 3), 'spread', round(max(single) - min(single), 3))

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=0)
folds = cross_val_score(clf, X, y, cv=cv, scoring='accuracy')
print('5-fold scores      :', np.round(folds, 3))
print('5-fold mean +/- std:', round(folds.mean(), 3), '+/-', round(folds.std(), 3))

# one split, 5 seeds : [0.711 0.684 0.816 0.684 0.789] spread 0.132
# 5-fold scores      : [0.7   0.7   0.7   0.833 0.9  ]
# 5-fold mean +/- std: 0.767 +/- 0.084`,
      annotations: {
        8: 'The model seed is FIXED. Every difference you are about to see comes from the split alone, not from the forest.',
        11: 'Only random_state changes per loop. This is the honest version of "I reran it and got a different number".',
        12: 'stratify=y keeps the class ratio identical in train and test — without it, small-data splits also swing on class balance.',
        16: 'StratifiedKFold + shuffle + random_state: the three things you should type by reflex. No shuffle means fold 1 is just the first 30 rows, which is a disaster if the file is sorted by label.',
        17: 'cross_val_score clones the estimator for every fold. Nothing leaks between folds, and your original clf stays unfitted.',
        21: 'Read this line and stop trusting single splits: 0.684 to 0.816. Thirteen accuracy points, from luck alone.',
      },
    },
    {
      type: 'note',
      md: `Look at what happened. The single-split score ranged **0.684 to 0.816** — a 13-point swing that had nothing to do with the model. Cross-validation replaces that lottery ticket with **0.767 ± 0.084**. Note the std is *not* small: this data is genuinely hard to score on. That is the point. CV did not make the noise go away, it **made the noise visible**. A model that beats yours by 0.01 when your fold std is 0.08 has not beaten anything.`,
    },
    {
      type: 'intuition',
      title: 'k-fold: everybody gets a turn in the test set',
      md: `Five friends split a restaurant bill, but each round one person judges the food while the others cook. Rotate until everyone has judged once.

- Chop the data into **k equal folds** (k=5 → five slices of 20%).
- Round 1: train on folds 2–5, validate on fold 1. Round 2: train on 1,3,4,5, validate on fold 2. Rotate.
- After k rounds every row has been validated **exactly once**, and used for training k−1 times.
- Report the **mean** of the k scores as your estimate, and the **std** as your error bar.
- Cost: k model fits instead of 1. That is the entire price.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'k-fold rotation, then what time-ordered data does to it',
        notice:
          'Right column = the 5 folds of the dataset. Left column = what this round does with them. The flagged fold is the one being held out. Scores are the real numbers from the code above.',
        leftLabel: 'this round',
        rightLabel: 'the dataset, in 5 folds',
        frames: [
          {
            note: 'Round 1 of 5. Fold 1 is held out and never seen during training. Score on it: 0.700.',
            stack: [
              { name: 'train on', value: 'folds 2,3,4,5' },
              { name: 'validate on', value: 'fold 1', to: 'f1' },
              { name: 'score', value: '0.700' },
            ],
            heap: [
              { id: 'f1', value: 'fold 1  (30 rows)', label: 'HELD OUT' },
              { id: 'f2', value: 'fold 2  (30 rows)', label: 'train' },
              { id: 'f3', value: 'fold 3  (30 rows)', label: 'train' },
              { id: 'f4', value: 'fold 4  (30 rows)', label: 'train' },
              { id: 'f5', value: 'fold 5  (30 rows)', label: 'train' },
            ],
          },
          {
            note: 'Round 2. Fold 1 rejoins training, fold 2 steps out. A FRESH model is fitted — nothing carries over from round 1.',
            stack: [
              { name: 'train on', value: 'folds 1,3,4,5' },
              { name: 'validate on', value: 'fold 2', to: 'f2' },
              { name: 'score', value: '0.700' },
            ],
            heap: [
              { id: 'f1', value: 'fold 1  (30 rows)', label: 'train' },
              { id: 'f2', value: 'fold 2  (30 rows)', label: 'HELD OUT' },
              { id: 'f3', value: 'fold 3  (30 rows)', label: 'train' },
              { id: 'f4', value: 'fold 4  (30 rows)', label: 'train' },
              { id: 'f5', value: 'fold 5  (30 rows)', label: 'train' },
            ],
          },
          {
            note: 'Round 3. Same story. Every row is now guaranteed to be validated exactly once across the whole procedure.',
            stack: [
              { name: 'train on', value: 'folds 1,2,4,5' },
              { name: 'validate on', value: 'fold 3', to: 'f3' },
              { name: 'score', value: '0.700' },
            ],
            heap: [
              { id: 'f1', value: 'fold 1  (30 rows)', label: 'train' },
              { id: 'f2', value: 'fold 2  (30 rows)', label: 'train' },
              { id: 'f3', value: 'fold 3  (30 rows)', label: 'HELD OUT' },
              { id: 'f4', value: 'fold 4  (30 rows)', label: 'train' },
              { id: 'f5', value: 'fold 5  (30 rows)', label: 'train' },
            ],
          },
          {
            note: 'Round 4 scores 0.833. Nothing improved — this fold simply happened to contain easier rows. This is the noise you were blind to with one split.',
            stack: [
              { name: 'train on', value: 'folds 1,2,3,5' },
              { name: 'validate on', value: 'fold 4', to: 'f4' },
              { name: 'score', value: '0.833' },
            ],
            heap: [
              { id: 'f1', value: 'fold 1  (30 rows)', label: 'train' },
              { id: 'f2', value: 'fold 2  (30 rows)', label: 'train' },
              { id: 'f3', value: 'fold 3  (30 rows)', label: 'train' },
              { id: 'f4', value: 'fold 4  (30 rows)', label: 'HELD OUT' },
              { id: 'f5', value: 'fold 5  (30 rows)', label: 'train' },
            ],
          },
          {
            note: 'Round 5 scores 0.900. If THIS had been your one lucky train/test split, you would be reporting 0.90 to your team.',
            stack: [
              { name: 'train on', value: 'folds 1,2,3,4' },
              { name: 'validate on', value: 'fold 5', to: 'f5' },
              { name: 'score', value: '0.900' },
            ],
            heap: [
              { id: 'f1', value: 'fold 1  (30 rows)', label: 'train' },
              { id: 'f2', value: 'fold 2  (30 rows)', label: 'train' },
              { id: 'f3', value: 'fold 3  (30 rows)', label: 'train' },
              { id: 'f4', value: 'fold 4  (30 rows)', label: 'train' },
              { id: 'f5', value: 'fold 5  (30 rows)', label: 'HELD OUT' },
            ],
          },
          {
            note: 'Average the five. 0.767 +/- 0.084 — one estimate WITH an error bar. Report both numbers, always.',
            stack: [
              { name: 'mean', value: '0.767' },
              { name: 'std', value: '0.084' },
              { name: 'report', value: '0.77 +/- 0.08' },
            ],
            heap: [
              { id: 'f1', value: 'fold 1 -> 0.700', label: 'scored' },
              { id: 'f2', value: 'fold 2 -> 0.700', label: 'scored' },
              { id: 'f3', value: 'fold 3 -> 0.700', label: 'scored' },
              { id: 'f4', value: 'fold 4 -> 0.833', label: 'scored' },
              { id: 'f5', value: 'fold 5 -> 0.900', label: 'scored' },
            ],
          },
          {
            note: 'Now the SAME rotation on time-ordered data: 12 days of sales. A shuffled fold puts day 4 in validation while days 7-10 sit in training. The red arrow is training on the future.',
            stack: [
              { name: 'validate on', value: 'day 4', to: 'past' },
              { name: 'train on', value: 'days 7-10', to: 'future', danger: true },
              { name: 'CV score', value: '0.94  (fiction)' },
            ],
            heap: [
              { id: 'past', value: 'day 4  (validated)', label: 'the past' },
              { id: 'future', value: 'days 7-10  (trained)', label: 'THE FUTURE' },
              { id: 'live', value: 'production: day 13', label: 'no future exists' },
            ],
          },
          {
            note: 'The fix: expanding window. Round 1 trains on days 0-3 only and validates on the days that come NEXT. Later days do not exist yet.',
            stack: [
              { name: 'train on', value: 'days 0-3', to: 'a' },
              { name: 'validate on', value: 'days 4-5', to: 'b' },
              { name: 'score', value: 'honest' },
            ],
            heap: [
              { id: 'a', value: 'days 0-3', label: 'train' },
              { id: 'b', value: 'days 4-5', label: 'HELD OUT' },
              { id: 'c', value: 'days 6-11', label: 'not yet visible' },
            ],
          },
          {
            note: 'Round 2 expands: the validated days 4-5 join training, days 6-7 become the new validation. Training set grows, direction of time never reverses.',
            stack: [
              { name: 'train on', value: 'days 0-5', to: 'a' },
              { name: 'validate on', value: 'days 6-7', to: 'b' },
              { name: 'score', value: 'honest' },
            ],
            heap: [
              { id: 'a', value: 'days 0-5', label: 'train (grown)' },
              { id: 'b', value: 'days 6-7', label: 'HELD OUT' },
              { id: 'c', value: 'days 8-11', label: 'not yet visible' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Choosing k: the one tradeoff',
      md: `k controls how much data each model gets to train on, and how many models you pay for.

- **k=5** → each model trains on 80% of the data, 5 fits. **k=10** → 90%, 10 fits. Both are fine defaults; 5 for slow models, 10 for small datasets.
- Bigger k = more training data per fold = **less pessimistic bias** in the estimate (your fold models are closer to the final full-data model).
- Bigger k also = training sets that overlap almost completely = the k scores are highly correlated, so **averaging them removes less noise than you think**.
- **Leave-one-out (LOOCV, k=n)**: each model trains on n−1 rows — maximum data, minimum bias. But n fits (10,000 rows → 10,000 models) and a famously **high-variance** estimate.
- Practical rule: k=5 unless the dataset is small; then k=10 or repeated 5-fold (\`RepeatedStratifiedKFold\`) to average over several shufflings.`,
    },
    {
      type: 'intuition',
      title: 'Stratified k-fold: keep the class ratio',
      md: `Your data is 5% fraud. Random folds of 100 rows will contain 2, 5, 9, 4, 5 fraud cases by pure chance — and one fold might contain zero.

- **Stratified k-fold** makes each fold carry the same class proportions as the full dataset.
- Fold with zero positives → recall is undefined and your score becomes garbage or NaN.
- Even without that extreme, unequal positive counts inflate fold-to-fold variance for no reason.
- Rule: for **classification, stratify by default**. Non-negotiable when classes are imbalanced or n is small.
- scikit-learn quietly does this for you: passing \`cv=5\` to a classifier uses StratifiedKFold. Passing your own \`KFold\` object silently turns it off.
- For regression there is no class to stratify on — but binning a skewed target and stratifying on the bins is a legitimate trick.`,
    },
    {
      type: 'intuition',
      title: 'Group k-fold: the same patient must not appear on both sides',
      md: `One patient has 40 scans in your dataset. Random folds put 32 in training and 8 in validation. Your model now recognizes *that patient*, not the disease — and scores brilliantly.

- **GroupKFold** takes a \`groups\` array and guarantees every row of a group lands in the **same fold**.
- Group = whatever unit repeats: patient, user, session, device, store, document, image-taken-on-the-same-day.
- Ask the question out loud: *"at prediction time, will I already have seen other rows from this same entity?"* If no, you must group.
- Skipping this is a **data leakage** bug, not a CV preference — the same family of mistake covered in the feature engineering and leakage module (scaling fitted before the split, target encoding computed on all rows).
- The tell: CV score is excellent, production score collapses. Grouping usually drops CV by several points — that drop is you deleting a lie, not losing accuracy.
- \`StratifiedGroupKFold\` exists for when you need both class balance and group integrity.`,
    },
    {
      type: 'intuition',
      title: 'Time-series split: the future must never train the past',
      md: `Predicting tomorrow's sales with a model that saw next month is not a model, it is a time machine. And you cannot deploy a time machine.

- Time-ordered data must **never be shuffled**. Every fold's training rows must be strictly earlier than its validation rows.
- **Expanding window** (sklearn's \`TimeSeriesSplit\`): train days 0–3 → validate 4–5; train 0–5 → validate 6–7; train 0–7 → validate 8–9. Training set grows, validation marches forward.
- **Rolling window**: same march, but the training window is fixed-length and slides (train 0–3, then 2–5, then 4–7). Use it when old regimes stop being relevant.
- Add a **gap** between train and validation if your label needs time to materialize (predicting 7-day churn → drop the 7 days adjacent to the boundary).
- Same rule applies to any ordering that mirrors deployment: user cohorts, app versions, seasons.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The fold indices, printed — shuffling time data, seen',
      code: `import numpy as np
from sklearn.model_selection import KFold, TimeSeriesSplit

days = np.arange(12)                          # 12 days of data, in chronological order

print('TimeSeriesSplit (expanding window):')
for tr, te in TimeSeriesSplit(n_splits=4).split(days):
    print('  train', days[tr], '-> validate', days[te])

print('Plain KFold(shuffle=True) fold 0 - look at the day numbers:')
tr, te = next(iter(KFold(n_splits=4, shuffle=True, random_state=0).split(days)))
print('  train', np.sort(days[tr]), '-> validate', np.sort(days[te]))

# TimeSeriesSplit (expanding window):
#   train [0 1 2 3] -> validate [4 5]
#   train [0 1 2 3 4 5] -> validate [6 7]
#   train [0 1 2 3 4 5 6 7] -> validate [8 9]
#   train [0 1 2 3 4 5 6 7 8 9] -> validate [10 11]
# Plain KFold(shuffle=True) fold 0 - look at the day numbers:
#   train [ 0  1  2  3  5  7  8  9 10] -> validate [ 4  6 11]`,
      annotations: {
        7: 'TimeSeriesSplit never shuffles and never validates on anything earlier than the training set. Note the first 4 days are never validated — that is the cost of needing a history.',
        11: 'next(iter(...)) just grabs the first fold so we can stare at it.',
        18: 'Every training block is a prefix. Every validation block comes strictly after it. That is the whole rule.',
        20: 'Here is the crime: validating on day 4 while training on days 5, 7, 8, 9 and 10. The model reads the future to predict the past, scores beautifully, and dies in production.',
      },
    },
    {
      type: 'note',
      md: `**Nested CV, honestly.** If you tune hyperparameters using your CV score, that score is now optimistic — you picked the settings that flattered those folds. The correct fix is **nested CV**: an outer loop splits off a fold purely to *estimate*, and inside each outer training set a full inner CV *tunes*. Unbiased, and it costs outer × inner × trials fits — a 5×5 nested search over 50 trials is 1,250 model fits. Which is why in practice almost everyone does the cheap version: tune with CV, then report the score on a **final test set that was never touched**. Say that tradeoff out loud in an interview and you sound like someone who has shipped.`,
    },
    {
      type: 'intuition',
      title: 'Parameter vs hyperparameter — the distinction they will ask about',
      md: `A **parameter** is learned from the data by fitting. A **hyperparameter** is set by you, before fitting, and controls *how* the fitting happens.

- Linear model: the coefficients w and intercept b are parameters. The regularization strength alpha is a hyperparameter.
- Decision tree: the split features and thresholds are parameters. \`max_depth\` and \`min_samples_leaf\` are hyperparameters.
- k-NN has *no* parameters worth the name — k is a hyperparameter and the "training" is just storing the data.
- Neural net: millions of weights are parameters. Learning rate, batch size, layer count, dropout rate are hyperparameters.
- Sanity check: if \`.fit()\` changes it, it is a parameter. If you type it into the constructor, it is a hyperparameter.
- Why it matters: parameters get gradients. Hyperparameters do not — you have to **search** for them, which is the rest of this module.`,
    },
    {
      type: 'intuition',
      title: 'Grid search, and why it dies',
      md: `Grid search is the obvious idea: list the values you care about per knob, try every combination, keep the best.

- Honest, exhaustive, trivially parallel, and reproducible. For 1–2 hyperparameters it is genuinely the right tool.
- Then it hits the wall: the number of configurations is the **product** of the value counts. 4 knobs × 5 values each = 625 configs, × 5 folds = **3,125 model fits**.
- Add one more knob and you multiply, not add. This is combinatorial death, and no amount of compute outruns a product.
- The subtler flaw: a grid tests only 5 *distinct* values of each knob no matter how many configs you run — the other 620 fits are repeats along that axis.
- Which is exactly the weakness random search exploits.`,
    },
    {
      type: 'intuition',
      title: 'Random search: same budget, better answers',
      md: `Bergstra & Bengio's result (2012), and the reason nobody grids more than two knobs anymore: **most hyperparameters barely matter**. Usually two or three do, and you do not know in advance which.

- Grid with 625 points over 4 knobs spends its whole budget testing 5 values of the knob that matters — while burning 620 fits on knobs that change nothing.
- Random search samples every configuration from distributions, so **60 trials test 60 distinct values of every knob**, including the important ones.
- Sample the important axis densely for free — that is the entire trick, and it gets *better* as the number of useless knobs grows.
- It also handles unbounded and continuous ranges naturally: sample \`loguniform(1e-5, 1e-1)\` instead of guessing five round numbers.
- And it is interruptible: stop after any number of trials and you still have a usable, unbiased sample. A half-finished grid is biased toward whatever it scanned first.`,
    },
    {
      type: 'math',
      intro: 'Why 60 random trials is the number people quote.',
      latex: [
        '\\text{grid fits} = \\left(\\prod_{j=1}^{d} |V_j|\\right) \\times k \\quad\\text{— a product, not a sum}',
        'P(\\text{no trial lands in the top } 5\\% \\text{ region}) = (1 - 0.05)^{n} = 0.95^{n}',
        'n = 60 \\;\\Longrightarrow\\; 1 - 0.95^{60} \\approx 0.95 \\quad \\text{(95\\% chance of hitting the top 5\\%)}',
      ],
    },
    {
      type: 'intuition',
      title: 'Bayesian optimization: stop sampling blind',
      md: `Random search has no memory — trial 50 is as ignorant as trial 1. Bayesian optimization remembers.

- Fit a cheap **surrogate model** of "hyperparameters → score" using the trials you have already run.
- Use an **acquisition function** (e.g. expected improvement) to pick the next point: where the surrogate predicts a good score, *or* where it is very uncertain. Exploit and explore.
- Optuna's default is **TPE** (Tree-structured Parzen Estimator): it models the distribution of good trials vs bad trials and samples where good/bad is highest — cheap, handles conditional and categorical spaces well.
- **Pruning** is the other half of the win: report intermediate scores (epoch 3 of 50, tree 40 of 500) and Optuna kills hopeless trials early instead of finishing them.
- Where it wins: when one fit is **expensive** (minutes to hours). Then thinking hard before each trial pays for itself many times over.
- Where it does not: cheap models, tiny budgets, or heavily parallel setups — random search parallelizes perfectly, Bayesian methods are inherently sequential.
- One line on the third family: **successive halving / Hyperband** (\`HalvingRandomSearchCV\`) start many configs on a small budget, kill the worst half, double the budget for survivors — a race, not a search.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'RandomizedSearchCV — and the fold noise hiding inside "best"',
      code: `import numpy as np
from scipy.stats import loguniform, randint
from sklearn.datasets import make_classification
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold

X, y = make_classification(n_samples=150, n_features=12, n_informative=4,
                           class_sep=1.3, flip_y=0.05, random_state=0)
space = {'max_depth': randint(2, 20), 'min_samples_leaf': randint(1, 20),
         'max_features': loguniform(0.05, 1.0)}
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=0)
search = RandomizedSearchCV(RandomForestClassifier(n_estimators=100, random_state=0),
                            space, n_iter=20, cv=cv, scoring='accuracy',
                            random_state=42, n_jobs=-1)
search.fit(X, y)
r, b = search.cv_results_, search.best_index_
print('best params :', {k: (v if isinstance(v, int) else round(float(v), 3)) for k, v in search.best_params_.items()})
print('best mean CV:', round(search.best_score_, 3), '+/- std', round(r['std_test_score'][b], 3))
print('its 5 folds :', np.round([r[f'split{i}_test_score'][b] for i in range(5)], 3))
print('worst trial :', round(r['mean_test_score'].min(), 3), '| trials run:', len(r['params']))

# best params : {'max_depth': 13, 'max_features': 0.832, 'min_samples_leaf': 2}
# best mean CV: 0.8 +/- std 0.084
# its 5 folds : [0.767 0.733 0.7   0.9   0.9  ]
# worst trial : 0.64 | trials run: 20`,
      annotations: {
        9: 'Distributions, not lists. randint samples integers; loguniform samples so that 0.05-0.1 gets as much attention as 0.5-1.0 — the right prior for anything measured in orders of magnitude.',
        11: 'The SAME cv object for every trial. Comparing configs scored on different folds compares noise, not models.',
        13: 'n_iter=20 is the whole budget: 20 configs x 5 folds = 100 fits, and you can set it to whatever wall-clock you can afford. A grid cannot be dialled like this.',
        14: 'random_state makes the 20 sampled configs reproducible; n_jobs=-1 uses all cores, which random search allows because trials are independent.',
        18: 'Best is 0.800 with std 0.084 across its own folds. The error bar is wider than most of the gaps between trials.',
        20: 'Best 0.800, worst 0.640. That 0.16 gap is barely twice the fold noise — with 20 trials on 150 rows, some of "best" is luck. Confirm on the untouched test set.',
      },
    },
    {
      type: 'note',
      md: `**The multiple-comparisons trap.** Run 1,000 trials and the winner is partly the config that got lucky on your validation folds — the same reason the tallest of 1,000 random people is taller than the population mean. Your reported CV score for the winner is **biased upward**, and the bias grows with trial count. Three defenses: keep the trial count sane relative to your dataset size, prefer a config whose neighbours also score well (a broad plateau beats a lone spike), and always confirm the winner on a **final test set you never optimized against**.`,
    },
    {
      type: 'intuition',
      title: 'The practical rules that survive contact with real projects',
      md: `- **Log scale for anything spanning orders of magnitude**: learning rates, alpha/C/lambda, gamma. Sampling 0.0001–0.1 uniformly means 99.9% of your samples land above 0.0001 — useless. Use \`loguniform\`.
- **Tune the few knobs that matter.** Trees/GBM: \`learning_rate\`, \`n_estimators\`, \`max_depth\` or \`num_leaves\`, \`min_samples_leaf\`/\`min_child_weight\`, subsample ratios. SVM (RBF): \`C\` and \`gamma\` — that is it. Linear: \`alpha\` (Ridge/Lasso) or \`C\` (logistic). k-NN: \`k\` and the distance metric.
- **Coarse then fine**: one wide random search over a log range, then a narrow search around the winning region. Two cheap passes beat one huge grid.
- **Put every preprocessing step inside a \`Pipeline\`** so scalers and encoders are fitted on fold-training data only. Fitting a scaler before the split leaks test statistics into training.
- **Reproducibility**: \`random_state\` on the estimator, on the splitter, and on the search. Without all three you cannot tell an improvement from a reroll.
- **Guard the test set**: split it off before you tune, look at it once, and never let a decision flow back from it. Every peek converts it into another validation set.`,
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `import numpy as np

K = 5      # <-- change me: 2, 4, 5, 10, 20 (K=20 is LOOCV on 20 rows)

n = 20
rng = np.random.default_rng(7)
x = rng.normal(size=n)
y = 3 * x + rng.normal(0, 1.5, size=n)      # noisy line, so folds disagree

folds = np.array_split(rng.permutation(n), K)
scores = []
for i, test in enumerate(folds):
    train = np.concatenate([f for j, f in enumerate(folds) if j != i])
    w = (x[train] @ y[train]) / (x[train] @ x[train])   # 1-parameter least squares
    scores.append(np.abs(y[test] - w * x[test]).mean())  # mean absolute error
    if K <= 5:
        print(f'fold {i}: test={np.sort(test)}  n_train={len(train)}  w={w:.3f}  MAE={scores[-1]:.3f}')

s = np.array(scores)
print(f'K={K}  per-fold MAE {np.round(s, 3)}')
print(f'mean {s.mean():.3f} +/- {s.std():.3f}   worst-vs-best fold gap {s.max() - s.min():.3f}')`,
        precomputedOutput: `fold 0: test=[ 3  5 13 14]  n_train=16  w=2.807  MAE=0.921
fold 1: test=[ 0  2 12 19]  n_train=16  w=2.857  MAE=1.627
fold 2: test=[ 7  9 15 17]  n_train=16  w=3.142  MAE=0.990
fold 3: test=[ 1  4 10 16]  n_train=16  w=3.014  MAE=0.733
fold 4: test=[ 6  8 11 18]  n_train=16  w=2.757  MAE=1.480
K=5  per-fold MAE [0.921 1.627 0.99  0.733 1.48 ]
mean 1.150 +/- 0.343   worst-vs-best fold gap 0.894`,
        caption: 'At K=5 read fold 3 (MAE 0.733) against fold 1 (1.627) — report either alone and you are off by 2x. Now change K. K=2 gives mean 1.089 +/- 0.097; K=5 gives 1.150 +/- 0.343; K=20 (LOOCV, one row per fold) gives 1.130 +/- 0.967 with a 3.66 gap between folds. The mean barely moves, the spread explodes: bigger K means more training data per fold but noisier individual fold scores, and LOOCV costs n fits to tell you roughly what 5 folds already said.',
      },
    },
  ],
  quiz: [
    {
      question: 'You report "accuracy 0.82" from one 80/20 split on 200 rows. Your colleague reruns with a different random_state and gets 0.74. What is the correct conclusion?',
      options: [
        {
          text: 'Both numbers are single noisy draws; you need k-fold CV to get a mean and a spread',
          explanation: 'Correct. With ~40 test rows, a handful of hard examples moves the score by points. The disagreement IS the error bar you failed to report.',
        },
        { text: 'Their run is wrong — the first number is the real one', explanation: 'Neither run is privileged. Both are samples from the same noisy distribution.' },
        { text: 'The model is unstable and should be retrained with a different algorithm', explanation: 'Nothing about the model changed between runs. The evaluation changed.' },
      ],
      correct: 0,
    },
    {
      question: 'You have 100,000 rows and a model that takes 20 minutes to fit. Which CV setup is sane?',
      options: [
        { text: 'Leave-one-out — it uses the most training data', explanation: 'LOOCV means 100,000 fits at 20 minutes each. That is roughly 3.8 years of compute.' },
        { text: 'k=10 for the tighter estimate', explanation: 'Workable but 200 minutes per evaluation, and with 100k rows the extra 10% training data buys almost nothing.' },
        {
          text: 'k=5, or even a single large hold-out set — with 100k rows a 20% validation set is already 20,000 rows and low-variance',
          explanation: 'Correct. CV matters most on small data. When the validation set is huge, a single split is already a precise measurement and k-fold is mostly wasted compute.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Your dataset is 3% positive class. You pass a plain KFold(n_splits=10) object as cv. What is the specific danger?',
      options: [
        { text: 'The folds will be different sizes', explanation: 'KFold makes folds of equal size (±1 row). Size is not the problem.' },
        {
          text: 'Positive counts vary wildly per fold and a fold may contain zero positives, making recall/precision undefined and the estimate very noisy',
          explanation: 'Correct — with 3% positives, small folds get 0, 2, 5, 1 positives by chance. StratifiedKFold fixes the class ratio per fold.',
        },
        { text: 'Nothing — sklearn always stratifies internally', explanation: 'It stratifies when you pass cv=10 (an integer) with a classifier. Passing your own KFold object explicitly overrides that.' },
      ],
      correct: 1,
    },
    {
      question: 'A hospital dataset has multiple scans per patient. Your 5-fold CV gives 0.96 AUC; production gives 0.71. Most likely cause?',
      options: [
        {
          text: 'Rows from the same patient appear in both training and validation folds — the model memorized patients, not disease. Use GroupKFold on patient id',
          explanation: 'Correct. This is group leakage: an identity signal available at CV time but never at prediction time for a new patient.',
        },
        { text: 'k=5 is too small — use k=10', explanation: 'Changing k changes the estimate slightly; it cannot explain a 25-point collapse.' },
        { text: 'The production data is simply harder', explanation: 'Possible in general, but the classic 0.96-to-0.71 pattern with repeated entities per row is grouping, not drift. Check grouping first.' },
      ],
      correct: 0,
    },
    {
      question: 'You are forecasting next week\'s demand and use KFold(shuffle=True). Why is the resulting score meaningless?',
      options: [
        { text: 'Shuffling breaks the class balance', explanation: 'That is a stratification concern, and forecasting is usually regression anyway.' },
        { text: 'It uses too little training data per fold', explanation: 'Each fold trains on 80% — data quantity is not the issue here.' },
        {
          text: 'Training folds contain rows from AFTER the validation rows, so the model learns the future to predict the past — an option it will never have in production',
          explanation: 'Correct. Time-ordered data needs TimeSeriesSplit (expanding or rolling window), where every training row precedes every validation row.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Grid search over 4 hyperparameters with 6 values each, 5-fold CV. Random search with the same wall-clock runs 60 trials. Which explores each individual hyperparameter better, and why?',
      options: [
        { text: 'Grid — it runs 6,480 fits versus 300', explanation: 'It runs far more fits, but still only ever tests SIX distinct values of each knob. The other fits are repeats along each axis.' },
        {
          text: 'Random — its 60 trials test 60 distinct values of every hyperparameter, so the two or three that actually matter get sampled densely',
          explanation: 'Correct — this is Bergstra & Bengio\'s argument. Most hyperparameters barely matter; grid wastes its budget on the ones that do not.',
        },
        { text: 'They are equivalent given the same wall-clock', explanation: 'They are not: the coverage per axis differs by an order of magnitude, which is the entire point of the result.' },
      ],
      correct: 1,
    },
    {
      question: 'Which is a hyperparameter, not a parameter?',
      options: [
        { text: 'The split threshold "age <= 37.5" chosen at a tree node', explanation: 'Learned from the data during fit — that is a parameter.' },
        { text: 'The coefficient on the "income" feature in a Ridge model', explanation: 'Fitted from data. Parameter.' },
        {
          text: 'The alpha in Ridge regression',
          explanation: 'Correct. You set it before fitting; it controls HOW the coefficients are fitted. Rule of thumb: if .fit() changes it, it is a parameter.',
        },
      ],
      correct: 2,
    },
    {
      question: 'After 2,000 Optuna trials, your best validation score is 0.913 versus 0.905 for the runner-up. Your CV fold std is 0.03. What should you do?',
      options: [
        { text: 'Ship the 0.913 config — it is measurably better', explanation: 'A 0.008 gap inside a 0.03 noise band is not measurable. You are reading noise as signal.' },
        {
          text: 'Treat the ranking near the top as noise, prefer a config sitting in a broad well-scoring region, and confirm on the untouched test set',
          explanation: 'Correct. With thousands of trials the top score is biased upward by selection (the multiple-comparisons trap). A plateau generalizes better than a lone spike, and only a clean test set settles it.',
        },
        { text: 'Run 10,000 more trials to break the tie', explanation: 'More trials increase the optimistic bias — you search harder for a configuration that got lucky on your specific folds.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain k-fold cross-validation to someone who only knows train/test split, and say what problem it actually solves.',
      answer:
        'Split the data into k equal folds. Train on k−1, validate on the held-out one, rotate until every fold has been the validation set exactly once, then average the k scores. What it solves is not overfitting — it is **measurement noise**. A single split gives you one score with an unknown error bar; with a small test set that score can swing by many points on luck alone. k-fold gives you a mean AND a standard deviation, so you can say whether a 0.01 improvement means anything. Bonus: every row contributes to both training and validation across the procedure, which matters when data is scarce. Cost: k fits instead of one.',
      isCaseBased: false,
    },
    {
      question: 'What does increasing k trade off? Why is leave-one-out not the obvious best choice?',
      answer:
        'Bigger k → each fold model trains on more data → the estimate is less pessimistically biased relative to the final full-data model. But bigger k also means the k training sets overlap almost entirely, so the k scores are strongly correlated and averaging them cancels less noise — plus you pay k fits. LOOCV (k=n) is the extreme: minimum bias, but n model fits and a high-variance estimate, because each validation "set" is a single point and the n models are nearly identical. Practical answer: k=5 by default, k=10 or repeated stratified k-fold on small data, single large hold-out when data is plentiful and fits are expensive.',
      isCaseBased: false,
    },
    {
      question: 'When must you use stratified k-fold, and when is plain k-fold fine?',
      answer:
        'Stratify whenever the target distribution across folds could vary meaningfully: any classification with imbalance, and any small dataset even when roughly balanced. Without it, a rare class can be underrepresented or entirely absent from a fold, making metrics undefined or wildly noisy. Plain KFold is fine for large balanced classification and for regression — though for a skewed continuous target, binning it and stratifying on the bins is a legitimate improvement. Practical gotcha worth naming: sklearn stratifies automatically when you pass cv=<int> with a classifier, but passing your own KFold object silently turns stratification off.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague reports 0.94 AUC in CV on a churn model. In production it does 0.72. Walk through your diagnosis.',
      answer:
        'Assume leakage until proven otherwise; a 22-point gap is almost never plain overfitting. (1) **Group leakage** — are there multiple rows per user/account? If so, the same user is in train and validation; switch to GroupKFold on user id and watch the CV score drop to something honest. (2) **Temporal leakage** — was the data shuffled despite being time-ordered? Rebuild with TimeSeriesSplit and a gap matching the label horizon. (3) **Feature leakage** — is any feature computed using information unavailable at prediction time (post-churn events, target encoding fitted on all rows, a scaler fitted before the split)? Move all preprocessing inside a Pipeline. (4) Only after those: distribution shift between the training period and now, and the tuning bias from many trials. The tell that distinguishes them: leakage shows as a CV/production gap; drift shows as a score that decays over time in production.',
      isCaseBased: true,
    },
    {
      question: 'Why is cross-validating time-series data with shuffled k-fold wrong, and what do you use instead?',
      answer:
        'Shuffling puts future rows in the training set for a validation row in the past. The model exploits information that will not exist at prediction time — seasonality it has already seen, an event it already knows about — and the score is fiction. Use TimeSeriesSplit: an expanding window (train on all history up to time t, validate on the next block, roll forward) or a rolling window with a fixed-length training period when older regimes are no longer relevant. Add a gap between train and validation equal to your label horizon, otherwise adjacent rows leak. Assumption to state: this makes the estimate slightly pessimistic early on, since the first folds train on very little history — that is the honest price.',
      isCaseBased: false,
    },
    {
      question: 'Define parameter vs hyperparameter, and explain why the distinction changes how you find each.',
      answer:
        'Parameters are learned from data by the fitting procedure: linear coefficients, tree split thresholds, neural network weights. Hyperparameters are set before fitting and govern the fitting itself: regularization strength, tree depth, k in k-NN, learning rate, number of estimators. The operational difference is differentiability — parameters have gradients with respect to the training loss, so optimization finds them directly. Hyperparameters generally do not (and are often discrete or categorical), so you can only **search**: evaluate a configuration by training a whole model and scoring it on held-out data. That is why every hyperparameter method is some flavor of "try, measure, decide where to try next".',
      isCaseBased: false,
    },
    {
      question: 'Grid search versus random search at an equal compute budget. Make the argument precisely.',
      answer:
        'Bergstra & Bengio (2012): performance usually depends strongly on a small subset of hyperparameters and barely on the rest, and you do not know which in advance. A grid with v values across d knobs spends v^d fits but tests only v distinct values of each individual knob — so along the axis that matters, its resolution is v regardless of budget. Random search with n trials tests n distinct values of every knob, so the important axis gets sampled n times instead of v times. Probabilistically: with any single trial having a 5% chance of landing in the top-5% region, 60 trials hit it with probability 1 − 0.95^60 ≈ 95%. Random search also handles continuous/unbounded ranges, is interruptible at any point, and parallelizes perfectly. Grid still wins for one or two knobs with genuinely discrete values you must cover exactly.',
      isCaseBased: false,
    },
    {
      question: 'How does Bayesian optimization (e.g. Optuna) beat random search, and when would you not bother?',
      answer:
        'It has memory. It fits a cheap surrogate model of hyperparameters → score from completed trials, then uses an acquisition function (expected improvement, or TPE\'s ratio of good-trial to bad-trial density) to pick the next configuration — balancing exploiting promising regions against exploring uncertain ones. Optuna adds pruning: report intermediate scores and hopeless trials are killed early instead of finished. It wins when a single fit is expensive, because the overhead of thinking is negligible relative to the training cost. Skip it when fits are cheap (random search finds the answer before the surrogate becomes useful), when the budget is tiny (too few points to model a surface), or when you have massive parallelism — random search is embarrassingly parallel while Bayesian methods are inherently sequential. Successive halving / Hyperband sit in between: race many configs on a small budget, kill the losers, promote survivors.',
      isCaseBased: false,
    },
    {
      question: 'Case: your team ran 5,000 Optuna trials on a 3,000-row dataset. The best validation score is 0.91, up from a 0.86 baseline. Do you believe it?',
      answer:
        'Not on that evidence. With 5,000 trials on 3,000 rows, the reported best is a maximum over 5,000 noisy estimates, so it is biased upward by selection — the multiple-comparisons trap. Checks I would run: (1) what is the fold std for the winner? If it is 0.04, a 0.05 gain is within noise. (2) Is the winner isolated or does it sit on a plateau of similar configs? A lone spike is usually luck. (3) Score the winner on a test set never used in the search — the only clean number in the room. (4) Compare the search\'s best against a reasonable-defaults model on that same test set; the honest gain is often a fraction of the CV gain. Fixes going forward: cap the trial budget relative to dataset size, use repeated CV so each trial is scored on more folds, and if the estimate genuinely has to be unbiased, use nested CV.',
      isCaseBased: true,
    },
    {
      question: 'What is nested cross-validation, and why does almost nobody run it?',
      answer:
        'Nested CV separates tuning from estimation. The outer loop splits the data into folds used only to *estimate* generalization; inside each outer training set, a complete inner CV *selects* hyperparameters, and the chosen model is then scored once on the untouched outer fold. Averaging the outer scores gives an unbiased estimate of "my whole modeling pipeline, including its tuning", not of one lucky configuration. Nobody runs it because it costs outer × inner × trials fits — 5×5 with 50 trials is 1,250 fits — and it returns an estimate, not a single model to deploy. The standard compromise is: hold out a final test set first, tune with plain CV on the rest, report the test-set score. Interviewers want to hear that you know the cheap version is a compromise and can name what it costs.',
      isCaseBased: false,
    },
    {
      question: 'Case: your CV score jumps 4 points when you move feature scaling from before the split to inside a Pipeline — but it jumps DOWN. Explain what happened and which number to trust.',
      answer:
        'Fitting the scaler on the full dataset lets each validation fold\'s mean and variance influence the training transform — a small but real leak of held-out information, which inflated the original score. Inside a Pipeline, cross_val_score refits the scaler on each fold\'s training portion only, so the validation fold is genuinely unseen. The lower number is the trustworthy one; you did not lose accuracy, you deleted an illusion. Same argument applies with much bigger effect to target/mean encoding, imputation statistics, feature selection by correlation with the target, and SMOTE — all must live inside the pipeline so they are refitted per fold. Worth adding: the leak is usually small for a StandardScaler and large for target encoding, so the magnitude of the drop tells you how leaky the step was.',
      isCaseBased: true,
    },
    {
      question: 'Which hyperparameters would you actually tune for a gradient boosting model, an RBF SVM, and a Ridge regression — and on what scale?',
      answer:
        'Gradient boosting (XGBoost/LightGBM): learning_rate and n_estimators together (they trade off — halve the rate, roughly double the trees), tree capacity via max_depth or num_leaves, a leaf-size floor like min_child_weight, and the subsample/colsample ratios. Learning rate on a log scale; capacity on a small integer range. RBF SVM: C and gamma, both on a log scale spanning several orders of magnitude — that is essentially the whole search, and both interact strongly, so search them jointly rather than one at a time. Ridge/Lasso: alpha alone, log scale (and sklearn\'s RidgeCV/LassoCV solve the whole path far cheaper than a generic search). General rule: anything that is a strength, rate, or scale gets sampled log-uniformly, because uniform sampling over 1e-5 to 1e-1 puts almost every sample in the top decade.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Why not just one train/test split?', back: 'It is one noisy measurement. On small data the score can swing 10+ points on which rows landed in test. CV gives a mean AND a spread.' },
    { front: 'k-fold in one sentence', back: 'Split into k folds; train on k−1, validate on the held-out one, rotate k times, average. Every row validated exactly once. Cost: k fits.' },
    { front: 'What does raising k trade off?', back: 'More training data per fold (less pessimistic bias) vs k fits and highly correlated, overlapping training sets. k=5 default, 10 for small data. LOOCV (k=n) is the extreme: minimum bias, n fits, high-variance estimate.' },
    { front: 'Stratified k-fold — when', back: 'Every classification by default; mandatory when imbalanced or small. Keeps each fold at the full dataset class ratio so no fold has zero positives.' },
    { front: 'Group k-fold — when', back: 'Whenever rows repeat an entity (patient, user, session). All rows of a group stay in ONE fold, or the model memorizes the entity. This is leakage, not preference.' },
    { front: 'Time-series split', back: 'Never shuffle time data. Expanding or rolling window: every training row precedes every validation row. Add a gap equal to the label horizon.' },
    { front: 'Parameter vs hyperparameter', back: 'Parameter = learned by .fit() (weights, split thresholds). Hyperparameter = set by you before fit (alpha, max_depth, learning rate). Parameters get gradients; hyperparameters get searched.' },
    { front: 'Why random search beats grid', back: 'Most hyperparameters barely matter. Grid tests only v values per axis no matter the budget; n random trials test n distinct values of EVERY axis. 60 trials ≈ 95% chance of hitting the top 5%.' },
    { front: 'Bayesian optimization / Optuna', back: 'Surrogate model of the score surface + acquisition function → sample where improvement is likely (TPE), and prune hopeless trials early. Wins when each fit is expensive; loses to random search when fits are cheap or parallelism is huge.' },
    { front: 'The multiple-comparisons trap', back: 'The best of N trials is biased upward — you selected the config that got lucky on your folds. Defend with sane trial counts, broad plateaus over lone spikes, and an untouched final test set.' },
  ],
  mindmapMarkdown: `- Cross-Validation & Hyperparameter Tuning
  - Why CV exists
    - One split = one noisy reading; report mean AND std
  - k-fold
    - Rotate the held-out fold, every row validated once
    - k=5 or 10; big k = less bias, more fits, correlated folds
    - LOOCV: n fits, high-variance estimate
  - Split variants
    - Stratified: keep the class ratio
    - Group: one patient/user, one fold (leakage — Pipeline everything)
    - Time-series: expanding or rolling, never shuffle, gap = label horizon
  - Nested CV
    - Outer loop estimates, inner loop tunes; expensive, so use a held-out test set
  - Parameter vs hyperparameter
    - .fit() learns parameters; you set hyperparameters, so they get searched
  - Tuning strategies
    - Grid: exhaustive, combinatorial death
    - Random: n distinct values per axis, interruptible
    - Bayesian / Optuna: surrogate + acquisition, TPE, pruning
    - Successive halving / Hyperband: race and cull
  - Practical rules
    - Log scale for rates and strengths
    - Tune the few knobs that matter, coarse then fine
    - random_state everywhere
    - Final test set untouched — the multiple-comparisons trap`,
}

export default m
