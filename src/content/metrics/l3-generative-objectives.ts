import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l3-generative-objectives',
  subjectId: 'metrics',
  level: 3,
  title: 'Generative Model Objectives: Reconstruction, ELBO & GANs',
  whyItMatters:
    'A classifier is told the right answer for every example and asked to match it. A model that generates new pictures has no right answer to match — there is no single correct new face. So the field invented three different numbers to train on, and each one is strange in its own way. This module builds all three from four pixels and a handful of arithmetic you can check on paper: reconstruction loss, the two halves of the ELBO, and the min-max game that trains a GAN, including the one-line change that makes GAN training work at all.',
  assumes: [
    'You have read *Loss vs Metric*, so you know a loss is the number the model descends and that a training step is sized by the slope of that number',
    'You have read *Regression Losses*, so you have seen squared error: take the difference, square it, average it',
    'You have read *Classification Losses*, so you have met cross-entropy: minus the log of the probability the model gave to the correct answer',
    'You know from school maths that a logarithm of a small number is a large negative number, and that log(1) is 0',
    'You have seen a Python list, a for loop, and a function. No neural network code appears in this module.',
  ],
  estMinutes: 42,
  sections: [
    {
      type: 'intuition',
      title: 'The problem: there is no right answer to compare against',
      md: `Everything you have trained so far worked the same way. Show the model an input, compare its output against the one correct answer a human wrote down, and turn the difference into a number to descend.

- Spam or not spam. House price 47.2 lakh. Dog in this box. Each has a right answer sitting in the dataset.
- Now ask a model to **produce a new photograph of a face** that has never existed. What is the right answer? Any plausible face is correct. Millions of them are.
- There is nothing to subtract from, so squared error against "the correct face" is not even a sentence that means anything.
- So generative training has to score something else. Three things have been tried, and this module builds all three.
- **One:** make the model rebuild an input it was just shown, and score the rebuild. There *is* a right answer for that — the input itself.
- **Two:** do the same, but also force the model's internal codes into a tidy shape, so you can invent new codes and get plausible output.
- **Three:** train a second network whose only job is to spot fakes, and score the generator by whether it fools that network.

Move one gives you compression. Move two gives you a **VAE**. Move three gives you a **GAN**. Nothing below assumes you have met any of those words before.`,
    },
    {
      type: 'intuition',
      title: 'Reconstruction loss: squeeze it, rebuild it, measure the damage',
      md: `Start with the only idea here that needs no new machinery.

- Build a network in two parts. The first part, the **encoder**, takes the input and outputs a much smaller set of numbers, called the **code**. The second part, the **decoder**, takes only that code and tries to rebuild the original input. The pair together is called an **autoencoder** — a network that encodes something and then decodes it back.
- **Reconstruction loss** is just squared error between what went in and what came out. You already know how to compute it.
- Concretely. The input is a tiny four-pixel greyscale image where each number is a brightness from 0 (black) to 1 (white): **[0.9, 0.1, 0.8, 0.2]** — bright, dark, bright, dark.
- The encoder squeezes those four numbers down to **one** number. Say it outputs **0.85**, which in this trained network means "strongly striped, bright first".
- The decoder sees only that single 0.85 and rebuilds: **[0.85, 0.15, 0.75, 0.25]**.
- Score it. Each pixel is off by 0.05, so each squared error is 0.0025, and the average of four identical terms is **0.0025**.

Now the question that makes this worth doing. Why does squeezing to one number teach the network anything? Because rebuilding four numbers from one is impossible in general — one number cannot carry four. The only way to score well is to spend that one number on whatever the *dataset* has in common. If every image in the training set is striped, the code can afford to mean "how strong is the stripe" and the decoder can fill in the rest. The bottleneck is not a limitation to work around; it is the entire teaching mechanism.

For contrast, a decoder that ignores the code and always outputs the dataset's average image, **[0.5, 0.5, 0.5, 0.5]**, scores 0.125 on this input — fifty times worse. That number is the floor a useless model sits at.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Reconstruction loss on four pixels',
      code: `image = [0.9, 0.1, 0.8, 0.2]
rebuilt = [0.85, 0.15, 0.75, 0.25]
lazy = [0.5, 0.5, 0.5, 0.5]

def recon(a, b):
    total = 0.0
    for i in range(len(a)):
        total = total + (a[i] - b[i]) ** 2
    return total / len(a)

print(round(recon(image, rebuilt), 6))
print(round(recon(image, lazy), 6))

# ---- real output ----
# 0.0025
# 0.125`,
      annotations: {
        1: 'The original four-pixel image: bright, dark, bright, dark, as brightnesses from 0 to 1.',
        2: 'What the decoder produced from the single code number 0.85. Every pixel is 0.05 away from the truth.',
        3: 'A decoder that ignores its input entirely and always prints the dataset average. This is the do-nothing baseline every reconstruction number should be compared against.',
        5: 'Takes the original and the rebuild and returns one number.',
        6: 'A running total, written 0.0 to make clear it accumulates decimals.',
        7: 'Walk the four pixels. len(a) is 4, so range(len(a)) gives positions 0, 1, 2, 3.',
        8: '(a[i] - b[i]) is how far off this pixel is, and ** 2 squares it so a too-bright and a too-dark error both count as positive. Identical to the squared error you met for regression, applied per pixel.',
        9: 'Average over the pixels so the number does not simply grow with image size.',
        11: 'Four errors of 0.05, each squaring to 0.0025, average 0.0025.',
        12: 'The do-nothing decoder scores 0.125 — fifty times worse. Reconstruction loss numbers mean nothing until you know this floor.',
      },
    },
    {
      type: 'intuition',
      title: 'Why reconstruction alone cannot generate anything',
      md: `The autoencoder compresses well. Try to make it *invent* an image and it falls apart, and the reason is worth seeing as a picture.

- Suppose the training set has three images, and after training their codes come out as the single numbers **−17.0**, **40.0** and **91.0**.
- Draw a number line and mark those three points. That is the entire region the decoder has ever been asked about. Everything else on the line — every value between −17 and 40, every value above 91 — is territory the decoder has never once been trained on.
- Now try to generate a new image. You have no input to encode, so the only thing you can do is pick a code yourself. Pick 20.0. It sits in a stretch of the line the decoder has never seen, so its output is whatever arbitrary thing the network happens to compute there. Usually noise.
- Nothing in the reconstruction loss ever asked the codes to be near each other, or near zero, or spread evenly. The loss only cares that each code decodes back to its own image. Three faraway dots satisfy it perfectly.

So the autoencoder learned a filing system with no rule about where files go. To be able to invent a code, you need the codes to occupy a known, filled-in region. That requirement is the second half of the ELBO, and it is the only thing the next section adds.`,
    },
    {
      type: 'intuition',
      title: 'The ELBO, half one: rebuild from a fuzzy code',
      md: `The fix is a small change to what the encoder outputs, and it is easier to picture than to name.

- Instead of producing one code number, the encoder now produces **two** numbers: a **centre** and a **spread**. Together they describe a small fuzzy region of the number line rather than a single point.
- For our striped image the encoder might output centre **0.85** and spread **0.10**. Read that as: "this image's code lives around 0.85, give or take about 0.1".
- Then, during training, the code actually handed to the decoder is **drawn at random from that fuzzy region**. One training pass it might be 0.79, the next pass 0.91, the next 0.86.
- **Half one of the ELBO is the reconstruction loss you already computed, averaged over those random draws.** Nothing new — same squared error, just measured on several nearby codes instead of one exact code.
- What the fuzziness buys you: the decoder is now forced to produce something sensible for a whole small neighbourhood of the line, not for one isolated point. The holes start filling in.
- What it does not buy you: nothing stops the three images from claiming centres at −17, 40 and 91 with spreads of 0.001 each. Three tiny fuzzy dots are still three dots. Half one alone cannot fix that, which is exactly why there is a half two.`,
    },
    {
      type: 'intuition',
      title: 'The ELBO, half two: pull every code back to the same neighbourhood',
      md: `Half two is a second number added to the loss, and its only job is to push each image's fuzzy region toward one fixed standard region: **centre 0, spread 1**.

Here is the picture. Draw a number line from −3 to 3.

- **Without half two**, the three images sit at centres −17, 40 and 91, each with spread 0.001. On the drawing they are three isolated pinpricks, most of them off the edge of the page. The space between them is untrained, so a code you invent decodes to noise.
- **With half two**, the same three images are pulled in to centres around −0.6, 0.1 and 0.7, with spreads around 0.8. Now draw them: three fuzzy blobs that **overlap each other and together cover the stretch from about −1.4 to 1.5**. There is no gap left between them.
- That overlap is the whole prize. Pick any number near zero — 0.3, say — and it falls inside at least one blob, which means the decoder was trained there, which means it produces a plausible image. **Generation is now possible**: pick a random number near 0, decode it, get a face.

The penalty itself is one formula, and you can check its behaviour rather than take it on faith. For a centre m and a spread s it is **0.5 × (s² + m² − 1 − 2·log(s))**. Three things to verify, all in the snippet below.

- It is **exactly zero** when the centre is 0 and the spread is 1 — the region it is aiming at costs nothing.
- It **grows as the centre moves away from 0**: the m² term.
- It **grows as the spread shrinks toward 0**: the −2·log(s) term, because the log of a tiny number is a large negative and subtracting it adds a lot. This is the term that forbids the pinprick strategy.

So the complete loss is **reconstruction error + β × penalty**, and β is a dial you set. Turn β to 0 and you are back to a plain autoencoder: sharp rebuilds, unusable for generation. Turn β up and the codes crowd tightly around 0, generation works, and rebuilds get blurrier, because every image is being asked to share a small stretch of line with every other image and the decoder can no longer tell them apart precisely. Blurry samples are not a bug in VAEs; they are the price of the second half. (You will see this loss written as the **ELBO**, and written as something to *maximise* rather than minimise, which flips both signs. It is the same trade-off either way.)`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The penalty, checked against all three claims',
      code: `import math

def penalty(centre, spread):
    return 0.5 * (spread ** 2 + centre ** 2 - 1 - 2 * math.log(spread))

for c, s in [(0.0, 1.0), (0.5, 0.9), (3.0, 0.1), (0.0, 0.01)]:
    print(c, s, round(penalty(c, s), 4))

# ---- real output ----
# 0.0 1.0 0.0
# 0.5 0.9 0.1354
# 3.0 0.1 6.3076
# 0.0 0.01 4.1052`,
      annotations: {
        1: 'math is a standard Python module; we need log and exp from it and nothing else.',
        3: 'The penalty for one image, given the centre and spread its encoder produced.',
        4: 'The formula from the section above, written out. spread ** 2 is the spread squared, centre ** 2 the centre squared, and math.log(spread) the natural logarithm of the spread.',
        6: 'Four (centre, spread) pairs to test. "for c, s in [...]" unpacks each pair into two named variables in one step.',
        7: 'Print each pair with its penalty, rounded to 4 places.',
        9: 'Claim one, confirmed: centre 0 and spread 1 cost exactly 0.0. The target region is free.',
        10: 'A near-miss costs almost nothing: 0.1354. The penalty is gentle near the target, so the encoder has room to move.',
        11: 'A far centre with a tiny spread costs 6.3076 — the pinprick-far-away strategy, priced out.',
        12: 'Claim three, isolated: this one sits at the correct centre 0 and is punished 4.1052 purely for being too narrow. Shrinking the spread alone is enough to be expensive.',
      },
    },
    {
      type: 'intuition',
      title: 'GANs: no reconstruction, no reference, just a forger and an inspector',
      md: `The third approach throws out the idea of comparing to a target image entirely.

- There are two networks. The **generator** takes a list of random numbers and outputs an image. The **discriminator** takes an image and outputs a single number between 0 and 1: how sure it is that this image is real rather than made up.
- The discriminator's job is ordinary binary classification, and you already know how to train it. Show it real images labelled 1 and generated images labelled 0, and descend cross-entropy. Nothing new.
- The generator's job is to make the discriminator output a **high** number on its fakes.
- So the two networks want opposite things from the same quantity. The discriminator wants to push its score on fakes down; the generator wants to push the same score up. That is why it is called a **min-max game**: one player minimises what the other maximises. No reference image appears anywhere in the generator's loss.
- Why bother? Because there is no averaging. A VAE is punished for every pixel that differs from a target, so hedging between two plausible images beats committing to one, and hedging looks like blur. A GAN is punished only for being *detectably* fake, and a blurry image is trivially detectable. The pressure runs the other way, toward sharpness.
- The cost: there is no target, so there is no loss curve that means anything. A discriminator loss of 0.69 might mean the game is perfectly balanced or that both networks are useless. You cannot read a GAN's progress off its numbers the way you can everywhere else.

That 0.69 is worth pinning down, since it is the number you will stare at most. If the discriminator says 0.5 for both real and fake images — total confusion — its cross-entropy is −(log 0.5 + log 0.5)/2 = **0.6931**. If it says 0.9 on real and 0.1 on fake, it scores **0.1054**; at 0.99 and 0.01, **0.0101**. Low discriminator loss means the generator is being caught easily.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'What the discriminator loss number means',
      code: `for d_real, d_fake in [(0.5, 0.5), (0.9, 0.1), (0.99, 0.01)]:
    loss = -(math.log(d_real) + math.log(1 - d_fake)) / 2
    print(d_real, d_fake, round(loss, 4))

# ---- real output ----
# 0.5 0.5 0.6931
# 0.9 0.1 0.1054
# 0.99 0.01 0.0101`,
      annotations: {
        1: 'Three states of the game, each as a pair: the score the discriminator gives a real image, and the score it gives a fake one.',
        2: 'Cross-entropy for the discriminator. The real image should score 1, so it is charged minus log of what it actually said. The fake should score 0, so it is charged minus log of (1 - what it said). Dividing by 2 averages the two halves.',
        3: 'Print the pair and its loss.',
        5: 'Total confusion — 0.5 on everything — costs 0.6931. This is the number a balanced GAN hovers near, and also the number a completely broken one shows.',
        6: 'A discriminator that is usually right scores 0.1054. Low here means the generator is being caught.',
        7: 'Near-certainty scores 0.0101. This is the danger zone the next section is about.',
      },
    },
    {
      type: 'intuition',
      title: 'The vanishing gradient, and the one-line change that fixes it',
      md: `Now the part that decides whether a GAN trains at all. Early in training the generator is terrible, so the discriminator spots its fakes instantly and outputs something like **d = 0.01**.

The original formulation says the generator should **minimise log(1 − d)**, where d is the discriminator's score on its fake. Check what that number is doing at d = 0.01.

- log(1 − 0.01) = log(0.99) = **−0.0101**. Almost zero.
- More importantly, ask how fast it changes. Nudge d up by 0.001 and recompute: the value moves by about 0.00101, so the slope is about **−1.01**.
- Compare that with the slope at d = 0.9, where the generator is already winning: about **−10.05**, ten times steeper.
- Read that together. **The generator gets its weakest training signal exactly when it is worst**, and its strongest signal when it barely needs one. Since a training step is sized by the slope, the generator moves almost nowhere at the start and never gets going. This is the vanishing-gradient problem in GANs, and it is why the original formulation is not what anyone runs.

The repair, called the **non-saturating** form, is to have the generator **minimise −log(d)** instead. Same goal — both are made smaller by pushing d toward 1 — but a completely different shape.

- At d = 0.01: −log(0.01) = **4.6052**, and the measured slope is about **−95.31**.
- At d = 0.9: −log(0.9) = **0.1054**, slope about **−1.11**.
- The signal is now roughly a hundred times stronger when the generator is losing badly than when it is nearly winning. Exactly backwards from the original, and exactly right.

The change is safe because it does not move the target. Both expressions are minimised by driving d to 1, so the generator is still chasing the same thing; only the size of the push changes along the way. That is the entire trick, and it is one line of code in every GAN implementation.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Both generator losses, with slopes measured by hand',
      code: `step = 0.001
for d in [0.01, 0.1, 0.5, 0.9]:
    original = math.log(1 - d)
    original_up = math.log(1 - (d + step))
    nonsat = -math.log(d)
    nonsat_up = -math.log(d + step)
    print(d, round(original, 4), round((original_up - original) / step, 2),
          round(nonsat, 4), round((nonsat_up - nonsat) / step, 2))

# ---- real output ----
# 0.01 -0.0101 -1.01 4.6052 -95.31
# 0.1 -0.1054 -1.11 2.3026 -9.95
# 0.5 -0.6931 -2.0 0.6931 -2.0
# 0.9 -2.3026 -10.05 0.1054 -1.11`,
      annotations: {
        1: 'How far sideways we nudge d to measure a slope. This is the "run" in rise-over-run.',
        2: 'Four states of the game, from the generator losing badly at 0.01 to nearly winning at 0.9.',
        3: 'The original generator loss at this d.',
        4: 'The same loss one small step further along, so we can measure how fast it moves.',
        5: 'The non-saturating loss at this d: minus the log of the discriminator score.',
        6: 'And the non-saturating loss one small step further along.',
        7: 'Print d, the original loss, and its slope — the change in the loss divided by the size of the sideways move, which is exactly the school rise-over-run.',
        8: 'Then the non-saturating loss and its slope. Both slopes are negative, meaning both losses fall as d rises, which is what the generator wants; the two differ only in how hard they push.',
      },
    },
    {
      type: 'math',
      intro: 'The three objectives in symbols. x is the input, x-hat the rebuild, m and s the centre and spread the encoder produced, D(G(z)) the discriminator score on a generated image.',
      latex: [
        '\\mathcal{L}_{\\text{recon}} = \\frac{1}{n}\\sum_{i=1}^{n}\\,(x_i - \\hat{x}_i)^2 \\qquad \\text{our four pixels: } 0.0025',
        '\\mathcal{L}_{\\text{VAE}} = \\mathcal{L}_{\\text{recon}} \\;+\\; \\beta \\cdot \\tfrac{1}{2}\\big(s^2 + m^2 - 1 - 2\\log s\\big) \\qquad \\text{zero penalty at } m=0,\\; s=1',
        '\\min_{G}\\max_{D}\\;\\; \\mathbb{E}[\\log D(x)] \\;+\\; \\mathbb{E}[\\log(1 - D(G(z)))] \\qquad \\text{— the min-max game}',
        '\\text{generator, non-saturating: } \\min_{G}\\; -\\log D(G(z)) \\quad \\text{— same target, slope } {\\approx}\\,{-}95 \\text{ at } D = 0.01 \\text{ instead of } {-}1',
      ],
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `for beta in [0.0, 0.5, 2.0]:
    recon_error = 0.0025 + 0.02 * beta
    pen = 6.3076 / (1 + 8 * beta)
    print(beta, round(recon_error, 4), round(pen, 4), round(recon_error + beta * pen, 4))`,
        precomputedOutput: `0.0 0.0025 6.3076 0.0025
0.5 0.0125 1.2615 0.6433
2.0 0.0425 0.371 0.7846`,
        caption: 'The shape of the trade-off, with a stand-in for how the two halves respond to beta. Raising beta tidies the codes (middle column falls) and blurs the rebuilds (second column rises).',
        annotations: {
          1: 'Three settings of the dial beta, from ignoring the penalty entirely to weighting it heavily.',
          2: 'A stand-in for the reconstruction error a trained model would reach at this beta. It starts at our measured 0.0025 and rises with beta, because a tidier code space carries less information about any single image.',
          3: 'A stand-in for the penalty a trained model would settle at. It starts from the far-away pinprick value 6.3076 we computed and shrinks as beta pushes harder. These two lines are illustrative shapes, not measurements — only the direction of each is the point.',
          4: 'Print beta, the two halves, and the total loss. Read the middle two columns against each other: every step that tidies the codes costs sharpness, and there is no setting that wins both.',
        },
      },
    },
    {
      type: 'intuition',
      title: 'Worked case: choosing an objective for a real task',
      md: `A team needs to generate synthetic chest X-rays to enlarge a small training set for a downstream classifier. Three objectives are on the table. Work through each against what they actually need.

- **Requirement one: they must be able to produce new images on demand.** A plain autoencoder is out immediately. Its reconstruction loss never asked the codes to occupy a filled-in region, so — exactly like our three codes at −17, 40 and 91 — there is no code they could safely invent. It compresses; it does not generate.
- **Requirement two: the images must be varied.** They are enlarging a dataset, so a hundred near-identical images are worth almost nothing. This is where a GAN carries real risk: since its generator is scored only on fooling the discriminator, producing one convincing image over and over is a winning strategy from its point of view. That failure has a name, **mode collapse**, and nothing in the GAN loss forbids it.
- **Requirement three: fine texture matters.** A radiologist's classifier keys on small texture differences, and the VAE's second half will blur exactly those, because forcing every image's code into a shared small region costs precision on each individual image.
- **Requirement four: they need to know whether training is working.** With a VAE they can watch the reconstruction error and the penalty separately, each meaningful on its own. With a GAN the discriminator loss sitting at 0.6931 could mean a perfectly balanced game or two useless networks; there is no reading it.
- **The decision.** Start with the VAE, because requirements two and four are hard requirements and requirement three is a matter of degree. Tune β down as far as generation still works, which buys back some sharpness. Then, crucially, judge the result by the only measure that settles it: **does the downstream classifier get better when trained on real data plus synthetic data?** That is a number they can compute, unlike anything in either training loss.

Note the shape of the reasoning. Nobody picked the objective by asking which produces the prettiest samples. They listed what the output has to do, and eliminated.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake, walked into on purpose',
      md: `A team trains a GAN for two days. Their generator loss is falling steadily and their discriminator loss has dropped to 0.02. They report in standup that training is going well.

- Then they look at the images. Every one is the same blurry smear.
- Here is the diagnosis, and it starts with what those two numbers actually say. A discriminator loss of **0.02** means the discriminator is right nearly every time — around 0.99 on real images and 0.01 on fakes, which we computed as 0.0101. The generator is not fooling it at all.
- So the generator is at d ≈ 0.01. Look up what that means in the slope table: on the original loss the slope there is about **−1.01**, against about **−10** near d = 0.9. The generator is receiving its weakest possible push at the moment it needs the strongest. It is stuck, and it will stay stuck.
- Then why was the generator loss falling? Because a falling number in a two-player game is not progress. If the discriminator gets slightly worse for its own reasons, the generator's loss falls with no improvement in the generator whatsoever. The number describes the *gap* between two moving networks, not the quality of either one.
- The deeper error is applying an ordinary training habit to a setting where it does not hold. Everywhere else in this subject, a falling loss means the model is descending toward something fixed. In a GAN there is nothing fixed to descend toward: the target moves every step, because the target is another network that is also training.

The repair on the mechanics is the non-saturating form, which turns that −1.01 into about −95 and lets the generator move. The repair on the process is to stop reading the loss curves as progress and start looking at generated samples on a schedule, plus a sample-quality measure computed outside the training loop.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Pen and paper. Every number is small on purpose.

1. Input **[0.4, 0.6]**, rebuild **[0.5, 0.5]**. Compute the reconstruction loss. Then compute it for the rebuild **[0.4, 0.4]** and say which decoder is better.
2. Using penalty = 0.5 × (s² + m² − 1 − 2·log s), compute the penalty for centre 0, spread 1, and for centre 2, spread 1. Which term produced the whole difference?
3. An encoder produces centre 0.0 and spread 0.05 for every image in the dataset. Describe, using the number-line picture, what goes wrong when you try to generate, and say which term of the penalty is meant to prevent it.
4. A discriminator outputs 0.98 on real images and 0.02 on fakes. Compute its cross-entropy loss. Is the generator winning or losing, and what does the original generator loss's slope look like at d = 0.02?
5. A teammate says "our GAN's generator loss went from 3.1 to 1.4, so the generator improved". Give the two-sentence rebuttal.`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `Check every intermediate number, not only the final one.

1. First rebuild: errors are 0.4 − 0.5 = −0.1 and 0.6 − 0.5 = 0.1, squares 0.01 and 0.01, average **0.0100**. Second rebuild: errors 0.0 and 0.6 − 0.4 = 0.2, squares 0.0 and 0.04, average **0.0200**. The first is better, at half the loss. Worth noticing why: squaring means one error of 0.2 costs more than two errors of 0.1, so this loss prefers spreading a mistake thinly over the pixels. That preference is one direct cause of blur.
2. Centre 0, spread 1: 0.5 × (1 + 0 − 1 − 2·log 1) and log 1 = 0, so the whole bracket is 0 and the penalty is **0.0000**. Centre 2, spread 1: 0.5 × (1 + 4 − 1 − 0) = 0.5 × 4 = **2.0000**. The spread terms are identical in both, so the entire difference came from the **m²** term — the cost of sitting away from the target centre.
3. Every image is a pinprick at the same place. On the number line all three blobs collapse onto a single point at 0, so the decoder has been trained on essentially one code and nothing else. Generating means picking a random number near 0, and anything that is not almost exactly 0 lands in untrained territory, so it decodes to noise. It is also the same failure in a second way: if every image maps to the same code, the decoder cannot tell them apart and can only output one average image. The **−2·log s** term is what prevents this, since log of 0.05 is a large negative, so subtracting twice it adds a large positive cost — 4.1052 for the spread 0.01 case we computed, and this case is similar.
4. Loss = −(log 0.98 + log(1 − 0.02))/2 = −(−0.0202 + −0.0202)/2 = **0.0202**. The discriminator is nearly always right, so the generator is **losing** badly. At d = 0.02 the original generator loss has slope about −1.02, nearly the flattest it ever gets, so the generator is receiving almost no push precisely when it most needs one — the vanishing-gradient trap. The non-saturating form gives roughly −49 there instead.
5. A GAN's generator loss measures the gap between two networks that are both changing, so it can fall because the discriminator got worse rather than because the generator got better. The only way to judge the generator is to look at the samples and at a sample-quality measure computed outside the training loop.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands alone. These are the names and the loose ends, in order of how often they come up.

- **Where the penalty formula comes from.** It is not invented. It is the KL divergence — the extra surprise you pay for using the wrong probabilities, which you met with perplexity — between the fuzzy region the encoder produced and the fixed standard region centred at 0 with spread 1. Both are bell curves, and for two bell curves that quantity works out to exactly the expression we used. It reaching zero when the centre is 0 and the spread is 1 is the general KL property that it is zero only when two distributions match, and you verified that numerically.
- **The reparameterisation trick.** Drawing the code at random creates a problem for training: you cannot compute a slope through a random draw. The fix is to draw a standard random number once and then compute code = centre + spread × that number, which moves the randomness out of the path the slope travels along. Every VAE implementation contains this line.
- **ELBO** stands for evidence lower bound, and it is written as a quantity to maximise: reconstruction quality minus the penalty. Our loss is its negative. The name comes from a proof that this quantity is a floor underneath the thing you actually wanted to maximise, which is why pushing it up is a sound way to train.
- **β-VAE** is the name for treating β as a dial rather than fixing it at 1. Large β tends to make individual code numbers correspond to individual recognisable properties of the image, which is useful and costs sharpness.
- **Mode collapse** is the GAN failure where the generator finds one output that fools the discriminator and produces variations of only that. Nothing in the loss penalises a lack of variety, which is the structural reason it happens.
- **FID** is the standard sample-quality score for image generators. It compares statistics of generated images against statistics of real ones using the internal representations of a fixed pretrained network, and it is computed outside training, which is why it is the number people actually report.
- **Diffusion models** replaced both approaches for images by going back to a stable target-based objective: repeatedly add noise to a real image and train a network to predict the noise. That gives GAN-level sharpness with VAE-level training stability, which is why almost every current image generator is one.`,
    },
  ],
  quiz: [
    {
      question: 'An autoencoder squeezes a four-pixel image down to one number and rebuilds it. Why does the squeeze teach the network anything?',
      options: [
        { text: 'It makes the network smaller and therefore faster', explanation: 'Speed is a side effect. A network could be small without a bottleneck in the middle, and it would learn nothing from that.' },
        { text: 'Because one number cannot carry four, so the only way to score well is to spend it on whatever the dataset has in common', explanation: 'Correct. The bottleneck is the teaching mechanism, not an obstacle. Without it the network could copy its input across and learn nothing.' },
        { text: 'Because squared error only works on small inputs', explanation: 'Squared error works on inputs of any size — it is averaged over the pixels precisely so that size does not matter.' },
      ],
      correct: 1,
    },
    {
      question: 'After training, an autoencoder\'s three images have codes -17, 40 and 91. Why can you not generate a new image from it?',
      options: [
        { text: 'The codes are too large; they should be under 1', explanation: 'The size is not the problem. Codes at 0.1, 40 and 91 would fail for the same reason, and codes at -17, -16.9 and -16.8 would work fine.' },
        { text: 'Because the decoder was never trained anywhere between those three points, so any code you invent lands in untrained territory and decodes to noise', explanation: 'Correct. Reconstruction loss only requires that each code decodes back to its own image. Three isolated points satisfy it perfectly and leave the rest of the line empty.' },
        { text: 'Because the decoder needs the encoder to run first', explanation: 'The decoder takes only a code. Feeding it a code you chose yourself is mechanically fine — the output is just meaningless.' },
      ],
      correct: 1,
    },
    {
      question: 'The VAE penalty is 0.5 * (s^2 + m^2 - 1 - 2*log(s)). Which term stops the encoder from making every spread almost zero?',
      options: [
        { text: 'The m^2 term', explanation: 'That charges for sitting away from centre 0. An encoder could sit exactly at 0 with spread 0.01 and pay nothing from this term, yet still be useless — we measured that case at 4.1052.' },
        { text: 'The -2*log(s) term, because the log of a tiny number is a large negative and subtracting it adds a large cost', explanation: 'Correct. Centre 0 with spread 0.01 costs 4.1052 entirely because of this term. It is what forbids the pinprick strategy.' },
        { text: 'The -1 term', explanation: 'That is a constant. It shifts every penalty by the same amount and cannot respond to the spread at all.' },
      ],
      correct: 1,
    },
    {
      question: 'Why do VAE samples tend to be blurry?',
      options: [
        { text: 'Because the encoder is too small to hold the detail', explanation: 'Enlarging the network does not remove the blur. The pressure comes from the objective, not the capacity.' },
        { text: 'Because the penalty forces every image\'s code into one shared small region, so the decoder can no longer tell images apart precisely, and squared error rewards hedging between plausible answers over committing to one', explanation: 'Correct. Both halves push the same way. It is the price of having a code space you can sample from, not a defect.' },
        { text: 'Because the codes are drawn at random', explanation: 'The random draw fills in the neighbourhood around each code, which is what makes generation possible. On its own it does not average distinct images together.' },
      ],
      correct: 1,
    },
    {
      question: 'A GAN\'s discriminator loss is 0.02. What is happening?',
      options: [
        { text: 'The game is well balanced', explanation: 'Balance shows up as roughly 0.6931 — the value when the discriminator says 0.5 to everything. 0.02 is nowhere near it.' },
        { text: 'The discriminator is catching nearly every fake, so the generator is losing badly and, under the original loss, receiving almost no gradient', explanation: 'Correct. A loss near 0.02 corresponds to about 0.99 on real and 0.01 on fake. At d = 0.01 the original generator loss has slope about -1.01, the flattest it ever gets.' },
        { text: 'The generator has won', explanation: 'A winning generator drives the discriminator loss up toward 0.6931 and beyond, because a fooled discriminator is a wrong discriminator.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is swapping the generator\'s loss from log(1 - d) to -log(d) a safe change?',
      options: [
        { text: 'Because the two expressions are equal', explanation: 'They are not. At d = 0.01 one is -0.0101 and the other is 4.6052 — nowhere close.' },
        { text: 'Because both are made smaller by pushing d toward 1, so the target is unchanged; only the strength of the push along the way differs', explanation: 'Correct. The generator is still chasing the same thing. The non-saturating form simply pushes about a hundred times harder at d = 0.01, which is where the generator starts.' },
        { text: 'Because the discriminator compensates for the difference', explanation: 'The discriminator is training against its own separate loss and knows nothing about which form the generator uses.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'What is reconstruction loss, and why does an autoencoder need a bottleneck?',
      answer:
        'Reconstruction loss is squared error between the input and the network\'s attempt to rebuild it after squeezing it through a smaller representation: take each pixel\'s difference, square it, average over the pixels. Concretely, an input of [0.9, 0.1, 0.8, 0.2] rebuilt as [0.85, 0.15, 0.75, 0.25] is off by 0.05 everywhere, so the loss is 0.0025 — against 0.125 for a decoder that ignores its input and always outputs the dataset average. The bottleneck is the whole teaching mechanism, not a constraint to route around. Without it the network can pass its input straight through and score zero while learning nothing. Forcing four numbers through one means the code cannot describe any single image fully, so the only way to score well is to spend it on structure the whole dataset shares.',
      isCaseBased: false,
    },
    {
      question: 'Why can a plain autoencoder compress but not generate?',
      answer:
        'Because nothing in reconstruction loss ever asks the codes to occupy a filled-in region. It only requires that each code decodes back to its own image, and three codes sitting at -17, 40 and 91 satisfy that perfectly. Draw those on a number line: three isolated points, with everything between them territory the decoder has never been trained on. Generation means inventing a code yourself, since there is no input to encode, and any code you invent almost certainly lands in one of those untrained gaps and decodes to noise. A VAE\'s second term is precisely the fix: it pulls every image\'s code region toward one shared standard region so the blobs overlap and cover a continuous stretch, at which point a random number near zero is guaranteed to land somewhere the decoder knows.',
      isCaseBased: false,
    },
    {
      question: 'Explain the two halves of the ELBO to someone who has never seen a VAE.',
      answer:
        'The encoder outputs two numbers per image rather than one: a centre and a spread, describing a small fuzzy region rather than a point. The code handed to the decoder is drawn at random from that region. Half one is the reconstruction error you already know, averaged over those random draws — the same squared error, measured on several nearby codes. That forces the decoder to be sensible over a small neighbourhood, not just at one point. Half two is a penalty pulling each image\'s region toward a fixed standard region, centre 0 and spread 1. The picture: without it, three images sit at centres -17, 40 and 91 with spreads of 0.001, three pinpricks on a mostly empty line. With it they land near -0.6, 0.1 and 0.7 with spreads around 0.8 — overlapping blobs covering roughly -1.4 to 1.5 with no gaps, so any random number near zero decodes to something plausible. The dial between them is beta: raise it and the code space tidies up and the rebuilds blur, because every image is sharing a smaller stretch of line.',
      isCaseBased: false,
    },
    {
      question: 'What is the GAN min-max game, and why is a GAN\'s loss curve unreadable?',
      answer:
        'Two networks. The generator turns random numbers into an image. The discriminator scores an image between 0 and 1 for how real it looks, trained as an ordinary binary classifier on real images labelled 1 and fakes labelled 0. The generator wants that score on its own fakes pushed up; the discriminator wants it pushed down. One minimises what the other maximises, which is what min-max names. No reference image appears in the generator\'s loss at all, which is why GANs avoid the averaging that blurs a VAE. The cost is that neither loss measures quality. Both numbers describe the gap between two networks that are both moving, so the generator\'s loss can fall purely because the discriminator got worse. A discriminator loss of 0.6931 is what a perfectly confused discriminator scores and also what two useless networks score. You judge a GAN by looking at samples and by a quality measure computed outside training.',
      isCaseBased: false,
    },
    {
      question: 'Case: your GAN\'s discriminator loss sits at 0.02, the generator loss is falling, and every sample is the same blurry smear. Diagnose it.',
      answer:
        'Start from what 0.02 means. That corresponds to roughly 0.99 on real images and 0.01 on fakes — the discriminator is catching everything, so the generator is not fooling it at all. Now look at where that puts the generator on its own loss. Under the original formulation the generator minimises log(1 - d), and at d = 0.01 that expression is -0.0101 with a measured slope of about -1.01, against about -10 at d = 0.9. A training step is sized by the slope, so the generator receives its weakest possible push at exactly the moment it is worst, and it stays stuck. That is the vanishing-gradient failure, and it is why the original form is not what anyone runs. The falling generator loss is not evidence against this: in a two-player game a falling number can mean the opponent got worse rather than that you got better, since the number measures the gap between two moving networks. Fixes, in order. First switch the generator to the non-saturating form, minimising -log(d), which turns that -1.01 into about -95 at d = 0.01 while chasing the identical target, since both are minimised by driving d to 1. Second, weaken the discriminator so the game rebalances: fewer discriminator steps per generator step, a lower learning rate for it, or label smoothing. Third, stop treating loss curves as progress — check samples on a schedule and track a sample-quality measure computed outside the training loop. And separately from all of that, watch for mode collapse: identical samples are its signature, and nothing in the GAN objective penalises a lack of variety.',
      isCaseBased: true,
    },
    {
      question: 'Case: a team needs synthetic chest X-rays to enlarge a small training set. VAE or GAN?',
      answer:
        'Work from the requirements rather than from which produces prettier pictures. First, they must generate on demand, which rules out a plain autoencoder immediately: its codes occupy isolated points with untrained gaps between them, so there is no code they could safely invent. Second, the images must be varied, because a hundred near-identical X-rays add nothing to a training set. That is a real risk with a GAN, since the generator is scored only on fooling the discriminator and producing one convincing image repeatedly is a winning strategy from its point of view — mode collapse, with nothing in the objective forbidding it. Third, fine texture matters for a radiology classifier, and this is where the VAE is weakest: forcing every image\'s code into a shared small region costs precision on each individual image, which is exactly the blur. Fourth, they need to know whether training is working, and a VAE lets them watch reconstruction error and the penalty separately, each meaningful alone, where a GAN offers a discriminator loss that reads the same when balanced and when broken. Requirements two and four are hard, three is a matter of degree, so start with the VAE and tune beta down as far as generation still holds to buy back sharpness. Then judge by the only measure that settles it: does the downstream classifier improve when trained on real plus synthetic data? That is computable, unlike anything in either training loss. A final caution specific to medicine: synthetic data can only recombine what is already in the training set, so it will not fix a rare condition that is barely represented, and the evaluation set must stay entirely real.',
      isCaseBased: true,
    },
    {
      question: 'Case: your VAE generates plausible but blurry samples and a colleague suggests just removing the KL penalty. What happens?',
      answer:
        'Generation stops working entirely, and the blur is not really the disease anyway. Removing the penalty makes it a plain autoencoder, so the reconstructions get sharper — that part of the intuition is correct — but nothing then constrains where the codes sit. They drift into isolated regions with untrained gaps between them, and sampling a code decodes to noise, which is the exact failure the penalty exists to prevent. So the suggestion trades a working generator for a good compressor. The productive version of the idea is to lower beta rather than zero it, and to find the smallest value at which sampled codes still decode to plausible images — that recovers some sharpness without losing the property being paid for. But it is worth being honest about the ceiling: some of the blur comes from the reconstruction term itself, not the penalty. Squared error prefers spreading a mistake thinly across pixels over committing to one crisp answer, because squaring makes one error of 0.2 cost more than two errors of 0.1. So a VAE hedges between plausible images by construction. If crisp texture is a hard requirement rather than a preference, the answer is a different objective family — a diffusion model, which keeps a fixed, stable target while producing GAN-level sharpness — not a beta setting.',
      isCaseBased: true,
    },
    {
      question: 'What is the non-saturating generator loss and why is it necessary?',
      answer:
        'The original formulation has the generator minimise log(1 - d), where d is the discriminator\'s score on its fake. The problem is where the generator starts. Early in training it is terrible, so d is near 0.01, and at that point log(1 - d) is -0.0101 with a slope of about -1.01 — nearly flat. At d = 0.9, where the generator hardly needs help, the slope is about -10. So the training signal is weakest exactly when the generator is worst, steps are sized by the slope, and the generator never gets moving. The non-saturating form has it minimise -log(d) instead. At d = 0.01 that is 4.6052 with a slope of about -95, and at d = 0.9 it is 0.1054 with a slope of about -1.11 — roughly a hundred times more push when losing badly than when nearly winning, which is the correct way round. The swap is safe because both expressions are minimised by driving d toward 1, so the target is unchanged and only the strength of the push differs.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Reconstruction loss', back: 'Squared error between the input and its rebuild after a bottleneck. Input [0.9, 0.1, 0.8, 0.2], rebuild [0.85, 0.15, 0.75, 0.25]: every pixel off by 0.05, loss 0.0025. A decoder printing the dataset average scores 0.125 — always compare against that floor.' },
    { front: 'Why an autoencoder cannot generate', back: 'Reconstruction loss only asks that each code decodes back to its own image. Codes at -17, 40 and 91 satisfy it. Everything between is untrained, so an invented code decodes to noise.' },
    { front: 'ELBO half one', back: 'The encoder outputs a centre and a spread instead of one number; the code is drawn at random from that fuzzy region. Half one is the same squared error, averaged over those draws, so the decoder must be sensible over a neighbourhood.' },
    { front: 'ELBO half two, as a picture', back: 'Without it: three pinpricks at -17, 40, 91 with spread 0.001, an empty line between. With it: blobs at about -0.6, 0.1, 0.7 with spread 0.8, overlapping and covering -1.4 to 1.5 with no gaps. Now any random number near 0 decodes to something plausible.' },
    { front: 'The VAE penalty, checked', back: '0.5 * (s^2 + m^2 - 1 - 2*log s). Centre 0 spread 1 costs 0.0000. Centre 3 spread 0.1 costs 6.3076. Centre 0 spread 0.01 costs 4.1052 — the -2*log s term alone, which is what forbids pinpricks.' },
    { front: 'The beta trade-off', back: 'Loss = reconstruction + beta * penalty. Beta 0 is a plain autoencoder: sharp, cannot generate. Raise beta and the codes tidy up, generation works, and rebuilds blur, because every image shares a smaller stretch of code space.' },
    { front: 'GAN, in one line', back: 'Generator turns random numbers into images; discriminator scores images 0 to 1 for realness as an ordinary classifier. One minimises what the other maximises. No reference image in the generator loss, so no averaging, so sharpness.' },
    { front: 'The non-saturating trick', back: 'Original generator loss log(1 - d) has slope about -1.01 at d = 0.01 and -10 at d = 0.9: weakest push when worst. Swap to -log(d): slope about -95 at 0.01 and -1.11 at 0.9. Same target — both minimised by driving d to 1 — different push.' },
  ],
  mindmapMarkdown: `- Generative objectives
  - The problem
    - no single right answer to subtract from
    - so score something else
  - Reconstruction loss
    - encoder squeezes, decoder rebuilds
    - [0.9,0.1,0.8,0.2] to [0.85,0.15,0.75,0.25] = 0.0025
    - dataset-average decoder = 0.125, the floor
    - the bottleneck IS the teaching mechanism
  - Why it cannot generate
    - codes at -17, 40, 91 satisfy the loss
    - everything between is untrained
    - an invented code decodes to noise
  - ELBO half one
    - encoder outputs centre and spread
    - code drawn at random from that region
    - same squared error, averaged over draws
  - ELBO half two
    - penalty toward centre 0, spread 1
    - 0.5*(s^2 + m^2 - 1 - 2*log s)
    - (0,1) costs 0.0000
    - (3,0.1) costs 6.3076
    - (0,0.01) costs 4.1052 from the log term alone
    - blobs overlap and fill the line, so sampling works
    - beta dials sharpness against samplability
  - GAN
    - generator vs discriminator, min-max
    - discriminator loss 0.6931 = total confusion
    - 0.1054 at 0.9/0.1, 0.0101 at 0.99/0.01
    - no reference image, so no averaging, so sharp
    - loss curves unreadable: the target moves
  - The non-saturating trick
    - log(1-d) slope -1.01 at d=0.01, -10.05 at d=0.9
    - -log(d) slope -95.31 at d=0.01, -1.11 at d=0.9
    - same target, correct push
  - Beyond the basics
    - the penalty is KL to a standard bell curve
    - reparameterisation trick
    - beta-VAE, mode collapse, FID
    - diffusion replaced both for images`,
}

export default m
