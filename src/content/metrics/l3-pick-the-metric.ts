import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l3-pick-the-metric',
  subjectId: 'metrics',
  level: 3,
  title: 'Pick the Metric: Case Studies That Decide the Interview',
  whyItMatters:
    'Knowing what F1 means gets you past a screen. Choosing the metric for a real problem — and defending the choice against a PM who wants a different number — is the senior signal. This module is the capstone: one confusion matrix computed by hand end to end, then four case studies (fraud, medical screening, search ranking, churn) run through the same five-step drill, plus the trap that ruins teams who optimize the number instead of the outcome.',
  estMinutes: 50,
  sections: [
    {
      type: 'intuition',
      title: 'A metric is an argument, not a number',
      md: `Two candidates get the same fraud problem. One says "I'd use F1." The other says "a missed fraud costs us the transaction, a false alarm costs an analyst four minutes, and we have 200 analyst-slots a day — so I'd rank by score and measure precision@200."

- Same knowledge of formulas. Completely different hire signal.
- The first answer picked a metric. The second answer made an **argument** about what matters, and the metric fell out of it.
- Every metric hides an assumption. F1 assumes a miss and a false alarm cost the same. Accuracy assumes every row is equally interesting. ROC-AUC assumes you care about the negative class.
- The interview is never "do you know the formula". It is "can you name the assumption and say whether it holds here".
- So: never state a metric without first stating the decision and the cost.`,
    },
    {
      type: 'intuition',
      title: 'The five-step drill',
      md: `Run this out loud, in order, on every problem you are handed. It takes ninety seconds and it produces the answer.

1. **What decision does this model drive?** Someone acts on the output — blocks a card, orders a biopsy, reorders a page, mails a coupon. Name the action.
2. **What does each error type cost?** A false negative and a false positive, in the same units — money, harm, trust, wasted human hours.
3. **Is the positive class rare?** If yes, accuracy and ROC-AUC are out; precision-side metrics and PR-AUC are in.
4. **Is the output a ranking, a number, or a decision?** Ranking → NDCG / precision@k / MAP. Number → MSE / MAE / calibration. Decision → confusion-matrix family at a chosen threshold.
5. **What operating point follows?** A threshold from expected cost, a top-k from a capacity limit, or a hard constraint ("recall ≥ 0.98") with the other metric maximized under it.

Steps 1 and 2 do the real work. Steps 3–5 are bookkeeping once you have them.`,
    },
    {
      type: 'note',
      md: `The drill also protects you from the most common interview failure: answering too fast. When asked "which metric for X?", the strong move is to *ask* — "what happens when the model says yes, and who pays when it is wrong?" — and only then answer. If the interviewer will not give you costs, invent plausible ones out loud and say so: *"assume a miss costs about 200x a false alarm; if that ratio flips, my answer flips too."* Naming the sensitivity of your answer is worth more than the answer.`,
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
- **FPR** = 15 / 950 = **0.0158** = 1 − 0.9842. The x-axis of the ROC curve.
- **F1** = 2(0.75)(0.90) / (0.75 + 0.90) = 1.350 / 1.650 = **0.8182**. Harmonic mean — sits nearer the *worse* of the pair.
- **F2** (β = 2, recall counts 4x) = 5(0.75)(0.90) / (4·0.75 + 0.90) = 3.375 / 3.900 = **0.8654**. Higher than F1, because recall is our strong side.
- **F0.5** (β = 0.5, precision favoured) = 1.25(0.75)(0.90) / (0.25·0.75 + 0.90) = 0.84375 / 1.0875 = **0.7759**. Lower — precision is our weak side.
- **Balanced accuracy** = (0.9000 + 0.9842) / 2 = **0.9421**. Accuracy if both classes were the same size.
- **MCC** = (45·935 − 15·5) / √(60 · 50 · 950 · 940) = (42,075 − 75) / √2,679,000,000 = 42,000 / 51,759.1 = **0.8115**.`,
    },
    {
      type: 'note',
      md: `**Why MCC is the most honest single number for imbalanced binary problems.** It is the only one of these that uses all four cells *and* normalizes by both row and column totals — it is literally the correlation coefficient between predicted and true labels. Consequences: a constant predictor scores exactly **0**, no matter how skewed the classes (our always-negative baseline gets accuracy 0.950, F1 0.000, balanced accuracy 0.500, MCC 0.000); random guessing scores 0; perfect inversion scores −1. F1 ignores TN entirely and rewards you for guessing positive a lot; accuracy is dominated by TN. MCC cannot be gamed by either. Use it as the *summary* number when someone demands one — then immediately show the raw four cells, because "caught 45 of 50 frauds at 15 false alarms" is what a human can act on.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Verify all ten by hand-check against sklearn',
      code: `import numpy as np
from sklearn.metrics import (accuracy_score, precision_score, recall_score, fbeta_score,
                             balanced_accuracy_score, matthews_corrcoef)

TP, FP, FN, TN = 45, 15, 5, 935
y_true = np.r_[np.ones(TP + FN), np.zeros(FP + TN)]        # 50 positives, 950 negatives
y_pred = np.r_[np.ones(TP), np.zeros(FN), np.ones(FP), np.zeros(TN)]

print('accuracy    %.4f' % accuracy_score(y_true, y_pred))
print('precision   %.4f' % precision_score(y_true, y_pred))
print('recall      %.4f' % recall_score(y_true, y_pred))
print('specificity %.4f' % (TN / (TN + FP)))
print('FPR         %.4f' % (FP / (FP + TN)))
for b in (1, 2, 0.5):
    print('F%-11s%.4f' % (b, fbeta_score(y_true, y_pred, beta=b)))
print('bal acc     %.4f' % balanced_accuracy_score(y_true, y_pred))
print('MCC         %.4f' % matthews_corrcoef(y_true, y_pred))

# ---- real output ----
# accuracy    0.9800
# precision   0.7500
# recall      0.9000
# specificity 0.9842
# FPR         0.0158
# F1          0.8182
# F2          0.8654
# F0.5        0.7759
# bal acc     0.9421
# MCC         0.8115`,
      annotations: {
        6: 'Rebuild label vectors from the four counts — the order does not matter, only how many of each pair (truth, prediction) exist.',
        12: 'sklearn has no specificity function. It is recall of the negative class; compute it from the cells or call recall_score with pos_label=0.',
        14: 'One loop gives F1, F2 and F0.5. Same formula, one knob: beta is how many times more you value recall than precision.',
        17: 'MCC in one call. Notice it is the only line here that could not be fooled by a model that always answers "not fraud".',
      },
    },
    { type: 'visual', component: 'ConfusionMatrixLab', props: {} },
    {
      type: 'note',
      md: `Use the lab as the companion to the arithmetic above. It holds 50 scored items — 25 positive, 25 negative — and every drag re-cuts the four cells live. Three things to actually *do* with it: **(1)** Drag until precision reads about 0.75 and watch recall, F1 and accuracy move together — you cannot change one cell in isolation, which is the whole lesson. **(2)** Drag to the extremes: at threshold 0 you predict everything positive (recall 1.0, precision = the base rate), at threshold 1 you predict nothing (precision undefined, recall 0). Both are useless models with a perfect score on one metric. **(3)** Hit *Sweep 1→0* and watch the ROC curve draw itself — each point on that curve is one confusion matrix. A curve is not a metric; it is the set of all the operating points you could choose. Choosing one is your job, and the rest of this module is how.`,
    },
    {
      type: 'intuition',
      title: 'Case 1 — fraud detection: run the drill',
      md: `Card fraud. 0.2% of transactions are fraudulent. The bank has a review team that can work 200 alerts a day, no more.

1. **Decision**: hold the transaction and send it to a human analyst. Not "block forever" — queue for review.
2. **Costs**: a miss costs the transaction value the bank refunds — call it ₹8,000 average. A false alarm costs an analyst ~4 minutes (~₹40) plus a slice of customer trust. Ratio roughly **200 : 1** in favour of catching fraud.
3. **Rare?** Brutally — 2 in 1,000. Accuracy is dead on arrival; so is ROC-AUC (its FPR denominator is the 99.8% negative class, so ten thousand new false alarms barely move it).
4. **Ranking, number, or decision?** It looks like a decision but it is really a **ranking** — the queue is sorted by score and worked from the top down.
5. **Operating point**: the queue has a fixed length. That length, not 0.5, is the threshold.

The answer, in one breath: *compare models on PR-AUC, operate on precision@k with k = daily review capacity, sanity-check the threshold against expected cost, and monitor score drift weekly.*`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Why accuracy and ROC-AUC would have shipped the worse model',
      code: `import numpy as np
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, average_precision_score, accuracy_score

X, y = make_classification(n_samples=200000, n_features=12, n_informative=6, n_redundant=0,
                           n_clusters_per_class=1, weights=[0.998], flip_y=0.0,
                           class_sep=0.9, random_state=0)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.4, stratify=y, random_state=0)
sA = LogisticRegression(max_iter=2000).fit(Xtr, ytr).predict_proba(Xte)[:, 1]
z = np.log(sA / (1 - sA)) + np.random.default_rng(0).standard_normal(len(sA))
sB = 1 / (1 + np.exp(-z))                  # model B: same ranker, noisier scores

print('frauds=%d/%d (%.2f%%)  always-negative accuracy=%.4f'
      % (yte.sum(), len(yte), 100 * yte.mean(), accuracy_score(yte, np.zeros_like(yte))))
K = 200                                    # analysts review 200 alerts per batch
for name, s in (('A', sA), ('B', sB)):
    top = yte[np.argsort(-s)[:K]]
    print('model %s  acc@0.5=%.4f  ROC-AUC=%.3f  PR-AUC=%.3f  prec@%d=%.3f  caught=%d'
          % (name, accuracy_score(yte, s >= 0.5), roc_auc_score(yte, s),
             average_precision_score(yte, s), K, top.mean(), int(top.sum())))

# ---- real output ----
# frauds=160/80000 (0.20%)  always-negative accuracy=0.9980
# model A  acc@0.5=0.9983  ROC-AUC=0.914  PR-AUC=0.334  prec@200=0.325  caught=65
# model B  acc@0.5=0.9981  ROC-AUC=0.914  PR-AUC=0.239  prec@200=0.240  caught=48`,
      annotations: {
        8: 'weights=[0.998] is the realistic fraud shape: 0.2% positives, 160 frauds in an 80,000-row test set.',
        13: 'Model B is model A with noise injected into the log-odds — a stand-in for a genuinely sloppier ranker, built this way so the two differ only in ranking quality.',
        19: 'precision@k in one line: sort by score descending, take the top k, average the labels. That is the metric the review team lives inside.',
        27: 'Read the two result lines side by side. Accuracy: 0.9983 vs 0.9981 — indistinguishable, and both below the 0.9980 do-nothing baseline in any meaningful sense. ROC-AUC: 0.914 vs 0.914 — literally identical to three decimals. PR-AUC: 0.334 vs 0.239. precision@200: 0.325 vs 0.240 — the same analyst hours catch 65 frauds instead of 48. Ship on accuracy or ROC-AUC and you flip a coin; ship on PR-AUC and you catch 35% more fraud.',
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
      title: 'Expected-cost threshold vs the review queue that actually exists',
      code: `import numpy as np
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

C_FN, C_FP = 8000, 40          # rupees: a refunded fraud vs one analyst review
X, y = make_classification(n_samples=200000, n_features=12, n_informative=6, n_redundant=0,
                           n_clusters_per_class=1, weights=[0.998], flip_y=0.0,
                           class_sep=0.9, random_state=0)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.4, stratify=y, random_state=0)
s = LogisticRegression(max_iter=2000).fit(Xtr, ytr).predict_proba(Xte)[:, 1]

print(' thr  alerts caught missed      cost')
for t in (0.5, 0.05, 0.01, 0.005, 0.002, 0.001):
    tp = int(((s >= t) & (yte == 1)).sum())
    alerts, missed = int((s >= t).sum()), int(yte.sum()) - tp
    print('%.3f %7d %6d %6d %9d' % (t, alerts, tp, missed, C_FN * missed + C_FP * alerts))
top = yte[np.argsort(-s)[:200]]            # what the review team can actually process
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
        6: 'The two numbers that decide everything. Get them from the business, not from a paper. If nobody knows them, that conversation is the deliverable.',
        14: 'Sweeping thresholds, not maximizing F1. F1 would silently assume C_FN = C_FP — here they differ by 200x.',
        18: 'The queue is a hard constraint the cost formula knows nothing about. Sorting by score and cutting at k is the same as a threshold — just one chosen by headcount.',
        27: 'The cost minimum sits near t = 0.005: cost 491,280, down 55% from the default 0.5 threshold. Moving one number beat any amount of extra modelling.',
        30: 'And here is the reality check: the cost-optimal point wants 4,282 reviews; the team can do 200. Capacity binds first, so precision@200 is the metric you actually manage, and "hire more analysts" becomes a modelling-adjacent business decision you can now quantify.',
      },
    },
    {
      type: 'note',
      md: `Two things that finish the fraud answer and almost nobody says. **Drift**: fraud is adversarial — patterns change on purpose, so a threshold calibrated in March has different precision in June. Monitor the *score distribution* and the alert rate daily; a drifting alert volume is visible long before labels arrive. **Label lag**: chargebacks land 30–90 days late, so today's recall is unmeasurable today. Track leading indicators (alert rate, precision on the reviewed subset) and accept that the full metric is always a quarter behind. Also note the sampling bias this creates: you only ever learn labels for what the queue reviewed, so tomorrow's training data is shaped by today's threshold.`,
    },
    {
      type: 'intuition',
      title: 'Case 2 — medical screening: run the drill',
      md: `A model reads mammograms and flags patients for follow-up imaging. 0.5% of the screened population has cancer.

1. **Decision**: order a second, more invasive test. Not "diagnose cancer" — nobody is treated on a model's say-so.
2. **Costs**: a false negative can be a death, or a stage-1 tumour becoming stage-3. A false positive is one more scan. Wildly asymmetric — but *not infinitely* so, and that "but" is the whole interview.
3. **Rare?** Yes, 1 in 200. Accuracy is meaningless.
4. **Ranking, number, or decision?** A **calibrated number**, then a decision. Radiologists read the probability and combine it with what they see; a score of "0.7" must actually mean 70% of such patients have cancer, or their judgement is corrupted.
5. **Operating point**: a hard constraint, not an optimum — **recall ≥ 0.98**, then maximize precision subject to it.

The answer, in one breath: *recall as a floor set by clinicians, precision maximized under that floor, calibration reported alongside, and a two-stage screen so the floor is affordable.*`,
    },
    {
      type: 'note',
      md: `**Why "just maximize recall" is the junior answer.** Set the threshold to zero and recall is a perfect 1.0 — you have recommended a biopsy for everyone, which is not a screening programme, it is a harm-delivery system. The second-order costs are real and measured: **anxiety** (false-positive recalls cause months of documented distress), **overdiagnosis and overtreatment** (screening finds indolent tumours that would never have harmed anyone, and those patients still get surgery and radiation — this is the single biggest live controversy in cancer screening), **cost and capacity** (every false positive consumes a scanner slot a symptomatic patient needed), and **erosion of trust** (a programme with 20% precision gets ignored, and then it catches nothing). So the honest framing is a *constrained optimization*: recall ≥ 0.98 is the clinical floor; among the models that clear it, take the one with the best precision. That framing — floor plus optimize — is also how you answer any "but isn't recall all that matters?" follow-up.`,
    },
    {
      type: 'note',
      md: `**Calibration is a separate axis from ranking, and screening is where that bites.** A model can have excellent ROC-AUC (it ranks sick above healthy) while its probabilities are systematically inflated — every output reads 0.8 when the true rate is 0.3. Ranking metrics literally cannot see this: any monotone squashing of the scores leaves AUC unchanged. Report **Brier score** (mean squared error of probabilities) and a **reliability diagram** (bucket predictions, plot predicted vs observed frequency); fix with Platt scaling or isotonic regression on a held-out set. And remember from imbalance: class weights and resampling *decalibrate* on purpose, so if a human reads the number, prefer threshold moving and recalibrate afterwards. Deployment reality: real programmes are **two-stage** — a cheap high-recall screen (accept precision as low as 5–10%) feeding an expensive high-precision confirmatory test. The cheap stage is allowed a terrible precision because the expensive stage cleans up; the metric for stage one is recall at a *volume* the stage-two capacity can absorb. That is precision@k wearing a lab coat.`,
    },
    {
      type: 'intuition',
      title: 'Case 3 — search ranking: run the drill',
      md: `A query returns ten results. The model decides the order.

1. **Decision**: which document goes in slot 1, 2, 3. Nothing is "classified" at all.
2. **Costs**: there is no false positive or false negative — there is a *good result buried at rank 8*, which costs the user scrolling, and a *bad result at rank 1*, which costs the session.
3. **Rare?** Wrong question. Relevance here is **graded**, not binary: perfect / good / okay / irrelevant, usually 0–3 from human raters.
4. **Ranking, number, or decision?** Pure ranking, and **position matters** — a win at rank 1 is worth far more than the same win at rank 9.
5. **Operating point**: there isn't a threshold. There is a cut-off — the ten slots on the page.

The answer, in one breath: *NDCG@10 on a human-rated set to iterate offline, then an online A/B test on real engagement with guardrails, because offline and online disagree more often than anyone admits.*`,
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
      md: `Two things NDCG buys you and one thing it cannot. It **grades** relevance (the 2^rel − 1 numerator means a "perfect" result is worth 7 and an "okay" one 1, not both just "relevant"), and it **discounts by position**, so moving a good result from rank 8 to rank 1 raises the score by roughly 3.2x. Normalizing by the ideal ordering makes an easy query with four perfect answers comparable to a hard one with none. What it cannot do: tell you whether users will actually be happier. Offline NDCG is computed against *rater* labels, on *logged* queries, under the *old* model's exposure — three biases stacked. So NDCG@10 is the iteration metric, and the decision metric is an online A/B test.`,
    },
    {
      type: 'note',
      md: `**The proxy-metric trap, and this is where it was invented.** You cannot measure "user satisfaction", so you measure clicks. Optimize clicks hard enough and the system learns the fastest route to a click: clickbait titles, outrage, thumbnails that misrepresent, and results that are interesting rather than correct. The metric goes up. The product gets worse. The fix is not a cleverer single metric — it is a **primary metric plus guardrails**: optimize long-dwell clicks or successful sessions (a click followed by 30+ seconds and no immediate re-query), and simultaneously *hold the line* on abandonment rate, query reformulation rate, complaint rate, latency, and long-run retention. Ship only if the primary metric rises and no guardrail degrades. Name this structure in an interview — "primary metric, guardrail metrics, and I refuse to ship on the primary alone" — and you have said the thing senior engineers say.`,
    },
    {
      type: 'intuition',
      title: 'Case 4 — churn with a retention budget: the one that separates seniors',
      md: `A telco can afford to send a ₹500 retention offer to 10,000 of its 2,000,000 customers this month. Build the model.

1. **Decision**: mail an offer, to exactly 10,000 people. That is the entire action space.
2. **Costs**: ₹500 per offer, plus the discount margin. A missed churner costs their lifetime value.
3. **Rare?** Churn is maybe 3% — imbalanced, yes, but that is not the interesting part.
4. **Ranking, number, or decision?** Ranking, with a hard budget of 10,000 — so precision@10,000, right?
5. **Operating point**: 10,000. But *ranked by what?*

Here is the twist almost everyone misses. Rank by predicted churn probability and your top 10,000 are the customers most certain to leave — and many of them are leaving no matter what you send. You spend the entire budget on people the offer cannot save, plus people who were never going anywhere.

- What you actually want: customers who stay **because of** the offer.
- That is not a classification quality question at all. It is an **incremental value** question.`,
    },
    {
      type: 'math',
      intro: 'The uplift (a.k.a. treatment effect) you actually want to rank by.',
      latex: [
        '\\tau(x) = P(\\text{stay} \\mid x, \\text{offer}) - P(\\text{stay} \\mid x, \\text{no offer})',
        '\\text{Rank by } \\tau(x), \\text{ not by } P(\\text{churn} \\mid x); \\text{ spend the budget on the top } k \\text{ by } \\tau',
        '\\text{Value} = \\sum_{i \\in \\text{top-}k} \\big(\\tau(x_i) \\cdot LTV_i - \\text{cost}_i\\big)',
      ],
    },
    {
      type: 'note',
      md: `**Uplift modelling, honestly, in one paragraph.** Split customers into four groups by what the offer does: *persuadables* (stay only if offered — the only ones worth money), *sure things* (stay either way — the offer is pure discount leakage), *lost causes* (leave either way — wasted postage), and *sleeping dogs* (the offer reminds them they were thinking of leaving, and they churn *because* you mailed them — this is real and measurable). A churn classifier ranks by P(churn), which mostly surfaces lost causes and sleeping dogs. An uplift model ranks by the *difference* in outcome between treated and untreated. The catch, and you must say it: τ is never observed for any individual — you see one arm, never both — so uplift requires **randomized holdout data**, i.e. you must deliberately mail a random subset and *not* mail a random control, and keep doing it forever. Simplest honest implementation is the **two-model (T-learner)** approach: fit one model on the treated arm, one on the control arm, subtract the predictions. It is noisy because you are subtracting two estimates, but it is understandable and it ships. The evaluation metric is the **Qini / uplift curve** — incremental retained customers versus number treated — not AUC, not F1. And the budget still binds, so it is precision@k again, just on a different score.`,
    },
    {
      type: 'intuition',
      title: 'Goodhart\'s law: the metric will be gamed, including by your own model',
      md: `*"When a measure becomes a target, it ceases to be a good measure."* Charles Goodhart said it about monetary policy. It is the central occupational hazard of ML.

- **Example 1 — the ranking model that learned clickbait.** Target: click-through rate. The model found that sensational, misleading titles get clicked. CTR up 12%, session length down, complaints up, one-year retention down. The metric was honest; it just was not the goal.
- **Example 2 — the support-ticket classifier judged on resolution time.** Target: mean time to close. The model routed hard tickets to a queue that auto-closed them as "no response from customer". Mean time to close fell 40%. Re-open rate doubled. Nobody lied; the measure just stopped measuring.
- The pattern in both: the metric was a **proxy** for something unmeasurable (satisfaction, help), and optimization pressure found the gap between proxy and goal.
- The gap is always there. Optimization pressure always finds it. Assume this, do not hope against it.`,
    },
    {
      type: 'note',
      md: `Three defences, and they are cheap. **(1) Guardrail metrics.** Declare, before the experiment, a small set of metrics that must not degrade — retention, complaint rate, latency, revenue, fairness gaps across segments. The primary metric can rise; if a guardrail falls, you do not ship. **(2) Always report a baseline.** Majority class for classification, "predict the mean" or last-value for regression, "most popular" or "recent" for ranking, "do nothing" for any intervention. A metric with no baseline is a number with no meaning — and the do-nothing baseline is exactly what exposed the 99%-accuracy fraud model. **(3) Re-derive the metric when the product changes.** A metric chosen for last year's decision quietly stops matching this year's, and nobody notices because the dashboard still renders.`,
    },
    {
      type: 'intuition',
      title: 'The sentence to end on',
      md: `Everything in this module compresses to one habit. Before you say a number, say the argument the number encodes.

- "Accuracy 0.98" says nothing. "We catch 45 of 50 frauds at 15 false alarms a day, against a do-nothing baseline of 0.95 accuracy, with the queue capped at analyst capacity" says everything.
- The drill is the argument: decision, costs, rarity, output type, operating point.
- If you cannot name what each error costs, you are not ready to choose a metric — and saying *that* out loud is a better answer than guessing.
- **A metric is an argument about what matters. Say the argument out loud before you say the number.**`,
    },
  ],
  quiz: [
    {
      question: 'From TP=45, FP=15, FN=5, TN=935: which pair of numbers is correct?',
      options: [
        { text: 'precision 0.90, recall 0.75', explanation: 'Swapped. Precision divides by predicted positives (60), recall by actual positives (50). 45/60 = 0.75 and 45/50 = 0.90.' },
        { text: 'precision 0.75, recall 0.90', explanation: 'Correct. Precision = 45/(45+15) = 0.75. Recall = 45/(45+5) = 0.90. Denominators are the tell: FP for precision, FN for recall.' },
        { text: 'precision 0.75, recall 0.98', explanation: '0.98 is specificity (935/950) or accuracy (980/1000) — both dominated by the huge TN cell, which recall never touches.' },
      ],
      correct: 1,
    },
    {
      question: 'Same matrix. Why does F2 (0.865) come out higher than F1 (0.818), while F0.5 (0.776) comes out lower?',
      options: [
        { text: 'F2 uses more decimal places in the calculation', explanation: 'Beta changes the weighting, not the precision of the arithmetic.' },
        { text: 'Higher beta always produces a higher score regardless of the model', explanation: 'False. If precision were the strong side, F2 would drop below F1. Beta tilts toward whichever side it favours.' },
        { text: 'Beta says how many times more you value recall; here recall (0.90) beats precision (0.75), so weighting recall up raises the score', explanation: 'Correct. F-beta is a weighted harmonic mean. Beta = 2 counts recall 4x, and recall is our strong side; beta = 0.5 leans on precision, our weak side, so the score falls.' },
      ],
      correct: 2,
    },
    {
      question: 'Your fraud model has PR-AUC 0.33 and a review team that can process 200 alerts a day. An expected-cost sweep says the optimal threshold generates 4,282 alerts. What do you deploy?',
      options: [
        { text: 'Top 200 by score — the capacity constraint binds tighter than the cost optimum', explanation: 'Correct. Both constraints are real; you operate at whichever binds first. Then quantify what the extra 4,082 unreviewed alerts would have been worth — that is the business case for more headcount.' },
        { text: 'The cost-optimal threshold — cost is the true objective', explanation: 'It is the true objective, but the cost model assumed every alert gets reviewed. Firing 4,282 alerts at a 200-capacity team means most are never worked, so the assumed benefit never materializes.' },
        { text: 'Threshold 0.5, since it is the calibrated default', explanation: '0.5 is optimal only for balanced classes with equal error costs. Here it produces 27 alerts and misses 136 of 160 frauds — it wastes 173 slots of available review capacity.' },
      ],
      correct: 0,
    },
    {
      question: 'Two fraud models: identical accuracy (0.998) and identical ROC-AUC (0.914), but PR-AUC 0.334 vs 0.239. What does that tell you?',
      options: [
        { text: 'One of the metrics was computed incorrectly', explanation: 'All three are consistent. This divergence is expected at a 0.2% positive rate and is the whole reason PR-AUC exists.' },
        { text: 'The models are equivalent; PR-AUC is just noisier', explanation: 'The difference is real, not noise: at the same top-200 cut, one catches 65 frauds and the other 48. Same analyst hours, 35% more fraud caught.' },
        { text: 'Accuracy and ROC-AUC are both dominated by the 99.8% negative class; PR-AUC is the only one measuring the ranking where it matters', explanation: 'Correct. Accuracy is TN-dominated, and ROC-AUC has FPR = FP/(FP+TN) with an enormous TN, so thousands of false alarms barely move it. Precision has only flagged rows in its denominator, so it reacts immediately.' },
      ],
      correct: 2,
    },
    {
      question: 'A cancer-screening model must not miss tumours. Which framing is the strong answer?',
      options: [
        { text: 'Maximize recall — nothing else matters when lives are at stake', explanation: 'Threshold 0 gives recall 1.0 by biopsying everyone. Unbounded recall creates overdiagnosis, overtreatment, anxiety and capacity collapse — the harms are documented, not hypothetical.' },
        { text: 'Set recall as a hard constraint (e.g. ≥ 0.98) and maximize precision subject to it, reporting calibration too', explanation: 'Correct. Constrained optimization: the clinical floor is non-negotiable, and among models that clear it you take the fewest false positives. Calibration matters separately because a doctor reads the probability itself.' },
        { text: 'Maximize F1 — it balances both concerns', explanation: 'F1 weights precision and recall equally, which is a claim that a missed cancer costs the same as one extra scan. False on its face.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is NDCG@10 the offline metric for search ranking rather than precision@10?',
      options: [
        { text: 'It handles graded relevance and discounts by position, so a perfect result at rank 1 counts far more than the same result at rank 9', explanation: 'Correct. The 2^rel − 1 numerator grades relevance instead of forcing it binary, and the 1/log2(i+1) discount encodes that users read top-down. Normalizing by the ideal ordering makes queries comparable.' },
        { text: 'It is threshold-free while precision@10 is not', explanation: 'Both are cut-off metrics at k = 10; neither uses a probability threshold. The difference is grading and position weighting.' },
        { text: 'It correlates perfectly with online engagement', explanation: 'The opposite is the famous problem: offline NDCG is computed on rater labels, logged queries, and the old model exposure, so it regularly disagrees with the A/B test.' },
      ],
      correct: 0,
    },
    {
      question: 'A telco has budget to mail 10,000 retention offers. You rank customers by predicted churn probability and take the top 10,000. What is wrong?',
      options: [
        { text: 'Nothing — highest churn risk is exactly who to save', explanation: 'This is the intuitive answer and it is the trap. The highest-risk customers include many who will leave regardless; the offer cannot save them, so the money is burned.' },
        { text: 'You should rank by uplift — P(stay | offer) − P(stay | no offer) — because the budget should go to customers who stay because of the offer', explanation: 'Correct. Churn probability finds lost causes and sleeping dogs; uplift finds persuadables. It needs a randomized control arm to estimate, which is the cost of getting this right.' },
        { text: 'You should use recall instead, to make sure no churner is missed', explanation: 'Recall ignores the budget entirely. With a fixed 10,000-offer cap the metric is necessarily a top-k metric; the open question is what to rank by.' },
      ],
      correct: 1,
    },
    {
      question: 'A support-ticket model cut mean time-to-close by 40% by routing hard tickets to a queue that auto-closed them as "no customer response". Re-open rate doubled. Which lesson does this illustrate?',
      options: [
        { text: 'Goodhart\'s law — time-to-close was a proxy for "helped the customer", and optimization pressure found the gap between proxy and goal', explanation: 'Correct. The metric stayed honest; it just stopped measuring the thing it stood for. The fix is a primary metric plus declared guardrails (here: re-open rate, CSAT) that must not degrade.' },
        { text: 'The model overfit the training data', explanation: 'Overfitting means failing to generalize. This model generalized perfectly — to the wrong objective. It is a specification failure, not a fitting failure.' },
        { text: 'Time-to-close should have been measured on a held-out set', explanation: 'Held-out evaluation would have reported the same 40% improvement. No amount of clean methodology saves a metric that does not encode the goal.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: '"My model has 99% accuracy but it is useless." Why, and what would you report instead?',
      answer:
        'Because accuracy counts every row equally while the class you care about is 1% of them — a model that always predicts the majority class already scores 99%, so accuracy cannot distinguish a real model from no model at all. Always report the majority-class baseline (1 − positive_rate) alongside any accuracy; if you cannot beat it by a wide margin on metrics that ignore true negatives, you have built nothing. Report instead: the raw confusion matrix in words ("caught 45 of 50 frauds at 15 false alarms"), precision and recall separately, F-beta with a beta justified by the cost ratio, PR-AUC for threshold-free model comparison, and MCC if someone insists on one summary number — MCC is 0 for any constant predictor, which is precisely the failure mode accuracy hides. The business cost of getting this wrong is shipping a model that costs money to run and catches nothing.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through your framework for choosing a metric on a problem you have never seen.',
      answer:
        'Five steps, in order. (1) What decision does the output drive — who acts, and how? (2) What does a false negative cost and what does a false positive cost, in the same units? (3) Is the positive class rare — if yes, accuracy and ROC-AUC are out. (4) Is the output a ranking, a number, or a decision — that picks the family (NDCG/precision@k, MSE/MAE/calibration, or the confusion-matrix family). (5) What operating point follows — a threshold from expected cost, a top-k from capacity, or a hard constraint with the other metric maximized under it. Steps 1 and 2 carry the weight; the rest is bookkeeping. If the interviewer will not give me costs I state assumed ones out loud and name the sensitivity: "assume a miss costs 200x a false alarm; if that ratio flips, my answer flips."',
      isCaseBased: false,
    },
    {
      question: 'Case: design the metric for a fraud detection system at a bank. Take me all the way to what you would put on the dashboard.',
      answer:
        'Decision: hold the transaction and queue it for a human analyst — the team can work about 200 alerts a day. Costs: a miss refunds roughly ₹8,000; a false alarm costs about four minutes of analyst time (~₹40) plus customer trust — a ratio near 200:1. Positive rate is 0.2%, so accuracy is dead (always-negative scores 99.8%) and ROC-AUC is nearly dead: its FPR denominator is the huge negative class, so two models that differ by 35% in fraud caught can share the same ROC-AUC to three decimals. Model selection: PR-AUC. Operating point: sweep expected cost C_FN·FN + C_FP·FP, but check the implied alert volume — in a real system the cost optimum wanted 4,282 alerts against 200 of capacity, so capacity binds and the operating metric is precision@200. Dashboard: alerts per day, precision@k on reviewed alerts, frauds caught vs estimated total, rupees saved net of review cost, and the score distribution over time for drift. Caveats to state: chargeback labels lag 30–90 days so recall is always a quarter behind, and you only ever get labels for what the queue reviewed, which biases tomorrow\'s training set.',
      isCaseBased: true,
    },
    {
      question: 'Case: a medical screening model. The clinical lead says "just maximize recall". How do you respond?',
      answer:
        'Agree with the direction and refuse the unbounded version, because recall 1.0 is achievable by recommending a biopsy for everyone. Reframe as a constrained optimization: recall ≥ 0.98 as a clinical floor set by them, and among models that clear it, take the highest precision. Justify with the second-order harms — anxiety from false-positive recalls, overdiagnosis and overtreatment of indolent tumours that would never have caused harm, scanner slots taken from symptomatic patients, and the trust erosion that makes a low-precision programme get ignored entirely. Add two things they will care about: calibration, because clinicians read the probability itself and a model can rank perfectly while its probabilities are systematically inflated (report Brier score and a reliability diagram; fix with isotonic or Platt scaling, and note that class weighting decalibrates on purpose); and the two-stage design, where a cheap high-recall screen with 5–10% precision feeds an expensive confirmatory test — which makes a 0.98 recall floor affordable, and turns stage one\'s real metric into "recall at a volume stage two can absorb".',
      isCaseBased: true,
    },
    {
      question: 'Design a metric for YouTube recommendations. Assume I will push back on your first answer.',
      answer:
        'First answer, expected to be pushed on: click-through rate — and I would reject it myself, because optimizing CTR teaches the system clickbait: misleading thumbnails and titles that get the click and lose the user. Better primary: a satisfaction proxy with a dwell requirement — long-dwell watch time or successful sessions (a click followed by meaningful watch and no immediate bounce back to search), ideally weighted by explicit signals (likes, subscribes, "not interested") and normalized by video length so a 10-hour video does not win by default. Offline, iterate on NDCG@k against human-rated relevance and a counterfactual off-policy estimate; decide on an online A/B test, because offline labels come from raters, logged queries and the old model\'s exposure. Guardrails that must not degrade: 7- and 28-day retention, session abandonment, complaint and "not interested" rate, creator-side diversity, and latency. Ship only if the primary rises and no guardrail falls. The structural point I want to be heard saying: no single number can be the target, because whatever it is will be gamed by the optimizer — primary plus guardrails is the only stable design.',
      isCaseBased: false,
    },
    {
      question: 'Why is MCC a better single summary than F1 on an imbalanced binary problem?',
      answer:
        'MCC = (TP·TN − FP·FN) / √((TP+FP)(TP+FN)(TN+FP)(TN+FN)) — the correlation coefficient between predicted and true labels. It uses all four cells and normalizes by both the row and column totals, so it cannot be inflated by a skewed base rate: a constant predictor scores exactly 0, random guessing scores 0, perfect inversion scores −1. Compare on our matrix: the always-negative baseline gets accuracy 0.950, F1 0.000, balanced accuracy 0.500 and MCC 0.000, while the real model gets 0.980 / 0.818 / 0.942 / 0.811. F1 ignores TN entirely, which makes it insensitive to how badly you spam the negative class relative to its size, and it fixes the precision-recall tradeoff at "equal" with no justification. The caveat I would add: MCC is a summary for comparing models, not an operating metric — it does not tell an analyst how many alerts arrive tomorrow, so I would show the four raw cells next to it.',
      isCaseBased: false,
    },
    {
      question: 'Case: your ranking model improves NDCG@10 by 4% offline. The A/B test shows engagement flat and abandonment up. What is going on?',
      answer:
        'Offline and online measure different things, and I would go in this order. (1) Label mismatch: NDCG scores against paid raters\' idea of relevance, which is not the user\'s — raters reward topical correctness, users reward usefulness, freshness and trust. (2) Exposure bias: offline evaluation only sees documents the old model surfaced, so a new model that promotes never-before-shown documents is scored against labels that do not exist, usually pessimistically — but the reverse also happens when the offline set over-represents the old model\'s favourites. (3) Position/presentation effects: the ranking changed but so did snippets, thumbnails, or the mix of verticals, and users react to the page, not the ranked list. (4) Metric-slice mismatch: NDCG improved on the head queries that dominate the rated set while regressing on the tail that dominates traffic — check per-segment. (5) Novelty/learning effects: a reordering costs users their learned muscle memory and short-term engagement dips before recovering, so check the test duration. Decision: the A/B test wins. Offline metrics are for iteration speed, not for shipping. If abandonment is up, do not ship, and use the disagreement to fix the offline proxy — that disagreement is information about your evaluation set, not about the users.',
      isCaseBased: true,
    },
    {
      question: 'A PM demands "one number" for model quality. How do you handle it, without being obstructive?',
      answer:
        'Give them one number, and make it the right one, then bring the decomposition anyway. Pick by output type: MCC or PR-AUC for imbalanced classification, NDCG@k for ranking, calibrated expected value in currency where you can get costs. Better still, translate to money — "at our operating point this saves ₹X per month net of review cost" is one number and it is the one they actually wanted. Then attach two things: the baseline (do-nothing, or the current system), because a number with no baseline has no meaning, and a short guardrail list that must not degrade. What I would refuse is a single number chosen for convenience — accuracy on imbalanced data, or F1 when the error costs differ by 200x — and I would explain the refusal in their terms: "F1 assumes a missed fraud costs the same as a false alarm; it does not, so that number would tell us to do the wrong thing."',
      isCaseBased: false,
    },
    {
      question: 'When does precision@k beat every threshold-based metric?',
      answer:
        'When a fixed downstream capacity consumes the output: a review team that works N alerts a day, a page with 10 slots, a retention budget of 10,000 offers, a radiology department with a set number of follow-up appointments. In those systems the threshold is not a modelling choice at all — the capacity fixes k, and precision@k is exactly "what fraction of the work we will actually do is worthwhile". It also has an operational virtue: it is stable when prevalence shifts, because you always take the same number of items, whereas a fixed probability threshold produces a wildly variable alert volume as the score distribution drifts. The tradeoff to name: precision@k tells you nothing about what you left below the cut. Report recall@k alongside — "the top 200 catch 65 of 160 frauds" — because that is the number that justifies asking for more capacity.',
      isCaseBased: false,
    },
    {
      question: 'Explain the difference between a loss and a metric, and give a case where the right choice for each differs.',
      answer:
        'A loss is what the model optimizes during training: it must be differentiable and well-behaved for gradients. A metric is how humans judge the result: it can be discontinuous, non-differentiable, business-defined, or computed by a person. They differ constantly. Classification is the clean example: you train with cross-entropy but you are judged on precision@k or F-beta — precision@k has zero gradient almost everywhere (it only changes when items swap across the cut), so it cannot be a loss. Ranking is the same story: you train with a pairwise or listwise surrogate and you are judged on NDCG, which is a step function of the ordering. Detection trains on a smooth box-regression plus classification loss and is judged on mAP over IoU thresholds. The senior addition: when loss and metric diverge too far, close the gap deliberately — class weights, focal loss, or a soft/differentiable surrogate of the metric — and always tune the threshold or the cut post-hoc on validation data, because that is the free lever that aligns a general-purpose loss with a specific business metric.',
      isCaseBased: false,
    },
    {
      question: 'What are guardrail metrics, and how do you choose them?',
      answer:
        'Guardrails are metrics declared before an experiment that must not degrade, regardless of what the primary metric does. Choose them by asking what the primary metric could destroy if it were gamed: for an engagement primary, guardrail long-run retention, complaint rate and content-quality signals; for a latency or cost primary, guardrail quality and error rate; for any personalization primary, guardrail fairness gaps across the segments you would be embarrassed to regress. Also guardrail the operational realities — alert volume against team capacity, inference cost, p99 latency. Two rules that make them work: declare them upfront with thresholds, so nobody negotiates after seeing the results, and keep the list short, because a dozen guardrails on noisy data guarantees a false alarm every experiment. The purpose is not to catch every harm; it is to make the specific failure mode you can already predict impossible to ship past.',
      isCaseBased: false,
    },
    {
      question: 'Case: you inherit a churn model with ROC-AUC 0.83. Retention campaigns using it have shown no measurable lift for two quarters. Diagnose.',
      answer:
        'ROC-AUC 0.83 says the model ranks churners above non-churners; it says nothing about whether an offer changes anyone\'s behaviour, and that is my leading hypothesis: the campaign targets high P(churn), which surfaces lost causes (leaving regardless — the offer is wasted) and sure things (staying regardless — the offer is a pure discount giveaway), while the persuadables sit in the middle of the ranking. The fix is to rank by uplift, τ(x) = P(stay | offer) − P(stay | no offer), which requires a randomized control arm — mail a random subset and deliberately withhold from a random control, permanently — and evaluate with a Qini/uplift curve, not AUC. Other hypotheses worth checking first because they are cheaper: (1) is there a control group at all — "no measurable lift" may mean "no way to measure lift", which is the most common version of this story; (2) sleeping dogs — the offer may be actively reminding people to leave, which shows up as negative uplift in a segment; (3) label lag and timing — the model may flag customers after the decision to leave is already made, so the intervention arrives too late; (4) the offer itself may simply be too weak, in which case no targeting model saves it. Business framing: the deliverable is incremental retained value per rupee spent, not classification quality.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'The five-step metric drill', back: '1. What decision? 2. What does each error cost? 3. Is the positive class rare? 4. Ranking / number / decision? 5. What operating point follows? Steps 1–2 do the work.' },
    { front: 'F-beta in one line', back: 'F_β = (1+β²)·PR/(β²P + R). Beta = how many times more you value recall. β=2 for screening, β=0.5 for spam, β=1 only if the costs are truly equal.' },
    { front: 'MCC formula and why it is honest', back: '(TP·TN − FP·FN)/√((TP+FP)(TP+FN)(TN+FP)(TN+FN)). Uses all four cells, normalized both ways. Constant predictor = 0, random = 0, inverted = −1.' },
    { front: 'Worked matrix to memorize', back: 'TP45 FP15 FN5 TN935 → acc .980, prec .750, rec .900, spec .984, FPR .016, F1 .818, F2 .865, F0.5 .776, balacc .942, MCC .811. Baseline acc = .950.' },
    { front: 'Fraud: the metric stack', back: 'PR-AUC to compare models, precision@k (k = review capacity) to operate, expected cost C_FN·FN + C_FP·FP to sanity-check the threshold, score-drift monitoring to keep it.' },
    { front: 'Why ROC-AUC misleads at 0.2% positives', back: 'FPR = FP/(FP+TN) with a giant TN, so thousands of false alarms barely move it. Two models can tie at ROC-AUC 0.914 while one catches 35% more fraud at the same k.' },
    { front: 'Medical screening: the right framing', back: 'NOT "maximize recall" (threshold 0 gives 1.0). Recall ≥ 0.98 as a hard floor, maximize precision under it. Calibration matters — a doctor reads the probability.' },
    { front: 'Search ranking: offline vs online', back: 'NDCG@10 offline to iterate (graded relevance, 1/log2(i+1) position discount, normalized by the ideal ordering). Ship on an online A/B test with guardrails.' },
    { front: 'Uplift vs churn probability', back: 'τ(x) = P(stay|offer) − P(stay|no offer). Rank by τ, not P(churn) — otherwise the budget buys lost causes and sure things. Needs a randomized control arm; evaluate with a Qini curve.' },
    { front: 'Goodhart\'s law + the defence', back: '"When a measure becomes a target, it ceases to be a good measure." CTR → clickbait; time-to-close → auto-closed tickets. Defence: primary metric + declared guardrails + always report a baseline.' },
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
    - drift + 30–90 day label lag
  - Case: medical screening
    - recall >= 0.98 as a hard floor
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
    - uplift tau = P(stay|offer) − P(stay|no offer)
    - persuadables / sure things / lost causes / sleeping dogs
    - needs randomized control; Qini curve
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
