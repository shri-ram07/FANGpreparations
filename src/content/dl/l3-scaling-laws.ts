import type { Module } from '../types'

const m: Module = {
  id: 'dl-l3-scaling-laws',
  subjectId: 'dl',
  level: 3,
  title: 'Scaling Laws and the Chinchilla Correction',
  whyItMatters:
    'For three years the field believed bigger models were the answer, and trained a 280-billion-parameter model on 300 billion tokens. Chinchilla showed the same compute buys a better model at 70 billion parameters and 1.4 trillion tokens. One number changed how everything since has been trained.',
  assumes: [
    'You know that model size means parameter count',
    'You have seen scientific notation',
  ],
  estMinutes: 18,
  sections: [
    {
      type: 'intuition',
      title: 'Loss falls as a power law, and that is remarkable',
      md: `Plot a language model's loss against model size, dataset size or training compute on log axes and you get a **straight line** over many orders of magnitude.

That is a **power law**, and it is a strange thing to find. It means loss is predictable: measure a few small models, fit the line, and extrapolate to say what a model a hundred times larger will achieve — before spending the money. That predictability is why frontier labs can commit to a training run costing tens of millions of dollars.

It also means **there are no free lunches and no walls**. Every factor-of-ten increase buys a roughly fixed reduction in loss, and it keeps buying — but each increment costs ten times more than the last.`,
    },
    {
      type: 'math',
      intro:
        'The compute estimate everyone uses, and the Chinchilla conclusion. N is parameters, D is training tokens; the 6 covers roughly two floating-point operations per parameter in the forward pass and four in the backward. The second line says that for a fixed compute budget, N and D should grow together — neither alone.',
      latex: [
        'C \\approx 6ND',
        'N_{\\text{opt}} \\propto C^{0.5}, \\qquad D_{\\text{opt}} \\propto C^{0.5}, \\qquad \\frac{D}{N} \\approx 20',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The models that made the point',
      code: `import math

for name, N, D in [('GPT-3', 175e9, 300e9), ('Gopher', 280e9, 300e9),
                   ('Chinchilla', 70e9, 1.4e12), ('LLaMA-3 8B', 8e9, 15e12)]:
    print('%-12s N=%6.0fB  D=%7.0fB  tokens/param=%7.1f  C=6ND=%.2e'
          % (name, N/1e9, D/1e9, D/N, 6*N*D))

budget = 6 * 280e9 * 300e9
N = math.sqrt(budget / (6 * 20))
print('Gopher budget %.2e spent at 20 tokens/param: N=%.0fB, D=%.0fB'
      % (budget, N/1e9, 20*N/1e9))

# ---- real output ----
# GPT-3        N=   175B  D=    300B  tokens/param=    1.7  C=6ND=3.15e+23
# Gopher       N=   280B  D=    300B  tokens/param=    1.1  C=6ND=5.04e+23
# Chinchilla   N=    70B  D=   1400B  tokens/param=   20.0  C=6ND=5.88e+23
# LLaMA-3 8B   N=     8B  D=  15000B  tokens/param= 1875.0  C=6ND=7.20e+23
# Gopher budget 5.04e+23 spent at 20 tokens/param: N=65B, D=1296B`,
      annotations: {
        8: 'Chinchilla and Gopher differ by 17% in compute — 5.88e23 against 5.04e23 — and Chinchilla, at a quarter of the size, outperformed it on essentially every benchmark. That is the whole result.',
        6: 'GPT-3 and Gopher both sit near 1–2 tokens per parameter. They were undertrained by a factor of more than ten, and nobody knew until someone fitted the curve for both variables at once instead of one.',
        9: 'LLaMA-3 8B is at 1,875 tokens per parameter — nearly a hundred times past Chinchilla-optimal, and deliberately so. The next section is why.',
        10: 'The same budget Gopher spent, allocated at 20 tokens per parameter, would have bought a 65B model on 1,296B tokens. That is the counterfactual: less than a quarter the size, from the same money.',
      },
    },
    {
      type: 'note',
      label: 'What Kaplan got wrong, and why it mattered so much',
      md: `The 2020 Kaplan scaling laws concluded that model size should grow much faster than dataset size — so given more compute, make the model bigger. The field followed, and GPT-3, Gopher and Megatron-Turing were all built on that advice.

Chinchilla in 2022 redid the analysis while varying both together and with the learning-rate schedule matched to each run's length, and found the exponents were roughly **equal**: N and D should scale in step, at about **20 tokens per parameter**.

Gopher at 1.1 tokens per parameter was therefore not merely suboptimal but **undertrained by more than a factor of ten**. A 70B model trained on 1.4T tokens beat it at essentially the same cost.

The lesson is not really about tokens. It is that a scaling law is an **empirical fit**, and a fit made with one variable held badly can be confidently, expensively wrong.`,
    },
    {
      type: 'note',
      label: 'Why nobody trains Chinchilla-optimal any more',
      md: `Chinchilla optimises **training** compute. Almost nobody cares only about that, because a deployed model is trained once and then serves inference for years.

A smaller model costs less on **every single request**, forever. So it is rational to train far past the point where the training-compute return has flattened, buying a permanently cheaper model with a one-time cost. LLaMA-3 8B at 1,875 tokens per parameter is that calculation made explicit.

The other reason is that **data ran out**. High-quality text is finite, and frontier runs are now within reach of the entire usable public web — which is why synthetic data, multiple epochs, and the whole data-quality-over-quantity direction became urgent.

Two nuances worth knowing. Scaling laws describe **loss**, and downstream capabilities do not improve smoothly with it — some appear abruptly, though how much of that is real and how much an artefact of discontinuous metrics is contested. And the laws hold within an architecture family; a genuinely better architecture shifts the whole line.`,
    },
  ],
  quiz: [
    {
      question: 'What is remarkable about loss following a power law in model size?',
      options: [
        { text: 'That loss decreases at all', explanation: 'That is expected; the shape is what is surprising.' },
        { text: 'It is a straight line on log axes over many orders of magnitude, so loss is predictable from small runs before the money is spent', explanation: 'Correct, and that predictability is what makes multi-million-dollar training runs committable.' },
        { text: 'It means there is a wall the model cannot pass', explanation: 'A power law implies no wall — just a rising cost per increment.' },
        { text: 'It only holds for language models', explanation: 'Similar laws have been found in vision and elsewhere.' },
      ],
      correct: 1,
    },
    {
      question: 'What does C ≈ 6ND estimate, and where does the 6 come from?',
      options: [
        { text: 'Memory, from six bytes per parameter', explanation: 'It estimates compute, not memory.' },
        { text: 'Training compute — roughly two operations per parameter forward and four backward, per token', explanation: 'Correct, which is why it is parameters times tokens times six.' },
        { text: 'The number of GPUs required', explanation: 'That depends on the hardware, not the formula.' },
        { text: 'Inference cost', explanation: 'Inference is roughly 2N per token, without the backward pass.' },
      ],
      correct: 1,
    },
    {
      question: 'Chinchilla used 5.88e23 FLOPs and Gopher 5.04e23. Why is that comparison the whole result?',
      options: [
        { text: 'Because Chinchilla used less compute', explanation: 'It used 17% more.' },
        { text: 'At essentially the same compute, a model a quarter the size outperformed Gopher on nearly every benchmark — proving the size/data split was wrong', explanation: 'Correct. The budget was the same; only how it was spent differed.' },
        { text: 'Because Gopher was badly implemented', explanation: 'It was a well-executed run built on the prevailing advice.' },
        { text: 'Because larger models always overfit', explanation: 'Neither was overfitting; Gopher was undertrained.' },
      ],
      correct: 1,
    },
    {
      question: 'What did the Kaplan analysis get wrong?',
      options: [
        { text: 'The compute formula', explanation: 'C ≈ 6ND is still used.' },
        { text: 'It concluded model size should grow much faster than data; varying both properly showed the exponents are roughly equal', explanation: 'Correct — a fit made with one variable held badly, and the whole field followed it.' },
        { text: 'That loss follows a power law', explanation: 'That finding held up.' },
        { text: 'The architecture', explanation: 'The analysis was not about architecture.' },
      ],
      correct: 1,
    },
    {
      question: 'LLaMA-3 8B was trained at 1,875 tokens per parameter — nearly 100x past Chinchilla-optimal. Why?',
      options: [
        { text: 'A mistake', explanation: 'It is a deliberate and well-reasoned choice.' },
        { text: 'Chinchilla optimises training compute only; a smaller model is cheaper on every inference request forever, so overtraining buys a permanently cheaper model', explanation: 'Correct — a one-time cost against an ongoing saving.' },
        { text: 'Because more data always helps', explanation: 'The return had flattened; the argument is economic, not about loss.' },
        { text: 'To avoid overfitting', explanation: 'Overfitting is not the constraint at this scale.' },
      ],
      correct: 1,
    },
    {
      question: 'What do scaling laws NOT tell you?',
      options: [
        { text: 'How loss changes with compute', explanation: 'That is precisely what they tell you.' },
        { text: 'How downstream capabilities behave — those do not improve smoothly with loss, and some appear abruptly', explanation: 'Correct, though how much of that abruptness is real and how much a metric artefact is contested.' },
        { text: 'The optimal tokens-per-parameter ratio', explanation: 'Chinchilla gives roughly 20.' },
        { text: 'Anything about dataset size', explanation: 'Dataset size is one of the two main variables.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'What are scaling laws?',
      answer:
        'Empirical relationships showing that a language model\'s loss falls as a power law in model size, dataset size and training compute — a straight line on log axes across many orders of magnitude. The practical value is predictability: fit the line on a few small runs and you can say what a model a hundred times larger will achieve before committing the budget, which is what makes a multi-million-dollar training run a decision rather than a gamble. The compute estimate everyone uses is C ≈ 6ND, parameters times tokens times six, from roughly two operations per parameter forward and four backward.',
      isCaseBased: false,
    },
    {
      question: 'What did Chinchilla show?',
      answer:
        'That the field had been splitting its compute wrongly for three years. The earlier Kaplan analysis concluded model size should grow much faster than data, so GPT-3 and Gopher were built enormous and trained on relatively few tokens — Gopher at 280 billion parameters and 300 billion tokens, about 1.1 tokens per parameter. Chinchilla redid the analysis varying both properly, found the exponents are roughly equal at about 20 tokens per parameter, and demonstrated it: 70 billion parameters on 1.4 trillion tokens, 5.88e23 FLOPs against Gopher\'s 5.04e23, and it beat Gopher on essentially every benchmark at a quarter of the size.',
      isCaseBased: true,
    },
    {
      question: 'Why does nobody train Chinchilla-optimal now?',
      answer:
        'Because Chinchilla optimises training compute and almost no one cares only about that. A model is trained once and serves inference for years, so a smaller model is cheaper on every request forever — which makes it rational to train far past the point where training-compute return has flattened, paying a one-time cost for a permanently cheaper model. LLaMA-3 8B at 1,875 tokens per parameter, nearly a hundred times past Chinchilla-optimal, is that calculation made explicit. The second reason is that high-quality text is finite and frontier runs are approaching the limits of the usable public web, which is why data quality, synthetic data and multiple epochs became urgent topics.',
      isCaseBased: false,
    },
    {
      question: 'How would you use scaling laws to plan a training run?',
      answer:
        'Fit the curve myself rather than trusting a published constant, because the exponents depend on the architecture, the data mixture and the tokenizer. So: train a series of small models across a range of sizes with matched learning-rate schedules — that schedule matching is exactly what Kaplan got wrong — plot loss against compute, and fit. Then extrapolate to the target budget, and importantly extrapolate to a checkpoint I can verify partway through the real run, so the plan is falsifiable before all the money is spent. And I would decide the tokens-per-parameter ratio from the inference budget rather than from Chinchilla, since that is the actual economics.',
      isCaseBased: true,
    },
    {
      question: 'What is the difference between C ≈ 6ND and inference cost?',
      answer:
        'Training is roughly 6ND because each token costs about two operations per parameter in the forward pass and four in the backward. Inference has no backward pass, so it is roughly 2N per generated token — a factor of three cheaper per token, but paid on every request for the life of the model rather than once. That asymmetry is the whole reason for the overtraining strategy, and it is why techniques that reduce inference cost specifically — quantisation, distillation, mixture-of-experts, which activates only a fraction of its parameters per token — attract so much attention relative to their effect on training cost.',
      isCaseBased: false,
    },
    {
      question: 'Do scaling laws predict capabilities?',
      answer:
        'They predict loss, and the relationship between loss and capability is much less orderly. Some benchmarks improve smoothly with loss and others jump — arithmetic and multi-step reasoning are the usual examples of abilities that appear to switch on at a scale threshold. How much of that is real is genuinely contested: Schaeffer et al. argued that many apparent emergent abilities are artefacts of discontinuous metrics like exact-match accuracy, and that a continuous metric on the same models shows smooth improvement. My working position is that loss is predictable, capability is partly predictable, and anything that depends on a threshold metric should be treated as unpredictable until measured.',
      isCaseBased: false,
    },
    {
      question: 'What happens when the data runs out?',
      answer:
        'It is close to happening for high-quality text, which is why the direction shifted. Several responses are in play: multiple epochs, which works better than the old single-epoch orthodoxy suggested — up to roughly four repetitions costs little; synthetic data, effective for narrow domains with verifiable outputs like code and mathematics, and risky elsewhere because training on model output can degrade the distribution over generations; and data quality over quantity, where careful filtering and curation buy more than raw volume. Beyond that, the practical move is spending compute at inference instead of training — chain-of-thought, sampling and search — which is a different axis entirely and where much of the recent progress has come from.',
      isCaseBased: true,
    },
    {
      question: 'What is the deeper lesson of the Kaplan-to-Chinchilla correction?',
      answer:
        'That a scaling law is an empirical fit, not a law of nature, and a fit made with one variable held badly can be confidently and expensively wrong for years. The specific error was not varying the learning-rate schedule with the training length, which systematically disadvantaged the longer runs and made data look less valuable than it is. Three of the largest models ever built were sized on that conclusion. So the practical takeaway is to be suspicious of extrapolations from experiments where a confounding variable was not properly controlled, and to fit the curve on your own setup rather than inheriting someone else\'s constants.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'What a scaling law is', back: 'Loss falls as a POWER LAW in size, data and compute — a straight line on log axes over orders of magnitude. That makes loss predictable before spending.' },
    { front: 'The compute formula', back: 'C ≈ 6ND. Two operations per parameter forward, four backward, per token. Inference is ≈2N per token.' },
    { front: 'The Chinchilla ratio', back: 'N and D should scale together, at about 20 tokens per parameter.' },
    { front: 'The demonstration', back: 'Gopher 280B/300B = 1.1 tokens/param at 5.04e23. Chinchilla 70B/1.4T = 20.0 at 5.88e23 — and it won on essentially every benchmark.' },
    { front: 'What Kaplan got wrong', back: 'Concluded size should grow much faster than data. The learning-rate schedule was not matched to run length, which disadvantaged the long runs.' },
    { front: 'Why nobody trains optimal now', back: 'Chinchilla optimises TRAINING compute. A smaller model is cheaper on every request forever. LLaMA-3 8B: 1,875 tokens/param.' },
    { front: 'The data wall', back: 'High-quality text is finite. Responses: multiple epochs (up to ~4 is nearly free), synthetic data for verifiable domains, quality over quantity.' },
    { front: 'What they do NOT predict', back: 'Capabilities. Some jump at thresholds — though Schaeffer et al. argue much of that is an artefact of discontinuous metrics.' },
  ],
  mindmapMarkdown: `- Scaling laws
  - The finding
    - loss is a POWER LAW in N, D and C
    - straight line on log axes, many orders of magnitude
    - predictable before the money is spent
    - no wall, but each increment costs 10x
  - The arithmetic
    - C = 6ND (2 fwd + 4 bwd per param per token)
    - inference is ~2N per token, forever
  - Chinchilla
    - N and D scale TOGETHER, ~20 tokens/param
    - Gopher 280B/300B = 1.1, C=5.04e23
    - Chinchilla 70B/1.4T = 20.0, C=5.88e23
    - quarter the size, beat it on nearly everything
  - What Kaplan got wrong
    - size should grow faster than data
    - LR schedule not matched to run length
    - three frontier models sized on it
  - Why optimal is not what is trained
    - training is once, inference is forever
    - LLaMA-3 8B: 1,875 tokens/param
    - and the data ran out
  - Limits
    - predicts LOSS, not capabilities
    - some jump at thresholds (or the metric does)
    - holds within an architecture family`,
}

export default m
