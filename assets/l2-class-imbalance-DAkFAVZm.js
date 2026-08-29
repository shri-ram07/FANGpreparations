var e={id:`ml-l2-class-imbalance`,subjectId:`ml`,level:2,title:`Class Imbalance`,whyItMatters:`Fraud, disease, spam, churn — the thing you want to find is almost always the rare thing. Every fix comes down to one of three levers, and knowing which one you pulled is most of the skill.`,assumes:[`You know precision and recall (Metrics → The Confusion Matrix)`,`You have seen a model trained in scikit-learn: fit, then predict`],estMinutes:24,sections:[{type:`intuition`,title:`What class imbalance is`,md:`**Class imbalance** is when one label appears far more often than the other — 980 normal transactions against 20 frauds.

It breaks accuracy, because accuracy counts the boring rows. A model that ignores its input and always answers "not fraud" gets 980 of 1,000 right.

**98% accuracy, zero frauds caught.** That is the whole problem in one number, and here it is counted rather than claimed.`},{type:`code`,lang:`python`,title:`The 98% trap, counted`,code:`labels = [1] * 20 + [0] * 980
guesses = [0] * 1000

correct = 0
for i in range(1000):
    if guesses[i] == labels[i]:
        correct = correct + 1

caught = 0
for i in range(1000):
    if guesses[i] == 1 and labels[i] == 1:
        caught = caught + 1

print('accuracy', correct, '/ 1000 =', correct / 1000)
print('fraud caught', caught, 'out of 20')

# ---- real output ----
# accuracy 980 / 1000 = 0.98
# fraud caught 0 out of 20`,annotations:{1:`[1] * 20 + [0] * 980 builds a list by repetition: twenty 1s followed by 980 0s. This is the truth.`,2:`Every guess is 0. The "model" has no input and no logic — it is the do-nothing baseline.`,15:`0.98 and 0. Any model you build has to beat 0.98 accuracy just to look like it is trying, which is why accuracy is the wrong scoreboard here.`}},{type:`math`,intro:`The two numbers that ignore the boring rows. TP is a caught positive, FP a false alarm, FN a miss. Note that TN — the 980 rows the do-nothing model got right — appears in neither formula, which is exactly why they survive imbalance.`,latex:[`\\text{precision} = \\frac{TP}{TP + FP} \\qquad \\text{recall} = \\frac{TP}{TP + FN}`,`\\text{accuracy} = \\frac{TP + TN}{TP + TN + FP + FN} \\qquad \\text{(TN dominates when the negative class is 98\\%)}`]},{type:`intuition`,title:`Three places you can intervene, and only three`,md:`Everything ever done about imbalance changes one of three things:

- **The loss** — tell training that a miss on the rare class costs more (class weights).
- **The decision** — keep the model, move the cut-off that turns a probability into a label.
- **The data** — resample so the classes stop being lopsided before training starts.

All three are applied below to one shared dataset, so the numbers are comparable. The baseline first.`},{type:`code`,lang:`python`,title:`The shared dataset and an untouched baseline`,code:`from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import confusion_matrix

X, y = make_classification(n_samples=5000, n_features=8, n_informative=4,
                           n_redundant=0, n_clusters_per_class=1,
                           weights=[0.98], flip_y=0.0, class_sep=0.3,
                           random_state=0)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, stratify=y, random_state=0)
print('test rows', len(yte), ' fraud rows in test', yte.sum())
plain = LogisticRegression(max_iter=2000).fit(Xtr, ytr)
tn, fp, fn, tp = confusion_matrix(yte, plain.predict(Xte)).ravel()
print('caught', tp, ' missed', fn, ' false alarms', fp)

# ---- real output ----
# test rows 1500  fraud rows in test 30
# caught 13  missed 17  false alarms 0`,annotations:{8:`weights=[0.98] makes 98% of rows the negative class. class_sep=0.3 keeps the two classes genuinely hard to separate, so the numbers are not trivially good.`,10:`stratify=y keeps the same 98/2 ratio in both splits. Without it a random split could leave almost no positives in the test set and every number becomes noise.`,13:`.ravel() flattens the 2x2 confusion matrix into four numbers in the order tn, fp, fn, tp.`,15:`Caught 13 of 30, with zero false alarms. Precision is 13/13 = 1.000 and recall 13/30 = 0.433. The model learned something real — it is just extremely reluctant to speak.`}},{type:`code`,lang:`python`,title:`Lever 1 — change the loss: class weights`,code:`weighted = LogisticRegression(max_iter=2000, class_weight='balanced').fit(Xtr, ytr)
tn, fp, fn, tp = confusion_matrix(yte, weighted.predict(Xte)).ravel()
print('caught', tp, ' missed', fn, ' false alarms', fp)
print('precision %.3f' % (tp / (tp + fp)))
print('recall    %.3f' % (tp / (tp + fn)))

# ---- real output ----
# caught 26  missed 4  false alarms 236
# precision 0.099
# recall    0.867`,annotations:{1:`class_weight='balanced' scales each class's contribution to the loss by the inverse of its frequency, so one fraud row counts about 49 times a normal row.`,4:`%.3f is old-style string formatting: print the number with three decimal places. The %% pair after it would print a literal percent sign.`,8:`Recall jumps 0.433 to 0.867 — twice the frauds caught. Precision collapses 1.000 to 0.099, because it now raises 236 false alarms. Nothing was free; the trade was bought.`}},{type:`code`,lang:`python`,title:`Lever 2 — change the decision: one model, five cut-offs`,code:`prob = plain.predict_proba(Xte)[:, 1]
for t in [0.5, 0.2, 0.1, 0.05, 0.02]:
    pred = (prob >= t).astype(int)
    tn, fp, fn, tp = confusion_matrix(yte, pred).ravel()
    precision = tp / (tp + fp) if tp + fp > 0 else 0.0
    recall = tp / (tp + fn)
    print('t=%.2f  caught=%2d  false_alarms=%3d  precision=%.3f  recall=%.3f'
          % (t, tp, fp, precision, recall))

# ---- real output ----
# t=0.50  caught=13  false_alarms=  0  precision=1.000  recall=0.433
# t=0.20  caught=18  false_alarms=  0  precision=1.000  recall=0.600
# t=0.10  caught=22  false_alarms= 11  precision=0.667  recall=0.733
# t=0.05  caught=25  false_alarms= 63  precision=0.284  recall=0.833
# t=0.02  caught=27  false_alarms=226  precision=0.107  recall=0.900`,annotations:{1:`predict_proba returns a column per class; [:, 1] takes the probability of the positive class for every row.`,3:`(prob >= t) gives an array of True/False, and .astype(int) turns those into 1/0 labels. This is the entire thresholding step.`,14:"This is the SAME model — `plain`, already trained, never touched again. Only the cut-off moved.",16:`At t=0.20 you get 0.600 recall while still raising zero false alarms, which is strictly better than the default 0.5. The default threshold was never a considered choice.`}},{type:`code`,lang:`python`,title:`Lever 3 — change the data: oversample the TRAINING rows only`,code:`import numpy as np

rng = np.random.default_rng(0)
pos = np.flatnonzero(ytr == 1)
n_extra = (ytr == 0).sum() - len(pos)
take = rng.choice(pos, n_extra)
Xo = np.vstack([Xtr, Xtr[take]])
yo = np.concatenate([ytr, ytr[take]])
print('train rows', len(ytr), '->', len(yo), ' fraud rows', ytr.sum(), '->', yo.sum())
over = LogisticRegression(max_iter=2000).fit(Xo, yo)
tn, fp, fn, tp = confusion_matrix(yte, over.predict(Xte)).ravel()
print('caught', tp, ' missed', fn, ' false alarms', fp)

# ---- real output ----
# train rows 3500 -> 6860  fraud rows 70 -> 3430
# caught 25  missed 5  false alarms 219`,annotations:{4:`np.flatnonzero(ytr == 1) turns the True/False array into the row NUMBERS of the frauds. Those are the rows we will duplicate.`,6:`rng.choice draws n_extra of them WITH replacement, so the same fraud row is copied many times. No new information enters the dataset.`,7:`np.vstack stacks the copies underneath the original rows. Xtr[take] is fancy indexing: pull out exactly those rows, in that order.`,14:`70 fraud rows became 3,430 — but only 70 distinct ones. Caught 25 with 219 false alarms, landing close to class weighting, which is unsurprising: duplicating a row 49 times and counting it 49 times are nearly the same instruction.`}},{type:`visual`,component:`ConfusionMatrixLab`,props:{}},{type:`note`,label:`All three, side by side`,md:`Same test set, so these are directly comparable:

- **Baseline, cut-off 0.5** — precision 1.000, recall 0.433, 0 false alarms.
- **Class weights** — precision 0.099, recall 0.867, 236 false alarms.
- **Oversampling** — caught 25, missed 5, 219 false alarms.
- **Cut-off 0.20** — precision 1.000, recall 0.600, 0 false alarms.

Read that as a menu. None of them is "the fix"; each buys recall with precision at a different exchange rate, and the right one depends on what a miss costs against what a false alarm costs.`},{type:`code`,lang:`python`,title:`The classic mistake: resampling before the split`,code:`from sklearn.metrics import f1_score

def oversample(Xa, ya, seed):
    r = np.random.default_rng(seed)
    p = np.flatnonzero(ya == 1)
    t = r.choice(p, (ya == 0).sum() - len(p))
    return np.vstack([Xa, Xa[t]]), np.concatenate([ya, ya[t]])

Xall, yall = oversample(X, y, 1)
Xtr2, Xte2, ytr2, yte2 = train_test_split(Xall, yall, test_size=0.3,
                                          stratify=yall, random_state=0)
leaky = LogisticRegression(max_iter=2000).fit(Xtr2, ytr2)
print('leaky  F1 = %.3f' % f1_score(yte2, leaky.predict(Xte2)))
print('honest F1 = %.3f' % f1_score(yte, over.predict(Xte)))

# ---- real output ----
# leaky  F1 = 0.820
# honest F1 = 0.182`,annotations:{9:`Oversample the WHOLE dataset first, then split. This is the bug, and it looks completely reasonable when you write it.`,14:`0.820 against 0.182. Copies of the same fraud row now sit on both sides of the split, so the model is tested on rows it memorised in training. Same data, same algorithm, same real information — and a number four times too good.`}},{type:`note`,label:`The rule`,md:`**Split first. Resample only the training half. Never touch the test set.**

The leak is invisible in the code and enormous in the result, and it is the single most common way imbalance work goes wrong. It also applies to SMOTE, to undersampling, and to any augmentation step — anything that manufactures or removes rows belongs strictly inside the training fold.`}],quiz:[{question:`A model always predicts the majority class on data with 250 positives in 50,000 rows. What accuracy does it get?`,options:[{text:`0.5`,explanation:`That would be chance on a balanced dataset, which this is not.`},{text:`0.995`,explanation:`Correct. 49,750/50,000 = 0.995, with recall 0. That is the number any real model has to beat before it even looks like it is working.`},{text:`0.05`,explanation:`That is roughly the positive rate, not the accuracy.`},{text:`Undefined without a threshold`,explanation:`A constant predictor needs no threshold.`}],correct:1},{question:`Why do precision and recall survive imbalance when accuracy does not?`,options:[{text:`They are computed on a balanced subsample`,explanation:`They are computed on the whole test set, unchanged.`},{text:`Neither formula contains TN, so the 980 easy negatives cannot inflate them`,explanation:`Correct. Accuracy has TN in the numerator, which is why the do-nothing model scores 0.98.`},{text:`They use probabilities rather than labels`,explanation:`Both are computed from hard labels after thresholding.`},{text:`They are always higher than accuracy`,explanation:`Here the baseline's precision was 1.000 and recall 0.433 — one above accuracy, one far below.`}],correct:1},{question:`Class weighting took recall from 0.433 to 0.867. What did it cost?`,options:[{text:`Nothing — it is a strict improvement`,explanation:`Precision fell from 1.000 to 0.099, which is a very large cost.`},{text:`Precision, from 1.000 to 0.099, via 236 false alarms`,explanation:`Correct. Every imbalance fix buys recall with precision; the only question is the exchange rate.`},{text:`Training time only`,explanation:`The fit cost is unchanged; the trade is in the predictions.`},{text:`It required more data`,explanation:`The same training rows were used.`}],correct:1},{question:`At cut-off 0.20 the model caught 18 with zero false alarms; at 0.50 it caught 13 with zero. What does that show?`,options:[{text:`The model was retrained more effectively`,explanation:"Nothing was retrained — it is the same fitted `plain` model."},{text:`The default 0.5 was leaving free recall on the table`,explanation:`Correct. 0.5 is a convention, not an optimum, and here a better operating point cost nothing at all.`},{text:`Lower thresholds always improve both metrics`,explanation:`At 0.02 precision fell to 0.107 — the free lunch runs out quickly.`},{text:`The test set changed`,explanation:`Same 1,500 test rows throughout.`}],correct:1},{question:`Oversampling gave a leaky F1 of 0.820 and an honest F1 of 0.182. What went wrong in the leaky run?`,options:[{text:`The oversampling ratio was too aggressive`,explanation:`The honest run used the same ratio and scored 0.182.`},{text:`Duplicates of the same row landed in both train and test, so the model was scored on rows it had memorised`,explanation:`Correct. Resampling before splitting copies rows across the boundary, and the reported number becomes fiction.`},{text:`F1 is the wrong metric for imbalance`,explanation:`F1 is reasonable here; the split is what was broken.`},{text:`The random seed differed`,explanation:`A seed change moves a number slightly, not by a factor of four.`}],correct:1},{question:`Oversampling and class weighting landed on almost the same numbers. Why would you expect that?`,options:[{text:`Both effectively tell the loss to count a minority row many times over`,explanation:`Correct. Duplicating a row 49 times and weighting it 49× are nearly the same instruction to the optimiser.`},{text:`Coincidence of this particular seed`,explanation:`The correspondence is structural, not accidental.`},{text:`Both change the decision threshold`,explanation:`Neither touches the threshold; both act during training.`},{text:`Both add new information about the minority class`,explanation:`Neither adds any — oversampling copies rows that already existed.`}],correct:0}],interviewQuestions:[{question:`Your fraud model has 99% accuracy. Are you happy?`,answer:`Not until I know the base rate. If 1% of rows are fraud, a model that never flags anything scores 99% and catches nothing — that is the do-nothing baseline, not a result. I would ask for the confusion matrix and look at precision and recall, or at PR-AUC if I want a threshold-independent number. Accuracy on imbalanced data mostly measures the class ratio.`,isCaseBased:!0},{question:`What are the ways to handle class imbalance?`,answer:`Three levers, and it helps to name which one you pulled. Change the loss — class weights, or focal loss, so a minority error costs more. Change the decision — move the threshold, which needs no retraining at all and is usually the first thing to try. Change the data — oversample, undersample, or SMOTE. On one shared dataset the baseline gave precision 1.000 and recall 0.433; class weights gave 0.099 and 0.867; threshold 0.20 gave 1.000 and 0.600. They are different points on the same trade-off, not different amounts of skill.`,isCaseBased:!1},{question:`Why is threshold moving often the best first move?`,answer:`It is free and it is reversible. The model already outputs a probability; the threshold is a business decision applied afterward, so you can change it without retraining, without touching the pipeline, and without any risk of leakage. It also makes the trade-off explicit — you can hand a stakeholder the table of thresholds against precision and recall and let them choose. Resampling and reweighting change the fitted model itself and can damage calibration.`,isCaseBased:!1},{question:`Explain resampling leakage and how you avoid it.`,answer:`If you oversample before splitting, copies of the same minority row end up in both train and test, so the model is scored on rows it memorised. In the demonstration that reported F1 0.820 against an honest 0.182 — four times too good, from a two-line ordering mistake. The rule is: split first, resample only the training portion, never touch test. Inside cross-validation the resampling must happen inside each fold, which is what scikit-learn pipelines and imbalanced-learn's Pipeline enforce.`,isCaseBased:!0},{question:`What is SMOTE and when does it fail?`,answer:`SMOTE creates synthetic minority rows by interpolating between a minority point and one of its minority neighbours, so it adds variety rather than exact duplicates. It fails when a straight line between two real rows passes through a region that cannot exist — interpolating between two categorical encodings, or producing an impossible combination like a 3-bedroom flat of 20 m². It also amplifies noise, since a mislabelled minority point breeds synthetic mislabelled neighbours, and it degrades in high dimensions where "nearest neighbour" stops meaning much.`,isCaseBased:!1},{question:`How does resampling affect calibration?`,answer:`It breaks it. Resampling changes the base rate the model sees, so the model learns probabilities for a world where fraud is 50% rather than 2%, and its outputs come out systematically too high. If you only need a ranking that is harmless. If anything downstream consumes the probability — expected-loss calculations, thresholds derived from costs — you must either correct the intercept back to the true prior or recalibrate on an unresampled validation set.`,isCaseBased:!1},{question:`Which metric would you report to a business stakeholder for a fraud system?`,answer:`Not a single number. Recall at a fixed alert budget is usually the honest framing: "with 200 alerts a day, we catch 62% of fraud." That connects directly to reviewer capacity. Alongside it, precision at that operating point, so they know how many alerts are wasted, and the money view — value of fraud caught against cost of review. PR-AUC is the right summary for comparing models internally, but it does not mean anything to a stakeholder.`,isCaseBased:!0},{question:`When is imbalance NOT a problem worth fixing?`,answer:`When the minority class is still large in absolute terms — a million positives out of a hundred million is 1% and plenty to learn from. When you only need a ranking and will pick an operating point later, since the ordering is often fine straight out of an unweighted model. And when the imbalance is genuine and stable, because a model that reflects the true prior is correctly calibrated and any resampling makes it worse. The problem is usually too few minority examples, not the ratio itself.`,isCaseBased:!1}],flashcards:[{front:`The 98% trap`,back:`With 20 frauds in 1,000 rows, always answering "not fraud" scores 0.98 accuracy and catches 0. Accuracy mostly measures the class ratio.`},{front:`Why precision and recall survive imbalance`,back:`Neither formula contains TN, so the huge easy-negative count cannot inflate them.`},{front:`The three levers`,back:`Change the loss (class weights), change the decision (threshold), change the data (resampling). Name which one you pulled.`},{front:`Class weights, measured`,back:`Recall 0.433 → 0.867, precision 1.000 → 0.099, 236 false alarms. Recall is always bought with precision.`},{front:`Threshold moving`,back:`Same trained model, no retraining. At 0.20: recall 0.600 with zero false alarms — strictly better than the 0.5 default.`},{front:`Resampling leakage`,back:`Oversample before splitting and copies land in both halves: F1 0.820 leaky against 0.182 honest. Split first, resample train only.`},{front:`Why oversampling ≈ class weighting`,back:`Duplicating a row 49 times and counting it 49× in the loss are nearly the same instruction to the optimiser.`},{front:`Resampling and calibration`,back:`It changes the base rate the model sees, so probabilities come out too high. Recalibrate on unresampled data if anything downstream uses them.`}],mindmapMarkdown:`- Class imbalance
  - The problem
    - 20 fraud in 1000 -> always-no scores 0.98, catches 0
    - accuracy contains TN, which dominates
    - precision and recall do not
  - Three levers
    - loss: class_weight balanced
      - recall 0.433 -> 0.867, precision 1.000 -> 0.099
    - decision: move the threshold
      - 0.50 -> 13 caught, 0 alarms
      - 0.20 -> 18 caught, 0 alarms
      - 0.02 -> 27 caught, 226 alarms
    - data: oversample / undersample / SMOTE
      - 70 fraud rows -> 3430 copies, only 70 distinct
      - caught 25, 219 false alarms
  - The leak
    - resample BEFORE split -> F1 0.820
    - honest -> F1 0.182
    - rule: split, then resample train only
  - Reporting
    - recall at a fixed alert budget
    - PR-AUC for model comparison
    - resampling breaks calibration`};export{e as default};