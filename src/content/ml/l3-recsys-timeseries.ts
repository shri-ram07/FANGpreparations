import type { Module } from '../types'

const m: Module = {
  id: 'ml-l3-recsys-timeseries',
  subjectId: 'ml',
  level: 3,
  title: 'Recommendation Systems & Time-Series Basics',
  whyItMatters:
    'Two questions show up in almost every product: what should we show this person next, and what will this number be next week. This module builds both from nothing. You will fill in a missing rating in a five-by-five table with a calculator, and you will watch a forecast score 0.75 error one way and 2.5 the other way on the exact same data, because of one choice about how the test set was picked.',
  assumes: [
    'You have seen a Python list, a for loop, an if statement and a function',
    'You know what an average is, and what a square root is',
    'Read the Math module *Vectors & the Dot Product (= Similarity)* first — cosine similarity is built there, and used here',
    'No recommender or forecasting background is needed. Every term used here is defined here.',
  ],
  estMinutes: 48,
  sections: [
    {
      type: 'intuition',
      title: 'Five people, five films, some blanks',
      md: `Here is the whole starting point of recommendation, written out. Five people gave star ratings, 1 to 5, to five films. A dash means that person never rated that film.

- **Ana**: Heat 5, Speed 4, Amelie 1, Chungking –, Ronin 4
- **Bo**: Heat 4, Speed 5, Amelie –, Chungking 1, Ronin 4
- **Cal**: Heat 1, Speed –, Amelie 5, Chungking 4, Ronin 1
- **Dee**: Heat –, Speed 1, Amelie 4, Chungking 5, Ronin 2
- **Eve**: Heat 5, Speed –, Amelie 1, Chungking 1, Ronin 4

That grid has a name: the **user-item matrix**. Rows are people, columns are things, each cell is what that person did with that thing. Twenty of the twenty-five cells are filled here. Real ones are nowhere near that full — a shop with a million products and a million customers has maybe one cell in ten thousand filled. That emptiness has a name too: **sparsity**, the fraction of cells that are blank.

One concrete job for the rest of this half: **Eve has not rated Speed. Guess what she would give it.** We will finish that guess by hand.`,
    },
    {
      type: 'intuition',
      title: 'Two ways to fill a blank',
      md: `There are two completely different ways to guess Eve's missing number, and every real system is a mix of them.

- **Content-based filtering** looks at what the item *is*. Speed is an action film from 1994 starring Keanu Reeves. Eve rated another 1990s action film, Heat, a 5. So predict high. It uses only item descriptions, never other people.
- **Collaborative filtering** looks at what people *did*. It never opens the film, never reads a genre tag. It only sees the grid of numbers above and asks: which columns move together, or which rows look alike?
- Content-based can recommend a film uploaded five minutes ago, because a film has a genre the moment it exists. Collaborative filtering cannot — a brand-new film has an empty column.
- Collaborative filtering can find links no description would ever reveal, like crime readers reliably buying one particular cookbook. Content-based cannot, because nothing in the text connects them.
- The rest of this half does collaborative filtering, because it is the part with actual arithmetic in it.`,
    },
    {
      type: 'intuition',
      title: 'Two directions: user-user and item-item',
      md: `Collaborative filtering comes in two flavours, and they are the same idea pointed at rows or at columns.

- **User-user**: find people whose row of ratings looks like Eve's row, then recommend what those people liked and Eve has not seen. Ana and Eve rated Heat 5 and 4, Amelie 1 and 1, Ronin 4 and 4 — very similar rows. Ana gave Speed a 4, so predict Eve will like Speed.
- **Item-item**: find columns that move together. The Speed column and the Ronin column go up and down on the same people. Eve rated Ronin a 4, so predict she rates Speed near 4 too.
- Both reach the same answer here. Industry mostly ships item-item, for one plain reason: **item relationships hold still**. "People who buy a printer buy toner" is true this year and next year, so you can compute all the item-item numbers overnight and just look them up when a request arrives. A person's taste changes month to month, so user-user numbers go stale and have to be recomputed constantly.
- There are also usually far more users than items, so the item-item table is the smaller one to store.

We will do item-item, on columns.`,
    },
    {
      type: 'intuition',
      title: 'How alike are two columns? Cosine, by hand',
      md: `To compare two columns we need one number for "these move together". That number is **cosine similarity**, and you already built it in the Math module *Vectors & the Dot Product (= Similarity)*: multiply the two lists position by position, add up the products, then divide by the length of each list. It comes out near 1 when the two point the same way and near 0 when they have nothing in common.

Take the Speed column and the Ronin column, reading top to bottom (Ana, Bo, Cal, Dee, Eve). A blank becomes 0 — we will come back to why that choice is not innocent.

- Speed = 4, 5, 0, 1, 0. Ronin = 4, 4, 1, 2, 4.
- Multiply position by position and add: (4×4) + (5×4) + (0×1) + (1×2) + (0×4) = 16 + 20 + 0 + 2 + 0 = **38**.
- Length of Speed: square each number, add, take the square root. 16 + 25 + 0 + 1 + 0 = 42, and √42 = **6.481**.
- Length of Ronin: 16 + 16 + 1 + 4 + 16 = 53, and √53 = **7.280**.
- Divide: 38 ÷ (6.481 × 7.280) = 38 ÷ 47.18 = **0.805**.

0.805 out of a maximum of 1. Speed and Ronin are strongly linked, and no genre tag was involved — only the fact that the same people rated both highly.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 1: the table, and pulling out one column',
      code: `users = ['Ana', 'Bo', 'Cal', 'Dee', 'Eve']
items = ['Heat', 'Speed', 'Amelie', 'Chungking', 'Ronin']
R = [[5, 4, 1, 0, 4],
     [4, 5, 0, 1, 4],
     [1, 0, 5, 4, 1],
     [0, 1, 4, 5, 2],
     [5, 0, 1, 1, 4]]

def column(j):
    out = []
    for row in R:
        out.append(row[j])
    return out

print(column(1))
print(column(4))

# ---- real output ----
# [4, 5, 0, 1, 0]
# [4, 4, 1, 2, 4]`,
      annotations: {
        1: 'The five people, in row order. This list is only for printing names later; the numbers do the work.',
        2: 'The five films, in column order. items[1] is Speed, items[4] is Ronin. Remember Python counts from 0.',
        3: 'R is a list of lists: one inner list per person, five numbers each. This line is Ana\'s row: Heat 5, Speed 4, Amelie 1, Chungking blank, Ronin 4.',
        4: 'Bo\'s row. The 0 in position 2 is Bo\'s blank for Amelie, not a rating of zero.',
        5: 'Cal\'s row. Cal is the opposite kind of viewer: low on the action films, high on Amelie and Chungking.',
        6: 'Dee\'s row, also an arthouse viewer.',
        7: 'Eve\'s row. Position 1 (Speed) is the 0 we are going to replace with a prediction.',
        9: 'A function that pulls out column number j — that is, what all five people gave to one film.',
        10: 'Start with an empty list to collect into.',
        11: 'Walk the rows one at a time. Each row is one person\'s five numbers.',
        12: 'Take position j out of that person\'s row and add it to the collection. After five rows, out holds the whole column.',
        13: 'Hand the finished column back to whoever called the function.',
        15: 'column(1) is the Speed column. The printed [4, 5, 0, 1, 0] is exactly the list we used by hand above.',
        16: 'column(4) is the Ronin column, [4, 4, 1, 2, 4]. Same numbers as the hand calculation.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 2: cosine similarity, and every item compared to Speed',
      code: `def cosine(a, b):
    dot = 0.0
    la = 0.0
    lb = 0.0
    for i in range(len(a)):
        dot = dot + a[i] * b[i]
        la = la + a[i] * a[i]
        lb = lb + b[i] * b[i]
    return dot / ((la ** 0.5) * (lb ** 0.5))

speed = column(1)
for j in [0, 2, 3, 4]:
    print(items[j], round(cosine(speed, column(j)), 3))

# ---- real output ----
# Heat 0.754
# Amelie 0.188
# Chungking 0.235
# Ronin 0.805`,
      annotations: {
        1: 'Takes two equal-length lists of numbers and returns one similarity number between 0 and 1.',
        2: 'dot will collect the sum of the position-by-position products. Start at zero. Written 0.0 so the result stays a decimal.',
        3: 'la will collect the squares of the first list, on the way to its length.',
        4: 'lb does the same for the second list.',
        5: 'range(len(a)) gives 0, 1, 2, 3, 4 — one step per person in the column.',
        6: 'Add this person\'s contribution to the product sum. After five passes this is the 38 we computed by hand.',
        7: 'Add this person\'s squared value for list a. After five passes this is 42.',
        8: 'Same for list b. After five passes this is 53.',
        9: '** 0.5 is a square root: 42 ** 0.5 is 6.481. Divide the product sum by the two lengths multiplied together, and that is cosine similarity.',
        11: 'Grab the Speed column once, so we do not rebuild it inside the loop.',
        12: 'Loop over the other four columns: 0 Heat, 2 Amelie, 3 Chungking, 4 Ronin. We skip 1 because comparing Speed with itself always gives 1 and tells us nothing.',
        13: 'round(x, 3) keeps three decimals so the output is readable. Ronin 0.805 matches the hand calculation exactly, and the two arthouse films score near zero.',
      },
    },
    {
      type: 'intuition',
      title: 'Worked case: filling in Eve\'s blank by hand',
      md: `Now use those four similarity numbers. The rule is a **weighted average**: take each film Eve *did* rate, weight her rating by how similar that film is to Speed, and divide by the total weight. Films close to Speed get a loud vote, films unlike Speed get a quiet one.

Eve's ratings, paired with each film's similarity to Speed:

- Heat: rating 5, similarity 0.754 → 5 × 0.754 = 3.770
- Amelie: rating 1, similarity 0.188 → 1 × 0.188 = 0.188
- Chungking: rating 1, similarity 0.235 → 1 × 0.235 = 0.235
- Ronin: rating 4, similarity 0.805 → 4 × 0.805 = 3.220

Add the products: 3.770 + 0.188 + 0.235 + 3.220 = **7.415**. Add the weights: 0.754 + 0.188 + 0.235 + 0.805 = **1.983**. Divide: 7.415 ÷ 1.983 = **3.74**.

So the system predicts Eve would give Speed about 3.7 stars, and Speed goes on her list. Sanity check the number: Eve's two loud votes were Heat at 5 and Ronin at 4, so an answer between 4 and 5 pulled down a little by two quiet 1s is exactly where it should land. If the weighted average had come out at 4.9 or 1.2, something would be wrong with the arithmetic.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 3: the same weighted average in code',
      code: `eve = 4
num = 0.0
den = 0.0
for j in [0, 2, 3, 4]:
    s = cosine(speed, column(j))
    num = num + s * R[eve][j]
    den = den + s
print(round(num, 3), round(den, 3))
print('predicted rating for Eve on Speed:', round(num / den, 2))

# ---- real output ----
# 7.415 1.983
# predicted rating for Eve on Speed: 3.74`,
      annotations: {
        1: 'Eve is row 4 of R (rows go 0 Ana, 1 Bo, 2 Cal, 3 Dee, 4 Eve).',
        2: 'num will collect the top of the fraction: each rating multiplied by its similarity.',
        3: 'den will collect the bottom: the similarities on their own.',
        4: 'The four films Eve actually rated. Speed, column 1, is the blank we are filling.',
        5: 'How similar this film is to Speed — the same function and the same numbers as part 2.',
        6: 'R[eve][j] is Eve\'s rating of film j. Multiply it by the similarity and add it to the top of the fraction.',
        7: 'Add the bare similarity to the bottom of the fraction. Dividing by this total is what keeps the answer on the 1-to-5 scale.',
        8: 'The printed 7.415 and 1.983 are the two hand-computed totals, matching to three decimals.',
        9: '7.415 divided by 1.983 is 3.74 — the prediction. That is the complete item-item recommender: one similarity function and one weighted average.',
      },
    },
    {
      type: 'note',
      md: `**The 0 we quietly told a lie with.** We put 0 in every blank cell, so a film nobody rated looks like a film everybody hated. That is the difference between two kinds of data. **Explicit feedback** is a rating the person deliberately gave: stars, thumbs up. It is clean but rare — most people never rate anything. **Implicit feedback** is what the system watched them do: clicks, watch time, add-to-cart. It is everywhere and free, but it has no negatives. A film you did not click might be one you hated or one you never scrolled past, and no amount of data will separate those two. Real systems subtract each user\'s average rating before comparing columns, or weight unrated cells as weak, low-confidence negatives. Both are patches on the same hole.`,
    },
    {
      type: 'intuition',
      title: 'Cold start: the case with no numbers at all',
      md: `**Cold start** is the situation where collaborative filtering has nothing to work with, because a row or a column is empty.

- **New user.** Someone signs up this second. Their row is blank, so no similar row exists and no weighted average can be computed.
- **New item.** A film is added today. Its column is blank, so it is similar to nothing and can never be recommended — which means it never gets rated, which means its column stays blank. It is stuck.
- The standard answers, in the order you would ship them: show popular items to a new user, ask them to tap three interests during signup, use content features (genre, description, image) so a new item is reachable on day one, and deliberately show unproven items to a small slice of traffic so they can earn some data.
- That last one matters more than it looks. If you only ever show what already has ratings, cold start is permanent by construction.`,
    },
    {
      type: 'intuition',
      title: 'Matrix factorisation, in plain words',
      md: `The weighted average above compared columns directly. That gets slow and noisy when the table is a million by a million and almost entirely blank. **Matrix factorisation** is the standard fix, and the whole idea fits in three lines.

- Give every user a short list of numbers — say 20 of them — and every item its own short list of 20 numbers.
- To predict a rating, multiply the user's 20 numbers by the item's 20 numbers position by position and add them up. That is the dot product again, the same operation as in the cosine above without the dividing step.
- Choose all those numbers so that, on the cells you *do* know, the dot product comes out close to the real rating. That fitting is ordinary gradient descent, the same procedure as any other model you have trained.

Nobody decides what the 20 numbers mean. After training, one of them often turns out to track something like "gritty versus gentle" and another "old versus new", but that is discovered, not designed. One rule you should say out loud: the fitting only ever looks at the filled cells. Feed it the blanks as zeros and you teach it that everything unwatched is hated.`,
    },
    {
      type: 'intuition',
      title: 'How you score a recommender',
      md: `The obvious score is: how far off were the predicted ratings? Eve's predicted 3.74 versus whatever she really gives Speed. That is a bad score, for one concrete reason.

- Eve is shown a **list of ten films**. She never sees a predicted rating. Being right about 3.74 versus 3.9 on a film that never appears on her screen earns nothing.
- What matters is which items reached the top of the list. So the scores to use are the ranking ones: how many of the ten shown were actually good, and whether the good ones landed near the top rather than at position ten.
- Those are built properly in the Metrics module *Ranking Metrics: Precision@K, MAP & NDCG*. Go there for the definitions and the arithmetic; the only sentence to carry back here is that rating accuracy and ranking quality are different things, and the product only feels the second one.
- Two more numbers worth tracking that no accuracy score contains: how much of the catalogue ever gets shown to anybody, and how varied one list is. A system that recommends the same fifty blockbusters forever can look excellent on every offline number.`,
    },
    {
      type: 'intuition',
      title: 'Switching topics: what a time series is',
      md: `Second half, fresh start. A **time series** is a list of numbers where each one is stamped with a time, and the order is part of the data. Here are twelve days of sales from a small shop:

**10, 12, 14, 16, 18, 21, 23, 25, 28, 30, 32, 35** — day 1 through day 12.

- The **trend** is the slow direction the numbers are drifting. Here it is upward, roughly +2.3 per day on average: from 10 to 35 across eleven steps is 25 ÷ 11.
- **Seasonality** is a pattern that repeats on a fixed clock: higher every Saturday, higher every December, higher every day at lunchtime. It is not "sometimes it goes up" — it is a repeat with a known period. This twelve-day series is too short to show one, but real daily sales almost always have a weekly one.
- Whatever is left after removing the trend and the repeating pattern is the leftover wobble: one-off promotions, an outage, plain noise.
- The one thing that makes this data different from every other table you have modelled: the rows are **not interchangeable**. Shuffle the rows of a table of house prices and nothing is lost. Shuffle these twelve numbers and the trend is gone, because the trend was entirely in the order.`,
    },
    {
      type: 'intuition',
      title: 'Turning time into ordinary columns: lags and rolling averages',
      md: `Normal models want a row of features and an answer. Time series gives you one long line of numbers. The bridge between them is two ideas.

- A **lag feature** is just yesterday's value written into today's row. lag1 for day 5 is the value from day 4. lag7 would be the value from the same weekday last week — that is how you hand a weekly pattern to a model that has no idea what a week is.
- A **rolling average** (also called a moving average) is the average of the last few values. A 3-day rolling average for day 5 is the mean of days 2, 3 and 4. It smooths out the wobble so the model sees the level rather than the noise.
- The rule that makes or breaks both: **the window must end yesterday**. A 3-day average for day 5 that includes day 5 itself has put part of the answer into the question. Most library functions include the current row by default, so this is a mistake that is one forgotten argument away.
- Cost: the first rows have no history. Day 1 has no yesterday, so lag1 is blank there, and a 3-day average is blank until day 4. Every lag you add eats a bit more of the start of your data.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Building a lag and a rolling average, with the blanks visible',
      code: `sales = [10, 12, 14, 16, 18, 21, 23]

for t in range(len(sales)):
    if t == 0:
        lag1 = None
    else:
        lag1 = sales[t - 1]
    if t < 3:
        roll3 = None
    else:
        roll3 = round((sales[t - 3] + sales[t - 2] + sales[t - 1]) / 3, 2)
    print('day', t + 1, 'y', sales[t], 'lag1', lag1, 'roll3', roll3)

# ---- real output ----
# day 1 y 10 lag1 None roll3 None
# day 2 y 12 lag1 10 roll3 None
# day 3 y 14 lag1 12 roll3 None
# day 4 y 16 lag1 14 roll3 12.0
# day 5 y 18 lag1 16 roll3 14.0
# day 6 y 21 lag1 18 roll3 16.0
# day 7 y 23 lag1 21 roll3 18.33`,
      annotations: {
        1: 'The first seven days of the shop\'s sales. Position 0 is day 1.',
        3: 'Walk through the days in order. t is the position in the list, so day number is t + 1.',
        4: 'Day 1 is the special case: there is no day before it.',
        5: 'None is Python for "no value here". It marks the blank honestly instead of inventing a number.',
        6: 'Every other day takes the else branch.',
        7: 'sales[t - 1] is yesterday. That single subtraction is the entire lag-1 feature.',
        8: 'The 3-day average needs three earlier days, so days 1, 2 and 3 cannot have one.',
        9: 'Blank again, for the same reason.',
        10: 'From day 4 onwards there is enough history, so this branch runs.',
        11: 'Days t-3, t-2 and t-1: the three days BEFORE today. Today, sales[t], is deliberately not in there — it is the number we are trying to predict. round(x, 2) trims the decimals for printing.',
        12: 'Print one row per day. Day 4 shows roll3 12.0, which is the mean of 10, 12 and 14 — days 1 to 3 only, exactly as intended.',
      },
    },
    {
      type: 'intuition',
      title: 'Before any model: what does "same as yesterday" score?',
      md: `Forecasting has a baseline so strong it embarrasses people, and it costs one line of code: **predict that today equals yesterday**. For a series with a weekly pattern the sibling baseline is "predict last week's same weekday".

To compare anything we need a way to say how wrong a forecast is. Use **MAE**, mean absolute error: for each day, take the gap between prediction and truth, drop the minus sign, and average. MAE 2.5 means "wrong by about 2.5 units per day".

Do one day by hand on the full twelve-day series. Day 2 truly sold 12; "same as yesterday" predicts day 1's 10; the gap is 2. Day 3 sold 14, prediction 12, gap 2. Day 6 sold 21, prediction 18, gap 3. Average all eleven such gaps and you get the number the next snippet prints. Remember it, because every fancier model has to beat it.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The naive baseline: today equals yesterday',
      code: `sales = [10, 12, 14, 16, 18, 21, 23, 25, 28, 30, 32, 35]

err = 0.0
for i in range(1, 12):
    err = err + abs(sales[i] - sales[i - 1])
print('naive MAE, all 11 days:', round(err / 11, 2))

err = 0.0
for i in [8, 9, 10, 11]:
    err = err + abs(sales[i] - sales[i - 1])
print('naive MAE, last 4 days:', round(err / 4, 2))

# ---- real output ----
# naive MAE, all 11 days: 2.27
# naive MAE, last 4 days: 2.5`,
      annotations: {
        1: 'All twelve days. Position 0 is day 1, position 11 is day 12.',
        3: 'A running total of the errors, starting at zero.',
        4: 'Start at 1, not 0: day 1 has no yesterday to predict from. range(1, 12) gives 1 through 11.',
        5: 'sales[i - 1] is the prediction and sales[i] is the truth. abs() drops the minus sign so an over-forecast and an under-forecast count the same.',
        6: 'Eleven predictions were made, so divide by 11. The answer is 2.27.',
        8: 'Reset the total to score a smaller stretch.',
        9: 'Positions 8 to 11 are days 9 to 12 — the last four days, which the split experiment below will use as its test set.',
        10: 'Same calculation, restricted to those four days.',
        11: 'Divide by 4. The baseline is wrong by 2.5 units per day on that stretch. This is the number to beat.',
      },
    },
    {
      type: 'intuition',
      title: 'Now the one rule that outranks the model',
      md: `Here is the rule: **never let a model see the future while you are testing it, and never shuffle a time series to make a test set.** People nod at this and then do it anyway, because the shuffled version gives a better score and better scores feel like progress.

We are going to walk into it deliberately with a real number attached.

The "model" for this experiment is deliberately simple, so nothing is hidden: to predict a day, look at the training days around it, take the nearest one before and the nearest one after, and average them. If there is no training day after, use the nearest one before. That is a straight-line guess between known points.

Then score it twice on the same twelve days, changing only which four days are the test set:

- **Shuffled split** — pick four days at random. Say days 5, 8, 10 and 11. The other eight are training data.
- **Time-ordered split** — the test set is the last four days, 9 to 12, and training is everything strictly before each one.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The predictor: nearest training day before and after',
      code: `def predict(i, train):
    before = []
    after = []
    for t in train:
        if t < i:
            before.append(t)
        if t > i:
            after.append(t)
    if before and after:
        return (sales[before[-1]] + sales[after[0]]) / 2
    return sales[before[-1]]

print(predict(8, [0, 1, 2, 3, 4, 5, 6, 7]))
print(predict(8, [0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11]))

# ---- real output ----
# 25
# 27.5`,
      annotations: {
        1: 'i is the position we want a prediction for. train is the list of positions the model is allowed to look at.',
        2: 'Collects training days that come before day i.',
        3: 'Collects training days that come after day i.',
        4: 'Check every allowed training day one at a time.',
        5: 'Earlier than the day we are predicting?',
        6: 'Then it goes in the before pile.',
        7: 'Later than the day we are predicting?',
        8: 'Then it goes in the after pile. Whether this pile ever fills up is the entire experiment.',
        9: 'If we have neighbours on both sides, we can interpolate — guess a point between two known points.',
        10: 'before[-1] is the last item of the before list, so the closest earlier day. after[0] is the closest later day. Average the two sales figures.',
        11: 'No later neighbour available, so the best we can do is carry the most recent known value forward. This is the honest situation in forecasting: the future has no right-hand neighbour.',
        13: 'Predicting day 9 (position 8) with only past days allowed: it carries forward day 8\'s 25.',
        14: 'The same day 9, but now days 10, 11 and 12 are in the training set. It averages day 8\'s 25 and day 10\'s 30 to get 27.5 — using two days that had not happened yet.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Score 1: the shuffled split',
      code: `test = [4, 7, 9, 10]
train = [0, 1, 2, 3, 5, 6, 8, 11]
total = 0.0
for i in test:
    p = predict(i, train)
    total = total + abs(p - sales[i])
    print('day', i + 1, 'true', sales[i], 'pred', p)
print('shuffled-split MAE:', round(total / 4, 2))

# ---- real output ----
# day 5 true 18 pred 18.5
# day 8 true 25 pred 25.5
# day 10 true 30 pred 31.5
# day 11 true 32 pred 31.5
# shuffled-split MAE: 0.75`,
      annotations: {
        1: 'The four test positions, 4, 7, 9 and 10, which are days 5, 8, 10 and 11 — as a random draw might well produce.',
        2: 'Everything else is training data, including day 12 at position 11, which happens after three of the four test days.',
        3: 'Running total of absolute errors.',
        4: 'Score one test day at a time.',
        5: 'Ask the predictor for this day, with the shuffled training set.',
        6: 'Add the size of the miss to the total.',
        7: 'Print the day, the truth and the prediction so the misses are visible individually.',
        8: 'Divide by 4 test days. MAE 0.75 — three times better than the naive baseline\'s 2.5. Look at the per-day lines to see how: day 10 is predicted as the average of days 9 and 11, both of which the model was handed.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Score 2: the time-ordered split, same model, same data',
      code: `total = 0.0
for i in [8, 9, 10, 11]:
    train = list(range(i))
    p = predict(i, train)
    total = total + abs(p - sales[i])
    print('day', i + 1, 'true', sales[i], 'pred', p)
print('time-ordered MAE:', round(total / 4, 2))

# ---- real output ----
# day 9 true 28 pred 25
# day 10 true 30 pred 28
# day 11 true 32 pred 30
# day 12 true 35 pred 32
# time-ordered MAE: 2.5`,
      annotations: {
        1: 'Fresh error total.',
        2: 'Test on days 9, 10, 11 and 12 — positions 8 to 11, the end of the series.',
        3: 'list(range(i)) is every position strictly before i. Predicting day 10 means training on days 1 to 9 and nothing later. This one line is the whole difference from the previous snippet.',
        4: 'Same predictor function, unchanged.',
        5: 'Same error accumulation, unchanged.',
        6: 'Same printing, unchanged.',
        7: 'MAE 2.5. The identical model on the identical data scored 0.75 a moment ago. And 2.5 is exactly the naive baseline\'s score on these four days, because with no future neighbour available the predictor can only carry yesterday forward.',
      },
    },
    {
      type: 'intuition',
      title: 'The classic mistake, diagnosed',
      md: `Two scores, one model, one dataset: **0.75 and 2.5**. Only the choice of test set changed. The first number is not a better result. It is not a result at all.

- Look at the shuffled run\'s day 10: true 30, predicted 31.5. That 31.5 is the average of day 9\'s 28 and day 11\'s 32. To make that prediction the model read day 11 — a day that, in production, has not happened yet.
- Every shuffled test day sat in a hole surrounded by known days on both sides. The model was never forecasting. It was **interpolating**: filling a gap between two facts. That is an easy job, and it is not the job.
- In the time-ordered run, day 12 has nothing after it, ever. The model must **extrapolate**: continue past the end of what it knows. That is the hard job, and it is the only one production ever asks for.
- The damage is not that the score is a bit optimistic. The damage is that you would have shipped this thing believing it was three times better than "same as yesterday", when it is exactly as good as "same as yesterday" and not one unit better.
- The general form of the same mistake: any feature computed with numbers you will not have on the morning you make the prediction. A rolling average that includes today. A monthly total on a row from the middle of that month. Tomorrow's actual price used to forecast tomorrow's demand.
- The test that catches all of them is one question per column: *on the morning I make this prediction, do I physically have this number yet?* If the answer is no, lag it or drop it.

The fix for the split itself is the **expanding window**: train on days 1 to 8, test day 9; train on 1 to 9, test day 10; and so on. That is exactly what the second snippet did, one line of it. If your rolling features look back seven days, leave a seven-day gap between the end of training and the start of the test, or the last training rows and the first test rows share days.`,
    },
    {
      type: 'intuition',
      title: 'Two more words you will hear: stationary and autocorrelation',
      md: `Both are simpler than they sound, and both are about the same thing — whether the past still describes the present.

- A series is **stationary** when its behaviour does not depend on *when* you look: the average stays put, the size of the wobble stays put. Our sales series is not stationary, because it drifts from 10 up to 35, so the average of the first half is nothing like the average of the second half.
- Why anyone cares: a model learns from the past and applies it to the future. If the past had an average of 12 and the future has an average of 33, whatever it learned is about the wrong world. Tree-based models are especially blunt about this — they can only ever output values they saw in training, so a genuinely rising series will be permanently under-forecast.
- The usual fix is **differencing**: instead of modelling the sales, model the *change* in sales. Our series in changes is 2, 2, 2, 2, 3, 2, 2, 3, 2, 2, 3 — a series that stays put around 2.3 with no drift. Model that, then add the last known level back at the end.
- **Autocorrelation** is how much a series resembles a shifted copy of itself. Slide the series one day and compare: on our data yesterday predicts today very well, so autocorrelation at lag 1 is high. Slide it seven days on real daily sales and if that also comes out high, there is a weekly cycle — which tells you to build a lag-7 feature. That is all the diagnosis is for: it tells you which lags are worth turning into columns.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work each one on paper before reading the solution underneath it. All the numbers come from the two datasets in this module.

**1.** Using the five-by-five ratings table, compute the cosine similarity between the Heat column (5, 4, 1, 0, 5) and the Amelie column (1, 0, 5, 4, 1). Say in one sentence what the answer means.

**2.** Eve rates a sixth film, Ronin 2 instead of 4 (everything else unchanged), but the similarities stay as printed. Redo the weighted average for Speed. Which direction does the prediction move, and why?

**3.** You have three years of daily website visits and you split it with random 5-fold cross-validation. Name what goes wrong, then give the split you would use instead.

**4.** A colleague builds a 7-day rolling average feature using a window centred on day t — that is, days t-3 through t+3 — and reports the best backtest score the team has ever seen. What is wrong, and what one change fixes it?

**5.** On the twelve-day sales series, a new model scores MAE 2.4 on the last four days. Should you ship it?`,
    },
    {
      type: 'note',
      md: `**Solution 1.** Products: (5×1) + (4×0) + (1×5) + (0×4) + (5×1) = 5 + 0 + 5 + 0 + 5 = 15. Length of Heat: 25 + 16 + 1 + 0 + 25 = 67, √67 = 8.185. Length of Amelie: 1 + 0 + 25 + 16 + 1 = 43, √43 = 6.557. 15 ÷ (8.185 × 6.557) = 15 ÷ 53.67 = **0.280**. Low. The people who rate Heat highly are not the people who rate Amelie highly, so knowing someone liked Heat says almost nothing about Amelie.

**Solution 2.** Only the Ronin term changes: 2 × 0.805 = 1.610 instead of 3.220. New top: 3.770 + 0.188 + 0.235 + 1.610 = 5.803. The bottom is unchanged at 1.983. 5.803 ÷ 1.983 = **2.93**. The prediction drops by about 0.8, because Ronin is Speed\'s closest neighbour at 0.805 and it now carries a low rating — the loudest vote changed its mind.

**Solution 3.** Random folds put later days into training and earlier days into the test set, so the model interpolates inside known time instead of extrapolating past the end of it. The score will look far better than production ever will — the 0.75-versus-2.5 gap in this module is exactly that effect. Use an expanding window instead: train on months 1 to 12 and test month 13, then train on 1 to 13 and test 14, and average the errors.

**Solution 4.** A window centred on day t contains days t+1, t+2 and t+3, which do not exist when the prediction for day t is made. The feature is built out of the answer, so the backtest is fiction. Fix: end the window at t-1 — a trailing 7-day average over days t-7 through t-1. In most libraries the default window includes the current row, so shift it back by one.

**Solution 5.** No. The naive "same as yesterday" baseline scores 2.5 on those four days, so the new model buys 0.1 units per day of accuracy for however much complexity it added. Also, four test days is far too small a sample to distinguish 2.4 from 2.5 — a single day going the other way flips the ranking. Run it across many more test windows before believing the difference exists.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. This part is context for later.

- **Why real systems have two stages.** A catalogue of ten million items and a 100 millisecond budget cannot afford a good model per item. So stage one, *retrieval*, cuts millions down to a few hundred with something very cheap (dot products against precomputed item vectors, plus lists like "trending" and "your subscriptions"). Stage two, *ranking*, spends real money scoring those few hundred. The frames below step through the arithmetic.
- **Retrieval sets the ceiling.** An item stage one never fetches can never be shown, so it never earns the interactions that would have made it fetchable. That loop is why systems reserve a slot for something unproven.
- **Popularity bias.** The blockbuster co-occurs with everything, so it is similar to everything, so it is recommended to everyone, which makes it co-occur with even more. Left alone, item-item recommends the same fifty things to the whole planet.
- **ARIMA** is the classical forecasting model: it predicts today from a few past values, a few past errors, and however many rounds of differencing it took to make the series stationary. Worth reaching for when you have one series, a decent length of history and someone who needs honest uncertainty bands.
- **Prophet** (from Meta) fits a trend plus repeating seasonal patterns plus a holiday calendar, with defaults that work without tuning. Useful for business series driven by the human calendar.
- **What usually wins on business data** is neither: build lag, rolling and calendar columns as in this module and hand them to gradient boosting. It handles thousands of series at once plus extra columns like price and promotions. Its weakness is the one named above — a tree cannot predict outside the range it saw, so difference the target when growth is real.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One recommendation request, stage by stage',
        notice:
          'Left column = the work being done and its time budget. Right column = how many items are still in the running at that point.',
        leftLabel: 'stage / budget',
        rightLabel: 'items still in play',
        frames: [
          {
            note: 'The request arrives. Ten million items in the catalogue, and about 100 milliseconds before the page feels slow. The good ranking model costs roughly 1 millisecond per item, so scoring everything would take about three hours. That single number is why two stages exist.',
            stack: [
              { name: 'user request', value: 'budget: ~100 ms', to: 'cat' },
              { name: 'ranker cost', value: '~1 ms / item' },
            ],
            heap: [{ id: 'cat', value: '10,000,000 items', label: 'full catalogue' }],
          },
          {
            note: 'Stage 1, retrieval. Cheap operations only: dot products of the user vector against precomputed item vectors, plus a few hand-built lists. Nothing here is clever. It only has to be fast and to avoid throwing away the good items.',
            stack: [
              { name: 'user vector', value: '128 numbers', to: 'cand' },
              { name: 'nearest-vector lookup', value: 'top ~300' },
              { name: 'subscriptions', value: '~100' },
              { name: 'trending / fresh', value: '~100' },
            ],
            heap: [
              { id: 'cat', value: '10,000,000 items', label: 'never scored one by one', freed: true },
              { id: 'cand', value: '~500 candidates', label: 'stage 1 output, ~10 ms' },
            ],
          },
          {
            note: 'Stage 2, ranking, then the policy rules. A heavy model scores 500 pairs with hundreds of features each, predicting several things at once. Then sort, drop duplicates, cap how many come from one creator, keep one slot for something unproven, and render ten.',
            stack: [
              { name: 'pairs to score', value: '~500', to: 'shown' },
              { name: 'model', value: '~50 ms' },
              { name: 'diversity + exploration', value: 'rules on top' },
            ],
            heap: [{ id: 'shown', value: '10 items on screen', label: '~100 ms end to end' }],
          },
        ],
      },
    },
  ],
  quiz: [
    {
      question: 'The Speed column is (4, 5, 0, 1, 0) and the Ronin column is (4, 4, 1, 2, 4). Their cosine similarity is 0.805. What does that number mean?',
      options: [
        {
          text: 'The same people rated both films highly, so knowing someone liked one is good evidence they will like the other',
          explanation: 'Correct. Cosine near 1 means the two columns rise and fall on the same people. No genre tag or description was involved — only behaviour.',
        },
        {
          text: '80.5% of the people who watched Speed also watched Ronin',
          explanation: 'Cosine is not a percentage of shared viewers. It compares the whole pattern of ratings, including how high they were, not just whether an overlap exists.',
        },
        {
          text: 'The two films share 80.5% of their genre tags',
          explanation: 'No item features are used anywhere in this calculation. The inputs are two columns of ratings.',
        },
      ],
      correct: 0,
    },
    {
      question: 'A film is uploaded today, with zero ratings. Which approach can recommend it right now?',
      options: [
        {
          text: 'Item-item collaborative filtering',
          explanation: 'Its column is entirely blank, so its cosine similarity with every other column is zero. It cannot appear in anyone\'s weighted average.',
        },
        {
          text: 'Content-based, using its genre, cast and description',
          explanation: 'Correct. Those features exist the moment the film does, so the film is reachable before anyone has rated it. This is exactly why real systems keep both methods.',
        },
        {
          text: 'Matrix factorisation on the ratings table',
          explanation: 'The item\'s short list of numbers is learned from its ratings. No ratings, nothing to learn from — the same wall as item-item.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Why do large systems compute item-item similarities rather than user-user?',
      options: [
        {
          text: 'Item-item needs less data',
          explanation: 'Both read the same table of interactions. Data volume is not the difference.',
        },
        {
          text: 'Item relationships barely change, so they can be computed overnight and looked up instantly, while a person\'s taste drifts and would need constant recomputation',
          explanation: 'Correct. "Printer buyers buy toner" holds for years. There are usually far more users than items too, so the item-item table is the smaller one to keep.',
        },
        {
          text: 'User-user cannot work with implicit feedback',
          explanation: 'Both directions work on implicit data. That is not the distinguishing issue.',
        },
      ],
      correct: 1,
    },
    {
      question: 'In the weighted average that predicted 3.74 for Eve, what job is the denominator (the sum of similarities, 1.983) doing?',
      options: [
        {
          text: 'It keeps the answer on the 1-to-5 rating scale',
          explanation: 'Correct. The numerator is ratings multiplied by weights, so it is inflated by the weights. Dividing by the total weight turns it back into an average, which lands in the same range as the ratings themselves.',
        },
        {
          text: 'It counts how many films Eve rated',
          explanation: 'That count is 4. The denominator is 1.983, the sum of the four similarity values, not a count.',
        },
        {
          text: 'It converts the prediction into a probability',
          explanation: 'Nothing here is a probability. The output is a predicted star rating.',
        },
      ],
      correct: 0,
    },
    {
      question: 'The interpolating predictor scored MAE 0.75 on a shuffled split and 2.5 on a time-ordered split of the same twelve days. What is the correct reading?',
      options: [
        {
          text: 'The model is genuinely better on the shuffled days; those days are just easier',
          explanation: 'The days are not intrinsically easier. Day 10 appears in both runs. What changed is that the shuffled run handed the model day 11, which had not happened yet.',
        },
        {
          text: '2.5 is the honest score, and 0.75 came from letting the model average two days that surround the test day — including one from the future',
          explanation: 'Correct. The shuffled split turned forecasting into filling a gap between two known points. Production always asks for the harder job: continuing past the end of what is known.',
        },
        {
          text: 'The 2.5 run is under-trained because it used fewer training days',
          explanation: 'Training size is not the cause. Even with all eleven earlier days available, no later neighbour exists for the final day — and the later neighbours are what produced the 0.75.',
        },
      ],
      correct: 1,
    },
    {
      question: 'A 3-day rolling average feature for day t is computed over days t-1, t and t+1. What is wrong?',
      options: [
        {
          text: 'Nothing — a centred window is smoother and therefore a better feature',
          explanation: 'Smoothness is cosmetic. Whether the numbers exist at prediction time is a matter of correctness.',
        },
        {
          text: 'The window is too short to be useful',
          explanation: 'Window length is a tuning choice, not the defect here. The defect would remain at any length.',
        },
        {
          text: 'It uses day t itself and day t+1, neither of which is known when the prediction for day t is made',
          explanation: 'Correct. Day t is the answer and day t+1 has not happened. The window must end at t-1. Library rolling functions include the current row by default, so shift the result back by one.',
        },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain content-based and collaborative filtering, and say when you would pick each.',
      answer:
        'Content-based works from what the item is: describe every item with features such as genre, text or category, build a profile of a user by averaging the items they liked, and recommend nearby items. Collaborative filtering works only from behaviour: a table of users by items, no item features at all, and it recommends by finding rows or columns that move together. Pick content-based when item descriptions are rich and new items or new users dominate the problem, such as news or a fresh catalogue. Pick collaborative filtering when you have interaction volume and want links no description encodes. The failure modes are the reason real systems use both: content-based only ever recommends more of the same and is capped by metadata quality, while collaborative filtering is blind to any item or user with an empty row or column.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through predicting one missing rating with item-item collaborative filtering.',
      answer:
        'Take the item you want a prediction for and pull out its column of ratings. For every other item, pull out its column and compute the cosine similarity between the two: multiply position by position, sum, divide by the two lengths. That gives one number per item saying how much it moves with the target item. Then take the items this particular user has actually rated, and compute a weighted average of their ratings using those similarities as the weights: sum of rating times similarity, divided by sum of similarity. Concretely, with similarities 0.754, 0.188, 0.235 and 0.805 against ratings 5, 1, 1 and 4, that is 7.415 divided by 1.983, which is 3.74. Two details worth stating: you normally subtract each user\'s average rating before comparing, so a generous rater and a harsh one are comparable, and you usually keep only the top few neighbours rather than all of them, since low-similarity items add noise.',
      isCaseBased: false,
    },
    {
      question: 'Case: you are launching recommendations for a new product line. Zero interactions, 50,000 items with titles, images and categories. Design day 0, week 1, and month 3.',
      answer:
        'Day 0 there is no behavioural signal, so do not pretend there is. Ship two things: a best-seller or popularity fallback segmented by whatever context exists (category page, country, referrer), and content-based similarity built from the title text, image and category, which gives "similar items" and "because you viewed this" without any history. Add a short onboarding that asks for a few interests if the product allows it. Week 1: use the session itself — what the person has viewed or put in the basket right now — and start accumulating co-view counts, which build up far faster than co-purchase counts. Reserve a slice of traffic for unproven items, or the cold ones stay cold permanently. Month 3: item-item collaborative filtering on real co-purchase data, then matrix factorisation once the table is dense enough, while keeping content features as a permanent source so every new item is still reachable on its first day. On measurement: you cannot A/B against nothing on day 0, so agree the target metric, such as add-to-cart rate from the recommendation module, and instrument it before launch. Worth stating as an assumption: 50,000 items is small enough that a single retrieval stage is fine — do not build a two-stage system until latency forces it.',
      isCaseBased: true,
    },
    {
      question: 'Explicit versus implicit feedback: which do you build on, and what does it cost you?',
      answer:
        'Build on implicit feedback — clicks, watch time, add-to-cart — because explicit ratings are rare, slow, and biased toward people with strong opinions, while implicit signals are produced by every session for free. The costs are real and you should name them. First, there is no negative signal: an item a user did not click may have been rejected or may never have been shown, and no amount of data separates those, so you either weight unobserved items as weak low-confidence negatives or sample negatives during training. Second, position bias: the item shown at the top gets clicked partly because it was at the top, so training naively on logs teaches the model to reproduce whatever the previous system showed. Third, calibration: ten seconds of a ten-second clip is a success and ten seconds of a two-hour film is a rejection, so normalise by item length or you build a machine that recommends short things.',
      isCaseBased: false,
    },
    {
      question: 'Why is average rating error the wrong score for a recommender, and what would you use?',
      answer:
        'Because the product shows a short ranked list and nobody ever sees a predicted rating. Rating error spends its budget being precise about items that will never appear on screen, and it treats an error at position one exactly like an error at position 500. What matters is which items reached the top, so use ranking measures: how many of the shown items were relevant, and a position-weighted version that rewards putting the good ones first. Add measures the accuracy number cannot contain: how much of the catalogue ever gets shown, and how varied a single list is — a system that shows the same fifty popular items forever scores well on accuracy and slowly kills the catalogue. Finally, treat offline numbers as a gate rather than the decision, because they are computed on logs generated by the previous system and cannot tell you what would have happened with items it never showed.',
      isCaseBased: false,
    },
    {
      question: 'Case: your new ranker improves the offline ranking score by 8%, but the A/B test shows watch time down 3%. Debug it.',
      answer:
        'Start by listing hypotheses with a test for each. One, objective mismatch: the offline score was computed against clicks while the business cares about watch time, so the model may have learned clickbait. Test by splitting click-through rate against completion rate — clicks up and completions down confirms it. Two, the offline set only contains items the old system chose to show, so the new ranker is being judged on the old one\'s candidates and its genuinely novel picks are unmeasurable. Test with an interleaving experiment that mixes both rankers in one list. Three, diversity collapse: a sharper ranker often piles onto one topic, so measure how many distinct creators or categories appear per list before and after. Four, latency: if the heavier model added tens of milliseconds, engagement falls for reasons unrelated to quality, so compare response times per arm before blaming the model. The fix usually involves training against a longer-horizon target such as completion rather than raw clicks, and keeping an explicit diversity rule in the final sort.',
      isCaseBased: true,
    },
    {
      question: 'What makes time-series modelling different from ordinary supervised learning?',
      answer:
        'Ordinary supervised learning assumes rows are interchangeable: shuffle them, split them at random, nothing is lost. Time-series rows are not interchangeable on either count. They are not independent, because today depends on yesterday — and that dependence is precisely the signal you exploit through lag features. They are not drawn from a fixed distribution either, because the average and the spread drift with trend and with regime changes, so old rows describe a different world than recent ones. The practical consequences: you never shuffle, the test set must be strictly later in time than the training set, cross-validation becomes an expanding window rather than random folds, and every feature must be checkable against the question "do I have this number on the morning I make the prediction?". Classical models add one more demand, stationarity, which is what differencing exists to produce.',
      isCaseBased: false,
    },
    {
      question: 'Case: a demand forecast scores 4% error in backtest and 22% in production. Give four hypotheses and a test for each.',
      answer:
        'One, leakage through a feature that is not available at prediction time — a rolling window that included the current row, or a monthly total computed across the whole month and attached to rows inside it. Test: go column by column asking whether the value physically exists on the morning of the prediction, then rebuild the backtest so every feature is joined as of that morning. Two, a non-temporal split, so the backtest was interpolating between known days rather than forecasting. Test: rerun with an expanding-window split; if the score collapses, that was the bug, which is exactly the 0.75-versus-2.5 gap from this module. Three, horizon mismatch: backtested one step ahead but serving thirty steps, where each prediction is fed back in as an input and errors compound. Test: report error separately for each horizon; a rising curve confirms it. Four, distribution shift: a promotion calendar, a price change, or a product mix that did not exist in training. Test: compare feature distributions between training and live traffic, and check whether the errors cluster on particular dates or particular products. One extra worth raising: percentage error is treacherous on its own, because it explodes when actuals are near zero, so a shift toward low-volume products inflates it even if the model is unchanged.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    {
      front: 'User-item matrix, and sparsity',
      back: 'A grid: rows are users, columns are items, each cell is a rating or an interaction. Sparsity is the fraction of cells that are blank — in real systems well over 99%. Filling in a blank is the whole task.',
    },
    {
      front: 'Content-based vs collaborative filtering',
      back: 'Content-based uses what the item IS (genre, text, image) and can recommend a brand-new item. Collaborative filtering uses only what people DID and finds links no description encodes, but is blind to any empty row or column.',
    },
    {
      front: 'Item-item cosine similarity, by hand',
      back: 'Two columns, e.g. Speed (4,5,0,1,0) and Ronin (4,4,1,2,4). Products summed: 38. Lengths: sqrt(42)=6.481 and sqrt(53)=7.280. 38 / 47.18 = 0.805. Near 1 means the same people rated both highly.',
    },
    {
      front: 'Predicting a missing rating',
      back: 'Weighted average over the items the user did rate: sum of (rating x similarity) divided by sum of similarity. With ratings 5, 1, 1, 4 and similarities 0.754, 0.188, 0.235, 0.805: 7.415 / 1.983 = 3.74.',
    },
    {
      front: 'Cold start',
      back: 'A new user has a blank row and a new item has a blank column, so collaborative filtering has nothing to compare. Answers, in order: popularity fallback, onboarding taps, content features for new items, and forced exploration so unproven items can earn data.',
    },
    {
      front: 'Explicit vs implicit feedback',
      back: 'Explicit = ratings the user deliberately gave: clean but rare. Implicit = clicks and watch time: abundant but with no negatives, since a non-click means disliked OR never shown, and nothing separates the two.',
    },
    {
      front: 'Lag feature and rolling average',
      back: 'lag1 for day t is the value from day t-1; lag7 is the same weekday last week. A 3-day rolling average for day t is the mean of days t-3, t-2, t-1. The window must END at t-1 — including day t puts the answer into the question.',
    },
    {
      front: 'Never shuffle a time split',
      back: 'The same predictor on the same twelve days scored MAE 0.75 shuffled and 2.5 time-ordered. Shuffling let it average the days on both sides of a test day, so it interpolated instead of forecasting. Use an expanding window: train 1..t, test t+1.',
    },
  ],
  mindmapMarkdown: `- Recommendation Systems & Time-Series Basics
  - The user-item matrix
    - Rows users, columns items, cells ratings
    - Blanks everywhere = sparsity
    - The task is filling one blank
  - Two ways to fill it
    - Content-based: what the item IS
    - Collaborative: what people DID
    - Real systems use both
  - Item-item collaborative filtering
    - Compare two columns with cosine
    - Speed vs Ronin = 0.805 by hand
    - Predict by weighted average
    - Eve on Speed = 7.415 / 1.983 = 3.74
  - Problems it has
    - Cold start: blank row, blank column
    - Implicit feedback has no negatives
    - Popularity bias
  - Matrix factorisation
    - Short list of numbers per user and per item
    - Dot product reproduces known ratings
    - Fit on observed cells only
  - Scoring a recommender
    - Rating error is the wrong target
    - Ranking Metrics module: Precision@K, MAP, NDCG
    - Also coverage and diversity
  - Time series
    - Order is part of the data
    - Trend, seasonality, leftover wobble
    - Lag features and rolling averages
    - Window must end at t-1
  - Baseline first
    - Same as yesterday: MAE 2.27
    - Beat it before claiming anything
  - The one rule
    - Shuffled split MAE 0.75 = fiction
    - Time-ordered MAE 2.5 = honest
    - Interpolating is not forecasting
    - Expanding window, plus a gap
  - Beyond the basics
    - Two-stage serving: retrieval then ranking
    - Retrieval sets the ceiling
    - ARIMA, Prophet, gradient boosting on lags`,
}

export default m
