import type { Module } from '../types'

const m: Module = {
  id: 'math-l1-probability-stats',
  subjectId: 'math',
  level: 1,
  title: 'Conditional Probability and Bayes',
  whyItMatters:
    'A test that is 99% accurate for a disease affecting 1 in 1,000 people is wrong about 91% of the time it says yes. That is not a trick — it is the single most consequential piece of arithmetic in applied statistics, and most people get it backwards.',
  assumes: [
    'You can compute a fraction',
    'You have seen a Python loop',
  ],
  estMinutes: 18,
  sections: [
    {
      type: 'intuition',
      title: 'Probability is counting, and conditioning is counting in a smaller room',
      md: `A probability is a count: out of 1,000 cases, how many. Nothing more mysterious than that, and it stays true however elaborate the notation gets.

**Conditional probability** — written P(A | B), "the probability of A given B" — is the same count taken inside a smaller group. Instead of counting out of everyone, count out of only the people for whom B is true.

That "instead of everyone" is where every mistake comes from. **P(A | B) and P(B | A) count out of different rooms**, so they are different numbers, and swapping them is the error underneath medical scares, courtroom fallacies and badly read model outputs.`,
    },
    {
      type: 'math',
      intro:
        'The definition, and Bayes\' rule, which is the definition rearranged. Read Bayes as: to flip a conditional, multiply by the ratio of the two base rates. That ratio is what people leave out.',
      latex: [
        'P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)}',
        'P(A \\mid B) = \\frac{P(B \\mid A)\\,P(A)}{P(B)}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'A million people, counted',
      code: `N, prevalence, sens, spec = 1_000_000, 0.001, 0.99, 0.99

sick = int(N * prevalence);  well = N - sick
tp = int(sick * sens);       fn = sick - tp
fp = int(well * (1 - spec)); tn = well - fp

print('%s people: %s sick, %s well' % (f'{N:,}', f'{sick:,}', f'{well:,}'))
print('true positives  %8s   false negatives %s' % (f'{tp:,}', f'{fn:,}'))
print('false positives %8s   true negatives  %s' % (f'{fp:,}', f'{tn:,}'))
print('P(sick | positive) = %d / %d = %.4f' % (tp, tp + fp, tp / (tp + fp)))

# ---- real output ----
# 1,000,000 people: 1,000 sick, 999,000 well
# true positives       990   false negatives 10
# false positives    9,990   true negatives  989,010
# P(sick | positive) = 990 / 10980 = 0.0902`,
      annotations: {
        1: 'Sensitivity is P(positive | sick) and specificity is P(negative | well). Both are 99% — the test really is excellent at what it was measured on.',
        14: 'Only 1,000 people are sick out of a million — the prevalence, the number everybody drops. So the 1% error rate applies to 999,000 healthy people and produces 9,990 false positives against only 990 true ones.',
        15: '0.0902. A positive result from a 99%-accurate test means a 9% chance of being sick — and the reason is arithmetic about group sizes, not anything wrong with the test.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same test, at four different prevalences',
      code: `for prev in [0.001, 0.01, 0.1, 0.5]:
    p = prev * sens / (prev * sens + (1 - prev) * (1 - spec))
    print('prevalence %5.1f%% -> P(sick | positive) = %.4f' % (100 * prev, p))

# ---- real output ----
# prevalence   0.1% -> P(sick | positive) = 0.0902
# prevalence   1.0% -> P(sick | positive) = 0.5000
# prevalence  10.0% -> P(sick | positive) = 0.9167
# prevalence  50.0% -> P(sick | positive) = 0.9900`,
      annotations: {
        2: 'Bayes\' rule, with the denominator written out as "all the ways a positive can happen": from a sick person, or from a well person the test got wrong.',
        7: 'The test is identical in all four rows - only the population changed, and the answer moves from 9% to 99%. At 1% prevalence it is exactly 0.5000, the crossover: below that a positive is more often wrong than right. This is why screening a whole population and testing a symptomatic patient are different acts with the same instrument.',
      },
    },
    {
      type: 'note',
      label: 'The three ways this shows up in your work',
      md: `**A classifier\'s precision is exactly this calculation.** Precision is P(actually positive | predicted positive), and it collapses on rare classes for the identical reason — which is why a fraud model with excellent recall can still be useless in production, and why precision must be reported at the deployment base rate rather than on a balanced test set.

**Threshold choice is choosing a point on this trade.** Raising the threshold cuts false positives and raises false negatives; where you put it depends on which error costs more, not on what maximises accuracy.

**"The model is 99% accurate" is not a claim about your case.** It is a claim about the population it was measured on, and moving the model to a population with a different base rate changes what its output means without changing a single weight.`,
    },
    {
      type: 'note',
      label: 'Independence, and the assumption naive Bayes makes on purpose',
      md: `Two events are **independent** when knowing one tells you nothing about the other: P(A | B) = P(A), equivalently P(A ∩ B) = P(A)·P(B).

It is a strong condition and it is usually false in real data. Height and weight are not independent; the words in a sentence are certainly not.

**Naive Bayes** assumes it anyway — that every feature is independent given the class — which is why it is called naive. The assumption is plainly wrong and the classifier works well regardless, because it only needs the *ranking* of the class scores to be right, not the probabilities themselves. Its estimated probabilities are consequently badly calibrated and should not be believed as numbers.

That is a useful general lesson: a false assumption can still produce a useful model, provided you know which of its outputs the falseness damages.`,
    },
  ],
  quiz: [
    {
      question: 'A 99%-accurate test for a 1-in-1,000 disease says positive. Why is the chance of being sick only 9%?',
      options: [
        { text: 'The test is not really 99% accurate', explanation: 'Both sensitivity and specificity genuinely are 99%.' },
        { text: '1% of 999,000 well people gives 9,990 false positives, against only 990 true ones', explanation: 'Correct — 1% of a very large group beats 99% of a very small one.' },
        { text: 'Sensitivity and specificity were confused', explanation: 'Both are 99% here, so it makes no difference.' },
        { text: 'The sample was too small', explanation: 'A million people is not a sampling problem.' },
      ],
      correct: 1,
    },
    {
      question: 'What is the difference between P(A | B) and P(B | A)?',
      options: [
        { text: 'None — they are the same number', explanation: 'They are the central confusion this module is about.' },
        { text: 'They count out of different groups, so they are different numbers unless the base rates happen to match', explanation: 'Correct, and Bayes\' rule is exactly the correction factor between them.' },
        { text: 'One is always larger', explanation: 'Either can be larger, depending on the base rates.' },
        { text: 'They differ only for rare events', explanation: 'They differ whenever the base rates differ.' },
      ],
      correct: 1,
    },
    {
      question: 'At 1% prevalence the answer came out at exactly 0.5000. What is significant about that?',
      options: [
        { text: 'It is a coincidence of the numbers', explanation: 'It is the crossover point for a test with sens = spec = 0.99.' },
        { text: 'It is the crossover: below that prevalence a positive is more often wrong than right, above it more often right', explanation: 'Correct, and the test itself is identical at every prevalence.' },
        { text: 'It means the test is useless', explanation: 'It has moved the estimate from 1% to 50% — a 50-fold update.' },
        { text: 'It means prevalence does not matter', explanation: 'The table shows the answer moving from 9% to 99% on prevalence alone.' },
      ],
      correct: 1,
    },
    {
      question: 'Why does a classifier\'s precision collapse on rare classes?',
      options: [
        { text: 'Because rare classes have less training data', explanation: 'A real problem, but a separate one — precision would collapse even with a perfect model of the rare class.' },
        { text: 'Precision IS P(actually positive | predicted positive) — the same base-rate arithmetic as the medical test', explanation: 'Correct, which is why precision must be reported at the deployment base rate.' },
        { text: 'Because recall is high', explanation: 'They trade off, but that is not the cause.' },
        { text: 'Because of the threshold only', explanation: 'The threshold moves the point on the trade; the base rate sets the trade.' },
      ],
      correct: 1,
    },
    {
      question: 'What does independence mean, formally?',
      options: [
        { text: 'The events cannot both happen', explanation: 'That is mutual exclusivity, which is very nearly the opposite.' },
        { text: 'P(A | B) = P(A) — knowing one tells you nothing about the other', explanation: 'Correct, equivalently P(A ∩ B) = P(A)·P(B).' },
        { text: 'The events have equal probability', explanation: 'Unrelated.' },
        { text: 'They occur in different populations', explanation: 'Not what the definition says.' },
      ],
      correct: 1,
    },
    {
      question: 'Naive Bayes assumes features are independent, which is plainly false. Why does it still work?',
      options: [
        { text: 'The assumption is approximately true in practice', explanation: 'It is often badly false, especially for text.' },
        { text: 'Classification only needs the RANKING of class scores to be right, not the probabilities themselves', explanation: 'Correct — which is also why its probabilities are badly calibrated and should not be believed.' },
        { text: 'It corrects for dependence internally', explanation: 'It does not; that is the whole simplification.' },
        { text: 'It only works on independent data', explanation: 'It is used heavily on text, which is highly dependent.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain Bayes\' rule with an example.',
      answer:
        'It flips a conditional probability by correcting for the two base rates. The standard example is worth doing by counting rather than by formula: a disease affecting 1 in 1,000, a test with 99% sensitivity and 99% specificity. In a million people, 1,000 are sick and 990 of them test positive. But 999,000 are well and 1% of those — 9,990 — test positive anyway. So a positive result means 990 out of 10,980, about 9%. The test is excellent and a positive still means a 9% chance of illness, because 1% of a very large group beats 99% of a very small one. Nothing about the test is wrong; the base rate was left out.',
      isCaseBased: true,
    },
    {
      question: 'Where does base-rate reasoning bite in machine learning?',
      answer:
        'Precision is literally this calculation — P(actually positive | predicted positive) — so it collapses on rare classes for exactly the reason the medical test does. That is why a fraud model with excellent recall can be unusable in production, and why precision measured on a balanced test set is misleading: move the same model to a 0.1% base rate and its precision falls without a single weight changing. It also means "99% accurate" is a statement about the population the model was measured on, not about any particular case. The practical rule I would state is to always report precision at the deployment base rate, and to re-check it when the base rate drifts.',
      isCaseBased: true,
    },
    {
      question: 'What is the difference between P(A | B) and P(B | A)?',
      answer:
        'They are counted out of different groups, so they are different numbers unless the base rates happen to coincide, and Bayes\' rule is the exact correction between them. The confusion has a name — the prosecutor\'s fallacy — and its usual form is treating P(evidence | innocent) as if it were P(innocent | evidence). In the worked example, P(positive | sick) is 0.99 while P(sick | positive) is 0.0902: the same test, the same numbers, a factor of eleven apart. Whenever someone quotes a conditional probability, the useful question is which one they measured and which one the decision needs.',
      isCaseBased: false,
    },
    {
      question: 'Explain independence and where the assumption fails.',
      answer:
        'A and B are independent when P(A | B) = P(A) — knowing one tells you nothing about the other — equivalently P(A ∩ B) = P(A)P(B). It is a strong condition and usually false in real data: height and weight are dependent, and the words in a sentence obviously are. Naive Bayes assumes it anyway, that features are independent given the class, and works well despite that because classification only needs the ranking of class scores to be correct, not the probabilities. The consequence to know is that its probability estimates are badly calibrated and should not be used as probabilities, only as scores.',
      isCaseBased: false,
    },
    {
      question: 'How does base rate affect where you set a classification threshold?',
      answer:
        'It moves the whole trade rather than the point on it. At a low base rate, most positives above any given threshold are false, so raising the threshold buys a lot of precision for relatively little recall — and at a high base rate the opposite. So the threshold cannot be chosen from a balanced validation set and then deployed; it has to be chosen against the base rate the model will actually see, and revisited when that drifts. The decision itself should come from the cost asymmetry: what a false positive costs against a false negative, expressed in whatever units the business uses, rather than from maximising accuracy.',
      isCaseBased: true,
    },
    {
      question: 'A model flags 1,000 transactions as fraud and 100 are real fraud. Is that good?',
      answer:
        'Precision of 10%, and whether that is good depends entirely on two things the number does not contain. First the base rate: if fraud is 0.01% of transactions, 10% precision is a thousandfold improvement over random and probably excellent. Second the cost asymmetry: if a flagged transaction costs a two-minute human review and a missed fraud costs thousands, 900 false positives are cheap. I would also want recall — 100 caught out of how many? — because precision alone says nothing about what was missed. The framing I would give is that precision and recall are only interpretable against the base rate and the cost of each error.',
      isCaseBased: true,
    },
    {
      question: 'What is the prosecutor\'s fallacy?',
      answer:
        'Presenting P(evidence | innocent) as though it were P(innocent | evidence). If a DNA match has a one-in-a-million chance of occurring by coincidence, that is not a one-in-a-million chance the defendant is innocent — it depends on how many people could have been the source. In a city of ten million, roughly ten people would match by chance, so a match alone puts the probability near one in ten rather than one in a million. It is the same arithmetic as the medical test with different labels, and it is the clearest demonstration that dropping the base rate is not a subtle error but a change of several orders of magnitude.',
      isCaseBased: false,
    },
    {
      question: 'How would you explain to a stakeholder that a 99%-accurate model is not enough?',
      answer:
        'By counting out loud rather than arguing about the number. If the event happens once in a thousand, then out of a million cases the model flags about 990 real ones and about 9,990 false ones, so nine out of ten alerts are wrong — and I would put those counts in front of them rather than a percentage, because counts are what people reason about correctly. Then I would connect it to the operational cost: nine wasted reviews per real case, which is either fine or not depending on what a review costs. And I would ask what they want optimised, since the answer determines the threshold and there is no setting that is good at everything.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Conditional probability', back: 'The same count, taken inside a smaller group. P(A|B) counts out of the B\'s only — which is where every mistake comes from.' },
    { front: 'Bayes\' rule', back: 'P(A|B) = P(B|A)·P(A) / P(B). To flip a conditional, multiply by the ratio of base rates — the part people drop.' },
    { front: 'The million-person count', back: '1,000 sick → 990 true positives. 999,000 well → 9,990 false positives. P(sick|positive) = 990/10,980 = 0.0902.' },
    { front: 'Why it happens', back: '1% of a very large group beats 99% of a very small one. Nothing is wrong with the test.' },
    { front: 'The prevalence table', back: 'Same test throughout: 0.1% → 0.0902, 1% → 0.5000, 10% → 0.9167, 50% → 0.9900. 1% is the crossover.' },
    { front: 'Where this is precision', back: 'Precision IS P(actually positive | predicted positive). It must be reported at the DEPLOYMENT base rate, not on a balanced test set.' },
    { front: 'Independence', back: 'P(A|B) = P(A), equivalently P(A∩B) = P(A)P(B). Usually false in real data.' },
    { front: 'Why naive Bayes survives being wrong', back: 'Classification needs the RANKING of class scores, not the probabilities — so its probabilities are badly calibrated and should not be believed.' },
  ],
  mindmapMarkdown: `- Conditional probability and Bayes
  - The idea
    - a probability is a count
    - conditioning = counting in a smaller room
    - P(A|B) and P(B|A) count out of DIFFERENT rooms
  - Bayes
    - P(A|B) = P(B|A) P(A) / P(B)
    - flipping requires the ratio of base rates
  - The million-person count
    - 1,000 sick -> 990 true positives
    - 999,000 well -> 9,990 false positives
    - P(sick|positive) = 990/10,980 = 0.0902
    - 1% of a huge group beats 99% of a tiny one
  - Same test, four populations
    - 0.1% -> 0.0902
    - 1% -> 0.5000 (the crossover)
    - 10% -> 0.9167
    - 50% -> 0.9900
    - screening != testing a symptomatic patient
  - In your work
    - precision IS this calculation
    - report it at the DEPLOYMENT base rate
    - threshold = a point on the cost trade
    - "99% accurate" is about a population, not a case
  - Independence
    - P(A|B) = P(A); usually false
    - naive Bayes assumes it anyway
    - ranking survives; calibration does not`,
}

export default m
