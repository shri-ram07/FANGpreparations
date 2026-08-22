import type { Module } from '../types'

const m: Module = {
  id: 'ml-l2-knn',
  subjectId: 'ml',
  level: 2,
  title: 'k-Nearest Neighbours',
  whyItMatters:
    'The simplest classifier there is — it does no training at all. That simplicity makes it the clearest place to meet two ideas that break far more sophisticated models: feature scaling, and the curse of dimensionality.',
  assumes: [
    'You know what a square root is',
    'You have seen a Python list, a for loop and a function',
  ],
  estMinutes: 22,
  sections: [
    {
      type: 'intuition',
      title: 'What k-NN is',
      md: `**k-nearest neighbours** classifies a new point by finding the *k* stored points closest to it and taking a majority vote of their labels.

There is no training step. The model *is* the stored data, which is why it is called a **lazy learner** — all the work happens at prediction time.

Two things you must supply: a **distance** (normally Euclidean) and a value for **k**.`,
    },
    {
      type: 'math',
      intro:
        'Euclidean distance, and the rescaling that has to come first. Note where min and max are taken — over the TRAINING data only. Computing them over everything lets the test rows influence the transform, which is leakage.',
      latex: [
        'd(a, b) = \\sqrt{\\sum_{j=1}^{d} (a_j - b_j)^2} \\qquad \\text{square each gap, add, take the root}',
        'x_j^{\\text{scaled}} = \\frac{x_j - \\min_j}{\\max_j - \\min_j} \\qquad \\text{min and max taken over the TRAINING data only}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Sort by distance, keep k, count the votes',
      code: `def distance(a, b):
    total = 0.0
    for j in range(len(a)):
        total = total + (a[j] - b[j]) ** 2
    return total ** 0.5

points = [([1, 1], 'lime'), ([2, 1], 'lime'), ([1, 3], 'lime'),
          ([5, 5], 'melon'), ([6, 5], 'melon'), ([5, 6], 'melon')]

def classify(points, query, k):
    scored = [(distance(f, query), label) for f, label in points]
    scored.sort()
    votes = {}
    for dist, label in scored[:k]:
        votes[label] = votes.get(label, 0) + 1
    return max(votes, key=votes.get), votes

print(classify(points, [2, 2], 1))
print(classify(points, [2, 2], 3))
print(classify(points, [2, 2], 5))

# ---- real output ----
# ('lime', {'lime': 1})
# ('lime', {'lime': 3})
# ('lime', {'lime': 3, 'melon': 2})`,
      annotations: {
        12: 'A list comprehension pairing each stored point with its distance to the query. Distance comes FIRST in the tuple so that sorting orders by it.',
        13: 'sort() on tuples compares the first element, so this is a sort by distance. This line is the entire "training".',
        16: 'votes.get(label, 0) returns the count so far or 0 if this label is new — the standard way to build a tally without checking for the key first.',
        17: 'max(votes, key=votes.get) returns the KEY with the largest value, not the value itself.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'What k actually controls',
      code: `line = []
for x in range(1, 11):
    line.append(([x], 'A'))
line[4] = ([5], 'B')
for x in (11, 12, 13):
    line.append(([x], 'B'))

for k in (1, 3, 7):
    print('k =', k, '| 5.1 ->', classify(line, [5.1], k),
          '| 12.0 ->', classify(line, [12.0], k))

# ---- real output ----
# k = 1 | 5.1 -> ('B', {'B': 1}) | 12.0 -> ('B', {'B': 1})
# k = 3 | 5.1 -> ('A', {'B': 1, 'A': 2}) | 12.0 -> ('B', {'B': 3})
# k = 7 | 5.1 -> ('A', {'B': 1, 'A': 6}) | 12.0 -> ('A', {'B': 3, 'A': 4})`,
      annotations: {
        4: 'Position 5 is deliberately mislabelled B in a run of A. It is the noise point, and how k handles it is the whole lesson.',
        13: 'k = 1 at position 5.1: it answers B, having copied the single mislabelled neighbour. Low k means low bias and high variance — it will reproduce every error in the training data.',
        14: 'k = 3 at 5.1: A, by 2 votes to 1. The noise point is outvoted. This is the value that gets both queries right.',
        15: 'k = 7 at 12.0: A, which is now WRONG. Too large a k reaches so far that it drags in the other class entirely. High k means high bias.',
      },
    },
    {
      type: 'visual',
      component: 'DecisionBoundaryPlayground',
      props: {},
    },
    {
      type: 'note',
      label: 'What the picture shows',
      md: `Set the model to kNN and drag k. At k = 1 every stored point owns a small patch of colour, including any point sitting in the wrong place — the boundary is jagged and reproduces the noise exactly.

Raise k and the patches merge; the boundary smooths and stops chasing individual points. Raise it far enough and it flattens past the real structure.

k is a bias–variance dial with the two extremes visible on screen.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Feature scaling: the step you cannot skip',
      code: `train = [[25, 300000], [31, 550000], [40, 700000], [55, 501000], [60, 900000]]
query = [30, 500000]

for row in train:
    print(row, 'raw distance =', round(distance(row, query), 2))

# ---- real output ----
# [25, 300000] raw distance = 200000.0
# [31, 550000] raw distance = 50000.0
# [40, 700000] raw distance = 200000.0
# [55, 501000] raw distance = 1000.31
# [60, 900000] raw distance = 400000.0`,
      annotations: {
        1: 'Age in years, income in rupees. Both are genuinely informative, and both are on wildly different scales.',
        8: 'The nearest neighbour is [55, 501000] at distance 1000.31 — a 55-year-old matched to a 30-year-old, purely because their incomes are close.',
        9: 'Age contributes at most 35 to the distance; income contributes hundreds of thousands. Squared, age is invisible. The model is doing nearest-income, not nearest-neighbour.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same five people, rescaled to 0–1',
      code: `lo = [25, 300000]
hi = [60, 900000]

def scale(row):
    out = []
    for j in range(2):
        out.append((row[j] - lo[j]) / (hi[j] - lo[j]))
    return out

for row in train:
    s = scale(row)
    print(row, 'scaled =', [round(s[0], 3), round(s[1], 3)],
          'distance =', round(distance(s, scale(query)), 3))

# ---- real output ----
# [25, 300000] scaled = [0.0, 0.0] distance = 0.363
# [31, 550000] scaled = [0.171, 0.417] distance = 0.088
# [40, 700000] scaled = [0.429, 0.667] distance = 0.439
# [55, 501000] scaled = [0.857, 0.335] distance = 0.714
# [60, 900000] scaled = [1.0, 1.0] distance = 1.086`,
      annotations: {
        1: 'lo and hi come from the TRAINING rows. Reading them off the full dataset would let test rows shape the transform.',
        7: 'Min-max scaling: subtract the minimum, divide by the range. Every column now runs 0 to 1, so a unit of one means the same as a unit of the other.',
        15: 'The nearest neighbour is now [31, 550000] at 0.088 — a 31-year-old matched to a 30-year-old, which is what anyone would have said by eye. The 55-year-old has fallen to 0.714.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The curse of dimensionality, watched',
      code: `import random

def random_point(d):
    return [random.random() for _ in range(d)]

random.seed(0)
for d in (2, 10, 100, 1000):
    query = random_point(d)
    dists = [distance(random_point(d), query) for _ in range(500)]
    near = min(dists)
    far = max(dists)
    print(d, round(near, 2), round(far, 2), round((far - near) / near, 3))

# ---- real output ----
# 2 0.03 1.09 37.626
# 10 0.57 1.93 2.358
# 100 3.28 4.71 0.438
# 1000 12.21 13.5 0.105`,
      annotations: {
        7: '500 random points in d dimensions, and the distance from each to a random query. Nothing here has any structure — that is the point.',
        13: 'In 2D the farthest point is 37 times further than the nearest. "Nearest" clearly means something.',
        16: 'In 1000D the farthest is only 10% further than the nearest. Every point is essentially the same distance away, so "the k nearest" is close to picking k at random. That is the curse of dimensionality, and it breaks every distance-based method.',
      },
    },
  ],
  quiz: [
    {
      question: 'Why is k-NN called a lazy learner?',
      options: [
        { text: 'Because it is slow to predict', explanation: 'It is slow to predict, but the name refers to what it does at training time.' },
        { text: 'It does no training at all — the model is the stored data, and all work happens at prediction', explanation: 'Correct. Fitting is just memorising, which is why prediction cost grows with the training set.' },
        { text: 'Because it uses a simple distance function', explanation: 'The distance choice is unrelated to the term.' },
        { text: 'Because it ignores most of the features', explanation: 'It uses every feature — arguably too indiscriminately.' },
      ],
      correct: 1,
    },
    {
      question: 'At position 5.1 with a mislabelled point at 5, k = 1 answered B and k = 3 answered A. What does that show?',
      options: [
        { text: 'k = 1 is always wrong', explanation: 'k = 1 got the 12.0 query right; it is not uniformly wrong.' },
        { text: 'Low k copies noise (high variance); larger k outvotes it', explanation: 'Correct. k = 1 reproduces every error in the training data because it consults exactly one point.' },
        { text: 'The data was corrupted', explanation: 'The point at 5 is deliberately mislabelled to make this visible.' },
        { text: 'Larger k is always better', explanation: 'k = 7 got 12.0 wrong by reaching into the other class — too much bias.' },
      ],
      correct: 1,
    },
    {
      question: 'Unscaled, the nearest neighbour to a 30-year-old earning 500,000 was a 55-year-old at distance 1000.31. Why?',
      options: [
        { text: 'Because 55 and 30 are genuinely close in age', explanation: 'They are 25 years apart — the model is not looking at age in any meaningful way.' },
        { text: 'Income spans hundreds of thousands and age spans 35, so squared, age contributes essentially nothing', explanation: 'Correct. The model was doing nearest-income and calling it nearest-neighbour.' },
        { text: 'The distance function has a bug', explanation: 'It is standard Euclidean distance, computed correctly.' },
        { text: 'k was set too low', explanation: 'Every value of k would rank by the same broken distances.' },
      ],
      correct: 1,
    },
    {
      question: 'Where must the min and max for scaling be computed?',
      options: [
        { text: 'On the training rows only', explanation: 'Correct. Taking them over the full dataset lets test rows shape the transform, which is leakage.' },
        { text: 'On the full dataset, for consistency', explanation: 'That is the leak.' },
        { text: 'Separately for train and test', explanation: 'Then the two sets sit on different scales and distances between them are meaningless.' },
        { text: 'It does not matter for min-max scaling', explanation: 'It matters for any fitted transform.' },
      ],
      correct: 0,
    },
    {
      question: 'In 1000 dimensions the farthest of 500 random points was only 10% further than the nearest. What does that mean for k-NN?',
      options: [
        { text: 'It runs faster in high dimensions', explanation: 'It runs slower — more coordinates per distance.' },
        { text: 'Distances become nearly equal, so "the k nearest" is close to picking k points at random', explanation: 'Correct. The curse of dimensionality removes the meaning from the concept the algorithm rests on.' },
        { text: 'You should increase k', explanation: 'No value of k helps when every point is equidistant.' },
        { text: 'It only affects Euclidean distance', explanation: 'It affects distance concentration generally, including Manhattan and cosine to varying degrees.' },
      ],
      correct: 1,
    },
    {
      question: 'Which is the honest description of what k controls?',
      options: [
        { text: 'A bias–variance dial: low k is high variance, high k is high bias', explanation: 'Correct. k = 1 reproduced the noise point; k = 7 reached past the real boundary.' },
        { text: 'The number of features considered', explanation: 'k has nothing to do with features.' },
        { text: 'How long training takes', explanation: 'There is no training.' },
        { text: 'The distance metric used', explanation: 'That is a separate choice.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'How do you choose k?',
      answer:
        'Cross-validation over a range, and the shape of the curve tells you more than the winner does. Low k has high variance and reproduces label noise — at k = 1 a single mislabelled point flipped the answer. High k has high bias and eventually reaches past the real boundary — at k = 7 the model answered A for a query surrounded by B. An odd k avoids ties in binary problems. If the best k found is very large relative to the dataset, that usually means k-NN is the wrong model rather than that k should be large.',
      isCaseBased: false,
    },
    {
      question: 'Why does k-NN need feature scaling more than most models?',
      answer:
        'Because distance is the entire model — there is no weight to absorb a scale difference. With age in years and income in rupees, income spans hundreds of thousands against age\'s 35, so squared it dominates completely: the nearest neighbour to a 30-year-old came out as a 55-year-old, purely on income. After min-max scaling the nearest became a 31-year-old. A linear model would simply learn a small coefficient for income; k-NN has nowhere to put that adjustment.',
      isCaseBased: true,
    },
    {
      question: 'Explain the curse of dimensionality.',
      answer:
        'As dimensions grow, the distances between random points concentrate — the nearest and farthest become nearly the same. Measured on 500 random points: in 2D the farthest was 37 times further than the nearest, in 100D 0.44 times, in 1000D only 0.105 times. Once every point is roughly equidistant, "the k nearest" is close to an arbitrary selection, and any method built on distance loses its meaning. It is also why you cannot fix high-dimensional k-NN by tuning k — the problem is upstream of that.',
      isCaseBased: false,
    },
    {
      question: 'What are the real costs of k-NN in production?',
      answer:
        'Prediction cost and memory. Every prediction scans the training set, so latency grows with data — the opposite of most models, which are expensive to train and cheap to serve. The whole dataset must be resident. Mitigations are KD-trees or ball-trees, which help in low dimensions and degrade to brute force in high ones, and approximate nearest neighbour libraries like FAISS or HNSW, which give up exactness for large speedups. If the data changes constantly, k-NN\'s lack of a training step becomes an advantage.',
      isCaseBased: false,
    },
    {
      question: 'When is k-NN actually a good choice?',
      answer:
        'When the decision boundary is genuinely irregular and you have plenty of data in few dimensions — it makes no assumption about the shape of the boundary at all. When you need a strong baseline in five minutes. When the underlying task is really retrieval, which is why embedding search is k-NN at heart — with modern embeddings the dimensions are high but the vectors are structured, so distances still separate. It is a poor choice for high-dimensional sparse data, tight latency budgets, or anywhere you need an explanation beyond "these five rows looked similar".',
      isCaseBased: false,
    },
    {
      question: 'Your k-NN scores 0.95 in validation and 0.60 in production. What do you check first?',
      answer:
        'Whether the scaler was fitted on the full dataset. It is the most common k-NN leak: computing min and max over everything before splitting lets test rows influence the transform, which inflates validation. Then whether production data is scaled with the same stored parameters rather than recomputed on each batch — recomputing on a batch with a different range silently moves every point. Then whether duplicate or near-duplicate rows spanned the split, which k-NN rewards more than any other model since it can retrieve the twin directly.',
      isCaseBased: true,
    },
    {
      question: 'Does k-NN do regression?',
      answer:
        'Yes — take the mean or median of the k neighbours\' values instead of a majority vote. Median is more robust to an outlier neighbour. It shares every property of the classifier: no training, prediction cost scaling with data, mandatory scaling, and vulnerability to dimensionality. One extra limitation is that it cannot extrapolate at all: any query beyond the range of the training data receives an average of the nearest edge points.',
      isCaseBased: false,
    },
    {
      question: 'Would distance weighting help?',
      answer:
        'Often, yes. Weighting each neighbour by 1/distance lets a very close point count for more than one at the edge of the neighbourhood, which softens the choice of k considerably — a large k stops being catastrophic because the far neighbours barely vote. It also removes ties. The caveat is that it makes the model more sensitive to a single very close point, which reintroduces some of the k = 1 variance problem, and it needs a guard for distance exactly zero.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'k-NN, in one sentence', back: 'Find the k closest stored points and take a majority vote of their labels. No training — the model is the data.' },
    { front: 'Euclidean distance', back: 'd(a,b) = sqrt(Σ(aⱼ − bⱼ)²). Square each gap, add, take the root.' },
    { front: 'What k controls', back: 'A bias–variance dial. k = 1 copied a mislabelled point; k = 7 reached into the wrong class. k = 3 got both queries right.' },
    { front: 'Why scaling is mandatory', back: 'Distance IS the model, so there is no weight to absorb a scale gap. Unscaled, a 30-year-old\'s nearest neighbour was a 55-year-old at distance 1000.31; scaled, it was a 31-year-old at 0.088.' },
    { front: 'Where do min and max come from?', back: 'The training rows only. Computing them over the full dataset lets test rows shape the transform — leakage.' },
    { front: 'The curse of dimensionality', back: 'Distances concentrate. Farthest-over-nearest gap: 37.6× in 2D, 0.438 in 100D, 0.105 in 1000D. "Nearest" stops meaning anything.' },
    { front: 'Production cost', back: 'Every prediction scans the training set — latency grows with data, and all of it must stay in memory. Opposite profile to most models.' },
    { front: 'Distance weighting', back: 'Weight neighbours by 1/distance so close points count more. Softens the choice of k and removes ties.' },
  ],
  mindmapMarkdown: `- k-Nearest Neighbours
  - What it is
    - k closest stored points vote
    - NO training: the model is the data (lazy)
    - needs a distance and a k
  - k is a bias-variance dial
    - k=1: copies the mislabelled point at 5 (variance)
    - k=3: outvotes it, both queries right
    - k=7: reaches into the other class (bias)
  - Scaling is mandatory
    - distance IS the model, no weight to absorb scale
    - raw: nearest to (30, 500k) is a 55-year-old, d=1000.31
    - scaled: nearest is a 31-year-old, d=0.088
    - min/max from TRAINING only
  - Curse of dimensionality
    - (far - near)/near: 37.6 at 2D
    - 0.438 at 100D, 0.105 at 1000D
    - every point equidistant -> k nearest is arbitrary
  - Production
    - prediction scans the whole training set
    - KD-tree / ball-tree / FAISS, HNSW
    - embedding search is k-NN at heart`,
}

export default m
