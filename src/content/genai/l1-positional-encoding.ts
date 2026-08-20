import type { Module } from '../types'

const m: Module = {
  id: 'genai-l1-positional-encoding',
  subjectId: 'genai',
  level: 1,
  title: 'Positional Encoding: Teaching Attention About Order',
  whyItMatters:
    'Attention is provably blind to word order — "dog bites man" and "man bites dog" are the same computation to it. Every transformer therefore ships a positional scheme, and which one it ships decides its context window. "Why RoPE?" and "how would you extend this model to 128k context?" are standard senior GenAI questions, and both are answered here.',
  estMinutes: 45,
  sections: [
    {
      type: 'intuition',
      title: 'The hole in attention: it cannot tell who bit whom',
      md: `Go back to the attention formula: softmax(QKᵀ/√d_k)·V. Now hunt for the token index in it.

- Q, K and V are made from token **content** — an embedding times a learned matrix.
- QKᵀ compares content against content. Softmax normalizes a row. The output is a weighted sum of V.
- At no point does anything read "this is token 3". The index never enters the arithmetic.
- Consequence: shuffle the input tokens and you get the **same outputs, shuffled the same way**. Nothing else changes.
- So "dog bites man" and "man bites dog" hand the layer the identical set of vectors, and the layer returns the identical set of vectors. A bare transformer is a **bag of words** with very expensive mixing.

This is not a bug you can patch with more layers. It is a symmetry of the function, and the only cure is to put position **into the inputs or into the score**.`,
    },
    {
      type: 'math',
      intro:
        'The proof is four lines. P is a permutation matrix — it has exactly one 1 per row and column, and PᵀP = I. Multiplying by P shuffles rows.',
      latex: [
        '\\text{Shuffled input: } \\tilde{X} = PX \\;\\Rightarrow\\; \\tilde{Q} = \\tilde{X}W_Q = PQ, \\quad \\tilde{K} = PK, \\quad \\tilde{V} = PV',
        '\\tilde{S} = \\tilde{Q}\\tilde{K}^\\top = PQ\\,(PK)^\\top = PQK^\\top P^\\top = P\\,S\\,P^\\top',
        '\\text{softmax is applied row-wise} \\;\\Rightarrow\\; \\mathrm{softmax}(PSP^\\top) = P\\,\\mathrm{softmax}(S)\\,P^\\top',
        '\\text{Attention}(PX) = P\\,\\mathrm{softmax}(S)\\,P^\\top P V = P\\,\\mathrm{softmax}(S)\\,V = P\\cdot\\text{Attention}(X)',
        '\\text{This is } \\textbf{permutation equivariance}: \\text{shuffle in} \\Rightarrow \\text{same answers, shuffled out.}',
      ],
    },
    {
      type: 'note',
      md: 'It is worse than "attention is order-blind". The FFN runs on each token separately, LayerNorm normalizes each token separately, the residual add is per token — **every** sublayer of a transformer block is permutation-equivariant. Stacking 80 blocks composes 80 equivariant functions and gets one equivariant function. There is no depth at which order magically appears.',
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Permutation equivariance, one frame at a time',
        notice: 'Watch the right column across frames 1 and 3. Same output vectors, just reordered — that is the whole problem.',
        leftLabel: 'input tokens',
        rightLabel: 'layer output',
        frames: [
          {
            note: 'Sentence 1: "dog bites man". Three embeddings go in, attention mixes them, three vectors come out.',
            stack: [
              { name: 'pos 1: dog', to: 'yd' },
              { name: 'pos 2: bites', to: 'yb' },
              { name: 'pos 3: man', to: 'ym' },
            ],
            heap: [
              { id: 'yd', value: 'y_dog', label: 'output 1' },
              { id: 'yb', value: 'y_bites', label: 'output 2' },
              { id: 'ym', value: 'y_man', label: 'output 3' },
            ],
          },
          {
            note: 'Ask what produced them: dot products between content vectors, a row softmax, a weighted sum. No step reads the number 1, 2 or 3.',
            stack: [
              { name: 'pos 1: dog', to: 'yd' },
              { name: 'pos 2: bites', to: 'yb' },
              { name: 'pos 3: man', to: 'ym' },
            ],
            heap: [
              { id: 'yd', value: 'y_dog', label: 'output 1' },
              { id: 'yb', value: 'y_bites', label: 'output 2' },
              { id: 'ym', value: 'y_man', label: 'output 3' },
            ],
          },
          {
            note: 'Sentence 2: "man bites dog". The exact same three vectors enter the layer — only their order changed.',
            stack: [
              { name: 'pos 1: man', to: 'ym' },
              { name: 'pos 2: bites', to: 'yb' },
              { name: 'pos 3: dog', to: 'yd' },
            ],
            heap: [
              { id: 'ym', value: 'y_man', label: 'output 1' },
              { id: 'yb', value: 'y_bites', label: 'output 2' },
              { id: 'yd', value: 'y_dog', label: 'output 3' },
            ],
          },
          {
            note: 'Flagged: y_dog is bit-for-bit identical in both sentences. Attention(PX) = P Attention(X). The model cannot tell who bit whom.',
            stack: [
              { name: 'pos 1: man', to: 'ym', danger: true },
              { name: 'pos 2: bites', to: 'yb', danger: true },
              { name: 'pos 3: dog', to: 'yd', danger: true },
            ],
            heap: [
              { id: 'ym', value: 'y_man', label: 'same as before', danger: true },
              { id: 'yb', value: 'y_bites', label: 'same as before', danger: true },
              { id: 'yd', value: 'y_dog', label: 'same as before', danger: true },
            ],
          },
          {
            note: 'The fix: add a position vector before the layer. Token 1 is now dog + p1, not dog. Content and slot are fused into one input.',
            stack: [
              { name: 'pos 1: dog + p1', to: 'zd' },
              { name: 'pos 2: bites + p2', to: 'zb' },
              { name: 'pos 3: man + p3', to: 'zm' },
            ],
            heap: [
              { id: 'zd', value: 'z_dog', label: 'output 1' },
              { id: 'zb', value: 'z_bites', label: 'output 2' },
              { id: 'zm', value: 'z_man', label: 'output 3' },
            ],
          },
          {
            note: 'Shuffle again. man + p1 is a vector the layer never saw before, so every output changes: w_dog is NOT z_dog. Order finally exists.',
            stack: [
              { name: 'pos 1: man + p1', to: 'wm' },
              { name: 'pos 2: bites + p2', to: 'wb' },
              { name: 'pos 3: dog + p3', to: 'wd' },
            ],
            heap: [
              { id: 'wm', value: 'w_man', label: 'differs' },
              { id: 'wb', value: 'w_bites', label: 'differs' },
              { id: 'wd', value: 'w_dog', label: 'differs' },
            ],
          },
        ],
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The proof in NumPy — same tokens, reversed order, identical outputs',
      code: `import numpy as np

def softmax(s):
    e = np.exp(s - s.max(-1, keepdims=True))
    return e / e.sum(-1, keepdims=True)

def attention(X, Wq, Wk, Wv):
    Q, K, V = X @ Wq, X @ Wk, X @ Wv
    return softmax(Q @ K.T / np.sqrt(Q.shape[-1])) @ V

rng = np.random.default_rng(0)
d = 8
Wq, Wk, Wv = (rng.normal(0, 0.5, (d, d)) for _ in range(3))
E = {w: rng.normal(0, 1, d) for w in ('dog', 'bites', 'man')}   # fixed embeddings

X1 = np.stack([E[w] for w in ['dog', 'bites', 'man']])
X2 = np.stack([E[w] for w in ['man', 'bites', 'dog']])          # same tokens, reversed
O1, O2 = attention(X1, Wq, Wk, Wv), attention(X2, Wq, Wk, Wv)

print("dog bites man -> out for dog:", np.round(O1[0][:4], 4))
print("man bites dog -> out for dog:", np.round(O2[2][:4], 4))
print("identical?                  :", np.allclose(O1[0], O2[2]))
print("whole output just permuted? :", np.allclose(O1, O2[::-1]))

P = np.stack([np.zeros(d), np.full(d, 0.6), np.full(d, 1.2)])   # crude position vectors
O1p = attention(X1 + P, Wq, Wk, Wv)
O2p = attention(X2 + P, Wq, Wk, Wv)
print("+position     -> out for dog:", np.round(O1p[0][:4], 4))
print("+position, shuffled sentence:", np.round(O2p[2][:4], 4))
print("still identical?            :", np.allclose(O1p[0], O2p[2]))

# ---------- real output ----------
# dog bites man -> out for dog: [-0.7349 -0.387   1.8715 -1.7373]
# man bites dog -> out for dog: [-0.7349 -0.387   1.8715 -1.7373]
# identical?                  : True
# whole output just permuted? : True
# +position     -> out for dog: [-0.606   0.0096 -0.2953 -1.4895]
# +position, shuffled sentence: [ 0.0333  0.5937 -1.6568 -0.3338]
# still identical?            : False`,
      annotations: {
        9: 'Scan this line for anything that reads a row index. There is nothing — only content dotted against content. That is the whole proof, in one line of code.',
        14: 'Each word maps to ONE fixed vector, so both sentences are assembled from the exact same three vectors. The only difference between X1 and X2 is order.',
        17: 'X2 is X1 with rows 0 and 2 swapped — a permutation matrix P applied to X, nothing more.',
        23: 'O2[::-1] undoes the swap. True means Attention(PX) = P·Attention(X) held exactly, to the last float bit.',
        25: 'Deliberately crude — a constant per position. Any per-position vector breaks the symmetry. The real schemes differ in how WELL the model can use it, not in whether it works at all.',
        30: 'False, and the outputs differ by up to 1.89. One addition per row, and word order exists.',
      },
    },
    {
      type: 'intuition',
      title: 'Three families of fix, and where each one injects position',
      md: `Everything invented since 2017 is one of three moves. Keep this map in your head — every interview answer hangs off it.

- **Absolute, added to the input.** Give position *p* a vector and add it to the token embedding, once, before layer 1. Sinusoidal (fixed formula) and learned (a trainable table) both live here.
- **Relative, added to the score.** Leave embeddings alone; add a term depending on (i − j) to the attention logit inside every layer. T5 bias and ALiBi live here.
- **Rotary, applied to Q and K.** Leave embeddings alone; rotate the query and key vectors by an angle proportional to their position, inside every layer. RoPE lives here — and it makes relative position fall out of the dot product for free.

The trend is left to right, and the reason is one word: **length generalization**. Language rules are relative ("the adjective sits just before the noun"), not absolute ("position 4096 is a verb").`,
    },
    {
      type: 'intuition',
      title: 'Sinusoidal encoding: a bank of clock hands',
      md: `The original Transformer paper needed a vector per position and chose a formula, not a table.

- Split the d dimensions into d/2 **pairs**. Pair *i* is a clock with its own speed θ_i, and the pair holds (sin, cos) of the angle *pos*·θ_i — a point on a circle.
- Speeds are **geometric**: θ_i = 1/10000^(2i/d). Pair 0 spins once every 2π positions; the last pair takes about 10000·2π positions to complete one turn.
- A fast hand alone is ambiguous (positions 1 and 7 look similar); a slow hand alone cannot resolve neighbours. Read all d/2 hands together and every position has a unique fingerprint — the same trick as a binary counter, with continuous digits.
- Zero parameters. Defined for any integer position, so you can compute it for position 50000 even if you never trained there.
- It is **added** to the token embedding, not concatenated. Concatenating would cost dimensions; adding relies on the model learning to keep a rough positional subspace. This is a hack that works, and it is fair to say so out loud.`,
    },
    {
      type: 'math',
      intro:
        'The formula, and the property that actually makes it useful: any two positions a fixed distance apart are related by one fixed linear map.',
      latex: [
        'PE_{(pos,\\,2i)} = \\sin\\!\\left(pos \\cdot \\theta_i\\right), \\qquad PE_{(pos,\\,2i+1)} = \\cos\\!\\left(pos \\cdot \\theta_i\\right), \\qquad \\theta_i = 10000^{-2i/d}',
        '\\begin{bmatrix} \\sin((pos{+}k)\\theta_i) \\\\ \\cos((pos{+}k)\\theta_i) \\end{bmatrix} = \\begin{bmatrix} \\cos k\\theta_i & \\sin k\\theta_i \\\\ -\\sin k\\theta_i & \\cos k\\theta_i \\end{bmatrix} \\begin{bmatrix} \\sin(pos\\,\\theta_i) \\\\ \\cos(pos\\,\\theta_i) \\end{bmatrix}',
        '\\text{The matrix contains } k \\text{ and does } \\textbf{not} \\text{ contain } pos \\Rightarrow \\text{one linear map shifts every position by } k.',
        'PE_{pos} \\cdot PE_{pos+k} = \\sum_{i=0}^{d/2-1} \\cos(k\\,\\theta_i) \\quad \\text{— a function of the gap } k \\text{ alone.}',
      ],
    },
    {
      type: 'note',
      md: 'That last line is the whole sales pitch. A linear layer — which is what W_Q and W_K are — can *learn* the shift matrix, so "look 3 tokens back" is representable. But note what it does **not** say: it does not say the model will learn it, and it does not say the relationship survives after W_Q, W_K and 40 layers of nonlinearity have had their way with it. The relative structure is *available*, not *enforced*. RoPE later closes exactly that gap.',
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Sinusoidal encodings, the fixed-distance relationship, and a RoPE rotation',
      code: `import numpy as np

def sinusoidal(n_pos, d, base=10000.0):
    pos = np.arange(n_pos)[:, None]              # (n, 1)
    i = np.arange(d // 2)[None, :]               # d/2 frequency pairs
    theta = pos / base ** (2 * i / d)            # (n, d/2) angle per pair
    PE = np.zeros((n_pos, d))
    PE[:, 0::2] = np.sin(theta)                  # even dims
    PE[:, 1::2] = np.cos(theta)                  # odd dims
    return PE

d = 16
PE = sinusoidal(8, d)
print("PE[0][:6]:", np.round(PE[0][:6], 4))
print("PE[1][:6]:", np.round(PE[1][:6], 4))
print("PE[5][:6]:", np.round(PE[5][:6], 4))

print("\\nPE[m] . PE[m+1], m = 0..5:", np.round([PE[m] @ PE[m + 1] for m in range(6)], 4))
print("PE[m] . PE[m+2], m = 0..5:", np.round([PE[m] @ PE[m + 2] for m in range(6)], 4))

th = 1.0 / 10000.0 ** (2 * np.arange(d // 2) / d)      # per-pair frequency
k = 3
for pair in (0, 3):
    a = th[pair] * k
    R = np.array([[np.cos(a), np.sin(a)], [-np.sin(a), np.cos(a)]])
    err = max(np.abs(R @ PE[m, 2 * pair:2 * pair + 2] - PE[m + k, 2 * pair:2 * pair + 2]).max()
              for m in range(5))
    print(f"pair {pair}: one fixed R(k=3) maps PE[m] -> PE[m+3] for all m, max err {err:.1e}")

def rope2d(v, pos, theta=0.7):                   # rotate a 2D slice by pos * theta
    a = pos * theta
    return np.array([[np.cos(a), -np.sin(a)], [np.sin(a), np.cos(a)]]) @ v

q, k_vec = np.array([1.0, 0.0]), np.array([0.6, 0.8])
print("\\nRoPE: dot(rotate(q, m), rotate(k, n)) -- plain q.k =", q @ k_vec)
for m, n in [(2, 0), (5, 3), (9, 7), (100, 98), (3, 5), (7, 9)]:
    print(f"  m={m:4d} n={n:3d}  m-n={m - n:3d}  dot={rope2d(q, m) @ rope2d(k_vec, n):+.6f}")

# ---------- real output ----------
# PE[0][:6]: [0. 1. 0. 1. 0. 1.]
# PE[1][:6]: [0.8415 0.5403 0.311  0.9504 0.0998 0.995 ]
# PE[5][:6]: [-0.9589  0.2837  0.9999 -0.0103  0.4794  0.8776]
#
# PE[m] . PE[m+1], m = 0..5: [7.4852 7.4852 7.4852 7.4852 7.4852 7.4852]
# PE[m] . PE[m+2], m = 0..5: [6.3683 6.3683 6.3683 6.3683 6.3683 6.3683]
# pair 0: one fixed R(k=3) maps PE[m] -> PE[m+3] for all m, max err 0.0e+00
# pair 3: one fixed R(k=3) maps PE[m] -> PE[m+3] for all m, max err 1.1e-16
#
# RoPE: dot(rotate(q, m), rotate(k, n)) -- plain q.k = 0.6
#   m=   2 n=  0  m-n=  2  dot=+0.890340
#   m=   5 n=  3  m-n=  2  dot=+0.890340
#   m=   9 n=  7  m-n=  2  dot=+0.890340
#   m= 100 n= 98  m-n=  2  dot=+0.890340
#   m=   3 n=  5  m-n= -2  dot=-0.686379
#   m=   7 n=  9  m-n= -2  dot=-0.686379`,
      annotations: {
        6: 'The geometric frequency ladder. Pair 0 gets angle = pos (fastest hand); the last pair gets angle = pos/10000 (barely moves across the whole context).',
        9: 'Even dim gets sin, odd dim gets cos of the SAME angle — so each pair is one point on a circle. Reading pairs as 2D points is what makes everything below work.',
        19: 'Both rows are constant across m. The dot product of two sinusoidal encodings depends on the GAP only, never on where the pair sits. Relative distance is measured, not asserted.',
        25: 'The shift matrix from the math block: it contains k, and does not contain m. One matrix per (pair, offset).',
        28: 'Errors at float64 noise level. A single fixed linear map really does carry every position to the one 3 steps later — which is why "attend 3 tokens back" is learnable.',
        32: 'RoPE in full, for one 2D slice. Production code does all d/2 rotations at once with an elementwise sin/cos trick, but this is the entire idea.',
        37: 'm=100, n=98 gives the SAME dot product as m=2, n=0 — absolute position cancelled, only m-n survived. And m-n = -2 gives a different value, so the rotation encodes direction, not just distance.',
      },
    },
    {
      type: 'intuition',
      title: 'The extrapolation claim, and the honest reality',
      md: `The 2017 paper hoped sinusoids would let a model "extrapolate to sequence lengths longer than the ones encountered during training". Sounds airtight: the formula is defined at every integer.

- It does not hold. Train on 512 and evaluate at 1024 and perplexity degrades sharply, often worse than a random baseline on the tail.
- Why: the model does not learn "sinusoids", it learns to read the *specific* patterns of superposition that occur in the range it saw. Past that range the combinations are out of distribution, and the attention logits go somewhere the FFN has never had to handle.
- Being *defined* at position 5000 is not the same as being *understood* at position 5000. This distinction is the single most useful thing to say when an interviewer brings up long context.
- The measurement that settled it came from the ALiBi paper (Press et al., 2021), which compared sinusoidal, rotary and learned encodings at lengths beyond training — all of them degraded, sinusoidal included.`,
    },
    {
      type: 'intuition',
      title: 'Learned absolute embeddings: a table, and a hard wall',
      md: `BERT, RoBERTa, GPT-2, GPT-3 and ViT all did the simplest possible thing: **make position a lookup table and train it**.

- \`nn.Embedding(max_position_embeddings, d)\`. Row *p* is the vector for position *p*, added to the token embedding.
- Cost is trivial: BERT-base is 512 × 768 ≈ 393k parameters against 110M total. Under 0.4%.
- It works well *inside* the trained range — often marginally better than sinusoidal, because the model gets to choose what a position vector means instead of being handed one.
- The wall: **there is no row 513**. Not "quality drops" — the tensor index is out of bounds and the forward pass raises. GPT-2 stops dead at 1024 tokens.
- Second problem, quieter: long sequences are rare in training data, so the last rows of the table get very few gradient updates. The tail of the table is undertrained even when it is legal.
- Getting past the wall means retraining or resizing the table, then finetuning. That is a training run, not a config change — which is exactly why the field moved on.`,
    },
    {
      type: 'intuition',
      title: 'Relative position: bias the score, not the input',
      md: `Both relative schemes drop the input vector entirely and edit the attention logit for the pair (i, j) instead — inside every layer, where the comparison actually happens.

- **T5-style bias:** add a *learned scalar* b to the logit for each token pair, indexed by a bucket of (i − j). Buckets are logarithmic — exact for offsets 1, 2, 3, then coarser, then one bucket for "far away". Shared across layers, a couple of hundred parameters per head. Unseen distances fall into the last bucket rather than crashing, so it degrades instead of breaking.
- **ALiBi:** no parameters at all. Subtract m·|i − j| from the logit, where m is a **fixed** per-head slope taken from a geometric series (1/2, 1/4, 1/8, …). A linear penalty for distance — literally "the further away, the less I care", with steep heads doing local work and shallow heads doing long-range work.
- Why relative wins at length generalization: at position 5000, an absolute scheme is asked about a *value* it never saw, while a relative scheme is asked about an *offset* — and offsets like 1, 5, 40 are exactly what it trained on. Only the very largest offsets are new.
- ALiBi's headline result: train at 1024, evaluate at 2048+, and perplexity holds. That is the number that made the field take relative position seriously.
- The cost: a strict recency prior is baked in. ALiBi is monotone in distance by construction, so it cannot express "the important token is 4000 back" as cleanly as a scheme that learns what matters.`,
    },
    {
      type: 'intuition',
      title: 'RoPE: stop adding, start rotating',
      md: `Rotary Position Embedding is what Llama, Mistral, Qwen, Gemma and DeepSeek all use. One idea, and it is geometric.

- Take the query vector q at position m. Split it into d/2 pairs, treat each pair as a 2D point, and **rotate** pair *i* by the angle m·θ_i. Same for the key vector k at position n, by n·θ_i.
- Rotations compose by adding angles, and a rotation matrix is orthogonal, so R_mᵀR_n = R_(n−m). Push that through the dot product and the absolute positions **cancel**: the score depends only on (m − n).
- So relative position is not a term you bolt on. It is a consequence of the geometry — you get it for free, exactly, in every head.
- Rotation preserves length, so position never inflates or shrinks a vector. Compare with adding a position vector, which changes both direction and magnitude and lets position leak into the value pathway.
- Applied to **Q and K only, never V**. V is content you are retrieving; only the matching should be position-aware.
- Applied **inside every attention layer**, after the Q/K projections, every time. Sinusoidal and learned schemes touch the input once and then hope the signal survives 80 layers. RoPE re-injects it at every comparison.
- Free bonus: because the fast pairs de-phase over distance, the expected score between far-apart tokens decays. A soft recency prior, not a hard one.`,
    },
    {
      type: 'math',
      intro: 'Two lines of algebra. R is a block-diagonal stack of d/2 plain 2D rotations, one per frequency pair.',
      latex: [
        'R_m^{(i)} = \\begin{bmatrix} \\cos m\\theta_i & -\\sin m\\theta_i \\\\ \\sin m\\theta_i & \\cos m\\theta_i \\end{bmatrix}, \\qquad \\theta_i = 10000^{-2i/d}, \\qquad R_m = \\mathrm{diag}\\big(R_m^{(0)}, \\ldots, R_m^{(d/2-1)}\\big)',
        '\\langle R_m q,\\; R_n k \\rangle = (R_m q)^\\top (R_n k) = q^\\top R_m^\\top R_n k = q^\\top R_{n-m}\\, k',
        '\\text{because } R_m^\\top = R_m^{-1} = R_{-m} \\text{ and } R_{-m}R_n = R_{n-m} \\quad (\\text{rotations add their angles})',
        '\\Rightarrow \\; \\text{score}(m, n) = f(q, k, \\; n - m) \\quad \\text{: absolute position has cancelled out of the logit.}',
        '\\lVert R_m q \\rVert_2 = \\lVert q \\rVert_2 \\quad \\text{: rotation is orthogonal, so position never changes a magnitude.}',
      ],
    },
    {
      type: 'note',
      md: 'Interview trap worth pre-loading: RoPE is often described as "absolute encoding that behaves relatively", and that is the precise phrasing. You compute it from the **absolute** index m (cheap, cacheable, works with a KV cache — you rotate each key once when you write it into the cache and never touch it again), but what the attention score can actually *see* is the **relative** offset. Getting both properties from one operation is why it won.',
    },
    {
      type: 'intuition',
      title: 'Stretching a model past its trained length',
      md: `A RoPE model trained at 4k does not crash at 8k — the angles are still defined, they are just angles the model has never seen. Three fixes, in the order they were invented.

1. **Position interpolation (PI).** Squeeze positions instead of extending them: feed m·(L_train/L_target) instead of m. Every angle stays inside the trained range. Costs ~1000 steps of finetuning; costs some fine-grained resolution, so short-context quality dips slightly. You crammed 8000 positions into 4000 positions' worth of angular room.
2. **NTK-aware scaling.** PI squeezes all frequencies equally, which is wasteful — the fast pairs encode local order and should not be touched. Instead raise the RoPE **base** (10000 → larger): low frequencies stretch a lot, high frequencies barely move. Often gives 2–4× context with *no* finetuning at all, which is why "just change rope_theta" became a community reflex.
3. **YaRN.** The engineered combination: interpolate the low-frequency pairs, leave the high-frequency pairs alone, blend in between, and add a temperature correction to the attention logits (entropy rises when you stuff in more tokens). Best quality per finetuning token of the three, and what most long-context open models actually shipped.

The honest note: **all three degrade.** A model advertised at 128k usually has a much shorter *effective* context. Passing a needle-in-a-haystack retrieval test at 128k is not evidence it can reason over 128k — retrieval is the easy task. Measure on your own workload before believing the number on the model card.`,
    },
    {
      type: 'math',
      intro: 'The three knobs as formulas, plus the bill that actually stops you.',
      latex: [
        '\\text{Position interpolation: } m \\;\\mapsto\\; m \\cdot \\frac{L_{\\text{train}}}{L_{\\text{target}}} \\quad \\text{(every frequency squeezed by the same factor } s)',
        '\\text{NTK-aware: } \\theta_i = b^{-2i/d} \\text{ with } b: 10^4 \\;\\mapsto\\; 10^4 \\cdot s^{\\,d/(d-2)} \\quad \\text{(slow pairs stretch, fast pairs barely move)}',
        '\\text{Prefill attention} \\;\\propto\\; T^2 \\qquad \\text{KV cache bytes} = 2 \\cdot L \\cdot H_{kv} \\cdot d_h \\cdot T \\cdot \\text{bytes/elem}',
        '\\text{Llama-3-8B (}L{=}32,\\, H_{kv}{=}8,\\, d_h{=}128,\\, \\text{fp16)}: \\;\\; 2\\cdot32\\cdot8\\cdot128\\cdot2 = 128\\,\\text{KB per token} \\;\\Rightarrow\\; 1\\,\\text{GB at } T = 8192',
      ],
    },
    {
      type: 'intuition',
      title: 'What a "context window" actually is',
      md: `It is not one number. It is two independent limits that happen to be quoted as one, and an interviewer will check whether you know that.

- **Limit 1 — the positional limit.** For a learned table it is a hard wall (no row 1025). For sinusoidal and RoPE it is a soft wall: legal to compute, but out of distribution, so quality falls off. This is the limit the extension tricks above attack.
- **Limit 2 — the compute and memory budget.** Attention is O(T²) in the prefill (see the self-attention module: doubling context quadruples the score matrix), and the KV cache is O(T) per layer *per request*, held for the whole generation.
- Doubling context is therefore never free: **4× prefill attention FLOPs, 2× KV cache memory, 2× time-to-first-token**, and every one of those is per concurrent user. KV cache is what caps your batch size, and batch size is what caps your throughput and margin.
- Which is why long context is an infrastructure question as much as a modelling one — GQA, sliding-window attention, FlashAttention and cache offloading exist to make limit 2 survivable while PI/NTK/YaRN attack limit 1.
- The one-liner: *"Context length is a positional-encoding limit and an O(T²) attention budget wearing the same label. Extending the first is a finetune; extending the second is a bill."*`,
    },
    {
      type: 'note',
      md: 'Where each scheme sits today. **RoPE**: Llama 1/2/3, Mistral, Mixtral, Qwen, Gemma, DeepSeek, Phi — the default for anything new. **ALiBi**: BLOOM, MPT, Baichuan-13B — a small, deliberate camp. **T5 relative bias**: T5 and its descendants. **Learned absolute**: BERT, RoBERTa, GPT-2, GPT-3, ViT — everything older, and still the norm in vision transformers. **Sinusoidal**: the 2017 Transformer, plus a second life encoding *timesteps* in diffusion models. One genuine curiosity: decoder-only models with **no** positional encoding at all can still learn order, because the causal mask makes position-1 (which sees one token) structurally different from position-500 (which sees five hundred). Real result, not production practice.',
    },
    {
      type: 'note',
      md: 'What you should be able to build after this module, concretely: the sinusoidal table and the RoPE rotation, from scratch, in NumPy — both are above and both run. What stays conceptual here: the extension methods (PI, NTK, YaRN) are described, not implemented, because verifying them honestly needs a trained model and a perplexity sweep. Say "I have implemented sinusoidal and RoPE; I understand YaRN" in an interview, never the other way round.',
    },
  ],
  quiz: [
    {
      question: 'You feed a bare attention layer (no positional encoding) the tokens [A, B, C], then feed it [C, B, A]. What is true of the outputs?',
      options: [
        {
          text: 'The outputs are the same three vectors, in the reversed order',
          explanation:
            'Correct. Attention(PX) = P·Attention(X) — permutation equivariance. The set of output vectors is unchanged; only their positions in the output move.',
        },
        { text: 'The outputs are completely different vectors', explanation: 'Nothing in QKᵀ, softmax or the V-weighted sum reads an index, so no content-level difference can arise.' },
        { text: 'The outputs are identical in the same order (permutation invariant)', explanation: 'Close but wrong word. Invariant would mean the output does not move at all. Attention is equivariant: the output moves WITH the input.' },
        { text: 'The softmax normalization breaks, giving NaN', explanation: 'Softmax is per-row and content-based. Reordering rows reorders results; it never destabilizes anything.' },
      ],
      correct: 0,
    },
    {
      question: 'Why can stacking more transformer blocks not fix the order-blindness on its own?',
      options: [
        { text: 'It can, given enough depth and data', explanation: 'It cannot. Composing equivariant functions gives an equivariant function — this is a property of the function class, not a capacity shortfall.' },
        { text: 'Deeper models overfit before they learn order', explanation: 'Overfitting is unrelated. Even an infinitely large, perfectly trained stack stays equivariant.' },
        {
          text: 'Every sublayer — attention, FFN, LayerNorm, residual — is itself permutation-equivariant, and composing equivariant maps stays equivariant',
          explanation:
            'Correct. FFN and LayerNorm act per token, the residual add is per token, attention is equivariant. Position has to be injected into the inputs or into the score.',
        },
        { text: 'Gradients vanish before order information reaches the early layers', explanation: 'There is no order information anywhere in the network to propagate. This is not an optimization problem.' },
      ],
      correct: 2,
    },
    {
      question: 'What is the key property of sinusoidal encodings that makes relative offsets learnable?',
      options: [
        { text: 'Every position vector has unit norm', explanation: 'Each (sin, cos) pair has norm 1, so the full vector has norm √(d/2) — constant, but that is not the property that carries relative distance.' },
        { text: 'The values are bounded in [−1, 1] so they do not swamp the embedding', explanation: 'True and practically useful, but a bounded random vector per position would also be bounded and would carry no relative structure at all.' },
        {
          text: 'PE(pos + k) = R_k · PE(pos), where R_k is one fixed linear map depending on k but not on pos',
          explanation:
            'Correct. A block-diagonal 2D rotation shifts every position by k. Since W_Q and W_K are linear, "look k tokens back" is representable. The code section verifies it to float64 noise.',
        },
        { text: 'The encodings are orthogonal between any two distinct positions', explanation: 'They are not orthogonal — PE(m)·PE(m+k) = Σ cos(kθ_i), which is generally nonzero, and that is exactly what makes it useful.' },
      ],
      correct: 2,
    },
    {
      question: 'A model uses learned absolute position embeddings with max_position_embeddings = 1024. You feed it 1500 tokens. What happens?',
      options: [
        { text: 'Quality degrades gracefully past token 1024', explanation: 'That is the sinusoidal/RoPE failure mode — soft. A lookup table has no row to degrade toward.' },
        {
          text: 'It errors — there is no embedding row for position 1024 and above',
          explanation:
            'Correct, and it is the practical distinction interviewers probe. A learned table is a hard wall: index out of range. Getting past it means resizing the table and finetuning, i.e. a training run.',
        },
        { text: 'The table wraps around and reuses position 0', explanation: 'Nothing implements wrap-around — and if it did, tokens 1024 and 0 would be indistinguishable, which is worse than erroring.' },
        { text: 'The last row is repeated for every extra position', explanation: 'Not standard behaviour. It would also make all 476 extra tokens positionally identical.' },
      ],
      correct: 1,
    },
    {
      question: 'In RoPE, why does the attention score between positions m and n depend only on (m − n)?',
      options: [
        { text: 'Because the rotation angles are subtracted before the dot product is taken', explanation: 'No subtraction is coded anywhere. Each vector is rotated independently by its own absolute position.' },
        { text: 'Because RoPE is applied to Q, K and V alike, so absolute terms cancel in the weighted sum', explanation: 'RoPE is deliberately NOT applied to V, and the cancellation happens in the logit, not the value mix.' },
        { text: 'Because θ_i is chosen small enough that absolute position is negligible', explanation: 'The cancellation is exact for every θ. It is algebra, not an approximation.' },
        {
          text: 'Because rotation matrices are orthogonal and compose by adding angles: (R_m q)ᵀ(R_n k) = qᵀR_mᵀR_n k = qᵀR_(n−m) k',
          explanation:
            'Correct. R_mᵀ = R_(−m), and R_(−m)R_n = R_(n−m). Absolute position cancels exactly, in every head, at every layer — verified numerically in the code section (m=100, n=98 matches m=2, n=0).',
        },
      ],
      correct: 3,
    },
    {
      question: 'ALiBi adds what to the attention logit for the token pair (i, j)?',
      options: [
        {
          text: 'A fixed, non-learned linear penalty −m·|i − j|, with m a per-head slope from a geometric series',
          explanation:
            'Correct. Zero parameters, a built-in recency prior, and heads with different slopes cover local vs long-range. Trains at 1024 and holds perplexity past 2048.',
        },
        { text: 'A learned scalar per bucketed distance, shared across layers', explanation: 'That is T5-style relative bias. Similar family, but ALiBi learns nothing and uses no buckets.' },
        { text: 'A rotation of the query and key vectors by an angle proportional to i and j', explanation: 'That is RoPE — a different family that edits the vectors, not the logit.' },
        { text: 'A sinusoidal vector indexed by |i − j|', explanation: 'ALiBi uses no sinusoids and no vectors; it is a single scalar subtracted from a scalar logit.' },
      ],
      correct: 0,
    },
    {
      question: 'Why does NTK-aware scaling usually preserve short-context quality better than plain position interpolation?',
      options: [
        { text: 'It uses more finetuning steps, so the model recovers what interpolation loses', explanation: 'Backwards — NTK-aware scaling is popular precisely because it often needs NO finetuning.' },
        { text: 'It increases the number of frequency pairs, adding positional resolution', explanation: 'Neither method changes d or the number of pairs; both only change angles.' },
        {
          text: 'PI squeezes every frequency by the same factor, blurring the fast pairs that encode local order; NTK-aware raises the base so slow pairs stretch and fast pairs barely move',
          explanation:
            'Correct. Local word order lives in the high-frequency pairs, and those are exactly the ones PI compresses. Raising the base concentrates the stretch where it costs least.',
        },
        { text: 'It switches the model from absolute to relative encoding', explanation: 'RoPE is already relative in its effect. Both methods just rescale angles within RoPE.' },
      ],
      correct: 2,
    },
    {
      question: 'Doubling a model\'s context window from 8k to 16k costs which of these, per request?',
      options: [
        { text: '2× attention FLOPs in prefill and 2× KV cache memory', explanation: 'The KV cache part is right, but attention prefill is quadratic — doubling T quadruples the score matrix.' },
        { text: '4× attention FLOPs in prefill and 4× KV cache memory', explanation: 'Attention is right; the KV cache is not. The cache stores K and V per token per layer, so it grows linearly in T.' },
        {
          text: '4× attention FLOPs in prefill and 2× KV cache memory',
          explanation:
            'Correct. Prefill attention is O(T²) while the KV cache is O(T). For Llama-3-8B at 128 KB per token, 8k → 16k moves the cache from 1 GB to 2 GB per concurrent request — which is what caps batch size.',
        },
        { text: 'Nothing measurable — it is only a config change in the positional encoding', explanation: 'The positional side may be a config change (rope_theta); the compute and memory side is a hardware bill that never goes away.' },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Prove that self-attention is permutation-equivariant, on a whiteboard.',
      answer:
        'Let P be a permutation matrix (one 1 per row and column, PᵀP = I) and feed X̃ = PX. Projections are linear so Q̃ = X̃W_Q = PQ, and likewise K̃ = PK, Ṽ = PV. The scores become S̃ = PQ(PK)ᵀ = PQKᵀPᵀ = PSPᵀ, i.e. S with rows and columns permuted. Softmax is applied row-wise, so it commutes with that: softmax(PSPᵀ) = P·softmax(S)·Pᵀ. Multiply by Ṽ = PV, and PᵀP collapses to I: output = P·softmax(S)·V = P·Attention(X). Shuffle in, same answers shuffled out. Then land the two follow-ups: this is equi-variance, not in-variance (the outputs do move with the input), and every other sublayer — FFN, LayerNorm, residual — is per-token and therefore also equivariant, so no amount of depth fixes it. Position must be injected into the input embeddings or into the score itself.',
      isCaseBased: false,
    },
    {
      question: 'Explain sinusoidal positional encoding and the one property that justifies the sinusoids.',
      answer:
        'Split d into d/2 pairs; pair i holds (sin(pos·θ_i), cos(pos·θ_i)) with θ_i = 10000^(−2i/d), a geometric ladder of frequencies from wavelength 2π up to about 10000·2π. Reading all pairs together gives every position a unique fingerprint — a binary counter with continuous digits. The justification is the shift property: [sin((pos+k)θ), cos((pos+k)θ)] equals a fixed 2×2 rotation R_k times [sin(pos·θ), cos(pos·θ)], and R_k depends on k but never on pos. So one fixed linear map carries every position to the one k steps later, and since W_Q and W_K are linear, "attend k tokens back" is representable. Equivalently PE(pos)·PE(pos+k) = Σ_i cos(kθ_i), a function of the gap alone. Then the honest caveat that separates a good answer from a great one: this makes relative structure available, not enforced — it must survive the projections and the nonlinearities, and empirically it degrades. RoPE later makes the same relationship exact and unavoidable.',
      isCaseBased: false,
    },
    {
      question: 'Why did the field move from learned absolute embeddings to RoPE? Give the concrete failure that forced it.',
      answer:
        'Learned absolute embeddings are a table: row p, added at the input, trained end to end. They work well and cost almost nothing (BERT-base: 512 × 768 ≈ 393k params, under 0.4% of the model). Two failures killed them. First, the hard wall — there is no row beyond max_position_embeddings, so GPT-2 simply cannot accept token 1025; getting past it means resizing the table and finetuning, i.e. a training run rather than a config change. Second, the tail of the table is undertrained, because few training sequences reach maximum length. RoPE fixes both: it is a formula, so no table and no wall, and because the score depends only on (m−n), a model at position 5000 is being asked about offsets it has seen thousands of times rather than about an absolute value it has never seen. Add the practical wins — it is norm-preserving, it is applied inside every layer instead of once at the input, and it composes cleanly with a KV cache since you rotate each key once on write.',
      isCaseBased: false,
    },
    {
      question: 'Case: you have a Llama-class model trained at 4k context and product wants 32k next quarter. Walk through your options and what each costs.',
      answer:
        'Separate the two limits first, because they have different owners. Limit 1 is positional: RoPE angles beyond 4k are legal but out of distribution. Limit 2 is the bill: prefill attention is O(T²), so 4k→32k is 64× the score matrix, and the KV cache is linear — at roughly 128 KB per token for an 8B model, 32k is about 4 GB per concurrent request, which caps batch size and therefore margin. For limit 1, in ascending cost: (a) NTK-aware base scaling — change rope_theta, no finetuning, realistically buys 2–4×, evaluate immediately since it is free; (b) YaRN — interpolate the low-frequency pairs, leave the high ones, add the logit temperature correction, then a short finetune on long documents; best quality per token spent and what most open long-context models shipped; (c) plain position interpolation plus ~1000 finetune steps, simplest but blurs local resolution and dents short-context quality; (d) continued pretraining at 32k, best result and by far the most expensive. For limit 2: FlashAttention (exact, do it first), GQA if the architecture allows, sliding-window or chunked prefill, KV cache quantization, prefix caching for repeated system prompts. Then the discipline: hold out a real long-context eval on YOUR task, not needle-in-a-haystack — retrieval passes long after reasoning has broken, and the model card number is a ceiling, not a promise.',
      isCaseBased: true,
    },
    {
      question: 'Why is RoPE applied to Q and K but not V? What would break if you rotated V too?',
      answer:
        'Q and K exist to be compared; V is the payload you retrieve. Rotating Q and K is what makes the logit depend on (m−n) — that is the entire mechanism. Rotating V instead injects position into the content being summed, so the output of a token would carry a position-dependent distortion of other tokens\' meanings, and the residual stream would accumulate that distortion layer after layer. You also lose a clean property: attention output should be a mix of what tokens MEAN, not of where they sat. Concretely, since attention output is Σ_j w_ij R_n_j v_j, each value arrives rotated by a different angle, so identical content at different positions no longer sums coherently — you would be averaging vectors that point in different directions for a reason unrelated to meaning. Note the contrast with additive schemes: adding a position vector at the input DOES leak position into V, since V is projected from the modified embedding. That leak is one of the quieter reasons additive encodings are worse.',
      isCaseBased: false,
    },
    {
      question: 'The 2017 paper claimed sinusoidal encodings might extrapolate to longer sequences. Do they? Explain the gap between the claim and reality.',
      answer:
        'They do not, and the gap is between "defined" and "understood". The formula gives a valid vector at position 50000, so nothing crashes — but the model never learned to read sinusoids as sinusoids. It learned to read the specific superposition patterns present in the range it trained on. Beyond that range, the combination of phases is out of distribution, attention logits land in regions the FFN was never trained to handle, and perplexity degrades sharply. The ALiBi paper (Press et al., 2021) measured this directly across sinusoidal, rotary and learned encodings past their training length; all degraded. The general lesson worth stating: a positional scheme being mathematically defined at position p tells you nothing about the model behaving sensibly at p, and this is why extension methods like PI, NTK-aware scaling and YaRN all include a finetuning or recalibration step rather than just widening a bound.',
      isCaseBased: false,
    },
    {
      question: 'Compare ALiBi and RoPE. When would you actually pick ALiBi?',
      answer:
        'ALiBi edits the logit: subtract m·|i−j| with m a fixed per-head slope from a geometric series. Zero parameters, trivially implemented, and it extrapolates well — train at 1024, hold perplexity past 2048. RoPE edits the vectors: rotate Q and K by angles proportional to position, so the logit depends exactly on (m−n) while norms are preserved. RoPE is strictly more expressive: ALiBi is monotone in distance by construction, so it can only ever say "closer matters more", while RoPE can learn head-specific patterns that are not distance-monotone — which matters for retrieval-style tasks where the important token is genuinely far away. That expressiveness is why every frontier open model went RoPE, and why the ecosystem (kernels, extension methods, serving stacks) is built around it. Pick ALiBi when extrapolation with zero effort is the dominant requirement and the task is locality-friendly — streaming, sliding-window inference, or a small model that must accept variable and unpredictable lengths without any finetuning budget. It is a deliberate simplicity trade, not a mistake.',
      isCaseBased: false,
    },
    {
      question: 'Case: your RAG system retrieves 30 chunks into a 32k prompt. Recall on chunks in the middle of the prompt is poor, while the first and last chunks are used well. Diagnose.',
      answer:
        'This is lost-in-the-middle, and it is primarily positional, not a retrieval bug — verify that first by checking whether the same chunk is used correctly when it is placed first. Contributing causes: (1) RoPE\'s long-distance decay gives a mild recency prior, so late chunks are advantaged; (2) attention-sink behaviour makes the first few tokens disproportionately attended, advantaging the start; (3) if the model\'s context was extended by PI or YaRN, the mid-range positions are exactly where interpolation cost the most resolution and where long-context finetuning data was thinnest. Fixes, cheapest first: retrieve fewer, better chunks — 30 chunks in 32k is usually a reranking failure, and 5 good chunks beat 30 mediocre ones on both quality and cost; rerank and order deliberately, putting the strongest evidence at the start and end; label each chunk with an explicit source header so the model can address it by name rather than by position; restate the question after the context; and if the problem survives all that, chunk the prompt and run map-reduce rather than trusting one long forward pass. Measure with a positional sweep — put the same gold chunk at every slot and plot accuracy against position. That plot is also the thing to show a skeptical stakeholder.',
      isCaseBased: true,
    },
    {
      question: 'What is a "context window", precisely? Why is doubling it not free?',
      answer:
        'Two separate limits quoted as one number. Limit 1 is the positional-encoding validity range: a hard wall for a learned table (no row 1025) and a soft wall for sinusoidal or RoPE (computable, but out of distribution so quality falls). Limit 2 is the compute and memory budget: attention prefill is O(T²) in the sequence length, and the KV cache is O(T) per layer per request, held for the entire generation. So doubling T costs 4× prefill attention FLOPs, roughly 2× time-to-first-token, and 2× KV cache memory — the last one per concurrent user, which is what actually caps batch size and therefore throughput and unit economics. Concretely, Llama-3-8B with 32 layers, 8 KV heads, head dim 128, fp16 is 2·32·8·128·2 = 128 KB per token, so 8k tokens is 1 GB of cache for one request. Extending limit 1 is a finetune (PI, NTK-aware scaling, YaRN); surviving limit 2 is engineering (FlashAttention, GQA, sliding-window attention, cache quantization, prefix caching). Anyone who answers only the first half has not run a serving stack.',
      isCaseBased: false,
    },
    {
      question: 'Case: you fine-tune a model with rope_theta raised from 10000 to 500000 for long context. Long-document eval improves but your short-prompt chat benchmark drops 3 points. What happened and what do you do?',
      answer:
        'Raising the base stretches every frequency pair, most of all the slow ones — but the fast pairs still change somewhat, and those are the ones that encode fine-grained local order like "the adjective immediately before the noun". You bought long-range resolution with short-range resolution, and your short-prompt benchmark is measuring exactly the thing you spent. Also check a second, more mundane cause first: what was in the extension finetuning mix. If it was all long documents, you have plain catastrophic forgetting of the chat distribution, and the positional story is a red herring. Actions, in order: (1) confirm by evaluating the base-scaled model WITHOUT finetuning — if short-prompt quality is already down pre-finetune, it is positional; if it drops only after, it is the data mix. (2) If it is the data mix, blend the original short-context instruction data back in at 20–40% and re-run. (3) If it is positional, move from a raw base change to YaRN, which explicitly leaves the high-frequency pairs untouched and adds the attention temperature correction — this failure mode is precisely what YaRN was designed to fix. (4) If both models must exist, keep two adapters or two deployments and route by input length; it is unglamorous and it works. Name the general tradeoff: every context extension method trades positional resolution somewhere, and the only question is whether you get to choose where.',
      isCaseBased: true,
    },
    {
      question: 'Someone proposes concatenating a position vector to the embedding instead of adding it. Argue both sides.',
      answer:
        'For concatenation: it is cleaner in principle. Adding puts position and content in the same coordinates, which is destructive interference by construction — the model has to learn to disentangle two signals that were summed into one vector, and there is no guarantee it fully does. Concatenation keeps them in disjoint subspaces, so nothing is ever ambiguous. Against: it costs dimensions. Reserving even 64 of 768 dims for position removes 8% of the model\'s capacity for meaning in every layer, permanently, and increases every projection matrix. Empirically, adding works — the embedding space is high-dimensional and very sparsely occupied, so random-ish directions are close to orthogonal and the model does learn a rough positional subspace on its own. The honest summary is that adding is a hack that works and was never the interesting axis; the field improved by moving position out of the input entirely — into the score (ALiBi, T5) or into a rotation of Q and K (RoPE) — which sidesteps the add-versus-concat question completely. Worth noting: adding also leaks position into V, since V is projected from the modified embedding, and concatenation would too. Only score-level and rotary schemes avoid that.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Permutation equivariance, in one equation', back: 'Attention(PX) = P·Attention(X). Shuffle the tokens, get the same outputs shuffled the same way. FFN, LayerNorm and residuals are per-token too, so the whole block is equivariant — depth cannot fix it.' },
    { front: 'Sinusoidal encoding formula', back: 'PE(pos, 2i) = sin(pos·θ_i), PE(pos, 2i+1) = cos(pos·θ_i), with θ_i = 10000^(−2i/d). Zero parameters, added to the embedding once at the input.' },
    { front: 'The property that justifies sinusoids', back: 'PE(pos+k) = R_k · PE(pos): one fixed 2D rotation per pair, depending on k but not pos. So relative offsets are linearly recoverable. Equivalently PE(m)·PE(m+k) = Σ cos(kθ_i) — a function of the gap only.' },
    { front: 'Sinusoidal extrapolation: claim vs reality', back: 'Claim: the formula is defined at any position, so it should extrapolate. Reality: it degrades sharply past the trained length — the model learned the specific patterns it saw, not "sinusoids". Defined ≠ understood.' },
    { front: 'Learned absolute embeddings — the wall', back: 'A trainable table (BERT 512, GPT-2 1024). Cheap and effective in range, but no row beyond max_position_embeddings — a hard error, not a soft decline. Late rows are also undertrained.' },
    { front: 'T5 bias vs ALiBi', back: 'T5: learned scalar per log-bucketed (i−j), added to the logit, shared across layers. ALiBi: fixed −m·|i−j| penalty, m a per-head geometric slope, zero parameters, trains at 1024 and holds past 2048.' },
    { front: 'Why relative beats absolute for length generalization', back: 'At position 5000 an absolute scheme faces a value it never saw; a relative scheme faces an OFFSET, and offsets like 1, 5, 40 are exactly what it trained on. Language rules are relative anyway.' },
    { front: 'RoPE in one sentence', back: 'Rotate each 2D pair of Q and K by an angle proportional to the token position, inside every attention layer — never V, never the input embedding.' },
    { front: 'Why RoPE gives relative position for free', back: '(R_m q)ᵀ(R_n k) = qᵀR_mᵀR_n k = qᵀR_(n−m) k, since rotations are orthogonal and add their angles. Absolute position cancels exactly; norms are preserved because rotation is orthogonal.' },
    { front: 'Context extension: PI vs NTK vs YaRN', back: 'PI: scale m by L_train/L_target, squeezes all frequencies, needs finetuning. NTK-aware: raise the RoPE base so slow pairs stretch and fast pairs barely move, often no finetuning. YaRN: interpolate low frequencies only + logit temperature fix, best quality per finetune token. All degrade.' },
  ],
  mindmapMarkdown: `- Positional Encoding
  - The problem, proved
    - attention reads content, never an index
    - Attention(PX) = P Attention(X)
    - equivariant, not invariant
    - FFN + LayerNorm + residual all per-token
    - depth cannot fix it
    - "dog bites man" = "man bites dog"
  - Three families
    - absolute, added to the input
    - relative, added to the score
    - rotary, applied to Q and K
  - Sinusoidal (2017)
    - d/2 pairs = clock hands, geometric speeds
    - theta_i = 10000^(-2i/d)
    - unique fingerprint per position
    - PE(pos+k) = R_k PE(pos), R_k free of pos
    - PE(m).PE(m+k) = sum cos(k theta_i)
    - zero parameters, added not concatenated
    - extrapolation claimed, degrades in practice
  - Learned absolute
    - trainable table, BERT 512 / GPT-2 1024
    - cheap: 512x768 = 393k params
    - HARD wall past max_position_embeddings
    - tail rows undertrained
  - Relative position
    - T5: learned scalar per log-bucketed (i-j)
    - ALiBi: fixed -m|i-j|, per-head slopes, 0 params
    - offsets seen in training, values are not
    - ALiBi: train 1024, hold past 2048
    - cost: baked-in recency prior
  - RoPE (what modern models use)
    - rotate 2D pairs of q and k by pos * theta
    - (R_m q).(R_n k) = q R_(n-m) k
    - relative falls out of the geometry
    - orthogonal: norms preserved
    - Q and K only, never V
    - re-applied inside EVERY layer
    - long-distance decay = soft recency prior
  - Context extension
    - position interpolation: squeeze all frequencies
    - NTK-aware: raise the base, spare fast pairs
    - YaRN: interpolate slow pairs + logit temperature
    - all degrade; effective < advertised
  - What a context window is
    - limit 1: positional validity range
    - limit 2: O(T^2) prefill + O(T) KV cache
    - 2x context = 4x attention, 2x cache
    - Llama-3-8B: 128 KB/token, 1 GB at 8k
  - Who uses what
    - RoPE: Llama, Mistral, Qwen, Gemma, DeepSeek
    - ALiBi: BLOOM, MPT, Baichuan
    - learned absolute: BERT, GPT-2, GPT-3, ViT
    - sinusoidal: 2017 Transformer, diffusion timesteps`,
}

export default m
