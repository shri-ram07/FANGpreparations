import type { Module } from '../types'

const m: Module = {
  id: 'dl-l3-ssl-and-scale',
  subjectId: 'dl',
  level: 3,
  title: 'Self-Supervised Learning: Labels Out of Raw Data',
  whyItMatters:
    'Almost every team has far more raw data than labelled data. A support desk with 5,000,000 stored tickets typically has about 800 that a human has actually sorted into categories. Ordinary training can only use those 800 and has to throw the other 4,999,200 away. Self-supervised learning is the trick that puts all 5,000,000 back to work by building the training targets out of the data itself. This module builds that trick from zero, with a cosine-similarity calculation you can do on paper, and ends with what happens when you scale it up.',
  assumes: [
    'You know what an average is, and what a square root is',
    'You have seen a Python list, a for loop, and a function definition',
    'You have read the Math module Vectors & the Dot Product (= Similarity) — this module uses cosine similarity constantly and re-explains it, but the Math module is where it is built from scratch',
    'No deep learning background is needed. Every term used here is defined here.',
  ],
  estMinutes: 34,
  sections: [
    {
      type: 'intuition',
      title: 'The problem: 800 labels, 5,000,000 tickets',
      md: `A company stores every support ticket customers have ever sent. After eight years that is **5,000,000 tickets**, sitting in a database, as plain text.

Now the team wants a model that reads a new ticket and says which of six departments it belongs to. To train that model the ordinary way, a human has to read tickets and write down the correct department for each one. Someone did that for a while and stopped. The count today is **800 labelled tickets**.

- A **label** is the correct answer for one example, written down by a human. "This ticket belongs to Billing."
- **Supervised learning** is training a model on examples that come with labels. The model guesses, you compare its guess with the label, you nudge the model. Every guess needs a label to compare against.
- So supervised learning can use 800 of the 5,000,000 tickets. The other 4,999,200 are unusable, not because they are bad, but because nobody wrote an answer next to them.
- Labelling is slow and expensive. At a realistic three minutes per ticket, labelling 100,000 of them is 5,000 hours of human work.
- Meanwhile raw unlabelled data keeps arriving for free, every day, forever.

That gap is the whole motivation. The cheap resource sits idle while everything waits on the expensive one.`,
    },
    {
      type: 'intuition',
      title: 'The core trick: invent a label from the data itself',
      md: `Here is the idea, stated as plainly as it can be stated. **Take one raw example, hide part of it, and make the model predict the hidden part.** The hidden part is the label. No human wrote it. It was already inside the data.

This is called **self-supervised learning**: the supervision (the answer to compare against) comes from the data, not from a person.

Three concrete versions of the trick:

- **Mask a word.** Take the sentence "the payment failed because the card expired". Delete "card". Feed the model the rest and ask it for the missing word. The correct answer is "card", and you got it for free by deleting it yourself. This is **masked prediction**.
- **Two crops of one image.** Take one photo of a dog. Cut out two different rectangles from it and change the colours of each slightly. You now have two pictures that look different but came from the same source file. Train the model so that its description of crop 1 and its description of crop 2 come out nearly the same.
- **Predict a rotation.** Turn a photo by 0, 90, 180 or 270 degrees, chosen at random. Ask the model which turn you applied. You know the answer because you chose it.

Any such invented job is called a **pretext task** — a fake job, invented only so that a model is forced to learn something real while doing it. Nobody cares whether the model can guess a deleted word. They care about what the model had to understand in order to guess it.`,
    },
    {
      type: 'intuition',
      title: 'What the model actually keeps: the representation',
      md: `When a model reads a ticket, the last thing it prints is a department name. But before that, inside, it has turned the ticket into a list of numbers, say 256 of them.

- That list of numbers is called the **representation** (or **embedding**) of the ticket. It is the model's compressed description of what the ticket is about.
- A good representation puts similar inputs at similar number-lists. Two refund complaints written by different people end up with nearby lists, even though they share almost no words.
- The pretext task is thrown away when it is finished. The representation is what you keep.

Two names for the two stages:

- **Pretraining** — the long, expensive run on all 5,000,000 unlabelled tickets, using the pretext task. Human labels used: zero.
- **Fine-tuning** — afterwards, take the pretrained model, attach a small new output layer with six slots (one per department), and train it on the 800 labelled tickets. It starts from a model that already understands tickets, so 800 labels are now enough.

The job you actually cared about — sorting tickets into six departments — is called the **downstream task**. There is also a cheaper way to measure the representation: freeze the pretrained model so none of its numbers can change, and train only a single layer on top of it. That is a **linear probe**, and because the frozen part cannot adapt, whatever accuracy the probe reaches is a clean measurement of how good the representation already was.`,
    },
    {
      type: 'intuition',
      title: 'Contrastive learning: same photo close, different photos far',
      md: `Take the two-crops pretext task and make it precise. This family of methods is called **contrastive learning**, because it trains by contrasting pairs against each other.

- An **augmentation** is a random change to an input that does not change what it is: crop it, flip it, shift the colours, blur it. A cropped, greyscaled dog is still a dog.
- Take one photo. Apply two different random augmentations. You now have two **views** of the same photo.
- Push each view through the model to get its representation.
- The two views of the same photo form a **positive pair**. Their representations should be close.
- A view of this photo paired with a view of any *other* photo is a **negative pair**. Those representations should be far apart.

"Close" and "far" need a number, and the number is **cosine similarity**: how aligned two lists of numbers are, ignoring how big they are. It runs from +1 (pointing the same way) through 0 (unrelated) to -1 (opposite). It is built from scratch in the Math module *Vectors & the Dot Product (= Similarity)*; the next snippet rebuilds it in eight lines so this page stands on its own.

Notice what the supervision is here. Not "this is a dog". Only: *these two pictures came out of the same file*. That fact is free.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 1: measure how close two views are',
      code: `import math                                  # math.sqrt is all we need; no libraries

def dot(u, v):                               # dot product: multiply matching slots, add up
    total = 0.0                              # running sum, starts empty
    for i in range(len(u)):                  # walk both lists position by position
        total = total + u[i] * v[i]          # slot i of u times slot i of v, added on
    return total                             # one number out

def length(u):                               # how long the list is as an arrow
    return math.sqrt(dot(u, u))              # a list dotted with itself, square-rooted

def cosine(u, v):                            # similarity, with length divided out
    return dot(u, v) / (length(u) * length(v))   # +1 aligned, 0 unrelated, -1 opposite

a = [0.9, 0.1, 0.8, 0.2]                     # view A of the dog photo (cropped)
b = [0.8, 0.2, 0.9, 0.1]                     # view B of the SAME dog photo (colour shifted)
c = [0.1, 0.9, 0.2, 0.8]                     # a different photo entirely (a car)
print("cos(A, B) two views of ONE photo =", round(cosine(a, b), 4))   # should be high
print("cos(A, C) two different photos   =", round(cosine(a, c), 4))   # should be low

# --- real output ---
# cos(A, B) two views of ONE photo = 0.9867
# cos(A, C) two different photos   = 0.3333`,
      annotations: {
        13: 'Dividing by both lengths is what makes this a similarity and not just a big-number contest. Without it, a representation that is simply larger would beat a representation that actually matches.',
        15: 'These four numbers stand in for a real representation, which would have hundreds of slots. Four is enough to do the arithmetic by hand, and the rules do not change with size.',
      },
    },
    {
      type: 'intuition',
      title: 'Turning three similarities into one loss',
      md: `0.9867 for the partner and 0.3333 for a stranger looks right, but training needs a **loss**: one number that is small when the model is doing well and large when it is not, so the model knows which way to adjust.

Build it in three steps, using the anchor view A against three others: its partner B, and two strangers C and D.

1. **Sharpen the scores.** Divide every similarity by a small number called the **temperature** (written as tau, typically 0.05 to 0.5), then raise e to that power. Dividing by 0.1 multiplies every gap by ten before the exponential, so a small lead becomes a big one. Small tau means the model is graded harshly on the near-misses.
2. **Turn them into shares.** Divide each sharpened score by the total of all three. Now they add to 1, and each one reads as "the share of the total that this pair claims".
3. **Score the partner's share.** The loss is minus the natural logarithm of the partner's share. A share of 1.0 gives a loss of 0. A share of 1/3 gives a loss of about 1.0986. The smaller the partner's share, the larger the loss.

Step 3 is the part that matters. The loss does not ask "is the partner score high?" It asks "**is the partner score high compared to the strangers?**" A model cannot win by pushing every score up, because the strangers are in the denominator too.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 2: the contrastive loss, on the same numbers',
      code: `def infonce(scores, tau):                    # scores[0] is the partner, the rest are strangers
    weights = []                             # will hold one sharpened score per pair
    for s in scores:                         # go through every similarity we measured
        weights.append(math.exp(s / tau))    # divide by temperature, then e to that power
    partner_share = weights[0] / sum(weights)    # the partner's slice of the whole total
    return -math.log(partner_share)          # share 1.0 -> loss 0; small share -> big loss

d = [0.2, 0.8, 0.1, 0.9]                     # a third photo (a cat) — another stranger
tau = 0.1                                    # temperature: small, so near-misses are punished
good = [cosine(a, b), cosine(a, c), cosine(a, d)]   # partner first, then the two strangers
print("scores      =", [round(s, 4) for s in good]) # round each one just for display
print("loss (good) =", round(infonce(good, tau), 4))    # a well-separated model

# --- real output ---
# scores      = [0.9867, 0.3333, 0.3467]
# loss (good) = 0.0031`,
      annotations: {
        5: 'sum(weights) adds every sharpened score, partner included. This single line is the reason the strangers matter: they sit in the denominator, so raising their scores lowers the partner share and raises the loss.',
        11: 'This is a list comprehension: it builds a new list by applying round() to every s in good. It changes nothing about the maths, only the printed digits.',
      },
    },
    {
      type: 'intuition',
      title: 'Why the negatives are not optional',
      md: `Suppose you drop the strangers and train only on "the two views must agree". The loss looks simpler and it is easy to make it zero.

The model finds a way to make it zero that you will not like: **output the exact same list of numbers for every single input.** Every photo, every ticket, one identical answer. Then the two views of one photo agree perfectly, because everything agrees perfectly with everything. The loss is zero and the representation is worthless — it carries no information about the input at all.

This failure is called **representation collapse**.

The negatives are the fix. With strangers in the denominator, a collapsed model gives similarity 1.0 to its partner *and* 1.0 to both strangers, so the partner's share is exactly 1/3 and the loss sits at exactly ln(3) = 1.0986. It gains nothing. Collapse stops being profitable, so the model does not go there.

There is a second family of methods that has no negatives at all and still does not collapse. They keep two copies of the model that update at different speeds, and only one of the copies is allowed to learn from the comparison — that lopsidedness is enough to stop both copies from drifting into the same constant answer. The details are under "Beyond the basics".`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 3: measure collapse and watch it earn nothing',
      code: `flat = [0.5, 0.5, 0.5, 0.5]                  # a collapsed model: ONE output for every input
collapsed = [cosine(flat, flat), cosine(flat, flat), cosine(flat, flat)]   # partner and strangers alike
print("collapsed scores =", collapsed)       # every pair scores a perfect 1.0
print("loss (collapsed) =", round(infonce(collapsed, tau), 4))   # what collapse actually earns
print("chance level     =", round(math.log(3), 4))   # ln(3): the loss of pure guessing among 3

# --- real output ---
# collapsed scores = [1.0, 1.0, 1.0]
# loss (collapsed) = 1.0986
# chance level     = 1.0986`,
      annotations: {
        2: 'Handing the same vector in three times is exactly what a collapsed model does: the input stopped mattering, so all three comparisons are the same comparison.',
        4: 'The two printed numbers below match to four decimals, and that is the whole argument. Collapse scores precisely what a coin-flipping model scores, so the optimiser has no reason to prefer it.',
      },
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One photo through a contrastive step',
        notice: 'One piece per frame. The left column is what you are holding; the right column is the number it produces. Nothing here uses a human label.',
        leftLabel: 'what you have',
        rightLabel: 'the number it produces',
        frames: [
          {
            note: 'Start with one raw photo. It has no label. Nobody has written "dog" next to it, and nobody will.',
            stack: [{ name: 'photo.jpg', value: 'raw, unlabelled', to: 'src' }],
            heap: [{ id: 'src', value: 'one file', label: 'free, 5,000,000 more like it' }],
          },
          {
            note: 'Apply two different random augmentations — crop it one way, crop and colour-shift it another. Two views of the same file. This is the only supervision you will get: they came from the same source.',
            stack: [
              { name: 'view A', value: 'crop', to: 'va' },
              { name: 'view B', value: 'crop + colour', to: 'vb' },
            ],
            heap: [
              { id: 'va', value: 'picture A', label: 'same source file' },
              { id: 'vb', value: 'picture B', label: 'same source file' },
            ],
          },
          {
            note: 'Push each view through the same model. Each comes out as a list of numbers — its representation. These are the four-slot lists from the code above.',
            stack: [
              { name: 'view A', value: 'crop', to: 'ra' },
              { name: 'view B', value: 'crop + colour', to: 'rb' },
            ],
            heap: [
              { id: 'ra', value: '[0.9, 0.1, 0.8, 0.2]', label: 'representation of A' },
              { id: 'rb', value: '[0.8, 0.2, 0.9, 0.1]', label: 'representation of B' },
            ],
          },
          {
            note: 'Bring in two other photos from the batch — the strangers. Score A against all three: cosine 0.9867 with its partner, 0.3333 and 0.3467 with the strangers.',
            stack: [
              { name: 'A vs B (positive)', value: 'want high', to: 'sp' },
              { name: 'A vs C (negative)', value: 'want low', to: 'sc' },
              { name: 'A vs D (negative)', value: 'want low', to: 'sd' },
            ],
            heap: [
              { id: 'sp', value: '0.9867', label: 'partner' },
              { id: 'sc', value: '0.3333', label: 'stranger' },
              { id: 'sd', value: '0.3467', label: 'stranger' },
            ],
          },
          {
            note: 'Sharpen by temperature, turn the three into shares of one, take minus the log of the partner share. Loss 0.0031: the partner is winning easily.',
            stack: [
              { name: 'partner share', value: 'after tau = 0.1', to: 'sh' },
              { name: 'loss', value: '-log(share)', to: 'ls' },
            ],
            heap: [
              { id: 'sh', value: '0.9969', label: 'almost all of the total' },
              { id: 'ls', value: '0.0031', label: 'small loss, little to fix' },
            ],
          },
          {
            note: 'Now the collapsed model, for contrast: one output for every input, so all three scores are 1.0, the partner share is exactly 1/3, and the loss is exactly ln(3) = 1.0986. Chance level. Collapse earns nothing.',
            stack: [
              { name: 'partner share', value: 'all scores equal', to: 'sh2' },
              { name: 'loss', value: '-log(1/3)', to: 'ls2', danger: true },
            ],
            heap: [
              { id: 'sh2', value: '0.3333', label: 'one third' },
              { id: 'ls2', value: '1.0986', label: 'exactly chance', danger: true },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Scaling laws: what happens when you make it bigger',
      md: `Pretraining has no label budget to run out of, so the only limits left are data, model size and compute. People measured what happens when you raise those, and the measurements are called **scaling laws**.

- **Data** — how many raw examples you pretrain on.
- **Parameters** — how many adjustable numbers the model has inside it.
- **Compute** — how much arithmetic you spend, roughly data multiplied by parameters.

What the measurements say, in plain words: raise all three together and the pretraining loss keeps falling, smoothly and predictably. Ten times the compute buys a specific improvement, and you can estimate that improvement *before* you spend the money. That predictability is why a company will commit to a training run that costs millions.

Two honest caveats, and they matter:

- This is an **observed trend, not a law of nature**. It is a curve fitted to experiments people ran. It holds well over the range measured and nobody can promise it holds outside that range.
- Raise only one of the three and it stalls. A giant model on a small dataset simply memorises the small dataset.

This is what makes today's pretrained models possible: one enormous self-supervised pretraining run, then many cheap fine-tunes on top of it. The GenAI subject picks the story up from exactly here.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: the same batch at a gentler temperature, by hand',
      md: `The code used tau = 0.1. Do the whole loss again at **tau = 0.5**, on paper, with the same three similarities: partner 0.9867, strangers 0.3333 and 0.3467.

1. Divide each by tau: 0.9867 / 0.5 = **1.9734**; 0.3333 / 0.5 = **0.6666**; 0.3467 / 0.5 = **0.6934**.
2. Raise e to each (e is about 2.7183): e to the 1.9734 = **7.1951**; e to the 0.6666 = **1.9476**; e to the 0.6934 = **2.0005**.
3. Add them: 7.1951 + 1.9476 + 2.0005 = **11.1432**.
4. Partner share: 7.1951 / 11.1432 = **0.6457**.
5. Loss: minus the natural log of 0.6457 = **0.4374**.

Compare with tau = 0.1, where the same three similarities gave a loss of 0.0031. Nothing about the model changed. Only the temperature did.

At tau = 0.5 the partner holds 65% of the total and the model is told it still has work to do. At tau = 0.1 the partner holds 99.7% and the model is told it is finished. Temperature is how harshly you grade the near-misses, and it is the reason a contrastive run can look converged or unconverged with identical representations.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake, walked into on purpose',
      md: `An engineer reads about contrastive learning and simplifies it. "The point is that two views of one image should agree. The strangers are just noise. I will train on the positive pairs only and my loss will be cleaner."

So the loss becomes: minus the cosine similarity between the two views, and nothing else. Minimising it means making that similarity as close to +1 as possible.

**What happens.** The loss drops to almost exactly -1.0 within a few hundred steps and stays there. It looks like the best training curve anyone has ever seen. Then the linear probe on top of the frozen model reaches 16.8% accuracy on a six-department task — and guessing the most common department scores about 16.7%. The model has learned nothing.

**The diagnosis.** The model found the shortcut: output one fixed list of numbers for every input. Then every pair of views agrees perfectly, the similarity is 1.0 for all of them, and the loss is exactly -1.0. That is representation collapse, and the objective was *asking* for it. A loss built only from "these two should agree" has a trivial best answer where everything agrees with everything.

**How you catch it in two minutes.** Take 100 different inputs, compute the representation of each, and measure the cosine similarity between every pair of *different* inputs. In a healthy model those numbers are spread out, mostly well below 1. In a collapsed model they are all about 1.0. That single histogram separates "my model is training badly" from "my model has collapsed", and they need completely different fixes.

**The fix.** Put the strangers back in the denominator, as in the snippet above. Then a collapsed model scores ln(3) with three items, or ln(2N-1) in a real batch of N images — exactly the chance-level loss — and there is nothing in it for the model any more.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work these on paper before reading the solutions in the next section.

1. You have 2,000,000 unlabelled product reviews and 400 labelled ones. Describe, in two sentences, the two stages you would run and how many human labels each stage uses.
2. Using the snippet's numbers, the anchor A scores 0.9867 with its partner and 0.3333 and 0.3467 with two strangers. What is the loss if you delete both strangers and keep only the partner in the denominator? What does that tell you about the objective?
3. A batch has 8 images, and each image is augmented into 2 views, giving 16 views. For one anchor view, how many positives and how many negatives are there?
4. A colleague reports "our contrastive loss reached 1.0986 and stopped moving; there are 3 items per comparison". What has almost certainly happened, and what is the one measurement you ask for?
5. Your team has 40 times the compute budget of last year. Someone proposes spending all of it on making the model 40 times bigger, keeping the same dataset. What is wrong with that plan?`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `1. **Pretrain**, using all 2,000,000 reviews with a pretext task such as masked word prediction — zero human labels used. Then **fine-tune** the pretrained model on the 400 labelled reviews with a small new output layer — 400 human labels used. The 400 are now enough because the model already understands product-review language.

2. With only the partner in the denominator, the partner's share is 7.1951 / 7.1951 = 1, so the loss is minus the log of 1, which is **exactly 0** — and it is 0 no matter what the similarity was, since the same number appears on top and bottom. An objective that is already at its minimum tells the model nothing, which is precisely why the negatives cannot be removed.

3. **One positive** (the other view of the same image) and **14 negatives** (the 16 views, minus the anchor itself, minus its partner). This is why batch size matters in contrastive learning: the batch is where the negatives come from.

4. Three items per comparison means chance level is ln(3) = 1.0986, and the loss is sitting exactly there — so the model is scoring every pair identically. That is **representation collapse**. Ask for the pairwise cosine similarity between representations of *different* inputs: if those are all near 1.0, it is confirmed.

5. Scaling laws only deliver when data, parameters and compute rise **together**. A 40x bigger model on last year's dataset will memorise that dataset — training loss falls, performance on new data does not follow. Split the budget across a bigger model and more pretraining data.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Four extras, once the main idea is solid.

- **The projection head.** In practice the model's representation h is not compared directly. A small extra network maps h to a shorter list z, and the loss is computed on z — but the thing kept for downstream use is **h**, and the extra network is thrown away. The reason: the loss demands that colour and orientation be ignored, and the extra network can absorb that demand, leaving h holding information the loss would otherwise have destroyed.
- **Methods with no negatives.** Keep two copies of the model. One learns normally; the other is a slow-moving average of the first and receives no learning signal at all. Train the fast copy to predict the slow copy's output. Because the slow copy never chases the fast one, they cannot both slide into a single constant answer, and collapse does not happen despite there being no negatives.
- **Masked image modelling.** The text trick works on pictures directly: black out 75% of an image in patches and train the model to redraw the missing patches. No augmentation design, no negatives, and it scales well.
- **The augmentation is the specification.** Whatever you randomise, you are telling the model to ignore. Randomise colour and the model stops caring about colour — which is a disaster if the downstream task is sorting ripe fruit from unripe. Choose augmentations against the task you actually want.`,
    },
  ],
  quiz: [
    {
      question: 'What exactly is "self-supervised" about self-supervised learning?',
      options: [
        {
          text: 'A human labels a small seed set and the model labels the rest',
          explanation: 'That is a different technique, and it still needs humans to start. Self-supervised learning uses zero human labels during pretraining.',
        },
        {
          text: 'It trains with no loss function at all',
          explanation: 'There is always a loss. What is missing is the human-written target, not the loss.',
        },
        {
          text: 'The target is built from the raw data itself — hide part of it, predict the hidden part',
          explanation: 'Correct. Delete a word and the word is the label; take two crops and "same source file" is the label. Nobody had to write anything down.',
        },
      ],
      correct: 2,
    },
    {
      question: 'In contrastive learning, what forms a positive pair?',
      options: [
        {
          text: 'Two different photos that happen to be of the same kind of object',
          explanation: 'That would need someone to know both are dogs — a human label, which is exactly what the method avoids needing.',
        },
        {
          text: 'Two independently augmented views of the SAME source file',
          explanation: 'Correct. Two random crops or colour shifts of one photo. Everything else in the batch is a negative.',
        },
        {
          text: 'The same photo at two different file sizes, specifically',
          explanation: 'Resizing is one possible augmentation, but the definition is any two random views. Crop plus colour shift is the usual pairing.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Your contrastive model plateaus and every representation is nearly identical. What has happened, and what fixes it?',
      options: [
        {
          text: 'Representation collapse — negatives in the denominator make it unprofitable, so check how many negatives each anchor actually gets',
          explanation: 'Correct. Collapse trivially satisfies "the two views must agree". With negatives present, a collapsed model scores exactly the chance-level loss, so the model has no reason to go there.',
        },
        {
          text: 'The learning rate is too low and the model has not started learning',
          explanation: 'A low learning rate gives a slow model, not an identical-output model. Identical representations is a specific structural failure.',
        },
        {
          text: 'The augmentations are too strong; weaken them',
          explanation: 'Over-strong augmentation destroys signal, but strong augmentation is the core of the method. Collapse is cured by negatives, not by weaker augmentation.',
        },
      ],
      correct: 0,
    },
    {
      question: 'Anchor A scores 0.9867 with its partner and 0.3333 and 0.3467 with two strangers. Raising the temperature tau from 0.1 to 0.5 does what to the loss?',
      options: [
        {
          text: 'It rises, from 0.0031 to 0.4374, with no change to the model',
          explanation: 'Correct. A larger tau shrinks the gaps before the exponential, so the partner keeps 65% of the total instead of 99.7%. The representations are identical; only the grading changed.',
        },
        {
          text: 'It falls, because a larger temperature always means a softer, lower loss',
          explanation: 'Backwards. A larger temperature flattens the sharpened scores, which lowers the partner\'s share and therefore raises the loss.',
        },
        {
          text: 'Nothing, because temperature only affects the gradient and not the loss value',
          explanation: 'Temperature divides the similarities before the exponential, so it changes the loss value directly. 0.0031 versus 0.4374 on identical numbers.',
        },
      ],
      correct: 0,
    },
    {
      question: 'What is a linear probe used for?',
      options: [
        {
          text: 'Freezing the pretrained model and training only a single layer on top, to measure how good the representation already is',
          explanation: 'Correct. Because the frozen part cannot adapt, whatever accuracy the probe reaches is attributable to the representation, not to further learning.',
        },
        {
          text: 'Testing whether the training data contains a straight-line relationship',
          explanation: 'That is unrelated. A linear probe measures a representation, not a property of the raw data.',
        },
        {
          text: 'A faster version of pretraining that uses one linear layer instead of a deep model',
          explanation: 'A probe happens after pretraining and is a measurement, not a way to pretrain.',
        },
      ],
      correct: 0,
    },
    {
      question: 'Which statement about scaling laws is honest?',
      options: [
        {
          text: 'They guarantee that any model improves without limit as compute rises',
          explanation: 'Nothing guarantees that. They are fitted to a measured range and say nothing certain beyond it.',
        },
        {
          text: 'They are an observed trend: raising data, parameters and compute together gives smooth, predictable improvement over the measured range',
          explanation: 'Correct. The predictability is what makes an expensive run fundable. The honest part is that it is a fitted curve, not a law of nature, and all three inputs have to rise together.',
        },
        {
          text: 'They show that model size alone determines quality',
          explanation: 'A large model on a small dataset memorises the dataset. Data and compute have to rise with it.',
        },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain self-supervised learning to a non-technical product manager.',
      answer:
        'Labelling data is our slowest and most expensive step: someone has to read each example and write down the right answer. Self-supervised learning avoids that entirely. We take data we already have, hide part of it, and train the model to fill the hidden part back in — delete a word from a sentence, and the deleted word is the answer key we never had to pay for. The model has to understand the material in order to fill in the gaps, and that understanding is what we keep. Afterwards we attach the small amount of properly labelled data we do have and fine-tune. In practice this means our 5,000,000 unlabelled tickets become useful instead of dead weight, and the 800 labelled ones go much further. We spend GPU time instead of annotator time, and GPU time is the one we can simply buy.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through a contrastive learning step end to end, and say which parts are load-bearing.',
      answer:
        'One image, two independent random augmentations giving two views, both through the same model to get two representations. Score the anchor against its partner and against every other view in the batch with cosine similarity. Divide the scores by a temperature, exponentiate, turn them into shares of the total, and take minus the log of the partner\'s share. Load-bearing parts: the augmentations, because whatever you randomise is what you are telling the model to ignore, and weak augmentation makes the task solvable by colour statistics alone; the negatives, because without them the objective has a trivial degenerate answer; the batch size, because the batch is where the negatives come from; and the temperature, which sets how harshly near-misses are graded. Not load-bearing: the specific model architecture underneath.',
      isCaseBased: false,
    },
    {
      question: 'What is representation collapse, why does the contrastive loss prevent it, and how do negative-free methods manage without it?',
      answer:
        'Collapse is when the model outputs the same representation for every input. It perfectly satisfies "two views of one image must agree", so any objective built only on agreement has a trivial best answer that carries no information. The contrastive loss prevents it by putting the negatives in the denominator: a collapsed model scores 1.0 with its partner and 1.0 with every stranger too, so its partner share is exactly 1/(number of items) and its loss is exactly the chance-level value — with three items, ln(3) = 1.0986. It gains nothing, so the model does not go there. Negative-free methods use asymmetry instead: two copies of the model, one learning normally and one a slow-moving average that receives no learning signal, with the fast copy trained to predict the slow one. Because the slow copy never chases the fast copy, the two cannot both slide into one constant answer. Worth saying plainly that exactly why that works was genuinely argued over for a while.',
      isCaseBased: false,
    },
    {
      question: 'Case: your contrastive pretraining runs to completion with a beautifully falling loss, but the linear probe on the downstream task sits at chance. Debug it.',
      answer:
        'A falling loss with useless features means the model found a shortcut, so I look for the shortcut rather than the bug. In order: (1) Check for collapse first, because it is the cheapest test — take 100 different inputs, compute all pairwise cosine similarities between representations of different inputs, and look at the spread. All near 1.0 means collapse, and then I check that the negatives are actually reaching the loss and that the batch is not tiny. (2) Look for an augmentation leak: if both views share a per-image artefact — the same crop seed, an identical watermark, per-image normalisation statistics — then matching the views is trivial and no semantics are needed. I verify by looking at real augmented pairs, not the config. (3) Check that the augmentation is strong enough; with no colour shift, colour histograms alone can solve the task. (4) Check I am probing the right layer — the representation, not the short projection output that gets thrown away; this alone explains large gaps. (5) Check the probe itself: is the base actually frozen, is the optimiser stepping, are the labels aligned. The cheap checks are 1, 4 and 5, so those come first; only after those do I spend money on a bigger batch.',
      isCaseBased: true,
    },
    {
      question: 'Case: you have 5,000,000 unlabelled support tickets and 800 labelled ones, and a six-department classifier to build. What do you do, and how do you know it worked?',
      answer:
        'Plan: pretrain on all 5,000,000 with a masked-word pretext task — hide a fraction of the words, predict them — using zero human labels. Then attach a fresh six-slot output layer and fine-tune on the 800. Before committing, I would set the baseline honestly: train the 800-label model from scratch and record its accuracy, because that is the number pretraining has to beat, and if it does not, pretraining was not the bottleneck. To know the representation itself is good, I use a linear probe: freeze the pretrained model, train only one layer on the 800, and compare against the from-scratch baseline. A probe that already beats a fully-trained-from-scratch model tells me the pretraining did the work. Practical cautions: hold out a test set of labelled tickets before any of this and never touch it; check that the unlabelled corpus actually resembles the tickets I will see in production, because pretraining on eight-year-old tickets for a product that changed last year buys less than it looks like; and with only 800 labels, fine-tune gently — a large learning rate over a tiny dataset can overwrite the pretrained representation and land you back at the baseline.',
      isCaseBased: true,
    },
    {
      question: 'What makes a pretext task good or bad? Give an example of each.',
      answer:
        'A pretext task is good when there is no shortcut — no cheap surface feature that solves it without understanding the content. Predicting a deleted word is good: you cannot fake it, and the data is unlimited, since every sentence ever written is a training example. Predicting which rotation was applied to a photo is weak, because a model can often answer from "the sky is at the top and it is blue" and learn nothing about objects. The other property that matters is that the task must force the model to use the information you want downstream. This is the same point as augmentation choice: whatever the task lets the model ignore, the model will ignore. If the pretext task is solvable from colour alone, you get a colour detector.',
      isCaseBased: false,
    },
    {
      question: 'Why is batch size unusually important in contrastive learning, compared with ordinary supervised training?',
      answer:
        'Because the batch is where the negatives come from. In a batch of N images with two views each, one anchor has exactly one positive and 2N-2 negatives, so batch 256 gives 510 negatives per anchor and batch 4096 gives 8190. More negatives means a harder and more informative comparison, and the loss is defined relative to them, so changing the batch size changes the objective rather than just the gradient noise. That also means gradient accumulation does not rescue you here the way it does in supervised training: accumulating small batches gives you the same number of steps but not the negatives, because the comparison happens within a batch. Methods that keep a queue of representations from previous batches exist precisely to decouple the negative count from the batch size.',
      isCaseBased: false,
    },
    {
      question: 'What do scaling laws actually claim, and where would you push back if someone quoted one at you?',
      answer:
        'The claim is that pretraining loss falls smoothly and predictably as you raise data, parameters and compute together, so you can estimate the improvement from a given budget before spending it. That predictability is the real value: it makes an expensive run fundable. Where I push back: first, it is a curve fitted to experiments over a measured range, not a law of nature, so an extrapolation far outside that range is a guess wearing a graph. Second, the three inputs have to rise together — a much bigger model on the same dataset memorises the dataset. Third, and most practically, the quantity being predicted is the pretraining loss, not the thing the business cares about; a better pretraining loss usually helps downstream accuracy but the relationship is not one-to-one, and I would want the downstream number measured, not assumed.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Self-supervised learning, in one line', back: 'Build the training target out of the raw data itself: hide part of the input and predict it. Unlabelled data becomes trainable, with zero annotators.' },
    { front: 'Pretext task', back: 'A fake job invented so the model is forced to learn something real while doing it. Examples: predict a deleted word, match two crops of one photo, predict a rotation. The task is thrown away; the representation is kept.' },
    { front: 'Pretraining vs fine-tuning vs linear probe', back: 'Pretrain: long run on all the unlabelled data, zero labels. Fine-tune: attach a small output layer, train on the few real labels. Linear probe: freeze everything and train one layer on top, purely to measure how good the representation already is.' },
    { front: 'Positive pair and negative pair', back: 'Positive: two augmented views of the SAME source file — should be close. Negative: a view of this file against a view of any other file — should be far. Closeness is cosine similarity.' },
    { front: 'The contrastive loss, in three steps', back: 'Divide every similarity by the temperature and exponentiate; divide each by the total so they add to 1; take minus the log of the partner\'s share. It scores the partner relative to the strangers, not on its own.' },
    { front: 'Representation collapse', back: 'The model outputs one identical representation for every input, which trivially satisfies "the two views must agree". Cured by negatives in the denominator: a collapsed model then scores exactly the chance-level loss, ln(3) with three items, and gains nothing.' },
    { front: 'How to detect collapse in two minutes', back: 'Take 100 different inputs and compute pairwise cosine similarity between their representations. Healthy: spread out, mostly well below 1. Collapsed: all about 1.0. Distinguishes "training badly" from "collapsed", which need different fixes.' },
    { front: 'Scaling laws, stated honestly', back: 'Raise data, parameters and compute together and pretraining loss falls smoothly and predictably. It is a trend fitted to measured experiments, not a law of nature, and raising only one of the three stalls: a giant model on a small dataset memorises it.' },
  ],
  mindmapMarkdown: `- Self-Supervised Learning
  - The problem
    - 5,000,000 unlabelled tickets, 800 labelled
    - labels are slow and expensive
    - supervised learning can only use the 800
  - The core trick
    - hide part of the data, predict it
    - the label was inside the data already
    - mask a word
    - two crops of one photo
    - predict a rotation
  - The words
    - representation: the model's list of numbers for an input
    - pretraining: long run, zero labels
    - fine-tuning: small output layer, few labels
    - downstream task: the job you actually wanted
    - linear probe: freeze, train one layer, measure
  - Contrastive learning
    - augmentation: random change that does not change what it is
    - positive pair: two views of one file
    - negative pair: views of different files
    - cosine similarity scores closeness
    - temperature sharpens the comparison
  - The loss
    - sharpen, share, minus log of partner share
    - partner judged against the strangers
    - tau 0.1 gives 0.0031, tau 0.5 gives 0.4374
  - Collapse
    - one output for every input
    - satisfies agreement, carries no information
    - negatives make it score exactly ln(3)
    - detect with pairwise similarity of different inputs
    - negative-free methods use a slow-moving second copy
  - Scaling laws
    - data, parameters, compute rise together
    - smooth predictable improvement
    - observed trend, not a law of nature
    - one input alone stalls
  - Where it leads
    - one expensive pretrain, many cheap fine-tunes
    - GenAI subject continues from here`,
}

export default m
