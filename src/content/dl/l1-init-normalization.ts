import type { Module } from '../types'

const m: Module = {
  id: 'dl-l1-init-normalization',
  subjectId: 'dl',
  level: 1,
  title: 'Weight Init, BatchNorm vs LayerNorm',
  whyItMatters:
    'Before a network can learn anything, the numbers flowing through it have to stay a sensible size. Get the starting weights slightly too small and the signal fades to nothing by layer six. Slightly too large and it grows past a hundred. This module shows both failures happening, with printed numbers per layer, then builds the two standard fixes: choosing the starting weights by a rule instead of by guess, and re-standardising the numbers between layers. Along the way it answers the two questions every deep-learning interview asks - why all-zero starting weights break a network, and why BatchNorm computes something different when you are testing than when you are training.',
  assumes: [
    'You have seen a Python for loop, a function definition, a list, and print',
    'You know what an average is, and that squaring a number makes it positive',
    'Read the DL module *Activation Functions* first: this module uses ReLU (keep positive numbers, turn negative numbers into 0) and sigmoid on every page',
    'Read the DL module *Backpropagation* first: this module uses the idea that training sends a gradient backwards through the layers and nudges each weight by (gradient) x (step size)',
    'No other deep learning background is needed. Every term used here is defined here.',
  ],
  estMinutes: 44,
  sections: [
    {
      type: 'intuition',
      title: 'The failure that motivates everything',
      md: `Take 100 numbers of typical size 1. Push them through six layers of a neural network. A layer multiplies its inputs by weights, adds the results up, and applies ReLU. Nothing exotic. Here is the typical size of the numbers coming out of each of the six layers, for three different choices of how big the starting weights are.

- Starting weights a bit small: **0.3530, 0.1484, 0.0589, 0.0227, 0.0087, 0.0034**. The signal is gone.
- Starting weights just right: **1.2362, 1.1568, 1.2555, 1.1641, 0.9622, 1.0128**. It stays put.
- Starting weights a bit large: **2.1911, 5.0441, 10.0510, 20.6837, 51.8068, 127.8427**. It has run away.

Those are real numbers, printed by the program two sections down. Nothing changed between the three runs except the size of the starting weights. Six layers is a shallow network; real ones go 30 or 100 deep, where 0.0034 becomes a number your computer rounds to zero and 127 becomes a number it cannot store.

**Initialisation** is the word for choosing the starting values of the weights before any training happens. The three lines above are the whole argument for taking that choice seriously: it is not a detail, it decides whether the network trains at all.`,
    },
    {
      type: 'intuition',
      title: 'Two words we need before the code',
      md: `Both are simple, and both get used constantly from here on.

- **Weight.** One adjustable number inside the network. Each output unit of a layer has one weight per input it receives, and it computes (weight 1 x input 1) + (weight 2 x input 2) + ... That sum is called the **pre-activation**, and then ReLU is applied to it.
- **Typical size.** To say "these 100 numbers are around 1" we need one number summarising the whole list. Square every value, take the average of the squares, take the square root. That is the **root-mean-square**, and it is the thing printed above. Squaring first is what stops a big positive and a big negative from cancelling out to a misleadingly small answer.

We will write both of these as two small Python functions, then use them to reproduce the three lines from the previous section.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 1: one layer, and a way to measure the size of a signal',
      code: `import random
import math

random.seed(0)                       # same numbers every run, so you can check mine

def one_layer(x, scale):             # push the list x through one layer
    out = []                         # the values this layer will send onward
    for j in range(len(x)):          # build one output unit at a time
        w = [random.gauss(0, scale) for _ in range(len(x))]
        z = sum(w[i] * x[i] for i in range(len(x)))
        out.append(max(0.0, z))      # ReLU: keep positives, turn negatives into 0
    return out

def typical_size(x):                 # how big are these numbers, on average?
    return math.sqrt(sum(v * v for v in x) / len(x))`,
      annotations: {
        1: 'random gives us random numbers. We use plain Python here on purpose: no library is hiding the arithmetic.',
        2: 'math gives us sqrt, the square root.',
        9: 'random.gauss(0, scale) draws one random number centred on 0, where scale controls how spread out the draws are: most land within one scale of 0. The square brackets are a list comprehension - a compact way to write "make a list by running this expression once per item". Here it makes one weight for every input, so this unit gets len(x) weights.',
        10: 'The multiply-and-add. sum(...) with an expression and a for inside it is a generator expression: it produces w[0]*x[0], w[1]*x[1], ... one at a time and adds them up. This total is the pre-activation z.',
        12: 'Hand the finished list of unit outputs back to the caller. It becomes the input list of the next layer.',
        15: 'Square each value (v * v), average them (divide by how many there are), then take the square root. That is the root-mean-square from the previous section, in one line.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 2: six layers, three choices of starting weight',
      code: `signal = [random.gauss(0, 1) for _ in range(100)]
print('input typical size %.4f' % typical_size(signal))

for scale in [0.05, 0.1414, 0.30]:   # three sizes of starting weight
    x = signal                       # every run starts from the same input
    sizes = []                       # the typical size after each layer
    for layer in range(6):           # six layers deep
        x = one_layer(x, scale)
        sizes.append('%.4f' % typical_size(x))
    print('scale', scale, '->', ' '.join(sizes))

# ---- real output ----
# input typical size 1.0655
# scale 0.05 -> 0.3530 0.1484 0.0589 0.0227 0.0087 0.0034
# scale 0.1414 -> 1.2362 1.1568 1.2555 1.1641 0.9622 1.0128
# scale 0.3 -> 2.1911 5.0441 10.0510 20.6837 51.8068 127.8427`,
      annotations: {
        1: 'Build the input: 100 random numbers spread around 0 with scale 1, so their typical size is about 1.',
        2: "The % operator inside a string is old-style formatting. '%.4f' means \"put a number here, 4 digits after the decimal point\". It prints 1.0655, confirming the input really is around 1.",
        8: 'Replace x with what the layer produced. Next time round the loop, that output becomes the input - this is how depth is built.',
        9: 'Record the typical size of this layer\'s output as a 4-decimal string, so the six numbers line up when printed.',
        10: "' '.join(sizes) glues the six strings together with a space between them, giving one tidy line per scale.",
      },
    },
    {
      type: 'intuition',
      title: 'Reading the three lines: what the scale actually controls',
      md: `Look at the ratio between one layer and the next, because that ratio is the whole story.

- At scale 0.05 each layer multiplies the typical size by roughly **0.39**. Six layers means 0.39 multiplied by itself six times, which is 0.0035. That matches the printed 0.0034.
- At scale 0.1414 the ratio is roughly **1.0**, so six layers leave the size where it started.
- At scale 0.30 the ratio is roughly **2.2**, and 2.2 to the sixth power is about 113, close to the printed 127.

A per-layer multiplier that is not 1 gets raised to the power of the depth. There is no third outcome: a number slightly below 1 raised to a high power goes to zero, and a number slightly above 1 goes to infinity. **Vanishing** is the name for the first failure, **exploding** for the second, and both wreck training - a layer receiving 0.0034 has nothing to learn from, and a layer receiving 127 produces updates that throw the weights off a cliff.

So the goal of initialisation states itself: **choose the starting weights so that each layer multiplies the typical size of the signal by about 1.**`,
    },
    {
      type: 'intuition',
      title: 'Where the rule comes from: variance and fan-in',
      md: `Two more words, then the arithmetic that gives us 0.1414.

- **Variance** of a list of numbers means the average of their squared distances from their own average. It is a measure of spread: small variance means the numbers huddle together, large variance means they are scattered. When we say "the variance of the activations" we mean the spread of the numbers coming out of a layer.
- **Fan-in** is the number of inputs feeding into one output unit. In our code that is len(x), which was 100. **Fan-out** is the number of units the layer sends its output to. They are just counts; the odd names come from circuit diagrams.

Now the arithmetic. One pre-activation is a sum of fan-in separate terms, each one (a weight) x (an input). When you add up independent numbers that are all centred on zero, the variances add. So:

- variance of the pre-activation = fan-in x (variance of one weight) x (variance of one input).
- We want the output spread to match the input spread, so set fan-in x variance(weight) = 1, giving **variance(weight) = 1 / fan-in**.
- ReLU then deletes every negative pre-activation, replacing it with 0. Roughly half the values are negative, so ReLU roughly halves the variance of what comes out. To pay for that in advance, double the weight variance: **variance(weight) = 2 / fan-in**.
- With fan-in 100 that is 2/100 = 0.02, and the scale we pass to random.gauss is the square root of the variance: sqrt(0.02) = **0.1414**. That is exactly the middle line of the printout, and it is exactly the line that stayed at 1.`,
    },
    {
      type: 'math',
      intro: 'The same three steps in symbols. n_in is fan-in, w is one weight, x is one input, z is the pre-activation.',
      latex: [
        'z = \\sum_{i=1}^{n_{in}} w_i x_i \\quad\\Rightarrow\\quad \\mathrm{Var}(z) = n_{in}\\,\\mathrm{Var}(w)\\,\\mathrm{Var}(x)',
        '\\textbf{Xavier / Glorot: } \\mathrm{Var}(w) = \\frac{1}{n_{in}} \\quad \\text{(or the two-sided } \\tfrac{2}{n_{in} + n_{out}} \\text{)}',
        '\\textbf{He / Kaiming: } \\mathrm{Var}(w) = \\frac{2}{n_{in}}, \\qquad \\text{scale} = \\sqrt{\\tfrac{2}{n_{in}}} = \\sqrt{\\tfrac{2}{100}} = 0.1414',
      ],
    },
    {
      type: 'intuition',
      title: 'The two named recipes, and which activation each one is for',
      md: `The two rules above have names, and the names come up in every interview.

- **Xavier initialisation** (also called **Glorot initialisation**) sets variance(weight) = 1 / fan-in. It is the version without the ReLU correction, so it is the right choice for activations that pass a signal through roughly unchanged near zero: **sigmoid and tanh**.
- **He initialisation** (also called **Kaiming initialisation**) sets variance(weight) = 2 / fan-in. The extra factor of 2 pays for ReLU deleting half the signal, so it is the right choice for **ReLU and its relatives**.
- Xavier also has a two-sided form, 2 / (fan-in + fan-out). The reason: keeping the forward signal stable asks for 1/fan-in, while keeping the backward gradient stable asks for 1/fan-out. When the two counts differ you cannot have both, so this form splits the difference.
- One sentence to remember all of it: *Xavier for sigmoid and tanh, He for ReLU, and the 2 in He is because ReLU throws away half the signal.*

Both rules are about the **spread** of the starting weights, never the sign or the pattern. The weights are still random draws. Which brings us to the reason they must be random at all.`,
    },
    {
      type: 'intuition',
      title: 'Symmetry breaking: why all-zero weights never work',
      md: `A tempting shortcut is to start every weight at 0. It is clean, it is unbiased, and it destroys the network. Here is the argument, before the code that shows it.

- **Symmetry breaking** means making the units of a layer different from each other on purpose, so they can end up learning different things.
- Take a hidden layer with 3 units. If all their weights are identical, all 3 receive the same inputs and multiply them by the same numbers, so all 3 produce the same output. They are copies.
- Training sends a gradient back to each unit. Because the 3 units have identical inputs and identical outgoing connections, the gradient arriving at each of them is also identical.
- Same starting value plus same gradient means same value after the update. And after the next update. Forever.
- You built a 3-unit layer and got a 1-unit layer wearing a costume. Width bought you nothing, at any width.
- Note what the real problem is: not that the value is zero, but that the values are **the same**. Starting every weight at 0.7 fails in exactly the same way.

Random starting values break the symmetry before step one, at no cost. That is the second job of initialisation, alongside getting the scale right.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Three hidden units, all-zero weights versus random weights',
      code: `import math

def sigmoid(z):                      # squashes any number into the range 0 to 1
    return 1.0 / (1.0 + math.exp(-z))

def one_step(name, w, v, x, target):
    h = [sigmoid(wj * x) for wj in w]
    y = sum(v[j] * h[j] for j in range(len(v)))
    grad_v = [(y - target) * h[j] for j in range(len(v))]
    print(name, 'hidden', [round(a, 4) for a in h], 'grad_v', [round(g, 4) for g in grad_v])

one_step('all zeros ', [0.0, 0.0, 0.0], [0.0, 0.0, 0.0], 1.5, 1.0)
one_step('random    ', [0.7, -0.3, 1.2], [0.5, -0.8, 0.1], 1.5, 1.0)

# ---- real output ----
# all zeros  hidden [0.5, 0.5, 0.5] grad_v [-0.5, -0.5, -0.5]
# random     hidden [0.7408, 0.3894, 0.8581] grad_v [-0.6336, -0.333, -0.734]`,
      annotations: {
        1: 'math.exp is needed for sigmoid. Nothing else is imported: this whole network is three numbers wide.',
        4: 'The sigmoid formula. At z = 0 it returns 1/(1+1) = 0.5, which is the value you will see in the all-zeros output.',
        6: 'w holds the 3 incoming weights (one per hidden unit), v holds the 3 outgoing weights, x is the single input value and target is the answer we want.',
        7: 'Compute the 3 hidden unit outputs. wj * x is that unit\'s pre-activation, and sigmoid turns it into the unit\'s output. The list comprehension does this once per weight in w.',
        8: 'The final output: each hidden output multiplied by its outgoing weight, all added up.',
        9: 'The gradient for each outgoing weight. For a squared-error loss it works out to (prediction - target) x (the hidden output that weight multiplies). This is the number that decides how far the weight moves.',
        10: 'round(a, 4) trims each number to 4 decimals so the two lines are readable side by side.',
        12: 'The all-zeros run: 3 hidden weights of 0, 3 outgoing weights of 0, input 1.5, target 1.0.',
        13: 'The same call with 6 different random numbers. Everything else is identical.',
      },
    },
    {
      type: 'note',
      md: `Read the two output lines. With all zeros, the 3 hidden units all print **0.5** and all 3 gradients print **-0.5**: identical values, identical updates, identical forever. With random weights the units print **0.7408, 0.3894, 0.8581** and get gradients **-0.6336, -0.333, -0.734** - three different numbers, so the three units immediately start moving apart and can specialise. One extra detail interviewers like: the **biases** (the constant each unit adds) *can* safely start at zero, because the random weights have already made the units different. That is what PyTorch does by default.`,
    },
    {
      type: 'intuition',
      title: 'Why good initialisation is not enough',
      md: `Initialisation fixes the size of the signal at step 0 only. Then training starts moving the weights, and the moment they move, the careful variance calculation stops holding.

- After a thousand updates, layer 3's weights are no longer the numbers you drew. The typical size of what layer 3 emits has drifted.
- Layer 4 now receives a differently-sized signal than it was set up for, and passes an even more differently-sized one to layer 5. The drift compounds with depth, exactly like the failure in the opening section.
- You cannot re-initialise mid-training - that would throw away everything learned.

**Normalisation** is the fix: instead of only choosing the starting scale well, insert a step *between* layers that re-standardises the numbers on every single forward pass. The signal is measured and rescaled continuously, so drift never gets a chance to compound. The next sections build that step from one small vector.`,
    },
    {
      type: 'intuition',
      title: 'Normalise one vector by hand, all six steps',
      md: `Take three numbers: **2, 10, 1**. Normalising them means shifting and stretching them so they end up centred on 0 with a spread of 1.

1. **Mean.** (2 + 10 + 1) / 3 = 13 / 3 = **4.3333**.
2. **Distance from the mean**, one per number: 2 - 4.3333 = -2.3333; 10 - 4.3333 = 5.6667; 1 - 4.3333 = -3.3333.
3. **Variance**: square those, then average. 5.4444 + 32.1111 + 11.1111 = 48.6667, divided by 3 = **16.2222**. The square root of the variance is the **standard deviation**: sqrt(16.2222) = **4.0278**. That is the typical distance from the mean.
4. **Subtract the mean.** The three distances from step 2 are already this: -2.3333, 5.6667, -3.3333. Their average is now 0.
5. **Divide by the standard deviation.** -2.3333 / 4.0278 = **-0.5793**; 5.6667 / 4.0278 = **1.4069**; -3.3333 / 4.0278 = **-0.8276**. These three have mean 0 and spread 1. This trio is called the **normalised** values.
6. **Scale and shift.** Multiply each by a number called **gamma** and add a number called **beta**. With gamma = 2 and beta = 5 on the middle position: 2 x 1.4069 + 5 = **7.8138**.

Steps 1 to 5 are the same in every normalisation layer that exists. Step 6 is the part that makes it a *learned* layer, and it needs its own explanation.`,
    },
    {
      type: 'intuition',
      title: 'Why gamma and beta exist',
      md: `Forcing every layer output to mean 0 and spread 1 sounds harmless. It is not: it takes away a freedom the layer might genuinely need.

- Maybe this feature should be large, and the layer had a good reason for that. Maybe a sigmoid unit downstream wants inputs far from zero. Normalisation just deleted both possibilities.
- So the layer gets two numbers per feature that it **learns** during training, exactly like weights: **gamma**, which multiplies, and **beta**, which adds.
- If normalising was the right call, training leaves gamma near 1 and beta near 0 and nothing happens.
- If it was the wrong call, training can set gamma to the original standard deviation and beta to the original mean, which reverses steps 4 and 5 exactly and recovers the original numbers.
- So normalisation supplies a sensible default scale, and gamma and beta keep the layer's right to disagree with it. Nothing is forced permanently.

A small warning about the word: **eps**. In code you will see a tiny number like 0.00001 added inside the square root before dividing. It exists only so that a feature whose values are all identical - variance exactly 0 - does not cause a division by zero.`,
    },
    {
      type: 'intuition',
      title: 'BatchNorm: which numbers get averaged together',
      md: `Everything so far normalised one list of three numbers. A real layer produces a whole grid: one row per example, one column per feature. Which numbers should be averaged together?

- A **batch** is the small group of examples - say 4, or 256 - that the network processes together before it updates the weights once.
- **Batch normalisation**, usually written **BatchNorm**, computes the mean and variance **down each column**: for one feature, across all the examples in the batch.
- So a layer with 3 features produces 3 means and 3 variances, no matter how many examples are in the batch. Each feature is standardised using only its own column.
- It then applies gamma and beta, one pair per feature. A 3-feature BatchNorm layer therefore has 6 learned numbers.
- Note the consequence, because everything awkward about BatchNorm follows from it: **the output for one example depends on the other examples that happened to share its batch.** The examples are coupled.

Our grid: 4 examples, 3 features. Rows [2, 10, 1], [4, 12, 3], [6, 14, 11], [8, 16, 5]. The code below computes the three column statistics.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'BatchNorm: statistics down each column',
      code: `import math

def mean(v):
    return sum(v) / len(v)

def variance(v):
    m = mean(v)
    return sum((a - m) ** 2 for a in v) / len(v)

def normalise(v):
    m, s = mean(v), math.sqrt(variance(v) + 1e-5)
    return [(a - m) / s for a in v]

X = [[2.0, 10.0, 1.0], [4.0, 12.0, 3.0], [6.0, 14.0, 11.0], [8.0, 16.0, 5.0]]
for j in range(3):                   # one feature at a time
    col = [row[j] for row in X]
    print('feature', j, col, 'mean %.2f var %.2f ->' % (mean(col), variance(col)), [round(a, 3) for a in normalise(col)])

# ---- real output ----
# feature 0 [2.0, 4.0, 6.0, 8.0] mean 5.00 var 5.00 -> [-1.342, -0.447, 0.447, 1.342]
# feature 1 [10.0, 12.0, 14.0, 16.0] mean 13.00 var 5.00 -> [-1.342, -0.447, 0.447, 1.342]
# feature 2 [1.0, 3.0, 11.0, 5.0] mean 5.00 var 14.00 -> [-1.069, -0.535, 1.604, 0.0]`,
      annotations: {
        1: 'Only math is needed. Everything else is written out so you can see each step.',
        3: 'Step 1 of the hand calculation: add the numbers, divide by how many there are.',
        4: 'sum(v) adds every item in the list; len(v) counts them.',
        6: 'Steps 2 and 3: the average of the squared distances from the mean.',
        7: 'Compute the mean once and store it, so the next line can measure distances from it.',
        8: '(a - m) is one distance from the mean and ** 2 squares it. The generator expression does that for every item and sum adds them; dividing by len(v) turns the total into an average.',
        10: 'Steps 4 and 5 together: subtract the mean, divide by the standard deviation.',
        11: 'Two assignments on one line - this is tuple unpacking, and it is the same as writing m = mean(v) then s = math.sqrt(...). The 1e-5 is eps, the tiny guard against dividing by zero.',
        12: 'Build the output list: each value minus the mean, divided by the standard deviation.',
        14: 'The batch: 4 rows (examples), 3 columns (features). This exact grid is used for the rest of the module.',
        16: '[row[j] for row in X] walks down the rows and picks position j out of each one, which pulls out column j - all 4 values of feature j. Pulling out a column is the entire idea of BatchNorm.',
        17: 'Print the raw column, its mean and variance, and its normalised version. Check the first line against the hand calculation: mean 5, and (2-5)/sqrt(5) = -1.342.',
      },
    },
    {
      type: 'intuition',
      title: 'BatchNorm at training time versus at evaluation time',
      md: `This is the single most-asked BatchNorm question, and it has a concrete reason behind it.

- **At training time** BatchNorm uses the mean and variance of the batch in front of it, right now. Those are the numbers the code above computed.
- **At evaluation time** - meaning when you are measuring quality on held-out data, or serving real requests - it uses **running statistics** instead: a running average of every batch mean and every batch variance it saw during training, saved and then frozen.
- The reason it *must* be different: **one test example on its own has no batch to average over.** Its column contains a single number, so that column's mean is the number itself and its variance is exactly 0. Subtracting the mean gives 0, and dividing by sqrt(0 + eps) leaves 0. The example is erased.
- Second reason, just as real: with batch statistics at test time, the prediction for one user would depend on **which other users happened to be in the same batch**. Send the same request twice in different batches and get two different answers.
- In PyTorch the switch is one line, \`model.eval()\`, and \`model.train()\` switches back. **What breaks if you forget it:** the model keeps using batch statistics on your test data, so validation numbers change when you change the batch size, and single-request serving in production collapses. It fails quietly - no error, just wrong answers.

**The small-batch problem.** Running statistics only help at test time. During training, if your batch is 2 or 4 examples - common when the images are large and the GPU is full - then each mean and variance is estimated from 2 or 4 numbers. That estimate is mostly noise, and the noise is now damage rather than help. This is the situation where BatchNorm should be replaced.`,
    },
    {
      type: 'intuition',
      title: 'LayerNorm: turn the averaging 90 degrees',
      md: `**Layer normalisation**, written **LayerNorm**, uses exactly the same six steps. It changes only which numbers get grouped together.

- BatchNorm groups a **column**: one feature, across all the examples. LayerNorm groups a **row**: one example, across all its features. Per-example instead of per-batch.
- Nothing outside the example is ever consulted, so **batch size 1 behaves identically to batch size 256** - the small-batch problem simply does not exist.
- **Training and evaluation are the same computation.** No running statistics, no frozen numbers, nothing to switch on or off, no forgotten \`model.eval()\` for this layer.
- Variable-length inputs are fine. In a batch of sentences, position 40 might exist in 3 sentences and not in the other 29, so "the average over the batch at position 40" has no sensible answer. LayerNorm never asks the question, because each token normalises against its own features.
- Those three properties are why **transformers, and therefore every large language model, use LayerNorm** rather than BatchNorm. You will meet this again in the GenAI subject, where each transformer block is attention, then LayerNorm, then a small feed-forward network, then LayerNorm again.
- Gamma and beta are still there and still one pair per feature. Which axis you average over is a separate decision from whether the layer can rescale afterwards.

One consequence worth seeing in the output below: examples [2, 10, 1] and [4, 12, 3] normalise to *the same* three numbers. They differ only by a constant +2, and step 4 subtracts the mean, which removes exactly that. LayerNorm deliberately discards each example's overall level and overall spread; gamma and beta are how the network puts useful scale back.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'LayerNorm by row, then one example arriving alone',
      code: `gamma = [1.0, 2.0, 1.0]              # learned scale, one per feature
beta = [0.0, 5.0, 0.0]               # learned shift, one per feature

for i, row in enumerate(X):
    xhat = normalise(row)
    y = [gamma[j] * xhat[j] + beta[j] for j in range(3)]
    print('example', i, row, '-> LayerNorm', [round(a, 3) for a in xhat], '-> scale+shift', [round(a, 3) for a in y])

run_mean = [mean([r[j] for r in X]) for j in range(3)]
run_var = [variance([r[j] for r in X]) for j in range(3)]
lone = [2.0, 10.0, 1.0]              # ONE example arrives, with no batch
good = [(lone[j] - run_mean[j]) / math.sqrt(run_var[j] + 1e-5) for j in range(3)]
bad = [normalise([lone[j]])[0] for j in range(3)]
print('eval mode  ->', [round(a, 3) for a in good])
print('train mode ->', [round(a, 3) for a in bad])
print('LayerNorm  ->', [round(a, 3) for a in normalise(lone)])

# ---- real output ----
# example 0 [2.0, 10.0, 1.0] -> LayerNorm [-0.579, 1.407, -0.828] -> scale+shift [-0.579, 7.814, -0.828]
# example 1 [4.0, 12.0, 3.0] -> LayerNorm [-0.579, 1.407, -0.828] -> scale+shift [-0.579, 7.814, -0.828]
# example 2 [6.0, 14.0, 11.0] -> LayerNorm [-1.313, 1.111, 0.202] -> scale+shift [-1.313, 7.222, 0.202]
# example 3 [8.0, 16.0, 5.0] -> LayerNorm [-0.359, 1.364, -1.005] -> scale+shift [-0.359, 7.728, -1.005]
# eval mode  -> [-1.342, -1.342, -1.069]
# train mode -> [0.0, 0.0, 0.0]
# LayerNorm  -> [-0.579, 1.407, -0.828]`,
      annotations: {
        4: 'enumerate(X) hands back two things each time round: the position i (0, 1, 2, 3) and the row itself. Without it we would need a counter variable.',
        5: 'Normalise the ROW. Same function as before, different list handed to it - that single difference is BatchNorm versus LayerNorm.',
        6: 'Step 6 by hand: multiply by gamma, add beta, one feature at a time. Feature 1 has gamma 2 and beta 5, which is why its output is far from 0.',
        7: 'Print the raw row, the normalised row, and the rescaled row, so all three stages are visible on one line.',
        9: 'Collect what BatchNorm would have saved during training: the mean of each column. The inner comprehension pulls out column j and mean averages it; the outer one repeats that for all 3 features.',
        10: 'The matching variances. These 6 numbers are the running statistics, and after training they are frozen.',
        12: 'BatchNorm in evaluation mode: normalise the lone example using the frozen numbers from line 9 and 10. No batch is involved at all.',
        13: 'BatchNorm still in training mode, which is the bug. Each column now holds one number, so its variance is 0 and every result is 0. [0] takes the single value out of the one-item list normalise returns.',
        14: 'Prints [-1.342, -1.342, -1.069] - exactly what this example got when it was inside the batch. Evaluation mode is correct.',
        15: 'Prints [0.0, 0.0, 0.0]. The example has been erased. This is what a forgotten model.eval() does to a single-request prediction.',
        16: 'LayerNorm on the same lone example prints [-0.579, 1.407, -0.828], identical to its row in the batch above. No modes, no running statistics, nothing to forget.',
      },
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Which numbers get averaged: BatchNorm vs LayerNorm',
        notice: 'One batch: 4 examples, 3 features. Watch which cells feed each statistic - a column (across examples) or a row (inside one example). The last frames are the train-vs-evaluation question.',
        leftLabel: 'batch rows',
        rightLabel: 'statistics used',
        frames: [
          {
            note: 'The batch: 4 examples, 3 features each. Two ways to normalise this grid - down the columns, or across the rows.',
            stack: [
              { name: 'x1', value: '[ 2, 10,  1]' },
              { name: 'x2', value: '[ 4, 12,  3]' },
              { name: 'x3', value: '[ 6, 14, 11]' },
              { name: 'x4', value: '[ 8, 16,  5]' },
            ],
            heap: [{ id: 'grid', value: 'features f0 f1 f2', label: 'columns' }],
          },
          {
            note: 'BatchNorm, feature f0: gather that ONE column from ALL 4 examples. Four arrows, one mean and one variance. Each feature gets its own pair.',
            stack: [
              { name: 'x1', value: '[ 2, 10,  1]', to: 'c0' },
              { name: 'x2', value: '[ 4, 12,  3]', to: 'c0' },
              { name: 'x3', value: '[ 6, 14, 11]', to: 'c0' },
              { name: 'x4', value: '[ 8, 16,  5]', to: 'c0' },
            ],
            heap: [
              { id: 'c0', value: 'mu=5.00 sd=2.24', label: 'f0 column' },
              { id: 'c1', value: 'mu=13.0 sd=2.24', label: 'f1 column' },
              { id: 'c2', value: 'mu=5.00 sd=3.74', label: 'f2 column' },
            ],
          },
          {
            note: 'BatchNorm output. Every COLUMN now has mean 0 and spread 1. Gamma and beta then rescale each feature.',
            stack: [
              { name: 'x1', value: '[-1.3 -1.3 -1.1]' },
              { name: 'x2', value: '[-0.4 -0.4 -0.5]' },
              { name: 'x3', value: '[ 0.4  0.4  1.6]' },
              { name: 'x4', value: '[ 1.3  1.3  0.0]' },
            ],
            heap: [{ id: 'colz', value: 'col means all 0.0', label: 'per feature' }],
          },
          {
            note: 'LayerNorm, example x3: gather that ONE row across its 3 features. One arrow, one mean and one variance, no other example involved.',
            stack: [
              { name: 'x1', value: '[ 2, 10,  1]' },
              { name: 'x2', value: '[ 4, 12,  3]' },
              { name: 'x3', value: '[ 6, 14, 11]', to: 'r3' },
              { name: 'x4', value: '[ 8, 16,  5]' },
            ],
            heap: [{ id: 'r3', value: 'mu=10.33 sd=3.30', label: 'x3 alone' }],
          },
          {
            note: 'Test time, BatchNorm still in training mode. ONE example arrives and there is no column to average - its own variance is 0, so the example is erased to zeros.',
            stack: [{ name: 'x_test', value: '[ 2, 10,  1]', to: 'dead', danger: true }],
            heap: [{ id: 'dead', value: 'all zeros', label: 'no column' }],
          },
          {
            note: 'Evaluation mode. During training BatchNorm kept a running average of every batch mean and variance; now it uses those frozen numbers. Deterministic, and independent of batch size.',
            stack: [{ name: 'x_test', value: '[ 2, 10,  1]', to: 'run' }],
            heap: [
              { id: 'run', value: 'mu=5.00 sd=2.24', label: 'running avg' },
              { id: 'outc', value: '[-1.3 -1.3 -1.1]', label: 'correct' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Worked case: a 4-layer network, computed by hand',
      md: `A network with 4 hidden layers. Each layer has fan-in 256 and uses ReLU. Someone initialises every weight from a spread of 0.03 because "small weights are safer". Work out what happens before running anything.

1. **The per-layer multiplier.** The rule from earlier: the multiplier on the typical size is sqrt(fan-in x variance(weight) / 2), where the divide-by-2 is ReLU deleting half the values. Variance of the weights is 0.03 squared = 0.0009. So 256 x 0.0009 = 0.2304, divided by 2 is 0.1152, and sqrt(0.1152) = **0.3394**.
2. **Through 4 layers.** 0.3394 x 0.3394 = 0.1152. 0.1152 x 0.3394 = 0.0391. 0.0391 x 0.3394 = **0.01327**. An input of typical size 1 reaches the last layer at size 0.013.
3. **What the last layer sees.** Its inputs are around 0.013, so its output is around 0.013 too. The predictions barely move away from whatever the output bias is, and the loss sits flat.
4. **The correct scale.** He initialisation wants variance(weight) = 2 / 256 = 0.0078125, so the spread is sqrt(0.0078125) = **0.0884**. Check it: 256 x 0.0078125 = 2, divided by 2 is 1, sqrt(1) = **1.0**. The multiplier is exactly 1 and nothing shrinks.
5. **How far off was 0.03?** It is 0.0884 / 0.03 = about **3 times too small**, and that innocent-looking factor of 3 turned into a factor of 75 by layer 4 (1 / 0.01327). Depth is what makes small mistakes expensive.
6. **The alternative fix.** Insert a normalisation layer after each of the 4 layers. Layer 1 still emits numbers around 0.34, but the norm layer rescales them back to spread 1 before layer 2 sees them, so there is nothing left to compound. This is exactly why normalisation makes networks so much less sensitive to how you initialised them.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake, walked into on purpose',
      md: `An engineer trains an image classifier. The notebook reports **96%** accuracy on the validation set. The same model deployed behind an API, answering one request at a time, gets about **60%**. The code is identical, the weights are identical, the data is identical.

- The evaluation loop looks like this: load the validation set, run it through the model in batches of 64, count how many are right. There is no \`model.eval()\` call anywhere in it.
- So BatchNorm is still in training mode. In the notebook that is nearly harmless: batches of 64 give reasonable column statistics, close enough to the running ones, and accuracy looks fine.
- In production each request arrives alone. The batch is one row. Every column has variance 0, every normalised value becomes 0, and the layer hands the next layer a grid of zeros. The prediction is whatever the network outputs for an empty input - roughly a constant, which is why it lands near chance.
- **The 30-second confirmation.** Re-run the offline evaluation with batch size 1. If accuracy collapses to about 60%, the diagnosis is certain. As a second check, shuffle the validation set and re-run: if individual predictions change, the model is reading its batch-mates.
- **Why this hides so well.** Nothing errors. No warning is printed. The offline number is not merely optimistic, it is measuring a different computation than the one that will run in production.
- **The fix** is one line, \`model.eval()\`, before the evaluation loop. It swaps BatchNorm to running statistics and switches dropout off, which is a second, smaller reason the offline number was wrong.
- **The design-level fix**, if single-request serving is the product: use LayerNorm or GroupNorm, which have no separate evaluation behaviour to forget.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Pen, paper, and a calculator for square roots. Nothing here needs a computer.

1. A layer has fan-in 512 and uses ReLU. What spread should the starting weights be drawn from under He initialisation? Under Xavier?
2. A network has 10 layers and each one multiplies the typical size of the signal by 0.8. The input has typical size 1. What reaches layer 10? Now repeat with a multiplier of 1.25.
3. Normalise the vector [6, 2, 4] by hand: mean, variance, standard deviation, then the three normalised values. Then apply gamma = 3 and beta = -1 to all three.
4. A batch is [[1, 8], [3, 4], [5, 6]]: 3 examples, 2 features. Give the BatchNorm mean of each feature, and the LayerNorm mean of each example. State how many means each method produced.
5. A colleague says: "I set all my weights to 0.5 instead of 0, so symmetry is broken." Is that right? Explain in two sentences.`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `Follow every step, not just the last number.

1. He wants variance = 2 / 512 = 0.003906, so the spread is sqrt(0.003906) = **0.0625**. Xavier wants variance = 1 / 512 = 0.001953, spread sqrt(0.001953) = **0.0442**. He is larger by a factor of sqrt(2) = 1.414, which is the ReLU correction.
2. 0.8 to the tenth power: 0.8^2 = 0.64, ^4 = 0.4096, ^8 = 0.1678, and ^10 = 0.1678 x 0.64 = **0.1074**. The signal has lost about 90% of its size. With 1.25: 1.25^2 = 1.5625, ^4 = 2.4414, ^8 = 5.9605, ^10 = 5.9605 x 1.5625 = **9.3132**. Notice 0.8 and 1.25 are each other's opposites and the damage is symmetric.
3. Mean = (6 + 2 + 4) / 3 = **4**. Distances: 2, -2, 0. Squares: 4, 4, 0, summing to 8; variance = 8 / 3 = **2.6667**; standard deviation = sqrt(2.6667) = **1.6330**. Normalised: 2 / 1.6330 = **1.2247**, -2 / 1.6330 = **-1.2247**, 0 / 1.6330 = **0**. After gamma 3 and beta -1: 3 x 1.2247 - 1 = **2.6741**, 3 x -1.2247 - 1 = **-4.6741**, 3 x 0 - 1 = **-1**.
4. BatchNorm goes down the columns: feature 0 is [1, 3, 5] with mean **3**, feature 1 is [8, 4, 6] with mean **6**. That is **2 means**, one per feature. LayerNorm goes across the rows: [1, 8] gives **4.5**, [3, 4] gives **3.5**, [5, 6] gives **5.5**. That is **3 means**, one per example. The count follows the axis: BatchNorm gives one per feature, LayerNorm one per example.
5. **No.** Symmetry breaking is about the units being *different from each other*, not about the value being non-zero. If every weight is 0.5, all the units still compute the same output, still receive the same gradient, and still stay identical forever - exactly the all-zeros failure. What is needed is that the weights differ, which is why they are drawn randomly.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. This section only names things so the words are familiar later.

- **What BatchNorm buys beyond stability.** It lets you use a much larger step size safely, because a big update in one layer gets re-standardised before it disturbs the next. It also acts as a mild accidental regulariser: each example is normalised by statistics that depend on its random batch-mates, so it sees slightly different numbers every epoch. That is a side effect, not a strategy - it weakens as the batch grows and vanishes entirely at evaluation time.
- **GroupNorm.** Split a layer's features into a few groups and normalise inside each group, per example. Batch-independent like LayerNorm, and the standard replacement when the batch size is 2 or 4.
- **RMSNorm.** LayerNorm with step 4 removed: no mean subtraction, just divide by the root-mean-square. Slightly cheaper, no measured loss of quality, and now the default in most large language models.
- **Where the norm sits in a transformer block.** Putting LayerNorm before the sublayer (*pre-norm*) leaves an unnormalised path running straight from input to output, so gradients reach the early layers easily and very deep stacks train stably. Putting it after (*post-norm*, the original design) usually needs a slow warm-up of the step size to survive early training.
- **Residual connections.** A separate escape from the vanishing problem: add a layer's input to its output, giving the gradient a route with multiplier exactly 1 that skips the layer entirely. This is what made networks hundreds of layers deep possible, and it is covered in the CNN architectures module.
- **Gradient clipping.** If the gradient's overall length exceeds a chosen cap, shrink it back to the cap while keeping its direction. This is a fix for exploding gradients only - it does nothing for vanishing ones.`,
    },
  ],
  quiz: [
    {
      question: 'You initialise every weight in a hidden layer to 0. What is the precise failure?',
      options: [
        {
          text: 'The gradients are all zero, so nothing ever updates',
          explanation: 'The gradients are generally not zero - in the worked example they were -0.5 each. The failure is that they are identical across the units, not that they vanish.',
        },
        {
          text: 'All units in the layer compute the same output and receive the same gradient, so they stay identical forever',
          explanation: 'Correct. Same value plus same gradient means same value after the update, at every step. A 3-unit layer behaves like a 1-unit layer however wide you build it.',
        },
        {
          text: 'The loss becomes NaN on the first step',
          explanation: 'NaN is the exploding-signal symptom. Zero init fails silently: training runs normally and the loss just sits still.',
        },
      ],
      correct: 1,
    },
    {
      question: 'A layer has fan-in 200 and uses ReLU. What spread should the starting weights be drawn from?',
      options: [
        {
          text: 'sqrt(2/200) = 0.1, because ReLU deletes half the signal so the weight variance is doubled to 2/fan-in',
          explanation: 'Correct. That is He initialisation, and doubling the variance pays in advance for the half that ReLU throws away.',
        },
        {
          text: 'sqrt(1/200) = 0.0707, the general-purpose choice',
          explanation: 'That is Xavier, which is derived assuming the activation passes the signal through roughly unchanged. True for tanh, false for ReLU.',
        },
        {
          text: 'Anywhere in the range -1 to 1, since that is symmetric around zero',
          explanation: 'Being centred on zero is necessary but says nothing about the spread. With fan-in 200 that spread is far too large and the signal explodes with depth.',
        },
      ],
      correct: 0,
    },
    {
      question: 'A network multiplies the typical size of its signal by 0.9 at every layer. After 50 layers, what fraction of the original size remains?',
      options: [
        { text: 'About 0.45, because 50 layers each lose 10%', explanation: 'The losses multiply, they do not add. 50 x 10% is not how repeated multiplication works.' },
        { text: 'About 0.005, because 0.9 multiplied by itself 50 times is roughly 1/200', explanation: 'Correct, and this is the vanishing problem in one number. A per-layer multiplier of 0.9 looks harmless and is fatal at depth.' },
        { text: 'Exactly 0, because floating point rounds it away', explanation: '0.005 is comfortably representable. The signal is useless long before the arithmetic itself fails.' },
      ],
      correct: 1,
    },
    {
      question: 'At evaluation time, what statistics does BatchNorm use?',
      options: [
        { text: 'The statistics of the test batch it is currently given', explanation: 'That is the bug, not the design: a prediction would then depend on which other examples share the batch, and a single request has no batch at all.' },
        { text: 'The statistics of the last training batch it saw', explanation: 'One arbitrary batch would be a noisy, arbitrary estimate. BatchNorm accumulates across all of training instead.' },
        {
          text: 'A running average of the batch means and variances collected during training, then frozen',
          explanation: 'Correct. Frozen numbers, no batch needed, and the same answer every time for the same input. In PyTorch, model.eval() is what switches to them.',
        },
      ],
      correct: 2,
    },
    {
      question: 'A grid of 32 examples by 512 features leaves a layer. How many means does LayerNorm compute?',
      options: [
        { text: '32 - one per example, each averaging over that example\'s 512 features', explanation: 'Correct. LayerNorm groups a row, so each example gets exactly one mean and one variance, computed without looking at the other 31.' },
        { text: '512 - one per feature, each averaging over the 32 examples', explanation: 'That is BatchNorm. It groups a column instead, giving one statistic per feature.' },
        { text: '1 - a single mean over all 16,384 numbers', explanation: 'That would mix the examples together, which destroys the batch-independence that is the entire point of LayerNorm.' },
      ],
      correct: 0,
    },
    {
      question: 'Why do BatchNorm and LayerNorm both have learned gamma and beta?',
      options: [
        { text: 'To make the normalisation faster to compute', explanation: 'They add two operations per feature rather than removing any.' },
        { text: 'To keep the output between 0 and 1', explanation: 'Neither layer bounds its output. Normalised values regularly go past 1 in size, and gamma can stretch them further.' },
        {
          text: 'Because forcing mean 0 and spread 1 removes a freedom the layer may need, and gamma and beta let the network undo the normalisation when that is better',
          explanation: 'Correct. Setting gamma to the original standard deviation and beta to the original mean recovers the original numbers exactly, so the default is a suggestion the layer can overrule.',
        },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why can you not initialise all the weights of a neural network to zero?',
      answer:
        'Symmetry. With identical weights, every unit in a layer computes an identical output, and during backpropagation each of those units receives an identical gradient, because their inputs and their outgoing connections are identical too. Identical value plus identical gradient means identical value after the update, forever, so the layer behaves like a single unit no matter how wide it is. Two refinements interviewers probe for: any constant fails, not just zero, because the sameness is the problem rather than the value; and the biases can safely start at zero, because random weights have already made the units different, which is what PyTorch does by default.',
      isCaseBased: false,
    },
    {
      question: 'Derive Xavier initialisation, then explain how He differs and why.',
      answer:
        'A pre-activation is a sum of fan-in terms, each one a weight times an input. For independent, zero-centred weights and inputs, the variances add: Var(z) = fan-in x Var(w) x Var(x). To keep the output spread equal to the input spread across depth, you need Var(w) = 1/fan-in. That is Xavier. Its two-sided form, 2/(fan-in + fan-out), is a compromise: keeping the forward signal stable asks for 1/fan-in while keeping the backward gradient stable asks for 1/fan-out, so it splits the difference. He changes one assumption. ReLU replaces every negative pre-activation with 0, which roughly halves the variance of what comes out, and that halving compounds through depth. So you double the weight variance to pay for it in advance: Var(w) = 2/fan-in. Summary: Xavier for sigmoid and tanh, He for ReLU, and the 2 is the price of ReLU discarding half the signal.',
      isCaseBased: false,
    },
    {
      question: 'Explain exactly what BatchNorm does differently at training time and at evaluation time, and why the difference must exist.',
      answer:
        'At training time, for each feature it computes the mean and variance across the current batch, normalises with them, then applies the learned per-feature gamma and beta. At evaluation time it uses a running average of those means and variances, accumulated throughout training and then frozen. The difference is forced, not an optimisation. A single test example has no batch to compute statistics from: its column holds one number, so the variance is exactly zero and normalising erases the example to zeros. The second reason is just as decisive: if you used test-batch statistics, one user\'s prediction would depend on which other users happened to be batched with them, so serving would be non-deterministic and offline evaluation unreproducible. In PyTorch, model.eval() performs the switch and also disables dropout; forgetting it is the classic bug. Worth adding that this gap exists only because BatchNorm couples the examples in a batch - LayerNorm has no such gap because it never leaves the example.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague reports 96% validation accuracy in a notebook, but the deployed service gets about 60% on the same data, one request at a time. Where do you look first?',
      answer:
        'Prime suspect: model.eval() was never called, so BatchNorm is still using batch statistics. Offline, batches of 64 give reasonable column statistics and the number looks fine. In production every request arrives alone, so BatchNorm normalises a batch of one: the variance is zero, the example collapses to zeros, and the network outputs roughly a constant, which lands near chance. The confirmation takes thirty seconds: re-run the offline evaluation with batch size 1 and see whether accuracy drops to about 60%, then shuffle the validation set and check whether individual predictions change. Both moving confirms it. The same missing call leaves dropout active, which contributes a smaller additional drop. If eval() was in fact called, the next suspects are running statistics that never converged because training was too short, and a mismatch between the preprocessing used offline and the one used in the service. Fix order: eval() first, because it is one line and explains the full size of the gap. The design-level answer, if single-request serving is the product, is to use a normalisation that has no evaluation mode at all.',
      isCaseBased: true,
    },
    {
      question: 'What are vanishing and exploding signals, and what fixes each?',
      answer:
        'Both come from the same fact: passing a signal through many layers multiplies a per-layer factor by itself once per layer, and both backpropagation and the forward pass work that way. A factor slightly below 1 decays geometrically - 0.9 to the fiftieth power is about 0.005 - so the early layers receive nothing and never move: vanishing. A factor slightly above 1 blows up - 1.1 to the fiftieth is about 117 - and one update destroys the weights: exploding. The symptoms differ and matter. Vanishing shows as a loss stuck near its starting value and barely moving. Exploding shows as inf or NaN within a handful of steps. Fixes for vanishing: correct initialisation with He or Xavier, ReLU-family activations rather than sigmoid, normalisation layers, and above all residual connections, which give the gradient a path with factor exactly 1 around each block. Fixes for exploding: gradient clipping by norm, a smaller step size, and warm-up. Naming clipping as an exploding-only fix is worth doing explicitly.',
      isCaseBased: false,
    },
    {
      question: 'Case: an LSTM language model trains fine for 200 steps, then the loss becomes NaN. Give your debugging order.',
      answer:
        'NaN after healthy steps means numerical explosion, not a configuration error - a configuration error would fail at step 0. First, print the total gradient size at every step and look at the last few before the NaN; a jump from around 1 to around 10,000 confirms exploding gradients, which recurrent models are especially prone to because the same recurrent weight matrix is applied once per timestep, so its factor is raised to the sequence length. The fix is clipping the gradient norm at around 1.0. Second, check the step size and whether a scheduler just raised it; add a warm-up if so. Third, look for a data outlier at that position, such as an unusually long sequence or a corrupted row, and log the batch that caused it. Fourth, check for numerically illegal operations: a log of zero in a custom loss, a division by something that reached zero, a square root of a negative. Fifth, if training in half precision, confirm the gradient scaler is enabled. One tradeoff to name: clipping keeps training alive but hides a scale problem, so if you need a very tight clip threshold to survive, the initialisation or the step size is wrong and should be fixed at the source.',
      isCaseBased: false,
    },
    {
      question: 'Why do transformers use LayerNorm rather than BatchNorm?',
      answer:
        'Three reasons, each sufficient on its own. First, variable-length sequences: in a padded batch, position 40 exists in some sequences and not others, so a mean over the batch at that position has no well-defined denominator. LayerNorm normalises each token against its own features and never asks the question. Second, training and inference are the same computation: language models frequently run one sequence at a time and generate one token at a time, so a layer that needs a batch is a liability. LayerNorm has no running statistics and no evaluation mode to forget. Third, batch-size independence: large-model training uses small per-device batches with gradient accumulation, and BatchNorm statistics would be noisy and would need synchronising across devices. A useful footnote is that modern large language models have mostly moved one step further to RMSNorm, which drops the mean subtraction and is cheaper with no measured loss of quality.',
      isCaseBased: false,
    },
    {
      question: 'Case: you are training an object detector. Batch size is 2 per GPU because the images are large. Validation metrics are unstable across epochs and much worse than training. What is your hypothesis and your fix?',
      answer:
        'Hypothesis: BatchNorm with batch size 2 estimates each mean and variance from two examples, which is almost pure noise. Two consequences follow. The noise injected into every forward pass stops being a mild regulariser and becomes damage. And the running statistics, accumulated from those noisy batch estimates, are a poor description of what the network actually sees, so the frozen numbers used at evaluation do not match the training-time behaviour - which is exactly the unstable, much-worse validation gap described. Fixes, ranked. First, replace BatchNorm with GroupNorm: batch-independent, designed for this case, and identical at training and evaluation. Second, use SyncBatchNorm to pool statistics across GPUs, restoring an effective batch of 2 times the number of GPUs at the cost of a synchronisation per layer. Third, if fine-tuning from a pretrained backbone, freeze the BatchNorm layers and keep the pretrained running statistics, which is standard practice in detection codebases. Fourth, note that gradient accumulation does not help at all, because it does not change the batch that each BatchNorm layer actually sees. That last point is the one that shows you understand the mechanism rather than the recipe.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Why not initialise all weights to zero?', back: 'Symmetry: every unit computes the same output and receives the same gradient, so they stay identical forever. Any constant fails, not just 0, because the sameness is the problem. Biases can be zero - random weights already break the symmetry.' },
    { front: 'The goal of initialisation', back: 'Choose the starting weights so each layer multiplies the typical size of the signal by about 1. Too small and it fades through depth (0.9 to the 50th is 0.005); too large and it explodes (1.1 to the 50th is 117).' },
    { front: 'Xavier / Glorot', back: 'Var(w) = 1/fan-in, or the two-sided 2/(fan-in + fan-out). For sigmoid and tanh, which pass the signal roughly unchanged near zero. Fan-in is the number of inputs into one unit.' },
    { front: 'He / Kaiming and the factor 2', back: 'Var(w) = 2/fan-in, for ReLU. ReLU turns every negative value into 0, roughly halving the variance, so you double the weight variance to pay for it in advance. With fan-in 100 the spread is sqrt(0.02) = 0.1414.' },
    { front: 'The six steps of any normalisation layer', back: 'Mean, distances from the mean, variance, subtract the mean, divide by the standard deviation, then multiply by learned gamma and add learned beta. Only the choice of which numbers get grouped together changes between BatchNorm and LayerNorm.' },
    { front: 'Why gamma and beta exist', back: 'Forcing mean 0 and spread 1 removes a freedom the layer may need. Setting gamma to the original standard deviation and beta to the original mean recovers the original numbers exactly, so the layer keeps its right to be un-normalised.' },
    { front: 'BatchNorm: axis, and train versus evaluation', back: 'Statistics down each column: one feature, across the batch. Training uses the current batch. Evaluation uses a frozen running average, because a lone test example has variance 0 and would be erased, and because predictions must not depend on batch-mates. model.eval() is the switch. Batches of 2 to 4 make the statistics pure noise.' },
    { front: 'LayerNorm: axis, and why transformers use it', back: 'Statistics across each row: one example, across its features. Batch-size independent, identical at training and evaluation with no running statistics, and fine with variable-length sequences - exactly what transformers and language models need.' },
  ],
  mindmapMarkdown: `- Weight Init, BatchNorm vs LayerNorm
  - The failure
    - 6 layers, scale 0.05 -> 0.0034 (vanished)
    - 6 layers, scale 0.30 -> 127.8 (exploded)
    - Per-layer multiplier raised to the depth
    - Goal: multiplier about 1
  - Initialisation
    - Var(z) = fan-in x Var(w) x Var(x)
    - Xavier 1/fan-in: sigmoid, tanh
    - He 2/fan-in: ReLU (2 = ReLU deletes half)
    - Symmetry breaking: all-same weights never differ
    - Biases may start at 0
  - Normalisation, six steps
    - mean, variance, subtract, divide
    - learned gamma (scale), beta (shift)
    - eps guards divide-by-zero
  - BatchNorm
    - Statistics down the column, per feature
    - Train: current batch. Eval: frozen running average
    - One example alone has variance 0 -> erased
    - Bug: forgot model.eval()
    - Small batches: statistics are noise
  - LayerNorm
    - Statistics across the row, per example
    - Train == eval, batch size 1 is fine
    - Variable-length sequences work
    - Why transformers and LLMs use it
  - Beyond the basics
    - GroupNorm for small batches
    - RMSNorm: no mean subtraction
    - Pre-norm vs post-norm
    - Residual connections, gradient clipping`,
}

export default m
