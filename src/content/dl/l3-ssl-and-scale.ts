import type { Module } from '../types'

const m: Module = {
  id: 'dl-l3-ssl-and-scale',
  subjectId: 'dl',
  level: 3,
  title: 'Self-Supervised Learning',
  whyItMatters:
    'A support desk with 5,000,000 stored tickets typically has about 800 a human has categorised. Supervised training uses the 800 and discards the rest. Self-supervised learning is how the other 4,999,200 become training signal.',
  assumes: [
    'You know what cosine similarity is',
    'You have met cross-entropy',
  ],
  estMinutes: 20,
  sections: [
    {
      type: 'intuition',
      title: 'Make the label out of the data',
      md: `Labels are the scarce resource. Raw data is not.

**Self-supervised learning** manufactures a supervised problem from unlabelled data by hiding part of it and asking the model to recover it. Hide a word and predict it. Hide a patch of an image. Crop the same photo twice and ask which pair came from the same original.

None of these tasks matters. What matters is that solving them **requires understanding**, and the network that learns to solve them has built a representation you can then reuse — fine-tuned on your 800 labels, which is now a far easier problem because the model already knows what a support ticket looks like.

Two families dominate: **contrastive**, which learns by comparison, and **masked prediction**, which learns by reconstruction.`,
    },
    {
      type: 'math',
      intro:
        'InfoNCE, the contrastive loss. sim is cosine similarity, τ is the temperature, and the sum runs over the positive plus all the negatives in the batch. It is exactly cross-entropy over a classification problem whose classes are "which of these N items is the match".',
      latex: [
        'L = -\\log \\frac{\\exp(\\mathrm{sim}(z, z^{+})/\\tau)}{\\sum_{j=1}^{N}\\exp(\\mathrm{sim}(z, z_j)/\\tau)}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'InfoNCE, and what temperature does to it',
      code: `import math

def infonce(sims, tau):        # sims[0] is the positive, the rest are negatives
    e = [math.exp(s / tau) for s in sims]
    return -math.log(e[0] / sum(e))

clear     = [0.9, 0.2, 0.1, -0.1]     # the match stands out
ambiguous = [0.5, 0.45, 0.4, 0.35]    # everything looks similar

for tau in [0.05, 0.1, 0.5, 1.0]:
    print('tau=%.2f   clear %.4f   ambiguous %.4f'
          % (tau, infonce(clear, tau), infonce(ambiguous, tau)))

# ---- real output ----
# tau=0.05   clear 0.0000   ambiguous 0.4402
# tau=0.10   clear 0.0013   ambiguous 0.7873
# tau=0.50   clear 0.4598   ambiguous 1.2425
# tau=1.00   clear 0.8389   ambiguous 1.3129`,
      annotations: {
        3: 'Divide the similarities by tau, exponentiate, normalise, take the negative log of the positive\'s share. It is a softmax cross-entropy where the "classes" are the batch members.',
        15: 'At tau = 0.05 a clear match costs 0.0000 while an ambiguous batch still costs 0.4402 — a low temperature sharpens the softmax, so the loss concentrates almost entirely on the cases the model is getting wrong.',
        18: 'At tau = 1.0 the clear case still costs 0.8389. The gradient is spread across easy and hard examples alike, and the model spends capacity on comparisons it has already solved. That is why tau is typically 0.05–0.1 and why it is one of the most sensitive hyperparameters in contrastive learning.',
      },
    },
    {
      type: 'note',
      label: 'The failure that defines the method',
      md: `There is a trivial solution. Map **every** input to the same vector. Then every pair is identical, the positive always matches, and the model has learned nothing whatsoever. This is **representational collapse**, and it is what the entire design of contrastive learning exists to prevent.

The negatives are the defence. If all embeddings are identical, every similarity is 1, the softmax is uniform, and the loss is stuck at exactly **ln(N)** — a floor the model can only escape by making things actually different from each other.

Which is why **batch size is not a tuning detail here**. The negatives come from within the batch, so a batch of 64 gives 63 negatives while a batch of 32,768 gives 32,767 — and the difficulty of the task, and therefore how much it teaches, scales with that.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The collapse floor, measured',
      code: `for N in [4, 64, 1024, 32768]:
    collapsed = infonce([1.0] * N, 0.1)
    print('batch %6d: collapsed loss = %.4f   ln(N) = %.4f  negatives = %d'
          % (N, collapsed, math.log(N), N - 1))

# ---- real output ----
# batch      4: collapsed loss = 1.3863   ln(N) = 1.3863  negatives = 3
# batch     64: collapsed loss = 4.1589   ln(N) = 4.1589  negatives = 63
# batch   1024: collapsed loss = 6.9315   ln(N) = 6.9315  negatives = 1023
# batch  32768: collapsed loss = 10.3972   ln(N) = 10.3972  negatives = 32767`,
      annotations: {
        2: 'Every similarity set to 1.0 — the collapsed state. Note that tau cancels entirely when all the similarities are equal, so the floor does not depend on it.',
        8: 'The collapsed loss equals ln(N) exactly at every batch size. That gives you a directly usable diagnostic: a contrastive loss sitting at ln(batch_size) means the model has collapsed, not that it is training slowly.',
        11: 'And the reason batch size matters: 63 negatives against 32,767. SimCLR needed batches in the thousands, which is why MoCo introduced a momentum-updated queue of past embeddings to simulate a large batch without paying for one.',
      },
    },
    {
      type: 'note',
      label: 'What counts as a positive pair, and why augmentation is the design',
      md: `In SimCLR a positive pair is **two augmentations of the same image** — random crop, colour jitter, blur. Which augmentations you choose is not incidental: it *defines* what the model is told to ignore.

Include colour jitter and the model learns that colour is irrelevant, which is right for object recognition and catastrophic for distinguishing ripe fruit from unripe. Random crop teaches that position is irrelevant. The augmentation set is a statement about which transformations preserve meaning in your domain, and it is where most of the domain knowledge in a contrastive system lives.

The ablation in the SimCLR paper found that random crop plus colour distortion together were responsible for most of the gain, and that either alone was substantially worse — because crop alone can be solved by matching colour histograms.`,
    },
    {
      type: 'note',
      label: 'Masked prediction, and why it took over',
      md: `The other family hides part of the input and reconstructs it. **BERT** masks 15% of tokens; **GPT** predicts the next token, which is the same idea with a causal mask; **MAE** masks 75% of image patches and reconstructs the pixels.

It has one large practical advantage: **no negatives, so no batch-size requirement and no collapse to defend against**. The reconstruction target is the data itself, and there is no degenerate solution — outputting a constant scores badly.

The MAE mask ratio is the interesting detail. 75% sounds extreme against BERT's 15%, and the reason is redundancy: neighbouring image patches are highly predictable from each other, so a low mask ratio makes the task solvable by local interpolation without any understanding. Language is far less redundant, so 15% is already hard.

Both families now often appear together — **DINOv2** combines a masked objective with a self-distillation one — and for language, next-token prediction has simply become the whole of pretraining.`,
    },
  ],
  quiz: [
    {
      question: 'What is the point of the self-supervised pretext task?',
      options: [
        { text: 'To solve it well', explanation: 'Nobody wants to predict masked words for its own sake.' },
        { text: 'Solving it requires understanding, so the representation built along the way transfers to the real task', explanation: 'Correct — the task is discarded and the representation is kept.' },
        { text: 'To generate synthetic labels for the real task', explanation: 'The pretext labels are unrelated to the downstream classes.' },
        { text: 'To reduce the model size', explanation: 'It usually enables larger models, not smaller.' },
      ],
      correct: 1,
    },
    {
      question: 'What does a low temperature do to InfoNCE?',
      options: [
        { text: 'It reduces the loss uniformly', explanation: 'The ambiguous case still costs 0.4402 at tau = 0.05.' },
        { text: 'It sharpens the softmax, so a clear match costs ~0 and the loss concentrates on cases the model gets wrong', explanation: 'Correct, which is why tau is typically 0.05–0.1.' },
        { text: 'It prevents collapse', explanation: 'The negatives prevent collapse; tau cancels entirely in the collapsed state.' },
        { text: 'It increases the number of negatives', explanation: 'That is batch size.' },
      ],
      correct: 1,
    },
    {
      question: 'What is representational collapse?',
      options: [
        { text: 'The loss going to zero', explanation: 'The collapsed loss is ln(N), not zero.' },
        { text: 'Every input mapping to the same vector — every pair matches trivially and nothing is learned', explanation: 'Correct, and the whole design of contrastive learning exists to prevent it.' },
        { text: 'The batch size dropping', explanation: 'That weakens the defence rather than being the failure.' },
        { text: 'Gradients vanishing', explanation: 'Gradients exist; they just point nowhere useful.' },
      ],
      correct: 1,
    },
    {
      question: 'The collapsed loss came out at exactly ln(N) for every batch size. Why is that useful?',
      options: [
        { text: 'It sets the learning rate', explanation: 'It is unrelated to the learning rate.' },
        { text: 'It is a directly checkable diagnostic — a loss sitting at ln(batch_size) means collapse, not slow training', explanation: 'Correct, and it does not depend on tau, which cancels when all similarities are equal.' },
        { text: 'It proves the loss is correct', explanation: 'It is a property of the collapsed state, not a correctness proof.' },
        { text: 'It determines the temperature', explanation: 'Temperature cancels out of the collapsed value.' },
      ],
      correct: 1,
    },
    {
      question: 'Why does contrastive learning need such large batches?',
      options: [
        { text: 'For gradient stability', explanation: 'True of training generally, but not the specific reason here.' },
        { text: 'The negatives come from within the batch — 63 at batch 64 against 32,767 at batch 32,768 — and task difficulty scales with them', explanation: 'Correct, which is why MoCo introduced a momentum queue to simulate a large batch.' },
        { text: 'Because images are large', explanation: 'Image size affects memory, not the negative count.' },
        { text: 'To prevent overfitting', explanation: 'Not the mechanism.' },
      ],
      correct: 1,
    },
    {
      question: 'MAE masks 75% of image patches while BERT masks 15% of tokens. Why the difference?',
      options: [
        { text: 'Images are larger', explanation: 'Size is not the issue; redundancy is.' },
        { text: 'Neighbouring image patches are highly predictable from each other, so a low ratio is solvable by interpolation without understanding', explanation: 'Correct. Language is far less redundant, so 15% is already hard.' },
        { text: 'Vision models are larger', explanation: 'Not the reason, and not reliably true.' },
        { text: 'To save compute', explanation: 'A side benefit — MAE only encodes the visible patches — but not the motivation.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'What is self-supervised learning and why does it matter?',
      answer:
        'It manufactures a supervised problem from unlabelled data by hiding part of the input and asking the model to recover it — mask a word, mask an image patch, or ask which two crops came from the same photo. The pretext task itself is discarded; what is kept is the representation, because solving the task requires understanding the data. It matters because labels are the scarce resource and raw data is not: a support desk with five million tickets might have eight hundred categorised, and supervised training discards the rest. It is also what makes every foundation model possible — GPT and BERT are self-supervised pretraining plus a small amount of supervised adaptation.',
      isCaseBased: false,
    },
    {
      question: 'Explain contrastive learning and InfoNCE.',
      answer:
        'Pull representations of related things together and push unrelated things apart. In SimCLR a positive pair is two augmentations of the same image and the negatives are the other images in the batch. InfoNCE is cross-entropy over a classification problem whose classes are "which of these N items is the match": divide cosine similarities by a temperature, softmax, and take the negative log of the positive\'s share. Temperature matters more than people expect — at tau = 0.05 a clear match costs essentially nothing so the gradient concentrates on hard cases, while at tau = 1.0 the same clear match still costs 0.84 and capacity is spent on comparisons already solved.',
      isCaseBased: false,
    },
    {
      question: 'What is representational collapse and how is it prevented?',
      answer:
        'The degenerate solution where every input maps to the same vector — every pair then matches trivially and nothing has been learned. The negatives are what prevent it in a contrastive method: if all embeddings are identical, every similarity is equal, the softmax is uniform, and the loss sits at exactly ln(N) regardless of temperature. That is a directly usable diagnostic — a contrastive loss parked at ln(batch_size) means collapse rather than slow training. Methods without negatives need a different defence: BYOL uses a momentum-updated target network and a prediction head asymmetry, and Barlow Twins penalises redundancy between embedding dimensions.',
      isCaseBased: true,
    },
    {
      question: 'Why does batch size matter so much in contrastive learning?',
      answer:
        'Because the negatives come from within the batch, so the batch size directly sets how hard the task is: 63 negatives at batch 64 against 32,767 at batch 32,768. With few negatives the correct match is easy to identify and the loss teaches very little. SimCLR needed batches in the thousands, which put it out of reach for most labs. MoCo\'s answer was a queue of embeddings from recent batches, maintained by a momentum-updated encoder so the stored vectors stay consistent, which simulates a very large batch at ordinary memory cost. That is also part of why masked-prediction methods became more popular: they have no negatives and therefore no batch-size requirement at all.',
      isCaseBased: true,
    },
    {
      question: 'How do you choose augmentations for contrastive learning?',
      answer:
        'Very deliberately, because the augmentation set defines what the model is told to ignore. Include colour jitter and the model learns colour is irrelevant, which is correct for object recognition and destroys a ripeness classifier. Random crop teaches that position is irrelevant. So the choice is a statement about which transformations preserve meaning in the domain, and it is where most of the domain knowledge in the system lives. The SimCLR ablation found random crop plus colour distortion together were responsible for most of the gain and either alone was much worse — crop alone can be solved by matching colour histograms, which is a shortcut rather than understanding.',
      isCaseBased: true,
    },
    {
      question: 'Contrastive or masked prediction?',
      answer:
        'Masked prediction unless there is a reason not to, mostly for engineering reasons. It has no negatives, so no batch-size requirement, no collapse to defend against, and no augmentation design problem — the target is the data itself and a constant output scores badly. For language it has simply won: next-token prediction is the whole of pretraining. For vision it is more even, with MAE and DINOv2 both strong, and DINOv2 in fact combines a masked objective with self-distillation. Contrastive remains the right answer when the downstream task is retrieval or similarity, because it optimises the embedding geometry directly, which is exactly what CLIP does across image and text.',
      isCaseBased: false,
    },
    {
      question: 'How would you evaluate a self-supervised model before fine-tuning?',
      answer:
        'Linear probing is the standard: freeze the encoder, train a single linear layer on labelled data, and measure accuracy. It isolates representation quality from the capacity of whatever head you would add, which is the point. k-NN classification in the embedding space is even cheaper and needs no training at all. I would also check collapse directly — the rank or the eigenvalue spectrum of the embedding covariance, since partial collapse into a low-dimensional subspace is common and does not show up in the loss. And the honest caveat is that linear probe accuracy and fine-tuned accuracy do not always rank models the same way, so the final answer is the downstream task.',
      isCaseBased: false,
    },
    {
      question: 'You have 5 million unlabelled tickets and 800 labelled. What do you actually do?',
      answer:
        'I would not start by pretraining from scratch — 5 million tickets is not enough to beat an existing pretrained language model, and that is the honest first answer. So: start with an off-the-shelf pretrained encoder, and continue pretraining it on the 5 million tickets with a masked-language objective, which adapts it to the domain vocabulary and phrasing cheaply. Then fine-tune on the 800 labels, with heavy regularisation and cross-validation because 800 examples will overfit anything. In parallel I would spend effort on getting more labels, since active learning on the model\'s most uncertain tickets typically buys more than any architectural choice at that data scale.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'The core trick', back: 'Hide part of the data, predict it. The task is discarded; the REPRESENTATION is kept. Labels are scarce, raw data is not.' },
    { front: 'InfoNCE', back: 'Cross-entropy over "which of these N is the match". Cosine similarities / tau, softmax, −log the positive\'s share.' },
    { front: 'Temperature', back: 'tau=0.05: a clear match costs 0.0000, so the gradient concentrates on hard cases. tau=1.0: the same match still costs 0.8389. Typical 0.05–0.1.' },
    { front: 'Representational collapse', back: 'Every input to the same vector. Every pair matches trivially, nothing is learned. The negatives are the defence.' },
    { front: 'The collapse diagnostic', back: 'Collapsed loss = ln(N) EXACTLY, at any batch size, independent of tau. A loss parked at ln(batch_size) means collapse, not slow training.' },
    { front: 'Why batch size is not a detail', back: 'Negatives come from the batch: 63 at N=64 vs 32,767 at N=32,768. MoCo\'s momentum queue simulates a large batch cheaply.' },
    { front: 'Augmentations ARE the design', back: 'They define what the model is told to ignore. Colour jitter is right for object recognition and destroys a ripeness classifier.' },
    { front: 'MAE 75% vs BERT 15%', back: 'Neighbouring patches are highly predictable, so a low ratio is solvable by interpolation. Language is far less redundant.' },
  ],
  mindmapMarkdown: `- Self-supervised learning
  - The trick
    - hide part of the data, predict it
    - the task is discarded, the representation is kept
    - 5,000,000 tickets, 800 labels
  - Contrastive
    - positive = two augmentations of one image
    - negatives = the rest of the batch
    - InfoNCE = cross-entropy over "which is the match"
    - tau 0.05: clear match costs 0.0000
    - tau 1.0: same match still costs 0.8389
  - Collapse
    - everything to one vector = trivial solution
    - collapsed loss = ln(N) EXACTLY, any tau
    - a loss at ln(batch_size) means collapse
    - negatives are the defence
    - batch 64 = 63 negatives; 32,768 = 32,767
    - MoCo momentum queue simulates a big batch
  - Augmentations
    - they DEFINE what the model must ignore
    - colour jitter kills a ripeness classifier
    - crop alone is solvable by colour histogram
  - Masked prediction
    - BERT 15%, GPT next-token, MAE 75%
    - no negatives -> no batch requirement, no collapse
    - 75% because image patches are redundant
    - for language it simply won`,
}

export default m
