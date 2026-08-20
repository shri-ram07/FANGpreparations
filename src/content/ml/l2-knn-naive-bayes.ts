import type { Module } from '../types'

const m: Module = {
  id: 'ml-l2-knn-naive-bayes',
  subjectId: 'ml',
  level: 2,
  title: 'k-NN & Naive Bayes: The Two Simplest Classifiers',
  whyItMatters:
    'These two are the fastest baselines you can ship and the fastest way an interviewer finds out whether you understand distance, dimensionality and probability — or just import names. k-NN is where feature scaling and the curse of dimensionality stop being slogans and start being arithmetic. Naive Bayes is where you say out loud "this assumption is false and I use it anyway", and defend it.',
  estMinutes: 50,
  sections: [
    {
      type: 'intuition',
      title: 'k-NN: you are the average of your neighbours',
      md: `A new restaurant opens. No reviews yet. How do you guess if it is good? You look at the five nearest restaurants on the same street and take the majority verdict.

- That is the entire algorithm. **k-Nearest Neighbours**: to label a new point, find its **k** closest training points and take the majority vote.
- For regression, same move, different summary: average their numbers instead of voting.
- No equation is fitted. No weights exist. The training data *is* the model.
- The only choices you make: **k**, the **distance metric**, and how you **scale** the features. All three decide everything.`,
    },
    {
      type: 'intuition',
      title: 'Lazy learning: the training phase that is not there',
      md: `Most models pay up front — hours of training, then microseconds per prediction. k-NN inverts the deal. It is called **lazy learning**: fit() just stores the data.

- Training cost: **O(1)** in real work — copy the array. There is nothing to learn.
- Prediction cost: **O(n·d)** per query — compare the query to all **n** training rows across **d** features, then pick the smallest k (a heap makes that step O(n log k)).
- Memory cost: the whole training set stays in RAM, forever.
- So a million rows and 300 features means ~300 million arithmetic operations *per single prediction*. That is the bill nobody mentions in the tutorial.
- Interview line: *"k-NN has no training time and terrible inference time — the opposite tradeoff of everything else."*`,
    },
    {
      type: 'note',
      md: `The honest scaling note, because "just use a KD-tree" is a half-answer. **KD-trees and ball-trees** prune whole regions and give roughly O(log n) lookups — but only while **d** stays small (rule of thumb: below ~20 features). Above that they degrade to a full scan, because the pruning depends on distances being informative, which is exactly what high dimensions destroy. At real scale you stop asking for the *exact* nearest neighbour and use an **ANN (approximate nearest neighbour)** index — HNSW, IVF, product quantization. That is not a k-NN footnote: it is the engine inside every vector database. When you reach the GenAI module *Embeddings, Vector Databases & Semantic Search*, you are meeting this same lookup again, at a billion vectors and with an accuracy-for-latency trade baked in.`,
    },
    { type: 'visual', component: 'DecisionBoundaryPlayground', props: { model: 'knn' } },
    {
      type: 'note',
      md: `Drag the k slider and watch the bias–variance module happen in front of you. At **k = 1** every point owns a small territory — including the three stragglers sitting deep in enemy colour. The boundary grows islands around pure noise: training accuracy hits 100%, and that is the tell, not the trophy. **High variance** — reshuffle the data and the islands move. Push to **k = 15** and the islands dissolve; the boundary becomes one smooth curve that ignores individual points. **High bias** — the model now has an opinion the data cannot easily change. Same dataset, same code, one integer: k is a variance dial, and 1/k behaves like model complexity.`,
    },
    {
      type: 'intuition',
      title: 'Choosing k',
      md: `k is not tuned by feel. It is tuned by cross-validation — but you should be able to predict what it will find.

- **Small k (1, 3)** → jagged boundary, memorizes noise, **high variance, low bias**. k=1 always gets 100% training accuracy: the nearest point to a training point is itself.
- **Large k** → smooth boundary, ignores local structure, **high bias, low variance**.
- **k = n** → every query sees the entire dataset and returns the majority class. Constant predictor. Maximum bias, zero variance. This is the sanity endpoint of the dial.
- **Odd k for binary problems** so a vote cannot tie. For multi-class, ties still happen — sklearn breaks them by the lowest class index, which is arbitrary, so distance-weighted voting is a better fix.
- Rough starting point: k ≈ √n, then cross-validate a small grid around it.
- Distance weighting (weight = 1/d) lets you use a larger k without the far-away points drowning the near ones.`,
    },
    {
      type: 'intuition',
      title: 'Distance is a modelling choice, not a detail',
      md: `"Nearest" is meaningless until you say nearest *how*. Three metrics cover almost everything.

- **Euclidean (L2)** — straight-line distance. The default. Sensitive to a single large-scale feature.
- **Manhattan (L1)** — city-block distance, sum of absolute gaps. More robust to outliers and often better behaved when d is large.
- **Cosine** — the *angle* between two vectors, length ignored. This is the one for text and embeddings: a 50-word review and a 5000-word review about the same topic point the same way but have wildly different lengths.
- Rule: if magnitude carries meaning (price, age, sensor reading) use L2 or L1. If only direction carries meaning (TF-IDF vectors, sentence embeddings) use cosine.`,
    },
    {
      type: 'math',
      intro: 'The three metrics, and the standardization that makes L1/L2 usable.',
      latex: [
        'd_{L2}(a,b) = \\sqrt{\\sum_{j=1}^{d} (a_j - b_j)^2} \\qquad d_{L1}(a,b) = \\sum_{j=1}^{d} \\lvert a_j - b_j \\rvert',
        'd_{\\cos}(a,b) = 1 - \\frac{a \\cdot b}{\\lVert a \\rVert \\, \\lVert b \\rVert}',
        'z_j = \\frac{x_j - \\mu_j}{\\sigma_j} \\quad \\text{with } \\mu_j, \\sigma_j \\text{ estimated on the TRAINING split only.}',
      ],
    },
    {
      type: 'intuition',
      title: 'Why feature scaling is mandatory — the arithmetic',
      md: `Take two features: **age** (years) and **salary** (rupees). Query person: age 30, salary 500,000. Two candidate neighbours:

- **A** — age 31, salary 550,000. Gaps: 1 year, 50,000 rupees. Distance = √(1 + 2,500,000,000) ≈ **50,000.0**.
- **B** — age 55, salary 501,000. Gaps: 25 years, 1,000 rupees. Distance = √(625 + 1,000,000) ≈ **1,000.3**.
- So B — a person 25 years older — is judged **50× nearer** than A. The age column contributed 625 out of 1,000,625: **0.06%** of the distance. Age was not down-weighted; it was deleted.
- Now standardize (age σ ≈ 10 years, salary σ ≈ 200,000). A becomes √(0.1² + 0.25²) = **0.27**. B becomes √(2.5² + 0.005²) = **2.50**. A wins, correctly.
- The rule: **any distance-based model needs scaling** — k-NN, k-Means, SVM with RBF, PCA. Trees do not (they split one feature at a time). This exact question is an interview favourite.
- One trap: fit the scaler on **train only**. Fitting on the full dataset leaks test statistics into training.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same k-NN, the same data, one scaler — real numbers',
      code: `from sklearn.datasets import load_wine
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

X, y = load_wine(return_X_y=True)              # 13 chemistry features, 3 grape types
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=0, stratify=y)

print('alcohol range:', X[:, 0].min().round(1), '->', X[:, 0].max().round(1))
print('proline range:', X[:, 12].min().round(1), '->', X[:, 12].max().round(1))

raw = KNeighborsClassifier(n_neighbors=5).fit(Xtr, ytr)
scaled = make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=5)).fit(Xtr, ytr)
print('accuracy, raw   :', round(raw.score(Xte, yte), 3))
print('accuracy, scaled:', round(scaled.score(Xte, yte), 3))

