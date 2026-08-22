import type { Module } from '../types'

const m: Module = {
  id: 'ml-l2-ensembles',
  subjectId: 'ml',
  level: 2,
  title: 'Ensembles: Many Weak Opinions Beat One Strong Opinion',
  whyItMatters:
    'On the kind of data most companies actually have — rows and columns in a database — the winning model is almost never one big clever model. It is a few hundred small dumb ones, combined. This module shows you why that works, with six hand-written predictions you can check on paper, and then builds the two ways of combining models from scratch: bagging, where the models are trained independently and vote, and boosting, where each model is trained specifically to fix the previous one\'s mistakes. Every number on this page came out of a real Python run.',
  assumes: [
    'You have read the *Decision Trees* module: you know a tree asks yes/no questions about a feature and gives an answer at the end, and that a deep tree can memorise its training data',
    'You know what an average is, and what a percentage is',
    'You have seen a Python list, a for loop, an if statement, and a function',
    'Nothing else. Every term used here is defined here, in plain words, the first time it appears',
  ],
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'Three mediocre guessers beat any one of them',
      md: `Six emails. Each is spam (written as 1) or not spam (written as 0). The truth, in order, is **1, 1, 1, 0, 0, 0**.

Three different spam filters look at the same six emails. None of them is good — each gets exactly four out of six right, which is 66.7%. Here is what each one says:

- Filter **A** says 1, 1, 1, 1, 1, 0. Compare to the truth: it is wrong on email 4 and email 5. Four right.
- Filter **B** says 1, 0, 1, 0, 0, 1. It is wrong on email 2 and email 6. Four right.
- Filter **C** says 0, 1, 0, 0, 0, 0. It is wrong on email 1 and email 3. Four right.

Now combine them by **majority vote**: for each email, take the answer that at least two of the three filters gave.

- Email 1: A says 1, B says 1, C says 0. Two votes for 1, so the vote says **1**. Truth is 1. Correct.
- Email 2: 1, 0, 1 — two votes for 1, so **1**. Truth is 1. Correct.
- Email 3: 1, 1, 0 → **1**. Correct. Email 4: 1, 0, 0 → **0**. Correct.
- Email 5: 1, 0, 0 → **0**. Correct. Email 6: 0, 1, 0 → **0**. Correct.

The vote gets **six out of six**. Every individual filter got 66.7%; the combination got 100%. Nobody got smarter. Look at why: on every single email, exactly one filter is wrong and the other two are right, so the wrong one is always outvoted.`,
    },
    {
      type: 'visual',
      component: 'Plot',
      props: {
          title: 'Why averaging many trees helps — and where it stops helping',
          notice: 'Averaging n models with variance 1 each: if they were independent the variance would fall as 1/n, straight to zero. Real trees trained on the same data are correlated, and correlation ρ is a floor the average can never get below — at ρ = 0.3 you are stuck at 0.30 no matter how many trees you add (200 trees gives 0.303). That floor is why Random Forest bothers to pick a random subset of features at each split: it exists purely to push ρ down.',
          kind: 'line',
          xLabel: 'number of trees averaged',
          yLabel: 'variance of the average',
          yMin: 0,
          yMax: 1.05,
          series: [
            {
              name: 'ρ = 0.3',
              points: [[1, 1], [2, 0.65], [3, 0.5333], [5, 0.44], [8, 0.3875], [12, 0.3583], [20, 0.335], [30, 0.3233], [50, 0.314], [80, 0.3087], [120, 0.3058], [200, 0.3035]],
              dots: true,
            },
            {
              name: 'ρ = 0.1',
              points: [[1, 1], [2, 0.55], [3, 0.4], [5, 0.28], [8, 0.2125], [12, 0.175], [20, 0.145], [30, 0.13], [50, 0.118], [80, 0.1113], [120, 0.1075], [200, 0.1045]],
              dots: true,
            },
            {
              name: 'independent',
              points: [[1, 1], [2, 0.5], [3, 0.3333], [5, 0.2], [8, 0.125], [12, 0.0833], [20, 0.05], [30, 0.0333], [50, 0.02], [80, 0.0125], [120, 0.0083], [200, 0.005]],
              dots: true,
            },
          ],
        },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same six emails, in code',
      code: `truth = [1, 1, 1, 0, 0, 0]
A     = [1, 1, 1, 1, 1, 0]
B     = [1, 0, 1, 0, 0, 1]
C     = [0, 1, 0, 0, 0, 0]

def score(guesses):
    return sum(1 for i in range(6) if guesses[i] == truth[i]) / 6

vote = []
for i in range(6):
    votes_for_1 = A[i] + B[i] + C[i]
    vote.append(1 if votes_for_1 >= 2 else 0)

print('A', round(score(A), 4), 'B', round(score(B), 4), 'C', round(score(C), 4))
print('vote', vote)
print('vote score', score(vote))

# ---- real output ----
# A 0.6667 B 0.6667 C 0.6667
# vote [1, 1, 1, 0, 0, 0]
# vote score 1.0`,
      annotations: {
        1: 'The true label for each of the six emails, 1 for spam and 0 for not spam. A plain Python list of six whole numbers.',
        2: 'Filter A\'s six answers, in the same order, so A[0] and truth[0] describe the same email. The extra spaces before the = are only there to line the four lists up on screen; Python ignores them.',
        3: 'Filter B\'s six answers. Note it is wrong on different emails than A.',
        4: 'Filter C\'s six answers. Again wrong on a different pair.',
        6: 'Defines a function that takes one list of six guesses and returns the fraction it got right.',
        7: 'Reads inside-out: for each position i, produce a 1 when the guess matches the truth. sum() adds those 1s up, giving the number correct, and dividing by 6 turns the count into a fraction. The "1 for i in range(6) if ..." form is a generator expression - a compact way to write "make one value per loop pass, but only when the if holds".',
        9: 'An empty list that will collect the combined answer for each email.',
        10: 'range(6) gives i = 0, 1, 2, 3, 4, 5 - the six email positions.',
        11: 'Because every answer is 0 or 1, adding the three answers together counts how many filters voted for spam. Three filters voting 1, 0, 1 gives 2.',
        12: 'Majority means at least 2 of 3. "1 if condition else 0" is a Python conditional expression: the whole thing becomes 1 when the condition holds and 0 when it does not. append() adds that value to the end of the list.',
        14: 'Score each filter on its own. round(value, 4) cuts the float to 4 decimal places so 0.6666666666666666 prints as 0.6667.',
        15: 'Print the combined answers so you can compare them to truth by eye.',
        16: 'Score the combination with the exact same function. 1.0 means all six correct.',
      },
    },
    {
      type: 'intuition',
      title: 'The condition: the models must be wrong in different places',
      md: `That result was not luck, but it was not free either. Rerun it with three filters that are wrong on the *same* two emails.

- Suppose A, B and C are all wrong on email 4 and email 5, and right everywhere else.
- Email 4: all three say the wrong thing, so the majority says the wrong thing. Same for email 5.
- The vote scores 4/6 = 66.7% — exactly what each filter scored alone. Combining bought nothing.

So the whole trick rests on one condition: the models must make **different** mistakes. If their mistakes overlap completely, the vote is just a copy of any one model. Everything else in this module is a technique for forcing models to be wrong in different places.

You can also compute the payoff when the models are wrong *independently* — meaning one being wrong tells you nothing about whether another is wrong. Three filters, each right 65% of the time, independently. The vote is right when all three are right, or when exactly two are right:

- All three right: 0.65 x 0.65 x 0.65 = **0.274625**.
- Exactly two right: there are 3 ways to choose which one is wrong, each with chance 0.65 x 0.65 x 0.35 = 0.147875, so 3 x 0.147875 = **0.443625**.
- Add them: 0.274625 + 0.443625 = **0.71825**. The vote is right 71.8% of the time, up from 65%.`,
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `import random
random.seed(1)

def majority_correct(n_models):
    wins = 0
    for trial in range(20000):
        right = 0
        for m in range(n_models):
            if random.random() < 0.65:
                right = right + 1
        if right > n_models / 2:
            wins = wins + 1
    return wins / 20000

for n in [1, 3, 7, 15, 31]:
    print(n, 'models ->', round(majority_correct(n), 4))`,
        precomputedOutput: `1 models -> 0.6534
3 models -> 0.7162
7 models -> 0.8001
15 models -> 0.8860
31 models -> 0.9568`,
        caption: 'Each model is right 65% of the time on its own, independently of the others. Three of them vote at 71.6% (the 71.8% we computed by hand, measured by simulation). Thirty-one of them vote at 95.7%.',
        annotations: {
          1: 'random is Python\'s built-in module for producing random numbers.',
          2: 'seed(1) fixes the starting point of the random number generator, so this program prints the same answer every time you run it.',
          4: 'Defines a function that takes how many models are voting and returns how often the vote is right.',
          5: 'A counter for how many trials the vote got right. Starts at zero.',
          6: 'Repeat the whole experiment 20000 times. More trials means a more stable estimate.',
          7: 'For this one trial, count how many of the models happened to be right. Reset to zero each trial.',
          8: 'Loop once per model in this vote.',
          9: 'random.random() returns a fresh number between 0 and 1, each equally likely. It lands below 0.65 about 65% of the time, which is exactly "this model is right 65% of the time". Each call is independent of the last, which is the decorrelation condition, built in.',
          10: 'This model was right, so add one.',
          11: 'The majority is right when more than half the models were right.',
          12: 'Count this trial as a win for the vote.',
          13: 'Wins divided by trials is the fraction of the time the vote was correct.',
          15: 'Try five different committee sizes.',
          16: 'Print the size and its measured accuracy, rounded to 4 decimal places.',
        },
      },
    },
    {
      type: 'intuition',
      title: 'The words',
      md: `Four terms, defined now and used for the rest of the module.

- An **ensemble** is a group of models whose answers are combined into one answer. Combining means majority vote when the answer is a category, and plain average when the answer is a number.
- A **weak learner** is a deliberately simple model that is only a little better than guessing. A decision tree of depth 1 — one yes/no question, then an answer — is the standard example. It is called a **stump**.
- A **base model** is one member of the ensemble. All the base models in one ensemble are usually the same kind of model, trained differently.
- **Variance**, here, means: if you retrained on a slightly different set of rows, how much would the model change? A deep decision tree has huge variance — change five rows and it grows a visibly different tree. That instability is exactly the raw material an ensemble needs, because it is what makes the trees disagree.

There are two ways to build an ensemble, and they are arranged in opposite directions. The next sections build each one.`,
    },
    {
      type: 'intuition',
      title: 'Bagging: train them side by side, then vote',
      md: `**Bagging** is short for **b**ootstrap **agg**regat**ing**. It is three steps.

1. Make a **bootstrap sample**: from your n training rows, draw n rows *with replacement*. "With replacement" means after you pick a row you put it back, so it can be picked again. A bootstrap sample therefore has the same number of rows as the original, but some rows appear twice or three times and some do not appear at all.
2. Train one model on that sample. Repeat from step 1, independently, until you have as many models as you want. Nothing is shared between them, so they can all be trained at the same time on different processors.
3. To predict, ask every model and combine: majority vote, or average.

The bootstrap is what makes the models disagree. Each one sees a slightly different version of the data, so each one grows a slightly different tree, so each one is wrong in a slightly different place — which is the condition we established two sections ago.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'How much of the data does a bootstrap sample miss?',
      code: `import random
random.seed(0)

rows = list(range(1000))
left_out = []
for trial in range(500):
    sample = []
    for _ in range(1000):
        sample.append(random.choice(rows))
    unique_rows = set(sample)
    left_out.append((1000 - len(unique_rows)) / 1000)

print('average fraction left out:', round(sum(left_out) / 500, 4))
print('formula (1 - 1/1000) ** 1000:', round((1 - 1 / 1000) ** 1000, 4))

# ---- real output ----
# average fraction left out: 0.3669
# formula (1 - 1/1000) ** 1000: 0.3677`,
      annotations: {
        1: 'Python\'s built-in random number module.',
        2: 'Fix the random starting point so this run is reproducible.',
        4: 'range(1000) counts 0 to 999; list() turns that count into an actual list. These stand in for 1000 training rows, each identified by its position number.',
        5: 'Will collect one number per trial: the fraction of rows that trial missed.',
        6: 'Build 500 separate bootstrap samples so we can average the answer instead of trusting one draw.',
        7: 'An empty list to hold the 1000 drawn rows for this trial.',
        8: 'Draw 1000 times, because a bootstrap sample has the same size as the original data. The underscore is the conventional name for a loop variable you never use.',
        9: 'random.choice(rows) picks one row at random and does NOT remove it from rows, so the same row can come up again on a later draw. That is what "with replacement" means, in one line.',
        10: 'set() throws away duplicates, so its length is how many DISTINCT rows made it into the sample.',
        11: 'Rows drawn minus distinct rows drawn, divided by 1000: the fraction of the original rows that this sample never saw.',
        13: 'Average the 500 answers. It lands near 0.367.',
        14: 'The reason. A given row survives one draw untouched with chance 999/1000. Draws are independent, so it survives all 1000 draws untouched with chance (999/1000) to the power 1000, which is 0.3677. The simulation agrees to three decimals.',
      },
    },
    {
      type: 'note',
      md: `So a bootstrap sample contains about 63% of the original rows, and misses about 37% of them. Those missed rows have a name: for a given tree, they are its **out-of-bag rows** — the rows that tree never trained on.

That is worth something. Take any row, find the trees that left it out, and ask only those trees to predict it. None of them has seen it, so their answer is an honest test answer. Do this for every row and average the results: that is the **out-of-bag score**, a free estimate of how the ensemble performs on unseen data, with no separate test set held aside. You will compute one by hand later in this module.`,
    },
    {
      type: 'intuition',
      title: 'Random Forest: bagging trees, plus one more source of disagreement',
      md: `Bag a few hundred decision trees and you hit a ceiling. Suppose one feature — say a customer\'s income — is far more predictive than the rest. Every bootstrap sample still contains that column, so **every tree splits on income first**, and the trees come out looking almost the same. Almost the same means almost the same mistakes, which means the vote buys almost nothing.

**Feature subsampling** is the fix: at every single split, the tree is only allowed to look at a random handful of the features, not all of them. With 16 features and a handful of 4, a given split has a 12-in-16 chance of not even being offered income, and must find the next-best signal instead.

A **Random Forest** is exactly this: bagging, applied to decision trees, with feature subsampling at every split. Two independent sources of disagreement — different rows, different columns — stacked on top of each other.

- The usual handful size is the square root of the number of features when predicting a category, and about a third of them when predicting a number.
- Each individual tree comes out slightly *worse* than it would have been, because it was sometimes denied its best question.
- The forest comes out better anyway, because the trees now make genuinely different mistakes. Accepting worse parts to get a better whole is the trade at the centre of bagging.`,
    },
    {
      type: 'intuition',
      title: 'Boosting: train them one after another, each fixing the last',
      md: `Boosting rearranges everything. Put the two side by side, because this contrast is the thing to walk out of this module with.

- **Bagging** trains its models **in parallel**, each on its own random resample of the data, and none of them knows the others exist. The combination is a plain vote or average, everyone weighted equally.
- **Boosting** trains its models **in sequence**. Model 2 is trained specifically on what model 1 got wrong, model 3 on what models 1 and 2 together still get wrong, and so on. The combination is a running sum, not a vote.
- Bagging reduces variance: it takes unstable, over-flexible models and steadies them by averaging. Its base models are deliberately deep.
- Boosting reduces bias: it takes models too simple to fit the data and adds them up until the sum is complex enough. Its base models are deliberately shallow — usually stumps or trees of depth 3.
- Adding more models to a bagged ensemble is always safe; it just stops helping. Adding more models to a boosted ensemble eventually makes it worse, because the sequence starts fixing noise. That difference gets its own section later, with numbers.

**Boosting** is the general name for the sequential arrangement. The two ways of doing it — reweighting the rows, or fitting the leftovers — come next.`,
    },
    {
      type: 'intuition',
      title: 'One round of gradient boosting, by hand',
      md: `Five houses. The feature x is size, and y is the price we want to predict.

- x = 1, 2, 3, 4, 5 and y = 2, 4, 6, 9, 14.

Start with the dumbest possible model: predict the average of y for everything. The average is (2+4+6+9+14)/5 = **7.0**, so the current prediction for every house is 7.0.

A **residual** is what is left over: the true value minus what we currently predict. One residual per row.

- Residuals: 2−7 = **−5**, 4−7 = **−3**, 6−7 = **−1**, 9−7 = **+2**, 14−7 = **+7**.
- Read them as instructions. The first three say "you are predicting too high here", the last two say "too low here".

Now fit a stump — one yes/no question — not to the prices, but **to the residuals**. Try the question "is x at most 3?". The rows with x ≤ 3 have residuals −5, −3, −1, averaging **−3.0**. The rows with x > 3 have residuals +2, +7, averaging **+4.5**. So the stump says: left side, subtract 3; right side, add 4.5.

We will not apply the full correction. We apply half of it — that fraction is the **learning rate**, also called **shrinkage**, and here it is 0.5.

- Left rows: 7.0 + 0.5 × (−3.0) = **5.5**. Right rows: 7.0 + 0.5 × (+4.5) = **9.25**.
- New residuals: 2−5.5 = −3.5, 4−5.5 = −1.5, 6−5.5 = +0.5, 9−9.25 = −0.25, 14−9.25 = +4.75.
- Compare the sizes. Before: −5, −3, −1, 2, 7. After: −3.5, −1.5, 0.5, −0.25, 4.75. Every one of them shrank.

That is one round. Round 2 does exactly the same thing to the new residuals, and so on. **Gradient boosting** is that loop: each new tree is trained to predict the current residuals, and a shrunken version of its answer is added to the running total.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Round 1, part 1: the starting guess and the residuals',
      code: `x = [1, 2, 3, 4, 5]
y = [2, 4, 6, 9, 14]

start = sum(y) / 5
F = [start, start, start, start, start]
residual = []
for i in range(5):
    residual.append(y[i] - F[i])

def mean(values):
    return sum(values) / len(values)

def mse(values):
    return sum(v * v for v in values) / len(values)

print('start guess', start)
print('residuals  ', residual)
print('mse        ', round(mse(residual), 3))

# ---- real output ----
# start guess 7.0
# residuals   [-5.0, -3.0, -1.0, 2.0, 7.0]
# mse         17.6`,
      annotations: {
        1: 'The one feature, house size, for five houses.',
        2: 'The true price of each house, in the same order.',
        4: 'sum(y) adds the five prices, divided by 5 gives the average: 7.0. This is the dumbest model there is - one number for everybody.',
        5: 'F is the current prediction for each of the five houses. Right now they are all the same 7.0. F will grow as rounds are added.',
        6: 'An empty list to hold the five residuals.',
        7: 'Walk the five rows by position.',
        8: 'The residual: truth minus current prediction. Positive means we are predicting too low for this house.',
        10: 'A small helper that averages a list. Defined once so the next snippet can reuse it.',
        11: 'Sum divided by count. len() is how many items the list holds.',
        13: 'Another helper: the mean of the squared values. Squaring makes negatives and positives count the same, so this is one number summarising how big the residuals are overall.',
        14: '"v * v for v in values" is a generator expression: it produces one squared value per item, and sum() adds them as they come. Dividing by len() averages them.',
        16: 'Show the starting prediction.',
        17: 'Show the five residuals. These are what the next tree will be trained on.',
        18: 'One number for how wrong we currently are: 17.6. We want the next round to lower it.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Round 1, part 2: pick the best yes/no question about the residuals',
      code: `best = None
for cut in [1, 2, 3, 4]:
    left = [residual[i] for i in range(5) if x[i] <= cut]
    right = [residual[i] for i in range(5) if x[i] > cut]
    err = sum((v - mean(left)) ** 2 for v in left) + sum((v - mean(right)) ** 2 for v in right)
    print('cut x <=', cut, '| left mean', round(mean(left), 3), '| right mean', round(mean(right), 3), '| err', round(err, 3))
    if best is None or err < best[0]:
        best = (err, cut, mean(left), mean(right))

print('best cut', best[1], 'predicts', round(best[2], 3), 'and', round(best[3], 3))

# ---- real output ----
# cut x <= 1 | left mean -5.0 | right mean 1.25 | err 56.75
# cut x <= 2 | left mean -4.0 | right mean 2.667 | err 34.667
# cut x <= 3 | left mean -3.0 | right mean 4.5 | err 20.5
# cut x <= 4 | left mean -1.75 | right mean 7.0 | err 26.75
# best cut 3 predicts -3.0 and 4.5`,
      annotations: {
        1: 'best will hold the winning question. None is Python\'s "nothing here yet" value, so the first cut tried always wins by default.',
        2: 'The four places a yes/no question could split five houses: at most 1, at most 2, at most 3, at most 4.',
        3: 'The residuals of the rows that answer yes. "[residual[i] for i in range(5) if x[i] <= cut]" is a list comprehension: walk every position, keep residual[i] only when the condition holds, and collect the kept ones into a new list.',
        4: 'The residuals of the rows that answer no. Together lines 3 and 4 split the five residuals into two groups.',
        5: 'How badly one number represents each group. For each group, take each residual minus that group\'s average, square it, and add them up. A group whose values are all close together scores near zero. Adding the two groups gives one score for this cut.',
        6: 'Print the cut and what it would predict on each side, so you can check the arithmetic against the section above by eye.',
        7: 'best[0] is the score of the best cut found so far. Keep this cut if it scores lower.',
        8: 'Store four things together as a tuple: the score, the cut, and the two predictions. A tuple is just a fixed group of values in one variable.',
        10: 'The winner is "is x at most 3", predicting -3.0 on the left and +4.5 on the right - exactly the stump we fitted by hand.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Round 1, part 3: apply half the correction and watch the residuals shrink',
      code: `lr = 0.5
err, cut, left_pred, right_pred = best

new_F = []
for i in range(5):
    step = left_pred if x[i] <= cut else right_pred
    new_F.append(F[i] + lr * step)

new_residual = []
for i in range(5):
    new_residual.append(y[i] - new_F[i])

print('new prediction', [round(v, 3) for v in new_F])
print('new residual  ', [round(v, 3) for v in new_residual])
print('mse before', round(mse(residual), 3), '-> after', round(mse(new_residual), 3))

# ---- real output ----
# new prediction [5.5, 5.5, 5.5, 9.25, 9.25]
# new residual   [-3.5, -1.5, 0.5, -0.25, 4.75]
# mse before 17.6 -> after 7.475`,
      annotations: {
        1: 'The learning rate: the fraction of the tree\'s correction we actually apply. 0.5 means half.',
        2: 'Tuple unpacking: best holds four values, and this line hands them to four named variables in one go, in the order they were stored.',
        4: 'Will hold the updated prediction for each house.',
        5: 'Once per house.',
        6: 'What the stump says for this house: the left prediction if the house answers yes to the question, otherwise the right one. This is the same "value if condition else other" form used earlier.',
        7: 'The update: old prediction plus learning rate times the stump\'s correction. This addition is the whole of boosting - the models are summed, never averaged.',
        9: 'Will hold the residuals that remain after the update.',
        10: 'Once per house again.',
        11: 'Truth minus the NEW prediction. These leftovers are what round 2 would be trained on.',
        13: 'Print the updated predictions. Notice there are only two distinct values, because one stump can only say two things.',
        14: 'Print the remaining residuals. Every one is smaller in size than before.',
        15: 'One number confirming it: 17.6 down to 7.475 after a single stump, using only half its advice.',
      },
    },
    {
      type: 'note',
      md: `Why apply only half? Because the stump was fitted to these five rows, and part of what it found is real pattern while part is the accident of this particular sample. Taking the full correction commits hard to the accident. Taking half, and letting the next tree look again at what is left, keeps every step reversible by later steps.

The cost is that you need more rounds: a learning rate of 0.05 needs roughly ten times as many trees as 0.5 to travel the same distance. So the two settings trade against each other — small learning rate with many trees is the safer, slower combination, and it is the usual default.`,
    },
    {
      type: 'intuition',
      title: 'AdaBoost: the older method, which reweights rows instead of fitting leftovers',
      md: `AdaBoost is the original boosting method, and it works on classification. Instead of fitting the leftovers, it keeps a **weight** on each training row — a number saying how much that row matters — and after each round it raises the weight of the rows the model got wrong, so the next model is forced to care about them.

Here is the rule, and then the arithmetic. Five rows, each starting with weight 1/5 = 0.2. The first stump gets 2 of the 5 wrong.

- **Epsilon** is the total weight of the wrong rows: 0.2 + 0.2 = **0.4**.
- **Alpha** is how much this model\'s vote counts, defined as half the natural logarithm of (1 − epsilon) / epsilon. Here that is 0.5 × ln(0.6/0.4) = 0.5 × ln(1.5) = 0.5 × 0.4055 = **0.2027**. A model with a low error rate gets a large alpha and therefore a loud vote; a model at 50% error gets alpha = 0, meaning no vote at all.
- Wrong rows have their weight multiplied by e raised to alpha = **1.2247**. Right rows are multiplied by e raised to minus alpha = **0.8165**.
- Wrong rows: 0.2 × 1.2247 = 0.24495 each. Right rows: 0.2 × 0.8165 = 0.1633 each.
- Those five weights add up to 0.9798, not 1, so divide every one by 0.9798 to make them add to 1 again. Wrong rows become 0.24495/0.9798 = **0.25**; right rows become 0.1633/0.9798 = **0.1667**.

Each wrong row went from 0.2 to 0.25 and each right row from 0.2 to 0.1667. The next stump is trained with those weights, so getting the two hard rows right now matters half again as much as before.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'AdaBoost, part 1: the error rate and the vote weight',
      code: `import math

weight = [0.2, 0.2, 0.2, 0.2, 0.2]
wrong = [False, True, False, True, False]

epsilon = 0.0
for i in range(5):
    if wrong[i]:
        epsilon = epsilon + weight[i]

alpha = 0.5 * math.log((1 - epsilon) / epsilon)
print('epsilon', round(epsilon, 4), 'alpha', round(alpha, 4))
print('e ** alpha', round(math.exp(alpha), 4), 'e ** -alpha', round(math.exp(-alpha), 4))

# ---- real output ----
# epsilon 0.4 alpha 0.2027
# e ** alpha 1.2247 e ** -alpha 0.8165`,
      annotations: {
        1: 'math is Python\'s built-in module for logarithms, exponentials and similar functions.',
        3: 'The five row weights, all equal at the start. They add up to 1.',
        4: 'Which rows this stump got wrong. True means wrong. Rows 2 and 4 are the two failures.',
        6: 'A running total for the weighted error rate, starting at zero. Written 0.0 to make clear it holds decimals.',
        7: 'Walk the five rows.',
        8: 'Only wrong rows contribute to the error.',
        9: 'Add this row\'s weight, not 1. That is what "weighted" means: a row with a big weight counts for more when scoring the model.',
        11: 'math.log is the natural logarithm - the logarithm to base e, where e is about 2.718. This is the alpha formula written out: half the log of (1 - epsilon) over epsilon.',
        12: 'Print both. epsilon 0.4 and alpha 0.2027, matching the hand arithmetic above.',
        13: 'math.exp(v) is e raised to the power v. These two multipliers, 1.2247 and 0.8165, are what the weights get multiplied by next. Notice they are reciprocals of each other.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'AdaBoost, part 2: reweight the rows and renormalise',
      code: `updated = []
for i in range(5):
    if wrong[i]:
        updated.append(weight[i] * math.exp(alpha))
    else:
        updated.append(weight[i] * math.exp(-alpha))

total = sum(updated)
final = []
for value in updated:
    final.append(value / total)

print('before normalising', [round(v, 5) for v in updated])
print('total             ', round(total, 5))
print('after normalising ', [round(v, 4) for v in final])

# ---- real output ----
# before normalising [0.1633, 0.24495, 0.1633, 0.24495, 0.1633]
# total              0.9798
# after normalising  [0.1667, 0.25, 0.1667, 0.25, 0.1667]`,
      annotations: {
        1: 'Will hold the five new weights before they are rescaled.',
        2: 'Once per row.',
        3: 'Was this row a mistake?',
        4: 'If yes, multiply its weight up by 1.2247. This row now matters more to the next model.',
        5: 'Otherwise.',
        6: 'Multiply its weight down by 0.8165. Note the minus inside exp(), which is what turns the multiplier into its reciprocal.',
        8: 'Add the five new weights. They come to 0.9798, so they no longer add to 1.',
        9: 'Will hold the rescaled weights.',
        10: 'Walk the new weights directly, without an index, since we only need the values.',
        11: 'Dividing every weight by their total forces the five of them to add to exactly 1. That is what "normalise" means here.',
        13: 'The unscaled weights: the two wrong rows are up at 0.24495, the three right ones down at 0.1633.',
        14: 'The total, showing why a rescale was needed at all.',
        15: 'The final weights: 0.25 on each wrong row, 0.1667 on each right row. Exactly the numbers computed by hand in the section above.',
      },
    },
    {
      type: 'intuition',
      title: 'Stacking, in one section',
      md: `There is a third way to combine models, and it does not require them to be the same kind of model.

**Stacking** means: train several different models — say a random forest, a boosted model, and a plain linear model — and then train one more small model, called the **meta-model**, whose input is the *predictions* of the first ones and whose output is the final answer. Instead of averaging the three answers with equal weight, the meta-model learns how much to trust each one, and when.

There is one mistake that destroys it. If you train the meta-model on predictions the base models made about rows they were trained on, those predictions are unrealistically good — the base models partly memorised those rows — so the meta-model learns to trust an accuracy that will not exist at prediction time. The fix is to feed the meta-model only **out-of-fold** predictions: split the training data into parts, and for each part, predict it using base models that were trained without it. Same idea as out-of-bag, done deliberately.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: three bagged stumps and a hand-computed out-of-bag score',
      md: `Six emails again, truth **1, 1, 1, 0, 0, 0**, and one feature: the number of links in the email. Call the rows 1 to 6.

- Links, in row order: **8, 6, 5, 2, 3, 1**. Truth, in row order: **1, 1, 1, 0, 0, 0**.

Draw three bootstrap samples of six rows each, with replacement. These are the draws we got:

- **Sample 1** = rows 1, 1, 2, 4, 5, 6 — so it never saw **row 3**.
- **Sample 2** = rows 2, 3, 3, 4, 6, 6 — it never saw **row 1 or row 5**.
- **Sample 3** = rows 1, 2, 3, 5, 5, 6 — it never saw **row 4**.

Now fit one stump to each sample: pick the link-count threshold that misclassifies the fewest rows *in that sample*.

- **Tree 1** sees link counts 8, 8, 6, 2, 3, 1 with labels 1, 1, 1, 0, 0, 0. The threshold "links ≤ 3 means not spam" separates them perfectly. Zero errors on its own sample.
- **Tree 2** sees 6, 5, 5, 2, 1, 1 with labels 1, 1, 1, 0, 0, 0. Row 5, whose link count is 3, is not in this sample, so the tree has no reason to put the line above 2. It picks **"links ≤ 2 means not spam"**. Also zero errors on its own sample — but it has guessed the boundary wrong.
- **Tree 3** sees 8, 6, 5, 3, 3, 1 with labels 1, 1, 1, 0, 0, 0 and picks **"links ≤ 3 means not spam"**. Zero errors.

Now the out-of-bag score. Each row is judged only by trees that never saw it.

- **Row 1** (8 links, truth 1) was left out of sample 2 only. Tree 2 says 8 > 2, so spam. **Correct.**
- **Row 3** (5 links, truth 1) was left out of sample 1 only. Tree 1 says 5 > 3, so spam. **Correct.**
- **Row 4** (2 links, truth 0) was left out of sample 3 only. Tree 3 says 2 ≤ 3, so not spam. **Correct.**
- **Row 5** (3 links, truth 0) was left out of sample 2 only. Tree 2 says 3 > 2, so spam. **Wrong.**
- **Rows 2 and 6** appear in all three samples, so no tree is out-of-bag for them and they get no out-of-bag prediction at all.

Out-of-bag score = 3 correct out of the 4 rows that could be scored = **0.75**. Three things to take from it. It cost no held-out data. It caught tree 2\'s bad boundary, which its own training sample could not — tree 2 scored zero errors on itself and still failed row 5. And with only three trees, two rows went unscored; with 200 trees, essentially every row is out-of-bag for some of them, which is why out-of-bag scores are trustworthy on real forests and shaky on tiny ones.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: assuming more trees always helps',
      md: `"More trees is always safer" is true for bagging and false for boosting, and the sentence gets carried across without anyone noticing.

Set up a case where it bites. Six houses, x = 1 to 6, and the true price is exactly 2x: **2, 4, 6, 8, 10, 12**. But one training label is a typo — the fourth house is recorded as **20** instead of 8. So the training labels are 2, 4, 6, **20**, 10, 12, and one of them is simply wrong.

Run the gradient boosting loop from earlier on that data, learning rate 0.3, one stump per round. Track two numbers each round: the error against the **training labels** (which include the typo), and the error against the **true prices** (which do not). These came from a real run:

- Round 0: prediction at house 4 is 9.0; training error 35.67; true error 15.67.
- Round 2: prediction 11.55; training error 16.67; true error 6.87.
- Round 4: prediction 12.69; training error 11.73; true error **6.50** — the lowest it gets.
- Round 10: prediction 14.53; training error 6.74; true error 8.87 — rising now.
- Round 20: prediction 16.67; training error 2.74; true error 13.43.
- Round 30: prediction 17.94; training error 1.23; true error **17.00**.

The training error falls every single round, all the way to 1.23. If that is the number on your screen, boosting looks like it is working beautifully at round 30. The true error bottomed out at round 4 and then more than doubled.

The mechanism is visible in the first column. Every round, boosting looks at the biggest remaining residual and sends the next tree at it. House 4 has the biggest residual precisely *because* its label is wrong, so round after round the model is dragged from 9.0 towards 20 — and because a stump answers a whole region at once, house 5 and house 6 get dragged along with it. Boosting cannot tell "this row is hard" from "this row is mislabelled". It attacks both.

Bagging does not do this. Each bagged tree sees the typo or does not (about 37% of them do not), each fits it or dilutes it independently, and the average is pulled towards the majority rather than towards the outlier. So the diagnosis, when a boosted model gets worse as rounds go up: you are reading training error, not held-out error. The fix is to measure on held-out rows every round and stop at the bottom of that curve — round 4 here — rather than at the round count you happened to configure.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Pen and paper first. All the arithmetic is small on purpose; the solutions are in the next section.

1. Three models answer five rows whose truth is 1, 0, 1, 1, 0. Model A says 1, 0, 1, 0, 1. Model B says 1, 1, 1, 1, 0. Model C says 0, 0, 1, 1, 1. Score each model, then score the majority vote.
2. You have 5 training rows and draw a bootstrap sample of 5 with replacement. What is the chance a particular row is missed entirely, and what fraction of rows would you expect to be out-of-bag?
3. Four houses, x = 1, 2, 3, 4 and y = 1, 3, 5, 11. Do one round of gradient boosting with learning rate 0.5: compute the starting guess, the residuals, the best of the three possible stumps (cut at 1, 2 or 3, scored the way the code did it), the updated predictions and the new residuals.
4. AdaBoost with 4 rows, all starting at weight 0.25, and the first stump gets exactly one of them wrong. Compute epsilon, alpha, both multipliers, and the four weights after renormalising.
5. A colleague says: "our random forest has 200 trees and scores 0.86. I am going to add feature subsampling — each split will only see 4 of the 16 features — but that makes each tree worse, so the forest will get worse too." What is wrong with the reasoning?`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `Check each step against your own working, not just the final number.

**1.** Truth is 1, 0, 1, 1, 0. Model A matches on rows 1, 2, 3 and misses rows 4 and 5, so **3/5 = 0.6**. Model B matches on rows 1, 3, 4, 5 and misses row 2: **4/5 = 0.8**. Model C matches on rows 2, 3, 4 and misses rows 1 and 5: **3/5 = 0.6**. Votes, row by row: row 1 gets 1, 1, 0 → 1 (correct); row 2 gets 0, 1, 0 → 0 (correct); row 3 gets 1, 1, 1 → 1 (correct); row 4 gets 0, 1, 1 → 1 (correct); row 5 gets 1, 0, 1 → 1, but truth is 0 (wrong). The vote scores **4/5 = 0.8**. It beat two of the three models and only tied the best one — and row 5 shows why: A and C were both wrong there, so the vote had no majority left to rescue it.

**2.** One draw misses a particular row with chance 4/5 = 0.8. Five draws are independent, so all five miss it with chance 0.8 to the power 5 = **0.32768**, about 33%. So roughly a third of the rows are out-of-bag, and about **0.67** of them appear at least once. With 1000 rows instead of 5 the same calculation gives 0.3677, which is the number the code measured — the fraction settles down as n grows.

**3.** Starting guess = (1+3+5+11)/4 = **5.0**. Residuals = 1−5, 3−5, 5−5, 11−5 = **−4, −2, 0, +6**, and the mean of their squares is (16+4+0+36)/4 = **14.0**. The three cuts: "x ≤ 1" gives left mean −4.0 and right mean (−2+0+6)/3 = 1.333, scoring 34.667; "x ≤ 2" gives −3.0 and 3.0, scoring 20.0; "x ≤ 3" gives (−4−2+0)/3 = −2.0 and 6.0, scoring **8.0** — the winner. Update with learning rate 0.5: the first three houses become 5.0 + 0.5×(−2.0) = **4.0**, the fourth becomes 5.0 + 0.5×6.0 = **8.0**. New residuals: 1−4 = −3, 3−4 = −1, 5−4 = +1, 11−8 = **+3**. Mean of squares = (9+1+1+9)/4 = **5.0**, down from 14.0.

**4.** Epsilon is the weight of the wrong row, so **0.25**. Alpha = 0.5 × ln(0.75/0.25) = 0.5 × ln(3) = 0.5 × 1.0986 = **0.5493**. Multipliers: e to the 0.5493 = **1.7321** for the wrong row, e to the −0.5493 = **0.5774** for the right ones. New unscaled weights: 0.25 × 1.7321 = **0.43301** for the wrong row, 0.25 × 0.5774 = **0.14434** for each of the three right ones. Total = 0.43301 + 3×0.14434 = **0.86603**. Divide through: the wrong row lands at 0.43301/0.86603 = **0.5**, and each right row at **0.1667**. One row now carries half the total weight — which is also the warning about AdaBoost: give it a mislabelled row and it will keep escalating that row\'s weight round after round.

**5.** The premise is right and the conclusion does not follow. Each tree does get worse, because it is sometimes denied its best question. But the forest\'s accuracy does not come from the quality of one tree; it comes from the mistakes cancelling when the trees vote, and mistakes only cancel if they are different mistakes. Without feature subsampling, a single dominant feature is the first split in nearly every tree, so the 200 trees are near-copies and their mistakes land in the same rows — exactly the case in this module where the vote scored the same 66.7% as one filter. Feature subsampling trades a little accuracy per tree for a lot of disagreement between trees, and the second effect is usually the larger one. It is also cheap to settle: run it both ways and compare the out-of-bag scores.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. This section is for a second pass.

- **The variance formula.** Average n models, each with variance sigma-squared, where every pair of models has correlation rho. The variance of the average is rho×sigma-squared + (1−rho)/n × sigma-squared. Only the second term shrinks as you add models, so adding trees forever cannot push the variance below **rho × sigma-squared**. That floor is set entirely by how similar your trees are, which is the formal version of the decorrelation argument, and the reason Random Forest works so hard to lower rho.
- **Why "gradient" boosting.** With squared error, the slope of the loss with respect to the current prediction is −2 × (truth − prediction), which is just the residual, times −2. So "fit the next tree to the residuals" is literally "fit the next tree to the negative slope of the loss". Swap in a different loss and you fit the tree to that loss\'s slope instead, which is how the same algorithm handles classification.
- **Stochastic gradient boosting.** Fit each round\'s tree on a random subset of the rows rather than all of them. Cheaper per round, and the extra randomness usually helps a little.
- **Early stopping.** The practical form of the classic-mistake section: measure held-out error every round, keep the round count that scored best, and stop when it has not improved for, say, 50 rounds. This is what makes a large tree count safe.
- **The three well-known implementations.** XGBoost added second-order derivative information and an explicit penalty on tree complexity. LightGBM speeds training up by bucketing continuous features into a few hundred bins and growing trees leaf-by-leaf rather than level-by-level. CatBoost handles categorical features natively using target statistics computed in a way that avoids leaking the label. They are all gradient boosting; the differences are speed and defaults, not a different idea.`,
    },
  ],
  quiz: [
    {
      question: 'Three filters each score 4/6 on the six emails, and the majority vote scores 6/6. What single property of the three filters made that possible?',
      options: [
        { text: 'Each filter was individually well above chance', explanation: 'Necessary but not sufficient. Three filters at 66.7% that are wrong on the same two emails still vote at 66.7%.' },
        {
          text: 'Each email was missed by only one of the three filters, so the wrong answer was always outvoted',
          explanation: 'Correct. The mistakes were spread across different emails. Overlapping mistakes would have carried the vote with them.',
        },
        { text: 'Majority voting is guaranteed to beat the average member', explanation: 'It is not. If all three make identical mistakes, the vote reproduces them exactly.' },
      ],
      correct: 1,
    },
    {
      question: 'A bootstrap sample of 1000 rows is drawn from 1000 rows with replacement. Roughly what fraction of the original rows does it contain?',
      options: [
        { text: 'All of them, just in a different order', explanation: 'That would be sampling without replacement. With replacement, some rows are drawn twice and others never.' },
        { text: 'About half', explanation: 'The measured answer is higher. (999/1000) to the power 1000 = 0.3677 are missed, so about 63% are present.' },
        {
          text: 'About 63%, with the other 37% missing entirely',
          explanation: 'Correct, and the 500-trial simulation measured 0.3669 missing against the formula\'s 0.3677. The missing rows are that tree\'s out-of-bag rows.',
        },
      ],
      correct: 2,
    },
    {
      question: 'In gradient boosting with squared error, what is each new tree trained to predict?',
      options: [
        { text: 'The true target values, on a bootstrap sample of the rows', explanation: 'That is bagging. Boosting trees are not trained on the target and are not independent of each other.' },
        {
          text: 'The residuals — the true value minus what the ensemble so far predicts',
          explanation: 'Correct. In the worked example the first tree was fitted to -5, -3, -1, +2, +7, not to the prices 2, 4, 6, 9, 14.',
        },
        { text: 'The rows the previous tree got wrong, reweighted', explanation: 'That is AdaBoost\'s mechanism. Gradient boosting changes the target each round rather than the row weights.' },
      ],
      correct: 1,
    },
    {
      question: 'AdaBoost, 5 rows at weight 0.2 each, 2 of them wrong. Epsilon is 0.4 and alpha is 0.2027. What weight does each wrong row carry in the next round?',
      options: [
        { text: '0.4, because that is the error rate', explanation: 'Epsilon is the total weight of all wrong rows combined, not the new weight of one of them.' },
        {
          text: '0.25 — multiply 0.2 by e to the alpha (1.2247) to get 0.24495, then divide by the new total 0.9798',
          explanation: 'Correct. Right rows get 0.2 x 0.8165 = 0.1633, which renormalises to 0.1667. The five new weights add to 1.',
        },
        { text: '0.24495, straight from the multiplier', explanation: 'That is the value before renormalising. The five unscaled weights sum to 0.9798, so every one is divided by 0.9798 to restore a total of 1.' },
      ],
      correct: 1,
    },
    {
      question: 'A boosted model is trained on data with one badly mislabelled row. Training error falls every round for 30 rounds. What is happening to error on clean, held-out data?',
      options: [
        { text: 'It falls too, since the model is genuinely improving', explanation: 'The run in this module shows otherwise: true error bottomed at 6.50 in round 4 and rose to 17.00 by round 30 while training error kept falling to 1.23.' },
        { text: 'It stays flat, since one row cannot matter much', explanation: 'One row matters a lot in boosting, because the biggest residual attracts every subsequent tree, and a shallow tree drags nearby rows along with it.' },
        {
          text: 'It falls for a few rounds and then rises, because the sequence starts chasing the mislabelled row',
          explanation: 'Correct. Boosting cannot distinguish a hard row from a wrong one, so it keeps attacking the largest leftover error, which here is a typo. This is why held-out error must be measured every round.',
        },
      ],
      correct: 2,
    },
    {
      question: 'What is the single practical difference between how bagging and boosting are trained?',
      options: [
        {
          text: 'Bagging trains its models independently and in parallel on resampled data; boosting trains them in sequence, each on what the previous ones still get wrong',
          explanation: 'Correct, and everything else follows from it. Bagged models can be trained on separate machines at once; boosted models cannot begin round k before round k-1 finishes.',
        },
        { text: 'Bagging uses trees and boosting uses linear models', explanation: 'Both normally use trees. The difference is the arrangement, not the base model type.' },
        { text: 'Bagging averages predictions and boosting takes the best single model', explanation: 'Boosting keeps every model. It adds their shrunken contributions into a running sum.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why does combining several mediocre models beat using one of them?',
      answer:
        'Because the models make different mistakes, and combining lets the correct majority outvote each mistake. Concretely: three spam filters on six emails, each scoring 4/6, but each wrong on a different pair of emails. On every email exactly one filter is wrong, so the majority vote is right on all six — 100% from three 66.7% models. The condition is that the mistakes must be spread out. If all three are wrong on the same two emails, the vote scores 4/6 as well and combining gained nothing. For independent models it is arithmetic: three models each right 65% of the time vote correctly 0.65^3 + 3 x 0.65^2 x 0.35 = 71.8% of the time. So the design question for any ensemble is not "how do I make the models good", it is "how do I make them disagree".',
      isCaseBased: false,
    },
    {
      question: 'Explain bagging and boosting, and be specific about how they differ.',
      answer:
        'Bagging trains its models in parallel and independently. Each one gets its own bootstrap sample — n rows drawn from n rows with replacement, so it sees about 63% of the distinct rows — and the models are combined by vote or plain average, all weighted equally. It reduces variance, so its base models are deliberately deep and unstable. Boosting trains its models in sequence. Each one is fitted to what the ensemble so far gets wrong: in gradient boosting to the residuals, in AdaBoost to a reweighted version of the data where the previous round\'s mistakes carry more weight. The models are summed, each shrunk by a learning rate, not averaged. It reduces bias, so its base models are deliberately shallow. Two consequences follow. Bagging parallelises across machines and boosting cannot. And more trees is always safe in bagging but is a tuned hyperparameter in boosting, because past a point the sequence starts fitting noise.',
      isCaseBased: false,
    },
    {
      question: 'What is an out-of-bag score, and why is it useful?',
      answer:
        'Each bagged tree is trained on a bootstrap sample that misses about 37% of the rows — the formula is (1 - 1/n)^n, which converges to 1/e = 0.368, and a 500-trial simulation on 1000 rows measured 0.3669. Those missed rows are that tree\'s out-of-bag rows. To score row i, use only the trees that never saw it; their prediction is an honest unseen-data prediction. Average over all rows and you have a validation estimate that cost no held-out data. It is useful when data is scarce, and as a fast first check when a model disappoints in production: if the out-of-bag score already matched the offline score, the model really did learn the training distribution, which points at leakage or distribution shift rather than at overfitting. It is only trustworthy with many trees. With three trees, some rows are in every sample and get no out-of-bag prediction at all.',
      isCaseBased: false,
    },
    {
      question: 'What does the learning rate do in gradient boosting, and how does it interact with the number of trees?',
      answer:
        'Each round fits a tree to the current residuals, and the learning rate is the fraction of that tree\'s correction actually added to the running prediction. In the worked example, a stump said "subtract 3 on the left, add 4.5 on the right", and at a learning rate of 0.5 the predictions moved from 7.0 to 5.5 and 9.25, cutting the mean squared residual from 17.6 to 7.475. The reason to shrink is that the tree was fitted to one particular sample, so part of what it found is real pattern and part is that sample\'s accident. Taking half of it, and letting later trees revisit what remains, keeps each step correctable. The interaction is a direct trade: a learning rate of 0.05 needs roughly ten times as many rounds as 0.5 to travel the same distance. Small rate with many trees generalises better and is the usual default; the number of trees is then set by early stopping on held-out error, not chosen up front.',
      isCaseBased: false,
    },
    {
      question: 'Why does Random Forest restrict each split to a random subset of features, when that makes each individual tree worse?',
      answer:
        'Because the forest\'s accuracy comes from the trees making different mistakes, not from any one tree being good. If a single feature is strongly predictive, it survives every bootstrap sample, so every tree splits on it first and the trees end up near-copies. Near-copies make the same mistakes on the same rows, and a vote among identical mistakes reproduces them. Restricting each split to a random handful of features — the square root of the feature count for classification, about a third for regression — means most splits cannot even see the dominant feature and must use the second- and third-best signals. Each tree is slightly weaker, the set of trees is far more varied, and the second effect is normally the larger one. It is worth stating as a general principle: bagging trades quality per member for disagreement between members, and the trade usually pays.',
      isCaseBased: false,
    },
    {
      question: 'Case: your Random Forest scores 0.94 offline but 0.71 in production, with an unchanged pipeline. Walk through your debugging.',
      answer:
        'A gap that size is not variance, so I suspect the evaluation rather than the model. First, check the out-of-bag score. If it was also 0.94, the model genuinely learned the training distribution, which points at leakage or shift rather than at overfitting, and that reordering saves a lot of time. Then, in order: (1) Leakage — was any feature computed using information not available at prediction time, such as an aggregate over the whole dataset, a field only filled in after the outcome, or a target-encoded column fitted before the split? Look at the top features by importance and ask whether each is available at request time. (2) Split methodology — a random split on temporal or grouped data puts near-duplicate rows on both sides; re-evaluate with a time-based or group-aware split. (3) Distribution shift — compare the production feature distributions against training. A forest cannot extrapolate beyond the ranges it saw, so shifted numeric inputs silently clamp. (4) Threshold and class balance — accuracy at a 0.5 cut-off does not transfer if production has a different base rate. (5) Serving skew — different preprocessing code or a different feature version on the serving path.',
      isCaseBased: true,
    },
    {
      question: 'Case: a teammate says "our boosted model gets worse the more trees we add, so boosting must be broken". What do you tell them and what do you check?',
      answer:
        'Nothing is broken; that is boosting working as designed. Unlike bagging, each round is fitted to what is still wrong, so training error keeps falling forever, and past some round the sequence is fitting noise rather than signal. I have a small demonstration: six houses whose true prices are 2x, with one label mistyped as 20 instead of 8. Training error falls monotonically from 35.67 to 1.23 over 30 rounds while error against the true prices bottoms at 6.50 in round 4 and rises to 17.00 by round 30, because the mistyped row has the largest residual and therefore attracts every subsequent tree. Checks, in order: (1) Are they reading training error or held-out error? Training error falling forever is expected. (2) Turn on early stopping against a validation set with a patience of around 50 rounds, so the tree count is a ceiling rather than a target. (3) Lower the learning rate, which makes the onset of overfitting later and gentler. (4) Cap tree depth and add row and column subsampling per round. (5) Check for label noise — if a chunk of labels is wrong, a bagged forest may simply be the better model for this data, since averaging dilutes an outlier that boosting chases.',
      isCaseBased: true,
    },
    {
      question: 'How does stacking work, and what is the one mistake that ruins it?',
      answer:
        'Stacking combines models of different kinds — say a random forest, a boosted model and a linear model — by training one small extra model, the meta-model, whose inputs are the base models\' predictions and whose output is the final answer. Rather than averaging the base models with equal weight, the meta-model learns how much to trust each one and in which regions. The mistake that ruins it is training the meta-model on predictions the base models made about rows they were trained on. Those predictions are unrealistically accurate, because the base models partly memorised those rows, so the meta-model learns to trust a level of accuracy that will not exist at prediction time and typically leans hard on whichever base model memorised hardest. The fix is out-of-fold predictions: split the training data into k parts and, for each part, predict it with base models trained on the other k-1. It is the same reasoning as out-of-bag scoring, applied deliberately. Keep the meta-model simple — a linear model is usually enough — because it has very few effective inputs.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'The one-line reason ensembles work', back: 'Models that are wrong in different places outvote each other\'s mistakes. Six emails, three filters at 4/6 each, each wrong on a different pair: the majority vote scores 6/6. If all three were wrong on the same two, the vote scores 4/6 and nothing was gained.' },
    { front: 'Bagging vs boosting', back: 'Bagging: models trained in parallel, each on its own bootstrap sample, combined by vote or average, base models deep, cuts variance. Boosting: models trained in sequence, each fitted to what the previous ones got wrong, combined by a shrunken sum, base models shallow, cuts bias.' },
    { front: 'Bootstrap sample and the 63% fact', back: 'n rows drawn from n rows with replacement. A given row is missed with chance (1 - 1/n)^n, which converges to 1/e = 0.368. Measured over 500 trials on 1000 rows: 0.3669 missed. So each tree sees about 63% of the distinct rows.' },
    { front: 'Out-of-bag score', back: 'Score each row using only the trees whose bootstrap sample left that row out. Gives an honest unseen-data estimate for free, no held-out set needed. Needs many trees: with only three, some rows are in every sample and go unscored.' },
    { front: 'Random Forest, precisely', back: 'Bagged decision trees PLUS feature subsampling: each split may only consider a random handful of features (about sqrt(d) for classification, d/3 for regression). Each tree gets slightly worse; the trees get far less alike, and that is what the vote needs.' },
    { front: 'One round of gradient boosting', back: 'y = 2, 4, 6, 9, 14. Start at the mean, 7.0. Residuals = -5, -3, -1, +2, +7. Fit a stump to THOSE: "x <= 3" gives -3.0 left, +4.5 right. Apply half (learning rate 0.5): predictions 5.5 and 9.25. New residuals -3.5, -1.5, 0.5, -0.25, 4.75; mean squared residual 17.6 -> 7.475.' },
    { front: 'AdaBoost weight update, with numbers', back: '5 rows at 0.2, 2 wrong. epsilon = 0.4. alpha = 0.5 x ln(0.6/0.4) = 0.2027. Wrong rows x e^alpha = 1.2247 -> 0.24495; right rows x e^-alpha = 0.8165 -> 0.1633. Total 0.9798, so divide through: wrong rows 0.25, right rows 0.1667.' },
    { front: 'Does more trees always help?', back: 'Bagging yes (it plateaus, never hurts). Boosting no. With one mislabelled row: training error fell 35.67 -> 1.23 over 30 rounds while true error bottomed at 6.50 in round 4 and rose to 17.00. Boosting chases the biggest residual and cannot tell a hard row from a wrong one. Use early stopping on held-out error.' },
  ],
  mindmapMarkdown: `- Ensembles
  - The six-email demonstration
    - truth 1 1 1 0 0 0
    - filters A, B, C each score 4/6 = 66.7%
    - each wrong on a DIFFERENT pair
    - majority vote scores 6/6
    - same mistakes = vote also 4/6, no gain
  - Vocabulary defined here
    - ensemble = models combined into one answer
    - weak learner = barely-better-than-guessing model
    - stump = decision tree of depth 1
    - variance = how much retraining changes the model
  - Bagging
    - bootstrap sample = n rows from n, with replacement
    - about 63% of rows present, 37% missed
    - trained in parallel, combined by vote or average
    - out-of-bag score = judge a row by trees that missed it
  - Random Forest
    - bagging + feature subsampling at every split
    - sqrt(d) features for classification, d/3 for regression
    - each tree worse, the trees far less alike
  - Boosting
    - trained in sequence, each fixing the leftovers
    - residual = truth minus current prediction
    - gradient boosting fits the next tree to the residuals
    - learning rate shrinks each correction, 0.5 in the example
    - worked round: mse 17.6 -> 7.475
  - AdaBoost
    - reweights rows instead of fitting leftovers
    - epsilon 0.4, alpha 0.2027
    - multipliers 1.2247 and 0.8165
    - renormalise to 0.25 wrong, 0.1667 right
  - Stacking
    - a meta-model learns how to weigh the base models
    - must be fed out-of-fold predictions or it is ruined
  - The classic mistake
    - one mislabelled row, 30 boosting rounds
    - training error 35.67 -> 1.23, always falling
    - true error 6.50 at round 4 -> 17.00 at round 30
    - fix: early stopping on held-out error
  - Beyond the basics
    - variance floor = rho x sigma squared
    - residual = negative slope of squared-error loss
    - XGBoost, LightGBM, CatBoost = speed and defaults`,
}

export default m
