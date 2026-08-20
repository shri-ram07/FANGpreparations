import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l1-classification-losses',
  subjectId: 'metrics',
  level: 1,
  title: 'Classification Losses: Cross-Entropy, Focal & Hinge',
  whyItMatters:
    'Every classifier you will ever ship — logistic regression, a gradient-boosted tree, a 70B language model — is minimising one of these. "Why this loss?" is a guaranteed FAANG question, and the answer is never "because it works better". It is a statement about what you assumed and what you decided a mistake costs. This module gives you the derivation, the numbers, and the sentence.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'Start from the only honest question',
      md: `A model looks at one row and outputs **p** — its claimed probability that the label is 1. The true label **y** arrives. How do we score that?

- Do not invent a formula. Ask instead: **how probable was what actually happened, according to the model?**
- If y = 1, the model assigned probability **p** to what happened.
- If y = 0, the model assigned probability **1 − p** to what happened.
- Call that number **p_t** — the probability the model gave *the true label*. It is the only number that matters.
- A good model makes p_t large on every row. That is the whole objective, stated before any loss exists.`,
    },
    {
      type: 'intuition',
      title: 'From "probability of the data" to a loss, in three moves',
      md: `Both cases above collapse into one expression: **p^y · (1−p)^(1−y)**. Check it — set y = 1, the second factor becomes (1−p)⁰ = 1, leaving p. Set y = 0 and only (1−p) survives. One formula, no if-statement.

- **Move 1 — multiply.** Rows are assumed independent, so the probability of the *whole dataset* is the product of those terms. That product is the **likelihood**.
- **Move 2 — take the log.** A product of 10,000 numbers below 1 underflows to 0.0 in float64. Log turns the product into a *sum*, and log is monotonic, so the maximiser does not move.
- **Move 3 — negate.** Optimisers minimise. Maximising log-likelihood = minimising negative log-likelihood.
- What you have written after those three moves **is binary cross-entropy**. It was not designed; it fell out.
- Payoff sentence, memorise it: ***minimising cross-entropy is exactly maximising likelihood.***`,
    },
    {
      type: 'math',
      intro: 'The three moves, in symbols. Nothing is added between lines — only rewritten.',
      latex: [
        'P(y \\mid p) = p^{\\,y}\\,(1-p)^{\\,1-y}, \\qquad y \\in \\{0, 1\\}',
        '\\mathcal{L} = \\prod_{i=1}^{N} p_i^{\\,y_i}(1-p_i)^{\\,1-y_i} \\;\\;\\xrightarrow{\\;\\log\\;}\\;\\; \\sum_{i=1}^{N}\\Big[\\, y_i \\log p_i + (1-y_i)\\log(1-p_i) \\Big]',
        '\\text{BCE} = -\\frac{1}{N}\\sum_{i=1}^{N}\\Big[\\, y_i \\log p_i + (1-y_i)\\log(1-p_i) \\Big] \\;=\\; -\\frac{1}{N}\\sum_{i=1}^{N} \\log p_{t,i}',
        'p_t = \\begin{cases} p & \\text{if } y = 1 \\\\ 1-p & \\text{if } y = 0 \\end{cases} \\qquad\\Longrightarrow\\qquad \\text{BCE} = \\text{mean of } -\\log p_t',
      ],
    },
    {
      type: 'note',
      md: `That last equality is worth more than the first three lines. **Binary cross-entropy is just the average of −log(p_t)** — one number per row, and the label has already been absorbed into p_t. Every loss in this module is a re-weighting of that single quantity. The maximum-likelihood machinery behind it is derived properly in the **Math** subject's MLE section; the sentence to carry out of it is *"choosing a loss is choosing a noise model"*. Cross-entropy is the loss you get when you assume each label was a Bernoulli draw from the model's own predicted probability.`,
    },
    {
      type: 'intuition',
      title: 'The shape of the penalty: gentle when right, brutal when confidently wrong',
      md: `Feed −log(p_t) some numbers. It is not a straight line and that asymmetry is the entire behaviour of the loss.

- p_t = 0.9 → penalty **0.105**. You were right; you pay almost nothing.
- p_t = 0.5 → penalty **0.693**. You shrugged; you pay a fixed, modest fee.
- p_t = 0.1 → penalty **2.303**. Wrong, and you had said so out loud. 22× the first row.
- p_t = 0.01 → penalty **4.605**. 44× the first row, and it keeps climbing to infinity as p_t → 0.
- Read the pattern: being *right* is cheap regardless of how right; being *wrong* is cheap only if you hedged.
- **The expensive quadrant is confident-and-wrong.** Cross-entropy is a loss that punishes arrogance, not error.`,
    },
    {
      type: 'note',
      md: `This is also why one mislabelled row can dominate a training batch. If the label is wrong and the model is (correctly) confident, p_t ≈ 0.001 and that single row contributes ~6.9 while a thousand well-classified rows contribute ~0.05 each. Practical consequence: **cross-entropy is not robust to label noise**. If your labels come from crowdsourcing or weak supervision, label smoothing (below) or an explicitly robust loss is not optional decoration — it is what stops a handful of bad annotations from steering the model.`,
    },
    {
      type: 'intuition',
      title: 'More than two classes: softmax + categorical cross-entropy',
      md: `The model now emits **K raw scores** (logits) — unbounded, not probabilities. **Softmax** turns them into one: exponentiate each, divide by the sum. Everything positive, everything sums to 1.

- With a **one-hot** label, the categorical cross-entropy sum −Σ y_k log p̂_k has K−1 terms multiplied by zero.
- So only the true class's term survives: the loss is **−log(p̂ of the correct class)**. The same −log(p_t) as before.
- The other classes are not ignored, though — they sit in softmax's denominator, so pushing one score up pushes every other probability down. Classes *compete*.
- With K = 2 softmax collapses algebraically to the sigmoid. Binary and categorical cross-entropy are one object, not two.
- Sanity check for interviews: a random model on K classes has loss ln(K) — **0.693 for 2 classes, 2.303 for 10, 6.908 for 1000**. If your training loss starts near that, initialisation is fine. If it starts at 40, something is broken.`,
    },
    {
      type: 'math',
      intro: 'Softmax, categorical cross-entropy, and the log-sum-exp rewrite that makes it computable.',
      latex: [
        '\\hat{p}_k = \\text{softmax}(z)_k = \\frac{e^{z_k}}{\\sum_{j=1}^{K} e^{z_j}} \\qquad \\text{CCE} = -\\sum_{k=1}^{K} y_k \\log \\hat{p}_k \\;\\overset{\\text{one-hot}}{=}\\; -\\log \\hat{p}_c',
        '\\log \\text{softmax}(z)_k = z_k - \\underbrace{\\Big( M + \\log \\textstyle\\sum_{j} e^{\\,z_j - M} \\Big)}_{\\text{log-sum-exp}}, \\qquad M = \\max_j z_j',
        '\\text{Subtracting } M \\text{ changes nothing mathematically: } e^{z_k - M} / \\textstyle\\sum_j e^{z_j - M} = e^{z_k}/\\sum_j e^{z_j}.',
      ],
    },
    {
      type: 'intuition',
      title: 'The numerical trap: never softmax then log',
      md: `A confident network produces logits in the hundreds or thousands. \`exp(1000)\` is **inf** in float64. inf/inf is **nan**, and log(nan) is nan — your loss dies before it ever reaches the optimiser.

- The fix is one line: subtract the largest logit before exponentiating. The largest term becomes e⁰ = 1, everything else is smaller, nothing overflows.
- The ratio is unchanged, so this is not an approximation — it is algebra.
- In practice you never write it. Pass **logits** to \`nn.CrossEntropyLoss\` / \`BCEWithLogitsLoss\` / \`from_logits=True\` and the framework does the stable fused version.
- The bug this prevents is the classic: applying softmax in your model's \`forward\` **and** using \`CrossEntropyLoss\` — you softmax twice, the gradients flatten, and training silently underperforms rather than crashing.
- Interview one-liner: *"logits in, never probabilities — log-sum-exp is stable, softmax-then-log is not."*`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The overflow, and the one-line fix',
      code: `import numpy as np

z = np.array([1000.0, 1001.0, 1002.0])          # logits from a very confident model

with np.errstate(over='ignore', invalid='ignore'):
    naive = np.log(np.exp(z) / np.exp(z).sum())  # softmax FIRST, then log
shift = z - z.max()                              # the whole trick: subtract the max
stable = shift - np.log(np.exp(shift).sum())     # log-softmax in one pass

print('naive  log-softmax:', naive)
print('stable log-softmax:', stable.round(3))
print('cross-entropy if class 0 is the label: %.3f' % -stable[0])

# ---- real output ----
# naive  log-softmax: [nan nan nan]
# stable log-softmax: [-2.408 -1.408 -0.408]
# cross-entropy if class 0 is the label: 2.408`,
      annotations: {
        6: 'exp(1000) overflows to inf, inf/inf is nan, and the nan propagates through every weight in the backward pass.',
        7: 'The entire fix. Largest logit becomes 0, so the biggest exponential is exp(0) = 1.',
        15: 'nan. Not a warning, not a bad number — an unusable loss. This is what a hand-rolled softmax gives you.',
        16: 'Correct values, from logits a naive implementation cannot even represent.',
      },
    },
    {
      type: 'intuition',
      title: 'Label smoothing: stop demanding certainty',
      md: `Cross-entropy with a hard target of 1.0 can never be satisfied. To drive −log(p) to zero the model needs p = 1, which needs a logit of **+∞**. So it keeps growing weights forever, chasing a target it cannot reach.

- **Label smoothing** replaces the hard target with a soft one. The recipe spreads ε mass uniformly over all K classes: the true class gets (1 − ε) + ε/K, every other class gets ε/K. Binary with ε = 0.2 gives **(0.9, 0.1)**; ε = 0.1 would give (0.95, 0.05).
- Now the loss has a **finite minimum at a finite logit**. With targets 0.9/0.1 the best achievable loss is 0.325, reached at p = 0.9 exactly. Overshooting to p = 0.99 makes the loss *worse* (0.470).
- Effects: a regulariser on logit magnitude, better **calibration** (the model's 0.9 starts to mean 90%), and typically a small accuracy gain — it is standard in Inception-v3, Transformers, and most ImageNet recipes.
- Bonus that matters with noisy labels: an occasional wrong label can now only cost so much.
- **The cost:** you have deliberately destroyed some confidence separation. The model's top scores get compressed toward each other, which hurts anything that consumes the *margin* — knowledge distillation, retrieval by score, and thresholding at extreme operating points.
- Rule of thumb: ε = 0.1 on a many-class problem. Skip it if you need maximally separated confidence scores downstream.`,
    },
    {
      type: 'math',
      intro: 'The smoothed target, and why the loss now has a floor.',
      latex: [
        'y^{\\text{LS}}_k = (1 - \\varepsilon)\\, y_k + \\frac{\\varepsilon}{K} \\qquad (\\varepsilon = 0.1,\\; K = 10 \\;\\Rightarrow\\; 0.91 \\text{ true},\\; 0.01 \\text{ each other})',
        '\\varepsilon = 0.1,\\; K = 2 \\;\\Rightarrow\\; (0.95,\\, 0.05). \\qquad \\varepsilon = 0.2,\\; K = 2 \\;\\Rightarrow\\; (0.9,\\, 0.1) \\;\\text{— the pair used below.}',
        '\\min_{p}\\; -\\Big[\\, 0.9 \\log p + 0.1 \\log(1-p) \\Big] \\;=\\; 0.325 \\quad\\text{at } p = 0.9',
        '\\text{Hard targets: the minimiser is } p = 1 \\Leftrightarrow z = +\\infty. \\text{ Smoothed: a finite logit is optimal.}',
      ],
    },
    {
      type: 'intuition',
      title: 'Focal loss: when 99.9% of your rows are boring',
      md: `Object detection reality: a single-stage detector scores ~100,000 candidate boxes per image and maybe 20 contain an object. The other 99,980 are trivially-classified background.

- Each easy background box has p_t ≈ 0.99, so cross-entropy charges it only 0.010 — *individually* negligible.
- But 99,980 × 0.010 = 1,000, while 20 hard boxes at 2.3 each contribute 46. **The easy majority owns 95% of the gradient.**
- The model is not confused; it is *drowned*. It spends its capacity getting already-correct background slightly more correct.
- **Focal loss** fixes it with one multiplier: scale each row's cross-entropy by **(1 − p_t)^γ**.
- p_t = 0.99, γ = 2 → multiplier 0.0001. That row is now worth 1/10,000 of what it was.
- p_t = 0.1 (hard, wrong) → multiplier 0.81. The hard rows keep almost everything.
- It is a **soft, continuous hard-example miner** — no sampling, no ratios, no discarded data, one extra term in the loss. From the RetinaNet paper (Lin et al., 2017), which used it to make a one-stage detector match two-stage accuracy.`,
    },
    {
      type: 'math',
      intro: 'Focal loss. The whole idea is the factor in front of the cross-entropy you already have.',
      latex: [
        '\\text{FL}(p_t) = -\\alpha_t\\,(1 - p_t)^{\\gamma}\\,\\log(p_t), \\qquad \\gamma \\ge 0,\\;\\; \\alpha_t \\in (0, 1)',
        '\\gamma = 0 \\;\\Longrightarrow\\; \\text{FL} = \\text{cross-entropy}. \\quad \\text{RetinaNet default: } \\gamma = 2,\\; \\alpha = 0.25.',
        '\\gamma = 2:\\quad p_t = 0.99 \\to \\times 0.0001, \\quad p_t = 0.9 \\to \\times 0.01, \\quad p_t = 0.5 \\to \\times 0.25, \\quad p_t = 0.1 \\to \\times 0.81',
      ],
    },
    {
      type: 'note',
      md: `**γ and α do different jobs — do not conflate them.** **γ (focusing)** down-weights by *how easy the example is*, regardless of class; γ = 0 is plain cross-entropy, γ = 2 is the standard, γ > 5 starves the model of signal because even moderately-hard rows get crushed. **α (balancing)** down-weights by *which class it is* — a plain class weight, exactly what \`class_weight='balanced'\` does. Counter-intuitively RetinaNet uses α = 0.25 on the *rare* foreground class: γ has already suppressed the easy background so hard, that the usual "boost the minority" weight would now overcorrect. That interaction is the detail interviewers probe.`,
    },
    {
      type: 'intuition',
      title: 'Focal loss versus resampling and class weights',
      md: `The **ML** subject's imbalance module ranks the three classic fixes: threshold moving, class weights, resampling. Focal loss is a fourth option, and it is not always the right one.

- Class weights split rows by **label**. Focal splits them by **difficulty**. Those are different axes, and difficulty is usually the one you actually meant.
- Prefer **focal** when the negatives are overwhelming *and* mostly trivial: dense detection, per-pixel segmentation, retrieval with in-batch negatives, ad-click models with billions of impressions.
- Prefer **class weights or threshold moving** on ordinary tabular imbalance (1% fraud, 100k rows). They are one keyword argument, they do not need tuning, and focal's γ is another hyperparameter to search.
- Never reach for focal to fix **label noise**: a mislabelled row looks exactly like a hard example, so focal *amplifies* it. That is its main failure mode.
- Honest caveat: focal loss decalibrates probabilities badly. If a downstream system consumes the score as a probability, you will need to recalibrate.
- One-line answer: *"class weights ask which class, focal asks how hard — I use focal when the imbalance is between easy and hard, not between labels."*`,
    },
    {
      type: 'intuition',
      title: 'Hinge loss: the margin, not the probability',
      md: `Switch to labels **y ∈ {−1, +1}** and let the model output a raw score **f(x)**. The hinge loss is **max(0, 1 − y·f(x))**. Read it as a demand, not a formula.

- y·f(x) > 0 means "correct side of the boundary". Not enough.
- Hinge pays nothing only once **y·f(x) ≥ 1** — correct *and* at least a full margin's distance clear of the boundary.
- Anything short of that is charged, **linearly**, by how far short it fell. Wrong side by 3 → penalty 4.
- The consequence that defines SVMs: points comfortably past the margin have **exactly zero** loss and therefore **exactly zero** gradient. Delete them and the model is unchanged.
- The points that remain — on or inside the margin — are the **support vectors**. Sparsity is not a trick bolted on; it is what a loss with a flat zero region does.
- Compare cross-entropy: −log(p_t) is *never* zero. Every point pulls forever, however tiny. That is why logistic regression has no support vectors.`,
    },
    {
      type: 'math',
      intro: 'Hinge, squared hinge, and the zero condition.',
      latex: [
        '\\ell_{\\text{hinge}}\\big(y, f(x)\\big) = \\max\\!\\big(0,\\; 1 - y\\,f(x)\\big), \\qquad y \\in \\{-1, +1\\}',
        '\\ell_{\\text{sq-hinge}} = \\max\\!\\big(0,\\; 1 - y\\,f(x)\\big)^{2} \\quad \\text{— smooth at the kink, but punishes outliers quadratically.}',
        '\\ell = 0 \\iff y\\,f(x) \\ge 1 \\quad\\Longrightarrow\\quad \\text{zero gradient} \\;\\Longrightarrow\\; \\text{that point is not a support vector.}',
      ],
    },
    { type: 'visual', component: 'PointerBoxDiagram', props: {
      title: 'The penalty landscape: same four predictions, three losses',
      notice: 'p_t is the probability the model gave the TRUE label. Step through and watch which rows each loss decides to care about.',
      leftLabel: 'the prediction',
      rightLabel: 'what it pays',
      frames: [
        {
          note: 'Four predictions, the four quadrants. Nothing charged yet — just how much probability each one put on the correct answer.',
          stack: [
            { name: 'A confident-right', value: 'p_t = 0.95', to: 'a' },
            { name: 'B unsure-right', value: 'p_t = 0.60', to: 'b' },
            { name: 'C unsure-wrong', value: 'p_t = 0.40', to: 'c' },
            { name: 'D confident-WRONG', value: 'p_t = 0.05', to: 'd', danger: true },
          ],
          heap: [
            { id: 'a', value: 'penalty = ?', label: 'easy' },
            { id: 'b', value: 'penalty = ?', label: 'fine' },
            { id: 'c', value: 'penalty = ?', label: 'hard' },
            { id: 'd', value: 'penalty = ?', label: 'disaster' },
          ],
        },
        {
          note: 'Cross-entropy = -log(p_t). D pays 59x what A pays. But notice A still pays something — cross-entropy never reaches zero.',
          stack: [
            { name: 'A confident-right', value: 'p_t = 0.95', to: 'a' },
            { name: 'B unsure-right', value: 'p_t = 0.60', to: 'b' },
            { name: 'C unsure-wrong', value: 'p_t = 0.40', to: 'c' },
            { name: 'D confident-WRONG', value: 'p_t = 0.05', to: 'd', danger: true },
          ],
          heap: [
            { id: 'a', value: 'CE = 0.051', label: 'still > 0' },
            { id: 'b', value: 'CE = 0.511', label: '10x A' },
            { id: 'c', value: 'CE = 0.916', label: '18x A' },
            { id: 'd', value: 'CE = 2.996', label: '59x A' },
          ],
        },
        {
          note: 'Focal, gamma = 2: multiply each row by (1 - p_t)^2. A shrinks 400x, D barely moves. The ratio D:A explodes from 59x to over 21,000x.',
          stack: [
            { name: 'A confident-right', value: 'x (1-0.95)^2 = 0.0025', to: 'a' },
            { name: 'B unsure-right', value: 'x (1-0.60)^2 = 0.16', to: 'b' },
            { name: 'C unsure-wrong', value: 'x (1-0.40)^2 = 0.36', to: 'c' },
            { name: 'D confident-WRONG', value: 'x (1-0.05)^2 = 0.90', to: 'd', danger: true },
          ],
          heap: [
            { id: 'a', value: 'focal = 0.0001', label: 'silenced' },
            { id: 'b', value: 'focal = 0.082', label: 'quieted' },
            { id: 'c', value: 'focal = 0.330', label: 'kept' },
            { id: 'd', value: 'focal = 2.704', label: 'kept, 90%' },
          ],
        },
        {
          note: 'Hinge on the margin score y*f(x). A is past the margin, so it pays EXACTLY zero — it has no gradient and can be deleted. Cross-entropy charged it 0.051 forever.',
          stack: [
            { name: 'A confident-right', value: 'y*f = 2.0', to: 'a' },
            { name: 'B unsure-right', value: 'y*f = 0.4', to: 'b' },
            { name: 'C unsure-wrong', value: 'y*f = -0.4', to: 'c' },
            { name: 'D confident-WRONG', value: 'y*f = -3.0', to: 'd', danger: true },
          ],
          heap: [
            { id: 'a', value: 'hinge = 0.000', label: 'past margin' },
            { id: 'b', value: 'hinge = 0.600', label: 'inside margin' },
            { id: 'c', value: 'hinge = 1.400', label: 'support vector' },
            { id: 'd', value: 'hinge = 4.000', label: 'linear, not log' },
          ],
        },
      ],
    } },
    {
      type: 'note',
      md: `Compare frames 2 and 4 on row **D**. Cross-entropy charges 2.996 and would charge 4.6 at p_t = 0.01, 6.9 at 0.001 — it grows without bound. Hinge charges 4.0 and grows only *linearly*, so a single catastrophic outlier can drag a cross-entropy model much harder than a hinge model. That is hinge's quiet robustness advantage. Frame 3 is the opposite trade: focal deliberately widens the gap between easy and hard until the easy rows effectively stop existing.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'BCE, focal and hinge on the same six predictions',
      code: `import numpy as np

y = np.array([1, 1, 1, 0, 0, 0])                  # true labels
z = np.array([3.0, 1.2, 0.3, -3.0, -0.3, 2.5])    # raw model scores (logits)
p = 1 / (1 + np.exp(-z))                          # sigmoid -> P(class 1)
pt = np.where(y == 1, p, 1 - p)                   # probability given to the TRUE label

bce = -np.log(pt)                                 # cross-entropy, per sample
focal = (1 - pt) ** 2 * bce                       # focal loss, gamma = 2
hinge = np.maximum(0, 1 - (2 * y - 1) * z)        # SVM hinge, labels mapped to +-1

print(' y      z    p_t     BCE   focal  x-mult   hinge')
for i in range(len(y)):
    print('%2d %6.1f %6.3f %7.3f %7.3f %7.3f %7.3f'
          % (y[i], z[i], pt[i], bce[i], focal[i], focal[i] / bce[i], hinge[i]))

pt_big = np.r_[np.full(1000, 0.95), np.full(10, 0.30)]   # 1000 easy + 10 hard
b, f = -np.log(pt_big), (1 - pt_big) ** 2 * -np.log(pt_big)
print('1000 easy + 10 hard -> easy rows own %.1f%% of BCE, but %.1f%% of focal'
      % (100 * b[:1000].sum() / b.sum(), 100 * f[:1000].sum() / f.sum()))

# ---- real output ----
#  y      z    p_t     BCE   focal  x-mult   hinge
#  1    3.0  0.953   0.049   0.000   0.002   0.000
#  1    1.2  0.769   0.263   0.014   0.054   0.000
#  1    0.3  0.574   0.554   0.100   0.181   0.700
#  0   -3.0  0.953   0.049   0.000   0.002   0.000
#  0   -0.3  0.574   0.554   0.100   0.181   0.700
#  0    2.5  0.076   2.579   2.202   0.854   3.500
# 1000 easy + 10 hard -> easy rows own 81.0% of BCE, but 2.1% of focal`,
      annotations: {
        6: 'One line collapses both label cases. Everything after this is a function of p_t alone.',
        9: 'Focal is literally cross-entropy times (1-p_t)^2. Two characters of code, an entire paper.',
        10: '2*y-1 maps {0,1} to {-1,+1}; hinge needs the signed margin, not a probability.',
        29: 'The disaster row: the model gave the true label only 7.6%. BCE charges 2.579 against 0.049 for an easy row — 53x.',
        30: 'The punchline. Same data, same model: cross-entropy hands 81% of the gradient to rows it already gets right; focal hands them 2.1%.',
      },
    },
    {
      type: 'note',
      md: `Read the \`x-mult\` column — that is focal's multiplier per row. The two easy rows are scaled by **0.002** (500× cheaper); the confidently-wrong row keeps **0.854** of its penalty. Then read the last line: at a realistic ratio of 1000 easy to 10 hard, cross-entropy spends **81%** of its signal on rows that are already correct while focal spends **2.1%**. Nothing about the data, the model, or the sampling changed — only the loss.`,
    },
    {
      type: 'intuition',
      title: 'Cross-entropy vs hinge: probabilities or margins, pick one',
      md: `They optimise genuinely different objects, and the difference shows up the moment someone downstream asks "how sure are you?".

- **Cross-entropy** produces a **calibrated probability**. 0.7 means roughly "70% of rows like this are positive" — because minimising it is maximum likelihood.
- **Hinge** produces a **score**, not a probability. Its optimum only cares that y·f ≥ 1; the actual value carries no distributional meaning. SVMs need Platt scaling bolted on to fake probabilities.
- That matters whenever the output feeds a **threshold, an expected-cost calculation, or another model**. "Refund if fraud probability × ₹8,000 > ₹50 review cost" needs a real probability.
- **Hinge is sparse** (zero loss past the margin → support vectors → a compact model). Cross-entropy touches every point forever.
- **Hinge is robust to extreme outliers** (linear growth); cross-entropy's log growth is unbounded.
- **Hinge has a kink at the margin** — non-differentiable at one point, so classic SVMs are solved by quadratic programming, not plain gradient descent. Squared hinge smooths it at the price of outlier sensitivity.`,
    },
    {
      type: 'note',
      md: `**Why cross-entropy dominates deep learning, in four reasons.** (1) Probabilities compose — you can multiply them, threshold them, feed them to a downstream expected-cost decision; margins cannot. (2) Its gradient is exactly (p̂ − y)·x, which flows cleanly through arbitrarily deep stacks; hinge contributes *nothing* from every satisfied point, so a deep net gets zero signal from most of its batch late in training. (3) It extends to K classes in one line via softmax; multi-class hinge needs an awkward one-vs-rest or Crammer-Singer construction. (4) Sparsity — hinge's headline benefit — is worthless when you are training 100M dense parameters anyway. Hinge earns its place where the margin *is* the product: SVMs on small-to-mid tabular data, and \`SGDClassifier(loss='hinge')\` on very wide sparse text features. Depth and detail live in the **ML** subject's SVM module.`,
    },
    {
      type: 'intuition',
      title: 'And never MSE — the one-line version',
      md: `Squared error on 0/1 labels is the classic beginner move. It is wrong for a reason worth being able to state in ten seconds.

- MSE's gradient through a sigmoid carries an extra **σ′(z) = p(1−p)** factor. That factor goes to zero at both tails.
- "Confidently wrong" means |z| is large, which means σ′(z) ≈ 0, which means **the update is ~0 exactly when the model is most wrong**.
- Cross-entropy is constructed so σ′ cancels: what survives is (p̂ − y)·x, with no throttle.
- Secondary reason: MSE composed with a sigmoid is **non-convex**, so gradient descent can park in a local minimum. Cross-entropy with a sigmoid is convex.
- The full derivation with numbers (400× weaker gradients at z = −6) is in the **ML** subject's logistic-regression module — do not re-derive it here, just name it.`,
    },
    {
      type: 'intuition',
      title: 'A different question: are these two the same thing?',
      md: `Every loss so far answers **which class is this?** — a fixed set of K classes, one output unit each, softmax competing across them. Some problems do not have that shape.

- Face verification, speaker ID, person re-identification, image retrieval: the real question is **are these two inputs the same thing?**
- Softmax cannot express it. A door-access system would need one class per employee, with 1–2 photos each, and a new employee joins next Tuesday.
- Every new person means a new output unit and a full retrain. That is not a model that can be operated.
- So stop classifying. Learn an **embedding** instead — a function mapping each input to a vector where **distance means dissimilarity**.
- Same identity → vectors close. Different identities → vectors far. Verification becomes a threshold on a distance; identification becomes a nearest-neighbour lookup.
- The family name is **metric learning**: the loss shapes the geometry of a space, rather than drawing a decision over a fixed label set.`,
    },
    {
      type: 'intuition',
      title: 'Contrastive loss: pull, push, then stop pushing',
      md: `Train on **pairs**. Each pair carries a label y — 1 if the two inputs are the same thing, 0 if not. Let d be the distance between their two embeddings. The loss is \`y*d^2 + (1-y)*max(0, margin - d)^2\`: two halves, exactly one active per pair.

- **Same pair (y = 1):** the loss is d², so the gradient pulls the two embeddings together until d = 0. No margin, no mercy — two photos of one person should land on top of each other.
- **Different pair (y = 0):** the loss is (margin − d)², which pushes them apart *only while d < margin*.
- Once d ≥ margin the term is clipped to zero. Exactly zero loss, exactly zero gradient — the same flat region hinge loss has, for the same reason.
- **That clipping is the entire point**, not a detail. Without it the model would keep shoving already-distant pairs toward infinity, spending its capacity on negatives it solved in epoch one.
- The margin is the one real hyperparameter, and it is scale-dependent. L2-normalise the embeddings onto the unit sphere first; then a margin near 1 is sane and transfers between datasets.`,
    },
    {
      type: 'math',
      intro: 'Contrastive loss on a pair. y = 1 means same, y = 0 means different, m is the margin.',
      latex: [
        'd = \\lVert f(x_1) - f(x_2) \\rVert_2 \\qquad y \\in \\{0, 1\\}',
        '\\ell_{\\text{contrastive}} = y\\,d^{2} \\;+\\; (1 - y)\\,\\max\\!\\big(0,\\; m - d\\big)^{2}',
        'y = 0,\\; d \\ge m \\;\\Longrightarrow\\; \\ell = 0 \\;\\Longrightarrow\\; \\text{zero gradient: this pair is already far enough apart.}',
      ],
    },
    {
      type: 'intuition',
      title: 'Triplet loss: relative, never absolute',
      md: `Contrastive commits to absolute numbers — same-pairs at distance 0, different-pairs at least m apart — in a space whose scale you never chose. Triplet loss drops both demands.

- Feed **three** inputs: an **anchor** a, a **positive** p (same identity as a), a **negative** n (a different identity).
- The loss is \`max(0, d(a,p) - d(a,n) + margin)\`. One demand, in words: *the positive must be closer than the negative by at least the margin.*
- Nothing absolute is required. d(a,p) may be 0.2 or 20 — only the **gap** d(a,n) − d(a,p) matters, and it only has to clear m.
- Why that is better: a genuinely blurry photo can sit far from its own identity without being punished, as long as it still sits nearer that identity than any stranger. Contrastive would keep hammering it toward zero distance and distort the space to comply.
- Satisfied triplets pay exactly zero. Same flat region again — and here it becomes the central practical problem, not a bonus.
- The bill: you now have to *choose* triplets, and there are O(N³) of them.`,
    },
    {
      type: 'math',
      intro: 'Triplet loss. Anchor a, positive p, negative n, margin m. Compare the zero condition to hinge.',
      latex: [
        '\\ell_{\\text{triplet}} = \\max\\!\\big(0,\\; d(a, p) - d(a, n) + m \\big)',
        '\\ell = 0 \\iff d(a, n) \\ge d(a, p) + m \\qquad \\text{(a relative demand — no absolute distance appears)}',
        '\\text{FaceNet: } f(x) \\in \\mathbb{R}^{128},\\quad \\lVert f(x) \\rVert_2 = 1,\\quad m = 0.2',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Both losses on three 2-D points — and the margin switching itself off',
      code: `import numpy as np

a = np.array([0.0, 0.0])        # anchor  : a photo of Ana
p = np.array([0.3, 0.4])        # positive: another photo of Ana
n = np.array([0.8, 0.6])        # negative: a photo of Bo
margin = 1.5

d = lambda u, v: np.linalg.norm(u - v)
contrastive = lambda u, v, y: y * d(u, v) ** 2 + (1 - y) * max(0.0, margin - d(u, v)) ** 2
triplet = lambda a, p, n: max(0.0, d(a, p) - d(a, n) + margin)

print('d(a,p) = %.2f   d(a,n) = %.2f   margin = %.1f' % (d(a, p), d(a, n), margin))
print('contrastive, same pair  (y=1) : %.3f' % contrastive(a, p, 1))
print('contrastive, diff pair  (y=0) : %.3f' % contrastive(a, n, 0))
print('triplet (a, p, n)             : %.3f' % triplet(a, p, n))

n_far = np.array([2.4, 1.8])    # same direction, shoved out past the margin
print('--- push the negative out to d(a,n) = %.2f ---' % d(a, n_far))
print('contrastive, diff pair  (y=0) : %.3f' % contrastive(a, n_far, 0))
print('triplet (a, p, n_far)         : %.3f' % triplet(a, p, n_far))
print('gradient on this negative     : none - the loss is flat at exactly 0')

# ---- real output ----
# d(a,p) = 0.50   d(a,n) = 1.00   margin = 1.5
# contrastive, same pair  (y=1) : 0.250
# contrastive, diff pair  (y=0) : 0.250
# triplet (a, p, n)             : 1.000
# --- push the negative out to d(a,n) = 3.00 ---
# contrastive, diff pair  (y=0) : 0.000
# triplet (a, p, n_far)         : 0.000
# gradient on this negative     : none - the loss is flat at exactly 0`,
      annotations: {
        9: 'Both halves in one line. y picks which one survives: d squared for same-pairs, the clipped push for different-pairs.',
        10: 'No absolute distance appears — only d(a,p) compared against d(a,n). That is the whole difference from contrastive.',
        13: 'Same pair, d = 0.5, so it pays 0.25 and keeps being pulled inward. There is no margin on this half.',
        17: 'The only change in the whole script: Bo moves out to distance 3.0, twice the margin. Anchor and positive are untouched.',
        29: 'Exactly 0.000, not 0.001. Contrastive has stopped pushing: this negative is far enough and contributes nothing.',
        30: 'Triplet also exactly 0 — the positive is 2.5 nearer than the negative, and only 1.5 was demanded. A batch of triplets like this trains nothing at all.',
      },
    },
    {
      type: 'intuition',
      title: 'The payoff: adding an employee to the door system',
      md: `FaceNet (Schroff et al., 2015) is the story that makes the loss obvious. One network, trained with triplet loss, maps any face to a single 128-dimensional unit vector — no per-person parameters anywhere.

- **Verification** — *is this the person on the badge?* Embed both faces, take the distance, compare to a threshold. One number, one comparison.
- **Recognition** — *who is this?* Embed the face, find the nearest vector in a bank of known embeddings, accept only if it is inside the threshold.
- **Enrolment is the payoff.** New employee joins: one photo, one forward pass, one row of 128 floats inserted into a database. Done in a second.
- **No retraining, no new output unit, nothing touched in the model.** A softmax-over-employees classifier would need a new class, a resized head, and a full retrain on every hire.
- The same shape covers speaker verification, product image search, and re-identifying a person across store cameras — anywhere the label set is open and keeps growing.
- The threshold is a business decision, not a model one: tighten it and staff get locked out, loosen it and a lookalike walks in. That is the ROC trade from *ROC, AUC & PR Curves: Threshold-Free Judgement*, run on distances instead of scores.`,
    },
    {
      type: 'intuition',
      title: 'Triplet mining: why the naive version does not train',
      md: `Sample triplets at random after one epoch and nearly all of them already satisfy the margin. Loss zero, gradient zero, nothing learned — and the printed loss looks beautiful while the model sits still. Mining is not an optimisation; it is what makes the loss work at all.

- **Hard negatives** — the negative closest to the anchor, argmin d(a,n) over other identities. Maximum gradient per triplet.
- But the hardest negative is very often a **mislabelled photo or a genuine twin**. Training on those pulls the space inside out and collapses every embedding to one point — a documented, reproducible failure of naive hard mining.
- **Semi-hard negatives** (FaceNet's choice): farther than the positive but still inside the margin — \`d(a,p) < d(a,n) < d(a,p) + m\`. Wrong enough to produce gradient, not so wrong that it is probably noise.
- **Online / batch-hard mining:** build each batch as P identities × K images, embed once, then mine triplets *inside* the batch from its distance matrix. No offline triplet index, and the negatives stay fresh as the model moves.
- Interview sentence: *"with triplet loss the mining strategy matters more than the loss — random triplets give zero gradient and the hardest ones give a collapsed embedding."*`,
    },
    {
      type: 'note',
      md: `**Honest status: you would rarely hand-write a triplet loss today.** Two families replaced it, and both keep the same goal — a space where distance means similarity. (1) **Margin-based softmax** — ArcFace, CosFace, SphereFace — keeps a softmax over all training identities but adds an angular margin to the true class's logit. It gets the margin geometry *and* a full-batch gradient with **no mining at all**, which is why it owns face-recognition benchmarks. (2) **InfoNCE / multiple-negatives contrastive** — one positive scored against every other item in a large batch as negatives, then a softmax over those similarities. That is triplet loss with hundreds of negatives at once, which is exactly where the mining problem dissolves, and it is what trains CLIP, SimCLR and every modern sentence-embedding model. What such an embedding space *is* belongs to the DL module *Embeddings: Meaning as Vectors*; how the vectors are then indexed and searched belongs to the GenAI module *Embeddings, Vector Databases & Semantic Search*. Do not re-derive either here — carry the loss, and point at those two.`,
    },
    {
      type: 'intuition',
      title: 'The decision table you can recite',
      md: `Six questions, and the loss falls out. This is what the interviewer is actually testing.

- **Do I need calibrated probabilities downstream?** Yes → cross-entropy. It is the only one here that gives them for free.
- **Is my imbalance between easy and hard, not just between labels?** Yes → focal (γ = 2, tune α second). Dense detection, segmentation, huge-negative retrieval.
- **Is my imbalance ordinary label imbalance on tabular data?** → class weights and a moved threshold before you touch the loss function.
- **Are my labels noisy or crowdsourced?** → label smoothing (ε = 0.1). Never focal — it amplifies noise.
- **Is the margin the product, and the model must stay compact?** → hinge, and accept that the score is not a probability.
- **Is the question "are these two the same thing?" with an open, growing label set?** → contrastive or triplet in an embedding space, and budget for the mining strategy.
- The senior version of any of these answers ends with a cost sentence: *"a false negative here costs 160× a false alarm, so the loss is only half the decision — the threshold is the other half."*`,
    },
  ],
  quiz: [
    {
      question: 'Where does binary cross-entropy actually come from?',
      options: [
        {
          text: 'It was chosen because logarithms are numerically convenient',
          explanation: 'The log is a step in the derivation, not the reason. Convenience does not explain why THIS expression and not another.',
        },
        {
          text: 'It is the negative log-likelihood of a Bernoulli model: write P(data), take the log, negate',
          explanation: 'Correct. p^y(1−p)^(1−y) per row, multiplied across rows, logged into a sum, negated so an optimiser can minimise. Minimising cross-entropy IS maximum likelihood.',
        },
        {
          text: 'It is the squared distance between the predicted probability and the label',
          explanation: 'That is Brier score / MSE on probabilities — a different loss, with the vanishing-gradient problem cross-entropy was built to avoid.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Your model outputs 0.01 probability for a row whose true label is 1. What cross-entropy does that single row contribute?',
      options: [
        { text: '0.01 — the loss is just the probability gap', explanation: 'Cross-entropy is −log(p_t), not a linear gap. A linear penalty would make confident errors cheap, which is the opposite of the design.' },
        { text: '0.99 — one minus the probability', explanation: 'Also linear, also wrong. It would cap the penalty at 1 no matter how catastrophically confident the error was.' },
        {
          text: '4.605 — and it grows without bound as the probability approaches 0',
          explanation: 'Correct: −log(0.01) = 4.605, about 44× the 0.105 charged at p_t = 0.9. Confident-and-wrong is the expensive quadrant, by construction.',
        },
      ],
      correct: 2,
    },
    {
      question: 'With focal loss at γ = 2, by how much is a well-classified example at p_t = 0.9 down-weighted relative to plain cross-entropy?',
      options: [
        {
          text: '100× cheaper — the multiplier is (1 − 0.9)² = 0.01',
          explanation: 'Correct. And at p_t = 0.99 the multiplier is 0.0001, a 10,000× suppression. That is how focal makes an easy majority effectively disappear from the gradient.',
        },
        { text: '2× cheaper — γ = 2 halves the loss', explanation: 'γ is the exponent on (1 − p_t), not a divisor. It has no fixed effect; the suppression depends entirely on how easy the example is.' },
        { text: '10× cheaper — the multiplier is 1 − p_t', explanation: 'That would be γ = 1. The default γ = 2 squares it, giving 0.01 rather than 0.1.' },
      ],
      correct: 0,
    },
    {
      question: 'Why do frameworks want logits rather than probabilities passed to the loss function?',
      options: [
        { text: 'Logits are smaller numbers, so they train faster', explanation: 'Logits are unbounded and often larger than probabilities. Speed is not the issue.' },
        { text: 'The loss cannot be computed from probabilities at all', explanation: 'It can — the formula is defined on probabilities. The problem is that computing them first destroys precision.' },
        {
          text: 'softmax-then-log overflows: exp(large logit) is inf, inf/inf is nan. The fused log-sum-exp form subtracts the max and is stable',
          explanation: 'Correct. Subtracting the max is exact algebra, not an approximation. It also prevents the classic double-softmax bug of applying softmax in forward() and again in the loss.',
        },
      ],
      correct: 2,
    },
    {
      question: 'What is the real cost of label smoothing with ε = 0.1?',
      options: [
        { text: 'It reduces accuracy, which you trade for faster training', explanation: 'Accuracy usually improves slightly. Training speed is unaffected — it is one change to the target vector.' },
        {
          text: 'It compresses confidence separation, which hurts anything consuming the score margin — distillation, score-based retrieval, extreme thresholds',
          explanation: 'Correct. Capping the target below 1 caps how far apart the top logits can grow. Calibration improves; margin information is deliberately given up.',
        },
        { text: 'It makes the loss non-convex', explanation: 'Convexity is untouched — smoothing only changes the target vector, not the shape of the objective in the logits.' },
      ],
      correct: 1,
    },
    {
      question: 'A training point sits comfortably past the SVM margin, at y·f(x) = 2.5. What does it contribute?',
      options: [
        {
          text: 'Exactly zero loss and exactly zero gradient — delete it and the model is identical',
          explanation: 'Correct. max(0, 1 − 2.5) = 0. That flat region is precisely why only support vectors define an SVM, and why the trained model can discard most of the data.',
        },
        { text: 'A small positive loss that shrinks as the margin grows', explanation: 'That describes cross-entropy, which is never exactly zero — which is why logistic regression has no support vectors.' },
        { text: 'A negative loss, since the model is more than correct', explanation: 'The max(0, ·) floors it at zero. No loss in common use rewards being extra-correct.' },
      ],
      correct: 0,
    },
    {
      question: 'You have 1% fraud in a 100k-row tabular dataset, mostly clean labels. Which loss change do you reach for first?',
      options: [
        { text: 'Focal loss with γ = 2 — it is the imbalance loss', explanation: 'Focal targets easy-vs-hard imbalance in the millions-of-trivial-negatives regime. On ordinary tabular imbalance it adds a hyperparameter to tune and decalibrates your probabilities for no clear gain.' },
        { text: 'Hinge loss — margins handle imbalance better', explanation: 'Hinge has no imbalance mechanism at all, and it throws away the calibrated probabilities a fraud system needs for expected-cost decisions.' },
        {
          text: 'None yet — class weights and a moved decision threshold, keeping cross-entropy',
          explanation: 'Correct. One keyword argument, no new hyperparameter, nothing invented or discarded, and the threshold sweep often turns out to be the whole fix. Change the loss only when that is not enough.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Why can an SVM not hand you a probability, while logistic regression can?',
      options: [
        { text: 'SVMs are not trained by gradient descent, so probabilities never appear', explanation: 'The optimiser is irrelevant. It is the objective that determines whether the output has probabilistic meaning.' },
        {
          text: 'Hinge only requires y·f(x) ≥ 1; the objective assigns no meaning to the score beyond that, so it is not a likelihood',
          explanation: 'Correct. Cross-entropy is a negative log-likelihood, so its minimiser IS a probability estimate. Hinge optimises a margin, so SVM scores need Platt scaling to be interpreted as probabilities at all.',
        },
        { text: 'SVM outputs are unbounded, and probabilities must lie in [0,1]', explanation: 'Close but shallow — a sigmoid would bound them instantly. The point is that squashing a margin score produces a number with no calibration guarantee behind it.' },
      ],
      correct: 1,
    },
    {
      question: 'A building uses face recognition at the door. Why train it with triplet loss instead of a softmax over employees?',
      options: [
        {
          text: 'Because the label set is open — new employees keep arriving with 1–2 photos each. Triplet loss learns an embedding, so enrolling someone is one forward pass and one database row',
          explanation: 'Correct. Softmax needs a fixed K and a new output unit plus a full retrain per hire. The embedding never changes: verification is a threshold on a distance, recognition is nearest neighbour in the embedding bank.',
        },
        {
          text: 'Because softmax cannot handle more than a few hundred classes',
          explanation: 'It handles far more — every language model runs a softmax over a 50k-token vocabulary at each step. The blocker is not the class count, it is that the class set keeps changing.',
        },
        {
          text: 'Because triplet loss gives better-calibrated probabilities than softmax',
          explanation: 'Backwards. Triplet loss outputs a distance, not a probability at all — losing calibration is the price you pay. Cross-entropy is the calibrated one.',
        },
        {
          text: 'Because every triplet contributes gradient, so training converges faster',
          explanation: 'The exact opposite is its main weakness: most randomly sampled triplets already satisfy the margin and contribute exactly zero gradient. That is why semi-hard or batch-hard mining is mandatory, not optional.',
        },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Derive binary cross-entropy from first principles, out loud.',
      answer:
        'For one row the model claims probability p that y = 1. The probability of what actually happened is p if y = 1 and (1−p) if y = 0, which compresses to p^y(1−p)^(1−y) — check both cases, one factor always collapses to 1. Rows are independent, so the dataset likelihood is the product over i. A product of thousands of sub-1 numbers underflows, and products are awkward to differentiate, so take the log: it becomes Σ[y log p + (1−y) log(1−p)], and log is monotonic so the maximiser does not move. Optimisers minimise, so negate and divide by N. That is binary cross-entropy — nothing was designed, it fell out. Close with the payoff: minimising cross-entropy IS maximum likelihood, which is why its outputs are calibrated probabilities and not just scores. Bonus framing that scores: choosing a loss is choosing a noise model — Bernoulli gives you cross-entropy, Gaussian gives you MSE.',
      isCaseBased: false,
    },
    {
      question: 'Why cross-entropy and not MSE for classification? Give me the gradient argument.',
      answer:
        'MSE through a sigmoid has gradient (p̂ − y)·σ′(z)·x, and σ′(z) = p̂(1 − p̂) collapses to ~0 at both tails. So when the model is confidently wrong — large |z| on the wrong side — the update is nearly zero, exactly when it should be largest. Concretely at z = −6 with true label 1 the cross-entropy gradient is 0.998 while MSE gives 0.0025, about 400× weaker. Cross-entropy is built so σ′ cancels in the chain rule, leaving (p̂ − y)·x with no throttle. Second reason: MSE composed with a sigmoid is non-convex in the weights, so descent can park in a local minimum, while cross-entropy with a sigmoid is convex. Third, the framing reason: MSE assumes Gaussian noise around a real-valued target, which is a false statement about a 0/1 label — the Bernoulli assumption is the honest one, and it hands you cross-entropy automatically.',
      isCaseBased: false,
    },
    {
      question: 'Explain focal loss and tell me when you would use it instead of class weights or resampling.',
      answer:
        'Focal loss is cross-entropy scaled by (1 − p_t)^γ, plus an optional class-balancing α. The multiplier is near-zero for well-classified rows — at γ = 2 and p_t = 0.99 it is 0.0001 — and near-one for hard ones, so it is a soft, continuous hard-example miner that needs no sampling and discards no data. It came from RetinaNet, where a one-stage detector scores ~100k anchors per image against ~20 objects and the trivially-easy background dominates the gradient. The distinction that matters: class weights split rows by LABEL, focal splits them by DIFFICULTY. Use focal when the imbalance is easy-vs-hard and the easy side is enormous — dense detection, semantic segmentation, in-batch-negative retrieval, ad-click at web scale. Use class weights and threshold moving for ordinary tabular imbalance: one keyword, no extra hyperparameter, calibration intact. Two costs to name: focal decalibrates probabilities, and because a mislabelled row is indistinguishable from a hard row, focal amplifies label noise — so never use it on noisy labels.',
      isCaseBased: false,
    },
    {
      question: 'Case: your single-stage object detector trains to a low loss but predicts background almost everywhere. mAP is near zero. Diagnose and fix.',
      answer:
        'Classic easy-negative domination. Each image has ~100k anchors and maybe 20 positives, so 99.98% of the loss terms are trivially-classified background. Each contributes almost nothing individually — around 0.01 of cross-entropy — but 100k × 0.01 dwarfs 20 hard positives at ~2.3 each, so the model minimises total loss by perfecting background. The falling loss is real; it is just measuring the wrong thing. First diagnostic: split the loss into a positive-anchor component and a negative-anchor component and log both — if the negative component is 90%+ of the total, that is your answer. Fixes in order: (1) focal loss with γ = 2, α = 0.25, which reweights by difficulty and was designed for exactly this; (2) hard-negative mining or a fixed 3:1 negative:positive sampling ratio, the older OHEM-style approach — cruder because the cutoff is a hard threshold rather than a smooth weight; (3) check the anchor design itself, since bad IoU assignment thresholds can leave true objects labelled as background, which no loss can fix. Also verify the classification bias is initialised so the model starts predicting the prior foreground rate — RetinaNet does this deliberately, and skipping it makes early training diverge.',
      isCaseBased: true,
    },
    {
      question: 'Case: a shipped classifier is 94% accurate, but every prediction comes back at 0.999 confidence, including the wrong ones. Product wants to show users a confidence number. What is happening and what do you do?',
      answer:
        'The model is accurate but badly calibrated — its confidences carry no information. Cause: hard 1/0 targets under cross-entropy have their optimum at infinite logits, so a network trained long enough with enough capacity keeps inflating logit magnitude to chase a loss floor it can never reach, especially once training accuracy hits 100% and the only remaining way to reduce loss is more confidence. Measure it before fixing it: reliability diagram plus Expected Calibration Error, bucketing predictions by confidence and comparing each bucket to its actual accuracy. Fixes in cost order: (1) temperature scaling — fit a single scalar T on a validation set and divide the logits by it; it cannot change accuracy at all because it preserves the argmax, so it is a free win and should be the first thing tried; (2) label smoothing at ε = 0.1 in the next training run, which gives the loss a finite minimum at a finite logit and improves calibration by construction; (3) earlier stopping, since calibration degrades over the long tail of training after accuracy plateaus. Cost to state out loud: label smoothing compresses confidence separation, so if anything downstream consumes the score margin — distillation, score-based ranking — prefer temperature scaling, which leaves the ordering untouched.',
      isCaseBased: true,
    },
    {
      question: 'Cross-entropy versus hinge loss — when would you actually choose hinge?',
      answer:
        'Hinge, max(0, 1 − y·f(x)), is zero once a point is correct AND a full margin clear, so satisfied points contribute no loss and no gradient. That gives sparsity — only support vectors define the model — a genuinely compact predictor, and linear rather than logarithmic growth on extreme errors, so it is more robust to a single catastrophic outlier. Choose it when the margin is the product and the model must stay small: a classic SVM on small-to-mid tabular data, or SGDClassifier(loss="hinge") on very wide sparse text features where it is fast and strong. Refuse it when you need probabilities. Hinge is not a likelihood, so its score has no calibrated meaning; you would need Platt scaling on top, which is a second model fitted to patch the first. Any expected-cost decision — "flag if P(fraud) × 8000 > 50" — needs a real probability, so cross-entropy wins by default. Also mention the kink: hinge is non-differentiable at the margin, which is why SVMs are solved by quadratic programming; squared hinge smooths that at the cost of punishing outliers quadratically and losing the robustness you came for.',
      isCaseBased: false,
    },
    {
      question: 'Why does cross-entropy dominate deep learning so completely?',
      answer:
        'Four reasons, in order of weight. (1) Gradient flow: ∂L/∂z = p̂ − y with no saturating factor, so signal survives through very deep stacks; hinge contributes exactly zero from every satisfied point, which late in training means most of the batch sends no signal at all. (2) Probabilities compose — they can be thresholded, multiplied, fed into an expected-cost decision, distilled into another model, or used as soft targets; a margin score cannot do any of that. (3) It generalises to K classes in one line via softmax, whereas multi-class hinge needs an awkward one-vs-rest or Crammer-Singer construction. (4) Sparsity, hinge\'s headline benefit, is worthless when you are training 100M dense parameters that all update anyway. Worth adding: the entire language-model objective is categorical cross-entropy over the vocabulary, and perplexity is just its exponential — so cross-entropy is not merely dominant, it is the thing being reported.',
      isCaseBased: false,
    },
    {
      question: 'What exactly do γ and α do in focal loss, and why is RetinaNet\'s α = 0.25 counter-intuitive?',
      answer:
        'γ is the focusing parameter: it exponentiates (1 − p_t), down-weighting by how EASY an example is, independent of its class. γ = 0 recovers plain cross-entropy; γ = 2 is the standard; pushing γ much past 5 starves the model because even moderately hard examples get crushed toward zero weight. α is the balancing parameter: a per-class constant, functionally identical to class_weight="balanced" — it down-weights by WHICH CLASS an example is. The counter-intuitive part is that α = 0.25 is applied to the rare foreground class, i.e. the minority gets weight 0.25 and the abundant background gets 0.75, the reverse of what class balancing normally does. The reason is interaction: γ has already suppressed the easy background so aggressively that the surviving loss is dominated by foreground, and the usual minority boost would overcorrect into unstable training. The lesson to state: γ and α are not independent knobs, so tune γ first and α second, and never copy α from a paper whose γ you did not also copy.',
      isCaseBased: false,
    },
    {
      question: 'Case: two teams solve the same rare-event problem. Team A ships focal loss with tuned γ and α; team B ships plain cross-entropy with class weights and a threshold chosen from the PR curve. Both report the same PR-AUC. Which do you ship?',
      answer:
        'Team B, unless there is a specific reason otherwise — and the reasoning is what is being tested, not the answer. Equal PR-AUC means equal ranking quality, so focal bought nothing on the metric that measures the model. What differs is everything else: B has two fewer hyperparameters to maintain and re-tune after each retrain, keeps calibrated probabilities so the threshold can be derived from real costs rather than searched, and its threshold can be moved in production without retraining when the review-team capacity or the fraud rate changes. Focal also decalibrates, so any downstream expected-cost logic would need a separate recalibration step. Questions I would ask before finalising: is the imbalance easy-vs-hard or just label imbalance — if the negatives are millions of trivially-separable rows, focal may win at larger scale even if it ties here; are the labels noisy, in which case focal is actively dangerous since it amplifies mislabelled rows; and is the PR-AUC difference inside fold-to-fold variance, because on rare classes that variance is usually larger than the gap between two models. Principle: prefer the model with fewer knobs and a movable operating point when the measured quality is equal.',
      isCaseBased: true,
    },
    {
      question: 'What does "minimising cross-entropy equals maximising likelihood" actually buy you in practice?',
      answer:
        'Three concrete things. (1) Calibration for free: because the optimum of the objective is the true conditional probability, an unregularised well-specified model\'s 0.7 really does mean about 70% — which is why logistic regression is still shipped where probabilities matter and why a random forest needs Platt or isotonic calibration bolted on. (2) A principled way to choose losses: the loss is determined by the noise model, so Bernoulli labels give cross-entropy, Gaussian noise gives MSE, count data gives Poisson deviance. "Why this loss?" becomes "what distribution did I assume?", which is a much stronger interview answer than a preference. (3) A clean route to regularisation: switching from MLE to MAP adds log p(θ), and a Gaussian prior on the weights becomes exactly the L2 penalty while a Laplace prior becomes L1 — so weight decay is a statement of prior belief, not a hack. Practical caveat worth naming: class weights, focal loss, and resampling all break the likelihood interpretation, so any of them costs you calibration and you should recalibrate afterwards if probabilities are consumed downstream.',
      isCaseBased: false,
    },
    {
      question: 'A junior hands you a model whose training loss starts at 40 and drops to 8 over ten epochs on a 10-class problem. What do you say?',
      answer:
        'Both numbers are wrong and the second is the worse one. A randomly-initialised 10-class classifier should start at ln(10) = 2.303, because a uniform prediction gives −log(1/10). Starting at 40 means the model begins wildly confident about the wrong classes — check initialisation scale, check for a missing normalisation on inputs, and check for a double-softmax (softmax in forward() plus CrossEntropyLoss, which applies its own log-softmax). And 8 is still far above the random-guess baseline of 2.303, so after ten epochs the model is worse than predicting uniformly — this is not slow convergence, it is a broken pipeline. Fastest triage: overfit a single batch of ten examples deliberately; a correct setup will drive that loss to near zero within a few hundred steps, and if it cannot, the bug is in the model or loss wiring rather than in the data or learning rate. The general habit to state: always know your loss\'s random baseline — ln(K) for K-class cross-entropy, 0.693 for binary — because it makes broken training visible in the first printed line.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'p_t in one line', back: 'The probability the model gave the TRUE label: p if y=1, 1−p if y=0. Every loss here is a re-weighting of −log(p_t).' },
    { front: 'BCE derivation in three moves', back: 'Likelihood p^y(1−p)^(1−y) → multiply over rows → log (product becomes sum, no underflow) → negate. Minimising CE = maximising likelihood.' },
    { front: 'The −log penalty numbers', back: 'p_t = 0.9 → 0.105 · 0.5 → 0.693 · 0.1 → 2.303 · 0.01 → 4.605. Gentle when right, unbounded when confidently wrong.' },
    { front: 'Categorical CE with one-hot labels', back: '−Σ y_k log p̂_k collapses to −log(p̂ of the true class). Other classes still compete via softmax\'s denominator.' },
    { front: 'Random-guess loss baseline', back: 'ln(K): 0.693 for binary, 2.303 for 10 classes, 6.908 for 1000. If training starts far from it, the pipeline is broken.' },
    { front: 'Why logits, not probabilities, into the loss', back: 'exp(large logit) = inf, inf/inf = nan. log-sum-exp subtracts the max — exact, stable. Also prevents the double-softmax bug.' },
    { front: 'Label smoothing: gain and cost', back: 'Target = (1−ε)y + ε/K instead of a hard 1/0 — binary at ε = 0.2 gives 0.9/0.1. Gain: finite optimal logit, better calibration, noise tolerance. Cost: compressed confidence separation (hurts distillation and score-based ranking).' },
    { front: 'Focal loss formula and defaults', back: 'FL = −α_t(1−p_t)^γ log(p_t). γ = 2, α = 0.25 (RetinaNet). γ = 0 is plain cross-entropy.' },
    { front: 'γ vs α in focal', back: 'γ down-weights by how EASY (any class); α down-weights by WHICH CLASS (a plain class weight). Tune γ first — α depends on it.' },
    { front: 'Hinge in one sentence', back: 'max(0, 1 − y·f(x)), y ∈ {−1,+1}. Exactly zero once correct AND past the margin → zero gradient → support-vector sparsity, but no calibrated probability.' },
    { front: 'Contrastive vs triplet loss', back: 'Contrastive scores a PAIR with label y: y·d² + (1−y)·max(0, m−d)² — absolute demands (same at distance 0, different at least m apart). Triplet scores (anchor, positive, negative): max(0, d(a,p) − d(a,n) + m) — purely RELATIVE, it only asks that the positive be closer than the negative by m. Both hit exactly zero once satisfied.' },
    { front: 'Why triplet mining matters', back: 'Random triplets almost all already satisfy the margin → zero loss, zero gradient, training stalls at a pretty-looking number. The hardest negatives are usually label noise or twins and collapse the embedding to a point. FaceNet uses semi-hard: d(a,p) < d(a,n) < d(a,p)+m. Batch-hard mines inside a P×K batch from its distance matrix.' },
  ],
  mindmapMarkdown: `- Classification Losses: Cross-Entropy, Focal & Hinge
  - Binary cross-entropy
    - p_t = probability given to the true label
    - Likelihood p^y(1−p)^(1−y)
    - Multiply → log → negate
    - Minimise CE = maximise likelihood (MLE)
    - Choosing a loss = choosing a noise model
  - The penalty shape
    - 0.9→0.105, 0.5→0.693, 0.1→2.303, 0.01→4.605
    - Confident-and-wrong is the expensive quadrant
    - Unbounded → not robust to label noise
  - Multi-class
    - Softmax turns K logits into a distribution
    - One-hot: only the true class term survives
    - Classes compete via the denominator
    - Random baseline = ln(K)
  - Numerical stability
    - exp(1000) = inf → nan
    - log-sum-exp: subtract the max
    - Pass logits, never probabilities
    - Double-softmax bug
  - Label smoothing
    - Targets 0.9 / 0.1 instead of 1 / 0
    - Hard targets need infinite logits
    - Better calibration + noise tolerance
    - Cost: compressed confidence separation
  - Focal loss
    - CE × (1 − p_t)^γ
    - γ = focusing (how easy), α = class balance
    - RetinaNet γ=2, α=0.25
    - Easy rows: 81% of BCE → 2.1% of focal
    - Use when negatives are huge and trivial
    - Never on noisy labels; decalibrates
  - Hinge loss
    - max(0, 1 − y·f(x)), y = ±1
    - Zero only past the margin
    - Zero gradient → support vectors → sparse
    - Score, not a probability (needs Platt)
    - Squared hinge: smooth, outlier-sensitive
  - Cross-entropy vs hinge
    - Probabilities vs margins
    - CE never zero, hinge exactly zero
    - CE unbounded, hinge linear (robust)
    - CE wins deep learning: gradient flow, softmax, composability
  - Metric learning: same or different?
    - Open label set → softmax cannot grow
    - Learn an embedding: distance = dissimilarity
    - Contrastive: y·d² + (1−y)·max(0, m−d)²
    - Push different pairs only until d ≥ m
    - Triplet: max(0, d(a,p) − d(a,n) + m)
    - Relative demand, never an absolute distance
    - FaceNet: 128-d unit vector, m = 0.2
    - Verify = threshold; recognise = nearest neighbour
    - New employee = one forward pass + one DB row
    - Mining: random triplets give zero gradient
    - Hardest negatives = label noise → collapse
    - Semi-hard (FaceNet), batch-hard / online
    - Replaced by ArcFace/CosFace and InfoNCE
  - Why not MSE
    - σ′(z) factor kills the gradient when confidently wrong
    - Non-convex through a sigmoid
    - Full derivation in the logistic-regression module
  - Picking one
    - Need probabilities → cross-entropy
    - Easy/hard imbalance → focal
    - Label imbalance, tabular → class weights + threshold
    - Noisy labels → label smoothing
    - Compact margin model → hinge`,
}

export default m
