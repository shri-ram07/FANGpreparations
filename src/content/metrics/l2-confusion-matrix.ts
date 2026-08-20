import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l2-confusion-matrix',
  subjectId: 'metrics',
  level: 2,
  title: 'The Confusion Matrix: Precision, Recall & F1',
  whyItMatters:
    'Every classification metric you will ever quote — precision, recall, F1, specificity, ROC, PR-AUC — is four numbers in a 2x2 table, rearranged. Interviewers know this, so they skip the definitions and ask which one you would optimize and what it costs the business. Get fluent here and you stop guessing at metric questions for the rest of your career.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'One table, and every metric falls out of it',
      md: `A spam filter runs over **1,000 emails**. 200 are genuinely spam, 800 are genuine mail. We call spam the **positive** class — "positive" just means the thing we are hunting for, not the thing that is good.

- The filter flags **180** emails as spam.
- Of those 180, **150** really were spam. The other **30** were real emails sent to the spam folder.
- **50** spam got through into the inbox.
- **770** real emails were correctly left alone.
- Four numbers. 150, 30, 50, 770. Every metric in this module is a ratio of two of them.`,
    },
    {
      type: 'intuition',
      title: 'The naming trick that ends the confusion forever',
      md: `Read every label as **two words, right to left**. The second word is what the MODEL said. The first word says whether the model was right.

- **True Positive (TP)** — model said positive, and that was true. *150 spam caught.*
- **False Positive (FP)** — model said positive, and that was false. *30 real emails in the spam folder.*
- **False Negative (FN)** — model said negative, and that was false. *50 spam in the inbox.*
- **True Negative (TN)** — model said negative, and that was true. *770 real emails delivered.*
- So "False Positive" never means "a positive that was false" — it means the model *shouted positive and was wrong*. Read the second word first and you can never flip them again.
- Everything downstream is bookkeeping: the model's mistakes are FP and FN, and the whole subject is about which of the two you would rather have.`,
    },
    {
      type: 'math',
      intro: 'The confusion matrix for the spam filter. Rows are the truth, columns are what the model said.',
      latex: [
        '\\begin{array}{c|cc} & \\textbf{model: spam} & \\textbf{model: real} \\\\ \\hline \\textbf{truly spam} & TP = 150 & FN = 50 \\\\ \\textbf{truly real} & FP = 30 & TN = 770 \\end{array}',
        '\\text{Row sums are the truth (200 spam, 800 real). Column sums are the model (180 flagged, 820 left alone).}',
      ],
    },
    {
      type: 'intuition',
      title: 'Precision: of everything I flagged, how much was real',
      md: `Precision looks **down the column you acted on**. It only sees the 180 emails the filter touched.

- **Precision = TP / (TP + FP)** = 150 / 180 = **0.833**.
- Read it: *"when this filter says spam, it is right 83% of the time."*
- The denominator is your alarms. Precision is the trust people put in your alarm.
- What it charges you for: **false positives** — the cost of a false alarm. Here, a real email nobody ever reads.
- The 770 correctly delivered emails are nowhere in the formula. Precision does not care how much of the world you got right, only how clean your flags were.`,
    },
    {
      type: 'intuition',
      title: 'Recall: of everything real, how much did I catch',
      md: `Recall looks **across the row that was actually positive**. It only sees the 200 emails that truly were spam.

- **Recall = TP / (TP + FN)** = 150 / 200 = **0.750**. Also called **sensitivity**, or the **true positive rate (TPR)** — three names, one formula.
- Read it: *"of all the spam that existed, this filter caught 75%."*
- The denominator is reality. Recall is your coverage of the thing you are hunting.
- What it charges you for: **false negatives** — the cost of a miss. Here, spam in the inbox.
- Note what changes them: precision has FP in the denominator, recall has FN. **No metric here contains TN.** Precision and recall are both blind to the boring majority — which is exactly why they survive imbalance and accuracy does not.`,
    },
    {
      type: 'hinglish',
      md: `**Precision** = *jo maine positive bola, usme se kitne sach me positive nikle.* Meri baat ka **bharosa**. **Recall** = *jitne sach me positive the, unme se kitne maine pakde.* Meri **pakad**.

Bharosa badhaana hai? Sirf pakke cases pe ungli uthao — precision upar, par bahut saare chhoot jaayenge (recall neeche). Pakad badhaani hai? Sab pe shak karo — recall upar, par aadhe bebaqsoor bhi pakde jaayenge (bharosa gaya). Threshold ka slider bas yehi ek sawaal poochta hai: **bharosa ya pakad?** Dono ek saath 100% chahiye — woh option menu me hai hi nahi.`,
    },
    {
      type: 'math',
      intro: 'Every formula in this module, in one place. Nothing here has more than one division.',
      latex: [
        '\\text{Precision} = \\frac{TP}{TP + FP} \\qquad \\text{Recall} = \\text{Sensitivity} = \\text{TPR} = \\frac{TP}{TP + FN}',
        '\\text{Specificity} = \\text{TNR} = \\frac{TN}{TN + FP} \\qquad \\text{FPR} = \\frac{FP}{FP + TN} = 1 - \\text{Specificity}',
        '\\text{Accuracy} = \\frac{TP + TN}{TP + TN + FP + FN} \\qquad F_1 = 2\\,\\frac{P \\cdot R}{P + R}',
        '\\text{Spam filter: } P = 0.833,\\; R = 0.750,\\; F_1 = 0.789,\\; \\text{Acc} = 0.920,\\; \\text{Spec} = 0.9625,\\; \\text{FPR} = 0.0375',
      ],
    },
    {
      type: 'intuition',
      title: 'The trade: one slider, two metrics moving apart',
      md: `A classifier does not output a label. It outputs a **score**, and a threshold turns that score into a label. Move the threshold and the four cells move — always in opposite directions for precision and recall.

- **Lower the threshold** (flag more): TP goes up *and* FP goes up. Recall rises, precision falls.
- **Raise the threshold** (flag less): FP goes down *and* FN goes up. Precision rises, recall falls.
- The two extremes are worth memorising. **Flag everything**: FN = 0, so recall = 1.0, and precision collapses to the base rate (here 0.20 — you flagged all 1,000 emails and only 200 were spam).
- **Flag nothing**: FP = 0 and TP = 0, so recall = 0 and precision is 0/0 — *undefined*. Libraries report it as 0 or 1 depending on the \`zero_division\` flag, which is why a model that predicts nothing can print "precision 1.0" and look brilliant.
- So neither metric alone can be trusted: each one has a degenerate strategy that maxes it. You must quote them **as a pair**, always.`,
    },
    { type: 'visual', component: 'ConfusionMatrixLab', props: {} },
    {
      type: 'note',
      md: `Drag the threshold and watch the four cells and the four metrics move **together** — that is the whole lesson of this module in one gesture. Push the slider left: the flagged region swallows more of the negative distribution, TP and FP both climb, recall marches toward 1.0 while precision bleeds out. Push it right: FP drains away, precision climbs, and FN quietly fills up — recall dies. Watch the pairs that move in lockstep: TP up always means FN down (they share the 200 real positives), FP up always means TN down (they share the 800 real negatives). Only two of the four cells are free. Then hit **Sweep 1 to 0** and notice that the ROC curve is just this same slider, plotted: every threshold is one point on it. That is the next module, already drawn.`,
    },
    {
      type: 'intuition',
      title: 'F1: why the harmonic mean, and not the ordinary one',
      md: `When you must report a single number, you combine precision and recall. F1 is their **harmonic mean** — and the choice of "harmonic" is doing real work.

- A model flags exactly one email, and it is spam. Precision = **1.00**. Recall = 1/200 = **0.005**. Call it 0.01 to keep the arithmetic clean.
- **Arithmetic mean**: (1.00 + 0.01) / 2 = **0.505**. That model is useless and just scored above half marks.
- **Harmonic mean**: 2 x (1.00 x 0.01) / (1.00 + 0.01) = 0.02 / 1.01 = **0.0198**. Correct verdict: near zero.
- The mechanism: the harmonic mean is dominated by the *smaller* number. Averaging reciprocals means the tiny value contributes a huge reciprocal that swamps the sum.
- So F1 asks *"are BOTH decent?"*, while the arithmetic mean asks *"is the total okay?"* — and lets one metric buy the other's failure.
- The rule to say out loud: **F1 cannot be high unless both are high.** Our spam filter: 2 x 0.833 x 0.750 / 1.583 = **0.789**, honestly sitting between the two.`,
    },
    {
      type: 'math',
      intro: 'F1 is F-beta at beta = 1. The beta version is the one you actually want in production.',
      latex: [
        'F_1 = \\frac{2}{\\frac{1}{P} + \\frac{1}{R}} = 2\\,\\frac{P \\cdot R}{P + R} \\qquad \\text{(harmonic mean = reciprocal of the mean reciprocal)}',
        'F_\\beta = (1 + \\beta^2)\\,\\frac{P \\cdot R}{\\beta^2 P + R} \\qquad \\Longleftrightarrow \\qquad \\frac{1}{F_\\beta} = \\frac{1}{1+\\beta^2}\\cdot\\frac{1}{P} + \\frac{\\beta^2}{1+\\beta^2}\\cdot\\frac{1}{R}',
        '\\beta^2 = \\text{the weight recall gets relative to precision} \\;\\Rightarrow\\; \\beta = \\sqrt{C_{FN} / C_{FP}}',
      ],
    },
    {
      type: 'intuition',
      title: 'F-beta: dialing in how much a miss hurts',
      md: `F1 hides an assumption: a false negative and a false positive cost the same. They almost never do. **F-beta** lets you say so.

- **beta > 1 leans toward recall.** F2 (beta = 2) weights recall 4x precision. Use when a miss is expensive: disease screening, fraud, safety alerts.
- **beta < 1 leans toward precision.** F0.5 weights precision 4x recall. Use when a false alarm is expensive: spam, content takedowns, auto-blocking accounts.
- How to pick beta: the second latex line shows recall's weight in the harmonic mean is **beta squared**. So set **beta = sqrt(cost of a miss / cost of a false alarm)**. A miss costing 4x a false alarm gives beta = 2.
- Our spam filter, same four cells: **F2 = 0.765** (drags toward the weaker recall), **F0.5 = 0.815** (drags toward the stronger precision), F1 = 0.789 in the middle. Same model, three verdicts — the ranking of two models can flip with beta, which is exactly why you choose beta *before* comparing.
- Honest caveat, and it scores points: if you genuinely know both costs in currency, skip F-beta and minimise **C_FN x FN + C_FP x FP** directly. F-beta is for when you only know the *direction* of the asymmetry, not its price.`,
    },
    {
      type: 'intuition',
      title: 'Specificity and FPR: the other row of the table',
      md: `Precision and recall both live in the positive column and positive row. The negatives have their own pair, and you need them for ROC next module.

- **Specificity (TNR) = TN / (TN + FP)** = 770 / 800 = **0.9625**. Recall's mirror image: *of all the genuine emails, how many did I correctly leave alone?*
- **FPR = FP / (FP + TN)** = 30 / 800 = **0.0375**. Simply **1 - specificity**: *what fraction of innocent cases did I wrongly accuse?*
- Recall is computed inside the positive row; specificity inside the negative row. Neither one knows the other exists — which is why medicine quotes both ("this test is 90% sensitive, 95% specific").
- The **ROC curve plots TPR against FPR** as the threshold sweeps. That is the whole definition, and both axes are now defined.
- The trap to carry forward: FPR's denominator is the entire negative class. When negatives are 99% of the data, thousands of new false alarms barely move FPR — so ROC-AUC stays flattering while precision (denominator: only what you flagged) collapses. That is the ROC-vs-PR argument in one sentence.`,
    },
    {
      type: 'intuition',
      title: 'Accuracy: when it is fine, and when it is a lie',
      md: `**Accuracy = (TP + TN) / everything** = 920 / 1000 = **0.920**. It is not a bad metric. It is a metric with two preconditions that people forget to check.

- **Fine when classes are roughly balanced** — no single class can dominate the score by existing.
- **Fine when the two error types cost about the same** — because accuracy weights an FP and an FN identically, by construction.
- Both hold for something like MNIST digit classification: ten roughly equal classes, and mistaking a 3 for an 8 costs the same as the reverse. Report accuracy there and stop.
- **A lie when positives are rare.** At 1% positives, predicting "negative" forever scores 99% accuracy and catches nothing. See the Class Imbalance module for the full autopsy and the fixes.
- **A lie when costs are asymmetric**, even at 50/50 balance. Accuracy will happily prefer a model that trades 10 caught tumours for 10 fewer false alarms.
- Diagnostic habit: accuracy is only meaningful next to the **majority-class baseline** (1 - positive rate). Our filter's baseline is 0.80 — so 0.92 is genuine progress. Without that comparison the number means nothing.`,
    },
    {
      type: 'intuition',
      title: 'Which one matters more? Ask what each mistake costs',
      md: `There is no universal answer, and interviewers are testing whether you know that. Name the two costs and the metric picks itself.

- **Spam filter — precision wins.** A false negative is one spam in your inbox: you delete it in a second. A false positive is a job offer, an invoice, a doctor's result rotting in the spam folder — possibly never seen. The costs are not close, so optimize precision (F0.5), raise the threshold, and accept letting some spam through.
- **Cancer screening — recall wins.** A false negative is a tumour that grows for another year: catastrophic, possibly fatal. A false positive is one more test, some anxiety, a few thousand rupees. Optimize recall (F2 or higher), lower the threshold, and accept many false alarms.
- Same mathematics, opposite decisions, because the **cost ratio is inverted**. Nothing about the model changed.
- The bound nobody mentions until production: recall is capped by **capacity**. If lowering the threshold generates 5,000 follow-up scans a day and the hospital can do 500, the extra recall is imaginary. Cost ratio sets the direction; capacity sets how far you can go.
- The sentence that reads as senior: *"a miss costs us roughly 100x a false alarm, so I set the threshold at 92% recall and confirmed the review team can absorb the resulting alert volume."* Not *"I got F1 up to 0.81."*`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'All six metrics by hand, then by sklearn — the numbers must match',
      code: `import numpy as np
from sklearn.metrics import confusion_matrix, precision_score, recall_score, f1_score, accuracy_score

rng = np.random.default_rng(0)
y = np.r_[np.ones(200, int), np.zeros(800, int)]                   # 200 spam, 800 real
pred = np.zeros(1000, int)
pred[rng.choice(np.flatnonzero(y == 1), 150, replace=False)] = 1   # caught 150 spam
pred[rng.choice(np.flatnonzero(y == 0), 30, replace=False)] = 1    # 30 real mails flagged

tn, fp, fn, tp = confusion_matrix(y, pred).ravel()
P, R = tp / (tp + fp), tp / (tp + fn)
print('TP=%d FP=%d FN=%d TN=%d' % (tp, fp, fn, tn))
print('by hand  P=%.4f R=%.4f F1=%.4f acc=%.4f spec=%.4f FPR=%.4f'
      % (P, R, 2 * P * R / (P + R), (tp + tn) / len(y), tn / (tn + fp), fp / (fp + tn)))
print('sklearn  P=%.4f R=%.4f F1=%.4f acc=%.4f'
      % (precision_score(y, pred), recall_score(y, pred), f1_score(y, pred), accuracy_score(y, pred)))

# ---- real output ----
# TP=150 FP=30 FN=50 TN=770
# by hand  P=0.8333 R=0.7500 F1=0.7895 acc=0.9200 spec=0.9625 FPR=0.0375
# sklearn  P=0.8333 R=0.7500 F1=0.7895 acc=0.9200`,
      annotations: {
        10: 'Memorise this order: sklearn ravel() returns tn, fp, fn, tp — alphabetical, NOT the TP-first order everyone says out loud. Unpacking it wrong is the single most common metrics bug.',
        11: 'Precision divides by what the MODEL flagged (tp+fp). Recall divides by what was REALLY positive (tp+fn). One character apart, completely different question.',
        14: 'Specificity uses tn/(tn+fp) and FPR uses fp/(fp+tn) — same denominator, the whole negative class. They must sum to 1.0.',
        21: 'Identical to four decimal places. The point of the exercise: sklearn is not doing anything you cannot do on a whiteboard in an interview.',
      },
    },
    {
      type: 'intuition',
      title: 'Multi-class: micro, macro, and weighted are three different questions',
      md: `With more than two classes you get one confusion matrix of size k x k, and one precision/recall/F1 **per class**. Averaging them into a single number is a choice, and the three options can disagree wildly.

- **Micro** — pool the raw counts across all classes first (total TP, total FP, total FN), *then* compute the metric. Every **sample** counts equally, so big classes dominate. In single-label multi-class, micro-precision = micro-recall = micro-F1 = **accuracy**, exactly.
- **Macro** — compute F1 separately per class, then take a plain unweighted mean. Every **class** counts equally: a class with 10 samples has the same vote as a class with 10,000. This is the one that exposes a model that ignores rare classes.
- **Weighted** — macro, but each class's F1 is weighted by its support (how many true samples it has). This drags the answer back toward micro/accuracy, which is why it rarely tells you anything micro did not.
- Pick by the question: *"how often is the system right?"* is micro. *"does it work for every class, including the rare ones?"* is macro. *"what does the average user experience?"* is weighted.
- Which to report on imbalanced multi-class: **macro**, plus the per-class table. Macro is where a neglected class can scream.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Micro vs macro on a 3-class problem — 0.932 vs 0.628 on the same predictions',
      code: `import numpy as np
from sklearn.metrics import f1_score, classification_report, accuracy_score

M = np.array([[880, 15,  5],      # rows = TRUE class (A common, B rare, C rarest)
              [ 30, 48,  2],      # cols = PREDICTED class
              [ 14,  2,  4]])
y_true = np.repeat([0, 0, 0, 1, 1, 1, 2, 2, 2], M.ravel())
y_pred = np.repeat([0, 1, 2, 0, 1, 2, 0, 1, 2], M.ravel())

for avg in ('micro', 'macro', 'weighted'):
    print('%-8s F1 = %.3f' % (avg, f1_score(y_true, y_pred, average=avg)))
print('accuracy = %.3f' % accuracy_score(y_true, y_pred))
print(classification_report(y_true, y_pred, target_names=['A', 'B', 'C'], digits=3))

# ---- real output ----
# micro    F1 = 0.932
# macro    F1 = 0.628
# weighted F1 = 0.927
# accuracy = 0.932
#               precision    recall  f1-score   support
#            A      0.952     0.978     0.965       900
#            B      0.738     0.600     0.662        80
#            C      0.364     0.200     0.258        20
#     macro avg     0.685     0.593     0.628      1000
#  weighted avg     0.923     0.932     0.927      1000`,
      annotations: {
        6: 'Read row C: of 20 true C samples, 14 were called A, 2 called B, and only 4 got it right. The matrix says WHERE the model fails; no single average can.',
        7: 'Expanding a confusion matrix back into label arrays — handy for checking any metric by hand against sklearn.',
        11: 'One switch, three different stories from identical predictions. Never report an averaged multi-class F1 without naming the averaging.',
        17: '0.932 vs 0.628 on the same predictions. Micro says "shipped"; macro says class C is a coin flip that lands wrong 80% of the time.',
        19: 'micro F1 = 0.932 = accuracy, exactly. In single-label multi-class that identity always holds — every sample contributes exactly one prediction, so a FP for one class is a FN for another and they cancel in the pooled counts.',
      },
    },
    {
      type: 'intuition',
      title: 'The matrix beats every number derived from it',
      md: `Averages tell you *how much* is wrong. The matrix tells you *what* is wrong — and only the second one is actionable.

- Read the 3-class output again: class C is not merely "hard". **14 of its 20 samples were called A specifically.** C is being swallowed by the dominant class, not scattered randomly.
- That single fact points at fixes an F1 score never could: C may be under-represented, its features may overlap A's, or the labels themselves may be inconsistent between A and C.
- **Off-diagonal cells are a graph of which classes look alike to the model.** Symmetric confusion (A to C and C to A) suggests genuinely overlapping features. One-directional confusion (C to A only) usually smells of class prior — the model defaults to the frequent class when unsure.
- A 10-class matrix with 3 hot off-diagonal cells is a merge-classes or collect-more-data decision, and you can see it in seconds.
- Interview habit: when asked "how is your classifier doing?", answer with the matrix and one sentence about its worst off-diagonal cell. Quoting a single float and stopping is what juniors do.`,
    },
    {
      type: 'note',
      md: `What is deliberately not here: **ROC and AUC** (built point-by-point in the next module — you already have TPR and FPR, which are its two axes), **PR-AUC** and threshold selection under heavy imbalance (see the Class Imbalance module in ML), and the **losses** that a model actually optimizes. Keep the distinction sharp, because it is a favourite interview opener: a **loss** must be differentiable because gradients flow through it; a **metric** has no such obligation — F1 has a flat, non-differentiable staircase shape, which is precisely why you train with cross-entropy and *judge* with F1.`,
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `import numpy as np

THRESHOLD = 0.60  # <-- change me: 0.40, then 0.60, then 0.80

# 400 samples, only 20 positive (5%) -- deliberately imbalanced
y = np.r_[np.ones(20), np.zeros(380)]
s = np.r_[np.linspace(0.35, 0.99, 20),     # 20 positives
          np.linspace(0.32, 0.70, 20),     # 20 hard negatives -- scores overlap
          np.linspace(0.00, 0.30, 360)]    # 360 easy negatives

pred = s >= THRESHOLD
TP = int(np.sum((pred == 1) & (y == 1)))
FP = int(np.sum((pred == 1) & (y == 0)))
FN = int(np.sum((pred == 0) & (y == 1)))
TN = int(np.sum((pred == 0) & (y == 0)))

prec = TP / (TP + FP) if TP + FP else 0.0
rec = TP / (TP + FN) if TP + FN else 0.0
f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
acc = (TP + TN) / len(y)

print('THRESHOLD = %.2f     base rate = 20/400 = 5%%' % THRESHOLD)
print('                pred +   pred -')
print('actual +      TP=%4d   FN=%4d' % (TP, FN))
print('actual -      FP=%4d   TN=%4d' % (FP, TN))
print('precision %.3f   recall %.3f   f1 %.3f' % (prec, rec, f1))
print('accuracy  %.3f   <- "always predict negative" also scores 0.950' % acc)`,
        precomputedOutput: `THRESHOLD = 0.60     base rate = 20/400 = 5%
                pred +   pred -
actual +      TP=  12   FN=   8
actual -      FP=   6   TN= 374
precision 0.667   recall 0.600   f1 0.632
accuracy  0.965   <- "always predict negative" also scores 0.950`,
        caption: 'Sweep THRESHOLD 0.40 then 0.80: precision climbs 0.53 to 1.00 while recall falls 0.90 to 0.30 — yet accuracy never leaves 0.96, barely beating the do-nothing baseline',
      },
    },
  ],
  quiz: [
    {
      question: 'A model produces FP = 40. In plain English, what happened 40 times?',
      options: [
        {
          text: 'The true label was positive but the model missed it',
          explanation: 'That is a false NEGATIVE. Read the second word first: "positive" means the model said positive.',
        },
        {
          text: 'The model said positive and was wrong',
          explanation: 'Correct. Second word = what the model said (positive). First word = whether it was right (false). Model shouted, model was wrong.',
        },
        {
          text: 'The model said negative and was wrong about a positive case',
          explanation: 'Also a false negative — model said negative, and that was false. Different cell entirely.',
        },
      ],
      correct: 1,
    },
    {
      question: 'A spam filter flags 180 emails; 150 are truly spam. There were 200 spam in total. Precision and recall?',
      options: [
        { text: 'P = 0.75, R = 0.833', explanation: 'Swapped. Dividing by 200 (what really existed) gives recall; dividing by 180 (what you flagged) gives precision.' },
        { text: 'P = 0.833, R = 0.75', explanation: 'Correct. P = 150/180 = 0.833 (of my alarms, how many were real). R = 150/200 = 0.75 (of the real spam, how much I caught).' },
        { text: 'P = 0.833, R = 0.833', explanation: 'They only coincide when flagged count equals true positive count — 180 flagged versus 200 real spam guarantees they differ.' },
      ],
      correct: 1,
    },
    {
      question: 'A model predicts "positive" for every single input. What are precision and recall?',
      options: [
        {
          text: 'Recall = 1.0; precision collapses to the base rate of positives',
          explanation: 'Correct. FN = 0 so recall is perfect, while precision = TP/(all rows) = the positive rate. At 1% positives that is 0.01 — the degenerate strategy that maxes recall.',
        },
        { text: 'Both = 1.0', explanation: 'Only if literally every sample is positive. Otherwise every negative becomes an FP and precision falls.' },
        { text: 'Both = 0.0', explanation: 'That describes predicting negative for everything, and even then precision is 0/0 (undefined), not 0.' },
      ],
      correct: 0,
    },
    {
      question: 'Precision = 1.00, recall = 0.01. Why does F1 report ~0.02 when the arithmetic mean says 0.505?',
      options: [
        { text: 'F1 uses a geometric mean, which is smaller', explanation: 'The geometric mean would be sqrt(1 x 0.01) = 0.1 — still ten times too generous. F1 is the harmonic mean.' },
        { text: 'F1 halves the arithmetic mean by convention', explanation: 'No convention involved. 0.505 halved is 0.2525, nowhere near 0.0198. The formula is genuinely different.' },
        {
          text: 'The harmonic mean averages reciprocals, so the smaller value dominates the result',
          explanation: 'Correct. 1/R = 100 swamps 1/P = 1, so the mean reciprocal is huge and its reciprocal is tiny. That is exactly the property you want: F1 stays low unless BOTH are high.',
        },
      ],
      correct: 2,
    },
    {
      question: 'You are grading a cancer screening model. Which single-number metric fits best, and why?',
      options: [
        { text: 'Accuracy — it summarises overall correctness', explanation: 'Positives are rare, so accuracy is dominated by healthy patients and a do-nothing model scores 99%.' },
        {
          text: 'F-beta with beta > 1, because a missed tumour costs far more than a false alarm',
          explanation: 'Correct. beta = sqrt(C_FN/C_FP) > 1 pushes weight onto recall. F2 or higher, with the threshold set by follow-up capacity.',
        },
        { text: 'F0.5, to keep false alarms down', explanation: 'That is backwards — beta < 1 favours precision, which optimizes for not scaring people rather than not missing cancer.' },
      ],
      correct: 1,
    },
    {
      question: '3-class problem: micro F1 = 0.932, macro F1 = 0.628. What does this gap tell you?',
      options: [
        {
          text: 'At least one small class is being predicted badly, and the large class is carrying the aggregate score',
          explanation: 'Correct. Micro pools counts so the big class dominates; macro gives every class one equal vote, so a failing rare class drags it down. Read the per-class table next.',
        },
        { text: 'The model is overfitting the training set', explanation: 'Both numbers come from the same predictions on the same set — this gap is about class balance, not train/test generalisation.' },
        { text: 'The averaging methods were computed on different data', explanation: 'They are two summaries of one identical confusion matrix. The disagreement is real and informative.' },
      ],
      correct: 0,
    },
    {
      question: 'In single-label multi-class classification, micro-averaged F1 is always equal to…',
      options: [
        { text: 'Macro F1', explanation: 'Only by coincidence when all classes are equally sized and equally well predicted. Generally they differ, often enormously.' },
        { text: 'Weighted F1', explanation: 'Weighted F1 is usually CLOSE to micro because both are support-driven, but it is a support-weighted mean of per-class F1s, not the same quantity.' },
        {
          text: 'Accuracy',
          explanation: 'Correct, and exactly. Each sample yields one prediction, so any FP for one class is an FN for another; in the pooled counts they cancel, leaving micro-P = micro-R = micro-F1 = correct/total.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Which pair of confusion-matrix cells shares a denominator, and what does that imply?',
      options: [
        { text: 'Precision and recall — both use TP', explanation: 'They share the NUMERATOR (TP) but their denominators differ: TP+FP versus TP+FN. That difference is the entire distinction.' },
        {
          text: 'Specificity and FPR — both divide by TN + FP, so they sum to 1',
          explanation: 'Correct. Both are computed inside the negative row, so FPR = 1 - specificity exactly. FPR is one of the two ROC axes; recall (TPR) is the other.',
        },
        { text: 'Accuracy and F1 — both use all four cells', explanation: 'Accuracy uses all four, but F1 uses only TP, FP and FN. F1 never touches TN — that is why it survives imbalance.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Define precision and recall without using the words "true positive".',
      answer:
        'Precision: of everything the model flagged, what fraction was genuinely positive — the trustworthiness of an alarm. Recall: of everything that genuinely was positive, what fraction the model found — the coverage of the hunt. The denominators are the real answer: precision divides by what the MODEL claimed, recall divides by what REALITY contained. Add the consequence to sound senior: precision is what you pay for false alarms, recall is what you pay for misses, neither one contains true negatives, and that is exactly why both survive class imbalance while accuracy does not.',
      isCaseBased: false,
    },
    {
      question: 'Why is F1 the harmonic mean rather than the arithmetic mean? Show the arithmetic.',
      answer:
        'Because the arithmetic mean lets one metric buy the other\'s failure. Take a model that flags a single email and gets it right: precision 1.0, recall 0.01. Arithmetic mean = (1.0 + 0.01)/2 = 0.505 — a useless model scoring above half. Harmonic mean = 2(1.0 x 0.01)/(1.0 + 0.01) = 0.02/1.01 = 0.0198, which is the honest verdict. The mechanism is that averaging reciprocals lets the small value contribute a huge reciprocal that dominates the sum, so the harmonic mean is pulled toward the minimum. The behavioural summary: F1 cannot be high unless BOTH are high — it is a conjunction, not a total.',
      isCaseBased: false,
    },
    {
      question: 'Case: your team ships a fraud model at F1 0.82. Six weeks later the ops lead says the alert queue is unusable and the fraud team is missing real cases. F1 has not moved. Explain how both can be true.',
      answer:
        'F1 is a single scalar over a two-dimensional trade, so many different (precision, recall) pairs give the same F1 — 0.82 could be P 0.95/R 0.72 or P 0.72/R 0.95, and those are entirely different products. First move: stop looking at F1 and pull the raw confusion matrix plus alerts-per-day. Second: F1 assumes a false alarm and a miss cost the same, which for fraud is false — get C_FN (chargeback plus goodwill) and C_FP (a few minutes of analyst time) and re-pick the threshold by minimising C_FN x FN + C_FP x FP, or by filling exactly the queue capacity the team has. Third: check drift — the score distribution can shift under a fixed threshold so that precision falls while a threshold-independent-ish summary looks stable, and prevalence changes move precision with no model change at all. The takeaway to state: F1 was never the objective, it was a proxy nobody re-derived from the costs.',
      isCaseBased: true,
    },
    {
      question: 'How do you choose beta in F-beta, concretely?',
      answer:
        'Write F-beta as a weighted harmonic mean: 1/F_beta = (1/(1+beta^2))(1/P) + (beta^2/(1+beta^2))(1/R). Recall\'s weight is beta squared, so beta = sqrt(C_FN / C_FP) — a miss costing 4x a false alarm gives beta = 2, a miss costing 100x gives beta = 10. beta > 1 leans recall (screening, fraud, safety), beta < 1 leans precision (spam, auto-takedowns, anything that punishes a user). Two things to add. First, choose beta BEFORE comparing models: the ranking of two models can flip with beta, so picking it afterwards is just picking a winner. Second, the honest caveat — if you actually know both costs in currency, drop F-beta and minimise expected cost directly; F-beta exists for when you know only the direction of the asymmetry.',
      isCaseBased: false,
    },
    {
      question: 'When is plain accuracy a perfectly good metric? Give the exact conditions.',
      answer:
        'Two conditions, both required. One: classes are roughly balanced, so no class can win the score just by being common — otherwise the majority-class baseline (1 minus the positive rate) already scores what your model scores. Two: the error types cost about the same, because accuracy weights an FP and an FN identically by construction. Balanced 10-class image classification satisfies both; report accuracy there and move on. It breaks on rare positives (1% fraud: always-negative scores 99%) and on asymmetric costs even at perfect balance (accuracy will happily trade 10 caught tumours for 10 fewer false alarms). Discipline: never quote accuracy without the majority-class baseline beside it — alone, the number is uninterpretable.',
      isCaseBased: false,
    },
    {
      question: 'Explain micro, macro, and weighted averaging in multi-class, and say when each is right.',
      answer:
        'Micro pools raw counts across all classes (total TP, FP, FN) and then computes the metric, so every SAMPLE counts equally and big classes dominate; in single-label multi-class it equals accuracy exactly. Macro computes the metric per class and takes an unweighted mean, so every CLASS counts equally — a 10-sample class gets the same vote as a 10,000-sample one, which is what exposes a model that quietly ignores rare classes. Weighted is macro with each class weighted by its support, which pulls the answer back toward micro and therefore rarely says anything new. Map them to questions: "how often is the system right?" is micro, "does it work for every class?" is macro, "what does the typical user see?" is weighted. On imbalanced multi-class report macro plus the per-class table; a large micro-macro gap is itself the finding.',
      isCaseBased: false,
    },
    {
      question: 'Case: a content-moderation classifier over 12 categories reports weighted F1 0.91 and legal is furious about one specific category. Walk through your diagnosis.',
      answer:
        'Weighted F1 is support-weighted, so it is essentially reporting how the biggest categories do; a small high-stakes category can be near zero and move that number by under a point. Step one: recompute macro F1 and print the full per-class table — expect the gap to be large and the offending class near the bottom. Step two: read that class\'s ROW of the confusion matrix, not its F1: which class is absorbing its samples? One-directional confusion into a big class means the model falls back on the prior when unsure; symmetric confusion means the two categories genuinely overlap in features, or the labelling guidelines do not separate them. Step three: fix by cost, not by average — that category needs its own threshold (per-class thresholds are normal in moderation) and probably its own recall target and F-beta with beta > 1, because the legal cost of a miss is not comparable to an over-flag. Step four: monitor it as a named per-class SLO forever; any aggregate metric will hide it again.',
      isCaseBased: true,
    },
    {
      question: 'Why does a confusion matrix beat any single metric, even in a summary?',
      answer:
        'Because averages say how much is wrong, and the matrix says WHAT is wrong. A macro F1 of 0.63 tells you to worry; the row showing 14 of 20 class-C samples landing specifically in class A tells you what to do — C is being absorbed by the dominant class, which points at prior-driven fallback, overlapping features, or inconsistent labelling between exactly those two classes. Off-diagonal cells are effectively a graph of which classes look alike to the model: symmetric confusion suggests genuine feature overlap, one-directional confusion suggests a class-prior effect. It is also the only format a non-technical stakeholder reads correctly: "caught 150 of 200 spam, misfiled 30 real emails" lands where "F1 0.79" does not.',
      isCaseBased: false,
    },
    {
      question: 'What is the difference between a loss and a metric, and why can F1 not be a loss?',
      answer:
        'A loss is what the model optimizes during training and must be differentiable, because gradients flow backwards through it; a metric is what humans judge with and carries no such requirement. F1 is computed from hard label counts, so it is a step function of the model parameters — flat almost everywhere with jumps where a prediction crosses the threshold, meaning its gradient is zero or undefined and gives an optimizer nothing to descend. So you train with cross-entropy, which is smooth and rewards well-calibrated probabilities, and you judge with F1 at a chosen threshold. The gap between them is real, and it is why threshold tuning after training exists as a separate step — plus why differentiable surrogates (soft-F1, focal loss) get built when the mismatch actually costs money.',
      isCaseBased: false,
    },
    {
      question: 'A colleague reports "precision 1.0" on a rare-disease classifier. What do you check first?',
      answer:
        'How many positives it predicted at all. Precision = TP/(TP+FP) is undefined when the model flags nothing (0/0), and libraries print 0 or 1 depending on the zero_division setting — so "precision 1.0" is entirely consistent with a model that flags two obvious cases, or none. Ask for the raw counts: TP, FP, FN, and the number of predicted positives. If it flagged 3 of 400 true cases, precision 1.0 sits next to recall 0.0075 and the model is worthless. This is the general rule: precision and recall are only meaningful as a pair, because each has a degenerate strategy that maximises it — flag nothing for precision, flag everything for recall.',
      isCaseBased: false,
    },
    {
      question: 'Case: two candidate models for a fraud system. Model A: precision 0.90, recall 0.45. Model B: precision 0.55, recall 0.80. Which do you ship?',
      answer:
        'Refuse to answer until you have three things, and say so — that refusal is the signal being tested. One: the cost ratio. A chargeback averages several thousand rupees; a manual review costs a few minutes of analyst time, so C_FN/C_FP is often 50x or more, which points hard at Model B. Two: capacity. At 1% fraud on 100k daily transactions, B\'s precision of 0.55 means roughly 1,450 alerts a day versus A\'s ~500 — if the team can process 600, B\'s extra recall is fiction and you either ship A or ship B with a raised threshold. Three: whether the two models are actually different or the same ranking at different thresholds — compare PR-AUC; if it is identical, this is one model and one slider, and you should be tuning the threshold from cost and capacity rather than choosing a model at all. Final answer with numbers: compute C_FN x FN + C_FP x FP for both under the real prevalence, subject to the queue constraint, and ship the cheaper one.',
      isCaseBased: true,
    },
    {
      question: 'Recall is also called sensitivity and TPR. Where does specificity fit, and why do doctors quote both?',
      answer:
        'Sensitivity/recall/TPR = TP/(TP+FN) is computed entirely inside the positive row: of the sick, how many did the test catch. Specificity = TN/(TN+FP) is computed entirely inside the negative row: of the healthy, how many did it correctly clear. FPR = FP/(FP+TN) = 1 - specificity. Medicine quotes both because they are independent axes — a test can be 99% sensitive and 40% specific and be a screening tool, or 60% sensitive and 99% specific and be a confirmatory test — and because they are properties of the test, invariant to how common the disease is, unlike precision (PPV), which depends on prevalence and so changes between populations with the identical test. For ML: TPR against FPR as the threshold sweeps is precisely the ROC curve, and precision\'s prevalence-dependence is exactly why PR curves are preferred under heavy imbalance.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'The naming trick for TP/FP/FN/TN', back: 'Second word = what the MODEL said. First word = whether it was right. False Positive = model shouted positive and was wrong.' },
    { front: 'Precision', back: 'TP/(TP+FP) — of everything I flagged, how much was real. Denominator = my alarms. Pays for false alarms.' },
    { front: 'Recall (= sensitivity = TPR)', back: 'TP/(TP+FN) — of everything real, how much I caught. Denominator = reality. Pays for misses.' },
    { front: 'Specificity and FPR', back: 'Spec = TN/(TN+FP); FPR = FP/(FP+TN) = 1 - spec. Both live in the negative row. TPR vs FPR = the ROC curve.' },
    { front: 'Why F1 is harmonic, not arithmetic', back: 'Averaging reciprocals lets the smaller value dominate. P=1.0, R=0.01: harmonic 0.0198 vs arithmetic 0.505. F1 is high only if BOTH are high.' },
    { front: 'F-beta and choosing beta', back: 'F_b = (1+b^2)PR/(b^2 P + R). Recall gets weight b^2, so b = sqrt(C_FN/C_FP). b>1 recall (cancer), b<1 precision (spam).' },
    { front: 'The two degenerate strategies', back: 'Flag everything: recall = 1, precision = base rate. Flag nothing: recall = 0, precision = 0/0 undefined. Never quote one without the other.' },
    { front: 'When accuracy is fine', back: 'Balanced classes AND symmetric error costs. Otherwise it lies. Always print the majority-class baseline (1 - positive rate) next to it.' },
    { front: 'Micro vs macro vs weighted', back: 'Micro = pooled counts, samples equal, = accuracy in single-label multi-class. Macro = unweighted per-class mean, classes equal, exposes rare-class failure. Weighted = macro x support, back near micro.' },
    { front: 'Loss vs metric', back: 'Loss must be differentiable (gradients flow through it); a metric need not. F1 is a step function of the parameters — train on cross-entropy, judge on F1.' },
  ],
  mindmapMarkdown: `- The Confusion Matrix: Precision, Recall & F1
  - The four cells
    - TP 150, FP 30, FN 50, TN 770 (spam filter)
    - Naming trick: 2nd word = model said, 1st word = right?
    - False Positive = shouted positive, was wrong
    - Errors are FP and FN — pick which one you prefer
  - Precision
    - TP/(TP+FP) = 0.833
    - denominator = what I flagged
    - cost of a false alarm
  - Recall (sensitivity, TPR)
    - TP/(TP+FN) = 0.750
    - denominator = what was real
    - cost of a miss
    - neither contains TN → survives imbalance
  - The threshold trade
    - lower → recall up, precision down
    - flag everything: R=1, P=base rate
    - flag nothing: R=0, P undefined (0/0)
  - F1
    - harmonic mean 2PR/(P+R) = 0.789
    - harmonic punishes imbalance
    - P=1.0, R=0.01 → F1 0.02 vs arithmetic 0.505
  - F-beta
    - (1+b^2)PR/(b^2 P + R)
    - recall weight = beta squared
    - beta = sqrt(C_FN/C_FP)
    - F2 = 0.765, F0.5 = 0.815 (same model)
    - know real costs → minimise C_FN·FN + C_FP·FP
  - Negative-row metrics
    - specificity TN/(TN+FP) = 0.9625
    - FPR = 1 - specificity = 0.0375
    - ROC = TPR vs FPR (next module)
  - Accuracy
    - (TP+TN)/all = 0.920
    - fine: balanced classes + symmetric costs
    - lies: rare positives, asymmetric costs
    - always show majority-class baseline
  - Which metric wins
    - spam → precision (real mail lost)
    - cancer → recall (missed tumour)
    - recall capped by review capacity
  - Multi-class averaging
    - micro = pooled counts = accuracy
    - macro = per-class mean, classes equal
    - weighted = macro × support
    - worked: micro 0.932 vs macro 0.628
  - Read the matrix, not the number
    - 14 of 20 class C called A
    - one-directional confusion = class prior
    - symmetric confusion = feature overlap
  - Loss vs metric
    - loss differentiable, metric need not be
    - train cross-entropy, judge F1`,
}

export default m
