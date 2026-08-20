import type { Module } from '../types'

const m: Module = {
  id: 'math-l0-vectors-dot-product',
  subjectId: 'math',
  level: 0,
  title: 'Vectors & the Dot Product (= Similarity)',
  whyItMatters:
    'Every "find me something like this" system on earth — semantic search, recommenders, RAG, the attention inside GPT — is computing dot products. It is the highest-leverage formula in ML: one line of arithmetic that turns "do these two things mean the same thing?" into a single number. Learn it here on four-dimensional toys and you will recognise it, unchanged, inside a 96-layer transformer.',
  estMinutes: 45,
  sections: [
    {
      type: 'intuition',
      title: 'A vector, three ways',
      md: `A flat is: 2 bedrooms, 850 sq ft, 4 km from the office, floor 7. Write that as **[2, 850, 4, 7]**. You just made a vector.

- **A list of numbers.** The ML view. Each slot is one *feature* — one measured property of one thing.
- **An arrow in space.** Starts at the origin, points somewhere. Gives you direction and length.
- **A point.** Just the arrow's tip. Gives you "things near each other are alike".
- All three are the same object. Switching views freely is the whole trick of linear algebra.
- ML almost always *starts* in the list view: a row of a spreadsheet, a 768-number embedding of a sentence, an image flattened out.
- The payoff comes from the arrow view: once your data is arrows, **geometry answers questions about meaning**.`,
    },
    {
      type: 'note',
      md: `"768-dimensional" sounds like science fiction. It is not — it means 768 numbers in the list. You cannot picture it and you never need to: every rule below is written for n dimensions and behaves in 768 exactly as it does in 2. **Reason in 2D, compute in 768D.**`,
    },
    {
      type: 'intuition',
      title: 'Two moves: add and scale',
      md: `That is the entire grammar. Two operations, one rule each.

- **Addition** is componentwise: [2, 1] + [3, 0] = [5, 1]. Geometrically: walk the first arrow, then walk the second from where you landed. Tip-to-tail.
- **Scalar multiplication** stretches: 2·[2, 1] = [4, 2] — same direction, twice as long.
- A negative scalar flips it: −1·[2, 1] = [−2, −1] — same line, opposite way. A zero scalar collapses it to the origin.
- Notice scaling never rotates. It only changes length (and possibly which end you are on).
- Every layer of every neural network is these two moves repeated: scale each input by a weight, add the results. Nothing more exotic is happening in there.`,
    },
    {
      type: 'math',
      intro: 'Componentwise, for vectors of any length n. c is a plain number (a "scalar").',
      latex: [
        'a + b = (a_1 + b_1,\\; a_2 + b_2,\\; \\dots,\\; a_n + b_n)',
        'c\\,a = (c\\,a_1,\\; c\\,a_2,\\; \\dots,\\; c\\,a_n)',
      ],
    },
    {
      type: 'intuition',
      title: 'Length: the norm',
      md: `How long is the arrow [3, 4]? Pythagoras, and nothing else: sqrt(3² + 4²) = **5**.

- That is the **L2 norm**, written ‖a‖ (or ‖a‖₂) — straight-line distance from the origin to the tip.
- It generalises with zero drama: square every component, add them, take the square root. Same in 768 dimensions as in 2.
- There is a sibling: the **L1 norm** — just add the absolute values. ‖[3, 4]‖₁ = 7. That is "taxi distance": you must travel along the grid, no diagonal shortcut.
- The difference in one line: L2 punishes one big component hard (it is squared); L1 charges the same rate per unit, wherever that unit sits.
- That is not trivia. It is exactly why **Ridge (an L2 penalty) shrinks weights toward zero while Lasso (an L1 penalty) drives them exactly to zero** — the regularization module cashes this in.`,
    },
    {
      type: 'math',
      intro: 'Two ways to measure "how big". Both come back later as regularization penalties.',
      latex: [
        '\\|a\\|_2 = \\sqrt{a_1^2 + a_2^2 + \\cdots + a_n^2} = \\sqrt{a \\cdot a}',
        '\\|a\\|_1 = |a_1| + |a_2| + \\cdots + |a_n|',
        '\\hat{a} = \\frac{a}{\\|a\\|_2} \\qquad \\text{so } \\|\\hat{a}\\| = 1',
      ],
    },
    {
      type: 'intuition',
      title: 'Unit vectors: keep the direction, drop the length',
      md: `Divide a vector by its own length and you get a **unit vector** — length exactly 1, direction untouched. [3, 4] ÷ 5 = [0.6, 0.8]. That division is all "normalizing" means.

- Written â ("a-hat"). Check it worked by re-measuring: ‖â‖ must be 1.0.
- Why bother: it separates *which way* from *how much*. Very often only "which way" carries the meaning.
- Embeddings are the headline case. A sentence embedding's **direction** encodes what the sentence is about; its **length** mostly encodes incidentals — how long the passage was, how confident the encoder felt.
- So vector databases normalize on insert. After that, comparing two vectors is one cheap multiply-and-add away from a clean similarity score.
- Keep the reflex: if length is an artifact of your data pipeline rather than a fact about the world, normalize it away.`,
    },
    {
      type: 'intuition',
      title: 'The dot product — the star of this module',
      md: `Two vectors in, **one number** out. Multiply matching slots, add the results. [2, 1, 0, 1] · [3, 2, 0, 1] = 6 + 2 + 0 + 1 = **9**.

- That is the arithmetic, and it is trivial. What makes it matter is the *second* formula for the same number: **a · b = ‖a‖ ‖b‖ cos θ**, where θ is the angle between the arrows.
- Read it right to left: how long a is, times how long b is, times **how much they agree on direction**.
- All the meaning lives in cos θ. It is 1 when the arrows point the same way, 0 at a right angle, −1 when they point opposite.
- So the *sign alone* already answers a question: **positive = same direction, zero = unrelated (orthogonal), negative = opposed**.
- One number that says "do these two things agree?", computed in a single pass, perfectly parallel on a GPU, and differentiable. That combination is why it is everywhere.`,
    },
    {
      type: 'math',
      intro: 'The same number, written twice. The first line is how you compute it; the second is what it means.',
      latex: [
        'a \\cdot b = \\sum_{i=1}^{n} a_i b_i = a_1 b_1 + a_2 b_2 + \\cdots + a_n b_n',
        'a \\cdot b = \\|a\\| \\, \\|b\\| \\cos\\theta',
        '\\cos\\theta = \\frac{a \\cdot b}{\\|a\\| \\, \\|b\\|} \\qquad \\text{(this is cosine similarity)}',
      ],
    },
    {
      type: 'intuition',
      title: 'Dot product = similarity. This is THE takeaway.',
      md: `Forget everything else in this module and keep this one sentence: **the dot product is a similarity score.** Large = alike. Zero = unrelated. Negative = opposed.

- **Attention** (so: every LLM). Each token asks "who here should I listen to?" — the answer is its vector dotted against every other token's vector.
- **Semantic search and RAG.** Your query becomes a vector, every document is a vector, retrieval is literally "give me the largest dot products".
- **Recommenders.** user vector · item vector = predicted taste match. That is the core of matrix factorization.
- **kNN.** "Nearest" is a distance, and squared Euclidean distance is built out of dot products (you will see the expansion below).
- Same three lines of arithmetic in all four. The application changes; the formula does not.`,
    },
    { type: 'visual', component: 'VectorPlayground', props: {} },
    {
      type: 'note',
      md: 'Drag b until the readout says the dot product is **zero** — the arrows sit at 90°. That is orthogonality, and it is the whole reason PCA looks for perpendicular directions: they carry non-overlapping information. Now drag b past a and watch the sign flip to negative: the shadow lands on the wrong side of the origin.',
    },
    { type: 'visual', component: 'AttentionHeatmap', props: {} },
    {
      type: 'note',
      md: `Every single cell in that grid is **one dot product** — the row token's query vector dotted with the column token's key vector. That is the raw score, before softmax turns each row into percentages. Look at the "it" row: it lights up on "cat". Nobody hand-wrote that rule; the model learned vectors whose dot product happens to be large for exactly that pair. This is the *same component* the GenAI attention module uses — you are meeting the picture here in plain vector language, and will meet the machinery around it there.`,
    },
    {
      type: 'intuition',
      title: 'Cosine similarity vs raw dot product',
      md: `The raw dot product has a flaw you must know about: it rewards **length**. A long document gets a big vector, so it scores high against everything — including queries it has nothing to do with.

- Fix: divide both lengths out. That is **cosine similarity** — the dot product of the *normalized* vectors, always between −1 and 1.
- Cosine asks only "same direction?". Document size and word count stop counting as relevance.
- Use **cosine** when length is an artifact: text embeddings, semantic search, RAG, deduplication, clustering documents.
- Use the **raw dot product** when length is real signal: recommenders where a genuinely popular item *should* score higher, or attention inside a model that has learned its own scale.
- The shortcut everyone ships: normalize once on insert, and then the fast plain dot product **is** the cosine. Cosine's correctness at the dot product's speed.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Three toy sentence embeddings — watch raw dot product get it wrong',
      code: `import numpy as np

# 4 dims, tiny numbers, so every result below is checkable by hand.
s1 = np.array([2, 1, 0, 1])   # "a cat sits on the mat"
s2 = np.array([3, 2, 0, 1])   # "a kitten rests on a rug"   -> same meaning as s1
s3 = np.array([4, 0, 6, 2])   # "quarterly revenue report"  -> other topic, LONGER vector

def cosine(a, b):
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)))

