import type { Module } from '../types'

const m: Module = {
  id: 'ml-l1-gradient-descent',
  subjectId: 'ml',
  level: 1,
  title: 'Gradient Descent',
  whyItMatters:
    'This is the training loop. Every model ever trained runs the same four steps: predict, measure the miss, work out which way each knob should move, move it a little. Built here from three rows you can check on paper.',
  assumes: [
    'You know what a slope is, and that a derivative is a slope (Math → Slopes, Derivatives & the Gradient)',
    'School algebra: you can substitute numbers into wx + b',
    'Basic Python: a function, a list, a for loop',
  ],
  estMinutes: 24,
  sections: [
    {
      type: 'intuition',
      title: 'What gradient descent is',
      md: `**Gradient descent** is a rule for improving numbers you cannot solve for directly. You have a **loss** — one number saying how wrong the model currently is — and you want it smaller.

The rule: compute the **gradient**, which is the slope of the loss with respect to each knob and points *uphill*. Then move each knob a small step in the opposite direction. Repeat.

- In: a loss function and some starting values.
- Out: values with a lower loss.
- The one setting you choose is the **learning rate** α — how big a step is.

Everything below fits a straight line to three flats: size in tens of m², rent in thousands.`,
    },
    {
      type: 'math',
      intro:
        'J is the loss: the mean squared error between the prediction ŷ = wx + b and the truth y, over m rows. The superscript (i) means "row number i" — an index, not a power. The two partial derivatives are the gradient, and the last line is the update rule: α is the learning rate, and the minus sign is what makes it descent.',
      latex: [
        'J(w, b) = \\frac{1}{m} \\sum_{i=1}^{m} \\left( \\underbrace{w x^{(i)} + b}_{\\hat{y}^{(i)}} - y^{(i)} \\right)^{2}',
        '\\frac{\\partial J}{\\partial w} = \\frac{2}{m} \\sum_{i=1}^{m} \\left( \\hat{y}^{(i)} - y^{(i)} \\right) x^{(i)} \\qquad \\frac{\\partial J}{\\partial b} = \\frac{2}{m} \\sum_{i=1}^{m} \\left( \\hat{y}^{(i)} - y^{(i)} \\right)',
        'w := w - \\alpha \\frac{\\partial J}{\\partial w} \\qquad b := b - \\alpha \\frac{\\partial J}{\\partial b}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The loss, computed rather than asserted',
      code: `rows = [(1, 3), (2, 5), (3, 8)]   # each pair is one flat: (size, rent)

def mse(w, b):
    total = 0.0
    for x, y in rows:
        pred = w * x + b
        total = total + (pred - y) ** 2
    return total / len(rows)

print('loss at w=1,   b=1     :', round(mse(1.0, 1.0), 6))
print('loss at w=2,   b=1     :', round(mse(2.0, 1.0), 6))
print('loss at w=2.5, b=0.3333:', round(mse(2.5, 0.3333), 6))

# ---- real output ----
# loss at w=1,   b=1     : 7.0
# loss at w=2,   b=1     : 0.333333
# loss at w=2.5, b=0.3333: 0.055556`,
      annotations: {
        7: 'Square the miss, then add it on. Squaring makes every miss positive, so overshooting by 2 and undershooting by 2 cost the same, and it punishes a big miss far harder than two small ones.',
        8: 'Divide by the row count so the loss is a mean, not a total. Without this, adding more data would inflate the loss even if the fit were identical.',
        12: 'Three guesses, three losses: 7.0, then 0.333, then 0.056. The numbers say which line is better, but nothing here says how to FIND the better line. That is the job gradient descent does.',
      },
    },
    {
      type: 'intuition',
      title: 'Which way is downhill?',
      md: `Picture the loss as a landscape: the two flat directions are w and b, the height is the loss. You are standing somewhere on the side of a bowl and cannot see the whole thing.

The **gradient** is the pair of slopes at your exact position — one for w, one for b. It points in the direction the loss increases fastest, so the way down is simply the opposite.

You do not have to trust that formula. The next snippet computes it both ways: from the derivative, and by nudging w a millionth and measuring what the loss did.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The formula, checked against a measurement',
      code: `w, b = 1.0, 1.0
dw, db = 0.0, 0.0
for x, y in rows:
    err = (w * x + b) - y
    dw = dw + 2 * err * x
    db = db + 2 * err
dw = dw / len(rows)
db = db / len(rows)

h = 0.000001
print('formula  dJ/dw =', round(dw, 4), '  dJ/db =', round(db, 4))
print('measured dJ/dw =', round((mse(w + h, b) - mse(w, b)) / h, 4))
print('measured dJ/db =', round((mse(w, b + h) - mse(w, b)) / h, 4))

# ---- real output ----
# formula  dJ/dw = -11.3333   dJ/db = -4.6667
# measured dJ/dw = -11.3333
# measured dJ/db = -4.6667`,
      annotations: {
        4: 'The **residual**: prediction minus truth. Negative means the line is currently too low for this flat.',
        5: 'Each row contributes 2 × residual × x to the w gradient. The x is there because a row with a larger size feels a change in w more strongly.',
        10: 'h is a tiny nudge. Changing w by h and dividing the change in loss by h is the definition of a slope, done numerically.',
        12: 'Both methods print -11.3333. The formula was not taken on faith — it agrees with a direct measurement to four decimal places.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The whole training loop, nothing hidden',
      code: `w, b = 1.0, 1.0                   # start from the guessed line
alpha = 0.1                       # learning rate: how far we move per step
for step in range(201):
    dw, db = 0.0, 0.0             # 1. fresh gradient totals for this step
    for x, y in rows:             #    visit every row before moving
        err = (w * x + b) - y     # 2. the miss on this row
        dw = dw + 2 * err * x     # 3. this row's share of the w gradient
        db = db + 2 * err         #    this row's share of the b gradient
    dw = dw / len(rows)           # 4. average, so row count does not change the step size
    db = db / len(rows)
    if step % 40 == 0:
        print('step', step, ' w', round(w, 3), ' b', round(b, 3), ' loss', round(mse(w, b), 5))
    w = w - alpha * dw            # 5. step downhill
    b = b - alpha * db

# ---- real output ----
# step 0  w 1.0  b 1.0  loss 7.0
# step 40  w 2.315  b 0.753  loss 0.08085
# step 80  w 2.43  b 0.492  loss 0.05917
# step 120  w 2.474  b 0.393  loss 0.05607
# step 160  w 2.49  b 0.356  loss 0.05563
# step 200  w 2.496  b 0.342  loss 0.05557`,
      annotations: {
        4: 'Reset the totals every step. Forget this line and gradients accumulate across steps, which is a real bug people hit — it is why PyTorch makes you call zero_grad().',
        13: 'The minus sign IS gradient descent. The gradient points uphill, so subtracting walks down. Everything else in this loop is bookkeeping.',
        21: 'Loss falls 7.0 to 0.0556 and the steps get smaller as it flattens out — near the bottom the slope is nearly zero, so the same alpha moves you less. That slowdown is convergence, not a stall.',
      },
    },
    {
      type: 'intuition',
      title: 'The learning rate is the knob you will actually tune',
      md: `α decides how far each step moves. It is not learned from data — you pick it — and picking it badly is the single most common reason training fails.

Three behaviours, and you will see all three for the rest of your career.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Same loop, same data, three learning rates',
      code: `def run(alpha, steps):
    w, b = 1.0, 1.0                    # every run starts from the same guess
    for _ in range(steps):
        dw, db = 0.0, 0.0
        for x, y in rows:
            err = (w * x + b) - y
            dw = dw + 2 * err * x
            db = db + 2 * err
        w = w - alpha * dw / len(rows)
        b = b - alpha * db / len(rows)
    return round(w, 3), round(b, 3), mse(w, b)

for a in [0.001, 0.1, 0.5]:
    print('alpha', a, '-> w, b, loss =', run(a, 40))

# ---- real output ----
# alpha 0.001 -> w, b, loss = (1.369, 1.149, 3.0017491744253904)
# alpha 0.1 -> w, b, loss = (2.315, 0.753, 0.08085306330054136)
# alpha 0.5 -> w, b, loss = (-2.0500153987212887e+26, -9.018052924242909e+25, 2.7820073026557624e+53)`,
      annotations: {
        2: 'The underscore in `for _ in range(steps)` is a normal variable name, used by convention when the loop counter is never read.',
        16: 'alpha 0.001: after 40 steps w has crawled from 1.0 to 1.369 and the loss is still 3.0. Not broken, just far too slow.',
        17: 'alpha 0.1: w is 2.315 and the loss is 0.081. This one works.',
        18: 'alpha 0.5: w is -2.05e+26 and the loss is 2.78e+53. Each step overshoots the bottom and lands further up the far side, so the steps grow. That is divergence, and a loss printing as e+53 or nan is its signature.',
      },
    },
    {
      type: 'visual',
      component: 'GradientDescentSlider',
      props: {},
    },
    {
      type: 'note',
      label: 'Batch, stochastic, mini-batch',
      md: `The loop above uses all three rows before moving. That is **batch gradient descent**, and one pass over the whole dataset is an **epoch**.

- **Stochastic (SGD)**: compute the gradient from one randomly chosen row and step immediately. Noisy, but far more steps per epoch.
- **Mini-batch**: use a small group — 32, 64, 256 — and step. This is what everyone actually uses, because it gets most of SGD's speed while the average over a group keeps the direction sane.`,
    },
    {
      type: 'note',
      label: 'The classic mistake',
      md: `Delete the two averaging lines, so the gradient is the **sum** over rows rather than the mean, and keep α = 0.1.

With 3 rows the gradient is now 3× too large, which is the same as secretly running α = 0.3 — still survivable here. With 300 rows it is 300× too large and the loss diverges to nan on the first step. The bug looks like "my learning rate is too high" and is actually a missing division.`,
    },
  ],
  quiz: [
    {
      question: 'Why does the update subtract the gradient rather than add it?',
      options: [
        { text: 'Because the gradient points uphill, and we want the loss to fall', explanation: 'Correct. The gradient is the direction of fastest increase, so its opposite is the way down.' },
        { text: 'Because the loss is always positive', explanation: 'MSE is positive, but that is unrelated to the sign of the update.' },
        { text: 'To keep the parameters positive', explanation: 'Parameters are free to go negative; nothing constrains their sign.' },
        { text: 'Convention — adding would work equally well', explanation: 'Adding would climb the loss surface and make the model worse every step.' },
      ],
      correct: 0,
    },
    {
      question: 'At w = 1, b = 1 the formula gives ∂J/∂w = −11.3333 and a numerical nudge measures −11.3333. What does that agreement establish?',
      options: [
        { text: 'That the loss is at its minimum', explanation: 'Far from it — a gradient of −11.33 means the surface is steep here.' },
        { text: 'That the hand-derived derivative is correct', explanation: 'Correct. This is gradient checking, and it is the standard way to catch a wrong derivative.' },
        { text: 'That the learning rate is well chosen', explanation: 'The check says nothing about α.' },
        { text: 'That the data is linearly separable', explanation: 'That is a classification idea, and irrelevant to a regression loss.' },
      ],
      correct: 1,
    },
    {
      question: 'With α = 0.5 the loss reached 2.78e+53. What happened?',
      options: [
        { text: 'The model overfitted the three rows', explanation: 'Overfitting drives training loss down, not to 10⁵³.' },
        { text: 'Each step overshot the minimum and landed further up the opposite side, so the steps grew', explanation: 'Correct. That is divergence, and a loss printing in scientific notation or as nan is the signature.' },
        { text: 'The gradient was computed incorrectly', explanation: 'The same gradient code works fine at α = 0.1.' },
        { text: 'Floating point ran out of precision', explanation: 'The numbers got huge because the process diverged; the arithmetic itself was fine.' },
      ],
      correct: 1,
    },
    {
      question: 'Why divide the gradient by the number of rows?',
      options: [
        { text: 'To keep the step size independent of how much data you have', explanation: 'Correct. Without it, 300 rows produce a gradient 100× larger than 3 rows, which is a hidden 100× on the learning rate.' },
        { text: 'To make the loss smaller', explanation: 'It affects the gradient here, and the mean in the loss is a separate line.' },
        { text: 'Because the derivative formula requires it', explanation: 'The formula has the 1/m precisely because we chose a mean loss; it is a choice, not a requirement.' },
        { text: 'To prevent negative gradients', explanation: 'Dividing by a positive count never changes a sign.' },
      ],
      correct: 0,
    },
    {
      question: 'Between steps 160 and 200 the loss moves only 0.00006. Why do the steps shrink?',
      options: [
        { text: 'The learning rate decays automatically', explanation: 'α is fixed at 0.1 throughout this loop; nothing decays it.' },
        { text: 'The surface is nearly flat near the bottom, so the gradient itself is nearly zero', explanation: 'Correct. Step size is α × gradient, and the gradient shrinks as you approach the minimum. That is convergence.' },
        { text: 'The model has run out of data', explanation: 'The same three rows are used every step.' },
        { text: 'Floating point cannot represent smaller changes', explanation: 'Doubles have far more precision than this; the gradient really is small.' },
      ],
      correct: 1,
    },
    {
      question: 'What is one epoch?',
      options: [
        { text: 'One parameter update', explanation: 'That is a step. With mini-batches an epoch contains many steps.' },
        { text: 'One full pass over the training dataset', explanation: 'Correct. With batch GD that is one step; with mini-batches of 32 over 3,200 rows it is 100 steps.' },
        { text: 'One run of the whole training script', explanation: 'A run normally covers many epochs.' },
        { text: 'The point at which the loss stops falling', explanation: 'That is convergence.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain gradient descent to someone who has not seen calculus.',
      answer:
        'You have a dial and a score that says how wrong you are. You want the score low. Work out which way turning the dial makes the score worse — that is the gradient — and turn it a little the other way. Repeat. The only judgement call is how far to turn each time: too little and it takes forever, too much and you fly past the bottom and end up worse than you started.',
      isCaseBased: false,
    },
    {
      question: 'Your loss goes to nan on the second step. Walk me through diagnosing it.',
      answer:
        'Almost always the effective step is too large. Check three things in order. First the learning rate — halve it repeatedly and see whether it survives; that isolates the cause fast. Second, whether the gradient is being averaged over the batch: a missing division by batch size multiplies the gradient by the batch size, which looks exactly like too high a learning rate and is why 300 rows diverge where 3 rows did not. Third, unscaled inputs — a feature in the thousands produces huge gradients for its weight. Also confirm the gradients are being zeroed each step, since accumulation grows them without bound.',
      isCaseBased: true,
    },
    {
      question: 'How do you know your hand-derived gradient is right?',
      answer:
        'Gradient checking. Compute the derivative analytically, then numerically as (J(w + h) − J(w)) / h with h around 1e-6, and compare. On the three-flat data both give −11.3333 for ∂J/∂w. It is too slow for training but it is the standard way to validate a backward pass you wrote yourself, and you run it once on a tiny input.',
      isCaseBased: false,
    },
    {
      question: 'Batch, stochastic, or mini-batch — how do you choose?',
      answer:
        'Batch gives the exact gradient but one step per epoch and needs the whole dataset in memory. SGD gives one step per row, so it makes progress far faster in wall-clock terms, but the direction is noisy. Mini-batch is what everyone runs: large enough that averaging cancels most of the noise, small enough to fit in memory and to give many steps per epoch. Sizes are usually powers of two because of how GPUs schedule work. The noise in SGD is not purely a cost — it helps escape sharp minima.',
      isCaseBased: false,
    },
    {
      question: 'Linear regression has a closed-form solution. Why teach gradient descent on it?',
      answer:
        'Because the closed form is the exception. It exists here because the loss is quadratic in the parameters, so setting both partial derivatives to zero gives linear equations. Change the model to logistic regression or any neural network and no such solution exists. Even for linear regression the closed form needs inverting a p×p matrix, which is impractical when p is large. Gradient descent is taught on the case you can check by hand precisely so you trust it on the cases you cannot.',
      isCaseBased: false,
    },
    {
      question: 'Your training loss plateaus at a value you know is too high. What are the possibilities?',
      answer:
        'Distinguish four. The learning rate may be too small — the loss falls but imperceptibly, and raising it resolves it. It may be too large, bouncing around a minimum without settling, which a decay schedule fixes. The model may lack the capacity to fit the data at all, which you test by trying to overfit a handful of examples: if it cannot drive loss near zero on ten rows, the model is the problem. Or the gradient may not be reaching the early layers, which is the vanishing-gradient case and shows up as a stalled loss with tiny gradient norms.',
      isCaseBased: true,
    },
    {
      question: 'What does the learning rate interact with that people forget?',
      answer:
        'Batch size and input scale. Doubling the batch size halves the gradient noise, so a larger batch tolerates — and often needs — a larger learning rate; the common heuristic is to scale α linearly with batch size. Input scale matters just as much: a feature in the thousands produces gradients in the thousands for its weight, so one learning rate cannot suit all parameters. Standardising inputs is partly a way of making a single α reasonable everywhere.',
      isCaseBased: false,
    },
    {
      question: 'A colleague says their model converged because the loss stopped changing. Do you agree?',
      answer:
        'Not without more evidence. A flat loss also happens when the learning rate is far too small, when gradients have vanished, when the model is stuck at a saddle point, and when a bug means the parameters are not being updated at all. Real convergence means small gradient norms as well as flat loss, and it should be checked on validation loss rather than training loss — training loss can keep falling long after the model has stopped getting better at the actual task.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Gradient descent, in one sentence', back: 'Compute the slope of the loss with respect to each parameter, then step each one a little in the opposite direction. Repeat.' },
    { front: 'The update rule', back: 'w := w − α ∂J/∂w. The minus sign is the descent; α is the learning rate.' },
    { front: 'Why subtract?', back: 'The gradient points in the direction of fastest increase, so the way down is the opposite direction.' },
    { front: 'The three learning-rate behaviours', back: 'α = 0.001: loss still 3.0 after 40 steps, too slow. α = 0.1: loss 0.081, works. α = 0.5: loss 2.78e+53, diverged.' },
    { front: 'Gradient checking', back: 'Compare the analytic derivative against (J(w+h) − J(w))/h with h ≈ 1e-6. Both gave −11.3333 here. Too slow to train with; the standard way to validate a hand-written backward pass.' },
    { front: 'Why average the gradient over the batch?', back: 'So the step size does not depend on how many rows you have. Forgetting it multiplies the gradient by the batch size — a hidden learning-rate increase that diverges on real data.' },
    { front: 'Epoch vs step', back: 'A step is one parameter update. An epoch is one full pass over the data — one step with batch GD, many with mini-batches.' },
    { front: 'Why do steps shrink near the bottom?', back: 'Step size is α × gradient, and the surface flattens as you approach the minimum, so the gradient shrinks. That slowdown is convergence, not a stall.' },
  ],
  mindmapMarkdown: `- Gradient descent
  - The idea
    - loss = one number for how wrong
    - gradient = slope per parameter, points UPHILL
    - step the other way, repeat
  - Formulas
    - J = mean (wx + b - y)^2
    - dJ/dw = 2/m sum (yhat - y) x
    - w := w - alpha dJ/dw
  - The three flats
    - (1,3), (2,5), (3,8)
    - loss at w=1,b=1 -> 7.0
    - gradient -11.3333, checked numerically
    - after 200 steps: w 2.496, b 0.342, loss 0.0556
  - Learning rate
    - 0.001 too slow (loss 3.0)
    - 0.1 works (loss 0.081)
    - 0.5 diverges (loss 2.78e+53)
  - Variants
    - batch: all rows, one step per epoch
    - SGD: one row, noisy, many steps
    - mini-batch: 32/64/256, what everyone uses
  - Traps
    - forgetting to zero the gradient
    - forgetting to average -> hidden alpha x batch size`,
}

export default m
