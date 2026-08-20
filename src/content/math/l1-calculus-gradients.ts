import type { Module } from '../types'

const m: Module = {
  id: 'math-l1-calculus-gradients',
  subjectId: 'math',
  level: 1,
  title: 'Derivatives, the Chain Rule & Gradients',
  whyItMatters:
    'Backprop is not a new idea — it is the chain rule applied to a graph, and nothing else. If you can say "multiply the sensitivities along the path" and mean it, every training loop you will ever debug becomes readable. Skip this and you are memorizing formulas that were three lines of calculus all along.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'Derivative = sensitivity, not "slope of a tangent"',
      md: `Forget the tangent lines from school. The only reading that matters in ML: **if I nudge x by a tiny bit, how much does f move?**

- Volume knob: turn it 1mm. Loud jump? High derivative. Barely a change? Low derivative.
- Formally: *f'(x)* = how many units f moves per one unit of x, measured right at x.
- f'(3) = 6 means "near x = 3, f moves 6× as fast as x does".
- Sign carries the direction: **positive = f rises as x rises**, negative = f falls.
- Size carries the leverage: this is the number that decides which knob to turn first.
- Training a model = finding which weights the loss is *sensitive* to, then turning those.`,
    },
    {
      type: 'math',
      intro: 'The limit definition. Look at it once, understand it, then never compute one by hand again.',
      latex: [
        'f^{\\prime}(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}',
        '\\text{rise over run, with the run shrunk to nothing}',
      ],
    },
    {
      type: 'note',
      md: `That limit is the *definition*; the rules below are the *shortcuts*, and shortcuts are all anyone uses. Worth knowing it exists for one reason only: it is literally what a **numeric gradient check** computes (later in this module) — the trick engineers use to catch a wrong derivative. If you want the geometry to click permanently, watch 3Blue1Brown's *Essence of Calculus* — chapters 2 and 3 cover this and the chain rule better than any textbook.`,
    },
    {
      type: 'intuition',
      title: 'The three rules you actually need',
      md: `You need almost none of the calculus you were taught. Three rules cover ML:

- **Power rule:** bring the exponent down, subtract one. (x³)' = 3x².
- **Sum rule:** derivatives add. (f + g)' = f' + g'. This is why a loss summed over 1M samples is just 1M gradients added — and why mini-batching is legal.
- **Product rule:** (fg)' = f'g + fg'. Rarer in practice — most ML composition is *nesting*, not multiplying.
- A constant multiplier rides along: (5f)' = 5f'. A constant alone dies: (7)' = 0.
- That last one is why the bias term's gradient has no input factor attached.`,
    },
    {
      type: 'math',
      intro: 'The ML cast, with their derivatives. Memorize these five — they cover 95% of what appears in a training loop.',
      latex: [
        '\\frac{d}{dx}x^2 = 2x \\qquad \\frac{d}{dx}e^{x} = e^{x} \\qquad \\frac{d}{dx}\\ln x = \\frac{1}{x}',
        '\\sigma(x) = \\frac{1}{1+e^{-x}} \\quad\\Longrightarrow\\quad \\sigma^{\\prime}(x) = \\sigma(x)\\,\\bigl(1 - \\sigma(x)\\bigr)',
        '\\mathrm{ReLU}(x) = \\max(0, x) \\quad\\Longrightarrow\\quad \\mathrm{ReLU}^{\\prime}(x) = \\begin{cases} 1 & x > 0 \\\\ 0 & x < 0 \\end{cases}',
      ],
    },
    {
      type: 'note',
      md: `Three things to actually carry away. **eˣ is its own derivative** — that self-reproducing property is why it shows up in every softmax and every exponential decay schedule. **The sigmoid derivative reuses the forward value**: if you already computed a = σ(z), the gradient is a(1−a) — no new exp() call, which is exactly why frameworks cache activations. And **σ' peaks at 0.25** (at z = 0) — multiply a stack of those together through 20 layers and your gradient is 0.25²⁰ ≈ 10⁻¹²: that is the vanishing-gradient problem, born right here.`,
    },
    {
      type: 'note',
      md: `**ReLU's kink at 0.** ReLU has *no* derivative at exactly x = 0 — the slope jumps from 0 to 1 with nothing in between. Mathematically the honest answer is a **subgradient**: any value in [0, 1] is valid there. Engineering answer: every framework just picks one — PyTorch and TensorFlow return **0** at x = 0 — and it never matters, because floating-point activations land on exactly 0.0 essentially never. Interview line: *"non-differentiable at a single point, subgradient convention, measure zero, nobody cares."*`,
    },
    {
      type: 'intuition',
      title: 'The chain rule — this is backprop',
      md: `Gears in a machine. Gear A turns gear B turns gear C. If A→B is 3:1 and B→C is 2:1, then A→C is 6:1. You **multiply the ratios along the path**.

- Derivatives are exactly those ratios: "how much does the next thing move per unit of this thing".
- So for nested functions f(g(x)): **f'(g(x)) · g'(x)** — the outer sensitivity times the inner one.
- Read it as one sentence: *multiply the sensitivities along the path from input to output*.
- Longer chain? Keep multiplying. Ten links, ten factors.
- That is the whole of backpropagation. Everything else in a deep learning framework is bookkeeping.
- Which is also why gradients vanish or explode: a product of ten numbers all below 1 collapses; all above 1 detonates.`,
    },
    {
      type: 'math',
      intro: 'The chain rule, and its Leibniz form — the one worth memorizing because the symbols visibly cancel.',
      latex: [
        'h(x) = f\\bigl(g(x)\\bigr) \\quad\\Longrightarrow\\quad h^{\\prime}(x) = f^{\\prime}\\bigl(g(x)\\bigr) \\cdot g^{\\prime}(x)',
        '\\frac{dL}{dw} = \\frac{dL}{da} \\cdot \\frac{da}{dz} \\cdot \\frac{dz}{dw}',
      ],
    },
    {
      type: 'intuition',
      title: 'A 3-link chain, by hand, with real numbers',
      md: `One neuron, one sample. Input **x = 2**, target **y = 1**, weight **w = 0.5**, bias **b = −1**. Three links:

- **Link 1 (linear):** z = w·x + b = 0.5·2 − 1 = **0**.
- **Link 2 (squash):** a = σ(z) = σ(0) = **0.5**.
- **Link 3 (loss):** L = (a − y)² = (0.5 − 1)² = **0.25**.
- Now walk backwards. ∂L/∂a = 2(a − y) = 2(−0.5) = **−1**.
- ∂a/∂z = a(1 − a) = 0.5 · 0.5 = **0.25**.  ∂z/∂w = x = **2**.
- Multiply the three: −1 × 0.25 × 2 = **−0.5**. That is ∂L/∂w.`,
    },
    {
      type: 'math',
      intro: 'The same walk in symbols. Note every factor is a small, local, obvious derivative — the chain does the rest.',
      latex: [
        '\\frac{\\partial L}{\\partial w} = \\underbrace{\\frac{\\partial L}{\\partial a}}_{-1} \\cdot \\underbrace{\\frac{\\partial a}{\\partial z}}_{0.25} \\cdot \\underbrace{\\frac{\\partial z}{\\partial w}}_{2} = -0.5',
        '\\frac{\\partial L}{\\partial b} = (-1) \\cdot (0.25) \\cdot 1 = -0.25',
      ],
    },
    {
      type: 'note',
      md: `Sanity-check the *sign*, always — it is the cheapest bug detector you have. ∂L/∂w = −0.5 is negative, so the update w := w − α·(−0.5) **increases** w. Bigger w → bigger z → bigger a, moving 0.5 up toward the target y = 1. The math agrees with common sense. When it does not, you have a bug, not a discovery.`,
    },
    {
      type: 'intuition',
      title: 'Partial derivatives: one knob at a time',
      md: `A mixing desk with 50 faders. To learn what fader 7 does, you **hold the other 49 still** and wiggle only that one.

- That is a **partial derivative**, written ∂f/∂x₇: the derivative of f treating every other variable as a frozen constant.
- Mechanically identical to an ordinary derivative — just pretend the others are numbers.
- f(x, y) = x²y  →  ∂f/∂x = 2xy (y is a constant), ∂f/∂y = x² (x is a constant).
- Curly ∂ instead of d is pure notation: it only signals "there were other variables around".
- A model with 175 billion parameters has 175 billion partials. Each one answers: *nudge this weight, how does the loss move?*`,
    },
    {
      type: 'intuition',
      title: 'The gradient: all the partials, stacked into one arrow',
      md: `Stack every partial into a vector and you get the **gradient ∇f**. It stops being a list and becomes a direction.

- ∇f points in the direction of **steepest ASCENT** — the single fastest way to make f bigger.
- Its length is *how* steep: a long gradient means a cliff, near-zero means flat ground.
- We want the loss smaller, so we walk **−∇f**. That minus sign is the entire word "descent" in gradient descent.
- Why ascent and not some other direction? Because the change in f for a small step **u** is ∇f·u, and a dot product is maximized when u points the same way as ∇f. (Linear algebra earning its keep.)
- Flat ground (∇f ≈ 0) means a minimum, a maximum, or a saddle — the gradient alone cannot tell you which.`,
    },
    {
      type: 'math',
      intro: 'Gradient and the update rule you have already met.',
      latex: [
        '\\nabla f = \\left[\\, \\frac{\\partial f}{\\partial x_1},\\; \\frac{\\partial f}{\\partial x_2},\\; \\dots,\\; \\frac{\\partial f}{\\partial x_n} \\,\\right]',
        '\\theta := \\theta - \\alpha \\, \\nabla_{\\theta} J(\\theta)',
      ],
    },
    {
      type: 'intuition',
      title: 'The loss surface: the landscape those gradients live on',
      md: `Put the picture together. A **loss surface** is the graph of your loss as a function of your PARAMETERS — the thing gradient descent walks on.

- The horizontal axes are your weights (w₁, w₂, …). The vertical height is the loss J. A point on the surface = "this exact parameter setting is this bad".
- One weight gives a **curve** (the slider below). Two weights give a **surface** — a landscape. A million weights gives the same idea in a million dimensions: you can't picture it, but the maths does not change.
- A **contour line** joins points of equal loss, like altitude on a trekking map. The gradient is always **perpendicular** to the contour through your point — you proved that above: no movement along the contour changes J, so the direction of steepest change must be at right angles to it.
- **Convex** surface (one bowl, one bottom): any downhill path reaches THE minimum. Linear regression with MSE is this — which is why it has a closed-form answer at all.
- **Non-convex** (many valleys, saddles, plateaus, narrow ravines): deep networks live here. Where you start decides which valley you land in, and a flat plateau starves your steps without ever being an error.
- Same surface, different tools: the ravine shape is exactly why Momentum and Adam exist — you'll race them on a real one in the DL subject.`,
    },
    { type: 'visual', component: 'GradientDescentSlider', props: { fn: 'nonconvex' } },
    {
      type: 'note',
      md: `Watch what the ball is doing, because it is doing calculus. **The slope it feels under itself IS the derivative** dJ/dw at that point — one number, computed locally, with no view of the rest of the curve. Each step moves it *against* that slope, which is exactly "step in the direction of the negative gradient". Two things this non-convex curve shows that a simple bowl hides: the ball settles in whichever valley it started nearest (**initialization decides the outcome**), and on the flat stretch between valleys it barely moves because the derivative there is nearly zero (**a plateau starves the update, it does not break it**).`,
    },
    {
      type: 'intuition',
      title: 'End to end: the gradient of MSE for one weight',
      md: `The payoff. Model ŷ = w·x (no bias, one weight). Loss = MSE. Data: (1, 2), (2, 4), (3, 6) — so the true w is 2. Start at **w = 0.5**.

- Predictions: [0.5, 1, 1.5]. Errors (ŷ − y): [−1.5, −3, −4.5]. Loss J = 5.25.
- Chain rule per point: outer d/du of ½u² is u = (ŷ − y); inner d/dw of (w·x) is x. Multiply → **(ŷ − y)·x**.
- Average over the 3 points: (−1.5 + −6 + −13.5)/3 = **∂J/∂w = −7**.
- One step with α = 0.1: w := 0.5 − 0.1·(−7) = **1.2**. New loss: 5.25 → **1.49**. It worked.
- Say the gradient out loud: **error × input, averaged**.
- That is the *exact* formula the ML module **Gradient Descent + Linear Regression** hands you. You just derived it — it was one chain rule the whole time.`,
    },
    {
      type: 'math',
      intro: 'Written properly. The ½ is cosmetic: it cancels the 2 the power rule produces.',
      latex: [
        'J(w) = \\frac{1}{2m}\\sum_{i=1}^{m}\\bigl(w x^{(i)} - y^{(i)}\\bigr)^2',
        '\\frac{dJ}{dw} = \\frac{1}{m}\\sum_{i=1}^{m}\\bigl(\\hat{y}^{(i)} - y^{(i)}\\bigr)\\, x^{(i)}',
      ],
    },
    {
      type: 'intuition',
      title: 'The computational graph: forward values, backward multiplications',
      md: `Stop thinking "formula", start thinking **graph**. Every model is nodes; every node knows two tiny things.

- **Forward:** each node takes inputs, computes an output, and caches it. Values flow left to right.
- Each node also knows its own **local derivative** — output-per-input, for its one operation only. Nothing global.
- **Backward:** start at the loss with gradient 1, then walk right to left, multiplying each incoming gradient by the local derivative.
- Every node is dumb. It never sees the network. It only multiplies what arrived by what it knows.
- **Fan-out rule:** if a node feeds two places, its gradients from both paths are **added** (sum rule, applied to a graph).
- Step through the diagram below — those are the exact numbers from the 3-link chain.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One neuron: forward values, then backward gradients',
        notice: 'Left = values computed going forward. Right = gradients computed coming back. Each backward number is just the previous one times a local derivative.',
        leftLabel: 'forward',
        rightLabel: 'backward',
        frames: [
          {
            note: 'Forward, node 1 (linear). z = w*x + b = 0.5*2 + (-1) = 0. The node caches z for later.',
            stack: [
              { name: 'x  (input)', value: '2' },
              { name: 'w  (weight)', value: '0.5' },
              { name: 'b  (bias)', value: '-1' },
              { name: 'z = w*x + b', value: '0' },
            ],
            heap: [{ id: 'todo', value: 'not started', label: 'backward pass' }],
          },
          {
            note: 'Forward, node 2 (squash). a = sigmoid(0) = 0.5. Cached too — the sigmoid gradient reuses it.',
            stack: [
              { name: 'x  (input)', value: '2' },
              { name: 'w  (weight)', value: '0.5' },
              { name: 'b  (bias)', value: '-1' },
              { name: 'z = w*x + b', value: '0' },
              { name: 'a = sigmoid(z)', value: '0.5' },
            ],
            heap: [{ id: 'todo', value: 'not started', label: 'backward pass' }],
          },
          {
            note: 'Forward, node 3 (loss). Target y = 1, so L = (a - y)^2 = 0.25. Forward pass done.',
            stack: [
              { name: 'x  (input)', value: '2' },
              { name: 'w  (weight)', value: '0.5' },
              { name: 'b  (bias)', value: '-1' },
              { name: 'z = w*x + b', value: '0' },
              { name: 'a = sigmoid(z)', value: '0.5' },
              { name: 'L = (a - y)^2', value: '0.25' },
            ],
            heap: [{ id: 'todo', value: 'not started', label: 'backward pass' }],
          },
          {
            note: 'Backward starts at the END. Seed dL/dL = 1. Local derivative of (a-y)^2 is 2(a-y) = -1, so dL/da = 1 * -1 = -1.',
            stack: [
              { name: 'x  (input)', value: '2' },
              { name: 'w  (weight)', value: '0.5' },
              { name: 'b  (bias)', value: '-1' },
              { name: 'z = w*x + b', value: '0' },
              { name: 'a = sigmoid(z)', value: '0.5', to: 'ga' },
              { name: 'L = (a - y)^2', value: '0.25', to: 'gL' },
            ],
            heap: [
              { id: 'gL', value: 'dL/dL = 1', label: 'seed' },
              { id: 'ga', value: 'dL/da = -1', label: 'local: 2(a - y)' },
            ],
          },
          {
            note: 'Through the sigmoid. Local derivative a(1-a) = 0.5*0.5 = 0.25. Multiply: dL/dz = -1 * 0.25 = -0.25.',
            stack: [
              { name: 'x  (input)', value: '2' },
              { name: 'w  (weight)', value: '0.5' },
              { name: 'b  (bias)', value: '-1' },
              { name: 'z = w*x + b', value: '0', to: 'gz' },
              { name: 'a = sigmoid(z)', value: '0.5', to: 'ga' },
              { name: 'L = (a - y)^2', value: '0.25', to: 'gL' },
            ],
            heap: [
              { id: 'gL', value: 'dL/dL = 1', label: 'seed' },
              { id: 'ga', value: 'dL/da = -1', label: 'local: 2(a - y)' },
              { id: 'gz', value: 'dL/dz = -0.25', label: '-1 x 0.25' },
            ],
          },
          {
            note: 'Last hop. z = w*x + b has local derivatives x = 2 (for w) and 1 (for b). dL/dw = -0.25 * 2 = -0.5, dL/db = -0.25 * 1 = -0.25. These are what the optimizer subtracts.',
            stack: [
              { name: 'x  (input)', value: '2' },
              { name: 'w  (weight)', value: '0.5', to: 'gw' },
              { name: 'b  (bias)', value: '-1', to: 'gb' },
              { name: 'z = w*x + b', value: '0', to: 'gz' },
              { name: 'a = sigmoid(z)', value: '0.5', to: 'ga' },
              { name: 'L = (a - y)^2', value: '0.25', to: 'gL' },
            ],
            heap: [
              { id: 'gL', value: 'dL/dL = 1', label: 'seed' },
              { id: 'ga', value: 'dL/da = -1', label: 'local: 2(a - y)' },
              { id: 'gz', value: 'dL/dz = -0.25', label: '-1 x 0.25' },
              { id: 'gw', value: 'dL/dw = -0.5', label: '-0.25 x 2' },
              { id: 'gb', value: 'dL/db = -0.25', label: '-0.25 x 1' },
            ],
          },
        ],
      },
    },
    {
      type: 'note',
      md: `You have just hand-executed backpropagation. A real network is this graph with millions of nodes and matrices instead of scalars — the *procedure* does not change by one line. When you reach the DL module on **backpropagation**, it will replay this exact walk with layers in place of nodes; the only new content there is the matrix bookkeeping. Also note *why* backward goes right-to-left: one backward sweep produces the gradient for **every** parameter at once. Doing it forward-mode would cost one full pass per parameter — the difference between training GPT and not.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Gradient check: finite differences vs your formula — the bug-catcher',
      code: `import numpy as np

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

x, y = 2.0, 1.0                        # one sample: input 2, target 1

def loss(w, b):                        # forward: z -> a -> L
    return (sigmoid(w * x + b) - y) ** 2

def analytic_grad(w, b):               # the chain rule, by hand
    a = sigmoid(w * x + b)
    dL_dz = 2 * (a - y) * a * (1 - a)  # 2(a-y) . a(1-a)
    return np.array([dL_dz * x, dL_dz * 1.0])

def buggy_grad(w, b):                  # sabotage: forgot the sigmoid's local derivative
    a = sigmoid(w * x + b)
    return np.array([2 * (a - y) * x, 2 * (a - y)])

def numeric_grad(f, params, h=1e-5):   # central difference, one param at a time
    g = np.zeros(len(params))
    for i in range(len(params)):
        up, dn = list(params), list(params)
        up[i] += h
        dn[i] -= h
        g[i] = (f(*up) - f(*dn)) / (2 * h)
    return g

def rel_err(a, n):
    return np.abs(a - n).max() / max(np.abs(a).max(), np.abs(n).max(), 1e-12)

w, b = 0.5, -1.0
num = numeric_grad(loss, [w, b])
print('numeric ', num)                             # [-0.5  -0.25]
print('analytic', analytic_grad(w, b))             # [-0.5  -0.25]
print('rel err  %.2e' % rel_err(analytic_grad(w, b), num))   # 3.79e-11  -> PASS
print('buggy   ', buggy_grad(w, b))                # [-2.  -1. ]
print('rel err  %.2e' % rel_err(buggy_grad(w, b), num))      # 7.50e-01  -> FAIL`,
      annotations: {
        6: 'Hand-check: z = 0.5*2 - 1 = 0, a = sigmoid(0) = 0.5, L = (0.5 - 1)^2 = 0.25. Clean numbers on purpose.',
        13: 'The three links, multiplied: 2(a-y) = -1, times a(1-a) = 0.25, gives dL/dz = -0.25. Then x = 2 for w, and 1 for b.',
        26: 'Central difference, not (f(x+h)-f(x))/h. Two-sided error shrinks as h^2 instead of h — same cost, far more accurate.',
        30: 'RELATIVE error, never absolute: a gradient of 1e-8 and one of 1e8 need the same test.',
        36: 'Pass threshold in practice: < 1e-7 for float64 is solid, < 1e-4 is suspicious, > 1e-2 is a bug.',
        38: 'The dropped a(1-a) = 0.25 factor makes the gradient exactly 4x too big. Silent in training (loss still falls, just wrongly) — loud here.',
      },
    },
    {
      type: 'note',
      md: `Run this before you trust any hand-written gradient. Practical rules: check on **random small inputs**, not zeros (zeros hide sign errors); use **float64** — float32 noise alone can produce 1e-3 error and fake a failure; pick **h ≈ 1e-5** (too big = truncation error, too small = catastrophic cancellation in floating point, and the curve of error vs h is U-shaped); and **disable dropout and any other randomness** first, or you are differencing two different functions. Finally: turn it off in production — it costs two forward passes *per parameter*.`,
    },
    {
      type: 'note',
      md: `**Jacobian, in one note.** A gradient is for a function that outputs one number. When a function takes a vector *in* and puts a vector *out* (every layer of a network), the full set of partials is a **matrix**: J[i][j] = ∂(output i)/∂(input j) — the **Jacobian**. That matrix is what a layer's backward pass conceptually applies. Autograd almost never builds it, though: it computes **vector–Jacobian products** instead, because for a 1000-in/1000-out layer the matrix has a million entries but the product you actually need costs a thousand. If matrices-as-transformations still feels abstract, 3Blue1Brown's *Essence of Linear Algebra* is the fix — the Jacobian is exactly "the linear transformation your function looks like, up close".`,
    },
    {
      type: 'note',
      md: `**Second derivative, in one note.** Differentiate twice and you get f'' — **how fast the slope itself changes**, i.e. curvature. Sharp narrow valley = big f'' = your step size must be small. Wide flat valley = small f'' = you could stride. That is genuinely useful information a gradient does not carry, and **Newton's method** uses it (step = f'/f'') to jump toward the bottom in far fewer iterations. Why is nobody training GPT with Newton? The multivariable version of f'' is the **Hessian**, an n×n matrix — at n = 1 billion parameters, storing it is impossible, inverting it is a joke. **Adam** is the pragmatic compromise: it keeps a running estimate of gradient magnitude per parameter, giving each weight its own effective step size. Curvature-flavoured, at gradient prices.`,
    },
  ],
  quiz: [
    {
      question: 'Your loss has ∂L/∂w₁ = 0.02 and ∂L/∂w₂ = −8.5. What does that tell you?',
      options: [
        {
          text: 'w₂ is a much bigger weight than w₁',
          explanation: 'Wrong object. A partial derivative says nothing about a weight\'s VALUE — only about the loss\'s sensitivity to changing it.',
        },
        {
          text: 'The loss is far more sensitive to w₂, and increasing w₂ decreases the loss',
          explanation: 'Correct on both counts. Magnitude 8.5 vs 0.02 = leverage; the negative sign means loss falls as w₂ rises, so the update w₂ := w₂ − α(−8.5) pushes w₂ up.',
        },
        {
          text: 'w₂ has converged and w₁ has not',
          explanation: 'Backwards. A gradient near ZERO (w₁ here) is the convergence signal. A gradient of −8.5 means w₂ is far from where it wants to be.',
        },
      ],
      correct: 1,
    },
    {
      question: 'A 3-link chain has local derivatives 4, 0.5, and −3 along the path from w to L. What is ∂L/∂w?',
      options: [
        { text: '1.5 — the links are added', explanation: 'Addition is for gradients arriving from DIFFERENT paths (fan-out). Links along ONE path multiply.' },
        { text: '−6 — the links are multiplied', explanation: 'Correct: 4 × 0.5 × −3 = −6. Multiply the sensitivities along the path, exactly as the chain rule says.' },
        { text: '−3 — only the last link reaching w counts', explanation: 'Then every earlier layer would have zero influence on training. The chain rule exists precisely because every link contributes a factor.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is a stack of 20 sigmoid layers a gradient problem waiting to happen?',
      options: [
        {
          text: 'σ\' peaks at 0.25, so the chain multiplies 20 factors ≤ 0.25 and the gradient collapses toward zero',
          explanation: 'Correct. 0.25²⁰ ≈ 10⁻¹². Early layers receive essentially no signal — the vanishing-gradient problem, and the reason ReLU (slope exactly 1 when active) took over.',
        },
        { text: 'Sigmoid is too slow to compute 20 times', explanation: 'Compute cost is trivial and would not affect learning quality at all.' },
        { text: 'σ\' can be negative, so signs cancel', explanation: 'σ\' = σ(1−σ) is strictly positive, since σ ∈ (0,1). Sign flipping is not the issue; shrinkage is.' },
      ],
      correct: 0,
    },
    {
      question: 'ReLU is not differentiable at x = 0. Why does this not break training?',
      options: [
        { text: 'Frameworks smooth ReLU into a differentiable curve internally', explanation: 'They do not — that would be a different function (softplus is that idea, and it is a separate activation).' },
        {
          text: 'A subgradient is picked by convention (frameworks return 0), and float activations hit exactly 0.0 essentially never',
          explanation: 'Correct on both halves: the convention makes it well-defined, and the measure-zero argument makes it irrelevant in practice.',
        },
        { text: 'Gradient descent skips any sample where an activation is 0', explanation: 'No such skipping exists — the backward pass runs on every sample unconditionally.' },
      ],
      correct: 1,
    },
    {
      question: 'The gradient ∇J points in the direction of steepest ascent. What follows for the update rule?',
      options: [
        { text: 'We move along +∇J to reduce the loss', explanation: 'That moves UPHILL — it maximizes the loss. This is the single most common sign error in hand-written training loops.' },
        { text: 'We move perpendicular to ∇J', explanation: 'Perpendicular to the gradient is the direction of NO first-order change — you would walk the contour line forever and never descend.' },
        {
          text: 'We move along −∇J, which is why the update subtracts',
          explanation: 'Correct. θ := θ − α∇J. The minus sign is literally the word "descent" in gradient descent.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Your gradient check returns a relative error of 8e-1 between the analytic and numeric gradients. Most likely?',
      options: [
        { text: 'Normal floating-point noise — ship it', explanation: 'Float64 noise lives around 1e-10 to 1e-7. An error of 0.8 means the two numbers barely resemble each other.' },
        {
          text: 'Your analytic gradient is wrong — commonly a dropped local derivative factor',
          explanation: 'Correct. An error of that scale is a missing or mis-multiplied factor (exactly the sabotage in the code section, which produced 7.5e-1 by dropping a(1−a)).',
        },
        { text: 'h is too large; raise it to 1e-2', explanation: 'Raising h makes truncation error worse, not better. And no h choice explains an error of 0.8 on a smooth function.' },
      ],
      correct: 1,
    },
    {
      question: 'For f(x, y) = x²y, what is ∂f/∂y at (x = 3, y = 10)?',
      options: [
        { text: '60 (differentiate x², then plug in)', explanation: 'That is ∂f/∂x = 2xy = 2·3·10 = 60. The question asked about the y knob.' },
        { text: '9 — hold x still, so f = 9y and the derivative is 9', explanation: 'Correct. Partial wrt y treats x² = 9 as a constant multiplier, so ∂f/∂y = x² = 9. Note it does not depend on y at all.' },
        { text: '30', explanation: 'No rule produces this. Freezing x gives f = 9y, whose slope in y is 9.' },
      ],
      correct: 1,
    },
    {
      question: 'In a computational graph, node h feeds into two downstream nodes. How is ∂L/∂h computed?',
      options: [
        { text: 'Take the larger of the two incoming gradients', explanation: 'Discarding one path would silently drop part of the true derivative — the model would train on a wrong gradient.' },
        { text: 'Multiply the two incoming gradients', explanation: 'Multiplication is for links along ONE path. Two separate paths are a different situation.' },
        {
          text: 'Add the gradients arriving from both paths',
          explanation: 'Correct — the sum rule applied to a graph. Total sensitivity is the sum over all routes the influence travels. This is exactly how residual/skip connections give early layers a clean extra gradient path.',
        },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain the chain rule to someone who is about to implement backpropagation.',
      answer:
        'Gears: if A turns B at 3:1 and B turns C at 2:1, then A turns C at 6:1 — you multiply ratios along the path. Derivatives ARE those ratios ("how much does the next thing move per unit of this thing"), so for nested functions the sensitivities multiply: ∂L/∂w = ∂L/∂a · ∂a/∂z · ∂z/∂w. Backprop is that rule executed on a graph: each node knows only its own local derivative, the backward pass starts at the loss with gradient 1 and multiplies through, and gradients arriving from multiple paths are summed. Then add the engineering half: it runs right-to-left because one backward sweep yields every parameter\'s gradient at once, whereas forward-mode would cost one pass per parameter.',
      isCaseBased: false,
    },
    {
      question: 'Case: you wrote a custom layer and suspect its gradients are wrong. Training still runs and loss still falls slowly. How do you actually find out?',
      answer:
        'Gradient check with finite differences — this is exactly the situation it exists for. Procedure: (1) isolate the layer, feed it small RANDOM inputs (not zeros, which mask sign errors), in float64, with dropout and all randomness disabled. (2) For each parameter compute the central difference (f(θ+h) − f(θ−h)) / 2h with h ≈ 1e-5. (3) Compare against your analytic gradient using RELATIVE error, not absolute: < 1e-7 passes, ~1e-4 is suspicious, > 1e-2 is a bug. (4) If it fails, bisect — check the layer\'s sub-operations one at a time; a wrong gradient is almost always one dropped local-derivative factor or a transpose in the wrong place. Two traps worth naming: a non-smooth op like ReLU will fail the check legitimately if a test point sits near the kink (jitter the inputs), and PyTorch ships torch.autograd.gradcheck which does all this properly — reach for it before hand-rolling. And note the symptom you described is the dangerous one: a wrong-but-correlated gradient still reduces loss, so training "working" proves nothing.',
      isCaseBased: true,
    },
    {
      question: 'Why is the gradient the direction of steepest ascent, rather than just some direction that goes up?',
      answer:
        'For a small step u, the first-order change in f is the dot product ∇f · u. A dot product with a fixed vector is maximized when u points the same way as that vector — so among all unit directions, ∇f gives the largest increase. Two consequences worth stating: the gradient\'s LENGTH is the rate of that steepest increase, and any direction perpendicular to ∇f produces zero first-order change, which is why contour lines are always perpendicular to the gradient. Descent is then just the negation. Caveat to add unprompted: "steepest" is a purely local, first-order claim — it says nothing about being the fastest route to the minimum, which is exactly the gap that momentum and second-order methods exploit.',
      isCaseBased: false,
    },
    {
      question: 'Derive ∂J/∂w for MSE with a single weight, out loud.',
      answer:
        'J(w) = 1/2m Σ (w·x⁽ⁱ⁾ − y⁽ⁱ⁾)². Chain rule per term: the outer function is ½u², whose derivative is u = (ŷ − y); the inner function is w·x, whose derivative wrt w is x. Multiply: ∂J/∂w = 1/m Σ (ŷ⁽ⁱ⁾ − y⁽ⁱ⁾)·x⁽ⁱ⁾ — "error times input, averaged". The ½ was chosen precisely so the 2 from the power rule cancels; it changes nothing except cosmetics (and rescales the effective learning rate). Add the sanity check: if predictions are too high, errors are positive, the gradient is positive, and the update subtracts — w comes down. Correct sign.',
      isCaseBased: false,
    },
    {
      question: 'What is a Jacobian, and does autograd actually build one?',
      answer:
        'A gradient is the vector of partials for a scalar-output function. When the function maps a vector to a vector — every layer of a network — the full set of partials is a matrix, the Jacobian, with J[i][j] = ∂(output i)/∂(input j). Conceptually, a layer\'s backward pass applies that matrix. In practice autograd almost never materializes it: it computes vector–Jacobian products (vᵀJ) directly, because for a 1000-in/1000-out layer the matrix is 10⁶ entries while the product you actually need is 10³. That distinction is why reverse-mode autodiff is cheap and why full Jacobians only appear when you explicitly ask (jacrev, functorch, sensitivity analysis).',
      isCaseBased: false,
    },
    {
      question: 'What does the second derivative buy you, and why is nobody training large models with Newton\'s method?',
      answer:
        'f\'\' measures curvature — how fast the slope changes. It tells you what a gradient cannot: whether you are in a sharp narrow valley (needs small steps) or a wide flat one (you could stride), and it distinguishes a minimum from a maximum from a saddle. Newton\'s method uses it (step = f\'/f\'\') and converges in dramatically fewer iterations. The blocker is dimensionality: the multivariable f\'\' is the Hessian, an n×n matrix. At n = 10⁹ parameters, storing it needs ~10¹⁸ numbers and inverting it is worse than absurd. So the field uses cheap approximations: L-BFGS keeps a low-rank history (fine for small/medium problems), and Adam keeps a per-parameter running estimate of gradient magnitude, giving each weight its own effective step size — curvature-flavoured adaptivity at gradient cost. That is the honest framing: Adam is not second-order, it just buys some of the same benefit.',
      isCaseBased: false,
    },
    {
      question: 'Case: in a 30-layer network, gradients at layer 1 are around 1e-9 while layer 29 is around 1e-1. Diagnose and fix.',
      answer:
        'Vanishing gradients, and the chain rule says exactly why: layer 1\'s gradient is a product of ~29 local factors, so if each averages below 1 the product decays geometrically. Prime suspect is the activation — σ\' maxes at 0.25, tanh\' at 1.0 but typically far less when saturated. Fixes, roughly in order of impact: (1) ReLU-family activations, whose derivative is exactly 1 when active, so the product stops shrinking; (2) residual/skip connections — the identity path contributes a gradient of 1 that ADDS at the fan-out junction, giving early layers a route that never decays (this is the single biggest reason very deep nets became trainable); (3) normalization (BatchNorm/LayerNorm) to keep pre-activations out of saturated regions; (4) sane initialization (He/Xavier) so the per-layer factor starts near 1. Diagnostic to name: log per-layer gradient norms during training — the decay curve tells you immediately whether the problem is vanishing or something else entirely, like a dead-ReLU layer outputting all zeros.',
      isCaseBased: true,
    },
    {
      question: 'What is the difference between a partial derivative and the total gradient flowing to a node in a graph?',
      answer:
        'A partial derivative freezes every other variable and wiggles one. In a computational graph, a node can influence the loss through several routes, and the total derivative must account for all of them — so gradients arriving from different paths are ADDED (the multivariable chain rule, which is really the sum rule applied to a graph). Concretely: if h feeds both a residual branch and a main branch, ∂L/∂h is the sum of what comes back from each. Getting this wrong is a classic hand-written-backprop bug — people overwrite the gradient buffer instead of accumulating into it, which silently drops one path. It is also why PyTorch accumulates into .grad and requires an explicit zero_grad(): accumulation is the correct default for a graph.',
      isCaseBased: false,
    },
    {
      question: 'Why does deep learning insist that every operation be differentiable? What happens when a component is not?',
      answer:
        'Because gradient descent has exactly one input: the gradient. A non-differentiable op has no local derivative to multiply, so the chain breaks and every parameter upstream of it stops receiving signal. That is why we use cross-entropy instead of raw accuracy (accuracy is a step function — gradient zero almost everywhere and undefined at the thresholds), and why hard argmax/sampling gets replaced by softmax or Gumbel-softmax when it needs to sit inside a trained path. The nuance worth showing: "differentiable" is a low bar in practice — ReLU has one bad point and we use a subgradient there; what actually matters is having a USEFUL gradient. A function with gradient zero everywhere is technically differentiable and completely untrainable. When something genuinely cannot be relaxed, you leave gradient descent behind: REINFORCE/policy gradients, or evolutionary search.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague speeds up training by removing the activation functions from the hidden layers — "fewer ops, and now the gradients do not vanish". Loss plateaus much higher than before. Explain what happened using derivatives.',
      answer:
        'They are right that the gradients stopped vanishing, and it did not help, because they deleted the model. Without activations, the network is W₃W₂W₁x — a composition of linear maps, which collapses into one linear map. No matter how many layers, the whole thing is equivalent to a single-layer linear model, so it plateaus at whatever a linear model can achieve. The derivative view says it cleanly: each layer\'s local derivative is now a constant matrix independent of the input, so the chain rule produces a gradient that never depends on where you are in input space — the model has no capacity to bend. Non-linearity is precisely what makes each layer\'s local derivative input-dependent, and that is what buys expressive power. Correct fix for their actual concern: keep the non-linearity but use ReLU (local derivative 1 when active) plus residual connections, which addresses vanishing gradients without deleting the model\'s capacity.',
      isCaseBased: true,
    },
    {
      question: 'How do you numerically approximate a derivative, and why is the two-sided version standard?',
      answer:
        'Forward difference is (f(x+h) − f(x))/h, straight from the limit definition; its error shrinks like O(h). Central difference is (f(x+h) − f(x−h))/2h, and its error shrinks like O(h²) — the linear error terms cancel by symmetry — for the same two function evaluations. Free accuracy, so it is always the default. Choosing h is a U-shaped tradeoff: too large and truncation error dominates; too small and catastrophic cancellation dominates (you subtract two nearly equal floats and lose most of your significant digits). h ≈ 1e-5 in float64 sits near the bottom of that curve. And the reason this is a debugging tool rather than a training method: it costs two forward passes per parameter, so on a million-parameter model it is two million forward passes to get one gradient that backprop produces in a single backward pass.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Derivative, in ML terms', back: 'Sensitivity: nudge x a tiny bit, how much does f move? Sign = direction, magnitude = leverage.' },
    { front: 'Chain rule, in one sentence', back: 'f(g(x))\' = f\'(g(x))·g\'(x) — multiply the sensitivities along the path from input to output.' },
    { front: 'Derivative of sigmoid', back: 'σ\'(x) = σ(x)(1−σ(x)) — reuses the cached forward value. Peaks at 0.25 → vanishing gradients when stacked.' },
    { front: 'Derivative of ReLU', back: '1 for x>0, 0 for x<0, undefined at 0. Convention: frameworks return 0 (a valid subgradient). Slope exactly 1 when active = no shrinkage.' },
    { front: 'Partial derivative', back: 'Freeze every other variable, wiggle one. ∂f/∂x. Mechanically an ordinary derivative with the others treated as constants.' },
    { front: 'Gradient ∇f', back: 'The vector of all partials. Points in the direction of steepest ASCENT; length = how steep. Descent walks −∇f.' },
    { front: '∂J/∂w for MSE', back: 'Error × input, averaged: 1/m Σ (ŷ−y)·x. One chain rule — outer ½u² gives (ŷ−y), inner w·x gives x.' },
    { front: 'Backprop, procedurally', back: 'Forward: compute and cache node values. Backward: seed 1 at the loss, walk right-to-left multiplying each incoming gradient by the node\'s local derivative. Fan-out → ADD paths.' },
    { front: 'Gradient check', back: '(f(w+h) − f(w−h))/2h vs your formula, h≈1e-5, float64, RELATIVE error. <1e-7 pass, >1e-2 bug. Debug only — costs 2 forward passes per parameter.' },
    { front: 'Jacobian vs Hessian', back: 'Jacobian = all first partials of a vector→vector function (autograd computes vector–Jacobian products, never the matrix). Hessian = second derivatives; n×n, so Newton is impossible at scale — Adam approximates the benefit.' },
  ],
  mindmapMarkdown: `- Derivatives, the Chain Rule & Gradients
  - Derivative = sensitivity
    - Nudge x, how much does f move
    - Limit definition (seen once, then dropped)
  - Rules + the ML cast
    - Power, sum, product
    - x² → 2x · eˣ → eˣ · log x → 1/x
    - sigmoid → a(1−a), peaks at 0.25
    - ReLU → 1 or 0, kink at 0 → subgradient
  - Chain rule (the star)
    - Multiply sensitivities along the path
    - 3-link walk: −1 × 0.25 × 2 = −0.5
  - Partials → gradient
    - Hold everything still, wiggle one knob
    - ∇J = the vector of all partials
    - Steepest ASCENT, so descent steps −∇J
  - MSE gradient, end to end
    - dJ/dw = error × input, averaged
    - Feeds the ML gradient-descent module
  - Computational graph = backprop
    - Forward caches values
    - Backward multiplies local derivatives
    - Fan-out → gradients ADD
  - Gradient check
    - Central difference, h ≈ 1e-5
    - Relative error, float64, no dropout
  - Jacobian & curvature
    - Jacobian = all partials, vector → vector
    - Second derivative → Newton, Adam`,
}

export default m
