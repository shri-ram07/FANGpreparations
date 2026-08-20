import type { Module } from '../types'

const m: Module = {
  id: 'dl-l0-perceptron-mlp',
  subjectId: 'dl',
  level: 0,
  title: 'From Perceptron to MLP: Why We Need Non-Linearity',
  whyItMatters:
    'This is the first Deep Learning module, and it builds the whole machine from one neuron. A neuron is three numbers multiplied by three other numbers, added up, plus one more number, then squashed. That is it. Once you have computed one by hand you can read any network diagram, count the parameters in any architecture, and say exactly why a hidden layer is needed instead of repeating that it "adds capacity". Everything later in this subject is this same arithmetic, repeated more times.',
  assumes: [
    'You have read *Vectors & the Dot Product (= Similarity)* in Math for ML. A neuron is a dot product plus one extra number, and this module leans on that.',
    'You have read *Matrices as Transformations*, so a grid of numbers acting on a list of numbers is familiar.',
    'You have read *Gradient Descent + Linear Regression* — you know that a model has adjustable numbers and that training means nudging them.',
    'You have read *Logistic Regression: Sigmoid, Cross-Entropy & Decision Boundaries* — you have met the sigmoid squashing function and the idea of a straight-line decision boundary.',
    'You can read a Python for loop, a list, and a function definition. No numpy is used anywhere in this module, on purpose.',
  ],
  estMinutes: 44,
  sections: [
    {
      type: 'intuition',
      title: 'One neuron, computed by hand',
      md: `A loan desk looks at three facts about an applicant and outputs one number: how likely they are to repay.

- The three facts are the **inputs**. Say they are: years in the current job = **1.0**, number of missed payments = **0.0**, monthly income in lakhs = **3.0**. Write them as a list: x = [1.0, 0.0, 3.0].
- The desk cares about each fact by a different amount. Those amounts are the **weights**: w = [0.5, -1.5, 0.25]. Missed payments has a negative weight because more missed payments should push the answer down.
- Multiply each input by its own weight and add the three results: 0.5 x 1.0 = 0.5, then -1.5 x 0.0 = 0.0, then 0.25 x 3.0 = 0.75. Sum = **1.25**.
- Now add one more number that has no input attached to it, called the **bias**: b = -0.7. So 1.25 + (-0.7) = **0.55**. That single number is traditionally called **z**.
- Finally squash z into the range 0 to 1 with the sigmoid you met in the Logistic Regression module: 1 / (1 + e^(-0.55)) = **0.6341**.

That whole paragraph is one **neuron**. Multiply, add, add the bias, squash. There is nothing else inside it.`,
    },
    {
      type: 'intuition',
      title: 'You have already done this — it is the dot product',
      md: `The step "multiply each input by its own weight and add up the results" is exactly the **dot product** from *Vectors & the Dot Product (= Similarity)*. Same operation, same arithmetic, different vocabulary.

- There, you wrote it as w . x and read it as "how much do these two lists of numbers agree".
- Here, w is a fixed pattern the neuron has learned, and x is the input. The dot product is large when the input looks like the pattern and small when it does not.
- A neuron is therefore: **dot product, then add the bias, then squash**. Two of those three steps you already know.
- The bias is the only genuinely new piece, and it is one number. It shifts the whole result up or down regardless of the input, which is what lets the decision boundary sit somewhere other than through the origin.
- Because it has no input to multiply, a bias is sometimes drawn as a weight attached to a fake input that is always 1. Same thing, written differently.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The neuron above, in plain Python',
      code: `import math

x = [1.0, 0.0, 3.0]
w = [0.5, -1.5, 0.25]
b = -0.7
z = 0.0
for i in range(3):
    z = z + w[i] * x[i]
print('weighted sum:', z)
z = z + b
print('z (with bias):', z)
a = 1 / (1 + math.exp(-z))
print('activation:', round(a, 4))

# ---- real output ----
# weighted sum: 1.25
# z (with bias): 0.55
# activation: 0.6341`,
      annotations: {
        1: 'math is Python\'s built-in maths module. We need exactly one thing from it, math.exp, which computes e raised to a power.',
        3: 'The three input numbers, as a plain list. Position 0 is years in job, position 1 is missed payments, position 2 is income.',
        4: 'The three weights, in the same order as the inputs, so w[0] belongs to x[0]. Getting these two lists out of order is a real bug and the reason the ordering is worth saying out loud.',
        5: 'The bias: one number, not a list, and not attached to any input.',
        6: 'A running total, starting at zero. Written 0.0 rather than 0 to make it obvious it will hold decimals.',
        7: 'range(3) produces 0, 1, 2 — the three positions in both lists. i is the position we are on.',
        8: 'Multiply the input at position i by the weight at position i and add it to the total. Three passes through this line is the entire dot product.',
        9: 'Prints 1.25, matching the hand arithmetic 0.5 + 0.0 + 0.75.',
        10: 'Add the bias once, after the loop — not inside it. Adding it inside would add it three times.',
        11: 'Prints 0.55. This is z, the neuron\'s raw score before squashing.',
        12: 'The sigmoid: 1 divided by (1 plus e to the minus z). math.exp(-z) is e raised to -0.55. The result is always strictly between 0 and 1.',
        13: 'Prints 0.6341. round(a, 4) cuts the float to 4 decimal places so the output is readable.',
      },
    },
    {
      type: 'math',
      intro: 'The same neuron in symbols. Read the first line as "the dot product of w and x, plus b".',
      latex: [
        'z \\;=\\; \\mathbf{w} \\cdot \\mathbf{x} + b \\;=\\; \\sum_{i=1}^{n} w_i x_i + b',
        'z \\;=\\; (0.5)(1.0) + (-1.5)(0.0) + (0.25)(3.0) + (-0.7) \\;=\\; 1.25 - 0.7 \\;=\\; 0.55',
        'a \\;=\\; \\sigma(z) \\;=\\; \\frac{1}{1 + e^{-z}} \\;=\\; \\frac{1}{1 + e^{-0.55}} \\;=\\; 0.6341',
      ],
    },
    {
      type: 'intuition',
      title: 'The words, defined once, in the order you meet them',
      md: `Every term below is used for the rest of this subject. Nothing here is more complicated than the arithmetic you just did.

- **Neuron** (also called a **unit**) — one dot product, plus a bias, then a squashing function. One neuron produces exactly one output number.
- **Weight** — one adjustable number sitting on one connection. A neuron reading 3 inputs has 3 weights.
- **Bias** — one adjustable number per neuron, with no input attached. It shifts that neuron\'s output up or down.
- **Activation function** — the squashing function applied to z. Sigmoid is one. The other one used in this module is **ReLU**, which is even simpler: keep the number if it is positive, otherwise output 0.
- **Activation** — confusingly, also the name for the *output* of a neuron after squashing. The 0.6341 above is an activation.
- **Parameter** — any number the model learns. That means every weight and every bias, and nothing else. Inputs are not parameters; they come from your data.`,
    },
    {
      type: 'intuition',
      title: 'Layers: many neurons reading the same inputs',
      md: `Put four neurons side by side, each with its own 3 weights and its own bias, and feed all four the same three inputs. That group is a **layer**, and it turns 3 numbers into 4 numbers.

- **Input layer** — just the raw numbers entering the network. It has no weights and does no arithmetic; it is a name for where the data goes in.
- **Hidden layer** — any layer whose outputs you never look at directly. They are inputs to the next layer and nothing else. "Hidden" means hidden from you, not mysterious.
- **Output layer** — the last layer. Its outputs are the answer: one number for a single prediction, or one number per class when choosing between classes.
- **Width** — how many neurons are in a layer. The layer above has width 4.
- **Depth** — how many layers have weights. The input layer has none, so it is not counted: a 3-4-2 network is a **2-layer** network with **one hidden layer**.
- **Fully connected** (also called **dense**) — every neuron in the layer reads every output of the layer before it. No connections are missing. That is the only kind of layer in this module.
- **Forward pass** — running data through the network from input to output, one layer at a time, doing exactly the arithmetic above. No learning happens during a forward pass; it just computes.`,
    },
    {
      type: 'intuition',
      title: 'XOR: four points that one neuron cannot handle',
      md: `Here is the smallest problem that breaks a single neuron. Two inputs, each 0 or 1. The answer is 1 when the two inputs **differ** and 0 when they match. Four points, and that is the entire dataset.

- (0, 0) gives 0. (0, 1) gives 1. (1, 0) gives 1. (1, 1) gives 0.
- Draw them on a square. The two 1s sit at opposite corners: bottom-right and top-left. The two 0s sit at the *other* pair of opposite corners: bottom-left and top-right.
- A single neuron ends in a threshold: output 1 when z is at or above 0, else 0. Since z = w1x1 + w2x2 + b, the boundary z = 0 is a **straight line**. One neuron draws exactly one straight line and answers 1 on one side, 0 on the other.
- Now the argument. Draw the segment joining the two 1s. Its midpoint is (0.5, 0.5). Draw the segment joining the two 0s. Its midpoint is *also* (0.5, 0.5) — the diagonals of a square cross in the centre.
- A straight line cuts the plane into two sides, and each side is **convex**: if two points are on one side, every point on the segment between them is on that side too.
- So a line with both 1s on its "1" side must have (0.5, 0.5) on that side. The same line with both 0s on its "0" side must have (0.5, 0.5) on *that* side. One point cannot be on both sides. **No such line exists.**

AND and OR are fine — each needs one line. XOR is the smallest function that a single neuron cannot compute, at any weights whatsoever.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'XOR part 1: four hand-picked lines, none of them right',
      code: `def neuron(x1, x2, w1, w2, b):
    z = w1 * x1 + w2 * x2 + b
    return 1 if z >= 0 else 0

xor = [(0, 0, 0), (0, 1, 1), (1, 0, 1), (1, 1, 0)]
for w1, w2, b in [(1, 1, -0.5), (1, 1, -1.5), (-1, -1, 0.5), (1, -1, 0.0)]:
    right = 0
    for x1, x2, y in xor:
        if neuron(x1, x2, w1, w2, b) == y:
            right = right + 1
    print('w =', (w1, w2), 'b =', b, '-> correct on', right, 'of 4')

# ---- real output ----
# w = (1, 1) b = -0.5 -> correct on 3 of 4
# w = (1, 1) b = -1.5 -> correct on 1 of 4
# w = (-1, -1) b = 0.5 -> correct on 1 of 4
# w = (1, -1) b = 0.0 -> correct on 1 of 4`,
      annotations: {
        1: 'One neuron with two inputs, written as a function so we can call it with different weights. x1 and x2 are the inputs; w1, w2 and b are the neuron\'s parameters.',
        2: 'The dot product of (w1, w2) with (x1, x2), plus the bias. Two terms instead of three, same operation as before.',
        3: 'The threshold: output 1 if z is at least 0, else 0. "1 if condition else 0" is Python\'s conditional expression — the whole thing becomes 1 when the test passes and 0 when it does not.',
        5: 'The complete XOR dataset. Each item is a tuple of three numbers: input 1, input 2, correct answer.',
        6: 'Four candidate lines to try. "for w1, w2, b in ..." is tuple unpacking: each item in the list is a group of three numbers, and Python drops them into w1, w2 and b automatically.',
        7: 'A counter for how many of the four points this line gets right.',
        8: 'Walk the four data points. Unpacking again: x1, x2 and y come out of each tuple.',
        9: 'Run the neuron on this point and compare its output to the correct answer y.',
        10: 'Count the hit.',
        11: 'Print the line and its score. The first row is OR (3 of 4 — it gets everything except (1,1)), the second is AND, the third is NOR, the fourth is a diagonal. None reaches 4.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'XOR part 2: try 1,377 lines instead of 4',
      code: `# neuron() and xor from part 1 are reused here.
best = 0
tried = 0
for w1 in range(-4, 5):
    for w2 in range(-4, 5):
        for b_half in range(-8, 9):
            right = 0
            for x1, x2, y in xor:
                if neuron(x1, x2, w1, w2, b_half / 2) == y:
                    right = right + 1
            tried = tried + 1
            if right > best:
                best = right
print('lines tried:', tried, '- best score any of them reached:', best, 'of 4')

# ---- real output ----
# lines tried: 1377 - best score any of them reached: 3 of 4`,
      annotations: {
        2: 'The best score seen so far, starting at 0.',
        3: 'How many different lines we have tested, so the printed claim is checkable.',
        4: 'Try every whole-number weight for input 1 from -4 to 4. range(-4, 5) stops before 5, so it gives -4, -3, ..., 4 — nine values.',
        5: 'The same nine values for the second weight. Nesting the loops means every combination of w1 and w2 gets tried.',
        6: 'Seventeen bias values. We loop over whole numbers and halve them below, so the biases are -4.0, -3.5, ..., 4.0.',
        7: 'Reset the per-line score counter for this particular line.',
        8: 'Score this line on all four XOR points, exactly as in part 1.',
        9: 'b_half / 2 turns the whole number into the half-step bias. Everything else is identical to part 1.',
        10: 'Count a correct point.',
        11: 'Count this line as tried. 9 x 9 x 17 = 1377 lines.',
        12: 'If this line beat the record, remember the new record.',
        13: 'Store it.',
        14: 'The result is 3, never 4. This is not a proof by itself — it is 1,377 confirmations of the midpoint argument above, which is the proof.',
      },
    },
    {
      type: 'intuition',
      title: 'The fix: two neurons first, then one more on top of them',
      md: `Since no single line works, use two. Each line is a neuron, and both are easy ones we already saw scoring well on their own.

- Hidden neuron 1 computes **OR**: weights (1, 1), bias -0.5. It outputs 1 unless both inputs are 0.
- Hidden neuron 2 computes **AND**: weights (1, 1), bias -1.5. It outputs 1 only when both inputs are 1.
- Feed the two hidden outputs into a third neuron with weights (1, -1) and bias -0.5. In words: "output 1 when OR fired and AND did not".
- Check (1, 1) by hand: h1 = step(1 + 1 - 0.5) = step(1.5) = 1. h2 = step(1 + 1 - 1.5) = step(0.5) = 1. Output = step(1 - 1 - 0.5) = step(-0.5) = **0**. Correct — the inputs match, so XOR is 0.
- Check (0, 1): h1 = step(0 + 1 - 0.5) = step(0.5) = 1. h2 = step(0 + 1 - 1.5) = step(-0.5) = 0. Output = step(1 - 0 - 0.5) = step(0.5) = **1**. Correct.

That is a hidden layer of width 2, and it is the whole solution.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The 2-2-1 network solving XOR, all four inputs',
      code: `def step(z):
    return 1 if z >= 0 else 0

for x1, x2 in [(0, 0), (0, 1), (1, 0), (1, 1)]:
    h1 = step(1 * x1 + 1 * x2 - 0.5)
    h2 = step(1 * x1 + 1 * x2 - 1.5)
    y = step(1 * h1 + (-1) * h2 - 0.5)
    print('x =', (x1, x2), 'h1 =', h1, 'h2 =', h2, '-> y =', y)

# ---- real output ----
# x = (0, 0) h1 = 0 h2 = 0 -> y = 0
# x = (0, 1) h1 = 1 h2 = 0 -> y = 1
# x = (1, 0) h1 = 1 h2 = 0 -> y = 1
# x = (1, 1) h1 = 1 h2 = 1 -> y = 0`,
      annotations: {
        1: 'The threshold activation on its own, so the three neurons below read cleanly.',
        2: 'Output 1 when z is at least 0, otherwise 0. Same rule as part 1.',
        4: 'Walk the four possible inputs. There is no dataset to load — XOR has exactly four cases.',
        5: 'Hidden neuron 1: weights 1 and 1, bias -0.5. This is OR.',
        6: 'Hidden neuron 2: the same weights, a different bias. That single change turns OR into AND — the bias is what moves the line.',
        7: 'The output neuron. Its inputs are h1 and h2, not x1 and x2. This is the point of the whole module: the second layer works on features the first layer built.',
        8: 'Print the input, both hidden values, and the answer. Compare the y column to 0, 1, 1, 0 — all four correct, which no single line managed.',
      },
    },
    {
      type: 'intuition',
      title: 'Why that worked, said plainly',
      md: `Look at the h1 and h2 columns in the output. The hidden layer rewrote the four points into new coordinates.

- Original points: (0,0), (0,1), (1,0), (1,1). New points, as (h1, h2): (0,0), (1,0), (1,0), (1,1).
- The two inputs that should answer 1 both landed on the same new point, (1, 0). The two that should answer 0 landed on (0, 0) and (1, 1).
- In these new coordinates the answer-1 group and the answer-0 group **can** be split by one straight line, and h1 - h2 = 0.5 is such a line.
- That is what a hidden layer does: it moves the data into a new set of coordinates where a straight line is enough. It does not draw a curved boundary; it straightens the problem out first.
- The activation function is essential to this. If step were removed, h1 and h2 would just be two straight-line combinations of x1 and x2, and the output neuron would be a straight-line combination of those — still one straight line overall. The next-to-last section shows that collapse numerically.`,
    },
    {
      type: 'intuition',
      title: 'Counting parameters by hand',
      md: `Take a 3-4-2 network: 3 inputs, one hidden layer of 4 neurons, an output layer of 2 neurons. Count every learnable number in it.

- **First layer, 3 into 4.** Each of the 4 hidden neurons reads all 3 inputs, so it has 3 weights. 4 neurons x 3 weights = **12 weights**. Each hidden neuron also has one bias, so **4 biases**. Layer total: 16.
- **Second layer, 4 into 2.** Each of the 2 output neurons reads all 4 hidden outputs, so it has 4 weights. 2 x 4 = **8 weights**, plus **2 biases**. Layer total: 10.
- **Whole network: 16 + 10 = 26 parameters.** That is 26 numbers that training will adjust, and nothing else in the network changes.
- The rule, from that counting: a dense layer taking **n** inputs to **m** outputs has **n x m weights and m biases**.
- The bias count is m, not n. One bias per *output* neuron. This is the half people get wrong, and the counting above is why: biases belong to the neurons doing the receiving.
- Now the number that used to look like magic. A layer from 784 pixels to 128 hidden neurons has 784 x 128 = **100,352 weights** plus 128 biases = 100,480 parameters. Nothing new happened — it is the same 4 x 3 counting, with bigger numbers.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same count, done by a loop',
      code: `sizes = [3, 4, 2]
total = 0
for i in range(len(sizes) - 1):
    n = sizes[i]
    m = sizes[i + 1]
    weights = n * m
    biases = m
    total = total + weights + biases
    print('layer', n, '->', m, ':', weights, 'weights +', biases, 'biases =', weights + biases)
print('total parameters:', total)

# ---- real output ----
# layer 3 -> 4 : 12 weights + 4 biases = 16
# layer 4 -> 2 : 8 weights + 2 biases = 10
# total parameters: 26`,
      annotations: {
        1: 'The network shape as a list: 3 inputs, then a hidden layer of 4, then an output layer of 2.',
        2: 'A running total of parameters across all layers.',
        3: 'There are 3 numbers in sizes but only 2 layers with weights — a layer sits between each neighbouring pair. len(sizes) - 1 = 2, so i takes the values 0 and 1.',
        4: 'n is how many numbers come into this layer.',
        5: 'm is how many come out, which is the number of neurons in this layer.',
        6: 'The counting rule: every one of the m neurons has n weights.',
        7: 'One bias per neuron, so m of them. Written on its own line so the rule is impossible to misread.',
        8: 'Add this layer\'s parameters to the running total.',
        9: 'Print the arithmetic for this layer so you can check it against the hand count.',
        10: 'Prints 26. Change sizes to [784, 128, 10] and this same loop prints 101,770.',
      },
    },
    {
      type: 'math',
      intro: 'The counting rule, and the same rule applied to a network that classifies 28x28 images.',
      latex: [
        '\\text{dense layer } n \\to m: \\quad \\underbrace{n \\cdot m}_{\\text{weights}} \\;+\\; \\underbrace{m}_{\\text{biases}}',
        '3 \\to 4 \\to 2: \\;\\; (3 {\\cdot} 4 + 4) + (4 {\\cdot} 2 + 2) \\;=\\; 16 + 10 \\;=\\; 26',
        '784 \\to 128 \\to 10: \\;\\; (784 {\\cdot} 128 + 128) + (128 {\\cdot} 10 + 10) \\;=\\; 100{,}480 + 1{,}290 \\;=\\; 101{,}770',
      ],
    },
    {
      type: 'intuition',
      title: 'A network is a stack of three steps, repeated',
      md: `Here is the whole of a feed-forward neural network, with nothing left out.

1. Multiply the incoming numbers by a grid of weights (that is one dot product per neuron).
2. Add one bias per neuron.
3. Apply an activation function to each result.

Then hand the outputs to the next layer and do steps 1, 2, 3 again. Repeat until you reach the output layer. That sequence is the **forward pass**, and it is all that happens when a trained network makes a prediction.

- A grid of weights with n rows and m columns is a **matrix**, and step 1 is exactly the matrix action you saw in *Matrices as Transformations*: a list of n numbers goes in, a list of m numbers comes out.
- Real code writes steps 1 and 2 as one line, because a library does the whole grid at once. The loop below does the same arithmetic one neuron at a time so you can see every multiplication.
- The activation in step 3 is applied to each number separately. It never mixes neurons together.
- That is the entire architecture. What makes a big network big is repeating this more times with larger grids — not a different mechanism.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Forward pass part 1: one dense layer',
      code: `def dense(inputs, weights, biases):
    outputs = []
    for j in range(len(biases)):
        z = biases[j]
        for i in range(len(inputs)):
            z = z + weights[i][j] * inputs[i]
        outputs.append(round(z, 4))
    return outputs

W1 = [[0.5, -0.2, 0.1, 0.9],
      [-1.5, 0.4, 0.3, -0.6],
      [0.25, 0.7, -0.8, 0.2]]
b1 = [-0.7, 0.1, 0.0, 0.5]
print(dense([1.0, 0.0, 3.0], W1, b1))

# ---- real output ----
# [0.55, 2.0, -2.3, 2.0]`,
      annotations: {
        1: 'One dense layer. inputs is the list coming in, weights is the grid, biases has one entry per neuron in this layer.',
        2: 'An empty list that will collect one output number per neuron.',
        3: 'Loop over the neurons. There is one bias per neuron, so len(biases) is the number of neurons — 4 here. j is which neuron we are computing.',
        4: 'Start this neuron\'s total at its own bias, then add the weighted inputs on top. Same as the very first snippet, where we added b at the end — order does not matter for a sum.',
        5: 'Loop over the incoming numbers. i is which input we are on.',
        6: 'weights[i][j] is the weight connecting input i to neuron j. Row = which input, column = which neuron. Getting these two backwards is the most common bug when writing a layer from scratch.',
        7: 'Store this neuron\'s finished value. append adds one item to the end of a list. round(z, 4) only tidies the printout.',
        8: 'Hand back the list of outputs — 4 numbers came out of 3 numbers.',
        10: 'Row 0 holds the weights leaving input 0, one for each of the 4 neurons. Read down a column to see one neuron\'s weights.',
        11: 'Row 1: the weights leaving input 1.',
        12: 'Row 2: the weights leaving input 2. Three rows and four columns = 12 weights, matching the hand count.',
        13: 'The 4 biases, one per neuron.',
        14: 'Run it on the same input as the very first snippet. Look at the first output: 0.55 — that is the exact neuron computed by hand at the top of this module, and its weights are the first column of W1 read downward, 0.5, -1.5, 0.25.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Forward pass part 2: two layers with an activation between them',
      code: `# dense() from part 1 is reused here.
def relu(values):
    return [v if v > 0 else 0.0 for v in values]

W2 = [[1.0, -0.5], [0.2, 0.8], [-0.3, 0.6], [0.7, 0.1]]
b2 = [0.05, -0.15]
x = [1.0, 0.0, 3.0]
z1 = dense(x, W1, b1)
h = relu(z1)
z2 = dense(h, W2, b2)
print('layer 1 (z) ', z1)
print('after ReLU  ', h)
print('output      ', z2)

# ---- real output ----
# layer 1 (z)  [0.55, 2.0, -2.3, 2.0]
# after ReLU   [0.55, 2.0, 0.0, 2.0]
# output       [2.4, 1.375]`,
      annotations: {
        2: 'ReLU applied to a whole list. ReLU is: keep the number if it is positive, otherwise give back 0.',
        3: 'This is a list comprehension — Python\'s short way to write "build a new list by doing something to every item of an old one". Read it as: for each v in values, put v in the new list if v is greater than 0, otherwise put 0.0.',
        5: 'The second layer\'s weight grid: 4 rows (one per hidden neuron) and 2 columns (one per output neuron) = 8 weights, matching the hand count.',
        6: 'Two biases, one per output neuron. 8 + 2 + 12 + 4 = 26 parameters in total.',
        7: 'The same three inputs as the very first snippet.',
        8: 'Step 1 and 2 of the forward pass for layer 1: multiply and add biases. z1 is a list of 4 raw scores.',
        9: 'Step 3: the activation. Notice -2.3 becomes 0.0 — that neuron contributes nothing to this particular prediction.',
        10: 'Layer 2 takes the activated hidden values, not the raw z1. Feeding z1 here instead would delete the non-linearity and is a genuine, silent bug.',
        11: 'The raw scores before the activation.',
        12: 'The same numbers after ReLU. Exactly one of the four changed.',
        13: 'The two output numbers. No activation was applied to the output layer here, which is the right choice when the answer is an unbounded number.',
      },
    },
    { type: 'visual', component: 'NeuralNetForward', props: {} },
    {
      type: 'note',
      md: 'Step through the stages in that diagram and watch the numbers appear layer by layer — it is doing exactly what the dense() loop above does. Then drag any edge to change one weight, and notice that every value downstream of that edge moves. How much the final output moves when you nudge one weight is precisely the quantity the next module computes, so it is worth playing with now.',
    },
    {
      type: 'intuition',
      title: 'Worked case: a full 3-4-2 forward pass, by hand',
      md: `Same network as the code above (W1, b1, W2, b2), a different input: x = [2.0, 1.0, 0.0]. Do every multiplication yourself before reading the totals.

- **Hidden neuron 1.** Its weights are the first column of W1 read downward: 0.5, -1.5, 0.25. So z = -0.7 + 0.5(2.0) + (-1.5)(1.0) + 0.25(0.0) = -0.7 + 1.0 - 1.5 = **-1.2**.
- **Hidden neuron 2.** Weights -0.2, 0.4, 0.7, bias 0.1. z = 0.1 - 0.4 + 0.4 + 0.0 = **0.1**.
- **Hidden neuron 3.** Weights 0.1, 0.3, -0.8, bias 0.0. z = 0.0 + 0.2 + 0.3 + 0.0 = **0.5**.
- **Hidden neuron 4.** Weights 0.9, -0.6, 0.2, bias 0.5. z = 0.5 + 1.8 - 0.6 + 0.0 = **1.7**.
- **Apply ReLU** to [-1.2, 0.1, 0.5, 1.7]. Only the first is negative, so h = [**0.0**, 0.1, 0.5, 1.7]. Hidden neuron 1 is switched off for this input.
- **Output neuron 1.** Weights 1.0, 0.2, -0.3, 0.7, bias 0.05. z = 0.05 + 0 + 0.02 - 0.15 + 1.19 = **1.11**.
- **Output neuron 2.** Weights -0.5, 0.8, 0.6, 0.1, bias -0.15. z = -0.15 + 0 + 0.08 + 0.30 + 0.17 = **0.40**.

The answer is [1.11, 0.40]. Running the code from part 2 with x = [2.0, 1.0, 0.0] prints exactly [1.11, 0.4]. Twenty-six parameters, twenty multiplications, one prediction — and a network with a hundred million parameters differs only in how many times you repeat that.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: stacking layers with no activation',
      md: `Here is the reasoning that traps almost everybody the first time. "One layer draws one line. So more layers must draw more lines. Let me just stack them."

- Take a 2-2-1 network with no activation function anywhere. Hidden neuron 1: h1 = 2x1 - x2 + 0.5. Hidden neuron 2: h2 = 3x2 - 1.0. Output: y = h1 + 4h2 - 0.2.
- Substitute h1 and h2 into y: y = (2x1 - x2 + 0.5) + 4(3x2 - 1.0) - 0.2.
- Expand: y = 2x1 - x2 + 0.5 + 12x2 - 4.0 - 0.2 = **2x1 + 11x2 - 3.7**.
- Read that last line. It is a single neuron with weights (2, 11) and bias -3.7. The two layers, seven parameters between them, compute exactly what three parameters compute.
- This is not an approximation and it does not depend on the numbers. Multiplying and adding, then multiplying and adding again, is still just multiplying and adding. Fifty stacked layers with no activations are still one straight line.
- So a 50-layer network with no activations has millions of parameters and exactly the power of the single neuron that failed XOR. Run it below and see the two functions agree to the last decimal.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The mistake, shown numerically: two layers = one layer',
      code: `def two_layers(x1, x2):
    h1 = 2 * x1 - 1 * x2 + 0.5
    h2 = 0 * x1 + 3 * x2 - 1.0
    return 1 * h1 + 4 * h2 - 0.2

def one_layer(x1, x2):
    return 2 * x1 + 11 * x2 - 3.7

for x1, x2 in [(1.0, 0.0), (0.0, 1.0), (2.0, -3.0), (0.7, 0.4)]:
    print(x1, x2, '| two layers:', round(two_layers(x1, x2), 4), '| one layer:', round(one_layer(x1, x2), 4))

# ---- real output ----
# 1.0 0.0 | two layers: -1.7 | one layer: -1.7
# 0.0 1.0 | two layers: 7.3 | one layer: 7.3
# 2.0 -3.0 | two layers: -32.7 | one layer: -32.7
# 0.7 0.4 | two layers: 2.1 | one layer: 2.1`,
      annotations: {
        1: 'The two-layer network with no activation function anywhere.',
        2: 'Hidden neuron 1: weights 2 and -1, bias 0.5. No squashing applied.',
        3: 'Hidden neuron 2: weights 0 and 3, bias -1.0. The 0 * x1 is written out so the weight grid is visible rather than implied.',
        4: 'The output neuron reads h1 and h2 with weights 1 and 4, bias -0.2. Seven parameters used in total.',
        6: 'The single neuron we derived by substituting, for comparison.',
        7: 'Weights 2 and 11, bias -3.7. Three parameters.',
        9: 'Four test inputs, including a negative and a fractional one so the agreement cannot be luck on nice numbers.',
        10: 'Print both answers side by side. Every row matches exactly — they are the same function, not merely close.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The fix, shown numerically: add ReLU and the collapse stops',
      code: `def relu(z):
    return z if z > 0 else 0.0

def with_relu(x1, x2):
    h1 = relu(2 * x1 - 1 * x2 + 0.5)
    h2 = relu(0 * x1 + 3 * x2 - 1.0)
    return 1 * h1 + 4 * h2 - 0.2

for x1, x2 in [(1.0, 0.0), (0.0, 1.0), (2.0, -3.0), (0.7, 0.4)]:
    print(x1, x2, '| with ReLU:', round(with_relu(x1, x2), 4), '| one layer:', round(one_layer(x1, x2), 4))

# ---- real output ----
# 1.0 0.0 | with ReLU: 2.3 | one layer: -1.7
# 0.0 1.0 | with ReLU: 7.8 | one layer: 7.3
# 2.0 -3.0 | with ReLU: 7.3 | one layer: -32.7
# 0.7 0.4 | with ReLU: 2.1 | one layer: 2.1`,
      annotations: {
        1: 'ReLU on a single number this time, not a list.',
        2: 'Keep z when it is positive, otherwise hand back 0.0.',
        4: 'The identical network from the previous snippet, with one change.',
        5: 'The change: hidden neuron 1\'s result now passes through relu before leaving.',
        6: 'Same for hidden neuron 2. Nothing else in the network was touched.',
        7: 'The output neuron is unchanged — same weights 1 and 4, same bias -0.2.',
        9: 'The same four test inputs as before, so the two tables can be read side by side.',
        10: 'Now the columns disagree on three of four rows. The last row agrees only because both hidden values happened to be positive there, so ReLU changed nothing for that one input — which is exactly how ReLU works: it is linear on the positive side and flat on the negative side, and the kink between them is the entire non-linearity.',
      },
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Pen and paper first. Every number here is small on purpose.

1. A neuron has inputs x = [2.0, -1.0], weights w = [0.3, 0.4], bias b = 0.5. Compute z. Then compute the ReLU activation, and separately the step activation (1 if z is at least 0, else 0).
2. Count the parameters in a 5-8-8-3 network — that is 5 inputs, two hidden layers of 8, and 3 outputs. Give the per-layer breakdown and the total. What is the depth, and what is the width of the widest layer?
3. A network takes 1000 inputs into a hidden layer of 500, then 500 into 10 outputs. Which layer holds more parameters, and by roughly what factor?
4. Someone writes a 4-6-6-1 network with ReLU after the first hidden layer but forgets it after the second. How many layers does the network *effectively* have, and how many parameters are wasted?
5. Using the XOR solution from this module, compute h1, h2 and y by hand for the input (1, 0). Show each z before the step is applied.`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `Check every intermediate number, not only the final one.

1. z = 0.3(2.0) + 0.4(-1.0) + 0.5 = 0.6 - 0.4 + 0.5 = **0.7**. ReLU(0.7) = **0.7**, because it is positive. step(0.7) = **1**, because 0.7 is at least 0. Both activations act on the same z; they only disagree on what they do with it.
2. Layer 1, 5 to 8: 5 x 8 = 40 weights + 8 biases = 48. Layer 2, 8 to 8: 64 + 8 = 72. Layer 3, 8 to 3: 24 + 3 = 27. Total = **147**. Depth = **3**, because three layers have weights; the input layer does not count. Widest layer = **8**.
3. Layer 1: 1000 x 500 + 500 = **500,500**. Layer 2: 500 x 10 + 10 = **5,010**. The first layer holds about **100 times** more. The general lesson: the layer next to a high-dimensional input is where nearly all the memory goes, because its parameter count is the product of two large numbers.
4. The second hidden layer and the output layer have no non-linearity between them, so they multiply out into one layer exactly as in the mistake section. The network effectively has **3 weighted layers, not 4**. Counting the waste: layer 3 (6 to 6) is 36 + 6 = 42 parameters and layer 4 (6 to 1) is 6 + 1 = 7, total 49, and the same function is reachable with a single 6-to-1 layer costing 7. So **42 parameters buy nothing**. The network still trains and the loss still falls — it just cannot represent anything the smaller network could not.
5. Input (1, 0). Hidden 1: z = 1(1) + 1(0) - 0.5 = **0.5**, and step(0.5) = **1**. Hidden 2: z = 1(1) + 1(0) - 1.5 = **-0.5**, and step(-0.5) = **0**. Output: z = 1(1) + (-1)(0) - 0.5 = **0.5**, and step(0.5) = **1**. XOR(1, 0) is 1, so it is correct — and it matches the third row of the 2-2-1 output above.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. This section names ideas you will meet later so the words are not new when you get there.

- **Batching.** Real code pushes many inputs through at once rather than one at a time, because every input uses the same weight grid, so the whole batch becomes one large multiplication that a GPU can run in parallel. The arithmetic per input is identical to the dense() loop above.
- **The universal approximation theorem** (Cybenko 1989, Hornik 1991) says a single hidden layer, given enough neurons and a non-linear activation, can get as close as you like to any continuous function on a bounded region. Two honest caveats: it puts no limit on how many neurons "enough" is, and it only says good weights *exist* — it says nothing about whether training will find them.
- **So why go deep instead of very wide?** Cost. One hidden layer of 1000 neurons on 784 inputs costs 784(1000) + 1000 + 1000(10) + 10 = 795,010 parameters, while 784-128-64-10 costs 109,386 for usually better accuracy. Depth lets layer 2 build on the features layer 1 found, instead of rebuilding everything from raw pixels.
- **Other activations.** ReLU and sigmoid are two of several; tanh, GELU and others differ in shape and in how they behave during training. The next module covers which to use where, and why sigmoid is now rarely used inside hidden layers.
- **Historical note.** In 1969 Minsky and Papert published the XOR limitation in book form and interest in neural networks collapsed for years. Everyone already knew a hidden layer fixed XOR; nobody had a practical way to *train* one until backpropagation was popularised in 1986. That training method is the next module.`,
    },
  ],
  quiz: [
    {
      question: 'A neuron has 3 inputs. How many parameters does it have?',
      options: [
        { text: '3', explanation: 'That counts the weights and forgets the bias, which is also learned.' },
        { text: '4', explanation: 'Correct: 3 weights, one per input, plus 1 bias that has no input attached.' },
        { text: '6', explanation: 'There is no second number per input. One weight per connection, and one bias for the neuron.' },
      ],
      correct: 1,
    },
    {
      question: 'Why can no single neuron compute XOR?',
      options: [
        { text: 'Four data points are too few to train on', explanation: 'Quantity is not the issue — those four points are the complete function, and we brute-forced 1,377 candidate lines against them.' },
        {
          text: 'A single neuron\'s boundary is one straight line, and the two 1s and the two 0s share the midpoint (0.5, 0.5), so no line can put that point on both sides',
          explanation: 'Correct. Each side of a line is convex, so a line holding both 1s must hold their midpoint, and the same point is the midpoint of the two 0s.',
        },
        { text: 'The step function has no slope, so it cannot be trained', explanation: 'True but a different problem. Even if perfect weights were handed to you for free, no straight line separates XOR.' },
      ],
      correct: 1,
    },
    {
      question: 'How many parameters does a dense layer with 100 inputs and 50 outputs have?',
      options: [
        { text: '5,000', explanation: 'That is the weight count only. Each of the 50 output neurons also has a bias.' },
        { text: '150', explanation: 'That is 100 + 50. In a fully connected layer every input connects to every output, so the weights multiply.' },
        { text: '5,050', explanation: 'Correct: 100 x 50 = 5,000 weights, plus 50 biases — one per output neuron, not per input.' },
      ],
      correct: 2,
    },
    {
      question: 'You stack 50 dense layers with no activation function between any of them. What can the network compute?',
      options: [
        { text: 'Exactly what one dense layer can compute', explanation: 'Correct. Substituting each layer into the next multiplies out to a single set of weights and one bias, as shown numerically in the mistake section. Millions of parameters, one straight boundary.' },
        { text: 'Fifty times more complex functions than one layer', explanation: 'Depth with no non-linearity adds nothing. Multiply-and-add followed by multiply-and-add is still multiply-and-add.' },
        { text: 'Any continuous function, because it is deep enough', explanation: 'That result requires a non-linear activation. With none, there is nothing to build a curve out of.' },
      ],
      correct: 0,
    },
    {
      question: 'In the 2-2-1 XOR network, the hidden layer turned the four inputs into the points (0,0), (1,0), (1,0) and (1,1). Why does that matter?',
      options: [
        { text: 'It compressed the data into fewer numbers', explanation: 'Nothing was compressed — two numbers went in and two came out. The values changed, not the count.' },
        {
          text: 'In these new coordinates the two answer-1 points sit together and can be split from the answer-0 points by one straight line, which the output neuron then draws',
          explanation: 'Correct. The hidden layer re-coordinates the problem so a straight line is enough. That is what a hidden layer buys you.',
        },
        { text: 'It removed the need for weights in the output layer', explanation: 'The output neuron still has weights (1, -1) and a bias of -0.5, and it needs all three.' },
      ],
      correct: 1,
    },
    {
      question: 'In a 3-4-2 network, what is the depth and what is the width of the hidden layer?',
      options: [
        { text: 'Depth 3, width 4', explanation: 'Depth counts layers that have weights. The input layer has none, so it is not counted.' },
        { text: 'Depth 2, width 4', explanation: 'Correct. Two layers carry weights (3-to-4 and 4-to-2), and the hidden layer holds 4 neurons.' },
        { text: 'Depth 2, width 3', explanation: 'Depth is right, but 3 is the number of inputs. The hidden layer\'s width is its own neuron count, 4.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why do neural networks need activation functions? Prove it rather than asserting it.',
      answer:
        'Because without them, extra layers add parameters and no new power. Take two layers with no activation: h = W1x + b1, then y = W2h + b2. Substitute the first into the second: y = W2(W1x + b1) + b2 = (W2W1)x + (W2b1 + b2). That is a single layer with weights W2W1 and bias W2b1 + b2. The same substitution repeats for any depth, so fifty layers collapse to one. Concretely: h1 = 2x1 - x2 + 0.5, h2 = 3x2 - 1, y = h1 + 4h2 - 0.2 expands to y = 2x1 + 11x2 - 3.7 — seven parameters doing the work of three, exactly. Put any non-linear function between the layers and the substitution no longer goes through, because you cannot pull x back out of it.',
      isCaseBased: false,
    },
    {
      question: 'Explain the XOR problem and how a hidden layer solves it.',
      answer:
        'XOR is 1 when the two binary inputs differ: (0,0) gives 0, (0,1) gives 1, (1,0) gives 1, (1,1) gives 0. One neuron thresholds w1x1 + w2x2 + b, so its boundary is one straight line. The two 1s and the two 0s lie on the two diagonals of the unit square, which cross at (0.5, 0.5). Each side of a line is convex, so a line holding both 1s must hold their midpoint; the same point is the midpoint of the 0s, so it would have to be on both sides. No line exists. Two hidden neurons fix it: one computes OR (weights 1,1, bias -0.5), one computes AND (weights 1,1, bias -1.5), and an output neuron with weights (1,-1) and bias -0.5 says "OR fired and AND did not". The hidden layer moves the four points into coordinates where one line suffices.',
      isCaseBased: false,
    },
    {
      question: 'Count the parameters in a 784-256-128-10 network and show your arithmetic.',
      answer:
        'The rule is that a dense layer from n inputs to m outputs holds n x m weights plus m biases — m biases, because one belongs to each receiving neuron. Layer 1: 784 x 256 = 200,704 weights plus 256 biases = 200,960. Layer 2: 256 x 128 = 32,768 plus 128 = 32,896. Layer 3: 128 x 10 = 1,280 plus 10 = 1,290. Total 235,146. Two things worth adding unprompted: about 85 percent of the parameters sit in the first layer, so width next to a high-dimensional input is what costs memory; and the depth here is 3, not 4, because the input layer carries no weights.',
      isCaseBased: false,
    },
    {
      question: 'What does a hidden unit actually compute, and why is stacking them useful?',
      answer:
        'One hidden unit computes a dot product between its weight list and whatever came in, adds its bias, and passes the result through an activation. So it outputs a large number when the incoming pattern resembles its weights and a small one otherwise — a template matcher whose template is learned rather than designed. Stacking helps because the units in layer 2 match patterns in the outputs of layer 1, not in the raw input. In the XOR network, layer 1 produced "is at least one input on" and "are both inputs on", and layer 2 combined those two facts instead of the original coordinates. Scale that up and you get edges, then corners built from edges, then object parts built from corners.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague\'s 5-layer network trains without errors and its loss goes down, but its predictions are indistinguishable from a straight-line model no matter how long it runs. Debug it.',
      answer:
        'First hypothesis, and usually the answer: there is no non-linearity, or one that is secretly linear. Check that every hidden layer is followed by an activation. A missing one means those layers multiply out into a single dense layer, and a straight-line model is precisely what that can express — you can verify it in one minute by substituting the weights of two adjacent layers and confirming a single equivalent layer reproduces the outputs. Watch too for an activation named "linear" or "identity" passed in by config, and for an activation applied only at the output. Second possibility: the activations are all dead. If every pre-activation is negative under ReLU, every hidden output is 0 and only the bias path survives, so print the fraction of zeros per layer. Third: the weights barely moved from initialisation, and sigmoid and tanh are close to straight lines near zero, so a network with tiny weights behaves almost linearly — compare weights at step 0 and step 1000. Do the check in that order; the first one takes ten seconds and finds it most of the time.',
      isCaseBased: true,
    },
    {
      question: 'Case: an MLP trains, the loss decreases smoothly, but accuracy sits at chance and the loss values look strangely small. What do you check?',
      answer:
        'Suspect a mismatch between the shape of the predictions and the shape of the labels — the failure that does not crash. The output layer of a network with m output neurons produces m numbers per input, so a batch of B inputs produces a B-by-m block. If the labels arrive as a flat list of length B while the predictions are B-by-1, most array libraries will silently pair every prediction with every label instead of matching them up one to one, producing an average over B-squared mostly meaningless comparisons. That average is smooth and small and optimises toward the mean, which is exactly the symptom. Checks, in order: print the shape of the labels, the predictions, and the per-example loss before it is averaged — the per-example loss must have one entry per input, never a square block. Then assert those shapes permanently so the bug cannot come back. Then confirm nothing in the data pipeline transposed the batch dimension with the feature dimension. The general habit is to write the expected shape after every layer before writing the layer.',
      isCaseBased: true,
    },
    {
      question: 'Case: a regression MLP predicts temperature anomalies, which can be negative, but it never outputs a value below zero. It has ReLU after every layer, including the output. What is wrong, and what is the general rule?',
      answer:
        'ReLU on the output layer replaces every negative prediction with 0, so half the target range is unreachable. The model is not undertrained, it is architecturally incapable, and it cannot learn its way out either: a ReLU that has been pushed negative outputs 0 and passes no signal backwards, so there is nothing to correct with. The fix is to leave the output layer with no activation at all, which is what the forward-pass snippet in this module does. The general rule is that the output activation is chosen from the range of the target and the loss being used, never from habit: no activation for an unbounded number, sigmoid when the answer must be a probability between 0 and 1, softmax across the class dimension for choosing between classes, and ReLU only when the target genuinely cannot be negative. Hidden activations and the output activation answer different questions — hidden ones exist to stop the layers collapsing, the output one exists to match the label space.',
      isCaseBased: true,
    },
    {
      question: 'Depth versus width — how would you actually decide?',
      answer:
        'Start from cost. Depth lets later layers build on features earlier layers found, so the same function often needs far fewer parameters: one hidden layer of 1000 neurons on 784 inputs is about 795,000 parameters, while 784-128-64-10 is about 109,000 and usually generalises better. Against that, depth makes training harder — the signal that reaches early layers gets weaker, and you start needing careful initialisation, normalisation and skip connections. So the practical rule: go deep enough that features can compose over whatever hierarchy your data has. Images and language are strongly hierarchical, so depth pays; tabular data much less so, and there a shallow wide network, or a tree-based model, frequently wins. Also keep width near the input in proportion to the input size, since that layer dominates the parameter count.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'What one neuron computes', back: 'Dot product of weights with inputs, plus a bias, then an activation. Example: w=[0.5,-1.5,0.25], x=[1,0,3], b=-0.7 gives z=0.55, sigmoid gives 0.6341.' },
    { front: 'Weight vs bias', back: 'Weight: one number per connection, multiplied by an input. Bias: one number per neuron, no input attached, shifts the output up or down.' },
    { front: 'Why one neuron fails XOR', back: 'Its boundary is one straight line. The two 1s and the two 0s share midpoint (0.5, 0.5), and each side of a line is convex, so one point would have to be on both sides.' },
    { front: 'The 2-2-1 XOR solution', back: 'Hidden 1 = OR (1, 1, -0.5). Hidden 2 = AND (1, 1, -1.5). Output = (1, -1, -0.5), meaning "OR fired and AND did not".' },
    { front: 'What a hidden layer buys you', back: 'New coordinates in which the classes can be split by a straight line. It straightens the problem instead of curving the boundary.' },
    { front: 'Dense layer parameter count', back: 'n inputs to m outputs costs n x m weights plus m biases. Biases are per output neuron. 3-4-2 = (12+4) + (8+2) = 26.' },
    { front: 'Stacked layers with no activation', back: 'h1 = 2x1 - x2 + 0.5, h2 = 3x2 - 1, y = h1 + 4h2 - 0.2 becomes y = 2x1 + 11x2 - 3.7. Any depth collapses to one layer.' },
    { front: 'What a forward pass is', back: 'Repeat per layer: multiply by the weight grid, add one bias per neuron, apply the activation. Nothing else happens when a network predicts.' },
  ],
  mindmapMarkdown: `- From Perceptron to MLP
  - One neuron
    - z = dot product of w and x, plus b
    - [0.5,-1.5,0.25] . [1,0,3] = 1.25, minus 0.7 = 0.55
    - activation squashes z: sigmoid 0.6341, or ReLU
  - Vocabulary
    - weight per connection, bias per neuron
    - input / hidden / output layer
    - width = neurons in a layer
    - depth = layers with weights (input not counted)
    - dense = every neuron reads every previous output
  - XOR
    - (0,0)->0 (0,1)->1 (1,0)->1 (1,1)->0
    - both diagonals share midpoint (0.5,0.5)
    - 1377 lines tried, best 3 of 4
    - fix: hidden OR + hidden AND, output = OR and not AND
    - hidden layer re-coordinates, then one line works
  - Parameter counting
    - n -> m costs n*m weights + m biases
    - 3-4-2 = 16 + 10 = 26
    - 784 -> 128 = 100,352 weights + 128 biases
  - Forward pass
    - multiply, add bias, activate; repeat per layer
    - that is the whole network
  - Classic mistake
    - no activation: 2 layers = 1 layer, exactly
    - 2x1 - x2 + 0.5 then +4h2 - 0.2 becomes 2x1 + 11x2 - 3.7
    - add ReLU and the collapse stops`,
}

export default m
