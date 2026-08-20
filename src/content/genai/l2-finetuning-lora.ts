import type { Module } from '../types'

const m: Module = {
  id: 'genai-l2-finetuning-lora',
  subjectId: 'genai',
  level: 2,
  title: 'Fine-Tuning: Full FT, LoRA & QLoRA',
  whyItMatters:
    'You have a pretrained model that is generally good. Making it good at YOUR task is the job every applied GenAI team actually does. This module gives you the three routes, the memory arithmetic that decides which one you can afford, and the LoRA parameter count you can do on paper in thirty seconds.',
  assumes: [
    'You know a model is a big pile of numbers called weights, and that training nudges those numbers',
    'You have seen a Python for loop and can read simple arithmetic',
    'You know roughly what a matrix is: a grid of numbers with a number of rows and a number of columns',
    'Helpful but not required: read Prompt Engineering That Actually Works and RAG End to End: Retrieve, Rerank, Generate first',
  ],
  estMinutes: 28,
  sections: [
    {
      type: 'intuition',
      title: 'The question this module answers',
      md: `You have a pretrained model. **Pretrained** means someone already trained it on a huge pile of general text, so it writes decent English, knows common facts, and follows simple instructions. It is generally good. It is not good at *your* task — replying in your company's support voice, tagging your ticket categories, quoting your contracts.

There are exactly three routes, and they are not interchangeable:

- **Prompt it.** Put instructions and a few examples in the message you send. Nothing about the model changes. Costs nothing, works today, taught in *Prompt Engineering That Actually Works*.
- **Retrieve for it.** Before answering, look up the relevant documents from your own store and paste them into the prompt. The model's weights still do not change; it just gets the facts handed to it. Taught in *RAG End to End: Retrieve, Rerank, Generate*.
- **Train it.** Change the model's weights using your own examples. That is **fine-tuning**, and it is what this module is about.

The honest ordering: try prompting first, add retrieval when the model is missing *facts*, and fine-tune when the model already has the knowledge but keeps getting the *behaviour* wrong — the wrong format, the wrong tone, the wrong choice among your labels.`,
    },
    {
      type: 'intuition',
      title: 'What fine-tuning actually does, and what it costs',
      md: `**Fine-tuning** = continue training an already-trained model on a small dataset of your own examples. Same machinery as the original training, just far fewer examples and far fewer steps.

**Full fine-tuning** means every weight in the model is allowed to move. All 7 billion of them, for a "7B" model. Two problems follow from that, and both are practical, not theoretical:

- **Catastrophic forgetting.** When every weight is free to move and your dataset is narrow, the model drifts toward your data and loses skills it used to have. Train it hard on 50,000 support tickets and it gets better at tickets while getting noticeably worse at everything else. Nobody deleted the old skill; the weights that held it simply moved.
- **Memory.** This is the one that stops you before you even start, and the numbers are worth computing by hand. That is the next section.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Why full fine-tuning does not fit: the memory arithmetic',
      code: `params = 7_000_000_000        # a "7B" model has 7 billion weights
weights = params * 2          # 16-bit means 2 bytes per weight
grads = params * 2            # one gradient per weight, same size again
opt_state = params * 4 * 2    # 2 extra numbers per weight, 4 bytes each
total = weights + grads + opt_state
gb = 1000 ** 3                # 1 GB = a billion bytes
print('weights   ', weights / gb, 'GB')
print('gradients ', grads / gb, 'GB')   # the backward pass fills this
print('optimizer ', opt_state / gb, 'GB') # the biggest slice, and invisible
print('total     ', total / gb, 'GB')
print('24 GB cards needed:', round(total / gb / 24, 1))

# real output:
# weights    14.0 GB
# gradients  14.0 GB
# optimizer  56.0 GB
# total      84.0 GB
# 24 GB cards needed: 3.5`,
      annotations: {
        5: 'Adds the three piles into one number. Training needs all three in memory at the same time, not one after the other.',
        7: 'Prints the first pile: just storing the model. This is the number people quote, and it is the smallest of the three.',
        10: 'The total, 84 GB, is six times the 14 GB of weights alone. That factor of six is the whole reason LoRA exists.',
        11: 'Divides by the memory of one common 24 GB consumer card. 3.5 means the job does not fit on one card, or two, or three.',
      },
    },
    {
      type: 'note',
      md: `Read line 4 again, because it is the surprising one. A **gradient** is the slope of the error with respect to one weight: which way to nudge that weight. You need one per weight, so that pile is the same size as the weights.

The **optimizer state** is extra bookkeeping the training algorithm keeps *per weight* so its nudges are smoother — commonly two extra numbers each, stored at 4 bytes rather than 2 for stability. Two numbers at 4 bytes is 8 bytes per weight, four times the size of the weights themselves. It is invisible in every diagram and it is the biggest slice of the bill.`,
    },
    {
      type: 'intuition',
      title: 'Train a small piece instead: adapters and rank',
      md: `Since the cost scales with *how many weights you train*, train fewer of them. That family of methods has a name: **parameter-efficient fine-tuning** (PEFT). You freeze the original model — **frozen** means its numbers are never changed, so it needs no gradients and no optimizer state — and you train a small new piece bolted on beside it. That small trainable piece is an **adapter**.

Now the concrete question. One weight matrix inside a 7B model is a grid of 4096 rows by 4096 columns. Full fine-tuning learns a change for every cell of that grid. **LoRA** — Low-Rank Adaptation — learns two thin matrices instead:

- Matrix **A** has 4096 rows and \`r\` columns. Matrix **B** has \`r\` rows and 4096 columns.
- Multiply them and you get back a 4096 by 4096 grid, the same shape as the change you wanted.
- \`r\` is the **rank**: the shared inner size, the width of the waist between the two thin matrices. **Low-rank** just means you chose a small \`r\` — 8 or 16, not 4096.
- At run time the model computes the original matrix's output and adds the adapter's output. The original weights are untouched, so you can unplug the adapter and get the base model back exactly.

Count the numbers both ways before believing any of it.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'LoRA parameter count, one matrix',
      code: `d = 4096                      # one weight matrix here is 4096 by 4096
r = 8                         # the rank: how thin the two new matrices are
full = d * d                  # numbers you train if you update W itself
lora = d * r + r * d          # matrix A is d by r, matrix B is r by d
print('full update:', full)   # every cell of the big square
print('LoRA r=8   :', lora)   # both thin matrices added together
print('ratio      :', full // lora, 'times fewer')
print('percent    :', round(100 * lora / full, 3), '%')

# real output:
# full update: 16777216
# LoRA r=8   : 65536
# ratio      : 256 times fewer
# percent    : 0.391 %`,
      annotations: {
        7: 'Integer division of the two counts. 256 times fewer trainable numbers, for the same output shape.',
        8: 'The same fact as a share: you are training under four tenths of one percent of that matrix.',
      },
    },
    {
      type: 'intuition',
      title: 'Why a small rank is often enough',
      md: `The saving is obvious. The reason it does not wreck quality is less obvious, so here it is plainly.

Fine-tuning is not teaching the model language from scratch. It is a small correction on top of a model that already works — answer in this format, prefer this word, pick this label. A correction like that is *repetitive*: it pushes many different inputs in the same few directions.

A rank-\`r\` matrix is exactly "a sum of \`r\` simple directions". So the rank you need is the number of genuinely different directions your correction has, not the size of the grid. A narrow, consistent task needs few. That is the bet LoRA makes, and it is a bet — a task that really does need broad, varied change will underfit at rank 8, and the fix is to raise the rank, which the next demo prices.`,
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `d = 4096
full = d * d
for rank in (1, 8, 64, 512):
    lora = 2 * d * rank
    share = 100 * lora / full
    print('r =', rank, '-> trains', lora, 'numbers =', round(share, 2), '% of full')`,
        precomputedOutput: `r = 1 -> trains 8192 numbers = 0.05 % of full
r = 8 -> trains 65536 numbers = 0.39 % of full
r = 64 -> trains 524288 numbers = 3.12 % of full
r = 512 -> trains 4194304 numbers = 25.0 % of full`,
        caption: 'Cost grows straight-line with rank: doubling r doubles the trainable numbers',
        annotations: {
          1: 'The matrix width, 4096 rows by 4096 columns, same one as before.',
          2: 'The full-update count to compare against: every cell of that grid.',
          3: 'A for loop over a tuple of four ranks. A tuple is just a fixed list written with round brackets.',
          4: 'The 2 is because there are two matrices, A and B, each of size d by rank.',
          5: 'Turns the count into a percentage of the full 4096 by 4096 update, so the four rows compare directly.',
          6: 'round(share, 2) keeps two decimal places, otherwise the percentage prints a long tail of digits.',
        },
      },
    },
    {
      type: 'intuition',
      title: 'Alpha: the volume knob on the adapter',
      md: `Fresh adapter matrices start tiny, and if their output were added at full strength the model's behaviour would jump around early in training. So LoRA multiplies the adapter's output by a fixed number before adding it. That number is written \`alpha / r\` and is called the **scaling**; \`alpha\` is the knob you set.

- Bigger scaling means the adapter's correction counts for more, so the model moves further from the base per step.
- Dividing by \`r\` is a convenience: it means when you raise the rank, the adapter does not get louder at the same time. You change capacity without also changing strength.
- The common starting point is \`alpha = 2 * r\`, giving a scaling of 2. If your fine-tune barely changes the output, raising alpha is a cheaper first move than raising rank.`,
    },
    {
      type: 'intuition',
      title: 'QLoRA: shrink the frozen part too',
      md: `LoRA killed the gradient and optimizer piles. The frozen weights are still 14 GB. **Quantisation** is storing each number in fewer bits — 4 bits instead of 16 — by keeping a small lookup of representative values per block of weights. You lose precision. Since those weights are frozen and only ever read, a little rounding in a read-only number is tolerable in a way that rounding a number you are still training is not.

**QLoRA** is exactly that combination: the frozen base stored in 4-bit, the adapters kept at higher precision because they are the part being trained. Compute the bill.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'QLoRA memory for a 7B model',
      code: `params = 7_000_000_000
gb = 1000 ** 3
print('base at 16-bit :', params * 2 / gb, 'GB')     # 2 bytes per weight
print('base at 4-bit  :', params * 0.5 / gb, 'GB')   # half a byte per weight
trainable = 40_000_000        # a typical adapter total for a 7B model
per_param = 2 + 2 + 8         # weight 2 B + gradient 2 B + optimizer 8 B
print('adapter memory :', round(trainable * per_param / gb, 2), 'GB')
print('4-bit + adapter:', round((params * 0.5 + trainable * per_param) / gb, 2), 'GB')

# real output:
# base at 16-bit : 14.0 GB
# base at 4-bit  : 3.5 GB
# adapter memory : 0.48 GB
# 4-bit + adapter: 3.98 GB`,
      annotations: {
        1: 'Same 7 billion weights as before, so the two bills are directly comparable.',
        2: 'One gigabyte as a plain billion bytes, so every printed number is arithmetic you can redo on paper.',
        7: 'The adapter pays the full 12 bytes per number, but only 40 million numbers pay it. That is why it is under half a gigabyte.',
        8: 'Just under 4 GB against 84 GB for full fine-tuning. Activations for your batch sit on top, and 24 GB leaves room for them.',
      },
    },
    {
      type: 'intuition',
      title: 'Instruction tuning: what you actually feed it',
      md: `**Instruction tuning** is fine-tuning on pairs of *instruction* and *desired response*, so the model learns to do what it is told rather than continue text.

- Each training example is one pair: a prompt the user might send, and the exact reply you want back.
- The loss is computed **only on the response tokens**. The prompt is masked out — the model is not being asked to learn to predict your questions, only to answer them. Getting this wrong is a common silent bug: training loss looks fine and the model learns to imitate prompts.
- Consistency beats volume. A thousand examples that all follow the same format teach that format; ten thousand inconsistent ones teach the model to be inconsistent.
- Every example must be *exactly* what you want in production, including the length and the refusals. The model copies what it sees, including your sloppiness.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Sizing your adapter across the whole model',
      code: `layers = 32                   # a 7B model stacks 32 transformer blocks
per_block = 2                 # we attach an adapter to 2 matrices per block
d = 4096
r = 16
adapters = layers * per_block * (2 * d * r)
print('trainable numbers:', adapters)
print('share of 7B model:', round(100 * adapters / 7_000_000_000, 3), '%')
print('file size at 16-bit:', round(adapters * 2 / 1000 ** 2, 1), 'MB')

# real output:
# trainable numbers: 8388608
# share of 7B model: 0.12 %
# file size at 16-bit: 16.8 MB`,
      annotations: {
        3: 'The width of each matrix, same 4096 as before.',
        4: 'Rank 16 this time, a common default. Doubling it doubles every number below.',
        5: 'Blocks times matrices per block times the per-matrix LoRA count from earlier. The brackets are just the earlier formula reused.',
        6: 'About 8.4 million trainable numbers in the whole model.',
        7: 'A tenth of a percent of the model is trainable. The other 99.88 percent is frozen.',
        8: 'The shipping consequence: the adapter is a 17 MB file. You can keep hundreds of them beside one copy of the base model.',
      },
    },
    {
      type: 'note',
      md: `**When NOT to fine-tune.** Two symptoms look like a fine-tuning problem and are not:

- *The model does not know a fact.* Your product prices, last week's policy, this customer's order. Fine-tuning teaches behaviour reliably and facts unreliably, and a fact you trained in cannot be corrected without training again. This is a retrieval problem: look the fact up and put it in the prompt.
- *The model knows what to do but formats it wrong.* Wrong JSON keys, too chatty, missing a section. Try the instruction and two examples in the prompt first. That change takes five minutes and costs nothing.

Fine-tuning earns its place when prompting is already correct but inconsistent across thousands of calls, when your prompt has grown so long that its token cost hurts, or when the task is a narrow judgement no instruction captures well.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: budget a fine-tune end to end',
      md: `A support team wants a 7B model that replies in their house style. You have 5,000 approved ticket-and-reply pairs, averaging 400 tokens each, one 24 GB rented card at 0.60 dollars per hour. Work it out in order.

1. **Route.** The replies need house tone and a fixed structure. The model already understands the tickets. That is behaviour, not missing facts, so fine-tuning is the right route — with retrieval kept for order details, which must stay current.
2. **Method.** Full fine-tuning needs 84 GB, from the first snippet. You have 24. QLoRA it is: 4-bit base is 3.5 GB, adapters at rank 16 add about 0.5 GB, so under 4 GB of weights and plenty of headroom for activations.
3. **Tokens seen.** 5,000 examples x 400 tokens = 2,000,000 tokens per pass. Three passes over the data ("3 epochs") = **6,000,000 tokens**.
4. **Time.** At roughly 1,800 tokens per second on that card, 6,000,000 / 1,800 = 3,333 seconds = **56 minutes**.
5. **Cost.** 0.60 dollars per hour x 0.93 hours = **about 0.56 dollars** for the training run. The expensive part of this project is not the GPU; it is the human hours spent cleaning the 5,000 replies.
6. **What ships.** A 17 MB adapter file, not a new 14 GB model. Keep 500 tickets out of training as a held-out set and measure on those before shipping.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake, diagnosed',
      md: `The team above also wants the bot to know the refund policy. Someone writes 300 examples of the form *"What is the refund window?" -> "30 days from delivery."*, trains, and the loss drops beautifully. Then in testing the model says 14 days, then 45 days, then 30 days, then invents a restocking fee.

That is the expected result, and here is why. Training pushed the weights to make those exact 300 answers more likely — it did not write a fact into a slot, because there is no slot. The fact ends up smeared across millions of weights, competing with everything the model absorbed during pretraining, where "return window" appeared thousands of times with many different numbers. 300 examples do not outvote that. Worse, when the policy changes to 45 days you cannot edit it; you can only train again and hope.

The fix is to change route, not to add examples. Put the policy document in a store, retrieve the relevant paragraph, and paste it into the prompt — then the answer is 30 days because the model is reading it, and it becomes 45 days the moment you edit one document. Keep the fine-tune for what it is genuinely good at: the tone and the structure of the reply wrapped around that retrieved fact.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work each one on paper before reading the solution below it.

**1.** A weight matrix is 2048 by 2048 and you pick rank 4. How many numbers does LoRA train, and what share of the full update is that?

*Solution.* LoRA trains 2048 x 4 + 4 x 2048 = 8,192 + 8,192 = 16,384. The full update is 2048 x 2048 = 4,194,304. The ratio is 4,194,304 / 16,384 = 256, so 0.39 percent. Same 256 as the 4096 case, and that is not a coincidence: the ratio is d / (2r), and both examples halve d and r together.

**2.** A 1.5B model, 16-bit, full fine-tuning with the same optimizer as the snippet. Does it fit on a 24 GB card, ignoring activations?

*Solution.* Weights 1.5e9 x 2 = 3 GB. Gradients 3 GB. Optimizer 1.5e9 x 8 = 12 GB. Total 18 GB. It fits with 6 GB to spare on paper — but activations for a real batch will eat most of that, so it fits only at a small batch size. The general rule from the snippet holds: full fine-tuning costs about six times the 16-bit weight size.

**3.** Your rank-8 adapter underfits: the model still ignores your house format. You raise rank to 512. What did you just do, in numbers, and is it a good idea?

*Solution.* At d = 4096, rank 512 trains 2 x 4096 x 512 = 4,194,304 numbers per matrix, 25 percent of the full update. You have given up most of LoRA's saving, and with 5,000 examples that much capacity will memorise them rather than learn the pattern. Raise alpha first, then check whether the data is actually consistent, then try rank 32. Rank 512 is the point where you should ask why you are not just doing a full fine-tune.

**4.** You must serve 50 customer-specific fine-tunes of one 7B base. Compare storing 50 full fine-tunes against 50 adapters.

*Solution.* 50 full fine-tunes at 14 GB each is 700 GB, and each one is a separate model to load. 50 adapters at 17 MB each is 850 MB total, sitting beside a single 14 GB base — under 15 GB. Because an adapter is added to the base rather than baked into it, one loaded base can serve all 50 by swapping which small adapter is applied per request.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `- **Merging.** You can multiply A by B once and add the result into the base weights permanently. Inference then costs exactly what the base model costs, with no extra matrices in the path — but the adapter is no longer removable, and you can no longer swap adapters per request.
- **Where to attach.** Attaching adapters to more matrices per block, rather than raising the rank on a few, often buys more quality per trainable number. It costs more memory per step because more layers need their inputs kept for the backward pass.
- **What quantisation costs.** 4-bit storage loses a little accuracy on the frozen base, and that loss is there before you train anything. On a narrow task it is usually invisible; on tasks needing careful reasoning, compare a QLoRA run against a plain-LoRA run before assuming it is free.
- **Overfitting shows up fast.** With a few thousand examples, one to three passes over the data is normal. If validation loss turns upward while training loss keeps falling, you have gone too far — stop at the turn.
- **Always keep the base model as your control.** Evaluate the fine-tune and the untouched base on the same held-out set. A fine-tune that wins on your task but loses badly on general questions has bought you a narrow gain with catastrophic forgetting.`,
    },
  ],
  quiz: [
    {
      question: 'Full fine-tuning a 7B model at 16-bit needs about 84 GB. The weights are only 14 GB. Where does the rest go?',
      options: [
        { text: 'Activations for the batch', explanation: 'Activations are real and sit on top of the 84 GB, but they are not what turns 14 into 84. That number came from weights, gradients and optimizer state only.' },
        { text: 'Gradients (14 GB) plus optimizer state (56 GB)', explanation: 'Correct. One gradient per weight matches the weights at 14 GB, and two optimizer numbers per weight at 4 bytes each is 56 GB — the largest and least visible slice.' },
        { text: 'A second copy of the model kept for rollback', explanation: 'No rollback copy is involved. The three piles are weights, gradients and optimizer state.' },
      ],
      correct: 1,
    },
    {
      question: 'For a 4096 by 4096 matrix at rank 8, how many numbers does LoRA train?',
      options: [
        { text: '32,768', explanation: 'That is one thin matrix, 4096 x 8. There are two of them, A and B.' },
        { text: '65,536', explanation: 'Correct. 4096 x 8 + 8 x 4096 = 65,536, which is 0.391 percent of the 16,777,216 in the full update — 256 times fewer.' },
        { text: '16,777,216', explanation: 'That is the full update, every cell of the 4096 by 4096 grid. It is the number LoRA avoids.' },
      ],
      correct: 1,
    },
    {
      question: 'Your model needs to answer questions about prices that change weekly. Best route?',
      options: [
        { text: 'Fine-tune weekly on the new prices', explanation: 'Fine-tuning smears a fact across millions of weights, so it comes out unreliably, and you cannot edit it without training again. Weekly retraining is expensive and still wrong sometimes.' },
        { text: 'Retrieve the current price and put it in the prompt', explanation: 'Correct. Missing or changing facts are a retrieval problem. Edit one document and the next answer is right, with no training at all.' },
        { text: 'Raise the LoRA rank so the model has room for the prices', explanation: 'Rank controls how much behavioural change the adapter can express. It is not storage for facts, and raising it does not make recall reliable.' },
      ],
      correct: 1,
    },
    {
      question: 'In QLoRA, why is it acceptable to store the base weights in 4 bits but not the adapters?',
      options: [
        { text: 'The adapters are too small to quantise', explanation: 'Size is not the reason — small things can be quantised. The reason is what happens to them during training.' },
        { text: 'The base is frozen and only read; the adapters are being trained, and training needs precision', explanation: 'Correct. Rounding a read-only number costs a little accuracy once. Rounding numbers you are still nudging loses the small updates that training depends on.' },
        { text: '4-bit arithmetic is not supported for any matrix multiply', explanation: 'The 4-bit base is used in the forward pass just fine. The distinction is frozen versus trained, not supported versus unsupported.' },
      ],
      correct: 1,
    },
    {
      question: 'What does alpha do in LoRA, and why is the scaling written alpha / r?',
      options: [
        { text: 'It sets how many matrices get adapters; dividing by r spreads it evenly', explanation: 'Alpha has nothing to do with which matrices are adapted. That is a separate configuration choice.' },
        { text: 'It scales the adapter output; dividing by r keeps strength unchanged when you change rank', explanation: 'Correct. The adapter output is multiplied by alpha / r before being added, so raising rank changes capacity without also making the correction louder.' },
        { text: 'It is the learning rate for the adapter only', explanation: 'The learning rate is a separate setting. Alpha scales the adapter output at every forward pass, including at inference time.' },
      ],
      correct: 1,
    },
    {
      question: 'In instruction tuning, why is the loss computed only on the response tokens?',
      options: [
        { text: 'To make training faster by processing fewer tokens', explanation: 'The prompt tokens are still processed in the forward pass. The saving is not the point.' },
        { text: 'Because you want the model to learn to produce answers, not to produce your questions', explanation: 'Correct. Leaving the prompt in the loss teaches the model to imitate user prompts, which is a silent bug — training loss still looks healthy.' },
        { text: 'Because prompt tokens have no gradients', explanation: 'They would have gradients if you included them in the loss. Masking is a deliberate choice, not a limitation.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why can you not just fine-tune a 7B model on a single 24 GB GPU? Walk me through the memory.',
      answer:
        'Three piles, all resident at once. Weights at 16-bit: 7 billion x 2 bytes = 14 GB. Gradients: one per weight, same precision, another 14 GB. Optimizer state: two extra numbers per weight kept at 4 bytes for stability, so 7 billion x 8 = 56 GB. Total 84 GB, roughly six times the weight size, and activations for the batch sit on top of that. A 24 GB card is short by a factor of three and a half. The useful takeaway is the multiplier: full fine-tuning costs about six times the 16-bit weights, so you can size any model in your head.',
      isCaseBased: false,
    },
    {
      question: "Compute LoRA's parameter savings for a 4096 by 4096 weight matrix at rank 8, then give the model-level number.",
      answer:
        'The full update is 4096 x 4096 = 16,777,216 numbers. LoRA learns A at 4096 x 8 and B at 8 x 4096, so 32,768 + 32,768 = 65,536 — a factor of 256, or 0.391 percent. In general the ratio is d / (2r). At model level, attaching rank-16 adapters to two matrices in each of 32 blocks gives 32 x 2 x 2 x 4096 x 16 = 8.4 million trainable numbers, about 0.12 percent of a 7B model, which is a 17 MB file at 16-bit. That last number is the one with operational consequences: you can store hundreds of adapters beside one base model.',
      isCaseBased: false,
    },
    {
      question: 'Explain why LoRA works. Why should a rank-8 update be enough?',
      answer:
        'Fine-tuning is a correction on a model that already works, not fresh learning. The correction is repetitive: across many inputs it pushes the output in the same few directions — this format, this tone, this label preference. A rank-r matrix is exactly a sum of r simple directions, so the rank you need tracks how many genuinely different directions your correction contains, not the size of the weight grid. A narrow, consistent task needs few. It is a bet, not a law: a task requiring broad, varied change underfits at rank 8, and the symptom is that the model barely shifts no matter how long you train.',
      isCaseBased: false,
    },
    {
      question: 'What is QLoRA, and what does it cost you compared with plain LoRA?',
      answer:
        'QLoRA stores the frozen base weights in 4 bits instead of 16 and keeps the trainable adapters at higher precision. For a 7B model the base drops from 14 GB to 3.5 GB; rank-16 adapters with their gradients and optimizer state add roughly half a gigabyte, so under 4 GB of weights fits comfortably on one 24 GB card with room for activations. The cost is precision in the base: 4-bit rounding loses a little accuracy before you train anything, and steps are somewhat slower because quantised weights are unpacked during the forward pass. On narrow tasks the loss is usually invisible; on reasoning-heavy tasks, compare against plain LoRA rather than assuming it is free.',
      isCaseBased: false,
    },
    {
      question: 'When is fine-tuning the wrong tool, and what do you use instead?',
      answer:
        'Two cases. First, missing or changing facts — prices, policies, this customer\'s order. Training smears a fact across millions of weights where it competes with pretraining, so recall is unreliable and cannot be edited without retraining. That is retrieval: put the document in the prompt. Second, a formatting or tone problem you have not yet attempted in the prompt — an instruction and two examples takes five minutes and costs nothing. Fine-tuning earns its place when prompting is correct but inconsistent across thousands of calls, when the prompt has grown so long the token cost hurts, or when the task is a narrow judgement no instruction captures.',
      isCaseBased: false,
    },
    {
      question: "Case: a legal-tech company wants a model that answers questions about their clients' contracts, in their house drafting style, with citations. Fine-tune, retrieve, or both? Design it.",
      answer:
        'Both, and the split follows the facts-versus-behaviour line. The contracts are facts: they are client-specific, change, must be cited, and must never be invented — so they go in a retrieval store, chunked by clause, retrieved per question and pasted into the prompt with their source identifiers so citation is a matter of copying an identifier rather than remembering one. The house drafting style is behaviour: consistent phrasing, hedging conventions, section structure, and knowing when to refuse. That is what you fine-tune, with QLoRA on a few thousand approved answer pairs, each one written against a retrieved clause so the model learns to write in the presence of retrieved text rather than from memory. Loss is masked to the response only. For evaluation, hold out several hundred question-and-contract pairs and measure two things separately: citation correctness, which tests the retrieval half, and a style rating from their own lawyers, which tests the fine-tune half. If citations are wrong, more training will not help; fix chunking or reranking. Serving is one base model plus a small adapter, with client contracts isolated per tenant in the store — the isolation lives in retrieval, never in the weights, because a fact trained into weights cannot be deleted for one client.',
      isCaseBased: true,
    },
    {
      question: 'Case: your team fine-tuned a 7B model on 50k support tickets. Task accuracy is up 12 points, but users say it "got dumber" outside support. Diagnose and fix.',
      answer:
        'That is catastrophic forgetting, and the first question is whether it was a full fine-tune. If every weight was free to move and the data was narrow, the weights that held general ability drifted toward ticket language. The diagnosis is measurable, not a guess: run the base model and the fine-tune on the same general held-out set alongside the support set, and you should see the support number up and the general number down. The likely fix, in order: switch to LoRA or QLoRA so 99 percent of the model is frozen and cannot drift; if it is already LoRA, reduce how far you moved — lower alpha, fewer passes over the data, or a lower learning rate; stop at the epoch where the general score starts falling rather than the one where training loss is lowest. Mixing a slice of general instruction data into the training set also helps, because the gradient then has to keep both behaviours. Structurally, the mistake was evaluating on the target task only. Every fine-tune needs a regression set of general questions scored on every run, with the untouched base model as the control.',
      isCaseBased: true,
    },
    {
      question: 'Case: you must serve 50 customer-specific fine-tunes of the same 7B base on a small GPU budget. Design the serving.',
      answer:
        'Adapters make this easy and full fine-tunes make it impossible, so the design decision is made at training time. Fifty full fine-tunes are fifty 14 GB models — 700 GB of storage and a separate model load per customer, which means either fifty warm replicas or a slow swap on every request. Fifty rank-16 adapters are about 17 MB each, 850 MB in total, next to one 14 GB base: under 15 GB, so a single card holds everything. Because the adapter is added to the base rather than baked into it, one loaded base serves all fifty by applying the right small matrices per request; batching requests from different customers together is possible, at the cost of applying different adapters within the batch. Do not merge adapters into the base here — merging buys inference speed but destroys exactly the swappability this design depends on. Operationally, adapters are cheap artifacts: version them per customer, roll one back independently, and evaluate each against the shared base as the control. The one real risk is a per-request mix-up serving customer A with customer B\'s adapter, so the adapter identifier belongs in the request path and in the logs.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'The three routes to a task-specific model', back: 'Prompt it (nothing changes), retrieve for it (facts pasted into the prompt), train it (weights change). Try them in that order.' },
    { front: 'Full fine-tuning memory for a 7B at 16-bit', back: 'Weights 14 GB + gradients 14 GB + optimizer state 56 GB = 84 GB. Roughly six times the 16-bit weight size.' },
    { front: 'Catastrophic forgetting', back: 'Training every weight on a narrow dataset drags the model toward it and degrades skills it used to have. Freezing most of the model is the main defence.' },
    { front: 'LoRA in one sentence', back: 'Freeze the weight matrix; learn its change as two thin matrices, d x r and r x d, added to the original output.' },
    { front: 'LoRA parameter ratio', back: 'd / (2r). For d = 4096, r = 8: 16,777,216 vs 65,536 = 256 times fewer, or 0.391 percent.' },
    { front: 'Why a low rank is often enough', back: 'A fine-tune is a repetitive correction pushing many inputs in the same few directions, and a rank-r matrix is a sum of r directions.' },
    { front: 'alpha and the scaling alpha / r', back: 'The adapter output is multiplied by alpha / r before being added. Dividing by r means changing rank changes capacity without changing strength.' },
    { front: 'QLoRA memory for a 7B', back: '4-bit frozen base 3.5 GB + rank-16 adapters with their gradients and optimizer state about 0.5 GB = under 4 GB, so it fits one 24 GB card.' },
  ],
  mindmapMarkdown: `- Fine-tuning
  - Three routes
    - Prompt it - nothing changes
    - Retrieve for it - facts in the prompt
    - Train it - weights change
  - Full fine-tuning
    - 7B at 16-bit = 84 GB
    - weights 14 + grads 14 + optimizer 56
    - catastrophic forgetting
  - Parameter-efficient (PEFT)
    - Freeze the base, train an adapter
    - LoRA: d x r and r x d
    - 4096 sq at r=8 -> 65,536 vs 16.7M
    - rank = how many directions
    - alpha / r = strength knob
  - QLoRA
    - 4-bit frozen base = 3.5 GB
    - adapters stay higher precision
    - under 4 GB on one card
  - Instruction tuning
    - instruction -> desired response
    - loss masked to the response
    - consistency beats volume
  - Do not fine-tune for
    - missing facts -> retrieval
    - formatting -> prompting`,
}

export default m
