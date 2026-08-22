import type { Module } from '../types'

const m: Module = {
  id: 'dl-l0-activations',
  subjectId: 'dl',
  level: 0,
  title: 'Activation Functions: Sigmoid, Tanh, ReLU, GELU & Softmax',
  whyItMatters:
    'A neural network is layers of multiply-and-add stacked on top of each other. Multiply-and-add stacked on multiply-and-add is still just one multiply-and-add, no matter how many layers you use. The activation function is the one small thing you put between the layers so that depth actually buys you something. Pick the wrong one and a deep network sits at the same loss for a week; that really happened to the whole field for about twenty years. This module builds the reason from arithmetic you can check on paper, then computes each activation and its slope by hand.',
  assumes: [
    'You have seen a Python for loop, a function definition, and print',
    'You remember from school maths that a straight line is y = a*x + b, and that the slope is how much y moves when x moves one step',
    'Read the Math module *Slopes, Derivatives & the Gradient* and the ML module *Gradient Descent + Linear Regression* first: this module leans on the idea that training moves each weight by (slope) x (step size)',
    'No deep learning background is needed. Every term used here is defined here.',
  ],
  estMinutes: 38,
  sections: [
    {
      type: 'intuition',
      title: 'Why an activation has to exist at all',
      md: `A layer of a neural network does one thing to a number: multiply it by a weight and add a bias. Take x = 2 and push it through two such layers.

- **Layer 1** multiplies by 3 and adds 1: 3 x 2 + 1 = **7**.
- **Layer 2** multiplies that by -2 and adds 5: -2 x 7 + 5 = **-9**.
- Now do it with algebra instead of numbers: -2 x (3x + 1) + 5 = -6x - 2 + 5 = **-6x + 3**.
- Check the single line -6x + 3 at x = 2: -6 x 2 + 3 = **-9**. Identical answer.

Two layers, four numbers of settings, and the whole thing is exactly the same as one layer with weight -6 and bias 3. Add a hundred more layers and it is still one line, just with different numbers. **Depth bought nothing.** That is the problem the rest of this module exists to fix.`,
    },
    {
      type: 'visual',
      component: 'Plot',
      props: {
          title: 'The four activation functions, on one axis',
          notice: 'Sigmoid and tanh flatten at both ends — past about x = 4 their slope is under 0.02, so a gradient arriving there is multiplied by almost nothing and the layer stops learning. That flat tail is the vanishing-gradient problem. ReLU keeps slope 1 forever on the right, which is why it trains deep networks; GELU is ReLU with the corner rounded off.',
          kind: 'line',
          xLabel: 'input x',
          yLabel: 'output',
          yMin: -1.5,
          yMax: 5,
          series: [
            {
              name: 'ReLU',
              points: [[-5, 0], [-4.8333, 0], [-4.6667, 0], [-4.5, 0], [-4.3333, 0], [-4.1667, 0], [-4, 0], [-3.8333, 0], [-3.6667, 0], [-3.5, 0], [-3.3333, 0], [-3.1667, 0], [-3, 0], [-2.8333, 0], [-2.6667, 0], [-2.5, 0], [-2.3333, 0], [-2.1667, 0], [-2, 0], [-1.8333, 0], [-1.6667, 0], [-1.5, 0], [-1.3333, 0], [-1.1667, 0], [-1, 0], [-0.8333, 0], [-0.6667, 0], [-0.5, 0], [-0.3333, 0], [-0.1667, 0], [0, 0], [0.1667, 0.1667], [0.3333, 0.3333], [0.5, 0.5], [0.6667, 0.6667], [0.8333, 0.8333], [1, 1], [1.1667, 1.1667], [1.3333, 1.3333], [1.5, 1.5], [1.6667, 1.6667], [1.8333, 1.8333], [2, 2], [2.1667, 2.1667], [2.3333, 2.3333], [2.5, 2.5], [2.6667, 2.6667], [2.8333, 2.8333], [3, 3], [3.1667, 3.1667], [3.3333, 3.3333], [3.5, 3.5], [3.6667, 3.6667], [3.8333, 3.8333], [4, 4], [4.1667, 4.1667], [4.3333, 4.3333], [4.5, 4.5], [4.6667, 4.6667], [4.8333, 4.8333], [5, 5]],
            },
            {
              name: 'GELU',
              points: [[-5, 0], [-4.8333, 0], [-4.6667, 0], [-4.5, 0], [-4.3333, 0], [-4.1667, -0.0001], [-4, -0.0001], [-3.8333, -0.0002], [-3.6667, -0.0005], [-3.5, -0.0008], [-3.3333, -0.0014], [-3.1667, -0.0024], [-3, -0.004], [-2.8333, -0.0065], [-2.6667, -0.0102], [-2.5, -0.0155], [-2.3333, -0.0229], [-2.1667, -0.0328], [-2, -0.0455], [-1.8333, -0.0612], [-1.6667, -0.0797], [-1.5, -0.1002], [-1.3333, -0.1216], [-1.1667, -0.142], [-1, -0.1587], [-0.8333, -0.1686], [-0.6667, -0.1683], [-0.5, -0.1543], [-0.3333, -0.1231], [-0.1667, -0.0723], [0, 0], [0.1667, 0.0944], [0.3333, 0.2102], [0.5, 0.3457], [0.6667, 0.4983], [0.8333, 0.6647], [1, 0.8413], [1.1667, 1.0247], [1.3333, 1.2117], [1.5, 1.3998], [1.6667, 1.587], [1.8333, 1.7721], [2, 1.9545], [2.1667, 2.1339], [2.3333, 2.3104], [2.5, 2.4845], [2.6667, 2.6565], [2.8333, 2.8268], [3, 2.996], [3.1667, 3.1642], [3.3333, 3.3319], [3.5, 3.4992], [3.6667, 3.6662], [3.8333, 3.8331], [4, 3.9999], [4.1667, 4.1666], [4.3333, 4.3333], [4.5, 4.5], [4.6667, 4.6667], [4.8333, 4.8333], [5, 5]],
            },
            {
              name: 'tanh',
              points: [[-5, -0.9999], [-4.8333, -0.9999], [-4.6667, -0.9998], [-4.5, -0.9998], [-4.3333, -0.9997], [-4.1667, -0.9995], [-4, -0.9993], [-3.8333, -0.9991], [-3.6667, -0.9987], [-3.5, -0.9982], [-3.3333, -0.9975], [-3.1667, -0.9965], [-3, -0.9951], [-2.8333, -0.9931], [-2.6667, -0.9904], [-2.5, -0.9866], [-2.3333, -0.9814], [-2.1667, -0.9741], [-2, -0.964], [-1.8333, -0.9502], [-1.6667, -0.9311], [-1.5, -0.9051], [-1.3333, -0.8701], [-1.1667, -0.8232], [-1, -0.7616], [-0.8333, -0.6823], [-0.6667, -0.5828], [-0.5, -0.4621], [-0.3333, -0.3215], [-0.1667, -0.1651], [0, 0], [0.1667, 0.1651], [0.3333, 0.3215], [0.5, 0.4621], [0.6667, 0.5828], [0.8333, 0.6823], [1, 0.7616], [1.1667, 0.8232], [1.3333, 0.8701], [1.5, 0.9051], [1.6667, 0.9311], [1.8333, 0.9502], [2, 0.964], [2.1667, 0.9741], [2.3333, 0.9814], [2.5, 0.9866], [2.6667, 0.9904], [2.8333, 0.9931], [3, 0.9951], [3.1667, 0.9965], [3.3333, 0.9975], [3.5, 0.9982], [3.6667, 0.9987], [3.8333, 0.9991], [4, 0.9993], [4.1667, 0.9995], [4.3333, 0.9997], [4.5, 0.9998], [4.6667, 0.9998], [4.8333, 0.9999], [5, 0.9999]],
            },
            {
              name: 'sigmoid',
              points: [[-5, 0.0067], [-4.8333, 0.0079], [-4.6667, 0.0093], [-4.5, 0.011], [-4.3333, 0.013], [-4.1667, 0.0153], [-4, 0.018], [-3.8333, 0.0212], [-3.6667, 0.0249], [-3.5, 0.0293], [-3.3333, 0.0344], [-3.1667, 0.0404], [-3, 0.0474], [-2.8333, 0.0555], [-2.6667, 0.065], [-2.5, 0.0759], [-2.3333, 0.0884], [-2.1667, 0.1028], [-2, 0.1192], [-1.8333, 0.1378], [-1.6667, 0.1589], [-1.5, 0.1824], [-1.3333, 0.2086], [-1.1667, 0.2375], [-1, 0.2689], [-0.8333, 0.3029], [-0.6667, 0.3392], [-0.5, 0.3775], [-0.3333, 0.4174], [-0.1667, 0.4584], [0, 0.5], [0.1667, 0.5416], [0.3333, 0.5826], [0.5, 0.6225], [0.6667, 0.6608], [0.8333, 0.6971], [1, 0.7311], [1.1667, 0.7625], [1.3333, 0.7914], [1.5, 0.8176], [1.6667, 0.8411], [1.8333, 0.8622], [2, 0.8808], [2.1667, 0.8972], [2.3333, 0.9116], [2.5, 0.9241], [2.6667, 0.935], [2.8333, 0.9445], [3, 0.9526], [3.1667, 0.9596], [3.3333, 0.9656], [3.5, 0.9707], [3.6667, 0.9751], [3.8333, 0.9788], [4, 0.982], [4.1667, 0.9847], [4.3333, 0.987], [4.5, 0.989], [4.6667, 0.9907], [4.8333, 0.9921], [5, 0.9933]],
            },
          ],
        },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The collapse, run',
      code: `x = 2.0
h = 3.0 * x + 1.0
y = -2.0 * h + 5.0
print('two layers stacked :', y)
print('one layer -6x + 3  :', -6.0 * x + 3.0)

# ---- real output ----
# two layers stacked : -9.0
# one layer -6x + 3  : -9.0`,
      annotations: {
        1: 'The input. One number, so we can follow it by eye.',
        2: 'Layer 1: multiply by the weight 3.0, add the bias 1.0. h is the number handed to the next layer, and it is 7.0.',
        3: 'Layer 2: multiply h by the weight -2.0 and add the bias 5.0. This is the network output.',
        4: 'Print what the two-layer network produced.',
        5: 'Print what a single layer with weight -6.0 and bias 3.0 produces on the same input. The two lines print the same number, which is the collapse: two layers were never more than one.',
      },
    },
    {
      type: 'intuition',
      title: 'The three words you need before going further',
      md: `Definitions first, in plain English, because everything below uses them.

- **Non-linear** — a function whose graph is not a straight line. Straight lines are exactly the things that collapse when you stack them, so anything not straight breaks the collapse.
- **Activation function** — a small non-linear function applied to *each number* coming out of a layer, one at a time, before the next layer sees it. It has no weights of its own to learn. Its whole job is to bend the straight line.
- **Derivative of the activation** — the slope of that small function at a given input. If the activation is f and the input is z, we write the slope as f'(z), read "f prime of z".

Why the derivative and not the function value? Because of how training works. From *Gradient Descent + Linear Regression*: every weight is updated by (step size) x (slope of the loss with respect to that weight). To get that slope, the training loop multiplies together one slope per layer on the way back through the network, and the activation contributes one f'(z) at each layer. So each activation's slope is a factor in the update for every weight below it. If a slope is 0.1, the update below it is ten times smaller. If a slope is 0, the update below it is zero and nothing learns.`,
    },
    {
      type: 'intuition',
      title: 'Sigmoid, computed by hand',
      md: `The oldest activation. It takes any number and squashes it into the range 0 to 1. The formula is 1 / (1 + e^-z), where e is about 2.71828.

- At **z = 2**: e^-2 = 0.135335, so the bottom is 1.135335, and 1 / 1.135335 = **0.880797**.
- Its slope has a very tidy form: f'(z) = f(z) x (1 - f(z)). No new arithmetic needed, just reuse the value you already computed.
- At z = 2: 0.880797 x (1 - 0.880797) = 0.880797 x 0.119203 = **0.104994**.
- At **z = 0**: the value is 1/2 = 0.5, so the slope is 0.5 x 0.5 = **0.25**. That is the largest slope sigmoid ever has, anywhere.
- At **z = 6**: the value is 0.997527, so the slope is 0.997527 x 0.002473 = **0.002467**.

Read those three slopes in order: 0.25, then 0.105, then 0.0025. The further you move from zero, the flatter the function gets.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Sigmoid and its slope at three inputs',
      code: `import math

def sigmoid(z):
    return 1.0 / (1.0 + math.exp(-z))

for z in (0.0, 2.0, 6.0):
    s = sigmoid(z)
    d = s * (1.0 - s)
    print('z =', z, ' sigmoid =', round(s, 6), ' slope =', round(d, 6))

# ---- real output ----
# z = 0.0  sigmoid = 0.5  slope = 0.25
# z = 2.0  sigmoid = 0.880797  slope = 0.104994
# z = 6.0  sigmoid = 0.997527  slope = 0.002467`,
      annotations: {
        1: 'The math module from the Python standard library. It gives us math.exp (the number e raised to a power), and later math.tanh and math.erf. No numpy anywhere in this module.',
        3: 'Define the function. z is the number arriving from the layer; the usual name for it is the pre-activation.',
        4: 'The formula, written exactly as above: e to the power minus z, plus one, then one divided by that.',
        6: 'Loop over three inputs. The round brackets make a tuple, which is a fixed list; a for loop reads it the same way it reads a list.',
        7: 'The activation value at this z.',
        8: 'The slope, using the shortcut f(z) x (1 - f(z)). It costs one multiply because the value s is already computed.',
        9: 'Print both. round(s, 6) cuts the float to 6 decimal places so the columns stay readable. Compare the last column down the three rows: 0.25, then 0.105, then 0.0025.',
      },
    },
    {
      type: 'intuition',
      title: 'Saturation, and why a small slope stops learning',
      md: `Two more words, both visible in the numbers you just computed.

- **Saturation** — a function saturates when its output stops responding to its input. Sigmoid at z = 6 gives 0.997527; at z = 10 it gives 0.999955. The input moved by 4 and the output moved by 0.00002. The function has flattened out, and a flat function has a slope near zero.
- **Vanishing gradient** — the slopes of all the layers get multiplied together on the way back, so many small numbers multiplied become an unimaginably small number. That tiny number is the gradient, and a tiny gradient means a tiny weight update.

Put real numbers on it. Suppose a 6-layer network where every unit sits at z = 2, so every activation slope is 0.104994. The factor reaching the first layer is 0.104994 multiplied by itself six times:

- After 1 layer: 0.104994. After 2: 0.011024. After 3: 0.001157.
- After 4: 0.000122. After 5: 0.0000128. After 6: **0.00000134**.

With a step size of 0.01, the first layer's weights move by about a hundred-millionth per training step. That is not slow learning, it is no learning: the number is smaller than the rounding noise. Meanwhile the last layer, which only got multiplied once, trains fine — so the loss does drop a little and then sticks.`,
    },
    {
      type: 'math',
      intro: 'Sigmoid, its slope, and the multiplication that kills a deep stack. e is the constant 2.71828, and the prime mark means slope.',
      latex: [
        '\\sigma(z) = \\frac{1}{1 + e^{-z}} \\qquad \\sigma^{\\prime}(z) = \\sigma(z)\\bigl(1 - \\sigma(z)\\bigr) \\qquad \\sigma^{\\prime}(0) = 0.5 \\times 0.5 = 0.25',
        '\\text{6 layers, each with slope } 0.104994: \\quad (0.104994)^{6} = 0.00000134',
        '\\text{even at the best slope sigmoid ever has: } \\quad (0.25)^{10} = \\frac{1}{1048576} = 0.00000095',
      ],
    },
    {
      type: 'intuition',
      title: 'Tanh: the same S-shape, centred on zero',
      md: `Tanh squashes into the range -1 to 1 instead of 0 to 1, and its slope is 1 - f(z) x f(z).

- At **z = 0**: tanh(0) = 0, so the slope is 1 - 0 = **1.0**. Four times better than sigmoid's best.
- At **z = 2**: tanh(2) = 0.964028, so the slope is 1 - 0.929 = **0.070651**.
- At **z = 6**: tanh(6) = 0.999988, so the slope is **0.000025**.

So tanh starts better and saturates *harder*. At z = 2 its slope has already fallen below sigmoid's. There is one genuine extra advantage: tanh outputs sit either side of zero, while sigmoid outputs are always positive. A layer whose outputs are all positive feeds all-positive inputs to the next layer, and every weight there then gets an update pointing the same direction, which makes the optimiser zig-zag instead of going straight. Tanh removes that. It is still an S-shape with flat tails, which is the part that matters.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Tanh and its slope at the same three inputs',
      code: `import math

for z in (0.0, 2.0, 6.0):
    t = math.tanh(z)
    d = 1.0 - t * t
    print('z =', z, ' tanh =', round(t, 6), ' slope =', round(d, 6))

# ---- real output ----
# z = 0.0  tanh = 0.0  slope = 1.0
# z = 2.0  tanh = 0.964028  slope = 0.070651
# z = 6.0  tanh = 0.999988  slope = 2.5e-05`,
      annotations: {
        1: 'math.tanh ships with Python, so there is nothing to write ourselves.',
        3: 'The same three inputs as the sigmoid run, so the two output tables can be read side by side.',
        4: 'The activation value.',
        5: 'The slope, using 1 minus the value squared. Again the forward value is reused, so the slope is nearly free.',
        6: 'Print both. The last row prints 2.5e-05, which is Python\'s shorthand for 0.000025 — that is saturation showing up as scientific notation.',
      },
    },
    {
      type: 'intuition',
      title: 'ReLU: the function that fixed it',
      md: `ReLU is the whole of: if the number is negative, output 0; otherwise output the number unchanged. Written max(0, z). It looks too simple to be an improvement on a smooth S-curve, and it is what made deep networks trainable.

- At **z = 3**: output 3. At **z = 0.5**: output 0.5. At **z = -2**: output 0.
- Its slope is 1 for every positive z, because output = input there and a line of the form y = z has slope 1.
- Its slope is 0 for every negative z, because the output is the constant 0 and a constant does not move.
- **Nothing saturates on the positive side.** Six layers of active ReLU units multiply 1 x 1 x 1 x 1 x 1 x 1 = **1**. The gradient reaching layer 1 is exactly what left the loss. Compare with 0.00000134 for the sigmoid stack.
- Bonus: it costs one comparison. No e^z, no division. On billions of numbers per pass that is real wall-clock time.

At exactly z = 0 the function has a corner and no single slope. Every framework just declares f'(0) = 0 and moves on; a pre-activation being bit-exactly zero essentially never happens.`,
    },
    {
      type: 'intuition',
      title: 'The dead neuron, and the one-character fix',
      md: `A **dead neuron** is a unit whose pre-activation z is negative for *every* example in the dataset. Follow the loop:

- Its ReLU slope is 0, so the gradient for its weights is 0.
- A gradient of 0 means the update is (step size) x 0 = 0, so its weights do not change.
- Weights unchanged means z stays negative for every example, so the slope stays 0. Nothing can ever get it out. The unit is permanently gone from the network.
- **Why it happens.** Mostly a step size that is too big: one oversized update drives the bias far negative in a single step and it never comes back. A badly chosen starting bias does the same thing more slowly.
- **LeakyReLU** replaces the flat 0 on the negative side with a gentle slope, usually 0.01 x z. Output at z = -2 is -0.02 instead of 0, and the slope there is 0.01 instead of 0.
- 0.01 is small, but it is not zero, so a unit sitting on the negative side still receives a small update every step and can crawl back. That single change is the entire fix.

Honest advice: fix the step size first. LeakyReLU is what you reach for once you have measured dead units, not a default.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'ReLU and LeakyReLU, values and slopes',
      code: `def relu(z):
    return max(0.0, z)

def leaky(z):
    return z if z > 0.0 else 0.01 * z

for z in (-2.0, 0.5, 3.0):
    dr = 1.0 if z > 0.0 else 0.0
    dl = 1.0 if z > 0.0 else 0.01
    print('z =', z, ' relu =', relu(z), 'slope', dr, ' leaky =', round(leaky(z), 4), 'slope', dl)

# ---- real output ----
# z = -2.0  relu = 0.0 slope 0.0  leaky = -0.02 slope 0.01
# z = 0.5  relu = 0.5 slope 1.0  leaky = 0.5 slope 1.0
# z = 3.0  relu = 3.0 slope 1.0  leaky = 3.0 slope 1.0`,
      annotations: {
        1: 'Define ReLU.',
        2: 'max(0.0, z) returns whichever of the two is larger, which is exactly "negative becomes zero, positive stays put".',
        4: 'Define LeakyReLU.',
        5: '"z if z > 0.0 else 0.01 * z" is a Python conditional expression: it checks the test in the middle and the whole line becomes the left value when the test passes, the right value when it fails. So positives pass through and negatives are shrunk to a hundredth.',
        7: 'One negative input, one small positive, one larger positive.',
        8: 'ReLU\'s slope, written out by the same conditional-expression rule: 1.0 on the positive side, 0.0 on the negative side.',
        9: 'LeakyReLU\'s slope: 1.0 on the positive side, 0.01 on the negative side. This single line is the difference between a unit that can recover and one that cannot.',
        10: 'Print all four columns. On the top row, look at the two slopes: ReLU gives exactly 0.0 (no update, ever) and LeakyReLU gives 0.01 (small, but alive).',
      },
    },
    {
      type: 'intuition',
      title: 'GELU, briefly: a smooth ReLU',
      md: `GELU is what most transformer models use today, and the plain description is enough: **it is a smooth version of ReLU**. Instead of a hard corner at zero it curves, and instead of chopping negatives to exactly 0 it shrinks them toward 0 while letting a little through.

- The formula is f(z) = z x P(z), where P(z) is a number between 0 and 1 that grows as z grows. P(-2) = 0.023, P(0) = 0.5, P(3) = 0.999. So GELU keeps almost all of a big positive number, halves the input at zero, and keeps almost nothing of a big negative one.
- At **z = 3**: 3 x 0.99865 = **2.99595**, essentially the ReLU answer.
- At **z = -2**: -2 x 0.02275 = **-0.0455**, slightly negative rather than exactly 0.
- Its slope at z = -2 is **-0.085232** — small and non-zero, so there are no permanently dead units.
- The measured gain over ReLU is small: a fraction of a percentage point on large models. It is real and it repeats at scale, which is enough when a training run is expensive. For your own networks, ReLU is the right default.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'GELU and its slope',
      code: `import math

def gelu(z):
    return z * 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))

for z in (-2.0, 0.0, 0.5, 3.0):
    p = 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))
    bell = math.exp(-z * z / 2.0) / math.sqrt(2.0 * math.pi)
    print('z =', z, ' gelu =', round(gelu(z), 6), ' slope =', round(p + z * bell, 6))

