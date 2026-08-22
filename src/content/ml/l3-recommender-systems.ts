import type { Module } from '../types'

const m: Module = {
  id: 'ml-l3-recommender-systems',
  subjectId: 'ml',
  level: 3,
  title: 'Recommender Systems',
  whyItMatters:
    'A table of people against items, mostly blank, and the job is to fill in a cell. That is the entire problem, and the two families of solution to it drive most of what you see on any consumer product.',
  assumes: [
    'You know the dot product and cosine similarity (Math → Vectors & the Dot Product)',
    'You have seen a Python list and a for loop',
  ],
  estMinutes: 20,
  sections: [
    {
      type: 'intuition',
      title: 'What a recommender does',
      md: `Five people, five films, star ratings 1 to 5, and a lot of blanks. **Recommendation** is predicting what belongs in a blank cell, then showing each person the items with the highest predictions.

Two completely different ways to guess, and every real system mixes them:

- **Content-based filtering** uses properties of the *item* — genre, director, length. It asks what this person liked before and finds items like it.
- **Collaborative filtering** ignores the item's properties entirely and uses only the pattern of ratings. It asks who else behaved like this person, or what else behaves like this item.`,
    },
    {
      type: 'intuition',
      title: 'Two directions, one idea',
      md: `Collaborative filtering points the same idea at rows or at columns.

- **User-user**: find people whose row of ratings resembles yours, and average what they liked.
- **Item-item**: find items whose column of ratings resembles this item's, and average this person's ratings of those.

**Item-item is what production systems use.** Items are more numerous but far more stable — a film's rating pattern barely changes, while a person's taste shifts weekly, so item similarities can be computed offline and cached.

To compare two columns you need one number for "these move together". That is **cosine similarity**.`,
    },
    {
      type: 'math',
      intro:
        'Cosine similarity: the dot product divided by both lengths, which is the cosine of the angle between the two vectors. Dividing by the lengths is what makes it a measure of DIRECTION rather than magnitude — a film rated 5,4,5 and one rated 1,0.8,1 point the same way and score 1.0, even though one is rated five times higher.',
      latex: [
        '\\cos(a, b) = \\frac{a \\cdot b}{\\lVert a \\rVert \\, \\lVert b \\rVert} = \\frac{\\sum_i a_i b_i}{\\sqrt{\\sum_i a_i^2}\\;\\sqrt{\\sum_i b_i^2}}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Every film compared to Speed',
      code: `ratings = [
    [5, 4, 1, 0, 4],
    [4, 5, 0, 1, 4],
    [1, 0, 5, 4, 1],
    [0, 1, 4, 5, 2],
    [5, 0, 1, 1, 4],
]
names = ['Heat', 'Speed', 'Amelie', 'Chungking', 'Ronin']

def column(j):
    return [row[j] for row in ratings]

def cosine(a, b):
    dot = sum(a[i] * b[i] for i in range(len(a)))
    la = sum(v * v for v in a) ** 0.5
    lb = sum(v * v for v in b) ** 0.5
    return dot / (la * lb)

speed = column(1)
for j in range(5):
    if j != 1:
        print(names[j], round(cosine(column(j), speed), 3))

# ---- real output ----
# Heat 0.754
# Amelie 0.188
# Chungking 0.235
# Ronin 0.805`,
      annotations: {
        12: 'A list comprehension pulling column j out of every row. Rows are people, columns are films, so this is one film\'s full rating pattern.',
        17: 'Length is the square root of the sum of squares — the same ** 0.5 power operator used everywhere else.',
        24: 'Ronin at 0.805 and Heat at 0.754 are the two action films; Amelie at 0.188 and Chungking at 0.235 are not. Nothing told the code what a genre is — it inferred the grouping purely from who rated what.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Filling in Eve\'s blank: a weighted average',
      code: `eve = ratings[4]
sims = {0: 0.754, 2: 0.188, 3: 0.235, 4: 0.805}

num = 0.0
den = 0.0
for j in [0, 2, 3, 4]:
    num = num + sims[j] * eve[j]
    den = den + sims[j]
print(round(num, 3), round(den, 3))
print('predicted rating for Eve on Speed:', round(num / den, 2))

# ---- real output ----
# 7.413 1.982
# predicted rating for Eve on Speed: 3.74`,
      annotations: {
        6: 'Every film Eve DID rate. Her rating of each is weighted by how similar that film is to Speed.',
        10: 'Dividing by the total similarity is what makes it an average rather than a sum — without it, more similar films would simply inflate the number.',
        11: '3.74. Eve rated Heat 5 and Ronin 4 — the two films most similar to Speed — so the weighted average lands high. Her 1s for Amelie and Chungking carry little weight, because those two are barely similar to Speed at all.',
      },
    },
    {
      type: 'note',
      label: 'The 0 we quietly lied with',
      md: `Every blank in that table was written as **0**, so a film nobody rated looks exactly like a film everybody hated.

That is the difference between *missing* and *disliked*, and it matters. Eve's zeros for Amelie and Chungking dragged her prediction down as though she had actively disliked them.

Real systems either use only co-rated entries when computing similarity, or centre each row by that person's mean rating first, so an absent value contributes nothing rather than contributing a strong negative.`,
    },
    {
      type: 'intuition',
      title: 'Cold start, and why factorisation exists',
      md: `**Cold start** is when collaborative filtering has nothing to work with because a row or column is empty. A brand-new user has rated nothing; a brand-new item has been rated by nobody. Neither can be helped by a method that only reads the ratings table — which is exactly why content-based filtering stays in the mix.

The weighted average above compares columns directly, which gets slow and noisy when the table is a million by a million and 99.9% blank.

**Matrix factorisation** instead learns a short vector per user and per item — say 50 numbers each — such that their dot product reproduces the known ratings. Blanks are then predicted by taking that dot product. It compresses a vast sparse table into two small dense ones.`,
    },
    {
      type: 'note',
      label: 'How you actually score a recommender',
      md: `The obvious score is prediction error on ratings — how far 3.74 was from what Eve really gave. It is a poor score, for two reasons.

**Users see a ranked list, not a number.** Getting the order right matters; being 0.3 stars out on an item nobody scrolls to does not. So the metrics are ranking metrics: precision@k, recall@k, NDCG.

**Offline scores measure the wrong thing.** A recommender is judged on what people do with what it showed them, and the historical data only records what the *previous* system showed. That feedback loop is why serious teams treat offline metrics as a filter and decide with an A/B test.`,
    },
  ],
  quiz: [
    {
      question: 'What distinguishes collaborative from content-based filtering?',
      options: [
        { text: 'Collaborative uses only the ratings pattern; content-based uses properties of the items', explanation: 'Correct. Collaborative filtering never needs to know what a film is about — it inferred the action/non-action grouping purely from who rated what.' },
        { text: 'Collaborative is supervised, content-based is not', explanation: 'Neither is supervised in the usual sense; both predict missing entries.' },
        { text: 'Content-based needs more data', explanation: 'Content-based works with no ratings at all, which is why it survives cold start.' },
        { text: 'They are two names for the same method', explanation: 'They use entirely different inputs.' },
      ],
      correct: 0,
    },
    {
      question: 'Why do production systems prefer item-item over user-user?',
      options: [
        { text: 'There are usually fewer items', explanation: 'Often there are more items than users, and it is still preferred.' },
        { text: 'Item similarities are far more stable over time, so they can be computed offline and cached', explanation: 'Correct. A film\'s rating pattern barely moves; a person\'s taste shifts weekly.' },
        { text: 'Item-item is more accurate in every case', explanation: 'Accuracy is comparable; the advantage is operational.' },
        { text: 'User-user cannot handle cold start', explanation: 'Neither can — both read only the ratings table.' },
      ],
      correct: 1,
    },
    {
      question: 'Why does cosine similarity divide by both vector lengths?',
      options: [
        { text: 'To keep the result between 0 and 1', explanation: 'A side effect for non-negative vectors, but not the reason.' },
        { text: 'So it measures direction rather than magnitude — a film rated 5,4,5 and one rated 1,0.8,1 score 1.0', explanation: 'Correct. Otherwise a popular item would look similar to everything simply by having larger numbers.' },
        { text: 'To make the computation faster', explanation: 'It adds two square roots.' },
        { text: 'To handle missing values', explanation: 'Missing values are a separate problem, and cosine does not solve it.' },
      ],
      correct: 1,
    },
    {
      question: 'Ronin scored 0.805 and Amelie 0.188 against Speed. How did the code know the genres?',
      options: [
        { text: 'It read a genre column', explanation: 'There is no genre column — only ratings.' },
        { text: 'It did not. The grouping was inferred entirely from who rated what', explanation: 'Correct, and that is the appeal of collaborative filtering: it needs no knowledge of the items at all.' },
        { text: 'The film names were parsed', explanation: 'Names are used only for printing.' },
        { text: 'It was told by the similarity function', explanation: 'Cosine has no notion of a genre; it compares rating columns.' },
      ],
      correct: 1,
    },
    {
      question: 'Writing blanks as 0 causes what problem?',
      options: [
        { text: 'Nothing — 0 is a neutral value', explanation: 'On a 1–5 scale, 0 is below the worst possible rating.' },
        { text: 'A film nobody rated becomes indistinguishable from a film everybody hated', explanation: 'Correct. Eve\'s zeros dragged her prediction down as though she had actively disliked those films.' },
        { text: 'It breaks the cosine formula', explanation: 'The formula computes fine; the meaning is what is wrong.' },
        { text: 'It makes the matrix dense', explanation: 'It stores a value, but the sparsity problem is unaffected.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is rating-prediction error a poor metric for a recommender?',
      options: [
        { text: 'Users see a ranked list, so order matters and error on unseen items does not', explanation: 'Correct — which is why precision@k, recall@k and NDCG are used instead.' },
        { text: 'It is too expensive to compute', explanation: 'It is the cheapest metric available.' },
        { text: 'Ratings are always missing', explanation: 'Enough are present to compute it; the issue is relevance, not availability.' },
        { text: 'It cannot be computed offline', explanation: 'It is straightforward offline — that is part of its appeal and part of the trap.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Design a recommender for a new video platform.',
      answer:
        'Start content-based, because on day one there is no interaction data — recommend by metadata similarity and by popularity, which is a genuinely strong baseline. As interaction data accumulates, add item-item collaborative filtering, computing item similarities offline nightly since they are stable. Then matrix factorisation or a two-tower embedding model once the table is large and sparse. In production it becomes two stages: cheap candidate generation over the whole catalogue, then an expensive ranker over a few hundred candidates. Evaluate with ranking metrics offline and decide with an A/B test.',
      isCaseBased: true,
    },
    {
      question: 'How do you handle cold start?',
      answer:
        'Separate the three cases. New item: fall back to content features — metadata, text embeddings, whatever the item itself provides — so it can be recommended before anyone has touched it. New user: popularity by segment, plus whatever signal you can get cheaply, such as an onboarding preference step or the referring context. New system: content-based and popularity only. The general answer is that a hybrid exists largely because collaborative filtering has this hole, and content-based filtering fills exactly it.',
      isCaseBased: false,
    },
    {
      question: 'Explain matrix factorisation.',
      answer:
        'Approximate the sparse ratings matrix R as the product of two dense matrices: one row of k numbers per user, one row of k numbers per item, with k around 50. A predicted rating is the dot product of a user vector and an item vector. Fit it by minimising squared error on the observed entries only, with regularisation, usually via SGD or ALS. It scales because you store (users + items) × k numbers instead of users × items, and it generalises because the latent dimensions capture broad taste patterns rather than memorising individual cells.',
      isCaseBased: false,
    },
    {
      question: 'Your offline NDCG improves but the A/B test is flat. What is going on?',
      answer:
        'Most likely the offline evaluation is scored against logs generated by the current system, so it rewards agreeing with what users were already shown. A model that recommends genuinely new items looks worse offline and may be better in reality. Other candidates: the metric improved on a slice nobody sees, latency regressed enough to cancel the quality gain, or the change affects a segment too small to move the aggregate. This gap is normal and is exactly why offline metrics are a filter rather than a decision.',
      isCaseBased: true,
    },
    {
      question: 'What is the feedback loop problem?',
      answer:
        'The recommender decides what users see, and what they see determines the data used to train the next version. Items that were never shown accumulate no positive signal, so they look unpopular and continue not to be shown. Over time the catalogue narrows and popularity becomes self-fulfilling. Mitigations are deliberate exploration — an epsilon-greedy or bandit slot for under-exposed items — logging propensities so you can correct for exposure when training, and monitoring catalogue coverage as a first-class metric alongside accuracy.',
      isCaseBased: false,
    },
    {
      question: 'Implicit feedback rather than ratings — what changes?',
      answer:
        'Almost everything. A click is a weak positive and the absence of a click is not a negative — it usually means the item was never seen. So you cannot treat zeros as dislikes, which is the same lie as the 0-for-blank problem but at scale. The standard approaches weight observed interactions by confidence and treat unobserved entries as low-confidence negatives, as in implicit ALS, or use a ranking loss like BPR that only requires that an observed item outranks an unobserved one. Implicit data is far more plentiful, which is why almost all real systems use it.',
      isCaseBased: false,
    },
    {
      question: 'How would you evaluate diversity, not just accuracy?',
      answer:
        'Accuracy metrics reward showing more of what someone already likes, which produces a narrow and eventually boring list. I would measure intra-list diversity — the average pairwise dissimilarity within a recommendation slate — plus catalogue coverage, the fraction of items ever recommended, and novelty, weighted toward less popular items. Then treat it as a constraint rather than an objective: maximise relevance subject to a diversity floor, often via a re-ranking step such as maximal marginal relevance over the top candidates.',
      isCaseBased: false,
    },
    {
      question: 'The same few popular items dominate every user\'s recommendations. What do you do?',
      answer:
        'First check whether the similarity computation is being driven by magnitude rather than pattern — popular items co-occur with everything, so raw counts make them look similar to all. Normalising, or using cosine rather than a dot product, addresses that directly. Then look at whether the zeros-as-dislikes problem is suppressing sparse items unfairly. Then add an explicit popularity penalty or a diversity re-rank. And check the feedback loop, since a system that only ever shows popular items generates data proving they are popular.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'The recommendation problem', back: 'A mostly-blank table of users against items. Predict a blank cell, then rank each user\'s highest predictions.' },
    { front: 'Content-based vs collaborative', back: 'Content-based uses item properties. Collaborative uses only the ratings pattern and never needs to know what an item is.' },
    { front: 'User-user vs item-item', back: 'Same idea on rows or columns. Item-item wins in production because item similarities are stable and can be cached offline.' },
    { front: 'Cosine similarity', back: 'a·b / (‖a‖‖b‖) — the cosine of the angle. Dividing by lengths makes it measure direction, so a 5,4,5 item and a 1,0.8,1 item score 1.0.' },
    { front: 'The Speed example', back: 'Ronin 0.805 and Heat 0.754 (both action) against Amelie 0.188 and Chungking 0.235. Genre was never supplied — it came from who rated what.' },
    { front: 'The blanks-as-zero lie', back: 'A film nobody rated looks like one everybody hated. Fix by using co-rated entries only, or centring each row on that user\'s mean.' },
    { front: 'Cold start', back: 'An empty row or column gives collaborative filtering nothing. New item → content features. New user → popularity by segment or an onboarding step.' },
    { front: 'How to score it', back: 'Ranking metrics (precision@k, NDCG), not rating error — users see a list. And decide with an A/B test, because offline logs reflect what the old system showed.' },
  ],
  mindmapMarkdown: `- Recommender systems
  - The problem
    - users x items, mostly blank
    - predict a cell, then rank
  - Two families
    - content-based: item properties, survives cold start
    - collaborative: ratings pattern only
      - user-user vs item-item
      - item-item wins: stable, cacheable
  - Cosine similarity
    - a.b / (|a||b|), measures DIRECTION
    - Speed vs: Ronin 0.805, Heat 0.754
    - Chungking 0.188, Amelie 0.235
    - genre never supplied, inferred from ratings
  - Filling a blank
    - weighted average by similarity
    - Eve on Speed: 7.415 / 1.983 = 3.74
  - Traps
    - blanks written as 0 = "everybody hated it"
    - cold start: empty row or column
    - rating error is the wrong metric
    - feedback loop: you train on what you showed`,
}

export default m
