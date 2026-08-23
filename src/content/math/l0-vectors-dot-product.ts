import type { Module } from '../types'

const m: Module = {
  id: 'math-l0-vectors-dot-product',
  subjectId: 'math',
  level: 0,
  title: 'Vectors and the Dot Product',
  whyItMatters:
    'The dot product is one multiply-and-add, and it is what every layer of every neural network computes millions of times. Everything else — similarity, projection, attention scores — is that one operation read differently.',
  assumes: [
    'You can multiply and add numbers',
    'You have seen a point plotted on a graph',
  ],
  estMinutes: 18,
  sections: [
    {
      type: 'intuition',
      title: 'A vector is a list, and also an arrow',
      md: `A **vector** is an ordered list of numbers. \`[3, 4]\` is a vector; so is a 300-number word embedding, and so is a row of your data table.

Two readings are useful and both are correct. As a **point or arrow**, \`[3, 4]\` means three across and four up — which is where the geometry comes from. As a **list of measurements**, it is height and weight, or 300 learned features.

The **length** of a vector is Pythagoras extended: √(3² + 4²) = 5. This is written ‖a‖ and called the **norm**, and it works in any number of dimensions even though you cannot picture it past three.`,
    },
    {
      type: 'math',
      intro:
        'The dot product, twice. The first line is how you compute it — multiply matching entries, add them up. The second is what it means geometrically, and the fact that these two are the same thing is what makes the operation useful.',
      latex: [
        'a \\cdot b = \\sum_{i} a_i b_i',
        'a \\cdot b = \\|a\\|\\,\\|b\\|\\cos\\theta',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Four vectors, and what the dot product says about each pair',
      code: `import numpy as np
a = np.array([3.0, 4.0]);  b = np.array([4.0, 3.0])
c = np.array([-4.0, 3.0]); d = np.array([6.0, 8.0])

def cos(x, y):
    return float(x @ y / (np.linalg.norm(x) * np.linalg.norm(y)))

for name, v in [('a', a), ('b', b), ('c', c), ('d', d)]:
    print('%s = %-12s norm = %.4f' % (name, v.tolist(), np.linalg.norm(v)))
for n1, x, n2, y in [('a', a, 'b', b), ('a', a, 'c', c), ('a', a, 'd', d)]:
    print('%s . %s = %6.1f   cos = %+.4f' % (n1, n2, float(x @ y), cos(x, y)))

# ---- real output ----
# a = [3.0, 4.0]   norm = 5.0000
# b = [4.0, 3.0]   norm = 5.0000
# c = [-4.0, 3.0]  norm = 5.0000
# d = [6.0, 8.0]   norm = 10.0000
# a . b =   24.0   cos = +0.9600
# a . c =    0.0   cos = +0.0000
# a . d =   50.0   cos = +1.0000`,
      annotations: {
        6: 'The dot product over both norms strips out length and leaves only direction. That is cosine similarity, and it is why it is bounded to [−1, 1].',
        16: 'a·c = 0.0 exactly. A dot product of zero means the vectors are **orthogonal** — at right angles — and it is the cheapest test for that fact there is.',
        17: 'd is exactly twice a. The dot product is 50 while a·b is only 24, but the cosine is +1.0000: same direction, double the length. That is precisely the difference between a raw dot product and a cosine.',
        14: 'a, b and c all have norm 5.0000 and point in three different directions. Norm and direction are independent, which is why the two readings of the dot product formula are both needed.',
      },
    },
    {
      type: 'note',
      label: 'What the sign tells you, and where you have already seen it',
      md: `The geometric form makes the sign meaningful. **Positive** means the vectors point broadly the same way, **zero** means orthogonal, **negative** means broadly opposite.

That is the whole of what a neuron does. \`w · x + b\` asks: how much does this input point in the direction this weight vector cares about? A large positive value fires the unit; a negative one does not.

It is also **attention**, which scores a query against every key with a dot product and calls the result relevance. And it is **cosine similarity** in every search and recommendation system. One operation, three names.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Projection: how much of one vector lies along another',
      code: `proj = (float(a @ b) / float(a @ a)) * a
print('vector projection of b onto a :', proj.tolist())
print('scalar projection ||b|| cos   :', round(np.linalg.norm(b) * cos(a, b), 4))

# ---- real output ----
# vector projection of b onto a : [2.88, 3.84]
# scalar projection ||b|| cos   : 4.8`,
      annotations: {
        1: 'Divide by a·a rather than by the norm, because the result is then a multiple of a itself — the shadow b casts on a\'s line.',
        6: '[2.88, 3.84] is 0.96 × a, and it has norm 4.8 — the scalar projection on the next line. b has length 5, so 4.8 of it lies along a and the remaining 1.4 is perpendicular.',
        7: 'This is the operation PCA performs on every data point, and the operation a linear layer performs on every input. Projection is the geometric name for what a dot product does.',
      },
    },
    {
      type: 'note',
      label: 'Which norm, and why it matters',
      md: `**L2**, √(Σaᵢ²), is the ordinary length and the default everywhere. It is what weight decay penalises and what Euclidean distance measures.

**L1**, Σ|aᵢ|, is the sum of absolute values — distance if you can only travel along the axes. As a penalty it drives weights to exactly zero and produces sparsity, which L2 does not.

**L∞**, max|aᵢ|, is the largest single component, and it is what you clip against when you bound the worst case rather than the total.

**Normalising** means dividing by the norm, giving a vector of length 1 that keeps only the direction. Do that to both vectors and the dot product *is* the cosine — which is exactly why vector databases normalise on insert.`,
    },
  ],
  quiz: [
    {
      question: 'a·c came out at exactly 0.0. What does that mean?',
      options: [
        { text: 'One of the vectors is zero', explanation: 'Both have norm 5.0000.' },
        { text: 'They are orthogonal — at right angles — and a dot product is the cheapest test for that', explanation: 'Correct. Zero dot product is the definition of orthogonality.' },
        { text: 'They point in opposite directions', explanation: 'That would give a negative dot product.' },
        { text: 'They are identical', explanation: 'Identical vectors give a large positive dot product.' },
      ],
      correct: 1,
    },
    {
      question: 'a·b = 24 and a·d = 50, but cos(a,b) = 0.96 and cos(a,d) = 1.0. What is the difference?',
      options: [
        { text: 'The dot products were computed differently', explanation: 'Both are the same operation.' },
        { text: 'd is exactly twice a — same direction, double the length. Cosine strips out length; the raw dot product does not', explanation: 'Correct, and it is why cosine is preferred when magnitude carries no meaning.' },
        { text: 'b is longer than d', explanation: 'b has norm 5, d has norm 10.' },
        { text: 'Cosine is an approximation', explanation: 'It is exact.' },
      ],
      correct: 1,
    },
    {
      question: 'What does a neuron\'s w·x + b actually ask?',
      options: [
        { text: 'How far apart w and x are', explanation: 'That is a distance, not a dot product.' },
        { text: 'How much this input points in the direction the weight vector cares about', explanation: 'Correct — positive fires the unit, negative does not, and that is the whole operation.' },
        { text: 'The length of x', explanation: 'The length appears only as a factor.' },
        { text: 'Whether x is normalised', explanation: 'It does not test that.' },
      ],
      correct: 1,
    },
    {
      question: 'Why does the projection formula divide by a·a rather than by ‖a‖?',
      options: [
        { text: 'To avoid a square root', explanation: 'A side benefit, not the reason.' },
        { text: 'So the result is a multiple of a itself — the vector projection rather than a scalar', explanation: 'Correct: [2.88, 3.84] is 0.96 × a.' },
        { text: 'Because a is not normalised', explanation: 'The formula works whether or not it is.' },
        { text: 'It is a convention with no effect', explanation: 'It changes the result from a number to a vector.' },
      ],
      correct: 1,
    },
    {
      question: 'The projection of b onto a has norm 4.8 while b has norm 5. What is the remaining 1.4?',
      options: [
        { text: 'Rounding error', explanation: 'Both values are exact.' },
        { text: 'The component of b perpendicular to a — what the projection discards', explanation: 'Correct, and 4.8² + 1.4² = 25 = 5².' },
        { text: 'The bias term', explanation: 'No bias appears here.' },
        { text: 'The dot product', explanation: 'The dot product is 24.' },
      ],
      correct: 1,
    },
    {
      question: 'What does L1 do that L2 does not?',
      options: [
        { text: 'It is faster to compute', explanation: 'Both are a sum over the components.' },
        { text: 'As a penalty it drives weights to exactly zero, producing sparsity', explanation: 'Correct — its gradient does not shrink as the weight approaches zero.' },
        { text: 'It measures the true geometric length', explanation: 'That is L2.' },
        { text: 'It bounds the largest component', explanation: 'That is L∞.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'What does a dot product mean geometrically?',
      answer:
        'It is ‖a‖‖b‖cos θ, so it combines how long the two vectors are with how aligned they are. The sign is the readable part: positive means they point broadly the same way, zero means orthogonal, negative means broadly opposite. The reason it matters is that the algebraic form — multiply matching entries and add — and the geometric form are the same number, so a cheap arithmetic operation gives you a meaningful statement about direction. That is why the same operation appears as a neuron\'s w·x, as an attention score, and as cosine similarity in search.',
      isCaseBased: false,
    },
    {
      question: 'When would you use cosine similarity instead of a raw dot product?',
      answer:
        'When magnitude carries no meaning, which for learned embeddings it usually does not. In the worked example, d is exactly twice a: the raw dot product is 50 against 24 for a genuinely different vector b, while the cosines are 1.0 and 0.96 — the raw product is dominated by length. For text, vector length tracks word frequency or document length, neither of which should make things more similar. The connecting fact is that once both vectors are L2-normalised the dot product IS the cosine, which is why vector databases normalise on insert and then use fast inner-product search.',
      isCaseBased: false,
    },
    {
      question: 'What is a projection and where does it appear in machine learning?',
      answer:
        'The component of one vector lying along another: (a·b / a·a)·a, which is b\'s shadow on a\'s line. In the example, b of length 5 projects to a vector of length 4.8 along a, leaving 1.4 perpendicular — and 4.8² + 1.4² = 25, so the projection and the residual decompose b exactly. It appears everywhere: PCA projects every data point onto the principal components, a linear layer projects its input onto each weight vector, and least squares is the projection of the target onto the column space of the design matrix. Projection is the geometric name for what a dot product does.',
      isCaseBased: false,
    },
    {
      question: 'L1 or L2 norm, and why does the choice matter?',
      answer:
        'L2 is the ordinary length, √(Σaᵢ²), and it is the default — Euclidean distance, weight decay, gradient norms. L1 is Σ|aᵢ|, distance if you can only travel along the axes. The practical difference is what they do as a penalty: L1\'s gradient does not shrink as a weight approaches zero, so weights land on exactly zero and the model becomes sparse, while L2 shrinks smoothly and never quite arrives. So L1 when you want feature selection or an interpretable model, L2 when you want all the features but well behaved. L∞, the largest single component, is what you use when you care about the worst case rather than the total.',
      isCaseBased: false,
    },
    {
      question: 'Why does a dot product of zero matter so much?',
      answer:
        'Because it is the cheapest possible test for orthogonality, and orthogonality is the organising idea behind a lot of linear algebra. Orthogonal directions carry independent information — that is exactly what PCA constructs, principal components that are mutually orthogonal so each one adds something the others do not. Orthonormal bases make computation easy because the inverse is the transpose. And in attention, a query orthogonal to a key contributes nothing to that position. One multiply-and-add per pair, and the answer is a geometric fact.',
      isCaseBased: false,
    },
    {
      question: 'What breaks about distance in high dimensions?',
      answer:
        'Distances concentrate. As dimension grows, the ratio between the nearest and farthest points in a random sample tends toward 1, so "nearest neighbour" becomes less and less meaningful — everything is roughly equidistant from everything else. Random vectors also become nearly orthogonal with high probability, which is counterintuitive but is exactly what makes high-dimensional embeddings able to hold so many distinguishable directions. The practical consequences are that cosine tends to survive better than Euclidean because it only uses angle, that dimensionality reduction before a nearest-neighbour search often helps, and that intuition from two dimensions should be held loosely.',
      isCaseBased: true,
    },
    {
      question: 'How does a matrix-vector product relate to the dot product?',
      answer:
        'Each entry of the output is one dot product: row i of the matrix with the input vector. So a linear layer with 512 outputs is 512 dot products, each asking how much the input aligns with one learned direction. That framing is more useful than the mechanical one, because it explains what the weights are — a set of directions the layer is looking for — and it explains why a layer with more outputs can detect more distinct patterns. It also explains the cost: the number of multiply-accumulates is exactly the number of matrix entries, which is why parameter counts and FLOP counts track each other so closely in dense layers.',
      isCaseBased: false,
    },
    {
      question: 'Why normalise embeddings before storing them?',
      answer:
        'Because it makes the dot product equal the cosine, and that unlocks a lot. Similarity search then reduces to maximum inner product, which the fast approximate-nearest-neighbour indexes are built for. It also means Euclidean distance and cosine give the same ranking on the unit sphere, so one index serves both queries. And it removes magnitude from the comparison, which for text embeddings is usually noise — frequency and document length rather than meaning. The cost is that you lose magnitude permanently, so if it did carry signal in your domain, normalising is destroying it.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Two readings of a vector', back: 'An arrow (geometry) and a list of measurements (data). Both correct, and switching between them is most of the value.' },
    { front: 'The dot product, twice', back: 'Σaᵢbᵢ — how you compute it. ‖a‖‖b‖cos θ — what it means. That these are the same number is the whole point.' },
    { front: 'The sign', back: 'Positive = broadly aligned. Zero = ORTHOGONAL. Negative = broadly opposite. a·c = 0.0 is the cheapest orthogonality test there is.' },
    { front: 'Dot product vs cosine', back: 'a·b = 24 (cos 0.96), a·d = 50 (cos 1.0) — d is just twice a. Cosine strips length; the raw product does not.' },
    { front: 'Where you have seen it', back: 'A neuron\'s w·x, an attention score, cosine similarity in search. One operation, three names.' },
    { front: 'Projection', back: '(a·b / a·a)·a — b\'s shadow on a\'s line. b of norm 5 gives [2.88, 3.84] of norm 4.8, leaving 1.4 perpendicular. 4.8² + 1.4² = 25.' },
    { front: 'The three norms', back: 'L2 √(Σaᵢ²) = ordinary length, the default. L1 Σ|aᵢ| = axis-only travel, drives weights to EXACTLY zero. L∞ max|aᵢ| = worst case.' },
    { front: 'Why normalise', back: 'Once both are length 1, the dot product IS the cosine — so one index serves both cosine and Euclidean queries.' },
  ],
  mindmapMarkdown: `- Vectors and the dot product
  - A vector
    - an ordered list AND an arrow
    - norm = sqrt(sum of squares); [3,4] -> 5
    - works in any dimension you cannot picture
  - The dot product
    - sum a_i b_i = ||a|| ||b|| cos(theta)
    - same number, two readings
    - positive / zero / negative = aligned / orthogonal / opposite
    - a.c = 0.0 exactly -> orthogonal
  - Dot product vs cosine
    - a.b = 24 (cos 0.96); a.d = 50 (cos 1.0)
    - d is twice a: same direction, double length
    - cosine strips magnitude
  - Where it appears
    - a neuron: w.x + b
    - an attention score
    - cosine similarity in search
    - a matrix-vector product is one dot per row
  - Projection
    - (a.b / a.a) a = b's shadow on a's line
    - [2.88, 3.84], norm 4.8; residual 1.4
    - this is what PCA does to every point
  - Norms
    - L2: ordinary length, the default
    - L1: axis travel; drives weights to EXACTLY zero
    - L-inf: largest component, worst case
    - normalise -> dot product IS the cosine`,
}

export default m