# alcohol range: 11.0 -> 14.8
# proline range: 278.0 -> 1680.0
# accuracy, raw   : 0.722
# accuracy, scaled: 0.963`,
      annotations: {
        8: 'stratify keeps the class ratio identical in train and test; random_state makes the number below reproducible.',
        13: 'Raw features: proline spans ~1400 units, alcohol spans ~4. Every distance is essentially "difference in proline".',
        14: 'make_pipeline is not sugar — inside cross-validation it refits the scaler per fold, so test statistics never leak into training.',
        20: '0.722 vs 0.963. Same model, same k, same split. 24 points of accuracy bought by one preprocessing line.',
      },
    },
    {
      type: 'intuition',
      title: 'The curse of dimensionality, properly',
      md: `Add features and k-NN does not just get slower — it stops meaning anything. Here is why, in two pictures.

- **Volume runs to the edges.** In a d-dimensional unit ball, the fraction of volume inside the outer 10% shell is 1 − 0.9^d. At d=2 that is **19%**. At d=10, **65%**. At d=100, **99.997%**. Almost every point lives in a thin skin far from the centre — and far from each other.
- **Distances converge.** Each new dimension adds another squared gap to the sum. Independent gaps average out, so every pairwise distance drifts toward the same value. The *ratio* between farthest and nearest collapses toward 1.
- When farthest ≈ nearest, "the 5 nearest neighbours" is a list of 5 essentially random points. k-NN has not broken; the concept of *near* has.
- This is not only a k-NN problem — it is why high-dimensional data needs exponentially more samples to cover its own space at all.
- Escapes: cut d (PCA, feature selection), use cosine on data that lives on a low-dimensional manifold (embeddings do), or learn a metric instead of assuming Euclidean.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Watch "nearest" lose its meaning',
      code: `import numpy as np

rng = np.random.default_rng(0)
print('    d  nearest  farthest  (far-near)/near')
for d in (2, 10, 100, 1000):
    X = rng.random((1000, d))                  # 1000 uniform points in a d-cube
    q = rng.random(d)                          # one query point
    dist = np.linalg.norm(X - q, axis=1)       # distance to every point
    near, far = dist.min(), dist.max()
    print(f'{d:5d} {near:8.2f} {far:9.2f} {(far - near) / near:16.3f}')

#     d  nearest  farthest  (far-near)/near
#     2     0.01      1.33          134.618
#    10     0.47      2.11            3.484
#   100     3.35      4.65            0.389
#  1000    12.17     13.55            0.114`,
      annotations: {
        8: 'One vectorised Euclidean distance from the query to all 1000 points — the whole of k-NN prediction is this line plus a sort.',
        10: 'The contrast ratio. If it is near zero, no point is meaningfully closer than any other.',
        16: 'At d=1000 the farthest of 1000 points is only 11% farther than the nearest. Ranking by distance is now almost noise.',
      },
    },
    {
      type: 'intuition',
      title: 'When k-NN is genuinely the right call',
      md: `It is a real tool, not just a teaching toy — inside its window.

- **Small n, low d.** A few thousand rows, under ~20 clean features. Nothing to tune, nothing to train, hard to get wrong.
- **Irregular decision boundaries.** k-NN assumes no shape at all, so it fits crescents, rings and blobs that logistic regression cannot touch without feature engineering.
- **Similarity is the product.** "More items like this", "users similar to you", duplicate detection, face matching against a gallery — here the neighbour *is* the answer, not an intermediate step. Modern recommenders are k-NN over learned embeddings with an ANN index.
- **A baseline you can ship in one line** to find out whether the problem is easy before anyone builds a pipeline.
- Where it fails: many features, big n with tight latency budgets, or lots of irrelevant features — k-NN cannot ignore a useless column the way a tree can, it just adds its noise to every distance.`,
    },
    {
      type: 'intuition',
      title: 'Naive Bayes: flip the question around',
      md: `You want P(spam | this email). That is hard to estimate directly — you have never seen this exact email. But P(this email | spam) is easy: just count words in your spam pile. **Bayes' theorem** trades the hard direction for the easy one. (The mechanics live in the math subject module *Probability, Bayes & the Statistics ML Actually Uses*; here we only use it.)

- **Prior** P(class): how common is spam at all, before reading anything.
- **Likelihood** P(words | class): how spam-ish these particular words are, from counts.
- **Posterior** P(class | words): what you actually want.
- We only need to know **which class wins**, not the exact probability — so the denominator P(words), identical for every class, is dropped immediately.
- Result: score every class, pick the biggest. That is the whole classifier.`,
    },
    {
      type: 'math',
      intro: 'Bayes applied to classification, then the two simplifications that make it computable.',
      latex: [
        'P(y = c \\mid x_1, \\dots, x_d) = \\frac{P(y = c) \\; P(x_1, \\dots, x_d \\mid y = c)}{P(x_1, \\dots, x_d)}',
        '\\hat{y} = \\arg\\max_{c} \\; P(y = c) \\prod_{j=1}^{d} P(x_j \\mid y = c) \\quad \\text{(denominator dropped; features assumed independent)}',
        '\\hat{y} = \\arg\\max_{c} \\; \\log P(y = c) + \\sum_{j=1}^{d} \\log P(x_j \\mid y = c)',
      ],
    },
    {
      type: 'intuition',
      title: 'The "naive" part, stated plainly',
      md: `That product over features assumes every feature is independent of every other, **given the class**. Say it out loud for text: *knowing an email is spam, seeing the word "free" tells you nothing about whether you will also see "money".*

- That is obviously false. "New" and "York" travel together. "Free" and "money" travel together. The model double-counts every correlated pair.
- Without the assumption you would need the joint probability of every word combination — with a 10,000-word vocabulary that is astronomically many parameters and you would never have enough data.
- With it, you need one number per (word, class): tens of thousands of counts. Trainable on a laptop in a second.
- **So why does it still work?** Because classification only needs the **argmax** to land on the right class. Double-counting correlated evidence inflates the winning score enormously — but usually inflates the *already-winning* class. The ranking of classes survives what the probabilities do not.
- Which is exactly the caveat: the decisions are good, the probability numbers are junk. Come back to this when you meet calibration.`,
    },
    {
      type: 'intuition',
      title: 'The spam filter, worked with real numbers',
      md: `A tiny corpus. 4 spam emails and 4 ham emails, 3 words each — 12 tokens per class, 11 distinct words in the vocabulary.

- **Spam counts:** free 4, money 3, now 2, win 2, prize 1. Total 12.
- **Ham counts:** meeting 3, please 2, project 2, today 2, now 1, lunch 1, review 1. Total 12.
- Priors: 4 spam of 8 emails → P(spam) = P(ham) = 0.5.
- New email: **"free money meeting"**. Two loud spam words, one loud ham word.
- Score it raw: P(free|spam)=4/12, P(money|spam)=3/12, and P(meeting|spam) = **0/12**.
- One zero and the entire product is zero. The spam score is 0. And P(free|ham) is also 0, so the ham score is 0 too. Both classes score zero: the classifier has no opinion at all, on an email that is obviously spam.`,
    },
    {
      type: 'math',
      intro: 'Laplace (add-one) smoothing: the fix, and the same email rescored.',
      latex: [
        'P(w \\mid c) = \\frac{\\mathrm{count}(w, c) + \\alpha}{N_c + \\alpha \\lvert V \\rvert} \\qquad \\alpha = 1 \\text{ is add-one; } \\lvert V \\rvert = 11, \\; N_c = 12',
        'P(\\text{free} \\mid \\text{spam}) = \\tfrac{4+1}{12+11} = \\tfrac{5}{23}, \\quad P(\\text{meeting} \\mid \\text{spam}) = \\tfrac{0+1}{23} = \\tfrac{1}{23}',
        '\\frac{P(\\text{spam}) \\prod P(w \\mid \\text{spam})}{P(\\text{ham}) \\prod P(w \\mid \\text{ham})} = \\frac{0.5 \\cdot \\frac{5}{23} \\cdot \\frac{4}{23} \\cdot \\frac{1}{23}}{0.5 \\cdot \\frac{1}{23} \\cdot \\frac{1}{23} \\cdot \\frac{4}{23}} = \\frac{20}{4} = 5',
      ],
    },
    {
      type: 'note',
      md: `Read what smoothing actually did. It moved every count off zero by borrowing a sliver of probability mass from the words you *did* see — the numerator gains α, the denominator gains α·|V| so it still sums to 1. One unseen word can no longer veto all the other evidence; it now costs a *finite* penalty instead of an infinite one. The verdict flips from "no opinion" to **spam at 5:1 odds**, i.e. P(spam | email) = 20/24 = **0.833**. α is a knob: α=1 is the default, α<1 (Lidstone) smooths less and trusts your counts more, and on a big corpus the choice barely matters. On a small one it is the difference between a working filter and a broken one.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Naive Bayes by hand, in log space, with and without smoothing',
      code: `import numpy as np

spam = 'free money now free money free win money now free win prize'.split()
ham = 'meeting now please project meeting today lunch meeting today please review project'.split()
V = len(set(spam + ham))                 # 11 distinct words
doc = ['free', 'money', 'meeting']       # the email to classify

def log_score(cls, alpha):
    n = len(cls)
    with np.errstate(divide='ignore'):
        return np.log(0.5) + sum(np.log((cls.count(w) + alpha) / (n + alpha * V)) for w in doc)

for alpha in (0, 1):
    s, h = log_score(spam, alpha), log_score(ham, alpha)
    print(f'alpha={alpha}  logP(spam,doc)={s:7.3f}  logP(ham,doc)={h:7.3f}')
    print('  ->', 'SPAM at %.1f:1 odds' % np.exp(s - h) if np.isfinite(s) else 'both zero: the classifier is blind')

# alpha=0  logP(spam,doc)=   -inf  logP(ham,doc)=   -inf
#   -> both zero: the classifier is blind
# alpha=1  logP(spam,doc)= -7.104  logP(ham,doc)= -8.713
#   -> SPAM at 5.0:1 odds`,
      annotations: {
        5: 'The vocabulary size is the smoothing denominator term. Build it from training data only — an unseen test word is simply skipped.',
        11: 'log P(class) + sum of log P(word|class). Adding logs replaces multiplying probabilities; alpha=0 makes an unseen word log(0) = -inf.',
        16: 'exp(s - h) turns the log-score gap back into readable odds. The gap, not the absolute score, is the decision.',
        19: 'Both classes -inf: one unseen word per class annihilated everything. This is the failure smoothing exists to prevent.',
      },
    },
    {
      type: 'note',
      md: `Why logs, always. A 200-word email multiplies 200 probabilities each around 1e-4. That product is about 1e-800 — and float64 underflows to exactly **0.0** below ~1e-308. Every class would score 0 and the classifier would be silently random. Adding logs turns an impossible product into a harmless sum around −800, and comparison is unaffected because log is monotonic. Same trick, same reason, in softmax, in cross-entropy, in HMMs, in every likelihood you will ever compute. If you need actual probabilities back, subtract the max log-score before exponentiating (the log-sum-exp trick).`,
    },
    {
      type: 'intuition',
      title: 'Three variants — pick by what a feature IS',
      md: `Naive Bayes is a template. The variant is just which distribution you assume for P(feature | class).

- **Multinomial NB** — features are **counts**. Word occurrence counts or TF-IDF. The default for text classification, and the one worked above.
- **Bernoulli NB** — features are **binary presence/absence**. It explicitly models *absent* words too, which helps on short documents (tweets, subject lines) where "the word 'unsubscribe' is missing" is real evidence.
- **Gaussian NB** — features are **continuous**. Assumes each feature is normally distributed within each class; you store just a mean and variance per (feature, class). Skewed features hurt it — log-transform them first.
- Wrong variant on the wrong data is a silent accuracy leak, not an error message. Counts through GaussianNB "works" and quietly underperforms.`,
    },
    {
      type: 'note',
      md: `Why Naive Bayes still earns a slot in 2026. Training is **one pass of counting** — O(n·d), no iterations, no learning rate, streamable and trivially parallel. The model is a table of counts, kilobytes, so inference is microseconds on a CPU. On text with limited labelled data it often beats a fine-tuned heavy model, because counting words is a strong prior and it does not overfit the way a high-capacity model does. Ship it as the baseline on day one: if your transformer cannot beat NB by a clear margin, the problem is your data, not your architecture. The caveat to state before anyone asks: **the probabilities are overconfident** — independence double-counts correlated evidence, so scores pile up near 0.999 and 0.001. Never threshold NB output as if 0.9 meant 90%. If you need calibrated probabilities, wrap it in isotonic regression or Platt scaling on a validation set.`,
    },
  ],
  quiz: [
    {
      question: 'You move a k-NN classifier from k = 1 to k = 25. What happens to bias and variance?',
      options: [
        { text: 'Both increase', explanation: 'Variance falls when you average over more neighbours — the boundary stops chasing individual points.' },
        { text: 'Bias falls, variance rises', explanation: 'That is the direction of *decreasing* k. Larger k smooths, it does not sharpen.' },
        {
          text: 'Bias rises, variance falls',
          explanation: 'Correct. More neighbours = smoother, more committed boundary (bias up) that is less sensitive to any single data point (variance down). k is a variance dial; 1/k acts like model complexity.',
        },
      ],
      correct: 2,
    },
    {
      question: 'A k-NN model uses age (18–65) and annual salary in rupees (200,000–2,000,000), unscaled, with Euclidean distance. What is the practical effect?',
      options: [
        {
          text: 'Salary decides essentially every neighbour; age is effectively deleted from the model',
          explanation: 'Correct. A squared salary gap runs into the billions or trillions while the largest possible squared age gap is 47² = 2,209. Age is not down-weighted, it is invisible. Standardize and both features get a vote.',
        },
        { text: 'Nothing — Euclidean distance normalizes automatically', explanation: 'It does not. Euclidean distance sums raw squared differences; whichever feature has the biggest units wins.' },
        { text: 'Age dominates because it has fewer distinct values', explanation: 'Number of distinct values is irrelevant to distance. Only the magnitude of the differences matters.' },
      ],
      correct: 0,
    },
    {
      question: 'Why does k-NN degrade badly as the number of features grows?',
      options: [
        { text: 'Only because prediction gets slower', explanation: 'Slower is true (O(n·d)) but not the real problem — you could buy hardware. The concept of "near" is what breaks.' },
        {
          text: 'Distances between all pairs of points converge, so the nearest neighbours stop being meaningfully nearer',
          explanation: 'Correct. Each dimension adds another gap to the sum; the farthest/nearest ratio collapses toward 1. At d=1000 the farthest of 1000 uniform points was only 11% farther than the nearest.',
        },
        { text: 'The majority vote can tie more often', explanation: 'Tie frequency depends on k and class count, not on d.' },
      ],
      correct: 1,
    },
    {
      question: 'Naive Bayes assumes features are independent given the class. This is usually false for text. Why is the classifier still useful?',
      options: [
        { text: 'The assumption is actually true once you use TF-IDF', explanation: 'TF-IDF reweights terms; it does not make "New" and "York" independent.' },
        { text: 'The errors from correlated features cancel out exactly', explanation: 'They do not cancel exactly — the probabilities really are wrong, often wildly so.' },
        {
          text: 'Classification only needs the argmax to be right, and double-counting correlated evidence usually inflates the class that was already winning',
          explanation: 'Correct — and it names the caveat too: the decision survives, the probability estimates do not. NB scores are overconfident and need calibration before you threshold them.',
        },
      ],
      correct: 2,
    },
    {
      question: 'A test email contains one word never seen in the spam training set. Without smoothing, what is the spam score?',
      options: [
        {
          text: 'Exactly zero — one zero factor kills the entire product regardless of all other evidence',
          explanation: 'Correct. That single unseen word vetoes every other word in the email. Add-one smoothing replaces the infinite penalty with a finite one: (count + α) / (N + α·|V|).',
        },
        { text: 'Slightly reduced but still usable', explanation: 'Multiplication by zero is not a slight reduction. The product is annihilated.' },
        { text: 'Unchanged — unseen words are ignored by default', explanation: 'Only if you explicitly skip them. The plain formula multiplies in a 0/N term.' },
      ],
      correct: 0,
    },
    {
      question: 'Why is Naive Bayes always computed in log space?',
      options: [
        { text: 'Logs make the probabilities more accurate', explanation: 'Logs change nothing about accuracy — log is monotonic, so the argmax is identical.' },
        {
          text: 'Multiplying hundreds of small probabilities underflows float64 to exactly 0.0; adding logs keeps the numbers in a safe range',
          explanation: 'Correct. 200 words at ~1e-4 each gives ~1e-800, far below the ~1e-308 float64 floor. Sums of logs are harmless, and the ranking is unchanged.',
        },
        { text: 'Because the independence assumption requires it', explanation: 'The independence assumption gives you the product. Logs are purely a numerical-stability fix applied afterwards.' },
      ],
      correct: 1,
    },
    {
      question: 'Your features are continuous sensor readings (temperature, pressure, vibration). Which Naive Bayes variant fits?',
      options: [
        { text: 'Multinomial NB', explanation: 'Multinomial models counts — it expects non-negative integers or TF-IDF-style weights, not arbitrary continuous readings.' },
        { text: 'Bernoulli NB', explanation: 'Bernoulli models binary presence/absence. You would have to threshold and throw away the magnitudes.' },
        {
          text: 'Gaussian NB',
          explanation: 'Correct — it fits a mean and variance per (feature, class) and assumes normality within each class. Log-transform badly skewed features first, because the Gaussian assumption is doing real work here.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Which statement about k-NN training cost is correct?',
      options: [
        {
          text: 'Training is essentially free (store the data); each prediction costs O(n·d)',
          explanation: 'Correct — this is what "lazy learning" means, and it is the exact inverse of the usual tradeoff. KD-trees help only in low dimensions; at scale you use an approximate (ANN) index instead.',
        },
        { text: 'Training is O(n·d); prediction is O(1)', explanation: 'That is the profile of an eager model like logistic regression. k-NN fits nothing.' },
        { text: 'Both training and prediction are O(log n) with a KD-tree', explanation: 'KD-tree build is O(n log n) and its lookup degrades to a full scan once d passes roughly 20 features.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain k-NN in 30 seconds, then name its two biggest weaknesses.',
      answer:
        'To classify a point, find the k closest training points and take the majority vote (average for regression). No parameters are fitted — the data is the model. Weakness one: **inference cost** — O(n·d) per query and the whole training set must stay in memory, so it does not fit a low-latency service at scale without an approximate-nearest-neighbour index. Weakness two: **the curse of dimensionality** — as d grows all distances converge, so "nearest" stops carrying information; k-NN also cannot ignore an irrelevant feature the way a tree can, it just absorbs its noise into every distance. Add the third if they want it: it is mandatory to scale features, because the metric is raw units.',
      isCaseBased: false,
    },
    {
      question: 'Which models need feature scaling and which do not? Justify the split rather than listing.',
      answer:
        'The split is: **does the model compare features against each other in a shared numeric space?** Distance and dot-product models do — k-NN, k-Means, SVM (especially RBF), PCA, and any regularized linear model, because L1/L2 penalties are unfair when one column is in the millions. Gradient descent also converges faster when scaled, since the gradient is proportional to the input. Tree-based models do NOT — a decision tree splits one feature at a time on a threshold, and monotone rescaling does not change the ordering of a column, so the same splits are found. That last point is the answer they are checking for: Random Forest and XGBoost are scale-invariant by construction, not by luck.',
      isCaseBased: false,
    },
    {
      question: 'Case: your k-NN recommender is at 94% test accuracy offline but p99 latency is 800 ms in production against 20 million items. Walk through the fix.',
      answer:
        'The accuracy is fine; the algorithm is the problem. (1) Confirm the cost: exact k-NN is O(n·d) per query — 20M items times an embedding dimension is the whole latency budget. (2) Trade exactness for speed with an **ANN index** — HNSW or IVF+PQ (FAISS, ScaNN, or a vector DB). Recall@10 typically stays around 95–99% while latency drops by two or three orders of magnitude. Quantify the loss: measure recall against exact results offline before shipping. (3) Reduce d — PCA or a smaller embedding cuts both index size and distance cost. (4) Precompute and cache neighbours for the head of the catalogue and the hottest users; most traffic is head traffic. (5) If exact answers are contractually required, shard and parallel-scan and accept the cost. Name the tradeoff explicitly: you are buying latency with a small, measurable recall loss — and that is the same engineering behind every vector search system.',
      isCaseBased: true,
    },
    {
      question: 'How do you choose k, and what do k = 1 and k = n mean?',
      answer:
        'Cross-validation over a small grid, starting near √n. k = 1 memorizes: 100% training accuracy by construction (the nearest point to a training point is itself), a jagged boundary with islands around noise points — maximum variance. k = n means every query sees all the data and returns the global majority class: a constant predictor, maximum bias, zero variance. So k traverses the whole bias–variance dial, and 1/k behaves like model complexity. Practical details worth saying: use odd k for binary problems so votes cannot tie, and distance-weighted voting (weight ∝ 1/d) lets you raise k for stability without letting far-away points drown the near ones.',
      isCaseBased: false,
    },
    {
      question: 'Explain the curse of dimensionality without hand-waving.',
      answer:
        'Two concrete facts. **Volume concentrates in the shell:** in a d-dimensional unit ball the fraction of volume within the outer 10% is 1 − 0.9^d — 19% at d=2, 65% at d=10, 99.997% at d=100. Nearly every point lives in a thin skin. **Distances concentrate:** each extra dimension adds another squared gap to the sum, and independent gaps average out, so the ratio (farthest − nearest)/nearest collapses toward zero. I measured it: 1000 uniform points, ratio 134 at d=2, 3.5 at d=10, 0.11 at d=1000. Once farthest ≈ nearest, ranking by distance is close to ranking by noise, so k-NN, k-Means and RBF kernels all lose their footing. The general form of the problem is sample coverage: the data needed to cover the space grows exponentially in d. Mitigations: reduce d (PCA, feature selection), use cosine on embeddings that genuinely live on a low-dimensional manifold, or learn a metric instead of assuming Euclidean.',
      isCaseBased: false,
    },
    {
      question: 'State the naive assumption of Naive Bayes, say why it is wrong, and defend using it anyway.',
      answer:
        'Assumption: given the class, every feature is independent of every other — so P(x1…xd | c) factorizes into a product of per-feature probabilities. For text this is plainly false ("New"/"York", "free"/"money" co-occur). Defence one, tractability: without it you need the joint distribution over all word combinations, which is exponentially many parameters and unlearnable; with it you need one count per (word, class), learnable in a single pass. Defence two, and the one that matters: classification needs only the **argmax** to be right, not the probabilities. Correlated features get double-counted, which inflates scores — but it usually inflates the class that was already ahead, so the ranking is preserved even though the magnitudes are garbage. The honest corollary: never treat an NB probability as calibrated; it will sit at 0.999 for a marginal case.',
      isCaseBased: false,
    },
    {
      question: 'Why is Laplace smoothing necessary, and what exactly does α do?',
      answer:
        'Necessary because the class score is a product: one unseen (word, class) pair contributes 0/N = 0 and annihilates all other evidence, no matter how strong. In my worked example, "free money meeting" scored exactly zero under BOTH classes — the filter had no opinion on an obviously spammy email. Smoothing replaces count/N with (count + α)/(N + α|V|): the numerator gains α, and the denominator gains α|V| so the distribution still sums to 1. That is mass borrowed from observed words and redistributed to unobserved ones, converting an infinite penalty into a finite one. α = 1 (add-one) is the default; α < 1 (Lidstone) smooths less and trusts your counts more. On a large corpus the choice barely moves accuracy; on a small one it is the difference between working and broken. Same idea, different name, everywhere else: it is a Dirichlet prior on the multinomial.',
      isCaseBased: false,
    },
    {
      question: 'Multinomial vs Bernoulli vs Gaussian Naive Bayes — when does each one apply?',
      answer:
        'Pick by what the feature physically is. **Multinomial**: counts — word frequencies or TF-IDF; the default for document classification. **Bernoulli**: binary presence/absence; it explicitly models the *absence* of a word as evidence, which helps on very short documents like subject lines or tweets where a missing token is informative and repetition is not. **Gaussian**: continuous features; stores a mean and variance per (feature, class) and assumes within-class normality — log-transform skewed features first, since that assumption does real work. Mixed feature types: either discretize, or fit separate NB models per block and add the log-likelihoods. The trap to mention: the wrong variant does not throw an error, it just quietly underperforms.',
      isCaseBased: false,
    },
    {
      question: 'Case: a Naive Bayes fraud model reports 0.998 confidence on transactions that turn out fine roughly a third of the time. What is wrong and how do you fix it?',
      answer:
        'Nothing is broken — this is NB behaving as designed. Correlated features (amount, merchant category, hour, device all move together on fraud) get treated as independent evidence and multiplied, so log-scores pile up at the extremes and the output saturates near 0 and 1. The *ranking* can still be excellent while the numbers are meaningless. Diagnose it with a **reliability/calibration plot**: bucket predictions by score and plot predicted vs observed fraud rate; a systematic bow away from the diagonal confirms miscalibration, and Brier score or ECE quantifies it. Fix by post-hoc calibration on a held-out set — **Platt scaling** (fit a logistic on the log-odds, good with little data) or **isotonic regression** (non-parametric, more flexible, needs more data); sklearn ships CalibratedClassifierCV. Key point to state: check that AUC/ranking quality is intact first — if ranking is also bad, calibration will not save you and you need a different model. And if the business rule is a hard threshold on probability, calibration is not optional.',
      isCaseBased: true,
    },
    {
      question: 'Case: a colleague reports 97% cross-validated accuracy for a k-NN model. You look at the notebook and see StandardScaler().fit_transform(X) run once, before the split. What do you tell them?',
      answer:
        'That is **data leakage**, and the 97% is not real. The scaler computed the mean and standard deviation over the full dataset including every validation fold, so information about the held-out data entered the training pipeline. k-NN is unusually sensitive to it, because the scaler output *is* the metric — the geometry of every neighbourhood was set using test statistics. The fix is one line: put the scaler and the estimator in a Pipeline and pass that to cross_val_score, so each fold refits the scaler on its own training portion. Then re-measure and expect the number to drop. While there, check the two other leakage paths that usually travel with this one: target-derived or future-derived features, and duplicate/near-duplicate rows split across train and test — k-NN with duplicates scores beautifully and learns nothing.',
      isCaseBased: true,
    },
    {
      question: 'You have 800 labelled support tickets and need a topic classifier by Friday. Argue for Naive Bayes over fine-tuning a transformer.',
      answer:
        'At n = 800 the bottleneck is data, not capacity. TF-IDF plus Multinomial NB trains in under a second, has essentially one hyperparameter (α), and cannot overfit the way a high-capacity model does on 800 examples — word counts are a strong, honest prior for topic classification. It gives me a number today, an error analysis by tomorrow, and a deployable artifact measured in kilobytes with microsecond CPU inference and no GPU bill. That baseline is also the decision rule for the transformer: if fine-tuning cannot beat NB by a clear margin, the problem is label quality or class definitions, not architecture, and no amount of model will fix it. Where I would switch: heavy reliance on word order or negation ("not able to log in" vs "able to log in"), long-tail vocabulary that counting cannot cover, or multilingual tickets — then embeddings earn their cost.',
      isCaseBased: false,
    },
    {
      question: 'k-NN and Naive Bayes both look trivially simple. What do they actually assume, and where do those assumptions bite?',
      answer:
        'k-NN assumes **the label is locally smooth in your chosen metric** — that points close together share a class. That assumption fails when features are unscaled (the metric is dominated by units), when d is large (all distances converge), when irrelevant features are present (they inject noise into every distance), and when classes are imbalanced (the majority class wins votes by sheer density, so use distance weighting or resample). Naive Bayes assumes **conditional independence and a specific per-feature distribution** — it fails on correlated features (probabilities become overconfident), on continuous features that are not Gaussian if you use GaussianNB, and on anything where word order or interaction carries the signal, since it sees only a bag of features. Neither model has a knob to fix a wrong assumption — that is the price of having almost no parameters, and the reason both are baselines rather than destinations.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'k-NN in one line', back: 'Label a new point by the majority vote of its k nearest training points. No fitting — the training data IS the model.' },
    { front: 'Lazy learning cost profile', back: 'Training ~O(1) (just store). Prediction O(n·d) per query + O(n log k) to pick the k smallest. Whole dataset stays in RAM.' },
    { front: 'Scaling k-NN up', back: 'KD-tree / ball-tree work below ~20 features. Beyond that use an ANN index (HNSW, IVF, PQ) — the engine inside vector databases.' },
    { front: 'k and bias–variance', back: 'Small k → jagged, memorizes noise, high variance. Large k → smooth, high bias. k = n → majority class (constant predictor). 1/k acts like model complexity.' },
    { front: 'Why scaling is mandatory for k-NN', back: 'Distance uses raw units. Age gap 25 yrs vs salary gap 1,000 rupees: age contributes 0.06% of the distance. Standardize (fit on TRAIN only).' },
    { front: 'Which metric when', back: 'L2/L1 when magnitude means something (price, age). Cosine when only direction means something (TF-IDF, embeddings) — length ignored.' },
    { front: 'Curse of dimensionality, two facts', back: 'Unit ball: 1 − 0.9^d of volume in the outer 10% shell (99.997% at d=100). And (far − near)/near → 0, so "nearest" stops meaning anything.' },
    { front: 'The naive assumption', back: 'Features independent GIVEN the class, so P(x|c) = ∏P(xⱼ|c). Usually false; works because only the argmax must be right, not the probabilities.' },
    { front: 'Laplace smoothing', back: 'P(w|c) = (count + α) / (N_c + α·|V|). Stops one unseen word from zeroing the whole product. α=1 is add-one.' },
    { front: 'Log space + NB caveat', back: 'Sum logs instead of multiplying — 200 words × ~1e-4 underflows float64 (floor ~1e-308). And NB probabilities are overconfident: calibrate before thresholding.' },
  ],
  mindmapMarkdown: `- k-NN & Naive Bayes
  - k-NN idea
    - Majority vote of k nearest points
    - Lazy: no training, O(n·d) per query
    - KD-tree / ball-tree / ANN index
  - Choosing k
    - Small k: jagged, high variance
    - Large k: smooth, high bias
    - Odd k for ties; k = n = majority class
  - Distance
    - Euclidean / Manhattan / cosine
    - Scaling MANDATORY, fit on train only
  - Curse of dimensionality
    - All points roughly equidistant
    - Volume hides in the outer shell
    - Escape: cut d, cosine, learn a metric
  - When k-NN wins
    - Small n, low d, irregular boundary
    - Similarity / recommendation
  - Naive Bayes idea
    - Bayes rule, argmax, drop denominator
    - Independence: false but usable
  - Making it work
    - Laplace add-one smoothing
    - Log space, no underflow
  - Variants
    - Multinomial (counts), Bernoulli (presence)
    - Gaussian (continuous)
  - Reality check
    - Fast, tiny, strong text baseline
    - Probabilities overconfident`,
}

export default m
