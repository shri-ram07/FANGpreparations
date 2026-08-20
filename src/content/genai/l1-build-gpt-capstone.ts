import type { Module } from '../types'

const m: Module = {
  id: 'genai-l1-build-gpt-capstone',
  subjectId: 'genai',
  level: 1,
  title: 'CAPSTONE: Code a GPT from Scratch',
  whyItMatters:
    'This is the resume line. "Built a GPT from scratch in PyTorch" gets callbacks — but only if you can answer the three follow-ups that prove you actually wrote it instead of cloning it. This module is the whole build: tokenizer, causal attention head, multi-head, block, the GPT module, the training loop, and sampling with temperature / top-k / top-p. Every line explained, every shape checked, roughly 200 lines of real code and a model you can train on a laptop.',
  estMinutes: 90,
  sections: [
    {
      type: 'intuition',
      title: 'The plan of attack',
      md: `You are building a **character-level, decoder-only transformer** — the same architecture as GPT-2, just small. Six pieces, in this order:

1. **Data + tokenizer** — a text file becomes a long tensor of integers, and batches of (input, target) pairs.
2. **Embeddings + positions** — integers become vectors, and vectors get told where they are.
3. **Masked multi-head attention** — tokens mix information, but only from the past.
4. **Transformer blocks** — attention + feed-forward, wrapped in residuals and LayerNorm, stacked.
5. **Training loop** — AdamW, next-token cross-entropy, a validation check.
6. **Sampling** — the autoregressive loop with temperature, top-k, top-p.

The config we will build: **~2.7M parameters**, 6 layers, 6 heads, d_model 192, context 128. That trains in minutes-to-an-hour on a free Colab GPU, and in a slow but survivable time on a laptop CPU.`,
    },
    {
      type: 'intuition',
      title: 'Set your expectations before you start',
      md: `The single most common way this project disappoints people is expecting the wrong output.

- 2.7M parameters on 1 MB of Shakespeare is roughly **1/60,000th** of GPT-3. It will not answer questions.
- What it DOES produce: Shakespeare-*flavoured* gibberish. Correct-looking character names in capitals, colons after speaker names, line breaks in the right places, real English words, sentences that go nowhere.
- The progression is the point: garbage characters → real words → real-ish phrases → play-shaped text. You can watch it happen in the loss.
- That progression is the demo. In an interview you describe the *mechanism*, not the sample quality.
- Nothing here is a toy substitute for the real thing. It is the real architecture — the only differences from a production model are scale, tokenizer, and training budget.`,
    },
    {
      type: 'note',
      md: 'Honesty note about this module: PyTorch is not installed on the machine this was written on, so **no loss curve here is a measurement**. Every shape, every parameter count, and every arithmetic claim below was computed and verified. Loss numbers are labelled as *expectations* with a reason attached. When you run it yourself, the first number you should check is the very first loss — the math section below tells you exactly what it must be.',
    },
    {
      type: 'intuition',
      title: 'Step 1: data, and the one-token shift that IS the label',
      md: `There is no labelled dataset. The text labels itself.

- Take any window of the corpus: \`"To be or no"\`. The input is that window; the target is the same window shifted right by one: \`"o be or not"\`.
- So position 0 learns "after T comes o", position 1 learns "after To comes ' '", … position 127 learns "after these 127 chars comes X".
- One sequence of length 128 is therefore **128 training examples**, not one. A batch of 64 gives 8,192 predictions per step.
- The tokenizer is the simplest one that exists: every distinct character gets an integer. Shakespeare has 65 of them.
- Character tokens make the vocabulary tiny (65 instead of 50,257) so the embedding and output layers stay small — the right trade for a from-scratch build.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Data and batching — the whole supervision signal is one line',
      code: `import torch

# the corpus: ~1.1 MB of plain text, one file, zero dependencies
# (tinyshakespeare, from karpathy/char-rnn -> data/tinyshakespeare/input.txt)
with open('input.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# ---------- tokenizer: one token per distinct character ----------
chars = sorted(set(text))
vocab_size = len(chars)                       # 65 for tinyshakespeare
stoi = {ch: i for i, ch in enumerate(chars)}
itos = {i: ch for i, ch in enumerate(chars)}
encode = lambda s: [stoi[c] for c in s]
decode = lambda ids: ''.join(itos[i] for i in ids)

# ---------- the corpus as one long tensor of ids ----------
data = torch.tensor(encode(text), dtype=torch.long)   # (~1.1e6,)
n = int(0.9 * len(data))
train_data, val_data = data[:n], data[n:]

block_size = 128        # context: how far back the model may look
batch_size = 64         # independent sequences trained in parallel
device = 'cuda' if torch.cuda.is_available() else 'cpu'

def get_batch(split):
    d = train_data if split == 'train' else val_data
    ix = torch.randint(len(d) - block_size, (batch_size,))       # (64,) start offsets
    x = torch.stack([d[i:i + block_size] for i in ix])           # (64, 128)
    y = torch.stack([d[i + 1:i + block_size + 1] for i in ix])   # (64, 128) shifted by ONE
    return x.to(device), y.to(device)

# what one row actually teaches, unrolled:
xb, yb = get_batch('train')
for t in range(4):
    print('context', xb[0, :t + 1].tolist(), '-> target', yb[0, t].item())`,
      annotations: {
        9: 'sorted() matters: it makes the id assignment deterministic across runs, so a checkpoint trained today decodes correctly tomorrow.',
        10: 'vocab_size = 65 decides two things: the width of every logit vector, and the initial loss (ln 65 — see the math below).',
        14: 'decode is only needed at generation time, but write it now — you will debug the model by reading its output, not by reading tensors.',
        17: 'int64 ids, ~1.1M of them: about 9 MB in memory. The entire "dataset pipeline" is one tensor, which is exactly right at this scale.',
        18: 'Split by position, not by shuffling. Shuffled character windows would put near-identical continuations in both splits and your val loss would be a lie.',
        27: 'Upper bound is len(d) - block_size, so the largest start index is len(d) - block_size - 1 and the target slice ends at exactly len(d) - 1. That off-by-one is deliberate: y needs one token MORE than x.',
        29: 'This line is the entire supervision signal. No labels, no annotation, no human. Shift by one, predict the next thing — everything else in this file is machinery around this idea.',
        35: 'Print this once. Seeing 128 (context -> target) pairs fall out of one row is the moment "next-token prediction" stops being a slogan.',
      },
    },
    {
      type: 'intuition',
      title: 'Step 2: the model, one class at a time',
      md: `Five classes, each small enough to hold in your head. Build them bottom-up and test shapes as you go.

- **Head** — one causal self-attention head. QKV, scale, mask, softmax, mix.
- **MultiHeadAttention** — several Heads in parallel, concatenated, then a linear projection.
- **FeedForward** — a two-layer MLP with a 4× expansion. Per-token thinking, no mixing.
- **Block** — attention sublayer + feed-forward sublayer, each pre-normed and residual-added.
- **GPT** — embeddings, the block stack, a final LayerNorm, and a projection to vocabulary logits.

Everything in the model preserves the shape (B, T, d_model). That invariance is what lets you stack blocks without touching any other code.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: '(a) Head — one causal self-attention head',
      code: `import torch.nn as nn
from torch.nn import functional as F

n_embd  = 192           # d_model: the width of the residual stream
n_head  = 6             # heads per block -> head_size = 192 // 6 = 32
n_layer = 6             # transformer blocks stacked
dropout = 0.1

class Head(nn.Module):
    """One head of causal self-attention."""

    def __init__(self, head_size):
        super().__init__()
        self.key   = nn.Linear(n_embd, head_size, bias=False)
        self.query = nn.Linear(n_embd, head_size, bias=False)
        self.value = nn.Linear(n_embd, head_size, bias=False)
        self.register_buffer('tril', torch.tril(torch.ones(block_size, block_size)))
        self.dropout = nn.Dropout(dropout)

    def forward(self, x):                                    # x: (B, T, 192)
        B, T, C = x.shape
        k = self.key(x)                                      # (B, T, 32)
        q = self.query(x)                                    # (B, T, 32)
        wei = q @ k.transpose(-2, -1) * k.shape[-1] ** -0.5  # (B, T, T)
        wei = wei.masked_fill(self.tril[:T, :T] == 0, float('-inf'))
        wei = F.softmax(wei, dim=-1)                         # every row sums to 1
        wei = self.dropout(wei)
        v = self.value(x)                                    # (B, T, 32)
        return wei @ v                                       # (B, T, 32)`,
      annotations: {
        5: 'head_size = n_embd // n_head = 32. Total attention width stays 192 no matter how many heads — more heads means narrower heads, not more compute.',
        14: 'bias=False on Q/K/V is deliberate and standard: the scores are dot products, and a constant bias added to every key shifts every score in a row by the same amount, which softmax cancels anyway.',
        17: 'register_buffer, not nn.Parameter: tril is a constant. It gets no gradient, is not counted in parameters, but DOES move with .to(device) and DOES get saved in state_dict. Storing it as a plain attribute is the classic device bug.',
        21: 'B, T, C unpacked from the actual input, not from the globals — T can be shorter than block_size during generation, and this is what makes the mask slice below work.',
        24: 'Scale by 1/sqrt(head_size) = 1/sqrt(32) ~= 0.1768. Precedence check: ** binds tighter than *, so this is (q @ k^T) * 0.1768. Without it, dot-product variance grows with head_size and softmax saturates.',
        25: 'The causal mask, applied BEFORE softmax. -inf goes through exp() to exactly 0, so the row renormalizes over the past only. Zeroing AFTER softmax would leave the row summing to less than 1 and silently shrink the output.',
        26: 'dim=-1 is the KEY axis: token i distributes exactly 1.0 of attention across the tokens it is allowed to see.',
        27: 'Dropout on the attention weights themselves — random edges of the token graph are cut each step. Harmless here, essential at scale.',
        29: 'Output shape is (B, T, head_size), NOT (B, T, n_embd). The concat in MultiHeadAttention is what restores the width.',
      },
    },
    {
      type: 'math',
      intro: 'The two lines people get wrong: the scale, and the order of mask-then-softmax.',
      latex: [
        '\\text{score}_{ij} = \\frac{q_i \\cdot k_j}{\\sqrt{d_k}}, \\qquad d_k = 32 \\;\\Rightarrow\\; \\frac{1}{\\sqrt{32}} \\approx 0.1768',
        '\\text{mask: } \\text{score}_{ij} \\leftarrow -\\infty \\;\\text{ for } j > i \\qquad \\Rightarrow \\qquad e^{-\\infty} = 0 \\;\\Rightarrow\\; w_{ij} = 0, \\;\\; \\textstyle\\sum_{j \\le i} w_{ij} = 1',
        '\\text{If you instead zero AFTER softmax: } \\textstyle\\sum_{j \\le i} w_{ij} < 1 \\;\\Rightarrow\\; \\text{the mixed output shrinks toward } 0 \\text{ for early positions.}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: '(b) MultiHeadAttention — heads in parallel, then a projection',
      code: `class MultiHeadAttention(nn.Module):
    """n_head heads running in parallel, concatenated, then projected."""

    def __init__(self, num_heads, head_size):
        super().__init__()
        self.heads = nn.ModuleList([Head(head_size) for _ in range(num_heads)])
        self.proj = nn.Linear(num_heads * head_size, n_embd)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x):                                  # (B, T, 192)
        out = torch.cat([h(x) for h in self.heads], dim=-1)  # 6 x (B,T,32) -> (B,T,192)
        return self.dropout(self.proj(out))                  # (B, T, 192)`,
      annotations: {
        6: 'nn.ModuleList, not a plain Python list: a plain list hides the submodules from .parameters(), so the heads never get gradients and never move to the GPU. Silent, and it still "trains".',
        7: 'num_heads * head_size = 6 * 32 = 192 = n_embd, so this projection is square (192 -> 192). It is not decoration: without it the concatenated head outputs are never allowed to talk to each other before rejoining the residual stream.',
        11: 'A Python loop over heads is the readable version. Production code batches all heads in one matmul by reshaping to (B, n_head, T, head_size) — same math, one kernel launch instead of six.',
        12: 'Dropout here is on the sublayer OUTPUT, distinct from the dropout inside each Head on the attention weights. Both exist in the original paper.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: '(c) FeedForward — where each token thinks alone',
      code: `class FeedForward(nn.Module):
    """Per-token MLP with the standard 4x expansion."""

    def __init__(self, n_embd):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(n_embd, 4 * n_embd),      # 192 -> 768
            nn.GELU(),
            nn.Linear(4 * n_embd, n_embd),      # 768 -> 192
            nn.Dropout(dropout),
        )

    def forward(self, x):
        return self.net(x)                       # (B, T, 192) -> (B, T, 192)`,
      annotations: {
        7: 'The 4x expansion is the convention from "Attention Is All You Need" and every GPT since. Wider inner layer = room to compute non-linear features before compressing back.',
        8: 'GELU rather than ReLU: smooth, non-zero gradient for small negatives, and what GPT-2 onward actually use. ReLU works too and is what the original paper used.',
        9: 'Back down to n_embd, because the residual add requires the sublayer output to match the stream width exactly.',
        14: 'No mixing across T here. Attention moves information BETWEEN tokens; the FFN transforms each token independently. That alternation is the entire transformer.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: '(d) Block — pre-norm and the two residual additions',
      code: `class Block(nn.Module):
    """Transformer block: communicate (attention), then compute (FFN)."""

    def __init__(self, n_embd, n_head):
        super().__init__()
        head_size = n_embd // n_head
        self.sa = MultiHeadAttention(n_head, head_size)
        self.ffwd = FeedForward(n_embd)
        self.ln1 = nn.LayerNorm(n_embd)
        self.ln2 = nn.LayerNorm(n_embd)

    def forward(self, x):
        x = x + self.sa(self.ln1(x))      # sublayer 1: mix across tokens
        x = x + self.ffwd(self.ln2(x))    # sublayer 2: think per token
        return x`,
      annotations: {
        9: 'Two separate LayerNorms — they have their own learned gain and bias (2 * 192 = 384 params each). Reusing one module for both sublayers is a real bug people ship.',
        13: 'Pre-norm: normalize the COPY that goes into the sublayer, never the residual stream itself. x flows to the output untouched, so the gradient has a clean identity path from the loss all the way to the embeddings.',
        14: 'Same pattern, second sublayer. Written this way, the block is literally "x = x + something" twice — that is the residual stream, and everything else just writes into it.',
      },
    },
    {
      type: 'note',
      md: 'Pre-norm vs post-norm is a favourite follow-up. The 2017 paper used **post-norm** — `x = LayerNorm(x + Sublayer(x))` — and needed learning-rate warmup to train at all, because the norm sits directly on the residual path and rescales the gradient at every layer. **Pre-norm** — `x = x + Sublayer(LayerNorm(x))` — leaves an unobstructed identity path from the loss to layer 1, which is why GPT-2 switched and why deep stacks train without babysitting. The price is a residual stream whose magnitude grows with depth, which is exactly why there is one **final LayerNorm** after the last block.',
    },
    {
      type: 'code',
      lang: 'python',
      title: '(e) GPT — embeddings, the stack, and the loss',
      code: `class GPT(nn.Module):
    def __init__(self):
        super().__init__()
        self.token_embedding = nn.Embedding(vocab_size, n_embd)      # (65, 192)
        self.position_embedding = nn.Embedding(block_size, n_embd)   # (128, 192)
        self.blocks = nn.Sequential(*[Block(n_embd, n_head) for _ in range(n_layer)])
        self.ln_f = nn.LayerNorm(n_embd)
        self.lm_head = nn.Linear(n_embd, vocab_size)                 # 192 -> 65

    def forward(self, idx, targets=None):                    # idx: (B, T) int64
        B, T = idx.shape
        tok = self.token_embedding(idx)                                    # (B, T, 192)
        pos = self.position_embedding(torch.arange(T, device=idx.device))  # (T, 192)
        x = tok + pos                                                      # (B, T, 192)
        x = self.blocks(x)                                                 # (B, T, 192)
        x = self.ln_f(x)                                                   # (B, T, 192)
        logits = self.lm_head(x)                                           # (B, T, 65)

        if targets is None:
            return logits, None
        B, T, C = logits.shape
        loss = F.cross_entropy(logits.view(B * T, C), targets.view(B * T))
        return logits, loss`,
      annotations: {
        4: 'nn.Embedding is a lookup table, not a matrix multiply: 65 rows of 192 numbers. Row i IS the learned meaning of character i.',
        5: 'A separate learned table for positions, one row per slot 0..127. This is why the model cannot accept T > block_size — row 128 does not exist. (RoPE and ALiBi remove this ceiling; that is a later module.)',
        6: 'nn.Sequential works because every block maps (B,T,192) -> (B,T,192). Shape invariance is what makes depth a hyperparameter instead of a rewrite.',
        8: 'The only place vocab_size appears after the embedding: 192 features in, one score per possible next character out.',
        13: 'pos has shape (T, 192) and tok has (B, T, 192) — broadcasting adds the same position vector to every sequence in the batch. Correct and intentional.',
        14: 'Addition, not concatenation. Meaning and position share the same 192 dimensions; the network learns to keep them separable. Concatenating would cost width for no measured gain.',
        16: 'The final LayerNorm before the head. Easy to forget, and forgetting it makes training noticeably worse with no error message.',
        22: 'THE reshape that everyone hits first. F.cross_entropy wants (N, C) logits and (N,) targets. Here N = B*T = 64*128 = 8192 independent predictions, C = 65. Get this wrong and you get a shape error — the good kind of bug, because it is loud.',
      },
    },
    {
      type: 'math',
      intro:
        'Parameter count, done by hand — this is the arithmetic an interviewer will ask you to do at the board. d = n_embd = 192, V = 65, T = 128, L = 6 layers.',
      latex: [
        '\\text{per block: } \\underbrace{3d^2}_{Q,K,V} + \\underbrace{d^2}_{\\text{proj}} + \\underbrace{4d^2 + 4d^2}_{\\text{FFN } 4\\times} = 12d^2 = 12 \\cdot 192^2 = 442{,}368',
        '\\;+\\; 1{,}920 \\text{ bias and LayerNorm params} \\;=\\; 444{,}288 \\text{ per block} \\;\\times\\; 6 \\;=\\; 2{,}665{,}728',
        '\\text{embeddings: } Vd + Td = 65 \\cdot 192 + 128 \\cdot 192 = 12{,}480 + 24{,}576 = 37{,}056',
        '\\text{final LN } 2d = 384, \\quad \\text{lm\\_head } dV + V = 12{,}545 \\quad \\Rightarrow \\quad \\textbf{total} = 2{,}715{,}713',
      ],
    },
    {
      type: 'note',
      md: 'Two numbers worth internalising from that count. First, **the FFN is two-thirds of every block** (8d² vs 4d² for attention) — attention gets all the attention, but most of the parameters are in the MLP. Second, the *attention score matrix* is nowhere in the count: at B=64, T=128, 6 heads, 6 layers it is 64·6·128·128 = 6.29M floats **per layer** (~25 MB in fp32) of pure activation memory, recomputed every step and never saved. Weights vs activations is a distinction interviewers probe on purpose.',
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One token through the whole model, then the loop',
        notice:
          'Left = the pipeline stage. Right = the actual tensor at that stage. Step through once watching only the shapes; step through again watching what the residual stream carries.',
        leftLabel: 'Stage',
        rightLabel: 'Tensor',
        frames: [
          {
            note: 'Start. The prompt "First" is 5 characters, encoded to 5 integer ids. Batch of 1.',
            stack: [{ name: 'idx', to: 'ids' }],
            heap: [{ id: 'ids', value: '(1, 5) int64', label: 'token ids: [18, 47, 56, 57, 58]' }],
          },
          {
            note: 'Token embedding: each id indexes a row of the (65, 192) table. Meaning, with no idea of position yet.',
            stack: [
              { name: 'idx', to: 'ids' },
              { name: 'tok', to: 'te' },
            ],
            heap: [
              { id: 'ids', value: '(1, 5) int64', label: 'token ids' },
              { id: 'te', value: '(1, 5, 192)', label: 'token_embedding(idx)' },
            ],
          },
          {
            note: 'Position embedding for slots 0..4, shape (5, 192), broadcast over the batch and ADDED. The residual stream is born.',
            stack: [
              { name: 'tok', to: 'te' },
              { name: 'pos', to: 'pe' },
              { name: 'x', to: 'x0' },
            ],
            heap: [
              { id: 'te', value: '(1, 5, 192)', label: 'meaning' },
              { id: 'pe', value: '(5, 192)', label: 'position_embedding(arange(5))' },
              { id: 'x0', value: '(1, 5, 192)', label: 'x = tok + pos' },
            ],
          },
          {
            note: 'Block 1, sublayer 1. ln1(x) is normalized, 6 heads each produce (1,5,32), concatenated back to 192, projected — then ADDED to x. The stream is never overwritten.',
            stack: [
              { name: 'x (in)', to: 'x0' },
              { name: 'sa(ln1(x))', to: 'sa1' },
              { name: 'x (out)', to: 'x1' },
            ],
            heap: [
              { id: 'x0', value: '(1, 5, 192)', label: 'residual stream, before' },
              { id: 'sa1', value: '(1, 5, 192)', label: 'attention says: token 4 should look at tokens 0-4' },
              { id: 'x1', value: '(1, 5, 192)', label: 'x = x + sa(...)  — a correction, not a replacement' },
            ],
          },
          {
            note: 'Block 1, sublayer 2. The FFN transforms each of the 5 positions independently (192 -> 768 -> 192) and is added on top. No token talks to another here.',
            stack: [
              { name: 'x (in)', to: 'x1' },
              { name: 'ffwd(ln2(x))', to: 'ff1' },
              { name: 'x (out)', to: 'x2' },
            ],
            heap: [
              { id: 'x1', value: '(1, 5, 192)', label: 'after attention' },
              { id: 'ff1', value: '(1, 5, 192)', label: 'per-token computation' },
              { id: 'x2', value: '(1, 5, 192)', label: 'block 1 output' },
            ],
          },
          {
            note: 'Blocks 2 through 6: the identical shape goes in and comes out, five more times. Depth is just repetition — that is why n_layer is a single integer.',
            stack: [
              { name: 'x', to: 'x2' },
              { name: 'blocks[1:6]', to: 'xN' },
            ],
            heap: [
              { id: 'x2', value: '(1, 5, 192)', label: 'after block 1' },
              { id: 'xN', value: '(1, 5, 192)', label: 'after block 6 — 2.67M params of processing later' },
            ],
          },
          {
            note: 'Final LayerNorm, then lm_head projects 192 features to 65 scores. Now there is a full next-character distribution at EVERY position.',
            stack: [
              { name: 'ln_f(x)', to: 'xf' },
              { name: 'logits', to: 'lg' },
            ],
            heap: [
              { id: 'xf', value: '(1, 5, 192)', label: 'normalized stream' },
              { id: 'lg', value: '(1, 5, 65)', label: '5 predictions: what follows "F", "Fi", "Fir", "Firs", "First"' },
            ],
          },
          {
            note: 'Generation uses ONLY the last row. Positions 0-3 predicted characters we already have; keeping them is the classic sampling bug.',
            stack: [
              { name: 'logits', to: 'lg' },
              { name: 'logits[:, -1, :]', to: 'last' },
            ],
            heap: [
              { id: 'lg', value: '(1, 5, 65)', label: 'all positions' },
              { id: 'last', value: '(1, 65)', label: 'prediction after "First" — the only row we want' },
              { id: 'drop', value: '(1, 4, 65)', label: 'positions 0-3: correct, but already known', freed: true },
            ],
          },
          {
            note: 'Divide by temperature, optionally mask all but top-k / top-p, softmax, then multinomial draws ONE id. Sampling, not argmax.',
            stack: [
              { name: 'last / temp', to: 'last' },
              { name: 'probs', to: 'pr' },
              { name: 'idx_next', to: 'nxt' },
            ],
            heap: [
              { id: 'last', value: '(1, 65)', label: 'logits, reshaped by temperature' },
              { id: 'pr', value: '(1, 65)', label: 'probabilities, sum = 1' },
              { id: 'nxt', value: '(1, 1)', label: 'one sampled id, e.g. 1 -> " "' },
            ],
          },
          {
            note: 'Append and loop. Context grows by one every step; once it passes block_size=128 the oldest tokens get cropped away, because position row 128 does not exist.',
            stack: [
              { name: 'idx', to: 'ids6' },
              { name: 'next pass', to: 'crop' },
            ],
            heap: [
              { id: 'ids6', value: '(1, 6) int64', label: '"First " — feed this back in' },
              { id: 'crop', value: 'idx[:, -128:]', label: 'the crop that keeps positions legal' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Step 3: the training loop',
      md: `Nothing exotic. The loop is 8 lines; the two things worth care are the evaluation helper and the very first loss.

- **AdamW at lr = 3e-4** is the default that works. At this size you can push to 1e-3 with a small model and shorter context.
- **estimate_loss()** averages over many batches. A single batch's loss is noisy enough to make you draw the wrong conclusion about a hyperparameter.
- Wrap it in \`@torch.no_grad()\` — otherwise you build a graph you never backprop through and pay the memory for nothing.
- Bracket it with \`model.eval()\` … \`model.train()\`. Here that toggles **dropout** (and BatchNorm, if you had any). Forgetting \`model.train()\` at the end silently disables dropout for the rest of training.
- \`optimizer.zero_grad(set_to_none=True)\` — gradients *accumulate* by default. Skip this and you are summing the gradient of every batch you ever saw.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The training loop, with an honest evaluation helper',
      code: `model = GPT().to(device)
print(sum(p.numel() for p in model.parameters()), 'parameters')   # 2715713

optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4)

@torch.no_grad()
def estimate_loss(eval_iters=200):
    out = {}
    model.eval()
    for split in ('train', 'val'):
        losses = torch.zeros(eval_iters)
        for k in range(eval_iters):
            x, y = get_batch(split)
            _, loss = model(x, y)
            losses[k] = loss.item()
        out[split] = losses.mean().item()
    model.train()
    return out

for step in range(5000):
    if step % 500 == 0:
        L = estimate_loss()
        print(f"step {step:5d}  train {L['train']:.4f}  val {L['val']:.4f}")

    xb, yb = get_batch('train')
    _, loss = model(xb, yb)
    optimizer.zero_grad(set_to_none=True)
    loss.backward()
    optimizer.step()`,
      annotations: {
        2: 'Print this before anything else. 2,715,713 — if your number differs, you have wired something wrong, and finding it now costs seconds instead of an hour of training.',
        4: 'AdamW, not Adam: it decouples weight decay from the adaptive step. For transformers this is the default everyone uses, and the difference is measurable.',
        6: 'The decorator does two jobs: no autograd graph is built (big memory saving) and the eval runs faster. It is on the FUNCTION, so you cannot forget it at a call site.',
        9: 'eval() turns dropout off. Evaluating with dropout on measures a randomly crippled model and gives you a val loss that is too high, inconsistently.',
        11: 'A single batch has real variance. 200 batches averaged is the difference between "the LR change helped" and "I got a lucky batch".',
        17: 'Back to train() before returning. This one line is a genuinely common bug: the function looks pure, but eval() mutated the model.',
        22: 'Evaluate before stepping, so step 0 prints the untrained loss — the sanity check the math section below defines exactly.',
        27: 'zero_grad BEFORE backward. Gradients accumulate into .grad; that behaviour is a feature (gradient accumulation over micro-batches) and a footgun in equal measure.',
        29: 'That is the entire optimizer. Everything hard about training this model is in the four lines above it, not here.',
      },
    },
    {
      type: 'math',
      intro:
        'The one number you can predict before you run anything: an untrained model is a uniform guesser over the vocabulary.',
      latex: [
        '\\mathcal{L} = -\\log p(\\text{correct token}), \\qquad \\text{untrained: } p \\approx \\tfrac{1}{V} \\;\\Rightarrow\\; \\mathcal{L}_0 \\approx \\ln V',
        'V = 65 \\;\\Rightarrow\\; \\mathcal{L}_0 \\approx \\ln 65 = 4.1744',
        '\\text{perplexity} = e^{\\mathcal{L}} \\;\\Rightarrow\\; e^{4.1744} = 65 \\;\\;(\\text{a 65-way coin flip}), \\qquad \\mathcal{L} = 1.5 \\Rightarrow e^{1.5} \\approx 4.5',
      ],
    },
    {
      type: 'note',
      md: 'How to read your own run, honestly. **Step 0 must print roughly 4.17.** If it prints 4.3–4.6 your initialization is a little loose (logits are not quite zero at init) — fine. If it prints 8, or 0.9, or NaN, stop: something is wrong before training even starts. From there the loss should fall steeply for the first few hundred steps and then grind. Published nanoGPT-style char-level runs on this corpus land somewhere near **1.5** for a model several times larger than this one; a 2.7M-parameter version should be expected in the rough neighbourhood of 1.5–1.9. Those are **expectations, not measurements** — I did not run this. What you should actually check is the *shape* of the curve and the train/val gap: if val stops falling while train keeps going, you are memorising 1 MB of text, which at this size happens quickly.',
    },
    {
      type: 'intuition',
      title: 'Step 4: generation is a loop around forward()',
      md: `The model only ever answers one question: "given these tokens, what comes next?" Generation asks it repeatedly.

1. **Crop** the context to the last block_size tokens — position embeddings beyond row 127 do not exist.
2. **Forward** the whole context. You get logits at every position; you want only the **last** one.
3. **Temperature**: divide the logits before softmax. Lower = sharper, higher = flatter.
4. **top-k / top-p** (optional): set everything else to −inf so it cannot be sampled.
5. **Softmax → multinomial**: draw one token from the distribution. Not argmax — argmax loops forever on repeated text.
6. **Append** and go back to 1.

Everything you know as "the model is typing" is this loop, one token per iteration.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Generation with temperature, top-k and top-p',
      code: `@torch.no_grad()
def generate(model, idx, max_new_tokens, temperature=1.0, top_k=None, top_p=None):
    model.eval()
    for _ in range(max_new_tokens):
        idx_cond = idx[:, -block_size:]                 # (B, <=128) crop to legal positions
        logits, _ = model(idx_cond)                     # (B, T, 65)
        logits = logits[:, -1, :] / temperature         # (B, 65) LAST position only

        if top_k is not None:
            v, _ = torch.topk(logits, min(top_k, logits.size(-1)))
            logits[logits < v[:, [-1]]] = -float('inf')

        if top_p is not None:
            sorted_logits, sorted_idx = torch.sort(logits, descending=True)
            cum = torch.cumsum(F.softmax(sorted_logits, dim=-1), dim=-1)
            remove = cum > top_p
            remove[..., 1:] = remove[..., :-1].clone()  # shift: always keep the top token
            remove[..., 0] = False
            logits[remove.scatter(1, sorted_idx, remove)] = -float('inf')

        probs = F.softmax(logits, dim=-1)               # (B, 65), sums to 1
        idx_next = torch.multinomial(probs, num_samples=1)   # (B, 1)
        idx = torch.cat((idx, idx_next), dim=1)         # (B, T+1)
    model.train()
    return idx

start = torch.zeros((1, 1), dtype=torch.long, device=device)   # id 0 = newline
print(decode(generate(model, start, 500, temperature=0.8, top_k=40)[0].tolist()))`,
      annotations: {
        1: 'no_grad around the whole loop. Generation builds no graph, so this is pure memory and speed saved — and without it a long generation will OOM.',
        5: 'The crop. Miss it and the moment your context exceeds 128 tokens you get an index error out of the position embedding — or worse, silently wrong positions if you wrote your own table.',
        7: 'Two things at once. logits[:, -1, :] discards T-1 perfectly valid predictions for tokens we already have — sampling from all positions instead of the last is THE classic generation bug. Dividing by temperature before softmax is what reshapes the distribution.',
        10: 'topk returns values sorted descending, so v[:, [-1]] is the k-th largest per row. The [[-1]] keeps the dimension so the comparison broadcasts to (B, 65).',
        11: 'Killed candidates go to -inf, not to 0: after softmax, -inf is exactly probability 0 and the remaining k renormalize to sum to 1.',
        17: 'The shift is the whole subtlety of top-p. Without it, a single token with probability above p would itself be removed and you would sample from nothing.',
        19: 'scatter maps the "remove" flags from sorted order back to vocabulary order — sorted_idx tells you where each sorted slot came from.',
        22: 'multinomial samples proportionally to probs. Using argmax here gives fluent, deterministic, and rapidly repetitive text; the randomness is a feature.',
        23: 'Append and loop. The context grows by one token per iteration, and the next forward pass recomputes everything from scratch — which is exactly the waste a KV-cache removes.',
        27: 'Start from a single newline. The model has no prompt-following ability whatsoever; it only continues text.',
      },
    },
    { type: 'visual', component: 'NextTokenSampler', props: {} },
    {
      type: 'note',
      md: 'Play with the three knobs above and match them to the code you just read. **Temperature** divides the logits: at 0.1 the largest logit dominates and output becomes near-deterministic and repetitive; at 1.5 the distribution flattens and rare characters start appearing, which reads as creativity right up until it reads as noise. **top-k** truncates to the k highest-probability tokens regardless of how the probability mass is spread — fine when the model is confident, too permissive when it is not. **top-p (nucleus)** keeps the smallest set of tokens whose probabilities sum to p, so it adapts: a confident step may keep 2 tokens, an uncertain one may keep 40. That adaptivity is why top-p is the modern default, usually with temperature ~0.7–1.0 alongside.',
    },
    {
      type: 'intuition',
      title: 'Scaling it up: what actually changes',
      md: `The code you just wrote is the real architecture. Turning it into something like GPT-2 changes settings, not structure.

- **Tokenizer**: characters → **BPE** (~50k subword vocab). Same code path, bigger embedding and lm_head; 1 token now carries ~4 characters, so context reaches ~4× further for the same block_size.
- **Corpus**: 1 MB → tens of GB. At that point data loading stops being one tensor and becomes memory-mapped shards.
- **Size**: more layers, more heads, wider d_model. GPT-2 small is 12 layers, 12 heads, d=768, context 1024 → 124M params.
- **Dropout**: keep 0.1 while the model can memorise the corpus; drop it to 0 once the data is large enough that overfitting is no longer the failure mode.
- **LR schedule**: linear **warmup** for the first few hundred steps, then **cosine decay**. Transformers with big batches genuinely need warmup.
- **Gradient clipping** at norm 1.0 — cheap insurance against the one bad batch that NaNs a week-long run.
- **Mixed precision** (bf16) plus \`torch.compile\` — roughly halves activation memory and speeds up training for free. See the DL "Self-Supervised Learning & Training at Scale" module for how these fit together with gradient accumulation and sharding.

The honest closing line: **from here it is a compute-budget problem, not a code problem.** Nothing in the architecture blocks you from GPT-2; a few hundred GPU-hours does.`,
    },
    {
      type: 'intuition',
      title: 'The interview payoff: what to say when asked "you built a GPT?"',
      md: `Assume the interviewer has met ten people who cloned nanoGPT. Three answers separate you instantly — none of them is about the architecture diagram.

1. **Why the mask is applied before softmax.** Because −inf becomes exactly 0 under exp, and the row *renormalizes over the visible tokens only*. Zeroing after softmax leaves the row summing to less than 1, so early positions get a systematically shrunken output. That is a bug you only know about if you wrote the line.
2. **Why the loss starts near ln(V).** An untrained model is a uniform guesser, so −log(1/65) = 4.17. It is your first and cheapest sanity check — and it tells you the loss is measured in nats, which makes perplexity e^loss.
3. **What the residual stream carries.** It is a running (B, T, d) accumulator that every block *adds to* and none replaces. Attention writes "information from other tokens", the FFN writes "per-token computation", the identity path guarantees the gradient reaches layer 1 undamaged. Say "residual stream", not "skip connection", and mean it.

And name the failure modes you actually hit — the honesty is what makes it credible:

- The **cross_entropy reshape**: (B,T,C) logits must become (B*T, C) with (B*T,) targets. Loud shape error, quick fix.
- **Forgetting model.eval()** in the evaluation helper, so dropout corrupted every val number.
- **Sampling from all T positions** instead of only the last one, producing output that looked like a bug in the model and was a bug in six characters of indexing.
- **register_buffer vs a plain attribute** for the causal mask — the plain attribute stays on CPU when you call .to('cuda').`,
    },
  ],
  quiz: [
    {
      question: 'get_batch returns x = d[i : i+128] and y = d[i+1 : i+129]. What does one row of this batch teach the model?',
      options: [
        {
          text: 'One example: predict character 129 from the previous 128',
          explanation: 'That would waste 127 of the 128 predictions. The model produces logits at EVERY position, and the loss uses all of them.',
        },
        {
          text: '128 examples: at every position t, predict the character that follows the first t+1 characters',
          explanation:
            'Correct. The causal mask makes each position a valid independent prediction, so a (64, 128) batch produces 64 × 128 = 8,192 supervised predictions per step.',
        },
        {
          text: 'It teaches the model to reconstruct x from y, like an autoencoder',
          explanation: 'No reconstruction here — this is next-token prediction. The shift by one is the label, and the direction matters.',
        },
      ],
      correct: 1,
    },
    {
      question: 'With batch_size=64, block_size=128, vocab_size=65, what shapes does F.cross_entropy need in the training forward pass?',
      options: [
        { text: 'logits (64, 128, 65) and targets (64, 128) — pass them as they are', explanation: 'F.cross_entropy accepts (N, C) with (N,) targets, or (N, C, d1...) with class-dim second. The (B, T, C) layout is neither, which is why the reshape exists.' },
        { text: 'logits (65, 8192) and targets (8192,)', explanation: 'Class dimension is on the wrong axis — cross_entropy wants examples first, classes second.' },
        {
          text: 'logits (8192, 65) and targets (8192,)',
          explanation: 'Correct. B*T = 64 × 128 = 8,192 independent predictions, each over C = 65 classes. That is exactly logits.view(B*T, C) and targets.view(B*T).',
        },
      ],
      correct: 2,
    },
    {
      question: 'Your untrained model prints its very first training loss. What number should you expect, and why?',
      options: [
        {
          text: 'About 4.17 — an untrained model is a uniform guesser, so the loss is ln(vocab_size) = ln(65)',
          explanation: 'Correct. −log(1/65) = 4.1744. It is the cheapest sanity check in the whole project: a wildly different number means something is broken before training starts.',
        },
        { text: 'About 0.69 — that is the standard starting loss for any classifier', explanation: 'ln(2) = 0.69 is the two-class case. With 65 classes the uniform loss is ln(65).' },
        { text: 'Close to 0 — the model has not learned to be wrong yet', explanation: 'Backwards: an untrained model is maximally wrong. Loss near 0 at step 0 would mean your targets are leaking into the inputs.' },
      ],
      correct: 0,
    },
    {
      question: 'Why is the causal mask stored with register_buffer instead of as a plain self.tril = ... attribute?',
      options: [
        { text: 'register_buffer makes it a learnable parameter with its own gradient', explanation: 'The opposite — buffers explicitly receive no gradient and are not returned by .parameters(). nn.Parameter is the learnable one.' },
        {
          text: 'It is a constant, but it must still move with .to(device) and be saved in state_dict — that is exactly what a buffer is for',
          explanation:
            'Correct. A plain attribute stays on the CPU when you call model.to("cuda"), producing a device-mismatch error at the masked_fill line.',
        },
        { text: 'To keep it out of the state_dict so checkpoints stay small', explanation: 'Buffers ARE saved in state_dict by default. The size saving would be irrelevant anyway — it is a fixed triangle of ones.' },
      ],
      correct: 1,
    },
    {
      question: 'In one block with d_model = 192, how many parameters does the feed-forward network hold (ignore biases)?',
      options: [
        { text: '4d² = 147,456 — one 4× expansion layer', explanation: 'That counts only the up-projection. The FFN has TWO linear layers: 192→768 and 768→192.' },
        {
          text: '8d² = 294,912 — a 192→768 layer plus a 768→192 layer',
          explanation:
            'Correct: 192·768 + 768·192 = 147,456 × 2 = 294,912. Note this is twice the attention block\'s 4d² — most transformer parameters live in the MLP, not in attention.',
        },
        { text: '12d² = 442,368', explanation: 'That is the whole block (attention 4d² + FFN 8d²), not the FFN alone.' },
      ],
      correct: 1,
    },
    {
      question: 'What breaks if you apply the causal mask AFTER the softmax (zeroing future weights) instead of before it (setting them to −inf)?',
      options: [
        {
          text: 'Nothing — zero weight is zero weight either way',
          explanation:
            'The weights are zero either way, but the SURVIVING weights are wrong: they were normalized against the future scores that you then deleted.',
        },
        { text: 'The attention rows would sum to more than 1 and the output would explode', explanation: 'Removing mass can only reduce the sum, never increase it.' },
        {
          text: 'Each row would sum to less than 1, so early positions produce systematically shrunken outputs',
          explanation:
            'Correct. Token 0 would keep only its own share of a distribution normalized over all 128 positions. Masking before softmax renormalizes over the visible tokens only, which is the point.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Your generated text looks like random characters even after the loss has clearly dropped. Which bug fits best?',
      options: [
        {
          text: 'You are sampling from logits at all T positions instead of only logits[:, -1, :]',
          explanation:
            'Correct — and the classic. The earlier positions predict characters you already have; feeding those back produces text that has nothing to do with the growing context, while the loss looks perfectly healthy.',
        },
        { text: 'The learning rate is too high', explanation: 'A too-high LR shows up in the loss (spiky, or NaN), not as healthy loss with broken samples.' },
        { text: 'You forgot the residual connections', explanation: 'Missing residuals would hurt the loss itself, and badly — the symptom described here is a healthy loss with broken output.' },
      ],
      correct: 0,
    },
    {
      question: 'Temperature 0.1 versus temperature 1.5 at sampling time — what actually changes?',
      options: [
        { text: 'The model recomputes its weights differently', explanation: 'Nothing about the model changes. Temperature is applied to the output logits, after all training is done.' },
        { text: 'Only the speed of generation changes', explanation: 'Cost is identical — it is one division on a 65-element vector.' },
        {
          text: 'Logits are divided by it before softmax: 0.1 sharpens toward near-deterministic and repetitive, 1.5 flattens toward adventurous and eventually incoherent',
          explanation:
            'Correct. Dividing by a small number magnifies gaps between logits; dividing by a large number shrinks them. As temperature → 0 sampling approaches argmax; as it grows the distribution approaches uniform.',
        },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Walk me through the GPT you built, top to bottom, in three minutes.',
      answer:
        'Data first: a text file, a character-level tokenizer (65 tokens for Shakespeare), the whole corpus as one int64 tensor, and get_batch returning x and y where y is x shifted by one — that shift is the entire supervision signal, and a (64, 128) batch is 8,192 predictions, not 64. Model: token embedding (65×192) plus a learned position embedding (128×192), added; then 6 blocks, each doing x = x + attention(LayerNorm(x)) and x = x + FFN(LayerNorm(x)); then a final LayerNorm and a linear head to 65 logits. Attention inside a block is 6 heads of size 32: Q, K, V projections, scores scaled by 1/√32, masked to −inf above the diagonal, row softmax, mix the values, concatenate the heads back to 192, project. Training: AdamW at 3e-4, cross-entropy on logits reshaped to (8192, 65), an estimate_loss helper under no_grad with eval/train bracketing. Generation: crop the context to 128, forward, take the last position\'s logits, temperature, optional top-k/top-p, softmax, multinomial, append, repeat. Total 2,715,713 parameters. Close with the honest scope: it produces Shakespeare-flavoured text, and the difference from a real model is scale and tokenizer, not architecture.',
      isCaseBased: false,
    },
    {
      question: 'Why is the causal mask applied before the softmax rather than after? Be precise.',
      answer:
        'Because softmax normalizes over whatever is in the row. Setting future scores to −inf means exp(−inf) = 0, so those entries contribute nothing to the denominator and the remaining weights renormalize over the visible tokens only, summing to exactly 1. If instead you softmax over everything and then zero the future entries, the surviving weights were normalized against a denominator that included the future scores — so each row now sums to less than 1, and the deficit is worst at position 0 (which keeps 1/T of its mass) and shrinks toward the end of the sequence. The result is a position-dependent attenuation of the attention output that no amount of training cleanly repairs. Bonus point: implementations use −inf (or a large negative like −1e9 in fp16, since −inf can produce NaN when a whole row is masked) rather than multiplying by a 0/1 mask for exactly this reason.',
      isCaseBased: false,
    },
    {
      question: 'What is the residual stream, and why does it matter more than the phrase "skip connection" suggests?',
      answer:
        'The residual stream is the (B, T, d_model) tensor that runs from the embeddings to the final LayerNorm, and every sublayer only ever ADDS to it: x = x + attention(LN(x)), x = x + FFN(LN(x)). Three consequences. (1) Optimization: the identity path has derivative exactly 1, so the gradient reaches layer 1 without being multiplied by a chain of Jacobians — this is what makes deep stacks trainable at all. (2) Representation: it is a shared communication channel with a fixed width; attention writes information gathered from other tokens into it, the FFN writes per-token computation into it, and each layer reads whatever previous layers left there. Nothing is overwritten, so early features survive to the top. (3) Interpretability: because contributions are additive, you can decompose the final logits into per-layer, per-head contributions — the whole "logit lens" and circuits literature depends on this additivity. Calling it a skip connection describes the wiring; calling it a residual stream describes what it is for.',
      isCaseBased: false,
    },
    {
      question: 'Case: you train the model, the loss falls from 4.17 to 1.6, but the generated text is complete gibberish. Debug it.',
      answer:
        'A healthy loss with broken samples localizes the bug to generation, since the loss only exercises the forward pass and the sampling path is separate code. Check in this order. (1) Are you taking logits[:, -1, :]? Sampling from all T positions is the single most common cause and produces exactly this symptom. (2) Is the decoder the inverse of the encoder — same sorted vocabulary, same stoi/itos? A vocabulary rebuilt in a different order after loading a checkpoint decodes valid ids into noise. (3) Is model.eval() set? Dropout during generation adds noise to every step. (4) Is the context cropped to the last block_size tokens, and are positions still starting at 0 after the crop? (5) Is temperature sane — a temperature of 10 makes any model look untrained. (6) Only then suspect the model: sample with temperature 0.1 and top_k=1 (effectively argmax); if that produces repetitive but legible English, the model is fine and it was a sampling knob. Order matters here: the cheap checks eliminate 90% of cases before you touch the architecture.',
      isCaseBased: true,
    },
    {
      question: 'How many parameters does your model have, and where do they live? Derive it.',
      answer:
        'With d = 192, V = 65, T = 128, 6 layers, 6 heads: per block, attention is 3d² for Q/K/V plus d² for the output projection = 4d²; the FFN is d·4d + 4d·d = 8d²; so 12d² = 12 × 36,864 = 442,368, plus 1,920 in biases and the two LayerNorms = 444,288 per block. Six blocks = 2,665,728. Embeddings: 65×192 = 12,480 tokens plus 128×192 = 24,576 positions = 37,056. Final LayerNorm 384, lm_head 192×65 + 65 = 12,545. Total 2,715,713. Two observations that score points: the FFN holds two-thirds of every block, so "transformers are mostly attention" is false by parameter count; and the n×n attention matrix is NOT a parameter — at B=64, T=128, 6 heads it is 6.29M floats of activation memory per layer, recomputed every step, which is why activations and not weights determine your maximum batch size.',
      isCaseBased: false,
    },
    {
      question: 'Explain temperature, top-k and top-p, and say when you would reach for each.',
      answer:
        'All three modify the next-token distribution at inference; none touches the weights. Temperature divides the logits before softmax: T < 1 magnifies the gaps and sharpens toward argmax; T > 1 shrinks them toward uniform. It reshapes the whole distribution but never removes a candidate, so a bad token with 0.1% probability still gets drawn eventually over thousands of steps. top-k masks all but the k highest logits to −inf, hard-truncating the tail — good, but k is fixed regardless of whether the model is certain (where k=40 is far too permissive) or uncertain (where it may be too tight). top-p keeps the smallest set of tokens whose cumulative probability reaches p, so the cut adapts to the model\'s confidence: 2 candidates at a confident step, 40 at an ambiguous one. Practice: top-p ≈ 0.9 with temperature ≈ 0.7–1.0 for open-ended generation; low temperature or greedy for code, extraction, and anything with one correct answer; top-k is fine and cheap when you just want to clip the garbage tail. They compose — apply temperature first, then truncation.',
      isCaseBased: false,
    },
    {
      question: 'Case: your training loss keeps falling but validation loss bottoms out at step 1,500 and then rises. What do you do, and what do you NOT do?',
      answer:
        'That is textbook overfitting, and at this scale it is expected: 2.7M parameters on 1 MB of text is roughly one parameter per 0.4 characters, so the model can memorise a real fraction of the corpus. What I do, in order of value: (1) get more data — this is the only fix that raises the ceiling rather than lowering the model; (2) raise dropout from 0.1 to 0.2 and re-run; (3) add weight decay through AdamW (0.1 is the usual transformer setting); (4) early-stop on the val minimum and keep that checkpoint, which is free and should be automatic anyway; (5) shrink the model — fewer layers or narrower d_model — if data really is fixed. What I do NOT do: train longer hoping it recovers, or judge the run by sample quality, since memorised Shakespeare reads *better* than generalised Shakespeare and will fool you. Worth stating explicitly: at this scale overfitting is a property of the dataset size, not a bug in the code — at pretraining scale, where the model sees each token roughly once, this failure mode largely disappears and dropout is usually set to 0.',
      isCaseBased: true,
    },
    {
      question: 'Why does the model die if you feed it more than block_size tokens, and how do modern models get around it?',
      answer:
        'Because positions are a learned lookup table, nn.Embedding(block_size, n_embd) — there is a row for slot 0 through 127 and nothing beyond, so token 128 has no position vector and the lookup throws an index error. That is why generate() crops with idx[:, -block_size:]. The fixes, in the order they were invented: sinusoidal encodings (the 2017 paper) are computed from a formula rather than learned, so they extend to any length in principle, though quality still degrades outside the trained range; ALiBi adds a distance-proportional penalty directly to the attention scores and extrapolates well; RoPE rotates Q and K by a position-dependent angle so that the dot product depends only on the RELATIVE offset, which is what almost every current open model uses, and it can be stretched further with interpolation tricks (NTK/YaRN) at inference. All of them are changes at the position layer only — the blocks are untouched. And note that none of them removes the O(n²) attention cost, which is a separate problem with separate fixes.',
      isCaseBased: false,
    },
    {
      question: 'Your estimate_loss() helper — why the @torch.no_grad() and why the eval()/train() bracket? What breaks without each?',
      answer:
        'no_grad stops autograd from recording the graph. Without it, every one of the 400 evaluation forward passes builds and holds a graph you never call backward on, so you pay full activation memory for nothing and run measurably slower — on a bigger model it is an OOM, not a slowdown. eval() switches modules with train/eval-dependent behaviour: here that is dropout (disabled at eval), and it would also freeze BatchNorm running statistics if this architecture used them. Evaluating with dropout on measures a randomly crippled model, so your val loss is both too high and noisy, and comparisons between hyperparameter settings become meaningless. The train() at the end is the sneaky one: the function looks pure but mutated the model, so forgetting it leaves dropout disabled for the entire rest of training — which looks like a suspiciously good training loss and a widening val gap. Two independent concerns: no_grad is about memory and speed, eval/train is about layer behaviour, and neither implies the other.',
      isCaseBased: false,
    },
    {
      question: 'Case: an interviewer says "everyone has cloned nanoGPT. Convince me you actually understand what you built." How do you answer?',
      answer:
        'Do not defend — demonstrate, with things only an author knows. Pick three mechanisms and one scar. Mechanism 1: the mask goes in before softmax, because −inf renormalizes the row over visible tokens and post-hoc zeroing leaves early rows summing to less than 1. Mechanism 2: the first loss must be ln(V) = 4.17 for a 65-character vocabulary, because an untrained model is a uniform guesser, which also tells you the loss is in nats and perplexity is e^loss. Mechanism 3: parameter accounting — 12d² per block, of which two-thirds is the FFN, and the attention matrix is activation memory rather than weights, which is why batch size hits a wall before parameter count does. Scar: the reshape to (B·T, C) for cross_entropy, the causal mask stored as a plain attribute so it stayed on the CPU after .to("cuda"), and sampling from all T positions instead of the last one. Then offer the honest boundary yourself: "it is 2.7M parameters on 1 MB of text — it produces Shakespeare-shaped gibberish, and the gap to GPT-2 is compute and tokenizer, not architecture." Volunteering the limitation is what makes the rest credible.',
      isCaseBased: true,
    },
    {
      question: 'What exactly would you change to take this from a 2.7M toy to something like GPT-2 small, and what stays identical?',
      answer:
        'Identical: the Head, MultiHeadAttention, FeedForward, Block and GPT classes as written. Changed, in rough order of impact. Tokenizer: characters → BPE with ~50k merges, so each token carries roughly four characters and the same block_size covers four times the text; the embedding and lm_head grow to 50257×768 each, which alone is ~77M parameters. Data: 1 MB → tens of GB, which means memory-mapped shards instead of one tensor. Size: 12 layers, 12 heads, d=768, context 1024 → 124M parameters. Optimization: linear warmup for a few hundred steps then cosine decay, weight decay 0.1 on the matrices but not on LayerNorms and biases, gradient clipping at norm 1.0, and dropout dropped to 0 because there is now far more data than capacity. Systems: bf16 mixed precision, torch.compile, gradient accumulation to reach an effective batch of ~0.5M tokens, and multi-GPU with DDP or FSDP. Efficiency extras that matter at inference: a KV-cache so each new token costs O(n) instead of a full re-forward, and flash-attention kernels. The honest summary is that none of this is an architecture change — beyond this point it is a compute-budget problem.',
      isCaseBased: false,
    },
    {
      question: 'Why sample with multinomial instead of taking argmax, given that argmax picks the "most likely" next token?',
      answer:
        'Because the most likely next token, chosen repeatedly, is not the most likely sequence — and greedy decoding on an autoregressive model is famously prone to degenerate loops: it finds a high-probability cycle ("the the the", or a repeated phrase) and never leaves, because each individual step really is locally optimal. Sampling injects the model\'s own uncertainty back into the trajectory, which both breaks loops and produces the diversity that makes the output read as language. The trade is that sampling can draw from the low-probability tail, which is where nonsense lives — hence the truncation knobs: top-k or top-p delete the tail while keeping the randomness among plausible candidates. Where you actually want argmax: tasks with one correct answer — code completion, extraction, classification-by-generation — and there greedy or very low temperature is the right default. Worth mentioning that beam search sits between the two and is standard for translation, but is a poor fit for open-ended generation because it systematically produces bland, high-probability text.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    {
      front: 'The entire supervision signal in a GPT',
      back: 'y = x shifted by one token. A (64, 128) batch is 64 × 128 = 8,192 supervised next-token predictions, not 64.',
    },
    {
      front: 'Mask before or after softmax — and why',
      back: 'BEFORE. masked_fill(−inf) → exp(−inf) = 0, so each row renormalizes over visible tokens and sums to 1. Zeroing after softmax leaves rows summing to < 1.',
    },
    {
      front: 'register_buffer vs nn.Parameter',
      back: 'Buffer: constant, no gradient, not in .parameters(), but DOES move with .to(device) and IS saved in state_dict. The causal mask is a buffer.',
    },
    {
      front: 'The cross_entropy reshape',
      back: 'logits (B, T, C) → view(B*T, C); targets (B, T) → view(B*T). F.cross_entropy needs examples first, classes second. B*T = 8,192 for 64×128.',
    },
    {
      front: 'Expected loss at step 0',
      back: 'ln(vocab_size). For 65 characters: ln 65 = 4.1744. Untrained = uniform guesser. Perplexity = e^loss, so loss 1.5 ≈ ppl 4.5.',
    },
    {
      front: 'Transformer block, pre-norm form',
      back: 'x = x + sa(ln1(x)); x = x + ffwd(ln2(x)). Normalize the copy, never the stream. Post-norm (2017) needs LR warmup; pre-norm (GPT-2) does not.',
    },
    {
      front: 'Parameters per block (d = d_model)',
      back: '12d²: attention 4d² (3d² QKV + d² proj) + FFN 8d² (4× expansion, two layers). The FFN is two-thirds of the block.',
    },
    {
      front: 'The generation loop, six steps',
      back: 'Crop to block_size → forward → take logits[:, −1, :] → ÷ temperature → optional top-k/top-p → softmax → multinomial → append → repeat.',
    },
    {
      front: 'Temperature vs top-k vs top-p',
      back: 'Temperature reshapes the whole distribution (÷ logits before softmax). top-k truncates to the k best, fixed. top-p keeps the smallest set reaching probability p — adapts to confidence.',
    },
    {
      front: 'The three from-scratch bugs everyone hits',
      back: '(1) forgetting the (B*T, C) reshape, (2) forgetting model.eval() so dropout corrupts val loss, (3) sampling from all T positions instead of only the last.',
    },
  ],
  mindmapMarkdown: `- CAPSTONE: Code a GPT from Scratch
  - The build
    - char-level decoder-only transformer
    - 6 layers, 6 heads, d=192, ctx=128
    - 2,715,713 parameters
    - output: Shakespeare-flavoured gibberish, honestly
  - 1. Data + tokenizer
    - chars -> stoi / itos, vocab 65
    - corpus as one int64 tensor
    - 90/10 split by position, not shuffled
    - get_batch: y = x shifted by ONE
    - 64 x 128 = 8,192 predictions per step
  - 2. Head (one attention head)
    - Q, K, V linear, bias=False, head_size 32
    - scale 1/sqrt(32) = 0.1768
    - tril via register_buffer (not a Parameter)
    - masked_fill(-inf) BEFORE softmax
    - out (B, T, 32)
  - 3. MultiHeadAttention
    - nn.ModuleList of 6 heads
    - concat -> (B, T, 192)
    - output projection 192 -> 192
  - 4. FeedForward
    - 192 -> 768 -> GELU -> 192
    - per-token, no mixing across T
    - 8d^2 = two-thirds of the block
  - 5. Block
    - pre-norm: x = x + sa(ln1(x))
    - x = x + ffwd(ln2(x))
    - residual stream never overwritten
    - post-norm needs warmup, pre-norm does not
  - 6. GPT module
    - token embedding (65, 192)
    - position embedding (128, 192), ADDED
    - block stack -> final LayerNorm -> lm_head
    - cross_entropy on view(B*T, C)
  - 7. Training loop
    - AdamW lr 3e-4
    - estimate_loss under @torch.no_grad()
    - model.eval() / model.train() bracket
    - zero_grad(set_to_none=True) before backward
    - step 0 loss must be ~ln(65) = 4.17
  - 8. Generation
    - crop to block_size
    - take logits[:, -1, :] ONLY
    - temperature -> reshape distribution
    - top-k -> fixed truncation
    - top-p -> adaptive nucleus
    - multinomial, not argmax
  - Scaling up
    - BPE instead of chars
    - bigger corpus, more layers/heads/width
    - warmup + cosine decay, grad clip 1.0
    - bf16 mixed precision, torch.compile
    - compute-budget problem, not a code problem
  - Interview payoff
    - why mask before softmax
    - why loss starts at ln(V)
    - what the residual stream carries
    - failure modes: reshape, eval mode, last-position sampling`,
}

export default m
