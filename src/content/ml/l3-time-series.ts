import type { Module } from '../types'

const m: Module = {
  id: 'ml-l3-time-series',
  subjectId: 'ml',
  level: 3,
  title: 'Time Series Basics',
  whyItMatters:
    'Ordinary models expect rows in no particular order. Time series breaks that assumption, and the two consequences — how you build features, and how you are allowed to test — are where almost every forecasting mistake lives.',
  assumes: [
    'You know what a train/test split is',
    'You have seen a Python list and a for loop',
  ],
  estMinutes: 20,
  sections: [
    {
      type: 'intuition',
      title: 'What a time series is',
      md: `A **time series** is a list of numbers where each is stamped with a time, and **the order is part of the data**. Shuffle a table of houses and nothing is lost; shuffle a series of daily sales and you have destroyed it.

Ordinary models want a row of features and an answer. A time series gives you one long line of numbers, so you need a bridge:

- A **lag feature** is the value from k steps earlier. lag1 is yesterday.
- A **rolling average** is the mean of the last k values.

Both are built by looking **backwards only**, and the first few rows come out blank because there is no history yet.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'A lag and a rolling average, with the blanks visible',
      code: `sales = [10, 12, 14, 16, 18, 21, 23]

for t in range(len(sales)):
    lag1 = sales[t - 1] if t >= 1 else None
    if t >= 3:
        roll3 = round(sum(sales[t - 3:t]) / 3, 2)
    else:
        roll3 = None
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
        4: 'A ternary: yesterday\'s value when there is a yesterday, otherwise None. Day 1 has no history, which is why the blanks are real rather than a bug.',
        6: 'sales[t-3:t] is a slice ending BEFORE t, so today is excluded. Including today would hand the model the answer, which is the most common lag-feature bug.',
        10: 'Three rows have blanks and are unusable. Every lag feature costs you rows off the front, which is why long lags are expensive on short series.',
      },
    },
    {
      type: 'note',
      label: 'The baseline that embarrasses people',
      md: `Before any model, compute what **"today equals yesterday"** scores. It costs one line and on a smoothly trending series it is very hard to beat.

On twelve days of sales it gives an MAE of **2.27** across all eleven predictable days, and **2.50** on the last four. Any model you build has to beat that to have earned its existence — and a surprising number of forecasting projects never check.`,
    },
    {
      type: 'math',
      intro:
        'The naive forecast and the error measure used to judge it. MAE is the mean absolute error: average how far off you were, ignoring direction. It is preferred to RMSE for forecasting because it is in the same units as the series and is not dominated by one bad day.',
      latex: [
        '\\hat{y}_t = y_{t-1} \\qquad\\qquad \\text{MAE} = \\frac{1}{n}\\sum_{t} \\lvert \\hat{y}_t - y_t \\rvert',
      ],
    },
    {
      type: 'intuition',
      title: 'The rule that outranks the model',
      md: `**Never let a model see the future while you are testing it, and never shuffle a time series to make a test set.**

Everyone nods at this and then uses \`train_test_split\` anyway, because it is the habit. So here is what it costs, measured.

The "model" below is deliberately simple: to predict a day, average the nearest training day before it and the nearest after it. Given a shuffled split it has neighbours on both sides. Given an honest split it has only the past.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The predictor, and what it can see',
      code: `sales = [10, 12, 14, 16, 18, 21, 23, 25, 28, 30, 32, 35]

def predict(i, train):
    before = [t for t in train if t < i]
    after = [t for t in train if t > i]
    if before and after:
        return (sales[before[-1]] + sales[after[0]]) / 2
    return sales[before[-1]]

print(predict(8, [0, 1, 2, 3, 4, 5, 6, 7]))
print(predict(8, [0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11]))

# ---- real output ----
# 25
# 27.5`,
      annotations: {
        4: 'Split the training days into those before and after the day being predicted. Whether `after` is empty is entirely decided by how the split was made.',
        11: 'With only the past available, day 9 is predicted as 25 — the last value it saw. That is a genuine forecast.',
        12: 'With future days in training, it predicts 27.5 by averaging day 8 and day 10 — the days either side of the answer. That is interpolation, and nothing in production ever gets to do it.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same model scored two ways',
      code: `test = [4, 7, 9, 10]
train = [0, 1, 2, 3, 5, 6, 8, 11]
total = sum(abs(predict(i, train) - sales[i]) for i in test)
print('shuffled-split MAE:', round(total / 4, 2))

total = 0.0
for i in [8, 9, 10, 11]:
    p = predict(i, list(range(i)))
    print('day', i + 1, 'true', sales[i], 'pred', p)
    total = total + abs(p - sales[i])
print('time-ordered MAE:', round(total / 4, 2))

# ---- real output ----
# shuffled-split MAE: 0.75
# day 9 true 28 pred 25
# day 10 true 30 pred 28
# day 11 true 32 pred 30
# day 12 true 35 pred 32
# time-ordered MAE: 2.5`,
      annotations: {
        2: 'A shuffled split: the test days are scattered, so every one of them has training days on both sides.',
        8: 'list(range(i)) is everything strictly before day i — the honest training set, growing as time moves forward.',
        14: '0.75 shuffled against 2.5 time-ordered. Same model, same twelve days, and the shuffled number is more than three times better.',
        19: 'Note the honest predictions are all exactly the previous value — this model has degenerated into the naive baseline, whose MAE on these four days is also 2.5. So it has learned nothing at all, and the shuffled split hid that completely.',
      },
    },
    {
      type: 'note',
      label: 'How to read those two numbers',
      md: `0.75 is not a better result. It is not a result at all — it answers "can you fill a gap between two days you have already seen?", which nothing in production will ever ask.

The honest 2.50 is also exactly what the naive baseline scores, which tells you the model adds nothing. The shuffled split concealed that, and it concealed it in the flattering direction.

Use **forward-chaining** validation: train on everything up to a point, test on the next block, extend, repeat. \`TimeSeriesSplit\` does this.`,
    },
    {
      type: 'note',
      label: 'Two words you will hear',
      md: `**Stationary** — the series' statistical behaviour does not change over time: no trend, no growing spread. Most classical methods assume it, and differencing (modelling the change rather than the level) is the usual way to get it.

**Autocorrelation** — how strongly the series correlates with a lagged copy of itself. High autocorrelation at lag 7 in daily data means a weekly cycle, and it tells you which lag features are worth building.

Both are asking the same question: does the past still describe the present?`,
    },
  ],
  quiz: [
    {
      question: 'Why does a rolling average slice end before today?',
      options: [
        { text: 'To save memory', explanation: 'The slice length is unchanged either way.' },
        { text: 'Including today would hand the model part of the answer it is trying to predict', explanation: 'Correct, and it is the most common lag-feature bug — the model looks excellent and cannot be deployed.' },
        { text: 'Because averages need at least three values', explanation: 'The window size is a separate choice from where the window ends.' },
        { text: 'It does not matter which end is used', explanation: 'It is the difference between a usable feature and leakage.' },
      ],
      correct: 1,
    },
    {
      question: 'Why are the first three roll3 values None?',
      options: [
        { text: 'A bug in the loop', explanation: 'It is deliberate — the condition is t >= 3.' },
        { text: 'There is not yet three days of history to average', explanation: 'Correct. Every lag feature costs rows off the front, which matters on short series.' },
        { text: 'The sales values are too small', explanation: 'Magnitude is irrelevant.' },
        { text: 'Rolling averages always skip the first three', explanation: 'It depends on the window: a 2-day window would cost two rows.' },
      ],
      correct: 1,
    },
    {
      question: 'The naive baseline scores MAE 2.50 on the last four days. Why compute it?',
      options: [
        { text: 'As a sanity check that the data loaded correctly', explanation: 'It is a performance benchmark, not a data check.' },
        { text: 'Because any model must beat it to have earned its existence — and here the "model" ties it exactly', explanation: 'Correct. The time-ordered model also scored 2.50, meaning it learned nothing at all.' },
        { text: 'Because it is the best possible forecast', explanation: 'It is often hard to beat, but it is not optimal.' },
        { text: 'To choose the window size', explanation: 'It has no window.' },
      ],
      correct: 1,
    },
    {
      question: 'The same model scored 0.75 shuffled and 2.50 time-ordered. What does the 0.75 measure?',
      options: [
        { text: 'The model\'s forecasting ability', explanation: 'It never forecast anything — every test day had training days on both sides.' },
        { text: 'Its ability to interpolate between days it had already seen, which production never asks for', explanation: 'Correct. The shuffled split answers a question nobody will ever pose to the deployed model.' },
        { text: 'A more accurate estimate, since it uses more training data', explanation: 'Both splits use eight training days; the difference is where they sit relative to the test days.' },
        { text: 'The naive baseline', explanation: 'The naive baseline is 2.50 — which the honest score matches.' },
      ],
      correct: 1,
    },
    {
      question: 'What does forward-chaining validation do?',
      options: [
        { text: 'Trains on everything up to a point, tests on the next block, then extends the window and repeats', explanation: 'Correct. The model is never shown the future, which mirrors how it will be used.' },
        { text: 'Shuffles the data before splitting', explanation: 'That is exactly what it avoids.' },
        { text: 'Trains on the future and tests on the past', explanation: 'That is the leak in reverse.' },
        { text: 'Uses every row for both training and testing', explanation: 'That describes k-fold, which is the wrong tool here.' },
      ],
      correct: 0,
    },
    {
      question: 'High autocorrelation at lag 7 in daily data tells you what?',
      options: [
        { text: 'The series is stationary', explanation: 'Stationarity is a separate property about whether behaviour changes over time.' },
        { text: 'There is a weekly cycle, so a lag-7 feature is likely to be useful', explanation: 'Correct. Autocorrelation is how you decide which lags are worth building.' },
        { text: 'The data has been shuffled', explanation: 'Shuffling would destroy autocorrelation, not create it.' },
        { text: 'The model is overfitting', explanation: 'It is a property of the data, measured before any model.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'How do you validate a forecasting model?',
      answer:
        'Forward-chaining: train on everything up to a cut-off, test on the next block, extend the training window, repeat. Never shuffle. The cost of getting this wrong is large and always flattering — on twelve days of sales the same model scored MAE 0.75 with a shuffled split and 2.50 time-ordered, because the shuffled version let it average the days either side of each answer. And the 2.50 exactly matched the naive baseline, so the model had learned nothing, which the shuffled split completely concealed.',
      isCaseBased: true,
    },
    {
      question: 'What baseline do you always compute first?',
      answer:
        'The naive forecast: tomorrow equals today. It costs one line and on smoothly trending or slow-moving series it is genuinely hard to beat — on this data it gave MAE 2.27 over eleven days. For seasonal data the seasonal naive, this-week-equals-last-week, is the right version. If a model cannot beat it, it does not justify its complexity, its latency or its maintenance, and a surprising number of forecasting projects never run the comparison.',
      isCaseBased: false,
    },
    {
      question: 'What features would you build from a raw series?',
      answer:
        'Lags at intervals the autocorrelation says matter — lag 1, lag 7 for weekly data, lag 365 or lag 52 for annual. Rolling statistics over several windows: mean, min, max, standard deviation, all computed strictly backwards. Calendar features: day of week, month, holiday flags, which capture seasonality directly. Time since a relevant event. And differences rather than levels when there is a trend, since that is what makes the series stationary. Every one of them must be computable at prediction time from data that exists then.',
      isCaseBased: false,
    },
    {
      question: 'What does stationary mean and why does it matter?',
      answer:
        'A series is stationary when its statistical properties do not change over time — constant mean, constant variance, no trend. It matters because most classical methods, ARIMA in particular, assume it, and because a model fitted to a trending series learns the trend as if it were a level and extrapolates badly. The standard remedies are differencing, which models the change rather than the value, and a log transform when the variance grows with the level. Tree models cannot extrapolate a trend at all, which is another argument for differencing before using them.',
      isCaseBased: false,
    },
    {
      question: 'Your forecast is excellent in backtesting and poor in production. What do you check?',
      answer:
        'First whether the backtest leaked the future — a rolling feature that included the current period, a target computed with a centred window, or a split that shuffled. Then whether every feature is available at the moment of prediction: a value that arrives with a two-day reporting delay is fine in a historical table and absent when you need it. Then whether the series has drifted since the training window, which forward-chaining would have surfaced as declining scores across folds if you looked at them individually rather than averaging.',
      isCaseBased: true,
    },
    {
      question: 'How do you forecast several steps ahead?',
      answer:
        'Two approaches. Recursive: predict one step, feed that prediction back as a lag, predict the next — simple and uses one model, but errors compound and the model was trained on true lags rather than predicted ones. Direct: train a separate model per horizon, each predicting h steps ahead from currently available data — no compounding, honest about what is known, but h models to train and maintain. Direct is usually better when h is small and fixed; recursive when the horizon is long or variable.',
      isCaseBased: false,
    },
    {
      question: 'When would you use a gradient-boosted tree over ARIMA?',
      answer:
        'When there are exogenous features — promotions, weather, holidays, prices — which trees absorb naturally and classical methods handle awkwardly. When there are many related series to train jointly, which is the usual retail case. And when the relationships are non-linear. ARIMA remains a good choice for a single univariate series with clear structure and few covariates, and it gives principled uncertainty intervals, which tree ensembles do not without extra work. The catch with trees is that they cannot extrapolate a trend, so you difference first.',
      isCaseBased: false,
    },
    {
      question: 'Your backtest scores vary a lot between folds. Is that a problem?',
      answer:
        'It is information rather than a problem, and averaging it away is the mistake. Later folds train on more data, so improving scores across folds is expected and healthy. Declining scores suggest drift — the world is changing and older data is becoming misleading, which argues for a rolling rather than expanding training window. A single terrible fold usually marks a specific event: a promotion, an outage, a policy change. I would look at the fold scores individually and at what happened in the period each one covers.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Time series, in one sentence', back: 'Numbers stamped with a time, where the ORDER is part of the data. Shuffling destroys it.' },
    { front: 'Lag and rolling features', back: 'lag k = the value k steps back. rolling k = mean of the last k. Both look strictly backwards, and both cost rows off the front.' },
    { front: 'The most common lag bug', back: 'A window that includes today. sales[t-3:t] ends BEFORE t; sales[t-3:t+1] hands the model the answer.' },
    { front: 'The naive baseline', back: 'Tomorrow equals today. MAE 2.27 over eleven days here. Any model must beat it to justify itself.' },
    { front: 'Shuffled vs time-ordered', back: 'Same model, same 12 days: MAE 0.75 shuffled, 2.50 time-ordered. The shuffled version interpolated between days it had already seen.' },
    { front: 'What the honest 2.50 revealed', back: 'It exactly matches the naive baseline — so the model learned nothing. The shuffled split hid that entirely.' },
    { front: 'Forward chaining', back: 'Train up to a cut-off, test the next block, extend, repeat. The model is never shown the future. TimeSeriesSplit implements it.' },
    { front: 'Stationary / autocorrelation', back: 'Stationary = behaviour does not change over time (fix by differencing). Autocorrelation = correlation with a lagged copy; it tells you which lags to build.' },
  ],
  mindmapMarkdown: `- Time series
  - What makes it different
    - order IS the data
    - shuffling destroys it
  - Features
    - lag k = value k steps back
    - rolling k = mean of last k
    - look BACKWARDS only
    - sales[t-3:t] excludes today (the classic bug)
    - blanks at the front are real
  - Baseline first
    - tomorrow = today
    - MAE 2.27 over 11 days, 2.50 over last 4
  - The validation rule
    - never shuffle, never see the future
    - same model: 0.75 shuffled, 2.50 ordered
    - honest 2.50 == naive baseline -> learned nothing
    - forward chaining / TimeSeriesSplit
  - Vocabulary
    - stationary: behaviour constant over time
    - differencing to get there
    - autocorrelation: which lags matter (lag 7 = weekly)`,
}

export default m
