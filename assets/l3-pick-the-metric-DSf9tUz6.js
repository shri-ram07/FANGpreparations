var e={id:`metrics-l3-pick-the-metric`,subjectId:`metrics`,level:3,title:`Pick the Metric: Four Cases`,whyItMatters:`A metric is an argument, not a number. This is the drill for producing that argument in ninety seconds, run on four problems where the obvious answer ships the worse model.`,assumes:[`You know precision, recall, F1 and ROC/PR curves`,`You have seen scikit-learn score a model`],estMinutes:22,sections:[{type:`intuition`,title:`The five-step drill`,md:`Two candidates get the same fraud problem. One says "I'd use F1". The other asks what a miss costs against a false alarm, and how many alerts a human can review. The second answer is the one that gets hired.

Run this out loud, in order, on any problem you are handed:

1. **What decision does this support?** Who acts, and on what.
2. **What is the base rate?** This alone rules out accuracy most of the time.
3. **What does each error cost?** A miss against a false alarm, in real units.
4. **Is there a capacity constraint?** Alerts per day, slots on a page, budget.
5. **What operating point follows?** The metric is whatever measures *that*.`},{type:`note`,label:`The drill also buys you time`,md:`When asked "which metric for X?", the strong move is not to answer immediately. It is to say what you need to know first.

"That depends on what a false negative costs relative to a false positive, and on how many cases a reviewer can actually process — can I assume anything about either?"

That is not evasion. It is the shortest possible demonstration that you know a metric is downstream of a decision.`},{type:`math`,intro:`The metrics used below, and the two that matter most for the cases. MCC is the correlation between prediction and truth, and it is the only common single number that uses all four cells of the confusion matrix — which is what makes it hard to game on imbalanced data. Balanced accuracy is the mean of recall on each class.`,latex:[`P = \\frac{TP}{TP+FP} \\qquad R = \\frac{TP}{TP+FN} \\qquad F_\\beta = (1+\\beta^2)\\frac{PR}{\\beta^2 P + R}`,`\\text{bal.acc} = \\tfrac{1}{2}\\left(\\frac{TP}{TP+FN} + \\frac{TN}{TN+FP}\\right)`,`\\text{MCC} = \\frac{TP \\cdot TN - FP \\cdot FN}{\\sqrt{(TP+FP)(TP+FN)(TN+FP)(TN+FN)}}`]},{type:`code`,lang:`python`,title:`One confusion matrix, every metric`,code:`import numpy as np
from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                             fbeta_score, balanced_accuracy_score, matthews_corrcoef)

TP, FP, FN, TN = 45, 15, 5, 935
y_true = np.r_[np.ones(TP + FN), np.zeros(FP + TN)]
y_pred = np.r_[np.ones(TP), np.zeros(FN), np.ones(FP), np.zeros(TN)]

print('accuracy    %.4f' % accuracy_score(y_true, y_pred))
print('precision   %.4f' % precision_score(y_true, y_pred))
print('recall      %.4f' % recall_score(y_true, y_pred))
print('specificity %.4f' % (TN / (TN + FP)))
for b in (1, 2, 0.5):
    print('F%-11s%.4f' % (b, fbeta_score(y_true, y_pred, beta=b)))
print('bal acc     %.4f' % balanced_accuracy_score(y_true, y_pred))
print('MCC         %.4f' % matthews_corrcoef(y_true, y_pred))

# ---- real output ----
# accuracy    0.9800
# precision   0.7500
# recall      0.9000
# specificity 0.9842
# F1          0.8182
# F2          0.8654
# F0.5        0.7759
# bal acc     0.9421
# MCC         0.8115`,annotations:{6:`np.r_ concatenates arrays. This rebuilds the raw label vectors from the four counts, so sklearn can be used to check arithmetic you can also do by hand.`,20:`Accuracy 0.98 on a 5% positive rate. Always predicting negative would score 0.95, so 0.98 is a 3-point improvement over doing nothing — which is why it is the least useful number here.`,24:`F2 0.8654 above F1 0.8182 above F0.5 0.7759. Recall (0.90) exceeds precision (0.75), so weighting recall more raises the score. The three F-scores order themselves by which metric you favoured.`,27:`MCC 0.8115 is the most conservative of them all, and it is the only one using all four cells — which is why it is hard to inflate by exploiting a large TN count.`}},{type:`intuition`,title:`Case 1 — fraud, where the obvious metrics ship the worse model`,md:`0.2% of transactions are fraudulent. Two models, A and B, where B is deliberately A plus noise — genuinely worse.

Run the drill: the decision is which transactions a review team opens; the base rate is 0.2%; a missed fraud costs about ₹8,000 and a wasted review about ₹40; the team can process **200 alerts a day**.

Watch what each metric says.`},{type:`code`,lang:`python`,title:`Two models, four ways of scoring them`,code:`from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, average_precision_score

X, y = make_classification(n_samples=200000, n_features=12, n_informative=6, n_redundant=0,
                           n_clusters_per_class=1, weights=[0.998], flip_y=0.0,
                           class_sep=0.9, random_state=0)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.4, stratify=y, random_state=0)
sA = LogisticRegression(max_iter=2000).fit(Xtr, ytr).predict_proba(Xte)[:, 1]
z = np.log(sA / (1 - sA)) + np.random.default_rng(0).standard_normal(len(sA))
sB = 1 / (1 + np.exp(-z))

print('always-negative accuracy=%.4f' % accuracy_score(yte, np.zeros_like(yte)))
for name, s in (('A', sA), ('B', sB)):
    top = yte[np.argsort(-s)[:200]]
    print('model %s  acc@0.5=%.4f  ROC-AUC=%.3f  PR-AUC=%.3f  prec@200=%.3f  caught=%d'
          % (name, accuracy_score(yte, s >= 0.5), roc_auc_score(yte, s),
             average_precision_score(yte, s), top.mean(), int(top.sum())))

# ---- real output ----
# always-negative accuracy=0.9980
# model A  acc@0.5=0.9983  ROC-AUC=0.914  PR-AUC=0.334  prec@200=0.325  caught=65
# model B  acc@0.5=0.9981  ROC-AUC=0.914  PR-AUC=0.239  prec@200=0.240  caught=48`,annotations:{11:`B is A with Gaussian noise added in log-odds space. It is the same model with its ranking degraded, so it must be worse.`,12:`np.argsort(-s)[:200] takes the 200 highest-scoring rows — the review queue that will actually exist.`,20:`Doing nothing scores 0.9980. Both models score about 0.998, so accuracy cannot separate them from each other OR from a model that never fires.`,21:`ROC-AUC is 0.914 for BOTH. It is genuinely blind to the difference here, because FPR barely moves when the negative class is 199,600 rows.`,22:`PR-AUC separates them, 0.334 against 0.239. And precision@200 — the metric matching the actual constraint — gives 0.325 against 0.240: 65 frauds caught against 48. Same two models, and only the last two metrics can tell them apart.`}},{type:`math`,intro:`Once costs are known, the threshold is not a matter of taste. Minimise expected cost directly. But when a hard capacity limit exists, that optimum may be unreachable, and precision@k becomes the operative metric instead.`,latex:[`t^{*} = \\arg\\min_{t} \\;\\; C_{FN} \\cdot FN(t) \\;+\\; C_{FP} \\cdot FP(t)`,`\\text{precision@}k = \\frac{1}{k}\\sum_{i \\in \\text{top-}k} y_i`]},{type:`code`,lang:`python`,title:`The cost-optimal threshold, and the queue that actually exists`,code:`C_FN, C_FP = 8000, 40
print(' thr  alerts caught missed      cost')
for t in (0.5, 0.05, 0.01, 0.005, 0.002, 0.001):
    flagged = sA >= t
    tp = int((flagged & (yte == 1)).sum())
    alerts = int(flagged.sum())
    missed = int(yte.sum()) - tp
    print('%.3f %7d %6d %6d %9d' % (t, alerts, tp, missed, C_FN * missed + C_FP * alerts))

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
# capacity k=200 -> precision@k=0.325, catches 65 of 160 frauds`,annotations:{9:`Cost is a real number in rupees, so it can be minimised rather than argued about.`,18:`The default threshold of 0.5 costs 1,089,080 — the worst row in the table. It raises only 27 alerts and misses 136 frauds.`,21:`Cost bottoms out at t = 0.005: 491,280, less than half the default. Below that, alert volume grows faster than the frauds it catches and cost climbs again.`,23:`But t = 0.005 means 4,282 alerts and the team can process 200. The cost-optimal threshold is unreachable, so the honest metric becomes precision@200 — and the honest report is "we catch 65 of 160 frauds at current staffing", which is a hiring argument, not a modelling one.`}},{type:`note`,label:`Case 2 — medical screening`,md:`Drill: the decision is who gets a follow-up scan; base rate is low; a missed cancer is catastrophic and a false alarm costs an anxious patient and a biopsy; capacity is real but elastic.

So recall dominates — **F2 or recall at a fixed precision floor**.

**The wrong answer, said confidently:** "just maximise recall." Set the threshold to zero and recall is 1.000, with every patient recalled. Recall alone is trivially gameable, which is why it is always quoted with precision or at a fixed alert volume.

There is also a second axis: a model can **rank** perfectly and still be badly **calibrated**. Screening decisions are made from absolute risk — "your probability is 4%" — so calibration must be checked separately with a reliability diagram.`},{type:`note`,label:`Case 3 — search ranking, and the proxy trap`,md:`Drill: the decision is what order to show ten results; every query has some relevant items; there is no error "cost" as such; capacity is the page.

So **NDCG@10**, because relevance is graded and position matters.

The trap here is where the phrase *proxy metric* was invented. You cannot measure "user satisfaction", so you measure clicks — and then a model learns that clickbait maximises clicks. The metric was a proxy, the proxy got optimised, and the thing you cared about got worse.

Defences are cheap: declare **guardrail metrics** before the experiment (dwell time, return rate, complaint rate), and treat any movement in them as a veto regardless of the headline number.`},{type:`note`,label:`Case 4 — churn with a budget: the one almost everyone gets wrong`,md:`A telco can afford to send 10,000 retention offers. The obvious answer — rank by probability of churning, take the top 10,000 — is wrong.

The customers most likely to churn include many who will leave whatever you do. The offer is wasted on them.

What you want is **uplift**: τ(x) = P(stay | offer) − P(stay | no offer). Rank by the change the offer *causes*, not by the risk the customer carries. That needs an experiment with a randomised control group, and it is a different modelling problem from churn prediction.

The metric follows: **Qini or uplift@k**, not AUC.`},{type:`note`,label:`Goodhart, and three cheap defences`,md:`*"When a measure becomes a target, it ceases to be a good measure."* This applies to your own model, which is a relentless optimiser of whatever you actually wrote down.

1. **Guardrail metrics**, declared in advance, with any regression treated as a veto.
2. **Report a pair**, never a single number — precision with recall, quality with volume, so improving one at the other's expense is visible.
3. **Re-examine the metric when it saturates.** A number that stops moving usually means the proxy has been exhausted, not that the problem is solved.`}],quiz:[{question:`Models A and B both scored ROC-AUC 0.914 but PR-AUC 0.334 and 0.239. What does that tell you?`,options:[{text:`The models are equivalent`,explanation:`B is A plus noise, so it is genuinely worse — and two metrics detect that.`},{text:`ROC-AUC is blind to the difference here because FPR barely moves against 199,600 negatives`,explanation:`Correct. At a 0.2% base rate, PR-AUC and precision@k separate them while ROC-AUC cannot.`},{text:`PR-AUC is miscalibrated`,explanation:`PR-AUC is the metric correctly detecting the difference.`},{text:`The test set is too small`,explanation:`80,000 rows with 160 frauds; the issue is which metric, not sample size.`}],correct:1},{question:`Always-negative scores 0.9980 accuracy; models A and B score 0.9983 and 0.9981. What follows?`,options:[{text:`Model A is clearly better`,explanation:`The gap is 0.0002 — noise at this base rate.`},{text:`Accuracy cannot separate the models from each other or from a model that never fires`,explanation:`Correct, and that is the point of step 2 of the drill: the base rate rules accuracy out immediately.`},{text:`Both models are useless`,explanation:`Model A catches 65 frauds in 200 alerts, which is far from useless.`},{text:`The threshold should be lowered to 0.4`,explanation:`The problem is the metric, not that particular threshold.`}],correct:1},{question:`Expected cost bottoms out at t = 0.005 with 4,282 alerts, but the team handles 200. What do you report?`,options:[{text:`The cost-optimal threshold, since it minimises cost`,explanation:`It cannot be operated — 4,282 alerts against a capacity of 200.`},{text:`precision@200, plus "we catch 65 of 160 frauds at current staffing"`,explanation:`Correct. And that framing turns the gap between 65 and 120 into a staffing argument rather than a modelling one.`},{text:`ROC-AUC, since it is threshold-free`,explanation:`It is 0.914 for both models and says nothing about the operating point.`},{text:`Accuracy at the cost-optimal threshold`,explanation:`Accuracy is uninformative at a 0.2% base rate.`}],correct:1},{question:`Why is "just maximise recall" a bad answer for screening?`,options:[{text:`Recall is hard to compute`,explanation:`It is one of the easiest metrics to compute.`},{text:`Threshold zero gives recall 1.000 by recalling every patient — recall alone is trivially gameable`,explanation:`Correct, which is why it is always quoted with precision or at a fixed alert volume.`},{text:`Recall ignores true positives`,explanation:`TP is its numerator.`},{text:`Because precision matters more in medicine`,explanation:`A missed cancer is worse than a false alarm; the problem is the gameability, not the direction.`}],correct:1},{question:`For churn with a fixed offer budget, why is ranking by churn probability wrong?`,options:[{text:`Churn probability is hard to estimate`,explanation:`It is estimable; the issue is that it answers the wrong question.`},{text:`Many of the highest-risk customers will leave regardless, so the offer is wasted — you want the offer's causal effect`,explanation:`Correct. Uplift τ(x) = P(stay | offer) − P(stay | no offer), which needs a randomised control group.`},{text:`The budget should be unlimited`,explanation:`The budget is the constraint that makes the question interesting.`},{text:`AUC is the right metric here`,explanation:`Qini or uplift@k is; AUC measures ranking by risk, not by effect.`}],correct:1},{question:`F1 0.8182, F2 0.8654, F0.5 0.7759 on the same predictions. Why that ordering?`,options:[{text:`Recall (0.90) exceeds precision (0.75), so weighting recall more raises the score`,explanation:`Correct. The three F-scores order themselves by which metric the β you chose favours.`},{text:`F2 is always the largest`,explanation:`If precision exceeded recall, F0.5 would be the largest.`},{text:`A computation error`,explanation:`All three are exact for these counts.`},{text:`Because β = 2 uses more data`,explanation:`All three use the identical confusion matrix.`}],correct:0}],interviewQuestions:[{question:`Which metric would you use for fraud detection?`,answer:`I would ask two things first: what a missed fraud costs relative to a wasted review, and how many alerts the review team can process a day. With those, the answer is precision@k where k is the capacity, plus expected cost as the sanity check. Concretely on a 0.2% base rate: accuracy cannot even separate a real model from one that never fires — 0.9983 against 0.9980 — and ROC-AUC gave 0.914 for both a good model and a deliberately degraded one. Only PR-AUC and precision@200 detected the difference, at 0.325 against 0.240.`,isCaseBased:!0},{question:`How do you turn business costs into a threshold?`,answer:`Minimise expected cost: C_FN × FN(t) + C_FP × FP(t), swept over t. With ₹8,000 a miss and ₹40 a review, the default 0.5 threshold cost 1,089,080 and the optimum at t = 0.005 cost 491,280 — less than half, from a decision that involved no retraining. The important caveat is that the cost optimum may be unreachable: it implied 4,282 alerts against a capacity of 200, so the operating threshold becomes whatever fills the queue, and the cost table becomes the argument for more reviewers.`,isCaseBased:!0},{question:`A stakeholder asks for "the best model". What do you say?`,answer:`That best depends on the decision, and I would run the drill with them: who acts on the prediction, what the base rate is, what each error costs, and what capacity exists. The fraud case makes the point concretely — by accuracy the two models were indistinguishable, by ROC-AUC identical, and by precision@200 one caught 65 frauds and the other 48. Three defensible metrics, and only one of them corresponds to what the team will actually do with the output.`,isCaseBased:!1},{question:`Why is MCC often preferred for imbalanced binary problems?`,answer:`Because it is the only common single-number metric that uses all four cells of the confusion matrix, so it cannot be inflated by a large true-negative count the way accuracy can, and it does not ignore true negatives the way F1 does. It is a correlation coefficient between prediction and truth, running −1 to 1 with 0 as chance. It is also symmetric under swapping the classes, which F1 is not — F1 changes if you relabel which class is positive, and MCC does not.`,isCaseBased:!1},{question:`Explain uplift modelling and why churn is the classic mistake.`,answer:`Ranking by churn probability sends offers to the people most likely to leave, but many of those will leave regardless — the offer changes nothing and the budget is burned. What you want is the causal effect: τ(x) = P(stay | offer) − P(stay | no offer), so you target customers the offer actually moves. Estimating it requires a randomised holdout, since you need to observe both arms, and the evaluation metric changes too — Qini curve or uplift@k rather than AUC. It is a different problem from prediction wearing the same clothes.`,isCaseBased:!0},{question:`What is Goodhart's law in an ML context, and how do you defend against it?`,answer:`Once a measure becomes a target it stops measuring what you wanted, and your model is a relentless optimiser of whatever you wrote down. Search is the canonical case: you cannot measure satisfaction so you measure clicks, and the model learns clickbait. Three cheap defences — guardrail metrics declared before the experiment with any regression treated as a veto; reporting a pair rather than a single number so a trade is visible; and treating a saturating metric as a sign the proxy is exhausted rather than the problem solved.`,isCaseBased:!1},{question:`When does calibration matter more than ranking?`,answer:`Whenever the absolute probability is used in a downstream calculation rather than just an ordering. Screening is the clean case: telling a patient their risk is 4% only means something if 4% of such patients really do have the condition. Expected-cost thresholding is another — the arithmetic assumes the probabilities are real. If you only ever take the top k, ranking is enough and calibration is irrelevant. The check is a reliability diagram, and the repair is Platt scaling or isotonic regression on held-out data.`,isCaseBased:!1},{question:`Your headline metric improved 3% and the product got worse. What went wrong?`,answer:`Almost certainly the metric was a proxy and the proxy got optimised. I would look first at whatever the metric does not measure — diversity, latency, complaint rate, long-run retention — because that is where the cost was paid. Then at whether the gain is concentrated in a segment nobody sees, or below the fold. Then at whether the offline evaluation is scored against logs generated by the previous system, which rewards agreeing with it. The structural fix is guardrails declared in advance, not a better headline number.`,isCaseBased:!0}],flashcards:[{front:`The five-step drill`,back:`What decision? What base rate? What does each error cost? What capacity? What operating point follows?`},{front:`The strong interview move`,back:`Do not name a metric immediately. Ask what a miss costs relative to a false alarm, and what capacity exists.`},{front:`Fraud, measured`,back:`At 0.2%: always-negative accuracy 0.9980, models A and B 0.9983/0.9981, ROC-AUC 0.914 for BOTH. Only PR-AUC (0.334 vs 0.239) and precision@200 (0.325 vs 0.240) separate them.`},{front:`Cost-optimal threshold`,back:`Minimise C_FN·FN + C_FP·FP. Default 0.5 cost 1,089,080; optimum at t = 0.005 cost 491,280 — but implied 4,282 alerts against a capacity of 200.`},{front:`Why "maximise recall" is a bad answer`,back:`Threshold zero gives recall 1.000 by recalling everyone. Always quote recall with precision or at a fixed alert volume.`},{front:`MCC`,back:`The only common single number using all four cells. A correlation between prediction and truth, −1 to 1, symmetric under swapping classes — F1 is not.`},{front:`Uplift vs churn probability`,back:`τ(x) = P(stay|offer) − P(stay|no offer). Rank by the effect the offer CAUSES, not by risk. Needs a randomised control; measured by Qini or uplift@k.`},{front:`Goodhart defences`,back:`Guardrail metrics declared in advance (a regression is a veto), report a pair never a single number, and treat a saturating metric as an exhausted proxy.`}],mindmapMarkdown:`- Pick the metric
  - The drill
    - what decision, who acts
    - what base rate
    - what does each error cost
    - what capacity exists
    - what operating point follows
  - Case 1: fraud (0.2%)
    - always-negative accuracy 0.9980
    - A 0.9983, B 0.9981 -> accuracy is blind
    - ROC-AUC 0.914 for BOTH -> also blind
    - PR-AUC 0.334 vs 0.239 -> separates
    - precision@200 0.325 vs 0.240, 65 vs 48 caught
    - cost: 0.5 -> 1,089,080; t=0.005 -> 491,280
    - but 4,282 alerts vs capacity 200
  - Case 2: screening
    - recall dominates -> F2 or recall at a precision floor
    - "maximise recall" is gameable: threshold 0 -> 1.000
    - calibration is a SEPARATE axis
  - Case 3: search
    - NDCG@10
    - proxy trap: clicks -> clickbait
  - Case 4: churn with a budget
    - NOT probability of churn
    - uplift = P(stay|offer) - P(stay|no offer)
    - Qini / uplift@k, needs a randomised control
  - Goodhart
    - guardrails declared in advance
    - always report a PAIR`};export{e as default};