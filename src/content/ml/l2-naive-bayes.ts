import type { Module } from '../types'

const m: Module = {
  id: 'ml-l2-naive-bayes',
  subjectId: 'ml',
  level: 2,
  title: 'Naive Bayes',
  whyItMatters:
    'It turns classification around: instead of asking which class a document belongs to, ask which class would most likely have produced it. That inversion, plus one deliberately false assumption, gives a classifier that trains in one pass and is still hard to beat on text.',
  assumes: [
    'You know what a probability is, and that probabilities multiply for independent events',
    'You have seen a Python list and a for loop',
  ],
  estMinutes: 20,
  sections: [
    {
      type: 'intuition',
      title: 'What Naive Bayes is',
      md: `**Naive Bayes** classifies by asking, for each class: *how likely is it that this class produced this document?* — then picking the class with the highest answer.

For an email, that means multiplying together how often each of its words appears in spam, times how common spam is overall. Do the same for ham, and compare.

The **naive** part is the assumption that the words are independent given the class. That is plainly false — "prize" and "win" travel together — and the classifier works well anyway.`,
    },
    {
      type: 'math',
      intro:
        'The score for a class: its prior times the product of per-feature likelihoods. It is Bayes\' rule with the denominator dropped, because P(x) is the same for every class and cannot change which one wins. The second line is smoothing, which the next snippet explains why you need.',
      latex: [
        '\\text{score}(c) = P(c) \\prod_{j=1}^{d} P(x_j \\mid c) \\qquad \\text{predict the class with the largest score}',
        'P(w \\mid c) = \\frac{\\mathrm{count}(w, c) + \\alpha}{N_c + \\alpha \\, V} \\qquad \\alpha = 1 \\text{ is add-one smoothing}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'A spam filter, and the zero that breaks it',
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
        1: ".split() breaks the string on spaces into a list of words. Twelve words per pile, four spam emails and four ham.",
        6: 'p starts at 0.5 — the prior, since the two piles are the same size.',
        7: 'Multiply by this word\'s share of the pile. That is P(word | class), estimated by counting.',
        16: 'The spam score dies at "meeting": count 0, so P = 0, so the running product becomes 0 and stays there. Everything the first two words established is annihilated.',
        21: 'And ham dies at "free". Both scores are 0.0, so the classifier cannot choose. One unseen word in one class is enough to destroy the whole calculation.',
      },
    },
    {
      type: 'intuition',
      title: 'Laplace smoothing',
      md: `The failure has one cause: a count of 0 becomes a probability of 0, and a zero annihilates a product.

So do not allow a count of zero. **Add-one (Laplace) smoothing** adds α = 1 to every word count, and compensates in the denominator by adding α × V, where V is the vocabulary size — the number of distinct words across all classes.

That keeps the probabilities summing to 1 while guaranteeing none of them is exactly zero.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same email, one added count per word',
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
        1: 'set() removes duplicates, so V is the number of DISTINCT words across both piles — 11 here.',
        6: 'The +alpha on top and +alpha*V underneath. Every word now has a small but non-zero probability, including ones this class has never used.',
        12: 'Both scores are now positive and different: 0.000822 against 0.000164. The classifier can answer.',
        14: 'Dividing the two scores turns them into P(spam | email) = 0.8333. The email is called spam, and the "meeting" is treated as mild evidence against rather than as a veto.',
      },
    },
    {
      type: 'note',
      label: 'What "naive" is apologising for',
      md: `The product sign assumes the words are **conditionally independent given the class** — that once you know an email is spam, seeing "win" tells you nothing about whether "prize" appears.

That is false. Correlated words get counted as separate evidence, so the model double-counts and its probability estimates come out far too confident — routinely 0.99 or 0.001 when the truth is nearer 0.8.

The **ranking** survives this, which is why the classifier works. The **calibration** does not, which is why you should not use its probabilities as probabilities.`,
    },
    {
      type: 'note',
      label: 'Use log probabilities in practice',
      md: `Multiplying a thousand numbers each around 0.001 underflows to exactly 0.0 in floating point, and you are back to the failure above for a different reason.

Every real implementation sums **logs** instead: log P(c) + Σ log P(xⱼ | c). Sums do not underflow, and since log is monotonic the ranking is unchanged.`,
    },
  ],
  quiz: [
    {
      question: 'Both spam and ham scored exactly 0.0. What caused it?',
      options: [
        { text: 'The two piles are the same size', explanation: 'Equal sizes make the prior 0.5 for each, which is harmless.' },
        { text: 'A word absent from a class gives P = 0, and a zero annihilates the whole product', explanation: 'Correct. "meeting" never appears in spam and "free" never in ham, so each product collapsed regardless of the other evidence.' },
        { text: 'The document had too few words', explanation: 'Three words is few, but the failure is caused by the zeros, not the count.' },
        { text: 'Floating point underflow', explanation: 'Underflow is a real Naive Bayes problem, but these are exact zeros from counts of 0.' },
      ],
      correct: 1,
    },
    {
      question: 'Add-one smoothing adds 1 to each count. What is added to the denominator, and why?',
      options: [
        { text: 'Nothing — only the numerator changes', explanation: 'Then the probabilities would no longer sum to 1.' },
        { text: 'α × V, the vocabulary size times alpha, so the probabilities still sum to 1', explanation: 'Correct. One unit was added for each of the V possible words, so the total must grow by αV.' },
        { text: '1, to match the numerator', explanation: 'Adding 1 once would not compensate for adding 1 to each of V counts.' },
        { text: 'The number of documents', explanation: 'Smoothing operates over the vocabulary, not the document count.' },
      ],
      correct: 1,
    },
    {
      question: 'After smoothing, spam scored 0.000822 and ham 0.000164, giving P(spam) = 0.8333. How was that computed?',
      options: [
        { text: 'By taking the larger score directly', explanation: 'The larger score is 0.000822, which is not a probability.' },
        { text: 's / (s + h) — normalising the two scores against each other', explanation: 'Correct. The dropped P(x) denominator is recovered by dividing by the total across classes.' },
        { text: 'By applying a sigmoid', explanation: 'That is logistic regression\'s route to a probability.' },
        { text: 'It is the ratio 5.0 converted to a percentage', explanation: 'The odds are 5.0, and 5/(5+1) = 0.8333 — which is the same normalisation, so this is arithmetically right but the described method is the odds route.' },
      ],
      correct: 1,
    },
    {
      question: 'What exactly does the "naive" assumption claim?',
      options: [
        { text: 'That the classes are equally likely', explanation: 'That is the prior, which is estimated from the data rather than assumed.' },
        { text: 'That features are independent GIVEN the class', explanation: 'Correct. Once you know it is spam, "win" is assumed to tell you nothing about "prize" — which is false, and the model works anyway.' },
        { text: 'That every word appears at most once', explanation: 'Counts above 1 are handled normally.' },
        { text: 'That the features are normally distributed', explanation: 'That is Gaussian Naive Bayes, a variant for continuous features.' },
      ],
      correct: 1,
    },
    {
      question: 'Naive Bayes reports P(spam) = 0.999 on an email. How much should you trust that number?',
      options: [
        { text: 'Completely — it is a proper probability', explanation: 'It is not calibrated; the independence assumption makes it overconfident.' },
        { text: 'As a ranking signal, yes; as a probability, no — correlated words are double-counted so estimates are pushed toward 0 and 1', explanation: 'Correct. The ordering survives the false assumption; the calibration does not.' },
        { text: 'Not at all — the model is useless', explanation: 'The classifier is genuinely good; it is specifically the probability values that are unreliable.' },
        { text: 'Only if smoothing was applied', explanation: 'Smoothing prevents zeros but does not fix overconfidence.' },
      ],
      correct: 1,
    },
    {
      question: 'Why do implementations sum logs rather than multiply probabilities?',
      options: [
        { text: 'It is faster', explanation: 'Logarithms are not cheaper than multiplication.' },
        { text: 'Multiplying a thousand small numbers underflows to exactly 0.0; sums of logs do not, and log is monotonic so the ranking is unchanged', explanation: 'Correct. It is a numerical fix with no effect on which class wins.' },
        { text: 'It makes the probabilities calibrated', explanation: 'Calibration is unaffected.' },
        { text: 'It removes the need for smoothing', explanation: 'log(0) is undefined, so smoothing is still required — arguably more so.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why does Naive Bayes work despite an assumption that is clearly false?',
      answer:
        'Because classification only needs the ranking of the class scores to be right, not the scores themselves. The independence assumption causes correlated features to be double-counted, which pushes the estimated probabilities toward 0 and 1 — but it usually pushes both classes in the same direction, so the argmax survives. The practical consequence is that you can trust the prediction and should not trust the probability. If you need calibrated output, fit an isotonic or Platt calibrator on held-out data.',
      isCaseBased: false,
    },
    {
      question: 'What is the zero-frequency problem and how do you fix it?',
      answer:
        'If a word never appeared in a class during training, its estimated probability is 0, and since the score is a product, that single zero annihilates all the other evidence. On the eight-email example both classes scored exactly 0.0 — spam died at "meeting", ham died at "free" — and the classifier could not choose. Laplace smoothing adds α to every count and αV to the denominator, so no probability is ever exactly zero. After smoothing the same email scored 0.000822 against 0.000164, a clean 5:1 in favour of spam.',
      isCaseBased: true,
    },
    {
      question: 'Which Naive Bayes variant would you use for text, and why?',
      answer:
        'Multinomial for word counts, which is the default for document classification and is what the counting above implements. Bernoulli when only presence or absence matters and documents are short, since it explicitly models the absence of a word as evidence. Gaussian for continuous features, where each feature\'s per-class distribution is assumed normal. Complement Naive Bayes is worth knowing for imbalanced text — it estimates each class\'s parameters from the complement of that class and is noticeably more robust.',
      isCaseBased: false,
    },
    {
      question: 'When would you still reach for Naive Bayes today?',
      answer:
        'As a baseline that takes seconds to train and is genuinely competitive on text. When data is very scarce, since it estimates far fewer parameters than a discriminative model and degrades gracefully. When training must be online or streaming, since the counts update incrementally with no refitting. And when you need something interpretable and auditable — the per-word log ratios read as evidence directly. It is a poor choice when features are strongly dependent and you need probabilities, or when you have enough data that a discriminative model will simply learn better.',
      isCaseBased: false,
    },
    {
      question: 'How does the amount of training data change the comparison with logistic regression?',
      answer:
        'There is a well-known result here: Naive Bayes has higher asymptotic error but converges to it much faster, roughly with log(d) examples rather than d. So on small data Naive Bayes often wins, and as data grows logistic regression overtakes it and stays ahead. The reason is the bias–variance trade-off in a different guise — the independence assumption is a strong bias that costs you at the limit but stabilises the estimate when examples are few.',
      isCaseBased: false,
    },
    {
      question: 'You deploy a spam filter and it flags almost everything as spam. What do you check?',
      answer:
        'The prior first — if the training set was mostly spam, P(spam) dominates and the class scores inherit that. Then whether smoothing is doing too much: a large α on a small vocabulary flattens the likelihoods toward uniform, so the prior decides everything. Then whether the vocabulary was built on training data only, since a mismatch between the V used in the denominator and the words actually seen distorts every estimate. And I would check whether the threshold is 0.5 on an uncalibrated score, which given the overconfidence is rarely the right cut.',
      isCaseBased: true,
    },
    {
      question: 'Is Naive Bayes generative or discriminative, and does it matter?',
      answer:
        'Generative — it models P(x | c) and P(c), so it describes how the data was produced and could in principle sample new documents. Logistic regression is discriminative: it models P(c | x) directly and never describes x. It matters practically. The generative approach can use unlabelled data, handles missing features naturally by omitting their factors, and trains in a single counting pass. The discriminative approach optimises the thing you actually care about, so it usually wins given enough labelled data.',
      isCaseBased: false,
    },
    {
      question: 'How would you handle continuous features?',
      answer:
        'Either Gaussian Naive Bayes, which estimates a mean and variance per feature per class and evaluates the normal density — cheap, but it assumes each feature is normal within each class, which is worth checking. Or discretise into bins and use the multinomial version, which makes no distributional assumption and handles multi-modal features, at the cost of a binning choice and some information loss. I would look at per-class histograms before choosing; a bimodal feature will be badly served by a single Gaussian.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Naive Bayes, in one sentence', back: 'Score each class as P(c) × Π P(xⱼ | c) and pick the largest — how likely is it that this class produced this document?' },
    { front: 'What "naive" means', back: 'Features are assumed conditionally independent given the class. False for real text, and the classifier works anyway.' },
    { front: 'The zero-frequency problem', back: 'An unseen word gives P = 0, and a zero annihilates the product. Both classes scored exactly 0.0 — spam died at "meeting", ham at "free".' },
    { front: 'Laplace smoothing', back: 'P(w|c) = (count + α) / (N_c + αV). Add α to every count and αV to the denominator so probabilities still sum to 1.' },
    { front: 'The smoothed result', back: 'spam 0.000822 vs ham 0.000164 → odds 5.0 → P(spam) = s/(s+h) = 0.8333.' },
    { front: 'Ranking vs calibration', back: 'The false independence assumption double-counts correlated features, so probabilities are overconfident. The argmax survives; the probability does not.' },
    { front: 'Why sum logs?', back: 'Multiplying a thousand small probabilities underflows to exactly 0.0. Logs sum without underflow and log is monotonic, so the ranking is unchanged.' },
    { front: 'Generative vs discriminative', back: 'Naive Bayes models P(x|c) and P(c); logistic regression models P(c|x) directly. NB converges faster on little data; LR wins with plenty.' },
  ],
  mindmapMarkdown: `- Naive Bayes
  - The idea
    - score(c) = P(c) * product P(xj | c)
    - pick the largest score
    - Bayes with P(x) dropped (same for all classes)
  - Naive = conditional independence
    - false for real text
    - ranking survives, calibration does not
  - The zero problem
    - "meeting" count 0 in spam -> P = 0 -> product 0
    - BOTH classes scored 0.0, no answer possible
  - Laplace smoothing
    - (count + alpha) / (N_c + alpha * V)
    - V = 11 distinct words
    - spam 0.000822, ham 0.000164
    - odds 5.0 -> P(spam) = 0.8333
  - In practice
    - sum LOGS, never multiply (underflow)
    - variants: multinomial, Bernoulli, Gaussian, complement
    - fast, tiny data, streaming, interpretable
    - LR overtakes it once data is plentiful`,
}

export default m
