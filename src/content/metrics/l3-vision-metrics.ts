import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l3-vision-metrics',
  subjectId: 'metrics',
  level: 3,
  title: 'Vision Metrics: IoU and mAP',
  whyItMatters:
    'An object detector does not answer yes or no. It draws a rectangle, and the rectangle is never exactly where the human drew one. So before you can count a single correct answer you need a rule for how close is close enough. That rule is IoU, and every detection number you will ever read — including the mAP@[.5:.95] printed in every paper — is built on top of it. This module works one IoU by hand from four coordinates, then builds mAP up from five detections you can check on paper.',
  assumes: [
    'You have read *The Confusion Matrix*, so you know what a true positive, a false positive and a false negative are, and how precision and recall are computed from them',
    'You have read *ROC, AUC & PR Curves*, so you have seen a precision-recall curve and know what "area under the curve" means',
    'You know how to find the area of a rectangle: width times height',
    'You have seen a Python list, a tuple, a for loop, and a function',
  ],
  estMinutes: 38,
  sections: [
    {
      type: 'intuition',
      title: 'A detector never gets it exactly right',
      md: `A model is shown a photograph and asked to find the dog. Its answer is a rectangle drawn on the image. A human has already drawn the correct rectangle.

- The two rectangles overlap a lot, but they are not identical. They never are — the model would have to guess every edge to the pixel.
- So "was this prediction correct?" has no answer yet. Correct compared to what tolerance?
- Every metric in the previous modules started from a yes-or-no answer you could put in a box and count. Here there is no yes-or-no until somebody invents one.
- The whole of detection evaluation is: invent a rule that turns "how much do these two rectangles overlap" into a yes or a no, and then use the counting machinery you already have.

That rule is called IoU. Once you have it, precision, recall and the precision-recall curve all work exactly as they did for spam email.`,
    },
    {
      type: 'intuition',
      title: 'How a box is written down',
      md: `Before any arithmetic, fix the notation, because half of all detection bugs are a notation mix-up.

- An image has pixel coordinates. **x grows to the right, y grows downward** — that is the image convention, not the school-graph convention, and it does not change any of the arithmetic below.
- A box is written as four numbers: **(x1, y1, x2, y2)**, where (x1, y1) is the top-left corner and (x2, y2) is the bottom-right corner.
- So the box **(30, 40, 90, 100)** spans x from 30 to 90 and y from 40 to 100. Its width is 90 − 30 = **60** pixels and its height is 100 − 40 = **60** pixels, so its area is 60 × 60 = **3600** square pixels.
- Some libraries instead store (x, y, width, height). Both are common. Mixing them up silently produces boxes in roughly the right place with the wrong size, which is why this section exists.

For the rest of this module: **the ground-truth dog box is (30, 40, 90, 100)**, area 3600. Every prediction gets compared against it.`,
    },
    {
      type: 'intuition',
      title: 'IoU, worked by hand on two real boxes',
      md: `The detector predicts the box **(10, 20, 60, 80)**. It is up and to the left of the truth, overlapping part of it. Width 60 − 10 = 50, height 80 − 20 = 60, so its area is 50 × 60 = **3000**.

**IoU** stands for Intersection over Union: the area the two boxes share, divided by the area they cover between them.

- **The intersection** — the rectangle where both boxes are. Its left edge is the rightmost of the two left edges: max(10, 30) = **30**. Its top edge is the lowest of the two top edges: max(20, 40) = **40**. Its right edge is the leftmost of the two right edges: min(60, 90) = **60**. Its bottom edge is the highest of the two bottom edges: min(80, 100) = **80**.
- So the intersection is the box (30, 40, 60, 80). Width 60 − 30 = 30, height 80 − 40 = 40, area = **1200**.
- **The union** — every pixel covered by at least one of the two boxes. Add both areas and subtract the shared part once, because adding them counted it twice: 3000 + 3600 − 1200 = **5400**.
- **IoU** = 1200 / 5400 = **0.2222**.

Why divide by the union rather than by, say, the truth's area? Because dividing by the truth alone would reward a detector that draws one enormous box over the whole photograph: such a box contains the dog completely, so the shared area would be the full 3600 and the score would be a perfect 1.0. The union grows with every extra pixel you claim, so an enormous box has an enormous denominator and scores near zero. The union denominator is what makes IoU un-cheatable by drawing big.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'IoU in eleven lines',
      code: `def iou(a, b):
    ix1 = max(a[0], b[0])
    iy1 = max(a[1], b[1])
    ix2 = min(a[2], b[2])
    iy2 = min(a[3], b[3])
    iw = max(0, ix2 - ix1)
    ih = max(0, iy2 - iy1)
    inter = iw * ih
    area_a = (a[2] - a[0]) * (a[3] - a[1])
    area_b = (b[2] - b[0]) * (b[3] - b[1])
    return inter / (area_a + area_b - inter)`,
      annotations: {
        1: 'Takes two boxes. Each is a tuple of four numbers in (x1, y1, x2, y2) order — a tuple is just a fixed list, written with round brackets.',
        2: 'The intersection\'s left edge is the rightmost of the two left edges. a[0] is the first number in box a, so this is max(10, 30) = 30.',
        3: 'The intersection\'s top edge is the lowest of the two top edges: max(20, 40) = 40.',
        4: 'The intersection\'s right edge is the leftmost of the two right edges: min(60, 90) = 60.',
        5: 'The intersection\'s bottom edge is the highest of the two bottom edges: min(80, 100) = 80.',
        6: 'Width of the intersection. The max(0, ...) matters: if the boxes do not touch, ix2 comes out smaller than ix1 and the subtraction is negative. Clamping to 0 turns "no overlap" into zero area instead of a nonsense negative one.',
        7: 'Height of the intersection, clamped the same way. Without both clamps, two boxes that miss on both axes would multiply two negatives into a positive area.',
        8: 'Area of the intersection: 30 * 40 = 1200 for our pair.',
        9: 'Area of the first box: width times height, 50 * 60 = 3000.',
        10: 'Area of the second box: 60 * 60 = 3600.',
        11: 'Union is both areas minus the shared part, counted once instead of twice. 3000 + 3600 - 1200 = 5400, and 1200 / 5400 = 0.2222.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Three predictions against the same ground-truth box',
      code: `truth = (30, 40, 90, 100)
print(round(iou((10, 20, 60, 80), truth), 4))
print(round(iou((32, 42, 88, 98), truth), 4))
print(round(iou((200, 200, 260, 260), truth), 4))

# ---- real output ----
# 0.2222
# 0.8711
# 0.0`,
      annotations: {
        1: 'The ground-truth dog box, fixed for the whole module: x from 30 to 90, y from 40 to 100, area 3600.',
        2: 'The prediction we worked by hand: (10, 20, 60, 80). Prints 0.2222, matching the paper calculation exactly.',
        3: 'A much tighter prediction, (32, 42, 88, 98) — two pixels inside the truth on every side. It sits entirely within the truth, so the intersection is its own area 56 * 56 = 3136, and the union is the truth\'s 3600. IoU = 3136 / 3600 = 0.8711.',
        4: 'A box far away in the bottom-right of the image. ix2 - ix1 is negative, the clamp on line 6 of the previous snippet turns it into 0, so the intersection is 0 and the IoU is 0.0.',
      },
    },
    {
      type: 'intuition',
      title: 'IoU is not the score. It is the threshold.',
      md: `Here is where people go wrong. You do not report an average IoU and call it your detection accuracy. IoU is used to make a yes-or-no decision, and then the yes-or-no answers are counted the way they always were.

- Pick a cutoff. The historical choice is **0.5**.
- A prediction whose IoU against a ground-truth box is **at or above the cutoff** counts as a **true positive**, and that ground-truth box is now taken. Matching is one-to-one: a second prediction on the same object cannot claim it.
- A prediction below the cutoff, or one that arrives at an already-claimed object, is a **false positive**.
- A ground-truth box that no prediction ever claimed is a **false negative** — an object the model missed.
- There is no partial credit anywhere in this. IoU 0.49 and IoU 0.01 are both simply false positives at a cutoff of 0.5.

Apply it to the three predictions we just computed. The first one, the box **(10, 20, 60, 80)** with IoU 0.2222 — a rectangle a person would look at and call a near miss on the dog — is **below 0.5, so that box counts as a false positive**, exactly as if the model had drawn a rectangle around a lamp post. The second, **(32, 42, 88, 98)** with IoU 0.8711, is a true positive. The third, **(200, 200, 260, 260)** with IoU 0.0, is a false positive.

The cutoff is a convention someone chose, not a fact about the world. That is precisely why the field stopped trusting a single one, and it is where mAP@[.5:.95] comes from later in this module.`,
    },
    {
      type: 'intuition',
      title: 'Average precision for one class, from five detections',
      md: `Now the counting machinery. Take one class — dogs — and one test set that contains **4 real dogs**. The detector produces five boxes, each with a confidence score (how sure it is) and each with an IoU against whichever ground-truth dog it is closest to.

- Row 1: confidence **0.95**, IoU **0.90**
- Row 2: confidence **0.88**, IoU **0.30**
- Row 3: confidence **0.80**, IoU **0.75**
- Row 4: confidence **0.60**, IoU **0.55**
- Row 5: confidence **0.40**, IoU **0.20**

**Step one: sort by confidence, highest first.** They already are. This matters because a detector reports far more boxes than there are objects, and the user only ever looks at the confident ones. Sorting means we evaluate the model in the order it would actually be trusted.

**Step two: walk down the list, marking each row TP or FP using the 0.5 cutoff, and after every row recompute precision and recall.** Precision is TP / (TP + FP) among the rows seen so far. Recall is TP / 4, because there are 4 real dogs.

- Row 1, IoU 0.90 ≥ 0.5 → **TP**. Now TP=1, FP=0. Precision 1/1 = **1.0000**, recall 1/4 = **0.2500**.
- Row 2, IoU 0.30 < 0.5 → **FP**. TP=1, FP=1. Precision 1/2 = **0.5000**, recall still **0.2500**.
- Row 3, IoU 0.75 ≥ 0.5 → **TP**. TP=2, FP=1. Precision 2/3 = **0.6667**, recall 2/4 = **0.5000**.
- Row 4, IoU 0.55 ≥ 0.5 → **TP**. TP=3, FP=1. Precision 3/4 = **0.7500**, recall 3/4 = **0.7500**.
- Row 5, IoU 0.20 < 0.5 → **FP**. TP=3, FP=2. Precision 3/5 = **0.6000**, recall still **0.7500**.

Read the recall column: it climbs 0.25, 0.25, 0.50, 0.75, 0.75. It only moves on the rows that were true positives, and it stops at 0.75 because the fourth dog was never found at all.`,
    },
    {
      type: 'intuition',
      title: 'Turning that table into one number',
      md: `**Average precision (AP)** is the area under the precision-recall curve those five rows trace out. Computing an area under a curve made of steps has a shortcut that needs no geometry at all.

- The curve only steps forward in recall on a true-positive row, and each such step is worth exactly 1/4 of the recall axis, because there are 4 ground-truth dogs.
- So the area is the sum, over the true-positive rows only, of (precision at that row) × (1/4).
- Our three true-positive rows had precisions 1.0000, 0.6667 and 0.7500.
- AP = (1.0000 + 0.6667 + 0.7500) / 4 = 2.4167 / 4 = **0.6042**.

Notice what the missing fourth dog did. It never appears as a row, so it contributes nothing to the numerator — but it is still in the denominator, because the denominator is the number of real dogs and not the number of rows. **A missed object silently costs you a quarter of your AP.** That is how recall gets into a number that is called "precision".

And notice what the false positives did. Row 2 did not lower recall, but it dragged the precision of every later row down: row 3 scored 0.6667 instead of 1.0000 because of the mistake above it. Confident mistakes are expensive; low-confidence mistakes sit at the bottom of the list where they damage fewer rows.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Average precision, computed at any IoU cutoff',
      code: `rows = [(0.95, 0.90), (0.88, 0.30), (0.80, 0.75), (0.60, 0.55), (0.40, 0.20)]

def ap(rows, n_truth, cutoff):
    tp = 0
    fp = 0
    total = 0.0
    for conf, box_iou in rows:
        if box_iou >= cutoff:
            tp = tp + 1
            total = total + tp / (tp + fp)
        else:
            fp = fp + 1
    return total / n_truth

print(round(ap(rows, 4, 0.5), 4))
print(round(ap(rows, 4, 0.8), 4))

# ---- real output ----
# 0.6042
# 0.25`,
      annotations: {
        1: 'The five detections as (confidence, IoU) pairs, already sorted by confidence highest first. A pair in round brackets is a tuple.',
        3: 'Takes the sorted rows, how many real objects of this class exist, and the IoU cutoff to use.',
        4: 'Running count of true positives.',
        5: 'Running count of false positives.',
        6: 'The running sum of precisions, one term added per true positive. This will become the area.',
        7: 'Walk the rows in order. "for conf, box_iou in rows" unpacks each pair into two named variables in one step — conf gets the first number, box_iou the second.',
        8: 'The matching rule from the previous section: at or above the cutoff is a hit.',
        9: 'One more true positive.',
        10: 'Precision right now is tp / (tp + fp) counting only the rows seen so far. Add it to the running sum. Nothing is added on false-positive rows, because recall does not move there and a step of zero width has no area.',
        11: 'Otherwise the row is a false positive.',
        12: 'It raises fp, which lowers the precision of every row below it, which is exactly the penalty a confident mistake should carry.',
        13: 'Divide by the number of real objects, not the number of rows. Every ground-truth box the detector never found is a missing 1/n_truth of the score.',
        15: 'At cutoff 0.5: three true positives with precisions 1.0, 0.6667, 0.75, summing to 2.4167, divided by 4 gives 0.6042 — the hand calculation.',
        16: 'At cutoff 0.8 only the IoU 0.90 row survives as a true positive, so the sum is 1.0 and AP falls to 0.25. Same model, same boxes, stricter definition of correct.',
      },
    },
    {
      type: 'intuition',
      title: 'The two averages that make it "mean average precision"',
      md: `AP is one number for one class at one cutoff. Two averages sit on top of it, and the name mAP@[.5:.95] is just those two averages named out loud.

**Average one: over classes.** Compute AP separately for every class the detector knows, then take the plain mean. If dogs score 0.6042 and cats score 0.4000, then mAP = (0.6042 + 0.4000) / 2 = **0.5021**. The "m" is mean-over-classes and nothing else. Note what this choice implies: every class counts equally regardless of how often it appears, so three rare classes the model handles badly can drag down a model that is excellent on seventy common ones. That is a deliberate decision, and on a business problem where one class carries all the value it is the wrong one.

**Average two: over IoU cutoffs.** We saw the dog AP fall from 0.6042 at cutoff 0.5 to 0.2500 at cutoff 0.8 — the score depends entirely on a convention someone picked. The COCO convention refuses to pick: compute everything at **ten cutoffs — 0.50, 0.55, 0.60, ... up to 0.95** — and average the ten results. That is what **mAP@[.5:.95]** means. Written out: *the mean over classes of average precision, itself averaged over ten strictness levels from lenient to nearly pixel-perfect.*

For our dog class the ten values are 0.6042, 0.6042, 0.4167, 0.4167, 0.4167, 0.4167, 0.2500, 0.2500, 0.2500, 0.0000, and their mean is **0.3625**. Compare that with the 0.6042 at the single lenient cutoff. Nothing about the model changed.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The ten-cutoff sweep',
      code: `cutoffs = [0.5 + 0.05 * i for i in range(10)]
values = []
for c in cutoffs:
    values.append(ap(rows, 4, c))
print([round(v, 4) for v in values])
print(round(sum(values) / len(values), 4))

# ---- real output ----
# [0.6042, 0.6042, 0.4167, 0.4167, 0.4167, 0.4167, 0.25, 0.25, 0.25, 0.0]
# 0.3625`,
      annotations: {
        1: 'Builds the list 0.50, 0.55, 0.60, ... 0.95. The square-bracket form is a list comprehension: read it as "collect 0.5 + 0.05 * i, for i running 0 through 9". range(10) supplies those ten values of i.',
        2: 'An empty list to hold one AP per cutoff.',
        3: 'Walk the ten cutoffs one at a time.',
        4: 'Call the same ap function from the previous snippet with this cutoff, and store the result.',
        5: 'Print all ten, each rounded — another list comprehension, this one applying round to every value already collected.',
        6: 'The mean of the ten: sum divided by count. 0.3625 against 0.6042 at the single 0.5 cutoff.',
      },
    },
    {
      type: 'math',
      intro: 'The three definitions in symbols. A and B are two boxes, |A| means the area of A, C is the number of classes.',
      latex: [
        '\\mathrm{IoU}(A, B) = \\frac{|A \\cap B|}{|A \\cup B|} = \\frac{|A \\cap B|}{|A| + |B| - |A \\cap B|} \\qquad \\text{our pair: } \\tfrac{1200}{5400} = 0.2222',
        '\\mathrm{AP} = \\int_0^1 p(r)\\,dr \\;\\approx\\; \\frac{1}{G}\\sum_{\\text{true positives } k} p_k \\qquad \\text{our dogs: } \\tfrac{1.0000 + 0.6667 + 0.7500}{4} = 0.6042',
        '\\mathrm{mAP} = \\frac{1}{C}\\sum_{c=1}^{C}\\mathrm{AP}_c, \\qquad \\mathrm{mAP@[.5{:}.95]} = \\frac{1}{10}\\sum_{\\tau \\in \\{.50,\\,.55,\\,\\dots,\\,.95\\}} \\mathrm{mAP@}\\tau',
      ],
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `tp = 0
fp = 0
for conf, box_iou in rows:
    if box_iou >= 0.5:
        tp = tp + 1
    else:
        fp = fp + 1
    print(conf, box_iou, round(tp / (tp + fp), 4), round(tp / 4, 4))`,
        precomputedOutput: `0.95 0.9 1.0 0.25
0.88 0.3 0.5 0.25
0.8 0.75 0.6667 0.5
0.6 0.55 0.75 0.75
0.4 0.2 0.6 0.75`,
        caption: 'The precision-recall table by hand, printed. Column 3 is precision, column 4 is recall. Recall stops at 0.75 because the fourth dog was never found.',
        annotations: {
          1: 'True-positive counter, starting at zero.',
          2: 'False-positive counter, starting at zero.',
          3: 'Walk the five detections in confidence order, unpacking each pair into conf and box_iou.',
          4: 'The 0.5 cutoff decides which counter moves.',
          5: 'A hit: one more true positive.',
          6: 'Otherwise the row is a miss.',
          7: 'A false positive. It does not change recall, but it permanently lowers the precision of every row printed below it.',
          8: 'Print the row plus the two running numbers: precision is tp over everything seen so far, recall is tp over the 4 real dogs.',
        },
      },
    },
    {
      type: 'intuition',
      title: 'Worked case: reading a detection report',
      md: `A team reports two numbers for a warehouse box-detector: **mAP@0.5 = 0.71** and **mAP@[.5:.95] = 0.34**. A manager asks whether the model works.

- First, translate. 0.71 means: at the lenient definition of correct — half the combined area shared — the model averages 71% area under the precision-recall curve across classes. 0.34 means: averaged over ten definitions of correct running up to nearly pixel-perfect, it averages 34%.
- Second, the ratio. **The gap between the two numbers is itself a diagnosis.** A model that finds objects but draws sloppy rectangles scores well at 0.5 and collapses as the cutoff rises, because most of its boxes sit in the 0.5-to-0.7 band. A model that finds fewer objects but boxes them tightly holds up.
- Our dog class showed exactly this shape: 0.6042 at cutoff 0.5, 0.4167 by cutoff 0.6, 0.2500 by 0.8, and 0.0000 at 0.95. That drop is entirely about box tightness, since the same three detections were involved throughout.
- Third, the recommendation depends on what the boxes are for. If a robot arm has to grip the object, tight boxes matter and the 0.34 is the number to track. If the system only counts how many boxes are on a shelf, the object merely has to be found, and mAP@0.5 is the honest metric.
- Fourth, before touching the model, split the number by class and by object size. A drop concentrated in small objects or in two rare classes is a different problem from a uniform one, and fixing the aggregate blindly wastes a cycle.

The answer to the manager: 0.71 and 0.34 are the same model measured under two conventions, so neither is "the accuracy". Which one to quote follows from what the boxes are used for.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake, walked into on purpose',
      md: `A team benchmarks their detector against a published one. The paper reports **0.412**. Their own evaluation script prints **0.687**. They write in the review that their model beats the published one by 67% relative.

- The diagnosis. The paper's 0.412 is mAP@[.5:.95] — the COCO convention, where the number is averaged over ten cutoffs. Their script computed mAP at the single cutoff 0.5.
- These are different quantities with the same name. In COCO tables the column is often labelled just "AP" or "mAP" with the sweep implied, and the lenient single-cutoff number is labelled "AP50". Everyone in the field knows which is which; nobody writes it down.
- The size of the trap: our own dog class scored **0.6042** at the single cutoff and **0.3625** over the sweep. That is a 40% drop from nothing but the convention. Their 0.687 at the lenient cutoff might correspond to roughly 0.40 under the sweep, which would make the two models comparable rather than one being far ahead.
- The general form: **the convention a number uses matters more than the number.** Two numbers are only comparable when the cutoff, the sweep, the class list and the test set all match.

The repair costs nothing. Run their evaluation with the sweep and compare like with like, and always state the convention next to the number in your own reports so the next person does not repeat this.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Pen, paper, and the box conventions from the top of the module.

1. Ground truth (0, 0, 10, 10). Prediction (5, 0, 15, 10). Compute both areas, the intersection, the union and the IoU. Is it a true positive at cutoff 0.5?
2. Ground truth (0, 0, 10, 10). Prediction (0, 0, 100, 100) — a box covering the whole image. Compute the IoU. Explain in one sentence what would happen if the denominator were the truth's area instead of the union.
3. A class has 5 ground-truth objects. The detector returns four boxes, sorted by confidence, with IoUs 0.80, 0.60, 0.40, 0.70 against their nearest truths. Compute the precision and recall after each row, then the AP, at cutoff 0.5.
4. Recompute the AP from problem 3 at cutoff 0.65. Which rows changed, and what does the drop tell you about the model?
5. A model scores mAP@0.5 = 0.80 and mAP@[.5:.95] = 0.42. A colleague says the model finds only 42% of objects. State what is wrong with that reading, and what the gap actually indicates.`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `Check every intermediate number, not only the final one.

1. Truth area 10 × 10 = 100. Prediction area (15 − 5) × (10 − 0) = 100. Intersection: left max(0, 5) = 5, top max(0, 0) = 0, right min(10, 15) = 10, bottom min(10, 10) = 10, so it is (5, 0, 10, 10) with area 5 × 10 = **50**. Union = 100 + 100 − 50 = **150**. IoU = 50/150 = **0.3333**. Below 0.5, so it is a **false positive** — a prediction that overlaps half the object still fails the standard cutoff.
2. Intersection is the truth itself, area 100. Prediction area 100 × 100 = 10000. Union = 100 + 10000 − 100 = **10000**. IoU = 100/10000 = **0.0100**. If the denominator were the truth's area, the score would be 100/100 = 1.0 — a perfect score for a detector that simply claims the entire image every time. The union denominator is what removes that strategy.
3. Cutoff 0.5, five real objects. Row 1 (IoU 0.80) is a TP: precision 1/1 = **1.0000**, recall 1/5 = **0.2000**. Row 2 (0.60) TP: precision 2/2 = **1.0000**, recall **0.4000**. Row 3 (0.40) FP: precision 2/3 = **0.6667**, recall stays **0.4000**. Row 4 (0.70) TP: precision 3/4 = **0.7500**, recall 3/5 = **0.6000**. AP = (1.0000 + 1.0000 + 0.7500) / 5 = 2.75/5 = **0.5500**. Two of the five objects were never found, and that costs 2/5 of the possible score.
4. At cutoff 0.65 the IoU 0.60 row flips from TP to FP; the 0.40 row was already an FP; the 0.80 and 0.70 rows still pass. Walking it: row 1 TP, precision 1.0000. Row 2 FP. Row 3 FP. Row 4 TP with TP=2, FP=2, precision 2/4 = **0.5000**. AP = (1.0000 + 0.5000)/5 = **0.3000**, down from 0.5500. The drop says the model found that object but boxed it loosely — it is a localisation problem, not a detection problem, because the object was found at all.
5. Wrong because mAP is not a fraction of objects found; it is an average of areas under precision-recall curves, taken over classes and over ten strictness cutoffs, most of which are far stricter than any human would apply. The gap between 0.80 and 0.42 indicates that the boxes are loose: the model locates objects well enough to pass the lenient cutoff and loses them as the cutoff tightens. The fix, if it matters for the product, is on the box-position side, not on detection or classification.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands alone. These are the loose ends, in order of how often they come up.

- **Non-maximum suppression (NMS).** A detector fires many overlapping boxes on one object. Since matching is one-to-one, every duplicate after the first becomes a false positive, and precision collapses on a model whose detections were correct. NMS runs before evaluation: keep the highest-confidence box, delete every remaining box whose IoU with it exceeds a cutoff (typically 0.5 to 0.7), repeat. Too aggressive and it deletes genuinely separate objects in a crowd, hurting recall; too lenient and duplicates survive, hurting precision.
- **Interpolated precision.** Real COCO code does not use the plain sum we used. Before summing, it replaces each precision by the largest precision seen at any equal or higher recall, which smooths out the dips a false positive creates. On our five dog rows that raises AP from 0.6042 to 0.6250. The shape of the metric and every conclusion in this module are unchanged; the plain version is easier to compute by hand and easier to trust.
- **The Dice coefficient, derived.** Segmentation, which labels individual pixels rather than drawing boxes, usually reports Dice instead of IoU. Dice is 2 × the shared area, divided by the sum of both areas. Watch it turn into IoU. Write I for the shared area and U for the union. Since union is both areas minus the shared part counted once, the sum of both areas is U + I. So Dice = 2I/(U + I). Now IoU = I/U, so I = IoU × U. Substitute: Dice = 2·IoU·U / (U + IoU·U), and U cancels top and bottom, leaving **Dice = 2·IoU / (1 + IoU)**. Check it on our worked pair: IoU 0.2222 gives 0.4444/1.2222 = **0.3636**, and computing Dice directly gives 2 × 1200 / (3000 + 3600) = 2400/6600 = **0.3636**. Because that formula only ever increases as IoU increases, Dice and IoU rank two models identically — they never disagree about which is better, only about what the number looks like. Dice's soft version is also differentiable, so unlike everything else here it doubles as a training loss.
- **mIoU.** For segmentation the headline number is usually mean IoU over classes, computed on pixels rather than boxes. Same IoU, different unit of area.`,
    },
  ],
  quiz: [
    {
      question: 'Ground truth (0, 0, 10, 10), prediction (5, 0, 15, 10). What is the IoU?',
      options: [
        { text: '0.5000, because the prediction covers half the truth', explanation: 'That is intersection over the truth\'s area, 50/100. IoU divides by the union, which also counts the prediction\'s uncovered half.' },
        { text: '0.3333', explanation: 'Correct. Intersection is (5, 0, 10, 10), area 50. Union is 100 + 100 - 50 = 150. 50/150 = 0.3333.' },
        { text: '0.2500', explanation: 'That would be intersection divided by the sum of both areas, 50/200 — the union subtracts the shared part once instead of double-counting it.' },
      ],
      correct: 1,
    },
    {
      question: 'Why does IoU divide by the union rather than by the ground-truth box\'s area?',
      options: [
        { text: 'The union is easier to compute', explanation: 'It is strictly more work — you need both areas and the intersection to get it.' },
        { text: 'Because dividing by the truth alone would give a perfect score to a box covering the entire image', explanation: 'Correct. Such a box contains the object completely, so intersection equals the truth\'s area and the ratio is 1.0. The union grows with every claimed pixel, so the enormous box scores near zero.' },
        { text: 'Because the union is always larger, which keeps the score below 1', explanation: 'True but not the reason. Any larger denominator would do that; the union is chosen specifically because it charges you for pixels you claimed and did not need.' },
      ],
      correct: 1,
    },
    {
      question: 'A prediction has IoU 0.49 against the nearest ground-truth box, at a cutoff of 0.5. How does it count?',
      options: [
        { text: 'A false positive, with no partial credit', explanation: 'Correct. IoU makes a hard yes-or-no decision at the cutoff. 0.49 and 0.01 are the same answer as far as the counting is concerned.' },
        { text: 'Partial credit of 0.49 toward precision', explanation: 'There is no partial credit anywhere in this pipeline. IoU is a threshold that produces TP or FP, not a score that gets averaged in.' },
        { text: 'A false negative, because the object was missed', explanation: 'The false negative is charged separately, against the ground-truth box that ended up unclaimed. This prediction itself is a false positive.' },
      ],
      correct: 1,
    },
    {
      question: 'In the five-detection dog example, why is the AP divided by 4 rather than by the 3 true positives?',
      options: [
        { text: 'Because there were 4 detections above the cutoff', explanation: 'There were three true positives, not four, and the count of detections is not what goes in the denominator.' },
        { text: 'Because 4 is the number of real dogs, so the fourth dog — never detected — silently costs a quarter of the score', explanation: 'Correct. Each recall step is worth 1/4 of the axis. The undetected object contributes no numerator term but stays in the denominator, which is how a missed object is charged.' },
        { text: 'Because AP is always divided by the number of rows in the table', explanation: 'There were five rows. Dividing by rows would let a model raise its score by returning fewer boxes.' },
      ],
      correct: 1,
    },
    {
      question: 'What exactly does mAP@[.5:.95] average over?',
      options: [
        { text: 'Confidence scores between 0.5 and 0.95', explanation: 'The range refers to IoU cutoffs — how strict "correctly located" is — not to the detector\'s confidence.' },
        { text: 'Average precision per class, meaned over classes, and that meaned again over the ten IoU cutoffs 0.50, 0.55, ... 0.95', explanation: 'Correct. Two averages stacked on one AP: one over classes, one over ten strictness levels.' },
        { text: 'The hardest 50th to 95th percentile of images in the test set', explanation: 'Nothing in the notation refers to image difficulty. The .5:.95 is the IoU cutoff sweep.' },
      ],
      correct: 1,
    },
    {
      question: 'Your model scores 0.60 at mAP@0.5 and 0.36 at mAP@[.5:.95]. What does the gap indicate?',
      options: [
        { text: 'A bug — the two numbers should be close', explanation: 'A large gap is the normal case, not a bug. Our dog class alone went from 0.6042 to 0.3625 with no change to the model.' },
        { text: 'The model finds objects but draws loose boxes, so its detections fail as the cutoff tightens', explanation: 'Correct. Detection and classification are working, since the lenient cutoff passes. What degrades is box position, which is a localisation problem.' },
        { text: 'The model misses 24% of objects', explanation: 'Neither number is a fraction of objects found; both are averaged areas under precision-recall curves, so their difference is not a count of misses.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Define IoU and compute one on the spot: ground truth (30, 40, 90, 100), prediction (10, 20, 60, 80).',
      answer:
        'IoU is intersection over union: the area two boxes share divided by the area they cover between them. Boxes are (x1, y1, x2, y2), top-left and bottom-right. The truth is 60 wide and 60 tall, area 3600. The prediction is 50 wide and 60 tall, area 3000. For the intersection take the rightmost left edge, max(10, 30) = 30; the lowest top edge, max(20, 40) = 40; the leftmost right edge, min(60, 90) = 60; the highest bottom edge, min(80, 100) = 80. That is a 30 by 40 rectangle, area 1200. The union is 3000 + 3600 - 1200 = 5400, subtracting the shared part once because adding both areas counted it twice. IoU = 1200/5400 = 0.2222. At the usual 0.5 cutoff that prediction is a false positive despite looking like a near miss.',
      isCaseBased: false,
    },
    {
      question: 'Why is IoU used as a threshold rather than reported as a score?',
      answer:
        'Because the point of it is to recover the yes-or-no answer that every counting metric needs. A detector outputs geometry, not a decision, and precision and recall only exist once each prediction is a true positive or a false positive. So you pick a cutoff, conventionally 0.5, and a prediction at or above it against an unclaimed ground-truth box becomes a true positive; below it, or against an already-claimed box, a false positive; and any ground-truth box nobody claimed is a false negative. Matching is one-to-one, which is why duplicate boxes on the same object are punished. Averaging raw IoUs instead would hide the two things that matter: it would give partial credit to boxes nobody would accept, and it would say nothing at all about objects the model never proposed a box for, since those produce no IoU to average.',
      isCaseBased: false,
    },
    {
      question: 'Walk through how average precision is computed for one class.',
      answer:
        'Sort that class\'s predictions by confidence, highest first, because that is the order a user would trust them in. Walk down the list. Mark each row a true positive if its IoU against an unclaimed ground-truth box is at or above the cutoff, otherwise a false positive. After each row recompute precision as true positives over rows seen so far, and recall as true positives over the number of real objects. AP is the area under the precision-recall curve that traces out, which for step curves is simply the sum of the precisions at the true-positive rows, divided by the number of real objects. Worked: 4 real dogs, five detections with IoUs 0.90, 0.30, 0.75, 0.55, 0.20. The three hits have precisions 1.0000, 0.6667 and 0.7500, so AP = 2.4167/4 = 0.6042. The dog nobody found contributes nothing to the numerator but stays in the denominator.',
      isCaseBased: false,
    },
    {
      question: 'What does the "m" in mAP mean, and what does averaging that way cost you?',
      answer:
        'The m is mean over classes: compute AP separately for each class the detector knows and take the plain arithmetic mean. Dogs at 0.6042 and cats at 0.4000 give mAP 0.5021. The cost is that every class is weighted equally regardless of how often it appears or how much it is worth. A model that is excellent on seventy common classes and poor on three rare ones is dragged down as hard as if those three were half the data, and conversely a model can look fine while failing the one class that carries all the business value. For a benchmark that is a defensible choice, since it stops a model coasting on the majority class. For a product it is usually wrong, and the fix is to report per-class AP alongside the mean and to track the classes the product actually depends on.',
      isCaseBased: false,
    },
    {
      question: 'Case: explain to a product manager why detection accuracy is "only 42%" when the demo looks good.',
      answer:
        'The 42% is almost certainly mAP@[.5:.95], and it is not a fraction of objects found. Start from the bottom. IoU decides whether a predicted rectangle counts as correct: the shared area divided by the combined area, 1.0 for a perfect match and 0 for no overlap. We pick a cutoff, historically 0.5. Average precision is then ordinary precision and recall on top of that: sort detections by confidence, mark each a hit or a miss by the IoU rule, and take the area under the resulting precision-recall curve. mAP averages that across object classes. The COCO convention then does the whole thing at ten cutoffs from 0.50 up to 0.95 and averages the ten, which is what the bracket notation means. So the 42% includes strictness levels at which a box a person would call perfect still fails. The same model is typically around 60 to 70% at the lenient 0.5 cutoff, which is why the demo looks right. The practical framing for the manager: what matters is which convention the number uses, and which convention matters depends on what the boxes drive. If a robot grips the object, tight boxes matter and the strict number is the one to track. If we only count objects on a shelf, mAP@0.5 is the honest metric and we should track that instead. Either way we state the convention next to the number, always.',
      isCaseBased: true,
    },
    {
      question: 'Case: your detector scores mAP@0.5 = 0.68 but mAP@[.5:.95] = 0.31. Diagnose and give an ordered plan.',
      answer:
        'The gap is a localisation diagnosis. The model finds and classifies objects — that is what passing the lenient cutoff means — but its boxes sit loosely, so they fall out as strictness rises. Classification and recall are fine; box position is not. Before touching the model, split the metric by class and by object size, because the gap is usually concentrated in small objects or one or two classes, and fixing the aggregate blindly wastes a cycle. Then, in order of cost. First, check the human annotations: loose or inconsistent ground-truth boxes cap achievable IoU no matter what the model does, so re-measure agreement between two annotators on a sample. Second, change the box-position loss to one built on IoU itself, so training optimises the quantity being measured rather than a coordinate distance that treats a shift and a size error as equivalent. Third, raise input resolution or add higher-resolution feature levels, since small objects lose the most as the cutoff tightens — a few pixels of error is a large fraction of a small box and a negligible fraction of a large one. Fourth, re-tune the non-maximum-suppression cutoff, because aggressive suppression can delete a well-localised box in favour of a higher-confidence sloppy one, which shows up exactly as this pattern. And ask what the boxes are for: if the product only needs to know an object is present, the strict metric may be the wrong optimisation target entirely.',
      isCaseBased: true,
    },
    {
      question: 'Case: you report 0.687 and a published model reports 0.412. Your teammate writes that you beat it by 67%. What do you check?',
      answer:
        'That the two numbers are the same quantity, which they almost certainly are not. The published 0.412 is a COCO-convention number, mAP averaged over ten IoU cutoffs from 0.50 to 0.95. If our script computed mAP at the single 0.5 cutoff, we produced a different metric wearing the same name — COCO tables label the lenient one AP50 and the swept one simply AP, and the distinction usually goes unwritten. The size of the effect is not small: a single class in our own worked example scored 0.6042 at the lenient cutoff and 0.3625 over the sweep, a 40% drop from the convention alone. So our 0.687 could plausibly correspond to about 0.40 under the sweep, making the two models roughly comparable rather than one far ahead. Beyond the cutoff, three other things must match before any comparison is legal: the same test set, the same class list, and the same handling of ignored or crowd-labelled regions. The concrete action is to re-run our evaluation with the sweep, on the published test split, and compare like with like. And in our own reports, always state the convention beside the number so nobody has to reconstruct it.',
      isCaseBased: true,
    },
    {
      question: 'What is non-maximum suppression, and what happens to mAP without it?',
      answer:
        'A detector typically fires many overlapping boxes on the same object. Matching during evaluation is one-to-one: the first box to claim a ground-truth object takes it, and every duplicate afterwards is counted as a false positive. So without suppression, a model whose detections are actually correct can see its precision collapse, and mAP with it. Non-maximum suppression fixes this before evaluation: per class, sort by confidence, keep the top box, delete every remaining box whose IoU with it exceeds a cutoff — typically 0.5 to 0.7 — and repeat with the next surviving box. It is also a tuning knob with a real trade-off in both directions. Too aggressive and it merges genuinely separate objects in a crowded scene, which costs recall. Too lenient and duplicates survive, which costs precision. Under a strict cutoff sweep it can also keep a high-confidence loosely-drawn box in place of a better-localised, less confident one.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'IoU, in one line', back: 'Shared area divided by combined area. Truth (30,40,90,100) area 3600 and prediction (10,20,60,80) area 3000: intersection (30,40,60,80) = 1200, union 3000+3600-1200 = 5400, IoU = 0.2222.' },
    { front: 'Why the union is the denominator', back: 'Dividing by the truth\'s area alone would give 1.0 to a box covering the whole image, since it contains the object completely. The union charges you for every pixel you claimed and did not need.' },
    { front: 'IoU is a threshold, not a score', back: 'At cutoff 0.5: IoU at or above it against an unclaimed truth box is a TP, below it a FP, and any truth box left unclaimed is a FN. No partial credit — 0.49 and 0.01 count identically.' },
    { front: 'Average precision for one class', back: 'Sort by confidence, mark TP/FP by the IoU rule, and sum the precisions at the TP rows divided by the number of real objects. Five detections, 4 real dogs: (1.0000 + 0.6667 + 0.7500)/4 = 0.6042.' },
    { front: 'What a missed object costs', back: 'Nothing in the AP numerator, but it stays in the denominator — the number of real objects. With 4 dogs, one never found removes a full quarter of the possible AP.' },
    { front: 'What a confident false positive costs', back: 'It does not move recall, but it lowers the precision of every row below it. In the worked example row 3 scored 0.6667 instead of 1.0000 purely because of the mistake above it.' },
    { front: 'mAP@[.5:.95]', back: 'AP per class, meaned over classes, that mean recomputed at ten IoU cutoffs 0.50, 0.55, ... 0.95 and averaged. Our dog class: 0.6042 at cutoff 0.5, 0.3625 over the sweep. Same model, same boxes.' },
    { front: 'Reading the gap between the two mAPs', back: 'A big gap means the model finds objects but boxes them loosely — a localisation problem, not a detection one. And comparing your 0.5-cutoff number with a paper\'s swept number is the classic benchmark error.' },
  ],
  mindmapMarkdown: `- Vision metrics
  - Box notation
    - (x1, y1, x2, y2), top-left and bottom-right
    - truth (30, 40, 90, 100), area 3600
    - the other common form is (x, y, width, height)
  - IoU
    - shared area / combined area
    - prediction (10,20,60,80): inter 1200, union 5400, IoU 0.2222
    - tight prediction (32,42,88,98): IoU 0.8711
    - far-away box: IoU 0.0
    - union denominator stops the whole-image cheat
  - IoU as a threshold
    - cutoff 0.5, one-to-one matching
    - at or above and unclaimed: TP
    - below, or duplicate: FP
    - truth box nobody claimed: FN
    - no partial credit anywhere
  - Average precision
    - sort by confidence
    - precision 1.0000, 0.5000, 0.6667, 0.7500, 0.6000
    - recall 0.25, 0.25, 0.50, 0.75, 0.75
    - AP = 2.4167 / 4 = 0.6042
    - missed object costs a full 1/4
  - The two averages
    - mean over classes: dogs 0.6042, cats 0.4000, mAP 0.5021
    - mean over ten cutoffs 0.50 to 0.95
    - dog class over the sweep: 0.3625
  - Reading a report
    - the gap diagnoses loose boxes
    - never compare 0.5-cutoff with swept numbers
    - split by class and object size first
  - Beyond the basics
    - NMS deletes duplicate boxes before scoring
    - interpolated precision raises 0.6042 to 0.6250
    - Dice = 2*IoU/(1+IoU), derived
    - mIoU for segmentation`,
}

export default m
