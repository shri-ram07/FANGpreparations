import type { Module } from '../types'

const m: Module = {
  id: 'ml-l1-gradient-descent',
  subjectId: 'ml',
  level: 1,
  title: 'Gradient Descent + Linear Regression',
  whyItMatters:
    'Every neural network ever trained — GPT included — is this module scaled up: guess, measure the miss, nudge the weights downhill, repeat. Interviewers use it to test whether you understand training or just call .fit(). Learn it here with one weight, where you can literally watch it.',
  estMinutes: 50,
  sections: [
    {
      type: 'intuition',
      title: 'The problem: draw the best line',
      md: `You have data: flat sizes (m²) and their rents. New flat comes in — predict its rent.

- Simplest honest model: a straight line. **ŷ = w·x + b**.
- *ŷ* ("y-hat") = our prediction. *x* = flat size.
- **w** (weight) = rent per extra m². **b** (bias) = base rent at size 0.
- "Learning" = finding the w and b that make the line fit the dots best.
- Two knobs. Turn them until the line looks right. But what does "right" mean, precisely?`,
    },
    {
      type: 'intuition',
      title: 'Loss: give "wrong" a number',
      md: `Golf: you don't say "bad shot" — you say "8 meters from the hole". Distance is feedback you can act on.

- For each data point: miss = prediction − truth = ŷ − y.
- Square each miss, average them. That's **MSE — Mean Squared Error**.
- Why square? Two real reasons:
- Big misses get punished disproportionately (a 10-unit miss costs 100, not 10).
- Squares make a smooth bowl we can slide down — absolute values have a kink at 0 that breaks slopes.
- Now "best line" has a definition: **the w, b with the lowest MSE**.`,
    },
    {
      type: 'math',
      intro: 'MSE, written out once. m = number of data points.',
      latex: [
        'J(w, b) = \\frac{1}{2m} \\sum_{i=1}^{m} \\left( \\underbrace{w x^{(i)} + b}_{\\hat{y}^{(i)}} - y^{(i)} \\right)^2',
        '\\text{The } \\tfrac{1}{2} \\text{ is cosmetic: it cancels the 2 from the derivative.}',
      ],
    },
    {
      type: 'intuition',
      title: 'Finding the bottom, blindfolded',
      md: `Plot loss J against w: a valley. The best w sits at the bottom. How do you find it if you can't see the whole curve?

- You're on a hillside, blindfolded. You *feel the slope under your feet* — that's all.
- Slope tilts down to the right → step right. Down-left → step left.
- The **gradient** is exactly that felt slope: which way is uphill, and how steep.
- So step **against** it: w := w − α·(slope).
- **α (learning rate)** = your step size. The whole art of training hides in this one number.
- Repeat until the ground feels flat (slope ≈ 0). You're at the bottom.`,
    },
    { type: 'visual', component: 'GradientDescentSlider', props: {} },
    {
      type: 'note',
      md: `What you just saw, in a table you'll reuse for every model you ever train: **α too small** → crawls, wastes compute, may look "stuck". **α right** → smooth descent. **α too big** → jumps across the valley, loss oscillates. **α way too big** → each jump lands HIGHER — loss explodes to infinity. Training loss exploding? Check the learning rate first.`,
    },
    {
      type: 'math',
      intro: 'The gradient — one chain-rule application, then the update rule.',
      latex: [
        '\\frac{\\partial J}{\\partial w} = \\frac{1}{m} \\sum_{i=1}^{m} \\left( \\hat{y}^{(i)} - y^{(i)} \\right) x^{(i)} \\qquad \\frac{\\partial J}{\\partial b} = \\frac{1}{m} \\sum_{i=1}^{m} \\left( \\hat{y}^{(i)} - y^{(i)} \\right)',
        'w := w - \\alpha \\frac{\\partial J}{\\partial w} \\qquad b := b - \\alpha \\frac{\\partial J}{\\partial b}',
        '\\text{Read the first one aloud: } \\textbf{error × input, averaged.} \\text{ That phrase runs all of deep learning.}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Gradient descent from scratch — 15 lines, no libraries doing the thinking',
      code: `import numpy as np

x = np.array([50, 60, 80, 100, 120])      # flat size (m^2)
y = np.array([9.0, 10.5, 14.0, 17.5, 20.0])  # rent (k)

w, b = 0.0, 0.0                # start anywhere
alpha = 0.0001                 # learning rate
for epoch in range(2000):
    y_hat = w * x + b          # 1. predict with current line
    err = y_hat - y            # 2. miss, per point
    dw = (err * x).mean()      # 3. gradient wrt w: error x input
    db = err.mean()            #    gradient wrt b: just error
    w -= alpha * dw            # 4. step downhill
    b -= alpha * db
    if epoch % 500 == 0:
        print(epoch, ((err ** 2).mean() / 2).round(3))`,
      annotations: {
        7: 'Why so small? x values are ~100, so err·x is ~thousands. Big inputs need small steps — this is WHY feature scaling exists.',
        11: '"error × input, averaged" — the same expression a 100-billion-parameter model computes per weight.',
        13: 'The minus sign IS gradient descent: gradient points uphill, we go the other way.',
        16: 'Loss printed every 500 epochs — watch it fall. If it ever rises, alpha is too big.',
      },
    },
    {
      type: 'intuition',
      title: 'Wait — couldn\'t we just solve for the answer?',
      md: `For plain linear regression, yes: the **normal equation** (w = (XᵀX)⁻¹Xᵀy) jumps straight to the bottom, no steps, no α.

- So why does gradient descent exist? Because the shortcut dies fast:
- Matrix inversion is ~O(n³) in the number of features — 10,000 features and it's over.
- It only works when a closed-form solution *exists*. Neural nets have none.
- GD only needs one thing, ever: the gradient. That's why it generalizes from this module to GPT.
- Interview line: *"Normal equation for small linear problems; gradient descent for everything else."*`,
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `import numpy as np

LR = 0.1          # <-- change me: 0.01 (crawls), 0.1 (good), 1.5 (blows up)
STEPS = 100

rng = np.random.default_rng(0)
x = np.linspace(-1, 1, 40)
y = 3 * x + 2 + rng.normal(0, 0.1, 40)   # the truth we are hunting: w=3, b=2

w, b = 0.0, 0.0
for step in range(STEPS + 1):
    err = (w * x + b) - y
    if step % 20 == 0:
        print(f'step {step:3d}   loss {(err ** 2).mean():10.3e}   w {w:9.3f}   b {b:9.3f}')
    w -= LR * 2 * (err * x).mean()
    b -= LR * 2 * err.mean()

print(f'final w={w:.3f} b={b:.3f}   (true w=3 b=2)')`,
        precomputedOutput: `step   0   loss  7.168e+00   w     0.000   b     0.000
step  20   loss  1.808e-01   w     2.310   b     1.971
step  40   loss  1.563e-02   w     2.851   b     1.994
step  60   loss  6.632e-03   w     2.977   b     1.994
step  80   loss  6.140e-03   w     3.006   b     1.994
step 100   loss  6.113e-03   w     3.013   b     1.994
final w=3.014 b=1.994   (true w=3 b=2)`,
        caption: 'Change LR only. 0.01 stalls at w=1.53 after 100 steps (right direction, out of budget). 0.1 lands on w=3.01, b=1.99. 1.5 overshoots every step: loss climbs 7.2e+00 to 6.4e+60 and b runs to 5e+30. Same code, same data — only the step size decides.',
      },
    },
  ],
  quiz: [
    {
      question: 'Why square the errors in MSE instead of just averaging the raw misses ŷ − y?',
      options: [
        { text: 'Squares are faster to compute', explanation: 'Speed is not the reason — squaring is not free either.' },
        {
          text: 'Raw misses cancel out: +5 and −5 average to "perfect"',
          explanation: 'Correct — and squaring also gives a smooth bowl with big misses punished extra. Both matter.',
        },
        { text: 'It makes the loss smaller', explanation: 'Squaring typically makes numbers bigger, not smaller. Magnitude is irrelevant anyway.' },
      ],
      correct: 1,
    },
    {
      question: 'The gradient at your current w is +4 (positive). Which way does w move, and why?',
      options: [
        { text: 'w increases — follow the gradient', explanation: 'Backwards: the gradient points UPhill. Following it maximizes loss.' },
        {
          text: 'w decreases — step against the gradient',
          explanation: 'Correct. Positive slope = uphill to the right, so step left: w := w − α·4.',
        },
        { text: 'w stays — wait for slope 0', explanation: 'Slope hits 0 only BECAUSE we keep stepping against it.' },
      ],
      correct: 1,
    },
    {
      question: 'Training loss goes 10 → 4 → 12 → 45 → 800. Diagnosis?',
      options: [
        { text: 'Underfitting — model too simple', explanation: 'Underfitting = loss plateaus high. This loss is EXPLODING.' },
        { text: 'Learning rate too high — divergence', explanation: 'Correct. Each step jumps across the valley and lands higher. Cut α by 10× and retry.' },
        { text: 'Not enough data', explanation: 'Data quantity does not make loss increase during training.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is the loss surface of linear regression + MSE nice to optimize?',
      options: [
        {
          text: 'It is convex — one global minimum, no traps',
          explanation: 'Correct. A quadratic in (w, b) is a bowl: any downhill path reaches THE bottom. Deep nets lose this property.',
        },
        { text: 'It is flat', explanation: 'Flat would mean no gradient signal at all — the opposite of nice.' },
        { text: 'It has many minima to choose from', explanation: 'Many minima is the non-convex HARD case, not the nice one.' },
      ],
      correct: 0,
    },
    {
      question: 'Feature x₁ ranges 0–1, feature x₂ ranges 0–10,000. What happens to gradient descent without scaling?',
      options: [
        {
          text: 'The x₂ direction gets giant gradients — one shared α cannot fit both; descent zigzags or diverges',
          explanation: 'Correct: gradient ∝ input. The loss valley becomes a stretched ravine. Standardizing fixes it — this is why scaling matters for GD.',
        },
        { text: 'Nothing — GD is scale-invariant', explanation: 'It is not: the gradient literally contains x as a factor (error × input).' },
        { text: 'x₂ gets ignored', explanation: 'Opposite — x₂ DOMINATES the updates.' },
      ],
      correct: 0,
    },
    {
      question: 'In the update w := w − α·dw, what exactly is dw for MSE?',
      options: [
        { text: 'The average of (error × input) over the data', explanation: 'Correct — (ŷ−y)·x, averaged. "Error times input" is the phrase to carry.' },
        { text: 'The average error', explanation: 'That is db, the bias gradient — no input factor.' },
        { text: 'The loss itself', explanation: 'The loss says how bad; the gradient says which DIRECTION. Different objects.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Derive the gradient of MSE with respect to w, out loud, like on a whiteboard.',
      answer:
        'J = 1/2m Σ(wx+b−y)². Chain rule: outer d/du of ½u² is u; inner d/dw of (wx+b−y) is x. Multiply: ∂J/∂w = 1/m Σ(ŷ−y)·x. Same route for b, inner derivative 1 → ∂J/∂b = 1/m Σ(ŷ−y). Interviewers listen for a clean chain-rule statement, not memorized symbols — and for the summary "**error times input, averaged**".',
      isCaseBased: false,
    },
    {
      question: 'Case: your teammate\'s regression trains fine on a small sample but the loss becomes NaN on the full dataset. Walk through your debugging order.',
      answer:
        'NaN loss = numeric explosion. (1) Learning rate first — the full dataset likely has outliers/larger feature values that inflate gradients; cut α 10×. (2) Feature scale — check for unscaled columns (ids, incomes); gradient ∝ input, so one wild column detonates updates. (3) Data bugs — Infs/NaNs already in features or labels propagate instantly. (4) Only then exotic causes. Tradeoff to name: gradient clipping is the band-aid; scaling + sane α is the fix.',
      isCaseBased: true,
    },
    {
      question: 'Batch, mini-batch, and stochastic gradient descent — differences and why mini-batch won.',
      answer:
        'Batch: gradient over ALL data per step — exact direction, brutally slow per step, no noise. Stochastic (SGD): one sample per step — cheap, very noisy, can escape shallow traps but wobbles at the bottom. Mini-batch (32–512): averages enough samples to stabilize direction while staying cheap, and matches GPU parallelism perfectly. That hardware fit, plus a bit of beneficial noise, is why mini-batch is the default everywhere.',
      isCaseBased: false,
    },
    {
      question: 'When would you use the normal equation over gradient descent, concretely?',
      answer:
        'Normal equation w=(XᵀX)⁻¹Xᵀy: exact, no α, no iterations — but inverting XᵀX is ~O(d³) in feature count d and needs XᵀX invertible (breaks with perfectly correlated features unless regularized). Use it for small-to-mid d (say < a few thousand) one-shot linear fits. Use GD when d is large, data streams in, memory is tight, or the model is anything nonlinear — i.e. everything beyond linear regression.',
      isCaseBased: false,
    },
    {
      question: 'Case: loss falls smoothly, then flatlines at a high value long before fitting the data well. Give three distinct hypotheses and a test for each.',
      answer:
        '(1) α too small → steps are crawling: test by raising α 10× and watching the first 100 steps. (2) Model too simple (underfit) — a line through curved data: test by plotting predictions vs data, or adding features/polynomial terms and seeing loss drop. (3) Gradient signal vanished at a plateau/saddle (relevant in deep nets): test with a different initialization or momentum. Bonus hypothesis that impresses: the loss is already near the noise floor — the data itself has irreducible variance; compare against a simple baseline\'s error.',
      isCaseBased: true,
    },
    {
      question: 'Is MSE a good loss when the data has outliers? What would you use instead and what is the tradeoff?',
      answer:
        'Squaring makes outliers tyrants: one point 10 off contributes 100 — the line gets dragged toward it. MAE (absolute error) treats misses linearly → robust, but its gradient is constant ±1 (no "slow down near the bottom") and undefined at 0. Huber loss is the interview answer: quadratic near zero (smooth convergence), linear beyond a threshold δ (outlier-resistant) — at the cost of one more hyperparameter.',
      isCaseBased: false,
    },
    {
      question: 'Why can gradient descent get away with never seeing the whole loss surface?',
      answer:
        'Because the LOCAL slope is enough to make guaranteed local progress: a small enough step against the gradient always decreases a smooth loss. For convex problems (this module) local progress accumulates into the global optimum. For non-convex ones there is no global guarantee — which is exactly why initialization, learning-rate schedules, and momentum become their own engineering discipline in deep learning.',
      isCaseBased: false,
    },
    {
      question: 'Your model is ŷ = wx + b with final w = 0.17, b = 0.9 on (size → rent in thousands). A PM asks what the model "learned". Answer like a human.',
      answer:
        '"Each extra square meter adds about ₹170 to monthly rent, and the base cost of any flat — location, existence — is about ₹900." The point being tested: can you translate parameters into domain meaning. w = slope = marginal effect of x; b = intercept = baseline when x is 0. If you cannot say this sentence, you have a curve-fitter, not a model.',
      isCaseBased: false,
    },
    {
      question: 'Case: two runs of the same training script give slightly different final w. The data and code are identical. Name plausible causes.',
      answer:
        'Sources of nondeterminism: random weight initialization (different valley entry point — matters only if non-convex, but even convex changes the path length), data shuffling order in mini-batch GD (different gradient sequence), floating-point reduction order on parallel hardware (sums are not associative in float), and dropout/augmentation randomness in bigger models. Fix: seed everything and, on GPU, enable deterministic kernels — accepting the speed cost. For convex linear regression the final w should agree to many decimals; big divergence there means a real bug.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Linear regression hypothesis', back: 'ŷ = w·x + b.  w = effect per unit of x (slope), b = baseline (intercept).' },
    { front: 'MSE in words', back: 'Average of squared misses (÷2 for a clean derivative). Squaring: no cancellation, big misses punished, smooth bowl.' },
    { front: 'Gradient in one sentence', back: 'The local slope of loss wrt each parameter — points uphill, so we step the OTHER way.' },
    { front: 'The update rule', back: 'w := w − α · ∂J/∂w. The minus sign is the "descent".' },
    { front: '∂J/∂w for MSE', back: '(error × input), averaged:  1/m Σ (ŷ−y)·x.  For b: just the average error.' },
    { front: 'Learning-rate symptoms', back: 'Too small → crawls. Right → smooth fall. Too big → oscillates. Way too big → loss explodes (NaN).' },
    { front: 'Why scaling helps GD', back: 'Gradient ∝ input. Wildly different feature ranges = stretched ravine loss surface → zigzag/divergence with one shared α.' },
    { front: 'Convex means…', back: 'One global minimum, no traps — any downhill path wins. Linear regression + MSE is convex; deep nets are not.' },
    { front: 'Normal equation vs GD', back: 'w=(XᵀX)⁻¹Xᵀy — exact but ~O(d³) and linear-only. GD scales to any differentiable model.' },
    { front: 'Batch / mini-batch / SGD', back: 'All data / 32–512 samples / 1 sample per step. Mini-batch wins: stable direction + GPU-friendly + cheap.' },
  ],
  mindmapMarkdown: `- Gradient Descent + Linear Regression
  - Model
    - ŷ = wx + b
    - w = slope, b = baseline
  - Loss (MSE)
    - Average squared miss
    - Squaring: no cancel, punish big, smooth
    - Convex bowl → one bottom
  - Gradient
    - Felt slope, blindfolded hill
    - ∂J/∂w = error × input, averaged
    - Points uphill → step minus
  - Update loop
    - predict → miss → gradient → step
    - w := w − α·dw
  - Learning rate α
    - small: crawl
    - right: converge
    - big: oscillate
    - huge: explode / NaN
  - Scaling
    - gradient ∝ input
    - ravine surface → standardize
  - Alternatives
    - Normal equation (small d, exact)
    - SGD / mini-batch (scale)`,
}

export default m
