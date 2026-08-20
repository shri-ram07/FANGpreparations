import type { Module } from '../types'

const m: Module = {
  id: 'genai-l2-inference-optimization',
  subjectId: 'genai',
  level: 2,
  title: 'Inference: KV-Cache, Quantization & Serving',
  whyItMatters:
    'Training a model is a one-time bill; serving it is the bill that arrives every month. "Do the KV-cache math" is the single most-asked GenAI systems question, because it separates people who have read about transformers from people who have watched one fall over at batch size 33. This module gives you the arithmetic, the four fixes every serving stack uses (GQA, paged attention, continuous batching, quantization), and the honest numbers to defend each one.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'Why generation is slow — and it is not the reason you think',
      md: `Training a 7B model touches 10²³ FLOPs. Generating 100 tokens from it touches almost nothing. Yet generation feels slow. Two reasons, and only one is obvious.

- **It is sequential by construction.** Token n+1 needs token n as input. You cannot generate word 50 before word 49 exists. No amount of GPU parallelism removes a dependency chain.
- **Each step is memory-bandwidth bound, not compute bound.** To produce ONE token you must read *every weight in the model* out of HBM into the compute units. 13 GB of weights, streamed, for one word.
- The arithmetic is embarrassing: you read ~13 GB and do ~14 GFLOPs of useful work. That is about **1 FLOP per byte read**. An A100 is happy at ~150 FLOPs per byte — you are running at well under 1% of its compute.
- So the GPU sits idle waiting for memory. The tensor cores are a Ferrari in a traffic jam.
- **The consequence that runs everything else in this module:** if you are bandwidth bound, the way to go faster is to *move fewer bytes* — smaller weights (quantization), smaller cache (GQA), or more useful tokens per byte moved (batching, speculative decoding).`,
    },
    {
      type: 'math',
      intro:
        'The single-sequence speed ceiling, from bandwidth alone. No model architecture in this formula — that is the point.',
      latex: [
        '\\text{tokens/sec} \\;\\lesssim\\; \\frac{\\text{HBM bandwidth}}{\\text{bytes read per forward pass}}',
        '\\text{7B in fp16 on an A100 80GB: } \\quad \\frac{2.0\\;\\text{TB/s}}{13\\;\\text{GB}} \\;\\approx\\; 154\\;\\text{tok/s for ONE sequence}',
        '\\text{Same model in int4: } \\quad \\frac{2.0\\;\\text{TB/s}}{3.3\\;\\text{GB}} \\;\\approx\\; 600\\;\\text{tok/s} \\quad (\\text{4x fewer bytes} \\Rightarrow \\text{4x faster decode})',
        '\\text{Arithmetic intensity of decode} \\;\\approx\\; 2 \\;\\text{FLOP/byte} \\;\\ll\\; \\text{hardware ratio} \\;\\approx\\; 150 \\;\\text{FLOP/byte}',
      ],
    },
    {
      type: 'intuition',
      title: 'Two phases, two completely different machines',
      md: `Every request runs through the same model twice over, in two modes that behave nothing alike. Say these names in interviews.

- **Prefill** — the entire prompt goes through in ONE parallel forward pass. All n prompt tokens at once, big matmuls, tensor cores saturated. This phase is **compute bound**.
- Prefill decides **time-to-first-token (TTFT)** — how long the user stares at a blank screen. Long prompts make TTFT worse *quadratically* (attention is O(n²) here).
- **Decode** — one token at a time, forever. Each step is a tiny matrix-vector product against the whole weight set. This phase is **memory-bandwidth bound**.
- Decode decides **inter-token latency** — how fast text appears once it starts, i.e. tokens per second.
- They want opposite things. Prefill wants small batches (it is already saturating compute). Decode wants huge batches (it is wasting bandwidth on one sequence). Serving systems that split them onto different GPUs ("disaggregated prefill") exist for exactly this reason.
- Practical tell: a chatbot with a 30k-token system prompt has a TTFT problem. A code assistant streaming 800 tokens has a decode problem. Different fixes.`,
    },
    {
      type: 'intuition',
      title: 'The KV-cache: stop redoing the same work',
      md: `Attention at step n needs the Key and Value vectors of every token so far. Those vectors depend only on the token and the weights — **they never change once computed**.

- Without a cache: to generate token n, you re-run the whole prompt plus everything generated so far through every layer. Cost of one step is O(n). Cost of a full sequence is **O(n²)**.
- With a cache: keep every past token's K and V in GPU memory. Each new step computes K and V for **one** token, appends them, and attends over the stored ones. Cost of one step is O(n), cost of the sequence is O(n²) in attention but the *weight matmuls* drop from O(n²) to O(n).
- Concretely at 1000 generated tokens, the no-cache version does roughly 500× the projection work. Nobody serves without a KV-cache. It is not an optimization, it is the baseline.
- The catch, and the whole rest of this module: **you traded compute for memory.** The cache is now the biggest tensor in your GPU.
- Note what is NOT cached: Q. Each step's query is fresh, used once, and thrown away. Only K and V are reused, which is exactly why the "2" in the memory formula is a 2 and not a 3.`,
    },
    {
      type: 'note',
      md: 'The stepper below is an **LRU cache**, not a KV-cache — be honest about that when it comes up. A KV-cache never evicts *within* a sequence (every past token is still needed by attention), so there is no LRU policy inside one request. What transfers exactly is the shape of the tradeoff: a cache turns repeated work into memory pressure, capacity decides how much work you skip, and when the working set exceeds capacity you thrash. Watch capacity 3 versus 4 on the same request stream. In a real LLM server the same cliff appears at the *sequence* level — vLLM preempts and later recomputes whole requests when the cache fills, which is a miss costing thousands of tokens.',
    },
    { type: 'visual', component: 'CacheSimulator', props: { capacity: 3 } },
    {
      type: 'math',
      intro:
        'The formula to be able to write from memory. Every serving capacity question is this line plus division.',
      latex: [
        '\\text{KV bytes} \\;=\\; 2 \\;\\times\\; L \\;\\times\\; H_{kv} \\;\\times\\; d_{head} \\;\\times\\; n \\;\\times\\; B \\;\\times\\; \\text{dtype bytes}',
        '\\text{where } 2 = (K \\text{ and } V),\\; L = \\text{layers},\\; H_{kv} = \\text{KV heads},\\; n = \\text{seq len},\\; B = \\text{batch}',
        '\\text{Llama-7B-style: } \\; 2 \\times 32 \\times 32 \\times 128 \\times 2\\,\\text{B} \\;=\\; 524{,}288 \\;=\\; \\mathbf{0.5\\;MB\\;per\\;token}',
        'n = 4096 \\;\\Rightarrow\\; 2\\;\\text{GB per sequence} \\qquad B = 32 \\;\\Rightarrow\\; 64\\;\\text{GB} \\;>\\; 13\\;\\text{GB of weights}',
      ],
    },
    {
      type: 'note',
      md: 'Read that last line again, because it is the interview point. The **weights are a fixed cost you pay once**; the **cache is a per-user cost that grows with every token they type and every token you generate**. On an 80 GB card, weights take 13 GB and the remaining 67 GB is the entire business — it is what decides how many people can talk to your model at the same time. This is why "how much memory does the model need" is a beginner question and "how much memory per concurrent request" is the real one.',
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'The KV-cache, token by token',
        notice: 'Left = what this step computes. Right = what is permanently parked in HBM. The right column only ever grows.',
        leftLabel: 'This step',
        rightLabel: 'KV-cache in HBM',
        frames: [
          {
            note: 'PREFILL. The whole 4-token prompt goes through the model in ONE parallel pass — big matmuls, compute bound. This is the phase your time-to-first-token measures. Every layer writes one K and one V vector per token.',
            stack: [
              { name: 'phase', value: 'PREFILL (1 pass)' },
              { name: 'tokens in', value: '4 (parallel)' },
              { name: 'cache size', value: '4 x 0.5 MB = 2 MB' },
            ],
            heap: [
              { id: 'k1', value: 'K, V', label: 'tok 1  "The"' },
              { id: 'k2', value: 'K, V', label: 'tok 2  "cat"' },
              { id: 'k3', value: 'K, V', label: 'tok 3  "sat"' },
              { id: 'k4', value: 'K, V', label: 'tok 4  "on"' },
            ],
          },
          {
            note: 'DECODE step 1. One token in, one token out. Its query attends over the 4 stored pairs plus its own — the prompt is never re-computed. This step reads all 13 GB of weights to produce one word: bandwidth bound.',
            stack: [
              { name: 'phase', value: 'DECODE step 1' },
              { name: 'token out', value: '"the"' },
              { name: 'just written', to: 'k5' },
              { name: 'cache size', value: '2.5 MB' },
            ],
            heap: [
              { id: 'k1', value: 'K, V', label: 'tok 1  "The"' },
              { id: 'k2', value: 'K, V', label: 'tok 2  "cat"' },
              { id: 'k3', value: 'K, V', label: 'tok 3  "sat"' },
              { id: 'k4', value: 'K, V', label: 'tok 4  "on"' },
              { id: 'k5', value: 'K, V', label: 'tok 5  "the"  (new)' },
            ],
          },
          {
            note: 'DECODE step 2. Identical work, one more row. Notice the pattern: compute is CONSTANT per step, memory grows by exactly 0.5 MB per step. Nothing is ever evicted — attention at step 500 still needs token 1.',
            stack: [
              { name: 'phase', value: 'DECODE step 2' },
              { name: 'token out', value: '"mat"' },
              { name: 'just written', to: 'k6' },
              { name: 'cache size', value: '3.0 MB' },
            ],
            heap: [
              { id: 'k1', value: 'K, V', label: 'tok 1-4  (prompt)' },
              { id: 'k5', value: 'K, V', label: 'tok 5  "the"' },
              { id: 'k6', value: 'K, V', label: 'tok 6  "mat"  (new)' },
            ],
          },
          {
            note: 'DECODE step 200. 204 tokens cached = 102 MB for ONE user. Still fine. But the growth is linear and unbounded until the sequence ends, and you are serving more than one person.',
            stack: [
              { name: 'phase', value: 'DECODE step 200' },
              { name: 'tokens cached', value: '204' },
              { name: 'cache size', value: '204 x 0.5 = 102 MB' },
            ],
            heap: [
              { id: 'k1', value: 'K, V', label: 'tok 1-4  (prompt)' },
              { id: 'kd', value: '. . .', label: 'tok 5-203  (generated)' },
              { id: 'k204', value: 'K, V', label: 'tok 204  (new)' },
            ],
          },
          {
            note: 'Fill the 4096-token context window: 2 GB for one sequence. That is 15% of the model weights, spent on a single conversation. Now multiply by your users.',
            stack: [
              { name: 'phase', value: 'context full' },
              { name: 'tokens cached', value: '4096' },
              { name: 'cache size', value: '2.0 GB', danger: true },
            ],
            heap: [
              { id: 'full', value: '4096 x 0.5 MB', label: 'one sequence = 2.0 GB', danger: true },
              { id: 'w', value: '13 GB', label: 'model weights (fixed)' },
            ],
          },
          {
            note: 'Batch of 32 users, each at 4096 tokens: 64 GB of cache against 13 GB of weights. It does not fit on an 80 GB card. THIS is the number that caps your concurrency — not the model size.',
            stack: [
              { name: 'batch', value: '32 sequences' },
              { name: 'weights', value: '13 GB' },
              { name: 'cache', value: '64 GB', danger: true },
              { name: 'total', value: '77 GB on an 80 GB card', danger: true },
            ],
            heap: [
              { id: 'cache32', value: '32 x 2.0 GB = 64 GB', label: 'KV-cache', danger: true },
              { id: 'w', value: '13 GB', label: 'model weights (fixed)' },
              { id: 'act', value: 'activations, fragmentation, CUDA ctx', label: 'the rest — and there is none left', danger: true },
            ],
          },
          {
            note: 'The fix: GQA with 8 KV heads instead of 32. Query heads stay at 32, so quality barely moves; the cache is 4x smaller. Same 32 users now cost 16 GB and you have room to grow the batch — which is also what makes decode bandwidth-efficient.',
            stack: [
              { name: 'KV heads', value: '8 (was 32)' },
              { name: 'per token', value: '0.125 MB (was 0.5)' },
              { name: 'batch 32 cache', value: '16 GB' },
              { name: 'headroom', value: '80 - 13 - 16 = 51 GB' },
            ],
            heap: [
              { id: 'cache32g', value: '32 x 0.5 GB = 16 GB', label: 'KV-cache with GQA-8' },
              { id: 'w', value: '13 GB', label: 'model weights (fixed)' },
              { id: 'free', value: '51 GB free', label: 'room for ~100 more sequences' },
            ],
          },
        ],
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The KV-cache calculator — the arithmetic you will be asked to do on a whiteboard',
      code: `GB = 1024 ** 3          # binary GB (GiB) — the unit nvidia-smi reports
MB = 1024 ** 2

def kv_bytes(layers, kv_heads, head_dim, seq, batch, dtype_bytes):
    # the 2 = one K vector AND one V vector, per token, per layer
    return 2 * layers * kv_heads * head_dim * seq * batch * dtype_bytes

# Llama-7B-style: 32 layers, 32 heads, head_dim 128, fp16 (2 bytes/number)
L, H, D, DT = 32, 32, 128, 2

per_token = kv_bytes(L, H, D, seq=1, batch=1, dtype_bytes=DT)
print(f"per token, per sequence : {per_token/MB:.3f} MB")
print(f"4096-token context, b=1 : {kv_bytes(L,H,D,4096,1,DT)/GB:.2f} GB")
print(f"4096-token context, b=32: {kv_bytes(L,H,D,4096,32,DT)/GB:.2f} GB")

# Weights are FIXED; the cache is what grows with traffic.
weights = 7e9 * DT
print(f"\\nweights (7B, fp16)      : {weights/GB:.1f} GB")
free = 80 * GB - weights                      # one 80 GB A100/H100
print(f"free on an 80 GB card   : {free/GB:.1f} GB")
print(f"-> max 4096-tok seqs    : {int(free // kv_bytes(L,H,D,4096,1,DT))} concurrent")

# GQA / MQA: share K and V across query heads. Query heads stay 32.
print()
for name, kvh in [("MHA  (32 kv heads)", 32), ("GQA-8 (8 kv heads)", 8), ("MQA  (1 kv head )", 1)]:
    b = kv_bytes(L, kvh, D, 4096, 1, DT)
    print(f"{name}: {b/GB:6.3f} GB   {32//kvh:2d}x smaller   "
          f"{int(free // b):4d} concurrent 4096-tok seqs")

# Quantizing the CACHE itself (int8) is orthogonal to quantizing the weights.
print(f"\\nGQA-8 cache in int8     : {kv_bytes(L,8,D,4096,1,1)/GB:.3f} GB")

# ---------- real output ----------
# per token, per sequence : 0.500 MB
# 4096-token context, b=1 : 2.00 GB
# 4096-token context, b=32: 64.00 GB
#
# weights (7B, fp16)      : 13.0 GB
# free on an 80 GB card   : 67.0 GB
# -> max 4096-tok seqs    : 33 concurrent
#
# MHA  (32 kv heads):  2.000 GB    1x smaller     33 concurrent 4096-tok seqs
# GQA-8 (8 kv heads):  0.500 GB    4x smaller    133 concurrent 4096-tok seqs
# MQA  (1 kv head ):  0.062 GB   32x smaller   1071 concurrent 4096-tok seqs
#
# GQA-8 cache in int8     : 0.250 GB`,
      annotations: {
        1: 'GB here means GiB (1024³), which is what nvidia-smi and every OOM message use. That is why 7B x 2 bytes = 14,000,000,000 bytes prints as 13.0 GB, not 14. Say which unit you mean in an interview and nobody can call you wrong.',
        6: 'The whole formula, one line. Memorize the shape: 2 (K and V) x layers x KV heads x head_dim x tokens x batch x bytes-per-number. Note what is NOT in it — the FFN, the vocab, the query heads. Only K and V are stored.',
        9: 'head_dim x heads = 32 x 128 = 4096 = the model dimension. If you are only told d_model, use it directly: heads x head_dim always reconstructs it.',
        12: '0.5 MB per token is the number worth memorizing for 7B-class models. A 2000-token conversation is 1 GB. A user pasting a 100k-token document does not fit at all.',
        14: 'Linear in batch, and this is where it bites: 64 GB of cache for 32 users on a card that has 67 GB free after weights. One more user and you OOM.',
        21: '33 concurrent sequences. That is your entire concurrency budget on a $15,000 GPU — before any of the fixes below. Interviewers love this number because it is so much smaller than people guess.',
        25: 'GQA-8 keeps 32 QUERY heads but only 8 KV heads: four queries share one key/value pair. MQA is the extreme (1 KV head) and does cost measurable quality, which is why 8 is the industry compromise.',
        31: 'Cache quantization is a separate lever from weight quantization — int8 KV halves the cache again with modest quality cost, and fp8 KV is now common. Stack it on top of GQA, do not choose between them.',
      },
    },
    {
      type: 'intuition',
      title: 'GQA and MQA: the cheapest 4x you will ever get',
      md: `Multi-head attention gives every query head its own K and V heads. Grouped-query attention notices that the K/V heads are the expensive part and shares them.

- **MHA**: 32 query heads, 32 KV heads. Full cache.
- **MQA** (multi-query): 32 query heads, **1** KV head. 32× smaller cache. Measurable quality drop and training instability — the reason it did not win outright.
- **GQA** (grouped-query): 32 query heads, **8** KV heads, four queries per group. 4× smaller cache, quality within noise of MHA. This is what Llama-2-70B, Llama-3, Mistral and essentially every modern open model ships.
- The intuition for why it barely hurts: many attention heads learn *similar* retrieval patterns anyway. Sharing what a group of heads looks *for* while keeping what each head *asks* preserves most of the diversity.
- It also speeds up decode directly: a smaller cache means fewer bytes read per step, and decode is bandwidth bound.
- Interview line: *"GQA is the only inference optimization that changes the architecture — you must pretrain (or uptrain) with it, you cannot bolt it on at serving time."*`,
    },
    {
      type: 'intuition',
      title: 'PagedAttention and continuous batching: the two vLLM ideas',
      md: `Naive serving reserves the *maximum* context per request up front. If your window is 4096 and the user writes 100 tokens, you just wasted 97% of a 2 GB allocation.

- **PagedAttention** borrows OS virtual memory: cut the cache into fixed-size **blocks** (say 16 tokens), keep a per-sequence block table, allocate a block only when it fills. Internal waste drops to under one block per sequence.
- Free bonus: **prefix sharing**. Two requests with the same 2000-token system prompt point at the *same physical blocks*. One copy, refcounted. For agent workloads with huge shared prompts this is enormous.
- Second bonus: copy-on-write for parallel samples (n=4 completions from one prompt share the prompt's blocks).
- **Continuous batching** (a.k.a. in-flight batching) fixes the other waste. Static batching runs a batch until the *slowest* sequence finishes; a 20-token answer sits idle waiting for a 900-token one. Continuous batching evicts a finished sequence from the batch at the very next step and admits a waiting request in its slot.
- This is the single biggest throughput win in real serving — reported gains of 2–4× on mixed-length traffic, and larger the more variable your output lengths are. It costs nothing in quality.
- Together: paging gives you the memory to hold a big batch, continuous batching keeps that batch full. That is most of what vLLM, TGI and TensorRT-LLM are.`,
    },
    {
      type: 'intuition',
      title: 'Quantization: fewer bits per number',
      md: `A weight does not need 32 bits. Store it in fewer and you move fewer bytes — and decode is bandwidth bound, so fewer bytes is *literally* faster, not just smaller.

- The ladder for a 7B model: **fp32** 28 GB → **fp16/bf16** 14 GB → **int8** 7 GB → **int4** 3.5 GB. (bf16 over fp16 for training-range safety; same size.)
- What you buy: memory *and* bandwidth, therefore speed. What you pay: quality, gradually. fp16 is free. int8 is nearly free. int4 is a small, usually acceptable hit. int2 falls apart.
- The rule of thumb to quote: **4-bit is usually an acceptable quality hit for a 4× memory win** — it is what turns "needs an A100" into "runs on a laptop".
- **PTQ vs QAT** in one line: post-training quantization compresses a finished model using a small calibration set (minutes, no gradients); quantization-aware training simulates the rounding *during* training so the model learns to tolerate it (better at very low bits, costs a training run).
- The formats you should be able to name: **GPTQ** (layer-wise second-order PTQ, GPU), **AWQ** (protects the ~1% of salient weight channels, usually a touch better than GPTQ), **GGUF/llama.cpp** (CPU and Apple silicon, the local-inference standard), **bitsandbytes** (drop-in 8-bit/4-bit in Hugging Face, the easy path and the one used for QLoRA).
- Two honest catches. (1) Activations are harder than weights — outlier channels blow up the scale, which is what LLM.int8() and SmoothQuant address. (2) A 4-bit model can be *slower* than fp16 at large batch sizes, because dequantization is compute and large batches are already compute bound.`,
    },
    {
      type: 'math',
      intro: 'Quantization is an affine map from floats to integers, chosen per group of weights. That is all it is.',
      latex: [
        'q \\;=\\; \\mathrm{round}\\!\\left( \\frac{w}{s} \\right) + z, \\qquad \\hat{w} \\;=\\; s \\,(q - z)',
        's \\;=\\; \\frac{\\max(w) - \\min(w)}{2^{b} - 1} \\quad (b \\text{ bits}), \\qquad z = \\text{zero-point}',
        '\\text{Per-tensor } s \\text{ is cheap and bad; per-channel or per-group (64--128 weights) is what makes 4-bit work.}',
        '\\text{7B model: } 7\\!\\times\\!10^{9} \\times \\tfrac{4\\,\\text{bits}}{8} \\;=\\; 3.5\\;\\text{GB} \\quad \\text{(+ the scales, a few percent)}',
      ],
    },
    {
      type: 'intuition',
      title: 'Speculative decoding: get several tokens per big-model step',
      md: `The bandwidth argument again: reading 13 GB of weights to produce one token is wasteful, and reading them to *check five* tokens costs the same. So guess first.

- A small **draft model** (say 1B, or even an n-gram table) generates k candidate tokens cheaply — it is fast because it is small.
- The big **target model** runs ONE forward pass over the prompt plus all k drafted tokens *in parallel* (the same trick as prefill), producing its own distribution at each position.
- A rejection-sampling rule accepts the longest correct prefix and re-samples the first rejected position from a corrected distribution.
- **Say this clearly: the output distribution is EXACTLY the target model's.** It is not an approximation, not a quality/speed tradeoff. Only speed changes. This is the part interviewers check, because most people assume it must be lossy.
- The whole speedup hangs on the **acceptance rate α** — how often the draft agrees. High α on predictable text (code, boilerplate, long shared prefixes); low α on creative or unusual text.
- Sizing: k too small wastes the parallel verify, k too large drafts tokens that will be rejected anyway. k = 4–5 is typical; real systems get 2–3× on friendly workloads.
- It helps *latency at low batch size*, where you have spare compute. At large batch sizes the GPU is already compute bound and speculation can make throughput **worse** — a genuinely good thing to volunteer.
- Variants worth naming: **Medusa** (extra prediction heads instead of a separate draft model), **EAGLE**, and prompt-lookup decoding (draft by copying from the prompt — free, and superb for summarization and editing tasks).`,
    },
    {
      type: 'math',
      intro:
        'Expected tokens accepted per target-model step, for draft length k and acceptance rate α (each draft token accepted independently with probability α).',
      latex: [
        '\\mathbb{E}[\\text{tokens per step}] \\;=\\; \\frac{1 - \\alpha^{\\,k+1}}{1 - \\alpha}',
        '\\alpha = 0.8,\\; k = 4 \\;\\Rightarrow\\; \\frac{1 - 0.8^{5}}{0.2} = \\frac{0.6723}{0.2} \\approx 3.36 \\;\\text{tokens per big-model pass}',
        '\\alpha = 0.5,\\; k = 4 \\;\\Rightarrow\\; \\frac{1 - 0.5^{5}}{0.5} = 1.94 \\quad (\\text{barely worth the draft model cost})',
        '\\text{Net speedup} \\;=\\; \\frac{\\mathbb{E}[\\text{tokens per step}]}{1 + k \\cdot c}, \\quad c = \\frac{\\text{draft cost}}{\\text{target cost}} \\;\\; (\\text{keep } c \\text{ under } 0.05)',
      ],
    },
    {
      type: 'intuition',
      title: 'The three numbers you get paged about',
      md: `Serving has exactly three metrics, they conflict, and knowing which one your product cares about is the whole job.

- **TTFT (time to first token)** — set by prefill. The user's "is it broken?" number. Target under ~500 ms for chat.
- **ITL / TPOT (inter-token latency)** — set by decode. Must beat reading speed, roughly 30–50 tokens/sec, or streaming looks laggy.
- **Throughput (total tokens/sec across all users)** — set by batch size. This is what your GPU bill divides by.
- **The fundamental tradeoff: bigger batch = better throughput, worse per-request latency.** Bigger batches amortize the weight read across more sequences (bandwidth bound, remember), so tokens/sec/GPU climbs — while each individual user waits longer per step and may queue for admission.
- Pick your side explicitly. Interactive chat: cap the batch, protect p99 latency, accept a worse cost per token. Offline batch jobs (summarizing 10M documents): max the batch, ignore latency entirely, and the cost per token can be 10× lower.
- **Cost per million tokens** is the business number, and it is just: (GPU $/hour ÷ 3600) ÷ (tokens/sec) × 10⁶. A $2/hr A100 doing 2000 tok/s aggregate = about $0.28 per million tokens. Now you know why API prices look the way they do, and why input tokens are cheaper than output tokens — input is parallel prefill, output is serial decode.`,
    },
    {
      type: 'intuition',
      title: 'Two architecture notes that are really inference notes',
      md: `- **MoE (mixture of experts)**: replace the FFN with N experts and a router that sends each token to the top-k (usually 2). Parameter count grows N× while per-token compute grows barely at all — a "1000B" MoE may activate 30B per token. That is the sales pitch.
- **The MoE catch, and say it unprompted: all experts must be resident in memory.** You do not know which expert a token wants until the router runs, so you cannot page them in. You pay 1000B of *memory* for 30B of *compute*. MoE trades your cheap resource (VRAM capacity) for your expensive one (bandwidth and FLOPs) — great in a datacenter, awful on a laptop. Add expert-parallel communication and load imbalance across experts as the two operational headaches.
- **Sliding-window attention**: each token attends only to the last w tokens (Mistral: w = 4096), so the KV-cache stops growing and caps at w — bounded memory for unbounded generation, at the cost of direct long-range links (information still travels layer by layer, w tokens per layer).`,
    },
    {
      type: 'note',
      md: 'How to apply all of it, in order, when someone hands you a slow endpoint. **(1)** Use a real serving engine — vLLM/TGI/TensorRT-LLM — for paged attention and continuous batching; this is free and usually the biggest single jump. **(2)** Pick a GQA model, because it is the only item on this list you cannot retrofit. **(3)** Quantize weights to int8 or int4 (AWQ/GPTQ), and the KV-cache to fp8/int8 if concurrency is the wall. **(4)** Tune batch size against your p99 latency SLO — not against a benchmark. **(5)** Add speculative decoding last, and only if your traffic is low-batch and predictable. Everything above **(5)** is a config change; that ordering is the answer to "how would you cut our inference cost in half".',
    },
  ],
  quiz: [
    {
      question: 'During decode (one token at a time, batch size 1), what is the GPU mostly doing?',
      options: [
        {
          text: 'Saturating its tensor cores with large matrix multiplications',
          explanation: 'That is prefill. In decode the matmuls are matrix-VECTOR products — tiny compute, and the tensor cores are mostly idle.',
        },
        {
          text: 'Waiting on HBM while it streams every weight in the model to produce one token',
          explanation:
            'Correct. Decode is memory-bandwidth bound: ~13 GB read for only ~1 FLOP per byte of useful work. This is why every decode optimization is really "move fewer bytes".',
        },
        {
          text: 'Running the softmax, which dominates at small batch sizes',
          explanation: 'Softmax is a rounding error in the cost. The weight read dominates by orders of magnitude.',
        },
      ],
      correct: 1,
    },
    {
      question: 'A Llama-7B-style model (32 layers, 32 heads, head_dim 128, fp16). How much KV-cache does ONE 4096-token sequence need?',
      options: [
        { text: 'About 128 MB', explanation: 'Off by 16×. That would be the answer if you forgot the layer count or used one K/V instead of both.' },
        { text: 'About 500 MB', explanation: 'That is the GQA-8 answer (8 KV heads). With full 32-head MHA it is four times larger.' },
        {
          text: 'About 2 GB',
          explanation:
            'Correct. 2 × 32 × 32 × 128 × 2 bytes = 0.5 MB per token; × 4096 tokens = 2 GB. Memorize the 0.5 MB/token figure for 7B-class models.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Which phase determines time-to-first-token, and what is its compute profile?',
      options: [
        {
          text: 'Prefill — the whole prompt in one parallel pass, compute bound',
          explanation: 'Correct. TTFT is dominated by prefill, which scales with prompt length (and quadratically in attention). Long system prompts are a TTFT problem.',
        },
        { text: 'Decode — the first generated token, bandwidth bound', explanation: 'The first token is produced at the end of prefill; decode governs the tokens AFTER the first, i.e. inter-token latency.' },
        { text: 'Both equally, since they run interleaved', explanation: 'They are distinct phases with opposite bottlenecks — that separation is the point of the question.' },
      ],
      correct: 0,
    },
    {
      question: 'What exactly does GQA share, and what does it save?',
      options: [
        { text: 'It shares query heads across layers, saving weights', explanation: 'Nothing about GQA is cross-layer, and query heads are not shared — they all remain distinct.' },
        {
          text: 'Several query heads share one K/V head, shrinking the KV-cache by the group factor',
          explanation:
            'Correct. 32 query heads with 8 KV heads = 4× smaller cache and 4× fewer cache bytes read per decode step, at quality within noise of full MHA.',
        },
        { text: 'It shares the KV-cache between different user requests', explanation: 'That is prefix sharing under PagedAttention — a different mechanism entirely.' },
      ],
      correct: 1,
    },
    {
      question: 'What does continuous (in-flight) batching change versus static batching?',
      options: [
        { text: 'It increases the batch size beyond what memory allows', explanation: 'It does not create memory; PagedAttention is what reduces memory waste. Continuous batching changes scheduling.' },
        { text: 'It quantizes finished sequences to free space', explanation: 'No quantization is involved — finished sequences are simply released.' },
        {
          text: 'A finished sequence leaves the batch at the next step and a queued request takes its slot, instead of everyone waiting for the slowest',
          explanation:
            'Correct. On mixed-length traffic this is typically a 2–4× throughput win at zero quality cost — the largest single lever in real serving.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Speculative decoding with a small draft model changes the model output how?',
      options: [
        {
          text: 'Not at all — the accept/reject rule guarantees exactly the target model\'s distribution',
          explanation:
            'Correct, and this is the point most candidates get wrong. It is a pure latency optimization; the draft model only proposes, the target model verifies and corrects.',
        },
        { text: 'Output becomes a blend of the draft and target models', explanation: 'A rejected draft token is re-sampled from a corrected target distribution — the draft never contributes probability mass of its own.' },
        { text: 'Quality drops slightly in exchange for ~2× speed', explanation: 'That describes quantization, not speculation. Speculation trades nothing but extra draft compute.' },
      ],
      correct: 0,
    },
    {
      question: 'What problem does PagedAttention specifically solve?',
      options: [
        { text: 'The O(n²) cost of the attention score matrix', explanation: 'That is FlashAttention (an exact IO-aware kernel). PagedAttention is about memory allocation, not the attention math.' },
        {
          text: 'Fragmentation and over-reservation of KV-cache memory, by allocating fixed-size blocks on demand',
          explanation:
            'Correct — plus the bonus of sharing identical prefix blocks between requests by reference, which is huge for shared system prompts.',
        },
        { text: 'Weight memory, by paging unused layers to CPU RAM', explanation: 'Layer offloading is a different (and much slower) technique; PagedAttention only manages the KV-cache.' },
      ],
      correct: 1,
    },
    {
      question: 'An MoE model has 8 experts and routes each token to 2. What happens to memory and compute?',
      options: [
        { text: 'Both drop by 4×, since only 2 of 8 experts run', explanation: 'Compute drops relative to a dense model of the same parameter count — memory does not drop at all.' },
        { text: 'Memory drops because unused experts are paged out per token', explanation: 'You only learn the routing after the router runs, so experts cannot be paged in on demand. All of them stay resident.' },
        {
          text: 'Per-token compute stays near a small dense model, but ALL experts must be resident in memory',
          explanation:
            'Correct. MoE buys parameter count without proportional FLOPs, and pays for it in VRAM capacity plus expert-parallel communication and load-imbalance headaches.',
        },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Do the KV-cache math out loud. Llama-7B-style: 32 layers, 32 heads, head_dim 128, fp16. How big is the cache at 4096 tokens, and what does that imply for serving?',
      answer:
        'Write the formula first: bytes = 2 × layers × KV heads × head_dim × seq_len × batch × dtype_bytes, where the 2 is one K vector and one V vector. Per token: 2 × 32 × 32 × 128 × 2 bytes = 524,288 bytes = **0.5 MB per token**. At 4096 tokens that is **2 GB for a single sequence**. Now the implication, which is the real question: the weights are 14 GB (13 GiB) and fixed, so on an 80 GB card you have ~67 GB left, which is **33 concurrent 4096-token sequences** — and 32 users at full context is 64 GB, more than four times the weights. So the KV-cache, not the model size, is what caps concurrency. Then name the levers in order: GQA-8 divides it by 4 (133 concurrent), fp8/int8 KV halves it again, PagedAttention removes the reservation waste, and sliding-window attention caps the growth entirely. Bonus credit for noting the cache is also *read* every decode step, so shrinking it speeds up decode as well as fitting more users.',
      isCaseBased: false,
    },
    {
      question: 'Why is token generation memory-bandwidth bound rather than compute bound? Give the arithmetic.',
      answer:
        'For each generated token you must read every weight out of HBM once. A 7B model in fp16 is ~13 GB read per token. The useful work is roughly 2×params = 14 GFLOPs. That is about 1 FLOP per byte read (14 GFLOPs over 13 GB), against hardware that wants ~150 FLOPs per byte (an A100 does ~312 TFLOPs against ~2 TB/s). So you are running at roughly 1% of compute capability and the ceiling is bandwidth ÷ bytes: 2.0 TB/s ÷ 13 GB ≈ 154 tokens/sec for one sequence, no matter how fast the tensor cores are. Two consequences to state: (1) quantizing to int4 makes decode about 4× faster because it moves 4× fewer bytes — the speedup is *not* about faster math; (2) batching is nearly free in decode, because the same weight read serves every sequence in the batch, which is exactly why throughput scales with batch size while latency barely moves until you become compute bound.',
      isCaseBased: false,
    },
    {
      question: 'Distinguish prefill and decode. Which optimizations apply to which?',
      answer:
        'Prefill processes the whole prompt in one parallel forward pass: large matmuls, tensor cores saturated, **compute bound**, and it sets time-to-first-token. Decode emits one token per pass: matrix-vector work, **memory-bandwidth bound**, and it sets inter-token latency. They respond to opposite medicine. Prefill benefits from FlashAttention (its O(n²) attention is the cost), prompt caching / prefix sharing (skip it entirely for repeated system prompts), and chunked prefill so a long prompt does not stall the decode of other users. Decode benefits from quantization, GQA, bigger batches, and speculative decoding. Two things worth volunteering: the phases fight each other in a shared batch — a long prefill blocks everyone\'s decode, hence chunked prefill and disaggregated prefill/decode on separate GPU pools; and this asymmetry is why API providers price input tokens cheaper than output tokens.',
      isCaseBased: false,
    },
    {
      question: 'What is GQA, why does it barely hurt quality, and why can you not add it at serving time?',
      answer:
        'GQA keeps all query heads but gives each *group* of them a shared K/V head — 32 query heads with 8 KV heads means 4 queries per group and a 4× smaller KV-cache. MQA is the k=1 extreme: 32× smaller, but with measurable quality loss and training instability, which is why 8 groups became the industry default (Llama-2-70B onward, Llama-3, Mistral). It barely hurts because heads within a group tend to look for related things anyway; you preserve what each head *asks* (its own query projection) while sharing what the group *offers*. And it is architectural — the K/V projection matrices literally have fewer output heads, so the weights must be trained that way. You can "uptrain" an MHA checkpoint into GQA by mean-pooling each group\'s K/V projections and continuing pretraining for a small fraction of the original compute, which is how Llama-2-70B was made — but you cannot flip a serving flag. Every other optimization in the stack is a config change; this one is not.',
      isCaseBased: false,
    },
    {
      question: 'Case: your chat endpoint has good TTFT (300 ms) but users complain text appears slowly, and your GPU bill per token is terrible. Diagnose and fix.',
      answer:
        'Good TTFT means prefill is fine; slow text plus bad cost means decode. Measure first: inter-token latency, tokens/sec per request, aggregate tokens/sec, achieved HBM bandwidth, and GPU utilization. Low utilization with high memory traffic confirms bandwidth bound. Fix order: **(1)** Is the batch full? If you are running one or two sequences per step you are paying the full weight read for almost no output — that is both the latency and the cost symptom, and the cause is usually static batching plus a small memory budget. Move to a real engine with continuous batching and PagedAttention. **(2)** Shrink the bytes: int8 or int4 weight quantization (AWQ/GPTQ) gives a near-proportional decode speedup and frees memory for a bigger batch. **(3)** Shrink the cache so the batch can grow: GQA model if you can switch checkpoints, fp8/int8 KV if you cannot. **(4)** If traffic is genuinely low-concurrency and predictable, add speculative decoding — it converts spare compute into latency. Tradeoff to state explicitly: steps 1–3 improve latency and cost together; if the batch then gets so large you become compute bound, per-request latency starts degrading and you must cap batch size against a p99 SLO.',
      isCaseBased: true,
    },
    {
      question: 'Explain speculative decoding precisely, including why the output distribution is unchanged and when it does not help.',
      answer:
        'A small draft model autoregressively proposes k tokens (cheap, because it is small). The target model then runs ONE parallel forward pass over prompt + the k drafts, producing its own next-token distribution at every position — the same trick that makes prefill parallel. A modified rejection sampling rule accepts draft token t with probability min(1, p_target(t)/p_draft(t)); on the first rejection it samples from the normalized residual (p_target − p_draft)⁺. That rule is exactly the one that makes the composite sampler have the target\'s marginal distribution, so **the output is distributionally identical to running the target alone** — it is not an approximation, and stating that clearly is the point of the question. Expected tokens per target step is (1 − α^(k+1))/(1 − α) for acceptance rate α: α=0.8, k=4 gives ~3.36. When it fails: low α (creative or out-of-distribution text) makes the drafts wasted work; large batch sizes make you compute bound, so the "free" parallel verify is no longer free and throughput can *drop*; and the draft model costs memory and must be well aligned with the target. Cheap variants that dodge the second model: Medusa/EAGLE heads, and prompt-lookup decoding for summarization or editing where the answer copies from the input.',
      isCaseBased: false,
    },
    {
      question: 'Walk through quantization: the ladder, what each rung costs, and PTQ vs QAT.',
      answer:
        'The map from bits to memory is just params × bytes: a 7B model is 28 GB at fp32, 14 GB at fp16/bf16, 7 GB at int8, 3.5 GB at int4. Because decode is bandwidth bound, memory reduction translates almost directly into decode speedup. Quality cost is gradual: fp16/bf16 is effectively free (bf16 preferred for its wider exponent range), int8 is nearly free with good scaling, int4 is a small hit that is usually acceptable — the rule of thumb being **4-bit for a 4× win**. Below 4 bits quality falls off a cliff. Mechanically it is an affine map ŵ = s(q − z), and the thing that makes low bits work is *granularity*: per-channel or per-group (64–128 weights) scales, not per-tensor. PTQ compresses a trained model with a small calibration set in minutes and no gradients; QAT simulates the rounding during training (straight-through estimator) so the model learns to tolerate it — better at 3 bits and below, but it costs a training run, so PTQ dominates in practice. Formats: GPTQ (second-order layer-wise PTQ), AWQ (protects salient channels, usually slightly better and faster), GGUF for llama.cpp on CPU/Apple silicon, bitsandbytes for drop-in HF 8/4-bit and QLoRA. Two catches worth raising unprompted: activations quantize worse than weights because of outlier channels (LLM.int8(), SmoothQuant), and at large batch sizes a 4-bit model can be *slower* than fp16 because dequantization is compute and you are no longer bandwidth bound.',
      isCaseBased: false,
    },
    {
      question: 'Static batching versus continuous batching — where does the win come from, and how big is it?',
      answer:
        'Static batching forms a batch, runs it to completion, and only then admits new work. Because output lengths vary wildly — a 15-token "yes, here you go" shares a batch with a 900-token essay — most slots sit computing padding for most of the batch\'s life; utilization is roughly mean length ÷ max length. Continuous batching schedules at the *step* level: any sequence that emits its EOS is released immediately and a queued request is admitted into that slot on the next forward pass. The win therefore scales with the variance of your output lengths — commonly quoted at 2–4× throughput on mixed chat traffic, and it costs exactly nothing in output quality. It depends on PagedAttention to be practical, because admitting requests mid-flight means allocating and freeing cache blocks constantly, which contiguous per-request allocations fragment badly. Worth adding: continuous batching improves *queueing* latency for short requests (they no longer wait behind an essay) while a very full batch slightly increases per-step latency — so you still cap the batch against a p99 SLO.',
      isCaseBased: false,
    },
    {
      question: 'Case: finance says inference costs $40k/month and needs to be under $15k, with the same product. What do you do, in order?',
      answer:
        'Cost per million tokens = (GPU $/hr ÷ 3600) ÷ (aggregate tokens/sec) × 10⁶, so there are exactly three levers: raise tokens/sec, lower $/hr, or send fewer tokens. Measure first — tokens/sec/GPU, batch occupancy, TTFT and ITL percentiles, and the input:output token ratio. Then, in order of win-per-effort: **(1)** Serving engine with continuous batching + PagedAttention if not already there — often 2–4× on its own, no quality change. **(2)** Quantize to int8/int4 (AWQ) — roughly proportional decode speedup plus room for a larger batch; validate on your own eval set, not a public benchmark. **(3)** Prefix/prompt caching if you have a large shared system prompt — for agent workloads this can remove most of prefill, which is pure cost. **(4)** Right-size the model: a well-finetuned 7B beating a 70B on *your* task is the single biggest cost lever anyone ever finds, and routing easy queries to the small model with hard ones escalating is the safe version of it. **(5)** Raise batch size until p99 latency hits the SLO, and move any non-interactive work (batch summarization, embeddings, evals) to a separate high-batch pool where latency does not matter. **(6)** Cheaper hardware for the smaller model, and spot/committed-use pricing. What I would NOT do first: cut context length or max tokens — that changes the product. The honest tradeoff: steps 1, 3, 5 are free; step 2 costs a little quality; step 4 costs engineering time and needs an eval harness to be safe.',
      isCaseBased: true,
    },
    {
      question: 'The KV-cache never evicts entries within a sequence. So what CAN a serving system evict, and how?',
      answer:
        'Correct premise — attention at step 500 still needs token 1, so there is no LRU policy inside a request; the cache only grows until the sequence ends. What a server can do instead operates at coarser granularity. **Preemption at the sequence level**: when memory runs out, vLLM evicts a whole running request — either swapping its blocks to CPU RAM and swapping back later, or dropping them and recomputing prefill on resume (recompute is usually cheaper than the PCIe round trip). **Refcounted prefix blocks**: shared prompt blocks are freed only when the last sequence using them finishes. **Architectural eviction**: sliding-window attention genuinely drops tokens older than w, which caps the cache — and StreamingLLM showed you must keep the first few "attention sink" tokens or quality collapses. **Lossy compression**: H2O and similar heuristics drop low-attention tokens, and KV quantization to fp8/int8 shrinks entries instead of removing them. Tradeoff to name: everything in the last category is approximate, so reach for it only after paging, GQA and quantization are exhausted.',
      isCaseBased: false,
    },
    {
      question: 'Case: pick a batch size for (a) a customer-facing chat product and (b) an overnight job summarizing 10 million documents. Justify with the tradeoff.',
      answer:
        'Same tradeoff, opposite ends. Because decode is bandwidth bound, one weight read serves the whole batch, so throughput rises nearly linearly with batch size until the GPU becomes compute bound — while per-request inter-token latency degrades and admission queueing grows. **(a) Chat:** the binding constraint is perceived speed — TTFT under ~500 ms and ITL fast enough to beat reading speed (~30–50 tok/s). So set the batch by *measuring* p99 ITL as you raise it and stopping at the SLO, typically a modest cap with continuous batching keeping it full; also chunk long prefills so one 30k-token prompt cannot stall everyone else\'s decode. Accept the worse cost per token. **(b) Offline:** nobody is watching, so latency is not a metric at all. Push the batch to the memory limit (which is a KV-cache limit — use GQA, quantized KV, and short max lengths to fit more), sort inputs by length to reduce ragged batches, use the largest quantization that passes eval, and expect roughly an order of magnitude better cost per million tokens than the interactive pool. The general principle to state: run interactive and batch traffic on **separate pools**, because a single batch-size setting cannot serve two opposite objectives.',
      isCaseBased: true,
    },
    {
      question: 'MoE: what does it actually buy, and what is the catch you should raise before the interviewer does?',
      answer:
        'A MoE layer replaces the dense FFN with N expert FFNs plus a router that sends each token to the top-k experts (usually 2). Parameter count scales with N while per-token FLOPs scale with k, so you get the quality of a much larger model at close to the compute of a small one — a nominally 8×7B model activating ~13B per token, for instance. The catch to volunteer: **all experts must be resident in memory**, because routing is data-dependent and only known after the router runs, so you cannot page experts in on demand. You are paying full parameter count in VRAM for a fraction of it in compute — a great trade in a datacenter with spare capacity, a terrible one on a single consumer GPU, which is why MoE models are awkward for local inference. Two further operational costs: with expert parallelism, every token generates all-to-all communication between GPUs, so interconnect becomes the bottleneck; and expert load is uneven, so you need auxiliary load-balancing losses at training time and capacity factors at serving time, or some experts idle while others queue.',
      isCaseBased: false,
    },
    {
      question: 'Case: design ChatGPT\'s serving stack. Follow one request from the browser to the last streamed token, then size the fleet.',
      answer:
        '**Front door.** CDN and TLS termination, then an API gateway that authenticates the session or API key and attaches the user\'s tier and quota. Rate limit in **tokens per minute, not requests per minute** — one request can be 200 tokens or 100,000, so a request counter is bypassed by a single giant prompt. Run the cheap abuse and moderation classifiers here, before any GPU is touched: rejecting at the gateway costs microseconds, rejecting after prefill costs a second of H100 time. Admission control is a bounded queue with a 429 when depth exceeds what the latency SLO can absorb — backpressure, never unbounded queueing.\n\n**Routing.** Route on model, tier, and prompt shape. Tier picks the pool: paid traffic to the fp16/fp8 flagship, free traffic to a smaller or int4-quantized variant. Then route on prefix — hash the conversation prefix (system prompt plus history) and prefer the replica that already holds those KV blocks in its prefix cache, which turns a 30k-token prefill into a lookup. That is the highest-leverage routing decision in any agent or long-system-prompt workload. Keep it **soft** affinity with load-based fallback, or one hot conversation pins a replica.\n\n**Inference pools.** Replicas of vLLM or TensorRT-LLM, weights resident, running **continuous batching**: a finished sequence is released at the next decode step and a queued request takes its slot, so a 15-token answer never waits behind a 900-token essay — 2 to 4 times the throughput on mixed traffic, at zero quality cost. Underneath it, **PagedAttention**: KV in fixed-size blocks, so no per-request over-reservation, refcounted prefix blocks for sharing, and copy-on-write for multi-sample requests.\n\n**Prefill and decode are different machines.** Prefill is compute bound and sets TTFT; decode is bandwidth bound and sets inter-token latency; they want opposite batch sizes. Minimum: chunked prefill, so a 100k-token paste cannot stall everyone else\'s decode. At scale: disaggregate them onto separate GPU pools and ship KV blocks across the interconnect — the tradeoff is a KV transfer per request plus real operational complexity, so do it only when TTFT and throughput are both binding.\n\n**Streaming back.** SSE from the inference server through the gateway, one token or small chunk per event. Three things people get wrong: the proxy must have response buffering disabled or streaming silently degrades into a batch response; you need heartbeats so idle intermediaries do not kill the connection; and **cancellation must propagate** — a closed tab has to free the sequence and its KV blocks immediately, or you generate for nobody and pay for it. Also: between turns you do **not** hold KV. The conversation is re-prefilled from the prefix cache on the next message. Holding cache through human think time is the most expensive mistake available in this design.\n\n**Capacity arithmetic — do it twice and size on whichever binds.** Memory: a 7B-class GQA-8 model is 0.125 MB of KV per token (0.5 MB for MHA, divided by 4), so a 2,000-token live context is 250 MB; an 80 GB card holding 13 GB of weights plus ~5 GB of activations and fragmentation leaves ~62 GB, about **248 concurrently generating sequences**. Throughput: that card does roughly 2,000-3,000 aggregate tokens/sec on a 7B at large batch (order of magnitude — measure yours), and each streaming user needs ~30 tok/s to beat reading speed, so about **70-100 concurrent streams**. Throughput binds, not memory, which is the usual outcome. So: if 20,000 people have a chat open and ~15% are mid-generation, that is 3,000 active streams at ~80 per GPU ≈ 38 GPUs, provisioned at ~50 for p99 headroom and failure domains across at least two zones. The business number is cost per million tokens = (GPU $/hr ÷ 3600) ÷ (aggregate tok/s) × 10⁶.\n\n**Autoscaling.** Scale on **queue depth, time-in-queue, KV-cache utilization and preemption rate — not CPU**, which is near-idle on a GPU box, and not raw GPU utilization either, which reads close to 100% during a bandwidth-bound decode that is doing almost no useful work. Two hard constraints shape the policy: loading weights into HBM takes minutes, so you scale on a leading indicator and keep a warm pool; and scale-down must drain, because killing a replica mid-stream drops live conversations. Instrument TTFT p50/p99, ITL p99, tokens/s/GPU, batch occupancy, prefix-cache hit rate and preemption rate, and alert on the first and last of those.\n\n**What I cut first under cost pressure**, ordered from least to most user-visible: (1) speculative decoding on the high-batch pools — it buys latency at low batch and actively costs throughput once you are compute bound; (2) warm-pool depth and redundancy headroom, accepting slower scale-up; (3) int4/AWQ weights and fp8 KV on the free tier, validated on our own eval set rather than a public benchmark; (4) route short and easy queries to a small fine-tuned model with escalation on failure — the largest lever anyone ever finds and also the most engineering; (5) raise batch caps until p99 inter-token latency touches the SLO ceiling. Last, and only with product sign-off, shrink max context or max output tokens — that changes the product, not the infrastructure. The one thing I would not cut is the eval harness, because every item on that list is a quality risk you cannot manage without one.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Why is decode slow?', back: 'Sequential (token n+1 needs token n) AND memory-bandwidth bound: you read every weight from HBM per token, ~1 FLOP per byte against hardware wanting ~150.' },
    { front: 'Prefill vs decode', back: 'Prefill: whole prompt, one parallel pass, compute bound, sets TTFT. Decode: one token per pass, bandwidth bound, sets inter-token latency.' },
    { front: 'KV-cache memory formula (+ the 7B number)', back: 'bytes = 2 (K and V) × layers × KV_heads × head_dim × seq_len × batch × dtype_bytes. 7B: 2×32×32×128×2B = 0.5 MB per token → 2 GB at 4096 tokens → only 33 concurrent seqs on an 80 GB card.' },
    { front: 'What the KV-cache buys and costs', back: 'Buys: no re-computing past tokens (O(n²) work → O(n) per step). Costs: memory — the cache, not the weights, caps batch size.' },
    { front: 'GQA vs MQA', back: 'GQA: query heads grouped over 8 KV heads → 4× smaller cache, quality within noise. MQA: 1 KV head → 32× smaller, real quality cost. Architectural — must pretrain/uptrain it.' },
    { front: 'PagedAttention + continuous batching', back: 'Paging: fixed-size KV blocks like OS virtual memory → no fragmentation or over-reservation, plus refcounted prefix sharing. Continuous batching: swap finished sequences out mid-flight → 2–4× throughput, free.' },
    { front: 'Quantization ladder (7B)', back: 'fp32 28 GB → fp16 14 → int8 7 → int4 3.5. Buys memory AND bandwidth (= decode speed); costs quality gradually. 4-bit ≈ acceptable for 4×. PTQ = calibrate a trained model; QAT = simulate rounding during training. GPTQ, AWQ, GGUF, bitsandbytes.' },
    { front: 'Speculative decoding', back: 'Draft model proposes k tokens, target verifies all k in ONE parallel pass, accepts the longest correct prefix. Output distribution is EXACTLY the target\'s — not an approximation. E[tokens/step] = (1−α^(k+1))/(1−α); α=0.8, k=4 → 3.36.' },
    { front: 'The three serving metrics + the batch tradeoff', back: 'TTFT (prefill), inter-token latency (decode), throughput (batch). Bigger batch = better throughput, worse per-request latency. Cost/1M tokens = ($/hr ÷ 3600) ÷ tok/s × 10⁶.' },
    { front: 'MoE catch', back: 'Top-k routing grows parameters without proportional per-token compute — but ALL experts must be resident in memory, since routing is only known at runtime. Plus all-to-all comms and expert load imbalance.' },
  ],
  mindmapMarkdown: `- Inference: KV-Cache, Quantization & Serving
  - Why generation is slow
    - sequential: token n+1 needs token n
    - memory-bandwidth bound, not compute bound
    - read 13 GB of weights per ONE token
    - ~2 FLOP/byte vs hardware ~150 FLOP/byte
    - ceiling = bandwidth / bytes read
  - Two phases
    - prefill: whole prompt, parallel, compute bound
    - prefill sets TTFT
    - decode: one token per pass, bandwidth bound
    - decode sets inter-token latency
    - chunked / disaggregated prefill
  - KV-cache
    - without it: recompute all past tokens, O(n squared)
    - with it: store K and V, O(n) per step
    - Q is never cached (used once)
    - traded compute for memory
  - KV-cache arithmetic
    - 2 x layers x kv_heads x head_dim x seq x batch x dtype
    - 7B: 0.5 MB per token
    - 4096 tokens = 2 GB per sequence
    - batch 32 = 64 GB > 13 GB of weights
    - cache caps concurrency, not model size
  - GQA / MQA
    - share K/V heads across query heads
    - GQA-8: 4x smaller, quality in the noise
    - MQA: 32x smaller, real quality cost
    - architectural: cannot bolt on at serve time
  - vLLM ideas
    - PagedAttention: fixed blocks, no fragmentation
    - prefix sharing, copy-on-write
    - continuous batching: swap finished seqs mid-flight
    - 2-4x throughput, zero quality cost
  - Quantization
    - fp32 28 GB, fp16 14, int8 7, int4 3.5
    - fewer bytes = faster decode
    - 4-bit = 4x memory for acceptable quality
    - PTQ (calibrate) vs QAT (train with rounding)
    - GPTQ, AWQ, GGUF/llama.cpp, bitsandbytes
    - KV-cache quantization is a separate lever
    - activation outliers: SmoothQuant, LLM.int8()
  - Speculative decoding
    - draft model proposes k tokens
    - target verifies all k in ONE parallel pass
    - EXACT same output distribution, not approximate
    - acceptance rate alpha drives the speedup
    - hurts at large batch (already compute bound)
    - Medusa, EAGLE, prompt-lookup
  - Serving metrics
    - TTFT vs inter-token latency vs throughput
    - bigger batch: more throughput, worse latency
    - cost per million tokens is the business number
    - separate interactive and batch pools
  - Architecture notes
    - MoE: params grow, per-token compute does not
    - MoE catch: all experts resident in memory
    - sliding-window attention caps the cache at w`,
}

export default m
