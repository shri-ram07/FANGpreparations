import type { Module } from '../types'

const m: Module = {
  id: 'ml-l3-from-scratch-and-projects',
  subjectId: 'ml',
  level: 3,
  title: 'From Scratch in NumPy + The Projects That Get You Hired',
  whyItMatters:
    'You have called .fit() many times. This module is the one afternoon where you write what .fit() does, by hand, in four small stages: predict, measure the miss, compute the slope, take the step. After that the library stops being magic — you read its options as choices someone made, not as spells. The second half turns that into four project briefs you can actually follow, each written as a checklist rather than an essay.',
  assumes: [
    'You have seen a Python for loop, a function, and a list',
    'You have met NumPy arrays at least once — enough to know np.array makes one',
    'You have read *Gradient Descent + Linear Regression* — this module writes the loop that module explains',
    'Helpful but not required: *Logistic Regression: Sigmoid, Cross-Entropy & Decision Boundaries* and *Clustering: K-Means, Hierarchical, DBSCAN & GMM*',
  ],
  estMinutes: 56,
  sections: [
    {
      type: 'intuition',
      title: 'Implement it yourself once, so the library stops being magic',
      md: `You will never ship your own linear regression. scikit-learn's is faster and better tested than anything you will write this year. So the point of this module is not the code you produce. The point is this: **implement it yourself once, so the library stops being magic.**

- Right now \`model.fit(X, y)\` is one line that does something you cannot describe. After today it is a loop you have written, so you can name every piece of it.
- That matters when things break. A loss that becomes \`nan\`, weights that grow to a million, a model that trains for an hour and predicts the same class for everyone — all four live inside the part \`.fit()\` hides.
- It also matters in interviews. "Write the update rule for logistic regression" is a real question, and you cannot answer it from memory of an API.
- Budget: one afternoon. You write three algorithms and you own them for good.
- After that, use the library. Always. Writing your own in production is not a flex, it is a bug you have not found yet.`,
    },
    {
      type: 'intuition',
      title: 'One loop shape, three algorithms',
      md: `Linear regression, logistic regression and K-Means look like three different things. They share one loop shape, and once you see it, the third one costs you nothing.

- **Start** — put the parameters somewhere. Zeros, or a random pick from the data.
- **Repeat**: work out what the model currently says → measure how wrong that is → move the parameters so it gets less wrong.
- **Stop** when the movement gets tiny, or when you run out of iterations.
- The only things that change between the three algorithms are *what "wrong" means* and *how you move*.
- We build linear regression in four stages first — predict, loss, gradient, loop — because the other two are that same skeleton with two lines swapped.`,
    },
    {
      type: 'math',
      intro:
        'Linear regression in matrix form. X is (m x n): m samples down the page, n features across. w holds one weight per feature, b is a single number added to every prediction.',
      latex: [
        '\\hat{y} = X w + b \\qquad J(w,b) = \\frac{1}{m}\\sum_i (\\hat{y}_i - y_i)^2',
        '\\frac{\\partial J}{\\partial w} = \\frac{1}{m} X^{\\top}(\\hat{y} - y) \\qquad \\frac{\\partial J}{\\partial b} = \\frac{1}{m}\\sum_i (\\hat{y}_i - y_i)',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 1 of 4 — predict. Nothing is learned yet',
      code: `import numpy as np

X = np.array([[1.0, 2.0], [2.0, 1.0], [3.0, 4.0], [4.0, 3.0]])
y = np.array([8.0, 7.0, 18.0, 17.0])
w = np.zeros(2)
b = 0.0

yhat = X @ w + b
print("yhat", yhat)
print("shapes  X", X.shape, " w", w.shape, " yhat", yhat.shape)

# ---- real output ----
# yhat [0. 0. 0. 0.]
# shapes  X (4, 2)  w (2,)  yhat (4,)`,
      annotations: {
        1: 'Imports NumPy and gives it the short name np. NumPy is the array library: it stores numbers in a block and does arithmetic on the whole block at once, in compiled code.',
        3: 'np.array turns a Python list of lists into a 2D array. Four rows = four samples. Two columns = two features. Read row 3 as "this sample has feature-1 = 3 and feature-2 = 4".',
        4: 'The true answer for each of the four samples, in the same order. y[2] = 18.0 belongs to the row [3.0, 4.0]. These four numbers were built from y = 2*f1 + 3*f2 exactly, so there is a perfect answer to find.',
        5: 'np.zeros(2) makes the array [0.0, 0.0] — one weight per feature, both starting at zero. Zero is a fine start here because this problem has one lowest point, so any starting place reaches it.',
        6: 'b, the intercept, is a plain Python float. It is the number added to every prediction regardless of the features.',
        8: 'The @ symbol is matrix multiplication in Python. X @ w takes each row of X, multiplies it element-by-element with w, and adds the results up — so it produces one number per row. Adding b afterwards adds it to all four at once, which NumPy allows because a single number can stand in for a whole array.',
        9: 'Prints the four predictions. All zero, because both weights are zero and b is zero. That is expected — the model has not learned anything yet.',
        10: '.shape reports an array\'s dimensions as a tuple. Check them every single time: X is (4, 2), w is (2,), and (4, 2) @ (2,) gives (4,) — one prediction per sample. If the last shape is not (4,), the line above is wrong.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 2 of 4 — measure the miss',
      code: `err = yhat - y
print("err", err)

sq = err ** 2
print("squared", sq)

mse = sq.mean()
print("mse", mse)

# ---- real output ----
# err [ -8.  -7. -18. -17.]
# squared [ 64.  49. 324. 289.]
# mse 181.5`,
      annotations: {
        1: 'Subtracts two arrays of the same length element by element, giving one miss per sample. The order matters: prediction minus truth. A negative entry means the model predicted too low.',
        2: 'Prints the four misses. All negative and large, because the model currently predicts 0 for answers that should be 8 to 18.',
        4: '** is Python\'s power operator, and on a NumPy array it squares every element. Squaring does two jobs: it removes the minus signs so misses cannot cancel out, and it makes one big miss count much more than several small ones.',
        5: 'Prints the four squared misses. 18 became 324 while 7 became 49 — the big miss now dominates the total, which is exactly what squaring is for.',
        7: '.mean() adds all the elements up and divides by how many there are. This single number is the mean squared error, or MSE — the thing we are about to make smaller.',
        8: 'Prints 181.5. That is our starting score. Every step from here should push it down.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 3 of 4 — the gradient, written as a plain loop first',
      code: `m, n = X.shape

dw = np.zeros(n)
for i in range(m):
    dw = dw + err[i] * X[i]

dw = dw / m
db = err.mean()
print("dw", dw)
print("db", db)

# ---- real output ----
# dw [-36.  -36.5]
# db -12.5`,
      annotations: {
        1: 'Unpacks the shape tuple (4, 2) into two names at once — this is called tuple unpacking. m is now 4, the number of samples; n is 2, the number of features.',
        3: 'An accumulator: one running total per feature, both starting at zero. We will add each sample\'s contribution into it.',
        4: 'range(m) counts 0, 1, 2, 3 — one pass per sample. i is the row we are looking at right now.',
        5: 'The heart of it. err[i] is one number, X[i] is that sample\'s two feature values, so err[i] * X[i] scales the whole row by how wrong we were on it. Adding that into dw asks, for each feature: do the misses line up with this feature being large?',
        7: 'Divide by m to turn a sum into an average, so the answer does not depend on how many samples you happened to have.',
        8: 'b has no feature value attached to it — it multiplies 1 for every sample — so its slope is just the average miss, with no X in the expression.',
        9: 'Prints [-36. -36.5]. Both negative, meaning both weights are currently too low and should go up.',
        10: 'Prints -12.5, the average of the four misses. Also negative, so b should go up too.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 3, again — the same numbers with no loop',
      code: `dw_vec = X.T @ err / m
print("dw_vec", dw_vec)
print("same numbers as the loop?", np.allclose(dw_vec, dw))
print("X.T", X.T.shape, "@ err", err.shape, "-> dw", dw_vec.shape, " w", w.shape)

# ---- real output ----
# dw_vec [-36.  -36.5]
# same numbers as the loop? True
# X.T (2, 4) @ err (4,) -> dw (2,)  w (2,)`,
      annotations: {
        1: '.T is the transpose: it flips rows and columns, so X.T has one ROW per feature and that row holds the feature\'s value across all four samples. Multiplying it by err with @ dots each of those rows against err, which is exactly the sum the for loop built. Dividing by m averages it, same as before.',
        2: 'Prints [-36. -36.5] — character for character the same as the loop produced.',
        3: 'np.allclose compares two arrays and returns True if every pair of matching entries is equal to within a tiny rounding tolerance. Use it instead of == whenever floats are involved, because floats rarely land on exactly the same bits.',
        4: 'Prints the shapes so you can see the chain: (2, 4) @ (4,) gives (2,), which is the same shape as w. That match is the check that the line is right.',
      },
    },
    {
      type: 'intuition',
      title: 'What changed between the loop and the one-liner',
      md: `Nothing changed mathematically. \`np.allclose\` said True. What changed is who does the counting.

- The loop walks the samples one at a time **inside the Python interpreter**, which is slow: four samples is nothing, four million is a coffee break.
- \`X.T @ err\` hands the whole sum to NumPy's compiled matrix-multiply routine, which does it in one call. Same arithmetic, typically 50 to 100 times faster.
- Say the transposed version out loud: row *j* of \`X.T\` is feature *j* across every sample; dotting it with \`err\` asks *"for feature j, how much do my misses line up with this feature being large?"*
- If a feature is large exactly where the model over-predicts, that dot product is positive, and subtracting it pulls the weight down. That is the entire update rule.
- Habit worth forming: write the loop first when you are unsure, then vectorise it and check with \`np.allclose\`. Never write the clever version first and hope.`,
    },
    {
      type: 'note',
      md: `**Write the shapes down before you run anything.** X is (m, n). w is (n,). X @ w is (m,). err is (m,). X.T is (n, m), so X.T @ err is (n,) — the same shape as w, which is exactly what \`w = w - ...\` needs. If your gradient does not come out the same shape as the parameter it updates, the line is wrong no matter what NumPy managed to produce. An unexpected (m, m) result almost always means you transposed the wrong side.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 4 of 4 — the loop that actually learns',
      code: `w = np.zeros(2)
b = 0.0
lr = 0.05

for step in range(400):
    err = X @ w + b - y
    w = w - lr * (X.T @ err) / m
    b = b - lr * err.mean()
    if step % 100 == 0:
        print(f"step {step:3d}  mse {(err ** 2).mean():9.4f}  w {w.round(3)}  b {b:.3f}")

print("final  w", w.round(3), " b", round(b, 3))

# ---- real output ----
# step   0  mse  181.5000  w [1.8   1.825]  b 0.625
# step 100  mse    0.0267  w [1.965 2.887]  b 0.424
# step 200  mse    0.0068  w [1.965 2.958]  b 0.221
# step 300  mse    0.0018  w [1.98 2.98]  b 0.115
# final  w [1.99  2.989]  b 0.06`,
      annotations: {
        1: 'Reset the weights to zero so this snippet starts clean, independent of anything run above it.',
        2: 'Reset the intercept too.',
        3: 'lr is the learning rate: the fraction of the slope you actually move each step. Too small and you crawl; too large and you overshoot and diverge — you will see that happen later in this module.',
        5: '400 passes over the data. Each pass is one full stage-1-to-stage-3 cycle plus one step.',
        6: 'Stages 1 and 2 fused into one line: predict with the current w and b, then subtract y. This is the only place the model touches the data.',
        7: 'Stage 3 plus the step. X.T @ err / m is the gradient we verified against the loop; multiplying by lr shrinks it, and subtracting moves each weight in the direction that lowers the error.',
        8: 'The same step for b, using the average miss because b has no feature attached to it.',
        9: '% is the remainder operator, so step % 100 == 0 is true at steps 0, 100, 200 and 300. It prints four progress lines instead of four hundred.',
        10: 'An f-string: the text inside {} is evaluated and inserted. The part after the colon is a format spec — 3d means "an integer padded to 3 characters", 9.4f means "a decimal number, 4 places, padded to 9 characters". The padding is what lines the columns up. .round(3) rounds an array for display only.',
        12: 'Prints the answer. The data was built from w = [2, 3] and b = 0, and we landed on [1.99, 2.989] with b = 0.06. Read the output honestly: MSE fell from 181.5 to under 0.002, but b is still drifting slowly toward 0 — the intercept has the smallest slope here, so it is the last thing to settle. More steps would finish it.',
      },
    },
    {
      type: 'math',
      intro:
        'Logistic regression: the same Xw + b, squashed into the range 0 to 1 by the sigmoid function, with a different loss. Sigma is the sigmoid; J is cross-entropy loss.',
      latex: [
        '\\hat{y} = \\sigma(Xw + b), \\quad \\sigma(z) = \\frac{1}{1 + e^{-z}}',
        'J = -\\frac{1}{m}\\sum_i \\left[ y_i \\log \\hat{y}_i + (1-y_i)\\log(1-\\hat{y}_i) \\right]',
        '\\frac{\\partial J}{\\partial w} = \\frac{1}{m} X^{\\top}(\\hat{y} - y) \\quad \\text{— the same expression as linear regression}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Before the sigmoid: why the obvious formula is not enough',
      code: `z = np.array([-800.0, 0.0, 800.0])

print("form A  1/(1+exp(-z)):", 1.0 / (1.0 + np.exp(-z)))

ez = np.exp(z)
print("form B  exp(z)/(1+exp(z)):", ez / (1.0 + ez))

# ---- real output (both lines print a RuntimeWarning first) ----
# form A  1/(1+exp(-z)): [0.  0.5 1. ]
# form B  exp(z)/(1+exp(z)): [0.  0.5 nan]`,
      annotations: {
        1: 'Three test values. Numbers like -800 and 800 really do appear during training when weights grow, so this is not a contrived case.',
        3: 'np.exp raises e to the power of each element. For z = -800 this computes exp(800), which is far too large for a float to hold, so NumPy stores inf and prints a RuntimeWarning. The final answer happens to come out right, but your log is now full of warnings and you cannot tell real problems from this one.',
        5: 'The algebraically identical second form: divide top and bottom by exp(-z). Here exp(800) overflows to inf.',
        6: 'inf divided by inf is nan — "not a number". nan spreads: any arithmetic touching it produces nan, so one bad value silently poisons your whole loss. Each formula breaks on a different side, which is the clue for how to fix it.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The stable sigmoid — use each formula only where it is safe',
      code: `def sigmoid(z):
    out = np.empty_like(z, dtype=float)
    pos = z >= 0
    out[pos] = 1.0 / (1.0 + np.exp(-z[pos]))
    ez = np.exp(z[~pos])
    out[~pos] = ez / (1.0 + ez)
    return out

print(sigmoid(np.array([-800.0, -2.0, 0.0, 2.0, 800.0])).round(4))

# ---- real output ----
# [0.     0.1192 0.5    0.8808 1.    ]`,
      annotations: {
        1: 'Defines a function taking one array and returning one array of the same length.',
        2: 'np.empty_like makes an uninitialised array with the same shape as z — a container of the right size that we will fill in completely. dtype=float forces decimal storage even if z arrived as whole numbers.',
        3: 'z >= 0 compares every element to 0 and returns an array of True/False values, one per element. That is called a boolean mask. It does not select anything by itself; it is a list of yes/no answers you use to select with.',
        4: 'out[pos] = ... writes only into the positions where the mask is True, and z[pos] reads only those same positions. For z >= 0, -z is zero or negative, so exp(-z) is at most 1 and cannot overflow. Form A is safe here.',
        5: 'The ~ operator flips every True to False and back, so ~pos selects the negative values. For z < 0, exp(z) is at most 1 — also safe.',
        6: 'Fill the negative positions with form B. Every position is now written exactly once, from whichever formula could not overflow there.',
        7: 'Hand back the finished array.',
        9: 'Prints the five results. -800 gives exactly 0.0 and 800 gives exactly 1.0, with no warning and no nan. The middle values are the familiar S-curve: 0.1192, 0.5, 0.8808.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Logistic regression — spot the two changed lines',
      code: `rng = np.random.default_rng(1)
Xc = rng.normal(size=(400, 2))
yc = (Xc @ np.array([3.0, -2.0]) + 0.5 > 0).astype(float)

w = np.zeros(2)
b = 0.0
for step in range(400):
    err = sigmoid(Xc @ w + b) - yc
    w = w - 0.5 * (Xc.T @ err) / len(yc)
    b = b - 0.5 * err.mean()

pred = (sigmoid(Xc @ w + b) > 0.5).astype(float)
print("accuracy", (pred == yc).mean())
print("w", w.round(2), " b", round(b, 2))

# ---- real output ----
# accuracy 0.995
# w [ 5.66 -3.93]  b 1.01`,
      annotations: {
        1: 'np.random.default_rng(1) makes a random number generator seeded with 1. Seeding means the "random" numbers are the same every run, so you and I get identical output.',
        2: '.normal(size=(400, 2)) draws 400 rows of 2 features from the standard bell curve, centred on 0. This is our fake dataset.',
        3: 'Builds the labels. The comparison > 0 gives a True/False array; .astype(float) converts True to 1.0 and False to 0.0. So a sample is labelled 1 whenever 3*f1 - 2*f2 + 0.5 is positive — a clean straight-line boundary the model should be able to find.',
        5: 'Same start as linear regression: one weight per feature, both zero.',
        6: 'Same intercept, zero.',
        7: 'Same loop structure, 400 passes.',
        8: 'CHANGE 1 of 2. The prediction is now wrapped in sigmoid, so it lands between 0 and 1 instead of anywhere on the number line. Everything after this line is identical to the linear version.',
        9: 'Byte-for-byte the same gradient step as linear regression, with 0.5 as the learning rate. This is not a copy-paste shortcut — the two gradients genuinely are the same expression, explained in the next section.',
        10: 'The same intercept step as linear regression too.',
        12: 'CHANGE 2 of 2. To turn a probability into a class we need a cut-off, and 0.5 is the default one. .astype(float) turns the True/False result into 1.0/0.0 so it can be compared to yc.',
        13: '(pred == yc) gives a True/False array, and .mean() on booleans counts True as 1 — so the mean IS the fraction correct. 0.995 here, because the labels were generated from a clean boundary with no noise.',
        14: 'The learned weights [5.66, -3.93] are about 1.9 times the true [3, -2] but point the same way. Only the RATIO fixes where the boundary sits, and on perfectly separable data the loss keeps rewarding larger weights forever — which is what regularisation exists to stop. See *Polynomials, Overfitting, and Regularisation: Ridge vs Lasso*.',
      },
    },
    {
      type: 'intuition',
      title: 'Why both gradients are the same expression',
      md: `Two different losses, two different output functions, one gradient: \`X.T @ (yhat - y) / m\`. That is not luck, and it is worth seeing why rather than memorising it.

- For logistic regression the chain rule gives two factors. The derivative of cross-entropy with respect to the prediction is \`(yhat - y) / (yhat * (1 - yhat))\`.
- The derivative of the sigmoid itself is \`yhat * (1 - yhat)\` — a standard result you can look up, and one you can check numerically in three lines.
- Multiply them and the \`yhat * (1 - yhat)\` on the top cancels the identical factor on the bottom. What survives is just \`yhat - y\`. Then the derivative of \`Xw + b\` with respect to w is X, which puts the \`X.T\` in front.
- Squared error and the plain identity output cancel in exactly the same way, which is why linear regression lands on the same expression.
- These pairings are chosen *because* they cancel. Pair the sigmoid with squared error instead and the cancellation breaks: the gradient keeps a \`yhat * (1 - yhat)\` factor, which goes to nearly zero whenever the model is confidently wrong — so learning stalls precisely where you need it most.`,
    },
    {
      type: 'math',
      intro:
        'K-Means. There are no labels here: you pick k centre points, and the score to minimise is the total squared distance from every point to its own centre. That total has a name: inertia.',
      latex: [
        'J = \\sum_{i=1}^{m} \\lVert x_i - \\mu_{c(i)} \\rVert^2',
        '\\text{assign: } c(i) = \\arg\\min_j \\lVert x_i - \\mu_j \\rVert^2 \\qquad \\text{update: } \\mu_j = \\text{mean}\\{x_i : c(i) = j\\}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The distance table, written as two plain loops first',
      code: `pts = np.array([[0.0, 0.0], [1.0, 0.5], [8.0, 8.0], [9.0, 7.5]])
C = np.array([[0.0, 0.0], [9.0, 7.5]])

d = np.zeros((4, 2))
for i in range(4):
    for j in range(2):
        gap = pts[i] - C[j]
        d[i, j] = (gap ** 2).sum()

print(d)

# ---- real output ----
# [[  0.   137.25]
#  [  1.25 113.  ]
#  [128.     1.25]
#  [137.25   0.  ]]`,
      annotations: {
        1: 'Four points in 2D. The first two sit near the origin, the last two sit up near (9, 8) — two obvious groups, small enough to check by hand.',
        2: 'Two centre points, chosen here as two of the actual data points. Always pick real data points rather than random coordinates: a centre floating in empty space can attract zero points, and averaging zero points gives nan.',
        4: 'np.zeros((4, 2)) makes a 4-row, 2-column table of zeros — one row per point, one column per centre. We are going to fill in every cell.',
        5: 'Outer loop over the four points.',
        6: 'Inner loop over the two centres. Four times two means eight cells to fill.',
        7: 'Subtracts two 2-element arrays, giving the difference in each coordinate for this point-and-centre pair.',
        8: 'Squares both coordinate differences and adds them up. That is Pythagoras without the square root — the SQUARED distance. We skip the square root because it does not change which centre is nearest and it costs time.',
        10: 'Prints the 4x2 table. Read row 0: point (0,0) is 0 away from centre 0 and 137.25 away from centre 1. Rows 0 and 1 clearly belong to centre 0, rows 2 and 3 to centre 1.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same table with no loops — NumPy broadcasting',
      code: `A = pts[:, None, :]
B = C[None, :, :]
print("A", A.shape, " B", B.shape)

gap = A - B
print("gap", gap.shape)

d_vec = (gap ** 2).sum(-1)
print(d_vec)
print("same numbers as the double loop?", np.allclose(d_vec, d))

# ---- real output ----
# A (4, 1, 2)  B (1, 2, 2)
# gap (4, 2, 2)
# [[  0.   137.25]
#  [  1.25 113.  ]
#  [128.     1.25]
#  [137.25   0.  ]]
# same numbers as the double loop? True`,
      annotations: {
        1: 'Inside the brackets, : means "all of this dimension" and None means "insert a new dimension of size 1 here". So pts, which is (4, 2), becomes (4, 1, 2): still four points of two coordinates, with an empty slot in the middle for the centres.',
        2: 'The same move on the other side. C is (2, 2) and becomes (1, 2, 2): an empty slot at the front for the points.',
        3: 'Prints the two shapes so you can see the empty slots line up with each other\'s real dimensions.',
        5: 'This is broadcasting. NumPy compares the shapes from the right: (4, 1, 2) against (1, 2, 2). Where one side has a 1 and the other has a bigger number, the size-1 side is repeated to match. So both are stretched to (4, 2, 2), and the subtraction runs on every point-centre pair at once. No loops.',
        6: 'Prints (4, 2, 2): 4 points x 2 centres x 2 coordinates. Every one of the eight pairs now has its coordinate differences stored.',
        8: 'Squares all of it, then .sum(-1) adds up along the LAST axis. -1 means "the last dimension" — the coordinate one. Collapsing that axis leaves (4, 2): exactly the point-by-centre table of squared distances the double loop built.',
        9: 'Prints the table. Identical numbers to the loop version, in the same layout.',
        10: 'np.allclose confirms it rather than asking you to compare by eye. Memory warning worth knowing: that intermediate array holds m x k x n numbers, so for a million points and 100 centres it will not fit — at that size you process the points in chunks.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'K-Means, the whole loop',
      code: `rng = np.random.default_rng(7)
X = np.vstack([rng.normal(c, 0.6, size=(60, 2)) for c in ([0, 0], [4, 4], [8, 0])])
C = X[rng.choice(len(X), 3, replace=False)]

for it in range(10):
    d = ((X[:, None, :] - C[None, :, :]) ** 2).sum(-1)
    lab = d.argmin(1)
    inertia = d[np.arange(len(X)), lab].sum()
    C_new = np.array([X[lab == j].mean(0) for j in range(3)])
    shift = np.abs(C_new - C).max()
    print(f"iter {it}  inertia {inertia:8.2f}  centroid move {shift:.5f}")
    C = C_new
    if shift < 1e-6:
        break

print("centroids", C.round(2).tolist())

# ---- real output ----
# iter 0  inertia  1819.93  centroid move 1.80894
# iter 1  inertia   863.90  centroid move 2.05177
# iter 2  inertia   141.25  centroid move 0.51238
# iter 3  inertia   107.21  centroid move 0.00000
# centroids [[3.94, 3.88], [7.97, 0.02], [-0.11, -0.06]]`,
      annotations: {
        1: 'A seeded generator again, so this run is reproducible.',
        2: 'Two things at once. The part in square brackets is a list comprehension: it runs the expression once for each c in the list of three centres and collects the three results. Each result is 60 points scattered around c with a spread of 0.6. np.vstack then stacks those three blocks vertically into one (180, 2) array.',
        3: 'rng.choice picks 3 positions at random from 0..179, and replace=False stops it picking the same one twice. Indexing X with that array of positions returns those 3 rows — so the starting centres are 3 real data points.',
        5: 'At most 10 passes. The cap is a safety net; the break below usually fires first.',
        6: 'The broadcasting distance table from the last snippet, inlined: (180, 3) squared distances, every point against every centre.',
        7: 'ASSIGN step. .argmin(1) reports, for each row, the COLUMN INDEX of the smallest value — that is, which centre is nearest. lab is now 180 numbers, each 0, 1 or 2.',
        8: 'Inertia, the score. np.arange(len(X)) is [0, 1, 2, ... 179]; pairing it with lab picks out cell (0, lab[0]), (1, lab[1]) and so on — each point\'s distance to ITS OWN centre. Summing those is the total we are minimising.',
        9: 'UPDATE step. lab == j is a boolean mask selecting this cluster\'s rows, and .mean(0) averages down the rows to give one 2D point. The mean appears here because the mean is precisely the point that minimises summed squared distance — swap the objective to absolute distance and the correct update becomes the median instead.',
        10: 'np.abs takes absolute values, .max() takes the largest — so shift is the biggest distance any single centre coordinate moved this pass. That is our measure of "has it settled".',
        11: 'One progress line per pass. 8.2f pads the inertia to 8 characters with 2 decimals so the column lines up.',
        12: 'Adopt the new centres for the next pass.',
        13: '1e-6 is scientific notation for 0.000001. If nothing moved more than that, we are done.',
        14: 'break leaves the for loop immediately, skipping the remaining passes.',
        16: 'Prints the three found centres. .tolist() converts the NumPy array to plain Python lists so it prints readably. They land on the three places the data was generated from. Read the inertia column too: 1819 to 863 to 141 to 107, then it stops. It falls every pass by construction, so the algorithm always TERMINATES — but that says nothing about quality, since poor starting centres converge just as happily to a poor answer. Hence rerunning with several seeds.',
      },
    },
    { type: 'visual', component: 'KMeansStepper', props: { k: 3 } },
    {
      type: 'intuition',
      title: 'Before any model, ship a stupid one',
      md: `Now we switch from writing algorithms to running projects, and the first rule of a project is the cheapest one. Before any real model, ship a deliberately stupid one: predict the most common class, or the median, or yesterday's value.

- The stupid model is a **ruler**. On its own, "94% accuracy" is a number with no meaning at all.
- With a ruler, "94% against a 93.5% baseline" is a verdict, and usually an uncomfortable one.
- Report every model against the baseline, in the same table, on the same split. Every time.
- A model that cannot beat the baseline is **a finding, not a failure**. It says these features carry little signal for this target — genuinely useful information, delivered in an afternoon rather than a quarter.
- It also catches broken pipelines on day one. A baseline that scores suspiciously well usually means a leaked column, which you would otherwise discover in week six.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Baseline, part 1 — load the data and look at the class balance',
      code: `from sklearn.base import clone
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, average_precision_score

Xd, yd = make_classification(n_samples=4000, n_informative=5, weights=[0.94], random_state=0)
Xtr, Xte, ytr, yte = train_test_split(Xd, yd, test_size=0.25, stratify=yd, random_state=0)
print("train rows", len(ytr), " positives", ytr.sum(), " rate", round(ytr.mean(), 3))
print("test  rows", len(yte), " positives", yte.sum(), " rate", round(yte.mean(), 3))

# ---- real output ----
# train rows 3000  positives 194  rate 0.065
# test  rows 1000  positives 65  rate 0.065`,
      annotations: {
        1: 'clone takes an unfitted model and returns a fresh copy with the same settings and no learned state. We use it below so that each model in the comparison is trained from scratch rather than on top of a previous fit.',
        2: 'make_classification builds a fake but realistic labelled dataset, so this snippet runs anywhere with no download.',
        3: 'train_test_split cuts the rows into a training part and a held-out test part.',
        4: 'DummyClassifier is scikit-learn\'s deliberately stupid model. It is one import — there is no excuse for skipping the baseline.',
        5: 'The real model we are comparing against it.',
        6: 'Two scores. accuracy_score is the fraction correct; average_precision_score is the area under the precision-recall curve, written PR-AUC, and it is the one that behaves sensibly when positives are rare. Both are taught in *ROC, AUC & PR Curves: Judging a Model at Every Threshold*.',
        8: 'weights=[0.94] means 94% of rows get class 0, so only 6% are positive. That is the shape of churn, fraud and ad clicks. n_informative=5 means five columns actually carry signal.',
        9: 'test_size=0.25 holds back a quarter of the rows. stratify=yd is the important argument: it forces the 6% positive rate to hold in BOTH halves. Without it a small test set can drift to 4% or 8%, and your score then moves for reasons that have nothing to do with the model. random_state=0 fixes the split so the numbers reproduce.',
        10: 'Prints the training split. .sum() on a 0/1 array counts the ones, and .mean() gives the rate. 194 positives out of 3000.',
        11: 'Prints the test split. Same 0.065 rate, which is stratify doing its job. Look at that number before you look at any score.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Baseline, part 2 — the comparison that exposes accuracy',
      code: `candidates = [("baseline", DummyClassifier(strategy="most_frequent")),
              ("logistic", LogisticRegression(max_iter=1000))]

for name, recipe in candidates:
    clf = clone(recipe)
    clf.fit(Xtr, ytr)
    acc = accuracy_score(yte, clf.predict(Xte))
    ap = average_precision_score(yte, clf.predict_proba(Xte)[:, 1])
    print(f"{name:10s} accuracy {acc:.3f}   PR-AUC {ap:.3f}")

# ---- real output ----
# baseline   accuracy 0.935   PR-AUC 0.065
# logistic   accuracy 0.963   PR-AUC 0.708`,
      annotations: {
        1: 'A list of (name, model) pairs. strategy="most_frequent" tells the dummy to always predict whichever class was commonest in training — here, "not positive", for everyone.',
        2: 'The second pair. max_iter=1000 just gives the solver enough iterations to settle.',
        4: 'Loops over the pairs, unpacking each into name and recipe at once. recipe is an unfitted model, never touched directly.',
        5: 'clone(recipe) makes a fresh unfitted copy for this iteration. This matters: calling .fit twice on the same object is a real source of confusing results, and cloning makes each comparison independent by construction.',
        6: 'Trains on the training half only. The test half has not been read yet.',
        7: 'Accuracy on the test half: the fraction of the 1000 test rows classified correctly.',
        8: '.predict_proba returns one probability per class, so it is a (1000, 2) array; [:, 1] takes all rows of column 1, which is the probability of the positive class. PR-AUC scores those probabilities rather than the hard decisions.',
        9: 'Prints one line per model. 10s pads the name to 10 characters so the columns line up; .3f gives three decimals.',
        11: 'Read the two rows together. The baseline finds ZERO positives and still scores 93.5% accuracy, because 93.5% of test rows are negative. Its PR-AUC of 0.065 is just the base rate — the score of guessing. The real model gains a dull-looking 2.8 accuracy points while PR-AUC goes 0.065 to 0.708. That is the honest measure, and it is why accuracy is the wrong number here. See *Class Imbalance: When 98% Accuracy Is Worthless*.',
      },
    },
    {
      type: 'intuition',
      title: 'Project A — tabular classification (churn or fraud)',
      md: `Roughly 10k to 200k rows, 20 to 50 mixed columns, and a rare positive class of 2 to 10%. Telco churn, credit default or IEEE fraud all fit. Work through this list in order.

1. Load. Print the row count, the column types, and the class balance. Nothing else.
2. Split, stratified, before you clean or scale anything. If one customer has several rows, split by customer instead of at random.
3. Run \`DummyClassifier\`. Write the number down.
4. EDA on the training half only. Encode and scale inside a \`Pipeline\` so the folds cannot leak — the mechanics are in *Feature Engineering & Data Leakage*.
5. Logistic regression, then gradient boosting. For the imbalance, try \`class_weight='balanced'\` first: it is free and adds no rows.
6. Pick the threshold from a cost matrix, not 0.5, and report the confusion matrix at that threshold. Score with PR-AUC, not accuracy.

The one thing most people skip: naming the cost. *"A missed fraud costs Rs 8,000 and a false alarm costs Rs 40 of review time, so the threshold is 0.23, which catches 71% of fraud while reviewing 12% of volume."*`,
    },
    {
      type: 'intuition',
      title: 'Project B — regression (house prices, demand, delivery time)',
      md: `A continuous target with a lopsided distribution and a mix of numeric and categorical drivers. Ames Housing is the classic; delivery-time or demand data is fresher.

1. Split first. Baseline = always predict the training median.
2. Plot the target. If it is right-skewed — a long tail of very expensive houses — train on \`np.log1p(y)\` so the few huge values stop owning the loss.
3. Convert predictions back with \`np.expm1\` before reporting. The number you show a person must be in rupees, never in log-rupees.
4. Ridge or Lasso first, then gradient boosting.
5. Choose RMSE or MAE deliberately and say why in one sentence. The comparison is worked through in *Regression Metrics: RMSE, MAE, R-squared and the MAPE Trap*.
6. Do the residual analysis, which is the step that turns a score into an insight.

Residual analysis means plotting the leftover errors against the predictions and against each important feature. A widening fan means the error grows with the size of the target — fix it with the log target. A curve means a relationship the model cannot bend to. A clump of big errors in one neighbourhood means a feature you have not collected.`,
    },
    {
      type: 'intuition',
      title: 'Project C — clustering and PCA (customer segmentation)',
      md: `Unlabelled customer data: how recently they bought, how often, how much they spend. There is no target, so there is no accuracy. The deliverable is a decision, not a score.

1. Clean, then scale. Scaling is mandatory here: K-Means measures distance, and spend in rupees would completely drown order count.
2. Run PCA down to 2 dimensions and plot it, so you can see the shape. Say out loud which job PCA is doing — here it is for viewing, not for compression. The distinction is in *PCA, t-SNE & Anomaly Detection*.
3. Run K-Means for k = 2 to 8 and pick k using the silhouette score, explained in *Judging a Clustering When There Is No Correct Answer*.
4. Rerun with a different seed and check the segments survive. Cluster labels are not ground truth, and K-Means will hand you k clusters even from pure noise.
5. Profile each cluster on the ORIGINAL unscaled features, with a row count.
6. Name each segment and attach one action.

That last step is the whole project. A coloured scatter plot is not a result — nobody can act on "cluster 2". *"Loyal Whales, 200 customers, order every 3 weeks, Rs 901 average spend — give them early access and stop discounting to them"* is something a business can execute on Monday.`,
    },
    {
      type: 'intuition',
      title: 'Project D — one Kaggle competition, done properly',
      md: `One competition finished properly beats ten copied notebooks. Pick a tabular Playground competition: they run monthly and the data is clean.

1. Day one, submit something — even the training mean. The real barrier is the submission pipeline, and now it is behind you.
2. Build a local validation split that matches how the leaderboard splits. Random leaderboard means stratified k-fold; time-based leaderboard means a time-ordered split. See *Cross-Validation & Hyperparameter Tuning*.
3. Check that your local score and the leaderboard move in the same direction. Once they do, you can iterate a hundred times without submitting.
4. Spend your time on features, not on tuning. Boosting with default settings and good features beats tuned everything with bad features almost every time.
5. Read the top public notebooks only AFTER your own attempt, so each trick lands on a problem you have already felt.
6. Stop when you stop learning. Chasing the fourth decimal teaches nothing.

Honest framing of the result: a bronze medal proves you finished something competitive and can operate the tooling. It does not prove you can define a problem, source data or choose a metric, because the competition handed you all three. Lead with what you diagnosed, not with the rank.`,
    },
    {
      type: 'note',
      md: `**The README is the product; the code is the appendix.** In order: a one-sentence "so what" in business units, then Problem, Data (rows, columns, class balance, source), Approach (how you split, the baseline, the models), a Results table with the baseline as a row, three honest next steps, and a two-line run command. Pin your seeds and your requirements. Move training into a \`.py\` file that runs top to bottom and keep the notebook for exploring — a notebook with out-of-order cells and no seed cannot be reproduced, and a number nobody can reproduce is a number nobody will trust. Include one negative result: a project with no failed experiments reads as a project with no experiments.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: one gradient step, entirely by hand',
      md: `Take the four samples from stage 1 and do the very first update with a pen. Features are [1,2], [2,1], [3,4], [4,3]. Answers are 8, 7, 18, 17. Start at w = [0, 0], b = 0, learning rate 0.05.

- **Predict.** Every weight is zero, so every prediction is 0. yhat = [0, 0, 0, 0].
- **Miss.** err = prediction minus truth = [0-8, 0-7, 0-18, 0-17] = **[-8, -7, -18, -17]**. All negative: we are under-predicting everything.
- **Gradient for feature 1.** Multiply each miss by that sample's first feature and add: (-8x1) + (-7x2) + (-18x3) + (-17x4) = -8 - 14 - 54 - 68 = -144. Divide by 4 samples: **-36**.
- **Gradient for feature 2.** Same with the second feature: (-8x2) + (-7x1) + (-18x4) + (-17x3) = -16 - 7 - 72 - 51 = -146. Divide by 4: **-36.5**.
- **Gradient for b.** Just the average miss: (-8 - 7 - 18 - 17) / 4 = -50/4 = **-12.5**.
- **Step.** Subtract the learning rate times each gradient. w1 = 0 - 0.05 x (-36) = **1.8**. w2 = 0 - 0.05 x (-36.5) = **1.825**. b = 0 - 0.05 x (-12.5) = **0.625**.

Now look back at the printed output of stage 4: \`step 0 mse 181.5000 w [1.8 1.825] b 0.625\`. Every number matches. You have just done by hand what the loop does 400 times, and the MSE of 181.5 is the average of 64, 49, 324 and 289 from stage 2.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The classic mistake: dropping the / m',
      code: `X = np.array([[1.0, 2.0], [2.0, 1.0], [3.0, 4.0], [4.0, 3.0]])
y = np.array([8.0, 7.0, 18.0, 17.0])
w = np.zeros(2)
b = 0.0

for step in range(5):
    err = X @ w + b - y
    w = w - 0.05 * (X.T @ err)
    b = b - 0.05 * err.mean()
    print(f"step {step}  mse {(err ** 2).mean():12.2f}  w {w.round(2)}")

# ---- real output ----
# step 0  mse       181.50  w [7.2 7.3]
# step 1  mse       684.59  w [-6.93 -6.74]
# step 2  mse      2584.44  w [20.4  20.67]
# step 3  mse      9758.44  w [-32.83 -32.49]
# step 4  mse     36847.90  w [70.51 70.92]`,
      annotations: {
        1: 'The same four samples as before, so the only difference from stage 4 is the bug.',
        2: 'The same four answers.',
        3: 'The same zero start.',
        4: 'The same zero intercept.',
        6: 'Only five steps, because five is enough to see it fall apart.',
        7: 'Identical to the working version: predict and subtract the truth.',
        8: 'THE BUG. The / m is gone, so this is the SUM of the per-sample contributions instead of their average — four times too large with four samples, and four hundred thousand times too large with a real dataset.',
        9: 'This line still divides, using .mean(), so b behaves. That asymmetry is a good clue when you are hunting the bug: the weights blow up while the intercept stays sane.',
        10: 'One line per step so the damage is visible.',
        12: 'Read it. MSE goes 181, 684, 2584, 9758, 36847 — rising, not falling. The weights flip sign every step and grow each time: 7.2, then -6.9, then 20.4, then -32.8, then 70.5.',
      },
    },
    {
      type: 'intuition',
      title: 'Diagnosing that failure',
      md: `The gradient pointed the right way. The step was simply too big, so the model shot past the bottom and landed further up the other side — then over-corrected again, harder.

- The give-away is the **alternating sign** on the weights combined with a **growing** MSE. A learning rate that is merely a bit high wobbles and settles; one that is too high oscillates and grows without limit.
- The cause here is not the learning rate you typed. It is the missing \`/ m\`, which multiplied the effective step size by the number of samples.
- This is exactly the failure that \`.fit()\` hides. scikit-learn would have quietly converged and you would never have learned to recognise the pattern.
- Two fixes, and it matters which you reach for. Restoring \`/ m\` is the correct one, because it makes the gradient independent of dataset size. Lowering the learning rate to 0.0125 also stops the explosion here, but it silently breaks again the moment your dataset grows.
- The other common cause of the same symptom is unscaled features — one column in rupees and another in years. Standardise your features and this class of problem mostly disappears.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work each one out before reading the solution.

1. X has shape (500, 4) and err has shape (500,). What is the shape of \`X.T @ err\`, and why is that the shape you want?
2. Rewrite \`for i in range(m): dw = dw + err[i] * X[i]\` as a single vectorised line, and say how you would verify the two agree.
3. A is (200, 1, 3) and B is (1, 5, 3). What shape does \`A - B\` produce, and what does \`.sum(-1)\` give you afterwards?
4. Your fraud model scores 0.971 accuracy. The majority-class baseline scores 0.970. Two positives out of 1000 test rows were caught. What do you report?
5. Two samples: x = [1, 0] with y = 3, and x = [0, 2] with y = 4. Start at w = [0, 0], b = 0, learning rate 0.1. Compute one gradient step by hand.`,
    },
    {
      type: 'intuition',
      title: 'Solutions',
      md: `1. **(4,)**. X.T is (4, 500), and (4, 500) @ (500,) collapses the shared 500 to give (4,). You want that because w is (4,) — the gradient has to be the same shape as the thing it updates, or \`w = w - lr * dw\` is not even a valid subtraction.

2. \`dw = X.T @ err / m\`. Verify by running both and calling \`np.allclose(loop_result, vec_result)\`. Never use \`==\` on floats; rounding makes two mathematically equal results differ in the last bit.

3. Broadcasting compares the shapes from the right. 3 against 3 matches. 1 against 5 stretches to 5. 200 against 1 stretches to 200. So \`A - B\` is **(200, 5, 3)**. Then \`.sum(-1)\` collapses the last axis, giving **(200, 5)** — a table of 200 rows against 5 columns, which is exactly a distance table if you squared first.

4. That the model has demonstrated nothing. Beating a 0.970 baseline by 0.001 while catching 2 of roughly 30 positives means accuracy cannot tell your model apart from a constant. Report the class balance, the baseline row, PR-AUC or recall at a fixed review budget, and the confusion matrix at your chosen threshold. Then check for a leaked column before doing anything else.

5. Predictions are both 0, so err = [0-3, 0-4] = [-3, -4]. Feature 1: (-3 x 1) + (-4 x 0) = -3, divided by 2 samples = **-1.5**. Feature 2: (-3 x 0) + (-4 x 2) = -8, divided by 2 = **-4**. Gradient for b is the mean miss: (-3 - 4)/2 = **-3.5**. Stepping: w1 = 0 - 0.1 x (-1.5) = **0.15**, w2 = 0 - 0.1 x (-4) = **0.4**, b = 0 - 0.1 x (-3.5) = **0.35**. Sanity check: every weight went up, which is right, because the model was under-predicting both samples.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. These are the follow-up questions worth knowing once it does.

- **Why zeros are a safe start here but not in a neural network.** Linear and logistic regression each have a single lowest point, so every starting place slides to the same answer. A neural network with all-zero weights has every neuron in a layer computing the same thing and receiving the same gradient forever, so they never differentiate. That is why neural networks need random starting values.
- **Chunking the distance table.** The broadcast array holds m x k x n numbers. At a million points and 100 centres that is far too large for memory, so you process 10,000 points at a time.
- **Why the mean and not the median.** K-Means updates each centre to the mean because the mean is the point that minimises summed SQUARED distance, and squared distance is the objective. Change the objective to plain absolute distance and the correct update becomes the median. That algorithm exists and is called K-Medians.
- **Calibration.** A model that outputs 0.8 is not necessarily right 80% of the time — boosted trees are especially prone to this. If anyone is going to make a rupee decision from your probability, plot a calibration curve first, or wrap the model in \`CalibratedClassifierCV\`.
- **Adversarial validation.** If your local score and the leaderboard disagree badly, train a classifier to tell training rows from test rows. If it succeeds, the sets genuinely differ, and the features it used show you where.`,
    },
  ],
  quiz: [
    {
      question: 'In the from-scratch loop, why write the gradient as `X.T @ err / m` instead of looping over samples?',
      options: [
        {
          text: 'It computes something different — the loop version is only an approximation',
          explanation: 'They produce identical numbers; np.allclose confirmed it in the module. X.T @ err is exactly the sum the loop accumulates.',
        },
        {
          text: 'Same numbers, but one compiled matrix-multiply call instead of m interpreted iterations',
          explanation: 'Correct. NumPy hands the whole product to compiled code, while the loop stays in the Python interpreter one sample at a time.',
        },
        {
          text: 'It removes the need for a learning rate',
          explanation: 'The learning rate is unrelated to how the gradient is computed. You still multiply by it either way.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Linear and logistic regression end up with the same gradient expression. Why?',
      options: [
        {
          text: 'The loss and the output function are paired so that their derivative factors cancel exactly',
          explanation: 'Correct. The sigmoid derivative yhat*(1-yhat) cancels the identical factor in the cross-entropy derivative, leaving just yhat - y.',
        },
        {
          text: 'Coincidence — the two derivations happen to land in the same place',
          explanation: 'It is deliberate. Pair the sigmoid with squared error instead and the cancellation breaks immediately.',
        },
        {
          text: 'Because logistic regression is linear regression run on the labels',
          explanation: 'It is not. The sigmoid makes the output nonlinear, and the loss is a different function.',
        },
      ],
      correct: 0,
    },
    {
      question: 'Your MSE rises every step and the weights flip sign each time: 7.2, -6.9, 20.4, -32.8. What is happening?',
      options: [
        {
          text: 'The gradient is pointing the wrong way — flip the sign of the update',
          explanation: 'The direction is fine. If the direction were wrong the weights would run off steadily one way, not alternate.',
        },
        {
          text: 'The step size is far too large, so each update overshoots the bottom and lands further up the other side',
          explanation: 'Correct. Alternating sign plus growing loss is the signature of divergence. In the module the cause was a missing / m.',
        },
        {
          text: 'The model needs more training data',
          explanation: 'More data will not help a step size that overshoots. With a summed gradient, more data makes it strictly worse.',
        },
      ],
      correct: 1,
    },
    {
      question: 'A is (4, 1, 2) and B is (1, 2, 2). What does `A - B` give, and why?',
      options: [
        { text: 'An error — the shapes do not match', explanation: 'They do match under broadcasting: a dimension of size 1 is allowed to stretch to meet a larger one.' },
        {
          text: '(4, 2, 2) — each size-1 dimension is stretched to match the other side, so all 8 pairs are computed at once',
          explanation: 'Correct. NumPy compares shapes from the right: 2 matches 2, 1 stretches to 2, and 1 stretches to 4.',
        },
        { text: '(4, 2) — the last axis is summed automatically', explanation: 'Subtraction never sums anything. The summing is a separate .sum(-1) step afterwards.' },
      ],
      correct: 2,
    },
    {
      question: 'K-Means inertia falls at every single iteration. What does that guarantee?',
      options: [
        { text: 'That the final clustering is the best possible one', explanation: 'No — it can fall steadily all the way into a poor answer. That is exactly why you rerun with several seeds.' },
        { text: 'That the chosen k is correct', explanation: 'Inertia also falls as k rises, so it cannot choose k. Silhouette can, because it does not fall monotonically.' },
        {
          text: 'Only that the algorithm stops — both steps lower inertia and there are finitely many ways to assign points',
          explanation: 'Correct. Termination is guaranteed; quality is not.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Why write the sigmoid with two branches instead of `1 / (1 + np.exp(-z))`?',
      options: [
        { text: 'The two-branch version is faster', explanation: 'It is slightly slower — it does boolean masking and two exponentials. Speed is not the point.' },
        { text: 'It is more accurate near z = 0', explanation: 'Near zero the simple form is perfectly accurate. The trouble is in the tails.' },
        {
          text: 'Each single formula overflows on one side; the branches use each one only where it cannot overflow',
          explanation: 'Correct. exp of a large positive number becomes inf, and inf/inf becomes nan, which then poisons everything downstream.',
        },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Whiteboard: derive and write the gradient descent update for logistic regression, vectorised.',
      answer:
        'Model: yhat = sigma(Xw + b). Loss: J = -(1/m) sum[y log yhat + (1-y) log(1-yhat)]. Chain rule gives two factors: dJ/dyhat = (yhat - y) / (yhat(1 - yhat)), and dyhat/dz = yhat(1 - yhat). They cancel exactly, leaving dJ/dz = (yhat - y)/m. Since z = Xw + b, dz/dw = X, so dJ/dw = X.T @ (yhat - y)/m and dJ/db = mean(yhat - y). Update: w := w - lr * X.T @ (yhat - y)/m. Two things worth saying: the cancellation is why cross-entropy is paired with the sigmoid rather than chosen arbitrarily, and the result is identical to linear regression, so the same code trains both with only the forward pass changed. If asked to code it, use the branched sigmoid so a large positive z never gets exponentiated.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through a project on your resume.',
      answer:
        'Six beats, about three minutes. (1) Problem and who cares: "predict which subscribers churn next month so retention spends its budget on the right 5%". (2) Data: rows, columns, class balance, and how it was split — stratified, or grouped by customer if one customer has several rows. (3) Baseline: "majority class scored 93.5% accuracy, which is why I moved to PR-AUC". (4) Approach: logistic regression first because it is interpretable, then gradient boosting; the scaler and encoder sat inside a Pipeline so the cross-validation folds could not leak. (5) Result against the baseline, in business units: "PR-AUC went 0.065 to 0.708; at the threshold chosen from a cost matrix we flag 12% of accounts and catch 71% of churners". (6) What failed and what is next: "SMOTE hurt, class weights won; next I would add tenure-window features and watch the score distribution for drift". Naming the baseline and one failed experiment without being asked is the biggest differentiator in the whole answer.',
      isCaseBased: true,
    },
    {
      question: 'Case: a candidate reports 99.2% accuracy on fraud detection. What do you ask, in order?',
      answer:
        'Four questions in this order. (1) What is the class balance? If fraud is 0.8% of rows, predicting "never fraud" scores 99.2% — the model may literally be a constant. (2) What did the baseline score? A number with no ruler beside it is not a result. (3) How did you split, and when did you fit the transforms? A random split on data with repeated customers, or a scaler fitted before splitting, both inflate the score silently — nothing errors, the number is just wrong. (4) Are any features unavailable at prediction time? Columns like chargeback_flag or investigation_opened are the answer in disguise, and target leakage is the usual cause of suspiciously good numbers. Then ask for PR-AUC and the confusion matrix at their operating threshold. Worth adding: leakage is almost never dishonesty, it is usually a join performed before the split.',
      isCaseBased: true,
    },
    {
      question: 'Case: your local cross-validation score is 0.84 and the competition leaderboard gives 0.71. Diagnose it.',
      answer:
        'A gap that large means your validation does not reproduce their split. Hypotheses in order of likelihood. (1) Leakage inside your pipeline: a scaler, encoder, target encoding or imputer fitted outside the fold loop, so every fold effectively saw the whole training set. Fix by putting every step in a Pipeline. (2) Mismatched split scheme: the leaderboard splits by time or by group and you used random k-fold, so your folds share entities theirs separate. Fix by mirroring their split. (3) Selection overfitting: you tried 200 configurations and kept the maximum, and a maximum over 200 noisy estimates is itself optimistic. Use nested cross-validation, or hold out a fold you never tune against. (4) Genuine distribution shift between the public train and test sets, which you check with adversarial validation — train a classifier to tell train rows from test rows, and if it succeeds, the features it used point straight at the difference.',
      isCaseBased: true,
    },
    {
      question: 'Why implement algorithms from scratch when production always uses libraries?',
      answer:
        'Two honest reasons and one bad one to avoid. First: the failure modes live in the parts the library hides — divergence, feature scale, numeric overflow, when to stop. Someone who has written the loop recognises an exploding loss in a minute; someone who has only called .fit files a ticket. Second: interviews test derivation, and you cannot derive from memory of an API. The bad reason to avoid: "libraries are black boxes and I do not trust them". scikit-learn is better tested than anything you will write. The correct position is: implement it once to understand it, then use the library forever.',
      isCaseBased: false,
    },
    {
      question: 'How do you choose a classification threshold, and why is 0.5 usually wrong?',
      answer:
        '0.5 minimises the count of mistakes when both kinds of mistake cost the same and the classes are balanced. Those conditions almost never hold. Instead, write down a cost matrix — what a false negative costs versus a false positive — sweep the threshold on a validation fold, and take the point that minimises expected cost, or the point that satisfies an operational limit like "we can review 500 cases a day". Then freeze that number and apply it unchanged to the test set. Two traps: choosing the threshold on the test set, which stops it being an unbiased estimate, and quoting probabilities that are not calibrated — a boosted model outputting 0.8 is often not right 80% of the time.',
      isCaseBased: false,
    },
    {
      question: 'Explain the K-Means assign step as vectorised NumPy, and why the update uses the mean specifically.',
      answer:
        'Assign: ((X[:, None, :] - C[None, :, :]) ** 2).sum(-1) broadcasts (m, 1, n) against (1, k, n) to (m, k, n), squares, and sums the feature axis, giving an (m, k) table of squared distances. Then .argmin(1) picks the nearest centre for each point. No loop over points. Memory caveat worth naming: that intermediate holds m times k times n numbers, so for large m you chunk the points. The update uses the mean because the mean is precisely the point minimising summed squared distance, which is the objective. Swap the objective to summed absolute distance and the correct update becomes the median — that is K-Medians. Objective and update are chosen together.',
      isCaseBased: false,
    },
    {
      question: 'Why ship a dumb baseline first, and what do you do when the real model cannot beat it?',
      answer:
        'The baseline turns a metric into a verdict. "0.94" means nothing; "0.94 against a 0.935 baseline" is a decision. It also catches leakage and metric-choice errors on day one instead of week six, and it costs one import. When the model cannot beat it, that is a finding rather than a failure, and you should report it: the available features carry little signal for this target, which is genuinely useful information delivered cheaply. Then investigate rather than tune: is the target defined correctly, is the signal available at prediction time, is there a source you have not joined? The failure mode to avoid is grinding hyperparameters for three weeks against a baseline you never measured.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    {
      front: 'The four stages of writing any of these algorithms',
      back: 'Predict, measure the miss, compute the gradient, take the step. Build them in that order, checking shapes at each one, and never write the finished loop first.',
    },
    {
      front: 'Vectorised gradient for linear regression',
      back: 'dw = X.T @ err / m, db = err.mean(). X.T @ err sums err[i] * X[i] over all samples, per feature — the same numbers the for loop gives, in one compiled call.',
    },
    {
      front: 'Why linear and logistic share one gradient',
      back: 'Both give X.T @ (yhat - y) / m. The sigmoid derivative yhat*(1-yhat) cancels the identical factor inside the cross-entropy derivative. Same code, different forward pass.',
    },
    {
      front: 'Numerically stable sigmoid',
      back: 'For z >= 0 use 1/(1+exp(-z)); for z < 0 use exp(z)/(1+exp(z)). Each formula overflows on one side only, so use each where it is safe. exp(800) is inf, and inf/inf is nan.',
    },
    {
      front: 'NumPy broadcasting, in one rule',
      back: 'Shapes are compared from the right. Equal sizes match; a size of 1 stretches to meet the other. So (m,1,n) - (1,k,n) gives (m,k,n) — every point against every centre, no loops.',
    },
    {
      front: 'What monotone falling inertia guarantees',
      back: 'Termination only. Both steps lower inertia and there are finitely many assignments. Quality is not guaranteed, which is why you rerun with several seeds and keep the lowest.',
    },
    {
      front: 'Loss rising with alternating weight signs',
      back: 'The step is too big — each update overshoots the bottom. Usual cause is a missing / m in the gradient, or unscaled features. Fix the gradient, not the learning rate.',
    },
    {
      front: 'The baseline rule',
      back: 'Ship majority class, median, or last-known-value first, and report every model against it on the same split. Losing to it is a finding, not a failure.',
    },
  ],
  mindmapMarkdown: `- From Scratch in NumPy + The Projects
  - Why write it yourself
    - Once, so the library stops being magic
    - The failure modes live in what .fit hides
  - The four stages
    - Predict - loss - gradient - loop
    - Check shapes at every stage
  - Linear regression
    - Loop first, then X.T @ err / m
    - Verify with np.allclose
  - Logistic regression
    - Stable sigmoid: two branches
    - Same gradient - the factors cancel
  - K-Means
    - Double loop first, then broadcasting
    - Inertia falls: it stops, not that it is right
  - Baseline discipline
    - Majority / median / last value
    - clone() each estimator before fitting
  - Project A - classification
    - Stratified split, then DummyClassifier
    - Threshold from a cost matrix
  - Project B - regression
    - log1p the skewed target, expm1 back
    - Residual plots turn a score into an insight
  - Project C - clustering
    - Scale first, k by silhouette
    - Profile and NAME the segments
  - Project D - Kaggle
    - Submit day one, match their split
    - Features beat tuning
  - The classic failure
    - Missing / m - loss grows, weights flip sign`,
}

export default m
