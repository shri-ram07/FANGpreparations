import type { Module } from '../types'

const m: Module = {
  id: 'genai-l2-pretraining-scaling',
  subjectId: 'genai',
  level: 2,
  title: 'Pretraining & Scaling Laws',
  whyItMatters:
    'Everything you use — GPT, Claude, Llama — is one objective (predict the next token) run at a scale that costs millions. Interviewers probe this to find out whether you understand WHY scale works or just that it does. And the practical payoff is immediate: Chinchilla arithmetic and the C = 6ND rule are how you sanity-check any training claim in a design review, and how you pick a base model instead of burning a quarter on a run you should never have started.',
  estMinutes: 50,
  sections: [
    {
      type: 'intuition',
      title: 'The whole objective, in one sentence',
      md: `Given the text so far, predict the next token. That is it. There is no second objective.

- The data needs no labels — token *t* is the label for everything before it. The internet labels itself. That is what makes trillions of tokens usable.
- Training loop: take a window of tokens, predict every next token in it at once, measure cross-entropy, backprop, repeat for months.
- Nothing in that loop mentions facts, grammar, reasoning or code. Those are not in the loss function.
- And yet the model learns all of them. That is the part worth actually understanding.`,
    },
    {
      type: 'intuition',
      title: 'Why one dumb objective forces a model to learn everything',
      md: `To predict the next token *well across all of human text*, you are forced into every skill that helps. Look at what each blank costs:

- *"The capital of France is ___"* → you need a **fact**. Guessing badly costs loss.
- *"def fib(n): if n < 2: return ___"* → you need **code semantics**, not just token frequency.
- *"She was born in 1984, so in 2004 she turned ___"* → you need **arithmetic**.
- *"...shall I compare thee to a summer's ___"* → you need **meter, rhyme and register**.
- *"The cat sat on the mat because it was ___"* → you need **coreference** and world knowledge about cats.

None of these were goals. Each one is *instrumentally useful* for lowering a single number. The corpus is broad enough that the cheapest way to lower that number is to actually model the world the text describes. This is why "it's just predicting the next word" is a bad dismissal — the dismissal is a description of the objective, not of what the objective forces into the weights.`,
    },
    {
      type: 'math',
      intro: 'The loss you are minimizing, and the number people quote instead of it.',
      latex: [
        '\\mathcal{L}(\\theta) = -\\frac{1}{T} \\sum_{t=1}^{T} \\log p_\\theta\\!\\left( x_t \\mid x_1, \\dots, x_{t-1} \\right)',
        '\\text{perplexity} = \\exp(\\mathcal{L}) \\;=\\; \\text{the effective number of equally-likely next tokens being chosen between}',
        '\\text{No labels anywhere: } x_t \\text{ IS the label for the prefix } x_{<t}.',
      ],
    },
    {
      type: 'intuition',
      title: 'The data pipeline, honestly',
      md: `Raw web text is mostly garbage. Every serious lab runs roughly the same five stages, and the ordering is not arbitrary.

1. **Crawl** — Common Crawl and friends: petabytes of HTML. Strip boilerplate, nav bars, ads. What survives is a fraction of what you downloaded.
2. **Deduplicate** — exact and *near*-duplicate removal (MinHash / LSH on shingles). This matters more than it sounds: duplicated text pushes the model toward memorization instead of generalization, and duplicated eval text silently contaminates your benchmarks.
3. **Quality filter** — heuristics (length, symbol ratio, stopword presence) plus a learned classifier ("does this look like a Wikipedia reference, or like SEO spam?"). Also PII and toxicity removal, which is a legal requirement long before it is a safety one.
4. **Mix** — you choose the *weights*: how much web vs code vs books vs Wikipedia vs math vs multilingual. Code is upsampled well past its natural share because it appears to help general reasoning; Wikipedia is tiny but high-value so it gets repeated.
5. **Tokenize** — everything becomes one flat stream of integers, chopped into fixed-length windows. The model never sees a "document"; it sees a window that may start mid-sentence.`,
    },
    {
      type: 'note',
      md: 'The modern view, and it reversed the 2020 consensus: **data quality and dedup beat raw volume**. Hard-filtered corpora (FineWeb-Edu, the Phi textbook-quality experiments) match or beat much larger dirty corpora at equal compute. This is good news for you — it means the interesting decisions in pretraining are data decisions, and data decisions are the ones a small team can actually make.',
    },
    {
      type: 'intuition',
      title: 'Scaling laws: the loss curve is a straight line',
      md: `Analogy: you expected a cliff, and you got a ramp. Plot loss against compute on log-log axes and you get a **straight line** — over seven or more orders of magnitude.

- Loss falls as a **power law** in model size N, dataset size D, and compute C. Smooth, no plateaus, no surprises.
- There is an **irreducible floor** — the entropy of language itself. Loss never reaches zero, no matter the budget.
- The real product of scaling laws is not the philosophy. It is **forecasting**: fit the curve on a dozen cheap small runs, extrapolate, and know roughly what the $100M run will score *before* you authorize it. That is how a lab de-risks a training run.
- The uncomfortable half of "power law": each further constant improvement costs a constant *multiple* more. With the fitted exponent α ≈ 0.076, **halving the reducible loss needs about 9,000× the parameters**. Progress is guaranteed and progress is exponentially expensive, at the same time.`,
    },
    {
      type: 'math',
      intro: 'The fitted form, and what the exponent implies once you take logs.',
      latex: [
        'L(N) \\approx L_{\\infty} + \\left( \\frac{N_c}{N} \\right)^{\\alpha_N}, \\qquad L(D) \\approx L_{\\infty} + \\left( \\frac{D_c}{D} \\right)^{\\alpha_D}, \\qquad \\alpha_N \\approx 0.076',
        '\\log\\left( L - L_{\\infty} \\right) = -\\alpha_N \\log N + \\text{const} \\quad \\Rightarrow \\quad \\text{a straight line on log-log axes}',
        '\\text{Halving the reducible loss costs } 2^{1/\\alpha_N} = 2^{13.2} \\approx 9{,}000\\times \\text{ the parameters.}',
      ],
    },
    {
      type: 'intuition',
      title: 'C = 6ND — the rule that lets you price any run',
      md: `Six FLOPs per parameter per token. Memorize this one; it is the arithmetic behind every "how long will this take" question.

- **Forward pass:** each parameter takes part in one multiply and one add per token → **2 FLOPs**.
- **Backward pass:** you compute the gradient with respect to the inputs *and* with respect to the weights — two passes of the same shape → **4 FLOPs**.
- Total **6 FLOPs per parameter per token**, so C ≈ 6ND for N parameters over D tokens.
- What it ignores: attention's O(n²) term (small until context is long), embeddings, and anything the optimizer does. Good to roughly ±20%, which is all you need for a plan.
- Then divide by what your hardware *actually sustains*, not the spec sheet: an H100 quotes 989 TFLOP/s bf16, and a good run sustains 35–50% of it (**MFU**, model FLOPs utilization). Use 40% and you will not embarrass yourself.`,
    },
    {
      type: 'intuition',
      title: 'Chinchilla: everyone was training models that were too big',
      md: `Until 2022 the recipe was "make it bigger". GPT-3 was 175B parameters trained on 300B tokens — **1.7 tokens per parameter**.

- The DeepMind Chinchilla paper redid the compute sweep properly (crucially, matching the learning-rate schedule to each token budget, which the earlier fits had not done).
- Finding: at compute-optimal, N and D should scale **roughly equally** — about **20 tokens per parameter**.
- The receipt: Chinchilla, 70B parameters on 1.4T tokens, beat Gopher, 280B parameters on 300B tokens, **at the same compute**. A 4× smaller model won.
- So the practical inversion: at a fixed compute budget you should often train a **smaller model on much more data**. Parameters are not the resource being optimized — compute is.
- Arithmetic for a 7B model: D* = 20 × 7e9 = **140B tokens**, and C = 6 × 7e9 × 1.4e11 = **5.88e21 FLOPs**.`,
    },
    {
      type: 'math',
      intro: 'The compute rule, and solving it for the compute-optimal split at a fixed budget C.',
      latex: [
        'C \\approx 6ND \\qquad (2 \\text{ FLOPs forward} + 4 \\text{ backward, per parameter per token})',
        'D = 20N \\;\\Rightarrow\\; C = 6N(20N) = 120 N^2 \\;\\Rightarrow\\; N^{*} = \\sqrt{C/120}, \\quad D^{*} = 20 N^{*}',
        'N = 7 \\times 10^{9} \\;\\Rightarrow\\; D^{*} = 1.4 \\times 10^{11} \\text{ tokens}, \\quad C = 6\\,(7\\times 10^{9})(1.4 \\times 10^{11}) = 5.88 \\times 10^{21} \\text{ FLOPs}',
      ],
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One compute budget, three ways to spend it',
        notice: 'The budget on the left never changes. Only the split between model size and token count does — and the split decides whether the money bought a good model or a wasted one.',
        leftLabel: 'the knobs',
        rightLabel: 'what you get',
        frames: [
          {
            note: 'Fix the budget: C = 1e23 FLOPs. The rule C = 6ND ties N and D together, so picking one picks the other. This is a single choice, not two.',
            stack: [
              { name: 'budget C', value: '1e23 FLOP' },
              { name: 'N params', to: 'n' },
              { name: 'D tokens', to: 'd' },
            ],
            heap: [
              { id: 'n', value: '? params', label: 'you pick' },
              { id: 'd', value: 'D = C / 6N', label: 'forced' },
            ],
          },
          {
            note: 'Spend it on a huge model: 115B parameters leaves only 144B tokens. D/N = 1.3. This is the pre-2022 mistake — a giant model that never saw enough data to fill its own capacity.',
            stack: [
              { name: 'budget C', value: '1e23 FLOP' },
              { name: 'N params', to: 'n', danger: true },
              { name: 'D tokens', to: 'd' },
            ],
            heap: [
              { id: 'n', value: '115B params', label: 'under-trained', danger: true },
              { id: 'd', value: '144B tokens', label: 'D/N = 1.3' },
            ],
          },
          {
            note: 'Chinchilla split: N* = sqrt(C/120) = 28.9B parameters, D* = 20N* = 577B tokens. Same budget, lowest loss. The whole rule is 20 tokens per parameter.',
            stack: [
              { name: 'budget C', value: '1e23 FLOP' },
              { name: 'N params', to: 'n' },
              { name: 'D tokens', to: 'd' },
            ],
            heap: [
              { id: 'n', value: '28.9B params', label: 'optimal' },
              { id: 'd', value: '577B tokens', label: 'D/N = 20' },
            ],
          },
          {
            note: 'Go too small: 7.2B parameters on 2.31T tokens, D/N = 320. Worse training loss for the same money — the model lacks the capacity to use the data. But hold this frame; it comes back.',
            stack: [
              { name: 'budget C', value: '1e23 FLOP' },
              { name: 'N params', to: 'n' },
              { name: 'D tokens', to: 'd' },
            ],
            heap: [
              { id: 'n', value: '7.2B params', label: 'small' },
              { id: 'd', value: '2.31T tokens', label: 'D/N = 320' },
            ],
          },
          {
            note: 'The arithmetic for a 7B model: 20 tokens per parameter means 140B tokens, and C = 6ND = 5.88e21 FLOPs. At 40% MFU on H100s that is 4,129 GPU-hours, about 10,000 dollars of rental.',
            stack: [
              { name: 'N', value: '7B params' },
              { name: 'D = 20N', to: 'd' },
              { name: 'C = 6ND', to: 'c' },
            ],
            heap: [
              { id: 'd', value: '140B tokens', label: '20 x 7B' },
              { id: 'c', value: '5.88e21 FLOP', label: '~$10k' },
            ],
          },
          {
            note: 'Why real open models break the rule on purpose: Llama-3 8B saw 15T tokens, D/N = 1875, about 94x past compute-optimal. Training costs more once; every inference is cheaper forever.',
            stack: [
              { name: 'N', value: '8B params' },
              { name: 'D actual', to: 'd' },
              { name: 'the reason', to: 'w' },
            ],
            heap: [
              { id: 'd', value: '15T tokens', label: 'D/N = 1875' },
              { id: 'w', value: 'inference wins', label: 'served forever' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Why modern models deliberately over-train (the senior point)',
      md: `Chinchilla answers one question: *what is the cheapest way to reach a given loss, once?* Production asks a different one: *what is the cheapest total cost of ownership?*

- A model is trained **once** and served **billions of times**. Over its lifetime, inference FLOPs dwarf training FLOPs.
- Inference cost scales with N, not with D. A smaller model is cheaper on every single request, forever — and it fits on smaller GPUs, which changes what you can deploy on.
- So you take a model smaller than compute-optimal and pour far more tokens into it than Chinchilla says. You pay more to train and less to serve.
- Llama-3 8B: 15T tokens against a Chinchilla-optimal 160B. That is roughly **94× past compute-optimal**, and it was a deliberate, correct decision.
- Say this in an interview and you separate yourself instantly: *"Chinchilla is compute-optimal for training. Nobody serving a model at scale is optimizing training compute."*`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Pricing a pretraining run — C = 6ND, Chinchilla split, and the bill',
      code: `PEAK = 989e12      # H100 SXM, bf16 dense, FLOP/s from the spec sheet
MFU = 0.40         # model FLOPs utilization: what a good run actually sustains
PRICE = 2.50       # $ per GPU-hour, rented

def compute(N, D):          # C = 6ND: 6 FLOPs per parameter per token
    return 6 * N * D

def chinchilla_tokens(N):   # compute-optimal: ~20 tokens per parameter
    return 20 * N

def gpu_hours(C):
    return C / (PEAK * MFU) / 3600

def dollars(C):
    return gpu_hours(C) * PRICE

print("model      params      tokens      C (FLOPs)   GPU-hours       cost")
for name, N in [("GPT-2 XL", 1.5e9), ("7B", 7e9), ("70B", 70e9)]:
    D = chinchilla_tokens(N)
    C = compute(N, D)
    print(f"{name:<10} {N:9.2e} {D:11.2e} {C:11.2e} {gpu_hours(C):10,.0f} {dollars(C):12,.0f}")

print()
print("tokens per parameter, real runs:")
for name, N, D in [("GPT-3", 175e9, 300e9), ("Chinchilla", 70e9, 1.4e12), ("Llama-3 8B", 8e9, 15e12)]:
    print(f"  {name:<12} N={N:8.1e}  D={D:8.1e}  D/N = {D/N:8.1f}")

print()
print("fixed budget C = 1e23 FLOPs, three ways to spend it:")
BUDGET = 1e23
N_opt = (BUDGET / 120) ** 0.5          # C = 6*N*(20N) = 120 N^2
for label, N in [("too big", 4 * N_opt), ("Chinchilla", N_opt), ("too small", N_opt / 4)]:
    D = BUDGET / (6 * N)               # spend the whole budget
    print(f"  {label:<11} N={N:8.2e}  D={D:8.2e}  D/N={D/N:7.1f}")
print(f"  budget buys {gpu_hours(BUDGET):,.0f} GPU-hours, cost {dollars(BUDGET):,.0f} USD")

# ---------- real output ----------
# model      params      tokens      C (FLOPs)   GPU-hours       cost
# GPT-2 XL    1.50e+09    3.00e+10    2.70e+20        190          474
# 7B          7.00e+09    1.40e+11    5.88e+21      4,129       10,322
# 70B         7.00e+10    1.40e+12    5.88e+23    412,875    1,032,187
#
# tokens per parameter, real runs:
#   GPT-3        N= 1.8e+11  D= 3.0e+11  D/N =      1.7
#   Chinchilla   N= 7.0e+10  D= 1.4e+12  D/N =     20.0
#   Llama-3 8B   N= 8.0e+09  D= 1.5e+13  D/N =   1875.0
#
# fixed budget C = 1e23 FLOPs, three ways to spend it:
#   too big     N=1.15e+11  D=1.44e+11  D/N=    1.3
#   Chinchilla  N=2.89e+10  D=5.77e+11  D/N=   20.0
#   too small   N=7.22e+09  D=2.31e+12  D/N=  320.0
#   budget buys 70,217 GPU-hours, cost 175,542 USD`,
      annotations: {
        1: 'Spec-sheet peak. Quoting this number as your throughput is the classic capacity-planning error — no real training run gets close to it.',
        2: 'MFU is the honest haircut: communication, data loading, pipeline bubbles and non-matmul work. 35-50% is a well-tuned run; below 30% something is wrong.',
        5: 'The whole rule of thumb: 2 FLOPs forward + 4 backward per parameter per token. Ignores attention n-squared and embeddings — fine to about 20%.',
        8: 'Chinchilla in one line. Everything downstream is this multiplied out.',
        12: 'Divide by EFFECTIVE FLOP/s, then by 3600. This is where paper numbers become a schedule someone has to sign off on.',
        25: 'Three real runs, one column that tells the whole story. GPT-3 is the old world, Chinchilla defined the rule, Llama-3 deliberately ignores it.',
        31: 'Substituting D = 20N into C = 6ND gives C = 120N-squared, so the optimal parameter count is sqrt(C/120). The only algebra in the module.',
        33: 'The budget is always fully spent — that is what makes this a split, not a shopping list. Choosing N chooses D.',
        41: 'A 70B model trained compute-optimally is about a million dollars of GPU rental, with zero failed restarts and perfect utilization. Reality is worse.',
        46: '1875 tokens per parameter — roughly 94x past compute-optimal, on purpose, because inference cost dominates a served model lifetime.',
        49: 'The GPT-3 shape: 1.3 tokens per parameter. Same budget, much worse model. This is the frame the diagram flags as wasteful.',
      },
    },
    {
      type: 'note',
      md: 'Read the last block once more. The **same** 1e23 FLOPs buys a 115B model that is starved, a 28.9B model that is right, or a 7.2B model that is over-fed. The budget did not change; only the split did. That is the entire Chinchilla result, and it is why "how many parameters?" is the wrong first question in a training design review — the first question is "what is the compute budget?"',
    },
    {
      type: 'intuition',
      title: 'Emergent abilities, stated honestly',
      md: `The claim: some capabilities sit at near-zero on a benchmark across many model sizes, then jump sharply past a scale threshold — 3-digit arithmetic, word unscrambling, multi-step reasoning. It looks like a phase transition, and it got a lot of headlines.

- The serious counter-argument (Schaeffer et al., *Are Emergent Abilities a Mirage?*): the jump is often an artifact of a **discontinuous metric**.
- Exact-match on a 5-digit answer is all-or-nothing. A model going from 30% to 90% per-digit accuracy scores ~0% then suddenly ~60% on exact match — a sharp jump manufactured by the scoring rule, not by the model.
- Re-score the *same checkpoints* with a continuous metric (per-token accuracy, log-likelihood of the correct answer) and the curve is smooth and boring.
- The honest position: the underlying capability improves smoothly and predictably; whether it *looks* emergent depends on where you put the threshold. A few things (in-context learning itself) still look qualitatively new, and that remains genuinely debated.
- Why this is an interview question: it separates people who read the headline from people who read the follow-up.`,
    },
    {
      type: 'intuition',
      title: 'What pretraining does NOT give you',
      md: `A base model is a **text completer**. Nothing more. Load one and ask *"What is the capital of France?"* and a very plausible continuation is:

- *"What is the largest city in Germany? What is the currency of Japan?"* — because on the web, a question is very often followed by more questions. The model is not being unhelpful; it is being accurate about its corpus.
- It does not **follow instructions**. "Summarize this" is just text to continue, not a command to obey.
- It does not **refuse** anything. The corpus contains toxic paragraphs, so it will happily continue one.
- It has no concept of a **turn**, a **user**, or an **assistant**, and no reliable sense of when to stop.
- None of this is a bug in pretraining. Instruction-following was never in the loss function.

The gap between "completes text" and "behaves like an assistant" is closed entirely by **post-training** — supervised fine-tuning on instruction data, then preference optimization (RLHF or DPO). That is the alignment module. Practical consequence today: always check whether a checkpoint is the *base* or the *instruct/chat* variant, and use the model's own chat template. Shipping a base checkpoint as a chatbot is one of the most common junior mistakes.`,
    },
    {
      type: 'intuition',
      title: 'What actually matters for you: choosing a base model',
      md: `You will almost certainly never pretrain from scratch. You will **choose a base model**, and that choice is a real engineering decision with five axes:

1. **License** — Apache-2.0 / MIT versus research-only versus a custom community licence with user thresholds. This blocks ship dates, so check it first, not last.
2. **Size and latency budget** — parameters drive VRAM *and* tokens/sec. A 7B fits comfortably on one 24GB card quantized; a 70B does not. Decide the latency you owe the user, then pick the size that fits it.
3. **Context length** — and whether it is *real*. A claimed 128k that degrades badly past 32k on a needle-in-a-haystack test is a 32k model with marketing.
4. **Tokenizer and language fit** — a tokenizer trained mostly on English burns 3–4× more tokens on Hindi or Tamil. That is 3–4× the cost per request *and* an effective context window 3–4× smaller. For a non-English product this can outrank every other axis.
5. **How it was post-trained** — base vs instruct vs reasoning-tuned, what the chat template is, what refusal behaviour was baked in, and whether the licence permits using its outputs to train other models.`,
    },
    {
      type: 'note',
      md: 'The cost note, said plainly so you draw the right conclusion. A serious pretraining run is **millions of dollars**, a team of twenty-plus, and months of babysitting crashed jobs, loss spikes and hardware failures. The 70B row in the code above is about **$1M of GPU rental** — and that assumes perfect utilization and zero failed restarts, which has never happened to anyone. Your leverage is not here. It is in **fine-tuning** a good open base model (LoRA, next module) and in **retrieval** (RAG, Level 3), both of which cost hundreds of dollars, not millions, and both of which move the metrics your product is actually judged on.',
    },
  ],
  quiz: [
    {
      question: 'Why does a model trained only to predict the next token end up knowing facts and writing working code?',
      options: [
        {
          text: 'Facts and code are separate auxiliary objectives added alongside next-token prediction',
          explanation: 'There is exactly one objective in pretraining. No auxiliary heads for facts or code exist.',
        },
        {
          text: 'Those capabilities are instrumentally useful for lowering next-token loss on a corpus that contains facts and code',
          explanation: 'Correct. Predicting "Paris" needs a fact; predicting a return statement needs code semantics. The cheapest way to lower one number across all of human text is to model the world the text describes.',
        },
        {
          text: 'The corpus is annotated with topic tags that teach the model what domain it is in',
          explanation: 'Pretraining data is unlabeled — that is precisely why trillions of tokens are affordable. No tags are involved.',
        },
      ],
      correct: 1,
    },
    {
      question: 'In C ≈ 6ND, where does the 6 come from?',
      options: [
        { text: 'Six layers per transformer block', explanation: 'Layer count is part of N, not a separate factor. The 6 is per parameter, whatever the depth.' },
        {
          text: '2 FLOPs per parameter per token in the forward pass, plus 2 more for the optimizer step',
          explanation: 'The optimizer step is per parameter per STEP, not per token, and it is negligible here. The missing 4 come from the backward pass.',
        },
        {
          text: '2 FLOPs forward (one multiply, one add) plus 4 backward (gradients w.r.t. inputs and w.r.t. weights) per parameter per token',
          explanation: 'Correct. The backward pass is roughly twice the forward pass because it computes two sets of gradients. 2 + 4 = 6.',
        },
      ],
      correct: 2,
    },
    {
      question: 'What is the compute-optimal token count for a 3B-parameter model?',
      options: [
        { text: 'About 60B tokens — 20 tokens per parameter', explanation: 'Correct. 20 × 3e9 = 6e10. And C = 6 × 3e9 × 6e10 ≈ 1.08e21 FLOPs.' },
        { text: 'About 3B tokens — one token per parameter', explanation: 'That is roughly the GPT-3 era ratio (1.7), which Chinchilla showed to be badly under-trained.' },
        { text: 'About 600B tokens — 200 tokens per parameter', explanation: 'That is 10× past compute-optimal. Defensible for a model you will serve heavily, but it is not the compute-optimal answer.' },
      ],
      correct: 0,
    },
    {
      question: 'GPT-3 was 175B parameters trained on 300B tokens. What does Chinchilla say about that run?',
      options: [
        { text: 'It was compute-optimal for its budget', explanation: 'At 1.7 tokens per parameter it was more than 10× short of the 20:1 ratio.' },
        { text: 'The model should have been even larger', explanation: 'That was the pre-2022 instinct, and it is the one Chinchilla overturned.' },
        {
          text: 'It was under-trained: at the same compute, a much smaller model on far more tokens reaches lower loss',
          explanation: 'Correct. The receipt is Chinchilla itself — 70B on 1.4T tokens beat Gopher 280B on 300B tokens at equal compute.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Llama-3 8B was trained on 15T tokens — about 1875 tokens per parameter, roughly 94× past compute-optimal. Why is that a good decision rather than a mistake?',
      options: [
        { text: 'The Chinchilla result was later shown to be wrong', explanation: 'It was not. Chinchilla is still the right answer to the question it asks — cheapest path to a given loss, training only.' },
        {
          text: 'Compute-optimal minimizes TRAINING cost; for a model served billions of times, inference dominates lifetime cost, so you over-train a smaller model',
          explanation: 'Correct. Inference cost scales with N, not D. Pay once at training to make every future request cheaper and to fit smaller GPUs.',
        },
        { text: 'Extra tokens are essentially free once the cluster is already rented', explanation: 'Tokens cost compute linearly — C = 6ND. 94× the tokens is a very large, deliberate bill.' },
      ],
      correct: 1,
    },
    {
      question: 'Loss falls as a power law in compute. What does that imply practically?',
      options: [
        {
          text: 'Each further constant improvement in loss costs a constant MULTIPLE more compute',
          explanation: 'Correct. Straight line on log-log axes. With α ≈ 0.076, halving the reducible loss needs about 9,000× the parameters.',
        },
        { text: 'Loss falls linearly with dollars spent', explanation: 'Linear on log-log is very much not linear on linear axes — that is the whole point.' },
        { text: 'Loss reaches zero at a finite, computable compute budget', explanation: 'There is an irreducible term — the entropy of language itself. The curve approaches a floor, never zero.' },
      ],
      correct: 0,
    },
    {
      question: 'What is the strongest published counter-argument to "emergent abilities"?',
      options: [
        { text: 'The benchmarks were contaminated by training-set leakage', explanation: 'Contamination is a real and separate problem, but it is not the emergence critique.' },
        { text: 'The small models in those studies were under-trained relative to Chinchilla', explanation: 'True of many older runs, and it muddies comparisons — but it is not the metric argument that the critique rests on.' },
        {
          text: 'Discontinuous metrics such as exact match manufacture sharp jumps; re-scoring the same checkpoints with continuous metrics shows smooth improvement',
          explanation: 'Correct — Schaeffer et al. Per-digit accuracy rising steadily produces a near-zero-then-sudden exact-match curve purely as a scoring artifact.',
        },
      ],
      correct: 2,
    },
    {
      question: 'You load a raw base checkpoint (no post-training) and prompt it with "What is the capital of France?". What is the most likely output?',
      options: [
        { text: 'A refusal, because it has no safety training', explanation: 'Refusal is a learned behaviour from post-training. A base model has no notion of refusing.' },
        {
          text: 'A plausible continuation of that text — often more questions, as on an FAQ page — rather than a direct answer',
          explanation: 'Correct. A base model completes text; it does not answer. Instruction-following was never in the pretraining loss.',
        },
        { text: 'Nothing — base models cannot generate until they are fine-tuned', explanation: 'They generate perfectly well. They just generate continuations, not answers.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain scaling laws, and tell me what they are actually FOR.',
      answer:
        'Empirically, loss falls as a power law in model size, dataset size and compute — a straight line on log-log axes over seven-plus orders of magnitude, approaching an irreducible floor set by the entropy of language. The form is L ≈ L_inf + (N_c/N)^alpha with alpha around 0.076 for parameters. The philosophical reading ("scale works") is the boring half. The useful half is forecasting: you fit the curve on a dozen cheap small runs and extrapolate, so you know approximately what a 100-million-dollar run will score before you authorize it. That is how a lab de-risks a capital expenditure it cannot iterate on. The second implication is sobering: a power law means each constant improvement costs a constant multiple more — with alpha = 0.076, halving the reducible loss needs about 9,000x the parameters. Progress is smooth AND exponentially expensive at the same time.',
      isCaseBased: false,
    },
    {
      question: 'Derive C ≈ 6ND and then use it: how long does a 7B model on 140B tokens take on 256 H100s?',
      answer:
        'Derivation: in the forward pass every parameter participates in one multiply and one add per token, so 2 FLOPs per parameter per token. The backward pass computes gradients with respect to both the layer inputs and the weights — two passes of the same shape — so roughly 4 more. Total 6, giving C = 6ND. It ignores the attention n-squared term (minor until context is long) and embeddings, so it is good to about 20%. Now the numbers: C = 6 × 7e9 × 1.4e11 = 5.88e21 FLOPs. An H100 peaks at 989 TFLOP/s bf16, and a well-tuned run sustains 35-50% MFU, so call it 400 TFLOP/s effective. 5.88e21 / 4e14 = about 1.47e7 GPU-seconds = about 4,100 GPU-hours. Across 256 GPUs that is roughly 16 hours of wall clock, and at 2.50 dollars per GPU-hour about 10,000 dollars. The line that scores points is quoting MFU rather than spec-sheet peak — that distinction is what separates people who have run training jobs from people who have read about them.',
      isCaseBased: false,
    },
    {
      question: 'What exactly did the Chinchilla paper change, and what was wrong with the earlier scaling-law fits?',
      answer:
        'Before Chinchilla the consensus (from the Kaplan fits) was that model size mattered far more than data, so labs scaled parameters aggressively: GPT-3 was 175B on 300B tokens, 1.7 tokens per parameter. Chinchilla redid the compute sweep with a crucial methodological fix — matching the learning-rate schedule to each run\'s token budget, rather than using one schedule tuned for a longer run, which had systematically handicapped the long-data runs in the earlier fits. With that fixed, N and D come out scaling roughly equally: about 20 tokens per parameter at compute-optimal. The empirical receipt is Chinchilla 70B on 1.4T tokens outperforming Gopher 280B on 300B tokens at the same compute — a 4x smaller model winning. The practical inversion is the takeaway: at a fixed compute budget, prefer a smaller model on more data, because compute is the constrained resource, not parameters.',
      isCaseBased: false,
    },
    {
      question: 'Case: leadership hands you 200,000 dollars of GPU budget and asks for a from-scratch model for an internal code assistant. Walk me through it.',
      answer:
        'First do the arithmetic out loud, because it is the argument. At 2.50 dollars per GPU-hour and 40% MFU on H100s, 200k dollars buys about 80,000 GPU-hours, roughly 1.1e23 FLOPs. Chinchilla-optimal for that is N = sqrt(C/120) ≈ 30B parameters on 600B tokens — and a from-scratch 30B trained on 600B tokens of whatever data we can assemble in a quarter will be far worse than an off-the-shelf 8B that saw 15T curated tokens. Also missing from that estimate: the data pipeline (crawl, dedup, filter, mix), the eval harness, failed restarts, and the fact that we have no post-training. So the recommendation is: do not pretrain. Instead spend perhaps 5k on LoRA fine-tuning a strong open code base model on our internal repos, 20k on building the retrieval layer over our codebase and docs, and hold the rest for evaluation and serving. If leadership insists on a from-scratch artifact, the honest counter-offer is continued pretraining — take an existing base checkpoint and train it further on 50-100B tokens of our own domain data, which captures most of the domain benefit for a small fraction of the budget. Naming the thing you would NOT build is the answer they are testing for.',
      isCaseBased: true,
    },
    {
      question: 'Case: your company will serve one model at 50M requests per day for three years. Do you train Chinchilla-optimal or deliberately over-train a smaller model?',
      answer:
        'Over-train the smaller model, and the argument is total cost of ownership rather than training cost. Chinchilla minimizes the compute to reach a given loss once. Here the model is trained once and run about 5.5e10 times over three years, so inference FLOPs dwarf training FLOPs by orders of magnitude. Inference cost scales with N and not with D, so every parameter you remove pays back on every request forever — and a smaller model also fits on cheaper GPUs, needs a smaller KV cache, and hits lower latency, which affects conversion, not just cost. Concretely: instead of the compute-optimal 30B on 600B tokens, train an 8B on 5-10T tokens. You pay several times more to train and you recover it in weeks of serving. Llama-3 8B at 1875 tokens per parameter is exactly this decision made in public. The caveats worth naming: returns from over-training do saturate, so past some multiple of optimal you are buying very little loss; and if quality at the top end is the product, a larger model can still be the right call with distillation or quantization as the serving mitigation.',
      isCaseBased: true,
    },
    {
      question: 'Why does deduplication of pretraining data matter more than people expect?',
      answer:
        'Three separate reasons, and interviewers want at least two. First, generalization: duplicated passages shift the model toward memorizing exact strings instead of learning the distribution, and duplication is heavily skewed — boilerplate, licences and scraped-and-rescraped articles appear thousands of times. Second, evaluation integrity: if benchmark text appears in the corpus, every score you report is contaminated, and near-duplicate leakage is much harder to catch than exact leakage. Third, extraction and privacy risk: text seen many times is far more likely to be regurgitated verbatim, which is the mechanism behind training-data-extraction attacks and the memorized-PII problem. The tooling is MinHash or SimHash with LSH over shingles for near-duplicates, at document and sometimes paragraph granularity. And the wider point it connects to: the modern consensus is that data quality and dedup beat raw volume — hard-filtered corpora match much larger dirty ones at equal compute.',
      isCaseBased: false,
    },
    {
      question: 'Are emergent abilities real? Give me both sides.',
      answer:
        'The claim is that some capabilities — 3-digit arithmetic, word unscrambling, multi-step reasoning — stay at chance across many model scales and then jump sharply past a threshold, which would mean capability is not smoothly predictable from scaling laws. The serious rebuttal is Schaeffer et al., "Are Emergent Abilities a Mirage?": the sharpness often comes from the METRIC. Exact match on a multi-digit answer is all-or-nothing, so a model whose per-digit accuracy climbs steadily from 30% to 90% scores near zero and then suddenly well — the discontinuity is manufactured by the scoring rule. Re-score the same checkpoints with per-token accuracy or the log-likelihood of the correct answer and the curves are smooth. My position: the underlying capability improves smoothly and largely predictably, and most published emergence claims are metric artifacts; but a few things, in-context learning most of all, still look qualitatively new rather than merely better, and that remains genuinely open. The reason to know both sides is that it demonstrates you read the follow-up paper, not just the headline.',
      isCaseBased: false,
    },
    {
      question: 'Why can you not ship a base model as a chatbot? Be specific about what is missing.',
      answer:
        'A base model is a text completer optimized for one thing: the likelihood of the next token given a web-scale corpus. Prompt it with "What is the capital of France?" and a high-likelihood continuation is more questions, because on the web questions cluster on FAQ pages. Four concrete gaps. It does not follow instructions — "summarize this" is text to continue, not a command. It has no refusal behaviour — the corpus contains harmful text so it will continue harmful text. It has no notion of turns, of a user, or of an assistant persona, and no reliable stopping behaviour. And it has no calibrated helpfulness — it will confidently continue in whatever register the prompt establishes. All four are fixed by post-training: supervised fine-tuning on instruction and dialogue data teaches the format, then preference optimization (RLHF or DPO) tunes helpfulness and refusal. Practically this means always checking whether a Hugging Face checkpoint is the base or the instruct variant, and using the exact chat template that model was tuned with — a mismatched template quietly costs a large amount of quality.',
      isCaseBased: false,
    },
    {
      question: 'Case: you are picking a base model for a Hindi-language customer-support product. Rank what you check and why.',
      answer:
        'Tokenizer and language fit comes first here, which is unusual and is the point of the question. A tokenizer trained mostly on English can burn 3-4x more tokens per Devanagari sentence, which triples the cost per request AND shrinks the effective context window by the same factor — a claimed 32k context becomes an effective 8-10k of Hindi. Measure it directly: run a few thousand real support transcripts through each candidate tokenizer and compare tokens per message. Second, whether the pretraining mix actually contained meaningful Hindi, which you test with perplexity on held-out in-domain text rather than trusting the model card. Third, licence, because a support product is commercial and a research-only or user-threshold licence blocks the ship date. Fourth, size against the latency budget — support chat needs fast first-token latency, so an 8B served with a good runtime usually beats a 70B that is technically smarter. Fifth, post-training state: an instruct variant with a documented chat template, and refusal behaviour that will not fire on ordinary billing complaints. Then plan a LoRA fine-tune on real transcripts and a retrieval layer over the help-centre docs — those two move the metrics far more than swapping the base model again.',
      isCaseBased: true,
    },
    {
      question: 'Someone dismisses LLMs as "just autocomplete". Respond.',
      answer:
        'Agree with the premise and reject the conclusion. Yes, the objective is literally next-token prediction, and yes, that is autocomplete. But the objective describes the training signal, not the mechanism the model must build to satisfy it. To predict the next token well across ALL of human text you have to get facts right, track coreference, respect code semantics, do arithmetic, hold meter and rhyme, and follow multi-step arguments — because each of those is instrumentally useful for lowering that one number, and on a broad enough corpus there is no cheaper shortcut than actually modelling the structure the text describes. The compression framing makes it sharp: lowest achievable loss equals best compression of the corpus, and compressing text well requires modelling what generated it. Then close honestly, because the honesty is what makes the argument credible: the objective gives you no instruction-following, no refusals, no calibration and no grounding in truth beyond what correlates with likely text — which is exactly why post-training and retrieval exist as separate stages.',
      isCaseBased: false,
    },
    {
      question: 'How would you decide the data mixing weights for a pretraining run?',
      answer:
        'Weights are a hyperparameter, so treat them like one: fit them at small scale and transfer. The procedure is to train a family of small models (a few hundred million parameters, a few billion tokens) under different mixes and compare on a downstream eval suite rather than on overall loss, because overall loss is dominated by whichever source is largest and rewards the wrong thing. Known priors worth stating: code is upsampled well beyond its natural web share because it appears to improve general reasoning and structured output; high-quality small sources such as Wikipedia, textbooks and curated math are repeated several epochs while bulk web is seen once or twice; and repeating a small high-quality source up to about four epochs is roughly as good as fresh tokens, after which returns fall off sharply. Multilingual share is a product decision, not a loss decision — it buys you capability the English evals will not show. Also worth naming: mixes are often annealed, with the highest-quality data concentrated in the final phase of training, which measurably helps. And the meta-point — this is the highest-leverage knob a small team actually controls, since nobody is out-spending the frontier labs on compute.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'The pretraining objective, and why it teaches everything', back: 'Next-token prediction: minimize -1/T Σ log p(x_t | x_<t), no labels needed. Facts, grammar, arithmetic and code semantics are all instrumentally useful for lowering that one number — not goals, just the cheapest path to it.' },
    { front: 'Data pipeline, five stages', back: 'Crawl → dedup (MinHash/LSH) → quality filter → mix weights across sources → tokenize into one flat token stream. Quality and dedup beat raw volume.' },
    { front: 'Scaling law form', back: 'L ≈ L_inf + (N_c/N)^α — a straight line on log-log axes over 7+ orders of magnitude, approaching an irreducible floor (the entropy of language).' },
    { front: 'What a power law costs you', back: 'Each constant improvement costs a constant MULTIPLE more. With α ≈ 0.076, halving the reducible loss needs about 9,000× the parameters.' },
    { front: 'C ≈ 6ND', back: '6 FLOPs per parameter per token: 2 forward (multiply + add), 4 backward (grad w.r.t. inputs and weights). Ignores attention n² and embeddings; good to ~20%.' },
    { front: 'Chinchilla rule + the 7B arithmetic', back: '~20 tokens per parameter at compute-optimal. 7B → 140B tokens, C = 5.88e21 FLOPs ≈ 4,100 H100-hours ≈ $10k. At fixed C: N* = sqrt(C/120), D* = 20N*.' },
    { front: 'Why modern models over-train', back: 'Chinchilla minimizes TRAINING compute. Inference cost scales with N and is paid billions of times, so you train a smaller model far past optimal. Llama-3 8B: 15T tokens, D/N = 1875.' },
    { front: 'Emergent abilities — the honest version', back: 'Sharp jumps are largely artifacts of discontinuous metrics (exact match). Continuous metrics on the same checkpoints show smooth improvement. In-context learning is the debated exception.' },
    { front: 'What a base model is NOT', back: 'A text completer. No instruction-following, no refusals, no turns, no assistant persona. Post-training (SFT → RLHF/DPO) closes that gap.' },
    { front: 'Picking a base model — five axes', back: 'Licence, size vs latency budget, real (not claimed) context length, tokenizer/language fit (English tokenizers burn 3–4× on Hindi), and how it was post-trained.' },
  ],
  mindmapMarkdown: `- Pretraining & Scaling Laws
  - The objective
    - next-token prediction, one loss
    - self-labeled: x_t labels x_<t
    - perplexity = exp(loss)
    - forced to learn facts, code, arithmetic, meter
    - all instrumentally useful, none a goal
  - Data pipeline
    - crawl (Common Crawl, strip boilerplate)
    - dedup: MinHash/LSH near-duplicates
    - quality filter + PII/toxicity
    - mixing weights: web / code / books / math
    - tokenize into one flat stream
    - quality + dedup > raw volume
  - Scaling laws
    - power law in N, D, C
    - straight line on log-log, 7+ orders
    - irreducible floor L_inf
    - alpha ~ 0.076
    - halving reducible loss ~ 9000x params
    - real use: forecast the big run cheaply
  - C = 6ND
    - 2 FLOPs forward per param per token
    - 4 FLOPs backward
    - ignores attention n^2, embeddings
    - divide by MFU (35-50%), not peak
  - Chinchilla
    - GPT-3: 175B / 300B = 1.7 tok/param
    - fix: LR schedule matched to token budget
    - optimal ~20 tokens per parameter
    - 70B on 1.4T beat Gopher 280B on 300B
    - N* = sqrt(C/120), D* = 20N*
    - 7B -> 140B tokens -> 5.88e21 FLOPs
  - Over-training on purpose
    - inference cost scales with N, not D
    - trained once, served billions of times
    - Llama-3 8B: 15T tokens, D/N = 1875
    - Chinchilla = training-optimal, not TCO-optimal
  - Emergent abilities
    - claim: abrupt jumps past a scale threshold
    - counter: discontinuous metrics manufacture jumps
    - continuous metrics -> smooth curves
    - in-context learning still debated
  - What pretraining does NOT give
    - base model completes text, does not answer
    - no instruction-following
    - no refusals, no turns, no persona
    - gap closed by post-training (SFT -> RLHF/DPO)
    - always check base vs instruct + chat template
  - Choosing a base model
    - licence blocks ship dates
    - size vs latency/VRAM budget
    - context length: real vs claimed
    - tokenizer fit: 3-4x tokens on Hindi
    - post-training state
  - Cost reality
    - 70B compute-optimal ~ $1M GPU rental
    - millions of dollars, 20+ people, months
    - your leverage: fine-tuning + RAG`,
}

export default m
