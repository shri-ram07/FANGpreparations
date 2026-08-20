import type { Module } from '../types'

const m: Module = {
  id: 'genai-l1-transformer-block',
  subjectId: 'genai',
  level: 1,
  title: 'The Transformer Block & the Residual Stream',
  whyItMatters:
    'Attention gets the attention, but the block is what you actually build 12 or 96 copies of — and two of its details are pure interview currency: "why LayerNorm placement matters" and "count the parameters of this model". Both come out of the same picture: a residual stream that every sublayer reads from and adds back to. Get this module and you can draw GPT-2 from memory and reproduce its published parameter count on a whiteboard.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'A transformer is one block, copy-pasted',
      md: `You already have self-attention. A transformer is barely more than that, wrapped and repeated.

- The **block** is four moves: attention → Add&Norm → FFN (a small MLP) → Add&Norm.
- Input shape equals output shape. That single fact is what makes stacking legal.
- Stack N copies, each with its OWN weights (nothing is shared between blocks): GPT-2 small N=12, GPT-2 XL N=48, GPT-3 N=96, Llama-3 70B N=80.
- Around the stack: an embedding table at the bottom, a final norm and a linear head to vocabulary at the top. That is the entire architecture.
- So "the transformer" is not a big design. It is one small design and a for-loop. Everything interesting — depth, scale, emergent behaviour — comes from the loop count.`,
    },
    {
      type: 'intuition',
      title: 'The residual stream: the mental model that makes the rest obvious',
      md: `Do not picture a pipeline where each layer transforms the data and hands it on. Picture a **highway**.

- A wide vector (d numbers per token) runs from the embedding straight to the output head. That is the **residual stream**.
- Every sublayer does exactly three things: **read** the stream (a normalized copy of it), **compute** something, **add** the result back.
- Nothing overwrites. The stream at layer 12 is the embedding *plus* 24 accumulated contributions, all still summed together.
- The stream is the model's shared memory. Attention writes "who this token refers to"; the FFN writes "what I know about this token"; a later head reads what an earlier one wrote.
- Two consequences to keep: layers can be studied semi-independently (each is a separate additive term), and deleting one layer at inference usually **degrades** the model instead of breaking it — you removed one summand, not a link in a chain.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'The residual stream through two blocks',
        notice:
          'One token, a toy 3-number stream. Watch the LEFT column: every new value is the previous value PLUS a delta — never a replacement. The last frame deletes the skip connections so you can see what they were buying.',
        leftLabel: 'residual stream (one token)',
        rightLabel: 'what the sublayer computed',
        frames: [
          {
            note: 'The embedding writes the first value into the stream. From here to the output head this cell is only ever added to.',
            stack: [{ name: 'x0', value: '[1.0 0.0 0.0]' }],
            heap: [{ id: 'emb', value: 'token embedding', label: 'the writer' }],
          },
          {
            note: 'Block 1, sublayer 1. LayerNorm makes a normalized COPY, attention reads that copy and computes a delta. The stream itself has not moved yet.',
            stack: [{ name: 'x0', value: '[1.0 0.0 0.0]', to: 'a1' }],
            heap: [{ id: 'a1', value: '+[0.0 0.4 0.0]', label: 'attn delta' }],
          },
          {
            note: 'Add. x1 = x0 + delta = [1.0 0.4 0.0]. The 1.0 the embedding wrote is untouched — attention wrote into a direction nobody was using.',
            stack: [
              { name: 'x0', value: '[1.0 0.0 0.0]' },
              { name: 'x1', value: '[1.0 0.4 0.0]' },
            ],
            heap: [{ id: 'a1', value: '+[0.0 0.4 0.0]', label: 'added in' }],
          },
          {
            note: 'Same block, sublayer 2. The FFN reads the updated stream through its own LayerNorm. It sees ONE token at a time — no mixing across positions here.',
            stack: [{ name: 'x1', value: '[1.0 0.4 0.0]', to: 'f1' }],
            heap: [{ id: 'f1', value: '+[-.2 0.0 0.3]', label: 'ffn delta' }],
          },
          {
            note: 'Add again. x2 = [0.8 0.4 0.3]. Block 1 is done: two reads, two adds, zero overwrites. Eleven more blocks to go in GPT-2 small.',
            stack: [
              { name: 'x1', value: '[1.0 0.4 0.0]' },
              { name: 'x2', value: '[0.8 0.4 0.3]' },
            ],
            heap: [
              { id: 'f1', value: '+[-.2 0.0 0.3]', label: 'added in' },
              { id: 'blk', value: 'block 1 done', label: '1 of 12' },
            ],
          },
          {
            note: 'Block 2 is the SAME two moves on the SAME stream, with its own weights. Attention adds [0.0 0.2 -0.1], then the FFN adds [0.1 0.0 0.2].',
            stack: [
              { name: 'x2', value: '[0.8 0.4 0.3]', to: 'a2' },
              { name: 'x3', value: '[0.8 0.6 0.2]', to: 'f2' },
            ],
            heap: [
              { id: 'a2', value: '+[0.0 0.2 -.1]', label: 'attn 2' },
              { id: 'f2', value: '+[0.1 0.0 0.2]', label: 'ffn 2' },
            ],
          },
          {
            note: 'x4 = [0.9 0.6 0.4] = embedding + four deltas. Every contribution is still a separate summand — which is why ablating one layer degrades the model instead of killing it.',
            stack: [
              { name: 'x0', value: '[1.0 0.0 0.0]' },
              { name: 'x4', value: '[0.9 0.6 0.4]' },
            ],
            heap: [
              { id: 'sum', value: 'x0 + 4 deltas', label: 'accumulated' },
              { id: 'grad', value: 'grad has a +1 path', label: 'identity' },
            ],
          },
          {
            note: 'Now delete the skip connections: each sublayer OVERWRITES the stream. The embedding is gone by block 2, and the gradient must survive a product of Jacobians with no identity term. This is the wall that residuals removed.',
            stack: [
              { name: 'x0', value: '[1.0 0.0 0.0]', to: 'lost', danger: true },
              { name: 'x4', value: '[.03 0.0 -.01]', danger: true },
            ],
            heap: [
              { id: 'lost', value: 'overwritten', label: 'no residual', danger: true },
              { id: 'gz', value: 'grad -> 0', label: 'vanishing', danger: true },
            ],
          },
        ],
      },
    },
    {
      type: 'note',
      md: 'One thing the frames hide because they use three numbers: the real stream is 768 or 12288 numbers wide, and sublayers mostly write into *different directions* of it. That is why adding 24 corrections does not turn into mush — there is room. It is also the working assumption behind mechanistic interpretability: read the stream at layer L, subtract the stream at layer L−1, and you have isolated exactly what one sublayer contributed.',
    },
    {
      type: 'intuition',
      title: 'Why residuals matter here specifically',
      md: `You met skip connections in the DL subject, one module earlier: ResNet, 2015, the paper that made 100+ layer networks trainable. Same idea, same reason, new home.

- Backprop multiplies a Jacobian per layer. Without a skip, the gradient reaching layer 1 is a product of L matrices — it collapses or explodes.
- With **x + F(x)**, the derivative is **I + J**. The identity term is a route with derivative exactly 1, all the way from the loss to the embedding. Gradient highway.
- Second job, specific to transformers: without the skip, attention's output is a weighted **average** of Values — and averaging 12 times in a row blurs everything toward the mean. The skip means attention only ever adds a correction on top of the original token.
- Third job: it gives every layer a free identity function. A block that has nothing useful to say can output ~0 and cost nothing, so extra depth never actively hurts.
- Interview line: *"residual + pre-norm is what turned depth from a liability into a free parameter."*`,
    },
    {
      type: 'math',
      intro: 'The block in one line, then unrolled, then differentiated. Every claim above is in these three lines.',
      latex: [
        'h_\\ell = x_\\ell + \\text{Attn}\\big(\\text{LN}_1(x_\\ell)\\big), \\qquad x_{\\ell+1} = h_\\ell + \\text{FFN}\\big(\\text{LN}_2(h_\\ell)\\big)',
        'x_L = x_0 + \\sum_{\\ell=1}^{L} \\Big[ \\text{Attn}_\\ell(\\cdot) + \\text{FFN}_\\ell(\\cdot) \\Big] \\quad \\text{(the stream is a running sum)}',
        '\\frac{\\partial x_{\\ell+1}}{\\partial x_\\ell} = I + J_\\ell \\;\\Rightarrow\\; \\prod_{\\ell=1}^{L}\\big(I + J_\\ell\\big) = \\underbrace{I}_{\\text{undamped path}} + \\sum_\\ell J_\\ell + \\sum_{k > \\ell} J_k J_\\ell + \\cdots',
      ],
    },
    {
      type: 'intuition',
      title: 'The FFN: two matrices and a squash, and most of your parameters',
      md: `Attention moves information *between* tokens. The FFN then processes each token *alone*.

- It is a 2-layer MLP applied position-wise: **d → 4d → d**, with a non-linearity in the middle. Same weights for every token, every position.
- Why 4×? It is the original paper's choice (512 → 2048) that everyone kept because it works. The honest reasons: you need a wide hidden layer for the non-linearity to be worth anything, 4× sat at a good quality-per-FLOP point, and 4× keeps the tensor shapes GPU-friendly. Nothing deeper. Some modern models deviate (Llama uses ~2.7× with a 3-matrix SwiGLU).
- Activation: **GELU** in GPT-2/BERT, **SwiGLU** in Llama/PaLM/Mistral. Both are smooth ReLU relatives — see the DL activations module for why smoothness helps the gradient near zero.
- What does it *do*? The leading hypothesis — and say it as a hypothesis in an interview — is a **key-value memory**: each row of W₁ is a "key" pattern that fires on some feature of the token, and the matching row of W₂ is the "value" it writes back into the stream. Evidence: you can locate and edit factual associations ("the Eiffel Tower is in ___") by editing specific FFN rows (the ROME / knowledge-editing line of work).
- What is NOT settled: whether that is the whole story. Real FFN neurons are heavily **polysemantic** (one neuron fires for many unrelated things) because the model packs more features than it has dimensions. Anyone who tells you the FFN is a clean fact database is overselling it.`,
    },
    {
      type: 'math',
      intro: 'The FFN, the two activations you will be asked about, and the SwiGLU shape trick.',
      latex: [
        '\\text{FFN}(x) = W_2\\,\\phi(W_1 x + b_1) + b_2, \\qquad W_1 \\in \\mathbb{R}^{4d \\times d},\\;\\; W_2 \\in \\mathbb{R}^{d \\times 4d}',
        '\\text{GELU}(x) = x\\,\\Phi(x) \\approx 0.5x\\left(1 + \\tanh\\!\\left[\\sqrt{2/\\pi}\\,(x + 0.044715x^3)\\right]\\right)',
        '\\text{SwiGLU}(x) = W_2\\Big( \\text{SiLU}(W_g x) \\odot (W_1 x) \\Big) \\quad \\text{— 3 matrices, so } d_{\\text{ff}} \\text{ is cut to } \\tfrac{8}{3}d \\text{ to keep the param count at } 8d^2',
      ],
    },
    {
      type: 'intuition',
      title: 'Parameter arithmetic: where the weights actually live',
      md: `Do this on your fingers. Per block, ignoring biases and norms (they are rounding error):

- Attention: W_Q, W_K, W_V, W_O — four d×d matrices → **4d²**. (Multi-head does not change this: h heads of size d/h concatenate back to d.)
- FFN: W₁ is d×4d and W₂ is 4d×d → **8d²**.
- Block total: **12d²**. FFN share: 8/12 = **two thirds of every transformer's parameters sit in the FFNs**, not in attention.
- That single ratio explains a lot of modern engineering: MoE replaces the FFN (the fat part) with many experts and routes to a few; LoRA is often applied to attention because those matrices are small; quantization pain is mostly FFN pain.
- Whole model: **N ≈ 12·L·d²** non-embedding parameters, plus V·d for the embedding table. Memorize that one formula and you can size any model in your head.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Reproduce GPT-2 small\'s parameter count from four numbers',
      code: `V, d, L, n_ctx = 50257, 768, 12, 1024   # GPT-2 small's four numbers
ff = 4 * d                              # the 4x expansion: 3072

tok  = V * d                            # token embedding table
pos  = n_ctx * d                        # learned position embeddings
attn = 4 * d * d + 4 * d                # W_Q, W_K, W_V, W_O (+ biases)
ffn  = 2 * d * ff + ff + d              # d -> 4d -> d (+ biases)
ln   = 2 * d                            # LayerNorm: gamma and beta
block = attn + ffn + 2 * ln             # one repeating unit
total = tok + pos + L * block + ln      # final LN; the head is TIED to tok

print(f"embeddings        {tok + pos:>12,}")
print(f"one block         {block:>12,}")
print(f"  attention       {attn:>12,}  {attn / block:5.1%} of block")
print(f"  FFN             {ffn:>12,}  {ffn / block:5.1%} of block")
print(f"{L} blocks         {L * block:>12,}")
print(f"final LayerNorm   {ln:>12,}")
print(f"TOTAL             {total:>12,}")
print(f"rule of thumb 12*L*d^2 = {12 * L * d * d:,}")
print(f"untied head would add  {V * d:,}")

# ---------- real output ----------
# embeddings          39,383,808
# one block            7,087,872
#   attention          2,362,368  33.3% of block
#   FFN                4,722,432  66.6% of block
# 12 blocks           85,054,464
# final LayerNorm          1,536
# TOTAL              124,439,808
# rule of thumb 12*L*d^2 = 84,934,656
# untied head would add  38,597,376`,
      annotations: {
        1: 'Four numbers define a GPT: vocabulary, model width, depth, context length. Head count does not appear — it splits d, it does not add parameters.',
        5: 'GPT-2 learns its position embeddings: one vector per slot, so context length costs parameters and cannot be exceeded at inference. RoPE and ALiBi were invented to make this row disappear.',
        6: '4d² is the attention block: three projections in, one out. The n×n attention scores are activations, not parameters — they never appear here.',
        7: '8d² is the FFN: 2·d·4d. This one line is two thirds of the block.',
        10: 'The output head reuses the token embedding matrix — weight tying. Untying it would add 38.6M parameters, a 31% bigger model for no measured quality gain at this scale.',
        14: '33.3% / 66.6%. The 1/3 vs 2/3 split falls straight out of 4d² vs 8d² — nothing is hand-tuned here.',
        18: '124,439,808 — the count of the actual released checkpoint, and what every reimplementation (nanoGPT, Hugging Face) reports. The GPT-2 paper\'s table says 117M; the 7M gap is a known discrepancy in the paper, not something you can derive. Quote 124M and mention the paper says 117M — that is the answer that shows you counted.',
        19: 'The rule of thumb undershoots the 12-block total by 119,808 = biases + LayerNorms. Under 0.2% — which is why "12·L·d²" is the number you use in an interview.',
      },
    },
    {
      type: 'note',
      md: 'Weight tying, since it is one line and gets asked: the output head that maps the final d-vector to V logits is the SAME matrix as the input token embedding table, transposed. The argument is that both directions encode "which token is this vector about", so one table should serve. It saves V·d parameters (38.6M of GPT-2 small\'s 124M — nearly a third) and costs nothing measurable at that scale. Big modern models often UNTIE it, because V·d stops being a meaningful fraction once the model is 70B and the extra capacity in the head is cheap.',
    },
    {
      type: 'intuition',
      title: 'LayerNorm placement: the one detail interviewers use as a filter',
      md: `LayerNorm normalizes across the d features of **one token** (never across the batch — batch statistics are useless when sequences have different lengths). The only question is *where you put it relative to the addition*.

- **Post-norm** (original 2017 paper): x ← LN(x + F(x)). The norm sits ON the highway. Every residual add is immediately renormalized.
- **Pre-norm** (GPT-2 onwards, and everything modern): x ← x + F(LN(x)). The norm sits INSIDE the branch. The highway itself is a clean, untouched identity path.
- Why post-norm hurts at depth: the identity path now passes through L LayerNorms, each with a Jacobian that rescales by 1/σ. The "derivative exactly 1" guarantee is gone, gradients at initialization grow or shrink with depth, and training diverges unless you baby it.
- The tell in the wild: post-norm models **require learning-rate warmup** (thousands of steps ramping up from ~0) and are fragile past ~20 layers. Pre-norm trains at 100+ layers with far less ceremony — it still uses warmup in practice, it just does not collapse without it. Warmup is a symptom, not a cure.
- The cost of pre-norm, stated honestly: the stream's magnitude grows with depth (you keep adding without renormalizing), so later blocks' contributions are relatively smaller, and pre-norm models are usually reported slightly *worse* at equal depth if post-norm converges at all. Everyone takes the trade — a model that trains beats a model that is 0.2 perplexity better on paper.
- Where the final norm goes: pre-norm architectures need ONE extra LayerNorm after the last block, before the output head, because nothing has normalized the stream on the way out.`,
    },
    {
      type: 'math',
      intro: 'The two placements side by side, then LayerNorm and its modern simplification.',
      latex: [
        '\\textbf{Post-norm:}\\quad x_{\\ell+1} = \\text{LN}\\big(x_\\ell + F(x_\\ell)\\big) \\qquad \\textbf{Pre-norm:}\\quad x_{\\ell+1} = x_\\ell + F\\big(\\text{LN}(x_\\ell)\\big)',
        '\\frac{\\partial x_{\\ell+1}}{\\partial x_\\ell} = \\underbrace{J_{\\text{LN}}(I + J_F)}_{\\text{post: no clean } I} \\qquad \\text{vs} \\qquad \\underbrace{I + J_F J_{\\text{LN}}}_{\\text{pre: } I \\text{ survives}}',
        '\\text{LN}(x) = \\gamma \\odot \\frac{x - \\mu}{\\sqrt{\\sigma^2 + \\epsilon}} + \\beta, \\qquad \\mu = \\tfrac{1}{d}\\textstyle\\sum_i x_i,\\;\\; \\sigma^2 = \\tfrac{1}{d}\\sum_i (x_i - \\mu)^2 \\;\\; \\text{(over ONE token\'s } d \\text{ features)}',
        '\\text{RMSNorm}(x) = \\gamma \\odot \\frac{x}{\\sqrt{\\tfrac{1}{d}\\sum_i x_i^2 + \\epsilon}} \\qquad \\text{— drop } \\mu \\text{ and } \\beta;\\; \\text{same quality, fewer ops (Llama, T5, Gemma)}',
      ],
    },
    {
      type: 'note',
      md: 'RMSNorm in one line, because you will see it in every modern config: it is LayerNorm with the mean-subtraction and the bias deleted — divide by the root-mean-square, scale by gamma, done. The finding was that re-centering was never the part that helped; re-scaling was. It is measurably faster (one pass over the vector instead of two, no mean to reduce) at equal quality, which is why Llama, T5 and Gemma all use it.',
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The complete block in PyTorch — pre-norm, causal, 7,087,872 parameters',
      code: `import torch
import torch.nn as nn
import torch.nn.functional as F

class CausalSelfAttention(nn.Module):
    def __init__(self, d, n_heads):
        super().__init__()
        assert d % n_heads == 0
        self.n_heads, self.d_head = n_heads, d // n_heads
        self.qkv = nn.Linear(d, 3 * d)          # 3d^2 + 3d
        self.proj = nn.Linear(d, d)             #  d^2 +  d

    def forward(self, x):                       # x: (B, T, d)
        B, T, d = x.shape
        q, k, v = self.qkv(x).split(d, dim=2)   # three (B, T, d)
        shape = (B, T, self.n_heads, self.d_head)
        q, k, v = (t.view(shape).transpose(1, 2) for t in (q, k, v))
        y = F.scaled_dot_product_attention(q, k, v, is_causal=True)
        y = y.transpose(1, 2).reshape(B, T, d)  # heads concatenated back
        return self.proj(y)                     # (B, T, d): shape in = shape out

class FeedForward(nn.Module):
    def __init__(self, d, mult=4):
        super().__init__()
        self.up = nn.Linear(d, mult * d)        # 4d^2 + 4d
        self.down = nn.Linear(mult * d, d)      # 4d^2 +  d
        self.act = nn.GELU()

    def forward(self, x):
        return self.down(self.act(self.up(x)))  # every token, alone

class Block(nn.Module):
    def __init__(self, d, n_heads):
        super().__init__()
        self.ln1 = nn.LayerNorm(d)              # 2d
        self.attn = CausalSelfAttention(d, n_heads)
        self.ln2 = nn.LayerNorm(d)              # 2d
        self.ffn = FeedForward(d)

    def forward(self, x):
        x = x + self.attn(self.ln1(x))          # read a normalized copy, ADD back
        x = x + self.ffn(self.ln2(x))           # read a normalized copy, ADD back
        return x

blk = Block(768, 12)
out = blk(torch.randn(2, 16, 768))              # -> (2, 16, 768)
print(sum(p.numel() for p in blk.parameters()))

# ---------- desk-checked arithmetic (PyTorch is not installed here) ----------
# ln1       2 * 768              =     1,536
# qkv     768 * 2304 + 2304      = 1,771,776
# proj    768 *  768 +  768      =   590,592
# ln2       2 * 768              =     1,536
# up      768 * 3072 + 3072      = 2,362,368
# down   3072 *  768 +  768      = 2,360,064
# ------------------------------------------
# Block(768, 12)                 = 7,087,872   <- what line 47 prints
# 12 * d^2 = 12 * 589,824        = 7,077,888   (weights only; the 9,984 gap is
#                                               biases + two LayerNorms)`,
      annotations: {
        10: 'One fused Linear for Q, K and V instead of three. Identical math, identical parameter count (3d² either way) — one bigger matmul is faster on a GPU than three small ones.',
        14: 'B = batch, T = tokens, d = model width. Nothing in this file cares what T is; that is why the same weights serve any sequence length.',
        16: 'Splitting into heads is a RESHAPE, not new parameters. 12 heads of 64 dims re-partition the same 768 numbers — this is why multi-head is free.',
        18: 'is_causal=True applies the triangular mask so token t sees only tokens ≤ t. Also dispatches to FlashAttention, which never materializes the T×T matrix in HBM.',
        19: 'transpose then reshape glues the heads back to width d, and proj lets them mix. Without proj the heads would be 12 sealed subspaces.',
        26: 'The 4x expansion, and the fat part of the model: these two Linears are 4.72M of the block\'s 7.09M.',
        30: 'Applied to the last dimension only, so it runs independently on every (batch, token) pair. No token talks to another one in here.',
        41: 'PRE-norm: LN is inside the branch. Compare with post-norm, which would be x = self.ln1(x + self.attn(x)) — one line different, and the reason that version needs warmup to train past 20 layers.',
        46: 'A real forward pass would return the same shape it got. Same shape in and out is the property that lets nn.Sequential(*[Block(768, 12) for _ in range(12)]) be a legal model.',
      },
    },
    {
      type: 'intuition',
      title: 'The family map: encoder, decoder, or both',
      md: `Same block, three wiring choices. The difference is who is allowed to see what.

1. **Encoder-only — BERT.** No causal mask: every token attends to every other token, both directions. Trained by masked language modelling (blank out ~15% of tokens, predict them). Output is one contextual vector per token, so it is built for *understanding*: classification, NER, retrieval embeddings. It cannot generate left-to-right — it was never trained to.
2. **Decoder-only — GPT.** Causal mask: token t sees only tokens ≤ t. Trained by next-token prediction on raw text. Built for *generation*, and this is the one you will build.
3. **Encoder-decoder — T5, BART, the original 2017 transformer.** The encoder reads the source bidirectionally; the decoder generates causally and additionally runs **cross-attention** — Q from the decoder's stream, K and V from the encoder's output. Natural fit for translation and summarization, where input and output are different sequences.
- Cross-attention is the only new mechanism in the whole family, and it is one substitution: keys and values come from the other stack.`,
    },
    {
      type: 'note',
      md: 'And the honest observation: decoder-only won for general-purpose models. Two reasons. (1) ONE objective that scales — next-token prediction needs no labels, no paired data, no masking ratio to tune; you point it at the internet and it learns. Masked-LM wastes ~85% of positions per step; encoder-decoder needs input/output pairs to shine. (2) In-context learning falls out for free: if the model is trained to continue any text, then "translate this: ..." is just text to continue, so every task becomes a prompt and one model serves all of them. Practical bonus: one stack is simpler to serve and KV-caches cleanly. Where the others still win, because interviewers check: BERT-family encoders remain the better accuracy-per-FLOP choice for embeddings and classification (a 110M encoder beats prompting a 7B model on many of them), and encoder-decoders still lead on some fixed seq2seq benchmarks.',
    },
    {
      type: 'note',
      md: 'Scale check before you leave, using the formula alone. GPT-3: d = 12288, L = 96 → 12·96·12288² = 173.9B, plus a 50257×12288 embedding (0.62B) ≈ 174.6B. The published number is 175B. You just reproduced the most-quoted parameter count in the field with one multiplication — that is the payoff for learning the block instead of memorizing diagrams.',
    },
  ],
  quiz: [
    {
      question: 'What does "the residual stream" refer to?',
      options: [
        {
          text: 'The leftover error the model could not fit',
          explanation: 'That is the residual of a regression fit. Different word, different subject — here "residual" means the skip connection.',
        },
        {
          text: 'A width-d vector running from embedding to output head that every sublayer reads from and adds back into',
          explanation: 'Correct. Nothing overwrites it; the value at layer L is the embedding plus every sublayer\'s contribution, all still summed.',
        },
        {
          text: 'The attention score matrix carried between blocks',
          explanation: 'Attention scores are recomputed inside each block and never leave it. They are activations, not a stream.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Per block with model width d, how do attention and FFN parameters compare?',
      options: [
        { text: 'Attention 8d², FFN 4d² — attention dominates', explanation: 'Backwards. Attention is four d×d matrices; the FFN has the 4× expansion.' },
        { text: 'Both 6d² — they are balanced by design', explanation: 'They are not balanced, and nothing in the design tries to balance them.' },
        {
          text: 'Attention 4d², FFN 8d² — the FFN holds two thirds',
          explanation: 'Correct. W_Q/W_K/W_V/W_O = 4d²; W₁ (d×4d) + W₂ (4d×d) = 8d². Block total 12d², FFN share 8/12 = 2/3.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Pre-norm means…',
      options: [
        {
          text: 'x ← x + F(LN(x)) — the LayerNorm sits inside the residual branch',
          explanation: 'Correct. The highway stays a clean identity path, so ∂x_{l+1}/∂x_l = I + J and the gradient always has a derivative-1 route home.',
        },
        { text: 'x ← LN(x + F(x)) — normalize after adding', explanation: 'That is post-norm, the original 2017 arrangement. It puts a LayerNorm ON the identity path.' },
        { text: 'Normalizing the input data before it reaches the model', explanation: 'That is input preprocessing. "Pre" here refers to position relative to the residual addition, not to the pipeline.' },
      ],
      correct: 0,
    },
    {
      question: 'What is the observable symptom that a model uses post-norm rather than pre-norm?',
      options: [
        { text: 'It generates shorter outputs', explanation: 'Output length is decided by sampling and stop tokens, not by norm placement.' },
        {
          text: 'It needs a long learning-rate warmup and becomes unstable past ~20 layers',
          explanation: 'Correct. With LN on the identity path the gradient scale drifts with depth, so training needs babying. Warmup treats the symptom.',
        },
        { text: 'It uses more parameters', explanation: 'Both placements have the identical parameter count — the same two LayerNorms, just moved.' },
        { text: 'Its attention becomes bidirectional', explanation: 'Masking is a completely separate choice from norm placement.' },
      ],
      correct: 1,
    },
    {
      question: 'Non-embedding parameters of a transformer with L layers and width d are approximately…',
      options: [
        { text: '4·L·d²', explanation: 'That is attention only. You dropped the FFN, which is the bigger half.' },
        { text: 'L·d·V', explanation: 'Vocabulary V appears once, in the embedding table — it is not multiplied by depth.' },
        { text: '12·L·d²', explanation: 'Correct. 12d² per block (4d² attention + 8d² FFN) times L. GPT-3: 12·96·12288² ≈ 174B, matching the published 175B.' },
      ],
      correct: 2,
    },
    {
      question: 'What does the FFN see when it processes token 7?',
      options: [
        {
          text: 'Only token 7\'s own stream vector — no other position',
          explanation: 'Correct. The FFN is position-wise: identical weights, applied independently per token. All cross-token movement happened in attention.',
        },
        { text: 'All previous tokens, like causal attention', explanation: 'That is the attention sublayer\'s job. The FFN has no mechanism to look sideways.' },
        { text: 'The whole sequence, bidirectionally', explanation: 'No sublayer other than attention mixes positions at all.' },
      ],
      correct: 0,
    },
    {
      question: 'Weight tying in GPT-2 means…',
      options: [
        { text: 'All 12 blocks share the same weights', explanation: 'They do not — each block has its own parameters. (Models that DO share blocks exist, e.g. ALBERT, but that is a different technique.)' },
        { text: 'Q and K use one matrix', explanation: 'They are deliberately separate — asking and being findable are different roles.' },
        {
          text: 'The output head reuses the input token embedding matrix (transposed)',
          explanation: 'Correct. Saves V·d = 38.6M parameters in GPT-2 small — nearly a third of the model — at no measurable quality cost at that scale.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Which claim about the FFN is stated honestly?',
      options: [
        { text: 'The FFN is a proven lookup table of facts, one neuron per fact', explanation: 'Overclaiming on two counts: it is a hypothesis, and neurons are heavily polysemantic — one neuron fires for many unrelated features.' },
        {
          text: 'A leading hypothesis is that it acts as a key-value memory of learned associations — supported by fact-editing work, but not settled',
          explanation: 'Correct, and this is the phrasing to use. Naming it as a hypothesis with its evidence and its caveat scores better than either overclaiming or shrugging.',
        },
        { text: 'The FFN mainly exists to reduce parameter count', explanation: 'It is the LARGEST parameter block in the model — two thirds of it.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Draw a transformer block on the whiteboard and talk me through it.',
      answer:
        'Draw a vertical line first and label it the residual stream — that framing is what separates a memorized diagram from understanding. Then: from the stream, take a LayerNormed copy, feed it to multi-head causal self-attention, add the result back to the stream. Take another LayerNormed copy, feed it to a position-wise FFN (d → 4d → d with GELU), add that back. Shape in equals shape out, so you stack N of these — 12 for GPT-2 small, 96 for GPT-3 — each with its own weights. Around the stack: token embedding + position embedding at the bottom, one final LayerNorm and a tied linear head to the vocabulary at the top. Say the two rules out loud: every sublayer READS and ADDS, never overwrites; and the LayerNorm goes inside the branch (pre-norm), not on the stream.',
      isCaseBased: false,
    },
    {
      question: 'Why does LayerNorm placement matter? Pre-norm vs post-norm.',
      answer:
        'Post-norm (the 2017 paper) is x ← LN(x + F(x)); pre-norm (GPT-2 onward, everything modern) is x ← x + F(LN(x)). The difference is whether the identity path is clean. Pre-norm: ∂x_{l+1}/∂x_l = I + J_F·J_LN, so there is a route with derivative exactly 1 from the loss all the way to the embedding, at any depth. Post-norm: the identity passes through a LayerNorm every layer, whose Jacobian rescales by 1/σ, so the guarantee is gone and gradient magnitude drifts with depth — training diverges unless you warm the learning rate up over thousands of steps, and it gets fragile past roughly 20 layers. Pre-norm trains 100+ layers with much less ceremony. The honest cost of pre-norm: the stream grows in magnitude with depth because nothing renormalizes it, later blocks contribute relatively less, and at equal depth post-norm often reports slightly better final quality WHEN it converges. Everyone takes pre-norm anyway — a model that trains beats a model that is marginally better on paper. Two details that earn extra credit: pre-norm needs one extra LayerNorm after the last block, and LayerNorm here normalizes over the d features of a single token, never across the batch, because sequences have different lengths.',
      isCaseBased: false,
    },
    {
      question: 'Count the parameters of GPT-2 small from scratch. Then generalize the formula.',
      answer:
        'Numbers: V = 50257, d = 768, L = 12, context 1024. Embeddings: 50257·768 = 38.60M tokens + 1024·768 = 0.79M positions = 39.38M. Per block: attention = 4d² = 2.36M (W_Q, W_K, W_V, W_O, plus biases); FFN = 2·d·4d = 4.72M; two LayerNorms = 3072. Block ≈ 7.09M, times 12 = 85.05M. Final LayerNorm 1536. The output head is tied to the embedding, so it adds nothing. Total = 124.44M. Say the honest footnote: the released checkpoint and every reimplementation report 124M, while the GPT-2 paper\'s table says 117M — a known discrepancy in the paper you cannot derive. Generalization: N_non-embedding ≈ 12·L·d². Check it: GPT-3 is d = 12288, L = 96 → 12·96·12288² = 173.9B, plus 0.62B embeddings ≈ 175B. One multiplication reproduces the most-quoted number in the field.',
      isCaseBased: false,
    },
    {
      question: 'Explain the residual stream, and why it means you can study transformer layers semi-independently.',
      answer:
        'The stream is a width-d vector per token that runs unchanged from the embedding to the output head. Each sublayer reads a normalized copy, computes a delta, and adds the delta in — nothing is overwritten. Unrolled: x_L = x_0 + Σ_l [Attn_l + FFN_l]. Because the final state is a SUM, each sublayer\'s contribution is a separate additive term you can isolate: read the stream before and after a sublayer, subtract, and you have exactly what it wrote. That is the working assumption behind mechanistic interpretability (induction heads, logit lens, activation patching), and it is why ablating one layer at inference usually degrades the model gracefully instead of destroying it — you removed one summand, not a link in a chain. The caveat to state: it is a useful approximation, not literal independence. Later layers read what earlier ones wrote, so contributions compose; and the stream is superposed — more features than dimensions, packed into near-orthogonal directions.',
      isCaseBased: false,
    },
    {
      question: 'What does the FFN actually do, and how much of the model is it?',
      answer:
        'Mechanically: a position-wise 2-layer MLP, d → 4d → d, same weights at every position, no cross-token mixing at all — attention moves information between tokens, the FFN processes each token alone. Size: 8d² per block against attention\'s 4d², so two thirds of every transformer\'s parameters live in FFNs. Function — and flag this as hypothesis, not fact: the leading account is a key-value memory, where rows of W₁ are key patterns that detect features of the token and the matching rows of W₂ are values written back into the stream. Supporting evidence: factual associations can be located and edited by modifying specific FFN rows (ROME and the knowledge-editing literature). The caveat that shows you read past the headline: neurons are heavily polysemantic because the model superposes more features than it has dimensions, so "one neuron per fact" is wrong. Practical consequence of the 2/3 share: MoE replaces the FFN with routed experts because that is where the parameters are, and quantization/serving pain is mostly FFN pain.',
      isCaseBased: false,
    },
    {
      question: 'Why 4× for the FFN expansion? Justify it or admit you cannot.',
      answer:
        'Admit it honestly, then give the real reasons — that combination is the answer they want. It is the original paper\'s choice (512 → 2048) that stuck because it worked and nobody found a decisively better default. The defensible arguments: a non-linearity needs a wide enough intermediate space to be worth anything (the FFN\'s expressiveness lives in that hidden width); 4× sits at a good quality-per-FLOP point empirically; and it keeps tensor shapes GPU-friendly. There is no theorem. Evidence it is not sacred: SwiGLU models use three matrices instead of two and cut the ratio to ~8/3 specifically to hold the parameter count at 8d²; some architectures go wider or narrower with depth. The takeaway to state: 4× is a well-tested default, and the invariant people actually preserve across variants is the 8d² parameter budget, not the number 4.',
      isCaseBased: false,
    },
    {
      question: 'Case: you build a 40-layer transformer, copying the original paper\'s block exactly. Loss diverges in the first few hundred steps regardless of learning rate. Diagnose.',
      answer:
        'First suspicion: you copied post-norm. The original paper is x ← LN(x + F(x)), which puts a LayerNorm on the identity path and destroys the derivative-1 route; at 40 layers the gradient scale at initialization drifts enough that early steps blow up. Checks, in order: (1) log per-layer gradient norms at step 0 — a clean depth-dependent ramp or collapse confirms it; (2) switch to pre-norm, x ← x + F(LN(x)), plus one final LayerNorm before the head — this is the actual fix and usually the whole answer; (3) if you must keep post-norm, add linear warmup over 2–4k steps and scale residual-branch output projections by 1/√(2L) (the GPT-2 init trick), which keeps the stream variance from growing with depth; (4) rule out the ordinary suspects while you are there — fp16 overflow (use bf16), missing gradient clipping at 1.0, a mis-set causal mask leaking future tokens (loss would look suspiciously low, not divergent), and an LR that is simply too high for the batch size. Ranking matters in the answer: architecture fix first, warmup and clipping as belt-and-braces, not as the cure.',
      isCaseBased: true,
    },
    {
      question: 'Case: you must cut a 7B decoder-only model to fit a 16GB GPU at fp16, and quality loss should be minimal. Where do you cut, and why?',
      answer:
        'Start from where the parameters are: 12·L·d² non-embedding, of which two thirds is FFN. 7B at fp16 is ~14GB of weights before any KV-cache, so you are already over once activations and cache land. Ranked options: (1) Quantize to int8 or int4 — 4-bit weight-only quantization (GPTQ/AWQ) takes 14GB to ~4GB with small measured quality loss; this is the highest value-per-risk move and touches the FFN, which is most of the bytes. (2) Shrink the KV-cache, which is the part that grows with context: GQA or MQA cuts KV heads by 4–8×, and cache size is 2·L·n_kv·d_head·tokens·bytes — do that arithmetic out loud, it is a standard follow-up. (3) If you are training rather than serving, LoRA on the attention projections: you freeze the 7B and train rank-8 adapters, a fraction of a percent of the parameters. (4) Structural cuts — layer pruning or removing FFN experts — last, because they need retraining to recover. What NOT to do: reduce d. Parameters scale as d², activations and every downstream shape change, and you have effectively built a different model that must be retrained from scratch.',
      isCaseBased: true,
    },
    {
      question: 'BERT vs GPT vs T5 — draw the family map and say which you would pick for three tasks.',
      answer:
        'One block, three wirings. BERT: encoder-only, no causal mask so every token sees both directions, trained with masked language modelling; output is a contextual vector per token; built for understanding, cannot generate left-to-right. GPT: decoder-only, causal mask, next-token prediction; built for generation. T5/BART: encoder-decoder — the encoder reads the source bidirectionally, the decoder generates causally and adds cross-attention, where Q comes from the decoder stream and K/V from the encoder output. Cross-attention is the only genuinely new mechanism in the family. Picks: semantic search / retrieval embeddings → a BERT-family encoder, because bidirectional context and 110M parameters beat prompting a 7B model on accuracy per FLOP; open-ended chat, code, agents → decoder-only, no contest; constrained seq2seq like translation or document summarization with a fixed format → encoder-decoder is still competitive and often cheaper, though a fine-tuned decoder-only will usually match it now.',
      isCaseBased: false,
    },
    {
      question: 'Why did decoder-only win for general-purpose models? Give the mechanism, not the vibe.',
      answer:
        'Two reasons, and one honest boundary. (1) One objective that scales: next-token prediction needs no labels, no paired data, and no masking ratio to tune, so it consumes raw internet text directly and every position in every sequence produces a training signal. Masked-LM supervises only the ~15% masked positions per pass; encoder-decoder training wants input/output pairs to shine. When your bottleneck is data and compute, the objective with the best signal-per-token and zero labelling cost wins. (2) In-context learning falls out of it for free: a model trained to continue arbitrary text treats "Translate to French: ..." as text to continue, so every task becomes a prompt and one model serves all of them — no per-task head, no per-task fine-tune. That is a product property, not just a research one. Practical bonus: a single stack is simpler to serve and KV-caches cleanly, whereas encoder-decoder needs both stacks resident. The boundary: encoder-only models are still the better accuracy-per-FLOP choice for embeddings, retrieval and classification, and they are very much alive in production retrieval stacks.',
      isCaseBased: false,
    },
    {
      question: 'Case: a teammate proposes removing the skip connections to "simplify the architecture and save memory". Talk them out of it with specifics.',
      answer:
        'Correct the premise first: skip connections add zero parameters and essentially zero compute — an elementwise add. They do not save memory in any meaningful sense; if anything the activations are kept for backward either way. Then the three things you lose. (1) The gradient highway: with x + F(x) the layer Jacobian is I + J, so there is a derivative-1 path from loss to embedding; remove it and the gradient becomes a product of L Jacobians that collapses or explodes — this is exactly the pre-2015 wall ResNet removed, and it is why 100+ layer stacks are trainable at all. (2) Blurring: attention\'s output is a weighted average of Values; average 12 times with no original signal preserved and every token drifts toward the sequence mean. The residual means attention only ever adds a correction on top of the token itself. (3) The free identity: with a skip, a block with nothing useful to contribute can output ~0 and cost nothing, so depth never actively hurts; without one, every block MUST produce a usable representation or the signal is destroyed. Close with the falsifiable version: run the ablation on a 6-layer toy model for 500 steps and compare loss curves — it is a half-hour experiment and the result is not subtle.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'The transformer block, four moves', back: 'attention → Add&Norm → FFN → Add&Norm. Shape in = shape out, so you stack N copies (12 in GPT-2 small, 96 in GPT-3), each with its own weights.' },
    { front: 'The residual stream', back: 'A width-d vector running embedding → output head. Every sublayer READS a normalized copy, computes a delta, and ADDS it back. Nothing overwrites; x_L = x_0 + sum of all deltas.' },
    { front: 'Why residuals in a transformer (3 jobs)', back: 'Gradient highway (∂/∂x = I + J, derivative-1 path); stops attention\'s weighted averages from blurring over depth; gives every block a free identity so depth never hurts.' },
    { front: 'The FFN', back: 'Position-wise MLP, d → 4d → d with GELU/SwiGLU. Same weights every position, no cross-token mixing. Attention moves info between tokens; the FFN processes each token alone.' },
    { front: 'Parameter arithmetic', back: 'Per block: attention 4d² + FFN 8d² = 12d², so the FFN is 2/3 of every transformer. Whole model: N ≈ 12·L·d² non-embedding + V·d embeddings. GPT-3: 12·96·12288² = 173.9B + 0.6B ≈ 175B.' },
    { front: 'GPT-2 small, counted', back: '39.38M embeddings + 12×7.09M blocks + 1536 = 124.44M. (The paper\'s table says 117M — known discrepancy; the checkpoint is 124M.)' },
    { front: 'Pre-norm vs post-norm', back: 'Post: x ← LN(x + F(x)) — LN on the highway, needs warmup, unstable past ~20 layers. Pre: x ← x + F(LN(x)) — clean identity path, trains at 100+ layers. Everything modern is pre-norm.' },
    { front: 'RMSNorm', back: 'LayerNorm minus mean-subtraction and minus beta: divide by root-mean-square, scale by gamma. Same quality, fewer ops. Llama, T5, Gemma.' },
    { front: 'Weight tying', back: 'The output head IS the token embedding matrix, transposed. Saves V·d (38.6M of GPT-2 small\'s 124M). Big models often untie — the saving stops mattering at 70B.' },
    { front: 'Family map in one line each', back: 'BERT: encoder-only, bidirectional, masked-LM, understanding. GPT: decoder-only, causal, next-token, generation. T5/BART: encoder-decoder + cross-attention (Q from decoder, K/V from encoder), seq2seq.' },
  ],
  mindmapMarkdown: `- The Transformer Block & the Residual Stream
  - The block
    - attention → Add&Norm → FFN → Add&Norm
    - shape in = shape out → stackable
    - N copies, own weights each (12 GPT-2, 96 GPT-3)
    - embeddings below, final norm + head above
  - Residual stream
    - a width-d highway, embedding → head
    - every sublayer: read, compute, ADD
    - never overwritten, only accumulated
    - x_L = x_0 + sum of all deltas
    - layers studiable semi-independently
    - ablate a layer → degrades, not dies
  - Why residuals
    - gradient highway: dx/dx = I + J
    - cross-ref: DL ResNet, same idea
    - stops averaging from blurring
    - free identity → depth never hurts
  - The FFN (MLP)
    - d → 4d → d, position-wise
    - no cross-token mixing
    - why 4x: empirical default, not a theorem
    - GELU (GPT-2/BERT), SwiGLU (Llama)
    - hypothesis: key-value memory of facts
    - caveat: neurons are polysemantic
  - Parameter arithmetic
    - attention 4d²
    - FFN 8d²
    - block 12d² → FFN is 2/3
    - N ≈ 12·L·d² non-embedding
    - GPT-2 small = 124.4M (paper says 117M)
    - GPT-3 = 12·96·12288² ≈ 174B
    - weight tying saves V·d
  - LayerNorm placement
    - LN is per-token, over d features
    - post-norm: LN(x + F(x)), needs warmup
    - pre-norm: x + F(LN(x)), clean identity
    - pre-norm trains 100+ layers
    - pre-norm needs one final LN
    - RMSNorm: drop mean and beta
  - Family map
    - BERT: encoder-only, bidirectional, MLM
    - GPT: decoder-only, causal, next-token
    - T5/BART: encoder-decoder, cross-attention
    - cross-attn: Q from decoder, K/V from encoder
    - decoder-only won: one scalable objective
    - in-context learning falls out free
    - encoders still win on embeddings/classification`,
}

export default m
