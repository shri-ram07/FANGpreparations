import type { Module } from '../types'

const m: Module = {
  id: 'dl-l3-practicals-and-debugging',
  subjectId: 'dl',
  level: 3,
  title: 'The Four Practicals: Things You Build Yourself',
  whyItMatters:
    'Reading about a neural network and building one are different skills, and only the second one survives an interview. This module is four build briefs: what to build, what to check before you let it train, and what "finished" looks like as a number you can print. The implementations are already taught in earlier modules of this subject; what is missing there, and what you get here, is the order of operations and the two checks that stop you burning a day on a broken build.',
  assumes: [
    'You have read the earlier Deep Learning modules, or at least know what a layer, a weight and a loss are',
    'You can write a Python for loop and call a function',
    'You know what an average is, and what a logarithm roughly does (the log of a small number is a large negative number)',
    'You do NOT need PyTorch installed to read this. Every snippet here runs on numpy and scikit-learn alone.',
  ],
  estMinutes: 29,
  sections: [
    {
      type: 'intuition',
      title: 'Four builds, in order of difficulty',
      md: `Each of these is a weekend project. Each one proves a different thing about you, and each one is small enough to finish.

- **P1 — a 2-layer network on handwritten digits, written in numpy only.** Proves you can do backpropagation by hand. Highest value of the four.
- **P2 — an image classifier on CIFAR-10, twice: once from scratch, once by reusing a pretrained network.** Proves you know why nobody starts from scratch any more.
- **P3 — a character-by-character text generator.** Proves you can handle sequences and sampling.
- **P4 — a very small GAN on digits.** Proves you can run a training process that has no loss curve to trust.

Do them in this order. Each one reuses machinery from the one before it.`,
    },
    {
      type: 'intuition',
      title: 'The two checks you run before every training run',
      md: `Both take under a minute and both catch bugs that otherwise cost you a day. Every brief below ends with them, so learn them once here.

- **Check 1 — the loss at the very start must match a random guesser.** Before any training, a fresh 10-class model spreads its probability evenly, giving each class 1/10. The loss for a correct-class probability of 0.1 is -log(0.1) = **2.3026**. Print something near 2.30 and your inputs, labels and loss are wired to each other. Print 9 and the wiring is wrong. Print 0.04 and the answer is leaking into the input.
- The general form is -log(1/C) for C classes: C = 2 gives 0.693, C = 10 gives 2.303, C = 1000 gives 6.908.
- **Check 2 — take 8 examples and memorise them.** Train on those 8 only, forever, with dropout, weight decay, augmentation and shuffling all switched off. A model with 100,000 weights holding 8 examples should drive the loss to nearly zero within a few hundred steps.
- If it cannot, the fault is in your code or your learning rate. It is never the data: eight rows cannot be "too hard", because there is nothing to generalise to, only something to memorise.
- Run Check 1 before your first training run, and Check 2 before your first long one.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Check 1, run for real: the loss of a brand-new model',
      code: `import numpy as np                                    # numpy is the only library this check needs

def softmax(z):                                       # z: (examples, classes) raw scores
    z = z - z.max(axis=1, keepdims=True)              # subtract each row's largest score: stops exp() overflowing
    e = np.exp(z)                                     # exponentiate every score, so all values are positive
    return e / e.sum(axis=1, keepdims=True)           # divide by the row total, so each row sums to 1

rng = np.random.default_rng(0)                        # a seeded generator: the same random numbers every run
logits = rng.normal(0, 0.01, size=(4, 10))            # 4 examples, 10 classes, scores near zero (a fresh model)
y = np.array([3, 1, 9, 0])                            # the true class of each of the 4 examples
P = softmax(logits)                                   # turn the scores into probabilities
picked = P[np.arange(4), y]                           # probability given to the RIGHT class, one per row
loss = -np.log(picked).mean()                         # cross-entropy = average of -log(probability of right class)
print('loss at init:', round(float(loss), 4))         # what the model actually printed
print('ln(10)      :', round(float(np.log(10)), 4))   # what a random 10-class guesser must print

# ---- real output ----
# loss at init: 2.3036
# ln(10)      : 2.3026`,
      annotations: {
        9: 'A "logit" is just a raw score before it is turned into a probability. Starting them near zero is what a freshly initialised model does.',
        12: 'P[np.arange(4), y] pairs row 0 with y[0], row 1 with y[1], and so on. numpy calls this fancy indexing: two lists of positions read together. It gives back 4 numbers, not a 4-by-10 grid.',
        16: 'The measured 2.3036 sits 0.001 above the theoretical 2.3026. That gap is the random init, not a bug: the scores are near zero but not exactly zero, so the probabilities are near 0.1 but not exactly 0.1.',
      },
    },
    {
      type: 'intuition',
      title: 'P1 — numpy network on handwritten digits',
      md: `**Build.** A network with one hidden layer: 784 pixel inputs (a 28x28 image flattened into one long row), 128 hidden units with ReLU, 10 outputs with softmax. Cross-entropy loss, plain mini-batch gradient descent, batch size 64. No framework — you write the forward pass and the backward pass yourself.

- The forward and backward equations are derived line by line in *Backpropagation: The Chain Rule on a Graph*. Copy them from there and spend your effort on getting the shapes right.
- **Before training:** print the shape of every tensor once. Confirm the pixels are scaled into [0, 1]. Then run Check 1 and Check 2.
- **Done looks like:** around **97% test accuracy**, in a couple of minutes on a laptop CPU. Not 99% — that needs convolution layers, which is P2.
- **Below 95% after 20 passes over the data** means a bug, not bad luck. The three usual ones: pixels left at 0-255, a softmax written without the max subtraction, and the batch stored as rows in one function and as columns in another.
- Say the parameter count out loud before you build it. The next snippet computes it.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The parameter budget for P1 and P2, computed (real output)',
      code: `def dense_params(n_in, n_out):                        # one fully connected layer
    return n_in * n_out + n_out                       # a weight per (input, output) pair, plus one bias per output

p1 = dense_params(784, 128) + dense_params(128, 10)   # P1's net: 784 pixels -> 128 hidden -> 10 classes
print('P1 params:', p1)                               # the number you should be able to say out loud

def conv_params(c_in, c_out, k):                      # one convolution layer with a k-by-k filter
    return c_in * c_out * k * k + c_out               # each output channel holds c_in filters of k*k, plus one bias

convs = conv_params(3, 32, 3) + conv_params(32, 64, 3) + conv_params(64, 128, 3)   # P2's three conv layers
head = dense_params(128 * 4 * 4, 256) + dense_params(256, 10)                      # 128 channels of 4x4 = 2048 inputs
print('P2 conv layers:', convs)                       # the part that does the seeing
print('P2 dense head :', head)                        # the part that does the deciding
print('head share    :', round(100 * head / (convs + head)), '%')   # share of the parameters sitting in the head

# ---- real output ----
# P1 params: 101770
# P2 conv layers: 93248
# P2 dense head : 527114
# head share    : 85 %`,
      annotations: {
        9: 'The three convolution layers of P2, chained: 3 colour channels in, then 32, then 64, ending at 128 channels.',
        10: 'Where the 4x4 comes from: P2 halves the picture three times with pooling, so 32 -> 16 -> 8 -> 4. Get that chain wrong and this number is wrong and nothing runs.',
        13: '85% of the weights sit in one dense layer that has seen nothing but a flattened grid. This is exactly why modern image networks average each channel down to a single number instead of flattening.',
      },
    },
    {
      type: 'intuition',
      title: 'P2 — the same dataset, built twice',
      md: `**Build.** CIFAR-10 is 60,000 colour photographs, 32x32 pixels, ten classes. Do two runs and compare them honestly.

- **Run A, from scratch:** three convolution layers with pooling between them, then a small dense classifier. About 620,000 weights, about 30 passes over the data. **Done looks like 70-75% test accuracy.**
- **Run B, reusing ResNet-18:** take a network already trained on a million ImageNet photographs, replace its final layer with a fresh 10-output one, and continue training. **Done looks like 93%+ in about 5 passes.**
- The layers and the pooling arithmetic are taught in *CNNs: Convolution, Pooling & Receptive Fields*; the pretrained network itself in *LeNet to ResNet: The Architectures That Mattered*.
- **Before training, two settings that raise no error and cost you the whole gap.** First, the numbers you subtract and divide by when preparing images must be the ones the borrowed weights were trained with, not CIFAR's own. Second, ResNet-18 shrinks its input aggressively in its first two layers because it expects 224x224 photographs; hand it a 32x32 image and there is nothing left to look at. Resize to 224, or replace that opening layer.
- **The lesson is the gap, not either number.** Same data, same hardware, twenty times less of your time. Training from scratch is what you do when your images look nothing like photographs — medical scans, spectrograms, sensor traces.`,
    },
    {
      type: 'intuition',
      title: 'P3 — a character-by-character text generator',
      md: `**Build.** Feed an LSTM one character at a time and ask it to predict the next character. Then let it write on its own. The LSTM itself is taught in *RNNs, LSTMs & the Road to Attention*.

- **Characters, not words, deliberately.** No word-splitting rules to write, no unknown-word handling, and the alphabet is about 65 symbols instead of 50,000 — so the final layer stays tiny and the whole thing trains on a laptop.
- **Data:** any text with a strong voice, about 1 MB. The training target is *the same text shifted one character to the left*, so there are no labels to collect at all.
- **Before training:** confirm your two lookup tables agree — character to number, then number back to character, must return the character you started with. Then Check 1: with a 65-symbol alphabet the starting loss must be near -log(1/65) = **4.17**.
- **When generating, draw a random character from the predicted probabilities; do not take the most likely one.** Always taking the most likely character locks the model into "the the the the" within twenty characters. The dial that controls how boldly you draw is called temperature: divide the scores by T before the softmax, T below 1 plays safe, T above 1 gets wilder.
- **Done looks like:** pass 1, letter soup with roughly the right letter frequencies; pass 5, real short words and plausible spaces; pass 20, almost-English — correct word shapes, matched quotes, sentences that parse and mean nothing. It never becomes coherent, and that is the honest result of a 900,000-weight character model.`,
    },
    { type: 'visual', component: 'NextTokenSampler', props: {} },
    {
      type: 'intuition',
      title: 'P4 — a very small GAN on digits',
      md: `**Build.** Two networks that fight. A **generator** turns 64 random numbers into a 28x28 image. A **discriminator** looks at an image and outputs one score: real or fake. Neither has a loss it can lower on its own. The pair is explained in *Generative Models: Autoencoders, VAEs, GANs & Diffusion*.

- **Alternate two optimisers.** One step on the discriminator (real images pushed toward 1, generated ones toward 0), then one step on the generator (its own images pushed toward 1). They never share an update.
- **Before training, match the pixel ranges.** If the generator ends in tanh, its output lands in [-1, 1], so the real images must be shifted into [-1, 1] too. Otherwise the discriminator wins instantly by checking the range, and the generator learns nothing.
- Keep the two networks about the same size. A discriminator that outclasses the generator is the main cause of a generator that stops improving.
- **Done looks like:** a grid of 64 generated digits that a person would accept as handwriting. **There is no loss value that tells you this.** Render the grid every pass and judge with your eyes.
- **The failure to expect** is all 64 cells showing the same digit while both loss curves look perfectly normal. It has a name, mode collapse, and the standard first response is to weaken the discriminator: lower its learning rate, or update it once per two generator steps.`,
    },
    {
      type: 'note',
      md: `**Where each piece is already taught, so you are not inventing anything.** These briefs are deliberately short because the machinery lives in other modules of this subject.

- Forward and backward equations for P1: *Backpropagation: The Chain Rule on a Graph*.
- Tensors, autograd and the training loop you will write for P2 to P4: *PyTorch: Tensors, Autograd & the Training Loop*.
- Convolution, padding and pooling arithmetic: *CNNs: Convolution, Pooling & Receptive Fields*. Pretrained networks: *LeNet to ResNet: The Architectures That Mattered*.
- Sequences and the LSTM gates: *RNNs, LSTMs & the Road to Attention*.
- Generator and discriminator objectives: *Generative Models: Autoencoders, VAEs, GANs & Diffusion*.
- Dropout, weight decay and augmentation, which you switch off for Check 2 and back on afterwards: *Regularization: Dropout, Early Stopping, Weight Decay & Augmentation*.
- What to do when one of these builds misbehaves: *The Debugging Playbook: When Training Goes Wrong*.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'The pre-flight sequence for any of the four builds',
        notice:
          'Four things to print before a long training run. Each takes seconds and each rules out a class of bug that otherwise looks identical to "training is just slow".',
        leftLabel: 'what you print',
        rightLabel: 'what it has to be',
        frames: [
          {
            note: 'Shapes first. Print one batch of inputs and its labels. The row counts must match, and the batch must be the first axis in every function you wrote.',
            stack: [
              { name: 'inputs', value: '(64, 784)' },
              { name: 'labels', value: '(64,)' },
              { name: 'rule', to: 'axis' },
            ],
            heap: [{ id: 'axis', value: 'batch is axis 0, always', label: 'pick one convention and never mix' }],
          },
          {
            note: 'Input range next. Pixels must be scaled. Raw 0-255 inputs make every score about 255 times too big, and the loss starts in the hundreds instead of near 2.3.',
            stack: [
              { name: 'min pixel', value: '0.0' },
              { name: 'max pixel', value: '1.0' },
              { name: 'if left 0..255', to: 'raw', danger: true },
            ],
            heap: [{ id: 'raw', value: 'loss at init = 328', label: 'measured, in the mistake section below', danger: true }],
          },
          {
            note: 'Check 1. The loss before any training, against the value a random guesser must produce. Near it means the wiring is right. Far above means labels and scores are not talking to each other. Far below means the answer is leaking in.',
            stack: [
              { name: 'measured', value: '2.3036' },
              { name: 'classes', value: '10' },
              { name: 'target', to: 'lnc' },
            ],
            heap: [{ id: 'lnc', value: '-log(1/10) = 2.3026', label: 'the only number that counts here' }],
          },
          {
            note: 'Check 2. Eight examples, all regularisation off, a few hundred steps. Loss to nearly zero and every prediction matching its label. Only now start the real run.',
            stack: [
              { name: 'examples', value: '8' },
              { name: 'loss after 300', value: '0.0017' },
              { name: 'predictions', to: 'match' },
            ],
            heap: [{ id: 'match', value: '[0 1 2 3 4 5 6 7]', label: 'exactly the labels — a measured run' }],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Worked case: sizing a build you have never done before',
      md: `A brief lands that is not one of the four: classify handwritten **letters**, 26 classes, images 20x20 greyscale. Same shape as P1. Work out by hand the three numbers you need before writing any code.

- **Parameter count.** Inputs: 20 x 20 = 400 pixels. Keep the 128-unit hidden layer. First layer: 400 x 128 = 51,200 weights plus 128 biases = 51,328. Second layer: 128 x 26 = 3,328 weights plus 26 biases = 3,354. Total **54,682** — about half of P1's 101,770, because the images are smaller and nothing else changed.
- **The loss at initialisation.** 26 classes, so a random guesser gives each letter probability 1/26 = 0.03846, and the loss is -log(0.03846) = log(26). Check that against a number you know: log(25) = 2 x log(5) = 2 x 1.609 = 3.219, and 26 is just above 25, so the answer is about **3.26**. Print anything near 3.26 and you are wired correctly.
- **Is Check 2 even meaningful here?** 54,682 weights against 8 examples of 400 pixels each — the model carries roughly 17 free numbers for every input pixel it has to memorise, which is far more capacity than the task needs. So yes: the loss must reach nearly zero, and a plateau is a bug.
- **What you have not decided yet, on purpose:** the learning rate. That is one sweep, not a calculation, and it is the last thing you set before the real run.`,
    },
    {
      type: 'note',
      md: `**The classic mistake, measured: skipping the pixel scaling.** The reader loads the images, feeds the raw 0-255 values straight in, gets a loss that starts around 328 and then sits there, and concludes the network is too small. Here is the actual arithmetic, from a real run of P1's forward pass with standard initialisation.

- With pixels scaled to [0, 1], the average size of a first-layer score is **0.63** and the starting loss is **2.39** — right where Check 1 says it should be.
- With the identical weights and the identical images left at 0-255, the average first-layer score is **157** and the starting loss is **328**.
- The ratio is exactly the ratio of the inputs: 0.63 x 255 = 161, near enough to 157. Nothing subtle is happening. Every score is 255 times too big because every input is.
- Why that kills learning: a softmax over scores of size 157 gives one class a probability of essentially 1 and every other class essentially 0, whatever the picture is. The model is maximally confident and usually wrong, and the gradients coming back are enormous.
- **The diagnosis rule:** a starting loss two orders of magnitude above -log(1/C) is an input-scale problem, not a capacity problem. Adding layers to that network makes it slower and no better.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work these out on paper before reading the solutions below. All four are arithmetic you actually do at the start of a build.

1. Your P1 net takes 20x20 letter images (26 classes) and you also widen the hidden layer from 128 to 256. What is the new parameter count?
2. You start P3 on a corpus whose alphabet turns out to have 96 distinct symbols. Your first printed loss is 6.9. Is that plausible for an untrained model, or is something wrong?
3. You run Check 2 on P2's small convolution net: 620,000 weights, 8 CIFAR images. After 500 steps the loss sits at 1.9 and all 8 predictions are class 3. Name the three things this can be, in the order you would test them.
4. P2's dense head holds 85% of its parameters. If you replace the flatten-then-dense stage with one that averages each of the 128 channels down to a single number before the classifier, what is the new head size and the new total?`,
    },
    {
      type: 'note',
      md: `**Worked solutions.**

1. First layer: 400 x 256 = 102,400 plus 256 biases = 102,656. Second layer: 256 x 26 = 6,656 plus 26 biases = 6,682. Total **109,338**. Doubling the hidden width roughly doubled the count, because both layers touch that width.
2. Something is wrong. A 96-symbol alphabet gives -log(1/96) = log(96), and since log(100) = 4.605 in natural logs and 96 is a little under 100, the right answer is about **4.56**. A printed 6.9 is far too high — and 6.9 is log(1000), so the most likely cause is an output layer built with 1000 outputs, copied from an ImageNet example, instead of 96.
3. Not the data: 8 examples cannot be too hard. In test order: (a) the gradient never reaches the weights — a missing backward call, a missing optimiser step, or parameters left frozen from an earlier experiment; (b) inputs and labels are misaligned, usually from shuffling the two separately; (c) the learning rate is at the wrong end of the sweep. Every prediction collapsing to one class points hardest at (c) or (a).
4. Averaging each channel to one number turns 128 channels of 4x4 into 128 inputs. The head becomes 128 x 256 + 256 = 33,024, plus the final 256 x 10 + 10 = 2,570, so **35,594**. New total = 93,248 convolution weights + 35,594 = **128,842**, against 620,362 before. You deleted 79% of the model and the part that actually looks at the image is untouched.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Three refinements that matter once the four builds run, and only then.

- **Freeze or fine-tune, in P2.** Both start by replacing the last layer. Freezing means only that new layer trains; fine-tuning lets the borrowed weights move too. Freeze when your dataset is small (under about 5,000 images) or looks like ImageNet: it is fast, nearly impossible to overfit, and usually within a couple of points of the alternative. Fine-tune when you have plenty of data or a distant domain. What most teams ship is both: freeze for a pass or two so the new layer stops being random, then unfreeze with a smaller learning rate for the older layers.
- **Why the smaller rate for the older layers.** A freshly initialised final layer produces large gradients in the first few hundred steps. Applied at full strength to weights that took a million photographs to learn, those gradients destroy them. Two learning rates in one optimiser — small for the borrowed layers, about ten times larger for the new one — is the standard fix.
- **Augmentation belongs to training only.** Random crops and horizontal flips are worth 2-3 accuracy points on CIFAR for free. Leaving them switched on during evaluation makes your test number noisy and pessimistic, and it never raises an error. Same class of bug as the preparation-statistics mismatch: silent, and expensive.`,
    },
  ],
  quiz: [
    {
      question:
        'You finish P1, run it before any training, and it prints a loss of 0.04 on a 10-class problem. What is the most likely explanation?',
      options: [
        {
          text: 'The initialisation happened to be very good',
          explanation:
            'No initialisation produces a near-perfect classifier by chance. A fresh model spreads probability evenly, giving -log(1/10) = 2.303.',
        },
        {
          text: 'The answer is reachable from the input, or the same rows appear in both training and test data',
          explanation:
            'Correct. A starting loss far below -log(1/C) means the task is already solved, which nearly always means a leaked feature or a duplicated split.',
        },
        {
          text: 'The learning rate is too low',
          explanation: 'No update has happened yet, so the learning rate has had no chance to do anything.',
        },
        {
          text: 'The dataset is too small',
          explanation: 'Dataset size does not change what an untrained model prints on its first forward pass.',
        },
      ],
      correct: 1,
    },
    {
      question: 'You run Check 2 on 8 examples and the loss stops falling at 1.9 instead of reaching nearly zero. What does that tell you?',
      options: [
        {
          text: 'The data is too hard; collect more of it',
          explanation:
            'Eight rows cannot be too hard. There is nothing to generalise to, only something to memorise, and more data cannot fix a model that cannot memorise eight rows.',
        },
        {
          text: 'You need more regularisation',
          explanation: 'Backwards. Regularisation makes fitting harder, which is why the check requires all of it switched off.',
        },
        {
          text: 'The fault is in your code or your learning rate — find it before touching the dataset',
          explanation:
            'Correct. A plateau on 8 examples implicates gradient flow, label alignment, or a learning rate at the wrong end of the sweep. Nothing else.',
        },
        {
          text: 'The network needs more layers',
          explanation: 'A 100,000-weight network has far more capacity than 8 examples need. Adding layers hides the bug instead of finding it.',
        },
      ],
      correct: 2,
    },
    {
      question: 'In P1, why do you subtract each row\'s largest score before exponentiating inside softmax?',
      options: [
        {
          text: 'It makes the probabilities sum to 1',
          explanation: 'Dividing by the row total already guarantees that, at any offset. The subtraction is about overflow.',
        },
        {
          text: 'It speeds up the exponential',
          explanation: 'A subtraction adds work rather than removing it. The reason is numerical.',
        },
        {
          text: 'It prevents negative probabilities',
          explanation: 'The exponential of any real number is positive, so negative probabilities were never possible.',
        },
        {
          text: 'exp of a large score overflows to infinity, and infinity divided by infinity is nan — subtracting the max changes nothing but caps the exponent',
          explanation:
            'Correct. Adding the same constant to every score leaves softmax unchanged, because the constant cancels top and bottom. Subtracting the max is therefore free, and it makes the largest exponent exp(0) = 1.',
        },
      ],
      correct: 3,
    },
    {
      question:
        'In P2 Run B you reuse a pretrained ResNet-18 but prepare the images with CIFAR-10\'s own mean and standard deviation instead of the ones the weights were trained with. What happens?',
      options: [
        {
          text: 'It crashes with a shape error',
          explanation: 'Those constants do not change tensor shapes. Nothing errors, which is exactly what makes this bug expensive.',
        },
        {
          text: 'Nothing — those constants are arbitrary',
          explanation:
            'They are arbitrary for a network trained from scratch. They are not arbitrary for borrowed weights, which learned filters tuned to one specific input range.',
        },
        {
          text: 'It trains, but converges more slowly and to a lower accuracy, with no error message anywhere',
          explanation:
            'Correct. The borrowed filters expect inputs in the range they were trained on. Shifting that range degrades every layer quietly.',
        },
        {
          text: 'The final layer will have the wrong number of outputs',
          explanation: 'That is a separate bug, fixed by replacing the final layer. It has nothing to do with the preparation constants.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Why does P3 predict one character at a time instead of one word at a time, as a teaching project?',
      options: [
        {
          text: 'Character models produce better text than word models',
          explanation: 'They produce noticeably worse text. That is a cost the project accepts deliberately.',
        },
        {
          text: 'No word-splitting rules to write and an alphabet of about 65 symbols, so the model stays tiny and the whole pipeline is visible',
          explanation:
            'Correct. No preprocessing, no unknown-word handling, and a small final layer — everything that would distract from the sequence lesson is removed.',
        },
        {
          text: 'Character models need no training data',
          explanation: 'They need a corpus like any other model, roughly 1 MB for a usable demo.',
        },
        {
          text: 'Characters make the context window effectively infinite',
          explanation:
            'The opposite. A character uses a whole step to carry a fraction of a word, so the model sees less meaning per step of context.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Your P4 sample grid shows the same digit in all 64 cells, but both loss curves look completely normal. What is happening?',
      options: [
        {
          text: 'The generator has converged; stop training',
          explanation: 'A generator producing one output has failed, not converged. Converging means covering the range of real data.',
        },
        {
          text: 'The loss curves prove nothing is wrong',
          explanation:
            'GAN loss curves genuinely cannot tell you this, which is exactly why you render a grid every pass and judge with your eyes.',
        },
        {
          text: 'The generator\'s learning rate is too low',
          explanation:
            'Raising it on a collapsed generator usually makes it hop between single outputs rather than cover the data. The imbalance with the discriminator is the real problem.',
        },
        {
          text: 'Mode collapse — weaken the discriminator: lower its learning rate or update it once per two generator steps',
          explanation:
            'Correct. The generator found one output that reliably fools the discriminator and stopped exploring, usually because the discriminator became over-confident and stopped supplying useful gradient.',
        },
      ],
      correct: 3,
    },
  ],
  interviewQuestions: [
    {
      question:
        'Case: your CIFAR fine-tune reaches 93% but your teammate\'s identical script reaches 89%. Same data, same model, same number of passes. Where do you look?',
      answer:
        'Diff the things that do not appear in the model definition, because that is where accuracy leaks hide. (1) The mean and standard deviation used to prepare the images — ImageNet values versus CIFAR values on a borrowed network is worth several points on its own. (2) Augmentation — a random crop with 4 pixels of padding plus a horizontal flip is worth 2-3 points, and it must be off at evaluation. (3) Learning-rate structure — one rate for the whole network versus a gentler rate for the borrowed layers and a larger one for the new final layer; a random final layer with a large shared rate wrecks the borrowed features in the first few hundred steps. (4) Input resolution — 32x32 fed straight into ResNet-18 leaves nothing in the final feature map; resizing to 224 or replacing the opening layer changes everything. (5) Whether evaluation ran in eval mode and without gradients, so dropout was off and the normalisation statistics were not still updating. (6) The split itself: a differently seeded split moves the number a point either way. Then the honest closer — run both scripts over three seeds before concluding anything. A 4-point gap is probably real; a 1-point gap on one seed usually is not.',
      isCaseBased: true,
    },
    {
      question:
        'Case: a junior shows you a fresh build on a 26-class letter dataset. The first printed loss is 9.4, and after two hours it is still 9.1. What do you check, in what order, and why that order?',
      answer:
        'Start with the number itself. A random 26-class guesser must print -log(1/26), about 3.26. Printing 9.4 is not slow learning, it is wrong wiring, and that rules out most of the usual suspects immediately. (1) Are the labels in the range the loss expects? Labels running 1 to 26 while the loss expects 0 to 25 pushes the last class past the end and misaligns everything. (2) Are the scores enormous? A starting loss in the high single digits usually means the inputs were never scaled, so every score is a couple of orders of magnitude too big and the softmax is saturated. Print the minimum and maximum of one input batch. (3) Is the output layer the right width? A starting loss near log(1000) = 6.9 or above on a 26-class problem often means an output layer copied from an ImageNet example. (4) Only after those, run Check 2 and memorise 8 examples. The order is by cost: each step takes seconds, and the first affirmative answer ends the investigation. Two hours of training was already the expensive way to learn nothing.',
      isCaseBased: true,
    },
    {
      question: 'Walk me through the backward pass of the numpy network in P1, shapes included.',
      answer:
        'Forward: Z1 = X W1 + b1, A1 = ReLU(Z1), Z2 = A1 W2 + b2, then softmax to get P. Backward, starting at the loss: dZ2 = (P - Y)/B with shape (B, 10). Softmax and cross-entropy differentiate together into that single expression, which is why you never implement them separately. Then dW2 = A1 transposed times dZ2, contracting the batch axis to give (128, 10), and db2 = the column sums of dZ2, shape (10,). Push back through the layer: dA1 = dZ2 times W2 transposed, shape (B, 128). Through ReLU: dZ1 = dA1 masked by (Z1 > 0) — gradient passes only where the unit was active, so it is a mask rather than a multiplication by something you computed. Then dW1 = X transposed times dZ1, shape (784, 128), and db1 = the column sums of dZ1. The pattern worth stating out loud: a weight gradient is input-transpose times output-gradient, and the batch axis always contracts away. Two free checks: every row of (P - Y) sums to exactly zero, and a finite-difference check should agree to about 1e-10.',
      isCaseBased: false,
    },
    {
      question: 'For P2, would you freeze the borrowed layers or train everything? Give me the decision rule.',
      answer:
        'Two axes: how much data you have, and how far your images are from ImageNet photographs. Small data, similar images: freeze and train only the new final layer. Fast, nearly impossible to overfit, and usually within a couple of points of the alternative. Plenty of data, similar images — CIFAR at 50,000 is plenty — train everything with a smaller rate for the borrowed layers; higher ceiling. Small data, distant domain such as medical scans or spectrograms: the awkward quadrant. Freeze the early layers, which learned generic edges and textures, and train the later ones, which learned ImageNet-specific object parts. Plenty of data, distant domain: train everything, and check whether the pretraining is buying anything at all. What most teams ship is the middle path — freeze for a pass or two so the new layer stops being random, then unfreeze with a lower rate. The tradeoff to name: freezing lets you cache one set of activations, so it is dramatically cheaper per pass; training everything risks destroying the borrowed features if the new layer\'s early gradients are large.',
      isCaseBased: false,
    },
    {
      question: 'Explain temperature in P3\'s sampling, and why you would not simply take the most likely character.',
      answer:
        'Temperature divides the scores before the softmax: p = softmax(z / T). T below 1 sharpens the distribution toward the top candidate, which is safer and more repetitive. T above 1 flattens it, which is more surprising and then incoherent. T approaching zero is the same as always taking the most likely character; T very large is uniform random. Why not always take the most likely one: it makes the model deterministic and it locks into loops, because the most likely continuation of a repeated phrase is usually more of that phrase. On a character model you see "the the the the" within twenty characters. Sampling keeps the output on the distribution the model actually learned. A practical range is 0.7 to 1.0 for creative text and near zero for extraction or code, where you want the single best answer. It is normally combined with cutting off the unlikely tail first, so that a high temperature cannot promote genuinely absurd characters.',
      isCaseBased: false,
    },
    {
      question: 'Why is P4 harder to train than P1 to P3, in a way that is not about model size?',
      answer:
        'Ordinary training minimises a fixed objective: the landscape stands still while you walk downhill on it. A GAN is two networks playing against each other, so each one\'s landscape is being reshaped by the other\'s updates at every step. There is no single number you can watch that means "going well" — a falling discriminator loss means the discriminator is winning, a falling generator loss means the generator is winning, and neither implies good images. The concrete failure modes: the discriminator wins outright, its output saturates, the gradient reaching the generator goes to zero and the generator stops learning; mode collapse, where the generator finds one output that reliably fools the discriminator and abandons everything else; and oscillation, where the pair cycles without settling. Standard stabilisers: matched capacity between the two, a shorter gradient memory in the optimiser, training the discriminator toward 0.9 instead of 1.0 for real images so it never becomes fully confident, and losses that keep gradient flowing to the generator even when it is losing. The operational answer that matters most is to render a sample grid every pass, because your eyes are a better metric than the loss.',
      isCaseBased: false,
    },
    {
      question: 'Why write P1 in numpy rather than a framework, given nobody ships numpy networks?',
      answer:
        'Because a framework hides exactly the part that is being tested. In PyTorch the backward pass is one call, so you can build a working classifier without ever seeing what the gradient of a weight matrix looks like — and that is the thing an interviewer asks about. Writing it yourself forces four specific pieces of understanding: that softmax and cross-entropy collapse into one gradient expression, (P - Y)/B; that a weight gradient is input-transpose times output-gradient with the batch axis contracting away; that ReLU backward is a mask rather than a computed derivative; and that shape mistakes are the main way people get this wrong. It also stays debuggable, because you can print any intermediate value without learning a debugger. After P1, using a framework is a convenience rather than a dependency, and that is the point. The parameter count, 101,770, is small enough to hold in your head while you do it.',
      isCaseBased: false,
    },
    {
      question: 'What does "done" mean for each of the four builds, and why fix that before starting?',
      answer:
        'P1: about 97% test accuracy on handwritten digits, in minutes on a CPU. P2: 70-75% from scratch on CIFAR-10, and 93%+ by reusing a pretrained network in a fifth of the passes. P3: after about twenty passes, almost-English — correct word shapes and matched quotes, and no meaning, because a 900,000-weight character model cannot buy meaning. P4: a grid of 64 generated digits a person would accept as handwriting, judged by eye because no loss value reports it. Fixing these first does two things. It converts an open-ended question, "is this good?", into a comparison against a number, which is the only version you can answer at 1am. And it blocks the two failure modes of side projects: stopping at 91% because the loss was falling and it felt fine, and grinding for a week past the point where the build had already proved what it was meant to prove. Each target also comes with a floor that means "there is a bug" rather than "try harder" — P1 below 95% after twenty passes, for example.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    {
      front: 'The two checks before any training run',
      back: 'Check 1: the loss before training must be near -log(1/C). Check 2: 8 examples, all regularisation off, loss must reach nearly zero. If Check 2 fails, the fault is code or learning rate, never the data.',
    },
    {
      front: 'Loss at initialisation, C classes',
      back: '-log(1/C) = log C. C=2 gives 0.693, C=10 gives 2.303, C=26 gives 3.258, C=1000 gives 6.908. Far above means a wiring bug; far below means leakage.',
    },
    {
      front: 'P1 by the numbers',
      back: '784 -> 128 ReLU -> 10 softmax, numpy only. 101,770 parameters. Done = about 97% test accuracy in minutes on a CPU. Below 95% after 20 passes = a bug.',
    },
    {
      front: 'P2 by the numbers',
      back: 'CIFAR-10. From scratch: about 620k weights, 30 passes, 70-75%. Reusing a pretrained ResNet-18: 93%+ in about 5 passes. The gap is the lesson.',
    },
    {
      front: 'The two silent P2 settings',
      back: 'Prepare images with the mean and standard deviation the borrowed weights were trained with, not your own dataset\'s. And resize 32x32 up to 224, or replace ResNet-18\'s opening layer, or nothing is left to look at.',
    },
    {
      front: 'P3 by the numbers',
      back: 'Character level, about 65 symbols, target = the text shifted one character left. Starting loss must be near -log(1/65) = 4.17. Sample from the distribution with temperature; never take the most likely character.',
    },
    {
      front: 'P4 by the numbers',
      back: 'Generator: 64 random numbers to a 28x28 image. Discriminator: one score. Two optimisers, alternating. Match the pixel ranges. Done is judged by eye on a 64-cell grid; the loss curves report nothing.',
    },
    {
      front: 'The pixel-scaling mistake, measured',
      back: 'Scaled to [0,1]: mean first-layer score 0.63, starting loss 2.39. Left at 0-255: mean score 157, starting loss 328 — exactly the 255x input ratio. A starting loss 100x above -log(1/C) is an input-scale bug, not a capacity bug.',
    },
  ],
  mindmapMarkdown: `- The Four Practicals
  - The two pre-flight checks
    - Check 1: loss at init = -log(1/C)
      - C=10 -> 2.303, C=26 -> 3.258, C=65 -> 4.17
      - Far above = wiring, far below = leakage
    - Check 2: memorise 8 examples
      - All regularisation off
      - Loss -> ~0 or the code is broken
      - Never the data: 8 rows cannot be too hard
  - P1 numpy net on digits
    - 784 -> 128 ReLU -> 10 softmax
    - 101,770 parameters
    - Done = ~97% in minutes on CPU
    - Scale pixels to [0,1] or the loss starts at 328
  - P2 CIFAR-10, built twice
    - From scratch: ~620k weights, 70-75%
    - Pretrained ResNet-18: 93%+ in 5 passes
    - Match the preparation statistics to the weights
    - Resize 32x32 to 224, or replace the opening layer
    - 85% of the scratch net sits in one dense layer
  - P3 character text generator
    - No word splitting, ~65 symbols
    - Target = text shifted one character left
    - Sample with temperature, not the top choice
    - Pass 1 letter soup, pass 20 almost-English
  - P4 tiny GAN
    - Generator vs discriminator, two optimisers
    - Match the pixel ranges to the tanh output
    - Judge by a 64-cell grid, not by loss
    - Mode collapse: weaken the discriminator
  - Where the machinery is taught
    - Backpropagation: The Chain Rule on a Graph
    - PyTorch: Tensors, Autograd & the Training Loop
    - CNNs: Convolution, Pooling & Receptive Fields
    - RNNs, LSTMs & the Road to Attention
    - Generative Models: Autoencoders, VAEs, GANs & Diffusion
    - The Debugging Playbook: When Training Goes Wrong`,
}

export default m
