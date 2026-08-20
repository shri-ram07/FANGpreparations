import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l0-loss-vs-metric',
  subjectId: 'metrics',
  level: 0,
  title: 'Loss vs Metric: The Distinction That Exposes Candidates',
  whyItMatters:
    '"Why not just optimize accuracy directly?" is the cheapest trap in an ML interview, and most candidates walk into it. The answer needs one fact — accuracy has no usable gradient — and one framing: the model optimizes a loss, humans judge a metric, and the business counts money. Get this module right and you stop confusing "training went well" with "the thing works".',
  estMinutes: 40,
  sections: [
    {
      type: 'intuition',
      title: 'Two numbers with two different jobs',
      md: `A student studies for an exam. During the week she tracks *practice questions wrong per hour*. The university reports a *grade*. Both measure the same student. Only one is usable minute to minute.

- **Loss** — what the model optimizes. Computed every batch. It exists for one purpose: to produce a gradient.
- **Metric** — how humans judge the result. Computed every epoch or at eval time. It exists for one purpose: to make a decision.
- The loss is written for the optimizer. The metric is written for the meeting.
- Nothing forces them to be the same number, and in most real systems they are not.
- A loss must be differentiable. A metric can be anything you can count — including things nobody knows how to differentiate.`,
    },
    {
      type: 'intuition',
      title: 'MSE is both. Accuracy is only ever one.',
      md: `Sometimes one quantity plays both roles, and that coincidence hides the distinction from beginners.

- **MSE** in a regression: you descend it during training *and* you report it to a stakeholder. Same number, both jobs.
- **Cross-entropy**: mostly a loss. You would never show it to a product manager — "our log-loss is 0.34" means nothing to anyone.
- **Accuracy, precision, recall, F1, PR-AUC, NDCG, BLEU, IoU**: metrics only. You cannot descend a single one of them.
- The reason is always the same: they are built from *counting* — how many rows landed in a bucket — and counting is a step function.
- So: loss ⊆ differentiable functions. Metric ⊆ anything computable. The overlap is real but small.`,
    },
    {
      type: 'intuition',
      title: 'Why the loss has to be differentiable',
      md: `Gradient descent has exactly one sense organ: the slope under its feet. Take the slope away and it is blind.

- Accuracy asks "was this row right?" — a yes/no. Nudge a weight by 0.0001 and the answer almost never flips.
- So accuracy stays *exactly* flat: slope 0. No slope, no direction, no step. Training stops before it starts.
- Then at one precise weight value a row does flip, and accuracy jumps by 1/N in zero distance — the slope there is infinite, i.e. undefined.
- The formal phrase: the gradient of accuracy is **zero almost everywhere and undefined at the jumps**. Both halves are useless.
- Cross-entropy instead asks "how confident were you, and were you right to be?" — a continuous question with a continuous answer, so it always has a slope.
- Every interviewer who asks "why not just optimize accuracy?" is waiting for you to reject the premise with this argument. Do not hedge.`,
    },
    {
      type: 'math',
      intro: 'Accuracy written honestly: an indicator function, whose derivative is the problem.',
      latex: [
        '\\text{Accuracy}(w) = \\frac{1}{N}\\sum_{i=1}^{N} \\mathbf{1}\\big[\\, \\mathbf{1}[\\,\\hat{p}_i(w) > 0.5\\,] = y_i \\,\\big]',
        '\\frac{\\partial}{\\partial z}\\,\\mathbf{1}[\\,z > 0\\,] = 0 \\;\\; \\text{for all } z \\neq 0, \\qquad \\text{undefined at } z = 0',
        '\\text{BCE}(w) = -\\frac{1}{N}\\sum_{i=1}^{N}\\Big[\\, y_i \\log \\hat{p}_i + (1 - y_i)\\log(1 - \\hat{p}_i) \\,\\Big], \\qquad \\frac{\\partial\\,\\text{BCE}}{\\partial z_i} = \\frac{\\hat{p}_i - y_i}{N}',
        '\\text{One derivative is a wall of zeros. The other is } (\\text{prediction} - \\text{truth}), \\text{ which is exactly the correction to make.}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Watch accuracy have no gradient while cross-entropy has plenty',
      code: `import numpy as np

rng = np.random.default_rng(0)
x = rng.normal(size=40)
y = (x + 0.5 * rng.normal(size=40) > 0).astype(float)

def eval_at(b):                                  # one model, one knob: the bias b
    p = 1 / (1 + np.exp(-(2.0 * x + b)))
    ce = -(y * np.log(p) + (1 - y) * np.log(1 - p)).mean()
    return ce, ((p > 0.5) == y).mean()

h = 1e-4
print('   b     accuracy  d(acc)/db     CE      d(CE)/db')
for b in np.arange(-0.40, 0.41, 0.10):
    ce, acc = eval_at(b)
    dacc = (eval_at(b + h)[1] - eval_at(b - h)[1]) / (2 * h)
    dce = (eval_at(b + h)[0] - eval_at(b - h)[0]) / (2 * h)
    print('%+5.2f     %.3f    %8.1f    %.4f   %+8.4f' % (b, acc, dacc, ce, dce))

b_flip = -2.0 * x[np.argmin(np.abs(x))]          # the b where one point crosses 0.5
print('\\nat a flip point b=%+.4f:  acc(b-1e-6)=%.3f  acc(b+1e-6)=%.3f  slope=%.0f'
      % (b_flip, eval_at(b_flip - 1e-6)[1], eval_at(b_flip + 1e-6)[1],
         (eval_at(b_flip + 1e-6)[1] - eval_at(b_flip - 1e-6)[1]) / 2e-6))

# ---- real output ----
#    b     accuracy  d(acc)/db     CE      d(CE)/db
# -0.40     0.675         0.0    0.5860    -0.1390
# -0.30     0.675         0.0    0.5730    -0.1221
# -0.20     0.675         0.0    0.5616    -0.1050
# -0.10     0.650         0.0    0.5520    -0.0877
# -0.00     0.625         0.0    0.5441    -0.0704
# +0.10     0.625         0.0    0.5379    -0.0530
# +0.20     0.625         0.0    0.5335    -0.0356
# +0.30     0.650         0.0    0.5308    -0.0181
# +0.40     0.675         0.0    0.5298    -0.0007
#
# at a flip point b=-0.0827:  acc(b-1e-6)=0.650  acc(b+1e-6)=0.625  slope=-12500`,
      annotations: {
        8: 'One model, one tunable number. Sliding b left/right is the same as sliding the decision threshold — the cleanest way to perturb a classifier.',
        10: 'Two numbers out of the SAME probabilities: a smooth average of logs, and a hard 0/1 count. Everything that follows comes from that difference.',
        16: 'Central difference — the numerical gradient of accuracy. Read the column it prints: 0.0, nine times out of nine.',
        30: 'Accuracy DID move here, 0.675 -> 0.650. It stepped between two sampled points, and at both of them the measured slope was still exactly 0.0. That is what "zero almost everywhere" looks like.',
        37: 'Straddle a flip point by one millionth and the slope reads -12,500. Halve the step and it doubles. It is not a gradient, it is a cliff — an optimizer cannot use either the zeros or this.',
      },
    },
    {
      type: 'note',
      md: `Read the two derivative columns side by side. \`d(acc)/db\` is 0.0 on every single row, so gradient descent on accuracy would take a step of size zero forever — the model never leaves its initialization. \`d(CE)/db\` starts at −0.139, shrinks steadily, and crosses zero near b = +0.40: that is a usable signal telling the optimizer both *which way* and *how far*. And notice accuracy is not even monotone — 0.675 → 0.625 → 0.675 — while CE falls the whole way. The two numbers do not have to agree, and they do not.`,
    },
    {
      type: 'intuition',
      title: 'The surrogate: chase the metric with something you can descend',
      md: `You cannot descend the metric you care about. So descend a stand-in that moves with it. That stand-in is a **surrogate loss**.

- **Cross-entropy is the surrogate for accuracy.** Pushing probabilities toward the correct label eventually flips labels the right way — smoothly, with a gradient the whole time.
- **Hinge loss is the surrogate for margin/accuracy** in SVMs: zero penalty once a point is correct by a comfortable margin, linear penalty before that.
- **Soft-F1**: replace the hard counts TP/FP/FN with probability sums, and F1 becomes differentiable. One line, and you can optimize (almost) the metric itself.
- **Focal loss**: cross-entropy tilted to spend gradient on hard examples — a surrogate designed for a PR-AUC-shaped goal under heavy imbalance.
- A surrogate is a bet: *"if this goes down, the thing I actually care about goes up."* The bet is usually good. It is never guaranteed.`,
    },
    {
      type: 'math',
      intro: 'Two surrogates, written out. Note that both are differentiable where it matters.',
      latex: [
        '\\mathcal{L}_{\\text{hinge}} = \\frac{1}{N}\\sum_{i=1}^{N} \\max\\!\\big(0,\\; 1 - y_i\\, f(x_i)\\big), \\qquad y_i \\in \\{-1, +1\\}',
        'TP_{\\text{soft}} = \\sum_i y_i \\hat{p}_i, \\quad FP_{\\text{soft}} = \\sum_i (1 - y_i)\\hat{p}_i, \\quad FN_{\\text{soft}} = \\sum_i y_i (1 - \\hat{p}_i)',
        '\\mathcal{L}_{\\text{soft-}F_1} = 1 - \\frac{2\\,TP_{\\text{soft}}}{2\\,TP_{\\text{soft}} + FP_{\\text{soft}} + FN_{\\text{soft}}}',
        '\\text{Swap } \\mathbf{1}[\\hat{p} > t] \\text{ for } \\hat{p} \\text{ and the counting disappears — that single swap is the whole trick.}',
      ],
    },
    {
      type: 'note',
      md: `A nuance that separates seniors: "differentiable" is stricter than reality requires. Hinge loss has a kink at the margin, MAE has one at zero, ReLU has one at the origin — all three train fine, because a single non-differentiable point is handled by a **subgradient** (pick any slope in the corner; frameworks pick one and move on). What actually kills you is not the kink, it is the *flatness*: a function that is piecewise constant gives zero gradient over whole regions, so there is no direction to pick anywhere. Kinks are survivable. Plateaus are fatal.`,
    },
    {
      type: 'intuition',
      title: 'The alignment problem: when the surrogate stops tracking the metric',
      md: `A model that trains beautifully and fails the business is not rare. It is the default outcome when nobody checks the alignment.

- Cross-entropy keeps rewarding *confidence*. A model can push a correct prediction from 0.7 to 0.99 — big loss win, zero change to accuracy, ranking, or any decision.
- Class weighting, label smoothing, and focal loss all change the loss and often barely move the ranking metric — the loss curve looks like progress that never arrives.
- The loss runs on the training distribution; the metric runs on held-out data. The gap between them has a name: **overfitting**.
- Loss is an average over rows. Business value is usually concentrated in a *few* rows — the top 20 search results, the 0.1% of transactions that are fraud. Averages hide that.
- Practical rule, and this is the whole module in one sentence: **pick the metric FIRST from the decision it drives, then choose the loss that best chases it.**`,
    },
    {
      type: 'note',
      md: `Concretely, "pick the metric first" means starting from a sentence like *"we will block a transaction when the model flags it, and our review team can handle 200 cases a day"*. That sentence forces the metric — precision at 200 alerts per day — and only then do you shop for a loss: weighted cross-entropy or focal loss, because the plain one will spend all its gradient on the 99.9% of easy negatives. Doing this in the other order is how teams end up with a beautiful loss curve and a product nobody can use.`,
    },
    {
      type: 'intuition',
      title: 'The measurement stack: batch, epoch, quarter',
      md: `Three layers, three clocks, three audiences. Every ML failure worth debugging is a mismatch between two adjacent layers.

- **Loss** — per batch. Model-facing. Units: nats, arbitrary. Consumed by the optimizer, never by a human.
- **Metric** — per epoch or per eval run. Human-facing. Units: fractions, counts, ranks. Consumed by you, in a review.
- **Business KPI** — per week or quarter. Money-facing. Units: rupees, retention, cost per case. Consumed by whoever pays for the GPUs.
- Downward, information flows as gradients. Upward, it flows as *hope* — nothing guarantees the layer above moved.
- Debugging rule: name which arrow broke. Loss fell but metric flat? Surrogate misalignment. Metric up but KPI flat? Your metric measures the wrong decision.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'The measurement stack, one step at a time',
        notice: 'Follow which arrow carries a gradient. Only the first two frames have one — everything above the epoch boundary is a one-way street.',
        leftLabel: 'what runs',
        rightLabel: 'what it produces',
        frames: [
          {
            note: 'Batch 1 of 300. 256 rows go in, 256 probabilities come out, and cross-entropy crushes them into ONE number the optimizer can hold.',
            stack: [
              { name: 'batch', value: '256 rows' },
              { name: 'model(x)', value: 'p = 0.02 ... 0.91' },
              { name: 'loss = BCE(p, y)', to: 'L' },
            ],
            heap: [{ id: 'L', value: '0.6931', label: 'per batch' }],
          },
          {
            note: 'BCE is differentiable, so it has a slope for every weight. Gradients flow backward, the optimizer steps. This is the ONLY signal the model ever feels.',
            stack: [
              { name: 'loss', to: 'L' },
              { name: 'dL/dw  (backprop)', to: 'G' },
              { name: 'w := w - a*dL/dw', to: 'W' },
            ],
            heap: [
              { id: 'L', value: '0.6931 -> 0.6605', label: 'per batch' },
              { id: 'G', value: 'gradient vector', label: 'differentiable' },
              { id: 'W', value: 'weights updated', label: 'model changed' },
            ],
          },
          {
            note: 'Epoch boundary. Now a HUMAN number: threshold the held-out probabilities, count TP/FP/FN, compute PR-AUC. Counting is not differentiable — there is no gradient to send back down.',
            stack: [
              { name: 'val probabilities', value: 'held-out set' },
              { name: 'metric = PR-AUC', to: 'M' },
              { name: 'dM/dw  (wanted)', to: 'X', danger: true },
            ],
            heap: [
              { id: 'M', value: 'PR-AUC 0.583', label: 'per epoch' },
              { id: 'X', value: 'no gradient exists', freed: true },
            ],
          },
          {
            note: 'Three layers, three clocks. The loss talks to the optimizer, the metric talks to you, the KPI talks to the person paying for the GPUs. Nothing carries information downward except the loss.',
            stack: [
              { name: 'loss (per batch)', to: 'L' },
              { name: 'metric (per epoch)', to: 'M' },
              { name: 'KPI (per quarter)', to: 'K' },
            ],
            heap: [
              { id: 'L', value: 'BCE 0.4213', label: 'model-facing' },
              { id: 'M', value: 'PR-AUC 0.583', label: 'human-facing' },
              { id: 'K', value: 'Rs 4.1 cr fraud stopped', label: 'money-facing' },
            ],
          },
          {
            note: 'Retrain. Loss falls 18% — the model got more confident on rows it already ordered correctly. PR-AUC reads only the ORDER, and the order did not change. Same alerts, same money. A real training win that bought nothing.',
            stack: [
              { name: 'loss (per batch)', to: 'L' },
              { name: 'metric (per epoch)', to: 'M', danger: true },
              { name: 'KPI (per quarter)', to: 'K', danger: true },
            ],
            heap: [
              { id: 'L', value: '0.4213 -> 0.3462  (-18%)', label: 'improved' },
              { id: 'M', value: 'PR-AUC 0.583 -> 0.583', freed: true },
              { id: 'K', value: 'Rs 4.1 cr -> Rs 4.1 cr', freed: true },
            ],
          },
        ],
      },
    },
    {
      type: 'note',
      md: `Frame 3 is the one to remember: the dashed red box is not a bug in the diagram, it is the point. There is no \`dM/dw\`. You cannot backpropagate from PR-AUC, from NDCG, from BLEU, or from "rupees saved". Everything above the epoch boundary is read-only to the optimizer — which is exactly why choosing a good surrogate is a *design decision*, not a detail.`,
    },
    {
      type: 'intuition',
      title: 'Worked example: fraud, in real numbers',
      md: `Eight held-out transactions, two of them fraud. Model A is retrained into model B. Here is exactly what each layer sees.

- Scores, highest first — **A**: 0.62 (legit), 0.60 (fraud), 0.35 (fraud), 0.30, 0.20, 0.12, 0.08, 0.05.
- **B**: 0.55 (legit), 0.52 (fraud), 0.34 (fraud), 0.10, 0.06, 0.04, 0.02, 0.01.
- **Loss** (cross-entropy): 0.4213 → 0.3462. An 18% improvement. Every training dashboard turns green.
- **Metric** (PR-AUC): 0.5833 → 0.5833. Identical, to four decimals.
- **KPI**: the review team works the top 3 scores a day. Both models hand over the same three rows and catch the same two frauds. Rupees saved: unchanged.
- The mechanism: B lowered its confidence on easy legitimate rows. Cross-entropy pays for that. PR-AUC reads only the *order*, and the order is untouched.`,
    },
    {
      type: 'math',
      intro: 'Why the loss moved and the metric did not — the two formulas literally look at different things.',
      latex: [
        '\\Delta\\text{BCE} = -\\tfrac{1}{8}\\sum_{i \\in \\text{legit}} \\big[\\log(1 - p^B_i) - \\log(1 - p^A_i)\\big] < 0 \\quad (0.4213 \\to 0.3462)',
        '\\text{PR-AUC depends on } \\text{rank}(p_1) < \\text{rank}(p_2) < \\ldots \\text{ only} \\;\\Longrightarrow\\; \\text{unchanged under any monotone squash}',
        '\\text{KPI} = C_{FN}\\cdot TP(t) - C_{FP}\\cdot FP(t), \\qquad C_{FN} = \\text{₹}8{,}000,\\; C_{FP} = \\text{₹}50',
        '\\text{Top-3 alerts: } TP = 2,\\; FP = 1 \\text{ for BOTH models} \\;\\Longrightarrow\\; \\text{₹}15{,}950 \\text{ either way.}',
      ],
    },
    {
      type: 'intuition',
      title: 'The vocabulary nobody defines for you',
      md: `Five words, used interchangeably in most papers and by most engineers. Here is the careful version, so textbooks stop confusing you.

- **Loss function** — the penalty for *one* example: ℓ(ŷ, y). Strictly, per-sample.
- **Cost function** — the loss averaged over a batch or the dataset. Andrew Ng draws this line; almost nobody else does.
- **Objective function** — whatever the optimizer actually works on. This is the biggest of the set: cost **plus regularization**, and it may be *maximized* (log-likelihood, reward) rather than minimized.
- **Error** — ambiguous by nature. "Test error" is a metric; "the error term" is (ŷ − y) inside a loss. Ask which one is meant.
- **Criterion** — PyTorch's name for the loss object: \`criterion = nn.CrossEntropyLoss()\`. A framework word, not a concept.
- Interview move: do not correct someone who says "cost" for "loss". Say which one *you* mean and keep going. Pedantry reads as insecurity; precision reads as senior.`,
    },
    {
      type: 'math',
      intro: 'The objective is strictly bigger than the loss — and the extra part never appears in any metric.',
      latex: [
        'J(\\theta) = \\underbrace{\\frac{1}{N}\\sum_{i=1}^{N} \\ell(\\hat{y}_i, y_i)}_{\\text{cost: the data-fit part}} \\;+\\; \\underbrace{\\lambda \\lVert \\theta \\rVert_2^2}_{\\text{regularizer: a prior on } \\theta}',
        '\\text{You report } \\text{metric}(\\hat{y}, y). \\text{ You never report } \\lambda \\lVert \\theta \\rVert_2^2 \\text{ — it is not about the predictions at all.}',
      ],
    },
    {
      type: 'note',
      md: `That regularization term is the cleanest proof that loss and metric are different species. \`λ‖θ‖²\` depends only on the weights — it does not look at a single prediction or label. Adding it makes the training objective go *up* while the validation metric goes up too, which is nonsense if you believe loss and metric are the same thing. Two practical consequences: (1) never compare a regularized training objective against an unregularized validation loss and call the gap "overfitting" — you are comparing different formulas; (2) weight decay in an optimizer is this term, applied without ever appearing in the printed loss. Many "my val loss is lower than my train loss" mysteries are exactly this.`,
    },
    {
      type: 'intuition',
      title: 'The sentences that end the question',
      md: `Keep these four. They cover roughly every phrasing of this question you will be asked.

- *"The loss is what the model optimizes; the metric is what we decide with. They are allowed to be different, and usually should be."*
- *"You cannot optimize accuracy directly — its gradient is zero almost everywhere and undefined at the flips. Cross-entropy is the differentiable surrogate we descend instead."*
- *"I pick the metric first, from the decision the model drives, then pick the loss that best chases that metric."*
- *"Loss down, metric flat means the surrogate stopped tracking. Metric up, KPI flat means the metric was measuring the wrong decision."*
- What is being tested is not vocabulary. It is whether you know that a green training curve is evidence of nothing on its own.`,
    },
  ],
  quiz: [
    {
      question: 'What is the single technical reason you cannot train a model by gradient descent on accuracy?',
      options: [
        { text: 'Accuracy is too slow to compute on large datasets', explanation: 'It is a comparison and a mean — one of the cheapest things you can compute. Cost is not the issue.' },
        {
          text: 'Its gradient is zero almost everywhere and undefined at the points where a prediction flips',
          explanation: 'Correct. Flat regions give the optimizer no direction, and the jumps give an infinite slope. Neither is usable, so a step of size zero is taken forever.',
        },
        { text: 'Accuracy is not a valid measure of model quality', explanation: 'It is a perfectly valid metric in balanced settings — it just cannot be a loss. Validity and differentiability are separate questions.' },
      ],
      correct: 1,
    },
    {
      question: 'Which quantity commonly serves as BOTH a loss and a reported metric?',
      options: [
        { text: 'F1 score', explanation: 'F1 is built from hard counts, so it is a metric only. Soft-F1 is a differentiable surrogate for it — a different formula.' },
        { text: 'NDCG', explanation: 'NDCG reads sorted positions. Sorting is a step function of the scores, so there is nothing to descend.' },
        {
          text: 'MSE in a regression problem',
          explanation: 'Correct. You descend it during training and quote it to stakeholders in the target units (after a square root). That coincidence is exactly what hides the loss/metric distinction from beginners.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Validation cross-entropy drops 18% after a retrain, but PR-AUC and the confusion matrix at every threshold are identical. What most likely happened?',
      options: [
        {
          text: 'The model became more confident on examples it already ranked correctly — the ordering never changed',
          explanation: 'Correct. Cross-entropy pays for confidence; PR-AUC and thresholded counts read only the ranking. A monotone squash of all scores lowers the loss and moves no ranking metric at all.',
        },
        { text: 'There is a bug — a lower loss must improve the metric', explanation: 'No: the loss is a surrogate, not the metric. Loss down with metric flat is normal and is precisely the alignment problem.' },
        { text: 'The validation set leaked into training', explanation: 'Leakage would inflate the metric, not leave it exactly unchanged while the loss moves.' },
      ],
      correct: 0,
    },
    {
      question: 'Hinge loss is not differentiable at the margin point, and MAE is not differentiable at zero. Why are both still usable as losses?',
      options: [
        { text: 'Frameworks silently replace them with smooth approximations', explanation: 'They do not. PyTorch computes the real hinge/L1 and returns a subgradient at the kink.' },
        { text: 'The non-differentiable point is never reached in floating point', explanation: 'It can be reached, and even if it were not, values arbitrarily close to it would still be a problem if kinks actually broke training.' },
        {
          text: 'A single kink has a subgradient — any slope in the corner works. The fatal property is flatness, not kinks',
          explanation: 'Correct. Piecewise-constant functions like accuracy give zero gradient over whole regions, so there is no direction anywhere. One corner in an otherwise sloped function is harmless.',
        },
      ],
      correct: 2,
    },
    {
      question: 'What is the correct order of operations when starting a new supervised project?',
      options: [
        { text: 'Choose the loss first — it determines what the model can learn', explanation: 'Backwards. The loss is a means, chosen to chase something. Choosing it first means you never decided what you were chasing.' },
        {
          text: 'Choose the metric first from the decision the model drives, then pick the loss that best chases it',
          explanation: 'Correct. The decision fixes the costs, the costs fix the metric, and only then does the loss get selected (plain CE, weighted CE, focal, soft-F1) as the best available surrogate.',
        },
        { text: 'Train with the default loss and pick a metric that makes the results look good', explanation: 'That is metric-shopping after the fact. It is common, it is dishonest, and interviewers probe for it.' },
      ],
      correct: 1,
    },
    {
      question: 'Your training objective includes λ‖θ‖². Why does this number never appear in any reported metric?',
      options: [
        {
          text: 'It depends only on the weights, not on predictions or labels — a metric measures predictions',
          explanation: 'Correct. The regularizer is a prior on the parameters. It shapes which model you get; it says nothing about how good that model\'s predictions are, so it cannot be part of a metric.',
        },
        { text: 'It is too small to matter', explanation: 'It is often a substantial fraction of the objective — that is the point of tuning λ. Size is irrelevant to whether it belongs in a metric.' },
        { text: 'Metrics are always computed before regularization is applied', explanation: 'There is no "before" — regularization is a term in the objective, and metrics simply use a different formula entirely.' },
      ],
      correct: 0,
    },
    {
      question: 'A model\'s offline metric improves from 0.71 to 0.78, but the quarterly business KPI does not move at all. What does this indicate?',
      options: [
        { text: 'The metric was computed incorrectly', explanation: 'Possible but it is the least interesting hypothesis, and it does not explain the general pattern.' },
        { text: 'The loss was misaligned with the metric', explanation: 'That mismatch would show up as loss down / metric flat. Here the metric DID move — the break is one layer higher.' },
        {
          text: 'The metric does not capture the decision that produces value — the metric-to-KPI link is broken',
          explanation: 'Correct. Classic causes: the improvement is in a region no user sees, capacity or latency caps the gain, the offline distribution differs from live traffic, or a feedback loop absorbs it. Fix the metric definition, not the model.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Which statement about "objective function" versus "loss function" is most precise?',
      options: [
        { text: 'They are exact synonyms in all usage', explanation: 'Loosely true in conversation, but it loses the one useful distinction: the objective can include terms that are not about the data at all.' },
        {
          text: 'The objective is what the optimizer works on — the averaged loss plus regularizers — and it may be maximized rather than minimized',
          explanation: 'Correct. Objective = cost + regularization; log-likelihood and RL reward are objectives that get maximized. The loss is strictly the data-fit penalty.',
        },
        { text: 'The objective is always the metric you report', explanation: 'Almost never — the objective is differentiable by construction, and reported metrics usually are not.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'What is the difference between a loss function and a metric?',
      answer:
        'A loss is what the model optimizes: computed per batch, it must be differentiable because its entire job is to produce gradients, and its units are arbitrary. A metric is how humans judge the result: computed per epoch or eval run, it can be non-differentiable because nothing backpropagates through it, and its job is to support a decision. The same quantity can be both (MSE in a regression), one can be exclusively a loss (cross-entropy — no stakeholder wants a log-loss number), and many are exclusively metrics (accuracy, F1, PR-AUC, NDCG, BLEU, IoU) because they are built from counting or sorting. The follow-up they want: since you cannot descend the metric, you descend a differentiable surrogate that correlates with it, and the correlation is an assumption you are responsible for checking.',
      isCaseBased: false,
    },
    {
      question: 'Why not just optimize accuracy directly with gradient descent?',
      answer:
        'Because accuracy is a sum of indicator functions. Perturb a weight infinitesimally and no prediction flips, so accuracy is exactly constant — gradient zero. At the precise weight where a prediction does flip, it jumps by 1/N over zero distance, so the derivative is undefined. Zero almost everywhere plus undefined at the jumps means every gradient step has size zero: the model never leaves its initialization. Cross-entropy replaces the yes/no question with "how confident, and were you right to be", which is continuous, so it always yields a slope. And its gradient at the logits is (p − y) — prediction minus truth, which is literally the correction to make. The interview is testing whether you can reject a plausible-sounding premise instead of trying to satisfy it.',
      isCaseBased: false,
    },
    {
      question: 'Case: a teammate reports "validation loss dropped 20% this week" and wants to ship. What do you ask, and what is your hypothesis before they answer?',
      answer:
        'Ask: what did the METRIC do, and what did the decision do? Hypothesis before hearing the answer: nothing changed downstream. Cross-entropy rewards confidence, so a model can compress its score distribution and win 20% of loss while every ranking and every thresholded count stays identical — I can construct that on paper (0.4213 → 0.3462 with PR-AUC 0.5833 → 0.5833). Other candidates for the same symptom: they changed regularization strength, so the objective is not comparable across runs; the loss is now weighted differently (class weights, label smoothing) and is not the same function it was last week; or they compared a train-time objective to a validation loss. Concrete asks: the confusion matrix at the deployed threshold, the ranking metric, and the count of decisions that would actually change. If zero decisions change, there is nothing to ship.',
      isCaseBased: true,
    },
    {
      question: 'Explain the surrogate-loss idea and give three examples with what each is chasing.',
      answer:
        'A surrogate is a differentiable stand-in for a metric you cannot descend, chosen so that lowering it tends to improve the metric. Cross-entropy chases accuracy: it is a convex upper bound on the 0-1 loss, so driving it down squeezes misclassifications. Hinge loss chases margin-based accuracy: zero penalty once a point is correct beyond the margin, linear before that — the SVM objective. Soft-F1 chases F1 directly: replace hard TP/FP/FN counts with sums of probabilities and the whole formula becomes differentiable. Focal loss chases PR-AUC-shaped goals under heavy imbalance by down-weighting easy examples so gradient is spent on hard ones. The tradeoff worth naming: surrogates that hug the metric more tightly (soft-F1) tend to be non-convex, higher-variance across batches, and sensitive to batch composition — plain cross-entropy is a looser but far better-behaved optimization problem, which is why it remains the default.',
      isCaseBased: false,
    },
    {
      question: 'Describe the loss → metric → business KPI stack and how each layer can drift from the next.',
      answer:
        'Loss: per batch, model-facing, exists to make gradients. Metric: per epoch, human-facing, exists to make a decision about the model. KPI: per week or quarter, money-facing, exists to justify the project. Information flows down as gradients and up only as hope. Loss-to-metric drift: the surrogate stops tracking (gains going into confidence not correctness), the loss is averaged over rows while value is concentrated in a few, or train and validation distributions differ — that gap is overfitting. Metric-to-KPI drift: the metric evaluates a static offline set while production has feedback loops, position bias, latency budgets, and capacity limits; the metric may score a region no user ever sees; or the KPI is moved by things the model does not touch. Debugging discipline: name which arrow broke before touching the model, because each break has a completely different fix — change the loss, change the metric definition, or change the product.',
      isCaseBased: false,
    },
    {
      question: 'Case: fraud detection. Cross-entropy loss, PR-AUC as the metric, rupees saved as the KPI. Offline PR-AUC rises from 0.58 to 0.66 and the money does not move. Debug it.',
      answer:
        'PR-AUC is threshold-free, so it says nothing about the operating point actually deployed — hypothesis one is that the gain is concentrated in a region of the curve the deployed threshold never touches (better precision at 90% recall when you operate at 20% recall). Check PR-AUC restricted to the operating region, or precision at the fixed alert budget. Hypothesis two: capacity. If the review team works 200 cases a day, the KPI is capped by that number regardless of the ranking; better ranking only helps if it changes WHICH 200 cases appear, so measure fraud caught in the top 200, not area under a whole curve. Hypothesis three: the cost model. Rupees saved is C_FN·TP − C_FP·FP; if the newly caught frauds are small-value ones, TP goes up and rupees do not. Hypothesis four: offline/online skew — a feature computed differently at serving, or an offline set enriched with fraud so precision estimates are inflated (precision is prevalence-dependent, recall is not). The senior move is to redefine the metric as "rupee-weighted recall at 200 alerts per day" so the metric and the KPI stop disagreeing.',
      isCaseBased: true,
    },
    {
      question: 'Objective, cost, loss, error, criterion — define each and say where the usage is genuinely sloppy.',
      answer:
        'Loss: the penalty on a single example, ℓ(ŷ, y). Cost: that loss averaged over a batch or dataset — a distinction Andrew Ng draws and almost nobody else maintains. Objective: whatever the optimizer operates on, which is cost plus regularization terms, and which may be maximized (log-likelihood, RL reward) rather than minimized — this is the largest of the set and the only one that includes terms not derived from the data. Error: genuinely ambiguous — "test error" is a metric, "the error term" is (ŷ − y) inside a loss; always ask which is meant. Criterion: PyTorch\'s API name for the loss object, a framework word rather than a concept. The honest summary: in practice these are used interchangeably, the only distinction that ever changes an answer is loss-versus-objective (because of the regularizer), and the right interview behaviour is to state which sense you mean rather than correcting the interviewer.',
      isCaseBased: false,
    },
    {
      question: 'Where does regularization live — in the loss, the objective, or the metric? Why does the answer matter practically?',
      answer:
        'In the objective, never in the metric. λ‖θ‖² is a function of the weights alone: it does not read a prediction or a label, so it cannot be part of any measure of prediction quality. Practical consequences worth naming: you cannot compare a regularized training objective against an unregularized validation loss and call the difference overfitting — they are different formulas; changing λ changes the objective\'s scale, so training curves across λ values are not comparable; and weight decay implemented inside an optimizer applies this term without it ever appearing in the printed loss, which is behind a lot of "my validation loss is lower than my training loss" confusion (dropout and BatchNorm train/eval modes are the other usual suspects). If you want a comparable number, log the unregularized data-fit term separately.',
      isCaseBased: false,
    },
    {
      question: 'When would you deliberately use a loss that is NOT the closest possible surrogate to your metric?',
      answer:
        'Often, because optimization behaviour matters more than metric proximity. Cross-entropy over soft-F1 when batches are small or imbalanced: soft-F1 is a ratio computed within a batch, so its value and gradient depend on how many positives that batch happened to contain — high variance, unstable training. Cross-entropy over a rank-based surrogate when you need calibrated probabilities downstream, since ranking losses are free to distort probabilities arbitrarily. MSE over MAE when you want smooth convergence and outliers are genuinely rare, even though MAE matches a "typical error" metric better. And plain cross-entropy plus threshold tuning over focal loss under imbalance — because moving the threshold is free, reversible, and requires no retraining. The general rule: the loss must be a good OPTIMIZATION problem first and a good proxy second, since a tight surrogate you cannot train is worth nothing.',
      isCaseBased: false,
    },
    {
      question: 'Case: a search-ranking team optimizes cross-entropy on click labels and reports offline NDCG@10 up 4%. In the A/B test, engagement is flat and revenue drops slightly. Walk through what could be wrong across the three layers.',
      answer:
        'Loss layer: click cross-entropy treats every impression equally, but NDCG cares overwhelmingly about the top positions — the loss spends most of its gradient on results nobody looks at, so an offline win can come from reordering ranks 30 to 50. Fix by weighting the loss by position or switching to a listwise/pairwise surrogate (LambdaRank exists precisely to inject NDCG\'s position weights into gradients). Metric layer: NDCG computed on logged clicks inherits position bias — the old ranker chose what was shown, so a model that reproduces the old ordering scores well while genuinely novel results have no labels at all; this needs propensity weighting or interleaving rather than an offline replay. KPI layer: clicks are not revenue. Optimizing clicks can promote clickbait, raising engagement proxies while lowering conversion or satisfaction, and there may be a latency cost that eats the gain. The framing to state: the loss chased the wrong part of the metric, the metric was measured on biased logs, and the metric itself was a proxy for a KPI it does not monotonically track — three separate breaks, three separate fixes.',
      isCaseBased: true,
    },
    {
      question: 'Can you ever get a gradient signal for a non-differentiable metric, or is the surrogate the only option?',
      answer:
        'Surrogates are the default, but there are three real alternatives worth naming. One: relaxation — replace the hard operation with a soft one (soft-F1 replaces counts with probability sums; soft/differentiable sorting approximates rank operations for NDCG). Two: score-function estimators — REINFORCE and friends give an unbiased gradient of the EXPECTED metric under a stochastic policy without differentiating the metric itself; this is how BLEU-style objectives get optimized in sequence models, at the cost of very high variance and the need for baselines. Three: black-box search — evolutionary strategies, Bayesian optimization, or simply tuning a threshold or a hyperparameter directly against the metric, which is what threshold sweeping already is. The practical answer in an interview: use a surrogate for the weights, and optimize the metric directly over the small number of decision parameters (thresholds, top-K cutoffs) where brute force is cheap.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Loss vs metric in one line', back: 'Loss = what the model optimizes (per batch, must be differentiable, makes gradients). Metric = how humans judge (per epoch, can be non-differentiable, makes decisions).' },
    { front: 'Why accuracy cannot be a loss', back: 'It is a sum of indicators: gradient is zero almost everywhere and undefined at the flips. Every step would have size zero.' },
    { front: 'Both loss and metric', back: 'MSE. Loss-only: cross-entropy. Metric-only: accuracy, F1, PR-AUC, NDCG, BLEU, IoU — all built from counting or sorting.' },
    { front: 'Surrogate loss', back: 'A differentiable stand-in for the metric you care about. CE for accuracy, hinge for margin, soft-F1 for F1, focal for imbalanced PR-AUC.' },
    { front: 'Soft-F1 in one move', back: 'Replace hard counts with probability sums: TP=Σy·p, FP=Σ(1−y)·p, FN=Σy·(1−p). Now F1 is differentiable.' },
    { front: 'Kinks vs plateaus', back: 'Kinks (hinge, MAE, ReLU) are fine — subgradients handle them. Flat regions are fatal: no direction anywhere. Accuracy is all plateau.' },
    { front: 'The measurement stack', back: 'Loss (per batch, model-facing) → metric (per epoch, human-facing) → KPI (per quarter, money-facing). Gradients flow down; nothing guarantees the layer above moves.' },
    { front: 'Loss down, metric flat', back: 'The surrogate stopped tracking — usually extra confidence on rows already ranked right. Real demo: BCE 0.4213→0.3462 (−18%) with PR-AUC 0.5833→0.5833.' },
    { front: 'The order of operations', back: 'Pick the metric FIRST from the decision it drives, then choose the loss that best chases it. Never the reverse.' },
    { front: 'Objective vs loss vs cost', back: 'Loss = per example. Cost = loss averaged. Objective = cost + regularizer, and may be maximized. Only the objective contains λ‖θ‖² — which never appears in a metric.' },
  ],
  mindmapMarkdown: `- Loss vs Metric: The Distinction That Exposes Candidates
  - The core distinction
    - Loss: model optimizes it, per batch
    - Metric: humans judge with it, per epoch
    - Loss makes gradients; metric makes decisions
    - Overlap: MSE is both
    - Metric-only: accuracy, F1, NDCG, BLEU, IoU
  - Why the loss must be differentiable
    - GD senses only the slope
    - Accuracy = sum of indicators
    - Gradient zero almost everywhere
    - Undefined at the flip points
    - Measured: d(acc)/db = 0.0, flip slope -12500
    - Kinks survivable (subgradient), plateaus fatal
  - Surrogates
    - Descend a stand-in that correlates
    - Cross-entropy for accuracy
    - Hinge for margin (SVM)
    - Soft-F1: swap counts for probabilities
    - Focal for imbalance
    - Surrogate = a bet, not a guarantee
  - The alignment problem
    - Confidence gains move loss, not ranking
    - Averaged loss vs value in a few rows
    - Train distribution vs held-out = overfitting
    - Rule: metric FIRST, then the loss
  - The measurement stack
    - loss / batch / model-facing
    - metric / epoch / human-facing
    - KPI / quarter / money-facing
    - Gradients flow down, hope flows up
    - Name which arrow broke
  - Worked fraud example
    - BCE 0.4213 -> 0.3462 (-18%)
    - PR-AUC 0.5833 -> 0.5833
    - Same top-3 alerts, same rupees
  - Vocabulary
    - loss = per example
    - cost = loss averaged
    - objective = cost + regularizer, may be maximized
    - error = ambiguous (metric or residual)
    - criterion = PyTorch's word
  - Regularization
    - Lives in the objective, never the metric
    - Depends on weights, not predictions
    - Breaks train-vs-val loss comparisons`,
}

export default m
