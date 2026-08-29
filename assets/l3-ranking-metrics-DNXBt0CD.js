var e={id:`metrics-l3-ranking-metrics`,subjectId:`metrics`,level:3,title:`Ranking Metrics: Precision@K, MAP and NDCG`,whyItMatters:`Search, recommendations and retrieval all return a list. Classification metrics treat every position as equal, and users do not — so the metric has to know that position 1 is worth more than position 10.`,assumes:[`You know precision and recall`,`You have seen a Python list and a for loop`],estMinutes:20,sections:[{type:`intuition`,title:`What ranking metrics measure`,md:`A ranking system returns an **ordered list**. Two things matter that classification metrics cannot see:

- Only the **top few** results are ever looked at.
- **Position matters** — the same correct result is worth more at rank 1 than at rank 10.

So every metric here is built from a hit list: for each position, was the result relevant?

Ten results, four of them relevant, in this order: **[0, 1, 0, 1, 0, 1, 0, 0, 0, 1]**.`},{type:`code`,lang:`python`,title:`Precision@K and Recall@K`,code:`hit = [0, 1, 0, 1, 0, 1, 0, 0, 0, 1]

R = sum(hit)
K = 5
top = hit[:K]
print('hit list      ', hit)
print('R (relevant)  ', R)
print('hits in top 5 ', sum(top))
print('Precision@5   ', sum(top) / K)
print('Recall@5      ', sum(top) / R)

# ---- real output ----
# hit list       [0, 1, 0, 1, 0, 1, 0, 0, 0, 1]
# R (relevant)   4
# hits in top 5  2
# Precision@5    0.4
# Recall@5       0.5`,annotations:{5:`hit[:K] is a slice — the first K entries, i.e. the page of results a user actually sees.`,10:`Precision@5 divides by K, the number of slots shown: 2/5 = 0.4. "Of what I showed, how much was useful?"`,11:`Recall@5 divides by R, the total relevant items that exist: 2/4 = 0.5. "Of everything useful, how much did I surface?" Same numerator, different denominator — exactly as in classification.`}},{type:`note`,label:`What Precision@K cannot see`,md:`Precision@5 is **0.4** for the list above. It would also be 0.4 for **[1, 1, 0, 0, 0, …]** — both have two hits in the top five.

But the second list is obviously better: both hits are at the very top. Precision@K throws the ordering away inside the window.

That is the gap the next two metrics exist to close.`},{type:`math`,intro:`The position-aware metrics. AP averages the precision measured at each hit, so a hit near the top contributes a higher value. RR only cares where the first hit is. MRR and MAP are those two averaged over many queries — the M is just "mean over queries".`,latex:[`AP = \\frac{1}{R}\\sum_{k \\,:\\, \\text{hit at } k} \\text{Precision}@k \\qquad RR = \\frac{1}{\\text{rank of first hit}}`,`\\text{MAP} = \\frac{1}{Q}\\sum_{q} AP_q \\qquad \\text{MRR} = \\frac{1}{Q}\\sum_{q} RR_q`]},{type:`code`,lang:`python`,title:`AP and RR, walking the list position by position`,code:`hits_so_far = 0
prec_sum = 0.0
first_rank = 0

for i in range(len(hit)):
    rank = i + 1
    if hit[i] == 1:
        hits_so_far = hits_so_far + 1
        p_at_rank = hits_so_far / rank
        print('hit at rank', rank, '-> precision', round(p_at_rank, 4))
        prec_sum = prec_sum + p_at_rank
        if first_rank == 0:
            first_rank = rank

print('AP =', round(prec_sum / R, 4))
print('RR =', round(1 / first_rank, 4))

# ---- real output ----
# hit at rank 2 -> precision 0.5
# hit at rank 4 -> precision 0.5
# hit at rank 6 -> precision 0.5
# hit at rank 10 -> precision 0.4
# AP = 0.475
# RR = 0.5`,annotations:{6:`rank is 1-based because positions are counted from 1, while Python indexes from 0. Getting this off by one is the most common bug in ranking code.`,9:`Precision measured at this moment: hits so far divided by how far down the list we are. A hit at rank 2 with one hit before it gives 1/2.`,16:`AP 0.475 — the average of the precision values recorded at each hit, divided by R. Move any hit earlier and its precision term rises, so AP rewards putting relevant things first.`,17:`RR 0.5, because the first hit is at rank 2. RR ignores everything after that, which is exactly right when the user only needs one good answer.`}},{type:`intuition`,title:`NDCG: when relevance is not just yes or no`,md:`Everything so far assumes a result is relevant or not. Often it is graded — perfect, good, acceptable, useless — say 3, 2, 1, 0.

**DCG** sums the grades, each divided by **log₂(rank + 1)**. That discount is the whole idea: a grade at rank 1 counts fully, at rank 10 barely a quarter.

Then **NDCG** divides DCG by the best possible DCG for those same grades, so the score is always between 0 and 1 and is comparable across queries with different numbers of relevant items.`},{type:`code`,lang:`python`,title:`The discount, printed`,code:`import math
for rank in [1, 2, 3, 5, 10, 20]:
    print(rank, round(1 / math.log2(rank + 1), 3))

# ---- real output ----
# 1 1.0
# 2 0.631
# 3 0.5
# 5 0.387
# 10 0.289
# 20 0.228`,annotations:{3:`log2(rank + 1) rather than log2(rank), so that rank 1 gives log2(2) = 1 and the first position is not divided by zero.`,6:`Rank 1 counts fully at 1.000, rank 5 at 0.387, rank 10 at 0.289. The decay is deliberately gentle — a logarithm, not a reciprocal — because users do scroll a little.`,9:`From rank 10 to rank 20 the weight only falls from 0.289 to 0.228. Deep in the list, moving a result barely changes the score, which is realistic.`}},{type:`code`,lang:`python`,title:`DCG, IDCG and NDCG`,code:`grade = [0, 3, 0, 2, 0, 1, 0, 0, 0, 1]

def dcg(grades):
    total = 0.0
    for i in range(len(grades)):
        rank = i + 1
        total = total + grades[i] / math.log2(rank + 1)
    return total

ideal = sorted(grade, reverse=True)
print('ideal order', ideal)
print('DCG  =', round(dcg(grade), 4))
print('IDCG =', round(dcg(ideal), 4))
print('NDCG =', round(dcg(grade) / dcg(ideal), 4))

# ---- real output ----
# ideal order [3, 2, 1, 1, 0, 0, 0, 0, 0, 0]
# DCG  = 3.3994
# IDCG = 5.1925
# NDCG = 0.6547`,annotations:{1:`Graded relevance on the same ten results. The best one (grade 3) is at rank 2, the grade-2 at rank 4, and a useless result sits at rank 1.`,11:`sorted(..., reverse=True) puts the grades in the best possible order — the ideal ranking of exactly these results. Nothing is added or removed.`,16:`DCG 3.3994 against an ideal 5.1925, giving NDCG 0.6547. The relative ORDER of the good results is already right — what costs 35% is the useless results padded in between them, starting at rank 1.`}},{type:`note`,label:`Which one, and why`,md:`- **Precision@K** — when the page size is fixed and you just need to know how much of it was useful. Easy to explain; blind to order within the window.
- **Recall@K** — when you must not miss things, as in the candidate-generation stage of a two-stage system.
- **MRR** — when the user needs exactly one answer: a factual query, a "did you mean", a jump-to-result.
- **MAP** — when several results matter and their order matters, with binary relevance.
- **NDCG** — the same, but with graded relevance. The standard for search quality.

All are computed **per query and then averaged**. Averaging the raw counts across queries instead lets a single query with many relevant items dominate everything.`}],quiz:[{question:`Precision@5 is 0.4 and Recall@5 is 0.5 on the same list. Why do they differ?`,options:[{text:`They count different hits`,explanation:`Both count the same 2 hits in the top 5.`},{text:`Precision divides by K = 5, recall by R = 4 — the total relevant items that exist`,explanation:`Correct. Same numerator, different denominator, exactly as in classification.`},{text:`Recall looks deeper into the list`,explanation:`Both are computed on the same top-5 window.`},{text:`One is a percentage and the other a fraction`,explanation:`Both are fractions.`}],correct:1},{question:`What can Precision@5 not distinguish?`,options:[{text:`Lists with different numbers of relevant items`,explanation:`That is what recall@K addresses, and precision@K does register the hit count.`},{text:`[0,1,0,1,0,…] from [1,1,0,0,0,…] — both have two hits in the top five`,explanation:`Correct. It throws away the ordering inside the window, which is why AP and NDCG exist.`},{text:`Relevant from irrelevant results`,explanation:`That is precisely what it counts.`},{text:`Different values of K`,explanation:`K is chosen by you and changes the metric.`}],correct:1},{question:`AP came out 0.475 from precisions 0.5, 0.5, 0.5, 0.4. How?`,options:[{text:`The average of those four values, which is 0.475`,explanation:`Correct — sum them and divide by R = 4. Each term is the precision measured at the moment of that hit.`},{text:`The precision at rank 10`,explanation:`That is only the last term, 0.4.`},{text:`Hits divided by list length`,explanation:`That would be 4/10 = 0.4.`},{text:`The area under the ROC curve`,explanation:`Different metric entirely.`}],correct:0},{question:`RR is 0.5 for this list. What does that mean?`,options:[{text:`Half the results were relevant`,explanation:`Four of ten were.`},{text:`The first relevant result was at rank 2, and RR = 1/2`,explanation:`Correct. RR ignores everything after the first hit.`},{text:`Precision at rank 2`,explanation:`Coincidentally also 0.5 here, but RR is defined as 1/rank of the first hit.`},{text:`The average of the precisions`,explanation:`That is AP, 0.475.`}],correct:1},{question:`Why log₂(rank + 1) rather than log₂(rank)?`,options:[{text:`So rank 1 gives log₂(2) = 1 instead of dividing by zero`,explanation:`Correct, and it makes the first position count fully at weight 1.000.`},{text:`To make the discount steeper`,explanation:`The +1 makes it gentler at the top, not steeper.`},{text:`Because ranks start at 0`,explanation:`Ranks start at 1; it is the Python index that starts at 0.`},{text:`To normalise the score to [0,1]`,explanation:`That is what dividing by IDCG does.`}],correct:0},{question:`DCG 3.3994, IDCG 5.1925, NDCG 0.6547. What does the gap say?`,options:[{text:`The system missed relevant results`,explanation:`IDCG is computed from the SAME grades, so nothing is missing — only the order differs.`},{text:`It retrieved the right items but padded useless ones between them, starting at rank 1`,explanation:`Correct. NDCG isolates ordering quality, because the ideal uses exactly the results you returned.`},{text:`The grades were assigned wrongly`,explanation:`Both DCG and IDCG use the same grades.`},{text:`The list was too short`,explanation:`Length is identical for both.`}],correct:1}],interviewQuestions:[{question:`Why can you not use accuracy or F1 for a search system?`,answer:`Because they treat every result as equally important, and a ranked list is not like that. Only the top few results are seen, and a correct answer at rank 1 is worth far more than the same answer at rank 10. Precision@5 already fixes the "only the top" half by looking at a window, but it still cannot tell [0,1,0,1,0] from [1,1,0,0,0] — both score 0.4. AP and NDCG fix the position half by weighting each hit by where it landed.`,isCaseBased:!0},{question:`Explain NDCG.`,answer:`Sum each result's relevance grade divided by log₂(rank + 1), which gives DCG — the discount means rank 1 counts fully at 1.000, rank 5 at 0.387, rank 10 at 0.289. Then divide by the DCG of the ideal ordering of those same results, which normalises to [0,1] and makes queries with different numbers of relevant items comparable. On a list scoring DCG 3.3994 against an ideal 5.1925, NDCG is 0.6547 — the system found the right items and ordered them poorly, and NDCG isolates exactly that.`,isCaseBased:!1},{question:`MRR or MAP — when would you use each?`,answer:`MRR when the user needs one answer and stops: a factual query, a navigational search, an autocomplete suggestion. It only measures where the first correct result landed, so it is the honest metric when everything after the first hit is irrelevant to the experience. MAP when several results matter and their order matters — browsing, research, a shopping results page. MAP is also the more sensitive metric, since MRR discards most of the list and therefore most of the signal.`,isCaseBased:!1},{question:`How do you choose K?`,answer:`From the interface, not from the maths. If the page shows ten results, K = 10 measures what users actually see; if a mobile view shows three above the fold, K = 3 is more honest. For a two-stage system the two stages get different K: recall@K with a large K for candidate generation, since its job is not to lose anything, and precision or NDCG at a small K for the ranker. Reporting several values of K is often more informative than defending one.`,isCaseBased:!1},{question:`Why average per-query rather than pooling all results?`,answer:`Because pooling lets a single query dominate. A query with 200 relevant documents contributes far more rows than one with two, so a pooled metric mostly measures performance on the broadest queries. Averaging per-query treats every query as one vote, which matches the user experience — each search either worked or did not. It also lets you look at the distribution rather than only the mean, which is where the useful diagnosis lives: a good average hiding a tail of completely failed queries is a common and important pattern.`,isCaseBased:!0},{question:`Your NDCG@10 improved but users complain the results got worse. What might be happening?`,answer:`Several possibilities worth separating. The relevance grades may not reflect what users value — graded judgements are made by annotators against a rubric, and the rubric can drift from real intent. The gain may be concentrated below the fold, where NDCG still rewards it but nobody looks. Diversity may have collapsed, with ten near-identical good results scoring well and serving nobody. Or latency regressed as part of the change. Offline ranking metrics are a filter; an A/B test on engagement is the decision.`,isCaseBased:!0},{question:`How do you handle graded relevance when you only have clicks?`,answer:`Clicks are a biased signal and using them naively bakes the bias in. Position bias is the big one — results at the top get clicked because they are at the top, so a click-trained model reinforces the existing ranking. Standard treatments are to model position bias explicitly and reweight by inverse propensity, to use dwell time or completion as a stronger signal than a raw click, and to reserve a small amount of randomised exposure so there is unbiased data to learn from. Otherwise the feedback loop narrows the results over time.`,isCaseBased:!1},{question:`What does AP have to do with the PR curve?`,answer:`AP is the area under the precision–recall curve, computed as a step-wise sum rather than by interpolating between points. Each hit increases recall by 1/R and contributes the precision at that moment, so summing precision-at-each-hit and dividing by R is exactly integrating precision over recall. That is why average precision appears in both the classification and the ranking chapters — it is the same quantity, arrived at from two directions.`,isCaseBased:!1}],flashcards:[{front:`Why ranking metrics exist`,back:`Only the top few results are seen, and position matters. Classification metrics treat every position as equal.`},{front:`Precision@K vs Recall@K`,back:`Same numerator. Precision divides by K (slots shown), recall by R (relevant items that exist). Here 2/5 = 0.4 and 2/4 = 0.5.`},{front:`What Precision@K misses`,back:`Order inside the window. [0,1,0,1,0] and [1,1,0,0,0] both score 0.4.`},{front:`AP`,back:`Average of the precision measured at each hit, divided by R. Precisions 0.5, 0.5, 0.5, 0.4 → AP 0.475. It is the area under the PR curve.`},{front:`RR and MRR`,back:`RR = 1 / rank of the FIRST hit — 0.5 here. MRR is that averaged over queries. Use when the user needs one answer.`},{front:`The NDCG discount`,back:`1 / log₂(rank + 1). Rank 1 → 1.000, rank 5 → 0.387, rank 10 → 0.289, rank 20 → 0.228. The +1 stops rank 1 dividing by zero.`},{front:`NDCG`,back:`DCG / IDCG, where IDCG is the DCG of the ideal ordering of the SAME results. 3.3994 / 5.1925 = 0.6547 — right items, wrong order.`},{front:`Always average how?`,back:`Per query, then across queries. Pooling lets one query with 200 relevant documents dominate everything.`}],mindmapMarkdown:`- Ranking metrics
  - Why they differ
    - only the top few are seen
    - position matters
  - Precision@K / Recall@K
    - hit list [0,1,0,1,0,1,0,0,0,1], R = 4
    - P@5 = 2/5 = 0.4, R@5 = 2/4 = 0.5
    - blind to order INSIDE the window
  - AP and RR
    - AP = mean precision at each hit / R
    - 0.5, 0.5, 0.5, 0.4 -> AP 0.475
    - AP = area under the PR curve
    - RR = 1 / rank of first hit = 0.5
    - MAP / MRR = averaged over queries
  - NDCG
    - graded relevance, not just yes/no
    - discount 1/log2(rank+1)
      - rank 1 -> 1.000, 5 -> 0.387, 10 -> 0.289
    - DCG 3.3994, IDCG 5.1925, NDCG 0.6547
    - IDCG uses the SAME results -> isolates ORDER
  - Choosing
    - one answer needed -> MRR
    - several, ordered, binary -> MAP
    - graded -> NDCG
    - candidate generation -> recall@K, large K
  - Always average per QUERY`};export{e as default};