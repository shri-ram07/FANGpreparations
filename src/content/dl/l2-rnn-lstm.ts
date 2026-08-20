import type { Module } from '../types'

const m: Module = {
  id: 'dl-l2-rnn-lstm',
  subjectId: 'dl',
  level: 2,
  title: 'RNNs, LSTMs & the Road to Attention',
  whyItMatters:
    'Nobody ships an LSTM in 2025 — and every serious interviewer still asks about one. Because the LSTM is where the field learned that a state you MULTIPLY dies and a state you ADD to survives, the same insight that gives you ResNet and the residual stream in GPT. This module is also the only honest way to understand why attention had to be invented: you have to feel the bottleneck first.',
  estMinutes: 60,
  sections: [
    {
      type: 'intuition',
      title: 'Why a plain MLP cannot read a sentence',
      md: `Feed "the food was great" to a dense layer. Now feed "the food at the new place near the station was, honestly, not great at all". Same task, and the MLP is already broken.

- **Variable length.** A dense layer has a fixed input size. 4 words and 15 words cannot enter the same *nn.Linear(n, h)*.
- **No parameter sharing.** Pad to 100 slots and the word "great" at position 3 hits totally different weights than "great" at position 30. The model must learn "great" 100 separate times.
- **No order, no memory.** Flatten the words and "dog bites man" and "man bites dog" are the same vector of features.
- The fix is not a bigger MLP. It is a different *shape* of computation: one small model, applied again and again along the sequence.`,
    },
    {
      type: 'intuition',
      title: 'The RNN: one brain, re-applied every step',
      md: `Think of a person reading a book with one sticky note. They read a word, update the note, move on. The note is everything they remember.

- One weight set, used at **every** timestep — that is the parameter sharing an MLP lacked.
- The sticky note is the **hidden state h_t**: a fixed-size vector carrying everything from words 1..t.
- The update: **h_t = tanh(W_x x_t + W_h h_(t−1) + b)**. Old state in, new word in, new state out.
- The state IS the memory. There is no other storage.
- Any length works, because the loop just runs longer. The parameter count never changes.
- Mental model: **unrolling**. Draw the same cell copied T times, left to right, state flowing along the arrows. That picture is not a metaphor — it is literally what the autograd graph looks like.`,
    },
    {
      type: 'math',
      intro: 'The whole vanilla RNN. Three matrices and a bias, reused T times.',
      latex: [
        'h_t = \\tanh\\!\\left( W_x x_t + W_h h_{t-1} + b \\right), \\qquad h_0 = \\mathbf{0}',
        'y_t = W_y h_t + b_y \\qquad \\text{(a prediction per step, or only at } t = T \\text{)}',
        '\\text{Same } W_x, W_h, b \\text{ for } t = 1 \\dots T. \\;\\; \\text{Sequence length changes; parameter count does not.}',
      ],
    },
    {
      type: 'intuition',
      title: 'BPTT: backprop, but the graph is the timeline',
      md: `Backpropagation Through Time is not a new algorithm. It is ordinary backprop on the unrolled graph.

1. Unroll the T steps into one deep feed-forward graph — depth T, with **tied** weights.
2. Forward: run t = 1..T, keep every h_t (you need them for the backward pass — this is why long sequences eat memory).
3. Backward: chain-rule from the loss back through step T, T−1, ... 1.
4. Because W_h is shared, its gradient is the **sum** of the gradients contributed at every step.

The dangerous part: the gradient that reaches step 1 has passed through **T multiplications by W_h**. That single fact decides the fate of the entire architecture.`,
    },
    {
      type: 'math',
      intro: 'The product that breaks everything. λ = largest |eigenvalue| of W_h.',
      latex: [
        '\\frac{\\partial L_T}{\\partial h_1} = \\frac{\\partial L_T}{\\partial h_T} \\prod_{t=2}^{T} \\frac{\\partial h_t}{\\partial h_{t-1}}, \\qquad \\frac{\\partial h_t}{\\partial h_{t-1}} = \\operatorname{diag}\\!\\left( \\tanh\'(\\cdot) \\right) W_h',
        '\\left\\| \\prod_{t=2}^{T} \\frac{\\partial h_t}{\\partial h_{t-1}} \\right\\| \\;\\sim\\; \\lambda^{\\,T-1}',
        '\\lambda < 1 \\Rightarrow \\text{gradient} \\to 0 \\;\\; (\\textbf{vanishing}) \\qquad \\lambda > 1 \\Rightarrow \\text{gradient} \\to \\infty \\;\\; (\\textbf{exploding})',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Watch a gradient die — the whole RNN problem in 10 lines',
      code: `import numpy as np

# In BPTT the gradient reaching step 1 is multiplied by W_h once per timestep.
# Over many steps only the largest |eigenvalue| of W_h decides the outcome.
g = np.ones(4)                        # gradient handed back by the loss
print("|eig|    T=10      T=30      T=100")
for s in (0.9, 1.0, 1.1):
    W = np.eye(4) * s                 # simplest W_h: every eigenvalue = s
    norms = [np.linalg.norm(np.linalg.matrix_power(W, T) @ g) for T in (10, 30, 100)]
    print(f"{s:<8} " + "  ".join(f"{n:.2e}" for n in norms))

# |eig|    T=10      T=30      T=100
# 0.9      6.97e-01  8.48e-02  5.31e-05
# 1.0      2.00e+00  2.00e+00  2.00e+00
# 1.1      5.19e+00  3.49e+01  2.76e+04`,
      annotations: {
        8: 'A scaled identity so the eigenvalues are exactly s — no linear algebra needed to see the effect.',
        9: 'matrix_power(W, T) IS the BPTT product: one W_h per timestep between the loss and step 1.',
        13: '0.9 per step: after 100 steps the signal is 5e-05. Word 1 gets essentially no learning signal from word 100.',
        15: '1.1 per step: 2.76e+04 and climbing. This is the NaN that shows up 300 steps into training.',
      },
    },
    {
      type: 'note',
      md: 'The two failures are not equally hard. **Exploding is easy**: clip the gradient norm to a threshold (*torch.nn.utils.clip_grad_norm_*), keep the direction, shrink the length — done, one line, everybody does it. **Vanishing is fundamental**: there is nothing to clip, the signal is simply gone, and no learning rate recovers information that decayed to 1e-05. Tuning λ toward exactly 1 is a knife edge that forward activations do not survive. So the fix has to be architectural — a path where the state is not multiplied by a matrix every step.',
    },
    {
      type: 'intuition',
      title: 'LSTM: add a conveyor belt next to the brain',
      md: `The LSTM keeps the RNN's hidden state and adds a second, separate line of memory: the **cell state c_t**.

- Picture a conveyor belt running straight down the whole sequence. Facts sit on it and ride.
- The belt is touched only by **elementwise multiply and add** — no weight matrix, no tanh, on the belt itself.
- So the derivative along the belt is *f_t*, not *W_h*. If the network learns f ≈ 1, the gradient walks back hundreds of steps untouched.
- That is the same trick as a **residual connection** in ResNet (x + F(x)): give the signal an additive highway past the transformation. Cross-ref that module — the LSTM got there first, in 1997.
- The hidden state h_t is now just a **filtered view** of the belt, not the belt itself.`,
    },
    {
      type: 'intuition',
      title: 'Three gates, three questions',
      md: `A gate is a vector of numbers in 0..1 produced by a sigmoid, multiplied elementwise into something. Think **soft valve**, one per slot of the state: 0 = closed, 1 = fully open, 0.7 = mostly open.

- **Forget gate f_t** — what to drop from the belt. *c := f · c*. f = 0 on a slot erases it; f = 1 keeps it exactly.
- **Input gate i_t** — how much of the new content to write. Its partner, the **candidate g_t** (a tanh, so −1..1), is *what* to write.
- **Output gate o_t** — how much of the belt to expose as h_t this step. Storage and exposure are decoupled.
- Every gate reads the same two things: the previous hidden state and the current input. They are learned, not hand-designed.
- Bias tip that interviewers like: initialize the forget-gate bias to +1 so f starts near 1 and the belt remembers **by default**.`,
    },
    {
      type: 'hinglish',
      md: `Gates ko ek chowkidar samajh: har timestep pe teen sawaal poochta hai. **Forget gate** — *"purani baat me se kya bhoolna hai?"* (0 matlab poora mita do, 1 matlab jaisa hai waisa rehne do). **Input gate** — *"is naye word me se kitna likhna hai?"* **Output gate** — *"abhi bahar kitna bolna hai?"* Sabse bada point yehi hai: **yaad rakhna aur bolna alag-alag cheezein hain**. Belt pe "subject = billi" pada reh sakta hai bees words tak, bina ek baar bhi bahar aaye — aur jis din verb aayega, output gate darwaza khol dega.`,
    },
    {
      type: 'math',
      intro: 'The four gate computations, then the two state updates. σ = sigmoid (0..1 valve), ⊙ = elementwise product.',
      latex: [
        'f_t = \\sigma(W_f h_{t-1} + U_f x_t + b_f) \\qquad i_t = \\sigma(W_i h_{t-1} + U_i x_t + b_i)',
        '\\tilde{c}_t = \\tanh(W_c h_{t-1} + U_c x_t + b_c) \\qquad o_t = \\sigma(W_o h_{t-1} + U_o x_t + b_o)',
        'c_t = f_t \\odot c_{t-1} \\;+\\; i_t \\odot \\tilde{c}_t \\qquad h_t = o_t \\odot \\tanh(c_t)',
        '\\frac{\\partial c_t}{\\partial c_{t-1}} = f_t \\;\\; \\Rightarrow \\;\\; \\text{the belt gradient is } \\textstyle\\prod_t f_t \\text{, not } W_h^{T}. \\;\\; f \\approx 1 \\Rightarrow \\text{memory survives.}',
      ],
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'The cell state as a conveyor belt',
        notice: 'Left: what this timestep computes. Right: the cell state c, one box per slot. Watch that the belt is only ever SCALED and ADDED to — never rebuilt from scratch.',
        leftLabel: 'this timestep',
        rightLabel: 'cell state c',
        frames: [
          {
            note: 'Reading "the cat that chased the dog was tired". Step t begins: the cell state rolls in from t-1 completely untouched. No matrix multiply on this path — it is a belt, not a layer.',
            stack: [
              { name: 'x_t', value: '"dog"' },
              { name: 'h_prev', value: 'last view' },
            ],
            heap: [
              { id: 'c0', value: 'subject: cat', label: 'carried' },
              { id: 'c1', value: 'verb: chased', label: 'carried' },
              { id: 'c2', value: 'topic: animals', label: 'carried' },
            ],
          },
          {
            note: 'Forget gate: f = [1.0, 0.0, 0.9]. Slot 0 survives untouched, slot 1 is erased (the verb context is stale), slot 2 fades slightly. c := f * c is a MULTIPLY, so "keep" costs nothing.',
            stack: [
              { name: 'f', value: '[1.0, 0.0, 0.9]' },
              { name: 'f * c_prev', to: 'c1', danger: true },
            ],
            heap: [
              { id: 'c0', value: 'subject: cat', label: 'kept x1.0' },
              { id: 'c1', value: 'verb: chased', freed: true },
              { id: 'c2', value: 'topic: animals', label: 'kept x0.9' },
            ],
          },
          {
            note: 'Input gate i says how much to write, candidate g says what. c := f*c + i*g — the new fact is ADDED onto the belt, not blended over the whole state. Slot 0 was not part of this write at all.',
            stack: [
              { name: 'i', value: '[0.1, 0.9, 0.2]' },
              { name: 'g', value: 'object = dog' },
              { name: 'i * g', to: 'c1' },
            ],
            heap: [
              { id: 'c0', value: 'subject: cat', label: 'untouched' },
              { id: 'c1', value: 'object: dog', label: 'written' },
              { id: 'c2', value: 'topic: animals', label: 'untouched' },
            ],
          },
          {
            note: 'Output gate filters what leaves: h_t = o * tanh(c_t). The subject stays in storage while this step only exposes the object. Remembering and speaking are separate decisions — that is the whole point of o.',
            stack: [
              { name: 'o', value: '[0.2, 0.9, 0.3]' },
              { name: 'h_t', value: 'o * tanh(c_t)', to: 'c1' },
            ],
            heap: [
              { id: 'c0', value: 'subject: cat', label: 'held, hidden' },
              { id: 'c1', value: 'object: dog', label: 'exposed' },
              { id: 'c2', value: 'topic: animals', label: 'held, hidden' },
            ],
          },
          {
            note: 'Contrast — a vanilla RNN at the same step. There is no belt. h_t = tanh(W h + U x) REPLACES the entire state every step, so an old fact survives only if it keeps being re-encoded through a matrix multiply.',
            stack: [{ name: 'h_t', value: 'tanh(Wh + Ux)', to: 'hnew' }],
            heap: [
              { id: 'hold', value: 'subject: cat', freed: true },
              { id: 'hnew', value: 'blur of last ~7', label: 'overwritten' },
            ],
          },
          {
            note: 'Backward it is worse. The gradient reaching step 1 carries one W_h per step; at |eigenvalue| 0.9 it is gone by step 100 — these are the real numbers from the snippet above. The LSTM belt multiplies by f instead, and f can learn to be 1.',
            stack: [{ name: 'grad reaching h_1' }],
            heap: [
              { id: 't10', value: 'T=10   6.97e-01', label: 'alive' },
              { id: 't30', value: 'T=30   8.48e-02', label: 'fading' },
              { id: 't100', value: 'T=100  5.31e-05', freed: true },
            ],
          },
        ],
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'One LSTM timestep by hand — all four gates, real numbers',
      code: `import numpy as np

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

np.random.seed(0)
n_h, n_x = 3, 2                        # hidden size, input size

x_t    = np.array([1.0, -0.5])         # this timestep's input
h_prev = np.array([0.1, -0.2, 0.3])    # last hidden state (the exposed view)
c_prev = np.array([0.5,  0.0, -0.4])   # last cell state (the conveyor belt)

def block():                           # one gate's parameter set
    return (np.random.randn(n_h, n_h) * 0.5,   # W: reads h_prev
            np.random.randn(n_h, n_x) * 0.5,   # U: reads x_t
            np.zeros(n_h))                     # b

Wf, Uf, bf = block()   # forget gate
Wi, Ui, bi = block()   # input gate
Wg, Ug, bg = block()   # candidate content
Wo, Uo, bo = block()   # output gate

f = sigmoid(Wf @ h_prev + Uf @ x_t + bf)   # keep how much of c_prev?
i = sigmoid(Wi @ h_prev + Ui @ x_t + bi)   # write how much of g?
g = np.tanh(Wg @ h_prev + Ug @ x_t + bg)   # what to write (-1..1)
o = sigmoid(Wo @ h_prev + Uo @ x_t + bo)   # expose how much of c_t?

c_t = f * c_prev + i * g                   # scale the belt, then ADD
h_t = o * np.tanh(c_t)                     # filtered view of the belt

print("f (forget)", f.round(3))
print("i (input) ", i.round(3))
print("g (cand.) ", g.round(3))
print("o (output)", o.round(3))
print("c_prev    ", c_prev.round(3))
print("c_t       ", c_t.round(3))
print("h_t       ", h_t.round(3))
print("kept:", (f * c_prev).round(3), " added:", (i * g).round(3))

# f (forget) [0.59  0.578 0.499]
# i (input)  [0.792 0.447 0.558]
# g (cand.)  [-0.052 -0.313  0.756]
# o (output) [0.525 0.441 0.417]
# c_prev     [ 0.5  0.  -0.4]
# c_t        [ 0.254 -0.14   0.222]
# h_t        [ 0.13  -0.061  0.091]
# kept: [ 0.295  0.    -0.2  ]  added: [-0.041 -0.14   0.422]`,
      annotations: {
        13: 'Four identical parameter blocks — an LSTM is literally 4x a vanilla RNN cell. That is the parameter cost of gating.',
        23: 'Sigmoid, so every entry lands in 0..1: a soft valve per slot, not an on/off switch. Untrained here, so all three sit near 0.5.',
        25: 'The only tanh among the four: the candidate is CONTENT (-1..1), not a valve. Mixing this up is a classic interview slip.',
        28: 'THE line of the architecture. Scale the old belt, add the new write. No W_h on this path — hence no vanishing product.',
        29: 'h_t is a view, not the state. Note h_t (0.13) is much smaller than c_t (0.254): the output gate is holding most of it back.',
        40: 'Untrained gates sit near 0.5, so half of c_prev survives by accident. Trained forget gates on long-range slots learn to sit at 0.98+ — that is memory being learned.',
        45: 'Check slot 0 by hand: 0.590 x 0.5 (kept) + 0.792 x (-0.052) (written) = 0.254. That is c_t = f*c_prev + i*candidate, with real numbers.',
      },
    },
    {
      type: 'intuition',
      title: 'GRU, bidirectional, stacked — the honest versions',
      md: `**GRU** is the LSTM with the fat trimmed. Two gates instead of three, and no separate cell state.

- **Reset gate r** — how much of the past to use when proposing new content. **Update gate z** — one dial that does forget and input together: *h = (1−z)·h_old + z·h_new*.
- Merging c and h costs one memory line but keeps the additive path (that *(1−z)·h_old* term is the belt).
- ~25% fewer parameters, faster per step. **Accuracy is usually a wash** — pick by benchmark on your data, not by folklore. The honest sentence: *"GRU on small data or tight latency, LSTM when you have data to spare and want the extra capacity."*
- **Bidirectional**: run one RNN forward, one backward, concatenate the states — only legal when the whole sequence is available up front (tagging, classification), never for live generation.
- **Stacking**: layer 2's input is layer 1's h_t sequence. 2–4 layers is the practical ceiling; deeper mostly buys you a slower model.`,
    },
    {
      type: 'math',
      intro: 'GRU in three lines. One gate fewer, same additive idea.',
      latex: [
        'r_t = \\sigma(W_r h_{t-1} + U_r x_t) \\qquad z_t = \\sigma(W_z h_{t-1} + U_z x_t)',
        '\\tilde{h}_t = \\tanh\\!\\left( W (r_t \\odot h_{t-1}) + U x_t \\right)',
        'h_t = (1 - z_t) \\odot h_{t-1} + z_t \\odot \\tilde{h}_t \\qquad \\text{(the } (1-z) h_{t-1} \\text{ term is the additive highway)}',
      ],
    },
    {
      type: 'intuition',
      title: 'seq2seq — and the bottleneck you can feel',
      md: `Translation needs a different shape: input length ≠ output length. So use two RNNs.

1. **Encoder** reads the source sentence and stops. Its final hidden state is the **context vector**.
2. **Decoder** starts from that vector and generates the target, one token at a time, feeding each output back in.

- This works. It also has an obvious flaw the moment you say it out loud: **one fixed-size vector must hold an entire sentence**.
- 512 floats for "hi" — fine. 512 floats for a 60-word legal clause — the last words in overwrite the first.
- Measured behaviour: BLEU is fine up to ~15–20 tokens and then falls off a cliff as input length grows. The encoder is not weak; the *pipe* is too narrow.
- Diagnosis to remember: the model translates the end of long sentences well and the beginning badly. That asymmetry is the bottleneck's fingerprint.`,
    },
    {
      type: 'intuition',
      title: 'Attention teaser: stop compressing, start looking back',
      md: `The fix is almost rude in its simplicity: **do not throw the encoder states away**.

- Keep all T encoder hidden states h_1..h_T instead of only the last one.
- At each output step, the decoder scores every encoder state against its current state, softmaxes the scores into weights, and takes a weighted sum — a **fresh context vector per output word**.
- Producing "chat"? Weight lands on "cat". Producing "fatigué"? Weight moves to "tired". The alignment plots in the 2015 Bahdanau paper made this visible and the field changed direction.
- It fixed the length curve outright: translation quality stopped collapsing with input length.
- Then came the punchline. If attention is doing the heavy lifting, **why keep the RNN at all?** Delete the recurrence, keep only attention, add positional encodings — that is the transformer. Built from scratch in the GenAI subject.`,
    },
    {
      type: 'math',
      intro: 'Attention, in its original RNN form. Compare this to softmax(QKᵀ/√d)V later — same shape, no recurrence.',
      latex: [
        'e_{ij} = \\text{score}(s_{i-1}, h_j) \\qquad \\alpha_{ij} = \\frac{\\exp(e_{ij})}{\\sum_{k=1}^{T_x} \\exp(e_{ik})}',
        'c_i = \\sum_{j=1}^{T_x} \\alpha_{ij} \\, h_j \\qquad \\text{one context vector per OUTPUT step } i \\text{, not one per sentence}',
      ],
    },
    {
      type: 'intuition',
      title: 'Why RNNs actually lost (it was not accuracy)',
      md: `LSTMs did not get beaten on quality first. They got beaten on **hardware economics**.

- h_t needs h_(t−1). A 1000-token sequence is 1000 strictly sequential steps, each a small matmul. No amount of GPU helps.
- A transformer computes all positions at once: two big matmuls, and the GPU runs at full occupancy. Same data, same day, vastly more of it processed.
- So RNNs could not ride the scaling curve. When compute got 100× cheaper, transformers got 100× better and LSTMs got maybe 3× better.
- The one-line interview answer: **"RNNs trade parallel width for sequential depth — and the hardware that got cheap was width."**
- Where recurrence still lives: streaming and on-device inference (constant memory per token, no growing KV cache), tiny sensor sequences, and — notably — modern state-space models like Mamba, which are recurrence redesigned to be parallelizable at train time. The idea was never wrong; the *implementation* did not fit the silicon.`,
    },
  ],
  quiz: [
    {
      question: 'Why can a plain MLP not handle "the food was great" and a 15-word review with the same weights?',
      options: [
        {
          text: 'Fixed input size, and no weight sharing across positions — "great" at slot 3 and slot 30 hit different weights',
          explanation:
            'Correct. Both problems are structural: nn.Linear needs a fixed n, and padding to a max length forces the model to relearn every word at every position.',
        },
        { text: 'MLPs cannot represent text at all', explanation: 'They can — embeddings are vectors. The failure is about variable length and position, not about text.' },
        { text: 'MLPs have no activation function suitable for words', explanation: 'Activation choice is irrelevant here; the same ReLU works fine in an RNN cell.' },
      ],
      correct: 0,
    },
    {
      question: 'In an RNN, where is the memory of everything read so far?',
      options: [
        { text: 'In the weight matrix W_h', explanation: 'W_h is shared and fixed during a forward pass — it is the RULE for updating memory, not the memory.' },
        { text: 'In a buffer of past inputs the cell keeps', explanation: 'There is no buffer. An RNN never re-reads an old token; that is exactly its limitation.' },
        {
          text: 'Entirely in the hidden state vector h_t',
          explanation: 'Correct. A single fixed-size vector is the whole memory — which is also why it saturates on long inputs.',
        },
      ],
      correct: 2,
    },
    {
      question: 'The gradient reaching timestep 1 in a 100-step RNN has been multiplied by W_h 99 times. If the largest |eigenvalue| of W_h is 0.9, what happens?',
      options: [
        { text: 'It explodes — clip it', explanation: 'Explosion needs |eigenvalue| > 1. At 0.9 the product shrinks every step.' },
        {
          text: 'It vanishes to ~1e-05 — step 1 gets essentially no learning signal',
          explanation: 'Correct, and the code confirmed it: 0.9^99 drives the norm to 5.31e-05. The early tokens simply stop being trained.',
        },
        { text: 'Nothing — tanh normalizes it', explanation: 'tanh makes it WORSE: its derivative is ≤ 1, so it multiplies in another shrinking factor.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is gradient clipping a real fix for exploding gradients but not for vanishing ones?',
      options: [
        { text: 'Clipping is too slow to run every step', explanation: 'It is one norm computation per step — negligible, and standard practice in every RNN codebase.' },
        {
          text: 'Clipping rescales a too-large vector while keeping its direction; a vanished gradient has no information left to rescale',
          explanation:
            'Correct. Explosion is a magnitude problem with intact direction. Vanishing destroys the signal itself — multiplying 1e-05 by 1000 amplifies numerical noise, not learning signal.',
        },
        { text: 'Vanishing gradients do not actually hurt training', explanation: 'They are precisely why vanilla RNNs cannot learn dependencies beyond ~10-20 steps.' },
      ],
      correct: 1,
    },
    {
      question: 'What is architecturally special about the LSTM cell state path c_(t−1) → c_t?',
      options: [
        { text: 'It uses a bigger weight matrix than the hidden state', explanation: 'It uses NO weight matrix — that is the entire point.' },
        { text: 'It is recomputed from scratch each step for freshness', explanation: 'That describes a vanilla RNN state, the thing the LSTM was built to avoid.' },
        {
          text: 'Only elementwise scaling and addition touch it, so ∂c_t/∂c_(t−1) = f_t instead of W_h',
          explanation:
            'Correct. An additive, matrix-free highway — the same idea as a ResNet skip connection. Gates near 1 let the gradient walk back hundreds of steps.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Which LSTM component is NOT a sigmoid gate?',
      options: [
        {
          text: 'The candidate c̃_t — it is a tanh, because it is content (−1..1), not a valve',
          explanation: 'Correct. f, i and o are sigmoids in 0..1 (how much); the candidate is tanh (what). Confusing these is a common interview slip.',
        },
        { text: 'The forget gate', explanation: 'Sigmoid — it must produce a 0..1 keep-fraction per slot.' },
        { text: 'The output gate', explanation: 'Sigmoid — it decides what fraction of tanh(c_t) is exposed as h_t.' },
      ],
      correct: 0,
    },
    {
      question: 'A seq2seq translator scores well on short sentences and degrades sharply as input length grows. The most likely cause?',
      options: [
        { text: 'The decoder is too small', explanation: 'A bigger decoder cannot recover information that never made it out of the encoder.' },
        { text: 'Learning rate is too high', explanation: 'That would hurt short and long inputs alike, not produce a length-dependent curve.' },
        {
          text: 'The fixed-size context vector bottleneck — one vector cannot hold a long sentence',
          explanation:
            'Correct, and the length-dependent shape of the failure is the giveaway. The fix that actually worked historically was attention, not a bigger encoder.',
        },
      ],
      correct: 2,
    },
    {
      question: 'What ultimately made transformers replace RNNs?',
      options: [
        {
          text: 'RNN timesteps are strictly sequential, so training cannot be parallelized across time — they could not ride the GPU scaling curve',
          explanation:
            'Correct. Gating had already patched long-range memory; nothing patches "step t needs step t−1". Attention turns the sequence into one parallel matmul, and cheap compute did the rest.',
        },
        { text: 'Transformers have fewer parameters', explanation: 'They generally have far more. Parameter count was never the argument.' },
        { text: 'RNNs could not represent long-range dependencies at all', explanation: 'LSTMs demonstrably could, to a few hundred steps. The blocker was throughput, not capability.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Whiteboard: write the vanilla RNN update and explain what makes it different from an MLP layer.',
      answer:
        'h_t = tanh(W_x x_t + W_h h_(t−1) + b), with y_t = W_y h_t optionally per step. Two differences to name: (1) the SAME W_x, W_h, b are applied at every timestep — parameter sharing, so a word means the same thing at position 3 and position 30, and the parameter count is independent of sequence length; (2) the extra term W_h h_(t−1) makes the layer a function of its own past output, which is what gives it memory and makes the computation graph a timeline rather than a stack. Then add the honest caveat unprompted: the unrolled graph is depth T with tied weights, which is exactly why it has a gradient problem.',
      isCaseBased: false,
    },
    {
      question: 'Derive why vanilla RNNs suffer vanishing gradients. Be precise about where the product comes from.',
      answer:
        '∂L_T/∂h_1 = ∂L_T/∂h_T · Π_{t=2..T} ∂h_t/∂h_(t−1), and each Jacobian factor is diag(tanh\'(·))·W_h. Two shrinking effects compound: tanh\' ≤ 1 everywhere (and is far below 1 whenever the unit is saturated), and the norm of the W_h product behaves like λ^(T−1) where λ is the largest |eigenvalue|. λ < 1 → the whole product decays geometrically → the early steps receive no gradient; λ > 1 → it blows up. Since W_h is shared, this same product appears in every term of its own gradient sum. The knife edge λ ≈ 1 is not a usable fix, because forward activations then explode or drift instead.',
      isCaseBased: false,
    },
    {
      question: 'Case: your LSTM language model trains for 4 hours, then loss jumps to NaN at step 30k. Walk your debugging order.',
      answer:
        'NaN after long stable training is almost always a gradient spike, not a code bug — the code already ran 30k steps. Order: (1) is clip_grad_norm_ on at all? Add it (norm 1.0–5.0) — it is the standard mitigation and costs nothing. (2) Log the pre-clip grad norm and find the batch that spiked; very often it is one pathological long sequence or a corrupted sample. (3) Check the loss for log(0) — an unclamped log-softmax or a division in a custom head. (4) Check for an exploding forward pass too: if cell states drift to ±1e4, tanh(c) saturates and gradients get weird — that points at a missing forget-gate bias init or too high an LR. (5) Only then reduce LR / switch to fp32 if you were on fp16 (a very common real cause: fp16 overflow in the attention or the loss). Tradeoff to name: clipping is a band-aid that hides the bad batch; log the norms so you actually find it.',
      isCaseBased: true,
    },
    {
      question: 'Explain the three LSTM gates to a smart non-specialist, then give the equations.',
      answer:
        'Story: the LSTM keeps a conveyor belt of facts running through the sentence. At each word it asks three yes/no-ish questions. Forget: what should I drop off the belt? Input: what from this word should I add? Output: what part of the belt should I say out loud right now? Each answer is a vector of 0..1 valves, one per slot, learned. Then the equations: f = σ(W_f h + U_f x + b_f), i = σ(...), c̃ = tanh(...), o = σ(...), c_t = f⊙c_(t−1) + i⊙c̃_t, h_t = o⊙tanh(c_t). Land the punchline: the belt is only scaled and added to, so ∂c_t/∂c_(t−1) = f_t rather than W_h — that additive path is why memory survives, and it is the same idea as a residual connection.',
      isCaseBased: false,
    },
    {
      question: 'Why does the LSTM separate the cell state from the hidden state? What breaks if you merge them?',
      answer:
        'They serve different jobs: c is storage, h is the exposed interface used by the output layer and by the gates at the next step. Separating them lets the model hold a fact for 30 steps without acting on it — the output gate can stay near 0 for a slot the whole time. Merge them and every stored fact is also broadcast, so storage decisions and prediction decisions fight over the same vector, and you lose the clean matrix-free gradient highway (h passes through tanh and the output gate). The GRU does merge them and compensates with the (1−z)h_(t−1) term to keep the additive path — it works, at slightly less capacity.',
      isCaseBased: false,
    },
    {
      question: 'LSTM vs GRU — how do you actually choose?',
      answer:
        'Parameters: LSTM has 4 gate blocks, GRU has 3 (r, z, candidate) — roughly 25% fewer parameters and a bit faster per step. Capacity: LSTM\'s separate cell state and independent output gate give more control; GRU\'s single update gate ties forgetting to writing (whatever it writes, it must forget in equal measure). Empirically the accuracy difference is usually inside the noise band; the 2014-2015 comparison papers were inconclusive on purpose. Practical rule: GRU when data is small, latency matters, or you are compute-bound; LSTM when data is plentiful and the extra capacity can be paid for. The interview-safe answer is "benchmark both, they are one hyperparameter apart" — anyone claiming a universal winner is repeating folklore.',
      isCaseBased: false,
    },
    {
      question: 'Case: your team uses a bidirectional LSTM for named-entity recognition, and it works great. Product now wants it to run on a live audio stream, tagging as words arrive. What happens?',
      answer:
        'It breaks, and not subtly. A biLSTM concatenates a forward pass with a BACKWARD pass over the full sequence — the backward half literally cannot start until the last token exists. Streaming has no last token. Options with their costs: (1) drop to a unidirectional LSTM — deployable immediately, expect a measurable F1 drop on entities whose evidence comes after them; (2) chunked/latency-controlled bidirectionality — buffer k future tokens and run the backward pass over the window; recovers most of the accuracy at the price of k tokens of latency, and this is usually the right answer; (3) retrain with a causal architecture from the start. Name the general principle: bidirectionality is only legal when the whole sequence is available up front — classification, tagging, offline transcription — never for generation or live inference.',
      isCaseBased: true,
    },
    {
      question: 'Explain the seq2seq bottleneck and how attention fixes it. Why was it such a big deal?',
      answer:
        'Vanilla seq2seq compresses the entire source sentence into the encoder\'s final hidden state and hands that one fixed-size vector to the decoder. Capacity is constant while input length grows, so quality degrades with length — BLEU falls off sharply past roughly 15-20 tokens, and characteristically the beginning of long sentences is translated worst. Attention keeps ALL encoder states: at each output step the decoder scores every h_j against its current state, softmaxes into weights α_ij, and builds a fresh context c_i = Σ α_ij h_j. So the pipe is per-output-word instead of per-sentence. It was a big deal for two reasons: it flattened the length-degradation curve, and the α matrix turned out to be a readable soft alignment — the first time a neural translator was interpretable. And it set up the real punchline: if attention carries the information, the recurrence is optional. Remove it and you have the transformer.',
      isCaseBased: false,
    },
    {
      question: 'Truncated BPTT — what is it, and what do you give up?',
      answer:
        'Full BPTT stores every hidden state for the whole sequence and backprops through all of it: memory is O(T·hidden) and the backward pass is serial over T. Truncated BPTT chops the sequence into chunks of k steps (say 35 for language modelling), backprops only within a chunk, and carries the hidden state forward to the next chunk WITHOUT gradient (detach). You give up gradient paths longer than k — the model can still USE context beyond k in its forward state, but it cannot receive learning signal for dependencies longer than k. In practice that is an acceptable trade because gradients beyond a few dozen steps are tiny anyway; the tell that k is too small is a model that never learns long-range agreement even though the state clearly carries it.',
      isCaseBased: false,
    },
    {
      question: 'How many parameters does an LSTM layer have, given input size n_x and hidden size n_h? What about a GRU?',
      answer:
        'Each gate block has W (n_h × n_h), U (n_h × n_x), b (n_h) → n_h(n_h + n_x + 1). LSTM has four such blocks (f, i, candidate, o) → 4·n_h·(n_h + n_x + 1). Concretely n_x = 300, n_h = 512: 4·512·(512+300+1) = 4·512·813 ≈ 1.665M per layer. GRU has three blocks → 3·n_h·(n_h + n_x + 1) ≈ 1.249M, i.e. 25% fewer. Two follow-ups they like: bidirectional doubles it (two independent parameter sets), and the count is independent of sequence length — the sequence only costs activation memory, not parameters. Frameworks may report a slightly larger number because cuDNN keeps separate input and recurrent biases.',
      isCaseBased: false,
    },
    {
      question: 'Case: you inherit an LSTM sentiment model. It nails short reviews but is near chance on long ones, and someone proposes doubling the hidden size. React.',
      answer:
        'Doubling hidden size is the expensive guess. Diagnose first. (1) Is it a length problem or a distribution problem? Bucket validation accuracy by input length — if it degrades monotonically with length, it is memory/bottleneck; if long reviews are also topically different, it is data. (2) Check what the model actually sees: truncation. Most pipelines silently cut at max_len — if long reviews are being clipped to 200 tokens, no architecture change helps. (3) Check where the label evidence lives: sentiment often sits in the last sentence, in which case last-hidden-state pooling is fine and the problem is elsewhere; if evidence is spread out, mean/max pooling over all h_t, or attention pooling, usually beats a bigger state for far less compute. (4) Forget-gate bias init to 1 is a free retrain-level fix for weak long-range retention. Only after those, consider capacity. Cheapest real fix in 2025: replace the classifier head with attention pooling, or fine-tune a small pretrained transformer and skip the argument entirely.',
      isCaseBased: true,
    },
    {
      question: 'RNNs "lost" to transformers — but recurrence is back in state-space models like Mamba. Reconcile that.',
      answer:
        'What lost was not recurrence as an idea; it was recurrence implemented as a step-by-step nonlinear update that cannot be parallelized across time. That property capped training throughput no matter how many GPUs you bought, so RNNs could not convert cheap compute into quality the way transformers could. State-space models keep a recurrent state but make the recurrence LINEAR and time-invariant enough to be computed with a parallel scan or a convolution at training time, then run it as a cheap O(1)-per-token recurrence at inference — parallel to train, recurrent to serve. That directly attacks the transformer\'s weak spot: O(n²) attention and a KV cache that grows with context. The lesson for interviews: architecture choices are often hardware-utilization choices wearing a math costume.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Three reasons an MLP cannot do sequences', back: 'Fixed input size (variable length breaks it), no parameter sharing across positions, no notion of order/memory.' },
    { front: 'The vanilla RNN update', back: 'h_t = tanh(W_x x_t + W_h h_(t−1) + b). Same weights every step; h_t is the ENTIRE memory.' },
    { front: 'BPTT in one line', back: 'Unroll T steps into a deep graph with tied weights, then ordinary backprop. W_h\'s gradient is the sum over all steps.' },
    { front: 'Why long-range memory fails', back: '∂L/∂h_1 contains Π ∂h_t/∂h_(t−1) ≈ λ^(T−1). λ<1 → vanish, λ>1 → explode. Repeated multiplication by the same matrix.' },
    { front: 'Exploding vs vanishing', back: 'Exploding: clip the gradient norm — one line, direction preserved. Vanishing: nothing to clip, signal is gone → needs gates (architecture).' },
    { front: 'The LSTM cell state', back: 'A conveyor belt touched only by elementwise multiply and add. ∂c_t/∂c_(t−1) = f_t, not W_h — an additive highway, same idea as a ResNet skip.' },
    { front: 'The three gates', back: 'Forget f: what to drop from c. Input i: how much new to write (candidate c̃ = tanh = WHAT). Output o: how much of c to expose as h_t.' },
    { front: 'LSTM equations', back: 'c_t = f⊙c_(t−1) + i⊙c̃_t ; h_t = o⊙tanh(c_t). f, i, o are sigmoids (0..1 valves); c̃ is a tanh (content).' },
    { front: 'GRU vs LSTM', back: 'GRU: reset + update gates, cell and hidden merged, ~25% fewer params, h = (1−z)h_old + z·h_new. Accuracy usually a wash — benchmark, do not believe folklore.' },
    { front: 'seq2seq bottleneck → attention', back: 'One fixed context vector cannot hold a long sentence (quality collapses with length). Attention keeps all encoder states and builds c_i = Σ α_ij h_j per output step. Drop the RNN, keep attention → transformer.' },
  ],
  mindmapMarkdown: `- RNNs, LSTMs & the Road to Attention
  - Why MLPs break on sequences
    - Fixed input size, no parameter sharing across positions, no order/memory
  - The RNN
    - h_t = tanh(W_x x_t + W_h h_(t−1) + b)
    - One weight set every step; the state IS the memory
    - Unrolling = the mental model
  - BPTT & the gradient problem
    - Unroll → ordinary backprop, tied weights; step 1's gradient crosses T copies of W_h
    - Product ≈ λ^(T−1)
    - λ > 1 exploding → clip the norm (easy)
    - λ < 1 vanishing → fundamental → gates
  - LSTM
    - Cell state = conveyor belt (multiply + add only)
    - Additive path = ResNet skip connection
    - Forget: what to drop from c
    - Input + tanh candidate: how much / what to write
    - Output: what part of c to expose as h_t
    - Forget-bias init +1 → remember by default
  - GRU
    - Reset + update gates, cell and hidden merged; fewer params, usually comparable
  - Bidirectional (whole sequence only), stacking, truncated BPTT
  - seq2seq
    - Encoder → one context vector → decoder
    - Bottleneck: quality collapses with input length
  - Attention teaser
    - Keep ALL encoder states, weight them per output step
    - Drop the RNN, keep attention → transformer (GenAI)
  - Why RNNs lost
    - Sequential across time = unparallelizable, so it could not ride the GPU scaling curve
    - Economics, not accuracy
    - Recurrence returns parallelizable: Mamba / SSMs`,
}

export default m
