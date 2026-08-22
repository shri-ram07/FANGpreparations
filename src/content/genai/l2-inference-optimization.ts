import type { Module } from '../types'

const m: Module = {
  id: 'genai-l2-inference-optimization',
  subjectId: 'genai',
  level: 2,
  title: 'Serving a Language Model: What Each Token Costs',
  whyItMatters:
    'A language model that answers one question for you on a laptop is a different engineering problem from the same model answering a thousand questions at once. This module works out, with plain arithmetic, what producing a single word actually costs in work and in memory. By the end you will be able to take a model description and a GPU, and say how many people can talk to it at the same time, and why.',
  assumes: [
    'You have seen a Python for loop, a list, and a function',
    'You know what a byte is, and that a gigabyte is about a billion bytes',
    'You know roughly what a neural network is: a big pile of numbers, called weights, that turns an input into an output',
    'No transformer knowledge is needed. Every term used here is defined here.',
  ],
  estMinutes: 34,
  sections: [
    {
      type: 'intuition',
      title: 'What it costs to produce one word',
      md: `**Inference** means using a trained model to produce answers. Not training it, not changing it — just running it. That is what a serving system does all day.

A language model produces text one piece at a time. Each piece is called a **token**, roughly a word or part of a word. To produce one token, the model runs once, top to bottom, over everything it has seen so far. One run like that is called a **forward pass**.

- You send a prompt of 200 tokens. The model produces a 300-token answer.
- That answer is not one run of the model. It is **300 separate runs**, one per token produced.
- Run 1 reads the 200 prompt tokens and produces token 201.
- Run 2 reads 201 tokens and produces token 202. Run 3 reads 202 tokens. And so on.
- The model cannot skip ahead. Token 202 depends on token 201 existing first, so the 300 runs happen strictly one after another.

Now count the total reading. Run 1 reads 200 tokens, run 2 reads 201, up to run 300 reading 499. Add those up and you get about 105,000 token-readings to produce 300 tokens. You did roughly 350 times more reading than the answer is long, and almost all of it was re-reading the same prompt over and over.`,
    },
    {
      type: 'visual',
      component: 'Plot',
      props: {
          title: 'The KV cache is what actually fills your GPU',
          notice: 'For a 32-layer model with d_model 4096 in fp16, every token cached costs 2 × 32 × 4096 × 2 = 524,288 bytes — 0.52 MB per token, per sequence. At 4,096 tokens that is 2.1 GB for ONE user; at 32,768 tokens it is 17.2 GB. The weights are a fixed cost you pay once, but this grows with every token of every concurrent request, which is why long context is expensive to serve.',
          kind: 'line',
          xLabel: 'sequence length (tokens)',
          yLabel: 'KV cache (GB, one sequence)',
          series: [
            {
              name: 'KV cache',
              points: [[512, 0.2684], [1024, 0.5369], [2048, 1.0737], [4096, 2.1475], [8192, 4.295], [16384, 8.5899], [32768, 17.1799]],
              dots: true,
            },
          ],
        },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Count the waste before fixing it',
      code: `prompt_tokens = 200
generated = 300
no_cache = 0
for step in range(generated):
    tokens_read = prompt_tokens + step
    no_cache = no_cache + tokens_read
with_cache = generated
print(no_cache)
print(with_cache)
print(round(no_cache / with_cache, 1))

# ---- real output ----
# 104850
# 300
# 349.5`,
      annotations: {
        1: 'The prompt is 200 tokens long. A plain integer.',
        2: 'The answer will be 300 tokens long, so the model runs 300 times.',
        3: 'A running total, starting at zero. We will add the reading done by each run.',
        4: 'range(300) produces 0, 1, 2, ... 299 — one number per run. step is which run we are on.',
        5: 'On run number step, the model has the 200 prompt tokens plus the step tokens already generated. So it reads prompt_tokens + step tokens.',
        6: 'Add this run\'s reading to the total. Nothing clever: just a sum.',
        7: 'The alternative we are about to build: process each token once, so 300 runs read 300 new tokens in total.',
        8: 'Prints 104850 — the token-readings done when nothing is remembered between runs.',
        9: 'Prints 300 — the token-readings done when each token is processed once.',
        10: 'Prints 349.5. Re-reading everything costs about 350 times as much work as remembering it.',
      },
    },
    {
      type: 'intuition',
      title: 'The fix: keep what you already computed',
      md: `Here is the one fact that makes the waste avoidable. When the model reads a token, it turns that token into two vectors — lists of numbers — called the **key** and the **value** of that token. Their job is to let later tokens look back at this one: the key is what the token can be found by, the value is what is returned when it is found.

- Those two vectors depend only on the token itself and on the model weights. Neither of those changes while the answer is being written.
- So the key and value of prompt token 7 computed during run 1 are **bit for bit identical** to the ones run 300 would compute.
- Recomputing them 300 times is pure waste.

The **KV cache** is simply the store where you keep them. Compute each token\'s key and value once, park them in GPU memory, and every later run reuses them. Each run then only has to compute the key and value of the **one** new token.

That is the whole idea, and it turns 104,850 units of reading into 300. Nothing is ever thrown away inside one answer: the run that produces token 500 still needs to look back at token 1. There is no "least recently used" eviction here — the cache only grows until the answer ends.

You did not remove the cost. You **moved** it from compute into memory. The rest of this module is about paying that memory bill.`,
    },
    {
      type: 'math',
      intro:
        'How much memory one token takes in the cache. Build it from the pieces, then put numbers in.',
      latex: [
        '\\text{bytes per token} \\;=\\; 2 \\;\\times\\; L \\;\\times\\; H \\;\\times\\; d \\;\\times\\; b',
        '2 = \\text{one key AND one value};\\quad L = \\text{layers};\\quad H = \\text{key/value heads};\\quad d = \\text{numbers per head};\\quad b = \\text{bytes per number}',
        '2 \\times 32 \\times 32 \\times 128 \\times 2 \\;=\\; 524{,}288 \\text{ bytes} \\;=\\; 0.5\\;\\text{MB per token}',
        '4096 \\text{ tokens} \\;\\Rightarrow\\; 2\\;\\text{GB for one conversation};\\qquad 32 \\text{ conversations} \\;\\Rightarrow\\; 64\\;\\text{GB}',
      ],
    },
    {
      type: 'intuition',
      title: 'Reading that formula out loud',
      md: `Five pieces, and each one is a plain count. Take a common open model shape: 32 layers, 32 heads, 128 numbers per head, and each number stored in 2 bytes.

- **Layers.** The model is a stack of identical blocks — 32 of them here. Every block computes its own key and value for every token, so everything gets multiplied by 32.
- **Heads.** Inside a block the looking-back is done by several independent copies called heads, 32 here. Each head has its own key and value.
- **Numbers per head.** Each key is a list of 128 numbers. So is each value.
- **Bytes per number.** A number stored at ordinary precision takes 2 bytes.
- **The 2 at the front.** One key and one value per token. Not three — the third vector, the query, is used once by the current token and thrown away, so it is never cached.

Multiply: 2 x 32 x 32 x 128 x 2 = 524,288 bytes, which is exactly **0.5 MB for one token**. That is per token, per conversation. Ten thousand tokens of chat history is 5 GB. This is the number that ends up deciding how many users fit on a card.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The cache arithmetic, in code',
      code: `layers = 32
kv_heads = 32
head_dim = 128
bytes_per_number = 2
per_token = 2 * layers * kv_heads * head_dim * bytes_per_number
print(per_token)
print(per_token / (1024 * 1024))
seq = 4096
print(per_token * seq / (1024 ** 3))
print(per_token * seq * 32 / (1024 ** 3))

# ---- real output ----
# 524288
# 0.5
# 2.0
# 64.0`,
      annotations: {
        1: 'The stack is 32 blocks deep, and every block stores its own keys and values.',
        2: 'Each block has 32 heads that store a key and a value.',
        3: 'Each key is 128 numbers long, and so is each value.',
        4: 'Two bytes per number. Change this to 1 and the whole cache halves.',
        5: 'The formula. The leading 2 is "a key and a value", not a fudge factor.',
        6: 'Prints 524288 — the raw byte count for a single token.',
        7: '1024 * 1024 is one megabyte in bytes, so this converts. Prints 0.5.',
        8: 'A 4096-token context: the longest conversation the model will hold.',
        9: '1024 ** 3 is one gigabyte. ** is Python\'s power operator. Prints 2.0 GB for one full-length conversation.',
        10: 'Thirty-two users at full context. Prints 64.0 GB — and that is only their conversation history.',
      },
    },
    {
      type: 'note',
      md: 'Compare 64 GB of cache against the model itself. Seven billion weights at 2 bytes each is about 13 GB, and that 13 GB is paid **once** no matter how many users you have. The cache is paid **per user, per token**. So "how big is the model" is the easy question and "how much memory does one more user cost" is the one that decides whether your service stays up.',
    },
    {
      type: 'intuition',
      title: 'Two phases that behave nothing alike',
      md: `A request runs through the model in two distinct stages, and they have opposite bottlenecks. Two more terms first, both plain.

- **Compute-bound** means the chips are busy doing arithmetic and the limit is how fast they multiply.
- **Memory-bandwidth-bound** means the chips are mostly waiting for numbers to arrive from memory. Bandwidth is how many bytes per second can be moved out of the GPU\'s memory into the part that does the arithmetic.

Now the two stages.

- **Prefill** is the first pass: the whole prompt goes through the model at once. All 200 tokens are independent at this point, so they are processed in parallel, as one large multiplication. The chips are saturated. Prefill is **compute-bound**.
- **Decode** is everything after: one token per pass, forever. Each pass does a tiny amount of arithmetic, but to do it the GPU must still read **every weight in the model** — all 13 GB — out of memory. Thirteen gigabytes moved to produce one word. Decode is **memory-bandwidth-bound**.

The size of the mismatch: reading 13 GB at 2 TB/s takes about 6.5 milliseconds, which caps you at roughly 150 tokens per second for a single conversation no matter how fast the chips are. The arithmetic in that pass would have taken a small fraction of that time. The chips are idle, waiting.

This is why the distinction drives every serving decision. If the limit is bytes moved, then going faster means moving fewer bytes — smaller weights, smaller cache — or getting more useful output from each byte you already moved.`,
    },
    {
      type: 'intuition',
      title: 'Time to first token, latency, throughput',
      md: `Three numbers you will be asked to trade against each other. All three are plain measurements.

- **Time to first token (TTFT)** — how long the user stares at nothing before the first word appears. That is prefill, so it is set by prompt length. A 30,000-token prompt has a TTFT problem; a 20-token prompt does not.
- **Latency** here means per-request speed: once text starts, how fast the next word arrives. That is decode. About 30 tokens per second matches comfortable reading speed.
- **Throughput** means total output across all users, measured in tokens per second for the whole machine. This is the number your bill is proportional to.

They are not the same number and they are often in conflict. One user getting 150 tokens per second is great latency and terrible throughput, because you moved 13 GB of weights and got one token out of it.`,
    },
    {
      type: 'intuition',
      title: 'Batching: one weight read, many tokens',
      md: `**Batching** means running several requests through the same forward pass together.

Here is why it wins. In decode you read all 13 GB of weights to produce one token for one user. If eight users are mid-answer, you can run all eight through the same pass. The weights are read **once** and produce **eight** tokens. The bytes moved did not change; the useful output went up eight times.

- That is close to free throughput while decode is bandwidth-bound, which it is at small batch sizes.
- It stops being free eventually. Pile in enough requests and the arithmetic per pass grows until the chips, not the memory, are the limit. Past that point more batching buys nothing.
- And it costs the individual user. Each pass now does more work, so each pass takes longer, so **your** next word arrives later than it would have if you were alone on the machine.
- That is the core trade: batching raises throughput (cheaper per token, good for you) and raises per-user latency (slower text, bad for the user). You pick a batch size by raising it until per-user speed hits the slowest you are willing to ship.

**Continuous batching** fixes an obvious waste in the simple version. If you form a batch of eight and run it until every one finishes, the user who wanted a 15-token answer sits in the batch doing nothing while a 900-token essay finishes next to them. Continuous batching instead re-forms the batch at **every single step**: any request that just finished is dropped, and a waiting request takes its slot immediately. On traffic with mixed answer lengths this is the single largest throughput win available, and it changes no output at all.`,
    },
    {
      type: 'intuition',
      title: 'Quantisation: fewer bits per weight',
      md: `**Quantisation** means storing each weight in fewer bits than the usual 16.

A weight is currently a 16-bit number: 2 bytes, able to represent a wide range of values very finely. The observation behind quantisation is that the model does not need that fineness. So you pick a range, chop it into steps, and store each weight as which step it lands on.

- **8-bit** gives you 256 possible steps per weight. One byte instead of two: the weights halve.
- **4-bit** gives you 16 steps per weight. Half a byte: the weights are one quarter the size.
- For a 7-billion-weight model: 7e9 x 2 = 14 GB at 16-bit, 7 GB at 8-bit, 3.5 GB at 4-bit. In the units a GPU actually reports, 13.0 GB, 6.5 GB and 3.3 GB.
- Because decode is bandwidth-bound, fewer bytes of weights means less to read per token, so the model also gets **faster**, not just smaller.

The honest cost: rounding every weight to a coarse grid changes the model\'s outputs. At 8 bits the change is usually too small to measure on real tasks. At 4 bits it is small but real — you should expect a slight quality drop and you should check it on your own examples rather than trusting a general claim. Below 4 bits quality falls apart quickly.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Does quantising the weights buy concurrency?',
      code: `GB = 1024 ** 3
card = 80 * GB
per_seq = 2 * 32 * 32 * 128 * 4096 * 2
sizes = [("fp16", 2.0), ("int8", 1.0), ("int4", 0.5)]
for name, bytes_each in sizes:
    weights = 7e9 * bytes_each
    free = card - weights
    print(name, round(weights / GB, 1), round(free / GB, 1), int(free // per_seq))

# ---- real output ----
# fp16 13.0 67.0 33
# int8 6.5 73.5 36
# int4 3.3 76.7 38`,
      annotations: {
        1: '1024 ** 3 bytes is one gigabyte, the unit a GPU reports free memory in.',
        2: 'The card has 80 GB of memory in total. Everything must fit here: weights and caches together.',
        3: 'Cache bytes for one full 4096-token conversation, from the formula above: 2 GB.',
        4: 'A list of pairs. Each pair is a name and how many bytes one weight takes at that precision — 2 bytes at 16-bit, 1 at 8-bit, half a byte at 4-bit.',
        5: 'Looping over pairs unpacks each one into two variables at once: name gets the first item, bytes_each the second.',
        6: '7e9 is 7 billion written in scientific notation. Times the bytes per weight gives the total weight memory.',
        7: 'Whatever the weights do not use is available for conversations.',
        8: '// is floor division: how many whole 2 GB conversations fit in the free space. Prints 33, 36, 38.',
      },
    },
    {
      type: 'note',
      md: 'Look hard at that output. Cutting the weights from 13 GB to 3.3 GB — a four-fold saving — bought you **five extra users**, from 33 to 38. The reason is that the weights were never the big number here; 32 conversations of cache are 64 GB against 13 GB of weights. Quantisation makes decode faster and lets the model fit on a smaller card, both real wins. It does almost nothing for concurrency, because concurrency is a cache problem. Fixing concurrency means shrinking the cache: fewer key/value heads in the architecture, or storing the cache itself at 8-bit.',
    },
    {
      type: 'intuition',
      title: 'Speculative decoding, briefly',
      md: `One more idea, because it follows directly from the bandwidth argument. Reading 13 GB of weights to produce one token is wasteful — and reading them to **check five proposed tokens** costs exactly the same, because all five can be checked in one parallel pass.

So: let a small, cheap model guess the next few tokens. Then run the big model once over the prompt plus those guesses, and see which guesses it agrees with. Keep the agreed prefix, throw away the rest, and repeat. On predictable text the small model is right most of the time and you get several tokens per big-model pass. On unusual text it is rarely right and you gain little. The accept-or-reject rule is designed so the text you end up with has exactly the same distribution as the big model alone would have produced — this is a speed change, not a quality trade.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One request, and what accumulates in memory',
        notice: 'Left = what this pass computes. Right = what is parked in GPU memory. The right column only grows.',
        leftLabel: 'This pass',
        rightLabel: 'KV cache in GPU memory',
        frames: [
          {
            note: 'PREFILL. The whole 4-token prompt goes through in ONE pass, all four tokens in parallel. This is the phase the user experiences as time to first token. Every layer writes one key and one value per token.',
            stack: [
              { name: 'phase', value: 'prefill (1 pass)' },
              { name: 'tokens in', value: '4, in parallel' },
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
            note: 'DECODE, first pass. One token in, one token out. It looks back at the 4 stored pairs; the prompt is never recomputed. This pass reads all 13 GB of weights to produce one word.',
            stack: [
              { name: 'phase', value: 'decode pass 1' },
              { name: 'token out', value: '"the"' },
              { name: 'just written', to: 'k5' },
              { name: 'cache size', value: '2.5 MB' },
            ],
            heap: [
              { id: 'k1', value: 'K, V', label: 'tok 1-4  (prompt)' },
              { id: 'k5', value: 'K, V', label: 'tok 5  "the"  (new)' },
            ],
          },
          {
            note: 'DECODE, pass 200. Notice the pattern: the arithmetic per pass is CONSTANT, the memory grows by exactly 0.5 MB per pass. Nothing is evicted — pass 200 still looks back at token 1.',
            stack: [
              { name: 'phase', value: 'decode pass 200' },
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
            note: 'One conversation filling the whole 4096-token context: 2 GB. That is one user holding more memory than a sixth of the model itself.',
            stack: [
              { name: 'phase', value: 'context full' },
              { name: 'tokens cached', value: '4096' },
              { name: 'cache size', value: '2.0 GB', danger: true },
            ],
            heap: [
              { id: 'full', value: '4096 x 0.5 MB', label: 'one conversation = 2.0 GB', danger: true },
              { id: 'w', value: '13 GB', label: 'model weights (paid once)' },
            ],
          },
          {
            note: 'Thirty-two users at full context: 64 GB of cache against 13 GB of weights, on an 80 GB card. It does not fit. THIS is what caps how many people can talk to your model at once.',
            stack: [
              { name: 'users', value: '32' },
              { name: 'weights', value: '13 GB' },
              { name: 'cache', value: '64 GB', danger: true },
              { name: 'total', value: '77 GB on an 80 GB card', danger: true },
            ],
            heap: [
              { id: 'cache32', value: '32 x 2.0 GB = 64 GB', label: 'KV cache', danger: true },
              { id: 'w', value: '13 GB', label: 'model weights' },
              { id: 'act', value: 'scratch space, fragmentation', label: 'the rest — and there is none left', danger: true },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Worked case: size one machine, by hand',
      md: `A document-assistant product. One GPU card with 80 GB. A 7-billion-weight model, 32 layers, 32 key/value heads, 128 numbers per head, 16-bit. Average conversation: a 3,000-token document pasted in, plus a 1,000-token answer, so 4,000 tokens live at the end. Work it out in order.

1. **Weights.** 7,000,000,000 weights x 2 bytes = 14,000,000,000 bytes. Divided by 1024 three times, that is **13.0 GB**. Paid once.
2. **Scratch space.** Every pass needs working room for intermediate results, plus the GPU driver\'s own overhead. Reserve **5 GB**. Guessing zero here is how you get an out-of-memory error at 3 a.m.
3. **What is left for conversations.** 80 - 13 - 5 = **62 GB**.
4. **Cost of one conversation.** 0.5 MB per token x 4,000 tokens = 2,000 MB = **1.95 GB**. Call it 2 GB.
5. **Concurrent conversations.** 62 / 2 = **31**.
6. **Sanity-check against speed.** One card produces on the order of 2,000 tokens per second in total when the batch is full. Each user reading along needs about 30 tokens per second. 2,000 / 30 = about **66 users**.

Memory allows 31, speed allows 66, so **memory is the binding constraint at 31 concurrent conversations**. Size the fleet on 31, not 66. And now you know exactly which lever to pull: not weight quantisation, which we showed buys almost nothing here — cache size. Cut the key/value heads from 32 to 8 and one conversation costs 0.5 GB instead of 2 GB, which takes you from 31 concurrent users to about 124 on the same card.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: budgeting for the model and forgetting the cache',
      md: `Here is the wrong answer, done in full, because almost everyone does this one first.

**The reasoning.** "The model is 7 billion weights at 2 bytes, so 13 GB. The card has 80 GB. That leaves 67 GB spare — loads of room. Each request is small, so let\'s allow **200 concurrent users**."

**What happens.** It works perfectly in testing with three people. It works in a load test with short prompts. Then real traffic arrives, people paste in long documents, and the server starts crashing with out-of-memory errors. The fix everyone tries first — restarting with fewer users allowed — makes the crashes rarer without explaining anything.

**Why it is wrong.** The 67 GB is not spare. It is where the KV cache lives, and the cache is charged per user **and** per token. At 0.5 MB per token, 200 users each holding 4,000 tokens want 200 x 2 GB = **400 GB**. You budgeted for 80. The crash was never about the model size.

**Why it hid during testing.** In testing, prompts were short. Twenty users with 100-token conversations cost 20 x 50 MB = 1 GB, which fits in anything. The cache bill grows with **conversation length**, and test conversations are always short. The failure appears only when real users paste real documents.

**The right budget.** Memory = weights + scratch space + (users x tokens per user x bytes per token). Solve it for users, not for weights. That is 62 GB / 2 GB = 31 users, not 200. Being off by six times is the difference between a service that stays up and one that does not.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work each one on paper before reading the solution. All of them are the same formula with different numbers.

**1.** A model with 40 layers, 40 key/value heads, 128 numbers per head, 16-bit. How much cache does one token take?

**2.** Same model. A user has a 10,000-token conversation open. How much memory is that user holding?

**3.** You store the cache at 8-bit instead of 16-bit. What happens to the answer to problem 2, and what else changes?

**4.** A 13-billion-weight model at 16-bit, on an 80 GB card, 5 GB of scratch space, with the model from problem 1\'s cache shape. How many 10,000-token conversations fit?

**5.** Your service serves 500 requests per second, each producing 20 tokens. A card produces 2,000 tokens per second. How many cards do you need, ignoring memory?`,
    },
    {
      type: 'intuition',
      title: 'Practice solutions',
      md: `**1.** 2 x 40 x 40 x 128 x 2 = 819,200 bytes, which is 0.78 MB per token. Bigger model, bigger per-token bill — layers and heads both went up.

**2.** 819,200 x 10,000 = 8,192,000,000 bytes. Divide by 1024 three times: **7.63 GB** for one user. A single person is now holding more than half of what a 13 GB model weighs. This is why long contexts are expensive.

**3.** Halve it: 0.39 MB per token, **3.81 GB** for that user. You have doubled how many users fit. What else changes: the cache entries are now rounded to a coarser grid, so the model\'s looking-back is slightly less precise and output can shift a little. It also speeds up decode slightly, since the cache is read every pass and there is now half as much of it.

**4.** Weights: 13e9 x 2 = 26,000,000,000 bytes = 24.2 GB. Free: 80 - 24.2 - 5 = 50.8 GB. Each conversation is 7.63 GB from problem 2. 50.8 / 7.63 = **6 conversations**. Six. On an 80 GB card. Long context plus a big model is a brutal combination, and there is no way to be clever about it — the arithmetic is the arithmetic.

**5.** 500 x 20 = 10,000 tokens per second needed. 10,000 / 2,000 = **5 cards** at perfect efficiency. Nobody runs at perfect efficiency, so provision more — the usual reason being that the batch is not always full and traffic is not evenly spread. But 5 is the floor, and if someone claims two cards will do it, this line is the argument.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Four extensions, each one a direct consequence of something above.

- **Shrinking the cache in the architecture.** The formula multiplies by the number of key/value heads, so build the model with fewer of them. Let 32 query heads share 8 key/value groups: the cache is four times smaller and quality barely moves, because heads tend to look for similar things anyway. This is a training-time decision — you cannot switch it on at serving time.
- **Paged attention.** Reserving the maximum context per user up front wastes almost all of it when the user writes three lines. Instead, cut the cache into fixed-size blocks and hand out a block only when the previous one fills, exactly like an operating system pages memory. A bonus falls out: two users with the same long system prompt can point at the **same** blocks, so it is stored once.
- **Prefill and decode want different machines.** Prefill is compute-bound and wants small batches; decode is bandwidth-bound and wants large ones. The cheap fix is to chop a huge prompt into chunks so one giant paste cannot stall everyone else\'s text. The expensive fix is to run prefill and decode on separate pools of GPUs and ship the cache between them.
- **What a server can evict.** Inside one answer, nothing — every past token is still needed. So eviction happens a level up: when memory runs out the server drops a whole request, frees its blocks, and re-runs its prefill later. Recomputing prefill is usually cheaper than copying gigabytes of cache out to system memory and back.`,
    },
  ],
  quiz: [
    {
      question: 'Without a KV cache, producing a 300-token answer to a 200-token prompt costs about 105,000 token-readings. Where does that number come from?',
      options: [
        { text: 'The model runs once and reads 105,000 tokens.', explanation: 'No. One run produces one token, so a 300-token answer is 300 runs.' },
        { text: 'The model runs 300 times, and run number k re-reads all 200 + k tokens seen so far. Summing 200 up to 499 gives about 105,000.', explanation: 'Correct. One forward pass per token produced, and each pass re-reads everything so far. The exact sum is 104,850. The cache removes the re-reading, leaving 300.' },
        { text: 'Each of the 300 tokens is read 350 times while the text is split into tokens.', explanation: 'Splitting text into tokens happens once and is cheap. The cost here is the model passes, not the splitting.' },
      ],
      correct: 1,
    },
    {
      question: 'Why are the key and value vectors safe to cache, while the query is not?',
      options: [
        { text: 'Query vectors are too large to store.', explanation: 'They are the same size as a key. Size is not the reason.' },
        { text: 'All three are cached; the 2 in the formula is a rounding.', explanation: 'The 2 is exact. Only two vectors per token are stored.' },
        { text: 'Key and value depend only on the token and the weights, so they never change; the query is used once by the current token and then discarded.', explanation: 'Correct, and that is exactly why the formula starts with 2 rather than 3. Later tokens look back at earlier keys and values, so those must persist. Nobody ever looks back at an old query.' },
      ],
      correct: 2,
    },
    {
      question: 'A model has 32 layers, 32 key/value heads, 128 numbers per head, 2 bytes per number. How much cache does one token take?',
      options: [
        { text: '0.5 MB', explanation: 'Correct. 2 x 32 x 32 x 128 x 2 = 524,288 bytes. At a 4096-token context that is 2 GB for one conversation.' },
        { text: '2 MB', explanation: 'That is four times too big. Check whether you multiplied by 2 twice.' },
        { text: '128 KB', explanation: 'Too small — this looks like head_dim x bytes without the layers and heads.' },
        { text: '2 GB', explanation: 'That is the whole 4096-token conversation, not one token.' },
      ],
      correct: 0,
    },
    {
      question: 'Decode produces one token per pass. What is the machine actually limited by?',
      options: [
        { text: 'Arithmetic speed: the multiplications saturate the chips.', explanation: 'That is prefill, where the whole prompt goes through at once. A single decode pass does very little arithmetic.' },
        { text: 'Memory bandwidth: every weight must be read out of memory to produce one token, and the arithmetic is tiny by comparison.', explanation: 'Correct. Reading 13 GB at 2 TB/s is about 6.5 ms per token however fast the chips are. That is why "move fewer bytes" is the main lever.' },
        { text: 'The network between GPUs.', explanation: 'Only relevant when a model is split across cards. The single-card limit here is memory bandwidth.' },
      ],
      correct: 1,
    },
    {
      question: 'You batch eight requests into one decode pass. What happens?',
      options: [
        { text: 'Both throughput and per-user speed improve.', explanation: 'Throughput improves, but each pass now does more work, so the individual user waits slightly longer for each word.' },
        { text: 'Throughput is unchanged, because the work per token is the same.', explanation: 'The arithmetic per token is the same, but the weight read is shared across all eight, and that read was the bottleneck.' },
        { text: 'Throughput rises close to eight-fold, because one weight read now yields eight tokens; each individual user waits a little longer per token.', explanation: 'Correct. Bytes moved stay the same and useful output multiplies. The cost is per-user speed.' },
      ],
      correct: 2,
    },
    {
      question: 'Quantising a 7B model from 16-bit to 4-bit on an 80 GB card takes concurrency from 33 conversations to only 38. Why so small a gain?',
      options: [
        { text: 'Quantisation reduces compute, not memory.', explanation: 'It reduces memory directly — 13 GB down to 3.3 GB here. That is not the issue.' },
        { text: 'The weights were the small number. At 2 GB of cache per conversation the cache dominates the budget, so shrinking the weights barely moves the count.', explanation: 'Correct. You freed 9.7 GB in a budget where each extra user costs 2 GB. Quantisation is a real win for decode speed and for fitting on smaller cards, just not for concurrency.' },
        { text: 'The number of layers caps concurrency.', explanation: 'Layers affect the size of the cache per token, but they do not cap how many conversations fit.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Do the KV cache arithmetic out loud: 32 layers, 32 key/value heads, head dimension 128, 16-bit. How big is the cache, and what does it imply for serving?',
      answer:
        'Formula first: bytes = 2 x layers x kv_heads x head_dim x tokens x bytes_per_number, where the 2 is one key and one value per token. Per token: 2 x 32 x 32 x 128 x 2 = 524,288 bytes, so 0.5 MB. At a 4096-token context that is 2 GB for one conversation, and 32 conversations is 64 GB. Now the implication, which is the actual question: the weights are 13 GB and paid once, so on an 80 GB card you have roughly 62 GB after scratch space, which is about 31 concurrent full-length conversations. The cache, not the model size, caps concurrency. The levers follow from the formula: fewer key/value heads divides it directly, storing the cache at 8-bit halves it, and capping context length caps the growth.',
      isCaseBased: false,
    },
    {
      question: 'Explain the difference between prefill and decode, and why it matters for how you serve.',
      answer:
        'Prefill is the first pass over the whole prompt. Every prompt token is independent at that point, so they go through together as one large multiplication and the chips are saturated: it is compute-bound, and it sets time to first token. Decode is everything after: one token per pass, each pass doing a small amount of arithmetic but still having to read every weight out of memory. It is memory-bandwidth-bound, and it sets how fast text appears. They want opposite things. Decode is wasting bandwidth on a single sequence, so it wants a large batch; prefill is already saturating compute, so a large batch only makes it slower. Practically that means chunking long prompts so one giant paste does not stall everyone else\'s decode, and at large scale running prefill and decode on separate pools.',
      isCaseBased: false,
    },
    {
      question: 'What does quantisation actually change, and what does it cost?',
      answer:
        'A weight is normally a 16-bit number. Quantising means picking a range, chopping it into steps, and storing which step each weight lands on. Eight bits gives 256 steps and halves the weights; four bits gives 16 steps and quarters them. For a 7B model that is 14 GB, 7 GB, 3.5 GB. Two wins: it fits on smaller hardware, and because decode is bandwidth-bound, fewer bytes read per token means faster decode roughly in proportion. The cost is that rounding to a coarse grid changes outputs. At 8 bits the difference is usually not measurable on real tasks; at 4 bits it is small but real and should be checked on your own examples rather than a public benchmark; below 4 bits it degrades fast. One caveat worth volunteering: quantising weights does little for concurrency, because concurrency is a KV cache problem, not a weights problem.',
      isCaseBased: false,
    },
    {
      question: 'Explain speculative decoding and say when it does not help.',
      answer:
        'It comes straight out of the bandwidth argument. Reading every weight to produce one token is wasteful, and reading them to check five proposed tokens costs the same, because the check runs over all five positions in one parallel pass. So a small cheap model proposes the next few tokens, the big model verifies them in a single pass, you keep the longest agreed prefix and repeat. The accept-or-reject rule is constructed so the final text has exactly the distribution the big model alone would produce, so this is purely a speed change, not a quality trade — that is the part people get wrong. When it fails: if the small model is often wrong, on creative or unusual text, most drafts are discarded and you gained little. And at large batch sizes you are already compute-bound rather than bandwidth-bound, so the free parallel check is no longer free and throughput can actually drop.',
      isCaseBased: false,
    },
    {
      question: 'Case: your chat service has good time to first token but users say text appears slowly, and cost per token is bad. Diagnose and fix.',
      answer:
        'Good time to first token means prefill is healthy, so the problem is decode. Measure first: tokens per second per request, total tokens per second across the machine, and how full the batch actually is. The classic pattern is a nearly empty batch — you are paying the full weight read to produce one or two tokens, which is simultaneously the slow-text symptom and the cost symptom. Fixes in order. One: fill the batch, and use continuous batching so a finished short answer frees its slot at the next step instead of at the end of the batch. This is the biggest win and it costs no quality. Two: move fewer bytes — quantise weights to 8-bit or 4-bit, which speeds decode roughly in proportion. Three: shrink the cache so a bigger batch fits at all, through fewer key/value heads or an 8-bit cache. Four: if traffic is genuinely low-concurrency, speculative decoding converts spare compute into speed. State the tradeoff explicitly: fixes one to three help latency and cost together, but if the batch grows until the chips are the limit, per-user latency starts degrading and you must cap batch size against whatever slowest-acceptable speed you have promised.',
      isCaseBased: true,
    },
    {
      question: 'Case: finance says inference costs 40k a month and needs to be under 15k, with the same product. What do you do, in order?',
      answer:
        'Cost per million tokens is (GPU cost per hour / 3600) / (tokens per second) x 1,000,000, so there are exactly three levers: more tokens per second, cheaper hardware, or fewer tokens. Measure first — tokens per second per card, batch occupancy, and the ratio of input to output tokens. Then in order of win per unit of effort. One: continuous batching if you do not have it, because it is usually a multiple and costs nothing in quality. Two: quantise to 8-bit or 4-bit; roughly proportional decode speedup, validated on your own evaluation set. Three: if many requests share a long system prompt, store that prefix once and reuse it, which removes most of prefill for those requests and prefill is pure cost. Four: right-size the model — a smaller model fine-tuned on your actual task is the largest cost lever anyone ever finds, with the safe version being to route easy queries to it and escalate hard ones. Five: raise the batch cap until per-user speed touches your limit, and move non-interactive work to a separate high-batch pool where latency does not matter. What I would not do first is cut context length or maximum output, because that changes the product rather than the infrastructure.',
      isCaseBased: true,
    },
    {
      question: 'Case: choose a batch size for (a) a customer-facing chat product and (b) an overnight job summarising ten million documents.',
      answer:
        'Same tradeoff, opposite ends of it. Because decode is bandwidth-bound, one weight read serves the whole batch, so throughput rises nearly linearly with batch size until the chips become the limit — while each individual user\'s text gets slower. For chat, the binding constraint is perceived speed: first token within a few hundred milliseconds and then text faster than the user reads, around 30 tokens per second. So you raise the batch while measuring the slowest user\'s token rate and stop at your limit, and you rely on continuous batching to keep that modest batch full. You accept a worse cost per token as the price of feeling fast. For the overnight job, nobody is watching, so latency is not a metric at all. Push the batch until memory stops you — and remember memory means cache, so short maximum lengths, fewer key/value heads and a quantised cache all buy batch size. Sort inputs by length so batches are not ragged. Expect roughly an order of magnitude better cost per token than the interactive pool. The principle to state: run the two on separate pools, because one batch size cannot serve two opposite objectives.',
      isCaseBased: true,
    },
    {
      question: 'Case: design the serving stack for a large chat product. Follow one request from the browser to the last streamed token, then size the fleet.',
      answer:
        'Front door: terminate TLS, authenticate, and attach the user\'s tier. Rate limit in tokens per minute rather than requests per minute, because one request can be 200 tokens or 100,000 and a request counter is defeated by a single huge prompt. Run cheap abuse checks here, before any GPU is touched — rejecting at the gateway costs microseconds, rejecting after prefill costs a second of expensive time. Admission is a bounded queue that returns a busy response when it is too deep; never queue without a limit.\n\nRouting: choose the pool by tier, then prefer a replica that already holds this conversation\'s prefix in its cache, since that turns a long prefill into a lookup. Keep that preference soft with load-based fallback, or one popular conversation pins a replica.\n\nInference pool: replicas with weights resident, running continuous batching so a finished short answer releases its slot at the very next step instead of waiting for a long one, and paged attention underneath so cache memory is handed out in fixed blocks rather than reserved per request at maximum context, with shared prompt prefixes stored once.\n\nPrefill and decode are different workloads — compute-bound versus bandwidth-bound — so at minimum chunk long prompts so one giant paste cannot stall everyone\'s decode, and at scale run them on separate pools.\n\nStreaming back: send tokens as they are produced. Three things people get wrong: proxy buffering silently turns streaming into a single batch response; idle intermediaries kill the connection without heartbeats; and cancellation must propagate, because a closed tab that keeps generating burns money for nobody. Also, do not hold the cache between turns — 2 GB per idle user waiting for someone to type is the most expensive mistake in this design. Re-prefill from the prefix cache instead.\n\nSizing, done twice. Memory: 0.5 MB per token, so a 4,000-token conversation is 2 GB; an 80 GB card holding 13 GB of weights and 5 GB of scratch leaves 62 GB, about 31 concurrent conversations — and with fewer key/value heads, four times that. Throughput: a card produces on the order of 2,000 tokens per second at full batch, and each streaming user needs about 30, so roughly 66 users. Size on whichever is smaller and say which it is. Then autoscale on queue depth and cache utilisation, not on processor utilisation, which reads near 100 percent during a bandwidth-bound decode doing almost no arithmetic. Loading weights takes minutes, so scale on a leading indicator and keep a warm pool, and drain rather than kill on scale-down so live conversations are not dropped.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'What does one token cost to produce?', back: 'One full forward pass of the model. Without a cache that pass re-reads every token so far, so a 300-token answer to a 200-token prompt costs about 105,000 token-readings instead of 300.' },
    { front: 'What is in the KV cache, and why those two?', back: 'The key and value vectors of every token seen so far. They depend only on the token and the weights, so they never change and can be computed once. The query is used once by the current token and discarded, which is why the formula starts with 2, not 3.' },
    { front: 'KV cache size formula', back: 'bytes per token = 2 x layers x kv_heads x head_dim x bytes_per_number. For 32 / 32 / 128 / 2 bytes that is 524,288 bytes = 0.5 MB per token, so 2 GB at a 4096-token context.' },
    { front: 'Prefill vs decode', back: 'Prefill: whole prompt in one parallel pass, compute-bound, sets time to first token. Decode: one token per pass, must read every weight from memory each time, memory-bandwidth-bound, sets how fast text appears.' },
    { front: 'What does memory-bandwidth-bound mean here?', back: 'The chips are idle waiting for bytes. Reading 13 GB of weights at 2 TB/s takes about 6.5 ms, capping one conversation near 150 tokens/sec regardless of arithmetic speed. Going faster means moving fewer bytes.' },
    { front: 'Batching: what it buys and what it costs', back: 'One weight read serves the whole batch, so throughput rises nearly in proportion — until the chips become the limit. Cost: each pass does more work, so an individual user\'s next word arrives later. Continuous batching re-forms the batch every step so a finished request frees its slot immediately.' },
    { front: 'Quantisation ladder for a 7B model', back: '16-bit = 14 GB, 8-bit = 7 GB, 4-bit = 3.5 GB. Fewer bytes to read means faster decode too. 8-bit is nearly free in quality, 4-bit is a small real cost, below 4 bits degrades fast. It barely helps concurrency, because concurrency is a cache problem.' },
    { front: 'Memory budget for a serving box', back: 'weights + scratch space + (users x tokens per user x bytes per token). Solve for users. 80 GB card, 13 GB weights, 5 GB scratch, 2 GB per conversation gives 31 concurrent, not 200. Forgetting the third term is the classic crash.' },
  ],
  mindmapMarkdown: `- Serving a language model
  - What one token costs
    - one forward pass per token produced
    - without a cache each pass re-reads everything
    - 200-token prompt, 300-token answer = 105,000 readings
    - with a cache = 300
  - The KV cache
    - key and value of each token, stored once
    - they never change, so recomputing is waste
    - the query is used once and discarded
    - nothing is evicted inside one answer
    - traded compute for memory
  - Cache arithmetic
    - 2 x layers x kv_heads x head_dim x bytes
    - 32 / 32 / 128 / 2 bytes = 0.5 MB per token
    - 4096 tokens = 2 GB per conversation
    - 32 users = 64 GB against 13 GB of weights
    - the cache caps concurrency, not the model size
  - Two phases
    - prefill: whole prompt at once, compute-bound
    - prefill sets time to first token
    - decode: one token per pass, bandwidth-bound
    - decode reads all 13 GB per word
    - decode sets how fast text appears
  - Three numbers
    - time to first token
    - per-user speed, about 30 tokens/sec to match reading
    - throughput, total tokens/sec, what the bill tracks
  - Batching
    - one weight read serves the whole batch
    - throughput up, per-user latency down
    - stops helping once compute-bound
    - continuous batching re-forms the batch every step
  - Quantisation
    - 8-bit = 256 steps per weight, half the bytes
    - 4-bit = 16 steps, a quarter of the bytes
    - 7B: 14 GB, 7 GB, 3.5 GB
    - faster decode because fewer bytes read
    - small real quality cost at 4-bit
    - barely helps concurrency
  - Speculative decoding
    - small model proposes several tokens
    - big model checks them all in one pass
    - same output distribution, only speed changes
    - useless when the small model is usually wrong
  - Sizing a box
    - weights + scratch + users x tokens x bytes
    - 80 - 13 - 5 = 62 GB free
    - 62 / 2 = 31 concurrent conversations
    - check throughput too, size on the smaller
  - Beyond the basics
    - fewer key/value heads shrink the cache
    - paged attention, fixed blocks and shared prefixes
    - chunk long prompts, or split prefill and decode
    - eviction happens per request, not per token`,
}

export default m
