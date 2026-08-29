var e={id:`ml-l3-pca`,subjectId:`ml`,level:3,title:`PCA: Principal Component Analysis`,whyItMatters:`PCA is the standard way to take a table with many columns and describe each row with fewer numbers. It is asked about constantly, and the answer interviewers want is the covariance matrix and its eigenvectors — not an analogy.`,assumes:[`You can compute an average and square a number`,`You have seen a Python list and a for loop`,`You know the dot product: multiply matching entries and add them up (Math → Vectors & the Dot Product)`],estMinutes:26,sections:[{type:`intuition`,title:`What PCA is`,md:`**Principal Component Analysis (PCA)** takes a table with *n* columns and re-describes every row using *k* new columns, where *k* is smaller than *n*.

The new columns are called **principal components**. Each one is a direction through the data. **PC1** is the direction along which the rows are most spread out, **PC2** is the most spread-out direction at right angles to PC1 — **orthogonal** to it, in the word textbooks and interviewers use — and so on.

- In: a table, say 6 rows × 2 columns.
- Out: the same 6 rows, described by 1 number each instead of 2.
- The price: whatever variation did not lie along the directions you kept.

Everything below is that sentence, done with six real students and checked by hand.`},{type:`visual`,component:`Plot`,props:{title:`Six students, and the direction they are most spread along`,notice:`Each dot is a student. The dashed line is PC1 — the direction of greatest spread, which we are about to compute rather than eyeball. The points sit almost on it, which is why one number per student will turn out to lose very little.`,kind:`scatter`,xLabel:`hours slept`,yLabel:`hours studied (÷10)`,series:[{name:`students`,points:[[1.6,2.3],[3.6,3.3],[4,5.5],[6,6.5],[6.4,8.7],[8.4,9.7]]},{name:`PC1`,dashed:!0,points:[[1.51,1.75],[8.49,10.25]]}],markers:[{x:5,y:6,text:`mean (5, 6)`}]}},{type:`math`,intro:`This is the whole of PCA. X is the table after subtracting each column's mean (**centring**). C is the **covariance matrix**: entry (i, j) says how much columns i and j vary together. An **eigenvector** v of C is a direction C does not rotate, only stretches, and λ is how much it stretches by.`,latex:[`C = \\frac{X^{T} X}{n - 1}`,`C v = \\lambda v`,`\\text{PC1} = v_{\\max}, \\qquad \\lambda_{\\max} = \\text{variance along it}`]},{type:`intuition`,title:`A direction turns a row into one number`,md:`A **direction** is an arrow of length 1: two numbers saying how far across and how far up. **Projecting** a row onto that direction means asking "how far along this arrow does this row sit?", and the answer is a single number — the dot product of the row with the direction.

That is the whole compression. Two numbers in, one number out, and the number you get is the row's coordinate along that direction.`},{type:`code`,lang:`python`,title:`Project one point onto one direction`,code:`point = [4.0, 3.0]
direction = [0.6, 0.8]

t = point[0] * direction[0] + point[1] * direction[1]
print('projection:', t)

length = (direction[0] ** 2 + direction[1] ** 2) ** 0.5
print('direction length:', length)

# ---- real output ----
# projection: 4.800000000000001
# direction length: 1.0`,annotations:{4:`The dot product: multiply matching entries, add them up. 4.0(0.6) + 3.0(0.8) = 2.4 + 2.4 = 4.8. That single number is now the whole point. The printed 4.800000000000001 is not an error: 0.6 and 0.8 have no exact binary form, so this is the real output rather than a tidied one.`,7:`** is Python's power operator, so ** 0.5 is a square root. It must come out to 1: a direction longer than 1 would inflate every projection, and the number would measure the arrow instead of the data.`}},{type:`intuition`,title:`Which direction? The one with the largest variance`,md:`Every direction gives you a set of projections, and those projections have a **variance** — the average squared distance from their mean. PCA picks the direction whose projections have the biggest variance, because that is the direction along which the rows differ most.

You do not search for it. Centre the data, build the covariance matrix **C**, and PC1 is the eigenvector of **C** with the largest eigenvalue. That eigenvalue *is* the variance along it.`},{type:`code`,lang:`python`,title:`Build C, and check that its top eigenvector really is PC1`,code:`pts = [[1.6, 2.3], [3.6, 3.3], [4.0, 5.5], [6.0, 6.5], [6.4, 8.7], [8.4, 9.7]]
n = len(pts)
mx = sum(p[0] for p in pts) / n
my = sum(p[1] for p in pts) / n
c = [[p[0] - mx, p[1] - my] for p in pts]

sxx = sum(a * a for a, b in c) / (n - 1)
syy = sum(b * b for a, b in c) / (n - 1)
sxy = sum(a * b for a, b in c) / (n - 1)
print('C =', [[round(sxx, 3), round(sxy, 3)], [round(sxy, 3), round(syy, 3)]])
print('total variance:', round(sxx + syy, 3))

# ---- real output ----
# C = [[5.808, 6.744], [6.744, 8.492]]
# total variance: 14.3`,annotations:{3:`sum(p[0] for p in pts) is a generator expression: it produces p[0] once per row and sum adds them. Dividing by n gives the mean of column 1.`,5:`Centring: subtract each column's mean from that column. PCA measures spread, and spread is measured around the mean, so this step is not optional.`,7:`The variance of column 1. Dividing by n-1 rather than n is the sample convention, and it is what every library uses.`,9:`The covariance of the two columns: positive means they rise together. This off-diagonal number is the entire reason PC1 is tilted instead of lying along an axis.`,11:`The two variances add up to 14.3. Whatever PC1 keeps, it keeps out of this total.`}},{type:`code`,lang:`python`,title:`The eigenvector, and the check that it is one`,code:`import math

tr = sxx + syy
det = sxx * syy - sxy * sxy
lam1 = (tr + math.sqrt(tr * tr - 4 * det)) / 2

vx, vy = sxy, lam1 - sxx
L = math.hypot(vx, vy)
vx, vy = vx / L, vy / L
print('PC1 =', (round(vx, 4), round(vy, 4)))
print('C v  =', (round(sxx * vx + sxy * vy, 4), round(sxy * vx + syy * vy, 4)))
print('l v  =', (round(lam1 * vx, 4), round(lam1 * vy, 4)))
print('share kept:', round(100 * lam1 / tr, 2))

# ---- real output ----
# PC1 = (0.6344, 0.773)
# C v  = (8.8977, 10.8428)
# l v  = (8.8977, 10.8428)
# share kept: 98.09`,annotations:{5:`For a 2x2 matrix the eigenvalues solve a quadratic, so we can write them down directly. lam1 is the larger of the two: 14.0262.`,7:`math.hypot(vx, vy) is the length of the arrow. Dividing both parts by it rescales the arrow to length 1 without changing where it points.`,10:`This is the check that matters. C v and lambda times v print the same two numbers, so C really does only stretch v, never turn it. That is what "eigenvector" means, verified rather than asserted.`,12:`lambda1 / trace = 14.0262 / 14.3 = 98.09%. PC1 carries 98.09% of the variance; PC2 gets the remaining 1.91%.`}},{type:`intuition`,title:`What one number costs you`,md:`Student 1 is at (1.6, 2.3). Centred that is (−3.4, −3.7), and projected onto PC1 it becomes the single number **−5.017**.

To go back, walk −5.017 along PC1 from the mean. That **reconstruction** lands at (1.817, 2.122) against a true (1.6, 2.3) — off by 0.28. That gap is the 1.91% PC2 was holding, and it is exactly what you paid to go from two numbers to one.`},{type:`code`,lang:`python`,title:`Compress and rebuild student 1`,code:`a, b = 1.6 - mx, 2.3 - my
t = a * vx + b * vy
print('one number:', round(t, 3))

rx, ry = mx + t * vx, my + t * vy
print('rebuilt:', (round(rx, 3), round(ry, 3)))
print('error:', round(math.hypot(rx - 1.6, ry - 2.3), 4))

# ---- real output ----
# one number: -5.017
# rebuilt: (1.817, 2.122)
# error: 0.2812`,annotations:{2:`The projection again, but on centred values. Forget to centre and t measures distance from the origin instead of from the middle of the data, and every later number is wrong.`,5:`Rebuilding runs the same arithmetic backwards: scale the direction by t, then add the mean back on because we subtracted it earlier.`,7:`math.hypot gives the straight-line distance between rebuilt and true. 0.2812 is the whole cost of throwing PC2 away.`}},{type:`note`,label:`The trap`,md:`**PCA has no idea what units your columns are in.** It maximises variance, and variance depends on scale.

Record the second column in minutes instead of hours and its variance jumps from 8.5 to 30,571. PC1 becomes (0.0132, 0.9999) — 99.99% of it is now just that one column. It reports keeping 100% of the variance, and it has learned nothing except which column has the bigger units.

Standardise every column to mean 0 and variance 1 first, unless the columns are already in the same unit.`},{type:`code`,lang:`python`,title:`The same data, one column in minutes`,code:`mins = [[p[0], p[1] * 60] for p in pts]
m2 = [sum(r[i] for r in mins) / n for i in (0, 1)]
d = [[r[0] - m2[0], r[1] - m2[1]] for r in mins]

vxx = sum(x * x for x, y in d) / (n - 1)
vyy = sum(y * y for x, y in d) / (n - 1)
print('variances:', round(vxx, 1), round(vyy, 1))

# ---- real output ----
# variances: 5.8 30571.2`,annotations:{1:`[[p[0], p[1] * 60] for p in pts] is a list comprehension: build a new list by running the expression once per row. Only column 2 changes, and only its unit.`,2:`A comprehension over (0, 1) computes both column means at once. The data is identical to before; nothing has been added or removed.`,6:`5.8 against 30,571.2. Variance scales with the SQUARE of the unit, so multiplying a column by 60 multiplies its variance by 3,600 — which is how a unit change hijacks PC1.`}},{type:`note`,label:`What this does not cover`,md:`PCA finds straight directions and it never looks at your labels, so it can happily discard the one direction that separated your classes.

Two neighbours live in their own modules: **t-SNE and UMAP** (for looking at data, not for feeding models) and **anomaly detection** (finding rows unlike the rest). For tables wider than 2 columns nobody solves the quadratic by hand — libraries use SVD, which returns the same eigenvectors.`}],quiz:[{question:`What exactly is PC1?`,options:[{text:`The column of the table with the largest variance`,explanation:`No. PC1 is a direction, and it is normally a mix of all the columns rather than any single one.`},{text:`The eigenvector of the covariance matrix with the largest eigenvalue`,explanation:`Correct. That eigenvalue is the variance along it — 14.0262 out of 14.3 for the six students.`},{text:`The line that minimises vertical distance to the points`,explanation:`That is linear regression. PCA minimises perpendicular distance and has no target column at all.`},{text:`The average of all the rows`,explanation:`No. That is the mean, which PCA subtracts before it starts.`}],correct:1},{question:`Why must you centre the data before computing C?`,options:[{text:`To make the numbers smaller and faster to handle`,explanation:`Speed is irrelevant here; the correction is about meaning, not size.`},{text:`Because variance is measured around the mean, so an uncentred C measures distance from the origin instead`,explanation:`Correct. Skip centring and PC1 tends to point at where the cloud sits rather than which way it spreads.`},{text:`Because eigenvectors only exist for centred matrices`,explanation:`Not true — eigenvectors exist regardless. The problem is that you would be decomposing the wrong matrix.`},{text:`It is optional if the data is already positive`,explanation:`Sign has nothing to do with it. Uncentred data gives a wrong PC1 whether the values are positive or negative.`}],correct:1},{question:`The six-student covariance matrix has trace 14.3 and λ₁ = 14.0262. What fraction does PC2 carry?`,options:[{text:`98.09%`,explanation:`That is PC1's share, λ₁ / trace.`},{text:`1.91%`,explanation:`Correct. The eigenvalues sum to the trace, so PC2 gets 14.3 − 14.0262 = 0.2738, which is 1.91%.`},{text:`50%, because there are two components`,explanation:`Components are not equal shares; that is the entire point of ordering them.`},{text:`Cannot be known without computing the second eigenvector`,explanation:`You can: the eigenvalues always sum to the trace, so the second follows by subtraction.`}],correct:1},{question:`You record one column in minutes rather than hours and rerun PCA unchanged. What happens?`,options:[{text:`Nothing — PCA is scale-invariant`,explanation:`It is not. This is the single most common PCA mistake.`},{text:`That column's variance rises by 3,600× and PC1 becomes almost entirely that column`,explanation:`Correct. PC1 goes to (0.0132, 0.9999) and reports keeping 100% of the variance while having learned only which column has bigger units.`},{text:`The eigenvalues stay the same but the eigenvectors flip sign`,explanation:`Sign flips are harmless and unrelated; here the eigenvalues change enormously.`},{text:`PCA raises an error about inconsistent units`,explanation:`It cannot. PCA only ever sees numbers.`}],correct:1},{question:`Projecting a row onto a direction of length 2 instead of length 1 would…`,options:[{text:`double every projection, so the number measures the arrow rather than the data`,explanation:`Correct. That is why directions are always normalised to length 1.`},{text:`have no effect, since only the direction matters`,explanation:`The direction is the same but the dot product scales with the arrow's length.`},{text:`halve every projection`,explanation:`The dot product scales up with length, not down.`},{text:`make the projection negative`,explanation:`Length never changes sign; only which way the arrow points does.`}],correct:0},{question:`PCA drops the direction that happened to separate your two classes. Why is that not a bug?`,options:[{text:`Because PCA is unsupervised — it never sees the labels, and only ever keeps directions of large variance`,explanation:`Correct. A class-separating direction with small variance is exactly what PCA is designed to throw away. LDA is the supervised alternative.`},{text:`Because it only happens when the data is not centred`,explanation:`It happens on perfectly centred data. Centring is unrelated.`},{text:`Because you should have used more components — 100% always keeps the classes`,explanation:`Keeping every component keeps everything, but then you have not reduced anything.`},{text:`It is a bug, and it means the covariance matrix was computed wrongly`,explanation:`The maths is right; the objective simply is not class separation.`}],correct:0}],interviewQuestions:[{question:`Explain PCA in two sentences.`,answer:`PCA re-describes each row of a table using fewer numbers by projecting it onto a small set of directions called principal components. Those directions are the eigenvectors of the covariance matrix, ordered by eigenvalue, so the first one captures the most variance in the data.`,isCaseBased:!1},{question:`Walk me through computing PC1 by hand.`,answer:`Subtract each column's mean, so the cloud is centred. Build C = XᵀX/(n−1); for two columns that is a 2×2 with the column variances on the diagonal and their covariance off it. Solve Cv = λv — for 2×2 the eigenvalues come from a quadratic in the trace and determinant. Take the eigenvector for the larger λ and normalise it to length 1. On the six-student data C = [[5.808, 6.744], [6.744, 8.492]], λ₁ = 14.0262, and PC1 = (0.6344, 0.7730), carrying 98.09% of the total variance of 14.3.`,isCaseBased:!0},{question:`What is the difference between PCA and linear regression? They both fit a line.`,answer:`Regression has a target column and minimises vertical distance to it — error measured only in y. PCA has no target and minimises perpendicular distance to the line, treating both columns symmetrically. Swap x and y and regression gives you a different line; PCA gives you the same one.`,isCaseBased:!1},{question:`Why do practitioners standardise columns before PCA, and when should they not?`,answer:`Variance depends on units, and PCA maximises variance, so the column with the largest units dominates PC1. Recording one column in minutes rather than hours multiplies its variance by 3,600 and drives PC1 to (0.0132, 0.9999) — essentially that column alone. Standardising to mean 0, variance 1 removes the unit. The exception is when all columns are already in the same meaningful unit — pixel intensities, or returns in percent — where rescaling would destroy real relative importance.`,isCaseBased:!0},{question:`How do you choose k, the number of components to keep?`,answer:`Look at explained variance ratio λᵢ / Σλ. Common rules: keep enough components to reach a target such as 95%, or look for the elbow in the scree plot. If PCA is a preprocessing step for a model, the honest answer is to treat k as a hyperparameter and tune it against the downstream metric with cross-validation.`,isCaseBased:!1},{question:`A colleague says PCA "removes correlated features". Is that right?`,answer:`It is loosely right and precisely wrong. PCA does not remove columns; it replaces all of them with linear combinations that are uncorrelated with each other — the covariance matrix of the projected data is diagonal. Every original column still contributes to every component, which is also why the components are hard to interpret.`,isCaseBased:!1},{question:`Your PCA on a 10,000-column dataset is slow and memory-hungry. What do you do?`,answer:`Do not form the covariance matrix — for 10,000 columns that is a 10,000×10,000 matrix. Use truncated SVD directly on the centred data matrix, which gives the same components without ever materialising C, and ask only for the top k. Randomised SVD makes that cheaper again. Scikit-learn's PCA already switches to randomised solvers on large inputs.`,isCaseBased:!0},{question:`Can PCA hurt a downstream classifier? Give a concrete case.`,answer:`Yes. PCA is unsupervised, so it ranks directions by variance and has no idea which ones carry the label. If two classes are separated along a low-variance direction — a small but consistent offset — that direction sits in the discarded tail and the separation is destroyed before the classifier ever sees it. The tell is a model that performs worse after dimensionality reduction than before. LDA optimises class separation directly and is the supervised alternative.`,isCaseBased:!0}],flashcards:[{front:`PCA, in one sentence`,back:`Re-describe each row using k directions (principal components) instead of n columns, chosen as the top eigenvectors of the covariance matrix.`},{front:`The two formulas`,back:`C = XᵀX/(n−1) after centring, then Cv = λv. The eigenvector with the largest λ is PC1; λ is the variance along it.`},{front:`What does the eigenvalue mean?`,back:`The variance of the data projected onto that component. λᵢ / Σλ is the share of variance it explains.`},{front:`Why centre first?`,back:`Variance is measured around the mean. Without centring, C measures spread around the origin and PC1 points at where the cloud sits rather than how it spreads.`},{front:`Why must directions have length 1?`,back:`The projection is a dot product, which scales with the arrow's length. A length-2 arrow doubles every projection, so the number would measure the arrow, not the data.`},{front:`PCA vs linear regression`,back:`Regression minimises vertical distance to a target column; PCA minimises perpendicular distance and has no target. Swapping the axes changes the regression line but not PC1.`},{front:`The scaling trap`,back:`Variance scales with the square of the unit. Recording a column in minutes rather than hours multiplies its variance by 3,600 and PC1 becomes that column alone.`},{front:`When can PCA hurt you?`,back:`It never sees the labels. A small-variance direction that separates your classes gets discarded, and the classifier gets worse. Use LDA when separation is the goal.`}],mindmapMarkdown:`- PCA
  - What
    - n columns -> k columns
    - principal component = a direction
    - PC1 = most spread, PC2 perpendicular to it
  - How
    - centre: subtract column means
    - C = XtX/(n-1)
    - Cv = lambda v
    - PC1 = top eigenvector, lambda = variance along it
  - The six students
    - C = [[5.808, 6.744], [6.744, 8.492]]
    - lambda1 = 14.0262 of trace 14.3 -> 98.09%
    - PC1 = (0.6344, 0.7730)
    - student 1: -5.017, rebuilt (1.817, 2.122), error 0.2812
  - Traps
    - units: minutes vs hours -> variance x3600
    - unsupervised: can discard the class-separating direction
    - not regression: perpendicular, not vertical
  - Neighbours
    - t-SNE / UMAP: for looking
    - LDA: supervised alternative
    - SVD: same answer, scales`};export{e as default};