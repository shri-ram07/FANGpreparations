import type { Module } from '../types'

const m: Module = {
  id: 'dl-l2-cv-tasks',
  subjectId: 'dl',
  level: 2,
  title: 'The CV Task Map: Detection & Segmentation',
  whyItMatters:
    'People say "we want a computer-vision model" as if that were one thing. It is at least five different things, and they differ in exactly one way that matters: what numbers the model prints out at the end. This module takes one photo, asks five questions about it, and writes down the answer shape for each. Then it builds the two mechanics every detector needs — a way to measure how much two boxes overlap, and a rule for deleting duplicate boxes — with real coordinates and a hand-run of the algorithm.',
  assumes: [
    'You have read *CNNs: Convolution, Pooling & Receptive Fields* — you know that a convolutional network takes an image and produces numbers',
    'You have seen a Python list, a for loop, an if statement, and a function definition',
    'You have read *Vision Metrics: IoU and mAP*, or are willing to take one formula from it on trust. IoU is defined there; here we only use it',
    'School arithmetic: rectangle area is width times height',
  ],
  estMinutes: 38,
  sections: [
    {
      type: 'intuition',
      title: 'One photo, five questions, five different answer shapes',
      md: `Picture one photo. Two cats on a sofa: a ginger cat on the left, a grey cat on the right, plus a cushion and a floor lamp. That single photo can be fed to five different kinds of model. They differ in what comes out.

- **Classification** — "is there a cat in this photo?" Output: **one label for the whole image**. Literally one word, plus a number saying how sure the model is. It says nothing about where.
- **Localisation** — "where is the cat?" Output: **one label and one rectangle**. Four numbers describe the rectangle. This task assumes there is exactly one object worth finding.
- **Object detection** — "where is every object?" Output: **a list of rows**, one row per object found. Each row is a rectangle, a label, and a number saying how sure the model is. Here: three or four rows.
- **Semantic segmentation** — "which pixels are cat?" Output: **one label for every single pixel**. If the photo is 512 by 512, that is 262,144 labels. Both cats come out labelled "cat", so they merge into one cat-coloured region.
- **Instance segmentation** — "which pixels are the ginger cat?" Output: **a label per pixel, plus an object number per pixel**. Now the ginger cat is object 1 and the grey cat is object 2, and you can count them.

That is the real difference, and it is the only one worth memorising: the shape of what the model prints.`,
    },
    {
      type: 'note',
      md: `A quick consequence of that list. You cannot count objects with semantic segmentation, because touching objects of the same class become one region — three cats sitting together produce one blob, and one blob is not three. And you cannot measure area with detection, because a rectangle around an irregular shape includes a lot that is not the shape. If the business question is "how many", you need detection or instance segmentation. If it is "what fraction of the image", you need segmentation.`,
    },
    {
      type: 'intuition',
      title: 'The words, defined once',
      md: `Everything below uses these. Each is defined here and nowhere else.

- **Bounding box** — the rectangle a detector draws around an object. Written as four numbers. The convention used throughout this module and in most code is **(x1, y1, x2, y2)**: the x and y of the top-left corner, then the x and y of the bottom-right corner, measured in pixels from the top-left of the image. So [100, 100, 220, 260] is a box 120 pixels wide and 160 pixels tall. The other common convention is (centre-x, centre-y, width, height); libraries disagree, so always check which one you are holding.
- **Class label** — which of the known categories the thing is. "cat", "cushion", "lamp". A model trained on 80 categories can only ever say one of those 80.
- **Confidence score** — a number from 0 to 1 that the model prints next to each box, meaning roughly "how sure I am that there is a real object here and that it is this class". 0.95 means very sure. It is the model\'s own opinion, not a measured probability, and it is what you sort and threshold on.
- **Mask** — the segmentation equivalent of a box: a grid the same height and width as the image, holding one label per pixel. A binary mask holds 1 where the object is and 0 everywhere else.
- **Backbone** — the convolutional network that turns the raw image into a grid of features. It is the bottom two-thirds of every vision model, and it is the same in a classifier, a detector and a segmenter.
- **Head** — the small piece bolted on top of the backbone that turns those features into the actual answer. A classification head prints one label; a detection head prints boxes and scores; a segmentation head prints a mask. Same backbone, different head, different task.`,
    },
    {
      type: 'intuition',
      title: 'Why detection is harder than classification: the output has no fixed size',
      md: `A classifier has an easy job. 80 categories in, 80 numbers out, always, for every image. A neural network is very good at that, because the shape of its output is fixed when you build it.

- A detector must print a **list whose length changes with the picture**. This photo has 2 cats; the next has 47 people; the next has nothing at all.
- A network cannot print "however many rows I feel like". Its output has a fixed shape, decided before training starts.
- So every detector plays the same trick: **print a big fixed number of candidate boxes — often several thousand — give each one a confidence score, and then throw nearly all of them away.**
- Throwing them away happens in two steps. First, delete every box whose confidence is below a floor, say 0.25. That kills the overwhelming majority immediately, because most candidates sit on empty sofa.
- Second, delete the duplicates. Several candidates land on the same cat, each shifted slightly, each fairly confident. That second step is **non-max suppression**, and it is the rest of this module.
- **Anchor** — a fixed reference rectangle the model starts from. At every position on the feature grid, a few anchor shapes are pre-placed: a tall one, a wide one, a square one, at two or three sizes. The model never invents a box from nothing; it picks an anchor and predicts a small correction to it (shift the centre a bit, scale the width a bit). Correcting a rough rectangle is a much easier thing to learn than conjuring four pixel coordinates. Anchors are also where the thousands of candidates come from: 13 by 13 positions with 5 anchors each is 845 candidate boxes.`,
    },
    {
      type: 'note',
      md: `**One-stage and two-stage detectors, in two sentences.** A **two-stage detector** does the job twice: a first network head scans the feature grid and proposes a few hundred regions that might contain something, then a second head looks at each proposal properly and outputs its class and a refined box. A **one-stage detector** skips the proposal step entirely: every position on the feature grid directly prints boxes, scores and classes in a single pass, which is faster because the image goes through the network once. **Faster R-CNN** is the standard two-stage design. **YOLO** is the standard one-stage design. The old summary "two-stage is accurate, one-stage is fast" was true in 2016 and has largely stopped being true; both families need the duplicate-deletion step below.`,
    },
    {
      type: 'intuition',
      title: 'Measuring overlap: borrow IoU, do not rebuild it',
      md: `To delete duplicates we need to answer "are these two boxes on the same object?" Boxes never line up pixel-perfectly, so the answer has to be a number, not a yes/no. That number is **IoU**, intersection over union: the area where the two rectangles overlap, divided by the area they cover between them.

- IoU is 1 when the boxes are identical, 0 when they do not touch at all, and around 0.5 when they are clearly on the same thing but drawn differently.
- Why divide by the union and not just report the overlap area? Because a model could then cheat by drawing one enormous box over the whole image, which overlaps everything. Dividing by the combined area punishes that.
- **IoU is taught in full in the Metrics subject, in the module *Vision Metrics: IoU and mAP*** — how it is derived, why the union is the honest denominator, and how it turns predictions into correct and incorrect counts. Read it there. Here we take the formula and use it as a tool.
- The formula we borrow: IoU = intersection area / (area of A + area of B − intersection area). The subtraction is there because adding the two areas counts the shared part twice.
- The same IoU number gets used at three separate moments in a detector, with three separately-tuned cut-offs: deciding which anchor is responsible for an object during training, deleting duplicates at prediction time, and scoring the finished model. Same formula, different thresholds.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 1: IoU of two boxes, plain lists, no libraries',
      code: `def iou(a, b):
    x1 = max(a[0], b[0])
    y1 = max(a[1], b[1])
    x2 = min(a[2], b[2])
    y2 = min(a[3], b[3])
    w = max(0, x2 - x1)
    h = max(0, y2 - y1)
    inter = w * h
    area_a = (a[2] - a[0]) * (a[3] - a[1])
    area_b = (b[2] - b[0]) * (b[3] - b[1])
    return inter / (area_a + area_b - inter)

print(round(iou([100, 100, 220, 260], [108, 112, 214, 268]), 2))
print(round(iou([100, 100, 220, 260], [300, 140, 400, 280]), 2))

# ---- real output ----
# 0.78
# 0.0`,
      annotations: {
        1: 'Defines a function taking two boxes. Each box is a plain Python list of four numbers in (x1, y1, x2, y2) order: left, top, right, bottom.',
        2: 'The overlap rectangle starts wherever the rightmost left-edge is, so take the larger of the two x1 values. a[0] is the first item of list a.',
        3: 'Same for the top edge: the overlap starts at the lower of the two tops, which in these coordinates is the larger y1.',
        4: 'The overlap ends at the smaller of the two right edges, so take the min of the x2 values.',
        5: 'And at the smaller of the two bottom edges. Lines 2 to 5 give the overlap rectangle its own four coordinates.',
        6: 'Width of the overlap. The max(0, ...) matters: if the boxes miss each other entirely, x2 - x1 comes out negative, and we want 0 instead.',
        7: 'Height of the overlap, with the same clamp. Without both clamps two negative numbers would multiply into a positive fake overlap.',
        8: 'Area of the overlap: width times height. This is the intersection.',
        9: 'Area of box a: (right - left) times (bottom - top).',
        10: 'Area of box b the same way.',
        11: 'The borrowed formula. Adding the two areas counts the shared part twice, so subtract the intersection once to get the union, then divide.',
        13: 'Two boxes on the same cat, the second shifted 8 pixels right and 12 down. round(x, 2) cuts the printout to two decimal places.',
        14: 'A box on the other side of the photo. No overlap at all, so the clamps fire and the answer is exactly 0.',
      },
    },
    {
      type: 'intuition',
      title: 'The five candidate boxes we will work with',
      md: `One forward pass on the two-cat photo, after the confidence floor has already removed the thousands of junk candidates, leaves five boxes. Coordinates in (x1, y1, x2, y2), confidence next to each.

- **A** = [100, 100, 220, 260], confidence **0.95** — on the ginger cat.
- **B** = [108, 112, 214, 268], confidence **0.88** — also on the ginger cat, shifted a little.
- **C** = [92, 120, 208, 250], confidence **0.71** — the ginger cat a third time, a bit wider.
- **D** = [300, 140, 400, 280], confidence **0.62** — on the grey cat.
- **E** = [312, 150, 404, 272], confidence **0.55** — the grey cat again.

Two cats, five boxes. Ship all five and three of them are wrong answers, because each cat can only be found once. Let us work out the overlaps by hand before running anything.`,
    },
    {
      type: 'intuition',
      title: 'IoU of A and B, computed by hand',
      md: `A = [100, 100, 220, 260]. B = [108, 112, 214, 268].

- Overlap left edge: the larger of 100 and 108 = **108**. Overlap top edge: the larger of 100 and 112 = **112**.
- Overlap right edge: the smaller of 220 and 214 = **214**. Overlap bottom edge: the smaller of 260 and 268 = **260**.
- So the overlap rectangle is 214 − 108 = **106** wide and 260 − 112 = **148** tall. Intersection area = 106 × 148 = **15,688**.
- Area of A = 120 × 160 = **19,200**. Area of B = 106 × 156 = **16,536**.
- Union = 19,200 + 16,536 − 15,688 = **20,048**.
- IoU = 15,688 / 20,048 = **0.78**. That is the number the code printed.

0.78 is very high. These two boxes are on the same cat, and one of them has to go.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 2: put the boxes in a list and sort them by confidence',
      code: `boxes = [[100, 100, 220, 260], [108, 112, 214, 268], [92, 120, 208, 250],
         [300, 140, 400, 280], [312, 150, 404, 272]]
names = ['A', 'B', 'C', 'D', 'E']
scores = [0.95, 0.88, 0.71, 0.62, 0.55]

order = []
for i in range(len(scores)):
    order.append(i)
order.sort(key=lambda i: scores[i], reverse=True)
for i in order:
    print(names[i], scores[i])

# ---- real output ----
# A 0.95
# B 0.88
# C 0.71
# D 0.62
# E 0.55`,
      annotations: {
        1: 'A list of lists: five boxes, each itself a list of four coordinates. boxes[0] is A, boxes[1] is B, and so on.',
        2: 'The same list continued on a second physical line. Python allows this because the opening square bracket on line 1 is still unclosed.',
        3: 'Human-readable names in the same order, so printed output says A rather than 0.',
        4: 'The confidence the model printed for each box, again in the same order. Position i means the same box in all three lists.',
        6: 'We will not sort the boxes themselves. We sort a list of positions — 0 to 4 — and use those positions to look things up. Start it empty.',
        7: 'len(scores) is 5, so range(5) yields 0, 1, 2, 3, 4.',
        8: 'Append each position, giving order = [0, 1, 2, 3, 4].',
        9: 'Sort those positions. key= tells sort what value to compare: for a position i, compare scores[i]. "lambda i: scores[i]" is a one-line unnamed function that takes i and returns scores[i]. reverse=True means highest first.',
        10: 'Walk the sorted positions.',
        11: 'Print the name and score of each, so we can see the ordering the algorithm will use.',
      },
    },
    {
      type: 'note',
      md: `The sorted order came out as 0, 1, 2, 3, 4 — the boxes were already listed best-first. That is a convenience for reading the next snippet, not a rule; a real detector emits them in whatever order the grid happens to produce, which is why the sort exists.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 3: every overlap we are about to need',
      code: `for j in [1, 2, 3, 4]:
    print('IoU(A,', names[j], ') =', round(iou(boxes[0], boxes[j]), 2))
print('IoU(D, E ) =', round(iou(boxes[3], boxes[4]), 2))

# ---- real output ----
# IoU(A, B ) = 0.78
# IoU(A, C ) = 0.69
# IoU(A, D ) = 0.0
# IoU(A, E ) = 0.0
# IoU(D, E ) = 0.74`,
      annotations: {
        1: 'Loop over the positions of B, C, D and E. We compare all four against A, which is position 0.',
        2: 'Call the iou function from step 1 with box A and box j, round to two decimals, and print it next to the name. The extra spaces in the printout are just how print joins its arguments.',
        3: 'The one remaining pair we will need: D against E, the two boxes on the grey cat.',
      },
    },
    {
      type: 'intuition',
      title: 'Non-max suppression, walked by hand',
      md: `**Non-max suppression (NMS)** means: keep the box with the locally highest confidence, and delete every box that overlaps it too much. It is pure bookkeeping done after the model has finished — no learning, no weights, just a rule. We use an IoU cut-off of **0.5**: overlap above that counts as "same object".

1. Sorted list: A 0.95, B 0.88, C 0.71, D 0.62, E 0.55.
2. Take **A**, the highest. It is a final detection. Nothing can remove it now.
3. Compare A against the rest. IoU(A, B) = **0.78 > 0.5**, delete B. IoU(A, C) = **0.69 > 0.5**, delete C. IoU(A, D) = **0.00**, keep D. IoU(A, E) = **0.00**, keep E.
4. Survivors: D 0.62, E 0.55. The list is not empty, so repeat.
5. Take **D**, the highest survivor. Second final detection. IoU(D, E) = **0.74 > 0.5**, delete E.
6. Nothing left. Output: **A and D**. Five boxes in, two detections out, one per cat.

Notice what did the work: the sort. "Non-maximum suppression" only means something once the list is ordered, because "the maximum" is whatever sits at the front.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 4: the whole algorithm, fourteen lines',
      code: `def nms(order, thresh):
    keep = []
    while order:
        i = order.pop(0)
        keep.append(i)
        survivors = []
        for j in order:
            if iou(boxes[i], boxes[j]) <= thresh:
                survivors.append(j)
        order = survivors
    return keep

kept = nms([0, 1, 2, 3, 4], 0.5)
for i in kept:
    print('kept', names[i], scores[i])

# ---- real output ----
# kept A 0.95
# kept D 0.62`,
      annotations: {
        1: 'Takes the box positions already sorted best-first, and the IoU cut-off above which two boxes count as the same object.',
        2: 'The answer being built: positions of the boxes we decide to keep.',
        3: '"while order:" runs as long as the list is not empty. An empty list is treated as false in Python, so this stops on its own.',
        4: 'pop(0) removes the first item and hands it back. Because the list is sorted, that is the highest-confidence box still alive.',
        5: 'It is accepted permanently. A kept box is never re-examined, which is exactly why one over-confident wrong box can delete everything near it.',
        6: 'Start an empty list for the boxes that will still be alive after this round.',
        7: 'Judge every remaining box against the one we just kept.',
        8: 'Compute the overlap using the function from step 1. Below or equal to the cut-off means "a different object".',
        9: 'Those survive, so copy their positions across. Anything above the cut-off is simply never copied — that is the deletion.',
        10: 'Replace the working list with the survivors. Everything overlapping box i has now vanished from it.',
        11: 'When the loop drains the list, hand back the kept positions.',
        13: 'Run it on the five boxes in sorted order with a 0.5 cut-off.',
        14: 'Walk the kept positions.',
        15: 'Print each surviving detection with its name and score.',
      },
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'NMS, one decision per step',
        notice: 'Left: the candidate list, sorted by confidence. Right: the verdicts. A dashed red cell (labelled "freed" by this diagram) is a box struck off the list; a solid cell is a final detection. The IoU values are the real numbers printed by the code above.',
        leftLabel: 'candidate list (score)',
        rightLabel: 'verdicts',
        frames: [
          {
            note: 'Five boxes from one forward pass on the two-cat photo, sorted by confidence. Rule: delete anything with IoU above 0.5 against a kept box.',
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
            note: 'Take the highest-confidence box. A (0.95) is a final detection — no later box can remove it.',
            stack: [
              { name: 'B', value: '0.88' },
              { name: 'C', value: '0.71' },
              { name: 'D', value: '0.62' },
              { name: 'E', value: '0.55' },
            ],
            heap: [{ id: 'A', value: 'A  score 0.95', label: 'KEPT' }],
          },
          {
            note: 'Compare each survivor against A. IoU(A, B) = 0.78, above 0.5 — B is the same cat, drawn slightly differently. Struck off.',
            stack: [
              { name: 'B', value: '0.88', to: 'A', danger: true },
              { name: 'C', value: '0.71' },
              { name: 'D', value: '0.62' },
              { name: 'E', value: '0.55' },
            ],
            heap: [{ id: 'A', value: 'A  score 0.95', label: 'KEPT' }],
          },
          {
            note: 'IoU(A, C) = 0.69, above 0.5 — the same cat a third time. Struck off. B has now left the list (dashed).',
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
            note: 'IoU(A, D) = 0.00 and IoU(A, E) = 0.00 — the other cat, no overlap at all. Both survive this round untouched.',
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
            note: 'The list is not empty, so the loop repeats: take the new highest, D (0.62). Second final detection.',
            stack: [{ name: 'E', value: '0.55' }],
            heap: [
              { id: 'A', value: 'A  score 0.95', label: 'KEPT' },
              { id: 'B', value: 'B  IoU 0.78', freed: true },
              { id: 'C', value: 'C  IoU 0.69', freed: true },
              { id: 'D', value: 'D  score 0.62', label: 'KEPT' },
            ],
          },
          {
            note: 'IoU(D, E) = 0.74, above 0.5 — E is a duplicate of D. Struck off, and the candidate list is now empty. Five boxes in, two detections out.',
            stack: [{ name: 'E', value: '0.55', to: 'D', danger: true }],
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
      type: 'intuition',
      title: 'The classic mistake: three boxes on one cat',
      md: `A team ships a detector to count cats. The report says five cats in a photo of two. The boxes look right — they are all on cats — there are just too many of them. The usual cause is one of two things: the duplicate-deletion step was never run, or its cut-off was set so high that it deletes nothing.

Here is the second version, reproduced. Run the exact same algorithm with the IoU cut-off at 0.9 instead of 0.5, and watch the answer break.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 5: the same code, one wrong number',
      code: `print('threshold 0.5 ->', [names[i] for i in nms([0, 1, 2, 3, 4], 0.5)])
print('threshold 0.9 ->', [names[i] for i in nms([0, 1, 2, 3, 4], 0.9)])

# ---- real output ----
# threshold 0.5 -> ['A', 'D']
# threshold 0.9 -> ['A', 'B', 'C', 'D', 'E']`,
      annotations: {
        1: 'The correct run. "[names[i] for i in ...]" is a list comprehension: it walks the kept positions and builds a new list of their names — the same thing a for loop with append does, written on one line.',
        2: 'The identical call with the cut-off moved to 0.9. Nothing else changed.',
      },
    },
    {
      type: 'intuition',
      title: 'Why the wrong answer came out',
      md: `At a cut-off of 0.9, a box is deleted only if it overlaps a kept box by more than 90 percent — practically only if it is the same rectangle.

- The real duplicates overlap A at 0.78 and 0.69. Both are comfortably below 0.9, so both survive. Same for E against D at 0.74.
- Nothing is ever deleted, so **every candidate becomes a final detection**: five boxes, five reported cats, in a photo of two.
- Skipping the step entirely gives exactly the same output, which is why the two causes look identical from the outside.
- The symptom to recognise: **too many detections, all of them plausible, clustered on the same objects.** If instead you saw boxes in empty places, that is a confidence-floor problem, not a duplicate problem — a different bug with a different fix.
- The opposite mistake is real too. Set the cut-off very low, say 0.1, and a kept box deletes everything nearby, including a genuinely different object standing close. Two cats pressed together can overlap at 0.4 or more, and one of them silently disappears.
- So the cut-off is a dial between duplicates and lost objects: too high leaves duplicates, too low deletes real objects. Sensible values sit between 0.5 and 0.7. It lives outside the model, so you can turn it without retraining anything.`,
    },
    {
      type: 'intuition',
      title: 'Nobody trains a vision model from scratch',
      md: `Training a backbone from random numbers needs about a million labelled images and days of GPU time. Almost nobody does it, and you should not either. The standard practice is **transfer learning**: start from a backbone someone else already trained on a huge general image dataset, and adapt it.

- The reason it works: the early layers of any vision backbone end up learning the same generic things — edges, corners, colour blobs, textures. Those are not specific to cats or to X-rays. Only the last layers are specific to the original task.
- **Step one, replace the head.** The downloaded model ends in a head that prints its original 1000 categories. Delete that head and bolt on a fresh one, sized for your task: your 3 classes, or a detection head, or a mask head. The new head starts with random numbers.
- **Step two, freeze the backbone.** "Freeze" is mechanical, not metaphorical: for every weight in the backbone you set a flag that says "do not update this". During training the gradient is still computed through those layers, but the optimiser skips them, so their values are exactly the same after training as before. In PyTorch that flag is requires_grad = False on each frozen parameter.
- **Why freeze at all?** Your new head is random, so its first gradients are large and noisy. Let those reach a good backbone and they will wreck it. Freezing protects it while the head learns, and it also makes training much faster and cheaper, because far fewer numbers are being updated.
- **Step three, fine-tune.** Once the head has settled, unfreeze the top part of the backbone and train everything together at a **much smaller learning rate** — often ten to a hundred times smaller. The small rate is the whole point: you want small adjustments to something already good, not a fresh search.
- The practical payoff: a task that would need a million images now works on a few thousand, sometimes a few hundred.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work these out with a pen before reading the solutions in the next section. All coordinates are (x1, y1, x2, y2).

1. Compute IoU for P = [0, 0, 10, 10] and Q = [5, 0, 15, 10].
2. Compute IoU for P = [0, 0, 10, 10] and R = [20, 20, 30, 30].
3. Four candidate boxes with confidences: W = [10, 10, 50, 50] at 0.9, X = [12, 12, 52, 52] at 0.8, Y = [100, 100, 140, 140] at 0.7, Z = [200, 200, 240, 240] at 0.4. Run NMS with an IoU cut-off of 0.5 and a confidence floor of 0.5. Which boxes survive?
4. A model prints one label for a whole photo, and nothing else. Which of the five tasks is it doing, and which business question can it not answer: "is there a defect?" or "how many defects?"
5. You freeze a backbone and train for ten epochs. Afterwards you compare the backbone weights before and after. What do you expect to see, and what does that tell you about which numbers actually changed?`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `**1.** Overlap: left = max(0, 5) = 5, top = max(0, 0) = 0, right = min(10, 15) = 10, bottom = min(10, 10) = 10. So the overlap is 5 wide and 10 tall: area 50. Area of P = 100, area of Q = 100. Union = 100 + 100 − 50 = 150. IoU = 50 / 150 = **0.33**. Note it is not 0.5 — that would be overlap divided by P alone, the most common slip.

**2.** Overlap: left = max(0, 20) = 20, right = min(10, 30) = 10. Right minus left is 10 − 20 = −10, which the clamp turns into 0. Area 0, so IoU = **0**. Without the clamp you would get −10 × −10 = 100, a completely invented overlap.

**3.** First the confidence floor at 0.5 removes Z (0.4). Sorted: W 0.9, X 0.8, Y 0.7. Take W. IoU(W, X): overlap is 12 to 50 by 12 to 52 clipped to 50, so 38 × 38 = 1444; areas 1600 and 1600; union = 1600 + 1600 − 1444 = 1756; IoU = 1444 / 1756 = **0.82**, above 0.5, so X is deleted. IoU(W, Y) = 0, no overlap, Y survives. Next round: take Y, nothing left to compare. Survivors: **W and Y**.

**4.** It is doing **classification** — one label for the whole image, no location. It can answer "is there a defect?" It cannot answer "how many defects?", because counting needs one output row per object, which means detection or instance segmentation.

**5.** The backbone weights are **bit-for-bit identical**. That is what freezing means: the optimiser skipped them. The only numbers that changed are the ones in the new head. If you did find changes in the backbone, the freeze flag was not applied — a common bug, usually because the flag was set before the layers were rebuilt or the optimiser was handed every parameter anyway.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Four things worth knowing exist, once the above is solid.

- **NMS fails in crowds, and there is a fix.** It assumes overlap means duplication. At a concert, or in dense traffic, two genuinely different people overlap above the cut-off and the lower-confidence one is deleted. **Soft-NMS** reduces a neighbour\'s confidence in proportion to its IoU instead of deleting it outright, so a real second object survives with a lower score. Related habit: run the deletion separately per class, so a person never deletes the car behind them.
- **The imbalance underneath everything.** A one-stage detector might print 8400 candidates for a photo with 4 objects, and a 512 by 512 segmentation makes 262,144 pixel decisions where maybe 3 percent matter. The training loss averages over all of them, so easy background drowns out the few hard cases. **Focal loss** is the standard fix: it shrinks the contribution of examples the model already gets right. It is derived in the Metrics module *Classification Losses*.
- **The named segmentation models. U-Net** is a segmenter shaped like a U — the backbone shrinks the image down, a decoder grows it back to full size, and horizontal "skip" links hand the fine detail from each shrinking step across to the matching growing step, which is what keeps mask edges sharp. **Mask R-CNN** is Faster R-CNN with one extra head that predicts a binary mask inside each detected box, which is how instance segmentation is usually built.
- **Labelling cost decides the project.** Tagging an image takes about a second. Drawing a box takes tens of seconds per object. A fine pixel mask was reported at over 1.5 hours per image on the Cityscapes dataset. Each rung up the task list is roughly ten times the annotation budget, so pick the lowest rung that answers the question, and ship a classifier first if you are unsure.`,
    },
  ],
  quiz: [
    {
      question: 'Semantic segmentation is run on a photo of three cats sitting together. What does the output look like?',
      options: [
        {
          text: 'Three separate cat regions, each with its own object number',
          explanation: 'That is instance segmentation. Semantic segmentation stores only a class per pixel, with no identity.',
        },
        {
          text: 'One connected cat-coloured region — every cat pixel gets the same label, with no separation between the three',
          explanation: 'Correct. Labels are per class only, so touching cats merge into one region. This is exactly why you cannot count with it.',
        },
        {
          text: 'Three bounding boxes labelled cat',
          explanation: 'Boxes are detection output. Segmentation outputs a label per pixel, not rectangles.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Why does a detector need non-max suppression at all?',
      options: [
        {
          text: 'To make the model faster at prediction time',
          explanation: 'It adds work after the forward pass. It is a serial loop and can even slow prediction down.',
        },
        {
          text: 'To convert box coordinates from one convention to another',
          explanation: 'NMS only ever deletes boxes. It never rewrites their coordinates.',
        },
        {
          text: 'The network must print a fixed number of candidate boxes, so several land on the same object and the duplicates must be removed',
          explanation: 'Correct. Fixed-shape output means over-predicting on purpose; NMS is the cleanup that leaves one box per object.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Two boxes: P is x 0 to 10, y 0 to 10. Q is x 5 to 15, y 0 to 10. What is their IoU?',
      options: [
        {
          text: '0.33',
          explanation: 'Correct. Intersection = 5 x 10 = 50. Union = 100 + 100 - 50 = 150. 50/150 = 0.33.',
        },
        { text: '0.5', explanation: 'That is the intersection divided by P alone (50/100). The denominator must be the union of both boxes.' },
        { text: '0.25', explanation: 'No pairing of these areas gives 0.25. Check that the union subtracts the intersection exactly once.' },
      ],
      correct: 0,
    },
    {
      question: 'A detector reports five boxes on a photo containing two cats. All five boxes sit on cats, three of them stacked on the same animal. What is the most likely cause?',
      options: [
        { text: 'The confidence floor is too low', explanation: 'That would produce boxes in empty places as well. Here every box is on a real cat — the problem is duplication, not junk.' },
        {
          text: 'NMS was skipped, or its IoU cut-off was set so high that overlapping duplicates are never deleted',
          explanation: 'Correct. At a cut-off of 0.9, duplicates overlapping at 0.78 and 0.69 survive, and every candidate becomes a reported detection.',
        },
        { text: 'The backbone is too small', explanation: 'Model capacity does not create duplicates. The duplicates come from many candidates firing on one object, and are removed after the model runs.' },
      ],
      correct: 1,
    },
    {
      question: 'What does "freeze the backbone" mean mechanically?',
      options: [
        {
          text: 'Each backbone weight is flagged so the optimiser does not update it — after training those numbers are unchanged',
          explanation: 'Correct. In PyTorch that is requires_grad = False. The head learns; the backbone stays exactly as downloaded.',
        },
        { text: 'The backbone is deleted and replaced by the new head', explanation: 'The backbone is what you are keeping. It is the head that gets replaced.' },
        { text: 'The learning rate is set to zero for the whole model', explanation: 'That would stop the new head learning too, so nothing would train at all.' },
      ],
      correct: 0,
    },
    {
      question: 'What do anchor boxes change about what the network predicts?',
      options: [
        {
          text: 'The network predicts a small correction to a predefined reference rectangle instead of inventing four coordinates from nothing',
          explanation: 'Correct. Because each anchor is already a sensible shape, the corrections are small and easier to learn.',
        },
        { text: 'They fix the number of objects the model can find', explanation: 'Anchors set the number of candidates. The confidence floor and NMS decide the final count.' },
        { text: 'They remove the need for NMS', explanation: 'The opposite: several anchors fire on one object, so anchors make duplicates more likely, not less.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Walk me through the computer-vision task map. What does each task actually output?',
      answer:
        'Order them by how precisely the answer is pinned down in space. Classification prints one label for the whole image. Localisation prints one label plus one bounding box, four numbers, and assumes a single object. Detection prints a variable-length list of rows, each row a box, a class label and a confidence score. Semantic segmentation prints a label for every pixel, so objects of the same class merge into one region. Instance segmentation prints a label per pixel plus an object number, which is what lets you count. The practical consequence: counting needs detection or instance segmentation, measuring area needs segmentation, and a yes/no needs classification. Choose the simplest output shape that answers the business question, because each step up costs roughly ten times more labelling effort.',
      isCaseBased: false,
    },
    {
      question: 'Explain non-max suppression step by step, then tell me when it fails.',
      answer:
        'First drop every box below a confidence floor. Sort what remains by confidence, highest first. Take the top box and accept it as a final detection. Compute IoU between it and every remaining box, and delete each one above an IoU cut-off, typically 0.5 to 0.7. Repeat with the survivors until the list is empty. It is normally run separately per class so a box never deletes a box of a different class. The failure: it assumes overlap means duplication. In a crowd, two genuinely different objects can overlap above the cut-off, and the lower-confidence one — a correct detection — is deleted. You cannot tune your way out, because a looser cut-off readmits every duplicate. The usual fix is Soft-NMS, which reduces the neighbour\'s score in proportion to its IoU instead of deleting it.',
      isCaseBased: false,
    },
    {
      question: 'Why is detection architecturally harder than classification?',
      answer:
        'The output shape. A classifier maps a fixed input to a fixed output: 80 categories in, 80 numbers out, every time. A detector must produce a list whose length depends on the picture — two cats here, forty-seven people there, nothing in the next frame. A network cannot produce a variable number of rows, because its output shape is fixed when the model is built. So detectors over-predict on purpose: emit thousands of candidate boxes at fixed positions, usually as small corrections to predefined anchor rectangles, attach a confidence score to each, then throw nearly all of them away. That is where two things classification never needs come from: a per-candidate confidence score, and non-max suppression to remove the duplicates that survive the confidence floor.',
      isCaseBased: false,
    },
    {
      question: 'How would you approach a new vision task with only 800 labelled images?',
      answer:
        'Transfer learning, not training from scratch — 800 images cannot train a backbone that normally needs a million. Take a backbone pretrained on a large general dataset, delete its original head, and attach a fresh head sized for my task. Freeze the backbone first, meaning flag every one of its weights so the optimiser does not update it, and train only the new head; the head starts random, so its early gradients are large and would damage a good backbone. Once the head has settled, unfreeze the top layers and fine-tune everything at a learning rate ten to a hundred times smaller, because I want small adjustments to something already good. This works because early layers learn generic edges and textures that transfer across domains. I would also lean hard on augmentation, and check whether a simpler output shape — classification instead of detection — answers the question, since that cuts the labelling cost by an order of magnitude.',
      isCaseBased: false,
    },
    {
      question: 'IoU shows up in three different places in a detection pipeline. Name them and say why the thresholds differ.',
      answer:
        'One, training-time assignment: an anchor whose IoU with a ground-truth box is high enough, often above 0.5 to 0.7, becomes a positive example for that object; below about 0.3 it is a negative, and the band between is often ignored to avoid ambiguous supervision. Two, prediction-time duplicate removal in NMS: a box overlapping a kept box above about 0.5 to 0.7 is deleted. Three, evaluation: a prediction counts as correct only if its IoU with an unmatched ground-truth box clears the threshold, and the COCO convention averages over ten thresholds from 0.5 to 0.95. They differ because they trade off different things — assignment trades supervision volume against label noise, NMS trades duplicates against deleted real objects, and evaluation is choosing how strict "correct" should be. The full evaluation story is in the Metrics module Vision Metrics: IoU and mAP.',
      isCaseBased: false,
    },
    {
      question: 'Case: your defect detector reports mAP 0.72 offline, but the factory team says it misses defects constantly. Debug it.',
      answer:
        'Stop trusting the single number and find the disagreement. First, threshold mismatch: mAP summarises performance across all confidences, but production runs at one fixed confidence — plot precision and recall against that threshold and see what recall you actually ship at. Second, averaging: check per-class scores, because one easy class can carry the average while the rare critical defect sits at 0.2. Also confirm both sides quote the same IoU convention. Third, NMS: if defects cluster or overlap, the duplicate-deletion step may be removing real ones — test a higher IoU cut-off or Soft-NMS and see whether recall jumps. Fourth, distribution shift: new lighting, a new camera, a new product line; compare recent production images against the training set and check whether the misses concentrate in recent batches. Fifth, and most often the real answer: unit mismatch. The operator counts a miss per part, the metric counts per box, so 90 percent box recall can be a 40 percent part-level pass rate. Re-evaluate on the unit the business actually reports.',
      isCaseBased: true,
    },
    {
      question: 'Case: a client wants to know what percentage of each field is affected by blight from drone imagery. They ask for object detection because their previous vendor used it. How do you respond?',
      answer:
        'Detection is the wrong output shape for the question, and the reason is the unit of the answer. They want area, and a bounding box measures the area of a rectangle, not of an irregular blighted patch — on ragged organic shapes a box overstates the area by a large and unpredictable factor, and overlapping patches get double-counted. Semantic segmentation gives area directly: count the pixels labelled blight and multiply by the ground area each pixel covers. They also do not need instance segmentation, because nobody is counting individual blight patches, which keeps it cheaper. Then be honest about cost: pixel masks are the most expensive labels there are, so I would stage it — label a few hundred images with a promptable segmentation tool plus human correction rather than drawing polygons from scratch, validate against a handful of ground-truthed fields, and first check whether classifying a coarse grid of patches already answers the question at a fraction of the cost.',
      isCaseBased: true,
    },
    {
      question: 'Case: a real-time detector must run on an edge device at 30 frames per second but currently runs at 11. The team proposes a smaller backbone. What would you check first?',
      answer:
        'A smaller backbone costs accuracy, so profile before cutting. First, where is the time actually going: backbone, head, NMS, or image loading? NMS is a serial per-image loop and scales badly with candidate count, so raising the confidence floor before it, or using a batched GPU implementation, can be a large free win. Second, input resolution: cost scales roughly with pixel count, so 640 down to 512 is about a third off the backbone and usually costs less accuracy than changing architecture. Third, numeric precision: FP16 or INT8 typically gives two to three times on edge accelerators with small accuracy loss, and it is reversible. Fourth, confirm the model is really on the accelerator — unsupported operations silently falling back to CPU are a classic cause, as is counting JPEG decoding as inference time. Fifth, do you need every frame? Detect every third frame and track in between, since tracking is far cheaper. Only after all of that would I shrink the backbone, and then I would measure the cost against the business metric, not mAP alone.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'The five CV tasks, by output', back: 'Classification: one label per image. Localisation: one label + one box. Detection: a list of (box, label, confidence) rows. Semantic segmentation: a label per pixel. Instance segmentation: a label plus an object number per pixel.' },
    { front: 'Bounding box convention', back: '(x1, y1, x2, y2) = top-left x and y, bottom-right x and y, in pixels from the top-left of the image. The other common convention is (centre-x, centre-y, width, height) — always check which one a library uses.' },
    { front: 'Why detection needs NMS', back: 'The network must print a fixed number of candidates, so several land on the same object. NMS keeps the highest-confidence one and deletes every box overlapping it above the IoU cut-off.' },
    { front: 'NMS in five steps', back: 'Drop below a confidence floor, sort by confidence descending, take the top box as a final detection, delete every box with IoU above the cut-off against it, repeat until the list is empty. Usually run per class.' },
    { front: 'NMS cut-off, both failure directions', back: 'Too high (0.9): nothing is deleted, duplicates are reported as extra objects. Too low (0.1): a kept box deletes genuinely different objects standing close. Sensible range 0.5 to 0.7. No retraining needed to change it.' },
    { front: 'IoU', back: 'Intersection area divided by union area, where union = area A + area B - intersection. Clamp negative overlap widths to 0. Used at anchor assignment, at NMS, and at evaluation, with three separately tuned thresholds. Taught in Vision Metrics: IoU and mAP.' },
    { front: 'Anchor box', back: 'A predefined reference rectangle tiled at every feature-grid position. The network predicts which anchor is responsible plus a small correction to it, instead of inventing coordinates from nothing.' },
    { front: 'Transfer learning, three steps', back: 'Replace the head with one sized for your task. Freeze the backbone — flag its weights so the optimiser skips them, leaving them unchanged. Then fine-tune the top layers at a learning rate 10 to 100 times smaller.' },
  ],
  mindmapMarkdown: `- The CV Task Map: Detection & Segmentation
  - Five tasks, by what they output
    - Classification: one label
    - Localisation: one label + one box
    - Detection: list of box + label + confidence
    - Semantic seg: label per pixel, objects merge
    - Instance seg: label + object number per pixel
  - Vocabulary
    - Bounding box (x1, y1, x2, y2)
    - Class label, confidence score
    - Mask, backbone, head
    - Anchor: reference box, predict a correction
  - Why detection is hard
    - Output length varies with the picture
    - Fix: many candidates, then throw most away
    - Confidence floor, then NMS
    - One-stage (YOLO) vs two-stage (Faster R-CNN)
  - IoU
    - Overlap area / union area
    - Taught in Vision Metrics: IoU and mAP
    - Used at assignment, NMS, evaluation
  - NMS worked example
    - A 0.95, B 0.88, C 0.71, D 0.62, E 0.55
    - IoU(A,B)=0.78, IoU(A,C)=0.69, IoU(D,E)=0.74
    - Keeps A and D: one box per cat
  - The classic mistake
    - Cut-off 0.9 deletes nothing, 5 boxes for 2 cats
    - Too low deletes real neighbouring objects
  - Transfer learning
    - Replace the head
    - Freeze = optimiser skips those weights
    - Fine-tune top layers, tiny learning rate
  - Beyond the basics
    - Soft-NMS for crowds
    - Background imbalance, focal loss
    - U-Net, Mask R-CNN
    - Labelling cost per rung`,
}

export default m
