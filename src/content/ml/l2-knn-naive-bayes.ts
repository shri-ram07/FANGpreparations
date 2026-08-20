import type { Module } from '../types'

const m: Module = {
  id: 'ml-l2-knn-naive-bayes',
  subjectId: 'ml',
  level: 2,
  title: 'k-NN & Naive Bayes: The Two Simplest Classifiers',
  whyItMatters:
    'These are the two classifiers you can compute by hand on paper. k-NN labels a new point by looking at the points nearest to it, so it turns "which examples are similar?" into arithmetic you can check line by line. Naive Bayes labels a new example by counting words and multiplying fractions. Between them they teach three things every later model relies on: what a distance actually measures, why features measured in different units must be rescaled before you compare them, and how to turn counts into a probability without dividing by zero.',
  assumes: [
    'You know what a square root is, and how to square a number',
    'You have seen a Python list, a dict, a for loop and a function',
    'You have read *Probability and Statistics, Built From Counting* in the Math subject — Bayes\' rule is used here, not re-derived',
    'You have read *The Confusion Matrix: Precision, Recall & F1*, so "classifier", "label" and "accuracy" already mean something to you',
  ],
  estMinutes: 52,
  sections: [
    {
      type: 'intuition',
      title: 'Six labelled points, one new point, one vote',
      md: `Here are six fruits. Each one has two measurements written down: **width in cm** and **height in cm**. Each one already has a label, written by a person who looked at it.

- (1, 1) lime, (2, 1) lime, (1, 3) lime
- (5, 5) melon, (6, 5) melon, (5, 6) melon

Now a seventh fruit arrives, measured at **(2, 2)**, with no label. What is it?

- Look at the six labelled fruits and ask which ones are closest to (2, 2) on the grid.
- The lime at (2, 1) is one step below. The limes at (1, 1) and (1, 3) are a bit further. The melons sit far away up and to the right.
- Take the three closest. All three are limes. Three votes for lime, zero for melon.
- The answer is **lime**.

That is the whole algorithm. Nothing was trained, no equation was fitted, no number was adjusted. You looked at the stored examples and counted.`,
    },
    {
      type: 'intuition',
      title: 'The five words that just did the work',
      md: `Each of these is used constantly from here on, so each gets a plain definition now.

- **Distance** — a single number saying how far apart two points are. For points measured on a grid, use the school formula: square each gap, add the squares, take the square root. From (2, 2) to (1, 1): the gaps are 1 and 1, so the distance is the square root of 1 + 1 = 1.414. From (2, 2) to (5, 5): gaps 3 and 3, so square root of 9 + 9 = 4.243. This particular formula is called **Euclidean distance**.
- **Neighbour** — one of the stored labelled points, considered from the point of view of the new point. The nearest neighbour is simply the stored point with the smallest distance.
- **k** — how many neighbours you are allowed to look at. It is a whole number you choose, not something the data tells you. k = 3 means "look at the three closest and ignore everything else".
- **Majority vote** — count the labels among those k neighbours and take whichever label appears most often. Two limes and one melon means lime.
- **Decision boundary** — imagine colouring in every possible point on the grid with the label this procedure would give it. The line where the colour changes from lime to melon is the decision boundary. k-NN never writes this line down; the line is just the consequence of where the stored points sit.

And one more, about what did *not* happen:

- **Lazy learning** — the model has no training step at all. Training a k-NN model means copying the labelled examples into memory and stopping. All the work happens later, when a new point arrives and you measure it against every stored example. Most models are the opposite: hours of fitting up front, then a fast prediction. k-NN pays nothing up front and pays for every single prediction, forever.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 1: the distance formula, on the six real fruits',
      code: `import math

def distance(a, b):
    total = 0.0
    for i in range(len(a)):
        gap = a[i] - b[i]
        total = total + gap * gap
    return math.sqrt(total)

points = [([1, 1], 'lime'), ([2, 1], 'lime'), ([1, 3], 'lime'),
          ([5, 5], 'melon'), ([6, 5], 'melon'), ([5, 6], 'melon')]
query = [2, 2]

for features, label in points:
    print(features, label, round(distance(features, query), 3))

# ---- real output ----
# [1, 1] lime 1.414
# [2, 1] lime 1.0
# [1, 3] lime 1.414
# [5, 5] melon 4.243
# [6, 5] melon 5.0
# [5, 6] melon 5.0`,
      annotations: {
        1: 'math is the standard library module that holds sqrt. Nothing is installed; it ships with Python.',
        3: 'Defines a function taking two points, a and b. Each point is a list of measurements, so a[0] is width and a[1] is height.',
        4: 'A running total, starting at zero. It will collect the squared gaps one at a time.',
        5: 'len(a) is how many measurements a point has - 2 here. range(2) gives i = 0 then i = 1, so the loop visits width, then height.',
        6: 'The gap in measurement number i. For (2,2) against (1,1) this is 1 on the first pass and 1 on the second.',
        7: 'Square the gap and add it to the total. Squaring makes the result positive whichever point is bigger, so direction never matters.',
        8: 'The square root of the summed squares. That is the whole Euclidean formula: square, add, root.',
        10: 'The six labelled fruits. Each entry is a pair: a list of measurements, and the label a person wrote. This list IS the model.',
        11: 'The three melons, continuing the same list. Python allows a list to run over several lines inside its brackets.',
        12: 'The new fruit, measured but unlabelled. It has no label attached because that is what we are trying to work out.',
        14: 'Walk the six stored fruits. "for features, label in points" unpacks each pair into two names at once, so features is the list and label is the string.',
        15: 'Print the fruit, its label, and its distance from the query, rounded to 3 decimal places. Compare these to the hand arithmetic above: 1.414 and 4.243 match exactly.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 2: sort by distance, keep k, count the votes',
      code: `def classify(points, query, k):
    scored = []
    for features, label in points:
        scored.append((distance(features, query), label))
    scored.sort()
    votes = {}
    for dist, label in scored[:k]:
        votes[label] = votes.get(label, 0) + 1
    winner = max(votes, key=votes.get)
    return winner, votes

print(classify(points, [2, 2], 1))
print(classify(points, [2, 2], 3))
print(classify(points, [2, 2], 5))

# ---- real output ----
# ('lime', {'lime': 1})
# ('lime', {'lime': 3})
# ('lime', {'lime': 3, 'melon': 2})`,
      annotations: {
        1: 'Takes the stored points, the new point, and k. This is the complete k-NN prediction step - there is nothing else.',
        2: 'An empty list that will hold one (distance, label) pair per stored point.',
        3: 'Visit every stored point, unpacking it into its measurements and its label.',
        4: 'Measure this point against the query and append the pair. A pair written with round brackets is a tuple - a fixed-length group of values.',
        5: 'Sort the pairs. Python sorts tuples by their first element, which is the distance, so this puts the nearest point first.',
        6: 'An empty dict: a table from label to count. Keys will be the strings lime and melon.',
        7: 'scored[:k] is a slice - the first k entries of the sorted list, that is, the k nearest neighbours. Everything past position k is ignored.',
        8: 'Add one to this label\'s count. votes.get(label, 0) reads the current count, returning 0 if the label has not been seen yet, so the first vote works without any setup.',
        9: 'max over the dict\'s keys, but comparing them by votes.get - that is, by their counts rather than alphabetically. So winner is the label with the most votes.',
        10: 'Hand back both the winning label and the full vote table, so you can see how close the vote was.',
        12: 'k = 1: only the lime at (2,1) is consulted. One vote, one winner.',
        13: 'k = 3: the three nearest are all limes, exactly as counted by hand.',
        14: 'k = 5: two melons now get inside the window and vote, but 3 beats 2 and the answer is unchanged. Widening k changes who is heard, not necessarily who wins.',
      },
    },
    {
      type: 'intuition',
      title: 'What k actually controls, with a set you can check',
      md: `Take a one-measurement dataset, so every point is just a position on a number line. Thirteen labelled points:

- Positions 1 to 10 are class **A**, except position 5, which a tired human labelled **B** by mistake. That one wrong label is the **noise** in this dataset.
- Positions 11, 12, 13 are class **B**. A small, genuine cluster of three.

Now ask two questions.

**Query at 5.1.** Its single nearest point is position 5 — the mislabelled one. So k = 1 answers **B**, which is wrong. At k = 3 the neighbours are positions 5, 6 and 4, whose labels are B, A, A: two votes to one, the answer is **A**, which is right. Small k copies the mistake; the vote outvotes it.

**Query at 12.0.** It sits in the middle of the genuine B cluster. At k = 3 the neighbours are 12, 11, 13, all B, and the answer is **B** — right. Push to k = 7 and the neighbours are 12, 11, 13, 10, 9, 8, 7. That is three B and four A: the answer flips to **A**, which is wrong. The window grew wider than the cluster it was supposed to find, so it filled up with the majority class.

So one dial, two failure modes at its two ends:

- **k too small** — the prediction copies whatever the single closest label says, including a wrong one. The decision boundary grows a little island around every noisy point.
- **k too large** — the window swallows regions bigger than the real structure, and small groups get voted out of existence by whichever class is more common.
- **k = n** (n = all your points) — every query sees the whole dataset and returns the overall most common label. The model is a constant. That is the far end of the dial.
- A common starting guess is k around the square root of n; then try a few values and keep the one that scores best on data the model has not seen.
- Use an **odd** k for two-class problems so a vote cannot tie.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 3: the same thirteen points, three values of k',
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
        1: 'Start with an empty list of labelled points.',
        2: 'range(1, 11) counts 1 through 10 - the second number is where it stops, and is not included.',
        3: 'Append one point at position x, labelled A. The measurements are a one-item list because distance() expects a list.',
        4: 'Overwrite entry number 4 - which is position 5, since Python counts from zero - with the label B. This is the deliberate noise point.',
        5: 'The three genuine B points, written as a tuple of positions.',
        6: 'Append each of them with label B. The dataset is now 13 points.',
        8: 'Try three window sizes on the same data. Only k changes between rows.',
        9: 'Ask about the query at 5.1, right beside the noisy point.',
        10: 'And about the query at 12.0, in the middle of the real B cluster. Read the output as a table: k = 3 is the only row that gets both queries right.',
      },
    },
    { type: 'visual', component: 'DecisionBoundaryPlayground', props: { model: 'knn' } },
    {
      type: 'note',
      md: `Drag the k slider and watch exactly what you just computed. At k = 1 every stored point owns a small patch of colour, including the few points sitting deep inside the other colour, so the boundary grows islands around them. Training accuracy is 100% at k = 1 by construction: the nearest point to a stored point is itself. Raise k and the islands dissolve into one smooth curve that no single point can bend. Same data, same code, one whole number changed.`,
    },
    {
      type: 'intuition',
      title: 'Feature scaling: the step you cannot skip',
      md: `Every measurement so far was in centimetres. Now mix units. Each person has an **age in years** and an **income in rupees per year**. Here is the stored data:

- (25, 300000), (31, 550000), (40, 700000), (55, 501000), (60, 900000)

A new person arrives: **age 30, income 500000**. Who is their nearest neighbour?

Do two of them by hand.

- Against **(31, 550000)**: age gap 1, income gap 50000. Squares: 1 and 2,500,000,000. Sum 2,500,000,001. Square root: **50000.0**.
- Against **(55, 501000)**: age gap 25, income gap 1000. Squares: 625 and 1,000,000. Sum 1,000,625. Square root: **1000.31**.

So the 55-year-old is judged **fifty times nearer** than the 31-year-old, even though they are 25 years apart in age. Look at where that number came from: in the second sum, age contributed 625 out of 1,000,625, which is **0.06%**. Age did not get a small vote. It got no vote.

The cause is units, not importance. Incomes are counted in hundreds of thousands; ages in tens. Squaring makes the mismatch enormous. Nothing about the person changed — only the size of the numbers used to write them down.

**The fix is rescaling: put every measurement on the same 0-to-1 range before measuring any distance.** The simplest version, called min-max scaling, is one subtraction and one division:

- Find the smallest and largest value the measurement takes in the stored data. For age that is 25 and 60; for income, 300000 and 900000.
- Replace each value with (value − smallest) ÷ (largest − smallest). The smallest becomes 0, the largest becomes 1, everything else lands in between.
- Age 30 becomes (30 − 25) ÷ 35 = 0.143. Income 500000 becomes (500000 − 300000) ÷ 600000 = 0.333.

Now redo the same two comparisons on the rescaled numbers, and the ranking flips.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 4: the raw ranking, in rupees',
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
        1: 'The five stored people, each written as [age, income]. No labels here - we only care about who is nearest.',
        2: 'The new person: 30 years old, 500000 a year.',
        4: 'Walk the five stored people.',
        5: 'Print each one with its distance from the query, using the same distance() from part 1. Read the output: the winner is the 55-year-old at 1000.31, and every other number is in the tens or hundreds of thousands. Those are rupee gaps wearing the word "distance".',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 5: the same five people, rescaled to 0-1',
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
        1: 'The smallest age and the smallest income in the stored data. Read straight off the table above.',
        2: 'The largest age and the largest income.',
        4: 'A function that rescales one person - both measurements - and hands back the rescaled pair.',
        5: 'An empty list to collect the two rescaled values.',
        6: 'range(2) visits measurement 0 (age) then measurement 1 (income).',
        7: 'Subtract that measurement\'s smallest value, divide by its span. The result is 0 for the smallest person, 1 for the largest, in between for everyone else.',
        8: 'Return the rescaled pair, ready to be handed to distance().',
        10: 'Walk the same five people again. The data has not changed, only the units it is expressed in.',
        11: 'Rescale this person once and reuse the result twice on the next line.',
        12: 'Print the original row and its rescaled version so the two are side by side.',
        13: 'And the distance between the rescaled person and the rescaled query. The nearest is now the 31-year-old at 0.088, and the 55-year-old has fallen from first place to fourth at 0.714. Same people, same formula, ranking reversed.',
      },
    },
    {
      type: 'math',
      intro: 'The two formulas used above, in symbols. There are d measurements per point; a and b are two points; j counts the measurements.',
      latex: [
        'd(a, b) = \\sqrt{\\sum_{j=1}^{d} (a_j - b_j)^2} \\qquad \\text{square each gap, add, take the root}',
        'x_j^{\\text{scaled}} = \\frac{x_j - \\min_j}{\\max_j - \\min_j} \\qquad \\text{min and max taken over the TRAINING data only}',
      ],
    },
    {
      type: 'note',
      md: `That last phrase matters. The smallest and largest values must be read off the training data alone, never off the full dataset. If you compute them over everything, facts about your test data have quietly entered the model, and your measured accuracy will be better than the accuracy you actually get in production. The same warning applies to any rescaling recipe, including the other common one: subtract the average and divide by the spread, which is called standardization.`,
    },
    {
      type: 'intuition',
      title: 'The curse of dimensionality, in plain words',
      md: `Everything so far used two measurements per point. Real data often has hundreds. Adding measurements does not just make k-NN slower — it makes the word "nearest" stop meaning anything.

Here is why, without any formula. Distance is a sum of squared gaps, one term per measurement. Add a measurement and you add another positive term to every single distance. With hundreds of measurements, each pair of points accumulates hundreds of gaps, and those gaps average out: the pairs that were close on one measurement are far on another. Every distance drifts toward the same middling value.

So the useful thing to measure is not the distance itself but the **contrast**: how much farther the farthest point is than the nearest one, as a fraction. Take the farthest distance, subtract the nearest, divide by the nearest.

- If that number is large, the nearest point is genuinely, distinctly close, and picking neighbours is meaningful.
- If it is near zero, the nearest and farthest points are nearly the same distance away, and "the 5 nearest" is a list of 5 more or less arbitrary points.

The snippet below scatters 500 random points, picks one query, and measures the contrast as the number of measurements grows.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 6: watch "nearest" lose its meaning',
      code: `import random

def random_point(d):
    row = []
    for j in range(d):
        row.append(random.random())
    return row

random.seed(0)
# printed columns: d, nearest, farthest, (far - near) / near
for d in (2, 10, 100, 1000):
    query = random_point(d)
    dists = []
    for i in range(500):
        dists.append(distance(random_point(d), query))
    near = min(dists)
    far = max(dists)
    print(d, round(near, 2), round(far, 2), round((far - near) / near, 3))

# ---- real output ----
# 2 0.03 1.09 37.626
# 10 0.57 1.93 2.358
# 100 3.28 4.71 0.438
# 1000 12.21 13.5 0.105`,
      annotations: {
        1: 'random is the standard library module for random numbers. Nothing installed.',
        3: 'Builds one point with d measurements, each a random number.',
        4: 'Start with an empty list of measurements.',
        5: 'Loop d times, once per measurement.',
        6: 'random.random() returns a random number between 0 and 1. Append it.',
        7: 'Hand back the finished point.',
        9: 'seed(0) fixes the random number sequence, so re-running this file prints exactly the numbers pasted below.',
        11: 'Four experiments: 2 measurements per point, then 10, then 100, then 1000.',
        12: 'One random query point with d measurements.',
        13: 'A list to collect its distance to every other point.',
        14: 'Make 500 other random points, one per pass.',
        15: 'Measure the distance from each new random point to the query and store it.',
        16: 'min() over the list is the distance to the nearest of the 500 points.',
        17: 'max() is the distance to the farthest.',
        18: 'Print the contrast. Read the output down the last column: at d = 2 the farthest point is 37 times farther than the nearest, at d = 100 it is 44% farther, and at d = 1000 it is only 10% farther. Sorting 500 points by distance in 1000 dimensions barely separates them.',
      },
    },
    {
      type: 'intuition',
      title: 'Naive Bayes: turn the question around',
      md: `Second classifier, completely different machinery. The question is: given the words in an email, is it spam?

Writing down P(spam given these exact words) directly is hopeless — you have never seen this exact email before, so you have nothing to count. But the question turned around is easy: **given that an email is spam, how often does the word "free" appear?** That you can count, because you have a pile of spam emails sitting right there.

**Bayes\' rule** is the statement that lets you trade one for the other. It is taught in the Math subject, in *Probability and Statistics, Built From Counting*, so it is used here rather than rebuilt. In the form we need it says:

- The score for a class is its **prior** multiplied by its **likelihood**.
- **Prior**, written P(spam): how common spam is before you read a single word. If 4 of your 8 stored emails are spam, the prior is 4/8 = 0.5.
- **Likelihood**, written P(word given spam): how often that word appears in the spam pile. Count the word, divide by the total number of words in the pile.
- Bayes\' rule also has a divisor, P(the words), and it is the same number for every class. Since all we need is which class scores higher, dividing both scores by the same thing changes nothing, so it is dropped.

So the recipe is: for each class, take its prior and multiply in one likelihood per word in the email. Whichever class ends up with the bigger number wins. Two multiplications per word, no fitting, no iteration.`,
    },
    {
      type: 'intuition',
      title: 'A spam filter worked by hand — and the zero that breaks it',
      md: `Eight stored emails, three words each. Four are spam, four are ham (ham means "not spam").

- **Spam pile**, 12 words in total: free 4, money 3, now 2, win 2, prize 1.
- **Ham pile**, 12 words in total: meeting 3, please 2, project 2, today 2, now 1, lunch 1, review 1.
- Priors: 4 spam out of 8 emails, so P(spam) = 0.5, and P(ham) = 0.5.

A new email arrives: **"free money meeting"**. Two obviously spammy words and one obviously hammy one. Score it.

**Spam score.** Start at the prior, 0.5. Multiply by P(free given spam) = 4/12 = 0.333, giving 0.1667. Multiply by P(money given spam) = 3/12 = 0.25, giving 0.0417. Now multiply by P(meeting given spam). The word "meeting" never appears in the spam pile, so that count is 0, and 0/12 = 0. The score becomes **0.0417 × 0 = 0**.

**Ham score.** Start at 0.5. Multiply by P(free given ham). "free" never appears in the ham pile either, so this is 0/12 = 0, and the score is already **0**. The remaining two words cannot rescue it — anything times zero is zero.

Both classes score exactly zero. The filter has no opinion at all about an email that any human would call spam. And notice how it happened: **a single word with a count of zero destroyed all the other evidence**, no matter how strong that evidence was. Multiplication has no memory of what came before the zero.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 7: the zero, reproduced',
      code: `spam = 'free money now free money free win money now free win prize'.split()
ham = 'meeting now please project meeting today lunch meeting today please review project'.split()
doc = ['free', 'money', 'meeting']

def score(words, doc):
    p = 0.5
    for w in doc:
        p = p * words.count(w) / len(words)
        print('   P(' + w + ') =', words.count(w), '/', len(words), '  running score', p)
    return p

print('spam score =', score(spam, doc))
print('ham score  =', score(ham, doc))

# ---- real output ----
#    P(free) = 4 / 12   running score 0.16666666666666666
#    P(money) = 3 / 12   running score 0.041666666666666664
#    P(meeting) = 0 / 12   running score 0.0
# spam score = 0.0
#    P(free) = 0 / 12   running score 0.0
#    P(money) = 0 / 12   running score 0.0
#    P(meeting) = 3 / 12   running score 0.0
# ham score  = 0.0`,
      annotations: {
        1: 'The whole spam pile as one string. .split() cuts a string at its spaces and returns a list of words - 12 of them here.',
        2: 'The ham pile, also 12 words. Both piles are just lists of strings; there is no other model.',
        3: 'The new email to classify, already split into words.',
        5: 'A function that scores one pile against one email.',
        6: 'Start at the prior, 0.5, because 4 of the 8 stored emails belong to each class.',
        7: 'Visit the email\'s words one at a time, in order.',
        8: 'words.count(w) counts how many times w appears in the pile; len(words) is the pile size. Multiply the running score by that fraction.',
        9: 'Print the fraction and the score so far, so you can watch the exact moment it collapses. The + signs glue strings together.',
        10: 'Return the final score for this class.',
        12: 'Score the email against the spam pile. Read the output: fine, fine, then 0/12 wipes it out.',
        13: 'And against the ham pile, which dies on its very first word. Both classes end at 0.0 and there is nothing to compare.',
      },
    },
    {
      type: 'intuition',
      title: 'Laplace smoothing: never let a count be zero',
      md: `The failure has one cause: a count of 0 becomes a probability of 0, and a probability of 0 annihilates a product. So do not let any count be zero. Add 1 to every count, including the ones that were never observed.

That cannot be the whole fix, though, because probabilities have to add up to 1. If you hand out one extra count to every word in the vocabulary, the total number of counts grows by exactly the vocabulary size. So the divisor must grow by the same amount.

- **Vocabulary** — the set of distinct words across all the stored data. Ours: free, money, now, win, prize, meeting, please, project, today, lunch, review. That is **11** words, so V = 11.
- New rule: P(word given class) = (count + 1) ÷ (pile size + 11). Every pile has 12 words, so every divisor becomes 12 + 11 = **23**.
- This is called **Laplace smoothing**, or add-one smoothing.

Rescore "free money meeting" with it.

- **Spam:** 0.5 × (4+1)/23 × (3+1)/23 × (0+1)/23 = 0.5 × 5 × 4 × 1 ÷ 12167 = **0.000822**.
- **Ham:** 0.5 × (0+1)/23 × (0+1)/23 × (3+1)/23 = 0.5 × 1 × 1 × 4 ÷ 12167 = **0.000164**.
- Spam wins. Divide one by the other: 20/4 = **5**, so spam is 5 times more likely than ham.
- Turn that into a probability: 0.000822 ÷ (0.000822 + 0.000164) = **0.833**.

Read what changed. The word "meeting" still hurts the spam score — 1/23 is a small number, and it should be small, because meeting really is a hammy word. But it now costs a finite penalty instead of an infinite one, so the other two words still get to speak. The classifier went from having no opinion to being 83% confident, and it is right.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 8: the same email, one added count per word',
      code: `V = len(set(spam + ham))

def smoothed(words, doc, alpha):
    p = 0.5
    for w in doc:
        p = p * (words.count(w) + alpha) / (len(words) + alpha * V)
    return p

print('vocabulary size V =', V)
s = smoothed(spam, doc, 1)
h = smoothed(ham, doc, 1)
print('spam score =', round(s, 6), '  ham score =', round(h, 6))
print('odds spam:ham =', round(s / h, 2))
print('P(spam | email) =', round(s / (s + h), 4))

# ---- real output ----
# vocabulary size V = 11
# spam score = 0.000822   ham score = 0.000164
# odds spam:ham = 5.0
# P(spam | email) = 0.8333`,
      annotations: {
        1: 'spam + ham glues the two word lists into one. set() throws away duplicates, keeping each distinct word once, and len() counts what is left. That is the vocabulary size, 11.',
        3: 'Same scoring function as before, plus alpha - how many extra counts to hand out per word.',
        4: 'The same prior, 0.5.',
        5: 'The same walk over the email\'s words.',
        6: 'The only changed line. The numerator gains alpha; the denominator gains alpha times V, so the probabilities across the vocabulary still add to 1.',
        7: 'Return the final score.',
        9: 'Print V so the divisor 12 + 11 = 23 is visible.',
        10: 'Score against the spam pile with alpha = 1, that is, add-one smoothing.',
        11: 'And against the ham pile. Both numbers are tiny because they are products of small fractions - only their ratio matters.',
        12: 'Print both. These match the hand arithmetic: 0.000822 and 0.000164.',
        13: 'Their ratio: spam is exactly 5 times more likely than ham. This is the number that decides.',
        14: 'The two scores rescaled to add up to 1, which turns the comparison into a probability: 0.8333.',
      },
    },
    {
      type: 'math',
      intro: 'Naive Bayes in symbols. c is a class, x_1 to x_d are the features (here, the words of the email), V is the vocabulary size and N_c is the number of words in class c\'s pile.',
      latex: [
        '\\text{score}(c) = P(c) \\prod_{j=1}^{d} P(x_j \\mid c) \\qquad \\text{predict the class with the largest score}',
        'P(w \\mid c) = \\frac{\\mathrm{count}(w, c) + \\alpha}{N_c + \\alpha \\, V} \\qquad \\alpha = 1 \\text{ is add-one smoothing; here } N_c = 12, \\; V = 11',
      ],
    },
    {
      type: 'intuition',
      title: 'What the word "naive" is apologising for',
      md: `That big multiplication sign hides an assumption, and the assumption is false.

Multiplying the per-word probabilities together is only correct if the words are **independent given the class** — meaning that once you know an email is spam, seeing the word "free" tells you nothing at all about whether you will also see "money".

That is plainly untrue. "Free" and "money" travel together. "New" and "York" travel together. Treating them as separate pieces of evidence counts the same signal twice. The word "naive" is the model admitting this in its own name.

So why is the model used anyway?

- **The honest alternative is impossible.** Without the assumption you would need a probability for every possible combination of words. With a 10,000-word vocabulary that is astronomically many numbers, and no amount of email would ever be enough to estimate them. With the assumption you need one count per (word, class) pair — a few tens of thousands of integers, countable in one pass.
- **You only need the winner, not the number.** The prediction is whichever class scores higher. Double-counting correlated words inflates a score, but it inflates the score of the class those words already pointed at. The class that was ahead usually stays ahead, so the decision survives even though the arithmetic behind it is wrong.
- **The price is paid in the numbers, not the decision.** Because correlated evidence gets counted repeatedly, the scores pile up near 0 and 1. A Naive Bayes model saying 0.998 does not mean it is right 998 times out of 1000. Use its ranking; do not read its probabilities as if they were honest percentages.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: a second email, start to finish',
      md: `Same eight stored emails, same two piles, same smoothing. A new email arrives: **"win prize today"**. Work it out on paper before reading on.

**Step 1 — the counts you need.** In the spam pile: win appears 2 times, prize 1, today 0. In the ham pile: win 0, prize 0, today 2. Both piles hold 12 words; the vocabulary holds 11.

**Step 2 — the smoothed divisor.** Both piles: 12 + 1 × 11 = **23**.

**Step 3 — the spam score.** Prior 0.5. Then (2+1)/23 for win, (1+1)/23 for prize, (0+1)/23 for today. The numerators multiply to 3 × 2 × 1 = 6, and the divisors to 23 × 23 × 23 = 12167. Spam score = 0.5 × 6 ÷ 12167 = **0.0002466**.

**Step 4 — the ham score.** Prior 0.5. Then (0+1)/23 for win, (0+1)/23 for prize, (2+1)/23 for today. Numerators: 1 × 1 × 3 = 3. Ham score = 0.5 × 3 ÷ 12167 = **0.0001233**.

**Step 5 — compare.** 6 against 3. Spam is exactly **twice** as likely as ham. As a probability: 6 ÷ (6 + 3) = **0.667**.

**Step 6 — read the result honestly.** Spam wins, but only 2:1, and it should. "win" and "prize" are spam words, but "today" is a solid ham word, and neither pile has ever seen a single "prize" from the other side. With 24 words of training data total, 2:1 is roughly the confidence the evidence deserves. Notice also that the whole comparison came down to 6 versus 3 — the divisor 12167 and the prior 0.5 appeared in both scores and cancelled.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: k-NN on unscaled features',
      md: `A team builds a k-NN model to recommend a loan product. Two features: **age in years** and **annual income in rupees**. They load the data, call the classifier, and get a model that behaves strangely — a 30-year-old on 500000 keeps getting matched with people in their late fifties.

Here is the exact mistake, using the five stored people from part 4 and the same query (age 30, income 500000).

**The wrong answer.** Raw Euclidean distance says the nearest neighbour is **(55, 501000)**, at distance 1000.31. The team accepts this: it is what the library returned.

**The diagnosis.** Break that distance open. The squared age gap is 25 × 25 = 625. The squared income gap is 1000 × 1000 = 1,000,000. The total is 1,000,625, and the age term is **625 ÷ 1,000,625 = 0.0625%** of it. For the other candidate, (31, 550000), the age term is 1 out of 2,500,000,001 — under a millionth of a percent. In both cases the distance is, to four decimal places, purely a difference in rupees. The model was never using age at all. It was doing "find the person whose income is closest", with an age column bolted on for decoration.

**Why it is easy to miss.** No error is raised. The model trains, predicts, and produces plausible-looking output. Accuracy may even be acceptable if income happens to be the more useful feature — which then hides the bug completely.

**The fix, and what it buys.** Rescale both columns to 0-1 first, as in part 5. The nearest neighbour becomes **(31, 550000)** at distance 0.088, and (55, 501000) falls to fourth place at 0.714. Same data, same k, same distance formula. Only the units changed.

**The general rule.** Any model that compares features by measuring distance between them needs rescaling — k-NN is the clearest case. Decision trees do not, because a tree looks at one feature at a time and asks "is this value above or below a threshold?", and rescaling does not change which side of a threshold a value falls on.`,
    },
    {
      type: 'intuition',
      title: 'Practice',
      md: `Do these on paper first. Full solutions follow each one.

**Problem 1.** Stored points: (0, 0) red, (1, 1) red, (4, 4) blue, (5, 4) blue, (0, 4) blue. Query (2, 2). What does k = 1 predict? What does k = 3 predict?

*Solution.* Distances from (2, 2): to (0,0), gaps 2 and 2, root of 8 = 2.83. To (1,1), gaps 1 and 1, root of 2 = 1.41. To (4,4), root of 8 = 2.83. To (5,4), gaps 3 and 2, root of 13 = 3.61. To (0,4), gaps 2 and 2, root of 8 = 2.83. Sorted: 1.41 red, then three points tied at 2.83 — red (0,0), blue (4,4), blue (0,4) — then 3.61 blue. **k = 1: red**, the only neighbour is (1,1). **k = 3:** the three nearest are (1,1) red plus two of the three tied points. If the tie is broken toward (0,0) and (4,4), that is 2 red and 1 blue, so red. The real answer to give is that the vote is unstable because of the tie, and this is why an odd k on a two-class problem is not enough on its own — ties among *distances* are a separate problem from ties among *votes*.

**Problem 2.** A k-NN model uses height in metres (roughly 1.5 to 2.0) and weight in grams (roughly 50000 to 100000). Without rescaling, which feature decides every neighbour, and by roughly how much?

*Solution.* Height gaps are at most 0.5, so squared height gaps are at most 0.25. Weight gaps run to 50000, so squared weight gaps run to 2,500,000,000. The ratio is about ten billion to one. Weight decides everything; height is arithmetically invisible. Rescale both to 0-1 and each contributes a squared gap between 0 and 1, so both get a real vote.

**Problem 3.** Using the same two piles from the lesson (spam 12 words, ham 12 words, V = 11, add-one smoothing), classify the one-word email **"lunch"**.

*Solution.* "lunch" appears 0 times in spam and 1 time in ham. Spam score = 0.5 × (0+1)/23 = 0.5/23 = 0.0217. Ham score = 0.5 × (1+1)/23 = 1/23 = 0.0435. Ham wins at exactly 2:1 odds, so P(ham) = 2/(2+1) = **0.667**. One word seen once beats one word never seen, by a factor of two. That is add-one smoothing setting the exchange rate between "seen once" and "never seen".

**Problem 4.** You have 900 training rows and someone sets k = 900. What does the model predict, and what would you check first if a colleague reported that this model scores 85% accuracy?

*Solution.* Every query gets all 900 rows as neighbours, so every query returns the most common label in the dataset — the model is a constant that ignores its input completely. If that constant scores 85%, then 85% of your data carries that one label, and 85% is the score to beat, not a result. Any model reported without that baseline beside it cannot be judged.

**Problem 5.** A Naive Bayes spam filter is trained, and then a new marketing term, "webinar", starts appearing in incoming email. It is in neither training pile. What does add-one smoothing give for P(webinar given spam) and P(webinar given ham), and what effect does the word have on the decision?

*Solution.* The count is 0 in both piles, so both probabilities are (0+1)/23 = 1/23 — identical. Multiplying both class scores by the same number leaves their ratio unchanged, so the word has **no effect on which class wins**. That is the right behaviour: a word you have never seen carries no evidence either way. Note the practical detail, though: V was computed from the training data, so "webinar" is not in the vocabulary, and many implementations simply skip unknown words for exactly this reason — skipping and add-one smoothing give the same decision here.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Four extensions, each one sentence of what and one of why.

- **Other distances.** Manhattan distance adds the absolute gaps instead of squaring them, so a single wild feature does less damage. Cosine distance measures the *angle* between two points and ignores their length entirely, which is what you want for text: a 50-word review and a 5000-word review on the same topic point the same way but have very different sizes.
- **Log space.** A real email has 200 words, so its Naive Bayes score is 200 fractions multiplied together — around 1 followed by 800 zeros after the decimal point. Python floats stop below about 1e-308 and become exactly 0.0, so every class would score zero. The fix is to add the logarithms of the probabilities instead of multiplying the probabilities. Log turns multiplication into addition, and it never reorders numbers, so the winner is unchanged.
- **Three Naive Bayes variants.** Multinomial NB is the one built above and expects counts, which is what word frequencies are. Bernoulli NB expects yes/no features and explicitly treats the *absence* of a word as evidence, which helps on very short documents. Gaussian NB expects continuous measurements and stores an average and a spread per (feature, class) instead of counts. Choosing the wrong one raises no error; it just quietly scores worse.
- **Making k-NN fast.** Comparing a query against every stored point costs one distance per point, which is unusable at millions of points. Specialised index structures (KD-trees, ball-trees) prune whole regions, but only help while the number of features stays under roughly 20 — above that the distance concentration you measured in part 6 destroys their pruning. At real scale the answer is to stop asking for the exact nearest neighbour and use an approximate index, which returns almost always the right neighbours in a small fraction of the time. That is the machinery inside vector search, which you will meet again in the GenAI subject.`,
    },
  ],
  quiz: [
    {
      question: 'You move a k-NN classifier from k = 1 to k = 25. What changes?',
      options: [
        { text: 'The boundary gets more jagged and the model chases individual points harder', explanation: 'That is the direction of decreasing k. More neighbours means more averaging, not less.' },
        {
          text: 'The boundary gets smoother and single points, including mislabelled ones, stop being able to change a prediction',
          explanation: 'Correct. This is exactly the noisy point at position 5 in the lesson: k = 1 copied its wrong label, k = 3 outvoted it. Pushed far enough, though, a large k also erases small genuine clusters, which is what happened to the three B points at k = 7.',
        },
        { text: 'Nothing changes unless the data changes', explanation: 'k alone flipped two of the six predictions in part 3, on identical data.' },
      ],
      correct: 1,
    },
    {
      question: 'A k-NN model uses age (25 to 60) and annual income in rupees (300000 to 900000), unscaled, with Euclidean distance. What is the practical effect?',
      options: [
        {
          text: 'Income decides essentially every neighbour; age contributes almost nothing to the distance',
          explanation: 'Correct. In the worked example the squared age gap was 625 against a squared income gap of 1,000,000 - age was 0.06% of the total. After rescaling both columns to 0-1 the nearest neighbour changed completely.',
        },
        { text: 'Nothing - Euclidean distance rescales the features automatically', explanation: 'It does not. The formula adds raw squared gaps, so whichever column has the biggest raw numbers dominates the sum.' },
        { text: 'Age dominates because it has fewer possible values', explanation: 'How many distinct values a column has is irrelevant. Only the size of the gaps matters.' },
      ],
      correct: 0,
    },
    {
      question: 'Why does k-NN stop working well when each point has hundreds of measurements?',
      options: [
        { text: 'Only because each prediction takes longer to compute', explanation: 'It does get slower, but that is a hardware problem. The measured result in part 6 is about meaning, not speed.' },
        {
          text: 'All the distances converge, so the nearest point stops being meaningfully closer than the farthest one',
          explanation: 'Correct. Measured in part 6: at 2 measurements the farthest of 500 points was 37 times farther than the nearest; at 1000 measurements it was only 10% farther. Ranking by distance stops separating anything.',
        },
        { text: 'The majority vote ties more often', explanation: 'How often votes tie depends on k and on the number of classes, not on the number of measurements.' },
      ],
      correct: 1,
    },
    {
      question: 'Naive Bayes assumes the words in an email are independent given the class. That is false. Why is the classifier still useful?',
      options: [
        { text: 'The errors caused by correlated words cancel out exactly', explanation: 'They do not cancel. The scores really are wrong, often by a lot.' },
        {
          text: 'Only the larger of the two scores matters, and double-counting correlated words usually inflates the class that was already ahead',
          explanation: 'Correct, and it names the price too: the decision usually survives, the probability does not. A Naive Bayes model reporting 0.998 is not right 998 times in 1000.',
        },
        { text: 'The assumption becomes true once you have enough training data', explanation: 'More data does not make "free" and "money" stop travelling together. The assumption is about the words, not the sample size.' },
      ],
      correct: 1,
    },
    {
      question: 'An incoming email contains one word that never appeared in the spam pile. Without smoothing, what is the spam score?',
      options: [
        {
          text: 'Exactly zero, because one factor of 0 wipes out the product no matter how strong the other words were',
          explanation: 'Correct. In the lesson "free money meeting" scored 0 under BOTH classes, so the filter had no opinion at all. Add-one smoothing replaces the count with (count + 1) and the divisor with (pile size + V), turning an infinite penalty into a finite one.',
        },
        { text: 'Slightly lower, but still usable', explanation: 'Multiplying by zero is not a slight reduction. Everything computed before it is destroyed.' },
        { text: 'Unchanged, because unseen words are skipped automatically', explanation: 'Only if you write code to skip them. The plain formula multiplies in a 0 divided by the pile size.' },
      ],
      correct: 0,
    },
    {
      question: 'With add-one smoothing, both piles hold 12 words and the vocabulary holds 11. A word appears 3 times in the spam pile. What is P(word given spam)?',
      options: [
        { text: '3/12 = 0.25', explanation: 'That is the unsmoothed value. Smoothing changes both the top and the bottom of the fraction.' },
        {
          text: '(3 + 1) / (12 + 11) = 4/23 = 0.174',
          explanation: 'Correct. The numerator gains 1, and the denominator gains 1 for every word in the vocabulary, so the probabilities over the whole vocabulary still add up to 1.',
        },
        { text: '(3 + 1) / 12 = 0.333', explanation: 'Adding to the top without adding to the bottom would make the probabilities across the vocabulary sum to more than 1.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain k-NN in 30 seconds, then name its two biggest weaknesses.',
      answer:
        'To label a new point, measure its distance to every stored labelled point, keep the k closest, and take the majority vote of their labels. For regression, average their values instead. Nothing is fitted — the stored data is the model, which is why it is called lazy learning. Weakness one is cost: every prediction compares the query against the whole dataset, and the whole dataset has to stay in memory, so it does not fit a low-latency service at scale without an approximate index. Weakness two is that distance stops being informative when each point has many measurements — the nearest and farthest points converge to the same distance. Related to both: k-NN cannot ignore a useless feature the way a tree can. It just adds that feature\'s noise into every distance.',
      isCaseBased: false,
    },
    {
      question: 'Which models need feature scaling and which do not? Justify the split rather than listing names.',
      answer:
        'The question to ask is whether the model compares different features against each other inside one number. Distance and dot-product models do: k-NN, k-means, SVM with an RBF kernel, PCA, and any linear model with an L1 or L2 penalty, since the penalty is unfair to a column measured in millions. Gradient descent also converges faster on scaled inputs because each step size is shared across features of wildly different magnitude. Tree-based models do not need scaling: a tree splits on one feature at a time by asking whether a value is above a threshold, and rescaling a column monotonically does not change which side of a threshold any value falls on, so the same splits are found. That is why random forests and gradient-boosted trees are scale-invariant by construction rather than by luck.',
      isCaseBased: false,
    },
    {
      question: 'Explain the curse of dimensionality without hand-waving.',
      answer:
        'Distance is a sum of one squared gap per feature. Add features and every pair of points accumulates more gaps, which average out, so all distances drift toward a similar value. The measurable consequence is contrast collapse. I measured it directly: 500 random points and one query, and the quantity (farthest − nearest) / nearest. At 2 features it was 37, at 10 it was 2.4, at 100 it was 0.44, at 1000 it was 0.105 — so in 1000 dimensions the farthest of 500 points is only 10% farther than the nearest. Once that ratio is near zero, sorting by distance barely separates anything, so k-NN, k-means and RBF kernels all lose their footing. The general form is sample coverage: the amount of data needed to fill a space grows exponentially in the number of features. The escapes are to reduce the number of features, use cosine distance on embeddings that genuinely occupy a much smaller subspace, or learn a distance instead of assuming Euclidean.',
      isCaseBased: false,
    },
    {
      question: 'State the naive assumption of Naive Bayes, say why it is wrong, and defend using it anyway.',
      answer:
        'The assumption is that given the class, every feature is independent of every other, which is what lets the joint probability be written as a product of per-feature probabilities. For text it is plainly false: "free" and "money" co-occur, "New" and "York" co-occur, so correlated evidence gets counted more than once. First defence, tractability: without the assumption you need a probability for every combination of words, which is exponentially many parameters and unlearnable from any amount of email; with it you need one count per word-and-class pair, learnable in one pass. Second defence, and the one that matters: the prediction is the argmax, not the number. Double-counting correlated evidence inflates scores, but it usually inflates the class those features already favoured, so the ranking survives. The corollary to state before anyone asks is that the probabilities are not trustworthy and should be calibrated before you threshold them.',
      isCaseBased: false,
    },
    {
      question: 'Why is Laplace smoothing necessary, and what exactly does alpha do?',
      answer:
        'Necessary because the class score is a product, so a single word never seen in that class contributes a factor of zero and destroys every other piece of evidence. In my worked example, "free money meeting" scored exactly zero under both spam and ham — the filter had no opinion on an obviously spammy email. Smoothing replaces count/N with (count + alpha)/(N + alpha·V), where V is the vocabulary size. The numerator gains alpha, and the denominator gains alpha·V so the probabilities across the vocabulary still sum to 1. In effect you borrow a sliver of probability mass from the words you did see and hand it to the ones you did not, which turns an infinite penalty into a finite one. Alpha = 1 is add-one and is the default; alpha below 1 smooths less and trusts your counts more. On a large corpus the choice hardly matters; on a small one it is the difference between a working filter and a broken one.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague reports 97% cross-validated accuracy for a k-NN model. In the notebook, StandardScaler().fit_transform(X) is called once, before the train/test split. What do you tell them?',
      answer:
        'That is data leakage and the 97% is not real. The scaler computed its average and spread over the whole dataset, including every validation fold, so information about held-out data entered the pipeline before any model was fitted. k-NN is unusually sensitive to this because the scaler output is the distance metric — the geometry of every neighbourhood was set using statistics the model was not supposed to see. The fix is one line: put the scaler and the classifier in a Pipeline and pass the pipeline to cross_val_score, so each fold refits the scaler on its own training portion. Then re-measure and expect the number to fall. While in there I would check the two leakage paths that usually travel with this one: features derived from the target or from the future, and duplicate or near-duplicate rows split across train and test — k-NN with duplicates scores beautifully and has learned nothing, because each test row finds itself as its own nearest neighbour.',
      isCaseBased: true,
    },
    {
      question: 'Case: your k-NN recommender scores 94% offline but p99 latency is 800 ms in production against 20 million items. Walk through the fix.',
      answer:
        'The accuracy is fine, so the algorithm is what has to change. First, confirm the cost: exact k-NN measures the query against every stored item, so 20 million items times the number of features is the whole latency budget by itself. Second, stop asking for the exact nearest neighbours and use an approximate index — HNSW or IVF with product quantization, in a library like FAISS or a vector database. Recall of the true top 10 typically stays around 95 to 99% while latency falls by two or three orders of magnitude, and I would measure that recall against exact results offline before shipping so the loss is a number and not a hope. Third, cut the number of features: a smaller embedding shrinks both the index and the per-comparison cost. Fourth, precompute and cache neighbours for the head of the catalogue and the busiest users, since most traffic is head traffic. If exact answers are contractually required, the remaining option is to shard and scan in parallel and pay for it. The tradeoff to name out loud is that you are buying latency with a small, measured loss in recall.',
      isCaseBased: true,
    },
    {
      question: 'Case: a Naive Bayes fraud model reports 0.998 confidence on transactions that turn out to be fine roughly a third of the time. What is wrong and how do you fix it?',
      answer:
        'Nothing is broken; this is Naive Bayes behaving as designed. Fraud features move together — amount, merchant category, hour of day and device are all correlated — and the model treats each as independent evidence and multiplies them, so the scores pile up at the extremes and saturate near 0 and 1. The ranking can still be excellent while the numbers are meaningless. Diagnose it with a reliability plot: bucket the predictions by score and plot predicted rate against observed rate; a systematic bow away from the diagonal confirms miscalibration, and Brier score or expected calibration error quantifies it. Fix it with post-hoc calibration on a held-out set — Platt scaling, which fits a logistic curve on the scores and works with little data, or isotonic regression, which is more flexible but needs more data. Check the ranking quality first, though: if AUC is also poor then calibration will not save the model and it needs replacing. And if the business rule is a hard threshold on probability, calibration is not optional.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'k-NN in one line', back: 'To label a new point, measure its distance to every stored point, keep the k closest, take the majority vote of their labels. Nothing is fitted - the data is the model.' },
    { front: 'Euclidean distance', back: 'Square each gap between the two points, add the squares, take the square root. From (2,2) to (1,1): root of (1 + 1) = 1.414.' },
    { front: 'Lazy learning', back: 'No training step at all. Fitting means storing the data. Every prediction then compares the query against the whole dataset and keeps it all in memory.' },
    { front: 'k too small vs k too large', back: 'Too small: one mislabelled neighbour decides the answer. Too large: the window outgrows real structure and small clusters get outvoted by the common class. k = n returns the most common label always.' },
    { front: 'Why k-NN needs rescaling', back: 'Distance adds raw squared gaps, so the column with the biggest units wins. Age 25 yrs vs income 1000 rupees: age was 0.06% of the distance. Rescale to 0-1 using training min/max only.' },
    { front: 'Curse of dimensionality, measured', back: '(farthest - nearest) / nearest over 500 random points: 37.6 at d=2, 2.36 at d=10, 0.44 at d=100, 0.105 at d=1000. Near zero means nearest is no longer meaningfully near.' },
    { front: 'Naive Bayes recipe', back: 'score(class) = P(class) times one P(word | class) per word in the document. Predict the class with the bigger score. The shared divisor P(words) cancels, so it is dropped.' },
    { front: 'Laplace smoothing', back: 'P(w|c) = (count + alpha) / (pile size + alpha times V). Stops one unseen word from zeroing the whole product. alpha = 1 is add-one; V is the vocabulary size.' },
  ],
  mindmapMarkdown: `- k-NN & Naive Bayes
  - k-NN idea
    - Majority vote of the k nearest stored points
    - Lazy: no training, every prediction scans the data
    - Euclidean distance: square, add, root
  - Choosing k
    - Small k copies a mislabelled neighbour
    - Large k outvotes small real clusters
    - k = n returns the most common label
  - Feature scaling
    - Distance adds raw squared gaps
    - Big-unit column silently wins
    - Rescale to 0-1 on training data only
  - Curse of dimensionality
    - Every feature adds another gap
    - (far - near) / near collapses toward 0
    - Escape: fewer features, cosine, learned distance
  - Naive Bayes idea
    - Prior times one likelihood per word
    - Bigger score wins; divisor cancels
    - Naive = pretend words are independent
  - Making it work
    - One zero count kills the whole product
    - Add-one smoothing: (count+1)/(N+V)
  - Reality check
    - Decisions good, probabilities overconfident
    - Trains in one counting pass`,
}

export default m
