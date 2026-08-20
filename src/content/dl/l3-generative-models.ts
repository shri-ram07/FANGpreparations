import type { Module } from '../types'

const m: Module = {
  id: 'dl-l3-generative-models',
  subjectId: 'dl',
  level: 3,
  title: 'Generative Models: Autoencoders, VAEs, GANs & Diffusion',
  whyItMatters:
    'Every model you have built so far answers a question about something that already exists: is this spam, is this a cat. The models in this module do something different. They make a new thing that was never in the data. Four designs do it, and each one is a small change to the one before. By the end you will be able to say, in plain words, what an autoencoder squeezes, what a VAE changes, why a GAN fights itself, and what the image tools you actually use are doing when the progress bar moves.',
  assumes: [
    'You have seen a neural network that takes numbers in and produces numbers out, and knows it is trained by nudging its internal numbers to make an error smaller',
    'You know what a Python list, a for loop and a function are',
    'You know what an average is, and what "squared error" means: take the difference, square it',
    'Helpful but not required: the Metrics module *Generative Model Objectives: Reconstruction, ELBO & GANs*, which owns the loss functions these models are trained with',
  ],
  estMinutes: 40,
  sections: [
    {
      type: 'intuition',
      title: 'What "generative" actually means: one output, side by side',
      md: `Two models, both looking at pictures of handwritten digits. Watch what comes out of each one.

- **Model A is a classifier.** You feed it a picture. It outputs ten numbers, one per digit: 0.01, 0.02, 0.90, 0.01, and so on. You read off the biggest and say "this is a 2". The output is a **label** — a verdict about the picture you handed in.
- **Model B is a generator.** You feed it nothing meaningful, just some random numbers. It outputs **784 numbers**, one per pixel of a 28-by-28 picture. You arrange them into a grid and look at it. It is a 2. It is a 2 that nobody ever wrote, that was not in the training data, that did not exist five milliseconds ago.
- That is the whole difference. A classifier consumes a thing and produces a judgement. A **generator** produces a thing.
- The test, whenever you are unsure which kind of model you are holding: *can it hand me a brand-new example?* If it only ever scores or labels what you give it, it is not generative.
- Four designs do this, and they build on each other in order: **autoencoder → VAE → GAN → diffusion**. Learn them in that order; each is one change to the previous one.`,
    },
    {
      type: 'intuition',
      title: 'The autoencoder: squeeze it small, then rebuild it',
      md: `Describe a photo to a friend on the phone using only ten words. Then ask them to draw it. Whatever survives those ten words is what actually mattered about the photo.

That is an **autoencoder**: two networks glued back to back, trained together.

- The **encoder** is the first network. It takes the input and produces a much shorter list of numbers. Squeezing.
- That short list is called the **latent vector**, usually written **z**. "Latent" just means hidden — these numbers are not pixels and not labels, they are the network's private summary of the input.
- The **decoder** is the second network. It takes z and produces something the same size and shape as the original input. Rebuilding.
- The output of the decoder is called the **reconstruction**. Training pushes the reconstruction to match the original input, measured by squared error per pixel.
- Notice what the training data is: the input is also the answer. Nobody labelled anything. That is why autoencoders can be trained on any pile of unlabelled data you have lying around.`,
    },
    {
      type: 'intuition',
      title: 'The shape journey, with real numbers',
      md: `Take one 28-by-28 greyscale image of a digit. Flatten it into a plain list of 784 numbers, each one a pixel brightness.

- **Into the encoder: 784 numbers.** Out of the encoder: **32 numbers**. That is the latent vector z.
- **Into the decoder: those 32 numbers.** Out of the decoder: **784 numbers** again, the reconstruction.
- So the journey is **784 → 32 → 784**. The narrow middle is called the **bottleneck**.
- 784 divided by 32 is 24.5. Everything about that image has to fit through a pipe 24.5 times too small.
- Here is what that forces. The network cannot memorise and copy — there is nowhere to put 784 numbers. To get low error it must find the *patterns* that let 32 numbers stand in for 784: this digit is roughly round, the stroke is thick, it leans right.
- Make the bottleneck 784 wide and the whole thing collapses into a copying machine. Zero error, nothing learned. The squeeze is not a limitation of the design; the squeeze **is** the design.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'An autoencoder small enough to check by hand: 6 numbers to 3 and back',
      code: `x = [8.0, 6.0, 1.0, 3.0, 9.0, 7.0]

def encode(v):
    return [(v[0] + v[1]) / 2, (v[2] + v[3]) / 2, (v[4] + v[5]) / 2]

def decode(z):
    return [z[0], z[0], z[1], z[1], z[2], z[2]]

z = encode(x)
x_hat = decode(z)
print('x     :', x)
print('z     :', z)
print('x_hat :', x_hat)
error = 0.0
for i in range(6):
    error = error + (x[i] - x_hat[i]) ** 2
print('mean squared error :', round(error / 6, 3))

# ---- real output ----
# x     : [8.0, 6.0, 1.0, 3.0, 9.0, 7.0]
# z     : [7.0, 2.0, 8.0]
# x_hat : [7.0, 7.0, 2.0, 2.0, 8.0, 8.0]
# mean squared error : 1.0`,
      annotations: {
        1: 'One fake "image": six numbers instead of 784. Small enough that you can check every step with a pen.',
        3: 'The encoder, written as a plain function. v is the input list. A real encoder is a neural network whose numbers are learned; this one is hand-written so you can see what it does.',
        4: 'Squeezes 6 numbers into 3 by averaging each neighbouring pair: (8+6)/2 = 7, (1+3)/2 = 2, (9+7)/2 = 8. This returned list is the latent vector z. The bottleneck is 3 wide.',
        6: 'The decoder. It takes z, the 3-number summary, and must produce 6 numbers again.',
        7: 'It rebuilds by repeating each latent number twice. z[0] is the guess for both of the first two originals. This is the decoder committing to its best single answer where it only stored one.',
        9: 'Run the encoder on x. z is now [7.0, 2.0, 8.0].',
        10: 'Run the decoder on z. x_hat (read "x-hat") is the standard name for a reconstruction of x.',
        11: 'Print the original so you can compare it with the reconstruction line by line.',
        12: 'Print the latent vector. Three numbers now stand in for six. That is the compression.',
        13: 'Print the reconstruction. Compare against x: 8 and 6 both came back as 7, 1 and 3 both came back as 2. The pair average survived; the difference inside each pair was thrown away.',
        14: 'A running total for the error, starting at zero. Plain float.',
        15: 'range(6) gives 0,1,2,3,4,5 — the six positions. i is the position we are checking.',
        16: 'Add the squared difference at position i. Squaring makes every gap positive, so errors cannot cancel each other out.',
        17: 'Divide by 6 to get the average squared error per number. It prints 1.0: each of the six numbers was off by exactly 1. That 1.0 is what training a real autoencoder is trying to push down.',
      },
    },
    {
      type: 'note',
      md: `Read the output once more, because it shows the whole trade in miniature. The pairs were 8-and-6, 1-and-3, 9-and-7. Every pair differs by 2, and every pair came back as its average. The bottleneck kept "roughly where each pair sits" and dropped "which of the two was bigger". A real 784-to-32 encoder makes the same kind of choice on a much larger scale: it keeps stroke shape and thickness, and throws away the exact grey value of pixel 431. Whether that is a good trade depends entirely on what you wanted, which is why the loss function — the thing that defines "good" here — is a topic of its own, in the Metrics module *Generative Model Objectives: Reconstruction, ELBO & GANs*.`,
    },
    {
      type: 'intuition',
      title: 'Why a trained autoencoder still cannot generate anything',
      md: `You now own a decoder that turns 32 numbers into a picture. So type in 32 random numbers, press run, get a free digit? No. You get static.

First, one word. **Sampling** means drawing a value at random from some range or shape — the way rolling a die samples a number from 1 to 6. Generation is exactly "sample a z, then decode it".

- Picture every training image as a dot. Its position is the 32 numbers the encoder produced for it. All those dots together live in a space called the **latent space** — 32 dimensions, one per number in z.
- Draw the dots and they sit in scattered clumps, with large empty regions between the clumps.
- The decoder was only ever asked about the dots. Every training step showed it a z that the encoder had actually produced, and asked for that image back. It was never once asked what to do anywhere else.
- A random 32 numbers almost certainly lands in an empty region. The decoder has no idea what belongs there, so it emits nonsense. It is not broken. It is being asked a question it was never trained on.
- Walk in a straight line from the z of a "3" to the z of an "8" and decode the points along the way: the middle of the walk is usually not a digit at all.
- So generation needs a latent space with two properties nothing has asked for yet: **no gaps** (every point decodes to something plausible) and **smoothness** (nearby points decode to similar things).`,
    },
    {
      type: 'intuition',
      title: 'The VAE: encode a fuzzy cloud instead of a sharp dot',
      md: `Instead of pinning each photo to one exact dot on the map, give it a small fuzzy circle. Circles overlap. A map covered in overlapping circles has no gaps.

A **VAE** (variational autoencoder) is an autoencoder with exactly one structural change, plus one extra pull on the training.

- **The change:** the encoder no longer outputs one latent vector. It outputs *two* lists of numbers — a centre and a width. Together those describe a small cloud in latent space rather than a single point. That is what "the encoder outputs a distribution" means.
- Each training step then **samples** one z from that cloud and hands it to the decoder. Different z every time, from the same input.
- So the decoder is forced to make *every* point in the cloud rebuild the image sensibly, not just one point. That is where **smoothness** comes from.
- **The extra pull:** a second term in the loss drags every cloud toward the same standard region around the origin — centre near 0, width near 1. Clouds get packed together instead of drifting off into private corners. That is where **no gaps** comes from.
- Now sampling works. Draw random numbers from that same standard region, hand them to the decoder, and out comes a new image the model has never seen.
- One sentence to keep: the autoencoder learns *where each input goes*; the VAE learns *where everything goes*, and leaves nowhere empty.
- The exact form of that second pull, and why the two terms together are the right thing to maximise, is derived in the Metrics module *Generative Model Objectives: Reconstruction, ELBO & GANs*. Read it when you want the maths; you do not need it to use the idea.`,
    },
    {
      type: 'note',
      md: `The two pulls fight, and that fight is the whole tuning story. The rebuild term wants each cloud tiny and far from every other cloud, because that is how you reconstruct an input exactly — let it win alone and you are back to the plain autoencoder, gaps and all. The packing term wants every cloud identical and centred — let *that* win alone and every input encodes to the same cloud, z stops carrying any information about the input, and the decoder just emits the average image no matter what you feed it. That named failure is **posterior collapse**. Real training sits between the two, and the knob that sets where is a weight on the second term. Turn it to zero and you have literally rebuilt the plain autoencoder, which is the cleanest way to remember what it buys you: not sharper pictures, but a space you can sample from.`,
    },
    {
      type: 'intuition',
      title: 'Why VAE pictures come out blurry',
      md: `Ask ten people to draw "a dog", then average the ten drawings pixel by pixel. You get a brown smudge. The average of several valid answers is usually not itself a valid answer.

- The decoder is scored on squared error against the original image, pixel by pixel.
- For a given z there are many images that would be reasonable. The whiskers could be here, or there.
- Squared error is smallest when you predict the **average** of all the reasonable answers. Drawing the whiskers faintly in both places scores better than committing to one place and being wrong.
- Hedging across pixel positions looks exactly like blur. So the blur is not the network being too small or trained too little. It is the network doing precisely what it was scored on.
- Remember that, because the next model removes the pixel-by-pixel score entirely, and gets sharp pictures as a direct result.`,
    },
    {
      type: 'intuition',
      title: 'The GAN: one network makes fakes, another one judges them',
      md: `A forger paints fake banknotes. A detective looks at each note and says only "real" or "fake", never explaining why. Both get better for years. Eventually the forger is very good.

A **GAN** (generative adversarial network) is two networks trained against each other.

- The **generator** takes random numbers in and produces an image out. It is the forger. It never sees a real image in its life — its only feedback is what the judge said about its own work.
- The **discriminator** takes an image in and produces one number out: how likely this image is real rather than made up. It is the detective. It trains on a mix of real images and the generator's fakes, and it is told which is which.
- The two goals are exact opposites. The discriminator wants to be right. The generator wants the discriminator to be wrong about its output. One's gain is the other's loss.
- Notice what is missing: there is no "correct image" for a given input. Nothing is compared pixel by pixel to a target. There is only the judge's opinion.
- That is why GAN images are sharp. A blurry image is the easiest thing in the world for a detective to spot, so blur gets punished immediately, and averaging is never a safe answer.
- The exact objective both networks are optimising lives in the Metrics module *Generative Model Objectives: Reconstruction, ELBO & GANs*.`,
    },
    {
      type: 'intuition',
      title: 'Why GAN training is genuinely unstable',
      md: `Every model you have trained so far had a fixed target. The data did not move while you learned. In a GAN, the thing you are being scored against is *itself learning*, and it is learning to defeat you. Three concrete consequences.

- **The ground moves.** The generator improves against today's discriminator. Tomorrow the discriminator has adapted, and the improvement is worthless. The two can chase each other in circles for a very long time without settling anywhere.
- **Losing all feedback.** If the discriminator gets far ahead, it rejects every fake with total confidence. "Definitely fake" tells the generator nothing about which direction to move. A judge who is too good gives no useful feedback at all, so the generator stops improving exactly when it most needs help.
- **Mode collapse.** **Mode collapse** is when the generator finds one output that reliably fools the discriminator and then produces that same output for every input. You ask for 64 faces and get 64 copies of one face. This is not a bug in the code: the generator was asked to fool the judge, and it was never once asked to be varied. A single winning output satisfies everything that was actually demanded of it.
- Add it up and you get a model with no reliable signal that says "training is going well". The loss numbers are relative scores in a fight between two changing players, not a measure of picture quality. The only honest check is to look at a grid of samples.`,
    },
    {
      type: 'intuition',
      title: 'Diffusion: wreck the picture on purpose, then learn to un-wreck it one step at a time',
      md: `Drop a spot of ink into a glass of water and film it spreading until the water is a uniform grey. Diffusion trains a model to play that film backwards.

**Denoising** means taking a corrupted input and producing the clean version. That is the only skill this model ever learns.

- **Going forward — no learning here at all.** Take a real image. Add a small amount of random noise. Repeat, maybe 1000 times. Each step is slightly grainier than the last, and by the end nothing of the original is left: it is pure static.
- **What the model is trained to do.** Show it one of those grainy images, along with which step number it came from, and ask it: *which noise is in here?* It answers with a picture-sized guess at the noise.
- **Why that is such an easy job to train.** You added the noise yourself, so you know the exact right answer. It is ordinary supervised learning with a free, perfect label — one network, one squared-error score, no opponent anywhere.
- **Generating.** Start from pure static that came from no image at all. Ask the model what noise is in it. Subtract a *slice* of the noise it predicted. Add a small pinch of fresh noise. Step down and repeat, a few dozen to a thousand times. An image that never existed condenses out.
- **Why a slice and not the whole predicted noise?** Because at the start the model has almost nothing to go on, so its single best guess is the average of everything plausible — the brown-smudge problem again. Taking many small corrections, each of which only has to be slightly right, avoids ever needing one confident leap. The demo below shows the leap failing, on purpose.
- This is what the image and video tools you have used are built on. The cost is that generation is a long chain of network passes instead of one, which is why they take seconds rather than milliseconds.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 1: teach a model to spot the noise (plain Python, one number instead of an image)',
      code: `import random
random.seed(0)

w = 0.0
c = 0.0
for step in range(20000):
    x0 = random.gauss(5.0, 0.5)
    eps = random.gauss(0.0, 1.0)
    xt = 0.1 * x0 + 0.995 * eps
    pred = w * xt + c
    slope = 2 * (pred - eps)
    w = w - 0.01 * slope * xt
    c = c - 0.01 * slope
print('learned w :', round(w, 3))
print('learned c :', round(c, 3))

# ---- real output ----
# learned w : 1.004
# learned c : -0.498`,
      annotations: {
        1: 'random is in the standard library. No neural network library is needed for any of this.',
        2: 'seed(0) fixes the random sequence, so you get exactly the numbers printed below when you run it.',
        4: 'w and c are the model. The whole model. It will predict noise as w times the input plus c — a straight line, which is all we need when the "image" is a single number.',
        5: 'c starts at zero too. Both get nudged 20000 times by the loop below.',
        6: 'One pass of the loop is one training step: make an example, guess, measure the miss, nudge.',
        7: 'Draw a "real image" from the data: a single number near 5.0, give or take 0.5. gauss(mean, spread) draws from a bell curve. Our whole dataset is "numbers around 5".',
        8: 'Draw the noise we are about to add. eps (epsilon) is the standard name for it. This is the label — the exact answer the model must learn to produce.',
        9: 'The forward step: keep a tiny 0.1 of the real number and add 0.995 of the noise. xt is the wrecked version, and it is almost entirely noise, like the last step of a real forward process.',
        10: 'The model looks at the wrecked number and guesses which noise is inside it.',
        11: 'How wrong the guess was, doubled. Squared error is (pred - eps) squared, and its slope with respect to pred is 2 times (pred - eps). Slope means: which way does the error move if I nudge the guess.',
        12: 'Nudge w against the slope. Multiplying by xt is the chain rule doing its job: pred moves by xt for each unit of w, so w deserves that much of the blame. 0.01 is the step size.',
        13: 'Nudge c the same way. pred moves one-for-one with c, so there is no extra factor here.',
        14: 'w came out at 1.004. Since xt is mostly the noise itself, "read the noise off the wrecked number almost directly" is the right rule, and the model found it.',
        15: 'c came out at -0.498, which cancels the small leftover of the data (0.1 times an average of 5.0 is 0.5). Nobody told it that; it fell out of 20000 nudges.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 2: now generate — start from pure noise and remove what the model sees',
      code: `made = []
for i in range(6):
    xt = random.gauss(0.0, 1.0)
    eps_hat = w * xt + c
    x0_hat = (xt - 0.995 * eps_hat) / 0.1
    made.append(round(x0_hat, 2))
print('generated :', made)

# ---- real output ----
# generated : [4.96, 4.95, 4.95, 4.95, 4.95, 4.94]`,
      annotations: {
        1: 'An empty list to collect the generated numbers.',
        2: 'Make six of them. i is just a counter; we never use its value.',
        3: 'The whole point of the module, in one line: this is pure noise. No image went into it. There is nothing here to reconstruct.',
        4: 'Ask the trained model what noise it thinks is inside. eps_hat is its answer.',
        5: 'Undo the forward step algebraically. The forward step was xt = 0.1 * x0 + 0.995 * eps, so if you trust the predicted eps, solving for x0 gives this line. Removing ALL the predicted noise in one jump.',
        6: 'Store the result, rounded to two decimals so the printed line is readable.',
        7: 'Print all six. They are around 4.95 — the model really did generate numbers that look like our data, from noise alone.',
      },
    },
    {
      type: 'note',
      md: `Now look at the six outputs properly: 4.96, 4.95, 4.95, 4.95, 4.95, 4.94. The training data was numbers spread around 5.0 with a spread of 0.5, so a good generator should produce things like 4.3 and 5.6. These are all glued to 4.95. The generator learned the *average* of the data and nothing else. This is the brown-smudge problem in its simplest possible form, and it happened because we removed all the predicted noise in a single leap — and from pure static, the model's single best guess about what was hidden in there *is* the average. Real diffusion never takes that leap. It removes a thin slice, adds a pinch of fresh noise, and asks again, hundreds of times, so each individual guess is easy and the randomness it adds along the way is what makes two runs come out different. That is the reason for the step count, stated in one line: **many easy questions instead of one impossible one.**`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Diffusion: noise it to death, then walk back one step at a time',
        notice:
          'Frames 1-4 are the forward process, where nothing is learned. Frames 5-8 are generation. The last frame is the GAN alternative, for contrast: one step, but with a judge and a trap.',
        leftLabel: 'what runs',
        rightLabel: 'the picture',
        frames: [
          {
            note: 'Forward process, step 0. A real training image, untouched.',
            stack: [
              { name: 't = 0', value: 'noise level: 0%' },
              { name: 'add noise', to: 'img' },
            ],
            heap: [{ id: 'img', value: 'sharp cat photo', label: 'x_0 - real data' }],
          },
          {
            note: 'Add a little noise. Still obviously a cat. Easy steps like this one are where the model learns fine detail.',
            stack: [
              { name: 't = 200', value: 'noise level: about 20%' },
              { name: 'add noise', to: 'img' },
            ],
            heap: [{ id: 'img', value: 'cat plus faint grain', label: 'x_200' }],
          },
          {
            note: 'Halfway. Colour and pose survive, whiskers do not. Steps here are where the model learns overall shape.',
            stack: [
              { name: 't = 500', value: 'noise level: about 55%' },
              { name: 'add noise', to: 'img' },
            ],
            heap: [{ id: 'img', value: 'cat under heavy static', label: 'x_500 - shapes only' }],
          },
          {
            note: 'End of the forward process. Every trace of the cat is gone. That is the goal, because it means generation can START here without needing any image at all.',
            stack: [
              { name: 't = 1000', value: 'noise level: 100%' },
              { name: 'add noise', to: 'img' },
            ],
            heap: [{ id: 'img', value: 'pure static', label: 'x_T - pure noise', moved: true }],
          },
          {
            note: 'Generation begins. Forget the cat completely: draw FRESH random numbers. This is the only input the model ever gets.',
            stack: [
              { name: 't = 1000', value: 'draw pure noise' },
              { name: 'model input', to: 'img' },
            ],
            heap: [{ id: 'img', value: 'pure static', label: 'x_T - random draw' }],
          },
          {
            note: 'One reverse step, which is the entire trick. The model reads the picture and the step number and predicts the noise inside. Subtract a slice of that prediction, add a pinch of fresh noise, and you have the next picture.',
            stack: [
              { name: 'model predicts the noise', to: 'now' },
              { name: 'subtract a slice', to: 'next' },
            ],
            heap: [
              { id: 'now', value: 'pure static', label: 'x_1000' },
              { id: 'next', value: 'static, faintest structure', label: 'x_999' },
            ],
          },
          {
            note: 'Four hundred steps later. Blobs and edges have condensed out of the static. No single step did anything clever; each one removed a sliver.',
            stack: [
              { name: 't = 600', value: 'step 400 of 1000' },
              { name: 'model predicts the noise', to: 'img' },
            ],
            heap: [{ id: 'img', value: 'blobs, edges, a horizon', label: 'x_600' }],
          },
          {
            note: 'Done. A sharp cat that was never in the training set. The cost: 1000 network passes in a row. Every one of them was an easy, well-posed question, and that is the trade.',
            stack: [
              { name: 't = 0', value: 'generation complete' },
              { name: 'output', to: 'img' },
            ],
            heap: [{ id: 'img', value: 'sharp NEW cat', label: 'x_0 - generated sample' }],
          },
          {
            note: 'Contrast: a GAN does it in ONE pass of the generator, graded by a discriminator that is itself still learning. Milliseconds instead of seconds, but the two can chase each other forever, and the generator can win by finding a single output that always fools the judge.',
            stack: [
              { name: 'generator: one pass', to: 'img' },
              { name: 'discriminator: real or fake?', to: 'img' },
              { name: 'MODE COLLAPSE: same cat every time', to: 'img', danger: true },
            ],
            heap: [{ id: 'img', value: 'sharp cat, 1 pass', label: 'one pass - instant, but fragile' }],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'The four side by side, and why evaluating any of them is hard',
      md: `- **Autoencoder.** Squeeze and rebuild. Excellent at compressing, denoising and spotting odd inputs. Not a generator: its latent space has gaps.
- **VAE.** Encodes a cloud instead of a point, so the space is samplable. Trains easily. Pictures come out soft, because it is scored pixel by pixel.
- **GAN.** Generator versus discriminator. Sharpest results for years, and generation is a single fast pass. Training is a balancing act and variety is its standing weakness.
- **Diffusion.** Learn to remove a little noise; repeat from static. Sharp *and* varied, and training is ordinary supervised learning. It pays for that with many passes per image.
- **The modern hybrid, in one sentence:** a VAE compresses the image into a small latent space, and a diffusion model does its noising and denoising inside that smaller space. That is why it is called latent diffusion.
- **Evaluation is the genuinely hard part.** There is no correct answer to compare against — the whole point is that the output is new — so accuracy is meaningless here. You need scores that judge quality and variety separately, and every one of them has known blind spots. That is a subject in itself: it is taught in the Metrics module *Generative Model Objectives: Reconstruction, ELBO & GANs*.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: sizing a face generator by hand',
      md: `You are given 100,000 face photos, 64 by 64 pixels, colour. Product wants to generate new faces. Work through it with a pen, no code.

**Step 1 — how big is one input?** 64 × 64 = 4096 pixels, times 3 colour channels = **12,288 numbers per image**.

**Step 2 — pick a bottleneck.** Say 128. The compression is 12,288 ÷ 128 = **96 times**. Every face has to be describable by 128 numbers. Plausible: faces vary in a limited number of ways.

**Step 3 — what does the VAE encoder output?** Not 128 numbers. A centre and a width for each latent number, so **256 numbers**. The decoder still takes 128, because one z is sampled from the cloud before it goes in.

**Step 4 — sample one latent number by hand.** For latent number 1 the encoder says centre 0.4, width 0.2. The random draw for this step comes out as 1.5. The sampled value is 0.4 + 0.2 × 1.5 = **0.7**. Next step, same photo, the draw is −0.5: 0.4 + 0.2 × (−0.5) = **0.3**. Same photo, different z. The decoder must handle both, and that is precisely what stops gaps forming.

**Step 5 — what will the output look like?** Soft. Recognisably faces, correct hair colour and pose, mushy at the eyelashes. If product needs magazine-sharp, the pixel-by-pixel score is the thing standing in the way, so the answer is a different model, not more epochs.

**Step 6 — what would you actually ship?** A diffusion model, and if generation is too slow, use the VAE you just built as the compressor and run the diffusion inside its 128-number space instead of over 12,288 pixels. Roughly 96 times less to denoise at every one of the steps.`,
    },
    {
      type: 'note',
      md: `**The classic mistake, walked into on purpose.** You are training a GAN. At epoch 5 the generator's loss reads 2.8. By epoch 40 it is down to 0.9, and it is still falling smoothly. You write in the log: "generator loss down 68 percent, quality clearly improving, training another 50 epochs." Then you open the sample grid and every one of the 64 faces is the same face.

Here is why the number said nothing. The generator's loss measures **how often it fools the discriminator right now**. It is a score in a match against an opponent who is also changing. A falling generator loss has two completely different explanations that the number cannot tell apart: the generator got better at making faces, or the discriminator got *worse* at spotting fakes. In this case it was neither in a useful sense — the generator found one face that happens to fool this particular discriminator, and repeated it. Fooling the judge is exactly what it was scored on, so mode collapse shows up as a *healthy-looking* loss curve. That is what makes it dangerous.

Contrast that with a diffusion model, where the loss is squared error against a noise you generated yourself. The target does not move, so a falling loss really does mean the model is better at its job. **The rule: a loss is a progress meter only when the thing it is measured against holds still.** In a GAN, look at samples and at a variety score. In a diffusion model, the loss curve is safe to trust.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems (work them before reading the solutions)',
      md: `1. An autoencoder is trained on 28×28 images with a bottleneck of 784. Training error goes to almost exactly zero. Your teammate says the model learned the data perfectly. What actually happened?
2. You take a trained plain autoencoder, feed the decoder 32 random numbers, and get static. Someone suggests training the decoder longer. Will that fix it?
3. A VAE's centre-and-width outputs come back as centre ≈ 0 and width ≈ 1 for *every* training image. Reconstructions are all the same blurry average face. Name the failure and the knob that caused it.
4. You must generate 500 product images overnight on one GPU, and separately power a live video filter that must respond in under 30 milliseconds per frame. Which model for which job, and why?`,
    },
    {
      type: 'note',
      md: `**Solutions.**

**1.** The bottleneck is the same size as the input, so nothing was squeezed. The network learned the identity function — copy the input to the output. Zero error, zero understanding. The proof: give it an image type it has never seen and it will copy that perfectly too, which a model that had learned anything about digits could not do. Compression is not a side effect of the autoencoder; it is the only reason it learns anything.

**2.** No. More training makes the decoder better at the z values the encoder produces, which is not where your random numbers landed. The problem is the *shape of the latent space*, not the decoder's skill, and nothing in the autoencoder's objective ever mentions that shape. Fixing it needs a change of design — a VAE — not a change of budget.

**3.** Posterior collapse. Every input maps to the same standard cloud, so z carries no information about which image it came from and the decoder learned to ignore it entirely and emit the dataset average. The cause is the packing term outweighing the rebuild term. Turn its weight down, or start it at zero and raise it gradually so the model first learns to use z at all. Watch for the symmetric failure at the other extreme: set the weight to zero and you have a plain autoencoder again, with gaps.

**4.** Overnight batch of 500: diffusion. Nobody is waiting, quality and variety matter, and a few seconds per image times 500 is under an hour. Live video filter at 30 milliseconds a frame: a GAN, or a diffusion model distilled down to one or two steps. A GAN generates in a single pass, which is the one axis where it still wins outright. The general shape of this answer: if latency is the binding constraint, pay for it with training difficulty; if quality and variety are, pay for it with time at generation.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Four extras, each one a name you will meet in real code.

- **The reparameterisation trick.** A VAE samples z from the encoder's cloud, and you cannot compute the effect of a nudge *through a random draw* — a die roll has no slope. The fix is to draw the randomness separately, as plain unit noise, and then write z = centre + width × noise. Same distribution, but z is now ordinary arithmetic on the encoder's outputs, and arithmetic can be differentiated. The randomness has been moved into an input that needs no gradient. This is asked about by name.
- **Denoising autoencoder.** Corrupt the input on purpose, and ask the autoencoder for the clean version. The bottleneck can no longer get away with copying, so it must learn what the data actually looks like. Notice that this idea, scaled up and repeated over many noise levels, is diffusion.
- **Anomaly detection.** Train an autoencoder on normal data only, then score new inputs by their reconstruction error. Normal things rebuild well; a fraudulent transaction rebuilds badly, because the decoder never learned that shape. Where the threshold goes is a business decision, not a model decision.
- **Fewer diffusion steps.** Two families of fix for the step-count cost. Better samplers (DDIM and friends) skip along the path and get good results in 20 to 50 steps instead of 1000, with no retraining. Distillation trains a second network to jump several of the original's steps at once, reaching one to four steps, at a training run's cost and some loss of variety.
- **How a text prompt steers it.** The prompt is turned into a list of numbers by a text model, and the denoising network *attends* to those numbers at every single step — each region of the picture asks which words are relevant to it. That is why the prompt shapes the whole trajectory rather than just the starting point. The attention mechanism itself is taught from zero in the GenAI track.`,
    },
  ],
  quiz: [
    {
      question: 'What separates a generative model from a classifier, in terms of what comes out?',
      options: [
        {
          text: 'A classifier outputs a label about the input you gave it; a generator outputs a whole new example that was not in the data',
          explanation: 'Correct. Ten class scores versus 784 pixel values. One judges an existing thing, the other produces a new thing.',
        },
        {
          text: 'A generative model is more accurate than a classifier',
          explanation: 'They are not doing the same job, so they cannot be compared on accuracy. A generator has no correct answer to be accurate against.',
        },
        {
          text: 'A generative model needs labelled data and a classifier does not',
          explanation: 'It is the other way round. Classifiers need labels; an autoencoder or a diffusion model makes its own target out of the input.',
        },
      ],
      correct: 0,
    },
    {
      question: 'An autoencoder is built with a bottleneck exactly as wide as its input. What does it learn?',
      options: [
        {
          text: 'The most important features of the data, faster than a narrow one would',
          explanation: 'Nothing forces it to find features. With room to store everything, storing everything is the easiest way to get zero error.',
        },
        {
          text: 'To copy the input straight through: near-zero error and nothing learned about the data',
          explanation: 'Correct. The squeeze is what forces the network to find structure. Remove the squeeze and you have a copying machine.',
        },
        {
          text: 'Nothing at all — training will fail to converge',
          explanation: 'Training converges beautifully. That is the trap: the error looks perfect while the model is useless.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Why does decoding 32 random numbers from a trained plain autoencoder produce static?',
      options: [
        {
          text: 'The decoder is too small to make a full image',
          explanation: 'The same decoder rebuilds training images fine. Size is not the issue; where you sampled is.',
        },
        {
          text: 'The latent space has gaps — the random point lands where no training image ever went, and the decoder was never asked what belongs there',
          explanation: 'Correct. Training only ever constrained the decoder at the exact points the encoder produced. Everywhere else is undefined.',
        },
        {
          text: 'Squared error cannot be differentiated, so the decoder never really trained',
          explanation: 'Squared error differentiates fine and the decoder did train. It simply learned nothing about unvisited regions.',
        },
      ],
      correct: 1,
    },
    {
      question: 'What is the one structural change a VAE makes to an autoencoder?',
      options: [
        {
          text: 'The decoder is made much deeper',
          explanation: 'Depth is a tuning choice, not the defining change, and it would not fix the gaps in the latent space.',
        },
        {
          text: 'The encoder outputs a centre and a width — a small cloud — instead of a single point, and a z is sampled from that cloud each step',
          explanation: 'Correct. Encoding a distribution rather than a point is what makes the space smooth and samplable.',
        },
        {
          text: 'The reconstruction target becomes a different image',
          explanation: 'The target is still the input itself. Only what the encoder emits, and how the space is shaped, changed.',
        },
      ],
      correct: 1,
    },
    {
      question: 'A GAN has trained for 40 epochs. Generator loss has fallen steadily. The 64-image sample grid shows the same face 64 times. What is going on?',
      options: [
        {
          text: 'Mode collapse: the generator found one output that fools the discriminator and repeats it, and the falling loss reflects exactly that',
          explanation: 'Correct. It was asked to fool the judge and never asked to be varied, so one winning output is a perfectly good solution to what was demanded.',
        },
        {
          text: 'The learning rate is too high and the model has diverged',
          explanation: 'Divergence gives you noise or NaNs, not one clean repeated face, and the loss would not be falling smoothly.',
        },
        {
          text: 'Training is going well and just needs more epochs',
          explanation: 'This is the trap the loss curve sets. More epochs entrench the collapse; the loss will keep looking fine.',
        },
      ],
      correct: 0,
    },
    {
      question: 'During training, what is a diffusion model actually asked to produce?',
      options: [
        {
          text: 'Which step number the noisy picture came from',
          explanation: 'The step number is given to the model as an input, not predicted from the picture.',
        },
        {
          text: 'The noise that was added to make this picture, so a slice of it can be subtracted',
          explanation: 'Correct. The trainer added that noise, so the correct answer is known exactly. It is ordinary supervised learning with a free label.',
        },
        {
          text: 'Whether the picture is real or generated',
          explanation: 'That is a GAN discriminator. There is no judge anywhere in a diffusion model.',
        },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain an autoencoder and why the bottleneck matters, without using any maths.',
      answer:
        'An autoencoder is two networks trained together. The encoder squeezes the input into a short list of numbers called the latent vector; the decoder rebuilds the input from that list. The training target is the input itself, so no labels are needed. For a 28-by-28 image the journey is 784 numbers in, maybe 32 in the middle, 784 back out. The bottleneck is the entire point: with only 32 slots the network cannot store a copy, so to get low error it has to find the patterns that let 32 numbers stand in for 784 — overall stroke shape rather than individual pixel values. Widen the bottleneck to 784 and the network learns to copy: error goes to zero and nothing is learned. The squeeze is not a limitation of the design, it is the mechanism.',
      isCaseBased: false,
    },
    {
      question: 'Why can a trained autoencoder not generate new images, and what does a VAE change to fix it?',
      answer:
        'The decoder was only ever asked about the latent vectors the encoder actually produced. Those sit in scattered clumps with large empty regions between them, so a random latent vector lands somewhere the decoder was never trained and the output is noise. Nothing in the objective ever asked for a well-shaped latent space. A VAE makes one structural change plus one addition. The change: the encoder outputs a centre and a width instead of a point, describing a cloud, and each training step samples a latent vector from that cloud — so the decoder must handle every point in the cloud, which makes the space smooth. The addition: a second loss term pulls every cloud toward one standard region, so the clouds pack together and stop leaving empty space. Now drawing from that standard region and decoding gives a genuinely new image.',
      isCaseBased: false,
    },
    {
      question: 'Why are VAE outputs soft and GAN outputs sharp? Answer in terms of what each model is scored on.',
      answer:
        'A VAE decoder is scored pixel by pixel against the original, usually with squared error. For a given latent vector there are many plausible images, and squared error is smallest when you predict the average of them. The average of several sharp images is a blur, so the model hedges because hedging is optimal under that score. A GAN has no per-pixel target at all — the only feedback is a discriminator saying real or fake, and a blurry image is trivially easy to reject, so blur is punished rather than rewarded. The costs are symmetric: the VAE covers the whole data distribution and pays in sharpness; the GAN only has to be convincing and pays in variety. Diffusion gets both by keeping a squared-error objective but making each individual prediction so easy that there is almost nothing to average over.',
      isCaseBased: false,
    },
    {
      question: 'Why is diffusion training so much more stable than GAN training?',
      answer:
        'A GAN has two networks with opposite goals, so the thing each one is scored against is itself moving. That produces three problems: the generator improves against a discriminator that then adapts, so progress can go in circles; a discriminator that gets too far ahead rejects everything with total confidence and gives no useful direction back; and the generator can satisfy its objective by finding a single output that fools the judge, which is mode collapse. There is also no number that reliably reports progress, since the losses are relative scores in a moving fight. Diffusion replaces all of that with one network doing supervised regression: predict the noise that was added, with the correct answer known exactly because the trainer generated it. Fixed target, no opponent, no balance to maintain, and a loss curve you can actually trust.',
      isCaseBased: false,
    },
    {
      question:
        'Case: your VAE trains, the total loss falls nicely, but every sample looks like the same blurry average face and the second loss term is almost zero. What happened and how would you fix it?',
      answer:
        'The near-zero second term is the diagnosis: every input is being encoded to the same standard cloud, so the latent vector carries no information about which image it came from. That is posterior collapse, and the decoder has learned to ignore the latent entirely and emit the dataset average. Two usual causes: the weight on that packing term is too high, or the decoder is powerful enough to produce a decent image without needing the latent at all. Fixes, cheapest first: start the weight at zero and ramp it up over the first few epochs, so the model first learns to use the latent for something; put a floor under how small the term may go per latent dimension, forcing each one to carry information; or lower the weight outright; or weaken the decoder. The trade to state out loud: everything that fights collapse pushes the latent away from the standard region, which makes sampling worse. You are picking a point on that curve, not removing the tension.',
      isCaseBased: true,
    },
    {
      question:
        'Case: you are training a GAN on faces. After 30 epochs the sample grid shows four or five distinct faces repeating. The losses look flat and unremarkable. Walk me through your debugging.',
      answer:
        'Name it first: mode collapse. And note that flat unremarkable losses are exactly what you should expect, because GAN losses are relative scores in a fight between two changing networks, not progress meters — the sample grid and a variety score are the real instruments here. Then, in order: measure rather than eyeball, using a quality score plus a separate variety score so that "sharp" and "diverse" cannot hide each other. Check the balance between the two networks — if the discriminator is winning easily the generator is optimising against a saturated judge, so lower the discriminator learning rate or give the generator more steps. Change the objective to one of the standard stability packages, which are designed to keep useful feedback flowing when the discriminator is confident. Add explicit pressure for variety by letting the discriminator see a whole batch at once, so identical outputs become detectable and punishable. And check for a boring bug: a broken shuffle or a much smaller effective dataset than you think produces this exact symptom. Trade-off: every variety mechanism costs some sharpness, and if the deadline is real, the honest recommendation is a diffusion model, where this failure mode does not exist.',
      isCaseBased: true,
    },
    {
      question:
        'Case: you deployed an autoencoder for anomaly detection on server telemetry, and it flags 40 percent of ordinary traffic as anomalous. What do you check?',
      answer:
        'Reconstruction-error anomaly detection has a short list of well-known failure points, so go in order. First the threshold: it is a hyperparameter, and if it was set on training data it is far too tight. Recalibrate it on a held-out window of normal-only traffic and look at the shape of the error distribution, which is usually long-tailed rather than symmetric. Second, drift: telemetry changes with every release and with traffic seasonality, so the "normal" the model learned is stale — the fix is periodic retraining and monitoring the error distribution itself, not a looser threshold. Third, scaling: if features were standardised using training statistics, any shift in scale inflates the error for everything, so verify that the identical transform runs in production. Fourth, the bottleneck: if it is so tight that the model cannot rebuild even normal data, everything looks anomalous — check the training reconstruction error before blaming the data. Fifth, contaminated training data: if anomalies were present during training the model learned to rebuild them, and the score loses meaning in both directions. The trade to name: the threshold is a dial between missed incidents and alert fatigue, and where it belongs comes from the cost of each, not from the model.',
      isCaseBased: true,
    },
    {
      question:
        'Case: your text-to-image diffusion service takes 9 seconds per image and product wants under 1 second. What are your options and what does each cost?',
      answer:
        'The bill is the number of sequential network passes, so every option either reduces that count or shrinks the network. First, a better sampler: the standard skipping samplers cut a thousand steps to twenty or fifty with a small quality loss and no retraining at all — do this first, it is a configuration change. Second, latent diffusion: if you are denoising at full image resolution, put a VAE in front and denoise inside its much smaller latent space instead. A large win, but it needs a compressor and a retraining run. Third, distillation: train a student network to jump several of the teacher\'s steps at once, reaching one to four steps. The biggest win, at the cost of a training run and some fidelity and variety. Fourth, plain engineering: lower-precision arithmetic, compiled kernels, batching concurrent requests, and caching the text encoder output — often two to three times on its own with no quality cost. Fifth, a smaller network, which is a direct quality trade. What I would actually ship: precision plus batching plus a thirty-step sampler, measure, and distil only if still short. And say explicitly that quality is measured on a fixed prompt set before and after, or "faster" quietly means "worse".',
      isCaseBased: true,
    },
  ],
  flashcards: [
    {
      front: 'Classifier vs generator, by what comes out',
      back: 'Classifier: you give it a picture, it gives back a label. Generator: you give it random numbers, it gives back a whole new picture that was never in the data.',
    },
    {
      front: 'Autoencoder in one line',
      back: 'Encoder squeezes the input into a short latent vector z; decoder rebuilds the input from z. The target is the input itself, so no labels are needed.',
    },
    {
      front: 'What the bottleneck is for',
      back: '784 to 32 to 784. With only 32 slots the network cannot store a copy, so it must find patterns. Make the middle as wide as the input and it just learns to copy.',
    },
    {
      front: 'Why a plain autoencoder cannot generate',
      back: 'Its latent space has gaps. The decoder was only ever asked about the points the encoder produced, so a random point lands somewhere it was never trained and gives static.',
    },
    {
      front: 'The one change a VAE makes',
      back: 'The encoder outputs a centre and a width (a cloud), not a point, and a z is sampled from it each step. A second loss term packs all the clouds into one standard region. Result: no gaps, so sampling works.',
    },
    {
      front: 'Why VAE outputs are soft',
      back: 'Pixel-by-pixel squared error is smallest at the average of all plausible images for that z, and the average of several sharp images is a blur. The loss is hedging, not failing.',
    },
    {
      front: 'GAN, and mode collapse',
      back: 'Generator makes fakes from random numbers; discriminator judges real vs fake. Opposite goals, so the target moves and training is unstable. Mode collapse: the generator finds one output that fools the judge and repeats it — it was asked to fool, never to vary.',
    },
    {
      front: 'Diffusion in one line, and its cost',
      back: 'Add noise step by step until the image is static; train one network to predict the noise; then start from static and remove a slice at a time. Stable, sharp and varied. Costs many sequential passes per image.',
    },
  ],
  mindmapMarkdown: `- Generative Models
  - What "generative" means
    - Classifier: picture in, label out
    - Generator: random numbers in, NEW picture out
  - Autoencoder
    - Encoder squeezes to latent vector z, decoder rebuilds
    - Shape journey 784 to 32 to 784
    - Bottleneck forces patterns instead of copying
    - Target is the input: no labels needed
    - Cannot generate: latent space has GAPS
  - VAE
    - Encoder outputs a cloud (centre + width), not a point
    - Sample z from the cloud each step: smoothness
    - Second loss term packs clouds together: no gaps
    - Now samplable, so it is a real generator
    - Outputs soft: pixel score rewards the average
    - Posterior collapse if the packing term wins
  - GAN
    - Generator makes fakes, discriminator judges them
    - No pixel target, only a judge, so output is sharp
    - Unstable: the opponent is also learning
    - Too-good judge gives no useful feedback
    - Mode collapse: one output forever
    - Loss curve is not a progress meter
  - Diffusion
    - Forward: add noise until pure static (no learning)
    - Model predicts the noise inside a noisy picture
    - Free perfect label, so training is ordinary regression
    - Generate: from static, remove a slice, repeat
    - Many easy questions beats one impossible one
    - Cost: many sequential passes per image
  - Comparison
    - Quality: diffusion, then GAN, then VAE
    - Variety: diffusion, then VAE, then GAN
    - Stability: diffusion and VAE easy, GAN hard
    - Speed: GAN one pass, diffusion many
    - Evaluation is hard: no correct answer to compare to
  - Modern hybrid
    - VAE compresses, diffusion generates inside that latent space`,
}

export default m
