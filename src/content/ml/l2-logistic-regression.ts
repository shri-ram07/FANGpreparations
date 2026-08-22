import type { Module } from '../types'

const m: Module = {
  id: 'ml-l2-logistic-regression',
  subjectId: 'ml',
  level: 2,
  title: 'Logistic Regression',
  whyItMatters:
    'The workhorse classifier, and the one interviewers ask about most. It is also the cleanest place to meet the sigmoid, cross-entropy and a decision threshold — three ideas that reappear in every neural network you will build later.',
  assumes: [
    'You have read Gradient Descent — a model is w·x + b, and training nudges w and b downhill',
    'You know what a false positive and a false negative are',
    'School maths: a straight line, a fraction, and what ln means',
  ],
  estMinutes: 24,
  sections: [
    {
      type: 'intuition',
      title: 'What logistic regression is',
      md: `**Logistic regression** is a classifier: it takes features and returns a **probability** between 0 and 1 that the row belongs to the positive class.

It is linear regression with one extra step bolted on the end. The line computes **z = w·x + b** exactly as before, and then the **sigmoid** squashes z into (0, 1).

That extra step is not optional. A bare straight line will happily output 1.4 or −0.4, and neither is a probability. Six students, hours studied against pass/fail, show it doing exactly that.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The straight line, walking off both ends',
      code: `hours = [1, 2, 3, 4, 5, 6]
passed = [0, 0, 0, 1, 1, 1]

slope = 0.2571
intercept = -0.4
for h in [0, 1, 3, 4, 6, 7]:
    line = slope * h + intercept
    print(h, round(line, 3))

# ---- real output ----
# 0 -0.4
# 1 -0.143
# 3 0.371
# 4 0.628
# 6 1.143
# 7 1.4`,
      annotations: {
        2: 'The labels are 0 and 1, so anything the model outputs should sit between them.',
        8: 'At 0 hours it predicts -0.4 and at 7 hours 1.4. A straight line has no ceiling and no floor, so it cannot be a probability at either end.',
      },
    },
    {
      type: 'math',
      intro:
        'σ is the sigmoid. Read the second line right to left and it says the model is linear in the **log-odds**: the log of p/(1−p). That is the honest one-line description of what logistic regression assumes, and it is the answer to "why is it called regression?".',
      latex: [
        '\\sigma(z) = \\frac{1}{1 + e^{-z}}, \\qquad z = w \\cdot x + b, \\qquad p = \\sigma(z)',
        '\\ln\\!\\left(\\frac{p}{1-p}\\right) = z = w \\cdot x + b',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The sigmoid on five values of z',
      code: `import math

def sigmoid(z):
    return 1 / (1 + math.exp(-z))

for z in [-4.0, -1.0, 0.0, 1.0, 4.0]:
    p = sigmoid(z)
    print(z, round(p, 4))

# ---- real output ----
# -4.0 0.018
# -1.0 0.2689
# 0.0 0.5
# 1.0 0.7311
# 4.0 0.982`,
      annotations: {
        4: 'math.exp(-z) is e to the power −z. At z = 0 that is 1, so p = 1/2 — the sigmoid always crosses 0.5 at zero.',
        11: '0.018 at z = −4 and 0.982 at z = +4. It squashes the whole real line into (0, 1) and never actually reaches either end, which is why the output is always a usable probability.',
      },
    },
    {
      type: 'intuition',
      title: 'Which loss? Not squared error',
      md: `Squared error still computes here, but it trains badly. The reason is one factor in the gradient.

With squared error, the nudge for w carries a **p(1−p)** term. When the model is confidently wrong — p = 0.99 on a row whose label is 0 — that factor is 0.0099, so the gradient nearly vanishes exactly when the model most needs correcting.

**Cross-entropy** is built so that factor cancels. Its nudge is simply (p − y)·x: the more wrong you are, the harder the push.`,
    },
    {
      type: 'math',
      intro:
        'The loss for one row, and the two gradients side by side. y is 0 or 1, so exactly one of the two terms survives — the loss is −ln(p) when the truth is 1 and −ln(1−p) when it is 0. Compare the nudges: cross-entropy has no p(1−p) factor to strangle it.',
      latex: [
        'L = -\\bigl[\\, y \\ln p + (1-y) \\ln (1 - p) \\,\\bigr] \\qquad p = \\sigma(w \\cdot x + b)',
        '\\text{cross-entropy nudge for } w: \\;(p - y)\\,x \\qquad \\text{squared-error nudge for } w: \\;(p - y)\\,p\\,(1-p)\\,x',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Training the six students, one nudge at a time',
      code: `import math

hours = [1, 2, 3, 4, 5, 6]
passed = [0, 0, 0, 1, 1, 1]

w = 0.0
b = 0.0
for sweep in range(4000):
    for h, y in zip(hours, passed):
        p = 1 / (1 + math.exp(-(w * h + b)))
        error = p - y
        w = w - 0.05 * error * h
        b = b - 0.05 * error

print(round(w, 3), round(b, 3))

# ---- real output ----
# 4.496 -15.547`,
      annotations: {
        9: 'zip(hours, passed) walks both lists together, handing out (1, 0), then (2, 0), and so on. h is the feature and y the label for the same student.',
        11: '`p - y` is the entire gradient signal. No p(1−p), no chain-rule tail — this is what choosing cross-entropy bought.',
        16: 'w = 4.496, b = −15.547. Positive w means more hours pushes z up, which pushes the probability toward 1. The large negative b sets where the crossover happens.',
      },
    },
    {
      type: 'intuition',
      title: 'Threshold and boundary',
      md: `The model outputs 0.547. That is not yet a decision. A **decision threshold** is the cut-off you choose to turn a probability into a verdict, and 0.5 is a default, not a law.

The **decision boundary** is the set of inputs where the model sits exactly at the threshold. For threshold 0.5 that is where z = 0, i.e. w·x + b = 0 — a straight line, always.

Moving the threshold slides the boundary without retraining anything.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Where the boundary sits, for three thresholds',
      code: `import math

w = 4.496
b = -15.547

def boundary_hours(threshold):
    logit = math.log(threshold / (1 - threshold))
    return (logit - b) / w

for t in [0.3, 0.5, 0.8]:
    print(t, round(boundary_hours(t), 3))

# ---- real output ----
# 0.3 3.27
# 0.5 3.458
# 0.8 3.766`,
      annotations: {
        7: 'log(t / (1 - t)) converts a probability back into log-odds — the inverse of the sigmoid. Then solving w·h + b = logit for h gives the hours at which the model hits that threshold.',
        12: 'Lower the threshold to 0.3 and the boundary moves to 3.27 hours: you catch more passes and accept more false alarms. Raise it to 0.8 and it moves to 3.766. Same model, same weights, different operating point.',
      },
    },
    {
      type: 'visual',
      component: 'DecisionBoundaryPlayground',
      props: {},
    },
    {
      type: 'note',
      label: 'Why the boundary is always straight',
      md: `The sigmoid is a curve, so people expect a curved boundary. It is not, and the reason is one line: **σ is monotonic**. It never reorders anything, so "p above 0.5" is the same set of points as "z above 0".

And z = w·x + b is linear. So the boundary is a line in 2D, a plane in 3D, a hyperplane above that — regardless of how curved the sigmoid looks. To bend the boundary you must bend z: add polynomial features, interactions, or a kernel.`,
    },
    {
      type: 'note',
      label: 'The classic mistake',
      md: `A hospital screens for a disease 2 in 100 people have. The team trains a logistic regression, keeps the default 0.5 threshold, and reports 98% accuracy.

The model learned to output a probability below 0.5 for everyone, because that is what minimises errors when the positive class is 2%. It never flags a single case. Accuracy 98%, recall 0.

The probabilities may be perfectly well calibrated — the bug is the threshold. Pick it from the cost of a miss against the cost of a false alarm, not from the default.`,
    },
  ],
  quiz: [
    {
      question: 'Why can a plain linear model not output a probability?',
      options: [
        { text: 'It has no ceiling or floor — the six-student line gives −0.4 at 0 hours and 1.4 at 7', explanation: 'Correct. A probability must lie in [0, 1] and a straight line is unbounded in both directions.' },
        { text: 'Because it is trained with squared error', explanation: 'The loss is a separate issue; even trained perfectly the line still leaves [0, 1].' },
        { text: 'Because probabilities must be integers', explanation: 'Probabilities are continuous.' },
        { text: 'It can, if you clip the output to [0, 1]', explanation: 'Clipping destroys the gradient at both ends and makes every extreme row look identical.' },
      ],
      correct: 0,
    },
    {
      question: 'What does the sigmoid output at z = 0, and why does that matter?',
      options: [
        { text: '0, the minimum', explanation: 'σ(0) = 1/(1+1) = 0.5, and the sigmoid never reaches 0.' },
        { text: '0.5 — so the default threshold and the point z = 0 are the same place', explanation: 'Correct. That is exactly why the 0.5 boundary is the line w·x + b = 0.' },
        { text: '1, the maximum', explanation: 'σ approaches 1 only as z goes to +∞.' },
        { text: 'It is undefined at 0', explanation: 'It is perfectly defined: 1/(1 + e⁰) = 0.5.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is cross-entropy preferred to squared error here?',
      options: [
        { text: 'It is faster to compute', explanation: 'The cost difference is negligible.' },
        { text: 'Its gradient has no p(1−p) factor, so a confidently wrong prediction still produces a large push', explanation: 'Correct. With squared error, p = 0.99 on a 0-label gives a factor of 0.0099 and the gradient nearly vanishes when correction is most needed.' },
        { text: 'It guarantees a convex problem while squared error does not', explanation: 'Cross-entropy is indeed convex here, but the vanishing-gradient argument is the one that bites in practice.' },
        { text: 'It produces probabilities while squared error does not', explanation: 'The sigmoid produces the probability; the loss only decides how it is trained.' },
      ],
      correct: 1,
    },
    {
      question: 'Moving the threshold from 0.5 to 0.3 moved the boundary from 3.458 hours to 3.27. What else changed?',
      options: [
        { text: 'The weights were refitted', explanation: 'w and b are unchanged — nothing was retrained.' },
        { text: 'Nothing about the model; only the operating point, catching more positives and more false alarms', explanation: 'Correct. Threshold is a decision made after training, and it trades recall against precision.' },
        { text: 'The model became non-linear', explanation: 'The boundary stays a straight line at every threshold.' },
        { text: 'The probabilities all shifted down', explanation: 'The probabilities are identical; only the cut-off applied to them moved.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is the decision boundary straight even though the sigmoid is a curve?',
      options: [
        { text: 'Because σ is monotonic, so "p > 0.5" is the same set as "z > 0", and z is linear', explanation: 'Correct. The sigmoid never reorders points, so the boundary is determined entirely by the linear z.' },
        { text: 'Because the data happened to be linearly separable', explanation: 'The boundary is straight regardless of the data.' },
        { text: 'Because there is only one feature', explanation: 'With many features it becomes a plane or hyperplane — still flat.' },
        { text: 'It is not — the boundary is an S-curve', explanation: 'The probability surface is S-shaped; the set of points at a fixed probability is flat.' },
      ],
      correct: 0,
    },
    {
      question: 'A model reports 98% accuracy on a 2%-prevalence screening task, with recall 0. What is the fix?',
      options: [
        { text: 'Retrain with more data', explanation: 'More data will not change the fact that predicting "negative" for everyone minimises errors at threshold 0.5.' },
        { text: 'Choose the threshold from the relative cost of a miss and a false alarm, not the 0.5 default', explanation: 'Correct. The probabilities may be fine; it is the cut-off applied to them that is wrong for this cost structure.' },
        { text: 'Switch to squared error', explanation: 'The loss is unrelated to this failure.' },
        { text: 'Report accuracy on the training set instead', explanation: 'That would make the reporting worse, not better.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why is it called logistic *regression* when it does classification?',
      answer:
        'Because it is a linear regression on the log-odds. The model states ln(p/(1−p)) = w·x + b, which is genuinely a linear regression — just of a transformed target rather than the raw label. The sigmoid is only that equation solved for p. Classification appears at the very end, when you apply a threshold to the probability, and that step is not part of the model at all.',
      isCaseBased: false,
    },
    {
      question: 'Derive the cross-entropy gradient and say why it matters.',
      answer:
        'For one row, L = −[y ln p + (1−y) ln(1−p)] with p = σ(z). dL/dp = −y/p + (1−y)/(1−p), and dp/dz = p(1−p). Multiplying, the p(1−p) cancels and leaves dL/dz = p − y, so dL/dw = (p − y)x. The point is the cancellation: squared error keeps a p(1−p) factor, which is 0.0099 when the model says 0.99 on a 0-label, so it barely learns from its worst mistakes. Cross-entropy pushes hardest exactly there.',
      isCaseBased: true,
    },
    {
      question: 'How do you interpret a coefficient?',
      answer:
        'A one-unit increase in that feature adds w to the log-odds, which multiplies the odds by e^w. With w = 4.496, one extra hour of study multiplies the odds of passing by e^4.496 ≈ 90. Note it is not additive in probability: the same coefficient moves probability a lot near 0.5 and hardly at all near 0 or 1, which is why "increases the chance by X%" is the wrong phrasing.',
      isCaseBased: false,
    },
    {
      question: 'Your logistic regression underfits badly. What do you do?',
      answer:
        'The boundary is flat, so if the truth is curved the model cannot express it however long you train. Add capacity to z: polynomial terms, interactions between features, binning a feature that has a non-monotonic effect. Check the features are scaled, since wildly different scales make a single learning rate useless. Reduce regularisation if it is set high. If it still underfits, the linear-in-log-odds assumption is wrong for this data and a tree ensemble is the natural next step.',
      isCaseBased: true,
    },
    {
      question: 'What does it mean for a model to be well calibrated, and does logistic regression give you that?',
      answer:
        'Calibrated means that among rows predicted at 0.7, about 70% really are positive. Logistic regression trained with cross-entropy on representative data is usually well calibrated out of the box, because the loss is a proper scoring rule that is minimised by the true probability. That breaks if you resample to fix class imbalance, which shifts the base rate and the intercept with it. You check with a reliability diagram and repair with Platt scaling or isotonic regression.',
      isCaseBased: false,
    },
    {
      question: 'How do you extend it beyond two classes?',
      answer:
        'Softmax regression — sometimes called multinomial logistic. One weight vector per class, z_k = w_k·x + b_k, and softmax turns the vector of z values into probabilities summing to 1. The loss generalises to categorical cross-entropy, which is −ln of the probability assigned to the true class. The alternative is one-vs-rest: k independent binary models, which is simpler and parallel but gives probabilities that do not sum to 1.',
      isCaseBased: false,
    },
    {
      question: 'Two features are almost perfectly correlated. What happens?',
      answer:
        'The coefficients become unstable and uninterpretable. The model can shift weight between them almost freely without changing predictions, so the fitted values swing wildly with tiny changes in the data and can take large opposite signs. Predictions stay fine, which is why it often goes unnoticed until someone reads the coefficients. L2 regularisation stabilises it by splitting the weight between them; L1 picks one and zeroes the other.',
      isCaseBased: true,
    },
    {
      question: 'When would you choose logistic regression over a gradient-boosted tree?',
      answer:
        'When you need calibrated probabilities and an auditable explanation — credit, insurance, clinical decisions, anywhere a regulator asks why. It trains in seconds, extrapolates sensibly, handles very wide sparse data well, and its coefficients are a genuine explanation rather than a post-hoc one. Trees usually win on raw accuracy with tabular data that has interactions and non-monotonic effects, so the choice is often accuracy against explainability rather than a purely technical one.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Logistic regression, in one sentence', back: 'Compute z = w·x + b, then squash it with the sigmoid into a probability between 0 and 1.' },
    { front: 'The sigmoid', back: 'σ(z) = 1/(1 + e^(−z)). σ(0) = 0.5, σ(−4) = 0.018, σ(4) = 0.982. Never reaches 0 or 1.' },
    { front: 'Why "regression"?', back: 'It is linear regression on the log-odds: ln(p/(1−p)) = w·x + b.' },
    { front: 'Cross-entropy loss', back: 'L = −[y ln p + (1−y) ln(1−p)]. y is 0 or 1, so one term survives: −ln(p) when the truth is 1.' },
    { front: 'Why not squared error?', back: 'Its gradient carries a p(1−p) factor. At p = 0.99 on a 0-label that is 0.0099, so the model barely learns from its most confident mistakes. Cross-entropy\'s nudge is just (p − y)x.' },
    { front: 'Threshold vs boundary', back: 'Threshold is the cut-off on the probability. The boundary is where the model sits at it: for 0.5, the line w·x + b = 0. Moving the threshold slides the boundary without retraining.' },
    { front: 'Why is the boundary always flat?', back: 'σ is monotonic, so "p > threshold" equals "z > constant", and z is linear. To bend the boundary you must bend z — polynomial features, interactions, a kernel.' },
    { front: 'Interpreting a coefficient', back: 'One unit of x adds w to the log-odds, i.e. multiplies the odds by e^w. w = 4.496 → odds ×90 per hour. Not additive in probability.' },
  ],
  mindmapMarkdown: `- Logistic regression
  - The model
    - z = w x + b, then p = sigmoid(z)
    - sigmoid = 1/(1 + e^-z), crosses 0.5 at z=0
    - linear in the LOG-ODDS: ln(p/(1-p)) = z
  - Why not a plain line
    - unbounded: -0.4 at 0 hours, 1.4 at 7
  - The loss
    - cross-entropy: -[y ln p + (1-y) ln(1-p)]
    - gradient (p - y)x, no p(1-p) factor
    - squared error stalls at p=0.99 on a 0-label (0.0099)
  - Six students
    - trained w = 4.496, b = -15.547
    - boundary: 0.3 -> 3.27h, 0.5 -> 3.458h, 0.8 -> 3.766h
  - Threshold vs boundary
    - threshold is chosen AFTER training
    - boundary is always flat (sigma is monotonic)
    - bend z to bend the boundary
  - Traps
    - 0.5 on 2% prevalence: 98% accuracy, recall 0
    - correlated features: unstable coefficients
    - resampling breaks calibration`,
}

export default m
