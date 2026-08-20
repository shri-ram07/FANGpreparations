import type { Module } from '../types'

const m: Module = {
  id: 'dl-l0-perceptron-mlp',
  subjectId: 'dl',
  level: 0,
  title: 'From Perceptron to MLP: Why We Need Non-Linearity',
  whyItMatters:
    '"Why do neural networks need activation functions?" is asked in almost every deep-learning screen, and the answer is two lines of algebra that most candidates cannot produce. This module gives you that proof, the XOR story it came from, and the vocabulary — depth, width, parameter count, shapes — that the rest of the interview is conducted in. Everything after this is the same machine, bigger.',
  estMinutes: 50,
  sections: [
    {
      type: 'intuition',
      title: 'One neuron: multiply, add, decide',
      md: `A doorman deciding who gets in. He looks at a few facts about you, weighs each one by how much he cares, adds them up, and says yes or no.

- The facts are the **inputs** x₁, x₂, … xₙ. Numbers.
- How much he cares about each is a **weight** w₁, w₂, … wₙ. Learned, not given.
- His general mood — how easy he is today — is the **bias** b. One number, no input attached.
- He computes one score: z = w₁x₁ + w₂x₂ + … + b. Then a **step**: z ≥ 0 → output 1, else 0.
- That is a **perceptron** (Rosenblatt, 1958). The entire neuron. Multiply, add, threshold.`,
    },
    {
      type: 'math',
      intro: 'The perceptron in symbols — and its famous descendant.',
      latex: [
        'z = \\mathbf{w}^\\top \\mathbf{x} + b = \\sum_{i=1}^{n} w_i x_i + b',
        '\\hat{y} = \\text{step}(z) = \\begin{cases} 1 & z \\ge 0 \\\\ 0 & z < 0 \\end{cases}',
        '\\text{Replace step with } \\sigma(z) = \\tfrac{1}{1 + e^{-z}} \\;\\; \\text{and you have logistic regression.}',
      ],
    },
    {
      type: 'intuition',
      title: 'Same line, softer verdict',
      md: `The perceptron and logistic regression are the same model wearing different shoes — worth saying out loud in an interview.

- Both compute the identical score z = w·x + b. Both live and die by that one straight boundary.
- Perceptron: hard **step**. Output is 0 or 1, no shades. Nothing to differentiate — the slope of a step is 0 everywhere and undefined at the jump.
- Logistic regression: **sigmoid**. Output is a probability, and the curve has a real slope everywhere, so gradient descent works. See the ML module *Logistic Regression: Sigmoid, Cross-Entropy & Decision Boundaries*.
- That swap — step to something smooth — is what made training networks possible at all.
- But the boundary itself did not change. z = 0 is still a straight line.`,
    },
    {
      type: 'intuition',
      title: 'XOR: the wall',
      md: `Two binary inputs. Output 1 when they **differ**, 0 when they match. Four points, that is the whole dataset:

- (0,0) → 0 · (0,1) → 1 · (1,0) → 1 · (1,1) → 0
- Plot them on a square. The two 1s sit at opposite corners. The two 0s sit at the *other* two opposite corners. The classes interleave diagonally.
- Now the proof, in words: a straight line splits the plane into two sides, and each side is **convex** — if two points are on one side, everything between them is too.
- The midpoint of the two 1s is (0.5, 0.5). The midpoint of the two 0s is *also* (0.5, 0.5).
- So any line that puts both 1s on one side must put (0.5, 0.5) on that side — and the same line must put (0.5, 0.5) on the 0s' side. One point cannot be on both sides. **No line exists.**
- AND and OR are fine — one line each. XOR is the smallest function that breaks a perceptron.`,
    },
    {
      type: 'note',
      md: 'In 1969 Minsky and Papert published *Perceptrons*, proving this limit in print — funding and interest collapsed into the first AI winter. The cruel part: everyone already knew a multi-layer network could do XOR. Nobody had a way to *train* one, and backpropagation would not be popularised until 1986.',
    },
    {
      type: 'intuition',
      title: 'The fix that does not work',
      md: `Obvious idea: one line is not enough, so stack layers. Input → linear layer → linear layer → output. More layers, more power. Right?

- No. Two stacked linear layers are **exactly one** linear layer, always.
- h = W₁x, then ŷ = W₂h = W₂(W₁x). Matrix multiplication is associative, so that is (W₂W₁)x.
- W₂W₁ is just... another matrix. Call it W_eq. You have ŷ = W_eq·x. One layer.
- A hundred layers collapse the same way: W₁₀₀ ⋯ W₂W₁ = one matrix. Millions of parameters, one straight boundary.
- Biases do not save it either — the composition is still an affine map (see the math below).
- **This is the entire reason activation functions exist.** Put a non-linearity between the layers and the collapse is blocked: the product cannot be multiplied out.`,
    },
    {
      type: 'math',
      intro: 'The collapse, in three lines. This is the answer to "why do we need activations?"',
      latex: [
        'h = W_1 x \\;\\Rightarrow\\; \\hat{y} = W_2 h = W_2 (W_1 x) = (W_2 W_1) x = W_{\\text{eq}}\\, x',
        'W_L W_{L-1} \\cdots W_2 W_1 = W_{\\text{eq}} \\qquad \\Rightarrow \\qquad L \\text{ linear layers} \\;\\equiv\\; 1 \\text{ linear layer}',
        'W_2 (W_1 x + b_1) + b_2 = (W_2 W_1) x + (W_2 b_1 + b_2) \\;\\; \\text{— still one affine map}',
        '\\text{With a non-linearity } \\varphi: \\;\\; W_2\\, \\varphi(W_1 x + b_1) + b_2 \\;\\; \\text{cannot be flattened.}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Ten thousand weights doing the job of eight',
      code: `import numpy as np

np.random.seed(0)
X = np.random.randn(5, 4)
W1 = np.random.randn(4, 100)     # 4 -> 100
W2 = np.random.randn(100, 100)   # 100 -> 100
W3 = np.random.randn(100, 2)     # 100 -> 2

deep = X @ W1 @ W2 @ W3          # three "layers", zero activations
W_eq = W1 @ W2 @ W3              # collapse them into ONE 4x2 matrix

print('W_eq shape:', W_eq.shape)
print('identical?', np.allclose(deep, X @ W_eq))
print('one layer could do it with', W_eq.size, 'weights instead of', W1.size + W2.size + W3.size)

# W_eq shape: (4, 2)
# identical? True
# one layer could do it with 8 weights instead of 10600`,
      annotations: {
        9: 'Three matrix multiplies in a row — a "deep" network with the activations deleted.',
        10: 'Same three matrices, multiplied together first. Associativity says the result must match.',
        13: 'True. Not approximately equal — the same function, to floating-point precision.',
        18: '10,600 parameters bought exactly nothing. This is the sentence to say in the interview.',
      },
    },
    {
      type: 'intuition',
      title: 'The MLP: layers with a kink between them',
      md: `A **multi-layer perceptron** is the fix, and it is almost boring: alternate linear layers with a non-linearity.

- **Input layer** — your raw features. No weights here, it is just where the numbers enter.
- **Hidden layer(s)** — fully connected: every unit reads every value from the layer before. Linear step, then an activation (ReLU, sigmoid, tanh, GELU — next module).
- **Output layer** — one unit for regression, one per class for classification.
- The rule that matters: **a non-linearity after every hidden layer**. Miss one and those two layers silently fuse into one.
- What is a hidden unit? A **learned feature detector**. Each one is its own little perceptron that fires on some pattern in its input.
- Stack them and the features compose: in a vision net the first layer learns edges and blobs, the next learns corners and textures from those edges, the next learns eyes and wheels, and the output layer just votes over parts.`,
    },
    { type: 'visual', component: 'NeuralNetForward', props: {} },
    {
      type: 'note',
      md: 'Drive it: step through the three stages and watch the numbers appear layer by layer. Then click any edge and drag its weight — every value downstream of that edge moves, and the final ŷ moves with it. That sensitivity, *"how much does the output change if I nudge this one weight"*, is exactly the number backpropagation computes. Note also that this is the exact 2-3-1 network you will hand-backprop in the next module, so the numbers on screen are worth getting familiar with now.',
    },
    {
      type: 'intuition',
      title: 'The vocabulary the interview is conducted in',
      md: `Say these wrong and you sound like you have only used a framework.

- **Unit / neuron** — one row of the computation: weights, sum, activation. **Layer** — a group of units computed together.
- **Weight** — one number on one connection. **Bias** — one number per unit, no input attached; it shifts the boundary off the origin.
- **Width** — units in a layer. **Depth** — how many layers *have weights*. The input layer does not count, so a 2-3-1 net is a **2-layer** net (or "one hidden layer"). Interviewers do use this to trip people up.
- **Parameter** — any learned number: every weight plus every bias.
- Counting rule, memorise it: a dense layer from n inputs to m outputs has **n·m weights + m biases**.
- The bias count is m, not n — one per *output* unit. That is the half people get wrong.`,
    },
    {
      type: 'math',
      intro: 'Parameter counting on a real net. Do this arithmetic until it is automatic.',
      latex: [
        '\\text{Dense layer } n \\to m: \\quad \\underbrace{n \\cdot m}_{\\text{weights}} \\;+\\; \\underbrace{m}_{\\text{biases}}',
        '784 \\to 128 \\to 64 \\to 10: \\;\\; (784 {\\cdot} 128 + 128) + (128 {\\cdot} 64 + 64) + (64 {\\cdot} 10 + 10)',
        '=\\; 100{,}480 \\;+\\; 8{,}256 \\;+\\; 650 \\;=\\; 109{,}386 \\text{ parameters}',
        '\\text{Note: } 92\\% \\text{ of them sit in the first layer — width next to the input is expensive.}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'A 2-3-1 forward pass by hand — matrices, no loops',
      code: `import numpy as np

# 2 -> 3 -> 1, the same weights as the live network above.
W1 = np.array([[0.8, -1.2, 0.5],       # x1 -> the 3 hidden units
               [0.6,  0.9, -0.7]])     # x2 -> the 3 hidden units
b1 = np.array([0.1, -0.2, 0.05])
W2 = np.array([[1.1], [-0.8], [0.6]])  # 3 hidden -> 1 output
b2 = np.array([-0.1])

X = np.array([[0.5, -0.4],             # a BATCH of 4 samples, 2 features each
              [1.0,  1.0],
              [0.0,  0.0],
              [-2.0, 0.3]])

Z1 = X @ W1 + b1                       # (4,2)@(2,3) -> (4,3); bias broadcasts
H  = np.maximum(0, Z1)                 # ReLU. The non-linearity. Elementwise.
Z2 = H @ W2 + b2                       # (4,3)@(3,1) -> (4,1)
Y  = 1 / (1 + np.exp(-Z2))             # sigmoid -> probability

for name, a in [('X', X), ('Z1', Z1), ('H', H), ('Z2', Z2), ('Y', Y)]:
    print(name.rjust(2), 'shape', a.shape)

print('params:', W1.size + b1.size + W2.size + b2.size)
print('y_hat:', Y.ravel().round(4))
print('hidden row 0:', H[0].round(4))

#  X shape (4, 2)
# Z1 shape (4, 3)
#  H shape (4, 3)
# Z2 shape (4, 1)
#  Y shape (4, 1)
# params: 13
# y_hat: [0.6304 0.8249 0.51   0.1115]
# hidden row 0: [0.26 0.   0.58]`,
      annotations: {
        4: 'W1 is (in_features, out_features) = (2, 3). One COLUMN per hidden unit, not one row. Getting this backwards is the most common from-scratch bug.',
        15: 'The whole layer, one expression. b1 has shape (3,) and broadcasts across all 4 rows — every sample shares the same bias.',
        16: 'Delete this line and the network collapses into a single 2->1 linear model. Everything in this module is about this line.',
        21: 'Print shapes, always. The batch dimension stays in front and never mixes with features.',
        23: '6 + 3 + 3 + 1 = 13 parameters. Same counting rule as a 100-million-parameter model, just smaller.',
        33: 'Row 0 matches the live visual exactly: 0.6304.',
        34: 'Hidden unit 2 output 0 for this input — ReLU clipped it. That unit contributes nothing to this prediction, and it will get no gradient from it either.',
      },
    },
    {
      type: 'intuition',
      title: 'Shapes discipline, and why GPUs love this shape',
      md: `The single best debugging habit in deep learning: **write the shape after every layer** before you write the layer.

- Forward pass is one expression: **X @ W + b**. Batch of B samples in, batch of B activations out.
- (B, n) @ (n, m) → (B, m). The batch dimension B rides in front, untouched. Features are the last axis.
- Why this shape and not one sample at a time: B samples share the same W, so it is one big matrix multiply. A GPU is thousands of cores waiting for exactly that, and the weights get read from memory once instead of B times.
- That is the real reason batching speeds things up — not fewer FLOPs, but more work per byte moved.
- Most deep-learning bugs are shape bugs, and the dangerous ones do not crash: y of shape (B,) against ŷ of shape (B,1) **broadcasts** into a (B,B) loss matrix and trains happily on nonsense.
- So: print shapes, or assert them. A one-line assert costs nothing and catches the silent class.`,
    },
    {
      type: 'intuition',
      title: 'Universal approximation, stated honestly',
      md: `The theorem people quote to justify neural networks (Cybenko 1989, Hornik 1991):

- **One hidden layer with enough units can approximate any continuous function on a compact domain to any accuracy you like.**
- That is a real and strong result. Now the four things it does *not* say, which is where interviews actually go.
- "Enough" is unbounded — the required width can grow astronomically, even exponentially in the input dimension. Existence, not affordability.
- It is an **existence** proof. It says such weights *exist*. It says nothing about whether gradient descent will ever *find* them.
- Compact domain only. Nothing about behaviour outside the training range — extrapolation stays a fantasy.
- Nothing about **generalisation**. Approximating the training data is not learning the underlying function.
- Honest summary: the theorem says shallow nets are not fundamentally limited. Practice says they are hopelessly *inefficient*.`,
    },
    {
      type: 'math',
      intro: 'The statement itself. Read the quantifiers: N depends on epsilon, and nothing here mentions training.',
      latex: [
        '\\forall f \\in C(K),\\; \\forall \\varepsilon > 0 \\;\\; \\exists\\, N,\\, v_i,\\, w_i,\\, b_i \\;:\\;',
        '\\sup_{x \\in K} \\left| \\sum_{i=1}^{N} v_i\\, \\varphi\\!\\left(w_i^\\top x + b_i\\right) - f(x) \\right| < \\varepsilon',
        '\\text{Note what is missing: any bound on } N, \\text{ and any mention of an algorithm.}',
      ],
    },
    {
      type: 'note',
      md: 'So why deep instead of wide? Parameter efficiency. Compare on MNIST-sized input: one hidden layer of 1000 units is 784·1000 + 1000 + 1000·10 + 10 = **795,010** parameters, while 784 → 128 → 64 → 10 is **109,386** — roughly 7× cheaper, and in practice the deep one wins on accuracy too. Depth lets features *compose*: layer 2 builds from layer 1 instead of rebuilding from raw pixels. There are functions a deep net represents with a polynomial number of units that a one-hidden-layer net needs exponentially many for. Depth is not magic, it is reuse.',
    },
  ],
  quiz: [
    {
      question: 'Why can a single perceptron not learn XOR?',
      options: [
        {
          text: 'XOR needs more training data than four points',
          explanation: 'Data quantity is irrelevant — those four points are the complete function. The limit is representational, not statistical.',
        },
        {
          text: 'The two positive points and the two negative points share the same midpoint, so no straight line can separate them',
          explanation: 'Correct. Both diagonals cross at (0.5, 0.5); a line would have to put that single point on both sides at once. The perceptron draws exactly one line, so it is stuck.',
        },
        {
          text: 'The step function is not differentiable',
          explanation: 'True but irrelevant here — that blocks gradient training, not representation. Even with perfect weights handed to you, no single line separates XOR.',
        },
      ],
      correct: 1,
    },
    {
      question: 'You stack 50 linear layers with no activation functions. What can this network represent?',
      options: [
        {
          text: 'Exactly what one linear layer represents',
          explanation: 'Correct. W₅₀ ⋯ W₂W₁ multiplies out to a single matrix. Millions of parameters, one straight boundary.',
        },
        {
          text: 'Any continuous function, by universal approximation',
          explanation: 'Universal approximation requires a non-linear activation — it is the whole hypothesis of the theorem. Without one there is nothing to approximate with.',
        },
        {
          text: '50 times more complex functions than one layer',
          explanation: 'Depth without non-linearity adds zero expressiveness. The composition of linear maps is linear, full stop.',
        },
      ],
      correct: 0,
    },
    {
      question: 'How many parameters does a dense layer with 100 inputs and 50 outputs have?',
      options: [
        { text: '5,000', explanation: 'That is the weight count only — you forgot the biases.' },
        { text: '150', explanation: 'That is 100 + 50, which is not how a fully connected layer works: every input connects to every output.' },
        {
          text: '5,050',
          explanation: 'Correct: 100·50 = 5,000 weights plus 50 biases (one per OUTPUT unit) = 5,050.',
        },
      ],
      correct: 2,
    },
    {
      question: 'What does the universal approximation theorem actually guarantee?',
      options: [
        {
          text: 'That suitable weights exist for a wide enough single hidden layer — nothing about how many units, or about finding them',
          explanation: 'Correct. It is an existence proof on a compact domain. No bound on width, no algorithm, no generalisation claim.',
        },
        {
          text: 'That gradient descent will find weights approximating any function',
          explanation: 'The theorem never mentions an optimiser. Existence and findability are completely separate questions.',
        },
        {
          text: 'That one hidden layer is the optimal architecture',
          explanation: 'The opposite of the practical lesson — the required width can be astronomical, which is exactly why we build deep instead.',
        },
      ],
      correct: 0,
    },
    {
      question: 'X has shape (32, 784), W has shape (784, 128), b has shape (128,). What is the shape of X @ W + b?',
      options: [
        { text: '(784, 128)', explanation: 'That is W\'s own shape. The batch dimension does not disappear.' },
        {
          text: '(32, 128)',
          explanation: 'Correct: (B, n) @ (n, m) → (B, m). The batch of 32 rides in front untouched, and b broadcasts across all 32 rows.',
        },
        { text: '(32, 784)', explanation: 'That is the input shape — the matmul changes the feature dimension from 784 to 128.' },
      ],
      correct: 1,
    },
    {
      question: 'Given universal approximation, why do practitioners build deep networks instead of one very wide layer?',
      options: [
        { text: 'Wide networks cannot represent non-linear functions', explanation: 'They can — that is precisely what the theorem says. Expressiveness is not the issue.' },
        { text: 'Deep networks always train faster per epoch', explanation: 'Not reliably true, and depth brings its own training problems (vanishing gradients). Speed is not the argument.' },
        {
          text: 'Depth composes features, so the same function usually needs far fewer parameters than a shallow net',
          explanation: 'Correct. Layer 2 builds on layer 1 instead of rebuilding from raw input. Some functions need exponentially many units when shallow, polynomially many when deep.',
        },
      ],
      correct: 2,
    },
    {
      question: 'What does a hidden unit in the first layer of an image network typically learn?',
      options: [
        {
          text: 'A simple local pattern — an edge at some orientation, a colour blob',
          explanation: 'Correct. A hidden unit is a learned feature detector, and early layers detect simple local structure. Later layers combine those into corners, textures, and eventually object parts.',
        },
        { text: 'A whole object class such as "cat"', explanation: 'That level of abstraction lives in deep layers. The first layer only sees raw pixels in a small neighbourhood.' },
        { text: 'Nothing meaningful — hidden units stay random', explanation: 'They are trained. Visualising first-layer filters of any trained vision net reliably shows edge and colour detectors.' },
      ],
      correct: 0,
    },
    {
      question: 'How are the perceptron and logistic regression related?',
      options: [
        { text: 'They are unrelated models from different families', explanation: 'They compute the identical score w·x + b. Only the final squashing differs.' },
        {
          text: 'Same w·x + b line; the perceptron applies a hard step, logistic regression applies a sigmoid to get a probability',
          explanation: 'Correct — and the sigmoid is what makes it differentiable, which is what makes gradient descent (and therefore all of deep learning) possible.',
        },
        { text: 'Logistic regression has no bias term', explanation: 'It has one — the intercept. Both models shift their boundary off the origin with a bias.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why do neural networks need activation functions? Prove it, do not just assert it.',
      answer:
        'Because without them, depth is free of charge and free of value. Take two linear layers: h = W₁x + b₁, ŷ = W₂h + b₂. Substitute: ŷ = W₂(W₁x + b₁) + b₂ = (W₂W₁)x + (W₂b₁ + b₂). That is a single affine map with weight matrix W_eq = W₂W₁ and bias b_eq = W₂b₁ + b₂. Induction extends it to any depth, so L linear layers are exactly one linear layer — a hundred million parameters producing one straight boundary. A non-linearity φ between the layers gives W₂φ(W₁x + b₁) + b₂, and there is no algebraic move that flattens that. Say the associativity line explicitly; that is the part interviewers are listening for.',
      isCaseBased: false,
    },
    {
      question: 'Explain the XOR problem and how an MLP solves it.',
      answer:
        'XOR outputs 1 when the two binary inputs differ: (0,0)→0, (0,1)→1, (1,0)→1, (1,1)→0. The positives sit on one diagonal of the unit square, the negatives on the other. A single perceptron draws one straight line and each side of a line is convex, so the region holding both positives must contain their midpoint (0.5, 0.5) — but that is also the midpoint of the two negatives, so the same point would need to be on both sides. No line exists. An MLP solves it with two hidden units: one computes OR, one computes AND, both linearly separable on their own, and the output unit computes OR AND NOT(AND). Two lines plus a non-linear combination carve out the diagonal region a single line cannot. The moral: hidden units build intermediate features that make a hard problem linearly separable in the new space.',
      isCaseBased: false,
    },
    {
      question: 'Count the parameters in an MLP with layers 784 → 256 → 128 → 10. Show your arithmetic.',
      answer:
        'Rule: a dense layer n → m has n·m weights + m biases. Layer 1: 784·256 + 256 = 200,704 + 256 = 200,960. Layer 2: 256·128 + 128 = 32,768 + 128 = 32,896. Layer 3: 128·10 + 10 = 1,280 + 10 = 1,290. Total = 235,146. Two things worth adding unprompted: 85% of the parameters sit in the first layer, so width right next to a high-dimensional input is where the memory goes; and biases are counted per output unit, not per input — that is the slip most candidates make under pressure.',
      isCaseBased: false,
    },
    {
      question: 'State the universal approximation theorem, then tell me why it did not end the field.',
      answer:
        'Statement: for any continuous f on a compact set K and any ε > 0, there exists a finite N and weights such that a single-hidden-layer network with a non-polynomial activation approximates f uniformly within ε on K. Why it settles nothing practical: (1) no bound on N — the width can grow exponentially in input dimension, so "possible" is not "affordable"; (2) it is an existence proof, silent on whether gradient descent reaches those weights, and the loss surface is non-convex; (3) compact domain only, so nothing about extrapolation; (4) nothing about generalisation — fitting the sample is not learning the function. The theorem tells us shallow nets are not fundamentally limited; the last decade of engineering tells us they are hopelessly inefficient, which is why depth won.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague\'s 5-layer network trains without errors, loss goes down, but its predictions are indistinguishable from a linear regression baseline no matter how long it runs. Debug it.',
      answer:
        'First hypothesis, and usually the answer: no non-linearity, or one that is secretly linear. Check whether every hidden layer is followed by an activation — a missing ReLU means the whole stack is algebraically one affine map, and a linear model is exactly what it can express. Watch also for an "identity" or "linear" activation passed by config, or an activation applied only at the last layer. Second: the non-linearities may be saturated or dead — all-negative pre-activations under ReLU output zero everywhere, so the network degenerates to its bias path; check activation statistics per layer. Third: learning rate so small that weights barely move from an initialisation that is effectively linear (sigmoid and tanh are near-linear around zero, so tiny weights make a deep tanh net behave linearly). Diagnostic order: print the module list and look for missing activations, then histogram each layer\'s activations, then check weight movement between step 0 and step 1000. The first check takes ten seconds and finds it most of the time.',
      isCaseBased: true,
    },
    {
      question: 'What is a hidden unit, really? Answer without saying "a neuron".',
      answer:
        'A learned feature detector. One hidden unit computes w·x + b over the previous layer and passes it through a non-linearity, so it outputs a large value when its input resembles the pattern encoded in w and a small one otherwise — a template matcher whose template is learned rather than designed. What makes a network powerful is that the units of layer k are matching patterns in the *features produced by layer k−1*, not raw input: edges, then corners built from edges, then object parts built from corners. That composition is exactly what a hand-engineered feature pipeline used to do manually, and it is why the deep-learning era is described as replacing feature engineering with representation learning.',
      isCaseBased: false,
    },
    {
      question: 'Case: your MLP trains, the loss decreases smoothly, but accuracy sits at chance. You notice the loss values are strangely small. What do you check?',
      answer:
        'Suspect a silent shape bug, which is the failure mode that does not crash. The classic: labels y of shape (B,) compared against predictions ŷ of shape (B,1). NumPy and PyTorch broadcast that into a (B, B) matrix, so you are averaging B² pairwise errors — mostly between unrelated samples — which produces a smooth, small, meaningless loss that optimises toward the mean. Checks in order: print the shape of y, ŷ, and the loss tensor before reduction (a per-sample loss must be (B,) or (B,1), never (B,B)); assert them permanently; then verify the batch axis has not been transposed into the feature axis somewhere in the data pipeline. Broader lesson worth stating: write the expected shape after every layer, and prefer explicit reshape or squeeze over relying on broadcasting to work out.',
      isCaseBased: true,
    },
    {
      question: 'Depth versus width — how do you actually decide?',
      answer:
        'Start from the parameter-efficiency argument: depth composes features, so a deep net often represents the same function with far fewer parameters — some functions need exponentially many units when shallow and polynomially many when deep. Concretely on MNIST-sized input, one hidden layer of 1000 units is about 795k parameters while 784→128→64→10 is about 109k, and the deep one usually generalises better. Against that, depth costs training stability: vanishing and exploding gradients, sensitivity to initialisation, and a need for normalisation and residual connections. So the practical rule: go deep enough that features can compose over the hierarchy in your data (images and language are deeply hierarchical, tabular data much less so), keep width proportionate to input dimension, and note that for small tabular problems shallow-and-wide, or gradient-boosted trees, frequently beats deep.',
      isCaseBased: false,
    },
    {
      question: 'Why is the forward pass written as X @ W + b with a batch dimension, rather than W @ x per sample?',
      answer:
        'Because all B samples in a batch share the same W, so the whole batch is a single dense matrix multiply — (B, n) @ (n, m) → (B, m) — which is the one operation GPUs are built to saturate. The FLOP count is the same either way; what changes is arithmetic intensity: with a batch, W is read from memory once and reused across B rows, whereas per-sample calls are memory-bound and leave most cores idle. Keeping the batch on the leading axis also makes every layer shape-compatible and keeps the feature dimension last, which is the convention every framework and every kernel assumes. Follow-up worth pre-empting: this is also why very small batch sizes underuse a GPU while very large ones stop helping once the multiply is already compute-bound.',
      isCaseBased: false,
    },
    {
      question: 'The perceptron had a learning rule of its own. Why did the step function have to go?',
      answer:
        'The perceptron rule updates weights only on misclassification and is guaranteed to converge — but only for linearly separable data, and it does not extend past a single layer. The blocker is the step function: its derivative is 0 everywhere it is defined and undefined at the threshold, so there is no gradient to send backwards. Credit assignment across layers needs the chain rule, and the chain rule needs non-zero derivatives. Replacing step with sigmoid (later tanh, then ReLU) makes the output differentiable, which makes backpropagation possible, which makes multi-layer training possible. That is the causal chain from the 1969 dead end to 1986 — the smooth activation is the enabling change, not an aesthetic preference.',
      isCaseBased: false,
    },
    {
      question: 'Case: a candidate shows you a regression MLP predicting temperature anomalies (which can be negative). It has ReLU after every layer including the output, and the model never predicts below zero no matter how it is trained. What went wrong, and what is the general principle?',
      answer:
        'ReLU on the output layer clips every negative prediction to zero, so half the target range is unreachable — the network is not undertrained, it is architecturally incapable, and the gradient through a clipped unit is zero so it cannot even learn its way out. Fix: no activation on the output for unbounded regression (a plain linear output). The general principle is that the output activation is chosen by the *target range and loss*, not by habit: linear for unbounded regression, sigmoid for a probability in (0,1) with binary cross-entropy, softmax across a class dimension for multi-class, and ReLU or softplus only when the target really is non-negative. Hidden activations and output activations answer different questions — hidden ones exist to break linearity, the output one exists to match the label space.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Perceptron in one line', back: 'z = w·x + b, then a hard step. One learned straight boundary. Swap step for sigmoid and it is logistic regression.' },
    { front: 'Why a perceptron fails XOR', back: 'The positives and negatives share midpoint (0.5, 0.5); a line\'s sides are convex, so one point cannot be on both. Not fixable with more data.' },
    { front: 'Stacked linear layers', back: 'W₂(W₁x) = (W₂W₁)x = one matrix. L linear layers ≡ 1 linear layer. THE reason activations exist.' },
    { front: 'MLP structure', back: 'Input → hidden layer(s) → output, fully connected, with a non-linearity after EVERY hidden layer. Miss one and those two layers fuse.' },
    { front: 'What a hidden unit is', back: 'A learned feature detector. Early layers detect edges; later layers detect combinations of earlier features.' },
    { front: 'Dense layer parameter count', back: 'n → m costs n·m weights + m biases. Biases are per OUTPUT unit.' },
    { front: 'Universal approximation, honestly', back: 'One hidden layer with enough units approximates any continuous function on a compact set. No width bound, no algorithm, no generalisation claim.' },
    { front: 'Why deep, not just wide', back: 'Depth composes features → far fewer parameters for the same function. 784→128→64→10 is ~109k params vs ~795k for one 1000-unit layer.' },
    { front: 'Forward pass shape rule', back: '(B, n) @ (n, m) + (m,) → (B, m). Batch dimension in front, features last, bias broadcasts.' },
    { front: 'Depth counting convention', back: 'Depth = layers WITH weights. The input layer does not count, so a 2-3-1 net is a 2-layer (one hidden layer) network.' },
  ],
  mindmapMarkdown: `- From Perceptron to MLP
  - Perceptron
    - z = w·x + b, then step; no usable gradient
    - step → sigmoid = logistic regression
  - XOR wall
    - (0,0)→0 (0,1)→1 (1,0)→1 (1,1)→0
    - both diagonals share midpoint → no line works
    - 1969 Minsky & Papert → AI winter
  - Failed fix: stack linear layers
    - W₂(W₁x) = (W₂W₁)x
    - with biases: still one affine map
    - L layers ≡ 1 → therefore activations exist
  - MLP
    - input → hidden(s) → output, fully connected
    - non-linearity after EVERY hidden layer
    - hidden unit = learned feature detector
    - edges → corners → parts → classes
  - Anatomy vocabulary
    - width = units, depth = weighted layers (input not counted)
    - dense n→m: n·m weights + m biases
    - 784-128-64-10 = 109,386 params
  - Forward pass
    - X @ W + b: (B,n)@(n,m) → (B,m)
    - one big GEMM → GPUs saturate
    - shapes discipline: state the shape after every layer
    - silent bug: (B,) vs (B,1) broadcasts to (B,B)
  - Universal approximation
    - 1 hidden layer, enough units, compact domain
    - "enough" may be astronomical
    - existence, not findability
    - depth buys parameter efficiency`,
}

export default m
