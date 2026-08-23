import type { Module } from '../types'

const m: Module = {
  id: 'dl-l0-activations',
  subjectId: 'dl',
  level: 0,
  title: 'Activation Functions and Where They Break',
  whyItMatters:
    'Sigmoid ran deep learning for twenty years and is the reason deep networks would not train. The story of activations is a story of gradients dying, and each function on the list is a fix for how the previous one died.',
  assumes: [
    'You know that the derivative is the slope of a function',
    'You have read *From Perceptron to MLP*, so you know why a non-linearity is required at all',
  ],
  estMinutes: 20,
  sections: [
    {
      type: 'intuition',
      title: 'The job, and the constraint nobody mentions',
      md: `An activation sits between layers and bends the signal so depth means something. Any bend would do for that.

But it has a second job that decides everything: **gradients travel back through it**. Backpropagation multiplies the activation's slope at every layer it passes, so the shape of that slope is compounded once per layer.

Multiply enough numbers smaller than 1 and the result is zero. **Whether an activation is usable at depth is a question about its derivative, not its output**, and that single sentence explains the whole progression from sigmoid to ReLU.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Sigmoid, and the number that killed it',
      code: `import math

def sig(z):
    return 1 / (1 + math.exp(-z))

for z in [0, 1, 3, 6]:
    s = sig(z)
    print('sigmoid(%d) = %.4f   derivative = %.4f' % (z, s, s * (1 - s)))
print('best case compounded over 10 layers: 0.25^10 = %.3e' % 0.25**10)

# ---- real output ----
# sigmoid(0) = 0.5000   derivative = 0.2500
# sigmoid(1) = 0.7311   derivative = 0.1966
# sigmoid(3) = 0.9526   derivative = 0.0452
# sigmoid(6) = 0.9975   derivative = 0.0025
# best case compounded over 10 layers: 0.25^10 = 9.537e-07`,
      annotations: {
        7: "s·(1−s) is the sigmoid's derivative, expressible in terms of its own output — which is why it was cheap in 1990 and why it stayed popular.",
        11: 'The derivative peaks at 0.25, at z = 0. That is the BEST case: every layer multiplies the gradient by at most a quarter.',
        13: 'At z = 6 the neuron is saturated — output 0.9975, slope 0.0025. It is confidently on and can no longer learn, because almost no gradient survives it.',
        14: 'Ten layers of the most favourable case leaves 9.5e-07 of the original gradient. The early layers of a deep sigmoid network receive essentially nothing, which is the vanishing gradient problem.',
      },
    },
    {
      type: 'note',
      label: 'Tanh fixes half of it',
      md: `**tanh** is a rescaled sigmoid with output in −1 to 1 instead of 0 to 1, and its derivative peaks at **1.0** rather than 0.25.

That fixes two things. Gradients are no longer guaranteed to shrink, and the output is **zero-centred** — sigmoid's all-positive output makes every gradient in a layer share a sign, which forces weight updates to zigzag.

What it does not fix is saturation. At z = 3 the tanh derivative is already **0.0099**, worse than sigmoid's 0.0452 at the same point. Push any neuron far from zero and it stops learning. That is the problem ReLU actually solves.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'ReLU and GELU, side by side',
      code: `def gelu(z):
    return 0.5 * z * (1 + math.erf(z / math.sqrt(2)))

print('   z    relu     gelu')
for z in [-3, -1, -0.5, 0, 0.5, 1, 3]:
    print('%5.1f %7.3f %8.4f' % (z, max(0.0, z), gelu(z)))

# ---- real output ----
#    z    relu     gelu
# -3.0   0.000  -0.0040
# -1.0   0.000  -0.1587
# -0.5   0.000  -0.1543
#  0.0   0.000   0.0000
#  0.5   0.500   0.3457
#  1.0   1.000   0.8413
#  3.0   3.000   2.9960`,
      annotations: {
        1: "ReLU's derivative is exactly 1 for any positive input — not 0.25, not 0.99. Gradients pass through the positive region completely unchanged, however deep the stack.",
        11: 'GELU is not monotonic: it dips to −0.1587 at z = −1 and comes back up to −0.0040 at z = −3. Small negative inputs are passed through slightly rather than erased.',
        15: 'By z = 3 the two agree to three decimals (2.9960 against 3.000). GELU is a smoothed ReLU — the difference is entirely near the origin, which is where the gradient behaviour is decided.',
      },
    },
    {
      type: 'note',
      label: 'The dying ReLU, and the family that patches it',
      md: `ReLU's derivative is exactly **0** for negative inputs. A unit pushed negative for every training example receives zero gradient forever and never recovers — it is **dead**, and a badly tuned learning rate can kill a large fraction of a layer in a few steps.

The patches all restore a small negative slope. **Leaky ReLU** uses a fixed 0.01, **PReLU** learns that slope, **ELU** curves smoothly toward −1. Each keeps a gradient path open on the negative side.

In practice ReLU still wins for convolutional networks — it is faster, and dead units act as a mild regulariser — while **GELU** is standard in transformers, where its smoothness near zero measurably helps. The margins are small; the failure mode is what you need to recognise.`,
    },
    {
      type: 'intuition',
      title: 'Softmax is a different kind of thing',
      md: `Softmax is grouped with activations and does not belong there. Every function above works on **one number at a time**; softmax works on a whole vector and its outputs sum to 1.

That makes it an output layer, not something you put between hidden layers. It converts scores into a probability distribution over classes.

It is also the one function here with a genuine numerical hazard, because it exponentiates its inputs — and \`exp\` of a moderately large number overflows.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Softmax overflowing, and the one-line fix',
      code: `xs = [1000.0, 1001.0, 1002.0]
try:
    e = [math.exp(v) for v in xs]
    print('naive:', [v / sum(e) for v in e])
except OverflowError as ex:
    print('naive softmax raises OverflowError:', ex)

mx = max(xs)
e = [math.exp(v - mx) for v in xs]
print('stable softmax:', [round(v / sum(e), 4) for v in e])

for T in [0.5, 1.0, 2.0]:
    e = [math.exp(v / T) for v in [2.0, 1.0, 0.1]]
    print('temperature %.1f ->' % T, [round(v / sum(e), 4) for v in e])

# ---- real output ----
# naive softmax raises OverflowError: math range error
# stable softmax: [0.09, 0.2447, 0.6652]
# temperature 0.5 -> [0.8638, 0.1169, 0.0193]
# temperature 1.0 -> [0.659, 0.2424, 0.0986]
# temperature 2.0 -> [0.5017, 0.3043, 0.194]`,
      annotations: {
        8: 'Subtract the max before exponentiating. Every exponent becomes ≤ 0, so nothing overflows — and the result is mathematically identical, because the shared factor cancels between numerator and denominator.',
        14: 'Dividing the logits by a temperature T before softmax. T < 1 sharpens toward the top choice (0.8638), T > 1 flattens (0.5017), and this is the knob that controls how adventurous a language model\'s sampling is.',
        18: 'Note the naive version does not return a wrong answer — it raises. In NumPy it silently produces nan instead, which is far harder to notice, and is why every framework fuses softmax with cross-entropy rather than computing them separately.',
      },
    },
  ],
  quiz: [
    {
      question: 'Why does the sigmoid derivative peaking at 0.25 matter?',
      options: [
        { text: 'It makes the output too small', explanation: 'The output ranges over the whole of (0, 1); the derivative is the issue.' },
        { text: 'Backprop multiplies the slope once per layer, so ten layers leave at most 0.25¹⁰ ≈ 9.5e-07 of the gradient', explanation: 'Correct, and that is the best case — real activations sit away from zero where the slope is smaller still.' },
        { text: 'It causes exploding gradients', explanation: 'Values below 1 compound downward, not upward.' },
        { text: 'It slows down the forward pass', explanation: 'The derivative is not used in the forward pass at all.' },
      ],
      correct: 1,
    },
    {
      question: 'What does tanh fix relative to sigmoid, and what does it not?',
      options: [
        { text: 'It fixes saturation but not the gradient magnitude', explanation: 'The reverse — its derivative at z = 3 is 0.0099, worse than sigmoid\'s 0.0452.' },
        { text: 'It fixes the peak derivative (1.0 not 0.25) and zero-centres the output, but still saturates', explanation: 'Correct. Any neuron pushed far from zero still stops learning.' },
        { text: 'It fixes both', explanation: 'Saturation remains and is in fact sharper.' },
        { text: 'It fixes neither; it is only cheaper', explanation: 'Both fixes are real and were why tanh replaced sigmoid in hidden layers.' },
      ],
      correct: 1,
    },
    {
      question: 'Why does sigmoid\'s all-positive output cause zigzagging updates?',
      options: [
        { text: 'Positive numbers are larger', explanation: 'Magnitude is not the issue.' },
        { text: 'Every gradient entering a layer shares a sign, so all its weights must move the same direction together', explanation: 'Correct, which is what zero-centred activations fix.' },
        { text: 'It causes overflow', explanation: 'Sigmoid outputs are bounded in (0, 1).' },
        { text: 'It breaks the chain rule', explanation: 'The chain rule applies regardless of sign.' },
      ],
      correct: 1,
    },
    {
      question: 'What is a dead ReLU unit?',
      options: [
        { text: 'A unit whose weights are all zero', explanation: 'Zero weights can still receive gradient and recover.' },
        { text: 'A unit pushed negative on every training example — derivative exactly 0, so it receives no gradient and never recovers', explanation: 'Correct, and a high learning rate can kill a large fraction of a layer in a few steps.' },
        { text: 'A unit that saturates at a large positive value', explanation: 'ReLU has slope 1 there and learns fine.' },
        { text: 'A unit removed by dropout', explanation: 'Dropout is temporary and per-batch.' },
      ],
      correct: 1,
    },
    {
      question: 'GELU dips to −0.1587 at z = −1 and returns to −0.0040 at z = −3. What is that non-monotonicity for?',
      options: [
        { text: 'It is a numerical artefact', explanation: 'It is exact and deliberate — GELU is built from the Gaussian CDF.' },
        { text: 'Small negative inputs are passed through slightly rather than erased, keeping a gradient path near the origin', explanation: 'Correct. GELU and ReLU agree to three decimals by z = 3; the whole difference is near zero.' },
        { text: 'It makes the function zero-centred', explanation: 'It is not zero-centred in the tanh sense.' },
        { text: 'It bounds the output', explanation: 'GELU is unbounded above, like ReLU.' },
      ],
      correct: 1,
    },
    {
      question: 'Why subtract the max before exponentiating in softmax?',
      options: [
        { text: 'To make the outputs sum to 1', explanation: 'The division by the sum already does that.' },
        { text: 'Every exponent becomes ≤ 0 so nothing overflows, and the shared factor cancels so the result is unchanged', explanation: 'Correct — [1000, 1001, 1002] overflows naively and gives [0.09, 0.2447, 0.6652] stably.' },
        { text: 'To centre the logits at zero', explanation: 'It shifts them, but numerical safety is the reason, not centring.' },
        { text: 'To apply temperature scaling', explanation: 'Temperature divides the logits and is separate.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why did ReLU replace sigmoid in hidden layers?',
      answer:
        'Gradient flow. Sigmoid\'s derivative peaks at 0.25 and backprop multiplies it once per layer, so even in the best case ten layers leave 0.25¹⁰, about 9.5e-07, of the original gradient — the early layers of a deep network learn essentially nothing. ReLU\'s derivative is exactly 1 for any positive input, so gradients pass through the positive region unchanged no matter how deep the stack. It is also far cheaper: a comparison instead of an exponential. The cost is that its derivative is exactly 0 on the negative side, which introduces dead units — a different failure, and a more tolerable one.',
      isCaseBased: false,
    },
    {
      question: 'What is the dying ReLU problem and how do you handle it?',
      answer:
        'A unit whose pre-activation is negative for every training example gets a derivative of exactly zero, so it receives no gradient and can never recover — permanently dead, not temporarily quiet. A learning rate high enough to push a large bias negative in one step can kill a substantial fraction of a layer. The diagnostics are the fraction of activations that are exactly zero across a batch, and layers whose weights stop changing. Fixes: lower the learning rate, use a variant that keeps a negative slope — Leaky ReLU at a fixed 0.01, PReLU which learns it, ELU which curves toward −1 — or add normalisation to keep pre-activations centred.',
      isCaseBased: true,
    },
    {
      question: 'Sigmoid versus softmax — when do you use which?',
      answer:
        'They answer different questions. Sigmoid is per-output and independent, so it is right for binary classification and for multi-label problems where an image can be both "outdoor" and "night" — each output is its own yes/no. Softmax is over the whole vector and its outputs sum to 1, which encodes exactly one correct class, so it is right for mutually exclusive multi-class problems. Using softmax on a multi-label task is a real bug: it forces the classes to compete for a fixed probability budget, so confidence in one necessarily suppresses another that may also be true.',
      isCaseBased: false,
    },
    {
      question: 'Why do transformers use GELU?',
      answer:
        'Because it is smooth near zero and empirically trains a little better in that architecture. It is built from the Gaussian CDF, so it is non-monotonic on the negative side — dipping to about −0.16 at z = −1 and returning toward zero at −3 — which passes small negative values through slightly instead of erasing them and keeps a gradient path open where ReLU has none. Past about z = 3 it is indistinguishable from ReLU to three decimals, so the whole difference lives near the origin. Honestly, the margins are small and mostly empirical; the historical answer is that BERT and GPT used it and it became the default.',
      isCaseBased: false,
    },
    {
      question: 'Your deep network is not learning at all. How do activations feature in your diagnosis?',
      answer:
        'I would check gradient magnitudes per layer first, because that separates the failure modes immediately. Gradients shrinking as they go backward points at saturating activations — sigmoid or tanh in hidden layers, or a normalisation problem pushing pre-activations into the flat region. Gradients that are exactly zero in a layer points at dead ReLUs, which I would confirm by counting activations that are exactly zero across a batch. If gradients look healthy, the problem is elsewhere: learning rate, initialisation scale, or a loss that is not connected to the parameters at all. The activation-related fixes are ReLU or GELU in hidden layers, lower learning rate, and normalisation to keep inputs centred.',
      isCaseBased: true,
    },
    {
      question: 'What is temperature in softmax and where does it matter?',
      answer:
        'It divides the logits before the exponential. On logits [2.0, 1.0, 0.1], temperature 0.5 gives [0.8638, 0.1169, 0.0193] — sharpened toward the top choice — while temperature 2.0 gives [0.5017, 0.3043, 0.194], much flatter. It matters in three places: sampling from language models, where it is the adventurousness dial; knowledge distillation, where a high temperature exposes the teacher\'s relative confidences across wrong classes, which is the signal being distilled; and calibration, where a single learned temperature fitted on validation data is often enough to fix an overconfident classifier without retraining.',
      isCaseBased: false,
    },
    {
      question: 'Why do frameworks fuse softmax with cross-entropy?',
      answer:
        'Numerical stability. Computed separately, softmax exponentiates the logits — which overflows outright for inputs like 1000, and silently produces nan in NumPy rather than raising — and then cross-entropy takes the log of the result, which underflows for small probabilities. Fused, the two operations simplify algebraically to a log-sum-exp form that never forms the extreme intermediate values at all. It is also faster, since the combined gradient is just predicted minus target. This is why PyTorch\'s CrossEntropyLoss expects raw logits and applying softmax yourself first is a common and quiet bug.',
      isCaseBased: true,
    },
    {
      question: 'Could you design your own activation function?',
      answer:
        'The constraints are narrow. It must be non-linear or depth collapses; it must be differentiable almost everywhere, though a single kink like ReLU\'s is fine; and its derivative must not be uniformly less than 1, or gradients vanish with depth. Beyond that, cheap to compute matters more than it sounds, since it runs on every activation of every layer. Swish, x·sigmoid(x), was found by automated search and beats ReLU marginally on some benchmarks — which is the honest summary of the field: the space has been searched hard and the remaining gains are small. I would reach for a custom activation only for a specific structural reason, such as needing a bounded or periodic output.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'The real constraint on an activation', back: 'Backprop multiplies its DERIVATIVE once per layer. Usability at depth is a question about the slope, not the output.' },
    { front: 'Sigmoid\'s fatal number', back: 'Derivative peaks at 0.25. Ten layers of the best case leaves 0.25¹⁰ ≈ 9.5e-07 of the gradient.' },
    { front: 'Saturation', back: 'sigmoid(6) = 0.9975 with slope 0.0025. Confidently on, and no longer able to learn.' },
    { front: 'What tanh fixes', back: 'Peak derivative 1.0 and zero-centred output (no shared-sign zigzag). Does NOT fix saturation — tanh\'(3) = 0.0099.' },
    { front: 'ReLU', back: 'Derivative exactly 1 on the positive side, so gradients pass unchanged at any depth. Exactly 0 on the negative side, hence dead units.' },
    { front: 'GELU', back: 'Smoothed ReLU. Dips to −0.1587 at z=−1, matches ReLU to three decimals by z=3. The whole difference is near the origin.' },
    { front: 'Softmax is not an activation', back: 'It works on a whole vector, sums to 1, and belongs in the output layer. Sigmoid for multi-label; softmax for mutually exclusive.' },
    { front: 'Stable softmax', back: 'Subtract the max first. [1000, 1001, 1002] overflows naively, gives [0.09, 0.2447, 0.6652] stably. The shared factor cancels exactly.' },
  ],
  mindmapMarkdown: `- Activation functions
  - The real constraint
    - backprop multiplies the SLOPE once per layer
    - usability at depth = a question about the derivative
  - Sigmoid
    - derivative peaks at 0.25
    - 0.25^10 = 9.5e-07 over ten layers
    - sigmoid(6) = 0.9975, slope 0.0025 = saturated
    - all-positive output -> shared-sign zigzag
  - Tanh
    - peak derivative 1.0, zero-centred
    - still saturates: tanh'(3) = 0.0099
  - ReLU
    - derivative exactly 1 on the positive side
    - exactly 0 on the negative side -> DEAD UNITS
    - patches: Leaky (0.01), PReLU (learned), ELU
  - GELU
    - smoothed ReLU, from the Gaussian CDF
    - dips to -0.1587 at z=-1
    - matches ReLU to 3dp by z=3
    - transformer default
  - Softmax
    - vector-wide, sums to 1, OUTPUT layer only
    - sigmoid = multi-label, softmax = exclusive
    - subtract the max or it overflows
    - temperature: 0.5 sharpens, 2.0 flattens
    - fused with cross-entropy for stability`,
}

export default m
