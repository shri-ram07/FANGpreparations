import type { Module } from '../types'

const m: Module = {
  id: 'genai-l2-pretraining-scaling',
  subjectId: 'genai',
  level: 2,
  title: 'Pretraining: Data, Memory and Cost',
  whyItMatters:
    'Pretraining is one loss function and an enormous amount of engineering. A 7B model needs 112 GB of memory before any activations, and 187,000 A100-hours — which is why almost every practical decision here is about memory and data rather than modelling.',
  assumes: [
    'You have read *The Transformer Block*',
    'You have read *Scaling Laws*, so you know C ≈ 6ND',
  ],
  estMinutes: 20,
  sections: [
    {
      type: 'intuition',
      title: 'The objective is trivial; everything else is not',
      md: `Pretraining a language model is next-token prediction and nothing else. Take a sequence, shift it by one, and minimise cross-entropy. There is no clever loss, no curriculum, no supervision.

That triviality is the point. It is **self-supervised**, so any text is training data, which is what makes trillion-token corpora possible.

Everything difficult lives elsewhere: what text you use, how you deduplicate it, and how you fit a model that does not remotely fit on one device. This module is those three, and each of them is arithmetic rather than judgement.`,
    },
    {
      type: 'math',
      intro:
        'Two estimates that size a run. The first converts compute into wall-clock: MFU is the fraction of the hardware peak you actually achieve, and it is usually 40-55% for a well-tuned large run. The second is training memory, and the 16 comes from bf16 weights, an fp32 master copy, two fp32 Adam moments and bf16 gradients.',
      latex: [
        't_{\\text{train}} = \\frac{6ND}{P_{\\text{peak}} \\cdot \\text{MFU}}',
        'M_{\\text{train}} \\approx 16N \\text{ bytes} + M_{\\text{activations}}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'What a pretraining run costs',
      code: `for name, N, D in [('GPT-2 small', 124e6, 300e9), ('LLaMA-2 7B', 7e9, 2e12),
                   ('GPT-3', 175e9, 300e9), ('LLaMA-3 8B', 8e9, 15e12)]:
    C = 6 * N * D
    gpu_h = C / (312e12 * 0.40) / 3600          # A100 bf16 peak, 40% utilisation
    print('%-12s C=%.2e   A100-hours %-10s  at $2/h: $%s'
          % (name, C, f'{int(gpu_h):,}', f'{int(gpu_h*2):,}'))

# ---- real output ----
# GPT-2 small  C=2.23e+20   A100-hours 496         at $2/h: $993
# LLaMA-2 7B   C=8.40e+22   A100-hours 186,965     at $2/h: $373,931
# GPT-3        C=3.15e+23   A100-hours 701,121     at $2/h: $1,402,243
# LLaMA-3 8B   C=7.20e+23   A100-hours 1,602,564   at $2/h: $3,205,128`,
      annotations: {
        4: '312 TFLOP/s is an A100\'s bf16 peak, and 40% is a realistic model FLOPs utilisation — you never get peak, and anything above 50% is a well-tuned run.',
        9: 'GPT-2 small is under $1,000 to reproduce. That is worth knowing: the model that was frontier in 2019 is now a weekend project.',
        12: 'LLaMA-3 8B costs more than GPT-3 despite being 22 times smaller, because it was trained on 15 trillion tokens rather than 300 billion. Compute follows 6ND, and D is where the money now goes.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Why a 7B model does not fit on an 80 GB card',
      code: `items = [('bf16 weights', 2), ('fp32 master weights', 4), ('fp32 Adam m', 4),
         ('fp32 Adam v', 4), ('bf16 gradients', 2)]
total = sum(b for _, b in items)
for k, b in items:
    print('  %-22s %d bytes/param' % (k, b))
print('  %-22s %d bytes/param' % ('TOTAL', total))
for N in [7e9, 70e9]:
    print('  %3dB params -> %.1f GB before a single activation' % (N/1e9, N*total/1e9))

# ---- real output ----
#   bf16 weights           2 bytes/param
#   fp32 master weights    4 bytes/param
#   fp32 Adam m            4 bytes/param
#   fp32 Adam v            4 bytes/param
#   bf16 gradients         2 bytes/param
#   TOTAL                  16 bytes/param
#     7B params -> 112.0 GB before a single activation
#    70B params -> 1120.0 GB before a single activation`,
      annotations: {
        1: 'Mixed precision keeps an fp32 master copy of the weights because repeatedly adding tiny bf16 updates to bf16 weights loses them to rounding.',
        16: '16 bytes per parameter — eight times the 2 bytes the weights themselves occupy. Adam\'s two moment buffers alone are four times the model.',
        17: '112 GB for a 7B model, on a card with 80 GB, before any activations. That single number is why distributed training exists rather than being an optimisation.',
        18: 'And 1.12 TB for 70B. ZeRO and FSDP shard exactly these three things — optimizer state, gradients, then parameters — across devices, which is what makes the number tractable.',
      },
    },
    {
      type: 'note',
      label: 'The three ways to split a model',
      md: `**Data parallel** — every device holds a full copy and processes a different batch slice, then gradients are averaged. Simple and the default, and it does nothing about the 112 GB, because every device still holds all of it.

**ZeRO / FSDP** is data parallel with the memory fixed: shard the optimizer state across devices (stage 1), then the gradients (stage 2), then the parameters themselves (stage 3), gathering each shard only when it is needed. Almost all of the memory problem, solved by communication.

**Tensor parallel** splits individual matrices across devices — each holds a slice of every weight matrix. It needs a fast interconnect because every layer requires a synchronisation, so it lives *within* a node.

**Pipeline parallel** puts different layers on different devices. Cheap on communication, but it introduces bubbles where devices wait, mitigated by splitting the batch into micro-batches.

Large runs combine all of them, which is what "3D parallelism" means.`,
    },
    {
      type: 'note',
      label: 'Data quality is the lever nobody sees',
      md: `**Deduplication is not optional.** A document appearing 100 times in the corpus contributes 100 times the gradient of a unique one — the model is being told, by weight of evidence, that this text matters a hundredfold. Deduplicated corpora train to lower loss in fewer steps and memorise far less verbatim, which matters legally as well as technically.

**Filtering beats volume.** The Phi models made the argument sharply: a small model trained on carefully curated "textbook quality" data matches much larger models trained on raw web text. The industry standard pipeline is now quality classification, deduplication at both document and paragraph level, and heavy filtering — Common Crawl is typically reduced by more than 90% before use.

**Contamination is the failure you will not notice.** If a benchmark appears in the training data, its score measures memorisation. It is worth checking for n-gram overlap between the evaluation sets and the corpus, and reporting what you find.

**Mixture matters.** Code in the pretraining mix improves reasoning on non-code tasks — a repeatedly reproduced and still not fully explained result.`,
    },
    {
      type: 'note',
      label: 'What actually goes wrong in a large run',
      md: `**Loss spikes.** The loss jumps by orders of magnitude and either recovers or destroys the run. Standard responses are gradient clipping, skipping the offending batch, and rolling back to a checkpoint with a different data order — which is why checkpointing frequently is not optional at this scale.

**Hardware failures are certain, not possible.** On thousands of GPUs for weeks, something fails. The training system has to checkpoint and resume automatically, and published logs from large runs list hundreds of interruptions.

**Instability grows with scale.** Larger models are more fragile — attention logits growing without bound, activations drifting — which is why qk-layernorm, z-loss and careful residual scaling appear in frontier training recipes and not in tutorials.

**And you cannot fix it later.** A pretraining run is a single decision costing millions; fine-tuning adjusts behaviour but does not repair a bad data mixture.`,
    },
  ],
  quiz: [
    {
      question: 'What is the pretraining objective for a language model?',
      options: [
        { text: 'A carefully designed multi-task loss', explanation: 'It is a single, trivial objective.' },
        { text: 'Next-token prediction with cross-entropy — no supervision, so any text is training data', explanation: 'Correct, and that triviality is what makes trillion-token corpora possible.' },
        { text: 'Masked token prediction', explanation: 'That is BERT-style; autoregressive models predict the next token.' },
        { text: 'Contrastive learning over documents', explanation: 'A different family entirely.' },
      ],
      correct: 1,
    },
    {
      question: 'LLaMA-3 8B cost more compute than GPT-3 despite being 22x smaller. Why?',
      options: [
        { text: 'It used less efficient hardware', explanation: 'The comparison is in FLOPs, before hardware.' },
        { text: '15 trillion tokens against 300 billion — compute is 6ND, and D is where the cost now goes', explanation: 'Correct: 7.20e23 against 3.15e23.' },
        { text: 'It has more layers', explanation: 'Layer count is already inside N.' },
        { text: 'It used a larger vocabulary', explanation: 'A negligible contribution.' },
      ],
      correct: 1,
    },
    {
      question: 'Why does a 7B model need 112 GB to train?',
      options: [
        { text: 'Because of the activations', explanation: 'That is on top of the 112 GB, not part of it.' },
        { text: '16 bytes per parameter: bf16 weights, fp32 master copy, two fp32 Adam buffers, and bf16 gradients', explanation: 'Correct — Adam\'s moments alone are four times the model size.' },
        { text: 'Because of the KV cache', explanation: 'That is an inference cost.' },
        { text: 'Because of the dataset', explanation: 'Data is streamed, not resident.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is an fp32 master copy of the weights kept in mixed-precision training?',
      options: [
        { text: 'To make the forward pass more accurate', explanation: 'The forward pass runs in bf16.' },
        { text: 'Repeatedly adding tiny bf16 updates to bf16 weights loses them to rounding', explanation: 'Correct — the master copy is where the accumulation actually happens.' },
        { text: 'To enable gradient clipping', explanation: 'Clipping works in any precision.' },
        { text: 'For checkpoint compatibility', explanation: 'Checkpoints can store either.' },
      ],
      correct: 1,
    },
    {
      question: 'What does ZeRO / FSDP actually do?',
      options: [
        { text: 'Splits individual weight matrices across devices', explanation: 'That is tensor parallelism.' },
        { text: 'Shards the optimizer state, then gradients, then parameters across data-parallel devices, gathering each only when needed', explanation: 'Correct — it trades communication for memory, and it is what makes the 112 GB tractable.' },
        { text: 'Puts different layers on different devices', explanation: 'That is pipeline parallelism.' },
        { text: 'Compresses the gradients', explanation: 'A different technique.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is deduplication so important?',
      options: [
        { text: 'It saves disk space', explanation: 'True and trivial next to the training effect.' },
        { text: 'A document appearing 100 times contributes 100x the gradient — the model is told by weight of evidence that it matters a hundredfold', explanation: 'Correct, and deduplicated corpora reach lower loss in fewer steps with far less verbatim memorisation.' },
        { text: 'It prevents overfitting to the validation set', explanation: 'That is contamination, a related but separate problem.' },
        { text: 'It speeds up tokenization', explanation: 'A negligible effect.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'What actually happens during pretraining?',
      answer:
        'Next-token prediction on an enormous corpus, and nothing more sophisticated than that — take a sequence, shift it by one, minimise cross-entropy. Because it is self-supervised, any text is training data, which is the property that makes trillion-token corpora possible in the first place. Everything hard is elsewhere: which text you use and how you clean it, and how you fit a model that does not remotely fit on one device. A 7B model needs 112 GB of memory before any activations, and 187,000 A100-hours of compute. So pretraining is a trivial objective wrapped in a very large amount of data engineering and distributed systems work.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through the memory needed to train a 7B model.',
      answer:
        'Sixteen bytes per parameter in standard mixed precision. Two for the bf16 weights used in the forward and backward passes. Four for an fp32 master copy, which exists because repeatedly adding tiny bf16 updates to bf16 weights loses them to rounding. Four each for Adam\'s two moment buffers, in fp32 — so the optimizer state alone is four times the model. And two for bf16 gradients. That is 112 GB for 7B parameters, on a card with 80, before a single activation is stored. Activations then add batch size times sequence length times hidden size per layer, and are usually reduced with gradient checkpointing. That arithmetic is why distributed training is a requirement rather than an optimisation.',
      isCaseBased: true,
    },
    {
      question: 'Compare the parallelism strategies.',
      answer:
        'Data parallel replicates the model and splits the batch, averaging gradients — simple, the default, and it does nothing about memory since every device still holds all 112 GB. ZeRO or FSDP is data parallel with that fixed: shard the optimizer state, then the gradients, then the parameters, gathering each shard only when needed, trading communication for memory. Tensor parallel splits individual matrices across devices, which needs a synchronisation every layer and therefore a fast interconnect, so it stays within a node. Pipeline parallel puts different layers on different devices — cheap on communication but it introduces bubbles, mitigated by micro-batching. Large runs combine all three, which is what 3D parallelism means.',
      isCaseBased: false,
    },
    {
      question: 'How would you build a pretraining dataset?',
      answer:
        'Start from a large web crawl and expect to throw most of it away — Common Crawl is typically reduced by over 90%. The pipeline is language identification, quality filtering with a classifier trained to recognise well-formed text, and then deduplication at both document and paragraph level, which matters more than people expect because a document appearing 100 times contributes 100 times the gradient. Then a deliberate mixture: web text, books, code, and curated sources, with code included even for non-code capability because it repeatedly improves reasoning. And a contamination check — n-gram overlap against every evaluation set — reported openly, because a benchmark in the training data measures memorisation and nothing else.',
      isCaseBased: true,
    },
    {
      question: 'What goes wrong during a large training run?',
      answer:
        'Loss spikes, where the loss jumps by orders of magnitude and either recovers or destroys the run — handled by gradient clipping, skipping the offending batch, or rolling back to a checkpoint with a different data order. Hardware failures, which on thousands of GPUs for weeks are certain rather than possible, so automatic checkpoint-and-resume is mandatory and published logs from large runs list hundreds of interruptions. And instability that grows with scale — attention logits growing without bound, activations drifting — which is why qk-layernorm, z-loss and residual scaling appear in frontier recipes. The thing that makes all of it serious is that you cannot fix a bad pretraining run later; fine-tuning adjusts behaviour but does not repair the data mixture.',
      isCaseBased: true,
    },
    {
      question: 'Why does adding code to the pretraining mix improve reasoning?',
      answer:
        'It is a well-replicated result without a settled explanation, and I would say that plainly. The plausible accounts are that code has long-range structure — a variable defined at line 10 used at line 200 — which trains the model to track state; that it is unusually explicit about causality and step-by-step procedure, which transfers to chain-of-thought; and that it is unforgiving, since code either runs or does not, so the training signal is cleaner than prose. It may also just be that code is high-quality, carefully formatted text and the benefit is a data-quality effect wearing a costume. The practical upshot is that code goes in the mixture regardless of whether the model is for coding.',
      isCaseBased: false,
    },
    {
      question: 'What is MFU and why do you care?',
      answer:
        'Model FLOPs Utilisation — the fraction of theoretical peak compute your training run actually achieves. It matters because it converts directly into money: a run at 20% MFU costs twice what the same run at 40% does. Typical well-tuned large runs land between 40 and 55%, and anything below 30% means something is wrong — usually communication overhead from a bad parallelism configuration, a data loader that cannot keep up, or too much recomputation from over-aggressive gradient checkpointing. It is the first number I would look at when a run seems expensive, because the fix is almost always configuration rather than hardware.',
      isCaseBased: false,
    },
    {
      question: 'Would you pretrain your own model?',
      answer:
        'Almost certainly not, and the arithmetic is why. Reproducing LLaMA-2 7B is roughly 187,000 A100-hours, around $374,000 at spot prices, before any of the failed runs that a first attempt guarantees — and the result would be worse than an open-weight model you can download for nothing. The cases where it is justified are a genuinely different domain where public models have no coverage, a language they handle badly, or a legal requirement about training data provenance. Even then, continued pretraining on a strong open base is usually the right move: it captures most of the domain benefit for a small fraction of the cost.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'The objective', back: 'Next-token prediction, cross-entropy. Self-supervised, so ANY text is training data — that is what makes trillion-token corpora possible.' },
    { front: 'What a run costs', back: 'GPT-2 small: 496 A100-hours, ~$993. LLaMA-2 7B: 186,965 hours, ~$374K. LLaMA-3 8B: 1.6M hours, ~$3.2M.' },
    { front: 'Why D is the cost now', back: 'LLaMA-3 8B cost more than GPT-3 despite being 22x smaller — 15T tokens against 300B. Compute is 6ND.' },
    { front: 'Training memory', back: '16 bytes/param: bf16 weights 2, fp32 master 4, Adam m 4, Adam v 4, bf16 grads 2. 7B → 112 GB before activations.' },
    { front: 'Why an fp32 master copy', back: 'Repeatedly adding tiny bf16 updates to bf16 weights loses them to rounding. The accumulation must happen in fp32.' },
    { front: 'The four parallelisms', back: 'Data (no memory help). ZeRO/FSDP (shard optimizer → gradients → params). Tensor (splits matrices, needs fast interconnect). Pipeline (splits layers, has bubbles).' },
    { front: 'Deduplication', back: 'A document appearing 100x contributes 100x the gradient. Deduplicated corpora train faster, to lower loss, with far less verbatim memorisation.' },
    { front: 'What goes wrong', back: 'Loss spikes (clip, skip the batch, roll back). Hardware failures are CERTAIN. Instability grows with scale. And you cannot fix a bad mixture later.' },
  ],
  mindmapMarkdown: `- Pretraining
  - The objective
    - next-token prediction, cross-entropy
    - self-supervised: any text is data
    - trivial, and that is the point
  - Cost
    - C = 6ND, A100 at 312 TFLOP/s, ~40% MFU
    - GPT-2 small: 496 hours, ~$993
    - LLaMA-2 7B: 186,965 hours, ~$374K
    - LLaMA-3 8B: 1.6M hours - more than GPT-3
  - Memory
    - 16 bytes/param in mixed precision
    - bf16 weights 2 + fp32 master 4 + Adam 8 + grads 2
    - 7B -> 112 GB before activations
    - 70B -> 1.12 TB
  - Parallelism
    - data: no memory help
    - ZeRO/FSDP: shard optimizer, grads, params
    - tensor: split matrices, needs fast interconnect
    - pipeline: split layers, bubbles
    - 3D = all of them
  - Data
    - DEDUPLICATE: 100 copies = 100x the gradient
    - filter hard: Common Crawl cut by 90%+
    - contamination = measuring memorisation
    - code in the mix improves reasoning (unexplained)
  - What goes wrong
    - loss spikes; clip, skip, roll back
    - hardware failure is certain at scale
    - instability grows with size
    - you cannot fix the mixture afterwards`,
}

export default m
