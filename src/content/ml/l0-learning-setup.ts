import type { Module } from '../types'

const m: Module = {
  id: 'ml-l0-learning-setup',
  subjectId: 'ml',
  level: 0,
  title: 'What "Learning" Actually Means: Fit, Generalize, Bias & Variance',
  whyItMatters:
    'Every ML interview eventually lands on "your model does great offline and dies in prod — why?". The answer is always somewhere in this module: a broken split, a peeked-at test set, too much bias, too much variance. Get this mental model right once and every algorithm after it is just a different way to trade the same two errors.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'Learning is curve fitting with a bet attached',
      md: `You have pairs: an input **x**, an answer **y**. Flat size to rent. Email text to spam-or-not. Pixels to "cat".

- Learning means exactly this: **find a function f such that f(x) is close to y** on the data you HAVE.
- The machine understands nothing about rent or cats. It searches a space of candidate functions for one whose outputs land near the answers.
- You choose the *shape* of the function — a line, a tree, a 175-billion-parameter network. The data chooses the *numbers* inside that shape.
- That is the whole mechanism. Every algorithm in this subject is a variation on three questions: which shape, which numbers, how do we search.`,
    },
    {
      type: 'intuition',
      title: 'Generalization is the entire game',
      md: `Here is the part that makes it hard: fitting the data you already have is trivially easy.

- Want zero error on your training data? Store every row in a lookup table and return the stored answer. Perfect score. Completely useless model.
- What you actually want is performance on data you have **never seen** — and by definition you cannot measure that while training.
- So every ML project is a **bet**: the pattern that held on my sample will hold on the next sample.
- **Generalization** = that bet paying off. It is the only thing anyone is paid for.
- The assumption underneath the bet: training data and future data come from the *same distribution*. When that breaks — seasonality, a new user segment, an upstream schema change — the model breaks, however good the math was.`,
    },
    {
      type: 'note',
      md: 'Three flavours of learning, one line each. **Supervised:** you have labelled pairs (x, y) and learn the mapping — regression when y is continuous, classification when y is a category. This is most of industry and most of this subject. **Unsupervised:** only x, no labels — find structure (clustering, PCA, anomaly detection). Harder to evaluate, because there is no answer key to check against. **Reinforcement:** no labels, only a delayed reward from an environment you act in — the agent learns a *policy* by trial and error (games, robotics, RLHF). The line that gets remembered: supervised learns from answers, unsupervised learns from structure, reinforcement learns from consequences.',
    },
    {
      type: 'intuition',
      title: 'The workflow: data to features to model to evaluate to iterate',
      md: `Every ML project you will ever run is this loop. Learn the order — interviews test whether you know which step a problem *lives* in.

1. **Data** — collect, clean, split. Garbage here cannot be repaired downstream. Most of your actual wall-clock time lives in this step.
2. **Features** — turn raw rows into numbers a model can use: scaling, encoding, ratios, date to day-of-week. On tabular problems this beats model choice almost every time.
3. **Model** — pick the shape (linear, tree, ensemble, network) and fit it. The step beginners think is the whole job. It is maybe 10% of it.
4. **Evaluate** — measure on data the model did not train on. Choose ONE metric that matches the real cost, and choose it *before* you see any result.
5. **Iterate** — the evaluation tells you which direction to go back in: more data, better features, bigger model, different loss.

Most of this module is about step 4, for one reason: a broken evaluation makes steps 1 to 3 unimprovable. You cannot climb a hill you are measuring wrong.`,
    },
    {
      type: 'intuition',
      title: 'Three datasets, three different jobs',
      md: `One dataset, cut into three, because there are three separate questions to answer.

- **Train (~70%)** — the model's parameters are fitted here. This is the only data the model learns labels from.
- **Validation (~15%)** — *you* choose here: which model, which depth, which learning rate, when to stop. The model never trains on it, but your decisions do.
- **Test (~15%)** — the one honest estimate of "how will this behave in production". Touched once, at the very end.
- Why validation has to exist: the moment you use a set to *choose*, you start fitting to it. Comparing ten hyperparameter settings on the test set turns the test set into a training set for your decisions.
- The sentence to carry: **train fits parameters, validation fits your choices, test fits nothing.**`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The split, and the one-line bug that silently ruins it',
      code: `import numpy as np

X = np.arange(1000)                      # 1000 rows, stored sorted by signup date
y = (X > 700).astype(int)                # label that drifted: only late users converted

def split(X, y, seed=0):
    idx = np.random.default_rng(seed).permutation(len(X))    # SHUFFLE, then cut
    a, b = int(0.7 * len(X)), int(0.85 * len(X))             # 70 / 15 / 15
    tr, va, te = idx[:a], idx[a:b], idx[b:]
    return (X[tr], y[tr]), (X[va], y[va]), (X[te], y[te])

sets = split(X, y)
print("sizes        ", *[len(s[0]) for s in sets])
print("positive rate", *[f"{s[1].mean():.3f}" for s in sets])

naive = (y[:700], y[700:850], y[850:])                       # cut without shuffling
print("no shuffle   ", *[f"{s.mean():.3f}" for s in naive])

# sizes         700 150 150
# positive rate 0.303 0.267 0.313
# no shuffle    0.000 0.993 1.000`,
      annotations: {
        4: 'A realistic label: behaviour changed over time. Any real table has some ordering baked into it — date, region, an ingestion job.',
        7: 'The whole fix. Shuffle indices once, then slice. Skipping this line is one of the most common silent bugs in ML code.',
        8: '70/15/15 is a default, not a law. Small data (<10k rows) leans on cross-validation instead; huge data can spare 1% and still have 100k test rows.',
        16: 'The naive cut. It looks perfectly reasonable, and it is catastrophic.',
        21: 'Compare the two output rows. Shuffled: all three splits carry ~30% positives, so they ask the same question. Unshuffled: the model trains on a world where NOBODY converts, then gets tested on one where everybody does. Its "accuracy" is meaningless.',
      },
    },
    {
      type: 'intuition',
      title: 'Why the test set is touched exactly once',
      md: `"I checked the test set a few times to see if I was improving." That sentence quietly destroys the number you are about to report.

- Every time you look at the test set and change something because of what you saw, information flows from test into your model.
- It does not need to be code. **Your brain is the leak channel.** No amount of careful splitting protects against a human who peeks.
- The mechanism is the **winner's curse**: pick the best of many candidates scored on one small sample, and the winner's score is inflated by luck that will not repeat.
- The nasty part is that the *estimate* keeps improving while the *model* does not improve at all. You ship believing 92% and watch 84% in production.
- Proof, below: 300 completely random "models" scored against pure coin-flip labels. There is no signal to find — none, zero, by construction.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The winner\'s curse, on data with no signal at all',
      code: `import numpy as np

rng = np.random.default_rng(0)
y_val = rng.integers(0, 2, 100)      # labels are pure coin flips - no signal exists
y_fresh = rng.integers(0, 2, 100)    # a second, untouched sample of the same coin

best_acc, best_guess = 0.0, None
for _ in range(300):                 # 300 "ideas", all scored on the SAME held-out set
    guess = rng.integers(0, 2, 100)  # each idea is one random model
    acc = (guess == y_val).mean()
    if acc > best_acc:
        best_acc, best_guess = acc, guess

print("winner's score on the peeked set:", round(best_acc, 3))
print("same model on fresh data:        ", round((best_guess == y_fresh).mean(), 3))

# winner's score on the peeked set: 0.62
# same model on fresh data:         0.53`,
      annotations: {
        4: 'Labels are coin flips. The best possible accuracy any model can achieve on fresh data is 0.5. Remember that ceiling.',
        8: '300 candidates against ONE evaluation set. Swap "random guess" for "hyperparameter config" and this is a normal tuning run.',
        11: 'This line is the leak: a decision made using the held-out set. Selecting on a set is a weak form of training on it.',
        17: '0.62 on the peeked set. A 12-point "edge" that is 100% selection luck, from models that are literally noise.',
        18: '0.53 on fresh data - back to the coin-flip ceiling, as physics demanded. The gap between line 17 and line 18 is the optimism you would have shipped.',
      },
    },
    {
      type: 'note',
      md: 'The practical discipline that follows: every comparison, every hyperparameter, every "let me try one more thing" goes through the **validation** set. The test set gets opened once, after the model is frozen. If you genuinely have to re-test — a real bug, a new requirement — say so out loud and treat the new number as optimistic. The larger the number of things you compared, the larger the optimism. This is the single most common reason a model that looked great offline disappoints in production.',
    },
    {
      type: 'intuition',
      title: 'Underfitting vs overfitting: the polynomial story',
      md: `Same data, same code, one knob: how wiggly is the fitted function allowed to be? Polynomial degree.

- **Degree 0** — a flat line at the average. Ignores x completely. Wrong on train, wrong on test. **Underfitting**.
- **Degree 1** — a straight line through curved data. Better, still systematically off in the same places. Still underfitting.
- **Degree 3** — follows the real curve, ignores the jitter. This is the model you want.
- **Degree 9** — with only 15 training points, a degree-9 polynomial can pass through *every single one*. Training error near zero. Between the points it swings absurdly. **Overfitting**.
- The tell that matters: overfitting is not "high error". It is a **large gap** — training error near zero, test error climbing. Underfitting is high error on *both*, with almost no gap.`,
    },
    { type: 'visual', component: 'BiasVarianceDial', props: {} },
    {
      type: 'note',
      md: 'Step the degree from 0 to 9 and watch the lower chart. The **train** curve only ever falls — more flexibility can always hug the training points harder, so a falling training loss is never by itself evidence of anything. The **test** curve falls, bottoms out, then climbs: the **U-curve**. The bottom of that U is the model you ship. Left of the bottom you are leaving real signal unused; right of it you are fitting noise and calling it learning. Note also what happens on the far right — the fitted curve does not just get slightly worse, it goes violently wrong between the data points. That is variance you can see.',
    },
    {
      type: 'intuition',
      title: 'Bias and variance, properly',
      md: `Underfitting and overfitting are both prediction failures, but they fail for opposite reasons. Naming them precisely is what an interviewer is grading.

- **Bias** = error from **wrong assumptions**. You forced a straight line onto a curve. Even with infinite data the line stays wrong, and it is wrong in the *same direction every time*. Systematic.
- **Variance** = error from **sensitivity to the particular training sample**. Hand the same algorithm a different 15 rows and it produces a wildly different function. Not wrong on average — wrong *differently* each time. Unstable.
- Archery: high bias is a tight cluster 30cm left of the bullseye (you aimed wrong). High variance is centred on the bullseye but sprayed over the whole target (you cannot repeat yourself).
- Flexibility trades one for the other: more flexible model to less bias but more variance. Less flexible to more bias but less variance.
- The subtlety people miss: bias is about the **average** model over imaginary re-runs, variance is the **spread** around that average. Variance is invisible from a single training run — which is exactly why it goes undiagnosed.`,
    },
    {
      type: 'hinglish',
      md: `Do type ke kharab students socho. Pehla wala **high bias** hai: usne ek hi formula ratt liya hai aur har question mein wahi thok deta hai. Kitna bhi padha lo, uski **soch hi galat** hai — aur har baar *ek jaisi* galat, consistently. Doosra wala **high variance** hai: ye har baar apna answer badal deta hai. Jo notes aaj mile, wahi ratt liye; kal doosre notes mile to poora jawab hi badal gaya. Average nikaalo to shayad theek baithe, par bharosa zero — **har baar mood badalta hai**, kabhi 95 kabhi 30. Ilaaj alag-alag hai: bias wale ko **bada dimaag** chahiye (bigger model, better features), variance wale ko **discipline** chahiye (zyada data, regularization, simple model, ensembling). Aur pehle diagnose karo, phir dawai do — high-bias model ko aur data pilane se kuch nahi hota.`,
    },
    {
      type: 'math',
      intro: 'The decomposition. It is exact for squared-error loss, and it is the reason the U-curve exists.',
      latex: [
        '\\mathbb{E}\\big[(y - \\hat{f}(x))^2\\big] \\;=\\; \\underbrace{\\big(\\mathbb{E}[\\hat{f}(x)] - f(x)\\big)^2}_{\\text{bias}^2} \\;+\\; \\underbrace{\\mathbb{E}\\big[(\\hat{f}(x) - \\mathbb{E}[\\hat{f}(x)])^2\\big]}_{\\text{variance}} \\;+\\; \\underbrace{\\sigma^2}_{\\text{irreducible noise}}',
        '\\text{The expectation } \\mathbb{E} \\text{ runs over training sets: imagine re-collecting your data many times and refitting.}',
        '\\textbf{bias}^2: \\text{ take the AVERAGE model over all those runs. How far is it from the truth } f(x)? \\text{ Wrong assumptions.}',
        '\\textbf{variance}: \\text{ how far does ONE run sit from that average? Sensitivity to which rows you happened to get.}',
        '\\sigma^2: \\text{ label noise. Nothing you build can touch it. It is the floor of your error.}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Measuring bias and variance for real: 400 parallel universes',
      code: `import numpy as np

rng = np.random.default_rng(42)
f = lambda x: 0.8 * np.sin(2.2 * np.pi * x)    # the truth we never get to see
SIGMA, N, RUNS = 0.18, 15, 400
grid = np.linspace(0, 1, 50)                   # where we measure test error

print(f"{'deg':>4}{'bias^2':>9}{'var':>8}{'noise':>8}{'total':>9}")
for deg in (0, 1, 3, 5):
    preds = np.empty((RUNS, grid.size))
    for r in range(RUNS):                      # RUNS parallel universes, one dataset each
        x = rng.uniform(0, 1, N)
        y = f(x) + SIGMA * rng.standard_normal(N)
        preds[r] = np.polyval(np.polyfit(x, y, deg), grid)
    avg = preds.mean(axis=0)                   # the "average model" across universes
    bias2 = ((avg - f(grid)) ** 2).mean()      # how far the average model sits from truth
    var = preds.var(axis=0).mean()             # how much one model wobbles around that average
    print(f"{deg:>4}{bias2:>9.3f}{var:>8.3f}{SIGMA**2:>8.3f}{bias2 + var + SIGMA**2:>9.3f}")

#  deg   bias^2     var   noise    total
#    0    0.294   0.025   0.032    0.351
#    1    0.202   0.039   0.032    0.273
#    3    0.017   0.140   0.032    0.190
#    5    0.009   2.252   0.032    2.293`,
      annotations: {
        4: 'This is the cheat only a simulation gets: we KNOW f. On real data you can never separate these three terms - which is why the decomposition is a thinking tool, not a metric you compute at work.',
        11: 'The expectation from the math block, made literal: 400 fresh training sets, 400 fitted models.',
        16: 'bias-squared: distance from the AVERAGE model to the truth. Falls monotonically as degree rises - 0.294 to 0.009.',
        17: 'variance: spread of individual models around their own average. Explodes as degree rises - 0.025 to 2.252.',
        23: 'Read the total column down: 0.351, 0.273, 0.190, 2.293. That is the U-curve, in numbers - and degree 3 is the bottom of it.',
        24: 'Degree 5 has the LOWEST bias of the four and by far the worst total error. Low bias is not the goal; low total is.',
      },
    },
    {
      type: 'intuition',
      title: 'Diagnose first, then fix',
      md: `The diagnosis needs exactly two numbers: training error and validation error. Everything follows from their values and the gap between them.

- **High train, high val, small gap** to **underfitting / high bias**. The model cannot even do the training set.
- **Low train, much higher val, big gap** to **overfitting / high variance**.
- **Low train, low val** to done. Ship it and stop tinkering.
- **Train error HIGHER than val error** to suspicious. Usually a split bug, a val set that is accidentally easier, or dropout and augmentation being active only during training.

Fixing **bias** — make the model *able* to express the pattern:

- A bigger or more flexible model: more depth, higher polynomial degree, more trees, a nonlinear model instead of a linear one.
- Better features. On tabular data this is the highest-leverage fix that exists.
- Less regularization, and train longer — sometimes it is just not converged yet.

Fixing **variance** — make the model *steadier* across samples:

- More training data. The only fix with no downside, and usually the most expensive one.
- Regularization: L1/L2, dropout, tree pruning, early stopping. All of them deliberately restrict what the model is allowed to say.
- A simpler model, or fewer features.
- Ensembling. Average many high-variance models and the spread cancels — Random Forest is exactly this idea, industrialized.

The line that scores points: *diagnose with the train/val gap first, then apply the matching fix — pouring more data into a high-bias model changes nothing at all.*`,
    },
    {
      type: 'intuition',
      title: 'The noise floor, and why 100% is a bug report',
      md: `The third term in the decomposition is the one everybody forgets: **irreducible error**.

- Two flats, identical size, identical location, different rent — one landlord was in a hurry. No feature you collect will ever explain that.
- Labels are noisy too: two doctors disagree on the same scan, an annotator misclicks, "is this spam" is genuinely ambiguous for some emails.
- That variability belongs to the **data**, not to your model. No architecture reduces it. It is a hard ceiling on any achievable score.
- So the honest target is never 100% — it is "close to the noise floor". Estimate the floor the practical way: give the same 200 examples to two human labellers and measure how often they agree.
- The corollary every senior engineer has learned painfully: **near-perfect test accuracy is a bug report, not a trophy.** Go hunting for leakage — a feature computed *after* the label exists, an ID that encodes the target, duplicate rows landing in both train and test, or a scaler fitted on the full dataset before the split.`,
    },
  ],
  quiz: [
    {
      question: 'You store every training row in a lookup table and return the stored answer. Training error is exactly zero. What have you built?',
      options: [
        { text: 'A model with zero bias and zero variance', explanation: 'Variance is enormous — change one training row and the table changes with it. Zero training error says nothing about either term.' },
        { text: 'The best possible model, since error cannot go below zero', explanation: 'Training error is not the objective. The objective is error on data you have never seen, where the table is useless.' },
        { text: 'A memorizer — zero training error is trivially achievable and carries no information about unseen data', explanation: 'Correct. This is the reason train/val/test exists at all: fitting known data is easy, generalizing is the actual problem.' },
      ],
      correct: 2,
    },
    {
      question: 'What is the validation set for, precisely?',
      options: [
        { text: 'Extra training data, once the model has converged', explanation: 'Training on it destroys its purpose — you would then have no clean set for choosing between models.' },
        { text: 'Choosing between models and hyperparameters, so the test set stays untouched', explanation: 'Correct. Train fits parameters, validation fits YOUR choices, test fits nothing.' },
        { text: 'The final number reported to stakeholders', explanation: 'That is the test set. The validation number is optimistic by construction, because you selected on it.' },
      ],
      correct: 1,
    },
    {
      question: 'A teammate compared 300 hyperparameter configurations on the test set and reports the best score. What is wrong with that number?',
      options: [
        { text: 'It is optimistically biased — taking the max over many noisy scores captures luck that will not repeat', explanation: 'Correct. The winner\'s curse. The more candidates compared on one set, the more the winning score overstates true performance.' },
        { text: 'Nothing — the test set was held out from training, so the number is valid', explanation: 'Held out from *fitting*, but not from *selection*. Selecting on a set is a weak form of training on it.' },
        { text: 'It is pessimistic — comparing many models spreads the error around', explanation: 'The bias runs the other way. Selecting the maximum can only inflate, never deflate.' },
      ],
      correct: 0,
    },
    {
      question: 'Training error 0.02, validation error 0.31. Diagnosis?',
      options: [
        { text: 'High bias — the model is too simple', explanation: 'High bias shows as high error on BOTH sets with a small gap. Here training error is near zero.' },
        { text: 'Irreducible noise dominates', explanation: 'Noise raises both errors together; it cannot create a gap, since the training set carries the same noise.' },
        { text: 'High variance — the model is overfitting', explanation: 'Correct. Near-zero training error plus a large gap is the textbook overfitting signature. Fix with more data, regularization, a simpler model, or ensembling.' },
      ],
      correct: 2,
    },
    {
      question: 'Which of these is the definition of bias?',
      options: [
        { text: 'How much the fitted model changes when you retrain on a different sample', explanation: 'That is variance — sensitivity to which rows you happened to draw.' },
        { text: 'Error from wrong assumptions: the average model over many re-runs is systematically off from the truth', explanation: 'Correct. Note the word *average* — bias is a property of the average model, not of any single fit.' },
        { text: 'Noise in the labels that no model can remove', explanation: 'That is the irreducible term. It is a property of the data, not of the model class you chose.' },
      ],
      correct: 1,
    },
    {
      question: 'Your model underfits badly: 40% error on train and 42% on validation. You collect 10x more data. What happens?',
      options: [
        { text: 'Test error drops sharply — more data always helps', explanation: 'More data attacks variance. This model has almost no variance (the gap is 2 points); there is nothing for the data to fix.' },
        { text: 'The model starts overfitting', explanation: 'More data makes overfitting less likely, not more. And a model that cannot fit 1x data will not suddenly memorize 10x.' },
        { text: 'Variance falls a little, but the model still cannot express the pattern — error stays roughly where it was', explanation: 'Correct, and this is the practical value of diagnosing first. High bias needs a bigger model or better features; data spend is wasted here.' },
      ],
      correct: 2,
    },
    {
      question: 'Test error makes a U-shape as model flexibility grows. Why does training error never show that U?',
      options: [
        { text: 'Because training error is computed with a different metric', explanation: 'Same metric, different data. The shape difference comes from what the model was optimized against.' },
        { text: 'Because more flexibility can always hug the training points harder, so training error is monotonically non-increasing', explanation: 'Correct — and the consequence matters: a falling training loss is never, on its own, evidence that the model is getting better.' },
        { text: 'Because the training set is larger, and larger sets have lower error', explanation: 'Set size does not force error downward, and the monotone shape holds at any training-set size.' },
      ],
      correct: 1,
    },
    {
      question: 'Your fraud classifier scores 99.9% test accuracy on the first attempt. Best next move?',
      options: [
        { text: 'Check for leakage and check the class balance before believing the number', explanation: 'Correct. Fraud is typically <1% of rows, so 99.9% may be "predict not-fraud always". And near-perfect scores usually mean a feature that encodes the label. Suspicion first, celebration later.' },
        { text: 'Ship it — the test set was held out correctly', explanation: 'A correct split does not protect against a leaked feature or a metric that flatters an imbalanced dataset.' },
        { text: 'Add regularization to reduce the overfitting', explanation: 'Nothing here indicates overfitting — the score is high on the *test* set. The problem is that the number itself is not trustworthy.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'In thirty seconds: what does it actually mean for a model to "learn"?',
      answer:
        'Learning is fitting a function: given pairs (x, y), search a chosen family of functions for one whose outputs f(x) land close to y on the data I have. I pick the shape — line, tree, network — and the data picks the numbers inside it via a loss and an optimizer. But fitting the data I have is the easy half; the point is generalization: the bet that the pattern holding on my sample also holds on the next sample, which requires that both come from the same distribution. That is why the work is mostly about honest evaluation, not about fitting.',
      isCaseBased: false,
    },
    {
      question: 'Case: a tabular classifier hits 98% training accuracy and 71% validation accuracy on 5,000 rows. Diagnose it and give me your ordered plan.',
      answer:
        'A 27-point gap with near-perfect training accuracy is high variance — classic overfitting. The model memorized 5,000 rows including their noise. Ordered plan: (1) Regularize what I already have — for a tree ensemble that is max_depth down, min_samples_leaf up, fewer estimators or stronger subsampling; for a linear model, raise the L2 penalty; for a net, dropout plus early stopping. Cheapest, fastest signal. (2) Reduce the feature count — with 5,000 rows and, say, 200 features, many are pure noise the model latched onto; drop by importance or by a stability check across folds. (3) Move to k-fold cross-validation rather than one 15% validation split, because at this data size a single split is itself noisy and I may be chasing a mirage. (4) Ensemble/bag, which averages the instability away. (5) Only then buy more data — it is the strongest fix but the slowest and most expensive. And one check I would do first, before any of it: confirm no duplicate or near-duplicate rows straddle the split, because that produces exactly this signature and is a bug, not a bias-variance problem.',
      isCaseBased: true,
    },
    {
      question: 'Case: a different team on the same task gets 62% training accuracy and 61% validation accuracy, while a domain expert gets about 90%. Diagnose and plan.',
      answer:
        'Almost no gap and high error on both sets: high bias, underfitting. The model class cannot express the pattern, and the human baseline of 90% proves the pattern exists and is learnable — so this is not the noise floor. Plan, in order: (1) Features first — on tabular data this is the biggest lever; add interactions, ratios, domain-derived fields, proper encodings for high-cardinality categoricals. (2) A more expressive model — logistic regression to gradient boosting is usually the single biggest jump available. (3) Reduce regularization and train longer; verify it has actually converged rather than assuming. (4) Check the features actually contain the information the expert uses — if the expert reads a free-text note the model never sees, no model can close the gap and the real fix is a data-collection change. What I would NOT do is collect more rows: more data reduces variance, and there is no variance here to reduce.',
      isCaseBased: true,
    },
    {
      question: 'Why do we need a validation set when we already have a test set? Argue it precisely.',
      answer:
        'Because they answer different questions and one of them corrupts a dataset by being asked. Validation answers "which of my candidates is best" — and answering it repeatedly fits my decisions to that set, so its score becomes optimistic. Test answers "what will the chosen model do on new data" — an unbiased estimate, which only stays unbiased while nothing has been selected using it. Collapse them into one set and you lose the unbiased estimate entirely: your reported number now includes the winner\'s curse from every comparison you ran. The size of the inflation scales with how many candidates you compared, which is why heavily tuned models suffer worst. In small-data regimes I replace the fixed validation split with k-fold CV, but the test set stays sealed either way.',
      isCaseBased: false,
    },
    {
      question: 'Write down the bias-variance decomposition and read each term in plain English.',
      answer:
        'For squared error: E[(y - f_hat(x))^2] = (E[f_hat(x)] - f(x))^2 + E[(f_hat(x) - E[f_hat(x)])^2] + sigma^2, where the expectation is over training sets — imagine re-collecting the data many times and refitting each time. Term 1, bias-squared: take the AVERAGE model over all those re-runs and ask how far it is from the truth. That is the error from wrong assumptions, and it does not shrink with more data. Term 2, variance: how far a single run sits from that average — the error from being sensitive to which rows you happened to draw. Term 3, sigma-squared: label and measurement noise, a property of the data that no model can touch, and the floor on your achievable error. The key caveat to volunteer: you cannot compute these three terms on real data, because you never know f. It is a diagnostic frame, not a metric.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague reports 94% test accuracy. You learn they ran roughly 40 experiments, checking the test set each time. How much do you trust it and what do you do?',
      answer:
        'I trust the direction, not the number — 94% is an upper bound on true performance, inflated by selection. Forty comparisons against one set means the winner captured some sampling luck; with a 1,000-row test set, the standard error on accuracy is already about 1.5 points, and taking a max over 40 noisy draws pushes the expected inflation to several points. What I do: (1) Do not re-run experiments on that set — it is burned; treat it as a validation set from now on. (2) Carve out a genuinely fresh holdout, ideally a later time period, and evaluate the frozen model once. (3) If no fresh data exists, use nested cross-validation so model selection happens strictly inside the inner loop. (4) Report the finding without blame — this is the single most common mistake in applied ML, and the process fix (validation for all choices, test sealed until the model is frozen) is what actually prevents it.',
      isCaseBased: true,
    },
    {
      question: 'Is bias-variance always a tradeoff? Where does the classic story break down?',
      answer:
        'It is a tradeoff along the *flexibility* axis, holding everything else fixed — that is the U-curve. It is not a tradeoff along every axis. More training data reduces variance without adding bias, which is why it is the one strictly good fix. Better features can reduce bias without adding variance. Bagging reduces variance at essentially no bias cost. And the classic U itself breaks in the modern over-parameterized regime: with very large models, test error falls, rises to a peak near the interpolation threshold, then falls again — double descent — which is why enormous neural networks can memorize the training set and still generalize. So the honest interview answer is: the tradeoff is a real and useful frame for choosing model complexity, but it is a statement about one axis, not a law of nature.',
      isCaseBased: false,
    },
    {
      question: 'You are handed only two numbers, training error and validation error. Walk me through every diagnosis you can make.',
      answer:
        'Four cases. High train, high val, small gap: high bias, underfitting — the model cannot express the pattern; fix with a bigger model or better features. Low train, high val, large gap: high variance, overfitting — fix with more data, regularization, a simpler model, or ensembling. Low train, low val: done; further tuning is likely just fitting the validation set. Train error HIGHER than val error: treat as a bug signal — usually a leaky or accidentally easier validation split, or regularization such as dropout being active during training but not evaluation. One more judgement layer that separates a senior answer: compare the errors against a human or simple-baseline benchmark, because "high error" is meaningless in isolation — 30% error can be underfitting on one task and near the noise floor on another.',
      isCaseBased: false,
    },
    {
      question: 'Case: the model looks excellent offline and performs far worse in production. Debug it.',
      answer:
        'I work from cheapest cause to most expensive. (1) Evaluation was never honest: the test set was peeked at across many experiments, or duplicate rows straddled the split — check experiment history and run a duplicate check. (2) Leakage: a feature that is unavailable, or has a different value, at prediction time — the classic being a field populated after the outcome occurs. Test by rebuilding the feature strictly from data available at decision time and re-scoring. (3) Train/serve skew: preprocessing differs between the training pipeline and the serving path — a scaler fitted on the full dataset, a different encoding of an unseen category, a different imputation default. (4) Distribution shift: production traffic is not the offline sample — new segment, seasonality, a changed upstream source. Compare feature distributions offline vs live. (5) Only last, genuine overfitting. The ordering is the answer: in practice the first three cause far more production failures than model quality does.',
      isCaseBased: true,
    },
    {
      question: 'Supervised, unsupervised, reinforcement — define each in one line, and tell me which trap candidates fall into.',
      answer:
        'Supervised: labelled pairs (x, y), learn the mapping — regression for continuous y, classification for categorical. Unsupervised: only x, find structure — clustering, dimensionality reduction, anomaly detection — and evaluation is hard because there is no answer key. Reinforcement: no labels, only a delayed reward from an environment the agent acts in; it learns a policy through trial and error, and the hard part is credit assignment across time. The trap: candidates describe a supervised problem as unsupervised because the labels came from a rule or a heuristic rather than a human. If you are fitting toward a target column, it is supervised regardless of where that column came from — and if that column was generated by a rule, the real question becomes why you need a model to reproduce a rule you already have.',
      isCaseBased: false,
    },
    {
      question: 'What is irreducible error, and how would you estimate it for a real dataset?',
      answer:
        'It is the variability in y that your features simply do not explain — measurement noise, label disagreement, genuine randomness in the outcome. It is a property of the data and the feature set, so no model or amount of tuning reduces it; it sets a hard floor on achievable error. Estimating it: (1) inter-annotator agreement — have two labellers independently label the same few hundred examples; their disagreement rate is a practical floor for label noise. (2) Duplicate or near-duplicate inputs with different labels — measure the outcome spread among rows that are identical in features. (3) A strong-model ceiling — if several very different model families all plateau at the same error, you are probably near the floor rather than under-modelling. Why it matters in practice: it tells you when to stop spending. If human agreement is 92% and your model is at 90%, the remaining work is in better data or better features, not a bigger model — and a score meaningfully above the floor is a leakage alarm, not a win.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'What "learning" means, and the bet inside it', back: 'Find f such that f(x) is close to y on data you HAVE — hoping it holds on data you do not. You choose the shape, the data chooses the numbers. Generalization is that bet paying off, and it assumes train and future data share a distribution.' },
    { front: 'Supervised / unsupervised / reinforcement', back: 'Learn from answers (labelled x,y) / learn from structure (only x) / learn from consequences (delayed reward).' },
    { front: 'The ML workflow', back: 'Data to features to model to evaluate to iterate. Time goes mostly into data and features; model choice is ~10%.' },
    { front: 'Train vs validation vs test', back: 'Train fits parameters. Validation fits YOUR choices (models, hyperparameters, early stopping). Test fits nothing — opened once, after the model is frozen.' },
    { front: 'Test-set peeking / winner\'s curse', back: 'Selecting the best of many candidates on one set inflates its score by luck that will not repeat. Estimate improves, model does not. Your brain is the leak channel.' },
    { front: 'Underfitting vs overfitting signature', back: 'Underfit: high error on train AND val, small gap. Overfit: near-zero train error, large train/val gap.' },
    { front: 'Bias vs variance in one line each', back: 'Bias = wrong assumptions, systematically off in the same direction. Variance = sensitivity to the particular training sample, unstable across re-runs.' },
    { front: 'The decomposition', back: 'E[(y - f_hat)^2] = bias^2 + variance + sigma^2. Average model vs truth, spread around that average, and label noise you cannot touch.' },
    { front: 'Fix bias vs fix variance', back: 'Bias: bigger model, better features, less regularization, train longer. Variance: more data, regularization, simpler model, ensembling. Diagnose with the gap BEFORE choosing.' },
    { front: 'Irreducible error / noise floor', back: 'Variability your features cannot explain (label noise, ambiguity). Sets the error floor. Estimate via inter-annotator agreement. Near-100% accuracy = look for leakage.' },
  ],
  mindmapMarkdown: `- Learning, Generalization, Bias & Variance
  - What learning is
    - Find f with f(x) ~ y on data you HAVE
    - You pick the shape, data picks the numbers
    - Generalization = the bet paying off on unseen data
    - Assumes train and future share a distribution
  - Three flavours
    - Supervised: learn from answers (x, y)
    - Unsupervised: learn from structure (only x)
    - Reinforcement: learn from consequences (reward)
  - Workflow spine
    - Data (collect, clean, SPLIT)
    - Features (biggest lever on tabular)
    - Model (~10% of the job)
    - Evaluate (one metric, chosen first)
    - Iterate (the gap says which way)
  - Three splits, three jobs
    - Train fits parameters (~70%)
    - Validation fits YOUR choices (~15%)
    - Test fits nothing — opened ONCE (~15%)
    - Shuffle before slicing
    - Peeking = winner's curse = optimism you ship
  - Fit failures
    - Underfit: high train AND val, small gap
    - Overfit: train ~0, big gap
    - Polynomial degree 0 / 1 / 3 / 9 story
    - U-curve of test error; live at its bottom
  - Bias vs variance
    - Bias = wrong assumptions, systematically off
    - Variance = sensitivity to the sample, unstable
    - E[err] = bias^2 + variance + noise
  - Fixes
    - Bias: bigger model, better features, less reg
    - Variance: more data, regularization, simpler, ensembling
    - Diagnose with the gap BEFORE spending
  - Noise floor
    - Irreducible: label noise, ambiguity
    - Estimate via human agreement
    - 100% accuracy = leakage hunt, not a trophy`,
}

export default m
