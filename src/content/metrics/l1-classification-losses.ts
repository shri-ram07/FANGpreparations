import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l1-classification-losses',
  subjectId: 'metrics',
  level: 1,
  title: 'Classification Losses: Cross-Entropy, Focal, Hinge',
  whyItMatters:
    'Cross-entropy is the default and deserves to be. But on a dataset where almost every row is easy, 1,000 easy rows own 81% of the loss and the 10 rows you care about own 19% — and the fix is one factor.',
  assumes: [
    'You know what a sigmoid is and that it turns a score into a probability',
    'You know ln — the natural logarithm — is the inverse of e^x',
  ],
  estMinutes: 22,
  sections: [
    {
      type: 'intuition',
      title: 'What cross-entropy charges',
      md: `Write **p_t** for the probability the model gave the **correct** answer. If the truth is 1 and the model said 0.9, p_t is 0.9. If the truth is 0 and the model said 0.9, p_t is 0.1.

**Cross-entropy** charges **−ln(p_t)**. That is the whole loss.

Its shape is the point: gentle when you are right, and unbounded when you are confidently wrong. A model that is certain and mistaken pays without limit, which is what stops it being certain about things it has not earned.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The penalty table, computed rather than quoted',
      code: `import math

for pt in [0.9, 0.5, 0.1, 0.01]:
    print(pt, round(-math.log(pt), 3))

# ---- real output ----
# 0.9 0.105
# 0.5 0.693
# 0.1 2.303
# 0.01 4.605`,
      annotations: {
        4: 'math.log is the NATURAL log, base e — not base 10. Python spells the base-10 one math.log10.',
        7: 'Being right with 0.9 costs 0.105 — nearly free. Being maximally unsure at 0.5 costs 0.693, which is ln 2.',
        9: 'Being wrong with 0.1 costs 2.303, and being confidently wrong at 0.01 costs 4.605. The cost grows without bound as p_t approaches 0, which is precisely the property that stops a model committing to answers it cannot support.',
      },
    },
    {
      type: 'math',
      intro:
        'Cross-entropy for one row, the multi-class form, and the focal variant. y is 0 or 1, so exactly one term of the binary form survives. In the focal loss, γ = 0 recovers plain cross-entropy, and larger γ shrinks the contribution of rows that are already right.',
      latex: [
        'L_{\\text{CE}} = -\\bigl[\\, y \\ln p + (1-y)\\ln(1-p) \\,\\bigr] \\;=\\; -\\ln p_t',
        'L_{\\text{multi}} = -\\sum_{k=1}^{K} y_k \\ln p_k \\;=\\; -\\ln p_{\\text{true class}}',
        'L_{\\text{focal}} = -(1 - p_t)^{\\gamma}\\,\\ln p_t \\qquad \\gamma = 0 \\Rightarrow \\text{cross-entropy}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Why not squared error: measure both slopes',
      code: `import math

def sigmoid(z):
    return 1 / (1 + math.exp(-z))

def ce(z):
    return -math.log(sigmoid(z))

def mse(z):
    return 0.5 * (sigmoid(z) - 1) ** 2

print('   z   CE slope   MSE slope   ratio')
for z in [-6.0, 0.0, 2.0]:
    ce_slope = (ce(z + 0.001) - ce(z)) / 0.001
    mse_slope = (mse(z + 0.001) - mse(z)) / 0.001
    print('%5.1f %10.5f %11.5f %7.1f' % (z, ce_slope, mse_slope, ce_slope / mse_slope))

# ---- real output ----
#    z   CE slope   MSE slope   ratio
#  -6.0   -0.99753    -0.00246   405.2
#   0.0   -0.49988    -0.12497     4.0
#   2.0   -0.11915    -0.01251     9.5`,
      annotations: {
        12: 'The true label is 1 throughout, so z = −6 means the model is confidently, badly wrong.',
        18: 'At z = −6 cross-entropy pushes with slope −0.998 while squared error manages −0.0025 — a ratio of 405. Squared error nearly stops learning exactly where the model is worst.',
        19: 'At z = 0, where the model is merely unsure, the ratio is only 4. The gap is not uniform; it is concentrated at the confidently-wrong end.',
      },
    },
    {
      type: 'note',
      label: 'Where that gap comes from',
      md: `Squared error through a sigmoid carries a **p(1−p)** factor in its gradient. At p = 0.0025 that factor is about 0.0025, so the push is multiplied by almost nothing.

Cross-entropy is constructed so that factor cancels exactly against the sigmoid's derivative, leaving a gradient of simply **(p − y)**. The more wrong you are, the harder it pushes.

That single cancellation is why cross-entropy is the default for classification and squared error is not.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The numerical trap: never softmax then log',
      code: `import math

z = [1000.0, 1001.0, 1002.0]

try:
    total = sum(math.exp(v) for v in z)
except OverflowError as problem:
    print('naive denominator failed:', problem)

biggest = max(z)
shifted = [v - biggest for v in z]
denom = sum(math.exp(v) for v in shifted)
log_softmax = [v - math.log(denom) for v in shifted]
print('stable log-softmax:', [round(v, 3) for v in log_softmax])
print('cross-entropy if class 0 is the true label:', round(-log_softmax[0], 3))

# ---- real output ----
# naive denominator failed: math range error
# stable log-softmax: [-2.408, -1.408, -0.408]
# cross-entropy if class 0 is the true label: 2.408`,
      annotations: {
        6: 'exp(1000) is far beyond a float, so the textbook softmax denominator raises before it ever produces a probability.',
        10: 'Subtract the largest logit from all of them. Softmax is unchanged by this — the shift cancels in the ratio — but every exponent is now at most 0, so exp cannot overflow.',
        14: 'Working in log space throughout avoids computing a probability and then logging it, which loses precision even when it does not overflow. This is why libraries expose log_softmax and cross_entropy_with_logits rather than making you compose them.',
      },
    },
    {
      type: 'intuition',
      title: 'Focal loss: when almost every row is already easy',
      md: `In dense object detection almost every candidate box is trivially background. Each easy row contributes a tiny loss — but there are so many of them that in total they own the gradient.

**Focal loss** multiplies cross-entropy by **(1 − p_t)^γ**. A row the model already gets right has p_t near 1, so that factor is near 0 and the row nearly vanishes from the total.

γ = 2 is the usual choice. It does not change what is right; it changes who the gradient is listening to.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Who owns the loss: 1,000 easy rows against 10 hard ones',
      code: `import math

easy = [0.95] * 1000
hard = [0.30] * 10
bce_easy = sum(-math.log(pt) for pt in easy)
bce_hard = sum(-math.log(pt) for pt in hard)
foc_easy = sum((1 - pt) ** 2 * -math.log(pt) for pt in easy)
foc_hard = sum((1 - pt) ** 2 * -math.log(pt) for pt in hard)
print('easy rows own %.1f%% of the BCE total' % (100 * bce_easy / (bce_easy + bce_hard)))
print('easy rows own %.1f%% of the focal total' % (100 * foc_easy / (foc_easy + foc_hard)))

# ---- real output ----
# easy rows own 81.0% of the BCE total
# easy rows own 2.1% of the focal total`,
      annotations: {
        3: 'A thousand rows the model already gets right at p_t = 0.95, and ten it is getting wrong at 0.30. Each easy row costs only 0.051 — but there are a thousand of them.',
        9: 'Under plain cross-entropy the easy rows own 81% of the total. The model is overwhelmingly being told about answers it already has.',
        10: 'Under focal loss they own 2.1%. The (1 − 0.95)² factor is 0.0025, which all but removes them, and the ten hard rows now dominate. Same data, same predictions, a completely different gradient.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'All three losses on the same six predictions',
      code: `y = [1, 1, 1, 0, 0, 0]
z = [3.0, 1.2, 0.3, -3.0, -0.3, 2.5]

print(' y      z    p_t     BCE   focal   hinge')
for i in range(6):
    p = 1 / (1 + math.exp(-z[i]))
    pt = p if y[i] == 1 else 1 - p
    bce = -math.log(pt)
    focal = (1 - pt) ** 2 * bce
    signed = 1 if y[i] == 1 else -1
    hinge = max(0.0, 1 - signed * z[i])
    print('%2d %6.1f %6.3f %7.3f %7.3f %7.3f' % (y[i], z[i], pt, bce, focal, hinge))

# ---- real output ----
#  y      z    p_t     BCE   focal   hinge
#  1    3.0  0.953   0.049   0.000   0.000
#  1    1.2  0.769   0.263   0.014   0.000
#  1    0.3  0.574   0.554   0.100   0.700
#  0   -3.0  0.953   0.049   0.000   0.000
#  0   -0.3  0.574   0.554   0.100   0.700
#  0    2.5  0.076   2.579   2.202   3.500`,
      annotations: {
        7: 'p_t flips for negative rows: the model said p, but being right means being close to 0, so p_t is 1 − p.',
        16: 'Row 1 is confidently right. BCE still charges 0.049 — small, but never zero. Hinge charges exactly 0.000 and stops caring entirely.',
        18: 'Row 3 sits at p_t 0.574, barely right. BCE charges 0.554, focal only 0.100, and hinge 0.700 because it is inside the margin even though the decision is correct.',
        21: 'The last row is confidently wrong. All three punish it, and hinge punishes it hardest at 3.500 — it grows linearly forever, where BCE grows logarithmically.',
      },
    },
    {
      type: 'note',
      label: 'The decision list',
      md: `- **Cross-entropy** — the default. Use it unless you have a specific reason not to, and use the library\'s logits version rather than composing softmax and log yourself.
- **Focal (γ = 2)** — when easy negatives overwhelm the gradient by sheer count. Dense detection is the canonical case.
- **Hinge** — when you want a margin and do not need probabilities. It charges exactly zero for comfortably-correct rows, which is why an SVM depends on so few points.
- **Class weights** — an orthogonal tool. Focal down-weights *easy* rows; class weights up-weight a *rare class*. They solve different problems and can be used together.`,
    },
  ],
  quiz: [
    {
      question: 'What is p_t?',
      options: [
        { text: 'The probability the model assigned to class 1', explanation: 'That is p. p_t flips it for negative rows.' },
        { text: 'The probability the model assigned to the CORRECT answer', explanation: 'Correct. Truth 1 and model 0.9 gives p_t 0.9; truth 0 and model 0.9 gives p_t 0.1.' },
        { text: 'The threshold', explanation: 'No threshold appears in these losses.' },
        { text: 'The true label', explanation: 'The true label is y, which is 0 or 1.' },
      ],
      correct: 1,
    },
    {
      question: 'Cross-entropy charges 0.105 at p_t = 0.9 and 4.605 at p_t = 0.01. What property does that shape give?',
      options: [
        { text: 'It bounds the loss so training is stable', explanation: 'It is unbounded as p_t → 0, which is the opposite of bounded.' },
        { text: 'Confident mistakes are punished without limit, so the model cannot commit to answers it has not earned', explanation: 'Correct — and it is why cross-entropy produces calibrated probabilities rather than just correct decisions.' },
        { text: 'All errors cost the same', explanation: 'They differ by a factor of 44 across that range.' },
        { text: 'It ignores correct predictions', explanation: 'It still charges 0.105 for a correct one — small, but never zero.' },
      ],
      correct: 1,
    },
    {
      question: 'At z = −6 the CE slope is −0.998 and the MSE slope −0.0025, a ratio of 405. Why?',
      options: [
        { text: 'Squared error is computed incorrectly', explanation: 'It is the standard 0.5(p − y)² through a sigmoid.' },
        { text: 'MSE\'s gradient carries a p(1−p) factor, which is ~0.0025 there, so it nearly stops learning where the model is worst', explanation: 'Correct. Cross-entropy is built so that factor cancels, leaving (p − y).' },
        { text: 'The numerical derivative step was too large', explanation: '0.001 is fine; the analytic gradients agree.' },
        { text: 'Because z is negative', explanation: 'The sign of z is not what causes it; the saturation of the sigmoid is.' },
      ],
      correct: 1,
    },
    {
      question: 'Why subtract the largest logit before exponentiating?',
      options: [
        { text: 'To make the probabilities sum to 1', explanation: 'They already do; the shift cancels in the ratio.' },
        { text: 'exp(1000) overflows — shifting makes every exponent ≤ 0 without changing the softmax at all', explanation: 'Correct. The naive version raises a math range error before producing anything.' },
        { text: 'To centre the logits for better training', explanation: 'It is applied at evaluation time and changes no gradients.' },
        { text: 'To speed up the exponential', explanation: 'Speed is unaffected.' },
      ],
      correct: 1,
    },
    {
      question: '1,000 easy rows own 81% of the BCE total and 2.1% of the focal total. What changed?',
      options: [
        { text: 'The predictions', explanation: 'Identical predictions in both calculations.' },
        { text: 'The (1 − p_t)² factor: at p_t = 0.95 it is 0.0025, which all but removes each easy row', explanation: 'Correct. Focal does not change what is right — it changes who the gradient listens to.' },
        { text: 'The number of hard rows', explanation: 'Ten in both cases.' },
        { text: 'The class weights', explanation: 'No class weighting is applied; focal down-weights by difficulty, not by class.' },
      ],
      correct: 1,
    },
    {
      question: 'Row 3 has p_t = 0.574 — correct, but barely. Why does hinge charge 0.700 when the decision is right?',
      options: [
        { text: 'A bug in the hinge formula', explanation: 'max(0, 1 − y·z) with z = 0.3 gives 0.7 correctly.' },
        { text: 'Hinge charges until the row is outside the margin, not merely on the right side', explanation: 'Correct. It becomes exactly 0 only when y·z ≥ 1, which is what creates the margin.' },
        { text: 'Because p_t is below 0.6', explanation: 'Hinge never sees p_t; it works on the raw score z.' },
        { text: 'Because the label is 1', explanation: 'The symmetric row with label 0 and z = −0.3 also charges 0.700.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why is cross-entropy preferred to squared error for classification?',
      answer:
        'Because of the gradient where it matters most. Squared error through a sigmoid keeps a p(1−p) factor, and at a confidently wrong prediction that factor is tiny — measured at z = −6 with the true label 1, cross-entropy pushes with slope −0.998 while squared error manages −0.0025, a ratio of 405. Cross-entropy is constructed so that factor cancels against the sigmoid derivative, leaving simply (p − y). It is also a proper scoring rule, so its minimum is at the true probability, which is why it produces calibrated outputs.',
      isCaseBased: true,
    },
    {
      question: 'Explain focal loss and when you would reach for it.',
      answer:
        'It multiplies cross-entropy by (1 − p_t)^γ, so rows the model already gets right nearly disappear from the total. The motivation is dense object detection, where almost every candidate box is trivially background: with 1,000 easy rows at p_t 0.95 and 10 hard ones at 0.30, the easy rows own 81% of the plain cross-entropy total and only 2.1% of the focal total. γ = 2 is standard. It is worth being precise that this is a *difficulty* reweighting, not a class reweighting — class weights are the separate tool for a rare class.',
      isCaseBased: false,
    },
    {
      question: 'What is the numerical issue with softmax and how is it fixed?',
      answer:
        'exp overflows. On logits of 1000, 1001, 1002 the naive denominator raises a range error before producing any probability at all. The fix is to subtract the maximum logit from all of them, which leaves softmax mathematically unchanged because the shift cancels in the ratio, while making every exponent at most zero so exp cannot overflow. The related discipline is to stay in log space rather than computing a probability and then logging it, which is why frameworks give you log_softmax and cross-entropy-with-logits rather than expecting you to compose them.',
      isCaseBased: true,
    },
    {
      question: 'When would you use hinge loss?',
      answer:
        'When you want a margin and do not need probabilities — which is exactly the SVM setting. Its distinguishing property is that it charges exactly zero for comfortably-correct rows, so those points stop contributing to the objective entirely and the solution depends only on the support vectors. That makes it robust to outliers sitting far from the boundary on the correct side. The cost is that its output is a distance rather than a probability, so anything downstream needing a calibrated number requires Platt scaling on top.',
      isCaseBased: false,
    },
    {
      question: 'Focal loss or class weights for an imbalanced problem?',
      answer:
        'They address different things and are often combined. Class weights scale a whole class up, which is right when the rare class is rare — 1% fraud, say. Focal scales down whatever the model already finds easy, regardless of class, which is right when the problem is sheer volume of trivial examples rather than the class ratio. In detection you typically use both: alpha for the class imbalance and gamma for the easy-example imbalance. Reaching for focal on ordinary tabular imbalance is usually a mistake — class weights or threshold moving are simpler and work.',
      isCaseBased: false,
    },
    {
      question: 'What does label smoothing do to cross-entropy?',
      answer:
        'It replaces the hard target of 1 with something like 0.9 and spreads the remainder across the other classes. Since cross-entropy is unbounded as p_t → 0, a hard target pushes the model to drive one logit ever higher, which produces overconfidence and large weights. Smoothing gives the loss a finite minimum at a sensible probability instead. It reliably improves calibration and usually generalisation, at the cost of making the model deliberately less confident — which is a problem if you need the raw probabilities to be sharp.',
      isCaseBased: false,
    },
    {
      question: 'Your multi-class model outputs nan after a few hundred steps. Where do you look?',
      answer:
        'At any place a probability meets a log or an exp. Composing softmax and then log by hand is the classic one — a probability that underflows to exactly 0 makes log(0) = −inf, and the nan propagates through every later gradient. Use the logits version instead. Then check for exploding logits from a learning rate that is too high, which overflows exp. Then check for a label outside the valid class range, which indexes into nothing. A single nan is unrecoverable, so I would also add a check that fails loudly on the first occurrence rather than at the end of the epoch.',
      isCaseBased: true,
    },
    {
      question: 'Is cross-entropy the same as log loss and negative log likelihood?',
      answer:
        'Effectively yes, and the three names cause needless confusion. Log loss is the binary case; negative log likelihood is the same quantity framed as maximum likelihood — maximising the likelihood of the observed labels is minimising −ln of the predicted probability of the true class; cross-entropy is the information-theoretic framing, the expected bits to encode the true distribution using the predicted one. Same formula, three traditions. In PyTorch, note that nll_loss expects log-probabilities while cross_entropy expects raw logits, which is a real source of bugs.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Cross-entropy, in one line', back: '−ln(p_t), where p_t is the probability given to the CORRECT answer.' },
    { front: 'The penalty table', back: 'p_t 0.9 → 0.105, 0.5 → 0.693 (= ln 2), 0.1 → 2.303, 0.01 → 4.605. Unbounded as p_t → 0.' },
    { front: 'Why not squared error?', back: 'Its gradient keeps a p(1−p) factor. At z = −6: CE slope −0.998, MSE slope −0.0025 — a ratio of 405, exactly where the model is worst.' },
    { front: 'Focal loss', back: '−(1 − p_t)^γ ln(p_t). γ = 2 standard. γ = 0 recovers cross-entropy.' },
    { front: 'What focal actually changes', back: '1,000 easy rows at p_t 0.95 own 81% of the BCE total and 2.1% of the focal total. Same predictions, different gradient ownership.' },
    { front: 'Focal vs class weights', back: 'Focal down-weights EASY rows regardless of class. Class weights up-weight a RARE class. Different problems; often used together.' },
    { front: 'The softmax overflow fix', back: 'Subtract the max logit before exponentiating. Softmax is unchanged (the shift cancels) but no exponent exceeds 0. Never softmax then log.' },
    { front: 'Hinge', back: 'max(0, 1 − y·z) on the raw score. Exactly 0 once outside the margin — which is why an SVM depends on so few points. No probability out.' },
  ],
  mindmapMarkdown: `- Classification losses
  - Cross-entropy
    - -ln(p_t), p_t = probability of the CORRECT answer
    - 0.9 -> 0.105, 0.5 -> 0.693, 0.01 -> 4.605
    - unbounded as p_t -> 0
    - gradient is simply (p - y)
  - Why not squared error
    - keeps a p(1-p) factor
    - z=-6: CE -0.998 vs MSE -0.0025, ratio 405
    - stalls exactly where the model is worst
  - Numerical trap
    - exp(1000) overflows -> math range error
    - subtract the max logit (softmax unchanged)
    - never softmax then log; use the logits version
  - Focal
    - -(1-p_t)^gamma ln p_t, gamma 2
    - 1000 easy rows: 81% of BCE, 2.1% of focal
    - down-weights EASY rows, not a rare class
  - Hinge
    - max(0, 1 - y z), exactly 0 outside the margin
    - a distance, not a probability`,
}

export default m
