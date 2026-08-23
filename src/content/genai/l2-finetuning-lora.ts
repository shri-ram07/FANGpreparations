import type { Module } from '../types'

const m: Module = {
  id: 'genai-l2-finetuning-lora',
  subjectId: 'genai',
  level: 2,
  title: 'Fine-Tuning and LoRA',
  whyItMatters:
    'Full fine-tuning a 7B model needs 112 GB. LoRA at rank 8 trains 0.195% of the parameters and fits on a single consumer card — and the accuracy difference is usually within noise.',
  assumes: [
    'You have read *Pretraining*, so you know where training memory goes',
    'You have read *Matrices as Transformations*, so you know what rank means',
  ],
  estMinutes: 18,
  sections: [
    {
      type: 'intuition',
      title: 'The observation LoRA is built on',
      md: `Full fine-tuning updates every weight, which means storing gradients and two Adam moments for all of them — the same 16 bytes per parameter that made pretraining expensive.

The observation that changes this: the **update** a fine-tune applies is empirically close to **low rank**. Adapting a model to a new task moves the weights in a small number of directions, not in all of them.

So instead of learning a full d×d update ΔW, learn **B·A** where A is d×r and B is r×d with r small. The base weights stay frozen, only A and B are trained, and at inference the product can be folded back into W so there is **no added latency at all**.`,
    },
    {
      type: 'math',
      intro:
        'The LoRA reparameterisation. A is initialised randomly and B at zero, so BA starts at exactly zero and the model begins as the unmodified base — no warmup shock. α/r is a scaling factor that keeps the effective learning rate roughly constant when you change r.',
      latex: [
        'W\' = W + \\frac{\\alpha}{r} B A, \\qquad A \\in \\mathbb{R}^{r \\times d},\\; B \\in \\mathbb{R}^{d \\times r},\\; r \\ll d',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'How few parameters that actually is',
      code: `d, L = 4096, 32
full = 4 * d * d * L                       # W_q, W_k, W_v, W_o in every layer

print('full fine-tune of the attention matrices: %s params' % f'{full:,}')
print(' rank   LoRA params (q and v only)   fraction')
for r in [1, 4, 8, 16, 64, 256]:
    lora = 2 * (2 * d * r) * L             # two matrices, each an A and a B
    print(' %4d   %-24s  %.4f%%' % (r, f'{lora:,}', 100 * lora / full))

# ---- real output ----
# full fine-tune of the attention matrices: 2,147,483,648 params
#  rank   LoRA params (q and v only)   fraction
#     1   524,288                   0.0244%
#     4   2,097,152                 0.0977%
#     8   4,194,304                 0.1953%
#    16   8,388,608                 0.3906%
#    64   33,554,432                1.5625%
#   256   134,217,728               6.2500%`,
      annotations: {
        6: 'The original paper applied LoRA to the query and value projections only, which is still a common default — adding key and output helps a little and doubles the adapter.',
        7: 'Each adapted matrix contributes 2·d·r parameters: an A of shape r×d and a B of shape d×r.',
        12: 'Rank 8 is 4.19M parameters against 2.15 billion — 0.195%. That is the headline, and it is why an adapter ships as a file of a few megabytes.',
        16: 'Even rank 256 is only 6.25%. The curve is linear in r, so the interesting question is how small r can be before quality drops — and for most tasks the answer is surprisingly small.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The memory that makes it a different activity',
      code: `N = 7e9
lora = 2 * (2 * 4096 * 8) * 32
print('full fine-tune, mixed precision : %.1f GB' % (N * 16 / 1e9))
print('LoRA r=8, frozen bf16 base      : %.1f GB + %s trainable (%.1f MB optimizer state)'
      % (N * 2 / 1e9, f'{lora:,}', lora * 12 / 1e6))
print('QLoRA, 4-bit frozen base        : %.1f GB + the same adapter' % (N * 0.5 / 1e9))

# ---- real output ----
# full fine-tune, mixed precision : 112.0 GB
# LoRA r=8, frozen bf16 base      : 14.0 GB + 4,194,304 trainable (50.3 MB optimizer state)
# QLoRA, 4-bit frozen base        : 3.5 GB + the same adapter`,
      annotations: {
        4: '14 GB rather than 112, because the frozen base needs only its weights — no master copy, no gradients, no Adam state. Those exist for 4.19M parameters instead of 7 billion.',
        5: '50.3 MB of optimizer state. The entire reason LoRA changed who can fine-tune is in that number against the 84 GB it replaces.',
        10: 'QLoRA quantises the frozen base to 4 bits, since it is never updated and only needs to be accurate enough for the forward pass. 3.5 GB puts a 7B fine-tune on a consumer GPU.',
      },
    },
    {
      type: 'note',
      label: 'Why B starts at zero, and what α does',
      md: `**A is initialised randomly and B at zero**, so BA is exactly zero at step 0 and the model starts as the unmodified base. If both were random, training would begin with a shock the model has to recover from before it can learn anything.

**α/r scales the update.** Without it, changing r would change the effective magnitude of the update and force you to retune the learning rate every time. With it, α is the knob and r is capacity — a common setting is α = 2r, and α = 16 with r = 8 is the most-copied configuration in the field.

**Which matrices to adapt** matters more than rank in practice. Query and value only is the original default; adding key and output helps a little; adapting the feed-forward layers too helps more on tasks that need new knowledge rather than new behaviour — which fits the finding that the FFN is where facts live.`,
    },
    {
      type: 'note',
      label: 'When fine-tuning is the wrong answer',
      md: `Fine-tuning teaches **behaviour** — format, tone, a task structure, a domain\'s idiom. It is poor at teaching **facts**, which need to be reinforced many times to stick and will still be recalled unreliably.

So the decision rule is: if the model needs to *know* something, retrieve it. If the model needs to *behave* differently, fine-tune it. A support bot that must cite current policy is a retrieval problem; one that must reply in a specific structured format is a fine-tuning problem.

Two more failure modes worth naming. **Catastrophic forgetting** — heavy fine-tuning on a narrow task degrades general capability, and LoRA is measurably gentler here because the base weights are untouched. And **too little data**: a few hundred well-chosen examples usually beats tens of thousands of mediocre ones, and quality is the binding constraint far more often than quantity.`,
    },
    {
      type: 'note',
      label: 'The serving property that matters most',
      md: `At inference, BA can be **merged into W**, giving a model identical in shape and speed to the base. LoRA therefore adds **zero latency** — unlike adapter layers, the technique it displaced, which insert extra modules into the forward pass.

Kept unmerged, adapters become swappable. One base model in memory plus a directory of few-megabyte adapters serves many customers or tasks from one deployment, switching per request. That is the property that made LoRA an operational default rather than a memory trick — it changes the economics of serving many fine-tunes, not just of producing one.

The main caveat is that **quantised bases cannot be cleanly merged**: with QLoRA the adapter is trained against 4-bit weights, so merging into the dequantised model introduces error. In practice the adapter is kept separate, or the merge is done against the full-precision base and the result re-quantised.`,
    },
  ],
  quiz: [
    {
      question: 'What observation is LoRA built on?',
      options: [
        { text: 'That most weights are near zero', explanation: 'That is pruning\'s premise, not LoRA\'s.' },
        { text: 'That the UPDATE a fine-tune applies is empirically close to low rank — adaptation moves weights in few directions', explanation: 'Correct, so a full d×d update can be approximated by B·A with r ≪ d.' },
        { text: 'That attention matters more than the FFN', explanation: 'LoRA can be applied to either.' },
        { text: 'That fine-tuning needs less precision', explanation: 'That is quantisation, which QLoRA adds separately.' },
      ],
      correct: 1,
    },
    {
      question: 'Rank 8 gave 4,194,304 trainable parameters against 2,147,483,648. What makes that the headline?',
      options: [
        { text: 'It is faster to compute', explanation: 'The forward pass cost is essentially unchanged.' },
        { text: '0.195% of the parameters, so the adapter ships as a file of a few megabytes and the optimizer state is 50 MB rather than 84 GB', explanation: 'Correct — that is what changed who can fine-tune.' },
        { text: 'It improves accuracy', explanation: 'It is usually within noise of full fine-tuning, not better.' },
        { text: 'It removes the need for a base model', explanation: 'The frozen base is still required.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is B initialised to zero?',
      options: [
        { text: 'To save memory', explanation: 'It occupies the same space either way.' },
        { text: 'So BA is exactly zero at step 0 and the model starts as the unmodified base — no shock to recover from', explanation: 'Correct. If both were random, training would begin by undoing a random perturbation.' },
        { text: 'Because A is random', explanation: 'One of them must be zero; which one is a convention.' },
        { text: 'To make the update low rank', explanation: 'The shapes do that regardless of initialisation.' },
      ],
      correct: 1,
    },
    {
      question: 'What does the α/r scaling achieve?',
      options: [
        { text: 'It bounds the update', explanation: 'It scales rather than bounds.' },
        { text: 'It keeps the effective update magnitude roughly constant as r changes, so the learning rate need not be retuned per rank', explanation: 'Correct — α = 16 with r = 8 is the most-copied setting.' },
        { text: 'It normalises the activations', explanation: 'Unrelated to normalisation layers.' },
        { text: 'It prevents catastrophic forgetting', explanation: 'The frozen base does that.' },
      ],
      correct: 1,
    },
    {
      question: 'QLoRA cut the memory to 3.5 GB. What did it change?',
      options: [
        { text: 'It reduced the rank', explanation: 'The adapter is unchanged.' },
        { text: 'It quantises the FROZEN base to 4 bits — it is never updated, so it only needs to be accurate enough for the forward pass', explanation: 'Correct, and that puts a 7B fine-tune on a consumer GPU.' },
        { text: 'It quantises the adapter', explanation: 'The adapter stays in higher precision; it is being trained.' },
        { text: 'It removes the optimizer state', explanation: 'The adapter still has one, at 50 MB.' },
      ],
      correct: 1,
    },
    {
      question: 'When should you retrieve rather than fine-tune?',
      options: [
        { text: 'Whenever the dataset is small', explanation: 'A small dataset can still teach behaviour well.' },
        { text: 'When the model needs to KNOW something — fine-tuning teaches behaviour, and facts stick poorly and recall unreliably', explanation: 'Correct: format and tone are fine-tuning problems; current policy is a retrieval problem.' },
        { text: 'When latency matters', explanation: 'Retrieval adds latency; merged LoRA adds none.' },
        { text: 'When the base model is quantised', explanation: 'Unrelated to the decision.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain LoRA.',
      answer:
        'Instead of updating a d×d weight matrix directly, freeze it and learn a low-rank update B·A, where A is r×d and B is d×r with r much smaller than d. It works because the update a fine-tune applies is empirically close to low rank — adapting a model moves the weights in a small number of directions rather than all of them. The numbers are the argument: at d = 4096 over 32 layers, rank 8 on the query and value projections is 4.19 million trainable parameters against 2.15 billion, so 0.195%, and the optimizer state drops from about 84 GB to 50 MB. At inference BA can be merged back into W, so there is no added latency at all.',
      isCaseBased: false,
    },
    {
      question: 'Why does LoRA save so much memory?',
      answer:
        'Because the memory cost of training is dominated by things that only exist for trainable parameters. Full fine-tuning needs 16 bytes per parameter — bf16 weights, an fp32 master copy, two fp32 Adam moments and bf16 gradients — which is 112 GB for a 7B model. With LoRA the base is frozen, so it needs only its 2 bytes per parameter for the forward pass: 14 GB, with the master copy, gradients and optimizer state existing for 4.19 million parameters instead of 7 billion. QLoRA goes further by quantising the frozen base to 4 bits, since it is never updated and only needs enough precision for the forward pass, bringing it to 3.5 GB.',
      isCaseBased: true,
    },
    {
      question: 'How do you choose the rank?',
      answer:
        'Start at 8 or 16 and only increase if quality is short. The relationship is linear in r — rank 8 is 0.195% of the attention parameters and rank 256 is 6.25% — so raising it is cheap in absolute terms, but higher rank is not reliably better and starts to lose the regularisation benefit of the constraint. Two things matter more than rank in practice: which matrices you adapt, where query and value is the original default and adding the feed-forward layers helps on tasks needing new knowledge rather than new behaviour; and α, where α = 2r is a common heuristic and α = 16 with r = 8 is the most-copied configuration in the field.',
      isCaseBased: true,
    },
    {
      question: 'Why is B initialised to zero and A randomly?',
      answer:
        'So that BA is exactly zero at step 0 and the model begins as the unmodified base. If both were random, training would open with a random perturbation to every adapted matrix that the optimiser has to undo before it can learn anything useful — a shock, on a model that was already good. One of the two has to be zero for that property, and the choice of B is conventional. It also means an untrained adapter is a no-op, which is convenient operationally: you can ship the adapter mechanism before you ship any adaptation.',
      isCaseBased: false,
    },
    {
      question: 'Fine-tune or retrieve?',
      answer:
        'Fine-tune for behaviour, retrieve for knowledge. Fine-tuning is good at format, tone, task structure and a domain\'s idiom — things the model must do. It is poor at facts: they need many repetitions to stick and are still recalled unreliably, and any fact that changes makes the fine-tune stale. So a support bot that must cite current policy is a retrieval problem, and one that must always reply in a specific structured format is a fine-tuning problem. Many real systems need both, and the useful ordering is to try prompting first, then retrieval, then fine-tuning — in increasing order of cost and decreasing order of how easily you can change your mind.',
      isCaseBased: true,
    },
    {
      question: 'What is catastrophic forgetting and does LoRA help?',
      answer:
        'Heavy fine-tuning on a narrow task degrades general capability — the model becomes good at your format and worse at everything else, which shows up as regressions on tasks nobody was testing. LoRA is measurably gentler because the base weights are never touched, so the original capability is structurally preserved and the adapter is a bounded perturbation on top. It is a mitigation rather than immunity: a large enough adapter trained hard enough on narrow data still degrades general performance. The other defences are mixing general instruction data into the fine-tuning set, keeping the learning rate low, and — most importantly — evaluating on general benchmarks as well as the target task.',
      isCaseBased: false,
    },
    {
      question: 'How does LoRA change how you serve models?',
      answer:
        'It makes many fine-tunes cheap to deploy rather than just cheap to produce. Kept unmerged, one base model sits in memory and a directory of few-megabyte adapters is swapped per request, so a hundred customer-specific models cost one model\'s worth of GPU memory plus a few hundred megabytes. Merged, the adapter folds into the weights and the model is identical in shape and speed to the base, so there is no latency penalty at all — unlike the adapter layers LoRA displaced, which inserted modules into the forward pass. The caveat is quantised bases: a QLoRA adapter is trained against 4-bit weights, so merging into the dequantised model introduces error, and the adapter is usually kept separate.',
      isCaseBased: true,
    },
    {
      question: 'How much data do you need to fine-tune?',
      answer:
        'Far less than people expect, and quality is the binding constraint rather than quantity. A few hundred to a few thousand well-chosen examples typically beats tens of thousands of mediocre ones — LIMA made the case with 1,000 curated examples reaching competitive instruction-following. The reason is that fine-tuning is teaching a behaviour the model can already produce, not teaching it new capability, so the examples act as a specification rather than as evidence. So I would spend the effort on curation and on coverage of the cases that actually matter, and I would build the evaluation set before the training set, because with a few hundred examples the difference between a good and a bad fine-tune is not visible from the loss.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'The premise', back: 'The UPDATE a fine-tune applies is empirically low rank. So learn B·A with r ≪ d instead of a full d×d ΔW.' },
    { front: 'The headline number', back: 'd=4096, L=32, rank 8 on q and v: 4,194,304 params against 2,147,483,648 — 0.195%.' },
    { front: 'The memory', back: 'Full: 112 GB. LoRA r=8: 14 GB frozen base + 50.3 MB optimizer state. QLoRA: 3.5 GB.' },
    { front: 'Why B starts at zero', back: 'BA is exactly zero at step 0, so the model starts as the unmodified base — no random perturbation to undo first.' },
    { front: 'What α/r does', back: 'Keeps the update magnitude constant as r changes, so the learning rate need not be retuned. α=16, r=8 is the most-copied setting.' },
    { front: 'Which matrices', back: 'q and v is the original default. Adding the FFN helps on tasks needing new KNOWLEDGE — which fits the finding that facts live in the FFN.' },
    { front: 'Fine-tune vs retrieve', back: 'Fine-tuning teaches BEHAVIOUR (format, tone, structure). Facts stick poorly and recall unreliably — retrieve those.' },
    { front: 'The serving property', back: 'Merged: zero added latency, identical to the base. Unmerged: one base plus a directory of few-MB adapters, swapped per request.' },
  ],
  mindmapMarkdown: `- Fine-tuning and LoRA
  - The premise
    - the UPDATE is empirically low rank
    - learn B*A instead of a full d x d delta
    - freeze the base entirely
  - The numbers
    - d=4096 L=32, rank 8 on q,v: 4,194,304 vs 2,147,483,648
    - 0.195%; even rank 256 is only 6.25%
    - full fine-tune 112 GB
    - LoRA: 14 GB base + 50.3 MB optimizer state
    - QLoRA (4-bit base): 3.5 GB
  - The details
    - B starts at ZERO: BA = 0, no shock at step 0
    - alpha/r keeps update size constant across r
    - alpha=16, r=8 is the copied default
    - which matrices matters more than rank
  - When it is wrong
    - fine-tuning teaches BEHAVIOUR, not facts
    - facts -> retrieve
    - catastrophic forgetting (LoRA is gentler)
    - a few hundred good examples beat tens of thousands
  - Serving
    - merged: zero added latency
    - unmerged: one base, many few-MB adapters
    - quantised bases do not merge cleanly`,
}

export default m
