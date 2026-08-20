import type { Module } from '../types'

const m: Module = {
  id: 'ml-l2-class-imbalance',
  subjectId: 'ml',
  level: 2,
  title: 'Class Imbalance: When 99% Accuracy Is Worthless',
  whyItMatters:
    'Fraud, disease, churn, ad clicks — every problem worth money has a rare positive class, and every one of them breaks accuracy. This is the interview question "accuracy 99% but the model is useless — why?", and the answer separates people who read the confusion matrix from people who read `.score()`. It is also where most resume projects quietly leak data.',
  estMinutes: 45,
  sections: [
    {
      type: 'intuition',
      title: 'The model that does nothing and scores 99%',
      md: `Fraud dataset: 1,000,000 transactions, 10,000 are fraud. That is 1% positives.

- I write a model. One line. It always returns "not fraud".
- Accuracy: 990,000 / 1,000,000 = **99%**.
- It catches **zero** fraud. It is worth exactly nothing.
- Any model you build must beat 99% just to *tie* with doing nothing.
- Accuracy did not lie — it answered a question nobody asked: "what fraction of rows did you label right?" Nobody cares. They care about the 1%.`,
    },
    {
      type: 'note',
      md: `Habit to build now: before reporting any accuracy, compute the **majority-class baseline** — the accuracy of always predicting the most common label. It is just \`1 - positive_rate\`. If your model does not beat it by a wide margin on the metrics that matter, you have not built anything. Interviewers ask for this number by name.`,
    },
    {
      type: 'intuition',
      title: 'Where the rare class lives',
      md: `Imbalance is not an edge case. It is what real labels look like.

- **Credit-card fraud**: ~0.1–0.2% positive. The bank's whole business is that 0.1%.
- **Disease screening**: 0.5–2% positive. A missed cancer is not the same as a false alarm.
- **Ad / email click**: 1–5% positive. Billions of impressions, few clicks.
- **Manufacturing defects, churn, spam-account signups**: same shape.
- The pattern: the class you *care about* is the class you have *least of*. That is not a coincidence — rare things are interesting things.`,
    },
    {
      type: 'intuition',
      title: 'What to measure instead',
      md: `Stop asking "how many rows right?". Ask two questions about the positives only.

- **Precision** — of the alarms I raised, how many were real? (Wasted-effort cost.)
- **Recall** — of the real positives out there, how many did I catch? (Missed-fraud cost.)
- **F1** — their harmonic mean. One number when you must have one number; it punishes a lopsided pair, so 1.0 precision with 0.0 recall scores 0.
- **PR-AUC** (average precision) — precision/recall traded across *every* threshold. This is the headline number for imbalanced problems.
- Note what all four ignore: **true negatives**. The 990,000 boring rows never enter the formulas. That is the whole point.`,
    },
    {
      type: 'math',
      intro: 'The four numbers of the confusion matrix, and why ROC flatters you here.',
      latex: [
        '\\text{Precision} = \\frac{TP}{TP + FP} \\qquad \\text{Recall} = \\frac{TP}{TP + FN} \\qquad F_1 = 2\\,\\frac{P \\cdot R}{P + R}',
        '\\text{FPR} = \\frac{FP}{FP + TN}',
        '\\text{With } TN \\approx 990{,}000, \\text{ raising } FP \\text{ by } 5{,}000 \\text{ moves FPR by } 0.005. \\text{ ROC barely notices.}',
      ],
    },
    {
      type: 'note',
      md: `That last line is the honest caveat about **ROC-AUC**: its x-axis is FPR, whose denominator is the enormous negative class. Thousands of new false alarms move the curve almost not at all, so ROC-AUC stays flattering (0.95+) on models that are useless in production. PR-AUC puts *precision* on the y-axis — precision's denominator is only the rows you flagged, so it reacts immediately. Rule: report both, decide on PR-AUC. Full treatment of both curves lives in the **Metrics & Losses** subject; here, just know which one to trust.`,
    },
    {
      type: 'intuition',
      title: 'Three families of fixes',
      md: `Everything anyone does about imbalance is one of three moves. Know which knob each one turns.

- **Resampling** — change the *data* so the classes look balanced.
- **Class weights / cost-sensitive learning** — change the *loss* so minority mistakes hurt more.
- **Threshold moving** — change the *decision rule*, leave data and model alone.
- They are not exclusive; they are ordered by how much damage they can do. Start with the last two.`,
    },
    {
      type: 'intuition',
      title: 'Fix 1: resampling — undersample, oversample, SMOTE',
      md: `Rebalance by editing the training set. Three flavours, three different regrets.

- **Random undersampling**: drop majority rows until the ratio is sane. Fast, trains quicker, and you *throw away real data* — only sensible when the majority class is genuinely huge (millions of rows, so the discarded ones were redundant anyway).
- **Random oversampling**: duplicate minority rows. Keeps all data, but the model sees the same 30 fraud rows forty times each and memorizes them — classic overfitting; train accuracy soars, test recall does not.
- **SMOTE** (Synthetic Minority Over-sampling TEchnique): instead of copying, *invent* new minority points.
- The mechanism: take a minority point, find its k nearest minority neighbours, pick one, and place a new point somewhere on the straight line between them.
- Result: a filled-in minority region rather than forty stacked copies of one point.`,
    },
    {
      type: 'math',
      intro: 'One SMOTE point. That is the entire algorithm.',
      latex: [
        'x_{\\text{new}} = x_i + \\lambda\\,(x_{nn} - x_i), \\qquad \\lambda \\sim U(0, 1)',
        'x_{nn} \\in \\text{k nearest minority neighbours of } x_i \\quad (k = 5 \\text{ by default})',
      ],
    },
    {
      type: 'note',
      md: `SMOTE's two failure modes, both interview-grade. **(1) Nonsense points.** Interpolation assumes the space between two minority points is also minority. That breaks on categorical features (halfway between "Delhi" and "Mumbai" is not a city) and in high dimensions, where nearest neighbours are far away and the line between them crosses majority territory — you manufacture label noise. Variants exist (SMOTE-NC for categoricals, Borderline-SMOTE), but the honest answer is that SMOTE shines on low-dimensional, continuous, mildly imbalanced data. **(2) It must run inside the CV fold** — the next section.`,
    },
    {
      type: 'intuition',
      title: 'The leak that inflates every resume project',
      md: `The bug: you oversample the whole dataset, *then* split into train and test.

- Oversampling copies (or interpolates near) minority rows.
- A copy lands in train. Its original lands in test.
- Your model has literally memorized a test row. The score is fiction.
- Same trap with SMOTE: a synthetic point in train sits millimetres from its parent in test.
- The rule, no exceptions: **split first, then resample the training fold only**. In k-fold CV that means resampling *inside* each fold, which is exactly what an imbalanced-learn \`Pipeline\` is for.
- The tell in an interview: someone reports 0.97 F1 on a 1% fraud dataset. Ask them when they ran SMOTE.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Prove the leak: same data, same model, two orderings',
      code: `import numpy as np
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import f1_score

X, y = make_classification(n_samples=4000, n_features=10, n_informative=4, n_redundant=0,
                           n_clusters_per_class=1, weights=[0.98], flip_y=0.0,
                           class_sep=0.35, random_state=0)
rng = np.random.default_rng(0)

def oversample(Xa, ya):                      # stand-in for SMOTE: duplicate minority
    pos = np.flatnonzero(ya == 1)
    take = rng.choice(pos, (ya == 0).sum() - len(pos))
    return np.vstack([Xa, Xa[take]]), np.concatenate([ya, ya[take]])

Xw, yw = oversample(X, y)                    # WRONG: resample, THEN split
for tag, (Xd, yd, inner) in {'leaky ': (Xw, yw, False), 'honest': (X, y, True)}.items():
    scores = []
    for tr, te in StratifiedKFold(5, shuffle=True, random_state=0).split(Xd, yd):
        Xt, yt = oversample(Xd[tr], yd[tr]) if inner else (Xd[tr], yd[tr])
        scores.append(f1_score(yd[te], LogisticRegression(max_iter=3000).fit(Xt, yt).predict(Xd[te])))
    print(tag, 'CV F1 = %.3f' % np.mean(scores))

# ---- real output ----
# leaky  CV F1 = 0.879
# honest CV F1 = 0.282`,
      annotations: {
        12: 'Plain duplication, not SMOTE — imbalanced-learn is not needed to show the bug, and SMOTE leaks the same way.',
        17: 'The whole bug in one line: resampling happens before any split, so duplicates get scattered across every fold.',
        21: 'The fix: resample only the training indices, freshly, inside each fold. The test fold keeps its real 2% ratio.',
        27: '0.879 vs 0.282. The leaky number is not "a bit optimistic" — it is three times the truth.',
      },
    },
    {
      type: 'intuition',
      title: 'Fix 2: class weights — the first thing to try',
      md: `Do not touch the data. Touch the loss.

- Every misclassified minority row gets multiplied by a weight before it enters the loss.
- \`class_weight='balanced'\` in scikit-learn sets that weight to \`n_samples / (n_classes * n_class_samples)\` — at 1% positives, each fraud row counts ~50×, each normal row ~0.5×.
- XGBoost/LightGBM spell it \`scale_pos_weight\` (typically negatives ÷ positives).
- Effect: "always predict negative" stops being cheap. The model must catch positives or eat a 50× penalty.
- Why try it first: no rows invented, none discarded, no leakage surface, one keyword argument. If it is enough, you are done.`,
    },
    {
      type: 'math',
      intro: 'Weighted cross-entropy — one extra factor, that is all cost-sensitive learning is.',
      latex: [
        'L = -\\frac{1}{N}\\sum_{i=1}^{N} w_{y_i}\\left[\\, y_i \\log \\hat{p}_i + (1 - y_i)\\log(1 - \\hat{p}_i) \\,\\right]',
        'w_c = \\frac{N}{K \\cdot n_c} \\quad\\Longrightarrow\\quad 1\\% \\text{ positives}, K = 2:\\;\\; w_1 = 50,\\;\\; w_0 \\approx 0.505',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The 99% trap and the class-weight fix, with real numbers',
      code: `from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, confusion_matrix

X, y = make_classification(n_samples=20000, n_features=10, n_informative=4,
                           n_redundant=0, n_clusters_per_class=1, weights=[0.99],
                           flip_y=0.0, class_sep=0.35, random_state=0)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, stratify=y, random_state=0)
print('test rows=%d  frauds=%d' % (len(yte), yte.sum()))
print('always-negative   acc=%.4f  recall=0.000  caught=0/%d' % (1 - yte.mean(), yte.sum()))

for w in (None, 'balanced'):
    clf = LogisticRegression(max_iter=3000, class_weight=w).fit(Xtr, ytr)
    p = clf.predict(Xte)
    tn, fp, fn, tp = confusion_matrix(yte, p).ravel()
    print('class_weight=%-9s acc=%.4f  prec=%.3f  recall=%.3f  caught=%d/%d  false_alarms=%d'
          % (w, accuracy_score(yte, p), precision_score(yte, p, zero_division=0),
             recall_score(yte, p), tp, tp + fn, fp))

# ---- real output ----
# test rows=6000  frauds=60
# always-negative   acc=0.9900  recall=0.000  caught=0/60
# class_weight=None      acc=0.9965  prec=1.000  recall=0.650  caught=39/60  false_alarms=0
# class_weight=balanced  acc=0.9707  prec=0.231  recall=0.833  caught=50/60  false_alarms=166`,
      annotations: {
        7: 'weights=[0.99] makes 99% of rows negative — 1% fraud, the realistic shape.',
        9: 'stratify=y is not optional here. Without it a random split can hand a fold almost no positives.',
        11: 'The do-nothing baseline, printed on purpose. Every imbalance report should start with this line.',
        14: 'One keyword. No rows added, none removed, nothing to leak — this is why it is the first thing to try.',
        25: 'Accuracy fell 2.6 points and the model got BETTER: 50 frauds caught instead of 39. Precision paid for it (1.00 -> 0.23, 166 false alarms). That trade is a business decision, not a modelling one.',
      },
    },
    {
      type: 'note',
      md: `Read those three lines like an interviewer would. The untouched model scores **99.65%** — a whole 0.65 points above a model that does nothing — and misses 21 of 60 frauds. The balanced model scores **97.07%**, which is *below* the do-nothing baseline, and is obviously the better model. If your evaluation cannot express "lower accuracy, better model", your evaluation is broken.`,
    },
    {
      type: 'intuition',
      title: 'Fix 3: threshold moving — usually the model was fine',
      md: `Before you resample anything, check whether the problem is the model or the number 0.5.

- A classifier outputs a **probability**. Turning it into a label needs a cutoff, and everyone silently uses 0.5.
- 0.5 is the right cutoff for one situation only: balanced classes and equal error costs. You have neither.
- The ranking may already be excellent — good PR-AUC — while the labels at 0.5 are useless because almost nothing crosses it.
- So: sweep the threshold, draw the precision-recall curve, and pick the point your business actually wants.
- "We need 90% recall" → read off the threshold that delivers it and accept the precision that comes with it.
- Cheap, reversible, no retraining, no invented data. This is the answer interviewers are waiting for.`,
    },
    { type: 'visual', component: 'ConfusionMatrixLab', props: {} },
    {
      type: 'note',
      md: `That slider *is* fix 3. Drag it left: recall climbs toward 1.0 — you catch every fraud — while precision collapses, because you are also flagging thousands of honest customers. Drag it right: precision approaches 1.0 and recall dies — you are only flagging the blatant cases. There is no setting where both are 1.0; you are choosing a point on a curve. Notice too how sluggishly the ROC curve responds compared to precision. Choosing that point is the job.`,
    },
    {
      type: 'math',
      intro: 'How to choose the point — not by F1, by money.',
      latex: [
        't^{*} = \\arg\\min_{t} \\;\\; C_{FN}\\cdot FN(t) \\;+\\; C_{FP}\\cdot FP(t)',
        '\\text{Fraud: } C_{FN} = \\text{₹}8{,}000 \\text{ (refund)}, \\; C_{FP} = \\text{₹}50 \\text{ (a review) } \\Rightarrow \\text{ threshold goes low.}',
      ],
    },
    {
      type: 'intuition',
      title: 'Evaluation discipline: stratify everything',
      md: `A fix you cannot measure is not a fix. With 1% positives, sloppy splitting destroys the measurement.

- **Stratified train/test split** (\`stratify=y\`): each side keeps the same positive rate.
- **StratifiedKFold**, not KFold: every fold contains positives. With 30 positives and 5 plain folds, some fold gets 2 — and its recall estimate is noise.
- **Repeat the CV** (different seeds) and report the spread. On rare classes the fold-to-fold variance is often bigger than the difference between your models.
- Never resample the validation fold. It must keep the real-world ratio, or your precision estimate is fantasy.
- Time-ordered data (fraud, clicks) overrides all of this: split by time, not at random, or you train on tomorrow.`,
    },
    {
      type: 'intuition',
      title: 'When positives are almost extinct',
      md: `At 0.01% positives — a handful of examples total — supervised classification stops being the right frame.

- There is not enough signal to learn "what fraud looks like", so learn "what normal looks like" and flag anything that is not.
- That is **anomaly detection**: one-class SVM, autoencoder reconstruction error, and **Isolation Forest** — covered in the Level 3 module *PCA, t-SNE & Anomaly Detection*.
- Naming this pivot in an interview shows you know when the tool changes, not just how to turn its knobs.`,
    },
    {
      type: 'intuition',
      title: 'The sentence that makes you sound senior',
      md: `Before writing a line of code, ask: **what does a false negative cost, and what does a false positive cost?**

- Cancer screening: false negative = a missed tumour. False positive = an anxious patient and a biopsy. Optimize **recall**, hard.
- Spam filter: false negative = one spam in the inbox. False positive = the user's job offer in the spam folder. Optimize **precision**.
- Card fraud: false negative = ₹8,000 refunded. False positive = a ₹50 manual review. Recall wins, but only until false alarms swamp the review team — which caps it.
- Every choice in this module — the weight, the threshold, whether F1 or PR-AUC — falls out of that ratio.
- A junior says "I used SMOTE and got F1 up". A senior says "a miss costs 160× a false alarm, so I set the threshold at 90% recall and checked the review team could handle the volume".`,
    },
  ],
  quiz: [
    {
      question: 'A dataset is 0.5% fraud. Your model reports 99.5% accuracy. What is the first thing you should conclude?',
      options: [
        {
          text: 'It may have learned nothing — always predicting "not fraud" also scores 99.5%',
          explanation: 'Correct. The majority-class baseline is 1 − 0.005 = 99.5%. The model has not been shown to beat doing nothing. Check recall and PR-AUC.',
        },
        { text: 'The model is excellent and ready to ship', explanation: 'Accuracy on a 0.5% positive rate carries almost no information about the class you care about.' },
        { text: 'The model is overfitting', explanation: 'Possible but unsupported — this number is equally consistent with a model that never predicts positive at all.' },
      ],
      correct: 0,
    },
    {
      question: 'Why does ROC-AUC look flattering under heavy imbalance while PR-AUC does not?',
      options: [
        { text: 'ROC-AUC is computed on the training set', explanation: 'No — both are computed the same way on whatever set you pass. The difference is in the axes.' },
        { text: 'ROC-AUC ignores the model probabilities', explanation: 'Wrong — both curves are built by sweeping a threshold over the probabilities.' },
        {
          text: 'ROC uses FPR, whose denominator is the huge negative class, so thousands of false alarms barely move it',
          explanation: 'Correct. FPR = FP/(FP+TN) with TN in the hundreds of thousands. Precision uses TP/(TP+FP) — only flagged rows — so it drops immediately.',
        },
      ],
      correct: 2,
    },
    {
      question: 'You run SMOTE on the full dataset and then do a 5-fold CV. F1 comes out at 0.88. What is wrong?',
      options: [
        { text: 'Nothing — SMOTE before CV is the standard recipe', explanation: 'It is a common recipe and it is wrong. It is the single most frequent bug in imbalance projects.' },
        {
          text: 'Synthetic points derived from a row can land in the training folds while that row is in the validation fold — the score is leaked',
          explanation: 'Correct. The model effectively memorizes near-copies of validation rows. Resample inside each training fold only; the honest score is usually far lower.',
        },
        { text: 'SMOTE needs the test set too, so 5 folds is too few', explanation: 'The test/validation fold must never be resampled — it has to keep the real class ratio.' },
      ],
      correct: 1,
    },
    {
      question: "In scikit-learn, what does class_weight='balanced' actually change?",
      options: [
        {
          text: 'It multiplies each class’s contribution to the loss by n_samples / (n_classes × n_class_samples)',
          explanation: 'Correct. At 1% positives that is ~50× for the minority, ~0.5× for the majority. The data is untouched; only the loss changes.',
        },
        { text: 'It duplicates minority rows until the classes are equal', explanation: 'That is random oversampling. class_weight adds no rows at all — which is exactly why it cannot leak.' },
        { text: 'It moves the decision threshold to the optimal value', explanation: 'It shifts where the fitted boundary lands, but the prediction threshold stays 0.5. Threshold moving is a separate, complementary fix.' },
      ],
      correct: 0,
    },
    {
      question: 'Your model has PR-AUC 0.62 but at threshold 0.5 it predicts positive for almost nothing. Best first move?',
      options: [
        { text: 'Collect more data — the model has not learned', explanation: 'PR-AUC 0.62 on a rare class means the ranking is genuinely informative. The learning is not the problem.' },
        { text: 'Apply SMOTE and retrain', explanation: 'Possible later, but it changes your data and adds a leakage surface to fix a problem that is not in the data.' },
        {
          text: 'Lower the threshold using the precision-recall curve',
          explanation: 'Correct. Good PR-AUC with useless labels is the textbook symptom of a bad cutoff, not a bad model. Pick the threshold from the curve at the recall the business needs.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Which situation makes random undersampling the reasonable choice?',
      options: [
        {
          text: 'Tens of millions of majority rows and a training loop that is too slow to use them all',
          explanation: 'Correct. When the majority is enormous the discarded rows are largely redundant, and you buy a big speedup. That is the one clean win.',
        },
        { text: 'A small dataset with 400 rows total', explanation: 'Backwards — undersampling would throw away data you cannot spare. Use class weights there.' },
        { text: 'Features that are mostly categorical', explanation: 'That is an argument against SMOTE (interpolating categories is nonsense), not an argument for undersampling.' },
      ],
      correct: 0,
    },
    {
      question: 'Why is StratifiedKFold, not plain KFold, mandatory when positives are 1%?',
      options: [
        { text: 'It is faster on imbalanced data', explanation: 'Speed is identical — stratification only changes which rows land in which fold.' },
        { text: 'It oversamples the minority class in each fold', explanation: 'It does no resampling whatsoever. It only preserves the class proportions.' },
        {
          text: 'It guarantees every fold holds a representative share of positives, so per-fold recall is measurable at all',
          explanation: 'Correct. Random folds can end up with one or two positives — or none — making recall estimates pure noise or undefined.',
        },
      ],
      correct: 2,
    },
    {
      question: 'A cancer screen misses 3 tumours but raises 200 false alarms; an alternative misses 12 and raises 20. Which do you ship, and on what grounds?',
      options: [
        { text: 'The second — far fewer false alarms means higher precision', explanation: 'Precision is the wrong objective here. A false alarm costs a follow-up test; a miss can cost a life.' },
        {
          text: 'The first, because a false negative costs vastly more than a false positive here',
          explanation: 'Correct. Name the cost ratio before the metric: in screening, recall dominates, bounded only by how many follow-ups the system can absorb.',
        },
        { text: 'Whichever has the higher F1', explanation: 'F1 weights precision and recall equally — an assumption that is simply false in medicine. Use the cost ratio, or F-beta with beta > 1.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: '"My model has 99% accuracy but it is useless." Explain why, and what you would report instead.',
      answer:
        'Because accuracy counts all rows equally while the positive class is 1% of them — a constant "negative" predictor already scores 99%, so accuracy cannot distinguish a real model from no model. Report against the majority-class baseline, and lead with metrics that ignore true negatives: precision, recall, F1 (or F-beta with the right beta), and PR-AUC across thresholds. Include the raw confusion matrix — "caught 50 of 60 frauds at 166 false alarms" communicates more to a stakeholder than any single float.',
      isCaseBased: false,
    },
    {
      question: 'Rank class weights, resampling, and threshold moving in the order you would try them, and justify the ordering.',
      answer:
        'Threshold moving and class weights first, resampling last. Threshold moving costs nothing — no retraining, fully reversible, and it often turns out the probabilities were fine and only the 0.5 cutoff was wrong. Class weights are one keyword argument, add no rows and remove none, so there is no leakage surface and no distribution distortion. Resampling last because it is the only one that alters the data: undersampling discards real information, oversampling invites memorization, and SMOTE both fabricates points and introduces the classic split-order leak. Ordering by "least damage that could work" is the point being tested.',
      isCaseBased: false,
    },
    {
      question: 'Explain SMOTE end to end, then tell me when you would refuse to use it.',
      answer:
        'For a minority point x_i, find its k nearest minority neighbours (k=5 default), pick one at random, and create x_new = x_i + λ(x_nn − x_i) with λ ~ U(0,1) — a point on the segment between them. Repeat until the ratio is acceptable. Refuse when: features are categorical or mixed (interpolating between two category codes produces a row that cannot exist — SMOTE-NC exists but is a patch); dimensionality is high (nearest neighbours are far apart, so the segment crosses majority territory and you manufacture label noise); the minority is extremely rare (a handful of points cannot outline a region — switch to anomaly detection); or the minority is genuinely multi-modal, where interpolating across two distinct fraud patterns invents a third that does not exist.',
      isCaseBased: false,
    },
    {
      question: 'Case: a candidate reports 0.95 F1 on a credit-card fraud dataset with 0.17% positives. What do you ask first?',
      answer:
        'When SMOTE (or any resampling) ran relative to the split. 0.95 F1 at 0.17% positives is near-impossible honestly, and the overwhelmingly likely cause is resampling before splitting, so near-duplicate minority rows sit in both train and test. Follow-ups: was the validation fold resampled (it must not be)? Was scaling or feature selection fit on the full dataset? For a time-ordered dataset, was the split random instead of by time? The test is whether you treat a suspiciously good number as a bug report rather than a result.',
      isCaseBased: true,
    },
    {
      question: 'Case: fraud model, offline PR-AUC 0.71, ships, and the review team drowns in alerts within a week. Debug it.',
      answer:
        'PR-AUC is threshold-free, so a good PR-AUC guarantees nothing about the operating point actually deployed — that is hypothesis one: the threshold was chosen by maximising F1 (an arbitrary equal-cost assumption) instead of by capacity. Compute the alerts-per-day implied by the chosen threshold and compare it against how many the team can process; set the threshold from that budget instead, or send only the top-N scores per day. Hypothesis two: the offline positive rate does not match production (validation folds were resampled, or the offline sample was enriched with fraud), so precision estimates were inflated — precision is prevalence-dependent in a way recall is not. Hypothesis three: drift — fraud patterns move fast, so a threshold calibrated on last quarter has a different precision today; monitor score distributions and recalibrate on a schedule.',
      isCaseBased: true,
    },
    {
      question: 'When is F1 the wrong summary metric, and what replaces it?',
      answer:
        'F1 is the harmonic mean with precision and recall weighted equally — a hidden assumption that a miss and a false alarm cost the same. They almost never do. Replace with F-beta (beta > 1 leans toward recall for medical screening, beta < 1 toward precision for spam), or skip single numbers and minimise expected cost directly: C_FN·FN + C_FP·FP. When you must compare models before fixing an operating point, PR-AUC is the better threshold-free summary; F1 at 0.5 conflates model quality with an arbitrary cutoff.',
      isCaseBased: false,
    },
    {
      question: 'Does class_weight="balanced" change the model\'s ranking of examples, or only the labels it emits?',
      answer:
        'Mostly the latter, and this is a genuinely useful thing to know. Reweighting changes the fitted parameters, so the ranking does shift somewhat — but for a well-specified model the dominant effect is equivalent to shifting the decision boundary, i.e. relabelling the same ordering. Hence class weights and threshold moving often achieve very similar results, and stacking both can overshoot into far too many false alarms. Ranking metrics (ROC-AUC, PR-AUC) frequently barely budge under reweighting while recall at 0.5 jumps — a strong hint that the fix was really about the operating point all along. A side effect worth mentioning: reweighting decalibrates the probabilities, so if you need true probabilities downstream, prefer threshold moving or recalibrate afterwards.',
      isCaseBased: false,
    },
    {
      question: 'How do you choose a decision threshold in a way you can defend to a product manager?',
      answer:
        'Not by maximising F1. Get the two costs: what a false negative costs and what a false positive costs, in the same units, plus any hard capacity constraint (how many alerts a human team can process per day). Then sweep the threshold on validation data, compute expected cost at each point, and pick the minimum — or, under a capacity constraint, the threshold that fills exactly the available review budget. Present it as "at this cutoff we catch 83% of fraud and generate ~170 reviews per 6,000 transactions", never as a number. Recheck it after any retraining, because the score distribution moves even when the metrics do not.',
      isCaseBased: false,
    },
    {
      question: 'At what point do you stop treating a problem as imbalanced classification and switch to anomaly detection?',
      answer:
        'When the absolute count of positives — not the ratio — is too small to characterise the class: on the order of tens of examples, or when positives are heterogeneous (every fraud is novel, so a classifier fitting known patterns will not generalise to new ones). Then flip the framing: model the majority ("normal") and score deviation from it — Isolation Forest, one-class SVM, autoencoder reconstruction error. Tradeoff: you give up label supervision, so precision is usually poor and the output is a ranked list for human triage rather than a decision. Hybrids are common in production: anomaly score as a feature inside a supervised model, so it can exploit whatever labels do exist.',
      isCaseBased: false,
    },
    {
      question: 'Case: you inherit a churn model. Offline recall 0.80; in production it flags almost nobody. The code is unchanged. What is happening?',
      answer:
        'Recall at a fixed threshold depends on the score distribution, so look for whatever moved it. (1) Train/serve skew: a feature is computed differently online — a missing value that becomes 0, a different scaler, a stale lookup — dragging scores down; verify by scoring the same rows through both paths and diffing. (2) The offline evaluation set was resampled or enriched, so the model was tuned on a class ratio production never had. (3) Drift: the population changed (new pricing, new customer mix), shifting scores under a threshold that was never recalibrated. (4) Label lag: churn "positives" arrive 60 days late, so recent production performance simply is not measurable yet and the flagging is fine. Diagnostic order: compare score histograms offline vs online first — that one plot separates skew and drift from evaluation bugs immediately.',
      isCaseBased: true,
    },
    {
      question: 'Why is precision affected by class prevalence while recall is not, and why does that matter operationally?',
      answer:
        'Recall = TP/(TP+FN) is computed entirely within the positive class, so changing how many negatives exist does not touch it. Precision = TP/(TP+FP) has false positives in its denominator, and those are drawn from the negative population — so halving the fraud rate roughly halves precision at the same threshold, with no change to the model. Operationally: precision measured on a resampled or fraud-enriched validation set is meaningless for production; PR curves must be computed at the real prevalence; and a precision drop in production may reflect a shift in base rate rather than model decay. This is also why you never resample the validation fold.',
      isCaseBased: false,
    },
    {
      question: 'Undersampling versus oversampling: what breaks in each, and how do you decide?',
      answer:
        'Undersampling drops majority rows — variance goes up because you trained on less data, and you may delete exactly the hard negatives near the boundary that the model most needed. Acceptable when the majority is in the millions, where those rows were redundant and the speedup is real; informed variants (Tomek links, edited nearest neighbours) target which rows to drop. Oversampling duplicates minority rows — no information is added, but the model can memorise the copies, so train metrics inflate while test recall stagnates, and it costs training time proportional to the duplication factor. Decision rule: absolute minority count is what matters. A few hundred positives and millions of negatives, undersample. A few dozen positives, do not resample at all — use class weights and move the threshold, because no resampling scheme creates information that is not there.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Majority-class baseline', back: 'Accuracy of always predicting the common class = 1 − positive_rate. At 1% positives that is 99%. Report it before any model score.' },
    { front: 'Why accuracy dies on imbalance', back: 'It counts all rows equally, and 99% of rows are the class nobody cares about. True negatives drown out everything.' },
    { front: 'Precision vs recall in one line', back: 'Precision = of what I flagged, how much was real (TP/(TP+FP)). Recall = of what was real, how much I caught (TP/(TP+FN)).' },
    { front: 'ROC-AUC vs PR-AUC on imbalance', back: 'ROC uses FPR = FP/(FP+TN); the giant TN makes it move slowly, so ROC-AUC flatters. PR-AUC uses precision — reacts instantly. Decide on PR-AUC.' },
    { front: 'The three families of fixes', back: 'Resampling (change the data), class weights (change the loss), threshold moving (change the decision rule). Try the last two first.' },
    { front: "class_weight='balanced'", back: 'Weight per class = n_samples/(n_classes × n_class_samples). At 1% positives ≈ 50× on the minority. XGBoost/LightGBM: scale_pos_weight.' },
    { front: 'SMOTE in one formula', back: 'x_new = x_i + λ(x_nn − x_i), λ ~ U(0,1), x_nn a nearest minority neighbour. Interpolate, do not duplicate.' },
    { front: 'SMOTE caveats', back: 'Nonsense points on categorical/high-dim data (neighbours are far, the segment crosses majority space), and it MUST run inside the CV fold.' },
    { front: 'The classic resume-project leak', back: 'Resample before splitting → copies land in train and their originals in test → inflated score. Real demo: CV F1 0.879 leaky vs 0.282 honest.' },
    { front: 'The senior opening line', back: '"What does a false negative cost versus a false positive?" Weight, threshold, and metric all fall out of that ratio.' },
  ],
  mindmapMarkdown: `- Class Imbalance: When 99% Accuracy Is Worthless
  - The trap
    - always-negative scores 99%
    - catches zero fraud
    - majority baseline = 1 − positive rate
  - Where it lives
    - fraud 0.1%, disease 1%, clicks 1–5%
    - rare = the class you care about
  - Measure instead
    - precision, recall, F1
    - PR-AUC = headline metric
    - all ignore true negatives
    - ROC-AUC flatters (FPR has huge TN)
  - Fix 1: resampling
    - undersample: fast, throws data away
    - oversample: duplicates, overfits
    - SMOTE: interpolate to a neighbour
    - caveat: categorical / high-dim nonsense
    - caveat: MUST run inside the CV fold
  - Fix 2: class weights
    - class_weight='balanced', scale_pos_weight
    - minority mistake counts ~50×
    - data untouched → no leakage
    - try this first
  - Fix 3: threshold moving
    - 0.5 is an arbitrary default
    - pick from the PR curve
    - minimise C_FN·FN + C_FP·FP
    - the mature interview answer
  - Evaluation discipline
    - stratified split and StratifiedKFold
    - never resample the validation fold
    - time-ordered data → split by time
  - Very rare positives
    - anomaly detection framing
    - Isolation Forest (unsupervised module)
  - Business framing first
    - cost of a miss vs a false alarm
    - review-team capacity caps recall`,
}

export default m
