import type { Module } from '../types'

const m: Module = {
  id: 'dl-l2-cnns',
  subjectId: 'dl',
  level: 2,
  title: 'CNNs: Convolution, Pooling & Receptive Fields',
  whyItMatters:
    'A photograph is not a bag of numbers. It is a grid, and the same small patterns show up all over it. This module builds the layer that knows that. You will slide a small grid of numbers over a picture by hand, work out the size of what comes out, and then count the weights and find that a layer which handles any photograph at all costs 448 numbers where the obvious approach cost 120 million.',
  assumes: [
    'You have read *From Perceptron to MLP: Why We Need Non-Linearity*, so you know that a weight is just a number the network multiplies an input by, and that a dense layer connects every input to every unit',
    'You have read *Backpropagation: The Chain Rule on a Graph*, or at least know that training nudges every weight automatically. You will not need any of that machinery here',
    'You can read a Python for loop, a list, and a list of lists',
    'School arithmetic only. No calculus, no probability, and no numpy is used anywhere in this module',
  ],
  estMinutes: 42,
  sections: [
    {
      type: 'intuition',
      title: 'Do the obvious thing first, and count the cost',
      md: `Take a colour photograph, 200 pixels wide and 200 pixels tall. Colour means each pixel is stored as three numbers: how much red, how much green, how much blue. Those three are called the **channels** of the image.

- Numbers in the picture: 200 x 200 x 3 = **120,000**.
- The obvious first idea is to lay all 120,000 numbers out in one long row and feed them to a dense layer. Say that layer has 1,000 units.
- A dense layer connects every input to every unit, and every connection carries one weight. So the weight count is 120,000 x 1,000 = **120,000,000**.
- Plus 1,000 biases, which is nothing next to that.

One hundred and twenty million numbers, for one layer, on one small photo. That is the first problem, and it is the least serious of the three.`,
    },
    {
      type: 'intuition',
      title: 'The second problem: shift the picture one pixel and everything changes',
      md: `Imagine the photo is of a cat sitting dead centre. Now shift the whole photo one pixel to the right.

- To a human, that is the same cat. To the flattened list of 120,000 numbers, almost every entry has changed: the number that was at position 4,000 has moved to position 4,003.
- Every one of those numbers now lands on a **different weight**. The dense layer that learned "cat" has to learn it again, separately, for the shifted position.
- The word for the property we want is **translation invariance**: move the thing you are looking for, and the answer stays the same. A dense layer on a flattened image does not have it.

The third problem is related. Flattening throws away *which pixels were next to which*. Pixel (5,5) and pixel (5,6) are touching, so they are probably part of the same edge, but after flattening they are only entries 3,015 and 3,018 in a long list, no more related than entries 3,015 and 90,000. The layer has to learn that they were neighbours, from data, from scratch.

So we want a layer that (a) only looks at small patches of pixels that really are next to each other, and (b) uses the *same* weights everywhere in the picture. That layer is the convolution.`,
    },
    {
      type: 'intuition',
      title: 'A kernel is a tiny grid of numbers that you slide',
      md: `Picture a small square of transparent plastic, 3 pixels by 3 pixels, with a number written in each of the nine cells. Lay it on the top-left corner of the picture.

- Multiply each of the nine numbers on the plastic by the pixel value underneath it. Add the nine products together. That gives **one number**.
- Write that number down. Slide the plastic one pixel to the right and do it again. When you run out of room, drop down one row and start from the left again.
- The little grid of numbers is called a **kernel**, or equally a **filter**. The two words mean exactly the same thing.
- The whole sliding-and-multiplying operation is the **convolution**.
- The grid of numbers you wrote down is called the **feature map**. It is not a score or a class. It is a picture of *where in the input that pattern was found*.
- The nine numbers on the plastic are the layer's weights. They are learned during training, exactly like the weights of a dense layer.

The two properties we wanted fall straight out. Each output number is built from only nine pixels that genuinely sit next to each other. And it is the *same* nine weights at every stop, which is called **parameter sharing** (or weight sharing). Nine numbers, reused everywhere.`,
    },
    {
      type: 'intuition',
      title: 'Convolve a 5x5 by hand, before any code',
      md: `Here is a 5x5 picture with a vertical edge in it. The left two columns are dark, value 0. The right three columns are bright, value 10. All five rows are identical:

- Row 0: 0, 0, 10, 10, 10
- Row 1: 0, 0, 10, 10, 10
- Row 2: 0, 0, 10, 10, 10
- Row 3: 0, 0, 10, 10, 10
- Row 4: 0, 0, 10, 10, 10

And here is a 3x3 kernel that detects vertical edges. Every row of it is the same: minus one, zero, plus one.

- Kernel row 0: -1, 0, 1
- Kernel row 1: -1, 0, 1
- Kernel row 2: -1, 0, 1

Why that kernel finds edges: it subtracts what is on the left from what is on the right. If left and right are equally bright, the two cancel and you get 0. If the right is much brighter than the left, you get a big positive number. That is exactly what an edge is.`,
    },
    {
      type: 'intuition',
      title: 'Two output cells, computed all the way through',
      md: `**Output cell (0,0).** Put the kernel at the top-left, covering rows 0-2 and columns 0-2 of the picture. The nine pixels underneath are:

- 0, 0, 10 (from row 0)
- 0, 0, 10 (from row 1)
- 0, 0, 10 (from row 2)

Multiply each by the matching kernel cell and add. Taking it one row at a time: row 0 gives (-1 x 0) + (0 x 0) + (1 x 10) = 10. Row 1 gives (-1 x 0) + (0 x 0) + (1 x 10) = 10. Row 2 gives the same, 10. Total: 10 + 10 + 10 = **30**. A big number, because the kernel is sitting right on the edge.

**Output cell (0,2).** Slide the kernel two steps right, so it covers rows 0-2 and columns 2-4. Now the nine pixels underneath are:

- 10, 10, 10 (from row 0)
- 10, 10, 10 (from row 1)
- 10, 10, 10 (from row 2)

Row 0 gives (-1 x 10) + (0 x 10) + (1 x 10) = -10 + 0 + 10 = 0. Rows 1 and 2 give 0 as well. Total: **0**. The kernel is sitting on a flat bright region, so it stays silent. That is a detector doing its job.

Do the remaining seven cells the same way and the full output is three identical rows of **30, 30, 0**.`,
    },
    {
      type: 'intuition',
      title: 'Where the output-size formula comes from',
      md: `Notice that the output above is 3x3, not 5x5. That is not a rule someone decided. It is a count of how many places the kernel fits.

- The picture is 5 wide. The kernel is 3 wide. The kernel's left edge can start at column 0, column 1, or column 2. At column 3 it would hang off the right side.
- So the last legal starting column is 5 - 3 = 2. Counting the starts 0, 1, 2 gives 3 positions. Three positions across means three output columns.
- In general, with picture width W and kernel width K, the last legal start is W - K, and counting 0 up to W - K inclusive gives **W - K + 1** positions.

Now add the two knobs that change the count.

- **Stride** S is how far the kernel jumps between stops. So far it jumped 1 each time. With S = 2 the legal starts are 0, 2, 4, ..., so instead of W - K + 1 starts you get (W - K) / S + 1, rounded down because a partial jump is not a jump.
- **Padding** P means adding P rings of zeros all the way around the picture before you start. That makes the picture P wider on the left and P wider on the right, so its width becomes W + 2P.

Substitute the padded width into the count and you have the whole formula: **(W - K + 2P) / S + 1**, rounded down.

Check it on the hand example: W = 5, K = 3, P = 0, S = 1 gives (5 - 3 + 0) / 1 + 1 = 3. That is the 3x3 output we computed.`,
    },
    {
      type: 'math',
      intro: 'The output-size formula, and the two named padding settings.',
      latex: [
        '\\text{out} = \\left\\lfloor \\frac{W - K + 2P}{S} \\right\\rfloor + 1',
        "\\text{'valid'}: P = 0 \\;\\Rightarrow\\; \\text{the output is smaller than the input}",
        "\\text{'same'} \\;(\\text{with } S=1): P = \\frac{K-1}{2} \\;\\Rightarrow\\; \\text{out} = W",
      ],
    },
    {
      type: 'intuition',
      title: 'The two padding names, in plain words',
      md: `Libraries give you two padding settings by name, and the names are unhelpful, so here is what they mean.

- **'valid'** means no padding at all, P = 0. Only positions where the kernel sits fully inside the real picture are used. Every convolution shrinks the picture: a 3x3 kernel eats 2 pixels off each side.
- **'same'** means "add just enough padding that the output comes out the same size as the input". For stride 1 the amount needed is P = (K - 1) / 2. For K = 3 that is P = 1; for K = 5 it is P = 2.
- Check 'same' with the formula, K = 3, P = 1, S = 1, W = 5: (5 - 3 + 2) / 1 + 1 = 5. Same size in, same size out.
- There is a second reason to pad. Without padding, a corner pixel is looked at by exactly one kernel position, while a middle pixel is looked at by nine. Padding evens that out so the border is not quietly ignored.

One more term while we are here. Take any single number in the output. The **receptive field** of that number is the patch of input pixels that were allowed to influence it. For one 3x3 convolution the receptive field is 3x3. Stack a second 3x3 convolution on top and each of its nine inputs already saw a 3x3 patch, and those patches overlap, so the reach becomes 5x5. Stacking layers is how a network eventually gets to see the whole picture.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 1: one output cell, reproducing the numbers we just did by hand',
      code: `image = [[0, 0, 10, 10, 10] for r in range(5)]
kernel = [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]]

def cell(top, left):
    total = 0
    for i in range(3):
        for j in range(3):
            total = total + image[top + i][left + j] * kernel[i][j]
    return total

print('out[0][0] =', cell(0, 0))
print('out[0][2] =', cell(0, 2))

# out[0][0] = 30
# out[0][2] = 0`,
      annotations: {
        1: 'Builds the picture as a list of lists. The bit before the word `for` is the row; `for r in range(5)` repeats it 5 times, so this is five identical rows. This shorthand is called a list comprehension; it is a for loop written on one line that collects its results into a list.',
        2: 'The kernel, written directly as three rows of three numbers. kernel[0] is the first row, kernel[0][2] is the 1 at its right end.',
        4: 'Defines a function that computes ONE output cell. top and left say where the kernel\'s top-left corner is sitting on the picture.',
        5: 'Start the running sum at zero. This is the "add the nine products together" step, before any product exists.',
        6: 'Loop over the kernel\'s three rows. i is 0, then 1, then 2.',
        7: 'Loop over the kernel\'s three columns. Together these two loops visit all nine kernel cells once each.',
        8: 'The one line that is the whole operation: take the pixel under kernel cell (i, j) and multiply it by that kernel cell, then add the product to the running total. image[top + i][left + j] is the offset that makes the kernel sit at (top, left) instead of at the corner.',
        9: 'Hand back the finished sum. That single number is one cell of the feature map.',
        11: 'Kernel at the top-left corner. Prints 30, which is the number we worked out by hand.',
        12: 'Kernel slid two steps right, onto the flat bright region. Prints 0, again matching the hand computation.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 2: slide it everywhere, using the size formula to decide how far',
      code: `def conv2d(img, ker, stride):
    out_n = (len(img) - len(ker)) // stride + 1
    out = []
    for r in range(out_n):
        row = []
        for c in range(out_n):
            total = 0
            for i in range(len(ker)):
                for j in range(len(ker)):
                    total = total + img[r * stride + i][c * stride + j] * ker[i][j]
            row.append(total)
        out.append(row)
    return out

for row in conv2d(image, kernel, 1):
    print(row)

# [30, 30, 0]
# [30, 30, 0]
# [30, 30, 0]`,
      annotations: {
        1: 'Same idea as Part 1, now taking the picture, the kernel and the stride as arguments so we can try different ones.',
        2: 'The output-size formula in code, with P = 0. len(img) is W, len(ker) is K. The // is integer division, which throws away the remainder, and that is exactly the rounding-down in the formula.',
        3: 'An empty list that will collect the output rows.',
        4: 'Walk down the output rows. r counts output rows, not input rows.',
        5: 'A fresh empty list for this output row.',
        6: 'Walk across the output columns. Each (r, c) pair is one stop of the sliding kernel.',
        7: 'Reset the running sum for this stop.',
        8: 'Loop over the kernel rows, sized from the kernel itself so this works for any kernel size.',
        9: 'Loop over the kernel columns.',
        10: 'The multiply-and-add again. r * stride picks the input row where this stop starts: with stride 2, output row 1 starts at input row 2.',
        11: 'One stop finished, so append its single number to the current output row.',
        12: 'One output row finished, so append it to the output grid.',
        13: 'Hand back the finished feature map.',
        15: 'Run it on our 5x5 picture with stride 1. The loop walks the three returned rows.',
        16: 'Print each row. The output matches the hand computation cell for cell.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 3: padding, stride, and the formula checked three ways',
      code: `def pad(img, p):
    n = len(img)
    wide = [[0] * (n + 2 * p) for r in range(n + 2 * p)]
    for r in range(n):
        for c in range(n):
            wide[r + p][c + p] = img[r][c]
    return wide

for n, k, p, s in [(5, 3, 0, 1), (5, 3, 1, 1), (5, 3, 0, 2)]:
    print('n', n, 'k', k, 'p', p, 's', s, '-> out', (n - k + 2 * p) // s + 1)

print('padded conv gives', len(conv2d(pad(image, 1), kernel, 1)))

# n 5 k 3 p 0 s 1 -> out 3
# n 5 k 3 p 1 s 1 -> out 5
# n 5 k 3 p 0 s 2 -> out 2
# padded conv gives 5`,
      annotations: {
        1: 'Adds p rings of zeros around a square picture and returns the bigger picture.',
        2: 'The original side length. A 5x5 picture with p = 1 becomes 7x7.',
        3: 'Builds the all-zero bigger grid. [0] * m is Python for "a list of m zeros", and the comprehension repeats that row (n + 2p) times.',
        4: 'Walk the rows of the ORIGINAL picture.',
        5: 'Walk its columns.',
        6: 'Copy each original pixel into the big grid, shifted down and right by p. Everything not copied stays zero, and that ring of zeros is the padding.',
        7: 'Hand back the padded picture.',
        9: 'Three settings to test, each written as four numbers in brackets: n, k, p, s. Writing four names on the left of `in` pulls the four numbers out of each group in order; this is called tuple unpacking.',
        10: 'Print the formula\'s answer for each setting. Line 1 of the output is our hand example (3). Line 2 is \'same\' padding holding the size at 5. Line 3 is stride 2, where (5-3)//2 + 1 = 1 + 1 = 2 and the rounding-down quietly drops the last incomplete window.',
        12: 'Pad the picture first, then convolve it, and measure how many rows came back. It prints 5, so \'same\' padding really does preserve the size in practice and not just on paper.',
      },
    },
    {
      type: 'intuition',
      title: 'Channels: the kernel is a cube, not a square',
      md: `Everything so far used a one-number-per-pixel picture. Real pictures have three numbers per pixel, and the middle of a network can have hundreds. Those are the **channels**.

- A kernel always spans **all** the input channels. A "3x3 kernel" on a 3-channel colour image is really 3 x 3 x 3 = 27 weights. On a 64-channel input it is 3 x 3 x 64 = 576 weights.
- So the kernel is a little cube, not a flat square. It slides across height and width only. It never slides across channels; it swallows all of them at every stop.
- One cube produces one feature map, which is **one output channel**. If you want 16 output channels, you use 16 separate cubes.
- Therefore: **the number of filters IS the number of output channels**. That is the only channel knob a conv layer has.

Now we can count the weights properly. One cube holds K x K x C_in weights, plus one bias per cube. There are C_out cubes.`,
    },
    {
      type: 'math',
      intro: 'The parameter-count formula. K is the kernel side, C_in the input channels, C_out the number of filters.',
      latex: [
        '\\text{params} = (K \\times K \\times C_{\\text{in}} + 1) \\times C_{\\text{out}}',
        '\\text{Example: } K=3,\\; C_{\\text{in}}=3,\\; C_{\\text{out}}=16 \\;\\Rightarrow\\; (9 \\times 3 + 1) \\times 16 = 28 \\times 16 = 448',
        '\\text{Look at what is missing from the formula: } W \\text{ and } H.',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The punchline: conv weights do not depend on the picture size',
      code: `def conv_params(k, c_in, c_out):
    return (k * k * c_in + 1) * c_out

def dense_params(h, w, c_in, units):
    return h * w * c_in * units + units

print('dense 200x200x3 -> 1000 units:', dense_params(200, 200, 3, 1000))
print('conv 3x3, 3 in, 16 out      :', conv_params(3, 3, 16))
for side in [32, 200, 1000]:
    print(side, 'conv', conv_params(3, 3, 16), 'dense', dense_params(side, side, 3, 1000))

# dense 200x200x3 -> 1000 units: 120001000
# conv 3x3, 3 in, 16 out      : 448
# 32 conv 448 dense 3073000
# 200 conv 448 dense 120001000
# 1000 conv 448 dense 3000001000`,
      annotations: {
        1: 'The conv formula as a function. Note the arguments: kernel size and the two channel counts. Picture width and height are not asked for, because they are not needed.',
        2: 'k * k * c_in is the size of one cube, + 1 is that cube\'s single bias, and multiplying by c_out repeats it once per filter.',
        4: 'The dense formula for comparison. Here h and w ARE arguments, because a dense layer needs one weight per input number.',
        5: 'Every input number wired to every unit, plus one bias per unit.',
        7: 'The opening arithmetic, run: 120,001,000 weights for one dense layer on one 200x200 colour photo.',
        8: 'The same job done by a conv layer with 16 filters: 448. That is roughly 268,000 times smaller.',
        9: 'Now feed all three formulas a 32-pixel picture, a 200-pixel picture and a 1000-pixel picture.',
        10: 'Print conv and dense side by side for each size. The conv number is 448 on all three lines. The dense number goes from 3 million to 3 billion. Parameter sharing is what makes the conv column flat: the same 448 numbers are reused at every position, so more positions cost more computing but not more weights.',
      },
    },
    {
      type: 'note',
      md: `Be precise about what does and does not change with picture size. The **weights** do not: 448 either way. What does grow is the number of stops the kernel makes, so a bigger picture costs more multiplications and stores a bigger feature map. Those are two different budgets, compute and memory, and neither of them is the parameter count. If someone quotes a parameter count that contains the image resolution, they have mixed the two up.`,
    },
    {
      type: 'intuition',
      title: 'Pooling: shrink on purpose, by hand',
      md: `A **pooling** layer slides a window over a feature map, exactly like a convolution, but instead of multiplying by weights it just summarises the window down to one number. It has **no weights at all**, so it learns nothing and costs nothing.

- **Max pooling** keeps the largest number in the window. It answers "did this feature turn up anywhere in this window?" and forgets exactly where.
- **Average pooling** keeps the mean of the window. Smoother, and it keeps the overall brightness rather than just the peak.

Take this 4x4 feature map, and a 2x2 window with stride 2, so the windows do not overlap:

- Row 0: 1, 3, 2, 1
- Row 1: 5, 6, 1, 2
- Row 2: 7, 2, 4, 0
- Row 3: 1, 0, 3, 9

Top-left window is 1, 3, 5, 6. Max = 6, average = 15 / 4 = 3.75. Top-right window is 2, 1, 1, 2. Max = 2, average = 1.5. Bottom-left is 7, 2, 1, 0. Max = 7, average = 2.5. Bottom-right is 4, 0, 3, 9. Max = 9, average = 4.

So max pooling gives 6, 2 on the first row and 7, 9 on the second. The output is 2x2 where the input was 4x4, which is a quarter of the numbers. And the size follows the same formula as before, with the window size playing the part of K: (4 - 2 + 0) / 2 + 1 = 2.

Why bother: it cuts memory and compute fourfold, and it buys a little translation invariance. Nudge the input one pixel and a max-pooled output very often does not change at all, because the largest value in the window is still the largest value in the window.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Max pooling, reproducing the hand example',
      code: `grid = [[1, 3, 2, 1], [5, 6, 1, 2], [7, 2, 4, 0], [1, 0, 3, 9]]

def max_pool(img, size, stride):
    out_n = (len(img) - size) // stride + 1
    out = []
    for r in range(out_n):
        row = []
        for c in range(out_n):
            vals = []
            for i in range(size):
                for j in range(size):
                    vals.append(img[r * stride + i][c * stride + j])
            row.append(max(vals))
        out.append(row)
    return out

print(max_pool(grid, 2, 2))

# [[6, 2], [7, 9]]`,
      annotations: {
        1: 'The same 4x4 feature map used in the hand example above, written as four rows.',
        3: 'size is the window side, stride is the jump. There is no kernel argument, because pooling has no weights.',
        4: 'The same output-size formula, with the window size in place of K. (4 - 2) // 2 + 1 = 2.',
        5: 'Collects the output rows.',
        6: 'Walk the output rows.',
        7: 'A fresh row.',
        8: 'Walk the output columns. Each (r, c) is one window position.',
        9: 'An empty list to collect the four numbers inside this window. This is the one real difference from convolution: we gather the values instead of weighting them.',
        10: 'Walk the window rows.',
        11: 'Walk the window columns.',
        12: 'Copy the value at this window cell into vals. With stride 2 the windows do not overlap.',
        13: 'max(vals) is Python\'s built-in largest-of-a-list. Swap it for sum(vals) / len(vals) and you have average pooling instead.',
        14: 'Finished row goes into the output.',
        15: 'Hand back the pooled map.',
        17: 'Prints [[6, 2], [7, 9]], which is the hand computation exactly.',
      },
    },
    { type: 'visual', component: 'ConvolutionPlayground', props: {} },
    {
      type: 'note',
      md: `Use the playground rather than watching it. Step the blue box through every position and watch one thing: **the kernel never changes**. The same numbers are being reused at every stop. That is parameter sharing, on screen. Then swap the kernel from edge-detect to blur and slide again. The machinery is identical; only the numbers on the little grid are different, and those numbers are what training decides.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: trace a whole small network by hand',
      md: `Input: a 32x32 colour photo, so 32 x 32 x 3. We will track two things at every layer, the shape and the parameter count, using only the two formulas.

1. **Conv, 3x3, 16 filters, P = 1, S = 1.** Shape: (32 - 3 + 2) / 1 + 1 = 32, so 32 x 32 x 16. Parameters: (3 x 3 x 3 + 1) x 16 = 28 x 16 = **448**.
2. **Max pool, 2x2, S = 2.** Shape: (32 - 2 + 0) / 2 + 1 = 16, so 16 x 16 x 16. Channels are untouched by pooling. Parameters: **0**.
3. **Conv, 3x3, 32 filters, P = 1, S = 1.** C_in is now 16, the previous layer's filter count. Shape: (16 - 3 + 2) / 1 + 1 = 16, so 16 x 16 x 32. Parameters: (3 x 3 x 16 + 1) x 32 = 145 x 32 = **4,640**.
4. **Max pool, 2x2, S = 2.** Shape: (16 - 2) / 2 + 1 = 8, so 8 x 8 x 32. Parameters: **0**.
5. **Flatten, then dense to 10 classes.** Flatten gives 8 x 8 x 32 = 2,048 numbers. Parameters: 2,048 x 10 + 10 = **20,490**.

Total: 448 + 4,640 + 20,490 = **25,578**. Now look at the split. The two convolution layers, which do all the actual seeing, hold 5,088 parameters. The one small dense layer at the end holds 20,490, which is 80% of the whole model. That ratio is why every layer in this module is a convolution and the dense layer is one line at the end.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: a shape crash from forgetting padding',
      md: `Someone builds a classifier on 32x32 images. Three convolution layers, 3x3 kernels, 32 filters each, then flatten, then dense to 10 classes. They write the flatten size as 32 x 32 x 32 = 32,768, reasoning "the convs do not change the size". They run it and get a shape error at the dense layer, or worse, silently wrong sizes.

**What actually happened.** They left padding at the default, which in most libraries is 'valid', meaning P = 0. Apply the formula three times:

- Layer 1: (32 - 3 + 0) / 1 + 1 = **30**.
- Layer 2: (30 - 3 + 0) / 1 + 1 = **28**.
- Layer 3: (28 - 3 + 0) / 1 + 1 = **26**.

So the real flatten size is 26 x 26 x 32 = **21,632**, not 32,768. The dense layer was built expecting 32,768 inputs and is handed 21,632.

**Why the wrong reasoning felt right.** "Convolutions do not change the size" is true only with 'same' padding. With no padding a 3x3 kernel eats one pixel off each side every single layer, because the kernel needs room to sit fully inside. Two pixels per layer, three layers, six pixels gone: 32 becomes 26.

**The fix, and the habit.** Either pass padding='same' so the assumption becomes true, or print the shape after every layer and let the machine tell you. Never hardcode a flatten size you worked out in your head. A stride 2 anywhere in the stack causes the same crash for the same reason, and so does pooling, and the formula catches all three.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work each one on paper before reading the solution. All five use only the two formulas.

1. Input 28x28, one channel. Conv with a 5x5 kernel, 6 filters, P = 0, S = 1. Give the output shape and the parameter count.
2. Input 32x32. You want the output to still be 32x32 using a 5x5 kernel at stride 1. What padding P do you need?
3. A conv layer takes a 64-channel input and produces 128 channels with a 3x3 kernel, biases included. How many parameters?
4. Input 6x6. Conv with a 3x3 kernel, P = 0, S = 2. Output size?
5. The same conv layer from question 3 is later fed 512x512 images instead of 32x32 ones. What changes?`,
    },
    {
      type: 'intuition',
      title: 'Practice solutions',
      md: `**1.** Spatial size: (28 - 5 + 0) / 1 + 1 = 24. Depth equals the filter count, so the output is **24 x 24 x 6**. Parameters: (5 x 5 x 1 + 1) x 6 = 26 x 6 = **156**. The input has one channel, so each filter is a 5x5x1 cube.

**2.** Set the formula equal to 32 and solve. (32 - 5 + 2P) / 1 + 1 = 32, so 27 + 2P = 31, so 2P = 4 and **P = 2**. That agrees with the 'same' rule P = (K - 1) / 2 = (5 - 1) / 2 = 2.

**3.** (3 x 3 x 64 + 1) x 128 = (576 + 1) x 128 = 577 x 128 = **73,856**. The two common slips: forgetting that each filter spans all 64 input channels, which gives the far too small 3 x 3 x 128 = 1,152; and forgetting the biases, which gives 73,728.

**4.** (6 - 3 + 0) / 2 + 1. The division is 3 / 2 = 1.5, which rounds **down** to 1, then + 1 gives **2**. The rounding-down matters here: the kernel starts at column 0 and column 2, and a third start at column 4 would hang two pixels off the edge, so that window is simply dropped.

**5.** The parameter count does not change. It stays **73,856**, because the formula (K x K x C_in + 1) x C_out contains no width or height. What does change is the running cost: 512 x 512 is 256 times more positions than 32 x 32, so 256 times more multiply-and-add work and a feature map holding 256 times more numbers. Weights are fixed by the kernel and the channels; compute and memory scale with the picture.`,
    },
    {
      type: 'note',
      md: `The named architectures built from these parts, LeNet, AlexNet, VGG and ResNet, and the reasons each one was arranged the way it was, are covered in the sibling module *LeNet to ResNet: The Architectures That Mattered*. This module is only the mechanics, and the mechanics are all you need to read that one.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Four extras, all built on the two formulas above.

- **Two 3x3 beat one 5x5.** Two stacked 3x3 convolutions reach 5x5 of input, the same as one 5x5, as the receptive-field argument earlier shows. With 64 channels in and out, one 5x5 costs (25 x 64 + 1) x 64 = 102,464 while two 3x3 cost 2 x (9 x 64 + 1) x 64 = 73,856. That is 28% cheaper for the same reach, and it puts two activation functions in the path instead of one. This is why nearly every modern network is a tower of 3x3 kernels.
- **The 1x1 convolution.** A 1x1 kernel sees a single pixel, which sounds useless, but it still spans every channel. On a 256-channel input each filter is a 256-long vector of weights, so a 1x1 conv is a learned mixing of the channels at each position. Its main job is changing the channel count cheaply: 256 down to 64 costs (256 + 1) x 64 = 16,448 parameters and touches no spatial extent at all.
- **Strided convolution instead of pooling.** A conv with S = 2 halves the size just as a 2x2 pool does, but it *learns* how to summarise the window rather than always taking the max. It costs parameters where pooling costs none. Most networks after ResNet downsample this way.
- **Global average pooling.** Instead of flattening the final feature maps into a giant dense layer, average each feature map down to a single number, giving one number per channel. It costs zero parameters, and it kills exactly the 80%-of-the-model dense layer from the worked case. It also stops the network caring about input resolution, because averaging works on any size. What it gives up is coarse position information, which is fine for classification and wrong for anything that must say *where*.`,
    },
  ],
  quiz: [
    {
      question: 'Input is 28x28 with 1 channel. Conv layer: 6 filters, kernel 5x5, stride 1, no padding. What is the output shape?',
      options: [
        {
          text: '24x24x6',
          explanation: 'Correct. (28 - 5 + 0) / 1 + 1 = 24 in each direction, and the depth is the number of filters, which is 6.',
        },
        {
          text: '28x28x6',
          explanation: 'That would need P = 2 to hold the size. With no padding a 5x5 kernel eats 2 pixels off each side.',
        },
        {
          text: '24x24x1',
          explanation: 'The spatial part is right, but each of the 6 filters produces its own feature map, so the depth is 6.',
        },
      ],
      correct: 0,
    },
    {
      question: 'A 3x3 conv layer takes a 64-channel input and produces 128 channels, biases included. How many parameters?',
      options: [
        {
          text: '1,152',
          explanation: 'This is 3 x 3 x 128, which forgets that each filter spans all 64 input channels. A filter here is a 3x3x64 cube, not a 3x3 square.',
        },
        {
          text: '73,728',
          explanation: 'That is 3 x 3 x 64 x 128, the weight count with the biases dropped. One bias per filter adds 128 more.',
        },
        {
          text: '73,856',
          explanation: 'Correct. (3 x 3 x 64 + 1) x 128 = 577 x 128 = 73,856.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Input 64x64. Conv with kernel 3, stride 2, padding 1. What is the output spatial size?',
      options: [
        {
          text: '31',
          explanation: 'This drops the + 1 at the end. 63 / 2 rounded down is 31, but that counts the jumps, not the starting positions.',
        },
        {
          text: '32',
          explanation: 'Correct. (64 - 3 + 2) / 2 + 1 = 63 / 2 rounded down + 1 = 31 + 1 = 32. Stride 2 roughly halves the size.',
        },
        {
          text: '64',
          explanation: 'Stride 2 means the kernel visits every other position, so there is no way the output stays at input size.',
        },
      ],
      correct: 1,
    },
    {
      question: 'What does parameter sharing mean in a conv layer?',
      options: [
        {
          text: 'The same kernel numbers are used at every position of the input',
          explanation: 'Correct. One set of K x K x C_in weights is applied at every stop, which is exactly why the parameter count does not contain the picture size.',
        },
        {
          text: 'All filters in the layer use one shared set of weights',
          explanation: 'No. Filters are independent and each learns a different pattern. The sharing is across positions, not across filters.',
        },
        {
          text: 'The weights are shared between the forward and backward pass',
          explanation: 'That is true of every layer in any network and is not what the term means. The sharing here is spatial.',
        },
      ],
      correct: 0,
    },
    {
      question: 'How many learnable parameters does a 2x2 max-pooling layer with stride 2 have?',
      options: [
        {
          text: '4, one per window cell',
          explanation: 'Pooling has no kernel to learn. Taking the largest value in a window is a fixed rule with nothing to tune.',
        },
        {
          text: '0, because pooling is a fixed operation',
          explanation: 'Correct. Zero, whatever the number of channels. That is also the argument for replacing pooling with a stride-2 convolution, which pays parameters in exchange for learning how to summarise.',
        },
        {
          text: 'It depends on the number of input channels',
          explanation: 'Pooling runs separately on each channel but still learns nothing, so the count is 0 regardless of depth.',
        },
      ],
      correct: 1,
    },
    {
      question: 'The same conv layer is fed 32x32 images, then later 512x512 images. What changes?',
      options: [
        {
          text: 'The parameter count grows with the image size',
          explanation: 'Look at the formula: (K x K x C_in + 1) x C_out has no width or height in it. Weights are shared across positions.',
        },
        {
          text: 'Nothing changes at all',
          explanation: 'The weights are unchanged, but a 512x512 input has 256 times more kernel positions, so the compute and the feature-map memory both grow.',
        },
        {
          text: 'The parameters stay identical, while compute and feature-map memory grow with the number of positions',
          explanation: 'Correct. Weights are fixed by kernel size and channel counts; the cost of running the layer scales with the picture size. Keeping those two budgets separate is the point.',
        },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why not just flatten an image and use dense layers? Give me numbers.',
      answer:
        'Lead with the arithmetic. A 200x200 colour image is 200 x 200 x 3 = 120,000 numbers, so one dense layer of 1,000 units is 120,000,000 weights, for a single layer, on a small photo. Cost is only the first problem. Second, flattening throws away which pixels were adjacent: two touching pixels become arbitrary far-apart indices, and the layer has to learn adjacency from data. Third, there is no translation invariance: shift the picture one pixel and every value lands on a different weight, so the model learns "cat in the middle" rather than "cat". A convolution builds locality and position-independence into the layer instead of hoping the data teaches them, and the same job costs 448 parameters with 16 filters.',
      isCaseBased: false,
    },
    {
      question: 'Give me the output-size formula and explain each term physically.',
      answer:
        'out = floor((W - K + 2P) / S) + 1. It is a count of how many places the kernel fits. W is the input side. 2P is the padding added to both sides. Subtracting K accounts for the kernel needing K pixels of room to sit anywhere at all, so the last legal starting position is W + 2P - K. Dividing by S counts how many strided jumps fit into that span, and the + 1 counts the starting position itself. The floor drops a final window that would hang off the edge. Worked: W = 32, K = 3, P = 1, S = 1 gives 32, which is what \'same\' padding means; \'same\' at stride 1 needs P = (K - 1) / 2. Pooling uses the identical formula with the window size in place of K.',
      isCaseBased: false,
    },
    {
      question: 'Count the parameters: input 224x224x3, then conv 7x7 with 64 filters, then conv 3x3 with 128 filters, then conv 1x1 with 32 filters.',
      answer:
        'Formula: (K x K x C_in + 1) x C_out. Layer 1: (7 x 7 x 3 + 1) x 64 = 148 x 64 = 9,472. Layer 2: C_in is now 64, the previous filter count, so (3 x 3 x 64 + 1) x 128 = 577 x 128 = 73,856. Layer 3: (1 x 1 x 128 + 1) x 32 = 129 x 32 = 4,128. Total 87,456. Two things worth saying unprompted: the 224 never appears, because weights are shared across positions, so parameters are independent of image size; and each layer\'s C_in is the previous layer\'s number of filters, which is where most slips happen.',
      isCaseBased: false,
    },
    {
      question: 'What is a receptive field, and why should anyone care?',
      answer:
        'The receptive field of one output number is the patch of input pixels that can influence it. One 3x3 conv gives a 3x3 field. Stack a second 3x3 and each of its nine inputs already saw a 3x3 patch, and those overlap, so the reach becomes 5x5. Add a 2x2 stride-2 pool and every later step now moves two input pixels at a time, so the field grows twice as fast from there on. Why it matters: if the receptive field is smaller than the object you want to recognise, no amount of training fixes it, because the unit physically cannot see the whole object. It is the first thing to check when a model handles small objects well and large ones badly, and it costs nothing to check because it is pure arithmetic.',
      isCaseBased: false,
    },
    {
      question: 'Max pooling, average pooling, or a stride-2 convolution. Pick one for downsampling and defend it.',
      answer:
        'Max pooling asks "did this feature appear anywhere in the window" and discards where, which buys a small translation invariance for zero parameters. Average pooling keeps the mean, which is smoother and preserves overall intensity, but averaging one strong response with three weak ones dilutes the signal, so it is unpopular mid-network and common at the very end as global average pooling. A stride-2 convolution downsamples the same way but learns how to summarise instead of always taking the max, at the cost of parameters and compute. My default is stride-2 convs for downsampling inside the network and global average pooling at the head. The honest caveat is that the measured difference is modest; this is a defensible-preference question, not a right-answer question.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague hardcodes the flatten size as 32 x 32 x 32 after three 3x3 conv layers on 32x32 input, and the model errors at the dense layer. Diagnose it.',
      answer:
        'They assumed convolutions preserve size, which is only true with \'same\' padding. The library default is \'valid\', meaning P = 0, so apply the formula three times: (32 - 3) + 1 = 30, then (30 - 3) + 1 = 28, then (28 - 3) + 1 = 26. The real flatten size is 26 x 26 x 32 = 21,632, not 32,768, so the dense layer was built for 32,768 inputs and handed 21,632. Mechanically, a 3x3 kernel with no padding eats one pixel off each side per layer because it needs room to sit fully inside, so three layers cost six pixels. Two fixes: pass padding=\'same\' so the assumption becomes true, or never hardcode a flatten size and print the shape after every layer instead. A stride greater than 1 or a pooling layer causes the same class of bug, and the one formula catches all of them.',
      isCaseBased: true,
    },
    {
      question: 'Case: a CNN reaches 96% on validation but collapses in production. Training images always had the object centred; production images have it anywhere in frame. What went wrong and how do you fix it?',
      answer:
        'A convolution gives equivariance, not invariance: shift the input and the feature map shifts with it. That only helps if whatever reads the feature map ignores position. If the model ends in flatten then dense, that head is position-dependent, because each spatial location has its own weights, so an off-centre object lands on weights that never saw it during training. Fixes in order: replace flatten plus dense with global average pooling, which averages over positions and makes the head genuinely position-independent, and which also deletes most of the model\'s parameters; add random-crop and translation augmentation so the training data actually contains off-centre objects; and check whether pooling was removed, since some invariance comes from there. The tradeoff to name out loud: global average pooling throws away coarse position, which is fine for classification and wrong for detection or segmentation, where you keep a spatial head and fix this with augmentation instead.',
      isCaseBased: true,
    },
    {
      question: 'Case: a model has only 5 million parameters but training runs out of memory at batch size 32 on a 24GB GPU. A colleague says to prune the model. Is that right?',
      answer:
        'Almost certainly not, because the memory is in activations, not weights. Five million parameters in 32-bit floats is about 20MB, and roughly 60MB once the optimiser state is counted. That did not fill 24GB. Early conv layers run at high resolution with many channels, so a 224 x 224 x 64 feature map is 3.2 million numbers per image, and training must keep the activations of every layer around for the backward pass, multiplied by a batch of 32. Diagnose by printing each layer\'s output shape and multiplying it out. Fixes ranked: smaller batch with gradient accumulation, which costs no quality; mixed precision, which roughly halves activation memory; gradient checkpointing, which recomputes activations in the backward pass and trades about 30% more compute for a large memory saving; downsampling earlier in the network, which is a real architecture change; and only then touching the parameter count. The distinction to state plainly is that parameters scale with kernel size and channels, while activation memory scales with resolution times channels times batch size.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    {
      front: 'Output-size formula',
      back: 'out = floor((W - K + 2P) / S) + 1. It counts how many places the kernel fits: last legal start is W + 2P - K, divided by the stride, plus the starting position itself.',
    },
    {
      front: 'Conv parameter count',
      back: '(K x K x C_in + 1) x C_out. The + 1 is one bias per filter. Input width and height never appear.',
    },
    {
      front: 'Parameter sharing',
      back: 'The same kernel numbers are used at every position. This is why 9 weights replace 14,400, and why the parameter count does not depend on image size.',
    },
    {
      front: 'Why a dense layer is wrong for images',
      back: '200x200x3 into 1,000 units is 120,000,000 weights for one layer. Flattening also destroys adjacency, and shifting the picture one pixel changes every input.',
    },
    {
      front: 'Kernel and channels',
      back: 'A kernel spans ALL input channels, so a 3x3 on a 64-channel input is a 3x3x64 cube of 576 weights. The number of filters is the number of output channels.',
    },
    {
      front: "'valid' vs 'same' padding",
      back: "'valid' means P = 0, so the picture shrinks by K - 1 each layer. 'same' means P = (K - 1) / 2 at stride 1, so the output size equals the input size.",
    },
    {
      front: 'Pooling',
      back: 'Slides a window and summarises it to one number, with zero weights. Max keeps the largest, average keeps the mean. A 2x2 window at stride 2 quarters the number of values and buys small translation invariance.',
    },
    {
      front: 'Receptive field',
      back: 'The patch of input pixels that can influence one output number. One 3x3 conv gives 3x3; two stacked give 5x5. If the field is smaller than the object, the unit cannot see it.',
    },
  ],
  mindmapMarkdown: `- CNNs: Convolution, Pooling & Receptive Fields
  - Why not a dense layer
    - 200x200x3 = 120,000 inputs
    - x 1000 units = 120,000,000 weights
    - flatten destroys adjacency
    - shift 1 pixel -> every input moves
  - Convolution
    - kernel = small grid of weights
    - slide, multiply, add -> one number
    - output grid = feature map
    - hand example: 5x5, edge kernel -> 30, 30, 0
  - Output size
    - counts where the kernel fits
    - out = floor((W - K + 2P)/S) + 1
    - 5,3,0,1 -> 3
    - 5,3,1,1 -> 5 ('same')
    - 5,3,0,2 -> 2 (rounding drops a window)
  - Padding
    - 'valid' = P 0, shrinks
    - 'same' = P (K-1)/2, size kept
    - also saves the border pixels
  - Channels
    - kernel spans ALL input channels
    - 3x3 on 64 ch = 576 weights per filter
    - filters = output channels
  - Parameter counting
    - (K x K x C_in + 1) x C_out
    - 3x3, 3 in, 16 out = 448
    - W and H are absent
    - conv 448 at any picture size
  - Pooling
    - window summarised, zero weights
    - max: largest in window
    - average: mean of window
    - 4x4 -> 2x2 with 2x2 stride 2
  - Receptive field
    - input pixels that reach one output
    - one 3x3 -> 3x3; two -> 5x5
    - too small -> cannot see the object
  - Classic mistake
    - forgot padding, 32 -> 30 -> 28 -> 26
    - flatten 21,632 not 32,768
    - print shapes, never hardcode
  - Worked case
    - 32x32x3 -> conv16 -> pool -> conv32 -> pool
    - 448 + 4,640 + 20,490 = 25,578
    - dense head holds 80%`,
}

export default m
