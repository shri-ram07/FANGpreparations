import type { Module } from '../types'

const m: Module = {
  id: 'math-l0-matrices-transformations',
  subjectId: 'math',
  level: 0,
  title: 'Matrices as Transformations',
  whyItMatters:
    'Every layer of every neural network is a matrix multiply. Embeddings, attention scores, PCA — all matrices doing something to space. Learn to see a matrix as motion instead of a grid and half of ML stops being notation. Bonus: the shape rule in here is what actually fixes the error message you will hit on your first training run.',
  estMinutes: 50,
  sections: [
    {
      type: 'intuition',
      title: 'A matrix is a verb, not a table',
      md: `A spreadsheet and a matrix look identical on the page. They are not the same object.

- The **table** view: a grid of numbers you index into. True, and useless for intuition.
- The **function** view: a machine that eats a vector and returns another vector. \`A @ v\` *moves* v.
- Not just any machine — a **linear** one: grid lines stay straight and evenly spaced, and the origin never moves.
- That restriction is the whole reason it can be written as a grid at all.
- Hold this for the rest of the module: *matrix = transformation of space*. Read \`A @ v\` as "apply A to v", never as "multiply some numbers".`,
    },
    {
      type: 'intuition',
      title: 'The columns are the landing spots',
      md: `Here is the single idea that turns matrices from arithmetic into pictures.

- Space is described by two **basis vectors**: î = (1, 0), one step right, and ĵ = (0, 1), one step up.
- Every vector is built from them. (3, 2) *means* 3î + 2ĵ. Nothing more.
- A linear transformation is completely pinned down by **where î and ĵ land** — because everything else is a combination of those two, and combinations survive the transformation.
- So write the two landing spots side by side as columns. That grid **is** the matrix.
- Column 1 = where î lands. Column 2 = where ĵ lands. Read every matrix this way and you stop memorizing them.`,
    },
    {
      type: 'math',
      intro: 'Matrix times vector = a weighted sum of the columns. The weights are the vector entries.',
      latex: [
        'A\\vec{v} = \\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix} \\begin{bmatrix} x \\\\ y \\end{bmatrix} = x \\begin{bmatrix} a \\\\ c \\end{bmatrix} + y \\begin{bmatrix} b \\\\ d \\end{bmatrix}',
        '\\begin{bmatrix} 2 & -1 \\\\ 1 & 3 \\end{bmatrix} \\begin{bmatrix} 3 \\\\ 2 \\end{bmatrix} = 3 \\begin{bmatrix} 2 \\\\ 1 \\end{bmatrix} + 2 \\begin{bmatrix} -1 \\\\ 3 \\end{bmatrix} = \\begin{bmatrix} 4 \\\\ 9 \\end{bmatrix}',
      ],
    },
    {
      type: 'note',
      md: `Do that second line by hand once, right now, on paper. Both ways: as a combination of columns (3 copies of the first column plus 2 of the second), and the school way by rows (2·3 − 1·2 = 4, then 1·3 + 3·2 = 9). Same 4 and 9. The row way is faster to compute; the column way is the one that tells you what happened. You want both in your head, and only one of them on your whiteboard.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'A 2x2 matrix, stepping through what it does',
        notice: 'Watch where each input lands. The landing spots of the basis vectors ARE the columns of the matrix.',
        leftLabel: 'input',
        rightLabel: 'output',
        frames: [
          {
            note: 'A = [[2, -1], [1, 3]]. Push i_hat = (1,0) through it and you get (2,1) — exactly column 1 of A.',
            stack: [{ name: 'i_hat', value: '(1, 0)', to: 'o1' }],
            heap: [{ id: 'o1', value: '(2, 1)', label: 'column 1' }],
          },
          {
            note: 'j_hat = (0,1) lands on (-1,3) — column 2. Two columns, two landing spots. That is the entire matrix.',
            stack: [
              { name: 'i_hat', value: '(1, 0)', to: 'o1' },
              { name: 'j_hat', value: '(0, 1)', to: 'o2' },
            ],
            heap: [
              { id: 'o1', value: '(2, 1)', label: 'column 1' },
              { id: 'o2', value: '(-1, 3)', label: 'column 2' },
            ],
          },
          {
            note: 'Any vector is a combination of i_hat and j_hat, so its landing spot is the same combination of the columns. v = 3i + 2j goes to 3(2,1) + 2(-1,3) = (4,9). No new rule needed.',
            stack: [{ name: 'v = 3i + 2j', value: '(3, 2)', to: 'o3' }],
            heap: [{ id: 'o3', value: '(4, 9)', label: '3(2,1) + 2(-1,3)' }],
          },
          {
            note: 'Now C = [[1, 2], [2, 4]]. Both basis vectors land on the SAME line: (2,4) is just 2x(1,2). Space collapsed from a plane to a line — det = 0, rank 1, information lost, no way back.',
            stack: [
              { name: 'i_hat', value: '(1, 0)', to: 'd1', danger: true },
              { name: 'j_hat', value: '(0, 1)', to: 'd2', danger: true },
            ],
            heap: [
              { id: 'd1', value: '(1, 2)', label: 'one line' },
              { id: 'd2', value: '(2, 4)', label: 'same line' },
            ],
          },
        ],
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The columns, confirmed in NumPy',
      code: `import numpy as np

A = np.array([[2, -1],
              [1,  3]])

print(A @ np.array([1, 0]))    # [2 1]    <- column 0: where i_hat lands
print(A @ np.array([0, 1]))    # [-1  3]  <- column 1: where j_hat lands

v = np.array([3, 2])           # v = 3*i_hat + 2*j_hat
print(A @ v)                   # [4 9]
print(3 * A[:, 0] + 2 * A[:, 1])         # [4 9]  <- identical

print(A.shape, v.shape, (A @ v).shape)   # (2, 2) (2,) (2,)`,
      annotations: {
        3: 'Rows on the page, columns in your head. A[:, 0] = (2, 1) is the only place i_hat can end up.',
        10: 'By rows if you insist: 2*3 + (-1)*2 = 4, then 1*3 + 3*2 = 9. Same answer, worse picture.',
        11: 'This line is the lesson: matrix times vector IS a weighted sum of the columns.',
        13: 'A 1-D array has shape (2,), not (2, 1). NumPy lines it up anyway — convenient now, a source of confusing bugs later.',
      },
    },
    {
      type: 'note',
      md: `If one thing on the internet earns 15 minutes of your time here, it is 3Blue1Brown's **"Essence of Linear Algebra"** — the columns-are-landing-spots picture above is his, and the animations do in seconds what a page of text cannot. Watch chapters 3 and 4 after this module, not instead of it.`,
    },
    {
      type: 'intuition',
      title: 'The geometric zoo',
      md: `Four transformations cover almost everything you will meet. Judge each by what it does to the unit square (the square with corners at the origin, î and ĵ).

- **Rotation**: the square turns, same size, same shape. Columns are (cos θ, sin θ) and (−sin θ, cos θ).
- **Scaling**: the square stretches into a rectangle. A diagonal matrix — each axis scaled on its own.
- **Shear**: the square leans into a parallelogram. Base stays put, the top slides sideways.
- **Projection**: the square is flattened onto a line. Two dimensions in, one dimension out — permanently.
- **Identity**: î and ĵ land exactly where they started, so the square does not move. The "do nothing" matrix.`,
    },
    {
      type: 'math',
      intro: 'The zoo, written out. Read each one by its columns, not its rows.',
      latex: [
        'R(\\theta) = \\begin{bmatrix} \\cos\\theta & -\\sin\\theta \\\\ \\sin\\theta & \\cos\\theta \\end{bmatrix} \\qquad S = \\begin{bmatrix} s_x & 0 \\\\ 0 & s_y \\end{bmatrix}',
        '\\text{Shear} = \\begin{bmatrix} 1 & k \\\\ 0 & 1 \\end{bmatrix} \\qquad P = \\begin{bmatrix} 1 & 0 \\\\ 0 & 0 \\end{bmatrix} \\qquad I = \\begin{bmatrix} 1 & 0 \\\\ 0 & 1 \\end{bmatrix}',
      ],
    },
    {
      type: 'intuition',
      title: 'Matrix times matrix = do one, then the other',
      md: `Two transformations back to back are themselves a transformation. The product AB is that combined transformation, precomputed.

- **AB means: apply B first, then A.** Right to left, like *f(g(x))*. Yes, it reads backwards. It is the convention.
- To find a column of AB, take the matching column of B and push it through A. That is all matrix multiplication is.
- Which is why **AB ≠ BA**: stretching then turning is not the same act as turning then stretching.
- Concrete: rotate 90° (R), stretch x by 2 (S). Take î. Stretch first → (2,0), then rotate → (0,2): length 2, pointing up.
- Rotate first → (0,1), then stretch x → still (0,1): the stretch missed it entirely. Same two moves, different answer.
- Matrix multiplication *is* associative though: (AB)C = A(BC). Grouping is free; reordering is not.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'AB is not BA — the same two moves, two answers',
      code: `import numpy as np

R = np.array([[0., -1.],      # rotate 90 degrees counter-clockwise
              [1.,  0.]])
S = np.array([[2., 0.],       # stretch x by 2, leave y alone
              [0., 1.]])

scale_then_rotate = R @ S     # the RIGHTMOST matrix acts first
rotate_then_scale = S @ R

i_hat = np.array([1., 0.])
print(scale_then_rotate @ i_hat)   # [0. 2.]  stretched, then turned up
print(rotate_then_scale @ i_hat)   # [0. 1.]  turned up first, so the stretch missed

print(np.allclose(R @ S, S @ R))   # False
print(np.linalg.det(R @ S).round(6), np.linalg.det(S @ R).round(6))   # 2.0 2.0`,
      annotations: {
        8: 'Read right to left, like f(g(x)): S happens, then R. The order that looks backwards is the standard one.',
        13: 'Two operations, opposite order, different vector. That is AB != BA in one printed line.',
        16: 'Both scale area by 2, yet the matrices differ. det(AB) = det(A)det(B) = det(BA) always — so equal determinants prove nothing about equal transformations.',
      },
    },
    {
      type: 'intuition',
      title: 'Shapes: the rule behind 90% of your ML stack traces',
      md: `An (m×n) matrix maps n-dimensional input to m-dimensional output. Rows = output size, columns = input size. Everything follows from that.

- **(m×n)(n×p) = (m×p).** The *inner* dimensions must match; they cancel. The outer ones survive.
- Say it out loud: "n in, m out" times "p in, n out" only works if the middle n agrees.
- The result's shape is the two outer numbers, in order. That is the whole rule.
- **Debugging tip**: when a matmul throws, print \`.shape\` of *both* operands on the line above, then ask one question — do I need a transpose, or did I swap the operands?
- Nine times out of ten the answer is a transpose. The tenth time you built the weight matrix the wrong way round.
- **Transpose** (Xᵀ) flips rows and columns: (m×n) becomes (n×m). It is a relabel, not a transformation of the data.`,
    },
    {
      type: 'math',
      intro: 'The shape rule, the order rule, and why XᵀX is everywhere.',
      latex: [
        '(m \\times n)(n \\times p) = m \\times p',
        '(AB)C = A(BC) \\qquad \\text{but} \\qquad AB \\neq BA',
        'X^{T}X : (n \\times m)(m \\times n) = n \\times n \\quad \\text{(features by features, samples summed away)}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'One neural network layer, and one shape error on purpose',
      code: `import numpy as np

rng = np.random.default_rng(0)
X = rng.normal(size=(4, 3))    # a batch: 4 samples, 3 features each
W = rng.normal(size=(3, 2))    # a layer: 3 features in, 2 units out
b = np.zeros(2)

print(X.shape, W.shape)        # (4, 3) (3, 2)   inner 3 == 3 -> legal
H = X @ W + b                  # (4,3) @ (3,2) -> (4,2); b broadcasts across rows
print(H.shape)                 # (4, 2)
print(np.maximum(H, 0).shape)  # (4, 2)   ReLU changes values, never shape

print(X.T.shape, (X.T @ X).shape)    # (3, 4) (3, 3)

try:
    W @ X                      # (3,2) @ (4,3): inner 2 != 4
except ValueError as e:
    print(type(e).__name__)    # ValueError`,
      annotations: {
        8: 'Inner dimensions must match; outer dimensions survive into the answer. That is the only rule you need.',
        9: 'This one line is a neural network layer. Add a nonlinearity on the next line and you have the whole thing.',
        13: 'X.T @ X is (3,4)@(4,3) = (3,3): every feature dotted with every other feature, samples summed away. That is why XᵀX shows up in covariance, PCA, and the normal equation.',
        16: 'The classic. Same two arrays, wrong order — and the fix is almost always a transpose or a swap, not new maths.',
      },
    },
    {
      type: 'intuition',
      title: 'Determinant: how much does space get inflated?',
      md: `Feed the unit square through a matrix and it comes out as some parallelogram. The determinant is that parallelogram's area, and its sign.

- **det = 3** means every area triples. **det = 0.5** means everything shrinks by half. In 3-D read "volume" instead of "area".
- **Negative det** means space got flipped over — a mirror. The magnitude is still the scale factor.
- **det(AB) = det(A)·det(B)**: do two things, the scale factors multiply. Obvious once you say it in words.
- **det = 0 is the interesting one.** The square is squashed flat — onto a line, or a point. Area zero.
- Squashed means **information is lost**: two different inputs can now land on the same output, and nothing can tell them apart afterwards.
- For a 2×2 it is ad − bc. Do not learn the 4×4 cofactor formula. Learn what the number *means*; let NumPy compute it.`,
    },
    {
      type: 'intuition',
      title: 'Inverse and rank: can you undo it?',
      md: `The **inverse** A⁻¹ is the transformation that puts everything back where it was: A⁻¹A = I.

- It exists exactly when **det(A) ≠ 0**. No collapse, no lost information, so the trip is reversible.
- det = 0 → no inverse, and no clever algorithm will find one. You cannot un-flatten a pancake.
- **Rank**, honestly: how many dimensions survive the transformation. A 3×3 that flattens 3-D space to a plane has rank 2.
- Full rank = nothing collapsed = invertible = det ≠ 0. They are four ways of saying one thing.
- In practice matrices are rarely *exactly* singular — they are **ill-conditioned**: det near zero, technically invertible, numerically a disaster. That is what regularization quietly fixes.`,
    },
    {
      type: 'intuition',
      title: 'Eigenvectors: the directions the matrix leaves alone',
      md: `Push most vectors through a matrix and they come out pointing somewhere else. A few special ones come out pointing the *same way* — just longer or shorter.

- Those are the **eigenvectors**. The stretch factor for each is its **eigenvalue** λ. Definition: Av = λv, and nothing else.
- λ = 2: that direction doubles. λ = 1: untouched. λ = 0.1: nearly crushed. λ < 0: flipped and scaled.
- They expose a transformation's *grain* — like the direction wood splits along. Everything else is just those directions mixed.
- A pure rotation in 2-D has no real eigenvectors: every direction turns. That is a feature, not a failure.
- **det = the product of the eigenvalues**: total volume change is the per-direction stretches multiplied. So one λ = 0 forces det = 0.
- Why you care: **PCA** is exactly the eigenvectors of the covariance matrix XᵀX — the directions your data varies along most, ranked by λ.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Determinant, inverse, rank, eigen — all four in twelve lines',
      code: `import numpy as np

A = np.array([[2., 1.],
              [1., 2.]])
print(np.linalg.det(A).round(6))     # 3.0   -> areas come out 3x bigger
print(np.linalg.inv(A).round(3))     # [[ 0.667 -0.333]
                                     #  [-0.333  0.667]]

C = np.array([[1., 2.],
              [2., 4.]])             # column 2 is exactly 2 x column 1
print(np.isclose(np.linalg.det(C), 0.0))   # True  -> the plane became a line
print(np.linalg.matrix_rank(C))            # 1     -> one dimension survived

print(np.sort(np.linalg.eigvals(A)).round(6))   # [1. 3.]
print(A @ np.array([1., 1.]))                   # [3. 3.] = 3 * (1,1)`,
      annotations: {
        5: 'ad - bc = 2*2 - 1*1 = 3. A scale factor for area, not a mysterious ritual number.',
        11: 'Never test a float determinant with == 0; round-off gives you 1e-17 instead. np.isclose is the honest check.',
        12: 'Rank 1 on a 2x2 means one direction was flattened away — and flattened is not undoable. np.linalg.inv(C) would raise LinAlgError.',
        14: 'Eigenvalues 1 and 3, and det = 3 = 1 * 3. The determinant is always the product of the eigenvalues.',
        15: '(1,1) comes back as (3,3): same direction, three times longer. That is what "eigenvector with eigenvalue 3" means, and nothing more.',
      },
    },
    {
      type: 'intuition',
      title: 'Where all of this actually shows up',
      md: `You are not learning this for a linear algebra exam. Here is the payoff, module by module of the rest of the plan.

- **A neural network layer is a matrix multiply**: H = X @ W + b, then a nonlinearity. That is the entire object.
- Without the nonlinearity, stacking layers is pointless: W₂(W₁X) = (W₂W₁)X, one matrix. Depth only buys you something because of the squashing in between.
- **Batch shapes**: (batch, features) @ (features, out) → (batch, out). Rows are samples, always. The batch dimension rides along untouched.
- **Embeddings** are rows of a matrix; **attention** is Q @ Kᵀ, a matrix of every-token-against-every-token similarity.
- **PCA** is eigenvectors of XᵀX. **Linear regression** closed form is (XᵀX)⁻¹Xᵀy — and it fails exactly when XᵀX is singular, i.e. when two features are duplicates.
- Every one of those is this module wearing a different hat.`,
    },
  ],
  quiz: [
    {
      question: 'What do the columns of a 2×2 matrix tell you directly?',
      options: [
        {
          text: 'Where the basis vectors î and ĵ land after the transformation',
          explanation: 'Correct. Column 1 is where î goes, column 2 is where ĵ goes. Everything else is a combination of those.',
        },
        { text: 'The eigenvalues of the transformation', explanation: 'Eigenvalues need solving for; they are not sitting in the columns. Only a diagonal matrix makes them visible.' },
        { text: 'The rows of its inverse', explanation: 'The inverse has to be computed, and only exists when det ≠ 0. No free lunch in the columns.' },
      ],
      correct: 0,
    },
    {
      question: 'A = [[2, −1], [1, 3]] (rows as written). What is A @ (3, 2)?',
      options: [
        { text: '(8, 3)', explanation: 'That is Aᵀ @ v — you used the ROWS as landing spots. The columns are where the basis vectors go.' },
        {
          text: '(4, 9)',
          explanation: 'Correct. By columns: 3(2,1) + 2(−1,3) = (6,3) + (−2,6) = (4,9). By rows: 2·3 − 1·2 = 4 and 1·3 + 3·2 = 9.',
        },
        { text: '(6, 4)', explanation: 'That is elementwise scaling by the diagonal entries — NumPy would call that A.diagonal() * v, not a matrix product.' },
      ],
      correct: 1,
    },
    {
      question: 'X has shape (32, 128) and W has shape (64, 128). Which product is legal?',
      options: [
        { text: 'X @ W', explanation: '(32,128) @ (64,128): inner dimensions 128 and 64 do not match. ValueError.' },
        {
          text: 'X @ W.T',
          explanation: 'Correct. W.T is (128, 64), so (32,128) @ (128,64) → (32,64): batch of 32, 64 outputs. Inner dims cancel, outer dims survive.',
        },
        { text: 'W @ X', explanation: '(64,128) @ (32,128): inner dimensions 128 and 32 do not match either. Swapping does not fix a transpose problem.' },
      ],
      correct: 1,
    },
    {
      question: 'np.linalg.det(M) is 0 for a 3×3 matrix M. What follows?',
      options: [
        {
          text: 'M has no inverse: it squashes 3-D space into a plane, line, or point, and information is lost',
          explanation: 'Correct. Zero volume means different inputs collide on the same output — nothing can undo that.',
        },
        { text: 'M must be the zero matrix', explanation: 'No. [[1,2],[2,4]] is full of nonzero entries and still has det 0 — its columns just point along one line.' },
        { text: 'M rotates space without scaling it', explanation: 'Backwards: a pure rotation has det = 1, preserving volume exactly. det = 0 is total collapse.' },
      ],
      correct: 0,
    },
    {
      question: 'R rotates 90°, S stretches x by 2. Why does R @ S differ from S @ R?',
      options: [
        { text: 'Matrix multiplication is only broken for rotations', explanation: 'Nothing is broken and rotations are not special. Order matters for almost every pair of matrices.' },
        {
          text: 'Stretching first stretches the original x-axis; stretching second stretches whatever landed on the x-axis — different vectors survive',
          explanation: 'Correct. î stretched then rotated gives (0,2); î rotated then stretched gives (0,1). Same two moves, different result.',
        },
        { text: 'They are equal as transformations; only their determinants differ', explanation: 'Exactly backwards. The determinants are EQUAL (both 2, since det(AB) = det(A)det(B)) while the matrices differ.' },
      ],
      correct: 1,
    },
    {
      question: 'What is special about an eigenvector v of A?',
      options: [
        {
          text: 'A @ v points along the same line as v — only the length changes, by the eigenvalue λ',
          explanation: 'Correct: Av = λv. That direction is a grain line of the transformation.',
        },
        { text: 'A @ v = 0', explanation: 'That is the null space — the λ = 0 special case, not the general definition.' },
        { text: 'v is one of the columns of A', explanation: 'Columns are landing spots of the basis vectors. Unrelated to eigenvectors except by coincidence.' },
      ],
      correct: 0,
    },
    {
      question: 'X is (1000, 5): 1000 samples, 5 features. What is the shape of XᵀX and what does it contain?',
      options: [
        { text: '(1000, 1000) — similarity between every pair of samples', explanation: 'That is X Xᵀ. Real and useful (kernels), but it grows with your dataset — 1000×1000 here.' },
        {
          text: '(5, 5) — every feature dotted with every feature',
          explanation: 'Correct. (5,1000) @ (1000,5) = (5,5). Samples are summed away; what remains is the unnormalized covariance. This is why XᵀX appears in PCA and the normal equation.',
        },
        { text: '(5, 1000) — just the transposed data', explanation: 'That is Xᵀ on its own, before the product.' },
      ],
      correct: 1,
    },
    {
      question: 'A layer computes H = X @ W + b, with X of shape (batch, 784) and 128 units out. What are the shapes of W and b?',
      options: [
        {
          text: 'W is (784, 128), b is (128,)',
          explanation: 'Correct. Inner dims 784 cancel → (batch, 128). b has one number per output unit and broadcasts down every row of the batch.',
        },
        { text: 'W is (128, 784), b is (784,)', explanation: 'Inner dims would be 784 and 128 — mismatch. This is the most common shape bug there is; a transpose fixes it.' },
        { text: 'W is (784, 128), b is (batch, 128)', explanation: 'W is right, b is wrong: a bias per sample would make the layer depend on batch size. Bias is per output unit, broadcast across rows.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain what a matrix is to a colleague who has only ever seen it as a table of numbers.',
      answer:
        'A matrix is a linear transformation of space, written down. Linear means grid lines stay straight and evenly spaced and the origin stays put. Because of that, the transformation is fully determined by where the basis vectors land — so you record those landing spots as the columns, and that grid is the matrix. Then matrix times vector is just a weighted sum of the columns, and matrix times matrix is doing one transformation after another. Interviewers listen for "columns are where the basis vectors land"; it signals you can picture the operation instead of only executing it.',
      isCaseBased: false,
    },
    {
      question: 'Why is matrix multiplication defined in that strange row-times-column way, and why is it associative but not commutative?',
      answer:
        'Because AB has to mean "apply B, then A". Column j of AB is A applied to column j of B — that requirement forces the row-dot-column arithmetic; it was not chosen for convenience. Associativity, (AB)C = A(BC), follows because both sides describe the same sequence of moves, just regrouped: composition of functions is associative. Commutativity fails because the sequence itself changed: rotating then stretching sends î to (0,1), stretching then rotating sends it to (0,2). Same two operations, different outcome.',
      isCaseBased: false,
    },
    {
      question: 'Case: a teammate hits "ValueError: matmul: input operand 1 has a mismatch in its core dimension" on the first line of their model. Walk through how you debug it.',
      answer:
        'Print the shape of both operands on the line above the crash, then read the rule: (m×n)(n×p) = (m×p), inner dims must match. Now ask three questions in order. (1) Is one of them transposed? Weights stored as (out, in) instead of (in, out) is the usual culprit — X @ W.T fixes it. (2) Are the operands swapped? A layer is X @ W, not W @ X, because rows of X are samples. (3) Is the batch dimension where I think it is? Some frameworks default to (features, batch). Then check the actual number that mismatched: if it equals your batch size, you have transposed the data; if it equals your feature count, you have transposed the weights. Fix the shape at the source, do not sprinkle .reshape() calls — reshape silently reinterprets memory and turns a loud crash into a silent wrong answer.',
      isCaseBased: true,
    },
    {
      question: 'What does the determinant mean geometrically, and what does det = 0 tell you in a modelling context?',
      answer:
        'The determinant is the factor by which the transformation scales area (2-D) or volume (n-D); a negative sign means space was flipped. det = 0 means the transformation squashed space into a lower dimension — area zero. In modelling that is the signal that your inputs are redundant: if two features are duplicates or one is a linear combination of others, XᵀX is singular, the closed-form regression solution (XᵀX)⁻¹Xᵀy does not exist, and the model has no unique answer. Practically you rarely hit exact zero — you hit near-zero, which is worse because it "works" while producing wildly unstable coefficients. Fixes: drop the collinear feature, or add ridge regularization, which adds λI and pushes the determinant away from zero by construction.',
      isCaseBased: false,
    },
    {
      question: 'Explain eigenvectors and eigenvalues without writing a characteristic polynomial, and say why PCA cares.',
      answer:
        'Most vectors get knocked off their line by a transformation. Eigenvectors are the ones that do not — they come out along the same line, scaled by λ, their eigenvalue. They are the grain of the transformation: the directions it treats simply. PCA applies this to the covariance matrix of the data. Its eigenvectors are the directions along which the data varies, and each eigenvalue is how much variance lies along that direction. Sort by λ, keep the top k, and you have compressed the data while keeping as much variance as possible. The reason it is eigenvectors and not any other basis is that covariance is symmetric, so its eigenvectors are guaranteed real and mutually perpendicular — you get an honest rotated coordinate system for free.',
      isCaseBased: false,
    },
    {
      question: 'Case: a linear regression solve raises "Singular matrix" on XᵀX. What happened, and what are your options?',
      answer:
        'XᵀX is singular means the columns of X are linearly dependent — the feature matrix does not span as many dimensions as it has columns. Common causes: a duplicated feature, a feature that is a sum or scaled copy of others, one-hot encoding without dropping a level (the dummy variable trap — the columns sum to the all-ones column), or more features than samples, which makes XᵀX rank-deficient automatically. Options: (1) find and drop the dependent column — check rank versus column count and inspect the correlation matrix; (2) ridge regression, which solves (XᵀX + λI)⁻¹Xᵀy and is always invertible for λ > 0; (3) use the pseudo-inverse or an SVD-based solver such as np.linalg.lstsq, which returns the minimum-norm solution instead of raising. Naming the dummy-variable trap specifically is what separates a memorized answer from a lived one.',
      isCaseBased: true,
    },
    {
      question: 'How would you verify, without a proof, that two matrices represent different transformations?',
      answer:
        'Apply both to the basis vectors and compare where they land — that is a complete test, because the landing spots of the basis are the columns and the columns are the matrix. In code: np.allclose(A, B). What does NOT work is comparing determinants: det(AB) = det(A)det(B) = det(BA), so a rotate-then-scale and a scale-then-rotate pair have identical determinants while being genuinely different transformations. Same trap with trace and with eigenvalues: AB and BA share eigenvalues but are not the same matrix. Summary statistics can prove difference, never sameness.',
      isCaseBased: false,
    },
    {
      question: 'Define rank in plain language and connect it to invertibility.',
      answer:
        'Rank is how many dimensions survive the transformation. An n×n matrix of rank n keeps everything: nothing collapsed, det ≠ 0, an inverse exists. Rank below n means at least one direction was flattened to zero, so different inputs now land on the same output and the map cannot be undone — det = 0, no inverse. For a data matrix, rank is the number of genuinely independent features; the rest are redundant. The practical version is that exact rank deficiency is rare in floating point, so you look at the condition number (largest singular value over smallest) rather than the rank itself. A huge condition number means "effectively rank deficient", which is where models start producing unstable coefficients.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague stacks three Dense layers with no activation functions and reports it performs identically to one layer. Explain, and say what you would tell them to change.',
      answer:
        'It IS one layer. W₃(W₂(W₁x)) = (W₃W₂W₁)x, and the product of three matrices is a single matrix — depth without nonlinearity buys exactly zero expressive power, only wasted compute and more parameters to overfit with. Composition of linear maps is linear, always. The fix is a nonlinearity between layers (ReLU is the default) so the composition can bend space instead of only rotating, scaling, and shearing it. Worth adding: biases do not save it either, since composing affine maps yields another affine map. This is the cleanest one-line justification for why activation functions exist at all, and it is a favourite interview question precisely because it tests whether you understand composition or just stack Keras calls.',
      isCaseBased: true,
    },
    {
      question: 'Why do we write a batch of data as (batch, features) and multiply X @ W rather than W @ X?',
      answer:
        'Convention plus memory layout. Rows-as-samples means (batch, features) @ (features, out) → (batch, out): the batch dimension is the outer dimension, so it rides through untouched and every sample is processed independently and in parallel. It also matches row-major memory, so one sample is contiguous — good for cache behaviour and for streaming batches. W @ X with W as (out, features) and X as (features, batch) is the same maths transposed, and some textbooks and older frameworks do write it that way. What matters in an interview is that you can state the shapes either way and say which convention your framework uses; getting this backwards is the number-one source of matmul errors in real code.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Matrix, in one sentence', back: 'A linear transformation of space, written as a grid. Not a table you index — a machine that moves vectors.' },
    { front: 'What are the columns of a matrix?', back: 'Where the basis vectors land. Column 1 = where î goes, column 2 = where ĵ goes. Read every matrix this way.' },
    { front: 'Matrix × vector', back: 'A weighted sum of the columns, weights = the vector entries. [[2,−1],[1,3]] @ (3,2) = 3(2,1) + 2(−1,3) = (4,9).' },
    { front: 'What does AB mean, and why is AB ≠ BA?', back: 'Apply B first, then A (right to left, like f(g(x))). Order changes the result: stretch-then-rotate ≠ rotate-then-stretch. Associative — (AB)C = A(BC) — but never commutative.' },
    { front: 'The shape rule', back: '(m×n)(n×p) = (m×p). Inner dims must match and cancel; outer dims survive. Debug a matmul error by printing .shape of both operands — the fix is usually a transpose.' },
    { front: 'Identity matrix', back: 'Columns are î and ĵ unchanged — 1s on the diagonal, 0s elsewhere. AI = IA = A. The "do nothing" transformation.' },
    { front: 'Transpose, and why XᵀX is everywhere', back: 'Xᵀ flips rows and columns: (m×n) → (n×m). For X = (samples, features), XᵀX is (features, features) — every feature dotted with every feature. That is covariance, and it drives PCA and the normal equation.' },
    { front: 'Determinant', back: 'The factor by which area (2-D) or volume (n-D) is scaled; negative = space flipped. det(AB) = det(A)det(B), and det = the product of the eigenvalues. For 2×2: ad − bc.' },
    { front: 'det = 0 means…', back: 'Space collapsed into a lower dimension. Information lost, no inverse, rank below full. In data: your features are linearly dependent.' },
    { front: 'Eigenvector / eigenvalue', back: 'Av = λv: a direction the matrix leaves alone, scaled by λ. The transformation grain. PCA = eigenvectors of the covariance matrix, ranked by λ = variance explained.' },
  ],
  mindmapMarkdown: `- Matrices as Transformations
  - Table vs function
    - Not a spreadsheet: a machine that moves space
    - Linear: grid stays straight, origin fixed
  - Columns are landing spots
    - Column 1 = where i_hat lands, column 2 = where j_hat lands
    - A @ v = weighted sum of the columns
  - The zoo
    - Rotation, scaling, shear, identity
    - Projection flattens the square
  - Composition
    - AB = apply B first, then A
    - AB != BA: rotate-then-scale is not scale-then-rotate
  - Shapes
    - (m x n)(n x p) = m x p, inner dims must match
    - Debug: print .shape on both operands
  - Determinant and rank
    - Area / volume scale factor
    - det = 0 -> collapse, no inverse, information lost
    - Rank = how many dimensions survive
  - Transpose
    - Flip rows and columns
    - X^T X = features x features (PCA, normal equation)
  - Eigen
    - Direction kept, length scaled by lambda
    - PCA finds them; they show the grain
  - In ML
    - Layer = X @ W + b, then a nonlinearity
    - (batch, features) @ (features, out)`,
}

export default m
