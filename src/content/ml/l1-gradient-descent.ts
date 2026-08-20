import type { Module } from '../types'

const m: Module = {
  id: 'ml-l1-gradient-descent',
  subjectId: 'ml',
  level: 1,
  title: 'Gradient Descent + Linear Regression',
  whyItMatters:
    'This is the training loop. Every model that has ever been trained, from a straight line through three points to a language model with a hundred billion knobs, runs the same four steps: predict, measure the miss, work out which way each knob should move, move it a little. This module builds all four from three rows of data you can add up on paper, in plain Python with no libraries, and never asks you to trust a formula you have not watched being produced.',
  assumes: [
    'Read the Math module *Slopes, Derivatives & the Gradient* first. Derivative, partial derivative, gradient and the chain rule are used here exactly as they were defined there, and are not re-taught from zero.',
    'School algebra: you can substitute numbers into wx + b and get an answer',
    'Basic Python: functions, lists, tuples, a for loop, and print',
    'Nothing about machine learning. Parameter, prediction, residual, loss, learning rate, epoch and convergence are all defined here as they appear.',
  ],
  estMinutes: 40,
  sections: [
    {
      type: 'intuition',
      title: 'Three flats, one guessed line, one number for how wrong it is',
      md: `Here is the entire dataset. Three flats, their size, and the rent they actually go for. Sizes are in tens of square metres and rents in thousands, so the numbers stay small enough to do on paper.

- Flat A: size **x = 1**, rent **y = 3**.
- Flat B: size **x = 2**, rent **y = 5**.
- Flat C: size **x = 3**, rent **y = 8**.

Now guess a rule for predicting rent from size. The simplest honest rule is a straight line: **prediction = w times x, plus b**. Guess **w = 1** and **b = 1**, which says "one thousand per size unit, plus one thousand of base rent", and see how it does.

- Flat A: prediction = 1(1) + 1 = **2**, but the truth is 3. It is off by 2 − 3 = **−1**.
- Flat B: prediction = 1(2) + 1 = **3**, truth 5. Off by **−2**.
- Flat C: prediction = 1(3) + 1 = **4**, truth 8. Off by **−4**.
- Square each miss so they cannot cancel each other out, and average: (1 + 4 + 16) / 3 = 21 / 3 = **7.0**.

That single number, **7.0**, is how wrong this line is. Every remaining idea in this module exists to make it smaller.`,
    },
    {
      type: 'intuition',
      title: 'The five words for the five pieces',
      md: `Each piece of that arithmetic has a name, and they are used everywhere afterwards, so pin them down now against the numbers above.

- **Parameter** (also called a **weight** when it multiplies an input): a number the model is allowed to change in order to fit the data. Here **w** is the weight — rent gained per unit of size.
- **Bias**, also called the **intercept**: the parameter that is added on regardless of the input. Here **b** is the base rent a flat of size zero would cost. It shifts the whole line up or down.
- **Prediction**: what the model outputs for one input. Written **ŷ**, read "y-hat", to keep it apart from **y**, the true value. For flat A, ŷ = 2 and y = 3.
- **Residual**, also called the **error** for that row: prediction minus truth, ŷ − y. For flat A it is −1. Negative means the model guessed too low, positive means too high.
- **Loss**: one number summarising how wrong the model is over the whole dataset. The one used above is **mean squared error**, or **MSE**: square every residual, then average. It came to 7.0.

Squaring does two jobs. It stops a +3 miss and a −3 miss from averaging to a fake zero, and it punishes a big miss more than proportionally: a miss of 4 costs 16, while four misses of 1 cost 4 in total.

"Learning" now has a precise meaning. It is: **find the w and b that make the loss as small as possible.**`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The loss, computed instead of asserted',
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
        1: 'The three flats as a list of pairs. Each pair is a tuple, Python’s way of gluing two values together; writing "for x, y in rows" later pulls the two halves apart automatically.',
        3: 'A function of the two parameters. Feeding it a w and a b returns one number: how wrong that line is on this data.',
        4: 'A running total, started at 0.0 with a decimal point so Python keeps working in decimals rather than whole numbers.',
        5: 'Walks the three pairs one at a time. On the first pass x is 1 and y is 3.',
        6: 'The prediction for this row: weight times input, plus bias. On the first pass this is 1(1) + 1 = 2.',
        7: '(pred - y) is the residual; ** 2 squares it; adding it to the total accumulates the squared misses. First pass adds (2 - 3) squared = 1.',
        8: 'Divide the accumulated total by the number of rows to get the mean. len(rows) is 3, so this is the average rather than the sum.',
        10: 'The guessed line from the table above. Prints 7.0, which matches the hand arithmetic exactly.',
        11: 'A better line: steeper, same base. The loss drops from 7.0 to 0.333, so this line fits the three flats much more closely.',
        12: 'The best line there is for this data, found in a later section. Loss 0.0556 is the lowest any straight line can score here.',
      },
    },
    {
      type: 'intuition',
      title: 'The cost surface: a landscape with two knobs',
      md: `The function you just wrote takes two numbers in and returns one number out. Picture that as a landscape.

- The two flat directions on the ground are **w** and **b**. The height above any spot is the loss there.
- That landscape has a name: the **cost surface** (cost and loss mean the same thing here).
- Our three probes were three spots on it: height 7.0 at (1, 1), height 0.333 at (2, 1), height 0.0556 at (2.5, 0.333).
- For a straight-line model scored by MSE the surface is a smooth **bowl**: it slopes down towards one lowest point from every direction, with no side dips and no flat shelves.
- Training means walking from wherever you started to the bottom of that bowl.

The obvious plan is to try every possible w and b and keep the best. It fails immediately. Two parameters at a hundred settings each is ten thousand tries; a model with a million parameters is a number with no name. We need to walk, not search.`,
    },
    {
      type: 'intuition',
      title: 'Watch the walk before explaining it',
      md: `Here is the actual walk, printed by the code further down this page. It starts at the guessed line w = 1, b = 1 with loss 7.0, and each **step** is one adjustment of both parameters.

- step 0 — w 1.000, b 1.000, loss **7.00000**
- step 40 — w 2.315, b 0.753, loss **0.08085**
- step 80 — w 2.430, b 0.492, loss **0.05917**
- step 120 — w 2.474, b 0.393, loss **0.05607**
- step 160 — w 2.490, b 0.356, loss **0.05563**
- step 200 — w 2.496, b 0.342, loss **0.05557**

Read the loss column downwards: 7.0, then 0.08, then it creeps to 0.0556 and stops moving. That settling is called **convergence** — the loss keeps falling until further steps change it by so little that continuing is pointless. Notice the pace: most of the drop happened in the first forty steps, and the last hundred and twenty bought four decimal places.

Nothing was searched. At every step the walker only ever looked at the ground directly under its feet. The next two sections are about what it looked at.`,
    },
    {
      type: 'intuition',
      title: 'Which way is downhill? Ask the gradient',
      md: `Stand at w = 1, b = 1, on the side of the bowl. You cannot see the whole landscape — computing the loss everywhere is exactly the search we just ruled out. You can only feel the slope where you are.

- From the Math module: the **partial derivative** of the loss with respect to w is how much the loss changes when you nudge w a tiny bit and hold b still. The partial with respect to b is the same question for the other knob.
- The pair of them, [∂J/∂w, ∂J/∂b], is the **gradient**. Two numbers, one per knob. J is the usual letter for the loss.
- The gradient points **uphill** — towards more loss. That was shown in the Math module, and it is why the next sentence has a minus sign in it.
- So: to reduce the loss, move each parameter **against** its own partial derivative. If ∂J/∂w is negative, the loss falls as w grows, so grow w.
- How far to move is a separate decision, controlled by one number **α** (alpha), the **learning rate**. A step is: new value = old value − α times the partial derivative.

That is the whole algorithm, and its name says it: **gradient descent**, descending by gradient. What is missing is the actual value of those two partial derivatives, which is the next section.`,
    },
    {
      type: 'intuition',
      title: 'Deriving the two gradients with the chain rule',
      md: `Take one row, x = 1 and y = 3, at w = 1 and b = 1, and follow that row’s contribution to the loss through two steps, exactly the way the chain rule was set up in the Math module.

- **Step one**: the residual, u = wx + b − y. At our point u = 1(1) + 1 − 3 = **−1**.
- **Step two**: the squared miss, s = u². At u = −1 that is **1**.
- Ask each step how sensitive it is. Step two: s = u² has derivative 2u, and we are standing at u = −1, so ds/du = **−2**.
- Step one, wiggling w only: u = wx + b − y, where b, x and y are all fixed numbers right now. The derivative of wx with respect to w is **x**, and the constants contribute nothing. So du/dw = **x = 1**.
- Chain them by multiplying, as the chain rule says: this row’s contribution to ∂J/∂w is 2u times x = (−2)(1) = **−2**.
- Step one, wiggling b instead: the derivative of b with respect to b is **1**, so du/db = 1, and the contribution to ∂J/∂b is 2u times 1 = **−2**.

So each row contributes **2 times its residual times its x** to the w gradient, and **2 times its residual** to the b gradient. The loss averages over rows, so the gradient averages too. Doing all three rows, whose residuals are −1, −2, −4:

- ∂J/∂w = 2[(−1)(1) + (−2)(2) + (−4)(3)] / 3 = 2(−17) / 3 = **−11.333**
- ∂J/∂b = 2[(−1) + (−2) + (−4)] / 3 = 2(−7) / 3 = **−4.667**

Both are negative, which says the loss falls as either parameter grows. So both must grow — and the minus sign in the update rule is what makes that happen automatically.`,
    },
    {
      type: 'math',
      intro: 'The three lines the last two sections produced. m is the number of rows.',
      latex: [
        'J(w, b) = \\frac{1}{m} \\sum_{i=1}^{m} \\left( \\underbrace{w x^{(i)} + b}_{\\hat{y}^{(i)}} - y^{(i)} \\right)^{2}',
        '\\frac{\\partial J}{\\partial w} = \\frac{2}{m} \\sum_{i=1}^{m} \\left( \\hat{y}^{(i)} - y^{(i)} \\right) x^{(i)} \\qquad \\frac{\\partial J}{\\partial b} = \\frac{2}{m} \\sum_{i=1}^{m} \\left( \\hat{y}^{(i)} - y^{(i)} \\right)',
        'w := w - \\alpha \\frac{\\partial J}{\\partial w} \\qquad b := b - \\alpha \\frac{\\partial J}{\\partial b}',
      ],
    },
    {
      type: 'note',
      md: `Reading those symbols out loud, since the notation is new. The superscript **(i)** in x⁽ⁱ⁾ just means "row number i" — it is an index, not a power. The **Σ** with i = 1 to m underneath means "add this up over all m rows". And **:=** means "replace the old value with this new one", the same thing as = in Python.

Said in words, the w gradient is **twice the average of residual times input**, and the b gradient is **twice the average residual**. Those two phrases are worth more than the symbols: the same two quantities, computed the same way, are what every layer of a neural network sends backwards during training.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The gradient formula, checked against a measurement',
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
        1: 'The point we are standing on: the guessed line, loss 7.0.',
        2: 'Two running totals, one per parameter, both started at zero. dw is shorthand for the partial derivative with respect to w.',
        3: 'Walk the rows again, one at a time.',
        4: 'The residual for this row: prediction minus truth. First pass gives 2 - 3 = -1.',
        5: 'This row’s share of the w gradient, straight from the derivation: 2 times residual times input. First pass adds 2(-1)(1) = -2.',
        6: 'This row’s share of the b gradient: 2 times residual, with no input factor, because the derivative of b with respect to b is 1.',
        7: 'Divide by the number of rows to turn the sum into an average, because the loss itself was an average.',
        8: 'The same division for the bias gradient. Forgetting these two lines is the classic bug, diagnosed near the end of this module.',
        10: 'A tiny step size, used only for the check below. This is the numerical-derivative trick from the Math module.',
        11: 'Prints what the formula claims: -11.3333 and -4.6667, matching the hand arithmetic.',
        12: 'Measures the same slope instead of deriving it: nudge w by h, see how much the loss moved, divide by h. Agreement to four decimals means the formula on line 5 is right.',
        13: 'The same measurement for b, nudging the second argument instead. Run this check whenever you write a gradient by hand.',
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
        3: 'Repeat the whole thing 201 times. Each pass through this loop body is one step.',
        10: 'The bias gradient gets the same averaging. It sits on its own line with no comment only because the line above already said it.',
        11: 'step % 40 is the remainder when step is divided by 40, so this is true at 0, 40, 80 and so on. Printing every step would flood the screen with 201 lines.',
        12: 'Prints the state BEFORE this step is taken, which is why the first line shows the untouched starting values.',
        14: 'The same subtraction for the bias. Both parameters move in the same step, using gradients measured at the same place, before either of them changed.',
      },
    },
    {
      type: 'note',
      md: `The minus sign on line 13 **is** gradient descent: the gradient points uphill, so we go the other way. Everything else in that loop is bookkeeping.

Two things worth noticing in the output. The loss never goes up, not once — that is what a correct implementation with a sane α looks like, and it is the first thing to check when something breaks. And the final answer, w = 2.496 and b = 0.342, is creeping towards w = 2.5 and b = 0.333, which a later section shows is the exact best line for this data.`,
    },
    {
      type: 'intuition',
      title: 'The learning rate is the one knob you will actually tune',
      md: `α decides how far each step moves. It is not learned from data — you choose it — and choosing it badly is the most common reason training fails.

The next snippet runs the identical loop three times from the identical starting point, changing nothing but α, for 40 steps each. Predict what you expect before reading the output.`,
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
        1: 'The same loop as before, wrapped in a function so we can run it repeatedly with different settings. alpha and steps arrive as arguments.',
        2: 'Reset both parameters inside the function, so each run is a genuinely fresh start and the three results are comparable.',
        3: 'The step loop. The underscore is a normal variable name that Python programmers use to say "I do not need this value" — here the counter is never read.',
        4: 'Fresh gradient totals for this step, exactly as before.',
        5: 'Walk the rows.',
        6: 'Residual for this row.',
        7: 'Its share of the w gradient.',
        8: 'Its share of the b gradient.',
        9: 'Step downhill in w, with the averaging division folded into the same line to keep the function short.',
        10: 'Step downhill in b.',
        11: 'Hands back the two final parameters and the loss they achieve, so the caller can print all three.',
        13: 'Three learning rates: one hundred times too small, one that works, and one that is too big.',
        14: 'Runs each for the same 40 steps and prints the result on one line, so the three are read side by side.',
      },
    },
    {
      type: 'note',
      md: `Read the three lines carefully, because these are the three behaviours you will see for the rest of your career.

- **α = 0.001 is too small.** After 40 steps w has crawled from 1.0 to 1.369 and the loss is still 3.0. The direction was right every single time; there simply was not enough movement. Nothing is broken, and that is what makes it hard to spot — it looks like a model that cannot learn.
- **α = 0.1 works.** Loss 7.0 down to 0.081 in the same 40 steps, heading for 0.0556.
- **α = 0.5 diverges.** The loss is 2.8e+53, which is Python’s way of writing a 28 followed by 52 zeros, and w has run off to −2.05e+26. Each step overshot the bottom of the bowl and landed further up the far side than it started, so the next gradient was bigger, so the next overshoot was worse.

**Loss going up during training almost always means α is too big.** Cut it by a factor of ten and run again. If the loss falls but far too slowly, multiply by three and try again. That is the whole tuning procedure at this level.`,
    },
    { type: 'visual', component: 'GradientDescentSlider', props: {} },
    {
      type: 'note',
      md: `Use that picture deliberately rather than watching it once.

- **Drag the learning-rate control to its smallest setting** and run. Watch the ball inch down and stop short of the bottom. That is the α = 0.001 row.
- **Drag it to the middle** and watch a smooth, decelerating slide: big steps up on the steep wall, small ones near the flat bottom. The step size shrinks on its own because the gradient shrinks, not because anything told it to.
- **Drag it high** and watch the ball cross the valley and land higher than it started. That is divergence, and it is worth seeing once so the exploding numbers above stop being abstract.
- **Watch the slope indicator near the bottom.** It goes to nearly zero, which is why the steps go to nearly zero, which is why the loss settles. Convergence is not a rule anyone added; it falls out of the arithmetic.`,
    },
    {
      type: 'intuition',
      title: 'Local and global minimum: why this bowl was easy',
      md: `A **global minimum** is the lowest point on the whole surface. A **local minimum** is the bottom of its own dip: lower than everything immediately around it, but possibly not lower than some other dip elsewhere.

- Gradient descent only ever feels the ground under its feet, so it cannot tell the two apart. It walks downhill until the ground is flat and stops, whichever dip it happens to be in.
- For a straight-line model scored by MSE this does not matter at all. The surface is a single bowl — one dip, so the local minimum **is** the global minimum, and any starting point reaches it. The technical word for that shape is **convex**.
- Change the model to a neural network and the surface grows many dips, ridges and flat regions. There the starting point and the path both matter, which is why deep learning has a whole industry of initialisation tricks and learning-rate schedules.
- So enjoy this module: it is the one case where the algorithm has a guarantee. The mechanics are identical either way, which is exactly why it is worth learning here.`,
    },
    {
      type: 'intuition',
      title: 'Batch gradient descent: what the loop above does',
      md: `Every step so far used all three rows before moving. That is **batch gradient descent**, and one pass through the entire dataset is called an **epoch**. In the loop above each step was also exactly one epoch, because the dataset was three rows.

- The gradient it computes is the true gradient of the loss over the whole dataset, so the direction is as good as it gets and the loss falls smoothly.
- The cost is that one step requires reading every row. With three rows that is free. With ten million rows, one step means ten million predictions, and you might need thousands of steps.
- It also requires the data to be available all at once, which rules out training on a stream.`,
    },
    {
      type: 'intuition',
      title: 'Stochastic gradient descent: one row at a time',
      md: `**Stochastic gradient descent**, or **SGD**, goes to the opposite extreme: compute the gradient from a single randomly chosen row and step immediately. "Stochastic" just means "involving randomness", from the random choice of row.

- With three rows in one epoch you get three steps instead of one, each about a third of the work. Progress per unit of computation is far better early on.
- The price is noise. One row is not the dataset, so its gradient points somewhere near the right direction but not exactly. The path to the bottom wanders, and near the bottom it never fully settles — it jitters around the minimum instead of stopping.
- The usual fix is to shrink α as training proceeds, so the late jitter gets smaller.`,
    },
    {
      type: 'intuition',
      title: 'Mini-batch: the compromise everyone actually uses',
      md: `**Mini-batch gradient descent** computes the gradient from a small group of rows — commonly 32, 64 or 256 — and steps. One epoch is then the dataset divided into groups, one step per group.

- Averaging a few dozen rows cancels most of the per-row noise, so the direction is nearly as good as batch.
- Each step still costs a tiny fraction of a full pass, so you get many steps per epoch, like SGD.
- It also matches the hardware: a GPU computes 64 predictions in roughly the time it takes to compute one, so a mini-batch of 64 is nearly free compared with a single row.
- The group size is called the **batch size** and is a knob you choose, like α. Confusingly, most people say "SGD" when they mean mini-batch; the pure one-row version is rare in practice.`,
    },
    {
      type: 'intuition',
      title: 'There is a direct formula for this one case',
      md: `For a straight line fitted by MSE you do not need to walk at all. The bottom of the bowl is where both partial derivatives are zero, and for this model that condition can be solved with algebra. With one input the answer is two short formulas. Written with x̄ and ȳ for the averages of x and y:

- **w = [sum of (x − x̄)(y − ȳ)] / [sum of (x − x̄)²]**, and then **b = ȳ − w x̄**.
- On our data: x̄ = 2, ȳ = 16/3 = 5.333. The x deviations are −1, 0, 1 and the y deviations are −2.333, −0.333, 2.667.
- Top: (−1)(−2.333) + (0)(−0.333) + (1)(2.667) = **5.0**. Bottom: 1 + 0 + 1 = **2.0**. So **w = 2.5**.
- Then b = 5.333 − 2.5(2) = **0.333**. The loss there is 0.0556, exactly the number the loop was creeping towards.

The multi-input version of the same idea is called the **normal equation**, and it involves inverting a matrix whose size is the number of inputs. So why teach the slow walk at all? Three reasons, and none of them is tradition. Inverting that matrix costs roughly the cube of the number of inputs, so it stops being practical somewhere in the thousands. It needs every row in memory at once. And, decisively, it exists only because this particular loss has a solvable derivative-equals-zero condition — a neural network has no such formula and never will. Gradient descent needs one thing only, a gradient, which is why the loop you wrote above scales all the way up and this formula does not.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: two full steps, by hand',
      md: `Data: (1, 3), (2, 5), (3, 8). Start at w = 1, b = 1, with α = 0.1. Calculator only.

- **Step 1, forward.** Predictions 2, 3, 4. Residuals −1, −2, −4. Loss = (1 + 4 + 16)/3 = **7.0**.
- **Step 1, gradient.** ∂J/∂w = 2[(−1)(1) + (−2)(2) + (−4)(3)]/3 = 2(−17)/3 = **−11.333**. ∂J/∂b = 2(−1 −2 −4)/3 = **−4.667**.
- **Step 1, update.** w = 1 − 0.1(−11.333) = **2.133**. b = 1 − 0.1(−4.667) = **1.467**. Both grew, because both gradients were negative.
- **Check.** New predictions 3.600, 5.733, 7.867. Residuals +0.600, +0.733, −0.133. Loss = (0.360 + 0.538 + 0.018)/3 = **0.305**. Down from 7.0, so the step was in the right direction.
- **Step 2, gradient at the new point.** ∂J/∂w = 2[(0.600)(1) + (0.733)(2) + (−0.133)(3)]/3 = 2(1.667)/3 = **+1.111**. ∂J/∂b = 2(0.600 + 0.733 − 0.133)/3 = **+0.800**.
- **Step 2, update.** Both gradients are now positive, so both parameters shrink: w = 2.133 − 0.111 = **2.022**, b = 1.467 − 0.080 = **1.387**. Loss = **0.217**.

The sign flip between step 1 and step 2 is the interesting part. Step 1 overshot slightly — w jumped past the eventual 2.5 in spirit while b overshot 0.333 badly — and the gradient reversed to pull it back. Gradient descent needs no memory and no plan. It re-reads the ground every step, and the signs sort themselves out.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake, walked into on purpose',
      md: `Same data, same start, same α = 0.1. One change: the two averaging lines are deleted, so the gradient is the **sum** over rows rather than the mean. It is an easy line to lose — the code still runs, and summing feels harmless.

Here is what it prints:

- step 0 — loss **7.0**
- step 1 — loss **36.88**
- step 2 — loss **198.91**
- step 3 — loss **1077.07**
- step 4 — loss **5835.93**
- step 5 — loss **31624.44**

The loss goes **up**, every step, by roughly a factor of five and a half. Within thirty steps it is beyond what a float can hold.

**Why.** With three rows, the sum is exactly three times the mean. So every step moves three times as far as intended: the effective learning rate is 0.3, not 0.1. And 0.3 is past the point where this particular bowl tolerates a step — it overshoots the bottom and lands higher on the opposite wall, which makes the next gradient larger, which makes the next overshoot worse. The identical code with the averaging restored converges quietly, as the earlier output shows.

**Why it is nastier than it looks.** The bug is invisible on a small dataset with a small α, because three times a small enough step is still a small enough step. It detonates when someone moves from a 3-row test to a 3000-row dataset, where the sum is now a thousand times the mean. The symptom then looks exactly like "the learning rate is too high", and people spend an afternoon lowering α — which does mask it — instead of restoring one division.

**How to catch it.** Print the loss every step during development and demand that it fall. If it rises on step 1 from a reasonable start, stop and look at the gradient before touching anything else. The measurement check from the earlier snippet finds it in seconds: the hand-written gradient will read exactly three times the numerical one on three rows.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `New data: **(0, 1), (1, 3), (2, 5)**. Starting parameters w = 1, b = 1, with α = 0.1. Work on paper before reading the solutions.

1. Compute the three predictions, the three residuals, and the MSE at the starting point.
2. Compute ∂J/∂w and ∂J/∂b at that point. State the sign of each and say, in words, what that sign instructs you to do.
3. Take one gradient descent step with α = 0.1. Give the new w and b, then the new loss, and say whether the step helped.
4. Use the direct formula from the normal-equation section to find the exact best w and b for this data, and the loss there.
5. A colleague reports their loss going 4 → 9 → 30 → 120 → 500. Name the single most likely cause, one concrete way to confirm it in one minute, and the fix.`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `1. Predictions are 1(0) + 1 = **1**, 1(1) + 1 = **2**, 1(2) + 1 = **3**. Residuals (prediction minus truth) are 1 − 1 = **0**, 2 − 3 = **−1**, 3 − 5 = **−2**. Squares 0, 1, 4, so MSE = 5/3 = **1.667**.
2. ∂J/∂w = 2[(0)(0) + (−1)(1) + (−2)(2)]/3 = 2(−5)/3 = **−3.333**. ∂J/∂b = 2(0 − 1 − 2)/3 = **−2.0**. Both negative, meaning the loss decreases as either parameter increases, so both should be increased. The minus sign in the update rule does that without any extra thought.
3. w = 1 − 0.1(−3.333) = **1.333**. b = 1 − 0.1(−2.0) = **1.2**. New predictions 1.200, 2.533, 3.867; residuals +0.200, −0.467, −1.133; squares 0.040, 0.218, 1.284; loss = 1.542/3 = **0.514**. Down from 1.667, so yes, it helped.
4. x̄ = 1, ȳ = 3. The x deviations are −1, 0, 1; the y deviations are −2, 0, 2. Top = (−1)(−2) + 0 + (1)(2) = **4**. Bottom = 1 + 0 + 1 = **2**. So w = **2**, and b = 3 − 2(1) = **1**. The line ŷ = 2x + 1 passes through all three points exactly, so every residual is zero and the loss is **0**. This data happens to be perfectly linear; real data never is, which is why the earlier dataset bottomed out at 0.0556 instead.
5. A loss that grows steadily is a step size too large for the surface — every step overshoots and lands higher. Confirm it in one minute by dividing α by ten and rerunning: if the loss now falls, that was it. The fix is a smaller α, but check two things that produce the same symptom: a gradient summed rather than averaged over rows, which silently multiplies α by the row count, and a plus sign where the update needs a minus.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. These four notes name things you will meet in the ML and Deep Learning modules, so the words are familiar when you get there.

- **The factor of 2, and the ½ you will see elsewhere.** Many books define the loss with a ½ in front: J = (1/2m)Σ(ŷ − y)². The ½ cancels the 2 the chain rule produces, leaving a gradient with no leading constant. It is pure cosmetics — a constant multiplier on the loss rescales the gradient by the same constant, which is indistinguishable from changing α. Both conventions are correct; just do not mix them inside one derivation.
- **Feature scaling.** The w gradient contains x as a factor, so an input measured in the thousands produces gradients a thousand times larger than an input measured in units. With one shared α, one direction takes huge steps while the other crawls, and the bowl becomes a long narrow ravine that descent zigzags down. Rescaling every input to a comparable range before training fixes it, and that is the real reason standardisation is a routine step.
- **Momentum, and adaptive rates.** Instead of stepping by the current gradient alone, keep a running average of recent gradients and step by that. It damps zigzagging and pushes through flat stretches. Adding a per-parameter step size on top gives the Adam optimiser, which is the default in deep learning. Both are the same loop with a smarter fifth line.
- **MSE and outliers.** Squaring means one badly wrong point contributes enormously and drags the fitted line towards itself. Mean absolute error does not square, so an outlier counts like any other point, but its gradient is a constant ±1 with a kink at zero. Huber loss switches between the two — squared near zero, absolute far out — at the cost of one more knob to choose.`,
    },
  ],
  quiz: [
    {
      question: 'For the row x = 2, y = 5 with w = 1 and b = 1, what is the residual?',
      options: [
        { text: '-2, because the prediction is 3 and the truth is 5', explanation: 'Correct. Prediction 1(2) + 1 = 3, residual is prediction minus truth = 3 - 5 = -2, and the negative sign says the model guessed too low.' },
        { text: '2, because you take truth minus prediction', explanation: 'That is the same size but the opposite sign convention. This module, and the gradient formula derived from it, uses prediction minus truth throughout. Mixing the two flips the direction of every step.' },
        { text: '4, because the residual is squared', explanation: 'Squaring happens later, when residuals are turned into the loss. The residual itself is the raw miss.' },
      ],
      correct: 0,
    },
    {
      question: 'The partial derivative of the loss with respect to w is -11.3 at your current point. What happens to w on the next step, and why?',
      options: [
        { text: 'w decreases, because we follow the gradient downhill', explanation: 'The gradient points UPhill, not downhill. Following it would increase the loss.' },
        { text: 'w increases, because the update subtracts a negative number', explanation: 'Correct. w := w - a(-11.3) adds a positive amount. A negative partial means the loss falls as w grows, so growing w is exactly right.' },
        { text: 'w stays put until the gradient reaches zero', explanation: 'The gradient only reaches zero because steps keep being taken. Waiting means nothing ever happens.' },
      ],
      correct: 1,
    },
    {
      question: 'Training loss reads 7.0, then 36.9, then 198.9, then 1077. What is the first thing to suspect?',
      options: [
        { text: 'The model is too simple for the data', explanation: 'A model that is too simple makes the loss flatten out at a high value. It cannot make the loss grow during training.' },
        { text: 'The effective step size is too large - either alpha itself, or a gradient that was summed instead of averaged', explanation: 'Correct. Loss rising every step means each step overshoots the bottom and lands higher. Both causes have the same fix: make the effective step smaller.' },
        { text: 'There is not enough training data', explanation: 'Too little data causes a model that fits the training rows well and new rows badly. It does not make the training loss increase.' },
      ],
      correct: 1,
    },
    {
      question: 'After 40 steps with alpha = 0.001, w has moved from 1.0 to 1.369 and the loss is still 3.0. What is wrong?',
      options: [
        { text: 'Nothing is wrong mechanically - the steps are simply too small for the budget', explanation: 'Correct. Every step was in the right direction; there just was not enough movement. Raise alpha, or run far more steps. This is the failure that looks like a model that cannot learn.' },
        { text: 'The gradient formula has a sign error', explanation: 'A sign error sends the loss upwards immediately. Here the loss fell from 7.0 to 3.0, so the direction is right.' },
        { text: 'The loss surface has a local minimum at w = 1.369', explanation: 'For a straight line with MSE the surface is a single bowl with no local traps, and the gradient at that point is nowhere near zero.' },
      ],
      correct: 0,
    },
    {
      question: 'Why is mini-batch gradient descent the usual default rather than batch or single-row SGD?',
      options: [
        { text: 'It computes a more accurate gradient than using all the data', explanation: 'It cannot be more accurate than the full-data gradient. A subset is an approximation of it, never better.' },
        { text: 'It averages away most of the single-row noise while still taking many steps per epoch, and it fits how a GPU works', explanation: 'Correct - all three at once: near-batch direction quality, near-SGD step frequency, and hardware that processes a group of rows for roughly the cost of one.' },
        { text: 'It is the only one of the three that reaches the minimum', explanation: 'All three reach a minimum on a convex problem. They differ in cost per step, noise, and how tightly they settle.' },
      ],
      correct: 1,
    },
    {
      question: 'If a direct formula gives the exact best line instantly, why teach the iterative loop?',
      options: [
        { text: 'The direct formula is only an approximation', explanation: 'It is exact for this model. That is precisely its appeal.' },
        { text: 'The formula exists only for this special case, needs all the data in memory, and its cost grows with roughly the cube of the input count', explanation: 'Correct. Gradient descent needs nothing but a gradient, which is why the same loop trains a neural network and the formula cannot.' },
        { text: 'Gradient descent finds a lower loss than the direct formula', explanation: 'It cannot. The direct formula lands exactly at the bottom; the loop only approaches it.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain gradient descent to someone who has never seen it, using a concrete example.',
      answer:
        'Take three flats with sizes 1, 2, 3 and rents 3, 5, 8, and a guessed line rent = 1 times size + 1. Its predictions are 2, 3, 4, so it misses by -1, -2, -4. Square and average those misses and you get 7.0, one number for how wrong the line is. Now ask a local question: if I nudge the slope up a little, does 7.0 go up or down? That answer is the partial derivative, and the pair of answers for both knobs is the gradient. It points towards more loss, so move each knob the opposite way by a small multiple of it. Repeat. Here the loss falls 7.0 to 0.08 in forty steps and settles at 0.0556. Nothing was searched; every step only looked at the slope where it stood.',
      isCaseBased: false,
    },
    {
      question: 'Derive the gradient of MSE with respect to w, out loud, as if at a whiteboard.',
      answer:
        'J = (1/m) sum of (wx + b - y) squared. Take one row and split it in two steps: u = wx + b - y, then s = u squared. Outer derivative: ds/du = 2u. Inner derivative with respect to w: b, x and y are fixed, and the derivative of wx with respect to w is x, so du/dw = x. Chain rule says multiply: this row contributes 2ux, that is 2 times residual times input. For b the inner derivative is 1, so the contribution is 2 times residual. The loss averages over rows so the gradients do too, giving (2/m) sum of residual times x, and (2/m) sum of residual. In words: twice the average of error times input, and twice the average error. I would then verify it numerically by nudging w by 1e-6 and dividing the change in loss by the nudge.',
      isCaseBased: false,
    },
    {
      question: 'What does the learning rate do, and how do you choose one?',
      answer:
        'It scales how far each step moves along the direction the gradient gives. Too small and every step is correct but tiny: on my three-row example, alpha = 0.001 left the loss at 3.0 after forty steps, which looks like a model that will not learn but is only a budget problem. Too large and each step overshoots the minimum and lands further up the far side, so the next gradient is bigger and the loss explodes: alpha = 0.5 reached 1e+53. In between, the loss falls smoothly. I choose it empirically: start around 0.01 to 0.1 on scaled features, watch the first fifty steps, divide by ten if the loss rises and multiply by three if it barely moves. Scaling inputs first matters, because the gradient carries the input as a factor.',
      isCaseBased: false,
    },
    {
      question: 'Batch, stochastic and mini-batch gradient descent: the difference and why mini-batch dominates.',
      answer:
        'Batch uses every row before each step. The direction is the true gradient and the descent is smooth, but one step costs a full pass over the data and needs all of it available. Stochastic uses one random row per step: many more steps for the same work, but each direction is noisy, the path wanders, and near the minimum it jitters rather than settling, so the learning rate usually has to be decayed. Mini-batch takes a group, typically 32 to 256. Averaging that many rows removes most of the noise so the direction is nearly as good as batch, each step still costs a small fraction of a pass, and it matches hardware that computes a group of rows in about the time of one. That combination is why it is the default, and why most people say SGD when they mean mini-batch.',
      isCaseBased: false,
    },
    {
      question: 'When would you use the closed-form solution instead of gradient descent?',
      answer:
        'For ordinary least squares with a modest number of inputs and data that fits in memory, the normal equation is better: it is exact, it has no learning rate and no stopping decision, and one shot is faster than thousands of steps. I would reach for it below roughly a few thousand features. Beyond that its cost, which grows about as the cube of the feature count from the matrix inversion, dominates. I would also avoid it when the data streams in or does not fit in memory, and when features are near-duplicates, since the matrix becomes close to singular and the solution blows up unless it is regularised. And it simply does not exist for anything nonlinear, which is the real point: gradient descent needs only a gradient, so the same procedure covers every model I will ever train.',
      isCaseBased: false,
    },
    {
      question: 'Case: a regression trains fine on a 100-row sample but the loss becomes inf or nan on the full 5-million-row dataset. Walk through your debugging order.',
      answer:
        'Loss reaching infinity is divergence, so the effective step size became too large. I would go in cheapest-first order. First, is the gradient averaged over rows or summed? On 100 rows a summed gradient is a mild 100x step inflation that a forgiving alpha absorbs; on 5 million rows it is fatal. That one missing division explains the exact symptom of works small, explodes large, so I check it before anything else. Second, feature scale: the w gradient carries x as a factor, so a column that only appears in the full data with values in the millions, an id or a raw income, produces enormous gradients. I would print the min, max and mean of every column on the full data and compare against the sample. Third, bad values already in the data: an inf or a nan in one row or one label propagates into every parameter in a single step, and the sample may simply not have contained one. Fourth, only then, lower alpha. To confirm the diagnosis rather than mask it, I would print the loss and the gradient norm every step for the first twenty steps on the full data: a gradient norm that is a clean multiple of the sample run points at the averaging bug, and one dominated by a single column points at scaling. Gradient clipping would get training running today, but it is a band-aid; the fix is the division and the scaler.',
      isCaseBased: true,
    },
    {
      question: 'Case: the loss falls smoothly for 200 steps and then flatlines at a value everyone agrees is too high. Give three distinct hypotheses and a cheap test for each.',
      answer:
        'One: the learning rate has become too small for the region it is in, so steps are real but negligible. Test by raising alpha ten times and watching fifty steps; if the loss resumes falling, that was it. Two: the model is too simple for the data, a straight line through a curve. Test by plotting predictions against truth and looking for structure in the residuals: if the residuals are systematically positive in one region and negative in another, the model shape is wrong, and adding a feature or a polynomial term should drop the loss. Three: the loss is already near the noise floor, meaning the data itself has irreducible randomness and no model can do better. Test by comparing against a strong simple baseline, or by checking whether duplicate inputs in the data carry different labels. A fourth, relevant only for deeper models, is a flat region or saddle where gradients have gone tiny; a different initialisation or momentum tells you quickly. I would order these by cost: the alpha test takes a minute, the residual plot takes five, the noise-floor argument takes a conversation with whoever owns the data.',
      isCaseBased: true,
    },
    {
      question: 'Case: two runs of the same training script on the same data produce slightly different final parameters. Is that a bug?',
      answer:
        'Usually not, but it depends how different. Ordinary sources of variation: random initialisation of the parameters, which changes the path taken; the shuffle order in mini-batch training, which changes the sequence of gradients; and floating-point addition not being associative, so summing millions of terms in a different order on parallel hardware gives slightly different totals. For a convex problem like linear regression with MSE there is exactly one minimum, so both runs should agree to several decimal places whatever path they took. If they agree to six digits, that is float noise and I would ignore it. If they differ in the first or second digit, that is a real signal: either training stopped well before convergence, so the runs are frozen at different points on the way down rather than at the bottom, or something is genuinely nondeterministic in the data pipeline, such as a race in how rows are loaded. To pin it down I would fix every seed and rerun; if the two runs then match exactly, the variation was seeded randomness, and if they still differ, the nondeterminism is in the infrastructure and worth chasing. On a non-convex model, different minima across runs are expected and the right question shifts to whether the validation scores agree, not the parameters.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'The linear model', back: 'Prediction = w times x, plus b. w is the weight or slope: how much the output rises per unit of input. b is the bias or intercept: the output when x is zero. Both are parameters, meaning numbers the training loop is allowed to change.' },
    { front: 'Residual and loss', back: 'Residual = prediction minus truth, one per row. Loss = one number for the whole dataset. MSE squares every residual then averages, so misses cannot cancel and big misses count extra. For (1,3),(2,5),(3,8) at w=1,b=1 the residuals are -1,-2,-4 and MSE is 7.0.' },
    { front: 'What the gradient is here', back: 'The pair [dJ/dw, dJ/db]: how much the loss changes when each parameter is nudged on its own. It points towards MORE loss, which is why the update subtracts it.' },
    { front: 'The two gradient formulas', back: 'dJ/dw = (2/m) sum of residual times x. dJ/db = (2/m) sum of residual. In words: twice the average of error times input, and twice the average error. Both come from one chain-rule step on (wx + b - y) squared.' },
    { front: 'The update rule', back: 'w := w - alpha times dJ/dw, and the same for b. The minus sign IS the descent. A negative gradient therefore increases the parameter, with no extra reasoning needed.' },
    { front: 'Learning rate symptoms', back: 'Too small: loss falls but crawls, looks like a model that cannot learn. Right: smooth fall, decelerating near the bottom. Too big: loss rises every step and reaches inf. Loss going UP means shrink the effective step.' },
    { front: 'Batch / SGD / mini-batch', back: 'All rows per step: exact direction, expensive. One random row per step: cheap and frequent but noisy and jittery at the bottom. A group of 32 to 256: nearly batch quality, nearly SGD frequency, and matches GPU hardware. Mini-batch is the default. One pass over the data is an epoch.' },
    { front: 'Local vs global minimum', back: 'Local = the bottom of its own dip. Global = the lowest point anywhere. Gradient descent only feels local ground so it cannot tell them apart. Linear regression with MSE is convex, one bowl, so the two coincide and any start works. Neural networks are not.' },
  ],
  mindmapMarkdown: `- Gradient Descent + Linear Regression
  - The setup
    - three flats: (1,3) (2,5) (3,8)
    - model: prediction = wx + b
    - w = weight, b = bias
  - Loss
    - residual = prediction - truth
    - MSE = average of squared residuals
    - at w=1,b=1 the loss is 7.0
    - cost surface = a bowl over (w, b)
  - Gradient
    - partial derivative per parameter
    - chain rule on (wx + b - y) squared
    - dJ/dw = 2 x average of error times input
    - dJ/db = 2 x average error
    - points uphill
  - The loop
    - predict, miss, gradient, average, step
    - w := w - alpha x dJ/dw
    - loss 7.0 -> 0.0556 in 200 steps
    - convergence = steps stop changing anything
  - Learning rate alpha
    - 0.001 crawls, loss stuck at 3.0
    - 0.1 works
    - 0.5 explodes to 1e+53
    - loss rising means step too big
  - Variants
    - batch: all rows, exact, slow
    - SGD: one row, cheap, noisy
    - mini-batch: 32-256, the default
    - epoch = one pass over the data
  - The shortcut
    - direct formula gives w=2.5, b=0.333
    - only for this model, cubic cost, needs all data
    - gradient descent needs only a gradient
  - Classic bug
    - summed gradient instead of averaged
    - hidden multiplier equal to the row count
    - loss climbs 7 -> 37 -> 199 -> 1077`,
}

export default m
