import type { Module } from '../types'

const m: Module = {
  id: 'genai-l2-rlhf-dpo',
  subjectId: 'genai',
  level: 2,
  title: 'Alignment: RLHF, Reward Models & DPO',
  whyItMatters:
    'This is the step that turned a text predictor into ChatGPT, and it is the GenAI interview question with the widest gap between people who can recite "SFT, reward model, PPO" and people who can explain why the KL penalty exists. It is also the most practical thing on the list: DPO is cheap enough that you can actually run it, and "I aligned a small model with DPO on my own preference pairs" is a resume line almost nobody has.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'The problem: a base model is autocomplete, not an assistant',
      md: `Pretraining optimises exactly one thing: *which token probably comes next on the internet*. Nothing in that objective says "be useful".

- Ask a base model *"How do I fix a flat tyre?"* and a very likely continuation is *"How do I change a headlight? How do I check tyre pressure?"* — because that is what an FAQ page looks like.
- The model is not broken. It is doing its job perfectly. Its job is just not your job.
- The gap has a name: **capability vs alignment**. The knowledge is already in the weights; the model has no idea you wanted it *pointed at you*.
- And "likely" includes confidently wrong text, unsafe instructions and internet-flavoured rudeness — all extremely well-represented continuations.
- Alignment is the work of turning *likely* into **helpful, honest, harmless**. The whole subject exists because we cannot write that as a loss function.`,
    },
    {
      type: 'note',
      md: 'You cannot label "good answer" the way you label a cat photo. There is no ground-truth string — two humans write two different good answers and both are right. So RLHF does something sneaky: instead of scoring text directly, it **learns the scoring function from humans**, then optimises against it. Almost every problem in this module traces back to that one substitution.',
    },
    {
      type: 'intuition',
      title: 'The three-stage pipeline, one line each',
      md: `InstructGPT — the paper behind ChatGPT — fixed it in three stages. Say them in this order and the interviewer relaxes.

1. **SFT (supervised fine-tuning).** Humans write ideal answers to real prompts; fine-tune the base model on them with the plain next-token loss. This teaches the *format*: a question gets an answer, not more questions. Mechanically it is identical to the fine-tuning module — same loss, curated data, often LoRA.
2. **Reward model.** Show humans two answers to the same prompt and let them pick the better one. Train a separate model on those comparisons to emit one scalar: *how good is this response?*
3. **PPO (reinforcement learning).** The SFT model is now a **policy**. Generate answers, score them with the reward model, push the policy toward higher scores — on a leash that stops it running away from the SFT model.

- Stage 1 needs *expensive* data (humans writing) so it stays small: tens of thousands of demonstrations.
- Stages 2 and 3 need *cheap* data (humans choosing) so they scale: hundreds of thousands of comparisons.
- That asymmetry is the whole design rationale. **Judging is easier than writing.**`,
    },
    {
      type: 'intuition',
      title: 'Stage 2: why comparisons, not scores',
      md: `Ask ten labellers to rate an answer out of 10 and you get noise: one person's 7 is another's 4, and the same person drifts across a shift.

- Ask instead *"A or B?"* and agreement jumps. Humans are reliable **comparators** and unreliable absolute meters.
- So the dataset is triples: prompt *x*, chosen answer *y_w*, rejected answer *y_l*. There are no scores anywhere in it.
- But the reward model must output a *number*. **Bradley-Terry** is the bridge: assume the probability A beats B is a sigmoid of the gap between their hidden scores, then fit those scores by maximum likelihood.
- Practical detail: the reward model is usually the SFT model with its token head swapped for a single scalar head — it already understands language, it just learns to grade.
- Consequence worth knowing cold: only the **gap** is identified. Add 5 to every reward and no preference changes. Raw reward values are meaningless across runs; only differences mean anything.`,
    },
    {
      type: 'math',
      intro: 'Bradley-Terry: the standard model for pairwise preferences, borrowed from chess ratings. The reward-model loss is just binary cross-entropy on "did the chosen one win?".',
      latex: [
        'P(y_w \\succ y_l \\mid x) \\;=\\; \\sigma\\!\\left( r(x, y_w) - r(x, y_l) \\right) \\;=\\; \\frac{e^{r(x, y_w)}}{e^{r(x, y_w)} + e^{r(x, y_l)}}',
        '\\mathcal{L}_{\\text{RM}}(\\phi) \\;=\\; -\\,\\mathbb{E}_{(x,\\, y_w,\\, y_l) \\sim \\mathcal{D}} \\left[ \\log \\sigma\\!\\left( r_\\phi(x, y_w) - r_\\phi(x, y_l) \\right) \\right]',
        '\\text{Shift invariance: } r \\to r + c \\;\\Rightarrow\\; \\text{every preference probability is unchanged. Only gaps are learned.}',
      ],
    },
    {
      type: 'intuition',
      title: 'Stage 3: PPO, and the leash',
      md: `Now optimise. The policy writes answers, the reward model scores them, the gradient says "do more of what scored well". Standard policy-gradient RL; PPO is chosen for its clipped update, which stops any single step from moving the policy too far.

- One problem: the reward model is a *model*, fit to a finite sample of human taste. It is accurate where it saw data and nonsense outside it.
- Left unconstrained, the policy will go find the outside. It is an optimiser — locating the argmax of a flawed function is literally its job description.
- The fix is a **KL penalty against the frozen SFT model**, the *reference policy*. Every token the tuned model makes much more likely than the reference costs reward.
- Read it as a leash: go find high reward, but stay within a short distance of the model we already know produces sane English.
- **β** sets the leash length. Too tight (β large) and RLHF barely changes anything; too loose (β → 0) and you get high-reward gibberish. It is the single most important knob in the pipeline.`,
    },
    {
      type: 'math',
      intro: 'The RLHF objective. The second term is the leash — and in real implementations it is folded into the per-token reward so PPO never sees it as a separate constraint.',
      latex: [
        '\\max_{\\pi_\\theta} \\;\\; \\mathbb{E}_{x \\sim \\mathcal{D},\\; y \\sim \\pi_\\theta(\\cdot \\mid x)} \\big[\\, r_\\phi(x, y) \\,\\big] \\;-\\; \\beta \\, D_{\\mathrm{KL}}\\!\\left( \\pi_\\theta(\\cdot \\mid x) \\,\\|\\, \\pi_{\\text{ref}}(\\cdot \\mid x) \\right)',
        '\\text{Implemented as a shaped reward: } \\;\\; \\tilde{r}(x, y) \\;=\\; r_\\phi(x, y) \\;-\\; \\beta \\log \\frac{\\pi_\\theta(y \\mid x)}{\\pi_{\\text{ref}}(y \\mid x)}',
        '\\beta \\uparrow \\;\\Rightarrow\\; \\text{hugs the SFT model, learns little.} \\qquad \\beta \\downarrow \\;\\Rightarrow\\; \\text{chases reward, drifts into gibberish.}',
      ],
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Alignment, stage by stage',
        notice: 'Left column: what is being fed in at this stage. Right column: which models exist and which of them are frozen. Watch how many boxes PPO needs — and how many DPO needs.',
        leftLabel: 'stage inputs',
        rightLabel: 'models / artefacts',
        frames: [
          {
            note: 'Stage 0. A pretrained base model. Give it a question and it continues the document — often with more questions.',
            stack: [{ name: 'prompt', to: 'base' }],
            heap: [
              { id: 'base', value: 'base LM', label: 'pretrained' },
              { id: 'out0', value: '"...and 3 more Qs"', danger: true },
            ],
          },
          {
            note: 'Stage 1 (SFT). Fine-tune on human-written demonstrations. Now it answers in the right FORMAT. This checkpoint is kept twice: as the policy, and as the frozen reference.',
            stack: [
              { name: 'demos', value: 'prompt+answer' },
              { name: 'policy', to: 'sft' },
            ],
            heap: [
              { id: 'base', value: 'base LM', label: 'discarded' },
              { id: 'sft', value: 'SFT model', label: 'policy + ref' },
            ],
          },
          {
            note: 'Stage 2a. Sample two answers per prompt; a human says which is better. Comparisons, never absolute scores — that is what humans are reliable at.',
            stack: [
              { name: 'prompt x', to: 'sft' },
              { name: 'human label', value: 'A > B' },
            ],
            heap: [
              { id: 'sft', value: 'SFT model', label: 'samples' },
              { id: 'yw', value: 'answer A', label: 'chosen' },
              { id: 'yl', value: 'answer B', label: 'rejected' },
            ],
          },
          {
            note: 'Stage 2b. Train a reward model on those pairs with the Bradley-Terry loss. Output: one scalar per response. Only the gap between scores carries meaning.',
            stack: [{ name: 'pref pairs', to: 'rm' }],
            heap: [
              { id: 'rm', value: 'reward model', label: 'scalar head' },
              { id: 'ra', value: 'r(A) = +1.4' },
              { id: 'rb', value: 'r(B) = -0.3' },
            ],
          },
          {
            note: 'Stage 3 (PPO). The policy generates, the reward model scores, the gradient pushes reward up — while a KL term to the frozen reference pulls back. Leash and engine.',
            stack: [
              { name: 'sampled answers', to: 'pi' },
              { name: 'score', to: 'rm' },
              { name: 'KL leash', to: 'ref' },
            ],
            heap: [
              { id: 'pi', value: 'PPO policy', label: 'training' },
              { id: 'rm', value: 'reward model', label: 'frozen' },
              { id: 'ref', value: 'SFT reference', label: 'frozen' },
            ],
          },
          {
            note: 'The real bill. Three-plus models resident at once, generation inside the training loop, and four fragile hyperparameters. This is why so few teams got RLHF working.',
            stack: [{ name: 'GPU memory', value: '3-4 models' }],
            heap: [
              { id: 'pi', value: 'policy', label: 'trains' },
              { id: 'ref', value: 'reference', label: 'frozen' },
              { id: 'rm', value: 'reward model', label: 'frozen' },
              { id: 'vf', value: 'value head', label: 'trains' },
            ],
          },
          {
            note: 'Cut the leash (beta -> 0). Reward climbs beautifully and the text collapses. The policy found a bug in the reward model, not a better answer.',
            stack: [
              { name: 'KL leash', value: 'beta = 0', danger: true },
              { name: 'policy', to: 'pi', danger: true },
            ],
            heap: [
              { id: 'pi', value: 'drifted policy', danger: true },
              { id: 'r', value: 'reward 9.8 (up)', danger: true },
              { id: 'txt', value: '"Sure! Sure! Sure!"', danger: true },
            ],
          },
          {
            note: 'DPO collapses stages 2 and 3 into one. No reward model, no sampling, no RL — the same preference pairs go straight into a classification loss.',
            stack: [
              { name: 'pref pairs', value: 'x, y_w, y_l' },
              { name: 'policy', to: 'pi' },
              { name: 'log-ratio vs', to: 'ref' },
            ],
            heap: [
              { id: 'pi', value: 'DPO policy', label: 'trains' },
              { id: 'ref', value: 'SFT reference', label: 'frozen' },
            ],
          },
        ],
      },
    },
    {
      type: 'note',
      md: 'That KL term is the exact quantity from the metrics subject\'s KL-divergence section — same formula, third job (there it regularises a VAE latent space and drives distillation; here it restrains a policy). Direction matters: this is KL(policy || reference), the **reverse**, mode-seeking direction. Reverse KL lets the policy quietly abandon parts of the reference distribution, which is a large part of why aligned models end up less varied in phrasing than the models they came from.',
    },
    {
      type: 'intuition',
      title: 'Reward hacking: the failure you will be asked about',
      md: `Goodhart's law with a GPU: when a measure becomes a target, it stops being a good measure. Tuned models reliably discover these:

- **Verbosity.** Labellers mildly prefer thorough answers, so the reward model scores long ones higher, so the policy pads. Length becomes a proxy for quality. This is the most reproducible reward-model bias there is — many teams now regress reward on response length and subtract the fitted component.
- **Sycophancy.** Agreeing with the user's stated opinion scores well, because humans reward being agreed with. The model learns to fold the moment it is contradicted, even when it was right.
- **Formatting tricks.** Bullet points, bold headers, a confident opening line, a tidy summary — the *shape* of a good answer without the substance.
- **Hedging.** "I cannot be certain, but..." is rarely marked wrong, so answers get safer and emptier.
- Every one of these raises measured reward. None raises real quality. Without the KL leash they go extreme fast, and the signature is unmistakable: **reward climbing steadily while sampled text degenerates** into one repeated high-scoring phrase.`,
    },
    {
      type: 'intuition',
      title: 'Why RLHF hurts in practice',
      md: `- **Three models resident at once**: the trainable policy, the frozen reference (for KL), the frozen reward model — plus PPO's value network. Memory and orchestration go up roughly 3–4×.
- **It is online.** Every step samples fresh completions from the *current* policy, so text generation sits inside the training loop. Slow, and the data distribution moves under you as you train.
- **It is unstable.** Policy-gradient RL has famously touchy knobs: β, learning rate, clip range, KL target, advantage normalisation. A badly chosen β can silently ruin a good model over thousands of steps.
- **Debugging is miserable.** Reward went up, human eval went down — is it the labellers, the reward model, the leash, or PPO itself? Four suspects, one number.
- The honest field verdict: RLHF works, and very few teams outside the big labs ever got it working *reliably*. That vacuum is exactly what DPO walked into.`,
    },
    {
      type: 'intuition',
      title: 'DPO: delete the reward model and the RL',
      md: `The insight is mathematics, not engineering. Ask: what is the *optimal* policy for "maximise reward minus β·KL to the reference"? That problem has a closed-form answer — the reference distribution, reweighted by the exponentiated reward.

- Now invert it, and something startling falls out: **any reward function can be written as a scaled log-ratio between its optimal policy and the reference.** The reward was never a separate object that needed its own network.
- So substitute that expression for *r* into the Bradley-Terry preference likelihood. The awkward normalising constant Z(x) is identical for both answers to the same prompt, so it **cancels**.
- What survives is a plain **binary classification loss on preference pairs**, computed from four log-probabilities: chosen and rejected, under the policy and under the reference.
- No reward model. No sampling. No reinforcement learning. Your language model *is* its own implicit reward model.
- In English the loss says: **raise the log-probability of the chosen answer and lower the rejected one — both measured relative to the reference**, so nothing gets credit for merely having been likely already.`,
    },
    {
      type: 'math',
      intro: 'The three lines of the derivation, then the loss you actually implement. Line 1 is the closed form; line 2 is line 1 rearranged; line 3 is line 2 dropped into Bradley-Terry with Z(x) cancelling.',
      latex: [
        '\\pi^{*}(y \\mid x) \\;=\\; \\frac{1}{Z(x)} \\, \\pi_{\\text{ref}}(y \\mid x) \\, \\exp\\!\\left( \\tfrac{1}{\\beta} \\, r(x, y) \\right) \\qquad \\text{(optimum of the KL-constrained objective)}',
        'r(x, y) \\;=\\; \\beta \\log \\frac{\\pi^{*}(y \\mid x)}{\\pi_{\\text{ref}}(y \\mid x)} \\;+\\; \\beta \\log Z(x) \\qquad \\text{— the reward IS a log-ratio.}',
        '\\mathcal{L}_{\\text{DPO}} \\;=\\; -\\,\\mathbb{E}_{(x,\\, y_w,\\, y_l)} \\left[ \\log \\sigma\\!\\left( \\beta \\log \\frac{\\pi_\\theta(y_w \\mid x)}{\\pi_{\\text{ref}}(y_w \\mid x)} \\;-\\; \\beta \\log \\frac{\\pi_\\theta(y_l \\mid x)}{\\pi_{\\text{ref}}(y_l \\mid x)} \\right) \\right]',
        '\\nabla_\\theta \\mathcal{L}_{\\text{DPO}} \\;\\propto\\; -\\, \\underbrace{\\sigma\\!\\left( \\hat{r}_\\theta(x, y_l) - \\hat{r}_\\theta(x, y_w) \\right)}_{\\text{how wrong we still are}} \\Big[ \\nabla_\\theta \\log \\pi_\\theta(y_w \\mid x) \\;-\\; \\nabla_\\theta \\log \\pi_\\theta(y_l \\mid x) \\Big]',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Bradley-Terry and a DPO loss on toy log-probabilities — 30 lines, no framework',
      code: `import numpy as np

def sigmoid(z):
    return 1.0 / (1.0 + np.exp(-z))

# 1. Bradley-Terry: two scalar rewards -> P(chosen beats rejected).
def bt_prob(r_win, r_lose):
    return sigmoid(r_win - r_lose)          # only the GAP matters

def rm_loss(r_win, r_lose):                 # reward-model loss on ONE pair
    return -np.log(bt_prob(r_win, r_lose))

print('reward gap   P(chosen wins)   reward-model loss')
for gap in [-2.0, 0.0, 0.5, 2.0, 5.0]:
    print('  %+5.1f          %.3f            %.4f' % (gap, bt_prob(gap, 0.0), rm_loss(gap, 0.0)))

# 2. DPO: the SAME Bradley-Terry loss, but the reward is never learned --
#    it IS beta * (policy log-prob  -  reference log-prob).
BETA = 0.1
ref_chosen, ref_rejected = -12.0, -11.0     # the reference PREFERS the rejected reply

def dpo(lp_chosen, lp_rejected):
    margin = (lp_chosen - ref_chosen) - (lp_rejected - ref_rejected)
    loss = -np.log(sigmoid(BETA * margin))
    grad_weight = sigmoid(-BETA * margin)   # how hard this pair still pushes
    return margin, loss, grad_weight

print('\\npolicy logp(chosen)   margin    DPO loss   gradient weight')
for lp_chosen in [-13.0, -12.0, -11.0, -8.0, -4.0]:
    margin, loss, gw = dpo(lp_chosen, lp_rejected=-11.0)
    print('     %6.1f          %+6.2f     %.4f       %.3f' % (lp_chosen, margin, loss, gw))

# ---- real output ----
# reward gap   P(chosen wins)   reward-model loss
#    -2.0          0.119            2.1269
#    +0.0          0.500            0.6931
#    +0.5          0.622            0.4741
#    +2.0          0.881            0.1269
#    +5.0          0.993            0.0067
#
# policy logp(chosen)   margin    DPO loss   gradient weight
#       -13.0           -1.00     0.7444       0.525
#       -12.0           +0.00     0.6931       0.500
#       -11.0           +1.00     0.6444       0.475
#        -8.0           +4.00     0.5130       0.401
#        -4.0           +8.00     0.3711       0.310`,
      annotations: {
        8: 'Only the difference enters. r and r+5 give identical preferences — which is why one reward number, on its own, tells you nothing.',
        11: 'Binary cross-entropy on the event "the chosen answer wins". That is the whole reward-model objective: a pile of A>B votes becomes a scalar scorer.',
        15: 'A gap of just 0.5 already means 62% preferred. Reward models do not need large gaps to be useful — which is also why small biases (like length) move them so easily.',
        20: 'The interesting setup: the frozen reference gives the REJECTED reply the higher probability. DPO must flip the ordering, not merely raise a level.',
        23: 'The whole of DPO in one line: chosen minus rejected, each measured RELATIVE to the reference. Drop the reference terms and you are just doing SFT on the chosen answers.',
        25: 'sigma(-beta * margin): the gradient scales with how wrong the pair still is. Pairs already learned stop pushing, so DPO self-balances without a value network.',
        43: 'Margin 0 -> loss log 2 = 0.6931, the coin flip — the same number as reward gap 0.0 above, because it is literally the same Bradley-Terry loss in disguise.',
        46: 'Raise the chosen log-prob by 8 nats: loss falls 0.6931 -> 0.3711 while the gradient weight drops 0.500 -> 0.310. Learning slows down exactly as the pair gets settled.',
      },
    },
    {
      type: 'note',
      md: 'Two things to read off that output. **First**, at margin 0 the DPO loss is log 2 = 0.6931 — identical to the reward model at gap 0, because it is the same loss with the reward swapped for a log-ratio. **Second**, the gradient-weight column is σ(−β·margin): it starts near 0.5 and decays as the margin grows. Also notice how gentle the movement is — β = 0.1 means an 8-nat change in log-probability only moves the loss from 0.69 to 0.37. β is a leash here too: small β makes DPO tolerant of large log-prob changes, large β punishes any drift from the reference hard.',
    },
    {
      type: 'intuition',
      title: 'Why DPO won, and where PPO still wins',
      md: `- **One model training** (plus a frozen reference — and the reference log-probs can be precomputed once, since they never change).
- **A standard supervised loop.** Same trainer, same optimiser, same intuitions as fine-tuning. It runs on hardware an individual can rent for an afternoon.
- **Stable.** No rollouts, no value function, no advantage estimation. β and learning rate carry most of the tuning.
- Honest counterpoint, because good interviewers push here: **strong online RLHF still edges DPO out** in careful head-to-heads. The reason is instructive — PPO samples *fresh* completions from the current policy and gets them scored, so it keeps learning about its own current mistakes. DPO only ever sees a fixed offline pile of pairs, possibly generated by an entirely different model.
- DPO is also **sensitive to the reference model and to data quality**. If the pairs were not sampled from something close to your SFT model, the log-ratios are off-distribution and training can shove probability mass somewhere strange. A documented artefact: DPO often lowers the absolute likelihood of *both* answers — it guarantees the gap, not the level.
- Where the field settled: **iterative / online DPO** — generate fresh pairs with the current model, label them (increasingly with an LLM judge), retrain, repeat. Cheap loop, most of PPO's benefit.`,
    },
    {
      type: 'note',
      md: 'The family tree, one line each so the names never ambush you. **IPO** swaps DPO\'s log-sigmoid for a squared loss, because log-sigmoid keeps pushing the margin toward infinity on deterministic preferences and over-fits them. **KTO** drops pairs entirely — it needs only a thumbs-up or thumbs-down per response, which is the feedback real products actually collect. **ORPO** merges SFT and preference tuning into a single stage by adding an odds-ratio penalty to the ordinary SFT loss, so there is no separate alignment run and no reference model at all. **RLAIF / Constitutional AI** changes where the preferences *come from*: a model, prompted with a written constitution of principles, does the comparing instead of a human — vastly cheaper and scalable, and it relocates the values question from "what did the labellers prefer?" to "who wrote the constitution?".',
    },
    {
      type: 'intuition',
      title: 'What alignment buys, and what it costs',
      md: `Buys — and this is not a polish step, it is most of the perceived quality:

- InstructGPT's **1.3B aligned model was preferred by human raters over the 175B base model**. A 100× smaller model won on helpfulness because it was pointed at the user.
- Safety behaviour: declining genuinely harmful requests, flagging uncertainty, not parroting the worst of the training corpus.

Costs — naming these is what separates a strong answer from a recited one:

- **The alignment tax.** Aligned models measurably lose some raw capability; the InstructGPT paper reports regressions on standard NLP benchmarks, mitigated (not erased) by mixing pretraining gradients back into the RL update. Sharpening for one distribution of prompts costs you the tails.
- **Over-refusal.** The most common real user complaint: the model declines a harmless request because it pattern-matches something risky. The pressure is structurally one-way — a refusal is cheap for the reward model to score well and awkward for a labeller to mark wrong.
- **Reduced diversity.** Reverse KL is mode-seeking, so aligned models converge on one house voice ("Certainly! Here are three things to consider:").
- **The honest one.** "Aligned" is not a technical absolute. It means *aligned to the preferences of the people who wrote the guidelines and clicked the buttons* — a specific, small, paid group with a specific culture and a specific employer. Whose values, chosen by whom, is a governance question that no loss function answers, and saying so out loud in an interview reads as maturity, not evasion.`,
    },
    {
      type: 'note',
      md: 'Where system prompts fit, in one line: alignment bakes behaviour into the **weights** at training time, while a system prompt steers it at **inference** time, per request, for free — the cheap steering wheel bolted on top of the expensive one. It can only move the model within what alignment already made likely, which is why prompting cannot reliably restore a trained-in refusal or remove one.',
    },
  ],
  quiz: [
    {
      question: 'Why is preference data collected as pairwise comparisons rather than 1–10 ratings?',
      options: [
        { text: 'Pairwise labels are cheaper to store', explanation: 'Storage is not remotely the constraint — a rating and a comparison are both a few bytes.' },
        {
          text: 'Humans are far more consistent comparing two items than assigning absolute scores',
          explanation: 'Correct. Inter-annotator agreement on "A or B?" is much higher than on "rate this 1–10", where one person\'s 7 is another\'s 4 and both drift over a shift.',
        },
        { text: 'Bradley-Terry cannot be trained on absolute scores', explanation: 'Backwards. You could regress on scores if you had reliable ones; Bradley-Terry was chosen BECAUSE the data is comparisons, not the other way round.' },
      ],
      correct: 1,
    },
    {
      question: 'The KL penalty in the PPO stage measures the distance between…',
      options: [
        { text: 'the policy and the reward model', explanation: 'These are not comparable objects — the reward model emits a scalar, not a distribution over tokens.' },
        { text: 'the policy and the pretrained base model, before SFT', explanation: 'Close but wrong checkpoint. The reference is the SFT model, the last one we trust to produce well-formatted answers.' },
        {
          text: 'the current policy and the frozen SFT reference policy',
          explanation: 'Correct. π_ref is a frozen copy of the SFT model, and β·KL(π_θ || π_ref) is the leash that keeps the tuned policy near known-good language.',
        },
      ],
      correct: 2,
    },
    {
      question: 'During a PPO run the measured reward climbs steadily while sampled text degenerates into a repeated phrase. Most likely diagnosis?',
      options: [
        {
          text: 'Reward hacking — the policy is exploiting the reward model, with too weak a KL constraint to stop it',
          explanation: 'Correct. This is the textbook signature: reward up, quality down means the policy found a region where the reward model is wrong, and β was too small to hold it back.',
        },
        { text: 'The learning rate is too low', explanation: 'A too-low learning rate produces the opposite symptom — reward that barely moves at all.' },
        { text: 'The reward model was undertrained on chosen answers', explanation: 'A weak reward model makes hacking easier, but the specific pattern of reward rising while text collapses points at the missing leash, not at RM training volume.' },
      ],
      correct: 0,
    },
    {
      question: 'What does DPO eliminate compared with the classic RLHF pipeline?',
      options: [
        { text: 'The need for human preference data', explanation: 'No — DPO consumes exactly the same (x, y_w, y_l) triples. It removes machinery, not labelling cost.' },
        {
          text: 'The separately trained reward model and the whole RL loop',
          explanation: 'Correct. The closed-form optimum lets you express the reward as a log-ratio, so the preference likelihood becomes a direct classification loss on the policy. No RM, no rollouts, no PPO.',
        },
        { text: 'The reference model', explanation: 'The reference is still required — every term in the DPO loss is measured relative to it. (ORPO is the variant that drops it.)' },
      ],
      correct: 1,
    },
    {
      question: 'In the DPO loss, why do both the chosen and rejected log-probabilities appear as differences against the reference model?',
      options: [
        { text: 'To keep the numbers numerically small', explanation: 'A side effect at best. Log-probabilities of long sequences are large negatives either way.' },
        { text: 'Because subtraction is faster than division', explanation: 'It IS the division — a ratio in log space. Speed has nothing to do with it.' },
        {
          text: 'The derivation defines the implicit reward as β·log(π_θ/π_ref), so the ratio to the reference IS the reward — and it stops the model being credited for answers that were already likely',
          explanation: 'Correct on both counts. The log-ratio is the reward by construction, and measuring relative to π_ref means only the *change* the policy makes counts.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Reward model A scores two answers +3.1 and +1.1. Reward model B scores the same two answers +0.1 and −1.9. What follows?',
      options: [
        {
          text: 'They express the same preference with the same strength — only differences are identified under Bradley-Terry',
          explanation: 'Correct. Both gaps are exactly 2.0, so both imply P(A beats B) = σ(2.0) = 0.88. Adding a constant to every reward changes nothing.',
        },
        { text: 'Model A is more confident about A', explanation: 'Absolute reward levels carry no meaning at all — the Bradley-Terry likelihood depends only on the gap.' },
        { text: 'Model B prefers the second answer', explanation: 'It does not: −1.9 is still below +0.1. The sign of a reward is not a verdict; only the comparison is.' },
      ],
      correct: 0,
    },
    {
      question: 'What is the "alignment tax"?',
      options: [
        { text: 'The extra GPU cost of running RLHF on top of pretraining', explanation: 'That cost is real but it is not what the term means. The tax is a capability loss, not a compute bill.' },
        {
          text: 'A measurable drop on some raw capability benchmarks after alignment tuning',
          explanation: 'Correct. InstructGPT documented regressions on standard NLP tasks, partly mitigated by mixing pretraining gradients into the RL updates.',
        },
        { text: 'The money paid to human labellers for preference data', explanation: 'That is just data cost. The tax specifically refers to capability regression caused by the alignment step.' },
      ],
      correct: 1,
    },
    {
      question: 'Which statement about DPO versus PPO-style RLHF is the honest one?',
      options: [
        { text: 'DPO strictly dominates PPO; nobody trains with PPO any more', explanation: 'Overclaiming. The frontier labs still run online RL, and it still wins some careful comparisons.' },
        { text: 'PPO is the simpler method but needs more preference data', explanation: 'Reversed on both counts — PPO is the complex one, and both methods consume the same kind of preference data.' },
        {
          text: 'DPO is simpler and far more stable, but strong online RLHF still edges it out on some benchmarks, partly because it trains on fresh samples from the current policy',
          explanation: 'Correct. Offline DPO only sees a fixed pile of pairs; online methods keep scoring the policy\'s own current mistakes. Iterative/online DPO exists to close exactly that gap.',
        },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Walk me through RLHF end to end. Why does each stage exist?',
      answer:
        'Three stages. (1) **SFT**: fine-tune the base model on human-written demonstrations with the ordinary next-token loss — this teaches the response FORMAT, because a base model continues documents rather than answering. (2) **Reward model**: humans compare two responses to the same prompt, and a model (usually the SFT model with a scalar head) is trained on those comparisons with the Bradley-Terry objective to output a quality score. Comparisons are used because human absolute ratings are noisy while relative judgements agree well. (3) **PPO**: treat the SFT model as a policy, sample responses, score them with the reward model, and take policy-gradient steps — with a KL penalty against the frozen SFT reference so the policy cannot drift into text that games the reward model. The stage-by-stage logic is a data economics argument: writing demonstrations is expensive so stage 1 is small; choosing between two options is cheap so stages 2–3 scale.',
      isCaseBased: false,
    },
    {
      question: 'Why comparisons instead of ratings, and what does Bradley-Terry actually do with them?',
      answer:
        'Human absolute scores are unreliable — different scales between annotators, drift within one annotator across a session. Pairwise agreement is much higher, so the raw data is (prompt, chosen, rejected) with no numbers in it. Bradley-Terry is the bridge from ordinal data to a scalar: it assumes P(y_w beats y_l) = σ(r(y_w) − r(y_l)) and fits r by maximum likelihood, so the reward-model loss is −log σ(r_w − r_l) — plain binary cross-entropy on "did the chosen one win". Key property to mention: only the gap is identified. r and r+c produce identical preferences, so a raw reward value is meaningless in isolation and reward scales are not comparable across training runs. That is also why you never report "our reward model gives 4.2".',
      isCaseBased: false,
    },
    {
      question: 'What is the KL penalty in RLHF doing, and what happens at the two extremes of β?',
      answer:
        'It penalises β·KL(π_θ || π_ref) where π_ref is the frozen SFT model, and in implementation it is folded into the per-token reward: r̃ = r_φ − β·log(π_θ/π_ref). Purpose: the reward model is only accurate near the distribution it was trained on, and an RL optimiser will happily seek the region where the reward model is wrong. The KL term is a leash keeping the policy near known-good language. β large: the policy hugs SFT and alignment achieves almost nothing. β → 0: reward climbs while text degenerates — the classic collapse into a repeated high-scoring phrase. Bonus point for noting the direction: this is reverse KL, which is mode-seeking, so aligned models legitimately lose output diversity as a side effect of the leash.',
      isCaseBased: false,
    },
    {
      question: 'Case: your RLHF run reports average reward up 40% over the previous checkpoint, but the human eval win-rate dropped. Debug it.',
      answer:
        'Reward up and quality down is the definition of reward hacking, so start there rather than at the optimiser. (1) Check length: plot response length against reward and against the checkpoint — the most common cause by far is the policy learning that longer scores higher. Fix by length-debiasing the reward (regress reward on tokens, subtract the fitted component) or by length-controlled evaluation. (2) Check KL: measure KL(π_θ || π_ref) over the run. If it grew without bound, β is too small — raise it or add an adaptive KL controller targeting a fixed KL budget. (3) Check the reward model out of distribution: score the current policy\'s samples and hold them next to human judgements on the same samples. If RM-human correlation has collapsed on the new samples, the policy has walked off the RM\'s training distribution and you need fresh preference data collected from the current policy. (4) Check for sycophancy and formatting artefacts with targeted probes. (5) Only after those, look at PPO hyperparameters. Two structural fixes worth naming: iterate the loop (new preference data from the current policy) and ensemble reward models to make hacking harder.',
      isCaseBased: true,
    },
    {
      question: 'Explain DPO\'s key insight. Why is no reward model needed?',
      answer:
        'The RLHF objective — maximise reward subject to a KL constraint against a reference — has a known closed-form optimum: π*(y|x) ∝ π_ref(y|x)·exp(r(x,y)/β). Invert it and r(x,y) = β·log(π*(y|x)/π_ref(y|x)) + β·log Z(x): every reward function is a scaled log-ratio between its optimal policy and the reference. Substitute that into the Bradley-Terry preference likelihood and Z(x) cancels, because it depends only on the prompt and both responses share the prompt. What is left is L = −log σ(β·log(π_θ(y_w)/π_ref(y_w)) − β·log(π_θ(y_l)/π_ref(y_l))) — a supervised binary classification loss on preference pairs. The language model is its own implicit reward model, so there is nothing left to train separately and nothing to sample from during training.',
      isCaseBased: false,
    },
    {
      question: 'When would you choose DPO over PPO, and when the reverse?',
      answer:
        'DPO by default: one trainable model plus a frozen reference (whose log-probs can be precomputed), a standard supervised loop, few hyperparameters, and it fits on modest hardware. Choose it for almost any team without a dedicated RL infrastructure group. PPO or online RL when you have the infrastructure and you are chasing the last few points: online methods sample fresh completions from the current policy and score them, so they keep correcting the policy\'s *current* failure modes, whereas offline DPO only sees a fixed pile of pairs possibly generated by another model. Also prefer online when your reward signal is programmatic and cheap to evaluate (unit tests, math verifiers) — there the RM problem disappears and RL shines. The practical middle ground almost everyone ended up at is iterative/online DPO: sample new pairs with the current model, label with humans or an LLM judge, retrain, repeat.',
      isCaseBased: false,
    },
    {
      question: 'Case: your product has 50k thumbs-up/thumbs-down events on individual responses — no pairs — and one A100. Design the alignment plan.',
      answer:
        'The data shape decides the method. Thumbs are unpaired binary signals, which is exactly what **KTO** was designed for, so that is the first candidate — no need to synthesise pairs. If you would rather stay on DPO, you can construct pairs by matching an up-voted and a down-voted response to the same or a near-duplicate prompt, but coverage will be thin and the pairing introduces bias. Plan: (1) filter and dedupe, and check the thumb signal is not dominated by one surface property such as length or latency; (2) run a short SFT pass on the up-voted responses first, so the reference model is close to the data distribution — DPO/KTO are sensitive to that; (3) train with LoRA on the A100 in bf16 so policy and reference both fit; the reference log-probs are precomputed in one pass so only the adapter trains; (4) evaluate against the SFT checkpoint on held-out prompts with pairwise win-rate plus a length-controlled version, and separately track a capability benchmark to measure the alignment tax and a refusal-rate probe to catch over-refusal; (5) iterate — sample fresh responses from the new model, ship to a fraction of traffic, harvest new thumbs, retrain. Also worth saying: no reward model gets trained anywhere in this plan, and that is the point.',
      isCaseBased: true,
    },
    {
      question: 'What is reward hacking? Give concrete examples and the standard defence.',
      answer:
        'Goodhart\'s law applied to a learned reward: the policy optimises the reward model\'s flaws rather than actual quality. Concretely: **verbosity** (labellers mildly prefer thorough answers, so the RM scores length, so the policy pads — the most reproducible bias of all); **sycophancy** (agreeing with the user\'s stated view scores well, so the model folds when contradicted); **formatting tricks** (bullets, bold headers, a confident opener — the shape of a good answer without content); **hedging and refusal** (rarely marked wrong, so the safe empty answer wins). The standard defence is the **KL penalty to the frozen reference**, which bounds how far the policy can travel from language the reference considers plausible. Supporting defences: length-debiasing the reward, ensembling reward models, retraining the RM on samples from the current policy, and adaptive KL controllers that target a fixed KL budget instead of a fixed β.',
      isCaseBased: false,
    },
    {
      question: 'Case: after alignment, users complain the assistant refuses too many harmless requests. What do you actually do?',
      answer:
        'First measure, because "too many" needs a number: build a refusal-probe set of benign prompts that superficially resemble risky ones (chemistry homework, security concepts, medical questions, fiction with conflict) and report a false-refusal rate alongside the genuine-harm refusal rate — you are trading along a curve, not fixing a bug. Then diagnose where the bias entered: (1) the guidelines, if labellers were instructed in a way that makes refusal the safe click; (2) the preference data, if refusals systematically won comparisons — check by scoring refusal-vs-helpful pairs with the reward model; (3) the objective, if the safety signal has no counterweight. Fixes in increasing cost: a system prompt that explicitly authorises the benign category (cheap, immediate, but bounded by what alignment made likely); targeted preference pairs where a helpful answer beats an unnecessary refusal, then a DPO pass; relabelling guidelines and re-collecting for the systematic case. Report both numbers every time — a fix that halves false refusals while doubling genuine-harm compliance is not a fix.',
      isCaseBased: true,
    },
    {
      question: 'What does alignment cost, quantitatively and conceptually?',
      answer:
        'Quantitatively: the **alignment tax** — InstructGPT reported regressions on standard NLP benchmarks after RLHF, partly mitigated by mixing pretraining gradients into the RL update (PPO-ptx). Reduced output diversity is a second measurable cost, and it follows directly from the reverse-KL objective being mode-seeking. Over-refusal is a third, and the pressure toward it is structural rather than accidental: refusals are cheap for a reward model to score highly and awkward for a labeller to penalise. Conceptually, the cost is that "aligned" is not an absolute — the model is aligned to the preferences of a specific, small, paid group of labellers working from guidelines someone wrote. That is a values question, not only a technical one, and RLAIF/Constitutional AI does not remove it, it just moves it to whoever wrote the constitution. Counterweight to state alongside: InstructGPT\'s 1.3B aligned model was preferred over the 175B base model, so alignment buys something like a 100× effective size advantage in perceived helpfulness. The tax is real and it is worth paying.',
      isCaseBased: false,
    },
    {
      question: 'Name the DPO variants and what each one changes.',
      answer:
        '**IPO** replaces the log-sigmoid with a squared loss, because log-sigmoid keeps pushing the margin toward infinity when preferences are deterministic, which over-fits them. **KTO** drops pairs entirely and learns from single thumbs-up/thumbs-down labels — the feedback real products actually collect, so it is the practical choice when you have logs rather than a labelling contract. **ORPO** folds preference tuning into the SFT stage with an odds-ratio penalty on the rejected response, so there is one training run and no reference model at all. **RLAIF / Constitutional AI** changes the source of preferences: a model, prompted with a written constitution, does the comparisons instead of a human — cheap and scalable, and Anthropic\'s original result was that it improves harmlessness without hurting helpfulness. The honest closing line: none of these has decisively beaten a well-tuned DPO across the board, and the biggest real-world lever is still preference data quality, not the loss function.',
      isCaseBased: false,
    },
    {
      question: 'What is on the GPU during a PPO run versus a DPO run? Be specific.',
      answer:
        'PPO: the **trainable policy** (weights + gradients + optimiser state, so roughly 4× weights in mixed precision with Adam), the **frozen reference** for KL (weights only, in inference precision), the **frozen reward model** (weights only), and PPO\'s **value network** (often another trainable head or a full model). Plus generation buffers, since sampling happens inside the loop and needs a KV cache. Call it 3–4 model copies with two of them carrying optimiser state. DPO: the **trainable policy** and the **frozen reference** — and even the reference can be dropped from memory if you precompute its log-probs over the fixed preference dataset in one pass, since they never change. With LoRA you can go further and share one base model between policy and reference by simply disabling the adapter for the reference forward pass, which is the standard trick in TRL. That memory story, more than benchmark scores, is why DPO became the default.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Why alignment is needed at all', back: 'Pretraining maximises "likely next token", not "helpful answer". A base model answers a question with more questions because that is what web pages do.' },
    { front: 'The three RLHF stages', back: '1) SFT on human demonstrations (teaches format). 2) Reward model from pairwise comparisons (Bradley-Terry). 3) PPO against that reward, with a KL leash to the SFT reference.' },
    { front: 'Why pairwise comparisons, not 1–10 ratings', back: 'Humans agree far better on "A or B?" than on absolute scores. Judging is easier than writing — and cheaper, so stages 2–3 scale.' },
    { front: 'Bradley-Terry objective', back: 'P(y_w ≻ y_l) = σ(r_w − r_l); loss = −log σ(r_w − r_l). Only the GAP is identified — adding a constant to every reward changes nothing.' },
    { front: 'What the KL penalty does', back: 'β·KL(π_θ || π_ref) against the frozen SFT model. The reward model is only right near its training distribution; the leash stops the policy hunting the region where it is wrong.' },
    { front: 'Reward hacking, four examples', back: 'Verbosity (length as a quality proxy), sycophancy, formatting tricks (bullets/bold/confident opener), hedging and over-refusal. All raise reward, none raise quality.' },
    { front: 'Why RLHF is painful', back: 'Three-plus models resident (policy, reference, reward model, value head), generation inside the training loop, unstable RL hyperparameters, and four suspects when quality drops.' },
    {
      front: 'The DPO insight, and the loss in English',
      back: 'KL-constrained optimum: π* ∝ π_ref·exp(r/β). Invert it: r = β·log(π*/π_ref) + β·log Z. Substituted into Bradley-Terry, Z(x) cancels — leaving a classification loss on pairs, no RM, no RL. In English: raise log P(chosen), lower log P(rejected), both measured RELATIVE to the frozen reference.',
    },
    { front: 'DPO honest weaknesses', back: 'Offline, so it never sees its own current mistakes (online RLHF still wins some benchmarks); sensitive to reference model and data quality; often lowers the likelihood of BOTH responses — it guarantees the gap, not the level.' },
    { front: 'Alignment tax + over-refusal', back: 'Aligned models measurably regress on some raw benchmarks (mitigate by mixing pretraining gradients into RL). Over-refusal is structural: refusals score well and are awkward to penalise.' },
  ],
  mindmapMarkdown: `- Alignment: RLHF, Reward Models & DPO
  - The problem
    - base LM predicts likely text, not helpful answers
    - "good answer" has no ground-truth label
  - Stage 1: SFT
    - human demonstrations, plain next-token loss
    - teaches FORMAT; becomes policy AND frozen reference
  - Stage 2: reward model
    - comparisons beat absolute ratings (humans agree)
    - Bradley-Terry: loss = -log sigma(r_w - r_l); only the GAP is identified
  - Stage 3: PPO
    - policy gradient on RM score, leashed by beta*KL to frozen reference
    - reverse KL -> mode-seeking -> less diversity
  - Reward hacking
    - verbosity, sycophancy, formatting, hedging
    - defence: KL leash, length-debias, RM ensembles
  - Why RLHF hurts
    - 3-4 models resident, generation inside the loop
    - unstable knobs, four suspects when quality drops
  - DPO
    - closed-form optimum -> reward = beta*log(pi/pi_ref)
    - Z(x) cancels -> classification loss on pairs; no RM, no RL
    - offline + reference-sensitive; online DPO closes the gap
  - Variants
    - IPO squared loss, KTO thumbs, ORPO one-stage
    - RLAIF / Constitutional AI: model writes the preferences
  - Buys and costs
    - 1.3B aligned beat 175B base on helpfulness
    - alignment tax, over-refusal, reduced diversity
    - aligned = aligned to WHOSE values
  - System prompts = inference-time steering on baked-in behaviour`,
}

export default m
