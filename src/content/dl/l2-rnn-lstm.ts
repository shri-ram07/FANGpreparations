import type { Module } from '../types'

const m: Module = {
  id: 'dl-l2-rnn-lstm',
  subjectId: 'dl',
  level: 2,
  title: 'RNNs, LSTMs and the Road to Attention',
  whyItMatters:
    'The RNN is the clearest example in deep learning of an architecture whose central weakness is arithmetic. Understanding exactly why a plain RNN forgets after twenty steps is understanding why LSTMs exist and why transformers replaced both.',
  assumes: [
    'You have read *Backpropagation*, so you know gradients are a product of per-step terms',
    'You know what a hidden layer is',
  ],
  estMinutes: 22,
  sections: [
    {
      type: 'intuition',
      title: 'One layer, applied over and over',
      md: `A CNN needs a fixed input size. A sentence does not have one.

An **RNN** handles that by processing one item at a time and carrying a **hidden state** forward: at every step it combines the new input with what it already knows, and the result becomes what it knows next. The same weight matrix is used at every step, so any sequence length works.

That reuse is the strength and the entire problem. Training unrolls the loop into as many layers as there are timesteps — **backpropagation through time** — and those layers all share one weight matrix, so the gradient is a product of the *same* factor repeated.`,
    },
    {
      type: 'math',
      intro:
        'The RNN step and the gradient across k timesteps. W_hh is the recurrent matrix, reused at every step, which is why its influence appears raised to a power rather than as a product of different terms.',
      latex: [
        'h_t = \\tanh(W_{hh} h_{t-1} + W_{xh} x_t + b)',
        '\\frac{\\partial h_t}{\\partial h_{t-k}} = \\prod_{i=1}^{k} W_{hh}^{T}\\,\\mathrm{diag}\\bigl(\\tanh\'(\\cdot)\\bigr) \\;\\approx\\; \\lambda^{k}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'How far back a gradient reaches',
      code: `for w in [0.5, 0.9, 1.0, 1.1]:
    row = '  '.join('t=%-3d %.4g' % (t, w**t) for t in [5, 10, 20, 50])
    print('|w| = %.1f   %s' % (w, row))

# ---- real output ----
# |w| = 0.5   t=5   0.03125  t=10  0.0009766  t=20  9.537e-07  t=50  8.882e-16
# |w| = 0.9   t=5   0.5905  t=10  0.3487  t=20  0.1216  t=50  0.005154
# |w| = 1.0   t=5   1  t=10  1  t=20  1  t=50  1
# |w| = 1.1   t=5   1.611  t=10  2.594  t=20  6.727  t=50  117.4`,
      annotations: {
        1: 'w stands in for the effective per-step factor — the recurrent weight scaled by the tanh derivative, which is at most 1 and usually well under it.',
        7: '|w| = 0.5 leaves 9.537e-07 after twenty steps, and even a favourable 0.9 is down to 0.005154 at fifty. There is no value below 1 that survives a long sequence, so a word twenty tokens back simply cannot influence the prediction.',
        10: 'Exactly 1.0 is the only stable point and nothing holds a learned matrix there — one step above it, 1.1 reaches 117.4 at fifty steps and keeps growing. The two failures sit either side of a knife edge, which is why RNNs essentially always need gradient clipping.',
      },
    },
    {
      type: 'intuition',
      title: 'The LSTM answer: stop multiplying',
      md: `An **LSTM** adds a second state alongside the hidden one — the **cell state** — and changes how it is updated. Instead of being transformed by a weight matrix each step, the cell state is **added to**:

\`c_t = f · c_{t-1} + i · g\`

The forget gate **f** is a number between 0 and 1 per dimension, learned from the current input. When f is near 1, the old value passes through nearly untouched — a path along which information travels by addition rather than repeated multiplication.

Three gates control it: **forget** decides what to discard, **input** what to write, **output** what of the cell to expose as the hidden state. A GRU merges forget and input into one gate and drops the separate cell state, giving 3 gates' worth of parameters instead of 4 at broadly similar quality.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'What the forget gate buys, and what it costs',
      code: `for f in [0.5, 0.9, 0.99, 1.0]:
    row = '  '.join('t=%-4d %.4g' % (t, f**t) for t in [10, 50, 100])
    print('forget gate f = %.2f   %s' % (f, row))

for x, h in [(100, 128), (300, 512)]:
    base = h*(x + h) + h
    print('x=%d h=%d:  RNN %-10s LSTM %-12s GRU %s'
          % (x, h, f'{base:,}', f'{4*base:,}', f'{3*base:,}'))

# ---- real output ----
# forget gate f = 0.50   t=10   0.0009766  t=50   8.882e-16  t=100  7.889e-31
# forget gate f = 0.90   t=10   0.3487  t=50   0.005154  t=100  2.656e-05
# forget gate f = 0.99   t=10   0.9044  t=50   0.605  t=100  0.366
# forget gate f = 1.00   t=10   1  t=50   1  t=100  1
# x=100 h=128:  RNN 29,312     LSTM 117,248      GRU 87,936
# x=300 h=512:  RNN 416,256    LSTM 1,665,024    GRU 1,248,768`,
      annotations: {
        8: 'Each gate is its own weight matrix over the concatenated input and hidden state, so an LSTM is exactly 4x a plain RNN and a GRU 3x.',
        14: 'f = 0.99 keeps 0.366 after 100 steps, and the LSTM can LEARN to sit near there for the dimensions that matter — which a plain RNN cannot do at all. Forget-gate biases are commonly initialised positive to start at this end.',
        12: 'And the honest limit: at f = 0.9 the cell is down to 2.656e-05 at 100 steps. The gate mitigates the decay, it does not remove it — LSTMs reach hundreds of steps, not thousands.',
      },
    },
    {
      type: 'note',
      label: 'The limitation neither architecture fixes',
      md: `Both are **sequential**. Step t cannot be computed until step t−1 is finished, so training on a 1,000-token sequence is 1,000 dependent operations no matter how many GPUs you own.

That is not a gradient problem and no gate fixes it. It is the reason transformers won: self-attention computes every position's representation **in parallel**, and every position can attend to every other one directly, so the path between two tokens is length 1 instead of length k.

The trade is cost. Attention is O(n²) in sequence length where an RNN is O(n) — which is why RNN-descended state-space models like Mamba are being revisited for very long sequences, where the quadratic term is what hurts.`,
    },
    {
      type: 'note',
      label: 'What still uses them, and the practical details',
      md: `**Bidirectional** RNNs run a second pass backwards and concatenate, so each position sees both sides. Available for classification and tagging, impossible for generation, where the future does not exist yet.

**Teacher forcing** feeds the true previous token during training rather than the model's own prediction. It trains far faster and creates **exposure bias**: at inference the model consumes its own outputs, including its mistakes, which it never practised recovering from.

They are not obsolete. RNNs are still competitive where sequences are long and models must be small — on-device keyword spotting, low-latency streaming, some time-series forecasting — because inference is O(1) memory per step rather than growing with context. But for anything language-shaped, the answer is a transformer.`,
    },
  ],
  quiz: [
    {
      question: 'Why is an RNN\'s vanishing-gradient problem worse than a deep feedforward network\'s?',
      options: [
        { text: 'RNNs are deeper', explanation: 'Depth alone is not the distinction.' },
        { text: 'The same weight matrix is applied at every step, so the gradient is one factor raised to a power rather than a product of different terms', explanation: 'Correct — there is no chance of some layers compensating for others.' },
        { text: 'RNNs use tanh', explanation: 'The activation contributes, but the shared matrix is the structural difference.' },
        { text: 'RNNs have more parameters', explanation: 'They have far fewer — the weights are reused.' },
      ],
      correct: 1,
    },
    {
      question: 'With an effective factor of 0.5, a gradient reaching back 20 steps is 9.5e-07. What does that mean for language?',
      options: [
        { text: 'Training is slow but works', explanation: 'The contribution is numerically zero — it does not work.' },
        { text: 'A word twenty tokens back cannot influence the current prediction at all', explanation: 'Correct, which is fatal for anything with long-range agreement or reference.' },
        { text: 'The learning rate should be raised', explanation: 'It scales all gradients equally and does not restore the lost ones.' },
        { text: 'It only affects the first layer', explanation: 'There is one layer, applied repeatedly.' },
      ],
      correct: 1,
    },
    {
      question: 'Why do RNNs almost always need gradient clipping?',
      options: [
        { text: 'Because tanh saturates', explanation: 'Saturation causes vanishing, not exploding.' },
        { text: 'A factor of 1.1 reaches 117 at fifty steps — the two failures sit either side of exactly 1.0, and nothing holds training there', explanation: 'Correct. Exploding is the loud failure and clipping is the blunt fix.' },
        { text: 'Because of the forget gate', explanation: 'Plain RNNs have no forget gate and need clipping most.' },
        { text: 'Because sequences vary in length', explanation: 'Length affects how many steps compound, not the mechanism.' },
      ],
      correct: 1,
    },
    {
      question: 'How does the LSTM cell state avoid the compounding problem?',
      options: [
        { text: 'It uses ReLU instead of tanh', explanation: 'LSTMs use tanh and sigmoid.' },
        { text: 'c_t = f·c_{t−1} + i·g — an additive path, and when f is near 1 the old value passes through nearly untouched', explanation: 'Correct. Information travels by addition rather than repeated matrix multiplication.' },
        { text: 'It resets the state periodically', explanation: 'It does not reset.' },
        { text: 'It normalises the state each step', explanation: 'That is a different technique.' },
      ],
      correct: 1,
    },
    {
      question: 'At f = 0.9 the LSTM cell retains 2.7e-05 after 100 steps. What is the honest reading?',
      options: [
        { text: 'LSTMs do not work', explanation: 'They work well, and were the state of the art for years.' },
        { text: 'The gate mitigates the decay rather than removing it — LSTMs reach hundreds of steps, not thousands', explanation: 'Correct, and the improvement is that the model can LEARN f near 1 where it matters, which an RNN cannot.' },
        { text: 'f should always be 1.0', explanation: 'Then nothing could ever be forgotten, which is also wrong.' },
        { text: 'The forget gate is unnecessary', explanation: 'It is what makes the retention learnable at all.' },
      ],
      correct: 1,
    },
    {
      question: 'What limitation do LSTMs share with plain RNNs?',
      options: [
        { text: 'Vanishing gradients, unchanged', explanation: 'The forget gate genuinely mitigates this.' },
        { text: 'Sequentiality — step t needs step t−1, so a 1,000-token sequence is 1,000 dependent operations regardless of hardware', explanation: 'Correct, and it is the reason transformers won rather than a gradient argument.' },
        { text: 'Fixed input length', explanation: 'Both handle variable length; that is their advantage over a CNN.' },
        { text: 'Inability to be bidirectional', explanation: 'Both can be run bidirectionally for non-generative tasks.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why do RNNs struggle with long sequences?',
      answer:
        'Because the same weight matrix is applied at every timestep, so the gradient across k steps is essentially one factor raised to the power k rather than a product of different terms — there is no chance of some layers compensating for others. With an effective factor of 0.5, the gradient reaching twenty steps back is 9.5e-07, meaning a word twenty tokens earlier cannot influence the prediction at all. Above 1 the same arithmetic explodes: 1.1 reaches 117 by fifty steps. Exactly 1.0 is the only stable value and nothing keeps a learned matrix there, which is why RNNs essentially always need gradient clipping.',
      isCaseBased: false,
    },
    {
      question: 'How does an LSTM fix that, and how well?',
      answer:
        'It adds a cell state that is updated additively rather than by matrix multiplication: c_t = f·c_{t−1} + i·g, where the forget gate f is a learned value between 0 and 1 per dimension. When f is near 1, information travels along that path by addition and survives — the gradient has a route that does not compound through a weight matrix. How well is worth being honest about: at f = 0.99 the cell retains 0.366 after 100 steps, but at f = 0.9 it is down to 2.7e-05. The gate mitigates the decay rather than removing it. The real gain is that the model can learn to hold f near 1 for the dimensions that matter, which a plain RNN cannot do at all.',
      isCaseBased: true,
    },
    {
      question: 'LSTM or GRU?',
      answer:
        'GRU by default, and switch if the data suggests otherwise. A GRU merges the forget and input gates into one update gate and drops the separate cell state, so it has three gate matrices instead of four — at hidden size 512 with 300-dimensional inputs, 1.25M parameters against 1.67M. In most published comparisons the quality difference is within noise, and the GRU trains faster with fewer parameters to overfit. LSTMs sometimes edge ahead on very long sequences, where the separate cell state and independent forget and input control appear to help. Given how close they are, I would let the compute budget decide and spend the tuning effort elsewhere.',
      isCaseBased: false,
    },
    {
      question: 'Why did transformers replace RNNs?',
      answer:
        'Parallelism, primarily — not the gradient argument people expect. An RNN\'s step t cannot be computed until step t−1 is finished, so a 1,000-token sequence is 1,000 dependent operations however many GPUs you have, and no gate fixes that. Self-attention computes every position at once, so training parallelises across the sequence dimension. The secondary gain is path length: any two tokens are directly connected in one attention operation, so there is nothing to decay over distance, where an RNN\'s path is length k. The cost is O(n²) attention against O(n) recurrence, which is exactly why long-sequence state-space models like Mamba are being revisited.',
      isCaseBased: false,
    },
    {
      question: 'What is teacher forcing and what does it cost you?',
      answer:
        'During training the model is fed the true previous token rather than its own prediction, which makes training fast and parallel over the sequence and keeps it from compounding early errors while it is still bad. The cost is exposure bias: at inference the model consumes its own outputs including its mistakes, and it has never practised recovering from a state it caused itself. The symptom is degradation that accelerates over a long generation. Scheduled sampling — mixing in the model\'s own predictions with increasing probability — was the classical mitigation, and it helps unevenly. In practice large-scale pretraining reduced how much this matters, which is a slightly unsatisfying but accurate answer.',
      isCaseBased: true,
    },
    {
      question: 'When would you still use an RNN today?',
      answer:
        'When sequences are long and the model must be small, because inference cost is the deciding factor. An RNN carries fixed-size state and is O(1) memory per step, while a transformer\'s KV cache grows with context — that is decisive for on-device keyword spotting, low-latency streaming audio, and embedded time series. Streaming is the other case: an RNN naturally processes one item as it arrives, where a transformer needs windowing or a growing cache. And for small datasets, the recurrence is a useful inductive bias that a transformer would have to learn. For anything language-shaped with adequate compute, the answer is a transformer.',
      isCaseBased: false,
    },
    {
      question: 'Explain backpropagation through time, and truncated BPTT.',
      answer:
        'Unroll the recurrence into one layer per timestep, then run ordinary backprop over that unrolled graph, summing the gradient contributions to the shared weights from every step. The problems are that memory grows linearly with sequence length — every step\'s activations must be kept — and that the gradient compounds one factor per step. Truncated BPTT limits the backward pass to the last k steps while continuing the forward pass and carrying the hidden state across, which bounds memory and compute at the cost of making dependencies longer than k invisible to the gradient. Choosing k is the trade, and it is a hard ceiling on what the model can learn to depend on.',
      isCaseBased: true,
    },
    {
      question: 'What is a bidirectional RNN and when can you use one?',
      answer:
        'Two RNNs over the same sequence, one forward and one backward, with their hidden states concatenated so every position sees context on both sides. That is a real gain wherever the whole input exists before you produce output — named entity recognition, part-of-speech tagging, sequence classification, and it was central to ELMo. It is impossible for autoregressive generation, since the future tokens do not exist yet. It is also unusable in a streaming setting for the same reason. The analogous distinction in transformers is BERT\'s bidirectional masking against GPT\'s causal masking, which is the same trade in a different architecture.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'What an RNN is', back: 'One layer applied at every step, carrying a hidden state. The SAME weight matrix each time — which is the strength and the whole problem.' },
    { front: 'Why the gradient dies', back: 'It is one factor raised to a power, not a product of different terms. |w|=0.5 leaves 9.537e-07 at 20 steps.' },
    { front: 'The knife edge', back: '|w|=0.9 → 0.005 at 50 steps. |w|=1.1 → 117.4 at 50 steps. Only exactly 1.0 is stable, and nothing holds training there — hence clipping.' },
    { front: 'The LSTM cell state', back: 'c_t = f·c_{t−1} + i·g. ADDITIVE, so information travels without repeated matrix multiplication. Gates: forget, input, output.' },
    { front: 'How much the gate buys', back: 'f=0.99 keeps 0.366 at 100 steps; f=0.9 keeps 2.7e-05. It mitigates decay, it does not remove it — hundreds of steps, not thousands.' },
    { front: 'Parameter counts', back: 'LSTM = 4x a plain RNN, GRU = 3x. At x=300, h=512: 416,256 / 1,665,024 / 1,248,768.' },
    { front: 'What no gate fixes', back: 'Sequentiality. Step t needs step t−1, so 1,000 tokens is 1,000 dependent operations. THAT is why transformers won.' },
    { front: 'Teacher forcing', back: 'Feed the true previous token during training. Fast, and creates exposure bias — at inference the model eats its own mistakes and never practised recovering.' },
  ],
  mindmapMarkdown: `- RNNs and LSTMs
  - The RNN
    - one layer, applied at every step
    - hidden state carries what it knows
    - SAME weight matrix every step
    - BPTT unrolls it into one layer per timestep
  - Why it fails
    - gradient = one factor to the power k
    - |w|=0.5 -> 9.537e-07 at t=20
    - |w|=0.9 -> 0.005154 at t=50
    - |w|=1.1 -> 117.4 at t=50
    - only exactly 1.0 is stable -> always clip
  - LSTM
    - cell state c_t = f*c_{t-1} + i*g, ADDITIVE
    - gates: forget, input, output
    - f=0.99 keeps 0.366 at 100 steps
    - f=0.90 keeps 2.7e-05 - mitigates, not removes
    - 4x the parameters of an RNN; GRU is 3x
  - What no gate fixes
    - SEQUENTIALITY: step t needs step t-1
    - attention is parallel, path length 1
    - cost: O(n^2) vs O(n) -> Mamba revisits this
  - Practical
    - bidirectional: tagging yes, generation no
    - teacher forcing -> exposure bias
    - still used: on-device, streaming, small models`,
}

export default m
