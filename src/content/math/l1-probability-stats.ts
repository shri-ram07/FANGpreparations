import type { Module } from '../types'

const m: Module = {
  id: 'math-l1-probability-stats',
  subjectId: 'math',
  level: 1,
  title: 'Probability and Statistics, Built From Counting',
  whyItMatters:
    'Later modules are full of short symbols: P(A | B), E[y | x], N(0, sigma squared), "log-likelihood", "prior", "posterior". Nobody defines them there, because they are supposed to be defined here. This module builds every one of them from counting whole objects — out of 1000 people, how many — so that by the end you can read those symbols out loud in plain English and compute each one by hand. It also settles the single most expensive mistake in the subject: a 99% accurate test for a rare disease tells you far less than you think, and you will compute exactly how much less.',
  assumes: [
    'You know what a percentage is, and how to turn 10% into the fraction 0.1',
    'You know how to take an average: add the numbers, divide by how many there are',
    'You have seen a Python list, a for loop, and an if statement',
    'No statistics background at all is needed. Every term used here is defined here, on its first appearance.',
  ],
  estMinutes: 52,
  sections: [
    {
      type: 'intuition',
      title: 'Probability is counting: out of 1000 cases, how many',
      md: `Forget formulas for a moment. Take 1000 students. 600 of them like machine learning. Pick one student at random. How likely is it that the one you picked likes machine learning?

- 600 out of 1000. Written as a fraction that is 600/1000 = **0.6**.
- That number, 0.6, is the **probability**. A probability is just a count of the cases you care about, divided by the count of all the cases.
- Because the top of that fraction can never be bigger than the bottom, a probability always sits between **0 and 1**. 0 means it never happens, 1 means it always happens.
- 0.6 can also be said as 60%. Percent means "out of 100", so 0.6 and 60% are the same number wearing different clothes. In this subject we use the 0-to-1 form, because that is what the formulas expect.
- The **notation**: we write **P(likes ML) = 0.6**. The letter P stands for probability, and whatever sits inside the brackets is the thing being counted. Read out loud: "the probability that a student likes ML is 0.6".
- The thing inside the brackets has a name: an **event**. An event is any yes-or-no description you can check for each of the 1000 students. "Likes ML" is an event. "Is taller than 170 cm" is an event.

Every idea in this module is built out of that one move: count the cases, divide by the total. When the symbols get dense later, come back here and start counting again.`,
    },
    {
      type: 'intuition',
      title: 'Conditional probability: count inside a smaller group',
      md: `Same 1000 students. Now we know two things about each one: whether they like ML, and whether they write C++.

- 600 like ML. 400 write C++. And **240 students do both** — they like ML *and* they write C++.
- Ask a different question: **among the students who like ML**, how many write C++? Not out of 1000 any more. Out of 600.
- 240 out of 600 = **0.4**. You threw away the 400 students who do not like ML, and counted again inside the 600 who are left.
- The **notation** for that is **P(C++ | ML) = 0.4**. The vertical bar is read out loud as the word **"given"**: "the probability of C++ **given** ML".
- The bar is not an operation. It is an instruction about which group you count inside. Everything to the right of the bar is the group you kept; everything to the left is what you count within it.
- The general rule, in words: **P(A given B) = (how many are both A and B) divided by (how many are B)**. Here: 240 / 600 = 0.4.

The most common error in this whole subject is reading the bar backwards. P(C++ | ML) is 240/600 = 0.4. P(ML | C++) is 240/400 = 0.6. Same 240 on top, different group on the bottom, different answer. Say the bar out loud as "given" every time and you will not slip.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Counting it out: probability and conditional probability, no formulas',
      code: `total = 1000
ml = 600
cpp = 400
both = 240

print(ml / total, cpp / total, both / total)
print(both / ml)
print((ml / total) * (cpp / total))

both2 = 300
print(both2 / ml)
print(both2 / total, (ml / total) * (cpp / total))

# ---- real output ----
# 0.6 0.4 0.24
# 0.4
# 0.24
# 0.5
# 0.3 0.24`,
      annotations: {
        1: 'The size of the whole group. Every probability in this snippet is something divided by this number, or divided by a piece of it.',
        2: 'How many of the 1000 like ML. A plain count of students, not a probability yet.',
        3: 'How many write C++. Note that 600 + 400 is more than 1000 — these two groups overlap, and the overlap is the next line.',
        4: 'How many students are in BOTH groups. This one number is what makes the rest of the snippet possible.',
        6: 'Three probabilities in one line: P(ML) = 600/1000 = 0.6, P(C++) = 400/1000 = 0.4, and P(ML and C++) = 240/1000 = 0.24. All three divide by the full 1000.',
        7: 'The conditional one. Dividing by ml instead of total is the whole difference: this is P(C++ | ML) = 240/600 = 0.4, counted inside the 600 ML students only.',
        8: 'Multiply the two separate probabilities: 0.6 x 0.4 = 0.24. Compare with line 6: the real overlap was also 0.24. That match is what independence means, and the next section explains it.',
        10: 'Now change one number. Suppose 300 students did both instead of 240. Nothing else about the class changes.',
        11: 'P(C++ | ML) is now 300/600 = 0.5. Knowing a student likes ML now tells you something: C++ went from 0.4 in the class overall to 0.5 inside this group.',
        12: 'And the match is gone: the real overlap is 0.3, while multiplying the separate probabilities still predicts 0.24. When those two disagree, the events are not independent.',
      },
    },
    {
      type: 'intuition',
      title: 'Independent events: when knowing one tells you nothing',
      md: `Look at what the code just printed. In the first version, P(C++) was 0.4 across the whole class, and P(C++ | ML) was also 0.4. Learning that a student likes ML changed nothing about your guess for C++.

- Two events are **independent** when knowing one of them happened does not change the probability of the other. In symbols: **P(A | B) = P(A)**.
- There is an equivalent test that is easier to compute: **P(A and B) = P(A) x P(B)**. Multiply the two separate probabilities, and if you get the real overlap, they are independent.
- First version: 0.6 x 0.4 = 0.24, and the real overlap was 0.24. Independent.
- Second version: 0.6 x 0.4 = 0.24, but the real overlap was 0.3. Not independent. Liking ML makes a student more likely to write C++.
- Where the multiply rule earns its keep: two dice. P(first is a 6) = 1/6, and P(second is a 6) = 1/6. The dice cannot see each other, so P(both 6) = 1/6 x 1/6 = **1/36**, about 0.028.
- Independence is an **assumption you make**, not something you can see in a formula. It is usually a little bit false. Words in a sentence are not independent — "New" makes "York" far more likely. Two purchases by the same customer are not independent either.

Watch for that word later. When a method says "assuming independence", it is buying a much simpler formula with an assumption that is only roughly true.`,
    },
    {
      type: 'math',
      intro: 'The two sentences above, written in symbols. Read the first one as: the probability of A given B equals how often A and B happen together, divided by how often B happens. The upside-down U means "and".',
      latex: [
        'P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)} \\qquad \\text{example: } \\frac{0.24}{0.6} = 0.4',
        'A, B \\text{ independent} \\iff P(A \\cap B) = P(A)\\,P(B) \\iff P(A \\mid B) = P(A)',
      ],
    },
    {
      type: 'intuition',
      title: 'Bayes’ rule: turning P(B given A) into P(A given B)',
      md: `Here is the situation that makes conditional probability worth learning. A disease is present in 1% of people. There is a test for it. The test is described to you like this: it comes back positive for 90% of people who have the disease, and it comes back positive for 5% of people who do not.

Those two numbers are both conditional probabilities, and both bars point the same way: P(positive | sick) = 0.9 and P(positive | well) = 0.05. But the question you actually care about points the other way: **you tested positive — what is P(sick | positive)?** Count it in whole people, out of 1000.

- 1% of 1000 people are sick, so **10 are sick** and **990 are well**. That starting split is the important part, and we will name it in a second.
- Of the 10 sick people, the test catches 90%: **9 test positive**, 1 is missed.
- Of the 990 well people, the test wrongly flags 5%: 0.05 x 990 = **49.5 test positive**. (Half a person is fine — it is an average over many towns of 1000.)
- So the total number of positive results is 9 + 49.5 = **58.5**. Those are all the people standing in the positive queue.
- You are one of them. Of those 58.5 people, only 9 are actually sick. **9 / 58.5 = 0.154**, about **15%**.
- A test that "catches 90% of sick people" gave you a positive result, and you are still about 85% likely to be fine.

Nothing is broken and no number was misreported. 5% of a very large well group (49.5 people) simply swamps 90% of a very small sick group (9 people).`,
    },
    {
      type: 'intuition',
      title: 'The four names, attached to numbers you just computed',
      md: `That calculation has a name for each piece, and those names appear constantly in later modules. Here they are, each pointing at a number from the paragraph above.

- **Prior** — what you believed before any evidence arrived. Here: P(sick) = 0.01, the 10 people out of 1000. It is also called the **base rate**.
- **Likelihood** — if the thing were true, how likely is this evidence? Here: P(positive | sick) = 0.9. Note the bar direction: it starts from the hypothesis and looks at the evidence.
- **Evidence** — how often the evidence shows up at all, true or not. Here: 58.5 out of 1000, so P(positive) = 0.0585. It is only there to make the answer a proper fraction of the positive queue.
- **Posterior** — your updated belief after seeing the evidence. Here: P(sick | positive) = 0.154. Posterior means "after".
- The rule tying them together is **Bayes’ rule**: posterior = likelihood x prior, divided by evidence. In symbols, P(sick | +) = P(+ | sick) x P(sick) / P(+) = 0.9 x 0.01 / 0.0585 = 0.154. The identical number, from the identical counting.
- The prior did not vanish. It got multiplied. Your belief went from 1% to 15% — the test moved you 15 times — but 15 times a tiny number is still a smallish number.

The one sentence to keep: **P(evidence | hypothesis) is not P(hypothesis | evidence)**. They are connected by Bayes’ rule, and the thing standing between them is the prior.`,
    },
    {
      type: 'math',
      intro: 'Bayes’ rule with every piece labelled. The second line says how the evidence P(+) is computed: positives come from two separate groups, so add both sources. The bar over "sick" means "not sick".',
      latex: [
        '\\underbrace{P(\\text{sick} \\mid +)}_{\\text{posterior}} = \\frac{\\overbrace{P(+ \\mid \\text{sick})}^{\\text{likelihood}} \\cdot \\overbrace{P(\\text{sick})}^{\\text{prior}}}{\\underbrace{P(+)}_{\\text{evidence}}}',
        'P(+) = P(+ \\mid \\text{sick})P(\\text{sick}) + P(+ \\mid \\overline{\\text{sick}})P(\\overline{\\text{sick}}) = 0.9(0.01) + 0.05(0.99) = 0.0585',
        'P(\\text{sick} \\mid +) = \\frac{0.9 \\times 0.01}{0.0585} = \\frac{0.009}{0.0585} \\approx 0.154',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same medical test, in code, still counting people',
      code: `n = 1000
sick = 10
well = n - sick

tp = 0.90 * sick
fp = 0.05 * well
print(tp, fp)

positives = tp + fp
print(positives)
print(tp / positives)

# ---- real output ----
# 9.0 49.5
# 58.5
# 0.15384615384615385`,
      annotations: {
        1: 'The town size. Everything below is a headcount inside it, which is the whole point: no probabilities until the last line.',
        2: 'The prior in people. 1% of 1000 is 10 people who really have the disease.',
        3: 'Everyone else: 990 people who are well. This is the group that produces all the false alarms.',
        5: 'True positives: the test catches 90% of the 10 sick people, so 9 of them get a positive result.',
        6: 'False positives: the test wrongly flags 5% of the 990 well people. 0.05 x 990 = 49.5 people, and there are far more of them than there are true positives.',
        7: 'Prints 9.0 and 49.5 side by side. Reading these two numbers next to each other is the entire lesson.',
        9: 'Everybody who got a positive result, from either group. This is the queue you are standing in.',
        10: 'Prints 58.5 — the size of that queue.',
        11: 'The posterior: of everyone in the positive queue, the fraction who are genuinely sick. 9 / 58.5 = 0.1538. Same answer as Bayes’ rule, computed without ever writing the formula.',
      },
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Bayes as a belief update — 1000 people, one test',
        notice: 'Step through it. The left column is evidence arriving; the right column is your belief, counted in whole people. The prior does not vanish — it gets multiplied.',
        leftLabel: 'evidence',
        rightLabel: 'belief',
        frames: [
          {
            note: 'Prior: 1% of the town is sick. In people, that is 10 sick and 990 well.',
            stack: [{ name: 'prior', value: '1% sick' }],
            heap: [
              { id: 'sick', value: '10 sick', label: 'prior' },
              { id: 'well', value: '990 well', label: 'prior' },
            ],
          },
          {
            note: 'Test everyone. It catches 90% of the sick, and wrongly flags 5% of the well. Those two numbers are the likelihoods.',
            stack: [
              { name: 'P(+ | sick)', value: '90%', to: 'sick' },
              { name: 'P(+ | well)', value: '5%', to: 'well' },
            ],
            heap: [
              { id: 'sick', value: '10 sick', label: 'prior' },
              { id: 'well', value: '990 well', label: 'prior' },
            ],
          },
          {
            note: 'Split both groups by what the test said. 90% of 10 = 9 caught. 5% of 990 = 49.5 false alarms.',
            stack: [
              { name: '90% of 10', value: '= 9', to: 'tp' },
              { name: '5% of 990', value: '= 49.5', to: 'fp' },
            ],
            heap: [
              { id: 'tp', value: '9 caught', label: 'sick +' },
              { id: 'fn', value: '1 missed', label: 'sick -' },
              { id: 'fp', value: '49.5 false alarm', label: 'well +' },
              { id: 'tn', value: '940.5 cleared', label: 'well -' },
            ],
          },
          {
            note: 'Your result is positive. Condition on it: delete everyone who tested negative. 9 + 49.5 = 58.5 people are left.',
            stack: [{ name: 'evidence', value: 'test = +', to: 'tp' }],
            heap: [
              { id: 'tp', value: '9 caught', label: 'sick' },
              { id: 'fp', value: '49.5 false alarm', label: 'well' },
            ],
          },
          {
            note: 'Posterior = 9 / 58.5 = 15.4%. Fifteen times the 1% prior — and still, 85% of the positive queue is well.',
            stack: [{ name: 'posterior', value: '15.4% sick' }],
            heap: [
              { id: 'tp', value: '9 sick', label: '15.4%' },
              { id: 'fp', value: '49.5 well', label: '84.6%' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Random variable: why capital Y is not the same as small y',
      md: `Up to now everything was an event: a yes-or-no description. Often you want a number instead of a yes-or-no — a height, a price, a count of clicks.

- A **random variable** is a number produced by a process you cannot fully predict, together with how likely each of its possible values is. A die roll is one: the possible values are 1 to 6, each with probability 1/6.
- The **notation**: a random variable gets a **capital letter**, usually X or Y. So "Y is the height of a randomly chosen adult" means Y is the whole undecided thing — every possible height, with how likely each one is.
- A **small letter** is one particular value that actually turned up. y = 172 is a height you measured off one real person. It is a fixed number, with no uncertainty left in it.
- So capital Y is the process; small y is one outcome of it. When you see "P(Y = y)" it reads "the probability that the process Y produces the specific value y".
- In a dataset, each row holds small letters: x is this row’s features, y is this row’s true answer. The capitals are the machinery behind the rows. That is why later modules write "the label y" for a row and "the distribution of Y" for the population.
- Two flavours worth naming, because the formulas differ. **Discrete**: countable values, like a die or a click count. **Continuous**: any value in a range, like height. For discrete you add up over the values; for continuous you integrate, which is the same adding-up done over a smooth range.

If a symbol confuses you later, first check its case. Half the confusion in ML notation is a capital being read as a lowercase.`,
    },
    {
      type: 'intuition',
      title: 'Expected value E[Y]: the long-run average',
      md: `Roll a fair die many times and average the results. What do you converge to?

- Each face has probability 1/6, so the average is (1 + 2 + 3 + 4 + 5 + 6) / 6 = 21/6 = **3.5**.
- That 3.5 is the **expected value**, and the **notation is E[Y]** — a capital E, square brackets, the random variable inside. Say it out loud as "the expected value of Y", or "the mean of Y".
- It is a weighted average: take each possible value, multiply by its probability, add them all up. When all values are equally likely, that is exactly the plain average you already know.
- "Expected" is a bad name and it traps people. A die never rolls 3.5. E[Y] is not what you expect to see on any one roll; it is the number the *average of many rolls* settles down to.
- Weights matter when the values are not equally likely. A lottery ticket pays 1,000,000 with probability 0.000001 and 0 otherwise: E[payout] = 1,000,000 x 0.000001 + 0 x 0.999999 = **1 rupee**. That is the honest value of the ticket, and it is why the ticket costs more than 1 rupee.
- On data you already have, E[Y] is estimated by just averaging your rows. Adding the numbers and dividing by how many there are IS the weighted average, because each row carries weight 1/n.`,
    },
    {
      type: 'intuition',
      title: 'E[y | x], the conditional mean — this is what a regression model predicts',
      md: `Put the bar and the expected value together and you get the most useful symbol in supervised learning.

- **E[Y | X = x]** means: restrict to the cases where the input is x, then take the average of Y inside that group. Read out loud: "the expected value of Y given X equals x". Later modules shorten it to **E[y | x]**.
- Concrete: five people, three from city A weighing 60, 70 and 80 kg, two from city B weighing 50 and 54 kg. Overall E[Y] = (60+70+80+50+54)/5 = 314/5 = **62.8** kg.
- Now condition. E[Y | city = A] = (60+70+80)/3 = **70**. E[Y | city = B] = (50+54)/2 = **52**.
- That is the same move as conditional probability: shrink to the group, then compute inside it. Only the thing you compute changed, from a count to an average.
- **Here is the payoff.** When you train a regression model and feed it an input x, the number it hands back is its estimate of E[Y | X = x] — the average outcome among all cases that look like x. It is not predicting *your* value. It is predicting the group average for cases like yours.
- That explains something that otherwise looks like a bug: a good model predicts 62 kg for someone who weighs 71 kg and is still doing its job correctly. The spread around the conditional mean is real, and no model removes it. Measuring that spread is the next section.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'E[Y] and E[Y | city], by adding and dividing',
      code: `rows = [('A', 60), ('A', 70), ('A', 80), ('B', 50), ('B', 54)]

total = 0
for city, weight in rows:
    total = total + weight
print(total / len(rows))

for want in ('A', 'B'):
    s = 0
    k = 0
    for city, weight in rows:
        if city == want:
            s = s + weight
            k = k + 1
    print(want, s / k)

# ---- real output ----
# 62.8
# A 70.0
# B 52.0`,
      annotations: {
        1: 'Five rows. Each row is a tuple — two values packed together in round brackets — holding a city label and a weight in kilograms.',
        3: 'A running total, starting at zero. Every value added to it will be a weight.',
        4: 'Tuple unpacking: because each row holds exactly two values, Python can hand them to two names at once. On the first pass city becomes the string A and weight becomes 60.',
        5: 'Add this row’s weight to the running total. After the loop, total is 314.',
        6: 'len(rows) is 5, so this prints 314/5 = 62.8. That is E[Y], the plain average over everybody.',
        8: 'Now do it once for city A and once for city B. Each pass computes one conditional mean.',
        9: 'The sum of weights inside the current city only. Reset to zero at the start of each pass, or city B would inherit city A’s total.',
        10: 'A counter for how many rows landed in this city. We cannot divide by 5 any more — the group is smaller than the dataset.',
        11: 'Walk all five rows again, unpacking each one the same way.',
        12: 'The condition, and the whole idea of the bar in E[Y | X = x]: skip every row that is not in the group we are conditioning on.',
        13: 'Only rows that survived the filter add their weight.',
        14: 'And only those rows increase the count, so the division below is over the right group size.',
        15: 'Prints 70.0 for A and 52.0 for B. These are E[Y | city = A] and E[Y | city = B] — and a regression model given the city as its input would aim at exactly these two numbers.',
      },
    },
    {
      type: 'intuition',
      title: 'Variance and standard deviation: how far the values sit from the mean',
      md: `Two groups can share a mean and be nothing alike. Take five numbers: **2, 4, 4, 4, 6**. Their mean is (2+4+4+4+6)/5 = 20/5 = **4**. Now measure the spread, by hand, in four steps.

- **Step 1, distances from the mean:** 2 - 4 = -2, 4 - 4 = 0, 4 - 4 = 0, 4 - 4 = 0, 6 - 4 = +2.
- **Step 2, square each one:** 4, 0, 0, 0, 4. Squaring does two jobs: it kills the minus signs, so the -2 and the +2 stop cancelling each other out, and it makes big misses count much more than small ones.
- **Step 3, average the squares:** (4 + 0 + 0 + 0 + 4) / 5 = 8/5 = **1.6**. That average is the **variance**. Notation: **Var(Y)**, or the symbol **sigma squared**, written as a lowercase Greek s with a small 2.
- **Step 4, take the square root:** the square root of 1.6 = **1.2649**. That is the **standard deviation**, notation **sigma** (lowercase Greek s).
- Why bother with the square root? Units. If the numbers were centimetres, the variance is in *squared* centimetres, which nobody can picture. The standard deviation is back in centimetres, so "the values sit about 1.26 away from the mean" is a sentence a human can use.
- Sanity check the answer against the data: the values run from 2 to 6, and a typical distance from 4 is somewhere between 0 and 2. A standard deviation of 1.26 sits sensibly in that range. If your computed sigma is bigger than the whole spread of the data, you made an arithmetic mistake.

Standard deviation is the ruler for the rest of statistics. "How unusual is this value?" almost always becomes "how many standard deviations from the mean is it?"`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The four steps, one line each',
      code: `xs = [2, 4, 4, 4, 6]
n = len(xs)

mean = sum(xs) / n
print(mean)

squares = []
for x in xs:
    squares.append((x - mean) ** 2)
print(squares)

var = sum(squares) / n
print(var)

sd = var ** 0.5
print(round(sd, 4))

# ---- real output ----
# 4.0
# [4.0, 0.0, 0.0, 0.0, 4.0]
# 1.6
# 1.2649`,
      annotations: {
        1: 'The same five numbers as the hand calculation, so you can check every printed value against your own working.',
        2: 'len() gives how many numbers there are: 5. It is used twice below, as the divisor.',
        4: 'sum() adds every element of the list. 20 divided by 5 gives the mean, 4.0.',
        5: 'Prints 4.0. Python shows a decimal point because dividing always produces a decimal number.',
        7: 'An empty list that will collect the squared distances, one per value.',
        8: 'Walk the five numbers one at a time. x is the current value.',
        9: 'Step 1 and step 2 in a single expression: (x - mean) is the distance, and ** 2 squares it. .append() sticks the result on the end of the squares list.',
        10: 'Prints [4.0, 0.0, 0.0, 0.0, 4.0] — exactly the five squared distances computed by hand.',
        12: 'Step 3: the average of the squared distances. 8 divided by 5 is the variance, 1.6.',
        13: 'Prints 1.6.',
        15: 'Step 4: raising to the power 0.5 IS taking the square root, and it needs no import. The result is the standard deviation.',
        16: 'round(x, 4) trims the decimal to 4 places so it prints as 1.2649 rather than 1.2649110640673518.',
      },
    },
    {
      type: 'intuition',
      title: 'The normal distribution and the notation N(mu, sigma squared)',
      md: `A **distribution** is just the answer to "which values show up, and how often". The most common shape in the whole subject is the bell curve.

- Measure the height of 10,000 adults and draw a histogram. Most people cluster near the middle, fewer are found as you move out either way, and the two sides look like mirror images. That shape is the **normal distribution**, also called the **Gaussian**.
- Two numbers describe it completely. **mu** (lowercase Greek m, said "mew") is the mean — where the peak sits. **sigma** is the standard deviation — how wide the bell is.
- The **notation**: **Y ~ N(mu, sigma squared)**. The N stands for normal. The squiggle is read "is distributed as". So "heights ~ N(170, 49)" says heights are bell-shaped with mean 170 and variance 49, so the standard deviation is the square root of 49 = 7.
- **The second slot is the variance, not the standard deviation.** This trips everybody. N(170, 49) means sigma = 7, not sigma = 49. In the very common **N(0, 1)** both readings agree — variance 1 and standard deviation 1 are the same number — which is exactly why the mistake survives.
- The rule worth memorising, called the **68-95-99.7 rule**: about 68% of the values land within 1 sigma of the mean, about 95% within 2 sigma, about 99.7% within 3 sigma. For our heights that is 68% between 163 and 177 cm.
- That converts "is this weird?" into arithmetic. A value 3 sigma out shows up about 3 times in 1000, which is why 3 sigma is the usual line for calling something an anomaly.
- One more piece of notation you will meet: **N(0, sigma squared)** used to describe *noise*. It says the errors are bell-shaped, centred on zero (so they are as often positive as negative) and typically sigma in size.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Counting the 68% instead of trusting it',
      code: `import random

random.seed(0)
heights = []
for i in range(10000):
    heights.append(random.gauss(170.0, 7.0))

inside = 0
for h in heights:
    if abs(h - 170.0) < 7.0:
        inside = inside + 1
print(inside)
print(inside / 10000)

# ---- real output ----
# 6814
# 0.6814`,
      annotations: {
        1: 'random is part of Python itself, no installation needed. It generates numbers that behave as if they came from a distribution.',
        3: 'seed(0) fixes the starting point of the generator, so you get these exact numbers when you run it too. Always seed anything you report.',
        4: 'An empty list to fill with 10,000 generated heights.',
        5: 'range(10000) runs the loop body 10,000 times. i is the loop counter and we never use it.',
        6: 'gauss(170.0, 7.0) draws one value from a normal distribution with mean 170 and standard deviation 7. Careful: this function takes sigma, while the notation N(170, 49) writes the variance.',
        8: 'A counter for how many heights landed within 1 sigma of the mean.',
        9: 'Walk all 10,000 generated heights.',
        10: 'abs() drops the minus sign, so this asks "is this height less than 7 cm away from 170, on either side?" — which is exactly "within 1 sigma".',
        11: 'Count it if it is.',
        12: 'Prints 6814 heights out of 10,000.',
        13: 'Prints 0.6814. The 68% in the 68-95-99.7 rule is not folklore — it is what the bell shape measures out to when you count.',
      },
    },
    {
      type: 'intuition',
      title: 'Likelihood: which setting makes the data I actually saw most probable?',
      md: `Flip a coin 10 times and get 8 heads. What is the coin’s chance of heads? Call it p. You do not know p, so try candidate values and see which one explains the data best.

- For one flip, the probability of the result you saw is p if it came up heads, and 1 - p if it came up tails. That is the whole model.
- The flips are independent, so the probability of the *whole sequence* is the product of the ten individual probabilities. Eight of them are p and two are 1 - p.
- Try p = 0.5: the product is 0.5 multiplied by itself ten times = 0.000977.
- Try p = 0.8: the product is (0.8 to the power 8) x (0.2 squared) = 0.006711. Nearly seven times bigger.
- Try p = 0.9: 0.004305. Better than 0.5, but worse than 0.8. So the best candidate so far is 0.8, which is exactly 8 out of 10.
- That product, viewed as a function of p, is called the **likelihood**. Note the flip in perspective: in a probability, the setting is fixed and the data varies; in a likelihood, the **data is fixed** (you really did see those 10 flips) and the **setting varies**.
- Choosing the setting that makes the likelihood largest is called **maximum likelihood estimation**. It is the reason nearly every model in ML is trained the way it is.

Careful with the English. "Likelihood" in ordinary speech means the same as "probability". In statistics it does not: a likelihood is a probability read as a function of the unknown setting, and it does not add up to 1 across the settings.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Four candidate coins, scored against the same 10 flips',
      code: `import math

flips = [1, 1, 0, 1, 1, 1, 0, 1, 1, 1]
for p in [0.5, 0.7, 0.8, 0.9]:
    product = 1.0
    log_total = 0.0
    for f in flips:
        one = p if f == 1 else 1 - p
        product = product * one
        log_total = log_total + math.log(one)
    print(p, round(product, 8), round(log_total, 4))

# ---- real output ----
# 0.5 0.00097656 -6.9315
# 0.7 0.00518832 -5.2613
# 0.8 0.00671089 -5.004
# 0.9 0.00430467 -5.4481`,
      annotations: {
        1: 'math is part of Python. We need math.log, the natural logarithm.',
        3: 'The data, fixed for the whole snippet: 1 means heads, 0 means tails. Eight ones and two zeros.',
        4: 'Four candidate values of p. Each pass through this loop scores one candidate coin against the same fixed data.',
        5: 'The running product starts at 1.0, because multiplying by 1 changes nothing — the same reason a running sum starts at 0.',
        6: 'The running sum of logs, starting at 0.0. We build both versions side by side so you can compare them.',
        7: 'Walk the ten flips. f is 1 or 0.',
        8: 'The model in one line: the probability of THIS flip is p if it was heads, otherwise 1 - p. The form "a if test else b" is Python’s conditional expression, read as "a when the test passes, otherwise b".',
        9: 'Multiply it into the running product. After ten passes, product is the likelihood of the whole sequence.',
        10: 'And add its logarithm to the running sum. Same calculation, with log applied to each factor.',
        11: 'Print the candidate, its likelihood, and its log-likelihood. Read the middle column: 0.8 gives the largest value, 0.00671. Read the third column: 0.8 also gives the largest log value, -5.004 (least negative). Both columns pick the same winner.',
      },
    },
    {
      type: 'intuition',
      title: 'Why we take the log of the likelihood',
      md: `Look at that output again. The middle column and the right-hand column disagree about everything except the one thing that matters — which p wins. Both crown 0.8. That is not a coincidence, and it is why everybody works with the log.

- **Reason 1: log turns a product into a sum.** The rule is log(a x b) = log(a) + log(b). So the log of a product of 10,000 probabilities is a sum of 10,000 logs. Sums are far easier to differentiate, which matters because training works by taking slopes.
- **Reason 2: products of small numbers collapse to zero.** Ten flips gave 0.0067, which is fine. Two thousand flips would give a number around 10 to the power -600, and a computer’s floating-point numbers stop at about 10 to the power -308. Below that it stores plain 0.0, so every candidate scores 0.0 and you cannot tell them apart. This is called **underflow**, and the next snippet shows it happening.
- **Reason 3, the one that makes it legal: log is increasing.** If a is bigger than b then log(a) is bigger than log(b), always. So log never reorders anything. The candidate with the biggest likelihood is still the candidate with the biggest log-likelihood. **The answer does not move — only the numbers you compute along the way do.**
- The **notation**: **log-likelihood** is written as a sum of log p terms. It is always negative for probabilities, because the log of any number below 1 is negative. "Less negative" means "better".
- One last twist you will meet everywhere: optimisers are built to make numbers *smaller*, not bigger. So we flip the sign and minimise the **negative log-likelihood** instead. Maximising -5.004 and minimising +5.004 are the same instruction.

When a later module says "we minimise the negative log-likelihood", it is saying exactly this: pick the setting that makes the observed data most probable, computed with logs so the arithmetic survives.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Underflow, watched live: the product dies, the sum of logs does not',
      code: `import math

product = 1.0
log_total = 0.0
for i in range(2000):
    product = product * 0.5
    log_total = log_total + math.log(0.5)
print(product)
print(round(log_total, 2))

# ---- real output ----
# 0.0
# -1386.29`,
      annotations: {
        1: 'math.log again, the natural logarithm.',
        3: 'The running product, starting at 1.0.',
        4: 'The running sum of logs, starting at 0.0.',
        5: 'Pretend a dataset of 2000 examples where the model gave each one a probability of 0.5. That is not even an unlikely dataset — it is a fair coin.',
        6: 'Multiply the probability in, example by example. This is exactly what computing a likelihood over a dataset does.',
        7: 'Add its log in, example by example. Exactly what computing a log-likelihood does.',
        8: 'Prints 0.0. The true value is about 10 to the power -602, far below what a float can hold, so the computer rounds it to zero. Every candidate setting would print 0.0, and the comparison is destroyed.',
        9: 'Prints -1386.29. The identical information, held as a sum, in a range a computer handles comfortably. This one line is the whole argument for logs.',
      },
    },
    {
      type: 'math',
      intro: 'The three notations from the last two sections, side by side. The capital pi means "multiply all of these together", the same way the capital sigma means "add all of these together". Theta is a stand-in for whatever settings your model has.',
      latex: [
        'L(\\theta) = \\prod_{i=1}^{n} p(y_i \\mid \\theta) \\qquad \\text{(likelihood: a product, one factor per example)}',
        '\\log L(\\theta) = \\sum_{i=1}^{n} \\log p(y_i \\mid \\theta) \\qquad \\text{(log-likelihood: the same thing, as a sum)}',
        '\\hat{\\theta} = \\arg\\max_{\\theta} \\log L(\\theta) = \\arg\\min_{\\theta} \\left(-\\log L(\\theta)\\right)',
      ],
    },
    {
      type: 'note',
      md: `That last line uses one symbol worth naming. **arg max** does not mean "the largest value"; it means "the setting that produces the largest value". For our coin, the max of the log-likelihood is -5.004, but the arg max is p = 0.8. You almost always want the arg max — the setting, not the score. And arg max of the log-likelihood equals arg min of the negative log-likelihood, which is why "minimise the negative log-likelihood" and "fit by maximum likelihood" are the same sentence.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: a spam filter, computed by hand',
      md: `You run a mailbox that receives 1000 emails a day. 200 of them are spam. Your filter looks for the word "free". You measure two things on last month’s mail: 60% of spam emails contain "free", and 5% of real emails contain it. An email arrives containing "free". How likely is it to be spam?

- **Name the pieces first.** Prior: P(spam) = 200/1000 = 0.2. Likelihoods: P("free" | spam) = 0.6 and P("free" | real) = 0.05. Wanted: the posterior P(spam | "free").
- **Count the spam side.** 200 spam emails, 60% contain "free": 0.6 x 200 = **120 emails**.
- **Count the real side.** 800 real emails, 5% contain "free": 0.05 x 800 = **40 emails**.
- **The evidence.** Emails containing "free" total 120 + 40 = **160** out of 1000, so P("free") = 0.16.
- **The posterior.** Of those 160, the spam ones are 120. So P(spam | "free") = 120/160 = **0.75**.
- **Check it with the formula**, which must agree because it is the same arithmetic: 0.6 x 0.2 / 0.16 = 0.12 / 0.16 = 0.75. It does.
- **Read the movement.** The prior was 0.2; the posterior is 0.75. Seeing the word "free" made spam nearly four times more likely — but it did not make it certain. One email in four containing "free" is a real email, so filing on this word alone would junk 40 real emails a day.

Now change one number and watch the answer swing. Suppose your mailbox is cleaner: only 20 emails a day out of 1000 are spam. Redo it: spam side 0.6 x 20 = 12, real side 0.05 x 980 = 49, total 61, posterior 12/61 = **0.197**. The identical filter, on the identical word, now says the email is probably *not* spam. Nothing about the filter changed. The prior did.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: the base rate, walked into on purpose',
      md: `Here is the version that catches almost everyone, including people who have just read everything above. A disease affects **1 person in 1000**. A test for it is **99% accurate**, meaning it is right 99% of the time on sick people and right 99% of the time on healthy people. You take the test. It comes back positive.

**The wrong answer, and how it feels correct.** The test is 99% accurate, and it said positive. So you are 99% likely to have the disease, with 1% left over for the test being wrong. Doctors give this answer, students give this answer, and it feels airtight because the number 99% is right there in the question.

**Now count, out of 100,000 people.**

- The base rate is 1 in 1000, so **100 people are sick** and **99,900 are healthy**.
- The test is right 99% of the time on sick people: 0.99 x 100 = **99 sick people test positive**. One is missed.
- The test is right 99% of the time on healthy people, which means it is **wrong 1% of the time** on them: 0.01 x 99,900 = **999 healthy people test positive**.
- The positive queue is 99 + 999 = **1,098 people**. You are one of them.
- Of that queue, 99 are actually sick. **99 / 1,098 = 0.0902**, about **9%**.

**The diagnosis.** The wrong answer read "99% accurate" as if it answered P(sick | positive). It does not. It answers P(positive | sick), the bar pointing the other way. Bayes’ rule says those two are connected by the prior, and the prior here is brutal: healthy people outnumber sick people 999 to 1. A 1% error rate applied to 99,900 healthy people produces 999 mistakes, and 999 swamps the 99 correct catches. The test did work — it moved you from 0.1% to 9%, a factor of 90 — but 90 times almost nothing is still not very much.

**The one-line habit that prevents this forever.** Whenever someone quotes an accuracy or a rate, ask "**out of which group?**" A rate measured on sick people cannot be read as a statement about the people who tested positive, because those are different groups with wildly different sizes. This is the same mistake as reading P(C++ | ML) as P(ML | C++) back at the start, and the same mistake as calling a fraud model useless because most of its alerts are false alarms.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Do these on paper before reading the next section. All the arithmetic is small on purpose, and counting whole objects will get you through every one of them.

1. In a class of 500, 300 own a laptop, 200 own a tablet, and 120 own both. Compute P(laptop), P(tablet | laptop), and P(laptop | tablet). Are the two events independent?
2. A factory’s machines produce 2% defective parts. Inspection catches 95% of defective parts and wrongly rejects 3% of good parts. Out of 10,000 parts, how many are rejected, and what is P(defective | rejected)?
3. The five numbers 10, 12, 14, 16, 18. Compute the mean, the variance, and the standard deviation by hand, showing the squared distances.
4. Test scores are N(60, 100). What is mu, what is sigma, and roughly what fraction of students score between 40 and 80?
5. A coin is flipped 5 times and comes up heads 3 times. Compute the likelihood for p = 0.4 and for p = 0.6, and say which p the data prefers. Then say why taking the log of both would not change your answer.`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `Check every step against your own working, not just the final number.

1. P(laptop) = 300/500 = **0.6**. P(tablet | laptop) counts inside the 300 laptop owners: 120/300 = **0.4**. P(laptop | tablet) counts inside the 200 tablet owners: 120/200 = **0.6**. Independence test: P(laptop) x P(tablet) = 0.6 x (200/500) = 0.6 x 0.4 = 0.24, and the real overlap is 120/500 = 0.24. They match, so the events **are independent** — and you can see it directly, since P(laptop | tablet) = 0.6 is the same as P(laptop) = 0.6.
2. Out of 10,000: 2% defective is **200 defective**, so **9,800 good**. Rejected defectives: 0.95 x 200 = **190**. Rejected good parts: 0.03 x 9,800 = **294**. Total rejected = 190 + 294 = **484**. P(defective | rejected) = 190/484 = **0.393**. So 61% of the rejection pile is perfectly good parts — the base rate at work again, in a factory instead of a clinic.
3. Mean = (10+12+14+16+18)/5 = 70/5 = **14**. Distances: -4, -2, 0, +2, +4. Squares: 16, 4, 0, 4, 16, which sum to 40. Variance = 40/5 = **8**. Standard deviation = square root of 8 = **2.828**. Sanity check: the values run from 10 to 18 and a typical distance from 14 is about 2 to 3, so 2.83 is sensible.
4. N(60, 100) puts the variance in the second slot, so **mu = 60** and **sigma is the square root of 100 = 10**. The range 40 to 80 is 60 minus 2 sigma to 60 plus 2 sigma, so by the 68-95-99.7 rule about **95%** of students land in it. If you answered sigma = 100, you read the second slot as the standard deviation — that is the trap named in the notation section.
5. Three heads and two tails. For p = 0.4: 0.4 x 0.4 x 0.4 x 0.6 x 0.6 = 0.064 x 0.36 = **0.02304**. For p = 0.6: 0.6 x 0.6 x 0.6 x 0.4 x 0.4 = 0.216 x 0.16 = **0.03456**. The data prefers **p = 0.6**, which is 3/5, exactly the observed fraction of heads. Logs would not change it because log is increasing: 0.03456 is bigger than 0.02304, so log(0.03456) = -3.365 is bigger than log(0.02304) = -3.770. The winner is the same; only the scale changed.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. This section names ideas you will meet later, so the words are not brand new when you get there.

- **Other named distributions.** **Bernoulli** is a single yes/no with probability p — one coin flip, one user clicking or not. **Binomial** is n independent Bernoullis added up, which answers "out of 1000 impressions, how many clicks?" and has mean n x p. **Poisson** counts events in a fixed window, like tickets arriving between 2pm and 3pm; its one parameter is both its mean and its variance. Each one is still just "which values, how often".
- **Why the bell curve is everywhere: the Central Limit Theorem.** Add up many small independent effects, whatever their own shapes, and the *sum* drifts toward a normal distribution. Height is a thousand genetic and dietary nudges added together; measurement error is a pile of tiny independent errors. That is why nobody chooses the normal distribution and it keeps showing up anyway.
- **Sampling and standard error.** You never measure the whole population, only a sample, so every statistic you compute is an estimate that wobbles. The wobble of a sample mean is sigma divided by the square root of n. The square root is the sting: to halve your uncertainty you need four times the data. It is also why a 200-row test set gives an accuracy figure you should not quote to three decimals.
- **Covariance and correlation.** Covariance asks whether two variables sit above their means at the same time; correlation is covariance with the units divided out, so it always lands between -1 and +1. Two warnings that never stop being relevant: correlation is not causation, and correlation only sees straight lines, so a perfect parabola scores exactly 0.
- **Where the log-likelihood becomes your training loss.** Assume each label came from the model’s predicted distribution, write the negative log-likelihood, and what you get is the cross-entropy loss used for classification. Assume instead that the errors are N(0, sigma squared) around the prediction, and the squared-error term drops out of the exponent, which is why MSE pairs with regression. You will do both derivations in **Metrics and Losses**; arrive there knowing that choosing a loss is really choosing a noise model.
- **Bayes beyond a single test.** Naive Bayes classifies text by multiplying per-word likelihoods and assuming the words are independent given the class — the assumption is plainly false and the classifier still works, because it only needs to get the ranking of the classes right. And L2 regularisation turns out to be a normal prior on the weights, which makes "penalise big weights" a statement of belief rather than a trick.`,
    },
  ],
  quiz: [
    {
      question:
        'A disease affects 1 person in 1000. A test is 99% accurate in both directions. You test positive. Roughly how likely are you to be sick?',
      options: [
        {
          text: 'About 99%, because that is the accuracy of the test',
          explanation:
            'This reads P(positive | sick) as if it were P(sick | positive). Those are different groups. The 99% describes how the test behaves on sick people, not what your positive result means.',
        },
        {
          text: 'About 9%',
          explanation:
            'Correct. Out of 100,000 people: 99 true positives from the 100 sick, and 999 false alarms from the 99,900 healthy. 99 / 1,098 = 0.090.',
        },
        {
          text: 'About 50%, since it either is or is not the disease',
          explanation: 'Two possible outcomes does not mean two equal probabilities. The counting gives 9%.',
        },
        {
          text: 'About 90%, which is 100% minus the 10% error',
          explanation: 'The error rate here is 1%, not 10%, and a posterior cannot be found by subtracting an error rate. It has to be weighted by how many healthy people there are.',
        },
      ],
      correct: 1,
    },
    {
      question: 'In P(H | E) = P(E | H) x P(H) / P(E), which term is the prior?',
      options: [
        { text: 'P(E | H)', explanation: 'That is the likelihood: how probable the evidence is if the hypothesis holds.' },
        { text: 'P(H)', explanation: 'Correct. P(H) is what you believed before the evidence arrived. It is also called the base rate.' },
        { text: 'P(H | E)', explanation: 'That is the posterior, the answer you are computing, not an input.' },
        { text: 'P(E)', explanation: 'That is the evidence, the size of the whole positive queue. It only rescales the answer into a proper fraction.' },
      ],
      correct: 1,
    },
    {
      question: 'Of 1000 students, 600 like ML, 400 write C++, and 240 do both. What is P(ML | C++)?',
      options: [
        { text: '0.24', explanation: 'That is P(ML and C++) = 240/1000, which divides by the whole class instead of by the group you conditioned on.' },
        { text: '0.4', explanation: 'That is P(C++ | ML) = 240/600 — the bar read backwards. Same 240 on top, wrong group on the bottom.' },
        { text: '0.6', explanation: 'Correct. Conditioning on C++ means counting inside the 400 C++ writers: 240/400 = 0.6.' },
        { text: '1.0', explanation: 'That would mean every C++ writer likes ML. Only 240 of the 400 do.' },
      ],
      correct: 2,
    },
    {
      question: 'A regression model is given an input x and returns 62. What is that number, stated precisely?',
      options: [
        { text: 'The exact value y for this case', explanation: 'No model can produce that. Cases with identical inputs still have different outcomes, and that spread is real.' },
        {
          text: 'Its estimate of E[Y | X = x] — the average outcome among all cases that look like x',
          explanation: 'Correct. A regression prediction is a conditional mean. It explains why a good model can be off on an individual row and still be right about the group.',
        },
        { text: 'The probability that y equals 62', explanation: 'A probability sits between 0 and 1 and answers a yes/no question. This output is a value on the same scale as y.' },
        { text: 'The mean of the whole training set, E[Y]', explanation: 'That would be the prediction if the model ignored x entirely. Conditioning on x is exactly what makes it move away from the overall mean.' },
      ],
      correct: 1,
    },
    {
      question: 'For the numbers 2, 4, 4, 4, 6, the variance is 1.6. What is the standard deviation, and why do we bother computing it?',
      options: [
        { text: '2.56, so that large errors count more', explanation: 'That is 1.6 squared, going the wrong way. The standard deviation is the square ROOT of the variance.' },
        {
          text: '1.2649, because the square root puts the spread back into the original units',
          explanation: 'Correct. Variance is in squared units, which nobody can picture. Sigma is on the same scale as the data, so it can be quoted to a human.',
        },
        { text: '1.6, they are the same thing', explanation: 'They are related but not equal. Variance is the average squared distance; sigma is its square root.' },
        { text: '4.0, the mean of the values', explanation: 'That is the mean, which says where the values sit, not how spread out they are.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is maximising the log-likelihood the same answer as maximising the likelihood?',
      options: [
        { text: 'Because log makes the numbers bigger', explanation: 'The log of a probability is negative, so it makes them smaller. Size is not the point; order is.' },
        {
          text: 'Because log is an increasing function, so it never changes which candidate is largest',
          explanation: 'Correct. If a is bigger than b then log(a) is bigger than log(b), always. The arg max does not move, only the scale you compute on.',
        },
        { text: 'Because log removes the independence assumption', explanation: 'The independence assumption is what let us multiply in the first place. Log does not touch it.' },
        { text: 'They are not the same — the log version gives a better answer', explanation: 'It gives the identical answer. If it gave a different one, the trick would be illegal rather than convenient.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain Bayes’ rule to a non-technical colleague in under a minute.',
      answer:
        'Start with how common the thing is, then let the evidence move you. Use people, not percentages. Take 1000 people where 10 have a disease. A test catches 9 of those 10, and also wrongly flags 5% of the 990 healthy people, which is about 50 more. So 58 or 59 people get a positive result and only 9 of them are sick, which is about 15%. The test was informative — it moved the belief from 1% to 15% — but the starting rarity is still doing most of the work. The sentence to land: how often the test fires on sick people is a different number from how often a positive result means you are sick.',
      isCaseBased: false,
    },
    {
      question: 'What is the difference between P(A | B) and P(B | A), and where does confusing them cost real money?',
      answer:
        'They share a numerator and differ in the group you divide by, which is why they connect through the base rates: P(A | B) = P(B | A) x P(A) / P(B). A medical screen with 99% sensitivity gets read as "99% of positives are sick", which can be off by a factor of ten. A face-matching system with a small per-scan false-positive rate, deployed across an airport, produces thousands of daily false alarms because the base rate of a genuine match is tiny. In court, a one-in-a-million DNA match rate gets presented as a one-in-a-million chance of innocence, which is a different quantity entirely. The habit that prevents all three: whenever anyone quotes a rate, ask out of which group it was measured.',
      isCaseBased: false,
    },
    {
      question:
        'Case: a factory ships parts. 2% are defective. Inspection catches 95% of defectives and wrongly rejects 3% of good parts. Management wants to scrap the inspection because most rejected parts turn out fine. What do you tell them?',
      answer:
        'Compute it in parts first. Out of 10,000: 200 defective, 9,800 good. Rejected defectives are 0.95 x 200 = 190. Rejected good parts are 0.03 x 9,800 = 294. The reject pile is 484, of which 190 are genuinely defective, so P(defective | rejected) is 190/484 = 39%. Management is right about the fact and wrong about the conclusion. When the defect rate is 2%, a majority-good reject pile is arithmetic, not malfunction: the 3% error rate applies to a group 49 times larger than the defective group. Then reframe the decision as cost rather than as a percentage. Ask what one shipped defective costs — recall, warranty, reputation — against what one wrongly scrapped good part costs. If a defect costs far more, a 39% hit rate is a bargain. The improvement lever is the 3% false-reject rate, because it is multiplied by the huge group: shaving it to 1% cuts the reject pile from 484 to 288 and raises the hit rate to 66% with no change to detection at all.',
      isCaseBased: true,
    },
    {
      question: 'What does a regression model actually predict, and why does that make it look wrong on individual rows?',
      answer:
        'It predicts E[Y | X = x], the average outcome across all cases whose input looks like x. It is a conditional mean, not an individual outcome. So if people with a given profile weigh 60, 70 and 80 kg, the honest prediction for that profile is 70, and it is wrong for all three of them. That is not a defect. The spread around the conditional mean is genuine variation, and no amount of training removes it — only better features can, by splitting the group into tighter ones. The practical consequence is how you report a model: quote the residual spread alongside the prediction, and be suspicious of a model whose predictions are as spread out as the raw data, since a conditional mean should be less variable than the thing it averages.',
      isCaseBased: false,
    },
    {
      question:
        'Case: your fraud model flags 5% of transactions and 90% of those flags are wrong. Product wants it pulled. Is the model broken?',
      answer:
        'Ask for the base rate before agreeing to anything. Say fraud is 0.5% of transactions. Out of 10,000 there are 50 frauds, and the model flags 500. If 10% of those 500 flags are correct, that is 50 catches — every single fraud, caught. A 10% hit rate here means perfect detection, not failure. The general shape: when the positive class is rare, a mostly-wrong alert queue is the normal condition, because the false alarms come from a group hundreds of times larger. Then move the conversation to cost. What does a missed fraud cost against a reviewer minute spent on a false alarm? Set the alert threshold so the expected cost is smallest, and size the queue to the review capacity you actually have. Report the hit rate within the top N alerts rather than an overall accuracy figure, since accuracy on a 0.5% positive rate is 99.5% for a model that flags nothing. The wrong first move is retraining; the right first move is counting the four boxes of the confusion table and asking what the base rate is.',
      isCaseBased: true,
    },
    {
      question: 'Why do practitioners minimise the negative log-likelihood instead of maximising the likelihood?',
      answer:
        'Three separate reasons, and only the last one makes it legal. The likelihood is a product of one probability per example, so with tens of thousands of examples it falls below what a float can represent and stores as exactly 0.0 — every candidate then scores zero and nothing can be compared. Log turns that product into a sum, which stays in a comfortable range and differentiates term by term, which matters because training moves by slopes. And log is an increasing function, so it never reorders the candidates: the setting that maximises the likelihood also maximises the log-likelihood. The sign flip is only a convention, since optimisers are written to make numbers smaller, and maximising a value is the same as minimising its negative.',
      isCaseBased: false,
    },
    {
      question: 'Someone says their data is N(0, 4). What exactly have they told you, and what is commonly misread?',
      answer:
        'They have said the values are normally distributed with mean 0 and variance 4, so the standard deviation is 2, not 4. The second slot holds the variance. That is the misreading, and it survives because the most common case anyone writes down is N(0, 1), where the variance and the standard deviation are both 1 and the two readings agree. With mu = 0 and sigma = 2, the 68-95-99.7 rule says about 68% of values sit between -2 and 2, about 95% between -4 and 4, and a value beyond 6 shows up roughly 3 times in 1000. The place this notation appears most is a noise assumption written as N(0, sigma squared), which says the errors are centred on zero and typically sigma in size.',
      isCaseBased: false,
    },
    {
      question:
        'Case: a screening programme for a rare cancer reports 99% sensitivity and a 2% false-positive rate. Health policy wants it rolled out to 10 million adults. What do you compute, and what do you recommend?',
      answer:
        'Compute the positive queue before anything else. Suppose the cancer is present in 1 in 2000, so 5000 cases among 10 million adults. True positives: 0.99 x 5000 = 4950. False positives: 0.02 x 9,995,000 = 199,900. The queue is about 204,850, and P(cancer | positive) is 4950/204,850 = 2.4%. So 97.6% of everyone told to come back for further tests does not have cancer. Then say what that means in the real world: roughly 200,000 people put through anxiety, follow-up imaging, and sometimes invasive biopsies with their own complication rates, in order to find 4950 cases and miss 50. Whether that trades well is a cost question, not a statistics question, and the numbers make it answerable. The levers are worth naming. Lowering the false-positive rate matters far more than raising sensitivity, because it multiplies the group of ten million: cutting 2% to 0.5% shrinks the queue to about 55,000 and raises the hit rate to 9%. Alternatively, screen a higher-risk subgroup, which raises the prior directly — the same test on a group with a 1 in 50 rate gives a hit rate above 30%. That is the general principle: with a rare condition, the prior and the false-positive rate control the outcome, and sensitivity is the least important of the three.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Probability, in one sentence', back: 'Count the cases you care about, divide by the count of all cases. Always lands between 0 and 1. Written P(A).' },
    { front: 'P(A | B) — how do you say it and compute it?', back: 'Say "probability of A given B". Throw away everything where B did not happen, then count A inside what is left: P(A and B) / P(B). 240/600 = 0.4.' },
    { front: 'Independent events', back: 'Knowing one tells you nothing about the other: P(A | B) = P(A). Equivalent easy test: P(A and B) = P(A) x P(B). Two dice: 1/6 x 1/6 = 1/36.' },
    { front: 'Bayes’ rule and its four names', back: 'Posterior = likelihood x prior / evidence. P(H | E) = P(E | H) x P(H) / P(E). Prior is what you believed before; posterior is after.' },
    { front: 'The base-rate mistake', back: '1 in 1000 sick, 99% accurate test, positive result: 99 true positives against 999 false alarms, so 99/1098 = 9%. P(E | H) is not P(H | E).' },
    { front: 'Capital Y vs small y, and E[Y]', back: 'Capital Y is the whole random process; small y is one measured value. E[Y] is the long-run average of Y: sum of value x probability. A die has E[Y] = 3.5 and never rolls it.' },
    { front: 'E[y | x] and variance', back: 'E[y | x] is the average of y among cases with input x — exactly what a regression model predicts. Variance is the average squared distance from the mean; sigma is its square root, in the original units.' },
    { front: 'N(mu, sigma squared) and the log trick', back: 'Second slot is the VARIANCE: N(170, 49) means sigma = 7. 68/95/99.7% of values fall within 1/2/3 sigma. Log turns the likelihood product into a sum: no underflow, easy slopes, and the winner never changes because log is increasing.' },
  ],
  mindmapMarkdown: `- Probability and Statistics, Built From Counting
  - Probability = counting
    - cases you want / all cases, between 0 and 1
    - notation P(A), A is an event
  - Conditional probability
    - P(A | B), the bar is said "given"
    - shrink the group, then count again
    - P(A|B) is NOT P(B|A)
  - Independence
    - P(A | B) = P(A)
    - test: P(A and B) = P(A) x P(B)
  - Bayes' rule
    - prior, likelihood, evidence, posterior
    - 1000 people: 9 true vs 49.5 false -> 15%
    - base-rate trap: 1 in 1000 + 99% test -> 9%
  - Random variables
    - capital Y is the process, small y is one value
    - E[Y] = long-run average, die = 3.5
    - E[y | x] = what regression predicts
  - Spread
    - variance = average squared distance
    - sigma = square root, original units
  - Normal distribution
    - N(mu, sigma squared), second slot is VARIANCE
    - 68-95-99.7 rule
  - Likelihood
    - data fixed, setting varies
    - log: product -> sum, no underflow
    - log is increasing, so the answer does not move
    - minimise negative log-likelihood`,
}

export default m
