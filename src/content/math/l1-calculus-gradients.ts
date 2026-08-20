import type { Module } from '../types'

const m: Module = {
  id: 'math-l1-calculus-gradients',
  subjectId: 'math',
  level: 1,
  title: 'Slopes, Derivatives & the Gradient',
  whyItMatters:
    'One word decides whether the rest of machine learning makes sense to you: gradient. Every training loop, every optimiser, every "the model is learning" claim is built on it. A gradient is not an advanced idea. It is the slope of a hill, written down as a list of numbers, one number per knob you can turn. This module builds that idea from the slope of a straight line, using real arithmetic and a pocket calculator\'s worth of Python, and never asks you to trust a formula you have not watched being produced.',
  assumes: [
    'School algebra: you can substitute a number into an expression like 3x + 1 and get an answer',
    'You have seen a graph: a horizontal axis, a vertical axis, and a curve drawn on them',
    'Basic Python: functions, lists, a for loop, and print',
    'No calculus at all is needed. Derivative, slope at a point, tangent, partial derivative and gradient are all defined here, from scratch.',
  ],
  estMinutes: 36,
  sections: [
    {
      type: 'intuition',
      title: 'Start with a straight line and two real points',
      md: `Take the line **f(x) = 3x + 1**. Pick two points on it and measure how steep it is.

- At x = 2 the height is 3(2) + 1 = **7**. At x = 5 the height is 3(5) + 1 = **16**.
- Going from the first point to the second, the height went up by 16 − 7 = **9**. That is the **rise**.
- Sideways, we moved 5 − 2 = **3**. That is the **run**.
- **Slope = rise / run = 9 / 3 = 3.** The line climbs 3 units of height for every 1 unit sideways.
- Try any other pair of points on this line and you get 3 again. A straight line has one slope, everywhere. That is what "straight" means.

Notice the number 3 was already sitting in the formula, in front of the x. Hold that thought.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The straight-line slope, computed instead of asserted',
      code: `def line(x):
    return 3 * x + 1

x1, x2 = 2.0, 5.0
rise = line(x2) - line(x1)
run = x2 - x1

print('height at x1 =', line(x1), ' height at x2 =', line(x2))
print('rise =', rise, ' run =', run)
print('slope = rise / run =', rise / run)

# ---- real output ----
# height at x1 = 7.0  height at x2 = 16.0
# rise = 9.0  run = 3.0
# slope = rise / run = 3.0`,
      annotations: {
        1: 'Defines the line as a Python function so we can ask it for the height at any x. line(2) means "the height of the line above the point x = 2".',
        2: 'The body: multiply the input by 3 and add 1. This one expression IS the line.',
        4: 'Two sideways positions to measure between. They are written as 2.0 and 5.0, with decimal points, so Python does decimal division later instead of whole-number division.',
        5: 'Rise: the height at the second point minus the height at the first. Subtraction, in that order, so a downhill line gives a negative rise.',
        6: 'Run: how far we moved sideways. Same order of subtraction, so the two match up.',
        8: 'Prints both heights so you can check 7.0 and 16.0 against the arithmetic you did by hand above.',
        9: 'Prints the two ingredients separately. Seeing 9.0 and 3.0 before the division makes the next line obvious rather than magical.',
        10: 'Rise divided by run. The answer 3.0 is the slope, and it matches the 3 sitting in front of x in the formula.',
      },
    },
    {
      type: 'intuition',
      title: 'A curve has a different slope at every point',
      md: `Now bend the line. Take **f(x) = x²**, whose graph is a bowl-shaped curve: at x = 1 the height is 1, at x = 2 it is 4, at x = 3 it is 9.

- Between x = 1 and x = 2 the rise is 4 − 1 = 3 over a run of 1, so the slope there is **3**.
- Between x = 2 and x = 3 the rise is 9 − 4 = 5 over a run of 1, so the slope there is **5**.
- Different answers. On a curve, "the slope" is not one number — it depends on where you stand and how far you look.
- So the question has to become sharper: what is the slope **exactly at** the point x = 3, not averaged over a stretch?
- The answer people agreed on: **imagine the straight line that just touches the curve at that point** and runs alongside it, neither cutting through nor drifting away. That touching line is called the **tangent** at x = 3. The **slope at a point** means the slope of that tangent.

That is a picture, not yet a number. The next section turns it into a number, with arithmetic you can do on paper.`,
    },
    {
      type: 'intuition',
      title: 'Measuring the slope at a point: take a tiny step and look',
      md: `We cannot measure rise over run at a single point, because a single point gives a run of zero and division by zero is nothing. So take a **small** run and shrink it. Standing at x = 3 on f(x) = x², where f(3) = 9:

- Step 1.0 sideways: f(4) = 16. Rise 16 − 9 = 7, run 1.0, slope **7**.
- Step 0.1 sideways: f(3.1) = 9.61. Rise 0.61, run 0.1, slope **6.1**.
- Step 0.01 sideways: f(3.01) = 9.0601. Rise 0.0601, run 0.01, slope **6.01**.
- Step 0.001: slope **6.001**. The answers are marching towards **6** and getting closer every time you shrink the step.
- That settled-on value, 6, is the slope of the tangent at x = 3. It is called the **derivative of f at x = 3**, written f'(3) = 6.

In words: **the derivative at a point is the slope of the curve exactly there**, found by taking a step so small that shrinking it further stops changing the answer. The same number has a second name, **rate of change**: it says the height is changing 6 units for every 1 unit of sideways movement, right at that spot.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Watch the answer settle as the step shrinks',
      code: `def f(x):
    return x * x

def slope_near(x, h):
    return (f(x + h) - f(x)) / h

for h in [1.0, 0.1, 0.01, 0.001, 0.000001]:
    print('h =', h, ' measured slope at x=3 :', slope_near(3.0, h))

# ---- real output ----
# h = 1.0  measured slope at x=3 : 7.0
# h = 0.1  measured slope at x=3 : 6.100000000000012
# h = 0.01  measured slope at x=3 : 6.009999999999849
# h = 0.001  measured slope at x=3 : 6.000999999999479
# h = 1e-06  measured slope at x=3 : 6.000001000927568`,
      annotations: {
        1: 'The curve, as a function. f(3) will give 9.',
        2: 'x * x is x squared, written the boring way on purpose so there is no operator to decode.',
        4: 'A function of two things: the point x we are standing at, and h, the size of the small sideways step.',
        5: 'This single line is the whole measurement: f(x + h) is the height after stepping, minus f(x) the height before, is the rise; dividing by h, the run, gives rise over run.',
        7: 'Loops over five step sizes, each ten or more times smaller than the last. The list is written out explicitly so you can see exactly which steps are being tried.',
        8: 'Prints the step size next to the slope it produced. Reading the column of answers top to bottom is the point of the whole snippet: 7.0, 6.1, 6.01, 6.001, 6.000001.',
      },
    },
    {
      type: 'note',
      md: `Two practical things from that output. **The trailing junk is normal**: 6.000001000927568 instead of a clean 6 is because a computer stores decimals with limited precision, and subtracting two nearly equal numbers throws away digits. A step around 0.000001 is the usual sweet spot: small enough to be accurate, big enough that the rounding noise stays tiny. **And 1e-06 just means 0.000001** — Python's shorthand for a number written with a power of ten.

This measurement has a name you will meet again: a **numerical derivative**, or a finite-difference estimate. Keep it. Later, when you have a formula for a derivative and are not sure it is right, this is how you check it: compute both, see if they agree.`,
    },
    {
      type: 'intuition',
      title: 'From a measurement to a formula',
      md: `Measuring is fine for one point, but we want the slope at *any* point without re-running the experiment. So do the same arithmetic with the letter x instead of the number 3, for f(x) = x².

- Rise: f(x + h) − f(x) = (x + h)² − x².
- Expand (x + h)²: that is x² + 2xh + h². Subtract x² and you are left with **2xh + h²**.
- Divide by the run h: (2xh + h²) / h = **2x + h**.
- Now shrink h towards nothing. The h on the end vanishes and what survives is **2x**.
- So the derivative of x² is **2x**, at every point. Check it at x = 3: 2(3) = 6, which is exactly what the measurement settled on.

That is the whole trick, and it is why nobody measures in practice: once, with letters, gives you a formula that works forever. **The derivative is a formula for the slope at any point**, written f'(x) or dy/dx. Both notations mean the same thing; the second is read "the change in y per unit change in x".`,
    },
    {
      type: 'math',
      intro: 'The definition you just did by hand, plus the three shortcut rules that cover almost everything.',
      latex: [
        "f^{\\prime}(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h} \\qquad \\text{(rise over run, with the run shrunk to nothing)}",
        "\\frac{d}{dx}\\,x^{n} = n\\,x^{n-1} \\qquad \\frac{d}{dx}\\,c = 0 \\qquad \\frac{d}{dx}\\bigl(f + g\\bigr) = f^{\\prime} + g^{\\prime}",
      ],
    },
    {
      type: 'note',
      md: `Read those three rules in plain words, because they are all you need for this module.

- **Power rule:** for x raised to a power, bring the power down in front and lower the power by one. x² becomes 2x. x³ becomes 3x². And x itself, which is x¹, becomes 1x⁰ = 1.
- **Constant rule:** a plain number on its own has a derivative of 0. A flat line has no slope, so changing x does not move it.
- **Sum rule:** the derivative of a sum is the sum of the derivatives. So x² + 3x + 7 has derivative 2x + 3 + 0 = 2x + 3.
- A constant multiplier just rides along: 5x² has derivative 5(2x) = 10x.

The symbol lim with h → 0 in the first line is just shorthand for what you did by hand: "shrink h towards zero and report the value the answer settles on".`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Formula against measurement, at four different points',
      code: `def f(x):
    return x * x

def numeric_slope(x, h=0.000001):
    return (f(x + h) - f(x)) / h

def formula_slope(x):
    return 2 * x

for x in [-2.0, 0.0, 1.5, 3.0]:
    print('x =', x, ' numeric:', round(numeric_slope(x), 4), ' formula 2x:', formula_slope(x))

# ---- real output ----
# x = -2.0  numeric: -4.0  formula 2x: -4.0
# x = 0.0  numeric: 0.0  formula 2x: 0.0
# x = 1.5  numeric: 3.0  formula 2x: 3.0
# x = 3.0  numeric: 6.0  formula 2x: 6.0`,
      annotations: {
        1: 'Same curve as before, x squared.',
        2: 'Same body. Keeping it identical means any difference in the results comes from the method, not the function.',
        4: 'h=0.000001 is a default value: if you call numeric_slope(3.0) without a second argument, Python fills h in for you. That is why the loop below can pass one argument.',
        5: 'The measurement, unchanged from the previous snippet.',
        7: 'The formula we derived with letters. No stepping, no subtraction, no h.',
        8: 'Two times x. One multiplication, and it is correct at every point.',
        10: 'Four test points, chosen to include a negative one and zero, because a formula that is only checked where everything is positive is barely checked at all.',
        11: 'Prints both answers side by side. round(value, 4) chops the floating-point junk to four decimal places so the two columns are readable; without it the numeric column would show 6.000001000927568.',
      },
    },
    {
      type: 'note',
      md: `Look at the row for x = −2: the slope is **−4**, a negative number. The sign of a derivative is a direction. **Positive means the curve is going up as you move right; negative means it is going down.** At x = 0 the slope is exactly 0, which is the bottom of the bowl — flat ground. Sign and size are the two things a derivative tells you, and both matter later.`,
    },
    {
      type: 'intuition',
      title: 'The chain rule: two steps, one number flowing through both',
      md: `Real quantities usually arrive through a pipeline. Suppose x feeds a first step, whose answer feeds a second step.

- **Step 1:** u = 2x + 1. **Step 2:** y = u². So the whole thing is y = (2x + 1)².
- Put x = 3 in. Step 1 gives u = 2(3) + 1 = **7**. Step 2 gives y = 7² = **49**.
- Now ask each step how sensitive it is, on its own. Step 1: u = 2x + 1 is a straight line with slope **2**, so nudging x by a tiny bit moves u twice as much. Step 2: y = u² has derivative 2u, and we are standing at u = 7, so its slope right there is **14** — nudging u moves y fourteen times as much.
- Chain them. A nudge of 1 in x becomes a nudge of 2 in u, and each unit of u is worth 14 units of y. So the nudge in y is 2 × 14 = **28**.
- **dy/dx = 28.** The two sensitivities were **multiplied**, not added. That is the **chain rule**: when one thing feeds another, multiply the slopes along the path.

The multiplication is not a convention to memorise. It is the same reason two gears geared 2:1 and then 7:1 give 14:1 overall — rates that feed each other compound.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'One number through both steps, each slope measured separately',
      code: `def inner(x):
    return 2 * x + 1

def outer(u):
    return u * u

def whole(x):
    return outer(inner(x))

x = 3.0
h = 0.000001
u = inner(x)

print('u = inner(3) =', u, ' y = whole(3) =', whole(x))
print('du/dx =', round((inner(x + h) - inner(x)) / h, 4))
print('dy/du =', round((outer(u + h) - outer(u)) / h, 4))
print('dy/dx =', round((whole(x + h) - whole(x)) / h, 4))

# ---- real output ----
# u = inner(3) = 7.0  y = whole(3) = 49.0
# du/dx = 2.0
# dy/du = 14.0
# dy/dx = 28.0`,
      annotations: {
        1: 'Step 1 of the pipeline, as its own function so we can measure it alone.',
        2: 'Double the input and add one. At x = 3 this returns 7.0.',
        4: 'Step 2 of the pipeline. Its input is named u, not x, to keep straight that it consumes step 1s output.',
        5: 'Square whatever arrives.',
        7: 'The whole pipeline: one function that does both steps.',
        8: 'outer(inner(x)) runs inner first, then hands its answer to outer. That nesting is exactly what "one thing feeds another" looks like in code.',
        10: 'The point we are standing at.',
        11: 'The tiny step size, the same one that worked before.',
        12: 'Compute and keep u = 7.0, because measuring step 2s slope needs the value that actually arrives at step 2, not x itself. Getting this wrong is the single most common chain-rule error.',
        14: 'Prints the forward values: x = 3 produces u = 7 produces y = 49. Check these against the hand arithmetic before reading the slopes.',
        15: 'Measures step 1 alone: nudge x, see how much u moves, divide. Answer 2.0.',
        16: 'Measures step 2 alone: nudge u away from 7.0, see how much y moves, divide. Answer 14.0 — and note it depends on being at 7.0, not at 3.0.',
        17: 'Measures the whole pipeline end to end: nudge x, see how much the final y moves. Answer 28.0, which is 2.0 times 14.0. The chain rule, confirmed by measurement rather than asserted.',
      },
    },
    {
      type: 'math',
      intro: 'The chain rule in symbols. The second line is the same statement with the letters cancelling visibly, which is why most people memorise that form.',
      latex: [
        "y = f\\bigl(g(x)\\bigr) \\quad\\Longrightarrow\\quad \\frac{dy}{dx} = f^{\\prime}\\bigl(g(x)\\bigr)\\cdot g^{\\prime}(x)",
        "\\frac{dy}{dx} = \\frac{dy}{du}\\cdot\\frac{du}{dx} = 14 \\times 2 = 28",
      ],
    },
    {
      type: 'intuition',
      title: 'Partial derivatives: wiggle one input, hold the others still',
      md: `So far one input. Real problems have many. Take **f(x, y) = x² + 3y** and stand at the point x = 2, y = 5, where f = 4 + 15 = **19**.

- Wiggle only x, keeping y frozen at 5. Move x to 2.000001: f becomes (2.000001)² + 15 ≈ 19.000004. Rise 0.000004 over run 0.000001, so the slope in the x direction is **4**.
- Wiggle only y, keeping x frozen at 2. Move y to 5.000001: f becomes 4 + 15.000003 = 19.000003. Slope in the y direction is **3**.
- Each of those is a **partial derivative**: the slope you get when you change ONE input and hold every other input still. Written ∂f/∂x and ∂f/∂y. The curly ∂ instead of a plain d is only a reminder that other inputs existed and were held frozen.
- Computing one is not a new skill. Treat every other letter as a plain number and use the ordinary rules: with y frozen, x² + 3y is "x² plus a constant", whose derivative is 2x = 4. With x frozen, it is "a constant plus 3y", whose derivative is 3.
- Note ∂f/∂y = 3 no matter where you stand, while ∂f/∂x = 2x changes as you move. Partial derivatives are numbers *at a point*, not properties of the function.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Both partials, measured the same way as before',
      code: `def f(x, y):
    return x * x + 3 * y

h = 0.000001
x, y = 2.0, 5.0

d_dx = (f(x + h, y) - f(x, y)) / h
d_dy = (f(x, y + h) - f(x, y)) / h
gradient = [round(d_dx, 4), round(d_dy, 4)]

print('f(2, 5) =', f(x, y))
print('partial with respect to x =', gradient[0])
print('partial with respect to y =', gradient[1])
print('gradient =', gradient)

# ---- real output ----
# f(2, 5) = 19.0
# partial with respect to x = 4.0
# partial with respect to y = 3.0
# gradient = [4.0, 3.0]`,
      annotations: {
        1: 'A function of two inputs now. Python functions take as many arguments as you list.',
        2: 'x squared plus three times y. At (2, 5) this is 4 + 15 = 19.',
        4: 'The same tiny step size, reused.',
        5: 'The point we are standing at. Both values are set on one line; Python allows that.',
        7: 'The x partial: the step h is added to the FIRST argument only, and y is passed through unchanged. That "unchanged" is what holding the other input still means, in code.',
        8: 'The y partial: h goes on the second argument this time, x untouched. Same measurement, different knob.',
        9: 'Collects both numbers into a Python list, in a fixed order: x first, then y. That ordered list is the gradient.',
        11: 'Prints the height at the point, so you can confirm 19.0 before trusting anything computed from it.',
        12: 'gradient[0] reads the first item of the list, the x partial. Lists are numbered from 0 in Python.',
        13: 'gradient[1] reads the second item, the y partial.',
        14: 'Prints the whole list at once: [4.0, 3.0]. Two numbers, one per input, which is the entire content of the word gradient.',
      },
    },
    {
      type: 'intuition',
      title: 'The gradient: the list of all the partials, and it points uphill',
      md: `The **gradient** of f, written ∇f, is exactly what the last line printed: the list of every partial derivative, in a fixed order. At our point it is **[4, 3]**. Nothing more mysterious than that.

- Stop reading it as a list and read it as a **direction**. Standing at (2, 5) on the surface, the arrow that goes 4 units in the x direction and 3 units in the y direction points **straight uphill** — the steepest way up from where you stand.
- Its **length** says how steep: √(4² + 3²) = √25 = **5**. A long gradient means a steep slope. A gradient near zero means near-flat ground.
- Why uphill, rather than some other direction? Because the partial in each direction already says how much f rises per unit of movement along that axis, and the direction that gains the most is the one that leans into each axis in proportion to its own payoff — 4 parts x for every 3 parts y. Leaning any further towards y trades away more x-gain than it buys.
- **Flat ground, where the gradient is all zeros, is the interesting case.** If every partial is 0, nudging any single input in any direction changes nothing to first order. That is the signature of a **local minimum** — a point that is lower than everything immediately around it — or a local maximum, or a flat saddle. The gradient alone cannot tell you which; it only tells you that you have stopped going anywhere.
- "Local" is doing real work in that phrase. A local minimum is the bottom of *its own* dip. Another, deeper dip may exist elsewhere on the surface, and a gradient, which only ever sees the ground under your feet, has no way to know about it.`,
    },
    { type: 'visual', component: 'GradientDescentSlider', props: { fn: 'nonconvex' } },
    {
      type: 'note',
      md: `The ball in that picture is doing exactly the arithmetic you just did. **The slope it feels under itself is the derivative** at that point: one number, measured locally, with no view of the rest of the curve. Two things to watch. It comes to rest at whichever dip it started nearest, not necessarily the deepest one — that is the local-minimum problem, seen rather than argued. And on the flat stretch between the dips it barely moves, because the slope there is nearly zero and a nearly zero slope produces a nearly zero step.`,
    },
    {
      type: 'intuition',
      title: 'Why any of this shows up in learning',
      md: `A model has knobs, and a number that says how wrong it currently is. The partial derivative of that wrongness with respect to one knob says which way that knob makes things worse. The gradient collects all of them, and points uphill — towards *more* wrong.

- So to get less wrong, you move the other way: **against the gradient**. That is the entire connection.
- How big a move to make, how often, and what goes wrong along the way is a subject in itself. It is taught properly in the ML module **Gradient Descent + Linear Regression**. Do not try to learn it here; here, the job is only to be sure you know what the gradient *is*.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: one weight, one data point, by hand',
      md: `A tiny model predicts with one knob w: prediction = w × x. One data point: x = 2, true answer y = 10. The wrongness is the squared error **E(w) = (2w − 10)²**. Start at **w = 3**.

- **Forward.** Inner step: u = 2(3) − 10 = **−4**. Outer step: E = (−4)² = **16**.
- **Backward, with the chain rule.** Outer: E = u² has derivative 2u, and we are at u = −4, so dE/du = **−8**. Inner: u = 2w − 10 has slope **2**, so du/dw = **2**.
- Multiply along the path: dE/dw = (−8) × (2) = **−16**.
- **Check it by measuring.** Nudge w to 3.001: u = −3.998, E = 15.984004. Rise −0.015996 over run 0.001 gives **−15.996**, which is −16 to within the rounding you would expect from a step that is not yet tiny. The formula is right.
- **Read the sign.** dE/dw = −16 is negative, so increasing w *decreases* the error. Moving against the gradient here means moving w up.
- **Take a step.** Move w by a small amount against the gradient: w = 3 − 0.01 × (−16) = **3.16**. New error: u = 2(3.16) − 10 = −3.68, E = **13.5424**. Down from 16. The arithmetic and common sense agree, which is the only sanity check worth running.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake, walked into on purpose',
      md: `Same problem, E(w) = (2w − 10)² at w = 3, but done the way almost everyone does it the first time.

- The wrong reasoning: "it is something squared, and the derivative of a square is two times the thing, so dE/dw = 2(2w − 10) = 2(−4) = **−8**."
- That answer is exactly **half** the true −16, and it is wrong for one reason: it differentiated the outer step and then **forgot the inner step's slope**. The chain rule has two factors, and only one of them was used.
- **Catch it by measuring**, which is why the numerical derivative was taught first. The measurement gave −15.996. The claim was −8. They are not the same number and not close, so the formula is wrong. No argument needed.
- Why the inner factor exists: w does not feed the square directly. It feeds 2w − 10 first, and that step *doubles* every nudge before the square ever sees it. Skipping the factor of 2 is claiming a nudge passes through unchanged, which the printed du/dw = 2.0 says it does not.
- Why it is nasty in practice: a gradient that is off by a constant factor still points in the right *direction*. Steps still reduce the error, just at the wrong size, so nothing visibly breaks and the bug survives. Only the numerical check finds it.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Do these on paper before reading the solutions. A calculator is fine.

1. For the straight line f(x) = 5x + 2, compute the slope between x = 1 and x = 4 using rise over run. Then say what f'(x) is at every point, and why the two answers must match.
2. For f(x) = x², estimate the slope at x = −4 by stepping h = 0.001. Then compare with the formula 2x. Explain what the sign of the answer means about the curve there.
3. Two steps: u = 3x − 1, then y = u³. Find dy/dx at x = 1, using the chain rule. State the value of u first.
4. For f(x, y) = 4x + y², find both partial derivatives at the point (1, 3), write the gradient as a list, and give its length.
5. For f(x) = (x − 2)², the derivative is 2(x − 2). You are standing at x = 5. Which direction — increasing or decreasing x — makes f smaller, and where does f stop decreasing?`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `1. Heights: f(1) = 7, f(4) = 22. Rise 22 − 7 = 15, run 4 − 1 = 3, slope 15/3 = **5**. By the rules, f'(x) = 5 + 0 = **5** everywhere. They must match because the graph is a straight line, and a straight line has the same slope between any two points and at every single point.
2. f(−4) = 16, f(−3.999) = 15.992001. Rise −0.007999, run 0.001, slope ≈ **−7.999**. The formula gives 2(−4) = **−8**; the small gap is the leftover h in 2x + h. The negative sign means the curve is falling as you move right at x = −4 — you are on the left wall of the bowl, heading down towards the bottom at x = 0.
3. At x = 1, u = 3(1) − 1 = **2**. Inner slope: du/dx = **3**. Outer slope: y = u³ has derivative 3u², and at u = 2 that is 3(4) = **12**. Multiply along the path: dy/dx = 12 × 3 = **36**. A numerical check at x = 1 gives 36.00005, which agrees.
4. Freeze y: f = 4x + a constant, so ∂f/∂x = **4**, the same everywhere. Freeze x: f = a constant + y², so ∂f/∂y = 2y = 2(3) = **6**. Gradient = **[4, 6]**. Length = √(16 + 36) = √52 ≈ **7.21**.
5. At x = 5, the derivative is 2(5 − 2) = **+6**: positive, so f rises as x rises. To make f smaller, move **against** it — decrease x. It stops decreasing where the derivative reaches 0, which is 2(x − 2) = 0, so **x = 2**. That is the bottom of the bowl, and f(2) = 0.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. These three notes name ideas you will meet later, so the words are not new when you get there.

- **Two-sided measuring is more accurate.** Instead of (f(x + h) − f(x)) / h, use (f(x + h) − f(x − h)) / 2h: step the same distance both ways and divide by the total run. It costs the same two evaluations and is noticeably more accurate, because the leftover error term cancels by symmetry. It is the version real gradient-checking code uses.
- **Cost, and where the check belongs.** Measuring a gradient numerically costs two evaluations of the function per input. With two inputs that is nothing; with a million model parameters it is two million evaluations for one gradient, which is why numerical differentiation is a debugging tool for a formula you wrote, not a way to train anything. Run it while developing, on a small case, and then leave it out of the code that actually trains.
- **The second derivative.** Differentiate the derivative and you get f'', which says how fast the slope itself is changing — the curvature. A sharply curving valley needs small steps; a wide gentle one tolerates big ones. It carries information a gradient does not, and optimisers such as Adam exist to get some of that benefit cheaply. You will meet it in the ML and DL subjects.`,
    },
  ],
  quiz: [
    {
      question: 'For the line f(x) = 4x - 7, what is the slope between x = 0 and x = 10?',
      options: [
        { text: '4', explanation: 'Correct. Heights are -7 and 33, so rise = 40 over run = 10, giving 4 — the number sitting in front of x.' },
        { text: '40', explanation: 'That is the rise on its own. Slope is rise divided by run, so 40 / 10 = 4.' },
        { text: 'It depends which two points you pick', explanation: 'True for a curve, not for a straight line. A straight line has one slope everywhere; that is what makes it straight.' },
      ],
      correct: 0,
    },
    {
      question: 'You measure the slope of a curve at x = 2 with steps h = 0.1, 0.01 and 0.001 and get 5.1, 5.01 and 5.001. What is the derivative at x = 2?',
      options: [
        { text: '5.001, the most accurate measurement', explanation: 'That is still an estimate with leftover h in it. The pattern shows the answers heading somewhere cleaner.' },
        { text: '5', explanation: 'Correct. The measurements are marching towards 5 as the step shrinks, and that settled-on value is the slope of the tangent at x = 2.' },
        { text: 'The average of the three', explanation: 'The three are not equally good. Each smaller step is strictly better, so averaging drags a good answer back towards a worse one.' },
      ],
      correct: 1,
    },
    {
      question: 'Two steps: u = 5x, then y = u squared. At x = 2, what is dy/dx?',
      options: [
        { text: '20 — the derivative of u squared, evaluated at u = 10, divided by 5', explanation: 'The two slopes multiply, they do not divide. Nothing in the chain rule divides.' },
        { text: '15 — add the two slopes, 5 and 10', explanation: 'Adding is for something else entirely. Rates that feed one another compound, so they multiply.' },
        { text: '100 — inner slope 5, times outer slope 2u = 20 at u = 10', explanation: 'Correct. u = 10 at x = 2, so the outer slope there is 2(10) = 20, and 20 x 5 = 100. Note the outer slope had to be read at u = 10, not at x = 2.' },
      ],
      correct: 2,
    },
    {
      question: 'For f(x, y) = x squared times y, what is the partial derivative with respect to y at the point x = 3, y = 10?',
      options: [
        { text: '60', explanation: 'That is the partial with respect to x: freeze y = 10, giving 10x squared, whose slope is 20x = 60. The question asked about the y knob.' },
        { text: '9', explanation: 'Correct. Freeze x = 3, so x squared = 9 is a constant and f becomes 9y, a straight line in y with slope 9. It does not depend on y at all.' },
        { text: '30', explanation: 'No rule produces this. Freezing x turns the function into 9y, and the slope of 9y is 9.' },
      ],
      correct: 1,
    },
    {
      question: 'At some point the gradient of a loss is [0.02, -8.5]. What does that tell you?',
      options: [
        { text: 'The second knob is a much larger number than the first', explanation: 'Wrong object. A partial derivative says nothing about the value of a knob, only about how much the loss responds to changing it.' },
        { text: 'The loss barely responds to the first knob, and increasing the second knob decreases the loss', explanation: 'Correct on both counts. Size 0.02 versus 8.5 is the responsiveness; the minus sign says the loss goes down as that knob goes up.' },
        { text: 'The second knob is finished and the first still needs work', explanation: 'Backwards. A partial near zero is the flat-ground signal; -8.5 means the loss is steeply sensitive to that knob right now.' },
      ],
      correct: 1,
    },
    {
      question: 'Your formula says the derivative is -8. Measuring with h = 0.000001 gives -15.9999. What is the most likely explanation?',
      options: [
        { text: 'Normal floating-point noise, so the formula is fine', explanation: 'Rounding noise at that step size shows up in the fourth or fifth decimal place, not as a factor of two.' },
        { text: 'The formula dropped a factor — most often the inner step of the chain rule', explanation: 'Correct. Being off by a clean factor of exactly two is the signature of a missing multiplicative factor, and the inner slope is the one people forget.' },
        { text: 'h is too small, so the measurement is meaningless', explanation: 'Too small a step does cause trouble, but it shows as ragged digits, not a stable answer that is exactly twice yours.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'What is a derivative? Explain it without using the word calculus.',
      answer:
        'A derivative is a slope. For a straight line the slope is rise over run, and it is the same everywhere. A curve does not have one slope, so we ask a sharper question: what is the slope exactly at one point? Answer: the slope of the straight line that just touches the curve there, called the tangent. You get its value by taking a very small step sideways, measuring how much the height changed, dividing, and shrinking the step until the answer stops moving. For f(x) = x squared at x = 3, that settles on 6. Doing the same work with letters instead of a number gives a formula, 2x, that works at every point. The sign says which way the curve is heading; the size says how fast.',
      isCaseBased: false,
    },
    {
      question: 'How would you find a derivative if you had no differentiation rules at all?',
      answer:
        'Measure it. Evaluate the function at the point, evaluate it again a tiny step away, subtract to get the rise, divide by the step. That is a numerical or finite-difference derivative, and it is a direct reading of rise over run with a very short run. The step size is a tradeoff: too large and you are measuring an average over a stretch rather than a slope at a point; too small and subtracting two nearly equal numbers destroys precision. Around 0.000001 is usually the sweet spot. The two-sided version, stepping equally in both directions and dividing by the total run, is more accurate for the same cost. Practically this is a checking tool, not a computing tool, because it costs two evaluations per input.',
      isCaseBased: false,
    },
    {
      question: 'Define partial derivative and gradient, and say how they relate.',
      answer:
        'A partial derivative is the slope you measure when you change one input and hold every other input completely still. Mechanically it is an ordinary derivative: treat all the other letters as plain numbers and use the ordinary rules. For f(x, y) = x squared + 3y at (2, 5), freezing y gives 4 and freezing x gives 3. The gradient is simply the list of every partial derivative, in a fixed order, so here it is [4, 3]. The list is worth naming because it reads as a direction: the arrow it describes points the steepest way uphill from where you stand, and its length is how steep that is. All zeros means flat ground under your feet.',
      isCaseBased: false,
    },
    {
      question: 'State the chain rule and explain why the two slopes multiply rather than add.',
      answer:
        'If x feeds a first step and that answer feeds a second, the overall slope is the product of the two step slopes: dy/dx = dy/du times du/dx. Take u = 2x + 1 then y = u squared, at x = 3. The first step doubles any nudge, so du/dx = 2. The second step is 2u evaluated where we actually are, u = 7, so dy/du = 14. Overall 28, confirmed by measuring the whole pipeline directly. They multiply because rates that feed each other compound, exactly like gears: a nudge of one becomes two, and each of those two is worth fourteen. The detail people get wrong is evaluating the outer slope at u, not at x.',
      isCaseBased: false,
    },
    {
      question: 'Case: you have written a derivative formula by hand for a function in your code and you are not sure it is correct. How do you find out?',
      answer:
        'Check it against a measurement, because you can always measure a derivative without knowing any rules. Procedure. (1) Pick a specific point, and prefer a small random-ish point over a tidy one like zero, because zero makes many wrong formulas accidentally agree. (2) Measure numerically with the two-sided difference: (f(p + h) - f(p - h)) divided by 2h, with h around 0.000001. (3) Compare against what your formula claims. (4) Judge by relative difference, not absolute: divide the gap by the size of the numbers involved, so that a formula producing 0.00000001 and one producing 100000000 face the same test. Agreement in the first six or seven digits is a pass; a gap in the first digit is a bug. (5) When it fails, look for a clean ratio first. Off by exactly two, or exactly the value of one input, almost always means a dropped chain-rule factor rather than a subtle error. (6) If the function has several inputs, test each partial separately, stepping one input at a time, so a failure tells you which one is wrong. One caveat worth naming: a function with a sharp corner has no single slope at the corner, so a test point landing on one will fail the check legitimately. Move the point and retest before concluding the formula is broken.',
      isCaseBased: true,
    },
    {
      question: 'Case: a colleague computes the derivative of E(w) = (2w - 10) squared as 2(2w - 10). Their code runs and the error does go down, just oddly slowly. What is wrong and how would you prove it?',
      answer:
        'They differentiated the outer square and forgot the inner step, so the answer is missing the factor du/dw = 2 and is exactly half the true value. At w = 3 the true derivative is 2(-4) times 2 = -16; their formula gives -8. Proving it takes one line of code: nudge w to 3.001, recompute E, and divide the change by 0.001. That measurement returns about -15.996, which matches -16 and not -8, and no debate is needed after that. Why it hid: a derivative that is wrong by a constant positive factor still points the correct direction, so every step still reduces the error and nothing visibly breaks. Only the size of the steps is wrong, which shows up as slow progress rather than an obvious failure. That is exactly why numerical checking exists as a habit rather than as a last resort. The fix is to write the chain out with both factors named separately, compute the inner value first, and then multiply, rather than trying to do the whole derivative in one mental step.',
      isCaseBased: true,
    },
    {
      question: 'Case: someone is minimising f(x) = (x - 2) squared by repeatedly stepping against the derivative. They start at x = 5 and report that f climbs every step instead of falling. Diagnose it.',
      answer:
        'Two candidates, and they are easy to tell apart. First, a sign error: stepping with the derivative rather than against it. At x = 5 the derivative is 2(5 - 2) = +6, so the correct move is downward in x, towards 2. If they wrote new_x = x + step times 6, x runs away to the right and f climbs immediately and smoothly. Second, and more likely given that the direction of the first move usually looks fine: a step size that is far too large. Here the derivative is 2(x - 2), so a step of size s sends the distance from 2 to (1 - 2s) times itself. With s = 0.1 that distance shrinks to 0.8 of its value each time and f falls. With s = 1.5 it becomes -2 times itself, so the point overshoots the bottom, lands further away than it started on the other side, and f climbs while the sign of the derivative flips every step. That alternating sign is the diagnostic signature and it distinguishes this case from the pure sign error, where the derivative keeps the same sign throughout. Fix: print the value each step, confirm the subtraction, then reduce the step until the value falls monotonically.',
      isCaseBased: true,
    },
    {
      question: 'The gradient is zero at some point. What does that tell you, and what does it not?',
      answer:
        'It tells you the ground under your feet is flat: nudging any single input a tiny amount in any direction does not change the value, to first order. Every partial derivative is zero, so no small move gains anything. What it does not tell you is which kind of flat. It could be the bottom of a dip, the top of a hump, or a saddle that goes down one way and up another. It also says nothing about the rest of the surface: a local minimum is the bottom of its own dip only, and a much deeper dip may sit elsewhere. A slope is a purely local measurement, so it can never report on ground it has not touched.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Slope of a straight line', back: 'Rise over run: take two points, divide the change in height by the change in sideways position. For f(x) = 3x + 1 between x = 2 and x = 5: 9 / 3 = 3. The same everywhere on the line.' },
    { front: 'Slope at a point on a curve', back: 'The slope of the tangent — the straight line that just touches the curve at that point. Measure it by taking a tiny sideways step, dividing rise by run, and shrinking the step until the answer stops moving.' },
    { front: 'Derivative', back: 'A formula for the slope at any point, written f\'(x) or dy/dx. Sign = which way the curve is heading (up or down); size = how fast. For x squared it is 2x, so at x = 3 the slope is 6.' },
    { front: 'Numerical derivative', back: '(f(x + h) - f(x)) / h with h around 0.000001 — rise over run with a very short run. Two-sided, (f(x+h) - f(x-h)) / 2h, is more accurate for the same cost. Used to check formulas, not to train.' },
    { front: 'The three rules', back: 'Power: x to the n becomes n times x to the n-1. Constant: a plain number has derivative 0. Sum: derivatives add. So x squared + 3x + 7 has derivative 2x + 3.' },
    { front: 'Chain rule', back: 'When x feeds one step and that feeds another, multiply the slopes: dy/dx = dy/du times du/dx. Evaluate the outer slope at u, not at x. Forgetting the inner factor is the classic error.' },
    { front: 'Partial derivative', back: 'The slope when you wiggle ONE input and hold every other one still. Written with a curly d. Computed by treating the other letters as plain numbers. For x squared + 3y: 2x and 3.' },
    { front: 'Gradient', back: 'The list of all the partial derivatives, in a fixed order — e.g. [4, 3]. Read as a direction it points the steepest way UPHILL; its length is how steep. All zeros means flat ground: a local minimum, maximum or saddle.' },
  ],
  mindmapMarkdown: `- Slopes, Derivatives & the Gradient
  - Straight line
    - rise over run, two real points
    - one slope everywhere
  - Curve
    - slope differs at every point
    - tangent = the line that just touches
    - slope at a point = slope of that tangent
  - Measuring it
    - tiny step h, rise / run
    - 7, 6.1, 6.01, 6.001 -> 6
    - numerical derivative = the checking tool
  - Formula
    - same work with letters -> 2x
    - power, constant, sum rules
    - sign = direction, size = steepness
  - Chain rule
    - u = 2x + 1, then y = u squared
    - 2 x 14 = 28, measured and confirmed
    - evaluate outer slope AT u
    - classic error: dropped inner factor
  - Many inputs
    - partial = wiggle one, freeze the rest
    - gradient = the list of all partials
    - points uphill, length = steepness
    - all zeros -> local minimum, max or saddle
  - Link to learning
    - uphill is more wrong, so step the other way
    - details live in ML: Gradient Descent`,
}

export default m
