import type { Module } from '../types'

const m: Module = {
  id: 'dl-l1-init-normalization',
  subjectId: 'dl',
  level: 1,
  title: 'Weight Init, BatchNorm vs LayerNorm',
  whyItMatters:
    'Two of the most-asked deep-learning interview questions live here: "why can you not initialize all weights to zero?" and "what does BatchNorm do differently at test time?". Both have short, exact answers that most candidates fumble. Beyond interviews, this is the module that decides whether a deep network trains at all or sits at chance forever.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'Start with the dumbest init: all zeros',
      md: `Every weight = 0. Clean, simple, and completely broken. Here is why, in the argument interviewers want to hear.

- Layer with 3 hidden units. All weights zero → all three compute the **same** output.
- Backprop sends the same gradient to each of them, because their inputs and their downstream weight are identical.
- Same start + same gradient = same value after the update. Forever.
- You built a 3-unit layer and got a 1-unit layer wearing a costume. Width bought you nothing.
- The name for this: the units are **symmetric**, and nothing in the math ever breaks the symmetry.
- Random init breaks it on step zero. That is the whole job of initialization: *make the units different so they can learn different things*.`,
    },
    {
      type: 'note',
      md: `Two follow-ups interviewers add. **"What about a constant c instead of 0?"** Same failure — the constant does not matter, the *sameness* does. **"What about biases?"** Biases can safely be zero, because the weights are already random: the units differ before the bias ever matters. That is exactly what PyTorch does for most layers.`,
    },
    {
      type: 'intuition',
      title: 'Too small and too large fail the same way: through depth',
      md: `Random is necessary but not sufficient. The *scale* of the random numbers decides whether a 30-layer network is trainable.

- **Too small** (say every weight ~ 0.01): each layer shrinks the signal. Multiply a shrink 30 times and the last layer receives essentially zero. Nothing to learn from.
- **Too large** (say ~ 1.0 with wide layers): each layer inflates the signal. With tanh/sigmoid the activations slam into the flat ends and **saturate** — the derivative there is ~0, so no gradient flows. With ReLU the numbers just explode.
- Both are the same disease: a per-layer multiplier that is not ~1, compounded by depth.
- So state the goal properly, the way a paper would: **keep the variance of the activations roughly constant as you go forward, and the variance of the gradients roughly constant as you go backward.**
- That single sentence is the entire theory behind Xavier and He. Everything else is arithmetic.`,
    },
    {
      type: 'math',
      intro: 'The goal, then the two recipes that achieve it. n_in = fan_in = number of inputs feeding one unit.',
      latex: [
        '\\text{Goal: } \\mathrm{Var}(a^{[l]}) \\approx \\mathrm{Var}(a^{[l-1]}) \\quad \\text{forward, and} \\quad \\mathrm{Var}\\!\\left(\\frac{\\partial L}{\\partial a^{[l-1]}}\\right) \\approx \\mathrm{Var}\\!\\left(\\frac{\\partial L}{\\partial a^{[l]}}\\right) \\quad \\text{backward}',
        'z = \\sum_{i=1}^{n_{in}} w_i x_i \\;\\Rightarrow\\; \\mathrm{Var}(z) = n_{in}\\,\\mathrm{Var}(w)\\,\\mathrm{Var}(x) \\;\\;\\Rightarrow\\;\\; \\mathrm{Var}(w) = \\tfrac{1}{n_{in}} \\text{ gives } \\mathrm{Var}(z) = \\mathrm{Var}(x)',
        '\\textbf{Xavier / Glorot (tanh, sigmoid): } \\mathrm{Var}(w) = \\frac{1}{n_{in}} \\quad\\text{or the two-sided}\\quad \\frac{2}{n_{in} + n_{out}}',
        '\\textbf{He / Kaiming (ReLU): } \\mathrm{Var}(w) = \\frac{2}{n_{in}}, \\qquad w \\sim \\mathcal{N}\\!\\left(0, \\tfrac{2}{n_{in}}\\right)',
      ],
    },
    {
      type: 'intuition',
      title: 'Where the 2 in He init comes from',
      md: `Xavier assumes the activation passes signal through roughly unchanged near zero — true for tanh, false for ReLU.

- **ReLU deletes half its inputs.** Every negative pre-activation becomes exactly 0.
- Deleting half the values halves the variance of what comes out: Var(ReLU(z)) ≈ ½·Var(z) for zero-mean symmetric z.
- Compound that halving over 30 layers and the signal is gone — Xavier init under-shoots for ReLU nets.
- Fix: **double the weight variance to pre-pay for the halving.** 1/n_in becomes 2/n_in. That is the entire derivation of He init.
- Rule you can say in one breath: *"Xavier for tanh and sigmoid, He for ReLU and its family, and the factor 2 is because ReLU zeroes half the signal."*
- Xavier has a second, two-sided form 2/(n_in + n_out): it compromises between keeping forward variance stable (wants 1/n_in) and backward variance stable (wants 1/n_out).`,
    },
    {
      type: 'note',
      md: `What PyTorch actually does, since interviewers like catching this: **nn.Linear and nn.Conv2d default to Kaiming uniform with a = sqrt(5)**, which works out close to a modest Xavier-style uniform — *not* the He normal you would pick by hand for a deep ReLU stack. For deep ReLU networks people still call \`nn.init.kaiming_normal_(w, nonlinearity='relu')\` explicitly. The default is a safe compromise, not the optimum for your architecture.`,
    },
    {
      type: 'intuition',
      title: 'Vanishing and exploding gradients',
      md: `This is the problem initialization was invented to fix, and it is worth naming precisely because the fix list is an interview staple.

- Backprop through L layers is a **product** of L per-layer Jacobian factors (cross-ref: the backprop module — the chain rule multiplies down the graph).
- A product of many numbers has only three fates: shrink to 0, blow up, or stay near 1. There is no fourth option.
- Each factor slightly below 1 → **vanishing gradients**: early layers get nothing, they stay at their random init while late layers overfit.
- Each factor slightly above 1 → **exploding gradients**: one step throws the weights to huge values, the next forward pass overflows.
- Sigmoid makes vanishing worse for free: its derivative maxes out at 0.25, so even a perfect weight scale loses 4x per layer.`,
    },
    {
      type: 'math',
      intro: 'Why depth is unforgiving — the multiplication chain, with numbers.',
      latex: [
        '\\frac{\\partial L}{\\partial W^{[1]}} = \\underbrace{\\frac{\\partial L}{\\partial a^{[L]}} \\prod_{l=2}^{L} \\frac{\\partial a^{[l]}}{\\partial a^{[l-1]}}}_{L-1 \\text{ factors, multiplied}} \\cdot \\frac{\\partial a^{[1]}}{\\partial W^{[1]}}',
        '\\text{factor} \\approx 0.9 \\Rightarrow 0.9^{50} \\approx 0.005 \\;(\\text{vanished}) \\qquad \\text{factor} \\approx 1.1 \\Rightarrow 1.1^{50} \\approx 117 \\;(\\text{exploded})',
        '\\text{Gradient clipping by norm: } \\;\\; g \\leftarrow g \\cdot \\min\\!\\left(1, \\frac{c}{\\lVert g \\rVert_2}\\right) \\quad \\text{keep the direction, cap the length}',
      ],
    },
    {
      type: 'note',
      md: `**The symptoms, so you can diagnose in an interview.** Loss stuck at chance level (0.693 for balanced binary, ln(k) for k classes) and barely moving = **vanishing**. Loss fine for a few steps then NaN or inf = **exploding**. **The fix list, in the order you would try it.** (1) Correct init — Xavier or He, free. (2) ReLU family over sigmoid/tanh — derivative is 1 on the positive side, no built-in decay. (3) Normalization layers — the rest of this module. (4) **Residual connections** — a plus-x path gives the gradient a route with factor 1 that skips the whole block; this is why 100+ layer networks became possible (forward-ref: ResNet in L2). (5) **Gradient clipping by norm** — the standard for RNNs and transformers, and specifically an *exploding*-gradient fix, not a vanishing one. (6) Lower learning rate and warmup — the blunt instrument that hides the symptom.`,
    },
    {
      type: 'intuition',
      title: 'BatchNorm: fix the statistics, not just the starting point',
      md: `Good init makes the variances right at step 0. Then training moves the weights and the variances drift again. BatchNorm re-fixes them at every single step.

- For **each feature** (each column of the layer output), compute mean and variance **across the batch dimension** — down the column, over the examples.
- Subtract the mean, divide by the std. That feature now has mean 0, variance 1 for this batch.
- Then rescale with two **learned** parameters per feature: y = γ·x̂ + β.
- Why learn γ and β at all? Because forcing mean 0 / variance 1 removes a freedom the layer might need. A sigmoid unit that wants to saturate, or a feature that should be large, can no longer be. γ and β let the network **undo** the normalization if that is genuinely better — including γ = std, β = mean, which recovers the original exactly.
- Normalization sets a sane default scale; γ and β keep the layer's right to disagree.`,
    },
    {
      type: 'math',
      intro: 'BatchNorm, for m examples in a batch and feature index j.',
      latex: [
        '\\mu_j = \\frac{1}{m}\\sum_{i=1}^{m} x_{ij}, \\qquad \\sigma_j^2 = \\frac{1}{m}\\sum_{i=1}^{m}\\left(x_{ij} - \\mu_j\\right)^2 \\qquad \\text{(down the batch, one pair per feature)}',
        '\\hat{x}_{ij} = \\frac{x_{ij} - \\mu_j}{\\sqrt{\\sigma_j^2 + \\epsilon}}, \\qquad y_{ij} = \\gamma_j\\,\\hat{x}_{ij} + \\beta_j \\qquad (\\gamma, \\beta \\text{ learned, } 2d \\text{ parameters})',
        '\\text{Inference uses running estimates: } \\;\\; \\mu_{run} \\leftarrow (1-\\rho)\\,\\mu_{run} + \\rho\\,\\mu_{batch} \\quad \\text{(collected while training, frozen at test)}',
      ],
    },
    {
      type: 'intuition',
      title: 'Train vs test — the question they always ask',
      md: `BatchNorm is the only common layer that **computes something different at training time than at test time**. Know exactly what and why.

- **Training:** use the statistics of the current batch. They are what backprop can differentiate through, and their noise is part of the benefit.
- **Test:** use a **running average** of the means and variances collected during training. Frozen numbers, no batch involved.
- The reason is not efficiency, it is that the alternative is impossible: **a single test example has no batch to normalize against.** Normalizing one example by its own batch statistics divides it by a variance of zero.
- Second reason, equally interview-worthy: with batch statistics at test time, your prediction for a user would depend on **whoever else happened to be in the same batch**. Predictions must be deterministic per input.
- In PyTorch this switch is \`model.eval()\` (and \`model.train()\` to go back). It also switches dropout off.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Which numbers get averaged: BatchNorm vs LayerNorm',
        notice: 'One batch: 4 examples, 3 features. Watch which cells feed each statistic — a column (across examples) or a row (inside one example). The last frames are the train-vs-test question.',
        leftLabel: 'batch rows',
        rightLabel: 'statistics used',
        frames: [
          {
            note: 'The batch: 4 examples, 3 features each. Two ways to normalize this grid — down the columns, or across the rows.',
            stack: [
              { name: 'x1', value: '[ 2, 10,  1]' },
              { name: 'x2', value: '[ 4, 12,  3]' },
              { name: 'x3', value: '[ 6, 14, 11]' },
              { name: 'x4', value: '[ 8, 16,  5]' },
            ],
            heap: [{ id: 'grid', value: 'features f0 f1 f2', label: 'columns' }],
          },
          {
            note: 'BatchNorm, feature f0: gather that ONE column from ALL 4 examples. Four arrows, one statistic. Each feature gets its own pair.',
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
            note: 'BatchNorm output. Every COLUMN now has mean 0, std 1. Then gamma and beta rescale each feature — the layer keeps its right to be un-normalized.',
            stack: [
              { name: 'x1', value: '[-1.3 -1.3 -1.1]' },
              { name: 'x2', value: '[-0.4 -0.4 -0.5]' },
              { name: 'x3', value: '[ 0.4  0.4  1.6]' },
              { name: 'x4', value: '[ 1.3  1.3  0.0]' },
            ],
            heap: [{ id: 'colz', value: 'col means all 0.0', label: 'per feature' }],
          },
          {
            note: 'LayerNorm, example x3: gather that ONE row across its 3 features. One arrow, one statistic, no other example involved.',
            stack: [
              { name: 'x1', value: '[ 2, 10,  1]' },
              { name: 'x2', value: '[ 4, 12,  3]' },
              { name: 'x3', value: '[ 6, 14, 11]', to: 'r3' },
              { name: 'x4', value: '[ 8, 16,  5]' },
            ],
            heap: [{ id: 'r3', value: 'mu=10.33 sd=3.30', label: 'x3 alone' }],
          },
          {
            note: 'LayerNorm output. Every ROW has mean 0, std 1. x1 and x2 land on the same vector: they differ only by a constant shift, which LayerNorm removes by design.',
            stack: [
              { name: 'x1', value: '[-0.6  1.4 -0.8]' },
              { name: 'x2', value: '[-0.6  1.4 -0.8]' },
              { name: 'x3', value: '[-1.3  1.1  0.2]' },
              { name: 'x4', value: '[-0.4  1.4 -1.0]' },
            ],
            heap: [{ id: 'rowz', value: 'row means all 0.0', label: 'per example' }],
          },
          {
            note: 'Test time. ONE example arrives. BatchNorm has no column to average over — its own batch statistics give variance 0 and erase the example to zeros.',
            stack: [{ name: 'x_test', value: '[ 2, 10,  1]', to: 'dead', danger: true }],
            heap: [{ id: 'dead', value: 'all zeros', label: 'no column' }],
          },
          {
            note: 'The fix: during training BatchNorm kept a running average of every batch mean and variance. At eval() it uses those frozen numbers — deterministic, batch-size independent.',
            stack: [{ name: 'x_test', value: '[ 2, 10,  1]', to: 'run' }],
            heap: [
              { id: 'run', value: 'mu=5.00 sd=2.24', label: 'running avg' },
              { id: 'outc', value: '[-1.3 -1.3 -1.1]', label: 'correct' },
            ],
          },
          {
            note: 'LayerNorm at test time: the exact same code path. The row is its own reference, so there is nothing to remember and no eval() mode to forget.',
            stack: [{ name: 'x_test', value: '[ 2, 10,  1]', to: 'own' }],
            heap: [
              { id: 'own', value: 'mu=4.33 sd=4.03', label: 'its own row' },
              { id: 'outl', value: '[-0.6  1.4 -0.8]', label: 'same as train' },
            ],
          },
        ],
      },
    },
    {
      type: 'note',
      md: `**The classic bug, worth memorizing as a story.** You forget \`model.eval()\` before evaluating. BatchNorm keeps using batch statistics, so a test image's prediction now depends on the other images sitting in the same batch. Symptoms: validation accuracy that changes when you change the batch size, results that differ between batch inference and one-at-a-time serving, and a model that looks fine offline but is wrong in production where requests arrive alone. Same forgotten call also leaves dropout on, which drags accuracy down for a completely separate reason.`,
    },
    {
      type: 'intuition',
      title: 'What BatchNorm buys, and where it hurts',
      md: `Buys, in the order of how much they matter in practice:

- **Much higher learning rates are safe.** Normalizing after each layer stops one layer's scale drift from detonating the next, so the usable learning-rate range widens by roughly an order of magnitude.
- **Faster convergence** — fewer epochs to the same loss, which is why it was adopted almost instantly in vision.
- **Mild regularization for free**: each example is normalized by statistics that depend on random batch-mates, so the same example gets slightly different activations every epoch. That noise behaves like a weak dropout.

Hurts:

- **Small batches make the statistics noisy.** Batch size 2 or 4 estimates a mean from 2 or 4 numbers — the noise stops being a regularizer and becomes damage. Detection and segmentation models, where batch size is limited by image size, hit this hard.
- **Awkward for variable-length sequences.** In a padded batch, position 40 exists in 3 sequences and not in the other 29 — which examples are you averaging over? There is no clean answer.
- **It couples examples in a batch.** Training is no longer a pure function of one example; distributed training needs the statistics synced or approximated; the train/test gap exists at all only because of this coupling.`,
    },
    {
      type: 'intuition',
      title: 'LayerNorm: turn the averaging 90 degrees',
      md: `Same normalization formula, different axis — and every BatchNorm weakness disappears with it.

- Compute mean and variance **across the feature dimension, inside one example**. A row, not a column.
- No other example is ever consulted. **Batch size 1 works identically to batch size 256.**
- **Train and test are the same computation.** No running averages, no eval() switch for this layer, no batch-composition bug. That alone removes a whole class of production incidents.
- Sequence-friendly: each token normalizes itself, so padding and variable lengths are non-issues.
- This is exactly why **transformers use LayerNorm** (cross-ref: the GenAI transformer-block module — attention → Add & Norm → FFN → Add & Norm). Variable-length text, per-token independence, and inference on a single sequence all rule BatchNorm out.
- γ and β still exist and are still per-feature — the learned rescale is orthogonal to which axis you average over.`,
    },
    {
      type: 'math',
      intro: 'LayerNorm for example i over d features — note what is missing: any m, any running estimate.',
      latex: [
        '\\mu_i = \\frac{1}{d}\\sum_{j=1}^{d} x_{ij}, \\qquad \\sigma_i^2 = \\frac{1}{d}\\sum_{j=1}^{d}\\left(x_{ij} - \\mu_i\\right)^2 \\qquad \\text{(across the features, one pair per example)}',
        'y_{ij} = \\gamma_j \\frac{x_{ij} - \\mu_i}{\\sqrt{\\sigma_i^2 + \\epsilon}} + \\beta_j \\qquad \\text{identical at train and at test}',
        '\\textbf{RMSNorm} \\text{ drops the mean subtraction entirely: } \\;\\; y_{ij} = \\gamma_j \\frac{x_{ij}}{\\sqrt{\\frac{1}{d}\\sum_{k=1}^{d} x_{ik}^2 + \\epsilon}}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Both norms on the same 4x3 batch — the only difference is the axis',
      code: `import numpy as np

# 4 examples (rows) x 3 features (columns) - one small batch.
X = np.array([[2., 10.,  1.],
              [4., 12.,  3.],
              [6., 14., 11.],
              [8., 16.,  5.]])
eps = 1e-5

# BatchNorm: statistics DOWN each column (axis=0) -> one mean/var per FEATURE.
bn_mean = X.mean(axis=0)                    # shape (3,): one number per feature
bn_var = X.var(axis=0)
bn = (X - bn_mean) / np.sqrt(bn_var + eps)  # broadcasts down the 4 rows

# LayerNorm: statistics ACROSS each row (axis=1) -> one mean/var per EXAMPLE.
ln_mean = X.mean(axis=1, keepdims=True)     # shape (4, 1): one number per example
ln_var = X.var(axis=1, keepdims=True)
ln = (X - ln_mean) / np.sqrt(ln_var + eps)  # broadcasts across the 3 features

print('BN mean per FEATURE ', bn_mean.round(3), 'shape', bn_mean.shape)
print('LN mean per EXAMPLE', ln_mean.ravel().round(3), 'shape', ln_mean.shape)
print('BatchNorm out\\n', bn.round(3))
print('LayerNorm out\\n', ln.round(3))
print('BN column means', bn.mean(axis=0).round(3), '| LN row means', ln.mean(axis=1).round(3))

# Now ONE test example arrives, alone.
x1 = X[:1]
ln_1 = (x1 - x1.mean(axis=1, keepdims=True)) / np.sqrt(x1.var(axis=1, keepdims=True) + eps)
bn_1 = (x1 - x1.mean(axis=0)) / np.sqrt(x1.var(axis=0) + eps)
print('LN alone  ', ln_1.round(3), 'same as in batch?', np.allclose(ln_1, ln[:1]))
print('BN alone  ', bn_1.round(3), '<- batch stats of one row: everything erased')
print('BN running', ((x1 - bn_mean) / np.sqrt(bn_var + eps)).round(3), '<- what eval() does')

# ---- real output ----
# BN mean per FEATURE  [ 5. 13.  5.] shape (3,)
# LN mean per EXAMPLE [ 4.333  6.333 10.333  9.667] shape (4, 1)
# BatchNorm out
#  [[-1.342 -1.342 -1.069]
#   [-0.447 -0.447 -0.535]
#   [ 0.447  0.447  1.604]
#   [ 1.342  1.342  0.   ]]
# LayerNorm out
#  [[-0.579  1.407 -0.828]
#   [-0.579  1.407 -0.828]
#   [-1.313  1.111  0.202]
#   [-0.359  1.364 -1.005]]
# BN column means [0. 0. 0.] | LN row means [ 0.  0. -0.  0.]
# LN alone   [[-0.579  1.407 -0.828]] same as in batch? True
# BN alone   [[0. 0. 0.]] <- batch stats of one row: everything erased
# BN running [[-1.342 -1.342 -1.069]] <- what eval() does`,
      annotations: {
        4: 'Rows are examples, columns are features. Fix that convention in your head — every axis argument below depends on it.',
        11: 'axis=0 collapses the ROW axis, so the mean is taken DOWN each column: over examples, per feature. Shape (3,) = one statistic per feature. This is BatchNorm.',
        13: 'gamma and beta would multiply and add here. Left out on purpose so the axis story stays visible; they are per-feature vectors of shape (3,) in both norms.',
        16: 'axis=1 collapses the FEATURE axis: one mean per example, shape (4, 1). keepdims=True is what makes the broadcast line up row-wise instead of erroring.',
        24: 'The proof, in one line: BatchNorm zeroes the COLUMN means, LayerNorm zeroes the ROW means. Same formula, perpendicular axes.',
        29: 'A batch of one row: its variance along axis=0 is exactly 0, so this divides by sqrt(eps) after subtracting the value from itself. Every number becomes 0. This is why BatchNorm needs a different rule at test time.',
        44: 'Rows 1 and 2 of the LayerNorm output are identical: [2,10,1] and [4,12,3] differ only by a constant +2 shift, which LayerNorm subtracts away. Normalization deliberately discards per-example mean and scale; gamma and beta are how the network gets useful scale back.',
        50: 'Running statistics reproduce the training-time answer for this row exactly, using no batch at all. This line IS model.eval().',
      },
    },
    {
      type: 'note',
      md: `Read the last three output lines as the interview answer, out loud. **LN alone** reproduces its in-batch row exactly and \`np.allclose\` says \`True\` — LayerNorm at test time is not a special case, it is the same computation. **BN alone** returns \`[0, 0, 0]\`: batch statistics of a single example destroy the example. **BN running** returns \`[-1.342, -1.342, -1.069]\` — the correct training-time answer, recovered from frozen numbers with no batch present. Those three lines are the whole train-vs-test story with no hand-waving.`,
    },
    {
      type: 'note',
      md: `**Pre-norm vs post-norm, honestly.** The original transformer was *post-norm*: x + Sublayer(x), then LayerNorm on top. Modern ones are *pre-norm*: x + Sublayer(LayerNorm(x)). Pre-norm trains more stably at depth because the residual path stays un-normalized end to end, so the gradient reaches layer 1 without passing through every norm — post-norm deep stacks often need a learning-rate warmup to survive the first few thousand steps at all. The honest cost: post-norm, when it does train, tends to reach slightly better final quality, which is why the debate did not simply end. Default to pre-norm; know that the choice is about *gradient flow through the residual path*, which is the point the question is testing.`,
    },
    {
      type: 'note',
      md: `**The rest of the family, one line each.** **GroupNorm** — split the channels into G groups and normalize within each group, per example: batch-independent like LayerNorm, and the standard rescue for detection/segmentation where batch size is 2. **InstanceNorm** — GroupNorm with G = number of channels, i.e. normalize each channel of each example alone; used in style transfer, because erasing per-channel mean and scale erases style. **RMSNorm** — LayerNorm with the mean subtraction dropped, dividing by the root-mean-square only: fewer operations, no measured quality loss, and now the default in Llama-family LLMs. **WeightNorm** — normalizes the weights instead of the activations; mostly historical.`,
    },
  ],
  quiz: [
    {
      question: 'You initialize every weight in a hidden layer to 0. What is the precise failure?',
      options: [
        {
          text: 'The gradients are all zero, so nothing ever updates',
          explanation:
            'Close but wrong in the details — gradients are generally non-zero (the bias path and the loss still produce signal). The failure is that they are IDENTICAL across units, not that they are zero.',
        },
        {
          text: 'All units in the layer compute the same output and receive the same gradient, so they stay identical forever',
          explanation:
            'Correct. This is the symmetry argument: same value + same gradient = same value after the update. An n-unit layer behaves like a 1-unit layer no matter how wide you make it.',
        },
        {
          text: 'The loss becomes NaN on the first step',
          explanation: 'NaN is the exploding-gradient symptom. Zero init fails silently — training runs, the loss just plateaus uselessly.',
        },
      ],
      correct: 1,
    },
    {
      question: 'You are building a 40-layer ReLU network. Which initialization, and why that specific constant?',
      options: [
        {
          text: 'He: Var(w) = 2/fan_in, because ReLU zeroes half its inputs and halves the variance, so you double the weight variance to compensate',
          explanation: 'Correct, and the reason is the whole answer. Xavier under-shoots for ReLU precisely by that factor of 2, compounding over depth.',
        },
        {
          text: 'Xavier: Var(w) = 1/fan_in, the general-purpose choice',
          explanation: 'Xavier is derived assuming the activation passes signal roughly unchanged — true near zero for tanh, false for ReLU, which deletes half the values.',
        },
        {
          text: 'Uniform in [-1, 1], since it is symmetric around zero',
          explanation: 'Symmetry around zero is necessary but says nothing about scale. With any reasonable fan_in this variance is far too large and the activations explode.',
        },
      ],
      correct: 0,
    },
    {
      question: 'At test time, what statistics does BatchNorm use?',
      options: [
        { text: 'The statistics of the test batch', explanation: 'This is the bug, not the design: predictions would then depend on which other examples share the batch, and a single-example request has no batch at all.' },
        { text: 'The statistics of the last training batch', explanation: 'One arbitrary batch would be a noisy, arbitrary estimate. BatchNorm accumulates across all of training instead.' },
        {
          text: 'A running average of the batch means and variances collected during training',
          explanation: 'Correct. Frozen numbers, no batch needed, fully deterministic per input. In PyTorch, model.eval() is what switches to them.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Training loss is 2.7, then 2.4, then inf, then NaN, all within 5 steps. Best first diagnosis?',
      options: [
        { text: 'Vanishing gradients', explanation: 'Vanishing gradients make the loss sit flat near chance level. Nothing about it produces inf or NaN.' },
        {
          text: 'Exploding gradients — reduce the learning rate and add gradient clipping by norm',
          explanation: 'Correct. NaN within a handful of steps is the signature of exploding updates. Clipping caps the gradient length while keeping its direction; also check the init scale.',
        },
        { text: 'Not enough training data', explanation: 'Data quantity affects generalization, not numerical overflow during the first few optimizer steps.' },
      ],
      correct: 1,
    },
    {
      question: 'A tensor of shape (32, 512) leaves a layer: 32 examples, 512 features. LayerNorm computes how many means?',
      options: [
        { text: '32 — one per example, each averaging over its 512 features', explanation: 'Correct. LayerNorm collapses the FEATURE axis, so each example gets exactly one mean and one variance, computed with no reference to the other 31.' },
        { text: '512 — one per feature, each averaging over the 32 examples', explanation: 'That is BatchNorm. It collapses the batch axis instead, giving one statistic per feature.' },
        { text: '1 — a single mean over all 16,384 numbers', explanation: 'That would mix examples together, destroying the batch-independence that is LayerNorm\'s entire selling point.' },
      ],
      correct: 0,
    },
    {
      question: 'Why do BatchNorm and LayerNorm both have learned parameters γ and β?',
      options: [
        { text: 'To speed up the normalization computation', explanation: 'They add work, not remove it — two extra elementwise operations per feature.' },
        { text: 'To keep the output strictly between 0 and 1', explanation: 'Neither norm bounds its output at all; normalized values routinely exceed 1 in magnitude, and γ can scale them further.' },
        {
          text: 'Because forcing mean 0 / variance 1 removes a freedom the layer may need — γ and β let the network undo the normalization when that is better',
          explanation:
            'Correct. With γ = std and β = mean the layer recovers its original distribution exactly. Normalization supplies a good default scale; these two parameters preserve the right to disagree with it.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Your segmentation model can only fit batch size 2 on the GPU. What breaks, and what do you switch to?',
      options: [
        { text: 'Nothing breaks; BatchNorm is batch-size independent', explanation: 'It is the opposite — BatchNorm is the one common layer whose output depends on batch composition.' },
        {
          text: 'BatchNorm estimates each mean and variance from 2 numbers, so the statistics are pure noise — switch to GroupNorm (or LayerNorm)',
          explanation:
            'Correct, and this is exactly why GroupNorm was invented. Batch-independent norms give identical behaviour at batch size 2 and 256, and match train to test for free.',
        },
        { text: 'The learning rate must be doubled to compensate', explanation: 'The problem is estimator variance, not step size. A different learning rate cannot make a 2-sample mean informative.' },
      ],
      correct: 1,
    },
    {
      question: 'Pre-norm transformer blocks (x + Sublayer(LN(x))) vs post-norm (LN(x + Sublayer(x))). What is the main practical difference?',
      options: [
        {
          text: 'Pre-norm trains more stably at depth because the residual path stays un-normalized, so gradients reach early layers without passing through every norm',
          explanation: 'Correct. Post-norm deep stacks typically need learning-rate warmup to survive early training; post-norm can still edge out slightly better final quality when it does converge.',
        },
        { text: 'Pre-norm uses fewer parameters', explanation: 'Identical parameter count — the same LayerNorm modules, just placed differently relative to the residual addition.' },
        { text: 'Post-norm works on variable-length sequences and pre-norm does not', explanation: 'Both are LayerNorm, so both are per-token and length-agnostic. Placement does not change that.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why can you not initialize all the weights of a neural network to zero?',
      answer:
        'Symmetry. With identical weights, every unit in a layer computes the identical output; during backprop each of those units receives the identical gradient, because their inputs and their outgoing weights are identical too. Identical value plus identical gradient means identical value after the update — forever. The layer is effectively one unit no matter how wide you built it. Note the two refinements interviewers probe for: (1) any constant fails, not just zero — the sameness is the problem, not the value; (2) biases CAN be zero-initialized safely, because random weights already break the symmetry, and that is what PyTorch does.',
      isCaseBased: false,
    },
    {
      question: 'Derive Xavier initialization, then explain how He differs and why.',
      answer:
        'One pre-activation is z = sum of n_in terms w_i x_i. For independent zero-mean w and x, Var(z) = n_in · Var(w) · Var(x). To keep Var(z) = Var(x) — the stated goal of constant activation variance across depth — you need Var(w) = 1/n_in. That is Xavier. The two-sided form 2/(n_in + n_out) is a compromise: forward stability wants 1/n_in, backward gradient stability wants 1/n_out, so you average the constraints. He changes one assumption: ReLU zeroes every negative pre-activation, so Var(ReLU(z)) is about half of Var(z). Compounded over depth that is fatal, so you pre-pay by doubling the weight variance: Var(w) = 2/n_in. Summary line: Xavier for tanh/sigmoid, He for ReLU, and the 2 is the price of ReLU deleting half the signal.',
      isCaseBased: false,
    },
    {
      question: 'Explain exactly what BatchNorm does differently at training time and at test time, and why the difference has to exist.',
      answer:
        'Training: for each feature, compute the mean and variance across the current batch, normalize with them, then apply the learned per-feature gamma and beta. Test: use a running average of those means and variances, accumulated during training with a momentum term, and frozen. The difference is not an optimization — it is forced. A single test example has no batch to compute statistics from; normalizing it by its own batch statistics divides by a variance of zero and erases the example to zeros. Second, equally important reason: if you did use test-batch statistics, one user\'s prediction would depend on which other users happened to be batched with them, which makes serving non-deterministic and offline evaluation unreproducible. In PyTorch, model.eval() performs the switch (and also disables dropout); forgetting it is the classic bug. Worth adding that this train/test gap is the price of BatchNorm coupling examples — LayerNorm has no such gap because it never leaves the example.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague reports 96% validation accuracy in the notebook, but the deployed service gets roughly 60% on the same data, one request at a time. Where do you look first?',
      answer:
        'Prime suspect: model.eval() was never called, so BatchNorm is still using batch statistics. Offline, batches of 64 give reasonable estimates and accuracy looks fine. In production each request arrives alone, so BatchNorm normalizes a batch of one — variance zero, the example collapses toward zeros, the prediction becomes garbage. Confirming test that takes 30 seconds: re-run the offline evaluation with batch size 1, and separately shuffle the validation set and see whether per-example predictions change. Both moving confirms it. Same missing call also leaves dropout active, which contributes its own smaller drop. Related suspects if eval() was called: running statistics never converged because training was too short or momentum was mis-set, and train/serve preprocessing skew. Fix order: eval() first, since it is one line and explains the full magnitude.',
      isCaseBased: true,
    },
    {
      question: 'What are vanishing and exploding gradients, and what actually fixes each?',
      answer:
        'Backprop through L layers multiplies L Jacobian factors together. If the typical factor is slightly below 1, the product decays geometrically — 0.9^50 is about 0.005 — and early layers receive no signal: vanishing. Slightly above 1 and it blows up — 1.1^50 is about 117 — and one update destroys the weights: exploding. Symptoms differ and matter: vanishing shows as loss frozen near chance (0.693 for balanced binary); exploding shows as NaN within a few steps. Fixes for vanishing: correct init (He/Xavier), ReLU-family activations instead of sigmoid whose derivative caps at 0.25, normalization layers, and above all residual connections, which give the gradient a factor-1 path around every block — that is what made 100+ layer networks trainable. Fixes for exploding: gradient clipping by norm (the standard in RNNs and transformers), lower learning rate, warmup. Naming clipping as an exploding-only fix is a detail that separates good answers from memorized ones.',
      isCaseBased: false,
    },
    {
      question: 'Case: an LSTM language model trains fine for 200 steps, then the loss becomes NaN. Give your debugging order.',
      answer:
        'NaN after healthy steps means numerical explosion, not a config error — a config error would fail at step 0. (1) Print the global gradient norm each step and look at the last few before the NaN; a spike from ~1 to ~10^4 confirms exploding gradients, which recurrent models are especially prone to because BPTT multiplies the same recurrent matrix once per timestep. Fix: clip_grad_norm_ with a threshold around 1.0. (2) Check the learning rate and whether a scheduler just stepped it up; add warmup. (3) Look for a data outlier at that position — an unusually long sequence or a corrupted row; log the batch that caused it. (4) Check for numerically illegal operations: log(0) in a custom loss, division by a value that hit zero, sqrt of a negative. (5) If using fp16, check for overflow and confirm the gradient scaler is enabled. Tradeoff to name: clipping makes training survive but masks a scale problem — if you need a very tight clip threshold to stay alive, the init or learning rate is wrong and should be fixed at the source.',
      isCaseBased: true,
    },
    {
      question: 'Why does BatchNorm allow much higher learning rates?',
      answer:
        'Without it, a large step in layer 3 changes the scale of everything layer 4 onwards receives, and that scale drift compounds through depth — so the learning rate has to be small enough that no layer disturbs its successors too much. BatchNorm re-standardizes each layer\'s output every step, so a scale change caused by a big update is largely undone before it propagates. It also makes the loss surface better conditioned: the current explanation in the literature is smoothness of the loss and its gradients rather than the original "internal covariate shift" story, which later work largely deflated. A useful extra: BatchNorm makes the layer invariant to the scale of its weights, so a weight that doubles produces the same output — which decouples the effective step size from the weight magnitude.',
      isCaseBased: false,
    },
    {
      question: 'Why do transformers use LayerNorm rather than BatchNorm?',
      answer:
        'Three reasons, all decisive. (1) Variable-length sequences: in a padded batch, position 40 exists in some sequences and not others, so "the mean over the batch at position 40" has no well-defined denominator. LayerNorm normalizes each token against its own features and never asks the question. (2) Train/test identity: LLM inference frequently runs one sequence at a time and generates one token at a time, so a normalization that needs a batch is a liability; LayerNorm has no running statistics and no eval() mode. (3) Batch-size independence: LLM training uses small per-device batches with gradient accumulation, and BatchNorm statistics would be noisy and would need cross-device synchronization. Add the practical footnote: modern LLMs have mostly moved one step further to RMSNorm, which drops the mean subtraction and is cheaper with no measured quality loss.',
      isCaseBased: false,
    },
    {
      question: 'Case: you are training an object detector. Batch size is 2 per GPU because the images are large. Validation metrics are unstable across epochs and much worse than training. What is your hypothesis and your fix?',
      answer:
        'Hypothesis: BatchNorm with batch size 2 estimates each mean and variance from two examples. That estimate is nearly pure noise, so (a) the effective regularization from batch noise becomes damage rather than help, and (b) the running averages accumulated from noisy batch statistics are a poor match for what the network actually sees at test time — producing exactly the train/val gap and instability described. Fixes, ranked: (1) swap BatchNorm for GroupNorm — batch-independent, designed for this case, and identical at train and test. (2) SyncBatchNorm to pool statistics across GPUs, which restores an effective batch of 2 x num_gpus, at the cost of a synchronization per layer. (3) Freeze the BatchNorm layers if fine-tuning from a pretrained backbone — use the pretrained running statistics and stop updating them; this is standard practice in detection codebases. (4) Gradient accumulation does NOT help, because it does not change the batch each BatchNorm layer sees. Naming that last point is what shows you understand the mechanism rather than the recipe.',
      isCaseBased: true,
    },
    {
      question: 'Pre-norm or post-norm, and what is the actual difference?',
      answer:
        'Post-norm (original transformer): LN(x + Sublayer(x)) — the normalization sits on the residual stream. Pre-norm (nearly all modern models): x + Sublayer(LN(x)) — the residual path is a clean, un-normalized identity from input to output. That difference is entirely about gradient flow: in pre-norm, the gradient can reach layer 1 through a path that never passes a normalization, so deep stacks train stably from step 0. Post-norm puts a LayerNorm on every residual hop, and deep post-norm models typically need learning-rate warmup to survive the first thousands of steps. The honest counterpoint: when post-norm does converge it often reaches marginally better final quality, which is why it has not vanished, and hybrids exist. Default to pre-norm; be able to say the reason is the residual gradient path, not tradition.',
      isCaseBased: false,
    },
    {
      question: 'Is BatchNorm a regularizer? Argue both sides.',
      answer:
        'Yes, mildly, and by accident. Each example is normalized using statistics that depend on its randomly chosen batch-mates, so the same example produces slightly different activations every epoch — stochastic noise injected into the forward pass, which is structurally what dropout does. Empirically, adding BatchNorm often lets you reduce or remove dropout. But it is a weak and uncontrollable regularizer: its strength depends on batch size (bigger batch = less noise = less regularization), you cannot tune it independently, and it disappears completely at test time by construction. So: treat it as a side effect worth knowing about, never as your regularization strategy. Weight decay, dropout, data augmentation, and early stopping remain the tools you actually control.',
      isCaseBased: false,
    },
    {
      question: 'A Linear layer is immediately followed by BatchNorm. What happens to the Linear layer\'s bias term?',
      answer:
        'It becomes redundant, and you should set bias=False. BatchNorm subtracts the batch mean of each feature; any constant bias added by the Linear layer shifts that feature by the same constant for every example, so it shifts the mean by exactly the same amount and gets subtracted straight back out. The bias parameters would receive gradients that ultimately do nothing to the output, and beta already provides a learned per-feature shift downstream. This is why torchvision ResNet convolutions all use bias=False — every one of them is followed by a BatchNorm. Small detail, but it is a fast check on whether you understand what BatchNorm actually removes.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Why not initialize all weights to zero?', back: 'Symmetry: every unit computes the same output and gets the same gradient, so they stay identical forever. Any constant fails, not just 0. Biases CAN be zero — random weights already break symmetry.' },
    { front: 'The goal of good initialization', back: 'Keep the variance of activations roughly constant going forward and of gradients going backward. Too small shrinks the signal through depth; too large saturates activations and explodes gradients.' },
    { front: 'Xavier / Glorot', back: 'Var(w) = 1/fan_in (or the two-sided 2/(fan_in + fan_out)). For tanh and sigmoid, which pass signal roughly unchanged near zero.' },
    { front: 'He / Kaiming and the factor 2', back: 'Var(w) = 2/fan_in, for ReLU. ReLU zeroes half its inputs and so halves the variance — you double the weight variance to pre-pay for it.' },
    { front: 'Vanishing vs exploding: symptoms and fixes', back: 'Product of L factors: 0.9^50 vanishes (loss stuck at chance), 1.1^50 explodes (NaN in a few steps). Vanishing: He/Xavier init, ReLU, norm layers, residual connections. Exploding: gradient clipping by norm, lower LR, warmup.' },
    { front: 'BatchNorm in one line, plus its weaknesses', back: 'Normalize each FEATURE across the BATCH (down the column), then rescale with learned gamma and beta. Buys high LR, fast convergence, mild regularization. Weak on small batches, variable-length sequences, and it couples examples in a batch.' },
    { front: 'Why gamma and beta exist', back: 'Forcing mean 0 / var 1 removes a freedom the layer might need. gamma = std, beta = mean recovers the original exactly — the network keeps the right to be un-normalized.' },
    { front: 'BatchNorm at train vs test', back: 'Train: current batch statistics. Test: a running average collected during training, frozen. Required because one test example has no batch, and because predictions must not depend on batch-mates. model.eval() is the switch.' },
    { front: 'LayerNorm in one line, and why transformers use it', back: 'Normalize across the FEATURES inside one example (across the row). Batch-size independent, identical at train and test, works on variable-length sequences — exactly what transformers need.' },
    { front: 'Pre-norm vs post-norm, and the norm family', back: 'Pre-norm x + Sublayer(LN(x)): un-normalized residual path, stable at depth, the modern default; post-norm needs warmup. GroupNorm: channel groups per example, the small-batch rescue. InstanceNorm: per channel, style transfer. RMSNorm: LayerNorm without the mean subtraction, Llama-family default.' },
  ],
  mindmapMarkdown: `- Weight Init, BatchNorm vs LayerNorm
  - Why init matters
    - All zeros = symmetry, units never differ
    - Too small: signal dies through depth
    - Too large: saturation, exploding
    - Goal: constant variance fwd and bwd
  - The recipes
    - Xavier: 1/fan_in or 2/(fan_in+fan_out)
    - He: 2/fan_in for ReLU
    - The 2 = ReLU zeroes half the signal
    - PyTorch default: kaiming uniform a=sqrt(5)
  - Vanishing / exploding
    - Product of L factors: 0.9^50 dies, 1.1^50 blows up
    - Symptoms: stuck at chance vs NaN
    - Fixes: init, ReLU, norms, residuals
    - Clipping by norm (exploding only)
  - BatchNorm
    - Stats DOWN the batch, per feature
    - Learned gamma, beta per feature
    - Buys: higher LR, faster, mild regularization
    - Train: batch stats. Test: running average
    - Because one example has no batch
    - Bug: forgot model.eval()
    - Weak: small batches, seq lengths, coupling
  - LayerNorm
    - Stats ACROSS features, per example
    - Train == test, batch-size independent
    - Why transformers use it
    - Pre-norm stable at depth vs post-norm warmup
  - The family
    - GroupNorm: channel groups, small batches
    - InstanceNorm: per channel, style transfer
    - RMSNorm: no mean subtraction, LLM default`,
}

export default m
