import type { Module } from '../types'

const m: Module = {
  id: 'ml-l3-feature-engineering',
  subjectId: 'ml',
  level: 3,
  title: 'Feature Engineering & Data Leakage',
  whyItMatters:
    'On tabular data, the person with better features beats the person with a better model — almost every time. And the fastest way to lose a FAANG ML round is a leaky feature: your CV score says 0.97, production says 0.61, and the interviewer watches how you find it. This module is the two halves of that: how to build features, and how to stop them from cheating.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'The framing: features beat models',
      md: `Two teams enter a tabular competition. Team A tunes XGBoost for a week. Team B spends the week building *price_per_sqft*, *days_since_last_login*, and a clean date expansion, then runs default XGBoost. Team B wins.

- A model can only combine what you hand it. It cannot invent *price ÷ area* if you never gave it the ratio and it only splits one column at a time.
- Swapping Random Forest for LightGBM usually moves the metric by fractions of a point. One good feature moves it by points.
- So the honest ranking of effort on tabular problems: **data quality → features → model choice → hyperparameters**.
- Deep learning flipped this for images/text/audio — the network *learns* the features. Tabular did not flip.
- Interview line: *"On tabular data I spend most of my time on features; the model is a commodity."*`,
    },
    {
      type: 'intuition',
      title: 'Scaling: three flavours, one purpose',
      md: `Age is 18–90. Salary is 20,000–2,000,000. To a distance calculation, age simply does not exist — salary drowns it. Scaling puts every column on comparable footing.

- **Standardization (z-score)**: subtract the mean, divide by the std. Result: mean 0, std 1. The default. Keeps outliers (they just become large z-values) and does not bound the range.
- **Min-max normalization**: squash to [0, 1] using the min and max. Nice when you need a bounded range (image pixels, some neural nets). Brutally outlier-sensitive — one wrong 10,000,000 crushes everything else into [0, 0.001].
- **Robust scaling**: subtract the *median*, divide by the *IQR* (Q3 − Q1). Median and IQR barely move when outliers exist, so the bulk of the data keeps a sane spread.
- Pick by the data, not by habit: heavy tails or known outliers → robust; bounded input needed → min-max; everything else → standardize.
- Non-negotiable: **fit the scaler on train only**. More on that in the leakage half of this module.`,
    },
    {
      type: 'math',
      intro: 'The three transforms, one line each. Every parameter here (mean, std, min, max, median, IQR) is learned from the training data only.',
      latex: [
        'z = \\frac{x - \\mu}{\\sigma} \\qquad \\text{standardization: mean } 0 \\text{, std } 1',
        'x_{\\text{mm}} = \\frac{x - x_{\\min}}{x_{\\max} - x_{\\min}} \\qquad \\text{min-max: squashed into } [0, 1]',
        'x_{\\text{rob}} = \\frac{x - \\text{median}(x)}{Q_3 - Q_1} \\qquad \\text{robust: outliers barely move median and IQR}',
      ],
    },
    {
      type: 'intuition',
      title: 'Which algorithms need scaling — and why',
      md: `This is an interview favourite because the wrong answer is "all of them, to be safe". The right answer is a mechanism, not a list. Ask one question: **does the algorithm compare magnitudes across different columns?**

- **Distance-based — YES.** kNN, K-Means, SVM with an RBF kernel. They compute ‖x₁ − x₂‖. A column measured in the millions owns that sum outright.
- **Gradient-descent trained — YES.** Linear regression, logistic regression, neural nets. The gradient is *error × input*, so a huge column gets huge updates; the loss surface becomes a stretched ravine and one shared learning rate cannot fit both directions. This is conditioning, not correctness — GD would eventually get there, just very slowly.
- **Regularized models — YES.** Ridge, Lasso, elastic net. The penalty λΣw² punishes *coefficient size*, and a coefficient's size depends on its feature's units. Measure height in metres instead of centimetres and its coefficient becomes 100× larger, so the penalty hits it 10,000× harder. Same model, different answer.
- **PCA — YES.** PCA finds directions of maximum *variance*, and variance is unit-dependent. Unscaled, PC1 is just "whichever column has the biggest numbers".
- **Trees and tree ensembles — NO.** Decision Tree, Random Forest, XGBoost, LightGBM. A split is an ordinal question: *is x ≤ t?* Any monotonic rescale keeps the exact same row ordering, so the exact same splits are available. Scaling changes literally nothing.
- **Naive Bayes — NO.** It models each feature's distribution separately and multiplies probabilities. There is no cross-feature magnitude comparison to distort.`,
    },
    {
      type: 'note',
      md: `Two footnotes that catch people out. **One:** trees ignoring scale does *not* mean trees ignore transforms — a ratio like *price_per_sqft* still helps a tree enormously, because a tree cannot divide two columns on its own. **Two:** "needs scaling" is about *features*, not the target; scaling y matters mainly for numerical stability in neural nets, and you must invert it before reporting an error in real units.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Proof in eight lines: same data, kNN cares, tree does not',
      code: `from sklearn.base import clone
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline

X, y = make_classification(n_samples=600, n_features=2, n_informative=2,
                           n_redundant=0, random_state=0)
X[:, 1] *= 1000                  # column 2 now lives on a 1000x scale
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=0)

