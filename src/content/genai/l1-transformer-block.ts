import type { Module } from '../types'

const m: Module = {
  id: 'genai-l1-transformer-block',
  subjectId: 'genai',
  level: 1,
  title: 'The Transformer Block: Attention, Feed-Forward, Residual, Norm',
  whyItMatters:
    'You have built attention. Attention alone is not a model — it mixes information between positions and stops there. A transformer is one small unit, repeated: attention, then a small network that thinks about each position on its own, wrapped in two pieces of plumbing that make deep stacks trainable. This module builds that unit end to end with four numbers per token, so you can draw it from memory and say what every piece is for.',
  assumes: [
    'You have read Self-Attention from zero, Multi-Head Attention & Causal Masking, and Positional Encoding: Teaching Attention About Order',
    'You know that after attention, each token is still one vector of d numbers - the same size it came in as',
    'You have seen a Python for loop, a list, and a function definition',
    'From the Deep Learning subject: a network learns by nudging its numbers, and the nudges come from slopes computed backwards through the layers',
  ],
  estMinutes: 40,
  sections: [
    {
      type: 'intuition',
      title: 'One token, four numbers, four things done to it',
      md: `Take one token. After embedding and positional encoding it is a list of numbers. We will use four numbers so everything fits on the page: **[1.0, 0.0, 0.0, 0.0]**. Real models use 768 or 12288 numbers instead of 4. The count of numbers per token has a name: **d_model**, the model width. Here d_model = 4.

A transformer does four things to that list, in this order, and then does the same four things again, and again.

1. **Attention** — mix information between positions. Token 5 pulls in a bit of token 2 and a bit of token 3. This is the only step where tokens see each other.
2. **A feed-forward network** — think about each position on its own. Same small network applied separately to every token, no looking sideways at neighbours.
3. **Residual connections** — after each of those two steps, add the result back onto what you had before, instead of replacing it.
4. **Layer normalisation** — before each of those two steps, rescale the numbers to a standard size so the next step gets a well-behaved input.

That bundle of four is called a **block**. The whole architecture is: embed the tokens, run the block, run another block with different numbers inside it, run another, and after the last one convert each token vector into a guess at the next token. Nothing else.`,
    },
    {
      type: 'visual',
      component: 'Plot',
      props: {
          title: 'Where the parameters actually live in one transformer block',
          notice: 'For d_model = 768: attention needs four d×d matrices (Q, K, V and the output projection) = 2,359,296 parameters. The feed-forward network expands to 4d and back, so it is two 768×3072 matrices = 4,718,592. The FFN holds twice what attention does. Attention gets all the attention, but two thirds of the block is the boring MLP — which is also where most of the compute and most of the memorised facts sit.',
          kind: 'bar',
          yLabel: 'parameters (millions)',
          bars: [
            { label: 'attention (4d²)', value: 2.3593, color: 0 },
            { label: 'feed-forward (8d²)', value: 4.7186, color: 1 },
          ],
          unit: 'M',
        },
    },
    {
      type: 'intuition',
      title: 'Block, stack, depth',
      md: `Three words you will now see everywhere, defined once.

- A **block** is one copy of the four parts above. Sometimes called a layer.
- A **stack** is those blocks placed one after another, the output of one feeding the input of the next.
- **Depth** is how many blocks are in the stack. Small models use 12, large ones 80 or 96.

The blocks are not copies in the sense of sharing numbers. Each block has its own weights and learns its own job. What is copied is the *shape*: every block takes a list of d_model numbers per token and returns a list of d_model numbers per token. Input shape equals output shape.

That one property is what makes a stack legal. If a block changed the width, you could not feed it into another one without a converter in between. Because it does not, you can write the whole model as a loop that runs the same code 12 times with 12 different sets of weights.`,
    },
    {
      type: 'intuition',
      title: 'The residual connection: add, do not replace',
      md: `Here is the ordinary way to write a layer: \`x = F(x)\`. Whatever the layer computes becomes the new value. The old value is gone.

A **residual connection**, also called a **skip connection**, writes it differently: \`x = x + F(x)\`. Compute the same thing, but *add* it to what was already there. The old value survives; F only contributes a correction on top of it.

You have met this exact idea before, in the Deep Learning subject, in *LeNet to ResNet: The Architectures That Mattered*. It is the same trick solving the same problem: before it, networks past about 20 layers trained badly or not at all; after it, 100+ layers became routine. Transformers borrowed it wholesale, and it is the reason a 96-block stack is even attemptable.

Because every block adds and never replaces, the vector travelling up through the stack is one running sum: the embedding, plus every correction every sublayer decided to make. That running sum has a name: the **residual stream**. It is the same list of d_model numbers all the way up, being written into by everything on the way.`,
    },
    {
      type: 'intuition',
      title: 'Why adding keeps the learning signal alive',
      md: `A network learns by sending a slope backwards from the loss to every weight. Passing that slope back through a layer multiplies it by how much that layer's output changes when its input changes.

- Without a residual, layer L multiplies the incoming slope by some factor J. Twenty layers means multiplying by J twenty times. If J is small, the number that reaches the bottom of the stack is effectively zero, and the early layers never learn anything. This is called the **vanishing gradient** problem.
- With a residual, the layer's output is x + F(x). Change the input by a little and the output changes by that same little bit (from the \`x\` term) plus whatever F does (the J term). So the multiplier is **1 + J**, not J.

The difference between multiplying by 0.1 twenty times and multiplying by 1.1 twenty times is not small. The next snippet just does that arithmetic.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Twenty layers, with and without the residual',
      code: `J = 0.1
plain = 1.0
res = 1.0
for layer in range(20):
    plain = plain * J
    res = res * (1 + J)
print(plain)
print(round(res, 3))

# ---- real output ----
# 1.0000000000000011e-20
# 6.727`,
      annotations: {
        1: 'J is how much this layer scales the slope passing back through it. 0.1 is a plausible small value for a freshly initialised layer.',
        2: 'plain starts the slope at 1.0 and will track the no-residual version: multiply by J at every layer.',
        3: 'res starts the same slope at 1.0 and will track the with-residual version.',
        4: 'range(20) gives 0,1,...,19 - twenty layers to travel down through. The loop variable is unused; we only need to repeat twenty times.',
        5: 'No residual: the slope is multiplied by J. Nothing else survives.',
        6: 'With a residual the layer output is x + F(x), so the slope is multiplied by 1 + J = 1.1. The 1 comes from the untouched x that was added back.',
        7: 'Prints 1e-20. That is the slope arriving at the first layer: too small for any optimiser to act on. The first layers are frozen in place.',
        8: 'Prints 6.727. Same twenty layers, same J, but the slope arrived intact and slightly amplified. The bottom of the stack can still learn.',
      },
    },
    {
      type: 'note',
      md: 'One honesty note on that snippet: 1.1 to the twentieth is 6.7, and if the stack were 200 blocks deep it would be about 190 million. Adding without ever rescaling can make numbers grow with depth, in both directions. That growth is exactly what the next piece, layer normalisation, is there to keep in check.',
    },
    {
      type: 'intuition',
      title: 'Layer normalisation: put the numbers back on a standard scale',
      md: `**Layer normalisation** takes one token's list of numbers and rescales it so that the values sit at a standard size. Concretely, for the list [2.0, 4.0, 4.0, 6.0]:

- Compute the average: (2 + 4 + 4 + 6) / 4 = **4.0**.
- Subtract it from each number: [-2, 0, 0, 2]. Now the average is zero.
- Compute how spread out those are: the average of the squares is (4 + 0 + 0 + 4) / 4 = 2, and its square root is about **1.414**.
- Divide each by 1.414: [-1.414, 0, 0, 1.414]. Now the average is 0 and the typical size is 1.

Two details that matter and get asked about:

- It works across the **d_model numbers of one single token**. Not across the batch, not across the sequence. Token 5 is normalised using only token 5's own numbers, so nothing about the other tokens can leak in, and a sequence of any length behaves identically.
- Real implementations then multiply by a learned vector and add a learned vector, so the model can undo the normalisation if it wants to. Those two vectors are 2·d_model numbers per normalisation - a rounding error next to everything else in the block.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Layer normalisation, by hand',
      code: `import math

def layer_norm(v):
    n = len(v)
    mean = sum(v) / n
    spread = sum((x - mean) ** 2 for x in v) / n
    sd = math.sqrt(spread + 1e-5)
    return [(x - mean) / sd for x in v]

x = [2.0, 4.0, 4.0, 6.0]
normed = layer_norm(x)
print([round(v, 3) for v in normed])
print(round(sum(normed) / 4, 4))

# ---- real output ----
# [-1.414, 0.0, 0.0, 1.414]
# 0.0`,
      annotations: {
        1: 'math is Python\'s standard maths module. We need it only for math.sqrt, the square root.',
        3: 'v is one token\'s list of numbers. This function never sees any other token.',
        4: 'len(v) is how many numbers the token has - d_model. Here it will be 4.',
        5: 'sum(v) adds the list up; dividing by n gives the average.',
        6: 'For each number, subtract the average and square the result, then average those. Squaring makes every difference positive, so they cannot cancel out. The bracketed part is a generator expression: it produces one squared difference at a time for sum() to add up, without building a list first.',
        7: 'The square root of that average turns it back into the same units as the original numbers - the typical distance from the average. The tiny 1e-5 is added so that a token whose numbers are all identical does not divide by zero.',
        8: 'Subtract the average and divide by the typical size, for every number. The square brackets make a list comprehension: run the expression once per item and collect the results into a new list.',
        10: 'The example list. Its average is 4.0 and its typical distance from that average is about 1.414.',
        11: 'Call the function and keep the result.',
        12: 'round(v, 3) trims each number to 3 decimals so the printout is readable. Output: [-1.414, 0.0, 0.0, 1.414].',
        13: 'A check: the average of the normalised numbers is exactly 0.0, which is what "normalised" means here.',
      },
    },
    {
      type: 'intuition',
      title: 'Pre-norm and post-norm: where the normalisation goes',
      md: `You now have two ingredients that both wrap a sublayer, and there are two ways to order them.

- **Post-norm**: \`x = LayerNorm(x + F(x))\`. Add first, then normalise the result. This was the original 2017 arrangement.
- **Pre-norm**: \`x = x + F(LayerNorm(x))\`. Normalise a copy, feed the copy to F, then add F's output onto the untouched original.

Essentially every model built in the last several years uses **pre-norm**, and the reason is training stability, not final quality.

Here is the mechanism. The previous snippet showed the whole benefit of a residual is the multiplier being 1 + J instead of J - and the 1 comes from the input being passed through untouched. In pre-norm it *is* untouched: the normalisation happens on a copy that goes into the branch. In post-norm the sum is normalised on its way out, so the value passing to the next block has been rescaled, and after 40 blocks of that the clean multiply-by-1 route is gone. The practical consequence is that post-norm stacks diverge unless the learning rate is ramped up slowly over thousands of steps, and get fragile past roughly 20 blocks. Pre-norm stacks train at 100 blocks with far less care.

Pre-norm has one honest cost. Nothing renormalises the stream itself, so its magnitude grows with depth (that 6.727 from the snippet, compounding). Two fixes come along with it: real models scale down what each branch writes at initialisation, and a pre-norm stack needs one extra layer normalisation after the final block, because otherwise nothing has normalised the numbers on their way to the output.`,
    },
    {
      type: 'math',
      intro: 'The two orderings, side by side. F stands for either sublayer - attention or feed-forward.',
      latex: [
        '\\textbf{post-norm:}\\quad x \\;\\leftarrow\\; \\mathrm{LN}\\big(x + F(x)\\big) \\qquad\\qquad \\textbf{pre-norm:}\\quad x \\;\\leftarrow\\; x + F\\big(\\mathrm{LN}(x)\\big)',
        '\\mathrm{LN}(x)_i = \\frac{x_i - \\mu}{\\sqrt{\\sigma^2 + \\epsilon}}, \\qquad \\mu = \\frac{1}{d}\\sum_{j=1}^{d} x_j, \\qquad \\sigma^2 = \\frac{1}{d}\\sum_{j=1}^{d}(x_j - \\mu)^2',
      ],
    },
    {
      type: 'intuition',
      title: 'The feed-forward network: thinking about one position at a time',
      md: `Attention is the only part that moves information between positions. After it runs, every token holds a mixture of things it gathered. Something then has to *process* that mixture, and that is the **feed-forward network**, usually written FFN.

It is the simplest network there is, two steps:

1. Multiply the token's d_model numbers by a matrix that produces **more** numbers than it took in - say 4 times as many. Then squash: anything negative becomes zero.
2. Multiply those back down to d_model numbers.

The factor by which the middle is wider is the **expansion factor**. The standard choice is 4: a width-768 model has a 3072-wide middle. There is no theorem behind 4. It was the original paper's choice, it works, and it keeps the matrix shapes convenient on a GPU. What the squash buys you is the ability to compute something that is not just a weighted sum of the inputs - without it, two matrix multiplies in a row collapse into one matrix and the whole FFN would be pointless.

The same FFN weights are applied to every token separately. Token 1 and token 40 go through identical arithmetic and never influence each other inside it. That is what "position-wise" means when you see it.

One way to read the two matrices: each row of the first matrix is a pattern the network looks for in the token, and the matching row of the second matrix is what gets written back into the residual stream when that pattern is found. That is a useful picture and it is supported by work that locates specific facts in specific FFN rows - but treat it as a working hypothesis, not a settled fact. Real units fire on many unrelated things at once.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The FFN weights: eight patterns to look for, and what each writes back',
      code: `W1 = [[1.0, 0.0, 0.0, 0.0], [0.0, 1.0, 0.0, 0.0],
      [0.0, 0.0, 1.0, 0.0], [0.0, 0.0, 0.0, 1.0],
      [1.0, 1.0, 0.0, 0.0], [0.0, 0.0, 1.0, 1.0],
      [1.0, -1.0, 0.0, 0.0], [0.0, 0.0, 1.0, -1.0]]
W2 = [[0.1 * w for w in row] for row in W1]
print(len(W1), len(W1[0]))
print(W2[4])

# ---- real output ----
# 8 4
# [0.1, 0.1, 0.0, 0.0]`,
      annotations: {
        1: 'W1 is the first matrix: 8 rows, each with 4 numbers, so it turns 4 numbers into 8. Row 1 responds to the token\'s first number alone, row 2 to the second alone.',
        2: 'Rows 3 and 4 respond to the third and fourth numbers alone. These first four rows are the boring detectors: one feature each.',
        3: 'Row 5 responds to number 1 AND number 2 together; row 6 to numbers 3 and 4 together. These fire on a combination, which is the point of having a hidden layer at all.',
        4: 'Rows 7 and 8 respond to a DIFFERENCE: number 1 minus number 2. They fire when one is bigger than the other.',
        5: 'W2 is the second matrix, built here as a shrunk copy of W1 so the demo is readable: each row detects a pattern and writes back along that same pattern, scaled by 0.1. A real model learns W1 and W2 independently. The nested square brackets are a list comprehension inside a list comprehension: the inner one scales every number in a row, the outer one does that for every row.',
        6: 'Prints the shape: 8 rows of 4. 4 in, 8 in the middle - an expansion factor of 2. Real models use 4; 2 keeps this printout short and changes nothing about the story.',
        7: 'Prints row 5 of W2: [0.1, 0.1, 0.0, 0.0]. When the "numbers 1 and 2 are both large" pattern fires, this is the direction it adds into the stream.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The FFN itself: score every pattern, squash, write back',
      code: `def ffn(v):
    out = [0.0, 0.0, 0.0, 0.0]
    for h in range(8):
        score = 0.0
        for j in range(4):
            score = score + W1[h][j] * v[j]
        fired = max(0.0, score)
        for j in range(4):
            out[j] = out[j] + fired * W2[h][j]
    return out

print([round(v, 3) for v in ffn([1.0, 0.0, 0.0, 0.0])])

# ---- real output ----
# [0.3, 0.0, 0.0, 0.0]`,
      annotations: {
        1: 'v is ONE token\'s four numbers. The function has no way to see any other token - that is position-wise, in code.',
        2: 'The result starts as four zeros. Each pattern that fires will add into it.',
        3: 'Loop over the 8 rows of W1, one per pattern.',
        4: 'score will hold how strongly pattern h matches this token.',
        5: 'Loop over the 4 numbers of the token to build that score.',
        6: 'Multiply each of the token\'s numbers by the matching weight in the pattern and add it up. This is a dot product written out longhand.',
        7: 'The squash: negative scores become 0, positive scores pass through unchanged. This is the ReLU function. Without this line the two matrices would collapse into one and the FFN could not compute anything new.',
        8: 'Loop over the 4 output numbers to write this pattern\'s contribution.',
        9: 'How strongly the pattern fired, times the direction that pattern writes. Patterns that did not fire contribute exactly zero here.',
        10: 'Return the four numbers. Same width in, same width out - which is what lets us add this straight back onto the stream.',
        12: 'Feed it the token [1,0,0,0]. Three patterns match: row 1 (first number alone), row 5 (numbers 1 and 2), row 7 (number 1 minus number 2). Each fires with score 1.0 and writes 0.1 into the first slot, so the output is [0.3, 0.0, 0.0, 0.0].',
      },
    },
    {
      type: 'intuition',
      title: 'Most of the model is the FFN, and it is not close',
      md: `Now count. Take a model width of d = 512 and the standard expansion factor of 4, and count only the big matrices (the normalisation vectors and the small additive terms are a fraction of a percent).

- **Attention** has four matrices: one to build the queries, one for the keys, one for the values, and one to mix the heads back together at the end. Each is d by d. That is 4·d² = 4·512·512 = **1,048,576**.
- **The FFN** has two matrices: one of shape d by 4d going up, one of shape 4d by d coming down. That is 2·d·4d = 8·d² = **2,097,152**.
- Block total: 12·d². The FFN is 8 of those 12 - **two thirds of every transformer sits in the feed-forward networks**, not in attention.

That ratio surprises people, because attention is the part everyone talks about. It also explains a lot of practical engineering: when someone shrinks a model to fit on a smaller GPU, the FFN matrices are where the bytes are.

Multiply by depth and you get the formula worth memorising: a stack of L blocks of width d has roughly **12·L·d²** weights, not counting the embedding table.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Counting the weights in one block',
      code: `d = 512
attn = 4 * d * d
hidden = 4 * d
ffn_p = 2 * d * hidden
block = attn + ffn_p
print("attention", attn)
print("ffn      ", ffn_p)
print("block    ", block)
print("ffn share", round(100 * ffn_p / block, 1))
print("12 blocks", 12 * block)

# ---- real output ----
# attention 1048576
# ffn       2097152
# block     3145728
# ffn share 66.7
# 12 blocks 37748736`,
      annotations: {
        1: 'The model width. Every number below is driven by this one.',
        2: 'Four d-by-d matrices: queries, keys, values, and the output mixing matrix. Note that the number of heads does not appear - heads split d up, they do not add weights.',
        3: 'The middle width of the FFN: the expansion factor of 4 times d, so 2048.',
        4: 'Two matrices, each d by hidden. One going up, one coming down.',
        5: 'One block is those two groups added together.',
        6: 'Prints 1,048,576 weights for attention.',
        7: 'Prints 2,097,152 for the FFN - exactly double.',
        8: 'Prints 3,145,728 for the whole block. This is 12·d²: check it as 12 * 512 * 512.',
        9: 'Prints 66.7. Two thirds of the block is the FFN, and this ratio does not depend on d at all - it is 8/12 whatever width you pick.',
        10: 'Prints 37,748,736 for a 12-block stack. The same arithmetic at d = 12288 and L = 96 gives about 174 billion.',
      },
    },
    {
      type: 'intuition',
      title: 'Encoder-only, decoder-only, encoder-decoder',
      md: `Same block, three ways of wiring it up, and the difference is only about who is allowed to see what.

An **encoder-only** model lets every token attend to every other token in both directions, so each token ends up holding a representation informed by the whole input. It is for *understanding* an input you already have: classifying a review, tagging names in a sentence, turning a document into a vector for search. It cannot write text left to right, because it was never trained to. A **decoder-only** model masks attention so that token 5 can see tokens 1 to 5 and nothing later. It is for *generating*: predict the next token, append it, repeat. An **encoder-decoder** model has both stacks - one reads the input bidirectionally, the other generates the output while also attending to the encoder's output. It is for turning one sequence into a *different* sequence, such as translation. Decoder-only is what general-purpose text models are, and it is the one you will build.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'The residual stream through one block',
        notice:
          'One token, four numbers. Watch the left column: each new value is the previous value PLUS something, never a replacement. The last frame removes the residual so you can see what it was buying.',
        leftLabel: 'the token vector (the residual stream)',
        rightLabel: 'what the sublayer computed',
        frames: [
          {
            note: 'The embedding writes the starting value. From here to the output, this vector is only ever added to.',
            stack: [{ name: 'stream', value: '[1.0 0.0 0.0 0.0]' }],
            heap: [{ id: 'emb', value: 'embedding + position', label: 'the starting value' }],
          },
          {
            note: 'Part 1. Layer normalisation makes a rescaled COPY. Attention reads that copy and computes a correction. The stream itself has not moved yet.',
            stack: [{ name: 'stream', value: '[1.0 0.0 0.0 0.0]', to: 'a1' }],
            heap: [{ id: 'a1', value: '+[0.58 0.12 -.12 -.58]', label: 'attention output' }],
          },
          {
            note: 'The residual add. New value = old value + correction. The 1.0 the embedding wrote is still there, plus what attention found.',
            stack: [
              { name: 'before', value: '[1.0 0.0 0.0 0.0]' },
              { name: 'after', value: '[1.58 0.12 -.12 -.58]' },
            ],
            heap: [{ id: 'a1', value: 'added, not replaced', label: 'attention output' }],
          },
          {
            note: 'Part 2. The FFN reads its own normalised copy of the updated stream. It sees this token only - no mixing between positions happens here.',
            stack: [{ name: 'stream', value: '[1.58 0.12 -.12 -.58]', to: 'f1' }],
            heap: [{ id: 'f1', value: '+[0.49 -.03 0.06 -.06]', label: 'FFN output' }],
          },
          {
            note: 'The second residual add. Block done: two reads, two adds, zero replacements. The next block does the same to this value with its own weights.',
            stack: [
              { name: 'before', value: '[1.58 0.12 -.12 -.58]' },
              { name: 'after', value: '[2.07 0.08 -.06 -.64]' },
            ],
            heap: [{ id: 'f1', value: 'added, not replaced', label: 'FFN output' }],
          },
          {
            note: 'Now delete the residual: each sublayer REPLACES the stream instead of adding to it. The original [1.0 0.0 0.0 0.0] is gone after one block, and the learning signal has no multiply-by-1 route back down.',
            stack: [
              { name: 'before', value: '[1.0 0.0 0.0 0.0]', to: 'lost', danger: true },
              { name: 'after', value: '[0.42 0.08 0.11 -.11]', danger: true },
            ],
            heap: [
              { id: 'lost', value: 'overwritten', label: 'no residual', danger: true },
              { id: 'gz', value: 'slope shrinks to 0', label: 'vanishing gradient', danger: true },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Worked case: one full block, by hand and in code',
      md: `Three tokens, four numbers each, plainly chosen so you can follow the arithmetic:

- token A = [1, 0, 0, 0], token B = [0, 1, 0, 0], token C = [0, 0, 1, 0].
- We are processing token A. Attention has already decided its weights: **0.5 on itself, 0.3 on B, 0.2 on C**. Where those weights came from is the previous module's job; here we only use them.

By hand, in order:

1. Normalise each token. [1,0,0,0] has average 0.25 and typical spread 0.433, so it becomes [1.732, -0.577, -0.577, -0.577]. B and C become the same pattern with the 1.732 in their own slot.
2. Attention's output is the weighted mixture: slot 1 gets 0.5·1.732 + 0.3·(-0.577) + 0.2·(-0.577) = 0.866 - 0.173 - 0.115 = **0.577**. Do the other three slots the same way to get [0.577, 0.115, -0.115, -0.577].
3. **First residual add**: [1, 0, 0, 0] + [0.577, 0.115, -0.115, -0.577] = **[1.577, 0.115, -0.115, -0.577]**. Note the 1.0 is still in there.
4. Normalise that, feed it to the FFN, and the FFN returns [0.494, -0.033, 0.057, -0.057].
5. **Second residual add**: [1.577, ...] + [0.494, ...] = **[2.071, 0.082, -0.058, -0.635]**.

That last list is the block's output. Same four numbers wide as the input, so it goes straight into the next block. The next two snippets run exactly this.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 1: the mixing half of attention',
      code: `def attn_mix(seq, weights):
    out = [0.0, 0.0, 0.0, 0.0]
    for w, tok in zip(weights, seq):
        for j in range(4):
            out[j] = out[j] + w * tok[j]
    return out

seq = [[1.0, 0.0, 0.0, 0.0], [0.0, 1.0, 0.0, 0.0], [0.0, 0.0, 1.0, 0.0]]
print([round(v, 3) for v in attn_mix(seq, [0.5, 0.3, 0.2])])

# ---- real output ----
# [0.5, 0.3, 0.2, 0.0]`,
      annotations: {
        1: 'seq is the list of token vectors; weights is how much of each to take. This is the last step of attention - the weighted mixture. The queries, keys and softmax that produced the weights were the previous module.',
        2: 'Start the mixture at four zeros.',
        3: 'zip pairs each weight with its token, so the first time round the loop w is 0.5 and tok is token A. It stops when the shorter of the two runs out.',
        4: 'Loop over the four slots of the vector.',
        5: 'Add this token\'s contribution to that slot, scaled by its weight.',
        6: 'Return the mixture - four numbers, same width as any single token.',
        8: 'Three tokens, deliberately simple: each has a 1.0 in a different slot.',
        9: 'Mixing the raw tokens with 0.5/0.3/0.2 gives exactly [0.5, 0.3, 0.2, 0.0], which makes the mixing obvious. The full block below feeds it normalised tokens instead, so the numbers stop being this tidy.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 2: the whole block, all four parts',
      code: `stream = [1.0, 0.0, 0.0, 0.0]
normed_seq = [layer_norm(t) for t in seq]
delta_a = attn_mix(normed_seq, [0.5, 0.3, 0.2])
mid = [stream[j] + delta_a[j] for j in range(4)]
delta_f = ffn(layer_norm(mid))
outv = [mid[j] + delta_f[j] for j in range(4)]
print("attn delta", [round(v, 3) for v in delta_a])
print("after add ", [round(v, 3) for v in mid])
print("ffn delta ", [round(v, 3) for v in delta_f])
print("block out ", [round(v, 3) for v in outv])

# ---- real output ----
# attn delta [0.577, 0.115, -0.115, -0.577]
# after add  [1.577, 0.115, -0.115, -0.577]
# ffn delta  [0.494, -0.033, 0.057, -0.057]
# block out  [2.071, 0.082, -0.058, -0.635]`,
      annotations: {
        1: 'The token we are processing, straight from the embedding. This is the residual stream at the bottom of the model.',
        2: 'Pre-norm, part 1: normalise a COPY of every token. The originals in seq are untouched.',
        3: 'Attention reads the normalised copies and returns a correction for our token: [0.577, 0.115, -0.115, -0.577].',
        4: 'The first residual add: old value plus correction, slot by slot. Slot 1 goes 1.0 -> 1.577, and the original 1.0 is still inside that number.',
        5: 'Pre-norm, part 2: normalise a copy of the updated stream and hand it to the FFN. The FFN sees this token alone.',
        6: 'The second residual add. This is the block\'s output.',
        7: 'Prints what attention contributed.',
        8: 'Prints the stream after the first add.',
        9: 'Prints what the FFN contributed.',
        10: 'Prints [2.071, 0.082, -0.058, -0.635]: four numbers in, four numbers out, so this feeds straight into block 2.',
      },
    },
    {
      type: 'intuition',
      title: 'The classic mistake: writing the sublayer without the add',
      md: `Here is the wrong version, and it looks so reasonable that people write it by accident:

\`x = attention(layer_norm(x))\` then \`x = ffn(layer_norm(x))\`

Each line simply assigns the sublayer's output. No \`x +\`. It runs, the shapes all match, and nothing crashes. The next snippet runs it on our numbers.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same block with the two adds deleted',
      code: `mid2 = delta_a[:]
out2 = ffn(layer_norm(mid2))
print("overwrite out", [round(v, 3) for v in out2])

# ---- real output ----
# overwrite out [0.416, 0.083, 0.111, -0.111]`,
      annotations: {
        1: 'Instead of stream + delta_a, take attention\'s output on its own. The [:] makes a copy of the list so the original delta_a is not disturbed. The token\'s own embedding is now gone.',
        2: 'Feed that to the FFN, and again keep only the FFN\'s output rather than adding it on.',
        3: 'Prints [0.416, 0.083, 0.111, -0.111]. Compare with the correct block output [2.071, 0.082, -0.058, -0.635]. It is not a small difference: the 2.071 that carried the token\'s own identity has collapsed to 0.416.',
      },
    },
    {
      type: 'intuition',
      title: 'Why that is wrong, and what the training curve looks like',
      md: `Two separate failures, and it is worth naming both.

**One: the token forgets what it is.** Attention's output is a weighted average of other tokens. Take the average, throw away the original, then average again in the next block, and again - after a dozen blocks every position has drifted toward the same blur. With the residual, attention only ever adds a correction on top of the token itself, so the token's own identity survives all the way to the top.

**Two: the learning signal dies.** This is the 1e-20 from the earlier snippet. Without the added \`x\`, the multiplier per block is J instead of 1 + J, and by the bottom of a deep stack there is nothing left to learn from.

What you actually see when you train it: the loss drops for a few hundred steps as the last blocks learn something, then flattens at a bad value and stays there. Not a crash, not a spike - a plateau. Meanwhile the identical model with the adds put back keeps descending past that point. If you log the size of the slopes per block, the broken run shows them shrinking steadily as you go down the stack while the top blocks look fine. That pattern - top layers learning, bottom layers frozen, loss stuck early - is the signature.

A related version of the same mistake is putting the normalisation in the wrong place: \`x = layer_norm(x + F(x))\` instead of \`x = x + F(layer_norm(x))\`. That one does train, so it is harder to catch. The symptom is a run that only survives with a long learning-rate ramp-up and blows up without one, and gets worse the deeper you build.`,
    },
    {
      type: 'intuition',
      title: 'Practice',
      md: `Work these with a pen before reading the solutions in the next section.

1. A model has d_model = 1024 and an expansion factor of 4. How many weights are in one block's attention matrices, how many in its FFN matrices, and what fraction of the block is the FFN?
2. The same model has 24 blocks. Roughly how many weights in the whole stack, ignoring embeddings?
3. Layer-normalise the token [3.0, 1.0, 1.0, 3.0] by hand.
4. A block's input is [0.5, 0.5], attention's output is [0.2, -0.1] and the FFN's output (computed after the first add) is [0.0, 0.3]. What does the block output? What would it output with no residual connections?
5. A colleague reports that their 30-block model's loss explodes in the first thousand steps unless they ramp the learning rate up very slowly. What do you check first?`,
    },
    {
      type: 'intuition',
      title: 'Practice solutions',
      md: `**1.** Attention is 4·d² = 4·1024·1024 = 4,194,304. The FFN is 8·d² = 8,388,608. Block total 12·d² = 12,582,912, and the FFN is 8/12 = 66.7% of it. The fraction is always two thirds, whatever d is.

**2.** 24 · 12,582,912 = 301,989,888, so about 302 million. Or straight from the formula: 12·L·d² = 12·24·1024².

**3.** Average = (3+1+1+3)/4 = 2.0. Subtract: [1, -1, -1, 1]. Average of the squares = (1+1+1+1)/4 = 1, square root = 1. Divide: **[1, -1, -1, 1]** - it was already at the standard scale, so normalising changed nothing but the centring.

**4.** With residuals: after the first add, [0.5, 0.5] + [0.2, -0.1] = [0.7, 0.4]. After the second, [0.7, 0.4] + [0.0, 0.3] = **[0.7, 0.7]**. Without residuals the block output is just the FFN's output, **[0.0, 0.3]** - the input has vanished entirely, and notice the FFN's own contribution to slot 1 was zero, so slot 1 carries no information at all.

**5.** Post-norm. Needing a slow learning-rate ramp to avoid divergence, and getting worse with depth, is the standard symptom of \`LayerNorm(x + F(x))\`. Check whether the normalisation sits inside the branch or on the stream, and move it inside - plus add one final normalisation after the last block. Only after ruling that out would you look at learning rate, gradient clipping, or numerical precision.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Four things you will meet in real configuration files, once the above is solid.

- **RMSNorm.** Layer normalisation with the average-subtraction and the additive learned vector removed: just divide by the root of the mean of the squares, then scale. It turned out the re-centring was never the part that helped. It is one pass over the vector instead of two, at the same quality, so most recent models use it.
- **Gated FFNs.** Instead of two matrices, three: one produces the values, one produces a gate that multiplies them elementwise, one projects back down. Because there are three matrices, the middle width is cut to about 8/3·d so the total stays at 8·d² per block. The parameter budget is the thing people keep constant, not the number 4.
- **Weight tying.** The matrix that turns a final token vector into a score for every vocabulary word can be the same matrix as the input embedding table, transposed. Both directions encode "which word is this vector about". It saves vocabulary-size times d weights, which is a third of a small model and irrelevant in a large one - so small models tie and large ones often do not.
- **Mixture of experts.** Since two thirds of the weights are FFN, one way to grow a model cheaply is to keep many FFNs per block and route each token to only one or two of them. Total weights go up a lot; the work done per token barely moves. It exists because of the two-thirds ratio you counted above.`,
    },
  ],
  quiz: [
    {
      question: 'What are the four parts of a transformer block, and what is each for?',
      options: [
        {
          text: 'Attention mixes information between positions; the FFN processes each position alone; residuals add each result back instead of replacing; layer normalisation rescales the input to each sublayer',
          explanation: 'Correct. Two parts that compute, two parts of plumbing that make a deep stack of them trainable.',
        },
        {
          text: 'Embedding, attention, softmax, and the output head',
          explanation: 'Those are parts of the whole model, not of the repeating block. Embedding and the output head appear once, at the bottom and the top.',
        },
        {
          text: 'Attention, dropout, pooling, and a classifier',
          explanation: 'Pooling and a classifier belong to convolutional image models. A transformer block has no pooling step at all.',
        },
      ],
      correct: 0,
    },
    {
      question: 'With model width d and an expansion factor of 4, how do the attention and FFN weight counts compare per block?',
      options: [
        { text: 'Attention 8d², FFN 4d² - attention holds more', explanation: 'Backwards. Attention has four d-by-d matrices; the FFN is the one with the 4x wider middle.' },
        {
          text: 'Attention 4d², FFN 8d² - the FFN holds two thirds of the block',
          explanation: 'Correct. Queries, keys, values and the output mix give 4d². Up (d by 4d) plus down (4d by d) gives 8d². Total 12d², and 8/12 is two thirds.',
        },
        { text: 'Both 6d², balanced by design', explanation: 'Nothing in the design balances them, and they are not equal. The FFN is exactly double attention at expansion 4.' },
      ],
      correct: 1,
    },
    {
      question: 'What does a residual connection actually change in the arithmetic?',
      options: [
        { text: 'It multiplies the sublayer output by a learned scale', explanation: 'That is what the learned vector in layer normalisation does. A residual has no weights at all.' },
        {
          text: 'The layer computes x + F(x) instead of F(x), so the learning signal passing back is multiplied by 1 + J instead of J',
          explanation: 'Correct, and that 1 is the whole point: it is a route down the stack that neither shrinks nor grows the signal.',
        },
        { text: 'It skips the layer entirely when the layer is not useful', explanation: 'Nothing is skipped - the sublayer always runs. What is true is that a sublayer with nothing to contribute can output near zero and cost nothing.' },
      ],
      correct: 1,
    },
    {
      question: 'Layer normalisation in a transformer normalises across…',
      options: [
        { text: 'The batch of examples, one feature at a time', explanation: 'That is batch normalisation. It is a bad fit here because sequences in a batch have different lengths.' },
        { text: 'The whole sequence, so all tokens end up on one scale', explanation: 'No - that would leak information between positions, which only attention is allowed to do.' },
        {
          text: 'The d_model numbers of one single token',
          explanation: 'Correct. Each token is normalised using only its own numbers, so sequence length and batch contents are irrelevant.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Why do modern models use pre-norm, x = x + F(LayerNorm(x)), rather than post-norm?',
      options: [
        { text: 'It uses fewer parameters', explanation: 'The parameter count is identical - the same two normalisation steps, just moved to the other side of the addition.' },
        {
          text: 'Training stability: the added x stays untouched, so the multiply-by-1 route down the stack survives at any depth',
          explanation: 'Correct. Post-norm rescales the stream at every block, so that route is lost and deep stacks diverge unless the learning rate is ramped up slowly.',
        },
        { text: 'It gives better final quality at the same depth', explanation: 'Honestly, no. Post-norm often reports slightly better quality when it converges. Pre-norm wins because it converges at all.' },
      ],
      correct: 1,
    },
    {
      question: 'What does the FFN see when it processes token 7?',
      options: [
        {
          text: 'Only token 7\'s own vector',
          explanation: 'Correct. The FFN is position-wise: identical weights applied independently to each token. Every cross-token movement already happened in attention.',
        },
        { text: 'Tokens 1 through 7, like causal attention', explanation: 'That is the attention sublayer. The FFN has no mechanism for looking at another position.' },
        { text: 'The whole sequence in both directions', explanation: 'No sublayer other than attention mixes positions at all.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Draw a transformer block and talk me through it.',
      answer:
        'Draw a vertical line and call it the residual stream: one vector of d_model numbers per token, running from the embedding to the top. Then two sublayers hang off it. First: take a layer-normalised copy of the stream, feed it to multi-head self-attention, add the result back onto the stream. Second: take another layer-normalised copy, feed it to a position-wise feed-forward network - d up to 4d, squash, back down to d - and add that back. Two rules said out loud: every sublayer reads and adds, never replaces; and the normalisation goes inside the branch, not on the stream. Shape in equals shape out, so you stack these, each with its own weights. Around the stack: token and position embeddings at the bottom, one final normalisation and a projection to vocabulary scores at the top.',
      isCaseBased: false,
    },
    {
      question: 'Where do a transformer\'s parameters actually live?',
      answer:
        'Two thirds are in the feed-forward networks. Per block at expansion 4: attention is four d-by-d matrices - queries, keys, values, output mix - so 4d². The FFN is d-by-4d up plus 4d-by-d down, so 8d². Block total 12d², FFN share 8/12. Normalisation vectors and additive terms are a fraction of a percent. Whole stack: about 12·L·d² excluding the embedding table, which is vocabulary size times d. Worth noting that head count never appears - heads partition d, they do not add weights. The ratio has practical consequences: quantisation and memory pressure are mostly FFN pressure, and mixture-of-experts grows models by replicating the FFN specifically, because that is where the capacity is.',
      isCaseBased: false,
    },
    {
      question: 'Why does the residual connection matter here, and what breaks without it?',
      answer:
        'It is the same idea as ResNet in vision, solving the same problem. Passing the learning signal back through a layer multiplies it by that layer\'s sensitivity J; over L layers that is J to the power L, which vanishes or explodes. With x + F(x) the multiplier is 1 + J, so there is a route down the whole stack that neither shrinks nor grows the signal - concretely, 0.1 to the twentieth is 1e-20 while 1.1 to the twentieth is 6.7. Second reason specific to transformers: attention\'s output is a weighted average of other tokens, and averaging a dozen times in a row blurs every position toward the same thing. The residual means attention only adds a correction on top of the token itself, so the token keeps its identity. Third: a block with nothing useful to say can output near zero and cost nothing, so extra depth never actively hurts.',
      isCaseBased: false,
    },
    {
      question: 'Why 4x for the FFN expansion? Justify it or admit you cannot.',
      answer:
        'Admit it and then give the real reasons - that combination is the honest answer. There is no theorem. It is the original paper\'s choice, 512 up to 2048, that stuck because it worked and nothing decisively better was found. The defensible arguments: the squash in the middle only buys you something if the middle is wide enough to represent many separate patterns; 4x sits at a good quality-per-unit-of-compute point empirically; and it keeps tensor shapes convenient on a GPU. Evidence that 4 is not sacred: gated FFN variants use three matrices instead of two and cut the middle to about 8/3·d specifically so the parameter count stays at 8d² per block. The invariant people preserve across variants is that 8d² budget, not the number 4.',
      isCaseBased: false,
    },
    {
      question: 'Explain the difference between what attention does and what the FFN does.',
      answer:
        'Attention is the only part that moves information between positions: token 5 pulls in weighted amounts of tokens 1 to 5. It gathers, it does not think. The FFN is applied to each token independently with identical weights - it cannot see another position at all - so it processes whatever attention just gathered into that token. The usual summary is that attention decides where to look and the FFN decides what to do with what it found. Both write their result back into the same residual stream, which is why later blocks can read what earlier ones wrote. One useful but unsettled picture of the FFN: rows of the first matrix act as patterns to look for and the matching rows of the second matrix are what gets written back when a pattern fires. There is evidence for it from work that edits specific facts by editing specific rows, but real units fire on many unrelated things, so state it as a hypothesis.',
      isCaseBased: false,
    },
    {
      question: 'Case: you build a 40-block transformer copying the original 2017 paper\'s block exactly. The loss diverges in the first few hundred steps at every learning rate you try. Diagnose it.',
      answer:
        'First suspicion: you copied post-norm, x = LayerNorm(x + F(x)). That puts the normalisation on the stream itself, so the clean multiply-by-1 route down the stack is destroyed - at 40 blocks the signal scale drifts far enough at initialisation that the early steps blow up. Checks in order. One: log the size of the learning signal per block at step zero; a steady ramp or collapse with depth confirms it. Two: switch to pre-norm, x = x + F(LayerNorm(x)), and add one final normalisation after the last block. That is the actual fix and usually the whole answer. Three: if post-norm has to stay, ramp the learning rate up over a few thousand steps and scale down what each branch writes at initialisation by one over the square root of twice the depth, which stops the stream magnitude growing with depth. Four: while you are in there, rule out the ordinary suspects - numerical overflow in half precision, no gradient clipping, and a learning rate too high for the batch size. The ranking matters: architecture first, the ramp as belt and braces, never as the cure.',
      isCaseBased: true,
    },
    {
      question: 'Case: a teammate wants to delete the residual connections to "simplify the architecture and save memory". Talk them out of it with specifics.',
      answer:
        'Correct the premise first: a residual is an elementwise addition. It has zero parameters and essentially zero compute, and it does not save memory in any meaningful way. Then the three things you lose. One, the learning signal: with x + F(x) the per-block multiplier is 1 + J; without it, it is J, and over 20 blocks with J around 0.1 that is 1e-20 arriving at the bottom - the early blocks are frozen. This is exactly the pre-2015 wall that ResNet removed. Two, blurring: attention outputs a weighted average of other tokens, so with no original preserved every position drifts toward the sequence mean after a few blocks. Three, the free identity: with a residual, a block with nothing useful to contribute outputs near zero and costs nothing, so depth never actively hurts; without one, every block must produce a usable representation or the signal is destroyed. Close with the falsifiable version: run both on a 6-block toy model for 500 steps and compare the loss curves. It is a half-hour experiment and the result is not subtle.',
      isCaseBased: true,
    },
    {
      question: 'Case: you must fit a model with d = 4096 and 32 blocks onto a smaller GPU with minimal quality loss. Where do you cut, and why?',
      answer:
        'Start from where the weights are: 12·L·d² is 12·32·4096² ≈ 6.4 billion, and two thirds of that is FFN. So any cut that does not touch the FFN is nibbling at a third of the problem. Ranked. One: reduce the precision of the weights. This is the highest value per unit of risk, it applies to the FFN matrices where the bytes are, and it needs no retraining. Two: shrink the memory that grows with sequence length rather than the weights - the cached keys and values per token. Sharing key and value projections across groups of heads cuts that several-fold and barely touches quality. Three: if this is training rather than serving, freeze the model and train small low-rank additions instead of all the weights. Four, last: structural cuts like dropping blocks, because those need retraining to recover. What not to do: reduce d. Weights scale as d², every downstream shape changes, and you have not compressed a model - you have designed a different one that must be trained from scratch.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'The four parts of a transformer block', back: 'Attention (mix information between positions), a feed-forward network (process each position alone), residual connections (add each result back rather than replace), layer normalisation (rescale the input to each sublayer). Shape in = shape out, so you stack them.' },
    { front: 'Residual connection', back: 'x = x + F(x) instead of x = F(x). No parameters. Keeps the original value alive, and makes the learning signal per layer multiply by 1 + J instead of J. Same idea as ResNet in vision.' },
    { front: 'Residual stream', back: 'The d_model-wide vector per token running from embedding to output. Every sublayer reads a normalised copy, computes a correction, and adds it back. Nothing overwrites, so the top value is the embedding plus every correction.' },
    { front: 'Layer normalisation', back: 'Subtract the average of one token\'s d_model numbers, divide by their typical spread, then scale by a learned vector. Across one token only - never across the batch or the sequence.' },
    { front: 'Pre-norm vs post-norm', back: 'Post: x = LN(x + F(x)), normalisation sits on the stream, needs a slow learning-rate ramp, fragile past ~20 blocks. Pre: x = x + F(LN(x)), the stream stays untouched, trains at 100 blocks. Everything modern is pre-norm, for stability not quality.' },
    { front: 'The feed-forward network', back: 'Two matrices with a squash between them: d up to 4d, negatives to zero, back down to d. Same weights at every position, no cross-token mixing. The expansion factor is the 4.' },
    { front: 'Parameter arithmetic', back: 'Per block: attention 4d² (Q, K, V, output mix), FFN 8d² (up + down at expansion 4), total 12d². The FFN is two thirds, at any d. Whole stack ≈ 12·L·d², plus vocabulary·d for the embedding table.' },
    { front: 'Encoder-only / decoder-only / encoder-decoder', back: 'Encoder-only: every token sees every other, for understanding an input you already have. Decoder-only: token t sees only up to t, for generating. Encoder-decoder: one stack reads, the other generates while attending to the first, for turning one sequence into a different one.' },
  ],
  mindmapMarkdown: `- The Transformer Block
  - The four parts
    - attention: mix information between positions
    - FFN: process each position alone
    - residual: add back, never replace
    - layer norm: rescale the input to each sublayer
    - shape in = shape out
  - Block, stack, depth
    - block = one copy of the four parts
    - stack = blocks end to end, own weights each
    - depth = how many blocks (12 to 96)
  - Residual connection
    - x = x + F(x), zero parameters
    - same idea as ResNet in vision
    - signal multiplier 1 + J, not J
    - 0.1^20 = 1e-20 vs 1.1^20 = 6.7
    - stops attention averaging into a blur
    - free identity, so depth never hurts
  - Layer normalisation
    - centre and rescale one token
    - across d_model, never across batch
    - plus a learned scale and shift
  - Pre-norm vs post-norm
    - post: LN(x + F(x)), needs a slow LR ramp
    - pre: x + F(LN(x)), stream untouched
    - modern = pre-norm, for stability
    - pre-norm needs one final LN
  - The FFN
    - d -> 4d -> squash -> d
    - expansion factor 4, empirical not proven
    - position-wise: no cross-token mixing
    - rows of W1 = patterns, rows of W2 = what gets written
  - Where the parameters are
    - attention 4d^2
    - FFN 8d^2
    - block 12d^2, FFN is two thirds
    - stack about 12*L*d^2
  - Family map
    - encoder-only: sees both directions, understanding
    - decoder-only: sees only the past, generating
    - encoder-decoder: read one sequence, write another
  - Classic mistake
    - dropping the add: token forgets itself
    - loss plateaus early, bottom blocks frozen
    - norm in the wrong place: trains, but needs a ramp`,
}

export default m
