var e={id:`ml-l3-from-scratch`,subjectId:`ml`,level:3,title:`Writing the Training Loop Yourself`,whyItMatters:`You will never ship your own linear regression. The point is that after writing one, the library stops being magic — you read its options as choices someone made rather than as spells.`,assumes:[`You have read Gradient Descent — this writes the loop that module explains`,`You have met NumPy arrays at least once`],estMinutes:24,sections:[{type:`intuition`,title:`One loop shape, three algorithms`,md:`Linear regression, logistic regression and K-Means look like three different things. They share one shape, and once you have written it once the second and third cost almost nothing:

1. **Predict** with the current parameters.
2. **Measure the miss.**
3. **Compute the slope** of that miss with respect to each parameter.
4. **Take a step** downhill and repeat.

Four samples, two features, and answers that follow y = 2x₁ + 3x₂ almost exactly.`},{type:`math`,intro:`Linear regression in matrix form. X is (m, n) — m samples, n features. The gradient expression Xᵀ(ŷ − y)/m is the one to remember, because it reappears unchanged in logistic regression later.`,latex:[`\\hat{y} = X w + b \\qquad J(w,b) = \\frac{1}{m}\\sum_i (\\hat{y}_i - y_i)^2`,`\\frac{\\partial J}{\\partial w} = \\frac{1}{m} X^{\\top}(\\hat{y} - y) \\qquad \\frac{\\partial J}{\\partial b} = \\frac{1}{m}\\sum_i (\\hat{y}_i - y_i)`]},{type:`code`,lang:`python`,title:`Stages 1 and 2 — predict, then measure`,code:`import numpy as np

X = np.array([[1.0, 2.0], [2.0, 1.0], [3.0, 4.0], [4.0, 3.0]])
y = np.array([8.0, 7.0, 18.0, 17.0])
w = np.zeros(2)
b = 0.0

yhat = X @ w + b
print("yhat", yhat, " shapes  X", X.shape, " w", w.shape, " yhat", yhat.shape)

err = yhat - y
print("err", err)
print("mse", (err ** 2).mean())

# ---- real output ----
# yhat [0. 0. 0. 0.]  shapes  X (4, 2)  w (2,)  yhat (4,)
# err [ -8.  -7. -18. -17.]
# mse 181.5`,annotations:{8:`@ is matrix multiplication. (4,2) @ (2,) collapses the shared 2 and gives (4,) — one prediction per sample. Every prediction is 0 because w starts at zeros.`,11:`err is prediction minus truth, so a negative value means the model is currently too low. Getting this order backwards flips the sign of every gradient and the loop climbs instead of descending.`,13:`181.5, and nothing has been learned yet. This is the number the next two stages exist to reduce.`}},{type:`code`,lang:`python`,title:`Stage 3 — the gradient, as a loop and then without one`,code:`m, n = X.shape

dw = np.zeros(n)
for i in range(m):
    dw = dw + err[i] * X[i]
dw = dw / m
db = err.mean()
print("dw", dw, " db", db)

dw_vec = X.T @ err / m
print("dw_vec", dw_vec)
print("same numbers as the loop?", np.allclose(dw_vec, dw))
print("X.T", X.T.shape, "@ err", err.shape, "-> dw", dw_vec.shape, " w", w.shape)

# ---- real output ----
# dw [-36.  -36.5]  db -12.5
# dw_vec [-36.  -36.5]
# same numbers as the loop? True
# X.T (2, 4) @ err (4,) -> dw (2,)  w (2,)`,annotations:{5:`Each sample contributes its error times its own feature row. Summing those contributions and dividing by m gives the average gradient.`,10:`The same arithmetic with no Python loop. X.T is (2,4), err is (4,), so the product is (2,) — exactly the shape of w, which is the check that it is the right expression.`,12:`np.allclose confirms the two agree. Nothing changed mathematically; what changed is who does the counting — the loop counts in Python, the matmul counts in compiled code.`}},{type:`note`,label:`Write the shapes down before you run anything`,md:`X is (m, n). w is (n,). X @ w is (m,). err is (m,). X.T is (n, m), so **X.T @ err is (n,)** — the same shape as w, which is exactly what a gradient for w must be.

Nearly every bug in hand-written training code is a shape bug, and nearly all of them are caught by writing that chain out on paper before running it. A gradient whose shape does not match its parameter is wrong however plausible the numbers look.`},{type:`code`,lang:`python`,title:`Stage 4 — the loop that actually learns`,code:`w = np.zeros(2)
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
# final  w [1.99  2.989]  b 0.06`,annotations:{6:`Four lines. Predict, step w, step b, repeat — this is the whole of what .fit() does for a linear model.`,11:`The f-string specs line the table up: {step:3d} pads the integer to 3 characters, {…:9.4f} gives 9 characters with 4 decimals.`,18:`MSE 181.5 to 0.0018, and w converging on [1.99, 2.989] against the true [2, 3]. The bias is still drifting toward 0 — it always converges last, because its gradient does not get multiplied by a feature value.`}},{type:`code`,lang:`python`,title:`The sigmoid: why the obvious formula is not enough`,code:`z = np.array([-800.0, 0.0, 800.0])
print("form A  1/(1+exp(-z)):", 1.0 / (1.0 + np.exp(-z)))
ez = np.exp(z)
print("form B  exp(z)/(1+exp(z)):", ez / (1.0 + ez))

def sigmoid(z):
    out = np.empty_like(z, dtype=float)
    pos = z >= 0
    out[pos] = 1.0 / (1.0 + np.exp(-z[pos]))
    ez = np.exp(z[~pos])
    out[~pos] = ez / (1.0 + ez)
    return out

print("stable:", sigmoid(np.array([-800.0, -2.0, 0.0, 2.0, 800.0])).round(4))

# ---- real output (the first two lines also print a RuntimeWarning) ----
# form A  1/(1+exp(-z)): [0.  0.5 1. ]
# form B  exp(z)/(1+exp(z)): [0.  0.5 nan]
# stable: [0.     0.1192 0.5    0.8808 1.    ]`,annotations:{2:`Form A overflows at z = −800, because exp(800) is far beyond a float. It happens to survive here, returning 0.`,4:`Form B returns nan at z = +800: exp(800) is inf, and inf/inf is undefined. One nan anywhere poisons every gradient that follows.`,8:`z >= 0 gives a boolean mask; ~pos inverts it. Each half then uses whichever formula cannot overflow for that sign, which is why library implementations look more complicated than the textbook formula.`,17:`The stable version returns sensible values across the whole range. This is a genuine reason to use the library rather than the one-liner.`}},{type:`intuition`,title:`Why both gradients are the same expression`,md:`Logistic regression changes two lines — wrap the prediction in a sigmoid, and swap MSE for cross-entropy. The gradient stays **X.T @ (yhat − y) / m**, unchanged.

That is not a coincidence. Cross-entropy was *chosen* so that its derivative cancels the sigmoid's derivative exactly: dL/dp brings a 1/(p(1−p)), and dp/dz brings a p(1−p), and they annihilate.

Pick MSE instead and the p(1−p) survives, which is why a confidently-wrong logistic model trained on MSE barely learns.`},{type:`code`,lang:`python`,title:`The classic mistake: dropping the / m`,code:`X = np.array([[1.0, 2.0], [2.0, 1.0], [3.0, 4.0], [4.0, 3.0]])
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
# step 4  mse     36847.90  w [70.51 70.92]`,annotations:{8:`The only change from the working loop: no / m. With 4 samples the gradient is now 4x too large, which is the same as secretly using lr = 0.2.`,12:`MSE 181 to 36,847 in five steps, and w flipping sign every time: 7.2, then -6.93, then 20.4. The gradient direction was right every time — the step was simply too big, so it shot past the bottom and landed further up the far side.`,16:`With 4 samples this diverges slowly enough to watch. With 4,000 it would be nan on the first step, and it would look like a learning-rate problem rather than a missing division.`}}],quiz:[{question:`Why is X.T @ err the right expression for the w gradient?`,options:[{text:`Because it is faster than a loop`,explanation:`It is faster, but speed does not make it correct.`},{text:`Because (n, m) @ (m,) gives (n,) — the same shape as w, which is what a gradient for w must be`,explanation:`Correct, and np.allclose confirms it matches the explicit loop exactly.`},{text:`Because it avoids transposing`,explanation:`It is precisely the transpose that makes the shapes work.`},{text:`Because NumPy requires this form`,explanation:`NumPy would happily compute a wrongly-shaped product.`}],correct:1},{question:`After 400 steps w reached [1.99, 2.989] and b was 0.06. Why is b still moving?`,options:[{text:`The learning rate is too small for b`,explanation:`The same lr applies to both.`},{text:`Its gradient is not multiplied by a feature value, so it is smaller — the bias always converges last`,explanation:`Correct. dJ/dw carries an x factor and dJ/db does not.`},{text:`b was initialised badly`,explanation:`Both started at zero.`},{text:`A bug in the loop`,explanation:`The behaviour is expected and the model is converging correctly.`}],correct:1},{question:`Why does the textbook sigmoid formula need replacing?`,options:[{text:`It is too slow`,explanation:`Speed is not the issue.`},{text:`exp overflows for large |z| — form B returns nan at z = +800, and one nan poisons every gradient after it`,explanation:`Correct, which is why library implementations branch on the sign of z.`},{text:`It gives the wrong probabilities`,explanation:`Where it does not overflow it is exactly right.`},{text:`It cannot handle arrays`,explanation:`NumPy vectorises it without difficulty.`}],correct:1},{question:`Logistic regression uses the same gradient expression as linear regression. Why?`,options:[{text:`Coincidence of notation`,explanation:`It is a deliberate design property of the loss.`},{text:`Cross-entropy was chosen so its derivative cancels the sigmoid's p(1−p) exactly`,explanation:`Correct. Use MSE instead and the p(1−p) survives, which strangles the gradient on confident mistakes.`},{text:`Because both are linear models`,explanation:`Logistic regression is not linear in its output; the cancellation is what makes the gradients match.`},{text:`Because the sigmoid derivative is 1`,explanation:`It is p(1−p), which is at most 0.25.`}],correct:1},{question:`Dropping the / m took MSE from 181 to 36,847 in five steps, with w flipping sign each time. What went wrong?`,options:[{text:`The gradient pointed the wrong way`,explanation:`It pointed correctly every time — the sign flips are overshoot, not a wrong direction.`},{text:`The gradient was 4x too large, so each step overshot and landed further up the other side`,explanation:`Correct. With 4 samples it is equivalent to lr = 0.2; with 4,000 it would be nan on step one.`},{text:`The data was not scaled`,explanation:`The same data trains fine with the division restored.`},{text:`Too few steps`,explanation:`More steps would diverge further.`}],correct:1},{question:`What is the practical value of writing the loop yourself?`,options:[{text:`Your implementation will be faster`,explanation:`It will be substantially slower and less well tested.`},{text:`The library's options stop being spells and start reading as choices someone made`,explanation:`Correct. learning_rate, max_iter, tol and penalty all name something you have now written.`},{text:`You can avoid using libraries in production`,explanation:`You should not — the library is faster and better tested.`},{text:`It is the only way to debug models`,explanation:`It helps, but it is not the only route.`}],correct:1}],interviewQuestions:[{question:`Implement linear regression with gradient descent from scratch.`,answer:`Four lines inside a loop. Predict with X @ w + b. Compute err = yhat − y. Update w by lr × X.T @ err / m and b by lr × err.mean(). Repeat. The shape chain is the thing to state out loud: X is (m,n), w is (n,), X @ w is (m,), and X.T @ err is (n,), matching w — a gradient whose shape does not match its parameter is wrong however plausible the numbers. On four samples following y = 2x₁ + 3x₂, 400 steps at lr 0.05 takes MSE from 181.5 to 0.0018 with w at [1.99, 2.989].`,isCaseBased:!0},{question:`Why does the sigmoid need a numerically stable implementation?`,answer:`Because exp overflows. At z = +800 the form exp(z)/(1+exp(z)) computes inf/inf and returns nan, and a single nan propagates through every subsequent gradient and destroys the run. The fix is to branch on the sign: use 1/(1+exp(−z)) where z ≥ 0 and exp(z)/(1+exp(z)) where z < 0, so the exponent argument is always negative and exp cannot overflow. This is one of the concrete reasons to use the library rather than the textbook one-liner.`,isCaseBased:!1},{question:`Why is the gradient the same for linear and logistic regression?`,answer:`Because cross-entropy is chosen to make it so. dL/dp for cross-entropy contains a 1/(p(1−p)) factor, and dp/dz for the sigmoid is p(1−p); multiplying them cancels the factor exactly and leaves dL/dz = p − y. So the gradient with respect to w is X.T @ (yhat − y)/m in both cases. If you use MSE with a sigmoid instead, the p(1−p) survives and the gradient nearly vanishes when the model is confidently wrong — 0.0099 at p = 0.99 on a 0-label.`,isCaseBased:!1},{question:`You wrote a training loop and the loss goes to nan. How do you debug it?`,answer:`Check the effective step size first. A missing division by batch size multiplies the gradient by m, which looks exactly like a learning rate that is too high — on four samples it diverged from MSE 181 to 36,847 in five steps with w flipping sign each time. Then check for exp or log without a stability guard, since one nan poisons everything downstream. Then check the sign of err — reversing it makes the loop climb. Then verify shapes: a broadcasting accident can produce a plausible-looking array of the wrong rank. Gradient checking against a numerical derivative settles it definitively.`,isCaseBased:!0},{question:`Why vectorise, if the loop gives identical numbers?`,answer:`np.allclose confirms the numbers are the same, so it is purely about who does the counting. The Python loop runs the interpreter once per sample; the matmul dispatches to compiled BLAS that uses cache blocking and SIMD, and often several cores. The difference is one to two orders of magnitude and grows with data size. It is also less code and therefore fewer places for an index bug — which is worth as much as the speed.`,isCaseBased:!1},{question:`How would you extend that loop to mini-batch gradient descent?`,answer:`Shuffle the row indices each epoch, then walk them in chunks of the batch size, and inside the chunk use exactly the same four lines with X and y sliced to that chunk — m becomes the batch size. Two things to be careful about: reshuffle every epoch rather than once, or the model sees the same batch composition repeatedly; and remember that a smaller batch means a noisier gradient, so the learning rate usually wants scaling down with it.`,isCaseBased:!1},{question:`K-Means shares the loop shape. What are its two steps?`,answer:`Assign, then update — the same predict-and-adjust rhythm. Assign computes the distance from every point to every centroid and takes the argmin, which vectorises to a broadcasting expression rather than two nested loops. Update recomputes each centroid as the mean of its assigned points. There is no learning rate and no gradient, but the structure is identical, and the reason it always terminates is the same reason gradient descent does: each step can only lower the objective.`,isCaseBased:!1},{question:`What would you check with gradient checking, and when?`,answer:`Compare the analytic gradient against (J(w+h) − J(w−h))/2h with h around 1e-5, and expect agreement to several decimals. I would run it once on a tiny input immediately after writing a backward pass by hand, never during real training — it costs a forward pass per parameter. The central difference is worth preferring to the one-sided version because its error is O(h²) rather than O(h). It is the only way to be genuinely sure a hand-derived gradient is right.`,isCaseBased:!1}],flashcards:[{front:`The four-stage loop`,back:`Predict → measure the miss → compute the slope → step downhill. Linear regression, logistic regression and K-Means all share it.`},{front:`The gradient expression`,back:`dw = X.T @ err / m, db = err.mean(). Identical for linear and logistic regression.`},{front:`The shape chain`,back:`X (m,n), w (n,), X@w (m,), err (m,), X.T (n,m), X.T@err (n,) — matching w. Most hand-written training bugs are shape bugs.`},{front:`The four-sample run`,back:`MSE 181.5 → 0.0018 over 400 steps at lr 0.05; w reaches [1.99, 2.989] against a true [2, 3].`},{front:`Why does b converge last?`,back:`Its gradient is not multiplied by a feature value, so it is smaller than the weight gradients.`},{front:`Stable sigmoid`,back:`exp overflows: exp(z)/(1+exp(z)) gives nan at z = 800. Branch on sign so the exponent argument is always negative.`},{front:`Why the gradients coincide`,back:`Cross-entropy's 1/(p(1−p)) cancels the sigmoid's p(1−p) exactly, leaving p − y. Use MSE and the factor survives.`},{front:`Dropping the / m`,back:`Gradient becomes m times too large. On 4 samples: MSE 181 → 36,847 in five steps with w flipping sign. On 4,000 it is nan immediately.`}],mindmapMarkdown:`- Writing the loop yourself
  - The shape
    - predict / measure / slope / step
    - shared by linear, logistic, K-Means
  - Linear regression
    - yhat = X @ w + b
    - dw = X.T @ err / m, db = err.mean()
    - shapes: (n,m) @ (m,) -> (n,) matches w
    - 400 steps: mse 181.5 -> 0.0018, w [1.99, 2.989]
    - b converges last (no x factor in its gradient)
  - Logistic regression
    - two changed lines: sigmoid + cross-entropy
    - SAME gradient expression
    - because cross-entropy cancels p(1-p)
  - Numerical stability
    - exp(800) = inf, inf/inf = nan
    - branch on sign of z
    - one nan poisons every later gradient
  - The classic mistake
    - dropping / m -> gradient m times too big
    - 4 samples: 181 -> 36,847 in 5 steps
    - w flips sign: overshoot, not wrong direction`};export{e as default};