for name, model in [('kNN ', KNeighborsClassifier()),
                    ('tree', DecisionTreeClassifier(random_state=0))]:
    raw = clone(model).fit(Xtr, ytr).score(Xte, yte)
    scaled = make_pipeline(StandardScaler(), clone(model)).fit(Xtr, ytr).score(Xte, yte)
    print(name, 'raw', round(raw, 3), '| scaled', round(scaled, 3))

# kNN  raw 0.589 | scaled 0.972
# tree raw 0.95 | scaled 0.95`,
      annotations: {
        11: 'The only change to the data: one column multiplied by 1000. No information added or removed.',
        16: 'clone() returns an unfitted copy with the same hyperparameters. Feeding the SAME instance into both runs happens to work here — sklearn refits from scratch — but it silently carries state on anything with warm_start, partial_fit or a stored vocabulary. Clone once, never think about it again.',
        17: 'make_pipeline puts the scaler INSIDE the model, so .fit() fits the scaler on Xtr only. This is the leak-proof habit — start it now.',
        20: 'kNN goes 0.589 -> 0.972. Unscaled, the distance metric only ever sees column 2.',
        21: 'Tree: identical to three decimals. Splits are "is x <= t?" — multiplying x by 1000 just multiplies t by 1000.',
      },
    },
    {
      type: 'intuition',
      title: 'Encoding categoricals: one-hot',
      md: `Models eat numbers. *city = "Mumbai"* is not a number. One-hot encoding turns one column of k categories into k columns of 0/1 — exactly one is hot per row.

- Why not just number them 0,1,2? Because that invents an ordering. More on that next.
- **Cardinality explosion** is the cost: a *zip_code* column with 20,000 values becomes 20,000 columns, almost all zero. Memory blows up, linear models overfit the rare ones, and trees suffer badly — each binary column is a weak split, so the useful signal gets fragmented.
- Guardrails: cap at the top-N categories and bucket the rest into "Other"; or group by domain (zip → city → state); or move to target/hashing encoding for genuinely high cardinality.
- **The dummy-variable trap** (linear models only): if you keep all k columns *and* an intercept, the columns sum to 1 everywhere — perfect multicollinearity, XᵀX is singular, coefficients become unstable or unsolvable. Fix: drop one column (\`drop='first'\`), making it the reference category.
- Trees and regularized models do not care about the trap; ridge/lasso penalties make the system solvable again. Plain OLS does care.`,
    },
    {
      type: 'intuition',
      title: 'Ordinal, target, frequency, hashing',
      md: `One-hot is the safe default. The other four exist for when it is not enough.

- **Ordinal / label encoding**: map categories to integers. Correct *only* when the order is real — small < medium < large, or bronze < silver < gold — and ideally when the spacing is roughly meaningful.
- Label-encode an *unordered* column and you poison distance and linear models: with red=0, green=1, blue=2, the model now believes blue is twice green and that green sits between red and blue. A linear model fits one coefficient to that fiction.
- Trees survive it. A tree can isolate any single value with two splits (x > 0.5 and x ≤ 1.5), so it can rebuild the categories — it just wastes depth doing it.
- **Target / mean encoding**: replace each category with the mean target for that category (city → average churn rate in that city). Enormously powerful on high-cardinality columns, one column instead of 20,000 — and the single most leak-prone technique in this module. It must be computed **out-of-fold** and **smoothed**. Details below.
- **Frequency / count encoding**: replace the category with how often it appears. Cheap, one column, never leaks (it does not touch y), and often genuinely predictive — rare values behave differently.
- **Hashing trick**: hash the category into one of n fixed buckets. Fixed memory, no vocabulary to store, handles unseen values for free — at the cost of collisions and total loss of interpretability.`,
    },
    {
      type: 'intuition',
      title: 'Target encoding, done honestly',
      md: `The failure mode is easy to see with one row. A customer id appears exactly once, and that customer churned. Its mean-target encoding is 1.0 — which *is* the label, copied into a feature. The model reads the answer off the feature column.

- Fix one — **out-of-fold**: to encode a row, use only the *other* folds' rows to compute the category mean. The row never contributes to its own encoding. scikit-learn's \`TargetEncoder\` does this cross-fitting internally.
- Fix two — **smoothing**: blend the category mean toward the global mean, weighted by how many rows that category has. A category seen 5,000 times keeps its own mean; a category seen twice is dragged back to the global average.
- Both fixes together, or you are just leaking more slowly.
- Even done right, target encoding is fragile: it needs enough rows per category, and it silently assumes the category-to-target relationship is stable over time.`,
    },
    {
      type: 'math',
      intro: 'Smoothed target encoding. n_c = rows in category c, ȳ_c = that category’s mean target, ȳ = global mean, m = smoothing strength (a hyperparameter, often 10–100).',
      latex: [
        '\\text{enc}(c) = \\frac{n_c \\, \\bar{y}_c + m \\, \\bar{y}}{n_c + m}',
        'n_c \\gg m \\Rightarrow \\text{enc}(c) \\approx \\bar{y}_c \\qquad n_c \\ll m \\Rightarrow \\text{enc}(c) \\approx \\bar{y}',
      ],
    },
    {
      type: 'note',
      md: `**The unseen-category problem.** Every encoder learns a vocabulary at fit time, and production will hand you a value that was not in it — a new city, a new device model, a typo. Decide the behaviour *before* it happens: one-hot in scikit-learn takes \`handle_unknown='ignore'\` (all-zero row); target encoding falls back to the global mean; frequency encoding falls back to 0; hashing never has the problem. Silence is the danger — an encoder that crashes at 3am is better than one that quietly maps every new value to category 0.`,
    },
    {
      type: 'intuition',
      title: 'Missing values: ask why first',
      md: `Before choosing an imputer, ask why the value is missing. The mechanism decides whether your fix is harmless or a bias factory.

- **MCAR** (missing completely at random): a sensor dropped a packet. Missingness is unrelated to anything. Dropping rows is unbiased, just wasteful.
- **MAR** (missing at random *given the other columns*): older customers skip the income field more often. Model-based imputation using the other columns works well here.
- **MNAR** (missing not at random): people with very high income skip the income field *because* it is high. The missingness depends on the unseen value itself. No imputer can recover this honestly — the missingness itself is the signal.
- Honest note: you can rarely prove which one you have. You reason about it from domain knowledge, and you say so out loud in an interview.`,
    },
    {
      type: 'intuition',
      title: 'Drop, impute, or flag',
      md: `Three moves, in rough order of how often they are right.

- **Drop the column** if it is mostly empty (say >60–70% missing) and you have no domain reason to keep it.
- **Drop the rows** only when few rows are affected and the data is plausibly MCAR. Dropping 30% of your rows to save one column is a bad trade.
- **Impute**: median for numeric (robust to outliers; mean only for clean symmetric columns), mode for categorical, or the explicit category "Missing" — which is often better than guessing.
- **Forward-fill** for time series, because yesterday's value is a genuinely good estimate of today's. Never back-fill on time series: that pulls the future into the past, which is leakage.
- **Model-based**: KNNImputer or IterativeImputer predict the missing value from the other columns. Stronger, slower, and must be fit inside the fold like everything else.
- **The underrated trick**: add an \`is_missing\` 0/1 indicator column alongside whatever you impute. Missingness is frequently signal — "did not fill in the income field" predicts things — and the indicator lets the model use it while the imputed value keeps the row usable.`,
    },
    {
      type: 'note',
      md: `**Outliers: detect, cap, or leave alone.** Detect with z-score (|z| > 3) or the IQR rule (outside Q1 − 1.5·IQR, Q3 + 1.5·IQR), then choose deliberately. **Leave alone** if the model is a tree (a split does not care whether the point is at 10 or 10,000) or if the outliers are the thing you are predicting — fraud, failures, spikes. **Cap / winsorize** at the 1st and 99th percentile when they are data-entry noise hurting a linear or distance model. **Remove** only when you can name the reason it is invalid. Never delete a point because it "looks wrong": that is how you delete the rarest and most valuable rows in the dataset.`,
    },
    {
      type: 'intuition',
      title: 'Creating features: give the model what it cannot derive',
      md: `A model combines columns only in the ways its structure allows. A tree splits one column at a time. A linear model adds them up. Neither can divide. So you divide.

- **Ratios and interactions** — the highest-value move, and the one that needs domain knowledge: *price_per_sqft* = price / area, *debt_to_income*, *clicks_per_impression*, *amount ÷ user_average_amount*. Each one is a question a domain expert would actually ask.
- Blind interaction generation (all pairwise products) explodes the feature count and mostly adds noise. Pick with reasoning, not with a loop.
- **Binning** turns a numeric column into ranges (age → 18-25, 26-40, …). It buys nonlinearity for a linear model and robustness to outliers, and pays for it in lost resolution. Trees do their own binning, so this rarely helps them.
- **Date-time expansion** is nearly free signal: a raw timestamp is one useless integer, but hour, day-of-week, month, is_weekend, is_holiday, and days_since_signup are all real predictors.
- **Cyclical encoding** for anything that wraps: hour 23 and hour 0 are one hour apart, but as raw numbers they are 23 apart. Map to sin and cos of the angle and the circle closes.
- **Text**: bag-of-words counts or TF-IDF (word counts weighted down by how common the word is corpus-wide) gets you a usable sparse matrix in one line — and is superseded by embeddings, which you will meet in the GenAI subject.`,
    },
    {
      type: 'math',
      intro: 'Cyclical encoding for hour-of-day. One column becomes two, and the distance between 23:00 and 00:00 becomes correct.',
      latex: [
        'x_{\\sin} = \\sin\\!\\left(\\frac{2\\pi h}{24}\\right) \\qquad x_{\\cos} = \\cos\\!\\left(\\frac{2\\pi h}{24}\\right)',
        '\\text{Both are needed: } \\sin \\text{ alone maps } 5{:}00 \\text{ and } 7{:}00 \\text{ to the same value.}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Why 23 and 0 must be neighbours',
      code: `import numpy as np

h = np.array([22, 23, 0, 1])          # hour of day
s = np.sin(2 * np.pi * h / 24)
c = np.cos(2 * np.pi * h / 24)

def gap(i, j):                        # distance between two hours
    return round(float(np.hypot(s[i] - s[j], c[i] - c[j])), 3)

print('raw       22->23:', abs(h[0] - h[1]), ' 23->0:', abs(h[1] - h[2]))
print('sin-cos   22->23:', gap(0, 1), ' 23->0:', gap(1, 2))

# raw       22->23: 1  23->0: 23
# sin-cos   22->23: 0.261  23->0: 0.261`,
      annotations: {
        3: 'Four consecutive hours across midnight — the exact place raw integers lie.',
        7: 'Distance in the 2-D (sin, cos) plane, i.e. chord length on the unit circle.',
        13: 'Raw: 23 -> 0 looks like a 23-hour jump. Every distance and linear model believes it.',
        14: 'Cyclical: both gaps are 0.261. Consecutive hours are equally close everywhere, midnight included.',
      },
    },
    {
      type: 'intuition',
      title: 'Data leakage: the definition worth memorizing',
      md: `**Leakage is information available at training time that will not be available at prediction time.** That is the whole idea; everything else is a variation on it.

- The tell is always the same: an offline score that is too good, followed by a production score that is ordinary or worse.
- It is not a bug that throws an error. Nothing crashes. The pipeline runs, the metric prints, the deck gets made.
- Why it survives review: a leaky model is not *broken*, it is *cheating*, and cheating looks exactly like brilliance on a slide.
- The single best habit: for every feature, ask *"at the moment I need this prediction, does this value exist yet?"* If the honest answer is "no" or "only after the outcome", it leaks.`,
    },
    {
      type: 'intuition',
      title: 'The four shapes of leakage',
      md: `Every leak you will meet in an interview is one of these four. Learn them by their example.

- **1. Target leakage** — a feature computed from the target, or recorded after the outcome. Predicting churn with \`account_closed_date\`. Predicting default with \`collections_agency_assigned\`. Predicting a diagnosis with \`medication_prescribed\`. All are effects of the label wearing a feature's clothes.
- **2. Train-test contamination** — fitting a scaler, imputer, encoder, or feature selector on the **full** dataset before splitting. The test rows' mean, median, vocabulary, or usefulness ranking is now baked into the transform, so the test set is no longer held out.
- **3. Temporal leakage** — random-splitting time-ordered data, so the model trains on January while being tested on the previous December. In production you only ever have the past. Use a chronological split, or TimeSeriesSplit.
- **4. Group leakage** — the same entity in train and test: the same patient across two scans, the same user across sessions, the same product across reviews. The model memorizes the entity rather than learning the pattern. Fix with GroupKFold on the entity id.
- Sneakier cousins worth naming: duplicate rows straddling the split, and oversampling (SMOTE) *before* the split, which copies training rows into the test set.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'The leakage path — and the pipeline that closes it',
        notice: 'Follow the arrow from the transform. Every step where an arrow reaches the test cell is a step where the test set stopped being held out.',
        leftLabel: 'pipeline step',
        rightLabel: 'data',
        frames: [
          {
            note: 'Start: one table, 1000 rows. Nothing split yet. So far, nothing is wrong.',
            stack: [{ name: 'raw_data', to: 'all' }],
            heap: [{ id: 'all', value: '1000 rows, unsplit', label: 'dataset' }],
          },
          {
            note: 'The mistake: scaler.fit(X) on the whole table. It reads the mean and std of every row, test rows included.',
            stack: [{ name: 'scaler.fit(X)', to: 'all', danger: true }],
            heap: [{ id: 'all', value: '1000 rows, unsplit', label: 'mean + std read here' }],
          },
          {
            note: 'Now we split. Too late — the scaler already carries the test rows statistics, so it touches both cells.',
            stack: [
              { name: 'scaler -> train', to: 'tr' },
              { name: 'scaler -> test', to: 'te', danger: true },
            ],
            heap: [
              { id: 'tr', value: 'train fold, 800 rows' },
              { id: 'te', value: 'test fold, 200 rows', label: 'already seen' },
            ],
          },
          {
            note: 'Cross-validation reports 0.97. It is measuring memory, not skill. Production will disagree.',
            stack: [
              { name: 'cv_score', value: '0.97 (inflated)' },
              { name: 'reported to team', to: 'te', danger: true },
            ],
            heap: [
              { id: 'tr', value: 'train fold, 800 rows' },
              { id: 'te', value: 'test fold, contaminated', label: 'not held out' },
            ],
          },
          {
            note: 'The fix: put the scaler inside a Pipeline. cross_val_score refits it in every fold, so fit() touches only the training cell.',
            stack: [
              { name: 'Pipeline.fit', to: 'tr' },
              { name: 'test: transform only', value: 'no fit' },
            ],
            heap: [
              { id: 'tr', value: 'train fold, 800 rows', label: 'scaler fit HERE only' },
              { id: 'te', value: 'test fold, 200 rows', label: 'untouched by fit' },
            ],
          },
          {
            note: 'Honest score: 0.84. A smaller number that survives contact with production — the only kind worth reporting.',
            stack: [{ name: 'cv_score', value: '0.84 (honest)' }],
            heap: [
              { id: 'tr', value: 'train fold, 800 rows', label: 'fit + transform' },
              { id: 'te', value: 'test fold, 200 rows', label: 'transform only' },
            ],
          },
        ],
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Leak vs Pipeline on the same data — real numbers',
      code: `import numpy as np
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.pipeline import make_pipeline

rng = np.random.default_rng(0)
X = rng.normal(size=(200, 5000))     # pure noise
y = rng.integers(0, 2, 200)          # coin flips: the honest score MUST be ~0.50
cv = StratifiedKFold(5, shuffle=True, random_state=0)

# LEAK: pick features using ALL rows and ALL labels, then cross-validate
Xl = SelectKBest(f_classif, k=10).fit_transform(X, y)
print('leaky   CV:', round(cross_val_score(LogisticRegression(), Xl, y, cv=cv).mean(), 3))

# HONEST: the same selection, refit inside every fold
pipe = make_pipeline(SelectKBest(f_classif, k=10), LogisticRegression())
print('pipeline CV:', round(cross_val_score(pipe, X, y, cv=cv).mean(), 3))

# leaky   CV: 0.765
# pipeline CV: 0.54`,
      annotations: {
        8: 'There is no relationship between X and y here. Any score above ~0.50 is pure cheating.',
        13: 'The whole bug is fit_transform(X, y) OUTSIDE the CV loop. Out of 5000 noise columns, 10 happen to correlate with y on THESE 200 rows — and the "test" folds are those same rows.',
        14: '0.765 accuracy on data with zero signal. This is what a leaky result looks like: not absurd, just suspiciously good.',
        17: 'The fix is one line. Inside a Pipeline, cross_val_score refits SelectKBest on 4 folds and only transforms the 5th.',
        21: 'Honest answer: 0.54, noise around the 0.50 coin flip. The gap between these two numbers is the entire lesson.',
      },
    },
    {
      type: 'intuition',
      title: 'How you catch it',
      md: `Leakage never announces itself. These four signals are how it actually gets found.

- **The score is too good.** 0.99 AUC on a messy real-world problem is not a triumph, it is a hypothesis. Compare against a known baseline and against what the business currently achieves — if you beat a decade of human effort in an afternoon, look for the leak first.
- **One feature dominates importance.** Pull feature importances; if a single odd column carries the model, read its definition and find out *when* it is populated relative to the label.
- **The score collapses in production**, or on a genuinely held-out later time period. This is the expensive way to find out.
- **Drop the suspect and re-run.** If removing one column takes AUC from 0.98 to 0.71, you have your answer.
- Ask the data owner one question about any suspicious column: *"when is this field written?"* Anything written at or after the outcome is disqualified.`,
    },
    {
      type: 'note',
      md: `**The structural fix.** Discipline does not scale — structure does. Put every fitted transform (imputer, scaler, encoder, selector, resampler) inside a scikit-learn \`Pipeline\`, then hand that Pipeline to \`cross_val_score\` / \`GridSearchCV\`. The framework then guarantees each transform is fit on the training fold only and merely applied to the validation fold. Use \`ColumnTransformer\` for per-column paths, \`GroupKFold\` when rows share an entity, and \`TimeSeriesSplit\` when time matters. Split first, fit second — and let the code, not your memory, enforce it.`,
    },
  ],
  quiz: [
    {
      question: 'You switch a Random Forest from unscaled to StandardScaler-scaled features. What happens to its predictions?',
      options: [
        {
          text: 'Essentially nothing — splits are ordinal comparisons, so the same splits stay available',
          explanation: 'Correct. A split asks "is x <= t?". Standardizing is monotonic: it preserves row order, so the tree finds the equivalent threshold and behaves identically.',
        },
        { text: 'Accuracy improves — scaling always helps', explanation: 'A common reflex, and wrong. Scaling helps distance-based, gradient-trained, regularized, and variance-based methods. Trees are none of those.' },
        { text: 'Accuracy drops because information is lost', explanation: 'No information is lost — standardization is invertible and monotonic.' },
      ],
      correct: 0,
    },
    {
      question: 'Why do L1/L2 regularized linear models require scaled features?',
      options: [
        { text: 'Because the solver cannot converge otherwise', explanation: 'Convergence is a gradient-descent argument and true for unregularized models too. It is not the specific reason regularization needs scaling.' },
        { text: 'Because the penalty is on coefficient size, and coefficient size depends on the feature’s units', explanation: 'Correct. Measure height in metres instead of centimetres and its coefficient grows 100x, so an L2 penalty hits it 10,000x harder. The penalty must compare like with like.' },
        { text: 'Because regularization requires features in [0, 1]', explanation: 'No bounded range is required. Standardization (unbounded) is the usual choice for regularized models.' },
      ],
      correct: 1,
    },
    {
      question: 'A column has 20,000 unique zip codes. What is the main risk of one-hot encoding it?',
      options: [
        { text: 'The dummy-variable trap makes the model unsolvable', explanation: 'The trap comes from keeping all k columns plus an intercept in a linear model — it is a separate issue and fixed by dropping one column.' },
        { text: 'Trees will treat the values as ordered', explanation: 'One-hot specifically removes any ordering. That risk belongs to label encoding.' },
        {
          text: 'Cardinality explosion: 20,000 near-empty columns, memory blow-up, and fragmented weak splits',
          explanation: 'Correct. Each column is almost all zeros, linear models overfit rare categories, and trees split on individually near-useless columns. Use top-N + Other, grouping, target encoding, or hashing.',
        },
      ],
      correct: 2,
    },
    {
      question: 'You label-encode an unordered colour column as red=0, green=1, blue=2. Which statement is accurate?',
      options: [
        { text: 'It is fine for every model — the numbers are just identifiers', explanation: 'They are identifiers to you, not to a linear model, which will fit a single coefficient implying blue = 2 x green.' },
        { text: 'It breaks linear and distance models, but trees can mostly recover the categories', explanation: 'Correct. Linear/distance models read a fake ordering and spacing. A tree can isolate any value with two splits (x > 0.5, x <= 1.5) — it just spends extra depth doing it.' },
        { text: 'It breaks trees but is fine for linear models', explanation: 'Exactly backwards.' },
      ],
      correct: 1,
    },
    {
      question: 'Target-encode a customer_id column that appears once per row, computed on the full training set. What have you built?',
      options: [
        { text: 'A strong high-cardinality feature — this is the standard recipe', explanation: 'The recipe is only standard when computed out-of-fold with smoothing. Computed in-fold on unique ids, it is not a feature.' },
        {
          text: 'A copy of the label: each row’s encoding is its own target, so the model reads the answer off the column',
          explanation: 'Correct — the mean of one row is that row’s y. This is target leakage. Fix: out-of-fold encoding plus smoothing toward the global mean.',
        },
        { text: 'A frequency encoding in disguise', explanation: 'Frequency encoding counts occurrences and never touches y. This one is built entirely from y.' },
      ],
      correct: 1,
    },
    {
      question: 'A column has 30% missing values and you impute with the median. What extra step is most often worth taking?',
      options: [
        {
          text: 'Add an is_missing 0/1 indicator column',
          explanation: 'Correct. Missingness is frequently signal — "did not disclose income" predicts things. The indicator preserves that while the imputed value keeps the row usable.',
        },
        { text: 'Drop the rows as well, to be safe', explanation: 'That discards 30% of your data and contradicts having imputed at all.' },
        { text: 'Replace the median with the mean for consistency', explanation: 'The median is the more robust default; swapping to the mean makes the imputation more outlier-sensitive, not better.' },
      ],
      correct: 0,
    },
    {
      question: 'A churn model hits 0.99 AUC. Feature importance shows account_closed_date carrying almost everything. What is the diagnosis?',
      options: [
        { text: 'The model found a genuinely excellent predictor — ship it', explanation: 'It found a field that only exists AFTER the customer churned. There is nothing to ship: at prediction time the field is empty.' },
        { text: 'Overfitting — reduce model complexity', explanation: 'Overfitting shows as a train/test gap. Here CV itself is inflated because the feature encodes the outcome.' },
        {
          text: 'Target leakage — the feature is recorded after the outcome and will not exist at prediction time',
          explanation: 'Correct, and it is the textbook shape: perfect score plus one dominant odd column. Drop it, re-run, and audit every feature for when it is written.',
        },
      ],
      correct: 2,
    },
    {
      question: 'You StandardScaler-fit on the full dataset, then split and run cross-validation. Which leakage shape is this, and what is the structural fix?',
      options: [
        {
          text: 'Train-test contamination — put the scaler inside a Pipeline so it is refit within each fold',
          explanation: 'Correct. The scaler carries the test rows’ mean and std, so the test fold was never truly held out. A Pipeline handed to cross_val_score fits transforms on the training fold only.',
        },
        { text: 'Temporal leakage — use TimeSeriesSplit', explanation: 'Temporal leakage is about random-splitting time-ordered data. Nothing here concerns time ordering.' },
        { text: 'Group leakage — use GroupKFold', explanation: 'Group leakage is the same entity appearing in both train and test. The issue here is a transform fit on all rows.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Which algorithms need feature scaling, and which do not? Give the reason in each direction.',
      answer:
        'Ask one question: does the algorithm compare magnitudes across columns? YES — (1) distance-based: kNN, K-Means, SVM-RBF compute ||x1 - x2||, so a large-magnitude column dominates the norm; (2) gradient-descent-trained: linear/logistic regression, neural nets, because the gradient is error x input, so unequal scales create a stretched ravine that one shared learning rate cannot navigate — a conditioning problem, not a correctness one; (3) regularized models (ridge, lasso), because the penalty punishes coefficient magnitude and magnitude depends on units; (4) PCA, because it maximizes variance and variance is unit-dependent. NO — decision trees and all tree ensembles (XGBoost, LightGBM, Random Forest), because a split is the ordinal test x <= t and any monotonic rescale preserves row order, hence the same splits; and Naive Bayes, which models each feature distribution independently with no cross-feature magnitude comparison. Bonus tradeoff: standardize by default, robust-scale under heavy tails, min-max when a bounded range is required.',
      isCaseBased: false,
    },
    {
      question: 'Define data leakage in one sentence, then name the four common shapes with an example each.',
      answer:
        'Leakage is information present at training time that will not be available at prediction time. (1) Target leakage: a feature computed from the target or recorded after the outcome — account_closed_date predicting churn, or collections_agency_assigned predicting default. (2) Train-test contamination: fitting a scaler/imputer/encoder/selector on the full dataset before splitting, so the test rows’ statistics are baked into the transform. (3) Temporal leakage: random-splitting time-series data so the model trains on the future and tests on the past. (4) Group leakage: the same patient/user/product in both train and test, so the model memorizes entities rather than patterns. Fixes in order: audit when each field is written; Pipelines; chronological or TimeSeriesSplit; GroupKFold.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague’s fraud model scores 0.98 AUC offline and 0.61 in production. Walk me through your investigation.',
      answer:
        'The 37-point gap says leakage before it says overfitting — overfitting normally shows as a train/validation gap, not a validation/production gap. Order of investigation: (1) Feature importances — is one odd column carrying the model? Drop it and re-run; a collapse names the culprit. (2) For every top feature ask the data owner when the field is written; anything populated at or after the outcome (investigation_opened, chargeback_flag) is target leakage. (3) Check the split: was it random on time-ordered transactions? Re-score with a chronological split. (4) Check groups: the same card or merchant in both folds? Re-score with GroupKFold on card_id. (5) Check the preprocessing — were scalers/encoders/SMOTE fit before the split rather than inside a Pipeline? (6) Only if all of that is clean, look at non-leakage causes: train/serve skew, distribution drift since the training window, or a feature computed differently in the serving path than in the training notebook. Tradeoff to state: the honest offline number will be much lower, and that is the point — you cannot manage a metric that lies.',
      isCaseBased: true,
    },
    {
      question: 'How do you target-encode a high-cardinality column without leaking, and when would you still avoid it?',
      answer:
        'Two mandatory pieces. Out-of-fold: encode each row using only the other folds, so a row never contributes to its own encoding — scikit-learn’s TargetEncoder cross-fits internally; hand-rolled versions must do it explicitly. Smoothing: blend the category mean toward the global mean weighted by category count, enc(c) = (n_c*mean_c + m*global) / (n_c + m), so rare categories are pulled back instead of memorizing single labels. Avoid it when categories have very few rows each (near-unique ids are pure leakage), when the category-target relationship is unstable over time, or when interpretability matters — a column of numbers between 0 and 1 with no visible meaning is hard to defend. Cheaper alternatives worth trying first: top-N one-hot plus Other, frequency encoding, or letting LightGBM/CatBoost handle categoricals natively.',
      isCaseBased: false,
    },
    {
      question: 'Case: hospital readmission model, 0.94 AUC in CV, 0.68 on the next quarter’s data. Preprocessing is inside a Pipeline and no feature is obviously post-outcome. What else do you check?',
      answer:
        'Two shapes remain. Group leakage: patients appear multiple times, so the same patient sits in train and validation and the model memorizes the individual — re-run with GroupKFold on patient_id and expect the CV number to fall toward 0.68. Temporal leakage: the CV split is random over a time span, so the model trains on later admissions and validates on earlier ones, while production is strictly forward-looking — re-run with a chronological split. Also check duplicate rows straddling folds, and any resampling (SMOTE) applied before splitting, which copies synthetic training rows into validation. If the honest CV then matches 0.68, nothing is broken — the original evaluation was. If it stays at 0.94, the cause is drift or train/serve skew instead: compare feature distributions between the training window and the new quarter, and verify the serving code computes each feature identically.',
      isCaseBased: true,
    },
    {
      question: 'Why is missing-value handling not just a choice of imputer? Explain MCAR, MAR, MNAR and what each implies.',
      answer:
        'The mechanism determines whether your fix is harmless or introduces bias. MCAR — missingness independent of everything (a dropped sensor packet): dropping rows is unbiased, just wasteful; simple imputation is safe. MAR — missingness explained by the other observed columns (older customers skip the income field): model-based imputation using those columns (IterativeImputer/KNNImputer) is principled. MNAR — missingness depends on the unseen value itself (high earners hide income): no imputer recovers the truth, and any imputation biases the column; here the missingness is the signal, so keep an is_missing indicator and be explicit about the limitation. Honest caveat to say out loud: you can rarely prove which mechanism you have — you argue it from domain knowledge, then add the indicator column as cheap insurance regardless.',
      isCaseBased: false,
    },
    {
      question: 'Explain the dummy-variable trap. Which models care, and what is the fix?',
      answer:
        'One-hot a k-category column and keep all k indicator columns alongside an intercept: the k columns sum to 1 in every row, which is exactly the intercept, so the design matrix has perfect multicollinearity and XtX is singular. Plain OLS then has no unique solution — coefficients become unstable, huge, or unsolvable, and individual coefficient interpretation is meaningless. Fix: drop one level (drop=’first’), which becomes the reference category and makes every other coefficient a contrast against it. Who cares: unregularized linear models and anyone reading coefficients. Who does not: trees and ensembles (no matrix inversion), and ridge/lasso, whose penalty restores a unique solution — though redundant columns still split the credit between correlated features and muddy interpretation.',
      isCaseBased: false,
    },
    {
      question: 'What do you do about outliers, and how does the answer change with the model?',
      answer:
        'Detect first — z-score |z| > 3 for roughly normal columns, or the IQR rule (outside Q1 - 1.5*IQR, Q3 + 1.5*IQR) for skewed ones — then choose deliberately between three actions. Leave alone: trees and ensembles barely care, since a split at t behaves the same whether the point is 10 or 10,000; and if the outliers ARE the target (fraud, equipment failure, spikes), removing them removes the problem. Cap/winsorize at the 1st/99th percentile: right when the extremes are plausible-but-noisy and the model is linear, distance-based, or gradient-trained — MSE in particular lets one far point drag the whole fit. Remove: only when you can name why the row is invalid (a -5 age, a duplicated import). Also worth naming: robust scaling or a log transform often solves the problem without touching a single row, and any capping threshold must be learned on train and applied to test.',
      isCaseBased: false,
    },
    {
      question: 'Why does hour-of-day need cyclical encoding, and what exactly breaks without it?',
      answer:
        'As a raw integer, 23:00 and 00:00 are 23 apart while 22:00 and 23:00 are 1 apart — but they are equally one hour apart in reality. Any model that reads the column as a magnitude inherits the lie: distance models place midnight far from 11pm, and a linear model fits a single monotonic coefficient across a wrapping quantity, which cannot be right at both ends. Fix: replace h with sin(2*pi*h/24) and cos(2*pi*h/24), placing each hour on a circle so consecutive hours are equidistant everywhere, midnight included. Both components are required — sin alone collides 5:00 with 7:00. Caveat: a tree does not need this, because it can carve out ranges directly with splits, though it will spend extra depth to isolate a wrap-around region. Same trick applies to day-of-week, month, and compass bearing.',
      isCaseBased: false,
    },
    {
      question: 'What features would you engineer for a house-price model, and why those?',
      answer:
        'Start from questions a domain expert asks. Ratios the model cannot derive: price_per_sqft is the market’s own unit (and if price is the target, use area-normalized comparables instead of the ratio, or you leak); rooms_per_sqft; land_to_building_ratio. Date-time: listing month and quarter (seasonality), property_age = sale_year - build_year, years_since_renovation. Location: distance to the city centre or nearest station, plus a smoothed out-of-fold target encoding of neighbourhood rather than one-hot on thousands of postcodes. Binning: floor count or bedroom count into ranges if the model is linear. Transform: log(price) as the target, because prices are right-skewed and errors are multiplicative in percentage terms. Interactions: area x neighbourhood_quality. Tradeoffs to state — each feature costs a computation in the serving path and a chance to leak, so I would add them in blocks and keep only what improves an honest, grouped, time-respecting CV.',
      isCaseBased: false,
    },
    {
      question: 'Case: you are handed a notebook that scores 0.99 accuracy on a churn dataset. In five minutes, how do you decide whether to trust it?',
      answer:
        'Five checks, roughly one minute each. (1) Baseline sanity: what is the class balance? 0.99 accuracy on a 1% churn rate is a model that predicts "no churn" always — ask for precision/recall or AUC instead. (2) Feature list scan: any field whose name mentions closed, cancelled, refund, final, exit_ — target leakage suspects; check when each is written relative to the label. (3) Split hygiene: search the notebook for fit or fit_transform called before train_test_split, and for any SMOTE/resampling outside the fold. (4) Split appropriateness: is the data time-ordered or repeated per customer? If yes, a random split is already wrong — demand a chronological split or GroupKFold on customer_id. (5) Ablation: drop the top-importance feature and re-run; a large collapse identifies the leak. What I would say to the author: the deliverable is not the 0.99, it is the number that survives all five checks — and I would rather present 0.78 that holds than 0.99 that evaporates on the first production week.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'The tabular priority order', back: 'Data quality > features > model choice > hyperparameters. A model can only combine what you hand it — it cannot invent price / area on its own.' },
    { front: 'Standardize vs min-max vs robust', back: 'z = (x-mu)/sigma, the default. Min-max squashes to [0,1] but is outlier-fragile. Robust uses median and IQR — right when the tails are heavy.' },
    { front: 'Who needs scaling (YES)', back: 'Distance (kNN, K-Means, SVM-RBF) — the norm. Gradient-trained (linear, logistic, NN) — conditioning. Regularized — the penalty is unit-dependent. PCA — variance is unit-dependent.' },
    { front: 'Who needs scaling (NO)', back: 'Trees and tree ensembles: a split is the ordinal test x <= t, and monotonic rescaling preserves row order. Naive Bayes: per-feature distributions, no cross-feature magnitude comparison.' },
    { front: 'Dummy-variable trap', back: 'All k one-hot columns + an intercept sum to 1 -> perfect multicollinearity -> singular XtX. Drop one level. Hits plain OLS; trees and regularized models shrug.' },
    { front: 'Target encoding, safely', back: 'Category -> mean target, computed OUT-OF-FOLD and smoothed: (n_c*mean_c + m*global)/(n_c + m). Without both, it copies the label into a feature.' },
    { front: 'MCAR / MAR / MNAR', back: 'Missing at random entirely / explained by other columns / depends on the hidden value itself. Only MNAR is unfixable by imputation — and there missingness IS the signal.' },
    { front: 'The is_missing trick', back: 'Impute the value AND add a 0/1 indicator. Missingness is often predictive on its own, and the indicator keeps that signal after imputation erases it.' },
    { front: 'Data leakage, defined', back: 'Information at training time that will not exist at prediction time. Four shapes: target, train-test contamination, temporal, group.' },
    { front: 'The structural fix for leakage', back: 'Every fitted transform goes inside a scikit-learn Pipeline handed to cross_val_score — the framework then fits on the training fold only. Split first, fit second.' },
  ],
  mindmapMarkdown: `- Feature Engineering & Data Leakage
  - Framing
    - Features > model on tabular
    - Model cannot derive ratios
  - Scaling
    - z-score (default)
    - min-max [0,1] (outlier-fragile)
    - robust: median + IQR
  - Who needs scaling
    - YES distance: kNN, K-Means, SVM-RBF
    - YES gradient: linear, logistic, NN
    - YES regularized: penalty is unit-dependent
    - YES PCA: maximizes variance
    - NO trees: splits are ordinal
    - NO Naive Bayes: per-feature
  - Encoding
    - one-hot + cardinality explosion
    - dummy trap: drop one level
    - ordinal only if truly ordered
    - target enc: out-of-fold + smoothing
    - frequency, hashing trick
    - unseen category at inference
  - Missing values
    - MCAR / MAR / MNAR
    - drop vs impute vs forward-fill
    - is_missing indicator
  - Outliers
    - detect: z-score, IQR
    - cap / leave / remove-with-reason
    - trees rarely care
  - Feature creation
    - ratios: price_per_sqft
    - binning, date-time expansion
    - cyclical sin-cos (23 next to 0)
    - text: BoW / TF-IDF -> embeddings
  - Data leakage
    - def: info absent at prediction time
    - target: post-outcome column
    - contamination: fit before split
    - temporal: random split on time
    - group: same entity both sides
    - catch: too-good score, one dominant feature, prod collapse
    - fix: Pipeline, GroupKFold, TimeSeriesSplit`,
}

export default m
