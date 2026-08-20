import type { Module } from '../types'

const m: Module = {
  id: 'ml-l2-logistic-regression',
  subjectId: 'ml',
  level: 2,
  title: 'Logistic Regression: Sigmoid, Cross-Entropy & Decision Boundaries',
  whyItMatters:
    'Linear regression answers questions like "how much rent?" with a number. A huge number of real questions are not like that. Will this student pass? Is this email spam? Does this patient have the disease? The honest answer to those is a chance between 0 and 1, and a straight line cannot produce one — it will cheerfully hand you 1.4 or minus 0.4. This module builds the fix from scratch: one function that squashes any number into a probability, one rule that turns a probability into a decision, and the arithmetic to see both working on six students you can count on your fingers.',
  assumes: [
    'You have read *Gradient Descent + Linear Regression* — you know that a model is w times x plus b, and that training means nudging w and b downhill',
    'You have read *The Confusion Matrix: Precision, Recall & F1* — you know what a false positive and a false negative are',
    'You have seen a Python for loop, a list, and a function definition',
    'School maths: what a straight line is, and what a fraction is. No calculus is used or needed here.',
  ],
  estMinutes: 38,
  sections: [
    {
      type: 'intuition',
      title: 'Six students, one straight line, and an answer of 1.4',
      md: `Six students. We know how many hours each one studied, and whether they passed. Pass is written as **1**, fail as **0**.

- Hours studied: **1, 2, 3, 4, 5, 6**. Passed: **0, 0, 0, 1, 1, 1**.
- The obvious first idea: this is just linear regression. Fit a straight line through those six points, exactly as in the previous module, and read the height of the line as the answer.
- Fitting it by hand is the same two sums as before. The average hours is 3.5 and the average pass value is 0.5. The top sum is 4.5 and the bottom sum is 17.5, so the **slope is 4.5 / 17.5 = 0.2571**, and the **intercept is 0.5 − 0.2571 × 3.5 = −0.4**.
- So the line is **height = 0.2571 × hours − 0.4**. Now feed it a student who studied 7 hours: 0.2571 × 7 − 0.4 = **1.4**.
- Feed it a student who studied 0 hours: **−0.4**.

A pass value of 1.4 and a pass value of −0.4. Neither of those is a thing. You cannot pass 140% or fail 40% below zero. The line does not know 0 and 1 are the only two answers, so it walks straight past both of them.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The straight line, walking off both ends',
      code: `hours = [1, 2, 3, 4, 5, 6]
passed = [0, 0, 0, 1, 1, 1]

slope = 0.2571
intercept = -0.4
for h in [0, 1, 3, 4, 6, 7]:
    line = slope * h + intercept
    print(h, round(line, 3))

# ---- real output ----
# 0 -0.4
# 1 -0.143
# 3 0.371
# 4 0.628
# 6 1.143
# 7 1.4`,
      annotations: {
        1: 'The six study-hour values, as a plain Python list of numbers.',
        2: 'The matching six outcomes, in the same order: 0 means failed, 1 means passed. So hours[3] and passed[3] describe the same student.',
        4: 'The slope we computed by hand above: the line rises 0.2571 for every extra hour studied.',
        5: 'The intercept: where the line sits when hours is 0. It is negative, which is already the warning sign.',
        6: 'Walk over six study-hour values. Two of them (0 and 7) are outside the range we fitted on, deliberately.',
        7: 'The whole model: multiply by the slope, add the intercept. Nothing squashes the result.',
        8: 'round(line, 3) trims the decimal to 3 places so the column is readable. Look at the first and last rows: -0.4 and 1.4.',
      },
    },
    {
      type: 'intuition',
      title: 'Three words: probability, odds, log-odds',
      md: `Before we fix the line, three words. They all describe the same belief in three different scales, and the module uses all three.

- **Probability** is a number between 0 and 1 saying how likely something is. 0 means it will not happen, 1 means it certainly will, 0.75 means three times out of four.
- **Odds** is the same belief written as a ratio: how likely it happens divided by how likely it does not. A probability of 0.75 gives odds of 0.75 / 0.25 = **3**, said out loud as "3 to 1 on". Probabilities live between 0 and 1; odds live between 0 and infinity.
- **Log-odds** is the natural logarithm of the odds. For odds of 3, the log-odds is ln(3) = **1.0986**. This is the important one, because it has no ceiling and no floor: as the probability creeps toward 1 the log-odds runs off to plus infinity, and as it creeps toward 0 it runs off to minus infinity. A probability of exactly 0.5 gives odds of 1 and log-odds of ln(1) = **0**.
- Log-odds has a shorter name that you will see everywhere: the **logit**.

That last point is the whole trick. A straight line produces any number from minus infinity to plus infinity, and so does the log-odds. They live on the same scale. So we do not force the line to produce a probability. We let the line produce the **log-odds**, and then convert.`,
    },
    {
      type: 'intuition',
      title: 'Converting log-odds back to a probability: the sigmoid',
      md: `We need the conversion that runs backwards: log-odds in, probability out. Do the algebra once, in three small steps, calling the log-odds **z** and the probability **p**.

- Start from the definition: **z = ln(p / (1 − p))**.
- Undo the logarithm by raising e to both sides: **e^z = p / (1 − p)**.
- Multiply out and collect the p terms: e^z − p·e^z = p, so e^z = p(1 + e^z), so **p = e^z / (1 + e^z)**.
- Divide the top and bottom by e^z and you get the form everybody writes: **p = 1 / (1 + e^(−z))**.

That function has a name: the **sigmoid**, written σ(z). It is not a rule someone invented because it looked nice. It is the exact inverse of "take the log-odds", which is why it lands on probabilities and never outside them.`,
    },
    {
      type: 'intuition',
      title: 'Hand-computing the sigmoid on five values of z',
      md: `Do it with a calculator before you let Python do it, so you know what the code is producing. Use e ≈ 2.71828.

- **z = 0.** e^(−0) = 1. So p = 1 / (1 + 1) = **0.5** exactly. Zero log-odds means "no opinion", and it always comes out at one half.
- **z = 1.** e^(−1) = 0.3679. So p = 1 / 1.3679 = **0.7311**.
- **z = −1.** e^(1) = 2.7183. So p = 1 / 3.7183 = **0.2689**. Notice it is exactly 1 − 0.7311. The curve is symmetric about z = 0.
- **z = 4.** e^(−4) = 0.0183. So p = 1 / 1.0183 = **0.9820**.
- **z = −4.** e^(4) = 54.598. So p = 1 / 55.598 = **0.0180**.

Read the five answers in order: 0.0180, 0.2689, 0.5, 0.7311, 0.9820. Every one is strictly between 0 and 1, and they never reach either end. Moving z from 0 to 1 changed the probability by 0.23; moving it from 1 to 4 changed it by only 0.25 across three times the distance. The curve is steep in the middle and flat at both ends. That shape is why it is called an **S-curve**.`,
    },
    {
      type: 'math',
      intro: 'The two directions, written in symbols. The first line is the sigmoid you just computed by hand; the second is its inverse, the logit, which is what the straight line is allowed to produce.',
      latex: [
        '\\sigma(z) = \\frac{1}{1 + e^{-z}}, \\qquad z = w \\cdot x + b, \\qquad p = \\sigma(z)',
        '\\ln\\!\\left(\\frac{p}{1-p}\\right) = z = w \\cdot x + b \\qquad \\text{(log-odds in, probability out, and back again)}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same five values, in Python',
      code: `import math

def sigmoid(z):
    return 1 / (1 + math.exp(-z))

for z in [-4.0, -1.0, 0.0, 1.0, 4.0]:
    p = sigmoid(z)
    print(z, round(p, 4))

# ---- real output ----
# -4.0 0.018
# -1.0 0.2689
# 0.0 0.5
# 1.0 0.7311
# 4.0 0.982`,
      annotations: {
        1: 'math is part of Python itself, no install needed. It gives us math.exp, which raises e to a power.',
        3: 'Defines a function named sigmoid that takes one number, z, and hands one number back.',
        4: 'The formula, character for character: math.exp(-z) is e to the power minus z, and we divide 1 by one-plus-that.',
        6: 'The same five z values you just did on paper, so the printed answers are checkable against your own working.',
        7: 'Call the function and keep the answer in p.',
        8: 'Print z and the probability, trimmed to 4 decimals. Compare row by row with the hand computation: 0.018, 0.2689, 0.5, 0.7311, 0.982. Python drops the trailing zero on 0.0180 and 0.9820.',
      },
    },
    {
      type: 'intuition',
      title: 'The whole model, in one sentence',
      md: `Logistic regression is linear regression with the sigmoid bolted onto the end.

- The line computes **z = w · x + b**, exactly as before. Nothing about that changed.
- The sigmoid converts z into a probability: **p = σ(z)**.
- The name "regression" survives because the model really is doing a linear regression — just on the log-odds instead of on the label.
- Training still means nudging w and b downhill, exactly the loop from *Gradient Descent + Linear Regression*. What changes is the number being pushed downhill, which is the next section.`,
    },
    {
      type: 'intuition',
      title: 'Which number do we push downhill? Not squared error.',
      md: `In the previous module the training loop minimised squared error: take prediction minus truth, square it, average. That still computes here, but it is the wrong choice, and the reason is specific.

- The loss used instead is **cross-entropy**, also called **log loss**: for a true label of 1 the penalty is **−ln(p)**, and for a true label of 0 it is **−ln(1 − p)**. Only one of the two applies to any given sample, because a label is either 0 or 1.
- Sanity-check it on numbers. True label 1 and the model says p = 0.9: the penalty is −ln(0.9) = **0.105**, small. True label 1 and the model says p = 0.01: the penalty is −ln(0.01) = **4.61**, forty times larger. Being confidently wrong is punished savagely, which is exactly what you want.
- The reason it beats squared error is about the *size of the nudge*, not the size of the penalty. Here is the conclusion in one sentence: **with a sigmoid on the end, squared error produces an almost-zero nudge exactly when the model is confidently wrong, while cross-entropy produces its biggest nudge there.**
- Numbers for that claim. Take a sample whose true label is 1 while z = −6, so p = σ(−6) = 0.00247 — the model is 99.75% sure of the wrong answer. Cross-entropy pushes w by an amount proportional to (p − y) = **0.9975**. Squared error pushes by (p − y) × p × (1 − p) = 0.9975 × 0.00247 × 0.99753 = **0.00246**, about **405 times weaker**. The worst mistake produces the smallest correction.
- Where that extra p(1 − p) factor comes from is worked through in full, step by step, in the Metrics subject module *Classification Losses: Cross-Entropy, Focal & Hinge*. The numbers above are enough to use the result.`,
    },
    {
      type: 'math',
      intro: 'Cross-entropy for one sample, and the nudge it produces for one weight. y is 0 or 1, so exactly one term of the first line survives per sample.',
      latex: [
        'L = -\\bigl[\\, y \\ln p + (1-y) \\ln (1 - p) \\,\\bigr] \\qquad p = \\sigma(w \\cdot x + b)',
        '\\text{cross-entropy nudge for } w: \\;(p - y)\\,x \\qquad \\text{squared-error nudge for } w: \\;(p - y)\\,p\\,(1-p)\\,x',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Training the six students, one nudge at a time',
      code: `import math

hours = [1, 2, 3, 4, 5, 6]
passed = [0, 0, 0, 1, 1, 1]

w = 0.0
b = 0.0
for sweep in range(4000):
    for h, y in zip(hours, passed):
        p = 1 / (1 + math.exp(-(w * h + b)))
        error = p - y
        w = w - 0.05 * error * h
        b = b - 0.05 * error

print(round(w, 3), round(b, 3))

# ---- real output ----
# 4.496 -15.547`,
      annotations: {
        1: 'For math.exp again. This snippet uses no library beyond it.',
        3: 'The same six study-hour values from the top of the module.',
        4: 'The same six outcomes. Both lists stay unchanged for the whole run.',
        6: 'Start the weight at zero. With w = 0 and b = 0, z is 0 for everybody, so the model starts by saying 0.5 to every student.',
        7: 'Start the bias at zero too.',
        8: 'Do 4000 full passes over the six students. sweep is never used inside; it is only a counter.',
        9: 'zip(hours, passed) walks two lists side by side, handing back one pair at a time: h is the study hours, y is the true outcome for that same student.',
        10: 'The current model prediction for this student: build z = w*h + b, then squash it through the sigmoid.',
        11: 'Prediction minus truth. This single number is the entire cross-entropy nudge, as promised by the formula above.',
        12: 'Move w against the error, scaled by the input h and by a step size of 0.05. A student who studied many hours moves w more, because their h is bigger.',
        13: 'Move b the same way, without the h, because b is not multiplied by any input.',
        15: 'The learned model: w = 4.496 per study hour, b = -15.547. Every number below in this module comes from these two.',
      },
    },
    {
      type: 'intuition',
      title: 'Threshold and boundary: turning a probability into a verdict',
      md: `The model now says things like "0.547". That is the model's whole output. It is not yet a yes or a no.

- A **decision threshold** is the cut-off you pick for calling the answer "yes". Threshold 0.5 means: say pass when p is 0.5 or more.
- The **decision boundary** is the place in the input where the probability crosses that threshold. On one side you say yes, on the other you say no.
- Find it with the numbers we have. At threshold 0.5, the probability is 0.5 exactly when the log-odds z is 0, which means 4.496 × hours − 15.547 = 0, which means **hours = 3.458**. Study 3.46 hours and up, you are predicted to pass.
- Now move the threshold to 0.3. A probability of 0.3 means log-odds of ln(0.3 / 0.7) = **−0.8473**. Solve 4.496 × hours − 15.547 = −0.8473 and you get **hours = 3.270**.
- Move it to 0.8 instead: ln(0.8 / 0.2) = **1.3863**, and 4.496 × hours − 15.547 = 1.3863 gives **hours = 3.766**.

Three thresholds, three boundaries: 3.270, 3.458, 3.766. The model never changed — w and b are still 4.496 and −15.547. Only the cut-off moved, and the boundary slid with it. Moving a threshold costs one number and no retraining; changing the model costs a training run.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Where the boundary sits, for three thresholds',
      code: `import math

w = 4.496
b = -15.547

def boundary_hours(threshold):
    logit = math.log(threshold / (1 - threshold))
    return (logit - b) / w

for t in [0.3, 0.5, 0.8]:
    print(t, round(boundary_hours(t), 3))

# ---- real output ----
# 0.3 3.27
# 0.5 3.458
# 0.8 3.766`,
      annotations: {
        1: 'math.log is the natural logarithm, the same ln you used by hand a moment ago.',
        3: 'The weight learned by the previous snippet, pasted in so this one runs on its own.',
        4: 'The bias learned by the previous snippet.',
        6: 'A function that takes a threshold, like 0.5, and returns the study-hours value where the model crosses it.',
        7: 'Turn the threshold probability into its log-odds. For 0.5 this is ln(1) = 0; for 0.3 it is -0.8473.',
        8: 'Solve w*hours + b = logit for hours: subtract b, divide by w. That is the entire boundary calculation.',
        10: 'The same three thresholds you did on paper.',
        11: 'Print the threshold and its boundary. Compare with the hand numbers: 3.27, 3.458, 3.766.',
      },
    },
    {
      type: 'intuition',
      title: 'Why the boundary is always straight',
      md: `The sigmoid is a curve, so people expect the boundary to be a curve. It is not, and the reason takes three lines.

- The sigmoid never reorders anything: if z goes up, p goes up, always. So "p is at least 0.5" happens exactly when "z is at least 0", with no exceptions.
- Therefore the boundary is the set of inputs where **w · x + b equals some fixed number**. With one input that is a single point (our 3.458 hours). With two inputs it is a straight line. With three it is a flat plane.
- Changing the threshold changes which fixed number, which slides the line sideways. It never bends it.
- A dataset is called **linearly separable** when a single straight line can be drawn with all the yes examples on one side and all the no examples on the other. Our six students are: everyone at 3 hours or below failed, everyone at 4 hours or above passed.
- When the data is not linearly separable, logistic regression cannot fit it, no matter how long you train. The standard example is four points where the yes cases sit at the two opposite corners of a square and the no cases at the other two — no single straight line separates them.
- The fix is to hand the model a new input you compute yourself, such as the two original inputs multiplied together, or to switch to a model that is allowed to bend.`,
    },
    { type: 'visual', component: 'DecisionBoundaryPlayground', props: { model: 'logistic' } },
    {
      type: 'note',
      md: `Do two things in that panel. **First**, with the model set to Logistic, look at the single straight line splitting the two colours: that line is w · x + b = 0, exactly the boundary you just computed for the students, drawn for two inputs instead of one. Count the misclassified dots — a straight line cannot get all of them, and that is the honest limit of this model on this data, not a training bug. **Second**, click the model selector across to **kNN** and then **Tree**, on the identical points. Those boundaries come out jagged and curved, and the count of misclassified dots drops. Same data, same labels; only the model changed. The shape of a boundary is a property of the model you chose, never of the data.`,
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `import math

THRESHOLD = 0.5
w = 4.496
b = -15.547

for h in [3.0, 3.3, 3.5, 3.9, 4.5]:
    z = w * h + b
    p = 1 / (1 + math.exp(-z))
    label = 1 if p >= THRESHOLD else 0
    print('hours', h, ' p', round(p, 3), ' label', label)`,
        annotations: {
          1: 'For math.exp, the same as in every snippet above.',
          3: 'The cut-off. This is the only line you should edit: try 0.3, then try 0.8, and re-run each time.',
          4: 'The weight the training loop learned. It does not change when you move the threshold.',
          5: 'The bias the training loop learned. Also unchanged.',
          7: 'Five students to score, chosen to sit close to the 3.458-hour boundary so small threshold moves flip them.',
          8: 'The log-odds for this student: weight times hours, plus bias.',
          9: 'The sigmoid, squashing z into a probability between 0 and 1.',
          10: 'The verdict. "1 if p >= THRESHOLD else 0" is a Python if-expression: it checks the test and becomes 1 when it passes, 0 when it does not.',
          11: 'Print the hours, the probability rounded to 3 places, and the verdict. The p column is what to watch: it is identical on all three runs.',
        },
        precomputedOutput: `hours 3.0  p 0.113  label 0
hours 3.3  p 0.33  label 0
hours 3.5  p 0.547  label 1
hours 3.9  p 0.879  label 1
hours 4.5  p 0.991  label 1`,
        caption: 'Change only THRESHOLD, on line 3. At 0.5 the labels are 0 0 1 1 1. At 0.3 the 3.3-hour student flips up, giving 0 1 1 1 1. At 0.8 the 3.5-hour student flips down, giving 0 0 0 1 1. The five probabilities are exactly the same on every run, because nothing was retrained — only the line you drew through them moved.',
      },
    },
    {
      type: 'intuition',
      title: 'Worked case: a loan model, computed by hand',
      md: `A bank has fitted a logistic regression that predicts whether a loan will be repaid. It has two inputs and three learned numbers, and here they are: **weight on annual income (in lakhs) = 0.8**, **weight on number of late payments = −1.1**, **bias = −1.0**. So z = 0.8 × income − 1.1 × late − 1.0.

- **Applicant A**: income 4 lakh, 1 late payment. z = 3.2 − 1.1 − 1.0 = **1.1**. Then p = 1 / (1 + e^(−1.1)) = 1 / 1.3329 = **0.7503**.
- Check that against the odds definition: p = 0.7503 gives odds of 0.7503 / 0.2497 = **3.004**, and ln(3.004) = **1.1**. The log-odds came back out as z, which is the whole design.
- **Applicant B**: income 2 lakh, 3 late payments. z = 1.6 − 3.3 − 1.0 = **−2.7**. p = 1 / (1 + 14.880) = **0.0630**.
- **Applicant C**: income 3 lakh, 2 late payments. z = 2.4 − 2.2 − 1.0 = **−0.8**. p = 1 / (1 + 2.2255) = **0.3100**.
- At threshold 0.5, approvals are A only. B and C are rejected.
- Now the boundary, for an applicant with exactly 2 late payments. At threshold 0.5 we need z = 0, so 0.8 × income = 1.1 × 2 + 1.0 = 3.2, giving **income = 4.0 lakh**. C earns 3, below the line, rejected. At threshold 0.3 we need z = −0.8473, so 0.8 × income = 3.2 − 0.8473 = 2.3527, giving **income = 2.94 lakh**. C earns 3, above the line, approved.

Applicant C flipped from rejected to approved without one number in the model changing. Note also that C's probability of 0.3100 is just over 0.3 — the two ways of checking agree, as they must.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: treating 0.5 as sacred on rare-event data',
      md: `A hospital screens for a disease that 2 in 100 people have. A team trains a logistic regression, uses the default 0.5 threshold, reports accuracy, and ships it. Walk through their numbers on 1,000 patients — **20 sick, 980 healthy**.

- At threshold 0.5 the model flags 8 patients. Six of them really are sick, two are not. So it catches 6 and misses 14.
- Filling in the confusion matrix: true positives 6, false positives 2, false negatives 14, true negatives 978.
- Accuracy = (6 + 978) / 1000 = **0.984**. The slide says 98.4% and the room is pleased.
- Here is the diagnosis. A model that ignores every input and says "healthy" to all 1,000 people scores 980 / 1000 = **0.980**. Their 98.4% beats doing nothing by 0.4 of a percentage point, while missing 14 of the 20 sick people. Recall is 6 / 20 = **0.30**.
- Now drop the threshold to 0.10 on the exact same model. It flags 60 patients: 17 sick, 43 healthy. True positives 17, false positives 43, false negatives 3, true negatives 937. Recall jumps to 17 / 20 = **0.85**.
- Accuracy at that threshold is (17 + 937) / 1000 = **0.954** — it went **down**. The useful model scores worse on the number they were reporting.

Two mistakes, stacked. The first is reading 0.5 as if the maths blessed it; 0.5 is only the right cut-off when a miss and a false alarm cost the same, and here a miss is a missed cancer while a false alarm is one more test. The second is reporting accuracy on data where 98% of rows are one class, so accuracy mostly measures how well you can say "healthy". The fix is not a better model. It is a threshold chosen from the cost of the two mistakes, and recall reported next to it.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Do these on paper before reading the solutions in the next section. Use e ≈ 2.71828 and ln(2) ≈ 0.693.

1. A model has one input and gives z = 2 × x − 3. Compute the probability for x = 1 and for x = 2. Which side of 0.5 is each one on?
2. For that same model, where is the decision boundary at threshold 0.5? Where is it at threshold 0.75? (Hint: ln(0.75 / 0.25) = ln(3) = 1.0986.)
3. A model outputs p = 0.8 for a sample whose true label is 1, and p = 0.8 for a different sample whose true label is 0. Compute the cross-entropy penalty for each.
4. A spam filter is tested on 500 emails, of which 25 are spam. At threshold 0.5 it flags 20 emails and 15 of them are really spam. Write out the four confusion-matrix counts, then compute accuracy and recall. Compare accuracy against a model that calls everything not-spam.
5. Someone says "the sigmoid is curved, so logistic regression can fit a curved boundary". Say in two sentences why that is wrong.`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `Check every intermediate number, not just the final one.

1. At x = 1: z = 2 − 3 = **−1**, so p = 1 / (1 + e^1) = 1 / 3.7183 = **0.2689**, below 0.5. At x = 2: z = 4 − 3 = **1**, so p = 1 / (1 + e^(−1)) = 1 / 1.3679 = **0.7311**, above 0.5.
2. Threshold 0.5 means log-odds 0, so 2x − 3 = 0 and **x = 1.5**. Threshold 0.75 means log-odds 1.0986, so 2x − 3 = 1.0986, giving 2x = 4.0986 and **x = 2.049**. Raising the threshold pushed the boundary to the right, so fewer inputs get called yes.
3. True label 1 with p = 0.8: the penalty is −ln(0.8) = **0.223**. True label 0 with p = 0.8: the penalty is −ln(1 − 0.8) = −ln(0.2) = **1.609**. The same output, seven times the penalty, because the second one is wrong.
4. It flagged 20 and 15 were really spam, so true positives 15 and false positives 5. There were 25 spam in total, so false negatives = 25 − 15 = 10. The rest are true negatives: 500 − 15 − 5 − 10 = 470. Accuracy = (15 + 470) / 500 = **0.97**. Recall = 15 / 25 = **0.60**. A model that calls everything not-spam scores 475 / 500 = **0.95**, so the 0.97 is two points above doing nothing while letting 40% of spam through.
5. The sigmoid never reorders its inputs, so "p is at least the threshold" is exactly the same condition as "z is at least some fixed number", and that condition is a straight line in the inputs. The curve controls how fast confidence changes as you walk away from the boundary; it does not bend the boundary itself.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. This section names four things you will meet later so the words are not new when you get there.

- **More than two classes.** With K classes you replace the sigmoid with the **softmax**: compute K separate z values, raise e to each one, and divide each by the total of all K. The results are all positive and add up to 1, so they form a proper set of probabilities, and the loss becomes cross-entropy summed over the classes. The alternative, **one-vs-rest**, trains K separate yes-or-no models ("class 3 or not class 3") and picks the biggest score; it is simpler but the K scores come from K separately-fitted models, so they do not add up to 1. With K = 2 the softmax collapses algebraically back to the plain sigmoid.
- **Saturation.** Far from the boundary the sigmoid is nearly flat, so the amount a weight moves per training step shrinks toward zero there. One sigmoid survives this. Stacking many of them, as a neural network does, multiplies many tiny numbers together and the training signal dies — the reason another function called ReLU replaced the sigmoid inside deep networks. You will meet it in the Deep Learning subject.
- **Reading the weights out loud.** A weight is a change in **log-odds** per unit of input, not a change in probability. Raise e to it to get the **odds ratio**: our loan model's income weight of 0.8 gives e^0.8 = 2.23, so "one more lakh of income roughly doubles the odds of repayment". This one-sentence-per-input explainability is why banks, insurers and hospitals still ship logistic regression when a regulator has to be able to read the reason for a rejection. It only reads cleanly if the inputs are on comparable scales and are not near-duplicates of each other.
- **The scikit-learn trap.** In scikit-learn the class is LogisticRegression and its regularisation setting is called **C**, which is the *inverse* of the penalty strength — small C means a strong penalty and shrunken weights. Every other regularised model in the same library uses alpha, where bigger means more penalty. Opposite directions, same library. It also applies an L2 penalty by default, so an unregularised fit is not what you get unless you ask for it.`,
    },
  ],
  quiz: [
    {
      question: 'A straight line fitted to 0/1 labels gave height = 0.2571 × hours − 0.4. Why is this unusable as a probability model?',
      options: [
        {
          text: 'It is unbounded — at 7 hours it returns 1.4 and at 0 hours it returns −0.4, and neither is a probability',
          explanation: 'Correct. A line has no ceiling and no floor, so it walks past 1 and past 0. The sigmoid exists to stop exactly this.',
        },
        { text: 'The slope is too small to separate the classes', explanation: 'The slope size is not the issue. Any slope at all produces values outside 0 to 1 once the input goes far enough.' },
        { text: 'Six data points is too few to fit a line', explanation: 'More data would not help. The problem is the shape of the function, not the amount of data.' },
      ],
      correct: 0,
    },
    {
      question: 'What is the log-odds (logit) of a probability of 0.5?',
      options: [
        { text: '0.5', explanation: 'That is the probability itself, not its log-odds. The two scales are different.' },
        {
          text: '0, because the odds are 0.5 / 0.5 = 1 and ln(1) = 0',
          explanation: 'Correct. Zero log-odds is the "no opinion" point, and it is exactly why the sigmoid passes through 0.5 at z = 0.',
        },
        { text: '1, because the two outcomes are equally likely', explanation: 'The odds are 1, but the logit is the natural logarithm of the odds, and ln(1) = 0.' },
      ],
      correct: 1,
    },
    {
      question: 'The trained student model is w = 4.496, b = −15.547. You change the threshold from 0.5 to 0.8. What happens?',
      options: [
        { text: 'The model retrains and the probabilities go up', explanation: 'Nothing retrains. The five probabilities in the playground are identical on every threshold setting.' },
        { text: 'Nothing changes, because the threshold only affects reporting', explanation: 'It changes every verdict near the boundary. The 3.5-hour student flips from pass to fail.' },
        {
          text: 'The probabilities stay the same and the boundary moves from 3.458 hours to 3.766 hours',
          explanation: 'Correct. A higher threshold demands more evidence, so the boundary slides right and fewer inputs are called yes. One number, no retraining.',
        },
      ],
      correct: 2,
    },
    {
      question: 'A sample has true label 1 and the model outputs p = 0.002. Which loss pushes the weights harder, and why?',
      options: [
        {
          text: 'Cross-entropy — its nudge is (p − y)·x ≈ 0.998·x, while squared error multiplies that by p(1 − p) ≈ 0.002',
          explanation: 'Correct. The extra p(1 − p) factor collapses to nearly zero when the model is confident, so squared error goes quiet at the worst possible moment.',
        },
        { text: 'Squared error — squaring makes big mistakes count more', explanation: 'Squaring inflates the reported penalty, not the nudge. The nudge carries the p(1 − p) factor, which is about 0.002 here.' },
        { text: 'They are identical once you work through the chain rule', explanation: 'They differ by exactly the p(1 − p) factor, which is the entire reason cross-entropy is used.' },
      ],
      correct: 0,
    },
    {
      question: 'A screening model scores 98.4% accuracy on 1,000 patients of whom 20 are sick, catching 6 of them. What should you say?',
      options: [
        { text: 'The model is excellent — under 2% error', explanation: 'A model that says "healthy" to everyone scores 98.0% on this data. The 98.4% is 0.4 points above learning nothing.' },
        {
          text: 'Accuracy is nearly meaningless here — the always-healthy baseline is 98.0%, and recall is only 6/20 = 0.30',
          explanation: 'Correct. When one class is 98% of the rows, accuracy mostly measures how well you can name that class. Report recall, and pick the threshold from the cost of a miss.',
        },
        { text: 'The model needs a lower learning rate', explanation: 'Nothing here points at the training run. The problem is the threshold and the metric being reported.' },
      ],
      correct: 1,
    },
    {
      question: 'Why can logistic regression never separate four points with the yes cases at opposite corners of a square?',
      options: [
        { text: 'The sigmoid saturates and training stalls', explanation: 'Saturation slows learning; it does not make a problem unsolvable. Even a perfectly trained model fails here.' },
        { text: 'There is not enough data to estimate two weights', explanation: 'Infinitely many copies of those four points would not help. The limit is what shapes the model can express.' },
        {
          text: 'The boundary is always the flat surface w·x + b = constant, and no single straight line puts those two corners on one side',
          explanation: 'Correct. The sigmoid is monotonic, so the boundary is always a straight line or flat plane. Fix it by adding a computed input such as the two inputs multiplied together.',
        },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why does logistic regression need a sigmoid at all? Motivate it rather than quoting the formula.',
      answer:
        'Because the thing we want out is a probability, between 0 and 1, and w·x + b is unbounded — fit a line to 0/1 labels and it returns 1.4 or −0.4 as soon as the input leaves the fitted range. Rather than clipping, we change what the line is asked to produce. Odds are probability divided by one minus probability, so they run from 0 to infinity; take the natural log and the log-odds run from minus infinity to plus infinity, which is exactly the range a linear function produces. So we let the line produce the log-odds: ln(p/(1−p)) = w·x + b. Solving that back for p gives p = 1/(1 + e^(−z)), the sigmoid. It is not a squashing function chosen for its shape — it is the algebraic inverse of the logit, which is why its outputs are always valid probabilities.',
      isCaseBased: false,
    },
    {
      question: 'Is logistic regression a linear or a nonlinear model?',
      answer:
        'It is a linear classifier with a nonlinear link. The decision boundary is p = threshold, and since the sigmoid is monotonic that is exactly z = some constant, which is w·x + b = constant — a point in one dimension, a straight line in two, a flat plane in three. The boundary is never curved. What is nonlinear is the map from z to probability: the log-odds are linear in x, the probability is not. Two practical consequences. First, data that no straight line can separate, like yes cases at opposite corners of a square, cannot be fitted no matter how long you train; you have to supply the nonlinearity yourself as a computed input such as x1 times x2, or move to a model that bends. Second, the name "regression" is honest — the model is a linear regression on the logit.',
      isCaseBased: false,
    },
    {
      question: 'Why cross-entropy rather than squared error for a classifier?',
      answer:
        'The argument is about the size of the weight update, not the size of the penalty. With a sigmoid on the output, the squared-error update for a weight is (p − y)·p·(1 − p)·x, while the cross-entropy update is just (p − y)·x. That extra p(1 − p) factor is the slope of the sigmoid, and it collapses toward zero whenever the model is confident. So take a sample whose true label is 1 while the model outputs p = 0.0025: cross-entropy pushes with 0.9975, squared error pushes with 0.9975 × 0.0025 × 0.9975 = 0.0025, about 400 times weaker. Learning goes quiet precisely when the model is most wrong. Cross-entropy also has a second justification: it is the negative log-likelihood of a Bernoulli model, so minimising it is maximum likelihood, which is why its outputs behave like real probabilities.',
      isCaseBased: false,
    },
    {
      question: 'How do you choose the decision threshold, and why is 0.5 not automatically correct?',
      answer:
        '0.5 is only right when a false positive and a false negative cost the same amount, and the classes are roughly balanced. Neither usually holds. The threshold is a cost decision: pick the cut-off that minimises expected cost, which is the cost of a false positive times how many you get, plus the cost of a false negative times how many you get. In practice, score a validation set, sweep the threshold, and read off precision and recall against the business constraint — "recall at least 95% for cancer screening", "precision at least 90% before we auto-block a card". The engineering point worth stating: moving a threshold is one config value and instantly reversible, while changing the loss or resampling the data means a training run. So exhaust threshold tuning first. The caveat is that this only works if the probabilities are trustworthy, so check calibration before you tune.',
      isCaseBased: false,
    },
    {
      question: 'A stakeholder asks what a coefficient of 0.8 on income means. Answer them.',
      answer:
        'Not "0.8 more probability" — probability is not linear in the input, and adding 0.8 would run past 1 immediately. The coefficient is a change in log-odds per unit of input. Raise e to it to get the odds ratio: e^0.8 = 2.23, so one extra lakh of income multiplies the odds of repayment by about 2.2, which in plain words is "roughly doubles the odds". The sign gives direction, the size gives strength. Three caveats to volunteer. Odds are not probability, and the same odds ratio moves the probability a lot near 0.5 and hardly at all near 0 or 1. Two inputs that are near-copies of each other split the credit between them arbitrarily, so both coefficients can look weak while the pair is strong. And these are associations in observed data, not causal effects.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague trained a classifier with squared error on sigmoid outputs. The loss falls for a few epochs, then flatlines high, and the model predicts one class for nearly everything. Diagnose it.',
      answer:
        'This is the squared-error-plus-sigmoid failure. The model has pushed z far to one side. For the misclassified minority, z is large and on the wrong side, so p is near 0 or 1, so the p(1 − p) factor in the squared-error update is nearly zero and those samples contribute almost no correction. The majority samples are already right and contribute little either. The result is a plateau that looks like convergence but is really a dead update. Fixes in order: switch the loss to cross-entropy, which alone usually fixes it; check for class imbalance, which makes collapsing to the majority far easier, and add class weights or move the threshold; and reduce the initial weight sizes or scale the inputs so the model does not start out already saturated. Distinguish it from genuine underfitting by looking at per-sample update sizes — if the most wrong samples produce the smallest updates, it is saturation.',
      isCaseBased: true,
    },
    {
      question: 'Case: your logistic model scores 0.94 AUC offline, but in production precision collapses. No code changed. Walk through it.',
      answer:
        'AUC is threshold-free and does not depend on how rare the positive class is, so a high AUC is fully compatible with terrible production precision. Check in this order, cheapest first. One, prevalence shift: offline the positive rate was 20%, in production it is 0.5%, and precision at a fixed threshold falls with the base rate even at identical AUC — compare the positive rates and switch the offline metric to precision-recall AUC or precision at k. Two, the threshold was carried over from a rebalanced or resampled training set, so the output probabilities are shifted and 0.5 no longer means what it did — plot a reliability diagram on production scores and recalibrate. Three, leakage offline: a feature that exists at training time but not at prediction time, or one computed after the label — rebuild the features with strict point-in-time cuts. Four, input drift: an upstream pipeline changed units or started sending nulls. Prevalence and calibration explain this exact symptom most often, so start there.',
      isCaseBased: true,
    },
    {
      question: 'Case: two engineers fit logistic regression on the same data, one standardising the inputs and one not. Coefficients differ wildly and so does accuracy. Explain, and say who is right.',
      answer:
        'Two separate effects. The coefficients differ for a boring reason: without scaling a coefficient means "per raw unit", so an input measured in rupees gets a tiny coefficient and a 0/1 input gets a large one. That alone does not make the models different, and unscaled coefficients are often easier to explain in domain units. The accuracy differing means they genuinely are different models, and the cause is regularisation: scikit-learn applies an L2 penalty by default, and that penalty acts on raw coefficient sizes, so an input on a large scale is effectively shrunk more than one on a small scale. Solvers also converge more slowly on unscaled inputs and can stop at the iteration cap, leaving the fit incomplete. Verdict: the one who standardised is right for fitting. For reporting, convert back to raw units or quote odds ratios per meaningful unit. Turn the penalty off entirely and the two fits agree again.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Why not fit a plain line to 0/1 labels?', back: 'A line is unbounded. Fitted to six students it gives 1.4 at 7 hours and −0.4 at 0 hours. Neither is a probability, and no amount of data fixes it.' },
    { front: 'Probability, odds, log-odds', back: 'Probability p is between 0 and 1. Odds = p/(1−p), between 0 and infinity. Log-odds (the logit) = ln(p/(1−p)), from minus to plus infinity. p = 0.75 gives odds 3 and logit 1.0986.' },
    { front: 'Where the sigmoid comes from', back: 'Let the line produce the log-odds: ln(p/(1−p)) = w·x + b. Solve for p and you get p = 1/(1+e^(−z)). The sigmoid is the inverse of the logit, not an arbitrary squashing function.' },
    { front: 'Sigmoid values worth memorising', back: 'σ(0) = 0.5 exactly. σ(1) = 0.7311, σ(−1) = 0.2689. σ(4) = 0.9820, σ(−4) = 0.0180. Steep near 0, flat at both ends, never reaching 0 or 1.' },
    { front: 'Decision threshold vs decision boundary', back: 'The threshold is the cut-off on p for saying yes. The boundary is where the input crosses it. For w = 4.496, b = −15.547: threshold 0.5 gives 3.458 hours, 0.3 gives 3.270, 0.8 gives 3.766.' },
    { front: 'Why the boundary is always straight', back: 'The sigmoid is monotonic, so p at least t is exactly z at least some constant, which is w·x + b = constant: a line in 2D, a plane in 3D. Moving the threshold slides it, never bends it.' },
    { front: 'Cross-entropy vs squared error, in one line', back: 'Cross-entropy update is (p−y)·x. Squared error update is (p−y)·p(1−p)·x, and p(1−p) goes to zero when the model is confidently wrong — a 400x weaker push at the worst moment.' },
    { front: 'The 0.5-on-rare-events trap', back: '20 sick in 1,000: flagging 8 and catching 6 scores 98.4% accuracy, versus 98.0% for saying "healthy" to everyone. Recall is 0.30. Set the threshold from the cost of a miss and report recall.' },
  ],
  mindmapMarkdown: `- Logistic Regression: Sigmoid, Cross-Entropy & Decision Boundaries
  - The problem with a straight line
    - Six students, line = 0.2571 x hours - 0.4
    - Returns 1.4 at 7 hours, -0.4 at 0 hours: not probabilities
  - Three scales for one belief
    - Probability p: 0 to 1
    - Odds p/(1-p): 0 to infinity
    - Log-odds (logit) ln(p/(1-p)): minus to plus infinity
  - The sigmoid
    - Let the line produce the log-odds, then invert
    - p = 1/(1+e^-z); sigma(0)=0.5, sigma(1)=0.7311, sigma(4)=0.9820
    - S-curve: steep in the middle, flat at both ends
  - Training
    - Loss is cross-entropy: -ln(p) if y=1, -ln(1-p) if y=0
    - Update is (p - y) times x, no vanishing factor
    - Squared error carries p(1-p), which dies when confidently wrong
  - Threshold and boundary
    - Threshold = cut-off on p; boundary = where the input crosses it
    - w=4.496, b=-15.547: 0.5 -> 3.458 h, 0.3 -> 3.270 h, 0.8 -> 3.766 h
    - Moving it costs one number, not a training run
  - Always a straight boundary
    - Sigmoid is monotonic, so p >= t means z >= constant
    - Linear separability; opposite-corner data is unfittable
  - The classic mistake
    - 0.5 is not sacred, and accuracy hides rare-event failure
  - Beyond the basics
    - Softmax and one-vs-rest for K classes
    - Saturation and why ReLU replaced sigmoid in deep nets
    - Weights are log-odds; e^w is the odds ratio
    - sklearn C is INVERSE penalty strength`,
}

export default m
