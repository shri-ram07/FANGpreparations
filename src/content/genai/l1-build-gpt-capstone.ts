import type { Module } from '../types'

const m: Module = {
  id: 'genai-l1-build-gpt-capstone',
  subjectId: 'genai',
  level: 1,
  title: 'Build GPT: The Capstone',
  whyItMatters:
    'Everything in this subject so far assembles into about 300 lines. A 10.6M-parameter character model trains in a minute on one GPU, and building it is what turns a stack of concepts into a thing you understand.',
  assumes: [
    'You have read *The Transformer Block* and everything before it',
    'You have read *PyTorch Fundamentals*',
  ],
  estMinutes: 18,
  sections: [
    {
      type: 'intuition',
      title: 'Size it before you write a line',
      md: `The build is small. What makes it fail is not knowing what "working" looks like, so produce three numbers before writing any code.

**Parameter count**, from 12d²L plus the embedding table — a count that is off by a factor of 4 or 12 is a shape bug, and finding it in the first minute rather than the third hour is the whole point.

**Expected initial loss**, which is ln(V). For a 65-character vocabulary that is 4.1744, and a model printing anything else is broken before training.

**Expected final loss**, so you know when to stop. Character-level English at around 1.4 is a good model; 2.9 is a model that has learned letter frequencies and nothing more.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The two configurations worth building',
      code: `import math
def params(d, L, V):
    return L * 12*d*d + V*d

for name, d, L, V in [('tiny, char Shakespeare', 384, 6, 65),
                      ('GPT-2 small', 768, 12, 50257)]:
    print('%-24s d=%4d L=%2d V=%5d -> %-12s initial loss ln(V) = %.4f'
          % (name, d, L, V, f'{params(d,L,V):,}', math.log(V)))

for name, loss in [('random init', math.log(65)), ('letter frequencies only', 2.9),
                   ('a good character model', 1.4)]:
    print('  %-24s loss %.4f -> perplexity %.2f' % (name, loss, math.exp(loss)))

# ---- real output ----
# tiny, char Shakespeare   d= 384 L= 6 V=   65 -> 10,641,792   initial loss ln(V) = 4.1744
# GPT-2 small              d= 768 L=12 V=50257 -> 123,532,032  initial loss ln(V) = 10.8249
#   random init              loss 4.1744 -> perplexity 65.00
#   letter frequencies only  loss 2.9000 -> perplexity 18.17
#   a good character model   loss 1.4000 -> perplexity 4.06`,
      annotations: {
        7: 'Build the tiny one first. 10.6M parameters trains in about a minute on a modern GPU, so the feedback loop is short enough to actually debug in.',
        14: 'Perplexity 65.00 at initialisation is the model choosing uniformly among 65 characters — exactly what an untrained model should do, and a direct check that the output layer is wired correctly.',
        16: 'Reaching 1.4 means the model is choosing among about 4 plausible next characters rather than 65. That is what "it learned English" looks like as a number, and it is the target to stop at.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'How long the training run should take',
      code: `N, steps, B, ctx = 10_641_792, 5000, 64, 256
tokens = steps * B * ctx
C = 6 * N * tokens
print('%s tokens seen, C = 6ND = %.2e FLOPs' % (f'{tokens:,}', C))
for gpu, peak, mfu in [('A100', 312e12, 0.30), ('RTX 3090', 71e12, 0.25), ('CPU', 0.2e12, 0.50)]:
    s = C / (peak * mfu)
    print('  %-9s %8.1f seconds (%.1f minutes)' % (gpu, s, s/60))
print('memory to train, 16 bytes/param: %.1f MB' % (N*16/1e6))

# ---- real output ----
# 81,920,000 tokens seen, C = 6ND = 5.23e+15 FLOPs
#   A100          55.9 seconds (0.9 minutes)
#   RTX 3090     294.7 seconds (4.9 minutes)
#   CPU        52306.5 seconds (871.8 minutes)
# memory to train, 16 bytes/param: 170.3 MB`,
      annotations: {
        3: 'The same C = 6ND that sizes a frontier run sizes this one. It is the only compute estimate you need, at any scale.',
        9: 'Under a minute on an A100 and five on a consumer card. If your run is taking an hour, something is wrong — most often the data loader rather than the model.',
        10: 'And 14 hours on a CPU, which is exactly why the tiny configuration exists: it is the largest model you can iterate on without a GPU.',
        11: '170 MB. The whole thing fits in a fraction of any GPU, so memory is not a constraint here and you can focus entirely on correctness.',
      },
    },
    {
      type: 'note',
      label: 'The build, in the order that debugs cleanly',
      md: `**1. Data.** Read a text file, build the character vocabulary, encode to integers, split train/validation. Write \`get_batch\` to return \`x\` and \`y = x\` shifted by one. Print one batch and decode it back to text before anything else — the shift is where most builds break, and the symptom is a model that trains beautifully and generates nothing because it learned the identity.

**2. One attention head.** Q, K, V projections, scores over √d, causal mask with \`masked_fill(tril == 0, float('-inf'))\`, softmax, multiply by V. Check that row 0 attends only to position 0.

**3. Multi-head and the block.** Heads in parallel, concatenate, output projection. Then the block: \`x = x + attn(ln1(x))\` and \`x = x + ffn(ln2(x))\` — pre-norm, and the residuals are not optional.

**4. The model.** Token embedding plus position embedding, L blocks, final layer norm, a linear head to the vocabulary. Print the parameter count and compare against 10,641,792.

**5. Train.** AdamW at 3e-4, the standard five-line loop. Check the first loss is 4.17.

**6. Generate.** Sample from the softmax with a temperature, append, repeat, cropping the context to the block size.`,
    },
    {
      type: 'note',
      label: 'The four bugs you will actually hit',
      md: `**The mask, applied after the softmax instead of before.** The weights no longer sum to 1 and the model quietly sees the future. Test: give it a sequence and confirm that changing a *later* token does not change an *earlier* position\'s output.

**The target shift wrong.** Loss falls to near zero, generation is nonsense. Test: the initial loss must be 4.17, and a trained model must *not* reach a loss near zero, because next-character prediction is genuinely uncertain.

**The context not cropped during generation.** Works until the generated text exceeds the block size, then crashes on a position embedding lookup that does not exist. Test: generate more tokens than the context length.

**Forgetting \`model.eval()\` at validation.** Dropout stays on, so validation loss looks worse than training loss for no reason and you spend an evening tuning a regulariser that was never the problem.`,
    },
    {
      type: 'note',
      label: 'What this build teaches that reading does not',
      md: `**Attention is small.** Seven lines. The mystique does not survive writing it, and that is the single most valuable outcome.

**The shapes are the difficulty.** Everything is (batch, time, channels) and every bug is a transpose. Print shapes at every step until they are automatic.

**Scale is the only difference.** GPT-2 small is the identical code at d = 768, L = 12 and a BPE vocabulary — 123,532,032 parameters against 10,641,792, and not one architectural idea you have not already implemented.

Sensible extensions, in order: swap the character vocabulary for BPE; replace learned positions with RoPE; replace LayerNorm with RMSNorm and the GELU feed-forward with SwiGLU. Each is a small, self-contained change, and doing them one at a time on a model you can retrain in a minute is the cheapest way to learn what each is worth.`,
    },
  ],
  quiz: [
    {
      question: 'Why compute the expected initial loss before training?',
      options: [
        { text: 'To choose the learning rate', explanation: 'The learning rate is a separate decision.' },
        { text: 'It must be ln(V) — 4.1744 for a 65-character vocabulary — and anything else means the model is broken before training', explanation: 'Correct, and it eliminates most of the search space in one print.' },
        { text: 'To estimate training time', explanation: 'That comes from C = 6ND.' },
        { text: 'To size the batch', explanation: 'Unrelated.' },
      ],
      correct: 1,
    },
    {
      question: 'A trained character model reaches loss 1.4. What does that mean concretely?',
      options: [
        { text: 'It has memorised the training text', explanation: 'Memorisation would drive the loss much lower.' },
        { text: 'Perplexity 4.06 — it is choosing among about 4 plausible next characters rather than 65', explanation: 'Correct. That is what "it learned English" looks like as a number.' },
        { text: 'It is 140% accurate', explanation: 'Loss is not an accuracy.' },
        { text: 'It has converged to the theoretical minimum', explanation: 'There is no such minimum for a genuinely uncertain task.' },
      ],
      correct: 1,
    },
    {
      question: 'The training run is estimated at 55.9 seconds on an A100. What should you do if it takes an hour?',
      options: [
        { text: 'Accept it — estimates are rough', explanation: 'A 60x gap is not estimation error.' },
        { text: 'Look for the bottleneck, most often the data loader rather than the model', explanation: 'Correct, and having the estimate is what makes the gap visible at all.' },
        { text: 'Reduce the model size', explanation: 'The model is not the problem at 10.6M parameters.' },
        { text: 'Increase the learning rate', explanation: 'That changes convergence, not throughput.' },
      ],
      correct: 1,
    },
    {
      question: 'You apply the causal mask after the softmax instead of before. What happens?',
      options: [
        { text: 'An error is raised', explanation: 'It runs fine, which is what makes it dangerous.' },
        { text: 'The weights no longer sum to 1 and the model quietly sees the future', explanation: 'Correct. Test by changing a later token and confirming an earlier position\'s output is unchanged.' },
        { text: 'Generation becomes slow', explanation: 'Speed is unaffected.' },
        { text: 'The loss becomes nan', explanation: 'It stays finite and looks plausible.' },
      ],
      correct: 1,
    },
    {
      question: 'Your model trains to a loss near zero and generates nonsense. What is the bug?',
      options: [
        { text: 'Overfitting', explanation: 'Overfitting still generates plausible text.' },
        { text: 'The target shift is wrong — the model learned the identity, copying its input', explanation: 'Correct, and the tell is that the initial loss was not ln(V) and the final loss reached near zero.' },
        { text: 'The learning rate is too high', explanation: 'That produces divergence, not a near-zero loss.' },
        { text: 'The vocabulary is too small', explanation: 'A small vocabulary makes the task easier, not degenerate.' },
      ],
      correct: 1,
    },
    {
      question: 'What is the difference between this build and GPT-2 small?',
      options: [
        { text: 'A fundamentally different architecture', explanation: 'The architecture is identical.' },
        { text: 'Scale and the tokenizer — d = 768 and L = 12 with BPE, giving 123,532,032 parameters against 10,641,792', explanation: 'Correct, and not one architectural idea you have not already implemented.' },
        { text: 'GPT-2 uses a different attention mechanism', explanation: 'Same causal multi-head attention.' },
        { text: 'GPT-2 has no feed-forward layers', explanation: 'They are two thirds of it.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Walk me through building a GPT from scratch.',
      answer:
        'Data first: read a text file, build a vocabulary, encode to integers, and write a batch function returning x and y where y is x shifted by one — printing a decoded batch before anything else, because the shift is where most builds break. Then one attention head: Q, K and V projections, scores over √d, a causal mask filled with −inf before the softmax, multiply by V. Then heads in parallel with an output projection, then the block as x = x + attn(norm(x)) and x = x + ffn(norm(x)). Then the model: embeddings, L blocks, a final norm, a head to the vocabulary. Then the standard training loop. The whole thing is about 300 lines and the tiny configuration trains in under a minute.',
      isCaseBased: true,
    },
    {
      question: 'What checks do you run before and during training?',
      answer:
        'Three numbers, all computable in advance. The parameter count from 12d²L plus the embedding table — 10,641,792 for the tiny config — because a count off by a factor of 4 or 12 is a shape bug found in a minute rather than three hours. The initial loss, which must be ln(V), 4.1744 for a 65-character vocabulary; anything else means the model is broken before training. And the expected training time from C = 6ND, about 56 seconds on an A100, so an hour-long run tells you something is wrong, usually the data loader. Then during training I would confirm the model can overfit a single batch before running the full thing.',
      isCaseBased: true,
    },
    {
      question: 'How does causal masking work in practice?',
      answer:
        'Build a lower-triangular matrix of ones and use masked_fill to set the scores wherever it is zero to negative infinity, before the softmax. The −inf then exponentiates to exactly zero, so future positions receive precisely zero weight and the remaining weights still sum to 1. Two details matter. It must be before the softmax — applying it afterward leaves weights that no longer sum to 1 and lets the model quietly see the future. And it must be −inf rather than a large negative number, since a merely large value leaves a small non-zero weight. The test is to change a later token and confirm an earlier position\'s output is unchanged.',
      isCaseBased: false,
    },
    {
      question: 'What is the most common bug in a from-scratch transformer?',
      answer:
        'Target alignment. The target for position t is the token at t+1, and getting that wrong gives a model that trains beautifully to a near-zero loss and generates nothing useful, because it has learned to copy its input. It is dangerous precisely because it looks like success — the loss curve is the best you will ever see. Two checks catch it: the initial loss should be ln(V), and a trained model should not be able to reach a loss near zero, because next-token prediction is genuinely uncertain. Runner-up bugs are the mask applied after the softmax, and forgetting to crop the context during generation, which crashes only once the output exceeds the block size.',
      isCaseBased: true,
    },
    {
      question: 'How would you extend this to a modern architecture?',
      answer:
        'One change at a time, on a model that retrains in a minute, which is what makes this a good learning setup. Swap the character vocabulary for BPE, which changes what a token means and makes the vocabulary and embedding table much larger. Replace learned position embeddings with RoPE, applied to Q and K inside attention rather than added at the bottom. Replace LayerNorm with RMSNorm, dropping the mean subtraction. Replace the GELU feed-forward with SwiGLU, which uses three matrices instead of two. Each is small and self-contained, and measuring the loss before and after each one is the cheapest way to learn what each is actually worth.',
      isCaseBased: false,
    },
    {
      question: 'Why start with a character-level model?',
      answer:
        'Because it removes a whole layer of machinery from the debugging problem. The vocabulary is 65 characters you can print and read, the encode and decode functions are two lines, and there is no tokenizer to get wrong — so any bug you hit is in the model rather than in the data pipeline. It also makes the outputs directly readable as a diagnostic: early samples are noise, then character frequencies, then word-shaped strings, then real words, then punctuation that matches. That progression tells you what the model has learned at a glance. The cost is that character models need more context for the same meaning, which is exactly the trade the tokenization module is about.',
      isCaseBased: false,
    },
    {
      question: 'What did building it teach you that reading did not?',
      answer:
        'That attention is seven lines. The mystique does not survive writing it, and that is genuinely the most valuable outcome — afterwards, a paper describing an attention variant is a small diff rather than a new idea. Second, that the difficulty is entirely in the shapes: everything is batch by time by channels, and essentially every bug is a transpose or a broadcast, which is why printing shapes at every step is the right habit. And third, that GPT-2 small is the identical code at d = 768 and L = 12 with a BPE vocabulary — 123M parameters against 10.6M, and not one architectural idea beyond what you have implemented.',
      isCaseBased: false,
    },
    {
      question: 'How do you sample from the model, and what are the knobs?',
      answer:
        'Take the logits at the last position, divide by a temperature, softmax, sample from the resulting distribution, append the token, crop the context to the block size, and repeat. The knobs all shape that distribution before sampling. Temperature below 1 sharpens toward the top choice and above 1 flattens — it is the adventurousness dial. Top-k keeps only the k most likely tokens, and top-p keeps the smallest set whose probabilities sum to p, which adapts to how confident the model is rather than using a fixed count. Greedy decoding, always taking the argmax, is deterministic and produces noticeably repetitive text, which is why sampling is the default for anything creative.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Three numbers before coding', back: 'Parameter count (12d²L + Vd), initial loss ln(V), expected training time (C = 6ND). Each catches a different class of bug.' },
    { front: 'The tiny config', back: 'd=384, L=6, V=65 → 10,641,792 params, initial loss 4.1744. Trains in ~56s on an A100.' },
    { front: 'What the loss means', back: 'ln(65) = 4.1744 is uniform over 65 characters (perplexity 65). 2.9 is letter frequencies only. 1.4 is a good model (perplexity 4.06).' },
    { front: 'Build order', back: 'Data (print a decoded batch!) → one head → multi-head → block → model → train → generate. Debug in that order.' },
    { front: 'Bug 1: the mask', back: 'Applied AFTER the softmax, weights no longer sum to 1 and the model sees the future. Use masked_fill with −inf BEFORE.' },
    { front: 'Bug 2: the shift', back: 'Loss falls to near zero, generation is nonsense — it learned the identity. Initial loss must be ln(V); final loss must NOT reach zero.' },
    { front: 'Bug 3 and 4', back: 'Context not cropped during generation (crashes past the block size). model.eval() forgotten (dropout on at validation).' },
    { front: 'The scale gap', back: 'GPT-2 small is this code at d=768, L=12 with BPE: 123,532,032 vs 10,641,792 params, and zero new architectural ideas.' },
  ],
  mindmapMarkdown: `- Build GPT
  - Size it first
    - params = 12 d^2 L + V d -> 10,641,792
    - initial loss = ln(V) = 4.1744
    - time from C = 6ND: ~56s on an A100
    - 170 MB to train - memory is not a constraint
  - Loss targets
    - 4.1744 = uniform over 65 chars (ppl 65)
    - 2.9 = letter frequencies only (ppl 18)
    - 1.4 = a good model (ppl 4.06)
  - Build order
    - data: print a DECODED batch first
    - one head: mask with -inf BEFORE softmax
    - multi-head + output projection
    - block: pre-norm, residuals not optional
    - model, train, generate
  - The four bugs
    - mask after softmax -> sees the future
    - wrong target shift -> learns the identity
    - context not cropped -> crashes past block size
    - model.eval() forgotten -> dropout at validation
  - What it teaches
    - attention is SEVEN LINES
    - the difficulty is shapes (B, T, C)
    - GPT-2 small = same code at d=768, L=12
    - extend one at a time: BPE, RoPE, RMSNorm, SwiGLU`,
}

export default m
