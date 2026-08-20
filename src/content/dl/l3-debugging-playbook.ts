import type { Module } from '../types'

const m: Module = {
  id: 'dl-l3-debugging-playbook',
  subjectId: 'dl',
  level: 3,
  title: 'The Debugging Playbook: When Training Goes Wrong',
  whyItMatters:
    'A broken training run does not tell you what is wrong. It shows you a symptom: a loss that is nan, a loss that will not move, a validation curve going the wrong way. This module is organised the way you actually meet these — symptom first, then the two or three things that cause it, in order of likelihood, then the cheapest check that tells them apart. Everything here is a printed number, not a feeling.',
  assumes: [
    'You know what a loss is: one number that says how wrong the model currently is',
    'You know that training repeatedly nudges the weights to make that number smaller, and that the size of each nudge is the learning rate',
    'You can read a Python for loop and know what an average is',
    'Helpful but not required: the four build briefs in *The Four Practicals: Things You Build Yourself*',
  ],
  estMinutes: 33,
  sections: [
    {
      type: 'intuition',
      title: 'Debug the symptom, not the code',
      md: `You will not find the bug by rereading your file. You will find it by noticing which of six things the loss is doing, because each one rules out most of the possibilities immediately.

- **The loss is nan.** It printed real numbers, then nan, and never recovered.
- **The loss does not move.** It sits at the same value for hours.
- **Training loss falls, validation loss does not.**
- **The loss oscillates.** Up, down, up, down, with no trend.
- **The model predicts one class for everything.**
- **It works in training and fails at evaluation.** Two very different numbers from the same weights.

Each section below gives the symptom, the likely causes in order, and the one cheap check that separates them. Numbers first, theories after.`,
    },
    {
      type: 'intuition',
      title: 'The first-response drill, in order',
      md: `Before you diagnose anything specific, run these three steps in this order. Most bugs never survive step 2, and the ones that do are then much easier to name.

- **Step 1 — check the loss at the very start against the random-guess baseline.** An untrained C-class model spreads its probability evenly, so each class gets 1/C and the loss is -log(1/C). For 10 classes that is **2.3026**. Near it means inputs, labels and loss are wired to each other. Far above means they are not. Far below means the answer is leaking into the input. This costs one print statement.
- **Step 2 — overfit one batch.** Take 8 examples. Switch off dropout, weight decay, augmentation and shuffling. Train on those 8 forever. The loss must fall to nearly zero within a few hundred steps.
- If it does not, the fault is in your code or your learning rate. It cannot be the data: eight rows have nothing to generalise to, only something to memorise. This costs thirty seconds and it catches a wrong loss, a gradient that never arrives, frozen weights, misaligned labels and a learning rate at the wrong end of the range.
- **Step 3 — only now scale up.** Full dataset, then add the regularisation back one setting at a time, watching validation after each. A model that could never fit the training data cannot be fixed by regularising it.
- Everything in the rest of this module assumes steps 1 and 2 already passed. If they did not, stop there — the symptom you are chasing is downstream of a broken build.`,
    },
    {
      type: 'intuition',
      title: 'Symptom 1 — the loss is nan',
      md: `**What it looks like:** 2.31, 2.28, 2.19, 5.4, 87.2, nan, nan, nan. Once one nan appears it spreads to every weight in one update and nothing recovers. The word means "not a number", and it is what floating-point arithmetic returns for undefined operations like infinity divided by infinity, or 0 divided by 0.

- **Cause 1, most likely: the learning rate is too high.** Each step overshoots, the weights grow, the scores grow, and eventually exp() of a score overflows. Notice the run above got *worse for several steps first* — that is the fingerprint.
- **Cause 2: log of zero inside a hand-written loss.** Cross-entropy takes -log of the probability of the correct class. If that probability underflows to exactly 0.0, the log is -infinity. A softmax written without subtracting the row maximum produces this on its own, as the next snippet shows.
- **Cause 3: a nan or infinity already in your data.** One corrupt row poisons everything, and it will die at the same step number every single run.
- **The cheapest check that separates them:** print the loss and the largest absolute gradient every step. If the gradient grows over several steps before the loss dies, it is Cause 1 — halve the learning rate. If the loss goes from healthy straight to nan in one step with calm gradients, it is Cause 2 — look at your loss code. If it dies at the identical step every run, it is Cause 3 — check every batch is finite before it goes in.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Cause 2, reproduced: softmax without the max subtraction (real output)',
      code: `import numpy as np                                     # numpy only

big = np.array([[1000.0, 1001.0, 1002.0]])            # three scores a confident deep net produces easily
e = np.exp(big)                                       # exp(1000) is bigger than any float64 can hold
print('exp of the scores:', e)                        # look at what came back before dividing
print('naive softmax    :', e / e.sum())              # infinity divided by infinity is nan, and nan spreads

shifted = big - big.max()                             # subtract the largest score from all three
print('shifted scores   :', shifted)                  # the GAPS between the scores are untouched
es = np.exp(shifted)                                  # the largest exponent is now exp(0) = 1: nothing overflows
print('stable softmax   :', es / es.sum())            # the answer the naive version was supposed to give

# ---- real output ----
# exp of the scores: [[inf inf inf]]
# naive softmax    : [[nan nan nan]]
# shifted scores   : [[-2. -1.  0.]]
# stable softmax   : [[0.09003057 0.24472847 0.66524096]]`,
      annotations: {
        8: 'Why this is allowed: softmax divides by the sum of all the exponentials, so multiplying top and bottom by the same constant changes nothing. Subtracting a constant from every score does exactly that.',
        11: 'Check the final numbers by hand. exp(-2) = 0.1353, exp(-1) = 0.3679, exp(0) = 1. They total 1.5032. Divide each by that total: 0.0900, 0.2447, 0.6652 — the three printed values.',
      },
    },
    {
      type: 'intuition',
      title: 'Symptom 2 — the loss does not move',
      md: `**What it looks like:** on a 10-class problem, the loss prints 2.303 at step 0, 2.303 at step 500 and 2.303 an hour later. The model is outputting a uniform guess. It is not diverging, it is simply not learning.

- **Cause 1: the gradient never reaches the weights.** A missing backward call, a missing optimiser step, weights left frozen from an earlier experiment, or an optimiser built over a different set of weights than the ones you are updating.
- **Cause 2: the inputs and labels are no longer aligned.** Shuffling features and labels with two separate calls destroys the correspondence, and the model correctly learns that the label is unpredictable — which is exactly a uniform guess.
- **Cause 3: the learning rate is at the wrong end of the range.** Too small and each step is invisible. Too large and the model slams into a constant prediction and stays there, which looks identical from the loss alone.
- **The cheapest check that separates them:** print the sum of the absolute values of one weight tensor before a step and after it. Identical to every decimal place means Cause 1, and no hyperparameter will help. If the weights are moving, run the overfit-8 drill at three learning rates — the next snippets do exactly that, and separate Cause 3 from Cause 2 in about a second of compute.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 1 — set up the 8-example test (real output)',
      code: `import numpy as np                                     # numpy only
from sklearn.datasets import load_digits               # 8x8 handwritten digits, ships with scikit-learn

def softmax(z):                                        # z: (examples, classes) raw scores
    z = z - z.max(axis=1, keepdims=True)               # the overflow fix from the previous section
    e = np.exp(z)                                      # every value is now positive
    return e / e.sum(axis=1, keepdims=True)            # each row sums to 1

d = load_digits()                                      # 1797 images, 64 pixels each, valued 0..16
X = d.data[:8] / 16.0                                  # take EIGHT examples and scale the pixels into [0, 1]
y = d.target[:8]                                       # the eight true labels
Y = np.zeros((8, 10))                                  # one-hot targets: 8 rows, 10 columns, all zeros
Y[np.arange(8), y] = 1                                 # put a single 1 in column y[i] of row i
print('labels:', y)                                    # the eight answers the net has to memorise

# ---- real output ----
# labels: [0 1 2 3 4 5 6 7]`,
      annotations: {
        9: 'The whole dataset for this test is eight rows. That is the point: no result here can ever be blamed on the data being too hard.',
        12: 'One-hot means one row per example with a single 1 in the column of the right class and 0 everywhere else. Y[np.arange(8), y] = 1 sets position (0, y[0]), then (1, y[1]), and so on — eight positions in one statement.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 2 — the same net, trained at one learning rate',
      code: `def overfit(lr, steps=300):                            # run the whole experiment at one learning rate
    rng = np.random.default_rng(0)                     # seeded INSIDE, so every call starts from identical weights
    W1 = rng.normal(0, np.sqrt(2 / 64), (64, 128)); b1 = np.zeros(128)    # layer 1: 64 pixels -> 128 hidden
    W2 = rng.normal(0, np.sqrt(2 / 128), (128, 10)); b2 = np.zeros(10)    # layer 2: 128 hidden -> 10 classes
    for step in range(steps + 1):                      # one gradient-descent step per iteration
        Z1 = X @ W1 + b1                               # layer 1 scores, shape (8, 128)
        A1 = np.maximum(0, Z1)                         # ReLU: keep the positives, zero the rest
        P = softmax(A1 @ W2 + b2)                      # layer 2 scores turned into probabilities, shape (8, 10)
        if step % 150 == 0:                            # print at three checkpoints, not 301 times
            print(' step', step, 'loss', round(float(-np.log(P[np.arange(8), y]).mean()), 5))
        dZ2 = (P - Y) / 8                              # slope of the loss with respect to the layer 2 scores
        dZ1 = (dZ2 @ W2.T) * (Z1 > 0)                  # carry it back through layer 2, then through the ReLU gate
        W2 -= lr * (A1.T @ dZ2); b2 -= lr * dZ2.sum(0)  # step layer 2 downhill
        W1 -= lr * (X.T @ dZ1); b1 -= lr * dZ1.sum(0)   # step layer 1 downhill
    print(' predicted', P.argmax(1), 'wanted', y)      # the line that actually decides pass or fail`,
      annotations: {
        3: 'np.sqrt(2 / fan_in) is the standard starting spread for a layer followed by ReLU. Start every weight at zero instead and all 128 hidden units stay identical forever, because they all receive the same gradient.',
        10: 'The loss for these 8 rows: take the probability each row gave its correct class, take -log of each, average them. Exactly the definition, written in one line.',
        11: '(P - Y) / 8 is the entire gradient of softmax-plus-cross-entropy with respect to the scores. It is derived in *Backpropagation: The Chain Rule on a Graph*; here it is just the line the drill needs.',
        13: 'The semicolon puts two statements on one line. Used only to keep the weight update and its bias update visually together.',
        15: 'Judge on this line, not on the loss. Eight predictions that all read the same class is a much louder signal than the number alone.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 3 — run it twice and change exactly one thing (real output)',
      code: `print('lr = 5.0')                                      # first run: a deliberately too-large learning rate
overfit(5.0)                                           # same data, same seed, same code
print('lr = 0.5')                                      # second run: ten times smaller
overfit(0.5)                                           # the ONLY difference between the two runs

# ---- real output ----
# lr = 5.0
#  step 0 loss 2.65546
#  step 150 loss 2.08165
#  step 300 loss 2.08053
#  predicted [0 0 0 0 0 0 0 0] wanted [0 1 2 3 4 5 6 7]
# lr = 0.5
#  step 0 loss 2.65546
#  step 150 loss 0.00379
#  step 300 loss 0.0017
#  predicted [0 1 2 3 4 5 6 7] wanted [0 1 2 3 4 5 6 7]`,
      annotations: {
        1: 'Both runs print the same step-0 loss, 2.65546, because the seed is inside the function. When two experiments differ in one character, any difference in the output is caused by that character.',
        3: 'The failing run is not an error and not a warning. It is a model that quietly stops improving at 2.08 and answers class 0 for all eight images — the exact symptom this section is about.',
      },
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'The overfit-one-batch drill, with the numbers from that run',
        notice:
          'Eight examples, every regularisation switched off. The only pass condition is the loss falling to nearly zero AND the predictions matching. Every number below came from the run above.',
        leftLabel: 'the run',
        rightLabel: 'what it means',
        frames: [
          {
            note: 'Setup. Eight examples, fixed. Shuffling off, augmentation off, dropout off, weight decay off. Nothing that adds noise or resists memorisation is allowed to run.',
            stack: [
              { name: 'batch', value: '8 examples' },
              { name: 'regularisation', value: 'ALL off' },
              { name: 'shuffle', value: 'off' },
              { name: 'pass condition', to: 'goal' },
            ],
            heap: [{ id: 'goal', value: 'loss -> ~0', label: 'the only thing that counts' }],
          },
          {
            note: 'Step 0, before anything is learned. The loss is 2.65546 against 2.3026 for a uniform 10-class guess. Same ballpark, so the labels and the scores are wired to each other. A 0.03 or a 9.1 here means they are not, and nothing after this matters.',
            stack: [
              { name: 'loss at step 0', value: '2.65546', to: 'init' },
              { name: 'classes', value: '10' },
            ],
            heap: [{ id: 'init', value: '-log(1/10) = 2.3026', label: 'the value to compare against' }],
          },
          {
            note: 'The failing run, learning rate 5.0. The loss stalls at 2.08 and stays there, and all eight predictions read class 0. The model has collapsed to a constant answer. This is a failure, not slow progress.',
            stack: [
              { name: 'loss at 150', value: '2.08165', danger: true },
              { name: 'loss at 300', value: '2.08053', danger: true },
              { name: 'predictions', to: 'collapse', danger: true },
            ],
            heap: [
              { id: 'collapse', value: '[0 0 0 0 0 0 0 0]', label: 'every image -> the same class', freed: true },
            ],
          },
          {
            note: 'A plateau on eight examples implicates exactly three things, and never the dataset. Test them in this order: the first two are code bugs and cost seconds, the third is one sweep.',
            stack: [
              { name: '1. gradient flow', value: 'not reaching the weights', danger: true },
              { name: '2. label alignment', value: 'inputs and labels desynced', danger: true },
              { name: '3. learning rate', value: 'wrong end of the range', danger: true },
            ],
            heap: [
              { id: 'notdata', value: '"the data is too hard"', label: 'never valid for 8 rows', freed: true },
              { id: 'checks', value: 'backward / optimiser step / frozen weights', label: 'suspect 1, concretely' },
            ],
          },
          {
            note: 'The passing run. Same code, same eight examples, same seed — only the learning rate changed, 5.0 down to 0.5. The loss falls three orders of magnitude and every prediction matches its label. Suspect 3 was the culprit.',
            stack: [
              { name: 'loss at 0', value: '2.65546' },
              { name: 'loss at 150', value: '0.00379' },
              { name: 'loss at 300', value: '0.0017' },
              { name: 'predictions', to: 'match' },
            ],
            heap: [{ id: 'match', value: '[0 1 2 3 4 5 6 7]', label: 'exactly the labels' }],
          },
          {
            note: 'Verdict: the implementation is correct. Only now train on the full dataset, and only after that add the regularisation back, one setting at a time.',
            stack: [
              { name: 'implementation', value: 'proven correct' },
              { name: 'bug found', value: 'learning rate' },
              { name: 'next', to: 'real' },
            ],
            heap: [{ id: 'real', value: 'train on the full set', label: 'regularisation back on AFTER this' }],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Symptom 3 — training loss falls but validation loss does not',
      md: `**What it looks like:** two curves that separate. The important detail is *when* they separate, because there are two completely different problems hiding under one description.

- **Shape A: validation falls, reaches a minimum, then turns upward.** For example 0.62, 0.48, 0.41, 0.43, 0.49, 0.58 while training keeps dropping. That is **overfitting** — the model is memorising rows instead of learning the pattern. Fix in order: keep the checkpoint at the minimum (free, immediate), then more data or stronger augmentation, then weight decay and dropout one at a time, and only last a smaller model, since that also lowers the best you could reach.
- **Shape B: validation rises from the very first measurement and never dips.** That is **not** overfitting, and regularisation will not touch it. It means training and validation are not the same task: the validation set is drawn from different data, the preprocessing differs between the two paths, or the model was left in training mode during evaluation.
- **The cheapest check that separates them:** look for a minimum. If validation ever improved, you have Shape A. If it never did, you have Shape B, and the next thing to do is Symptom 6 below.
- **One more distinction worth making before you panic.** Validation *loss* can rise while validation *accuracy* still improves. Cross-entropy punishes confident mistakes very heavily, so a model that gets more confident overall can pay more for its errors while its top choice keeps getting better. The diagnosed mistake later in this module works that arithmetic out in full.`,
    },
    {
      type: 'intuition',
      title: 'Symptom 4 — the loss oscillates',
      md: `**What it looks like:** 2.4, 1.1, 2.6, 0.9, 2.2, 1.4 — a saw edge with no visible trend. The question to answer first is whether this is real instability or just batch noise you are looking at too closely.

- **Cause 1: the learning rate is too high.** Each step jumps past the bottom of the valley and lands on the far side, so the loss bounces between the two walls instead of descending.
- **Cause 2: the batch is too small.** With 8 examples per step, each batch is a different question and the loss legitimately jumps between them. Nothing is broken; the average is still falling.
- **Cause 3: a batch is being weighted wrongly.** The most common version is dividing the gradient by a fixed batch size when the last batch of a pass is short — a batch of 17 divided by 64 quietly shrinks that step by a factor of nearly 4.
- **The cheapest check:** average the loss over 50 steps and look at the averages. If the averaged line falls steadily, it was Cause 2 and there is nothing to fix. If it does not, halve the learning rate and rerun: if the amplitude of the bouncing roughly halves too, it was Cause 1.`,
    },
    {
      type: 'intuition',
      title: 'Symptom 5 — the model predicts one class for everything',
      md: `**What it looks like:** every prediction reads the same class, and accuracy sits at exactly the share of that class in your data — 90% on a dataset that is 90% one class. The run in Part 3 above is this symptom in miniature: all eight predictions read class 0.

- **Cause 1: the classes are heavily imbalanced and the model learned only the prior.** Always answering the majority class is a genuinely good strategy under cross-entropy, and it is where an under-trained model settles first.
- **Cause 2: the learning rate is too high.** A few enormous early steps push the output layer's bias for one class far above the others, and from there the gradient for the rest is tiny. This is what produced the 2.08 plateau above.
- **Cause 3: the labels are misaligned with the inputs**, so the only thing the model can learn is the overall class frequency — which is exactly a constant prediction.
- **The cheapest check:** count your labels and compute the loss of the best possible constant predictor from those frequencies. The worked case below does it by hand. If your model's loss equals that number, it has learned the class frequencies and nothing else — and you now know whether that is Cause 1 (the frequencies are extreme) or Cause 3 (they are balanced, so the model should never have settled there).`,
    },
    {
      type: 'intuition',
      title: 'Symptom 6 — it works in training and fails at evaluation',
      md: `**What it looks like:** 96% during training, 41% when you load the saved weights and score the test set. Same weights, wildly different numbers, so the difference is in the code path, not in the model.

- **Cause 1: the model is still in training mode.** Dropout randomly deletes units during training on purpose; if it is still on at evaluation you are scoring a deliberately damaged model. Normalisation layers are worse: in training mode they keep updating their internal statistics from whatever batch you hand them, so evaluating on an unshuffled test set can poison them permanently.
- **Cause 2: the two paths prepare data differently.** Augmentation left switched on at evaluation, different normalisation constants, a different resize, or images arriving in a different channel order. Every one of these is silent.
- **Cause 3: the training number was never real.** If rows leaked from the test set into training, or your "training accuracy" was measured on the same rows the model just memorised, then there is nothing to explain: the honest number is the low one.
- **The cheapest check, and it is a good one:** run your *evaluation* code over a slice of the *training* data. If it also scores 41% on data the model has definitely memorised, the evaluation path is broken and the model is fine. If it scores 96%, the evaluation path is fine and the problem is real — go look for leakage.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: is 90% accuracy learning, or is it the prior?',
      md: `A fraud classifier trains on 1,000 transactions: **900 legitimate, 100 fraudulent**. After training it reports 90% accuracy and a validation loss of 0.325, and every single prediction is "legitimate". Work out by hand whether it learned anything.

- **The random-guess baseline.** Two classes, uniform guessing gives each 0.5, so the loss is -log(0.5) = **0.693**. The model beat that, which is why it looked fine at a glance.
- **The best constant predictor.** Suppose the model ignores the input entirely and always outputs "90% legitimate, 10% fraud". On a legitimate transaction it pays -log(0.9) = 0.1054. On a fraudulent one it pays -log(0.1) = 2.3026. Nine times out of ten it pays the first, so the average is 0.9 x 0.1054 + 0.1 x 2.3026 = 0.0948 + 0.2303 = **0.3251**.
- **Compare: measured 0.325, best-constant 0.3251.** They match to three decimals. The model has learned the class frequencies and *nothing else*. It has not looked at a single transaction feature.
- **Why accuracy hid this.** Always answering the majority class scores exactly 900/1000 = 90%. The accuracy number cannot distinguish "learned the problem" from "learned the split", but the comparison against the best-constant loss can.
- **What to do:** this is Symptom 5, Cause 1. Compute the best-constant loss for your label distribution first, and treat it — not -log(1/C) — as the number your model has to beat.`,
    },
    {
      type: 'note',
      md: `**The classic mistake: early-stopping on a validation loss that is rising for a harmless reason.** A team sees validation loss go 0.51 at epoch 8 and 0.81 at epoch 12, calls it overfitting, and ships the epoch-8 checkpoint. The epoch-12 model was better. Here is the arithmetic, on two validation examples.

- **At epoch 8.** Example A is classified correctly with probability 0.9 for the right class, costing -log(0.9) = 0.1054. Example B is wrong: the right class got 0.4, costing -log(0.4) = 0.9163. Average loss = (0.1054 + 0.9163) / 2 = **0.5108**. Accuracy = 1 of 2 = 50%.
- **At epoch 12.** The model has become more confident everywhere. Example A now gives the right class 0.99, costing -log(0.99) = 0.0101. Example B is still wrong and now gives the right class only 0.2, costing -log(0.2) = 1.6094. Average = **0.8098**. Accuracy = still 50%.
- The loss rose by 59% while accuracy did not move at all. Nothing overfitted; the model simply became bolder, and cross-entropy charges heavily for a confident error while paying only a little more for a confident correct answer.
- **The diagnosis:** when validation loss rises, always plot validation *accuracy* — or whatever metric you actually ship — on the same chart. Rising loss with a still-improving metric is not overfitting. Rising loss with a falling metric is.
- **The rule:** early-stop on the number you will be judged on, not on the number the optimiser happens to minimise. If those are different numbers, say so out loud when you report the result.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work these out before reading the solutions below. Each one is a symptom plus enough numbers to name the cause.

1. A 100-class classifier prints 4.61 at step 0 and 4.61 an hour later. What is the first thing you check, and what does the number 4.61 tell you before you check anything?
2. Your run dies with nan at step 1,732 on the first attempt, and at step 1,732 again on the second and third attempts with different weight seeds. Which of the three nan causes is it, and why do the seeds settle it?
3. A binary classifier on a dataset that is 70% class A reports a validation loss of 0.61. Should you be pleased? Compute the two numbers you need to answer.
4. Training accuracy 98%, test accuracy 46%. You run your evaluation code over 1,000 rows of the training set and it reports 47%. What have you just learned, and what do you look at next?`,
    },
    {
      type: 'note',
      md: `**Worked solutions.**

1. 4.61 is -log(1/100) = log(100), the exact loss of a uniform 100-class guess. So the model is outputting a flat distribution: this is Symptom 2, not divergence. First check: print the sum of the absolute values of one weight tensor before and after a step. If it is unchanged, the gradient is never arriving — missing backward call, missing optimiser step, or frozen weights — and no hyperparameter will help.
2. Cause 3, a bad value in the data. Different weight seeds mean different weight trajectories, so a learning-rate explosion or a numerical hole in the loss would die at different steps each time. Dying at the identical step is only possible if the trigger is the same batch of data every run. Add a finite-value check on every batch before it enters the model and print the offending index.
3. Two numbers. The uniform baseline is -log(0.5) = 0.693. The best constant predictor outputs 0.7 and 0.3, paying 0.7 x -log(0.7) + 0.3 x -log(0.3) = 0.7 x 0.3567 + 0.3 x 1.2040 = 0.2497 + 0.3612 = **0.6109**. Your model scored 0.61. It has learned the class frequencies and nothing else. Not pleased.
4. The evaluation path is broken, not the model. Data the model has certainly memorised scores 47% through that path — almost exactly the 46% it gave the test set — so the low number is being produced by the scoring code, not by poor generalisation. Look at Symptom 6, Causes 1 and 2: is the model in evaluation mode, is augmentation switched off, and are the normalisation constants and channel order the same as in training?`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Three tools that come up once the six symptoms above are familiar.

- **Gradient clipping, and when it is a plaster rather than a fix.** Clipping computes the overall size of all the gradients together and, if it exceeds a threshold, scales every gradient down by the same factor — so the direction is preserved and only the size is capped. It is the right tool when occasional large gradients are inherent to the problem, as in recurrent networks and large-scale pretraining, where a threshold of 1.0 is standard. It is a plaster when it is hiding something else: unscaled inputs, a learning rate an order of magnitude too high, or a numerically unstable loss. The tell is simple — if you have to clip below about 0.1 for the run to survive at all, you are suppressing a symptom.
- **Out of memory during evaluation but not during training.** Almost always because the evaluation loop forgot to switch off gradient tracking, so every forward pass builds and keeps the machinery needed for a backward pass that never comes. Second most common: collecting loss values into a Python list without converting them to plain numbers first, which keeps all of that machinery alive too. Switching the model to evaluation mode does not free anything — it only changes what dropout and the normalisation layers do.
- **How reproducible a run can honestly be.** On one machine with one software stack, essentially exact: seed the framework, numpy and Python\'s own random module, give the data loader a seeded generator, and turn on the deterministic-algorithm flags, accepting a real speed cost. Across different machines, no — floating-point addition is not associative, so adding the same numbers in a different order on different hardware gives slightly different sums, and thousands of steps compound them. What to promise a reviewer: a pinned environment, a seeded script that reproduces exactly on the same hardware, and results reported as an average and spread over at least three seeds. A single-seed number with no spread is an anecdote.`,
    },
  ],
  quiz: [
    {
      question: 'Your loss prints 2.31, 2.28, 2.19, then 5.4, then 87.2, then nan. What does the shape of that sequence tell you?',
      options: [
        {
          text: 'A corrupt value in the data',
          explanation:
            'A bad input row poisons the loss in a single step and does it at the same step number every run. Here the loss climbed for several steps first.',
        },
        {
          text: 'The learning rate is too high — the loss grew for several steps before it overflowed',
          explanation:
            'Correct. Growth before the nan is the fingerprint of overshooting steps: the weights grow, the scores grow, and eventually the exponential overflows. Halve the learning rate.',
        },
        {
          text: 'The model has converged',
          explanation: 'A loss of nan is not a converged model. It means the arithmetic produced an undefined value and every weight is now nan too.',
        },
        {
          text: 'The validation set is too small',
          explanation: 'Validation set size has no effect on the training loss sequence.',
        },
      ],
      correct: 1,
    },
    {
      question: 'On a 10-class problem the loss sits at exactly 2.303 for an hour. What is the single cheapest check?',
      options: [
        {
          text: 'Try a larger model',
          explanation: 'Capacity is irrelevant to a model whose weights may not be changing at all. This is expensive and answers nothing.',
        },
        {
          text: 'Add dropout and weight decay',
          explanation: 'Regularisation makes fitting harder. The model is not fitting anything yet.',
        },
        {
          text: 'Print the sum of the absolute values of one weight tensor before and after a step',
          explanation:
            'Correct. If it is unchanged, the gradient is never reaching the weights and no hyperparameter matters. That is one print statement and it eliminates the largest cause.',
        },
        {
          text: 'Collect more training data',
          explanation: '2.303 is exactly the loss of a uniform 10-class guess. The model has learned nothing from the data it already has.',
        },
      ],
      correct: 2,
    },
    {
      question:
        'Validation loss rises from the very first epoch and never dips, while training loss falls normally. What is the most likely explanation?',
      options: [
        {
          text: 'Overfitting — add dropout and weight decay',
          explanation:
            'Overfitting shows as a validation curve that improves, reaches a minimum, and then turns upward. A curve that never improved was never fitting the validation task.',
        },
        {
          text: 'Training and validation are not the same task: leaked or differently distributed validation data, a preprocessing mismatch, or the model left in training mode',
          explanation:
            'Correct. With no minimum there is nothing to early-stop to. Compare the two data paths line by line before touching regularisation.',
        },
        {
          text: 'The learning rate is too high',
          explanation: 'That produces an oscillating or diverging training loss. Here training loss is falling normally.',
        },
        {
          text: 'The model is too small',
          explanation: 'A model too small to fit underperforms on training data too. Training loss is falling fine.',
        },
      ],
      correct: 1,
    },
    {
      question:
        'A binary classifier on a dataset that is 90% class A reports 90% accuracy and a validation loss of 0.325. What has it learned?',
      options: [
        {
          text: 'A strong model — 90% accuracy against a 50% coin flip',
          explanation:
            'The comparison is wrong. The thing to beat is not a coin flip, it is the best constant prediction, which already scores 90% on this data.',
        },
        {
          text: 'The class frequencies and nothing else — always predicting 0.9 for class A costs exactly 0.9 x 0.1054 + 0.1 x 2.3026 = 0.325',
          explanation:
            'Correct. The measured loss matches the best constant predictor to three decimals, so the model is not using the input features at all.',
        },
        {
          text: 'It is overfitting the majority class',
          explanation: 'Overfitting means memorising training rows. This model has not memorised anything; it is ignoring the input entirely.',
        },
        {
          text: 'Nothing can be said without the test set',
          explanation: 'Quite a lot can be said: the label distribution alone predicts the exact loss of a model that ignores the input.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Training reports 96% but the saved weights score 41% on the test set. Which check do you run first?',
      options: [
        {
          text: 'Retrain with more augmentation',
          explanation: 'That costs hours and assumes overfitting, which a check costing seconds could confirm or eliminate first.',
        },
        {
          text: 'Run the evaluation code over a slice of the training data',
          explanation:
            'Correct. If data the model has memorised also scores 41%, the evaluation path is broken and the model is fine. If it scores 96%, the gap is real and you go looking for leakage.',
        },
        {
          text: 'Lower the learning rate and retrain',
          explanation: 'Optimisation is clearly working — training reached 96%. The problem is in evaluation or in generalisation, not in the steps.',
        },
        {
          text: 'Increase the model size',
          explanation: 'A larger model widens a genuine train-test gap rather than closing it, and does nothing at all for a broken evaluation path.',
        },
      ],
      correct: 1,
    },
    {
      question: 'You overfit 8 examples and the loss plateaus at 2.08 with all 8 predictions reading the same class. What does that rule out?',
      options: [
        {
          text: 'It rules out a learning-rate problem',
          explanation:
            'The opposite. A collapse to one constant answer is one of the classic signatures of a learning rate that is far too high.',
        },
        {
          text: 'It rules out the dataset as the explanation — the fault is gradient flow, label alignment, or the learning rate',
          explanation:
            'Correct. Eight rows have nothing to generalise to; a model with 100,000 weights must be able to memorise them. Only your code or your learning rate can prevent it.',
        },
        {
          text: 'It rules out a code bug, since the loss did fall from 2.65 to 2.08',
          explanation: 'Falling a little and then stopping is exactly what a broken gradient path or a misaligned label set looks like.',
        },
        {
          text: 'It rules out nothing useful',
          explanation:
            'It rules out the single most commonly blamed cause, the data, and reduces an open-ended search to three named suspects.',
        },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question:
        'Case: training loss falls smoothly but validation loss rises. Walk me through your debugging tree, not just the headline answer.',
      answer:
        'First separate two shapes of curve, because they have different causes. Shape A: validation falls, bottoms out, then rises. That is overfitting, and the gap widens steadily after the turn. Fix in order: keep the checkpoint at the minimum, which is free; then more data or stronger augmentation, the only fixes that raise the ceiling rather than lower the variance; then weight decay and dropout, tuned one at a time so you know which knob did what; and last a smaller model, because that also lowers the best achievable result. Shape B: validation rises from the first measurement and never dips. That is not overfitting and regularisation will not touch it. Causes: the validation set is contaminated or drawn from a different distribution, the two paths preprocess data differently, or the model was left in training mode so dropout was active and the normalisation layers were still updating their statistics. Then the question people miss: is validation loss rising while validation accuracy still improves? That is often benign — the model is growing more confident, so its errors cost more under cross-entropy while its top choice keeps getting better. If the metric you ship is still improving, do not early-stop on loss. Finally, size: a 200-row validation set produces curves like this from noise alone.',
      isCaseBased: true,
    },
    {
      question: 'Case: your loss becomes nan at step 400 of an otherwise healthy run. Diagnose it.',
      answer:
        'A nan is always a finite number becoming infinite, or a 0 divided by 0, so localise it before theorising. Step 1: reproduce with the seed, then print the loss and the largest absolute gradient every step, and find the exact step it appears — and crucially whether the gradients exploded before the loss did. That single observation splits the causes in two. Gradients grow first: this is the learning rate overshooting, common in recurrent networks and in deep networks without normalisation layers. Fix by clipping the overall gradient size to 1.0, lowering the learning rate, adding a warmup, or adding the missing normalisation. Loss goes to nan with calm gradients: there is a numerical hole in the forward pass. Suspects are a log of zero in a hand-written cross-entropy, a division by a variance that hit zero, a square root of a negative from rounding, or an exponential of a large score without the max subtraction. Use the built-in loss that takes raw scores, because it is written to be stable. Neither pattern: check the data. One bad value in one row propagates instantly, so assert every batch is finite before it enters the model — cheap, and it finds a corrupt row that no amount of theorising will. Two more that catch people: reduced-precision training overflowing where full precision would not, and a learning-rate schedule with a bug that spikes at a specific step. If the run dies at the same step number every time, it is the data or the schedule, never randomness.',
      isCaseBased: true,
    },
    {
      question:
        'Case: a colleague says their model does not learn — the loss sits at 2.30 for ten epochs on a 10-class problem. What do you ask, in order?',
      answer:
        '2.303 is exactly -log(1/10), so the model is outputting a uniform distribution: it has learned nothing and it is not diverging either. That narrows things sharply. (1) Are the weights changing at all? Print the size of one weight tensor before and after a step. Identical means the gradient never arrived: a missing backward call, a missing optimiser step, weights left frozen from an earlier experiment, or an optimiser constructed over the wrong set of weights. (2) If the gradients arrive but are around 1e-12, the learning rate is far too small or an activation has saturated. (3) Have you overfit 8 examples? If that plateaus too, it is definitively a code bug and we stop guessing about hyperparameters. (4) Are the inputs and labels still aligned? Shuffling the two with separate calls destroys the correspondence and produces exactly this curve, because the model correctly learns that the label is unpredictable. (5) Are the gradients being reset between steps? Accumulated gradients inflate the effective step size and can pin the model in a degenerate state. The order matters: each question is cheaper than the next, and the first affirmative answer ends the investigation.',
      isCaseBased: true,
    },
    {
      question:
        'Case: a model reports 90% accuracy on a fraud dataset that is 90% legitimate, and every prediction is legitimate. Your manager wants to ship it. What do you say, with numbers?',
      answer:
        'I would show three numbers rather than argue. First, the accuracy of the trivial model: always answering legitimate scores 900 out of 1000, which is 90% — identical to ours, so accuracy cannot distinguish our model from a constant. Second, the loss of the best constant predictor: outputting 0.9 for legitimate costs -log(0.9) = 0.1054 on the 90% of rows that are legitimate and -log(0.1) = 2.3026 on the 10% that are not, averaging 0.9 times 0.1054 plus 0.1 times 2.3026 = 0.325. If our validation loss is also 0.325, the model has learned the class frequencies and has not used a single feature. Third, the number that actually matters to the business: recall on fraud, which is zero here — we catch nothing. Then the fix path. Report a metric that cannot be gamed by the prior: recall at a fixed false-positive rate, or precision-recall area, or the money saved. Rebalance the training signal by weighting the rare class or resampling. Re-run the overfit-8 drill on a balanced batch of 8 to confirm the model can separate the classes at all when the prior is removed — if it cannot, the features do not carry the signal and no amount of rebalancing will help.',
      isCaseBased: true,
    },
    {
      question: 'Why is "overfit a single batch" the first thing you do, and what specific bugs does it catch that a normal run does not?',
      answer:
        'Because it converts an ambiguous question — is this learning slowly, or is it broken? — into a binary one with a known correct answer. A model with far more weights than 8 examples must reach nearly zero loss on them; if it does not, no property of the dataset, no hyperparameter and no architecture choice explains it. Bugs it catches that a full run hides: a loss applied to the wrong tensor or along the wrong axis; a gradient path that was cut, or a backward call that never happens; weights left frozen from an earlier experiment; an optimiser built over a different set of weights than the ones being updated; labels misaligned with inputs after an independent shuffle; gradients not being reset between steps; a learning rate one or two orders of magnitude off. On the full dataset every one of these looks the same — the loss goes down slowly — and you burn a day tuning hyperparameters against a broken implementation. The cost is thirty seconds, and the pass condition is not just the loss: the predictions have to match the labels, because a loss of 1.9 with eight identical predictions is a louder signal than the number alone.',
      isCaseBased: false,
    },
    {
      question: 'What does gradient clipping actually do, and when is it the right tool rather than a plaster?',
      answer:
        'It computes the overall size of all the parameter gradients together — the square root of the sum of their squares — and if that exceeds a threshold it multiplies every gradient by threshold divided by the size. So the direction is preserved exactly and only the magnitude is capped. Clipping each element independently instead does distort the direction, which is why capping the overall size is the default. It is the right tool when occasional large gradients are inherent to the problem: recurrent networks, where backpropagating through many timesteps genuinely produces spikes, and large-scale pretraining, where a threshold of 1.0 is standard practice. It is a plaster when it is masking something else: unscaled inputs, a learning rate an order of magnitude too high, a missing normalisation layer, or a numerically unstable loss written by hand. The tell is simple — if you have to clip below about 0.1 for the run to survive at all, you are suppressing a symptom rather than managing a known-spiky objective, and the underlying bug will show up somewhere else later.',
      isCaseBased: false,
    },
    {
      question: 'You inherit a script that runs out of GPU memory on the validation pass but trains fine. Explain how that is possible.',
      answer:
        'Training runs under a memory budget someone already tuned. Validation frequently runs without switching off gradient tracking, so every forward pass builds the machinery needed for a backward pass that never happens, and none of it is freed — so activation memory grows across the whole validation set. That is the first thing to check and usually the answer. Second: validation batch size is often set larger than training batch size on the theory that no backward pass means more room, which is only true if gradient tracking is actually off. Third: accumulating loss values into a Python list keeps all of their machinery alive; convert each to a plain number first. Fourth: switching the model to evaluation mode frees nothing — it only changes what dropout and the normalisation layers do, and people routinely conflate the two. Beyond fixing the bug, the standard levers for a genuine memory ceiling are a smaller batch with gradient accumulation so the effective batch size is preserved, reduced-precision training, and recomputing activations during the backward pass, which trades roughly 30% more compute for a large memory saving.',
      isCaseBased: false,
    },
    {
      question: 'How reproducible can you actually make a deep learning run, and what would you promise a reviewer?',
      answer:
        'On one machine with one software stack, essentially exact. Seed the framework, numpy and Python\'s own random module; seed the GPU generators; give the data loader a seeded generator and a per-worker seeding function, or the workers produce a different augmentation stream every run; turn on the deterministic-algorithm flags, accepting a real speed cost and the fact that some operations will raise an error rather than run non-deterministically. Across machines, no. Floating-point addition is not associative, so summing the same numbers in a different order gives a slightly different result, and a parallel reduction splits differently across different hardware. Different GPU generations, different driver and library versions select different kernels, and reduced precision adds more variation. Tiny differences compound over thousands of steps. What I would promise a reviewer: a pinned environment, a seeded script that reproduces exactly on the same hardware, and — the part that actually matters — results reported as an average and a spread over at least three seeds. A single-seed number with no spread is not a result, it is an anecdote, and any conclusion smaller than the spread is not a conclusion.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    {
      front: 'The first-response drill',
      back: '1. Compare the loss at step 0 with -log(1/C). 2. Overfit 8 examples with all regularisation off; the loss must reach nearly zero. 3. Only then scale up and add regularisation back one setting at a time.',
    },
    {
      front: 'Loss is nan: the three causes, in order',
      back: 'Learning rate too high (the loss grows for several steps first); log of zero in a hand-written loss (dies in one step, calm gradients); a bad value in the data (dies at the identical step every run).',
    },
    {
      front: 'Loss does not move: the cheapest check',
      back: 'Print the sum of the absolute values of one weight tensor before and after a step. Unchanged means the gradient never arrived — missing backward, missing optimiser step, or frozen weights — and no hyperparameter will help.',
    },
    {
      front: 'Validation loss rising: the two shapes',
      back: 'Falls, reaches a minimum, then rises = overfitting; early-stop at the minimum. Rises from step 1 with no minimum = a different task: leakage, a preprocessing mismatch, or the model left in training mode.',
    },
    {
      front: 'Loss oscillates: is it a bug?',
      back: 'Average over 50 steps. If the average falls steadily it was just batch noise, nothing to fix. If not, halve the learning rate: if the bouncing halves too, the learning rate was the cause.',
    },
    {
      front: 'The best-constant loss',
      back: 'For class shares p1..pC, it is the sum of p_i x -log(p_i). For a 90/10 split: 0.9 x 0.1054 + 0.1 x 2.3026 = 0.325. Beat THAT, not -log(1/C). Matching it means the model learned only the class frequencies.',
    },
    {
      front: 'Works in training, fails at evaluation',
      back: 'Run the evaluation code over training data. Also bad = the evaluation path is broken (training mode left on, augmentation on, wrong normalisation). Fine = the gap is real, go look for leakage.',
    },
    {
      front: 'Rising validation loss with rising accuracy',
      back: 'Not overfitting. Confident errors cost a lot under cross-entropy: 0.9 -> 0.99 on a correct row saves 0.095, while 0.4 -> 0.2 on a wrong row costs 0.693. Early-stop on the metric you ship, not on the loss.',
    },
  ],
  mindmapMarkdown: `- The Debugging Playbook
  - First-response drill
    - 1. Loss at step 0 vs -log(1/C)
    - 2. Overfit 8 examples to ~0
    - 3. Scale up, regularisation back one at a time
  - Symptom: loss is nan
    - Grows first -> learning rate too high
    - Dies in one step -> log(0) in the loss
    - Same step every run -> bad value in the data
    - Check: loss and largest gradient, every step
  - Symptom: loss does not move
    - Sits at -log(1/C)
    - Gradient never reaches the weights
    - Labels misaligned with inputs
    - Learning rate at the wrong end
    - Check: weight sum before and after a step
  - Symptom: validation will not follow training
    - Dips then rises = overfitting, early-stop
    - Rises from step 1 = leak or eval mismatch
    - Loss up but accuracy up = harmless confidence
  - Symptom: loss oscillates
    - Too-high learning rate vs plain batch noise
    - Check: 50-step running average
    - Short last batch divided by the wrong count
  - Symptom: one class for everything
    - Compare against the best-constant loss
    - 90/10 split -> 0.325, accuracy 90%
    - Or a too-high learning rate collapsed it
  - Symptom: works in training, fails at eval
    - Training mode left on: dropout, running stats
    - Different preprocessing in the two paths
    - Check: run eval code over training data
  - Beyond the basics
    - Gradient clipping: tool vs plaster
    - Out of memory at eval: gradient tracking left on
    - Reproducible on one machine, not across machines`,
}

export default m
