import type { Module } from '../types'

const m: Module = {
  id: 'dl-l2-rnn-lstm',
  subjectId: 'dl',
  level: 2,
  title: 'RNNs, LSTMs & the Road to Attention',
  whyItMatters:
    'This is where a network first learns to read something that arrives one piece at a time: a sentence, a heart-rate trace, a week of sales numbers. You will build the loop by hand, watch its memory fade with real numbers, and then see the one small change (add instead of overwrite) that fixes it. That change also explains skip connections and residual paths everywhere else in deep learning.',
  assumes: [
    'You can read a Python for loop and a list',
    'You know what tanh and sigmoid do, from the module Activation Functions: Sigmoid, Tanh, ReLU, GELU & Softmax',
    'You know that training nudges weights using a gradient, which is just the slope of the error',
    'No sequence-model background is needed. Every term used here is defined here.',
  ],
  estMinutes: 31,
  sections: [
    {
      type: 'intuition',
      title: 'Why an ordinary network cannot read a sentence',
      md: `An ordinary neural network layer takes a fixed number of inputs. Say 4. Now feed it these two reviews:

- "the food was great" - 4 words.
- "the food at the new place near the station was not great" - 12 words.

The layer has 4 input slots. The second review does not fit. That is the first problem: **the input length varies** and a fixed layer cannot stretch.

The obvious patch is to pad everything to 100 slots. That creates the second problem. The word "great" landing in slot 3 is multiplied by completely different weights than the same word landing in slot 11. The network would have to learn what "great" means 100 separate times, once per slot.

And there is a third problem. If you just flatten all the words together, "dog bites man" and "man bites dog" become the same bag of features. **Word order carries meaning**, and a flat layer throws it away.

Two words you will need from here on. A **sequence** is an ordered list of items - the words of a sentence, the daily prices of a stock. A **timestep** is one position in that sequence: word 1 is timestep 1, word 2 is timestep 2, and so on. "Time" here just means "position in the order", even when nothing is actually timed.`,
    },
    {
      type: 'visual',
      component: 'Plot',
      props: {
          title: 'Why a plain RNN forgets: the gradient after t steps',
          notice: 'Backpropagating through t steps multiplies by roughly the same factor t times. At 0.9 the gradient is 0.0052 after 50 steps — the network cannot connect step 50 to step 0, which is the vanishing gradient. At 1.1 it is 117.4 and still climbing: exploding. Only a factor of exactly 1 is stable, and that is what the LSTM cell state is built to hold.',
          kind: 'line',
          xLabel: 'timesteps back through the sequence',
          yLabel: 'gradient size',
          yMin: 0,
          yMax: 12,
          series: [
            {
              name: 'factor 1.1',
              points: [[0, 1], [1, 1.1], [2, 1.21], [3, 1.331], [4, 1.4641], [5, 1.6105], [6, 1.7716], [7, 1.9487], [8, 2.1436], [9, 2.3579], [10, 2.5937], [11, 2.8531], [12, 3.1384], [13, 3.4523], [14, 3.7975], [15, 4.1772], [16, 4.595], [17, 5.0545], [18, 5.5599], [19, 6.1159], [20, 6.7275], [21, 7.4002], [22, 8.1403], [23, 8.9543], [24, 9.8497], [25, 10.8347], [26, 11.9182], [27, 13.11], [28, 14.421], [29, 15.8631], [30, 17.4494], [31, 19.1943], [32, 21.1138], [33, 23.2252], [34, 25.5477], [35, 28.1024], [36, 30.9127], [37, 34.0039], [38, 37.4043], [39, 41.1448], [40, 45.2593], [41, 49.7852], [42, 54.7637], [43, 60.2401], [44, 66.2641], [45, 72.8905], [46, 80.1795], [47, 88.1975], [48, 97.0172], [49, 106.719], [50, 117.3909]],
            },
            {
              name: 'factor 1.0',
              points: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], [17, 1], [18, 1], [19, 1], [20, 1], [21, 1], [22, 1], [23, 1], [24, 1], [25, 1], [26, 1], [27, 1], [28, 1], [29, 1], [30, 1], [31, 1], [32, 1], [33, 1], [34, 1], [35, 1], [36, 1], [37, 1], [38, 1], [39, 1], [40, 1], [41, 1], [42, 1], [43, 1], [44, 1], [45, 1], [46, 1], [47, 1], [48, 1], [49, 1], [50, 1]],
              dashed: true,
            },
            {
              name: 'factor 0.9',
              points: [[0, 1], [1, 0.9], [2, 0.81], [3, 0.729], [4, 0.6561], [5, 0.5905], [6, 0.5314], [7, 0.4783], [8, 0.4305], [9, 0.3874], [10, 0.3487], [11, 0.3138], [12, 0.2824], [13, 0.2542], [14, 0.2288], [15, 0.2059], [16, 0.1853], [17, 0.1668], [18, 0.1501], [19, 0.1351], [20, 0.1216], [21, 0.1094], [22, 0.0985], [23, 0.0886], [24, 0.0798], [25, 0.0718], [26, 0.0646], [27, 0.0581], [28, 0.0523], [29, 0.0471], [30, 0.0424], [31, 0.0382], [32, 0.0343], [33, 0.0309], [34, 0.0278], [35, 0.025], [36, 0.0225], [37, 0.0203], [38, 0.0182], [39, 0.0164], [40, 0.0148], [41, 0.0133], [42, 0.012], [43, 0.0108], [44, 0.0097], [45, 0.0087], [46, 0.0079], [47, 0.0071], [48, 0.0064], [49, 0.0057], [50, 0.0052]],
            },
          ],
        },
    },
    {
      type: 'intuition',
      title: 'The RNN: one small model, applied again and again',
      md: `Picture a person reading a book with a single sticky note. They read one word, scribble an updated summary on the note, and move to the next word. The note is the only thing they carry forward.

That is a **recurrent neural network**, or RNN. Four terms, all defined here:

- **Hidden state** - the sticky note. A fixed-size list of numbers that summarises everything read so far. It is written h, and h at timestep t is written h_t.
- **Recurrence** - the fact that the new hidden state is computed from the *previous* hidden state plus the current word. The layer feeds its own output back into itself.
- **Shared weights across time** - there is exactly one set of weights, and the same set is used at every timestep. The word "great" is multiplied by the same numbers whether it is word 3 or word 30. That directly fixes problem two above.
- **Unrolling** - the picture you draw to think about it: copy the same small cell left to right, once per timestep, with an arrow carrying h from each copy to the next.

The update rule is one line: **h_t = tanh(W_x times x_t + W_h times h_(t-1) + b)**. Old state in, new word in, new state out. Any sequence length works, because the loop simply runs more times. The number of weights never changes.`,
    },
    {
      type: 'intuition',
      title: 'Run an RNN by hand over 3 timesteps',
      md: `Concrete numbers, no code yet. Take the smallest possible RNN: the hidden state is a single number, and so is each input.

Set W_x = 1.0 (the weight on the incoming word), W_h = 0.5 (the weight on the memory), and b = 0. Start with h_0 = 0.0, because the network has read nothing.

Feed it three inputs: x_1 = 1.0, then x_2 = 0.0, then x_3 = 0.0. Read that as: word 1 carries a signal worth 1.0, and the next two words are blanks. The question is how long word 1 survives.

1. **Timestep 1.** Inside tanh: 1.0 times 1.0 plus 0.5 times 0.0 = 1.0. So h_1 = tanh(1.0) = **0.7616**.
2. **Timestep 2.** Inside tanh: 1.0 times 0.0 plus 0.5 times 0.7616 = 0.3808. So h_2 = tanh(0.3808) = **0.3634**.
3. **Timestep 3.** Inside tanh: 1.0 times 0.0 plus 0.5 times 0.3634 = 0.1817. So h_3 = tanh(0.1817) = **0.1797**.

Two things just happened, and both matter. The signal from word 1 **did** reach timestep 3 - that is memory, and a flat layer has none. But it arrived at 0.1797 instead of 0.7616. Each step multiplied it by roughly a half and then squashed it. **The memory carries forward, and it fades.** Hold on to that number, 0.18 after only three blank words.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same three timesteps, in code',
      code: `import math

W_x = 1.0             # weight applied to the incoming word
W_h = 0.5             # weight applied to the memory we already have
h = 0.0               # h_0: the hidden state before any word is read
xs = [1.0, 0.0, 0.0]  # word 1 carries a signal, words 2 and 3 are blanks

for t, x in enumerate(xs, start=1):
    pre = W_x * x + W_h * h
    h = math.tanh(pre)
    print('t =', t, 'x =', x, 'pre =', round(pre, 4), 'h =', round(h, 4))

# t = 1 x = 1.0 pre = 1.0 h = 0.7616
# t = 2 x = 0.0 pre = 0.3808 h = 0.3634
# t = 3 x = 0.0 pre = 0.1817 h = 0.1797`,
      annotations: {
        1: 'math is the standard library module holding tanh and exp. No numpy anywhere in this module - every number here is one you could check on paper.',
        8: 'enumerate walks a list and hands back both the position and the item. start=1 makes the first position 1 instead of 0, so t matches the timestep numbering.',
        9: 'The mixing step: this word times its weight, plus the old memory times its weight. This is the whole input side of the recurrence.',
        10: 'tanh squashes that number into the range -1 to 1, and the result is stored back into h. Storing it back IS the recurrence - the next loop pass reads the value this pass wrote.',
        11: 'Prints the three lines shown below. They match the hand arithmetic exactly: 0.7616, 0.3634, 0.1797.',
      },
    },
    {
      type: 'math',
      intro: 'The whole vanilla RNN. One weight for the input, one for the state, one bias, reused at every timestep.',
      latex: [
        'h_t = \\tanh\\!\\left( W_x x_t + W_h h_{t-1} + b \\right), \\qquad h_0 = 0',
        '\\text{The same } W_x, W_h, b \\text{ are used for } t = 1 \\dots T.',
      ],
    },
    {
      type: 'intuition',
      title: 'Backpropagation through time, in plain words',
      md: `Training needs a gradient: for each weight, how much would the error change if I nudged this weight a little. In an ordinary network you get that by walking backwards through the layers.

An RNN has no stack of layers - it has one cell used T times. So you unroll it first, and then the unrolled picture *is* a deep network: T copies in a row, all sharing one set of weights. Walking backwards through that unrolled picture is called **backpropagation through time**, or BPTT. It is not a new algorithm. It is ordinary backpropagation applied to the unrolled timeline.

Three consequences worth naming:

- You must keep every h_t from the forward pass, because the backward pass needs them. That is why long sequences use a lot of memory.
- Because W_h is used at every step, its gradient is the **sum** of the contributions from all T steps.
- The gradient that finally reaches timestep 1 has been passed backwards through T-1 steps, and **at every one of them it got multiplied by roughly the same factor**. That last point decides the fate of the whole architecture, so we are going to measure it.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Watch the gradient die over 20 timesteps',
      code: `factor = 0.6   # how much the gradient shrinks at each step going backwards
g = 1.0        # the gradient handed back by the error at the LAST timestep

for t in range(1, 21):
    g = g * factor
    if t in (1, 5, 10, 20):
        print('after', t, 'steps the gradient is', format(g, '.8f'))

# after 1 steps the gradient is 0.60000000
# after 5 steps the gradient is 0.07776000
# after 10 steps the gradient is 0.00604662
# after 20 steps the gradient is 0.00003656`,
      annotations: {
        1: 'Where 0.6 comes from: each backward step multiplies by W_h and by the slope of tanh. The slope of tanh is never above 1, so the combined factor is easily below 1. 0.6 is a mild, realistic value.',
        2: 'Starting the gradient at exactly 1.0 makes every printed number a pure survival fraction: 0.00003656 means 0.0037 percent of the original signal is left.',
        4: 'range(1, 21) counts 1 through 20 - one pass per timestep we walk backwards over.',
        5: 'The single line that causes the problem: the same shrinking factor is applied again, on top of everything before it.',
        6: 'The in operator checks membership in the tuple (1, 5, 10, 20), so we print four checkpoints instead of twenty lines.',
        7: 'format(g, \'.8f\') prints g with 8 digits after the decimal point. Without it Python would show 3.656e-05 and the collapse would be harder to feel.',
      },
    },
    {
      type: 'note',
      md: 'That collapse has a name: the **vanishing gradient problem**. After 20 words, timestep 1 receives 0.0037 percent of the learning signal - which is to say, none. The network physically cannot learn that word 1 mattered for the prediction at word 21. The activations module, *Activation Functions: Sigmoid, Tanh, ReLU, GELU & Softmax*, showed you the cause from the other side: the slope of tanh is at most 1 and is far below 1 whenever the unit is saturated, and the slope of sigmoid never exceeds 0.25. There you saw one such factor per layer. Here you get one per **word**, and sentences are longer than networks are deep. The mirror image also exists: if the factor is above 1, say 1.3, then 1.3 to the power 20 is about 190, and the gradient explodes to a NaN. Exploding has a cheap fix - clip the gradient to a maximum length and keep its direction. Vanishing has no such fix, because there is nothing left to rescale. Multiplying 0.00003656 by a thousand amplifies rounding noise, not information. So the repair has to be structural.',
    },
    {
      type: 'intuition',
      title: 'The LSTM idea: stop overwriting, start adding',
      md: `Look again at why the RNN memory faded. Every step *rebuilds* the hidden state from scratch: h_new = tanh(weights times h_old + weights times word). Old information survives only by being re-encoded through a multiply and a squash, over and over, and each pass shaves a bit off.

The **LSTM** (long short-term memory) keeps that hidden state but runs a second line of memory beside it, called the **cell state**, written c. Think of a conveyor belt running straight from the first word to the last.

- Facts are placed on the belt and simply ride along.
- The belt is only ever touched by two cheap operations: multiply each slot by a number, and add something to each slot. No weight matrix sits on the belt, and no tanh.
- So the amount of a fact that survives one step is exactly the number you multiplied by. If the network learns to multiply by 1.0, the fact passes through **completely untouched**, forwards and backwards.

The hidden state h is still there, but its job changes. It is now just a filtered view of the belt - what the model chooses to expose at this step - rather than the storage itself.

This "let the signal pass through unchanged and only add corrections to it" trick is the same one behind skip connections in ResNet. The LSTM did it first, in 1997.`,
    },
    {
      type: 'intuition',
      title: 'The three gates',
      md: `A **gate** is a list of numbers, one per slot of the state, each between 0 and 1. It is produced by a sigmoid, which squashes any number into that range. Multiply a gate into something and it decides **how much passes**: 0 blocks the slot entirely, 1 lets it through untouched, 0.7 lets 70 percent through. Think of a row of taps, one per slot, each opened by some amount.

An LSTM has three of them, and each answers one question about one slot:

- **Forget gate f** - "how much of what is already on the belt should stay?" The belt is multiplied by f. f = 1 keeps a slot exactly as it was; f = 0 wipes it.
- **Input gate i** - "how much of the new content should be written in?" Its partner is the **candidate**, written g, which is a tanh and therefore ranges from -1 to 1. The candidate is *what* to write; the input gate is *how much* of it to write.
- **Output gate o** - "how much of the belt should be exposed as the hidden state right now?" This is what makes storing and speaking separate decisions.

All four (three gates and the candidate) are computed the same way, from the previous hidden state and the current word. They are learned, not hand-set. The two update lines are then just:

- **c_t = f times c_(t-1) + i times g** - scale what was on the belt, then add the new write.
- **h_t = o times tanh(c_t)** - expose a filtered view.`,
    },
    {
      type: 'hinglish',
      md: `Gates ko ek chowkidar samajh: har timestep pe teen sawaal poochta hai. **Forget gate** - *"purani baat me se kitna rehne dena hai?"* (0 matlab poora mita do, 1 matlab jaisa hai waisa rakho). **Input gate** - *"is naye word me se kitna likhna hai?"* **Output gate** - *"abhi bahar kitna bolna hai?"* Sabse bada point yehi hai: **yaad rakhna aur bolna alag-alag cheezein hain**. Belt pe "subject = billi" pada reh sakta hai bees words tak, bina ek baar bhi bahar aaye - aur jis din verb aayega, output gate darwaza khol dega. Aur yaad rakho: belt pe sirf multiply aur add hota hai, koi matrix nahi - isliye purani baat mitti nahi, jaise plain RNN me mit jaati thi.`,
    },
    {
      type: 'math',
      intro: 'The four computations, then the two updates. The sigma symbol is the sigmoid (a 0..1 valve) and the circled dot means multiply slot by slot.',
      latex: [
        'f_t = \\sigma(W_f h_{t-1} + U_f x_t + b_f) \\qquad i_t = \\sigma(W_i h_{t-1} + U_i x_t + b_i)',
        'g_t = \\tanh(W_g h_{t-1} + U_g x_t + b_g) \\qquad o_t = \\sigma(W_o h_{t-1} + U_o x_t + b_o)',
        'c_t = f_t \\odot c_{t-1} \\;+\\; i_t \\odot g_t \\qquad h_t = o_t \\odot \\tanh(c_t)',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'One LSTM timestep by hand, three slots, real numbers',
      code: `import math

def sigmoid(z):
    return 1 / (1 + math.exp(-z))

c_prev = [0.80, 0.50, -0.30]                            # the belt arriving from step t-1
f = [sigmoid(3.0), sigmoid(0.0), sigmoid(-2.0)]         # forget gate: keep how much?
i = [sigmoid(-2.0), sigmoid(2.0), sigmoid(0.0)]         # input gate: write how much?
g = [math.tanh(0.5), math.tanh(1.0), math.tanh(-0.5)]   # candidate: what to write
o = [sigmoid(2.0), sigmoid(-1.0), sigmoid(0.0)]         # output gate: expose how much?

c = [f[k] * c_prev[k] + i[k] * g[k] for k in range(3)]
h = [o[k] * math.tanh(c[k]) for k in range(3)]

for k in range(3):
    print('slot', k, 'f', round(f[k], 3), 'kept', round(f[k] * c_prev[k], 3), 'added', round(i[k] * g[k], 3), 'c', round(c[k], 3), 'h', round(h[k], 3))

# slot 0 f 0.953 kept 0.762 added 0.055 c 0.817 h 0.593
# slot 1 f 0.5   kept 0.25  added 0.671 c 0.921 h 0.195
# slot 2 f 0.119 kept -0.036 added -0.231 c -0.267 h -0.13`,
      annotations: {
        1: 'Only the standard math module. The numbers fed to the gates are written out directly instead of coming from weight matrices, so you can see exactly which valve setting produces which result.',
        3: 'def defines a function. sigmoid takes one number z and returns one number.',
        4: 'The sigmoid formula. Large positive z gives a result near 1 (tap wide open), large negative z gives near 0 (tap shut), z = 0 gives exactly 0.5.',
        12: 'This is a list comprehension: it builds a new list by running the expression once for each k in 0, 1, 2. Read it as "for every slot, keep f of the old value and add i of the candidate". This one line is the entire LSTM.',
        13: 'The hidden state is a filtered view: squash the belt with tanh, then let only the output-gate fraction through.',
        15: 'Loop over the three slots so we can print each one separately.',
        16: 'Slot 0 checked by hand: f = 0.953, so 0.953 times 0.80 = 0.762 stays. The input gate is nearly shut (0.119) so only 0.119 times 0.462 = 0.055 is added. c becomes 0.817 - the fact arrived at 0.80 and left at 0.817, essentially intact. A plain RNN at the same step would have squashed 0.80 down to about 0.38.',
      },
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'The cell state as a conveyor belt',
        notice: 'Left: what this timestep computes. Right: the belt, one box per slot. Watch that the belt is only ever scaled and added to, never rebuilt.',
        leftLabel: 'this timestep',
        rightLabel: 'cell state c',
        frames: [
          {
            note: 'Reading the sentence "the cat that chased the dog was tired". Step t begins. The belt rolls in from the previous step completely untouched: no weights sit on this path.',
            stack: [
              { name: 'x_t', value: 'the word "dog"' },
              { name: 'h_prev', value: 'last exposed view' },
            ],
            heap: [
              { id: 'c0', value: 'subject: cat', label: 'carried' },
              { id: 'c1', value: 'verb: chased', label: 'carried' },
              { id: 'c2', value: 'topic: animals', label: 'carried' },
            ],
          },
          {
            note: 'Forget gate f = [1.0, 0.0, 0.9]. Slot 0 is multiplied by 1.0 and survives exactly. Slot 1 is multiplied by 0.0 and is wiped. Slot 2 fades slightly. Keeping a fact costs nothing here.',
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
            note: 'Input gate i says how much, candidate g says what. c = f*c_prev + i*g adds the new fact into slot 1. Slot 0 was not part of this write at all, so the subject is untouched.',
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
            note: 'Contrast: a plain RNN at the same step. There is no belt. h = tanh(weights times h + weights times x) replaces the whole state, so the subject survives only as a fading blur - the 0.18 you computed by hand.',
            stack: [{ name: 'h_t', value: 'tanh(W h + U x)', to: 'hnew' }],
            heap: [
              { id: 'hold', value: 'subject: cat', freed: true },
              { id: 'hnew', value: 'blur of the last few words', label: 'overwritten' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'GRU, in one paragraph',
      md: `The **GRU** (gated recurrent unit) is the same idea with less machinery: two gates instead of three, and no separate cell state. A reset gate decides how much of the past to use when proposing new content, and a single update gate z does forgetting and writing with one dial: h_t = (1 - z) times h_old + z times h_new. That (1 - z) times h_old term is the additive path, so the memory trick survives. A GRU has about 25 percent fewer weights than an LSTM and runs slightly faster per step, and on most tasks the accuracy difference is small enough to disappear into normal run-to-run variation. Benchmark both on your data rather than trusting folklore.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: does the subject survive to the verb?',
      md: `The sentence is "the cat that chased the dog around the garden all afternoon was tired". To choose "was" over "were", the model must still know the subject is singular ("cat"), decided 11 words earlier.

**Step 1 - count the gap.** From "cat" to "was" is 11 timesteps.

**Step 2 - the plain RNN.** Take the per-step survival factor we measured, 0.6. Then 0.6 to the power 11 = 0.6 times itself 11 times. Building it up: 0.6^2 = 0.36, 0.6^4 = 0.36^2 = 0.1296, 0.6^8 = 0.1296^2 = 0.0168, and 0.6^11 = 0.6^8 times 0.6^2 times 0.6 = 0.0168 times 0.36 times 0.6 = **0.0036**. So about 0.36 percent of the subject signal is left, and the same 0.36 percent applies to the gradient that would teach the model to keep it.

**Step 3 - the LSTM.** Suppose the forget gate on the subject slot has learned f = 0.98. Then the survival is 0.98 to the power 11. Since 0.98^2 = 0.9604, 0.98^4 = 0.9224, 0.98^8 = 0.8508, and 0.98^11 = 0.8508 times 0.9604 times 0.98 = **0.8007**. Eighty percent of the subject signal arrives at the verb.

**Step 4 - read the verdict.** 0.36 percent versus 80 percent, over the same 11 words. The difference is not the number of weights: it is that the RNN multiplied by a fixed 0.6 it could not control, while the LSTM's 0.98 is a value the network *chose* by learning the forget gate. This is the whole point of gating - the model gets to decide, per slot, what to keep.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The classic mistake: a long dependency lost by a plain RNN',
      code: `import math

rnn = 1.0     # a plain RNN's hidden state, holding one fact at full strength
lstm = 1.0    # the same fact sitting on an LSTM's cell-state belt

for t in range(20):
    rnn = math.tanh(0.5 * rnn)
    lstm = 0.95 * lstm + 0.0

print('plain RNN state after 20 steps:', format(rnn, '.8f'))
print('LSTM belt  after 20 steps:', format(lstm, '.8f'))

# plain RNN state after 20 steps: 0.00000086
# LSTM belt  after 20 steps: 0.35848592`,
      annotations: {
        1: 'math again, for tanh. Both memories start at exactly 1.0 so the printed numbers are survival fractions.',
        6: 'Twenty more words arrive, none of them about the fact we are trying to remember.',
        7: 'The plain RNN rebuilds its state every step: multiply by the weight, then squash. Nothing here can be tuned to 1, because tanh always pulls the value toward 0.',
        8: 'The LSTM belt is only scaled by the forget gate and added to. The + 0.0 is the input gate writing nothing into this slot this step.',
        10: 'Prints 0.00000086 - eight ten-millionths. The fact is gone, and so is any gradient that would have taught the model to keep it.',
        11: 'Prints 0.35848592 with a forget gate of only 0.95. At the 0.98 a trained gate reaches, 20 steps leaves about 0.67.',
      },
    },
    {
      type: 'note',
      md: 'Now the diagnosis, because the wrong conclusion here is very common. Seeing 0.00000086, people say "the hidden state is too small - make it bigger". **That is the wrong fix, and the numbers say why.** Widening the state from 128 slots to 512 gives you four times as many slots, but every single one of them is still multiplied by tanh and a weight at every step, so every single one still decays by the same factor. Four times zero is zero. The failure is not capacity, it is the *shape* of the update: overwriting instead of adding. Change the shape - put the fact on a path that is only scaled and added to - and 20 steps costs you 64 percent instead of everything. The tell in real life: bucket your validation accuracy by input length. If accuracy falls smoothly as inputs get longer while short inputs are fine, you have a memory-path problem, not a size problem. Two other things worth checking before you touch the architecture: whether your data loader is silently truncating long inputs, and whether the forget-gate bias is initialised to about +1, which starts every gate near "keep" so the model remembers by default and has to learn to forget.',
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work them out before reading the solutions below.

1. An RNN has hidden state h_0 = 0.0, W_x = 1.0, W_h = 0.5, b = 0, and receives x_1 = 2.0 then x_2 = 0.0. Compute h_1 and h_2, given tanh(2.0) = 0.9640 and tanh(0.4820) = 0.4482.
2. Backwards through a 30-step RNN the gradient shrinks by 0.8 per step. Roughly what fraction reaches timestep 1? Use 0.8^10 = 0.107.
3. One LSTM slot has c_prev = 0.60, forget gate f = 0.90, input gate i = 0.30, candidate g = -0.40, output gate o = 0.50. Compute c and then h, given tanh(0.42) = 0.3969.
4. A colleague says "our LSTM forgets things, so let us raise the learning rate". Give the numerical reason that will not help.`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `**1.** Timestep 1: inside tanh is 1.0 times 2.0 plus 0.5 times 0.0 = 2.0, so h_1 = tanh(2.0) = **0.9640**. Timestep 2: inside tanh is 1.0 times 0.0 plus 0.5 times 0.9640 = 0.4820, so h_2 = tanh(0.4820) = **0.4482**. The stronger input pushed tanh toward its ceiling of 1, and one blank word still cost more than half of it.

**2.** 0.8^30 = (0.8^10)^3 = 0.107^3 = 0.107 times 0.107 times 0.107 = about **0.0012**, so roughly one tenth of one percent. A gentler factor than 0.6 buys you more steps, but not many more - the decay is still geometric.

**3.** c = f times c_prev + i times g = 0.90 times 0.60 + 0.30 times (-0.40) = 0.54 - 0.12 = **0.42**. Then h = o times tanh(c) = 0.50 times 0.3969 = **0.1985**. Note that h is much smaller than c: the output gate is holding most of the stored value back, which is exactly what lets the model keep a fact without acting on it.

**4.** The learning rate multiplies the gradient. From problem 2, the gradient arriving at an early timestep is about 0.0012 of the signal, and in the 20-step example it was 0.00003656. Multiplying a number that small by 10 or 100 does not restore the information that decayed away - it mostly amplifies numerical noise, and it destabilises the near timesteps whose gradients were healthy. The fix is a memory path that does not decay (gating), or a shorter dependency, not a bigger step size.`,
    },
    {
      type: 'note',
      md: 'One honest closing note. For language, attention and transformers have largely replaced these models: instead of squeezing a sentence through one small state, a transformer lets every position look directly at every other position, and that is covered properly in the GenAI subject. So why learn LSTMs at all? Two real reasons. They still come up in interviews, because the gating idea is the cleanest example of "add, do not overwrite" that the field has. And they are still genuinely used in time-series and streaming work, where inputs arrive one at a time, memory per step must stay constant, and the sequences are short enough that a transformer is overkill.',
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Four extras, none needed above.

- **Truncated BPTT.** Backpropagating through a 10,000-word document is impractical, so you cut the sequence into chunks of about 35 steps, backpropagate inside a chunk only, and pass the hidden state to the next chunk without a gradient attached. You keep the forward memory but give up learning signal for dependencies longer than the chunk.
- **Bidirectional models.** Run one pass left to right and another right to left, then join the two states. This only works when the whole sequence is available before you start - tagging, classification, offline transcription. It is impossible for live generation, because the backward pass would need words that do not exist yet.
- **Stacking.** Feed the sequence of hidden states from layer 1 into layer 2. Two to four layers is the practical ceiling; deeper mostly buys latency.
- **Why RNNs actually lost.** Not accuracy - throughput. Timestep t needs timestep t-1, so a 1000-word sequence is 1000 strictly sequential small matrix multiplies and a GPU sits mostly idle. A transformer computes all positions at once in a few large multiplications. When compute got cheap, only the parallel architecture could spend it. Recurrence is now returning in a parallelisable form (state-space models), which is the same idea rebuilt to fit the hardware.`,
    },
  ],
  quiz: [
    {
      question: 'Why can a fixed 4-input layer not handle both "the food was great" and a 12-word review?',
      options: [
        {
          text: 'The input length varies, and padding to a fixed size makes the same word hit different weights at different positions',
          explanation: 'Correct. Two structural problems: the layer has a fixed number of slots, and a padded layout forces the model to relearn each word once per position.',
        },
        { text: 'Neural networks cannot represent words as numbers', explanation: 'They can - each word becomes a vector. The failure is about variable length and position, not about text.' },
        { text: 'tanh is the wrong activation for text', explanation: 'The activation is not the issue; the same tanh works fine inside an RNN cell.' },
      ],
      correct: 0,
    },
    {
      question: 'In an RNN, where is everything the model remembers about the words it has read so far?',
      options: [
        { text: 'In the weight W_h', explanation: 'W_h is the same at every step and does not change during a forward pass. It is the rule for updating the memory, not the memory.' },
        { text: 'In a buffer of past words the cell keeps', explanation: 'There is no buffer. An RNN never re-reads an earlier word - that is exactly its limitation.' },
        { text: 'Entirely in the hidden state h_t', explanation: 'Correct. One fixed-size list of numbers holds everything, which is also why it saturates on long inputs.' },
      ],
      correct: 2,
    },
    {
      question: 'The gradient shrinks by a factor of 0.6 at each backward step. After 20 steps, what fraction is left?',
      options: [
        { text: 'About 0.6, because the factor does not compound', explanation: 'It does compound: each step multiplies the already-shrunken value again.' },
        { text: 'About 0.0000366 - effectively nothing', explanation: 'Correct, and the code printed exactly that: 0.00003656. Timestep 1 receives no usable learning signal.' },
        { text: 'It grows, because tanh normalises it', explanation: 'tanh makes it worse. Its slope is at most 1, so it contributes another shrinking factor.' },
      ],
      correct: 1,
    },
    {
      question: 'Why does gradient clipping fix exploding gradients but not vanishing ones?',
      options: [
        { text: 'Clipping is too slow to run every step', explanation: 'It is one length computation per step - negligible, and standard in every RNN codebase.' },
        {
          text: 'Clipping shrinks a too-large vector while keeping its direction; a vanished gradient has no information left to rescale',
          explanation: 'Correct. Exploding is a size problem with the direction intact. Vanishing destroys the signal itself, and multiplying 0.00003656 by a thousand amplifies noise, not learning.',
        },
        { text: 'Vanishing gradients do not really hurt training', explanation: 'They are precisely why a plain RNN cannot learn dependencies beyond roughly 10 to 20 steps.' },
      ],
      correct: 1,
    },
    {
      question: 'What is structurally special about the LSTM cell state path?',
      options: [
        { text: 'It uses a larger weight matrix than the hidden state does', explanation: 'It uses no weight matrix at all - that is the entire point.' },
        { text: 'It is rebuilt from scratch each step to stay fresh', explanation: 'That describes a plain RNN hidden state, which is the thing the LSTM was designed to avoid.' },
        {
          text: 'Only elementwise multiplication and addition touch it, so one step costs the forget-gate value instead of a weight multiply plus a squash',
          explanation: 'Correct. With f near 1 a fact passes through essentially unchanged, which is why 20 steps cost 64 percent instead of everything.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Which part of an LSTM is NOT a 0-to-1 gate?',
      options: [
        {
          text: 'The candidate g - it is a tanh, so it ranges from -1 to 1, because it is content rather than a valve',
          explanation: 'Correct. f, i and o are sigmoids answering "how much"; the candidate answers "what", and content needs to be able to be negative.',
        },
        { text: 'The forget gate', explanation: 'A sigmoid - it must produce a keep-fraction between 0 and 1 for each slot.' },
        { text: 'The output gate', explanation: 'A sigmoid - it decides what fraction of tanh(c) becomes the hidden state.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Write the vanilla RNN update and explain what makes it different from an ordinary layer.',
      answer:
        'h_t = tanh(W_x x_t + W_h h_(t-1) + b), with h_0 = 0. Two differences. First, the same W_x, W_h and b are used at every timestep, so the parameter count does not depend on sequence length and a word means the same thing at position 3 and position 30. Second, the term W_h h_(t-1) makes the layer a function of its own previous output, which is what gives it memory. Unrolled, it is a deep network whose depth equals the sequence length and whose weights are all tied. I would add the caveat unprompted: that tied depth is exactly why it has a gradient problem, since the signal reaching step 1 has been multiplied by the same factor once per step.',
      isCaseBased: false,
    },
    {
      question: 'Explain the vanishing gradient problem in an RNN with numbers, not just words.',
      answer:
        'Going backwards, each timestep multiplies the gradient by the recurrent weight and by the slope of tanh. The slope of tanh is at most 1 and much less when the unit is saturated, so the combined per-step factor is typically below 1. Say it is 0.6. Then over 20 steps the surviving fraction is 0.6 to the power 20, which is 0.0000366 - about 0.0037 percent. The early timesteps get no usable learning signal, so the model cannot learn that word 1 mattered for the prediction at word 21. The mirror case is a factor above 1, where the gradient explodes; that one is cheap to fix by clipping the gradient length while keeping its direction. Vanishing has no equivalent fix, because rescaling 0.0000366 amplifies rounding noise rather than recovering information. That is why the repair is architectural - gating.',
      isCaseBased: false,
    },
    {
      question: 'Explain the three LSTM gates to a smart non-specialist, then give the equations.',
      answer:
        'Story first: the LSTM runs a conveyor belt of facts through the sentence. At each word it asks three questions. Forget: how much of what is on the belt should stay? Input: how much of this new word should be written on? Output: how much of the belt should I say out loud right now? Each answer is a list of numbers between 0 and 1, one per slot, produced by a sigmoid and learned from data. Then the equations: f = sigmoid(...), i = sigmoid(...), g = tanh(...), o = sigmoid(...), then c_t = f times c_(t-1) + i times g, and h_t = o times tanh(c_t). The punchline is the c line: the belt is only scaled and added to, with no weight matrix and no squash on that path, so one step costs the forget-gate value instead of a weight multiply. With f around 0.98 a fact survives 11 steps at 80 percent, where a plain RNN at 0.6 per step delivers 0.36 percent.',
      isCaseBased: false,
    },
    {
      question: 'Why does an LSTM keep the cell state and the hidden state separate? What breaks if you merge them?',
      answer:
        'They do different jobs. The cell state is storage; the hidden state is the exposed interface that the output layer and the next step gates read. Keeping them apart lets the model hold a fact for 30 words without acting on it, because the output gate can stay near 0 for that slot the whole time. Merge them and every stored fact is also broadcast, so storage decisions and prediction decisions compete for the same numbers, and the clean pass-through path is lost because the hidden state goes through tanh and the output gate. The GRU does merge them and compensates with the (1 - z) times h_old term, which preserves the additive path at slightly less flexibility.',
      isCaseBased: false,
    },
    {
      question: 'LSTM or GRU - how do you actually choose?',
      answer:
        'A GRU has three weight blocks (reset, update, candidate) against the LSTM four, so roughly 25 percent fewer parameters and slightly faster steps. The LSTM has a separate cell state and an independent output gate, which is more control; the GRU ties writing to forgetting through one update gate, so whatever it writes it must forget in equal measure. Empirically the accuracy gap is usually inside normal run-to-run variation, and the published comparisons were inconclusive. Practical rule: GRU when data is small or latency matters, LSTM when you have data to spare and want the extra flexibility. The honest answer is that they are one hyperparameter apart, so benchmark both on your data.',
      isCaseBased: false,
    },
    {
      question: 'Case: your LSTM trains stably for four hours, then the loss becomes NaN at step 30,000. Walk through your debugging order.',
      answer:
        'A NaN after long stable training is almost always a gradient spike rather than a code bug, since the code already survived 30,000 steps. Order of checks. One: is gradient clipping on at all? Add it with a maximum length of 1 to 5 - it is the standard mitigation and costs nothing. Two: log the gradient length before clipping and find the batch where it spiked; it is often one pathological long or corrupted sample. Three: look for a log of zero in the loss, usually an unclamped log or a division in a custom output head. Four: check the forward pass too - if cell states drift to plus or minus ten thousand then tanh saturates and the gradients get strange, which points at a missing forget-gate bias initialisation or too high a learning rate. Five: if you are training in half precision, try full precision for that step - half precision overflow is a very common real cause. The tradeoff to name out loud: clipping hides the bad batch, so log the gradient lengths or you will never find the actual sample.',
      isCaseBased: true,
    },
    {
      question: 'Case: a bidirectional LSTM for named-entity recognition works well offline. Product wants it to tag a live audio stream as words arrive. What happens?',
      answer:
        'It breaks, and not subtly. A bidirectional model joins a forward pass with a backward pass over the full sequence, and the backward half cannot start until the last word exists. A live stream has no last word. Options with their costs. One: drop to a forward-only LSTM - deployable immediately, expect a measurable accuracy drop on entities whose evidence arrives after them. Two: buffer a small window of future words and run the backward pass over that window only - this recovers most of the accuracy at the cost of a fixed lag, and it is usually the right answer. Three: retrain with a forward-only architecture from the start so training and serving match. The general principle to state: bidirectionality is only legal when the whole sequence is available before you begin - classification, tagging, offline transcription - and never for live inference or generation.',
      isCaseBased: true,
    },
    {
      question: 'Case: you inherit an LSTM sentiment model. It handles short reviews well but is near chance on long ones, and a colleague proposes doubling the hidden size. React.',
      answer:
        'Doubling the hidden size is an expensive guess, and the numbers say it will not help: every slot decays by the same per-step factor, so four times as many decaying slots is still nothing at step 40. Diagnose first. One: bucket validation accuracy by input length. A smooth fall as length grows points at the memory path; if long reviews are also topically different, it is a data problem. Two: check for silent truncation in the data loader - if long reviews are being cut at 200 tokens, no architecture change matters. Three: check where the evidence lives. If sentiment sits in the last sentence, using only the final hidden state is fine and the problem is elsewhere; if evidence is spread out, pooling over all hidden states, by mean or by attention, usually beats a larger state for far less compute. Four: initialise the forget-gate bias to about +1 so gates start near keep - a free change at the next retrain. Only after all that would I consider capacity. The cheapest real fix in practice is attention pooling on the head, or fine-tuning a small pretrained transformer and skipping the argument.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Why a fixed layer cannot read a sentence', back: 'Input length varies so it does not fit, padding makes the same word hit different weights per position, and flattening destroys word order.' },
    { front: 'Sequence, timestep, hidden state', back: 'Sequence: an ordered list of items. Timestep: one position in it. Hidden state h_t: the fixed-size summary of everything read up to that position.' },
    { front: 'The vanilla RNN update', back: 'h_t = tanh(W_x x_t + W_h h_(t-1) + b). The same weights at every step, and h_t is the entire memory.' },
    { front: 'BPTT in one line', back: 'Unroll the T timesteps into one deep network with tied weights, then run ordinary backpropagation. W_h gets the sum of contributions from every step.' },
    { front: 'Vanishing gradient, with numbers', back: 'Each backward step multiplies by roughly the same factor below 1. At 0.6 per step, 20 steps leaves 0.0000366 - no learning signal reaches the early words.' },
    { front: 'Exploding vs vanishing', back: 'Exploding: clip the gradient length and keep its direction, one line. Vanishing: nothing to rescale, the signal is gone, so it needs an architecture change.' },
    { front: 'The LSTM cell state', back: 'A belt touched only by multiply and add. One step costs the forget-gate value instead of a weight multiply plus tanh, so f near 1 lets a fact pass through intact.' },
    { front: 'The three gates plus the candidate', back: 'Forget f: how much of the belt stays. Input i: how much of the new content is written. Output o: how much of the belt is exposed as h. All three are sigmoids (0 to 1); the candidate g is a tanh (-1 to 1) and is what to write.' },
  ],
  mindmapMarkdown: `- RNNs, LSTMs and the road to attention
  - Why a fixed layer fails on sequences
    - Length varies, padding kills weight sharing, flattening kills order
  - The RNN
    - h_t = tanh(W_x x_t + W_h h_(t-1) + b)
    - Hidden state is the whole memory; same weights every step
    - Hand-run: 0.7616, 0.3634, 0.1797 - it carries and it fades
  - BPTT and the gradient problem
    - Unroll into a deep tied-weight network, then ordinary backprop
    - 0.6 per step over 20 steps leaves 0.0000366
    - Above 1: exploding, clip it. Below 1: vanishing, needs gates
  - LSTM
    - Cell state as a belt: multiply and add only
    - Forget f: keep how much. Input i: write how much. Candidate g: what
    - Output o: expose how much - storing and speaking are separate
    - Forget-bias +1 means remember by default
  - GRU
    - Reset and update gates, cell merged into hidden, about 25 percent fewer weights
  - Worked case
    - 11-word gap: plain RNN 0.36 percent, LSTM at f=0.98 gives 80 percent
  - Classic mistake
    - Bigger hidden state does not help - every slot decays by the same factor
  - Closing
    - Attention and transformers took over language (GenAI subject)
    - LSTMs still live in interviews, time series and streaming`,
}

export default m
