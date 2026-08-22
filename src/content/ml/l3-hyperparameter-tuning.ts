import type { Module } from '../types'

const m: Module = {
  id: 'ml-l3-hyperparameter-tuning',
  subjectId: 'ml',
  level: 3,
  title: 'Hyperparameter Tuning',
  whyItMatters:
    'Trying 40 settings and keeping the best is easy. Reporting the winner honestly is where almost everyone slips — and the gap between the two numbers here is 17.5 points on the same model.',
  assumes: [
    'You have read Cross-Validation',
    'You know the difference between a parameter and a hyperparameter',
  ],
  estMinutes: 20,
  sections: [
    {
      type: 'intuition',
      title: 'What tuning is, and the trap in it',
      md: `**Hyperparameters** are the settings you choose before training — tree depth, learning rate, k. **Tuning** is trying several and keeping the best.

The trap: whichever score you *chose on* is now optimistic. Trying 40 settings and keeping the highest validation score captures the luck in that validation set, exactly as picking the best of 200 random models did.

So the winner needs judging on rows that took no part in choosing it. That means **three** piles, not two.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Three piles, then 40 settings',
      code: `from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

X, y = make_classification(n_samples=200, n_features=8, n_informative=3, flip_y=0.15, random_state=0)
Xrest, Xte, yrest, yte = train_test_split(X, y, test_size=0.2, random_state=9)
Xtr, Xva, ytr, yva = train_test_split(Xrest, yrest, test_size=0.25, random_state=9)
print('train', len(Xtr), 'validation', len(Xva), 'test', len(Xte))

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
# train 120 validation 40 test 40
# configs tried: 40
# best on validation: (0.9, 4, 3)`,
      annotations: {
        7: 'Split twice: 20% off for test, then a quarter of the remainder for validation. 120 / 40 / 40 — the test rows are set aside before anything else happens.',
        13: 'Two nested loops over 8 depths and 5 leaf sizes: an exhaustive grid of 40 combinations. Each is fitted on train and scored on validation.',
        17: 'An explicit scan for the best score. max(results) would look tidier but crashes here: one of the depths is None, and Python cannot compare None with an int when two scores tie.',
        21: 'Winner: 0.900 on validation, at depth 4 with min_samples_leaf 3, chosen out of 40 candidates.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same winner, on rows nothing has touched',
      code: `winner = DecisionTreeClassifier(max_depth=best[1], min_samples_leaf=best[2], random_state=0)
winner.fit(Xtr, ytr)
print('validation score that won the search:', round(best[0], 4))
print('same model on the untouched test set:', round(winner.score(Xte, yte), 4))

# ---- real output ----
# validation score that won the search: 0.9
# same model on the untouched test set: 0.725`,
      annotations: {
        1: 'Exactly the winning configuration, refitted on exactly the same training rows. Nothing about the model has changed.',
        7: '0.900 on the set it was chosen on. 0.725 on rows it was not. A drop of 17.5 points, and both lines describe the same model on the same training data.',
      },
    },
    {
      type: 'note',
      label: 'Why the drop happens',
      md: `With 40 candidates and only 40 validation rows, the highest score is partly a measurement of which model got lucky on those particular rows.

This is the **winner's curse**, and it grows with the number of things you try. Ten configurations inflate less than a thousand. It has nothing to do with overfitting the training data — the model may fit the training set perfectly reasonably; it is the *selection* that is contaminated.

**Choose on validation. Report on test. Touch test once.**`,
    },
    {
      type: 'intuition',
      title: 'Grid search and random search',
      md: `Two ways to decide which settings to try. Both are the same try-measure-keep loop above; they differ only in the list.

- **Grid search** takes every combination of the values you list. Exhaustive, reproducible, and its cost multiplies — 8 depths × 5 leaf sizes is 40 fits, and adding a third parameter with 5 values makes it 200.
- **Random search** samples combinations from ranges you specify, for a fixed budget of trials.

Random search usually wins, for a reason that is not obvious.`,
    },
    {
      type: 'note',
      label: 'Why random search beats grid search',
      md: `Most hyperparameters do not matter much, and you do not know in advance which ones do.

A grid with 5 values per parameter tries only **5 distinct values** of the parameter that actually matters, no matter how many parameters you add — the other combinations just repeat those five. Random search with 50 trials tries **50 distinct values** of it.

There is a blunter argument too. If 5% of the settings are good enough, each random draw has a 5% chance of finding one, so 60 draws give a 1 − 0.95⁶⁰ ≈ **95%** chance of hitting one. That bound does not depend on how many parameters you are searching.`,
    },
    {
      type: 'math',
      intro:
        'The random-search bound, written out. p is the fraction of settings good enough for you and n is the number of trials. Each draw misses with probability (1 - p), so n independent draws all miss with (1 - p)^n. Note what is absent: the number of hyperparameters. That is why the argument holds however wide the search space is.',
      latex: ['P(\\text{at least one hit}) = 1 - (1 - p)^{n} \\qquad p = 0.05, \\; n = 60 \\Rightarrow 0.954'],
    },
    {
      type: 'visual',
      component: 'Plot',
      props: {
        title: 'Chance of finding a good setting, against number of random trials',
        notice:
          'Assuming 5% of settings are good enough, each independent draw has a 5% chance. After 14 trials you are at 51%, after 60 at 95.4%, after 90 at 99.0%. The curve flattens hard — which is why a fixed budget of a few dozen random trials is usually the right call, and why doubling from 60 to 120 buys almost nothing.',
        kind: 'line',
        xLabel: 'number of random trials',
        yLabel: 'chance of finding a good setting (%)',
        unit: '%',
        yMin: 0,
        yMax: 105,
        series: [
          { name: 'P(at least one hit)', points: [[0, 0], [5, 22.6], [10, 40.1], [14, 51.2], [20, 64.2], [30, 78.5], [40, 87.1], [50, 92.3], [60, 95.4], [75, 97.9], [90, 99.0], [120, 99.8]] },
        ],
        markers: [{ x: 60, y: 95.4, text: '60 trials -> 95.4%' }],
      },
    },
    {
      type: 'note',
      label: 'Nested cross-validation, in one box',
      md: `Three fixed piles fix the winner's curse but spend 40 rows on validation and 40 on test, which hurts when data is scarce.

**Nested CV** expresses the same fix as two loops. The **inner** loop searches hyperparameters on the training portion of an outer fold; the **outer** loop scores the resulting tuned model on that fold's held-out rows. Every outer fold is judged by a model tuned without ever seeing it.

It costs k_outer × k_inner × configs fits, which is why it is used for a paper or a real decision and rarely for routine work.`,
    },
  ],
  quiz: [
    {
      question: 'The winning configuration scored 0.900 on validation and 0.725 on test. What explains the gap?',
      options: [
        { text: 'The model overfitted the training data', explanation: 'It may also do that, but the gap here is between two held-out sets, which points at selection rather than fitting.' },
        { text: 'The winner\'s curse — 40 candidates were scored on 40 validation rows, so the maximum captured that set\'s luck', explanation: 'Correct. The score you select on is contaminated by the act of selecting.' },
        { text: 'The test set is harder', explanation: 'Both were drawn from the same distribution by the same splitter.' },
        { text: 'A bug in the refit', explanation: 'The same configuration and the same training rows were used in both lines.' },
      ],
      correct: 1,
    },
    {
      question: 'Why do you need three piles rather than two when tuning?',
      options: [
        { text: 'To have more data overall', explanation: 'Splitting three ways gives you less usable training data, not more.' },
        { text: 'Because the set used to choose the winner can no longer give an unbiased estimate of it', explanation: 'Correct. Validation absorbs the selection so that test stays clean for exactly one number.' },
        { text: 'Because sklearn requires it', explanation: 'Nothing in the library requires three splits.' },
        { text: 'To speed up the search', explanation: 'It has no effect on search cost.' },
      ],
      correct: 1,
    },
    {
      question: 'A grid of 5 values per parameter over 4 parameters costs 625 fits. How many distinct values of the one parameter that matters does it try?',
      options: [
        { text: '625', explanation: 'That is the number of combinations, not distinct values of one parameter.' },
        { text: '5 — the other combinations only repeat those same five values', explanation: 'Correct. That is the core argument for random search: 50 random trials would try 50 distinct values of it.' },
        { text: '20', explanation: 'Adding parameters multiplies combinations without adding resolution on any single one.' },
        { text: '125', explanation: 'That is the count for the other three parameters combined, not distinct values of one.' },
      ],
      correct: 1,
    },
    {
      question: 'If 5% of settings are good enough, roughly how many random trials give a 95% chance of finding one?',
      options: [
        { text: 'About 20', explanation: '20 trials give 1 − 0.95²⁰ ≈ 64%.' },
        { text: 'About 60', explanation: 'Correct. 1 − 0.95⁶⁰ ≈ 95.4%, and the bound does not depend on how many parameters you search.' },
        { text: 'About 300', explanation: 'Well past the point where the curve has flattened — 90 trials already gives 99%.' },
        { text: 'It cannot be estimated without knowing the parameter count', explanation: 'That is exactly what makes this argument useful: it is independent of dimensionality.' },
      ],
      correct: 1,
    },
    {
      question: 'What does nested cross-validation buy you?',
      options: [
        { text: 'Faster hyperparameter search', explanation: 'It is far slower — k_outer × k_inner × configs fits.' },
        { text: 'An honest performance estimate for a TUNED model, without spending fixed piles on validation and test', explanation: 'Correct. Each outer fold is scored by a model tuned without ever seeing it.' },
        { text: 'Better hyperparameters', explanation: 'It does not improve the search; it corrects the reported score.' },
        { text: 'Protection against data leakage in preprocessing', explanation: 'That needs a Pipeline; nesting alone does not guarantee it.' },
      ],
      correct: 1,
    },
    {
      question: 'You tuned, reported test accuracy, then tried five more configurations and reported the best test score. What is now true?',
      options: [
        { text: 'Nothing changed — you only tried five more', explanation: 'Count is irrelevant; the moment a decision depends on the test score it is contaminated.' },
        { text: 'The test set has become a validation set and no longer estimates unseen performance', explanation: 'Correct, and there is no way to undo it short of genuinely untouched data.' },
        { text: 'It is acceptable if you report both numbers', explanation: 'More honest, but neither number is now an uncontaminated estimate.' },
        { text: 'It only matters if the five were very different', explanation: 'The mechanism is selection, regardless of similarity.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Walk me through tuning a model properly.',
      answer:
        'Split three ways before anything else — or use cross-validation for the inner search and hold out a genuine test set. Search hyperparameters scoring only on validation, keep the winner, then evaluate that winner exactly once on test and report that number. The demonstration is stark: 40 configurations on a 40-row validation set gave a winner scoring 0.900 there and 0.725 on untouched rows. If I had reported the 0.900 it would have been 17.5 points optimistic, and nothing about the model was wrong.',
      isCaseBased: true,
    },
    {
      question: 'Grid search or random search?',
      answer:
        'Random, in almost all cases. The key argument is that most hyperparameters do not matter and you do not know which in advance: a grid with 5 values per parameter tries only 5 distinct values of the one that matters, however many parameters you add, while 50 random trials try 50 distinct values of it. Random search also lets you stop at any budget and add trials incrementally, where a grid is all-or-nothing. Grid is defensible when there are one or two parameters with genuinely discrete sensible values.',
      isCaseBased: false,
    },
    {
      question: 'What is the winner\'s curse in this context?',
      answer:
        'The score of the configuration you selected is biased upward, because taking a maximum over many noisy measurements captures the noise as well as the signal. It scales with the number of things tried and with how small the validation set is — 40 candidates against 40 rows is a bad ratio. It is distinct from overfitting the training data: the model may generalise fine and the reported number still be wrong. The fix is a set that took no part in the selection, or nested CV.',
      isCaseBased: false,
    },
    {
      question: 'How would you tune when each fit takes six hours?',
      answer:
        'Stop treating it as a search over a grid. Successive halving or Hyperband trains many configurations briefly, discards the worst, and gives the survivors more budget — it exploits the fact that bad settings usually look bad early. Bayesian optimisation models the response surface and proposes the next point to try, which is far more sample-efficient than random when evaluations are expensive. I would also tune on a subsample first to narrow the ranges, and fix everything I have prior knowledge about rather than searching it.',
      isCaseBased: true,
    },
    {
      question: 'Which hyperparameters would you tune first on a gradient-boosted model?',
      answer:
        'Learning rate and number of rounds together, since they trade off almost directly and early stopping handles the second for free. Then tree complexity — max_depth or num_leaves, and min_child_weight — because that is where the bias–variance dial actually sits for boosting. Then subsampling of rows and columns as regularisation. I would leave the rest at defaults, since the marginal value drops sharply and every extra parameter multiplies a grid or dilutes a random budget.',
      isCaseBased: false,
    },
    {
      question: 'Your tuned model beats the default by 0.4% on validation. Do you ship it?',
      answer:
        'Probably not on that evidence. A 0.4% difference is almost certainly inside the fold-to-fold noise — I would check the cross-validated spread before believing it, and a difference smaller than one standard error is not a difference. Even if it is real, a tuned model carries costs: more configuration to maintain, more chance of being subtly overfitted to this data snapshot, and it will need retuning as data drifts. I would take the default unless the gain is both statistically credible and materially useful.',
      isCaseBased: true,
    },
    {
      question: 'How do you keep preprocessing out of the leak when tuning?',
      answer:
        'Put every fitted step inside a Pipeline and tune the pipeline, not the model. Then scaling, imputation and feature selection are refitted on each fold\'s training portion automatically, and their own settings can be tuned in the same search using the double-underscore naming. Doing it by hand almost always leaks eventually, because the tempting order — scale everything, then split, then search — is both natural to write and wrong.',
      isCaseBased: false,
    },
    {
      question: 'When is nested CV worth its cost?',
      answer:
        'When the reported number will be acted on — a paper, a model-comparison decision, a regulatory submission — and when data is too scarce to give away fixed validation and test piles. It costs k_outer × k_inner × configs fits, so with 5 × 5 × 40 that is a thousand model fits for one honest number. For routine iteration, three fixed piles give the same protection far more cheaply, and the discipline that matters most is simply not looking at test more than once.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'The winner\'s curse', back: 'The score you selected on is biased upward, because a maximum over many noisy measurements captures the noise. 40 configs on 40 rows: 0.900 validation, 0.725 test.' },
    { front: 'Why three piles?', back: 'Validation absorbs the selection so test can give one uncontaminated number. Choose on validation, report on test, touch test once.' },
    { front: 'Is the drop overfitting?', back: 'No. The model may fit training data reasonably. It is the SELECTION that is contaminated, which is why both numbers come from held-out sets.' },
    { front: 'Grid vs random search', back: 'A 5-value grid tries only 5 distinct values of the parameter that matters, however many parameters you add. 50 random trials try 50.' },
    { front: 'The 5% argument', back: 'If 5% of settings are good enough, 60 random trials give 1 − 0.95⁶⁰ ≈ 95.4%. Independent of how many parameters you search.' },
    { front: 'Nested CV', back: 'Inner loop tunes, outer loop scores. Each outer fold is judged by a model tuned without seeing it. Costs k_outer × k_inner × configs fits.' },
    { front: 'Expensive fits?', back: 'Successive halving / Hyperband (kill bad configs early) or Bayesian optimisation (model the response surface). Not a bigger grid.' },
    { front: 'Keeping preprocessing honest', back: 'Tune a Pipeline, not a model — every fitted step then refits per fold automatically.' },
  ],
  mindmapMarkdown: `- Hyperparameter tuning
  - The trap
    - the score you CHOOSE on is optimistic
    - 40 configs, 40 validation rows
    - winner: 0.900 validation, 0.725 test
    - 17.5 points, same model, same training rows
    - this is selection, not overfitting
  - Three piles
    - train 120 / validation 40 / test 40
    - choose on validation, report on test, once
  - Grid vs random
    - grid: every combination, cost multiplies
    - 5-value grid = only 5 distinct values of what matters
    - random: 50 trials = 50 distinct values
    - 5% good -> 60 trials -> 95.4% hit chance
  - Expensive fits
    - successive halving / Hyperband
    - Bayesian optimisation
  - Nested CV
    - inner tunes, outer scores
    - honest number for a TUNED model
    - k_outer x k_inner x configs fits`,
}

export default m
