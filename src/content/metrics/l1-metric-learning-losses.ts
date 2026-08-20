import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l1-metric-learning-losses',
  subjectId: 'metrics',
  level: 1,
  title: 'Contrastive & Triplet Loss: Learning What "Similar" Means',
  whyItMatters:
    'Some problems do not have a fixed list of answers. A door that unlocks for employees cannot have one output slot per employee when somebody new joins every week. A product-image search cannot have one class per product in a catalogue that changes daily. These losses solve that by training a model to place similar things near each other and different things far apart, so that "is this the same person?" becomes a distance you measure rather than a class you predict. This module builds both losses from two-dimensional points you can plot on graph paper.',
  assumes: [
    'You know what a probability is, and you have read *Classification Losses: Cross-Entropy, Focal & Hinge* - the "max(0, ...)" pattern here is the same one hinge loss uses',
    'You remember Pythagoras from school: the distance between two points is the square root of the squared gaps added together',
    'You have seen a Python for loop, a list, and a function definition',
    'No calculus and no machine-learning background is needed. Every term used here is defined here.',
  ],
  estMinutes: 36,
  sections: [
    {
      type: 'intuition',
      title: 'A door that will not work as a classifier',
      md: `A company wants a camera at the office door that unlocks for employees. The obvious plan is a classifier: one output slot per employee, and the model picks the most likely one. Follow that plan for four weeks and watch it fall apart.

- The company has **400 employees**, so the model needs 400 output slots. Fine so far.
- Most employees supplied **one or two photos**. A classifier needs many examples per class to learn a class at all, so 400 classes with two photos each is already hopeless.
- On Tuesday **three people join**. The model now needs 403 slots. Adding an output slot means changing the shape of the model and retraining it from scratch.
- On Friday **two people leave**, and someone has to decide whether to retrain again to remove their slots.
- Worse, a classifier with 400 slots must answer with one of them. A delivery driver walks up and the model confidently says "employee 216", because "none of these" was never one of the choices.

The problem is not that the model is weak. The problem is that we asked the wrong question. "Which of these 400 people is this?" is a question with a fixed answer list, and this answer list will not hold still.`,
    },
    {
      type: 'intuition',
      title: 'Ask a different question, and define the words for it',
      md: `Change the question to **"are these two faces the same person?"** That question has only two possible answers and it never grows, no matter how many people join. To answer it we need three words.

- **Vector** — an ordered list of numbers, such as (0.3, 0.4). Two numbers means you can draw it as a point on graph paper. Real systems use 128 or 512 numbers instead of 2, but nothing about the idea changes; we will use 2 so you can see it.
- **Embedding** — the vector a model produces for one input. The model is a function: photo goes in, a list of numbers comes out. The list itself means nothing; only how it sits **relative to other embeddings** means anything.
- **Distance** — how far apart two vectors are, by Pythagoras. For (0.0, 0.0) and (0.3, 0.4): the gaps are 0.3 and 0.4, so the distance is the square root of 0.09 + 0.16 = 0.25, which is **0.5**.

Now state the goal in one sentence: **train the model so that two photos of the same person land close together, and photos of different people land far apart.** Nothing about identities, nothing about a class list. Once you have that:

- **Verification** ("is this the person on the badge?") is one distance and one comparison against a cut-off.
- **Recognition** ("who is this?") is finding the nearest stored embedding and checking that it is close enough.
- The family name for training a model this way is **metric learning**, because "metric" is the mathematical word for a distance. The loss shapes the geometry of a space instead of drawing a boundary over a fixed set of labels.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Three embeddings, two distances, by hand',
      code: `import math

ana1 = [0.0, 0.0]
ana2 = [0.3, 0.4]
bo = [0.8, 0.6]

def dist(u, v):
    gap0 = u[0] - v[0]
    gap1 = u[1] - v[1]
    return math.sqrt(gap0 ** 2 + gap1 ** 2)

print('Ana photo 1 to Ana photo 2:', dist(ana1, ana2))
print('Ana photo 1 to Bo         :', dist(ana1, bo))

# ---- real output ----
# Ana photo 1 to Ana photo 2: 0.5
# Ana photo 1 to Bo         : 1.0`,
      annotations: {
        1: 'The standard maths module, for the square root.',
        3: 'The embedding the model produced for the first photo of Ana. Two numbers, so we can plot it.',
        4: 'A second photo of the same person. Different photo, so a different vector - but it should land nearby.',
        5: 'A photo of a different person, Bo. It should land further away than ana2 does.',
        7: 'A function taking two vectors and returning the distance between them.',
        8: 'The gap in the first coordinate. For ana1 and ana2 that is 0.0 − 0.3 = −0.3.',
        9: 'The gap in the second coordinate: 0.0 − 0.4 = −0.4.',
        10: 'Pythagoras: square both gaps, add them, take the square root. Squaring removes the minus signs, so the order of the two arguments does not matter.',
        12: 'Same person: 0.5. This is the number training should push downward.',
        13: 'Different people: 1.0, twice as far. This is the number training should push upward - but only up to a point, as the next section shows.',
      },
    },
    {
      type: 'intuition',
      title: 'Contrastive loss: pull, push, then stop pushing',
      md: `Contrastive loss trains on **pairs**. Each pair carries a label: 1 if the two photos are the same person, 0 if they are different. Let **d** be the distance between their two embeddings, and pick a number **m**, the **margin** — how far apart different people ought to be. The loss has two halves, and exactly one of them is active for any pair.

- **Same pair (label 1):** the loss is **d²**. It is zero only when d is zero, so this half pulls the two embeddings together until they sit on top of each other. No margin, no mercy.
- **Different pair (label 0):** the loss is **max(0, m − d)²**. It pushes them apart *only while d is below m*.
- Once d reaches m, the inside of the max goes negative, the max clips it to zero, and the pair costs exactly **0.000**. Not a small number — zero. That is the same flat region hinge loss has, for the same reason.
- **That clipping is the whole design, not a detail.** Without it, the loss would keep shoving already-distant pairs further apart forever, spending the model's capacity on negatives it solved in the first epoch and stretching the space out of shape.
- Squaring is there so that a pair which is badly wrong costs disproportionately more than one that is slightly wrong, exactly as in squared error.
- The margin is the one real knob, and its right value depends on the scale of the space. Most systems first shrink every embedding to length 1, which puts them all on a circle, and then a margin near 1 is sensible and carries over between datasets.`,
    },
    {
      type: 'math',
      intro: 'Contrastive loss on one pair. y = 1 means same person, y = 0 means different, m is the margin.',
      latex: [
        'd = \\lVert f(x_1) - f(x_2) \\rVert_2 \\qquad y \\in \\{0, 1\\}',
        '\\ell_{\\text{contrastive}} = y\\,d^{2} \\;+\\; (1 - y)\\,\\max\\!\\big(0,\\; m - d\\big)^{2}',
        'y = 0,\\; d \\ge m \\;\\Longrightarrow\\; \\ell = 0 \\;\\Longrightarrow\\; \\text{zero slope: this pair is already far enough apart.}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Both halves of contrastive loss, across five distances',
      code: `margin = 1.5

def contrastive(d, same):
    if same:
        return d ** 2
    return max(0.0, margin - d) ** 2

print('   d   same-pair   different-pair')
for d in [0.0, 0.5, 1.0, 1.5, 3.0]:
    print('%4.1f %11.3f %16.3f' % (d, contrastive(d, True), contrastive(d, False)))

# ---- real output ----
#    d   same-pair   different-pair
#  0.0       0.000            2.250
#  0.5       0.250            1.000
#  1.0       1.000            0.250
#  1.5       2.250            0.000
#  3.0       9.000            0.000`,
      annotations: {
        1: 'The margin: how far apart two different people should end up. 1.5 is arbitrary here, chosen so the numbers stay readable.',
        3: 'One function for both halves. d is the distance, and same is True or False.',
        4: 'The same-person branch.',
        5: 'Pay the square of the distance. It only reaches zero when the two embeddings are identical, so the pull never switches off.',
        6: 'The different-people branch. max(0.0, ...) floors the value at zero, so once d passes the margin nothing is charged.',
        8: 'A header row so the printed columns have names.',
        9: 'Five distances, from "identical" up to "twice the margin apart".',
        10: 'Print the distance and both halves side by side. The format codes only fix column widths and decimal places.',
      },
    },
    {
      type: 'note',
      md: `Read the two columns in opposite directions. The **same-pair** column only ever grows: 0.000, 0.250, 1.000, 2.250, 9.000. There is no distance at which the loss says "close enough" — it keeps pulling. The **different-pair** column falls to 0.000 at d = 1.5 and then stays there: at d = 3.0 the pair contributes nothing at all, and deleting it from the batch would not change the update by a single digit. One half never lets go, the other lets go the moment its demand is met.`,
    },
    {
      type: 'intuition',
      title: 'Triplet loss: relative, never absolute',
      md: `Contrastive loss makes two **absolute** demands: same pairs at distance 0, different pairs at least m apart — in a space whose scale nobody chose. That is stricter than the real requirement. Triplet loss drops both demands and asks for one thing instead.

- Feed **three** inputs at once: an **anchor** a, a **positive** p (the same person as a), and a **negative** n (somebody else).
- The loss is **max(0, d(a,p) − d(a,n) + m)**. In words: *the positive must be closer to the anchor than the negative is, by at least the margin.*
- Nothing absolute appears. d(a,p) may be 0.2 or 20 — only the **gap** between d(a,n) and d(a,p) matters, and that gap only has to clear m.
- Why that is better: a genuinely blurry photo may legitimately sit far from the rest of its own identity. Triplet loss is content as long as it still sits nearer that identity than any stranger. Contrastive loss would keep hammering it toward distance zero, distorting the space to force it.
- Satisfied triplets pay exactly zero, the same flat region as before. Here it stops being a bonus and becomes the central practical problem, as the next-but-one section shows.
- The bill: you now have to *choose* triplets. With N photos there are on the order of N³ possible ones, so you cannot use them all.`,
    },
    {
      type: 'math',
      intro: 'Triplet loss. Anchor a, positive p, negative n, margin m. Compare the zero condition with hinge loss.',
      latex: [
        '\\ell_{\\text{triplet}} = \\max\\!\\big(0,\\; d(a, p) - d(a, n) + m \\big)',
        '\\ell = 0 \\iff d(a, n) \\ge d(a, p) + m \\qquad \\text{(a relative demand: no absolute distance appears)}',
        '\\text{FaceNet used } f(x) \\in \\mathbb{R}^{128}, \\quad \\lVert f(x) \\rVert_2 = 1, \\quad m = 0.2',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Triplet loss cares about the gap, not the distances',
      code: `margin = 1.5

def triplet(d_ap, d_an):
    return max(0.0, d_ap - d_an + margin)

print('near positive, far negative :', triplet(0.5, 3.0))
print('near positive, near negative:', triplet(0.5, 1.0))
print('both far, gap still 2.5     :', triplet(20.0, 22.5))
print('both far, gap only 1.0      :', triplet(20.0, 21.0))

# ---- real output ----
# near positive, far negative : 0.0
# near positive, near negative: 1.0
# both far, gap still 2.5     : 0.0
# both far, gap only 1.0      : 0.5`,
      annotations: {
        1: 'The same margin as before, so the two losses can be compared directly.',
        3: 'The function takes the two distances that matter: anchor-to-positive and anchor-to-negative.',
        4: 'The whole formula. Subtracting d_an is what makes the demand relative - it compares the two distances rather than testing either one.',
        6: 'The positive is 2.5 nearer than the negative, and only 1.5 was demanded, so this triplet is satisfied and pays 0.0.',
        7: 'Now the negative is only 0.5 further than the positive. That falls 1.0 short of the margin, so the loss is exactly that shortfall.',
        8: 'Both distances are forty times larger than in line 6, yet the loss is still 0.0. Contrastive loss would have charged 400 for that same-pair distance of 20.',
        9: 'Same enormous distances, but the gap is now 1.0 instead of 2.5, so it falls 0.5 short. Only the gap ever changed the answer.',
      },
    },
    { type: 'visual', component: 'PointerBoxDiagram', props: {
      title: 'One anchor, one positive, one negative: what each loss demands',
      notice: 'Anchor is a photo of Ana. Positive is another photo of Ana. Negative is a photo of Bo. Margin is 1.5 throughout. Step through and watch which demands are met.',
      leftLabel: 'the three inputs',
      rightLabel: 'what the loss says',
      frames: [
        {
          note: 'Starting layout. The positive is 0.5 away, the negative is 1.0 away. The negative is further, but only by 0.5.',
          stack: [
            { name: 'anchor (Ana)', value: 'at (0.0, 0.0)', to: 'ap' },
            { name: 'positive (Ana)', value: 'd(a,p) = 0.5', to: 'ap' },
            { name: 'negative (Bo)', value: 'd(a,n) = 1.0', to: 'an' },
          ],
          heap: [
            { id: 'ap', value: 'gap = 1.0 - 0.5 = 0.5', label: 'demanded: 1.5' },
            { id: 'an', value: 'shortfall = 1.0', label: 'not satisfied' },
          ],
        },
        {
          note: 'Contrastive loss judges the two pairs separately. Same-pair pays d squared = 0.25. Different-pair is inside the margin, so it pays (1.5 - 1.0) squared = 0.25.',
          stack: [
            { name: 'same pair', value: 'd = 0.5 -> 0.5^2', to: 'c1' },
            { name: 'different pair', value: 'd = 1.0 -> (1.5-1.0)^2', to: 'c2' },
          ],
          heap: [
            { id: 'c1', value: 'contrastive = 0.250', label: 'still pulling' },
            { id: 'c2', value: 'contrastive = 0.250', label: 'still pushing' },
          ],
        },
        {
          note: 'Triplet loss judges them together: 0.5 - 1.0 + 1.5 = 1.0. One number for the whole triplet, and it is the amount by which the gap fell short.',
          stack: [
            { name: 'anchor (Ana)', value: 'at (0.0, 0.0)', to: 't1' },
            { name: 'positive (Ana)', value: 'd(a,p) = 0.5', to: 't1' },
            { name: 'negative (Bo)', value: 'd(a,n) = 1.0', to: 't1' },
          ],
          heap: [
            { id: 't1', value: 'triplet = 1.000', label: 'gap short by 1.0' },
          ],
        },
        {
          note: 'Push the negative out to d(a,n) = 3.0 and change nothing else. Both losses now read exactly 0.000 on the different-pair side. Zero loss means zero slope: these pairs teach the model nothing at all.',
          stack: [
            { name: 'anchor (Ana)', value: 'at (0.0, 0.0)', to: 'z1' },
            { name: 'positive (Ana)', value: 'd(a,p) = 0.5 (unchanged)', to: 'z2' },
            { name: 'negative (Bo)', value: 'd(a,n) = 3.0', to: 'z1', danger: true },
          ],
          heap: [
            { id: 'z1', value: 'triplet = 0.000', label: 'no gradient' },
            { id: 'z2', value: 'contrastive same-pair = 0.250', label: 'still pulling' },
          ],
        },
      ],
    } },
    {
      type: 'intuition',
      title: 'The payoff: adding an employee to the door system',
      md: `FaceNet, published in 2015, is the system that makes the point concrete. One model, trained with triplet loss, maps any face photo to a single list of 128 numbers. There are **no per-person parameters anywhere in the model**. Here is the whole door system built on it.

- **Enrol everyone once.** Run each employee's photo through the model and store the resulting 128 numbers in a database table, next to their name. 400 employees is 400 rows.
- **Verification.** Someone taps a badge claiming to be Ana. Photograph them, embed the photo, measure the distance to Ana's stored row, and unlock if it is below the cut-off. One distance, one comparison.
- **Recognition.** Nobody taps anything. Embed the photo, find the nearest stored row, and unlock only if that nearest row is inside the cut-off. The "inside the cut-off" test is what lets the system say *nobody* — which the 400-slot classifier could never do.
- **A new employee joins.** One photo, one forward pass through the model, one row inserted. Roughly a second of work.
- **Nothing is retrained.** No new output slot, no reshaped model, no weights touched. The same is true when someone leaves: delete their row.
- The same shape solves speaker verification, product-image search, and following one shopper across several store cameras — any problem where the list of things keeps growing.

The cut-off is a business decision, not a modelling one. Tighten it and real staff get locked out; loosen it and a lookalike walks in. That trade is exactly the threshold trade from *ROC, AUC & PR Curves*, run on distances instead of scores.`,
    },
    {
      type: 'intuition',
      title: 'Triplet mining: why the obvious version does not train',
      md: `Now the practical problem the flat zero region creates. After one epoch, most identities are already roughly separated. Pick three photos at random and the odds are that the negative is already well past the margin, so the triplet contributes exactly 0.000.

- Zero loss means zero slope, which means that triplet moves no weights. A batch made of such triplets performs an update of size zero.
- And the printed loss looks **wonderful** while this happens, because a batch of satisfied triplets averages to nearly zero. Low loss, no learning.
- So triplets must be **chosen**, not sampled. That choosing has a name: **mining**.
- **Hard negatives** — for each anchor, pick the negative that is *closest* to it. Maximum shortfall, maximum slope per triplet.
- But the closest negative is very often a **mislabelled photo or a genuine lookalike**. Training hard on those tells the model that two identical-looking faces must be pushed apart, which it can only satisfy by giving up and mapping every face to the same point. That collapse is a documented, reproducible failure of naive hard mining.
- **Semi-hard negatives**, which is what FaceNet used: negatives that are *further* than the positive but still inside the margin, meaning d(a,p) < d(a,n) < d(a,p) + m. Wrong enough to produce a real slope, not so wrong that it is probably a labelling error.
- **Batch mining**, the version used today: build each batch as P identities with K photos each, embed all of them once, then form triplets *inside* that batch from the table of distances. No offline index to maintain, and the mined triplets stay current as the model changes.

The next snippet measures the problem instead of asserting it.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'How many random triplets teach the model nothing?',
      code: `import random

random.seed(0)
margin = 0.2
zero = 0
for _ in range(10000):
    d_ap = random.uniform(0.0, 1.4)
    d_an = random.uniform(0.6, 2.0)
    if max(0.0, d_ap - d_an + margin) == 0.0:
        zero = zero + 1
print('triplets with exactly zero loss: %d out of 10000' % zero)
print('fraction that teach nothing    : %.2f' % (zero / 10000))

# ---- real output ----
# triplets with exactly zero loss: 7386 out of 10000
# fraction that teach nothing    : 0.74`,
      annotations: {
        1: 'random is Python\'s standard module for generating numbers that look arbitrary.',
        3: 'seed(0) fixes the starting point of that generator, so this script prints the same answer every time you run it.',
        4: 'FaceNet\'s margin, 0.2, on embeddings whose length has been shrunk to 1.',
        5: 'A counter for how many triplets end up costing exactly zero.',
        6: 'Draw ten thousand triplets. The underscore is the conventional name for a loop variable you never use.',
        7: 'A stand-in for a partly-trained model: same-person distances land somewhere between 0.0 and 1.4. uniform(a, b) picks any value in that range, all equally likely.',
        8: 'Different-person distances land between 0.6 and 2.0 - overlapping the range above, but shifted further out, which is what "partly trained" looks like.',
        9: 'The triplet loss from the previous snippet, compared against exactly zero.',
        10: 'Count this triplet as one that produces no slope and therefore no learning.',
        11: 'Print the raw count.',
        12: 'And as a fraction. Three quarters of a randomly built batch does nothing at all.',
      },
    },
    {
      type: 'note',
      md: `Read that number carefully: **74% of randomly chosen triplets are already satisfied**, and this is a model that is only partly trained. As training improves the model, the fraction climbs toward 100%, so the problem gets *worse* over time, not better. This is why mining is not an optimisation you add later — it is what makes the loss work at all. And it explains the failure mode that catches people: the loss curve drops fast, flattens near zero, and the model quietly stops improving, because most of every batch has become a batch of zeros.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: the door system, computed by hand',
      md: `Four employees are enrolled. Their stored 2-D embeddings are **Ana (0.0, 1.0)**, **Bo (1.0, 0.0)**, **Chen (0.6, 0.8)** and **Dev (−0.8, 0.6)**. The accept cut-off is set at **0.50**.

- **A face arrives and embeds to (0.28, 0.96).** Compute all four distances by Pythagoras.
- To Ana: gaps 0.28 and −0.04, so √(0.0784 + 0.0016) = √0.08 = **0.283**.
- To Bo: gaps −0.72 and 0.96, so √(0.5184 + 0.9216) = √1.44 = **1.200**.
- To Chen: gaps −0.32 and 0.16, so √(0.1024 + 0.0256) = √0.128 = **0.358**.
- To Dev: gaps 1.08 and 0.36, so √(1.1664 + 0.1296) = √1.296 = **1.138**.
- Nearest is **Ana at 0.283**, which is under 0.50, so the door opens for Ana. Correct.

Now notice something uncomfortable in those numbers. Chen sits at **0.358**, only 0.075 further away than Ana. The system was right, but barely — and here is what that costs.

- **A stranger arrives and embeds to (0.90, 0.50).** Distances: Ana **1.030**, Bo **0.510**, Chen **0.424**, Dev **1.703**.
- Nearest is **Chen at 0.424**, which is under the 0.50 cut-off, so the door **opens for a stranger**. The system is confidently wrong.
- **Tighten the cut-off to 0.35.** The stranger's 0.424 is now rejected. Ana's 0.283 is still accepted. One number changed, no retraining, and the failure is gone.
- But check the cost of that change: had Ana's photo embedded slightly worse, at 0.38, she would now be locked out. Tightening trades a stranger getting in for an employee getting stuck at the door.

Two conclusions worth carrying. First, the model's job ends at producing the embeddings; the cut-off is a separate decision made afterwards, and it can be changed in production in seconds. Second, the quality you actually want from training is not "distances are small" but **"the gap between the right identity and the nearest wrong one is large"** — which is exactly the quantity triplet loss optimises, and exactly what was too small here at 0.075.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake, walked into on purpose',
      md: `A team trains a face embedding with triplet loss and margin m = 0.2. Random triplets barely moved the loss, so they switch to mining the hardest negative for every anchor — the closest photo of a different person. Training now looks decisive: the loss falls quickly and settles at **0.2000**, flat, for the rest of the run. They ship it. Every face matches every other face.

- Work out what a loss of exactly 0.2000 means. Triplet loss is max(0, d(a,p) − d(a,n) + m).
- If the model maps **every** input to the same point, then d(a,p) = 0 and d(a,n) = 0 for every triplet.
- Substitute: max(0, 0 − 0 + 0.2) = **0.2**. Every triplet. Every batch. Forever.
- So a loss sitting perfectly still at exactly the margin value is not convergence. It is the signature of a **collapsed embedding**: the model has discovered that mapping everything to one point is a stable, low-cost answer.
- Why hardest-negative mining caused it: the closest photo of a "different" person is very often a mislabelled duplicate or a true lookalike. The model is then asked to push apart two things that genuinely look identical. It cannot, and the least-bad compromise available to it is to stop distinguishing anything.
- The confirming check takes one minute: embed 200 photos and print the average distance between random pairs. A healthy model gives something comparable to the margin. A collapsed one gives roughly 0.00.

The fixes, cheapest first: use **semi-hard** negatives rather than hardest, so the negative must be further than the positive but still inside the margin; build batches as P identities × K photos and mine inside the batch, which caps how pathological a negative can be; and audit your labels, because hardest-negative mining is a very effective detector of duplicated identities in a dataset. The habit to keep: **always know what your loss reads when the model has collapsed**, so you can recognise that number when it appears.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Pen and paper first. All the arithmetic is small on purpose.

1. Margin m = 1.0. A triplet has d(a,p) = 0.4 and d(a,n) = 1.1. Compute the triplet loss. Does this triplet contribute anything to training?
2. Margin m = 1.0. Compute contrastive loss for three pairs: a same pair at d = 0.6, a different pair at d = 0.6, and a different pair at d = 1.4.
3. Margin m = 0.5. A triplet has d(a,p) = 5.0 and d(a,n) = 6.0. Compute the triplet loss, then say what contrastive loss would charge the same-person pair, and explain in one sentence why the two disagree so violently.
4. A colleague reports that their triplet-loss training has settled at exactly 0.30, the value of their margin, and is not moving. What has happened, and what one measurement confirms it?
5. Your door system currently accepts a face if the nearest stored embedding is within 0.50. Security reports two lookalike break-ins this month. You lower the cut-off to 0.35. Name the new problem you have created and one thing you would measure before shipping the change.`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `Check every step against your own working, not only the final number.

1. Triplet loss = max(0, 0.4 − 1.1 + 1.0) = max(0, **0.3**) = **0.3**. Yes, it contributes: the loss is above zero, so it has a slope, and training will push the negative further away and the positive nearer. The gap is 0.7 and the margin demanded 1.0, so it fell 0.3 short — and 0.3 is exactly what it was charged.
2. Same pair at d = 0.6 pays d² = **0.36**. Different pair at d = 0.6 pays (1.0 − 0.6)² = 0.4² = **0.16**. Different pair at d = 1.4 pays max(0, 1.0 − 1.4)² = 0² = **0.000** — already past the margin, so it is silent.
3. Triplet loss = max(0, 5.0 − 6.0 + 0.5) = max(0, −0.5) = **0.0**: satisfied, since the positive is a full 1.0 nearer than the negative and only 0.5 was required. Contrastive loss on the same-person pair would charge d² = 5.0² = **25.0**, an enormous penalty. They disagree because contrastive makes an *absolute* demand — same people must sit at distance zero — while triplet makes only a *relative* one, that the right person be nearer than the wrong one.
4. The embedding has **collapsed**: the model maps every input to the same point, so d(a,p) = d(a,n) = 0 and every triplet reads max(0, 0 − 0 + m) = m exactly. A loss frozen at precisely the margin is the signature. Confirm it by embedding a couple of hundred photos and printing the average distance between random pairs — a collapsed model gives approximately 0.00. The usual cause is mining the hardest negatives, where mislabelled duplicates and true lookalikes push the model into giving up.
5. Lowering the cut-off makes the system stricter, so it will now reject some genuine employees who previously got in — the break-ins stop, but people start getting stuck at the door, and that failure is far more visible and more expensive in complaints than the one you fixed. Before shipping, measure both sides on held-out data: at 0.35, what fraction of genuine employees are rejected, and what fraction of stranger attempts are accepted. Sweep the cut-off across a range and look at both curves together, because there is no single correct value — only a trade you choose deliberately.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. Read this once you are comfortable with the two losses, not before.

- **Honest status: you would rarely hand-write a triplet loss today.** Two newer families replaced it for most production work. Both keep the same goal — a space where distance means similarity — and both remove the mining problem. Knowing triplet loss is still how you understand either of them, because both are answers to its specific weakness.
- **ArcFace and CosFace.** These keep a normal classifier over all *training* identities but add a margin to the true class's score, so the model must be right with room to spare; you then throw the classifier away and keep the embedding. The gain is that every photo in the batch contributes, so no mining is needed at all.
- **InfoNCE, and the SimCLR and CLIP models built on it.** Score one positive against every other item in a large batch as negatives, then apply softmax across those scores. It is triplet loss with hundreds of negatives at once instead of one, which is precisely where the mining problem dissolves, and it is what trains modern image and sentence embedding models.
- **What the space itself means.** These losses shape an embedding space; what such a space *is*, and why nearby vectors mean related things, is taught in the deep-learning module *Embeddings: Meaning as Vectors*.
- **Searching billions of them.** Finding the nearest stored embedding by comparing against every row stops working past a few million rows. The data structures that fix it are covered in *Embeddings, Vector Databases & Semantic Search*.`,
    },
  ],
  quiz: [
    {
      question: 'Why is a 400-slot classifier the wrong tool for an office door that unlocks for employees?',
      options: [
        { text: 'Classifiers cannot handle more than a few hundred classes', explanation: 'They handle far more than that. The class count is not the blocker.' },
        {
          text: 'The list of employees keeps changing, and each new hire would need a new output slot plus a full retrain - and the model can never answer "none of these"',
          explanation: 'Correct. An embedding sidesteps both problems: enrolling someone is one forward pass and one database row, and "nobody matched" is just "the nearest row was too far away".',
        },
        { text: 'Classifiers cannot be run fast enough on a door camera', explanation: 'Speed is not the issue - the embedding model is a comparable amount of computation. The problem is that the answer list will not hold still.' },
      ],
      correct: 1,
    },
    {
      question: 'In contrastive loss, a different-people pair sits at distance 3.0 with a margin of 1.5. What does it contribute?',
      options: [
        {
          text: 'Exactly 0.000, and therefore no slope - the pair is already far enough apart and the loss has stopped pushing',
          explanation: 'Correct. max(0, 1.5 − 3.0) is max(0, −1.5) = 0. That clipping is the design: without it the model would keep shoving already-distant pairs apart forever.',
        },
        { text: 'A small penalty that keeps shrinking as the distance grows', explanation: 'That would mean the loss never lets go. It is exactly zero past the margin, not merely small.' },
        { text: '2.25, since (1.5 − 3.0) squared is 2.25', explanation: 'Squaring is applied after the max, not before. The max clips the negative value to zero first, so nothing is squared.' },
      ],
      correct: 0,
    },
    {
      question: 'A triplet has d(a,p) = 20.0 and d(a,n) = 22.5, with margin 1.5. What is the triplet loss?',
      options: [
        { text: '20.0 - the positive is enormously far from the anchor', explanation: 'Triplet loss never looks at either distance on its own. Only the gap between them appears in the formula.' },
        {
          text: '0.0 - the positive is 2.5 nearer than the negative, which clears the 1.5 margin',
          explanation: 'Correct: max(0, 20.0 − 22.5 + 1.5) = max(0, −1.0) = 0. That is the point of a relative demand - the absolute scale of the space is left alone.',
        },
        { text: '1.5 - the loss equals the margin when the demand is met', explanation: 'The loss equals the margin only when both distances are equal, which is what a collapsed embedding produces. Here they differ by 2.5.' },
      ],
      correct: 1,
    },
    {
      question: 'Triplet-loss training settles at exactly 0.2000, the value of the margin, and stops moving. What has happened?',
      options: [
        { text: 'Training has converged - the loss cannot go below the margin', explanation: 'It certainly can. A satisfied triplet pays exactly zero, so a healthy run pushes the average well below the margin.' },
        {
          text: 'The embedding has collapsed: every input maps to the same point, so d(a,p) = d(a,n) = 0 and every triplet reads max(0, 0 − 0 + m) = m',
          explanation: 'Correct. Confirm it by embedding a few hundred inputs and printing the average distance between random pairs - a collapsed model gives about 0.00. Mining the hardest negatives is the usual cause.',
        },
        { text: 'The learning rate is too small to move past this point', explanation: 'A learning rate does not produce a value that lands on the margin exactly. That precise number identifies the failure.' },
      ],
      correct: 1,
    },
    {
      question: 'Why does randomly sampling triplets fail to train a model?',
      options: [
        { text: 'Random triplets are usually mislabelled', explanation: 'Mislabelling is the danger with the HARDEST negatives, not with random ones. Random triplets are mostly correctly labelled and mostly useless for a different reason.' },
        {
          text: 'Most random triplets already satisfy the margin, so they cost exactly zero and produce no slope - and the printed loss looks excellent while nothing is learned',
          explanation: 'Correct. The measured figure in this module was 74% zero-loss triplets on a partly-trained model, and that fraction rises as the model improves, so the problem gets worse over time.',
        },
        { text: 'Random triplets make the batches too large to fit in memory', explanation: 'Memory is unaffected by how the three inputs were chosen. The problem is that the chosen ones have nothing to teach.' },
      ],
      correct: 1,
    },
    {
      question: 'What is the practical difference between contrastive and triplet loss?',
      options: [
        { text: 'Contrastive is for images and triplet is for text', explanation: 'Neither is tied to a data type. Both only ever see distances between embeddings, whatever produced them.' },
        {
          text: 'Contrastive makes absolute demands - same pairs at distance 0, different pairs at least m apart - while triplet only demands that the positive be nearer than the negative by m',
          explanation: 'Correct. The relative demand is gentler: a genuinely unusual photo may sit far from its own identity without being punished, as long as it still sits nearer that identity than any stranger.',
        },
        { text: 'Triplet loss produces calibrated probabilities and contrastive does not', explanation: 'Neither produces a probability at all. Both output a distance, and turning that into a decision needs a cut-off chosen separately.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why would you train a face-recognition system with triplet loss rather than a softmax classifier over employees?',
      answer:
        'Because the label set is open and keeps changing. A classifier needs one output slot per person, so every new hire means reshaping the model and retraining it, every departure raises the question of removing a slot, and most employees supply only one or two photos, which is not enough to learn a class. It also cannot say "none of these" - it must return one of its slots, so a stranger is confidently identified as an employee. Triplet loss instead trains an embedding: a function mapping any face to a fixed-length vector where distance means dissimilarity. Enrolling someone becomes one forward pass and one database row. Verification is one distance against a cut-off, recognition is a nearest-neighbour lookup plus a cut-off test, and the cut-off is what gives you "nobody matched". The model itself never changes as the roster does.',
      isCaseBased: false,
    },
    {
      question: 'Explain contrastive loss and why the margin term is essential rather than decorative.',
      answer:
        'Contrastive loss trains on pairs labelled same or different. For a same pair it charges d squared, which pulls the two embeddings together and only reaches zero when they coincide. For a different pair it charges max(0, m − d) squared, which pushes them apart only while the distance is below the margin m. Past the margin the max clips to exactly zero, so the pair contributes no loss and no slope. That clipping is the design, not a detail. Without it, every different pair would keep being pushed further apart forever, so the model would spend most of its capacity on negatives it already separated in the first epoch, and the space would be stretched out of shape by pairs that were never in question. The margin is also the only real hyperparameter, and it is scale-dependent, which is why embeddings are usually normalised to length 1 first so that a margin near 1 transfers between datasets.',
      isCaseBased: false,
    },
    {
      question: 'Contrastive versus triplet loss - what actually differs, and why does it matter?',
      answer:
        'Contrastive makes two absolute demands: same pairs should sit at distance zero, and different pairs at least a margin apart, in a space whose scale nobody chose. Triplet loss makes one relative demand instead: given an anchor, a positive and a negative, the positive must be nearer than the negative by at least the margin. No absolute distance appears anywhere in the formula. That matters because the absolute demand is stronger than the real requirement. A blurry or unusual photo may legitimately sit far from the rest of its own identity; triplet loss is satisfied as long as it still sits nearer that identity than any stranger, while contrastive would keep hammering it toward distance zero and distort the surrounding space to comply. The price of the relative version is that you must now choose triplets from roughly N cubed possibilities, which is the mining problem, and mining ends up mattering more than the loss formula itself.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague trains a face embedding with triplet loss. The loss drops fast, flattens near zero after two epochs, and the model is useless in evaluation. Diagnose it.',
      answer:
        'A loss near zero with a useless model almost always means the batches are full of already-satisfied triplets. Triplet loss is exactly zero once the negative clears the margin, so a random triplet from a partly-trained model contributes nothing at all - I would expect roughly three quarters of them to be zero, and that fraction climbs as the model improves, so the problem worsens over time. The average of a batch of zeros is a beautiful-looking number and a zero-sized update. The confirming measurement takes minutes: log the fraction of triplets in each batch with non-zero loss. If it is falling toward zero while the loss also falls, that is the diagnosis, and it is a much better training signal to watch than the loss itself. The fix is mining. Semi-hard negatives, meaning further than the positive but still inside the margin, are the classic choice - wrong enough to produce a real slope, not so wrong that the negative is probably a labelling error. Practically I would restructure batches as P identities with K photos each, embed the batch once, and mine triplets from the resulting distance table, which keeps the mined negatives current as the model moves and needs no offline index. I would also check the opposite failure before shipping: if the loss instead freezes at exactly the margin value, the embedding has collapsed to a point and the mining is too aggressive.',
      isCaseBased: true,
    },
    {
      question: 'Case: your door-access system uses an embedding with a 0.50 accept cut-off. Security reports two lookalike break-ins this month and asks you to make it stricter. Walk me through the decision.',
      answer:
        'First I would separate the two things that can be changed, because they have very different costs. The model produces embeddings; the cut-off turns a distance into a decision. Only the second can be changed in production in seconds, so it is where I would start. Lowering the cut-off from 0.50 to 0.35 would have rejected the break-ins - in the worked example the stranger matched at 0.424 - but it also rejects any genuine employee whose photo embeds worse than 0.35, and being locked out of your own office is a far more visible and more expensive failure than a rare lookalike getting in. So this is a trade, not a fix, and I would not choose the number by intuition. I would take held-out data, sweep the cut-off across a range, and plot two curves together: the fraction of genuine employees rejected, and the fraction of stranger attempts accepted. Then I would ask security what rate of each they can live with, and read the cut-off off the curves rather than guessing it. Two further points I would raise. The break-ins may indicate a model problem rather than a threshold problem: the quantity that matters is the gap between the correct identity and the nearest wrong one, and if that gap is routinely small then no cut-off is safe and the embedding needs retraining, probably with harder negatives. And I would add a second factor for high-value doors, such as a badge tap, so that the face is a check rather than the whole decision.',
      isCaseBased: true,
    },
    {
      question: 'What is triplet mining, and why does the mining strategy matter more than the loss formula?',
      answer:
        'Mining is choosing which triplets to train on rather than sampling them at random. It matters because triplet loss is exactly zero once a triplet satisfies the margin, so a random triplet from a partly-trained model usually contributes nothing - measured at about 74% zero in this module - and that fraction rises as training improves. Mining the hardest negative, the closest photo of a different person, gives the largest slope per triplet but is dangerous: the closest "different" person is very often a mislabelled duplicate or a genuine lookalike, and asking the model to separate two identical-looking faces pushes it toward mapping every face to the same point. Semi-hard negatives are the safe middle: further than the positive but still inside the margin, so there is a real slope and the negative is unlikely to be a labelling error. In practice batches are built as P identities with K photos each and triplets are mined inside the batch from its distance table, which needs no offline index and keeps the negatives current.',
      isCaseBased: false,
    },
    {
      question: 'Where else does this same pattern show up, beyond faces?',
      answer:
        'Anywhere the question is "are these two things the same or related?" over a set of things that keeps growing. Speaker verification uses it to confirm a caller from a short recording without a class per customer. Product-image search embeds a photo and looks up the nearest catalogue item, which works even for products added this morning. Person re-identification follows one shopper across store cameras, where the identities are not known in advance at all. Signature and fingerprint verification are the same shape. Duplicate detection - finding whether a support ticket or an image has been seen before - is the same shape too. The common structure is worth naming: the model produces an embedding, similarity is a distance, the decision is a cut-off on that distance, and enrolling a new item is inserting one row rather than retraining. The moment you notice that the class list will change after deployment, this family of losses is the one to reach for.',
      isCaseBased: false,
    },
    {
      question: 'Both contrastive and triplet loss have a region where the loss is exactly zero. Is that a strength or a weakness?',
      answer:
        'Both. It is a strength because it stops the loss from making demands beyond what the task needs. Once two different identities are a margin apart, pushing them further apart buys nothing and would consume capacity that hard pairs need, so the flat zero region is what keeps the geometry sensible. It is the same reason hinge loss ignores points comfortably past its margin. It becomes a weakness the moment most of your data lands in that region, which is exactly what happens after an epoch or two: batches fill with zeros, the average loss looks excellent, and the updates are of size zero. So the flat region is what makes the loss well-behaved and also what forces mining to exist. The practical consequence is that the loss value is a poor progress signal for this family, and the metric to log is the fraction of pairs or triplets in each batch that are still non-zero.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Why an embedding instead of a classifier', back: 'A classifier needs a fixed list of classes and a new output slot plus a retrain for every new identity, and it can never answer "none of these". An embedding maps any input to a vector where distance means dissimilarity, so enrolling someone is one forward pass and one database row.' },
    { front: 'Contrastive loss in one line', back: 'For a pair with label y: y·d² + (1 − y)·max(0, m − d)². Same pairs are pulled together with no margin; different pairs are pushed apart only until d reaches m, then charged exactly zero.' },
    { front: 'Triplet loss in one line', back: 'max(0, d(a,p) − d(a,n) + m) over an anchor, a positive and a negative. A purely relative demand: the positive must be nearer than the negative by at least m. No absolute distance appears.' },
    { front: 'Absolute vs relative demand', back: 'Contrastive insists same pairs sit at distance 0 and different pairs at least m apart. Triplet only insists on the gap. So d(a,p) = 20 and d(a,n) = 22.5 costs triplet nothing, while contrastive would charge 400 for the same pair.' },
    { front: 'Why the flat zero region exists', back: 'Once a pair or triplet clears the margin, further separation buys nothing, so the loss clips to exactly zero and stops pushing. Same idea as hinge loss. It keeps the space sensible - and it is also what causes the mining problem.' },
    { front: 'Why random triplets do not train', back: 'Most random triplets already satisfy the margin, so they cost exactly zero and produce zero slope - measured here at 74% on a partly-trained model, rising as the model improves. The printed loss looks excellent while nothing is learned.' },
    { front: 'Hard vs semi-hard negatives', back: 'Hardest negative = closest photo of a different person: maximum slope, but usually a mislabelled duplicate or a true lookalike, which collapses the embedding. Semi-hard = further than the positive but still inside the margin: real slope, unlikely to be a labelling error. FaceNet used semi-hard.' },
    { front: 'A loss frozen at exactly the margin', back: 'That is a collapsed embedding: every input maps to one point, so d(a,p) = d(a,n) = 0 and every triplet reads max(0, 0 − 0 + m) = m. Confirm by printing the average distance between random pairs - it will be about 0.00.' },
  ],
  mindmapMarkdown: `- Contrastive & Triplet Loss
  - Why not a classifier
    - Fixed class list will not hold still
    - New hire = new output slot + full retrain
    - One or two photos per person
    - Cannot answer "none of these"
  - The three words
    - Vector: an ordered list of numbers
    - Embedding: the vector a model gives one input
    - Distance: Pythagoras between two vectors
  - The goal
    - Same thing lands near, different thing lands far
    - Verification = one distance vs a cut-off
    - Recognition = nearest stored row + cut-off
    - The family name is metric learning
  - Contrastive loss
    - Trains on pairs labelled same or different
    - Same: d squared, pulls forever
    - Different: max(0, m − d) squared
    - Past the margin: exactly 0, no slope
    - Margin is scale-dependent, so normalise first
  - Triplet loss
    - Anchor, positive, negative
    - max(0, d(a,p) − d(a,n) + m)
    - Relative demand, no absolute distance
    - d = 20 vs 22.5 costs nothing
    - Cost: you must choose triplets, N cubed of them
  - The door system
    - One model, 128 numbers per face
    - Enrol = one forward pass + one row
    - New employee: nothing retrained
    - Cut-off is a business decision
    - What matters is the gap to the nearest wrong identity
  - Triplet mining
    - 74% of random triplets already satisfied
    - Zero loss, zero slope, pretty curve
    - Hardest negative: max slope, often mislabelled
    - Semi-hard: further than positive, inside margin
    - Batch mining: P identities x K photos
  - The collapse
    - Loss frozen at exactly the margin
    - Every input maps to one point
    - Check: average distance between random pairs
    - Cause: mining the hardest negatives
  - Replaced today by
    - ArcFace / CosFace: margin on the class score, no mining
    - InfoNCE: one positive against the whole batch
    - SimCLR and CLIP are built on it`,
}

export default m
