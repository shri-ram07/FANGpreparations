import type { Module } from '../types'

const m: Module = {
  id: 'dl-l0-activations',
  subjectId: 'dl',
  level: 0,
  title: 'Activation Functions: Sigmoid, Tanh, ReLU, GELU & Softmax',
  whyItMatters:
    'One function choice decides whether a 50-layer network trains or sits dead for a week. Deep learning was stuck for two decades largely because everyone used sigmoid; swapping in ReLU unstuck it. Interviewers ask "why ReLU?" and "what is a dying ReLU?" because the answers prove you understand gradients, not just APIs.',
  estMinutes: 45,
  sections: [
    {
      type: 'intuition',
      title: 'The one job an activation has',
      md: `Last module ended with a proof: stack linear layers and they **collapse**. W₂(W₁x) = (W₂W₁)x — one matrix. A hundred layers, still a straight line.

- The activation is the bend you put between layers so the collapse cannot happen.
- Analogy: layers are folds in paper. Linear folds keep it flat. One crease per fold and you can make any shape.
- That crease is all it is: a **cheap non-linear function applied to every neuron, element by element**.
- No shared parameters (mostly), no mixing between neurons — just f(z) on each pre-activation z.
- Which crease you pick is one of the highest-leverage one-line decisions in the whole field.`,
    },
    {
      type: 'intuition',
      title: 'Four properties that decide the winner',
      md: `Every activation debate reduces to these four. Learn to name them and you can reason about a function you have never seen.

- **Range** — what values can come out? Bounded (0,1) is a probability; unbounded is a free-form feature.
- **Zero-centred** — does the output average around 0, or is it always positive? Always-positive outputs bias the next layer's gradients all one direction.
- **Gradient behaviour** — this is the big one. How large is f′(z), and where does it go to ~0? A near-zero derivative **kills** the signal passing back through it.
- **Cost** — you run this on billions of neurons per forward pass. exp() is not free; max(0, z) is.
- Rule of thumb: gradient behaviour decides hidden layers; range decides the output layer.`,
    },
    {
      type: 'intuition',
      title: 'Sigmoid: the one that broke deep learning',
      md: `The squasher. Take any number, get something between 0 and 1. Big negative → ~0. Big positive → ~1.

- Feels perfect: it looks like a neuron firing, and the output reads as a probability.
- **The kill switch is its derivative.** σ′(z) = σ(z)(1 − σ(z)), which is a hill peaking at **0.25** when z = 0.
- 0.25 is its *best day*. At z = 3, σ′ = 0.045. At z = 6, σ′ = 0.0025.
- Backprop multiplies these derivatives together, one per layer. Multiplying numbers ≤ 0.25 repeatedly is how you get to zero fast.
- That is the **vanishing gradient**: early layers receive a gradient so small their weights never move.`,
    },
    {
      type: 'math',
      intro: 'Sigmoid, its derivative, and the arithmetic that ended the first deep-learning era.',
      latex: [
        '\\sigma(z) = \\frac{1}{1 + e^{-z}} \\in (0, 1) \\qquad \\sigma^{\\prime}(z) = \\sigma(z)\\bigl(1 - \\sigma(z)\\bigr)',
        '\\max_z \\sigma^{\\prime}(z) = \\sigma(0)\\bigl(1 - \\sigma(0)\\bigr) = 0.5 \\times 0.5 = 0.25',
        '\\frac{\\partial L}{\\partial z^{(1)}} \\;=\\; \\frac{\\partial L}{\\partial z^{(L)}} \\prod_{l=2}^{L} W^{(l)}\\, \\sigma^{\\prime}\\bigl(z^{(l)}\\bigr) \\;\\;\\Rightarrow\\;\\; \\text{best case } 0.25^{\\,L-1}',
        '0.25^{10} = \\frac{1}{4^{10}} = \\frac{1}{1{,}048{,}576} \\approx 9.5 \\times 10^{-7}',
      ],
    },
    {
      type: 'note',
      md: 'Read that last line slowly. Ten sigmoid layers, each behaving **as well as it possibly can**, shrink the gradient by a factor of a million. A learning rate of 0.01 then moves the first layer by ~10⁻⁸ per step. Realistically σ′ sits nearer 0.1, so 0.1¹⁰ = 10⁻¹⁰ — the first layers are frozen at initialization while the last layer learns fine.',
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'The vanishing-gradient chain, step by step',
        notice: 'Left: the gradient as it walks backward, layer by layer. Right: what each layer multiplies it by. Step through the sigmoid stack, then the same stack with ReLU.',
        leftLabel: 'gradient walking back',
        rightLabel: 'multiplier at that layer',
        frames: [
          {
            note: 'A gradient of 1.0 leaves the loss and starts walking back through a 6-layer sigmoid stack.',
            stack: [{ name: 'grad -> L6', value: '1.000000' }],
            heap: [{ id: 'mul', value: 'x 0.25 max', label: 'sigmoid f-prime' }],
          },
          {
            note: 'Layer 6 passes it on: 1.0 x 0.25 = 0.25. And 0.25 is the BEST case, reached only where z = 0.',
            stack: [
              { name: 'grad -> L6', value: '1.000000' },
              { name: 'grad -> L5', value: '0.250000' },
            ],
            heap: [{ id: 'mul', value: 'x 0.25 max', label: 'sigmoid f-prime' }],
          },
          {
            note: 'Layer 5: 0.25 x 0.25 = 0.0625. Two layers in and 94% of the learning signal is already gone.',
            stack: [
              { name: 'grad -> L6', value: '1.000000' },
              { name: 'grad -> L5', value: '0.250000' },
              { name: 'grad -> L4', value: '0.062500' },
            ],
            heap: [{ id: 'mul', value: 'x 0.25 max', label: 'sigmoid f-prime' }],
          },
          {
            note: 'Layer 4: 0.015625. Layer 4 now learns 64x slower than layer 6 on the exact same batch.',
            stack: [
              { name: 'grad -> L6', value: '1.000000' },
              { name: 'grad -> L5', value: '0.250000' },
              { name: 'grad -> L4', value: '0.062500' },
              { name: 'grad -> L3', value: '0.015625' },
            ],
            heap: [{ id: 'mul', value: 'x 0.25 max', label: 'sigmoid f-prime' }],
          },
          {
            note: 'Layer 3: 0.003906. Notice the pattern is exponential in depth, not linear.',
            stack: [
              { name: 'grad -> L6', value: '1.000000' },
              { name: 'grad -> L5', value: '0.250000' },
              { name: 'grad -> L4', value: '0.062500' },
              { name: 'grad -> L3', value: '0.015625' },
              { name: 'grad -> L2', value: '0.003906' },
            ],
            heap: [{ id: 'mul', value: 'x 0.25 max', label: 'sigmoid f-prime' }],
          },
          {
            note: 'Layer 2: 0.000977. Under one thousandth of what left the loss function.',
            stack: [
              { name: 'grad -> L6', value: '1.000000' },
              { name: 'grad -> L5', value: '0.250000' },
              { name: 'grad -> L4', value: '0.062500' },
              { name: 'grad -> L3', value: '0.015625' },
              { name: 'grad -> L2', value: '0.003906' },
              { name: 'grad -> L1', value: '0.000977' },
            ],
            heap: [{ id: 'mul', value: 'x 0.25 max', label: 'sigmoid f-prime' }],
          },
          {
            note: 'W1 receives 0.25^6 = 0.000244. At 10 layers it is 0.25^10 = 0.00000095. This is why deep sigmoid nets did not train.',
            stack: [
              { name: 'grad -> L6', value: '1.000000' },
              { name: 'grad -> L5', value: '0.250000' },
              { name: 'grad -> L4', value: '0.062500' },
              { name: 'grad -> L3', value: '0.015625' },
              { name: 'grad -> L2', value: '0.003906' },
              { name: 'grad -> L1', value: '0.000977' },
              { name: 'grad -> W1', value: '0.000244', to: 'dead', danger: true },
            ],
            heap: [
              { id: 'mul', value: 'x 0.25 max', label: 'sigmoid f-prime' },
              { id: 'dead', value: 'update ~ 0', label: 'layer 1 frozen' },
            ],
          },
          {
            note: 'Now the same 6 layers with ReLU. For every unit that is active (z > 0) the multiplier is exactly 1.',
            stack: [
              { name: 'grad -> L6', value: '1.000000' },
              { name: 'grad -> L5', value: '1.000000' },
            ],
            heap: [{ id: 'one', value: 'x 1.0  if z > 0', label: 'relu f-prime' }],
          },
          {
            note: 'Six layers later the gradient is still 1.0. Nothing shrank it. Depth suddenly became trainable.',
            stack: [
              { name: 'grad -> L6', value: '1.000000' },
              { name: 'grad -> L5', value: '1.000000' },
              { name: 'grad -> L4', value: '1.000000' },
              { name: 'grad -> L3', value: '1.000000' },
              { name: 'grad -> L2', value: '1.000000' },
              { name: 'grad -> L1', value: '1.000000' },
              { name: 'grad -> W1', value: '1.000000' },
            ],
            heap: [{ id: 'one', value: 'x 1.0  if z > 0', label: 'relu f-prime' }],
          },
          {
            note: 'The catch: for a unit stuck at z < 0 the multiplier is exactly 0 — not small, ZERO. That unit is dead forever. Meet the dying ReLU.',
            stack: [
              { name: 'grad -> L6', value: '1.000000' },
              { name: 'grad -> L5', value: '0.000000', to: 'zero', danger: true },
            ],
            heap: [
              { id: 'one', value: 'x 1.0  if z > 0', label: 'relu f-prime' },
              { id: 'zero', value: 'x 0    if z < 0', label: 'dead unit' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Sigmoid, second problem: it is not zero-centred',
      md: `Sigmoid outputs are always positive. Those outputs are the *inputs* to the next layer, and the gradient for a weight is **error × input**.

- Input always positive ⇒ every weight in that neuron gets a gradient with the **same sign** as the shared error term.
- So all weights of a neuron must go up together, or all down together. There is no "raise w₁, lower w₂" in one step.
- Wanted a diagonal move? You get a staircase: up-up-up, down-down-down. This is the classic **zig-zag** path.
- Cost is convergence speed, not correctness — but it stacks on top of vanishing gradients.
- **Verdict on sigmoid:** output layer for binary probability, yes. Hidden layers, never.`,
    },
    {
      type: 'intuition',
      title: 'Tanh: sigmoid that fixed one of the two bugs',
      md: `Same S-shape, rescaled to (−1, 1). Literally tanh(z) = 2σ(2z) − 1.

- **Zero-centred** — outputs spread either side of 0, so the zig-zag problem disappears.
- Derivative peaks at **1.0** (at z = 0), four times better than sigmoid's 0.25.
- So a tanh stack does not vanish nearly as fast — this is why tanh beat sigmoid in the 1990s and still lives inside LSTM gates.
- **But it still saturates.** At z = 3, tanh′ = 0.0099. Push activations away from 0 and the flat tails return.
- Verdict: strictly better than sigmoid for hidden layers, strictly worse than ReLU. A stepping stone.`,
    },
    {
      type: 'math',
      intro: 'Tanh, and the identity that shows it is a stretched sigmoid.',
      latex: [
        '\\tanh(z) = \\frac{e^{z} - e^{-z}}{e^{z} + e^{-z}} = 2\\sigma(2z) - 1 \\;\\in\\; (-1, 1)',
        '\\tanh^{\\prime}(z) = 1 - \\tanh^{2}(z) \\qquad \\max_z \\tanh^{\\prime}(z) = \\tanh^{\\prime}(0) = 1',
      ],
    },
    {
      type: 'intuition',
      title: 'ReLU: max(0, z), and why it won everything',
      md: `The whole function is: if the number is negative, make it 0; otherwise leave it alone. That is it. And it beat two decades of cleverer ideas.

- **No saturation on the positive side.** f′(z) = 1 for all z > 0 — the gradient passes through *unchanged*, forever, at any depth.
- **Free to compute.** One comparison. No exp, no division. On billions of activations this is a real wall-clock win.
- **Sparsity.** Roughly half the units output exactly 0, so each layer's representation is sparse — cheaper, and often better-conditioned.
- **The derivative is trivially cheap too:** 1 or 0, no extra math for the backward pass.
- Not fashionable, not smooth, not differentiable at 0 (frameworks just define f′(0) = 0 and move on). It works.`,
    },
    {
      type: 'intuition',
      title: 'The dying ReLU — the price of that hard zero',
      md: `A unit whose pre-activation z is negative outputs 0 **and** passes gradient 0. If z is negative for *every* input in the dataset, that unit is done.

- Gradient 0 ⇒ its weights never update ⇒ z stays negative ⇒ gradient stays 0. A closed loop with no exit.
- It is not "learning slowly". The unit is permanently removed from the network. 40% of a layer can die this way.
- **Cause 1: learning rate too high.** One giant update knocks the bias hugely negative; the unit never comes back.
- **Cause 2: a large negative bias**, from a bad init or accumulated updates, pushing z below 0 for all inputs.
- Symptom to recognise in an interview: loss plateaus early and a chunk of activations are *exactly* zero for every batch.`,
    },
    {
      type: 'intuition',
      title: 'The fixes: Leaky ReLU, PReLU, ELU',
      md: `All three do the same thing — refuse to let the negative side have exactly zero gradient.

- **Leaky ReLU:** f(z) = z for z > 0, else αz with α = 0.01. Tiny slope, but non-zero, so a dead unit can crawl back.
- **PReLU:** same shape, but α is a **learned parameter** per channel. More power, more parameters, slight overfit risk on small data.
- **ELU:** smooth, and saturates to −α on the far negative side. Pushes mean activation toward 0 (a poor man's normalization) at the cost of an exp().
- Honest ranking: none of these reliably beat plain ReLU on benchmarks. Reach for Leaky **when you have diagnosed dead units**, not by default.
- Fixing the learning rate usually beats swapping the activation.`,
    },
    {
      type: 'math',
      intro: 'The ReLU family, written out. Note where each one is and is not zero.',
      latex: [
        '\\mathrm{ReLU}(z) = \\max(0, z) \\qquad \\mathrm{ReLU}^{\\prime}(z) = \\begin{cases} 1 & z > 0 \\\\ 0 & z < 0 \\end{cases}',
        '\\mathrm{LeakyReLU}(z) = \\begin{cases} z & z > 0 \\\\ \\alpha z & z \\le 0 \\end{cases} \\quad \\alpha = 0.01 \\;\\; (\\text{learned in PReLU})',
        '\\mathrm{ELU}(z) = \\begin{cases} z & z > 0 \\\\ \\alpha\\bigl(e^{z} - 1\\bigr) & z \\le 0 \\end{cases}',
      ],
    },
    {
      type: 'intuition',
      title: 'GELU: what every modern transformer actually uses',
      md: `BERT, GPT, ViT, Llama-family MLP blocks — none of them use plain ReLU. They use **GELU** (or its sibling SiLU/Swish).

- Idea: instead of a hard on/off gate, weight the input by **how likely it is to be positive**. f(z) = z · Φ(z), where Φ is the standard-normal CDF.
- Φ(z) is a smooth probability in (0,1): Φ(−3) ≈ 0.001 (kill it), Φ(0) = 0.5 (halve it), Φ(3) ≈ 0.999 (keep it).
- So it is a **soft, probabilistic ReLU**. Smooth everywhere, no hard kink, and a small negative dip that lets a little gradient through below zero.
- **SiLU / Swish:** f(z) = z·σ(z). Same shape, sigmoid instead of the normal CDF, marginally cheaper. Used in Llama-family models as SwiGLU.
- Be honest in interviews: the gain over ReLU is **modest — a fraction of a point** — but it is real and it repeats at scale, which is enough when a training run costs millions.`,
    },
    {
      type: 'math',
      intro: 'GELU exactly, GELU as everyone actually implements it, and SiLU.',
      latex: [
        '\\mathrm{GELU}(z) = z \\cdot \\Phi(z), \\qquad \\Phi(z) = P(Z \\le z), \\;\\; Z \\sim \\mathcal{N}(0, 1)',
        '\\mathrm{GELU}(z) \\approx 0.5\\,z\\left(1 + \\tanh\\!\\left[\\sqrt{\\tfrac{2}{\\pi}}\\bigl(z + 0.044715\\, z^{3}\\bigr)\\right]\\right)',
        '\\mathrm{SiLU}(z) = z \\cdot \\sigma(z) \\qquad \\text{(a.k.a. Swish)}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'All five activations and their derivatives on one input vector — real output pasted',
      code: `import numpy as np
from math import erf, sqrt, pi

x = np.array([-3.0, -1.0, -0.1, 0.0, 0.1, 1.0, 3.0])

def sigmoid(z):   return 1 / (1 + np.exp(-z))
def d_sigmoid(z):
    s = sigmoid(z); return s * (1 - s)                # sigma * (1 - sigma)

def tanh(z):      return np.tanh(z)
def d_tanh(z):    return 1 - np.tanh(z) ** 2

def relu(z):      return np.maximum(0.0, z)
def d_relu(z):    return (z > 0).astype(float)        # f'(0) := 0 by convention

def lrelu(z, a=0.01):    return np.where(z > 0, z, a * z)
def d_lrelu(z, a=0.01):  return np.where(z > 0, 1.0, a)

Phi = np.vectorize(lambda t: 0.5 * (1 + erf(t / sqrt(2))))   # standard normal CDF
def phi(z):       return np.exp(-z ** 2 / 2) / sqrt(2 * pi)  # its density
def gelu(z):      return z * Phi(z)
def d_gelu(z):    return Phi(z) + z * phi(z)                 # product rule

rows = [('sigmoid', sigmoid, d_sigmoid), ('tanh', tanh, d_tanh),
        ('relu', relu, d_relu), ('leaky', lrelu, d_lrelu), ('gelu', gelu, d_gelu)]

print('x           ' + ' '.join(f'{v:>7.1f}' for v in x))
print('-' * 68)
for name, f, _ in rows:
    print(f'{name:<8} f  ' + ' '.join(f'{v:>7.3f}' for v in f(x)))
print('-' * 68)
for name, _, d in rows:
    print(f"{name:<8} f' " + ' '.join(f'{v:>7.3f}' for v in d(x)))
print('-' * 68)
for name, _, d in rows:
    print(f'{name:<8} max derivative on this grid: {d(x).max():.3f}')

# ------------------------------ real output ------------------------------
# x              -3.0    -1.0    -0.1     0.0     0.1     1.0     3.0
# --------------------------------------------------------------------
# sigmoid  f    0.047   0.269   0.475   0.500   0.525   0.731   0.953
# tanh     f   -0.995  -0.762  -0.100   0.000   0.100   0.762   0.995
# relu     f    0.000   0.000   0.000   0.000   0.100   1.000   3.000
# leaky    f   -0.030  -0.010  -0.001   0.000   0.100   1.000   3.000
# gelu     f   -0.004  -0.159  -0.046   0.000   0.054   0.841   2.996
# --------------------------------------------------------------------
# sigmoid  f'   0.045   0.197   0.249   0.250   0.249   0.197   0.045
# tanh     f'   0.010   0.420   0.990   1.000   0.990   0.420   0.010
# relu     f'   0.000   0.000   0.000   0.000   1.000   1.000   1.000
# leaky    f'   0.010   0.010   0.010   0.010   1.000   1.000   1.000
# gelu     f'  -0.012  -0.083   0.420   0.500   0.580   1.083   1.012
# --------------------------------------------------------------------
# sigmoid  max derivative on this grid: 0.250
# tanh     max derivative on this grid: 1.000
# relu     max derivative on this grid: 1.000
# leaky    max derivative on this grid: 1.000
# gelu     max derivative on this grid: 1.083`,
      annotations: {
        8: 'The famous shortcut: sigmoid\'s derivative is expressible in its own output, so backprop reuses the forward value for free.',
        14: 'ReLU is not differentiable at z = 0. Every framework just picks a subgradient — PyTorch and TensorFlow both return 0. It has never mattered in practice.',
        17: 'Leaky ReLU\'s whole fix is right here: 0.01 instead of 0.0. Small, but never exactly zero, so a dead unit can climb back.',
        19: 'Exact GELU via the stdlib error function — no scipy needed. Frameworks ship the tanh approximation because erf used to be slow on GPU.',
        22: 'GELU derivative can exceed 1 (peaks at ~1.08) and dips NEGATIVE near z = -1. Look at the gelu f-prime row: -0.012 and -0.083.',
        47: 'This row IS the vanishing gradient: every entry <= 0.25, already down to 0.045 by z = +/-3. Compare the tanh row below it (max 1.000) and the relu row (exactly 1 or exactly 0).',
      },
    },
    {
      type: 'note',
      md: 'Two things worth staring at in that table. **Row `sigmoid f\'`:** the whole row is ≤ 0.25, and it has already fallen to 0.045 by z = ±3 — sigmoid is nearly flat over most of its domain. **Row `relu f\'`:** every entry is exactly 1.0 or exactly 0.0. There is no in-between, which is both why gradients survive depth and why dead units are permanent.',
    },
    {
      type: 'intuition',
      title: 'Softmax: the multi-class output layer',
      md: `Different job entirely. The others map one number to one number. Softmax maps a **vector of K scores to a probability distribution over K classes**.

- Two steps: exponentiate every score (makes everything positive, amplifies the leader), then divide by the total (makes them sum to 1).
- Scores are called **logits** — raw, unbounded, meaningless in isolation. Only their *differences* matter.
- Why exp and not just "divide by the sum"? Logits can be negative, which would make negative "probabilities"; exp fixes that and gives a clean, differentiable gradient with cross-entropy.
- Softmax is **shift-invariant**: adding the same constant c to every logit changes nothing. That freedom is what makes the stability trick legal.
- Pair it with cross-entropy loss and the gradient collapses to a beautiful **(prediction − truth)** — the same "error" shape from linear regression.`,
    },
    {
      type: 'math',
      intro: 'Softmax, the shift-invariance that licenses the max trick, and the overflow it prevents.',
      latex: [
        '\\mathrm{softmax}(z)_i = \\frac{e^{z_i}}{\\sum_{j=1}^{K} e^{z_j}} \\qquad \\sum_{i=1}^{K} \\mathrm{softmax}(z)_i = 1',
        '\\frac{e^{z_i}}{\\sum_j e^{z_j}} = \\frac{e^{z_i - c}\\,e^{c}}{e^{c}\\sum_j e^{z_j - c}} = \\frac{e^{z_i - c}}{\\sum_j e^{z_j - c}} \\quad \\forall c \\;\\;\\Rightarrow\\;\\; \\text{take } c = \\max_j z_j',
        '\\text{float64 overflows at } e^{709.8}: \\;\\; e^{1000} = \\infty, \\;\\; \\tfrac{\\infty}{\\infty} = \\mathrm{NaN}. \\;\\; \\text{After the shift the largest term is } e^{0} = 1.',
        '\\mathrm{softmax}(z / T)_i \\;:\\quad T \\to 0 \\Rightarrow \\text{argmax}, \\quad T = 1 \\Rightarrow \\text{the model}, \\quad T > 1 \\Rightarrow \\text{flatter, more random}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Softmax: the overflow, the one-line fix, and temperature — real output pasted',
      code: `import numpy as np

def softmax(z):
    e = np.exp(z - z.max())        # THE trick: shift by the max
    return e / e.sum()

logits = np.array([1000.0, 1001.0, 1002.0])
naive = np.exp(logits) / np.exp(logits).sum()   # overflow -> inf / inf

print('naive :', naive)
print('stable:', softmax(logits))
print('shifted logits:', logits - logits.max())
print('sums to       :', softmax(logits).sum())

small = np.array([2.0, 1.0, 0.1])
for T in (0.5, 1.0, 2.0):
    print(f'T={T}:', np.round(softmax(small / T), 3))

# ---------------- real output (stderr RuntimeWarnings omitted) ----------------
# naive : [nan nan nan]
# stable: [0.09003057 0.24472847 0.66524096]
# shifted logits: [-2. -1.  0.]
# sums to       : 0.9999999999999999
# T=0.5: [0.864 0.117 0.019]
# T=1.0: [0.659 0.242 0.099]
# T=2.0: [0.502 0.304 0.194]`,
      annotations: {
        4: 'One subtraction. Largest shifted logit is 0, so the largest exp is exactly 1 — overflow is now impossible. Every real softmax implementation does this.',
        8: 'exp(1000) = inf in float64, and inf/inf = nan. The model was fine; the arithmetic killed it. NaN loss with healthy gradients is often this.',
        12: 'Proof the trick is free, not approximate: the shifted logits are just [-2, -1, 0] and the probabilities are identical to the exact math.',
        13: 'Sums to 0.9999999999999999, not 1.0 — floating point, not a bug. Never test softmax output with ==.',
        17: 'Temperature: divide logits BEFORE softmax. T=0.5 sharpens the leader from 0.659 to 0.864; T=2.0 flattens it to 0.502. This one knob is the creativity slider in GenAI sampling.',
      },
    },
    {
      type: 'note',
      md: 'Why softmax never goes in hidden layers: it **couples every neuron in the layer** — raising one output must lower the others, because they are forced to sum to 1. A hidden layer needs independent features that can all be active at once, not a competition with a fixed budget. Softmax also caps every unit at 1 and, by normalizing, throws away the magnitude information the next layer wanted. Use it exactly once: the final layer of a multi-class classifier.',
    },
    {
      type: 'intuition',
      title: 'The decision list — memorise this, not the graphs',
      md: `Ninety percent of real choices are covered by six lines.

- **Hidden layers, default:** ReLU. Fast, deep-friendly, boring, correct.
- **Hidden layers, transformer:** GELU (or SiLU/SwiGLU). Match whatever the architecture you are copying uses.
- **Hidden layers, you have diagnosed dead units:** Leaky ReLU — *after* you have checked the learning rate.
- **Output, binary classification:** sigmoid → one probability in (0,1).
- **Output, multi-class (one label):** softmax over K logits. **Multi-label** (several can be true): K independent sigmoids, not softmax.
- **Output, regression:** none. A raw linear output; squashing it would cap what the model can predict.`,
    },
    {
      type: 'note',
      md: 'One line to file away for the normalization module: the canonical order is **Linear → BatchNorm → activation**. Normalizing before the non-linearity centres the pre-activations where the derivative is largest, which is precisely where sigmoid/tanh do not saturate and where ReLU units are least likely to die. The original ResNet put BN after the conv and before ReLU; "pre-activation" ResNet later moved BN and ReLU before the conv and trained even deeper. Both work — the point is that this ordering is a real decision, not a formality.',
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `import numpy as np

SCALE = 1.0  # <-- change me: 1.0, then 3.0, then 10.0

z = np.array([-2.0, -0.5, 0.5, 2.0]) * SCALE
sig = lambda v: 1 / (1 + np.exp(-v))
gelu = lambda v: 0.5 * v * (1 + np.tanh(0.7978845608 * (v + 0.044715 * v ** 3)))
h = 1e-6

fns = {
    'sigmoid':   (sig(z),                        sig(z) * (1 - sig(z))),
    'tanh':      (np.tanh(z),                    1 - np.tanh(z) ** 2),
    'relu':      (np.maximum(0.0, z),            (z > 0) * 1.0),
    'leakyrelu': (np.where(z > 0, z, 0.01 * z),  np.where(z > 0, 1.0, 0.01)),
    'gelu':      (gelu(z),                       (gelu(z + h) - gelu(z - h)) / (2 * h)),
}

row = lambda v, w: ' '.join(('%' + w) % t for t in v)
print('SCALE =', SCALE, '  z =', row(z, '8.2f'))
print()
for name, (a, d) in fns.items():
    print('%-10s f  = %s' % (name, row(a, '10.5f')))
    print("%-10s f' = %s" % ('', row(d, '10.6f')))`,
        precomputedOutput: `SCALE = 1.0   z =    -2.00    -0.50     0.50     2.00

sigmoid    f  =    0.11920    0.37754    0.62246    0.88080
           f' =   0.104994   0.235004   0.235004   0.104994
tanh       f  =   -0.96403   -0.46212    0.46212    0.96403
           f' =   0.070651   0.786448   0.786448   0.070651
relu       f  =    0.00000    0.00000    0.50000    2.00000
           f' =   0.000000   0.000000   1.000000   1.000000
leakyrelu  f  =   -0.02000   -0.00500    0.50000    2.00000
           f' =   0.010000   0.010000   1.000000   1.000000
gelu       f  =   -0.04540   -0.15429    0.34571    1.95460
           f' =  -0.086099   0.132630   0.867370   1.086099`,
        caption: 'Saturation, seen not asserted: push SCALE to 3.0 then 10.0 and watch sigmoid and tanh derivatives print 0.000000 while ReLU holds 1.0',
      },
    },
  ],
  quiz: [
    {
      question: 'A 10-layer network uses sigmoid in every hidden layer. Assume every unit sits exactly at its best case for gradient flow. By roughly what factor is the gradient reaching layer 1 reduced?',
      options: [
        { text: 'About 10x — one factor per layer', explanation: 'The shrinkage is multiplicative, not additive. Ten factors of 0.25 multiply, they do not sum.' },
        { text: 'About 10⁻⁶ — 0.25 raised to the 10th power', explanation: 'Correct. 0.25¹⁰ = 1/1,048,576 ≈ 9.5×10⁻⁷. And that is the BEST case; typical σ′ near 0.1 gives 10⁻¹⁰.' },
        { text: 'No reduction — sigmoid preserves gradient magnitude', explanation: 'Sigmoid\'s derivative never exceeds 0.25, so it can only ever shrink the gradient, never preserve it.' },
        { text: 'About 0.25 — the max derivative applies once', explanation: 'It applies once per layer. Ten layers means the factor appears ten times.' },
      ],
      correct: 1,
    },
    {
      question: 'What makes a ReLU unit "dead", and why can it never recover on its own?',
      options: [
        { text: 'Its output saturates near 1, so the derivative approaches 0', explanation: 'That is sigmoid/tanh saturation. ReLU has no upper bound and never saturates on the positive side.' },
        { text: 'Its weights became NaN', explanation: 'NaN weights break the whole network, not one unit, and that is a numerical bug rather than the dying-ReLU phenomenon.' },
        { text: 'Its pre-activation is negative for every input, so its gradient is exactly 0 — and zero gradient means the weights never change, which keeps the pre-activation negative', explanation: 'Correct, and the closed loop is the key insight: no gradient means no update means no gradient. Usual causes are a too-high learning rate or a large negative bias.' },
        { text: 'It outputs the same constant for every input, so the loss ignores it', explanation: 'Outputting a constant is the symptom; the mechanism that locks it in is the exactly-zero gradient below 0.' },
      ],
      correct: 2,
    },
    {
      question: 'Why subtract the maximum logit before exponentiating in softmax?',
      options: [
        { text: 'Softmax is shift-invariant, so it changes nothing mathematically but keeps the largest exponent at e⁰ = 1, preventing overflow', explanation: 'Correct. The e^c factor cancels between numerator and denominator, so the result is exact — this is a free fix, not an approximation.' },
        { text: 'It makes the probabilities sum to 1', explanation: 'The division by the sum already guarantees that, with or without the shift.' },
        { text: 'It speeds up the exponential', explanation: 'exp() costs the same on any input. The concern is overflow, not speed.' },
        { text: 'It makes the output sharper, like a low temperature', explanation: 'Sharpening requires scaling the logits (dividing by T), not shifting them. A shift provably changes nothing.' },
      ],
      correct: 0,
    },
    {
      question: 'Tanh is preferred over sigmoid for hidden layers primarily because…',
      options: [
        { text: 'Tanh is cheaper to compute', explanation: 'Both use exponentials — tanh is if anything marginally more expensive. Cost is not the argument.' },
        { text: 'Tanh never saturates', explanation: 'It absolutely does. At z = 3, tanh′ ≈ 0.0099, even flatter than sigmoid there.' },
        { text: 'Tanh outputs are unbounded', explanation: 'Tanh is bounded to (−1, 1). ReLU is the unbounded one.' },
        { text: 'It is zero-centred, and its derivative peaks at 1.0 instead of 0.25', explanation: 'Correct on both counts: no all-same-sign gradient zig-zag, and 4x more gradient survives each layer. Still saturating, so ReLU still wins.' },
      ],
      correct: 3,
    },
    {
      question: 'Your last layer must predict, for one image, which of {has_cat, has_dog, is_outdoors} apply — any number of them can be true. What goes on the output?',
      options: [
        { text: 'Softmax over the 3 logits', explanation: 'Softmax forces the three to compete for a budget of 1.0. If a cat and a dog are both present, it cannot say so.' },
        { text: 'Three independent sigmoids, one per label', explanation: 'Correct. Multi-label needs independent probabilities; each sigmoid answers its own yes/no question, and they need not sum to anything.' },
        { text: 'ReLU on each logit', explanation: 'ReLU is unbounded above and gives 0 for all negatives — those are not probabilities.' },
        { text: 'No activation — use raw logits', explanation: 'That is the regression answer. Here you need calibrated probabilities per label.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is softmax a bad choice for a hidden layer?',
      options: [
        { text: 'It is too expensive to compute', explanation: 'Cost is a minor issue compared to the structural problem, and softmax runs fine on output layers of 50,000 classes.' },
        { text: 'It couples the neurons — outputs must sum to 1, so raising one forces others down, and normalization discards magnitude the next layer needs', explanation: 'Correct. A hidden layer wants independent features that can all fire at once, not a fixed-budget competition.' },
        { text: 'Its gradient is always zero', explanation: 'Softmax has a perfectly well-defined non-zero Jacobian; that is not the problem.' },
        { text: 'It is not differentiable', explanation: 'It is smooth and differentiable everywhere — that is one of its main virtues.' },
      ],
      correct: 1,
    },
    {
      question: 'From the code table: GELU\'s derivative is −0.083 at z = −1 and 1.083 at z = 1. What does the negative value tell you?',
      options: [
        { text: 'The implementation is wrong — derivatives cannot be negative', explanation: 'They certainly can. GELU is non-monotonic: it dips slightly below zero around z ≈ −1 before rising, so its slope there is negative.' },
        { text: 'GELU is non-monotonic — it dips below zero near z ≈ −1, so gradient can flow (with a sign flip) on the negative side, unlike ReLU\'s hard 0', explanation: 'Correct. That small negative region is exactly the smoothness that lets sub-zero units keep receiving signal, and it is why GELU has no dying-unit problem.' },
        { text: 'GELU saturates like sigmoid', explanation: 'GELU\'s derivative tends to 1 for large positive z — the opposite of saturating on the useful side.' },
        { text: 'GELU cannot be used with backprop', explanation: 'It is smooth and differentiable everywhere, which makes it strictly friendlier to backprop than ReLU\'s kink.' },
      ],
      correct: 1,
    },
    {
      question: 'You are choosing an activation for the hidden layers of a plain image classifier with no other information. Best default?',
      options: [
        { text: 'GELU, because transformers use it', explanation: 'GELU is a fine choice, but it is the transformer convention, and its gain over ReLU is a fraction of a point. It is not the reflex answer for a generic net.' },
        { text: 'Leaky ReLU, to be safe against dead units', explanation: 'Pre-emptive Leaky is a common instinct but not the default: it adds a hyperparameter to fix a problem you have not observed. Reach for it after diagnosing dead units.' },
        { text: 'Sigmoid, since it is the classic neuron model', explanation: 'The classic model is exactly what stopped deep nets from training — ≤0.25 gradient per layer plus a zig-zag from non-zero-centred outputs.' },
        { text: 'ReLU', explanation: 'Correct. Fastest, no positive-side saturation, sparse, and the baseline everything else is measured against. Change only when you have a measured reason.' },
      ],
      correct: 3,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why do we need activation functions at all? Prove it.',
      answer:
        'Without them a network is one big linear map. Two layers give W₂(W₁x + b₁) + b₂ = (W₂W₁)x + (W₂b₁ + b₂) — a single matrix and a single vector, i.e. exactly the expressive power of one linear layer. Induction extends this to any depth: composing linear maps yields a linear map. So a 100-layer linear net cannot represent XOR, which a 2-layer net with one non-linearity can. The activation is the element-wise non-linearity that breaks the collapse; everything else — the depth, the parameter count — only buys you capacity because that crease is in between.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through the vanishing-gradient problem with actual numbers.',
      answer:
        'Backprop multiplies one factor per layer: ∂L/∂z⁽¹⁾ = ∂L/∂z⁽ᴸ⁾ · Π W⁽ˡ⁾σ′(z⁽ˡ⁾). For sigmoid, σ′ = σ(1−σ) peaks at 0.25 (at z = 0) and falls off fast — 0.045 at z = 3. Take the absolute best case of 0.25 every layer: after 10 layers the factor is 0.25¹⁰ = 1/1,048,576 ≈ 9.5×10⁻⁷. With a learning rate of 0.01 the first layer moves by ~10⁻⁸ per step, which is indistinguishable from frozen. Realistic σ′ around 0.1 gives 10⁻¹⁰. Meanwhile the last layer sees a healthy gradient and trains fine — so the loss does fall, just to a bad plateau. ReLU fixes it because f′ = 1 exactly for active units: the product is 1×1×…×1 and depth costs nothing.',
      isCaseBased: false,
    },
    {
      question: 'Case: you inherit a 30-layer MLP. Training loss drops for 200 steps then flatlines high. You log per-layer gradient norms and see 1e-2 at the last layer, 1e-9 at the first. Diagnose and fix, in order.',
      answer:
        'That gradient-norm gradient IS the diagnosis: vanishing gradients, seven orders of magnitude across depth. Order of attack: (1) check the activations — if hidden layers are sigmoid or tanh, swap to ReLU; that alone usually fixes it and costs nothing. (2) Check weight init: default/small-variance init compounds the shrinkage; use He init for ReLU (variance 2/fan_in), Xavier for tanh. (3) Add normalization — BatchNorm or LayerNorm keeps pre-activations near the high-derivative region and is the standard structural fix. (4) Add residual connections: they give the gradient an identity path with derivative 1 straight to layer 1, which is why 30+ layers became routine after ResNet. (5) Only then consider fewer layers. Tradeoff to name: residuals and normalization add compute and, for BatchNorm, a train/test behaviour split — but at 30 layers you are not getting there without them.',
      isCaseBased: true,
    },
    {
      question: 'Case: dying-ReLU debugging. After an aggressive LR sweep, your best run has 45% of layer-2 activations exactly 0.0 on every batch and validation accuracy stuck 6 points below baseline. Walk through it.',
      answer:
        'Confirm first: log the fraction of units with zero output across many batches. A unit that is zero for *every* batch is dead; a unit zero for half the batches is just sparse and healthy. Then find the cause. (1) Learning rate — "aggressive sweep" is the smoking gun: one oversized step drives the bias strongly negative and the unit never returns, since its gradient is then exactly 0. Retrain at 1/10th LR and re-measure the dead fraction; this usually recovers most of it. (2) Inspect the biases of dead units — large negative values confirm the mechanism. (3) Warmup + gradient clipping stops the single catastrophic early step that kills them. (4) Structural fallbacks if it persists: Leaky ReLU (α = 0.01) or ELU so the negative side has non-zero gradient, He initialization so pre-activations start centred, BatchNorm before the activation to keep them there. Tradeoffs: Leaky adds a hyperparameter and no measured accuracy win on healthy nets, so it is a fix, not a default; lowering LR costs wall-clock; BatchNorm adds train/test divergence. The senior move is to fix the LR first and only change the activation if dead units survive that.',
      isCaseBased: true,
    },
    {
      question: 'ReLU is not differentiable at 0 and has zero gradient for all negative inputs. Why is it still the default?',
      answer:
        'Both objections are theoretically real and practically irrelevant. Non-differentiability at exactly 0: the pre-activation being bit-exactly 0.0 has effectively zero probability in floating point, and frameworks simply define f′(0) = 0 — a valid subgradient. Zero gradient below 0: it is a genuine cost (dying units) but it buys sparsity, which is cheap and often helps conditioning, and it is bounded — the units that matter for a given input are the active ones, and for those the gradient passes through at exactly 1. That perfect gradient preservation at depth, plus a single comparison instruction on billions of activations, outweighs the theoretical blemishes. Smoothed alternatives (ELU, GELU, softplus) fix the math and win a fraction of a point at best.',
      isCaseBased: false,
    },
    {
      question: 'Explain the numerical-stability trick in softmax and prove it is exact, not an approximation.',
      answer:
        'Compute softmax(z − max(z)) instead of softmax(z). Proof: e^(zᵢ−c)/Σⱼe^(zⱼ−c) = (e^zᵢ·e^−c)/(e^−c·Σⱼe^zⱼ) = e^zᵢ/Σⱼe^zⱼ for any constant c. The e^−c cancels, so the result is identical — softmax is shift-invariant, only logit *differences* matter. Choosing c = max(z) makes the largest exponent e⁰ = 1, so nothing can overflow, and the worst underflow (a very negative shifted logit) yields 0, which is the correct answer anyway. Without it, float64 overflows at e^709.8: logits of 1000 give inf/inf = NaN. In practice you go further and use log-softmax / a fused cross-entropy that never materializes the probabilities, avoiding log(0) as well.',
      isCaseBased: false,
    },
    {
      question: 'Why do transformers use GELU rather than ReLU? Be honest about the size of the effect.',
      answer:
        'GELU(z) = z·Φ(z) gates the input by the probability that a standard normal is below it — a smooth, stochastic-flavoured version of ReLU\'s hard on/off. Practical differences: it is smooth everywhere (no kink), it lets a little gradient through for slightly-negative inputs so units cannot die, and it is non-monotonic with a small dip near z ≈ −1. Empirically the gain over ReLU on transformer benchmarks is small — commonly a fraction of a point of perplexity or accuracy — but it is consistent and it holds at scale, and when a run costs seven figures a consistent fraction of a point is worth an extra exp(). SiLU/Swish (z·σ(z)) is the near-identical sibling used in Llama-family SwiGLU blocks. The honest interview answer is "smoothness and no dead units, for a modest but real and repeatable gain" — not "GELU is much better".',
      isCaseBased: false,
    },
    {
      question: 'What does "not zero-centred" cost you, concretely?',
      answer:
        'Sigmoid outputs are all positive, and those outputs are the inputs to the next layer. The weight gradient is (upstream error)·(input); with every input positive, every weight feeding a given neuron receives a gradient of the same sign in a single step. So all of that neuron\'s weights must increase together or decrease together — the optimizer cannot make a diagonal move and instead zig-zags toward it, taking more steps. Tanh removes this because its outputs straddle zero. ReLU is technically also non-negative and so shares the flaw, which is one reason BatchNorm/LayerNorm — which re-centre activations — pair so well with it. Cost is convergence speed, not final accuracy, but it compounds with the vanishing-gradient problem in sigmoid nets.',
      isCaseBased: false,
    },
    {
      question: 'Someone proposes softmax on a hidden layer to "make the features interpretable". What do you say?',
      answer:
        'Two structural objections. First, softmax couples the units: they are forced to sum to 1, so increasing one feature mathematically requires decreasing others. Hidden layers need features that can be simultaneously and independently active — "this is furry" and "this is outdoors" are not in competition. Second, normalizing throws away magnitude: [1, 2, 3] and [100, 200, 300] give different results, but [1,2,3] and [11,12,13] give very different results too, while all scale information the next layer might use is destroyed. Also the Jacobian is dense and K×K rather than diagonal, so it is more expensive. If the goal is genuinely interpretable competing features, attention weights or a sparsity penalty are the right tools; softmax belongs on the final layer of a single-label classifier.',
      isCaseBased: false,
    },
    {
      question: 'How does temperature change a softmax, and where does it show up in practice?',
      answer:
        'Divide the logits by T before softmax. T < 1 magnifies the differences between logits and sharpens the distribution toward the argmax; T > 1 shrinks them and flattens toward uniform; T → 0 is a hard argmax and T → ∞ is uniform. In the module\'s numbers, logits [2, 1, 0.1] give 0.659 for the leader at T = 1, 0.864 at T = 0.5, 0.502 at T = 2.0. In practice: it is the creativity/randomness knob in LLM sampling (low T for code and factual answers, higher T for brainstorming), the softening term in knowledge distillation (a high-T teacher distribution carries far more information than a one-hot label), and the learned scale in contrastive losses like CLIP. Note it changes only the sampling distribution, never the ranking.',
      isCaseBased: false,
    },
    {
      question: 'For a regression model predicting house prices, what activation goes on the output layer?',
      answer:
        'None — a plain linear output. Any squashing function caps the range: sigmoid could never predict above 1, tanh could never exceed 1, and ReLU would clamp every negative prediction to exactly 0, which destroys the gradient for those examples and is wrong for any target that can go negative. Prices are non-negative, so ReLU is tempting, but a better route is to keep the output linear and either predict log(price) (which enforces positivity after exponentiating, and makes the error multiplicative — usually the right assumption for prices) or use softplus if you truly need smooth positivity. The mistake to avoid: reaching for an activation on the output out of habit. Hidden layers need non-linearity; the output layer needs to match the *range of the target*.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague swaps every hidden ReLU for sigmoid in a 4-layer net "because probabilities are more interpretable". Training accuracy drops from 94% to 78%. Explain what happened and what interpretability they actually lost.',
      answer:
        'What happened: four layers of σ′ ≤ 0.25 shrink the gradient reaching layer 1 by up to 0.25³ ≈ 0.016, and realistically far more since σ′ collapses once pre-activations leave a narrow band around 0 — the early layers barely train, so the net effectively becomes a shallow model sitting on frozen random features. On top of that, all-positive activations force same-sign weight gradients and zig-zag convergence, so even the layers that do train converge slower within the same budget. Four layers is not deep enough to freeze them completely, which is exactly why the result is a degradation rather than a total failure. The interpretability argument is also confused: a hidden-unit output in (0,1) is not a probability of anything — it is an arbitrary squashed feature with no calibration and no semantics. Real interpretability comes from probing, attribution, or attention weights. Fix: revert to ReLU; if they want probabilities, that is the job of the *output* layer.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Why any activation at all?', back: 'Stacked linear layers collapse: W₂(W₁x) = (W₂W₁)x. The element-wise non-linearity is the only thing that makes depth add expressive power.' },
    { front: 'Sigmoid: formula and its two bugs', back: 'σ(z) = 1/(1+e⁻ᶻ) ∈ (0,1); σ′ = σ(1−σ), max 0.25 at z = 0. Bug 1: that ≤0.25 vanishes gradients. Bug 2: all-positive outputs → same-sign weight gradients → zig-zag. Verdict: binary output only.' },
    { front: 'The vanishing-gradient arithmetic', back: 'Best case 0.25 per sigmoid layer. 10 layers → 0.25¹⁰ = 1/1,048,576 ≈ 9.5×10⁻⁷. Layer 1 is frozen while layer 10 trains fine.' },
    { front: 'Tanh', back: '(−1,1), zero-centred, tanh′ = 1 − tanh², peaking at 1.0. Beats sigmoid in hidden layers, still saturates (tanh′(3) ≈ 0.01). Loses to ReLU.' },
    { front: 'Why ReLU won', back: 'max(0,z). f′ = 1 for z > 0 so gradients survive any depth; one comparison to compute; ~half the units output 0 (sparsity).' },
    { front: 'Dying ReLU', back: 'z negative for every input → gradient exactly 0 → weights never update → z stays negative. Permanent. Causes: LR too high, big negative bias.' },
    { front: 'The ReLU-family fixes', back: 'Leaky (fixed α = 0.01 slope below 0), PReLU (learned α), ELU (smooth, saturates to −α). Use after diagnosing dead units — fix the LR first.' },
    { front: 'GELU', back: 'z·Φ(z) — gate the input by the probability it is positive. Smooth, slightly non-monotonic, no dead units. SiLU/Swish = z·σ(z). Modest but real gain over ReLU at scale.' },
    { front: 'Softmax + the stability trick', back: 'eᶻⁱ/Σeᶻʲ → positive, sums to 1. Subtract max(z) first: shift-invariant so it is exact, and it stops e¹⁰⁰⁰ = inf → NaN. Output layer only.' },
    { front: 'Output-layer decision list', back: 'Binary → sigmoid. Multi-class single label → softmax. Multi-label → K independent sigmoids. Regression → no activation.' },
  ],
  mindmapMarkdown: `- Activation Functions
  - Why they exist
    - Linear stack collapses to one matrix, so add a crease
  - Judge by four properties
    - Range, zero-centredness, gradient behaviour, cost
  - Sigmoid
    - 1/(1+e^-z), range (0,1)
    - derivative sigma(1-sigma), max 0.25
    - 0.25^10 = 9.5e-7 -> vanishing gradient
    - not zero-centred -> zig-zag; binary output only
  - Tanh
    - (-1,1), zero-centred, derivative max 1.0, still saturates
  - ReLU
    - max(0, z): one comparison, sparse, the default
    - f' = 1 when active -> depth is free
    - dying ReLU: z<0 always -> grad 0 forever
    - causes: LR too high, big negative bias
  - ReLU family fixes
    - Leaky (alpha), PReLU (learned), ELU (smooth)
  - GELU
    - z * Phi(z), smooth probabilistic gate
    - SiLU / Swish = z * sigmoid(z); modest real gain
  - Softmax
    - exponentiate then normalize, sums to 1
    - subtract max: exact, stops overflow
    - temperature T sharpens or flattens
  - Decision list
    - hidden: ReLU, GELU in transformers, Leaky if dead
    - output: sigmoid / softmax / none
    - order: Linear -> BatchNorm -> activation`,
}

export default m
