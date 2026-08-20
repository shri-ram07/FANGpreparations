import type { Module } from '../types'

const m: Module = {
  id: 'ml-l0-learning-setup',
  subjectId: 'ml',
  level: 0,
  title: 'What "Learning From Data" Actually Means',
  whyItMatters:
    'This is the first module of machine learning, so it starts from nothing. By the end you will know exactly what a model is, what it means for one to "learn", why the data has to be cut into three piles before any learning happens, and how to tell — from two numbers — whether your model is too simple or too clever. Every algorithm you meet after this is a different way of doing the same three things, so the vocabulary here is the vocabulary for the whole subject.',
  assumes: [
    'You know what an average is and what a percentage means',
    'You have seen a Python list, a dictionary, a for loop, and a function definition',
    'You remember from school maths that y = w * x draws a straight line, and that w controls how steep it is',
    'No machine learning background is needed. Every term is defined here, in the order you meet it.',
  ],
  estMinutes: 45,
  sections: [
    {
      type: 'intuition',
      title: 'Six flats, and a rule with one number in it',
      md: `Here is a small table. Six flats in one city. For each flat we know its floor area in square feet, and the monthly rent actually paid, in thousands of rupees.

- 500 sq ft, rent 12
- 750 sq ft, rent 17
- 1000 sq ft, rent 21
- 1200 sq ft, rent 26
- 1500 sq ft, rent 31
- 1800 sq ft, rent 37

Now suppose I want to guess the rent of a flat I have not seen, knowing only its area. I need a rule. Let me pick the simplest rule that could work: **rent = w times area**, where w is one number I get to choose. Rent per square foot, basically.

I do not know what w should be. So I try one and check. Take **w = 0.020**. The rule predicts 500 x 0.020 = 10, then 15, 20, 24, 30, 36. Compare each prediction to the real rent and write down how far off it was, ignoring the sign: 2, 2, 1, 2, 1, 1. The average of those six gaps is 9/6 = **1.5**.

Now take **w = 0.021**. Predictions: 10.5, 15.75, 21, 25.2, 31.5, 37.8. Gaps: 1.5, 1.25, 0, 0.8, 0.5, 0.8. Average gap = 4.85/6 = **0.808**.

0.808 is smaller than 1.5, so w = 0.021 is the better rule. That is it. That is learning from data: **I fixed the shape of the rule myself, and then let the six examples choose the number inside it.**`,
    },
    {
      type: 'intuition',
      title: 'The words for what just happened',
      md: `Every term below is standard, and every one of them refers to something in the table above. Nothing new is happening; we are only naming it.

- **Feature** — an input you are allowed to look at when predicting. Here there is exactly one feature: floor area. A real problem might have fifty.
- **Label** — the answer you are trying to predict. Here the label is the rent. Also called the *target*.
- **Sample** (or **row**, or **example**) — one feature-and-label pair. "500 sq ft, rent 12" is one sample. We have six.
- **Dataset** — the collection of samples. Our dataset has six rows and one feature.
- **Model** — the rule that turns features into a prediction, *including* the specific numbers inside it. "rent = 0.021 x area" is a model. "rent = w x area" with w not yet chosen is a *model family*: a whole shelf of models, one for each possible w.
- **Parameters** (also called **weights**) — the numbers inside the model that get chosen by looking at the data. Here there is one parameter, w. A large neural network has billions, but they play exactly the role that w plays here.
- **Training** — the process of choosing the parameters. What we did by trying 0.020 and 0.021 was training, done by hand.

One more, because we used it without naming it: the number we minimised — the average gap between prediction and truth — is called the **training error**. It measures how badly the model does on the rows it was trained from.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same thing in code: try five values of w, keep the best',
      code: `size = [500, 750, 1000, 1200, 1500, 1800]
rent = [12, 17, 21, 26, 31, 37]

def average_error(w):
    total = 0.0
    for i in range(len(size)):
        predicted = w * size[i]
        total = total + abs(predicted - rent[i])
    return total / len(size)

for w in [0.018, 0.020, 0.021, 0.022, 0.024]:
    print(w, round(average_error(w), 3))

# ---- real output ----
# 0.018 3.75
# 0.02 1.5
# 0.021 0.808
# 0.022 1.25
# 0.024 3.0`,
      annotations: {
        1: 'A plain Python list holding the six floor areas. Position 0 is the first flat, position 5 the last.',
        2: 'The six rents, in the same order. So size[3] and rent[3] describe the same flat — the 1200 sq ft one.',
        4: 'Defines a function that takes one candidate value of w and hands back how badly that model does. Everything the function needs beyond w (the two lists) it reads from outside itself.',
        5: 'A running total, starting at zero. Written 0.0 rather than 0 to make clear it accumulates decimals.',
        6: 'len(size) is 6, so range(len(size)) produces 0, 1, 2, 3, 4, 5 — one pass per flat.',
        7: 'The model itself, in one line: multiply this flat\'s area by w. This is the prediction.',
        8: 'abs() throws away the minus sign, so predicting 2 too high and 2 too low both count as 2. Add that gap to the total.',
        9: 'Divide by 6 to get the average gap per flat. Dividing keeps the number comparable when the dataset size changes.',
        11: 'Five candidate values of w. This list is my choice, not the data\'s — I picked a range that looked sensible and spaced it out.',
        12: 'Print the candidate and its error, rounded to 3 decimals. Read the output column downward: the error falls to 0.808 at w = 0.021 and rises again after it. Python prints 0.020 as 0.02 because trailing zeros are not stored.',
      },
    },
    {
      type: 'note',
      md: 'Two of my choices in that snippet were never touched by the data: the *shape* of the rule (a straight line through zero) and the *list of w values to try*. A setting like that — chosen by you before training, not fitted from the rows — is called a **hyperparameter**. The distinction runs through the entire subject: a **parameter** is fitted from data (w = 0.021), a **hyperparameter** is chosen by you (the shape of the rule, how many values to try, how long to train). Almost everything that goes wrong later goes wrong in how hyperparameters get chosen.',
    },
    {
      type: 'note',
      md: 'Our problem has labels, so it is called **supervised** learning: you have (features, label) pairs and learn the mapping. When the label is a number, like rent, that is **regression**; when it is a category, like spam-or-not, that is **classification**. Two other families exist and you will meet them much later: **unsupervised** learning has features but no labels and looks for structure instead, and **reinforcement** learning has no labels at all, only a delayed reward for actions taken. Everything in this module is supervised.',
    },
    {
      type: 'intuition',
      title: 'Why scoring a model on the rows it learned from proves nothing',
      md: `Our w = 0.021 model has a training error of 0.808. Is that good? Here is a model that beats it flat out.

- Build a lookup table. Store all six rows: area 500 goes to rent 12, area 750 goes to rent 17, and so on.
- To predict, look the area up in the table and return the stored rent. If the area is not in the table, return 24 — roughly the average rent, since there is nothing else to say.
- Training error of this model: it returns the exact stored rent for all six training rows, so every gap is 0. **Training error = 0.000.** Perfect score.

By training error, this beats every straight line ever fitted. And it is obviously useless: hand it a 900 sq ft flat and it says 24, because 900 is not in the table. It has learned nothing about how rent relates to area. It memorised.

This is not a contrived edge case; it is the central problem of the whole field. Fitting the rows you already have is easy — you can always memorise them. What you actually want is a model that is right on rows it has **never seen**. Let us measure both models on rows they never saw.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The memorizer: perfect on what it stored, hopeless on anything else',
      code: `table = {}
for i in range(len(size)):
    table[size[i]] = rent[i]

def predict(x):
    return table.get(x, 24.0)

def average_error(xs, ys):
    total = 0.0
    for i in range(len(xs)):
        total = total + abs(predict(xs[i]) - ys[i])
    return total / len(xs)

print("memorizer on the 6 rows it stored:", average_error(size, rent))
new_size = [600, 900, 1400]
new_rent = [14, 19, 29]
print("memorizer on 3 flats it never saw:", round(average_error(new_size, new_rent), 3))

# ---- real output ----
# memorizer on the 6 rows it stored: 0.0
# memorizer on 3 flats it never saw: 6.667`,
      annotations: {
        1: 'An empty dictionary. A dictionary stores key-to-value pairs and can look a value up by its key instantly.',
        2: 'Walk the six positions again. size and rent are the same two lists from the previous snippet.',
        3: 'Store one pair: the key is this flat\'s area, the value is its rent. After the loop the dictionary holds all six.',
        5: 'The whole model: given an area x, return what was stored for it.',
        6: 'table.get(x, 24.0) means "give me the value stored under key x, or 24.0 if x is not in the dictionary at all". The 24.0 is the fallback for an area we never saw.',
        8: 'A new version of average_error, this time taking the areas and rents to score on as arguments, so we can point it at different rows. It replaces the one-argument version from the previous snippet.',
        9: 'The running total again, starting at zero.',
        10: 'One pass per row of whatever lists were passed in.',
        11: 'Gap between what predict() says and the true rent, sign thrown away, added to the total.',
        12: 'Average gap per row.',
        14: 'Score the memorizer on the exact six rows it stored. Every lookup hits, so every gap is 0 and the printed answer is 0.0.',
        15: 'Three flats that are not in the table: 600, 900 and 1400 sq ft.',
        16: 'Their true rents, so we can measure honestly.',
        17: 'Score on those three. Every lookup misses, so the model returns 24.0 three times. Gaps are 10, 5 and 5, and 20/3 = 6.667.',
      },
    },
    {
      type: 'intuition',
      title: 'The comparison that justifies everything that follows',
      md: `Now put the two models side by side on the same two questions. The straight-line model is rent = 0.021 x area, and its predictions on the three new flats are 0.021 x 600 = 12.6, 0.021 x 900 = 18.9, and 0.021 x 1400 = 29.4. The true rents are 14, 19 and 29, so the gaps are 1.4, 0.1 and 0.4, averaging 1.9/3 = **0.633**.

- **Memorizer:** error on rows it trained from = **0.000**. Error on new rows = **6.667**.
- **Straight line:** error on rows it trained from = **0.808**. Error on new rows = **0.633**.

Read the first column on its own and the memorizer wins by a mile. Read the second column and it loses by a factor of ten. **The number you would have used to pick a model ranked the worse model first.** That is why training error is not a measure of quality — it is a measure of how hard the model tried to memorise.

The property the straight line has and the memorizer does not is called **generalization**: performing well on data drawn from the same source but not used during training. Generalization is the actual goal. Training error cannot see it. So we need to measure on rows the model did not train on — which means deciding, before training, which rows the model is not allowed to have.`,
    },
    {
      type: 'intuition',
      title: 'Three piles, three different jobs',
      md: `So you take your dataset and cut it into three parts, at random, before anything else happens. A common split is 70 / 15 / 15.

- **Training set** (about 70% of rows) — the only rows the model is allowed to fit its parameters on. This is where w = 0.021 comes from.
- **Validation set** (about 15%) — rows used to *choose between* models: which shape of rule, which hyperparameter, when to stop training. The model never fits parameters on these rows, but your decisions are made using them.
- **Test set** (about 15%) — rows opened exactly once, at the very end, after everything is decided, to produce the one honest estimate of how the chosen model will behave on new data.

The obvious question is why validation and test are two separate piles when they are both "data the model did not train on". The answer is the whole of the next section, and it is worth the space, because collapsing them is the single most common way a good project produces a wrong number.

One sentence to carry: **the training set fits the parameters, the validation set fits your choices, and the test set fits nothing.**`,
    },
    {
      type: 'intuition',
      title: 'Picking the best of many, on one set, inflates the winner',
      md: `Here is the mechanism, stripped down until nothing else can explain the result.

- Take 100 labels that are pure coin flips — genuinely random, 0 or 1, with nothing to predict. By construction, no model on earth can do better than 50% on this in the long run.
- Now generate 200 "models". Each one is just 100 random guesses. None of them knows anything.
- Score all 200 against the same 100 labels, and keep the best scorer.
- The best of 200 will land somewhere around 60%, purely because with 200 tries, someone gets lucky. It looks like a model with a 10-point edge.
- Take that exact winner and score it on 100 *fresh* coin flips. It falls straight back to about 50%, because there was never any edge to keep.

The gap between those two numbers is not noise you can average away — it is the price of having *chosen* using that set. It has a name: the **winner's curse**. And it is why the test set is not a set you may select on.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 1: pure noise, and one model scored against it',
      code: `import random

random.seed(3)
truth = [random.randint(0, 1) for _ in range(100)]
fresh = [random.randint(0, 1) for _ in range(100)]

def score(guesses, answers):
    hits = 0
    for i in range(100):
        if guesses[i] == answers[i]:
            hits = hits + 1
    return hits / 100

one_model = [random.randint(0, 1) for _ in range(100)]
print("one random model, scored on truth:", score(one_model, truth))

# ---- real output ----
# one random model, scored on truth: 0.5`,
      annotations: {
        1: 'Python\'s built-in random number module. Nothing is installed for this.',
        3: 'Fixes the random sequence so this run prints the same numbers on your machine as it did on mine.',
        4: 'A list comprehension: "[expression for _ in range(100)]" builds a list by running the expression 100 times. random.randint(0, 1) returns 0 or 1 with equal chance. The underscore is a variable name we do not use. So truth is 100 coin flips — the labels, with no pattern in them at all.',
        5: 'A second, independent set of 100 coin flips from the same source. We will not touch it until the very end. This stands in for "fresh data from production".',
        7: 'A function that compares one list of guesses against one list of answers.',
        8: 'Counter for how many positions matched.',
        9: 'One pass per position, 0 to 99.',
        10: 'Compare the guess at this position with the answer at the same position.',
        11: 'If they matched, add one.',
        12: 'Return the fraction correct — hits out of 100. This is accuracy.',
        14: 'One "model": 100 random guesses. This is what a model with zero knowledge looks like.',
        15: 'It scores 0.50 — exactly the coin-flip ceiling, as it must. Remember this number.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 2: now try 200 of them and keep the winner',
      code: `best_score, best_model = 0.0, []
for trial in range(200):
    model = [random.randint(0, 1) for _ in range(100)]
    if score(model, truth) > best_score:
        best_score, best_model = score(model, truth), model

print("best of 200, on the set we chose with:", best_score)
print("that same model on a fresh sample:    ", score(best_model, fresh))

# ---- real output ----
# best of 200, on the set we chose with: 0.61
# that same model on a fresh sample:     0.49`,
      annotations: {
        1: 'Two variables assigned on one line: the best score seen so far (0.0) and the model that achieved it (an empty list for now). Python lets you assign several names at once by separating both sides with commas.',
        2: 'Do this 200 times. Each pass is one "idea we tried" — in a real project, one hyperparameter setting.',
        3: 'Build another 100 random guesses. Same kind of nothing as before.',
        4: 'Score this model on truth and check whether it beats the best so far. This one line is the leak: a decision is being made using the set we will later quote a number from.',
        5: 'Record the new best score and the model that got it, again assigning both names at once.',
        7: 'Prints 0.61. Sixty-one percent, from models that are literally noise, on labels that are literally noise.',
        8: 'The same winning model on the untouched fresh sample: 0.49. The 11-point edge was entirely selection luck. If you had reported 0.61 as this model\'s performance, you would have been wrong by 11 points and had no way to know.',
      },
    },
    {
      type: 'note',
      md: 'The practical rule that falls out: every comparison, every hyperparameter, every "let me try one more thing" is scored on the **validation** set, and the test set is opened once, after the model is frozen. Note that the leak does not require code — if you look at the test score and then change something because of what you saw, you have selected on it just as surely as the loop above did. The more things you compared, the more the winning number overstates reality.',
    },
    {
      type: 'intuition',
      title: 'One knob for how wiggly the model may be',
      md: `Back to fitting. The straight line was one shape, but we can allow the rule to bend. The standard knob for this is **polynomial degree**.

- **Degree 0**: prediction = a constant. A flat line at the average of the labels. It ignores the feature completely.
- **Degree 1**: prediction = a + b*x. A straight line — it can tilt, but not bend.
- **Degree 2**: prediction = a + b*x + c*x*x. One bend allowed.
- **Degree 9**: nine powers of x. It can bend nine times. Given only 15 training points, a degree-9 curve can be steered through almost every single one of them.

Higher degree means more parameters, which means more freedom to match the training rows. So training error can only fall as degree rises. The question is what happens to error on rows the model did not see. We have 15 training points and 10 validation points, both drawn from the same gently curving source with a little random jitter added. Let us print both errors for each degree and look.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Degree 0 to 9: training error and validation error, side by side',
      code: `import numpy as np

rng = np.random.default_rng(7)

def sample(n):
    x = rng.uniform(0, 1, n)
    y = 0.8 * np.sin(2.2 * np.pi * x) + 0.18 * rng.standard_normal(n)
    return x, y

x_train, y_train = sample(15)
x_val, y_val = sample(10)

def error(coeffs, x, y):
    return float(np.mean((np.polyval(coeffs, x) - y) ** 2))

for degree in [0, 1, 2, 3, 5, 7, 9]:
    coeffs = np.polyfit(x_train, y_train, degree)
    print(degree, round(error(coeffs, x_train, y_train), 4), round(error(coeffs, x_val, y_val), 4))

# ---- real output ----
# 0 0.2276 0.36
# 1 0.0829 0.1555
# 2 0.076 0.137
# 3 0.0109 0.0386
# 5 0.01 0.0511
# 7 0.0088 0.0593
# 9 0.0087 0.0614`,
      annotations: {
        1: 'numpy is the standard Python library for arrays of numbers. It earns its place here for exactly one reason: fitting a degree-9 curve means solving a system of ten equations, which is a page of code by hand and one call in numpy. "as np" just gives it a short name.',
        3: 'Creates a random number generator with a fixed starting point (7), so these numbers are reproducible.',
        5: 'A function that manufactures n samples for us. We invent the data so that we know what the truth is.',
        6: 'rng.uniform(0, 1, n) returns n numbers spread evenly at random between 0 and 1. These are the feature values.',
        7: 'The label: a gentle S-shaped curve, 0.8 * sin(2.2 * pi * x), plus jitter. rng.standard_normal(n) draws n random numbers centred on zero, and multiplying by 0.18 keeps the jitter small. The jitter is the part no model can ever predict.',
        8: 'Hand back both lists at once. Python returns them as a pair, and the caller can unpack that pair into two names.',
        10: 'Call it for 15 training samples. "x_train, y_train =" is tuple unpacking: the two returned values are assigned to the two names in order.',
        11: 'Ten more samples from the identical source. Same distribution, different rows — which is exactly what a validation set is.',
        13: 'A function that measures how far a fitted curve sits from a set of labels. coeffs describes the curve.',
        14: 'Read it inside out. np.polyval(coeffs, x) evaluates the fitted curve at every x at once. Subtracting y gives the gap at each point, ** 2 squares each gap so the signs cannot cancel, np.mean averages them, and float() turns the numpy result into an ordinary Python number for printing. This average of squared gaps is called mean squared error.',
        16: 'Seven degrees to try — 0 through 9, skipping a few to keep the table short.',
        17: 'np.polyfit(x_train, y_train, degree) finds the polynomial of that degree whose squared error on the training points is as small as possible, and returns its coefficients. This one call is the entire training step.',
        18: 'Print the degree, then the error on the rows we trained on, then the error on the rows we did not. The two columns behave completely differently, which is the point of the whole snippet.',
      },
    },
    {
      type: 'intuition',
      title: 'Reading that table: underfitting and overfitting',
      md: `Two columns, two different stories.

- **Training error only falls**: 0.2276, 0.0829, 0.0760, 0.0109, 0.0100, 0.0088, 0.0087. Every extra degree buys more freedom to hug the training points, so this column can never turn back up. A falling training error is therefore not, on its own, evidence of anything at all.
- **Validation error falls and then climbs**: 0.3600, 0.1555, 0.1370, **0.0386**, 0.0511, 0.0593, 0.0614. It bottoms out at degree 3 and gets steadily worse after it. That is the famous **U-curve**, and its lowest point is the model you ship.

Now the two names, defined by the shape of those numbers rather than by feel.

- **Underfitting** — the model is too restricted to express the pattern. Signature: **high error on both sets, with almost no gap between them**. Degree 0 is the example: 0.2276 and 0.3600 are both bad, and no amount of extra data would fix a flat line trying to follow a curve.
- **Overfitting** — the model has enough freedom to fit the random jitter in the training rows, and it does. Signature: **low training error with a large gap to validation error**. Degree 9 is the example: 0.0087 on training against 0.0614 on validation, a gap of seven times.

Overfitting is not "high error". Degree 9 has the *lowest* training error in the table and is one of the worst models in it. What identifies overfitting is the **gap**.`,
    },
    { type: 'visual', component: 'BiasVarianceDial', props: {} },
    {
      type: 'note',
      md: 'Use the step controls under that chart to walk the degree from 0 up to 9, and watch two things at once. In the **upper chart**, watch the solid fitted curve against the dashed true curve: at degree 0 it is a flat line that ignores the shape entirely, around degree 3 it tracks the dashed curve closely, and by degree 8 or 9 it stops being a curve and starts lurching between the training dots — that violent swinging in the gaps between points is what overfitting looks like when you can see it. In the **lower chart**, watch the two error lines: the blue train line only ever goes down, while the amber test line comes down, flattens, and then turns back up. Stop at the degree where the amber line is lowest. That is the model you would ship, and it is not the one with the best training score.',
    },
    {
      type: 'intuition',
      title: 'Bias and variance: two different ways to be wrong',
      md: `Underfitting and overfitting both produce bad predictions, but for opposite reasons, and the standard names for those reasons are bias and variance. Both are defined by imagining something you cannot actually do: collecting a fresh training set many times over and refitting the model on each one.

- **Bias** is error from the model being unable to represent the truth. Force a flat line onto a curved pattern and it is wrong in the *same places, in the same direction*, every single time — even with a million rows. Averaged over all those imaginary refits, the model still sits away from the truth. That distance is the bias.
- **Variance** is error from being too sensitive to *which particular rows* you happened to get. Refit the degree-9 curve on 15 different points and you get a wildly different curve. Averaged over the imaginary refits it might sit right on the truth, but any single one of them is far from that average. That spread is the variance.

An archery picture helps: high bias is a tight group 30 cm left of the bullseye — repeatable, and repeatably wrong. High variance is arrows scattered all over the target but centred on the bullseye — right on average, and useless in practice.

Turning the flexibility knob trades one for the other. More degrees means less bias and more variance; fewer degrees means more bias and less variance. The U-curve in the table is those two moving in opposite directions and their total having a minimum somewhere in the middle.

The reason variance goes undiagnosed so often: you only ever train once, so you never see the spread. What you *can* see is the train-validation gap, and that is the practical signal for it.`,
    },
    {
      type: 'hinglish',
      md: `Do type ke kharab students socho. Pehla wala **high bias** hai: usne ek hi formula ratt liya hai aur har question mein wahi thok deta hai. Kitna bhi padha lo, uski **soch hi galat** hai — aur har baar *ek jaisi* galat, consistently. Doosra wala **high variance** hai: ye har baar apna answer badal deta hai. Jo notes aaj mile, wahi ratt liye; kal doosre notes mile to poora jawab hi badal gaya. Average nikaalo to shayad theek baithe, par bharosa zero — **har baar mood badalta hai**, kabhi 95 kabhi 30. Ilaaj alag-alag hai: bias wale ko **bada dimaag** chahiye (bigger model, better features), variance wale ko **discipline** chahiye (zyada data, regularization, simple model, ensembling). Aur pehle diagnose karo, phir dawai do — high-bias model ko aur data pilane se kuch nahi hota.`,
    },
    {
      type: 'intuition',
      title: 'Diagnose from two numbers, then fix',
      md: `You need exactly two numbers: error on the training set and error on the validation set. Four cases cover everything.

- **Both high, gap small** to underfitting, too much bias. The model cannot even do the rows it was given.
- **Training low, validation much higher** to overfitting, too much variance.
- **Both low** to done. Stop tinkering; further tuning is now just fitting the validation set.
- **Training error higher than validation error** to suspect a bug. Usually a bad split, or a validation set that is accidentally easier.

To fix **bias**, give the model more ability to express the pattern: a more flexible model family (higher degree, deeper tree, more layers), better features, less restriction, longer training. To fix **variance**, make the model steadier across samples: more training data, a simpler model, fewer features, or averaging many models together.

The reason to diagnose before fixing: more data reduces variance and does nothing for bias. Pouring rows into an underfitting model changes nothing at all, which is an expensive way to learn this lesson.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: choosing a model for a loan approval task, by hand',
      md: `2,000 labelled applications. Each row has features about the applicant and a label saying whether the loan was repaid. Work it through in order.

- **Split first.** 70 / 15 / 15 of 2,000 gives **1,400 training rows, 300 validation rows, 300 test rows**. Do this before looking at anything, and never move a row between piles again.
- **Fit three candidates on the 1,400 training rows** and score each on the 300 validation rows. Error here means the fraction of applications classified wrongly. Candidate A: train 0.28, validation 0.29. Candidate B: train 0.11, validation 0.14. Candidate C: train 0.01, validation 0.22.
- **Diagnose A.** Both errors high, gap 0.01. Underfitting — too much bias. Giving A more data will not help; A needs to be a more flexible model or get better features.
- **Diagnose C.** Training error 0.01 with a gap of 0.21. Overfitting — too much variance. It has memorised 1,400 rows including their noise. C is not the best model, despite having by far the best training score.
- **Diagnose B.** Errors 0.11 and 0.14, gap 0.03, and the lowest validation error of the three. B wins. Note that B did not win on training error — C did.
- **Now open the test set, once.** B scores **0.147** on the 300 test rows, which is 44 wrong out of 300. Report that number, not the 0.14.
- **Why report the larger one.** 0.14 was the score B got on the set we used to *choose* B, so it carries a little winner\'s curse from the three-way comparison. 0.147 came from rows that took part in no decision. The small gap between them, 0.007, is roughly the size of that optimism — small here because we only compared three candidates, and it would be much larger after comparing three hundred.
- **What it costs to skip this.** Suppose the team had picked by training error and shipped C. On 1,000 applications a day, C makes about 0.22 x 1,000 = **220 wrong decisions**, against B\'s 0.147 x 1,000 = **147**. Same data, same day, 73 extra bad decisions, caused entirely by ranking models with the wrong number.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake, walked into on purpose',
      md: `A team has a dataset and skips the validation split, on the reasonable-sounding argument that two held-out sets is one more than necessary. Their process: train a model, score it on the test set, adjust, repeat. They do this 40 times over three weeks, keep the best one, and report its **test accuracy of 91%**.

Three months later the model runs at 84% in production, and nobody can find a bug. There is no bug. Here is the diagnosis.

- Every one of those 40 rounds used the test score to decide what to change. That is selection, and selection on a set is a weak form of training on it. After round one, the set was no longer held out from anything.
- The size of the damage is what part 2 of the noise experiment measured. There, 200 candidates scored against one set produced a winner at **0.61** on that set and **0.49** on fresh data — an 11-point gap manufactured entirely by choosing, on data where no real signal existed at all.
- The nastiest part is that the reported number keeps improving while the model does not. The team genuinely watched 86%, 88%, 91% appear over three weeks. Every one of those increments was partly real improvement and partly a better-fitting piece of luck, and nothing in the process could separate the two.
- **The 91% was never a prediction of production performance.** It was the maximum of 40 noisy measurements, and the maximum of many noisy measurements is biased upward, always. Reporting it as a performance estimate is the mistake.

The fix is procedural, not mathematical. Split three ways up front. Run all 40 rounds against the validation set. Freeze the model. Then score the test set once and report that. If the test set has already been used for selection, it is spent — treat it as a second validation set and carve a genuinely fresh holdout, ideally from a later time period, before quoting any number to anyone.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work them on paper before reading the solutions in the next section.

1. A model scores 0.05 error on training and 0.27 on validation. Name the condition, say which of bias and variance is large, and give two fixes that would plausibly help.
2. A different model scores 0.34 on training and 0.35 on validation. A human expert does the same task at 0.05 error. Name the condition, and say why buying 10x more labelled rows would be a waste of money here.
3. You have 4,000 rows. Write the three pile sizes for a 70/15/15 split. Your teammate then tells you they compared 20 hyperparameter settings on the test set and got 88%. What exactly is wrong with 88%, and what do you do now?
4. From the degree table in this module: degree 9 has training error 0.0087, the lowest in the table, and validation error 0.0614. Degree 3 has 0.0109 and 0.0386. Which do you ship, and why is degree 9\'s better training score not an argument for it?
5. The memorizer scored exactly 0.000 training error. Explain in two sentences why that is not a bug in the code, and what it tells you about training error as a way of ranking models.`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `Check your reasoning against each step, not only the final label.

1. **Overfitting; variance is large.** The signature is a low training error with a big gap to validation — here the gap is 0.22, more than four times the training error itself. The model is fitting noise in the training rows. Fixes that attack variance: collect more training data, use a simpler or more restricted model, drop weak features, or average several models together. A fix that would *not* help: making the model more flexible, which enlarges the gap.
2. **Underfitting; bias is large.** Both errors are high and the gap is 0.01, so the model is not sensitive to which rows it saw — it is simply unable to express the pattern. The expert\'s 0.05 proves the pattern exists and is learnable, so this is not a floor imposed by noisy data. More rows only reduce variance, and there is essentially no variance here to reduce, so 10x data buys close to nothing. Spend on a more flexible model family or better features instead.
3. **2,800 training, 600 validation, 600 test.** The 88% is wrong as a performance estimate because it is the maximum of 20 measurements taken on the very set being quoted — the winner\'s curse inflates it by an unknown amount that grows with the number of settings compared. What to do: stop using that set for decisions, since it is now spent; re-run the comparison against a proper validation split; and get a genuinely untouched holdout — ideally a later time period — to score the frozen model once. Report that number instead.
4. **Ship degree 3**, validation error 0.0386 against degree 9\'s 0.0614. Degree 9\'s training score is not an argument because training error is guaranteed to be non-increasing as degree rises — a degree-9 curve can be steered through more of the 15 training points than a degree-3 curve can, whether or not those points carry any real signal. A number that can only go down as you add freedom cannot be used to compare amounts of freedom.
5. It is not a bug: the memorizer stores each training row\'s exact label and returns it on lookup, so its prediction on every training row is exactly right by construction, and zero is the correct output. What it tells you is that training error can be driven to zero without learning anything transferable at all, so it can rank a useless model above a good one — which is precisely why the comparison has to be made on rows the model has never seen.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. This section names ideas you will meet later, so the words are not new when you get there.

- **The bias-variance decomposition.** For squared error, the expected error splits exactly into three pieces, written out in the math block below. The third piece is **irreducible error**: variability in the label that your features simply cannot explain — two identical flats renting for different amounts because one landlord was in a hurry, two doctors disagreeing on the same scan. No model reduces it, so it sets a hard floor on achievable error. A practical way to estimate that floor is to have two humans label the same 200 examples and measure how often they disagree.
- **Near-perfect scores are a bug report.** If you score 99.9% on the first honest attempt, look for **leakage** — a feature computed after the label existed, an ID that encodes the answer, or duplicate rows landing in both training and test — before celebrating.
- **k-fold cross-validation.** When the dataset is small, a single 15% validation split is itself so noisy that you may be choosing between models on luck. Instead, cut the training data into k parts, train k times leaving one part out each time, and average the k validation scores. It costs k times the compute and gives a far steadier comparison. The test set stays sealed regardless.
- **Double descent.** The clean U-curve is a statement about one axis, flexibility, with everything else held fixed. With very large modern models the picture changes: test error falls, rises to a peak, and then falls *again* as the model grows past the point where it can fit the training data exactly. This is why enormous networks can memorise their training set and still generalize, and it is why "bigger always overfits" is not a law.`,
    },
    {
      type: 'math',
      intro: 'The decomposition named above. The expectation E runs over training sets: imagine collecting your data again and again and refitting each time. f is the truth, f-hat is your fitted model.',
      latex: [
        '\\mathbb{E}\\big[(y - \\hat{f}(x))^2\\big] \\;=\\; \\underbrace{\\big(\\mathbb{E}[\\hat{f}(x)] - f(x)\\big)^2}_{\\text{bias}^2} \\;+\\; \\underbrace{\\mathbb{E}\\big[(\\hat{f}(x) - \\mathbb{E}[\\hat{f}(x)])^2\\big]}_{\\text{variance}} \\;+\\; \\underbrace{\\sigma^2}_{\\text{irreducible noise}}',
        '\\textbf{bias}^2: \\text{ take the AVERAGE model over all those refits. How far is it from the truth?}',
        '\\textbf{variance}: \\text{ how far does ONE refit sit from that average?}',
        '\\sigma^2: \\text{ label noise. Nothing you build can touch it. It is the floor of your error.}',
      ],
    },
  ],
  quiz: [
    {
      question: 'You store every training row in a lookup table and return the stored answer. Training error is exactly zero. What have you built?',
      options: [
        { text: 'A model with no bias and no variance', explanation: 'Variance is enormous: change one training row and the table changes with it. Zero training error says nothing about either term.' },
        { text: 'The best possible model, since error cannot go below zero', explanation: 'Training error is not the goal. The goal is error on rows never seen, where the table returns its fallback value and fails.' },
        { text: 'A memorizer — zero training error is trivially achievable and says nothing about unseen rows', explanation: 'Correct. This is the reason the three-way split exists: fitting rows you already have is easy, generalizing is the real problem.' },
      ],
      correct: 2,
    },
    {
      question: 'What is the validation set for, precisely?',
      options: [
        { text: 'Extra training data, once the model has converged', explanation: 'Fitting parameters on it destroys its purpose — you would then have no clean set for choosing between models.' },
        { text: 'Choosing between models and hyperparameters, so the test set stays untouched', explanation: 'Correct. Training fits parameters, validation fits your choices, test fits nothing.' },
        { text: 'The final number reported to stakeholders', explanation: 'That is the test set. A validation number is optimistic by construction, because you selected using it.' },
      ],
      correct: 1,
    },
    {
      question: 'A teammate compared 200 configurations on the test set and reports the best score. What is wrong with that number?',
      options: [
        { text: 'It is inflated — the maximum over many noisy scores captures luck that will not repeat', explanation: 'Correct. The winner\'s curse. In the noise experiment, 200 meaningless models produced a 0.61 winner on the chosen set and 0.49 on fresh data.' },
        { text: 'Nothing — the test set was never trained on, so the number is valid', explanation: 'It was held out from fitting parameters, but not from selection. Selecting on a set is a weak form of training on it.' },
        { text: 'It is pessimistic — comparing many models spreads the error around', explanation: 'The bias runs the other way. Taking a maximum can only inflate, never deflate.' },
      ],
      correct: 0,
    },
    {
      question: 'Training error 0.02, validation error 0.31. Diagnosis?',
      options: [
        { text: 'Too much bias — the model is too simple', explanation: 'High bias shows as high error on BOTH sets with a small gap. Here training error is near zero.' },
        { text: 'Irreducible noise dominates', explanation: 'Noise raises both errors together and cannot create a gap, since the training rows carry the same noise.' },
        { text: 'Too much variance — the model is overfitting', explanation: 'Correct. Near-zero training error plus a large gap is the overfitting signature. Fix with more data, a simpler model, fewer features, or averaging models.' },
      ],
      correct: 2,
    },
    {
      question: 'Which of these is the definition of bias?',
      options: [
        { text: 'How much the fitted model changes when you refit on a different sample', explanation: 'That is variance — sensitivity to which rows you happened to draw.' },
        { text: 'Error from the model being unable to represent the truth: averaged over many refits it is still systematically off', explanation: 'Correct. Note the word average — bias is a property of the average model, not of any single fit.' },
        { text: 'Noise in the labels that no model can remove', explanation: 'That is the irreducible term. It belongs to the data, not to the model family you chose.' },
      ],
      correct: 1,
    },
    {
      question: 'A model underfits badly: 40% error on training and 42% on validation. You collect 10x more rows. What happens?',
      options: [
        { text: 'Error drops sharply — more data always helps', explanation: 'More data attacks variance. This model has almost none (the gap is 2 points), so there is nothing for the extra rows to fix.' },
        { text: 'The model starts overfitting', explanation: 'More data makes overfitting less likely, not more. A model that cannot fit the original rows will not suddenly memorise ten times as many.' },
        { text: 'Variance falls a little, but the model still cannot express the pattern, so error stays roughly where it was', explanation: 'Correct, and this is the practical value of diagnosing first. Too much bias needs a more flexible model or better features.' },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'In thirty seconds: what does it actually mean for a model to "learn"?',
      answer:
        'Learning is choosing the numbers inside a rule by looking at examples. I fix the shape of the rule — a line, a tree, a network — and the training rows choose its parameters by making some measure of error as small as possible. But fitting the rows I already have is the easy half, and I can always drive that error to zero by memorising. The point is generalization: doing well on rows drawn from the same source that the model never saw. That is why the data is split before anything else happens, and why most of the discipline in this work is about honest measurement rather than about fitting.',
      isCaseBased: false,
    },
    {
      question: 'Case: a tabular classifier hits 98% training accuracy and 71% validation accuracy on 5,000 rows. Diagnose it and give me your ordered plan.',
      answer:
        'A 27-point gap with near-perfect training accuracy is high variance — overfitting. The model has memorised 5,000 rows including their noise. Ordered plan. (1) Before anything else, check for duplicate or near-duplicate rows straddling the split, because that produces exactly this signature and is a bug rather than a modelling problem. (2) Restrict what I already have — for a tree ensemble, less depth and larger leaves; for a linear model, a stronger penalty on the weights; for a network, dropout plus stopping early. Cheapest and fastest signal. (3) Cut features — with 5,000 rows and a couple of hundred columns, many are noise the model latched onto. (4) Switch from one 15% validation split to k-fold cross-validation, because at this data size a single split is noisy enough that I may be chasing a mirage. (5) Average several models, which cancels some of the instability. (6) Only then buy more rows: the strongest fix, and the slowest and most expensive one.',
      isCaseBased: true,
    },
    {
      question: 'Case: another team on the same task gets 62% training accuracy and 61% validation accuracy, while a domain expert reaches about 90%. Diagnose and plan.',
      answer:
        'Almost no gap and high error on both sets: too much bias, underfitting. The model family cannot express the pattern, and the human at 90% proves the pattern exists and is learnable, so this is not the noise floor. Plan, in order. (1) Features first — on tabular data this is usually the biggest lever: ratios, interactions, domain-derived fields, sensible encodings for high-cardinality categories. (2) A more expressive model family; plain linear to gradient boosting is often the single largest jump available. (3) Remove restrictions and train longer, and verify it has actually converged rather than assuming it. (4) Check the features even contain what the expert uses — if the expert reads a free-text note the model never sees, no model can close that gap and the real fix is a data-collection change. What I would not do is buy more rows: more data reduces variance, and there is no variance here to reduce.',
      isCaseBased: true,
    },
    {
      question: 'Why do we need a validation set when we already have a test set?',
      answer:
        'Because they answer different questions, and asking one of them repeatedly corrupts the set it is asked of. Validation answers "which of my candidates is best", and answering it many times fits my decisions to that set, so its score becomes optimistic. Test answers "what will the chosen model do on new rows", which stays honest only while nothing has been selected using it. Merge them and I lose the honest estimate entirely: the number I report now carries the winner\'s curse from every comparison I ran, and the inflation grows with how many candidates I compared. On small datasets I replace the fixed validation split with k-fold cross-validation, but the test set stays sealed either way.',
      isCaseBased: false,
    },
    {
      question: 'Define bias and variance, and say how you tell them apart in practice.',
      answer:
        'Both are defined by imagining refitting the model on many freshly collected training sets. Bias is how far the average of those refits sits from the truth — error from the model being unable to represent the pattern, which does not shrink with more data. Variance is how far a single refit sits from that average — error from sensitivity to which rows you happened to draw. In practice you only ever train once, so you never observe the spread directly. What you use instead is two numbers: high error on training and validation with a small gap means bias dominates; low training error with a large gap means variance dominates. The reason to make the call before acting is that more data attacks only variance, so spending it on a high-bias model buys nothing.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague reports 94% test accuracy. You learn they ran about 40 experiments, checking the test set each time. How much do you trust it and what do you do?',
      answer:
        'I trust the direction, not the number. 94% is an upper bound, inflated by selection: 40 comparisons against one set means the winner captured some sampling luck, and on a 1,000-row test set the ordinary run-to-run wobble in accuracy is already about 1.5 points, so taking the maximum of 40 such draws can easily add several. What I would do. (1) Stop running experiments against that set — it is spent; from now on it is a validation set. (2) Carve out a genuinely fresh holdout, ideally a later time period, freeze the model, and score it once. (3) If no fresh data exists, use nested cross-validation so that all selection happens strictly inside an inner loop. (4) Report it without blame: this is the most common mistake in applied ML, and the durable fix is procedural — all choices go through validation, the test set opens once.',
      isCaseBased: true,
    },
    {
      question: 'You are handed only two numbers, training error and validation error. Walk me through every diagnosis you can make.',
      answer:
        'Four cases. Both high with a small gap: too much bias, underfitting — the model cannot express the pattern, so make it more flexible or improve the features. Training low, validation much higher: too much variance, overfitting — more data, a simpler model, fewer features, or averaging models. Both low: done, and further tuning is now mostly fitting the validation set. Training error higher than validation error: treat it as a bug signal, usually a leaky or accidentally easier validation split. One judgement layer on top: compare both numbers against a human or a trivial baseline, because "high error" means nothing in isolation — 30% error can be underfitting on one task and near the achievable floor on another.',
      isCaseBased: false,
    },
    {
      question: 'Case: the model looks excellent offline and performs far worse in production. Debug it.',
      answer:
        'I work from cheapest cause to most expensive. (1) The evaluation was never honest: the test set was peeked at across many experiments, or duplicate rows straddled the split. Check the experiment history and run a duplicate check first, because these cost nothing to rule out. (2) Leakage: a feature that is unavailable, or holds a different value, at prediction time — classically a field populated after the outcome is known. Rebuild the features strictly from what exists at decision time and re-score. (3) Train-serve skew: the preprocessing differs between the training pipeline and the serving path — a different encoding for an unseen category, a different default for missing values. (4) Distribution shift: production traffic is not the offline sample, because of a new segment, seasonality, or a changed upstream source; compare feature distributions offline against live. (5) Only last, genuine overfitting. The ordering is the answer — in practice the first three cause far more production failures than model quality does.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'What "learning from data" means', back: 'You fix the shape of a rule; the training rows choose the numbers inside it (the parameters). Fitting known rows is easy — the goal is generalization, doing well on rows never seen.' },
    { front: 'Parameter vs hyperparameter', back: 'Parameter: a number fitted from the data, like w = 0.021. Hyperparameter: a setting you choose before training, like the shape of the rule or the polynomial degree.' },
    { front: 'Feature / label / sample', back: 'Feature = an input you may look at. Label = the answer you predict. Sample (row) = one feature-and-label pair. Supervised learning = learning the mapping from labelled pairs.' },
    { front: 'Train vs validation vs test', back: 'Training fits parameters (~70%). Validation fits YOUR choices — model, hyperparameters, when to stop (~15%). Test fits nothing: opened once, after the model is frozen (~15%).' },
    { front: 'Winner\'s curse', back: 'Picking the best of many candidates scored on one set inflates that score with luck that will not repeat. 200 noise models on noise labels: 0.61 on the chosen set, 0.49 on fresh data.' },
    { front: 'Underfitting vs overfitting signature', back: 'Underfit: high error on training AND validation, small gap. Overfit: low training error with a large gap. Overfitting is identified by the gap, not by high error.' },
    { front: 'Bias vs variance', back: 'Bias = the average model over many refits is systematically off, because the model cannot represent the truth. Variance = one refit sits far from that average, because it is sensitive to which rows it got.' },
    { front: 'Fix bias vs fix variance', back: 'Bias: more flexible model, better features, less restriction, train longer. Variance: more data, simpler model, fewer features, average several models. More data does nothing for bias.' },
  ],
  mindmapMarkdown: `- What learning from data means
  - The mechanism
    - You pick the shape of the rule
    - The rows pick the numbers inside it (parameters)
    - Hyperparameters are your choices, not the data's
    - Feature = input, label = answer, sample = one pair
  - Why training error is not quality
    - A lookup table scores 0.000 and knows nothing
    - Straight line: 0.808 on train, 0.633 on new rows
    - Memorizer: 0.000 on train, 6.667 on new rows
    - Generalization = doing well on rows never seen
  - Three piles
    - Train fits parameters (~70%)
    - Validation fits YOUR choices (~15%)
    - Test fits nothing, opened ONCE (~15%)
    - Winner's curse: 200 noise models, 0.61 then 0.49
  - Fit failures
    - Degree sweep: train falls 0.2276 to 0.0087
    - Validation bottoms at degree 3 (0.0386), climbs to 0.0614
    - Underfit: both high, small gap
    - Overfit: low train, big gap
  - Bias vs variance
    - Bias = cannot represent the truth, wrong the same way each time
    - Variance = too sensitive to which rows you got
    - Flexibility trades one for the other
  - Fixes
    - Bias: more flexible model, better features
    - Variance: more data, simpler model, averaging
    - Diagnose from the gap BEFORE spending`,
}

export default m
