import type { Module } from '../types'

const m: Module = {
  id: 'dl-l3-ssl-and-scale',
  subjectId: 'dl',
  level: 3,
  title: 'Self-Supervised Learning & Training at Scale',
  whyItMatters:
    'Every frontier model was built twice: once by learning from data that labelled itself, and once by surviving an engineering gauntlet to fit on real hardware. This module is both halves — the idea that removed the labelling bottleneck, and the memory arithmetic an interviewer will hand you on a whiteboard: "7B parameters, Adam, mixed precision — how many GPUs, and why?"',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'Labels are the bottleneck. Data is not.',
      md: `ImageNet took years and thousands of people to label 1.2 million images. The internet uploads that many photos every few minutes.

- Labels are **expensive** (annotator salaries), **slow** (months of calendar time), and sometimes **impossible** — who labels "the correct next word"?
- Raw data is nearly free: text, images, audio, click logs, all sitting there unlabelled.
- Supervised learning burns the cheap resource idle while waiting on the expensive one.
- **Self-supervised learning (SSL)**: build the supervision signal *out of the raw data itself*. Hide part of the input, make the model predict it.
- No humans in the loop. The label was inside the data all along.`,
    },
    {
      type: 'intuition',
      title: 'The pretext task: inventing a job worth doing',
      md: `A **pretext task** is a fake job you invent so that the model is forced to learn something real while doing it.

- **Predict the next token.** Cut any sentence anywhere; the rest is the label. This single pretext task is the whole of modern NLP — GPT is a next-token predictor with nothing else bolted on.
- **Masked prediction.** Blank out ~15% of the tokens, predict them using both sides of the gap. That is BERT.
- **Vision, historically:** rotate the image and predict the angle; cut it into 9 tiles and predict the jigsaw order; colourise a greyscale photo.
- Those vision tasks worked, but weakly: a model can guess rotation from "sky is at the top, and blue" without understanding anything.
- The lesson that matters: **a good pretext task must have no shortcut.** Next-token prediction has none — you cannot fake it — which is why it scaled and jigsaw did not.`,
    },
    {
      type: 'intuition',
      title: 'SimCLR: one photo, two disguises',
      md: `Show a friend the same dog cropped, greyscaled, and blurred. They still say "same dog". That invariance *is* the representation you want — and you can train for it without knowing the word "dog".

- Take one image. Apply two independent random augmentations to get two **views**.
- Push both through the same encoder, then the same projection head, to get two embeddings.
- Train so the two views of the **same** image agree (high cosine similarity), while views of **different** images are pushed apart.
- No labels anywhere. The only supervision is: *these two came from the same source file*.
- The encoder is the product. You then bolt a small classifier on top and fine-tune with whatever few labels you actually have.`,
    },
    {
      type: 'intuition',
      title: 'The four pieces that make it work',
      md: `Remove any one of these and the paper stops reproducing. Interviewers ask about pieces 2 and 3 specifically.

1. **Strong augmentation is the signal, not a detail.** Random crop composed with colour jitter is the pair that carries SimCLR. Weak augmentation makes the task too easy — the encoder solves it with colour histograms and learns nothing.
2. **A projection head you then throw away.** Encoder gives representation *h* (2048-d), a small MLP maps it to *z* (128-d), and the loss is computed on *z*. The thing you keep and transfer is **h**. The head absorbs the augmentation-invariance the loss demands — colour, orientation — leaving *h* holding information the loss would otherwise have destroyed.
3. **Large batches.** Every other image in the batch is a negative. Batch 256 gives 510 negatives per anchor; batch 4096 gives 8190. SimCLR needed thousands — which is why it is a TPU-pod paper.
4. **Temperature in the loss.** Low temperature sharpens the softmax so the hardest negatives dominate the gradient. Typical range 0.05 to 0.5.`,
    },
    {
      type: 'math',
      intro: 'InfoNCE (SimCLR calls it NT-Xent). It is plain softmax cross-entropy where the class label is "which of the others is my partner?".',
      latex: [
        '\\ell_i = -\\log \\frac{\\exp\\left( \\mathrm{sim}(z_i, z_{j(i)}) / \\tau \\right)}{\\sum_{k=1}^{2N} \\mathbf{1}_{[k \\neq i]} \\, \\exp\\left( \\mathrm{sim}(z_i, z_k) / \\tau \\right)}',
        '\\mathrm{sim}(u, v) = \\frac{u \\cdot v}{\\lVert u \\rVert \\, \\lVert v \\rVert} \\quad (\\text{cosine}), \\qquad \\tau \\in [0.05, \\, 0.5]',
        '\\text{Numerator: the one positive. Denominator: that positive} + (2N-2) \\text{ negatives.}',
        '\\text{If everything collapses to one vector, all similarities are equal} \\;\\Rightarrow\\; \\ell_i = \\log(2N-1) \\text{ exactly: chance level.}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'InfoNCE in NumPy — and a collapsed encoder, measured',
      code: `import numpy as np
rng = np.random.default_rng(0)

def nt_xent(z, tau=0.5):
    """SimCLR loss. z = (2N, d): rows 0..N-1 are view A, rows N..2N-1 are view B."""
    z = z / np.linalg.norm(z, axis=1, keepdims=True)   # work in cosine space
    s = z @ z.T / tau                                  # (2N, 2N) all-pairs scores
    np.fill_diagonal(s, -np.inf)                       # a view is not its own negative
    n = len(z) // 2
    partner = np.concatenate([np.arange(n, 2 * n), np.arange(n)])
    mx = s.max(axis=1, keepdims=True)
    logZ = mx[:, 0] + np.log(np.exp(s - mx).sum(axis=1))
    return float(np.mean(logZ - s[np.arange(2 * n), partner]))

N, d = 4, 8
base = rng.normal(size=(N, d))                           # 4 distinct images
good = np.vstack([base + 0.1 * rng.normal(size=(N, d)),  # view A: image + noise
                  base + 0.1 * rng.normal(size=(N, d))]) # view B: image + noise
collapsed = np.ones((2 * N, d))                          # encoder outputs ONE vector
random_enc = rng.normal(size=(2 * N, d))                 # untrained encoder

print("chance level  log(2N-1) = %.4f" % np.log(2 * N - 1))
for name, z in [("good encoder", good), ("collapsed", collapsed), ("random", random_enc)]:
    print("%-14s loss = %.4f" % (name, nt_xent(z)))

for tau in (0.05, 0.1, 0.5, 1.0):
    print("tau = %.2f  ->  good %.4f   random %.4f"
          % (tau, nt_xent(good, tau), nt_xent(random_enc, tau)))

# --- real output ---
# chance level  log(2N-1) = 1.9459
# good encoder   loss = 0.6267
# collapsed      loss = 1.9459   <- EXACTLY chance: collapse earns nothing
# random         loss = 2.0470
# tau = 0.05  ->  good 0.0000   random 8.5873
# tau = 0.10  ->  good 0.0019   random 4.5063
# tau = 0.50  ->  good 0.6267   random 2.0470
# tau = 1.00  ->  good 1.1663   random 1.9533`,
      annotations: {
        6: 'Normalising to unit length turns the dot product into cosine similarity — magnitude must not decide who matches whom.',
        7: 'Dividing by tau BEFORE the softmax is the temperature. Small tau = sharper distribution = hard negatives dominate the gradient.',
        8: 'Without this mask, every anchor would match itself perfectly and the loss would be trivially near zero.',
        12: 'Max-subtracted logsumexp — the same numerical-stability trick as in softmax. exp of a large score overflows.',
        19: 'The collapse failure mode, hand-built: one vector for every input. It perfectly satisfies "the two views agree".',
        33: 'And it scores EXACTLY log(7) = 1.9459, the chance-level loss. Negatives are what make collapse worthless.',
      },
    },
    {
      type: 'note',
      md: 'Collapse is the failure mode to name in an interview: every input maps to the same vector, which trivially satisfies "the two views must agree". The denominator kills it — agreeing with your partner earns nothing if you also agree with all 2N−2 impostors. **BYOL and DINO** then did the surprising thing: dropped negatives entirely and still did not collapse. Their trick is asymmetry — an online network predicts the output of a **momentum target network** (an exponential moving average of the online weights) that receives no gradient at all. The stop-gradient plus the slow-moving target breaks the symmetry collapse needs. Surprising, contested at the time, and real.',
    },
    {
      type: 'intuition',
      title: 'Why a company pays for SSL',
      md: `You have 5 million unlabelled support tickets and 800 labelled ones. That is the normal situation, not the unlucky one.

- Pretrain on all 5 million with SSL. Annotation budget spent: zero.
- Fine-tune on the 800 labels (cross-ref transfer learning: freeze the early layers, train the head, then unfreeze with a small learning rate).
- You reach accuracy that would otherwise need tens of thousands of labels.
- This is the entire business case for foundation models: one expensive SSL pretrain, amortised across thousands of cheap downstream fine-tunes.
- The line to say out loud: *SSL converts a labelling problem into a compute problem — and compute is the one you can buy.*`,
    },
    {
      type: 'intuition',
      title: 'Part 2: the wall is memory, not mathematics',
      md: `Your model trains fine on a laptop at batch 2. On the cluster it dies with OOM. Nothing about the mathematics changed.

- A GPU has two budgets: FLOPs (how fast) and **memory** (whether it runs at all). Memory is the one that binds.
- Living in memory during training: the weights, a *second* copy of the weights, the gradients, the optimizer state, and the **activations** — every intermediate value the backward pass will need (cross-ref the backprop module's memory note).
- Every technique below is one of two moves: **make each item smaller** (mixed precision), or **do not hold all of it at once** (accumulation, checkpointing, sharding).
- Learn the arithmetic first. Once you can count bytes, the techniques become obvious rather than magic.`,
    },
    {
      type: 'intuition',
      title: 'Mixed precision: napkin for speed, ledger for accuracy',
      md: `Do the rough arithmetic on a napkin, but keep the running bank balance in the ledger.

- **fp16 or bf16** (2 bytes) for the forward and backward matmuls. Tensor cores run these roughly 2x faster, and activations take half the memory.
- **fp32 master weights** (4 bytes) held by the optimizer. Why: a typical update is w minus 1e-7 times something. In fp16 that update is smaller than the gap between representable numbers near w, so it rounds to **no change at all** and the model silently stops learning.
- So: compute in 16-bit, accumulate and update in 32-bit, cast back. That is the whole idea.
- Honest cost: you now store the weights **twice** (2 + 4 = 6 bytes/param). The memory win comes from activations, which are the bigger term anyway; the speed win comes from the matmuls.`,
    },
    {
      type: 'note',
      md: 'fp16 has only 5 exponent bits — its smallest normal value is about 6e-5, and real gradients routinely fall below that, where they flush to **zero** and that layer quietly stops training. The fix is **loss scaling**: multiply the loss by a large constant S (say 2^15) before backward so every gradient is lifted out of the danger zone, then divide by S before the optimizer step. Frameworks do this dynamically — raise S until an overflow shows up, back off, skip that step, retry. **bf16** has 8 exponent bits, the same range as fp32, bought by giving up mantissa precision — gradients no longer underflow, so loss scaling is mostly unnecessary. That is why bf16 is the default on A100/H100 and fp16 is now the legacy path.',
    },
    {
      type: 'intuition',
      title: 'Gradient accumulation: a big batch on a small GPU',
      md: `You want batch 512 for a stable gradient. Your card fits 64. You do not need a bigger card.

- Run 8 micro-batches of 64. After each backward call, the framework **adds** into the existing gradient buffers instead of overwriting them.
- After the 8th, take **one** optimizer step, then zero the gradients.
- The step is mathematically the batch-512 step — **but only if you divide each micro-batch loss by 8** first. Skip that and your effective learning rate is 8x too large. This is the detail that gets missed in interviews and in real code.
- What it saves: **activation memory** — only one micro-batch of activations is alive at a time.
- What it does **not** save: weights, master weights, gradients, optimizer state. All still full size. And it is not faster; you do the same work with 8x fewer optimizer steps.
- Gotcha worth naming: BatchNorm computes statistics per micro-batch, so accumulation is *not* equivalent to a true large batch for BN models. LayerNorm models are unaffected — which is convenient, because transformers use LayerNorm.`,
    },
    {
      type: 'math',
      intro: 'Gradient clipping by global norm — the seatbelt. One bad batch produces a huge gradient, one step lands in a garbage region, and the loss is NaN forever after.',
      latex: [
        '\\lVert g \\rVert_2 = \\sqrt{\\sum_{\\text{all parameters}} g_i^2} \\qquad (\\text{one norm over the whole model, not per tensor})',
        'g \\;\\leftarrow\\; g \\cdot \\min\\!\\left(1, \\; \\frac{c}{\\lVert g \\rVert_2}\\right), \\qquad c = 1.0 \\;\\text{for most transformers}',
      ],
    },
    {
      type: 'note',
      md: 'Why the **global** norm and not per-value clipping: rescaling the whole gradient vector by one scalar preserves its **direction** — you take a shorter step the same way. Clipping each component independently bends the update toward a different direction than the gradient actually pointed. Clipping is free when it never triggers, so it is standard in every transformer and RNN recipe. If it triggers on most steps, that is not a seatbelt any more — it is a signal that your learning rate or data pipeline needs looking at.',
    },
    {
      type: 'intuition',
      title: 'Gradient checkpointing: trade compute for memory',
      md: `Backprop needs each layer's activations to compute that layer's gradients, so a forward pass through 100 layers leaves 100 layers of intermediates sitting in memory. In big models this is the largest single line in the budget.

- **Gradient checkpointing** (activation checkpointing): during the forward pass keep only a few activations — roughly every √L-th layer — and **discard the rest**.
- During the backward pass, when a discarded activation is needed, recompute it by re-running forward from the nearest saved checkpoint.
- Memory for activations drops from about O(L) to about **O(√L)**. Compute rises by roughly one extra forward pass: about **30%** more time.
- One line to enable it: wrap each block in torch.utils.checkpoint.checkpoint, or call model.gradient_checkpointing_enable() on a Hugging Face model.
- This is the single reason large models fit on the hardware people actually own. Time you can wait for; memory you cannot conjure.`,
    },
    {
      type: 'math',
      intro: 'The arithmetic every ML engineer is expected to do on the spot. N = parameter count, mixed precision, Adam.',
      latex: [
        '\\text{bytes/param} = \\underbrace{2}_{\\text{fp16 weights}} + \\underbrace{4}_{\\text{fp32 master}} + \\underbrace{2}_{\\text{fp16 grads}} + \\underbrace{4 + 4}_{\\text{Adam } m, \\, v} \\;=\\; 16',
        'M_{\\text{states}} \\approx 16 N \\text{ bytes} \\quad\\Rightarrow\\quad N = 7 \\times 10^{9} \\;\\Rightarrow\\; 112 \\text{ GB, before a single activation}',
        'M_{\\text{inference, fp16}} \\approx 2 N \\;=\\; 14 \\text{ GB} \\qquad \\text{an 8x gap between running a model and training it}',
        '\\text{Drop the fp32 master (pure bf16) or use SGD+momentum and the 16 falls toward 14 or 12. Activations are extra, and batch-dependent.}',
      ],
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Memory budget of a 1B-parameter model on an 80 GB GPU',
        notice: 'One component per frame. Watch the running total — the first four are fixed by the parameter count, the fifth is the one that actually breaks you.',
        leftLabel: 'what you must store',
        rightLabel: 'GPU memory used',
        frames: [
          {
            note: 'fp16 weights: 2 bytes x 1e9 params = 2.0 GB. This is the copy the matmuls read. Running total 2 GB of 80 GB.',
            stack: [{ name: 'weights (fp16)', value: '2 B/param', to: 'w16' }],
            heap: [{ id: 'w16', value: '2.0 GB', label: 'the matmuls' }],
          },
          {
            note: 'fp32 master weights: +4.0 GB. Updates of size 1e-7 vanish in fp16, so the optimizer keeps a full-precision copy. Running total 6 GB.',
            stack: [
              { name: 'weights (fp16)', value: '2 B/param', to: 'w16' },
              { name: 'master weights (fp32)', value: '4 B/param', to: 'w32' },
            ],
            heap: [
              { id: 'w16', value: '2.0 GB', label: 'the matmuls' },
              { id: 'w32', value: '4.0 GB', label: 'optimizer updates' },
            ],
          },
          {
            note: 'Adam keeps two extra fp32 buffers per parameter, m and v: +8.0 GB. Running total 14 GB. SGD+momentum would cost 4 GB here; plain SGD, nothing.',
            stack: [
              { name: 'weights (fp16)', value: '2 B/param', to: 'w16' },
              { name: 'master weights (fp32)', value: '4 B/param', to: 'w32' },
              { name: 'Adam m + v (fp32)', value: '8 B/param', to: 'adam' },
            ],
            heap: [
              { id: 'w16', value: '2.0 GB', label: 'the matmuls' },
              { id: 'w32', value: '4.0 GB', label: 'optimizer updates' },
              { id: 'adam', value: '8.0 GB', label: 'm and v' },
            ],
          },
          {
            note: 'Gradients in fp16: +2.0 GB. Total before a single activation: 16 GB — that is the 16 bytes per parameter. Memorise this number.',
            stack: [
              { name: 'weights (fp16)', value: '2 B/param', to: 'w16' },
              { name: 'master weights (fp32)', value: '4 B/param', to: 'w32' },
              { name: 'Adam m + v (fp32)', value: '8 B/param', to: 'adam' },
              { name: 'gradients (fp16)', value: '2 B/param', to: 'grad' },
            ],
            heap: [
              { id: 'w16', value: '2.0 GB', label: 'the matmuls' },
              { id: 'w32', value: '4.0 GB', label: 'optimizer updates' },
              { id: 'adam', value: '8.0 GB', label: 'm and v' },
              { id: 'grad', value: '2.0 GB', label: '16 GB so far' },
            ],
          },
          {
            note: 'Now the forward pass. Every layer stores activations for the backward pass, and these scale with BATCH x SEQUENCE, not with parameters. Profiled at batch 32: 90 GB. Total 106 GB on an 80 GB card. OOM.',
            stack: [
              { name: 'weights (fp16)', value: '2 B/param', to: 'w16' },
              { name: 'master weights (fp32)', value: '4 B/param', to: 'w32' },
              { name: 'Adam m + v (fp32)', value: '8 B/param', to: 'adam' },
              { name: 'gradients (fp16)', value: '2 B/param', to: 'grad' },
              { name: 'activations (batch 32)', value: '90 GB', to: 'act', danger: true },
            ],
            heap: [
              { id: 'w16', value: '2.0 GB', label: 'the matmuls' },
              { id: 'w32', value: '4.0 GB', label: 'optimizer updates' },
              { id: 'adam', value: '8.0 GB', label: 'm and v' },
              { id: 'grad', value: '2.0 GB', label: '16 GB so far' },
              { id: 'act', value: '90.0 GB', label: '106 GB > 80 GB' },
            ],
          },
          {
            note: 'Gradient checkpointing: keep activations only at ~sqrt(24) layer boundaries and recompute the rest during backward. 90 GB becomes 18.4 GB, total 34.4 GB. It fits. Price: about 30 percent more compute.',
            stack: [
              { name: 'weights (fp16)', value: '2 B/param', to: 'w16' },
              { name: 'master weights (fp32)', value: '4 B/param', to: 'w32' },
              { name: 'Adam m + v (fp32)', value: '8 B/param', to: 'adam' },
              { name: 'gradients (fp16)', value: '2 B/param', to: 'grad' },
              { name: 'activations (checkpointed)', value: '18.4 GB', to: 'act' },
            ],
            heap: [
              { id: 'w16', value: '2.0 GB', label: 'the matmuls' },
              { id: 'w32', value: '4.0 GB', label: 'optimizer updates' },
              { id: 'adam', value: '8.0 GB', label: 'm and v' },
              { id: 'grad', value: '2.0 GB', label: '16 GB so far' },
              { id: 'act', value: '18.4 GB', label: '34.4 GB — fits' },
            ],
          },
        ],
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The memory budget calculator — plain arithmetic, no framework',
      code: `GB = 1e9   # 1 GB = 1,000,000,000 bytes -- same unit the vendor prints on the box

OPT_STATE = {"adam": 8, "sgd_momentum": 4, "sgd": 0}   # fp32 bytes per parameter

def budget(n_params, optimizer="adam", mixed=True, act_gb=0.0, ckpt_layers=0):
    """Memory needed to TRAIN a model, itemised, in GB."""
    b = {}
    if mixed:
        b["weights fp16"] = 2           # what the matmuls read
        b["master weights fp32"] = 4    # what the optimizer updates
        b["gradients fp16"] = 2
    else:
        b["weights fp32"] = 4
        b["gradients fp32"] = 4
    b["optimizer state (%s)" % optimizer] = OPT_STATE[optimizer]
    out = {k: v * n_params / GB for k, v in b.items() if v}
    if act_gb:
        # checkpointing: keep ~sqrt(L) layer boundaries, recompute the rest
        out["activations"] = act_gb / ckpt_layers ** 0.5 if ckpt_layers else act_gb
    return out

def show(label, **kw):
    items = budget(**kw)
    print(label)
    for k, v in items.items():
        print("  %-24s %6.1f GB" % (k, v))
    print("  %-24s %6.1f GB\\n" % ("TOTAL", sum(items.values())))

def total(**kw):
    return sum(budget(**kw).values())

N = 1e9
show("1B params, Adam, mixed precision, no activations yet", n_params=N)
show("1B params, Adam, mixed precision, batch-32 activations", n_params=N, act_gb=90)
print("same run + gradient checkpointing (24 layers): %6.1f GB" % total(n_params=N, act_gb=90, ckpt_layers=24))
print("1B, SGD+momentum instead of Adam:             %6.1f GB" % total(n_params=N, optimizer="sgd_momentum"))
print("7B params, Adam, mixed, no activations:       %6.1f GB" % total(n_params=7e9))
print("7B params, INFERENCE in fp16 (weights only):  %6.1f GB" % (7e9 * 2 / GB))

# --- real output ---
# 1B params, Adam, mixed precision, no activations yet
#   weights fp16                2.0 GB
#   master weights fp32         4.0 GB
#   gradients fp16              2.0 GB
#   optimizer state (adam)      8.0 GB
#   TOTAL                      16.0 GB
#
# 1B params, Adam, mixed precision, batch-32 activations
#   weights fp16                2.0 GB
#   master weights fp32         4.0 GB
#   gradients fp16              2.0 GB
#   optimizer state (adam)      8.0 GB
#   activations                90.0 GB
#   TOTAL                     106.0 GB
#
# same run + gradient checkpointing (24 layers):   34.4 GB
# 1B, SGD+momentum instead of Adam:               12.0 GB
# 7B params, Adam, mixed, no activations:        112.0 GB
# 7B params, INFERENCE in fp16 (weights only):    14.0 GB`,
      annotations: {
        3: 'Adam is 8 bytes/param of pure overhead — m and v, both fp32. This one dict entry is why "just use SGD" is a real memory lever.',
        9: 'The two weight entries together are 6 bytes/param. Mixed precision does NOT shrink your weights; it shrinks activations and speeds up matmuls.',
        16: 'Everything above scales with the parameter count alone. Nothing here depends on batch size.',
        19: 'The sqrt is the checkpointing model: keep ~sqrt(L) boundaries, recompute between them. Approximate but the right shape.',
        46: 'Read it: 16.0 GB for a 1B model before any data touches it. This is the number to quote in interviews.',
        58: 'And here is the headline: 112 GB to train a 7B model, 14 GB to serve it. Same weights, 8x the memory.',
      },
    },
    {
      type: 'intuition',
      title: 'One GPU is not enough: the three axes',
      md: `There are exactly three ways to cut a training job across devices, and they compose.

- **Data parallel** — replicate the entire model on every GPU, give each a different slice of the batch, then **all-reduce** the gradients so every replica takes an identical step. Simple, near-linear speedup, and the default answer. Requirement: model + optimizer state must fit on **one** device.
- **Tensor (model) parallel** — split a single layer's weight matrix across devices; each holds a block of columns, and their outputs are concatenated. Needed when one layer alone does not fit. Cost: communication *inside* every forward pass, so it wants NVLink-class bandwidth and is normally kept within a single node.
- **Pipeline parallel** — split by layers: GPU 0 gets layers 1–8, GPU 1 gets 9–16. Cost: the **bubble** — GPU 1 sits idle while GPU 0 processes the first micro-batch, and vice versa at the end. Mitigated by chopping the batch into many micro-batches to keep the pipe full; never removed entirely.
- Frontier runs use all three at once, which is what "3D parallelism" means when you see it on a slide.`,
    },
    {
      type: 'note',
      md: 'Plain data parallelism wastes memory: 8 GPUs each hold an *identical* copy of the same 16 bytes/param. **ZeRO** (DeepSpeed) and **FSDP** (PyTorch) fix that by sharding rather than replicating — stage 1 shards the optimizer state, stage 2 adds the gradients, stage 3 adds the parameters themselves, so per-device memory falls roughly as 1/num_devices. The honest cost: parameters must be all-gathered just before each layer runs and released right after, so you are trading memory for extra communication — cheap on NVLink or InfiniBand, painful on plain Ethernet. Practical ordering for an interview answer: fits on one GPU → data parallel; does not fit → FSDP/ZeRO-3 next; tensor and pipeline parallel only when sharding alone still is not enough.',
    },
    {
      type: 'note',
      md: 'Last piece, because it connects both halves: a bigger batch means a less noisy gradient, so you can afford bigger steps. The **linear scaling rule** — multiply the learning rate by the same factor you multiplied the batch by (batch 256 → 2048 means lr 0.1 → 0.8) — plus a **warmup** of a few hundred steps ramping from near zero, because it is the very first steps at a large learning rate that blow up. It holds well into the low thousands of samples; beyond that people switch to square-root scaling or LARS/LAMB. Cross-ref the optimizers module: this is why every transformer recipe you will ever read opens with warmup, then cosine decay.',
    },
  ],
  quiz: [
    {
      question: 'What exactly is "self-supervised" about self-supervised learning?',
      options: [
        {
          text: 'A human labels a small seed set and the model expands it to the rest',
          explanation: 'That is semi-supervised learning / pseudo-labelling. It still needs human labels to start.',
        },
        {
          text: 'The model trains with no loss function at all',
          explanation: 'Every SSL method has a perfectly ordinary loss — cross-entropy, InfoNCE. What it lacks is human-supplied targets.',
        },
        {
          text: 'The supervision target is constructed from the raw data itself — hide part of it, predict it',
          explanation: 'Correct. Next token, masked token, second augmented view: the label comes out of the data, so unlabelled data becomes trainable.',
        },
      ],
      correct: 2,
    },
    {
      question: 'In SimCLR, what is the positive pair for a given image?',
      options: [
        {
          text: 'Another image of the same class',
          explanation: 'That is supervised contrastive learning — it needs the class labels SimCLR is trying to avoid needing.',
        },
        {
          text: 'A second independently augmented view of the SAME image',
          explanation: 'Correct. Two random augmentations of one source image. Everything else in the batch is a negative.',
        },
        {
          text: 'The same image at a different resolution, specifically',
          explanation: 'Resolution is one possible augmentation; the definition is any two random views. The paper found crop + colour jitter is the pair that carries the method.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Your contrastive model plateaus and every embedding is nearly identical. Diagnosis and first fix?',
      options: [
        {
          text: 'Representation collapse — negatives are what make it unprofitable, so check the effective negative count (batch size, or the memory-bank/queue size)',
          explanation: 'Correct. Collapse trivially satisfies "views must agree". With enough negatives the loss for a collapsed encoder sits at exactly log(2N−1) — chance level — so the optimizer has every reason to leave it.',
        },
        {
          text: 'Learning rate too low — the encoder has not started learning yet',
          explanation: 'A too-low LR gives a slow but non-degenerate encoder. Identical embeddings is a specific structural failure, not slowness.',
        },
        {
          text: 'Augmentations are too strong — weaken them',
          explanation: 'Over-strong augmentation destroys the signal and hurts accuracy, but strong augmentation is the core of the method. Collapse is fixed by negatives (or by BYOL-style asymmetry), not by weakening augmentation.',
        },
      ],
      correct: 0,
    },
    {
      question: 'What happens to SimCLR\'s projection head after pretraining?',
      options: [
        { text: 'It becomes the downstream classifier', explanation: 'It maps to a 128-d contrastive space, not to your classes. A fresh head is trained downstream.' },
        { text: 'It is kept and fine-tuned along with the encoder', explanation: 'It is not kept at all — that is the counter-intuitive part of the result.' },
        {
          text: 'It is discarded — the representation BEFORE it transfers better',
          explanation: 'Correct. The head absorbs the invariances the loss demands (colour, orientation), so the layer beneath it keeps information the contrastive loss would have thrown away.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Why does fp16 training need loss scaling while bf16 mostly does not?',
      options: [
        { text: 'fp16 arithmetic is slower, so scaling compensates', explanation: 'Both are 2-byte formats running on the same tensor cores. Speed is not the issue.' },
        {
          text: 'fp16 has only 5 exponent bits, so small gradients underflow to zero; bf16 keeps fp32-like range and pays with mantissa bits instead',
          explanation: 'Correct. Loss scaling multiplies gradients up out of the underflow zone and divides back before the step. bf16 has 8 exponent bits, so the underflow problem largely disappears.',
        },
        { text: 'bf16 uses 4 bytes, so it has more room', explanation: 'bf16 is 2 bytes, same as fp16. It spends those bits differently: more exponent, less mantissa.' },
      ],
      correct: 1,
    },
    {
      question: 'You accumulate gradients over 8 micro-batches of 4. Which statement is true?',
      options: [
        {
          text: 'You get the gradient of a batch of 32 while holding only one micro-batch of activations — provided each micro-batch loss is divided by 8',
          explanation: 'Correct. Without the division you sum instead of average, and your effective learning rate is 8x too big. Activation memory is the thing accumulation saves.',
        },
        { text: 'Activation memory is that of batch 32', explanation: 'The opposite — that is the entire point. Only one micro-batch of activations is alive at a time.' },
        { text: 'Training becomes about 8x faster', explanation: 'You do exactly the same amount of work. You just take 8x fewer optimizer steps. Slightly faster at best, from fewer step overheads.' },
      ],
      correct: 0,
    },
    {
      question: 'Gradient checkpointing trades what for what?',
      options: [
        { text: 'Saves compute at the cost of memory', explanation: 'Backwards — it deliberately does extra compute to buy memory back.' },
        { text: 'Saves both, with no downside', explanation: 'Nothing in systems engineering is free. Recomputation costs real time.' },
        {
          text: 'Saves activation memory (roughly O(L) → O(√L)) by recomputing discarded activations during the backward pass, at about 30% more compute',
          explanation: 'Correct. Keep every √L-th activation, recompute the rest from the nearest checkpoint. This is why large models fit on modest hardware.',
        },
      ],
      correct: 2,
    },
    {
      question: 'A 3B-parameter model, Adam, mixed precision. Roughly how much memory for weights + gradients + optimizer state, before activations?',
      options: [
        { text: 'About 6 GB — 2 bytes per parameter', explanation: 'That is fp16 INFERENCE: weights only. Training carries four more copies of every parameter.' },
        {
          text: 'About 48 GB — roughly 16 bytes per parameter',
          explanation: 'Correct. 2 (fp16 weights) + 4 (fp32 master) + 2 (fp16 grads) + 4 + 4 (Adam m, v) = 16 bytes; 16 × 3e9 = 48 GB. Activations are on top of this.',
        },
        { text: 'About 12 GB — 4 bytes per parameter in fp32', explanation: 'That counts fp32 weights only and forgets the gradients and the 8 bytes/param of Adam state.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain self-supervised learning to a non-technical PM, then tell me why it changed NLP.',
      answer:
        'PM version: "Labelling data is our slowest, most expensive step. Self-supervised learning hides part of the data we already have and trains the model to fill it back in — so the data labels itself and we spend GPU hours instead of annotator hours." Why it changed NLP: next-token prediction is a pretext task with no shortcut and infinite free data, so it converted the whole internet into a training set. Every GPT is that one task at scale, with fine-tuning bolted on afterwards. The framing that lands: SSL turns a labelling problem into a compute problem, and compute is the one you can buy.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through SimCLR end to end, and tell me which components are load-bearing.',
      answer:
        'Pipeline: one image → two independent random augmentations → shared encoder f gives h → shared projection head g gives z (128-d) → NT-Xent/InfoNCE loss on z, where the positive is the other view of the same image and the negatives are all 2N−2 other views in the batch. Load-bearing: (1) augmentation strength — random crop composed with colour jitter is the paper\'s key ablation; weak augmentation makes the task solvable by colour statistics; (2) the projection head, which is DISCARDED afterwards — h transfers better than z because the head absorbs the invariances the loss demands; (3) batch size, because the batch supplies the negatives (4096 gives 8190 per anchor); (4) temperature, which controls how much hard negatives dominate the gradient. Not load-bearing: the specific encoder architecture.',
      isCaseBased: false,
    },
    {
      question: 'What is representation collapse, and how do SimCLR, BYOL and DINO each avoid it?',
      answer:
        'Collapse: the encoder maps every input to the same vector. That perfectly satisfies "two views of one image must agree", so any objective built only on agreement has a trivial degenerate optimum. SimCLR avoids it with negatives — the InfoNCE denominator means agreeing with everything is worth nothing; a collapsed encoder scores exactly log(2N−1), the chance-level loss, so gradients keep pushing away from it. BYOL and DINO avoid it without negatives, using asymmetry: an online network with an extra predictor head is trained to match a momentum target network (an EMA of the online weights) that gets a stop-gradient. The asymmetry plus the slowly-moving target keeps the system from settling into the constant solution — DINO adds centring and sharpening of the target output as extra insurance. Worth admitting in an interview that "why exactly BYOL does not collapse" was genuinely debated in the literature.',
      isCaseBased: false,
    },
    {
      question: 'Case: your SimCLR pretraining runs to completion with a nicely falling loss, but linear-probe accuracy on the downstream task is at chance. Debug it.',
      answer:
        'A falling loss with useless features means the model found a shortcut. Order of checks: (1) **Augmentation leak** — if the two views share a per-image artifact (identical crop seed, JPEG noise, an overlaid ID watermark, per-image normalisation statistics), matching views is trivial and no semantics are learned. Verify by visualising actual augmented pairs. (2) **Augmentation too weak** — no colour jitter means colour histograms solve the task; check the transform list, not the config file you think is loaded. (3) **Probing the wrong layer** — probe h (pre-projection), not z; this alone commonly explains a large gap. (4) **Too few negatives** — a tiny batch with no queue; check whether embeddings have collapsed by measuring pairwise cosine similarity across a batch (near 1.0 everywhere = collapse). (5) **Probe setup** — features frozen? optimizer actually stepping the probe? label alignment correct? Tradeoff to name: fixing 1 and 2 costs nothing; fixing 4 costs GPUs, so measure the embedding-similarity histogram before you ask for hardware.',
      isCaseBased: true,
    },
    {
      question: 'Memory budget on the whiteboard: how much GPU memory to TRAIN a 13B-parameter model with Adam in mixed precision, and how much to SERVE it?',
      answer:
        'Per parameter: 2 bytes fp16 weights + 4 bytes fp32 master + 2 bytes fp16 gradients + 4 + 4 bytes Adam m and v = **16 bytes**. Training states: 16 × 13e9 = **208 GB**, before a single activation. That is already 3 × 80 GB H100s just to hold the state, so realistically you shard with FSDP/ZeRO-3 across 8 GPUs (26 GB each) and spend the remaining headroom on activations, which scale with batch × sequence length and are usually the largest single term. Serving in fp16: 2 × 13e9 = **26 GB** of weights, fits on one 40 GB card, plus a KV cache that grows with batch and context. Quantise to int8 and it is 13 GB, int4 about 6.5 GB. The headline ratio to quote: training costs roughly **8x** the memory of inference for the same weights.',
      isCaseBased: false,
    },
    {
      question: 'Case: you have 8 x A100 40GB (320 GB total) and need to fine-tune a 7B model. What do you turn on, in what order, and where do you stop?',
      answer:
        'Budget first: full fine-tuning needs 16 B/param × 7e9 = 112 GB of states, so it does not fit on one 40 GB card but does fit across eight. Order: (1) **bf16 mixed precision** — free 2x speed, half the activation memory, no loss scaling needed on A100. (2) **FSDP / ZeRO-3** — shard parameters, gradients and optimizer state; 112/8 = 14 GB per device, leaving ~26 GB each for activations. (3) **Gradient checkpointing** if activations still overflow — about 30% slower, but usually the difference between running and not. (4) **Gradient accumulation** to reach the effective batch the recipe wants, remembering to divide each micro-batch loss by the accumulation count. (5) **Gradient clipping at 1.0** as standard insurance. Where I would actually stop: for a fine-tune, reach for **LoRA/QLoRA** before any of this — frozen 4-bit base weights are about 3.5 GB and the optimizer state covers only the adapters, so the job fits on ONE card. Tradeoff to state plainly: full FT gives maximum quality and full-model portability; LoRA gives ~90–99% of the quality at a fraction of the memory and gives you swappable adapters. Pipeline/tensor parallel is unnecessary here — the model fits per-device once sharded.',
      isCaseBased: true,
    },
    {
      question: 'Gradient accumulation over k micro-batches versus one real batch of k times the size — what is identical and what is not?',
      answer:
        'Identical: the gradient the optimizer steps with, provided each micro-batch loss is divided by k (or the summed gradient is divided by k before the step) — the sum of per-sample gradients does not care how you grouped them. Not identical: (1) **BatchNorm** computes mean and variance per micro-batch, so BN models genuinely see a smaller batch — LayerNorm models, i.e. transformers, are unaffected; (2) any loss with an in-batch interaction — contrastive/InfoNCE is the big one, since accumulation gives you k times fewer negatives per anchor and quietly changes the objective; (3) throughput — accumulation does the same FLOPs at the same speed, it just takes fewer optimizer steps; the only saving is activation memory. What it never saves: weights, master weights, gradients, optimizer state.',
      isCaseBased: false,
    },
    {
      question: 'In mixed-precision training, exactly what stays in fp32 and why?',
      answer:
        'fp32 keeps: (1) the **master weight copy**, because a typical update is around 1e-7 relative to the weight and would round to zero in fp16 — the model would silently stop learning; (2) the **optimizer state** (Adam m and v), for the same reason plus the variance accumulator spanning a wide dynamic range; (3) **reductions** — softmax, layer-norm statistics, and loss accumulation are done in fp32 inside the kernels, since summing many small numbers in 16 bits loses them; (4) usually the **loss** itself. fp16/bf16 handles the matmuls and the activations, which is where both the speed and the memory savings live. The clean sentence: compute in 16-bit, accumulate and update in 32-bit.',
      isCaseBased: false,
    },
    {
      question: 'Data, tensor and pipeline parallelism — when do you reach for each?',
      answer:
        'Data parallel: default whenever the model plus optimizer state fits on one device. Replicate, split the batch, all-reduce the gradients; near-linear scaling and trivial to run. Tensor/model parallel: when one LAYER does not fit — split the weight matrix column-wise across devices. It communicates inside every forward and backward pass, so it demands NVLink-class bandwidth and is kept inside a node. Pipeline parallel: when the model is too deep for one device but layers are individually fine — assign contiguous layer blocks to devices. Its cost is the bubble (devices idle at the start and end of each batch), mitigated by many micro-batches, never eliminated. Decision order in practice: data parallel → FSDP/ZeRO-3 sharding → add tensor parallel within a node → add pipeline parallel across nodes. Frontier training combines all three, which is what "3D parallelism" means.',
      isCaseBased: false,
    },
    {
      question: 'What does ZeRO stage 3 / FSDP actually shard, and what does it cost you?',
      answer:
        'Plain data parallelism replicates everything, so N GPUs store N identical copies of 16 bytes/param. ZeRO removes the redundancy in stages: stage 1 shards optimizer state (the 8 bytes of Adam m and v), stage 2 also shards gradients, stage 3 also shards the parameters themselves — per-device memory then falls roughly as 1/N. The cost is communication: with stage 3 the parameters of a layer must be all-gathered right before that layer runs and freed right after, and gradients are reduce-scattered, so you add traffic on every layer rather than once per step. On NVLink/InfiniBand the overlap hides most of it; on commodity Ethernet it does not, and you will see GPUs sitting idle. FSDP is PyTorch\'s native equivalent of ZeRO-3 with the same tradeoff. Interview nuance: ZeRO-Offload/Infinity pushes state to CPU RAM or NVMe — enormous memory relief, savage bandwidth penalty, a last resort.',
      isCaseBased: false,
    },
    {
      question: 'Why clip gradients by GLOBAL norm rather than clamping each value?',
      answer:
        'Global-norm clipping computes one L2 norm over every parameter gradient concatenated, and if it exceeds c, scales the entire vector by c/||g||. Because it is a single scalar multiplier, the update **direction is preserved** — you take a shorter step the same way. Per-value clamping truncates large components while leaving small ones untouched, which rotates the update away from the true gradient direction and can systematically bias training. Practical notes: c = 1.0 is the transformer default; clipping is free on steps where it never triggers; and if it triggers on most steps, that is a symptom (bad LR, unclean data, missing warmup), not a cure. It is the standard fix for exploding gradients in RNNs and for the loss spikes that plague long transformer runs.',
      isCaseBased: false,
    },
    {
      question: 'Case: an fp32 run trains fine. You switch it to fp16 and the loss becomes NaN around step 200. Walk me through it.',
      answer:
        'fp16 has ~5 exponent bits: representable magnitudes roughly 6e-5 to 65504, so both ends are reachable in a real model. Diagnose in this order: (1) **Is loss scaling on?** Without it, small gradients flush to zero — that usually gives a stalled loss, but combined with a few large activations it can also destabilise. (2) **Is the scale factor too high?** Dynamic loss scaling should detect the inf/NaN, skip the step and halve S; if it is a fixed scale, gradients overflow to inf and one step destroys the weights. Check whether the scaler is actually attached to the optimizer. (3) **Are reductions running in fp16?** Softmax, layer-norm statistics and the loss must accumulate in fp32; a custom layer written by hand is the usual culprit. (4) **Add gradient clipping at 1.0** and log the global norm — a spike right before the NaN points at one bad batch rather than a numerics bug. (5) **Switch to bf16 if the hardware allows.** Same 2 bytes, fp32-like range, no loss scaling needed; it makes the entire class of problems disappear at the price of some mantissa precision. That last move is the honest senior answer: fp16 debugging is legacy work on A100-class or newer hardware.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Self-supervised learning, in one line', back: 'Build the training target out of the raw data itself (hide part, predict it). Unlabelled data becomes trainable; no annotators.' },
    { front: 'What makes a pretext task good?', back: 'No shortcut. Next-token and masked prediction have none; rotation/jigsaw can be guessed from surface cues, which is why they faded.' },
    { front: 'SimCLR in four moves', back: 'One image → two augmented views → shared encoder + projection head → InfoNCE: same-image views agree, all other views in the batch are negatives.' },
    { front: 'Why discard SimCLR\'s projection head?', back: 'The head absorbs the invariances the loss demands (colour, orientation). The representation BEFORE it keeps more information and transfers better.' },
    { front: 'Representation collapse — and the two cures', back: 'Every input maps to one vector, trivially "agreeing". Cure 1: negatives (InfoNCE denominator) — collapse scores exactly log(2N−1), chance level. Cure 2: asymmetry + momentum target with stop-gradient (BYOL/DINO).' },
    { front: 'Mixed precision: what runs where', back: 'fp16/bf16 for matmuls and activations (~2x speed, half activation memory); fp32 for master weights, optimizer state and reductions. fp16 needs loss scaling; bf16 mostly does not (8 exponent bits).' },
    { front: 'Gradient accumulation — rule and gotchas', back: 'Sum gradients over k micro-batches, step once. Divide each loss by k or the LR is effectively k× too big. Saves activation memory only; BatchNorm and contrastive losses are NOT equivalent to a true big batch.' },
    { front: 'Gradient checkpointing', back: 'Discard most activations in the forward pass, recompute them from saved boundaries during backward. Activation memory O(L) → ~O(√L) for ~30% more compute.' },
    { front: 'Training memory per parameter (Adam, mixed precision)', back: '2 (fp16 w) + 4 (fp32 master) + 2 (fp16 grad) + 4 + 4 (Adam m, v) = 16 bytes. 7B → 112 GB to train, 14 GB to serve in fp16. Activations are extra and batch-dependent.' },
    { front: 'Parallelism cheat sheet', back: 'Data: replicate model, split batch, all-reduce grads (default). Tensor: split one layer\'s matrix (needs NVLink). Pipeline: split by layers (bubble cost). ZeRO/FSDP: shard optimizer state → grads → params; memory ~1/N for extra communication.' },
  ],
  mindmapMarkdown: `- SSL & Training at Scale
  - Why SSL
    - labels: costly, slow, sometimes impossible
    - raw data nearly free
    - target built from the data itself
  - Pretext tasks
    - next-token prediction (all of modern NLP)
    - masked prediction (BERT)
    - rotation / jigsaw / colourisation (historical)
    - rule: a good task has no shortcut
  - Contrastive / SimCLR
    - two augmented views of one image
    - agree with partner, repel the rest
    - strong augmentation = the signal
    - projection head, then discard it
    - large batch = many negatives
    - temperature in InfoNCE
  - Collapse
    - everything maps to one vector
    - negatives make it worth exactly chance
    - BYOL / DINO: momentum target, no negatives
  - Commercial payoff
    - pretrain unlabelled -> fine-tune on few labels
    - cross-ref transfer learning
  - Mixed precision
    - fp16/bf16 math, fp32 master weights
    - ~2x speed, half activation memory
    - loss scaling for fp16 underflow
    - bf16 range removes the need
  - Memory-saving moves
    - gradient accumulation (divide loss by k)
    - gradient clipping by global norm
    - gradient checkpointing (O(sqrt L), +30% compute)
  - Parallelism
    - data: replicate + all-reduce
    - tensor: split a layer
    - pipeline: split by depth, bubble cost
    - ZeRO / FSDP: shard states, params
  - Memory arithmetic
    - 16 bytes per parameter to train
    - 2 bytes per parameter to serve
    - 7B: 112 GB train vs 14 GB infer
    - activations scale with batch x sequence
  - Batch size vs LR
    - linear scaling rule + warmup`,
}

export default m