# ---- real output ----
# z = -2.0  gelu = -0.0455  slope = -0.085232
# z = 0.0  gelu = 0.0  slope = 0.5
# z = 0.5  gelu = 0.345731  slope = 0.867495
# z = 3.0  gelu = 2.99595  slope = 1.011946`,
      annotations: {
        1: 'math again, for erf, exp and sqrt.',
        3: 'Define GELU.',
        4: 'math.erf is a standard-library function whose only job here is to build P(z): the expression 0.5 * (1 + erf(z / sqrt(2))) rises smoothly from 0 to 1 as z rises. Multiply the input by it and you have GELU.',
        6: 'Four inputs, including a negative one so the small non-zero output is visible.',
        7: 'P(z) on its own, so the print line can use it.',
        8: 'The bell-shaped curve that tells us how fast P is rising at this z. It is needed because GELU is a product of two things that both change, so its slope is (first x rate of second) + (second x rate of first).',
        9: 'Print value and slope. Read the slope column: -0.085 at z = -2 (small but not zero, so no dead units), and 1.01 at z = 3, which is the ReLU behaviour of passing the gradient straight through.',
      },
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `import math

SCALE = 1.0

z = 2.0 * SCALE
s = 1.0 / (1.0 + math.exp(-z))
t = math.tanh(z)
print('z             =', z)
print('sigmoid slope = %.6f' % (s * (1.0 - s)))
print('tanh slope    = %.6f' % (1.0 - t * t))
print('relu slope    = %.6f' % (1.0 if z > 0.0 else 0.0))`,
        precomputedOutput: `z             = 2.0
sigmoid slope = 0.104994
tanh slope    = 0.070651
relu slope    = 1.000000`,
        caption: 'Change SCALE to 3.0, then to 10.0, and run. At 3.0 the slopes are 0.002467 and 0.000025; at 10.0 both print 0.000000 while ReLU still prints 1.000000. That is saturation, measured rather than asserted.',
        annotations: {
          1: 'The standard-library math module, for math.exp and math.tanh.',
          3: 'The knob. Edit this one number and press run: 1.0, then 3.0, then 10.0.',
          5: 'The pre-activation we test. At SCALE = 1.0 it is z = 2.0; at SCALE = 10.0 it is z = 20.0, far out in the flat tail.',
          6: 'The sigmoid value at that z, from the same formula as before.',
          7: 'The tanh value at that z.',
          8: 'Print which z we are at, so the numbers below have a label.',
          9: 'The sigmoid slope, value x (1 - value). The %.6f is a formatting instruction meaning "print as a decimal with six digits after the point", and the % between the text and the brackets is what pastes the number into the text.',
          10: 'The tanh slope, 1 minus the value squared, printed the same way.',
          11: 'The ReLU slope: 1.0 whenever z is positive. It does not depend on how large z is, which is the whole point — turn SCALE up as far as you like and this line never changes.',
        },
      },
    },
    {
      type: 'intuition',
      title: 'Softmax belongs on the output, not in the middle',
      md: `Softmax is the odd one out, and it is not a hidden-layer activation at all. The activations above each take one number and return one number. Softmax takes a whole list of K scores and turns them into K probabilities that add up to 1 — one probability per class.

- Use it exactly once, on the final layer of a classifier that must pick one of K classes.
- Never in a hidden layer, because it forces the units to compete: they must sum to 1, so raising one output mathematically requires lowering the others. A hidden layer needs features that can all be strongly active at the same time.
- The details — the formula, the subtract-the-maximum trick that stops the arithmetic overflowing, and how it pairs with cross-entropy loss — are worked through with numbers in the Metrics module *Classification Losses: Cross-Entropy, Focal & Hinge*. That is the right place for it, because softmax only makes sense alongside the loss it is used with.

For this module, one line is enough: hidden layers get ReLU; the output layer gets whatever matches the answer shape, which is softmax for one-of-K classification, a single sigmoid for a yes/no question, and no activation at all for predicting a number.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: the same 4-layer network, three activations, by hand',
      md: `A 4-layer network. Every hidden unit happens to sit at pre-activation z = 2, and the gradient arriving from the loss is 1.0. We want the factor that reaches the first layer's weights, which is the product of one activation slope per layer. The step size is 0.01.

- **Sigmoid.** Slope at z = 2 is 0.104994. Four layers: 0.104994 x 0.104994 = 0.011024, x 0.104994 = 0.001157, x 0.104994 = **0.000122**. First-layer update: 0.01 x 0.000122 = 0.0000012.
- **Tanh.** Slope at z = 2 is 0.070651. Four layers: 0.070651 squared is 0.004992, squared again is **0.0000249**. Worse than sigmoid here, because at z = 2 tanh has already saturated further.
- **ReLU.** z = 2 is positive, so every slope is exactly 1. Four layers: 1 x 1 x 1 x 1 = **1.0**. First-layer update: 0.01 x 1.0 = 0.01.

The ReLU network moves its first layer about 8,000 times further per step than the sigmoid one, on exactly the same data with exactly the same step size. Now note what changes the sigmoid story: if every unit had sat at z = 0 instead of z = 2, the slope would be 0.25 and four layers would give 0.25^4 = 0.0039 — thirty times better. This is why keeping pre-activations near zero matters so much, and it is the whole motivation for the normalization layers in *Weight Init, BatchNorm vs LayerNorm*.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake, walked into on purpose',
      md: `A student builds a 10-layer network to classify images and puts sigmoid on every hidden layer, reasoning that sigmoid outputs look like probabilities and probabilities are easy to interpret. Training runs. Here is what the logs show and what it means.

- The loss falls quickly for the first few hundred steps, then flattens well above where it should be. Accuracy stops improving.
- They print the size of the gradient at each layer. Layer 10 shows about 0.01. Layer 1 shows about 0.000000001.
- **The diagnosis is in that gap.** Nine sigmoid slopes were multiplied together on the way back. Even in the impossible best case where every one of them is 0.25, that is 0.25^9 = 0.0000038. In reality the pre-activations drift away from zero, the slopes fall to around 0.1, and 0.1^9 = 0.000000001, which is exactly what the log shows.
- So the last two layers are training normally on top of the first eight layers, which are still at their random starting values and never move. The network is effectively a 2-layer model sitting on random noise, which is why the loss plateaus high rather than failing outright.
- **The reasoning was wrong too.** A hidden unit outputting 0.87 is not the probability of anything. It is a squashed intermediate number with no meaning attached. Probabilities are the job of the output layer.
- **The fix:** ReLU on all ten hidden layers. Every active unit contributes a slope of exactly 1, the product stays at 1 through any depth, and layer 1 receives the same gradient magnitude as layer 10.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Pen and paper. All the arithmetic is small on purpose; e^-1 = 0.367879 and e^-3 = 0.049787 are the only two constants you need.

1. Two layers, no activation: layer 1 multiplies by 4 and adds 2, layer 2 multiplies by 0.5 and subtracts 3. Write the single equivalent layer, then check both forms at x = 6.
2. Compute sigmoid at z = 1 and its slope there. Then compute the slope at z = 3. By what factor did the slope shrink?
3. A 5-layer network, every activation slope equal to 0.2. What factor reaches layer 1? Repeat for ReLU with every unit active. How many times larger is the ReLU update?
4. A ReLU unit has weight 0.5 and bias -4, and every input in the dataset lies between 0 and 6. Is this unit dead? Show why, and state what LeakyReLU would give as its slope.
5. Someone puts softmax on a hidden layer of 3 units and reports that whenever one feature grows the other two shrink. Explain in two sentences why that is guaranteed, not a coincidence.`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `Check every step, not just the final number.

1. 0.5 x (4x + 2) - 3 = 2x + 1 - 3 = **2x - 2**. At x = 6: layer 1 gives 26, layer 2 gives 0.5 x 26 - 3 = **10**; the single layer gives 2 x 6 - 2 = **10**. Same answer, so the second layer added no new behaviour.
2. At z = 1: 1 / (1 + 0.367879) = 1 / 1.367879 = **0.731059**, slope = 0.731059 x 0.268941 = **0.196612**. At z = 3: 1 / 1.049787 = **0.952574**, slope = 0.952574 x 0.047426 = **0.045177**. The slope shrank by 0.196612 / 0.045177 = about **4.4 times**, from moving the input just two steps to the right.
3. 0.2^5 = 0.00032. ReLU gives 1^5 = 1. The ReLU update is 1 / 0.00032 = **3,125 times larger** on the same data with the same step size.
4. The pre-activation is z = 0.5 x input - 4. The largest input is 6, giving z = 3 - 4 = **-1**, and the smallest gives -4. So z is negative for every input, the ReLU slope is 0 every time, the weights never update, and the unit is **dead** — permanently, because nothing can change z. LeakyReLU would give slope **0.01** there, small but non-zero, so the unit keeps receiving updates and can climb back above zero.
5. Softmax divides every output by the sum of all the outputs, so the three are forced to add to exactly 1. That is a fixed budget: one of them can only take a larger share if the others give up the same amount, which makes the units compete instead of representing independent features.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands alone. This section only names things so the words are familiar when you meet them later.

- **PReLU and ELU.** Two more variations on the same idea as LeakyReLU. PReLU makes the 0.01 slope a value the network learns instead of a fixed constant. ELU uses a smooth curve on the negative side that flattens out at a small negative value. Neither reliably beats plain ReLU on benchmarks.
- **SiLU, also called Swish.** f(z) = z x sigmoid(z). Almost the same shape as GELU and slightly cheaper, used in the Llama family of models. If you understand GELU as a smooth ReLU, you understand this one too.
- **Exploding gradients.** The opposite failure. If the per-layer factors are larger than 1 instead of smaller, the product grows instead of shrinking, and the weights jump to enormous values or to NaN. The standard fix is gradient clipping: cap the size of the update before applying it.
- **Where the pre-activations sit is a decision, not luck.** The worked case showed sigmoid doing thirty times better at z = 0 than at z = 2. Normalization layers exist to keep pre-activations near zero on purpose, and the usual ordering is linear layer, then normalization, then activation. That is the subject of *Weight Init, BatchNorm vs LayerNorm*.
- **Residual connections.** A different escape route from vanishing gradients: give the gradient a path that skips the layers entirely, so it arrives at depth undiminished no matter what the activations did. This is why networks with hundreds of layers became possible.`,
    },
  ],
  quiz: [
    {
      question: 'Layer 1 computes 3x + 1 and layer 2 computes -2h + 5, with no activation between them. What is the network?',
      options: [
        { text: 'A curve, because two layers can bend the input', explanation: 'Bending requires something non-linear. Both layers only multiply and add, and doing that twice still only multiplies and adds.' },
        { text: 'The single layer -6x + 3', explanation: 'Correct. -2(3x + 1) + 5 = -6x + 3, and both forms give -9 at x = 2. The second layer added no behaviour the first did not already have.' },
        { text: 'Twice as expressive as one layer, because it has twice the parameters', explanation: 'It has four numbers of settings but only two of them are independent — every setting of the pair is reachable by some single layer.' },
        { text: 'Undefined without an activation function', explanation: 'It computes perfectly well. The problem is not that it fails, it is that it is no more powerful than one layer.' },
      ],
      correct: 1,
    },
    {
      question: 'Sigmoid\'s slope is 0.25 at z = 0, 0.104994 at z = 2, and 0.002467 at z = 6. What is this pattern called and why does it matter?',
      options: [
        { text: 'Saturation: the function flattens away from zero, so its slope approaches zero, and those slopes multiply together across layers', explanation: 'Correct. Six layers at slope 0.104994 give a factor of 0.00000134 reaching layer 1, so its weights barely move.' },
        { text: 'Overfitting: the model has memorised the training data', explanation: 'Overfitting is about how a trained model behaves on new data. This is a property of the activation function itself, before any data is involved.' },
        { text: 'Normalisation: the outputs are being rescaled into a fixed range', explanation: 'Sigmoid does map into 0 to 1, but the name for the flat tails and their near-zero slopes is saturation.' },
        { text: 'A dead neuron: the unit has stopped responding', explanation: 'A dead neuron is the ReLU failure, where the slope is exactly 0 and can never recover. Sigmoid slopes are small but never exactly zero.' },
      ],
      correct: 0,
    },
    {
      question: 'Why does a near-zero activation slope stop a layer from learning?',
      options: [
        { text: 'It makes the loss function undefined', explanation: 'The loss computes fine. The problem is in the size of the update, not in whether it can be computed.' },
        { text: 'It makes the model output zero', explanation: 'The slope and the output are different numbers. Sigmoid at z = 6 outputs 0.997527 while its slope is 0.002467.' },
        { text: 'Each weight moves by (step size) x (gradient), and that gradient is a product of one slope per layer, so near-zero slopes multiply into a near-zero update', explanation: 'Correct. With slopes of 0.1 across nine layers the factor is 0.000000001, and multiplying that by a step size of 0.01 gives an update indistinguishable from zero.' },
        { text: 'Small slopes make training unstable and the loss jumps around', explanation: 'That is the opposite failure, caused by factors larger than 1 (exploding gradients) or too large a step size.' },
      ],
      correct: 2,
    },
    {
      question: 'A ReLU unit has weight 0.5 and bias -4, and every input lies between 0 and 6. What happens to it during training?',
      options: [
        { text: 'It learns slowly but recovers, because the gradient is small rather than zero', explanation: 'That describes sigmoid saturation. ReLU\'s slope below zero is exactly 0.0, not small.' },
        { text: 'Its pre-activation is at most -1, so its slope is always exactly 0, its weights never update, and it stays that way forever', explanation: 'Correct. z = 0.5 x 6 - 4 = -1 at best. Zero gradient means zero update means z stays negative: a closed loop with no exit. That is a dead neuron.' },
        { text: 'It saturates near 1 and stops responding', explanation: 'ReLU has no upper limit and never saturates on the positive side. The failure is on the negative side.' },
        { text: 'It outputs a negative number that the next layer corrects', explanation: 'ReLU outputs exactly 0 for negative inputs, never a negative number.' },
      ],
      correct: 1,
    },
    {
      question: 'What exactly does LeakyReLU change, and what does that buy?',
      options: [
        { text: 'It bounds the output to the range -1 to 1, so activations cannot explode', explanation: 'That is tanh. LeakyReLU is unbounded above, exactly like ReLU.' },
        { text: 'It smooths the corner at zero, so the function is differentiable everywhere', explanation: 'It still has a corner at zero — the slope jumps from 0.01 to 1.0. Smoothing the corner is what GELU does.' },
        { text: 'It replaces the slope of 0 below zero with 0.01, so a unit on the negative side still receives a small update every step and can recover', explanation: 'Correct, and that is the whole change: one constant. It is a fix to reach for after measuring dead units, not a default — check the step size first.' },
        { text: 'It learns the negative slope from the data instead of fixing it', explanation: 'That is PReLU. LeakyReLU\'s 0.01 is a fixed constant.' },
      ],
      correct: 2,
    },
    {
      question: 'Where does softmax belong, and why not in a hidden layer?',
      options: [
        { text: 'On the output layer only, because it forces the units to sum to 1, so raising one output requires lowering the others', explanation: 'Correct. Hidden layers need features that can all be strongly active at once, not units competing for a fixed budget of 1.0.' },
        { text: 'Anywhere, since it is smooth and differentiable everywhere', explanation: 'It is smooth, which is not the objection. The objection is that it couples all the units in the layer together.' },
        { text: 'On hidden layers, because it makes the features interpretable as probabilities', explanation: 'A hidden number between 0 and 1 is not the probability of anything, and forcing the units to compete removes information the next layer needed.' },
        { text: 'On the output layer, because it is the only activation with a non-zero slope there', explanation: 'Plenty of activations have non-zero slopes. Softmax is used on the output because it produces one probability per class that add to 1.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why do we need activation functions at all? Prove it.',
      answer:
        'Without one, a stack of layers is exactly one layer. Take layer 1 as 3x + 1 and layer 2 as -2h + 5. Substituting gives -2(3x + 1) + 5 = -6x + 3, a single weight and a single bias. At x = 2 both forms give -9. The same substitution works for matrices: layer 2 applied to layer 1 is (W2 W1)x + (W2 b1 + b2), which is one matrix and one vector, so any depth collapses to one linear map. That means a hundred-layer network with no activations can only draw straight-line decision boundaries and cannot represent XOR, which a two-layer network with one non-linearity can. The activation is a small non-linear function applied to each number between layers, and it is the only reason depth adds expressive power.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through the vanishing-gradient problem with actual numbers.',
      answer:
        'The gradient reaching an early layer is a product with one activation slope per layer. Sigmoid\'s slope is f(z)(1 - f(z)), which is 0.25 at its very best (z = 0) and 0.104994 at z = 2. Take a 6-layer stack with every unit at z = 2: the factor reaching layer 1 is 0.104994 to the sixth power, which is 0.00000134. With a step size of 0.01 the first layer moves by about a hundred-millionth per step, which is no learning. Even the impossible best case of 0.25 every layer gives 0.25^10 = 0.00000095 at ten layers. Meanwhile the last layer is multiplied by only one such factor and trains normally, so the loss falls a little and then plateaus. ReLU fixes it because an active unit has slope exactly 1, so the product is 1 at any depth.',
      isCaseBased: false,
    },
    {
      question: 'Case: you inherit a 30-layer network. Training loss drops for 200 steps then flatlines high. Per-layer gradient sizes read 1e-2 at the last layer and 1e-9 at the first. Diagnose and fix, in order.',
      answer:
        'That spread across depth is the diagnosis: vanishing gradients, seven orders of magnitude. Fix in cost order. First, check the activations — if the hidden layers use sigmoid or tanh, swap to ReLU. That alone usually fixes it and costs nothing, because an active ReLU unit contributes a slope of exactly 1 instead of something at or below 0.25. Second, check the starting weights: if they are drawn too small, each layer shrinks the signal on the way forward and the gradient on the way back, so use an initialisation scaled to the layer width. Third, add normalization so pre-activations stay near zero, which is where every activation has its largest slope — the same numbers show sigmoid being thirty times better at z = 0 than at z = 2. Fourth, add residual connections, which give the gradient a path that skips layers entirely and arrive at layer 1 undiminished; that is what made networks of this depth routine. Only then consider using fewer layers. Tradeoff to state: normalization and residuals add compute, and normalization behaves differently at training and test time, but at 30 layers you are not training without them.',
      isCaseBased: true,
    },
    {
      question: 'Case: after an aggressive step-size sweep, 45% of one layer\'s units output exactly 0.0 on every batch and validation accuracy sits 6 points below baseline. Walk through it.',
      answer:
        'First confirm it is really dead units and not healthy sparsity. Log, per unit, the fraction of batches where the output is zero: a unit that is zero on every batch is dead, a unit that is zero on half of them is doing its job. Then find the cause. The aggressive step-size sweep is the prime suspect: one oversized update drives a bias far negative, the pre-activation is then negative for every input, ReLU\'s slope there is exactly 0, so the update is zero and the unit can never climb back. Confirm by inspecting the biases of the zero units — large negative values are the signature. Retrain at a tenth of the step size and re-measure the dead fraction; that usually recovers most of the capacity. A warmup period, where the step size starts tiny and grows, prevents the single catastrophic early step. If dead units survive all that, switch to LeakyReLU so the negative side has slope 0.01 instead of 0, and add normalization before the activation to keep pre-activations centred. State the tradeoff honestly: LeakyReLU adds a constant to tune and shows no reliable accuracy gain on healthy networks, so it is a repair and not a default, while a smaller step size costs wall-clock time. Fix the step size first.',
      isCaseBased: true,
    },
    {
      question: 'ReLU has no slope at zero and zero slope for all negative inputs. Why is it still the default?',
      answer:
        'Both objections are real and both are cheap to live with. The corner at exactly zero: a pre-activation being bit-exactly 0.0 in floating point essentially never happens, and every framework simply defines the slope there as 0, which is a valid choice. The zero slope below zero: it does cause dead units, but that is usually a symptom of too large a step size rather than of ReLU, and it buys something in exchange — roughly half the units output exactly 0, which is cheap to compute and store. Against those costs, an active ReLU unit passes the gradient through at exactly 1, so depth costs nothing, and the forward pass is one comparison rather than an exponential and a division. Smoother alternatives such as GELU and ELU remove the theoretical blemishes and buy a fraction of a percentage point at best.',
      isCaseBased: false,
    },
    {
      question: 'What is a dead neuron, exactly, and why can it not recover?',
      answer:
        'A ReLU unit whose pre-activation is negative for every example in the dataset. Its output is 0 for every example, and more importantly its slope is exactly 0 for every example. The weight update is step size times gradient, the gradient contains that slope as a factor, so the update is exactly zero. The weights therefore never change, so the pre-activation stays negative, so the slope stays zero. It is a closed loop with no exit, and the unit is permanently removed from the network — this is different from sigmoid saturation, where the slope is tiny but non-zero and recovery is merely slow. The usual causes are a step size large enough that one update drives the bias far negative, or a starting bias already too negative. Concrete check: weight 0.5 and bias -4 with inputs in the range 0 to 6 gives a pre-activation of at most -1, so that unit is dead from the start.',
      isCaseBased: false,
    },
    {
      question: 'Why do transformers use GELU rather than ReLU? Be honest about the size of the effect.',
      answer:
        'GELU is a smooth ReLU. It multiplies the input by a number between 0 and 1 that grows with the input, so a large positive value passes through nearly untouched (at z = 3 it gives 2.99595), zero is halved, and a negative value is shrunk but not chopped off (at z = -2 it gives -0.0455 rather than 0). Two practical consequences: there is no corner in the function, and the slope on the negative side is small but non-zero — -0.085 at z = -2 — so units cannot die the way ReLU units do. Empirically the gain over ReLU on transformer benchmarks is small, commonly a fraction of a point, but it is consistent and it holds at scale, which is worth an extra exponential when a training run is expensive. SiLU, also called Swish, is z times sigmoid(z) and is the near-identical, slightly cheaper sibling. For a network you are writing yourself, ReLU remains the right default.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague swaps every hidden ReLU for sigmoid in a 4-layer network "because probabilities are more interpretable". Training accuracy drops from 94% to 78%. Explain what happened, and what interpretability they actually gained.',
      answer:
        'Three sigmoid slopes now multiply on the way back to layer 1. Even at sigmoid\'s best slope of 0.25 that is 0.0156, and realistically the pre-activations drift away from zero — at z = 2 the slope is 0.105, giving 0.00116 — so the early layers receive roughly a thousandth of the gradient the late layers get and barely move within the same training budget. The network becomes a shallow model sitting on nearly untrained early features. Four layers is shallow enough that the early layers are slowed rather than frozen, which is exactly why the result is a 16-point degradation instead of total failure. There is a second, smaller cost: sigmoid outputs are always positive, so every weight in the next layer receives an update in the same direction and the optimiser zig-zags toward the answer instead of going straight. As for interpretability, they gained none. A hidden unit outputting 0.87 is not the probability of anything — it is an intermediate number that happens to have been squashed into a range, with no calibration and no meaning attached. Probabilities are the job of the output layer. Fix: revert to ReLU on all hidden layers, and if probabilities are wanted, put a sigmoid or softmax on the output.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Why any activation at all?', back: 'Two layers with no activation collapse: -2(3x + 1) + 5 = -6x + 3, one weight and one bias. Any depth of linear layers is one linear layer. The activation is the non-linear bend that makes depth worth having.' },
    { front: 'Sigmoid: value and slope', back: 'f(z) = 1 / (1 + e^-z), range 0 to 1. Slope = f(z)(1 - f(z)). At z = 0: 0.5 and slope 0.25 (its largest ever). At z = 2: 0.880797, slope 0.104994. At z = 6: slope 0.002467.' },
    { front: 'Saturation', back: 'The function flattens, so its output stops responding to its input and its slope approaches zero. Sigmoid and tanh both saturate in their tails; ReLU never does on the positive side.' },
    { front: 'Vanishing gradient, with numbers', back: 'The gradient is a product of one activation slope per layer. Six layers at slope 0.104994 give 0.00000134. Times a step size of 0.01, the first layer moves by a hundred-millionth per step: no learning.' },
    { front: 'Tanh', back: 'Range -1 to 1, slope = 1 - f(z)^2. Slope 1.0 at z = 0 (four times sigmoid\'s best) but only 0.070651 at z = 2 — it saturates harder. Outputs straddle zero, which removes sigmoid\'s zig-zag problem.' },
    { front: 'Why ReLU won', back: 'max(0, z). Slope is exactly 1 for every positive input, so six layers multiply to 1 and depth costs nothing. Costs one comparison — no exponential, no division. Slope is exactly 0 for negatives.' },
    { front: 'Dead neuron + LeakyReLU', back: 'Pre-activation negative for every example, so slope 0, so update 0, so it stays negative — permanent. Cause: step size too large. LeakyReLU uses 0.01 x z below zero, so the slope is 0.01 not 0 and the unit can crawl back.' },
    { front: 'GELU, and where softmax goes', back: 'GELU is a smooth ReLU: at z = 3 it gives 2.99595, at z = -2 it gives -0.0455 with slope -0.085, so no dead units. Gain over ReLU is a fraction of a point. Softmax is an output-layer function only — it forces the units to sum to 1, so they compete.' },
  ],
  mindmapMarkdown: `- Activation Functions
  - Why they exist
    - -2(3x + 1) + 5 = -6x + 3, so stacked linear layers are one layer
    - the activation is the non-linear bend between layers
  - The slope is what matters
    - update = step size x gradient
    - gradient = product of one activation slope per layer
  - Sigmoid
    - 1/(1+e^-z), range 0 to 1
    - slope f(1-f): 0.25 at z=0, 0.105 at z=2, 0.0025 at z=6
    - six layers at 0.105 -> 0.00000134, vanishing gradient
  - Tanh
    - range -1 to 1, slope 1 - f^2
    - 1.0 at z=0 but 0.0707 at z=2, saturates harder
    - outputs straddle zero, no zig-zag
  - ReLU
    - max(0, z), slope exactly 1 when active
    - six layers -> 1.0, depth is free
    - one comparison to compute
    - dead neuron: z<0 always -> slope 0 -> update 0 -> forever
    - cause: step size too large
  - LeakyReLU
    - 0.01 x z below zero, slope 0.01 not 0
    - dead unit can crawl back
    - use after measuring dead units, not by default
  - GELU
    - smooth ReLU: 2.99595 at z=3, -0.0455 at z=-2
    - slope -0.085 at z=-2, so no dead units
    - fraction of a point better, used in transformers
  - Softmax
    - output layer only, K scores to K probabilities summing to 1
    - hidden layers would be forced to compete
    - details in Classification Losses`,
}

export default m
