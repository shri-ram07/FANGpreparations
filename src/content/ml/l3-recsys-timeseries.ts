import type { Module } from '../types'

const m: Module = {
  id: 'ml-l3-recsys-timeseries',
  subjectId: 'ml',
  level: 3,
  title: 'Recommendation Systems & Time-Series Basics',
  whyItMatters:
    'Two topics that pay the bills at every FAANG: what to show next, and what happens next. You will not be asked to derive them — you will be asked to design one on a whiteboard in 20 minutes. This module gives you the map: the vocabulary, the two-stage architecture real systems use, the metrics that are not RMSE, and the two time-series rules that separate a working forecast from a beautiful backtest that dies in production.',
  estMinutes: 50,
  sections: [
    {
      type: 'intuition',
      title: 'Two shop assistants',
      md: `You walk into a bookshop holding a crime novel. Two assistants offer help.

- **Assistant A reads the book.** Genre, author, blurb, page count. "You like Nordic crime? Here are four more Nordic crime novels." That is **content-based** filtering — it works from ITEM features.
- **Assistant B remembers everyone.** "People who bought that one also walked out with this cookbook. No idea why. They just do." That is **collaborative filtering** — it works from BEHAVIOUR, and it never opens the book.
- Both are real systems. Both fail in different, predictable ways.
- Almost every production recommender is a blend of the two plus a ranker on top. Knowing which half is talking is most of the interview.`,
    },
    {
      type: 'intuition',
      title: 'Content-based: recommend things that look alike',
      md: `Turn every item into a feature vector — genre flags, author, price bucket, TF-IDF of the description, an image embedding. Build a profile for the user by averaging the items they liked. Recommend the nearest items to that profile.

- **Cold-start friendly for new items.** A film uploaded 5 minutes ago has genre and cast, so it is recommendable immediately. No CF method can say that.
- **Cold-start friendly for a new user who states a preference** — one onboarding tap ("I like sci-fi") gives you a profile.
- **Explainable for free**: "because you watched a heist movie."
- **Failure 1 — the filter bubble.** It only ever recommends more of the same. It cannot discover that crime readers love a certain cookbook, because nothing in the features connects them.
- **Failure 2 — you need good item features.** Garbage metadata, garbage recommendations. On a marketplace with seller-written titles, this is the actual bottleneck.`,
    },
    {
      type: 'intuition',
      title: 'Collaborative filtering: recommend what similar people did',
      md: `Forget the item entirely. You have a giant table: rows = users, columns = items, cells = interactions. That is all CF ever sees.

- **User-based:** find users whose interaction pattern looks like yours, recommend what they liked and you have not seen.
- **Item-based:** find items that get consumed by the same people, recommend items similar to what you just consumed.
- **Superpower:** it finds *surprising* cross-genre hits. Behaviour encodes taste that no metadata field ever will.
- **Second superpower:** zero item features needed. It works on products with nothing but an ID.
- **Failure 1 — cold start, both ends.** New user: no row, no neighbours. New item: no column, invisible forever.
- **Failure 2 — popularity bias.** The blockbuster co-occurs with everything, so it gets recommended to everyone, which makes it co-occur with even more. Long-tail items starve.`,
    },
    {
      type: 'note',
      md: `**Why Amazon shipped item-based, not user-based.** Two reasons, and they are the answer to a very common interview question. (1) **Stability**: your taste drifts week to week, but "people who buy a printer buy toner" is true for years — so item-item similarities can be computed offline overnight and just looked up at request time. (2) **Shape**: the number of users usually dwarfs the number of items, and the user-user similarity matrix has to be rebuilt as users act. Item-item is smaller and stiller. Precompute what does not move.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Item-item collaborative filtering in one matrix product',
      code: `import numpy as np

# rows = users, cols = movies, 1 = watched. Implicit feedback: no ratings, no dislikes.
R = np.array([[1, 1, 0, 0, 1],      # Ana
              [1, 1, 0, 0, 0],      # Bo
              [0, 0, 1, 1, 0],      # Cal
              [0, 1, 1, 1, 0]], dtype=float)   # Dee
movies = ['Heat', 'Speed', 'Amelie', 'Chungking', 'Ronin']

norm = np.linalg.norm(R, axis=0)                  # length of each ITEM column
S = (R.T @ R) / np.outer(norm, norm)              # cosine similarity, item x item
np.fill_diagonal(S, 0)                            # an item never recommends itself

seed = 0                                          # user just watched Heat
for j in np.argsort(-S[seed])[:3]:
    print(f'watched {movies[seed]:<6} -> {movies[j]:<10} sim={S[seed, j]:.2f}')

# watched Heat   -> Speed      sim=0.82
# watched Heat   -> Ronin      sim=0.71
# watched Heat   -> Amelie     sim=0.00`,
      annotations: {
        3: 'A 1 means watched. A 0 means EITHER disliked OR never seen — implicit feedback cannot tell those two apart. That ambiguity is the central difficulty of the whole field.',
        11: 'R.T @ R counts how many users consumed both items; dividing by the column lengths turns raw counts into cosine similarity. The entire item-item model is one matrix product.',
        12: 'Skip this and every item is its own best recommendation at similarity 1.0, and every list is useless.',
        19: 'Ronin is linked to Heat only through Ana, who happened to watch both. No genre tag, no description, no features at all — pure behaviour. That is the CF magic trick, and its whole cost is that Ana had to exist first.',
      },
    },
    {
      type: 'intuition',
      title: 'Matrix factorization: squeeze the giant empty table',
      md: `Netflix had ~500,000 users and ~17,000 films. That table has 8.5 billion cells and roughly **99% of them are empty**. You cannot store it, and neighbour search over it is slow and noisy.

- Trick: assume the table is *low rank* — that a handful of hidden factors explain most of it.
- Factor it into two skinny matrices: a **user matrix** (one short vector per user) and an **item matrix** (one short vector per item), say 50 numbers each.
- A predicted rating is then just the **dot product** of the user vector and the item vector. High dot product = they point the same way = match.
- The factors are learned, not designed. One may end up meaning "gritty vs cosy", another "old vs new" — nobody labelled them.
- You already know this machine. The math subject module *Vectors & the Dot Product (= Similarity)* is exactly this operation, and an item vector here IS an embedding in the GenAI sense: a learned dense vector where geometric closeness means semantic closeness.`,
    },
    {
      type: 'math',
      intro: 'Matrix factorization in two lines. R is the user-item matrix, k is the number of hidden factors (typically 20–200).',
      latex: [
        'R_{(m \\times n)} \\approx P_{(m \\times k)} \\, Q^{T}_{(k \\times n)} \\qquad \\hat{r}_{ui} = p_u \\cdot q_i = \\sum_{f=1}^{k} p_{uf} \\, q_{if}',
        '\\min_{P,Q} \\sum_{(u,i) \\in \\mathcal{O}} \\left( r_{ui} - p_u \\cdot q_i \\right)^2 + \\lambda \\left( \\lVert p_u \\rVert^2 + \\lVert q_i \\rVert^2 \\right)',
        '\\mathcal{O} = \\text{ONLY the observed cells. The missing 99\\% is not a zero — it is a question mark.}',
      ],
    },
    {
      type: 'note',
      md: `Two details that sound small and are not. **(1)** The sum runs over observed cells only — treating unseen items as rating 0 would teach the model that everything unwatched is hated. **(2)** The regularizer λ is doing heavy lifting: with 99% of the table missing, an unregularized factorization memorizes the few cells it has. Same L2 penalty as Ridge, same reason. Fitting is done with SGD (one observed cell at a time) or ALS (freeze P, solve Q, freeze Q, solve P — trivially parallel, which is why Spark shipped it).`,
    },
    {
      type: 'intuition',
      title: 'Explicit vs implicit feedback — and why stars lost',
      md: `**Explicit** = the user deliberately grades the item: 5 stars, thumbs up. **Implicit** = the system watches: clicks, watch-time, add-to-cart, replays, skips.

- Explicit data is clean and rare. Fewer than 1 in 100 users rate anything, and the ones who do are the extremes — furious or delighted. Biased sample, tiny volume.
- Implicit data is noisy and everywhere. Every session produces hundreds of signals for free. Real systems run on it.
- **The no-negative-signal problem:** a click is a positive. But a non-click is ambiguous — did they dislike it, or never scroll far enough to see it? You cannot tell.
- Standard fixes: treat unobserved items as **weak negatives** with a low confidence weight, or **sample** negatives randomly per training step. Both are approximations you should be able to name.
- Watch-time-style signals also need care: a 10-second view of a 10-second clip is a triumph; of a 2-hour film, a rejection. Normalize by item length, or you will build a machine that recommends short things.`,
    },
    {
      type: 'intuition',
      title: 'How a real recommender actually runs: two stages',
      md: `The honest architecture, the one YouTube and Netflix describe in their papers. It exists for one reason: **arithmetic**.

- You have millions of items and about 100 milliseconds. A good ranking model costs roughly a millisecond per item. Scoring the whole catalogue takes hours. Dead on arrival.
- So split the job by cost. **Stage 1, candidate generation (retrieval):** something cheap — a dot product against a precomputed embedding index, plus dumb-but-strong sources like your subscriptions and what is trending — cuts millions to a few hundred.
- **Stage 2, ranking:** now that only hundreds survive, you can afford an expensive model with hundreds of features per (user, item) pair, predicting several things at once (click, finish, like).
- Stage 1 optimizes **recall** — do not lose the good stuff. Stage 2 optimizes **precision of the order** — put the best on top.
- Step through the budget below.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One recommendation request, stage by stage',
        notice:
          'Left column = the work being done and its latency budget. Right column = how many items are still alive at that point. Red dashed = the item that never made it.',
        leftLabel: 'stage / budget',
        rightLabel: 'items still in play',
        frames: [
          {
            note: 'The request arrives. Ten million items in the catalogue, about 100 ms before the page feels slow. The heavy ranker costs roughly 1 ms per item — scoring everything would take about three hours. That single number is why two stages exist.',
            stack: [
              { name: 'user request', value: 'budget: ~100 ms', to: 'cat' },
              { name: 'ranker cost', value: '~1 ms / item' },
            ],
            heap: [{ id: 'cat', value: '10,000,000 items', label: 'full catalogue' }],
          },
          {
            note: 'Stage 1 — candidate generation. Cheap and parallel: a dot product of the user vector against a precomputed item-embedding index (approximate nearest neighbour), plus a few hand-built sources. Nothing here is smart. It only has to be fast and high-recall.',
            stack: [
              { name: 'user vector', value: '128 floats', to: 'cand' },
              { name: 'ANN index lookup', value: 'top ~300' },
              { name: 'subscriptions', value: '~100' },
              { name: 'trending / fresh', value: '~100' },
            ],
            heap: [
              { id: 'cat', value: '10,000,000 items', label: 'never scored one by one', freed: true },
              { id: 'cand', value: '~500 candidates', label: 'stage 1 output, ~10 ms' },
            ],
          },
          {
            note: 'Stage 2 — ranking. Now expense is affordable. Hundreds of features per (user, item) pair, a gradient-boosted or deep model, several heads: probability of click, of finishing, of a like. 500 x heavy is fine. Ten million x heavy was not.',
            stack: [
              { name: 'pairs to score', value: '~500', to: 'scored' },
              { name: 'features per pair', value: '~400' },
              { name: 'model', value: 'GBM / deep, ~50 ms' },
            ],
            heap: [{ id: 'scored', value: '500 scored items', label: 'p(click), p(finish), p(like)' }],
          },
          {
            note: 'Stage 3 — policy. Sort by score, then apply the rules a loss function cannot express: no duplicates, no more than two from one creator, some freshness, some exploration. Ten slots render. All of it inside the page load.',
            stack: [
              { name: 'top by score', value: '20', to: 'shown' },
              { name: 'diversity rule', value: 'max 2 per channel' },
              { name: 'exploration', value: '1 random slot' },
            ],
            heap: [{ id: 'shown', value: '10 items on screen', label: '~100 ms end to end' }],
          },
          {
            note: 'The failure mode to name out loud in an interview: retrieval sets the CEILING. An item stage 1 never fetched cannot be ranked, cannot be shown, and therefore never earns the interactions that would have made it retrievable. Feedback loops are how good items stay invisible — and why that exploration slot in the previous frame is not decoration.',
            stack: [{ name: 'great item #8,441,203', value: 'never retrieved', to: 'lost', danger: true }],
            heap: [{ id: 'lost', value: 'never scored, never shown', label: 'no data -> stays unretrievable', freed: true }],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Evaluation: RMSE is the wrong target',
      md: `The Netflix Prize paid a million dollars for the lowest RMSE on predicted star ratings. Netflix then largely did not ship the winner. Understand why and you understand recsys evaluation.

- The product shows a **short ranked list**. Nobody sees a predicted rating.
- RMSE spends its budget being accurate about every rating, including the 4.1-vs-4.3 distinction on items that will never appear on screen. It rewards work the user never experiences.
- What matters is **which items are on top**. So measure ranking: **Precision@K** (of the K shown, how many were relevant) and **NDCG** (same, but a hit at position 1 counts more than a hit at position 10, discounted by log of the rank).
- Also track what the product actually wants: coverage (how much of the catalogue ever appears), diversity, and freshness. A recommender that shows the same 50 blockbusters forever will have wonderful offline numbers.
- Full definitions and the MAP/NDCG mechanics live in the **Metrics & Losses** subject. Here just carry the sentence: *rating accuracy is not ranking quality.*`,
    },
    {
      type: 'intuition',
      title: 'The cold-start playbook',
      md: `Every recsys interview reaches "what about a brand new user / item?" Have a staged answer ready — it is a sequence, not one trick.

- **New user, second 1:** popularity fallback, ideally segmented by whatever you do know (country, device, referrer). Boring, and it is what everyone ships.
- **New user, minute 1:** onboarding — pick 3 topics, pick 5 artists. One tap buys you a content-based profile immediately.
- **New user, session 1:** session-based recommendations from the items they touch right now, no history needed.
- **New item, day 0:** content features (text, image, category embeddings) let it be retrieved before any interaction exists. This is the hybrid part of every hybrid system.
- **New item, week 1:** deliberate exploration — force a small traffic slice onto unproven items to buy the data. Pure exploitation makes cold start permanent.`,
    },
    {
      type: 'intuition',
      title: 'Time series: the assumption everything else rests on, broken',
      md: `Switch topics. You have daily sales for three years and need next month. Reach for your usual toolkit and you will quietly break its foundation.

- Ordinary supervised learning assumes rows are **i.i.d.** — independent and identically distributed. Shuffle them, split them, nothing changes.
- Time series rows are **neither**. Today's sales depend on yesterday's (not independent), and the mean and variance drift over the years (not identically distributed).
- Consequence 1: **order is information**. Destroy it and you destroyed most of the signal.
- Consequence 2: **your test set is the future**, always. Any accidental peek at the future inflates the score in a way you will only discover in production.
- Everything odd about time-series practice — the strange CV, the paranoid feature rules, the differencing — descends from those two sentences.`,
    },
    {
      type: 'intuition',
      title: 'Decomposition: trend, seasonality, residual',
      md: `Look at any business series and you are seeing three things stacked. Pull them apart before you model.

- **Trend** — the slow direction. Are we growing over years?
- **Seasonality** — the fixed-period cycle. Weekly (weekend spikes), yearly (December), daily (lunch rush). Note it is *periodic*, with a known period.
- **Residual** — what is left. The noise, plus the one-off events (a promo, an outage) that neither of the above explains.
- Additive when the seasonal swing is a constant size (+200 units every Saturday). Multiplicative when it scales with the level (+15% every Saturday) — which is most revenue data. Taking a log turns multiplicative into additive.
- Why bother: each piece has a different fix. Trend gets differenced away, seasonality becomes a feature or a seasonal difference, and the residual is the only part you should expect a model to struggle with.`,
    },
    {
      type: 'math',
      intro: 'Decomposition and the two differences. Δ is "subtract the previous value".',
      latex: [
        'y_t = T_t + S_t + R_t \\quad \\text{(additive)} \\qquad\\qquad y_t = T_t \\times S_t \\times R_t \\quad \\text{(multiplicative)}',
        '\\Delta y_t = y_t - y_{t-1} \\quad \\text{first difference: removes a linear trend}',
        '\\Delta_{7} y_t = y_t - y_{t-7} \\quad \\text{seasonal difference: removes a weekly cycle}',
      ],
    },
    {
      type: 'intuition',
      title: 'Stationarity, and why models beg for it',
      md: `A series is **stationary** when its statistical behaviour does not depend on WHEN you look: constant mean, constant variance, and a correlation structure that depends only on the gap between two points, not on the date.

- Analogy: a stationary series is a fair coin. The rules today are the rules next year, so what you learned in the past still applies.
- A trending series is a coin whose bias creeps upward. A model fitted on the old rules predicts the old world.
- Classical models (ARMA and friends) *require* it — their whole theory is built on it. ML models do not formally require it, but they still cannot extrapolate a trend they never saw: a tree can only predict values inside its training range.
- **The fix is differencing.** Model the CHANGE instead of the level. Δy is usually stationary even when y is not. Difference again if one pass is not enough (rare; twice is almost always plenty).
- Check with your eyes first (plot it, plot a rolling mean and rolling std), then the ADF test if someone demands a p-value.`,
    },
    {
      type: 'intuition',
      title: 'Autocorrelation and the lag feature',
      md: `**Autocorrelation** = the correlation of a series with a shifted copy of itself. At lag 1, how well does yesterday predict today? At lag 7, last Tuesday?

- The plot of autocorrelation against lag (the ACF) is the cheapest diagnostic in forecasting. A tall spike at lag 7 in daily data means a weekly cycle exists — go build a lag-7 feature.
- Slow decay across many lags means a trend is present, i.e. difference it.
- The bridge to normal ML is simply this: **turn each useful lag into a column**. lag_1, lag_7, lag_28, a rolling mean of the last 7, a rolling std, plus date parts (day-of-week, month, is_holiday).
- Now every row is a plain feature vector and you can hand it to any regressor. That is the whole trick — the "time" part becomes ordinary tabular data.
- Cost you must state: lag features create NaN rows at the start (there is no yesterday for day 1), and every lag you add shortens the usable history.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Building the feature frame: lags, a rolling mean, a difference',
      code: `import numpy as np

day = np.arange(1, 11)
sales = np.array([12, 15, 14, 18, 21, 19, 24, 27, 25, 30], dtype=float)

def shift(a, k):                          # the value from k steps ago
    out = np.full(len(a), np.nan)
    out[k:] = a[:-k]
    return out

lag1, lag2 = shift(sales, 1), shift(sales, 2)
roll3 = np.array([sales[i - 3:i].mean() if i >= 3 else np.nan
                  for i in range(len(sales))])   # window ENDS at t-1
diff1 = sales - lag1

print(f"{'day':>4}{'y':>8}{'lag1':>8}{'lag2':>8}{'roll3':>8}{'diff1':>8}")
for i in range(len(sales)):
    cells = ''.join('     NaN' if np.isnan(v) else f'{v:8.2f}'
                    for v in (lag1[i], lag2[i], roll3[i], diff1[i]))
    print(f"{day[i]:>4}{sales[i]:8.1f}{cells}")

#  day       y    lag1    lag2   roll3   diff1
#    1    12.0     NaN     NaN     NaN     NaN
#    2    15.0   12.00     NaN     NaN    3.00
#    3    14.0   15.00   12.00     NaN   -1.00
#    4    18.0   14.00   15.00   13.67    4.00
#    5    21.0   18.00   14.00   15.67    3.00
#    6    19.0   21.00   18.00   17.67   -2.00
#    7    24.0   19.00   21.00   19.33    5.00
#    8    27.0   24.00   19.00   21.33    3.00
#    9    25.0   27.00   24.00   23.33   -2.00
#   10    30.0   25.00   27.00   25.33    5.00`,
      annotations: {
        8: 'Shift DOWN, never up. out[k:] = a[:-k] puts old values on new rows. Getting this backwards is the single most common leakage bug in forecasting code — and it produces a suspiciously excellent backtest.',
        12: 'sales[i-3:i] stops at i-1. It does NOT include today. A centered or inclusive window uses values that do not exist yet at prediction time; pandas rolling(3).mean() is inclusive of the current row, so you must .shift(1) it.',
        14: 'This column is differencing as a feature: model the change, not the level. Often the single most useful column on a trending series.',
        23: 'The warm-up rows are NaN by construction — there is no day 0. Drop them, or impute them and accept that you fabricated training data.',
        26: 'roll3 at day 4 is mean(12, 15, 14) = 13.67 — days 1 to 3 only. Day 4 itself is the answer we are trying to predict, so it cannot be in its own feature.',
      },
    },
    {
      type: 'intuition',
      title: 'The classical models, named honestly',
      md: `You should recognize these and know what each parameter means. You will rarely be the person tuning them.

- **Moving average** — predict the mean of the last k points. A baseline, not a model. Beat it before claiming anything.
- **Exponential smoothing** — a weighted average where weights decay geometrically into the past, controlled by α. **Holt** adds a trend term, **Holt-Winters** adds a seasonal one. Cheap, surprisingly hard to beat on short, clean series.
- **ARIMA(p, d, q)** — three integers: **p** = how many past *values* feed the prediction (AR, autoregression), **d** = how many times you differenced to reach stationarity, **q** = how many past *errors* feed it (MA, moving-average of residuals). SARIMA bolts a second (P, D, Q) on for the seasonal period.
- ARIMA assumes one series, roughly linear structure, and stationarity after differencing. It gives you honest prediction intervals, which tree models do not.
- Reach for it when you have one series, decent length, strong autocorrelation, and someone needs confidence bands.`,
    },
    {
      type: 'note',
      md: `**What actually wins on business data today:** build lag / rolling / date-part features and throw gradient boosting (LightGBM, XGBoost) at it. Reason it wins: real forecasting problems are multi-series (10,000 SKUs, not one) and full of exogenous columns — price, promo flag, holiday, weather — which ARIMA handles awkwardly and a GBM eats for breakfast. One model learns across all series and shares strength with the short ones. The tradeoff to state: you lose the clean prediction intervals and, critically, **a tree cannot extrapolate** — if sales trend past anything seen in training, the tree predicts the highest value it knows. Difference the target, or model the trend separately, when growth is real.`,
    },
    {
      type: 'intuition',
      title: 'The two rules that matter more than the model',
      md: `If you remember nothing else from this half of the module, remember these. Every senior forecasting failure is one of the two.

- **Rule 1 — never shuffle a time split.** Random k-fold puts December in the training set and October in test. The model interpolates inside known time, which it will never do in production, and the score is fiction. Use an **expanding window**: train on months 1–12, test 13; train 1–13, test 14; and so on. Cross-ref the cross-validation module for the split mechanics.
- Add a **gap** between train and test if your features use rolling windows, or the last training rows and first test rows overlap in time.
- **Rule 2 — never use a feature that will not exist at prediction time.** Forecasting tomorrow's demand with tomorrow's actual price, or with a "total monthly sales" column computed over the whole month, is target leakage wearing a lab coat.
- The test that catches both: for every column ask *"on the morning I make this prediction, do I physically have this number yet?"* If it needs a lag to be true, lag it. Cross-ref the data-leakage module.
- **Horizon:** a 1-step forecast is a different, easier problem than a 30-step one. If you predict step by step and feed predictions back in as lags, errors compound — each step inherits the last one's mistake. Either train a separate model per horizon, or accept widening intervals and say so.`,
    },
    {
      type: 'note',
      md: `**Where to read next, in one line each.** **Prophet** (Meta) — a decomposable trend + seasonality + holidays model with sane defaults and analyst-friendly knobs; excellent for business series with strong human calendars, no magic beyond that. **DeepAR / N-BEATS / Temporal Fusion Transformer** — deep models that train one network across thousands of related series and learn shared seasonality; they pay off when you have many series and a lot of them, not when you have one. Start every project with the naive baseline (predict last value, or last week's same weekday) — you would be startled how often it wins.`,
    },
  ],
  quiz: [
    {
      question: 'A film is uploaded today. Zero views, zero ratings. Which approach can recommend it at all right now?',
      options: [
        {
          text: 'Item-based collaborative filtering',
          explanation: 'It needs co-occurrence — users who consumed this item AND something else. With zero views there is no column to compare, so the item is invisible.',
        },
        {
          text: 'Content-based, using genre, cast and the description embedding',
          explanation: 'Correct. Item features exist the moment the item does, so a content-based retrieval source can surface it before any interaction is recorded. This is exactly why production systems are hybrids.',
        },
        {
          text: 'Matrix factorization on the interaction matrix',
          explanation: 'MF learns an item vector FROM interactions. No interactions, no vector — same cold-start wall as neighbourhood CF.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Why did Amazon ship item-item collaborative filtering rather than user-user?',
      options: [
        {
          text: 'Item-item similarities are far more stable than user tastes, so they can be precomputed offline and merely looked up at request time',
          explanation: 'Correct. "Printer buyers buy toner" holds for years; your taste drifts weekly. Also the user-user matrix is usually much bigger and keeps changing as users act. Precompute what does not move.',
        },
        {
          text: 'Item-item needs less training data than user-user',
          explanation: 'It consumes the same interaction matrix. The advantage is stability and serving cost, not data volume.',
        },
        {
          text: 'User-user cannot work with implicit feedback',
          explanation: 'It can — both variants work on implicit data. That is not the distinguishing issue.',
        },
      ],
      correct: 0,
    },
    {
      question: 'In matrix factorization, what is the predicted rating of user u for item i?',
      options: [
        {
          text: 'The cosine similarity between the two users’ rows in the original matrix',
          explanation: 'That is user-based neighbourhood CF, which works on the raw sparse matrix — not factorization.',
        },
        {
          text: 'The average of that user’s other ratings',
          explanation: 'That is a baseline predictor. Useful as a bias term, but it ignores the item entirely.',
        },
        {
          text: 'The dot product of the learned user vector and the learned item vector',
          explanation: 'Correct: r̂ = p_u · q_i. Both vectors live in the same k-dimensional latent space, and the dot product measures how much they point the same way — the same operation as an embedding similarity in GenAI.',
        },
      ],
      correct: 2,
    },
    {
      question: 'A team reports RMSE 0.81 on held-out star ratings and calls the recommender a success. What is the flaw?',
      options: [
        {
          text: 'RMSE 0.81 is too high for a rating scale of 1–5',
          explanation: 'The number is actually respectable. The problem is the choice of metric, not its value.',
        },
        {
          text: 'Users see a short ranked list, so what matters is which items reach the top — measure Precision@K and NDCG instead',
          explanation: 'Correct. RMSE spends effort on rating accuracy for items that will never be displayed. The Netflix Prize is the famous cautionary tale: the winning RMSE model was largely not shipped.',
        },
        {
          text: 'Nothing — RMSE is the standard recommender metric',
          explanation: 'It was the Netflix Prize target, and the industry moved away from it precisely because better RMSE did not produce better lists.',
        },
      ],
      correct: 1,
    },
    {
      question: 'What exactly is the "no negative signal" problem in implicit feedback?',
      options: [
        {
          text: 'A zero can mean "disliked" or "never saw it" — the model cannot distinguish rejection from absence',
          explanation: 'Correct. This is why implicit systems either weight unobserved items as low-confidence weak negatives or sample negatives during training. Both are approximations, and naming them is the interview point.',
        },
        {
          text: 'Users refuse to leave negative ratings out of politeness',
          explanation: 'That is a real bias in EXPLICIT feedback, but it is a different problem. Implicit feedback has no ratings at all.',
        },
        {
          text: 'Implicit datasets are smaller than explicit ones',
          explanation: 'The opposite: implicit data is vastly larger — every session generates it for free. Volume is its advantage; ambiguity is its cost.',
        },
      ],
      correct: 0,
    },
    {
      question: 'You have three years of daily sales and evaluate with shuffled 5-fold cross-validation. What breaks?',
      options: [
        {
          text: 'Nothing, as long as each fold has enough rows',
          explanation: 'Row count is not the issue. The i.i.d. assumption that justifies random folds does not hold for time series.',
        },
        {
          text: 'The folds are too small to capture yearly seasonality',
          explanation: 'A secondary concern at best. The fatal problem is temporal, not about size.',
        },
        {
          text: 'Random folds place future days in training and past days in test, so the model interpolates inside known time and the score is inflated',
          explanation: 'Correct. Production always asks you to extrapolate forward. Use an expanding-window split — train 1–12, test 13; train 1–13, test 14 — and add a gap if rolling features straddle the boundary.',
        },
      ],
      correct: 2,
    },
    {
      question: 'In ARIMA(p, d, q), what does d mean?',
      options: [
        {
          text: 'The number of input features supplied to the model',
          explanation: 'ARIMA in its base form uses only the series itself — there is no feature-count parameter.',
        },
        {
          text: 'How many times the series is differenced to make it stationary',
          explanation: 'Correct. p = past values used (AR), d = differencing order, q = past errors used (MA). d is almost always 0, 1 or 2 in practice.',
        },
        {
          text: 'The length of the seasonal period, such as 7 for weekly data',
          explanation: 'The seasonal period lives in SARIMA’s separate (P, D, Q, s) block, where s is the period — not in d.',
        },
      ],
      correct: 1,
    },
    {
      question: 'You add a 7-day rolling-mean feature computed with a window centered on day t. What is wrong with it?',
      options: [
        {
          text: 'Nothing — a centered window is smoother, therefore a better feature',
          explanation: 'Smoother is not better if the smoothing used the future. Smoothness is a cosmetic property; availability is a correctness one.',
        },
        {
          text: 'The window should be longer to capture the full weekly cycle',
          explanation: 'Seven days already covers a weekly cycle. Window length is not the defect here.',
        },
        {
          text: 'A centered window includes days t+1 to t+3, values that do not exist when the prediction is made — that is leakage',
          explanation: 'Correct, and it produces a beautiful backtest that collapses in production. Every window must end at t-1. In pandas, rolling() includes the current row, so shift(1) it.',
        },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Content-based versus collaborative filtering — explain both and say when you pick which.',
      answer:
        'Content-based uses ITEM features: build a user profile by averaging the features of items they liked, recommend nearest items. Collaborative filtering uses BEHAVIOUR only: the user-item interaction matrix, no item features required. Pick content-based when item metadata is rich and cold start is your dominant problem (new catalogue, new users, news). Pick CF when you have interaction volume and want serendipity — it finds cross-category associations no feature set encodes. Tradeoffs to name out loud: content-based creates a filter bubble and is capped by metadata quality; CF cold-starts badly at BOTH ends (new user, new item) and has popularity bias that starves the long tail. Real answer: hybrid — content features as one retrieval source, CF as another, one ranker over the union.',
      isCaseBased: false,
    },
    {
      question: 'Case: you are launching recommendations for a brand-new product line. Zero interaction data, 50,000 SKUs with titles, images and categories. Design the system for day 0, week 1, and month 3.',
      answer:
        'Day 0: there is no CF signal, so do not pretend. Ship (a) a popularity/best-seller fallback segmented by whatever context exists — category page, country, referrer, device — and (b) content-based similarity from title text plus image embeddings plus category, which gives you "similar items" and "because you viewed" without any history. Add a 3-tap onboarding if the product allows it. Week 1: session-based recommendations from the current basket and view sequence — co-view counts accumulate far faster than co-purchase, so use views as the first collaborative signal. Reserve a small exploration slice of traffic for unproven items, otherwise cold start becomes permanent for the tail. Month 3: item-item CF on accumulated co-purchase, then matrix factorization or a two-tower retrieval model once the matrix is dense enough; keep the content features as a retrieval source forever so new SKUs stay reachable. Measurement: you cannot A/B a system against nothing on day 0, so define the north-star metric (add-to-cart rate from the module, or downstream revenue per session) before launch and instrument it. Assumption worth stating: 50k SKUs is small enough that one retrieval stage may suffice — do not build two stages until latency demands it.',
      isCaseBased: true,
    },
    {
      question: 'Explain matrix factorization to an engineer who has never done ML, then say what it shares with word embeddings.',
      answer:
        'You have a giant table, users by items, and 99% of it is blank. Assume it is secretly simple — that a few dozen hidden traits explain most of it. Compress it into two skinny tables: 50 numbers per user, 50 numbers per item. To guess a missing cell, multiply the two vectors elementwise and add up — the dot product. If they point the same direction, it is a match. Nobody defines the 50 traits; training discovers them, and they often turn out interpretable (gritty vs cosy, old vs new). The connection: an item vector here IS an embedding — a learned dense vector where geometric proximity encodes semantic similarity, trained by a prediction task, and compared with a dot product. Word2vec factorizes a word co-occurrence matrix by nearly the same logic. Once you see this, ANN-based retrieval in recsys and vector search in a RAG system are the same infrastructure.',
      isCaseBased: false,
    },
    {
      question: 'Why does virtually every large system compute item-item similarity rather than user-user?',
      answer:
        'Three reasons. (1) Stability: item relationships persist for years while user taste drifts weekly, so item-item can be batch-computed nightly and served as a lookup — user-user would need constant recomputation. (2) Shape: users usually outnumber items by orders of magnitude, so the item-item matrix is smaller and cheaper to store. (3) Explainability: "because you bought X" is a sentence you can put on the page; "because users like you did" is not. The cost you should acknowledge: item-item recommends within the neighbourhood of what someone already consumed, so it is naturally conservative — it needs a diversity or exploration policy on top or the user ends up in a narrow loop.',
      isCaseBased: false,
    },
    {
      question: 'Explicit versus implicit feedback — which do you build on, and what does that choice cost you?',
      answer:
        'Build on implicit: clicks, watch-time, dwell, add-to-cart. Explicit ratings are rare (single-digit percent of users), selection-biased toward extremes, and slow. Implicit is generated by every session for free. The costs: (1) no negative signal — an unobserved item might be disliked or simply never surfaced, so you must either weight unobserved cells as low-confidence negatives or sample negatives per step; (2) position and exposure bias — the item at slot 1 gets clicked because it was at slot 1, so naive training teaches the model to reproduce whatever the previous model showed, and you need position features or debiasing to break the loop; (3) signal calibration — a 10-second view means opposite things for a clip and a feature film, so normalize by item length. Best practice is to combine several implicit signals as multiple prediction heads rather than collapsing them into one label.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through the architecture of a production recommender and justify each stage with numbers.',
      answer:
        'Two stages plus policy. Retrieval (candidate generation): millions of items down to a few hundred in roughly 10 ms, using cheap operations — approximate nearest neighbour over precomputed item embeddings, plus rule-based sources like subscriptions, recent items and trending. Ranking: a heavy model scoring those few hundred pairs with hundreds of features and several output heads (click, completion, like) in roughly 50 ms. Policy/re-rank: dedupe, diversity caps, freshness, exploration, business rules. The arithmetic is the justification — if a ranking pass costs ~1 ms per item, scoring 10 million items takes hours against a ~100 ms budget, so the catalogue must be cut before the expensive model ever sees it. Stage 1 optimizes recall, stage 2 optimizes ordering. Key failure mode: retrieval sets the ceiling — an item never retrieved can never be ranked, never shown, and never earns the data that would make it retrievable, which is exactly why an exploration slot exists.',
      isCaseBased: false,
    },
    {
      question: 'Why is RMSE the wrong metric for a recommender, and what would you use?',
      answer:
        'RMSE measures rating-prediction accuracy averaged over all items, but the product shows a short ranked list. Being right about a 4.1-vs-4.3 rating on an item that never appears earns nothing, while getting position 1 wrong costs everything. Use ranking metrics: Precision@K and Recall@K for "did the right items make the shown set", NDCG when position matters (gains discounted by log rank), MAP for multiple relevant items. Add product-level metrics that no single accuracy number captures: catalogue coverage, intra-list diversity, freshness, and long-tail share. Then accept that offline is only a filter — the decision metric is the online A/B on engagement or revenue, because offline evaluation is trained on logs produced by the previous model and cannot see counterfactuals.',
      isCaseBased: false,
    },
    {
      question: 'Case: your new ranker improves offline NDCG@10 by 8%, but the A/B test shows watch time DOWN 3%. Debug it.',
      answer:
        'Offline-online divergence is the classic recsys bug. Hypotheses in order. (1) Metric mismatch: NDCG was computed against clicks, but the business metric is watch time — the model likely learned clickbait, high click probability with short sessions. Test by breaking down click-through-rate versus completion rate; if CTR is up and completion down, that is it. (2) Feedback-loop bias: the offline set contains only items the OLD system showed, so the new ranker is scored on the old ranker’s candidate distribution and its genuinely novel picks are unevaluable. Test with an interleaving experiment. (3) Diversity collapse: a stronger ranker often concentrates on a narrow topic; measure intra-list diversity and unique-creator counts before and after. (4) Position/exposure bias baked into training labels. (5) Plumbing: latency. If the heavier model added 80 ms, engagement drops for reasons unrelated to quality — check p95 latency per arm before blaming the model. Fix path: train against a longer-horizon objective (completion or session-level satisfaction, not raw clicks), keep a diversity constraint in re-rank, and treat offline metrics as a shipping gate rather than a decision.',
      isCaseBased: true,
    },
    {
      question: 'What makes time-series modelling different from ordinary supervised learning? Name the assumption that breaks.',
      answer:
        'The i.i.d. assumption — independent and identically distributed rows — breaks on both halves. Not independent: today depends on yesterday, which is precisely the signal (autocorrelation) you exploit. Not identically distributed: mean and variance drift with trend and regime changes, so old rows come from a different world than new ones. Consequences: you cannot shuffle (order is information and shuffling leaks the future), your test set must be strictly later than train, cross-validation becomes an expanding or sliding window, and features must respect what was actually knowable at prediction time. Also note that classical models additionally demand stationarity, which is why differencing exists; ML models do not formally require it but still cannot extrapolate beyond the target range they saw in training.',
      isCaseBased: false,
    },
    {
      question: 'Case: a demand forecast scores MAPE 4% in backtest and 22% in production. Give four hypotheses and a test for each.',
      answer:
        '(1) Leakage through a feature unavailable at prediction time — a rolling window that included the current row, or a monthly aggregate computed over the whole month. Test: for every column, ask whether the value physically exists on the morning of the prediction; rebuild the backtest with a strict as-of join. (2) Shuffled or otherwise non-temporal splitting, so the backtest interpolated inside known time. Test: rerun with an expanding-window split and a gap; if the score collapses, the split was the bug. (3) Horizon mismatch — backtested at 1 step ahead but serving 30 steps, where recursive predictions compound their own errors. Test: report error by horizon; a rising curve confirms it. (4) Distribution shift — a promo calendar, a price change, a new regime not present in training. Test: compare feature distributions train versus live, and check whether errors cluster around specific dates or SKUs. Bonus hypothesis worth stating: MAPE itself is treacherous — it explodes on near-zero actuals and punishes over-forecasting asymmetrically, so a shift toward low-volume SKUs inflates it without the model getting worse. Compare with MAE or a scaled error such as MASE.',
      isCaseBased: true,
    },
    {
      question: 'ARIMA versus gradient boosting on lag features — when would you actually reach for ARIMA?',
      answer:
        'ARIMA(p, d, q) fits one series with p past values, d differences for stationarity and q past error terms; SARIMA adds a seasonal block. Reach for it when you have a single series or a handful, a decent length of history, strong autocorrelation, few or no external drivers, and a stakeholder who needs statistically grounded prediction intervals — ARIMA gives calibrated uncertainty that a GBM does not, without extra work. Reach for gradient boosting on lag/rolling/date features when you have many series (thousands of SKUs), rich exogenous variables (price, promo, holiday, weather), and non-linear interactions — one model learns across all series and lends strength to short ones. The tradeoff to state: the GBM cannot extrapolate outside the target range it saw, so on a genuinely trending series you must difference the target or model trend separately. And whichever you choose, benchmark against the naive baseline (last value, or last week’s same weekday) first — it wins more often than anyone expects.',
      isCaseBased: false,
    },
    {
      question: 'How do you cross-validate a time series, and how does forecast horizon change your setup?',
      answer:
        'Expanding-window (walk-forward) validation: train on periods 1..t, test on t+1..t+h, then roll forward and repeat, averaging the errors. Use a sliding window instead if old regimes are actively misleading and you want to weight recency. Add a gap between train and test equal to your longest rolling window so features do not straddle the boundary. Never shuffle, never use a random k-fold. Horizon: train and validate at the horizon you will actually serve — a 1-step model validated at 1 step tells you nothing about 30-step performance. Two strategies: direct, meaning a separate model per horizon (accurate, h models to maintain), or recursive, feeding predictions back as lags (one model, but errors compound step by step so intervals must widen). Always report error broken down by horizon rather than as one averaged number, because a flat average hides the fact that step 30 is guesswork.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    {
      front: 'Content-based vs collaborative filtering',
      back: 'Content-based: similar ITEMS by feature — handles new items, but filter bubble and metadata-limited. CF: behaviour of similar USERS, no item features — finds surprising cross-category hits, but cold start at BOTH ends plus popularity bias.',
    },
    {
      front: 'User-based vs item-based CF',
      back: 'User-based: find similar people. Item-based: find items consumed together. Item-based won in industry — item similarities are stable and precomputable, user taste drifts.',
    },
    {
      front: 'Matrix factorization',
      back: 'Factor the huge, ~99% empty user-item matrix into user and item vectors of size k. Predicted rating = DOT PRODUCT of the two. The item vector is an embedding — same idea as in GenAI.',
    },
    {
      front: 'Explicit vs implicit feedback',
      back: 'Explicit = stars (clean, rare, biased to extremes). Implicit = clicks/watch-time (noisy, abundant, what real systems use). Implicit has no negative signal: a 0 means disliked OR never seen.',
    },
    {
      front: 'Two-stage recommender',
      back: 'Retrieval: millions to ~hundreds in ~10 ms with cheap dot products over an embedding index. Ranking: heavy model scores those hundreds in ~50 ms. Retrieval sets the ceiling on everything downstream.',
    },
    {
      front: 'Recsys evaluation',
      back: 'RMSE on ratings is the wrong target — users see a short ranked list. Use Precision@K and NDCG (position-discounted), plus coverage and diversity. Decide on the online A/B.',
    },
    {
      front: 'Cold-start playbook',
      back: 'Popularity fallback (segmented) → onboarding preferences → session-based → content features for new items → forced exploration to buy data for the tail.',
    },
    {
      front: 'Why time series is different',
      back: 'Rows are not i.i.d. Order carries the signal (autocorrelation) and the distribution drifts. So: no shuffling, test set is always the future, features must be knowable at prediction time.',
    },
    {
      front: 'Stationarity, differencing, ARIMA(p, d, q)',
      back: 'Stationary = mean, variance and correlation structure do not depend on when you look; classical models require it. Fix by differencing: model Δy = y_t − y_{t-1}. In ARIMA: p = past VALUES (AR), d = number of differences, q = past ERRORS (MA). SARIMA adds a seasonal (P, D, Q, s) block.',
    },
    {
      front: 'The two time-series rules',
      back: '1) Never shuffle a time split — use an expanding window with a gap. 2) Never use a feature that will not exist at prediction time (rolling windows must end at t-1). Both produce gorgeous backtests and dead models.',
    },
  ],
  mindmapMarkdown: `- Recommendation Systems & Time-Series Basics
  - Content-based
    - Item features to similar items
    - Good for new items and stated preferences
    - Filter bubble, metadata-limited
  - Collaborative filtering
    - Behaviour only, no item features
    - User-based vs item-based
    - Item-based won: stable, precomputable
    - Cold start both ends, popularity bias
  - Matrix factorization
    - Huge ~99% empty matrix
    - rating = user vector . item vector
    - Latent factors = embeddings
    - Fit on OBSERVED cells only, plus L2
  - Feedback type
    - Explicit: stars, rare, biased
    - Implicit: clicks, watch-time, abundant
    - No negative signal, position bias
  - Two-stage serving
    - Retrieval: millions to hundreds, ~10 ms
    - Ranking: hundreds scored heavy, ~50 ms
    - Policy: diversity, freshness, exploration
    - Retrieval sets the ceiling
  - Evaluation
    - RMSE is the wrong target
    - Precision@K, NDCG (Metrics subject)
    - Coverage and diversity too
  - Cold-start playbook
    - Popularity fallback
    - Onboarding preferences
    - Content features, forced exploration
  - Time series basics
    - Not i.i.d., order matters
    - Trend + seasonality + residual
    - Stationarity, differencing
    - Autocorrelation to lag features
  - Models
    - Moving average baseline
    - Exponential smoothing, Holt-Winters
    - ARIMA(p, d, q), SARIMA
    - Lag features + gradient boosting wins
    - Prophet, DeepAR / N-BEATS / TFT next
  - The two rules
    - Never shuffle: expanding-window CV
    - No feature unavailable at prediction time
    - Longer horizon, compounding error`,
}

export default m
