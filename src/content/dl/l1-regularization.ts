import type { Module } from '../types'

const m: Module = {
  id: 'dl-l1-regularization',
  subjectId: 'dl',
  level: 1,
  title: 'Regularization: Dropout, Early Stopping, Weight Decay & Augmentation',
  whyItMatters:
    'A deep net can memorize a dataset with the labels randomly shuffled — so "can it fit?" is never the question, only "will it generalize?". Every technique here buys test accuracy by making memorization expensive. And the single most-asked debugging question in DL interviews — "training loss falls but validation loss rises" — is answered entirely from this module.',
  estMinutes: 50,
  sections: [
    {
      type: 'intuition',
      title: 'Capacity was never the question',
      md: `Someone ran the experiment that ended the argument. Take a big image network. Replace every label with a random one — cats labelled "truck", trucks labelled "dog", pure nonsense. Train it anyway.

- It reaches **zero training error**. The net memorized noise, example by example.
- So "can this model fit the data?" is not a real question. It can. Always.
- The only question left: does what it learned **transfer to data it has never seen**?
- **Regularization** = anything you do that costs training accuracy to buy test accuracy.
- Every technique in this module is one bribe: make memorizing harder than generalizing.`,
    },
    { type: 'visual', component: 'BiasVarianceDial', props: {} },
    {
      type: 'note',
      md: 'That dial is the same story one level down: turn capacity up, training error falls forever, test error traces a **U**. Deep learning inherits the shape exactly — dropout, weight decay and augmentation are all ways of sliding left along the dial without literally deleting parameters. One honest twist the classic picture misses: push a model far *past* the point where it can fit the training set perfectly and test error often falls a second time (**double descent**). It is real, it is why enormous models work at all, and it is not a licence to skip regularization on the models you will actually ship.',
    },
    {
      type: 'intuition',
      title: 'Dropout: nobody gets a permanent partner',
      md: `Imagine a team where a random half of the staff calls in sick every single day. Nobody can build a workflow that depends on one specific colleague. Everyone is forced to become individually useful.

- Each training step, zero every activation in a layer independently with probability **p**.
- A fresh random mask each step — a neuron never knows who will be present next time.
- **Intuition 1, no co-adaptation:** a unit cannot learn "I only mean something when unit 7 also fires". Fragile detector chains break; robust standalone features survive.
- **Intuition 2, free ensemble:** each mask defines a different *thinned* sub-network. With n units there are 2ⁿ of them, all sharing one set of weights. Training touches that whole family; inference averages it.
- Dropout is a **training-time-only** operation. That asymmetry is the interview question.`,
    },
    {
      type: 'intuition',
      title: 'The train/test asymmetry — and the arithmetic that fixes it',
      md: `- Training: mask ON. Inference: mask OFF — you want one deterministic answer, not a coin flip per request.
- The problem that creates: with p = 0.5, a downstream unit sees roughly **half** the input sum during training and the **full** sum at test. Same weights, different scale, drifting predictions.
- The fix everyone ships is **inverted dropout**: during training, divide the surviving activations by (1 − p).
- Now the *expected* activation is unchanged, so inference needs no correction at all — just skip the mask.
- The old "vanilla" alternative did it the other way: nothing at train, multiply by (1 − p) at test. Identical arithmetic, worse ergonomics — inference should be the cheap, plain path.`,
    },
    {
      type: 'math',
      intro: 'One unit, one step. r is the keep-mask, p the drop probability, h the raw activation.',
      latex: [
        'r_j \\sim \\text{Bernoulli}(1-p), \\qquad \\tilde{h}_j = \\frac{r_j \\, h_j}{1 - p}',
        '\\mathbb{E}[\\tilde{h}_j] = \\frac{(1-p) \\cdot h_j \\;+\\; p \\cdot 0}{1-p} = h_j',
        '\\text{Expectation unchanged} \\Rightarrow \\text{inference uses } h_j \\text{ raw. Drop the } \\tfrac{1}{1-p} \\text{ and every activation arrives } (1-p)\\times \\text{ too small.}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Inverted dropout in NumPy — prove the expectation matches',
      code: `import numpy as np

rng = np.random.default_rng(0)
p = 0.5                                   # fraction of units zeroed
h = np.array([[1.0, 2.0, 3.0, 4.0]])      # one layer's activations

def train_forward(h, p, rng):
    mask = rng.random(h.shape) > p        # True = keep, prob (1-p)
    return h * mask / (1.0 - p)           # inverted dropout: rescale survivors

def eval_forward(h):
    return h                              # inference: no drop, no rescale

print('one training sample :', train_forward(h, p, rng))
print('another one         :', train_forward(h, p, rng))

runs = np.stack([train_forward(h, p, rng) for _ in range(200000)])
print('train mean (200k)   :', runs.mean(axis=0).round(3))
print('eval  (no dropout)  :', eval_forward(h))
print('if we forgot /(1-p) :', (runs * (1 - p)).mean(axis=0).round(3))

# one training sample : [[2. 0. 0. 0.]]
# another one         : [[2. 4. 6. 8.]]
# train mean (200k)   : [[1.001 2.    2.994 4.   ]]
# eval  (no dropout)  : [[1. 2. 3. 4.]]
# if we forgot /(1-p) : [[0.501 1.    1.497 2.   ]]`,
      annotations: {
        8: 'A fresh Bernoulli mask per call — this is the "different thinned network every step" idea, in one line.',
        9: 'The whole trick. Survivors are doubled at p=0.5, so the ones that made it carry the weight of the ones that did not.',
        12: 'Inference is deliberately boring: no randomness, no scaling, nothing to get wrong.',
        15: 'Two consecutive training passes on the SAME input give wildly different vectors. That is why you never serve predictions in training mode.',
        24: 'Averaged over 200k masks, training output matches the eval output to ~0.1%. The remaining wobble is Monte-Carlo noise, not bias.',
        26: 'The naive version — same masks, no rescale — lands at exactly half. That factor is the entire reason (1-p) division exists.',
      },
    },
    {
      type: 'note',
      md: 'The real-world version of that last line is forgetting **model.eval()** before serving. With inverted dropout the long-run *average* stays correct, but each individual prediction is computed with a random half of the network switched off — noisy, and reliably worse. Nothing crashes, nothing warns you; the model is just quietly dumber. **model.eval()** is the switch (and **model.train()** to go back), and it also flips BatchNorm from batch statistics to running statistics. One forgotten line, two silent failures.',
    },
    {
      type: 'intuition',
      title: 'How much dropout, and where',
      md: `- **0.5** on wide fully-connected layers — the classic AlexNet/VGG setting, applied exactly where most parameters live.
- **0.1–0.3** on conv layers, embeddings and transformer sublayers. Conv layers share weights across positions, so they overfit less and tolerate less noise.
- **0** on the output layer. Never drop the thing you are reading the answer from.
- Honest note: modern architectures often use **little or none**. ResNets ship with zero dropout — BatchNorm, residual connections and heavy augmentation already do the job, and dropout interacts badly with BatchNorm (the variance it injects at train time does not match the running statistics used at test).
- Treat p as a hyperparameter you tune *after* confirming you overfit, not a default you sprinkle on every layer.`,
    },
    {
      type: 'intuition',
      title: 'Early stopping: the cheapest regularizer there is',
      md: `Revising for an exam: there is a point where re-reading the same notes stops helping and starts drilling in your own typos. Stop there.

- Evaluate validation loss every epoch. Keep a copy of the **best** checkpoint seen so far.
- Stop when it has not improved for **patience** epochs (5–10 is typical), then restore the best checkpoint — not the last one.
- Cost: no extra parameters, no extra compute, usually one callback.
- Why it regularizes: fewer effective steps means weights stay closer to their small random initialization, so less of the available capacity is ever used. It behaves like an implicit L2.
- It is the backstop that limits the damage from every other thing you got wrong.`,
    },
    {
      type: 'note',
      md: 'The subtlety interviewers push on: the moment you choose *when to stop* by watching validation loss, the validation set has become part of model selection. Its loss is now an optimistic estimate — you picked the epoch that happened to look best on it, noise included. Your honest number needs a **third split: a test set you touch exactly once, at the end**. The same argument covers every hyperparameter you tuned on validation (p, λ, learning rate, architecture). Tune on val, report on test.',
    },
    {
      type: 'intuition',
      title: 'Weight decay (L2): tax the big weights',
      md: `A budget. Weights are allowed to grow, but every unit of magnitude costs something — so a weight only gets big if the loss genuinely pays for it.

- Add **λ/2 · Σw²** to the loss. Gradient descent then shrinks every weight a little each step, on top of the normal update.
- Why big weights are the enemy: they make the learned function **sharp**, swinging wildly between training points. Small weights make it smooth, so it interpolates mildly between them.
- This is **exactly Ridge** from the ML subject's Regression II module — same penalty, same shrink-everything-drop-nothing behaviour. Only the model it wraps changed.
- Typical λ (called weight_decay in frameworks): 1e-5 to 1e-2, tuned on a **log scale**.
- Do **not** decay biases or normalization scale/shift parameters. They set offsets and scales, not function complexity; shrinking them just breaks the layer.`,
    },
    {
      type: 'math',
      intro: 'The penalty, its gradient, and the "decay" hiding inside the update rule.',
      latex: [
        'J_{\\text{reg}}(w) = J(w) + \\frac{\\lambda}{2} \\lVert w \\rVert_2^2',
        '\\frac{\\partial J_{\\text{reg}}}{\\partial w} = \\frac{\\partial J}{\\partial w} + \\lambda w',
        'w := w - \\alpha\\!\\left( \\frac{\\partial J}{\\partial w} + \\lambda w \\right) = \\underbrace{(1 - \\alpha\\lambda)}_{\\text{shrink first}} w \\;-\\; \\alpha \\frac{\\partial J}{\\partial w}',
      ],
    },
    {
      type: 'note',
      md: 'With plain SGD, "add λ/2·Σw² to the loss" and "multiply weights by (1 − αλ) each step" are the same operation — that equality is the whole derivation above. **With Adam they are not.** Adam divides every gradient by its own running magnitude, so the λw term gets divided too: parameters with large gradients receive *less* decay than parameters with small ones. Nobody intended that regularizer. **AdamW** fixes it by decoupling — compute the adaptive step from the loss gradient only, then subtract αλw from the weight directly. Cross-ref the optimizers module; this is why every modern transformer recipe says AdamW, never plain Adam.',
    },
    {
      type: 'intuition',
      title: 'Data augmentation: the highest-leverage regularizer, when it applies',
      md: `The real fix for a student who memorized the answer key is more questions. Augmentation manufactures more questions out of the ones you already have.

- **Images:** horizontal flip, random crop and resize, small rotations, colour jitter, random erasing/cutout.
- **Text:** synonym swap, random deletion, and **back-translation** — run EN → DE → EN and you get a genuinely reworded sentence with the same meaning.
- **Audio:** time shift, added noise, and **SpecAugment** — mask random frequency bands and time windows directly on the spectrogram.
- Why it beats dropout and weight decay when it is available: those two just blur the model. Augmentation injects **real information** about which changes should not change the answer.
- It is free supervision — you already know the label of a flipped cat.`,
    },
    {
      type: 'note',
      md: 'The one rule: **an augmentation must preserve the label.** A horizontally flipped cat is still a cat, so flipping is free accuracy on ImageNet. A flipped **6** is not a 6 — and rotate it 180° and it is a **9**. On digits, flips and big rotations are label-destroying: you are training the model on wrong answers and then wondering why validation accuracy stalls. Same trap elsewhere: synonym swaps on negation-sensitive text, aggressive colour jitter when colour *is* the label (ripe vs unripe fruit), horizontal flips on medical scans where left and right organs differ. Ask of every augmentation you add: would a human still give this the same label?',
    },
    {
      type: 'note',
      md: '**mixup / cutmix** bend that rule honestly: they blend two images (a weighted average, or a pasted patch) and blend the two labels in the exact same proportion, so the target stays truthful — cheap, strong, and standard in modern image recipes. **Label smoothing** is the same idea applied to the target alone: train against 0.9 instead of 1.0 so the network stops shoving logits toward infinity for confidence it has not earned (the Metrics subject covers what that buys you in calibration).',
    },
    {
      type: 'intuition',
      title: 'Train loss falls, val loss rises — step 1: is it even overfitting?',
      md: `The flagship interview question. Before reaching for any regularizer, confirm the diagnosis — and read the *shape* of the curves, not one epoch.

- **Classic overfitting:** both losses fall together for a while, then validation flattens and turns up while training keeps falling. The **gap widens over time**. This is the real thing.
- **Val loss rising from step 1**, or sitting far above train from the very first epoch — that is not overfitting, that is a bug. No model overfits before it has learned anything.
- Bug suspects, in order: **data leakage** (a feature or duplicate rows shared between train and val), **label mismatch** (val labels shuffled, different class ordering, wrong file-to-label pairing), **wrong eval preprocessing** (different normalization constants, augmentation left ON at eval, model left in training mode).
- Then check the split itself: time-ordered or grouped data split randomly gives you a validation set from a different distribution than you think.
- A regularizer applied to a bug just makes a broken model train more slowly.`,
    },
    {
      type: 'intuition',
      title: 'Step 2: the ordered response',
      md: `Gap confirmed widening, no bugs found. Now apply these in order — most effective and cheapest first, one change at a time.

1. **More data.** Nothing else comes close. Look for another source, unlabelled data plus self-training, or relabelling effort *before* touching the architecture.
2. **Augmentation.** The closest substitute for more data, and usually free.
3. **Stronger regularization.** Raise weight decay; add or raise dropout. One knob per run, or you will not know what worked.
4. **Smaller model.** Fewer layers or units. Honest, effective, and the step people skip because it feels like defeat.
5. **Early stopping.** On by default anyway — it caps the damage from whatever you did not manage to fix.`,
    },
    {
      type: 'note',
      md: 'The line to say out loud in the interview: *"first confirm it is overfitting and not leakage — a widening gap, not a val curve that was bad from epoch one. Then: more data, augmentation, stronger regularization, smaller model, with early stopping as the backstop."* Ordering it that way is what gets the tick; naming dropout immediately is what loses it.',
    },
    {
      type: 'intuition',
      title: 'The opposite case: both losses high',
      md: `- Symptom: training and validation loss both plateau at a bad value, sitting close together. Little or no gap.
- That is **underfitting**, and regularization is exactly the wrong medicine — you would be tightening a model that is already too tight.
- Fixes in order: train longer; fix the learning rate or schedule; **bigger model**; better features; and **turn regularization down** (less dropout, less weight decay, milder augmentation).
- Sanity check before any of that: can your model **overfit a single batch** to near-zero loss? If it cannot, you have a bug — broken labels, wrong loss, frozen parameters, a learning rate of zero — not a capacity problem.
- That "overfit one batch" test is the fastest debugging move in deep learning. Run it before every long training job.`,
    },
    {
      type: 'note',
      md: 'Last honesty note: the validation curve is **noisy**. One epoch where val loss ticks up means nothing — shuffling order, dropout masks and a small validation set all wobble the number by themselves. Judge the **trend over 5–10 epochs**, which is precisely why early stopping uses a patience window instead of a hair trigger. And if your validation set is a few hundred examples, accept that its loss carries a real error bar. Plenty of good runs get killed on one bad epoch.',
    },
  ],
  quiz: [
    {
      question: 'A large network trained on data with completely randomized labels reaches zero training error. What does that tell us?',
      options: [
        {
          text: 'The training procedure is buggy — that should be impossible',
          explanation: 'It is entirely reproducible and expected. Big nets have enough capacity to memorize arbitrary label assignments.',
        },
        {
          text: 'The model has learned a useful pattern in the noise',
          explanation: 'There is no pattern to learn — the labels are random. It memorized, which is the opposite of learning a pattern.',
        },
        {
          text: 'Capacity is not the constraint; generalization is the only real question',
          explanation: 'Correct. Fitting is guaranteed. Everything in this module exists to make the fitted function transfer to unseen data.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Inverted dropout with p = 0.5. A surviving activation of value 3.0 is passed downstream as…',
      options: [
        {
          text: '6.0 — survivors are divided by (1 − p)',
          explanation: 'Correct. 3.0 / 0.5 = 6.0. Survivors carry the expected contribution of the units that were dropped, so the mean matches inference.',
        },
        { text: '1.5 — survivors are multiplied by (1 − p)', explanation: 'That is the old vanilla-dropout scaling, and it belongs at TEST time, not train time.' },
        { text: '3.0 — dropout only zeroes, it never rescales', explanation: 'That is dropout without the correction; expected activation would then be half its inference value.' },
      ],
      correct: 0,
    },
    {
      question: 'You deploy a PyTorch model but forget model.eval(). With inverted dropout, what actually goes wrong?',
      options: [
        { text: 'Nothing — inverted dropout makes train and test identical', explanation: 'It equalizes the EXPECTATION, not any single forward pass. Individual predictions still use a random mask.' },
        {
          text: 'Each prediction is made with a random subset of units switched off — noisy and reliably worse, with no error raised',
          explanation: 'Correct. The average over many passes is right, but you serve one pass. It also leaves BatchNorm on batch statistics — the same one-line bug, two victims.',
        },
        { text: 'Predictions come out scaled by (1 − p)', explanation: 'That would be the failure mode of vanilla dropout without test-time scaling. Inverted dropout keeps the scale right on average.' },
      ],
      correct: 1,
    },
    {
      question: 'You used early stopping on validation loss and tuned dropout and weight decay on the same validation set. What is your honest generalization estimate?',
      options: [
        { text: 'The best validation loss you saw', explanation: 'That is the most optimistic number available — you selected the epoch and the hyperparameters that made it small.' },
        { text: 'The final training loss', explanation: 'Training loss says nothing about generalization; it is the number regularization deliberately sacrifices.' },
        {
          text: 'The loss on a separate test set evaluated once at the end',
          explanation: 'Correct. Validation became part of model selection, so it is contaminated. Tune on val, report on test, touch test once.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Why does the field prefer AdamW over adding an L2 term to the loss when using Adam?',
      options: [
        { text: 'AdamW is faster per step', explanation: 'The cost is identical — one extra multiply-subtract per parameter either way.' },
        {
          text: 'Adam divides gradients by their running magnitude, so an in-loss λw term gets scaled unevenly across parameters; AdamW subtracts αλw directly',
          explanation: 'Correct. Coupled L2 means large-gradient parameters get decayed less — not the regularizer anyone designed. Decoupling restores uniform decay.',
        },
        { text: 'AdamW applies L1 instead of L2', explanation: 'AdamW is still L2-style decay. What changed is where it is applied, not the penalty shape.' },
      ],
      correct: 1,
    },
    {
      question: 'Which augmentation is unsafe on a handwritten-digit classifier?',
      options: [
        {
          text: 'Horizontal flip',
          explanation: 'Correct. A flipped 6 is not a 6, a flipped 2 is not a 2 — the label is destroyed, so you train on wrong answers. Small rotations and shifts are fine.',
        },
        { text: 'Small random shifts of a couple of pixels', explanation: 'Position does not carry the label for digits — this is a standard, safe MNIST augmentation.' },
        { text: 'Slight elastic distortion of stroke shape', explanation: 'Handwriting varies exactly this way; distortion preserves the label and is a classic digit augmentation.' },
      ],
      correct: 0,
    },
    {
      question: 'Validation loss is above training loss from the very first epoch and rises steadily from there. Best first move?',
      options: [
        { text: 'Add dropout of 0.5 to every layer', explanation: 'Premature. Applying a regularizer to a broken pipeline just makes a broken model train slower.' },
        { text: 'Train longer — the gap will close', explanation: 'A gap that exists before the model has learned anything does not close with more of the same.' },
        {
          text: 'Suspect a bug — leakage, mismatched val labels, or eval-time preprocessing that differs from training',
          explanation: 'Correct. Genuine overfitting shows both curves falling first and the gap widening later. Rising from step 1 is a pipeline problem.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Training loss and validation loss both plateau high, with almost no gap between them. What do you do?',
      options: [
        { text: 'Increase weight decay and dropout', explanation: 'Backwards. No gap means no overfitting; more regularization tightens a model that is already too constrained.' },
        {
          text: 'Treat it as underfitting — first check the model can overfit a single batch, then train longer, fix the learning rate, or go bigger',
          explanation: 'Correct. And the single-batch test comes first: failure there means a bug (bad labels, wrong loss, frozen weights), not a capacity shortage.',
        },
        { text: 'Collect more data', explanation: 'More data helps the overfitting case. An underfitting model is not yet using the data it already has.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain dropout at inference time. What exactly happens, and why?',
      answer:
        'At inference dropout is OFF — no mask, no randomness, one deterministic answer per input. The scaling correction happens at training time instead: inverted dropout divides surviving activations by (1 − p), so E[activation during training] equals the raw activation, and test time needs no adjustment at all. Conceptually it is an ensemble average: training visited exponentially many thinned sub-networks, and the un-masked full network with rescaled expectations approximates averaging their predictions. Mention the historical alternative (vanilla dropout: no train-time scaling, multiply by (1 − p) at test) and why inverted won — you want the serving path to be the cheap, plain one. Close with the practical failure: forgetting model.eval() leaves dropout firing at serve time, so each prediction uses a random half-network — noisy, worse, and completely silent.',
      isCaseBased: false,
    },
    {
      question: 'Case: training loss falls steadily, validation loss rises. Walk me through your full debugging tree.',
      answer:
        'Step 1, confirm the diagnosis rather than assuming it. Genuine overfitting looks like both curves falling together, then val flattening and turning up while train keeps dropping — a gap that WIDENS over time. If val is bad from epoch one, or rising from step one, that is a bug, not overfitting: check data leakage (duplicate rows or a target-derived feature spanning both splits), label mismatch (shuffled val labels, different class index ordering, wrong file pairing), eval-time preprocessing drift (different normalization constants, augmentation still on, model left in train mode), and a split that ignores time or group structure. Step 2, once a widening gap is confirmed, respond in order: more data, then augmentation, then stronger regularization (weight decay and dropout, one knob per run), then a smaller model, with early stopping running throughout as the backstop. Step 3, judge trends over 5–10 epochs, not single epochs — the val curve is noisy. The ordering is what is actually being scored; anyone can say "add dropout".',
      isCaseBased: true,
    },
    {
      question: 'Why does dropout regularize? Give both standard explanations and say which you find more convincing.',
      answer:
        'Explanation one, preventing co-adaptation: if a unit can rely on a specific partner firing, the pair learns a fragile joint feature. Randomly removing partners forces each unit to be independently informative, so features become redundant and robust. Explanation two, implicit ensembling: each mask defines a thinned sub-network, there are 2ⁿ of them sharing one weight set, and inference with the full rescaled network approximates averaging that ensemble — and ensembling reliably reduces variance. The ensemble view is the cleaner mathematical story (exact for a single linear layer with a softmax, approximate for deep nets); the co-adaptation view is the better engineering intuition and explains why dropout hurts when a layer genuinely needs precise coordinated features. A good answer also notes a third framing: dropout is multiplicative noise injection, and noise on activations acts like a data-dependent penalty on weight magnitude.',
      isCaseBased: false,
    },
    {
      question: 'Derive the (1 − p) factor in inverted dropout from scratch.',
      answer:
        'Let r ~ Bernoulli(1 − p) be the keep indicator for one unit with activation h. Plain dropout outputs r·h, so E[r·h] = (1 − p)·h + p·0 = (1 − p)·h — a factor (1 − p) smaller than the inference-time value h. To make training and inference agree in expectation, divide by (1 − p) at train: E[r·h/(1 − p)] = h exactly. That is inverted dropout. Two consequences worth stating: at p = 0.5 survivors are literally doubled, and the correction fixes the mean but not the variance, which is why a single training-mode forward pass is still noisy and why BatchNorm — which consumes activation statistics — interacts badly with dropout placed before it.',
      isCaseBased: false,
    },
    {
      question: 'Weight decay and L2 regularization — are they the same thing?',
      answer:
        'For plain SGD, yes and it is a two-line proof: adding (λ/2)‖w‖² to the loss contributes λw to the gradient, so w := w − α(∂J/∂w + λw) = (1 − αλ)w − α ∂J/∂w. The weight is literally multiplied down each step before the gradient lands — decay. For adaptive optimizers they diverge. Adam scales each parameter\'s update by its running gradient magnitude, so a λw term folded into the loss gets divided by that scale: parameters with big gradients are decayed less, parameters with small gradients decayed more, which is nobody\'s intended regularizer. AdamW decouples — the adaptive step uses only the loss gradient, then αλw is subtracted from the weight directly. That is why every modern transformer recipe specifies AdamW. Add the practical note: exclude biases and normalization scale/shift parameters from decay.',
      isCaseBased: false,
    },
    {
      question: 'Case: an image classifier hits 99% train / 71% val accuracy. You have 8,000 labelled images and no budget for more. What do you do, in order?',
      answer:
        'Confirm first: is the gap widening across epochs, and is the val set drawn the same way as train (same classes, same capture conditions, no near-duplicate images leaking across the split)? Duplicates across splits at this data size are extremely common. Then, with more data ruled out by budget: (1) augmentation, hardest first — random resized crop, horizontal flip if the labels permit, colour jitter, random erasing, and mixup/cutmix, since with 8k images this is by far the biggest lever; (2) transfer learning — a pretrained backbone with a fine-tuned head is effectively borrowing millions of extra images and usually beats every other item on this list at this scale; (3) stronger weight decay, then dropout in the classifier head; (4) a smaller model or a smaller-resolution backbone; (5) early stopping with best-checkpoint restore throughout. Also cheap and often overlooked: label noise audit on the val set — at 71% some of the "errors" may be wrong labels. Name the tradeoff: heavy augmentation slows convergence and can underfit if pushed too far, so re-tune epochs after adding it.',
      isCaseBased: true,
    },
    {
      question: 'What makes an augmentation valid? Give an example of one that quietly destroys a model.',
      answer:
        'The rule is label preservation: after the transform, would a human still assign the same label? A horizontally flipped cat is a cat, so flipping is free supervision on natural images. A horizontally flipped 6 is not a 6, and rotated 180° it becomes a 9 — apply flips to MNIST and you are training against wrong answers, so validation accuracy stalls for a reason that never shows up as an error message. Other real examples: colour jitter on ripe-vs-unripe fruit, where colour IS the label; synonym swap on negation-sensitive sentiment text; horizontal flips on chest X-rays, where situs matters clinically. The subtler version is distribution mismatch — augmentation that produces images unlike anything at test time wastes capacity. mixup and cutmix are the principled exception: they change the input AND the label by the same proportion, so the target stays truthful.',
      isCaseBased: false,
    },
    {
      question: 'Is early stopping really regularization, or just a convenience?',
      answer:
        'Genuinely regularization. Stopping early limits how far weights can travel from their small random initialization, so the effective capacity actually used stays lower — for a linear model with gradient descent you can show the stopped solution corresponds closely to an L2-penalized one, with the number of steps playing the role of 1/λ. It is also the cheapest regularizer in existence: no new parameters, no extra compute, one callback. The subtleties worth raising: restore the BEST checkpoint rather than the last; use a patience window because the validation curve is noisy; and remember that early stopping consumes the validation set for model selection, so an unbiased estimate requires a separate untouched test set.',
      isCaseBased: false,
    },
    {
      question: 'Modern ResNets and many transformers use little or no dropout. Why, if dropout is so effective?',
      answer:
        'Because the regularization budget is now spent elsewhere and dropout has real costs. BatchNorm contributes its own noise (each example is normalized by statistics of a random batch), residual connections plus careful initialization make very deep nets trainable without heavy constraint, and modern augmentation stacks — random resized crop, mixup, cutmix, RandAugment — inject far more useful variation than multiplicative activation noise. Dropout also interacts badly with BatchNorm: the variance dropout adds at train time does not match the running statistics used at test, producing a train/test variance shift that can hurt accuracy. Where dropout persists it tends to be in wide fully-connected heads and in transformer sublayers at small rates (0.1). The honest framing: dropout is a tool for the overfitting regime, and large-data pretraining regimes are usually not in it.',
      isCaseBased: false,
    },
    {
      question: 'Case: your teammate reports "val loss goes up at epoch 12, so I stopped and shipped epoch 11". Two runs later it happened at epoch 40 instead. What is going on and what do you change?',
      answer:
        'They are reacting to a single-epoch tick on a noisy curve. Validation loss wobbles from shuffling order, dropout masks, augmentation randomness and — most of all — a small validation set, where a handful of borderline examples flipping is enough to move the mean. Concrete changes: (1) use a patience window (5–10 epochs) with best-checkpoint restore instead of stopping at the first uptick; (2) monitor the metric you actually care about alongside the loss, since val loss can rise from growing confidence on already-correct examples while accuracy still improves — a classic and confusing pattern with cross-entropy; (3) enlarge the val set or use cross-validation if it is only a few hundred examples; (4) smooth the curve or average over the last k epochs before judging; (5) fix seeds so runs are comparable. Tradeoff to name: a longer patience costs compute and lets you drift further into overfitting, but the best checkpoint is restored anyway, so the cost is mostly wall-clock.',
      isCaseBased: true,
    },
    {
      question: 'Rank dropout, weight decay, data augmentation and early stopping by how much you expect each to help. Defend the order.',
      answer:
        'When augmentation applies to the domain it wins outright, because it is the only one on the list that adds information — it tells the model which transformations should not change the answer, whereas the others only restrict the hypothesis space. Early stopping comes next on cost-effectiveness grounds: near-zero cost, always worth having, and it bounds the damage from every other mistake. Weight decay is third — reliable, nearly always on, small λ, but a blunt instrument that shrinks everything uniformly. Dropout is last in modern practice: still strong on wide fully-connected layers with limited data, but often redundant next to BatchNorm plus a good augmentation stack, and it interacts badly with normalization. The honest caveat that turns this from a memorized ranking into a real answer: the ordering is data-regime dependent. With plenty of data none of them matter much; with very little data, transfer learning from a pretrained model beats all four combined.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'The random-labels result', back: 'A big net fits randomly shuffled labels to zero training error. Fitting is never the constraint — generalization is.' },
    { front: 'Dropout: what it does and why it works', back: 'Zero each activation independently with prob p, fresh mask per training step. (1) No co-adaptation — no unit can depend on a specific partner. (2) Implicit ensemble of 2ⁿ weight-sharing thinned nets.' },
    { front: 'Inverted dropout arithmetic', back: 'Divide survivors by (1 − p) at TRAIN. Then E[activation] = h, so inference needs no correction. At p=0.5 survivors are doubled.' },
    { front: 'Forgetting model.eval()', back: 'Dropout keeps firing at serve time — each prediction uses a random half-network. Noisy and worse, no error raised. Also leaves BatchNorm on batch stats.' },
    { front: 'Typical dropout rates', back: '0.5 wide dense layers, 0.1–0.3 conv/embeddings/transformer sublayers, 0 on the output. Modern BatchNorm + augmentation architectures often use none.' },
    { front: 'Early stopping recipe (and its catch)', back: 'Watch val loss, keep the BEST checkpoint, stop after patience (5–10) epochs without improvement, restore best. Catch: val is now part of model selection, so its loss is optimistic — report on a separate test set touched once.' },
    { front: 'Weight decay = L2 = Ridge', back: 'Add (λ/2)‖w‖² → update becomes w := (1 − αλ)w − α∂J/∂w. Same penalty as Ridge in the ML subject. Skip biases and norm parameters.' },
    { front: 'Why AdamW, not Adam + L2', back: 'Adam divides the λw term by each parameter\'s adaptive scale, so decay becomes uneven. AdamW subtracts αλw from the weight directly — decoupled.' },
    { front: 'The augmentation rule', back: 'Must preserve the label. Flipped cat = cat (fine). Flipped 6 ≠ 6, rotated 6 = 9 (label destroyed). mixup/cutmix blend inputs AND labels in equal proportion.' },
    { front: 'Overfitting response order', back: 'More data → augmentation → stronger regularization → smaller model → early stopping. Confirm the gap is WIDENING first; rising-from-epoch-1 means a bug.' },
  ],
  mindmapMarkdown: `- Regularization: Dropout, Early Stopping, Weight Decay & Augmentation
  - The setup
    - Nets memorize random labels → zero train error
    - Question is never "can it fit", only "will it generalize"
    - Regularizer = trade train accuracy for test accuracy
    - Capacity dial: train error falls, test error U-shaped
    - Double descent (huge models descend twice)
  - Dropout
    - Zero activations with prob p, fresh mask per step
    - Intuition 1: no co-adaptation
    - Intuition 2: ensemble of 2ⁿ thinned nets
    - Train/test asymmetry
      - ON at train, OFF at inference
      - Inverted: divide survivors by (1 − p)
      - E[activation] unchanged → test needs nothing
      - Forgetting model.eval() = silent degradation
    - Rates: 0.5 dense, 0.1–0.3 conv/transformer, 0 output
    - Modern nets with BatchNorm + augmentation use little/none
  - Early stopping
    - Watch val loss, patience window, restore BEST checkpoint
    - Cheapest regularizer, no extra parameters
    - Limits distance travelled from init (implicit L2)
    - Val is now model selection → separate test set
  - Weight decay (L2)
    - Loss + (λ/2)‖w‖²
    - Update: w := (1 − αλ)w − α·grad
    - Same as Ridge (ML subject)
    - Big weights = sharp function
    - Skip biases and norm parameters
    - AdamW decouples decay from adaptive scaling
  - Data augmentation
    - Highest leverage: adds real information
    - Images: flip, crop, rotate, colour jitter, erasing
    - Text: synonym swap, back-translation
    - Audio: SpecAugment (mask freq/time bands)
    - Label-preservation rule (flipped 6 is not a 6)
    - mixup / cutmix: blend inputs and labels together
    - Label smoothing: target 0.9 not 1.0
  - Diagnosis workflow
    - Overfitting = gap WIDENS over epochs
    - Val bad from epoch 1 = bug
      - Leakage
      - Label mismatch
      - Wrong eval preprocessing / train mode left on
      - Bad split (time or group structure)
    - Response order
      - More data
      - Augmentation
      - Stronger regularization
      - Smaller model
      - Early stopping as backstop
    - Underfitting (both losses high, no gap)
      - Train longer, fix LR, bigger model
      - Turn regularization DOWN
      - Sanity test: overfit a single batch
    - Val curve is noisy — judge trends, not single epochs`,
}

export default m