print("raw dot", s1 @ s2, s1 @ s3, s2 @ s3)
# raw dot 9 10 14        <- the finance doc beats the real match (9). Wrong answer.

print("norms", [round(float(np.linalg.norm(v)), 3) for v in (s1, s2, s3)])
# norms [2.449, 3.742, 7.483]     = sqrt(6), sqrt(14), sqrt(56)

print("cosine", [round(cosine(a, b), 3) for a, b in ((s1, s2), (s1, s3), (s2, s3))])
# cosine [0.982, 0.546, 0.5]      <- s1-s2 now wins, by a mile. Right answer.

# Hand check, no computer:
#   s1 . s2 = 2*3 + 1*2 + 0*0 + 1*1 = 9
#   s2 . s3 = 3*4 + 2*0 + 0*6 + 1*2 = 14
#   |s2| = sqrt(14), |s3| = sqrt(56)  ->  14 / sqrt(14*56) = 14 / 28 = 0.5, exactly
#   cos = 0.5 is an angle of exactly 60 degrees.  s1 vs s2 is only 10.9 degrees apart.

# Normalize first, and the plain dot product IS the cosine:
u1, u2 = s1 / np.linalg.norm(s1), s2 / np.linalg.norm(s2)
print(round(float(u1 @ u2), 3), round(float(np.linalg.norm(u1)), 3))
# 0.982 1.0      <- same similarity, and the unit vector really does have length 1`,
      annotations: {
        6: 'This is the whole trap in one line: s3 is about nothing you asked for, but its numbers are big, so its norm is big.',
        9: '@ is NumPy\'s dot product (np.dot(a, b) is the same thing). float() keeps the printed output clean.',
        12: 'Ranking by raw dot: s2-s3 (14) > s1-s3 (10) > s1-s2 (9). The long document tops every pairing it appears in.',
        18: 'Ranking by cosine: 0.982 >> 0.546 > 0.500. Divide the lengths out and the semantics come back.',
        27: 'Normalizing = dividing by your own norm. Do this once on insert and every later comparison is free.',
      },
    },
    {
      type: 'note',
      md: `One honest note on **projection**, because you will meet the word. Shine a light straight down onto the line through b: the shadow that a casts has length **a · b / ‖b‖**. That is all a projection is — "how much of a points along b". If b is already a unit vector it collapses to just **a · b**, which is one more reason unit vectors are worth the trouble. This is the machinery under PCA (project the data onto the best directions) and under least squares (project the target onto what your features can reach).`,
    },
    {
      type: 'math',
      intro: 'The shadow, as a length and as a vector.',
      latex: [
        '\\text{comp}_b(a) = \\frac{a \\cdot b}{\\|b\\|} \\qquad \\text{proj}_b(a) = \\frac{a \\cdot b}{\\|b\\|^2}\\, b',
      ],
    },
    {
      type: 'intuition',
      title: 'Orthogonality: the zero case, and why it is prized',
      md: `Two vectors are **orthogonal** when their dot product is exactly 0 — a right angle, cos θ = 0. Check: [3, 4] · [4, −3] = 12 − 12 = 0.

- In plain words: they share nothing. Knowing where something sits along one direction tells you nothing about the other.
- That is why orthogonality is prized rather than merely tidy: orthogonal directions carry **non-redundant** information.
- **PCA** requires its components to be orthogonal for exactly this reason — each new direction must explain variance the earlier ones could not.
- Orthogonal (uncorrelated) features are also the easy case for training: the loss surface is a round bowl instead of a stretched ravine.
- Strange but true: in very high dimensions almost every pair of random vectors is *nearly* orthogonal. That is the geometry behind the **curse of dimensionality** — everything ends up looking equally unrelated to everything.`,
    },
    {
      type: 'note',
      md: `Three places this exact formula reappears, one line each. **GenAI:** an attention score is a query-key dot product, scaled by sqrt(d) and softmaxed — that is the entire operation. **ML (kNN):** squared Euclidean distance expands to ‖a‖² − 2(a · b) + ‖b‖², so "nearest neighbour" is decided by a dot product. **ML (PCA):** the principal directions must be mutually orthogonal, i.e. every pair dots to zero. If you want to *watch* these arrows move while you learn, 3Blue1Brown's **Essence of Linear Algebra** is the best hour on the internet for it — queue its sibling, *Essence of Calculus*, for the derivatives module.`,
    },
  ],
  quiz: [
    {
      question: 'You dot two embeddings together and get exactly 0.0. What does that tell you?',
      options: [
        {
          text: 'The two vectors are identical',
          explanation: 'Backwards. Identical vectors give the LARGEST dot product possible for their lengths (cos θ = 1), never zero.',
        },
        {
          text: 'They are orthogonal — a right angle, cos θ = 0, no shared direction',
          explanation: 'Correct. Zero is the "unrelated" reading: neither agreeing nor opposing. In embedding space it means the two items share no measured direction.',
        },
        {
          text: 'One of them has the wrong shape',
          explanation: 'A shape mismatch raises an error, it does not quietly return 0.0. A clean zero is a geometric statement.',
        },
      ],
      correct: 1,
    },
    {
      question: 'For a = [3, 4], what are the L2 norm and the L1 norm?',
      options: [
        {
          text: '5 and 7',
          explanation: 'Correct. L2 = sqrt(9 + 16) = 5, the straight-line length. L1 = 3 + 4 = 7, the taxi route along the grid. This same L1/L2 split becomes Lasso vs Ridge.',
        },
        { text: '7 and 5', explanation: 'Swapped. L2 is the square-root-of-squares one, and it is always ≤ L1 because the diagonal beats the grid route.' },
        { text: '5 and 25', explanation: 'L2 is 5, but 25 is the sum of squares — you forgot nothing squares in L1. L1 is just |3| + |4| = 7.' },
      ],
      correct: 0,
    },
    {
      question: 'a and b are both unit vectors. What is a · b?',
      options: [
        {
          text: 'Exactly cos θ',
          explanation: 'Correct. a · b = ‖a‖‖b‖cos θ, and both norms are 1. This is precisely why vector DBs normalize on insert: the cheap dot product then IS the cosine similarity.',
        },
        { text: 'Always 1', explanation: 'Only if they point the same way. Unit length pins the magnitude, not the direction — two unit vectors can be opposite (−1).' },
        { text: 'The angle θ, in radians', explanation: 'It is the COSINE of the angle, not the angle. You would need arccos to recover θ itself.' },
      ],
      correct: 0,
    },
    {
      question: 'Normalizing a vector (dividing it by its own norm) changes what?',
      options: [
        { text: 'Its direction; the length stays the same', explanation: 'Backwards. Dividing by a positive number cannot rotate anything.' },
        {
          text: 'Its length, which becomes exactly 1; the direction is unchanged',
          explanation: 'Correct. That is the entire point: keep "which way", discard "how much". Verify by re-measuring — ‖â‖ must come back 1.0.',
        },
        { text: 'Both length and direction', explanation: 'Only length. Scalar multiplication by a positive number never changes direction.' },
      ],
      correct: 1,
    },
    {
      question: 'Your vector search returns the same handful of very long documents no matter what the query is. Most likely cause?',
      options: [
        {
          text: 'You are ranking on the raw dot product with unnormalized embeddings — long documents have large norms, so they score high against everything',
          explanation: 'Correct. a · b scales with ‖b‖, so length masquerades as relevance. L2-normalize on insert (and at query time) and the same dot product becomes cosine similarity.',
        },
        {
          text: 'The embedding dimension is too small',
          explanation: 'Too few dimensions makes results generally mushy — it does not produce a systematic bias toward LONG documents specifically.',
        },
        {
          text: 'The index does not have enough documents in it',
          explanation: 'Adding documents will not stop the long ones from dominating. The scoring rule is what is broken, not the corpus size.',
        },
      ],
      correct: 0,
    },
    {
      question: 'In an attention matrix, before softmax, one single cell is:',
      options: [
        {
          text: "The dot product of one token's query vector with another token's key vector",
          explanation: 'Correct. Every cell of that heatmap is exactly one dot product — which is why attention is just "dot product = similarity" run for all pairs at once.',
        },
        {
          text: 'The number of times those two tokens co-occurred in the training data',
          explanation: 'That is a statistical n-gram idea. Attention is computed live from vectors, fresh for each input sequence.',
        },
        {
          text: 'The cosine similarity of the two token embeddings',
          explanation: 'Close but not right. Attention uses the RAW dot product (scaled by sqrt(d_k), a constant) — it does not divide by each vector\'s own norm, because the model learns its own useful scale.',
        },
      ],
      correct: 0,
    },
    {
      question: 'When is the raw dot product the right choice over cosine similarity?',
      options: [
        {
          text: 'Never — cosine is strictly safer',
          explanation: 'Too absolute. Normalizing deletes magnitude, and sometimes magnitude is genuine signal you paid to learn.',
        },
        {
          text: 'When vector length carries real information — e.g. a recommender where a popular item should legitimately score higher',
          explanation: 'Correct. In matrix factorization the norm often absorbs popularity. Normalize it away and niche items surge while click-through falls.',
        },
        {
          text: 'When the two vectors have different dimensions',
          explanation: 'Neither one works then — the dot product is undefined for mismatched lengths. That is a bug, not a metric choice.',
        },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain the dot product to a product manager in thirty seconds.',
      answer:
        '"It is one number that says how much two things agree. We turn each thing — a search query, a document, a song — into a list of numbers. Multiply the matching entries and add them up: a big number means they point the same way, so they are about the same thing; zero means unrelated." If they want the mechanism: a · b = ‖a‖‖b‖cos θ — a\'s length, b\'s length, and how well their directions agree. What is being tested is whether you can strip a formula down to its job.',
      isCaseBased: false,
    },
    {
      question: 'Why is a · b = ‖a‖ ‖b‖ cos θ? Give the intuition, not a proof.',
      answer:
        'Start with b as a unit vector. Then a · b is exactly the length of a\'s shadow on b\'s line — how far along b you land if you drop a straight down — and basic trigonometry says that shadow is ‖a‖cos θ. Now let b have its own length: scaling b scales the score linearly, giving ‖a‖‖b‖cos θ. So the dot product is "shadow length × the other vector\'s length". The cos θ factor is the only part that depends on alignment, which is exactly why dividing both lengths out (cosine similarity) isolates pure direction agreement.',
      isCaseBased: false,
    },
    {
      question: 'Case: your vector search works fine in testing but in production long documents come back for almost every query. Diagnose and fix it.',
      answer:
        'The symptom is length bias, so suspect the scoring rule first. (1) Are you ranking on the raw dot product with unnormalized embeddings? A long document has a larger norm and the raw dot product multiplies by norm, so it outscores short, genuinely relevant chunks. Fix: L2-normalize every vector on insert and at query time — then the plain dot product is cosine, i.e. direction only. (2) Check chunking: if long documents were embedded whole, one vector is being asked to represent ten topics and becomes a mushy average that is vaguely near everything. Fix: chunk to a few hundred tokens with overlap. (3) Confirm the index metric matches your intent — most vector DBs let you pick inner-product vs cosine vs L2, and a mismatch between how you store and how you score reproduces this exactly. Order matters: normalization is a one-line fix, re-chunking is a full re-index.',
      isCaseBased: true,
    },
    {
      question: 'Cosine similarity vs Euclidean distance for embeddings — do they ever give the same ranking?',
      answer:
        'For unit vectors, they give the identical ranking. Expand the distance: ‖a − b‖² = ‖a‖² − 2(a · b) + ‖b‖², which is 2 − 2(a · b) when both norms are 1. Distance is then a strictly decreasing function of the dot product, so "smallest distance" and "largest cosine" sort the same way. For unnormalized vectors they diverge — Euclidean is sensitive to magnitude, cosine ignores it. The practical consequence: normalize once, then use whichever metric your ANN index runs fastest.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague wants to switch your recommender from raw dot product to cosine similarity "because it is more principled". What do you say?',
      answer:
        'Ask what magnitude currently encodes. In matrix factorization trained on interactions, an item vector\'s norm typically absorbs popularity — a blockbuster ends up with a long vector and correctly scores high for many users. Normalize that away and you will see niche items surge and engagement drop. So: keep the dot product as the relevance score. If the actual complaint is that a few hits dominate every list, that is a diversity problem — fix it with re-ranking, popularity dampening, or an explicit exploration slot, not by destroying a signal you trained. Cosine is right when magnitude is an artifact (document length, encoder confidence) and wrong when magnitude is the signal. Then close the way seniors close: A/B it, and name the metric that would decide.',
      isCaseBased: true,
    },
    {
      question: 'Why do production vector databases normalize embeddings on insert?',
      answer:
        'Two reasons, one semantic and one about speed. Semantic: for text, direction encodes meaning while length mostly reflects incidentals like passage length or encoder confidence, so normalizing removes length as a relevance factor. Speed: after normalization cosine similarity IS the plain dot product — one fused multiply-add sweep, no per-query square roots or divisions — and it maps straight onto the inner-product mode that ANN indexes (HNSW, IVF-PQ) implement fastest. You pay the cost once per vector at write time and get both correctness and the fastest kernel at read time.',
      isCaseBased: false,
    },
    {
      question: 'What does orthogonality actually buy you — in PCA, or in feature design?',
      answer:
        'Orthogonal (dot product zero) means non-redundant: position along one direction tells you nothing about the other. In PCA that is a requirement rather than an aesthetic — each successive component must capture variance the earlier ones could not, otherwise you count the same information twice and the "explained variance" numbers lie. In feature design, correlated (non-orthogonal) features stretch the loss surface into a ravine, which slows gradient descent and makes individual coefficients unstable: a little noise and the weight jumps between two correlated columns, wrecking interpretability. That instability is exactly what Ridge (L2) damps.',
      isCaseBased: false,
    },
    {
      question: 'Case: the same kNN code scores 92% on one dataset and 61% on another where one feature is annual salary and another is a 0/1 flag. What is going on?',
      answer:
        'Distances and dot products are sums over features, so a feature measured in hundreds of thousands drowns out one living in [0, 1] — the model is effectively kNN on salary alone. The geometry is not wrong; the units are. Fix: standardize (z-score) or min-max scale before computing any distance. Two follow-ups that show depth: (a) switching to cosine does not rescue you either, because the giant feature still dominates the direction; (b) if there are also many features, add the curse of dimensionality — in high dimensions nearly all pairs are almost orthogonal and all distances converge, so "nearest" stops meaning anything. Then reduce dimension (PCA) or learn a metric.',
      isCaseBased: true,
    },
    {
      question: 'What is a projection, and where does it show up in ML?',
      answer:
        'The projection of a onto b is a\'s shadow on b\'s line: scalar length a · b / ‖b‖, or as a vector (a · b / ‖b‖²)·b. Read it as "how much of a points along b". It shows up in PCA (dimensionality reduction is literally projecting each point onto the top principal directions), in least squares (the fitted values are the projection of y onto the column space of X, which is why the residual comes out orthogonal to every feature), and in embedding surgery (project a direction out to remove an unwanted attribute). If b is a unit vector the formula collapses to plain a · b — one more argument for normalizing.',
      isCaseBased: false,
    },
    {
      question: 'In transformer attention, scores are divided by sqrt(d_k) before softmax. What does that have to do with the dot product?',
      answer:
        'A dot product is a sum of d_k products. If query and key components are roughly independent with unit variance, that sum has variance about d_k, so raw scores grow like sqrt(d_k) as head dimension grows. Feed large-magnitude scores into softmax and it saturates: one token takes essentially all the weight and the gradient through softmax collapses toward zero, so the layer stops learning. Dividing by sqrt(d_k) returns the scores to unit scale where softmax is still responsive. Note what this is NOT: it is not cosine normalization — it divides by a constant, not by each vector\'s own norm, so the relative magnitudes the model learned survive.',
      isCaseBased: false,
    },
    {
      question: 'Given a 768-dimensional embedding, what does each individual dimension mean?',
      answer:
        'Individually, usually nothing you can name. The honest answer is that meaning lives in directions and relative positions, not in axes: the model was free to rotate its representation arbitrarily during training, so dimension 412 is not "sentiment". This is why you never interpret a single coordinate and why every downstream operation is a dot product, a distance, or a projection — all of which are about relationships between vectors, not about individual slots. When people do find interpretable directions (gender, tense, toxicity) they find them by fitting a direction across many examples, then projecting onto it.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    {
      front: 'A vector, three ways',
      back: 'A list of numbers (ML view: one slot per feature) · an arrow from the origin · a point. Same object — pick whichever view answers the question.',
    },
    {
      front: 'L2 norm vs L1 norm',
      back: 'L2 = sqrt(sum of squares) = straight-line length = sqrt(a·a). L1 = sum of absolute values = taxi distance. The split behind Ridge vs Lasso.',
    },
    {
      front: 'Normalize / unit vector',
      back: 'â = a / ‖a‖. Length becomes exactly 1, direction unchanged. Keeps "which way", drops "how much".',
    },
    {
      front: 'Dot product, both formulas',
      back: 'a·b = Σ aᵢbᵢ  =  ‖a‖‖b‖cos θ. The first is how to compute it; the second is what it means.',
    },
    {
      front: 'Reading the sign of a·b',
      back: 'Positive = same direction. Zero = orthogonal, unrelated. Negative = pointing opposite.',
    },
    {
      front: 'The one-line takeaway',
      back: 'Dot product = similarity score. It powers attention, semantic search/RAG, recommenders and kNN — all the same arithmetic.',
    },
    {
      front: 'Cosine similarity',
      back: 'a·b / (‖a‖‖b‖) — the dot product of the normalized vectors. Always in [−1, 1]. Length stops counting as relevance.',
    },
    {
      front: 'Cosine vs raw dot: which when?',
      back: 'Cosine when length is an artifact (text embeddings, RAG, dedup). Raw dot when length is real signal (popularity in recommenders, attention).',
    },
    {
      front: 'Orthogonal',
      back: 'a·b = 0, right angle, zero shared information. PCA requires it; in high dimensions almost every random pair is nearly orthogonal.',
    },
    {
      front: 'Projection (the shadow)',
      back: 'How much of a points along b: a·b / ‖b‖ (just a·b if b is a unit vector). PCA and least squares are projections.',
    },
  ],
  mindmapMarkdown: `- Vectors & the Dot Product (= Similarity)
  - Vector = list = arrow = point
    - ML view: one slot per feature
    - Add componentwise, scale to stretch or flip
  - Norms (how long)
    - L2 = sqrt(sum of squares) = sqrt(a·a)
    - L1 = sum of |values| → Lasso vs Ridge
  - Unit vectors
    - â = a / ‖a‖, length exactly 1
    - Why embeddings get normalized
  - Dot product
    - Sum of matching products
    - = ‖a‖‖b‖cos θ
    - Sign: + same, 0 orthogonal, − opposite
  - Dot product = similarity
    - Attention scores (GenAI)
    - Semantic search / RAG / vector DB
    - Recommenders and kNN distance
  - Cosine vs raw dot
    - Cosine when length is an artifact
    - Raw dot when length is real signal
    - Normalize on insert → dot IS cosine
  - Orthogonality
    - a·b = 0, zero shared information
    - PCA needs orthogonal directions
    - High dims: almost every pair is near-orthogonal
  - Projection
    - Shadow a·b / ‖b‖ — under PCA and least squares`,
}

export default m
