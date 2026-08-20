import type { Module } from '../types'

const m: Module = {
  id: 'math-l0-matrices-transformations',
  subjectId: 'math',
  level: 0,
  title: 'Matrices as Transformations',
  whyItMatters:
    'One line of code sits inside every neural network ever trained: a matrix times an input, plus a bias. If you can read that line, you can read the network. This module builds a matrix from nothing, moves one specific point with it by hand, writes the multiply yourself in plain Python before touching any library, and then spends real time on the shape rule - the one rule whose violation produces the first error message almost every beginner meets.',
  assumes: [
    'Read *Vectors & the Dot Product* first. This module uses the dot product constantly and does not re-teach it.',
    'You know what a Python list is, and a list of lists',
    'You have written a for loop and used range()',
    'School algebra: you can multiply and add numbers, and you know what a coordinate pair like (3, 2) means',
  ],
  estMinutes: 45,
  sections: [
    {
      type: 'intuition',
      title: 'A machine that moves a point',
      md: `Start with a point on graph paper: **(3, 2)**. Three steps right, two steps up.

Now here is a small grid of numbers. Four numbers, arranged in two rows of two:

- Top row: **2, -1**
- Bottom row: **1, 3**

That grid is called a **matrix**. On its own it is just four numbers. What makes it interesting is what you can *do* with it: feed the point (3, 2) in, and a different point comes out. Here is the recipe, and it is the whole recipe.

- Take the **top row** (2, -1) and the point (3, 2). Multiply them position by position and add: 2x3 + (-1)x2 = 6 - 2 = **4**.
- Take the **bottom row** (1, 3) and the same point: 1x3 + 3x2 = 3 + 6 = **9**.
- Stack those two answers: the point (3, 2) came out as **(4, 9)**.

The point moved. It started at (3, 2) and landed at (4, 9). That is what a matrix is *for*: it is a machine that takes a point somewhere else. Not a spreadsheet you look things up in - a machine that moves things.

Every layer of every neural network is exactly this machine, run on much bigger grids.`,
    },
    {
      type: 'note',
      md: `You have already done the arithmetic in that recipe. "Multiply position by position and add" is the **dot product** from the previous module. So one row of a matrix, dotted with the input vector, produces one number of the output. A matrix with two rows is simply two dot products stacked. That is the only new idea so far, and it is a small one.`,
    },
    {
      type: 'intuition',
      title: 'The words, all of them, once',
      md: `Six words, defined here, used for the rest of the module. Nothing else is assumed.

- **Matrix** - a rectangular grid of numbers. Each number in it is called an **entry**.
- **Row** - one horizontal line of the grid, read left to right. In the matrix above, (2, -1) is the first row.
- **Column** - one vertical line, read top to bottom. In the matrix above, (2, 1) is the first column: the 2 from the top row and the 1 from the bottom row.
- **Shape** - how big the grid is, written **(rows x columns)**, rows always first. Our matrix has 2 rows and 2 columns, so its shape is (2 x 2). A grid with 3 rows and 5 columns has shape (3 x 5), even if the 5 feels bigger.
- **Vector** - a single list of numbers, like (3, 2). You can also think of it as a matrix with one column.
- **Matrix-vector product** - the recipe you just ran: one dot product per row, stacked into a new vector. Written **A v**, or in Python \`A @ v\`.

Say the shape out loud as "two by two", never "two two". Rows first, always. Half the bugs later in this module come from people who got casual about that.`,
    },
    {
      type: 'math',
      intro: 'The recipe in symbols. The letters a, b, c, d are just names for the four entries - read it next to the numbers you already computed.',
      latex: [
        'A = \\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}, \\quad \\vec{v} = \\begin{bmatrix} x \\\\ y \\end{bmatrix}, \\quad A\\vec{v} = \\begin{bmatrix} ax + by \\\\ cx + dy \\end{bmatrix}',
        '\\begin{bmatrix} 2 & -1 \\\\ 1 & 3 \\end{bmatrix} \\begin{bmatrix} 3 \\\\ 2 \\end{bmatrix} = \\begin{bmatrix} 2(3) + (-1)(2) \\\\ 1(3) + 3(2) \\end{bmatrix} = \\begin{bmatrix} 4 \\\\ 9 \\end{bmatrix}',
      ],
    },
    {
      type: 'intuition',
      title: 'What "linear" means, and why it is the whole reason this works',
      md: `A matrix cannot describe every possible way of moving points around. It describes only the **linear** ones. Picture the plane as graph paper with grid lines on it, and push the whole sheet through the machine.

- The grid lines **stay straight**. A straight line goes in, a straight line comes out - never a curve.
- The grid lines **stay evenly spaced**. If the spacing doubles somewhere, it doubled everywhere along that direction.
- The **origin (0, 0) does not move**. Check it: 2x0 + (-1)x0 = 0, and 1x0 + 3x0 = 0. Out comes (0, 0).

Two consequences follow directly, and they are what make the grid of numbers enough to describe the whole motion.

- Doubling the input doubles the output. Feed in (6, 4), which is 2 times (3, 2), and you get 2x6 + (-1)x4 = 8 and 1x6 + 3x4 = 18 - that is (8, 18), exactly 2 times (4, 9).
- Adding two inputs adds their outputs. Where (1, 0) and (0, 1) land tells you where (1, 1) lands: just add the two landing spots.

That second point is worth holding onto. Because sums and stretches survive the machine, you only need to know where a couple of simple inputs land, and everything else follows. Those landing spots are exactly the columns, which is the next section.`,
    },
    {
      type: 'intuition',
      title: 'The columns are the landing spots',
      md: `Take the two simplest points on the plane and push them through our matrix by hand.

- **(1, 0)**, one step right. Top row: 2x1 + (-1)x0 = 2. Bottom row: 1x1 + 3x0 = 1. It lands on **(2, 1)** - which is the **first column** of the matrix.
- **(0, 1)**, one step up. Top row: 2x0 + (-1)x1 = -1. Bottom row: 1x0 + 3x1 = 3. It lands on **(-1, 3)** - the **second column**.

That is not a coincidence and it is not a trick. It happens because multiplying by (1, 0) selects the first entry of each row, and those first entries stacked up *are* the first column.

So a matrix is a list of landing spots. Column 1 says where one-step-right ends up; column 2 says where one-step-up ends up. And since (3, 2) is just 3 steps right plus 2 steps up, its landing spot is 3 copies of column 1 plus 2 copies of column 2:

3 x (2, 1) + 2 x (-1, 3) = (6, 3) + (-2, 6) = **(4, 9)**. The same answer as the row recipe, arrived at from the other side.

Two ways to compute, one result. Rows are faster to calculate; columns tell you what the matrix *does*.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 1: write the matrix-vector product yourself, no libraries',
      code: `A = [[2, -1],
     [1,  3]]
v = [3, 2]

def matvec(M, x):
    out = []
    for row in M:
        total = 0
        for j in range(len(x)):
            total = total + row[j] * x[j]
        out.append(total)
    return out

print(matvec(A, v))

# ---- real output ----
# [4, 9]`,
      annotations: {
        1: 'A matrix in plain Python is a list of lists: the outer list holds the rows, and each inner list is one row. This line starts the outer list and gives the first row, (2, -1).',
        2: 'The second row, (1, 3). Written on its own line only so the grid on screen looks like the grid on paper. Python does not care.',
        3: 'The input vector, an ordinary list of two numbers. This is the point (3, 2).',
        5: 'A function taking a matrix M and a vector x. Naming it lets us reuse it in later snippets instead of retyping the loops.',
        6: 'The answer starts as an empty list. One number will be appended for each row of M.',
        7: 'Walk the rows one at a time. Each pass through this loop produces exactly one number of the output - so the output has as many numbers as M has rows.',
        8: 'A running total for this row, reset to zero at the start of every row.',
        9: 'range(len(x)) gives the positions 0, 1, ... of the input vector. j is the position we are currently at.',
        10: 'The dot product, one step at a time: multiply the entry of the row at position j by the entry of x at the same position, and add it on.',
        11: 'The row is finished, so its total is one complete output number. Append it to the answer.',
        12: 'Hand the finished list back to whoever called the function.',
        14: 'Run it on our matrix and our point. Compare with the (4, 9) you computed by hand two sections ago - it must match, or one of us made an arithmetic mistake.',
      },
    },
    {
      type: 'intuition',
      title: 'The shape rule: the single most common beginner error in ML code',
      md: `So far the machine took a 2-number input and gave a 2-number output. Nothing forces those to be equal. A matrix of shape **(m x n)** takes an **n-number input** and returns an **m-number output**.

Read that off the grid directly. Each output number comes from one row, so the number of rows m is the size of the output. Each row must have one entry per input number, so the number of columns n is the size of the input. Rows out, columns in.

Now the rule that governs every matrix product you will ever write:

- **(m x n) times (n x p) gives (m x p).**
- The two **inner** numbers - the n on the right of the first shape and the n on the left of the second - **must be equal**. If they are not, the product does not exist. Not "is wrong": does not exist.
- The two **outer** numbers, m and p, survive and become the shape of the answer.

Why must the inner numbers match? Because the first matrix expects an input of size n, and the second matrix produces outputs of size n. The first one is being fed by the second. If the second hands over 3 numbers and the first was built to eat 2, there is nothing sensible to do. That is the entire justification, and it is worth saying to yourself in words the first ten times.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 2: shapes, and a function that checks the rule',
      code: `def shape(M):
    return (len(M), len(M[0]))

A = [[2, -1], [1, 3]]
B = [[1, 0, 4], [2, 5, 1]]
C = [[1, 2], [3, 4], [5, 6]]

print(shape(A), shape(B), shape(C))

def inner_sizes_match(P, Q):
    return shape(P)[1] == shape(Q)[0]

print(inner_sizes_match(A, B))
print(inner_sizes_match(B, A))
print(inner_sizes_match(A, C))

# ---- real output ----
# (2, 2) (2, 3) (3, 2)
# True
# False
# False`,
      annotations: {
        1: 'A helper that reports a matrix\'s shape, so we never have to guess it by eye.',
        2: 'len(M) counts the rows, because M is a list of rows. len(M[0]) counts the entries in the first row, which is the number of columns. Returned as a pair, rows first.',
        4: 'A 2-row, 2-column matrix. Written on one line here to keep the snippet short; it is the same A as before.',
        5: 'Two rows of three entries each: shape (2 x 3). It takes a 3-number input and returns a 2-number output.',
        6: 'Three rows of two entries each: shape (3 x 2). The mirror image of B, and a useful trap - a (2 x 3) and a (3 x 2) are different matrices.',
        8: 'Print all three shapes together, so you can see rows-first spelled out before the rule is applied.',
        10: 'The rule itself, as one function: given P and Q, may we compute P times Q?',
        11: 'shape(P)[1] is P\'s column count - the size of input P expects. shape(Q)[0] is Q\'s row count - the size of output Q produces. Equal means legal.',
        13: 'A is (2 x 2), B is (2 x 3). Inner numbers are 2 and 2, so this is legal and the answer will be (2 x 3).',
        14: 'B is (2 x 3), A is (2 x 2). Inner numbers are 3 and 2. Not equal, so B times A does not exist - even though A times B did. Order matters enormously.',
        15: 'A is (2 x 2), C is (3 x 2). Inner numbers 2 and 3. Also illegal. Note that C times A would be fine: (3 x 2) times (2 x 2) gives (3 x 2).',
      },
    },
    {
      type: 'intuition',
      title: 'Matrix times matrix: do one machine, then the other',
      md: `A **matrix-matrix product** A B is another matrix, and here is what it means: it is the single machine that does the same thing as running B first and then A.

- Column j of the answer is: take column j of B, and push it through A with the matrix-vector recipe you already wrote.
- That is why the arithmetic looks the way it does. Entry (i, j) of the answer is row i of A dotted with column j of B. Row dot column, every time.
- **A B means B happens first.** It reads right to left, the same way *f(g(x))* means g runs first. It looks backwards on the page. It is the standard convention and you get used to it.
- Because the order of the two machines changed, **A B is usually not the same as B A** - and as the shapes above showed, B A may not even be legal.

The shape rule is now automatic: A is (m x n), so it eats n-number inputs. B is (n x p), so each of its p columns is an n-number output, exactly what A eats. p columns go in, p columns come out, each of size m. Hence (m x p).`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 3: matrix times matrix, by hand, with three loops',
      code: `def matmul(P, Q):
    m, n = shape(P)
    p = shape(Q)[1]
    out = []
    for i in range(m):
        row = []
        for j in range(p):
            total = 0
            for k in range(n):
                total = total + P[i][k] * Q[k][j]
            row.append(total)
        out.append(row)
    return out

print(matmul(A, B))
print(shape(matmul(A, B)))

# ---- real output ----
# [[0, -5, 7], [7, 15, 7]]
# (2, 3)`,
      annotations: {
        1: 'P times Q, with P and Q both lists of lists. Same idea as matvec, one loop deeper.',
        2: 'Tuple unpacking: shape(P) returns a pair, and this line puts the first number into m and the second into n in one go. m is the row count of the answer; n is the inner size that has to match.',
        3: 'The answer has as many columns as Q does, so grab Q\'s column count and call it p. Now we know the answer is (m x p) before computing a single entry.',
        4: 'The answer starts empty and gets one row appended per pass of the outer loop.',
        5: 'Outer loop over the rows of the answer, i = 0, 1, ..., m-1.',
        6: 'A fresh empty row for this i.',
        7: 'Middle loop over the columns of the answer, j = 0, 1, ..., p-1. Together i and j name one entry of the answer.',
        8: 'The running total for entry (i, j), reset to zero before each entry.',
        9: 'Inner loop over the shared size n. This is the loop that would break if the inner numbers did not match.',
        10: 'The dot product of row i of P with column j of Q. P[i][k] walks along the row; Q[k][j] walks down the column, because the first index of Q is its row number.',
        11: 'Entry (i, j) is finished; put it at the end of the current row.',
        12: 'The row is finished; put it at the end of the answer.',
        13: 'Return the completed grid.',
        15: 'A is (2 x 2) and B is (2 x 3). Check the first entry by hand: row 1 of A is (2, -1), column 1 of B is (1, 2), so 2x1 + (-1)x2 = 0. The printed answer starts with 0.',
        16: 'The shape came out (2 x 3) - the two outer numbers of (2 x 2) and (2 x 3), exactly as the rule promised.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 4: make the mismatch fail loudly, and read the error',
      code: `def safe_matmul(P, Q):
    if shape(P)[1] != shape(Q)[0]:
        raise ValueError('inner sizes ' + str(shape(P)[1]) + ' and ' + str(shape(Q)[0]) + ' differ')
    return matmul(P, Q)

print(shape(A), shape(C))
try:
    safe_matmul(A, C)
except ValueError as e:
    print('ValueError:', e)
print(safe_matmul(C, A))

# ---- real output ----
# (2, 2) (3, 2)
# ValueError: inner sizes 2 and 3 differ
# [[4, 5], [10, 9], [16, 13]]`,
      annotations: {
        1: 'The same product as before, wrapped in a check.',
        2: 'Columns of P against rows of Q - the two inner numbers. If they differ, there is no product to compute.',
        3: 'raise stops the function immediately and reports a problem instead of returning a value. ValueError is Python\'s standard "the value you passed me is wrong" error. str() turns the numbers into text so they can be joined onto the message with +.',
        4: 'Shapes agree, so hand the work to the plain matmul from step 3.',
        6: 'A is (2 x 2), C is (3 x 2). Inner numbers 2 and 3.',
        7: 'try starts a block where an error is expected. Without it, the raise would stop the whole program.',
        8: 'The illegal product. A wants a 2-number input per row; C supplies 3 rows. Nothing to compute.',
        9: 'except catches the ValueError and stores it in e, so the program continues instead of crashing.',
        10: 'Print the message. This is what a shape error means in words: one of these two matrices is the wrong way round. The fix is almost always to swap the operands or transpose one of them - never to reshape, which silently reinterprets your numbers.',
        11: 'The same two matrices in the other order: C is (3 x 2), A is (2 x 2), inner numbers 2 and 2. Legal, and the answer is (3 x 2).',
      },
    },
    {
      type: 'intuition',
      title: 'Two named matrices you will see constantly',
      md: `Two special cases, both defined here because they show up in every later module.

- The **identity matrix**, written I, is the do-nothing machine. In 2-D it is rows (1, 0) and (0, 1). Push (3, 2) through it: 1x3 + 0x2 = 3, and 0x3 + 1x2 = 2. Out comes (3, 2), unchanged. Its columns are the landing spots of one-step-right and one-step-up, and they land exactly where they started. For any A of matching shape, A I = I A = A.
- The **transpose** of a matrix, written A with a small T after it, flips it across its diagonal: the first row becomes the first column, the second row becomes the second column, and so on. A matrix of shape (m x n) becomes shape (n x m).

Transposing our A - rows (2, -1) and (1, 3) - gives rows (2, 1) and (-1, 3). Note what happened: the old columns became the new rows.

Transpose matters because it is the usual fix for a shape mismatch. If you have a (2 x 3) and you needed a (3 x 2), the numbers you want are all there, just arranged the other way. But transposing when the shapes already lined up is a real bug and a quiet one, because the product still computes - it just computes the wrong thing. There is a worked example of exactly that failure further down.`,
    },
    {
      type: 'intuition',
      title: 'What specific matrices do to space',
      md: `Every matrix moves points. Different matrices move them in recognisably different ways. Here are the four you should be able to recognise on sight, each judged by what it does to the point **(3, 2)**.

- **Scaling** - rows (2, 0) and (0, 3). Output: 2x3 + 0x2 = 6, and 0x3 + 3x2 = 6, so (3, 2) goes to **(6, 6)**. The x-coordinate doubled, the y tripled. Zeros off the diagonal mean the two axes never mix.
- **Rotation by 90 degrees** - rows (0, -1) and (1, 0). Output: 0x3 - 1x2 = -2, and 1x3 + 0x2 = 3, so (3, 2) goes to **(-2, 3)**. Same distance from the origin, turned a quarter turn anticlockwise.
- **Shear** - rows (1, 1) and (0, 1). Output: 1x3 + 1x2 = 5, and 0x3 + 1x2 = 2, so (3, 2) goes to **(5, 2)**. The height is untouched, but everything slides sideways by an amount equal to its height. A square leans into a parallelogram.
- **Projection onto the x-axis** - rows (1, 0) and (0, 0). Output: 3, and 0, so (3, 2) goes to **(3, 0)**. The height is thrown away. Note that (3, 100) also lands on (3, 0): two different inputs, one output. That information is gone permanently, and no matrix can bring it back.

Look at the columns of each one to confirm the landing-spot reading. The shear matrix has columns (1, 0) and (1, 1): one-step-right does not move, and one-step-up slides one to the right. That is the shear, described completely.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 5: the four transformations, on the same point',
      code: `p = [3, 2]
zoo = [('identity', [[1, 0], [0, 1]]),
       ('scale',    [[2, 0], [0, 3]]),
       ('rotate90', [[0, -1], [1, 0]]),
       ('shear',    [[1, 1], [0, 1]]),
       ('project',  [[1, 0], [0, 0]])]

for name, M in zoo:
    print(name, matvec(M, p))

# ---- real output ----
# identity [3, 2]
# scale [6, 6]
# rotate90 [-2, 3]
# shear [5, 2]
# project [3, 0]`,
      annotations: {
        1: 'The one point we push through everything, so the only thing that changes between lines is the matrix.',
        2: 'A list of pairs. Each pair is a name and a matrix - the name is only there to label the printed output. This line opens the list with the identity matrix.',
        3: 'Scale: x doubled, y tripled. The extra spaces before the bracket are alignment for human eyes and mean nothing to Python.',
        4: 'Rotate a quarter turn anticlockwise.',
        5: 'Shear: each point slides right by its own height.',
        6: 'Project onto the x-axis: the height is replaced by zero.',
        8: 'Looping over pairs. Tuple unpacking again: each item is a pair, so name gets the first part and M gets the second, in one line.',
        9: 'matvec is the function from step 1, reused unchanged. Compare every printed line with the hand arithmetic in the section above.',
      },
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Where the basis points land, and why that is the matrix',
        notice: 'Push (1,0) and (0,1) through A = rows (2,-1) and (1,3). The two landing spots ARE the two columns of A.',
        leftLabel: 'input point',
        rightLabel: 'landing spot',
        frames: [
          {
            note: '(1,0) is one step right. Top row: 2x1 + (-1)x0 = 2. Bottom row: 1x1 + 3x0 = 1. It lands on (2,1) - which is column 1 of A.',
            stack: [{ name: 'one step right', value: '(1, 0)', to: 'o1' }],
            heap: [{ id: 'o1', value: '(2, 1)', label: 'column 1 of A' }],
          },
          {
            note: '(0,1) is one step up. Top row: 2x0 + (-1)x1 = -1. Bottom row: 1x0 + 3x1 = 3. It lands on (-1,3) - column 2 of A. Two columns, two landing spots, and that is the whole matrix.',
            stack: [
              { name: 'one step right', value: '(1, 0)', to: 'o1' },
              { name: 'one step up', value: '(0, 1)', to: 'o2' },
            ],
            heap: [
              { id: 'o1', value: '(2, 1)', label: 'column 1 of A' },
              { id: 'o2', value: '(-1, 3)', label: 'column 2 of A' },
            ],
          },
          {
            note: '(3,2) is 3 steps right and 2 steps up, so it lands on 3 copies of column 1 plus 2 copies of column 2: 3(2,1) + 2(-1,3) = (6,3) + (-2,6) = (4,9). Same answer as the row recipe.',
            stack: [{ name: '3 right, 2 up', value: '(3, 2)', to: 'o3' }],
            heap: [{ id: 'o3', value: '(4, 9)', label: '3(2,1) + 2(-1,3)' }],
          },
          {
            note: 'Projection: rows (1,0) and (0,0). Both (3,2) and (3,100) land on (3,0). Two different inputs, one output - the height is gone and nothing can recover it.',
            stack: [
              { name: 'point', value: '(3, 2)', to: 'd1', danger: true },
              { name: 'other point', value: '(3, 100)', to: 'd1', danger: true },
            ],
            heap: [{ id: 'd1', value: '(3, 0)', label: 'same landing spot' }],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Now numpy, and what @ means',
      md: `Writing the loops once was the point. From here on, everyone uses **numpy**, a Python library for numeric arrays, because its loops run in C and are hundreds of times faster.

Three things to know before the next snippet.

- \`np.array([[2, -1], [1, 3]])\` turns a list of lists into a numpy **array**: the same grid, stored in a form numpy can compute on quickly.
- \`@\` is Python's matrix multiplication operator. \`A @ v\` runs precisely the matvec you wrote in step 1; \`A @ B\` runs precisely the matmul from step 3. It is not elementwise multiplication - that is \`*\`, and it is a different operation with a different answer.
- \`.shape\` gives the shape as a pair, and \`.T\` gives the transpose. Both are attributes, so no brackets after them.

One numpy quirk worth meeting now: a 1-D array like \`np.array([3, 2])\` reports its shape as \`(2,)\`, not \`(2, 1)\`. The trailing comma is Python's way of writing a one-item pair. Numpy treats such an array as a column when it needs to, which is convenient here and a source of confusion later.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 6: the same maths in numpy, plus one neural network layer',
      code: `import numpy as np

A = np.array([[2, -1],
              [1,  3]])
v = np.array([3, 2])
print(A @ v)
print(A.shape, v.shape)
print(A.T)

X = np.array([[1., 2., 3.],
              [4., 5., 6.]])
W = np.array([[1., 0.],
              [0., 1.],
              [1., 1.]])
b = np.array([10., 20.])
print(X.shape, W.shape, b.shape)
print(X @ W + b)

# ---- real output ----
# [4 9]
# (2, 2) (2,)
# [[ 2  1]
#  [-1  3]]
# (2, 3) (3, 2) (2,)
# [[14. 25.]
#  [20. 31.]]`,
      annotations: {
        1: 'Import the library and give it the short name np, which is the universal convention. Every np.something below comes from here.',
        3: 'np.array turns the list of lists into a numpy array. Same four numbers, faster container.',
        4: 'The second row. The array constructor takes the whole list of lists as one argument, so the closing brackets pile up at the end.',
        5: 'The input vector as a numpy array.',
        6: 'A @ v is the matrix-vector product. It prints [4 9] - the same answer your matvec gave, in numpy\'s spaces-instead-of-commas printing style.',
        7: 'Shapes: A is (2, 2) and v is (2,). The (2,) is the 1-D quirk described above; numpy lines it up as a column here.',
        8: '.T is the transpose. Rows (2, -1) and (1, 3) become rows (2, 1) and (-1, 3) - the old columns.',
        10: 'X is a batch of data: 2 samples, one per row, each with 3 features. The dots after the numbers make them floats, which is what real data is.',
        11: 'The second sample.',
        12: 'W is a layer\'s weight matrix: shape (3 x 2), meaning 3 features in, 2 outputs per sample.',
        13: 'Second row of W.',
        14: 'Third row of W. Three rows because there are three input features - one row of W per feature.',
        15: 'b is the bias: one number per output, added after the multiply. It shifts the output, which the matrix alone cannot do because the origin must stay put.',
        16: 'Shapes before the multiply. (2, 3) and (3, 2): inner numbers 3 and 3 match, so the answer will be (2, 2).',
        17: 'This single line is a neural network layer: matrix times input, plus a bias. Numpy adds b to every row automatically. Check the first entry by hand: sample (1, 2, 3) against column 1 of W, which is (1, 0, 1), gives 1 + 0 + 3 = 4, then plus the bias 10 gives 14.',
      },
    },
    {
      type: 'note',
      md: `That last line is worth reading twice. \`X @ W + b\` is what a neural network layer *is*. A network then applies a simple squashing function to the result and feeds it into another layer just like it. Everything else in deep learning - training, attention, embeddings - is built on top of this line, not beside it.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: three samples through one layer, entirely by hand',
      md: `A shop records two numbers per customer: visits and purchases. Three customers, so the data matrix X has 3 rows and 2 columns - shape (3 x 2), samples as rows, always.

- X rows: (1, 2), (3, 0), (0, 4).
- A layer turns those 2 features into 2 scores. So W is (2 x 2): 2 in, 2 out. W rows: (2, -1) and (0, 3).
- The bias is b = (1, 1), one number per output.
- Shape check first: (3 x 2) times (2 x 2). Inner numbers 2 and 2, equal, so it is legal and the answer is (3 x 2). Three customers in, three customers out - the sample count never changes.

Now the arithmetic. Entry (i, j) is row i of X dotted with **column** j of W. Column 1 of W is (2, 0); column 2 is (-1, 3).

- Customer 1, (1, 2): first score 1x2 + 2x0 = 2, second score 1x(-1) + 2x3 = 5. Add b: **(3, 6)**.
- Customer 2, (3, 0): first score 3x2 + 0x0 = 6, second score 3x(-1) + 0x3 = -3. Add b: **(7, -2)**.
- Customer 3, (0, 4): first score 0x2 + 4x0 = 0, second score 0x(-1) + 4x3 = 12. Add b: **(1, 13)**.

Final answer: rows (3, 6), (7, -2), (1, 13). Shape (3 x 2), as promised before any multiplying started. Notice customer 2 scored negative on the second output - nothing in a matrix product prevents that, which is one reason a squashing function usually follows.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: transposing when the shapes already fit',
      md: `Same worked case. Someone hits a shape error somewhere else in their file, learns that \`.T\` fixes shape errors, and starts sprinkling it around. They write \`X @ W.T + b\` instead of \`X @ W + b\`.

Here is the trap: **it runs**. W is (2 x 2), so its transpose is also (2 x 2), so the shape rule is perfectly satisfied. No error, no warning, no crash. Just a wrong number.

W transposed has rows (2, 0) and (-1, 3), which means its columns are now (2, -1) and (0, 3).

- Customer 1, (1, 2): 1x2 + 2x(-1) = 0, and 1x0 + 2x3 = 6. Add b: **(1, 7)**.
- Correct answer was (3, 6). The wrong answer is (1, 7).

Both are two plausible-looking numbers. Nothing about (1, 7) announces itself as broken. A model trained this way will train - badly, or towards something other than you intended - and you will spend a day looking for the bug in your learning rate.

Diagnose it properly:

- A shape *error* is a gift. It fails immediately and tells you where. Fix it by asking which matrix has its rows and columns the wrong way round, and transpose that one.
- A **square** matrix hides the error, because every square matrix has a transpose of the same shape. That is when you must check the meaning, not the shape: in X @ W, row i of X is one sample and column j of W is the recipe for output j. If W's rows are your input features, W is the right way round already.
- Rule of thumb: transpose to fix a real mismatch, never on a hunch. And when a matrix is square, no shape check will save you - only knowing what the rows and columns mean.`,
    },
    {
      type: 'intuition',
      title: 'Practice: four problems, solutions below each',
      md: `Do these on paper before reading the solutions. All four use only what is above.

**1. By hand.** A has rows (1, 2) and (3, 4). What is A times the vector (2, -1)?

**Solution.** Top row: 1x2 + 2x(-1) = 2 - 2 = 0. Bottom row: 3x2 + 4x(-1) = 6 - 4 = 2. Answer **(0, 2)**. Check by columns: 2 x (1, 3) + (-1) x (2, 4) = (2, 6) + (-2, -4) = (0, 2). Same.

**2. Shapes only, no arithmetic.** A is (5 x 3), B is (3 x 7), C is (7 x 5). Which of A B, B C, C A, A C exist, and what shape is each?

**Solution.** A B: inner 3 and 3 match, result **(5 x 7)**. B C: inner 7 and 7 match, result **(3 x 5)**. C A: inner 5 and 5 match, result **(7 x 3)**. A C: inner 3 and 7 differ, so it **does not exist**. Notice A B C is legal and gives (5 x 5) - each product hands off correctly to the next.

**3. Build a matrix.** Write the 2 x 2 matrix that sends (1, 0) to (0, 1) and sends (0, 1) to (-1, 0).

**Solution.** The landing spots are the columns. Column 1 is (0, 1), column 2 is (-1, 0). Stacking those as columns means the rows read across: first row is (0, -1), second row is (1, 0). That is the 90-degree rotation from the zoo. Check on (3, 2): 0x3 - 1x2 = -2, and 1x3 + 0x2 = 3, giving (-2, 3), which matches step 5's printed output.

**4. A layer, in shapes.** X is (100 x 8): 100 samples, 8 features. A layer produces 4 outputs per sample. What shapes must W and b have, what shape is X @ W + b, and what shape would the transpose of X @ W be?

**Solution.** W is **(8 x 4)** - rows are inputs, columns are outputs, so 8 features in and 4 out. Inner numbers 8 and 8 match. The product is **(100 x 4)**: 100 samples still, now 4 numbers each. b is **(4,)**, one number per output, added to every row. Transposing (100 x 4) gives **(4 x 100)**. If you wrote W as (4 x 8), then X @ W has inner numbers 8 and 4 and fails - that exact mismatch is the most common first error in a training script.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. These are names you will meet later, glossed here so they are not new when they arrive. You do not need any of them to explain what a matrix does.

- **Determinant** - one number computed from a square matrix that says how much areas grow under it. For a 2 x 2 with rows (a, b) and (c, d) it is ad - bc. The projection matrix has determinant 0, which is the arithmetic way of saying it flattened space.
- **Inverse** - the matrix that undoes another one. It exists only when nothing was flattened, which is why the projection has no inverse.
- **Rank** - how many dimensions survive the transformation. The projection turned a plane into a line, so its rank is 1.
- **Eigenvector** - a direction the matrix does not turn, only stretches. These are the backbone of PCA.
- **Composition without a squash** - stacking two layers with no squashing function between them means the second acts on the first, which is one matrix acting on the input, so one layer. That is the reason activation functions exist, and it follows directly from a matrix product being composition.

Each of these gets a proper module later, built from numbers the same way this one was.`,
    },
  ],
  quiz: [
    {
      question: 'A has rows (2, -1) and (1, 3). What is A times the vector (3, 2)?',
      options: [
        { text: '(8, 3)', explanation: 'That used the columns as if they were rows. Rows dot the input: the top row gives 2x3 + (-1)x2 = 4.' },
        { text: '(4, 9)', explanation: 'Correct. Top row: 2x3 - 1x2 = 4. Bottom row: 1x3 + 3x2 = 9.' },
        { text: '(6, 6)', explanation: 'That is elementwise multiplication by the diagonal entries, a different operation and not a matrix product.' },
      ],
      correct: 1,
    },
    {
      question: 'A is (4 x 6) and B is (6 x 2). Which statement is true?',
      options: [
        { text: 'A B exists and has shape (4 x 2)', explanation: 'Correct. Inner numbers 6 and 6 match and cancel; the outer numbers 4 and 2 survive.' },
        { text: 'A B exists and has shape (6 x 6)', explanation: 'The inner numbers are the ones that must match, and they disappear. The answer keeps the outer numbers.' },
        { text: 'B A exists and has shape (2 x 4)', explanation: 'B A puts 2 against 4 as the inner numbers. They differ, so B A does not exist at all.' },
      ],
      correct: 0,
    },
    {
      question: 'What do the columns of a matrix tell you directly?',
      options: [
        { text: 'The size of the output', explanation: 'That is the row count. Rows out, columns in.' },
        { text: 'Where the simple inputs (1, 0) and (0, 1) land', explanation: 'Correct. Column 1 is where one-step-right lands and column 2 is where one-step-up lands, and every other point follows by adding and stretching those.' },
        { text: 'The numbers that get added after the multiply', explanation: 'That is the bias, a separate vector. Nothing inside the matrix is added on its own.' },
      ],
      correct: 1,
    },
    {
      question: 'The projection matrix has rows (1, 0) and (0, 0). Why can no matrix undo it?',
      options: [
        { text: 'Because its entries include a zero', explanation: 'Plenty of useful matrices contain zeros. The rotation by 90 degrees has two of them and is perfectly reversible.' },
        { text: 'Because (3, 2) and (3, 100) both land on (3, 0), so the output cannot tell you which one you started with', explanation: 'Correct. Two inputs, one output. The height was discarded and nothing can recover it.' },
        { text: 'Because it changes the shape of the data', explanation: 'It does not: a 2-number input still gives a 2-number output. The loss is in the values, not the shape.' },
      ],
      correct: 1,
    },
    {
      question: 'A layer computes X @ W + b, where X is (32 x 784) and the layer produces 128 outputs per sample. What are the shapes of W and b?',
      options: [
        { text: 'W is (784 x 128), b is (128,)', explanation: 'Correct. Inner numbers 784 and 784 match, giving (32 x 128), and one bias number per output is added to every row.' },
        { text: 'W is (128 x 784), b is (784,)', explanation: 'That makes the inner numbers 784 and 128, which differ, so the product does not exist. This is the most common shape bug there is.' },
        { text: 'W is (784 x 128), b is (32 x 128)', explanation: 'W is right, b is wrong. A bias per sample would make the layer depend on how many samples you happened to pass in.' },
      ],
      correct: 0,
    },
    {
      question: 'W is (2 x 2) and you accidentally write X @ W.T instead of X @ W. What happens?',
      options: [
        { text: 'Python raises a ValueError about mismatched dimensions', explanation: 'It cannot: transposing a square matrix keeps the same shape, so the shape rule is still satisfied.' },
        { text: 'It runs and gives a different, wrong answer with no warning', explanation: 'Correct, and that is what makes it dangerous. In the worked case, (3, 6) silently becomes (1, 7).' },
        { text: 'It runs and gives the same answer, since transposing does not change the numbers', explanation: 'The numbers are the same but their positions are not, so the dot products pair up different values.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain what a matrix is to someone who has only seen it as a table of numbers.',
      answer:
        'A table is something you look values up in. A matrix is a machine that takes a vector and returns a different vector. The recipe: dot each row of the matrix with the input, and stack the results. So a 2 x 3 matrix takes a 3-number input and returns a 2-number output - rows are outputs, columns are inputs. The machine is restricted to linear motion: straight lines stay straight, spacing stays even, and the origin never moves. That restriction is why a plain grid of numbers is enough to describe it. The columns are the most useful reading: column j is where the j-th simple input lands, and every other input follows by adding and stretching those landing spots.',
      isCaseBased: false,
    },
    {
      question: 'State the shape rule for matrix products and explain why it has to be that way.',
      answer:
        'An (m x n) times an (n x p) gives an (m x p). The inner numbers must be equal and they disappear; the outer numbers survive. The reason is that a product means composition: A B is the machine that runs B first and then A. B produces outputs of size n, because it has n rows. A consumes inputs of size n, because each of its rows has n entries. The handoff only works if those agree. The answer has m rows because A produces m numbers per input, and p columns because B has p columns and each is transformed separately. Say it as "n in, m out" against "p in, n out" and the rule stops needing memorisation.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague pastes a ValueError about a mismatch in a core dimension on the first matmul of their model. Walk them through fixing it.',
      answer:
        'First, print the shape of both operands on the line above the crash. The error names two numbers that should have matched; find them in the two shapes. Then ask three questions in order. (1) Is one operand the wrong way round? Weights stored as outputs-by-features instead of features-by-outputs is the usual culprit, and a transpose fixes it. (2) Are the operands swapped? A layer is X @ W, not W @ X, because rows of X are samples and the sample count must survive to the output. (3) Is the batch dimension where I think it is? Some code writes data as features-by-samples. Match the mismatched number to something you recognise: if it equals the batch size, the data is transposed; if it equals the feature count, the weights are. Fix it where the array is built. Never fix it with reshape - reshape reinterprets the same memory in a new layout, so it turns a loud crash into a silently wrong answer, which is far more expensive to find.',
      isCaseBased: true,
    },
    {
      question: 'What does "linear" actually mean, and what can a matrix not do?',
      answer:
        'Linear means three things you can check. Straight lines map to straight lines. Evenly spaced points stay evenly spaced. The origin stays fixed. Equivalently: scaling the input scales the output by the same factor, and adding two inputs adds their outputs. What a matrix cannot do follows directly from the origin rule - it cannot shift anything. Moving every point two units to the right is not linear, because the origin would move. That is exactly why a neural network layer is written as a matrix multiply plus a bias vector: the matrix does the rotating, scaling and shearing, and the bias supplies the shift the matrix is structurally incapable of.',
      isCaseBased: false,
    },
    {
      question: 'Case: a teammate has X of shape (3 x 2) and a square W of shape (2 x 2), writes X @ W.T + b, and reports numbers that look plausible but the model will not learn. What do you check?',
      answer:
        'The shape rule cannot help here, and that is the point: W is square, so its transpose has the same shape and the product is legal. The bug is in the meaning, not the shape. Check what the rows and columns of W stand for. In X @ W, row i of X is one sample and column j of W is the recipe for output j, so W must be stored with input features along its rows. If it is, then the transpose is pairing each feature with the wrong recipe. Verify by hand on one sample. With X rows (1, 2), (3, 0), (0, 4), W rows (2, -1) and (0, 3), and b = (1, 1), the correct first row is (3, 6) while X @ W.T gives (1, 7). Both look reasonable, only one is right. The general lesson: transposes should be added to fix a real mismatch, never on a hunch, and a square matrix removes your only automatic safety net.',
      isCaseBased: true,
    },
    {
      question: 'Why is A B usually not equal to B A?',
      answer:
        'Because a product is a sequence of two machines, and changing the order changes what happens. A B means run B first, then A. Concretely, take the point (1, 0), a scaling that doubles x, and a rotation by 90 degrees. Scale first: (1, 0) becomes (2, 0), then rotate to get (0, 2). Rotate first: (1, 0) becomes (0, 1), then scaling x leaves it as (0, 1), because the point no longer has any x to stretch. Same two operations, different results. Shapes make the point even more sharply: if A is (2 x 3) and B is (3 x 4), then A B exists and B A does not. Grouping is free, though - (A B) C equals A (B C), since regrouping does not change the sequence.',
      isCaseBased: false,
    },
    {
      question: 'What is the transpose, and when is it the right fix?',
      answer:
        'The transpose flips a matrix across its diagonal: rows become columns, so an (m x n) becomes an (n x m). The entry at position (i, j) moves to position (j, i). It is the right fix when a genuine mismatch exists and the numbers you need are already present, only arranged the wrong way - the classic case being a weight matrix stored as outputs-by-features when the code wants features-by-outputs. It is the wrong fix when applied on a hunch, particularly to a square matrix, because there the shape rule stays satisfied and the product computes a different quantity with no error at all. Before adding a transpose, be able to say which axis of each operand means what.',
      isCaseBased: false,
    },
    {
      question: 'Case: someone shows you a data matrix and asks whether samples should be rows or columns. What do you tell them, and how does that decide the layer?',
      answer:
        'The near-universal convention in machine learning is samples as rows: X has shape samples-by-features. Then a layer is X @ W + b with W of shape features-by-outputs, and the product is samples-by-outputs - the sample count rides straight through untouched, which is what you want because samples are processed independently. It also matches how arrays are stored in memory, so one sample sits in a contiguous block, which is faster to read. The transposed convention, W @ X with X as features-by-samples, is the same mathematics written the other way and does appear in older textbooks. What matters is naming which convention you are in before you write the multiply, because every shape decision downstream follows from it, and getting it backwards is the most common source of matmul errors in real code.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Matrix, in one sentence', back: 'A grid of numbers that acts as a machine: feed it a vector, get a different vector out. Each row is dotted with the input and produces one output number.' },
    { front: 'Shape', back: 'The size of the grid, written (rows x columns), rows first. An (m x n) matrix takes an n-number input and returns an m-number output. Rows out, columns in.' },
    { front: 'The shape rule', back: '(m x n) times (n x p) gives (m x p). The inner numbers must match and then disappear; the outer numbers survive. A mismatch means the product does not exist at all.' },
    { front: 'What do the columns mean?', back: 'Landing spots. Column 1 is where (1, 0) ends up, column 2 is where (0, 1) ends up. Every other point is a stretch-and-add of those, so the columns describe the whole machine.' },
    { front: 'What does "linear" mean?', back: 'Straight grid lines stay straight, spacing stays even, and the origin does not move. Consequence: a matrix can rotate, scale, shear and flatten, but it cannot shift - that is what the bias is for.' },
    { front: 'A B - which one happens first?', back: 'B first, then A, reading right to left like f(g(x)). Entry (i, j) is row i of A dotted with column j of B. Order matters: A B is usually not B A, and B A may not even be legal.' },
    { front: 'Identity and transpose', back: 'The identity has rows (1, 0) and (0, 1) and leaves every vector unchanged: A I = I A = A. The transpose flips rows into columns, turning an (m x n) into an (n x m).' },
    { front: 'A neural network layer', back: 'X @ W + b. X is samples-by-features, W is features-by-outputs, b is one number per output. The result is samples-by-outputs. A squashing function is applied after.' },
  ],
  mindmapMarkdown: `- Matrices as Transformations
  - A matrix is a machine
    - Grid of numbers that moves a vector somewhere else
    - Row dot input = one output number
    - (2,-1),(1,3) sends (3,2) to (4,9)
  - Vocabulary
    - Row, column, entry
    - Shape = (rows x columns), rows first
    - Rows out, columns in
  - Linear
    - Grid lines straight and evenly spaced
    - Origin stays put, so no shifting
    - Bias exists to supply the shift
  - Columns are landing spots
    - Column 1 = where (1,0) goes
    - Column 2 = where (0,1) goes
  - The shape rule
    - (m x n)(n x p) = (m x p)
    - Inner numbers must match, then vanish
    - Mismatch = product does not exist
  - What matrices do
    - Scale, rotate, shear
    - Project = flatten, information lost
    - Identity = do nothing
  - Traps
    - Transposing a square matrix: legal but wrong
    - Never fix a shape error with reshape
  - In ML
    - Layer = X @ W + b
    - samples x features, then features x outputs`,
}

export default m
