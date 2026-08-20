import type { Module } from '../types'

const m: Module = {
  id: 'dl-l0-backpropagation',
  subjectId: 'dl',
  level: 0,
  title: 'Backpropagation: The Chain Rule on a Graph',
  whyItMatters:
    'A network has one number at the end saying how wrong it is, and thousands of adjustable numbers inside. To improve, every one of those numbers needs its own slope: if I nudge this one, how much does the wrongness change? Backpropagation computes all of them in a single sweep from the end of the network back to the start. This module builds that sweep by hand on a network with six weights, in plain Python, and then checks the answer by measuring it directly.',
  assumes: [
    'Read the Math module **Slopes, Derivatives & the Gradient** first. Derivative, slope at a point, partial derivative, gradient and the chain rule are all defined there, and this module uses them without re-deriving them.',
    'Read the DL module **From Perceptron to MLP** first. You should know that a neuron computes a weighted sum and then passes it through a squashing function, and why a network needs a hidden layer at all.',
    'Basic Python: lists, indexing, a for loop, a function, and print.',
    'No calculus notation beyond what the Math module taught. No numpy at all — every snippet here is plain Python lists and loops.',
  ],
  estMinutes: 45,
  sections: [
    {
      type: 'intuition',
      title: 'One number at the end, a pile of dials inside',
      md: `Training is the loop you already know from gradient descent: predict, measure how wrong you were, nudge every weight a little downhill, repeat. The nudge needs a slope for **every single weight**.

- A tiny network with 2 inputs, 2 hidden units and 1 output has 6 weights and 3 biases. Nine numbers.
- ResNet-50, a standard image model, has 25 million. Large language models have hundreds of billions.
- The wrongness, called the **loss**, is ONE number, computed at the very end of the network.
- Every weight, however early and however deep, helped produce that one number.
- So the question is concrete: *how much would the loss change if I nudged this one weight?* — asked once per weight, on every batch of data, for every training step.

Get all those slopes cheaply and you can train anything. That is the whole job of this module.`,
    },
    {
      type: 'intuition',
      title: 'The obvious method, and why it is hopeless',
      md: `Obvious plan: to find the slope for one weight, nudge it by a tiny amount, run the whole network again, see how much the loss moved, divide. That is exactly the measure-the-slope method from the Math module, and it works perfectly.

- Cost for one weight: one full run of the network (two runs, if you nudge both directions to be accurate).
- ResNet-50 has 25 million weights, so that is 25 million runs to take ONE step.
- At an optimistic 1000 runs per second, one step takes about 7 hours. Training needs millions of steps.
- The cost is wrong in a structural way: it grows with the number of weights, and weights are the thing we keep adding.
- Backprop gets every one of those slopes in **one sweep backwards through the network**, costing roughly as much as a single forward run. Not by a trick — by not throwing away work it already did.

Hold onto the slow method anyway. At the end of this module it comes back as a *checker*: run it on one weight and see whether backprop gave the same answer.`,
    },
    {
      type: 'intuition',
      title: 'Blame assignment: the whole idea in one picture',
      md: `A restaurant serves a bad dish. The customer complains once, at the door. That single complaint is the loss.

- The manager does not re-cook every dish in the kitchen to find the culprit. He asks the chef one question: *how much of this was you?*
- The chef splits his share of the blame among his own inputs: mostly the sauce, a little the pan.
- The sauce station splits its share again: mostly the salt, a little the stock.
- Blame flows **backwards**, and each station needs only two things: the blame handed to it from downstream, and how sensitive its own output was to each of its own inputs.
- Nobody ever sees the whole restaurant. One walk from the door back into the kitchen, and every station knows its bill.

That is backpropagation. The loss is measured at the output, and each layer asks the layer before it: *how much of this error was your doing?*`,
    },
    {
      type: 'hinglish',
      md: `Ek dish kharab bani. Customer ne shikayat sirf **darwaze pe** ki — wahi hai loss. Ab manager poori kitchen dobara nahi banata; wo chef se poochta hai, chef sauce wale se, sauce wala namak wale se. Har banda sirf apne hisse ka blame aage badhata hai.

Backprop bilkul yahi hai: **galti output pe napi gayi, phir peeche har weight se poocha gaya — tera kitna haath tha is galti me?** Har layer ke paas do hi cheezein hoti hain: upar se aaya hua blame, aur apna chhota sa local slope. Dono ko multiply karo, peeche pass kar do. Ek hi backward chakkar me poore network ka hisaab saaf.`,
    },
    {
      type: 'intuition',
      title: 'The five words this module runs on',
      md: `Five terms, defined now, used everywhere below. None of them is more than one sentence.

- **Forward pass** — running the network from input to output: each layer computes its weighted sum, squashes it, and hands the result to the next layer. It ends with a prediction and a loss.
- **Backward pass** — walking the same network in reverse, from the loss back to the input, computing one slope per weight along the way. That is backpropagation.
- **Local gradient** — how much one single operation's output changes when its own input changes. A one-line fact about that operation alone. Squaring has one, adding has one, relu has one. Nothing local knows about the rest of the network.
- **Delta**, also called the **error signal** — the blame that has arrived at one particular spot in the network. Written δ. Concretely, δ at a spot is the slope of the loss with respect to the number sitting at that spot.
- **Parameter update** — the last step: each weight moves a small distance against its own slope. w becomes w − α × (slope of loss for w), where α is the step size. This is plain gradient descent; backprop only supplies the slopes.

And one recalled from the Math module, not re-derived here: the **chain rule**. When one quantity feeds another, you **multiply** the two slopes along the path. That is the only operation backprop performs.`,
    },
    { type: 'visual', component: 'NeuralNetForward', props: {} },
    {
      type: 'note',
      md: 'Run the forward pass above and change a weight. Two things to notice, because both matter shortly. First, every neuron does the same two steps: a weighted sum (call it **z**), then a squashing function (call the result **a = f(z)**). Second, those intermediate z and a values are sitting there on screen — the network computed them and is keeping them. It has to. The backward pass will need every one of them.',
    },
    {
      type: 'math',
      intro:
        'One hidden layer, one output, a label that is 0 or 1. This is the forward pass in symbols — nothing new, just names so the derivation has vocabulary. W is a weight matrix, b a bias, relu(z) = max(0, z), and sigma is the sigmoid that squashes any number into the range 0 to 1.',
      latex: [
        'z^{[1]} = W^{[1]} x + b^{[1]} \\qquad a^{[1]} = \\mathrm{relu}(z^{[1]})',
        'z^{[2]} = W^{[2]} a^{[1]} + b^{[2]} \\qquad \\hat{y} = \\sigma(z^{[2]}) = \\frac{1}{1 + e^{-z^{[2]}}}',
        '\\mathcal{L} = -\\left[\\, y \\log \\hat{y} + (1-y)\\log(1-\\hat{y}) \\,\\right] \\quad \\text{(binary cross-entropy)}',
      ],
    },
    {
      type: 'math',
      intro:
        'The same forward pass with real numbers, because the backward numbers below have to hang on something. The input x has 2 features, the hidden layer has 2 units, and the true label is 1. Every number in this module comes from this one example.',
      latex: [
        'x = \\begin{bmatrix} 1 \\\\ 2 \\end{bmatrix}, \\quad W^{[1]} = \\begin{bmatrix} 0.5 & -0.5 \\\\ 1.0 & 0.5 \\end{bmatrix}, \\quad b^{[1]} = 0, \\quad W^{[2]} = \\begin{bmatrix} 1.0 & -0.5 \\end{bmatrix}, \\quad b^{[2]} = 0.25, \\quad y = 1',
        'z^{[1]} = \\begin{bmatrix} -0.5 \\\\ 2.0 \\end{bmatrix} \\;\\to\\; a^{[1]} = \\begin{bmatrix} 0 \\\\ 2.0 \\end{bmatrix} \\;\\to\\; z^{[2]} = -0.75 \\;\\to\\; \\hat{y} = 0.3208 \\;\\to\\; \\mathcal{L} = 1.1369',
        '\\text{The label is 1 and we predicted 0.32. We are wrong, and now we find out whose fault it is.}',
      ],
    },
    {
      type: 'intuition',
      title: 'The first step back, and a cancellation worth watching',
      md: `Start at the loss and walk one step backwards, to z⁽²⁾ — the number just before the sigmoid.

- The chain rule says: slope of L with respect to z⁽²⁾ = (slope of L with respect to ŷ) × (slope of ŷ with respect to z⁽²⁾). Two factors, multiplied, exactly as the Math module showed.
- The first factor, for cross-entropy loss, has ŷ(1−ŷ) sitting in its **denominator**.
- The second factor, the sigmoid's own local gradient, is exactly ŷ(1−ŷ).
- They cancel. What survives is **ŷ − y**: prediction minus truth, and nothing else.
- Call it **δ_out**, the delta at the output. It is the blame that starts the whole backward journey.

This cancellation is a design decision, not luck. Sigmoid is nearly flat when ŷ is close to 0 or 1, so its local gradient ŷ(1−ŷ) is tiny there — and "confidently wrong" is exactly when you most want a big update. Cross-entropy is built with that flatness in its denominator precisely so it cancels out. The next line shows the cancellation written out.`,
    },
    {
      type: 'math',
      intro:
        'The cancellation, then the rest of the backward pass. Read every line the same way: local gradient × the delta that arrived. The circled dot means multiply element by element, and the superscript T means the matrix is flipped so the same connections are read in the other direction.',
      latex: [
        '\\frac{\\partial \\mathcal{L}}{\\partial \\hat{y}} = \\frac{\\hat{y} - y}{\\hat{y}(1-\\hat{y})} \\qquad \\frac{\\partial \\hat{y}}{\\partial z^{[2]}} = \\hat{y}(1-\\hat{y})',
        '\\delta_{\\text{out}} \\equiv \\frac{\\partial \\mathcal{L}}{\\partial z^{[2]}} = \\frac{\\hat{y} - y}{\\hat{y}(1-\\hat{y})} \\cdot \\hat{y}(1-\\hat{y}) = \\hat{y} - y',
        '\\frac{\\partial \\mathcal{L}}{\\partial W^{[2]}} = \\delta_{\\text{out}} \\; a^{[1]\\top} \\qquad \\frac{\\partial \\mathcal{L}}{\\partial b^{[2]}} = \\delta_{\\text{out}}',
        '\\delta_{\\text{hidden}} = \\left( W^{[2]\\top} \\delta_{\\text{out}} \\right) \\odot \\mathrm{relu}^{\\prime}(z^{[1]}), \\qquad \\mathrm{relu}^{\\prime}(z) = 1 \\text{ if } z > 0, \\text{ else } 0',
        '\\frac{\\partial \\mathcal{L}}{\\partial W^{[1]}} = \\delta_{\\text{hidden}} \\; x^{\\top} \\qquad \\frac{\\partial \\mathcal{L}}{\\partial b^{[1]}} = \\delta_{\\text{hidden}}',
      ],
    },
    {
      type: 'math',
      intro: 'The same five lines with the numbers from the forward pass above. Every value here is one multiplication away from the one before it — no new ideas, only arithmetic.',
      latex: [
        '\\delta_{\\text{out}} = 0.3208 - 1 = -0.6792',
        '\\frac{\\partial \\mathcal{L}}{\\partial W^{[2]}} = -0.6792 \\cdot \\begin{bmatrix} 0 & 2.0 \\end{bmatrix} = \\begin{bmatrix} 0 & -1.3584 \\end{bmatrix}',
        '\\delta_{\\text{hidden}} = \\underbrace{\\begin{bmatrix} -0.6792 \\\\ 0.3396 \\end{bmatrix}}_{W^{[2]\\top}\\delta_{\\text{out}}} \\odot \\underbrace{\\begin{bmatrix} 0 \\\\ 1 \\end{bmatrix}}_{\\mathrm{relu}^{\\prime}(z^{[1]})} = \\begin{bmatrix} 0 \\\\ 0.3396 \\end{bmatrix}',
        '\\frac{\\partial \\mathcal{L}}{\\partial W^{[1]}} = \\begin{bmatrix} 0 \\\\ 0.3396 \\end{bmatrix} \\begin{bmatrix} 1 & 2 \\end{bmatrix} = \\begin{bmatrix} 0 & 0 \\\\ 0.3396 & 0.6792 \\end{bmatrix}',
      ],
    },
    {
      type: 'note',
      md: 'Look at the zeros. Hidden unit 1 had z = −0.5, so relu switched it off and its output was 0 — and its entire row of slopes is zero. **A neuron that contributed nothing to the prediction receives no blame and gets no update.** That is relu\'s local gradient (1 when the unit is on, 0 when it is off) doing its job. It is also the mechanism behind the "dying relu" problem: a unit that is off for every sample in the dataset never receives a slope again, so it never comes back.',
    },
    {
      type: 'note',
      md: 'Now say the pattern out loud, because it is the whole module in two sentences. **Every slope is (local gradient) × (delta arriving from downstream).** And **every weight slope is (delta at this layer) × (the value that fed into it)** — compare the two lines above: ∂L/∂W2 uses δ_out times a1, and ∂L/∂W1 uses δ_hidden times x. Same rule, different names. If you can recite those two sentences and point at where each factor came from, you can derive backprop for any layer anyone puts on a whiteboard.',
    },
    {
      type: 'note',
      md: 'In the stepper below, each frame is **one chain-rule multiplication**: watch a number arrive from the right, get multiplied by a local gradient sitting on a node, and continue left. Nothing else happens — there is no second operation in backprop. The last frames switch to the update: each weight moves against its own slope, and the loss for that input drops. Step through it twice, once watching the deltas and once watching the weights change.',
    },
    { type: 'visual', component: 'BackpropStepper', props: {} },
    {
      type: 'intuition',
      title: 'Now build it, one stage at a time',
      md: `The next seven snippets are one network and one training step, split so that no snippet holds more than a few new ideas. They run in order and share their variables, like lines typed one after another into the same Python session.

- Plain lists and loops. No library except \`math\`, for the exponential and the logarithm.
- Every number matches the hand arithmetic above, so you can check the code against the maths at every stage.
- Stage 1 and 2 are the forward pass. Stage 3 and 4 are the backward pass. Stage 5 checks the answer. Stage 6 updates the weights and stage 7 shows the loss falling.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 1: the network\'s numbers, and the hidden layer',
      code: `import math

x = [1.0, 2.0]
y = 1.0
W1 = [[0.5, -0.5], [1.0, 0.5]]
b1 = [0.0, 0.0]
W2 = [1.0, -0.5]
b2 = 0.25

z1 = [W1[0][0] * x[0] + W1[0][1] * x[1] + b1[0],
      W1[1][0] * x[0] + W1[1][1] * x[1] + b1[1]]
a1 = [max(0.0, z1[0]), max(0.0, z1[1])]
print('z1 =', z1[0], z1[1])
print('a1 =', a1[0], a1[1])

# ---- real output ----
# z1 = -0.5 2.0
# a1 = 0.0 2.0`,
      annotations: {
        1: 'Imports the math module, which we need for exp (the exponential, used by sigmoid) and log (the logarithm, used by the loss). Nothing else is imported anywhere in this module.',
        3: 'The one input example: two features, worth 1.0 and 2.0.',
        4: 'Its true label. 1.0 means this example belongs to the positive class.',
        5: 'The first layer\'s weights, as a list of two rows. Row 0 is hidden unit 0\'s two weights; row 1 is hidden unit 1\'s. So W1[1][0] is the weight from input feature 0 into hidden unit 1.',
        6: 'One bias per hidden unit, both starting at zero. A bias is added to the weighted sum regardless of the input.',
        7: 'The second layer has one output neuron reading two hidden units, so it needs just two weights — a flat list, not a list of rows.',
        8: 'The output neuron\'s single bias.',
        10: 'Hidden unit 0\'s weighted sum: each weight times its matching input, added up, plus the bias. That is 0.5(1.0) + (-0.5)(2.0) + 0 = -0.5.',
        11: 'The same sum for hidden unit 1: 1.0(1.0) + 0.5(2.0) + 0 = 2.0. The two lines together build the list z1, which is why line 10 ends with a comma and no closing bracket.',
        12: 'Apply relu to each weighted sum. relu(z) is max(0, z): keep the number if it is positive, otherwise return 0. Unit 0 gets 0.0 because its sum was negative; unit 1 keeps 2.0.',
        13: 'Print both weighted sums. Check them against the hand arithmetic above: -0.5 and 2.0.',
        14: 'Print both activations. The 0.0 here is unit 0 being switched off by relu, and that zero is going to matter in stage 4.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 2: the output, the prediction, and the loss',
      code: `z2 = W2[0] * a1[0] + W2[1] * a1[1] + b2
yhat = 1.0 / (1.0 + math.exp(-z2))
loss = -(y * math.log(yhat) + (1 - y) * math.log(1 - yhat))
print('z2   =', round(z2, 4))
print('yhat =', round(yhat, 4))
print('loss =', round(loss, 4))

# ---- real output ----
# z2   = -0.75
# yhat = 0.3208
# loss = 1.1369`,
      annotations: {
        1: 'The output neuron\'s weighted sum, built exactly like the hidden ones but reading a1 instead of x: 1.0(0.0) + (-0.5)(2.0) + 0.25 = -0.75.',
        2: 'The sigmoid: 1 divided by (1 plus e to the minus z). It squashes any real number into the range 0 to 1, so the answer can be read as a probability. At z2 = -0.75 it returns 0.3208.',
        3: 'Binary cross-entropy loss. Because y is 1.0 here, the second half multiplies by (1 - 1) = 0 and vanishes, leaving -log(0.3208) = 1.1369. The minus sign in front makes the whole thing positive, so smaller means better.',
        4: 'round(value, 4) cuts a float to four decimal places so the output is readable instead of showing seventeen digits.',
        5: 'The model says 0.3208, meaning "probably not the positive class". The truth is 1. This is a confident mistake.',
        6: 'The loss, 1.1369. A perfect prediction of 1.0 would give a loss of 0. That gap is what the backward pass is about to attribute to individual weights.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 3: the gradient at the output layer',
      code: `d_out = yhat - y
dW2 = [d_out * a1[0], d_out * a1[1]]
db2 = d_out
print('d_out =', round(d_out, 4))
print('dW2   =', round(dW2[0], 4), round(dW2[1], 4))
print('db2   =', round(db2, 4))

# ---- real output ----
# d_out = -0.6792
# dW2   = -0.0 -1.3584
# db2   = -0.6792`,
      annotations: {
        1: 'The delta at the output: prediction minus truth, 0.3208 - 1.0 = -0.6792. This one subtraction is the entire first step of the backward pass, because the sigmoid and cross-entropy factors cancelled.',
        2: 'The two slopes for the output weights, using the rule (delta at this layer) times (the value that fed in). The values that fed in are a1[0] = 0.0 and a1[1] = 2.0, so the slopes are -0.6792(0.0) and -0.6792(2.0).',
        3: 'The bias slope is the delta itself. A bias is added straight into the sum, so its local gradient is 1, and multiplying the delta by 1 changes nothing.',
        4: 'Negative, which reads as: increasing z2 would decrease the loss. That makes sense — the prediction is too low and z2 controls it.',
        5: 'Prints -0.0 and -1.3584. Python prints -0.0 when a negative number is multiplied by zero; it is plain zero, and it means that weight gets no update from this example because the hidden unit feeding it produced nothing.',
        6: 'The bias slope, identical to d_out as expected from line 3.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 4: pushing the delta one layer further back',
      code: `slope1 = 1.0 if z1[0] > 0 else 0.0
slope2 = 1.0 if z1[1] > 0 else 0.0
d_hid = [d_out * W2[0] * slope1, d_out * W2[1] * slope2]
dW1 = [[d_hid[0] * x[0], d_hid[0] * x[1]],
       [d_hid[1] * x[0], d_hid[1] * x[1]]]
db1 = [d_hid[0], d_hid[1]]
print('relu slopes =', slope1, slope2)
print('d_hid       =', round(d_hid[0], 4), round(d_hid[1], 4))
print('dW1 row 0   =', round(dW1[0][0], 4), round(dW1[0][1], 4))
print('dW1 row 1   =', round(dW1[1][0], 4), round(dW1[1][1], 4))

# ---- real output ----
# relu slopes = 0.0 1.0
# d_hid       = -0.0 0.3396
# dW1 row 0   = -0.0 -0.0
# dW1 row 1   = 0.3396 0.6792`,
      annotations: {
        1: 'relu\'s local gradient for hidden unit 0. "1.0 if condition else 0.0" is a Python conditional expression: it checks the condition and the whole line becomes the first value when true, the second when false. relu is flat below zero, so its slope there is 0; above zero relu just copies its input, so its slope is 1.',
        2: 'The same for hidden unit 1. Its weighted sum was 2.0, which is above zero, so this one is 1.0.',
        3: 'Two multiplications per unit, exactly as the maths said. First the delta travels back through the output weight W2[j] — that is how much this hidden unit influenced z2. Then it is multiplied by relu\'s local gradient, which is the gate that kills it if the unit was off.',
        4: 'The slopes for hidden unit 0\'s two incoming weights: (delta at this unit) times (the input feature that fed it). Both come out zero because d_hid[0] is zero.',
        5: 'The same for hidden unit 1: 0.3396 times x[0] = 1.0, and 0.3396 times x[1] = 2.0. Feature 1 was twice as large, so its weight gets twice the slope.',
        6: 'The hidden bias slopes are the deltas themselves, same reason as at the output layer. Written as a fresh list rather than reusing d_hid, so that changing one list later can never silently change the other.',
        7: 'Prints 0.0 and 1.0 — unit 0 shut, unit 1 open.',
        8: 'The blame that reached each hidden unit. Unit 0 gets nothing at all, because it contributed nothing.',
        9: 'Unit 0\'s weight slopes: both zero. This whole row of the network learns nothing from this example.',
        10: 'Unit 1\'s weight slopes: 0.3396 and 0.6792, matching the hand-computed matrix above exactly. The backward pass is now complete — every weight in the network has a slope.',
      },
    },
    {
      type: 'intuition',
      title: 'Checking the answer: measure one slope directly',
      md: `A wrong backward pass does not crash. It produces numbers, the network trains on them badly, and you spend a week blaming the step size. So check it once, against the slow method from the top of the module.

- Pick **one** weight. Set it to w + ε, run the forward pass, record the loss. Set it to w − ε, run the forward pass, record the loss. The slope between those two points is a direct measurement.
- Divide the difference by **2ε**, not ε, because the two points are 2ε apart. This is the same measurement the Math module used.
- Use ε ≈ 1e−5. Too large and you are measuring the average slope over a wide gap; too small and the two loss values are so close that floating-point rounding eats the difference.
- The weight to check here is W1[1][0], where backprop claimed the slope is **0.3396**.
- This is a debugging tool only. It costs two full forward passes for every single weight, which is exactly the hopeless cost from the top of the module. Run it once on a tiny network, then delete the call.

One warning specific to relu: if a unit sits exactly at z = 0, nudging it by ±ε straddles relu\'s corner, where the slope jumps from 0 to 1. The measurement there is genuinely meaningless. Check a weight whose units are clearly on or clearly off.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 5: does backprop agree with a direct measurement?',
      code: `def loss_for(w):
    zA = W1[0][0] * x[0] + W1[0][1] * x[1] + b1[0]
    zB = w * x[0] + W1[1][1] * x[1] + b1[1]
    z = W2[0] * max(0.0, zA) + W2[1] * max(0.0, zB) + b2
    p = 1.0 / (1.0 + math.exp(-z))
    return -math.log(p)

eps = 1e-5
up = loss_for(W1[1][0] + eps)
down = loss_for(W1[1][0] - eps)
measured = (up - down) / (2 * eps)
print('loss at w + eps =', round(up, 9))
print('loss at w - eps =', round(down, 9))
print('measured slope  =', round(measured, 6))
print('backprop said   =', round(dW1[1][0], 6))

# ---- real output ----
# loss at w + eps = 1.136874402
# loss at w - eps = 1.13686761
# measured slope  = 0.339589
# backprop said   = 0.339589`,
      annotations: {
        1: 'A function that runs the whole forward pass and returns just the loss, with one weight replaced by whatever value w you pass in. Everything else is read from the variables already defined in stage 1.',
        2: 'Hidden unit 0\'s weighted sum, untouched — this weight is not the one being tested.',
        3: 'Hidden unit 1\'s weighted sum, but using the passed-in w instead of W1[1][0]. This is the only line where the substitution happens, and nothing outside the function is modified.',
        4: 'The output sum, with relu applied inline via max(0.0, ...) to keep the function short.',
        5: 'The sigmoid, same formula as stage 2.',
        6: 'The loss. Since y is 1, binary cross-entropy reduces to -log(p), so we write only that half.',
        8: 'The nudge size. 1e-5 is Python for 0.00001.',
        9: 'Loss with the weight nudged up by eps.',
        10: 'Loss with the weight nudged down by eps. Two separate calls, so the real W1 is never altered.',
        11: 'Rise over run. The rise is the difference between the two losses; the run is 2 * eps, because the two test points sit eps on either side of the real weight.',
        12: 'The two losses printed to nine decimals, because they differ only in the seventh. That closeness is why eps cannot be made much smaller.',
        13: 'The same, one nudge below.',
        14: 'The measured slope: 0.339589.',
        15: 'What the backward pass computed in stage 4: 0.339589. Identical to six decimal places. The backward pass is correct, and this is the only way to know that without guessing.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 6: the parameter update',
      code: `lr = 0.5
for j in range(2):
    for k in range(2):
        W1[j][k] = W1[j][k] - lr * dW1[j][k]
    b1[j] = b1[j] - lr * db1[j]
    W2[j] = W2[j] - lr * dW2[j]
b2 = b2 - lr * db2
print('W1 row 0 =', round(W1[0][0], 4), round(W1[0][1], 4))
print('W1 row 1 =', round(W1[1][0], 4), round(W1[1][1], 4))
print('b1       =', round(b1[0], 4), round(b1[1], 4))
print('W2 =', round(W2[0], 4), round(W2[1], 4), ' b2 =', round(b2, 4))

# ---- real output ----
# W1 row 0 = 0.5 -0.5
# W1 row 1 = 0.8302 0.1604
# b1       = 0.0 -0.1698
# W2 = 1.0 0.1792  b2 = 0.5896`,
      annotations: {
        1: 'The step size, usually called the learning rate. 0.5 is large for real work but keeps the change visible in one step.',
        2: 'Walk over the two hidden units, j = 0 then j = 1.',
        3: 'Walk over the two input features feeding this hidden unit, k = 0 then k = 1.',
        4: 'The update rule: new weight = old weight minus step size times its slope. The minus sign is what makes it descent — a positive slope means the loss rises as the weight rises, so the weight must go down.',
        5: 'The same rule for this hidden unit\'s bias.',
        6: 'The same rule for the output weight reading this hidden unit. It fits in this loop because there are exactly as many output weights as hidden units.',
        7: 'The output bias, updated once, outside the loop, because there is only one of it.',
        8: 'Row 0 is unchanged: 0.5 and -0.5, exactly as it started. Its slopes were zero, so the update moved it by zero.',
        9: 'Row 1 moved: 1.0 became 0.8302 and 0.5 became 0.1604. Both went down, because both slopes were positive.',
        10: 'The hidden biases: unit 0 stayed at zero, unit 1 dropped to -0.1698.',
        11: 'The output layer: W2[0] unchanged for the same reason as row 0, W2[1] moved from -0.5 up to 0.1792, and the output bias rose from 0.25 to 0.5896.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 7: run the forward pass again and watch the loss fall',
      code: `z1 = [W1[0][0] * x[0] + W1[0][1] * x[1] + b1[0],
      W1[1][0] * x[0] + W1[1][1] * x[1] + b1[1]]
a1 = [max(0.0, z1[0]), max(0.0, z1[1])]
z2 = W2[0] * a1[0] + W2[1] * a1[1] + b2
yhat = 1.0 / (1.0 + math.exp(-z2))
loss = -math.log(yhat)
print('yhat was 0.3208, now', round(yhat, 4))
print('loss was 1.1369, now', round(loss, 4))

# ---- real output ----
# yhat was 0.3208, now 0.6825
# loss was 1.1369, now 0.382`,
      annotations: {
        1: 'Hidden unit 0\'s weighted sum again, with the updated weights. Same two lines as stage 1 — only the numbers inside W1 and b1 have changed.',
        2: 'Hidden unit 1\'s weighted sum, now using the updated row 1.',
        3: 'relu again, unchanged.',
        4: 'The output sum, using the updated W2 and b2.',
        5: 'The sigmoid, unchanged.',
        6: 'The loss. Written as just -log(yhat) because y is 1, the same shortcut as stage 5.',
        7: 'The prediction moved from 0.3208 to 0.6825 — from the wrong side of 0.5 to the right side, in a single step.',
        8: 'The loss dropped from 1.1369 to 0.382, about a third of what it was. That is one complete training step: forward, backward, update. Repeat it a few thousand times on many examples and you have trained a neural network.',
      },
    },
    {
      type: 'intuition',
      title: 'What changes when you train on a batch',
      md: `Nobody trains on one example at a time. Real training uses a **batch**: a group of examples, say 32 or 256, that the network processes before the weights move once. The maths barely changes.

- Each example gets its own forward pass and its own backward pass, producing its own set of slopes.
- The slopes for a given weight are then **added up across the batch**, and the sum is divided by the batch size B to give an average.
- Why added? Because the batch loss is defined as the average of the individual losses, and the slope of a sum is the sum of the slopes. Each example contributes its own share of blame to the same shared weight.
- Bias slopes are the plainest case: the same bias is added to every example, so its slope is simply the sum of every example's delta.
- The one thing to be careful about: the 1/B belongs in exactly **one** place, either in the loss or once when the delta is computed. Putting it in both silently divides your step size by B, and the only symptom is training that is mysteriously slow.

In library code this batching is done with matrix multiplications rather than an explicit loop, because a matrix multiply already contains the sum over examples. The arithmetic is identical to running the loop; it is only faster.`,
    },
    {
      type: 'intuition',
      title: 'Why very deep networks were hard: vanishing gradients',
      md: `Backprop is a chain of multiplications, one per layer crossed. Chains of multiplications do exactly two things over long distances: they collapse towards zero, or they blow up.

- Each layer you cross multiplies the delta by the layer's weights and by the activation function's local gradient.
- The sigmoid's local gradient is at most **0.25**, and usually much less. Cross 20 sigmoid layers and the delta has been multiplied by at most 0.25 twenty times, which is about 0.000000000001.
- The early layers therefore receive a slope of essentially zero and stop learning, while the last layers train normally. That is the **vanishing gradient** problem, and it is why deep networks were considered untrainable before about 2010.
- The opposite also happens: if the factors are consistently above 1, the delta grows geometrically and the weights become meaningless within a few steps.
- The fixes — relu (local gradient exactly 1 when the unit is on), careful weight initialisation, normalisation layers, and skip connections — belong to the modules that follow. **Activation Functions** covers the activation half properly.

The point for this module is only that the problem is a direct consequence of the one operation backprop performs. Multiply enough small numbers together and you get nothing.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: a full forward and backward pass by hand',
      md: `Different numbers, same network shape, done entirely with pen and paper. Input x = [2, 1], label y = 0. Weights: hidden unit 0 has [1.0, −1.0] and hidden unit 1 has [0.5, 1.0], both biases 0. The output weights are [1.0, 1.0] with bias −1.0.

- **Forward, hidden layer.** Unit 0: 1.0(2) + (−1.0)(1) + 0 = **1.0**. Unit 1: 0.5(2) + 1.0(1) + 0 = **2.0**. Both are positive, so relu keeps both: a1 = [1.0, 2.0].
- **Forward, output.** z2 = 1.0(1.0) + 1.0(2.0) + (−1.0) = **2.0**. Sigmoid: 1/(1 + e^−2) = **0.8808**.
- **Loss.** The label is 0, so binary cross-entropy is −log(1 − 0.8808) = −log(0.1192) = **2.1269**. Badly wrong, as expected: the model said 0.88 for something that is 0.
- **δ_out.** Prediction minus truth: 0.8808 − 0 = **0.8808**. Positive this time, meaning the output is too high and z2 must come down.
- **Output weight slopes.** δ_out times each incoming activation: 0.8808(1.0) = **0.8808** and 0.8808(2.0) = **1.7616**. Bias slope = **0.8808**.
- **δ at the hidden units.** Push δ_out back through each output weight: 0.8808(1.0) = 0.8808 for both units. Then multiply by relu\'s local gradient, which is 1 for both because both sums were positive. So δ_hidden = **[0.8808, 0.8808]**.
- **Hidden weight slopes.** Each δ times each input feature. Unit 0: 0.8808(2) = **1.7616** and 0.8808(1) = **0.8808**. Unit 1 gets the identical pair, because its delta happened to be identical.
- **Update, step size 0.1.** Unit 0's weights: 1.0 − 0.1(1.7616) = **0.8238** and −1.0 − 0.1(0.8808) = **−1.0881**. Every weight moved down, which is right: the prediction was too high and every weight was pushing it up.

Check the direction rather than trusting the arithmetic: a lower z2 gives a lower sigmoid gives a lower prediction gives a lower loss for a label of 0. Everything moved the way it should.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake, walked into on purpose',
      md: `Back to the module's own numbers. The mistake is to compute the hidden delta as *just* the delta pushed back through the output weight, and forget to multiply by the activation function's local gradient.

- The wrong rule: δ_hidden = δ_out × W2[j]. That gives **[−0.6792, 0.3396]**.
- The correct rule multiplies by relu's local gradient as well, which is 0 for unit 0 and 1 for unit 1, giving **[0, 0.3396]**.
- Only unit 0 differs. Unit 1's number is identical, because its relu gradient was 1 and multiplying by 1 changes nothing. **Half the network still gets the exactly right answer**, which is the first reason this bug is hard to see.
- The wrong rule claims the slope for W1[0][0] is **−0.6792**. Measure it the stage-5 way and the answer is **0.0** — unit 0 is off, and nudging its weight by a hundred-thousandth leaves it off, so the loss does not move at all. The claim and the measurement do not agree even in sign.
- And here is the second reason it hides. Take a step with the wrong slopes: the loss for this example falls from 1.1369 to **0.0953**. With the correct slopes it falls to 0.382. The buggy version looks *better*.

That last line is the trap, so read it slowly. The wrong number happened to switch hidden unit 0 back on, which helped this one example. That is not learning, it is a lucky nudge in an arbitrary direction. A slope that is wrong in size, or right only some of the time, still usually points somewhere downhill, so the loss curve keeps falling and nothing ever raises an error. The model just ends up worse than it should, and you have no way to tell.

**The only reliable detection is stage 5.** One weight, two forward passes, compare. That is why the slow method earns its place even though it is far too slow to train with.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Do these with pen and paper before reading the solutions. All the arithmetic is small on purpose; a calculator is enough.

1. A network output produced ŷ = 0.7 for an example whose label is y = 1, using sigmoid and binary cross-entropy. What is δ_out? What would it be if the label were 0 instead?
2. A hidden unit's weighted sum was z = 3.0, it uses relu, and the delta arriving at it from downstream (after passing back through the output weight) is 0.4. What is the delta at this unit? Now answer the same question for z = −3.0.
3. A hidden unit has delta 0.5 and its two incoming input features were 2.0 and −1.0. What are the two weight slopes and the bias slope?
4. With step size 0.1, apply the update to a weight that is currently 1.2 and has slope −0.8. Did the weight go up or down, and why is that the correct direction?
5. Someone claims that if the loss goes down every step, the backward pass must be correct. Give the two-sentence reason this is not sound, and say what you would run instead.`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `Check every step against your own working, not only the final number.

1. δ_out is prediction minus truth, so 0.7 − 1 = **−0.4**. Negative means increasing z would lower the loss, which is right: the prediction is too low. With label 0 it is 0.7 − 0 = **+0.4**, the same size in the other direction, because now the prediction is too high by the same amount.
2. relu's local gradient is 1 when the sum is positive, so the delta is 0.4 × 1 = **0.4**, passed through unchanged. At z = −3.0 the local gradient is 0, so the delta is 0.4 × 0 = **0**. The unit contributed nothing and receives nothing.
3. Weight slope = (delta at this unit) × (the input that fed that weight). So 0.5(2.0) = **1.0** and 0.5(−1.0) = **−0.5**. The bias slope is the delta itself, **0.5**, because a bias is added directly and its local gradient is 1.
4. New weight = 1.2 − 0.1(−0.8) = 1.2 + 0.08 = **1.28**. The weight went **up**. That is correct because a negative slope means the loss falls as the weight rises, and the minus sign in the update rule turns that negative slope into an upward move.
5. A slope that is wrong by a factor, or wrong on only some units, usually still points somewhere downhill, so the loss falls and nothing errors — the model simply trains to a worse result more slowly. Run a finite-difference check on a few individual weights as in stage 5, and separately try to drive the loss on a handful of examples to nearly zero; a network that cannot memorise eight examples has a real bug somewhere in forward, backward, or update.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. This section names ideas you will meet later, so the words are not new when you get there.

- **What autograd does.** You will not write those stages again after this module. During the forward pass, a framework such as PyTorch records every operation it performs, its inputs, and its output — a list called the tape. Every operation ships with its own local-gradient rule, written once by the library authors. Calling backward() walks the tape in reverse, applying each rule and multiplying by the delta that arrived. It is exactly the procedure you just did by hand, generated automatically. Slopes accumulate rather than overwrite, which is why training loops call zero_grad() before each step.
- **The memory bill.** The backward pass needs the forward pass's intermediates — stage 4 used z1, stage 3 used a1 — so every intermediate value stays in memory until its slope has been computed. That memory grows with batch size, depth, and layer width, and on large models it dwarfs the weights themselves. It is the real reason an out-of-memory error appears the moment you double the batch size.
- **Why the ordering matters.** The chain rule says the slopes exist; it does not say in which order to multiply them. Multiplying from the input end forwards costs one sweep per *input*. Multiplying from the loss end backwards costs one sweep per *output*, and a loss has exactly one output — so every weight's slope falls out of one sweep. That asymmetry is the actual algorithm, and it is why the method is called reverse-mode.
- **Softmax and multi-class labels.** For more than two classes, sigmoid is replaced by softmax and binary cross-entropy by its multi-class version. The same cancellation happens, and δ_out is again prediction minus truth, with the truth written as a list of zeros with a single 1 in the correct class position.
- **A relative error, when checking many weights at once.** Stage 5 compared two numbers by eye. For a whole layer, compare the size of the difference against the size of the two gradients added together, rather than looking at the raw difference — slopes in different layers differ in scale by many orders of magnitude, so a fixed absolute threshold would flag the large ones and miss the small ones.`,
    },
  ],
  quiz: [
    {
      question: 'Why is finding gradients by nudging each weight and re-running the network hopeless for real networks?',
      options: [
        {
          text: 'It is too inaccurate, so the gradients would be wrong',
          explanation: 'Accuracy is fine — that is exactly why stage 5 uses it as a correctness check and got six matching decimals. The problem is cost, not correctness.',
        },
        {
          text: 'It costs a full forward pass per weight, so the cost grows with the number of weights — millions of passes for one step',
          explanation: 'Correct. Backprop gets every slope in one backward sweep costing about as much as a single forward pass, no matter how many weights there are.',
        },
        {
          text: 'It only works on networks with one hidden layer',
          explanation: 'It works on anything you can run forwards, of any depth. It is simply unaffordable.',
        },
      ],
      correct: 1,
    },
    {
      question: 'What two things does one spot in the network need in order to compute the delta it passes further back?',
      options: [
        {
          text: 'Its own local gradient, and the delta arriving from downstream',
          explanation: 'Correct, and nothing else. That locality is why the same procedure runs on a two-neuron toy and on a model with billions of weights.',
        },
        { text: 'The full architecture of the network', explanation: 'No operation ever sees the architecture. A relu has never heard of the loss function; it only knows its own slope.' },
        { text: 'The step size and the label', explanation: 'The step size belongs to the update, which happens after all slopes exist. The label enters once, at the very output, and after that it travels as part of the delta.' },
      ],
      correct: 0,
    },
    {
      question: 'With a sigmoid output and binary cross-entropy loss, the delta at the output simplifies to which expression?',
      options: [
        { text: 'yhat times (1 − yhat)', explanation: 'That is the sigmoid\'s local gradient on its own. It is one of the two factors, and it cancels against the denominator of the loss derivative.' },
        { text: 'minus y divided by yhat', explanation: 'That is a piece of the loss derivative before the sigmoid factor multiplies in. The cancellation has not happened yet.' },
        {
          text: 'yhat minus y — prediction minus truth',
          explanation: 'Correct. The yhat(1−yhat) in the denominator of the loss derivative cancels the identical factor from the sigmoid, and only the raw error survives. In stage 3 that was 0.3208 − 1 = −0.6792.',
        },
      ],
      correct: 2,
    },
    {
      question: 'You have the delta at some layer. What is the slope for that layer\'s weights?',
      options: [
        { text: 'The delta times that layer\'s output', explanation: 'The output is downstream of the weight. The rule uses what fed IN to the weight, not what came out of the layer.' },
        {
          text: 'The delta times the value that fed into that weight',
          explanation: 'Correct. In stage 3 that was d_out times a1; in stage 4 it was d_hid times x. Same rule, different names — which is the whole pattern.',
        },
        { text: 'The delta times the weight itself', explanation: 'Multiplying the delta by the weight is how the delta travels to the previous layer. That is a different quantity from the slope for the weight.' },
      ],
      correct: 1,
    },
    {
      question: 'A hidden relu unit had a weighted sum of −0.5 for an example. What slope do its incoming weights get from that example?',
      options: [
        {
          text: 'Zero, because relu\'s local gradient is 0 below zero, so the delta is killed at that gate',
          explanation: 'Correct — this is exactly what happened to row 0 in stage 4, and why row 0 of W1 came out of stage 6 completely unchanged. No contribution means no blame.',
        },
        { text: 'The same as any other unit — relu only affects the forward pass', explanation: 'relu is an operation in the chain like any other, so its local gradient multiplies into the backward pass too.' },
        { text: 'A negative slope proportional to −0.5', explanation: 'relu output 0 there and its slope is 0. How far below zero the sum was makes no difference at all.' },
      ],
      correct: 0,
    },
    {
      question: 'Your finite-difference check says a weight\'s slope is 0.339589 and backprop says −0.6792. What is the correct conclusion?',
      options: [
        { text: 'Normal floating-point noise — carry on', explanation: 'Floating-point noise shows up around the sixth or seventh decimal place. These two numbers do not even share a sign.' },
        {
          text: 'The backward pass has a bug, and it must be found before training anything',
          explanation: 'Correct. A disagreement this large means a real error — a forgotten activation gradient, a wrong factor, a mixed-up value. And note that the network would still appear to train, which is why the check exists.',
        },
        { text: 'The nudge size is too small — raise it to 0.1 and re-check', explanation: 'A larger nudge measures the average slope over a wide gap instead of the slope at the point, which makes the measurement worse. It would blur the disagreement, not resolve it.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Derive backprop for one layer. Whiteboard, out loud.',
      answer:
        'Set it up: z = W a_in + b, then a_out = f(z), and assume the delta arriving from downstream is known. Three steps. (1) Through the activation: multiply the arriving delta by f prime of z — that gives the delta at this layer. (2) Through the weights: because z is a weighted sum of a_in, the slope for W is that delta times a_in, and the slope for b is the delta itself, since a bias has local gradient 1. (3) Onwards: the delta for the previous layer is the delta pushed back through W, which is the same connections read in the other direction. Then state the pattern: every slope is a local gradient times an arriving delta, and every weight slope is the delta at this layer times the value that fed in. Finish with the shape check — the slope for W must have the same shape as W — which catches a flipped matrix on the spot.',
      isCaseBased: false,
    },
    {
      question: 'Why does the delta at the output collapse to prediction minus truth for sigmoid with cross-entropy? Is that a coincidence?',
      answer:
        'It is the design goal, not a coincidence. The loss derivative has yhat(1−yhat) in its denominator and the sigmoid\'s local gradient is exactly yhat(1−yhat), so the product is just yhat − y. The reason to want that: sigmoid is nearly flat when the prediction is close to 0 or 1, so its local gradient is tiny there. With a squared-error loss the update would be smallest exactly when the model is most confidently wrong, and learning stalls. Cross-entropy has that flatness in its denominator so it cancels, leaving an update proportional to the size of the error itself — badly wrong means a big correction. Softmax with multi-class cross-entropy has the same structure and the same result.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague\'s hand-written network trains, but converges much more slowly than an equivalent library model on the same data and the same step size. How do you find the problem?',
      answer:
        'Suspect the backward pass before the hyperparameters. (1) Run a finite-difference check: pick a handful of individual weights across different layers, nudge each by 1e-5 either way, and compare against the analytic slope. A layer where the check fails tells you where the bug is. (2) If the check passes, look for a scale bug — dividing by the batch size both in the loss and again in the delta divides the effective step size by the batch size, and the only symptom is exactly this, silent slowness. (3) Verify the activation gradient is being applied to the pre-activation sum, not to the activation\'s output; that mix-up is easy and quiet. (4) Feed both implementations identical weights and identical inputs, then compare the size of the slopes layer by layer; the first layer that disagrees is the culprit. (5) Only after all that, consider fair-comparison issues: the library may use a different initialisation scheme, and comparing a plain gradient-descent update against an adaptive optimiser is not a like-for-like test. The tradeoff worth naming: the finite-difference check is slow but decisive, whereas watching loss curves is free and has cost people weeks.',
      isCaseBased: true,
    },
    {
      question: 'Case: the loss reads 0.69, 0.68, 0.71, then NaN. What happened, and in what order do you fix it?',
      answer:
        'A NaN in one step is an explosion, not a plateau. Order of attack: (1) Step size — cut it tenfold and re-run; if the NaN simply arrives later, the step size was the cause. (2) Numerical stability in the loss — the logarithm of zero is negative infinity, so a prediction that saturates to exactly 0 or 1 poisons the loss; use a loss that takes the raw pre-sigmoid number and does the squashing internally, rather than sigmoid followed by a separate log. (3) Slopes growing across depth — log the total size of the slopes each step, and cap it at a fixed maximum if it climbs. (4) Initialisation — weights started too large make the very first delta enormous. (5) The data itself — a single infinity or missing value in an input propagates instantly, so check the batch before blaming the model. The tradeoff to state: capping the slope size keeps a run alive but hides the cause, whereas correct initialisation, normalisation and a numerically safe loss are the actual fix.',
      isCaseBased: true,
    },
    {
      question: 'Explain vanishing gradients using the backward pass, and rank the fixes.',
      answer:
        'Crossing one layer backwards multiplies the delta by two things: the layer\'s weights, and the activation function\'s local gradient. So the delta reaching the first layer carries a product of one such pair per layer above it. The sigmoid\'s local gradient never exceeds 0.25, so across twenty layers the surviving factor is at most 0.25 to the twentieth, around one part in a trillion. The early layers receive essentially nothing and freeze while the last layers train normally. Fixes, most to least load-bearing: skip connections, which give the delta a route whose local gradient is exactly 1 and are why very deep networks became trainable; relu-family activations, whose local gradient is exactly 1 on the positive side rather than at most 0.25; normalisation layers, which keep the weighted sums in the region where the activation is not flat; and careful initialisation, which sets the initial product near 1. Diagnose it by logging the size of the slopes per layer and looking for a value that shrinks steadily towards the input end.',
      isCaseBased: false,
    },
    {
      question: 'What exactly does a framework\'s backward() call do? Answer as if the interviewer suspects you think it is magic.',
      answer:
        'During the forward pass the framework records each operation it performs together with its inputs and its output, building a graph on the fly. backward() walks that graph in reverse from the loss, starting with an arriving delta of 1.0. At each recorded operation it applies that operation\'s registered local-gradient rule, multiplies by the delta that arrived, and routes the result to that operation\'s inputs. Weights that were marked as trainable accumulate their slopes into a field on the tensor. Three consequences worth stating: slopes accumulate rather than overwrite, which is why the loop clears them before each step and why splitting a large batch into several small ones works for free; the recorded graph is discarded after the walk unless you ask to keep it; and switching recording off at prediction time is why inference needs far less memory than training. It is the same stages you write by hand, replayed from a recording.',
      isCaseBased: false,
    },
    {
      question: 'Case: a 12-layer model fits at batch size 64 but runs out of memory at 128, even though the weights themselves are only a couple of hundred megabytes. Where is the memory going?',
      answer:
        'The weights are not the bill; the stored intermediates are. The backward pass needs the forward pass\'s intermediate values at every layer, so that memory grows with batch size times depth times layer width, and doubling the batch size doubles it while the weights stay fixed. Options, ranked: (1) split the batch — run two groups of 64, add up their slopes, and update once; this is mathematically identical to a batch of 128 and costs only wall-clock time; (2) use a lower-precision number format for the intermediates, which roughly halves that memory and is usually free; (3) store intermediates only at a few chosen points and recompute the rest during the backward pass, trading roughly a third more compute for a large memory saving; (4) shorten the input — fewer tokens, smaller images — if the task tolerates it; (5) spread the model across several devices if you have them. The tradeoff to state plainly: splitting the batch costs time, recomputing costs compute, spreading across devices costs communication. Pick whichever resource you actually have spare.',
      isCaseBased: true,
    },
    {
      question: 'Case: an intern reports "my training loss is going down, so my backward pass must be working". What do you tell them?',
      answer:
        'That a falling loss is weak evidence. A backward pass with a wrong constant factor, a missing activation gradient on one layer, or a batch-size division applied twice still produces a direction that is usually correlated with downhill — so the model trains, more slowly and to a worse result, and nothing ever errors. In this module\'s own example the buggy version made the loss fall further on the first step than the correct one did, purely by luck. Real checks, in order: (1) a finite-difference check on individual weights, which is the only decisive test; (2) try to drive the loss on eight examples to almost zero, because a network that cannot memorise eight examples has a genuine bug in forward, backward, or the update; (3) compare the size of the slopes layer by layer against a reference implementation given identical weights and inputs. The general lesson: the dangerous bugs in machine learning are the ones that quietly degrade quality without crashing, so write checks that assert correctness instead of watching curves.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Backprop in one sentence', back: 'One sweep backwards computes the slope of the loss for EVERY weight, by multiplying each operation\'s local gradient with the delta arriving from downstream.' },
    { front: 'Forward pass vs backward pass', back: 'Forward: input to output, producing a prediction and a loss, keeping every intermediate value. Backward: loss back to input, producing one slope per weight.' },
    { front: 'Cost of the nudge-each-weight method', back: 'Two forward passes per weight. 25 million weights means 50 million passes for one step. Backprop: one backward sweep for all of them. Kept only as a correctness check.' },
    { front: 'The two-sentence pattern', back: 'Every slope = (local gradient) x (delta arriving from downstream). Every weight slope = (delta at this layer) x (the value that fed into that weight).' },
    { front: 'Delta at the output, sigmoid + cross-entropy', back: 'Prediction minus truth. The yhat(1-yhat) in the loss derivative\'s denominator cancels the sigmoid\'s own gradient — by design, so saturation cannot kill the update.' },
    { front: 'Why a dead relu unit never updates', back: 'relu\'s local gradient is 0 below zero, so the delta is multiplied by 0 and the whole row of weight slopes is zero. Off for every example means no slope, ever.' },
    { front: 'Finite-difference gradient check', back: 'Set one weight to w+eps and w-eps, run forward twice, divide the loss difference by 2*eps. eps around 1e-5. Compare with backprop. Debug tool only — two passes per weight.' },
    { front: 'Vanishing gradient', back: 'Crossing L layers multiplies L local gradients. Sigmoid\'s never exceeds 0.25, so 20 layers leaves about 1e-12 and the early layers freeze. Fixes: relu, skip connections, normalisation, careful init.' },
  ],
  mindmapMarkdown: `- Backpropagation: Chain Rule on a Graph
  - The problem
    - loss is ONE number, many weights
    - need a slope for every weight
    - naive: one forward pass per weight
    - 25M weights = hopeless
  - Blame assignment
    - complaint at the door = loss
    - each station splits its share backwards
    - layer asks the previous one: how much was you?
  - The five words
    - forward pass: input to output
    - backward pass: loss to input
    - local gradient: one operation's own slope
    - delta: blame arriving at a spot
    - parameter update: w = w - lr * slope
  - One-layer derivation
    - forward: z1=W1x+b1, a1=relu, z2=W2a1+b2, yhat=sigmoid, L=BCE
    - delta_out = yhat - y (sigmoid + BCE cancel)
    - weight slope = delta x value that fed in
    - delta_hidden = (delta through W2) x relu slope
    - dead relu unit gets zero
  - Built in stages, plain Python
    - stage 1-2 forward: yhat 0.3208, loss 1.1369
    - stage 3-4 backward: d_out -0.6792, dW1 row 1 = 0.3396, 0.6792
    - stage 5 check: measured 0.339589 = backprop 0.339589
    - stage 6-7 update: loss 1.1369 to 0.382
  - Gradient checking
    - two forward passes, divide by 2*eps
    - eps about 1e-5
    - relu corner at z=0 gives a meaningless reading
    - debug only, never in training
  - Batches
    - each example gives its own slopes
    - add across the batch, divide by B once
    - bias slope = sum of the deltas
  - Vanishing gradients
    - backprop is a chain of multiplications
    - sigmoid slope <= 0.25, 20 layers ~ 1e-12
    - early layers freeze
    - fixes belong to Activations and later modules
  - Beyond the basics
    - autograd = a recorded tape replayed in reverse
    - intermediates kept in memory, hence the batch-size wall
    - reverse order is cheap because there is one output`,
}

export default m
