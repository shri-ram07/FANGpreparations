import type { Module } from '../types'

const m: Module = {
  id: 'genai-l2-pretraining-scaling',
  subjectId: 'genai',
  level: 2,
  title: 'Pretraining & Scaling Laws',
  whyItMatters:
    'Every large language model you have used was built by one boring procedure repeated for months: look at some text, guess the next piece, check the guess, adjust. This module builds that procedure from a single six-word sentence, then shows the arithmetic that decides how big the model should be and how much text it should read. By the end you can take a dollar figure and work out, on paper, what size of model that money buys.',
  assumes: [
    'You have seen a Python list, a for loop, and a function definition',
    'You know what a percentage is and how to multiply and divide numbers written as powers of ten, like 7e9 meaning 7 billion',
    'You have read *Tokenization: How Text Becomes Numbers*, so you know a token is a chunk of text turned into a number',
    'No other machine learning background is needed. Every term used here is defined here.',
  ],
  estMinutes: 34,
  sections: [
    {
      type: 'intuition',
      title: 'One sentence, five training examples',
      md: `Take the sentence **"the cat sat on the mat"**. Split it on spaces and you get six pieces: the, cat, sat, on, the, mat. For this module treat each word as one **token** — a token is just a chunk of text that the model handles as a single unit.

Now build the training data out of it. There are no human labels anywhere. Instead:

- Show the model **"the"**, and the right answer is **"cat"**.
- Show it **"the cat"**, and the right answer is **"sat"**.
- Show it **"the cat sat"**, and the right answer is **"on"**.
- Show it **"the cat sat on"**, and the right answer is **"the"**.
- Show it **"the cat sat on the"**, and the right answer is **"mat"**.

Six tokens produced five training examples, and a human wrote none of them. The sentence supplied both the question and the answer. That is the whole idea, and the rest of this module is about what happens when you do it a few trillion times.`,
    },
    {
      type: 'visual',
      component: 'Plot',
      props: {
          title: 'Scaling laws: loss against model size',
          notice: 'Every step right is 10x the parameters. Going from 1e6 to 1e7 buys 0.64 nats; from 1e11 to 1e12 buys only 0.26. The curve never turns down sharply and never flattens to zero — it is a power law, so improvement keeps coming but each 10x buys less than the last. That is why labs plan budgets in orders of magnitude, not percentages.',
          kind: 'line',
          xLabel: 'log10(parameters)',
          yLabel: 'loss (nats)',
          series: [
            {
              name: 'test loss',
              points: [[6, 4.0159], [6.25, 3.844], [6.5, 3.6794], [6.75, 3.5219], [7, 3.3712], [7.25, 3.2269], [7.5, 3.0887], [7.75, 2.9565], [8, 2.83], [8.25, 2.7088], [8.5, 2.5929], [8.75, 2.4819], [9, 2.3756], [9.25, 2.2739], [9.5, 2.1766], [9.75, 2.0834], [10, 1.9943], [10.25, 1.9089], [10.5, 1.8272], [10.75, 1.749], [11, 1.6741], [11.25, 1.6024], [11.5, 1.5338], [11.75, 1.4682], [12, 1.4053]],
              dots: true,
            },
          ],
        },
    },
    {
      type: 'intuition',
      title: 'The four words you need before anything else',
      md: `Define these now, because every later sentence uses them.

- **Pretraining** — the first and by far the longest stage of building a language model, where the model reads enormous amounts of ordinary text and learns to continue it. Nothing about being helpful, polite or truthful happens here.
- **Next-token prediction** — the single task the model is trained on: given the text so far, produce a guess for the next token. There is no second task.
- **Self-supervised** — the labels come out of the data itself rather than out of a human. In our sentence, the token "cat" is the label for the input "the". No annotator was paid. This is the same trick, applied to images and audio too, that the DL module *Self-Supervised Learning: Labels Out of Raw Data* covers in general.
- **Corpus** — the pile of text you train on. A modern corpus is web pages, books, code repositories, encyclopaedia articles and forum posts, cleaned and glued into one long stream of tokens.

The reason a corpus can be huge is exactly the self-supervised part. Labelled data costs money per example. Self-labelled data costs only the crawl.`,
    },
    {
      type: 'intuition',
      title: 'The shift by one is the whole trick',
      md: `In the code below you will see the training data built by taking one list of tokens and lining it up against **the same list moved one step to the left**.

- The inputs are every token except the last one.
- The targets are every token except the first one.
- Position by position, the target is the token that came immediately after the input.

That single shift is what turns a plain piece of text into thousands of question-and-answer pairs. People skim past it because it is one line of code, and then they cannot explain where the training signal comes from. It comes from the shift.

One more practical detail: the model does not process those five examples one at a time. It sees the whole window of six tokens at once and is scored on all five predictions in the same step, which is why training is fast enough to be possible at all.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 1: build the inputs and targets from one real sentence',
      code: `sentence = "the cat sat on the mat"   # one ordinary sentence, nothing special about it
tokens = sentence.split()             # .split() with no argument cuts on spaces -> a list of 6 strings
print(tokens)                         # look at the list before doing anything to it
inputs = tokens[:-1]                  # slice: start at 0, stop BEFORE the last item -> drops "mat"
targets = tokens[1:]                  # slice: start at position 1 -> drops "the", the first item
print(inputs)                         # 5 items
print(targets)                        # 5 items, the same list shifted one step left
for i in range(len(inputs)):          # walk both lists together, position by position
    print(inputs[i], "->", targets[i])  # inputs[i] is what the model sees, targets[i] is the answer

# ---- real output ----
# ['the', 'cat', 'sat', 'on', 'the', 'mat']
# ['the', 'cat', 'sat', 'on', 'the']
# ['cat', 'sat', 'on', 'the', 'mat']
# the -> cat
# cat -> sat
# sat -> on
# on -> the
# the -> mat`,
      annotations: {
        4: 'A slice writes list[start:stop] and gives you a new list. Leaving start blank means "from the beginning". -1 counts from the right-hand end, so [:-1] means "everything up to but not including the last item".',
        5: 'Leaving stop blank means "to the end". So [1:] is everything from position 1 onwards, which is the same list slid one place to the left.',
        8: 'len(inputs) is 5, so range(5) produces 0,1,2,3,4 — the five positions that exist in both lists.',
        9: 'Read the printed arrows as the five training examples. Nobody typed them; the shift produced them.',
      },
    },
    {
      type: 'intuition',
      title: 'What the model actually sees at each step',
      md: `The five arrows above are slightly simplified. The model does not see only the single previous token — it sees **everything before the position it is predicting**. The second snippet prints that properly: at each step the input grows by one token and the answer is the next one.

That growing prefix is why the model has to remember and combine what came earlier. To fill the last blank correctly it must have kept "the" from five tokens back.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 2: the input is the whole prefix, not just one token',
      code: `tokens = ['the', 'cat', 'sat', 'on', 'the', 'mat']  # the same six tokens as before
for i in range(1, len(tokens)):                    # start at 1: position 0 has no prefix to learn from
    prefix = tokens[:i]                            # every token BEFORE position i
    print(" ".join(prefix), "==>", tokens[i])      # " ".join(list) glues the list back into one string

# ---- real output ----
# the ==> cat
# the cat ==> sat
# the cat sat ==> on
# the cat sat on ==> the
# the cat sat on the ==> mat`,
      annotations: {
        2: 'range(1, 6) produces 1,2,3,4,5. Position 0 is skipped because there is nothing in front of the very first token.',
        3: 'The slice stop value is i, so the prefix ends just before position i. Each turn of the loop makes it one token longer.',
        4: 'Joining is only for display — the model gets the list of tokens, not the glued string.',
      },
    },
    {
      type: 'intuition',
      title: 'Why such a dumb task teaches so much',
      md: `Predicting the next token sounds like a party trick. It is not, and the reason is that the corpus is broad enough that guessing well requires actually knowing things. Look at what each blank demands:

- *"The capital of France is ___"* — you cannot guess this from grammar. You need the **fact**. Any model that gets it wrong is punished on millions of similar sentences.
- *"She was born in 1984, so in 2004 she turned ___"* — you need to **subtract two numbers**. Word patterns will not save you.
- *"def add(a, b): return a ___ b"* — you need to know what the function name promises, which is **understanding code**, not counting symbols.
- *"The trophy did not fit in the suitcase because it was too ___"* — "big" or "small" depends on whether *it* means the trophy or the suitcase. You need to **track what the pronoun refers to**.

None of these skills were asked for. Each one is simply the cheapest available way to make the guesses better. Across a corpus that contains history, arithmetic, source code and argument, the cheapest way to predict text well turns out to be modelling the things the text is about.

This is also the honest answer to "it is just autocomplete". Yes, the training task is autocomplete. That describes the task, not the machinery the task forces the model to build.`,
    },
    {
      type: 'intuition',
      title: 'Epochs versus tokens seen',
      md: `Two counters get confused constantly, so separate them now.

- An **epoch** is one complete pass through your whole dataset. If you have 100 billion tokens and you train for 3 epochs, the model has been shown 300 billion tokens.
- **Tokens seen** is the total count of token predictions made during training, counting repeats.

Small-data training talks in epochs. Pretraining talks in tokens seen, because the corpus is so large that models often complete **less than one epoch**, or slightly more than one. Saying "trained for 2 epochs" tells a reader nothing unless they also know the corpus size, whereas "trained on 15 trillion tokens" is a complete statement. Every number in the rest of this module is tokens seen, written **D**.`,
    },
    {
      type: 'intuition',
      title: 'The three quantities you can spend',
      md: `Only three things go into a pretraining run, and every planning question is about the ratio between them.

- **Parameters (N)** — the adjustable numbers inside the model. Training means finding good values for all of them. A "7B model" has 7 billion parameters. More parameters means more capacity to store patterns.
- **Tokens (D)** — how many token predictions the model makes during training, as defined above.
- **Compute budget (C)** — the total arithmetic the run costs, measured in **FLOPs**. A FLOP is one floating-point operation: one multiply, or one add, on decimal numbers. It is the unit chips are sold in, so it converts directly into hours and money.

The rest is the relationship between these three. Two of them determine the third, and choosing them badly wastes the whole budget.`,
    },
    {
      type: 'intuition',
      title: 'Scaling laws in plain words',
      md: `Here is the observed pattern, stated carefully because the careful version is the useful one.

- If you grow the model, feed it more tokens, and spend more compute, the training loss goes down in a smooth and **predictable** way. Not in jumps. Not with plateaus. You can fit a curve on a handful of small cheap runs and it keeps holding as you scale up.
- The three must grow **together**. Growing parameters while keeping tokens fixed gives you a model with capacity it never fills. Growing tokens while keeping parameters fixed gives you a model too small to absorb what it is reading. Either way you paid for something you did not get.
- Improvement gets steadily more expensive. The relationship is a **power law**, which means each further equal-sized improvement in loss costs a constant *multiple* more compute, not a constant amount more. Going from a bad model to a decent one is cheap; going from very good to slightly better is not.
- The loss never reaches zero. Language is genuinely unpredictable in places, and there is a floor below which no amount of money helps.

Honesty about the word "law": this is an **empirical trend**, not a law of nature. It is a curve fitted to measurements over a range of sizes, and it has held remarkably well over many orders of magnitude, which is why people trust extrapolating it a little way past where they measured. It is not derived from first principles, the fitted numbers differ between labs and datasets, and nothing guarantees it continues forever. Treat it as a very reliable trend that lets you forecast a run before authorising it.`,
    },
    {
      type: 'intuition',
      title: 'The compute arithmetic: C = 6ND',
      md: `You can price a training run with one approximation, and it is worth understanding rather than memorising.

- **Forward pass** — the model makes its guesses. Each parameter takes part in roughly one multiply and one add for each token. That is **2 FLOPs per parameter per token**.
- **Backward pass** — the model works out how each parameter should change. This does about twice the work of the forward pass, because it computes two sets of adjustments, one flowing back through the network and one for the parameters themselves. That is **4 FLOPs per parameter per token**.
- Add them: **6 FLOPs per parameter per token**. Multiply by N parameters and D tokens and you get the total: **C ≈ 6 × N × D**.

Concretely, for a 7 billion parameter model trained on 140 billion tokens:

C = 6 × 7,000,000,000 × 140,000,000,000 = 5.88 × 10²¹ FLOPs.

What the approximation leaves out: the attention mechanism has an extra cost that grows with how long the context is, plus the embedding tables and the optimiser bookkeeping. For ordinary context lengths those add up to something like a twenty percent correction, which is fine for a plan and not fine for a paper.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 3: turn 6ND into hours and dollars',
      code: `def training_flops(N, D):        # N = number of parameters, D = number of tokens
    return 6 * N * D             # the rule: 6 FLOPs per parameter per token

N = 7e9                          # 7e9 is Python for 7 x 10**9, i.e. 7 billion parameters
D = 140e9                        # 140 billion tokens seen during training
C = training_flops(N, D)         # call the function and keep the answer
print("FLOPs needed:", C)        # print the raw total

chip = 989e12                    # one modern training chip, advertised at 989 trillion FLOP/s
useful = chip * 0.40             # real runs sustain about 40% of the advertised rate
seconds = C / useful             # total work divided by work per second = seconds
print("seconds on one chip:", seconds)          # a big, unreadable number
print("hours on one chip:", seconds / 3600)     # 3600 seconds in an hour
print("dollars at $2.50/hour:", seconds / 3600 * 2.50)  # rental price per chip-hour

# ---- real output ----
# FLOPs needed: 5.88e+21
# seconds on one chip: 14863498.483316481
# hours on one chip: 4128.749578699022
# dollars at $2.50/hour: 10321.873946747555`,
      annotations: {
        9: 'The advertised rate is a ceiling nobody reaches. Time is lost moving data between chips, loading the next batch, and on work that is not multiplication.',
        10: 'Sustaining 35 to 50 percent of the advertised rate is a well-run job. Quoting the advertised number instead is the standard way to underestimate a training run by a factor of two or three.',
        11: 'Dividing total work by work-per-second gives seconds. Everything after this line is unit conversion.',
        14: 'About 4,100 chip-hours. Rent 256 chips and that is roughly 16 hours of wall-clock time, since the work divides across them.',
      },
    },
    {
      type: 'intuition',
      title: 'The compute-optimal split, and the mistake it corrected',
      md: `Now the interesting question. Suppose the budget C is fixed. Since C ≈ 6ND, choosing N *forces* D — you cannot pick both. So what is the best split?

The measured answer, from sweeping many model sizes at matched budgets, is that N and D should grow at roughly the same rate, which works out to about **20 tokens per parameter**.

Watch what that does to a fixed budget of C = 10²³ FLOPs. Put D = 20N into C = 6ND:

C = 6 × N × 20N = 120 N², so N = √(C / 120) = √(10²³ / 120) ≈ 2.9 × 10¹⁰.

So the best model for that budget is about **29 billion parameters trained on about 577 billion tokens**.

Compare that with what large models used to look like. One well-known 175-billion-parameter model was trained on 300 billion tokens — **1.7 tokens per parameter**, more than ten times short of the ratio above. Spend the same 10²³ FLOPs at that ratio and you get roughly a 113-billion-parameter model on 147 billion tokens. Same money, worse model, because most of those parameters never saw enough text to be worth having. That is what **under-trained** means: capacity paid for and left empty.

The next snippet does the three splits side by side so you can check the numbers.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 4: one budget, three ways to split it',
      code: `budget = 1e23                                  # a fixed compute budget, in FLOPs
print("ratio      parameters        tokens")   # a header so the columns are readable
for ratio in [1.3, 20.0, 320.0]:               # tokens per parameter: too few, right, too many
    N = (budget / (6 * ratio)) ** 0.5          # from C = 6*N*(ratio*N), so N = sqrt(C / (6*ratio))
    D = ratio * N                              # the tokens that the chosen ratio implies
    print(f"{ratio:6.1f} {N:15.3e} {D:13.3e}")  # f-string: :6.1f pads to 6 chars, 1 decimal; :15.3e is 15-wide scientific

# ---- real output ----
# ratio      parameters        tokens
#    1.3       1.132e+11     1.472e+11
#   20.0       2.887e+10     5.774e+11
#  320.0       7.217e+09     2.309e+12`,
      annotations: {
        4: '** 0.5 is Python for "raise to the power one half", which is the square root. The algebra above the snippet is the only algebra in this module.',
        6: 'An f-string lets you drop a variable into text by writing it in braces. Everything after the colon is formatting: e means scientific notation, f means plain decimal, and the number before the dot is the total width used for padding.',
      },
    },
    {
      type: 'note',
      md: 'Read those three rows again. **The budget is identical in all of them.** The only thing that changed is how it was split between model size and text, and that alone is the difference between 113 billion parameters that are starved, 29 billion that are well fed, and 7 billion that could have been larger. This is why the first question in a training design review is never "how many parameters?" — it is "what is the compute budget?"',
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One compute budget, three ways to spend it',
        notice: 'The budget on the left never changes. Only the split between model size and token count moves — and that split alone decides whether the money bought a good model.',
        leftLabel: 'what you choose',
        rightLabel: 'what you get',
        frames: [
          {
            note: 'Fix the budget at C = 1e23 FLOPs. Because C = 6ND ties N and D together, picking one of them picks the other. This is one choice, not two.',
            stack: [
              { name: 'budget C', value: '1e23 FLOP' },
              { name: 'N params', to: 'n' },
              { name: 'D tokens', to: 'd' },
            ],
            heap: [
              { id: 'n', value: '? params', label: 'you pick' },
              { id: 'd', value: 'D = C / 6N', label: 'forced' },
            ],
          },
          {
            note: 'Spend it on a huge model: 113B parameters leaves only 147B tokens, so 1.3 tokens per parameter. The model has capacity it never fills.',
            stack: [
              { name: 'budget C', value: '1e23 FLOP' },
              { name: 'N params', to: 'n', danger: true },
              { name: 'D tokens', to: 'd' },
            ],
            heap: [
              { id: 'n', value: '113B params', label: 'under-trained', danger: true },
              { id: 'd', value: '147B tokens', label: 'D/N = 1.3' },
            ],
          },
          {
            note: 'The compute-optimal split: N = sqrt(C/120) = 28.9B parameters and D = 20N = 577B tokens. Same budget, lowest loss.',
            stack: [
              { name: 'budget C', value: '1e23 FLOP' },
              { name: 'N params', to: 'n' },
              { name: 'D tokens', to: 'd' },
            ],
            heap: [
              { id: 'n', value: '28.9B params', label: 'optimal' },
              { id: 'd', value: '577B tokens', label: 'D/N = 20' },
            ],
          },
          {
            note: 'Go too small: 7.2B parameters on 2.31T tokens, 320 tokens per parameter. Worse training loss for the same money, because the model lacks capacity to use the text. Deliberate over-training is a separate argument, made at the end of the module.',
            stack: [
              { name: 'budget C', value: '1e23 FLOP' },
              { name: 'N params', to: 'n' },
              { name: 'D tokens', to: 'd' },
            ],
            heap: [
              { id: 'n', value: '7.2B params', label: 'small' },
              { id: 'd', value: '2.31T tokens', label: 'D/N = 320' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Emergent behaviour, and why the word is contested',
      md: `**Emergent behaviour** is the claim that certain abilities are absent in smaller models, stay absent as you scale up a bit, and then appear suddenly past some size — three-digit arithmetic and multi-step reasoning are the usual examples. Plotted, it looks like a switch flipping.

The serious objection is that the jump is often produced by **how the ability was scored**, not by the model. Suppose you score three-digit addition by exact match: the whole answer counts only if every digit is right. A model whose per-digit accuracy climbs steadily from 30% to 90% scores almost zero for a long time and then suddenly scores well, because getting all digits right at once needs high per-digit accuracy. Score the *same saved models* by per-digit accuracy instead and the curve is smooth and dull.

So the honest position: much of the reported suddenness is a scoring artefact, the underlying ability usually improves smoothly, and a few behaviours still look genuinely new rather than merely better. It remains a live disagreement. Use the term, but say which definition you mean.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: budgeting a run end to end',
      md: `You are handed **$50,000** of GPU rental and asked what model it buys. Work it out in five steps.

1. **Money to chip-hours.** At $2.50 per chip-hour, $50,000 buys 50,000 / 2.5 = **20,000 chip-hours**.
2. **Chip-hours to FLOPs.** One chip advertises 9.89 × 10¹⁴ FLOP/s. At 40% sustained that is 3.956 × 10¹⁴ FLOP/s. Over 3,600 seconds, one chip-hour delivers 3.956 × 10¹⁴ × 3600 ≈ **1.424 × 10¹⁸ FLOPs**.
3. **Total budget.** 20,000 × 1.424 × 10¹⁸ ≈ **2.85 × 10²² FLOPs**. That is C.
4. **Split it.** N = √(C / 120) = √(2.85 × 10²² / 120) = √(2.37 × 10²⁰) ≈ **1.54 × 10¹⁰**, so about **15 billion parameters**. Then D = 20N ≈ **308 billion tokens**.
5. **Check it against reality.** Do you actually have 308 billion tokens of decent text? If your cleaned corpus is 40 billion tokens, this plan is fiction. Either find more text, or train a smaller model, because 40 billion tokens is compute-optimal for roughly 2 billion parameters, not 15.

Two things this estimate quietly assumes: that nothing crashes, and that utilisation stays at 40% for the whole run. Real runs lose days to failed nodes and restarts. Add a margin of at least 30% before promising a date.

And the conclusion an honest engineer draws from step 5: $50,000 does not buy a competitive model from scratch. It buys a very good fine-tune of an existing one, which is the subject of *Fine-Tuning: Full FT, LoRA & QLoRA*.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: scaling parameters without scaling data',
      md: `A team has the same C = 2.85 × 10²² FLOPs from the worked case. Their reasoning: "bigger models are better, so let us build the biggest one the budget allows — 60 billion parameters."

Follow the arithmetic they skipped. The budget is fixed, so the tokens are forced:

D = C / (6N) = 2.85 × 10²² / (6 × 6 × 10¹⁰) = 2.85 × 10²² / 3.6 × 10¹¹ ≈ **7.9 × 10¹⁰**, about 79 billion tokens.

That is 79 / 60 ≈ **1.3 tokens per parameter**, against the 20 they should be aiming at. Fifteen times short.

**Why this is wrong, mechanically.** Parameters are storage. Tokens are what fills the storage with useful patterns. A parameter that is only ever nudged by a handful of relevant examples ends up close to where it was initialised, contributing noise rather than knowledge. The team paid for 60 billion parameters and got the usefulness of a much smaller model, while also paying the full inference cost of 60 billion parameters on every future request — twice punished.

**What they should have done.** Same budget, 15 billion parameters, 308 billion tokens. Lower loss, cheaper to run afterwards, and it fits on smaller hardware.

**The tell.** Whenever someone announces a parameter count without a token count, the number is uninterpretable. Ask "trained on how many tokens?" immediately. A closely related tell: a quoted loss or perplexity value means nothing without the tokenizer and the evaluation corpus attached, because a different tokenizer chops the same text into a different number of pieces and mechanically changes the number. Two labs quoting loss on different tokenizers are not comparable at all.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work these on paper first. Use 6ND, 20 tokens per parameter, and 1.424 × 10¹⁸ FLOPs per chip-hour at 40% sustained.

**1.** What is the compute-optimal token count for a 1.5 billion parameter model, and what does the run cost in FLOPs, chip-hours and dollars at $2.50 per chip-hour?

**2.** A model has 70 billion parameters and was trained on 1.4 trillion tokens. Is it compute-optimal? What did it cost in FLOPs and dollars?

**3.** Your compute budget is 10²¹ FLOPs. What is the compute-optimal parameter count and token count?

**4.** Your cleaned corpus is fixed at 300 billion tokens and you cannot get more. Someone proposes a 100 billion parameter model. What size should you train instead, and why?`,
    },
    {
      type: 'intuition',
      title: 'Solutions',
      md: `**1.** D = 20 × 1.5 × 10⁹ = **3 × 10¹⁰ tokens** (30 billion). C = 6 × 1.5 × 10⁹ × 3 × 10¹⁰ = **2.7 × 10²⁰ FLOPs**. Chip-hours = 2.7 × 10²⁰ / 1.424 × 10¹⁸ ≈ **190**. Cost ≈ 190 × 2.5 ≈ **$474**. A small model really is cheap; the price explodes only at scale.

**2.** D / N = 1.4 × 10¹² / 7 × 10¹⁰ = **20 tokens per parameter**, so yes, exactly compute-optimal. C = 6 × 7 × 10¹⁰ × 1.4 × 10¹² = **5.88 × 10²³ FLOPs**. Chip-hours = 5.88 × 10²³ / 1.424 × 10¹⁸ ≈ **413,000**, so about **$1.03 million** — assuming no failures, which never happens.

**3.** N = √(C / 120) = √(10²¹ / 120) = √(8.33 × 10¹⁸) ≈ **2.89 × 10⁹**, about 2.9 billion parameters. D = 20N ≈ **5.8 × 10¹⁰**, about 58 billion tokens. Sanity check: 6 × 2.89 × 10⁹ × 5.8 × 10¹⁰ ≈ 1.0 × 10²¹. It closes.

**4.** With D fixed, run the ratio the other way: N = D / 20 = 3 × 10¹¹ / 20 = **1.5 × 10¹⁰**, about 15 billion parameters. The proposed 100 billion would see 3 tokens per parameter and would be badly under-trained, costing 6 × 10¹¹ × 3 × 10¹¹ = 1.8 × 10²³ FLOPs to produce something a 15 billion parameter model beats at a fraction of the price. When data is the binding constraint, the data picks the model size.`,
    },
    {
      type: 'intuition',
      title: 'What pretraining does not give you',
      md: `A model straight out of pretraining is called a **base model**, and it is a text completer and nothing else. Ask one *"What is the capital of France?"* and a very likely continuation is *"What is the largest city in Germany? What is the currency of Japan?"* — because on the open web, a question is very often followed by more questions. The model is not being unhelpful. It is being accurate about its corpus.

- It does not follow instructions. "Summarise this" is text to continue, not an order.
- It does not refuse anything, because refusing was never rewarded.
- It has no idea of a conversation, a user, or an assistant, and no reliable sense of when to stop.

None of this is a defect. Instruction-following was simply not in the training task. Closing that gap is a separate stage covered in *Alignment: RLHF, Reward Models & DPO*, and adapting a base model to your own domain is covered in *Fine-Tuning: Full FT, LoRA & QLoRA*. This module deliberately stops at the base model. The one practical habit to take away now: when you download a checkpoint, check whether it is the base or the instruction-tuned variant. Shipping a base checkpoint as a chatbot is a common and very visible mistake.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Three refinements, none of which you need to follow the module above.

**The fitted curve.** The measured relationship is usually written as loss ≈ floor + (constant / N) raised to a small power, with that power around 0.076 for parameters. The consequence of such a small exponent is brutal: halving the reducible part of the loss requires roughly 2 raised to the power (1 / 0.076), which is about 9,000 times the parameters. Steady progress and exponentially rising cost are the same fact.

**Deliberate over-training.** The 20-tokens-per-parameter rule answers exactly one question: what is the cheapest way to reach a given loss, once. Production asks a different question, because a model is trained once and then answers requests billions of times, and the cost of each request scales with N and not with D. So it is often correct to train a model *smaller* than compute-optimal on far more tokens than the rule suggests — you pay more once and save on every request forever, and a smaller model also fits on cheaper hardware. Widely used open 8-billion-parameter models trained on 15 trillion tokens sit at roughly 1,875 tokens per parameter, nearly a hundred times past compute-optimal, entirely on purpose.

**Data quality moves the curve.** The scaling relationship assumes a fixed data distribution. Change the data and you shift the whole curve: removing duplicates and low-quality pages lets a smaller corpus match a much larger dirty one at equal compute. Duplicated text also pushes the model towards memorising exact strings, and any benchmark text sitting in the corpus quietly invalidates the scores you report. For a small team this is the highest-leverage knob available, because nobody is going to out-spend a frontier lab on compute.`,
    },
  ],
  quiz: [
    {
      question: 'Where do the training labels in pretraining come from?',
      options: [
        { text: 'Human annotators label each sentence with its topic before training', explanation: 'No annotation happens. Paying humans per example is exactly what makes trillion-token corpora impossible, which is why the self-labelling trick matters.' },
        { text: 'The text labels itself: the target sequence is the input sequence shifted one position, so each token is the answer for everything before it', explanation: 'Correct. That one shift turns any piece of text into a pile of question-and-answer pairs for free.' },
        { text: 'A smaller pretrained model generates the labels for the larger one', explanation: 'That describes a distillation setup, which is a different technique. Ordinary pretraining needs no other model.' },
      ],
      correct: 1,
    },
    {
      question: 'In C = 6ND, where does the 6 come from?',
      options: [
        { text: 'Six layers per block in a standard transformer', explanation: 'Layer count is already inside N. The 6 is per parameter, whatever the depth happens to be.' },
        { text: '2 FLOPs in the forward pass plus 4 more for the optimiser update', explanation: 'The optimiser update happens once per training step, not once per token, and it is small. The missing 4 come from the backward pass.' },
        { text: '2 FLOPs forward (one multiply and one add per parameter per token) plus 4 backward, since the backward pass does about twice the work', explanation: 'Correct. 2 + 4 = 6 FLOPs per parameter per token, then multiply by N and D.' },
      ],
      correct: 2,
    },
    {
      question: 'What is the compute-optimal token count for a 3 billion parameter model?',
      options: [
        { text: 'About 60 billion tokens', explanation: 'Correct: 20 x 3e9 = 6e10. The run costs C = 6 x 3e9 x 6e10 = 1.08e21 FLOPs.' },
        { text: 'About 3 billion tokens, one per parameter', explanation: 'That is roughly the ratio of the old very large models, and it is about twenty times short.' },
        { text: 'About 600 billion tokens', explanation: 'That is ten times past compute-optimal. Defensible for a model you will serve heavily, but not the compute-optimal answer.' },
      ],
      correct: 0,
    },
    {
      question: 'A team fixes its compute budget and then doubles the parameter count without changing anything else. What happens to the number of tokens the model sees?',
      options: [
        { text: 'It stays the same, since tokens and parameters are independent settings', explanation: 'They are not independent once the budget is fixed. C = 6ND ties them together, so choosing one forces the other.' },
        { text: 'It halves, because C = 6ND is fixed, so doubling N must halve D', explanation: 'Correct, and that is the whole trap: the bigger model is now trained on half the text and may well be worse.' },
        { text: 'It doubles, because bigger models need more data', explanation: 'They do need more data, which is exactly the problem — a fixed budget will not give it to them.' },
      ],
      correct: 1,
    },
    {
      question: 'Someone tells you a new model reaches a loss of 1.94. What is the first thing you should ask?',
      options: [
        { text: 'Which tokenizer and which evaluation corpus that number came from', explanation: 'Correct. A different tokenizer chops the same text into a different number of pieces, which changes the loss mechanically. Without both, the number cannot be compared to anything.' },
        { text: 'How many GPUs the run used', explanation: 'Useful for cost, but it tells you nothing about whether 1.94 is good or bad.' },
        { text: 'Whether the loss was measured in the last epoch', explanation: 'Epoch counts are nearly meaningless in pretraining, where corpora are often seen once. Tokens seen is the meaningful counter.' },
      ],
      correct: 0,
    },
    {
      question: 'What is the strongest objection to reported "emergent" abilities?',
      options: [
        { text: 'The benchmarks were contaminated with training data', explanation: 'Contamination is a real and serious problem, but it is a different criticism and does not explain the sharp shape of the curve.' },
        { text: 'All-or-nothing scoring such as exact match manufactures a sudden jump; rescoring the same saved models with a continuous measure shows smooth improvement', explanation: 'Correct. Per-digit accuracy climbing steadily produces a near-zero-then-sudden exact-match curve purely from the scoring rule.' },
        { text: 'The small models in those comparisons were trained with different optimisers', explanation: 'Not the argument, and mostly not true. The criticism is about the measurement, not the training setup.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain the pretraining objective, and why one task teaches so many skills.',
      answer:
        'The objective is next-token prediction and there is no second one. You take a stream of tokens, use it as the input, use the same stream shifted one position as the target, and train the model to make the target likely. Nobody labels anything, which is what makes trillions of tokens affordable. The reason it teaches so much is that the corpus is broad, so predicting well requires knowing things: filling the blank in "the capital of France is" needs a fact, "born in 1984, so in 2004 she turned" needs arithmetic, a return statement needs code semantics, and "it was too big" needs tracking what the pronoun refers to. None of those were goals. Each is simply the cheapest available route to lower loss, and across a broad enough corpus the cheapest route turns out to be modelling what the text describes.',
      isCaseBased: false,
    },
    {
      question: 'Derive C = 6ND and then use it: how long does a 7B model on 140B tokens take on 256 chips?',
      answer:
        'In the forward pass each parameter takes part in about one multiply and one add per token, giving 2 FLOPs per parameter per token. The backward pass does roughly twice that work, because it computes both the signal flowing back through the network and the update for each parameter, giving 4 more. Total 6, so C = 6ND. It ignores the attention term that grows with context length, the embeddings and optimiser bookkeeping, so it is good to about twenty percent. Numbers: C = 6 x 7e9 x 1.4e11 = 5.88e21 FLOPs. A chip advertising 989 TFLOP/s sustains roughly 40 percent in a well-tuned run, so about 4e14 FLOP/s. That is 5.88e21 / 4e14 = 1.47e7 chip-seconds, about 4,100 chip-hours, so roughly 16 hours across 256 chips, and about $10,000 at $2.50 per chip-hour. The important detail is using the sustained rate rather than the advertised one.',
      isCaseBased: false,
    },
    {
      question: 'What is the compute-optimal split, and what mistake did it correct?',
      answer:
        'For a fixed compute budget, C = 6ND means choosing the parameter count forces the token count, so the real question is the split. Sweeping many sizes at matched budgets shows the two should grow at roughly the same rate, which comes out near 20 tokens per parameter. Substituting D = 20N into C = 6ND gives C = 120N squared, so N = sqrt(C/120) and D = 20N. The mistake it corrected was the earlier belief that parameter count mattered far more than data, which led to very large models on comparatively little text — one prominent 175 billion parameter model saw 300 billion tokens, about 1.7 tokens per parameter. At matched compute, a model several times smaller trained on far more tokens reaches a lower loss. I would add the caveat that this is an empirical fit, not a law, and the constant shifts with data quality and setup.',
      isCaseBased: false,
    },
    {
      question: 'How honest is the phrase "scaling law"? Trend or law?',
      answer:
        'Trend, and a well-supported one. What was actually done is fitting a curve to measured loss across a range of model sizes, dataset sizes and budgets, finding it is close to a straight line on log-log axes, and observing that it keeps holding over many orders of magnitude. That is strong empirical regularity, not a derivation from first principles. Practically it earns its keep as a forecasting tool: fit on a dozen cheap small runs, extrapolate a little, and know roughly what a very expensive run will score before you authorise it, which is the only way to de-risk a spend you cannot iterate on. The honest caveats are that the fitted constants differ between labs and datasets, that changing the data distribution shifts the whole curve, that extrapolating far past the measured range is an act of faith, and that loss is not the thing anyone actually cares about — the mapping from loss to useful behaviour is much less predictable than the loss curve itself.',
      isCaseBased: false,
    },
    {
      question: 'Case: leadership gives you $200,000 of GPU budget and asks for a from-scratch model for an internal code assistant. Walk me through it.',
      answer:
        'Do the arithmetic out loud, because the arithmetic is the argument. At $2.50 per chip-hour that is 80,000 chip-hours. At 40 percent sustained, one chip-hour is about 1.42e18 FLOPs, so the budget is roughly 1.1e23 FLOPs. Compute-optimal is N = sqrt(C/120), about 30 billion parameters on 600 billion tokens. Then ask the questions the number hides. Do we have 600 billion tokens of good code and documentation, cleaned and deduplicated? Almost certainly not, and assembling it is a multi-month project on its own. The estimate also assumes no crashed jobs and steady utilisation, neither of which is real, and it contains nothing for the stage that makes a model follow instructions. Meanwhile an existing open base model has already seen many trillions of curated tokens. So the recommendation is not to pretrain: spend a small amount fine-tuning a strong open code model on our repositories, spend more on retrieval over our codebase and docs, and hold the rest for evaluation and serving. If leadership needs a from-scratch artefact, the honest counter-offer is continued pretraining — take an existing checkpoint and train it further on 50 to 100 billion tokens of our own domain text, which captures most of the domain benefit for a fraction of the budget. Naming what you would not build is the substance of the answer.',
      isCaseBased: true,
    },
    {
      question: 'Case: your company will serve one model at 50 million requests a day for three years. Do you train compute-optimal, or over-train a smaller model?',
      answer:
        'Over-train the smaller one, and the reason is that compute-optimal answers the wrong question here. The 20-tokens-per-parameter rule minimises the compute needed to reach a given loss once. This model is trained once and then run about 5.5e10 times over three years, so the cost of serving dwarfs the cost of training. Serving cost scales with the parameter count and not with the tokens seen, so every parameter you remove pays back on every request forever, and a smaller model also fits on cheaper hardware, needs less memory for the running conversation, and answers faster, which affects the product and not just the bill. Concretely, instead of a compute-optimal 30 billion on 600 billion tokens, train an 8 billion on 5 to 10 trillion tokens. You pay several times more to train and recover it within weeks of serving. Widely used open 8 billion models at roughly 1,875 tokens per parameter are exactly this decision made in public. Two caveats worth stating: the returns from over-training do flatten, so past some multiple you are buying very little; and if top-end quality is the product, a bigger model with quantisation or distillation for serving can still win.',
      isCaseBased: true,
    },
    {
      question: 'Case: you are picking a base model for a Hindi-language customer support product. What do you check, in order?',
      answer:
        'Tokenizer fit comes first here, which is unusual and is the point of the question. A tokenizer trained mostly on English can spend three to four times more tokens on the same Devanagari sentence, which multiplies the cost of every request by the same factor and shrinks the usable context window by it too, so a claimed 32,000-token window becomes an effective 8,000 to 10,000 of Hindi. Measure it directly: push a few thousand real transcripts through each candidate tokenizer and compare tokens per message. Second, whether the pretraining corpus genuinely contained Hindi, which you test by measuring loss on held-out in-domain text rather than trusting the model card. Third, licence, because this is a commercial product and a research-only licence blocks the launch. Fourth, size against the latency budget — support chat needs a fast first response, so a well-served small model usually beats a much larger one. Fifth, the post-training state: is there an instruction-tuned variant with a documented chat template, and does its refusal behaviour misfire on ordinary billing complaints. Then plan a fine-tune on real transcripts plus retrieval over the help-centre articles, since those two move the metrics far more than swapping base models again.',
      isCaseBased: true,
    },
    {
      question: 'Why can you not ship a base model as a chatbot?',
      answer:
        'Because a base model is optimised for exactly one thing: the likelihood of the next token given web-scale text. Prompt it with "What is the capital of France?" and a high-likelihood continuation is more questions, because questions cluster together on FAQ pages. Four concrete gaps follow from that. It does not follow instructions, since "summarise this" is text to continue rather than a command. It has no refusal behaviour, because the corpus contains harmful text and continuing it is exactly what it was trained to do. It has no notion of turns, of a user or of an assistant persona, and no reliable stopping behaviour. And it has no calibrated helpfulness; it adopts whatever register the prompt establishes. All four are addressed by a later stage: supervised fine-tuning on instruction and dialogue data teaches the format, then preference optimisation tunes helpfulness and refusal. Practically this means always checking whether a downloaded checkpoint is the base or the instruction-tuned variant, and using the exact chat template it was tuned with, since a mismatched template costs a surprising amount of quality.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'The pretraining objective in one line', back: 'Next-token prediction. Inputs are the token stream, targets are the same stream shifted one position left. No human labels, which is why trillions of tokens are affordable.' },
    { front: 'Self-supervised', back: 'The labels come out of the data itself rather than out of a human. In "the cat sat", the token "cat" is the label for the input "the".' },
    { front: 'Why next-token prediction teaches facts and arithmetic', back: 'Because a broad corpus makes them the cheapest way to guess well: "the capital of France is" needs a fact, "born 1984, in 2004 turned" needs subtraction. Not goals, just useful.' },
    { front: 'Epoch vs tokens seen', back: 'An epoch is one full pass through the dataset. Tokens seen counts every prediction including repeats. Pretraining quotes tokens seen, because corpora are often seen once or less.' },
    { front: 'C = 6ND', back: '6 FLOPs per parameter per token: 2 forward (a multiply and an add) plus 4 backward. Ignores the attention term, embeddings and optimiser, so good to about 20 percent.' },
    { front: 'The compute-optimal split', back: 'About 20 tokens per parameter. Put D = 20N into C = 6ND to get C = 120N squared, so N = sqrt(C/120) and D = 20N. A 7B model wants 140B tokens, costing 5.88e21 FLOPs.' },
    { front: 'The classic under-training mistake', back: 'Growing parameters at a fixed budget forces tokens down, since C = 6ND. 60B parameters on a 2.85e22 budget gets only 79B tokens, 1.3 per parameter — capacity paid for and left empty.' },
    { front: 'Scaling law: trend or law?', back: 'A fitted empirical trend, not a derivation. Straight on log-log over many orders of magnitude, with an irreducible floor. Constants shift with data quality; extrapolating far past the measured range is faith.' },
  ],
  mindmapMarkdown: `- Pretraining & Scaling Laws
  - The objective
    - next-token prediction, one task only
    - inputs = tokens, targets = tokens shifted left by one
    - self-supervised: the text labels itself
    - corpus = the pile of text you train on
    - whole window scored at once, not one pair at a time
  - Why it teaches so much
    - "capital of France is" needs a fact
    - "born 1984, in 2004 turned" needs arithmetic
    - a return statement needs code semantics
    - "it was too big" needs pronoun tracking
    - none were goals, all are cheapest route to lower loss
  - Counting
    - epoch = one full pass over the dataset
    - tokens seen = total predictions, repeats included
    - pretraining quotes tokens seen, written D
  - The three quantities
    - N = parameters, the adjustable numbers
    - D = tokens seen
    - C = compute budget, measured in FLOPs
  - Scaling laws
    - loss falls smoothly and predictably
    - N, D and C must grow together
    - power law: equal gains cost a constant multiple more
    - irreducible floor, loss never reaches zero
    - a fitted trend, not a law of nature
  - C = 6ND
    - 2 FLOPs forward per parameter per token
    - 4 FLOPs backward
    - 7B on 140B tokens = 5.88e21 FLOPs
    - divide by sustained rate (~40%), not the advertised one
    - 1 chip-hour = about 1.42e18 FLOPs
  - Compute-optimal split
    - about 20 tokens per parameter
    - N = sqrt(C/120), D = 20N
    - C = 1e23 -> 28.9B params, 577B tokens
    - old style: 175B params on 300B tokens = 1.7 per param
  - The classic mistake
    - fixed budget, doubled params, halved tokens
    - 60B params -> only 79B tokens -> 1.3 per param
    - capacity paid for and left empty
    - also: a loss number without its tokenizer is meaningless
  - Worked case
    - $50,000 / $2.50 = 20,000 chip-hours
    - x 1.424e18 = 2.85e22 FLOPs
    - N = sqrt(C/120) = 15B params, D = 308B tokens
    - check the corpus actually exists
    - add 30% margin for crashes
  - Emergent behaviour
    - claim: abilities appear suddenly past a size
    - counter: all-or-nothing scoring manufactures the jump
    - continuous measures give smooth curves
    - contested term, say which definition you mean
  - What pretraining does not give
    - base model completes text, does not answer
    - no instruction-following, no refusals, no turns
    - closed by Alignment: RLHF, Reward Models & DPO
    - adapted by Fine-Tuning: Full FT, LoRA & QLoRA
    - check base vs instruct before shipping`,
}

export default m
