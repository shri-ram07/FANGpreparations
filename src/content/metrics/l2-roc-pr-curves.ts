import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l2-roc-pr-curves',
  subjectId: 'metrics',
  level: 2,
  title: 'ROC, AUC & PR Curves: Judging a Model at Every Threshold',
  whyItMatters:
    'Precision, recall and F1 describe a model at ONE cut-off. Move the cut-off and every one of those numbers changes, even though the model did not. So "model A beats model B" usually means "A beat B at a cut-off somebody picked by accident". A curve fixes that: it measures the model at every cut-off at once, and hands you one number that does not depend on the choice. This module builds that curve by hand, ten rows at a time, and then shows the one situation where the famous version of it — ROC-AUC — quietly lies to you.',
  assumes: [
    'Read *The Confusion Matrix: Precision, Recall & F1* first — this module is its direct sequel and uses its four cells throughout',
    'You know precision = TP/(TP+FP) and recall = TP/(TP+FN), and can compute both from four counts',
    'You have seen a Python for loop, a list, and a list of pairs',
    'You know what a graph with an x-axis and a y-axis is, and what the area under a shape means',
  ],
  estMinutes: 45,
  sections: [
    {
      type: 'intuition',
      title: 'The same model, two cut-offs, two different verdicts',
      md: `Ten emails, each already given a **score** by the model — a number saying how spam-like it looks. Five really are spam. A **threshold** is the cut-off: score at or above it, call it spam.

- Set the threshold at **0.70**. The model flags 4 emails, 3 of them really spam. Precision = 3/4 = **0.750**, recall = 3/5 = **0.600**.
- Set it at **0.30** instead. Now it flags 8, and 5 of them really are spam. Precision = 5/8 = **0.625**, recall = 5/5 = **1.000**.
- Same model. Same ten emails. Same scores. Only the cut-off moved, and both numbers moved with it.
- So a sentence like "this model has precision 0.75" is incomplete. It is precision *at a threshold you have not been told*.
- The fix is not to pick a better threshold. The fix is to stop picking one, and measure the model at **all** of them.`,
    },
    {
      type: 'intuition',
      title: 'What a "curve" is here: one dot per threshold',
      md: `The word curve sounds like something a formula draws. It is not. Here it is just a set of dots joined in order, and you place the dots yourself.

- Pick a threshold. Compute two numbers from the resulting confusion matrix. That pair of numbers is the (x, y) of **one dot**.
- Pick a different threshold, get a different confusion matrix, place another dot.
- Do that for every threshold worth trying, join the dots left to right, and you have the curve.
- **Threshold-free** means exactly this and nothing more: the finished picture, and any single number summarising it, does not depend on which cut-off you would have chosen. Every cut-off is already in there.
- With ten scored rows there are only eleven interesting thresholds — one above every score, then one just below each of the ten scores. Eleven dots, and you can do all of them by hand in two minutes.`,
    },
    {
      type: 'intuition',
      title: 'The two numbers each dot is made of',
      md: `The ROC curve uses **TPR** for its y-axis and **FPR** for its x-axis. Both are defined on the four cells you already know, and both are already familiar under other names.

- **TPR — the true positive rate** = TP / (TP + FN). Of everything that truly was positive, what fraction did I catch. This is exactly **recall**, and in medicine it is called **sensitivity**. Three names, one formula.
- **FPR — the false positive rate** = FP / (FP + TN). Of everything that truly was negative, what fraction did I wrongly flag. It is the false-alarm rate on innocent cases.
- **Specificity** = TN / (TN + FP) — of everything that truly was negative, what fraction did I correctly leave alone. Same denominator as FPR, so **FPR = 1 - specificity**. A test that is 95% specific has an FPR of 0.05.
- Both fractions stay inside one row of the confusion matrix: TPR lives entirely in the positive row, FPR entirely in the negative row. Neither one knows how big the other row is.
- **ROC** stands for Receiver Operating Characteristic. It is a name from wartime radar and it tells you nothing. Ignore it; the definition above is the whole thing.`,
    },
    {
      type: 'intuition',
      title: 'Ten scored examples, swept by hand',
      md: `Here are the ten emails, sorted by score, highest first. **P** means it really was spam, **N** means it really was not. There are **5 P** and **5 N**, so each caught positive adds 1/5 = 0.2 to TPR, and each wrongly flagged negative adds 0.2 to FPR.

- The sorted list: 0.95 **P**, 0.90 **P**, 0.80 **N**, 0.75 **P**, 0.60 **P**, 0.55 **N**, 0.40 **N**, 0.35 **P**, 0.20 **N**, 0.10 **N**.
- Sweeping the threshold from above 0.95 down to below 0.10 means letting **exactly one more row cross** at a time, from the top down. Nothing else ever happens.
- So the sweep is a walk down that list, and each row tells you which way the pen moves: a **P** raises TPR, so the pen goes **up** 0.2. An **N** raises FPR, so the pen goes **right** 0.2.
- Writing the (FPR, TPR) pair after each row, starting from nothing flagged: **(0.0, 0.0)** → P → **(0.0, 0.2)** → P → **(0.0, 0.4)** → N → **(0.2, 0.4)** → P → **(0.2, 0.6)** → P → **(0.2, 0.8)**.
- Continuing: N → **(0.4, 0.8)** → N → **(0.6, 0.8)** → P → **(0.6, 1.0)** → N → **(0.8, 1.0)** → N → **(1.0, 1.0)**.
- Eleven dots. Read the shape: the pen climbs straight up twice before moving right at all, because the two highest-scored emails were both spam. That early climb **is** the model's skill, drawn.`,
    },
    {
      type: 'math',
      intro: 'The two axes, and what the two extreme thresholds do to them.',
      latex: [
        '\\text{TPR} = \\text{recall} = \\text{sensitivity} = \\frac{TP}{TP + FN} \\qquad \\text{FPR} = \\frac{FP}{FP + TN} = 1 - \\text{specificity}',
        '\\text{One ROC dot at threshold } t \\;=\\; \\big(\\,\\text{FPR}(t),\\; \\text{TPR}(t)\\,\\big)',
        't \\text{ above every score} \\Rightarrow (0,0)\\;\\text{flag nothing} \\qquad t \\text{ below every score} \\Rightarrow (1,1)\\;\\text{flag everything}',
      ],
    },
    {
      type: 'note',
      md: `Two of the eleven dots were free. **(0,0)** is the threshold above every score: you flag nothing, so TP = 0 and FP = 0. **(1,1)** is the threshold below every score: you flag everything, so you catch all the spam (TPR = 1) and also accuse every genuine email (FPR = 1). A model that has learned nothing hits both corners just as easily as a good one, so the corners carry no information — only the **shape between them** does. The straight diagonal from (0,0) to (1,1) is what random guessing draws: every 0.2 of extra recall costs exactly 0.2 more false alarms. A curve that bulges up and to the left of that diagonal is a model doing better than guessing.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 1: one threshold, one dot',
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
        1: 'The ten scores as a plain Python list, already sorted from most spam-like to least. Sorting is not required for this snippet, but it will be for the sweep.',
        2: 'The true answer for each email, in the same order: 1 means it really was spam, 0 means it really was not. Position 3 in this list describes the email scoring 0.80.',
        4: 'sum of a list of 0s and 1s counts the 1s, so P is the number of real positives: 5.',
        5: 'Everything that is not positive is negative, so N = 10 - 5 = 5. These two are the denominators of TPR and FPR, and they never change during the sweep.',
        7: 'One chosen cut-off. Everything scoring 0.70 or higher gets flagged.',
        8: 'Counter for true positives, starting at zero.',
        9: 'Counter for false positives, starting at zero.',
        10: 'zip walks both lists together and hands you one pair per turn: the first score with the first truth value, then the second with the second. score and label are the two halves of that pair.',
        11: 'The model flagged this email AND it really was spam. That is a true positive.',
        12: '+ 1 on the TP counter. tp = tp + 1 is written out in full on purpose; tp += 1 means the same thing.',
        13: 'elif runs only when the line above was false, so this row is not a real positive. The score is still at or above t, so the model flagged a genuine email: a false positive.',
        14: '+ 1 on the FP counter. The two unflagged cases (FN and TN) are not counted because neither TPR nor FPR needs them individually.',
        15: 'Print the dot. TPR = 3/5 = 0.60 and FPR = 1/5 = 0.20, so this threshold puts one dot at (0.20, 0.60). One threshold, one confusion matrix, one dot.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 2: the sweep — all eleven dots',
      code: `tp = 0
fp = 0
points = [(0.0, 0.0)]
for label in truth:
    if label == 1:
        tp = tp + 1
    else:
        fp = fp + 1
    points.append((fp / N, tp / P))

for fpr, tpr in points:
    print('(%.1f, %.1f)' % (fpr, tpr))

# ---- real output, printed one per line, shown here side by side ----
# (0.0, 0.0) (0.0, 0.2) (0.0, 0.4) (0.2, 0.4) (0.2, 0.6) (0.2, 0.8)
# (0.4, 0.8) (0.6, 0.8) (0.6, 1.0) (0.8, 1.0) (1.0, 1.0)`,
      annotations: {
        1: 'Reset the true-positive counter. This snippet continues from part 1, so truth, P and N are still in place.',
        2: 'Reset the false-positive counter.',
        3: 'The list of dots, starting with the free corner (0,0): the threshold above every score, where nothing is flagged.',
        4: 'Walk the labels from the highest score down. Because the list is sorted, each turn of this loop IS the threshold dropping just far enough to let one more row cross.',
        5: 'This row is a real positive, so the row that just crossed is caught spam.',
        6: 'TP goes up by one. Nothing else changed, so FPR is unchanged and only TPR rises: the pen steps up by 1/P = 0.2.',
        7: 'Otherwise the row that crossed is a genuine email.',
        8: 'FP goes up by one, so only FPR rises: the pen steps right by 1/N = 0.2.',
        9: 'Append the dot for the threshold we are now at. Note there is no if here — every row produces exactly one dot, whichever counter moved.',
        11: 'Walk the finished list of dots. Each item is a pair, and fpr, tpr splits the pair into its two halves in one step.',
        12: 'Print one dot per line. These eleven pairs are character-for-character the ones written out by hand in the section above.',
      },
    },
    {
      type: 'intuition',
      title: 'AUC: turning the staircase into one number',
      md: `The plot lives inside a square: FPR runs 0 to 1 across, TPR runs 0 to 1 up. So the whole square has an area of **1**. **AUC** is the **area under the curve** — the part of that square lying below your staircase, and therefore always a number between 0 and 1.

- **Random guessing draws the diagonal**, and the triangle under a diagonal is half the square. So a model with no skill scores **AUC = 0.5**. That is the number to compare against, not 0.
- A perfect model puts every positive above every negative: the pen goes all the way up first, then all the way right, and fills the whole square. **AUC = 1.0**.
- Our ten samples give **0.800**, worked out in the next snippet two different ways.
- Here is what that 0.800 actually means: **AUC is the probability that a randomly picked positive scores higher than a randomly picked negative.** It is a statement about ordering, nothing else.
- Check it by counting. There are 5 positives and 5 negatives, so 5 x 5 = **25** possible (positive, negative) pairs. Count how many have the positive scoring higher: **20**. And 20/25 = **0.800**, the area exactly.
- One consequence follows immediately: AUC reads only the **order** of the scores. Multiply every score by 7, or square them all — the order does not change, so the AUC does not change by a single decimal.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 3: the area, and the pair count that equals it',
      code: `auc = 0.0
for i in range(1, len(points)):
    fpr_prev, tpr_prev = points[i - 1]
    fpr_now, tpr_now = points[i]
    width = fpr_now - fpr_prev
    height = (tpr_now + tpr_prev) / 2
    auc = auc + width * height
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
        1: 'The running total of area, starting empty. 0.0 not 0, so the additions stay decimal.',
        2: 'Walk the dots in pairs. range(1, len(points)) gives 1, 2, ... up to the last index, so each turn compares dot i with the dot just before it.',
        3: 'Take the previous dot apart into its two numbers. Python unpacks a pair on the right into two names on the left, in order.',
        4: 'The same for the current dot. We now have the left and right edges of one vertical strip of the area.',
        5: 'The width of the strip: how far right the pen moved. It is 0 for an up-step and 1/N for a right-step, so up-steps contribute no area.',
        6: 'The height of the strip, taken as the average of its left and right heights. For a staircase the two are equal, so this is just the height; the average also makes the line correct if two rows tie in score and produce a slanted step.',
        7: 'Add this strip to the running total. Adding up strips is all that "area under the curve" means, and doing it by hand is clearer than calling a library.',
        8: 'The total: 0.800. numpy also has this built in as np.trapezoid(tpr, fpr) — spelled np.trapz in numpy older than 2.0 — but the seven lines above are the whole idea.',
        10: 'Now the completely different route to the same number: counting pairs. Start the count at zero.',
        11: 'i walks every row. range(len(truth)) gives 0 up to 9.',
        12: 'j walks every row again, inside the i loop. A loop inside a loop visits all 10 x 10 = 100 combinations.',
        13: 'Keep only the combinations that are a real (positive, negative) pair — truth[i] positive, truth[j] negative — and where the positive got the higher score. That is one correctly ordered pair.',
        14: '+ 1 for each one found.',
        15: 'The result: 20 correctly ordered pairs out of the 25 possible ones, which is 0.800. Same number as the area, from arithmetic that never mentioned geometry. That is why the probability sentence above is a definition and not an analogy.',
      },
    },
    { type: 'visual', component: 'ConfusionMatrixLab', props: {} },
    {
      type: 'note',
      md: `Drag the threshold and watch the ROC panel: the dot you are moving is the (FPR, TPR) pair for the cut-off you chose — one threshold, one confusion matrix, one dot. Now press **Sweep 1 to 0**. That button is exactly the loop from part 2: it starts above every score at (0,0), lowers the cut-off past one row at a time, and drops a dot for each. An up-step means the row that just crossed was a real positive; a right-step means it was a negative. The finished staircase is the curve, and the area it encloses is the AUC.`,
    },
    {
      type: 'intuition',
      title: 'The PR curve: same sweep, one axis swapped',
      md: `Build it exactly the same way — sort, sweep one row at a time — but plot **precision** on the y-axis against **recall** on the x-axis.

- Recall is the same quantity as TPR, so the PR curve's x-axis is the ROC curve's y-axis. Only the other axis changed, from FPR to precision.
- And that swap changes the denominator. FPR divides by **every negative that exists**. Precision = TP/(TP+FP) divides by **only the rows you flagged**. Hold on to that difference; it is the point of this entire module.
- The PR curve is jagged, not a tidy staircase. Each new row changes both the top and the bottom of the precision fraction, so precision can drop and then climb back. In the output below it goes 1.00, 1.00, 0.67, 0.75, 0.80 — down then up.
- Its one-number summary is **average precision (AP)**: the precision measured at each step where recall increased, averaged over those steps. Everyone says "PR-AUC" and means AP.
- The random-guessing baseline is **not** 0.5 here. A model guessing at random flags positives at whatever fraction they occur, so its precision is flat at the **positive rate** — 0.5 on balanced data, but **0.01** when 1% of rows are positive.
- Our ten samples: AP = **0.835**, next to AUC = **0.800**. Two different questions about the same ranking, two different answers, both correct.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 4: the PR dots, from the identical sweep',
      code: `tp = 0
fp = 0
pr_points = []
for label in truth:
    if label == 1:
        tp = tp + 1
    else:
        fp = fp + 1
    precision = tp / (tp + fp)
    recall = tp / P
    pr_points.append((recall, precision))

for recall, precision in pr_points:
    print('recall %.1f  precision %.2f' % (recall, precision))

# ---- real output ----
# recall 0.2 precision 1.00 | recall 0.4 precision 1.00 | recall 0.4 precision 0.67
# recall 0.6 precision 0.75 | recall 0.8 precision 0.80 | recall 0.8 precision 0.67
# recall 0.8 precision 0.57 | recall 1.0 precision 0.62 | recall 1.0 precision 0.56
# recall 1.0 precision 0.50`,
      annotations: {
        1: 'Reset the true-positive counter and start the same walk again.',
        2: 'Reset the false-positive counter.',
        3: 'An empty list for the dots. There is no free starting corner this time: with nothing flagged, precision would be 0/0.',
        4: 'The identical loop over the sorted labels. The sweep has not changed at all — only what we compute from it.',
        5: 'The crossed row was a real positive.',
        6: 'TP up by one. This raises both precision and recall.',
        7: 'Otherwise it was a genuine negative.',
        8: 'FP up by one. This lowers precision and leaves recall alone — which is why the curve dips.',
        9: 'Precision at this cut-off: caught positives over everything flagged so far. tp + fp is exactly the number of rows that have crossed.',
        10: 'Recall at this cut-off: caught positives over all the positives that exist. Same as TPR.',
        11: 'Store the dot as (x, y) = (recall, precision).',
        13: 'Walk the dots and split each pair into its two halves.',
        14: 'Print them. Read down the precision column: 1.00, 1.00, 0.67, 0.75, 0.80 — it falls and recovers, because a false positive hurts precision immediately while the next true positive repairs it.',
      },
    },
    {
      type: 'intuition',
      title: 'Where ROC starts flattering a bad model',
      md: `One million card transactions. **10,000 are fraud (1%)**, 990,000 are legitimate. Your model is tuned to catch 90% of the fraud.

- Result: **TP = 9,000**, FN = 1,000, and it raises **30,000** false alarms, so FP = 30,000 and TN = 960,000.
- **FPR** = 30,000 / 990,000 = **0.030**. Plotted, that is the dot (0.03, 0.90) — hugging the top-left corner. It looks superb.
- **Precision** = 9,000 / 39,000 = **0.231**. Three of every four alerts your analysts open are innocent customers.
- Now make the model worse: 20,000 extra false alarms at the same recall. **FPR** becomes 50,000 / 990,000 = **0.051**. A move of two hundredths — you could not see it on a plot.
- The same change takes **precision** from 0.231 to 9,000 / 59,000 = **0.153**. A third of the alert quality, gone.
- The mechanism in one line: **FPR divides by 990,000, precision divides by 39,000.** The enormous negative class numbs the ROC curve to false positives, and the PR curve feels every one of them.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 5a: one function that returns both summaries',
      code: `def sweep(rows):
    P = sum(label for score, label in rows)
    N = len(rows) - P
    tp = 0
    fp = 0
    roc = 0.0
    ap = 0.0
    for score, label in rows:
        if label == 1:
            tp = tp + 1
            ap = ap + (tp / (tp + fp)) / P
        else:
            fp = fp + 1
            roc = roc + tp / (P * N)
    return roc, ap

# ---- real output on the ten samples above ----
# ROC-AUC = 0.800   PR-AUC = 0.835`,
      annotations: {
        1: 'One function, taking rows: a list of (score, label) pairs already sorted highest score first.',
        2: 'Count the positives. The bit inside the brackets is a generator expression: it reads label out of every pair, and sum adds those up.',
        3: 'Everything else is negative.',
        4: 'True positives seen so far as we walk down.',
        5: 'False positives seen so far.',
        6: 'The running ROC-AUC.',
        7: 'The running average precision.',
        8: 'The same one-row-at-a-time sweep as parts 2 and 4.',
        9: 'The crossed row is a positive.',
        10: 'Count it.',
        11: 'Recall just went up by one step of 1/P, so add the precision at this moment, divided by P. Averaging precision over the P steps where recall increased is exactly the definition of AP.',
        12: 'Otherwise the crossed row is a negative.',
        13: 'Count it.',
        14: 'Every positive already above this negative is one correctly ordered pair, and tp is how many that is. Adding tp/(P*N) for each negative counts all the ordered pairs and divides by the total — which part 3 showed equals the area.',
        15: 'Hand back both numbers as a pair. On the ten samples: ROC-AUC 0.800, matching part 3 exactly, and PR-AUC 0.835.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 5b: identical model, balanced vs 1-in-100',
      code: `import random
random.seed(0)

def make(n_pos, n_neg):
    rows = [(random.gauss(2.0, 1.0), 1) for _ in range(n_pos)]
    for _ in range(n_neg):
        rows.append((random.gauss(0.0, 1.0), 0))
    rows.sort(reverse=True)
    return rows

for name, n_pos, n_neg in [('balanced 50/50', 5000, 5000), ('rare 1 in 100', 500, 49500)]:
    rows = make(n_pos, n_neg)
    roc, ap = sweep(rows)
    base = n_pos / (n_pos + n_neg)
    print('%-15s base rate %.3f  ROC-AUC %.3f  PR-AUC %.3f' % (name, base, roc, ap))

# ---- real output ----
# balanced 50/50  base rate 0.500  ROC-AUC 0.923  PR-AUC 0.925
# rare 1 in 100   base rate 0.010  ROC-AUC 0.914  PR-AUC 0.216`,
      annotations: {
        1: 'Python\'s built-in random number module. No numpy needed.',
        2: 'Fix the seed so the "random" numbers are the same every run and you get these exact figures.',
        4: 'Build a fake test set with n_pos positives and n_neg negatives.',
        5: 'A list comprehension: it runs the bit before "for" once per turn and collects the results. random.gauss(2.0, 1.0) draws a score scattered around 2.0, and each result is paired with the label 1.',
        6: 'The negatives, written as an ordinary loop so you can see the comprehension above is just this in one line. The underscore is a name we do not use.',
        7: 'Negatives are scattered around 0.0 instead of 2.0. That gap of 2.0 is the model\'s skill, and it is IDENTICAL in both datasets — the only thing changing below is how many negatives there are.',
        8: 'Sort highest score first. reverse=True means descending; the sweep needs this order.',
        9: 'Hand the finished list back.',
        11: 'Two settings to run: 5,000 vs 5,000, then 500 vs 49,500. Each turn unpacks the three values from one triple.',
        12: 'Build that dataset.',
        13: 'Run part 5a\'s function on it and split the returned pair into two names.',
        14: 'The base rate: what fraction of rows are positive. This is also the PR curve\'s random baseline.',
        15: 'Print the row. %-15s pads the name to 15 characters so the columns line up. Read the two output lines: ROC-AUC fell 0.923 to 0.914, essentially unchanged, while PR-AUC fell 0.925 to 0.216 — a collapse to roughly a quarter, on a model that did not change at all.',
      },
    },
    {
      type: 'note',
      md: `Those two output lines are the whole argument, so read them slowly. The score distributions are identical by construction — the model is exactly as good at ranking in both rows. **ROC-AUC moved by 0.009** and would be reported upstairs as "0.92, ship it". **PR-AUC fell from 0.925 to 0.216.** ROC-AUC did not lie: it answered "how often does a positive outrank a negative", and that question genuinely has nothing to do with how many negatives there are. The trouble is that nobody asked it. The question the analysts asked was "if I open these alerts, how many are worth opening", and only precision answers that. One more honest reading of 0.216: the random baseline in that row is 0.010, so 0.216 is still twenty-one times better than guessing. **PR-AUC numbers are meaningless without the positive rate printed beside them.**`,
    },
    {
      type: 'intuition',
      title: 'The rule: which curve answers which question',
      md: `Do not learn "PR-AUC is better". Learn what each one is measuring, and the choice makes itself.

- **ROC-AUC** when the classes are roughly balanced, or when both classes matter equally — is this photo a cat or a dog, is this scan of the left side or the right.
- **ROC-AUC** also when you are tracking one model across months or regions where the positive rate itself moves. AP would shift purely because prevalence shifted, and you could not tell a worse model from a changed world. ROC-AUC holds the class mix out of the calculation, so a drop in it is real.
- **PR-AUC (AP)** when the positive class is rare **and** is the class you actually care about: fraud, disease, defects, spam, churn. Rough dividing line: past about 10 negatives per positive, lead with PR-AUC.
- Report both, decide with PR-AUC, and always print the positive rate next to the AP number.
- And remember what neither of them is: a deployment. A curve says how good the ranking is. Choosing the one cut-off you will actually run at is a separate decision, sketched in the last section.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: a screening test on eight patients',
      md: `Eight patients, each scored by a screening model. **D** means the patient really has the disease, **H** means healthy. Sorted highest score first: 0.91 **D**, 0.84 **H**, 0.77 **D**, 0.62 **D**, 0.55 **H**, 0.40 **H**, 0.33 **D**, 0.12 **H**. So P = 4 and N = 4, and each step is 1/4 = 0.25.

- Sweep and write the (FPR, TPR) dots: **(0,0)**, D → (0, 0.25), H → (0.25, 0.25), D → (0.25, 0.5), D → (0.25, 0.75), H → (0.5, 0.75), H → (0.75, 0.75), D → (0.75, 1.0), H → **(1.0, 1.0)**.
- **Area, by strips.** Only right-steps have width, and there are four of them, each 0.25 wide. Their heights when they happen are 0.25, 0.75, 0.75, 1.0. So AUC = 0.25 x (0.25 + 0.75 + 0.75 + 1.0) = 0.25 x 2.75 = **0.6875**.
- **The same number by counting pairs.** There are 4 x 4 = 16 (D, H) pairs. For each D, count the H's scoring below it: the D at 0.91 beats all 4; the D at 0.77 beats 3; the D at 0.62 beats 3; the D at 0.33 beats 1. Total 4 + 3 + 3 + 1 = **11**, and 11/16 = **0.6875**. The two routes agree, as they must.
- **Average precision.** Precision at each of the four moments a D crossed: 1/1 = **1.000**, then 2/3 = **0.667**, then 3/4 = **0.750**, then 4/7 = **0.571**. AP is their average = 2.988 / 4 = **0.747**.
- **Read the result.** AUC 0.6875 against a random baseline of 0.5 — modest skill. AP 0.747 against a random baseline of 4/8 = 0.5 — the same modest verdict, because this dataset is balanced. On balanced data the two summaries broadly agree; that is exactly why nobody notices the difference until they meet a rare class.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: 0.94 ROC-AUC on a fraud model',
      md: `Here is the mistake, walked into in full. A fraud team evaluates on 500,000 historical transactions, of which **1,000 are fraud (0.2%)**. The model reports **ROC-AUC 0.94**. That beats the 0.5 baseline by a mile, the team ships it, and the review queue is worthless within a week.

- What 0.94 actually said: pick one fraud and one legitimate transaction at random, and the fraud scores higher 94% of the time. That is a true and correctly computed statement about **ranking**.
- What the team heard: "94% of our alerts will be good". Nothing in the definition says that, and precision is not in the calculation anywhere.
- Now the deployed numbers. At the chosen cut-off the model catches 850 of the 1,000 frauds — recall 0.85, which sounds fine. Its FPR on the 499,000 legitimate transactions is **0.02**, which also sounds tiny.
- But 0.02 x 499,000 = **9,980 false alarms**. Precision = 850 / (850 + 9,980) = **0.078**. Fewer than 8 alerts in 100 are real, and the reviewers see 10,830 cases where they can handle a few hundred.
- **Why the ROC number could never have caught this:** an FPR of 0.02 is a small number *because its denominator is 499,000*. Precision's denominator is 10,830 — a hundred times smaller — so the same 9,980 mistakes that barely nudge FPR completely dominate precision.
- **The fix, in the order you would do it:** recompute **PR-AUC** on the same offline data and print the 0.002 baseline beside it; look at **precision at the actual operating point**, not at a summary; and set the cut-off from what the review team can process rather than from a metric.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Do these on paper before reading on. Full solutions follow in the next two sections.

1. Six rows, sorted highest score first, with labels **P N P N N P**. Write out all seven (FPR, TPR) dots, then compute AUC twice: once as area, once by counting pairs.
2. A model on a dataset with a **2% positive rate** reports ROC-AUC 0.88 and PR-AUC 0.18. Your teammate says the PR-AUC is terrible. Is it? State both baselines and give your verdict.
3. You multiply every predicted score by 100 and then add 5. What happens to (a) ROC-AUC, (b) PR-AUC, (c) accuracy computed at a fixed threshold of 0.5? Explain each.
4. Two million transactions, **4,000 of them fraud**. The model catches 95% of the fraud at an FPR of 0.02. Compute TP, FN, FP, TPR and precision, and say which curve would have shown the problem.`,
    },
    {
      type: 'intuition',
      title: 'Solutions: problems 1 and 2',
      md: `**Problem 1.** P = 3 and N = 3, so every up-step is 1/3 and every right-step is 1/3.

- The dots, starting from nothing flagged: **(0, 0)**, P → (0, 1/3), N → (1/3, 1/3), P → (1/3, 2/3), N → (2/3, 2/3), N → (1, 2/3), P → **(1, 1)**.
- **As area:** only the three right-steps have width, each 1/3 wide, at heights 1/3, 2/3 and 2/3. AUC = (1/3) x (1/3 + 2/3 + 2/3) = (1/3) x (5/3) = 5/9 = **0.556**.
- **By pairs:** there are 3 x 3 = 9 pairs. The first P outranks all 3 N's; the P in position 3 outranks the 2 N's below it; the last P outranks none. That is 3 + 2 + 0 = 5, so 5/9 = **0.556**. Agreed.

**Problem 2.** No, it is not terrible, and the baselines are the whole answer.

- The ROC baseline is **0.5** on every dataset, so 0.88 is a real but ordinary result.
- The PR baseline is the **positive rate = 0.02**. So a PR-AUC of 0.18 is **nine times** the random baseline, which is a strong model on a rare class.
- The general lesson: a PR-AUC only means something next to its positive rate. The identical 0.18 on balanced data, where the baseline is 0.50, would be far worse than guessing.`,
    },
    {
      type: 'intuition',
      title: 'Solutions: problems 3 and 4',
      md: `**Problem 3.** Multiplying by 100 and adding 5 is a strictly increasing transformation: if a beat b before, a still beats b now.

- **(a) ROC-AUC is unchanged.** It counts correctly ordered (positive, negative) pairs, and no pair changed order. Identical to every decimal place.
- **(b) PR-AUC is unchanged** for the same reason: the sweep visits the rows in the same order, so every precision and recall value along the way is the same.
- **(c) Accuracy at threshold 0.5 is destroyed.** Every transformed score is now at least 5, so everything sits above 0.5 and the model flags every row. Recall becomes 1.0, precision collapses to the positive rate, and accuracy becomes the positive rate too. The rank summaries survived a rescaling that made the fixed threshold meaningless — which is the practical reason threshold-free numbers exist.

**Problem 4.** 4,000 fraud, so 2,000,000 - 4,000 = **1,996,000 legitimate**.

- **TP** = 0.95 x 4,000 = **3,800**. **FN** = 200. **TPR** = 3,800/4,000 = **0.95**.
- **FP** = 0.02 x 1,996,000 = **39,920**. That is the number the FPR of 0.02 was hiding.
- **Precision** = 3,800 / (3,800 + 39,920) = 3,800 / 43,720 = **0.087**. Under 9 alerts in 100 are real.
- The ROC dot is (0.02, 0.95) — pinned to the top-left corner, the prettiest possible picture. The **PR curve** would have shown precision 0.087 at recall 0.95 immediately, and the positive rate of 0.002 tells you the baseline it is being measured against.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. This is for a second pass.

- **Picking the actual cut-off.** A curve is not a deployment; eventually you run at one threshold. Three defensible ways to choose: from a **cost ratio** (pick the threshold minimising cost-of-a-miss x FN + cost-of-a-false-alarm x FP); from a **hard requirement** ("regulation says catch 95%", so read off the threshold at recall 0.95 and accept the precision it comes with); or from **capacity**.
- **Capacity means top-k, not a threshold.** "The team reviews 500 cases a day" is not a cut-off at all — rank everything and send the top 500. The matching metric is **precision@500**: of the 500 sent, how many were real. This also survives drift: a fixed threshold sends 200 alerts one week and 5,000 the next when scores shift, while top-k always sends 500.
- **Calibration is a separate axis from ranking.** A score is **calibrated** if, of all the cases you scored 0.70, about 70% really are positive. AUC reads only order, so a model can rank perfectly and still print numbers that are wildly wrong — cube every probability and AUC does not move an inch while every number is now far too small.
- **When calibration matters:** whenever the probability is used *as a number* — multiplied by a cost, shown to a person as "70% chance", or averaged across models. When only the **order** is consumed (search ranking, a top-k queue), calibration is irrelevant and you should chase AUC or AP instead.
- **Diagnose and fix it:** compare the average predicted probability in each score bucket against the actual positive rate in that bucket (a **reliability diagram**), or read the **Brier score**, which is just the mean squared error between predicted probabilities and 0/1 labels. Both fixes — **Platt scaling** (fit an S-shaped curve) and **isotonic regression** (fit any non-decreasing step function) — must be fitted on held-out data, and both are increasing functions, so neither can change your AUC.
- **AP versus a trapezoid on the PR curve.** Because the PR curve dips and recovers, drawing straight lines between its dots and taking the area can be optimistic — the points on those lines are not actually achievable. Averaging precision at each recall step avoids the issue. In sklearn that is average_precision_score, and it is what people mean by PR-AUC.`,
    },
  ],
  quiz: [
    {
      question: 'What does a single dot on an ROC curve represent?',
      options: [
        { text: 'One model, compared against another model', explanation: 'A whole curve describes one model; a dot is finer-grained than that.' },
        {
          text: 'One threshold — its (FPR, TPR) pair, which is one entire confusion matrix',
          explanation: 'Correct. Every dot is a full confusion matrix collapsed into two rates. The curve is all of those dots as the threshold sweeps from above every score to below every score.',
        },
        { text: 'One row of the test set', explanation: 'Rows cause the pen to step, but each dot summarises the entire test set at one cut-off, not a single row.' },
      ],
      correct: 1,
    },
    {
      question: 'A model scores ROC-AUC 0.92 on a balanced test set. Deployed at 1% positives with identical score distributions, ROC-AUC stays about 0.91 but analysts say most alerts are junk. What happened?',
      options: [
        { text: 'The model degraded in production', explanation: 'By construction the score distributions are unchanged, so the model ranks exactly as well as before.' },
        { text: 'ROC-AUC was computed wrongly', explanation: 'It was computed correctly. Not moving with the class ratio is a property of ROC-AUC, not a bug in the calculation.' },
        {
          text: 'Nothing broke — precision depends on how rare positives are, while TPR and FPR do not, so ROC-AUC could never have predicted alert quality',
          explanation: 'Correct. FPR divides by the huge negative class; precision divides only by what you flagged. PR-AUC or precision at the operating point would have shown the collapse before launch.',
        },
      ],
      correct: 2,
    },
    {
      question: 'You replace every predicted score p with p cubed and re-evaluate. What happens to ROC-AUC?',
      options: [
        {
          text: 'Exactly nothing — cubing is strictly increasing, so the ordering is identical',
          explanation: 'Correct. AUC counts correctly ordered (positive, negative) pairs, and a transformation that preserves order cannot change a single pair.',
        },
        { text: 'It falls, because the probabilities are now wrong', explanation: 'The probabilities are indeed wrong now, but AUC never reads their values, only their order.' },
        { text: 'It rises, because the scores are more spread out', explanation: 'Cubing squashes scores toward 0, and in any case AUC is a rank statistic — spread of values does not enter it.' },
      ],
      correct: 0,
    },
    {
      question: 'What is the baseline value of the PR curve for a model that guesses at random?',
      options: [
        { text: '0.5, the same as ROC', explanation: 'That is the ROC baseline only. ROC-AUC is 0.5 for random guessing on every dataset, which is exactly what PR is not.' },
        { text: '0, since a random model gets nothing right', explanation: 'A random model still flags real positives by luck at the rate they occur, so its precision is not zero.' },
        {
          text: 'The positive rate — so 0.01 on a dataset that is 1% positive',
          explanation: 'Correct, and it is why PR-AUC values from different datasets cannot be compared. PR-AUC 0.30 at 1% positives is 30 times baseline; the same 0.30 on balanced data is below baseline.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Your model scores ROC-AUC 0.42. What is the best first action?',
      options: [
        { text: 'Collect more training data — the model has not learned anything', explanation: 'A model with no signal sits at 0.5. Consistently below 0.5 means there IS signal, pointed the wrong way.' },
        {
          text: 'Check for an inverted ranking — flipped labels, the wrong score column, or hard 0/1 predictions passed in instead of scores',
          explanation: 'Correct. 0.42 means positives are systematically scored BELOW negatives. Flip the sign and you have 0.58: a real, if modest, model.',
        },
        { text: 'Lower the decision threshold', explanation: 'AUC already covers every threshold, so moving one cannot change it at all.' },
      ],
      correct: 1,
    },
    {
      question: 'The review team can process exactly 500 alerts per day. What should you report and optimise?',
      options: [
        { text: 'F1 at threshold 0.5', explanation: 'Both halves are wrong: 0.5 is arbitrary, and F1 assumes a miss and a false alarm cost the same, which the capacity limit contradicts.' },
        {
          text: 'precision@500 from a top-k rule, not any fixed threshold',
          explanation: 'Correct. Rank and take the top 500: the metric matches the constraint, and top-k keeps the daily volume constant when the score distribution drifts, which a fixed threshold does not.',
        },
        { text: 'ROC-AUC, since it covers all thresholds', explanation: 'Useful for choosing between models, but it averages over operating points you will never run at. The business lives at exactly one k.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Build an ROC curve from raw predictions, no libraries. Walk me through it.',
      answer:
        'Sort every prediction by score, highest first, and count P positives and N negatives. Start with the threshold above every score: nothing is flagged, so the first dot is (0,0). Now let one row cross at a time, top down. If that row is truly positive, TP goes up and the pen steps UP by 1/P. If it is truly negative, FP goes up and the pen steps RIGHT by 1/N. Record (FPR, TPR) after each row. You finish at (1,1) with everything flagged. The area under the resulting staircase is the AUC, and you get it by adding up the strips: each right-step contributes its width times its height. Two details worth adding: ties in score give slanted segments rather than clean steps, and the curve depends only on the ORDER of the scores, never their values.',
      isCaseBased: false,
    },
    {
      question: 'What does AUC mean, in a sentence a non-technical stakeholder would accept?',
      answer:
        '"Pick one fraudulent transaction and one legitimate one at random; AUC is the chance the model scores the fraudulent one higher." That is a definition, not an analogy — count the correctly ordered (positive, negative) pairs, divide by P times N, and you get the geometric area under the curve exactly. Two consequences follow straight away. It is rank-based, so any transformation that preserves order leaves it untouched, which means AUC says nothing about whether a "0.9" really means 90%. And it is defined per pair, so it does not move when the mix of positives and negatives changes.',
      isCaseBased: false,
    },
    {
      question: 'ROC-AUC versus PR-AUC under class imbalance: when do you use which, and why exactly does ROC flatter?',
      answer:
        'Mechanism first. ROC plots TPR against FPR = FP/(FP+TN). With 990,000 negatives, 20,000 extra false positives move FPR by 0.02 — invisible. Precision = TP/(TP+FP) divides only by what you flagged, so the same 20,000 drops precision from 0.231 to 0.153. Concretely: catching 90% of fraud with 30,000 false alarms sits at the ROC dot (0.03, 0.90), which looks superb, while only 23% of alerts are real. Rule: ROC-AUC when classes are roughly balanced or both matter equally, or when you want a number that stays put as prevalence changes across regions and months. PR-AUC once imbalance passes roughly 10:1 and the rare class is the one you care about. Report both, decide on PR-AUC, and always state the positive rate, since it is the PR baseline.',
      isCaseBased: false,
    },
    {
      question: 'How do you choose the decision threshold once you have a curve?',
      answer:
        'Not by maximising F1 — that silently assumes a miss and a false alarm cost the same, which nobody agreed to. Three defensible routes. One, a cost ratio: pick the threshold minimising cost-of-a-miss times FN plus cost-of-a-false-alarm times FP. Two, a hard requirement: "catch 95% of laundering" fixes recall, so read the threshold off at recall 0.95 and accept the precision that comes with it. Three, capacity: "500 reviews a day" is not a threshold at all — rank and take the top 500, then report precision@500. Prefer capacity when a human queue is involved, because a fixed threshold sends 200 alerts one week and 5,000 the next as scores drift, while top-k holds volume constant. Pick the point on validation data, and re-derive it after every retrain.',
      isCaseBased: false,
    },
    {
      question: 'A model has AUC 0.95 but outputs 0.9 for cases that are true only 20% of the time. Possible? Does it matter?',
      answer:
        'Entirely possible. AUC reads only the ordering, so any order-preserving distortion — cubing, an over-confident tree ensemble, class-weighted training, heavy regularisation — leaves it untouched while wrecking the numbers themselves. Whether it matters depends on the consumer. If only the ranking is used, as in search results or a top-k review queue, it does not matter at all. If the probability is multiplied by anything — an expected loss, a price, a cost-derived threshold, or an average across models — every downstream decision is wrong in a systematic direction. Diagnose with a reliability diagram plus the Brier score, and fix with Platt scaling or isotonic regression on held-out data. Both are increasing functions, so neither changes the AUC: ranking and calibration are genuinely separate axes.',
      isCaseBased: false,
    },
    {
      question: 'Case: a teammate reports ROC-AUC 0.995 on a churn model. What do you do?',
      answer:
        'Treat it as a bug report, not a result. Leakage checklist in order: (1) a feature recorded after or because of the outcome — a cancellation-reason code, a refund flag, a support ticket opened during the churn event; (2) an identifier that encodes the label, such as an account-status field updated at churn time; (3) duplicate or near-duplicate rows split across train and test; (4) a time leak — randomly splitting time-ordered data so the model saw the future, or a feature whose window overlaps the label period; (5) preprocessing fitted on the full dataset before splitting, such as scalers, target encoding, or feature selection. The fastest diagnostic: train on one feature at a time and look for a single feature carrying nearly all of the AUC alone, then go read that column\'s definition. The cost of skipping this is a model that ships, scores 0.70 in production, and burns a quarter on "drift" that was never there.',
      isCaseBased: true,
    },
    {
      question: 'Case: fraud model, offline ROC-AUC 0.94, but a month after launch the review team says most alerts are innocent customers. Debug it.',
      answer:
        'First hypothesis, usually correct: ROC-AUC was never the right offline metric. At 0.2% prevalence, ROC-AUC 0.94 is entirely consistent with precision under 10% at high recall — recompute PR-AUC and precision at the deployed operating point on the same offline data, and the surprise will usually already be sitting there. Second: prevalence mismatch. If the offline set was resampled or fraud-enriched, precision was inflated, because precision moves with the base rate while TPR and FPR do not. Third: the cut-off was chosen by maximising F1, which assumes equal costs; re-derive it from the cost ratio, or better from review capacity as a top-k rule. Fourth: drift — the score distribution moved under a fixed threshold, so alert volume rose with no change in model quality, which top-k would have absorbed. Order of action: recompute PR-AUC and precision@k offline, compare offline and online score histograms, then reset the operating point from capacity.',
      isCaseBased: true,
    },
    {
      question: 'Case: choose a single metric for a medical screening model at 0.8% prevalence, and defend it to a clinician and to a data-science panel.',
      answer:
        'Refuse the single metric and propose a primary plus guardrails. Primary for model selection: PR-AUC, because at 0.8% prevalence ROC-AUC will read 0.93 for a model whose alerts are 95% false. Report it beside the 0.008 baseline so the panel can see the multiple rather than the raw number. Operating point for the clinician: fix it at the sensitivity the clinical protocol demands, say 98%, and state the resulting precision and therefore the follow-up volume explicitly — that is the conversation the clinician needs, since a miss is a missed cancer and a false alarm is an anxious patient plus a procedure. Guardrails: calibration, because a score shown to a patient or fed into a risk calculator must be a real probability, so track the Brier score and recalibrate on held-out data. Monitoring: precision@k against the follow-up clinic\'s capacity, since a screen producing more referrals than the system can absorb has failed whatever its AUC. The judgement being tested is that the selection metric, the operating point, and the monitoring metric are three separate choices.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'How is an ROC curve built?', back: 'Sort by score, highest first. Let one row cross at a time. A real positive steps the pen UP by 1/P; a negative steps it RIGHT by 1/N. Plot (FPR, TPR) after each. Starts at (0,0), ends at (1,1).' },
    { front: 'ROC axes, defined', back: 'y = TPR = recall = sensitivity = TP/(TP+FN). x = FPR = FP/(FP+TN) = 1 - specificity. TPR lives in the positive row, FPR in the negative row.' },
    { front: 'AUC in one sentence, and its baseline', back: 'The area under the curve inside a 1x1 square = the probability a randomly chosen positive scores higher than a randomly chosen negative = ordered pairs / (P x N). Random guessing draws the diagonal, so the no-skill value is 0.5, not 0.' },
    { front: 'Why AUC only reads order', back: 'It counts correctly ordered (positive, negative) pairs. Any strictly increasing transform (x7, squared, cubed) reorders nothing, so AUC is unchanged to every decimal — and it therefore says nothing about whether "0.9" means 90%.' },
    { front: 'Reading AUC values', back: '0.5 = coin flip. Below 0.5 = an inverted ranking (flipped labels, wrong column, hard labels passed instead of scores) — flip the sign. 0.70 to 0.85 = honest on real problems. 0.99 on real data = hunt for leakage first.' },
    { front: 'PR curve and its baseline', back: 'Precision (y) against recall (x), same sweep. Jagged, because a false positive drops precision and the next true positive repairs it. Random baseline = the positive rate (0.01 at 1%), NOT 0.5 — so PR-AUC across different datasets is not comparable.' },
    { front: 'Why ROC flatters under imbalance', back: 'FPR divides by the whole negative class (990,000); precision divides only by what you flagged (39,000). 20,000 extra false positives: FPR +0.02 (invisible), precision 0.231 to 0.153.' },
    { front: 'ROC-AUC or PR-AUC?', back: 'ROC when balanced, when both classes matter, or when you need a number that does not move as prevalence changes across time and segments. PR when the positive class is rare AND is the one you care about (past roughly 10:1). Report both; print the positive rate.' },
  ],
  mindmapMarkdown: `- ROC, AUC & PR Curves
  - Why a curve at all
    - precision/recall/F1 = one threshold
    - same model, t=0.70 vs t=0.30, different verdict
    - a curve = one dot per threshold
    - threshold-free = the summary does not depend on the cut-off
  - The two axes
    - TPR = recall = sensitivity = TP/(TP+FN)
    - FPR = FP/(FP+TN) = 1 - specificity
    - TPR in the positive row, FPR in the negative row
  - Building it: sort and sweep
    - one row crosses at a time, top down
    - positive crossed -> pen up 1/P
    - negative crossed -> pen right 1/N
    - ten samples: 11 dots, (0,0) to (1,1)
    - anchors are free; only the shape matters
    - diagonal = random guessing
  - AUC
    - area inside a 1x1 square, so 0 to 1
    - random = 0.5, perfect = 1.0
    - P(random positive > random negative)
    - ten samples: 20 ordered pairs / 25 = 0.800 = the area
    - order only: x7 or squared changes nothing
  - PR curve
    - precision (y) vs recall (x)
    - jagged: dips on an FP, recovers on a TP
    - AP = precision averaged over the recall steps
    - baseline = the positive rate, not 0.5
    - ten samples: AP 0.835 vs AUC 0.800
  - Imbalance, the whole point
    - FPR denominator 990,000 vs precision denominator 39,000
    - +20k FP: FPR +0.02, precision 0.231 -> 0.153
    - code, identical model: ROC-AUC 0.923 -> 0.914
    - same run: PR-AUC 0.925 -> 0.216
    - rule: ROC balanced, PR rare-and-cared-about (past ~10:1)
    - ROC still wins for tracking across changing prevalence
  - Worked case: 8 patients
    - AUC 0.6875 by strips and by 11/16 pairs
    - AP 0.747 from precisions 1.000, 0.667, 0.750, 0.571
  - Classic mistake
    - 0.94 ROC-AUC at 0.2% fraud, shipped
    - FPR 0.02 x 499,000 = 9,980 false alarms
    - precision 850/10,830 = 0.078
  - Beyond the basics
    - operating point: cost ratio, hard recall, or capacity
    - capacity = top-k, report precision@k, survives drift
    - calibration: separate axis, AUC cannot see it
    - reliability diagram, Brier, Platt, isotonic
    - AP vs a trapezoid on the jagged PR curve`,
}

export default m
