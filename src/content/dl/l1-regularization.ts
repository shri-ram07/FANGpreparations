import type { Module } from '../types'

const m: Module = {
  id: 'dl-l1-regularization',
  subjectId: 'dl',
  level: 1,
  title: 'Regularization: Dropout, Early Stopping, Weight Decay & Augmentation',
  whyItMatters:
    'Train any network long enough and one specific thing happens: the training loss keeps falling and the validation loss stops falling and starts climbing. In this module we make that happen on a real network in plain Python and print the numbers epoch by epoch, so you see the turn instead of being told about it. Then we fix it four different ways. The single most common debugging question in a deep learning interview is "training loss falls but validation loss rises, what do you do?" — this module is the whole answer.',
  assumes: [
    'You have seen a Python for loop, a list, and a function definition',
    'You know what an average is',
    'You have read the earlier DL modules, so you know a network is a pile of numbers called weights, and that training means nudging those weights to make a loss smaller',
    'Helpful but not required: the ML module *Polynomials, Overfitting, and Regularisation: Ridge vs Lasso*. Everything used here is defined here.',
  ],
  estMinutes: 46,
  sections: [
    {
      type: 'intuition',
      title: 'The turn: one number falls, the other one climbs',
      md: `We are going to train a small network on six data points and watch two numbers.

- **Training loss** — how wrong the network is on the six points it is allowed to learn from. Lower is better.
- **Validation loss** — how wrong it is on six *different* points it has never been trained on. These are held back on purpose.

Here is what actually came out of the run you are about to write, printed every 400 epochs. An **epoch** is one full pass over the training data.

- epoch 400 — train 0.040, val 0.352
- epoch 1200 — train 0.025, val 0.331
- epoch 1600 — train 0.015, val **0.327** (the lowest validation loss of the whole run)
- epoch 2400 — train 0.003, val 0.346
- epoch 4000 — train 0.001, val 0.364

Read the two columns separately. Training loss goes 0.040 to 0.001 and never stops improving. Validation loss falls to 0.327 at epoch 1600, then turns around and climbs back to 0.364. That U-turn is the entire subject of this module.`,
    },
    {
      type: 'intuition',
      title: 'What the U-turn means, in plain words',
      md: `After epoch 1600 the network stopped learning the pattern and started learning the *individual six training points*, noise and all.

- **Overfitting** is exactly that: the network fits the training examples so closely that it starts copying their accidental quirks, and those quirks are not in any new data. Training loss keeps dropping because the copying is working. Validation loss climbs because the copying is useless.
- **Capacity** is how much detail a network is able to memorize — roughly, how many weights it has to play with. Our little network has 49 numbers to fit 6 points. That is far more freedom than the job needs.
- **Regularization** is the name for anything you do that makes the training loss *worse* in exchange for making the validation loss *better*. Every technique in this module is that trade.

The rest of the module is: build the run above (four short snippets), then four ways to stop the climb.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 1: six training points and six held-out points',
      code: `import random
import math

random.seed(0)

train_x = [-1.0, -0.6, -0.2, 0.2, 0.6, 1.0]
train_y = []
for x in train_x:
    train_y.append(round(2.0 * x + random.uniform(-1.2, 1.2), 3))

val_x = [-0.9, -0.5, -0.1, 0.3, 0.7, 0.95]
val_y = []
for x in val_x:
    val_y.append(round(2.0 * x + random.uniform(-1.2, 1.2), 3))

print('train_y :', train_y)
print('val_y   :', val_y)

# ---- real output ----
# train_y : [-1.173, -0.581, -0.591, -0.179, 1.227, 1.772]
# val_y   : [-1.119, -1.472, -0.256, 0.8, 2.379, 1.911]`,
      annotations: {
        1: 'random gives us random numbers. We use it to add noise to the data, and later to build dropout masks.',
        2: 'math is imported for math.tanh, which the network uses in the next snippet.',
        4: 'seed(0) fixes the random number generator to a known starting state, so every run of this file prints exactly the numbers shown below. Without it you would get different numbers each time.',
        6: 'The six input values we are allowed to train on. Plain floats between -1 and 1.',
        7: 'An empty list that will hold the six answers. We fill it in the loop below.',
        8: 'Walk through the six inputs one at a time. x is the current input.',
        9: 'The true pattern is the straight line y = 2x. random.uniform(-1.2, 1.2) picks a random number somewhere between -1.2 and 1.2 and adds it, so each answer is knocked off the line by an unpredictable amount. That knock is the noise. round(..., 3) keeps 3 decimal places so the printout stays readable.',
        11: 'Six DIFFERENT inputs. These are the held-out points. The network never sees them during training.',
        12: 'Another empty list, for the held-out answers.',
        13: 'Same loop, over the held-out inputs.',
        14: 'Same rule, same line, same amount of noise. Only the specific random knocks differ. That matters: train and validation must come from the same source, or a rising validation loss tells you nothing.',
        16: 'Print the training answers so you can see the noise for yourself.',
        17: 'Print the held-out answers. Compare -1.472 at x = -0.5 with the true value -1.0: that point is knocked a long way off the line. Noise like this is what a network memorizes when it overfits.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 2: the network, in one function',
      code: `H = 16
P = []
for i in range(3 * H + 1):
    P.append(random.uniform(-1.0, 1.0))

def predict(x, P):
    total = P[-1]
    for i in range(H):
        total = total + P[3 * i + 2] * math.tanh(P[3 * i] * x + P[3 * i + 1])
    return total

print('untrained guess at x = 0.6 :', round(predict(0.6, P), 3))

# ---- real output ----
# untrained guess at x = 0.6 : 1.332`,
      annotations: {
        1: 'H is the number of hidden units — the number of small bending pieces the network can add together. 16 of them.',
        2: 'P will hold every weight in the network, in one flat list. Flat means no nesting: just numbers in a row.',
        3: 'Each hidden unit owns 3 numbers (an input weight, a bias, an output weight), and the whole network has 1 extra number at the end for the output bias. So 3 * 16 + 1 = 49 weights for 6 training points.',
        4: 'Fill each weight with a small random starting value between -1 and 1. Training will move them from here.',
        6: 'predict takes one input x and the weight list P, and returns the network\'s answer.',
        7: 'P[-1] is Python for "the last item in the list" — our output bias. The answer starts there and units get added on.',
        8: 'Loop over the 16 hidden units. i is the unit number.',
        9: 'One hidden unit, all on one line. P[3*i] is that unit\'s input weight and P[3*i+1] its bias, so P[3*i]*x + P[3*i+1] is a straight line. math.tanh squashes that line into an S-shape flattening at -1 and +1 — that is the unit\'s bend. P[3*i+2] is the output weight, saying how much of this bend to add to the answer. Sixteen bends added together can trace almost any wiggly curve.',
        10: 'Hand the finished sum back to the caller.',
        12: 'A prediction before any training. It is nonsense (the right answer near x = 0.6 is about 1.2 by luck only) because the weights are still random.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 3: the loss — one number saying how wrong we are',
      code: `def mse(xs, ys, P):
    total = 0.0
    for i in range(len(xs)):
        gap = predict(xs[i], P) - ys[i]
        total = total + gap * gap
    return total / len(xs)

print('starting train loss :', round(mse(train_x, train_y, P), 3))
print('starting val loss   :', round(mse(val_x, val_y, P), 3))

# ---- real output ----
# starting train loss : 5.467
# starting val loss   : 5.688`,
      annotations: {
        1: 'mse means mean squared error. Give it a list of inputs, the matching list of true answers, and the weights.',
        2: 'A running total, starting at zero. 0.0 with a decimal point keeps it a float.',
        3: 'len(xs) is how many points there are. range(6) gives 0,1,2,3,4,5 — the positions in both lists.',
        4: 'The gap between what the network said and the truth, for point i. It can be negative.',
        5: 'Square the gap before adding it. Squaring makes negatives positive, so a gap of -2 counts the same as +2, and it punishes big misses much harder than small ones.',
        6: 'Divide by the number of points to get the average. That average is the loss.',
        8: 'The loss on the training points, before any training. 5.467 is terrible, as expected from random weights.',
        9: 'The same measurement on the held-out points. 5.688 — also terrible, and close to the training number. Two bad numbers sitting close together is what an untrained (or underfitting) network looks like.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 4: which way should one weight move?',
      code: `step = 0.0001

def slope_for(k):
    old = P[k]
    P[k] = old + step
    up = mse(train_x, train_y, P)
    P[k] = old - step
    down = mse(train_x, train_y, P)
    P[k] = old
    return (up - down) / (2 * step)

print('slope for weight 0 :', round(slope_for(0), 4))

# ---- real output ----
# slope for weight 0 : -0.2745`,
      annotations: {
        1: 'A tiny nudge size. Small enough that the loss barely changes, big enough to measure.',
        3: 'slope_for answers one question: if I increase weight number k a little, does the training loss go up or down, and how fast?',
        4: 'Remember the weight\'s current value so we can put it back. Everything after this is temporary.',
        5: 'Nudge the weight up by step.',
        6: 'Measure the training loss with the nudged-up weight.',
        7: 'Now nudge the same weight the other way, below its original value.',
        8: 'Measure the loss again, nudged down.',
        9: 'Put the weight back exactly where it was. The function leaves no trace.',
        10: 'Change in loss divided by change in weight. That is the slope. It is negative here (-0.2745), meaning increasing this weight makes the loss smaller — so this weight should go up. This is the slow, obvious way to get a slope; backpropagation from the earlier module is the fast way, and it computes the same thing.',
        12: 'One measured slope, for the very first weight in the list.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 5: train for 4000 epochs and watch both numbers',
      code: `lr = 0.1

for epoch in range(1, 4001):
    slopes = []
    for k in range(len(P)):
        slopes.append(slope_for(k))
    for k in range(len(P)):
        P[k] = P[k] - lr * slopes[k]
    if epoch % 400 == 0:
        tr = round(mse(train_x, train_y, P), 3)
        va = round(mse(val_x, val_y, P), 3)
        print('epoch', epoch, ' train', tr, ' val', va)

# ---- real output ----
# epoch 400  train 0.04  val 0.352
# epoch 800  train 0.034  val 0.34
# epoch 1200  train 0.025  val 0.331
# epoch 1600  train 0.015  val 0.327
# epoch 2000  train 0.007  val 0.335
# epoch 2400  train 0.003  val 0.346
# epoch 2800  train 0.002  val 0.355
# epoch 3200  train 0.001  val 0.359
# epoch 3600  train 0.001  val 0.362
# epoch 4000  train 0.001  val 0.364`,
      annotations: {
        1: 'lr is the learning rate: how big a step we take along each slope. 0.1 means "move a tenth of the slope".',
        3: 'One pass through this loop body is one epoch. We do 4000 of them.',
        4: 'A fresh empty list for this epoch\'s slopes.',
        5: 'len(P) is 49, so k walks over every weight in the network.',
        6: 'Measure the slope for weight k and store it. All 49 slopes are measured BEFORE any weight moves, so they all describe the same starting point.',
        7: 'Now a second pass over the same 49 weights, this time to move them.',
        8: 'MINUS the slope, because the slope points uphill and we want to go down. Slope negative means the weight goes up.',
        9: 'The percent sign is the remainder operator: epoch % 400 == 0 is true when epoch divides evenly by 400. So we print on epochs 400, 800, 1200 and so on, instead of 4000 lines.',
        10: 'Measure the loss on the six training points.',
        11: 'Measure the loss on the six held-out points. Note this number never touches the weights — it is only ever watched.',
        12: 'Print both. This is the table from the opening: train marches down to 0.001, val bottoms out at 0.327 on epoch 1600 and then climbs to 0.364. From epoch 1600 onwards, every bit of training made the model worse at its actual job.',
      },
    },
    { type: 'visual', component: 'BiasVarianceDial', props: {} },
    {
      type: 'note',
      md: 'The dial is the same story with a different knob. Turn capacity up and training error falls forever, while test error traces a **U** — too little capacity is bad, too much is bad, and the good spot is in the middle. In our run we held capacity fixed at 49 weights and turned up *training time* instead, and got the same U. Both are ways of giving the network more room to memorize.',
    },
    {
      type: 'intuition',
      title: 'Fix 1 — dropout: nobody gets a permanent partner',
      md: `Picture a team where a random half of the staff calls in sick each day. Nobody can build a routine that depends on one specific colleague, so everyone has to become useful on their own.

- **Dropout** is that, applied to a layer of a network. On each training step you pick a random set of the layer\'s outputs and set them to zero for that step only.
- The number a network layer passes on is called an **activation**. Dropout zeroes activations, not weights, and it picks a fresh random set every step.
- The **dropout rate**, written p, is the probability that any one activation gets zeroed. p = 0.5 means each one has a 50-50 chance, decided independently.
- The point: a unit cannot learn "I only mean something when unit 7 also fires", because unit 7 might be missing. Fragile pairings break. Features that stand on their own survive.

Next snippet does it to a four-number activation vector so you can watch which ones get zeroed.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Dropout on four activations, with the scaling',
      code: `import random

random.seed(7)

h = [1.0, 2.0, 3.0, 4.0]
p = 0.5

def dropout_train(h, p):
    out = []
    for value in h:
        if random.random() < p:
            out.append(0.0)
        else:
            out.append(value / (1.0 - p))
    return out

print('training pass 1 :', dropout_train(h, p))
print('training pass 2 :', dropout_train(h, p))
print('training pass 3 :', dropout_train(h, p))

# ---- real output ----
# training pass 1 : [0.0, 0.0, 6.0, 0.0]
# training pass 2 : [2.0, 0.0, 0.0, 8.0]
# training pass 3 : [0.0, 0.0, 0.0, 0.0]`,
      annotations: {
        1: 'This snippet stands alone — run it on its own, not appended to the network above.',
        3: 'A different seed, so the masks below are reproducible.',
        5: 'h is one layer\'s activations: four numbers on their way to the next layer.',
        6: 'The dropout rate. 0.5 means each activation has a 50 percent chance of being zeroed.',
        8: 'One training-time forward pass through the dropout layer.',
        9: 'The list we will hand on to the next layer.',
        10: 'Go through the four activations one at a time. Each decision is independent of the others — this is why a pass can drop all four, as pass 3 did.',
        11: 'random.random() returns a fresh number between 0.0 and 1.0. Asking whether it is below p is exactly a coin flip weighted by p. This comparison IS the random mask: true means drop.',
        12: 'Dropped. The next layer receives a zero — as if that unit did not exist on this step.',
        13: 'Otherwise the activation survives.',
        14: 'The survivor is NOT passed on unchanged: it is divided by (1 - p). At p = 0.5 that doubles it, which is why the 3.0 came out as 6.0. The survivors carry the share of the ones that were dropped. The next snippet shows why that division has to be there.',
        15: 'Hand back the masked, rescaled list.',
        17: 'Pass 1 kept only the third unit: [0.0, 0.0, 6.0, 0.0].',
        18: 'Pass 2, same input, completely different mask: [2.0, 0.0, 0.0, 8.0]. Two passes over identical input give two different answers.',
        19: 'Pass 3 dropped everything. Unlikely (a 1-in-16 chance) but legal, and it is a reminder that dropout on a narrow layer is violent.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Why divide by (1 - p): the average has to survive',
      code: `totals = [0.0, 0.0, 0.0, 0.0]
runs = 100000

for _ in range(runs):
    dropped = dropout_train(h, p)
    for i in range(4):
        totals[i] = totals[i] + dropped[i]

averages = []
for i in range(4):
    averages.append(round(totals[i] / runs, 3))

print('average over 100000 passes :', averages)
print('h itself (what eval sees)  :', h)

# ---- real output ----
# average over 100000 passes : [1.002, 1.997, 2.987, 3.995]
# h itself (what eval sees)  : [1.0, 2.0, 3.0, 4.0]`,
      annotations: {
        1: 'Four running totals, one per activation position.',
        2: 'How many dropout passes we will average over. A hundred thousand is enough for three decimal places.',
        4: 'The underscore is a normal variable name that Python programmers use to mean "I need a loop, but I do not care about the counter". Same as writing i and never using it.',
        5: 'One training pass through the dropout layer, with a fresh random mask.',
        6: 'Walk the four positions of the result.',
        7: 'Add this pass\'s value into the running total for that position.',
        9: 'A list for the four averages.',
        10: 'Same four positions again.',
        11: 'Total divided by the number of passes is the average value at that position.',
        13: 'The averages come out [1.002, 1.997, 2.987, 3.995].',
        14: 'The original activations are [1.0, 2.0, 3.0, 4.0]. The averages match them to within a thousandth — the leftover wobble is just randomness, not a bias. THAT is what the division by (1 - p) bought: on average, the next layer receives the same size of numbers with dropout on as it would with dropout off. Without the division, every average would be halved, and the next layer would see numbers half as big during training as at evaluation.',
      },
    },
    {
      type: 'intuition',
      title: 'Dropout is switched OFF at evaluation time',
      md: `**Inference time** (also called evaluation time) is when you use the trained network to answer real questions. At inference, dropout does nothing at all: no mask, no zeroing, no rescaling. The activations pass straight through.

- Why off: you want one fixed answer per input. Passes 1, 2 and 3 above gave three different results from the same input. Nobody wants a prediction that changes because a coin landed differently.
- Why no correction is needed at inference: because we already did the correction at training time. The previous snippet proved the training-time average equals the raw activation, so leaving dropout off at inference keeps the scale right.
- The name for doing it this way — divide during training, do nothing at inference — is **inverted dropout**. Every framework ships it.
- In PyTorch the switch is **model.eval()** before serving and **model.train()** before training. It is one line, and forgetting it is the classic bug diagnosed at the end of this module.

Where to use it: around 0.5 on wide fully-connected layers, 0.1 to 0.3 on convolution layers and transformer blocks, and **zero on the output layer** — never randomly delete the answer you are reading. Many modern networks use little or none, because normalization layers and augmentation already do the job.`,
    },
    {
      type: 'intuition',
      title: 'Fix 2 — early stopping: quit at the bottom of the U',
      md: `Look back at the table. Validation loss bottomed out at 0.327 on epoch 1600. Everything after that was wasted at best and harmful at worst. So: stop there.

- **Early stopping** means watching validation loss each epoch, keeping a saved copy of the best weights so far (a **checkpoint**), and halting when it stops improving. At the end you load the best checkpoint back, not the final one.
- The obvious version — "stop the first time it goes up" — is too twitchy, because the validation number wobbles by itself from epoch to epoch. So you wait a bit.
- **Patience** is how many epochs in a row you tolerate with no improvement before giving up. Typically 5 to 10 real epochs. In the snippet below patience is 3, counted over our every-400-epoch checkpoints.
- It costs nothing: no extra weights, no extra maths, one counter.
- Why it counts as regularization: fewer steps means the weights travel a shorter distance from their small random starting values, so less of the network\'s capacity ever gets used.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Early stopping on the real validation numbers',
      code: `val_loss = [0.352, 0.340, 0.331, 0.327, 0.335, 0.346, 0.355, 0.359]

best = 99.0
best_epoch = 0
waited = 0

for i in range(len(val_loss)):
    if val_loss[i] < best:
        best = val_loss[i]
        best_epoch = (i + 1) * 400
        waited = 0
    else:
        waited = waited + 1
    print('epoch', (i + 1) * 400, ' val', val_loss[i], ' best', best, ' waited', waited)
    if waited == 3:
        break

print('stop. restore the checkpoint from epoch', best_epoch)

# ---- real output ----
# epoch 400  val 0.352  best 0.352  waited 0
# epoch 800  val 0.34  best 0.34  waited 0
# epoch 1200  val 0.331  best 0.331  waited 0
# epoch 1600  val 0.327  best 0.327  waited 0
# epoch 2000  val 0.335  best 0.327  waited 1
# epoch 2400  val 0.346  best 0.327  waited 2
# epoch 2800  val 0.355  best 0.327  waited 3
# stop. restore the checkpoint from epoch 1600`,
      annotations: {
        1: 'The validation losses printed by the training run, in order. Nothing invented.',
        3: 'The best validation loss seen so far. Start it at a deliberately huge value so the first real number always beats it.',
        4: 'Which epoch produced that best value. This is the checkpoint we would reload.',
        5: 'The patience counter: how many checks in a row have failed to improve. Starts at zero.',
        7: 'Walk the list of validation losses in order, as if the epochs were arriving live.',
        8: 'Is this check better than the best we have ever seen?',
        9: 'Yes — record the new best.',
        10: 'Record its epoch. i is 0-based and we checked every 400 epochs, so position i corresponds to epoch (i+1)*400.',
        11: 'Reset the counter. Patience is about consecutive failures, so any improvement wipes the slate clean.',
        12: 'Otherwise this check did not improve on the best.',
        13: 'Count one failure. Note it counts failures to beat the BEST, not failures to beat the previous epoch.',
        14: 'Print the epoch, its validation loss, the best so far, and the counter. Watch the counter go 0,0,0,0,1,2,3.',
        15: 'Three consecutive non-improvements is our patience limit.',
        16: 'break leaves the loop immediately. In a real trainer this is where training halts.',
        18: 'The counter hit 3 at epoch 2800, but the weights we keep are the ones from epoch 1600 with val loss 0.327 — not epoch 2800 with 0.355. Restoring the best checkpoint, not the last one, is the half of early stopping people forget.',
      },
    },
    {
      type: 'note',
      md: 'One catch, and it is a real one. The moment you choose *when to stop* by watching validation loss, the validation set has helped build the model. Its loss is now an optimistic number — you picked the epoch that happened to look best on it, lucky noise included. So an honest final score needs a **third split: a test set you look at exactly once, at the very end**. The same applies to every setting you tuned by watching validation, including the dropout rate. Tune on validation, report on test.',
    },
    {
      type: 'intuition',
      title: 'Fix 3 — weight decay: make big weights cost something',
      md: `A network makes a wild, sharply swinging curve by using large weights. Small weights can only make gentle curves. So put a price on size.

- **Weight decay** adds a penalty to the loss that grows with the size of the weights: lambda times the sum of every weight squared, where lambda is a small number you choose. The network now has to justify any large weight by earning back more than the penalty costs.
- In practice it shows up in the update as a shrink. Each step, before the usual move along the slope, every weight is multiplied by slightly less than 1. That constant nibbling is where the word "decay" comes from.
- This is **exactly the L2 penalty taught in the ML module *Polynomials, Overfitting, and Regularisation: Ridge vs Lasso*** — same formula, same shrink-everything-keep-everything behaviour, applied to network weights instead of regression coefficients. If you want the derivation and the Ridge-versus-Lasso comparison, that module has it worked out in full.
- Typical lambda: between 0.00001 and 0.01, tuned by trying values that differ by factors of ten rather than small increments.
- Do not apply it to bias terms or to the scale and shift parameters of normalization layers. Those set offsets and scales, not curve complexity, and shrinking them just breaks the layer.`,
    },
    {
      type: 'intuition',
      title: 'Fix 4 — data augmentation: manufacture more questions',
      md: `The real cure for a student who memorized the answer key is more questions. Data augmentation makes new training examples out of the ones you already have, by changing the input in a way that does not change the answer.

- **Images:** flip the picture left-to-right, crop a random piece of it and resize, rotate it a few degrees, shift the colours slightly. A flipped photo of a cat is still a photo of a cat, so the label comes along for free.
- **Text:** swap a word for a synonym, or translate the sentence into another language and back — "the film was excellent" might return as "the movie was great", a genuinely different sentence with the same meaning.
- **Audio:** shift the clip a fraction of a second, or mix in a little background noise. Still the same spoken word.
- Why it beats the other three fixes when it is available: dropout, early stopping and weight decay only restrict the network. Augmentation adds real information — it tells the network which changes are supposed to leave the answer alone.

The one rule: **the label must survive the change.** A flipped cat is a cat. A flipped **6** is not a 6, and rotate a 6 by 180 degrees and it is a **9**. Apply flips to handwritten digits and you are training the network on wrong answers.`,
    },
    {
      type: 'note',
      md: 'One more you will see in recipes: **label smoothing**. Instead of training the network to output 1.0 for the correct class, you train it against 0.9 and spread the remaining 0.1 over the others. It stops the network from pushing its confidence to the extreme on examples it has not really earned. The Metrics subject covers what that buys you when you need the output numbers to be believable probabilities; for here, it is just one more small brake on overconfidence.',
    },
    {
      type: 'intuition',
      title: 'Worked case: a chest X-ray classifier, by hand',
      md: `You train a network on 8,000 chest X-rays. Here is your log, and here is the reasoning, step by step.

- epoch 1 — train loss 0.68, val loss 0.67
- epoch 5 — train 0.41, val 0.44
- epoch 10 — train 0.22, val 0.38
- epoch 15 — train 0.09, val 0.41
- epoch 20 — train 0.03, val 0.49

**Step 1, is it really overfitting?** Compute the gap at each check: 0.68 - 0.67 = -0.01, then 0.03, 0.16, 0.32, 0.46. Both curves fall together at first and the gap grows steadily afterwards. That is the genuine article. If instead validation had been far above training at epoch 1 — a gap already there before the network learned anything — that would be a bug, not overfitting, and the suspects would be a leak between the splits, mismatched labels, or different preprocessing at evaluation time.

**Step 2, where is the bottom?** Validation is lowest at epoch 10 (0.38). With patience 3 the counter would go 1 at epoch 15 and stop shortly after, restoring epoch 10. You have already recovered from 0.49 to 0.38 without changing a single thing about the model.

**Step 3, what next, in order?** More data first if you can get it. Then augmentation, which here means small rotations, small shifts and mild brightness changes — but **no horizontal flips**, because on a chest X-ray left and right are not interchangeable, so a flip destroys the label. Then raise weight decay, or add dropout to the final wide layer, changing one knob per run so you can tell what worked. Then a smaller network. Early stopping stays on throughout as the backstop.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: dropout left on at evaluation',
      md: `You finish training a network with dropout p = 0.5. You score it on the validation set. Accuracy is 71%. You score it again, same weights, same data, and get 68%. Then 73%. The number moves every time, and it is worse than the number you saw during training.

**The wrong diagnosis:** "the validation set is too small" or "there is randomness in the data loader". You start adding regularization, because 71% against 94% training accuracy looks like overfitting.

**What is actually happening:** you never switched dropout off. Take the four activations from earlier, [1.0, 2.0, 3.0, 4.0], summing to 10.0 — that sum is what the next layer works with. With dropout still running, the three real passes printed above give:

- pass 1: [0.0, 0.0, 6.0, 0.0], sum **6.0**
- pass 2: [2.0, 0.0, 0.0, 8.0], sum **10.0**
- pass 3: [0.0, 0.0, 0.0, 0.0], sum **0.0**

The average of many such passes is 10.0, which is exactly right — but you do not serve the average. You serve one pass. Each prediction is computed by a random half of the network, so each one is a lottery ticket: sometimes fine, sometimes built on nothing. That is why the score moves between runs and sits below where it should.

**The diagnosis, stated properly:** inverted dropout fixes the *average* activation, not any individual forward pass. Correct on average is not the same as correct. Evaluation needs the whole network, every time.

**The fix:** call **model.eval()** before scoring or serving, and **model.train()** before going back to training. Nothing crashes if you forget, nothing warns you, and the same forgotten line also leaves normalization layers using the current batch\'s statistics instead of the stored ones. One line, two silent failures.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work each one out before reading the solution.

**1.** A dropout layer with p = 0.25 receives the activation 8.0, and it survives the mask. What number reaches the next layer, at training time and at evaluation time?

**2.** Validation loss by epoch: 0.50, 0.46, 0.44, 0.45, 0.43, 0.47, 0.48, 0.49. With patience 3, at which epoch does training stop, and which checkpoint is restored?

**3.** Training loss 0.55 and validation loss 0.57, both stuck there for 30 epochs, barely any gap. A teammate suggests raising dropout to 0.5. Is that right?

**4.** You are building a classifier that separates ripe from unripe tomatoes from photographs. Which of these augmentations are safe: horizontal flip, random crop, strong colour jitter, small rotation?

**5.** Your validation loss goes 0.40, 0.42, 0.39, 0.41, 0.38 over five epochs. Your teammate stopped training at the first uptick and shipped. What went wrong?`,
    },
    {
      type: 'note',
      md: `**Solution 1.** At training time it survives and is divided by (1 - p) = 0.75, giving 8.0 / 0.75 = **10.667**. At evaluation dropout is off entirely, so the number that reaches the next layer is **8.0**, unchanged. The rescale exists so the average of the training-time numbers also lands on 8.0.

**Solution 2.** Track best and the counter: 0.50 best, 0.46 best, 0.44 best, 0.45 (waited 1), 0.43 best and counter resets to 0, 0.47 (1), 0.48 (2), 0.49 (3) — stop at **epoch 8**, restore **epoch 5**, the checkpoint with 0.43. The reset at epoch 5 is the point of the exercise: patience counts consecutive failures to beat the best, so one good epoch clears the counter.

**Solution 3.** No, backwards. No gap means no overfitting — the network is not memorizing anything, it is failing to learn. This is **underfitting**, and more dropout tightens a network that is already too tight. Train longer, check the learning rate, use a bigger network, or turn regularization *down*. Before any of that, run the fastest test in deep learning: can the network drive the loss to nearly zero on a **single batch**? If it cannot, you have a bug — wrong labels, wrong loss, frozen weights — not a capacity problem.

**Solution 4.** Horizontal flip: safe, a mirrored tomato is the same tomato. Random crop: safe if it still contains the fruit. Small rotation: safe. **Strong colour jitter: unsafe** — colour is exactly what separates ripe from unripe here, so shifting it can turn a ripe tomato into an unripe-looking one while the label still says ripe. Always ask whether a human would still give the image the same label.

**Solution 5.** The validation curve is noisy: the numbers bounce (0.40, 0.42, 0.39, 0.41, 0.38) while genuinely trending down, and 0.38 at epoch 5 is the best of the run. Stopping at epoch 2 threw away the better model. That is what patience is for — judge the trend over 5 to 10 epochs, not one tick. And because the best checkpoint is saved anyway, waiting longer costs only time.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Four extras, none needed to use anything above.

- **Weight decay with Adam is not the same as L2.** The Adam optimizer divides each weight\'s update by its own recent gradient size. A penalty folded into the loss gets divided too, so weights with big gradients end up decayed less than weights with small ones — a regularizer nobody designed. **AdamW** fixes it by subtracting the decay from the weight directly, outside the adaptive part. That is why modern recipes say AdamW rather than Adam.
- **Dropout as an ensemble.** Each random mask defines a different smaller network, and with n units there are 2 to the power n of them, all sharing one set of weights. Training touches that whole family, and the full network at inference behaves roughly like their average. Averaging many models is a reliable way to reduce error, which is a second reason dropout works.
- **Double descent.** The U-shaped test error curve is not the end of the story. Push a model far past the point where it fits the training set perfectly and test error often falls a *second* time. It is real, it is part of why enormous models work, and it is not permission to skip regularization on models you will actually ship.
- **mixup and cutmix.** Blend two training images together — a weighted average, or paste a patch of one onto the other — and blend their two labels in exactly the same proportion. The label stays truthful, so the label-preservation rule is respected rather than broken. Cheap, strong, standard in modern image training.`,
    },
  ],
  quiz: [
    {
      question: 'In the run at the top of this module, training loss went 0.040 to 0.001 while validation loss went 0.352 down to 0.327 and back up to 0.364. What happened after epoch 1600?',
      options: [
        {
          text: 'The network started memorizing the six training points, including their noise',
          explanation: 'Correct. Improvements after epoch 1600 only fit quirks that exist in those six points and nowhere else, so validation got worse.',
        },
        { text: 'The learning rate became too large and training diverged', explanation: 'Training loss kept falling smoothly to 0.001. Divergence would have made both numbers blow up.' },
        { text: 'The validation set was too small to measure anything', explanation: 'A small validation set adds wobble, but this is a steady climb across five consecutive checks, not a wobble.' },
      ],
      correct: 0,
    },
    {
      question: 'Dropout with p = 0.5. An activation of 3.0 survives the mask during training. What is passed to the next layer?',
      options: [
        {
          text: '6.0, because survivors are divided by (1 - p)',
          explanation: 'Correct. 3.0 / 0.5 = 6.0. Survivors carry the share of the units that were dropped, which is what keeps the average equal to the evaluation-time value.',
        },
        { text: '1.5, because survivors are multiplied by (1 - p)', explanation: 'That multiplies where the rule divides, and it would make training activations half the size they should be.' },
        { text: '3.0, because dropout only zeroes and never rescales', explanation: 'Zeroing without rescaling would halve the average activation at p = 0.5, so the next layer would see smaller numbers in training than at evaluation.' },
      ],
      correct: 0,
    },
    {
      question: 'You serve a trained model but forget to switch dropout off. What actually goes wrong?',
      options: [
        { text: 'Nothing, because the rescaling makes training and evaluation identical', explanation: 'The rescaling fixes the AVERAGE over many passes. You serve one pass, and one pass still uses a random mask.' },
        {
          text: 'Every prediction uses a random subset of the units, so scores are noisy and worse, with no error raised',
          explanation: 'Correct. The three passes printed in the module gave sums of 6.0, 10.0 and 0.0 from the same input. Nothing crashes; the model is just quietly unreliable.',
        },
        { text: 'All predictions come out multiplied by (1 - p)', explanation: 'That is a fixed scaling error. Dropout left on gives a different random result each time, not a consistent shrink.' },
      ],
      correct: 1,
    },
    {
      question: 'Validation losses at successive checks: 0.50, 0.46, 0.44, 0.45, 0.43, 0.47, 0.48, 0.49. With patience 3, which checkpoint gets restored?',
      options: [
        { text: 'The one with 0.44, because that is where the first uptick appeared', explanation: 'The counter is about consecutive failures to beat the best, and 0.43 later beat 0.44, resetting it.' },
        { text: 'The last one, 0.49, because that is where training stopped', explanation: 'Early stopping restores the BEST checkpoint, not the final one. Restoring the last one throws away everything the patience window was protecting.' },
        {
          text: 'The one with 0.43',
          explanation: 'Correct. 0.43 is the lowest value seen. The counter then runs 1, 2, 3 on the three worse checks and training halts, but the weights kept are the 0.43 ones.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Training loss and validation loss both sit at about 0.55 with almost no gap, for thirty epochs. What now?',
      options: [
        { text: 'Add dropout of 0.5 and raise weight decay', explanation: 'Backwards. No gap means nothing is being memorized, so tightening a network that is already too tight makes it worse.' },
        {
          text: 'Treat it as underfitting: first check the network can drive a single batch to near-zero loss, then train longer, fix the learning rate, or go bigger',
          explanation: 'Correct. And the single-batch test comes first, because failing it means a bug rather than a capacity shortage.',
        },
        { text: 'Collect more training data', explanation: 'More data helps when the network is memorizing what it has. This one is not yet using the data it already has.' },
      ],
      correct: 1,
    },
    {
      question: 'Which augmentation destroys the label on a handwritten-digit classifier?',
      options: [
        {
          text: 'Horizontal flip',
          explanation: 'Correct. A mirrored 6 is not a 6, and a 6 rotated 180 degrees is a 9. You would be training against wrong answers.',
        },
        { text: 'Shifting the image by a couple of pixels', explanation: 'Position does not carry the label for digits, so small shifts are a standard and safe augmentation here.' },
        { text: 'Slightly distorting the stroke shape', explanation: 'Real handwriting varies exactly this way, so the label survives. It is a classic digit augmentation.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain what dropout does at training time and at inference time, and why they differ.',
      answer:
        'At training time, each activation in the layer is independently set to zero with probability p, and the survivors are divided by (1 - p). A fresh random mask every step means no unit can rely on a specific partner being present, so the network cannot build fragile chains of co-dependent features. At inference, dropout is off completely: no mask, no rescaling. Two reasons. First, you want one deterministic answer per input, and a mask would make the same input give different answers on different calls. Second, the correction has already been paid: dividing by (1 - p) during training makes the expected activation equal the raw activation, so inference needs nothing. That arrangement is called inverted dropout. The practical failure to name is forgetting model.eval() before serving, which leaves each prediction computed by a random half of the network - noisy, worse, and completely silent.',
      isCaseBased: false,
    },
    {
      question: 'Case: training loss falls steadily, validation loss rises. Walk me through your debugging.',
      answer:
        'Step 1, confirm the diagnosis rather than assuming it. Genuine overfitting looks like both curves falling together at first, then validation flattening and turning up while training keeps dropping, with the gap widening over time. If validation is bad from the very first epoch, that is not overfitting, because nothing has been learned yet to overfit with. That points at a bug: data leakage between the splits, mismatched validation labels, evaluation-time preprocessing that differs from training, or a split that ignores time or group structure. Step 2, with a widening gap confirmed, respond in order of leverage: more data, then augmentation, then stronger regularization (weight decay and dropout, changing one knob per run so you know what worked), then a smaller model, with early stopping and best-checkpoint restore running throughout as the backstop. Step 3, judge the trend over five to ten epochs, because a validation curve wobbles on its own. The ordering is the answer; naming dropout immediately is not.',
      isCaseBased: true,
    },
    {
      question: 'Derive the (1 - p) division in inverted dropout.',
      answer:
        'Take one activation h. With probability (1 - p) it survives and contributes h; with probability p it is zeroed and contributes 0. So the average value passed on by plain dropout is (1 - p) times h plus p times 0, which is (1 - p) times h. At inference there is no mask, so the next layer would receive h. Those two differ by exactly a factor of (1 - p), which means the next layer sees systematically smaller numbers during training than at test. Divide the survivors by (1 - p) during training and the average becomes h exactly, matching inference. At p = 0.5 that means survivors are literally doubled. Worth adding: the correction fixes the mean but not the variance, so a single training-mode pass is still noisy, and that leftover variance is why dropout placed next to batch normalization can cause trouble - the statistics normalization sees during training no longer match the ones it stores for test.',
      isCaseBased: false,
    },
    {
      question: 'Is weight decay the same thing as L2 regularization?',
      answer:
        'With plain gradient descent, yes. Adding a penalty proportional to the sum of squared weights contributes a term proportional to the weight itself to each gradient, so the update becomes: shrink the weight by a constant factor slightly below one, then take the usual step along the loss gradient. The shrink is the decay, and it is the same L2 penalty as Ridge regression in the ML curriculum. With adaptive optimizers they come apart. Adam divides each update by that parameter\'s recent gradient magnitude, so a penalty folded into the loss gets divided too - parameters with large gradients are decayed less than parameters with small ones, which is not a regularizer anyone intended. AdamW decouples it: compute the adaptive step from the loss gradient only, then subtract the decay from the weight directly. That is why modern recipes specify AdamW. Practical note: exclude biases and normalization scale and shift parameters from decay.',
      isCaseBased: false,
    },
    {
      question: 'Case: an image classifier reaches 99% training accuracy and 71% validation accuracy. You have 8,000 labelled images and no budget for more. What do you do, in order?',
      answer:
        'Confirm first: is the gap widening across epochs, and is the validation set drawn the same way as training? At this data size, near-duplicate images leaking across the split is extremely common and would make the 71% meaningless. Then, with more data ruled out by budget: first, transfer learning - starting from a pretrained backbone and fine-tuning is effectively borrowing millions of extra images and at 8,000 images it usually beats everything else on this list. Second, augmentation, hard: random resized crop, horizontal flip if the labels permit it, colour jitter, random erasing, and mixup. Third, stronger weight decay, then dropout in the classifier head, one knob per run. Fourth, a smaller model or lower input resolution. Fifth, early stopping with best-checkpoint restore throughout. Also cheap and often skipped: audit the labels on the validation set, because at 71% a meaningful share of the "errors" may be wrong labels. Tradeoff to name: heavy augmentation slows convergence, so re-tune the epoch budget after adding it.',
      isCaseBased: true,
    },
    {
      question: 'What makes an augmentation valid, and give one that quietly ruins a model.',
      answer:
        'The rule is label preservation: after the transformation, would a human still give the image the same label? A mirrored photo of a cat is still a cat, so horizontal flips are free extra supervision on natural images. A mirrored 6 is not a 6, and rotated 180 degrees it becomes a 9, so flipping handwritten digits trains the model against wrong answers - and nothing errors out, validation accuracy just stalls for a reason that never appears in a log. Other real examples: strong colour jitter when colour is the label, such as ripe versus unripe fruit; synonym swaps on text where negation carries the meaning; horizontal flips on chest X-rays, where left and right organs genuinely differ. There is a subtler failure too: augmentation that produces inputs unlike anything at test time wastes capacity on a distribution you will never see. mixup and cutmix are the principled exception, because they change the input and the label by the same proportion.',
      isCaseBased: false,
    },
    {
      question: 'Is early stopping really regularization, or just convenience?',
      answer:
        'Genuinely regularization. Stopping early limits how far the weights travel from their small random starting values, so less of the available capacity is ever used. For a simple linear model trained by gradient descent you can show the early-stopped solution corresponds closely to an L2-penalized one, with the number of steps playing the role of the inverse penalty strength. It is also the cheapest regularizer there is: no extra parameters, no extra computation, one counter. Three subtleties worth raising unprompted. Restore the best checkpoint, not the last one. Use a patience window rather than stopping at the first uptick, because the validation curve is noisy. And remember that using validation loss to choose the stopping point makes validation part of model selection, so an honest final number needs a separate test set looked at once.',
      isCaseBased: false,
    },
    {
      question: 'Case: a teammate says "validation loss went up at epoch 12, so I stopped and shipped epoch 11". Two runs later it happened at epoch 40 instead. What is going on and what do you change?',
      answer:
        'They are reacting to a single-epoch tick on a noisy curve. Validation loss wobbles from shuffling order, dropout masks, augmentation randomness, and above all a small validation set, where a handful of borderline examples flipping is enough to move the average. The changes: use a patience window of five to ten epochs with best-checkpoint restore instead of stopping at the first uptick; watch the metric you actually care about alongside the loss, because validation loss can rise from growing overconfidence on examples that are already correct while accuracy still improves; enlarge the validation set, or use cross-validation, if it is only a few hundred examples; smooth the curve or average the last few epochs before judging; and fix the random seed so runs are comparable at all. The tradeoff to name: longer patience costs wall-clock time and lets the model drift further into overfitting, but since the best checkpoint is restored anyway, the cost is mostly compute rather than quality.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'What the U-turn looks like', back: 'Training loss keeps falling; validation loss falls, bottoms out, then climbs. In the module run: train 0.040 to 0.001, val 0.352 to 0.327 (epoch 1600) back up to 0.364. After the bottom, the network is memorizing noise.' },
    { front: 'Overfitting vs underfitting, from two numbers', back: 'Overfitting: training low, validation much higher, gap WIDENING over epochs. Underfitting: both high and close together. Validation bad from epoch 1 is neither - it is a bug (leakage, label mismatch, eval preprocessing).' },
    { front: 'Dropout: what it does', back: 'Each training step, zero each activation independently with probability p and divide the survivors by (1 - p). Fresh mask every step, so no unit can depend on a specific partner.' },
    { front: 'Why divide by (1 - p)', back: 'Plain dropout makes the average activation (1 - p) times too small. Dividing survivors by (1 - p) restores it exactly, so inference can just switch dropout off with no correction. At p = 0.5 survivors are doubled.' },
    { front: 'Dropout at evaluation time', back: 'OFF. No mask, no rescale. Forgetting model.eval() means each prediction uses a random subset of units: noisy, reliably worse, no error raised. It also leaves normalization layers on batch statistics.' },
    { front: 'Early stopping recipe', back: 'Watch validation loss, save the BEST checkpoint, count consecutive non-improvements, stop when the count hits patience (5-10 epochs), restore the best - not the last. Any improvement resets the counter.' },
    { front: 'Weight decay', back: 'Penalize the sum of squared weights, so each step shrinks every weight slightly before the gradient step. Same L2 penalty as Ridge in the ML module. Skip biases and normalization parameters. Use AdamW, not Adam plus an in-loss penalty.' },
    { front: 'The augmentation rule', back: 'The label must survive the change. Flipped cat = cat (safe). Flipped 6 is not a 6, rotated 6 = 9 (label destroyed). Colour jitter is unsafe when colour is the label.' },
  ],
  mindmapMarkdown: `- Regularization in neural networks
  - The U-turn (the whole point)
    - Train loss falls forever: 0.040 to 0.001
    - Val loss bottoms at 0.327 (epoch 1600) then climbs to 0.364
    - Overfitting = fitting the noise in the training points
    - Capacity = how much detail the net can memorize (49 weights, 6 points)
    - Regularization = pay training loss to buy validation loss
  - Dropout
    - Zero each activation with probability p, fresh mask each step
    - No co-adaptation: nobody can rely on a fixed partner
    - Divide survivors by (1 - p) so the average is unchanged
    - OFF at evaluation: one deterministic answer
    - Forgetting model.eval() = random half-network per prediction
    - Rates: ~0.5 wide dense, 0.1-0.3 conv/transformer, 0 on output
  - Early stopping
    - Watch val loss, save the BEST checkpoint
    - Patience = consecutive non-improvements tolerated
    - Any improvement resets the counter
    - Restore best, not last
    - Val is now model selection, so report on a separate test set
  - Weight decay
    - Penalty on the sum of squared weights
    - Each step shrinks every weight slightly
    - Same L2 penalty as Ridge (ML: Polynomials, Overfitting, Ridge vs Lasso)
    - Skip biases and normalization parameters
    - AdamW decouples decay from the adaptive step
  - Data augmentation
    - Adds real information, not just restriction
    - Images: flip, crop, rotate, colour shift
    - Text: synonym swap, translate-and-back
    - Audio: time shift, background noise
    - Rule: the label must survive the change
    - mixup/cutmix blend inputs AND labels together
  - Diagnosis
    - Gap widening over epochs = real overfitting
    - Gap present at epoch 1 = bug (leakage, labels, preprocessing)
    - Both losses high and close = underfitting, ease off
    - Single-batch overfit test finds bugs fastest
    - Response order: more data, augmentation, regularization, smaller model, early stopping`,
}

export default m
