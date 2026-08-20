import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l3-ranking-metrics',
  subjectId: 'metrics',
  level: 3,
  title: 'Ranking Metrics: Precision@K, MAP & NDCG',
  whyItMatters:
    'Search, feed, recommendations, RAG retrieval — the products that print money all output a LIST, and every classification metric you know throws away the one thing that matters in a list: position. NDCG is the number Google, Amazon and YouTube actually move, and "design a metric for YouTube recommendations" is a standing FAANG question. This module is the whole ranking evaluation stack, worked by hand.',
  estMinutes: 50,
  sections: [
    {
      type: 'intuition',
      title: 'The user sees a list, not a label',
      md: `Your model returns ten results. The right answer is in there — at position 9.

- A classifier would call that a win: the relevant document was retrieved, TP counted.
- The user calls it a loss. Nobody scrolls. Position 1 gets ~30% of clicks, position 10 gets ~2%.
- Same set of retrieved items, two different orderings, *identical* precision and recall. That is the bug.
- Precision, recall, F1, ROC-AUC — none of them contain the word "position". They are set metrics on a problem that is fundamentally about **order**.
- So ranking gets its own family: metrics where being right early is worth more than being right late.`,
    },
    {
      type: 'intuition',
      title: 'Precision@K and Recall@K — cut the list where the eye stops',
      md: `The laziest honest fix: throw away everything below position K, then compute the metrics you already know.

- **Precision@K** — of the top K results, what fraction is relevant. "Of the 10 blue links, how many were useful?"
- **Recall@K** — of all the relevant items that exist, what fraction made it into the top K.
- Precision@K is what the user feels. Recall@K is what a retrieval stage is graded on, because its job is to not lose the good candidates before the reranker sees them.
- K is not a hyperparameter you tune. **K comes from the UI**: 10 blue links, 5 recommendation slots on a shelf, 3 autocomplete suggestions, 20 candidates fed to a reranker. Ask the designer, not the model.
- Both ignore order *inside* the cut. Swap position 1 with position 10 and Precision@10 does not move. That is the next problem.`,
    },
    {
      type: 'math',
      intro: 'Both are the familiar formulas with the list truncated at K.',
      latex: [
        '\\text{Precision@}K = \\frac{|\\{\\text{relevant}\\} \\cap \\{\\text{top } K\\}|}{K} \\qquad \\text{Recall@}K = \\frac{|\\{\\text{relevant}\\} \\cap \\{\\text{top } K\\}|}{|\\{\\text{relevant}\\}|}',
        '\\text{If only } R \\text{ relevant items exist and } R < K: \\quad \\text{Precision@}K \\leq \\frac{R}{K} < 1',
      ],
    },
    {
      type: 'note',
      md: `That second line is the caveat that catches people. If a query has only **3** relevant documents in the whole corpus, a *perfect* ranker still scores Precision@10 = 0.3. The metric is capped by the data, not by the model, and the cap differs per query — so averaging Precision@10 across queries silently averages different ceilings. Two defences: report Recall@K alongside it, or use a metric that normalises per query. NDCG does exactly that, which is half of why it won.`,
    },
    {
      type: 'intuition',
      title: 'MRR — for when there is exactly one right answer',
      md: `Question: "who wrote The Old Man and the Sea?" There is one correct answer. Rank is the only thing left to measure.

- **Reciprocal rank** = 1 / (position of the first relevant result). Rank 1 → 1.0. Rank 2 → 0.5. Rank 5 → 0.2. Rank 10 → 0.1.
- **MRR** = that, averaged over all queries.
- The shape of 1/rank is the point: the drop from rank 1 to rank 2 costs 0.5, the drop from rank 9 to rank 10 costs 0.011. Brutally top-heavy, which matches how people read.
- Use it when the task has **one** right answer: factoid QA, "did the retriever surface the right doc", entity lookup, a chatbot picking one FAQ.
- Do not use it when many results are relevant — it grades only the first hit and is blind to everything after it. A list of [good, garbage, garbage] and a list of [good, good, good] both score 1.0.`,
    },
    {
      type: 'math',
      intro: 'MRR over a query set Q. One term per query, nothing else in it.',
      latex: [
        '\\text{MRR} = \\frac{1}{|Q|}\\sum_{q \\in Q} \\frac{1}{\\text{rank}_q}, \\qquad \\text{rank}_q = \\text{position of the FIRST relevant result}',
        '\\text{If no relevant result appears in the list, the term is defined as } 0.',
      ],
    },
    {
      type: 'intuition',
      title: 'MAP — reward every hit, weighted by how early it came',
      md: `MRR only looks at the first hit; Precision@K only looks at one cut. **Average precision** takes every cut where a hit lands.

- Walk down the list. Every time you hit a relevant item, write down Precision@(that rank).
- Average those numbers over the total number of relevant items. That is **AP** — one query, one score.
- **MAP** = mean of AP over all queries. The M is only about averaging across queries; the "average" inside AP is across ranks.
- Why it behaves well: a hit at rank 1 records precision 1.0, the same hit at rank 9 records something near 0.1. Misses never get averaged in directly — they punish you by pushing every later hit down.
- Relevance here is **binary**: relevant or not. If your raters give grades, MAP throws that information away.`,
    },
    {
      type: 'math',
      intro: 'AP for one query, then MAP. R = number of relevant items for that query.',
      latex: [
        '\\text{AP} = \\frac{1}{R}\\sum_{k=1}^{n} \\text{Precision@}k \\cdot \\mathbf{1}[\\,\\text{item at rank } k \\text{ is relevant}\\,]',
        '\\text{MAP} = \\frac{1}{|Q|}\\sum_{q \\in Q} \\text{AP}_q',
      ],
    },
    {
      type: 'note',
      md: `**Work it by hand.** Query A returns five results, relevance pattern **[hit, miss, hit, miss, hit]**. Precision at each rank: 1/1 = 1.00, 1/2 = 0.50, 2/3 = 0.67, 2/4 = 0.50, 3/5 = 0.60. Keep only the ranks holding a hit — 1.00, 0.67, 0.60 — and average over R = 3: **AP = 2.267 / 3 = 0.756**. Query B returns **[miss, miss, hit, hit, miss]**: precision at the hits is 1/3 = 0.333 and 2/4 = 0.50, so AP = 0.833 / 2 = **0.417**. **MAP = (0.756 + 0.417) / 2 = 0.586**. And MRR over the same two queries = (1/1 + 1/3) / 2 = **0.667** — note how much kinder MRR is to query B, because it stops looking after the first hit.`,
    },
    {
      type: 'intuition',
      title: 'NDCG — the one FAANG actually uses',
      md: `Two upgrades on MAP, and both are things real search teams need.

- **Graded relevance.** Human raters do not say yes/no, they say *perfect / good / okay / irrelevant* → 3 / 2 / 1 / 0. NDCG consumes those grades directly; MAP has to flatten them to binary first.
- **A smooth position discount.** Each item's gain is divided by log2(rank + 1): position 1 keeps 100% of its gain, position 3 keeps 50%, position 10 keeps 29%.
- Sum those discounted gains → **DCG** (discounted cumulative gain).
- Problem: DCG is unbounded and query-dependent. A query with six perfect results scores higher than a query with one, no matter how good the ranker is.
- Fix: divide by **IDCG** — the DCG of the *ideal* ordering of the same items (grades sorted descending). Now every query's ceiling is 1.0.
- **NDCG = DCG / IDCG, always in [0, 1]**, comparable across queries, averageable over a whole traffic sample. That is why it is the default in search.`,
    },
    {
      type: 'math',
      intro: 'DCG, IDCG, NDCG. The log in the denominator is the entire idea.',
      latex: [
        '\\text{DCG@}K = \\sum_{i=1}^{K} \\frac{\\text{rel}_i}{\\log_2(i+1)} \\qquad \\text{(exponential-gain variant: } \\sum_i \\frac{2^{\\text{rel}_i}-1}{\\log_2(i+1)} \\text{)}',
        '\\text{IDCG@}K = \\text{DCG@}K \\text{ of the same items sorted by relevance, descending}',
        '\\text{NDCG@}K = \\frac{\\text{DCG@}K}{\\text{IDCG@}K} \\;\\in\\; [0, 1]',
      ],
    },
    {
      type: 'note',
      md: `Why *log2(i+1)* specifically? It is a design choice, not a derivation. It gives a discount that starts at exactly 1 for rank 1 and decays slowly enough that positions 5–20 still count for something — matching how people actually scan a page better than 1/rank (too brutal) or a constant (no discount at all). The **exponential gain** 2^rel − 1 is the other common variant: it turns grades 0/1/2/3 into gains 0/1/3/7, so a "perfect" result is worth 7 "okay" results instead of 3. Web search uses it because relevance grades are not linear in user value. Both variants are legitimate — **state which one you used**, because the numbers differ (0.921 vs 0.946 on the example below).`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One query, five results — every ranking metric computed position by position',
        notice: 'Same five results throughout. Step down the list and watch each metric accumulate — then watch the last two frames rebuild the ideal ordering to get IDCG.',
        leftLabel: 'ranked list',
        rightLabel: 'what the metric records',
        frames: [
          {
            note: 'Five results for one query, in the order the ranker chose. Human raters graded each: 3 = perfect, 2 = good, 1 = okay, 0 = irrelevant.',
            stack: [
              { name: 'pos 1', value: 'grade 3', to: 'r1' },
              { name: 'pos 2', value: 'grade 0', to: 'r2', danger: true },
              { name: 'pos 3', value: 'grade 2', to: 'r3' },
              { name: 'pos 4', value: 'grade 0', to: 'r4', danger: true },
              { name: 'pos 5', value: 'grade 1', to: 'r5' },
            ],
            heap: [
              { id: 'r1', value: 'relevant', label: 'hit' },
              { id: 'r2', value: 'irrelevant', label: 'miss' },
              { id: 'r3', value: 'relevant', label: 'hit' },
              { id: 'r4', value: 'irrelevant', label: 'miss' },
              { id: 'r5', value: 'relevant', label: 'hit' },
            ],
          },
          {
            note: 'Precision@K = hits in the top K, divided by K. It updates at every cut. Note P@2 < P@1: one miss at position 2 halves the score.',
            stack: [
              { name: 'pos 1', value: 'hit', to: 'p1' },
              { name: 'pos 2', value: 'miss', to: 'p2', danger: true },
              { name: 'pos 3', value: 'hit', to: 'p3' },
              { name: 'pos 4', value: 'miss', to: 'p4', danger: true },
              { name: 'pos 5', value: 'hit', to: 'p5' },
            ],
            heap: [
              { id: 'p1', value: 'P@1 = 1/1 = 1.00' },
              { id: 'p2', value: 'P@2 = 1/2 = 0.50' },
              { id: 'p3', value: 'P@3 = 2/3 = 0.67' },
              { id: 'p4', value: 'P@4 = 2/4 = 0.50' },
              { id: 'p5', value: 'P@5 = 3/5 = 0.60' },
            ],
          },
          {
            note: 'Average precision keeps ONLY the rows where a hit sits: 1.00, 0.67, 0.60. Average over R = 3 relevant items -> AP = 0.756. The misses never enter the average; they hurt by pushing later hits down.',
            stack: [
              { name: 'pos 1', value: 'hit', to: 'a1' },
              { name: 'pos 2', value: 'miss', to: 'a2', danger: true },
              { name: 'pos 3', value: 'hit', to: 'a3' },
              { name: 'pos 4', value: 'miss', to: 'a4', danger: true },
              { name: 'pos 5', value: 'hit', to: 'a5' },
            ],
            heap: [
              { id: 'a1', value: '1.00', label: 'counted' },
              { id: 'a2', value: '-', label: 'skipped' },
              { id: 'a3', value: '0.67', label: 'counted' },
              { id: 'a4', value: '-', label: 'skipped' },
              { id: 'a5', value: '0.60', label: 'counted' },
            ],
          },
          {
            note: 'Now NDCG. Forget relevance for a second — every POSITION carries a fixed discount 1 / log2(rank + 1). Position 1 keeps all of its gain; position 5 keeps 39% of it.',
            stack: [
              { name: 'pos 1', to: 'd1' },
              { name: 'pos 2', to: 'd2' },
              { name: 'pos 3', to: 'd3' },
              { name: 'pos 4', to: 'd4' },
              { name: 'pos 5', to: 'd5' },
            ],
            heap: [
              { id: 'd1', value: '1/log2(2) = 1.000' },
              { id: 'd2', value: '1/log2(3) = 0.631' },
              { id: 'd3', value: '1/log2(4) = 0.500' },
              { id: 'd4', value: '1/log2(5) = 0.431' },
              { id: 'd5', value: '1/log2(6) = 0.387' },
            ],
          },
          {
            note: 'Multiply each grade by its position discount and sum: 3.000 + 0 + 1.000 + 0 + 0.387 = DCG = 4.387. The grade-2 item at position 3 contributed only 1.0 — half its value, paid to the log.',
            stack: [
              { name: 'pos 1', value: 'grade 3', to: 'g1' },
              { name: 'pos 2', value: 'grade 0', to: 'g2', danger: true },
              { name: 'pos 3', value: 'grade 2', to: 'g3' },
              { name: 'pos 4', value: 'grade 0', to: 'g4', danger: true },
              { name: 'pos 5', value: 'grade 1', to: 'g5' },
            ],
            heap: [
              { id: 'g1', value: '3 x 1.000 = 3.000' },
              { id: 'g2', value: '0 x 0.631 = 0.000' },
              { id: 'g3', value: '2 x 0.500 = 1.000' },
              { id: 'g4', value: '0 x 0.431 = 0.000' },
              { id: 'g5', value: '1 x 0.387 = 0.387', label: 'DCG 4.387' },
            ],
          },
          {
            note: 'IDCG: the SAME five grades, reordered perfectly (3, 2, 1, 0, 0), scored the same way. 3.000 + 1.262 + 0.500 = IDCG = 4.762. That is the best any ranker could do on this query — the ceiling.',
            stack: [
              { name: 'pos 1', value: 'grade 3', to: 'i1' },
              { name: 'pos 2', value: 'grade 2', to: 'i2' },
              { name: 'pos 3', value: 'grade 1', to: 'i3' },
              { name: 'pos 4', value: 'grade 0', to: 'i4' },
              { name: 'pos 5', value: 'grade 0', to: 'i5' },
            ],
            heap: [
              { id: 'i1', value: '3 x 1.000 = 3.000' },
              { id: 'i2', value: '2 x 0.631 = 1.262' },
              { id: 'i3', value: '1 x 0.500 = 0.500' },
              { id: 'i4', value: '0 x 0.431 = 0.000' },
              { id: 'i5', value: '0 x 0.387 = 0.000', label: 'IDCG 4.762' },
            ],
          },
          {
            note: 'NDCG = DCG / IDCG = 4.387 / 4.762 = 0.921. Bounded in [0, 1], and comparable against a query with twenty relevant docs or one — which raw DCG never is. Average it over your query sample and that is the number the team reports.',
            stack: [
              { name: 'DCG', value: '4.387' },
              { name: 'IDCG', value: '4.762' },
              { name: 'NDCG', value: '0.921', to: 'n1' },
            ],
            heap: [
              { id: 'n1', value: '0.921 of a possible 1', label: 'this query' },
              { id: 'n2', value: 'mean over all queries', label: 'the reported number' },
            ],
          },
        ],
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Every metric by hand on that list, then checked against sklearn',
      code: `import numpy as np
from sklearn.metrics import ndcg_score

rel = np.array([3, 0, 2, 0, 1])           # graded relevance, in ranked order
hit = (rel > 0).astype(float)             # binary view, for P@K and AP
k = np.arange(1, len(rel) + 1)

prec_at_k = hit.cumsum() / k              # precision at every prefix
ap = (prec_at_k * hit).sum() / hit.sum()  # average ONLY at ranks holding a hit
mrr_q = 1 / k[hit == 1][0]                # 1 / rank of the first hit

disc = 1 / np.log2(k + 1)                 # the position discount
dcg = (rel * disc).sum()
idcg = (np.sort(rel)[::-1] * disc).sum()  # same grades, perfect order
print('P@k      ', prec_at_k.round(3))
print('AP %.4f   RR %.4f' % (ap, mrr_q))
print('DCG %.4f  IDCG %.4f  NDCG %.4f' % (dcg, idcg, dcg / idcg))

scores = np.arange(len(rel), 0, -1)       # any decreasing scores reproduce this order
print('sklearn linear-gain NDCG %.4f' % ndcg_score([rel], [scores]))
print('sklearn 2^rel-1 NDCG    %.4f' % ndcg_score([2.0 ** rel - 1], [scores]))

# ---- real output ----
# P@k       [1.    0.5   0.667 0.5   0.6  ]
# AP 0.7556   RR 1.0000
# DCG 4.3869  IDCG 4.7619  NDCG 0.9212
# sklearn linear-gain NDCG 0.9212
# sklearn 2^rel-1 NDCG    0.9461`,
      annotations: {
        4: 'The list is already in ranked order, so the array index IS the position. Nothing else in this file needs to know about scores.',
        9: 'The whole of average precision in one line: multiply the precision-at-every-prefix vector by the hit mask, so only hit ranks survive, then divide by the number of relevant items.',
        14: 'IDCG is the same grades sorted descending against the SAME discount vector — the ideal ordering, not a different dataset.',
        19: 'sklearn wants scores, not an order. Any strictly decreasing vector produces the ranking we already have, so the comparison is apples to apples.',
        21: 'Feeding 2^rel - 1 as the labels is how you get the exponential-gain NDCG out of sklearn: 0.9461 vs 0.9212. Same ranking, different convention — always say which.',
      },
    },
    {
      type: 'intuition',
      title: 'Which one, when — the 20-second answer',
      md: `Pick by the shape of the label, not by fashion.

- **MRR** — exactly one correct answer per query. Factoid QA, "did retrieval surface the right doc", a bot choosing one FAQ. Blind to everything after the first hit.
- **MAP** — binary relevance, many relevant items, and you care about the whole list. Classic IR benchmarks, legal/patent search where missing anything is expensive.
- **NDCG** — graded relevance and position both matter. The default for web search, product search and feeds. Also the only one of the three whose per-query ceiling is normalised.
- **Precision@K / Recall@K** — reporting to humans, and grading a *stage*. Recall@100 for the candidate generator, NDCG@10 for the reranker.
- Sanity rule: if you cannot say what a "relevance grade" means for your product and who assigns it, you are not ready for NDCG yet.`,
    },
    {
      type: 'intuition',
      title: 'The uncomfortable part: offline metrics score a biased log',
      md: `Every number above is computed against **logged data** — impressions and clicks produced by the ranker you already have. That log is not a neutral sample of the world.

- **Position bias.** Users click position 1 partly *because* it is position 1. Your labels reward the old ranking, so a new ranker looks worse for being different.
- **Presentation bias.** Thumbnail, title, snippet, badge — a click measures the presentation as much as the item.
- **The missing counterfactual.** You have no data on the item ranked 300th, so a new model that surfaces it gets no credit. Offline evaluation can only score reorderings of what was already shown.
- **Selection bias in graded data.** Human raters usually grade the top-K of the *current* system, so IDCG itself is computed over a pool the old ranker chose.
- Net effect: offline NDCG systematically **understates** genuinely novel rankers and overstates ones that mimic the incumbent.`,
    },
    {
      type: 'note',
      md: `So what is the real judge? **Online A/B tests**, on live traffic, against business outcomes — and **interleaving** when you need an answer fast: mix two rankers' results into one list and see which side's items get clicked, which cancels most position bias and needs roughly 10–100× less traffic than a full A/B test. Offline metrics stay useful as a **cheap filter**: they run in minutes, they catch regressions before they touch users, and they let you kill 90% of candidate models for free. The senior sentence is *"NDCG gates what we bother to A/B test; the A/B test decides what ships."* Partial repairs exist too — inverse-propensity weighting divides each click by its estimated position bias — but they need a propensity model and a slice of randomised traffic to fit it. Nobody escapes online testing.`,
    },
    {
      type: 'intuition',
      title: 'Design a metric for YouTube recommendations — do it in the right order',
      md: `This question is not about NDCG. It is about whether you start from the business or from the formula. Start from the business.

- **Step 1 — name the goal, not the metric.** Not "more engagement". Something like *long-term user retention*: users who keep coming back next month, and next year.
- **Step 2 — admit the goal is unmeasurable today.** Retention lands in 30–90 days; the ranker needs a signal per impression. So you need proxies, and you must be explicit that they *are* proxies.
- **Step 3 — walk the proxy ladder**, cheapest and most biased first: impression → click (CTR) → watch time → completion rate → explicit survey rating → next-day return → 28-day retention.
- **Step 4 — pick a primary, then defend it.** Watch time beats CTR, but neither is the goal; they are the best available correlates with retention.
- **Step 5 — put NDCG in its box.** Graded "satisfaction" labels + a ranked shelf → NDCG@5 is your *offline* proxy. It is the filter, not the objective.`,
    },
    {
      type: 'intuition',
      title: 'Why optimising the proxy is the whole danger',
      md: `Every proxy on that ladder breaks in a specific, nameable way. Say the failure mode out loud before the interviewer does.

- **CTR → clickbait.** Optimise clicks and the system learns that shocking thumbnails and lying titles win. The click happens, the user quits at 8 seconds, and by the metric you had a great day.
- **Watch time → padding and doomscroll.** Reward seconds and you promote 40-minute videos with the answer at minute 38, and autoplay chains people regret. YouTube hit this in reality and had to add satisfaction signals.
- **Completion rate → trivially short videos.** A 12-second clip completes every time.
- The general law (Goodhart): *when a measure becomes a target, it stops being a good measure*. The model will find the gap between the proxy and the goal faster than you will.
- Defence: never optimise a single proxy. Use a **primary metric plus guardrails**, and refresh the pairing as the system learns to game it.`,
    },
    {
      type: 'note',
      md: `**Guardrail metrics** are the ones that must not get worse, even if the primary improves: survey satisfaction ("was this video worth your time?"), the "not interested" / dislike rate, diversity of recommended channels, share of watch time going to borderline or low-quality content, creator-side fairness (does a new creator ever get a shot?), and latency. A launch that lifts watch time 2% while satisfaction drops 1% does not ship. The **multi-objective reality**: production rankers do not optimise one number — they predict several (P(click), P(watch to 70%), P(share), P(dislike), predicted satisfaction) and combine them into one ranking score, weights tuned by what the A/B tests do to retention. Saying *"one primary metric, a set of guardrails, and a weighted multi-objective score whose weights are set by A/B outcomes"* is the answer a senior gives.`,
    },
  ],
  quiz: [
    {
      question: 'Two rankers return the same 10 documents for a query, but in different orders. Which metric can tell them apart?',
      options: [
        { text: 'Precision@10', explanation: 'It cannot. The same 10 documents give the same hit count over the same cut, whatever the order. This is exactly why ranking needs its own metrics.' },
        { text: 'Recall@10', explanation: 'Also blind here — recall counts which relevant items made the cut, not where they landed inside it.' },
        { text: 'NDCG@10', explanation: 'Correct. Each item is discounted by 1/log2(rank+1), so moving a relevant document from position 8 to position 1 changes the sum. MAP and MRR are also order-sensitive.' },
      ],
      correct: 2,
    },
    {
      question: 'A query has only 2 relevant documents in the entire corpus. A perfect ranker puts both at positions 1 and 2. What is Precision@10?',
      options: [
        { text: '1.0 — the ranking is perfect', explanation: 'Precision@10 divides by K = 10 regardless of how many relevant items exist. Perfection does not save you.' },
        { text: '0.2 — capped by the number of relevant items', explanation: 'Correct: 2/10. The ceiling is R/K, set by the data, not the model. This is why averaging Precision@K across queries averages different ceilings, and why NDCG normalises per query.' },
        { text: 'Undefined', explanation: 'It is perfectly well defined — just capped. Recall@10 here would be 1.0, which is why you report both.' },
      ],
      correct: 1,
    },
    {
      question: 'For which task is MRR the right choice?',
      options: [
        { text: 'A product search page where dozens of items are relevant', explanation: 'MRR grades only the first hit and ignores everything after it — it would give full marks to [good, garbage, garbage]. Use NDCG.' },
        { text: 'A news feed ranked by graded editorial quality', explanation: 'Graded relevance plus a full list is the textbook NDCG case; MRR would throw the grades away entirely.' },
        { text: 'A factoid QA system where exactly one document contains the answer', explanation: 'Correct. One correct answer means the only question left is how high it ranked, and 1/rank answers it. Same logic for "did the retriever surface the right doc".' },
      ],
      correct: 2,
    },
    {
      question: 'A 5-item list has relevance pattern [miss, hit, miss, hit, miss] with R = 2. What is AP?',
      options: [
        { text: '(0.5 + 0.5) / 2 = 0.500', explanation: 'Correct. Precision at rank 2 is 1/2 = 0.5; precision at rank 4 is 2/4 = 0.5; average those two over R = 2. Only hit ranks are averaged.' },
        { text: '(0 + 0.5 + 0 + 0.5 + 0) / 5 = 0.200', explanation: 'Wrong denominator and wrong terms — AP averages precision only at ranks holding a hit, divided by the number of relevant items, not by list length.' },
        { text: '2 / 5 = 0.400', explanation: 'That is Precision@5, a single cut. AP integrates precision over every cut where a relevant item appears.' },
      ],
      correct: 0,
    },
    {
      question: 'Why divide DCG by IDCG at all?',
      options: [
        { text: 'To make the metric differentiable for training', explanation: 'NDCG is not differentiable either way — its sorting step has zero gradient. That is a separate problem, solved by surrogate ranking losses.' },
        { text: 'To remove the position discount', explanation: 'The discount survives normalisation — it is in both numerator and denominator. Normalisation removes the query-dependent ceiling, not the discount.' },
        { text: 'To bound the score in [0, 1] so queries with different numbers of relevant items are comparable', explanation: 'Correct. Raw DCG rewards queries that simply have more relevant documents. IDCG is the best achievable DCG for that exact query, so the ratio measures the ranker, not the query.' },
      ],
      correct: 2,
    },
    {
      question: 'Your offline NDCG@10 improves by 4% on logged click data. What does that entitle you to claim?',
      options: [
        { text: 'The new ranker is better and should ship', explanation: 'No. Clicks in the log were produced by the old ranker under position and presentation bias, and you have no data on items the old system never showed.' },
        { text: 'It is worth A/B testing — offline metrics are a filter, not a verdict', explanation: 'Correct, and this is the senior framing. Offline metrics are cheap enough to kill bad candidates in minutes; online A/B tests or interleaving decide what ships.' },
        { text: 'Nothing at all — offline metrics are worthless', explanation: 'Overcorrection. They are biased, not useless: they catch regressions before users see them and cut the candidate set cheaply. The bias means they cannot be the final word.' },
      ],
      correct: 1,
    },
    {
      question: 'A recommender team optimises CTR. Watch time is flat, CTR is up 12%, and 30-day retention drops. Most likely cause?',
      options: [
        { text: 'The model is underfitting', explanation: 'CTR went UP by 12% — the model learned the target it was given very well. The problem is the target.' },
        { text: 'The metric is too hard to compute at serving time', explanation: 'Compute cost has nothing to do with retention moving the wrong way.' },
        { text: 'CTR is a proxy, and the model found the gap between the proxy and the goal — clickbait', explanation: 'Correct. Goodhart in one paragraph: clicks rose, satisfaction fell, users left. Fix by adding satisfaction/completion signals to the objective and holding retention and dislike rate as guardrails.' },
      ],
      correct: 2,
    },
    {
      question: 'When does MAP throw away information that NDCG keeps?',
      options: [
        { text: 'When relevance is graded (perfect / good / okay / irrelevant)', explanation: 'Correct. MAP needs binary labels, so grades must be flattened first — a "perfect" and an "okay" result become the same hit. NDCG uses the grade directly as the gain.' },
        { text: 'When the list is longer than 10 items', explanation: 'Both handle any list length; the cut is a choice of K, not a limitation of either metric.' },
        { text: 'When there is exactly one relevant item', explanation: 'With one relevant item AP reduces to 1/rank — it equals reciprocal rank and loses nothing that NDCG would keep.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why can you not just use precision and recall to evaluate a search engine?',
      answer:
        'Because they are set metrics on an ordering problem. Retrieve the same ten documents in two different orders and precision, recall, F1 and ROC-AUC are all identical, while the user experience is completely different — position 1 takes roughly 30% of clicks and position 10 takes about 2%. Precision@K adds a cut but is still blind inside the cut. Ranking metrics fix this by weighting by position: MRR through 1/rank, MAP through precision measured at each hit rank, NDCG through a 1/log2(rank+1) discount. Business cost of getting this wrong: you ship a model that looks equivalent offline and loses clicks, sessions and revenue in production.',
      isCaseBased: false,
    },
    {
      question: 'Compute NDCG@5 on grades [3, 0, 2, 0, 1] on a whiteboard, out loud.',
      answer:
        'Discounts first: 1/log2(2)=1.000, 1/log2(3)=0.631, 1/log2(4)=0.500, 1/log2(5)=0.431, 1/log2(6)=0.387. DCG = 3(1.000) + 0(0.631) + 2(0.500) + 0(0.431) + 1(0.387) = 3 + 1 + 0.387 = 4.387. Ideal ordering is the same grades sorted: [3, 2, 1, 0, 0], so IDCG = 3(1.000) + 2(0.631) + 1(0.500) = 3 + 1.262 + 0.5 = 4.762. NDCG = 4.387 / 4.762 = 0.921. Then flag the convention: with exponential gains 2^rel − 1 the same ranking scores 0.946, so always state which gain you used. The interviewer is checking whether you can produce IDCG without being told what "ideal" means.',
      isCaseBased: false,
    },
    {
      question: 'MRR, MAP or NDCG — how do you choose, and what does each one hide?',
      answer:
        'By the label shape. MRR when there is exactly one right answer (factoid QA, "did retrieval find the doc") — it hides everything below the first hit, so [good, garbage, garbage] and [good, good, good] both score 1.0. MAP when relevance is binary and the whole list matters (legal, patent, classic IR) — it hides grade information, treating a perfect and a barely-okay result identically. NDCG when relevance is graded and position matters, which is web and product search — it hides nothing much, but it depends on a rating pipeline you have to fund, its gain convention changes the number, and its IDCG is computed over the pool of items the current system surfaced. Precision@K and Recall@K stay useful for talking to humans and for grading a candidate-generation stage separately from a reranker.',
      isCaseBased: false,
    },
    {
      question: 'Case: design a metric for YouTube recommendations.',
      answer:
        'Start from the goal, not the formula. The business goal is long-term user retention — people coming back next month — and creator ecosystem health. That is unmeasurable per impression, so I need proxies and I will say out loud that they are proxies: impression → click → watch time → completion → explicit "was this worth your time" survey → next-day return → 28-day retention, in increasing order of fidelity and cost. Primary metric: satisfied watch time (watch time filtered by a satisfaction signal), because raw CTR gets you clickbait and raw watch time gets you 40-minute padding and doomscroll. Guardrails that must not regress: survey satisfaction, dislike/"not interested" rate, diversity of channels surfaced, share of watch time on borderline content, latency. Offline proxy for iteration: NDCG@5 over graded satisfaction labels on the shelf, used as a cheap filter — not the objective. Then the honest closing: production ranks on a multi-objective score blending P(click), P(long watch), P(share), P(dislike) with weights tuned by what A/B tests do to retention, and each proxy gets re-audited once the model learns to game it. Business cost of getting it wrong is concrete: the clickbait era of recommendation systems drove short-term watch time up and users away.',
      isCaseBased: true,
    },
    {
      question: 'Case: your reranker improves offline NDCG@10 by 6%, but the A/B test shows no change in clicks. Explain and debug.',
      answer:
        'Start by trusting the A/B test — it measures users, the offline number measures a log. Hypotheses in order: (1) Position/presentation bias — the offline labels are clicks generated under the old ranking, so a model that reproduces the old order scores well and a genuinely different one is penalised or flattered arbitrarily; check whether the NDCG gain came from reordering within the top 3 (invisible to users) or lower down. (2) The gain is concentrated in a query segment with no traffic — head/torso/tail slicing usually reveals a big lift on rare queries that nobody issues. (3) Ceiling effect — the old ranker was already good on the queries that matter, so the theoretical headroom in clicks is small; compute the implied click delta from the NDCG delta before believing it. (4) Metric mismatch — NDCG on human grades and clicks are different targets; the raters may value comprehensiveness where users value speed. (5) Test power — 6% NDCG may translate to a 0.2% CTR effect that the test simply cannot detect; check the minimum detectable effect. Next step: run an interleaving experiment, which removes most position bias and needs far less traffic to reach significance.',
      isCaseBased: true,
    },
    {
      question: 'Why is offline ranking evaluation fundamentally biased, and what do you do about it?',
      answer:
        'Three named biases. Position bias: users click the top result partly because it is on top, so the labels encode the old ranking. Presentation bias: a click reflects thumbnail, title and snippet as much as the item. The missing counterfactual: you have no feedback on documents the current system never showed, so any model that surfaces genuinely new items gets no credit — offline evaluation can only score reorderings of what was already displayed. Graded data has its own version: raters usually grade the current top-K, so even IDCG is computed over a pool the incumbent chose. Mitigations, in increasing cost: inverse-propensity weighting (divide each click by its estimated examination probability, which needs a propensity model fit on a slice of randomised traffic), a small always-on randomisation bucket to collect unbiased data, interleaving for fast online comparisons, and full A/B tests for launch decisions. The framing to state: offline metrics are a cheap filter that kills bad candidates in minutes; online experiments decide what ships.',
      isCaseBased: false,
    },
    {
      question: 'What exactly is interleaving, and why would you use it instead of a normal A/B test?',
      answer:
        'Instead of splitting users between ranker A and ranker B, you split the list: build one result page by alternating items from both rankers (team-draft or balanced interleaving), show it to every user, and attribute each click to whichever ranker contributed that item. Because both rankers are exposed to the same user, the same query and the same page positions, per-user variance and most position bias cancel out — so it typically needs 10–100× less traffic than an A/B test to reach the same confidence, meaning hours instead of weeks. The tradeoffs: it only measures relative preference between two rankers, not absolute business metrics like revenue or retention; the blended list is neither ranker, so long-term or session-level effects are unmeasurable; and mixing can break the coherence of a page (grouping, diversity, ad slots). Standard practice: interleave to screen many candidates fast, then A/B test the winner for the launch decision.',
      isCaseBased: false,
    },
    {
      question: 'Recall@K and NDCG@K on the same system — when would you deliberately report both?',
      answer:
        'When the system is a pipeline, which every real one is. Candidate generation retrieves, say, 1,000 items from millions; its only job is to not lose the good ones, and its failures are invisible to any downstream metric — so it is graded on Recall@1000. The reranker orders the survivors, and it is graded on NDCG@10 because that is what users see. Reporting only NDCG@10 hides recall failures (the reranker cannot recover an item that was never retrieved, and NDCG@10 will look fine because the ideal is computed over the pool you have). Reporting only Recall@1000 hides a reranker that is putting the right items in the wrong order. The business framing: recall failures are silent and permanent, ranking failures are visible and fixable — so you monitor recall as a health metric and iterate on NDCG.',
      isCaseBased: false,
    },
    {
      question: 'NDCG is not differentiable. How do learning-to-rank models train on it at all?',
      answer:
        'They do not optimise it directly — sorting has zero gradient almost everywhere, so no gradient reaches the model. Three standard workarounds. Pointwise: predict a relevance score per item with regression or classification, ignore the list structure entirely — simplest, and the weakest because it never sees positions. Pairwise: train on ordered pairs, penalising every inversion, which is what RankNet does with a logistic loss on score differences. Listwise: optimise a surrogate for the whole list — LambdaRank/LambdaMART is the famous trick, which never writes down a loss at all but multiplies each pairwise gradient by the NDCG change that swapping those two items would cause, so the gradient is weighted by what the metric actually cares about. That is why LambdaMART dominated learning-to-rank benchmarks for a decade. Newer options include softmax/ListNet-style listwise losses and differentiable sorting relaxations. The point being tested: you know that the training loss and the evaluation metric are allowed to be different objects, and why.',
      isCaseBased: false,
    },
    {
      question: 'Case: a RAG system answers questions badly. The retriever reports Recall@20 of 0.95. Where do you look?',
      answer:
        'Recall@20 of 0.95 says the right passage is almost always somewhere in the twenty retrieved — it says nothing about where. Look at rank distribution first: compute MRR and NDCG@5 over the same queries. If the gold passage is habitually at rank 12–18, the generator is being handed twenty chunks with the answer buried, and LLMs demonstrably attend most to the beginning and end of their context — the classic "lost in the middle" failure. Fixes in order of cost: add a cross-encoder reranker and pass only the top 3–5; reduce K passed to the generator; reorder so the highest-scored chunk sits first. Second place to look: whether "recall" was measured at chunk level while the answer needs two chunks stitched together — chunk-level recall can be 0.95 while answerability is far lower. Third: the labels — if the gold passage was chosen by the same embedding model that does retrieval, the recall number is self-graded and inflated. The lesson to state: recall is the retrieval-stage metric, but generation quality depends on rank, so a ranking metric must be monitored even when recall looks perfect.',
      isCaseBased: true,
    },
    {
      question: 'A PM asks you to summarise ranking quality in one number for a weekly dashboard. What do you give them, and what do you insist on adding?',
      answer:
        'Give mean NDCG@10 over a fixed, frozen query sample with graded human labels, refreshed on a schedule — one number, bounded 0 to 1, comparable week over week. Then insist on three things around it. First, a segment breakdown: head, torso and tail queries move independently, and a flat overall NDCG routinely hides a tail regression, which is where new user pain lives. Second, at least one guardrail the business understands directly — click-through on the top result, abandonment rate, or latency p95 — because NDCG can improve while the page gets slower and the session gets worse. Third, an explicit note that this is an offline number computed on a biased log, so it tracks direction, not truth, and launch decisions still come from A/B tests. Handing over a single float with no segments and no caveat is how a dashboard becomes a target and stops being a measure.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Why ranking needs its own metrics', back: 'Precision/recall/F1/AUC are set metrics — reorder the same retrieved items and they do not move. Users read top-down, so position IS the product.' },
    { front: 'Precision@K vs Recall@K', back: 'P@K = relevant in top K ÷ K (what the user feels). R@K = relevant in top K ÷ all relevant (how you grade a retrieval stage). K comes from the UI, not from tuning.' },
    { front: 'The Precision@K cap', back: 'With only R relevant items and R < K, even a perfect ranker maxes at R/K. Ceilings differ per query — which is why NDCG normalises.' },
    { front: 'MRR', back: 'Mean of 1/(rank of the FIRST relevant result). Use when exactly one answer is right. Blind to everything after that first hit.' },
    { front: 'AP and MAP', back: 'AP = average of Precision@k taken only at ranks holding a hit, ÷ number of relevant items. MAP = mean AP over queries. Binary relevance only. Worked: [hit,miss,hit,miss,hit] → (1.00+0.67+0.60)/3 = 0.756.' },
    { front: 'DCG / IDCG / NDCG', back: 'DCG = Σ rel_i / log2(i+1). IDCG = DCG of the same grades sorted descending. NDCG = DCG/IDCG ∈ [0,1], comparable across queries. Worked: 4.387/4.762 = 0.921.' },
    { front: 'Graded relevance and gain convention', back: 'Raters give perfect/good/okay/irrelevant = 3/2/1/0; NDCG uses them directly, MAP must flatten to binary. Linear gain = rel, exponential gain = 2^rel − 1 (web search). Same ranking, 0.921 vs 0.946 — state which.' },
    { front: 'Offline evaluation bias', back: 'Position bias, presentation bias, and the missing counterfactual (no data on items never shown). Offline NDCG understates genuinely novel rankers.' },
    { front: 'The senior sentence on evaluation', back: '"NDCG gates what we bother to A/B test; the A/B test decides what ships." Interleaving in between — 10–100× less traffic than a full A/B test.' },
    { front: 'Designing a product metric', back: 'Goal (retention) → proxy ladder (click → watch time → satisfaction) → one primary → guardrails that must not regress → multi-objective blend, weights tuned by A/B outcomes.' },
    { front: 'Goodhart, in recommendations', back: 'Optimise CTR, get clickbait. Optimise watch time, get padding and autoplay regret. A proxy stops being a good measure the moment it becomes the target.' },
  ],
  mindmapMarkdown: `- Ranking Metrics: Precision@K, MAP & NDCG
  - Why ranking is different
    - user sees a LIST, scans top-down
    - position 1 ≈ 30% of clicks, position 10 ≈ 2%
    - classification metrics ignore order
  - Precision@K / Recall@K
    - P@K = hits in top K ÷ K; R@K = hits ÷ all relevant
    - K comes from the UI, not tuning
    - capped at R/K when R < K
    - blind to order inside the cut
  - MRR
    - 1 / rank of first relevant, averaged
    - use: exactly one correct answer
    - blind after the first hit
  - MAP
    - AP = mean of P@k at hit ranks ÷ R
    - MAP = mean AP over queries; binary relevance only
    - worked: [hit,miss,hit,miss,hit] → 0.756
  - NDCG — the FAANG default
    - graded relevance 3/2/1/0 from raters
    - discount 1/log2(rank+1)
    - IDCG = perfect ordering of the same grades
    - NDCG = DCG/IDCG ∈ [0,1]
    - gain: linear rel vs 2^rel − 1
    - worked: 4.387 / 4.762 = 0.921
  - Choosing
    - one answer → MRR; binary full list → MAP
    - graded + position → NDCG
    - pipeline: Recall@K for retrieval, NDCG@K for rerank
  - Evaluation reality
    - offline scores a biased LOG
    - position bias, presentation bias, missing counterfactual
    - offline = cheap filter; A/B test is the judge
    - interleaving: 10–100× cheaper than A/B
  - Designing a product metric
    - goal first: long-term retention
    - proxy ladder: click → watch time → satisfaction
    - Goodhart: CTR → clickbait, watch time → padding
    - guardrails must not regress
    - multi-objective blend, weights from A/B`,
}

export default m
