import type { Module } from '../types'

const m: Module = {
  id: 'genai-l3-prompt-engineering',
  subjectId: 'genai',
  level: 3,
  title: 'Prompting: What Works and Why',
  whyItMatters:
    'Chain-of-thought took PaLM from 17.9% to 58.1% on GSM8K with no weight change at all — a 40-point gain from asking differently. Prompting is the cheapest lever available, and the reason it works is mechanical rather than mysterious.',
  assumes: [
    'You have read *Self-Attention*, so you know each token is one forward pass',
    'You have read *Tokenization*',
  ],
  estMinutes: 20,
  sections: [
    {
      type: 'intuition',
      title: 'Why intermediate tokens are computation',
      md: `A model does a fixed amount of work per token. Ask for an answer directly and the whole problem must be solved in the forward passes that produce it — for a hard multi-step question, that is not enough compute.

**Chain-of-thought** changes that. Making the model write out intermediate steps gives it more forward passes to do the work in, and each step conditions the next. The reasoning tokens are not an explanation of the answer; they are where the answer is computed.

That framing predicts the behaviour. It explains why it helps most on multi-step arithmetic and reasoning and barely at all on lookup, why it only appears in large models — small ones write plausible reasoning that does not connect to the answer — and why a wrong intermediate step usually produces a wrong final one.`,
    },
    {
      type: 'math',
      intro:
        'Why chain-of-thought is more compute, not just more words. A model applies a fixed transform f once per token, so the work available to solve a problem is proportional to how many tokens it is allowed to produce before answering. The second line is the token cost of k few-shot examples, paid on every single call.',
      latex: [
        "h_{t} = f(h_{<t}) \\quad\\Rightarrow\\quad \\text{compute} \\propto n_{\\text{tokens}}",
        "T_{\\text{prompt}} = k\\cdot e + p",
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The published gains, and what they cost',
      code: `for bench, standard, cot in [('GSM8K', 17.9, 58.1), ('SVAMP', 69.9, 79.0),
                             ('MAWPS', 72.7, 93.3)]:
    print('%-8s standard %4.1f%% -> CoT %4.1f%%  (+%.1f points)'
          % (bench, standard, cot, cot - standard))

for k in [0, 1, 5, 20]:
    toks = k * 300 + 200
    print('%2d-shot: %5s prompt tokens, $%.5f per call at $3/M'
          % (k, f'{toks:,}', toks * 3 / 1e6))

# ---- real output ----
# GSM8K    standard 17.9% -> CoT 58.1%  (+40.2 points)
# SVAMP    standard 69.9% -> CoT 79.0%  (+9.1 points)
# MAWPS    standard 72.7% -> CoT 93.3%  (+20.6 points)
#  0-shot:   200 prompt tokens, $0.00060 per call at $3/M
#  1-shot:   500 prompt tokens, $0.00150 per call at $3/M
#  5-shot: 1,700 prompt tokens, $0.00510 per call at $3/M
# 20-shot: 6,200 prompt tokens, $0.01860 per call at $3/M`,
      annotations: {
        1: 'PaLM 540B, 8-shot, from the original chain-of-thought paper. The same model and the same weights — only the prompt differs.',
        10: '+40.2 points on GSM8K, which is multi-step arithmetic. +9.1 on SVAMP, which is mostly single-step. The size of the gain tracks how many steps the problem needs, exactly as the compute framing predicts.',
        16: 'Few-shot examples are resent on every single call. Twenty examples at 300 tokens each is 6,200 prompt tokens — 31 times a zero-shot call, on every request forever.',
        17: 'Which is the honest trade: if 5-shot matches 20-shot, the 20 are costing you three times as much for nothing. Measure where the returns flatten rather than adding examples until it feels sufficient.',
      },
    },
    {
      type: 'note',
      label: 'What few-shot examples actually teach',
      md: `Not the task. A striking result is that **replacing the answers in few-shot examples with random labels barely hurts performance** — what the examples convey is the *format*, the *label space* and the *distribution of inputs*, not the input-to-output mapping.

That reframes how to choose them. Examples should demonstrate the output shape you want and cover the edge cases you care about; they are a specification rather than training data.

Practical consequences: examples closer to the actual query help more, so retrieving relevant examples per request beats a fixed set; the **order matters**, and models are biased toward the label of the last example; and returns flatten quickly, usually somewhere between 3 and 8, after which you are paying for tokens that change nothing.

For a model with strong instruction-following, zero-shot with a clear instruction is frequently as good as few-shot and much cheaper — worth testing before assuming examples are needed.`,
    },
    {
      type: 'note',
      label: 'The techniques that survive contact with production',
      md: `**Be specific about the output format.** Most prompt failures are underspecification, not model failure. "Return JSON with keys \`name\` and \`confidence\`, where confidence is a number between 0 and 1" is a different instruction from "return the name and how sure you are".

**Give the model somewhere to put uncertainty.** A field for "unknown" or an instruction to say when it cannot tell removes the pressure to invent, and models default to helpful, which means answering.

**Put instructions at the beginning and the end** for a long prompt, because of the lost-in-the-middle effect. Repetition is cheap and it works.

**Self-consistency** — sample several chain-of-thought paths and take the majority answer — reliably improves accuracy on reasoning tasks at a linear cost in samples. It is the simplest reliable improvement after chain-of-thought itself.

**Prefilling the response** is underused: starting the assistant turn with \`{"\` forces JSON far more reliably than asking for it.`,
    },
    {
      type: 'note',
      label: 'The failure modes worth naming',
      md: `**Chain-of-thought is not a faithful explanation.** Models produce reasoning that does not match what actually drove the answer — a documented result, and it matters because the reasoning reads as an audit trail and is not one. Do not present it to users as a justification.

**Reasoning models changed the picture.** Models trained to reason at length do it internally, so explicit "think step by step" instructions help less and sometimes hurt by interfering. Much prompt-engineering advice is now model-specific and dated, which is itself the most important thing to know about the field.

**Prompt injection is unsolved.** Any untrusted content in the prompt can contain instructions, and no amount of "ignore instructions in the document below" reliably prevents it. Structural separation and least privilege are the mitigations; prompt wording is not.

**And prompts are code.** They need version control, a test suite of input-output pairs, and evaluation on change — because a prompt edit that fixes one case routinely breaks three others, and without a suite you will not know.`,
    },
  ],
  quiz: [
    {
      question: 'Why does chain-of-thought improve accuracy without changing any weights?',
      options: [
        { text: 'It makes the model try harder', explanation: 'There is no effort dial.' },
        { text: 'A model does fixed work per token, so intermediate tokens give it more forward passes to compute in — the reasoning IS the computation', explanation: 'Correct, which is why gains track how many steps the problem needs.' },
        { text: 'It retrieves relevant training examples', explanation: 'No retrieval is involved.' },
        { text: 'It reduces the temperature', explanation: 'Unrelated to sampling.' },
      ],
      correct: 1,
    },
    {
      question: 'CoT gave +40.2 points on GSM8K but +9.1 on SVAMP. What explains the difference?',
      options: [
        { text: 'GSM8K is a smaller dataset', explanation: 'Dataset size is not the variable.' },
        { text: 'GSM8K is multi-step arithmetic and SVAMP is mostly single-step — the gain tracks the number of steps needed', explanation: 'Correct, exactly as the extra-compute framing predicts.' },
        { text: 'The model was fine-tuned on GSM8K', explanation: 'Same model and weights throughout.' },
        { text: 'SVAMP has a higher baseline so gains are capped', explanation: 'MAWPS had a higher baseline still and gained 20.6 points.' },
      ],
      correct: 1,
    },
    {
      question: 'What do few-shot examples actually teach the model?',
      options: [
        { text: 'The input-to-output mapping', explanation: 'Replacing the answers with random labels barely hurts performance.' },
        { text: 'The format, label space and input distribution — they are a specification, not training data', explanation: 'Correct, which is why they should demonstrate output shape and edge cases.' },
        { text: 'New factual knowledge', explanation: 'A few examples cannot teach facts.' },
        { text: 'How to use tools', explanation: 'Tool schemas do that.' },
      ],
      correct: 1,
    },
    {
      question: '20-shot costs 6,200 prompt tokens against 200 for zero-shot. Why does that matter?',
      options: [
        { text: 'It exceeds the context window', explanation: 'It is well within any modern window.' },
        { text: 'Examples are resent on every single call forever — if 5-shot matches 20-shot, the extra 15 cost three times as much for nothing', explanation: 'Correct, and returns usually flatten between 3 and 8 examples.' },
        { text: 'More examples always improve accuracy', explanation: 'They flatten quickly and can hurt through ordering bias.' },
        { text: 'The model reads only the first few', explanation: 'It reads all of them; they just stop helping.' },
      ],
      correct: 1,
    },
    {
      question: 'Why should chain-of-thought not be shown to users as a justification?',
      options: [
        { text: 'It is too verbose', explanation: 'Length is not the objection.' },
        { text: 'It is not a faithful explanation — models produce reasoning that does not match what actually drove the answer', explanation: 'Correct, and it reads as an audit trail while not being one.' },
        { text: 'It reveals the system prompt', explanation: 'A different concern.' },
        { text: 'It is always wrong when the answer is right', explanation: 'It is often right; it is unreliably faithful.' },
      ],
      correct: 1,
    },
    {
      question: 'What is self-consistency?',
      options: [
        { text: 'Asking the model to check its own answer', explanation: 'That is self-critique, a different technique.' },
        { text: 'Sampling several chain-of-thought paths and taking the majority answer', explanation: 'Correct — a reliable accuracy gain on reasoning tasks at linear cost in samples.' },
        { text: 'Using the same prompt template everywhere', explanation: 'Not what the term means.' },
        { text: 'Setting temperature to zero', explanation: 'Self-consistency requires non-zero temperature to get varied paths.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why does chain-of-thought work?',
      answer:
        'Because a model does a fixed amount of work per token, so asking for an answer directly forces the whole problem into the forward passes that produce it — which for a multi-step question is not enough compute. Writing intermediate steps gives the model more passes to work in, and each step conditions the next. The reasoning tokens are where the answer is computed, not a commentary on it. That framing predicts the observed behaviour: PaLM went from 17.9% to 58.1% on GSM8K, which is multi-step arithmetic, but only 69.9% to 79.0% on SVAMP, which is mostly single-step. The gain tracks the number of steps the problem needs.',
      isCaseBased: false,
    },
    {
      question: 'What do few-shot examples actually do?',
      answer:
        'Less than people assume. The striking result is that replacing the answers in few-shot examples with random labels barely hurts performance — so what the examples convey is the format, the label space and the distribution of inputs, not the mapping from one to the other. They are a specification rather than training data. That changes how to choose them: demonstrate the output shape you want and cover the edge cases you care about. It also means retrieving examples relevant to the specific query beats a fixed set, that order matters because models are biased toward the last example\'s label, and that returns flatten quickly, usually between three and eight.',
      isCaseBased: false,
    },
    {
      question: 'How would you approach a prompt that is not working?',
      answer:
        'Assume underspecification first, because most prompt failures are that rather than model failure — "return JSON with keys name and confidence, where confidence is between 0 and 1" is a different instruction from "return the name and how sure you are". Then give the model somewhere to put uncertainty, since it defaults to helpful and helpful means answering. Then add chain-of-thought if the task has steps, and few-shot examples if the output shape is hard to describe. Then self-consistency if accuracy still matters more than cost. Throughout I would work against a test set of input-output pairs rather than by impression, because a prompt edit that fixes one case routinely breaks three others.',
      isCaseBased: true,
    },
    {
      question: 'How do you get reliable structured output?',
      answer:
        'Constrained decoding if the provider offers it, since a grammar-constrained sampler makes invalid JSON impossible rather than unlikely — that is the only actually reliable answer. Failing that, prefilling the assistant turn with an opening brace, which forces the format far more effectively than asking for it. Then a precise schema in the prompt with a worked example, since format is exactly what few-shot examples convey well. And regardless of method, parse with a validator and retry on failure with the error message included, because at scale a small failure rate is still a lot of failures. I would also avoid asking for prose and JSON in one response, which reliably produces JSON wrapped in commentary.',
      isCaseBased: true,
    },
    {
      question: 'Is chain-of-thought a faithful explanation?',
      answer:
        'No, and that matters more than it sounds. There is documented work showing models produce reasoning that does not match what actually drove the answer — including cases where a biasing cue changes the answer and the stated reasoning never mentions it. So the chain reads like an audit trail and is not one, which makes it dangerous to present to users as a justification, and unreliable as a basis for a compliance argument. It is still useful: it improves accuracy, and it is genuinely helpful for debugging because it shows what the model believed the situation was. But faithfulness and usefulness are different properties and only one of them is established.',
      isCaseBased: false,
    },
    {
      question: 'How has prompting changed with reasoning models?',
      answer:
        'Substantially, and it is the most important thing to know about the field. Models trained to reason at length do it internally, so explicit "think step by step" instructions help less and sometimes hurt by interfering with what the model would have done anyway. Much of the accumulated prompt-engineering advice is now model-specific and dated. The parts that transfer are the ones that were never really about the model: be specific about the output format, give the model somewhere to put uncertainty, and provide the context it needs. The parts that do not transfer are the tricks. I would treat any prompting claim older than a year as a hypothesis to re-test rather than a technique.',
      isCaseBased: false,
    },
    {
      question: 'How do you manage prompts in production?',
      answer:
        'As code, because that is what they are. Version control, so a change is reviewable and revertible. A test suite of input-output pairs, run on every change, because a prompt edit that fixes one case routinely breaks three others and you will not otherwise know. Separation of the template from the data, so injected content is clearly delimited. And logging of the fully rendered prompt with each response, because debugging a production failure without the exact prompt is guesswork. I would also treat model version changes as prompt-breaking changes and re-run the suite, since the same prompt genuinely behaves differently across model versions.',
      isCaseBased: true,
    },
    {
      question: 'What is self-consistency and when is it worth it?',
      answer:
        'Sample several chain-of-thought paths at non-zero temperature and take the majority answer. It works because incorrect reasoning paths tend to disagree with each other while correct ones converge, so the mode is more reliable than any single sample. It reliably improves accuracy on reasoning tasks and the cost is linear in the number of samples — five samples is five times the cost. So it is worth it where accuracy dominates cost and the task has a discrete answer that can be voted on, which is the constraint people forget: it does not apply to open-ended generation, where there is no majority to take. For those, a judge or critique pass is the analogous move.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Why CoT works', back: 'Fixed work per token. Intermediate tokens give MORE FORWARD PASSES to compute in. The reasoning is the computation, not the explanation.' },
    { front: 'The published gains', back: 'PaLM 540B: GSM8K 17.9% → 58.1% (+40.2). SVAMP 69.9% → 79.0% (+9.1). The gain tracks the number of steps needed.' },
    { front: 'What few-shot teaches', back: 'FORMAT, label space, input distribution. Random labels in the examples barely hurt — they are a specification, not training data.' },
    { front: 'What few-shot costs', back: 'Resent every call. 20-shot at 300 tokens each = 6,200 prompt tokens against 200 zero-shot, forever. Returns flatten at 3–8.' },
    { front: 'The four durable techniques', back: 'Specify the output format precisely. Give uncertainty somewhere to go. Instructions at both ends of a long prompt. Prefill the response.' },
    { front: 'Self-consistency', back: 'Sample several CoT paths, take the majority. Wrong paths disagree; right ones converge. Linear cost, discrete answers only.' },
    { front: 'CoT is not faithful', back: 'Models produce reasoning that does not match what drove the answer — including when a biasing cue changes it unmentioned. Not an audit trail.' },
    { front: 'Prompts are code', back: 'Version control, a test suite of input-output pairs, evaluation on every change — including model version changes.' },
  ],
  mindmapMarkdown: `- Prompting
  - Why chain-of-thought works
    - fixed work per token
    - intermediate tokens = MORE FORWARD PASSES
    - the reasoning IS the computation
    - PaLM GSM8K 17.9% -> 58.1% (+40.2)
    - SVAMP 69.9% -> 79.0% (+9.1): fewer steps, smaller gain
  - Few-shot
    - teaches FORMAT, label space, input distribution
    - random labels barely hurt performance
    - a specification, not training data
    - order matters; bias toward the last label
    - returns flatten at 3-8
    - 20-shot = 6,200 tokens vs 200, on every call
  - What works
    - specify the output format precisely
    - give uncertainty somewhere to go
    - instructions at both ends of a long prompt
    - self-consistency: majority over sampled paths
    - prefill the response to force JSON
  - Failure modes
    - CoT is NOT a faithful explanation
    - reasoning models changed the advice
    - prompt injection is unsolved by wording
    - prompts are CODE: version, test, evaluate`,
}

export default m
