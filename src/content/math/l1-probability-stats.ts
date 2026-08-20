import type { Module } from '../types'

const m: Module = {
  id: 'math-l1-probability-stats',
  subjectId: 'math',
  level: 1,
  title: 'Probability, Bayes & the Statistics ML Actually Uses',
  whyItMatters:
    'Every model outputs a probability, and almost every candidate misreads one. Bayes is why a 99%-accurate test can still be wrong 91% of the time, why your fraud model "fails" in production, and why cross-entropy is the loss you train with. This is the smallest pile of statistics that pays off in every later module — and the base-rate question is asked in interviews on purpose, because most people get it wrong out loud.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'Probability = counting the worlds that could happen',
      md: `Roll a die. Six things can happen, one of them will. Probability is bookkeeping over that list — nothing mystical about it.

- **Sample space** = every outcome that could occur. One die: {1, 2, 3, 4, 5, 6}.
- **Event** = a subset you care about. "even" = {2, 4, 6}, so P(even) = 3/6 = 0.5.
- Probabilities sit in [0, 1], and the whole sample space sums to 1. That is the entire rulebook.
- **Independent** = knowing one outcome tells you nothing about the other. Two dice: P(both 6) = 1/6 × 1/6 = 1/36.
- Independence is an *assumption*, never a fact of nature — and it is the assumption ML breaks most often (words in a sentence are not independent; your train and test rows might not be either).`,
    },
    {
      type: 'intuition',
      title: 'Conditional probability: shrink the universe',
      md: `P(A|B) — "probability of A **given** B" — is not a new operation. You threw away every world where B did not happen, then counted again inside what survived.

- A class of 30: 18 like ML, 12 do not. Of the 18 ML-likers, 10 also write C++.
- P(C++ | likes ML) = 10/18, **not** 10/30. The denominator shrank to the survivors of the condition.
- In symbols, the same sentence: P(A|B) = P(A and B) / P(B).
- The bar is a *filter*. Read it aloud as "restricted to the world where B is true".
- Independence, restated: P(A|B) = P(A). Conditioning changed nothing, so B carried no information about A.`,
    },
    {
      type: 'math',
      intro: 'Conditional probability, and what independence actually asserts.',
      latex: [
        'P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)} \\qquad P(B) > 0',
        'P(A \\cap B) = P(A)\\,P(B) \\iff A \\text{ and } B \\text{ are independent}',
      ],
    },
    {
      type: 'intuition',
      title: 'Bayes: the rule for changing your mind',
      md: `You believe something. Evidence arrives. How far should you move? Bayes is the only self-consistent answer, and it is three named pieces glued together.

- **Prior** P(H): what you believed before the evidence showed up.
- **Likelihood** P(E|H): if my hypothesis were true, how likely is *this* evidence?
- **Evidence** P(E): how likely the evidence was overall, true hypothesis or not. It is just the normalizer.
- **Posterior** P(H|E): the updated belief. Slogan worth memorizing: *posterior ∝ likelihood × prior*.
- The trap almost everyone falls into: **P(E|H) is not P(H|E)**. "99% of sick people test positive" is a completely different number from "99% of positives are sick".`,
    },
    {
      type: 'math',
      intro: 'Bayes\' theorem, with every piece named. The second line expands the denominator — that is the step people forget, and it is where the base rate hides.',
      latex: [
        '\\underbrace{P(H \\mid E)}_{\\text{posterior}} = \\frac{\\overbrace{P(E \\mid H)}^{\\text{likelihood}} \\cdot \\overbrace{P(H)}^{\\text{prior}}}{\\underbrace{P(E)}_{\\text{evidence}}}',
        'P(E) = P(E \\mid H)\\,P(H) + P(E \\mid \\neg H)\\,P(\\neg H)',
      ],
    },
    {
      type: 'intuition',
      title: 'The medical-test paradox, in whole people',
      md: `Percentages fool your brain. Counts of actual bodies do not. Take 10,000 people and a disease that 1% of them have.

- **100 are sick. 9,900 are healthy.** That is the prior, expressed in people.
- The test catches 99 of the 100 sick (99% sensitivity). One sick person is missed.
- The same test wrongly flags 10% of healthy people: 10% of 9,900 = **990 false alarms**.
- Positives total 99 + 990 = **1,089**. Only 99 of them are actually sick.
- 99 / 1,089 = **9.1%**. You tested positive, and you are still ~91% likely to be fine.
- Nothing is broken. The prior was tiny, and 10% of a huge healthy group swamps 99% of a tiny sick one.`,
    },
    {
      type: 'math',
      intro: 'The same arithmetic in the formula, so you can see the counts and the symbols are one object.',
      latex: [
        'P(\\text{sick} \\mid +) = \\frac{P(+ \\mid \\text{sick})\\,P(\\text{sick})}{P(+ \\mid \\text{sick})P(\\text{sick}) + P(+ \\mid \\text{well})P(\\text{well})}',
        '= \\frac{0.99 \\times 0.01}{0.99 \\times 0.01 + 0.10 \\times 0.99} = \\frac{0.0099}{0.1089} \\approx 0.091',
      ],
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Bayes as a belief update — 10,000 people, one test',
        notice: 'Step through it. The left column is evidence arriving; the right column is your belief, counted in people. The prior does not vanish — it gets multiplied.',
        leftLabel: 'evidence',
        rightLabel: 'belief',
        frames: [
          {
            note: 'Prior: 1% of the town is sick. In bodies, that is 100 sick and 9,900 healthy.',
            stack: [{ name: 'prior', value: '1% sick' }],
            heap: [
              { id: 'sick', value: '100 sick', label: 'prior' },
              { id: 'well', value: '9,900 healthy', label: 'prior' },
            ],
          },
          {
            note: 'Test everyone. It catches 99% of the sick, and wrongly flags 10% of the healthy. These two numbers are the likelihoods.',
            stack: [
              { name: 'sensitivity', value: '99%', to: 'sick' },
              { name: 'false alarm', value: '10%', to: 'well' },
            ],
            heap: [
              { id: 'sick', value: '100 sick', label: 'prior' },
              { id: 'well', value: '9,900 healthy', label: 'prior' },
            ],
          },
          {
            note: 'Split both groups by what the test said. 99% of 100 = 99 caught. 10% of 9,900 = 990 false alarms.',
            stack: [
              { name: '99% of 100', value: '= 99', to: 'tp' },
              { name: '10% of 9,900', value: '= 990', to: 'fp' },
            ],
            heap: [
              { id: 'tp', value: '99 caught', label: 'sick +' },
              { id: 'fn', value: '1 missed', label: 'sick -' },
              { id: 'fp', value: '990 false alarm', label: 'well +' },
              { id: 'tn', value: '8,910 cleared', label: 'well -' },
            ],
          },
          {
            note: 'Your result is positive. Condition on it: delete everyone who tested negative. 99 + 990 = 1,089 people are left.',
            stack: [{ name: 'evidence', value: 'test = +', to: 'tp' }],
            heap: [
              { id: 'tp', value: '99 caught', label: 'sick' },
              { id: 'fp', value: '990 false alarm', label: 'well' },
            ],
          },
          {
            note: 'Posterior = 99 / 1,089 = 9.1%. Nine times the 1% prior — and still, 91% of positives are false alarms.',
            stack: [{ name: 'posterior', value: '9.1% sick' }],
            heap: [
              { id: 'tp', value: '99 sick', label: '9.1%' },
              { id: 'fp', value: '990 well', label: '90.9%' },
            ],
          },
        ],
      },
    },
    {
      type: 'note',
      md: `"But my test is 99% accurate in **both** directions." Redo it: 99 true positives, and 1% of 9,900 healthy = 99 false positives. Total 198 positives, 99 of them sick → exactly **50%**. A coin flip, out of a 99%-accurate test, because the base rate is 1%. That is the whole lesson: **the prior is not a detail, it is half the answer**. It is also why screening a whole population for a rare condition buries you in false alarms, and why "my classifier is 99% accurate" means nothing until you ask what fraction of the data is positive.`,
    },
    {
      type: 'intuition',
      title: 'Where Bayes actually shows up in ML',
      md: `This is not a puzzle you solve once. It is machinery you will use under four different names.

- **Naive Bayes**: classify by P(class|words) ∝ P(words|class)·P(class), *assuming* words are independent given the class. The assumption is false and the classifier still works — a famous, useful lie.
- **Priors as regularization**: L2 penalty = a Gaussian prior on weights (they should be small); L1 = a Laplace prior (many should be exactly zero). Regularization is a prior wearing a loss function's clothes.
- **Calibration**: a model that outputs 0.7 should be right 70% of the time. Uncalibrated scores break every downstream decision threshold.
- **Imbalanced data**: train on a rebalanced set and your model's implicit prior is wrong for production — you correct the threshold, not the model.
- **Reading model outputs**: precision *is* P(actually positive | flagged). Recall is P(flagged | actually positive). Same two numbers Bayes swaps between.`,
    },
    {
      type: 'intuition',
      title: 'Distributions: named shapes for situations that repeat',
      md: `A distribution is just "which values, how often". Five cover most of ML — learn each by the one situation it owns.

- **Bernoulli**: one yes/no with probability p. One coin flip. One user, clicked or not. Mean p, variance p(1−p).
- **Binomial**: n independent Bernoullis added up. "Out of 1,000 impressions, how many clicks?" Mean np.
- **Uniform**: every value equally likely. Random initialization, random train/test splits, "I know nothing" priors.
- **Gaussian (normal)**: the bell curve. Heights, measurement noise, aggregated errors. Two parameters do everything: mean μ (where) and σ (how wide).
- **Poisson**: counts of rare events per fixed interval. Requests per second, defects per batch. One parameter λ, which is both its mean *and* its variance.
- **Exponential**: the waiting time *between* Poisson events — latency and time-to-failure modelling live here.`,
    },
    {
      type: 'math',
      intro: 'The Gaussian, the one density worth recognizing on sight. Everything inside the exponent is "how many standard deviations away, squared".',
      latex: [
        'p(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}}\\, e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}',
        'z = \\frac{x - \\mu}{\\sigma} \\quad \\text{(the standardized score — what feature scaling computes)}',
      ],
    },
    {
      type: 'note',
      md: `**Why the Gaussian is everywhere: the Central Limit Theorem.** Add up many small independent effects — whatever their own shapes — and the *sum* trends toward a bell curve. Human height is a thousand genetic and dietary nudges added together; measurement error is a pile of tiny independent errors. That is the whole reason the normal distribution keeps appearing without anyone choosing it. Memorize the **68-95-99.7 rule**: about 68% of the mass lies within 1σ of the mean, 95% within 2σ, 99.7% within 3σ. It converts any "is this weird?" question into arithmetic — a point 3σ out happens ~0.3% of the time, which is the standard anomaly-detection threshold.`,
    },
    {
      type: 'intuition',
      title: 'Expectation and variance: the center and the spread',
      md: `Two numbers summarize any distribution well enough to argue about it.

- **E[X], expectation** = the weighted average of the values, weighted by how likely each is. Not "what you expect to see" — a die's E[X] is 3.5, which it never rolls.
- The honest reading is **long-run**: repeat forever, average the results, you converge to E[X].
- **Variance** = the average *squared* distance from the mean. Squared, so misses do not cancel and big misses count extra — the exact reason MSE squares.
- **Standard deviation σ = √variance**, which lives in the original units. Variance in cm², σ in cm. Quote σ to humans.
- The identity worth memorizing: **Var(X) = E[X²] − E[X]²**. One pass over the data, no second pass to subtract the mean.`,
    },
    {
      type: 'math',
      intro: 'Expectation (discrete and continuous), variance, and the computational identity.',
      latex: [
        '\\mathbb{E}[X] = \\sum_i x_i\\, p(x_i) \\qquad \\mathbb{E}[X] = \\int x\\, p(x)\\, dx',
        '\\operatorname{Var}(X) = \\mathbb{E}\\big[(X - \\mathbb{E}[X])^2\\big] = \\mathbb{E}[X^2] - \\big(\\mathbb{E}[X]\\big)^2',
        '\\sigma = \\sqrt{\\operatorname{Var}(X)}',
      ],
    },
    {
      type: 'intuition',
      title: 'Covariance and correlation: do two things move together?',
      md: `Covariance asks whether X and Y are above their means at the same time. Correlation is covariance with the units divided out, so it always lands in [−1, 1].

- ρ = +1: perfect straight line going up. ρ = −1: perfect straight line going down. ρ = 0: no *linear* relationship.
- Correlation is unitless, so you can compare "height vs weight" against "ads vs revenue". Covariance you cannot — its size depends on the scales.
- **Correlation is not causation.** Ice-cream sales correlate with drownings; summer causes both. A lurking third variable, reverse causation, or pure coincidence explain most correlations you will meet.
- **Correlation only sees straight lines.** A perfect parabola y = x² has correlation exactly 0 — a flawless deterministic relationship that ρ reports as nothing. Plot before you trust ρ.
- In ML this bites twice: highly correlated features make linear-model coefficients unstable (multicollinearity), and a feature correlated with the target through leakage looks brilliant offline and dies in production.`,
    },
    {
      type: 'math',
      intro: 'Covariance and its normalized cousin.',
      latex: [
        '\\operatorname{Cov}(X, Y) = \\mathbb{E}\\big[(X - \\mu_X)(Y - \\mu_Y)\\big]',
        '\\rho_{XY} = \\frac{\\operatorname{Cov}(X, Y)}{\\sigma_X\\, \\sigma_Y} \\in [-1, 1]',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'NumPy: sample a Gaussian, then check every claim above against real numbers',
      code: `import numpy as np

rng = np.random.default_rng(0)           # seeded: you get these exact numbers
h = rng.normal(170.0, 7.0, size=10_000)  # heights, mu = 170 cm, sigma = 7 cm

print(h.mean().round(2))   # 170.04  <- sample mean, close to 170, not equal
print(h.var().round(2))    #  48.81  <- true variance is 7^2 = 49
print(h.std().round(2))    #   6.99  <- sigma, back in centimetres

# the 68-95-99.7 rule, counted instead of quoted
for k in (1, 2, 3):
    inside = np.mean(np.abs(h - 170.0) < k * 7.0)
    print(k, inside.round(3))            # 1 0.682 | 2 0.954 | 3 0.998

# Var(X) = E[X^2] - E[X]^2, verified on a tiny array
a = np.array([2., 4., 4., 4., 5., 5., 7., 9.])
print(a.var(), (a ** 2).mean() - a.mean() ** 2)   # 4.0 4.0  <- identical

# correlation only sees straight lines
x = np.linspace(-3, 3, 7)
print(np.corrcoef(x, x ** 2)[0, 1].round(3))      # 0.0  <- a perfect parabola`,
      annotations: {
        3: 'default_rng(0) is the modern seeded generator. Seed everything you report — an unseeded "result" is not a result.',
        6: 'The sample mean misses the true mean by 0.04 cm on 10,000 draws. It is an estimate, and estimates wobble.',
        7: 'Sample variance lands at 48.81, not 49. With n = 10,000 the gap is noise; with n = 10 it would be embarrassing.',
        13: '0.682 / 0.954 / 0.998 — the 68-95-99.7 rule is not folklore, it is what the bell curve measures out to.',
        17: 'One line proves the identity. Use it whenever you need variance in a single streaming pass.',
        21: 'Zero correlation, perfect relationship. This single line is the argument against trusting a correlation matrix alone.',
      },
    },
    {
      type: 'intuition',
      title: 'Sampling: you never have the population',
      md: `You want to know the average height of a country. You measure 500 people. Every statistic you compute is a guess about a thing you cannot see.

- **Population** = everyone/everything you care about, with true parameters μ and σ. You almost never observe it.
- **Sample** = the rows you actually have. Its statistics (x̄, s) are **estimators** of those parameters.
- The **sample mean x̄ is an unbiased estimator of μ**: it is not right, but it is not systematically high or low. Draw more samples, its average lands on μ.
- Every sample gives a different x̄. That wobble is what standard error measures — and why "our CTR went up 0.2%" is often noise.
- In ML this is your test set: test accuracy is a *sample estimate* of true accuracy. A 200-row test set gives you roughly ±3–4 points of wobble for free.`,
    },
    {
      type: 'note',
      md: `**Standard error in one line: SE = σ / √n.** It is the standard deviation *of the sample mean* — how much x̄ jumps around between samples. The √n is the whole story: to halve your uncertainty you need **four times** the data, and to shrink it 10× you need 100×. That is why the last accuracy point is so expensive, why tiny validation sets lie, and why an A/B test that "almost reached significance" usually needs far more traffic than anyone estimated.`,
    },
    {
      type: 'math',
      intro: 'The sample mean and its standard error.',
      latex: [
        '\\bar{X} = \\frac{1}{n}\\sum_{i=1}^{n} X_i \\qquad \\mathbb{E}[\\bar{X}] = \\mu',
        '\\operatorname{SE}(\\bar{X}) = \\frac{\\sigma}{\\sqrt{n}}',
      ],
    },
    {
      type: 'intuition',
      title: 'MLE: pick the parameters that make your data least surprising',
      md: `You saw 7 heads in 10 flips. What is the coin's bias p? Maximum likelihood answers by asking one question: **which p makes what I actually observed the most probable?** (Answer: 0.7.)

- Write the probability of your whole dataset as a function of the parameters. That is the **likelihood** — same formula as before, but now the data is fixed and the parameter is the variable.
- Multiply the per-example probabilities together (assuming independence), then pick the parameters that maximize the product.
- Two problems with a product: 10,000 numbers below 1 multiplied together **underflows to 0.0** in floating point, and products are painful to differentiate.
- **The log trick fixes both**: log turns products into sums, log is monotonic (so the maximizer does not move), and sums neither underflow nor scare the chain rule.
- So everyone maximizes the **log-likelihood**, and since optimizers minimize, we flip the sign: minimize the *negative* log-likelihood.`,
    },
    {
      type: 'math',
      intro: 'Likelihood → log-likelihood → the loss you already train with.',
      latex: [
        '\\mathcal{L}(\\theta) = \\prod_{i=1}^{n} p(x_i \\mid \\theta)',
        '\\hat{\\theta}_{\\text{MLE}} = \\arg\\max_{\\theta} \\sum_{i=1}^{n} \\log p(x_i \\mid \\theta)',
        '-\\frac{1}{n} \\sum_{i=1}^{n} \\log p(y_i \\mid x_i, \\theta) \\;=\\; \\text{cross-entropy loss}',
      ],
    },
    {
      type: 'note',
      md: `**Read that last line again — it is the payoff of the whole module.** Minimizing cross-entropy *is* maximizing likelihood; they are the same expression with a minus sign and a 1/n. Every classifier you train is doing MLE. The same trick explains MSE: assume Gaussian noise around your predictions, write the log-likelihood, and the squared-error term falls straight out. You will do both derivations properly in **Metrics & Losses** — arrive there knowing that "why this loss?" is really the question "what noise model did you assume?". One more freebie: the **law of large numbers** says the sample average converges to E[X] as n grows — which is the only reason any of this estimation works at all.`,
    },
    {
      type: 'note',
      md: `Resources worth the time: **StatQuest** on YouTube for probability and distributions — nobody explains this material more plainly. For the two sibling modules in this subject, 3Blue1Brown's **"Essence of Linear Algebra"** and **"Essence of Calculus"** are the visual foundation; watch them at 1× and do not take notes, they are meant to rewire intuition, not to be transcribed.`,
    },
  ],
  quiz: [
    {
      question:
        'A disease affects 1% of people. A test catches 99% of sick people and falsely flags 10% of healthy people. You test positive. Roughly how likely are you to be sick?',
      options: [
        {
          text: 'About 99% — that is the test\'s accuracy',
          explanation:
            'This confuses P(positive | sick) with P(sick | positive). The 99% describes how the test behaves on sick people, not what a positive result means for you.',
        },
        {
          text: 'About 9%',
          explanation:
            'Correct. Per 10,000 people: 99 true positives out of 100 sick, but 990 false alarms out of 9,900 healthy. 99 / 1,089 ≈ 9.1%. The base rate dominates.',
        },
        {
          text: 'About 50% — it either is or is not',
          explanation:
            'Not a probability argument. (50% is the answer to a different version of this problem, where the test also has only a 1% false-positive rate.)',
        },
        {
          text: 'About 90% — 100% minus the 10% false-positive rate',
          explanation:
            'The false-positive rate is a property of the test applied to healthy people. It cannot be subtracted from 1 to get a posterior — you must weight it by how many healthy people there are.',
        },
      ],
      correct: 1,
    },
    {
      question: 'In P(H|E) = P(E|H)·P(H) / P(E), which term is the prior?',
      options: [
        { text: 'P(E|H)', explanation: 'That is the likelihood — how probable the evidence is if the hypothesis holds.' },
        { text: 'P(H)', explanation: 'Correct. P(H) is your belief before the evidence arrives. P(H|E) is the posterior, after.' },
        { text: 'P(H|E)', explanation: 'That is the posterior — the output, not the input.' },
        { text: 'P(E)', explanation: 'That is the evidence (marginal likelihood), the normalizer that makes the posterior sum to 1.' },
      ],
      correct: 1,
    },
    {
      question: 'X and Y have correlation exactly 0. What can you conclude?',
      options: [
        { text: 'X and Y are independent', explanation: 'Too strong. Zero correlation implies independence only for jointly Gaussian variables — not in general.' },
        {
          text: 'There is no LINEAR relationship — but there may be a perfect nonlinear one',
          explanation: 'Correct. y = x² on symmetric x has ρ = 0 exactly, despite being fully deterministic. Correlation is blind to curves.',
        },
        { text: 'One does not cause the other', explanation: 'Correlation says nothing about causation in either direction — including zero correlation.' },
        { text: 'The data is noisy', explanation: 'ρ = 0 can occur in perfectly clean, noiseless data. Noise is a separate issue.' },
      ],
      correct: 1,
    },
    {
      question: 'Why do practitioners maximize the LOG-likelihood instead of the likelihood itself?',
      options: [
        { text: 'The log-likelihood has a different, better maximum', explanation: 'It has the SAME maximizer — log is monotonic, so the argmax does not move. That is exactly why the trick is legal.' },
        {
          text: 'Log turns the product into a sum: no floating-point underflow and much easier derivatives',
          explanation: 'Correct. Multiplying 10,000 numbers below 1 underflows to 0.0; a sum of logs does not, and sums differentiate term by term.',
        },
        { text: 'Because probabilities can be negative and log fixes the sign', explanation: 'Probabilities are never negative. Log of a probability is negative, which is a different thing.' },
        { text: 'It regularizes the model', explanation: 'The log has no regularizing effect. Regularization comes from adding a prior/penalty term, which is a separate choice.' },
      ],
      correct: 1,
    },
    {
      question: 'Var(X) = E[X²] − E[X]². For the array [2, 4, 4, 4, 5, 5, 7, 9], what is the variance?',
      options: [
        { text: '2', explanation: 'That is the standard deviation (√4 = 2), not the variance. σ lives in the original units; variance is squared.' },
        { text: '4', explanation: 'Correct. Mean = 5, E[X²] = 29, so 29 − 25 = 4. The standard deviation is then 2.' },
        { text: '5', explanation: 'That is the mean of the array, not its spread.' },
        { text: '29', explanation: 'That is E[X²] — you forgot to subtract E[X]² = 25.' },
      ],
      correct: 1,
    },
    {
      question: 'Your validation accuracy estimate is too noisy. You currently use 250 rows. To halve the standard error, how many rows do you need?',
      options: [
        { text: '500', explanation: 'Doubling n cuts SE by √2 ≈ 1.41×, not 2×. SE = σ/√n, so n enters under a square root.' },
        { text: '1,000', explanation: 'Correct. SE = σ/√n, so halving SE needs 4× the data: 250 × 4 = 1,000. This is why the last accuracy point is so expensive.' },
        { text: '375', explanation: 'That is 1.5× the data — it reduces SE by only about 18%.' },
        { text: '62,500', explanation: 'That is n², which would shrink SE by 250×. Massive overkill for a 2× reduction.' },
      ],
      correct: 1,
    },
    {
      question: 'Which situation is Poisson-shaped rather than binomial or Gaussian?',
      options: [
        { text: 'Out of 1,000 emails sent, how many were opened', explanation: 'Fixed n trials each with a yes/no outcome — that is binomial.' },
        {
          text: 'How many support tickets arrive between 2pm and 3pm',
          explanation: 'Correct. Counts of events in a fixed interval, with no fixed n, is exactly Poisson. Its mean and variance are both λ.',
        },
        { text: 'The heights of adults in a city', explanation: 'A continuous measurement built from many small additive effects — Gaussian, by the CLT.' },
        { text: 'Whether one user clicks an ad', explanation: 'A single yes/no trial is Bernoulli.' },
      ],
      correct: 1,
    },
    {
      question: 'A model reports P(fraud) = 0.9 for a transaction, and among all transactions it scores near 0.9, only 30% are actually fraud. What is wrong?',
      options: [
        { text: 'The model is uncalibrated', explanation: 'Correct. A calibrated model scoring 0.9 should be right ~90% of the time. Ranking may still be fine — but any fixed threshold or expected-cost calculation is now wrong.' },
        { text: 'The model is overfitting', explanation: 'Possible but not what the evidence shows. Miscalibration happens in models that generalize well (SVMs and boosted trees are famously miscalibrated).' },
        { text: 'The accuracy is too low', explanation: 'Accuracy is not measured here at all — this is about whether the probability outputs mean what they say.' },
        { text: 'Nothing — probabilities are only rankings', explanation: 'They are rankings only if you choose to treat them that way. Anyone downstream who multiplies 0.9 by a transaction amount is now making bad decisions.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain Bayes\' theorem to a non-technical stakeholder in under a minute.',
      answer:
        '"You start with how common something is. Then evidence arrives, and you ask: how much more likely is this evidence if the thing is true than if it is not? Multiply your starting belief by that ratio." Then reach for people, not percentages: 10,000 people, 1% sick, a test that catches 99% of the sick but false-alarms on 10% of the healthy — 99 real cases against 990 false alarms, so a positive means about 9%. The skill being tested is whether you can make the base rate concrete. Interviewers are listening for the sentence "P(evidence given hypothesis) is not P(hypothesis given evidence)".',
      isCaseBased: false,
    },
    {
      question:
        'Case: your fraud model flags 5% of transactions, and 90% of those flags turn out to be wrong. Product wants it pulled. Is the model broken?',
      answer:
        'Not necessarily — first ask for the base rate. Suppose fraud is 0.5% of transactions. Per 10,000: 50 frauds exist, and 500 get flagged, of which 10% (50) are correct. That is 100% recall at 10% precision — the model is catching everything and the "wrongness" is arithmetic, not failure. Precision is bounded above by the base rate divided by the flag rate; with a rare positive class, low precision is the normal condition, not a bug. Then reframe the decision as cost: what does a missed fraud cost versus a reviewer\'s time on a false alarm? Move the threshold until expected cost is minimized, quote precision@k or the PR curve instead of accuracy, and make sure the scores are calibrated so that expected-cost calculation is even valid. The wrong answer is "retrain with a better model"; the right first move is a confusion matrix and the base rate.',
      isCaseBased: true,
    },
    {
      question: 'Why is minimizing cross-entropy the same thing as maximum likelihood estimation?',
      answer:
        'Assume each label was drawn from your model\'s predicted distribution. The likelihood of the dataset is the product of p(y_i | x_i, θ). Take the log to turn it into a sum, negate it so the optimizer can minimize, divide by n to average — and what you have written is the cross-entropy loss, term for term. Nothing was added. Same story for regression: assume Gaussian noise around the prediction, write the log-likelihood, and the (y − ŷ)² term drops out of the exponent, which is why MSE pairs with regression. The interview payoff line: choosing a loss IS choosing a noise model, so "why this loss?" should be answered with a distributional assumption, not a preference.',
      isCaseBased: false,
    },
    {
      question: 'What does Naive Bayes assume, is the assumption true, and why does it work anyway?',
      answer:
        'It assumes features are conditionally independent given the class — so P(words | spam) factorizes into a product of per-word probabilities. In text this is plainly false: "new" and "york" are not independent. It works because classification only needs the *ranking* of class scores to be right, not the probabilities themselves; the dependency errors tend to inflate all classes in the same direction and cancel in the comparison. The consequence you must name: its probability outputs are badly overconfident (near 0 or 1), so use it for the argmax, never for a calibrated score. Add Laplace smoothing so an unseen word does not multiply the whole product to zero.',
      isCaseBased: false,
    },
    {
      question: 'Case: marketing shows that customers who receive the newsletter have 3× the retention. They want the newsletter sent to everyone. What do you say?',
      answer:
        'This is correlation presented as causation, and the likely mechanism is selection: engaged customers opt into newsletters, and engagement drives retention. The newsletter may be a symptom of loyalty, not a cause. Confounders to raise: tenure, plan tier, prior usage. Reverse causation is plausible too. The right answer is an experiment — randomize newsletter assignment across a matched population and measure the retention difference; randomization is what breaks the link between treatment and the confounders. If an RCT is impossible, propose the second-best options honestly: propensity-score matching or a difference-in-differences on a natural rollout, while stating that both rest on unverifiable assumptions. Also flag the cost of being wrong: mailing everyone risks unsubscribes and spam complaints on people who never wanted it.',
      isCaseBased: true,
    },
    {
      question: 'When does the Central Limit Theorem fail you?',
      answer:
        'Three cases. (1) Heavy tails without finite variance — Cauchy-like distributions, and in practice things like wealth, city sizes, and some financial returns, where the sample mean stays unstable no matter how large n gets. (2) Strong dependence between observations: the CLT assumes independence, so time series, clustered users, or repeated measurements per subject converge far more slowly, if at all — this is why naive A/B tests on multiple sessions from the same user overstate significance. (3) Small n with a violently skewed distribution: "n > 30" is a rule of thumb for gentle skew, not a law. Practical move: bootstrap the statistic instead of trusting the normal approximation.',
      isCaseBased: false,
    },
    {
      question: 'What is the difference between P(A|B) and P(B|A), and where does confusing them cost real money?',
      answer:
        'They differ by the base rates: P(A|B) = P(B|A)·P(A)/P(B). In ML terms, recall is P(flagged | positive) and precision is P(positive | flagged) — the same two conditionals. The costly confusions are everywhere: a medical screen with 99% sensitivity read as "99% of positives are sick"; a security system with a low per-scan false-positive rate deployed at airport scale generating thousands of daily false alarms; the prosecutor\'s fallacy, where a 1-in-a-million DNA match rate is presented as a 1-in-a-million chance of innocence. The habit that prevents all of it: when someone quotes a rate, ask "out of what population?"',
      isCaseBased: false,
    },
    {
      question: 'Case: your model hits 99.2% accuracy on a fraud dataset. Your manager wants to ship it today. What do you check first?',
      answer:
        'Ask for the class balance first — if fraud is 0.8% of rows, a model that predicts "not fraud" for everything scores 99.2%. Check whether the model predicts the positive class at all: look at the confusion matrix, and compare against the majority-class baseline before anything else. Then move to metrics that survive imbalance: precision, recall, PR-AUC, and precision@k for the review queue. Then ask whether the split is honest — fraud data is temporal, so a random split leaks future information into training; use a time-based split. Then check for leaked features (a "chargeback_flag" column set after the fact). The general lesson is that accuracy silently inherits the base rate, which makes it the least informative metric on skewed data.',
      isCaseBased: true,
    },
    {
      question: 'How is L2 regularization a Bayesian prior?',
      answer:
        'Do MAP estimation instead of MLE: maximize log p(data | θ) + log p(θ). Put a zero-mean Gaussian prior on the weights and log p(θ) becomes −λ‖θ‖², which is exactly the L2 penalty added to your loss. Swap in a Laplace prior and the log term becomes −λ‖θ‖₁ — L1, whose sharp peak at zero is why it drives coefficients exactly to zero rather than merely shrinking them. So the regularization strength λ is a statement about how strongly you believe weights should be small before seeing any data. Practical consequence worth saying: with lots of data the likelihood swamps the prior, which is why regularization matters most when data is scarce.',
      isCaseBased: false,
    },
    {
      question: 'Your A/B test shows variant B is 0.3% better on conversion, p = 0.04. Would you ship it?',
      answer:
        'Not on that alone. First check whether 0.3% is practically significant — statistical significance only says "probably not exactly zero", and with enough traffic any difference clears p < 0.05. Second, check how many metrics and variants were tested: p = 0.04 across twenty comparisons is the expected number of false positives, so ask for the pre-registered primary metric. Third, ask about the stopping rule — peeking at a running test and stopping when it goes green inflates the false-positive rate enormously. Fourth, ask for the confidence interval, not the p-value: if it spans [0.01%, 0.6%], the effect might be negligible. Finally, weigh the implementation and maintenance cost against the low end of that interval. The framing to state plainly: a p-value is P(data this extreme | no effect), not P(no effect | data) — the same conditional swap this module is about.',
      isCaseBased: false,
    },
    {
      question: 'Why is the sample mean a good estimator, and what would make it a bad one?',
      answer:
        'It is unbiased — E[x̄] = μ, so it is not systematically high or low — and by the law of large numbers it converges to μ as n grows, with uncertainty shrinking as σ/√n. It is also the MLE of μ under Gaussian data, which is a satisfying consistency. It becomes a bad estimator when the distribution has heavy tails or outliers, since a single extreme value drags it arbitrarily far (breakdown point 0); the median, which needs half the data corrupted to move, is the robust alternative. It is also useless when the sample is not representative — a biased sample gives you a precise estimate of the wrong population, and no amount of extra data fixes it. More data narrows variance; only better sampling removes bias.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'P(A|B) in one sentence', back: 'Throw away every world where B did not happen, then count A inside what is left. P(A|B) = P(A∩B)/P(B).' },
    { front: 'Bayes\' theorem + the four names', back: 'P(H|E) = P(E|H)·P(H) / P(E). Posterior = likelihood × prior / evidence. Slogan: posterior ∝ likelihood × prior.' },
    { front: 'The base-rate trap', back: '1% sick, 99% sensitivity, 10% false-alarm rate → a positive means ~9%. P(E|H) is NOT P(H|E).' },
    { front: 'Bernoulli / Binomial / Poisson', back: 'One yes-no (p) / n yes-nos summed (np) / counts per interval (λ = mean = variance).' },
    { front: 'Why Gaussian is everywhere', back: 'Central Limit Theorem: many small independent effects added together trend to a bell curve, whatever their own shapes.' },
    { front: '68-95-99.7', back: 'Mass within 1σ / 2σ / 3σ of the mean. A 3σ event is ~0.3% — the standard anomaly threshold.' },
    { front: 'Variance identity', back: 'Var(X) = E[X²] − E[X]². One pass, no pre-computed mean. σ = √Var, and σ is in the original units.' },
    { front: 'Correlation, two loud caveats', back: 'Correlation ≠ causation (confounders, reverse causation). And ρ only sees LINEAR structure — y = x² gives ρ = 0.' },
    { front: 'Standard error', back: 'SE = σ/√n — the wobble of the sample mean. Halving it costs 4× the data.' },
    { front: 'MLE + the log trick + the payoff', back: 'Pick θ maximizing p(data|θ). Log turns products into sums (no underflow, easy derivatives). Minimizing cross-entropy IS maximizing likelihood.' },
  ],
  mindmapMarkdown: `- Probability, Bayes & the Statistics ML Uses
  - Foundations
    - Sample space, events, independence
    - Conditional: shrink the universe
  - Bayes' theorem
    - posterior = likelihood x prior / evidence
    - P(E|H) is NOT P(H|E)
    - 1% prior: 99 true vs 990 false → 9.1%
    - Base rate is half the answer
  - Bayes in ML
    - Naive Bayes: false assumption, still works
    - Priors = regularization (L2 Gaussian, L1 Laplace)
    - Calibration; precision vs recall = same swap
  - Distributions
    - Bernoulli / Binomial / Uniform
    - Gaussian: CLT, 68-95-99.7
    - Poisson counts, Exponential waits
  - Expectation & spread
    - E[X] = weighted average, long-run reading
    - Var = E[X²] − E[X]², σ = √Var
    - Cov → correlation: not causal, only linear
  - Sampling: mean unbiased, SE = σ/√n, LLN
  - MLE
    - Log turns products into sums, no underflow
    - Cross-entropy = negative log-likelihood`,
}

export default m
