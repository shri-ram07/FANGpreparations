import type { Module } from '../types'

const m: Module = {
  id: 'genai-l1-positional-encoding',
  subjectId: 'genai',
  level: 1,
  title: 'Positional Encoding',
  whyItMatters:
    'Attention cannot tell "dog bites man" from "man bites dog". Positional encoding is the repair, and the design of that repair is what decides whether a model trained on 4,000 tokens works at 32,000.',
  assumes: [
    'You have read *Self-Attention*, so you know it is permutation-equivariant',
    'You know what sin and cos look like',
  ],
  estMinutes: 18,
  sections: [
    {
      type: 'intuition',
      title: 'What the encoding has to achieve',
      md: `Attention treats its input as a **set**. Position must therefore be added to the token representations themselves, before attention sees them.

The naive fix — add the integer position — fails immediately. Position 5,000 would dominate an embedding whose values sit around 1, and the scale would differ wildly between a short prompt and a long one.

So the requirements are specific. Every position needs a **distinct** encoding, in a **bounded** range regardless of sequence length, in which **nearby positions are similar**, and which **extends past the longest training sequence**. Sinusoids satisfy the first three; the fourth turns out to be the hard one.`,
    },
    {
      type: 'math',
      intro:
        'The sinusoidal encoding from the original transformer paper. Each pair of dimensions gets its own frequency, decreasing geometrically across the vector — so the early dimensions oscillate fast and the late ones slowly, and the combination is unique per position.',
      latex: [
        'PE_{(pos,\\,2i)} = \\sin\\!\\left(\\frac{pos}{10000^{2i/d}}\\right), \\qquad PE_{(pos,\\,2i+1)} = \\cos\\!\\left(\\frac{pos}{10000^{2i/d}}\\right)',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The encoding, and the range of scales it spans',
      code: `import numpy as np, math

def pe(pos, d):
    v = np.zeros(d)
    for i in range(0, d, 2):
        w = 1.0 / (10000 ** (i / d))
        v[i], v[i+1] = math.sin(pos * w), math.cos(pos * w)
    return v

print(' pos    first four dimensions')
for pos in [0, 1, 2, 10, 100]:
    print(' %4d  %s' % (pos, np.round(pe(pos, 8)[:4], 4).tolist()))

print('\\nwavelengths across dimensions, d=512:')
for i in [0, 64, 256, 510]:
    w = 1.0 / (10000 ** (i / 512))
    print('  dim %3d: wavelength %.1f positions' % (i, 2 * math.pi / w))

# ---- real output ----
#  pos    first four dimensions
#     0  [0.0, 1.0, 0.0, 1.0]
#     1  [0.8415, 0.5403, 0.0998, 0.995]
#     2  [0.9093, -0.4161, 0.1987, 0.9801]
#    10  [-0.544, -0.8391, 0.8415, 0.5403]
#   100  [-0.5064, 0.8623, -0.544, -0.8391]
#
# wavelengths across dimensions, d=512:
#   dim   0: wavelength 6.3 positions
#   dim  64: wavelength 19.9 positions
#   dim 256: wavelength 628.3 positions
#   dim 510: wavelength 60611.5 positions`,
      annotations: {
        5: 'The frequency divides by 10000^(i/d), so it falls geometrically across the vector. That geometric spacing is the entire design.',
        14: 'Every value is in [−1, 1] whatever the position — the bounded requirement, satisfied for free by using sinusoids at all.',
        22: 'Dimension 0 cycles every 6.3 positions and dimension 510 every 60,611. The encoding is a set of clocks at wildly different speeds, so fine and coarse position are both readable, exactly like the hands on a watch.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'How similar are two positions, really',
      code: `base = pe(50, 64)
for other in [50, 51, 55, 60, 80, 150]:
    print('pos 50 vs %3d: %.4f' % (other, float(base @ pe(other, 64))))

# ---- real output ----
# pos 50 vs  50: 32.0000
# pos 50 vs  51: 30.9168
# pos 50 vs  55: 23.5040
# pos 50 vs  60: 21.0516
# pos 50 vs  80: 17.0715
# pos 50 vs 150: 17.8747`,
      annotations: {
        1: 'The dot product between two positional encodings — a direct measure of how similar the model finds two positions before any learning.',
        8: '32.0 with itself, 30.9 with its neighbour, falling to 21.1 at distance 10. Nearby positions genuinely are similar, which is the property that was wanted.',
        11: 'But pos 150 scores 17.87 — HIGHER than pos 80 at 17.07. The similarity is not monotone in distance; it flattens and then wobbles. Sinusoidal encoding delivers locality only over short ranges, and this is a large part of why relative and rotary schemes replaced it.',
      },
    },
    {
      type: 'note',
      label: 'Absolute, learned, relative — and why the third won',
      md: `**Absolute sinusoidal** is the original. Fixed, no parameters, and defined for any position — so in principle it extrapolates past the training length. In practice models trained at 512 do not work well at 2,048 anyway, because the attention patterns above them were never exercised at that range.

**Learned absolute** replaces the formula with a trainable embedding per position, as BERT and GPT-2 do. Slightly better inside the training range and **completely undefined beyond it** — there is simply no row in the table for position 2,049.

**Relative** encodes the *distance* between two tokens rather than their absolute indices, which is closer to what language actually cares about: "the adjective three words back" is a real pattern, "the token at index 4,017" is not. It also generalises to unseen lengths naturally, because distance 5 means the same thing wherever it occurs.`,
    },
    {
      type: 'note',
      label: 'RoPE, and how context windows got extended',
      md: `**Rotary position embedding** is what essentially every modern model uses. Instead of adding anything, it **rotates** the query and key vectors by an angle proportional to their position, in each 2D pair of dimensions.

The elegance is that the dot product of two rotated vectors depends only on the **difference** of their angles. So an absolute operation produces relative behaviour, with no extra parameters and no change to the attention formula.

That is also what makes context extension possible. **Position interpolation** scales the position indices down so a model trained at 4,096 can be shown 32,768 by pretending they are the same range, and **NTK-aware scaling** adjusts the base frequency instead of the positions. Both work with a small amount of fine-tuning, which is why context windows jumped from 4K to 128K in about a year without anyone retraining from scratch.

The honest caveat: a large context window is not the same as usable context. Models reliably lose track of material in the middle of a long window — the "lost in the middle" effect — so the number in the spec sheet overstates what you can depend on.`,
    },
  ],
  quiz: [
    {
      question: 'Why can position not simply be the integer index added to the embedding?',
      options: [
        { text: 'Integers are not differentiable', explanation: 'They are perfectly usable as inputs.' },
        { text: 'Position 5,000 would dominate embedding values around 1, and the scale would differ between short and long sequences', explanation: 'Correct — the encoding must be bounded regardless of length.' },
        { text: 'Attention cannot process integers', explanation: 'It processes whatever numbers it is given.' },
        { text: 'It would make sequences too long', explanation: 'It changes values, not length.' },
      ],
      correct: 1,
    },
    {
      question: 'Dimension 0 has a wavelength of 6.3 positions and dimension 510 of 60,611. What is that design for?',
      options: [
        { text: 'To fill the vector with different numbers', explanation: 'Distinctness is necessary but not the reason for the geometric spacing.' },
        { text: 'A set of clocks at wildly different speeds, so fine and coarse position are both readable — like the hands on a watch', explanation: 'Correct, and the geometric spacing of frequencies is the whole design.' },
        { text: 'To bound the values in [−1, 1]', explanation: 'Any sinusoid does that regardless of frequency.' },
        { text: 'To make the encoding learnable', explanation: 'Sinusoidal encoding has no parameters.' },
      ],
      correct: 1,
    },
    {
      question: 'Position 50 scored 17.87 against position 150 but only 17.07 against position 80. What does that show?',
      options: [
        { text: 'A bug in the encoding', explanation: 'It is the correct behaviour of sinusoidal encoding.' },
        { text: 'Similarity is not monotone in distance — it flattens and wobbles, so locality only holds over short ranges', explanation: 'Correct, and it is a large part of why relative and rotary schemes replaced it.' },
        { text: 'The dimension was too small', explanation: 'The wobble persists at any dimension.' },
        { text: 'The positions were computed wrongly', explanation: 'They follow the standard formula.' },
      ],
      correct: 1,
    },
    {
      question: 'What is the fatal weakness of learned absolute position embeddings?',
      options: [
        { text: 'They add too many parameters', explanation: 'The table is small relative to the model.' },
        { text: 'They are completely undefined beyond the training length — there is no row for position 2,049', explanation: 'Correct, whereas sinusoidal at least has a value for every position.' },
        { text: 'They cannot represent nearby positions similarly', explanation: 'They learn to.' },
        { text: 'They are not differentiable', explanation: 'They are ordinary embeddings.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is relative position a better match for language than absolute?',
      options: [
        { text: 'It is cheaper to compute', explanation: 'It is usually more expensive, not less.' },
        { text: '"The adjective three words back" is a real linguistic pattern; "the token at index 4,017" is not', explanation: 'Correct, and distance 5 means the same thing wherever it occurs, so it generalises to unseen lengths.' },
        { text: 'It uses fewer parameters', explanation: 'Some relative schemes add parameters.' },
        { text: 'It removes the need for attention masking', explanation: 'Masking is unrelated.' },
      ],
      correct: 1,
    },
    {
      question: 'What makes RoPE elegant?',
      options: [
        { text: 'It removes positional information entirely', explanation: 'It supplies it.' },
        { text: 'It rotates Q and K by a position-dependent angle, and the dot product of two rotated vectors depends only on the DIFFERENCE of angles — absolute operation, relative behaviour', explanation: 'Correct, with no extra parameters and no change to the attention formula.' },
        { text: 'It learns the positions', explanation: 'It has no learned parameters.' },
        { text: 'It works only for short sequences', explanation: 'It is what makes long-context extension possible.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why do transformers need positional encoding at all?',
      answer:
        'Because attention treats its input as a set. You can demonstrate it directly: shuffle the input rows, run attention, un-shuffle the output, and the result is identical — the operation is permutation-equivariant and carries no order information whatsoever. So "dog bites man" and "man bites dog" are literally the same computation without position. That means positional encoding is a repair for something structurally missing, not a refinement, and it has to be injected into the token representations themselves before attention ever sees them.',
      isCaseBased: false,
    },
    {
      question: 'How does sinusoidal encoding work, and what are its requirements?',
      answer:
        'Each pair of dimensions gets a sinusoid at a different frequency, spaced geometrically across the vector — dimension 0 cycles every 6.3 positions and dimension 510 every 60,611 at d = 512. It is a set of clocks at wildly different speeds, so fine and coarse position are both readable. The requirements it was designed against were: distinct per position, bounded regardless of sequence length, similar for nearby positions, and defined past the training length. It meets the first three cleanly. The fourth is where it disappoints — models trained at 512 do not actually work well at 2,048, because the attention patterns above them were never exercised at that range.',
      isCaseBased: false,
    },
    {
      question: 'What is RoPE and why did it win?',
      answer:
        'Rotary position embedding rotates the query and key vectors by an angle proportional to their position, within each 2D pair of dimensions, rather than adding anything to them. The property that makes it work is that the dot product of two rotated vectors depends only on the difference of their angles — so an absolute operation produces relative behaviour, with no extra parameters and no change to the attention formula at all. It won because it combines the generalisation of relative encoding with the simplicity and cost of absolute, and because it made context extension practical: position interpolation and NTK-aware scaling both operate directly on the rotation.',
      isCaseBased: false,
    },
    {
      question: 'How were context windows extended from 4K to 128K?',
      answer:
        'Not by retraining. Position interpolation scales the position indices down so that a model trained at 4,096 sees 32,768 positions compressed into the range it already knows — the model is being told the tokens are closer together than they are, which turns out to work with a small amount of fine-tuning. NTK-aware scaling instead adjusts RoPE\'s base frequency, which preserves high-frequency detail better and needs even less fine-tuning. YaRN combines both. What made all of it possible is that RoPE is a smooth function of position rather than a lookup table, so you can interpolate between what it already knows.',
      isCaseBased: true,
    },
    {
      question: 'Is a 128K context window really usable?',
      answer:
        'Not in the way the number suggests. The "lost in the middle" result is the one to know: retrieval accuracy is high for material at the start and end of a long context and drops substantially in the middle, so a fact placed at token 60,000 of 128,000 may be effectively invisible. Attention also gets thinner as it spreads over more positions, and the cost is quadratic, so a full window is expensive. In practice I would treat the advertised window as a ceiling rather than a working budget: put the most important material at the beginning or the end, and prefer retrieving the right 4,000 tokens over dumping 100,000.',
      isCaseBased: true,
    },
    {
      question: 'What is ALiBi and how does it differ?',
      answer:
        'Attention with Linear Biases adds no positional encoding at all. Instead it subtracts a penalty from each attention score proportional to the distance between the two tokens, with a different slope per head — so nearer tokens are simply preferred, and by a different amount in each head. It is extremely simple, costs essentially nothing, and extrapolates to sequences far longer than training remarkably well, because a linear penalty is defined at any distance. The trade is that it hard-codes a recency bias, which is right for language modelling and wrong wherever distant context matters as much as near context. RoPE is the more common choice, but ALiBi is the better answer if extrapolation is the priority.',
      isCaseBased: false,
    },
    {
      question: 'Where in the model is positional information injected?',
      answer:
        'It depends on the scheme, and the difference matters. Absolute encodings, sinusoidal or learned, are added to the token embeddings once at the bottom, so the information has to survive every subsequent layer. RoPE is applied to the queries and keys inside every attention layer, so position is refreshed at each one rather than needing to persist. ALiBi modifies the attention scores directly, also at every layer. The general trend has been away from inject-once-at-the-bottom and toward per-layer, which is one of the reasons the newer schemes handle long sequences better — the positional signal does not have to compete with everything else for room in the residual stream.',
      isCaseBased: false,
    },
    {
      question: 'Your model works at 2K and degrades badly at 8K. How do you diagnose it?',
      answer:
        'First establish what kind of degradation it is. If output is incoherent or the loss is enormous, it is likely a positional problem — learned absolute embeddings simply have no rows past their table, and even RoPE degrades outside its trained range. If output is coherent but the model ignores the early part of the context, that is the lost-in-the-middle pattern rather than an encoding failure. I would test with a needle-in-a-haystack retrieval sweep at several depths, which separates the two cleanly. The fixes differ: position interpolation plus fine-tuning for the encoding problem, and better context construction — retrieval, reranking, putting key material at the edges — for the attention one.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Why it is needed', back: 'Attention treats input as a SET — shuffle in, un-shuffle out, identical result. Position is a repair, not a refinement.' },
    { front: 'The four requirements', back: 'Distinct per position, bounded regardless of length, similar for nearby positions, defined past the training length. Sinusoids meet the first three.' },
    { front: 'The clock design', back: 'Geometric frequencies: dim 0 cycles every 6.3 positions, dim 510 every 60,611 at d=512. Fine and coarse position both readable.' },
    { front: 'The wobble', back: 'pos 50 vs 150 scores 17.87, HIGHER than vs 80 at 17.07. Similarity is not monotone in distance — locality only over short ranges.' },
    { front: 'Learned absolute', back: 'Slightly better in range, COMPLETELY undefined beyond it. No row for position 2,049.' },
    { front: 'Why relative fits language', back: '"The adjective three words back" is a real pattern; "the token at index 4,017" is not. Distance 5 means the same thing anywhere.' },
    { front: 'RoPE', back: 'Rotate Q and K by an angle proportional to position. The dot product depends only on the DIFFERENCE of angles — absolute operation, relative behaviour, no parameters.' },
    { front: 'Context extension', back: 'Position interpolation scales indices down; NTK-aware scaling adjusts the base frequency. Both need only light fine-tuning — 4K to 128K in a year.' },
  ],
  mindmapMarkdown: `- Positional encoding
  - Why
    - attention treats input as a SET
    - shuffle in, un-shuffle out -> identical
    - integers fail: unbounded, scale-dependent
  - Four requirements
    - distinct, bounded, locally similar, extends past training
    - sinusoids meet the first three
  - Sinusoidal
    - geometric frequencies = clocks at different speeds
    - dim 0: 6.3 positions; dim 510: 60,611
    - always in [-1, 1]
    - similarity NOT monotone: 50 vs 150 (17.87) > 50 vs 80 (17.07)
  - Learned absolute
    - BERT, GPT-2
    - undefined beyond the table - no row for 2,049
  - Relative
    - distance, not index
    - matches how language actually works
    - generalises to unseen lengths
  - RoPE
    - ROTATE q and k by a position angle
    - dot product depends only on angle DIFFERENCE
    - absolute operation, relative behaviour, no parameters
    - applied per layer, not once at the bottom
  - Extension
    - position interpolation / NTK scaling / YaRN
    - 4K -> 128K with light fine-tuning
    - but "lost in the middle" - the number overstates it`,
}

export default m
