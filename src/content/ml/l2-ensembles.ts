import type { Module } from '../types'

const m: Module = {
  id: 'ml-l2-ensembles',
  subjectId: 'ml',
  level: 2,
  title: 'Ensembles: Bagging, Random Forest & Gradient Boosting',
  whyItMatters:
    'On tabular data — the data most companies actually have — a gradient-boosted forest still beats the deep net, and it is what you will reach for on day one of the job. Interviewers know this, so "why RF over one deep tree" and "boosting vs bagging" are near-guaranteed questions. Both have the same one-line answer if you understand variance.',
  estMinutes: 65,
  sections: [
    {
      type: 'intuition',
      title: 'Why a crowd beats an expert',
      md: `Ask one person to guess the number of jellybeans in a jar: they are off by a lot. Ask 500 people and average the guesses: the average lands shockingly close.

- Nobody in the crowd got smarter. The *errors* cancelled: some guessed high, some low.
- Same trick for models. Train many models that are each **unbiased but noisy**, average them, and the noise shrinks.
- Formally: this kills **variance** (sensitivity to the particular training set), not **bias** (being systematically wrong).
- One deep decision tree is exactly the right raw material — very low bias, wildly high variance. Change 5 rows and it grows a different tree.`,
    },
    {
      type: 'intuition',
      title: 'The honest condition: errors must be decorrelated',
      md: `Now ask 500 people who all read the same wrong blog post. The average is just as wrong as any one of them. The crowd only works if people are wrong *independently*.

- Averaging identical models = the same model, at 500× the cost.
- So every ensemble method is really an answer to one question: **how do I make these models disagree?**
- Bagging's answer: give each model a different random slice of the data.
- Random Forest adds: give each *split* a different random slice of the features.
- Boosting's answer is stranger: make each model deliberately specialise in what the previous ones got wrong.
- If you remember one sentence from this module, remember that decorrelation is the whole game.`,
    },
    {
      type: 'math',
      intro:
        'The formula that makes "decorrelated" concrete. Average n predictors, each with variance sigma-squared, pairwise correlation rho.',
      latex: [
        '\\operatorname{Var}\\!\\left(\\frac{1}{n}\\sum_{i=1}^{n} f_i\\right) = \\rho\\,\\sigma^2 + \\frac{1-\\rho}{n}\\,\\sigma^2',
        '\\rho = 0 \\;\\Rightarrow\\; \\frac{\\sigma^2}{n} \\quad\\text{(variance vanishes)} \\qquad \\rho = 1 \\;\\Rightarrow\\; \\sigma^2 \\quad\\text{(nothing happened)}',
        '\\text{More trees only shrink the } \\tfrac{1-\\rho}{n} \\text{ term. The } \\rho\\sigma^2 \\text{ floor is set by how correlated your trees are.}',
      ],
    },
    {
      type: 'note',
      md: `Read that floor again, because it is the whole design pressure on Random Forest. Adding trees forever cannot push variance below **rho times sigma-squared**. The only way to lower the floor is to lower rho — to make the trees genuinely different. That is why RF does not stop at bootstrap sampling.`,
    },
    {
      type: 'intuition',
      title: 'Bagging: bootstrap, train, vote',
      md: `**Bagging** = **B**ootstrap **AGG**regat**ING**. Three steps, no cleverness.

1. Draw a **bootstrap sample**: n rows sampled from your n rows *with replacement* — so some rows appear twice, some not at all.
2. Train one model on it. Repeat for B samples, completely independently.
3. Predict by averaging (regression) or majority vote (classification).
- Because each model sees a slightly different dataset, each makes slightly different mistakes. That is the decorrelation, bought cheaply.
- Step 2 is embarrassingly parallel — B trees on B cores, no coordination.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The 63% fact — why bootstrap leaves rows over',
      code: `import numpy as np

rng = np.random.default_rng(0)
n = 1000                                   # 1000 rows in the training set
draws = [np.unique(rng.integers(0, n, n)).size / n for _ in range(500)]
print('mean unique fraction:', round(float(np.mean(draws)), 4))
print('theory  1 - 1/e     :', round(1 - 1 / np.e, 4))

# mean unique fraction: 0.6322
# theory  1 - 1/e     : 0.6321`,
      annotations: {
        5: 'rng.integers(0, n, n) IS the bootstrap: n draws from n row indices, with replacement. unique().size counts how many distinct rows made it in.',
        7: 'Not folklore. P(a given row is never picked in n draws) = (1 - 1/n)^n, which converges to 1/e = 0.368. So ~63% unique, ~37% left out.',
      },
    },
    {
      type: 'note',
      md: `Those left-out ~37% have a name: **out-of-bag (OOB) rows**. For every row, some trees never saw it — so score that row using only those trees, and you get an honest validation estimate for free, without ever holding out a test set. That is the **OOB score**, and it is a real advantage of bagging that boosting cannot offer.`,
    },
    {
      type: 'intuition',
      title: 'Random Forest: the second randomization',
      md: `Bag some trees and you hit a wall. Suppose one feature (say \`income\`) is hugely predictive. Every bootstrap sample still contains it, so **every tree splits on income first** — and the trees end up near-identical. High rho, tiny variance reduction.

- Random Forest's fix: at *each split*, let the tree consider only a **random subset of features** (typically sqrt(d) for classification, d/3 for regression).
- Now most splits cannot even see \`income\`. Trees are forced to find the second-best and third-best signals.
- Individually each tree is slightly *worse*. Collectively they are far less correlated — and the formula says correlation is what matters.
- **Random Forest = bagging + per-split feature subsampling.** Both randomizations, or it is just bagged trees.`,
    },
    {
      type: 'intuition',
      title: 'The interview answer: why RF over one deep tree',
      md: `Say this, in this order, and you are done:

- A single deep tree has **low bias, high variance** — it can memorise anything, so it memorises noise too. Train accuracy 100%, test accuracy mediocre.
- Pruning the tree fixes variance by *adding bias* — you throw away real signal along with the noise.
- A forest fixes variance *without* adding bias: it keeps every tree deep and unbiased, then averages the noise away.
- The averaging only works because bootstrap + feature subsampling make the trees' errors decorrelated.
- Bonus: the forest gives you an OOB score and a feature-importance ranking for free.
- One-liner: *"A deep tree is unbiased but unstable; a forest keeps the low bias and averages the instability out."*`,
    },
    {
      type: 'note',
      md: `RF's practical profile, honestly. **Strengths:** works out of the box (defaults are genuinely good), essentially cannot overfit by adding more trees — the curve flattens, it does not turn upward — trains in parallel, no feature scaling needed, handles mixed feature types. **Limits:** the model is big (hundreds of trees in memory), inference is slower than one tree, it is not interpretable the way a single tree is, and it **cannot extrapolate** — a forest predicts by averaging training leaf values, so it can never output a number above the largest y it ever saw. Do not use it for trending time series.`,
    },
    {
      type: 'intuition',
      title: 'Boosting: the opposite philosophy',
      md: `Bagging is a committee of equals voting in parallel. Boosting is a relay race.

- Train model 1. Look at what it got wrong. Train model 2 **specifically to fix those mistakes**. Add it in. Repeat.
- Models are trained **sequentially** — model k depends on models 1..k−1. No parallelism across the chain.
- The base models are deliberately **weak**: stumps or depth-3 trees, barely better than a coin flip alone.
- Bagging takes low-bias/high-variance models and cuts variance. Boosting takes high-bias/low-variance models and cuts **bias**, by stacking up corrections.
- Same word "ensemble", opposite mechanism. Interviewers love this contrast because it is easy to get backwards.`,
    },
    {
      type: 'intuition',
      title: 'AdaBoost: reweight what you got wrong',
      md: `The first boosting algorithm that worked, and still the cleanest to explain.

- Start with every training row at equal weight.
- Train a stump. Compute its weighted error rate.
- **Raise the weight of every misclassified row, lower the weight of every correct one.** The next stump is trained on this reweighted data, so it is forced to care about the hard rows.
- Each stump also earns a vote weight alpha: accurate stumps get a loud vote, near-random ones a whisper.
- Final prediction: weighted vote of all the stumps.
- Weakness that follows straight from the design: a mislabeled row gets up-weighted every single round until it dominates. **AdaBoost is fragile to label noise and outliers.**`,
    },
    {
      type: 'math',
      intro:
        'AdaBoost is three formulas, and every number in the walkthrough below falls out of them. Weights start uniform and always sum to 1.',
      latex: [
        '\\varepsilon_t = \\sum_i w_i^{(t)}\\, \\mathbf{1}\\!\\left[h_t(x_i) \\neq y_i\\right] \\qquad \\alpha_t = \\tfrac{1}{2}\\ln\\!\\frac{1 - \\varepsilon_t}{\\varepsilon_t}',
        'w_i^{(t+1)} \\;\\propto\\; w_i^{(t)}\\, e^{+\\alpha_t}\\ (\\text{wrong}) \\qquad w_i^{(t+1)} \\;\\propto\\; w_i^{(t)}\\, e^{-\\alpha_t}\\ (\\text{right}) \\qquad \\text{then rescale so } \\sum_i w_i^{(t+1)} = 1',
        'F(x) = \\operatorname{sign}\\!\\left(\\sum_t \\alpha_t\\, h_t(x)\\right) \\qquad \\varepsilon_t = 0.5 \\Rightarrow \\alpha_t = 0 \\ (\\text{a coin flip gets no vote})',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The weight table, computed — not guessed',
      code: `import numpy as np

n = 5
w = np.full(n, 1 / n)                    # round 1: every row equally important
wrong = {1: [1, 3], 2: [4], 3: []}       # 0-based rows each stump gets wrong

for t in (1, 2, 3):
    miss = np.zeros(n, dtype=bool)
    miss[wrong[t]] = True
    eps = w[miss].sum()                  # WEIGHTED error rate, not a raw count
    print(f'round {t}  w = {np.round(w, 4)}  eps = {eps:.4f}', end='')
    if eps == 0:
        print('  -> perfect stump, alpha infinite, AdaBoost stops')
        break
    alpha = 0.5 * np.log((1 - eps) / eps)
    print(f'  alpha = {alpha:.4f}')
    w *= np.exp(alpha * np.where(miss, 1, -1))   # wrong rows up, right rows down
    w /= w.sum()                                 # renormalize back to sum 1

# round 1  w = [0.2 0.2 0.2 0.2 0.2]  eps = 0.4000  alpha = 0.2027
# round 2  w = [0.1667 0.25   0.1667 0.25   0.1667]  eps = 0.1667  alpha = 0.8047
# round 3  w = [0.1  0.15 0.1  0.15 0.5 ]  eps = 0.0000  -> perfect stump, alpha infinite, AdaBoost stops`,
      annotations: {
        5: 'The only hand-written input: which rows each stump misses. Stump 1 misses rows 2 and 4 (0-based 1 and 3), stump 2 misses row 5, stump 3 misses nothing. Every weight below is computed from that.',
        10: 'The error rate is WEIGHTED, not a count. Round 1 it equals 2/5 = 0.40 only because the weights are still uniform. Round 2 the one missed row carries 0.1667, so eps = 0.1667 — a raw count would have wrongly said 1/5 = 0.20.',
        15: 'eps = 0.40 gives alpha = 0.5*ln(1.5) = 0.2027, a near-coin-flip stump with a quiet vote. eps = 0.1667 gives 0.5*ln(5) = 0.8047, four times louder. Accuracy buys volume.',
        17: 'The update is a multiply: e^(+0.2027) = 1.2247 on the wrong rows, e^(-0.2027) = 0.8165 on the right ones. Round 1 therefore ends at 0.25 and 0.1667, not at some dramatic 10x jump.',
        18: 'Renormalizing is what makes rounds comparable, and it produces the AdaBoost invariant worth quoting in an interview: after every update the misclassified rows carry exactly half the total weight. Round 3 shows it — row 5 alone weighs 0.50.',
        22: 'eps = 0 means a stump that is perfect on the reweighted data, so alpha would be infinite and AdaBoost stops. A real edge case, not a bug — sklearn handles it the same way.',
      },
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Bagging vs boosting, frame by frame',
        notice:
          'Left column = training rows and their weights. Right column = the models being built. Red dashed = rows the current ensemble still gets wrong.',
        leftLabel: 'rows / samples',
        rightLabel: 'models built',
        frames: [
          {
            note: 'BAGGING, step 1. Three bootstrap samples drawn from the SAME 100 rows, each with replacement — so each holds only ~63 distinct rows.',
            stack: [
              { name: 'bootstrap A', value: '63 uniq/100', to: 'tA' },
              { name: 'bootstrap B', value: '64 uniq/100', to: 'tB' },
              { name: 'bootstrap C', value: '62 uniq/100', to: 'tC' },
            ],
            heap: [
              { id: 'tA', value: 'tree A (fresh)', label: 'core 1' },
              { id: 'tB', value: 'tree B (fresh)', label: 'core 2' },
              { id: 'tC', value: 'tree C (fresh)', label: 'core 3' },
            ],
          },
          {
            note: 'Step 2. All three train at the same time, each on its own sample, each split limited to a random feature subset. No tree knows the others exist.',
            stack: [
              { name: 'bootstrap A', value: 'training', to: 'tA' },
              { name: 'bootstrap B', value: 'training', to: 'tB' },
              { name: 'bootstrap C', value: 'training', to: 'tC' },
            ],
            heap: [
              { id: 'tA', value: 'tree A: depth 11', label: 'split on age' },
              { id: 'tB', value: 'tree B: depth 13', label: 'split on city' },
              { id: 'tC', value: 'tree C: depth 12', label: 'split on tenure' },
            ],
          },
          {
            note: 'Step 3. A new row arrives. Tree B is wrong — A and C outvote it. The vote only saved us because B was wrong somewhere the others were right.',
            stack: [
              { name: 'tree A votes', value: '1' },
              { name: 'tree B votes', value: '0  (wrong)' },
              { name: 'tree C votes', value: '1' },
              { name: 'ensemble', value: 'majority', to: 'out' },
            ],
            heap: [{ id: 'out', value: 'prediction: 1', label: '2 of 3' }],
          },
          {
            note: 'Free validation. Row 41 was left out of samples A and C, so score it with trees A and C only. Do that for every row: the out-of-bag score.',
            stack: [{ name: 'row 41', value: 'OOB for A, C', to: 'oob' }],
            heap: [
              { id: 'oob', value: 'scored by A + C', label: 'never saw it' },
              { id: 'held', value: 'holdout set needed: none', label: 'saved' },
            ],
          },
          {
            note: 'BOOSTING, round 1. One dataset, all five rows at weight 0.20 (weights always sum to 1). Stump 1 gets rows 2 and 4 wrong (red), so eps = 0.40 and alpha = 0.5*ln(1.5) = 0.2027. Ensemble accuracy 0.60.',
            stack: [
              { name: 'row 1', value: 'w 0.2000', to: 'm1' },
              { name: 'row 2', value: 'w 0.2000', to: 'm1', danger: true },
              { name: 'row 3', value: 'w 0.2000', to: 'm1' },
              { name: 'row 4', value: 'w 0.2000', to: 'm1', danger: true },
              { name: 'row 5', value: 'w 0.2000', to: 'm1' },
            ],
            heap: [
              { id: 'm1', value: 'stump 1', label: 'eps 0.40, alpha 0.2027' },
              { id: 'F1', value: 'ensemble acc 0.60', label: 'running' },
            ],
          },
          {
            note: 'Round 2. Wrong rows were multiplied by e^(+0.2027) = 1.2247, right rows by e^(-0.2027) = 0.8165, then renormalized: 0.25 vs 0.1667. Stump 2 fixes rows 2 and 4 and slips on row 5, so eps = 0.1667 and alpha = 0.5*ln(5) = 0.8047. Accuracy 0.80.',
            stack: [
              { name: 'row 1', value: 'w 0.1667', to: 'm2' },
              { name: 'row 2', value: 'w 0.2500', to: 'm2', danger: true },
              { name: 'row 3', value: 'w 0.1667', to: 'm2' },
              { name: 'row 4', value: 'w 0.2500', to: 'm2', danger: true },
              { name: 'row 5', value: 'w 0.1667', to: 'm2' },
            ],
            heap: [
              { id: 'm2', value: 'stump 2', label: 'eps 0.1667, alpha 0.8047' },
              { id: 'F2', value: 'ensemble acc 0.80', label: 'running' },
            ],
          },
          {
            note: 'Round 3. Row 5 was the only miss, so it alone now carries 0.50 — after every update the misclassified rows sum to exactly half the weight. Stump 3 fixes it. Running accuracy 0.60 to 0.80 to 1.00: each stump alone is weak, the alpha-weighted SUM is strong.',
            stack: [
              { name: 'row 1', value: 'w 0.1000', to: 'm3' },
              { name: 'row 2', value: 'w 0.1500', to: 'm3' },
              { name: 'row 3', value: 'w 0.1000', to: 'm3' },
              { name: 'row 4', value: 'w 0.1500', to: 'm3' },
              { name: 'row 5', value: 'w 0.5000', to: 'm3', danger: true },
            ],
            heap: [
              { id: 'm3', value: 'stump 3', label: 'chases row 5' },
              { id: 'F3', value: 'ensemble acc 1.00', label: 'running' },
            ],
          },
          {
            note: 'GRADIENT BOOSTING drops weights entirely: the next tree fits the RESIDUALS (leftover error) directly, and only 0.05 of it is added to the ensemble.',
            stack: [
              { name: 'row 1 resid', value: '-0.08', to: 'g4' },
              { name: 'row 2 resid', value: '+0.41', to: 'g4', danger: true },
              { name: 'row 3 resid', value: '-0.05', to: 'g4' },
              { name: 'row 4 resid', value: '+0.38', to: 'g4', danger: true },
              { name: 'row 5 resid', value: '+0.02', to: 'g4' },
            ],
            heap: [
              { id: 'g4', value: 'tree 4 fits these', label: 'target = -gradient' },
              { id: 'F4', value: 'F := F + 0.05 * tree4', label: 'shrunk step' },
            ],
          },
          {
            note: 'The cost of going sequential: one mislabeled row keeps gaining weight, and late trees memorise the noise. Bagging never does this. Early-stop on validation.',
            stack: [{ name: 'row 3', value: 'mislabeled', to: 'gN', danger: true }],
            heap: [
              { id: 'gN', value: 'trees 200..400 chase it', label: 'overfitting' },
              { id: 'val', value: 'val acc peaks, then falls', label: 'stop here' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Gradient Boosting: fit the residuals',
      md: `AdaBoost reweights rows. Gradient Boosting does something cleaner: the next tree does not classify anything — it **predicts the leftover error**.

- Start with a constant prediction (the mean of y). Compute the residual for each row: **r = y − prediction**.
- Train a small tree to predict **r**. Add a shrunk copy of it to the running prediction.
- Recompute residuals. Repeat. Each tree eats a bit more of the error.
- The residual is not an ad-hoc choice: for squared loss, **r is exactly the negative gradient of the loss with respect to the prediction**.
- So swapping in a different loss (log-loss, Huber, quantile) just changes what the next tree fits. Same algorithm, any differentiable loss.`,
    },
    {
      type: 'math',
      intro:
        'Gradient boosting is gradient descent — but the thing being updated is the function F, not a weight vector. Compare this to the update rule from the gradient descent module.',
      latex: [
        'r_i^{(t)} = -\\left[\\frac{\\partial L(y_i, F(x_i))}{\\partial F(x_i)}\\right]_{F = F_{t-1}} \\;\\;\\overset{\\text{squared loss}}{=}\\;\\; y_i - F_{t-1}(x_i)',
        'h_t = \\arg\\min_{h} \\sum_i \\left(h(x_i) - r_i^{(t)}\\right)^2 \\qquad F_t = F_{t-1} + \\nu\\, h_t',
        '\\text{Same shape as } w := w - \\alpha \\nabla J. \\text{ Here the "parameter" is the whole function } F, \\text{ and } \\nu \\text{ is the learning rate.}',
      ],
    },
    {
      type: 'intuition',
      title: 'Learning rate, tree count, early stopping',
      md: `The shrinkage **nu** (sklearn calls it \`learning_rate\`) decides how much of each new tree you actually keep.

- \`nu = 1.0\`: take the full correction each round. Fast, and it overfits fast.
- \`nu = 0.05\`: take 5% of each correction. Each tree matters less, so a bad tree does less damage — but you need many more trees.
- The two knobs trade off directly: **halve the learning rate, roughly double the trees.** Small nu with many trees generalises better; it just costs compute.
- Unlike a Random Forest, **more trees CAN overfit here** — the validation curve dips, bottoms out, then climbs again.
- So gradient boosting needs **early stopping**: watch validation loss, stop when it stops improving for k rounds. \`n_estimators\` becomes a budget, not a target.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Watch the validation curve peak, then decay',
      code: `import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingClassifier

X, y = load_breast_cancer(return_X_y=True)
Xtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.3, random_state=0, stratify=y)

for lr in (0.5, 0.05):
    g = GradientBoostingClassifier(n_estimators=400, learning_rate=lr, random_state=0).fit(Xtr, ytr)
    acc = np.array([(p == yva).mean() for p in g.staged_predict(Xva)])
    print(f'lr={lr}: peak {acc.max():.3f} at tree {acc.argmax() + 1}, at 400 trees {acc[-1]:.3f}')

# lr=0.5 : peak 0.947 at tree 47, at 400 trees 0.936
# lr=0.05: peak 0.947 at tree 20, at 400 trees 0.942`,
      annotations: {
        11: 'staged_predict replays the ensemble after 1, 2, 3 ... 400 trees. A full validation curve with no refitting — this is how you pick n_estimators.',
        12: 'Read the output honestly: BOTH runs peak long before 400 trees and then get worse. That decay is the overfitting a Random Forest never shows.',
        14: 'The aggressive learner (lr=0.5) decays further: 0.947 down to 0.936. The gentle one holds 0.942. Small steps forgive a late bad tree; big steps do not.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'One deep tree vs Random Forest vs Gradient Boosting, same split',
      code: `from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier

X, y = load_breast_cancer(return_X_y=True)          # 569 rows, 30 features
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=0, stratify=y)

models = {
    'one deep tree': DecisionTreeClassifier(random_state=0),
    'random forest': RandomForestClassifier(n_estimators=300, oob_score=True, random_state=0),
    'grad boosting': GradientBoostingClassifier(n_estimators=300, learning_rate=0.05, random_state=0),
}
for name, mdl in models.items():
    mdl.fit(Xtr, ytr)
    oob = f'  oob={mdl.oob_score_:.3f}' if hasattr(mdl, 'oob_score_') else ''
    print(f'{name}: train={mdl.score(Xtr, ytr):.3f}  test={mdl.score(Xte, yte):.3f}{oob}')

# one deep tree: train=1.000  test=0.906
# random forest: train=1.000  test=0.953  oob=0.967
# grad boosting: train=1.000  test=0.942`,
      annotations: {
        10: 'No max_depth: the tree grows until every leaf is pure. Its train score is 1.000 by construction — it memorised the training set.',
        11: '300 trees, each on its own bootstrap sample, each split restricted to sqrt(30) = 5 random features. Zero tuning beyond the tree count.',
        16: 'oob_score_ exists only on the forest: validation the model computed for itself during training, on rows each tree never saw. No data spent.',
        19: 'The whole module in three numbers: the tree and the forest both hit train=1.000, but test goes 0.906 to 0.953. Identical bias, less variance.',
      },
    },
    {
      type: 'note',
      md: `Note what the numbers do *not* say. All three models memorise the training set (train=1.000) — training accuracy tells you nothing here. Boosting at 0.942 lands slightly below the forest at 0.953, and that is normal on a small, clean, 569-row dataset with untuned hyperparameters: boosting's edge shows up on larger, messier data *after* tuning. The forest's 0.967 OOB estimate, computed without touching the test set, is close to its real 0.953 — that is the free validation working.`,
    },
    {
      type: 'intuition',
      title: 'XGBoost, LightGBM, CatBoost: what each actually added',
      md: `All three are gradient boosting. None changed the core idea. Each fixed a different practical bottleneck.

- **XGBoost** — added an explicitly **regularized objective** (penalties on leaf count and leaf weights), second-order gradients for better steps, built-in handling of missing values, and serious engineering: cache-aware, out-of-core, parallel split-finding.
- **LightGBM** — went for **speed on big data**: histogram binning (bucket continuous features into ~256 bins instead of sorting every value) and **leaf-wise growth** (split the single most promising leaf, not the whole level). Much faster; slightly more prone to overfit small data, so cap \`num_leaves\`.
- **CatBoost** — went for **categorical features**: ordered target encoding computed so a row never uses its own label, which kills the leakage that naive target encoding causes. Strong defaults, minimal preprocessing.
- Why they dominate tabular Kaggle: they handle mixed types and missing values natively, need no scaling, capture feature interactions automatically, and squeeze bias down where a neural net would need far more data to compete.`,
    },
    {
      type: 'note',
      md: `**Bagging vs boosting, the table interviewers want.** *Training:* parallel and independent vs sequential and dependent. *Base models:* deep low-bias trees vs shallow high-bias stumps. *Primarily reduces:* variance vs bias. *More models:* safe, curve flattens vs risky, can overfit. *Noise and outliers:* robust — bad rows are diluted vs sensitive — bad rows get chased. *Tuning:* few knobs, defaults work vs learning rate, depth, tree count, all interacting. *Free validation:* OOB score vs none, you must hold out. *Typical accuracy ceiling:* good vs usually higher, once tuned.`,
    },
    {
      type: 'intuition',
      title: 'Stacking, honestly',
      md: `Stacking combines *different kinds* of models — a forest, a boosted ensemble, a logistic regression, a k-NN — with a **meta-model** that learns how much to trust each one.

- The meta-model's inputs are the base models' predictions. Its output is the final prediction.
- The one rule that makes or breaks it: those inputs must be **out-of-fold** predictions. Split into k folds; for each fold, predict it with base models trained on the *other* folds.
- Skip that and you leak: base models predict rows they memorised, look flawless, and the meta-model learns to trust an accuracy that will not exist in production. Silent, and it always looks great offline.
- Verdict: real gains, usually small (a fraction of a percent), for a large jump in pipeline complexity and inference latency. Kaggle leaderboards yes; a production service, rarely.`,
    },
    {
      type: 'note',
      md: `**When a single model still wins.** Regulated domains where you must *explain* a decision — one shallow tree or a logistic regression is auditable, a 300-tree ensemble is not. Latency budgets in the single-digit milliseconds, where traversing hundreds of trees is too slow. Genuinely tiny datasets, where a complex ensemble just memorises. And problems needing **extrapolation** beyond the training range, which no tree ensemble can do at all — that is a linear model's job. Reaching for an ensemble is a default, not a law.`,
    },
  ],
  quiz: [
    {
      question: 'You bag 500 trees but forget to bootstrap — every tree trains on the identical full dataset. What happens?',
      options: [
        {
          text: 'You get 500 identical trees and no variance reduction at all',
          explanation:
            'Correct. Deterministic training on identical data gives identical trees: rho = 1, so variance stays at sigma-squared. You paid 500x compute for one tree.',
        },
        { text: 'Variance still drops by a factor of 500', explanation: 'That only holds at rho = 0. With identical models rho = 1 and the (1-rho)/n term is zero.' },
        { text: 'Bias drops instead', explanation: 'Averaging identical unbiased models changes neither bias nor variance. Nothing happens.' },
      ],
      correct: 0,
    },
    {
      question: 'Why does Random Forest restrict each split to a random subset of features?',
      options: [
        { text: 'To train faster by looking at less data', explanation: 'It is a small speed side-effect, not the reason — accuracy would not improve if speed were the goal.' },
        { text: 'To avoid using irrelevant features', explanation: 'Backwards: the subset is random, so irrelevant features get considered just as often as good ones.' },
        {
          text: 'To decorrelate the trees — otherwise every tree splits on the same dominant feature first',
          explanation: 'Correct. Bootstrap alone leaves the dominant feature in every sample, so trees look alike. Feature subsampling lowers rho, which is what actually shrinks variance.',
        },
      ],
      correct: 2,
    },
    {
      question: 'In gradient boosting with squared loss, what does each new tree fit?',
      options: [
        {
          text: 'The residuals of the current ensemble — which equal the negative gradient of the loss',
          explanation: 'Correct. y minus the running prediction is exactly -dL/dF for squared loss, which is why this is gradient descent in function space.',
        },
        { text: 'The original labels y, like every other tree', explanation: 'Only the very first constant model targets y. Every later tree targets what is left over.' },
        { text: 'A reweighted version of the data', explanation: 'That is AdaBoost. Gradient boosting drops sample weights and fits the residual values directly.' },
      ],
      correct: 0,
    },
    {
      question: 'Your gradient boosting validation loss falls for 120 rounds, then steadily rises through round 500. Best fix?',
      options: [
        { text: 'Increase the learning rate to converge before it overfits', explanation: 'A bigger learning rate overfits sooner and harder. Wrong direction.' },
        {
          text: 'Stop at the round where validation bottomed out, and consider a smaller learning rate',
          explanation: 'Correct. Boosting genuinely overfits with more trees, so early stopping on a validation set is mandatory. Smaller nu makes the curve flatter and more forgiving.',
        },
        { text: 'Add more trees — the curve will come back down', explanation: 'It will not. Once boosting starts fitting noise, more rounds fit more noise.' },
      ],
      correct: 1,
    },
    {
      question: 'Which statement about out-of-bag (OOB) score is true?',
      options: [
        { text: 'It works for both bagging and boosting', explanation: 'Boosting trains sequentially on all the data — there are no consistently left-out rows to score against.' },
        { text: 'It is computed on the test set', explanation: 'The opposite: its whole appeal is that it never touches the test set.' },
        {
          text: 'It scores each row using only the trees whose bootstrap sample excluded it — free validation',
          explanation: 'Correct. About 37% of trees never saw any given row, so those trees form an honest mini-ensemble for it.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Your training labels contain about 5% random mislabeling. Which ensemble degrades more, and why?',
      options: [
        {
          text: 'Boosting — the noisy rows stay wrong, so they keep gaining weight and later models chase them',
          explanation: 'Correct. The sequential design has no defence against a permanently-wrong row. Bagging dilutes it: it appears in only ~63% of samples and gets outvoted.',
        },
        { text: 'Bagging — averaging propagates the noise to every tree', explanation: 'Averaging suppresses noise; it does not spread it. Bagging is the robust one here.' },
        { text: 'Neither — trees are immune to label noise', explanation: 'Deep trees memorise mislabeled rows readily. Nothing is immune.' },
      ],
      correct: 0,
    },
    {
      question: 'You stack a forest and a boosted model, feeding the meta-model predictions from base models trained on the full training set. What goes wrong?',
      options: [
        { text: 'Nothing — this is the standard recipe', explanation: 'It is a common bug, not the recipe. The standard recipe requires out-of-fold predictions.' },
        { text: 'The meta-model will underfit', explanation: 'The opposite: it will look excellent offline and collapse in production.' },
        {
          text: 'Leakage — the base predictions are on memorised rows, so the meta-model learns to trust an accuracy that will not exist in production',
          explanation: 'Correct. Base models score near-perfectly on their own training rows. Only out-of-fold predictions show the meta-model realistic base-model behaviour.',
        },
      ],
      correct: 2,
    },
    {
      question: 'You train a Random Forest on 2019-2023 sales to forecast 2024, whose true values are all above any historical figure. What happens?',
      options: [
        {
          text: 'Predictions cap out at roughly the largest training value — forests cannot extrapolate',
          explanation: 'Correct. A forest predicts by averaging training leaf values, so its output is bounded by the training range. Trending series need a model with a trend term.',
        },
        { text: 'It extrapolates the trend as long as you add enough trees', explanation: 'More trees change nothing about the range: every prediction is still an average of seen values.' },
        { text: 'It handles it fine because the trend is a feature it can learn', explanation: 'It can learn the trend within the training range and still cannot output a value beyond it.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why use a Random Forest instead of one deep decision tree?',
      answer:
        'A single deep tree has low bias and very high variance — resample 5 rows and you get a different tree, so it memorises noise. You could prune it, but pruning buys stability by adding bias. A forest gets stability for free instead: keep every tree deep and unbiased, then average many of them so the noise cancels. The averaging works only because the trees are decorrelated, which is why RF does two randomizations — bootstrap sampling of rows, plus a random feature subset at every split (without the second one, every tree splits on the dominant feature first and they all look alike). You also get an OOB score and feature importances for free. The cost: a bigger, slower, less interpretable model.',
      isCaseBased: false,
    },
    {
      question: 'Gradient boosting vs bagging — compare them properly.',
      answer:
        'Training: bagging trains B models in parallel on independent bootstrap samples; boosting trains sequentially, each model fitting what the running ensemble still gets wrong. Base models: bagging wants deep, low-bias, high-variance trees; boosting wants weak, high-bias, low-variance stumps. Error attacked: bagging reduces variance and leaves bias alone; boosting reduces bias by accumulating corrections. Adding models: harmless in bagging (the curve flattens), dangerous in boosting (validation loss eventually rises, so you need early stopping). Noise: bagging is robust because a bad row appears in only ~63% of samples and gets outvoted; boosting chases the bad row round after round. Tuning: RF works on defaults, boosting needs learning rate, depth and tree count tuned together. Accuracy: a tuned boosted model usually wins on tabular data, which is why XGBoost/LightGBM dominate Kaggle — but RF is the better default when you have one afternoon.',
      isCaseBased: false,
    },
    {
      question: 'Explain the ~63% figure in bootstrap sampling, and what the other 37% is used for.',
      answer:
        'You draw n rows from n with replacement. For any given row, P(not picked in one draw) = 1 - 1/n, so P(never picked) = (1 - 1/n)^n, which converges to 1/e = 0.368. So each bootstrap sample contains about 63.2% distinct rows; duplicates make up the rest. The excluded ~37% are that tree\'s out-of-bag rows. Across the forest, every row is out-of-bag for roughly a third of the trees, so you can predict it using only those trees and average the result over all rows: an honest generalization estimate that costs no data and no extra fitting. It is roughly comparable to leave-one-out CV and is why RF can skip a separate validation split on small datasets.',
      isCaseBased: false,
    },
    {
      question: 'What exactly makes gradient boosting "gradient descent", and where does it descend?',
      answer:
        'Ordinary gradient descent updates a parameter vector: w := w - alpha * dJ/dw. Gradient boosting updates a whole function: F := F + nu * h, where h is a tree fitted to the negative gradient of the loss with respect to the current predictions, -dL/dF, evaluated at each training point. For squared loss that negative gradient is exactly y - F(x), the residual — which is why the folk explanation "fit the residuals" is correct but incomplete. The general statement is: it is steepest descent in function space, with a regression tree used as the (approximate) step direction and nu as the learning rate. That framing is what lets the same algorithm run on log-loss, Huber, quantile, or ranking objectives — you only change what the next tree is asked to predict.',
      isCaseBased: false,
    },
    {
      question: 'How do learning rate and number of trees interact in gradient boosting?',
      answer:
        'They are two views of the same total step size. Shrinkage nu scales how much of each new tree gets added, so roughly, halving nu requires doubling n_estimators to reach the same fit. Small nu with many trees generalises better — each individual tree contributes little, so a bad or noise-fitting tree cannot do much damage, and the ensemble approaches the optimum along a smoother path. The cost is training time and model size. The practical recipe: fix nu at something small (0.05 to 0.1), set n_estimators generously high, and let early stopping on a validation set choose the actual count. Never grid-search both independently — they are correlated, and you will waste most of the grid.',
      isCaseBased: false,
    },
    {
      question: 'What did XGBoost, LightGBM and CatBoost each add over plain gradient boosting?',
      answer:
        'XGBoost: a regularized objective (L1/L2 penalties on leaf weights plus a penalty per leaf), second-order Taylor approximation of the loss for better split scoring, native missing-value handling, and heavy systems engineering — parallel split-finding, cache-aware access, out-of-core training. LightGBM: speed at scale, via histogram binning (continuous features bucketed into ~256 bins so split-finding is O(bins) not O(sorted values)) and leaf-wise rather than level-wise growth (always split the leaf with the biggest loss reduction), which converges in fewer trees but overfits small data unless num_leaves is capped. CatBoost: ordered target statistics for categorical features, computed so a row never sees its own label — removing the leakage in naive target encoding — plus ordered boosting to fight prediction shift, and very strong defaults. All three are the same algorithm underneath; the differences are regularization, split-finding strategy, and categorical handling.',
      isCaseBased: false,
    },
    {
      question: 'Case: your Random Forest scores 0.94 offline but 0.71 in production. The pipeline is unchanged. Walk through your debugging.',
      answer:
        'The gap is too big for variance, so suspect the evaluation, not the model. (1) Leakage — the number one cause. Was any feature computed using information unavailable at prediction time (an aggregate over the full dataset, a post-outcome field, a target-encoded column fitted before the split)? Check whether the top features by importance are ones you could actually have at request time. (2) Split methodology — random split on temporal or grouped data leaks near-duplicate rows across train and test; re-evaluate with a time-based or group-aware split. (3) Distribution shift — compare production feature distributions to training; a forest cannot extrapolate, so a shifted numeric range silently clamps predictions. (4) Threshold and prior — offline accuracy at 0.5 may not transfer if the production class balance differs. (5) Serving skew — different preprocessing or feature versions in the serving path. Order matters: check the OOB score first; if OOB was also 0.94, the model really did learn the training distribution, which points hard at leakage or shift rather than overfitting.',
      isCaseBased: true,
    },
    {
      question: 'Case: a teammate reports "our XGBoost model gets worse the more trees we add — boosting must be broken". What do you tell them, and what do you check?',
      answer:
        'Nothing is broken; that is boosting behaving exactly as designed. Unlike a Random Forest, added trees keep reducing training loss, so past a point they fit noise and validation loss rises. Checks and fixes, in order: (1) Are they reading training or validation loss? Training loss falling forever is expected. (2) Turn on early stopping with a validation set and a patience of ~50 rounds — n_estimators should be a ceiling, not a target. (3) Lower learning_rate (0.3 to 0.05) so the overfitting onset is gentler and later. (4) Regularize: cap max_depth (3 to 6), raise min_child_weight, add subsample and colsample_bytree below 1.0 for stochastic gradient boosting, add lambda/alpha. (5) Check label noise — if a chunk of labels is wrong, boosting will chase it and a Random Forest may genuinely be the better model here. The one-line summary for them: "more trees is safe in bagging, a hyperparameter in boosting".',
      isCaseBased: true,
    },
    {
      question: 'How does stacking work, and what is the single mistake that ruins it?',
      answer:
        'Stacking trains several diverse base models, then a meta-model (often a simple regularized linear model) that takes the base predictions as features and learns how to weight them — so it can learn "trust the k-NN in dense regions, trust the boosted trees elsewhere". The fatal mistake is generating the meta-model\'s training features with base models trained on the same rows they predict. Those in-sample predictions are near-perfect, so the meta-model calibrates against an accuracy that will never exist at inference and the whole stack degrades in production, silently and with a great offline score. The fix is out-of-fold prediction: split into k folds, and for each fold predict it with base models trained only on the other folds. Worth adding: stacking usually buys a fraction of a percent for a large increase in pipeline complexity, training cost and inference latency — great on a leaderboard, usually not worth it in a service.',
      isCaseBased: false,
    },
    {
      question: 'When would you deliberately NOT use an ensemble?',
      answer:
        'Four cases. (1) Explainability requirements — credit, insurance, medical or anything with a regulator: one shallow tree or a logistic regression can justify a decision per feature; a 300-tree ensemble cannot, and SHAP values are an approximation, not the model. (2) Strict latency or memory budgets — hundreds of tree traversals per request, or hundreds of megabytes on an edge device. (3) Very small data — an ensemble has more capacity to memorise, and with a few hundred rows a regularized linear model often generalises better and is far easier to defend. (4) Extrapolation — any tree ensemble predicts averages of training leaf values, so it is structurally incapable of outputting a value beyond the training range; trending time series need a model with an explicit trend. Also worth naming: if a linear baseline is already within a fraction of a percent, the ensemble is buying complexity you will maintain for years.',
      isCaseBased: false,
    },
    {
      question: 'Why does averaging reduce variance but not bias, and what follows from that?',
      answer:
        'Take B unbiased predictors with the same variance. The expected value of their average equals the common expected value, so bias is untouched — averaging cannot fix a model that is systematically wrong. Variance, though, becomes rho*sigma^2 + (1-rho)/B * sigma^2. Two consequences. First, bagging is only useful on high-variance base models — bagging 500 linear regressions is nearly pointless, which is why the base learner is always a deep tree. Second, more models only shrink the (1-rho)/B term, so the variance floor is set by correlation, not by B; once trees are correlated, adding trees stops helping. That is the entire justification for feature subsampling in Random Forest, and it also explains why boosting had to take a completely different route: since it targets bias, it must build models that depend on each other, and it gives up the parallelism and noise-robustness of bagging in exchange.',
      isCaseBased: false,
    },
    {
      question: 'AdaBoost in your own words, and one concrete weakness that follows from its design.',
      answer:
        'Start with uniform sample weights. Each round: train a weak learner (usually a stump) on the weighted data, compute its weighted error rate, give it a vote weight alpha that is large when the error is small, then multiply up the weights of the rows it misclassified and multiply down the rest, and renormalize. Final prediction is the alpha-weighted vote. It was later shown to be gradient boosting on exponential loss, which is exactly the weakness: exponential loss grows exponentially in the margin, so a permanently misclassified row — a mislabeled one, or a genuine outlier — has its weight blown up every single round until it dominates the training signal and every later stump is fitted to a mistake. That is why AdaBoost is notably fragile to label noise, and why gradient boosting with a robust loss such as Huber, or a Random Forest, is the safer choice on dirty data.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Why ensembles work', back: 'Averaging many unbiased, noisy models cancels their errors. Cuts VARIANCE, not bias — and only if the errors are decorrelated.' },
    { front: 'Variance of an average of n predictors', back: 'rho*sigma^2 + (1-rho)/n * sigma^2. More models shrink only the second term; correlation rho sets the floor.' },
    { front: 'Bagging + the 63% / 37% fact', back: 'Bootstrap n rows with replacement, train independently, vote. (1-1/n)^n -> 1/e: ~63% distinct rows, the ~37% left out are out-of-bag.' },
    { front: 'OOB score', back: 'Score each row using only the trees whose sample excluded it. Free validation, no holdout — bagging only, never boosting.' },
    { front: 'Random Forest, and why over one deep tree', back: 'Bagged deep trees PLUS a random feature subset per split (~sqrt(d)) — that second randomization decorrelates them. Same low bias as one tree, far less variance; pruning would cost bias, averaging is free. Cost: big, slow, no extrapolation.' },
    { front: 'Boosting in one line', back: 'Train weak models sequentially, each fitting what the running ensemble still gets wrong. Reduces BIAS. Sensitive to noise.' },
    { front: 'AdaBoost vs Gradient Boosting', back: 'AdaBoost reweights misclassified rows and takes a weighted stump vote: alpha = 0.5*ln((1-eps)/eps), wrong rows scale by e^(+alpha), right rows by e^(-alpha), then renormalize (misclassified always end at half the weight). GB drops weights and fits the residual (= negative gradient) directly, any differentiable loss.' },
    { front: 'Learning rate nu', back: 'F := F + nu*h. Halve nu, roughly double the trees. Small nu + many trees + early stopping = the standard recipe.' },
    { front: 'XGB / LGBM / CatBoost', back: 'Regularized objective + engineering / histogram bins + leaf-wise growth / ordered target encoding for categoricals.' },
    { front: 'Stacking, and its trap', back: 'A meta-model learns to combine base predictions. Those inputs MUST be out-of-fold, or you leak and the offline score is fiction.' },
  ],
  mindmapMarkdown: `- Ensembles: Bagging, Random Forest & Gradient Boosting
  - Why they work
    - Averaging cancels error: variance down, bias same
    - Var = rho*s^2 + (1-rho)/n*s^2
    - Condition: DECORRELATED errors
  - Bagging
    - Bootstrap n rows with replacement
    - ~63% unique, ~37% out-of-bag
    - Parallel, then vote or average
    - OOB score = free validation
  - Random Forest
    - Bagging + random features per split (sqrt d)
    - Else every tree picks the dominant feature
    - Defaults work, more trees always safe
    - Limits: big, slow, cannot extrapolate
  - Boosting
    - Sequential, each fixes prior mistakes
    - Weak learners, reduces BIAS
    - AdaBoost: reweight wrong rows, weighted vote
    - Fragile to label noise and outliers
  - Gradient Boosting
    - New tree fits residuals = negative gradient
    - Gradient descent in FUNCTION space
    - Small learning rate + many trees
    - More trees CAN overfit: early stop
  - XGBoost / LightGBM / CatBoost
    - Regularized objective + engineering
    - Histogram bins + leaf-wise growth
    - Ordered target encoding for categoricals
  - Bagging vs boosting
    - parallel vs sequential
    - variance vs bias
    - noise-robust vs noise-chasing
  - Stacking
    - Meta-model over base predictions
    - MUST be out-of-fold, else leakage
  - When one model wins
    - Interpretability, latency, tiny data
    - Extrapolation needed`,
}

export default m
