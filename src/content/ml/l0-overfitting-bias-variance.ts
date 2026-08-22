import type { Module } from '../types'

const m: Module = {
  id: 'ml-l0-overfitting-bias-variance',
  subjectId: 'ml',
  level: 0,
  title: 'Overfitting, Underfitting & the Bias–Variance Trade-off',
  whyItMatters:
    'Two numbers — training error and validation error — tell you which of four situations you are in and what to do about each. This is the diagnosis you will run more often than any other, on every model you ever build.',
  assumes: [
    'You know what training and validation sets are for (What a Model Is, and Why Data Is Split Three Ways)',
    'You know what a loss is: one number saying how wrong the model is',
  ],
  estMinutes: 20,
  sections: [
    {
      type: 'intuition',
      title: 'The two ways a model goes wrong',
      md: `**Overfitting** is when a model fits the training rows so closely that it has learned their noise, and does worse on new data as a result. **Underfitting** is when the model is too rigid to capture the real pattern, so it does badly everywhere.

The knob that moves you between them is **capacity** — how wiggly the model is allowed to be. The standard example is **polynomial degree**: degree 1 is a straight line, degree 9 can bend nine times.

You detect which one you have by fitting the same data at several capacities and watching two error columns at once.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Degree 0 to 9: training and validation error side by side',
      code: `import numpy as np

rng = np.random.default_rng(7)

def sample(n):
    x = rng.uniform(0, 1, n)
    y = 0.8 * np.sin(2.2 * np.pi * x) + 0.18 * rng.standard_normal(n)
    return x, y

x_train, y_train = sample(15)
x_val, y_val = sample(10)

def error(coeffs, x, y):
    return float(np.mean((np.polyval(coeffs, x) - y) ** 2))

for degree in [0, 1, 2, 3, 5, 7, 9]:
    coeffs = np.polyfit(x_train, y_train, degree)
    print(degree, round(error(coeffs, x_train, y_train), 4), round(error(coeffs, x_val, y_val), 4))

# ---- real output ----
# 0 0.2276 0.36
# 1 0.0829 0.1555
# 2 0.076 0.137
# 3 0.0109 0.0386
# 5 0.01 0.0511
# 7 0.0088 0.0593
# 9 0.0087 0.0614`,
      annotations: {
        3: 'default_rng(7) fixes the random sequence, so these numbers reproduce exactly rather than shifting every run.',
        7: 'The true pattern is a sine wave plus noise of size 0.18. We know the truth here, which is what makes the two columns readable.',
        17: 'np.polyfit finds the best polynomial of the given degree; np.polyval evaluates it. Fitting happens on TRAIN only, and the same fitted curve is then scored on both sets.',
        20: 'Training error falls all the way: 0.2276 to 0.0087. Validation error falls to 0.0386 at degree 3 and then climbs back to 0.0614. That turn is the whole lesson — and note that training error gave no hint of it.',
      },
    },
    {
      type: 'intuition',
      title: 'Reading those two columns',
      md: `**Training error only ever falls.** Every extra degree buys more freedom to bend toward the points it can see, so it can never do worse. That is why training error alone can never tell you when to stop.

**Validation error is U-shaped.** It falls while the extra flexibility is capturing real structure, bottoms out at degree 3, and rises once the extra flexibility is being spent on noise.

Left of the bottom you are **underfitting**; right of it you are **overfitting**. Degree 3 is the right capacity for this data, and the only reason you can see that is the second column.`,
    },
    {
      type: 'visual',
      component: 'BiasVarianceDial',
      props: {},
    },
    {
      type: 'intuition',
      title: 'Bias and variance: two different reasons to be wrong',
      md: `Imagine refitting your model on many different samples of 15 rows from the same source.

- **Bias** is how far the *average* of those fitted models sits from the truth. High bias means the model family cannot represent the pattern no matter which sample it sees — a straight line asked to follow a sine wave.
- **Variance** is how far *one* fit sits from that average. High variance means the model is chasing whichever noise its particular sample happened to contain.

Underfitting is high bias. Overfitting is high variance. Capacity trades one for the other, which is why there is a bottom to the U.`,
    },
    {
      type: 'math',
      intro:
        'The decomposition, for squared error. Expected error splits into exactly three parts, and the third one is not yours to fix: σ² is noise in the labels themselves, and it is the floor below which no model of any kind can go.',
      latex: [
        '\\mathbb{E}\\big[(y - \\hat{f}(x))^2\\big] \\;=\\; \\underbrace{\\big(\\mathbb{E}[\\hat{f}(x)] - f(x)\\big)^2}_{\\text{bias}^2} \\;+\\; \\underbrace{\\mathbb{E}\\big[(\\hat{f}(x) - \\mathbb{E}[\\hat{f}(x)])^2\\big]}_{\\text{variance}} \\;+\\; \\underbrace{\\sigma^2}_{\\text{irreducible noise}}',
      ],
    },
    {
      type: 'note',
      label: 'Diagnose from two numbers',
      md: `Four cases cover everything you will meet:

- **Both high, small gap** → underfitting. More capacity, better features, train longer.
- **Training low, validation much higher** → overfitting. More data, less capacity, regularisation, early stopping.
- **Both low, small gap** → done. Ship it.
- **Validation *lower* than training** → something is wrong. Usually a leak, a mis-split, or dropout still active at evaluation.`,
    },
    {
      type: 'note',
      label: 'The classic mistake',
      md: `A team drops the validation split, reasoning that two held-out sets is one more than necessary. They tune degree against the test set, pick degree 9 because it happened to score best there, and report that number.

Two things are now broken. The reported number is inflated by selection, exactly as best-of-200 was on coin flips. And degree 9 is genuinely the wrong model — on honest validation data it scores 0.0614 against degree 3's 0.0386. They chose a worse model *and* overstated it.`,
    },
  ],
  quiz: [
    {
      question: 'Training error falls from 0.2276 to 0.0087 as degree goes 0 → 9. What does that tell you about the right degree?',
      options: [
        { text: 'Degree 9 is best, since it has the lowest error', explanation: 'That is training error, which a more flexible model can always drive down. It carries no information about generalisation.' },
        { text: 'Nothing — training error falls monotonically with capacity by construction', explanation: 'Correct. Only the validation column, which bottoms out at degree 3, identifies the right capacity.' },
        { text: 'Degree 0 is best, since it is simplest', explanation: 'Degree 0 has the worst error in both columns; it underfits badly.' },
        { text: 'The model is underfitting at every degree', explanation: 'At degree 9 training error is tiny and validation is climbing — that is overfitting, not underfitting.' },
      ],
      correct: 1,
    },
    {
      question: 'Validation error is 0.0386 at degree 3 and 0.0614 at degree 9. What is happening between them?',
      options: [
        { text: 'The extra flexibility is being spent fitting noise rather than signal', explanation: 'Correct. Past the bottom of the U, added capacity captures the sample\'s particular noise, which does not recur in new data.' },
        { text: 'The optimiser is failing to converge at high degree', explanation: 'polyfit solves this exactly; convergence is not the issue.' },
        { text: 'The validation set is too small', explanation: 'A small validation set adds noise to the estimate, but the systematic rise from degree 3 to 9 is overfitting.' },
        { text: 'The true function is degree 9', explanation: 'The true function is a sine wave, and degree 9 tracks the noise around it rather than the wave.' },
      ],
      correct: 0,
    },
    {
      question: 'A model has high bias. What does that mean?',
      options: [
        { text: 'It is sensitive to which particular sample it was trained on', explanation: 'That is variance.' },
        { text: 'Averaged over many refits, it still sits far from the truth — the family cannot represent the pattern', explanation: 'Correct. A straight line fitting a sine wave is wrong on average, no matter which sample it gets.' },
        { text: 'It has too many parameters', explanation: 'Too many parameters causes high variance, not high bias.' },
        { text: 'Its training error is low', explanation: 'High bias shows up as high error on training and validation alike.' },
      ],
      correct: 1,
    },
    {
      question: 'Your validation error is LOWER than your training error. First thought?',
      options: [
        { text: 'Excellent generalisation — ship it', explanation: 'It is a warning sign, not good news.' },
        { text: 'Something is wrong: likely a leak, a bad split, or regularisation still active at evaluation', explanation: 'Correct. Dropout left on during training but off at evaluation also produces this, and it is worth confirming before celebrating.' },
        { text: 'The model is underfitting', explanation: 'Underfitting gives high error on both, not an inverted gap.' },
        { text: 'The validation set is too large', explanation: 'Size affects the noise of the estimate, not its direction.' },
      ],
      correct: 1,
    },
    {
      question: 'What is σ² in the bias–variance decomposition?',
      options: [
        { text: 'The variance of the model across refits', explanation: 'That is the variance term, which is separate.' },
        { text: 'Noise in the labels themselves — a floor no model can go below', explanation: 'Correct. If the labels carry randomness, no model of any complexity can predict it, and chasing below σ² is chasing noise.' },
        { text: 'The regularisation strength', explanation: 'Regularisation is a technique, not a term in this identity.' },
        { text: 'The bias squared', explanation: 'That is the first term.' },
      ],
      correct: 1,
    },
    {
      question: 'Training error 0.05, validation error 0.27. What do you do?',
      options: [
        { text: 'Increase model capacity', explanation: 'That widens the gap — this is already overfitting.' },
        { text: 'Reduce capacity, add regularisation, get more data, or stop earlier', explanation: 'Correct. A low training error with a large gap is the overfitting signature, and all four of these attack variance.' },
        { text: 'Train for more epochs', explanation: 'More training typically drives training error lower and the gap wider.' },
        { text: 'Nothing — 0.05 is a good score', explanation: '0.05 is the score on data the model already saw, which is not the score that matters.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain the bias–variance trade-off.',
      answer:
        'Expected squared error decomposes into bias², variance and irreducible noise. Bias is how far the average model over many refits sits from the truth — a model family too rigid to represent the pattern. Variance is how far a single fit sits from that average — a model flexible enough to chase its sample\'s noise. Capacity trades one against the other: increasing it lowers bias and raises variance, which is why validation error is U-shaped while training error only falls.',
      isCaseBased: false,
    },
    {
      question: 'How do you tell overfitting from underfitting in practice?',
      answer:
        'Two numbers. Both errors high with a small gap means underfitting — the model cannot fit even the data it can see. Low training error with validation much higher means overfitting. On the polynomial data, degree 1 gives 0.0829 and 0.1555 — underfitting; degree 9 gives 0.0087 and 0.0614 — overfitting; degree 3 gives 0.0109 and 0.0386, the best available. The fix differs completely between the two, which is why the diagnosis comes first.',
      isCaseBased: true,
    },
    {
      question: 'Your model overfits. Rank your options.',
      answer:
        'More data first, if it is obtainable — it is the only fix with no downside, since it reduces variance without adding bias. Then regularisation, which is cheap and tunable. Then reduce capacity: fewer features, lower degree, shallower trees. Early stopping is effectively free when training is iterative. Data augmentation where the domain allows it. Ensembling, which averages away variance. I would resist reducing capacity first if the model is genuinely needed for the task, because it trades an overfitting problem for an underfitting one.',
      isCaseBased: false,
    },
    {
      question: 'Can a model have high bias and high variance at once?',
      answer:
        'Yes, and it is a common real situation. A shallow tree on badly scaled features can be simultaneously too rigid to capture the pattern and highly sensitive to which rows it saw. The signature is high training error together with a large train–validation gap. It usually indicates a problem upstream of capacity — bad features, a broken preprocessing step, or far too little data — rather than a capacity setting to tune.',
      isCaseBased: false,
    },
    {
      question: 'What does the irreducible error term mean for setting expectations?',
      answer:
        'It sets a floor. If labels carry genuine randomness — two identical applicants where one repaid and one did not — no model can predict the difference, and error cannot go below σ². Practically it means you should estimate that floor before promising accuracy: look at disagreement between human labellers, or at how often identical feature vectors carry different labels. A team chasing a target below the noise floor will burn months and conclude their models are bad.',
      isCaseBased: true,
    },
    {
      question: 'Deep networks have far more parameters than data points but do not always overfit. How does that fit the trade-off?',
      answer:
        'It stretches the classical picture, which is why double descent is interesting: as capacity grows past the interpolation point, test error can fall again after the classical U. The usual explanation is implicit regularisation — SGD tends to find flatter, simpler solutions among the many that fit — plus explicit regularisation, augmentation and early stopping. The decomposition still holds as an identity; what changes is the assumption that parameter count maps cleanly onto effective capacity.',
      isCaseBased: false,
    },
    {
      question: 'Validation error is noisy and two models look tied. How do you choose?',
      answer:
        'Get more estimates before choosing. k-fold cross-validation gives k scores per model, so you can compare means with some sense of the spread; if the intervals overlap heavily the models are not distinguishable and I would take the simpler one, since it will be cheaper and more robust. Picking a winner on a difference smaller than the measurement noise is the selection effect that inflates results.',
      isCaseBased: true,
    },
    {
      question: 'How does training-set size change the picture?',
      answer:
        'It moves the whole curve. More data reduces variance, so the optimal capacity moves rightward — a model that overfit on 15 rows may be exactly right on 15,000. This is what learning curves show: plot training and validation error against sample size, and if the two are converging you are variance-limited and more data will help, while if they have already met at a high value you are bias-limited and more data will not.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Overfitting / underfitting', back: 'Overfitting: the model learned the training rows\' noise and does worse on new data. Underfitting: too rigid to capture the pattern, bad everywhere.' },
    { front: 'Why can training error never tell you when to stop?', back: 'More capacity can always fit the seen rows better, so it falls monotonically — 0.2276 down to 0.0087 across degree 0 to 9.' },
    { front: 'The U-shape', back: 'Validation error falls while extra capacity captures signal, bottoms out (degree 3, 0.0386), then rises as capacity is spent on noise (degree 9, 0.0614).' },
    { front: 'Bias', back: 'How far the AVERAGE model over many refits sits from the truth. High bias = the family cannot represent the pattern.' },
    { front: 'Variance', back: 'How far ONE fit sits from that average. High variance = the model is chasing its sample\'s particular noise.' },
    { front: 'The decomposition', back: 'E[(y − f̂)²] = bias² + variance + σ². The third term is label noise and is a floor no model can beat.' },
    { front: 'The four diagnoses', back: 'Both high + small gap → underfit. Train low + big gap → overfit. Both low → done. Validation below training → a bug (leak, bad split, dropout at eval).' },
    { front: 'Fixes for overfitting, in order', back: 'More data, regularisation, less capacity, early stopping, augmentation, ensembling.' },
  ],
  mindmapMarkdown: `- Overfitting & bias-variance
  - Definitions
    - overfitting: learned the noise, worse on new data
    - underfitting: too rigid, bad everywhere
    - capacity = how wiggly it may be (polynomial degree)
  - The two columns
    - training error only falls: 0.2276 -> 0.0087
    - validation is U-shaped
      - degree 1: 0.1555 (underfit)
      - degree 3: 0.0386 (best)
      - degree 9: 0.0614 (overfit)
  - Bias vs variance
    - bias: average fit vs truth
    - variance: one fit vs the average
    - sigma^2: label noise, a floor
  - Diagnose from two numbers
    - both high, small gap -> underfit
    - train low, big gap -> overfit
    - both low -> ship
    - validation BELOW training -> bug
  - Fixes for overfitting
    - more data, regularisation, less capacity
    - early stopping, augmentation, ensembling`,
}

export default m
