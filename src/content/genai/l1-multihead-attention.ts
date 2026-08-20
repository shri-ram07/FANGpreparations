import type { Module } from '../types'

const m: Module = {
  id: 'genai-l1-multihead-attention',
  subjectId: 'genai',
  level: 1,
  title: 'Multi-Head Attention & Causal Masking',
  whyItMatters:
    'L0 gave you one attention head. A real GPT block is that head run twelve times in parallel with a triangle of −∞ over its scores — and both of those choices get interrogated in interviews. "Why more than one head?" and "why mask before softmax, not after?" are the two follow-ups that separate people who read the paper from people who built it. This module also explains why transformers train fast at all.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'One head, one opinion',
      md: `You already have the whole machine from L0: Q, K, V, scores over √d_k, row-softmax, mix the Values. Nothing below replaces it. We run it **several times side by side**, and then we forbid it from looking forward.

Start with why several. Look at one row of an attention matrix — token *i*'s weights over every token.

- That row sums to 1. It is **one probability distribution**, so it can express exactly **one** "what matters to me right now".
- But a token needs several answers at once. Take "it" in *"the cat sat on the mat because it was tired"*: which noun am I? (cat) · what verb governs me? (was) · what word came just before me? (because)
- One distribution has to blend those into a single mush. Put weight on "cat" and you take it away from "was" — they compete for the same budget of 1.0.
- **Multi-head attention gives each question its own row.** Head 1 can be all-in on coreference, head 2 on the previous token, head 3 on syntax — no competition, because each head has its own budget.
- Empirically this is exactly what happens. Trained heads specialize, and researchers have found and named them: previous-token heads, positional heads, and **induction heads** — heads that spot a pattern "…A B … A" and predict "B". Induction heads are a large part of why in-context learning works at all. Nobody programmed them; they emerge.`,
    },
    {
      type: 'intuition',
      title: 'Split, do not copy — the mechanics',
      md: `The obvious guess is wrong, and the correction is the point of this section.

- Wrong guess: "h heads means h full-width attentions, so h× the compute." No.
- What actually happens: d_model is **cut into h slices** of width d_k = d_model / h. Each head attends inside its own slice only.
- GPT-2 small: d_model = 768, h = 12, so d_k = 64. GPT-3: d_model = 12288, h = 96, d_k = 128. The slice width barely changes as models grow — the head *count* grows.
- Then **concatenate** the h outputs (each T × d_k) back into one T × d_model tensor, and multiply by one more learned matrix W_O.
- Cost: h heads × (T² · d_k) = h · T² · (d_model/h) = T² · d_model. **Identical FLOPs to a single head of width d_model.** Multi-head is free. State that in an interview — most people assume it is a cost.
- Parameters are unchanged too: W_Q, W_K, W_V, W_O are each d_model × d_model → 4·d_model² per layer, **whatever h is**. In code you do not even build h small matrices; you build one big one and reshape.`,
    },
    {
      type: 'math',
      intro: 'The definition, and the free-lunch arithmetic that surprises people.',
      latex: [
        '\\text{head}_i = \\text{Attention}\\!\\left(XW^Q_i,\\; XW^K_i,\\; XW^V_i\\right) \\in \\mathbb{R}^{T \\times d_k}, \\qquad d_k = d_{\\text{model}} / h',
        '\\text{MultiHead}(X) = \\text{Concat}\\!\\left(\\text{head}_1, \\ldots, \\text{head}_h\\right) W^O, \\qquad W^O \\in \\mathbb{R}^{d_{\\text{model}} \\times d_{\\text{model}}}',
        '\\text{score FLOPs} \\;=\\; h \\cdot T^2 d_k \\;=\\; h \\cdot T^2 \\frac{d_{\\text{model}}}{h} \\;=\\; T^2 d_{\\text{model}} \\quad \\text{(same as one head of full width)}',
        '\\text{params} = 4\\, d_{\\text{model}}^2 \\;\\; \\text{— independent of } h. \\quad d_{\\text{model}}{=}768 \\Rightarrow 2.36\\text{M per layer}',
      ],
    },
    {
      type: 'intuition',
      title: 'The shape walk (and the transposes nobody warns you about)',
      md: `Every multi-head implementation is the same five shape moves. Learn them as a sentence and you can write the layer from memory. B = batch, T = tokens, d = d_model.

1. **Project.** X is (B, T, d). One matmul with a (d, d) matrix gives Q — still (B, T, d). All h heads live inside that last axis, side by side. You never loop over heads.
2. **Split.** Reshape (B, T, d) → (B, T, h, d_k), then **transpose axes 1 and 2** → (B, h, T, d_k). The transpose is what makes the head axis a batch axis, so the next matmul runs all heads at once.
3. **Score.** (B, h, T, d_k) @ (B, h, d_k, T) → (B, h, T, T). That inner transpose is just Kᵀ from L0, now with two leading batch dims. Mask here, softmax here.
4. **Mix.** (B, h, T, T) @ (B, h, T, d_k) → (B, h, T, d_k). One context vector per head per token.
5. **Merge.** Transpose back → (B, T, h, d_k), reshape → (B, T, d). **That reshape IS the concatenation** — no special concat call, the heads were always neighbours in memory. Then @ W_O → (B, T, d).

Output shape equals input shape, which is the property that lets you stack the block 96 times.`,
    },
    {
      type: 'note',
      md: 'What is W_O actually for? Up to step 5 the heads have never spoken to each other — head 3 computed its 64 numbers with zero knowledge of head 7. The concatenated vector is a stack of h independent opinions in h disjoint slices. W_O is the mixer: a full d × d matrix that lets every output dimension read from every head. Delete W_O and the residual stream receives h unmixed fragments, and the next layer\'s Q/K/V projections have to do that job instead. It is also the reason heads can afford to be narrow specialists — something downstream is paid to combine them.',
    },
    {
      type: 'intuition',
      title: 'Causal masking: do not let the student see the answer key',
      md: `Now the second half. A GPT is trained on exactly one task: **given tokens 1..i, predict token i+1.**

- During training the whole sentence is already in the tensor. Token 5's row of the score matrix can reach token 6, 7, 8 — the very things it is being asked to predict.
- If it looks, the task becomes copying. Training loss collapses to nearly zero and the model learns nothing, because at generation time there is no token 6 yet. It has memorized how to read ahead, and the future is gone.
- The fix is one line: for every row *i*, set the score of every column *j > i* to **−∞ before the softmax**. Position *i* may attend to positions ≤ *i* only — itself and the past.
- Geometrically: keep the lower triangle including the diagonal, kill the strict upper triangle. Every implementation is some spelling of a triangular mask.
- Note the asymmetry this creates. Token 1 sees one token; token 500 sees 500. Early positions genuinely have less to work with — that is real, not a bug.`,
    },
    {
      type: 'hinglish',
      md: `Training ke waqt poora sentence model ke saamne rakha hota hai — har line, har agla word, sab. Lekin niyam ek hi hai: **har token sirf apne se pehle waalon ko dekh sakta hai.** Position 5 ko position 6 ki bhanak bhi nahi lagni chahiye.

Kyun? Kyunki hum use *agla* word guess karna sikha rahe hain. Agar usne agla word pehle hi dekh liya, to wo seekh nahi raha — wo **answer sheet saamne rakh ke exam de raha hai.** Training loss zero, aur asli test mein bilkul fail — kyunki generation ke waqt future hota hi nahi, wahan sirf ab tak likha hua hota hai.

Isliye mask lagta hai: score matrix ke upper triangle pe −∞, softmax se **pehle**. Future dekhna mana hai.`,
    },
    {
      type: 'intuition',
      title: 'Why −∞ and not zero (the follow-up question)',
      md: `Interviewers ask this because it separates "I know the mask exists" from "I know where it goes".

- Softmax is exp-then-normalize. exp(−∞) = 0 **and it contributes 0 to the denominator** — so the surviving weights renormalize among themselves and still sum to exactly 1.
- Zero the weights *after* softmax instead and the arithmetic quietly breaks: you removed mass from a distribution that had already normalized, so row *i* now sums to less than 1.
- Concretely: a row over 4 tokens might softmax to [0.4, 0.3, 0.2, 0.1]. Mask the last two after the fact → [0.4, 0.3, 0, 0], summing to 0.7. Token *i*'s output is a 0.7-weighted average — silently scaled down, differently for every position.
- Nothing crashes. The loss just plateaus higher and you spend a day on the learning rate. This is a "trains but wrong" bug, the expensive kind.
- In practice you write a large negative number instead of literal −∞ (−1e9, or the dtype minimum) — in fp16, −inf arithmetic can produce NaN, and −65504 is already zero after exp. Same effect, safer numerics.`,
    },
    {
      type: 'math',
      intro: 'Mask before, not after. The middle line is the whole argument.',
      latex: [
        '\\text{Causal: } \\; S_{ij} \\leftarrow -\\infty \\;\\; \\text{for } j > i, \\qquad \\text{then } A = \\text{softmax}(S) \\;\\; \\text{row-wise}',
        'e^{-\\infty} = 0 \\;\\Rightarrow\\; A_{ij} = 0 \\;\\; (j > i), \\qquad \\sum_{j \\le i} A_{ij} = 1 \\quad \\text{(still a valid distribution)}',
        '\\text{Zeroing after softmax: } \\;\\; \\sum_{j \\le i} A_{ij} < 1 \\;\\Rightarrow\\; \\text{every row shrinks by a different factor}',
      ],
    },
    { type: 'visual', component: 'AttentionHeatmap', props: {} },
    {
      type: 'note',
      md: 'Flip the causal-mask switch and watch two things happen at once. First, the entire upper-right triangle goes to zero — "it" can no longer reach "was" or "tired", only backwards to "cat". Second, and this is the part to actually stare at: the *remaining* cells in each row get **darker**. Nothing was added to them; the −∞ cells simply stopped taking a share of the softmax denominator, so the survivors renormalize to 1. Row 1 ends up a single cell of weight 1.0 — the first token has nothing to attend to but itself. And remember this grid is ONE head; a real layer runs 12 to 96 of these simultaneously on the same sentence, each with its own triangle and its own opinions.',
    },
    {
      type: 'intuition',
      title: 'The payoff: T predictions from one forward pass',
      md: `The mask looks like a restriction. It is actually the reason transformers train fast — and this is the answer most candidates miss.

- Feed a sequence of T tokens through a masked decoder **once**. Row 1 of the output saw tokens 1..1, row 2 saw 1..2, row T saw 1..T.
- So every row is a legitimate next-token prediction from a legitimate prefix. **One forward pass = T training examples**, and the loss is the mean cross-entropy over all T positions.
- An RNN gets the same T examples only by taking T sequential steps, each waiting on the last. No amount of GPU helps; the dependency is in the algorithm.
- The transformer replaces that with a couple of big matmuls. This is the trade from L0 — O(n) sequential depth swapped for O(n²) parallel width — and the mask is what makes the parallel version *honest*.
- One honest caveat: this gift is **training only**. Generation is still one token at a time, because token 501 does not exist until you have sampled it. That asymmetry — parallel training, sequential inference — is why the KV-cache exists (inference module).`,
    },
    {
      type: 'note',
      md: 'Padding masks are a different mask, and you usually need both. Batching sentences of unequal length means padding the short ones with PAD tokens; a padding mask blocks every row from attending to those PAD **columns**. Two differences: the causal mask is the same triangle for every sequence in the batch, shape (1, 1, T, T); the padding mask depends on each sequence\'s real length, shape (B, 1, 1, T). You combine them (mask if either says mask) and apply once. Two gotchas worth knowing: a fully-masked row makes softmax compute −inf minus −inf → NaN, so guard rows that have nothing left; and PAD *rows* still produce outputs — garbage ones — which is why the loss must be masked too, not just the attention.',
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Multi-head causal attention, end to end, shapes printed at every step',
      code: `import numpy as np

def softmax(s):
    e = np.exp(s - s.max(axis=-1, keepdims=True))
    return e / e.sum(axis=-1, keepdims=True)

B, T, d_model, h = 1, 5, 8, 2
d_k = d_model // h                        # 4 - heads SPLIT d_model, they do not copy it

rng = np.random.default_rng(0)
X = rng.normal(size=(B, T, d_model))
Wq, Wk, Wv, Wo = (rng.normal(size=(d_model, d_model)) * 0.3 for _ in range(4))

Q, K, V = X @ Wq, X @ Wk, X @ Wv           # ONE matmul each, all heads at once
print("1. X            ", X.shape)
print("2. Q / K / V    ", Q.shape, "d_k =", d_k)

def split(t):                              # (B,T,d_model) -> (B,h,T,d_k)
    return t.reshape(B, T, h, d_k).transpose(0, 2, 1, 3)

Qh, Kh, Vh = split(Q), split(K), split(V)
print("3. per head     ", Qh.shape, "(B, h, T, d_k)")

S = Qh @ Kh.transpose(0, 1, 3, 2) / np.sqrt(d_k)    # (B,h,T,T)
print("4. scores       ", S.shape)

mask = np.triu(np.ones((T, T), dtype=bool), k=1)    # True strictly ABOVE the diagonal
S = np.where(mask, -np.inf, S)                      # -inf BEFORE softmax
W = softmax(S)
print("5. weights      ", W.shape)
print("6. row sums h0  ", W[0, 0].sum(-1))
print("7. masked max   ", W[0][:, mask].max(), "<- exactly zero, both heads")
print("8. head 0 rows  ", np.round(W[0, 0], 3).tolist())
print("9. head 1 rows  ", np.round(W[0, 1], 3).tolist())

ctx = W @ Vh                                        # (B,h,T,d_k)
ctx = ctx.transpose(0, 2, 1, 3).reshape(B, T, d_model)   # CONCAT the heads back
print("10. concat      ", ctx.shape)
out = ctx @ Wo
print("11. after W_O   ", out.shape, "same as X:", out.shape == X.shape)

# ---------- real output ----------
# 1. X             (1, 5, 8)
# 2. Q / K / V     (1, 5, 8) d_k = 4
# 3. per head      (1, 2, 5, 4) (B, h, T, d_k)
# 4. scores        (1, 2, 5, 5)
# 5. weights       (1, 2, 5, 5)
# 6. row sums h0   [1. 1. 1. 1. 1.]
# 7. masked max    0.0 <- exactly zero, both heads
# 8. head 0 rows   [[1.0, 0.0, 0.0, 0.0, 0.0], [0.437, 0.563, 0.0, 0.0, 0.0],
#                   [0.443, 0.225, 0.332, 0.0, 0.0], [0.285, 0.303, 0.213, 0.199, 0.0],
#                   [0.216, 0.083, 0.345, 0.178, 0.178]]
# 9. head 1 rows   [[1.0, 0.0, 0.0, 0.0, 0.0], [0.907, 0.093, 0.0, 0.0, 0.0],
#                   [0.304, 0.411, 0.285, 0.0, 0.0], [0.243, 0.191, 0.333, 0.233, 0.0],
#                   [0.315, 0.131, 0.139, 0.118, 0.298]]
# 10. concat       (1, 5, 8)
# 11. after W_O    (1, 5, 8) same as X: True`,
      annotations: {
        8: 'Integer division, and it must divide evenly. d_model=8 with h=2 gives d_k=4 — two heads of width 4, NOT two heads of width 8. This one line is the whole "multi-head is free" story.',
        12: 'Four (8, 8) matrices. Note there is no per-head matrix anywhere in this file — h never appears in a parameter shape. 4*d_model^2 regardless of head count.',
        14: 'One matmul produces all heads\' queries at once. The heads exist only as a future reshape of this tensor\'s last axis.',
        19: 'The transpose gymnastics. reshape carves the last axis into (h, d_k); the transpose lifts h next to the batch axis so every later matmul treats "head" as just another batch dimension.',
        24: 'Kh.transpose(0,1,3,2) is L0\'s K-transpose with two leading batch dims. Result (B, h, T, T): one T-by-T grid PER HEAD. This is the O(T^2) tensor everything else in this module is about.',
        27: 'np.triu(..., k=1) is True strictly above the diagonal — j > i. k=0 would also mask the diagonal, forbidding a token from seeing itself, which breaks the model.',
        28: 'The entire causal mask. Before softmax, not after. In fp16 you would use -1e9 instead of -inf to avoid NaN.',
        32: 'The proof: the maximum weight anywhere in the masked region, across both heads, is exactly 0.0 — not 1e-9, not "small". exp(-inf) is precisely zero.',
        34: 'Compare row 2 across the heads: head 0 says [0.437, 0.563], head 1 says [0.907, 0.093]. Same tokens, same layer, two different opinions — with random weights. Trained heads diverge far more.',
        37: 'Transpose back, then reshape. THIS is the concatenation from the paper — the heads were adjacent in memory the whole time, so "concat" costs nothing.',
        39: 'W_O: the only place the heads mix. Everything above ran in h sealed lanes.',
      },
    },
    {
      type: 'intuition',
      title: 'Three masks, three architectures',
      md: `Which cells of the T × T grid you allow is the entire difference between the model families.

- **Bidirectional / encoder (BERT).** No mask. Every token sees every token, past and future. Perfect for classification, NER, retrieval embeddings — you have the whole input up front. It cannot generate left-to-right, so BERT is trained by masking out random *tokens* (masked language modelling), a different trick with a confusingly similar name.
- **Causal / decoder (GPT).** Triangular mask. Every token sees itself and the past. This is what makes autoregressive generation possible at all.
- **Cross-attention (encoder–decoder: T5, translation, Whisper).** A third arrangement: **Q comes from the decoder, K and V come from the encoder's output.** The decoder asks "what in the source is relevant to the word I am writing now?" The score matrix is T_dec × T_enc — not square, and not causal, because the entire source sentence is legitimately available. The decoder's *self*-attention in the same block is still causal.
- So an encoder–decoder block runs three attentions with three mask policies: encoder self (none), decoder self (causal), decoder→encoder cross (none, but padding-masked on the source).`,
    },
    {
      type: 'intuition',
      title: 'The bill: what that T × T grid costs',
      md: `The score matrix is not parameters. It is activation memory, materialized fresh for every batch, every layer.

- Size = B · h · T² · bytes. Do it for a real model: T = 8192, h = 32, batch 1, fp16 → 32 · 8192² · 2 bytes = **4 GiB, for one layer**. Multiply by depth and batch size and an 80 GB GPU is gone before the weights are loaded.
- At T = 2048 the same formula gives 256 MiB. Four times the context, **sixteen** times the memory — quadratic, exactly as advertised.
- **FlashAttention** is the honest fix and it is not an approximation. Same softmax, same numbers, computed in tiles that stay in the GPU's fast SRAM so the full T × T matrix is never written to slow HBM at all (using the online-softmax trick to normalize incrementally). Attention is memory-bandwidth-bound, so this is a large speedup *and* it drops score memory from O(T²) to O(T). If a candidate calls FlashAttention an approximation, that is the tell.
- **MQA / GQA** solve a different problem — inference memory, not training memory: share one (MQA) or a few (GQA) K/V heads across all query heads to shrink the KV-cache. Covered properly in the inference module.
- Order of operations in an interview: exact kernels (FlashAttention) first, cheap architectural fixes (GQA, sliding windows) second, approximate attention only when forced.`,
    },
    {
      type: 'note',
      md: 'What is still missing before this is a transformer block: the mask fixes *direction* but attention is still order-blind inside the allowed region — position 3 and position 7 are distinguishable only because one is masked out of the other\'s row, not because the math knows "3" and "7". Positional encodings are next. After that: residual connections, LayerNorm placement, and the FFN — which together turn this layer into a block you can stack.',
    },
  ],
  quiz: [
    {
      question: 'A model has d_model = 512 and h = 8 heads. What is d_k, and how do the FLOPs compare to a single head of width 512?',
      options: [
        { text: 'd_k = 512, and it costs 8× more', explanation: 'This is the common wrong mental model — heads are not 8 full-width copies. d_model is split, not duplicated.' },
        {
          text: 'd_k = 64, and it costs the same',
          explanation: 'Correct. 512/8 = 64, and h · T²·d_k = 8 · T²·64 = T²·512 — identical to one full-width head. Multi-head buys expressiveness for free.',
        },
        { text: 'd_k = 64, and it costs 8× less', explanation: 'Each head is 8× cheaper, but there are 8 of them. The factors cancel exactly — same total, not less.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is one attention head insufficient, in one precise sentence?',
      options: [
        { text: 'One head does not have enough parameters', explanation: 'Parameter count is 4·d_model² whether h is 1 or 96 — capacity is identical. The limit is structural, not capacity.' },
        { text: 'One head cannot be trained stably', explanation: 'A single head trains fine. It is simply less expressive per position.' },
        {
          text: 'One head produces one probability distribution per token, so it can express only one relationship — everything else competes for the same budget of 1.0',
          explanation: 'Correct. Row-softmax forces a zero-sum choice. h heads give h independent distributions, which is how coreference, syntax and previous-token patterns coexist.',
        },
      ],
      correct: 2,
    },
    {
      question: 'What exactly does the reshape in step 5 — (B, T, h, d_k) → (B, T, d_model) — correspond to in the paper?',
      options: [
        {
          text: 'Concat(head_1, …, head_h) — the heads are already adjacent in memory, so concatenation is a free reinterpretation of the bytes',
          explanation: 'Correct. There is no concat call in real implementations; the layout does the work. Only W_O afterwards actually mixes them.',
        },
        { text: 'Averaging the heads', explanation: 'Averaging would destroy the per-head specialization. The outputs are laid end to end, not blended — blending is W_O\'s job.' },
        { text: 'Summing the heads', explanation: 'Summing collapses h·d_k numbers into d_k. Concatenation keeps all h·d_k = d_model of them.' },
      ],
      correct: 0,
    },
    {
      question: 'You mask the causal region by zeroing the attention weights AFTER softmax instead of before. What goes wrong?',
      options: [
        { text: 'Nothing — the masked positions are zero either way', explanation: 'The masked entries are indeed zero. The damage is to the entries that survive.' },
        {
          text: 'Each row now sums to less than 1, so every token\'s output is a differently-shrunk average — it trains, badly, without ever erroring',
          explanation: 'Correct, and it is the dangerous kind of bug. Masking to −∞ before softmax removes those terms from the denominator, so the survivors renormalize to exactly 1.',
        },
        { text: 'The gradients become NaN immediately', explanation: 'No NaN appears; the values stay finite and the run looks healthy. That is precisely why the bug survives for days.' },
      ],
      correct: 1,
    },
    {
      question: 'With a causal mask, how many next-token training signals does ONE forward pass over a length-T sequence produce?',
      options: [
        { text: '1 — only the final position has a valid prediction', explanation: 'That would waste 99% of the compute. Every row is already conditioned on a valid prefix.' },
        { text: 'T/2 on average', explanation: 'There is no halving anywhere. Every one of the T rows is usable.' },
        {
          text: 'T — every row i saw exactly tokens 1..i, so every row is a legitimate prediction of token i+1',
          explanation: 'Correct, and this is the whole training-speed story. An RNN gets the same T signals only via T sequential steps. Loss = mean cross-entropy over all T positions.',
        },
      ],
      correct: 2,
    },
    {
      question: 'In an encoder–decoder model\'s cross-attention layer, where do Q, K and V come from?',
      options: [
        {
          text: 'Q from the decoder, K and V from the encoder output',
          explanation: 'Correct. The decoder asks "what in the source matters for the word I am writing?" — the source supplies both the labels (K) and the content (V). Score matrix is T_dec × T_enc.',
        },
        { text: 'All three from the encoder', explanation: 'That is the encoder\'s own self-attention layer, which also exists — but it is not cross-attention.' },
        { text: 'Q and K from the decoder, V from the encoder', explanation: 'K and V must come from the same sequence: K is the label for the content V advertises. Splitting them across sequences is meaningless.' },
      ],
      correct: 0,
    },
    {
      question: 'T = 8192, h = 32 heads, batch 1, fp16. Roughly how much memory does the score matrix alone need, per layer?',
      options: [
        { text: 'About 4 MiB', explanation: 'Off by a thousand. 8192² is already 67 million entries — per head.' },
        {
          text: 'About 4 GiB',
          explanation: 'Correct: 32 · 8192² · 2 bytes = 4 GiB, for ONE layer, batch size 1. Multiply by depth and batch and this is why long context is an infrastructure problem.',
        },
        { text: 'About 4 TiB', explanation: 'Too high by ~1000×. At 4 TiB per layer nobody would have shipped 8k context at all.' },
      ],
      correct: 1,
    },
    {
      question: 'Which statement about FlashAttention is correct?',
      options: [
        { text: 'It approximates attention by dropping low scores, trading a little quality for speed', explanation: 'That describes sparse/approximate attention. FlashAttention drops nothing.' },
        { text: 'It replaces softmax with a cheaper kernel function', explanation: 'That describes linear-attention variants (Performer and friends). FlashAttention keeps softmax exactly.' },
        {
          text: 'It computes mathematically identical attention with an IO-aware tiled kernel, never materializing the full T × T matrix in slow memory',
          explanation: 'Correct — same numbers, different memory traffic, using online softmax to normalize incrementally. It is a memory/bandwidth win, not an approximation. Calling it approximate is a red flag in interviews.',
        },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why multi-head attention instead of a single head? And does it cost more?',
      answer:
        'Expressiveness per position, at zero extra cost. A single head produces one row-softmax per token — one probability distribution — so it can encode exactly one notion of relevance; putting weight on the coreferent noun takes weight away from the governing verb, because they share a budget of 1.0. h heads give h independent distributions, so different relations can be captured simultaneously. Empirically heads specialize into recognizable roles: previous-token heads, positional heads, syntactic heads, and induction heads that complete "…A B … A → B" and underpin much of in-context learning. On cost: d_model is SPLIT into h slices of d_k = d_model/h, so the score matmuls total h·T²·(d_model/h) = T²·d_model — identical FLOPs to one full-width head — and parameters are 4·d_model² regardless of h. The real costs are second-order: a very large h makes each head too narrow to represent anything (d_k of 8 or 16 starts hurting), and attention becomes more memory-bound.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through the tensor shapes of a multi-head attention layer, including the transposes.',
      answer:
        'Input X is (B, T, d). (1) Project: X @ W_Q, a single (d, d) matmul, giving (B, T, d) — all heads already live inside that last axis. (2) Split: reshape to (B, T, h, d_k) then transpose axes 1 and 2 to (B, h, T, d_k); the transpose is what turns "head" into an extra batch dimension so every subsequent matmul processes all heads at once. (3) Score: (B, h, T, d_k) @ (B, h, d_k, T) → (B, h, T, T), divide by √d_k, apply the mask, row-softmax. (4) Mix: @ V gives (B, h, T, d_k). (5) Merge: transpose back to (B, T, h, d_k) and reshape to (B, T, d) — that reshape IS the concat, because the heads were contiguous all along — then @ W_O → (B, T, d). Output shape equals input shape, which is what allows stacking. Two things to say unprompted: nothing loops over heads, and √d_k uses the per-head width, not d_model.',
      isCaseBased: false,
    },
    {
      question: 'What is W_O for? Could we drop it?',
      answer:
        'Up to the concat, the h heads are completely independent — head 3 computed its d_k numbers with no knowledge of head 7, and they occupy disjoint slices of the output vector. W_O is a d × d learned matrix that lets every output dimension read from every head, so the layer emits one mixed representation rather than h stapled-together fragments. You can technically drop it — the model still runs — but you have then pushed the mixing onto the next layer\'s Q/K/V projections, which now see a block-structured input, and you have removed a full d² of capacity from the block. Useful framing: W_O is also what makes narrow specialist heads viable, because something downstream is explicitly paid to recombine them. A nice extra: mathematically you can view MultiHead as a sum over heads of head_i · W_O_i, where W_O is sliced row-wise per head — each head writes its own additive contribution into the residual stream.',
      isCaseBased: false,
    },
    {
      question: 'Explain causal masking, why it is needed, and why the −∞ goes before softmax rather than zeroing weights after.',
      answer:
        'A decoder is trained on next-token prediction, but during training the whole sequence is in the tensor at once, so position i\'s score row can reach positions i+1…T — the answers. Without a mask the model learns to read ahead, training loss collapses, and at generation time the future does not exist, so it fails completely. The mask sets S_ij = −∞ for j > i, keeping the lower triangle including the diagonal. It must go before softmax because softmax is exp-then-normalize: exp(−∞) = 0 contributes nothing to the DENOMINATOR, so the remaining weights renormalize and each row still sums to exactly 1. Zeroing after softmax removes mass from an already-normalized distribution — a row that softmaxed to [0.4, 0.3, 0.2, 0.1] becomes [0.4, 0.3, 0, 0], summing to 0.7 — so every token\'s output is a differently-shrunk average. Nothing crashes; the model just trains to a worse optimum, which is the expensive kind of bug. Implementation note: use a large negative constant (−1e9 or dtype min) rather than literal −inf in fp16, where −inf arithmetic can yield NaN.',
      isCaseBased: false,
    },
    {
      question: 'Why do transformers train so much faster than RNNs? Give the answer that mentions the mask.',
      answer:
        'Two reasons, and the second is the one people forget. First, gradient path length: any-to-any attention connects distant tokens in one step instead of an RNN\'s many multiplicative steps. Second, and decisively: with a causal mask, ONE forward pass over a length-T sequence yields T next-token training signals simultaneously — row i saw exactly tokens 1..i, so it is a valid prediction of token i+1, and the loss is the mean cross-entropy over all T positions. The mask is what makes those T parallel predictions honest; without it they would all be cheating. An RNN obtains the same T signals only through T sequential steps that cannot be parallelized no matter how many GPUs you have. The honest caveat: this parallelism is training-only. Generation remains sequential because token 501 does not exist until sampled — which is exactly why the KV-cache exists and why inference optimization is a separate discipline from training optimization.',
      isCaseBased: false,
    },
    {
      question: 'Padding masks and causal masks — what is the difference and do you need both?',
      answer:
        'They answer different questions and yes, a batched decoder typically needs both. The causal mask enforces "no looking forward": a T × T lower triangle, identical for every sequence in the batch, shape (1, 1, T, T), broadcast. The padding mask enforces "PAD tokens carry no information": it blocks the columns corresponding to padded positions, depends on each sequence\'s real length, and has shape (B, 1, 1, T). You combine them with a logical OR and apply once before softmax. Three practical points: (1) a row where everything is masked makes softmax compute −inf minus −inf → NaN, so guard fully-masked rows; (2) PAD rows still emit outputs, so the LOSS must also be masked — masking attention alone lets garbage positions contribute gradient; (3) left-padding versus right-padding matters at generation time, because with right-padding the "last real token" is not at index −1. Modern alternative worth mentioning: packing sequences with a block-diagonal mask instead of padding at all, which wastes no compute.',
      isCaseBased: false,
    },
    {
      question: 'Encoder, decoder, encoder–decoder — what actually differs, and when do you pick each?',
      answer:
        'The difference is entirely which cells of the score grid are allowed. Encoder (BERT-style) is bidirectional: no mask, every token sees the full input. Best for classification, NER, extractive QA, and retrieval embeddings — anything where the whole input is available and you want the richest representation. It cannot generate left-to-right, so it is pretrained with masked language modelling (masking random tokens, a different thing from causal masking despite the name). Decoder (GPT-style) is causal: triangular mask, token i sees ≤ i. This is what makes autoregressive generation possible, and it turned out to scale into a general-purpose model, which is why decoder-only dominates today. Encoder–decoder (T5, translation, Whisper) runs both plus cross-attention, where Q comes from the decoder and K/V from the encoder output, giving a non-square T_dec × T_enc score matrix that is not causally masked because the whole source is legitimately available. Pick encoder–decoder when input and output are genuinely different sequences with a strong alignment — translation, speech-to-text, summarization — otherwise decoder-only with the source in the prompt is simpler and benefits from all the scaling work.',
      isCaseBased: false,
    },
    {
      question: 'Case: your team wants to extend context from 4k to 32k tokens. The training job OOMs immediately. Diagnose and give a ranked plan.',
      answer:
        'Do the arithmetic first, out loud: score memory is B·h·T²·bytes per layer, so 4k → 32k is 8× context and 64× that term. At h=32, T=32768, fp16, batch 1 that is 32·32768²·2 ≈ 64 GiB per layer — an entire GPU for one layer\'s scores. That is the OOM, and it is attention activations, not weights. Ranked plan: (1) FlashAttention — exact same math, tiled in SRAM, never materializes T × T in HBM; drops that term to O(T) and is usually also faster. Do this first, it costs nothing in quality. (2) Gradient checkpointing on the blocks — recompute activations in the backward pass, roughly +30% compute for a large memory win. (3) Reduce batch size and recover the effective batch with gradient accumulation — free apart from wall-clock. (4) Mixed precision / bf16 if not already on. (5) Only now architectural changes: sliding-window or block-sparse attention (gives up direct long-range links; mitigate with a few global tokens), or GQA (mainly an inference-memory win, but it does shrink K/V activations). (6) Sequence-parallel / ring attention across devices if you have the interconnect. Say the ordering principle explicitly: exact-kernel and scheduling wins before anything that changes what the model can represent.',
      isCaseBased: true,
    },
    {
      question: 'Case: a colleague\'s from-scratch GPT reaches near-zero training loss within one epoch, but generates gibberish. Where do you look first?',
      answer:
        'Near-zero loss with useless generation is the signature of label leakage, and in a decoder there is essentially one place it comes from: the causal mask. Check in this order. (1) Is there a mask at all — and is it applied to the scores BEFORE softmax, inside the attention function, not bolted on outside? (2) Off-by-one on the triangle: triu with k=0 masks the diagonal (a token cannot see itself — this hurts but does not leak), while tril/triu inverted or k=1 in the wrong direction leaks the next token outright. (3) The target shift: inputs must be tokens[:-1] and targets tokens[1:]. If the model is fed the target as input, the mask is irrelevant — it is being asked to copy. (4) A single-line diagnostic that settles it: run the model on a sequence, then perturb ONLY token j and confirm the logits at every position i < j are bit-identical. If any earlier position moves, information is flowing backwards from the future. (5) Also confirm the mask is applied in every layer and in eval mode too. This test is worth writing as a unit test; it catches masking regressions that no loss curve will.',
      isCaseBased: true,
    },
    {
      question: 'How many parameters and how much activation memory does one multi-head attention layer use? Be precise about which is which.',
      answer:
        'Parameters: W_Q, W_K, W_V, W_O, each d_model × d_model, so 4·d_model² (plus 4·d_model with biases) — completely independent of h, because heads are a reshape, not extra matrices. For d_model = 768 that is about 2.36M per layer; GPT-2 small has 12 such layers, so ~28M in attention, with the FFNs contributing about twice that. Activation memory is a different budget entirely: the score matrix is B·h·T²·bytes per layer, materialized fresh every batch and kept until the backward pass, plus B·T·d for each of Q, K, V and the output. At T=8192, h=32, fp16, batch 1, the scores alone are 4 GiB per layer. The distinction is the point of the question: parameters are fixed and scale with d_model²; activations scale with batch and T² and are what actually causes OOM. It is also why FlashAttention (which attacks activations) and quantization (which attacks parameters) are complementary rather than competing.',
      isCaseBased: false,
    },
    {
      question: 'Case: an interpretability team reports that ablating one specific head in your 24-layer model drops in-context learning accuracy from 80% to 45%, while ablating a random head changes nothing. What is going on, and what do you do with that?',
      answer:
        'That profile — one head with an outsized, task-specific effect while most heads are individually redundant — is the classic induction-head signature. Induction heads implement a copy rule: scan backwards for a previous occurrence of the current token A, then attend to whatever followed it (B), and predict B. They typically appear in pairs across consecutive layers (a previous-token head feeding an induction head) and their emergence during training coincides with a visible jump in in-context learning ability. Verify before believing: plot that head\'s attention pattern on a repeated random-token sequence — an induction head lights up a clean off-diagonal stripe — and check whether a previous-token head in an earlier layer is feeding it. What to do with it: (1) do NOT prune it in any pruning pass, and audit the pruning criterion, since most heads being ablation-insensitive is exactly why naive magnitude pruning kills the important ones; (2) treat it as a monitoring signal — if a finetune degrades few-shot performance, check whether it damaged this circuit; (3) resist over-claiming: heads are distributed and the circuit is usually several components, so "this one head does in-context learning" is a headline, not a mechanism. The honest interview framing is that this is real, reproducible research, and also that single-head ablation overstates single-head causality.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Why more than one head?', back: 'One head = one row-softmax = one distribution = one relationship per token. h heads give h independent distributions, so coreference, syntax and previous-token patterns coexist instead of competing for the same budget of 1.0.' },
    { front: 'd_k and the cost of multi-head', back: 'd_k = d_model / h — heads SPLIT d_model, they do not copy it. h·T²·d_k = T²·d_model: identical FLOPs to one full-width head. Params stay 4·d_model², independent of h.' },
    { front: 'The multi-head shape walk', back: '(B,T,d) → project → reshape (B,T,h,d_k) → transpose (B,h,T,d_k) → scores (B,h,T,T) → mix (B,h,T,d_k) → transpose+reshape (B,T,d) → @W_O. The final reshape IS the concat.' },
    { front: 'What W_O does', back: 'The only place heads mix. Each head wrote into its own disjoint slice; W_O (d × d) lets every output dimension read every head. Without it the next layer inherits h unmixed fragments.' },
    { front: 'Causal mask', back: 'S_ij ← −∞ for j > i, before softmax. Strict upper triangle killed; token i sees itself and the past only. In fp16 use −1e9, not literal −inf.' },
    { front: 'Why −∞ before softmax, not zeroing after', back: 'exp(−∞)=0 removes those terms from the DENOMINATOR, so surviving weights renormalize to exactly 1. Zeroing after leaves rows summing to <1 — outputs silently shrink, trains but worse, never errors.' },
    { front: 'The training-speed payoff of the mask', back: 'One forward pass over T tokens = T next-token predictions (row i saw 1..i). An RNN needs T sequential steps. Training-only gift — generation is still one token at a time.' },
    { front: 'Padding mask vs causal mask', back: 'Causal: (1,1,T,T) triangle, same for all sequences. Padding: (B,1,1,T), blocks PAD columns, per-sequence. OR them together. Fully-masked row → NaN; mask the loss too.' },
    { front: 'Encoder vs decoder vs cross-attention', back: 'Encoder (BERT): no mask, bidirectional. Decoder (GPT): causal triangle. Cross-attention: Q from decoder, K/V from encoder, score matrix T_dec × T_enc, not causal.' },
    { front: 'Attention memory + FlashAttention', back: 'Scores = B·h·T²·bytes per layer (T=8192, h=32, fp16 → 4 GiB/layer). FlashAttention: identical math, IO-aware tiling in SRAM, O(T) memory — a bandwidth win, NOT an approximation. MQA/GQA shrink the KV-cache at inference.' },
  ],
  mindmapMarkdown: `- Multi-Head Attention & Causal Masking
  - Why many heads
    - one row-softmax = one distribution = one relation
    - relations compete for budget 1.0
    - heads specialize: coreference, syntax, previous-token
    - induction heads: A B ... A -> B (in-context learning)
  - Mechanics
    - d_k = d_model / h (SPLIT, not copy)
    - GPT-2: 768/12 = 64 · GPT-3: 12288/96 = 128
    - concat heads then @ W_O
    - FLOPs h.T².d_k = T².d_model — same as single head
    - params 4.d_model², independent of h
  - Shape walk
    - project (B,T,d), heads live in last axis
    - reshape (B,T,h,d_k) then transpose -> (B,h,T,d_k)
    - scores (B,h,T,T), mask, softmax
    - mix -> (B,h,T,d_k)
    - transpose + reshape = concat -> (B,T,d)
    - @ W_O, output shape == input shape
  - W_O
    - heads never talk before it
    - mixes h disjoint slices into one representation
  - Causal masking
    - decoder: position i sees j <= i
    - upper triangle -> −∞ BEFORE softmax
    - exp(−∞)=0, denominator drops it, rows still sum to 1
    - zero AFTER softmax = rows sum < 1 = silent bug
    - use −1e9 in fp16 (−inf can NaN)
    - triu k=1, not k=0 (diagonal must survive)
  - Training payoff
    - 1 forward pass = T next-token predictions
    - loss = mean CE over all T positions
    - RNN needs T sequential steps
    - training-only: generation stays sequential -> KV-cache
  - Padding masks
    - (B,1,1,T) per-sequence vs (1,1,T,T) causal
    - OR them, apply once
    - fully-masked row -> NaN
    - mask the loss too
  - Architectures
    - encoder / BERT: no mask, bidirectional
    - decoder / GPT: causal triangle
    - cross-attention: Q decoder, K/V encoder, T_dec x T_enc
    - enc-dec block runs 3 attentions, 3 mask policies
  - The bill
    - scores = B.h.T².bytes per layer
    - T=8192, h=32, fp16 -> 4 GiB per layer
    - 4x context = 16x memory
    - FlashAttention: exact, IO-aware tiling, O(T) memory
    - MQA/GQA: inference KV-cache fix
    - order: exact kernels, then architecture, then approximation
  - Next
    - positional encodings (attention still order-blind)
    - residuals + LayerNorm + FFN = the block`,
}

export default m
