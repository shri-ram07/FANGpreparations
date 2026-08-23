import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l2-roc-pr-curves',
  subjectId: 'metrics',
  level: 2,
  title: 'ROC, AUC and PR Curves',
  whyItMatters:
    'Precision and recall describe a model at one threshold. These describe it at every threshold at once — and the difference between the two curves is what stops you shipping a fraud model that looks excellent and catches nothing.',
  assumes: [
    'You have read The Confusion Matrix — TPR, FPR, precision and recall',
    'You have seen a Python list and a for loop',
  ],
  estMinutes: 22,
  sections: [
    {
      type: 'intuition',
      title: 'What a curve is here',
      md: `The word *curve* sounds like something a formula draws. It is not. It is a set of dots joined in order, and you place the dots yourself.

Pick a threshold. That gives you a confusion matrix, which gives you two numbers. Plot that pair as one dot. Now pick another threshold, and another. **One threshold, one dot.**

The **ROC curve** plots TPR up against FPR across. The **PR curve** plots precision up against recall across. Same sweep, one axis swapped — and that one swap is the whole difference.`,
    },
    {
      type: 'math',
      intro:
        'The two axes of the ROC curve, both already familiar from the confusion matrix. Two of the dots come free: a threshold above every score flags nothing, and one below every score flags everything, so every ROC curve starts at (0,0) and ends at (1,1) regardless of the model.',
      latex: [
        '\\text{TPR} = \\text{recall} = \\frac{TP}{TP + FN} \\qquad \\text{FPR} = \\frac{FP}{FP + TN} = 1 - \\text{specificity}',
        '\\text{One ROC dot at threshold } t \\;=\\; \\big(\\,\\text{FPR}(t),\\; \\text{TPR}(t)\\,\\big)',
        't \\text{ above every score} \\Rightarrow (0,0) \\qquad t \\text{ below every score} \\Rightarrow (1,1)',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'One threshold, one dot',
      code: `scores = [0.95, 0.90, 0.80, 0.75, 0.60, 0.55, 0.40, 0.35, 0.20, 0.10]
truth  = [1, 1, 0, 1, 1, 0, 0, 1, 0, 0]

P = sum(truth)
N = len(truth) - P

t = 0.70
tp = 0
fp = 0
for score, label in zip(scores, truth):
    if score >= t and label == 1:
        tp = tp + 1
    elif score >= t:
        fp = fp + 1
print('threshold %.2f -> TP=%d FP=%d  TPR=%.2f  FPR=%.2f' % (t, tp, fp, tp / P, fp / N))

# ---- real output ----
# threshold 0.70 -> TP=3 FP=1  TPR=0.60  FPR=0.20`,
      annotations: {
        1: 'Ten emails already scored and sorted highest first. Five are genuinely spam.',
        11: 'zip walks scores and truth together, handing out (0.95, 1), then (0.90, 1), and so on.',
        16: 'At t = 0.70 the model flags the top four: three real spams and one mistake. TPR 3/5 = 0.60, FPR 1/5 = 0.20. That single pair is one dot on the ROC curve.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The sweep: all eleven dots',
      code: `tp = 0
fp = 0
points = [(0.0, 0.0)]
for label in truth:
    if label == 1:
        tp = tp + 1
    else:
        fp = fp + 1
    points.append((fp / N, tp / P))

print(' '.join('(%.1f,%.1f)' % pt for pt in points))

# ---- real output ----
# (0.0,0.0) (0.0,0.2) (0.0,0.4) (0.2,0.4) (0.2,0.6) (0.2,0.8) (0.4,0.8) (0.6,0.8) (0.6,1.0) (0.8,1.0) (1.0,1.0)`,
      annotations: {
        3: 'Start at (0,0) — the threshold above every score, where nothing is flagged.',
        4: 'Because the rows are already sorted by score, walking down the list IS lowering the threshold one step at a time. No sorting or re-thresholding is needed.',
        6: 'A real positive moves the dot UP; a negative moves it RIGHT. A perfect model would go all the way up first, then all the way right.',
        13: 'Eleven dots for ten examples. The staircase goes up twice, right once, up twice — you can read the ranking straight off the shape.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'AUC, and the pair count that equals it',
      code: `auc = 0.0
for i in range(1, len(points)):
    fpr_prev, tpr_prev = points[i - 1]
    fpr_now, tpr_now = points[i]
    auc = auc + (fpr_now - fpr_prev) * (tpr_now + tpr_prev) / 2
print('area under the staircase = %.3f' % auc)

ordered = 0
for i in range(len(truth)):
    for j in range(len(truth)):
        if truth[i] == 1 and truth[j] == 0 and scores[i] > scores[j]:
            ordered = ordered + 1
print('correctly ordered pairs = %d of %d -> %.3f' % (ordered, P * N, ordered / (P * N)))

# ---- real output ----
# area under the staircase = 0.800
# correctly ordered pairs = 20 of 25 -> 0.800`,
      annotations: {
        5: 'The trapezoid rule: width times average height, summed across the staircase. The plot sits in a 1x1 square, so the area is directly a fraction of it.',
        12: 'Every (positive, negative) pair, counting the ones the model ranked the right way round. There are 5 x 5 = 25 such pairs.',
        16: '0.800 both ways, and this is not a coincidence. **AUC is exactly the probability that a randomly chosen positive scores higher than a randomly chosen negative.** That is the interpretation to give in an interview, not "area under a curve".',
      },
    },
    {
      type: 'visual',
      component: 'ConfusionMatrixLab',
      props: {},
    },
    {
      type: 'note',
      label: 'Why AUC is threshold-free',
      md: `Every dot on the curve is one threshold. The area uses **all** of them, so AUC never depends on which one you would pick.

That makes it the right tool for **comparing models** — it asks "does this model rank positives above negatives?" without committing to an operating point. It makes it the wrong tool for **deciding what to ship**, because you will ship exactly one threshold and AUC has told you nothing about which.

It also means AUC is invariant to any monotonic rescaling of the scores: it only sees the ordering.`,
    },
    {
      type: 'intuition',
      title: 'Where ROC starts flattering a bad model',
      md: `One million card transactions. 10,000 are fraud (1%), 990,000 are legitimate. Your model catches 90% of the fraud.

TP = 9,000, FN = 1,000. Suppose it also raises 49,500 false alarms. FPR is 49,500 / 990,000 = **0.05** — which looks excellent, because the denominator is enormous.

But precision is 9,000 / 58,500 = **0.154**. Six out of seven alerts are wrong.

FPR divides by the huge negative class and is therefore anaesthetised by it. Precision divides by what you actually flagged, and is not.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Identical model, balanced against 1-in-100',
      code: `import random
random.seed(0)

def sweep(rows):
    P = sum(label for score, label in rows)
    N = len(rows) - P
    tp = fp = 0
    roc = ap = 0.0
    for score, label in rows:
        if label == 1:
            tp = tp + 1
            ap = ap + (tp / (tp + fp)) / P
        else:
            fp = fp + 1
            roc = roc + tp / (P * N)
    return roc, ap

def make(n_pos, n_neg):
    rows = [(random.gauss(2.0, 1.0), 1) for _ in range(n_pos)]
    rows += [(random.gauss(0.0, 1.0), 0) for _ in range(n_neg)]
    rows.sort(reverse=True)
    return rows

for name, n_pos, n_neg in [('balanced 50/50', 5000, 5000), ('rare 1 in 100', 500, 49500)]:
    roc, ap = sweep(make(n_pos, n_neg))
    print('%-15s base rate %.3f  ROC-AUC %.3f  PR-AUC %.3f'
          % (name, n_pos / (n_pos + n_neg), roc, ap))

# ---- real output ----
# balanced 50/50  base rate 0.500  ROC-AUC 0.923  PR-AUC 0.925
# rare 1 in 100   base rate 0.010  ROC-AUC 0.914  PR-AUC 0.216`,
      annotations: {
        14: 'Counting ordered pairs incrementally: each negative contributes the positives already above it. This is the pair-counting definition of AUC, computed in one pass instead of the 25 comparisons above.',
        19: 'The two classes are drawn from Gaussians centred at 2.0 and 0.0 in BOTH scenarios. The model is genuinely identical; only the mix changes.',
        26: 'Balanced: ROC-AUC 0.923, PR-AUC 0.925 — the two agree, and both are honest.',
        27: 'Rare: ROC-AUC 0.914, barely moved. PR-AUC 0.216, collapsed. Same separability, and ROC is almost blind to the change while PR is not.',
      },
    },
    {
      type: 'note',
      label: 'The rule that falls out',
      md: `**When the positive class is rare, report PR-AUC.** ROC-AUC held at 0.914 while PR-AUC fell to 0.216 on the same model — ROC is anaesthetised by the huge negative class in its FPR denominator.

Two more things worth knowing:

- **The PR baseline is the base rate**, not 0.5. A random model scores PR-AUC ≈ 0.01 at a 1% positive rate, so "PR-AUC 0.216" is 20× chance, not a failure. ROC's baseline is always 0.5.
- **PR-AUC is not comparable across datasets** with different base rates, precisely because its floor moves. ROC-AUC is.`,
    },
  ],
  quiz: [
    {
      question: 'What does a single dot on an ROC curve represent?',
      options: [
        { text: 'One example', explanation: 'Each dot summarises the whole dataset at one cut-off.' },
        { text: 'One threshold, and the (FPR, TPR) pair its confusion matrix produces', explanation: 'Correct. One threshold, one confusion matrix, one dot.' },
        { text: 'One model', explanation: 'One model produces the entire curve.' },
        { text: 'The optimal operating point', explanation: 'Nothing about a dot marks it as optimal; that is a separate decision.' },
      ],
      correct: 1,
    },
    {
      question: 'Why does every ROC curve start at (0,0) and end at (1,1)?',
      options: [
        { text: 'By convention, the ends are drawn in', explanation: 'They are genuine operating points, not decoration.' },
        { text: 'A threshold above every score flags nothing; one below every score flags everything', explanation: 'Correct — TP = FP = 0 at one end, and everything flagged at the other, for any model at all.' },
        { text: 'Because AUC must be between 0 and 1', explanation: 'The range follows from the endpoints, not the other way round.' },
        { text: 'Only for well-calibrated models', explanation: 'It holds regardless of calibration.' },
      ],
      correct: 1,
    },
    {
      question: 'The staircase area was 0.800 and the ordered-pair count was 20/25 = 0.800. What does that identity mean?',
      options: [
        { text: 'A coincidence of these ten examples', explanation: 'It is an exact identity that holds always.' },
        { text: 'AUC IS the probability that a random positive scores above a random negative', explanation: 'Correct, and that is the interpretation to give in an interview rather than "area under a curve".' },
        { text: 'The model is perfectly calibrated', explanation: 'AUC sees only ordering and says nothing about calibration.' },
        { text: 'The trapezoid rule is exact for staircases', explanation: 'True but incidental — the identity is about what AUC measures.' },
      ],
      correct: 1,
    },
    {
      question: 'On the same model, ROC-AUC went 0.923 → 0.914 while PR-AUC went 0.925 → 0.216. What changed?',
      options: [
        { text: 'The model got worse', explanation: 'Both classes were drawn from the same Gaussians in both runs — separability is identical.' },
        { text: 'Only the class balance, from 50/50 to 1-in-100', explanation: 'Correct. FPR divides by the huge negative class and is anaesthetised; precision divides by what you flagged and is not.' },
        { text: 'The threshold moved', explanation: 'Both are threshold-free summaries.' },
        { text: 'The scores were rescaled', explanation: 'AUC is invariant to monotonic rescaling anyway.' },
      ],
      correct: 1,
    },
    {
      question: 'A model scores PR-AUC 0.216 at a 1% base rate. Is that bad?',
      options: [
        { text: 'Yes — anything below 0.5 is worse than chance', explanation: 'That is ROC\'s baseline, not PR\'s.' },
        { text: 'No — the PR baseline is the base rate, so 0.216 is roughly 20× chance', explanation: 'Correct. PR-AUC\'s floor moves with prevalence, which is exactly why it is not comparable across datasets.' },
        { text: 'It cannot be judged without the threshold', explanation: 'PR-AUC is threshold-free.' },
        { text: 'Yes, because ROC-AUC was 0.914', explanation: 'The two answer different questions; the gap is the information, not a contradiction.' },
      ],
      correct: 1,
    },
    {
      question: 'When is AUC the wrong tool?',
      options: [
        { text: 'When comparing two models', explanation: 'That is precisely what it is good for.' },
        { text: 'When deciding what to ship, since you will deploy one threshold and AUC averages over all of them', explanation: 'Correct. It never tells you which operating point to use.' },
        { text: 'When the scores are not probabilities', explanation: 'AUC only needs an ordering, so raw scores are fine.' },
        { text: 'When the dataset is large', explanation: 'Size is not a limitation.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'What does AUC actually mean?',
      answer:
        'It is the probability that a randomly chosen positive scores higher than a randomly chosen negative. That is not an analogy — on the ten-example set the staircase area was exactly 0.800 and counting correctly-ordered (positive, negative) pairs gave 20 of 25, also 0.800. It follows that AUC only sees the ranking, so it is invariant to any monotonic rescaling of the scores, and that 0.5 means the ordering is no better than chance.',
      isCaseBased: true,
    },
    {
      question: 'ROC or PR — how do you choose?',
      answer:
        'By the base rate. ROC uses FPR, whose denominator is the whole negative class, so when negatives massively outnumber positives it barely moves — on an identical model, going from 50/50 to 1-in-100 took ROC-AUC from 0.923 to 0.914 while PR-AUC collapsed from 0.925 to 0.216. For rare positives, PR is the honest picture because precision divides by what you actually flagged. The caveat is that PR-AUC\'s baseline is the base rate rather than 0.5, so it cannot be compared across datasets with different prevalence, whereas ROC-AUC can.',
      isCaseBased: true,
    },
    {
      question: 'Your model has AUC 0.95 and the product team says it is useless. Reconcile that.',
      answer:
        'Very likely a rare positive class, so the ranking is good but no usable threshold exists — at every cut-off the alert volume is either unmanageable or the recall is negligible. I would look at PR-AUC and at precision at the specific operating point they can actually staff, which is usually "top k alerts per day". It could also be that the model ranks well but is badly calibrated, so a probability-based threshold behaves unexpectedly. AUC measures ranking quality, and shipping requires a decision rule, which is a separate thing.',
      isCaseBased: true,
    },
    {
      question: 'What is average precision, and how does it relate to the PR curve?',
      answer:
        'It is the standard single-number summary of the PR curve — the mean of the precision values taken at each point where recall increases, which is the same as a step-wise area under the curve. It is preferred to trapezoidal interpolation because the PR curve is not monotonic and linear interpolation between points can be optimistically wrong. The incremental form in the code shows the mechanism clearly: each positive contributes its precision at that moment, divided by the number of positives.',
      isCaseBased: false,
    },
    {
      question: 'Can a model have high AUC and terrible calibration?',
      answer:
        'Easily, and it is common. AUC depends only on the ordering, so you can apply any monotonic transform to the scores — square them, take the log, push everything toward zero — and AUC is unchanged while the probabilities become nonsense. A model that outputs 0.99 for everything positive-ish and 0.98 for everything else can have AUC 1.0 with useless probabilities. If anything downstream consumes the probability rather than the rank, you need a reliability diagram and a calibration step.',
      isCaseBased: false,
    },
    {
      question: 'How would you choose an operating point once you have the curve?',
      answer:
        'From costs, not from the curve\'s shape. Assign a cost to a false positive and to a false negative, then pick the threshold minimising expected cost — that is the principled version. In practice the constraint is usually capacity: reviewers can handle 200 alerts a day, so take the threshold that produces 200 and report the recall you get. Youden\'s J or the "closest to top-left" heuristics are defensible only when the two error types genuinely cost the same, which is rare.',
      isCaseBased: false,
    },
    {
      question: 'Why does the ROC curve step up for a positive and right for a negative?',
      answer:
        'Because sweeping the threshold downward admits examples one at a time in score order. Admitting a true positive raises TP and therefore TPR, which is the vertical axis. Admitting a negative raises FP and therefore FPR, the horizontal one. So the shape of the staircase is a direct picture of the ranking: a perfect model goes all the way up before going right, and a random one climbs the diagonal.',
      isCaseBased: false,
    },
    {
      question: 'Two models have identical AUC. Are they interchangeable?',
      answer:
        'No. AUC is an average over all thresholds, and two curves can enclose the same area while crossing — one better at low FPR, the other better at high. If you operate at a specific point, the one that is better *there* is the one you want, and the average is irrelevant. I would compare them at the actual operating region — partial AUC over the FPR range you can tolerate, or precision at the alert budget — rather than at a single summary number.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'What is a "curve" here?', back: 'One threshold, one confusion matrix, one dot. Join the dots in order. ROC plots TPR against FPR; PR plots precision against recall.' },
    { front: 'AUC, properly stated', back: 'The probability that a random positive scores above a random negative. Verified: staircase area 0.800 = 20/25 ordered pairs.' },
    { front: 'Why the curve always spans (0,0)→(1,1)', back: 'A threshold above every score flags nothing; below every score flags everything. True for any model.' },
    { front: 'AUC is invariant to what?', back: 'Any monotonic rescaling of the scores — it sees only the ordering. Which is also why high AUC says nothing about calibration.' },
    { front: 'ROC vs PR under imbalance', back: 'Identical model, 50/50 → 1-in-100: ROC-AUC 0.923 → 0.914, PR-AUC 0.925 → 0.216. FPR is anaesthetised by the huge negative denominator.' },
    { front: 'The PR baseline', back: 'The base rate, not 0.5. PR-AUC 0.216 at 1% prevalence is ~20× chance. ROC\'s baseline is always 0.5.' },
    { front: 'Which is comparable across datasets?', back: 'ROC-AUC, because its baseline is fixed. PR-AUC is not, because its floor moves with prevalence.' },
    { front: 'When is AUC the wrong tool?', back: 'For deciding what to ship. You deploy one threshold; AUC averages over all of them and names none.' },
  ],
  mindmapMarkdown: `- ROC, AUC and PR
  - A curve is dots
    - one threshold -> one confusion matrix -> one dot
    - ROC: TPR up, FPR across
    - PR: precision up, recall across
    - always spans (0,0) to (1,1)
  - The sweep
    - sort by score, walk down = lowering the threshold
    - positive -> step UP, negative -> step RIGHT
    - t=0.70: TP 3, FP 1, TPR 0.60, FPR 0.20
  - AUC
    - area 0.800 = 20/25 ordered pairs
    - = P(random positive scores above random negative)
    - sees ONLY ordering -> says nothing about calibration
    - threshold-free: good for comparing, useless for shipping
  - Imbalance
    - same model, 50/50 -> 1-in-100
    - ROC-AUC 0.923 -> 0.914 (barely moves)
    - PR-AUC 0.925 -> 0.216 (collapses)
    - FPR denominator is the huge negative class
  - Baselines
    - ROC: always 0.5
    - PR: the base rate (so not comparable across datasets)`,
}

export default m
