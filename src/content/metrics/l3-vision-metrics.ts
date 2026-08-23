import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l3-vision-metrics',
  subjectId: 'metrics',
  level: 3,
  title: 'IoU and mAP for Object Detection',
  whyItMatters:
    'Every detection leaderboard — COCO, Pascal VOC, open-vocabulary detection — ranks models by mAP. If you cannot say what the number counts, you cannot say whether a model is actually better.',
  assumes: [
    'You know precision and recall',
    'You have seen average precision from a ranked list',
  ],
  estMinutes: 22,
  sections: [
    {
      type: 'intuition',
      title: 'Detection needs a partial-credit rule',
      md: `Classification is a clean match: the label is right or wrong. Detection is not — a predicted box is almost never pixel-identical to the true one, so "did it get it right?" has no yes/no answer on its own.

**Intersection over Union (IoU)** supplies one. It is the overlap area of two boxes divided by the area they cover together: 1.0 for identical boxes, 0.0 for boxes that do not touch.

Fix a threshold — say IoU ≥ 0.5 — and every prediction becomes a true positive or a false positive again. Everything else in detection metrics is built on top of that one decision.`,
    },
    {
      type: 'math',
      intro:
        'IoU on two axis-aligned boxes. The intersection is a box itself, found by taking the inner edges on each axis; the max(0, ·) is what makes non-overlapping boxes give 0 rather than a negative area.',
      latex: [
        '\\mathrm{IoU}(A,B) = \\frac{|A \\cap B|}{|A \\cup B|} = \\frac{|A \\cap B|}{|A| + |B| - |A \\cap B|}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'IoU on three predictions against one true box',
      code: `def iou(a, b):
    ix1, iy1 = max(a[0], b[0]), max(a[1], b[1])
    ix2, iy2 = min(a[2], b[2]), min(a[3], b[3])
    inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
    area_a = (a[2] - a[0]) * (a[3] - a[1])
    area_b = (b[2] - b[0]) * (b[3] - b[1])
    return inter / (area_a + area_b - inter)

truth = (30, 40, 90, 100)
print('roughly the right place :', round(iou(truth, (10, 20, 60, 80)), 4))
print('a tight, slightly small box:', round(iou(truth, (32, 42, 88, 98)), 4))
print('a box somewhere else    :', round(iou(truth, (200, 200, 260, 260)), 4))

# ---- real output ----
# roughly the right place : 0.2222
# a tight, slightly small box: 0.8711
# a box somewhere else    : 0.0`,
      annotations: {
        2: 'The intersection uses the INNER edges: the larger of the two left edges, the smaller of the two right edges. If the boxes miss each other, ix2 lands left of ix1.',
        4: 'max(0, ·) on each side length. Without it a miss produces two negative lengths that multiply into a positive area — a silent bug that reports overlap where there is none.',
        7: 'Union by inclusion–exclusion rather than by drawing it: |A| + |B| − |A ∩ B|, so the shared part is not counted twice.',
        12: 'A box that a human would call "roughly right" scores 0.2222 and fails the usual 0.5 gate. IoU is far harsher than visual judgement — it punishes size error and position error together.',
        13: 'Shifted 2px and 2px small on every side, and it still only reaches 0.8711. Scores above 0.9 require near-exact boxes.',
      },
    },
    {
      type: 'note',
      label: 'Why 0.5 became the default, and what it hides',
      md: `Pascal VOC picked IoU ≥ 0.5 in 2007 and everyone inherited it. It is a loose bar: the 0.8711 box above and a box that merely covers half the object both count as the same true positive.

That matters when localisation quality is the product. A grasping robot needs the tight box; a "how many people are in this frame?" counter does not.

So a single mAP@0.5 can hide a model that finds everything and localises badly. The COCO metric was designed exactly to stop that.`,
    },
    {
      type: 'intuition',
      title: 'From IoU to average precision',
      md: `Once a threshold turns every prediction into a TP or FP, sort all predictions by **confidence**, highest first, and walk down the list computing precision and recall as you go.

**Average precision (AP)** summarises that walk: it is the mean precision measured at each point where recall increases — that is, at each true positive — divided by the number of objects that actually exist.

Missed objects are not silently dropped. They stay in the denominator, so failing to detect something costs you exactly as much as a confident wrong box.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'AP at one threshold, and what changes at a stricter one',
      code: `# (confidence, best IoU against a distinct true object), highest confidence first
rows = [(0.95, 0.90), (0.88, 0.30), (0.80, 0.75), (0.60, 0.55), (0.40, 0.20)]
n_true = 4

def ap(rows, n_true, thr):
    tp, total = 0, 0.0
    for rank, (conf, overlap) in enumerate(rows, start=1):
        if overlap >= thr:
            tp = tp + 1
            total = total + tp / rank
    return total / n_true

print('AP@0.5:', round(ap(rows, n_true, 0.5), 4))
print('AP@0.8:', round(ap(rows, n_true, 0.8), 4))

# ---- real output ----
# AP@0.5: 0.6042
# AP@0.8: 0.25`,
      annotations: {
        2: 'Five predictions for four real objects — so at least one is a false positive no matter how good the boxes are, and one object may go undetected.',
        8: 'tp / rank is the precision at this point in the ranked list. It is only recorded on a true positive, because only a TP moves recall.',
        11: 'Divide by the number of TRUE objects, not the number of detections. That is what makes a missed object cost the same as a false alarm.',
        14: 'AP@0.5: three of five boxes clear 0.5, at ranks 1, 3 and 4, giving (1.0 + 0.667 + 0.75) / 4 = 0.6042.',
        15: 'Raise the bar to 0.8 and only the 0.90 box survives: 1.0 / 4 = 0.25. Same detections, same confidences — the model lost 60% of its score purely on localisation tightness.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The COCO metric: average AP across ten thresholds',
      code: `cuts = [0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95]
scores = [round(ap(rows, n_true, c), 4) for c in cuts]

for c, s in zip(cuts, scores):
    print('AP@%.2f = %.4f' % (c, s))
print('mAP@[.5:.95] =', round(sum(scores) / len(scores), 4))

# ---- real output ----
# AP@0.50 = 0.6042
# AP@0.55 = 0.6042
# AP@0.60 = 0.4167
# AP@0.65 = 0.4167
# AP@0.70 = 0.4167
# AP@0.75 = 0.4167
# AP@0.80 = 0.2500
# AP@0.85 = 0.2500
# AP@0.90 = 0.2500
# AP@0.95 = 0.0000
# mAP@[.5:.95] = 0.3625`,
      annotations: {
        1: 'Ten thresholds from 0.50 to 0.95 in steps of 0.05. This is the entire difference between the VOC metric and the COCO one.',
        6: '0.3625 against 0.6042 at the loose threshold alone. The headline COCO number is roughly 40% lower here, and that gap IS the localisation quality.',
        16: 'AP falls to 0.0 at 0.95 — even the 0.90 box, which looked excellent, cannot clear it. Almost every real model bottoms out at the strict end.',
      },
    },
    {
      type: 'visual',
      component: 'Plot',
      props: {
        title: 'AP as the IoU threshold tightens',
        notice:
          'The curve is a staircase, not a slope: AP only changes when a threshold crosses one of the actual IoU values (0.90, 0.75, 0.55). Between crossings the same set of detections counts, so the score is flat. The COCO metric is the average height of this staircase — 0.3625 — while quoting only the leftmost point would give 0.6042.',
        kind: 'line',
        xLabel: 'IoU threshold',
        yLabel: 'AP',
        series: [
          {
            name: 'AP',
            points: [
              [0.5, 0.6042],
              [0.55, 0.6042],
              [0.6, 0.4167],
              [0.65, 0.4167],
              [0.7, 0.4167],
              [0.75, 0.4167],
              [0.8, 0.25],
              [0.85, 0.25],
              [0.9, 0.25],
              [0.95, 0.0],
            ],
          },
          { name: 'mAP@[.5:.95]', dashed: true, points: [[0.5, 0.3625], [0.95, 0.3625]] },
        ],
      },
    },
    {
      type: 'note',
      label: 'The m in mAP means two different things',
      md: `Read a paper carefully and "mAP" is averaged over two axes, sometimes both at once:

- **Over classes** — AP is computed per class and then averaged, so a rare class counts as much as a common one. This is the original Pascal VOC meaning.
- **Over IoU thresholds** — the ten-cut average above. This is the COCO meaning, written \`mAP@[.5:.95]\` or just \`AP\` in COCO's own tables.

COCO does both: per class, per threshold, then averaged over everything. When someone quotes a bare mAP, ask which one — VOC-style mAP@0.5 is routinely 15–25 points higher than the COCO number for the same model.`,
    },
    {
      type: 'note',
      label: 'What the number never tells you',
      md: `**NMS runs first.** Non-maximum suppression drops overlapping duplicates before any of this is computed, so its threshold silently moves your mAP. Two "identical" models can differ by points on NMS settings alone.

**Small objects drag it down.** COCO reports AP_S, AP_M and AP_L separately because small-object AP is often less than half the overall figure. A model that is excellent on people and useless on distant traffic signs reports one middling number.

**Confidence calibration is invisible.** AP only uses the ranking of confidences, not their values. A model whose scores are all wrong but correctly ordered gets full marks — which is fine for a leaderboard and dangerous for a system that thresholds on confidence in production.`,
    },
  ],
  quiz: [
    {
      question: 'A predicted box that a human would call "roughly the right place" scored IoU 0.2222. What does that tell you?',
      options: [
        { text: 'The IoU function has a bug', explanation: 'The arithmetic is right — a 50×60 box overlapping a 60×60 box in a 30×40 region genuinely gives 1200/5400.' },
        { text: 'IoU is much harsher than visual judgement — it penalises size and position error together', explanation: 'Correct. That box fails the standard 0.5 gate outright, despite looking approximately right.' },
        { text: 'The boxes do not overlap', explanation: 'They do; a non-overlapping box gave 0.0.' },
        { text: 'The threshold should be lowered to 0.2', explanation: 'That would count badly localised boxes as successes, which is the opposite of what detection metrics are for.' },
      ],
      correct: 1,
    },
    {
      question: 'Why does the IoU function wrap each intersection side length in max(0, ·)?',
      options: [
        { text: 'To avoid division by zero', explanation: 'Division by zero would come from a zero union, not from the intersection.' },
        { text: 'Because two negative side lengths would multiply into a positive area, silently reporting overlap where there is none', explanation: 'Correct — a miss on both axes gives two negative lengths whose product is positive.' },
        { text: 'To normalise the result into [0, 1]', explanation: 'Normalisation comes from dividing by the union.' },
        { text: 'To handle rotated boxes', explanation: 'This formula only handles axis-aligned boxes; rotated ones need polygon intersection.' },
      ],
      correct: 1,
    },
    {
      question: 'In the AP calculation, why divide by the number of true objects rather than the number of detections?',
      options: [
        { text: 'It makes the score larger', explanation: 'It usually makes it smaller — undetected objects stay in the denominator.' },
        { text: 'So a missed object costs exactly as much as a confident wrong box', explanation: 'Correct. Dividing by detections would let a model score well by simply predicting less.' },
        { text: 'Because detections can be duplicated', explanation: 'Duplicates are removed by NMS before AP is computed.' },
        { text: 'It is a convention with no effect on ranking', explanation: 'It changes the score materially — it is what makes recall part of the metric.' },
      ],
      correct: 1,
    },
    {
      question: 'The same five detections scored AP@0.5 = 0.6042 and AP@0.8 = 0.25. What changed?',
      options: [
        { text: 'The model, between the two runs', explanation: 'Identical detections and confidences — only the threshold moved.' },
        { text: 'Nothing about the detections — two boxes that cleared 0.5 fail 0.8, so the score reflects localisation tightness rather than finding ability', explanation: 'Correct. Only the 0.90 box survives at 0.8.' },
        { text: 'The ranking of confidences', explanation: 'Confidences are unchanged; the TP/FP labels are what move.' },
        { text: 'The number of true objects', explanation: 'n_true stays 4 throughout.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is the AP-versus-threshold plot a staircase rather than a smooth curve?',
      options: [
        { text: 'Because only ten thresholds were sampled', explanation: 'Sampling more finely would show the same flat runs — the steps are real.' },
        { text: 'AP only changes when a threshold crosses one of the actual IoU values, so between crossings the same detections count', explanation: 'Correct — the steps sit at 0.90, 0.75 and 0.55.' },
        { text: 'Rounding to four decimal places', explanation: 'The flat runs are exact, not a rounding artefact.' },
        { text: 'Because confidences are discrete', explanation: 'Confidences do not enter; only the IoU comparison does.' },
      ],
      correct: 1,
    },
    {
      question: 'Someone quotes "mAP = 0.61" for a detector. What should you ask?',
      options: [
        { text: 'Which dataset it was trained on', explanation: 'Useful, but it does not disambiguate the metric itself.' },
        { text: 'Whether that is VOC-style mAP@0.5 or COCO mAP@[.5:.95] — the same model routinely differs by 15–25 points between them', explanation: 'Correct. Here the same detections give 0.6042 and 0.3625.' },
        { text: 'What the NMS threshold was', explanation: 'Worth asking too, but it moves the number by points, not by the factor the averaging convention does.' },
        { text: 'Whether precision or recall was used', explanation: 'AP already combines both.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain IoU and why detection needs it.',
      answer:
        'A predicted box is essentially never pixel-identical to the true one, so "correct or not" has no answer on its own. IoU gives one: the overlap area divided by the combined area, 1.0 for identical boxes and 0.0 for disjoint ones. Fixing a threshold turns each prediction back into a TP or FP so ordinary precision and recall apply. The thing worth stressing is how harsh it is — a box that looks roughly right can score 0.22 and fail the standard 0.5 gate, because IoU penalises position error and size error simultaneously.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through computing AP for a detector.',
      answer:
        'Pick an IoU threshold, then match each prediction to a ground-truth box — a prediction clearing the threshold against an unmatched object is a TP, everything else an FP. Sort predictions by confidence, walk down the ranked list, and record the precision tp/rank at every true positive. AP is the sum of those precisions divided by the number of true objects, not the number of detections. On the five-detection example that gave (1.0 + 0.667 + 0.75) / 4 = 0.6042 at threshold 0.5. Dividing by true objects is the important detail: it keeps undetected objects in the denominator, so missing something costs as much as a false alarm.',
      isCaseBased: true,
    },
    {
      question: 'Why did COCO move to averaging over ten IoU thresholds?',
      answer:
        'Because mAP@0.5 alone rewards finding objects and is nearly indifferent to localising them well. Under a 0.5 gate, a tight box and a barely-half-overlapping box count the same. Averaging AP over 0.50 to 0.95 in 0.05 steps makes localisation quality part of the score directly — in the worked example the same detections gave 0.6042 at 0.5 and 0.3625 averaged, and that gap is exactly the localisation quality the loose threshold hides. It also stops a model from tuning to one arbitrary cut-off.',
      isCaseBased: false,
    },
    {
      question: 'What does "m" in mAP mean?',
      answer:
        'Two different things depending on the paper, which is a genuine source of confusion. In Pascal VOC it means averaged over classes — AP per class, then a mean, so rare classes count as much as common ones. In COCO it usually means averaged over the ten IoU thresholds, written mAP@[.5:.95]. COCO actually does both: per class, per threshold, then averaged over everything. Whenever someone quotes a bare mAP I ask which convention, because VOC-style mAP@0.5 typically runs 15 to 25 points above the COCO figure for the identical model.',
      isCaseBased: false,
    },
    {
      question: 'Your mAP is 0.45 but the product team says the detector feels broken. How do you investigate?',
      answer:
        'Break the aggregate apart, because 0.45 is an average over things that fail differently. First AP_S / AP_M / AP_L — small-object AP is often less than half the overall figure, and if the product cares about distant objects that alone explains it. Then per-class AP, since one dominant class can carry the mean while the class users actually notice sits near zero. Then AP@0.5 versus AP@0.75: a big gap means the model finds objects and localises them loosely, which reads as "broken" in any UI that draws boxes. Finally I would check confidence calibration, because AP only uses the ranking of scores — a model with well-ordered but badly scaled confidences scores fine and behaves terribly at whatever fixed threshold production uses.',
      isCaseBased: true,
    },
    {
      question: 'How does NMS interact with mAP?',
      answer:
        'Non-maximum suppression runs before the metric is computed, so it is part of the measurement whether you intend it or not. Set the NMS IoU threshold too low and you suppress genuine adjacent objects, losing recall; set it too high and duplicate boxes survive as false positives that depress precision at every rank below them. Two otherwise identical models can differ by several mAP points on NMS settings alone, which is why comparing numbers across papers without matching post-processing is unreliable — and why NMS thresholds belong in the reported configuration.',
      isCaseBased: true,
    },
    {
      question: 'Would you use mAP as a training objective?',
      answer:
        'No — it is not differentiable. The argmax matching between predictions and ground truth, the hard IoU threshold, and the ranking by confidence are all step functions with zero gradient almost everywhere. Training uses differentiable surrogates: a classification loss for the labels plus a box regression loss, and increasingly a direct IoU-family loss like GIoU, DIoU or CIoU, which are differentiable relaxations that fix IoU\'s own gradient problem for non-overlapping boxes. mAP stays as the evaluation metric, and the usual gap between the surrogate loss and it is exactly why validation mAP is what you early-stop on.',
      isCaseBased: false,
    },
    {
      question: 'How would you evaluate a detector for a safety-critical system?',
      answer:
        'Not by mAP, or at least not only. mAP averages over confidence thresholds, but a deployed system runs at one fixed threshold, so I would report precision and recall at that operating point. I would weight recall on the classes where a miss is dangerous and accept the precision cost explicitly rather than letting an average hide the trade. I would also report per-condition breakdowns — night, rain, occlusion, small and distant objects — because an aggregate that mixes them is precisely the number that looks fine while the system fails in the conditions that matter. And I would insist on a tighter IoU threshold than 0.5 wherever the downstream action depends on where the object is rather than merely that it exists.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'IoU', back: 'Intersection area / union area of two boxes. 1.0 identical, 0.0 disjoint. Turns a partial-credit problem into a TP/FP decision.' },
    { front: 'How harsh IoU is', back: 'A "roughly right" box scored 0.2222 and fails the 0.5 gate. A box shifted 2px and 2px small on each side still only reached 0.8711.' },
    { front: 'The max(0, ·) in IoU', back: 'Without it, a box that misses on both axes gives two negative side lengths whose product is a positive area — silent phantom overlap.' },
    { front: 'AP', back: 'Sort by confidence, record precision tp/rank at each true positive, sum, divide by the number of TRUE OBJECTS — so a miss costs as much as a false alarm.' },
    { front: 'AP@0.5 vs AP@0.8', back: 'Identical detections gave 0.6042 and 0.25. The whole difference is how tightly the boxes are localised.' },
    { front: 'mAP@[.5:.95]', back: 'AP averaged over IoU 0.50 to 0.95 in 0.05 steps. On the worked example: 0.3625, against 0.6042 at the loose threshold alone.' },
    { front: 'The two meanings of m', back: 'VOC: averaged over CLASSES. COCO: averaged over IoU THRESHOLDS (and classes). VOC-style numbers run 15–25 points higher.' },
    { front: 'What mAP hides', back: 'NMS threshold (runs first, moves the score), small-object AP (often under half the total), and confidence calibration (only ranking is used).' },
  ],
  mindmapMarkdown: `- IoU and mAP
  - IoU
    - intersection / union of two boxes
    - max(0, side) or phantom overlap
    - "roughly right" box = 0.2222 (fails 0.5)
    - 2px off on each side = 0.8711
  - AP at one threshold
    - threshold -> every box is TP or FP
    - sort by confidence, precision tp/rank at each TP
    - divide by TRUE OBJECTS, not detections
    - AP@0.5 = 0.6042 ; AP@0.8 = 0.25
  - mAP
    - COCO: average over 0.50..0.95 step 0.05
    - 0.3625 vs 0.6042 -> the gap IS localisation quality
    - staircase: only moves when a cut crosses a real IoU
    - "m" = over classes (VOC) or over thresholds (COCO)
  - What it hides
    - NMS runs first and moves the score
    - small-object AP often < half the total
    - only the RANKING of confidences is used`,
}

export default m
