import type { Module } from '../types'

const m: Module = {
  id: 'ml-l3-anomaly-detection',
  subjectId: 'ml',
  level: 3,
  title: 'Anomaly Detection: z-scores and Isolation Forest',
  whyItMatters:
    'Fraud, failing hardware, a sensor that started lying, a broken data feed. All of it is one problem: find the rows that do not look like the rest, without anyone having labelled them first.',
  assumes: [
    'You can compute an average',
    'You have seen a Python list and a for loop',
    'You know what a variance is — the average squared distance from the mean (PCA covers it)',
  ],
  estMinutes: 22,
  sections: [
    {
      type: 'intuition',
      title: 'What anomaly detection is',
      md: `An **anomaly** (or **outlier**) is a row that does not look like the rest of the data. **Anomaly detection** scores every row by how unlike the others it is, and hands you the ranking.

Three things make it a different job from classification:

- **No labels.** Nobody marked the frauds, so there is nothing to train on.
- **Not a category.** Next month's fraud will not resemble last month's. You are detecting *difference from usual*, not membership of a known class.
- **Accuracy is useless.** Anomalies are often under 1% of rows, so answering "normal" to everything scores over 99%.

What you actually ship is a ranking: score every row, hand the oddest *k* to a human, and let *k* be however many they can check in a day.`,
    },
    {
      type: 'math',
      intro:
        'The simplest score. μ is the mean and σ the standard deviation — the square root of the variance, which puts it back in the original units so it reads as "a typical distance from the mean". The **z-score** counts how many of those typical distances a value sits from the middle. |z| > 2 or 3 is the usual flag.',
      latex: ['\\sigma = \\sqrt{\\frac{1}{n}\\sum_i (x_i - \\mu)^2}', 'z_i = \\frac{x_i - \\mu}{\\sigma}'],
    },
    {
      type: 'intuition',
      title: 'The trouble: the outlier is inside the yardstick',
      md: `μ and σ are computed from the same data you are screening, and the anomaly is in there too. A big enough outlier drags the mean toward itself and inflates σ, so the yardstick you measure it with is one it stretched.

The effect has a name — **masking** — and it is the main weakness of z-scores. Here it is happening on ten payments.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Ten payments, one of them six times the others',
      code: `amounts = [48, 52, 47, 55, 50, 49, 53, 51, 45, 300]
mean = sum(amounts) / len(amounts)
var = sum((a - mean) ** 2 for a in amounts) / len(amounts)
sd = var ** 0.5
print('mean:', round(mean, 2), ' sd:', round(sd, 2))

for a in amounts:
    z = (a - mean) / sd
    if abs(z) > 2:
        print('flagged', a, 'z =', round(z, 2))

# ---- real output ----
# mean: 75.0  sd: 75.05
# flagged 300 z = 3.0`,
      annotations: {
        3: 'sum((a - mean) ** 2 for a in amounts) is a generator expression: it produces one squared distance per amount and sum adds them as they arrive. Dividing by len gives the variance.',
        5: 'mean 75.0 and sd 75.05 — both already wrecked. Nine of these payments sit near 50, so a "typical" payment is nowhere near 75.',
        8: 'abs() drops the sign, so unusually small values are flagged as well as unusually large ones.',
        11: 'The 300 scores z = 3.0, which reads like a mild oddity rather than a six-fold payment. It inflated sd to 75.05 and then measured itself against it.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same 300, measured against the other nine',
      code: `clean = amounts[:9]
cmean = sum(clean) / 9
csd = (sum((a - cmean) ** 2 for a in clean) / 9) ** 0.5
print('clean mean:', cmean, ' clean sd:', round(csd, 2))
print('z of 300 against those:', round((300 - cmean) / csd, 1))

# ---- real output ----
# clean mean: 50.0  clean sd: 2.94
# z of 300 against those: 84.9`,
      annotations: {
        1: 'amounts[:9] is a slice: items 0 up to but not including 9, i.e. the nine ordinary payments with the 300 left out.',
        5: '84.9, against 3.0 a moment ago. Same value, same data, one row removed from the yardstick. That gap is masking, and it is why robust versions use the median and MAD instead of mean and sd.',
      },
    },
    {
      type: 'intuition',
      title: 'Isolation Forest: how few random cuts isolate this row',
      md: `**Isolation Forest** scores a row by how easily it can be separated from the others, and assumes nothing about shape or spread.

Picture the rows as dots on paper. Pick a random column, pick a random value in its range, cut. Cut again inside whichever piece your dot is in, and keep going until the dot is alone. Count the cuts. Repeat about a hundred times with different random cuts and average.

A dot in a crowd needs many cuts, because every cut leaves neighbours with it. A dot on its own gets fenced off in one or two. **Few cuts means anomalous.**`,
    },
    {
      type: 'note',
      label: 'Why this beats the z-score',
      md: `It never measures a distance, never estimates a density, never assumes normal looks like a bell, and never sees a label. It also works on many columns at once, where a z-score handles one at a time and misses rows that are unremarkable in every single column but odd in combination.

Libraries report a score rather than a cut count. Lower means more anomalous, and only the **order** is meaningful — no particular value is a threshold.`,
    },
  ],
  quiz: [
    {
      question: 'Why is accuracy a bad metric for anomaly detection?',
      options: [
        { text: 'Because anomalies are rare, so predicting "normal" for everything already scores over 99%', explanation: 'Correct. With under 1% anomalies, the do-nothing model looks excellent. Rank-based measures like precision@k are what matter.' },
        { text: 'Because there are no labels, so accuracy cannot be computed at all', explanation: 'You often do get some labels later, retrospectively. The problem is the class imbalance, not the absence of any ground truth.' },
        { text: 'Because anomaly scores are continuous rather than binary', explanation: 'You can always threshold a score. The imbalance is the real issue.' },
        { text: 'Because accuracy ignores the cost of false negatives', explanation: 'True in general, but the decisive problem here is that the trivial model already scores 99%.' },
      ],
      correct: 0,
    },
    {
      question: 'In the ten payments, the 300 scored z = 3.0. Against the other nine it scored 84.9. Why the difference?',
      options: [
        { text: 'A rounding error in the standard deviation', explanation: 'No — the two numbers are both correct for the data they were computed on.' },
        { text: 'The 300 was inside the mean and sd it was being measured against, inflating sd from 2.94 to 75.05', explanation: 'Correct. This is masking: the outlier stretches the yardstick, then measures itself with it.' },
        { text: 'z-scores are only valid for normally distributed data', explanation: 'A real caveat, but not what produced this specific gap.' },
        { text: 'Nine points is too few to estimate a standard deviation', explanation: 'Ten is not many, but the mechanism here is the outlier contaminating its own baseline.' },
      ],
      correct: 1,
    },
    {
      question: 'What does Isolation Forest actually count?',
      options: [
        { text: 'The distance from each row to its nearest neighbours', explanation: 'That is what kNN- or LOF-style detectors do. Isolation Forest never measures a distance.' },
        { text: 'The average number of random cuts needed to isolate a row, over many trees', explanation: 'Correct. Few cuts means the row was easy to separate, which means anomalous.' },
        { text: 'How far each row is from the mean in standard deviations', explanation: 'That is the z-score.' },
        { text: 'The density of points in each region of the space', explanation: 'Density-based methods estimate that explicitly; isolation avoids it entirely.' },
      ],
      correct: 1,
    },
    {
      question: 'A row is perfectly ordinary in every individual column, but the combination is bizarre. Which method finds it?',
      options: [
        { text: 'Per-column z-scores', explanation: 'Each column looks fine on its own, so every individual z is small and nothing is flagged.' },
        { text: 'Isolation Forest, because it cuts across all columns at once', explanation: 'Correct. Cuts land in whichever column is chosen, so a row that is odd only in combination still gets isolated quickly.' },
        { text: 'Neither — unlabelled data cannot reveal this', explanation: 'It can. That is precisely what multivariate methods are for.' },
        { text: 'Both perform identically here', explanation: 'They do not: this is exactly where the univariate method fails.' },
      ],
      correct: 1,
    },
    {
      question: 'What should the output of an anomaly detector be, in practice?',
      options: [
        { text: 'A yes/no flag per row', explanation: 'Requires committing to a threshold you have no principled way to choose.' },
        { text: 'A ranking, with k chosen by how many rows a human can actually review', explanation: 'Correct. The scores have no natural units, so the useful decision is "review the oddest k".' },
        { text: 'A probability that each row is fraudulent', explanation: 'The scores are not calibrated probabilities, and with no labels you cannot calibrate them.' },
        { text: 'The retrained model, refreshed daily', explanation: 'That is an operational detail, not the output.' },
      ],
      correct: 1,
    },
    {
      question: 'Which fix directly addresses masking in z-scores?',
      options: [
        { text: 'Use the median and MAD instead of the mean and standard deviation', explanation: 'Correct. Both are robust: a single wild value barely moves a median, so the yardstick survives contamination.' },
        { text: 'Raise the threshold from |z| > 2 to |z| > 4', explanation: 'Makes it worse — the masked outlier already scored only 3.0.' },
        { text: 'Collect more data', explanation: 'More data dilutes one outlier, but does nothing when anomalies arrive in clusters.' },
        { text: 'Standardise the column first', explanation: 'Standardising uses the same contaminated mean and sd, so it changes nothing.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'How would you detect fraud with no labelled fraud examples?',
      answer:
        'Treat it as ranking, not classification. Score every transaction by how unlike the rest it is — Isolation Forest is a strong default because it needs no assumption about the shape of normal and handles many columns. Send the top k scores to review, where k is set by reviewer capacity. Use the review outcomes to build labels over time, and only then consider a supervised model.',
      isCaseBased: true,
    },
    {
      question: 'What is masking, and how do you defend against it?',
      answer:
        'Masking is when an outlier inflates the very statistics used to detect it. On ten payments, one value of 300 pushed the mean from 50 to 75 and the standard deviation from 2.94 to 75.05, so it scored a mild z = 3.0 instead of 84.9. Defences: robust statistics (median and MAD), fitting the baseline on data believed clean, or methods that never estimate a centre and spread at all, like Isolation Forest.',
      isCaseBased: true,
    },
    {
      question: 'Explain Isolation Forest to someone who knows decision trees.',
      answer:
        'It builds many trees, but splits are entirely random — a random feature and a random threshold within that feature\'s range, with no impurity criterion, because there is no label to be impure about. Each tree grows until points are isolated. The score is the average path length to isolate a point across the forest, normalised by the expected path length. Short paths mean anomalous.',
      isCaseBased: false,
    },
    {
      question: 'How do you evaluate an anomaly detector without labels?',
      answer:
        'You cannot get a clean number up front, so you buy one. Have reviewers check the top k and measure precision@k — that is honest and directly reflects how the system is used. Track the rate over time as drift detection. Where synthetic anomalies are plausible, inject them and measure recall. Never report overall accuracy.',
      isCaseBased: false,
    },
    {
      question: 'When would you prefer a z-score to Isolation Forest?',
      answer:
        'When there is one meaningful column, the normal values genuinely cluster around a centre, and you need the decision to be explainable to a non-technical reviewer — "this payment is 85 typical distances above normal" is auditable in a way an ensemble score is not. It is also trivial to compute in a streaming setting.',
      isCaseBased: false,
    },
    {
      question: 'Your detector fires on 40% of rows after a deployment. What happened?',
      answer:
        'Almost certainly drift rather than a spike in real anomalies: the baseline was fitted on old data and the world moved. Check whether a feature\'s distribution shifted — a currency change, a new product line, a unit change in an upstream feed, a pipeline bug filling nulls with zeros. Compare current feature distributions against the training window before touching the model. Retrain on a recent window once the cause is understood.',
      isCaseBased: true,
    },
    {
      question: 'How does contamination affect Isolation Forest?',
      answer:
        'The `contamination` parameter only sets where the score threshold falls, not how scores are computed, so it changes how many rows get flagged and nothing else. Since the ranking is what matters, the safer approach is to ignore it and take the top k by score yourself.',
      isCaseBased: false,
    },
    {
      question: 'Anomaly detection or a supervised model — how do you choose?',
      answer:
        'By whether labels exist and whether tomorrow\'s anomalies resemble yesterday\'s. With good labels and a stable, recurring pattern, supervised wins easily — it can learn what actually distinguishes the class. With no labels, or with adversaries who deliberately change tactics, a supervised model trained on old fraud will miss new fraud, and unsupervised detection of "unlike normal" degrades far more gracefully. Mature systems run both.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Anomaly detection, in one sentence', back: 'Score every row by how unlike the rest it is, with no labels, and hand the oddest k to a human.' },
    { front: 'z-score formula', back: 'z = (x − μ) / σ, where σ = sqrt(mean squared distance from μ). Flag |z| > 2 or 3.' },
    { front: 'Masking', back: 'An outlier inflates the mean and sd used to detect it. The 300 among ten payments scored z = 3.0; against the clean nine it scored 84.9.' },
    { front: 'Robust fix for masking', back: 'Median and MAD instead of mean and standard deviation — one wild value barely moves a median.' },
    { front: 'Isolation Forest, in one sentence', back: 'Cut at random until a row is alone; count the cuts; average over ~100 trees. Few cuts means anomalous.' },
    { front: 'Why Isolation Forest over z-scores?', back: 'No assumption about the shape of normal, no distance or density estimate, and it works across many columns at once — so it catches rows odd only in combination.' },
    { front: 'Why is accuracy useless here?', back: 'Anomalies are often under 1% of rows, so predicting "normal" for everything scores over 99%. Use precision@k.' },
    { front: 'What does the score value mean?', back: 'Nothing on its own — only the ordering is meaningful. Pick k by reviewer capacity, not by a magic threshold.' },
  ],
  mindmapMarkdown: `- Anomaly detection
  - The job
    - no labels
    - not a category: difference from usual
    - accuracy useless (99% by saying normal)
    - output = a ranking, review top k
  - z-score
    - sigma = sqrt(mean squared distance)
    - z = (x - mu) / sigma, flag |z| > 2
    - masking: 300 among ten payments
      - with it: mean 75.0, sd 75.05, z = 3.0
      - without it: mean 50.0, sd 2.94, z = 84.9
    - robust fix: median + MAD
  - Isolation Forest
    - random column, random cut, repeat
    - count cuts to isolate, average ~100 trees
    - few cuts = anomalous
    - no distance, no density, no shape, no label
    - multivariate: catches odd combinations
  - Practice
    - precision@k with reviewers
    - drift, not fraud, when the rate explodes`,
}

export default m
