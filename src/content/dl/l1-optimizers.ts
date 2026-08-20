import type { Module } from '../types'

const m: Module = {
  id: 'dl-l1-optimizers',
  subjectId: 'dl',
  level: 1,
  title: 'Optimizers: SGD, Momentum, RMSProp & Adam',
  whyItMatters:
    'Plain gradient descent works, and then one day it does not: the loss stops falling, or it explodes, and nothing about the model is wrong. The cause is the shape of the ground the algorithm is walking on. This module starts from a valley where plain gradient descent visibly wastes almost every step, and then builds three repairs on top of it, one small change at a time, with real printed numbers at every stage. By the end you can write momentum, RMSProp and Adam from memory and say which one to reach for and why.',
  assumes: [
    'Read ML\'s *Gradient Descent + Linear Regression* first. This module starts exactly where that one stops.',
    'Read Math\'s *Slopes, Derivatives & the Gradient* first, or at least be comfortable with the word gradient meaning the slope of a surface, one number per knob.',
    'You know what a learning rate is: the number you multiply the gradient by before subtracting it from a parameter.',
    'You have seen a Python for loop, a list, and a function definition. No libraries are used here, not even numpy.',
  ],
  estMinutes: 50,
  sections: [
    {
      type: 'intuition',
      title: 'One valley, two very different slopes',
      md: `In the gradient descent module the surface was a friendly bowl. Real surfaces are not. Here is the simplest unfriendly one.

- The surface has two knobs, call them **x** and **y**. Its height is **loss = 0.5 · (1 · x² + 100 · y²)**.
- The lowest point is x = 0, y = 0. Everything below is about how badly a straightforward algorithm gets there.
- The number 1 and the number 100 are the **steepness** of the two directions. Move one unit in y and the height changes 100 times more than moving one unit in x.
- So the valley is a long narrow canyon: **steep walls in the y direction, an almost flat floor running along x.**
- Start at x = 10, y = 1. You need to travel a long way in x, and barely any distance in y. Unfortunately the gradient says the opposite: at that point the y slope is 100 and the x slope is only 10.

An **optimizer** is the rule that turns the gradient into an actual change to the parameters. Plain gradient descent, the one you already know, is the simplest possible optimizer: *subtract learning rate times gradient*. The rest of this module is about better rules, and each one exists because of something you are about to watch fail.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Plain gradient descent on the canyon, eight steps printed',
      code: `curv = [1.0, 100.0]

def grad(w):
    return [curv[0] * w[0], curv[1] * w[1]]

def loss(w):
    return 0.5 * (curv[0] * w[0] ** 2 + curv[1] * w[1] ** 2)

w = [10.0, 1.0]
lr = 0.019
print('step      x        y      loss')
for t in range(1, 9):
    g = grad(w)
    w = [w[0] - lr * g[0], w[1] - lr * g[1]]
    print(t, '  ', round(w[0], 4), '  ', round(w[1], 4), '  ', round(loss(w), 4))

# ---- real output ----
# step      x        y      loss
# 1    9.81    -0.9    88.618
# 2    9.6236    0.81    79.1119
# 3    9.4408    -0.729    71.136
# 4    9.2614    0.6561    64.41
# 5    9.0854    -0.5905    58.7064
# 6    8.9128    0.5314    53.8405
# 7    8.7435    -0.4783    49.6624
# 8    8.5773    0.4305    46.0504`,
      annotations: {
        1: 'The steepness of each direction, stored in a two-item list: 1.0 for x, 100.0 for y. Everything else reads these two numbers.',
        3: 'Defines a function that returns the gradient at a point w. The point w is a list of two numbers, [x, y].',
        4: 'The gradient of 0.5 * c * w^2 is c * w, done separately for each direction. So the slope in x is 1 * x and the slope in y is 100 * y.',
        6: 'Defines the height of the surface, so we can print it and watch whether it actually falls.',
        7: 'The formula from the section above, written out. The ** operator is Python for "to the power of".',
        9: 'The starting point: far out along the flat floor, slightly off-centre in the steep direction.',
        10: 'The learning rate. 0.019 is chosen deliberately: it is just under the largest value the steep direction tolerates, which is explained right after this run.',
        11: 'A header line so the printed columns can be read. It is plain text, nothing is computed here.',
        12: 'Repeat the update eight times. t counts 1 to 8 and is only used for printing.',
        13: 'Read the slope at wherever we currently stand. This is the one line that every optimizer in this module shares.',
        14: 'The plain gradient descent update: each parameter moves against its own slope, both scaled by the same learning rate. This single line is what the next three sections replace.',
        15: 'Print the step number, both parameters and the height, rounded to 4 decimal places so the columns line up.',
      },
    },
    {
      type: 'note',
      md: `Read the y column first: **1, then -0.9, then 0.81, then -0.729**. The sign flips on every single step. That is a **zigzag** — the step in y is so large that it jumps clean over the bottom of the canyon and lands on the opposite wall, slightly closer than before. Nine tenths of the y movement is undone by the next step.

Now read the x column: **10 down to 8.5773 in eight steps**. At that rate reaching x = 0 takes hundreds of steps. The direction that actually needs to travel is the one that is crawling.

Both symptoms come from one number: 0.019 is the learning rate for **both** knobs. It is too big for y and far too small for x.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'What happens if you raise the learning rate to fix the crawl',
      code: `w = [10.0, 1.0]
lr = 0.021
for t in range(1, 7):
    g = grad(w)
    w = [w[0] - lr * g[0], w[1] - lr * g[1]]
    print(t, '  ', round(w[0], 4), '  ', round(w[1], 4), '  ', round(loss(w), 4))

# ---- real output ----
# 1    9.79    -1.1    108.422
# 2    9.5844    1.21    119.1355
# 3    9.3831    -1.331    132.5997
# 4    9.1861    1.4641    149.3716
# 5    8.9932    -1.6105    170.1258
# 6    8.8043    1.7716    195.6795`,
      annotations: {
        1: 'Same starting point as before, so the two runs are directly comparable.',
        2: 'The only change in the whole snippet: 0.019 became 0.021, a rise of about ten percent.',
        3: 'Six steps is enough to see the pattern, so this loop is shorter.',
        4: 'Same gradient function, unchanged.',
        5: 'Same plain update, unchanged.',
        6: 'Same print. Watch the loss column rather than x this time.',
      },
    },
    {
      type: 'note',
      md: `A ten percent rise in the learning rate turned the run from slowly-converging into diverging: **y goes 1, -1.1, 1.21, -1.331** — each bounce is larger than the last, and the loss climbs from 88 to 195 and keeps going.

The rule behind it is worth knowing as a number. In a direction with steepness **c**, the update multiplies that coordinate by **(1 − lr · c)** every step. The coordinate shrinks only if that multiplier sits between −1 and 1, which means **lr must be less than 2/c**.

- For y, c = 100, so lr must be below **2/100 = 0.02**. That is why 0.019 survived and 0.021 exploded.
- For x, c = 1, and at lr = 0.019 the multiplier is 0.981. Each step shrinks x by under two percent.

So the steep direction sets the ceiling on the learning rate, and the flat direction is then stuck with a step that is a hundred times smaller than it wants. **One learning rate cannot serve two steepnesses.** That is the problem. There are exactly two sensible ways out: remember where you were going (momentum), or give each parameter its own step size (adaptive methods). Adam does both.`,
    },
    {
      type: 'intuition',
      title: 'Momentum: remember the last few gradients instead of only the newest',
      md: `A ball rolling down the canyon does not zigzag, because it carries speed from previous moments. Momentum is that idea written as two lines of arithmetic.

- Keep an extra list of numbers called the **velocity**, one per parameter, starting at zero. Velocity is just a running summary of the recent gradients.
- Each step, update it: **velocity = beta · velocity + gradient**, with beta a number below 1, usually **0.9**.
- Then step against the velocity instead of against the raw gradient: **w = w − lr · velocity**.
- **Momentum** is the name of this whole rule. The velocity is the memory it adds.
- Why it fixes the zigzag: in the y direction the gradient flips sign every step, so a positive contribution and a negative one land in the velocity one after the other and **cancel**. In the x direction every gradient points the same way, so they **add up** and the velocity grows.

The velocity is a **moving average**: a number that is updated by keeping most of its old value and mixing in a little of the new measurement, instead of being recomputed from scratch. With beta = 0.9 each old gradient survives at 0.9, then 0.81, then 0.729, and so on, so roughly the last ten gradients still matter. That is where the familiar statement "beta = 0.9 remembers about ten steps" comes from: 1/(1 − 0.9) = 10.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Momentum by hand, same valley, same learning rate',
      code: `w = [10.0, 1.0]
v = [0.0, 0.0]
lr = 0.019
beta = 0.9
print('step   vx       vy       x        y       loss')
for t in range(1, 9):
    g = grad(w)
    v = [beta * v[0] + g[0], beta * v[1] + g[1]]
    w = [w[0] - lr * v[0], w[1] - lr * v[1]]
    print(t, '  ', round(v[0], 3), '  ', round(v[1], 3), '  ', round(w[0], 4), '  ', round(w[1], 4), '  ', round(loss(w), 4))

# ---- real output ----
# step   vx       vy       x        y       loss
# 1    10.0    100.0    9.81    -0.9    88.618
# 2    18.81    0.0    9.4526    -0.9    85.1759
# 3    26.382    -90.0    8.9514    0.81    72.8684
# 4    32.695    -0.0    8.3302    0.81    67.5008
# 5    37.755    81.0    7.6128    -0.729    55.5494
# 6    41.593    0.0    6.8225    -0.729    49.8456
# 7    44.256    -72.9    5.9817    0.6561    39.4136
# 8    45.812    -0.0    5.1112    0.6561    34.5858`,
      annotations: {
        1: 'Identical starting point to the plain run, so the two output tables can be compared row by row.',
        2: 'The new thing: one velocity number per parameter, both starting at zero because no gradient has been seen yet.',
        3: 'The same learning rate 0.019 that plain gradient descent used. Nothing is being smuggled in here.',
        4: 'How much of the old velocity survives each step. 0.9 is the standard value in every framework.',
        5: 'Header for six printed columns, including the velocity so you can watch it build and cancel.',
        6: 'Eight steps again, matching the first run exactly.',
        7: 'Read the gradient at the current point, unchanged from before.',
        8: 'The first of the two momentum lines: keep 90 percent of the old velocity and add the new gradient on top. Done separately for each parameter.',
        9: 'The second momentum line: step against the velocity, not against the raw gradient. This is the only other change.',
        10: 'Print velocity first, then position, then height.',
      },
    },
    {
      type: 'note',
      md: `Compare the two tables at step 8. Plain gradient descent had **x = 8.5773, loss 46.05**. Momentum, at the very same learning rate, has **x = 5.1112, loss 34.59**. It has covered five times as much ground along the floor.

The velocity columns show exactly why.

- **vy goes 100, 0, −90, 0, 81, 0.** The steep direction produces a gradient of +100, then the next gradient is −90, and 0.9 · 100 − 90 is exactly zero. The bounce cancels itself inside the velocity, so half the y steps are not taken at all.
- **vx goes 10, 18.81, 26.38, 32.7, 37.8, 41.6, 44.3, 45.8.** The flat direction produces the same sign every step, so the velocity piles up and settles near ten times the raw gradient — which is 1/(1 − 0.9) again.

That is the whole trick: momentum multiplies your speed along any direction you keep agreeing about, and quietly deletes the directions you keep changing your mind about.`,
    },
    {
      type: 'intuition',
      title: 'The other repair: give every parameter its own step size',
      md: `Momentum still hands both knobs the same learning rate. The second family of optimizers attacks that directly.

- A **per-parameter step size** means exactly what it says: x moves by its own amount and y moves by its own amount, and the two amounts do not have to be related.
- An **adaptive learning rate** is a per-parameter step size that the optimizer computes for itself from the gradients it has already seen, instead of you choosing it.
- The rule that works: **divide each parameter\'s step by how big its own gradients have recently been.** A knob with huge gradients gets damped; a knob with tiny gradients gets amplified.
- To measure "how big have this parameter\'s gradients recently been", keep a moving average of the **squared** gradient — squared so that +100 and −100 both count as large.
- That average is usually written **s**, and updated as **s = 0.9 · s + 0.1 · gradient²**. Then the step is **lr · gradient / sqrt(s)**.

This optimizer is called **RMSProp**. The name is just a description of the formula: root, mean, square, of the gradient, used to scale the step. Note what the division does when the gradient is steady: gradient / sqrt(gradient²) = 1, so the step size becomes roughly lr for every parameter, whatever its gradients look like.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'RMSProp: one division added to plain gradient descent',
      code: `w = [10.0, 1.0]
s = [0.0, 0.0]
lr = 0.5
print('step  step_x   step_y      x        y      loss')
for t in range(1, 9):
    g = grad(w)
    s = [0.9 * s[0] + 0.1 * g[0] ** 2, 0.9 * s[1] + 0.1 * g[1] ** 2]
    step_x = lr * g[0] / (s[0] ** 0.5 + 1e-8)
    step_y = lr * g[1] / (s[1] ** 0.5 + 1e-8)
    w = [w[0] - step_x, w[1] - step_y]
    print(t, '  ', round(step_x, 4), '  ', round(step_y, 4), '  ', round(w[0], 4), '  ', round(w[1], 4), '  ', round(loss(w), 4))

# ---- real output ----
# step  step_x   step_y      x        y      loss
# 1    1.5811    1.5811    8.4189    -0.5811    52.3247
# 2    1.0495    -0.8259    7.3694    0.2448    30.1498
# 3    0.8258    0.3572    6.5436    -0.1124    22.0414
# 4    0.6944    -0.1719    5.8492    0.0595    17.2836
# 5    0.6046    0.0957    5.2446    -0.0362    13.8187
# 6    0.5374    -0.0614    4.7073    0.0252    11.1108
# 7    0.484    0.0449    4.2232    -0.0198    8.9375
# 8    0.4397    -0.0372    3.7836    0.0174    7.1729`,
      annotations: {
        1: 'The same starting point yet again.',
        2: 'The new state: one squared-gradient average per parameter, both starting at zero.',
        3: 'The learning rate is now 0.5, twenty-six times larger than plain gradient descent could survive. It is safe because the division below rescales every step down to about this size in parameter units.',
        4: 'Header. step_x and step_y are printed so you can see the two knobs get different treatment.',
        5: 'Eight steps, same as the other runs.',
        6: 'Same gradient read.',
        7: 'The moving average of the squared gradient: keep 90 percent of the old value, add 10 percent of the newest squared gradient. Squaring makes sign irrelevant, so only magnitude is tracked.',
        8: 'The x step: the raw gradient divided by the square root of its own recent size. ** 0.5 is Python for square root. The 1e-8 is a tiny number added so that a parameter whose gradients are all zero divides by 1e-8 instead of by 0, which would crash.',
        9: 'The y step, computed from y\'s own history. Nothing here refers to x — that is what per-parameter means.',
        10: 'Apply both steps.',
        11: 'Print the two step sizes and the resulting position.',
      },
    },
    {
      type: 'note',
      md: `Look at the first printed row: **step_x = 1.5811 and step_y = 1.5811**. Identical. At that moment the x gradient was 10 and the y gradient was 100 — a factor of a hundred apart — and both knobs still moved by the same amount. The division erased the difference in steepness, which is exactly what the canyon needed.

After eight steps RMSProp is at **loss 7.17**, against 46.05 for plain gradient descent and 34.59 for momentum. It also has y nearly pinned at zero, because y\'s steps shrink as soon as its gradients shrink.

What RMSProp does not have is momentum. Its direction is still the raw gradient, so it inherits the small sign flips you can see in the y column. The obvious idea is to use both repairs at once.`,
    },
    {
      type: 'intuition',
      title: 'Adam, assembled from the two pieces you already have',
      md: `**Adam** is momentum and RMSProp running at the same time, plus one correction. Nothing else. Written as a list of what it stores:

- **m** — a moving average of the gradient. This is momentum\'s velocity, written in the averaging form **m = 0.9 · m + 0.1 · gradient**. It supplies the *direction*.
- **s** — a moving average of the squared gradient, exactly RMSProp\'s. It supplies the *size*.
- The step is **lr · m / sqrt(s)**: go the way momentum says, by the amount RMSProp allows.
- The two averages use different memory lengths. **beta1 = 0.9** for m, about ten steps, because direction should react quickly. **beta2 = 0.999** for s, about a thousand steps, because a size estimate should be steady rather than jumpy.
- One consequence worth saying out loud: since m and s are built from the same gradients, m/sqrt(s) is about 1 in size, so **an Adam step is roughly lr, no matter how large or small the gradient is.** That is why Adam tolerates learning rates that would destroy plain gradient descent.

There is one flaw left, and it comes from those two averages both starting at zero.`,
    },
    {
      type: 'intuition',
      title: 'Bias correction: undoing the zero that both averages start from',
      md: `Suppose the very first gradient a parameter sees is 100, and it will keep being about 100.

- After one step, **m = 0.9 · 0 + 0.1 · 100 = 10**. The true recent gradient is 100, so m is **ten times too small**.
- After one step, **s = 0.999 · 0 + 0.001 · 100² = 10**. The true value is 10000, so s is **a thousand times too small**, and sqrt(s) is about **31.6 times too small**.
- Both are underestimates, and for the same reason: the average has only been filled up a little, but it is still being read as though it were full. This systematic error is called **bias**, and undoing it is called **bias correction**.
- The fix is arithmetic, not a hack. After t steps the weights that have actually gone into the average add up to **(1 − beta^t)**, so dividing by that number restores the right scale: **m̂ = m/(1 − 0.9^t)** and **ŝ = s/(1 − 0.999^t)**.
- Check it at t = 1: m̂ = 10/0.1 = 100, exactly the gradient. ŝ = 10/0.001 = 10000, exactly the squared gradient. As t grows, beta^t goes to zero, the divisor goes to 1, and the correction switches itself off.

There is a subtlety worth catching, because it decides which way an uncorrected Adam misbehaves. Each average alone is too small, but they are wrong by *different* amounts, and the s one is in a denominator. m is 10 times too small; sqrt(s) is 31.6 times too small; the ratio m/sqrt(s) therefore comes out about **3.16 times too large**. So skipping bias correction does not make the first steps timid — it makes them roughly three times too big, right at the start, when the weights are most fragile.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The first Adam step, with and without bias correction',
      code: `g = 100.0
m = 0.9 * 0.0 + 0.1 * g
s = 0.999 * 0.0 + 0.001 * g * g
print('after one step:  m =', m, '  s =', s)
print('uncorrected  m / sqrt(s)       =', round(m / s ** 0.5, 4))
mhat = m / (1 - 0.9 ** 1)
shat = s / (1 - 0.999 ** 1)
print('corrected    mhat / sqrt(shat) =', round(mhat / shat ** 0.5, 4))

# ---- real output ----
# after one step:  m = 10.0   s = 10.0
# uncorrected  m / sqrt(s)       = 3.1623
# corrected    mhat / sqrt(shat) = 1.0`,
      annotations: {
        1: 'One gradient of size 100, the y gradient from the very first step of every run above.',
        2: 'The first moving average after one update, starting from zero. 0.1 is (1 - beta1).',
        3: 'The squared-gradient average after one update, starting from zero. 0.001 is (1 - beta2). Note both land on 10.0 by coincidence of the numbers chosen.',
        4: 'Print the two raw averages so the sizes are visible before anything is divided.',
        5: 'The step multiplier Adam would use with no correction: 3.16, when it should be 1.',
        6: 'Bias-correct m by dividing by the weight actually accumulated after t = 1 step, which is (1 - 0.9) = 0.1.',
        7: 'Bias-correct s the same way, dividing by (1 - 0.999) = 0.001.',
        8: 'Print the corrected multiplier. It is exactly 1.0, so the first Adam step moves each parameter by exactly the learning rate — a clean, predictable start.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Full Adam: momentum plus per-parameter scaling plus bias correction',
      code: `w = [10.0, 1.0]
m = [0.0, 0.0]
s = [0.0, 0.0]
lr = 1.0
for t in range(1, 13):
    g = grad(w)
    m = [0.9 * m[0] + 0.1 * g[0], 0.9 * m[1] + 0.1 * g[1]]
    s = [0.999 * s[0] + 0.001 * g[0] ** 2, 0.999 * s[1] + 0.001 * g[1] ** 2]
    mhat = [m[0] / (1 - 0.9 ** t), m[1] / (1 - 0.9 ** t)]
    shat = [s[0] / (1 - 0.999 ** t), s[1] / (1 - 0.999 ** t)]
    w = [w[0] - lr * mhat[0] / (shat[0] ** 0.5 + 1e-8), w[1] - lr * mhat[1] / (shat[1] ** 0.5 + 1e-8)]
    print(t, '  ', round(w[0], 4), '  ', round(w[1], 4), '  ', round(loss(w), 4))

# ---- real output ----
# 1    9.0    0.0    40.5
# 2    8.0041    -0.6701    54.4819
# 3    7.0159    -0.7444    52.3159
# 4    6.0394    -0.4902    30.2533
# 5    5.0796    -0.1085    13.4902
# 6    4.1424    0.2574    11.8921
# 7    3.2342    0.4866    17.0693
# 8    2.3626    0.5279    16.7227
# 9    1.5358    0.409    9.5453
# 10    0.7625    0.1914    2.1217
# 11    0.0513    -0.0556    0.156
# 12    -0.5894    -0.2622    3.6106`,
      annotations: {
        1: 'Same start as every other run in this module.',
        2: 'Adam\'s first stored list: the moving average of the gradient. This is momentum.',
        3: 'Adam\'s second stored list: the moving average of the squared gradient. This is RMSProp.',
        4: 'A learning rate of 1.0, which is enormous by plain gradient descent standards and completely safe here because each Adam step is about lr in size regardless of the gradient.',
        5: 'Twelve steps, because Adam gets close enough to the bottom to show what happens when it arrives.',
        6: 'The same gradient read as always.',
        7: 'Momentum line, in averaging form: 90 percent old, 10 percent new.',
        8: 'RMSProp line: 99.9 percent old, 0.1 percent new squared gradient. The much longer memory is the point of beta2.',
        9: 'Bias-correct the gradient average, using the current step number t. Early on this divisor is small and the correction is large; by t = 50 it is almost 1.',
        10: 'Bias-correct the squared-gradient average the same way.',
        11: 'The whole Adam update on one line: direction from corrected m, size from corrected s, both scaled by lr. The 1e-8 guards against dividing by zero.',
        12: 'Print position and height each step.',
      },
    },
    {
      type: 'note',
      md: `Read the x column: **10, 9.0, 8.0, 7.0, 6.0** — a step of almost exactly 1.0, which is the learning rate, every time. Adam turned a gradient of 10 in x and 100 in y into two steps of the same size, and then held that size steady.

Where the four runs stand after their comparable runs on this valley: plain gradient descent **loss 46.05** at step 8, momentum **34.59** at step 8, RMSProp **7.17** at step 8, Adam **0.156** at step 11. Adam is not magic; it is momentum and RMSProp added together, and each of those was one line.

Also notice step 12: x has gone past zero to −0.5894 and the loss ticks back up. A fixed step size of 1.0 cannot land on a target that is 0.05 away. That is the argument for shrinking the learning rate as training goes on, which is the next section.`,
    },
    { type: 'visual', component: 'OptimizerRace', props: {} },
    {
      type: 'note',
      md: 'Three things to look for in that picture. Plain **SGD** saws back and forth against the wall of the canyon, and every saw is wasted work. **Momentum** lets the sideways bounces cancel and the forward drift add up, so it drives along the floor. **Adam** rescales each direction, so the steep one stops dominating and the path is nearly straight. Then drag the learning-rate slider upwards: SGD reaches "diverged" first, momentum later, and Adam is still walking. That order is the same story the printed tables told.',
    },
    {
      type: 'intuition',
      title: 'Weight decay, and why Adam needed its own version',
      md: `**Weight decay** means shrinking every parameter slightly towards zero on every step, on purpose, so the model does not lean too hard on any one input. The traditional way to do it is to add a term to the loss whose gradient is **lambda · w**, with lambda a small number like 0.01.

- Inside plain gradient descent that works exactly as advertised: the update gains a **− lr · lambda · w** piece, so every weight shrinks by the same fraction each step.
- Inside Adam it does not. That lambda · w piece gets added to the gradient, and then the whole gradient is divided by sqrt(ŝ).
- So a parameter with large recent gradients has a large sqrt(ŝ) and its decay is divided down to almost nothing, while a quiet parameter is decayed hard. That is backwards from "shrink everything equally".
- **AdamW** fixes it by keeping the two jobs apart: do the normal Adam step, then subtract **lr · lambda · w** separately, untouched by the division.
- That one change is why AdamW, not Adam, is the default for training transformers today, with lambda usually between 0.01 and 0.1.`,
    },
    {
      type: 'intuition',
      title: 'Learning-rate schedules: three ways to shrink lr over time',
      md: `A **schedule** is a rule that changes the learning rate as training proceeds, instead of leaving it fixed. The reason is the one you just saw: a step size that is right for crossing the valley is too big for settling at the bottom.

**Step decay.** Keep the learning rate fixed for a long stretch, then multiply it by 0.1, then repeat. For example: 0.001 for the first 400 steps, 0.0001 for the next 400, 0.00001 after that. It is easy to reason about, and you can see the loss drop each time the rate is cut. The awkward part is choosing where the cuts go.

**Cosine decay.** Slide the learning rate smoothly from its starting value down to nearly zero across the whole run, following the shape of half a cosine curve: fast at the start, slow and gentle at the end. It needs no cut points, only the total number of steps, which is why it has become the common default.

**Warmup.** Start the learning rate at nearly zero and raise it over the first one to five percent of steps, then hand over to one of the decays. This is the opposite of shrinking, and it exists for a specific reason: at step 1 Adam\'s s has been built from a single gradient, so the per-parameter sizes are based on almost no evidence. Bias correction fixes the systematic part of that error but not the randomness. Warmup simply refuses to take a full-size step until the estimates have some data behind them.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The three schedules, printed at seven moments of a 1000-step run',
      code: `import math
base = 0.001
total = 1000
warm = 100

def step_decay(t):
    return base * 0.1 ** (t // 400)

def cosine(t):
    return 0.5 * base * (1 + math.cos(math.pi * t / total))

def warmup_then_cosine(t):
    if t < warm:
        return base * t / warm
    return 0.5 * base * (1 + math.cos(math.pi * (t - warm) / (total - warm)))

print('step   step_decay      cosine      warmup+cosine')
for t in [0, 50, 100, 400, 500, 800, 999]:
    print(t, ' ', round(step_decay(t), 6), ' ', round(cosine(t), 6), ' ', round(warmup_then_cosine(t), 6))

# ---- real output ----
# step   step_decay      cosine      warmup+cosine
# 0   0.001   0.001   0.0
# 50   0.001   0.000994   0.0005
# 100   0.001   0.000976   0.001
# 400   0.0001   0.000655   0.00075
# 500   0.0001   0.0005   0.000587
# 800   1e-05   9.5e-05   0.000117
# 999   1e-05   0.0   0.0`,
      annotations: {
        1: 'math is part of Python itself, no install needed. It is imported for cos and pi.',
        2: 'The starting learning rate that all three schedules shrink from.',
        3: 'How many steps the whole training run lasts. Cosine needs to know this.',
        4: 'How many steps the warmup ramp lasts: 100 out of 1000, which is ten percent.',
        6: 'Step decay as a function of the step number t.',
        7: 'The // operator is integer division: t // 400 is 0, then 1, then 2 as t passes 400 and 800. So this multiplies base by 0.1 once per completed block of 400 steps.',
        9: 'Cosine decay as a function of t.',
        10: 'cos runs from +1 at t = 0 to -1 at t = total, so (1 + cos) runs from 2 to 0 and the half in front makes the result run from base down to 0.',
        12: 'Warmup followed by cosine.',
        13: 'During the first 100 steps, take the warmup branch.',
        14: 'Warmup is a straight line: at t = 0 the rate is 0, at t = warm it is base.',
        15: 'After warmup, the same cosine as above but measured from the end of the ramp, so it still finishes at 0 on the last step.',
        17: 'Header row for the printed table.',
        18: 'Seven step numbers chosen to show the interesting moments: the start, mid-warmup, the end of warmup, a step-decay cut, halfway, late, and the last step.',
        19: 'Print all three learning rates side by side at that moment, rounded to six decimals.',
      },
    },
    {
      type: 'intuition',
      title: 'What to actually use',
      md: `A short, honest answer, because you will be asked.

- **Default: AdamW, learning rate 3e-4 for a model trained from scratch, or 1e-5 to 5e-5 for finetuning an existing one, with warmup over the first few percent of steps and then cosine decay.** It works across architectures with almost no tuning, which is worth more than a small final gain.
- **Plain SGD with momentum 0.9** is still competitive for image models, and on those benchmarks a well-tuned SGD run has often ended a fraction of a percent ahead of Adam. The cost is that you must tune the learning rate and its schedule properly, where AdamW mostly works out of the box.
- For language models and transformers, AdamW is not a preference, it is the working option. SGD does not train them well.
- Tune the learning rate first, and roughly, by factors of three. Then the schedule. beta1, beta2 and the 1e-8 almost never repay the compute spent tuning them.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: three momentum steps computed with a calculator',
      md: `Same valley, steepness 1 in x and 100 in y. Start at x = 10, y = 1, with lr = 0.019 and beta = 0.9. Velocity starts at 0 for both. Work down the page; every number matches the printed table above.

**Step 1.** Gradients: gx = 1 · 10 = **10**, gy = 100 · 1 = **100**.
- vx = 0.9 · 0 + 10 = **10**. vy = 0.9 · 0 + 100 = **100**.
- x = 10 − 0.019 · 10 = **9.81**. y = 1 − 0.019 · 100 = **−0.9**.
- y has jumped over the bottom and landed on the other wall, exactly as plain gradient descent did.

**Step 2.** Gradients at the new point: gx = **9.81**, gy = 100 · (−0.9) = **−90**.
- vx = 0.9 · 10 + 9.81 = **18.81**. The old speed and the new gradient point the same way, so they add.
- vy = 0.9 · 100 + (−90) = **0**. The old speed and the new gradient are opposite and cancel to nothing.
- x = 9.81 − 0.019 · 18.81 = **9.4526**. y = −0.9 − 0.019 · 0 = **−0.9**, unchanged.
- This is the whole mechanism in one line of arithmetic: the useless bounce was cancelled before it was ever taken.

**Step 3.** Gradients: gx = **9.4526**, gy = 100 · (−0.9) = **−90** again.
- vx = 0.9 · 18.81 + 9.4526 = **26.382**. Still growing.
- vy = 0.9 · 0 − 90 = **−90**.
- x = 9.4526 − 0.019 · 26.382 = **8.9514**. y = −0.9 + 0.019 · 90 = **0.81**.

After three steps momentum has moved x by 1.049, while plain gradient descent moved it by 0.559 over the same three steps. The velocity in x is already 2.8 times the raw gradient, and it will settle near ten times it.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: turning beta up because more smoothing sounds better',
      md: `Momentum with beta = 0.9 works, so a reasonable-sounding idea is that beta = 0.99 will work better: a longer average must be smoother. Here is that exact run, same valley, same lr = 0.019, only beta changed.

- step 1 — x = 9.81
- step 5 — x = 7.3107
- step 9 — x = 2.7723
- step 11 — x = **0.1677**, essentially at the bottom, loss 5.75
- step 13 — x = **−2.3977**
- step 16 — x = **−5.7572**
- step 20 — x = **−8.5165**, loss **112.5**

It reached the minimum at step 11 and then sailed straight past it, ending further from the target than it started, with a loss higher than the one it began with. The beta = 0.9 run, by contrast, is at loss 3.95 by step 30 and still improving.

**Why.** The velocity is a running total of the recent gradients, and it settles at roughly gradient/(1 − beta). At beta = 0.9 that factor is 10; at beta = 0.99 it is **100**. So the effective step along a consistent direction is ten times larger than before, even though the learning rate on screen never changed. Worse, when the walker crosses the bottom, the stored velocity is an average of the last hundred gradients, almost all of which were pointing the old way. It takes many steps of opposing gradient before the velocity even changes sign, and during all of them the walker keeps moving in the wrong direction.

**How to spot it.** The signature is a loss that falls, reaches a good value, and then climbs again in a slow smooth arc — not the jagged explosion you get from a learning rate that is simply too big. Slow and smooth means momentum; jagged and immediate means the step size.

**The fix.** Either put beta back to 0.9, or, if you genuinely want a longer memory, cut the learning rate by the same factor you increased 1/(1 − beta) by. Going from beta 0.9 to 0.99 multiplies effective speed by 10, so lr must be divided by about 10 to compensate.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Paper and a calculator only. Solutions are in the next section.

1. A valley has steepness 1 in one direction and 50 in the other. What is the largest learning rate plain gradient descent can use without diverging? At that learning rate, by what fraction does the shallow direction shrink per step, and roughly how many steps does it take to halve?
2. Momentum with beta = 0.5, and a gradient that is exactly 2 on every step. Compute the velocity after steps 1, 2 and 3, and state the value it is heading towards.
3. Adam, first step, one parameter whose gradient is 0.5. Compute m and s with beta1 = 0.9, beta2 = 0.999. Then compute m/sqrt(s) without bias correction, and m̂/sqrt(ŝ) with it.
4. RMSProp with lr = 0.01. Two parameters have been receiving steady gradients of 10 and 0.1 respectively for a long time, so their s values have settled. How big is each step? What would plain gradient descent at the same lr have done?
5. A colleague had a working SGD run at lr = 0.1. They switched the optimizer to Adam, kept lr = 0.1, and the loss immediately became garbage. Explain what changed and give them a starting learning rate.`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `1. The steep direction sets the limit: lr < 2/50 = **0.04**. In the shallow direction the per-step multiplier is 1 − lr · 1 = 1 − 0.04 = **0.96**, so it shrinks by 4 percent per step. Halving needs 0.96^n = 0.5, and since 0.96^17 ≈ 0.50, that is about **17 steps** — while the steep direction is finishing in one or two. The ratio 50 between the two steepnesses is precisely the handicap.

2. v1 = 0.5 · 0 + 2 = **2**. v2 = 0.5 · 2 + 2 = **3**. v3 = 0.5 · 3 + 2 = **3.5**. It is heading for the value that stops changing, v = 0.5v + 2, which gives v = 2/(1 − 0.5) = **4**. So beta = 0.5 doubles your speed on a consistent direction, and beta = 0.9 multiplies it by ten.

3. m = 0.9 · 0 + 0.1 · 0.5 = **0.05**. s = 0.999 · 0 + 0.001 · 0.25 = **0.00025**, so sqrt(s) = **0.015811**. Uncorrected: 0.05/0.015811 = **3.162**, more than three times too large. Corrected: m̂ = 0.05/0.1 = **0.5**, ŝ = 0.00025/0.001 = **0.25**, sqrt(ŝ) = **0.5**, and 0.5/0.5 = **1.0** exactly. The 3.162 is sqrt(1000)/10 and does not depend on the gradient at all, which is why it shows up in every first Adam step.

4. Once s has settled with a steady gradient, s ≈ gradient², so sqrt(s) ≈ the gradient itself, and the step is lr · g/g = **0.01 for both parameters**. Plain gradient descent at the same lr would have moved the first parameter by 0.01 · 10 = **0.1** and the second by 0.01 · 0.1 = **0.001**, a hundredfold difference. RMSProp made them equal, which is the point.

5. The two learning rates measure different things. In SGD the step is lr · gradient, so lr is a multiplier on the gradient and its safe value depends on how steep the surface is. In Adam the step is about lr regardless of the gradient, so lr is a distance in parameter space. Setting it to 0.1 tells Adam to move every single weight by about 0.1 on every step, which for a network whose weights are around 0.05 in size means the model is being rewritten from scratch each step. Start at **1e-3**, or 3e-4 with warmup, and tune from there. The general rule: never carry a learning rate across a change of optimizer.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. These are the names you will hear next, each in a few lines.

- **AdaGrad** is RMSProp\'s ancestor and differs by one word: it keeps a running **sum** of squared gradients instead of a moving average. A sum only grows, so the effective step size falls towards zero and a long run stalls even though the loss still has room to fall. Replacing the sum with an average is exactly the change that produced RMSProp. AdaGrad is still reasonable when features are sparse, meaning most inputs are zero most of the time, because rare parameters keep a large step size until they are actually used.
- **Nesterov momentum** takes the momentum step first and reads the gradient at the place it is about to land, rather than where it currently stands. If the slope has already turned upward there, it brakes before overshooting instead of after. It is a small real improvement and one flag in every framework.
- **Local minima are not the enemy.** For a point to be a bottom, the surface must curve upward in every one of the model\'s directions at once — for a million parameters that is a million conditions, and almost no point satisfies all of them. Almost every flat place in a large network has at least one direction that still goes down. The practical problem is not being trapped, it is moving slowly where the gradient is small, which is exactly what momentum and adaptive step sizes help with.
- **Condition number.** The ratio between the steepest and shallowest direction, 100 in our valley, has a name and a symbol: kappa. Everything in this module is about surviving a large kappa without knowing it in advance.
- **Gradient clipping.** If the gradient exceeds some length, scale it back before using it. This is a seatbelt in almost every language-model recipe: it converts one freak batch into a survivable step instead of a destroyed model. It is a safety net, not a fix for a badly chosen learning rate.`,
    },
  ],
  quiz: [
    {
      question: 'A valley has steepness 1 in x and 100 in y. Why does plain gradient descent with a single learning rate do badly here?',
      options: [
        {
          text: 'The gradient is zero, so no learning happens',
          explanation: 'The gradient is not zero at all. At the start it is 10 in x and 100 in y. The trouble is the mismatch between the two, not the absence of either.',
        },
        {
          text: 'The learning rate must stay under 2/100 to keep y stable, and that same tiny rate moves x by under two percent per step',
          explanation: 'Correct. The steep direction sets the ceiling and the flat direction then gets a step a hundred times smaller than it needs.',
        },
        {
          text: 'Gradient descent cannot handle more than one parameter',
          explanation: 'It handles billions of parameters routinely. It is the ratio between steepnesses that causes the problem.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Momentum uses beta = 0.9. What does that number do?',
      options: [
        {
          text: 'It throws away 90 percent of each new gradient',
          explanation: 'Backwards. beta is the fraction of the old velocity that is kept, not a discount on the new gradient.',
        },
        {
          text: 'It keeps 90 percent of the old velocity, so the velocity is a summary of roughly the last ten gradients and settles near ten times a steady gradient',
          explanation: 'Correct, and the factor ten is 1/(1 - 0.9). The printed run showed the x velocity climbing from 10 towards about 46 while the gradient was around 5.',
        },
        {
          text: 'It multiplies the learning rate by 0.9 every step',
          explanation: 'That would be a learning-rate schedule, a different mechanism entirely. beta never touches the learning rate.',
        },
      ],
      correct: 1,
    },
    {
      question: 'In the momentum run, the y velocity printed as 100, then 0, then -90, then 0. Why did it hit exactly zero on step 2?',
      options: [
        {
          text: 'The gradient was zero at that point',
          explanation: 'It was not. The y gradient on step 2 was -90, since y had moved to -0.9 and the steepness is 100.',
        },
        {
          text: 'The optimizer resets the velocity when the sign flips',
          explanation: 'No such rule exists. The two momentum lines contain no branch or condition at all.',
        },
        {
          text: '0.9 times the old velocity of 100 is 90, and the new gradient was -90, so the two cancelled inside the sum',
          explanation: 'Correct. That cancellation is the whole reason momentum removes zigzag: opposite contributions land in the same running total and delete each other.',
        },
      ],
      correct: 2,
    },
    {
      question: 'RMSProp divides each step by the square root of a moving average of that parameter\'s squared gradients. What does that achieve?',
      options: [
        {
          text: 'Every parameter ends up taking a step of roughly the same size, about the learning rate, whatever its gradient magnitude',
          explanation: 'Correct. In the printed run the first x step and the first y step were both 1.5811 even though their gradients were 10 and 100.',
        },
        {
          text: 'It removes the noise from the gradient',
          explanation: 'It changes step sizes, not the direction. Averaging the gradient itself, which is momentum, is what smooths direction.',
        },
        {
          text: 'It makes the learning rate shrink over time like a schedule',
          explanation: 'That is AdaGrad, which uses a growing sum. RMSProp uses a moving average precisely so old history is forgotten and the step size stays alive.',
        },
      ],
      correct: 0,
    },
    {
      question: 'Adam is run with bias correction removed. What actually goes wrong on the first steps?',
      options: [
        {
          text: 'Nothing measurable; the correction only matters after thousands of steps',
          explanation: 'The opposite. The correction is largest at step 1 and fades away as training proceeds.',
        },
        {
          text: 'Steps become about 3.16 times too large, because m is 10 times too small while sqrt(s) is 31.6 times too small and it sits in the denominator',
          explanation: 'Correct, and the printed snippet showed exactly that: 3.1623 uncorrected against 1.0 corrected on the first step.',
        },
        {
          text: 'Steps become exactly ten times too small',
          explanation: 'That would be true if only m were biased. Both averages are biased, by different factors, and the s one divides.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Why does AdamW subtract the weight decay term separately instead of adding it to the gradient?',
      options: [
        {
          text: 'Because it uses a different beta2',
          explanation: 'The moment estimates are identical in both. Only where the decay is applied changes.',
        },
        {
          text: 'Because decay added to the gradient gets divided by sqrt(s), so busy parameters are barely shrunk and quiet ones are shrunk hard, which is the reverse of shrinking everything equally',
          explanation: 'Correct. Keeping the decay outside the division restores the meaning of the word decay, and that is why AdamW is the transformer default.',
        },
        {
          text: 'Because it applies decay only to bias parameters',
          explanation: 'Backwards. Biases and normalization parameters are usually excluded from weight decay entirely.',
        },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Write the momentum update and explain why it helps in a narrow valley.',
      answer:
        'Two lines: v = beta*v + g, then w = w - lr*v, with beta typically 0.9 and v starting at zero. v is a moving average of recent gradients. In a narrow valley the steep direction produces a gradient that flips sign every step, so a positive contribution and a negative one land in the same running total and cancel — in a worked example the y velocity went 100, 0, -90, 0. The shallow direction produces the same sign every step, so contributions add and the velocity settles near 1/(1-beta) = 10 times the raw gradient. Net effect: the wasted bouncing is deleted and the useful direction is sped up about tenfold, at the same learning rate.',
      isCaseBased: false,
    },
    {
      question: 'Write Adam\'s full update from memory and say what each piece is for.',
      answer:
        'm = beta1*m + (1-beta1)*g and s = beta2*s + (1-beta2)*g*g, both starting at zero. Then mhat = m/(1-beta1^t) and shat = s/(1-beta2^t). Then w = w - lr*mhat/(sqrt(shat)+eps). m is momentum and supplies direction; beta1 = 0.9 gives it a memory of about ten steps. s is RMSProp and supplies per-parameter step size; beta2 = 0.999 gives it a memory of about a thousand steps because a size estimate should be steady. The division by sqrt(shat) makes the step roughly lr in size regardless of gradient magnitude. eps = 1e-8 only prevents division by zero. The hat terms are bias correction, undoing the fact that both averages started at zero.',
      isCaseBased: false,
    },
    {
      question: 'What exactly does bias correction fix, and which way does the error go if you leave it out?',
      answer:
        'Both moving averages start at zero, so early on they are underestimates: after t steps the weight actually accumulated is (1-beta^t), not 1, and dividing by that restores the correct scale. Concretely at t = 1 with a gradient of 100: m = 10, which is ten times too small, and s = 10 against a true 10000, so sqrt(s) is 31.6 times too small. Since sqrt(s) is a denominator, the two errors do not cancel — the ratio comes out about 3.16 times too large. So leaving out bias correction makes the first steps roughly three times too big, not too small, exactly when the weights are most fragile. The correction fades to nothing as beta^t goes to zero, so it only affects the opening of training.',
      isCaseBased: false,
    },
    {
      question: 'Case: a transformer trains fine for 200 steps, then the loss jumps to NaN. Adam, lr = 1e-3, no warmup. How do you diagnose it?',
      answer:
        'In order of likelihood. First, no warmup: Adam\'s s is built from a handful of early gradients, so the per-parameter step sizes rest on almost no evidence, and one bad batch can produce a huge step. Add linear warmup over the first one to five percent of steps; it is the cheapest fix and often the whole fix. Second, the learning rate is high for a transformer — 1e-4 to 3e-4 with warmup and cosine decay is the standard recipe. Third, add gradient clipping at a global norm of 1.0, which converts a freak batch into a survivable step. Fourth, check mixed precision: fp16 overflows on large activations, so inspect the loss scaler or move to bf16. Fifth, log the batch index at the spike and look at that batch for a corrupt label or an unusually long sequence. Worth saying out loud: clipping hides the cause, warmup plus a sane learning rate removes it.',
      isCaseBased: true,
    },
    {
      question: 'Case: your Adam run at lr = 1e-3 works. A teammate copies the number into plain SGD; at 1e-3 the model barely moves, and at 1e-1 it diverges. What is going on?',
      answer:
        'A learning rate is not portable across optimizers because it multiplies different things. Adam\'s step is lr*mhat/sqrt(shat), and since both terms are built from the same gradients the ratio is about 1, so the step is about lr in parameter units regardless of gradient size. SGD\'s step is lr*g, so lr is a multiplier on the gradient, and its safe range is set by the steepness of the surface: the update multiplies a coordinate by (1 - lr*c), which needs lr < 2/c in the steepest direction c. So at 1e-3 SGD crawls because the gradients are small, and at 1e-1 it exceeds that bound in the sharpest direction and blows up. The fix is to re-tune from scratch for SGD, typically starting near 0.1 with momentum 0.9 for a vision model at batch 256, plus a schedule.',
      isCaseBased: true,
    },
    {
      question: 'Case: you inherit a training script with lr hardcoded to 1e-3, no schedule, and a comment saying it worked last time. New model, new data. How do you choose the learning rate?',
      answer:
        'Do not trust an inherited constant, since it was tuned for a different optimizer, model size and batch size. Start from the known-good default for the setting: AdamW at 3e-4 for a model from scratch, 1e-5 to 5e-5 for finetuning a pretrained one, SGD with momentum at 0.1 for a vision model at batch 256. Then sweep by factors of three across short runs of a few hundred steps and keep the largest rate whose loss curve is still smooth. An alternative is a range test: raise the learning rate exponentially for a few hundred steps, plot loss against it, and pick about one order of magnitude below where the loss turns upward. Pair whatever you pick with warmup and cosine decay. The priority matters: the learning rate deserves a real sweep, beta1, beta2 and eps almost never do.',
      isCaseBased: true,
    },
    {
      question: 'Someone suggests raising momentum from 0.9 to 0.99 for smoother training. What do you say?',
      answer:
        'It is not free, because the velocity settles near gradient/(1-beta), so going from 0.9 to 0.99 multiplies the effective step along any consistent direction by ten while the learning rate on screen is unchanged. On a simple valley that turns a converging run into one that reaches the minimum around step 11 and then sails past it to a worse loss than it started with. There is a second effect: the velocity is now a summary of the last hundred gradients, so after crossing the minimum it takes many opposing steps before the stored direction even flips. The signature is a loss that falls, bottoms out, then climbs in a smooth arc — smooth, unlike the jagged blow-up of an oversized learning rate. If a longer memory is genuinely wanted, divide the learning rate by roughly the same factor.',
      isCaseBased: false,
    },
    {
      question: 'AdamW versus Adam with L2 regularization: what is the actual difference and why did it warrant a new name?',
      answer:
        'L2 adds a term to the loss whose gradient is lambda*w, so it enters the gradient and is then divided by sqrt(shat) along with everything else. That makes the decay per-parameter: a weight with large recent gradients has a large sqrt(shat) and is barely shrunk, while a quiet weight is shrunk hard — the reverse of what uniform shrinkage means. AdamW decouples it: take the normal adaptive step, then subtract lr*lambda*w separately. The consequence is practical rather than cosmetic, because before the fix the weight-decay hyperparameter people tuned was silently interacting with gradient magnitudes. AdamW with lambda around 0.01 to 0.1 is the transformer default, and biases and normalization parameters are normally excluded from decay.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Why one learning rate fails in a narrow valley', back: 'A direction with steepness c needs lr < 2/c to stay stable. The steepest direction sets the ceiling, so the flattest direction gets a step smaller by the ratio of the two steepnesses, and crawls.' },
    { front: 'Momentum, both lines', back: 'v = beta*v + g, then w = w - lr*v, v starting at zero, beta = 0.9. Opposite gradients cancel inside v, consistent ones add up and settle near 1/(1-beta) = 10 times the gradient.' },
    { front: 'RMSProp in one line', back: 's = 0.9*s + 0.1*g*g, then step = lr*g/(sqrt(s)+1e-8). Each parameter is divided by its own recent gradient size, so all parameters take steps of roughly lr.' },
    { front: 'Adam = ?', back: 'Momentum (m, an average of g) plus RMSProp (s, an average of g squared) plus bias correction. Direction from m, size from sqrt(s), step about lr regardless of gradient magnitude. beta1 = 0.9, beta2 = 0.999.' },
    { front: 'Bias correction, and which way it errs without it', back: 'Both averages start at zero, so divide by (1 - beta^t), the weight actually accumulated. Without it the first step is about 3.16 times too LARGE, because sqrt(s) is 31.6x too small while m is only 10x too small.' },
    { front: 'AdamW versus Adam plus L2', back: 'L2 inside Adam gets divided by sqrt(shat), so busy weights are barely decayed. AdamW subtracts lr*lambda*w separately, so every weight shrinks by the same fraction. Transformer default, lambda about 0.01 to 0.1.' },
    { front: 'The three schedules', back: 'Step decay: cut lr by 10x at fixed points. Cosine: glide smoothly from lr to about zero across the run. Warmup: ramp up from zero over the first 1-5 percent of steps, because early per-parameter size estimates rest on almost no data.' },
    { front: 'What to reach for by default', back: 'AdamW, 3e-4 from scratch or 1e-5 to 5e-5 for finetuning, with warmup then cosine. SGD with momentum 0.9 is still competitive on image models if you are willing to tune. Never carry a learning rate across a change of optimizer.' },
  ],
  mindmapMarkdown: `- Optimizers: from plain gradient descent to Adam
  - The problem
    - A valley steep in one direction, flat in the other
    - Stability needs lr < 2/steepness, set by the steepest direction
    - So the flat direction crawls and the steep one zigzags
    - One learning rate cannot serve two steepnesses
  - Repair 1: momentum
    - v = beta*v + g, w = w - lr*v
    - Opposite gradients cancel inside v, consistent ones add
    - beta = 0.9 means about 10 gradients of memory
    - beta = 0.99 means 100, and overshoots the minimum
  - Repair 2: per-parameter step size
    - RMSProp: s = 0.9*s + 0.1*g*g, step = lr*g/sqrt(s)
    - Divides each parameter by its own recent gradient size
    - All parameters end up stepping about lr
  - Adam = repair 1 + repair 2 + bias correction
    - m for direction (beta1 = 0.9), s for size (beta2 = 0.999)
    - Averages start at zero, so divide by (1 - beta^t)
    - Uncorrected first step is about 3.16x too large
    - Step size is about lr whatever the gradient is
  - AdamW
    - L2 inside Adam gets divided by sqrt(shat), so decay is uneven
    - Decoupled: subtract lr*lambda*w separately
  - Schedules
    - Step decay, cosine decay, warmup
    - Warmup because early size estimates rest on almost no data
  - Defaults
    - AdamW 3e-4 from scratch, 1e-5 to 5e-5 for finetuning
    - SGD + momentum still competitive on image models
    - Tune lr first, by factors of three`,
}

export default m
