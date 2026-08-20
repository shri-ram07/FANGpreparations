import type { Module } from '../types'

const m: Module = {
  id: 'ml-l2-svm',
  subjectId: 'ml',
  level: 2,
  title: 'SVM: Max Margin & the Kernel Trick',
  whyItMatters:
    'Every classifier you have met so far draws a boundary and stops there. It never asks whether the boundary is in a good place. This module answers that question with a ruler: of all the boundaries that separate the data, the best one is the one with the widest empty gap around it. Then it shows the one genuinely surprising idea in classical machine learning — how to classify data that no straight boundary can split, by computing in a space you never actually build.',
  assumes: [
    'You have read *Logistic Regression* — you know what a straight decision boundary is, and what it means for a model to have weights',
    'You have read *The Confusion Matrix* — you know what accuracy is and why it can lie',
    'School maths: what the distance from a point to a line means, and what squaring a number does',
    'Python: lists, tuples, for loops, functions, f-strings. Everything else used here is explained here.',
  ],
  estMinutes: 48,
  sections: [
    {
      type: 'intuition',
      title: 'Six points, three candidate lines. Which line is best?',
      md: `Put six points on graph paper. Three on the left belong to class **L**, three on the right belong to class **R**.

- Left group: **(1, 2), (2, 1), (2, 3)**. Right group: **(5, 2), (6, 3), (6, 1)**.
- Every vertical line between x = 2 and x = 5 separates them perfectly. So does every slightly tilted line. There are **infinitely many** perfect separators here.
- Training accuracy is 100% for all of them. So training accuracy cannot choose. Something else has to.
- The answer this module builds: measure, for each candidate line, the distance to the **nearest point of either class**. Call that distance the line\'s breathing room.
- Candidate **x = 2.5**: the nearest points are the two at x = 2, which sit **0.5** away. Tight.
- Candidate **x = 3.5**: the nearest points are at x = 2 and x = 5, both **1.5** away. Three times the room.
- Candidate tilted line **x + 0.5y = 4**: its nearest point is (2, 3), only **0.447** away. Worse than either vertical.

x = 3.5 wins. Not because it gets more training points right — they all get every point right — but because it has the most room to be wrong about a new point and still be correct.`,
    },
    {
      type: 'intuition',
      title: 'The words: margin, street, support vector',
      md: `Three terms, defined now and used for the rest of the module.

- **Margin** — the distance from the boundary to the nearest data point. For x = 3.5 above, the margin is 1.5.
- Picture the boundary not as a line but as a **street**: take the line and widen it into a band, equally on both sides, until the band first touches a data point. Street width = 2 × margin. For x = 3.5 that is a street of width 3.0, and no data point is inside it.
- **Maximum-margin classifier** — the boundary whose street is the widest possible. That, in one sentence, is what an SVM computes.
- **Support vectors** — the points the street touches when it stops widening. At x = 3.5 those are (2, 1), (2, 3), (5, 2). The other three points are not touching anything.

Why the widest street? Because a new point from class R will not land exactly where the training R points landed; it lands a bit off. If the boundary sits 1.5 units away, the new point can be off by up to 1.5 units toward the other class and still be classified correctly. If the boundary sits 0.5 units away, an error of 0.6 flips the answer.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Measure the three candidates by hand',
      code: `from math import sqrt

A = [(1, 2), (2, 1), (2, 3)]
B = [(5, 2), (6, 3), (6, 1)]

def half_width(a, b, c):
    best = 99.0
    for (x, y) in A + B:
        d = abs(a * x + b * y + c) / sqrt(a * a + b * b)
        if d < best:
            best = d
    return best

for name, a, b, c in [("x = 2.5", 1, 0, -2.5), ("x = 3.5", 1, 0, -3.5), ("tilted ", 1, 0.5, -4)]:
    h = half_width(a, b, c)
    print(name, " margin", round(h, 3), " street width", round(2 * h, 3))

# ---- real output ----
# x = 2.5  margin 0.5  street width 1.0
# x = 3.5  margin 1.5  street width 3.0
# tilted   margin 0.447  street width 0.894`,
      annotations: {
        1: 'Imports the square-root function from Python\'s built-in math module. Nothing else is needed — this snippet is plain Python.',
        3: 'The three left-hand points, each written as a tuple (x, y). A tuple is like a list but written with round brackets and cannot be changed afterwards.',
        4: 'The three right-hand points, same format.',
        6: 'Defines a function taking a, b, c — the three numbers that describe a line written as a*x + b*y + c = 0. The vertical line x = 3.5 is 1*x + 0*y - 3.5 = 0, so a=1, b=0, c=-3.5.',
        7: 'Start "best" at 99.0, a number larger than any distance we will see, so the first real distance always replaces it. This is the standard find-the-minimum pattern.',
        8: 'A + B glues the two lists into one list of six points. The (x, y) on the left of the "in" unpacks each tuple into two separate names — that is tuple unpacking.',
        9: 'The school formula for the distance from a point to a line: plug the point into a*x + b*y + c, take the absolute value so the sign of the side does not matter, and divide by the length of (a, b) to convert it to real distance units.',
        10: 'Is this point closer than the closest one seen so far?',
        11: 'If so, remember it. After the loop, "best" holds the distance to the nearest of all six points.',
        12: 'Hand back that smallest distance. That is exactly the margin of this line.',
        14: 'Three candidate lines, each written as a tuple of a name plus its a, b, c. The loop variables name, a, b, c unpack each tuple in one go.',
        15: 'Compute the margin for the current candidate.',
        16: 'Print the margin and double it to get the street width. round(h, 3) trims the float to 3 decimal places so it is readable.',
      },
    },
    { type: 'visual', component: 'SVMMarginExplorer', props: {} },
    {
      type: 'note',
      md: `Run two experiments in that panel before reading on; they are the whole lesson in thirty seconds.

- **Experiment one: which points matter.** Drag a point that has **no ring** around it. The boundary does not move at all — not slightly, not at the last decimal. Now drag a **ringed** point. The whole street swings. The ringed points are the support vectors; the rest are passengers.
- **Experiment two: what C does.** Set the **C** slider to **0.2** — street width **0.787**, and **57 of the 59 points** are support vectors. Now set C to **100** — street width **0.124**, and only **5** points are support vectors. Small C bought a wide, tolerant street that lets many points sit inside it. Large C squeezed the street down until almost nothing touches it.

Watch the printed street-width number, not just the picture. Both numbers come back on the next few pages, so it is worth seeing them move now.`,
    },
    {
      type: 'intuition',
      title: 'Hard margin breaks on real data',
      md: `**Hard margin** means the street must be completely empty: no point inside it, no point on the wrong side. That is what we computed above, and it worked because those six points were cleanly split.

- Now add one point at **(3.2, 2)**, labelled R. It sits left of the entire R group, right in the middle of the street.
- There is no longer any line with an empty street. Every line puts either that point or several L points inside. Hard margin has **no solution at all** — the solver does not return a worse answer, it fails.
- Even when a solution does exist, one point creeping close to the other class squeezes the street to a sliver. A boundary decided by one odd row is not a model.

So real SVMs use **soft margin**: points are allowed to sit inside the street, or even on the wrong side, but each one is charged a fee. The size of one point\'s violation is called its **slack** — how far past the kerb it has trespassed, measured in margin units. Zero slack means the point is safely outside the street.

The optimizer then trades: a wide street with two trespassers often beats a razor-thin street with none.`,
    },
    {
      type: 'intuition',
      title: 'Hinge loss: the fee for trespassing',
      md: `To charge a fee we need a number per point. Here is how SVM builds it.

- Relabel the classes as **−1 and +1** instead of 0 and 1. This is only a convention, but it makes the arithmetic clean.
- Write the boundary as a function **f(x) = w·x + b**. It returns a positive number on one side, negative on the other, zero exactly on the line. This f is called the **decision function**; the prediction is just its sign.
- Rescale w and b so that f is exactly **+1** at the R kerb and exactly **−1** at the L kerb. You can always do this — multiplying w and b by the same number moves nothing, it just changes the units f is reported in. With that scaling, margin = 1 / length of w, so **a wider street means a shorter w**.
- Now the quantity **y · f(x)** — the label times the decision value — is positive when the point is on its own side, and at least 1 when the point is safely outside the street.
- **Hinge loss** = **max(0, 1 − y·f(x))**. Read it directly: if y·f(x) ≥ 1 the point is past its kerb and pays exactly **zero**. If it is less than 1, it pays the shortfall, growing straight-line with how far in it has trespassed.

That exact zero is the most important number in this module. A point that pays nothing has no reason to move the boundary — which is precisely why deleting a non-support-vector changes nothing.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Hinge loss for all seven points, including the trespasser',
      code: `w = 1 / 1.5
b = -3.5 / 1.5

points = [((1, 2), -1), ((2, 1), -1), ((2, 3), -1),
          ((5, 2), 1), ((6, 3), 1), ((6, 1), 1), ((3.2, 2), 1)]

for (x, y), label in points:
    f = w * x + b
    score = label * f
    hinge = max(0.0, 1 - score)
    print(f"point ({x}, {y}) label {label:+d}  y*f = {score:6.3f}  hinge = {hinge:.3f}")

# ---- real output ----
# point (1, 2) label -1  y*f =  1.667  hinge = 0.000
# point (2, 1) label -1  y*f =  1.000  hinge = 0.000
# point (2, 3) label -1  y*f =  1.000  hinge = 0.000
# point (5, 2) label +1  y*f =  1.000  hinge = 0.000
# point (6, 3) label +1  y*f =  1.667  hinge = 0.000
# point (6, 1) label +1  y*f =  1.667  hinge = 0.000
# point (3.2, 2) label +1  y*f = -0.200  hinge = 1.200`,
      annotations: {
        1: 'The boundary x = 3.5 in decision-function form is f = 1*x - 3.5, which gives f = 1.5 at the kerbs. Dividing by 1.5 rescales it so the kerbs land at exactly +1 and -1. So w = 1/1.5 = 0.6667.',
        2: 'The same division applied to the intercept: b = -3.5/1.5 = -2.3333. Both numbers scaled together, so the line itself has not moved a millimetre.',
        4: 'The six original points plus the trespasser at (3.2, 2), each paired with its label: -1 for the left class, +1 for the right class.',
        5: 'The list continues on a second line — Python allows this because the opening bracket on line 4 is still unclosed. Purely for readability.',
        7: 'Each item is a tuple containing a tuple. The pattern (x, y), label unpacks both levels at once: the inner coordinates into x and y, the label into label.',
        8: 'The decision function. Only the x coordinate appears because this boundary is vertical — the y coordinate has weight zero.',
        9: 'Label times decision value. Positive means the point is on its own side; the value tells you how far in margin units.',
        10: 'The hinge fee. max(0.0, ...) floors it at zero, so anything already past its kerb pays nothing at all.',
        11: 'f-string printing: whatever is inside curly braces is evaluated. The :6.3f means "3 decimal places, padded to width 6" so the columns line up, and :+d prints the label with an explicit + or - sign.',
      },
    },
    {
      type: 'note',
      md: `Read those seven rows carefully. The three points at the kerbs — (2, 1), (2, 3), (5, 2) — score exactly **1.000**: that is the definition of a support vector, and it confirms the rescaling in line 1 was done right. The three interior points score **1.667** and pay nothing; delete them and the answer is identical. The trespasser scores **−0.200**, meaning it sits on the wrong side, and pays **1.200**. That single number is the entire cost the optimizer has to weigh against the width of the street.`,
    },
    {
      type: 'intuition',
      title: 'C: the price you charge for one unit of trespass',
      md: `The optimizer minimises two things at once that pull in opposite directions: it wants a **short w** (a wide street) and it wants **small total hinge** (few trespassers). **C is the exchange rate between them** — how many units of street-narrowing one unit of hinge is worth.

- **Small C** — trespassing is cheap. The optimizer keeps a wide street and simply absorbs the violations. Smoother boundary, more support vectors, **more bias**, and it underfits if C gets too small.
- **Large C** — trespassing is expensive. The optimizer contorts the boundary to keep everyone out, ending with a narrow street bent around individual points. **More variance**, and it overfits.
- The trap: people read a large C as "a stronger model". It is the opposite of a stronger *constraint on the model* — **C is the inverse of regularisation strength**, which is backwards from the alpha you saw in Ridge and Lasso. Big C = weak regularisation = messy boundary.
- Free diagnostic while tuning: as C goes **down**, the support-vector count should go **up**, because a wider street touches more points. You watched exactly this in the panel: C = 0.2 gave 57 support vectors, C = 100 gave 5.
- Tune it on a multiply-by-ten grid — C in 0.01, 0.1, 1, 10, 100 — with cross-validation. Never by eye.`,
    },
    {
      type: 'math',
      intro:
        'The soft-margin objective. Everything in it has already been built by hand above: the first term is "make the street wide", the second is the total of the hinge fees, and C is the exchange rate between them.',
      latex: [
        '\\text{margin} = \\frac{1}{\\lVert w \\rVert} \\quad\\Longrightarrow\\quad \\text{widen the street} \\;\\equiv\\; \\text{shrink } \\lVert w \\rVert',
        '\\min_{w,\\,b} \\;\\; \\underbrace{\\tfrac{1}{2}\\lVert w \\rVert^{2}}_{\\text{wide street}} \\;+\\; C \\sum_{i=1}^{n} \\underbrace{\\max\\!\\left(0,\\; 1 - y_i\\,(w \\cdot x_i + b)\\right)}_{\\text{hinge fee, per point}}, \\qquad y_i \\in \\{-1, +1\\}',
      ],
    },
    {
      type: 'note',
      md: `Two consequences worth naming. First, hinge is exactly zero for confidently-correct points, unlike the log loss you met in *Logistic Regression*, which is never zero — that is why every point keeps tugging on a logistic model forever, and why an SVM can throw most of its data away after training. Second, hinge has a sharp corner at y·f(x) = 1, so it has no slope at that one place. Plain gradient descent needs a slope everywhere, which is why SVMs are solved with a different method (quadratic programming) rather than the loop you wrote in *Gradient Descent*.`,
    },
    {
      type: 'intuition',
      title: 'The wall: data no straight boundary can split',
      md: `Everything so far assumed a line exists. Often it does not, and the smallest example needs only one axis.

- Seven points on a number line at x = **−3, −2, −1, 0, 1, 2, 3**.
- Label them by whether they are near the centre: **−1, 0, 1 are class "in"**; **−3, −2, 2, 3 are class "out"**.
- A boundary on a number line is a single threshold: "predict in above t, out below t". Try t = 0: it puts −1 in the wrong group. Try t = 1.5: it separates 2 and 3 from the rest, but −3 and −2 are still stranded on the "in" side. **No threshold works**, because the "in" class is surrounded on both sides.
- Now give each point a second coordinate: **x²**. The point x = −3 becomes (−3, 9). x = −1 becomes (−1, 1). x = 0 becomes (0, 0). x = 2 becomes (2, 4).
- In this 2-D picture the "in" points have second coordinate 0 or 1, and the "out" points have 4 or 9. A **horizontal line at height 2** separates them perfectly — and a horizontal line is a perfectly ordinary straight boundary.

The data was never unsplittable. It was unsplittable **in the space you were given**. Add the right coordinate and a straight boundary reappears.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same seven points, before and after adding x squared',
      code: `xs = [-3, -2, -1, 0, 1, 2, 3]
for x in xs:
    label = "in " if abs(x) <= 1 else "out"
    print(f"x = {x:>2}   label {label}   lifted point = ({x}, {x * x})")

# ---- real output ----
# x = -3   label out   lifted point = (-3, 9)
# x = -2   label out   lifted point = (-2, 4)
# x = -1   label in    lifted point = (-1, 1)
# x =  0   label in    lifted point = (0, 0)
# x =  1   label in    lifted point = (1, 1)
# x =  2   label out   lifted point = (2, 4)
# x =  3   label out   lifted point = (3, 9)`,
      annotations: {
        1: 'The seven positions on the number line. One coordinate each, nothing more.',
        2: 'Walk through them in order.',
        3: 'The true label. abs(x) is the distance from zero ignoring sign, so this says "in" for the three central points. The form A if test else B is Python\'s conditional expression: it evaluates the test and becomes A or B.',
        4: 'Print the original point next to its lifted version. The lift is just (x, x*x) — the original coordinate kept, plus its square added as a second coordinate. Read the output column of second coordinates: 9, 4, 1, 0, 1, 4, 9. Every "in" point is at or below 1, every "out" point is at or above 4.',
      },
    },
    {
      type: 'hinglish',
      md: `Socho ek plate pe do classes hain — beech mein ek chhota group, aur uske chaaron taraf doosra group ka ring. Koi bhi seedhi line unhe alag nahi kar sakti, kitni bhi ghumao. Ab beech waale points ko **upar utha do**, teesre dimension mein. Ab beech mein ek flat plane ghusa do — kaam khatam, dono alag.

Kernel ka asli jaadu yeh hai ki woh uthana **karna hi nahi padta**. SVM ka pura hisaab data ko sirf ek tareeke se chhoota hai: points ke beech ke **dot products**. Aur kernel function seedha bata deta hai *"agar hum utha dete, to yeh do points ka dot product kitna hota"* — bina kisi ko uthaye. Toh upar wali space chaahe 3D ho ya infinite-dimensional, tumhara kharcha original chhoti space jitna hi rehta hai. Yehi kernel trick hai: lift ka faayda, lift ka kharcha nahi.`,
    },
    {
      type: 'intuition',
      title: 'The kernel trick, step by step',
      md: `Adding x² by hand worked because there was one feature and one obvious extra coordinate. That does not scale, and the fix is the trick.

1. **The lift.** Call the mapping from old coordinates to new ones **φ** (the Greek letter phi). Above, φ(x) = (x, x²). In general you would want all products of pairs of features, or of triples, and so on.
2. **The problem with the lift.** φ explodes. All degree-4 combinations of 1000 features is roughly 40 billion new numbers **per row**. You cannot store one row, never mind a dataset. So building φ is off the table.
3. **The observation.** Write out the SVM\'s optimisation problem in full and the data appears in exactly one form: **dot products between pairs of points**, x_i · x_j. Individual coordinates never appear on their own. Not once.
4. **The trick.** So the algorithm never needs φ(x) itself — it only ever needs the *number* φ(x) · φ(z). If some cheap function **K(x, z)** returns that number directly, substitute it and nothing else in the algorithm changes.

A **kernel** is exactly that: a function K(x, z) that equals φ(x) · φ(z) for some lift φ, computed without ever building φ. You get the benefits of the enormous space at the price of the small one. And since a dot product measures similarity between two vectors, a kernel is best read as **"how similar would these two points be, in a space we never visit"**.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Proof on two points: the kernel equals the lifted dot product',
      code: `from math import sqrt

def phi(v):
    return (v[0] ** 2, sqrt(2) * v[0] * v[1], v[1] ** 2)

def dot(u, v):
    total = 0.0
    for i in range(len(u)):
        total = total + u[i] * v[i]
    return total

x = (1.0, 2.0)
z = (3.0, 1.0)
print("phi(x) =", phi(x))
print("lift, then dot :", round(dot(phi(x), phi(z)), 6))
print("kernel, no lift:", round(dot(x, z) ** 2, 6))

# ---- real output ----
# phi(x) = (1.0, 2.8284271247461903, 4.0)
# lift, then dot : 25.0
# kernel, no lift: 25.0`,
      annotations: {
        1: 'Only the square-root function is needed. Everything here is plain Python — no library does the work.',
        3: 'The explicit lift from 2-D to 3-D. It takes one point v and returns three numbers built from its two coordinates.',
        4: 'The three lifted coordinates: the first coordinate squared, the two coordinates multiplied together and scaled by root two, and the second coordinate squared. The root two is not decoration — it is exactly what makes the next result come out equal.',
        6: 'A plain dot product: multiply matching coordinates and add up the results. Works for any length, so it handles both the 2-D and the 3-D vectors.',
        7: 'The running total, started at 0.0 so it accumulates decimals.',
        8: 'range(len(u)) walks the positions 0, 1, ... up to the length of the vector.',
        9: 'Multiply the two values at this position and add to the total.',
        10: 'Hand back the sum. That single number is the dot product.',
        12: 'A first point in the original 2-D space.',
        13: 'A second point, also 2-D.',
        14: 'Show the lifted version of x so the three coordinates are visible: 1, 2.828, 4.',
        15: 'Path A, the expensive one: build both 3-D vectors, then dot them. Three multiplications, plus the cost of constructing phi twice.',
        16: 'Path B, the trick: one dot product in the ORIGINAL 2-D space (1*3 + 2*1 = 5), then squared, giving 25. Identical answer, and phi was never built. That squaring is the degree-2 polynomial kernel.',
      },
    },
    {
      type: 'math',
      intro: 'The kernel definition, the three kernels worth knowing by name, and the prediction rule they plug into.',
      latex: [
        'K(x, z) \\;=\\; \\phi(x) \\cdot \\phi(z) \\qquad \\text{computed without ever constructing } \\phi',
        '\\text{linear: } K = x \\cdot z \\qquad \\text{polynomial: } K = (x \\cdot z + c)^{d} \\qquad \\text{RBF: } K = \\exp\\!\\left(-\\gamma \\lVert x - z \\rVert^{2}\\right)',
        'f(z) \\;=\\; \\text{sign}\\!\\left( \\sum_{i \\,\\in\\, \\text{support vectors}} \\alpha_i\\, y_i\\, K(x_i, z) \\;+\\; b \\right)',
      ],
    },
    {
      type: 'intuition',
      title: 'Which kernel, and what gamma controls',
      md: `- **Linear** — K = x · z. No lift at all. Fast, and the right first try whenever the data is already close to separable in its own space.
- **Polynomial** — K = (x · z + c)^d. Equivalent to adding all products of up to d features, which captures interactions between features. Two extra knobs to tune and it becomes numerically unstable at high d, so it is rarely the answer.
- **RBF**, also called Gaussian — K = exp(−γ‖x − z‖²). Read it as similarity that fades with distance: two identical points score 1, and the score drops toward 0 as they move apart. Its hidden φ has infinitely many coordinates, which you never notice because you never build it. This is the default choice.
- **gamma (γ) = how quickly that similarity fades**, so it is really "how far one training point\'s influence reaches".
- **Small gamma** → influence reaches far → every point votes over the whole plane → smooth, almost straight boundary → **underfits**.
- **Large gamma** → influence dies within a tiny radius → each point only speaks for its immediate neighbours → small islands of prediction drawn around individual points → **overfits**, and behaves much like a 1-nearest-neighbour model.
- Rule of thumb: **start linear** when features vastly outnumber rows (text features, gene data — such data is usually already separable). **Reach for RBF** on low-dimensional, visibly curved data. Tune C and gamma together, since they interact.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Linear vs RBF on two rings that no line can split',
      code: `from sklearn.datasets import make_circles
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

X, y = make_circles(n_samples=500, factor=0.45, noise=0.12, random_state=0)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=0)

for name in ["linear", "rbf"]:
    clf = make_pipeline(StandardScaler(), SVC(kernel=name, C=1.0)).fit(Xtr, ytr)
    n_sv = len(clf[-1].support_vectors_)
    print(f"{name:7} test accuracy {clf.score(Xte, yte):.3f}   support vectors {n_sv}/{len(Xtr)}")

# ---- real output ----
# linear  test accuracy 0.440   support vectors 334/350
# rbf     test accuracy 0.973   support vectors 61/350`,
      annotations: {
        1: 'make_circles is a data generator in scikit-learn. It builds a small disc of one class with a ring of the other class around it — the 2-D version of the number-line example above.',
        2: 'train_test_split cuts the data into a part the model learns from and a part kept hidden for scoring.',
        3: 'make_pipeline chains steps so that calling .fit runs them in order, and calling .score applies the same steps to new data. This is what stops the scaling being forgotten at test time.',
        4: 'StandardScaler rescales each feature to have average 0 and spread 1. Mandatory for SVM, for reasons the last snippet in this module demonstrates.',
        5: 'SVC is scikit-learn\'s kernel SVM classifier — the thing this whole module describes.',
        7: 'Generate 500 points. factor=0.45 sets how small the inner disc is, noise=0.12 jitters the points so they overlap slightly, random_state=0 fixes the random numbers so you get these exact results too.',
        8: 'Keep 30% of the rows hidden for testing. random_state=0 again fixes which rows.',
        10: 'Run the whole thing twice, once per kernel name.',
        11: 'Build scaler-then-SVM as one object and fit it on the training rows. C=1.0 is the default violation price.',
        12: 'clf[-1] is the last step of the pipeline, the SVM itself. support_vectors_ is the array of points the street touches, and len counts them.',
        13: 'Print the accuracy on the hidden rows plus the support-vector count. The linear kernel scores 0.440 — worse than a coin flip — and needs 334 of 350 points as support vectors, because nearly every point is violating a margin that cannot exist. Same data, same C, only the similarity function changed, and RBF gets 0.973 with 61.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Sweep gamma, then sweep C',
      code: `# continues the script above - same rings, same split
for g in [0.01, 1, 100]:
    clf = make_pipeline(StandardScaler(), SVC(kernel="rbf", C=1.0, gamma=g)).fit(Xtr, ytr)
    print(f"gamma {g:<6} train {clf.score(Xtr, ytr):.3f}   test {clf.score(Xte, yte):.3f}")

for C in [0.01, 1, 1000]:
    clf = make_pipeline(StandardScaler(), SVC(kernel="rbf", C=C, gamma=1.0)).fit(Xtr, ytr)
    print(f"C {C:<7} test {clf.score(Xte, yte):.3f}   support vectors {len(clf[-1].support_vectors_)}")

# ---- real output ----
# gamma 0.01   train 0.526   test 0.440
# gamma 1      train 0.989   test 0.973
# gamma 100    train 1.000   test 0.933
#
# C 0.01    test 0.440   support vectors 335
# C 1       test 0.973   support vectors 58
# C 1000    test 0.973   support vectors 18`,
      annotations: {
        2: 'Three gamma values, each 100 times the last. Hyperparameters like this are always swept by multiplying, not adding, because what matters is the order of magnitude.',
        3: 'Same pipeline as before, with gamma set explicitly instead of left at its default.',
        4: 'Print training and test accuracy side by side — the gap between those two columns is what tells you about overfitting. Read the output: gamma 0.01 scores 0.526 on training data, barely better than guessing, because every point\'s influence is so wide that the boundary flattens out. That is underfitting. gamma 100 hits a perfect 1.000 on training while test falls to 0.933: tiny islands memorised around individual points, which is the overfitting signature.',
        6: 'Now hold gamma at 1 and move C instead, so you can see the two knobs are genuinely different.',
        7: 'C is passed to SVC as the violation price, exactly the C from the objective above.',
        8: 'Print test accuracy and the support-vector count. C = 0.01 makes violations so cheap the model gives up and scores 0.440. C = 1000 tolerates almost nothing, so the street shrinks until only 18 points touch it — here the test score happens to hold up, but a model resting on 18 points is far more fragile than one resting on 58.',
      },
    },
    {
      type: 'intuition',
      title: 'Worked case: computing the C trade-off by hand',
      md: `Take the six original points plus the trespasser at (3.2, 2) labelled R, and ask what the optimizer actually chooses. There are two sensible boundaries; compute the objective ½‖w‖² + C·(total hinge) for each.

**Option A — keep the wide street at x = 3.5.**
- Margin 1.5, so ‖w‖ = 1/1.5 = 0.6667 and ½‖w‖² = **0.222**.
- Hinge total: the six original points pay 0 (we computed this above), the trespasser pays **1.200**.
- Objective = 0.222 + 1.200·C.

**Option B — squeeze the street to keep the trespasser out.** Put the boundary between x = 2 and x = 3.2, at **x = 2.6**.
- Margin is now 0.6, so ‖w‖ = 1/0.6 = 1.6667 and ½‖w‖² = **1.389**.
- Every point is now outside its kerb, so hinge total = **0**.
- Objective = 1.389 + 0 = **1.389**, whatever C is.

**Now compare, at three values of C.**
- C = 0.5: A costs 0.222 + 0.600 = **0.822**, B costs 1.389. **A wins** — keep the wide street, eat the error.
- C = 1: A costs 0.222 + 1.200 = **1.422**, B costs 1.389. **B wins**, barely.
- C = 10: A costs 0.222 + 12.000 = **12.222**, B costs 1.389. **B wins** by a mile.
- The exact crossover: 0.222 + 1.200·C = 1.389 gives C = **0.972**.

That is the whole meaning of C in four lines of arithmetic. Below roughly 0.97 the trespasser is cheap enough to ignore and the model keeps its 3.0-wide street. Above it, the trespasser is worth more than the street, and the model gives up 60% of its breathing room for one point. Nothing about the data changed — only the price.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: forgetting to scale before an RBF kernel',
      md: `A student takes the ring data that RBF just scored 0.973 on, and re-runs it after changing the units of the second feature — say it was measured in metres and is now in tenths of a millimetre, so every value is multiplied by 10,000. The data has not changed shape at all. Only a unit changed.

- They drop the StandardScaler, because "the model worked fine, and scaling is a nice-to-have".
- Accuracy falls from **0.973 to 0.753**.

Here is why, and it is not subtle. The RBF kernel is exp(−γ‖x − z‖²), and ‖x − z‖² is the squared distance: (difference in feature 1)² + (difference in feature 2)². Feature 1 differences are around 1. Feature 2 differences are now around 10,000, and squared, around 100,000,000. Feature 1 contributes about one hundred-millionth of every distance the model computes. **The model can no longer see feature 1 at all.** One gamma has to serve both features, and no single value can be right for two scales eight orders of magnitude apart.

This is why scaling is mandatory for SVM and optional for a decision tree: a tree only asks "is feature 2 above some threshold?", and rescaling just rescales the threshold. An SVM measures distances, and distances have units.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The mistake, run',
      code: `# continues the script above - X and y are the same two rings
Xbad = X.copy()
Xbad[:, 1] = Xbad[:, 1] * 10000
Xbtr, Xbte, ybtr, ybte = train_test_split(Xbad, y, test_size=0.3, random_state=0)

raw = SVC(kernel="rbf", C=1.0).fit(Xbtr, ybtr)
scaled = make_pipeline(StandardScaler(), SVC(kernel="rbf", C=1.0)).fit(Xbtr, ybtr)
print("unscaled test accuracy", round(raw.score(Xbte, ybte), 3))
print("scaled   test accuracy", round(scaled.score(Xbte, ybte), 3))

# ---- real output ----
# unscaled test accuracy 0.753
# scaled   test accuracy 0.973`,
      annotations: {
        2: 'X.copy() makes an independent duplicate of the data table, so damaging it does not affect the original X used earlier.',
        3: 'X is a 2-D table of numbers. The square brackets [:, 1] mean "every row, column number 1" — the colon stands for all of them, and columns are counted from 0, so this is the second feature. The whole column is multiplied by 10,000, which is a pure change of units.',
        4: 'Split the damaged data the same way as before, with the same random_state so the rows land identically. Only the units differ from the earlier run.',
        6: 'Fit an RBF SVM straight on the damaged data, with no scaler in front of it. This is the mistake.',
        7: 'Fit the identical model, but with StandardScaler in front. Scaling undoes the unit change by putting both columns back on a common spread.',
        8: 'The unscaled model scores 0.753 — it has effectively lost one of its two features.',
        9: 'The scaled model scores 0.973, exactly what it got before the units were touched. Same model, same C, same gamma. The only difference is one preprocessing step.',
      },
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work these with pen and paper before reading the solutions. The arithmetic is deliberately small.

1. Class L is at (0, 0) and (0, 2); class R is at (4, 0) and (4, 2). What is the maximum-margin boundary, what is the margin, and which points are support vectors?
2. Using that boundary, write the decision function scaled so the kerbs give ±1. Then compute y·f and the hinge loss for a new point at (3, 1) labelled L.
3. You train an SVM with C = 100 and get 12 support vectors. You retrain with C = 0.1. Should the support-vector count go up or down, and why?
4. Four points on a number line: x = −2, −1, 1, 2, with labels out, in, in, out. Show that no threshold separates them, then give a lift that makes them separable and state where the new boundary sits.
5. Two points x = (2, 0) and z = (0, 3). Compute the degree-2 polynomial kernel value (x·z)², and confirm it by lifting both through φ(v) = (v₁², √2·v₁v₂, v₂²) and dotting the results.`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `1. By symmetry the widest street is the vertical line **x = 2**. The nearest points are all four of them, each exactly **2** units away, so the margin is 2 and the street width is 4. **All four points are support vectors** — every one of them touches a kerb.
2. Unscaled, f = x − 2 gives ±2 at the kerbs, so divide by 2: **f(x) = 0.5·x − 1**. For (3, 1) labelled L, the label is −1, and f = 0.5·3 − 1 = **0.5**. So y·f = −1 × 0.5 = **−0.5** — the point is on the wrong side. Hinge = max(0, 1 − (−0.5)) = **1.5**.
3. It should go **up**. Lowering C makes violations cheap, so the optimizer buys a wider street; a wider street sweeps up more points, and every point on or inside the street is a support vector. If the count instead falls when you lower C, suspect a bug — most often features that were never scaled.
4. Any threshold t splits the line into "below t" and "above t". The "in" points (−1 and 1) sit between the two "out" points, so whichever side you assign to "in", one "out" point comes with it. Lift each point to **(x, x²)**: the out points become (−2, 4) and (2, 4), the in points become (−1, 1) and (1, 1). A horizontal line at height **2.5** separates them, with a margin of 1.5 in the second coordinate.
5. x·z = 2·0 + 0·3 = **0**, so (x·z)² = **0**. Lifting: φ(x) = (4, 0, 0) and φ(z) = (0, 0, 9). Their dot product is 4·0 + 0·0 + 0·9 = **0**. They agree, and the answer says something real: these two points are perfectly dissimilar in the lifted space, which is what a kernel value of zero means.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands alone. This section names the things you will meet later so the words are not new when you do.

- **Why SVM is rarely the first choice now.** Training a kernel SVM costs roughly the square to the cube of the number of rows, and it holds a similarity value for every pair of rows — at 100,000 rows that table has 10 billion entries. SVM fades out around that size. Gradient boosting matched its accuracy on tabular data at near-linear cost, which is why it took over. Where SVM still wins: many features, few rows.
- **The linear escape hatch.** LinearSVC and SGDClassifier(loss=\'hinge\') minimise the same hinge objective in roughly linear time, but only for the linear kernel — no kernel trick available.
- **No probabilities.** An SVM outputs a signed distance from the boundary, not a probability. Setting probability=True fits a separate small model on top to convert one into the other; it is slow and often poorly calibrated. If you need P(y=1), logistic regression is the honest tool.
- **Multi-class.** SVM is binary at heart. scikit-learn\'s SVC trains one classifier for every pair of classes and lets them vote — 10 classes means 45 models, but each sees only two classes\' rows. LinearSVC instead trains one classifier per class against everything else — 10 models, each seeing all rows.
- **SVR, for regression.** The geometry inverts: instead of keeping points outside a street, you fit a tube of width epsilon around a line and want points **inside** it. Points within the tube pay zero — the direct analogue of hinge being zero past the margin — and only the ones outside pay. Kernels, scaling requirements and the cost wall all carry over unchanged.
- **Why the margin helps generalisation, formally.** There are bounds saying the generalisation gap depends on the ratio of the data\'s radius to the margin, and not on the number of features. That is the formal reason an SVM can work in an infinite-dimensional RBF space without automatically overfitting. The bounds are loose in practice; the wobbling-test-point argument from the top of this module is the one that predicts real behaviour.`,
    },
  ],
  quiz: [
    {
      question: 'You delete a training point that sits far from the boundary and re-train the SVM. What happens to the boundary?',
      options: [
        { text: 'It shifts slightly toward the deleted point\'s class', explanation: 'That is logistic-regression behaviour, where every point contributes to the loss forever. In SVM a point past its kerb has hinge loss exactly 0.' },
        {
          text: 'Nothing — it is identical, because only the support vectors define it',
          explanation: 'Correct. That point paid a hinge fee of zero, so it was contributing nothing to the objective. This is also why a trained SVM can discard most of its training data.',
        },
        { text: 'The street widens, since there is one fewer constraint', explanation: 'It was never a binding constraint. Only points on or inside the street hold the kerbs in place.' },
      ],
      correct: 1,
    },
    {
      question: 'In the worked case, at C = 0.5 the model kept the wide street and paid the trespasser\'s fee. What single change would flip it to the narrow street?',
      options: [
        { text: 'Moving the trespasser further from the boundary', explanation: 'That reduces its hinge fee, making the wide street even more attractive. It pushes the answer the wrong way.' },
        {
          text: 'Raising C above about 0.97, so the fee outweighs the cost of a narrower street',
          explanation: 'Correct. The objective was 0.222 + 1.200·C for the wide street and a flat 1.389 for the narrow one; they cross at C = 0.972.',
        },
        { text: 'Switching to an RBF kernel', explanation: 'A different kernel changes the shape of the boundary, not the exchange rate between street width and violations. That exchange rate is C.' },
      ],
      correct: 1,
    },
    {
      question: 'What exactly is the "trick" in the kernel trick?',
      options: [
        { text: 'Mapping the data into a higher-dimensional space where it becomes separable', explanation: 'That is the lift, which is the setup. Explicitly performing the lift is precisely what the trick avoids.' },
        { text: 'Computing the feature mapping faster with a clever algorithm', explanation: 'No faster mapping is involved. The mapping is never evaluated at all, at any speed.' },
        {
          text: 'The algorithm touches the data only through dot products, so a kernel can return the lifted dot product directly and the lift never happens',
          explanation: 'Correct. Because the data enters only as x_i · x_j, substituting K(x_i, x_j) buys the huge space at the small space\'s price.',
        },
      ],
      correct: 2,
    },
    {
      question: 'You set gamma very large on an RBF SVM. What do you expect to see?',
      options: [
        { text: 'A smooth, nearly straight boundary', explanation: 'That is small gamma: influence reaches far, every point votes everywhere, the boundary flattens. In the module\'s sweep, gamma = 0.01 scored 0.526 on the training data itself.' },
        {
          text: 'Tight islands of prediction around individual points: near-perfect training accuracy, worse test accuracy',
          explanation: 'Correct. Large gamma means influence dies within a tiny radius, so each point speaks only for its neighbours. The sweep showed train 1.000 and test 0.933 at gamma = 100.',
        },
        { text: 'The kernel becomes equivalent to a linear kernel', explanation: 'Small gamma is what flattens the boundary toward near-linear behaviour, not large gamma.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is hard-margin SVM almost never used?',
      options: [
        {
          text: 'It requires a completely empty street, so one mislabelled point inside the gap means there is no solution at all',
          explanation: 'Correct, and even when a solution exists, one near-outlier can crush the street to a sliver. Soft margin buys robustness by charging a fee instead of forbidding violations.',
        },
        { text: 'It trains too slowly', explanation: 'Speed is not the issue. Hard margin can simply have no feasible answer, which is a different kind of failure.' },
        { text: 'It cannot be used with kernels', explanation: 'Kernels work with either formulation. Hard versus soft margin and linear versus kernel are independent choices.' },
      ],
      correct: 0,
    },
    {
      question: 'Your RBF SVM scored 0.97 in a notebook and 0.75 in production, on data with the same distribution. What is the first thing to check?',
      options: [
        { text: 'Whether gamma was tuned on the right grid', explanation: 'Retuning cannot recover a twenty-point drop caused by the model receiving different numbers than it was trained on. Check the inputs before the hyperparameters.' },
        {
          text: 'Whether the scaler travelled with the model, so production features arrive on the same scale the model was fitted on',
          explanation: 'Correct. SVM is pure distance, so a feature arriving in different units is effectively deleted — the module\'s last snippet shows exactly this, 0.973 down to 0.753. Ship the scaler and the model as one pipeline.',
        },
        { text: 'Whether C should be raised to fit the production data harder', explanation: 'Raising C fits training noise harder. It does nothing about inputs arriving in the wrong units, and would make the model more fragile.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain SVM in two minutes without writing a single formula.',
      answer:
        'When two classes are cleanly separated, infinitely many lines split them and training accuracy cannot choose between them. SVM picks the one with the widest empty street around it, because a wide street means a new point can land some distance off and still be classified correctly. The street stops widening when it touches points on both kerbs — those are the support vectors, and every other point can be deleted with no effect on the model at all. Real data is messy, so points are allowed inside the street for a fee, and C is the size of that fee: small C buys a wide tolerant street, large C squeezes it. And when no straight boundary exists, we imagine lifting the data into a bigger space where one does. The kernel trick computes what that lift would have produced without ever performing it, because the algorithm only ever needs dot products between pairs of points.',
      isCaseBased: false,
    },
    {
      question: 'Explain the kernel trick to someone who knows what a dot product is but has never seen an SVM.',
      answer:
        'A dot product is a similarity score between two vectors. The SVM optimisation problem, written out fully, touches the data in exactly one way: dot products between pairs of points. Individual coordinates never appear. So imagine mapping every point through some function phi into a much larger space where the classes separate — the algorithm still only needs phi(x) dotted with phi(z), never phi(x) on its own. If a cheap function K(x, z) returns that number directly, you substitute it and nothing else changes. Concretely, in two dimensions (x·z) squared equals the honest dot product of the three lifted features (x1 squared, root-two x1 x2, x2 squared) — that is checkable with two small vectors. RBF corresponds to a phi with infinitely many coordinates and still costs one exponential of a squared distance. The trick is not the lift; the trick is that the lift never happens.',
      isCaseBased: false,
    },
    {
      question: 'Case: your RBF SVM scores 100% on training data and 71% on test. Walk through your diagnosis and fixes, in order.',
      answer:
        'Perfect training plus a large test gap is the overfitting signature, and RBF has exactly two knobs that produce it. First, gamma too high: the influence radius shrinks until each point is its own island, behaving like 1-nearest-neighbour. Check the support-vector count — if it has ballooned toward the number of rows, that is the tell. Second, C too high: near-zero tolerance for violations, so the boundary contorts around individual noise points. Third, check that scaling is present and inside the pipeline, because an unscaled feature makes a single gamma wrong for every feature, and a scaler fitted before the split leaks test statistics and inflates the number you were comparing against anyway. The fix is a cross-validated grid over C and gamma jointly, not one at a time, since they interact; then confirm the best setting is not sitting on the edge of the grid. If honest cross-validation still lands near 71%, the model is not the problem — you need more data or better features. Worth adding: with few rows and many features, fit a linear kernel as a baseline first, because an RBF SVM has enough capacity to memorise anything.',
      isCaseBased: true,
    },
    {
      question: 'What is C in scikit-learn, and which direction regularises?',
      answer:
        'C is the weight on the total hinge loss in the objective: minimise half the squared length of w, plus C times the sum of the hinge fees. The first term wants a wide street, the second wants no violations, and C is the exchange rate. Large C makes violations expensive, so the optimiser sacrifices street width to satisfy points — narrow margin, high variance, weak regularisation. Small C makes violations cheap, so it keeps a wide street and absorbs the errors — high bias, strong regularisation. The thing to say explicitly is that C is the inverse of regularisation strength, which is backwards from the alpha in Ridge and Lasso, and that catches people out. A useful diagnostic to mention alongside it: as C falls, the support-vector count should rise, because a wider street touches more points.',
      isCaseBased: false,
    },
    {
      question: 'Compare SVM with logistic regression. When would you pick each?',
      answer:
        'Both draw a linear boundary in whatever feature space they are given; the loss is what differs, and that difference is everything. Hinge loss is exactly zero past the margin, so the model is defined by a handful of boundary points and ignores distant points completely — robust to far outliers and compact at prediction time. Log loss is never zero, so every point keeps contributing, which is what gives logistic regression a calibrated probability. Pick logistic when you need P(y=1) for thresholding or expected-value decisions, when the row count is large since it scales roughly linearly, or when someone needs to read the coefficients. Pick SVM for small-to-medium data with a visible separation gap, for high-dimensional data like text, or when a kernel gives you non-linearity without hand-engineering features. Past roughly 100,000 rows the choice usually collapses to logistic regression or gradient boosting on cost alone.',
      isCaseBased: false,
    },
    {
      question: 'Case: on a fraud dataset with 0.5% positives your RBF SVM reports 99.5% accuracy and the stakeholder is delighted. What do you say?',
      answer:
        'That 99.5% is exactly the score of a model that predicts "not fraud" for every row, so it carries no information at that base rate. The SVM has most likely learned the majority class, because each missed fraud is cheap relative to the street width it buys. Report precision, recall and PR-AUC instead. Fixes in order: first class_weight="balanced", which scales C separately per class so a fraud violation costs about 200 times a normal one — this is the SVM-native lever and it is free. Second, move the threshold on the decision function rather than using its sign, tuned to the business cost of a missed fraud against a false alarm. Third, if you resample, do it strictly inside the cross-validation folds, never before the split. Fourth, honestly, at fraud-scale row counts a gradient-boosted model with the same class weighting is usually the better tool. State the assumption out loud: the right operating point depends on the cost ratio between a missed fraud and a blocked good customer, so ask for that number before tuning anything.',
      isCaseBased: true,
    },
    {
      question: 'Why is feature scaling mandatory for SVM but optional for a decision tree?',
      answer:
        'SVM works in distances and dot products — the squared distance inside the RBF kernel, x·z in the linear one. A feature ranging over 0 to 100,000 against one ranging 0 to 1 contributes roughly ten billion times more to every squared distance, so the small feature is effectively deleted, and one gamma cannot serve both scales. The margin itself is measured in those same units. A decision tree only asks whether a feature is above a threshold; rescaling the feature rescales the threshold and changes nothing about which rows fall on which side, so the tree is identical. The general rule: distance-based and gradient-based models — SVM, k-NN, k-means, PCA, neural nets, regularised linear models — need scaling; tree-based ones do not.',
      isCaseBased: false,
    },
    {
      question: 'SVM was state of the art in 2005 and is rarely a first choice today. What changed?',
      answer:
        'Scale. Kernel SVM training costs roughly the square to the cube of the row count and holds a kernel value for every pair of rows, so it hits a wall around 100,000 rows — which is exactly when datasets routinely started exceeding that. Gradient boosting matched or beat it on tabular data at near-linear cost, while handling mixed types and missing values natively and needing no scaling. Neural networks took over unstructured data by learning features instead of relying on a fixed kernel. SVM also gives no calibrated probabilities and no native multi-class support. Where it still wins is the opposite corner: many features and few rows, such as text with a small labelled set, or biological data with a thousand samples and twenty thousand measurements each.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Max-margin idea, one line', back: 'Infinitely many boundaries separate clean data and training accuracy cannot choose. Pick the one with the widest empty street, because a wide street tolerates a new point landing off-position.' },
    { front: 'Margin / street / support vector', back: 'Margin = distance from boundary to nearest point. Street = the band of width 2 x margin, empty of data. Support vectors = the points the street touches; delete any other point and the model is identical.' },
    { front: 'Hard vs soft margin, and slack', back: 'Hard: street must be empty, needs perfect separability, one point in the gap means no solution exists. Soft: points may sit inside for a fee; slack is how far one point trespassed. Every real SVM is soft.' },
    { front: 'C (scikit-learn)', back: 'The price of one unit of trespass — the exchange rate between street width and violations. Large C = narrow street, overfits. Small C = wide street, more bias. C is the INVERSE of regularisation strength.' },
    { front: 'Hinge loss', back: 'max(0, 1 - y*f(x)) with labels coded as -1 and +1. Exactly zero once a point is past its kerb, which is why non-support-vectors have no influence. Has a sharp corner at 1, so no plain gradient descent.' },
    { front: 'The kernel trick', back: 'The SVM touches data only through dot products between pairs of points. A kernel K(x,z) returns what phi(x)·phi(z) would have been, so you get the huge lifted space at the small space\'s cost and phi is never built.' },
    { front: 'The three kernels, and gamma', back: 'linear: x·z. polynomial: (x·z + c)^d. RBF: exp(-gamma*||x-z||^2), the default. Gamma = how fast similarity fades with distance. Small gamma = wide influence = underfit. Large gamma = tiny islands = overfit.' },
    { front: 'Scaling, and the size wall', back: 'Scaling is mandatory: SVM measures distances, so a large-unit feature deletes the others (0.973 down to 0.753 in the demo). Training costs roughly n squared to n cubed, so kernel SVM fades above about 100k rows.' },
  ],
  mindmapMarkdown: `- SVM: Max Margin & the Kernel Trick
  - Max margin
    - Many boundaries fit; pick the widest empty street
    - Margin = distance to nearest point = 1/||w||
    - Wide street absorbs a new point landing off-position
  - Support vectors
    - Only the kerb-touching points define the boundary
    - Delete any other point: identical model
    - Light at predict time, robust to far outliers
  - Hard vs soft margin
    - Hard: empty street, needs perfect separability, can have no solution
    - Soft: allow trespass, charge a fee; slack = how far in
    - Every real SVM is soft
  - Hinge loss
    - max(0, 1 - y*f(x)), labels -1 / +1
    - Zero past the kerb -> zero influence
    - Sharp corner -> quadratic programming, not plain GD
  - C
    - Exchange rate: street width vs violations
    - Large C: narrow street, overfit
    - Small C: wide street, more bias, more support vectors
    - INVERSE of regularisation strength
  - Kernel trick
    - Problem: no straight boundary in this space
    - Lift: add coordinates (x -> x, x^2) until one exists
    - Trick: algorithm needs only dot products
    - K(x,z) = phi(x).phi(z), phi never built
  - Kernels
    - linear: x.z
    - poly: (x.z + c)^d
    - RBF: exp(-gamma*||x-z||^2)
    - gamma small: smooth, underfit
    - gamma large: islands, overfit
  - Limits
    - Scaling mandatory (distances have units)
    - n^2 to n^3 -> fades above ~100k rows
    - LinearSVC / SGD hinge for linear at scale
    - No native probabilities, no native multi-class
    - SVR: epsilon tube instead of a street`,
}

export default m
