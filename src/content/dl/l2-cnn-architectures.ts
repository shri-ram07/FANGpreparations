import type { Module } from '../types'

const m: Module = {
  id: 'dl-l2-cnn-architectures',
  subjectId: 'dl',
  level: 2,
  title: 'LeNet to ResNet: The Architectures That Mattered',
  whyItMatters:
    'This module is not a list of model names to memorise. Each design below is one idea that fixed one measurable problem, and every one of those ideas is a piece of arithmetic you can do on paper in under a minute: how many weights a layer costs, how big a region it sees, how strong a gradient still is after ten layers. Once you can do that arithmetic you can read any new architecture diagram and say what it is buying and what it is paying. That is the skill. The names are just labels on it.',
  assumes: [
    'Read *CNNs: Convolution, Pooling & Receptive Fields* first. This module assumes you already know what a convolution filter is, what padding and stride do, and how to count the weights in one convolution layer.',
    'From that module, one formula is used constantly here: a convolution layer with k by k filters, C_in input channels and C_out output channels has k * k * C_in * C_out weights.',
    'You can read a Python for loop and a multiplication.',
    'School maths only. No calculus notation is used in the main body.',
  ],
  estMinutes: 30,
  sections: [
    {
      type: 'intuition',
      title: 'The first networks that worked, in one short section',
      md: `In 1998 a network read handwritten digits off bank cheques. It was tiny: about **60 thousand** weights, arranged as convolution, then pooling, then convolution, then pooling, then a couple of ordinary dense layers at the end. It worked, and then almost nothing happened for fourteen years.

Nothing happened because the idea was not the missing piece. Three other things were missing.

- **Data.** In 2012 a labelled image set with **1.2 million** photos existed. In 1998 it did not.
- **Hardware.** Graphics cards could finally do the multiplications fast enough to train a network with 60 *million* weights in days instead of years.
- **ReLU.** The old activation functions squashed every value into a range like 0 to 1, and in a deep stack that squashing made the learning signal shrink toward nothing. ReLU, which is just \`max(0, x)\`, does not squash the positive side at all, so the signal survives more layers.

The 2012 network that put these together cut the error rate on that 1.2 million photo benchmark from about 26% to about 15%. That is the whole story of the early years: **the idea was old, the fuel was new.** Everything after this is a genuinely new idea, and each one gets its own section.`,
    },
    {
      type: 'visual',
      component: 'Plot',
      props: {
          title: 'ImageNet top-5 error, the numbers that drove the architecture race',
          notice: 'These are the published ILSVRC results. AlexNet at 16.4% in 2012 was the jump that started deep learning in vision; by 2015 ResNet-152 was at 3.57%, below the often-quoted ~5% human benchmark. The interesting part is HOW: VGG got there by stacking more of the same, GoogLeNet by widening, ResNet by adding skip connections so depth stopped hurting.',
          kind: 'bar',
          yLabel: 'top-5 error (%)',
          unit: '%',
          bars: [
            { label: 'AlexNet 2012', value: 16.4, color: 0 },
            { label: 'ZFNet 2013', value: 11.7, color: 1 },
            { label: 'VGG-16 2014', value: 7.3, color: 2 },
            { label: 'GoogLeNet 2014', value: 6.7, color: 3 },
            { label: 'ResNet-152 2015', value: 3.57, color: 4 },
          ],
        },
    },
    {
      type: 'intuition',
      title: 'Idea one: many small filters beat one big filter',
      md: `Here is the question a 2014 design answered. You want a layer that can see a **5 by 5** patch of the image at once, because a feature like a corner does not fit inside a 3 by 3 patch. You have two ways to build it.

- **Design A:** one convolution layer with 5 by 5 filters.
- **Design B:** two convolution layers stacked, each with 3 by 3 filters.

Do these even see the same amount of image? Yes, and here is why. One 3 by 3 filter looks at one pixel plus one pixel of margin on every side. Stack a second 3 by 3 layer on top and each of *its* inputs already summarised a 3 by 3 patch, so the second layer's window reaches one more pixel out on every side. One pixel plus 1 + 1 of margin is 3. Plus 1 + 1 more is 5. So **two stacked 3 by 3 layers see a 5 by 5 region**, the same as Design A.

They see the same region. So the choice comes down to which one costs fewer weights, and that is arithmetic, not opinion. The next snippet does it.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Design A versus Design B, counted',
      code: `C = 64                            # channels going in, and channels coming out
one_5x5 = 5 * 5 * C * C           # Design A: 25 weights per input-output channel pair
two_3x3 = 2 * (3 * 3 * C * C)     # Design B: 9 weights per pair, in two separate layers
print("one 5x5 layer :", one_5x5)
print("two 3x3 layers:", two_3x3)
print("saving        :", round(100 * (1 - two_3x3 / one_5x5)), "%")

size = 1                          # start from a single output pixel and grow backwards
for layer in range(2):            # walk back down through the two 3x3 layers
    size = size + 2               # each 3x3 layer reaches one extra pixel on each side
print("two stacked 3x3 layers see a", size, "x", size, "region")`,
      annotations: {
        1: 'Sets both the input and output channel count to 64 so the two designs are compared at the same width. Any number works; the ratio does not depend on it.',
        2: 'Applies the weight formula from the CNN mechanics module with k = 5: 5 * 5 * 64 * 64. This is the whole cost of Design A.',
        3: 'Same formula with k = 3, then multiplied by 2 because Design B is two layers. 3 * 3 is 9, so each layer is much cheaper than a 5 by 5 one.',
        4: 'Prints Design A. Real output: 102400.',
        5: 'Prints Design B. Real output: 73728, which is smaller even though it is two layers.',
        6: 'Turns the two numbers into a percentage saved. round() cuts the decimals. Real output: 28 %.',
        8: 'Starts the receptive-field count at 1, meaning one output pixel before we walk backwards through any layer.',
        9: 'range(2) runs the body twice, once per 3 by 3 layer.',
        10: 'Each 3 by 3 layer adds one pixel of reach on the left and one on the right, so the width grows by 2 per layer.',
        11: 'Prints the region the stack sees. Real output: two stacked 3x3 layers see a 5 x 5 region.',
      },
    },
    {
      type: 'note',
      md: `**73,728 against 102,400. Same 5 by 5 view, 28% fewer weights.** That number is the whole lesson, and it gets better with depth: three stacked 3 by 3 layers see a 7 by 7 region for 45% fewer weights than one 7 by 7 layer. There is a second, free benefit — Design B has an activation function *between* its two layers, and Design A has nowhere to put one, so Design B can represent shapes Design A cannot. This is why almost every convolution you will ever see in a modern network is 3 by 3.`,
    },
    {
      type: 'note',
      md: `A different 2014 design answered the same question the opposite way: instead of choosing one filter size per layer, run **several filter sizes side by side in the same layer** — a 1 by 1, a 3 by 3 and a 5 by 5 all looking at the same input — and glue their outputs together, so the network learns for itself which size mattered. It works, and it is worth knowing the shape of the idea, but it is not the arithmetic you will be asked to reproduce.`,
    },
    {
      type: 'intuition',
      title: 'Idea two, part one: the problem, before anyone had a fix',
      md: `By 2015 everyone believed more layers meant a better network. Then someone ran the obvious control experiment: take one plain convolution network with 20 layers, build the same thing with 56 layers, train both on identical data, and compare.

The 56-layer network was **worse**. That alone is not surprising — a bigger model memorising the training data and failing on new data is a familiar story called overfitting. But that is not what happened, and the detail is the entire point:

- The 56-layer network was worse on the **training** data too. It could not even memorise what the 20-layer one memorised.
- Overfitting means the opposite: training error goes *down* while validation error goes up. Here training error went **up**. So it is not overfitting.
- It is also not a size problem. A 56-layer network *contains* a 20-layer network: take the first 20 layers, and set the remaining 36 to just pass their input straight through unchanged. That setting of the weights exists.
- So the good answer is sitting somewhere in the network's own set of possible weights, and **gradient descent never finds it**.

That last line is the diagnosis, and it has a name worth keeping straight. **Training error high means the optimiser failed. Training error low but validation error high means generalisation failed.** These are different illnesses with different medicines, and mixing them up is the classic error at the end of this module.`,
    },
    {
      type: 'intuition',
      title: 'Idea two, part two: make "pass it through unchanged" easy',
      md: `Read the diagnosis again: the extra layers needed to learn "pass the input through unchanged", and apparently that is hard for gradient descent to learn. So do not ask them to learn it. Change what a block computes so that passing the input through is the *default*.

An ordinary block takes an input **x** and produces some output. A **residual block** produces \`F(x) + x\` instead, where F is the ordinary convolution stack and the \`+ x\` is literally adding the block's own input back onto its output. That extra \`+ x\` is called a **skip connection**: no weights, no filters, just an addition.

- To make the block do nothing, the weights only have to push **F(x) toward 0**. Pushing weights toward zero is the single easiest thing an optimiser does — it is where they start, and weight decay is already dragging them there.
- Compare that with what the plain block had to do: hit the identity function *exactly*, using nine weights per channel pair, through an activation function. Much harder target.
- So the block now learns the **correction** to its input rather than the whole answer. If no correction is needed, it outputs no correction.

Deep networks got a lot deeper immediately: 152 layers, trained successfully, in the year that a plain stack could not clear 30.`,
    },
    {
      type: 'intuition',
      title: 'Why the addition also rescues the gradient',
      md: `There is a second effect, and it is the one interviewers ask about. Training works by sending a learning signal backwards from the loss at the top of the network down to the weights at the bottom. Every block the signal passes through **multiplies** it by some factor of that block's own.

- If a block's factor is 0.3, the signal that arrives below it is 0.3 as strong. Two blocks down, 0.09. Ten blocks down, six millionths.
- A signal six millionths as strong is, for practical purposes, no signal. The bottom layers barely move. That is exactly the "cannot even fit the training data" symptom from two sections ago.
- Now add the skip. The block's output is \`F(x) + x\`. The \`x\` part passes the signal down completely untouched — a factor of exactly 1 — and the \`F(x)\` part contributes its own 0.3 on top. So the block's factor becomes **1 + 0.3**, not 0.3.
- Multiplying by numbers below 1 shrinks toward zero fast. Multiplying by numbers at or above 1 cannot shrink at all. That is the whole mechanism.

The next snippet runs both cases for ten blocks so you can see the two numbers side by side.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same ten blocks, with and without the skip',
      code: `local = 0.3                        # the factor one block applies to the signal passing back
g_plain = 1.0                      # signal strength at the top, before any block, in a plain net
g_skip = 1.0                       # same starting strength, in a net where every block has a skip
for block in range(10):            # walk downward through ten blocks
    g_plain = g_plain * local      # plain block: multiply by 0.3 and nothing else
    g_skip = g_skip * (1 + local)  # skip block: the + x path contributes a factor of 1 as well
print("plain, 10 blocks down:", round(g_plain, 8))
print("skip , 10 blocks down:", round(g_skip, 3))`,
      annotations: {
        1: 'One number standing in for how much a single block weakens the backward signal. 0.3 is a plausible value; any value below 1 shows the same collapse.',
        2: 'The signal starts at full strength, 1.0, at the top of the plain network.',
        3: 'An identical starting point for the network built from residual blocks, so the only difference is what happens inside the loop.',
        4: 'range(10) repeats the body ten times, once per block, moving downward toward the input.',
        5: 'The plain case: each block multiplies the running strength by 0.3.',
        6: 'The residual case: the factor is 1 + 0.3 = 1.3, because the skip path passes the signal through with a factor of exactly 1 and F adds 0.3 on top.',
        7: 'Prints the plain result. Real output: 5.9e-06, which is 0.3 multiplied by itself ten times. Effectively dead.',
        8: 'Prints the residual result. Real output: 13.786. It grew instead of vanishing, so the bottom blocks still get a real signal.',
      },
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Where the learning signal ends up: five blocks, with and without skips',
        notice:
          'Left column: the blocks of one network, the block nearest the loss on top and the block nearest the input at the bottom. Right column: how strong the learning signal is when it reaches that block. Watch the bottom row change between the two halves.',
        leftLabel: 'block (signal travels downward)',
        rightLabel: 'signal arriving',
        frames: [
          {
            note: 'A plain five-block stack. The signal starts at the loss end with full strength 1.00 and has not moved yet.',
            stack: [
              { name: 'block 5 (nearest the loss)', to: 'g5' },
              { name: 'block 4', to: 'g4' },
              { name: 'block 3', to: 'g3' },
              { name: 'block 2', to: 'g2' },
              { name: 'block 1 (nearest the input)', to: 'g1' },
            ],
            heap: [
              { id: 'g5', value: '1.00', label: 'full' },
              { id: 'g4', value: 'waiting' },
              { id: 'g3', value: 'waiting' },
              { id: 'g2', value: 'waiting' },
              { id: 'g1', value: 'waiting' },
            ],
          },
          {
            note: 'Each plain block multiplies the signal by 0.3. By the bottom block the signal is 0.008 — over a hundred times weaker than at the top, so block 1 barely learns. Now imagine 56 blocks instead of 5.',
            stack: [
              { name: 'block 5 (nearest the loss)', to: 'g5' },
              { name: 'block 4', to: 'g4' },
              { name: 'block 3', to: 'g3' },
              { name: 'block 2', to: 'g2' },
              { name: 'block 1 (nearest the input)', to: 'g1', danger: true },
            ],
            heap: [
              { id: 'g5', value: '1.00' },
              { id: 'g4', value: '1.00 x 0.3 = 0.30' },
              { id: 'g3', value: '0.30 x 0.3 = 0.09' },
              { id: 'g2', value: '0.09 x 0.3 = 0.027' },
              { id: 'g1', value: '0.027 x 0.3 = 0.008', label: 'dead' },
            ],
          },
          {
            note: 'Same five blocks, same 0.3, but every block now computes F(x) + x. The + x path carries the signal with a factor of exactly 1, so the block factor is 1.3 rather than 0.3.',
            stack: [
              { name: 'block 5 + skip', to: 'g5' },
              { name: 'block 4 + skip', to: 'g4' },
              { name: 'block 3 + skip', to: 'g3' },
              { name: 'block 2 + skip', to: 'g2' },
              { name: 'block 1 + skip', to: 'g1' },
            ],
            heap: [
              { id: 'g5', value: '1.00', label: 'full' },
              { id: 'g4', value: '1.00 x 1.3 = 1.30', label: 'intact' },
              { id: 'g3', value: '1.30 x 1.3 = 1.69', label: 'intact' },
              { id: 'g2', value: '1.69 x 1.3 = 2.20', label: 'intact' },
              { id: 'g1', value: '2.20 x 1.3 = 2.86', label: 'intact' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Idea three: split a convolution into two cheaper halves',
      md: `The last idea is about running on a phone, where the weight count is the budget. A standard convolution does two jobs at the same time in one step:

1. It looks at a **k by k patch of space**, so it can detect shapes.
2. It **mixes all the input channels together**, so it can combine, say, a red-edge detector with a blue-blob detector.

Doing both at once is what makes the cost \`k * k * C_in * C_out\` — a product of four things. A **depthwise separable convolution** does the two jobs in two separate, much cheaper steps:

- **Depthwise step:** one k by k filter per input channel, each filter looking only at its own channel. Spatial job done, no mixing. Cost: \`k * k * C_in\`.
- **Pointwise step:** a 1 by 1 convolution, which looks at a single pixel but across all channels at once. Mixing job done, no spatial reach. Cost: \`C_in * C_out\`.

Notice what happened to the arithmetic. The four-way product became a **sum of two much smaller products**. That is where the saving comes from, and the snippet puts a number on it.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'What splitting the convolution actually saves',
      code: `k, C_in, C_out = 3, 256, 256      # 3x3 filters, 256 channels in, 256 channels out
standard = k * k * C_in * C_out    # one layer doing space and channel mixing together
depthwise = k * k * C_in           # step 1: one 3x3 filter per channel, no mixing at all
pointwise = C_in * C_out           # step 2: a 1x1 filter, mixes channels at a single pixel
separable = depthwise + pointwise  # the two steps replace the one standard layer
print("standard :", standard)
print("separable:", separable, "=", depthwise, "+", pointwise)
print("times smaller:", round(standard / separable, 1))`,
      annotations: {
        1: 'Assigns three values in one line: k = 3, C_in = 256, C_out = 256. Python allows this comma form, and it just means three separate assignments.',
        2: 'The standard cost from the CNN mechanics module: 3 * 3 * 256 * 256. Four numbers multiplied together.',
        3: 'The depthwise step has no C_out in it, because each filter stays on its own channel and produces one channel. So the cost is 3 * 3 * 256.',
        4: 'The pointwise step has no k in it, because a 1 by 1 filter covers exactly one pixel. So the cost is 256 * 256.',
        5: 'A plus, not a times. This single character is the reason the design is cheap.',
        6: 'Prints the standard layer. Real output: 589824.',
        7: 'Prints the split version and both of its halves. Real output: 67840 = 2304 + 65536. Note that the 1x1 mixing step is almost all of it.',
        8: 'Divides one by the other. Real output: 8.7, so the split version needs under one eighth of the weights for the same input and output shape.',
      },
    },
    {
      type: 'note',
      md: `Two honest caveats so the 8.7 does not get oversold. Fewer weights is **not** the same as more accurate — a split convolution is genuinely less expressive than a standard one, and the design trades a small amount of accuracy for a large amount of speed and memory. And 8.7 is not a universal constant: it depends on k and C_out. At k = 5 with 64 channels the same split saves 18 times. Do the arithmetic for your own numbers rather than quoting a figure.`,
    },
    {
      type: 'note',
      md: `**What you will actually do at work.** You will almost never build any of these from scratch. You download one that has already been trained on a million labelled photos, keep its convolution layers, replace the final classification layer with one shaped for your own labels, and continue training on your data. The early layers detect edges and textures, and an edge is an edge whether the photo is a cat or an X-ray, so those layers transfer to problems the original training set never contained. This is called transfer learning, and it is covered properly in *The CV Task Map: Detection & Segmentation*. The reason to understand the ideas above anyway is that they tell you which pretrained network to pick: a phone budget points at the split-convolution family, an accuracy target on a server points at the residual family.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: cost two designs for the same block, by hand',
      md: `A block receives a tensor with **256 channels** and must output **256 channels**, so that its output can be added onto the input by a skip connection. Two teams propose different insides. No code — do this with a pen.

**Design A: two 3 by 3 convolution layers, both 256 to 256.**
- One layer: 3 * 3 * 256 * 256. Take it in steps: 3 * 3 = 9, and 256 * 256 = 65,536. Then 9 * 65,536 = **589,824**.
- Two layers: 589,824 * 2 = **1,179,648** weights.

**Design B: squeeze to 64 channels, do the 3 by 3 there, expand back to 256.** Three layers: a 1 by 1 from 256 to 64, a 3 by 3 from 64 to 64, a 1 by 1 from 64 back to 256.
- First 1 by 1: 1 * 1 * 256 * 64 = **16,384**.
- The 3 by 3, now at the narrow width: 9 * 64 * 64 = 9 * 4,096 = **36,864**.
- Second 1 by 1: 1 * 1 * 64 * 256 = **16,384**.
- Total: 16,384 + 36,864 + 16,384 = **69,632** weights.

**Compare: 1,179,648 against 69,632. Design B is about 16.9 times cheaper**, and it has *more* layers, not fewer. The reason is that the expensive 3 by 3 layer was moved to where the channel count is small: at 256 channels it cost 589,824, at 64 channels it costs 36,864, which is 16 times less because both C_in and C_out shrank by 4. The two 1 by 1 layers that make the squeeze possible cost 16,384 each — cheap, because a 1 by 1 has no k * k factor at all. **Squeeze, do the expensive thing narrow, expand back.** Design B is what the deeper residual networks use in every block, and it is why a 50-layer one has fewer weights than a 16-layer network from the year before.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: "it got worse, so it must be overfitting"',
      md: `A student trains a plain 20-layer convolution network and reaches 8% training error and 12% validation error. They want better, so they stack it to 56 layers. Now they get **13% training error and 16% validation error**. Both went the wrong way.

**The wrong reasoning, which is extremely common:** *"The model got worse when I made it bigger. Bigger models overfit. So I need more regularisation."* They add dropout and stronger weight decay, retrain, and get **19% training error**. Worse again. They conclude deep networks are unreliable and give up.

**Why that reasoning is wrong.** Look only at the **training** error, and ignore validation entirely for a moment. It went from 8% to 13%. Overfitting has a fixed signature: training error goes **down** — the model is memorising *better*, not worse — while validation error goes up. Here training error rose. Whatever this is, it is not overfitting, so no amount of regularisation can help. In fact regularisation restricts the model further, which is why the third run was the worst of the three: they treated a starving patient by cutting the food.

**The right reading.** High training error means the optimiser could not fit the data. But the 56-layer network provably *can* represent the 20-layer solution — set the extra 36 layers to pass their input through. The solution exists and the optimiser cannot reach it, so this is an optimisation failure, and the fix is a structural one that makes "pass the input through" easy to learn: **add skip connections**, and let each block learn a correction instead of a whole answer.

Keep the two-way test. **Training error high: the optimiser is failing — change the architecture, the initialisation, or the learning rate. Training error low and validation error high: generalisation is failing — add regularisation or more data.** Do not reach for the second medicine when you have the first illness.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work each one on paper before reading the solution underneath it.

**1.** You need a layer that sees a 7 by 7 region, at 128 channels in and out. Compare one 7 by 7 layer with three stacked 3 by 3 layers.

*Solution.* Receptive field first: start at 1 and add 2 per 3 by 3 layer, giving 1 + 2 + 2 + 2 = 7. So three stacked 3 by 3 layers do see 7 by 7. Weights: one 7 by 7 layer is 49 * 128 * 128 = 49 * 16,384 = **802,816**. Three 3 by 3 layers are 3 * 9 * 16,384 = 27 * 16,384 = **442,368**. The stack costs 45% less for the same view, and gets two extra activation functions along the way.

**2.** A plain 20-block network weakens the backward signal by a factor of 0.5 per block. How strong is it at the bottom? What if every block had a skip?

*Solution.* Plain: 0.5 multiplied by itself 20 times, which is about **0.00000095**, roughly one millionth. The bottom blocks receive essentially nothing and stop learning, which shows up as high *training* error. With skips the per-block factor becomes 1 + 0.5 = 1.5, and 1.5 to the power 20 is about **3,325**. Not vanishing at all — if anything the opposite, which is why real residual networks put normalisation layers inside the block to keep the numbers under control.

**3.** Split a 5 by 5 convolution with 64 channels in and 64 out into a depthwise plus pointwise pair. What is the saving?

*Solution.* Standard: 5 * 5 * 64 * 64 = 25 * 4,096 = **102,400**. Depthwise: 5 * 5 * 64 = **1,600**. Pointwise: 64 * 64 = **4,096**. Together **5,696**, which is **18 times** smaller. Compare with the 8.7 times from the snippet: the saving grew because k grew from 3 to 5, so the standard version got more expensive while the pointwise half did not change.

**4.** A colleague reports: "I doubled the depth and validation accuracy dropped, so the model is overfitting." What single number do you ask for, and what are the two possible answers?

*Solution.* Ask for the **training** error of both models. If the deeper one has *lower* training error and worse validation error, they are right: it is overfitting, and regularisation or more data is the fix. If the deeper one has *higher* training error, it is an optimisation failure — the degradation problem — and regularisation would make it worse. Skip connections, a different initialisation, or a different learning rate are the fix. One number separates two opposite prescriptions.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Three refinements that matter only once the main ideas are solid.

- **The order of operations inside a residual block.** The activation function is applied *after* the addition, not before it. If you put an activation on the skip path, it would clamp the input as it passes through, and the whole point was that the path is untouched. A later variant moves the normalisation and activation to the *start* of F instead, leaving the skip path completely clean, and that version trains even deeper networks.
- **When the skip cannot be a plain addition.** \`F(x) + x\` only works if F(x) and x have the same shape. When a block changes the channel count or halves the spatial size, they do not match, so a 1 by 1 convolution is inserted on the skip path purely to fix the shape. It costs weights, so it is used only at the few places where the shape actually changes.
- **A residual network is not really one deep network.** Because every block offers two routes — through F, or around it via the skip — a network of n blocks contains 2 to the power n distinct paths from input to output, and it behaves more like a large collection of shallow networks than one very deep one. Measurements show most of the learning signal travels along the *short* paths. This is a genuinely different mental model from "skips help gradients flow", and both are true.`,
    },
  ],
  quiz: [
    {
      question: 'A 56-layer plain convolution network has HIGHER training error than a 20-layer one on the same data. What does that show?',
      options: [
        {
          text: 'Overfitting: the deeper model memorised noise',
          explanation: 'Overfitting means training error goes DOWN while validation error goes up. Here training error went UP, which is the opposite signature.',
        },
        {
          text: 'An optimisation failure: a good setting of the weights exists but gradient descent cannot find it',
          explanation:
            'Correct. The 56-layer network can represent the 20-layer one by passing the input through the extra 36 layers, so the solution provably exists. The optimiser simply does not reach it.',
        },
        {
          text: 'The deeper model does not have enough capacity',
          explanation: 'A deeper network contains the shallower one as a special case, so capacity only increases with depth. Capacity is not the constraint here.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Two stacked 3 by 3 convolution layers at 64 channels versus one 5 by 5 layer at 64 channels. Which sees more image, and which costs more weights?',
      options: [
        {
          text: 'They see the same 5 by 5 region, and the stacked version costs about 28% fewer weights',
          explanation: 'Correct: 73,728 against 102,400. Each 3 by 3 layer adds one pixel of reach on each side, so two of them reach 5 by 5.',
        },
        { text: 'The 5 by 5 layer sees more, and costs fewer weights', explanation: 'Neither half is right. The reach is identical, and 25 weights per channel pair is more than 9 + 9 = 18.' },
        { text: 'They see the same region and cost the same, so the choice does not matter', explanation: 'The reach is the same but the cost is not: 25 per channel pair against 18. That gap is the entire reason 3 by 3 became standard.' },
      ],
      correct: 0,
    },
    {
      question: 'In a residual block that computes F(x) + x, why is making the block do nothing easy?',
      options: [
        { text: 'Because the skip connection has its own weights that can be switched off', explanation: 'A skip connection has no weights at all. It is a plain addition, which is exactly why it is free.' },
        {
          text: 'Because doing nothing only requires F(x) to be near 0, and pushing weights toward zero is the easiest thing an optimiser does',
          explanation: 'Correct. Weights start near zero and weight decay pulls them there. A plain block would instead have to hit the identity function exactly, which is a much harder target.',
        },
        { text: 'Because the block is skipped entirely during training', explanation: 'Nothing is skipped. F still runs on every forward pass; the skip adds an extra path alongside it.' },
      ],
      correct: 1,
    },
    {
      question: 'Every block weakens the backward learning signal by a factor of 0.3. After ten plain blocks the signal is about six millionths of its original strength. What does a skip connection change?',
      options: [
        {
          text: 'The per-block factor becomes 1 + 0.3 instead of 0.3, because the skip path passes the signal through with a factor of exactly 1',
          explanation: 'Correct. Multiplying by numbers below 1 collapses toward zero; multiplying by numbers at or above 1 cannot. Ten blocks of 1.3 gives about 13.8 rather than 0.0000059.',
        },
        { text: 'It rescales the signal back to 1.0 at every block', explanation: 'Nothing rescales anything. A skip is an addition, not a normalisation step, and normalisation is a separate mechanism.' },
        { text: 'It stops the signal from being multiplied at all', explanation: 'The multiplication still happens block by block. What changes is the size of the factor, not the fact that there is one.' },
      ],
      correct: 0,
    },
    {
      question: 'A depthwise separable convolution replaces a 3 by 3 layer with 256 channels in and out. The weight count goes from 589,824 to what, and why?',
      options: [
        {
          text: '67,840: a 3 by 3 filter per channel (9 * 256 = 2,304) plus a 1 by 1 mixing layer (256 * 256 = 65,536)',
          explanation: 'Correct, about 8.7 times smaller. The four-way product k * k * C_in * C_out became a sum of two much smaller products.',
        },
        { text: '294,912: splitting the layer in two halves the cost', explanation: 'The saving is far bigger than half, and it does not come from cutting a kernel in two. It comes from separating the spatial job from the channel-mixing job.' },
        { text: '2,304: only the depthwise part is kept', explanation: 'Dropping the 1 by 1 would mean channels never mix at all, which breaks the layer. Both steps are required, and the 1 by 1 is in fact the larger of the two.' },
      ],
      correct: 0,
    },
    {
      question: 'A block takes 256 channels in and 256 out. Design A is two 3 by 3 layers at 256 channels. Design B squeezes to 64 with a 1 by 1, does the 3 by 3 at 64, then expands back to 256. Which is cheaper and by roughly how much?',
      options: [
        { text: 'Design A, because it has fewer layers', explanation: 'Design B has three layers to Design A’s two and is still far cheaper. Layer count is not what drives the cost; channel width is.' },
        {
          text: 'Design B, by about 17 times: 69,632 weights against 1,179,648',
          explanation: 'Correct. Moving the 3 by 3 to a width of 64 makes it 16 times cheaper (36,864 instead of 589,824), and the two 1 by 1 layers that enable the squeeze cost only 16,384 each.',
        },
        { text: 'They cost about the same, since Design B pays back its saving with two extra layers', explanation: 'The two extra layers are 1 by 1, which have no k * k factor, so they are cheap. The saving on the 3 by 3 dwarfs their cost.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'What is the degradation problem, and why is it not overfitting?',
      answer:
        'Train a plain convolution network at 20 layers and at 56 layers on the same data. The 56-layer version is worse, including on the training set. That single detail kills the overfitting explanation, because overfitting means low training error with high validation error, and here training error rose. It is not a capacity problem either: the deeper network can represent the shallower one by setting the extra layers to pass their input through unchanged, so the good solution provably exists in its parameter space. What fails is the optimiser’s ability to find it. The practical value of the distinction is that it selects the fix. High training error means changing the architecture, initialisation or learning rate. Regularisation would make it worse, because it restricts a model that is already failing to fit.',
      isCaseBased: false,
    },
    {
      question: 'Why does a skip connection help? Give both halves of the answer.',
      answer:
        'First, it makes the identity cheap to learn. A residual block computes F(x) + x, so a block that should do nothing only needs F(x) near zero — where weights start and where weight decay pulls them. A plain block would have to hit the identity function exactly through its weights and activation, which is far harder. Second, it keeps the backward learning signal alive. Every block multiplies that signal by a factor; in a plain stack those factors are typically below 1, so ten blocks of 0.3 leave about six millionths of the original signal and the bottom layers stop learning. With a skip, the untouched path contributes a factor of exactly 1, so the block factor is 1 + something rather than something, and a product of factors at or above 1 cannot collapse. The two halves are related: the vanishing signal is the mechanism, and the un-learnable identity is the symptom you actually measure.',
      isCaseBased: false,
    },
    {
      question: 'Why did the field standardise on 3 by 3 filters?',
      answer:
        'Because stacking small filters buys the same view of the image for fewer weights. Each 3 by 3 layer reaches one extra pixel on every side, so two stacked layers see a 5 by 5 region and three see 7 by 7. At 64 channels, two 3 by 3 layers cost 2 * 9 * 64 * 64 = 73,728 against 25 * 64 * 64 = 102,400 for a single 5 by 5 layer: 28% less for an identical receptive field. At 7 by 7 the gap widens to 45%. There is a second benefit that costs nothing: the stacked version has an activation function between its two layers, so it can represent functions the single wide layer cannot. Fewer weights and more expressiveness for the same view is a rare combination, which is why the choice stuck.',
      isCaseBased: false,
    },
    {
      question: 'What is a 1 by 1 convolution actually doing, and why does it appear everywhere?',
      answer:
        'It looks at exactly one pixel, but across all channels at once, so it does no spatial work and only mixes channels — a learned linear combination of the channels, applied identically at every pixel. Its cost is C_in * C_out with no k * k factor, which makes it the cheapest layer that can change the channel count. That is why it turns up in three different roles. It squeezes the channel count before an expensive 3 by 3 layer, since convolution cost is proportional to C_in * C_out and shrinking both is where the saving lives. It sits on a skip path to reshape the input when F(x) and x do not match. And it is the channel-mixing half of a depthwise separable convolution, where the depthwise half deliberately does no mixing at all.',
      isCaseBased: false,
    },
    {
      question: 'Case: cost out two designs for a block with 256 channels in and 256 out, and say which you would ship.',
      answer:
        'Design A, two 3 by 3 layers at 256 channels: each is 3 * 3 * 256 * 256 = 589,824, so 1,179,648 in total. Design B, squeeze then expand: a 1 by 1 from 256 to 64 is 16,384; a 3 by 3 at 64 in and 64 out is 9 * 64 * 64 = 36,864; a 1 by 1 back from 64 to 256 is 16,384. Total 69,632, about 16.9 times cheaper, with one more layer than Design A rather than one fewer. The mechanism to state out loud is that convolution cost is proportional to C_in * C_out, so quartering both ends of the expensive 3 by 3 layer divides its cost by sixteen, and the two 1 by 1 layers that make the squeeze possible are cheap because they carry no k * k factor. I would ship B for any deep network, and it is what deeper residual networks use in every block. The honest caveat is that the narrow waist is a real bottleneck on information, so at very small widths the squeeze starts to cost accuracy, and B only pays off when the channel count is large enough for the ratio to matter.',
      isCaseBased: true,
    },
    {
      question: 'Case: you must ship an image classifier that runs on a mid-range phone inside a 20ms frame budget. Walk through the decisions.',
      answer:
        'Start from the constraint rather than the accuracy leaderboard. First, pick from the depthwise separable family: replacing every standard convolution with a depthwise step plus a 1 by 1 pointwise step turns a k * k * C_in * C_out product into a sum, which at 3 by 3 and 256 channels is 67,840 weights against 589,824, about 8.7 times fewer. Second, take a pretrained one and fine-tune it rather than training from scratch, so you inherit features learned from a million photos. Third, before touching the architecture again, cut the input resolution: compute grows with the square of the input size, so 160 by 160 instead of 224 by 224 is roughly half the work for one measurement of accuracy cost. Fourth, quantise the weights to 8-bit integers after training, which is typically around four times smaller and two to three times faster. The tradeoffs to name: split convolutions are genuinely less expressive than standard ones, lower resolution hurts small objects most, and a custom architecture costs you pretrained weights, which is usually a worse trade than it first looks.',
      isCaseBased: true,
    },
    {
      question: 'Case: a teammate says "I went from 18 to 40 layers and validation accuracy dropped, so I am adding dropout". What do you say?',
      answer:
        'Ask for the training error of both models before agreeing to anything, because two opposite illnesses produce the same validation symptom. If the 40-layer model has lower training error than the 18-layer one and worse validation error, they are right: the model is fitting the training set better and generalising worse, so dropout, weight decay, augmentation or more data is the correct medicine. If the 40-layer model has higher training error, adding dropout will make things strictly worse, because the model is already failing to fit and regularisation restricts it further. That case is the degradation problem: the deeper network can represent the shallower one by passing the input through the extra layers, so the solution exists and the optimiser is not reaching it. The fixes there are structural: add skip connections so each block learns a correction instead of a whole answer, check the initialisation, and check the learning rate. One number separates the two prescriptions, and it is not a validation number.',
      isCaseBased: true,
    },
    {
      question: 'What did the 2012 breakthrough network actually contribute, given that convolution dated from 1998?',
      answer:
        'Mostly scale, packaged with a few older ideas that finally paid off together. Convolution and weight sharing were 1998. ReLU, dropout and data augmentation all existed beforehand. What was new was a labelled set of 1.2 million photos and graphics hardware that could train a 60-million-weight network on them in days, which took the error rate on that benchmark from about 26% to about 15%. ReLU is the one technical piece worth singling out, because the older squashing activations shrank the learning signal in a deep stack while max(0, x) leaves the positive side untouched, so depth became trainable in a way it had not been. The general lesson is the one worth stating: in deep learning, the amount of data and the available compute are architectural decisions, not implementation details.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    {
      front: 'Two stacked 3 by 3 layers versus one 5 by 5 layer',
      back: 'Same 5 by 5 receptive field. At 64 channels: 73,728 weights against 102,400, so 28% fewer. Plus an extra activation function in between. Three stacked 3 by 3 see 7 by 7 for 45% fewer.',
    },
    {
      front: 'How far does a stack of 3 by 3 layers see?',
      back: 'Start at 1 and add 2 per layer. One layer 3 by 3, two layers 5 by 5, three layers 7 by 7. Each 3 by 3 layer reaches one extra pixel on every side.',
    },
    {
      front: 'The degradation problem',
      back: 'A 56-layer plain network has HIGHER TRAINING error than a 20-layer one. Not overfitting, because training error rose. Not capacity, because the deep net contains the shallow one. It is an optimisation failure.',
    },
    {
      front: 'What a residual block computes',
      back: 'F(x) + x. F is the correction, and + x is a plain addition with no weights. Doing nothing means driving F(x) to 0, which is the easiest thing an optimiser does.',
    },
    {
      front: 'Why the skip keeps the learning signal alive',
      back: 'Each block multiplies the backward signal by a factor. Plain: 0.3 ten times is about 0.0000059. With a skip the untouched path adds a factor of exactly 1, so the factor is 1.3 and ten blocks give about 13.8.',
    },
    {
      front: 'Depthwise separable convolution',
      back: 'Depthwise: k * k * C_in, one filter per channel, no mixing. Pointwise 1 by 1: C_in * C_out, mixes channels at one pixel. A sum instead of the four-way product k * k * C_in * C_out.',
    },
    {
      front: 'Depthwise separable saving, with numbers',
      back: 'At 3 by 3 with 256 channels: 67,840 against 589,824, about 8.7 times fewer. At 5 by 5 with 64 channels: 5,696 against 102,400, about 18 times. The ratio depends on k and C_out, so recompute it.',
    },
    {
      front: 'Squeeze, convolve narrow, expand',
      back: '1 by 1 down to 64, 3 by 3 at 64, 1 by 1 back to 256: 16,384 + 36,864 + 16,384 = 69,632, against 1,179,648 for two 3 by 3 layers at 256. About 17 times cheaper with one MORE layer.',
    },
  ],
  mindmapMarkdown: `- CNN architectures as a chain of fixes
  - The early years
    - ~60k weights, digits on cheques, 1998
    - what was missing: data, GPUs, ReLU
    - 2012: 1.2M photos, 26% error to 15%
  - Small filters beat big filters
    - two 3x3 see the same 5x5 region
    - 73,728 vs 102,400 weights at 64 channels
    - 28% fewer, plus an extra activation
    - three 3x3 see 7x7 for 45% fewer
  - Parallel filter sizes in one layer
    - 1x1, 3x3, 5x5 side by side, outputs glued
    - let the network pick the size
  - The degradation problem
    - 56 layers worse than 20 on TRAINING error
    - not overfitting, not capacity
    - an optimisation failure
  - The skip connection
    - block computes F(x) + x
    - doing nothing means F(x) = 0, which is easy
    - backward factor is 1 + 0.3, not 0.3
    - 10 blocks: 0.0000059 vs 13.8
  - Splitting a convolution
    - depthwise: k*k*C_in, no channel mixing
    - pointwise 1x1: C_in*C_out, no spatial reach
    - sum, not a four-way product
    - 67,840 vs 589,824, about 8.7x
  - Squeeze and expand
    - 1x1 down, 3x3 narrow, 1x1 up
    - 69,632 vs 1,179,648, about 17x
  - In practice
    - start from a pretrained backbone
    - phone budget vs server accuracy picks the family`,
}

export default m
