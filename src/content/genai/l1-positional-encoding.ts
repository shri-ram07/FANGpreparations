import type { Module } from '../types'

const m: Module = {
  id: 'genai-l1-positional-encoding',
  subjectId: 'genai',
  level: 1,
  title: 'Positional Encoding: Teaching Attention About Order',
  whyItMatters:
    'Attention, exactly as you learned it, cannot tell "dog bites man" from "man bites dog". That is not an exaggeration — you will run the code in this module and see the same numbers come out of both. Word order is most of what a sentence means, so every transformer has to hand the position information to attention separately. This module shows the hole, then the two ways it gets filled.',
  assumes: [
    'You have read *Self-Attention from zero* — you know what a query, a key and a value vector are, and that attention scores two tokens with a dot product and then a softmax.',
    'You can read a Python function, a for loop and a list.',
    'You know sine and cosine as two wavy curves that swing between -1 and +1 as their input grows. No trigonometry beyond that is needed.',
  ],
  estMinutes: 44,
  sections: [
    {
      type: 'intuition',
      title: 'Start here: the two sentences attention cannot tell apart',
      md: `Take three words and give each one a short vector — the **embedding**, the list of numbers that stands for the word's meaning. Two numbers each is enough to see the point.

- dog = [1.0, 0.0]
- bites = [0.0, 1.0]
- man = [0.9, 0.2]

Now build two sentences out of exactly these three vectors:

- "dog bites man" — the list [dog, bites, man]
- "man bites dog" — the list [man, bites, dog]

Ask attention what the word *dog* should become in each sentence. In the first, dog is the one doing the biting. In the second, dog is the one being bitten. Completely different meaning. Attention returns the **same vector** for both.

That is not a bug in my example. It is a property of the formula, and the next two code blocks show it happening.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 1 of 2: the two helpers attention needs',
      code: `import math

def softmax(scores):
    biggest = max(scores)
    exps = [math.exp(s - biggest) for s in scores]
    total = sum(exps)
    return [e / total for e in exps]

def dot(a, b):
    return sum(x * y for x, y in zip(a, b))

print('softmax([1.0, 1.0, 2.0]) =', [round(w, 4) for w in softmax([1.0, 1.0, 2.0])])
print('dot([1.0, 0.0], [0.9, 0.2]) =', dot([1.0, 0.0], [0.9, 0.2]))

# softmax([1.0, 1.0, 2.0]) = [0.2119, 0.2119, 0.5761]
# dot([1.0, 0.0], [0.9, 0.2]) = 0.9`,
      annotations: {
        1: 'math is Python\'s built-in maths library. We need math.exp here and math.sin / math.cos later. No other library is used anywhere in this module.',
        3: 'softmax turns a list of raw scores into a list of positive weights that add up to 1. Those weights are how much each token gets listened to.',
        4: 'Find the largest score. Subtracting it before exp keeps the numbers small so math.exp never overflows. The final weights are unchanged by this shift.',
        5: 'Raise e to the power of each shifted score. This is a list comprehension: it builds a new list by running the expression once per item of scores.',
        6: 'Add up all the exponentials. This is the number we divide by so the weights sum to exactly 1.',
        7: 'Divide each exponential by the total. Output: a list of weights, all positive, summing to 1.',
        9: 'dot is the dot product: multiply the two vectors position by position, then add up the products. It is attention\'s similarity score — bigger means the two vectors point more in the same direction.',
        10: 'zip(a, b) walks both lists side by side, handing out pairs (a[0], b[0]), then (a[1], b[1]), and so on. x, y = the two members of the pair. sum() adds the products.',
        12: 'A quick sanity print. round(w, 4) trims each weight to 4 decimal places so the output is readable. Note the two equal scores got equal weights.',
        13: 'And a dot product by hand: 1.0*0.9 + 0.0*0.2 = 0.9. Matches.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 2 of 2: shuffle the sentence, get the identical answer',
      code: `def attend(query, tokens):
    scores = [dot(query, t) for t in tokens]
    weights = softmax(scores)
    mixed = []
    for d in range(len(query)):
        mixed.append(sum(w * t[d] for w, t in zip(weights, tokens)))
    return mixed

dog = [1.0, 0.0]
bites = [0.0, 1.0]
man = [0.9, 0.2]
sentence = [dog, bites, man]
shuffled = [man, bites, dog]
print('dog bites man ->', [round(v, 4) for v in attend(dog, sentence)])
print('man bites dog ->', [round(v, 4) for v in attend(dog, shuffled)])

# dog bites man -> [0.7983, 0.2415]
# man bites dog -> [0.7983, 0.2415]`,
      annotations: {
        1: 'attend is one attention head, stripped to its bones. query is the vector asking the question; tokens is the list of vectors it may look at. Here query, key and value are all just the token vector itself, so the code stays readable.',
        2: 'Score the query against every token with a dot product. One number per token, in the order the tokens were given.',
        3: 'Turn those raw scores into attention weights that sum to 1.',
        4: 'Start an empty list to hold the answer vector, which we fill one dimension at a time.',
        5: 'Loop over the dimensions of the vector. len(query) is 2 here, so d takes the values 0 and 1.',
        6: 'For dimension d, take a weighted average across all tokens: every token contributes its own d-th number times its weight. This is the "weighted sum of values" step of attention.',
        7: 'Hand back the mixed vector — attention\'s answer for this query.',
        9: 'The three word vectors from the section above.',
        10: 'bites points along the second dimension only.',
        11: 'man points almost the same way as dog, so dog will score it highly.',
        12: 'Sentence 1, in reading order.',
        13: 'Sentence 2 is the SAME three vectors, in a different order. Nothing else changed.',
        14: 'Ask what dog becomes in sentence 1.',
        15: 'Ask what dog becomes in sentence 2. The two printed lines are identical to every decimal place.',
      },
    },
    {
      type: 'note',
      md: `Why it had to come out that way: look at what \`attend\` actually reads. It reads the *contents* of the vectors — nothing else. It never reads the index of a token in the list. Shuffling the list shuffles the scores and the weights in exactly the same way, and a weighted sum does not care what order you add things in. So the answer cannot change.

The name for this is **permutation equivariance**: permute the inputs and the outputs come back permuted the same way, never changed. Stacking more attention layers does not help — each layer has the same blindness, and blind on top of blind is still blind.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'The same three vectors, two orders, one answer',
        notice: 'Compare frame 1 with frame 3. The output for dog is the identical vector, even though the sentence now means the opposite thing.',
        leftLabel: 'tokens fed in',
        rightLabel: 'what attention returns for dog',
        frames: [
          {
            note: 'Sentence 1, "dog bites man". Attention scores dog against all three, softmaxes, and mixes.',
            stack: [
              { name: 'slot 1: dog', to: 'out' },
              { name: 'slot 2: bites' },
              { name: 'slot 3: man' },
            ],
            heap: [{ id: 'out', value: '[0.7983, 0.2415]', label: 'answer for dog' }],
          },
          {
            note: 'Ask what produced it: dot products between contents, a softmax, a weighted sum. Not one of those steps reads the slot number.',
            stack: [
              { name: 'slot 1: dog', to: 'out' },
              { name: 'slot 2: bites' },
              { name: 'slot 3: man' },
            ],
            heap: [{ id: 'out', value: '[0.7983, 0.2415]', label: 'answer for dog' }],
          },
          {
            note: 'Sentence 2, "man bites dog". Same three vectors, reordered. dog is now the victim, and the answer is byte-for-byte the same.',
            stack: [
              { name: 'slot 1: man' },
              { name: 'slot 2: bites' },
              { name: 'slot 3: dog', to: 'out' },
            ],
            heap: [{ id: 'out', value: '[0.7983, 0.2415]', label: 'answer for dog', danger: true }],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'The vocabulary, defined once, in plain words',
      md: `Four terms, and then we can talk properly.

- **Position** — a token's slot number in the input. The first token is at position 0, the next at position 1, and so on. Nothing deeper than that.
- **Positional encoding** — a vector, one per position, that carries "I am the token at slot 5" and nothing about which word it is. The usual move is to *add* it to the word embedding before the first attention layer, so every vector entering attention is "what the word means" plus "where the word sits".
- **Absolute position** — the encoding says which slot you are in: 0, 1, 2, 3. **Relative position** — it says how far apart two tokens are: this one is 3 slots before that one. Language mostly cares about the relative kind. "The word right before the verb" is a real rule; "the word at slot 412" almost never is.
- **Fixed vs learned** — a **fixed** encoding is computed from a formula, the same before and after training, with zero parameters. A **learned** encoding is a lookup table of vectors, one row per position, trained by gradient descent like any other weight.

Learned tables have one hard limit worth stating now: a table with 1024 rows has no row 1025. Feed the model a longer input and there is literally no vector to fetch. A formula has no such wall, which is why the fixed schemes are still interesting.`,
    },
    {
      type: 'intuition',
      title: 'Before any formula: what must a position vector actually do?',
      md: `Do not reach for sine and cosine yet. First decide what job the vector has to do, and the formula will look inevitable afterwards.

1. **Every position needs its own distinct vector.** If slot 3 and slot 7 got the same numbers, the model could never tell those slots apart.
2. **Nearby positions should get similar vectors.** Slot 3 and slot 4 are neighbours; their encodings should look alike, and slot 3 and slot 300 should not. This is what lets the model generalise: a rule learned about "the token just before" works at slot 4 and at slot 400.
3. **It must keep working past the longest input seen in training.** Requirement 1 alone is satisfied by a lookup table, but a table stops at its last row. A formula keeps producing vectors forever.
4. **The numbers must stay small.** The encoding is *added* to the word embedding, whose numbers are around -1 to 1. A position vector with entries in the hundreds would drown the word.

Now try the obvious idea and watch it fail. "Just put the position number in": slot 0 gets 0, slot 500 gets 500. Requirements 1 and 3 pass; requirement 4 fails hard — 500 added to an embedding erases the word.

Next obvious idea: divide by the length, so positions run 0 to 1. Requirement 4 passes, but now the same slot gets a different number depending on how long the sentence is, and slot 3 in a 10-token input has nothing in common with slot 3 in a 1000-token one.

What survives all four is a value that **wiggles**: bounded between -1 and 1 forever, changing smoothly so neighbours stay close, and never running out of inputs. That is exactly what sine and cosine are.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The numbers first: what one position vector looks like',
      code: `d_model = 64

def pe(pos, i):
    slot = i // 2
    wavelength = 10000 ** (2 * slot / d_model)
    angle = pos / wavelength
    if i % 2 == 0:
        return math.sin(angle)
    return math.cos(angle)

for pos in range(5):
    row = [round(pe(pos, i), 3) for i in range(6)]
    print('pos', pos, 'dims 0-5:', row)

# pos 0 dims 0-5: [0.0, 1.0, 0.0, 1.0, 0.0, 1.0]
# pos 1 dims 0-5: [0.841, 0.54, 0.682, 0.732, 0.533, 0.846]
# pos 2 dims 0-5: [0.909, -0.416, 0.997, 0.071, 0.902, 0.431]
# pos 3 dims 0-5: [0.141, -0.99, 0.778, -0.628, 0.993, -0.116]
# pos 4 dims 0-5: [-0.757, -0.654, 0.142, -0.99, 0.778, -0.628]`,
      annotations: {
        1: 'How long each vector is. Real models use several hundred; 64 keeps the numbers small enough to look at.',
        3: 'pe returns ONE number: the value at dimension i of the vector for position pos. Call it 64 times to build a whole position vector.',
        4: 'Integer division by 2. Dimensions are handled in pairs: dims 0 and 1 share slot 0, dims 2 and 3 share slot 1, and so on. // throws away the remainder, so 0//2 and 1//2 are both 0.',
        5: 'The wavelength of this pair: how many positions it takes for the wave to go round once. ** is Python\'s power operator. slot 0 gives 10000**0 = 1 (a fast wave), and the last slot gives 10000 (a very slow one).',
        6: 'Divide the position by the wavelength to get the angle to feed the wave. A big wavelength means the angle creeps up slowly as pos grows.',
        7: 'The % operator gives the remainder after dividing by 2, so this asks "is i even?". Even dimensions get the sine of the angle.',
        8: 'sin of the angle. Always between -1 and 1, which is requirement 4 satisfied by construction.',
        9: 'Odd dimensions get the cosine of the SAME angle. Storing sin and cos of one angle side by side is what makes the rotation trick further down possible.',
        11: 'Build the vectors for the first five positions.',
        12: 'Compute the first 6 of the 64 dimensions and round them for reading.',
        13: 'Print one position per line. Read the output down a column: dim 0 swings fast (0.0, 0.841, 0.909, 0.141, -0.757 — it has already turned around), while a later dim would barely move at all.',
      },
    },
    {
      type: 'math',
      intro: 'Only now, with the numbers in front of you, is the formula worth reading. It says exactly what the code above says: pair up the dimensions, give pair number s a wavelength that grows as you go, and store sine in the even slot and cosine in the odd one.',
      latex: [
        'PE(pos,\\, 2s) = \\sin\\!\\left(\\frac{pos}{10000^{\\,2s/d}}\\right)',
        'PE(pos,\\, 2s+1) = \\cos\\!\\left(\\frac{pos}{10000^{\\,2s/d}}\\right)',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Requirement 2, checked: near positions really are more similar',
      code: `rows = [[pe(p, i) for i in range(d_model)] for p in range(31)]
for p in [0, 1, 2, 4, 8, 16, 30]:
    print('similarity of pos 0 and pos', p, '=', round(dot(rows[0], rows[p]), 2))

# similarity of pos 0 and pos 0 = 32.0
# similarity of pos 0 and pos 1 = 30.92
# similarity of pos 0 and pos 2 = 28.3
# similarity of pos 0 and pos 4 = 23.93
# similarity of pos 0 and pos 8 = 22.41
# similarity of pos 0 and pos 16 = 19.37
# similarity of pos 0 and pos 30 = 17.07`,
      annotations: {
        1: 'Build all 31 position vectors. The outer part runs once per position p; the inner part builds that position\'s 64 numbers. A list of lists, one row per position.',
        2: 'Pick a handful of positions to compare position 0 against, so the output stays short.',
        3: 'Measure similarity with the same dot product attention uses. The output falls as the gap grows — 32.0 against itself, 30.9 one slot away, 17.1 thirty slots away. That is requirement 2, and nobody had to train it.',
      },
    },
    {
      type: 'note',
      md: `Read the decay honestly: it is a general downward trend, not a perfect slide. Because each pair is a wave, a far-apart pair can occasionally line up again and nudge the number back up. With 64 dimensions the wobble is small because the many different wavelengths rarely agree; with only 8 dimensions you can see it clearly. The property is "far apart is usually less similar", not "similarity is a strictly decreasing function of distance".`,
    },
    {
      type: 'intuition',
      title: 'RoPE: instead of adding position, rotate by it',
      md: `Adding a position vector to the embedding is a blunt instrument. It mixes "where" into the same numbers as "what", and the model has to untangle them. **RoPE** — rotary position embedding — does something different, and it is what modern transformers use.

The idea, with no formula:

- Take the query and key vectors and read them two numbers at a time, as points on a flat sheet of paper.
- **Rotate** each of those little 2-number points around the origin, like turning a clock hand. The angle you turn by is the token's position times a fixed step. Position 3 turns three steps; position 9 turns nine.
- Rotation does not change how long a vector is, only which way it points. So no information about the word is destroyed — it is just aimed differently.
- Now score two tokens with a dot product, as attention always does. The dot product between two vectors depends on the **angle between them**. Token at slot m was turned m steps; token at slot n was turned n steps; the angle between them is therefore (n − m) steps.

That last line is the whole payoff. The score comes out depending on the **distance** between the two tokens, not on where the pair sits in the document. A pair 2 apart scores the same whether it sits at the start of the input or ten thousand tokens in. Relative position is not trained in — it falls out of the geometry.

Two practical details: RoPE is applied to the query and key vectors only, never to the value vectors, because only queries and keys meet in a dot product. And it is re-applied inside every layer rather than added once at the bottom.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'RoPE in nine lines: the score depends only on the gap',
      code: `def rotate(vec, pos, theta):
    angle = pos * theta
    x, y = vec
    return [x * math.cos(angle) - y * math.sin(angle),
            x * math.sin(angle) + y * math.cos(angle)]

q = [1.0, 0.0]
k = [0.7, 0.7]
theta = 0.5
for pair in [(1, 3), (4, 6), (2, 9), (5, 12)]:
    mm, nn = pair
    print('m =', mm, 'n =', nn, 'gap =', nn - mm,
          'score =', round(dot(rotate(q, mm, theta), rotate(k, nn, theta)), 4))

# m = 1 n = 3 gap = 2 score = -0.2108
# m = 4 n = 6 gap = 2 score = -0.2108
# m = 2 n = 9 gap = 7 score = -0.41
# m = 5 n = 12 gap = 7 score = -0.41`,
      annotations: {
        1: 'Turn one 2-number pair by an angle set by its position. theta is the fixed step size per position, the same for every token.',
        2: 'Total angle to turn by: position times step. Slot 4 turns twice as far as slot 2.',
        3: 'Tuple unpacking: pull the two numbers out of the list into x and y in one line, instead of vec[0] and vec[1].',
        4: 'The standard formula for rotating the point (x, y) by an angle. This line is the new first number.',
        5: 'And this line is the new second number. The pair still has the same length as before — check it if you like: x*x + y*y is unchanged.',
        7: 'A query vector pointing straight along the first axis.',
        8: 'A key vector pointing diagonally.',
        9: 'The step size. Any fixed value works; 0.5 radians makes the effect easy to see.',
        10: 'Four (m, n) pairs to test: two pairs that are 2 apart and two that are 7 apart, sitting at very different places in the document.',
        11: 'Unpack the pair into m and n — m is the query\'s position, n is the key\'s.',
        12: 'Rotate the query by its position, rotate the key by its position, and dot them, exactly as attention would.',
        13: 'Read the output: the two gap-2 rows print the identical score, and so do the two gap-7 rows. Absolute position vanished; only the distance survived.',
      },
    },
    {
      type: 'note',
      md: `One more thing that output shows: gap 2 scores -0.2108 and gap 7 scores -0.41. The score changes with distance, so RoPE also hands the model a mild sense of "how far", not just "which side". Over long distances the effect averages towards zero, which acts as a gentle preference for nearby tokens. That is usually helpful for text and is worth knowing when you wonder why a model attends weakly to something very far back.`,
    },
    {
      type: 'intuition',
      title: 'Making a trained model handle longer inputs',
      md: `Say a model was trained on inputs up to 4,000 tokens and you now want it to read 32,000. With RoPE nothing crashes — the formula happily produces an angle for position 30,000. But the model has never *seen* angles that large during training, so the scores it computes there are unfamiliar, and quality falls apart.

The fix everyone starts with is to squeeze the positions instead of extending them. Multiply every position by 4000/32000 before rotating, so position 32,000 turns by the angle position 4,000 used to turn by. Every angle now lands inside the range the model was trained on. The cost is that neighbouring tokens are squeezed together too: positions 5 and 6 now differ by an eighth of the angle they used to, so fine-grained "which word came just before" gets blurrier. A short fine-tune afterwards recovers most of that.

The better versions of this idea squeeze unevenly: leave the fast-wiggling pairs, which carry the local word-to-word detail, almost alone, and squeeze the slow ones, which carry the coarse long-range sense. Short-range behaviour survives while the long range is stretched.

Two honest points to carry away. First, extension always costs something — an extended model is not as good at 32k as a model actually trained at 32k. Second, a long context window is expensive at run time for a completely separate reason: attention compares every token with every other, so doubling the input roughly quadruples the attention work. The advertised window is an upper limit, not a promise of quality across it.`,
    },
    {
      type: 'intuition',
      title: 'Worked case, by hand: two tokens, one rotation, no computer',
      md: `Query vector q = [1, 0] at position 1. Key vector k = [0, 1] at position 3. Step size theta = 0.5 radians per position. Compute the attention score with RoPE, on paper.

1. The query turns by 1 x 0.5 = 0.5 radians. Rotating [1, 0] by 0.5 gives [cos 0.5, sin 0.5] = [0.8776, 0.4794].
2. The key turns by 3 x 0.5 = 1.5 radians. Rotating [0, 1] by 1.5 gives [-sin 1.5, cos 1.5] = [-0.9975, 0.0707].
3. Dot them: 0.8776 x (-0.9975) + 0.4794 x 0.0707 = -0.8754 + 0.0339 = **-0.8415**.

Now the shortcut, and the reason the whole scheme exists. The angle between the rotated pair is (3 - 1) x 0.5 = 1 radian, plus whatever angle separated q and k to begin with — which was 90 degrees, or 1.5708 radians. So the total angle between them is 2.5708 radians, and since both vectors still have length 1, the dot product is just cos(2.5708) = **-0.8415**. Same number, and the only thing that entered it was the gap 3 - 1 = 2.

Check it moves the way it should: put the same pair at positions 4 and 6. The gap is still 2, the angle is still 2.5708, and the score is still -0.8415. Put them at 1 and 5 instead. The gap is now 4, the angle is 1.5708 + 2 = 3.5708, and the score is cos(3.5708) = -0.9037. Farther apart, different score, and nothing about where in the document it happened.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: building the model and never adding position at all',
      md: `This is the most common way to get a broken transformer, and it is nasty because nothing errors out. You write the embedding layer, the attention block, the feed-forward, the training loop. It all runs. The loss even goes down, because the model learns which words tend to occur together. But it never gets good, and generated text comes out as word soup with the right vocabulary and no grammar.

The reason is the first two code blocks of this module: with no position information, the model is looking at a **bag of words**, not a sentence. Every ordering of the same words is one identical input to it. It cannot learn that the subject comes before the verb because it cannot see that anything comes before anything.

The diagnosis is quick: shuffle the tokens of one input and compare the logits. If the sorted set of outputs is unchanged, position is missing. The fix is the block below.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The fix, and proof that it works',
      code: `def with_position(vec, pos):
    return [vec[0] + math.sin(pos), vec[1] + math.cos(pos)]

sentence = [with_position(dog, 0), with_position(bites, 1), with_position(man, 2)]
shuffled = [with_position(man, 0), with_position(bites, 1), with_position(dog, 2)]
print('dog first ->', [round(v, 4) for v in attend(sentence[0], sentence)])
print('dog last  ->', [round(v, 4) for v in attend(shuffled[2], shuffled)])

# dog first -> [1.0979, 0.9942]
# dog last  -> [1.7886, -0.2104]`,
      annotations: {
        1: 'Add a position signal to a word vector. Our toy vectors are only 2 long, so this is the smallest possible sinusoidal encoding: sine in dim 0, cosine in dim 1, exactly the pattern from the pe function above.',
        2: 'Return the sum, element by element. The word vector is unchanged in shape — position is added into it, not glued on the end.',
        4: 'Sentence 1: dog sits at slot 0, bites at 1, man at 2.',
        5: 'Sentence 2: the same three words, but now man is at slot 0 and dog is at slot 2. Because the position is baked in, these are genuinely different vectors.',
        6: 'Ask what dog becomes when it is the first word. sentence[0] is dog-plus-position-0, which is both the query and a token of the sentence.',
        7: 'Ask what dog becomes when it is the last word. The two printed vectors are now clearly different — attention can finally tell the two sentences apart.',
      },
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work each one before reading its solution in the next block. Pen and paper is enough for all five.

1. A model uses a **learned** position table with 1024 rows. You feed it 1500 tokens. What happens, and why is this different from what happens to a sinusoidal model?
2. Using \`pe\` with d_model = 64: which is larger, dimension 0 or dimension 62, at position 1? Do not compute — reason from the wavelengths.
3. Someone suggests **concatenating** a 64-number position vector onto a 512-number embedding, making 576, instead of adding it. Give one real advantage and one real cost.
4. Under RoPE with theta = 0.5, the pair at positions (2, 5) scores 0.31. What does the pair at positions (100, 103) score? Justify without computing.
5. You extend a 4k model to 16k by dividing every position by 4 before rotating. Long-document retrieval improves, but a benchmark of short questions gets slightly worse. Explain.`,
    },
    {
      type: 'intuition',
      title: 'Practice solutions',
      md: `1. The learned model crashes or silently truncates: there is no row 1025 to look up, so the lookup is out of range. The sinusoidal model returns a perfectly valid vector for position 1500, because a formula never runs out of inputs. But valid is not the same as good — the model was never trained on angles that large, so quality still drops. One fails loudly, the other fails quietly.

2. Dimension 0 is much larger. Its wavelength is 10000^0 = 1, so at position 1 its angle is 1 radian and sin(1) = 0.841. Dimension 62 sits in the last pair, wavelength close to 10000, so its angle is about 0.0001 radians and its sine is about 0.0001 — practically zero. Fast pairs move immediately, slow pairs need hundreds of positions to budge.

3. Advantage: nothing is destroyed. With addition, the position numbers and the word numbers are summed into the same slots, and the model has to learn to separate them; with concatenation they live in their own dimensions and cannot interfere. Cost: the vector is now 576 wide instead of 512, so every weight matrix in every layer grows, and attention costs more — for the whole model, forever. Addition is chosen because the extra dimensions are not worth the price and, in practice, the model separates the two signals fine.

4. It scores 0.31 as well. The gap is 3 in both cases, and a RoPE score depends only on the gap. That is the entire design.

5. Squeezing by 4 puts every angle back inside the range seen in training, which is why the long documents now work. But it also squeezes the *small* gaps: positions 5 and 6 used to be 0.5 apart in angle and are now 0.125 apart. Adjacent tokens look almost identical in position, so fine word-order distinctions blur — and short questions are made almost entirely of fine word-order distinctions. A short fine-tune at the new scale recovers much of it; squeezing the slow pairs harder than the fast ones avoids most of it in the first place.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Three extras, none needed for anything above.

- **Why the base is 10000.** The wavelengths run from 1 up to the base. A larger base means the slowest pairs turn even more slowly, which spreads the encoding usefully over longer inputs; a smaller base packs everything into a short range. Long-context fine-tunes often just raise the base, which is a cheap way to buy range at the cost of a little short-range resolution.
- **A third family: bias the score directly.** Rather than encoding position into the vectors at all, subtract a penalty from every attention score that grows with the distance between the two tokens: a token 50 slots back is penalised 50 units times a per-head constant. Zero parameters, purely relative, and it holds up past the training length reasonably well. The cost is that a fixed "prefer nearby" preference is now hard-wired into the model whether the task wants it or not.
- **Why RoPE keeps the vector length.** Rotation is a length-preserving operation: turning a clock hand never lengthens it. This matters because the scale of the query and key vectors sets the scale of the attention scores, and attention is already carefully divided by the square root of the dimension to keep that scale sane. An operation that changed lengths would disturb that balance; rotation does not.`,
    },
  ],
  quiz: [
    {
      question:
        'You feed a bare attention layer (no positional information) the tokens [A, B, C], then feed it [C, B, A]. What is true of the outputs?',
      options: [
        { text: 'The outputs are completely different, because the sentence changed.', explanation: 'Nothing in the layer reads the slot number, so nothing can change because of the reordering.' },
        { text: 'The same three output vectors come back, just in the reordered slots.', explanation: 'Correct. This is permutation equivariance: permute the inputs, the outputs come back permuted the same way.' },
        { text: 'The outputs are averaged together into one vector.', explanation: 'Attention returns one output per token, not one for the sequence.' },
        { text: 'The layer raises an error about the ordering.', explanation: 'It cannot even notice the ordering, so there is nothing to complain about.' },
      ],
      correct: 1,
    },
    {
      question: 'Why does stacking more attention layers not fix the order-blindness?',
      options: [
        { text: 'It does fix it, given enough layers.', explanation: 'Each layer has the identical blindness, so more of them changes nothing.' },
        { text: 'Because the layers share weights.', explanation: 'They do not usually share weights, and it would not matter if they did.' },
        { text: 'Every layer is itself order-blind, and stacking order-blind layers gives an order-blind stack.', explanation: 'Correct. If layer 1 returns permuted outputs for permuted inputs, layer 2 receives permuted inputs and does the same again, all the way up.' },
        { text: 'Because the softmax destroys the ordering.', explanation: 'The softmax is not the culprit — the dot product scoring never read a position in the first place.' },
      ],
      correct: 2,
    },
    {
      question: 'Why is the position encoded with sines and cosines rather than just the position number itself?',
      options: [
        { text: 'Because sine is faster to compute than an integer.', explanation: 'It is slower, and speed was never the reason.' },
        { text: 'Because sine and cosine stay between -1 and 1 forever, so the signal never drowns the word embedding and never runs out of positions.', explanation: 'Correct. Raw position numbers grow without bound and would swamp the embedding they are added to.' },
        { text: 'Because sine values are unique for every position.', explanation: 'A single sine repeats. It is the many different wavelengths together that make each position vector distinct.' },
        { text: 'Because the model can only accept inputs between -1 and 1.', explanation: 'It accepts any real numbers. The concern is balance against the embedding, not a hard limit.' },
      ],
      correct: 1,
    },
    {
      question: 'A model uses a learned position table with 1024 rows and you feed it 1500 tokens. What happens?',
      options: [
        { text: 'The table wraps around and reuses row 1 for position 1025.', explanation: 'Nothing wraps by default, and if it did, two far-apart positions would look identical.' },
        { text: 'There is no row to fetch, so it fails outright or silently truncates the input.', explanation: 'Correct. A table has exactly as many positions as it has rows — that is the hard wall a formula does not have.' },
        { text: 'The model extrapolates smoothly to the new positions.', explanation: 'A lookup table has nothing to extrapolate from; each row was trained independently.' },
        { text: 'Quality drops a little but the model works.', explanation: 'That is roughly what happens to a formula-based model. A table cannot even produce an answer.' },
      ],
      correct: 1,
    },
    {
      question: 'In RoPE, why does the score between two tokens depend only on the gap between their positions?',
      options: [
        { text: 'Because the positions are subtracted before rotating.', explanation: 'Each token is rotated by its own position, with no subtraction anywhere in the code.' },
        { text: 'Because a dot product depends on the angle between two vectors, and rotating by m and by n leaves an angle difference of (n - m).', explanation: 'Correct. The shared part of the rotation cancels and only the difference survives.' },
        { text: 'Because the model is trained to make it so.', explanation: 'No training is involved. It is a property of rotation, true at initialisation.' },
        { text: 'Because RoPE is applied to the value vectors.', explanation: 'RoPE is applied to queries and keys only — the value vectors never meet in a dot product.' },
      ],
      correct: 1,
    },
    {
      question:
        'You squeeze all positions by dividing them by 4 so a 4k model reads 16k. What is the predictable cost?',
      options: [
        { text: 'The model can no longer read short inputs at all.', explanation: 'It still reads them; it just resolves neighbouring positions less sharply.' },
        { text: 'Adjacent positions now differ by a quarter of the angle they used to, so fine word-order distinctions blur.', explanation: 'Correct. Squeezing the long range squeezes the short range along with it, unless you squeeze unevenly.' },
        { text: 'Attention becomes cheaper because the angles are smaller.', explanation: 'The cost of attention depends on how many tokens there are, not on the size of the angles.' },
        { text: 'The vocabulary embeddings must be retrained.', explanation: 'Position scaling touches only the rotation angles, not the word embeddings.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Show that self-attention is order-blind. Whiteboard it.',
      answer:
        'Write out one attention output: score every token against the query with a dot product, softmax the scores, then take the weighted sum of the token vectors. Now point at each step and ask what it reads. The dot product reads two vectors\' contents. The softmax reads a list of numbers. The weighted sum adds terms up, and addition does not care about order. No step anywhere reads the index of a token. So if you permute the input list, the scores permute the same way, the weights permute the same way, and the weighted sum is unchanged. Same output, from a sentence that means the opposite thing. The name is permutation equivariance, and it is why every transformer must inject position separately.',
      isCaseBased: false,
    },
    {
      question: 'Explain sinusoidal positional encoding to someone who has not seen it.',
      answer:
        'Start from the requirements, not the formula. You need one vector per position, distinct across positions, similar for neighbours, still defined past the longest training input, and small enough that adding it does not swamp the word embedding. The raw position number fails the last one, and dividing by the sequence length makes the same slot mean different things in different inputs. Sines and cosines pass all four: bounded between -1 and 1 forever, smooth so neighbours stay close, defined for any input. Split the dimensions into pairs, give each pair a different wavelength running from 1 up to 10000, and store the sine of position-over-wavelength in the even dimension and the cosine in the odd one. Fast pairs distinguish nearby positions, slow pairs distinguish far ones.',
      isCaseBased: false,
    },
    {
      question: 'Why did the field move from learned position tables to RoPE?',
      answer:
        'Two concrete failures. First, a learned table has a fixed number of rows, so there is simply no vector for a position beyond its last row — you cannot serve a longer input at all without adding and training new rows. Second, a learned table encodes absolute position, but almost every rule in language is relative: "the word just before the verb" is a real pattern, "the word at slot 412" is not. A model with absolute encodings has to learn each relative rule separately at every offset. RoPE fixes both. It comes from a formula, so it never runs out of positions, and because it rotates queries and keys by their positions, the resulting score depends on the difference of the two positions. Relative position is built into the geometry instead of being learned.',
      isCaseBased: false,
    },
    {
      question: 'Why is RoPE applied to the query and key vectors but not to the values?',
      answer:
        'Because only queries and keys meet in a dot product, and the dot product is where the rotation earns its keep — rotating both by their positions makes the angle between them, and therefore the score, depend on the gap. The value vectors are never dotted with anything; they are averaged together using the attention weights. Rotating them would spin the content that gets mixed into the output by an amount that depends on absolute position, so the same word would contribute a different vector depending on where it sat. That is a corruption of the content, not a position signal. Position belongs in the scoring, content belongs in the mixing.',
      isCaseBased: false,
    },
    {
      question:
        'Case: your team trained a model at 4k context and product now wants 32k next quarter. Walk through the options and their costs.',
      answer:
        'First establish the scheme. If positions come from a learned table, there is no cheap path: you must add rows and train them, and the new rows start from noise. If it is rotary, the formula already produces angles for position 30,000 — the problem is that the model never saw angles that large, so scores in that range are unfamiliar and quality collapses. Option one is to squeeze: multiply every position by 4000/32000 so the largest angle lands where the model is comfortable. It works immediately with no training, but it squeezes neighbouring positions together too, so short-range word-order precision drops. Option two is to squeeze unevenly — leave the fast-wiggling pairs, which carry local detail, nearly alone and squeeze the slow ones that carry long-range structure. Better short-context retention for the same long-context gain. Option three is a short fine-tune on long documents after scaling, which recovers most of what was lost and is what I would budget for. Then I would set expectations on two things: an extended model is worse at 32k than one trained at 32k, and serving 32k costs roughly sixteen times the attention work of 4k per request, plus a proportionally larger cache. The window is a limit, not a quality guarantee.',
      isCaseBased: true,
    },
    {
      question:
        'Case: your retrieval system stuffs 30 documents into a long prompt. The model uses the first and last documents well but ignores the ones in the middle. Diagnose it.',
      answer:
        'This is a known pattern and it is not primarily a retrieval bug. Several things push the same way. The training data was mostly short, so the model has seen far fewer examples of attending to something 20,000 tokens back than 200 tokens back — the middle of a long prompt is the least-practised region. Rotary scores also decay mildly with distance, which is a gentle recency preference. And if the context was extended by squeezing positions, middle-distance resolution is exactly what the squeeze blurred. Practically, I would stop trying to fix it inside the model. Retrieve fewer and better documents so the prompt is short enough to be in a well-trained range. Put the most relevant material at the start and the end, since those positions are used well. Ask for a per-document answer and then combine, so no single call has to attend across the whole prompt. And measure it properly: plant a known fact at each position and chart the recall, so you are working from a curve rather than an impression.',
      isCaseBased: true,
    },
    {
      question:
        'Case: a colleague fine-tuned with the rotary base raised from 10,000 to 500,000 for long context. Long-document evaluation improved, but the short chat benchmark dropped three points. What happened?',
      answer:
        'The base sets the range of wavelengths. Raising it from 10,000 to 500,000 makes every pair turn more slowly, especially the slow ones, which is exactly what you want for spreading a distinguishable signal across a very long input. But the fast pairs slow down too, and the fast pairs are what let the model tell position 5 from position 6. Short prompts are made almost entirely of those fine distinctions, so short-context quality pays for the long-context gain. What I would do: raise the base unevenly rather than uniformly, so the fastest pairs keep close to their original speed and only the slow pairs are stretched. Then include short conversational data in the long-context fine-tuning mix — a model fine-tuned only on long documents drifts away from short-prompt behaviour for reasons that have nothing to do with position. And I would confirm the drop is really positional by testing the same short prompts with the original base and the new weights before spending time on it.',
      isCaseBased: true,
    },
    {
      question: 'Someone proposes concatenating the position vector onto the embedding instead of adding it. Argue both sides.',
      answer:
        'For concatenation: nothing is destroyed. Addition sums position numbers and word numbers into the same slots, so the model has to learn to pull two overlapping signals apart; with concatenation each lives in its own dimensions and cannot interfere. It is the cleaner design on paper. Against: the vector gets wider, so every weight matrix in every layer gets bigger, attention costs more, and memory goes up — permanently, for the whole model. And the problem it solves turns out to be mostly theoretical: embeddings are high-dimensional and the model has plenty of capacity to separate the two signals from a sum. So addition wins on cost with no measured quality loss. It is a reasonable question to ask, and the answer is "we tried the cheap thing and it was fine".',
      isCaseBased: false,
    },
  ],
  flashcards: [
    {
      front: 'Why is self-attention blind to word order?',
      back: 'Nothing in it reads a token\'s index. Scores come from dot products of contents, weights from a softmax of those scores, and the output from a weighted sum, which does not care about order. Permute the inputs and the outputs come back permuted, unchanged — permutation equivariance.',
    },
    {
      front: 'Positional encoding: what is it and where does it go?',
      back: 'A vector per position that says "I am at slot 5" and nothing about which word it is. It is normally added to the word embedding before the first attention layer, so each vector entering attention carries both what the word is and where it sits.',
    },
    {
      front: 'Absolute vs relative position',
      back: 'Absolute names the slot: 0, 1, 2. Relative names the distance between two tokens: three apart. Language rules are mostly relative ("just before the verb"), which is why schemes that produce relative behaviour for free are preferred.',
    },
    {
      front: 'The four requirements a position encoding must meet',
      back: 'Distinct per position; similar for nearby positions; still defined past the longest input seen in training; and small in magnitude, since it is added to the word embedding and must not drown it.',
    },
    {
      front: 'Why sine and cosine?',
      back: 'They are bounded to [-1, 1] no matter how large the position, they change smoothly so neighbours stay similar, and they are defined for every input, so the encoding never runs out. Pairs of dimensions get different wavelengths — fast ones separate near positions, slow ones separate far ones.',
    },
    {
      front: 'RoPE in one sentence',
      back: 'Read the query and key two numbers at a time and rotate each pair by an angle equal to its position times a fixed step; the dot product then depends on the angle between them, which is the difference of the positions, so the score depends on distance rather than absolute location.',
    },
    {
      front: 'Why does RoPE touch queries and keys but not values?',
      back: 'Only queries and keys meet in a dot product, which is where the rotation produces the relative-distance effect. Values are averaged, not dotted, so rotating them would just spin the content being mixed in by an amount depending on absolute position.',
    },
    {
      front: 'Extending a trained model to a longer context: the move and its cost',
      back: 'Scale positions down so the largest angle lands inside the range seen during training. It works without retraining, but it squeezes short gaps too, blurring fine word-order distinctions. Squeezing the slow pairs harder than the fast ones, plus a short fine-tune, recovers most of that.',
    },
  ],
  mindmapMarkdown: `- Positional Encoding
  - The problem
    - attention reads contents, never indices
    - "dog bites man" = "man bites dog"
    - permutation equivariance
    - more layers do not help
  - The vocabulary
    - position = slot number
    - positional encoding = one vector per slot
    - absolute (slot 5) vs relative (3 apart)
    - fixed formula vs learned table
  - Four requirements
    - distinct per position
    - similar for neighbours
    - defined past training length
    - small enough not to drown the embedding
  - Sinusoidal
    - dimensions in pairs, sin and cos of one angle
    - wavelengths from 1 up to the base
    - fast pairs separate near, slow pairs separate far
    - similarity falls with distance, with a wobble
  - RoPE
    - rotate query and key pairs by position x step
    - dot product sees the angle difference (n - m)
    - relative position falls out of the geometry
    - queries and keys only, never values
    - length preserved, so score scale is undisturbed
  - Longer context
    - angles beyond training range are unfamiliar
    - squeeze positions back into that range
    - uneven squeeze protects short-range detail
    - extension always costs some quality
    - attention work grows with the square of length
  - The classic bug
    - no positional term added at all
    - nothing errors, loss still falls
    - output is word soup: right words, no grammar
    - test: shuffle tokens, compare outputs`,
}

export default m
