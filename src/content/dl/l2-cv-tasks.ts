import type { Module } from '../types'

const m: Module = {
  id: 'dl-l2-cv-tasks',
  subjectId: 'dl',
  level: 2,
  title: 'The CV Task Map: Detection & Segmentation',
  whyItMatters:
    'Every computer-vision interview starts with a business question, not an architecture: "we want to count trucks in this yard." Pick classification and you ship nothing; pick segmentation and you burn six months on labelling. This module is the map from question to task to model — plus NMS and IoU, the two mechanics interviewers make you walk step by step.',
  estMinutes: 45,
  sections: [
    {
      type: 'intuition',
      title: 'One photo, five different questions',
      md: `Two cats on a sofa. Five products could be built on that photo, and they are five different problems.

- **Classification** — "is there a cat?" One label for the whole image.
- **Localization** — "where is the cat?" One label plus one box. Assumes exactly one object.
- **Object detection** — "where is every object?" Many boxes, each with a class and a confidence.
- **Semantic segmentation** — "which pixels are cat?" A class for every pixel — but both cats melt into one cat-coloured blob.
- **Instance segmentation** — "which pixels are cat number two?" Per-pixel class AND identity.
- **Keypoints / pose** — "where is its left front paw?" A fixed list of named points per instance (the same machinery, with points instead of boxes).`,
    },
    {
      type: 'note',
      md: `Read that list as a **ladder of spatial precision**: how finely must the answer be pinned down in space? Classification answers "somewhere in this image". Detection answers "inside this rectangle". Segmentation answers "these exact pixels". Instance segmentation adds "and this pixel belongs to that specific animal". Every rung up buys you a more useful answer and costs you more model, more compute, and — the part nobody budgets for — dramatically more labelling. The whole engineering question is which rung your business question actually stands on, and we come back to that at the end with numbers.`,
    },
    {
      type: 'intuition',
      title: 'Why detection is genuinely harder than classification',
      md: `A classifier has an easy contract: fixed input, fixed output. 1000 classes in, 1000 numbers out, always.

- A detector must output a **variable-length list**. This image has 2 cats, that one has 47 people, the next has nothing.
- A neural network cannot emit "however many rows I feel like". Its output tensor has a fixed shape, decided at build time.
- So every detector plays the same trick: **predict a huge fixed number of candidate boxes, then throw almost all of them away.**
- That trick is why two things exist that classification never needs: a *confidence/objectness* score per candidate (how sure am I that anything is here) and **NMS**, the cleanup pass that deletes duplicates.
- Two families solved "where do the candidates come from" differently. That split — two-stage vs one-stage — is the first thing to say when asked about detectors.`,
    },
    {
      type: 'intuition',
      title: 'Family 1: two-stage (R-CNN → Fast → Faster)',
      md: `Two-stage means: first *propose* where things might be, then *classify* each proposal properly. Accurate, and historically slow.

- **R-CNN (2014)** — an old-school algorithm (selective search) proposes ~2000 regions; each region is cropped, resized, and pushed through the CNN separately. 2000 forward passes per image.
- **Fast R-CNN** — run the CNN **once** over the whole image, then crop the *feature map* instead of the pixels (RoI pooling). Same 2000 proposals, one backbone pass.
- **Faster R-CNN** — replace selective search with a **Region Proposal Network**: a tiny conv head sliding over that same feature map, outputting "object here / not here" plus a box adjustment. Proposals are now learned, and the whole thing trains end to end.
- The reported per-image times tell the story: roughly 47 s → 2 s → 0.2 s across the three papers.
- Interview line: *"Faster R-CNN's contribution is that proposals became a learned head sharing the backbone, not a separate CPU algorithm."*`,
    },
    {
      type: 'intuition',
      title: 'Family 2: one-stage (YOLO, SSD, RetinaNet)',
      md: `One-stage asks: why propose at all? Let the grid itself be the proposal.

- Divide the image into an **S×S grid**. Each cell is responsible for objects whose centre falls inside it.
- Each cell predicts, in one shot: a few boxes (x, y, w, h), an **objectness** score per box, and class scores.
- That is the entire network. **One forward pass, no second stage** — which is why one-stage detectors run on video at 30–60+ FPS while two-stage detectors historically crawled.
- **SSD** adds predictions at several feature-map scales, so small objects get read off high-resolution layers and big ones off deep layers.
- **RetinaNet** kept one-stage speed and closed most of the accuracy gap with **focal loss** — a fix for the background imbalance we hit later in this module.
- The old summary "two-stage = accurate, one-stage = fast" is now mostly historical: modern YOLO versions match or beat two-stage accuracy. Say the tradeoff, then say it has narrowed.`,
    },
    {
      type: 'math',
      intro: 'The one-stage output tensor, with real arithmetic. This is a favourite whiteboard question.',
      latex: [
        '\\text{output} = S \\times S \\times (B \\cdot 5 + C) \\quad \\text{per box: } (x,\\, y,\\, w,\\, h,\\, \\underbrace{p(\\text{object})}_{\\text{objectness}})',
        '\\text{YOLOv1: } 7 \\times 7 \\times (2 \\cdot 5 + 20) = 7 \\times 7 \\times 30 = 1470 \\text{ numbers for the whole image}',
        '\\text{Modern anchor-free head, } 640^2 \\text{ input, strides } 8/16/32: \\;\\; 80^2 + 40^2 + 20^2 = 8400 \\text{ candidate boxes}',
      ],
    },
    {
      type: 'note',
      md: `Hold on to that **8400**. A typical photo contains fewer than ten objects, so more than 99.8% of those predictions are supposed to say "nothing here". That single ratio explains two later sections at once: it is why **NMS** is needed (the few dozen predictions near a real object all fire together) and why **focal loss** was invented (the loss is otherwise dominated by an ocean of easy background). Dense prediction is an imbalance problem wearing a vision costume.`,
    },
    {
      type: 'intuition',
      title: 'Anchor boxes, in one paragraph',
      md: `Regressing a box from nothing is a hard ask: the network must invent a width and height out of thin air, and the numbers it must output for a lamppost and for a bus are wildly different. **Anchors** remove that burden. At every location on the feature map you pre-place a small set of fixed reference boxes — say a tall one, a wide one, and a square one, at two or three sizes. The network never predicts a box directly; it predicts (a) which anchor is responsible, and (b) a small **offset** from that anchor: shift the centre this much, scale the width by this much. A tall thin object gets matched to the tall thin anchor, so the correction the network learns is small, well-scaled, and stable to train.

- During training, each anchor is labelled positive or negative by its **IoU** with a ground-truth box — high overlap means "you are responsible for this object".
- The cost is a pile of hyperparameters: how many anchors, which aspect ratios, which scales, and what IoU cutoffs — all of which you are supposed to tune per dataset.
- Counting check: a 13×13 feature map with 5 anchors per cell emits 13 × 13 × 5 = 845 candidate boxes.`,
    },
    {
      type: 'note',
      md: `**The anchor-free turn.** Modern detectors (FCOS, CenterNet, YOLOX, YOLOv8) mostly dropped anchors: each feature-map location directly predicts the distances to the object's four edges, or the object's centre point plus a size. Fewer hyperparameters, no anchor-matching heuristics, comparable accuracy. **DETR** went further and removed NMS too, by predicting a fixed set of queries matched to ground truth one-to-one during training — no duplicates to suppress. If you are asked what is new in detection since 2020, "anchor-free heads and set-prediction transformers" is the answer.`,
    },
    {
      type: 'intuition',
      title: 'IoU: the one rule that decides "same object?"',
      md: `Boxes never line up pixel-perfectly, so every detection question — is this a hit, is this a duplicate, which anchor is responsible — needs a numeric definition of "close enough". That is **IoU (Intersection over Union)**: overlap area divided by union area.

- 1 = identical boxes. 0 = no overlap at all. 0.5 = the conventional "close enough" line.
- The union denominator is what keeps it honest: plain overlap area would reward drawing one giant box over the entire image.
- IoU is used at three separate moments, and mixing them up is a classic interview stumble: **anchor assignment** during training, **duplicate removal** in NMS, and **TP/FP matching** during evaluation. Same formula, three different thresholds, tuned independently.
- The full evaluation story — how IoU turns predictions into TP/FP/FN, and how those become mAP — lives in the Metrics subject, module *GenAI & Vision Metrics*.`,
    },
    {
      type: 'math',
      intro: 'IoU, and the one identity worth memorising alongside it.',
      latex: [
        '\\mathrm{IoU}(A, B) = \\frac{|A \\cap B|}{|A \\cup B|} = \\frac{|A \\cap B|}{|A| + |B| - |A \\cap B|}',
        '\\text{Dice} = \\frac{2|A \\cap B|}{|A| + |B|} = \\frac{2\\,\\mathrm{IoU}}{1 + \\mathrm{IoU}} \\quad \\text{— same ranking, gentler on small objects.}',
      ],
    },
    {
      type: 'intuition',
      title: 'NMS: deleting the duplicates, step by step',
      md: `One cat, twenty boxes. Every grid cell and anchor near the cat fires, each slightly offset, each fairly confident. Ship that and precision collapses — nineteen of those twenty count as false positives. **Non-maximum suppression** is the cleanup pass, and it is pure post-processing: no learning, no parameters, just a rule.

1. Drop every box below a confidence floor (say 0.25) — cheap, removes most of the 8400 immediately.
2. Sort what remains by confidence, highest first.
3. Take the top box. It is a final detection; nothing can remove it now.
4. Compute IoU between it and every remaining box. Delete every box above the IoU threshold (typically 0.5–0.7) — those are duplicates of the same object.
5. Repeat from step 3 with what survives, until the list is empty.

The name says the algorithm: suppress everything that is **not the local maximum** of confidence.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'NMS, one decision per step',
        notice: 'Left: the candidate list, sorted by confidence. Right: the verdicts. A dashed red cell (labelled "freed" by this diagram) is a box struck off the list; a solid cell is a final detection. The IoU values are the real numbers from the code below.',
        leftLabel: 'candidate list (score)',
        rightLabel: 'verdicts',
        frames: [
          {
            note: 'Five boxes from one forward pass on a two-cat photo, sorted by confidence. Rule: suppress anything with IoU > 0.5 against a kept box.',
            stack: [
              { name: 'A', value: '0.95' },
              { name: 'B', value: '0.88' },
              { name: 'C', value: '0.71' },
              { name: 'D', value: '0.62' },
              { name: 'E', value: '0.55' },
            ],
            heap: [{ id: 'out', value: 'nothing kept yet', label: 'output' }],
          },
          {
            note: 'Step 3: pop the highest-confidence box. A (0.95) is a final detection — no later box can remove it.',
            stack: [
              { name: 'B', value: '0.88' },
              { name: 'C', value: '0.71' },
              { name: 'D', value: '0.62' },
              { name: 'E', value: '0.55' },
            ],
            heap: [{ id: 'A', value: 'A  score 0.95', label: 'KEPT' }],
          },
          {
            note: 'Step 4: compare each survivor against A. IoU(A, B) = 0.78 > 0.5 — B is the same cat, drawn slightly differently. Struck off.',
            stack: [
              { name: 'B', value: '0.88', to: 'A', danger: true },
              { name: 'C', value: '0.71' },
              { name: 'D', value: '0.62' },
              { name: 'E', value: '0.55' },
            ],
            heap: [{ id: 'A', value: 'A  score 0.95', label: 'KEPT' }],
          },
          {
            note: 'IoU(A, C) = 0.69 > 0.5 — the same cat a third time. Struck off. B has now left the list (dashed).',
            stack: [
              { name: 'C', value: '0.71', to: 'A', danger: true },
              { name: 'D', value: '0.62' },
              { name: 'E', value: '0.55' },
            ],
            heap: [
              { id: 'A', value: 'A  score 0.95', label: 'KEPT' },
              { id: 'B', value: 'B  IoU 0.78', freed: true },
            ],
          },
          {
            note: 'IoU(A, D) = 0.00 and IoU(A, E) = 0.00 — different cat, no overlap at all. Both survive this sweep untouched.',
            stack: [
              { name: 'D', value: '0.62' },
              { name: 'E', value: '0.55' },
            ],
            heap: [
              { id: 'A', value: 'A  score 0.95', label: 'KEPT' },
              { id: 'B', value: 'B  IoU 0.78', freed: true },
              { id: 'C', value: 'C  IoU 0.69', freed: true },
            ],
          },
          {
            note: 'The list is not empty, so step 5 loops: pop the new highest, D (0.62). Second final detection.',
            stack: [{ name: 'E', value: '0.55' }],
            heap: [
              { id: 'A', value: 'A  score 0.95', label: 'KEPT' },
              { id: 'B', value: 'B  IoU 0.78', freed: true },
              { id: 'C', value: 'C  IoU 0.69', freed: true },
              { id: 'D', value: 'D  score 0.62', label: 'KEPT' },
            ],
          },
          {
            note: 'IoU(D, E) = 0.74 > 0.5 — E is a duplicate of D. Struck off, and the candidate list is now empty.',
            stack: [{ name: 'E', value: '0.55', to: 'D', danger: true }],
            heap: [
              { id: 'A', value: 'A  score 0.95', label: 'KEPT' },
              { id: 'B', value: 'B  IoU 0.78', freed: true },
              { id: 'C', value: 'C  IoU 0.69', freed: true },
              { id: 'D', value: 'D  score 0.62', label: 'KEPT' },
            ],
          },
          {
            note: 'Five boxes in, two detections out. Now the failure case: if E had been a SECOND real cat sitting against D at IoU 0.74, this exact rule would have deleted a correct detection. NMS cannot tell duplicate from crowd.',
            stack: [],
            heap: [
              { id: 'A', value: 'A  score 0.95', label: 'KEPT' },
              { id: 'B', value: 'B  IoU 0.78', freed: true },
              { id: 'C', value: 'C  IoU 0.69', freed: true },
              { id: 'D', value: 'D  score 0.62', label: 'KEPT' },
              { id: 'E', value: 'E  IoU 0.74', freed: true },
            ],
          },
        ],
      },
    },
    {
      type: 'note',
      md: `**The failure case, stated plainly.** NMS assumes overlap means duplication. In a crowd — people at a concert, cells under a microscope, cars in dense traffic — two genuinely different objects can overlap at IoU 0.7, and NMS deletes the lower-confidence one. You cannot fix this by raising the threshold alone: a loose threshold keeps the real second object but also keeps every duplicate. The real mitigations: **Soft-NMS** (decay a neighbour's confidence in proportion to its IoU instead of deleting it outright), **class-wise NMS** (never let a box suppress a box of a different class — a person standing in front of a car should not delete the car), and set-prediction models like DETR that need no suppression at all. Two other practical notes: NMS is a serial, per-image loop, so on huge candidate counts it can become the latency bottleneck at inference; and because it runs after the model, changing its threshold changes your precision/recall balance without retraining anything.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'IoU and NMS in NumPy — the whole algorithm is 15 lines',
      code: `import numpy as np

def iou(a, b):
    x1, y1 = max(a[0], b[0]), max(a[1], b[1])   # top-left of the overlap
    x2, y2 = min(a[2], b[2]), min(a[3], b[3])   # bottom-right of the overlap
    inter = max(0, x2 - x1) * max(0, y2 - y1)   # 0 when the boxes miss entirely
    area_a = (a[2] - a[0]) * (a[3] - a[1])
    area_b = (b[2] - b[0]) * (b[3] - b[1])
    return inter / (area_a + area_b - inter)    # union = sum of areas - overlap

def nms(boxes, scores, thresh=0.5):
    order = list(np.argsort(scores)[::-1])      # box indices, best score first
    keep = []
    while order:
        i = order.pop(0)                        # 1. take the best box still alive
        keep.append(int(i))
        survivors = []
        for j in order:                         # 2. judge every rival against it
            ov = iou(boxes[i], boxes[j])
            verdict = 'suppress' if ov > thresh else 'survives'
            print(f'   IoU(box{i}, box{j}) = {ov:.2f} -> {verdict}')
            if ov <= thresh:
                survivors.append(j)
        order = survivors                       # 3. the overlappers are deleted
    return keep

print('IoU sanity check:', round(iou([0, 0, 10, 10], [5, 0, 15, 10]), 3))

boxes = np.array([
    [100, 100, 220, 260],   # 0: cat A
    [108, 112, 214, 268],   # 1: cat A again, shifted
    [ 92, 120, 208, 250],   # 2: cat A again, wider
    [300, 140, 400, 280],   # 3: cat B
    [312, 150, 404, 272],   # 4: cat B again
])
scores = np.array([0.95, 0.88, 0.71, 0.62, 0.55])
print('NMS at threshold 0.5:')
print('kept ->', nms(boxes, scores, 0.5))

# The failure case: two REAL cats that genuinely overlap on screen.
hugging = np.array([[100, 100, 220, 260], [120, 110, 240, 270]])
print('IoU of the two real cats:', round(iou(hugging[0], hugging[1]), 2))
print('NMS at threshold 0.5:')
print('kept ->', nms(hugging, np.array([0.91, 0.84]), 0.5))

# ---- real output ----
# IoU sanity check: 0.333
# NMS at threshold 0.5:
#    IoU(box0, box1) = 0.78 -> suppress
#    IoU(box0, box2) = 0.69 -> suppress
#    IoU(box0, box3) = 0.00 -> survives
#    IoU(box0, box4) = 0.00 -> survives
#    IoU(box3, box4) = 0.74 -> suppress
# kept -> [0, 3]
# IoU of the two real cats: 0.64
# NMS at threshold 0.5:
#    IoU(box0, box1) = 0.64 -> suppress
# kept -> [0]`,
      annotations: {
        6: 'The max(0, ...) clamp is the line people forget. Without it, non-overlapping boxes produce a negative width times a negative height = a positive fake intersection.',
        9: 'Union = area_a + area_b - intersection. Adding the areas double-counts the overlap, so subtract it back once.',
        12: 'Sorting by confidence IS the algorithm. "Non-maximum suppression" only means anything once the list is ordered.',
        15: 'Popped = accepted forever. A kept box is never re-examined, which is why one wrong high-confidence box poisons everything it overlaps.',
        24: 'The deletion step: survivors becomes the new list. O(n^2) in the worst case — fine after a confidence floor, a real latency cost without one.',
        27: 'The textbook pair: two 10x10 boxes overlapping in half. Intersection 50, union 150, IoU 0.333. Verified by the run.',
        42: '0.64 between two DIFFERENT cats standing close. NMS cannot see that they are different, so it deletes the second one — the crowd failure, reproduced in two lines.',
      },
    },
    {
      type: 'note',
      md: `**Evaluation, in one line:** detectors are scored by **mAP** — mean average precision, the area under the precision-recall curve per class, averaged over classes, and in COCO convention averaged again over ten IoU thresholds from 0.50 to 0.95 (written mAP@[.5:.95]). Full derivation, plus why a paper's 0.35 and your 0.58 may be the same model, is in the Metrics subject module *GenAI & Vision Metrics*.`,
    },
    {
      type: 'intuition',
      title: 'Segmentation: classification, run once per pixel',
      md: `Detection gives you a rectangle. Ask "what percentage of this field is diseased?" and a rectangle is useless — you need area, which means pixels.

- **Semantic segmentation** = assign a class to every pixel. Output is a map the same height and width as the input, one channel per class.
- Naive approach: crop a patch around every pixel and classify it. For a 512×512 image that is 262,144 forward passes. Dead on arrival.
- The **fully-convolutional** insight: a CNN already computes a spatial grid of features. Replace the final dense classifier with a 1×1 convolution and the network outputs a *map* of class scores in one pass.
- Problem: pooling and strided convs shrank that map by 32× on the way down. A 512×512 image becomes a 16×16 grid of predictions — correct classes, hopeless resolution.
- So the network needs a second half that puts the resolution back. That is the **encoder-decoder** shape, and it is the skeleton of every segmentation model.`,
    },
    {
      type: 'math',
      intro: 'Shapes, because segmentation is easiest to reason about through them.',
      latex: [
        '\\text{input } 3 \\times H \\times W \\;\\xrightarrow{\\text{encoder}}\\; C_{\\text{deep}} \\times \\tfrac{H}{32} \\times \\tfrac{W}{32} \\;\\xrightarrow{\\text{decoder}}\\; K \\times H \\times W',
        '512 \\times 512 \\text{ input, } K = 20 \\text{ classes} \\;\\Rightarrow\\; 262{,}144 \\text{ pixel decisions}, \\;\\; 262{,}144 \\times 20 = 5{,}242{,}880 \\text{ logits per image}',
        '\\text{loss} = \\frac{1}{HW}\\sum_{p=1}^{HW} \\text{CE}\\big(\\hat{y}_p,\\, y_p\\big) \\quad \\text{— ordinary cross-entropy, averaged over pixels.}',
      ],
    },
    {
      type: 'intuition',
      title: 'U-Net: the skip connections are the whole point',
      md: `U-Net is drawn as a U: down the left side, across the bottom, up the right side. Three parts, and only the third is interesting.

- **Contracting path (left)**: normal CNN. Convolutions and pooling shrink space and grow channels. It answers *what* is in the image — the semantics.
- **Bottleneck (bottom)**: maximum context, minimum resolution. It knows "cat" but has forgotten exactly where the whisker ended.
- **Expanding path (right)**: upsample step by step back to full resolution.
- **Skip connections (the horizontal arrows)**: at every level, the encoder's feature map is concatenated onto the decoder's map of the same size. This hands fine, high-resolution detail — edges, thin structures, exact boundaries — directly across the U, bypassing the bottleneck.
- Remove the skips and the model still finds the object, but the mask comes out **blurry and rounded**: the bottleneck destroyed the spatial precision, and no amount of upsampling can invent it back. Upsampling stretches information; it does not recreate it.
- One sentence for the interview: *"The encoder knows what, the skip connections remember where, and the decoder combines them."*`,
    },
    {
      type: 'note',
      md: `**Two ways to go back up.** A **transposed convolution** (a.k.a. deconvolution, wrongly) inserts zeros between input pixels and convolves — the upsampling filter is *learned*, which is more expressive but famously produces **checkerboard artifacts** when the kernel size is not divisible by the stride. The alternative is dumb-and-safe: **bilinear upsampling followed by an ordinary 3×3 convolution** — fixed interpolation, then a learned refinement. Same output shape, no checkerboarding, and it is what most modern segmentation code does by default. If you see a grid pattern in your masks, this is the first thing to swap. (Note the U-Net paper's original network used unpadded convolutions, so a 572×572 input produced a 388×388 output; modern implementations pad so output shape equals input shape.)`,
    },
    {
      type: 'note',
      md: `**Loss for segmentation.** Per-pixel cross-entropy is the default and works when classes are roughly balanced. When the target is a thin or tiny structure — a road crack, a tumour, a wire — a model that predicts "background everywhere" already scores 99% pixel accuracy, so cross-entropy has almost nothing to push against. That is why segmentation uses **Dice loss** and **soft-IoU loss**: differentiable relaxations of the overlap metrics themselves, which are computed only over the region that matters and therefore ignore the ocean of true negatives. Common practice is the sum of the two — cross-entropy for stable per-pixel gradients, Dice for shape-level overlap. Both metrics and both losses are derived in the Metrics subject (*GenAI & Vision Metrics* for IoU and Dice, *Classification Losses* for the loss forms).`,
    },
    {
      type: 'intuition',
      title: 'The imbalance that runs underneath all of this',
      md: `Detection and segmentation are both **dense prediction**: thousands of predictions per image, almost all of them background. That is one problem, not two.

- Detection: 8400 candidate boxes, maybe 5 real objects. A RetinaNet-style head scores on the order of 100k anchors per image.
- Segmentation: 262,144 pixels, maybe 3% of them the class you care about.
- Cross-entropy averages over all of them, so the gradient signal is dominated by easy background examples that the model already gets right with 0.99 confidence.
- Individually those cost almost nothing — collectively they drown the handful of hard positives that carry the actual learning.
- **Focal loss** was invented for exactly this: multiply each example's cross-entropy by (1 − p)^γ, so a confidently-correct background pixel contributes ~100× less than a confused one. The rare hard examples get the microphone back.
- Older fixes worth naming: hard negative mining (SSD kept a 3:1 negative:positive ratio by hand) and balanced anchor sampling in the Faster R-CNN RPN. Focal loss replaced the heuristic with a smooth function. Full derivation in Metrics, *Classification Losses*.`,
    },
    {
      type: 'intuition',
      title: 'Instance segmentation: detection and segmentation, stapled together',
      md: `Semantic segmentation says "these 40,000 pixels are cat". Count the cats from that and you get 1, no matter how many are on the sofa. Instance segmentation fixes the counting.

- **Mask R-CNN** is the canonical design and it is honestly simple: take Faster R-CNN, and add a small fully-convolutional head that predicts a binary mask *inside each proposed box*.
- Detection already separated the instances; the mask head only has to answer "which pixels in this box belong to the object", one box at a time.
- Its one famous detail is **RoIAlign**: RoI pooling rounded feature coordinates to integers, which is invisible for classification but shifts masks by a pixel or two. Bilinear sampling instead of rounding fixed it, and the paper reported a large mask-accuracy gain from that one change.
- **Panoptic segmentation** in a line: every pixel gets both a class and an instance id — "things" (countable: cars, people) get instances, "stuff" (uncountable: sky, road) gets only a class.
- Keypoints reuse the same body: Mask R-CNN predicts pose by treating each of K joints as a one-hot mask over the box.`,
    },
    {
      type: 'intuition',
      title: 'Which task does your business question actually need?',
      md: `This is the part that decides the project, and the only honest driver is labelling cost.

- "Is there damage in this photo?" → **classification**. Roughly a second per image to label.
- "How many trucks entered the yard?" → **detection**. Someone must draw and verify a box around every truck in every frame: tens of seconds per object, and a missed object is a wrong label.
- "What fraction of this roof is damaged?" → **segmentation**. The Cityscapes authors reported over 1.5 hours per image for fine pixel-level annotation.
- Same photos, same team: the ladder from tag to box to mask is roughly an order of magnitude per rung, and it multiplies by the number of objects per image.
- So choosing detection when classification would answer the question does not cost you a bigger model — it costs you a labelling budget, an annotation tool, a QA process, and months.
- The honest senior move is to run the question backwards: what number does the business report, and what is the cheapest label that produces it?`,
    },
    {
      type: 'note',
      md: `Three shortcuts that keep the ladder affordable, worth naming in any design discussion. **Start one rung lower than you think**: ship a classifier on 2000 tagged images in a week, and let its confusion cases tell you whether you actually need boxes. **Weak and semi-supervised labels**: image-level tags can train rough detectors, boxes can seed masks (SAM-style promptable segmenters now turn one box into a usable mask in milliseconds, which has genuinely changed the cost of the top rung). **Count without detecting**: for dense counting — crowds, cells, seedlings — a density-map regressor trained on single dots per object beats a detector and costs one click per object to label. And if you must go up a rung, label a small set at the higher rung first and measure whether the extra precision moves the business metric at all.`,
    },
  ],
  quiz: [
    {
      question: 'Semantic segmentation is run on a photo of three cats sitting together. What does the output look like?',
      options: [
        {
          text: 'Three separate cat regions, each with its own id',
          explanation: 'That is INSTANCE segmentation. Semantic segmentation has no concept of identity.',
        },
        {
          text: 'One connected cat-coloured region — every cat pixel gets the same label, with no separation between the three',
          explanation: 'Correct. Semantic segmentation labels pixels by class only, so touching instances merge into one blob. This is precisely why you cannot count with it.',
        },
        {
          text: 'Three bounding boxes labelled cat',
          explanation: 'Boxes are detection output. Segmentation outputs a per-pixel map, not rectangles.',
        },
      ],
      correct: 1,
    },
    {
      question: 'What is the core reason NMS exists at all?',
      options: [
        {
          text: 'To make the model faster at inference',
          explanation: 'NMS ADDS work after the forward pass — it is a serial loop and can even be a latency bottleneck.',
        },
        {
          text: 'To convert box coordinates into the right format',
          explanation: 'Format conversion is unrelated. NMS only ever deletes boxes; it never rewrites them.',
        },
        {
          text: 'A detector emits thousands of fixed candidate boxes, so many of them fire on the same object — the duplicates must be removed or they count as false positives',
          explanation: 'Correct. Fixed-shape output means over-prediction by design; NMS is the cleanup that keeps one box per object.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Two boxes: A is x 0→10, y 0→10; B is x 5→15, y 0→10. IoU?',
      options: [
        {
          text: '0.33',
          explanation: 'Correct. Intersection = 5×10 = 50. Union = 100 + 100 − 50 = 150. 50/150 = 0.333 — the value the code section prints.',
        },
        { text: '0.5', explanation: 'That is intersection over A alone (50/100). The denominator must be the UNION, not one box.' },
        { text: '0.25', explanation: 'No natural pairing gives 0.25 here — check that the union subtracts the intersection exactly once.' },
      ],
      correct: 0,
    },
    {
      question: 'You remove the skip connections from a U-Net and retrain. What is the most likely symptom?',
      options: [
        { text: 'The model stops finding the objects entirely', explanation: 'The encoder still learns semantics — the model still locates objects, it just draws them badly.' },
        {
          text: 'Masks are roughly in the right place but blurry, with rounded corners and lost thin structures',
          explanation: 'Correct. The bottleneck destroyed spatial precision; without the skips carrying high-resolution detail across, upsampling can only stretch coarse information.',
        },
        { text: 'Training diverges to NaN', explanation: 'Skips help gradient flow, but their headline job in U-Net is transporting spatial detail, not numerical stability.' },
      ],
      correct: 1,
    },
    {
      question: 'What do anchor boxes actually change about what the network predicts?',
      options: [
        {
          text: 'The network predicts small offsets from predefined reference shapes instead of inventing box coordinates from scratch',
          explanation: 'Correct — and because each anchor is a sensible starting shape, the corrections are small and well-scaled, which makes the regression easy to train.',
        },
        { text: 'They fix the number of objects the model can find', explanation: 'Anchors set the number of CANDIDATES, not of detections — NMS and thresholds decide the final count.' },
        { text: 'They replace NMS', explanation: 'Anchors make duplicates MORE likely (several anchors fire on one object), so they increase the need for NMS.' },
      ],
      correct: 0,
    },
    {
      question: 'Your detector works well on street scenes but drops people in dense crowds. Which single change is most likely to help?',
      options: [
        { text: 'A deeper backbone', explanation: 'Capacity is rarely the issue when the missing objects are visible and overlapping — the losses happen after the model, in post-processing.' },
        { text: 'Lower the confidence threshold', explanation: 'The overlapping true detections are usually confident already; they were deleted by NMS, not filtered by confidence. This mostly adds noise.' },
        {
          text: 'Replace hard NMS with Soft-NMS (or raise the IoU threshold and accept more duplicates)',
          explanation: 'Correct. In crowds, two real people overlap above the IoU cutoff and NMS deletes the lower-confidence one. Soft-NMS decays the score by IoU instead of deleting outright.',
        },
      ],
      correct: 2,
    },
    {
      question: 'A one-stage detector on a 640×640 image with strides 8/16/32 emits 80² + 40² + 20² = 8400 candidate boxes for a photo containing 4 objects. What does this ratio explain?',
      options: [
        { text: 'Why detectors need large batch sizes', explanation: 'Batch size is a memory/optimization choice — it has nothing to do with the background:foreground ratio inside one image.' },
        {
          text: 'Why detection is fundamentally a class-imbalance problem — over 99.9% of predictions are background, which is what focal loss was invented to fix',
          explanation: 'Correct. Easy background dominates the averaged loss; focal loss down-weights confidently-correct examples so the few hard positives still drive learning.',
        },
        { text: 'Why anchor-free models are more accurate', explanation: 'The imbalance is essentially the same with or without anchors — anchor-free removes hyperparameters, not background.' },
      ],
      correct: 1,
    },
    {
      question: 'Faster R-CNN improved on Fast R-CNN mainly by…',
      options: [
        {
          text: 'Replacing the external selective-search proposal algorithm with a learned Region Proposal Network that shares the backbone features',
          explanation: 'Correct. Proposals became a conv head on the same feature map, so the whole detector trains end to end and the proposal stage stops being the bottleneck.',
        },
        { text: 'Running the CNN once instead of per region', explanation: 'That was FAST R-CNN\'s contribution (RoI pooling on a shared feature map), one paper earlier.' },
        { text: 'Removing the need for NMS', explanation: 'Faster R-CNN still needs NMS — twice, in fact: on proposals and on final detections. DETR is the model that removed it.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Walk me through the computer-vision task map and how you choose between the tasks.',
      answer:
        'Order them by spatial precision: classification (one label per image) → localization (one box) → detection (many boxes with classes and confidences) → semantic segmentation (a class per pixel, instances merged) → instance segmentation (class per pixel plus identity) → keypoints (named points per instance). Then flip to the decision rule, which is what they are really asking: the task is chosen by the business question and paid for in labelling. Tagging is about a second per image; boxes are tens of seconds per object; fine pixel masks were reported at over 1.5 hours per image on Cityscapes. So: counting objects needs detection, measuring area needs segmentation, and a yes/no needs classification — pick the lowest rung that answers the question, because each rung up is roughly an order of magnitude of annotation cost.',
      isCaseBased: false,
    },
    {
      question: 'Explain NMS step by step, then tell me when it fails.',
      answer:
        'Steps: (1) drop boxes below a confidence floor; (2) sort the rest by confidence descending; (3) take the top box and accept it as a final detection; (4) compute IoU between it and every remaining box, deleting all above the IoU threshold, typically 0.5–0.7; (5) repeat with the survivors until the list is empty. Usually run per class, so a box never suppresses a different class. The failure: it assumes overlap implies duplication. In crowds — concert photos, dense traffic, cells — two genuinely distinct objects overlap above the threshold and the lower-confidence one is deleted, and you cannot tune your way out because a looser threshold readmits every duplicate. Mitigations: Soft-NMS decays neighbours\' scores by IoU instead of deleting them; class-wise NMS; and set-prediction models like DETR that match predictions one-to-one at training time and need no suppression at all. Worth adding that NMS is post-processing, so its threshold moves precision/recall with no retraining.',
      isCaseBased: false,
    },
    {
      question: 'Two-stage versus one-stage detectors — the real tradeoff, and is the classic answer still true?',
      answer:
        'Two-stage (R-CNN family) proposes regions first, then classifies and refines each one; the second stage sees a cropped, aligned feature region, which historically bought better localization and better small-object accuracy at a heavy latency cost. One-stage (YOLO, SSD, RetinaNet) predicts boxes, objectness, and classes directly off a feature grid in a single pass, which is what makes real-time video feasible. The honest update: the accuracy gap has largely closed. Focal loss removed the main reason one-stage lagged (background imbalance), and modern anchor-free YOLO variants match or beat two-stage models on COCO at a fraction of the latency. Where two-stage still tends to win is high-precision localization on unusual aspect ratios and instance segmentation via Mask R-CNN. Saying "two-stage is accurate, one-stage is fast" without that update dates you.',
      isCaseBased: false,
    },
    {
      question: 'Case: your defect detector reports mAP 0.72 offline, but the factory team says it "misses defects constantly". Debug it.',
      answer:
        'First, stop trusting the single number and find the disagreement. (1) Threshold mismatch: mAP integrates over all confidences, but production runs at one fixed confidence — plot precision and recall against threshold and check what recall you actually ship at. (2) Metric convention: mAP@0.5 versus mAP@[.5:.95] are different numbers; also check whether the offline score is dominated by one easy class while the rare critical defect class has AP 0.2 — per-class AP, always. (3) NMS: if defects cluster or overlap, hard NMS may be deleting real ones; test with a higher IoU threshold or Soft-NMS. (4) Distribution shift: new lighting, a new camera, a new product line — compare the production image statistics against training data and check whether "misses" concentrate on recent batches. (5) Definition mismatch: the operator counts a missed defect per PART, the metric counts per BOX — a 90% box recall can be a 40% part-level pass rate. Fix by evaluating on the unit the business uses. That last one is the most common and the least technical.',
      isCaseBased: true,
    },
    {
      question: 'Why does U-Net need skip connections, and what specifically breaks without them?',
      answer:
        'The encoder downsamples to build semantics; by the bottleneck the feature map may be 32× smaller than the input, so it knows "cat" but has lost exactly where the boundary was. Downsampling is a lossy, irreversible operation — the decoder cannot recover detail that no longer exists in the tensor. Skips concatenate the encoder feature map onto the decoder feature map at each matching resolution, delivering high-frequency detail around the bottleneck rather than through it. Without them you get masks in roughly the right place but blurry, with rounded corners, thin structures dropped, and boundaries a few pixels off — which is fatal for the applications that chose segmentation in the first place (medical structures, cracks, wires). Secondary benefit worth mentioning: skips also shorten the gradient path, so the deep U trains more easily.',
      isCaseBased: false,
    },
    {
      question: 'Explain anchor boxes to someone who has only trained classifiers. Then explain why the field is moving away from them.',
      answer:
        'Anchors are predefined box shapes — a few aspect ratios at a few scales — tiled at every feature-map location. The network does not output a box; it outputs which anchor is responsible and a small offset from it (shift the centre, scale the width and height). It is the difference between "draw a box" and "adjust this box a little", and the second is a far easier regression: the targets are small, centred, and comparable across object sizes. During training, an anchor is a positive example if its IoU with a ground-truth box clears a threshold. The move away: anchors bring a pile of dataset-specific hyperparameters (count, ratios, scales, matching thresholds), they create a large positive/negative imbalance, and they need re-tuning whenever object shapes change. Anchor-free heads (FCOS, CenterNet, YOLOX) predict distances from each location to the object\'s four edges, or a centre point plus a size — fewer knobs, equal accuracy. DETR goes further and predicts a fixed set of objects directly, dropping both anchors and NMS.',
      isCaseBased: false,
    },
    {
      question: 'Case: a client wants to know "what percentage of each field is affected by blight" from drone imagery. They ask for object detection because their previous vendor used it. How do you respond?',
      answer:
        'Detection is the wrong tool for the stated question, and the reason is the answer\'s unit. They want AREA, and a box measures the area of a rectangle, not of an irregular blighted patch — on ragged organic shapes a box can overstate area by a large and unpredictable factor, and overlapping patches double-count. Semantic segmentation gives area directly: count the blight pixels, multiply by the ground sample distance. Note also that they do not need instance segmentation — blight is "stuff", not countable "things", so no instance separation is needed, which keeps it cheaper. Then be honest about the cost: pixel masks are the most expensive labels there are, so I would propose staging it — label a few hundred images with a promptable segmenter (SAM-style) plus human correction rather than from-scratch polygons, validate against a handful of ground-truthed fields, and check whether coarse patch-level classification on a grid already answers the question at a tenth of the cost. Ending on "here is the cheapest thing that answers the question" is what makes it a consulting answer rather than a modelling one.',
      isCaseBased: true,
    },
    {
      question: 'Why is class imbalance a bigger deal in detection and segmentation than in ordinary classification, and what do you do about it?',
      answer:
        'Because both are dense prediction: one image produces thousands to hundreds of thousands of predictions, and nearly all are background. A one-stage head can emit 8400 boxes for an image with four objects; RetinaNet-scale heads score on the order of 100k anchors; a 512×512 segmentation makes 262,144 pixel decisions. Averaged cross-entropy then lets a mass of easy, confidently-correct background examples dominate the gradient, and the handful of hard positives that carry the learning are drowned. Fixes, oldest to newest: hard negative mining (SSD fixed a 3:1 negative:positive ratio), balanced sampling in the RPN, class weighting, and focal loss — scaling each example\'s loss by (1−p)^γ so easy examples contribute far less, which is the single change that let one-stage detectors match two-stage accuracy. On the segmentation side, Dice and soft-IoU losses sidestep the issue structurally by scoring overlap rather than averaging over every pixel, and are usually summed with cross-entropy.',
      isCaseBased: false,
    },
    {
      question: 'How do detection and segmentation combine into instance segmentation? Describe Mask R-CNN.',
      answer:
        'Mask R-CNN = Faster R-CNN plus a third head. Faster R-CNN already produces, per proposal, a class and a refined box; Mask R-CNN adds a small fully-convolutional branch that outputs a binary mask for each RoI, one mask per class, with the class head selecting which mask to use. Because the detector separated instances first, the mask head solves a much easier local problem: "which pixels inside this box belong to the object". The important detail is RoIAlign: RoI pooling quantised feature coordinates to integer bins, which classification tolerates but masks do not — misalignment of a pixel or two visibly wrecks a mask. RoIAlign uses bilinear sampling with no rounding, and the paper attributes a large mask-accuracy gain to that change alone. Good extras: the three losses are summed (class, box, mask), the mask loss is per-class binary cross-entropy so classes do not compete, and panoptic segmentation is the generalization where "things" get instances and "stuff" gets only a class.',
      isCaseBased: false,
    },
    {
      question: 'Case: a real-time detector must run on an edge device at 30 FPS but currently runs at 11 FPS. The team proposes a smaller backbone. What else would you check first?',
      answer:
        'Smaller backbone is the blunt instrument that costs accuracy, so profile before cutting. (1) Where is the time actually going — backbone, head, NMS, or pre/post-processing? NMS is a serial per-image loop and blows up with candidate count; a stricter confidence floor before NMS, or a batched/class-agnostic GPU NMS, can be a large free win. (2) Input resolution: latency scales roughly with pixel count, so 640→512 is about a 36% reduction in the backbone cost and often costs less accuracy than swapping architectures. (3) Precision: FP16 or INT8 quantisation typically gives 2–3× on edge accelerators with small accuracy loss, and is reversible if it hurts. (4) Is the model even using the accelerator — check for unsupported ops silently falling back to CPU, and for data-loading or JPEG-decode time being counted as inference. (5) Do you need every frame? Detect on every third frame and track in between; tracking is far cheaper than detection. Only after those would I distil into a smaller backbone — and then I would measure the accuracy cost against the business metric, not mAP alone.',
      isCaseBased: true,
    },
    {
      question: 'IoU shows up in three different places in a detection pipeline. Name them and say why the thresholds differ.',
      answer:
        'One: anchor/label assignment during training — an anchor with IoU above about 0.5–0.7 against a ground-truth box becomes a positive example, below about 0.3 a negative, and the band between is often ignored to avoid ambiguous supervision. Two: NMS at inference — boxes overlapping a kept box above about 0.5–0.7 are deleted as duplicates. Three: evaluation — a prediction matched to an unmatched ground-truth box above the IoU threshold counts as a TP, and COCO averages over ten thresholds from 0.5 to 0.95 rather than trusting one. They differ because they optimise different things: assignment trades supervision density against label noise, NMS trades duplicate removal against crowd deletion, and evaluation is picking a convention for how strict "correct" should be. A candidate who says "IoU threshold is 0.5" without asking which of the three is being discussed has revealed something.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'The CV task ladder', back: 'Classification (label) → localization (one box) → detection (many boxes) → semantic seg (class per pixel) → instance seg (class + identity per pixel) → keypoints. Each rung = more spatial precision, ~10× more labelling.' },
    { front: 'Semantic vs instance segmentation', back: 'Semantic: three cats become one cat-coloured blob. Instance: cat #1, cat #2, cat #3 as separate pixel sets. Only instance can count.' },
    { front: 'Why detection needs NMS at all', back: 'Fixed-shape output forces the model to emit thousands of candidates; many fire on the same object. NMS keeps the local confidence maximum and deletes its overlapping neighbours.' },
    { front: 'NMS in five steps', back: 'Confidence floor → sort desc → take top box as final → delete all boxes with IoU > threshold against it → repeat until the list is empty. Usually per class.' },
    { front: 'NMS failure case + fix', back: 'Two genuinely overlapping objects in a crowd: the lower-confidence real detection is deleted. Fix: Soft-NMS (decay scores by IoU), class-wise NMS, or DETR-style set prediction (no NMS).' },
    { front: 'IoU', back: 'Intersection area ÷ union area. Union = |A| + |B| − |A∩B|. Used three times: anchor assignment, NMS, TP/FP matching at evaluation.' },
    { front: 'Anchor boxes', back: 'Predefined box shapes tiled at each location; the network predicts which anchor is responsible plus a small offset, instead of regressing coordinates from nothing. Anchor-free heads (FCOS, YOLOX) predict edge distances instead.' },
    { front: 'Two-stage vs one-stage', back: 'Two-stage: propose then classify (R-CNN → Fast → Faster with the RPN). One-stage: grid cells predict boxes + class + objectness in a single pass (YOLO, SSD, RetinaNet). The accuracy gap has largely closed.' },
    { front: 'U-Net skip connections', back: 'Encoder feature maps concatenated into the decoder at matching resolutions. They carry fine spatial detail around the bottleneck — without them masks are blurry with rounded corners.' },
    { front: 'Dense prediction imbalance', back: '8400 boxes / 262k pixels per image, nearly all background. Easy negatives dominate cross-entropy → focal loss (1−p)^γ, hard negative mining, or Dice/soft-IoU loss.' },
  ],
  mindmapMarkdown: `- The CV Task Map: Detection & Segmentation
  - Task ladder (spatial precision)
    - Classification: one label
    - Localization: one box
    - Detection: many boxes + classes
    - Semantic seg: class per pixel, blobs merge
    - Instance seg: class + identity per pixel
    - Keypoints / pose: named points
  - Why detection is hard
    - Variable number of outputs
    - Fix: predict many candidates, throw most away
    - Needs objectness + NMS
  - Two-stage family
    - R-CNN: 2000 crops, 2000 forward passes
    - Fast R-CNN: one backbone pass, RoI pooling
    - Faster R-CNN: learned RPN, end to end
  - One-stage family
    - S×S grid, boxes + objectness + classes
    - Single forward pass → video speed
    - SSD (multi-scale), RetinaNet (focal loss)
    - 7×7×30 = 1470 (YOLOv1)
  - Anchors
    - Predefined shapes, predict offsets
    - IoU decides which anchor is responsible
    - Anchor-free trend: FCOS, YOLOX, DETR
  - IoU
    - Overlap ÷ union
    - Used for assignment, NMS, evaluation
    - mAP = the detection metric (see Metrics)
  - NMS
    - Sort by confidence, keep max, delete overlaps
    - Threshold 0.5–0.7, per class
    - Fails on crowds → Soft-NMS, DETR
  - Segmentation
    - Encoder-decoder shape
    - U-Net: contract, bottleneck, expand
    - Skip connections carry detail → sharp masks
    - Transposed conv vs upsample + conv
    - Dice / soft-IoU loss (see Metrics)
  - Instance segmentation
    - Mask R-CNN = Faster R-CNN + mask head
    - RoIAlign, no coordinate rounding
    - Panoptic: things vs stuff
  - Class imbalance
    - Most anchors/pixels are background
    - Focal loss, hard negative mining
  - Choosing the task
    - Tag ≈ 1s, box ≈ tens of s, mask ≈ hours
    - Counting vs area vs yes/no
    - Labelling cost is the real driver`,
}

export default m
