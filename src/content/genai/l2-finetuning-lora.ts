import type { Module } from '../types'

const m: Module = {
  id: 'genai-l2-finetuning-lora',
  subjectId: 'genai',
  level: 2,
  title: 'Fine-Tuning: Full FT, LoRA & QLoRA',
  whyItMatters:
    'Two questions land in almost every GenAI interview: "compute LoRA\'s parameter savings" and "would you fine-tune or use RAG here?" Both are decided in the first two minutes of a design conversation, and both have crisp numeric answers. This module gives you the arithmetic, the decision ladder, and the one implementation detail (loss masking) that separates people who have actually trained an adapter from people who have read about one.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'First question: should you fine-tune at all?',
      md: `Fine-tuning is the third thing you try, not the first. Climb this ladder and stop at the rung that works.

1. **Prompt engineering.** Free, instant, reversible. A better system prompt plus three few-shot examples fixes more problems than teams expect. You can ship it in an afternoon and undo it in a minute.
2. **RAG (retrieval-augmented generation).** The model does not know your documents, your prices, last week's incident. Retrieve the relevant text and put it in the context window. Facts stay fresh, and every answer can cite a source. (Built end-to-end in the Level 3 RAG module.)
3. **Fine-tuning.** Only when prompt + retrieval still miss — and the thing they miss is *how the model behaves*, not *what it knows*.

Four honest reasons to fine-tune:

- **Format**: you need strict JSON, a fixed report layout, or a specific tag schema on every single call — and prompting gets it right 94% of the time, not 99.9%.
- **Style / domain voice**: legal drafting tone, a radiologist's phrasing, your company's support register.
- **A narrow task done well**: classify these 40 intents, extract these 12 fields. A tuned small model beats a prompted big one here.
- **Distillation**: teach a 7B model to do the one job you currently pay a frontier model for. Same quality on that task, 20× cheaper, and it runs on your own hardware.`,
    },
    {
      type: 'note',
      md: 'Memorise the one-liner, because it is the answer to half the fine-tuning questions you will be asked: **fine-tuning teaches behaviour, RAG supplies knowledge.** Fine-tuning is a bad way to inject facts for three concrete reasons. (1) *Dilution* — a fact appearing in 3 of 50,000 training examples is a whisper against the pretrained weights; the model may learn the shape of your documents without learning their content. (2) *Staleness* — your price list changed on Tuesday; retraining is the only edit, and it costs a training run. (3) *No citations* — a fact baked into weights has no source, so you cannot show a user where it came from, and you cannot tell a hallucination from a memory. RAG loses none of these: swap a document, and the next answer is correct and cited.',
    },
    {
      type: 'intuition',
      title: 'Full fine-tuning: correct, and usually unaffordable',
      md: `Full fine-tuning means what it says: keep training the model on your data, updating **every weight**.

- It works. It is the strongest form of adaptation, and it is what "fine-tuning" meant before 2021.
- The problem is the memory bill, and it is not the weights — it is everything Adam drags along with them.
- Per parameter, in fp32 with Adam: 4 bytes weight + 4 bytes gradient + 4 bytes first moment (m) + 4 bytes second moment (v) = **16 bytes**.
- A 7B model: 7 × 10⁹ × 16 bytes = 112 GB (≈ **104 GiB**), before a single activation is stored. Mixed precision adds an fp32 master copy and makes it worse, not better. (Same optimizer-state arithmetic as the DL "training at scale" module — this is where it bites.)
- That is 2× A100-80GB minimum, with sharding, for a model a hobbyist can *run* on a laptop.
- The quality risk is **catastrophic forgetting**: train hard on 5,000 support tickets and the model gets better at support tickets and measurably worse at arithmetic, code, and following instructions it used to follow. You moved every weight; the general ability lived in those weights.
- And you now own a full 14 GB checkpoint **per customer, per task**. Ten fine-tunes = 140 GB of near-identical weights.`,
    },
    {
      type: 'math',
      intro:
        'The full-FT memory arithmetic, per parameter. This is the number to have ready when an interviewer asks "why can\'t you just fine-tune it?"',
      latex: [
        '\\text{bytes/param (fp32 + Adam)} = \\underbrace{4}_{W} + \\underbrace{4}_{\\nabla W} + \\underbrace{4}_{m} + \\underbrace{4}_{v} = 16',
        '7\\times 10^{9} \\text{ params} \\times 16 \\text{ B} \\approx 112\\,\\text{GB} \\quad (\\text{+ activations, + gradient buffers})',
        '\\text{LoRA: } \\;\\; 16 \\text{ bytes are paid only on the } {<}1\\% \\text{ of params that are trainable; the rest is a read-only fp16 tensor at 2 B/param}',
      ],
    },
    {
      type: 'intuition',
      title: 'LoRA: do not edit the matrix, add a thin one beside it',
      md: `Analogy: you have a 500-page technical manual that is 95% right for your team. You do not reprint it. You clip a 3-page errata sheet to the front, and readers apply the corrections as they read.

- W is the manual: **frozen**, never written to again.
- The errata sheet is the **update**, ΔW — and the bet is that a useful ΔW is *simple*, so it can be stored in far fewer numbers than W itself.
- LoRA makes that concrete: force ΔW to be **low rank**. Write it as a product of two skinny matrices, ΔW = B·A, with A of shape r×d and B of shape d×r, where r is tiny (4, 8, 16, 64).
- The forward pass becomes h = Wx + (α/r)·B(Ax). Same input, same output shape — an extra thin detour alongside the frozen highway.
- Only A and B receive gradients. W has no gradient, no momentum, no Adam state. That is where the memory goes away.
- **Init matters:** A is random (Gaussian), B is **zeros**. So B·A = 0 at step 0 — the fine-tune starts as an exact copy of the base model and can only improve from there. Initialising both randomly would kick the model sideways before it learns anything.
- At the end you have a choice: keep (A, B) as a separate file of a few MB, or **merge** — compute W + (α/r)·B·A once and store the result. Merged, the model has exactly the base architecture and **exactly the base latency**. LoRA is free at inference.`,
    },
    {
      type: 'math',
      intro: 'LoRA in three lines. Note that nothing here changes the shape of anything the rest of the network sees.',
      latex: [
        'h = W_0 x + \\Delta W x = W_0 x + \\frac{\\alpha}{r} B A x, \\qquad W_0 \\in \\mathbb{R}^{d \\times k},\\; A \\in \\mathbb{R}^{r \\times k},\\; B \\in \\mathbb{R}^{d \\times r}',
        '\\text{params}(W_0) = d k \\qquad \\text{params}(A) + \\text{params}(B) = r(d + k) \\;\\;\\xrightarrow{\\;d = k\\;}\\;\\; 2rd',
        'A \\sim \\mathcal{N}(0, \\sigma^2), \\;\\; B = 0 \\;\\Rightarrow\\; \\Delta W = 0 \\text{ at step 0} \\qquad \\text{merge: } W_{\\text{merged}} = W_0 + \\tfrac{\\alpha}{r} BA',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same idea in PEFT — config, parameter count, and the 16 MB artifact',
      code: `from peft import LoraConfig, get_peft_model, TaskType
from transformers import AutoModelForCausalLM, Trainer, TrainingArguments

base = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-2-7b-hf", torch_dtype="bfloat16", device_map="auto")

cfg = LoraConfig(
    r=8,                                    # rank: the capacity of the update
    lora_alpha=16,                          # alpha = 2r, so the scale alpha/r = 2
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM,
)

model = get_peft_model(base, cfg)   # freeze every base weight, inject A and B
model.print_trainable_parameters()
# trainable params: 8,388,608 || all params: 6,746,804,224 || trainable%: 0.1243

trainer = Trainer(
    model=model,
    args=TrainingArguments(
        output_dir="runs/support-lora",
        per_device_train_batch_size=4,
        gradient_accumulation_steps=8,      # effective batch 32
        num_train_epochs=2,
        learning_rate=2e-4,                 # 10-100x a full-FT learning rate
        bf16=True,
        logging_steps=10,
    ),
    train_dataset=sft_dataset,              # tokenized; labels -100 on prompt tokens
    data_collator=collator,
)
trainer.train()

model.save_pretrained("adapter-support-v1")

# adapter-support-v1/
#   adapter_config.json          ~1 KB   r, alpha, target_modules, base model id
#   adapter_model.safetensors   ~16 MB   8,388,608 params x 2 bytes (bf16)
#   README.md`,
      annotations: {
        1: 'PEFT is the Hugging Face library that implements LoRA. LoraConfig describes the adapter, get_peft_model performs the surgery. Nothing on this page was executed — torch and peft are not installed for this course — so the only number claimed is a parameter count, and the annotation on line 18 derives it by hand.',
        5: 'The base is loaded normally and in full; LoRA changes nothing about loading. bf16 because from here it is read-only: no gradients, no optimizer state, 2 bytes per parameter.',
        9: 'alpha/r = 16/8 = 2 is the scale multiplying BA. The alpha = 2r convention keeps that scale constant when you change r — which is the whole reason the formula divides by r.',
        10: 'The four attention projections, named the Llama way. Naming is model-specific: GPT-2 fuses q, k and v into one c_attn. Add gate_proj, up_proj and down_proj to adapt the MLP too — usually worth more than raising r.',
        16: 'This one call sets requires_grad=False on every base weight and inserts an A/B pair beside each targeted Linear. B is zero-initialised, so at this instant the wrapped model is numerically identical to the base.',
        18: 'Derived, not run. Each targeted matrix is 4096x4096, so its adapter pair is r(d_in + d_out) = 8 x (4096 + 4096) = 65,536 parameters. There are 32 layers x 4 targeted projections: 32 x 4 x 65,536 = 8,388,608 trainable. Llama-2-7B is 6,738,415,616 parameters, so "all params" = 6,738,415,616 + 8,388,608 = 6,746,804,224, and 8,388,608 / 6,746,804,224 = 0.1243%. That matches the 0.124% computed for "all 4 attn proj" in the table above.',
        27: '2e-4 is one to two orders of magnitude above a full-FT learning rate, because A and B are freshly initialised modules learning from scratch rather than pretrained weights being nudged.',
        31: 'The dataset must already carry -100 labels on system, user and pad tokens — see the loss-masking block below. PEFT does not do that for you, and nothing will warn you.',
        36: 'Saves ONLY the adapter. The base model is untouched on disk and referenced by name inside adapter_config.json; you reload with PeftModel.from_pretrained(base, "adapter-support-v1").',
        40: '8,388,608 params x 2 bytes = 16,777,216 bytes = exactly 16 MB, against a 13 GB base checkpoint. That ratio, about 1:800, is what makes one adapter per customer a practical product decision rather than a storage problem.',
      },
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'LoRA, drawn: one frozen matrix and two skinny ones',
        notice:
          'Watch the right column. The big box never changes after frame 2 — every number LoRA trains lives in the two small boxes below it.',
        leftLabel: 'forward pass',
        rightLabel: 'parameters',
        frames: [
          {
            note: 'Full fine-tuning. W is trainable, so Adam attaches a gradient and two moment buffers to every one of its 16.8M numbers — 4x the memory of the matrix itself.',
            stack: [{ name: 'x  (4096 x 1)' }, { name: 'h = W x', to: 'W' }],
            heap: [
              { id: 'W', value: 'W  4096 x 4096', label: '16.8M, training' },
              { id: 'OPT', value: 'grad + Adam m, v', label: '3x more', danger: true },
            ],
          },
          {
            note: 'LoRA step 1: freeze W. No gradient, no optimizer state, no fp32 master copy. It is now a read-only tensor.',
            stack: [{ name: 'x  (4096 x 1)' }, { name: 'h = W x', to: 'W' }],
            heap: [{ id: 'W', value: 'W  4096 x 4096', label: 'frozen, 16.8M' }],
          },
          {
            note: 'Step 2: add two skinny matrices beside it. A is 8 x 4096, B is 4096 x 8 — 32,768 numbers each, 65,536 together. B starts at all zeros, so BA = 0 and the model is unchanged.',
            stack: [{ name: 'x  (4096 x 1)' }, { name: 'h = W x', to: 'W' }],
            heap: [
              { id: 'W', value: 'W  4096 x 4096', label: 'frozen, 16.8M' },
              { id: 'A', value: 'A  8 x 4096', label: 'train 32,768' },
              { id: 'B', value: 'B  4096 x 8  = 0', label: 'train 32,768' },
            ],
          },
          {
            note: 'Forward pass. x goes down BOTH paths: through frozen W, and through the thin detour A then B. Note the middle shape — the whole update is squeezed through 8 numbers.',
            stack: [
              { name: 'x  (4096 x 1)' },
              { name: 'W x        (4096 x 1)', to: 'W' },
              { name: 'A x        (8 x 1)', to: 'A' },
              { name: 'B(A x)     (4096 x 1)', to: 'B' },
              { name: 'h = Wx + (a/r) BAx' },
            ],
            heap: [
              { id: 'W', value: 'W  4096 x 4096', label: 'frozen, 16.8M' },
              { id: 'A', value: 'A  8 x 4096', label: 'train 32,768' },
              { id: 'B', value: 'B  4096 x 8', label: 'train 32,768' },
            ],
          },
          {
            note: 'Backward pass. Gradient flows through the whole network but STOPS at W. Only A and B carry grad + Adam state: 0.4% of the parameters, 0.4% of the optimizer memory.',
            stack: [
              { name: 'dL/dh  arrives' },
              { name: 'dL/dW  = not computed', to: 'W', danger: true },
              { name: 'dL/dA, dL/dB', to: 'A' },
            ],
            heap: [
              { id: 'W', value: 'W  4096 x 4096', label: 'frozen, no grad' },
              { id: 'A', value: 'A + grad + m, v', label: 'updated' },
              { id: 'B', value: 'B + grad + m, v', label: 'updated' },
            ],
          },
          {
            note: 'Deployment option 1 - MERGE. Fold the update back in: W = W + (a/r) B A. One matrix again, identical shape, identical FLOPs. Zero extra latency at inference.',
            stack: [{ name: 'x  (4096 x 1)' }, { name: 'h = W x', to: 'W' }],
            heap: [{ id: 'W', value: 'W + (a/r) B A', label: 'merged, 16.8M' }],
          },
          {
            note: 'Deployment option 2 - keep them separate. One frozen W in GPU memory, many tiny adapter pairs swapped per request. That is multi-LoRA serving: dozens of fine-tunes on one card.',
            stack: [
              { name: 'req: legal', to: 'A1' },
              { name: 'req: support', to: 'A2' },
              { name: 'both use', to: 'W' },
            ],
            heap: [
              { id: 'W', value: 'W  4096 x 4096', label: 'shared, frozen' },
              { id: 'A1', value: 'legal  (A, B)', label: '~16 MB' },
              { id: 'A2', value: 'support  (A, B)', label: '~16 MB' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'The arithmetic, done out loud',
      md: `This is the calculation interviewers ask for by name. Do it on one matrix first, then scale it up.

- Take one attention projection in a 7B model: W is **4096 × 4096**.
- Full fine-tuning trains 4096 × 4096 = **16,777,216** parameters. Call it 16.8M.
- LoRA at r = 8 trains A (8 × 4096) plus B (4096 × 8) = 2 × 8 × 4096 = **65,536** parameters.
- Ratio: 65,536 / 16,777,216 = **0.39%** — a **256× reduction**. (And the shortcut: the ratio is 2r/d = 16/4096 = 1/256. You can say it without a calculator.)
- Scale to the model. 32 layers × 4 attention projections × 65,536 = **8.4M** trainable against 6.7B total = **0.12%**.
- Target every linear layer instead (attention + the three MLP matrices) and it is 20.0M = **0.30%**. Still well under 1% — that is the headline number: *LoRA trains under 1% of the parameters*.
- The checkpoint you ship is those 8.4M numbers: **~16 MB in fp16**, versus a 13 GB full checkpoint.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Full FT vs LoRA vs QLoRA — parameters and memory, computed',
      code: `GB = 1024 ** 3

def lora_matrix(d_in, d_out, r):
    return r * (d_in + d_out)          # A is r x d_in, B is d_out x r

# ---------- 1. ONE weight matrix ----------
d, r = 4096, 8
full_mat = d * d
lora_mat = lora_matrix(d, d, r)
print("one 4096x4096 projection")
print(f"  full fine-tune : {full_mat:>12,} params")
print(f"  LoRA r={r}       : {lora_mat:>12,} params  (2*r*d)")
print(f"  trained       : {100*lora_mat/full_mat:>12.2f}%  -> {full_mat/lora_mat:.0f}x fewer")

# ---------- 2. WHOLE 7B model ----------
n_layers, d_model, d_ff, vocab = 32, 4096, 11008, 32000
attn = 4 * d_model * d_model                       # q, k, v, o
ffn = 3 * d_model * d_ff                           # gate, up, down (SwiGLU)
total = n_layers * (attn + ffn) + 2 * vocab * d_model
print(f"\\nLlama-7B-shaped model: {total/1e9:.2f}B params")

targets = {
    "attention q,v only": n_layers * 2 * lora_matrix(d_model, d_model, r),
    "all 4 attn proj":    n_layers * 4 * lora_matrix(d_model, d_model, r),
    "attn + all MLP":     n_layers * (4 * lora_matrix(d_model, d_model, r)
                                      + 3 * lora_matrix(d_model, d_ff, r)),
}
print(f"{'LoRA target (r=8)':<20}{'trainable':>14}{'% of model':>12}")
for name, p in targets.items():
    print(f"{name:<20}{p:>14,}{100*p/total:>11.3f}%")

# ---------- 3. TRAINING MEMORY ----------
def report(name, frozen_bytes_per_param, trainable):
    base = total * frozen_bytes_per_param
    adapt = trainable * 18             # fp16 w + fp32 master + grad + Adam m,v
    print(f"{name:<26}{base/GB:>10.2f}{adapt/GB:>12.2f}{(base+adapt)/GB:>11.2f}")

r8 = targets["all 4 attn proj"]
print(f"\\n{'training memory (GB)':<26}{'base':>10}{'trainable':>12}{'total':>11}")
report("full FT (fp32 + Adam)", 16, 0)     # w 4 + grad 4 + Adam m 4 + v 4
report("full FT (mixed prec)", 18, 0)      # + an fp32 master copy of every weight
report("LoRA  (fp16 base)", 2, r8)
report("QLoRA (4-bit base)", 0.5, r8)

# ---------- real output ----------
# one 4096x4096 projection
#   full fine-tune :   16,777,216 params
#   LoRA r=8       :       65,536 params  (2*r*d)
#   trained       :         0.39%  -> 256x fewer
#
# Llama-7B-shaped model: 6.74B params
# LoRA target (r=8)        trainable  % of model
# attention q,v only       4,194,304      0.062%
# all 4 attn proj          8,388,608      0.124%
# attn + all MLP          19,988,480      0.297%
#
# training memory (GB)            base   trainable      total
# full FT (fp32 + Adam)         100.41        0.00     100.41
# full FT (mixed prec)          112.96        0.00     112.96
# LoRA  (fp16 base)              12.55        0.14      12.69
# QLoRA (4-bit base)              3.14        0.14       3.28`,
      annotations: {
        4: 'The entire parameter formula for LoRA: r*(d_in + d_out). For a square matrix that is 2*r*d — the number you quote in interviews.',
        13: '0.39% and 256x. The shortcut with no calculator: the ratio is 2r/d = 16/4096 = 1/256.',
        17: 'Four square projections per layer: q, k, v, and the output projection o. These are LoRA\'s default targets.',
        18: 'Llama-style SwiGLU MLP has THREE matrices (gate, up, down), not the classic two. Missing this is the usual reason a hand-counted 7B comes out at 6.0B instead of 6.7B.',
        19: 'Embedding + output head, counted separately because they are vocab x d_model, not d_model x d_model.',
        25: 'Targeting every linear layer, not just attention. Costs ~2.4x more trainable params than attention-only and usually buys real quality.',
        35: '18 bytes/param for a trainable parameter under mixed precision: 2 (fp16 weight) + 4 (fp32 master) + 4 (grad) + 8 (Adam m and v).',
        40: 'The killer line: ~104 GiB for a model whose fp32 weights are 27 GB. Optimizer state is three quarters of the bill.',
        42: 'Base weights at 2 bytes/param, and only 8.4M params pay the 18-byte tax. ~104 GiB -> ~12.7 GiB: it fits on one A100.',
        43: '4-bit base = 0.5 bytes/param. 3.3 GB of weights + activations fits a 24 GB consumer card comfortably. That is the whole QLoRA pitch.',
      },
    },
    {
      type: 'note',
      md: 'Read the last block again, because it is the entire economics of open-model fine-tuning. Full FT: **100 GB**, a multi-GPU cluster job. LoRA: **12.7 GB**, one A100. QLoRA: **3.3 GB** of weights, one gaming GPU in a bedroom. Nothing about the model changed between those rows — only which numbers we agreed to keep gradients for.',
    },
    {
      type: 'intuition',
      title: 'The four knobs that actually matter',
      md: `LoRA has a long config file and four settings that move the needle.

- **r (rank)** — the capacity of the update. 8 or 16 for style and format; 32–64 when you are teaching a genuinely new task or have tens of thousands of examples. Bigger r is not automatically better: past the task's real complexity you are just buying overfitting. Start at 16, move only if the eval says so.
- **alpha (α)** — the scaling. The update is multiplied by α/r, so alpha is effectively the adapter's learning-rate multiplier. The common convention is α = 2r (e.g. r=16, α=32). Because of the α/r ratio, changing r alone does not silently rescale your update — that is the point of the division.
- **target_modules** — which matrices get adapters. The original paper used the attention projections (q and v). Default to all four (q, k, v, o); the widely-reproduced finding (QLoRA's ablations) is that **targeting every linear layer, MLP included, is worth more than raising r**. Cheap change, real gain.
- **dropout** — 0.05–0.1 on the adapter, standard regularization on small datasets. Free insurance.

Two more, not LoRA-specific but they decide whether the run works: learning rate around **1e-4 to 3e-4** (10–100× higher than full FT, because you are training a small randomly-initialised module, not nudging pretrained weights), and **1–3 epochs**. Beyond 3 epochs on a small set, LoRA memorises.`,
    },
    {
      type: 'note',
      md: 'Why does something this crude work at all? The bet is the **intrinsic dimension** hypothesis: a pretrained model already contains the circuits for your task, and adapting to a downstream task is a small rotation in a low-dimensional subspace, not a rewrite. You are not teaching the model to write legal English from nothing — you are turning up a dial it already has. The evidence is that r = 8 often matches full fine-tuning on task metrics; if the required update were genuinely full-rank, a rank-8 approximation could not come close. The honest caveat: this holds for *adaptation*. Teaching a genuinely new capability, or a new language the base model never saw, is where LoRA underperforms full FT and continued pretraining wins.',
    },
    {
      type: 'intuition',
      title: 'QLoRA: a 7B fine-tune on the GPU you already own',
      md: `LoRA got the optimizer state out of the way. The frozen base weights are still 13 GB in fp16. QLoRA squashes those too.

- The idea in one line: **quantize the frozen base to 4-bit, train fp16/bf16 LoRA adapters on top of it.** The base is read-only, so lossy compression costs you far less than it would during full training.
- **NF4 (4-bit NormalFloat)** — the quantization format. Its 16 levels are spaced to match a normal distribution, because neural network weights are approximately normal. Information-theoretically better than plain int4 for the same 4 bits.
- **Double quantization** — quantization needs scaling constants per block, and those constants are themselves fp32 numbers taking up space. Quantize them too. Saves ~0.4 bits per parameter — roughly 0.3 GB on a 7B model. Small, free, and a nice detail to name.
- **Paged optimizers** — optimizer state is allocated in pages that can spill to CPU RAM when a long sequence spikes GPU memory. It exists to stop a single unlucky batch from OOM-killing a 12-hour run.
- Forward pass: each 4-bit weight block is **dequantized to bf16 just in time** for its matmul, then discarded. The 4-bit form is what lives in memory; the compute is still bf16.
- **The honest tradeoff:** roughly 30–40% slower per step (dequantization is real work), and a small quality cost — the QLoRA paper's claim is that 4-bit NF4 + LoRA matches 16-bit full fine-tuning on their benchmarks, which is a strong claim; treat "tiny, usually acceptable" as the safe version. You are trading time and a sliver of quality for the ability to run at all.
- Rule of thumb for the decision: if it fits with LoRA in fp16, use LoRA. If it does not, use QLoRA. Nobody picks QLoRA for fun.`,
    },
    {
      type: 'note',
      md: 'LoRA is one member of the **PEFT** (parameter-efficient fine-tuning) family; the others show up as "what else could you do?" follow-ups. **Adapters** (the original, 2019): insert small trainable bottleneck layers *inside* each block — works, but adds real layers, so it adds inference latency and cannot be merged. **Prefix tuning**: prepend trainable vectors to the keys and values at every layer; the model\'s weights are untouched, but you permanently spend part of your context window. **Prompt tuning**: the minimal version — learn a handful of "soft prompt" embeddings prepended to the input only. Fewest parameters of all, weakest at small model sizes, competitive at very large ones. One sentence for why LoRA won: it is the only one that **merges away to zero inference cost**.',
    },
    {
      type: 'intuition',
      title: 'Instruction tuning: turning a text predictor into an assistant',
      md: `A base model is a next-token predictor. Ask it "What is the capital of France?" and a plausible continuation is another exam question — it has seen a lot of quiz papers. Instruction tuning is the supervised stage (SFT) that makes it answer instead of continue.

- The dataset is **triples**: \`instruction\` (what to do), \`input\` (optional data to do it to), \`output\` (the answer you want, written the way you want it).
- Those triples are rendered into a **chat template** with role markers — \`<|system|>\`, \`<|user|>\`, \`<|assistant|>\` — plus an end-of-turn token. Every model family has its own exact template, and **using the wrong one is a top-three cause of a fine-tune that "just does not work"**: the base model has never seen your markers, so it treats them as noise.
- The end-of-turn token is load-bearing: it is what teaches the model to *stop*. Fine-tunes that ramble forever usually forgot to train on it.
- **Quality beats quantity, and it is not close.** The LIMA result: 1,000 carefully curated examples produced a better assistant than tens of thousands of scraped ones. Mediocre examples do not average out — the model learns your sloppiest output as a valid target.
- Practical sizes: **500–2,000** examples for a format or a voice; **5,000–20,000** for a real task with variety; beyond ~50,000 you are usually in "should this be a full fine-tune or a different base model" territory.
- Diversity matters more than volume: 500 examples covering 50 phrasings of the task beats 5,000 that are template-generated from 10.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Loss masking — the detail people get wrong',
      code: `SYSTEM = "You answer with SQL only."

ex = {"instruction": "Write a SQL query.",
      "input": "users older than 30",
      "output": "SELECT * FROM users WHERE age > 30 ;"}

# (text, does the loss count these tokens?)
parts = [
    ("<|system|> " + SYSTEM,                             False),
    ("<|user|> " + ex["instruction"] + " " + ex["input"], False),
    ("<|assistant|>",                                    False),
    (ex["output"] + " <|end|>",                          True),
]

ids, labels = [], []
for text, trainable in parts:                 # a real tokenizer replaces .split()
    toks = text.split()
    ids += toks
    labels += toks if trainable else [None] * len(toks)

print(f"{'i':>3}  {'input token':<14}{'label (loss target)'}")
for i, (t, l) in enumerate(zip(ids, labels)):
    print(f"{i:>3}  {t:<14}{l if l is not None else '-100  (masked)'}")

kept = sum(l is not None for l in labels)
print(f"\\n{kept} of {len(ids)} tokens carry loss "
      f"({100*kept/len(ids):.0f}%) - only the assistant's answer")

# ---------- real output ----------
#   i  input token   label (loss target)
#   0  <|system|>    -100  (masked)
#   1  You           -100  (masked)
#   ...
#  14  30            -100  (masked)
#  15  <|assistant|> -100  (masked)
#  16  SELECT        SELECT
#  17  *             *
#  18  FROM          FROM
#  19  users         users
#  20  WHERE         WHERE
#  21  age           age
#  22  >             >
#  23  30            30
#  24  ;             ;
#  25  <|end|>       <|end|>
#
# 10 of 26 tokens carry loss (38%) - only the assistant's answer`,
      annotations: {
        9: 'The chat template. Role markers are model-specific strings — copy them from the model card, never invent them.',
        12: 'Only this line is True, and note the end-of-turn token inside it: that is what teaches the model to STOP. Everything above is context to condition on, not reproduce.',
        18: 'The model still SEES every token here — masking changes the loss, not the attention. The prompt stays fully visible; it just is not a target.',
        19: 'The whole trick, in one expression: real tokens where the loss should count, -100 (PyTorch cross_entropy\'s ignore_index) everywhere else.',
        27: '38% here. On long-prompt datasets it can be 5%. Forget the mask and 95% of your gradient signal is the model learning to generate its own prompts.',
      },
    },
    {
      type: 'note',
      md: 'Why the mask matters, stated as the interview answer: **without it you are training the model to generate the questions as well as the answers.** The loss is averaged over tokens, so on a dataset with long prompts and short answers the prompt tokens dominate the gradient — the model gets excellent at predicting user messages and mediocre at responding to them. Two related gotchas from the same family: pad tokens must also be masked to -100 (otherwise you train the model to emit padding), and in a multi-turn conversation you mask *every* user turn, not just the first.',
    },
    {
      type: 'intuition',
      title: 'Evaluating a fine-tune, honestly',
      md: `Training loss went down. That tells you almost nothing — it is the one number guaranteed to improve.

- **Hold out a real test set before you start.** Split by *entity*, not by row: same customer or same document in both splits means your test set is a memory test. This is where fine-tune evaluations most often silently break.
- **Always compare against the base model on the same prompts.** Not against your imagination of the base model. A fine-tune that ties the well-prompted base is a fine-tune you should delete — you just added a training pipeline and a checkpoint to maintain for nothing.
- Pick a metric that matches the reason you fine-tuned: exact match / F1 for extraction, JSON-parse rate for format, a pairwise win rate (human or LLM-as-judge) for style. Perplexity is a fine training-time monitor and a bad task metric.
- **Watch for regression.** Run a small general benchmark before and after — a slice of MMLU, a few arithmetic and instruction-following prompts. If your support-ticket model lost 6 points of general ability, that is catastrophic forgetting showing up on the scoreboard. LoRA is *more* resistant than full FT (the base weights are untouched) but not immune, especially at high rank and high epochs.
- Cheap fix when regression appears: lower r, fewer epochs, or mix 5–10% general instruction data back into your training set.
- Then the deployment question: keep adapters separate or merge? **Merge** if it is one fine-tune per deployment — simplest, and quantization-friendly. **Keep separate** if you serve many tenants: vLLM and friends hot-swap LoRA adapters per request against one shared base, so 50 customer fine-tunes cost one model\'s worth of GPU memory plus 50 × ~16 MB.`,
    },
    {
      type: 'note',
      md: 'The whole module compressed for the whiteboard: *prompt first, RAG for knowledge, fine-tune for behaviour. Full FT updates every weight and costs ~16 bytes per parameter — 100 GB for a 7B model — and risks catastrophic forgetting. LoRA freezes W and learns ΔW = BA with rank r: for a 4096×4096 matrix that is 65,536 parameters instead of 16.8M, 0.4%, a 256× reduction, and under 1% of the model overall. Merge it back and inference latency is unchanged. QLoRA quantizes the frozen base to 4-bit NF4 so the whole thing fits on one consumer GPU, at ~35% slower steps. And mask the loss to the assistant tokens.* If you can say that in ninety seconds, you have this module.',
    },
  ],
  quiz: [
    {
      question: 'A support team wants the chatbot to know this week\'s refund policy, which changed yesterday. Fine-tune or RAG?',
      options: [
        {
          text: 'RAG — this is knowledge, and it changes',
          explanation:
            'Correct. Facts that change need a retrievable source: update the document and the next answer is right and citable. A fine-tune would need a retraining run for every policy edit, and the answer could not cite anything.',
        },
        {
          text: 'Fine-tune — the model must internalise company policy',
          explanation:
            'This is the classic wrong answer. A policy appearing in a handful of training examples gets diluted against pretrained weights, goes stale the moment it changes, and produces uncitable claims.',
        },
        {
          text: 'Fine-tune with QLoRA, since it is cheap enough to retrain weekly',
          explanation:
            'Cheap does not make it correct. Even free retraining leaves you with diluted facts and no citations — the failure mode is about how knowledge is stored, not about cost.',
        },
      ],
      correct: 0,
    },
    {
      question: 'For a 4096 × 4096 weight matrix with LoRA rank r = 8, how many parameters are trained?',
      options: [
        { text: '8 × 4096 = 32,768', explanation: 'That is only A. B (4096 × 8) is also trainable, so you have to double it.' },
        {
          text: '2 × 8 × 4096 = 65,536',
          explanation: 'Correct. A is r×d and B is d×r, so r(d+k) = 2rd for a square matrix. That is 0.39% of 16.8M — a 256× reduction.',
        },
        { text: '8 × 8 = 64', explanation: 'r×r is the size of nothing in LoRA — the rank is the shared inner dimension, not a matrix shape.' },
        { text: '16,777,216 / 8 = 2,097,152', explanation: 'Rank is not a divisor of the parameter count. The saving is 2r/d = 1/256, not 1/r.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is B initialised to zeros while A is initialised randomly?',
      options: [
        { text: 'Zeros save memory in the checkpoint', explanation: 'B is dense within a step of training — nothing about zero init is a storage trick.' },
        { text: 'It makes the matrix multiplication faster', explanation: 'The matmul runs at the same cost whatever the values are; this is about the starting point, not speed.' },
        {
          text: 'So B·A = 0 at step 0 — training starts from exactly the base model',
          explanation:
            'Correct. The adapter contributes nothing initially, so the fine-tune begins as an unmodified copy of the pretrained model. Two random matrices would perturb every layer before the model has learned anything.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Where does full fine-tuning\'s ~16 bytes per parameter actually go?',
      options: [
        {
          text: '4 weight + 4 gradient + 4 Adam first moment + 4 Adam second moment',
          explanation:
            'Correct — and note that three quarters of it is training machinery, not the model. That is precisely what LoRA removes: the base pays 2 bytes/param and only the adapters pay the full tax.',
        },
        { text: 'Weights and activations', explanation: 'Activations are real and batch-dependent, but they are on top of this number, not part of it. This 16 is per-parameter, fixed.' },
        { text: 'Weights stored redundantly across GPUs', explanation: 'That is a sharding decision, not the per-parameter arithmetic. The 16 bytes exist on a single GPU too.' },
      ],
      correct: 0,
    },
    {
      question: 'You merged your LoRA adapter into the base weights. What is the inference-time cost of the fine-tune?',
      options: [
        { text: 'Two extra matmuls per layer', explanation: 'That is the UNMERGED cost. Merging computes W + (α/r)BA once, offline, so no extra matmuls survive.' },
        {
          text: 'Zero — the merged matrix has the same shape and FLOPs as the original',
          explanation:
            'Correct, and it is LoRA\'s biggest practical advantage over adapters and prefix tuning, which add layers or consume context permanently. The cost of merging is losing the ability to hot-swap.',
        },
        { text: 'A small memory overhead for storing A and B', explanation: 'After merging, A and B are discarded — the whole point is that a single matrix absorbed them.' },
      ],
      correct: 1,
    },
    {
      question: 'What does NF4 in QLoRA refer to?',
      options: [
        { text: 'A 4-layer normalization scheme applied to the adapters', explanation: 'Nothing in QLoRA adds normalization layers; the adapters are plain LoRA.' },
        { text: 'The 4-bit format used for the LoRA adapters themselves', explanation: 'Backwards — the adapters stay in bf16/fp16. It is the FROZEN base that gets quantized.' },
        {
          text: '4-bit NormalFloat: quantization levels spaced to match a normal distribution, used for the frozen base weights',
          explanation:
            'Correct. Neural network weights are roughly normally distributed, so levels placed at normal quantiles carry more information than uniform int4 at the same bit-width.',
        },
      ],
      correct: 2,
    },
    {
      question: 'You fine-tune on instruction data but forget to mask the prompt tokens from the loss. What is the likely symptom?',
      options: [
        {
          text: 'The model gets good at generating user-style questions and comparatively weak at answering them',
          explanation:
            'Correct. The loss averages over tokens, so on long-prompt/short-answer data the prompt dominates the gradient. You optimised the wrong distribution — and nothing crashes, which is why this bug survives to production.',
        },
        { text: 'Training crashes with a shape mismatch', explanation: 'Labels and inputs have identical shapes with or without masking. It runs perfectly and trains the wrong objective.' },
        { text: 'The loss is exactly zero', explanation: 'More tokens contribute loss without masking, not fewer — the loss is larger, not zero.' },
      ],
      correct: 0,
    },
    {
      question: 'Your fine-tune improves your task metric by 8 points but drops 5 points on a general instruction-following check. What is happening and what is the first lever?',
      options: [
        { text: 'Underfitting — train for more epochs', explanation: 'Backwards. The task metric improved; more epochs would deepen the specialisation and the regression together.' },
        {
          text: 'Catastrophic forgetting — lower r or epochs, or mix general instruction data back in',
          explanation:
            'Correct. Specialising moved the model away from its general behaviour. Less adapter capacity, fewer passes over the data, or a 5–10% replay of general data are the standard fixes, in that order of cheapness.',
        },
        { text: 'A broken evaluation harness — the general benchmark must be misconfigured', explanation: 'Possible in principle, but this is the textbook signature of forgetting. Suspect the model before the ruler when the pattern is this typical.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Compute LoRA\'s parameter savings for a 4096 × 4096 weight matrix at rank 8. Then give me the model-level number.',
      answer:
        'Per matrix: full fine-tuning trains d×k = 4096×4096 = 16,777,216 parameters. LoRA trains A (r×k = 8×4096) plus B (d×r = 4096×8) = r(d+k) = 2×8×4096 = 65,536. That is 0.39%, a 256× reduction — and the shortcut is that the ratio is just 2r/d = 16/4096 = 1/256, so you can say it without arithmetic. Model level: a 7B Llama-shaped model has 32 layers × 4 attention projections; 32 × 4 × 65,536 = 8.4M trainable against ~6.7B total = 0.12%. Extend to every linear layer including the three MLP matrices and it is about 20M = 0.30%. The headline is "under 1% of parameters trained". Finish with the consequence that actually matters: the checkpoint is ~16 MB in fp16 instead of 13 GB, and the optimizer state shrinks by the same factor — which is the real reason it fits on one GPU.',
      isCaseBased: false,
    },
    {
      question: 'Case: a legal-tech company wants a model that answers questions about their clients\' contracts, in their house drafting style, with citations. Fine-tune, RAG, or both? Design it.',
      answer:
        'Both, and the split is the point. Contract CONTENT is knowledge: it is client-specific, changes when a contract is amended, and every answer must cite a clause — that is RAG, non-negotiable. Baking contracts into weights dilutes them, goes stale on the next amendment, and produces uncitable claims, which in legal is a liability, not a quality issue. House drafting STYLE and output STRUCTURE are behaviour: a consistent register, a fixed "issue / clause / risk / recommendation" layout, refusing to answer outside the retrieved context — that is a LoRA fine-tune on a few thousand curated examples written by their lawyers. Build order: (1) RAG plus a careful prompt, measure it; (2) only if the format compliance or the voice is still wrong, fine-tune on the RAG-shaped prompts so the model learns to behave with retrieved context in the window, not without it; (3) evaluate against the prompted-RAG baseline on the same questions — if the fine-tune ties, ship the baseline. One trap to name: never fine-tune on one client\'s contracts if the model serves other clients — that is a data-leakage path from weights, and weights cannot be permission-checked the way a retrieval index can.',
      isCaseBased: true,
    },
    {
      question: 'Why can you not just fine-tune a 7B model on a single 24 GB GPU? Walk me through the memory.',
      answer:
        'Weights are the small part. In fp32 with Adam you pay per parameter: 4 bytes for the weight, 4 for the gradient, 4 for Adam\'s first moment, 4 for the second — 16 bytes, so 7B × 16 ≈ 100–112 GB before a single activation. Mixed precision does not save you: you add an fp32 master copy, so it is ~18 bytes/param. On top sits activation memory, which scales with batch × sequence length × depth. LoRA changes the arithmetic rather than the model: the base is a read-only fp16 tensor at 2 bytes/param (~13 GB) and only the 8M adapter parameters pay the 18-byte tax (~0.14 GB) — total ~12.7 GB, one A100. QLoRA takes the base to 4-bit NF4 at 0.5 bytes/param (~3.3 GB), which is what puts it on a 24 GB consumer card with room for activations and gradient checkpointing. The one-line summary: full FT is expensive because of optimizer state, not weights, and PEFT deletes the optimizer state for 99% of the model.',
      isCaseBased: false,
    },
    {
      question: 'Explain why LoRA works. Why should a rank-8 update be enough?',
      answer:
        'The claim is the intrinsic-dimension hypothesis: a pretrained model already contains the features and circuits your task needs, so adapting to a downstream task is a small rotation within a low-dimensional subspace rather than a rewrite of the weight matrix. If the required ΔW were genuinely full-rank, a rank-8 approximation could not come close to full fine-tuning — and empirically it often matches it on task metrics, which is the evidence. There is a second, softer reason: constraining the update to low rank is a regularizer, so on small datasets LoRA can generalize better than full FT, which has enough freedom to memorize. State the boundary honestly: this holds for adaptation of existing capability. Teaching a genuinely new capability — a language the base model never saw, a new modality, a domain absent from pretraining — is where low rank is a real ceiling and continued pretraining or full FT wins. That boundary is what distinguishes an answer from a recital.',
      isCaseBased: false,
    },
    {
      question: 'What is QLoRA, and what does it cost you compared to plain LoRA?',
      answer:
        'QLoRA quantizes the frozen base model to 4 bits and trains ordinary bf16 LoRA adapters on top of it. Three named pieces: NF4 (4-bit NormalFloat — quantization levels placed at the quantiles of a normal distribution, because weights are roughly normal, so it beats uniform int4 at the same bit-width); double quantization (the per-block scaling constants are themselves quantized, saving roughly 0.4 bits per parameter); and paged optimizers (optimizer state in pageable memory that can spill to CPU RAM, so one long-sequence spike does not OOM-kill a 12-hour run). Mechanically, each 4-bit block is dequantized to bf16 just in time for its matmul and thrown away — the 4-bit form is a storage format, not a compute format. Costs: roughly 30–40% slower per step because dequantization is real work, and a small quality reduction. The paper reports parity with 16-bit full fine-tuning on their benchmarks; the safe way to say it is "a tiny quality cost for a 4× memory reduction on the base". The decision rule: if it fits with fp16 LoRA, use LoRA; QLoRA is what you reach for when it does not.',
      isCaseBased: false,
    },
    {
      question: 'How do you choose r and alpha? What actually changes when you move them?',
      answer:
        'r is the capacity of the update. 8–16 for style, tone, or output format; 32–64 for a genuinely new task or when you have tens of thousands of examples. Larger r is not free — past the task\'s actual complexity you buy overfitting and a bigger checkpoint, not quality. alpha is the scaling: the update enters as (α/r)·BA, so alpha behaves like a learning-rate multiplier on the adapter. The convention α = 2r exists so that the effective scale stays constant as you tune r — which means changing r alone does not silently rescale your update, and that is the entire reason the division by r is in the formula. In practice the more valuable knob is neither: target_modules. The reproduced finding from QLoRA\'s ablations is that adapting every linear layer (attention plus the MLP matrices) buys more than raising r on attention alone, at similar cost. My default: r=16, α=32, all linear layers, dropout 0.05, LR 2e-4, 2 epochs — then change one thing at a time against a held-out set.',
      isCaseBased: false,
    },
    {
      question: 'What does an instruction-tuning dataset look like, and how much of it do you need?',
      answer:
        'Rows are instruction/input/output triples: what to do, optional data to do it to, and the exact output you want — written in the style you want, because the model copies the target verbatim in spirit. Those triples get rendered into the base model\'s chat template with role markers (<|system|>, <|user|>, <|assistant|>) and an end-of-turn token; using the wrong template for that model family is a top-three cause of a fine-tune that mysteriously does not work, and forgetting the end token is why some fine-tunes never stop generating. Sizes: 500–2,000 examples for a format or a voice, 5,000–20,000 for a real task with variety, and past ~50,000 you should be asking whether you want a different base model. The lesson that matters more than any number is LIMA\'s: 1,000 curated examples beat tens of thousands of scraped ones, because mediocre examples do not average out — the model learns your worst output as a valid target. And diversity beats volume: 500 examples covering 50 phrasings beats 5,000 generated from 10 templates.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through loss masking in SFT. Why does it matter and what else gets masked?',
      answer:
        'You build the token sequence for the whole conversation — system, user, assistant — and the model attends over all of it. But the labels are set to -100 (PyTorch cross_entropy\'s ignore_index) everywhere except the assistant\'s tokens, so only those contribute to the loss. Why it matters: cross-entropy averages over contributing tokens, so on a dataset with long prompts and short answers, prompt tokens dominate the gradient. Without the mask you train the model to generate user questions as fluently as answers — it optimises the wrong distribution, nothing crashes, and the metric you notice is "the fine-tune feels off". Also masked: pad tokens, or you teach the model to emit padding; and in multi-turn data, every user turn, not just the first. What is NOT masked is attention — the model still sees the entire prompt; masking changes the target, not the visibility. Practical note: most libraries have a DataCollatorForCompletionOnlyLM or a train_on_responses_only flag; the bug appears when someone hand-rolls the collator.',
      isCaseBased: false,
    },
    {
      question: 'Case: your team fine-tuned a 7B model on 50k support tickets. Task accuracy is up 12 points, but users say it "got dumber" outside support. Diagnose and fix.',
      answer:
        'That is catastrophic forgetting, and the first job is to measure rather than argue. (1) Quantify: run the base and the fine-tune on the same general set — a slice of MMLU, some arithmetic, some instruction-following, some code — and get the regression as a number. (2) Check the obvious training causes in cost order: too many epochs on a narrow distribution, r too high (more capacity means more drift), learning rate too high, and whether this was full FT — if so, switching to LoRA alone helps a lot, since the base weights stay untouched. (3) Fix by mixing 5–10% general instruction data back into the training set (replay) — this is the highest-value change and usually recovers most of the loss. (4) Re-examine the data: 50k tickets is very likely low-diversity and partly low-quality; a curated 5k subset often gives similar task gains with far less drift, which is the LIMA lesson applied. (5) Architecturally, consider not shipping one model: keep the base for general traffic and route support queries to the adapter, which multi-LoRA serving makes nearly free. Tradeoff to state: replay data costs training time and dilutes the task signal slightly; routing costs a classifier and serving complexity. Pick based on how much non-support traffic actually exists.',
      isCaseBased: true,
    },
    {
      question: 'How would you evaluate whether a fine-tune is worth shipping?',
      answer:
        'Four things, in order. (1) A held-out test set created before training and split by entity — same customer or same document appearing in both splits turns your evaluation into a memory test, and this is where fine-tune evals most often silently break. (2) A baseline comparison against the BASE model with a genuinely good prompt, on the identical prompts. If the fine-tune ties, delete it: you added a training pipeline, a checkpoint, and a retraining obligation for nothing. (3) A metric that matches the reason you fine-tuned — exact match or F1 for extraction, JSON-parse rate for format compliance, pairwise win rate (human or LLM-as-judge) for style. Perplexity is a decent training monitor and a poor task metric. (4) A regression check on general ability before and after, so forgetting shows up as a number rather than as a user complaint. Then the non-quality gates: latency and cost versus the prompted baseline, and who retrains it when the data shifts. A fine-tune is an operational commitment, not an artifact.',
      isCaseBased: false,
    },
    {
      question: 'Case: you must serve 50 customer-specific fine-tunes of the same 7B base with a small GPU budget. Design the serving.',
      answer:
        'Do not merge. Fifty merged models are fifty 13 GB checkpoints — 650 GB of nearly identical weights, and you cannot batch across customers. Instead: one frozen base resident in GPU memory plus 50 LoRA adapter pairs at roughly 16 MB each (about 800 MB total, easily held in host RAM and paged in). Serve with a runtime that supports multi-LoRA (vLLM\'s LoRA support, or S-LoRA-style batching): the request carries an adapter id, the base forward pass is shared across the batch, and the small BA detour is computed per-request against its own adapter. The cost is a modest throughput hit versus a single merged model, because the adapter matmuls cannot be fused across different adapters — call it 10–30% depending on batch composition — in exchange for 50 models on one card. Operational wins worth naming: deploying a new customer is uploading a 16 MB file, not a model rollout; rolling one back does not touch the others; and A/B testing two adapters is trivial. When to merge instead: a single high-QPS deployment where that throughput hit costs more than the extra memory, or when you want to quantize the merged model for edge deployment.',
      isCaseBased: true,
    },
    {
      question: 'When is LoRA the wrong choice? Argue for full fine-tuning.',
      answer:
        'Four situations. (1) A new capability rather than an adaptation — a language or script barely present in pretraining, a new modality, a domain whose vocabulary the tokenizer handles badly. Low-rank updates adapt existing circuits; they do not build missing ones. Continued pretraining, possibly with a tokenizer extension, is the honest answer. (2) A very large, high-quality dataset — with hundreds of thousands of good examples, full FT\'s extra capacity is usable rather than an overfitting risk, and the rank constraint becomes a ceiling. (3) A small base model where you have the hardware anyway: full fine-tuning a 1B model is affordable, and the PEFT complexity buys nothing. (4) Extreme latency sensitivity combined with aggressive quantization, where a single merged-and-quantized artifact is simpler than reasoning about how adapters interact with the quantization scheme. Also worth flagging: LoRA plus a rank that is too low can look like "the task is impossible" when it is really "the update is capacity-limited" — always try a higher r before concluding the base model cannot do it.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'The one-line rule', back: 'Fine-tuning teaches BEHAVIOUR (format, style, a narrow task). RAG supplies KNOWLEDGE. Prompt engineering first, always.' },
    { front: 'Why fine-tuning is bad for facts', back: 'Diluted (a few examples vs pretrained weights), stale (edits need a training run), uncitable (no source to show). RAG fixes all three.' },
    { front: 'Full FT memory, per parameter', back: '4 (weight) + 4 (grad) + 4 (Adam m) + 4 (Adam v) = 16 bytes fp32. 7B -> ~100 GB before activations. Mixed precision is ~18 B/param.' },
    { front: 'LoRA in one line', back: 'Freeze W, learn ΔW = B·A with A: r×k and B: d×r. h = Wx + (α/r)·BAx. Only A and B get gradients.' },
    { front: 'LoRA parameter count', back: 'r(d + k), or 2rd if square. 4096×4096 at r=8: 65,536 vs 16.8M = 0.39%, a 256× cut. Ratio shortcut: 2r/d.' },
    { front: 'Why B starts at zero', back: 'BA = 0 at step 0, so training starts as an exact copy of the base model. A is random to break symmetry.' },
    { front: 'LoRA at inference', back: 'Merge W + (α/r)BA -> identical shape, identical latency, zero overhead. Or keep separate for multi-LoRA hot-swapping.' },
    { front: 'LoRA knobs', back: 'r = 8–16 style / 32–64 new task; α = 2r (scaling α/r); target ALL linear layers, not just q,v — worth more than raising r; LR ~2e-4, 1–3 epochs.' },
    { front: 'QLoRA = ?', back: '4-bit NF4 frozen base + bf16 LoRA adapters. Plus double quantization (quantize the scaling constants) and paged optimizers. ~35% slower/step, tiny quality cost, 7B fits a 24 GB card.' },
    { front: 'Loss masking in SFT', back: 'Labels = -100 on system/user/pad tokens; only assistant tokens count. Otherwise the model learns to generate questions. Attention still sees everything.' },
  ],
  mindmapMarkdown: `- Fine-Tuning: Full FT, LoRA & QLoRA
  - Should you fine-tune?
    - 1. prompt engineering (free, instant)
    - 2. RAG (knowledge, fresh, citable)
    - 3. fine-tune (form & behaviour)
    - reasons: format, style, narrow task, distillation
    - rule: FT teaches behaviour, RAG supplies knowledge
    - facts in weights: diluted, stale, uncitable
  - Full fine-tuning
    - update every weight
    - 4+4+4+4 = 16 bytes/param (Adam)
    - 7B -> ~100 GB, multi-GPU
    - catastrophic forgetting
    - one full checkpoint per task
  - LoRA
    - freeze W, learn dW = B.A
    - A is r x k, B is d x r, r << d
    - h = Wx + (alpha/r) BAx
    - B init zero -> starts as base model
    - 4096x4096, r=8: 65,536 vs 16.8M
    - 0.39%, 256x, ratio = 2r/d
    - model level: <1% of params, ~16 MB adapter
    - merge -> zero extra latency
  - Hyperparameters
    - r: 8-16 style, 32-64 new task
    - alpha: scaling alpha/r, convention 2r
    - target modules: all linear > just q,v
    - LR ~2e-4, 1-3 epochs
    - why it works: low intrinsic dimension
  - QLoRA
    - 4-bit frozen base + bf16 adapters
    - NF4 quantization
    - double quantization
    - paged optimizers
    - ~35% slower, tiny quality cost
    - 7B on one consumer GPU
  - PEFT family
    - adapters: bottleneck layers, adds latency
    - prefix tuning: trainable K/V per layer
    - prompt tuning: soft prompt embeddings
  - Instruction tuning
    - instruction / input / output triples
    - chat template + role markers + end token
    - LIMA: 1k great > 100k mediocre
    - sizes: 500-2k format, 5k-20k task
    - mask loss to assistant tokens (-100)
  - Evaluation
    - held-out set, split by entity
    - compare vs prompted BASE model
    - metric matches the reason you tuned
    - regression check for forgetting
  - Serving
    - merge for one deployment
    - multi-LoRA hot-swap for many tenants`,
}

export default m
