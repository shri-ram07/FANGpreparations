import type { Module } from '../types'

const m: Module = {
  id: 'genai-l0-self-attention',
  subjectId: 'genai',
  level: 0,
  title: 'Self-Attention',
  whyItMatters:
    'Every large language model is a stack of this one operation. It is three matrix multiplications and a softmax, and every design decision in it — including the division by √d — exists for a reason you can measure.',
  assumes: [
    'You have read *Vectors and the Dot Product*',
    'You know what a softmax does',
  ],
  estMinutes: 20,
  sections: [
    {
      type: 'intuition',
      title: 'Every token looks at every other token',
      md: `In "the animal did not cross the street because **it** was too tired", resolving *it* requires looking back at *animal*. A recurrent network has to carry that information forward step by step; attention just looks.

Each token produces three vectors. A **query** — what am I looking for. A **key** — what do I offer. A **value** — what I will contribute if chosen.

Then every token's query is compared against every token's key by a dot product, the scores become weights via softmax, and the output is the weighted average of the values. **Every position is computed independently and in parallel**, which is the property RNNs could never have.`,
    },
    {
      type: 'math',
      intro:
        'The whole operation, in one line. QKᵀ is every query against every key — an n×n grid of scores. The softmax turns each row into weights that sum to 1, and multiplying by V takes the weighted average. The only part that needs explaining is the √d.',
      latex: [
        '\\mathrm{Attention}(Q, K, V) = \\mathrm{softmax}\\!\\left(\\frac{QK^{T}}{\\sqrt{d_k}}\\right)V',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Attention over three tokens, every step printed',
      code: `import numpy as np, math
d = 4
X = np.array([[1.0, 0.0, 1.0, 0.0],    # "the"
              [0.0, 1.0, 0.0, 1.0],    # "cat"
              [1.0, 1.0, 0.0, 0.0]])   # "sat"
Q = K = V = X                          # identity projections, to keep it readable

def softmax(x):
    e = np.exp(x - x.max(axis=-1, keepdims=True))
    return e / e.sum(axis=-1, keepdims=True)

print('raw scores Q K^T :', np.round(Q @ K.T, 4).tolist())
print('scaled by sqrt(4):', np.round((Q @ K.T) / math.sqrt(d), 4).tolist())
A = softmax((Q @ K.T) / math.sqrt(d))
print('attention weights:', np.round(A, 4).tolist())
print('rows sum to      :', np.round(A.sum(axis=1), 6).tolist())
print('output A V       :', np.round(A @ V, 4).tolist())

# ---- real output ----
# raw scores Q K^T : [[2.0, 0.0, 1.0], [0.0, 2.0, 1.0], [1.0, 1.0, 2.0]]
# scaled by sqrt(4): [[1.0, 0.0, 0.5], [0.0, 1.0, 0.5], [0.5, 0.5, 1.0]]
# attention weights: [[0.5065, 0.1863, 0.3072], [0.1863, 0.5065, 0.3072], [0.2741, 0.2741, 0.4519]]
# rows sum to      : [1.0, 1.0, 1.0]
# output A V       : [[0.8137, 0.4935, 0.5065, 0.1863], [0.4935, 0.8137, 0.1863, 0.5065], [0.7259, 0.7259, 0.2741, 0.2741]]`,
      annotations: {
        6: 'Real attention has learned projections W_q, W_k, W_v. Setting them to the identity here isolates the mechanism from the learning, which is what makes the numbers readable.',
        18: 'The diagonal is largest — [2.0, 0.0, 1.0] for row 1 — because a token\'s query matches its own key best. Every token attends mostly to itself before anything else, and that is the default an untrained model starts from.',
        20: 'Row 1 gives 0.5065 to itself, 0.3072 to "sat" (which shares a dimension) and 0.1863 to "cat" (which shares none). The output is a weighted blend, so each token\'s representation is now contaminated by every other token, weighted by relevance.',
        21: 'Each row sums to exactly 1. Attention redistributes a fixed budget — paying more to one token necessarily pays less to another, which is why attention weights are a competition.',
      },
    },
    {
      type: 'intuition',
      title: 'The √d is not cosmetic',
      md: `A dot product of two d-dimensional vectors is a sum of d products. Add up more independent terms and the result spreads out further — the standard deviation grows like **√d**.

At d = 512 the raw scores routinely reach ±60. Feed numbers that large into a softmax and it saturates: one weight becomes 1.0 and every other becomes 0.0.

That is fatal, and not because the attention is wrong. It is because the **gradient of a saturated softmax is essentially zero**, so nothing downstream of it can learn. Dividing by √d puts the scores back into the range where the softmax has a usable slope, and the next two snippets measure both halves of the argument.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The spread of a dot product, and what saturation does',
      code: `np.random.seed(0)
for dd in [4, 64, 512, 4096]:
    q, k = np.random.randn(20000, dd), np.random.randn(20000, dd)
    print('d=%5d  std of q.k = %8.3f   sqrt(d) = %7.3f'
          % (dd, (q*k).sum(axis=1).std(), math.sqrt(dd)))

for scale in [1, 4, 16, 64]:
    p = softmax(np.array([1.0, 0.5, 0.2]) * scale)
    print('scale %3d -> %-38s max=%.6f' % (scale, np.round(p, 6).tolist(), p.max()))

# ---- real output ----
# d=    4  std of q.k =    1.990   sqrt(d) =   2.000
# d=   64  std of q.k =    8.005   sqrt(d) =   8.000
# d=  512  std of q.k =   22.748   sqrt(d) =  22.627
# d= 4096  std of q.k =   64.184   sqrt(d) =  64.000
# scale   1 -> [0.486415, 0.295025, 0.21856]          max=0.486415
# scale   4 -> [0.85027, 0.115071, 0.034659]          max=0.850270
# scale  16 -> [0.999662, 0.000335, 3e-06]            max=0.999662
# scale  64 -> [1.0, 0.0, 0.0]                        max=1.000000`,
      annotations: {
        6: 'The measured spread tracks √d almost exactly at every size — 22.748 against 22.627 at d = 512. That is the entire justification for the scaling constant, and it is checkable rather than asserted.',
        14: 'The same three logits at four scales. At scale 16 the top weight is already 0.999662; at 64 it is exactly 1.0 and the others are exactly 0.0.',
        15: 'A softmax at 1.0 and 0.0 has a derivative of essentially zero, so no gradient flows back through it. Without the √d, attention at d = 512 would begin training already saturated and would never recover.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Attention has no idea what order the words came in',
      code: `P = np.array([[0., 0., 1.], [1., 0., 0.], [0., 1., 0.]])   # a shuffle
Xp = P @ X
out_shuffled = softmax((Xp @ Xp.T) / math.sqrt(d)) @ Xp

print('original :', np.round(A @ V, 4)[0].tolist())
print('shuffled, then un-shuffled:', np.round(P.T @ out_shuffled, 4)[0].tolist())

# ---- real output ----
# original : [0.8137, 0.4935, 0.5065, 0.1863]
# shuffled, then un-shuffled: [0.8137, 0.4935, 0.5065, 0.1863]`,
      annotations: {
        2: 'Shuffle the rows of the input, run attention, then un-shuffle the output rows.',
        9: 'Identical to the last decimal. Attention is permutation-equivariant: reorder the input and the output reorders identically, carrying no information about which order it was.',
        10: 'So "dog bites man" and "man bites dog" are the same computation. Position has to be injected separately, which is why positional encodings exist at all — they are not a refinement but a repair of something the mechanism structurally lacks.',
      },
    },
    {
      type: 'note',
      label: 'Masking, and the cost that defines the field',
      md: `Attention as written lets every token see every other, including future ones — fine for BERT-style understanding, fatal for generation, where predicting the next word while being shown it is cheating.

**Causal masking** sets the scores above the diagonal to −∞ before the softmax, so they become exactly 0 weight. That single change is the difference between BERT and GPT.

The cost is the thing everything since has been fighting. QKᵀ is an **n×n** matrix, so both compute and memory grow with the **square** of the sequence length. Doubling context quadruples the cost, which is why context windows grew slowly and why FlashAttention (which never materialises the full matrix), sliding windows, and linear-attention variants all exist.`,
    },
  ],
  quiz: [
    {
      question: 'What do query, key and value each represent?',
      options: [
        { text: 'Three copies of the same vector', explanation: 'They are three different learned projections.' },
        { text: 'What I am looking for, what I offer, and what I contribute if chosen', explanation: 'Correct — the query-key match decides the weight, and the value is what gets averaged.' },
        { text: 'Input, hidden state and output', explanation: 'That is a recurrent network\'s vocabulary.' },
        { text: 'The three layers of a transformer block', explanation: 'They all live inside one attention operation.' },
      ],
      correct: 1,
    },
    {
      question: 'Every attention row summed to exactly 1. What does that mean in practice?',
      options: [
        { text: 'The weights are probabilities of correctness', explanation: 'They are weights, not confidences about being right.' },
        { text: 'Attention redistributes a fixed budget — paying more to one token necessarily pays less to another', explanation: 'Correct, which is why attention weights are a competition between positions.' },
        { text: 'The output is normalised', explanation: 'The weights are normalised; the output is a weighted average.' },
        { text: 'It prevents overflow', explanation: 'Subtracting the max does that, separately.' },
      ],
      correct: 1,
    },
    {
      question: 'The measured std of q·k was 22.748 at d = 512, against √512 = 22.627. Why does that matter?',
      options: [
        { text: 'It confirms the vectors were normalised', explanation: 'They were standard normal, not normalised.' },
        { text: 'It is the measured justification for dividing by √d — the spread of a dot product genuinely grows like √d', explanation: 'Correct, at every size tested.' },
        { text: 'It shows attention is unstable', explanation: 'It shows why the scaling constant is what it is.' },
        { text: 'It relates to the number of heads', explanation: 'Heads are a separate matter.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is a saturated softmax fatal rather than merely extreme?',
      options: [
        { text: 'It produces the wrong answer', explanation: 'The forward pass may be reasonable; training is what breaks.' },
        { text: 'Its gradient is essentially zero, so nothing downstream can learn — at scale 64 the weights are exactly 1.0 and 0.0', explanation: 'Correct. Without √d, attention at d = 512 would start training saturated and never recover.' },
        { text: 'It overflows', explanation: 'Subtracting the max prevents overflow.' },
        { text: 'It breaks the sum-to-one property', explanation: 'The weights still sum to 1.' },
      ],
      correct: 1,
    },
    {
      question: 'Shuffling the input and un-shuffling the output gave the identical result. What does that prove?',
      options: [
        { text: 'The implementation has a bug', explanation: 'It is the correct and expected behaviour.' },
        { text: 'Attention is permutation-equivariant — it carries no information about word order at all', explanation: 'Correct, which is why positional encodings are a repair rather than a refinement.' },
        { text: 'The tokens were identical', explanation: 'They are three different vectors.' },
        { text: 'The softmax normalised away the difference', explanation: 'The softmax operates within rows; the equivariance is structural.' },
      ],
      correct: 1,
    },
    {
      question: 'What single change turns BERT-style attention into GPT-style?',
      options: [
        { text: 'A different activation function', explanation: 'Unrelated to the distinction.' },
        { text: 'Causal masking — set the scores above the diagonal to −∞ so future tokens get exactly 0 weight', explanation: 'Correct, and it is the whole difference between bidirectional and autoregressive.' },
        { text: 'More heads', explanation: 'Both use multiple heads.' },
        { text: 'Removing the √d scaling', explanation: 'Both use it.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain self-attention.',
      answer:
        'Each token produces three vectors: a query for what it is looking for, a key for what it offers, and a value for what it contributes if chosen. Every query is compared against every key by a dot product, giving an n×n grid of scores; each row is softmaxed into weights summing to 1; and the output for each position is the weighted average of the values. So every token\'s representation becomes a blend of every other token\'s, weighted by relevance. The property that made it replace recurrence is that all positions are computed in parallel — there is no step t that must wait for step t−1.',
      isCaseBased: false,
    },
    {
      question: 'Why divide by √d?',
      answer:
        'Because a dot product of d-dimensional vectors is a sum of d products, so its spread grows like √d — measured, the standard deviation was 8.005 at d = 64 and 22.748 at d = 512, tracking √d almost exactly. Scores that large saturate the softmax: the same three logits scaled by 64 give weights of exactly 1.0 and 0.0. That is fatal not because the forward pass is wrong but because a saturated softmax has essentially zero gradient, so nothing downstream can learn. Without the scaling, attention at realistic dimensions would begin training already saturated and never recover.',
      isCaseBased: true,
    },
    {
      question: 'Why do transformers need positional encodings?',
      answer:
        'Because attention has no notion of order at all. You can demonstrate it directly: shuffle the rows of the input, run attention, un-shuffle the output, and you get the identical result to four decimal places. The operation is permutation-equivariant, so "dog bites man" and "man bites dog" are the same computation. That means position is not a refinement you add for extra accuracy — it is a repair for something the mechanism structurally lacks. Every design in that space, from sinusoidal encodings to RoPE, exists to inject information the attention operation cannot represent on its own.',
      isCaseBased: true,
    },
    {
      question: 'What is the difference between BERT and GPT attention?',
      answer:
        'One line: causal masking. GPT sets every score above the diagonal to −∞ before the softmax, so future tokens receive exactly zero weight and each position can only attend to itself and what came before. BERT leaves them, so every token sees the whole sequence in both directions. The consequence is what each can do: GPT can generate, because at inference it only ever needs what it has already produced; BERT cannot generate but has a richer representation for classification and tagging, because each token has genuine bidirectional context. That trade — generation versus bidirectional context — is the whole distinction.',
      isCaseBased: false,
    },
    {
      question: 'Why is attention O(n²) and what has been done about it?',
      answer:
        'Because QKᵀ compares every position against every other, producing an n×n matrix — so both compute and memory grow with the square of sequence length, and doubling the context quadruples the cost. That is why context windows grew slowly. The responses fall into three groups. FlashAttention keeps the exact computation but never materialises the full matrix, tiling it through fast on-chip memory — same result, far less memory traffic, and it is now standard. Sparse patterns like sliding windows and Longformer restrict which pairs are computed. And linear-attention variants approximate the softmax to get O(n) — cheaper but consistently a little worse, which is why exact-but-efficient won in practice.',
      isCaseBased: false,
    },
    {
      question: 'Why does a token attend mostly to itself?',
      answer:
        'Because a query matches its own key better than anyone else\'s — in the worked example the diagonal score is 2.0 against 0.0 and 1.0 for the others, giving self-weight 0.5065. That is the sensible default an untrained model starts from: keep your own representation and blend in a little of everyone else. Training then moves it, and inspecting where attention actually lands is a common interpretability move. It is worth adding the caveat that attention weights are frequently over-interpreted — they show where information was gathered from, not what the model concluded, and papers have shown that quite different attention patterns can produce the same output.',
      isCaseBased: false,
    },
    {
      question: 'Can attention weights be used as an explanation?',
      answer:
        'Cautiously, and less than people assume. They tell you where information was gathered from, which is genuinely informative — resolving a pronoun, or a retrieval head locating a fact. But there is published work showing that attention weights can be substantially altered without changing the model\'s output, which means they are not a faithful account of what drove the decision. There are also many heads and many layers, so any single head\'s pattern is a small part of the computation. I would use them as a diagnostic hypothesis and verify with an intervention — ablate the head, or perturb the token — rather than presenting them as an explanation on their own.',
      isCaseBased: true,
    },
    {
      question: 'Walk me through implementing attention.',
      answer:
        'Project the input three ways with learned matrices to get Q, K and V. Compute QKᵀ, divide by √d_k, add the causal mask as −∞ above the diagonal if the model is autoregressive, softmax along the last axis, then multiply by V. In practice you would also split into heads before the projections and concatenate afterwards, and apply dropout to the attention weights. The details that catch people are the axis the softmax runs along — it must be the key axis so each query\'s weights sum to 1 — masking before rather than after the softmax, and using −inf rather than a large negative number so the weight is exactly zero.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Q, K, V', back: 'Query: what I am looking for. Key: what I offer. Value: what I contribute if chosen. Query·key sets the weight; value is what gets averaged.' },
    { front: 'The operation', back: 'softmax(QKᵀ/√d_k)·V. Every position computed in PARALLEL — the property RNNs could never have.' },
    { front: 'Rows sum to 1', back: 'Attention redistributes a FIXED BUDGET. Paying more to one token necessarily pays less to another.' },
    { front: 'Why √d', back: 'Measured std of q·k: 8.005 at d=64, 22.748 at d=512 — tracks √d. Larger scores saturate the softmax.' },
    { front: 'Why saturation is fatal', back: 'At scale 64 the weights are exactly 1.0 and 0.0, and a saturated softmax has essentially ZERO GRADIENT. Nothing downstream can learn.' },
    { front: 'The permutation proof', back: 'Shuffle input, run attention, un-shuffle output → identical to 4 decimals. Attention carries NO order information.' },
    { front: 'BERT vs GPT', back: 'Causal masking. Set scores above the diagonal to −∞ so future tokens get exactly 0 weight. That is the whole difference.' },
    { front: 'The O(n²) cost', back: 'QKᵀ is n×n, so doubling context quadruples cost. FlashAttention (exact, never materialised), sliding windows, linear attention.' },
  ],
  mindmapMarkdown: `- Self-attention
  - The idea
    - query = what I look for
    - key = what I offer
    - value = what I contribute
    - every position in PARALLEL
  - The operation
    - softmax(Q K^T / sqrt(d)) V
    - rows sum to 1: a fixed budget, a competition
    - diagonal is largest: attend to yourself first
  - Why sqrt(d)
    - dot product spread grows like sqrt(d)
    - measured: 8.005 at d=64, 22.748 at d=512
    - big scores saturate the softmax
    - scale 64 -> weights exactly 1.0 and 0.0
    - saturated softmax has ZERO GRADIENT
  - No sense of order
    - shuffle in, un-shuffle out -> identical
    - permutation-equivariant
    - positional encoding is a REPAIR, not a refinement
  - Masking
    - causal: scores above the diagonal to -inf
    - that one line is BERT vs GPT
  - The cost
    - QK^T is n x n: doubling context quadruples cost
    - FlashAttention: exact, never materialised
    - sliding windows, linear attention (worse)`,
}

export default m
