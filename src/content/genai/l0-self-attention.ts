import type { Module } from '../types'

const m: Module = {
  id: 'genai-l0-self-attention',
  subjectId: 'genai',
  level: 0,
  title: 'Self-Attention from zero',
  whyItMatters:
    '"Explain attention on a whiteboard" is THE GenAI screening question — it decides whether the rest of the interview happens. Attention is also 90% of what a transformer does; understand this module and GPT stops being magic. We build it from one sentence and a dot product.',
  estMinutes: 60,
  sections: [
    {
      type: 'intuition',
      title: 'The problem: "it" means nothing by itself',
      md: `Read: *"The cat sat on the mat because **it** was tired."*

- What does "it" refer to? You answered "the cat" without thinking.
- A model reads one token at a time. To *represent* "it", it must look back and borrow meaning from "cat".
- Old answer (RNNs): pass a summary note token-by-token down the line. Like the telephone game — by word 40, "cat" is mush.
- Worse: the chain is sequential. Word 40 can't be processed until 1–39 are done. GPUs hate queues.
- New answer: let **every token look at every other token directly, at the same time**. That's self-attention.`,
    },
    {
      type: 'hinglish',
      md: `Attention ka matlab: har word baaki sab words se poochta hai — *"tu mere liye kitna important hai?"* — aur importance ke hisaab se unka meaning **mix** kar leta hai. "it" ne poocha, "cat" ne sabse zor se haath uthaya, to "it" ka naya meaning ban gaya: mostly cat, thoda baaki sab.`,
    },
    {
      type: 'intuition',
      title: 'Q, K, V — the party trick',
      md: `Every token shows up to the party wearing three things (each made by multiplying its embedding with a learned matrix):

- **Query (Q)** — the question it's asking: *"I'm a pronoun, who's my noun?"*
- **Key (K)** — the name tag it wears: *"I'm an animal, a subject of a sentence."*
- **Value (V)** — the actual content it will hand over if picked: its meaning.
- Matching = **dot product Q·K**. Aligned vectors → big score. (Dot product = similarity — the one linear-algebra fact this course leans on.)
- One vector per token can't play both roles well — asking and being findable are different jobs. That's why Q and K are separate learned projections.`,
    },
    {
      type: 'hinglish',
      md: `Har token ek **sawaal (Q)** leke ghoomta hai. Har token ke paas ek **label (K)** aur **asli maal (V)** hai. Q·K ka match jitna strong, utna us token ka V mix hoga. Bas — yehi poora attention hai. Baaki sab (scaling, softmax, heads) is ek line ki packaging hai.`,
    },
    { type: 'visual', component: 'AttentionHeatmap', props: {} },
    {
      type: 'note',
      md: 'The weights in the demo above come from a hand-built toy head so the story is visible. Real heads learn their Q/K/V matrices from data — and end up discovering patterns exactly like these (coreference heads, previous-word heads) on their own.',
    },
    {
      type: 'intuition',
      title: 'The full recipe, one step per line',
      md: `For a sentence of n tokens, each with embedding size d:

1. Make three versions of every token: Q = XW_Q, K = XW_K, V = XW_V. (Three learned matrices — the only parameters here.)
2. Score every pair: S = QKᵀ. An n×n grid — "how relevant is token j to token i?"
3. Scale: divide S by √d. (Why: next block.)
4. Softmax each **row**: scores become positive weights summing to 1.
5. Mix: output_i = Σ_j weight_ij · V_j. Each token's new meaning = weighted average of everyone's Value.
6. Result: "it" walks out of the layer carrying mostly cat. Meaning has flowed **without any recurrence**.`,
    },
    {
      type: 'math',
      intro: 'The whole layer is one line — and the √d has a real reason, not superstition.',
      latex: [
        '\\text{Attention}(Q, K, V) = \\text{softmax}\\!\\left( \\frac{QK^\\top}{\\sqrt{d_k}} \\right) V',
        '\\text{Why } \\sqrt{d_k}: \\;\\; q \\cdot k = \\textstyle\\sum_{t=1}^{d_k} q_t k_t \\;\\Rightarrow\\; \\text{Var}(q \\cdot k) \\approx d_k',
        '\\text{Dots grow like } \\sqrt{d_k} \\Rightarrow \\text{softmax saturates (one weight} \\to 1\\text{, rest} \\to 0) \\Rightarrow \\text{gradients die. Dividing by } \\sqrt{d_k} \\text{ keeps variance} \\approx 1.',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Self-attention in 20 lines of NumPy — this is the whole thing',
      code: `import numpy as np

def softmax(s):
    e = np.exp(s - s.max(axis=-1, keepdims=True))
    return e / e.sum(axis=-1, keepdims=True)

def self_attention(X, Wq, Wk, Wv):
    # X: (n, d) — one row per token
    Q = X @ Wq               # what each token asks
    K = X @ Wk               # what each token advertises
    V = X @ Wv               # what each token offers
    d_k = Q.shape[-1]

    S = Q @ K.T              # (n, n) all-pairs scores
    S = S / np.sqrt(d_k)     # keep softmax un-saturated
    W = softmax(S)           # each row: weights, sum to 1
    return W @ V             # mix values -> new token meanings

n, d = 10, 64
X = np.random.randn(n, d)
Wq, Wk, Wv = (np.random.randn(d, d) * 0.1 for _ in range(3))
out = self_attention(X, Wq, Wk, Wv)   # (10, 64): same shape, richer meaning`,
      annotations: {
        4: 'Subtracting the row max before exp is the standard numerical-stability trick — exp(1000) overflows.',
        14: 'THE expensive line: n×n scores. 10k tokens → 100M entries. This is the O(n²) everyone mitigates.',
        16: 'Row-wise softmax: each token distributes exactly 1.0 of "attention budget" over all tokens.',
        17: 'Output shape == input shape. That is what lets transformers stack this layer dozens of times.',
      },
    },
    {
      type: 'intuition',
      title: 'What attention buys — and what it costs',
      md: `- **Buys:** any-to-any connection in ONE step. "it" reaches "cat" whether it's 5 or 5000 tokens back. No telephone game.
- **Buys:** all n² scores are one matrix multiply — GPUs eat this in parallel. Training went from months to days.
- **Costs:** n² memory and compute. Double the context window → 4× the attention bill. (This is why long context is a research industry: FlashAttention, sliding windows, GQA.)
- **Costs:** attention alone can't see ORDER. "cat sat on mat" and "mat sat on cat" produce identical attention math. Position must be injected separately (positional encodings — next modules).
- One honest sentence for interviews: *"Attention trades O(n) sequential depth for O(n²) parallel width — a trade GPUs love and memory pays for."*`,
    },
    {
      type: 'note',
      md: 'Teaser for L1: in GPT, each token may only attend to tokens **before** it (causal mask — you saw the triangle in the demo). And instead of one attention, run several in parallel with smaller heads ("multi-head") so different heads learn different relationships: one does coreference, one tracks syntax, one watches the previous word.',
    },
  ],
  quiz: [
    {
      question: 'In the QKV story, which vector decides HOW MUCH of a token gets mixed in — and which decides WHAT gets mixed?',
      options: [
        {
          text: 'Q·K match decides how much; V is what gets mixed',
          explanation: 'Correct. Scores (Q·K) → weights; the weighted sum is over Values. Match decides amount, Value is the payload.',
        },
        { text: 'V decides how much; K is mixed', explanation: 'Backwards — V is never scored, it is the content being delivered.' },
        { text: 'Q is mixed according to V', explanation: 'Q only asks. It is not part of the output sum at all.' },
      ],
      correct: 0,
    },
    {
      question: 'Why divide the scores by √d_k before softmax?',
      options: [
        { text: 'To make computation faster', explanation: 'A division does not speed anything up — this is about gradient health.' },
        {
          text: 'Dot-product variance grows with d_k; unscaled scores saturate the softmax and kill gradients',
          explanation: 'Correct. Variance of q·k ≈ d_k → huge logits → softmax outputs ≈ one-hot → near-zero gradients. √d_k normalizes variance to ~1.',
        },
        { text: 'To keep weights below 1', explanation: 'Softmax already guarantees weights in (0,1) summing to 1, at any scale.' },
      ],
      correct: 1,
    },
    {
      question: 'Attention weights in one row sum to…',
      options: [
        { text: '1 — softmax normalizes each row', explanation: 'Correct: each token spends exactly 1.0 of attention budget across all tokens.' },
        { text: 'The number of tokens n', explanation: 'That would be an un-normalized sum — softmax divides it out.' },
        { text: 'Anything — depends on the sentence', explanation: 'The normalization is built in; it never depends on content.' },
      ],
      correct: 0,
    },
    {
      question: 'Compute/memory cost of self-attention over n tokens is…',
      options: [
        { text: 'O(n) — one pass', explanation: 'Every token scores EVERY token — that is all pairs, not one pass.' },
        { text: 'O(n²) — all pairs of tokens are scored', explanation: 'Correct. The n×n score matrix is the cost. 2× context = 4× attention bill.' },
        { text: 'O(log n)', explanation: 'Nothing halves here — there is no divide-and-conquer in attention.' },
      ],
      correct: 1,
    },
    {
      question: 'Shuffle the input tokens randomly. What happens to plain self-attention outputs (no positional encoding)?',
      options: [
        {
          text: 'Same set of outputs, shuffled the same way — attention is order-blind',
          explanation: 'Correct. Scores depend only on vector content, not position. This is exactly why positional information must be added.',
        },
        { text: 'The outputs change completely', explanation: 'They do not — no part of the QKV math reads an index.' },
        { text: 'Softmax breaks', explanation: 'Softmax is per-row and content-based; it neither knows nor cares about order.' },
      ],
      correct: 0,
    },
    {
      question: 'Why do Q and K come from different learned matrices instead of reusing one projection?',
      options: [
        {
          text: 'Asking and being findable are different roles — separate projections let a token seek one thing and advertise another',
          explanation: 'Correct. "it" seeks nouns but advertises "pronoun". One shared space would force score(i,j) = score(j,i) style symmetry and collapse expressiveness.',
        },
        { text: 'It is a historical accident', explanation: 'It is a deliberate, load-bearing design choice.' },
        { text: 'One matrix would be too slow', explanation: 'One matrix would be FASTER — it is expressiveness that is lost, not speed.' },
      ],
      correct: 0,
    },
    {
      question: 'In GPT-style causal attention, token 5 can attend to…',
      options: [
        { text: 'Tokens 1–5 only — the past and itself', explanation: 'Correct: future positions are masked to −∞ before softmax, so their weights become 0.' },
        { text: 'All tokens', explanation: 'That is BERT-style bidirectional attention — GPT must not see the future it is predicting.' },
        { text: 'Only token 4', explanation: 'That would be a fixed previous-word connection — attention is more general.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Whiteboard question: explain self-attention to me in two minutes, no jargon first, then the formula.',
      answer:
        'Story first: every token asks a question (Q), wears a name tag (K), and carries content (V). Each token compares its question against everyone\'s name tag (dot products) — good matches get high scores. Softmax turns a row of scores into weights summing to 1, and the token\'s new representation is the weighted mix of everyone\'s content. Then the formula: Attention(Q,K,V) = softmax(QKᵀ/√d_k)·V, where Q=XW_Q etc. Close with why it won: any-to-any information flow in one parallel step, versus RNNs\' sequential telephone game. Saying the STORY before the formula is what scores points.',
      isCaseBased: false,
    },
    {
      question: 'Case: your product must handle 100k-token documents and attention is the bottleneck. What are your options, and what does each give up?',
      answer:
        'Name the bill first: O(n²) — 100k tokens = 10¹⁰ score entries. Options: (1) FlashAttention — exact same math, IO-aware kernel; huge memory/speed win, gives up nothing, do it first. (2) Sliding-window/local attention — each token sees only w neighbors; O(n·w); gives up direct long-range links (mitigate: a few global tokens). (3) Sparse/linear-attention approximations — subquadratic but approximate; quality risk on retrieval-heavy tasks. (4) Chunk + retrieval (RAG) — don\'t attend over everything; gives up whole-document reasoning. (5) KV-cache + GQA for inference memory. Strong answers rank them: exact-kernel wins first, approximations only when forced.',
      isCaseBased: true,
    },
    {
      question: 'Why did attention replace recurrence? Give the two independent reasons and say which one actually killed RNNs.',
      answer:
        'Reason 1 — gradient path length: in an RNN, "cat"→"it" information crosses 40 steps; each step multiplies fragile signal (vanishing gradients). Attention makes it ONE step regardless of distance. Reason 2 — parallelism: RNN steps are sequential; attention is a couple of matmuls over all tokens at once, saturating GPUs. The killer was parallelism: vanishing gradients had partial fixes (LSTM gates), but nothing fixes "cannot parallelize training across time steps" — hardware economics decided it.',
      isCaseBased: false,
    },
    {
      question: 'Case: you train a small transformer and observe every attention row is nearly uniform (all weights ≈ 1/n) even after training. List plausible causes.',
      answer:
        'Uniform rows = scores nearly equal → nothing is being distinguished. Causes: (1) missing √d_k scaling can backfire the other way (saturation), but UNIFORM usually means scores too SMALL — check for over-aggressive normalization or tiny init making Q·K ≈ 0; (2) learning rate too low / too few steps — heads haven\'t specialized yet; (3) embeddings collapsed (all tokens similar vectors) — check embedding variance; (4) the task genuinely doesn\'t need attention (loss already minimal via FFN/positional shortcuts). Diagnosis order: plot score magnitudes pre-softmax, then embedding similarity matrix, then train longer with higher LR.',
      isCaseBased: true,
    },
    {
      question: 'How many parameters does one self-attention layer have, for embedding size d? (Single head, with output projection.)',
      answer:
        'Four learned matrices: W_Q, W_K, W_V (each d×d) + output projection W_O (d×d) → **4d²** (ignoring biases; add 4d with them). For d=768 (GPT-2 small): 4·768² ≈ 2.36M per layer. Worth adding: the n×n score matrix is NOT parameters — it is activation memory, recomputed per input. Interviewers use this to check you separate weights from activations.',
      isCaseBased: false,
    },
    {
      question: 'What exactly would break if we removed softmax and used raw scores as mixing weights?',
      answer:
        'Three breaks: (1) weights could be negative or huge — outputs blow up and "importance" loses meaning; (2) no competition: softmax makes tokens compete for a fixed budget of 1.0, which is what creates selective, interpretable focus; (3) scale-instability across rows — some tokens would mix 0.1 of the sentence, others 50×. Softmax gives bounded, normalized, differentiable competition. (Mention: replacing it is an active research area — but linear-attention variants must reconstruct these properties.)',
      isCaseBased: false,
    },
    {
      question: 'K and V come from the same token — why not just use one vector for both jobs?',
      answer:
        'K answers "should you pick me?", V answers "what do you get if you do?" — advertisement vs contents. Forcing one vector makes a token findable only by what it literally contains; with separate projections, a token can be found via syntax ("I\'m a subject noun") while delivering semantics ("furry animal, agent of sitting"). Empirically, tying K=V costs quality; conceptually, it couples retrieval with payload. Same reason a database has indexes separate from row data.',
      isCaseBased: false,
    },
    {
      question: 'Case: an interviewer asks — "attention output for token i is a weighted average of Values. Averages blur. Why doesn\'t the whole model blur into mush across 24 layers?"',
      answer:
        'Because attention layers do not overwrite — the transformer wraps each one in a **residual stream**: output = x + Attention(LN(x)). The original meaning always survives; attention only ADDS a correction. Plus: softmax weights are usually peaked (near-selective picks, not flat averages), heads specialize so different subspaces carry different relations, and the FFN re-sharpens per token. Without residual connections, deep stacking would indeed wash meaning out — this question is really testing whether you know why residuals exist.',
      isCaseBased: true,
    },
    {
      question: 'Attention is O(n²) — so why do we happily run n=128k contexts today? Reconcile.',
      answer:
        'Constant factors and kernels moved, not the asymptotics: FlashAttention computes exact attention in tiles that live in fast SRAM (memory-bound → compute-bound win), GQA shrinks KV heads to cut KV-cache memory, and inference reuses cached K/V so each new token costs O(n), not O(n²) from scratch. Batch economics and H100 memory did the rest. The n² is still there — you pay it once in prefill — which is why prompt-heavy workloads price by input tokens.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Q, K, V in one line each', back: 'Q: the question a token asks. K: the label it advertises. V: the content it hands over when matched.' },
    { front: 'The attention formula', back: 'softmax(QKᵀ / √d_k) · V — score all pairs, scale, row-softmax, mix values.' },
    { front: 'Why √d_k', back: 'Var(q·k) ≈ d_k → large logits saturate softmax → dead gradients. Scaling keeps logits ~unit variance.' },
    { front: 'Attention complexity', back: 'O(n²) in sequence length — the n×n score matrix. 2× context = 4× cost.' },
    { front: 'Rows of attention weights sum to…', back: '1 (row-wise softmax): each token distributes a fixed attention budget.' },
    { front: 'Why RNNs lost (2 reasons, 1 killer)', back: 'Long-range signal decays over steps + no parallelism across time. Parallelism (GPU economics) was the killer.' },
    { front: 'Attention and word order', back: 'Attention is order-BLIND (pure content matching). Positional encodings inject order separately.' },
    { front: 'Causal mask', back: 'GPT-style: future positions set to −∞ before softmax → weight 0. A token sees only itself + the past.' },
    { front: 'Params of one attention layer (single head)', back: 'W_Q, W_K, W_V, W_O each d×d → 4d². The n×n scores are activations, not parameters.' },
    { front: 'Why residuals stop attention from blurring', back: 'output = x + Attn(LN(x)) — attention adds a correction; the original token meaning always survives the stack.' },
  ],
  mindmapMarkdown: `- Self-Attention
  - Problem
    - "it" needs "cat"
    - RNN: telephone game + sequential
  - QKV
    - Q: question asked
    - K: label advertised
    - V: content delivered
    - Q·K dot = similarity score
  - Recipe
    - Q=XW_Q, K=XW_K, V=XW_V
    - S = QKᵀ (n×n)
    - ÷ √d_k (softmax saturation)
    - row softmax → weights sum 1
    - output = weights · V
  - Costs & limits
    - O(n²) all pairs
    - order-blind → positional encodings
  - Wins
    - any-to-any in 1 step
    - parallel matmuls → GPUs
  - Teasers (L1)
    - causal mask: no future
    - multi-head: many relations
    - residual stream: no blur`,
}

export default m
