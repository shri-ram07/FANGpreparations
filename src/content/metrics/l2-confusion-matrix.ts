import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l2-confusion-matrix',
  subjectId: 'metrics',
  level: 2,
  title: 'The Confusion Matrix',
  whyItMatters:
    'One 2×2 table, and every classification metric you will ever be asked about falls out of it by arithmetic. Learn to read the table and you never have to memorise a formula again.',
  assumes: [
    'You can compute a fraction',
    'You know what a classifier outputs: a score, then a decision',
  ],
  estMinutes: 22,
  sections: [
    {
      type: 'intuition',
      title: 'What a confusion matrix is',
      md: `A **confusion matrix** is a table counting every combination of what was true and what the model said. For two classes it has four cells, and every metric is a ratio of some of them.

The naming looks confusing and is not. Read each label as **two words, right to left**:

- The **second** word is what the **model said** — Positive or Negative.
- The **first** word says whether the model was **right** — True or False.

So a **False Negative** is: the model said Negative, and it was wrong. A missed spam.`,
    },
    {
      type: 'math',
      intro:
        'A spam filter over 1,000 emails, 200 of them genuinely spam. Spam is the positive class — "positive" just means the thing you are looking for, not a good thing. Row sums are the truth; column sums are what the model did.',
      latex: [
        '\\begin{array}{c|cc} & \\textbf{model: spam} & \\textbf{model: real} \\\\ \\hline \\textbf{truly spam} & TP = 150 & FN = 50 \\\\ \\textbf{truly real} & FP = 30 & TN = 770 \\end{array}',
        '\\text{Rows are the truth (200 spam, 800 real). Columns are the model (180 flagged, 820 left alone).}',
      ],
    },
    {
      type: 'intuition',
      title: 'Precision and recall are two directions through the same table',
      md: `**Precision** looks **down the column you acted on**. Of the 180 emails the filter flagged, how many really were spam? 150/180 = **0.833**. It is how much your alarm can be trusted.

**Recall** looks **across the row that was actually positive**. Of the 200 emails that truly were spam, how many did you catch? 150/200 = **0.750**. It is how much you found.

They answer different questions and they move in opposite directions, which is the entire subject of everything below.`,
    },
    {
      type: 'math',
      intro:
        'Every metric, as a ratio of cells. Note the aliases — recall, sensitivity and true positive rate are three names for one number, and people switch between them mid-sentence. Specificity is recall for the negative class, and FPR is simply 1 minus it.',
      latex: [
        '\\text{Precision} = \\frac{TP}{TP + FP} \\qquad \\text{Recall} = \\text{Sensitivity} = \\text{TPR} = \\frac{TP}{TP + FN}',
        '\\text{Specificity} = \\text{TNR} = \\frac{TN}{TN + FP} \\qquad \\text{FPR} = \\frac{FP}{FP + TN} = 1 - \\text{Specificity}',
        '\\text{Accuracy} = \\frac{TP + TN}{TP + TN + FP + FN} \\qquad F_1 = 2\\,\\frac{P \\cdot R}{P + R}',
        '\\text{This filter: } P = 0.833,\\; R = 0.750,\\; F_1 = 0.789,\\; \\text{Acc} = 0.920,\\; \\text{Spec} = 0.9625',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Four counts to four metrics, on a smaller table',
      code: `TP, FP, FN, TN = 4, 2, 1, 5

precision = TP / (TP + FP)
recall = TP / (TP + FN)
f1 = 2 * precision * recall / (precision + recall)
accuracy = (TP + TN) / (TP + FP + FN + TN)

print('precision = %d/%d = %.3f' % (TP, TP + FP, precision))
print('recall    = %d/%d = %.3f' % (TP, TP + FN, recall))
print('f1        = %.3f' % f1)
print('accuracy  = %.3f' % accuracy)

# ---- real output ----
# precision = 4/6 = 0.667
# recall    = 4/5 = 0.800
# f1        = 0.727
# accuracy  = 0.750`,
      annotations: {
        3: 'Precision divides by the COLUMN total, TP + FP — everything the model flagged.',
        4: 'Recall divides by the ROW total, TP + FN — everything that truly was positive. Same numerator, different denominator; that is the whole difference.',
        13: 'F1 is 0.727, sitting between 0.667 and 0.800 but nearer the smaller one. That pull toward the lower value is deliberate, and the next section is why.',
      },
    },
    {
      type: 'visual',
      component: 'ConfusionMatrixLab',
      props: {},
    },
    {
      type: 'note',
      label: 'What to do with that panel',
      md: `Drag the threshold and watch all four cells and all four metrics move **together**. That single gesture is the lesson of this module.

Push the threshold **down** and you flag more: recall climbs toward 1.0 while precision collapses, because you are hoovering up genuine mail to catch the last few spams. Push it **up** and precision climbs while recall falls.

A classifier does not output a label. It outputs a **score**, and the **threshold** is a separate decision made afterwards — which is why precision and recall are properties of an operating point, not of a model.`,
    },
    {
      type: 'intuition',
      title: 'F1: why the harmonic mean',
      md: `When you need one number, F1 combines precision and recall — but as a **harmonic mean**: flip both, average them, flip back.

The reason is that the ordinary mean rewards a useless extreme. A model that flags every single email has recall 1.0 and precision 0.2; the ordinary mean is a respectable 0.6, while F1 is **0.333**.

The harmonic mean is dragged toward the smaller value, so it cannot be gamed by maximising one at the other's expense. Both have to be decent.`,
    },
    {
      type: 'math',
      intro:
        'F1 derived rather than quoted. Start from the definition, put the two fractions over a common denominator, then flip. Nothing here is more than school algebra, and it is worth doing once so the formula stops looking arbitrary.',
      latex: [
        'F_1 = \\frac{2}{\\frac{1}{P} + \\frac{1}{R}} \\qquad \\text{(the definition: flip both, average, flip back)}',
        '\\frac{1}{P} + \\frac{1}{R} = \\frac{R}{PR} + \\frac{P}{PR} = \\frac{P + R}{PR}',
        'F_1 = \\frac{2}{\\frac{P+R}{PR}} = 2 \\cdot \\frac{PR}{P+R}',
      ],
    },
    {
      type: 'intuition',
      title: 'F-beta: when a miss costs more than a false alarm',
      md: `F1 hides an assumption. It weights 1/P and 1/R equally — a statement that a false alarm and a miss are equally bad. For cancer screening that is plainly false.

**F-beta** lets you re-weight them, and the algebra says exactly one thing: **β² is how many times more weight recall gets than precision.**

β = 2 means recall counts four times as much as precision. β = 0.5 means precision counts four times as much. Choosing β is a business decision about relative cost, not a statistical one.`,
    },
    {
      type: 'math',
      intro:
        'The same derivation, with the two weights no longer equal. The final line is the one to remember: the ratio of the weights is exactly β², and the (1 + β²) cancels out.',
      latex: [
        '\\frac{1}{F_\\beta} = \\underbrace{\\frac{1}{1+\\beta^2}}_{\\text{weight on }P} \\cdot \\frac{1}{P} \\;+\\; \\underbrace{\\frac{\\beta^2}{1+\\beta^2}}_{\\text{weight on }R} \\cdot \\frac{1}{R}',
        'F_\\beta = (1+\\beta^2)\\,\\frac{P \\cdot R}{\\beta^2 P + R}',
        '\\frac{\\text{weight on } 1/R}{\\text{weight on } 1/P} = \\frac{\\beta^2/(1+\\beta^2)}{1/(1+\\beta^2)} = \\beta^2',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Multi-class: micro 0.932 against macro 0.628, identical predictions',
      code: `import numpy as np
from sklearn.metrics import f1_score, accuracy_score

M = np.array([[880, 15,  5],
              [ 30, 48,  2],
              [ 14,  2,  4]])
y_true = np.repeat([0, 0, 0, 1, 1, 1, 2, 2, 2], M.ravel())
y_pred = np.repeat([0, 1, 2, 0, 1, 2, 0, 1, 2], M.ravel())

for avg in ('micro', 'macro', 'weighted'):
    print('%-8s F1 = %.3f' % (avg, f1_score(y_true, y_pred, average=avg)))
print('accuracy = %.3f' % accuracy_score(y_true, y_pred))

# ---- real output ----
# micro    F1 = 0.932
# macro    F1 = 0.628
# weighted F1 = 0.927
# accuracy = 0.932`,
      annotations: {
        4: 'A 3x3 confusion matrix. Class A has 900 rows, B has 80, C has 20 — heavily imbalanced, which is the point.',
        7: 'np.repeat expands the counts back into label arrays: 880 rows of (true A, pred A), 15 of (true A, pred B), and so on. It reconstructs the raw predictions the matrix summarises.',
        14: 'Micro 0.932 pools all classes and is therefore dominated by A — and for single-label problems it always equals accuracy exactly, which is why the two lines match.',
        15: 'Macro 0.628 averages the per-class F1 scores with equal weight, so class C at F1 0.258 counts as much as class A at 0.965. Identical predictions, and a 30-point difference in the headline number purely from which average you chose.',
      },
    },
    {
      type: 'note',
      label: 'The classic mistake',
      md: `Reporting a single F1 without saying which averaging it uses. Micro and macro differ by **0.304** on the same predictions above, and both are correct — they answer different questions.

**Micro** asks "how often is the system right?" and lets the big classes dominate. **Macro** asks "how well does it do on a typical class?" and treats a 20-row class as equal to a 900-row one. **Weighted** is macro weighted by support, which usually tracks micro.

Say which one you mean. And when a rare class matters, look at its per-class row rather than any average at all.`,
    },
  ],
  quiz: [
    {
      question: 'What is a False Negative?',
      options: [
        { text: 'The model said positive and was wrong', explanation: 'That is a False Positive — read right to left: the second word is what the model said.' },
        { text: 'The model said negative and was wrong — a missed spam', explanation: 'Correct. Second word: the model said Negative. First word: it was False, i.e. wrong.' },
        { text: 'The model said negative and was right', explanation: 'That is a True Negative.' },
        { text: 'A negative value in the matrix', explanation: 'All cells are counts and are non-negative.' },
      ],
      correct: 1,
    },
    {
      question: 'Precision is 150/180 and recall is 150/200. What distinguishes them?',
      options: [
        { text: 'Different numerators', explanation: 'Both numerators are TP = 150.' },
        { text: 'The denominator: precision divides by the column the model acted on, recall by the row that was truly positive', explanation: 'Correct. Same numerator, different denominator — precision is down a column, recall across a row.' },
        { text: 'Precision uses the test set and recall the training set', explanation: 'Both are computed on the same predictions.' },
        { text: 'Recall includes true negatives', explanation: 'Neither precision nor recall contains TN, which is why both survive imbalance.' },
      ],
      correct: 1,
    },
    {
      question: 'A model flags every email: recall 1.0, precision 0.2. Why is F1 0.333 rather than 0.6?',
      options: [
        { text: 'A rounding difference', explanation: '0.333 and 0.6 are far apart; this is the harmonic mean behaving as designed.' },
        { text: 'The harmonic mean is dragged toward the smaller value, so one metric cannot be sacrificed for the other', explanation: 'Correct. The ordinary mean would reward this useless model with 0.6.' },
        { text: 'F1 penalises high recall', explanation: 'It penalises imbalance between the two, not recall specifically.' },
        { text: 'Precision was computed incorrectly', explanation: '0.2 is correct if 20% of emails are spam and everything is flagged.' },
      ],
      correct: 1,
    },
    {
      question: 'What does β = 2 mean in F-beta?',
      options: [
        { text: 'Recall counts twice as much as precision', explanation: 'The weight ratio is β², not β.' },
        { text: 'Recall counts four times as much as precision', explanation: 'Correct. The ratio of weights is β² = 4, which the derivation shows explicitly.' },
        { text: 'Precision counts four times as much', explanation: 'That would be β = 0.5.' },
        { text: 'Two classes are being scored', explanation: 'β has nothing to do with class count.' },
      ],
      correct: 1,
    },
    {
      question: 'Micro F1 is 0.932 and macro F1 is 0.628 on identical predictions. What causes the gap?',
      options: [
        { text: 'One of them is computed wrongly', explanation: 'Both are correct; they answer different questions.' },
        { text: 'Micro pools all classes so the 900-row class dominates; macro gives the 20-row class equal weight', explanation: 'Correct. Class C scores F1 0.258 and counts as much as class A at 0.965 under macro.' },
        { text: 'Micro was computed on a different test set', explanation: 'Same y_true and y_pred for both.' },
        { text: 'Macro ignores the majority class', explanation: 'It includes it — with equal rather than proportional weight.' },
      ],
      correct: 1,
    },
    {
      question: 'Why does micro F1 equal accuracy exactly here?',
      options: [
        { text: 'Coincidence of these numbers', explanation: 'It holds for every single-label multi-class problem.' },
        { text: 'For single-label problems every error is simultaneously a FP for one class and a FN for another, so micro-precision, micro-recall and accuracy all coincide', explanation: 'Correct, which is why reporting micro F1 as though it were extra information is misleading.' },
        { text: 'Because the classes are imbalanced', explanation: 'The identity holds regardless of balance.' },
        { text: 'Because F1 is a harmonic mean', explanation: 'The harmonic mean of two equal numbers is that number, but the reason they are equal is the pooling identity.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain precision and recall without using the words precision or recall.',
      answer:
        'Of everything I raised an alarm about, how much was genuine — that is one. Of everything genuine that existed, how much did I find — that is the other. On the spam filter: 150 of the 180 flagged were really spam, so the alarm can be trusted 83% of the time; and 150 of the 200 actual spams were caught, so a quarter got through. They have the same numerator and different denominators, which is why one goes down a column of the confusion matrix and the other across a row.',
      isCaseBased: true,
    },
    {
      question: 'When would you optimise for precision over recall, and vice versa?',
      answer:
        'Precision when a false alarm is expensive or erodes trust — a spam filter that eats real mail, an automated account suspension, a medical intervention with real side effects. Recall when a miss is expensive — cancer screening, fraud, safety-critical detection — and there is a cheap second stage to filter the false alarms, which is usually a human. The general framing is: which mistake costs more, and is there a cheap way to catch the other kind afterwards?',
      isCaseBased: false,
    },
    {
      question: 'Why the harmonic mean for F1?',
      answer:
        'Because the arithmetic mean can be gamed. Flag everything and you get recall 1.0 with precision 0.2 on a 20%-positive dataset — the arithmetic mean is 0.6, which looks respectable for a model that has done nothing. F1 gives 0.333, because the harmonic mean is pulled toward the smaller of the two. It forces both to be decent rather than letting one carry the other, which is exactly what you want from a single summary number.',
      isCaseBased: false,
    },
    {
      question: 'How do you choose β in F-beta?',
      answer:
        'From the cost ratio, since the algebra shows β² is how many times more weight recall gets. If a miss costs roughly four times a false alarm, β = 2. The honest way to set it is to ask the business what each mistake costs — reviewer time for a false alarm, expected loss for a miss — and take the square root of the ratio. If nobody can give you those numbers, that itself is worth surfacing, because it means nobody has decided what the system is for.',
      isCaseBased: true,
    },
    {
      question: 'Micro, macro or weighted — which do you report?',
      answer:
        'It depends on the question, and the answer must be stated. Macro when every class matters equally, which is usually the case when rare classes are the interesting ones — it gave 0.628 where micro gave 0.932 on the same predictions. Micro when overall throughput is what matters, though note that for single-label problems it is exactly accuracy, so it adds nothing. Weighted when you want a class-aware number that still reflects the real distribution. And for any genuinely important rare class I would show its per-class row rather than any average.',
      isCaseBased: false,
    },
    {
      question: 'Precision is undefined when the model flags nothing. What should happen?',
      answer:
        'It is 0/0, and the choice matters. Scikit-learn lets you pick with zero_division: 0 treats it as a total failure, 1 treats it as perfect. Neither is obviously right, but 0 is far safer as a default — a model that never fires should not score 1.0 on anything, and reporting perfect precision for a silent model is exactly how a broken system passes review. The real fix is to notice that recall is 0 and report that instead.',
      isCaseBased: true,
    },
    {
      question: 'What does the confusion matrix tell you that a single metric cannot?',
      answer:
        'Which mistake you are making. Two models with identical F1 can have completely different FP/FN splits, and the business consequences differ entirely. It also exposes the base rate, which tells you whether accuracy is meaningful at all. In multi-class it shows *which* classes are being confused with which — a 3×3 matrix where C is consistently predicted as A is a specific, fixable problem that "macro F1 0.628" completely hides.',
      isCaseBased: false,
    },
    {
      question: 'Are precision and recall properties of a model?',
      answer:
        'No — they are properties of a model at an operating point. The classifier outputs a score; the threshold is a separate decision made afterwards, and moving it slides both metrics without retraining anything. That is why quoting a single precision/recall pair is incomplete unless the threshold is stated, and why threshold-free summaries like PR-AUC exist for comparing models rather than operating points.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Reading the four cells', back: 'Two words, right to left. Second word = what the model said. First word = whether it was right. False Negative = said negative, was wrong.' },
    { front: 'Precision vs recall', back: 'Same numerator TP. Precision divides by the column acted on (TP+FP); recall by the truly-positive row (TP+FN). 150/180 = 0.833 and 150/200 = 0.750.' },
    { front: 'The aliases', back: 'Recall = sensitivity = TPR. Specificity = TNR = TN/(TN+FP). FPR = 1 − specificity.' },
    { front: 'Why harmonic mean for F1?', back: 'Flag everything: recall 1.0, precision 0.2. Arithmetic mean 0.6 looks fine; F1 gives 0.333. The harmonic mean is dragged toward the smaller value.' },
    { front: 'F1 formula, derived', back: 'F1 = 2/(1/P + 1/R). Common denominator PR gives (P+R)/PR, and flipping gives 2·PR/(P+R).' },
    { front: 'What β means', back: 'β² is how many times more weight recall gets than precision. β = 2 → recall counts 4×. β = 0.5 → precision counts 4×.' },
    { front: 'Micro vs macro', back: 'Micro pools all classes (big ones dominate); macro averages per-class equally. On the same predictions: 0.932 vs 0.628.' },
    { front: 'Micro F1 = accuracy', back: 'For single-label multi-class, every error is a FP for one class and a FN for another, so micro-P, micro-R and accuracy all coincide.' },
  ],
  mindmapMarkdown: `- The confusion matrix
  - Reading it
    - two words, right to left
    - second word = what the model said
    - first word = was it right
    - FN = said negative, was wrong
  - The spam filter
    - TP 150, FN 50, FP 30, TN 770
    - precision 150/180 = 0.833 (down a column)
    - recall 150/200 = 0.750 (across a row)
    - F1 0.789, accuracy 0.920, specificity 0.9625
  - Aliases
    - recall = sensitivity = TPR
    - specificity = TNR, FPR = 1 - specificity
  - F1
    - harmonic mean: flip, average, flip back
    - flag-everything: P 0.2, R 1.0
      - arithmetic mean 0.6, F1 0.333
    - F1 = 2PR/(P+R)
  - F-beta
    - beta^2 = weight ratio recall:precision
    - beta 2 -> recall counts 4x
    - a cost decision, not a statistical one
  - Multi-class averaging
    - micro 0.932 (= accuracy), macro 0.628
    - same predictions, 30-point gap
    - always say which one`,
}

export default m
