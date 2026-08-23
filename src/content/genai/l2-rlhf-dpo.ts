import type { Module } from '../types'

const m: Module = {
  id: 'genai-l2-rlhf-dpo',
  subjectId: 'genai',
  level: 2,
  title: 'RLHF and DPO: Learning From Preferences',
  whyItMatters:
    'A pretrained model predicts likely text, not helpful text — those are different things, and no amount of next-token training closes the gap. Preference learning is how a base model becomes an assistant, and DPO showed the reinforcement learning was optional.',
  assumes: [
    'You have read *Fine-Tuning and LoRA*',
    'You know what a log-likelihood is',
  ],
  estMinutes: 20,
  sections: [
    {
      type: 'intuition',
      title: 'The gap next-token prediction cannot close',
      md: `A pretrained model completes text. Ask it a question and a perfectly good continuation is another question — because that is what a list of questions looks like on the internet.

Supervised fine-tuning on instruction-response pairs fixes the format. It does not fix quality, because there is no single correct response to imitate and the loss cannot express "this answer is better than that one".

**Preference data can.** Show a human two responses and ask which is better. That comparison is far easier and more reliable to collect than an absolute rating, and it is exactly the signal the loss was missing.

The question is what to do with it, and there are two answers: build a reward model and optimise against it, or optimise the preferences directly.`,
    },
    {
      type: 'note',
      label: 'The RLHF pipeline, and where each part hurts',
      md: `**One.** Supervised fine-tune on demonstrations, to get the format and a reasonable starting policy.

**Two.** Collect preference pairs and train a **reward model** — the same architecture with a scalar head, trained so that the chosen response scores higher than the rejected one. This is where the human labour is, and where its noise enters: annotator agreement on preference tasks is commonly around 70%.

**Three.** Optimise the policy against the reward model with **PPO**, plus a **KL penalty** against the SFT model to stop it drifting.

That KL term is not a detail. Without it the policy finds inputs the reward model scores highly and real humans do not — **reward hacking** — and the classic symptom is responses that become long, hedging and repetitive, because the reward model learned that longer answers were usually preferred.

The pipeline works and is genuinely painful: four models in memory at once (policy, reference, reward, value), and PPO is notoriously sensitive to hyperparameters.`,
    },
    {
      type: 'math',
      intro:
        'The two objectives. The first is what RLHF maximises: reward, minus a KL penalty for straying from the reference model. The second is DPO, and the substitution that makes it work — the optimal policy for the first objective can be written in terms of the policy itself, so the reward model cancels out and only a log-probability ratio remains.',
      latex: [
        '\\max_{\\pi} \\; \\mathbb{E}\\bigl[r(x, y)\\bigr] - \\beta\\, D_{KL}\\bigl(\\pi \\,\\|\\, \\pi_{\\text{ref}}\\bigr)',
        'L_{DPO} = -\\log \\sigma\\!\\left(\\beta \\log\\frac{\\pi(y_w \\mid x)}{\\pi_{\\text{ref}}(y_w \\mid x)} - \\beta \\log\\frac{\\pi(y_l \\mid x)}{\\pi_{\\text{ref}}(y_l \\mid x)}\\right)',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The DPO loss, and what the margin does to it',
      code: `import math

def dpo(beta, margin):
    z = beta * margin
    p = 1 / (1 + math.exp(-z))
    return -math.log(p), 1 - p          # loss, and the weight on the gradient

print('beta = 0.1')
print(' margin     loss   gradient weight')
for margin in [-2.0, -0.5, 0.0, 0.5, 2.0, 10.0]:
    l, g = dpo(0.1, margin)
    print(' %6.1f %8.4f %13.4f' % (margin, l, g))

# ---- real output ----
# beta = 0.1
#  margin     loss   gradient weight
#   -2.0   0.7981        0.5498
#   -0.5   0.7185        0.5125
#    0.0   0.6931        0.5000
#    0.5   0.6685        0.4875
#    2.0   0.5981        0.4502
#   10.0   0.3133        0.2689`,
      annotations: {
        3: 'The margin is how much more the policy prefers the chosen response than the reference model does, minus the same quantity for the rejected one. Positive means the update is going the right way.',
        14: 'At margin 0 the loss is exactly ln(2) = 0.6931, which is the DPO equivalent of the initial-loss check: an untrained policy identical to the reference must print this.',
        16: 'The gradient weight falls as the margin grows — 0.5498 at −2 down to 0.2689 at +10. Pairs the policy already gets right contribute less, so the update automatically concentrates on the ones it does not, exactly as focal loss does.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'What β actually controls',
      code: `for beta in [0.01, 0.1, 0.5]:
    print('beta=%.2f:  loss at margin +2 = %.4f   at margin -2 = %.4f'
          % (beta, dpo(beta, 2.0)[0], dpo(beta, -2.0)[0]))

# ---- real output ----
# beta=0.01:  loss at margin +2 = 0.6832   at margin -2 = 0.7032
# beta=0.10:  loss at margin +2 = 0.5981   at margin -2 = 0.7981
# beta=0.50:  loss at margin +2 = 0.3133   at margin -2 = 1.3133`,
      annotations: {
        4: 'At β = 0.01 the same margin of ±2 barely moves the loss — 0.6832 against 0.7032. The gradient is tiny, so the policy stays close to the reference and barely learns the preferences.',
        6: 'At β = 0.5 the same margins give 0.3133 and 1.3133, a range four times wider. The policy moves hard toward the preferences and away from the reference, which is where degeneration starts.',
        5: 'β is the same knob as the KL coefficient in RLHF: how much drift from the reference you will tolerate to satisfy the preferences. 0.1 is the usual starting point, and it is the hyperparameter that matters most.',
      },
    },
    {
      type: 'note',
      label: 'Why DPO removed the reward model',
      md: `The derivation is the interesting part. For the KL-constrained reward objective, the optimal policy has a closed form in terms of the reward and the reference policy. Rearrange it and you can write the **reward in terms of the policy** — so substituting into the preference likelihood makes the reward model cancel entirely.

What remains is a **classification loss on preference pairs**, using only the policy and a frozen reference. No reward model, no PPO, no value network, no sampling during training. Two models in memory instead of four, and a stable supervised objective instead of an unstable RL one.

DPO is now the default for most open-source alignment work, for straightforward practical reasons rather than a claim of superiority.

The honest counterpoints: RLHF may still edge ahead at frontier scale with a well-tuned setup, and PPO's online sampling means it explores responses the fixed preference dataset never contained, which DPO cannot. Online and iterative DPO variants exist precisely to recover that.`,
    },
    {
      type: 'note',
      label: 'What preference learning does not fix',
      md: `**It optimises for what annotators liked, not for what is true.** If human raters prefer confident answers, the model becomes more confident — including when it is wrong. Sycophancy and verbosity are both documented consequences, and both are the system working as specified.

**The alignment tax** is real: instruction-tuned models often score slightly worse on raw capability benchmarks than their base models. You are trading a little capability for a great deal of usability.

**Preference data is expensive and noisy.** Annotator agreement around 70% puts a ceiling on the reward signal, and no amount of optimisation extracts more than the labels contain.

**RLAIF** — using a strong model to generate the preferences instead of humans — is now widespread and works surprisingly well, with the obvious caveat that you are distilling the judge model's values along with its judgements. **Constitutional AI** formalises this by having the model critique its own outputs against a written set of principles.`,
    },
  ],
  quiz: [
    {
      question: 'Why does supervised fine-tuning on instruction pairs not produce a good assistant?',
      options: [
        { text: 'It needs more data', explanation: 'More imitation data does not create a notion of better.' },
        { text: 'It fixes the format but cannot express "this answer is better than that one" — there is no single correct response to imitate', explanation: 'Correct, and that is exactly the gap preference data fills.' },
        { text: 'It causes catastrophic forgetting', explanation: 'A separate risk, and not the reason.' },
        { text: 'The loss is the wrong one for text', explanation: 'Cross-entropy is right for imitation; imitation is the limit.' },
      ],
      correct: 1,
    },
    {
      question: 'What is the KL penalty in RLHF for?',
      options: [
        { text: 'To speed up convergence', explanation: 'It constrains rather than accelerates.' },
        { text: 'To stop the policy drifting to inputs the reward model scores highly and humans do not — reward hacking', explanation: 'Correct, and the classic symptom is long, hedging, repetitive answers.' },
        { text: 'To normalise the reward', explanation: 'Reward normalisation is a separate technique.' },
        { text: 'To reduce memory', explanation: 'It requires keeping a reference model, which adds memory.' },
      ],
      correct: 1,
    },
    {
      question: 'The DPO loss at margin 0 is exactly 0.6931. Why is that useful?',
      options: [
        { text: 'It shows the loss is bounded', explanation: 'The loss is unbounded above.' },
        { text: 'It is ln(2) — the value an untrained policy identical to the reference must print, so it is an initial-loss sanity check', explanation: 'Correct, the same kind of check as ln(C) for a classifier.' },
        { text: 'It means training has converged', explanation: 'It means training has not started.' },
        { text: 'It sets β', explanation: 'It holds for any β at margin 0.' },
      ],
      correct: 1,
    },
    {
      question: 'The gradient weight fell from 0.5498 at margin −2 to 0.2689 at +10. What does that behaviour resemble?',
      options: [
        { text: 'Gradient clipping', explanation: 'Clipping bounds magnitude uniformly.' },
        { text: 'Focal loss — pairs the policy already gets right contribute less, so the update concentrates on the ones it does not', explanation: 'Correct, and it happens automatically from the sigmoid.' },
        { text: 'Weight decay', explanation: 'Unrelated.' },
        { text: 'Early stopping', explanation: 'Unrelated.' },
      ],
      correct: 1,
    },
    {
      question: 'β = 0.01 gave losses of 0.6832 and 0.7032 at margins ±2; β = 0.5 gave 0.3133 and 1.3133. What is β?',
      options: [
        { text: 'A learning rate', explanation: 'It multiplies the margin inside the loss, not the update size.' },
        { text: 'How much drift from the reference you will tolerate to satisfy the preferences — the same knob as RLHF\'s KL coefficient', explanation: 'Correct, and 0.1 is the usual starting point.' },
        { text: 'The preference-data noise level', explanation: 'It is a hyperparameter, not a data property.' },
        { text: 'The rank of the adapter', explanation: 'Unrelated to LoRA.' },
      ],
      correct: 1,
    },
    {
      question: 'How does DPO eliminate the reward model?',
      options: [
        { text: 'It approximates the reward with a heuristic', explanation: 'Nothing is approximated.' },
        { text: 'The optimal policy for the KL-constrained objective can be rearranged to express the reward in terms of the policy, so the reward cancels out of the preference likelihood', explanation: 'Correct — what remains is a classification loss on pairs using only the policy and a frozen reference.' },
        { text: 'It uses the base model as the reward model', explanation: 'No reward model appears at all.' },
        { text: 'It trains the reward model jointly', explanation: 'There is none to train.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why is RLHF needed at all?',
      answer:
        'Because a pretrained model predicts likely text and likely is not the same as helpful. Ask a base model a question and a perfectly good continuation is another question, since that is what a list of questions looks like on the internet. Supervised fine-tuning on instruction-response pairs fixes the format, but it cannot fix quality: there is no single correct response to imitate and cross-entropy cannot express "this answer is better than that one". Preference data can — showing a human two responses and asking which is better is both easier and more reliable to collect than absolute ratings, and it is exactly the comparative signal the imitation loss was missing.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through the RLHF pipeline.',
      answer:
        'Three stages. Supervised fine-tune on demonstrations to get the format and a reasonable starting policy. Then collect preference pairs and train a reward model — the same architecture with a scalar head, trained so the chosen response outscores the rejected one — which is where the human labour and its noise enter. Then optimise the policy against that reward with PPO, plus a KL penalty against the SFT model. That KL term is essential rather than decorative: without it the policy finds inputs the reward model scores highly and humans do not, and the classic symptom is answers becoming long, hedging and repetitive because the reward model learned length correlated with preference. The pipeline works and is painful — four models in memory, and PPO is notoriously hyperparameter-sensitive.',
      isCaseBased: false,
    },
    {
      question: 'What is DPO and why did it displace RLHF?',
      answer:
        'It optimises the preferences directly, with no reward model. The derivation is the point: for the KL-constrained reward objective, the optimal policy has a closed form, and rearranging it lets you write the reward in terms of the policy — so substituting into the preference likelihood makes the reward model cancel entirely. What remains is a classification loss on preference pairs using only the policy and a frozen reference. That means two models in memory instead of four, no value network, no sampling during training, and a stable supervised objective in place of an unstable RL one. It displaced RLHF in open-source work for those practical reasons rather than any claim of superiority.',
      isCaseBased: true,
    },
    {
      question: 'What does β control in DPO?',
      answer:
        'How much drift from the reference model you will tolerate in order to satisfy the preferences — it is the same knob as RLHF\'s KL coefficient. The effect is direct: at β = 0.01, margins of plus and minus 2 give losses of 0.6832 and 0.7032, so the gradient is tiny and the policy barely moves. At β = 0.5 the same margins give 0.3133 and 1.3133, four times the range, and the policy moves hard toward the preferences and away from the reference, which is where degeneration starts. 0.1 is the usual starting point and it is the hyperparameter that matters most — more than the learning rate, in my experience of reading reported results.',
      isCaseBased: true,
    },
    {
      question: 'What is reward hacking and how do you detect it?',
      answer:
        'The policy finding inputs that score highly under the reward model but that humans would not actually prefer — an optimiser doing exactly its job against an imperfect proxy. The canonical symptom is length: reward models frequently learn that longer answers were preferred, so the policy becomes verbose, hedging and repetitive. Detection means not trusting the reward curve, which will look excellent throughout: I would watch the KL divergence from the reference, monitor response length distribution, and run human or strong-judge evaluation on held-out prompts periodically during training rather than only at the end. The mitigations are the KL penalty, early stopping on human evaluation, and retraining the reward model on fresh data from the current policy.',
      isCaseBased: true,
    },
    {
      question: 'What is RLAIF and does it work?',
      answer:
        'Using a strong model to generate the preference labels instead of humans. It works surprisingly well — published comparisons find AI preferences producing results close to human ones on many tasks, at a tiny fraction of the cost and with far better consistency, since annotator agreement on human preference tasks is commonly around 70%. Constitutional AI formalises it further by having the model critique and revise its own outputs against a written set of principles. The caveat to state plainly is that you are distilling the judge model\'s values and biases along with its judgements, so it cannot exceed the judge, and it makes the whole system\'s behaviour inherit whatever the judge was aligned to.',
      isCaseBased: false,
    },
    {
      question: 'What is the alignment tax?',
      answer:
        'Instruction-tuned models often score slightly worse on raw capability benchmarks than the base models they came from — you trade a little capability for a great deal of usability. Some of it is genuine: constraining the model to be helpful, harmless and honest removes response space it was previously free to use. Some of it is measurement: base models are evaluated with few-shot prompting that instruction-tuned models handle differently, so part of the gap is benchmark mismatch rather than capability loss. The practical response is to evaluate on the deployment task rather than on general benchmarks, and to mix general instruction data into alignment training to limit the drift.',
      isCaseBased: false,
    },
    {
      question: 'What are the limits of preference learning?',
      answer:
        'It optimises for what annotators liked, which is not the same as what is true or good. If raters prefer confident answers the model becomes more confident, including when wrong — sycophancy and verbosity are documented consequences and both are the system working as specified. The signal also has a ceiling: annotator agreement around 70% means the labels contain a bounded amount of information and no optimisation extracts more than that. And preferences are collected from a specific population on a specific distribution of prompts, so the values encoded are those annotators\' values on those prompts. That is worth saying explicitly, because "aligned" sounds like a property of the model when it is a property of a labelling process.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'The gap', back: 'Pretraining predicts LIKELY text; SFT fixes format. Neither can say "this answer is better" — preference pairs can.' },
    { front: 'The RLHF pipeline', back: 'SFT → reward model on preference pairs → PPO against it with a KL penalty. Four models in memory, and PPO is hyperparameter-sensitive.' },
    { front: 'Reward hacking', back: 'The policy finds inputs the reward model likes and humans do not. Classic symptom: long, hedging, repetitive answers, because length correlated with preference.' },
    { front: 'The DPO trick', back: 'The optimal policy for the KL-constrained objective can be rearranged to express the REWARD in terms of the POLICY — so the reward model cancels out.' },
    { front: 'What is left', back: 'A classification loss on preference pairs, using only the policy and a frozen reference. Two models, no PPO, no sampling.' },
    { front: 'The ln(2) check', back: 'DPO loss at margin 0 is exactly 0.6931. An untrained policy identical to the reference must print this.' },
    { front: 'The focal-loss behaviour', back: 'Gradient weight falls from 0.5498 at margin −2 to 0.2689 at +10. Pairs already right contribute less, automatically.' },
    { front: 'β', back: 'How much drift from the reference you tolerate. β=0.01: ±2 gives 0.6832/0.7032, barely moves. β=0.5: 0.3133/1.3133. Start at 0.1.' },
  ],
  mindmapMarkdown: `- RLHF and DPO
  - The gap
    - pretraining predicts LIKELY, not helpful
    - SFT fixes format, not quality
    - no single correct response to imitate
    - preference pairs supply the comparison
  - RLHF
    - SFT -> reward model -> PPO + KL penalty
    - KL is essential: without it, reward hacking
    - symptom: long, hedging, repetitive
    - four models in memory, PPO is fragile
    - annotator agreement ~70% caps the signal
  - DPO
    - optimal policy has a closed form
    - rearrange: reward in terms of the POLICY
    - the reward model CANCELS
    - left with a classification loss on pairs
    - two models, no PPO, no sampling
    - margin 0 -> loss exactly ln(2) = 0.6931
    - gradient weight 0.5498 at -2, 0.2689 at +10
  - beta
    - drift tolerance = RLHF's KL coefficient
    - 0.01: 0.6832 / 0.7032, barely learns
    - 0.5: 0.3133 / 1.3133, degeneration risk
    - start at 0.1
  - Limits
    - optimises what annotators LIKED, not truth
    - sycophancy and verbosity are the spec working
    - alignment tax on raw benchmarks
    - RLAIF distils the judge's values too`,
}

export default m
