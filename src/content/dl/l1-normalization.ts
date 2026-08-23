import type { Module } from '../types'

const m: Module = {
  id: 'dl-l1-normalization',
  subjectId: 'dl',
  level: 1,
  title: 'BatchNorm vs LayerNorm',
  whyItMatters:
    'Both compute the same three operations. They differ only in which axis they average over — and that single choice is why convolutional networks use one and transformers use the other, and why BatchNorm behaves differently at test time.',
  assumes: [
    'You know what a mean and a standard deviation are',
    'You have read *Weight Initialisation*, so you know why activation scale drifts with depth',
  ],
  estMinutes: 20,
  sections: [
    {
      type: 'intuition',
      title: 'One operation, one choice',
      md: `A normalisation layer does three things: subtract a mean, divide by a standard deviation, then rescale by two learned parameters **γ** and **β**.

γ and β matter. Without them the layer would force every activation to mean 0 and variance 1, which is a hard constraint on what the network can represent. With them, the network can undo the normalisation if that is what it needs — the layer offers a well-conditioned starting point rather than imposing one.

The only real decision is **which values get averaged together**. BatchNorm averages down the batch, one statistic per feature. LayerNorm averages across the features, one statistic per example.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same matrix, normalised two ways',
      code: `import numpy as np
X = np.array([[1.0, 2.0, 3.0],
              [4.0, 5.0, 6.0],
              [7.0, 8.0, 90.0]])     # 3 examples (rows) x 3 features (columns)

bn = (X - X.mean(axis=0)) / X.std(axis=0)
ln = (X - X.mean(axis=1, keepdims=True)) / X.std(axis=1, keepdims=True)

print('BatchNorm (down columns):', np.round(bn, 4).tolist())
print('LayerNorm (across rows) :', np.round(ln, 4).tolist())

# ---- real output ----
# BatchNorm (down columns): [[-1.2247, -1.2247, -0.744], [0.0, 0.0, -0.6696], [1.2247, 1.2247, 1.4136]]
# LayerNorm (across rows) : [[-1.2247, 0.0, 1.2247], [-1.2247, 0.0, 1.2247], [-0.7199, -0.6942, 1.4141]]`,
      annotations: {
        6: 'axis=0 averages down the columns — across the batch, one mean and one std per FEATURE. Every example in the batch influences every other example\'s output.',
        7: 'axis=1 averages across the row — one mean and one std per EXAMPLE. Each row is normalised entirely on its own.',
        13: 'The 90 outlier lives in column 3, row 3. Under BatchNorm it distorts column 3 for ALL THREE rows: rows 1 and 2 get −0.744 and −0.6696 where the pattern would otherwise give −1.2247 and 0.0.',
        14: 'Under LayerNorm rows 1 and 2 are untouched — a clean [−1.2247, 0.0, 1.2247] — because the outlier is in a different example and examples do not talk to each other.',
      },
    },
    {
      type: 'math',
      intro:
        'The operation, identical for both. Only the set that μ and σ are computed over changes: over the batch dimension for BatchNorm, over the feature dimension for LayerNorm. ε is a small constant that prevents division by zero.',
      latex: [
        '\\hat{x} = \\frac{x - \\mu}{\\sqrt{\\sigma^2 + \\epsilon}}, \\qquad y = \\gamma\\hat{x} + \\beta',
      ],
    },
    {
      type: 'note',
      label: 'The consequence: BatchNorm couples your examples',
      md: `Under BatchNorm, an example's output **depends on the other examples in its batch**. That is not a side effect; it is the definition, and everything distinctive about BatchNorm follows from it.

It acts as a **regulariser**, because the statistics are noisy and that noise varies per batch — which is why models with BatchNorm often need less dropout.

It **breaks at small batch sizes**. The batch statistics become unreliable estimates, and at batch size 1 the variance across the batch is exactly 0.

And it means training and inference cannot use the same computation — you cannot make a prediction on one example using statistics from a batch that does not exist.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Batch size 1, and why inference needs a different rule',
      code: `one = X[:1]
print('batch of 1, BatchNorm: std per column =', one.std(axis=0).tolist())
print('batch of 1, LayerNorm:',
      np.round((one - one.mean()) / one.std(), 4).tolist())

# ---- real output ----
# batch of 1, BatchNorm: std per column = [0.0, 0.0, 0.0]
# batch of 1, LayerNorm: [[-1.2247, 0.0, 1.2247]]`,
      annotations: {
        2: 'Every column has a single value, so its standard deviation is exactly 0. Only the ε in the denominator prevents a divide-by-zero, and the output is then meaningless rather than merely imprecise.',
        7: 'LayerNorm gives the identical result it gave inside the full batch, because it never looked at the batch. That independence is the whole reason transformers use it.',
      },
    },
    {
      type: 'note',
      label: 'Running statistics, and the bug they cause',
      md: `BatchNorm solves the inference problem by keeping **running averages** of the mean and variance during training, and using those frozen values at test time. The layer therefore computes something genuinely different in the two modes.

Which is why \`model.eval()\` exists, and why forgetting it is one of the most common PyTorch bugs. Symptoms: validation accuracy that is far worse than training accuracy for no modelling reason, or predictions that change depending on what else is in the batch.

The reverse — leaving \`model.eval()\` on during training — is quieter and worse: the running statistics never update, so the layer normalises with stale values for the whole run.

Note that \`model.eval()\` and \`torch.no_grad()\` are unrelated. One switches layer behaviour, the other stops recording gradients. You usually want both at evaluation, and neither implies the other.`,
    },
    {
      type: 'note',
      label: 'Which one, and where',
      md: `**BatchNorm** for convolutional networks with a decent batch size, where it is still the standard and its regularising noise is genuinely useful. Statistics are computed per channel, over batch, height and width together.

**LayerNorm** for transformers and any sequence model. Batch independence is the point: sequences have different lengths, batch sizes are often small, and generation at inference happens one token at a time. It is also what makes results reproducible per example, which matters when serving.

Two more worth knowing. **GroupNorm** splits channels into groups and normalises within each — batch-independent, and the usual answer for detection and segmentation where memory forces batch sizes of 2 or 4. **RMSNorm** drops the mean subtraction entirely, dividing only by the root mean square; it is slightly cheaper and works about as well, which is why recent large language models use it.

And in transformers, **where** the norm sits matters as much as which one: pre-norm, inside the residual branch, is what makes deep stacks trainable without a delicate warmup.`,
    },
  ],
  quiz: [
    {
      question: 'What is the only real difference between BatchNorm and LayerNorm?',
      options: [
        { text: 'BatchNorm has learned parameters and LayerNorm does not', explanation: 'Both have γ and β.' },
        { text: 'Which axis the mean and std are averaged over — down the batch per feature, or across features per example', explanation: 'Correct. Everything else that distinguishes them follows from that one choice.' },
        { text: 'LayerNorm divides by the variance rather than the standard deviation', explanation: 'Both divide by the standard deviation.' },
        { text: 'BatchNorm is applied before the activation and LayerNorm after', explanation: 'Placement varies and is a separate question.' },
      ],
      correct: 1,
    },
    {
      question: 'Why do γ and β exist at all?',
      options: [
        { text: 'To speed up the computation', explanation: 'They add parameters and cost.' },
        { text: 'Without them the layer would force mean 0 and variance 1, a hard constraint — γ and β let the network undo the normalisation if it needs to', explanation: 'Correct. The layer offers a well-conditioned starting point rather than imposing one.' },
        { text: 'To prevent division by zero', explanation: 'That is ε in the denominator.' },
        { text: 'To make the layer differentiable', explanation: 'It is differentiable without them.' },
      ],
      correct: 1,
    },
    {
      question: 'A 90 in one cell distorted BatchNorm\'s output for all three rows but left LayerNorm\'s other rows untouched. Why?',
      options: [
        { text: 'LayerNorm clips outliers', explanation: 'It does no clipping; row 3 is still affected.' },
        { text: 'BatchNorm computes statistics down the column, so every example in the batch influences every other one', explanation: 'Correct — rows 1 and 2 got −0.744 and −0.6696 instead of −1.2247 and 0.0.' },
        { text: 'The seed differed between the two', explanation: 'No randomness is involved.' },
        { text: 'LayerNorm uses a larger ε', explanation: 'ε plays no role at this scale.' },
      ],
      correct: 1,
    },
    {
      question: 'What happens to BatchNorm at batch size 1?',
      options: [
        { text: 'It behaves like LayerNorm', explanation: 'It normalises the wrong axis; the results are unrelated.' },
        { text: 'Each column has one value, so its std is exactly 0 — only ε prevents a divide-by-zero and the output is meaningless', explanation: 'Correct, which is why small-batch training needs GroupNorm or LayerNorm instead.' },
        { text: 'It falls back to the running statistics', explanation: 'Not in training mode; it uses the batch statistics.' },
        { text: 'Nothing — it is unaffected by batch size', explanation: 'That describes LayerNorm.' },
      ],
      correct: 1,
    },
    {
      question: 'You forget model.eval() at validation time. What do you see?',
      options: [
        { text: 'An immediate crash', explanation: 'It runs silently, which is what makes it dangerous.' },
        { text: 'Validation accuracy far worse than training for no modelling reason, and predictions that change with batch composition', explanation: 'Correct — BatchNorm uses batch statistics instead of the frozen running averages.' },
        { text: 'Gradients accumulate across batches', explanation: 'That is a separate bug, unrelated to eval mode.' },
        { text: 'Nothing, as long as the batch size matches training', explanation: 'The statistics still come from the validation batch, not the training distribution.' },
      ],
      correct: 1,
    },
    {
      question: 'Why do transformers use LayerNorm rather than BatchNorm?',
      options: [
        { text: 'It is faster', explanation: 'The cost is comparable.' },
        { text: 'Batch independence: sequences have varying lengths, batches are often small, and generation happens one token at a time', explanation: 'Correct, and it makes results reproducible per example when serving.' },
        { text: 'BatchNorm cannot handle more than two dimensions', explanation: 'It handles 4D convolutional activations routinely.' },
        { text: 'LayerNorm regularises more strongly', explanation: 'BatchNorm is the one with a regularising effect, from its batch noise.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'BatchNorm versus LayerNorm — explain the difference.',
      answer:
        'They perform the identical three operations — subtract a mean, divide by a standard deviation, rescale by learned γ and β — and differ only in which values are averaged together. BatchNorm averages down the batch, giving one statistic per feature, so an example\'s output depends on the other examples in its batch. LayerNorm averages across the features of a single example, so each example is normalised entirely on its own. Everything distinctive follows from that: BatchNorm regularises through batch noise, breaks at small batch sizes, and needs different behaviour at inference, while LayerNorm has none of those properties and is therefore what sequence models use.',
      isCaseBased: false,
    },
    {
      question: 'What does BatchNorm do differently at training and test time, and why?',
      answer:
        'At training it normalises using the statistics of the current batch. At test time there may be no batch — you might be scoring one example — and in any case you do not want a prediction to depend on which other examples happen to be alongside it. So during training it also maintains running averages of the mean and variance, and at test time it uses those frozen values instead. That is why the layer genuinely computes something different in the two modes, why model.eval() exists, and why forgetting it is such a common bug: nothing crashes, validation just looks inexplicably worse.',
      isCaseBased: true,
    },
    {
      question: 'Why do γ and β exist?',
      answer:
        'Because normalisation without them is a hard constraint. Forcing every activation to mean 0 and variance 1 restricts what the layer can represent — for a sigmoid, for instance, it confines the input to the near-linear region and removes the saturation the network might want. γ and β let the network learn any mean and scale it needs, including undoing the normalisation entirely if that is optimal. The right framing is that the layer supplies a well-conditioned starting point rather than imposing a fixed distribution, and the learned parameters are what keep it a reparameterisation rather than a restriction.',
      isCaseBased: false,
    },
    {
      question: 'Why does BatchNorm act as a regulariser?',
      answer:
        'Because the batch statistics are estimates from a small sample, so they are noisy, and that noise differs from batch to batch. Each example is therefore normalised slightly differently depending on its company, which is a form of stochastic perturbation very similar in spirit to dropout. That is why models using BatchNorm often need less dropout, and why the two together can over-regularise. It is also why the regularisation disappears at inference, when the frozen running statistics remove all the noise — one of several reasons the training-time and test-time behaviours differ more than people expect.',
      isCaseBased: false,
    },
    {
      question: 'You must train with batch size 2 because of memory. What do you do about normalisation?',
      answer:
        'Not BatchNorm — with two examples the batch statistics are essentially noise, and at batch size 1 the variance is exactly zero, so the layer stops doing anything meaningful. GroupNorm is the standard answer here and is precisely why it was introduced: it splits channels into groups and normalises within each, so it is completely batch-independent and performs comparably to BatchNorm at normal batch sizes while degrading not at all at small ones. That is why detection and segmentation models, which are memory-bound, commonly use it. The alternatives are LayerNorm, or gradient accumulation to raise the effective batch — but accumulation does not help BatchNorm, since its statistics are still computed on the small physical batch.',
      isCaseBased: true,
    },
    {
      question: 'What is RMSNorm and why has it caught on?',
      answer:
        'It is LayerNorm with the mean subtraction removed: divide by the root mean square of the activations and rescale by a learned gain, with no β. The empirical finding is that the re-centring contributes little and the re-scaling does the work, so dropping the mean costs essentially nothing in quality while removing one pass over the data and one set of parameters. At the scale modern language models train at, a few percent of the normalisation cost repeated across every layer and every token is worth having, which is why LLaMA and most recent LLMs use it.',
      isCaseBased: false,
    },
    {
      question: 'Pre-norm or post-norm in a transformer?',
      answer:
        'Pre-norm for anything deep. The original transformer put the normalisation after the residual addition, which means the residual stream itself is normalised at every block and the identity path is interrupted — that made deep stacks hard to train and forced a carefully tuned warmup schedule. Pre-norm moves the normalisation inside the residual branch, so the skip connection carries an unmodified signal all the way from input to output and gradients have a clean path. The trade is that the residual stream\'s magnitude grows with depth, which is why a final normalisation before the output head is standard, and why residual-branch output scaling appears in initialisation schemes.',
      isCaseBased: false,
    },
    {
      question: 'Someone tells you BatchNorm works by reducing internal covariate shift. Do you agree?',
      answer:
        'That was the original explanation and it has largely not held up. The Santurkar et al. work injected noise after BatchNorm to deliberately reintroduce distribution shift and found training still improved, which is difficult to reconcile with covariate shift being the mechanism. The better-supported account is that it smooths the loss landscape — making gradients more predictable and allowing larger learning rates — plus the regularising effect of batch noise and a decoupling of weight magnitude from direction. I would give the honest version: it works reliably and there is still no fully settled explanation of why, which is worth saying rather than repeating an account the evidence has moved past.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'What a norm layer does', back: 'Subtract a mean, divide by a std, rescale by learned γ and β. Only the averaging AXIS distinguishes the variants.' },
    { front: 'BatchNorm axis', back: 'Down the batch — one statistic per FEATURE. An example\'s output depends on its batch-mates.' },
    { front: 'LayerNorm axis', back: 'Across the features — one statistic per EXAMPLE. Completely batch-independent.' },
    { front: 'The outlier demo', back: 'A 90 in one cell dragged BatchNorm\'s column to −0.744 / −0.6696 / 1.4136 for all three rows. LayerNorm left the other rows at a clean [−1.2247, 0, 1.2247].' },
    { front: 'Why γ and β', back: 'Without them, mean 0 and variance 1 is a hard constraint. They let the network undo the normalisation — a starting point, not an imposition.' },
    { front: 'BatchNorm at batch size 1', back: 'Std per column is exactly 0. Only ε prevents a divide-by-zero, and the output is meaningless. Use GroupNorm or LayerNorm instead.' },
    { front: 'Train vs eval', back: 'BatchNorm uses batch stats in training and frozen RUNNING AVERAGES at test. Forgetting model.eval() gives silently bad validation. It is unrelated to torch.no_grad().' },
    { front: 'The four variants', back: 'BatchNorm (CNNs, decent batch), LayerNorm (transformers), GroupNorm (small-batch detection/segmentation), RMSNorm (no mean subtraction, recent LLMs).' },
  ],
  mindmapMarkdown: `- BatchNorm vs LayerNorm
  - One operation
    - subtract mean, divide by std, rescale by gamma/beta
    - gamma/beta let the network UNDO it
    - only the averaging axis differs
  - BatchNorm
    - down the batch, one stat per FEATURE
    - couples examples in a batch
    - regularises via batch noise
    - breaks at small batch (std = 0 at batch 1)
    - needs running averages at test time
    - model.eval() bug: silent, bad validation
  - LayerNorm
    - across features, one stat per EXAMPLE
    - batch-independent
    - identical result inside or outside a batch
    - transformers: varying lengths, small batches, token-by-token generation
  - The outlier demo
    - a 90 dragged BN's whole column
    - LN left the other rows untouched
  - Variants
    - GroupNorm: small-batch detection/segmentation
    - RMSNorm: no mean subtraction, recent LLMs
    - pre-norm beats post-norm for deep stacks`,
}

export default m
