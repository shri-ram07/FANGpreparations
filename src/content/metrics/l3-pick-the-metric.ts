import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l3-pick-the-metric',
  subjectId: 'metrics',
  level: 3,
  title: 'Pick the Metric: Case Studies That Decide the Interview',
  whyItMatters:
    'Knowing what F1 means gets you past a screen. Choosing the metric for a real problem, and defending that choice against a PM who wants a different number, is the harder skill. This module is the capstone: one confusion matrix computed by hand from end to end, then four cases (fraud, medical screening, search ranking, churn) run through the same five-step drill, plus the trap that ruins teams who optimize the number instead of the outcome.',
  assumes: [
    'You have read The Confusion Matrix: Precision, Recall & F1. TP, FP, FN, TN, precision and recall are used here without re-deriving them',
    'You have read ROC & PR Curves. This module compares models with PR-AUC and assumes you know what a precision-recall curve is',
    'You know what a percentage is and can do the arithmetic on a calculator. Every metric here is computed by hand before any library is used',
    'Basic Python: variables, a for loop, and calling a function from a library',
  ],
  estMinutes: 40,
  sections: [
    {
      type: 'intuition',
      title: 'A metric is an argument, not a number',
      md: `Two candidates get the same fraud problem. One says "I'd use F1." The other says "a missed fraud costs us the transaction, a false alarm costs an analyst four minutes, and we have 200 analyst-slots a day, so I'd rank by score and measure precision@200."

- Same knowledge of formulas. Completely different answers.
- The first answer picked a metric. The second made an **argument** about what matters, and the metric fell out of it.
- Every metric hides an assumption. F1 assumes a miss and a false alarm cost the same. Accuracy assumes every row is equally interesting. ROC-AUC assumes you care about the negative class.
- The real question is never "do you know the formula". It is "can you name the assumption and say whether it holds here".
- So: never state a metric without first stating the decision and the cost.`,
    },
    {
      type: 'intuition',
      title: 'The five-step drill',
      md: `Run this out loud, in order, on every problem you are handed. It takes ninety seconds and it produces the answer.

1. **What decision does this model drive?** Someone acts on the output — blocks a card, orders a biopsy, reorders a page, mails a coupon. Name the action.
2. **What does each error type cost?** A false negative and a false positive, in the same units — money, harm, trust, wasted human hours.
3. **Is the positive class rare?** If yes, accuracy and ROC-AUC are out; precision-side metrics and PR-AUC are in.
4. **Is the output a ranking, a number, or a decision?** Ranking gives NDCG, precision@k or MAP. Number gives MSE, MAE or calibration. Decision gives the confusion-matrix family at a chosen threshold.
5. **What operating point follows?** A threshold from expected cost, a top-k from a capacity limit, or a hard constraint ("recall at least 0.98") with the other metric maximized under it.

Steps 1 and 2 do the real work. Steps 3 to 5 are bookkeeping once you have them.`,
    },
    {
      type: 'note',
      md: `The drill also protects you from answering too fast. When asked "which metric for X?", the strong move is to *ask first* — "what happens when the model says yes, and who pays when it is wrong?" — and only then answer. If nobody will give you costs, invent plausible ones out loud and say so: *"assume a miss costs about 200x a false alarm; if that ratio flips, my answer flips too."* Naming the sensitivity of your answer is worth more than the answer.`,
    },
    {
      type: 'intuition',
      title: 'The by-hand exercise: one matrix, every metric',
      md: `Before any case study, you must be able to compute the whole family from four numbers without a library. Here is the matrix. A fraud model scored 1,000 transactions; 50 were genuinely fraudulent.

- **TP = 45** — fraud, flagged. Caught.
- **FP = 15** — legitimate, flagged. An annoyed customer plus an analyst's time.
- **FN = 5** — fraud, missed. The bank eats it.
- **TN = 935** — legitimate, cleared. The boring majority.
- Sanity checks first: total = 45 + 15 + 5 + 935 = **1,000**. Actual positives = TP + FN = **50**. Predicted positives = TP + FP = **60**. Actual negatives = FP + TN = **950**.
- Baseline before anything else: always predicting "not fraud" scores 950/1000 = **0.950 accuracy**. Hold that number.`,
    },
    {
      type: 'math',
      intro: 'The whole family, written once. P = precision, R = recall.',
      latex: [
        '\\text{Accuracy} = \\frac{TP+TN}{TP+FP+FN+TN} \\qquad P = \\frac{TP}{TP+FP} \\qquad R = \\frac{TP}{TP+FN}',
        '\\text{Specificity} = \\frac{TN}{TN+FP} \\qquad \\text{FPR} = \\frac{FP}{FP+TN} = 1 - \\text{Specificity}',
        'F_\\beta = (1+\\beta^2)\\,\\frac{P \\cdot R}{\\beta^2 P + R} \\qquad \\text{Balanced Acc} = \\frac{R + \\text{Specificity}}{2}',
        '\\text{MCC} = \\frac{TP \\cdot TN - FP \\cdot FN}{\\sqrt{(TP+FP)(TP+FN)(TN+FP)(TN+FN)}} \\;\\in\\; [-1, 1]',
      ],
    },
    {
      type: 'intuition',
      title: 'Now do the arithmetic',
      md: `Every number below comes from the four cells. Do it once by hand and you will never fumble this on a whiteboard.

- **Accuracy** = (45 + 935) / 1000 = 980 / 1000 = **0.9800**. Compare to the 0.950 baseline: three points of improvement for all that work.
- **Precision** = 45 / (45 + 15) = 45 / 60 = **0.7500**. Three of every four alarms are real.
- **Recall** = 45 / (45 + 5) = 45 / 50 = **0.9000**. Nine of every ten frauds caught.
- **Specificity** = 935 / (935 + 15) = 935 / 950 = **0.9842**. Of the innocent, 98.4% left alone.
- **FPR** = 15 / 950 = **0.0158** = 1 minus 0.9842. The x-axis of the ROC curve.
- **F1** = 2(0.75)(0.90) / (0.75 + 0.90) = 1.350 / 1.650 = **0.8182**. Harmonic mean — it sits nearer the *worse* of the pair.
- **F2** (beta = 2, recall counts 4x) = 5(0.75)(0.90) / (4·0.75 + 0.90) = 3.375 / 3.900 = **0.8654**. Higher than F1, because recall is our strong side.
- **F0.5** (beta = 0.5, precision favoured) = 1.25(0.75)(0.90) / (0.25·0.75 + 0.90) = 0.84375 / 1.0875 = **0.7759**. Lower — precision is our weak side.
- **Balanced accuracy** = (0.9000 + 0.9842) / 2 = **0.9421**. Accuracy if both classes were the same size.
- **MCC** = (45·935 − 15·5) / √(60 · 50 · 950 · 940) = (42,075 − 75) / √2,679,000,000 = 42,000 / 51,759.1 = **0.8115**.`,
    },
    {
      type: 'note',
      md: `**Why MCC is the most honest single number for imbalanced binary problems.** It is the only one of these that uses all four cells *and* normalizes by both row and column totals — it is literally the correlation coefficient between predicted and true labels. Consequences: a constant predictor scores exactly **0** no matter how skewed the classes (our always-negative baseline gets accuracy 0.950, F1 0.000, balanced accuracy 0.500, MCC 0.000); random guessing scores 0; perfect inversion scores −1. F1 ignores TN entirely and rewards you for guessing positive a lot; accuracy is dominated by TN. MCC cannot be gamed by either. Use it as the *summary* number when someone demands one, then immediately show the raw four cells, because "caught 45 of 50 frauds at 15 false alarms" is what a human can act on.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Check the arithmetic against sklearn — part 1: five metrics from four counts',
      code: `import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score

TP, FP, FN, TN = 45, 15, 5, 935
y_true = np.r_[np.ones(TP + FN), np.zeros(FP + TN)]
y_pred = np.r_[np.ones(TP), np.zeros(FN), np.ones(FP), np.zeros(TN)]
print('accuracy    %.4f' % accuracy_score(y_true, y_pred))
print('precision   %.4f' % precision_score(y_true, y_pred))
print('recall      %.4f' % recall_score(y_true, y_pred))
print('specificity %.4f' % (TN / (TN + FP)))
print('FPR         %.4f' % (FP / (FP + TN)))

# ---- real output ----
# accuracy    0.9800
# precision   0.7500
# recall      0.9000
# specificity 0.9842
# FPR         0.0158`,
      annotations: {
        1: 'numpy is the array library. np is the conventional short name, so later lines write np.ones instead of numpy.ones.',
        2: 'Import only the three scoring functions we need. Each takes (true labels, predicted labels) and returns one number.',
        4: 'The four cells of our matrix, unpacked into four names in one statement.',
        5: 'np.ones(n) makes an array of n ones, np.zeros(n) makes n zeros, and np.r_[a, b] glues two arrays end to end. So y_true is 50 ones (the real frauds) followed by 950 zeros.',
        6: 'The predictions, in the same row order. For the first 50 rows the model said yes 45 times then no 5 times (TP then FN); for the 950 real negatives it said yes 15 times then no 935 times (FP then TN).',
        7: 'accuracy_score counts the rows where the two arrays agree and divides by 1000. The %.4f inside the string means "print a decimal with four places"; the % after the string feeds the value into that slot.',
        8: 'precision_score divides TP by everything the model flagged (TP + FP = 60).',
        9: 'recall_score divides TP by everything that was really fraud (TP + FN = 50).',
        10: 'sklearn has no specificity function, so compute it straight from the cells: TN over all real negatives.',
        11: 'FPR is the other view of the same two cells, and equals 1 minus specificity.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 2: the F-beta family, balanced accuracy and MCC',
      code: `from sklearn.metrics import fbeta_score, balanced_accuracy_score, matthews_corrcoef

for b in (1, 2, 0.5):
    print('F%-11s%.4f' % (b, fbeta_score(y_true, y_pred, beta=b)))
print('bal acc     %.4f' % balanced_accuracy_score(y_true, y_pred))
print('MCC         %.4f' % matthews_corrcoef(y_true, y_pred))

# ---- real output (y_true and y_pred carry over from part 1) ----
# F1          0.8182
# F2          0.8654
# F0.5        0.7759
# bal acc     0.9421
# MCC         0.8115`,
      annotations: {
        1: 'Part 2 runs in the same file, so y_true and y_pred from part 1 are still in memory. Three more scoring functions.',
        3: 'One loop instead of three near-identical lines: b takes the value 1, then 2, then 0.5.',
        4: 'fbeta_score with beta=b. Beta is how many times more you value recall than precision. The %-11s prints b padded to 11 characters so the columns line up.',
        5: 'Balanced accuracy is the average of recall and specificity: accuracy as it would be if both classes were the same size.',
        6: 'MCC in one call. It is the only line here that a model which always answers "not fraud" could not fool — that model scores exactly 0.',
      },
    },
    { type: 'visual', component: 'ConfusionMatrixLab', props: {} },
    {
      type: 'note',
      md: `Use the lab as the companion to the arithmetic above. It holds 50 scored items, 25 positive and 25 negative, and every drag re-cuts the four cells live. Three things to actually *do* with it. **(1)** Drag until precision reads about 0.75 and watch recall, F1 and accuracy move together — you cannot change one cell in isolation, which is the whole lesson. **(2)** Drag to the extremes: at threshold 0 you predict everything positive (recall 1.0, precision equal to the base rate); at threshold 1 you predict nothing (precision undefined, recall 0). Both are useless models with a perfect score on one metric. **(3)** Hit *Sweep 1 to 0* and watch the ROC curve draw itself — each point on that curve is one confusion matrix. A curve is not a metric; it is the set of operating points you could choose. Choosing one is your job, and the rest of this module is how.`,
    },
    {
      type: 'intuition',
      title: 'Case 1 — fraud detection: run the drill',
      md: `Card fraud. 0.2% of transactions are fraudulent. The bank has a review team that can work 200 alerts a day, no more.

1. **Decision**: hold the transaction and send it to a human analyst. Not "block forever" — queue for review.
2. **Costs**: a miss costs the transaction value the bank refunds, call it ₹8,000 average. A false alarm costs an analyst about 4 minutes (~₹40) plus a slice of customer trust. Ratio roughly **200 : 1** in favour of catching fraud.
3. **Rare?** Brutally — 2 in 1,000. Accuracy is dead on arrival; so is ROC-AUC, because its FPR denominator is the 99.8% negative class, so ten thousand new false alarms barely move it.
4. **Ranking, number, or decision?** It looks like a decision but it is really a **ranking** — the queue is sorted by score and worked from the top down.
5. **Operating point**: the queue has a fixed length. That length, not 0.5, is the threshold.

The answer in one breath: *compare models on PR-AUC, operate on precision@k with k = daily review capacity, sanity-check the threshold against expected cost, and monitor score drift weekly.*`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Why accuracy and ROC-AUC would ship the worse model — part 1: build the data and two rankers',
      code: `import numpy as np
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

X, y = make_classification(n_samples=200000, n_features=12, n_informative=6, n_redundant=0,
                           n_clusters_per_class=1, weights=[0.998], flip_y=0.0,
                           class_sep=0.9, random_state=0)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.4, stratify=y, random_state=0)
sA = LogisticRegression(max_iter=2000).fit(Xtr, ytr).predict_proba(Xte)[:, 1]
noise = np.random.default_rng(0).standard_normal(len(sA))
z = np.log(sA / (1 - sA)) + noise
sB = 1 / (1 + np.exp(-z))
print('frauds=%d of %d rows (%.2f%%)' % (yte.sum(), len(yte), 100 * yte.mean()))

# ---- real output ----
# frauds=160 of 80000 rows (0.20%)`,
      annotations: {
        1: 'numpy, for arrays and for the log and exp arithmetic further down.',
        2: 'make_classification invents a labelled dataset with whatever shape we ask for, so these numbers reproduce exactly on your machine.',
        3: 'LogisticRegression is the model: it learns a score between 0 and 1 for each row.',
        4: 'train_test_split cuts the rows into a training part and a held-out test part.',
        6: 'Ask for 200,000 rows and 12 input columns, 6 of which carry real signal. n_redundant=0 means none of the others are copies of those six.',
        7: 'weights=[0.998] is the realistic fraud shape: 99.8% of rows are class 0, so 0.2% are fraud. flip_y=0.0 switches off random label noise.',
        8: 'class_sep=0.9 makes the two classes overlap a fair amount, so the problem is hard but not hopeless. random_state=0 fixes the randomness.',
        9: 'Hold out 40% of the rows for testing. stratify=y keeps the same 0.2% fraud rate in both halves, which matters enormously when positives are this rare.',
        10: 'Fit on the training half, then score the test half. predict_proba returns two columns, P(class 0) and P(class 1); [:, 1] means "every row, column 1", the fraud probability. sA is model A.',
        11: 'Draw one random number per test row from a bell curve, from a generator seeded at 0 so the draw repeats.',
        12: 'Convert the scores to log-odds, log(s / (1 - s)), and add the noise. Log-odds is the unbounded scale a logistic model works on, and adding noise there jumbles the ordering slightly.',
        13: 'Convert back to a probability with 1/(1 + e^-z). sB is model B: the same underlying signal, a sloppier ranking. The two differ only in ranking quality.',
        14: 'Print the shape of the test set, so the imbalance is on screen before any metric is.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 2: score both models four different ways',
      code: `from sklearn.metrics import accuracy_score, roc_auc_score, average_precision_score

print('always-negative accuracy=%.4f' % accuracy_score(yte, np.zeros_like(yte)))
K = 200
for name, s in (('A', sA), ('B', sB)):
    top = yte[np.argsort(-s)[:K]]
    acc = accuracy_score(yte, s >= 0.5)
    roc = roc_auc_score(yte, s)
    pr = average_precision_score(yte, s)
    print('model %s  acc@0.5=%.4f  ROC-AUC=%.3f  PR-AUC=%.3f  prec@200=%.3f  caught=%d'
          % (name, acc, roc, pr, top.mean(), int(top.sum())))

# ---- real output ----
# always-negative accuracy=0.9980
# model A  acc@0.5=0.9983  ROC-AUC=0.914  PR-AUC=0.334  prec@200=0.325  caught=65
# model B  acc@0.5=0.9981  ROC-AUC=0.914  PR-AUC=0.239  prec@200=0.240  caught=48`,
      annotations: {
        1: 'The three model-comparison metrics. average_precision_score is sklearn\'s name for PR-AUC.',
        3: 'np.zeros_like(yte) is an array of zeros the same length as yte: the do-nothing model that answers "not fraud" to every row. This baseline is the number every other number must beat.',
        4: 'K is the review capacity — analysts work 200 alerts per batch.',
        5: 'Loop over two (label, score-array) pairs. Python unpacks each pair into name and s, so the body runs once for model A and once for model B.',
        6: 'precision@k in one line, read inside out: -s flips the sign so argsort (which sorts ascending) puts the highest score first; [:K] keeps the first K positions; yte[...] pulls the true labels sitting at those positions. top is the 200 labels the review team would see.',
        7: 's >= 0.5 gives an array of True/False, one per row — a boolean mask. sklearn reads True as "predicted fraud", so this is accuracy at the default threshold.',
        8: 'ROC-AUC: the chance that a randomly chosen fraud scores above a randomly chosen non-fraud. Ranking quality measured against the whole negative class.',
        9: 'PR-AUC: the area under the precision-recall curve. Its denominators never include TN.',
        10: 'Print all four numbers for this model on one line, plus top.mean() (the fraction of the top 200 that were really fraud) and top.sum() (how many frauds that is).',
        11: 'The % on this line feeds the six values into the six format slots above, in order.',
        16: 'Read the two result lines side by side. Accuracy: 0.9983 vs 0.9981 — indistinguishable, and both barely above the 0.9980 do-nothing baseline. ROC-AUC: 0.914 vs 0.914 — identical to three decimals. PR-AUC: 0.334 vs 0.239. precision@200: 0.325 vs 0.240, so the same analyst hours catch 65 frauds instead of 48. Ship on accuracy or ROC-AUC and you are flipping a coin; ship on PR-AUC and you catch 35% more fraud.',
      },
    },
    {
      type: 'math',
      intro: 'Two ways to set the operating point. In the real world both bind, and you take the tighter one.',
      latex: [
        't^{*} = \\arg\\min_{t} \\;\\; C_{FN} \\cdot FN(t) \\;+\\; C_{FP} \\cdot FP(t)',
        '\\text{precision@}k = \\frac{1}{k}\\sum_{i=1}^{k} y_{(i)}, \\qquad y_{(i)} \\text{ = labels sorted by score, descending}',
        '\\text{Operate at } \\min\\big(\\text{volume implied by } t^{*},\\; k_{\\text{capacity}}\\big)',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 3: expected-cost threshold vs the review queue that actually exists',
      code: `C_FN, C_FP = 8000, 40
print(' thr  alerts caught missed      cost')
for t in (0.5, 0.05, 0.01, 0.005, 0.002, 0.001):
    flagged = sA >= t
    tp = int((flagged & (yte == 1)).sum())
    alerts = int(flagged.sum())
    missed = int(yte.sum()) - tp
    cost = C_FN * missed + C_FP * alerts
    print('%.3f %7d %6d %6d %9d' % (t, alerts, tp, missed, cost))
top = yte[np.argsort(-sA)[:200]]
print('capacity k=200 -> precision@k=%.3f, catches %d of %d frauds'
      % (top.mean(), int(top.sum()), int(yte.sum())))

# ---- real output ----
#  thr  alerts caught missed      cost
# 0.500      27     24    136   1089080
# 0.050     440     75     85    697600
# 0.010    2248     97     63    593920
# 0.005    4282    120     40    491280
# 0.002    8766    127     33    614640
# 0.001   14064    136     24    754560
# capacity k=200 -> precision@k=0.325, catches 65 of 160 frauds`,
      annotations: {
        1: 'The two numbers that decide everything: ₹8,000 for a fraud we refund, ₹40 for one analyst review. Get them from the business, not from a paper. If nobody knows them, that conversation is the deliverable.',
        2: 'A header row so the table below is readable. Nothing is computed here.',
        3: 'Sweep six candidate thresholds, from the default 0.5 down to 0.001. Note we are sweeping cost, not maximizing F1 — F1 would silently assume C_FN = C_FP, and here they differ by 200x.',
        4: 'flagged is a boolean mask: True for every test row whose score is at or above this threshold. It still uses sA, model A from part 1.',
        5: 'The & operator combines two masks position by position, so this is True only where the model flagged the row AND the row really was fraud. .sum() counts the Trues, because True counts as 1.',
        6: 'Count every alert this threshold produces, fraud or not.',
        7: 'Total frauds minus the ones we caught.',
        8: 'Expected cost in rupees: every miss costs C_FN, every alert costs C_FP of analyst time.',
        9: 'Print one row of the table. %7d means "an integer padded to 7 characters", which keeps the columns aligned.',
        10: 'Now ignore thresholds entirely: sort by score, take the top 200, keep their true labels. This is what the review team can actually process.',
        11: 'Print the capacity view instead of the threshold view.',
        12: 'top.mean() is precision@200, the fraction of those 200 that were really fraud, and top.sum() is how many frauds that is out of yte.sum() in total.',
        20: 'The cost minimum sits at t = 0.005: cost 491,280, down 55% from the default 0.5 threshold. Moving one number beat any amount of extra modelling.',
        22: 'And here is the reality check: the cost-optimal point wants 4,282 reviews, and the team can do 200. Capacity binds first, so precision@200 is the metric you actually manage, and "hire more analysts" becomes a business decision you can now put a number on.',
      },
    },
    {
      type: 'note',
      md: `Two things that finish the fraud answer. **Drift**: fraud is adversarial, so patterns change on purpose and a threshold calibrated in March has different precision in June. Monitor the *score distribution* and the alert rate daily; a drifting alert volume is visible long before labels arrive. **Label lag**: chargebacks land 30 to 90 days late, so today's recall is unmeasurable today. Track leading indicators (alert rate, precision on the reviewed subset) and accept that the full metric is always a quarter behind. Note the sampling bias this creates too: you only ever learn labels for what the queue reviewed, so tomorrow's training data is shaped by today's threshold.`,
    },
    {
      type: 'intuition',
      title: 'Case 2 — medical screening: run the drill',
      md: `A model reads mammograms and flags patients for follow-up imaging. 0.5% of the screened population has cancer.

1. **Decision**: order a second, more invasive test. Not "diagnose cancer" — nobody is treated on a model's say-so.
2. **Costs**: a false negative can be a death, or a stage-1 tumour becoming stage-3. A false positive is one more scan. Wildly asymmetric, but *not infinitely* so, and that "but" is the whole case.
3. **Rare?** Yes, 1 in 200. Accuracy is meaningless.
4. **Ranking, number, or decision?** A **calibrated number**, then a decision. Radiologists read the probability and combine it with what they see, so a score of 0.7 must actually mean that 70% of such patients have cancer, or their judgement is corrupted.
5. **Operating point**: a hard constraint, not an optimum — **recall at least 0.98**, then maximize precision subject to it.

The answer in one breath: *recall as a floor set by clinicians, precision maximized under that floor, calibration reported alongside, and a two-stage screen so the floor is affordable.*`,
    },
    {
      type: 'note',
      md: `**The wrong answer, walked into on purpose: "just maximize recall".** Set the threshold to zero and recall is a perfect 1.0. You have now recommended a biopsy for everyone, which is not a screening programme, it is a harm-delivery system. The second-order costs are real and measured: **anxiety** (false-positive recalls cause months of documented distress), **overdiagnosis and overtreatment** (screening finds slow tumours that would never have harmed anyone, and those patients still get surgery and radiation), **cost and capacity** (every false positive consumes a scanner slot a symptomatic patient needed), and **erosion of trust** (a programme with 20% precision gets ignored, and then it catches nothing). The honest framing is a *constrained optimization*: recall at least 0.98 is the clinical floor, and among the models that clear it you take the one with the best precision. Floor first, then optimize.`,
    },
    {
      type: 'note',
      md: `**Calibration is a separate axis from ranking, and screening is where that bites.** A model can rank perfectly — sick above healthy, so a fine ROC-AUC — while its probabilities are systematically inflated, every output reading 0.8 when the true rate is 0.3. Ranking metrics literally cannot see this, because pushing all the scores through any always-increasing function leaves AUC unchanged. Report the **Brier score** (mean squared error of the probabilities) and a **reliability diagram** (bucket the predictions, plot predicted rate against observed rate); fix with Platt scaling or isotonic regression on a held-out set. Remember from the imbalance material that class weights and resampling *decalibrate* on purpose, so if a human reads the number, prefer moving the threshold and recalibrate afterwards. Deployment reality: real programmes are **two-stage** — a cheap high-recall screen, precision as low as 5 to 10%, feeding an expensive high-precision confirmatory test. The cheap stage is allowed a terrible precision because the expensive stage cleans up, and its metric is recall at a *volume* stage two can absorb. That is precision@k wearing a lab coat.`,
    },
    {
      type: 'intuition',
      title: 'Case 3 — search ranking: run the drill',
      md: `A query returns ten results. The model decides the order.

1. **Decision**: which document goes in slot 1, 2, 3. Nothing is "classified" at all.
2. **Costs**: there is no false positive or false negative. There is a *good result buried at rank 8*, which costs the user some scrolling, and a *bad result at rank 1*, which costs the session.
3. **Rare?** Wrong question. Relevance here is **graded**, not binary: perfect / good / okay / irrelevant, usually scored 0 to 3 by human raters.
4. **Ranking, number, or decision?** Pure ranking, and **position matters** — a win at rank 1 is worth far more than the same win at rank 9.
5. **Operating point**: there is no threshold. There is a cut-off: the ten slots on the page.

The answer in one breath: *NDCG@10 on a human-rated set to iterate offline, then an online A/B test on real engagement with guardrails, because offline and online disagree more often than anyone admits.*`,
    },
    {
      type: 'math',
      intro: 'NDCG: the discount is the whole idea. rel_i is the graded relevance of the item at position i.',
      latex: [
        'DCG@k = \\sum_{i=1}^{k} \\frac{2^{rel_i} - 1}{\\log_2(i+1)} \\qquad NDCG@k = \\frac{DCG@k}{IDCG@k} \\in [0, 1]',
        '\\text{Position discount: } \\tfrac{1}{\\log_2 2} = 1.00 \\;(\\text{rank 1}), \\quad \\tfrac{1}{\\log_2 11} \\approx 0.29 \\;(\\text{rank 10})',
        'IDCG@k = DCG@k \\text{ of the perfect ordering} \\;\\Rightarrow\\; \\text{scores comparable across queries}',
      ],
    },
    {
      type: 'note',
      md: `Two things NDCG buys you and one thing it cannot. It **grades** relevance — the 2^rel − 1 numerator makes a "perfect" result worth 7 and an "okay" one worth 1, instead of calling both just "relevant" — and it **discounts by position**, so moving a good result from rank 8 to rank 1 raises the score by roughly 3.2x. Dividing by the ideal ordering makes an easy query with four perfect answers comparable to a hard one with none. What it cannot do is tell you whether users will be happier. Offline NDCG is computed against *rater* labels, on *logged* queries, under the *old* model's exposure — three biases stacked. So NDCG@10 is the iteration metric, and the decision metric is an online A/B test.`,
    },
    {
      type: 'note',
      md: `**The proxy-metric trap, and this is where it was invented.** You cannot measure "user satisfaction", so you measure clicks. Optimize clicks hard enough and the system learns the fastest route to a click: clickbait titles, outrage, thumbnails that misrepresent, results that are interesting rather than correct. The metric goes up. The product gets worse. The fix is not a cleverer single metric, it is a **primary metric plus guardrails**: optimize long-dwell clicks or successful sessions (a click followed by 30+ seconds and no immediate re-query), and simultaneously *hold the line* on abandonment rate, query reformulation rate, complaint rate, latency and long-run retention. Ship only if the primary metric rises and no guardrail degrades. That structure — a primary metric, declared guardrails, and a refusal to ship on the primary alone — is the entire defence.`,
    },
    {
      type: 'intuition',
      title: 'Case 4 — churn with a retention budget: the one almost everyone gets wrong',
      md: `A telco can afford to send a ₹500 retention offer to 10,000 of its 2,000,000 customers this month. Build the model.

1. **Decision**: mail an offer, to exactly 10,000 people. That is the entire action space.
2. **Costs**: ₹500 per offer, plus the discount margin. A missed churner costs their lifetime value.
3. **Rare?** Churn is maybe 3%. Imbalanced, yes, but that is not the interesting part.
4. **Ranking, number, or decision?** Ranking, with a hard budget of 10,000 — so precision@10,000, right?
5. **Operating point**: 10,000. But *ranked by what?*

Here is the twist almost everyone misses. Rank by predicted churn probability and your top 10,000 are the customers most certain to leave, and many of them are leaving no matter what you send. You spend the entire budget on people the offer cannot save, plus people who were never going anywhere.

- What you actually want: customers who stay **because of** the offer.
- That is not a classification quality question at all. It is an **incremental value** question.`,
    },
    {
      type: 'math',
      intro: 'The uplift — the extra chance of staying that the offer itself causes — is what you want to rank by.',
      latex: [
        '\\tau(x) = P(\\text{stay} \\mid x, \\text{offer}) - P(\\text{stay} \\mid x, \\text{no offer})',
        '\\text{Rank by } \\tau(x), \\text{ not by } P(\\text{churn} \\mid x); \\text{ spend the budget on the top } k \\text{ by } \\tau',
        '\\text{Value} = \\sum_{i \\in \\text{top-}k} \\big(\\tau(x_i) \\cdot LTV_i - \\text{cost}_i\\big)',
      ],
    },
    {
      type: 'note',
      md: `**Uplift modelling, in plain words.** "Uplift" means the change the offer *causes*, not the risk the customer already carries. Split customers into four groups by what the offer does: *persuadables* (stay only if offered — the only ones worth money), *sure things* (stay either way, so the offer is pure discount leakage), *lost causes* (leave either way, so it is wasted postage), and *sleeping dogs* (the offer reminds them they were thinking of leaving, and they churn *because* you mailed them — this is real and measurable). A churn classifier ranks by P(churn), which mostly surfaces lost causes and sleeping dogs. An uplift model ranks by the *difference* in outcome between treated and untreated customers.

- The catch you must say out loud: the uplift of one individual is never observed, because you see one arm and never both. So uplift needs **randomized holdout data** — mail a random subset, deliberately withhold from a random control, and keep doing it forever.
- The simplest honest build is the **two-model approach**, often called a T-learner, T for "two": fit one model on the mailed customers, fit a second on the withheld ones, and subtract the two predictions. It is noisy, because you are subtracting two estimates, but it is understandable and it ships.
- Evaluate with an **uplift curve**, also called a Qini curve: plot extra customers retained against how many you treated. Not AUC, not F1.
- The budget still binds, so it is precision@k again, just on a different score.`,
    },
    {
      type: 'intuition',
      title: 'Goodhart\'s law: the metric will be gamed, including by your own model',
      md: `*"When a measure becomes a target, it ceases to be a good measure."* Charles Goodhart said it about monetary policy. It is the central occupational hazard of ML.

- **Example 1 — the ranking model that learned clickbait.** Target: click-through rate. The model found that sensational, misleading titles get clicked. CTR up 12%, session length down, complaints up, one-year retention down. The metric was honest; it just was not the goal.
- **Example 2 — the support-ticket classifier judged on resolution time.** Target: mean time to close. The model routed hard tickets to a queue that auto-closed them as "no response from customer". Mean time to close fell 40%. Re-open rate doubled. Nobody lied; the measure just stopped measuring.
- The pattern in both: the metric was a **proxy** for something unmeasurable (satisfaction, help), and optimization pressure found the gap between proxy and goal.
- The gap is always there. Optimization pressure always finds it. Assume this; do not hope against it.`,
    },
    {
      type: 'note',
      md: `Three defences, and they are cheap. **(1) Guardrail metrics.** Declare, before the experiment, a small set of metrics that must not degrade — retention, complaint rate, latency, revenue, fairness gaps across segments. The primary metric can rise; if a guardrail falls, you do not ship. **(2) Always report a baseline.** Majority class for classification, "predict the mean" or last-value for regression, "most popular" or "recent" for ranking, "do nothing" for any intervention. A metric with no baseline is a number with no meaning, and the do-nothing baseline is exactly what exposed the 99%-accuracy fraud model. **(3) Re-derive the metric when the product changes.** A metric chosen for last year's decision quietly stops matching this year's, and nobody notices because the dashboard still renders.`,
    },
    {
      type: 'intuition',
      title: 'The sentence to end on',
      md: `Everything in this module compresses to one habit. Before you say a number, say the argument the number encodes.

- "Accuracy 0.98" says nothing. "We catch 45 of 50 frauds at 15 false alarms a day, against a do-nothing baseline of 0.95 accuracy, with the queue capped at analyst capacity" says everything.
- The drill is the argument: decision, costs, rarity, output type, operating point.
- If you cannot name what each error costs, you are not ready to choose a metric, and saying *that* out loud is a better answer than guessing.
- **A metric is an argument about what matters. Say the argument out loud before you say the number.**`,
    },
  ],
  quiz: [
    {
      question: 'From TP=45, FP=15, FN=5, TN=935: which pair of numbers is correct?',
      options: [
        { text: 'precision 0.90, recall 0.75', explanation: 'Swapped. Precision divides by predicted positives (60), recall by actual positives (50).' },
        { text: 'precision 0.75, recall 0.90', explanation: 'Correct. 45/(45+15) = 0.75 and 45/(45+5) = 0.90. The denominators are the tell: FP for precision, FN for recall.' },
        { text: 'precision 0.75, recall 0.98', explanation: '0.98 is specificity (935/950) or accuracy (980/1000). Both are dominated by the huge TN cell, which recall never touches.' },
      ],
      correct: 1,
    },
    {
      question: 'Your fraud model has PR-AUC 0.33 and a review team that can process 200 alerts a day. An expected-cost sweep says the optimal threshold generates 4,282 alerts. What do you deploy?',
      options: [
        { text: 'Top 200 by score — the capacity constraint binds tighter than the cost optimum', explanation: 'Correct. Both constraints are real; you operate at whichever binds first. Then quantify what the other 4,082 alerts would have been worth: that is the business case for more headcount.' },
        { text: 'The cost-optimal threshold — cost is the true objective', explanation: 'It is the true objective, but the cost model assumed every alert gets reviewed. Fire 4,282 alerts at a 200-capacity team and most are never worked, so the assumed benefit never arrives.' },
        { text: 'Threshold 0.5, since it is the calibrated default', explanation: '0.5 is optimal only for balanced classes with equal error costs. Here it produces 27 alerts and misses 136 of 160 frauds, wasting 173 slots of available capacity.' },
      ],
      correct: 0,
    },
    {
      question: 'Two fraud models: identical accuracy (0.998) and identical ROC-AUC (0.914), but PR-AUC 0.334 vs 0.239. What does that tell you?',
      options: [
        { text: 'One of the metrics was computed incorrectly', explanation: 'All three are consistent. This divergence is expected at a 0.2% positive rate and is the whole reason PR-AUC exists.' },
        { text: 'The models are equivalent; PR-AUC is just noisier', explanation: 'The difference is real, not noise: at the same top-200 cut one catches 65 frauds and the other 48.' },
        { text: 'Accuracy and ROC-AUC are both dominated by the 99.8% negative class; PR-AUC is the only one measuring the ranking where it matters', explanation: 'Correct. Accuracy is TN-dominated, and ROC-AUC uses FPR = FP/(FP+TN) with an enormous TN, so thousands of false alarms barely move it. Precision has only flagged rows in its denominator.' },
      ],
      correct: 2,
    },
    {
      question: 'A cancer-screening model must not miss tumours. Which framing is the strong answer?',
      options: [
        { text: 'Maximize recall — nothing else matters when lives are at stake', explanation: 'Threshold 0 gives recall 1.0 by biopsying everyone. Unbounded recall creates overdiagnosis, overtreatment, anxiety and capacity collapse.' },
        { text: 'Set recall as a hard constraint (at least 0.98) and maximize precision subject to it, reporting calibration too', explanation: 'Correct. The clinical floor is non-negotiable, and among models that clear it you take the fewest false positives. Calibration matters separately because a doctor reads the probability itself.' },
        { text: 'Maximize F1 — it balances both concerns', explanation: 'F1 weights precision and recall equally, which is a claim that a missed cancer costs the same as one extra scan. False on its face.' },
      ],
      correct: 1,
    },
    {
      question: 'A telco has budget to mail 10,000 retention offers. You rank customers by predicted churn probability and take the top 10,000. What is wrong?',
      options: [
        { text: 'Nothing — highest churn risk is exactly who to save', explanation: 'This is the intuitive answer and it is the trap. The highest-risk customers include many who will leave regardless, so the money is burned.' },
        { text: 'You should rank by uplift, P(stay | offer) minus P(stay | no offer), because the budget should go to customers who stay because of the offer', explanation: 'Correct. Churn probability finds lost causes and sleeping dogs; uplift finds persuadables. It needs a randomized control arm to estimate, which is the price of getting this right.' },
        { text: 'You should use recall instead, to make sure no churner is missed', explanation: 'Recall ignores the budget entirely. With a fixed 10,000-offer cap the metric is necessarily a top-k metric; the open question is what to rank by.' },
      ],
      correct: 1,
    },
    {
      question: 'A support-ticket model cut mean time-to-close by 40% by routing hard tickets to a queue that auto-closed them as "no customer response". Re-open rate doubled. Which lesson does this illustrate?',
      options: [
        { text: 'Goodhart\'s law — time-to-close was a proxy for "helped the customer", and optimization pressure found the gap between proxy and goal', explanation: 'Correct. The metric stayed honest; it stopped measuring the thing it stood for. The fix is a primary metric plus declared guardrails such as re-open rate.' },
        { text: 'The model overfit the training data', explanation: 'Overfitting means failing to generalize. This model generalized perfectly, to the wrong objective. A specification failure, not a fitting failure.' },
        { text: 'Time-to-close should have been measured on a held-out set', explanation: 'Held-out evaluation would have reported the same 40% improvement. Clean methodology cannot save a metric that does not encode the goal.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: '"My model has 99% accuracy but it is useless." Why, and what would you report instead?',
      answer:
        'Because accuracy counts every row equally while the class I care about is 1% of them. A model that always predicts the majority class already scores 99%, so accuracy cannot tell a real model from no model at all. I would always report the majority-class baseline next to any accuracy figure. Instead I would report the confusion matrix in words ("caught 45 of 50 frauds at 15 false alarms"), precision and recall separately, F-beta with a beta justified by the cost ratio, PR-AUC for threshold-free model comparison, and MCC if someone insists on one summary number, because MCC is 0 for any constant predictor, which is exactly the failure accuracy hides. The cost of getting this wrong is shipping something that costs money to run and catches nothing.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through your framework for choosing a metric on a problem you have never seen.',
      answer:
        'Five steps, in order. (1) What decision does the output drive, who acts, and how? (2) What does a false negative cost and what does a false positive cost, in the same units? (3) Is the positive class rare — if yes, accuracy and ROC-AUC are out. (4) Is the output a ranking, a number, or a decision? That picks the family: NDCG or precision@k, MSE and MAE plus calibration, or the confusion-matrix family. (5) What operating point follows: a threshold from expected cost, a top-k from capacity, or a hard constraint with the other metric maximized under it. Steps 1 and 2 carry the weight; the rest is bookkeeping. If I am not given costs, I assume some out loud and name the sensitivity: "assume a miss costs 200x a false alarm; if that ratio flips, my answer flips."',
      isCaseBased: false,
    },
    {
      question: 'Case: design the metric for a fraud detection system at a bank. Take me all the way to what you would put on the dashboard.',
      answer:
        'Decision: hold the transaction and queue it for a human analyst, and the team can work about 200 alerts a day. Costs: a miss refunds roughly ₹8,000; a false alarm costs about four minutes of analyst time (~₹40) plus customer trust, a ratio near 200:1. The positive rate is 0.2%, so accuracy is dead (always-negative scores 99.8%) and ROC-AUC is nearly dead, because its FPR denominator is the huge negative class — two models that differ by 35% in fraud caught can share the same ROC-AUC to three decimals. Model selection: PR-AUC. Operating point: sweep expected cost C_FN·FN + C_FP·FP, then check the implied alert volume. In a real run the cost optimum wanted 4,282 alerts against 200 of capacity, so capacity binds and the operating metric is precision@200. Dashboard: alerts per day, precision@k on reviewed alerts, frauds caught against estimated total, rupees saved net of review cost, and the score distribution over time for drift. Caveats to state: chargeback labels lag 30 to 90 days, so recall is always a quarter behind, and you only get labels for what the queue reviewed, which biases tomorrow\'s training set.',
      isCaseBased: true,
    },
    {
      question: 'Case: a medical screening model. The clinical lead says "just maximize recall". How do you respond?',
      answer:
        'Agree with the direction and refuse the unbounded version, because recall 1.0 is achievable by recommending a biopsy for everyone. Reframe as a constrained optimization: recall at least 0.98 as a clinical floor set by them, and among models that clear it, take the highest precision. Justify with the second-order harms: anxiety from false-positive recalls, overdiagnosis and overtreatment of slow tumours that would never have caused harm, scanner slots taken from symptomatic patients, and the trust erosion that makes a low-precision programme get ignored entirely. Then add two things they will care about. Calibration, because clinicians read the probability itself and a model can rank perfectly while its probabilities are systematically inflated — report the Brier score and a reliability diagram, fix with isotonic or Platt scaling, and note that class weighting decalibrates on purpose. And the two-stage design, where a cheap high-recall screen with 5 to 10% precision feeds an expensive confirmatory test, which is what makes a 0.98 recall floor affordable and turns stage one\'s real metric into "recall at a volume stage two can absorb".',
      isCaseBased: true,
    },
    {
      question: 'Why is MCC a better single summary than F1 on an imbalanced binary problem?',
      answer:
        'MCC = (TP·TN − FP·FN) divided by the square root of (TP+FP)(TP+FN)(TN+FP)(TN+FN) — the correlation between predicted and true labels. It uses all four cells and normalizes by both the row and the column totals, so a skewed base rate cannot inflate it: a constant predictor scores exactly 0, random guessing 0, perfect inversion −1. On our worked matrix the always-negative baseline gets accuracy 0.950, F1 0.000, balanced accuracy 0.500 and MCC 0.000, while the real model gets 0.980 / 0.818 / 0.942 / 0.811. F1 ignores TN entirely and fixes the precision-recall trade-off at "equal" with no justification. The caveat I would add: MCC compares models, it does not operate one. It cannot tell an analyst how many alerts arrive tomorrow, so I would show the four raw cells beside it.',
      isCaseBased: false,
    },
    {
      question: 'Case: your ranking model improves NDCG@10 by 4% offline. The A/B test shows engagement flat and abandonment up. What is going on?',
      answer:
        'Offline and online measure different things, and I would go in this order. (1) Label mismatch: NDCG scores against paid raters\' idea of relevance, and raters reward topical correctness while users reward usefulness, freshness and trust. (2) Exposure bias: offline evaluation only sees documents the old model surfaced, so a model that promotes never-before-shown documents is scored against labels that do not exist, usually pessimistically. (3) Presentation effects: the ranking changed, but so did snippets, thumbnails or the mix of verticals, and users react to the page rather than to the ranked list. (4) Slice mismatch: NDCG may have improved on the head queries that dominate the rated set while regressing on the tail that dominates traffic, so check per segment. (5) Novelty effects: a reordering costs users their learned muscle memory and short-term engagement dips before recovering, so check how long the test ran. Decision: the A/B test wins. Offline metrics buy iteration speed, not shipping decisions. If abandonment is up, do not ship, and use the disagreement to fix the offline proxy, because that disagreement is information about the evaluation set rather than about the users.',
      isCaseBased: true,
    },
    {
      question: 'What are guardrail metrics, and how do you choose them?',
      answer:
        'Guardrails are metrics declared before an experiment that must not degrade, whatever the primary metric does. Choose them by asking what the primary metric could destroy if it were gamed: for an engagement primary, guardrail long-run retention, complaint rate and content-quality signals; for a latency or cost primary, guardrail quality and error rate; for any personalization primary, guardrail fairness gaps across segments you would be embarrassed to regress. Guardrail the operational realities too — alert volume against team capacity, inference cost, p99 latency. Two rules make them work: declare them upfront with thresholds, so nobody renegotiates after seeing results, and keep the list short, because a dozen guardrails on noisy data guarantees a false alarm every experiment. The purpose is not to catch every possible harm; it is to make the failure mode you can already predict impossible to ship past.',
      isCaseBased: false,
    },
    {
      question: 'Case: you inherit a churn model with ROC-AUC 0.83. Retention campaigns using it have shown no measurable lift for two quarters. Diagnose.',
      answer:
        'ROC-AUC 0.83 says the model ranks churners above non-churners; it says nothing about whether an offer changes anyone\'s behaviour, and that is my leading hypothesis. The campaign targets high P(churn), which surfaces lost causes (leaving regardless, so the offer is wasted) and sure things (staying regardless, so the offer is a pure giveaway), while the persuadables sit in the middle of the ranking. The fix is to rank by uplift — the extra chance of staying that the offer itself causes, P(stay | offer) minus P(stay | no offer) — which requires a randomized control arm: mail a random subset, deliberately withhold from a random control, permanently, and evaluate with an uplift (Qini) curve rather than AUC. Cheaper hypotheses worth checking first: (1) is there a control group at all — "no measurable lift" often means "no way to measure lift"; (2) sleeping dogs, where the offer actively reminds people to leave, which shows up as negative uplift in a segment; (3) timing, where the model flags customers after the decision to leave is already made; (4) the offer may simply be too weak, in which case no targeting model saves it. Business framing: the deliverable is incremental retained value per rupee spent, not classification quality.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'The five-step metric drill', back: '1. What decision? 2. What does each error cost? 3. Is the positive class rare? 4. Ranking / number / decision? 5. What operating point follows? Steps 1 and 2 do the work.' },
    { front: 'F-beta in one line', back: 'F_beta = (1+beta²)·PR/(beta²P + R). Beta = how many times more you value recall. beta=2 for screening, beta=0.5 for spam, beta=1 only if the costs are truly equal.' },
    { front: 'MCC formula and why it is honest', back: '(TP·TN − FP·FN) over sqrt((TP+FP)(TP+FN)(TN+FP)(TN+FN)). Uses all four cells, normalized both ways. Constant predictor = 0, random = 0, inverted = −1.' },
    { front: 'Worked matrix to memorize', back: 'TP45 FP15 FN5 TN935 gives acc .980, prec .750, rec .900, spec .984, FPR .016, F1 .818, F2 .865, F0.5 .776, balacc .942, MCC .811. Baseline acc = .950.' },
    { front: 'Why ROC-AUC misleads at 0.2% positives', back: 'FPR = FP/(FP+TN) with a giant TN, so thousands of false alarms barely move it. Two models can tie at ROC-AUC 0.914 while one catches 35% more fraud at the same k.' },
    { front: 'Medical screening: the right framing', back: 'NOT "maximize recall" (threshold 0 gives 1.0). Recall at least 0.98 as a hard floor, maximize precision under it. Calibration matters — a doctor reads the probability.' },
    { front: 'Search ranking: offline vs online', back: 'NDCG@10 offline to iterate (graded relevance, 1/log2(i+1) position discount, normalized by the ideal ordering). Ship on an online A/B test with guardrails.' },
    { front: 'Uplift vs churn probability', back: 'Uplift = P(stay|offer) − P(stay|no offer): the change the offer causes. Rank by it, not by P(churn), or the budget buys lost causes and sure things. Needs a randomized control arm; evaluate with an uplift (Qini) curve.' },
  ],
  mindmapMarkdown: `- Pick the Metric: Case Studies That Decide the Interview
  - The five-step drill
    - What decision does it drive?
    - What does each error cost?
    - Is the positive class rare?
    - Ranking, number, or decision?
    - What operating point follows?
  - By-hand exercise (TP45 FP15 FN5 TN935)
    - accuracy .980 vs baseline .950
    - precision .750 / recall .900
    - specificity .984 / FPR .016
    - F1 .818, F2 .865, F0.5 .776
    - balanced accuracy .942
    - MCC .811 — all four cells, constant predictor = 0
  - Case: fraud (0.2% positives)
    - accuracy and ROC-AUC both tie useless models
    - PR-AUC to compare (.334 vs .239)
    - precision@k, k = review capacity
    - threshold by expected cost C_FN·FN + C_FP·FP
    - capacity binds before cost optimum
    - drift + 30 to 90 day label lag
  - Case: medical screening
    - recall at least 0.98 as a hard floor
    - then maximize precision under it
    - second-order harms: anxiety, overdiagnosis, capacity
    - calibration: Brier, reliability diagram
    - two-stage screen: cheap high-recall then confirmatory
  - Case: search ranking
    - graded relevance, position matters
    - NDCG@10 offline (2^rel−1 over log2(i+1))
    - online A/B on engagement decides
    - proxy trap: clicks yield clickbait
  - Case: churn with a retention budget
    - not classification quality — incremental value
    - uplift = P(stay|offer) − P(stay|no offer)
    - persuadables / sure things / lost causes / sleeping dogs
    - needs randomized control; uplift (Qini) curve
    - budget cap makes it precision@k again
  - Metric gaming
    - Goodhart's law
    - CTR to clickbait
    - time-to-close to auto-closed tickets
    - guardrail metrics declared upfront
    - always report a baseline
  - Closing line
    - a metric is an argument about what matters
    - say the argument before the number`,
}

export default m
