import type { Module } from '../types'

const m: Module = {
  id: 'dl-l0-backpropagation',
  subjectId: 'dl',
  level: 0,
  title: 'Backpropagation: The Chain Rule on a Graph',
  whyItMatters:
    'This is the algorithm that made deep learning possible, and "derive backprop for one layer" is asked in almost every DL interview. It is also the only module where a candidate who has written the backward pass by hand is instantly distinguishable from one who has only called loss.backward(). Build it here in NumPy, on XOR, and you will never be bluffing again.',
  estMinutes: 65,
  sections: [
    {
      type: 'intuition',
      title: 'The problem: one number, a million dials',
      md: `Training is the loop you already know: predict, measure the miss, nudge every weight downhill. The nudge needs a gradient — ∂L/∂w — **for every single weight**.

- A tiny 2-3-1 network has 13 numbers. ResNet-50 has 25 million. GPT-3 has 175 billion.
- The loss L is ONE number, measured at the very end of the network.
- Every weight, however deep and however early, contributed something to that one number.
- So the question is brutally concrete: *how much would L change if I wiggled this one weight?* — asked 25 million times, for every batch, for every step.
- Get all of them cheaply and you can train anything. That is the entire job.`,
    },
    {
      type: 'intuition',
      title: 'The naive way, and why it is hopeless',
      md: `Obvious plan: to find ∂L/∂w, nudge w by a tiny ε, run the whole network again, see how much L moved. Divide. Done.

- Cost per weight: one full forward pass (two, if you nudge both directions for accuracy).
- ResNet-50: 25 million weights → **25 million forward passes** to take ONE gradient step.
- At an optimistic 1000 forward passes per second, that is about 7 hours. Per step. You need millions of steps.
- The cost is fundamentally wrong: it scales with the *number of parameters*, and parameters are the thing we keep adding.
- Backprop gets every one of those gradients in **one backward pass**, costing roughly the same as one forward pass. Not 25 million times cheaper by a trick — cheaper because it stops throwing away work.`,
    },
    {
      type: 'intuition',
      title: 'Blame assignment: the whole idea in one image',
      md: `A restaurant serves a bad dish. The customer complains once, at the door — that complaint is the loss.

- The manager does not re-cook 25 million dishes to find the culprit. He asks the chef: *how much of this was you?*
- The chef splits his share of the blame among his inputs: mostly the sauce, a little the pan.
- The sauce station splits its share again: mostly the salt, a little the stock.
- Blame flows **backwards**, and each station only needs two things: the blame handed to it, and how sensitive its own output was to each of its inputs.
- Nobody ever sees the whole restaurant. One pass from the door to the kitchen and every station knows its bill.

That is backpropagation. The loss is measured at the output, and each layer asks the layer before it: *how much of this error was your doing?*`,
    },
    {
      type: 'hinglish',
      md: `Ek dish kharab bani. Customer ne shikayat sirf **darwaze pe** ki — wahi hai loss. Ab manager 25 million dish dobara nahi banata; wo chef se poochta hai, chef sauce wale se, sauce wala namak wale se. Har banda sirf apne hisse ka blame aage badhata hai.

Backprop bilkul yahi hai: **galti output pe napi gayi, phir peeche har weight se poocha gaya — tera kitna haath tha is galti me?** Har layer ke paas do hi cheezein hoti hain: upar se aaya hua blame, aur apna chhota sa local derivative. Dono ko multiply karo, peeche pass kar do. Ek hi backward chakkar me poore network ka hisaab saaf.`,
    },
    {
      type: 'intuition',
      title: 'The computational graph: the machine that does it',
      md: `Stop thinking "layers" for a minute and think **graph**. Every operation is a node.

- Nodes are operations: multiply, add, relu, sigmoid, the loss itself.
- Edges carry **values forward** during the forward pass, and **gradients backward** during the backward pass.
- Each node needs exactly two things to do its job on the way back: its own **local derivative** (how my output changes when my input changes — a one-line fact about that operation alone), and the **gradient arriving from downstream** (how much L cares about my output).
- Multiply them. That is the chain rule. Pass the result to my inputs.
- No node ever knows what the network looks like. A relu node has never heard of the loss function. Local rule, global result — that is why the same code runs a 3-neuron toy and a 175-billion-parameter model.`,
    },
    { type: 'visual', component: 'NeuralNetForward', props: {} },
    {
      type: 'note',
      md: 'Run the forward pass above a few times and change a weight. Two things to notice, because both matter in a minute. First, every neuron does the same two steps: a weighted sum (**z**), then a squashing function (**a = f(z)**). Second, the intermediate values z and a are *sitting there on screen* — the network computed them and is keeping them. It has to. The backward pass will need every one of them.',
    },
    {
      type: 'math',
      intro:
        'One hidden layer, one output, binary label. Forward first — nothing new, just naming things so the derivation has vocabulary.',
      latex: [
        'z^{[1]} = W^{[1]} x + b^{[1]} \\qquad a^{[1]} = \\mathrm{relu}(z^{[1]})',
        'z^{[2]} = W^{[2]} a^{[1]} + b^{[2]} \\qquad \\hat{y} = \\sigma(z^{[2]}) = \\frac{1}{1 + e^{-z^{[2]}}}',
        '\\mathcal{L} = -\\left[\\, y \\log \\hat{y} + (1-y)\\log(1-\\hat{y}) \\,\\right] \\quad \\text{(binary cross-entropy)}',
      ],
    },
    {
      type: 'math',
      intro:
        'The same forward pass with real numbers, so the backward numbers below have something to hang on. x has 2 features, the hidden layer has 2 units, the label is 1.',
      latex: [
        'x = \\begin{bmatrix} 1 \\\\ 2 \\end{bmatrix}, \\quad W^{[1]} = \\begin{bmatrix} 0.5 & -0.5 \\\\ 1.0 & 0.5 \\end{bmatrix}, \\quad b^{[1]} = 0, \\quad W^{[2]} = \\begin{bmatrix} 1.0 & -0.5 \\end{bmatrix}, \\quad b^{[2]} = 0.25, \\quad y = 1',
        'z^{[1]} = \\begin{bmatrix} -0.5 \\\\ 2.0 \\end{bmatrix} \\;\\to\\; a^{[1]} = \\begin{bmatrix} 0 \\\\ 2.0 \\end{bmatrix} \\;\\to\\; z^{[2]} = -0.75 \\;\\to\\; \\hat{y} = 0.3208 \\;\\to\\; \\mathcal{L} = 1.1369',
        '\\text{The label is 1 and we predicted 0.32. We are wrong, and now we find out whose fault it is.}',
      ],
    },
    {
      type: 'intuition',
      title: 'The first step back, and a small miracle',
      md: `Start at the loss and walk one node backwards, to z⁽²⁾ — the number just before the sigmoid.

- Chain rule says: ∂L/∂z⁽²⁾ = (∂L/∂ŷ) · (∂ŷ/∂z⁽²⁾). Two ugly expressions.
- ∂L/∂ŷ for cross-entropy has ŷ(1−ŷ) in the *denominator*. ∂ŷ/∂z⁽²⁾ for sigmoid is ŷ(1−ŷ). They cancel exactly.
- What survives is **ŷ − y**. Prediction minus truth. That is it.
- We call it **δ_out** (delta at the output) — the blame that starts the whole backward journey.
- This cancellation is not luck: cross-entropy is *designed* as the matching loss for sigmoid, precisely so the gradient never gets squashed by the sigmoid's flat tails. (The Metrics subject derives this the other way round, from "why cross-entropy over MSE for classification" — same fact, opposite direction.)
- Same story for softmax + categorical cross-entropy: δ_out = ŷ − y again, with one-hot y.`,
    },
    {
      type: 'math',
      intro:
        'The cancellation written out, then the rest of the backward pass. Read each line as: local derivative × the delta that arrived.',
      latex: [
        '\\frac{\\partial \\mathcal{L}}{\\partial \\hat{y}} = \\frac{\\hat{y} - y}{\\hat{y}(1-\\hat{y})} \\qquad \\frac{\\partial \\hat{y}}{\\partial z^{[2]}} = \\hat{y}(1-\\hat{y})',
        '\\delta_{\\text{out}} \\equiv \\frac{\\partial \\mathcal{L}}{\\partial z^{[2]}} = \\frac{\\hat{y} - y}{\\hat{y}(1-\\hat{y})} \\cdot \\hat{y}(1-\\hat{y}) = \\hat{y} - y',
        '\\frac{\\partial \\mathcal{L}}{\\partial W^{[2]}} = \\delta_{\\text{out}} \\; a^{[1]\\top} \\qquad \\frac{\\partial \\mathcal{L}}{\\partial b^{[2]}} = \\delta_{\\text{out}}',
        '\\delta_{\\text{hidden}} = \\left( W^{[2]\\top} \\delta_{\\text{out}} \\right) \\odot \\mathrm{relu}^{\\prime}(z^{[1]}), \\qquad \\mathrm{relu}^{\\prime}(z) = \\mathbf{1}[z > 0]',
        '\\frac{\\partial \\mathcal{L}}{\\partial W^{[1]}} = \\delta_{\\text{hidden}} \\; x^{\\top} \\qquad \\frac{\\partial \\mathcal{L}}{\\partial b^{[1]}} = \\delta_{\\text{hidden}}',
      ],
    },
    {
      type: 'math',
      intro: 'The same five lines, with the numbers from the forward pass above. Every value here is one multiplication away from the one before it.',
      latex: [
        '\\delta_{\\text{out}} = 0.3208 - 1 = -0.6792',
        '\\frac{\\partial \\mathcal{L}}{\\partial W^{[2]}} = -0.6792 \\cdot \\begin{bmatrix} 0 & 2.0 \\end{bmatrix} = \\begin{bmatrix} 0 & -1.3584 \\end{bmatrix}',
        '\\delta_{\\text{hidden}} = \\underbrace{\\begin{bmatrix} -0.6792 \\\\ 0.3396 \\end{bmatrix}}_{W^{[2]\\top}\\delta_{\\text{out}}} \\odot \\underbrace{\\begin{bmatrix} 0 \\\\ 1 \\end{bmatrix}}_{\\mathrm{relu}^{\\prime}(z^{[1]})} = \\begin{bmatrix} 0 \\\\ 0.3396 \\end{bmatrix}',
        '\\frac{\\partial \\mathcal{L}}{\\partial W^{[1]}} = \\begin{bmatrix} 0 \\\\ 0.3396 \\end{bmatrix} \\begin{bmatrix} 1 & 2 \\end{bmatrix} = \\begin{bmatrix} 0 & 0 \\\\ 0.3396 & 0.6792 \\end{bmatrix}',
      ],
    },
    {
      type: 'note',
      md: 'Look at the zeros. Hidden unit 1 had z = −0.5, so relu switched it off — and its entire row of ∂L/∂W1 is zero. **A neuron that did not contribute to the prediction receives no blame and gets no update.** That is relu\'s local derivative (1 if on, 0 if off) doing its job, and it is also the mechanism behind "dying relu": a unit that is off for every sample in the data never gets a gradient again, forever.',
    },
    {
      type: 'note',
      md: 'Now say the pattern out loud, because it is the whole module and it is two sentences. **Every gradient is (local derivative) × (upstream delta).** And **every weight gradient is (delta at this layer) × (the activation feeding into it)** — look at ∂L/∂W2 = δ_out · a1ᵀ and ∂L/∂W1 = δ_hidden · xᵀ: same shape, different names. If you can recite these two lines and point at where each factor comes from, you can derive backprop for any layer anyone puts on a whiteboard.',
    },
    {
      type: 'note',
      md: 'In the stepper below, each frame is **one chain-rule multiplication** — watch a number arrive from the right, get multiplied by a local derivative sitting on the node, and continue left. Nothing else happens; there is no other operation in backprop. The last frames switch to the SGD update: w := w − α·∂L/∂w, applied once per weight, and the loss for that input drops. Step through it twice — once watching the deltas, once watching the weights change.',
    },
    { type: 'visual', component: 'BackpropStepper', props: {} },
    {
      type: 'intuition',
      title: 'Batches: the same math, one axis wider',
      md: `Nobody trains on one sample. Stack B samples as rows of a matrix X and the derivation barely changes.

- Forward becomes matrix multiplies: Z1 = XW1 + b1, A1 = relu(Z1), and so on. Every row is an independent sample.
- Δ_out = Ŷ − Y is now (B × 1): one delta per sample, still just prediction minus truth.
- Weight gradients become a matmul instead of an outer product: ∂L/∂W2 = A1ᵀ Δ_out. **That matmul is a sum over the batch axis.**
- Bias gradients are a plain sum down the batch axis, because a bias is added identically to every sample.
- Why sum, not average-by-magic: the batch loss is defined as the *mean* over samples, and the derivative of a sum is the sum of derivatives. The 1/B either sits in the loss or gets divided in once at the delta — pick one place and be consistent. (Both appear in real code; mixing them silently scales your learning rate by B.)`,
    },
    {
      type: 'math',
      intro: 'The vectorized form. B = batch size. Note where the 1/B lives.',
      latex: [
        '\\mathcal{L} = \\frac{1}{B}\\sum_{i=1}^{B} \\mathcal{L}_i \\quad \\Rightarrow \\quad \\Delta_{\\text{out}} = \\frac{1}{B}\\left( \\hat{Y} - Y \\right) \\in \\mathbb{R}^{B \\times 1}',
        '\\frac{\\partial \\mathcal{L}}{\\partial W^{[2]}} = A^{[1]\\top} \\Delta_{\\text{out}} \\qquad \\frac{\\partial \\mathcal{L}}{\\partial b^{[2]}} = \\sum_{i=1}^{B} \\Delta_{\\text{out},i}',
        '\\Delta_{\\text{hidden}} = \\left( \\Delta_{\\text{out}} W^{[2]\\top} \\right) \\odot \\mathbf{1}[Z^{[1]} > 0] \\qquad \\frac{\\partial \\mathcal{L}}{\\partial W^{[1]}} = X^\\top \\Delta_{\\text{hidden}}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'A whole neural network, from scratch, learning XOR — forward, backward, update',
      code: `import numpy as np

X = np.array([[0., 0.], [0., 1.], [1., 0.], [1., 1.]])   # (4, 2) one row per sample
y = np.array([[0.], [1.], [1.], [0.]])                   # XOR: no straight line does this

rng = np.random.default_rng(0)
H = 4                                                    # hidden units
W1 = rng.normal(0, 1.0, (2, H)); b1 = np.zeros((1, H))
W2 = rng.normal(0, 1.0, (H, 1)); b2 = np.zeros((1, 1))
lr, m = 0.5, X.shape[0]

for epoch in range(1201):
    # ---------- forward ----------
    z1 = X @ W1 + b1                 # (4, H)
    a1 = np.maximum(0, z1)           # relu
    z2 = a1 @ W2 + b2                # (4, 1)
    yh = 1 / (1 + np.exp(-z2))       # sigmoid
    loss = -np.mean(y * np.log(yh + 1e-9) + (1 - y) * np.log(1 - yh + 1e-9))

    # ---------- backward ----------
    d2 = (yh - y) / m                # delta at the output layer
    dW2 = a1.T @ d2                  # (activation in)^T @ delta
    db2 = d2.sum(0, keepdims=True)   # sum over the batch axis
    d1 = (d2 @ W2.T) * (z1 > 0)      # through W2, then through relu's gate
    dW1 = X.T @ d1
    db1 = d1.sum(0, keepdims=True)

    # ---------- update ----------
    W2 -= lr * dW2; b2 -= lr * db2
    W1 -= lr * dW1; b1 -= lr * db1
    if epoch % 200 == 0:
        print(f"epoch {epoch:5d}  loss {loss:.4f}")

print("preds", np.round(yh.ravel(), 4))
print("labels", y.ravel())

# ---------- real output ----------
# epoch     0  loss 0.8383
# epoch   200  loss 0.0463
# epoch   400  loss 0.0156
# epoch   600  loss 0.0090
# epoch   800  loss 0.0061
# epoch  1000  loss 0.0046
# epoch  1200  loss 0.0037
# preds [0.0101 0.9983 0.9983 0.0013]
# labels [0. 1. 1. 0.]`,
      annotations: {
        4: 'XOR is the classic reason hidden layers exist: no single line separates {(0,1),(1,0)} from {(0,0),(1,1)}. A network with no hidden layer is stuck at loss ~0.69 forever.',
        8: 'Weights random, biases zero. If ALL weights started equal, every hidden unit would compute the same thing and receive the same gradient forever — random init is what breaks that symmetry.',
        14: 'z1 and a1 are computed here and still needed on line 22 and line 24. That is why training stores activations — and why batch size hits a memory wall.',
        20: 'Everything below is 6 lines. That is the entire backward pass for this network — no library, no magic.',
        21: 'The whole derivation collapses to this because sigmoid + BCE cancel. Divide by m here so the gradient matches the MEAN loss on line 18.',
        22: '(delta at this layer) × (activation feeding in). Transposed and matmul-ed because the sum over the batch axis is baked into the matmul.',
        23: 'Bias gradient = plain sum over samples: a bias is added identically to every row, so every row votes on it.',
        24: 'Two multiplications, exactly as derived: push delta back through W2, then multiply by relu\'s local derivative (z1 > 0), which is 1 for live units and 0 for dead ones.',
        29: 'Gradient descent, unchanged from the linear-regression module. Backprop only supplies the numbers; the update rule was never the hard part.',
      },
    },
    {
      type: 'note',
      md: 'Read the output once more. Loss 0.8383 → 0.0037, and the predictions are 0.01, 0.998, 0.998, 0.001 against labels 0, 1, 1, 0. Forty lines of NumPy just learned a function that a linear model provably cannot represent. Nothing in that file knows what "deep learning" is — it is a forward pass, six lines of chain rule, and a subtraction.',
    },
    {
      type: 'intuition',
      title: 'Gradient checking: the only way to know you got it right',
      md: `A wrong backward pass does not crash. It trains — just badly — and you spend a week blaming the learning rate. So you check it, once, against the naive method.

- Take one parameter. Nudge it +ε, compute the loss. Nudge it −ε, compute the loss. The slope between them is the numerical gradient.
- Compare against your analytic gradient with a **relative** error, not an absolute one — gradients differ in scale by orders of magnitude across layers.
- Use **central differences** ((L₊ − L₋)/2ε), not one-sided: the error is O(ε²) instead of O(ε), for one extra forward pass.
- Use float64, ε ≈ 1e−5, and turn OFF anything random (dropout, augmentation) — otherwise you are differencing two different functions.
- One relu gotcha: if a unit sits exactly at z = 0, the ± nudge straddles the kink and the numerical gradient is simply wrong there. Perturb away from exact zeros, or ignore those entries.
- This is a debug tool, never a training tool: it costs two forward passes **per parameter**. Run it once on a tiny network, then delete the call.`,
    },
    {
      type: 'math',
      intro: 'The formula and the numbers you should expect. θ_k is one scalar parameter, e_k the unit vector that picks it out.',
      latex: [
        '\\frac{\\partial \\mathcal{L}}{\\partial \\theta_k} \\;\\approx\\; \\frac{\\mathcal{L}(\\theta + \\varepsilon e_k) - \\mathcal{L}(\\theta - \\varepsilon e_k)}{2\\varepsilon}, \\qquad \\varepsilon = 10^{-5}',
        '\\text{rel. err} = \\frac{\\lVert g_{\\text{num}} - g_{\\text{analytic}} \\rVert_2}{\\lVert g_{\\text{num}} \\rVert_2 + \\lVert g_{\\text{analytic}} \\rVert_2}',
        '< 10^{-7}: \\text{ correct} \\qquad 10^{-7} \\text{ to } 10^{-5}: \\text{ acceptable (relu kinks, float noise)} \\qquad > 10^{-3}: \\text{ you have a bug}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Gradient checking the network above — run this once, then never again',
      code: `import numpy as np

X = np.array([[0., 0.], [0., 1.], [1., 0.], [1., 1.]])
y = np.array([[0.], [1.], [1.], [0.]])
rng = np.random.default_rng(0)
P = {'W1': rng.normal(0, 1, (2, 4)), 'b1': rng.normal(0, 0.3, (1, 4)),
     'W2': rng.normal(0, 1, (4, 1)), 'b2': rng.normal(0, 0.3, (1, 1))}

def loss_of(P):                                  # forward only -> one scalar
    a1 = np.maximum(0, X @ P['W1'] + P['b1'])
    yh = 1 / (1 + np.exp(-(a1 @ P['W2'] + P['b2'])))
    return -np.mean(y * np.log(yh) + (1 - y) * np.log(1 - yh))

def grads(P):                                    # the analytic backward pass
    m = X.shape[0]
    z1 = X @ P['W1'] + P['b1']; a1 = np.maximum(0, z1)
    yh = 1 / (1 + np.exp(-(a1 @ P['W2'] + P['b2'])))
    d2 = (yh - y) / m
    d1 = (d2 @ P['W2'].T) * (z1 > 0)
    return {'W1': X.T @ d1, 'b1': d1.sum(0, keepdims=True),
            'W2': a1.T @ d2, 'b2': d2.sum(0, keepdims=True)}

eps, g = 1e-5, grads(P)
for name, w in P.items():
    num = np.zeros_like(w)
    for i in np.ndindex(w.shape):                # perturb ONE scalar at a time
        old = w[i]
        w[i] = old + eps; lp = loss_of(P)
        w[i] = old - eps; lm = loss_of(P)
        w[i] = old
        num[i] = (lp - lm) / (2 * eps)           # central difference
    rel = np.linalg.norm(num - g[name]) / (np.linalg.norm(num) + np.linalg.norm(g[name]))
    print(f"{name}: relative error {rel:.3e}")

# ---------- real output ----------
# W1: relative error 1.421e-11
# b1: relative error 1.286e-11
# W2: relative error 3.602e-12
# b2: relative error 6.092e-12`,
      annotations: {
        6: 'Biases are seeded away from zero on purpose. With b1 = 0 and the input row (0, 0), z1 lands exactly on relu\'s kink and the numerical gradient for b1 comes back off by 20% — a false alarm that has cost many people an afternoon.',
        18: 'Same two lines as the training loop. Gradient checking tests the code you actually ship, not a re-derivation of it.',
        26: 'Two forward passes per scalar parameter. Fine for 17 parameters, absurd for 25 million — this is the naive method from the top of the module, kept as a unit test.',
        31: 'Central difference: error shrinks as eps^2. The one-sided version (L(x+eps) - L(x))/eps is cheaper but O(eps) and gives noisier verdicts.',
        32: 'Relative error, not absolute. A gradient of 1e-8 that is off by 1e-9 is broken; a gradient of 1e4 off by 1e-9 is perfect.',
        36: 'All four ~1e-11 or better, comfortably under the 1e-7 threshold. The backward pass is correct.',
      },
    },
    {
      type: 'intuition',
      title: 'Vanishing and exploding gradients: the bill for multiplying',
      md: `Backprop is a chain of multiplications. Chains of multiplications do exactly two things over long distances: collapse or blow up.

- Each layer you cross multiplies the delta by Wᵀ and by the activation's derivative.
- Sigmoid's derivative peaks at **0.25** and is smaller everywhere else. Cross 20 sigmoid layers and the surviving factor is at most 0.25²⁰ ≈ 10⁻¹².
- The early layers get a gradient of essentially zero. They stop learning while the last layers train fine. That is **vanishing gradients** — the reason nobody could train deep networks before 2010.
- The other direction: if the factors average above 1, the delta grows geometrically. 1.5²⁰ ≈ 3300, and one step later your weights are NaN. That is **exploding gradients**, and it is why RNNs were notorious.
- The tell: gradient norms per layer. Vanishing = tiny at the input end, normal at the output end. Exploding = loss spikes to NaN in one step.
- The fixes are the whole next module — relu (derivative exactly 1 when on), He/Xavier init, batch/layer norm, residual connections (a gradient highway that skips the multiplications), and gradient clipping for the explosive case.`,
    },
    {
      type: 'math',
      intro: 'Why depth is a product, in one line. f is the activation, ℓ indexes layers.',
      latex: [
        '\\delta^{[\\ell]} = \\left( W^{[\\ell+1]\\top} \\delta^{[\\ell+1]} \\right) \\odot f^{\\prime}(z^{[\\ell]}) \\quad \\Rightarrow \\quad \\lVert \\delta^{[1]} \\rVert \\;\\sim\\; \\lVert \\delta^{[L]} \\rVert \\prod_{\\ell=2}^{L} \\lVert W^{[\\ell]} \\rVert \\cdot \\lvert f^{\\prime} \\rvert',
        '\\sigma^{\\prime}(z) = \\sigma(z)(1 - \\sigma(z)) \\le 0.25 \\quad \\Rightarrow \\quad 0.25^{20} \\approx 10^{-12} \\quad \\text{(vanished)}',
        '\\text{factor } 1.5 \\text{ per layer} \\quad \\Rightarrow \\quad 1.5^{20} \\approx 3.3 \\times 10^{3} \\quad \\text{(exploded)}',
      ],
    },
    {
      type: 'intuition',
      title: 'What autograd actually does (spoiler: this)',
      md: `You will never write those six lines again after this module. Here is exactly what replaces them.

- During the **forward** pass, the framework records the graph: every operation you perform, its inputs, and the output tensor it produced. This is the "tape".
- Every operation ships with its own local-derivative rule, written once by the library authors. Multiply knows its derivative. Relu knows its derivative.
- \`loss.backward()\` walks that tape in reverse order, calling each local rule and multiplying by the delta that arrived — the exact procedure you just did by hand.
- Gradients accumulate into \`.grad\` on each leaf tensor. **Accumulate**, not overwrite: that is why you call \`optimizer.zero_grad()\` every step, and also how gradient accumulation over micro-batches works for free.
- \`torch.no_grad()\` at inference simply says "don't record the tape" — which is why inference uses far less memory than training.
- There is no magic anywhere in this. Autograd is bookkeeping plus a table of derivatives.`,
    },
    {
      type: 'note',
      md: 'The memory bill, since it decides your batch size. The backward pass needs the activations from the forward pass (line 22 above uses a1; line 24 uses z1) — so **every intermediate tensor stays in memory until its gradient is computed**. Activation memory scales with batch size × depth × layer width, and on big models it dwarfs the weights. That is the real reason "CUDA out of memory" arrives when you double the batch size. The escape hatch is gradient checkpointing: store only a few activations, recompute the rest during the backward pass — trading roughly 30% more compute for a large memory saving. Covered properly in Level 3, training at scale.',
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `import numpy as np

EPS = 1e-5  # <-- change me: 1e-2, then 1e-5, then 1e-12

x = np.array([[0.5, -1.2, 0.3], [-0.7, 0.9, 1.1], [1.4, 0.2, -0.6], [-0.3, -0.8, 0.4]])
y = np.array([[1.0], [-0.5], [0.8], [0.1]])
W1 = np.array([[0.4, -0.9, 0.2], [1.1, 0.3, -0.7], [-0.2, 0.6, 0.5]])
b1 = np.array([0.1, -0.2, 0.05])
W2 = np.array([[0.7], [-1.3], [0.4]])
b2 = np.array([0.2])

def loss():                              # tanh net: smooth everywhere, no kinks
    return np.mean((np.tanh(x @ W1 + b1) @ W2 + b2 - y) ** 2)

a1 = np.tanh(x @ W1 + b1)                # forward
d2 = 2 * (a1 @ W2 + b2 - y) / y.size     # dL/d(output)
d1 = (d2 @ W2.T) * (1 - a1 ** 2)         # back through tanh
grad = x.T @ d1                          # analytic dL/dW1

num = np.zeros_like(W1)
for i, j in np.ndindex(W1.shape):
    old = W1[i, j]
    W1[i, j] = old + EPS; hi = loss()
    W1[i, j] = old - EPS; lo = loss()
    W1[i, j] = old
    num[i, j] = (hi - lo) / (2 * EPS)     # central difference

rel = np.abs(grad - num).max() / max(np.abs(grad).max(), np.abs(num).max())
print('EPS                =', EPS)
print('analytic  row 0    =', ' '.join('%12.9f' % v for v in grad[0]))
print('numerical row 0    =', ' '.join('%12.9f' % v for v in num[0]))
print('max relative error = %.3e' % rel)
print('verdict            =', 'PASS' if rel < 1e-7 else 'FAIL')`,
        precomputedOutput: `EPS                = 1e-05
analytic  row 0    =  0.255873730 -0.153540566  0.331361510
numerical row 0    =  0.255873730 -0.153540566  0.331361510
max relative error = 7.988e-11
verdict            = PASS`,
        caption: 'Gradient check: run EPS = 1e-2, then 1e-5, then 1e-12 — the error gets WORSE at both ends',
      },
    },
  ],
  quiz: [
    {
      question: 'Why is estimating gradients by perturbing each weight and re-running the forward pass hopeless for real networks?',
      options: [
        {
          text: 'It is numerically inaccurate, so the gradients would be wrong',
          explanation:
            'Accuracy is actually fine with central differences — that is exactly why we use it as a correctness check. The problem is cost, not correctness.',
        },
        {
          text: 'It costs a forward pass per weight, so the cost scales with parameter count — millions of forward passes per single step',
          explanation:
            'Correct. Backprop gets ALL gradients in one backward pass, roughly the cost of one forward pass, independent of how many weights there are.',
        },
        {
          text: 'It only works for linear models',
          explanation: 'It works for any model you can evaluate — it is model-agnostic. It is just unaffordable.',
        },
      ],
      correct: 1,
    },
    {
      question: 'What does a node in the computational graph need in order to compute the gradient it passes backwards?',
      options: [
        {
          text: 'Its own local derivative and the gradient arriving from downstream',
          explanation:
            'Correct — and nothing else. That locality is why one implementation scales from a 3-neuron toy to a 175B-parameter model.',
        },
        { text: 'The full architecture of the network', explanation: 'No node ever knows the architecture. A relu node has never heard of the loss function.' },
        { text: 'The learning rate and the optimizer state', explanation: 'Those belong to the update step, which happens after all gradients exist. Backprop does not know them.' },
      ],
      correct: 0,
    },
    {
      question: 'With sigmoid output and binary cross-entropy loss, ∂L/∂z (the delta at the output) simplifies to…',
      options: [
        { text: 'ŷ(1 − ŷ)', explanation: 'That is the sigmoid derivative alone — it is one of the two factors, and it cancels against the loss derivative.' },
        { text: '−y/ŷ', explanation: 'That is a piece of ∂L/∂ŷ before the sigmoid derivative multiplies in.' },
        {
          text: 'ŷ − y',
          explanation:
            'Correct. The ŷ(1−ŷ) in the denominator of ∂L/∂ŷ cancels the ŷ(1−ŷ) from the sigmoid derivative. Softmax + categorical cross-entropy does the same thing.',
        },
      ],
      correct: 2,
    },
    {
      question: 'You have δ (the delta) at some layer. What is the gradient with respect to that layer\'s weight matrix?',
      options: [
        { text: 'δ times the layer\'s output', explanation: 'The output is downstream of W — the gradient uses what fed IN, not what came out.' },
        {
          text: 'δ times the activation feeding into that layer (as an outer product / transposed matmul)',
          explanation:
            'Correct: ∂L/∂W = δ · a_inᵀ. Both ∂L/∂W2 = δ_out·a1ᵀ and ∂L/∂W1 = δ_hidden·xᵀ are the same rule with different names.',
        },
        { text: 'δ times the weight matrix itself', explanation: 'Wᵀδ is how the delta travels to the PREVIOUS layer — a different quantity from ∂L/∂W.' },
      ],
      correct: 1,
    },
    {
      question: 'A hidden relu unit had z = −0.5 for a sample. What gradient do its incoming weights receive from that sample?',
      options: [
        {
          text: 'Zero — relu\'s local derivative is 0 when z < 0, so the delta is killed at that gate',
          explanation:
            'Correct. No contribution to the prediction means no blame. If a unit is off for EVERY sample it never recovers — that is the dying-relu problem.',
        },
        { text: 'The same as any other unit — relu only affects the forward pass', explanation: 'Relu is a node in the graph like any other, and its local derivative gates the backward pass too.' },
        { text: 'A negative gradient proportional to −0.5', explanation: 'Relu outputs 0 there and its derivative is 0 — the magnitude of the negative z is irrelevant.' },
      ],
      correct: 0,
    },
    {
      question: 'In the batched backward pass, why does the bias gradient sum over the batch dimension?',
      options: [
        { text: 'To keep the numbers large enough to avoid underflow', explanation: 'Numerical range is not the reason; the math forces it.' },
        { text: 'Because summing is faster than averaging on a GPU', explanation: 'Both are a single reduction — speed is not the argument.' },
        {
          text: 'The same bias is added to every sample, so the derivative of the total loss with respect to it is the sum of every sample\'s contribution',
          explanation:
            'Correct. A shared parameter collects gradient from every place it was used. The 1/B for a mean loss sits either in the loss or once in the delta — never both.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Your gradient check returns a relative error of 4e-2. What is the correct conclusion?',
      options: [
        { text: 'Normal float noise — proceed', explanation: 'Float64 noise lives around 1e-10. 4e-2 is four percent — that is a wrong derivative, not noise.' },
        {
          text: 'Your analytic backward pass has a bug — find it before training anything',
          explanation:
            'Correct. Above ~1e-3 means a real error: a missing transpose, a forgotten activation derivative, a wrong 1/B. A wrong backward pass still trains, just badly — which is why it hides for weeks.',
        },
        { text: 'Epsilon is too small — raise it to 1e-2 and re-check', explanation: 'Raising eps makes the numerical estimate WORSE (larger truncation error). It would hide the bug, not fix it.' },
      ],
      correct: 1,
    },
    {
      question: 'A 20-layer sigmoid network trains its last layers but the first layers barely move. Most likely cause?',
      options: [
        {
          text: 'Vanishing gradients — sigmoid\'s derivative is ≤ 0.25, and 20 such factors multiply to ~1e-12',
          explanation:
            'Correct. Backprop multiplies a local derivative per layer; factors below 1 compound geometrically. Relu, He init, normalization and residual connections exist for exactly this.',
        },
        { text: 'The learning rate is too high', explanation: 'Too high shows up as oscillation or NaN across ALL layers, not as a depth-dependent gradient of zero.' },
        { text: 'Not enough training data', explanation: 'Data volume does not produce a gradient magnitude that depends on layer depth.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Derive backprop for one layer. Whiteboard, out loud.',
      answer:
        'Set it up: z = Wa_in + b, a_out = f(z), and assume the gradient arriving from downstream is δ_out = ∂L/∂a_out. Three steps. (1) Through the activation: ∂L/∂z = δ_out ⊙ f′(z) — call it δ. (2) Through the weights: z = Wa_in + b, so ∂z/∂W is a_in, giving ∂L/∂W = δ · a_inᵀ, and ∂L/∂b = δ because b\'s local derivative is 1. (3) Onwards to the previous layer: ∂L/∂a_in = Wᵀδ — the transpose is the same connections read in the other direction. Then state the pattern: every gradient is a local derivative times an upstream delta, and every weight gradient is (delta at this layer) × (activation feeding in). Finish with the shape check — ∂L/∂W must have W\'s shape — which is how you catch a wrong transpose live at the board.',
      isCaseBased: false,
    },
    {
      question: 'Why does ∂L/∂z at the output collapse to ŷ − y for sigmoid + cross-entropy? Is that a coincidence?',
      answer:
        'Not a coincidence — it is the design goal. ∂L/∂ŷ for BCE is (ŷ−y)/(ŷ(1−ŷ)); ∂ŷ/∂z for sigmoid is ŷ(1−ŷ). Their product is ŷ−y. The point of choosing that pair is that sigmoid saturates: for a confident-and-wrong prediction, ŷ(1−ŷ) is near zero, so with MSE the gradient would be near zero exactly when the model is most wrong — learning stalls. Cross-entropy\'s denominator cancels the squashing, so the gradient is proportional to the error itself: badly wrong means big update. Same structure for softmax + categorical cross-entropy. This is the gradient argument for "why cross-entropy over MSE for classification".',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague\'s hand-written network trains but converges much slower than the equivalent PyTorch model on the same data and learning rate. How do you find the problem?',
      answer:
        'Assume the backward pass, not the hyperparameters. (1) Gradient-check it — central differences, float64, tiny network; anything above 1e-3 relative error is your answer, and the layer that fails tells you where. (2) If it passes, look for a scale bug: dividing by batch size in the loss AND in the delta divides the effective learning rate by B — a classic silent slowdown. (3) Check the activation derivative is applied to the right quantity — f′(z), not f′(a). (4) Compare per-layer gradient norms against PyTorch on the same inputs and weights; the first layer that diverges is the culprit. (5) Only then consider real differences: init scheme, whether PyTorch uses a different default (e.g. Kaiming init), and optimizer (Adam vs plain SGD is not a fair comparison). Tradeoff worth naming: gradient checking is expensive but definitive; eyeballing loss curves is cheap and has cost people weeks.',
      isCaseBased: true,
    },
    {
      question: 'Case: loss goes 0.69, 0.68, 0.71, NaN. What happened, and what is your fix order?',
      answer:
        'NaN in one step is an explosion, not a plateau. Order: (1) Learning rate — cut 10× and re-run; if the NaN moves later, it was the step size. (2) Numerical stability in the loss — log(0) is −inf, so log(ŷ) needs either an epsilon or, better, a log-sum-exp / logits-based loss (BCEWithLogits instead of sigmoid-then-BCE). (3) Exploding gradients from depth or from an RNN\'s repeated multiplication — check the gradient norm per step; clip to a max norm around 1.0. (4) Bad init — weights initialized too large make the first delta huge. (5) Data — an inf or NaN in the inputs propagates instantly; assert on the batch. Name the tradeoff: clipping is a band-aid that keeps a run alive; correct init, normalization, and a logits-based loss are the actual fix.',
      isCaseBased: true,
    },
    {
      question: 'Explain vanishing gradients in terms of the backprop equations, and rank the fixes.',
      answer:
        'δ at layer ℓ equals (W^{ℓ+1}ᵀ δ^{ℓ+1}) ⊙ f′(z^ℓ). Crossing a layer multiplies by two things, so the gradient reaching layer 1 carries a product of L−1 factors. Sigmoid caps f′ at 0.25, so 20 layers gives at most 0.25²⁰ ≈ 1e−12: the early layers receive nothing and freeze while the late layers learn. Fixes, most to least load-bearing: (1) residual connections — the identity path gives the gradient a route with derivative exactly 1, which is why 100+ layer networks became trainable; (2) relu-family activations — derivative is exactly 1 on the positive side instead of ≤0.25; (3) normalization (batch/layer norm) — keeps z in the non-saturated region and conditions the loss surface; (4) careful init (He for relu, Xavier for tanh) — sets the initial product near 1; (5) for RNNs specifically, gated units (LSTM/GRU) whose cell state is an additive path. Diagnose by logging gradient norm per layer.',
      isCaseBased: false,
    },
    {
      question: 'What exactly does loss.backward() do? Answer as if the interviewer suspects you think it is magic.',
      answer:
        'During the forward pass the framework builds a DAG on the fly: each tensor produced by a differentiable op stores a reference to the op and its inputs (grad_fn). backward() does a reverse topological walk of that graph starting from the loss with an incoming gradient of 1.0. At each node it calls that op\'s registered backward rule — the local derivative — multiplies by the incoming gradient, and routes the result to that node\'s inputs. Leaf tensors with requires_grad=True accumulate into .grad. Three consequences worth stating: gradients ACCUMULATE, hence zero_grad() each step (and hence free gradient accumulation across micro-batches); the graph is freed after backward unless you pass retain_graph; and no_grad() skips recording entirely, which is why inference is much lighter on memory. It is the same six lines you write by hand, generated from a tape.',
      isCaseBased: false,
    },
    {
      question: 'How would you gradient-check a network, and what exactly counts as a pass?',
      answer:
        'Take a tiny version — a few units, a handful of samples — in float64. For each scalar parameter, compute (L(θ+ε) − L(θ−ε))/2ε with ε = 1e−5 (central difference: O(ε²) error for one extra forward pass). Compare with the analytic gradient using the relative error ‖g_num − g_ana‖ / (‖g_num‖ + ‖g_ana‖), never absolute error, because gradient magnitudes vary wildly across layers. Below 1e−7 is correct; 1e−7 to 1e−5 is acceptable with relu kinks and float noise; above 1e−3 is a bug. Practical rules: disable dropout and any randomness first, or you are differencing two different functions; avoid parameters that put a relu exactly at z = 0, since the kink makes the numerical estimate genuinely wrong there; and never leave it in the training loop — it costs two forward passes per parameter.',
      isCaseBased: false,
    },
    {
      question: 'Case: training a 12-layer model, batch size 64 fits, 128 gives CUDA OOM — but the model has only 40M parameters, which is under 200MB. Where is the memory going, and what are your options?',
      answer:
        'Weights are not the bill — activations are. The backward pass needs the forward pass\'s intermediates (every z and a), so activation memory scales with batch × depth × width, and doubling batch size doubles it while the weights stay fixed. Options, ranked: (1) gradient accumulation — run two micro-batches of 64 and step once, mathematically identical to batch 128, costs nothing but wall-clock; (2) mixed precision (bf16/fp16) — roughly halves activation memory and is usually free performance; (3) gradient checkpointing — store activations only at a few boundaries and recompute the rest during backward, about +30% compute for a large memory win; (4) reduce sequence length / resolution if the task allows; (5) shard across devices (ZeRO/FSDP) if you have them. Tradeoff to state: accumulation costs time, checkpointing costs compute, sharding costs communication — pick the resource you have spare.',
      isCaseBased: true,
    },
    {
      question: 'Why do we initialize weights randomly instead of at zero? Answer with the backward pass.',
      answer:
        'With all weights zero (or all equal), every hidden unit in a layer computes the same z, so it produces the same activation, so Wᵀδ hands each of them an identical delta, so each receives an identical gradient and they update identically — forever. The layer has the representational capacity of one neuron regardless of its width. This is the symmetry-breaking argument, and it is a statement about the backward pass, not the forward one. Biases can safely be zero because their gradients differ as soon as the weights differ. The follow-up is scale: too small and activations and gradients shrink layer by layer; too large and they explode — which is what He (relu) and Xavier (tanh) initialization compute for you from fan-in and fan-out.',
      isCaseBased: false,
    },
    {
      question: 'Backprop is "just the chain rule". So why was it a research result rather than an obvious application of calculus?',
      answer:
        'The chain rule tells you the derivative exists; it does not tell you a cheap ordering for computing it. A network\'s Jacobian chain can be multiplied left-to-right (forward mode) or right-to-left (reverse mode). Forward mode costs one pass per INPUT — fine when inputs are few, useless here. Reverse mode costs one pass per OUTPUT, and a loss has exactly one output — so all N parameter gradients fall out of a single sweep. That asymmetry, plus the insight that intermediate activations can be cached and reused rather than recomputed, is the actual algorithm. The historical version of this answer: reverse-mode automatic differentiation existed before neural networks; the contribution was recognizing it made training multi-layer networks affordable.',
      isCaseBased: false,
    },
    {
      question: 'Case: an intern reports "my model\'s training loss is decreasing, so backprop is working". What do you tell them?',
      answer:
        'That a decreasing loss is weak evidence. A backward pass with a wrong constant factor, a missing activation derivative on one layer, or a wrong 1/B still produces a direction that is often correlated with downhill — the model trains, slower and to a worse optimum, and nothing ever errors. Real checks, in order: (1) gradient check against central differences on a small instance — this is the only definitive test; (2) overfit a single batch to near-zero loss — if the model cannot memorize 8 samples, something in forward, backward, or the update is broken; (3) compare per-layer gradient norms to a reference implementation on identical weights and inputs. Then the diagnostic mindset: the dangerous bugs in ML are the ones that degrade quality without crashing, so build tests that assert correctness rather than watching curves.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Backprop in one sentence', back: 'One backward pass computes ∂L/∂w for EVERY weight, by multiplying each node\'s local derivative with the gradient arriving from downstream.' },
    { front: 'Cost of the naive (perturb-each-weight) method', back: 'One forward pass per weight. 25M params = 25M forward passes per step. Backprop: one backward pass, ~1 forward pass of cost, total.' },
    { front: 'The blame-assignment picture', back: 'Loss is measured at the output; each layer asks the one before it "how much of this error was yours?" and passes back its share.' },
    { front: 'The two-sentence pattern', back: 'Every gradient = (local derivative) × (upstream delta). Every weight gradient = (delta at this layer) × (activation feeding into it).' },
    { front: 'δ_out for sigmoid + BCE', back: 'ŷ − y. The ŷ(1−ŷ) from ∂L/∂ŷ cancels the sigmoid derivative — by design, so saturation cannot kill the gradient. Same for softmax + CE.' },
    { front: 'One-hidden-layer backward pass', back: 'δ_out = ŷ−y · ∂L/∂W2 = δ_out a1ᵀ · δ_hidden = (W2ᵀδ_out) ⊙ relu′(z1) · ∂L/∂W1 = δ_hidden xᵀ' },
    { front: 'Why the batch axis sums', back: 'A shared parameter (weight or bias) is used once per sample, so it collects gradient from every sample. The 1/B of a mean loss goes in exactly one place.' },
    { front: 'Gradient checking', back: '(L(θ+ε) − L(θ−ε))/2ε vs analytic; relative error ‖diff‖/(‖num‖+‖ana‖). <1e-7 correct, >1e-3 bug. float64, ε=1e-5, no dropout, debug-only.' },
    { front: 'Vanishing / exploding gradients', back: 'Crossing L layers multiplies L local derivatives. σ′ ≤ 0.25 → 0.25²⁰ ≈ 1e-12 (early layers freeze). Factors > 1 → NaN. Fixes: residuals, relu, norm, He init, clipping.' },
    { front: 'What autograd is', back: 'A tape: the forward pass records ops + inputs, backward() replays it in reverse calling each op\'s local-derivative rule. Grads accumulate — hence zero_grad(). Activations must be kept, hence the memory wall.' },
  ],
  mindmapMarkdown: `- Backpropagation: Chain Rule on a Graph
  - The problem
    - L is ONE number, millions of weights
    - need dL/dw for every weight
    - naive: 1 forward pass per weight
    - 25M params = hopeless
  - Blame assignment
    - complaint at the door = loss
    - each station splits its share backwards
    - layer asks previous: how much was you?
  - Computational graph
    - nodes = operations
    - edges: values forward, gradients backward
    - needs only local derivative + upstream gradient
    - locality = scales from toy to 175B
  - One-layer derivation
    - forward: z1=W1x+b1, a1=relu, z2=W2a1+b2, y=sigmoid, L=BCE
    - delta_out = yhat - y (sigmoid+BCE cancel)
    - dL/dW2 = delta_out a1'
    - delta_hidden = (W2' delta_out) * relu'(z1)
    - dL/dW1 = delta_hidden x'
    - dead relu gets zero gradient
  - The pattern
    - gradient = local derivative x upstream delta
    - weight grad = delta x activation-in
    - shape check catches transposes
  - Batched form
    - stack samples as rows
    - matmul = sum over batch axis
    - bias grad = sum down batch
    - 1/B in exactly one place
  - From-scratch NumPy
    - XOR: not linearly separable
    - 6 lines of backward
    - loss 0.84 to 0.004
  - Gradient checking
    - central difference, eps=1e-5
    - relative error, not absolute
    - <1e-7 pass, >1e-3 bug
    - relu kink at z=0 = false alarm
    - debug tool only
  - Vanishing / exploding
    - chain of multiplications
    - sigmoid' <= 0.25 -> 0.25^20 ~ 1e-12
    - factor 1.5^20 ~ 3300 -> NaN
    - fixes: relu, He init, norm, residuals, clipping
  - Autograd
    - forward records the tape
    - backward() replays it in reverse
    - grads accumulate -> zero_grad()
    - no_grad() skips recording
  - Memory
    - activations kept for backward
    - batch size hits the wall first
    - gradient checkpointing: recompute vs store`,
}

export default m
