import type { Module } from '../types'

const m: Module = {
  id: 'genai-l2-rlhf-dpo',
  subjectId: 'genai',
  level: 2,
  title: 'Alignment: RLHF, Reward Models & DPO',
  whyItMatters:
    'A model trained on the internet learns to continue text. That is not the same thing as answering your question, and no amount of extra internet text fixes it. This module builds, from zero, the three-step process that turned a text predictor into an assistant: teach it the shape of an answer, learn a scoring function from human comparisons, then improve the model against that score without letting it cheat. Every number here is computed with plain Python you can run, including the exact failure that happens when the safety leash is removed.',
  assumes: [
    'You know what a probability is: a number between 0 and 1 saying how likely something is',
    'You have seen a Python for loop, a function, and a list',
    'You know that a language model produces text one word at a time, each time picking a likely next word',
    'It helps to have read the Metrics module Text Generation Metrics: Perplexity, BLEU & ROUGE, which is where KL divergence is explained. This module uses it but does not re-derive it.',
    'No reinforcement learning background is needed. Every term used here is defined here.',
  ],
  estMinutes: 42,
  sections: [
    {
      type: 'intuition',
      title: 'Ask a pretrained model a question and watch what you get',
      md: `A **pretrained** language model has been trained on one task only: given some text, predict the word that probably comes next. It saw a very large pile of web pages and got very good at continuing them.

Now type this into it:

- **You:** *"How do I fix a flat tyre?"*
- **The model:** *"How do I check my tyre pressure? How do I change a headlight? How often should I rotate my tyres?"*

That output is not a bug. On the internet, a line that looks like a question is very often followed by more questions, because that is what an FAQ page is. The model produced a **likely** continuation. It did exactly what it was trained to do.

But it is useless to you. You wanted an answer, not a list of related questions. So we have two different things that we had been quietly assuming were the same thing:

- **Likely** — what the training data says usually comes next.
- **Helpful** — what actually serves the person who typed the question.

**Alignment** is the name for the work of moving a model from the first to the second: making it helpful, honest and safe, rather than merely likely. That is the whole subject of this module.`,
    },
    {
      type: 'note',
      md: 'Why we cannot fix this the ordinary way: ordinary training needs a correct answer to copy. For "is this photo a cat?" there is one right label. For "how do I fix a flat tyre?" there is no single correct string — two good writers produce two different good answers, and both are right. So there is nothing to compare against, and no obvious loss to minimise. Everything difficult in this module comes from working around that one missing ingredient.',
    },
    {
      type: 'intuition',
      title: 'The three stages, in order, in plain words',
      md: `The pipeline that fixed this is called **RLHF**: reinforcement learning from human feedback. It has three stages, and it is worth memorising what goes in and what comes out of each one before we look at any of them in detail.

1. **SFT — supervised fine-tuning.** In: a few tens of thousands of *demonstrations*, which are prompts with an ideal answer written by a human. Out: a model that replies in the shape of an answer instead of continuing a document. This stage is ordinary training with the ordinary next-word loss. Nothing new.
2. **Reward model.** In: *preference data* — for one prompt, two candidate answers and a human's verdict on which one is better. Out: a **reward model**, a separate small model that reads one answer and returns a single number saying how good it is.
3. **Policy optimisation.** In: the SFT model, the reward model, and a pile of prompts. Out: the final aligned model. The SFT model writes answers, the reward model scores them, and the SFT model is nudged toward writing higher-scoring answers — while a leash stops it going too far.

Two more words, defined now, used constantly from here on:

- **Policy.** The model we are currently improving. It is called a policy because in stage 3 we treat it as something that takes an action (writing an answer) and receives a score for that action. It is the same neural network as before; only the name changes.
- **Reference model.** A frozen copy of the SFT model that is never updated. Its only job in stage 3 is to be the thing we compare the policy against, so we can measure how far the policy has wandered.

There is a design reason the stages are split this way. Writing a good answer by hand is slow and expensive, so stage 1 stays small. Reading two answers and clicking the better one is fast and cheap, so stages 2 and 3 can use hundreds of thousands of examples. Judging is easier than writing, and the pipeline is built around that fact.`,
    },
    {
      type: 'intuition',
      title: 'Stage 2, first half: why we ask "which is better?" and never "rate this out of 10"',
      md: `The reward model needs training data. The obvious plan is to have humans score answers out of 10 and then train a model to predict the score. That plan fails, and the reason is about people, not about maths.

- Ask ten people to rate the same answer out of 10 and you get 4, 6, 7, 5, 8, 6, 3, 7, 6, 9. One person's 7 is another person's 4. There is no shared meaning for the numbers.
- Worse, one person drifts. The same labeller marks harder at 9am than at 4pm. Their 6 in the morning is their 8 in the afternoon.
- Now ask the same ten people *"which of these two answers is better, A or B?"* and they agree far more often. That question does not require anyone to hold a private scale in their head. It only requires a comparison.

So the data we collect is a **preference pair**: one prompt, one answer marked *chosen*, one answer marked *rejected*. There is not a single number anywhere in the dataset.

That leaves an obvious problem. Stage 3 needs a *number* to push against, and our data has none. Bridging that gap is exactly what the reward model is for: it is trained on comparisons, and it outputs numbers.`,
    },
    {
      type: 'intuition',
      title: 'Stage 2, second half: turning "A beat B" into numbers',
      md: `Here is the trick. Give the reward model two answers and it produces two numbers, say r(A) and r(B). Turn the *difference* between those numbers into a probability using the **sigmoid** function, which squashes any number into the range 0 to 1:

- sigmoid(0) = 0.5. If the two scores are equal, we predict a coin flip between A and B.
- sigmoid(+2) = 0.88. If A scores two points higher, we predict humans pick A about 88% of the time.
- sigmoid(-2) = 0.12. If A scores two points lower, we predict A wins only 12% of the time.

So "the model's belief that a human prefers A" is sigmoid(r(A) − r(B)). Now we have a probability, and training a model to make a known event probable is completely standard: the loss is minus the logarithm of the probability we assigned to what actually happened. Small probability for the thing that happened means a big loss.

That is the entire reward-model objective. Work one pair by hand before running it:

- Suppose the reward model currently scores r(A) = 0.20 and r(B) = 0.50, but the human chose A. The model has the order backwards.
- The gap is 0.20 − 0.50 = −0.30, and sigmoid(−0.30) = 0.426. The model gives the correct outcome only a 42.6% chance.
- Loss = −log(0.426) = 0.854. That is a real penalty, and training will reduce it by raising r(A) and lowering r(B).

One consequence you should notice straight away: only the **gap** matters. Scores of 0.2 and 0.5 give exactly the same prediction as scores of 10.2 and 10.5. A single reward number, on its own, means nothing at all.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Snippet 1: the reward model learning that A beats B',
      code: `import math

def sigmoid(z):
    return 1.0 / (1.0 + math.exp(-z))

rA = 0.20                                   # current score for the CHOSEN answer
rB = 0.50                                   # current score for the REJECTED answer
lr = 0.5                                    # step size: how hard each update pushes
print('step  r(A)    r(B)    P(A wins)   loss')
for step in range(5):
    p = sigmoid(rA - rB)                    # our predicted chance the human picks A
    loss = -math.log(p)                     # penalty for not predicting it confidently
    print('%2d   %+.3f  %+.3f    %.3f     %.4f' % (step, rA, rB, p, loss))
    rA = rA + lr * (1.0 - p)                # push the chosen answer's score UP
    rB = rB - lr * (1.0 - p)                # push the rejected answer's score DOWN

# ---- real output ----
# step  r(A)    r(B)    P(A wins)   loss
#  0   +0.200  +0.500    0.426     0.8544
#  1   +0.487  +0.213    0.568     0.5653
#  2   +0.703  -0.003    0.670     0.4011
#  3   +0.868  -0.168    0.738     0.3035
#  4   +0.999  -0.299    0.786     0.2413`,
      annotations: {
        1: 'math is Python\'s built-in maths library. We need exp for the sigmoid and log for the loss. Nothing else is imported anywhere in this module.',
        3: 'def starts a function. sigmoid takes one number z and returns a number between 0 and 1.',
        4: 'The sigmoid formula. exp(-z) is huge when z is very negative (so the result is near 0) and near zero when z is large positive (so the result is near 1).',
        6: 'r(A) is the score the reward model currently gives the answer the human chose. We start it deliberately too low.',
        7: 'r(B) is the score for the answer the human rejected. It starts higher than r(A), so the model has the order wrong. That is the interesting case.',
        8: 'The learning rate: the fraction of the suggested correction we actually apply on each step. Real training uses a much smaller value; 0.5 makes the movement visible in five steps.',
        9: 'A plain header line so the printed table has column names.',
        10: 'range(5) gives 0,1,2,3,4 — we take five update steps and print each one.',
        11: 'The gap rA - rB fed through sigmoid. This is the model\'s predicted probability that a human prefers A.',
        12: 'The loss: minus the log of the probability we gave the outcome that actually happened. p = 0.426 gives 0.854; p = 0.99 would give 0.01.',
        13: 'Prints one row. %+.3f shows three decimals with an explicit + or - sign; %2d pads the step number to width 2.',
        14: 'Raise the chosen answer\'s score. The size of the push is (1 - p): when p is already near 1 we are nearly right and barely move, when p is near 0 we are badly wrong and move a lot.',
        15: 'Lower the rejected answer\'s score by the same amount. Notice both lines use the same (1 - p), so the gap grows twice as fast as either score moves.',
      },
    },
    {
      type: 'note',
      md: 'Read the output columns. The gap starts negative (0.200 below 0.500) and by step 2 it has flipped: r(A) = 0.703 sits above r(B) = -0.003. P(A wins) climbs 0.426 to 0.786 and the loss falls 0.8544 to 0.2413. Also watch the steps shrink: the jump from step 0 to 1 moves r(A) by 0.287, while step 3 to 4 moves it by only 0.131. The update is self-damping, because it is scaled by how wrong we still are.',
    },
    {
      type: 'intuition',
      title: 'Stage 3: the model chases the score, and here is what goes wrong',
      md: `We now have a number for any answer, so stage 3 looks easy: generate answers, score them, adjust the policy so high-scoring answers become more likely. Repeat.

It does not work, and the reason is important enough that the fix has a name.

The reward model is a *model*. It was fitted to a finite pile of human comparisons. Inside the range of text it saw during training, it grades reasonably. Outside that range it is guessing, and some of its guesses are badly wrong — there will be strange, repetitive, or oddly formatted text that it happens to score very high for no good reason.

Now think about what the policy is. It is an optimiser. Its entire job is to find text that maximises a number. If there is a region where the reward model is broken and generous, the policy will find it, because finding maxima is the only thing it does.

This failure is called **reward hacking**: the policy raises the measured score without raising real quality. It is not subtle when it happens. The reward curve on your dashboard goes up smoothly and beautifully, and then you actually read a sample and it says:

*"Sure! Sure! I'd be happy to help! Sure! I'd be happy to help! Sure!"*

The reward model loves it. A human would not accept it. The measure became the target and stopped being a good measure.

The fix is to refuse to let the policy travel far from text we already know is sane. We keep the frozen **reference model** — the SFT checkpoint from stage 1 — and add a **KL penalty**: a cost that grows the more the policy's word probabilities differ from the reference's. The thing being optimised becomes *reward minus β times the KL distance from the reference*, where **β** is a knob you choose.

Think of it as a leash. Go find high reward, but stay within a short distance of the model we already trust to produce normal English. β is the length of the leash: large β is a short leash, small β is a long one, and β = 0 means no leash at all.`,
    },
    {
      type: 'note',
      md: 'KL divergence is not defined here because it is defined properly in the Metrics subject, in **Text Generation Metrics: Perplexity, BLEU & ROUGE**. The one-line version you need for this module: KL is a non-negative number measuring how far one set of probabilities sits from another, and it is zero only when the two match exactly. The direction used in RLHF is KL(policy from reference), which means it charges the policy for making things likely that the reference thought unlikely. A side effect worth knowing: that direction lets the policy quietly drop options the reference kept, which is part of why aligned models sound more samey than the models they came from.',
    },
    {
      type: 'intuition',
      title: 'Watching the leash work, with three numbers',
      md: `Shrink the problem until it fits on a page. The model has exactly three possible replies to one prompt, and the reference model (our frozen SFT checkpoint) gives them these probabilities:

- A real answer: **0.70**
- *"Sure! Sure! Sure!"*: **0.02**
- A rambling answer: **0.28**

The reward model scores them **3.0**, **9.5** and **2.0**. That 9.5 is the bug: the reward model was never shown repetitive text like reply 2 during its training, and it grades it far too generously.

Now compare two candidate policies:

- The **hacked** policy: 0.01, 0.98, 0.01. It puts almost all its probability on the degenerate reply.
- The **sane** policy: 0.75, 0.02, 0.23. Barely moved from the reference.

On raw reward alone the hacked policy scores 9.36 against the sane policy's 2.90. Reward says hacking wins by a mile. Add the KL penalty and the ranking depends on β, which is exactly what the next snippet prints.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Snippet 2: the same reward hack, judged at three leash lengths',
      code: `import math

ref = [0.70, 0.02, 0.28]                    # frozen reference model's probabilities
reward = [3.0, 9.5, 2.0]                    # reward model's scores; 9.5 is the bug

def objective(policy, beta):
    total = 0.0
    for i in range(3):
        kl = math.log(policy[i] / ref[i])   # how far reply i moved from the reference
        total = total + policy[i] * (reward[i] - beta * kl)
    return total

hacked = [0.01, 0.98, 0.01]                 # policy that chases the broken score
sane = [0.75, 0.02, 0.23]                   # policy that stays near the reference
print('beta   hacked policy   sane policy')
for beta in [0.0, 1.0, 3.0]:
    print('%.1f      %+8.3f      %+8.3f' % (beta, objective(hacked, beta), objective(sane, beta)))

# ---- real output ----
# beta   hacked policy   sane policy
# 0.0        +9.360        +2.900
# 1.0        +5.622        +2.893
# 3.0        -1.855        +2.880`,
      annotations: {
        1: 'Same import as before. Each snippet in this module stands alone and can be pasted into a fresh Python session.',
        3: 'The reference model\'s three probabilities. They add to 1.00 because these are the only three replies in our toy world.',
        4: 'The reward model\'s score for each reply. Reply 2 scoring 9.5 is deliberately wrong: that is the flaw the policy will exploit.',
        6: 'The function computes the full RLHF objective for one policy at one leash length: average reward minus beta times the KL distance.',
        7: 'A running total, starting at zero. We will add one reply\'s contribution at a time.',
        8: 'range(3) gives 0,1,2 — one pass per possible reply.',
        9: 'log(policy / reference) for this reply. It is positive when the policy made the reply more likely than the reference did, and negative when it made it less likely.',
        10: 'Weight this reply by how often the policy actually produces it, then add its reward minus the leash cost. Summing this over all replies is the KL-penalised objective.',
        11: 'Hand the finished total back to the caller.',
        13: 'The hacked policy: 98% of its probability on the degenerate reply the reward model over-scores.',
        14: 'The sane policy: almost the reference, with a small shift toward the genuinely good reply.',
        15: 'Column headers for the printed table.',
        16: 'Three leash lengths: no leash, a moderate one, a tight one.',
        17: 'Prints both objective values side by side. %+8.3f pads to width 8, three decimals, always signed.',
      },
    },
    {
      type: 'note',
      md: 'That table is the whole argument for the KL penalty in three rows. At **beta = 0** the hacked policy wins 9.360 to 2.900, so an optimiser with no leash will pick the gibberish every single time — the reward model told it to. At **beta = 1.0** hacking still wins, 5.622 to 2.893: a leash that is too loose only slows the drift down, it does not prevent it. At **beta = 3.0** the hacked policy scores -1.855, below the sane policy\'s 2.880, so the optimiser finally rejects it. Also notice the sane policy barely changes across all three rows, 2.900 to 2.880, because it never moved far from the reference and therefore never pays much. The leash costs an honest policy almost nothing and costs a cheating one everything. That asymmetry is the design.',
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Alignment, stage by stage',
        notice: 'Left column: what is fed in at this stage. Right column: which models exist and which of them are frozen. Count the boxes RLHF needs, then count the boxes DPO needs.',
        leftLabel: 'stage inputs',
        rightLabel: 'models / artefacts',
        frames: [
          {
            note: 'Stage 0. A pretrained model. Give it a question and it continues the document, often with more questions.',
            stack: [{ name: 'prompt', to: 'base' }],
            heap: [
              { id: 'base', value: 'base LM', label: 'pretrained' },
              { id: 'out0', value: '"...and 3 more Qs"', danger: true },
            ],
          },
          {
            note: 'Stage 1 (SFT). Train on human-written demonstrations. Now it answers in the right shape. This one checkpoint is kept twice: as the policy we improve, and as the frozen reference.',
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
            note: 'Stage 2a. Two answers per prompt; a human says which is better. Comparisons only, never a score out of 10 — comparisons are what humans agree on.',
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
            note: 'Stage 2b. Train a reward model on those pairs: raise the chosen score, lower the rejected one. Output is one number per answer, and only the gap between numbers carries meaning.',
            stack: [{ name: 'pref pairs', to: 'rm' }],
            heap: [
              { id: 'rm', value: 'reward model', label: 'one number out' },
              { id: 'ra', value: 'r(A) = +0.999' },
              { id: 'rb', value: 'r(B) = -0.299' },
            ],
          },
          {
            note: 'Stage 3. The policy writes, the reward model scores, the policy is pushed up the score — while the KL penalty against the frozen reference pulls back. Engine and leash together.',
            stack: [
              { name: 'sampled answers', to: 'pi' },
              { name: 'score', to: 'rm' },
              { name: 'KL leash', to: 'ref' },
            ],
            heap: [
              { id: 'pi', value: 'policy', label: 'training' },
              { id: 'rm', value: 'reward model', label: 'frozen' },
              { id: 'ref', value: 'SFT reference', label: 'frozen' },
            ],
          },
          {
            note: 'Cut the leash (beta = 0). Reward climbs beautifully and the text collapses. The policy found a flaw in the reward model, not a better answer.',
            stack: [
              { name: 'KL leash', value: 'beta = 0', danger: true },
              { name: 'policy', to: 'pi', danger: true },
            ],
            heap: [
              { id: 'pi', value: 'drifted policy', danger: true },
              { id: 'r', value: 'reward 9.36 (up)', danger: true },
              { id: 'txt', value: '"Sure! Sure! Sure!"', danger: true },
            ],
          },
          {
            note: 'DPO collapses stages 2 and 3 into one. No reward model, no sampling, no reinforcement learning — the same preference pairs go straight into one ordinary loss.',
            stack: [
              { name: 'pref pairs', value: 'x, chosen, rejected' },
              { name: 'policy', to: 'pi' },
              { name: 'compare with', to: 'ref' },
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
      type: 'intuition',
      title: 'DPO: delete the reward model and the reinforcement learning',
      md: `Stage 3 is expensive and fragile. Three models sit on the GPU at once — the policy being trained, the frozen reference, the frozen reward model — and the policy has to generate fresh text inside the training loop, which is slow. On top of that, β and the other reinforcement-learning knobs are genuinely hard to tune.

**DPO** — direct preference optimisation — removes all of it, and the reason it can is a piece of algebra rather than an engineering trick.

Ask: for a given reward function, what is the *best possible* policy under "maximise reward minus β times KL from the reference"? That question has an exact answer written down on paper: take the reference probabilities and multiply each one by e raised to (reward divided by β), then rescale so they add to 1.

Now read that backwards. If the best policy is the reference re-weighted by the reward, then the reward is recoverable from the best policy: it is β times the logarithm of (best policy ÷ reference), plus a rescaling term that depends only on the prompt.

That is the whole insight. **The reward was never a separate object needing its own network. It is a ratio between a policy and the reference, in disguise.**

So take the reward-model loss from snippet 1 and substitute that ratio wherever r appears. Both answers in a pair share the same prompt, so the prompt-only rescaling term is the same on both sides of the subtraction and cancels out. What is left is an ordinary loss on preference pairs that needs only four numbers: the log-probability of the chosen and rejected answers under the policy, and the same two under the reference.

In plain English the DPO loss says: **raise the probability of the chosen answer and lower the probability of the rejected one, both measured relative to the reference** — so nothing gets credit for having already been likely before training started.

- What it buys: one model training instead of three, an ordinary supervised loop instead of reinforcement learning, no text generation inside training, and far fewer knobs. It is stable enough to run on a single rented GPU.
- What it gives up: DPO only ever sees a fixed pile of pairs collected in advance. Stage-3 RLHF samples fresh answers from the *current* policy, so it keeps learning about the mistakes the model is making right now. Offline DPO cannot do that, and strong online RLHF still wins some careful head-to-head comparisons because of it.
- One more honest weakness: DPO guarantees the *gap* between chosen and rejected, not the *level*. It quite often lowers the absolute probability of both answers while widening the gap between them.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Snippet 3: the DPO loss on toy log-probabilities',
      code: `import math

def sigmoid(z):
    return 1.0 / (1.0 + math.exp(-z))

BETA = 0.1
ref_chosen = -12.0                          # reference log-prob of the CHOSEN answer
ref_rejected = -11.0                        # reference log-prob of the REJECTED answer
print(' logp(chosen)   margin   DPO loss   push')
for logp_chosen in [-13.0, -12.0, -11.0, -8.0, -4.0]:
    logp_rejected = -11.0                   # hold the rejected answer fixed
    margin = (logp_chosen - ref_chosen) - (logp_rejected - ref_rejected)
    loss = -math.log(sigmoid(BETA * margin))
    push = sigmoid(-BETA * margin)          # how hard this pair still pulls
    print('   %6.1f      %+6.2f    %.4f     %.3f' % (logp_chosen, margin, loss, push))

# ---- real output ----
#  logp(chosen)   margin   DPO loss   push
#     -13.0       -1.00    0.7444     0.525
#     -12.0       +0.00    0.6931     0.500
#     -11.0       +1.00    0.6444     0.475
#      -8.0       +4.00    0.5130     0.401
#      -4.0       +8.00    0.3711     0.310`,
      annotations: {
        1: 'Same single import. No numpy, no deep-learning framework: DPO\'s loss really is this small.',
        3: 'The same sigmoid as snippet 1, because DPO reuses the same loss shape. Only what goes inside it has changed.',
        4: 'Squashes any number into 0 to 1.',
        6: 'beta, the same leash knob as before. Here it multiplies the margin, so a small beta makes the loss tolerant of large probability changes.',
        7: 'The frozen reference model\'s log-probability for the chosen answer. Log-probabilities of whole sentences are large negative numbers; -12.0 is a perfectly ordinary value.',
        8: 'The reference\'s log-probability for the rejected answer. It is HIGHER than -12.0, meaning the reference actually preferred the rejected answer. DPO has to flip that ordering, not merely nudge it.',
        9: 'Header row for the table.',
        10: 'Five candidate values for how likely the policy makes the chosen answer, from worse than the reference to far better.',
        11: 'Keep the rejected answer\'s policy log-probability fixed so only one thing varies per row.',
        12: 'The margin, and this single line is all of DPO: chosen minus rejected, with each one measured as a change from the reference. Delete the two reference terms and you are just doing SFT on the chosen answers.',
        13: 'The same loss as the reward model in snippet 1, with beta times the margin standing in for the reward gap.',
        14: 'sigmoid(-beta * margin) is how strongly this pair still pushes the weights. Pairs the model already gets right push weakly, so DPO balances itself with no extra machinery.',
        15: 'One row per candidate. %+6.2f pads to width 6 with two decimals and an explicit sign.',
      },
    },
    {
      type: 'note',
      md: 'Two readings from that table. **First**, the middle row: margin 0.00 gives loss 0.6931, which is exactly log 2 — and it is the same 0.6931 you would get from snippet 1 at a reward gap of zero, because it is literally the same loss with a probability ratio substituted for the reward. **Second**, the push column falls from 0.525 to 0.310 as the margin grows, so a pair the policy already handles well stops demanding attention. Notice also how gentle the whole thing is: beta = 0.1 means an eight-unit change in log-probability only moves the loss from 0.6931 to 0.3711. Raising beta makes DPO punish any drift from the reference much harder, which is the same leash idea as in stage 3.',
    },
    {
      type: 'intuition',
      title: 'Worked case: four preference pairs, scored by hand',
      md: `A team has trained a reward model and wants to check it before spending GPU hours on stage 3. They pull four held-out preference pairs, run the reward model on both answers in each, and get these scores:

1. chosen **2.4**, rejected **0.9**
2. chosen **1.1**, rejected **1.6**
3. chosen **0.3**, rejected **0.1**
4. chosen **5.7**, rejected **4.2**

**Step 1 — accuracy.** Count the pairs where the chosen answer scored higher: pairs 1, 3 and 4. Pair 2 is backwards. That is 3 out of 4, so the reward model agrees with humans 75% of the time. Anything near 50% would mean it learned nothing; published reward models typically land in the 65 to 75% range, so this is normal, not broken.

**Step 2 — turn each gap into a probability.** The gaps are +1.5, −0.5, +0.2 and +1.5.

- sigmoid(+1.5) = 0.818, so the model gives the human verdict an 82% chance on pair 1.
- sigmoid(−0.5) = 0.378, so on pair 2 it gives the human verdict only a 38% chance.
- sigmoid(+0.2) = 0.550. On pair 3 it is barely more sure than a coin flip.
- Pair 4 is +1.5 again, so 0.818, identical to pair 1 despite the scores being 5.7 and 4.2 rather than 2.4 and 0.9. Only gaps matter.

**Step 3 — the loss on each pair.** Loss is −log of those probabilities: 0.201, 0.973, 0.598, 0.201. The average is 0.493.

**Step 4 — read it.** Compare 0.493 against 0.693, which is the loss a model that always said "coin flip" would get. We are below it, so the reward model carries real signal. But pair 2 alone contributes 0.973, roughly double the average — one confidently wrong pair dominates the total. That is the pair worth reading by hand, because there are only two possibilities: the reward model is wrong, or the labeller was.

**Step 5 — the decision.** 75% agreement and a per-pair loss below 0.693 is good enough to proceed to stage 3, but pair 3's gap of 0.2 is a warning. A reward model whose gaps are mostly tiny will be easy to hack, because the policy only needs to find text worth 0.3 of spurious reward to beat a genuine improvement. Set β on the tighter side and watch the sampled text, not just the reward curve.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: reading the reward curve and nothing else',
      md: `Here is the wrong answer, walked into deliberately.

A team runs stage 3 for 2,000 steps. The dashboard shows average reward rising from 1.8 to 6.4 — a smooth, beautiful curve with no instability. They conclude the alignment run worked and ship it. Human evaluation then comes back *worse* than the SFT checkpoint they started from.

**What actually happened.** Look back at snippet 2. At β = 0 the hacked policy scores 9.360 and the sane policy scores 2.900. The reward number went up by a factor of three, and the text became *"Sure! Sure! Sure!"*. Rising reward is exactly what reward hacking looks like from the outside. It is not evidence that the run worked; it is compatible with the run working *and* with the run failing completely, so on its own it tells you nothing.

**Why the mistake is so easy to make.** In ordinary supervised training, the loss going down really does mean the model is getting better at the thing you measured, because the thing you measured is fixed and true. Here the thing you measured is itself a learned model with flaws, and the policy is actively hunting for those flaws. The moment your objective is a learned approximation, "the objective improved" stops being proof of anything.

**What to look at instead.** Three numbers, together, every time:

- **The KL distance from the reference.** If it is growing without bound, the leash is too loose whatever the reward says. This is the single most diagnostic number in the whole pipeline.
- **Average response length.** The most reproducible reward-model bias is that longer answers score higher, because labellers mildly prefer thorough ones. If reward rose and length doubled, you have probably bought padding, not quality.
- **Actual sampled text**, read by an actual human, at several checkpoints. There is no substitute, and it takes ten minutes.

**The general rule.** When a measure becomes a target, it stops being a good measure. That is Goodhart's law, and RLHF is the cleanest demonstration of it in machine learning: the reward model is a measure of quality, the policy turns it into a target, and it stops measuring quality.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work each one before reading the solution below it.

**Problem 1.** Reward model P scores two answers 3.1 and 1.1. Reward model Q scores the same two answers 0.1 and −1.9. Do they disagree?

**Problem 2.** A reward model gives the chosen answer 2.0 and the rejected answer 2.0 on every pair in your validation set. What is the loss, and what has the model learned?

**Problem 3.** You run stage 3 with β = 5.0 and the final model is almost indistinguishable from the SFT checkpoint. Reward barely moved. What is happening and what do you change?

**Problem 4.** You have 50,000 thumbs-up and thumbs-down clicks on individual responses from your product. No pairs. Can you run DPO on this directly?`,
    },
    {
      type: 'intuition',
      title: 'Practice solutions',
      md: `**Solution 1.** No — they express the identical preference with identical strength. Both gaps are exactly 2.0, so both give sigmoid(2.0) = 0.881 for the first answer beating the second. Adding a constant to every reward changes no prediction anywhere. This is why a raw reward number is never reportable on its own and why reward scales cannot be compared across two training runs. Q's −1.9 being negative means nothing either; the sign of a reward is not a verdict.

**Solution 2.** The gap is 0 on every pair, so the predicted probability is sigmoid(0) = 0.5 and the loss is −log(0.5) = 0.6931 on every pair. The model has learned nothing about preference at all — it is a coin flip dressed up as a scorer. 0.6931 is therefore the number to compare every reward model against: below it means real signal, at it means none. Feeding this reward model into stage 3 would give the policy pure noise to climb, and the KL leash would be the only thing keeping the output readable.

**Solution 3.** β = 5.0 is a very short leash. Look at the snippet 2 output: at β = 3.0 the sane policy already wins, and it wins by refusing to move. Push β higher and *any* movement from the reference costs more than the reward it earns, so the optimum is simply to stay put. That is what you are seeing. The fix is to lower β, but do it while watching the measured KL distance from the reference rather than guessing — pick a KL budget you are comfortable with and choose the β that lands you there. If lowering β makes the text degrade before the reward gain is worth having, the problem is a weak reward model, not β.

**Solution 4.** Not directly. The DPO loss needs four log-probabilities per training example, and two of them come from the rejected answer to *the same prompt*. A thumbs-down on a response with no corresponding thumbs-up on that prompt gives you half a pair. Three options: (a) construct pairs by matching an up-voted and a down-voted response on the same or a near-identical prompt, which works but usually leaves you with far fewer than 50,000 usable pairs; (b) use KTO, a DPO variant built specifically for unpaired thumbs data — this is the intended tool; (c) run plain SFT on the up-voted responses only, which throws away every thumbs-down but is trivially simple and is a reasonable first checkpoint. Whichever you pick, check first that the thumb signal is not dominated by something irrelevant such as response length or how fast the answer streamed.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. This section is names and details you will meet later.

- **PPO** is the specific reinforcement-learning algorithm normally used in stage 3. Its distinguishing feature is a clip on the update: no single step is allowed to change the policy by more than a fixed amount, which stops one unlucky batch destroying the model. It also trains a fourth network, the value network, that predicts the reward an answer will get so the updates have lower variance.
- **The alignment tax.** Aligned models measurably lose some raw ability on standard benchmarks compared with the model they came from. The usual mitigation is to mix a little ordinary pretraining into the alignment updates.
- **Over-refusal** is the most common real user complaint about aligned models: a harmless request gets declined because it superficially resembles a risky one. The pressure toward it is structural — a refusal is easy for a reward model to score well and awkward for a labeller to mark wrong.
- **The DPO family, one line each.** IPO replaces DPO's loss shape with a squared one, because DPO keeps pushing the margin larger forever on pairs it already gets right. KTO learns from single thumbs-up/thumbs-down labels instead of pairs. ORPO folds preference tuning into the SFT stage so there is one training run and no reference model at all.
- **RLAIF and Constitutional AI** change where preferences come from: a model, given a written set of principles, does the comparing instead of a human. Much cheaper and it scales, but it moves the values question from "what did the labellers prefer?" to "who wrote the principles?".
- **Iterative or online DPO** is where the field mostly settled: generate fresh answer pairs with the current model, label them (increasingly with another model as judge), retrain, repeat. It recovers most of what offline DPO loses without any of the reinforcement-learning machinery.
- **The honest framing.** "Aligned" is not an absolute. It means aligned to the preferences of a specific, small, paid group of people working from guidelines someone wrote. No loss function decides whose values those should be.`,
    },
    {
      type: 'math',
      intro: 'The same three ideas in symbols, for when you meet them written this way. sigma is the sigmoid, r is the reward model, pi_theta is the policy and pi_ref the frozen reference.',
      latex: [
        'P(\\text{chosen wins}) = \\sigma\\!\\left( r(x, y_w) - r(x, y_l) \\right), \\qquad \\mathcal{L}_{\\text{RM}} = -\\log \\sigma\\!\\left( r(x, y_w) - r(x, y_l) \\right)',
        '\\max_{\\pi_\\theta} \\; \\mathbb{E}\\big[\\, r(x, y) \\,\\big] \\;-\\; \\beta \\, D_{\\mathrm{KL}}\\!\\left( \\pi_\\theta \\,\\|\\, \\pi_{\\text{ref}} \\right)',
        '\\mathcal{L}_{\\text{DPO}} = -\\log \\sigma\\!\\left( \\beta \\log \\frac{\\pi_\\theta(y_w \\mid x)}{\\pi_{\\text{ref}}(y_w \\mid x)} - \\beta \\log \\frac{\\pi_\\theta(y_l \\mid x)}{\\pi_{\\text{ref}}(y_l \\mid x)} \\right)',
      ],
    },
  ],
  quiz: [
    {
      question: 'Why is preference data collected as pairwise comparisons rather than ratings out of 10?',
      options: [
        { text: 'Pairwise labels are cheaper to store', explanation: 'Storage is not the constraint. A rating and a comparison are both a few bytes.' },
        {
          text: 'Humans are far more consistent comparing two items than assigning absolute scores',
          explanation: 'Correct. One person\'s 7 is another\'s 4, and the same person drifts across a shift. Agreement on "A or B?" is much higher.',
        },
        { text: 'A reward model cannot be trained on absolute scores', explanation: 'Backwards. You could train on scores if you had reliable ones. Comparisons were chosen because the human data is more trustworthy, not because of a modelling limit.' },
      ],
      correct: 1,
    },
    {
      question: 'The KL penalty in stage 3 measures the distance between which two things?',
      options: [
        { text: 'The policy and the reward model', explanation: 'These are not comparable. The reward model returns one number; it is not a set of word probabilities.' },
        { text: 'The policy and the pretrained base model from before SFT', explanation: 'Right idea, wrong checkpoint. The reference is the SFT model, the last one we trust to produce well-shaped answers.' },
        {
          text: 'The current policy and the frozen SFT reference model',
          explanation: 'Correct. The reference is a frozen copy of the SFT checkpoint, and the penalty is the leash keeping the policy near language we already know is sane.',
        },
      ],
      correct: 2,
    },
    {
      question: 'During stage 3 the measured reward climbs steadily while the sampled text degenerates into one repeated phrase. Most likely diagnosis?',
      options: [
        {
          text: 'Reward hacking, with too weak a KL penalty to stop it',
          explanation: 'Correct. Reward up and quality down means the policy found a region where the reward model is wrong, and beta was too small to hold it back. Snippet 2 shows this exactly: at beta 0 the degenerate policy scores 9.360 against 2.900.',
        },
        { text: 'The learning rate is too low', explanation: 'A too-low learning rate gives the opposite symptom: reward that barely moves at all.' },
        { text: 'The reward model was trained on too few pairs', explanation: 'A weak reward model makes hacking easier, but the specific pattern of reward rising while text collapses points at the missing leash.' },
      ],
      correct: 0,
    },
    {
      question: 'What does DPO remove compared with the three-stage RLHF pipeline?',
      options: [
        { text: 'The need for human preference data', explanation: 'No. DPO consumes exactly the same chosen/rejected pairs. It removes machinery, not labelling cost.' },
        {
          text: 'The separately trained reward model and the whole reinforcement-learning loop',
          explanation: 'Correct. Because the reward can be rewritten as a ratio between the policy and the reference, the preference loss applies directly to the policy. No reward model, no sampling during training.',
        },
        { text: 'The reference model', explanation: 'The reference is still needed. Every term in the DPO loss is measured relative to it. ORPO is the variant that drops it.' },
      ],
      correct: 1,
    },
    {
      question: 'Reward model A scores two answers 3.1 and 1.1. Reward model B scores the same two answers 0.1 and -1.9. What follows?',
      options: [
        {
          text: 'They express the same preference with the same strength, because only differences carry meaning',
          explanation: 'Correct. Both gaps are exactly 2.0, so both give sigmoid(2.0) = 0.881. Adding a constant to every reward changes nothing.',
        },
        { text: 'Model A is more confident', explanation: 'Absolute reward levels carry no meaning at all. The predicted probability depends only on the gap.' },
        { text: 'Model B prefers the second answer', explanation: 'It does not. -1.9 is still below 0.1. The sign of a reward is not a verdict; only the comparison is.' },
      ],
      correct: 0,
    },
    {
      question: 'In the DPO loss, why is each answer\'s log-probability measured as a difference against the reference model?',
      options: [
        { text: 'To keep the numbers numerically small', explanation: 'A side effect at best. Log-probabilities of long answers are large negative numbers either way.' },
        {
          text: 'Because the derivation defines the reward as beta times log(policy / reference), so the ratio to the reference IS the reward, and it stops the model being credited for answers that were already likely',
          explanation: 'Correct on both counts. The log-ratio is the reward by construction, and measuring against the reference means only the change the policy makes counts.',
        },
        { text: 'Because subtraction is faster than division', explanation: 'It IS the division, written in log space. Speed has nothing to do with it.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Walk me through RLHF end to end. Why does each stage exist?',
      answer:
        'Three stages. (1) SFT: fine-tune the pretrained model on human-written demonstrations with the ordinary next-word loss. This teaches the shape of an answer, because a pretrained model continues documents rather than answering them. (2) Reward model: humans compare two answers to the same prompt, and a model is trained on those comparisons to output a single quality score. Comparisons are used because human absolute ratings are noisy while relative judgements agree well. (3) Policy optimisation: sample answers from the SFT model, score them with the reward model, and push the model toward higher scores, with a KL penalty against the frozen SFT reference so it cannot drift into text that games the reward model. The split is a data-cost argument: writing demonstrations is expensive so stage 1 stays small, choosing between two answers is cheap so stages 2 and 3 scale.',
      isCaseBased: false,
    },
    {
      question: 'Why comparisons instead of ratings, and how does a comparison become a number?',
      answer:
        'Absolute human scores are unreliable: different scales between annotators and drift within one annotator across a session. Pairwise agreement is much higher, so the raw data is a prompt with a chosen and a rejected answer, with no numbers in it at all. The bridge is to model the probability that a human picks the chosen answer as sigmoid of the difference between the two rewards, then train by minimising minus the log of that probability. That is plain binary cross-entropy on the event "the chosen one won". The property worth naming: only the gap is identified. Adding a constant to every reward produces identical predictions, so a raw reward value is meaningless in isolation and reward scales are not comparable across runs.',
      isCaseBased: false,
    },
    {
      question: 'What is the KL penalty doing, and what happens at the two extremes of beta?',
      answer:
        'It charges the policy for moving its word probabilities away from the frozen SFT reference. The reason it is needed: the reward model is only accurate near the text it was trained on, and an optimiser will happily go find the region where the reward model is wrong. The KL term is a leash keeping the policy near language we know is sane. Large beta: the policy hugs the SFT model and alignment achieves almost nothing, because any movement costs more than it earns. Beta near zero: reward climbs while text degenerates into a repeated high-scoring phrase. Worth adding: the direction used is KL of the policy from the reference, which is mode-seeking, so aligned models legitimately lose output diversity as a side effect of the leash.',
      isCaseBased: false,
    },
    {
      question: 'Explain DPO\'s key insight. Why is no reward model needed?',
      answer:
        'The stage-3 objective, maximise reward minus beta times KL from a reference, has a known exact optimum: the reference probabilities re-weighted by e to the reward over beta, then normalised. Read that backwards and the reward is recoverable from the optimal policy: it equals beta times log of (optimal policy divided by reference), plus a term that depends only on the prompt. Substitute that into the preference loss, and because both answers in a pair share a prompt, the prompt-only term cancels. What is left is an ordinary classification loss on preference pairs computed from four log-probabilities: chosen and rejected, under the policy and under the reference. The language model is its own implicit reward model, so there is nothing separate to train and nothing to sample during training.',
      isCaseBased: false,
    },
    {
      question: 'When would you choose DPO over PPO-style RLHF, and when the reverse?',
      answer:
        'DPO by default: one trainable model plus a frozen reference whose log-probabilities can be precomputed once, an ordinary supervised loop, few knobs, and it fits on modest hardware. That covers almost any team without dedicated reinforcement-learning infrastructure. Online RL when you have the infrastructure and are chasing the last few points: it samples fresh answers from the current policy and scores them, so it keeps correcting the failures the model has right now, while offline DPO only ever sees a fixed pile of pairs possibly generated by a different model. Also prefer online RL when the reward is programmatic and cheap to check, such as unit tests or a maths verifier, because there the reward model problem disappears. The practical middle ground most teams landed on is iterative DPO: sample new pairs with the current model, label, retrain, repeat.',
      isCaseBased: false,
    },
    {
      question: 'Case: your stage-3 run reports average reward up 40 percent, but the human evaluation win-rate dropped. Debug it.',
      answer:
        'Reward up and quality down is the definition of reward hacking, so start there rather than at the optimiser. (1) Check response length against reward across checkpoints. The most common cause by far is the policy discovering that longer answers score higher, because labellers mildly prefer thorough ones. Fix by regressing reward on length and subtracting the fitted component, or by evaluating at matched length. (2) Check the KL distance from the reference over the run. If it grew without bound, beta is too small; raise it, or use a controller that targets a fixed KL budget instead of a fixed beta. (3) Check whether the reward model is still trustworthy on the new samples: score the current policy\'s outputs and put them next to human judgements on the same outputs. If the agreement has collapsed, the policy has walked off the reward model\'s training distribution and you need fresh preference data collected from the current policy. (4) Probe specifically for sycophancy and formatting tricks with targeted prompts. (5) Only after all of that, look at the reinforcement-learning hyperparameters. Two structural fixes worth naming: iterate the loop with new preference data from the current policy, and ensemble several reward models so a flaw in one does not survive.',
      isCaseBased: true,
    },
    {
      question: 'Case: your product has 50,000 thumbs-up/thumbs-down events on individual responses, no pairs, and one GPU. Design the alignment plan.',
      answer:
        'The data shape decides the method. Thumbs are unpaired binary signals, which is exactly what KTO was built for, so that is the first candidate: no pairs need to be synthesised. If you would rather stay on DPO, you can construct pairs by matching an up-voted and a down-voted response to the same or a near-identical prompt, but coverage will be thin and the pairing introduces bias. Plan: (1) filter and deduplicate, and check the thumb signal is not dominated by an irrelevant surface property such as length or streaming latency; (2) run a short SFT pass on the up-voted responses first, so the reference model sits close to the data distribution, because both DPO and KTO are sensitive to that; (3) train with a low-rank adapter so the policy and the reference fit on one GPU, and precompute the reference log-probabilities in a single pass since they never change; (4) evaluate against the SFT checkpoint on held-out prompts using pairwise win-rate plus a length-matched version, and separately track a capability benchmark for the alignment tax and a refusal probe for over-refusal; (5) iterate: sample fresh responses from the new model, ship to a slice of traffic, harvest new thumbs, retrain. Worth saying explicitly: no reward model is trained anywhere in this plan, and that is the point.',
      isCaseBased: true,
    },
    {
      question: 'Case: after alignment, users complain the assistant refuses too many harmless requests. What do you actually do?',
      answer:
        'First measure, because "too many" needs a number. Build a probe set of benign prompts that superficially resemble risky ones — chemistry homework, security concepts, medical questions, fiction involving conflict — and report a false-refusal rate alongside the genuine-harm refusal rate. You are moving along a curve, not fixing a single bug, so a change that halves false refusals while doubling genuine-harm compliance is not an improvement. Then find where the bias entered: the labelling guidelines, if refusing was made the safe click; the preference data, which you can test by scoring refusal-versus-helpful pairs with the reward model and seeing which wins; or the objective, if the safety signal has no counterweight at all. Fixes in increasing cost: a system prompt that explicitly authorises the benign category, which is immediate and free but can only steer within what training already made likely; then targeted preference pairs where a helpful answer beats an unnecessary refusal, followed by a short DPO pass; then rewriting the guidelines and re-collecting data, which is the right answer when the bias is systematic. Report both numbers every time.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Why alignment is needed at all', back: 'Pretraining maximises "likely next word", not "helpful answer". Ask a pretrained model how to fix a flat tyre and it replies with three more tyre questions, because that is what an FAQ page looks like.' },
    { front: 'The three RLHF stages, in and out', back: '1) SFT: demonstrations in, a model that answers in the right shape out. 2) Reward model: preference pairs in, a one-number scorer out. 3) Policy optimisation: SFT model plus reward model in, aligned model out, with a KL leash to the frozen reference.' },
    { front: 'Why pairwise comparisons, not ratings out of 10', back: 'Humans have no shared meaning for absolute scores and drift within a shift, but agree far more on "A or B?". Judging is also cheaper than writing, which is why stages 2 and 3 scale and stage 1 does not.' },
    { front: 'The reward-model loss', back: 'P(chosen wins) = sigmoid(r_chosen - r_rejected); loss = -log of that. Only the GAP is learned: scores 0.2 and 0.5 predict exactly the same thing as 10.2 and 10.5.' },
    { front: 'What the KL penalty is for', back: 'The reward model is only accurate near text it was trained on. The policy is an optimiser and will find where it is wrong. The penalty charges the policy for drifting from the frozen SFT reference. Beta is the leash length.' },
    { front: 'Reward hacking, concretely', back: 'Reward rises while quality falls. In the toy example, a policy putting 98% of its mass on "Sure! Sure! Sure!" scores 9.360 against a sane policy\'s 2.900 at beta 0 — and loses, -1.855 to 2.880, at beta 3.' },
    { front: 'The DPO insight', back: 'The KL-constrained optimum is the reference re-weighted by exp(reward/beta). Invert it: reward = beta * log(policy / reference) + a prompt-only term. Substitute into the preference loss and the prompt-only term cancels, leaving a plain classification loss on pairs. No reward model, no RL.' },
    { front: 'DPO: what it buys and gives up', back: 'Buys: one model training, ordinary supervised loop, no generation in the loop, far fewer knobs, runs on one GPU. Gives up: it is offline, so it never sees its own current mistakes; it is sensitive to the reference and data quality; and it guarantees the gap between answers, not their absolute likelihood.' },
  ],
  mindmapMarkdown: `- Alignment: RLHF, Reward Models & DPO
  - The problem
    - pretrained model predicts likely text, not helpful answers
    - "good answer" has no single correct string to copy
  - Stage 1: SFT
    - human demonstrations, ordinary next-word loss
    - teaches the SHAPE of an answer
    - kept twice: as policy, and as frozen reference
  - Stage 2: reward model
    - comparisons beat ratings: humans agree on "A or B?"
    - P(chosen wins) = sigmoid(gap); loss = -log of it
    - only the GAP is identified, never the level
  - Stage 3: policy optimisation
    - push policy up the reward, KL penalty pulls back to reference
    - beta = leash length; beta 0 -> gibberish, beta huge -> no change
  - Reward hacking
    - reward up, quality down; Goodhart's law
    - watch KL distance, response length, actual sampled text
  - DPO
    - KL-constrained optimum -> reward IS a log-ratio to the reference
    - prompt-only term cancels -> classification loss on pairs
    - simpler, cheaper, stabler; but offline and reference-sensitive
  - Beyond the basics
    - PPO clipping and the value network
    - alignment tax, over-refusal, reduced diversity
    - IPO / KTO / ORPO / RLAIF; iterative online DPO`,
}

export default m
