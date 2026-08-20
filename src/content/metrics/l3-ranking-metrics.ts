import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l3-ranking-metrics',
  subjectId: 'metrics',
  level: 3,
  title: 'Ranking Metrics: Precision@K, MAP & NDCG',
  whyItMatters:
    'Everything you have measured so far was a model that answers one question at a time: is this email spam, yes or no. Search boxes, feeds and recommendation shelves do something different — they hand the user a LIST, in an order. The metrics you already know cannot see that order at all: shuffle the same ten results into any arrangement and precision, recall and F1 print the identical number, while the user has a completely different day. This module builds the metrics that can see order, starting from one page of ten search results written out by name, and computing every number on it by hand.',
  assumes: [
    'You have read *The Confusion Matrix* — you know precision (of the things I said yes to, how many were right) and recall (of the things that really were right, how many did I find)',
    'You know what a fraction and an average are',
    'You have seen a Python list, a for loop and an if statement',
    'You know that log2(8) = 3 means "2 multiplied by itself 3 times gives 8". Nothing more about logarithms is needed; the module explains the rest.',
  ],
  estMinutes: 38,
  sections: [
    {
      type: 'intuition',
      title: 'One search, ten results, written out',
      md: `Someone types **"how to boil an egg"** into a search box. The system returns ten links, in this order. A human has read all ten and marked each one useful or not.

- **1.** Egg nutrition chart — *not useful*
- **2.** Perfect boiled eggs, step by step — **useful**
- **3.** Buy egg timers online — *not useful*
- **4.** How long to boil an egg: a timing chart — **useful**
- **5.** Fifty egg recipes for dinner — *not useful*
- **6.** Soft vs hard boiled: the timing difference — **useful**
- **7.** Chicken farming blog, March update — *not useful*
- **8.** Egg jokes for kids — *not useful*
- **9.** Boiling water safety notice — *not useful*
- **10.** How to peel a hard boiled egg — **useful**

That is the whole example. Every number in this module comes out of this one list.`,
    },
    {
      type: 'intuition',
      title: 'Two words first: relevance, and "@K"',
      md: `Both are used constantly and both are simple.

- **Relevance** is the human's judgement about one result: does it help with *this* query? "Useful" above means relevant. It is a property of a *pair* — this result, for this query. "Egg jokes for kids" is a fine page; it is irrelevant *here*.
- A relevance judgement is a **label**, exactly like "spam" or "not spam" was. It is written by a person, or guessed from what people clicked. It is not something the model produces.
- **@K** is read "at K" and means *only look at the first K positions, throw the rest away*. Precision@5 means the precision of the top five results. It exists because users do not read the whole list.
- K is not something you tune. **K comes from the screen.** Ten blue links means K = 10. Five recommendation tiles on a shelf means K = 5. Three autocomplete suggestions means K = 3.

In our list, the relevant positions are **2, 4, 6 and 10**. Four relevant results in total. Call that number **R = 4**.`,
    },
    {
      type: 'intuition',
      title: 'Precision@K and Recall@K',
      md: `These are the two metrics you already know, applied to the first K positions only. Cut the list at K, then count.

- **Precision@K** = (relevant results in the top K) ÷ K. Out of what I showed you, how much was useful?
- **Recall@K** = (relevant results in the top K) ÷ R, where R is how many relevant results exist in total. Of everything useful that was out there, how much did I get onto the page?
- Take **K = 5** on our list. Positions 1 to 5 are: not useful, **useful**, not useful, **useful**, not useful. So two hits.
- **Precision@5 = 2 / 5 = 0.400.** Of the five results shown, two helped.
- **Recall@5 = 2 / 4 = 0.500.** Half of the four useful pages made it into the top five.
- Take **K = 10**, the whole list: four hits. **Precision@10 = 4 / 10 = 0.400** and **Recall@10 = 4 / 4 = 1.000.**

Notice what Precision@10 cannot see. Move the four useful pages to positions 7, 8, 9, 10 and leave the junk at 1 to 6. Still four hits in the top ten, so **Precision@10 is still 0.400** — while the user now scrolls past six useless links before anything works. That blind spot is the reason the rest of this module exists.`,
    },
    {
      type: 'math',
      intro: 'The same two formulas, in symbols. The vertical bars mean "how many things are in this set".',
      latex: [
        '\\text{Precision@}K = \\frac{|\\{\\text{relevant}\\} \\cap \\{\\text{top } K\\}|}{K}, \\qquad \\text{Recall@}K = \\frac{|\\{\\text{relevant}\\} \\cap \\{\\text{top } K\\}|}{R}',
        '\\text{Our list, } K=5: \\quad \\frac{2}{5} = 0.400 \\quad \\text{and} \\quad \\frac{2}{4} = 0.500',
      ],
    },
    {
      type: 'note',
      md: `One trap worth knowing now. Precision@K divides by K no matter what. If a query has only **2** relevant pages in the entire internet and your ranker puts both at positions 1 and 2 — a perfect job — Precision@10 is still 2/10 = 0.200. The ceiling is R/K, and it is set by the data, not by the model. Different queries have different ceilings, so averaging Precision@10 over a thousand queries quietly averages a thousand different ceilings. Two ways out: report Recall@K next to it, or use a metric that rescales each query to its own ceiling. NDCG does exactly that, and it is at the end of this module.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The list in Python, and Precision@5 / Recall@5',
      code: `grade = [0, 3, 0, 2, 0, 1, 0, 0, 0, 1]
hit = []
for g in grade:
    hit.append(1 if g > 0 else 0)

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
# Recall@5       0.5`,
      annotations: {
        1: 'One number per position, already in ranked order, so index 0 is position 1. The numbers are human relevance grades on a 0-to-3 scale, which the NDCG half of the module needs; for now only "is it above zero" matters. Grade 3 sits at position 2, grade 2 at position 4, grade 1 at positions 6 and 10.',
        2: 'An empty list that we will fill with one 0-or-1 per position.',
        3: 'Walk the grades one at a time. g is the grade of the position we are looking at.',
        4: 'append adds one item to the end of a list. "1 if g > 0 else 0" is Python\'s if-expression: it checks the test and the whole thing becomes 1 when the test passes, 0 when it does not. So hit ends up as 1 for relevant, 0 for not.',
        6: 'sum of a list of 0s and 1s is just how many 1s there are — the total number of relevant results, R = 4.',
        7: 'The cut. Five, because we are pretending the page shows five results.',
        8: 'hit[:K] is a slice: a new list holding the first K items and nothing else. This is the "@K" of the metric name, written in code.',
        9: 'Print the binary view so you can check it by eye against the ten links above.',
        10: 'R, printed so the denominator of recall is visible.',
        11: 'How many 1s survived the cut — the numerator both metrics share.',
        12: 'Precision@5: hits in the cut, divided by the size of the cut.',
        13: 'Recall@5: the same numerator, divided by how many relevant results exist in total. Only the denominator differs between the two metrics.',
      },
    },
    {
      type: 'intuition',
      title: 'MRR — the simplest one, for when there is exactly one right answer',
      md: `Question: *"who wrote The Old Man and the Sea?"* There is one correct page. Nothing to count. The only thing left to measure is **how far down it was**.

- **Reciprocal rank (RR)** = 1 ÷ (position of the first relevant result). "Reciprocal" just means one-over.
- First hit at position 1 gives 1/1 = **1.000**. Position 2 gives **0.500**. Position 5 gives **0.200**. Position 10 gives **0.100**.
- On our egg list the first useful result is at position 2, so **RR = 1/2 = 0.500**.
- **MRR** is the *mean reciprocal rank*: compute RR for every query in your test set, then average those numbers. That is all the M adds.
- The shape of 1-over-rank is the whole point. Slipping from position 1 to 2 costs you 0.5. Slipping from 9 to 10 costs 0.011. It punishes exactly where users actually notice.
- Use it only when one answer is right. It stops looking after the first hit, so a list of [useful, junk, junk] and a list of [useful, useful, useful] both score 1.000.`,
    },
    {
      type: 'intuition',
      title: 'Average Precision — credit for every hit, weighted by how early it came',
      md: `MRR looks at one position. Precision@K looks at one cut. **Average precision (AP)** looks at every cut where a hit lands, and it is the one people get wrong, so go slowly.

The recipe, three steps:

1. Walk down the list from position 1. Every time you land on a relevant result, compute **Precision@(that position)** and write it down.
2. Add those written-down numbers.
3. Divide by **R**, the total number of relevant results — *not* by the number you wrote down, and *not* by the length of the list.

On our egg list the hits are at positions 2, 4, 6 and 10:

- Hit at position 2: 1 hit in the top 2, so precision = 1/2 = **0.500**.
- Hit at position 4: 2 hits in the top 4, so precision = 2/4 = **0.500**.
- Hit at position 6: 3 hits in the top 6, so precision = 3/6 = **0.500**.
- Hit at position 10: 4 hits in the top 10, so precision = 4/10 = **0.400**.
- Add: 0.500 + 0.500 + 0.500 + 0.400 = **1.900**. Divide by R = 4: **AP = 0.475**.

The non-relevant positions never appear in that sum. They still hurt you — every junk result at position 3 pushes the next hit down to position 4, which lowers the precision recorded there.`,
    },
    {
      type: 'intuition',
      title: 'MAP — say out loud what is averaged over what',
      md: `This is the step everyone loses, so here it is as one sentence: **AP averages precision across ranks within one query; MAP averages AP across queries.** Two different averages, stacked.

- Inner average: over the **ranks holding a hit**, inside a single query. Output: one AP number per query.
- Outer average: over the **queries** in your test set. Output: one MAP number for the whole system.
- Worked, with two queries. Our egg query gave **AP = 0.475**. Now a second query returns five results with hits at positions 1 and 3, so R = 2: precision at position 1 is 1/1 = 1.000, precision at position 3 is 2/3 = 0.667. Sum 1.667, divided by R = 2, gives **AP = 0.833**.
- **MAP = (0.475 + 0.833) / 2 = 0.654.** Two queries, so divide by 2.

What you must not do is pool. Throwing all six recorded precision values from both queries into one bucket and averaging them gives (0.500 + 0.500 + 0.500 + 0.400 + 1.000 + 0.667) / 6 = **0.594**, which is not MAP. Pooling silently gives the query with more hits more say. MAP gives every query exactly one vote.`,
    },
    {
      type: 'math',
      intro: 'AP for one query, then MAP over a set of queries Q. The 1[...] is an "indicator": it equals 1 when the statement inside is true and 0 when it is false, which is how the formula says "only count ranks holding a hit".',
      latex: [
        '\\text{AP} = \\frac{1}{R}\\sum_{k=1}^{n} \\text{Precision@}k \\cdot \\mathbf{1}[\\,\\text{position } k \\text{ is relevant}\\,]',
        '\\text{Our list: } \\frac{0.500 + 0.500 + 0.500 + 0.400}{4} = \\frac{1.900}{4} = 0.475',
        '\\text{MAP} = \\frac{1}{|Q|}\\sum_{q \\in Q} \\text{AP}_q \\qquad \\text{one AP per query, averaged once}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'AP and RR, walking the list position by position',
      code: `hits_so_far = 0
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
# RR = 0.5`,
      annotations: {
        1: 'Counts how many relevant results we have passed so far. This is the numerator of precision at whatever position we are standing on.',
        2: 'The running total of the precision values we write down. Starts at 0.0 rather than 0 to make clear it accumulates decimals.',
        3: 'Where the first hit was. 0 means "not found yet", because position numbering starts at 1, so 0 can never be a real answer.',
        4: 'Walk every position. i counts 0 to 9, the Python index.',
        5: 'rank is the human position number: index 0 is rank 1. Getting this off by one is the most common bug in ranking code.',
        6: 'Only relevant positions do anything. Junk positions fall through and contribute nothing to the sum.',
        7: 'One more hit seen. This is the count of relevant items in the top "rank" positions.',
        8: 'Precision at this exact position: hits so far, divided by how many positions we have looked at. Same formula as Precision@K, with K set to wherever we are standing.',
        9: 'Print it so the four hand-computed values above are visible as the loop produces them.',
        10: 'Add it to the running total. Step 2 of the three-step recipe.',
        11: 'Only true the very first time we hit something, because first_rank stops being 0 after that.',
        12: 'Record the position of the first hit — everything MRR needs.',
        14: 'Step 3: divide by R, the total number of relevant results, not by how many hits we happened to find.',
        15: 'Reciprocal rank: one divided by the position of the first hit. 1/2 = 0.5 here.',
      },
    },
    {
      type: 'intuition',
      title: 'Graded relevance: useful is not one thing',
      md: `AP and MAP need a yes/no label. But a human reading our ten links does not think in yes/no.

- "Perfect boiled eggs, step by step" answers the question completely. "How to peel a hard boiled egg" is related and mildly useful. Calling both simply "useful" throws away the difference.
- So raters use a scale instead. The usual one is four levels: **perfect = 3, good = 2, okay = 1, irrelevant = 0**. That number is called the **grade**, or the **gain** of the result.
- Our ten links, graded: position 2 gets **3**, position 4 gets **2**, positions 6 and 10 get **1**, everything else gets **0**. That is exactly the \`grade\` list from the first snippet.
- AP cannot use these. You would have to flatten them back to yes/no first, which is the information you just paid raters to produce.

The next metric, NDCG, consumes the grades directly. That is the first of its two ideas.`,
    },
    {
      type: 'intuition',
      title: 'The discount: why position 1 counts more than position 10',
      md: `The second idea is that a result's value depends on where it sits. So each position gets a fixed multiplier, called the **discount**, and it shrinks as you go down.

The discount used everywhere is **1 ÷ log2(position + 1)**. Take it apart:

- log2(x) asks "2 to what power gives x?" So log2(2) = 1, log2(4) = 2, log2(8) = 3. It grows, but very slowly — x has to *double* for it to go up by one.
- At position 1: 1 ÷ log2(2) = 1 ÷ 1 = **1.000**. Position 1 keeps all of its grade. The "+1" inside is there precisely so this comes out at 1.
- Position 3: 1 ÷ log2(4) = 1 ÷ 2 = **0.500**. Half.
- Position 10: 1 ÷ log2(11) = **0.289**. About twenty-nine percent.
- Position 20: **0.228**. Still not nothing.

Why a slow-shrinking function rather than a fast one? Because 1/rank (the MRR shape) collapses to 0.1 by position 10 and treats positions 10 through 50 as identical rubbish, while a flat multiplier says position 10 is as good as position 1. The log sits between: brutal at the top, where users really do stop reading, and gently forgiving further down, where people who scroll still find things. It is a design choice, tuned to how people scan a page — not something derived from a theorem, and it is worth saying so rather than pretending otherwise.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The discount table, printed',
      code: `import math
for rank in [1, 2, 3, 5, 10, 20]:
    print(rank, round(1 / math.log2(rank + 1), 3))

# ---- real output ----
# 1 1.0
# 2 0.631
# 3 0.5
# 5 0.387
# 10 0.289
# 20 0.228`,
      annotations: {
        1: 'math is Python\'s built-in maths module. It has log2 in it, so nothing needs installing.',
        2: 'Six positions worth looking at, not every position — enough to see the shape of the decay.',
        3: 'math.log2(rank + 1) is the logarithm base 2, and one divided by it is the discount. round(x, 3) trims to three decimal places so the column lines up.',
      },
    },
    {
      type: 'intuition',
      title: 'DCG, IDCG and NDCG — computed by hand on our list',
      md: `Now put the two ideas together. Multiply every result's grade by its position's discount, and add them up. That sum is **DCG**, discounted cumulative gain — "gain" because grades are gains, "discounted" because of the multiplier, "cumulative" because you add them.

Our list, grades [0, 3, 0, 2, 0, 1, 0, 0, 0, 1]. Only the four non-zero positions contribute anything:

- Position 2, grade 3: 3 × (1 ÷ log2(3)) = 3 × 0.6309 = **1.8928**
- Position 4, grade 2: 2 × (1 ÷ log2(5)) = 2 × 0.4307 = **0.8614**
- Position 6, grade 1: 1 × (1 ÷ log2(7)) = 1 × 0.3562 = **0.3562**
- Position 10, grade 1: 1 × (1 ÷ log2(11)) = 1 × 0.2891 = **0.2891**
- Every other position: grade 0, so 0 × anything = 0.
- **DCG = 1.8928 + 0.8614 + 0.3562 + 0.2891 = 3.3994.**

Is 3.3994 good? Nobody can say, because DCG has no ceiling you can name. A query with eight perfect pages available scores far higher than a query with one, however well ranked. So you compare it against the best score that was *possible on this query*.`,
    },
    {
      type: 'intuition',
      title: 'IDCG: the same results, ordered perfectly',
      md: `**IDCG** is the *ideal* DCG: take the very same grades, sort them best-first, and score that arrangement the same way. It is the number the world's best possible ranker would have got on this query.

Our grades sorted best-first are **[3, 2, 1, 1, 0, 0, 0, 0, 0, 0]**:

- Position 1, grade 3: 3 × 1.0000 = **3.0000**
- Position 2, grade 2: 2 × 0.6309 = **1.2619**
- Position 3, grade 1: 1 × 0.5000 = **0.5000**
- Position 4, grade 1: 1 × 0.4307 = **0.4307**
- The remaining six positions hold grade 0 and contribute nothing.
- **IDCG = 3.0000 + 1.2619 + 0.5000 + 0.4307 = 5.1925.**

Now divide. **NDCG = DCG ÷ IDCG = 3.3994 ÷ 5.1925 = 0.6547.** The N is for *normalised*: rescaled so the best possible answer is 1.

- NDCG is always between 0 and 1, on every query, because you divided by the largest value the numerator could have taken.
- That makes it comparable across queries, so averaging it over a thousand queries is honest in a way that averaging Precision@10 was not.
- Read our number in words: this ranking captured about **65%** of the value it could have captured with the exact same ten pages. The loss is entirely because the good pages were at positions 2, 4, 6 and 10 instead of 1, 2, 3 and 4.`,
    },
    {
      type: 'math',
      intro: 'The three formulas, now that you have computed all three by hand. rel with a subscript i is the grade of the result at position i.',
      latex: [
        '\\text{DCG@}K = \\sum_{i=1}^{K} \\frac{\\text{rel}_i}{\\log_2(i+1)} \\qquad \\text{ours} = 3.3994',
        '\\text{IDCG@}K = \\text{the same formula applied to the same grades sorted descending} \\qquad \\text{ours} = 5.1925',
        '\\text{NDCG@}K = \\frac{\\text{DCG@}K}{\\text{IDCG@}K} = \\frac{3.3994}{5.1925} = 0.6547 \\;\\in\\; [0, 1]',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'DCG, IDCG and NDCG in one function',
      code: `import math

def dcg(grades):
    total = 0.0
    for i in range(len(grades)):
        rank = i + 1
        discount = 1 / math.log2(rank + 1)
        total = total + grades[i] * discount
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
# NDCG = 0.6547`,
      annotations: {
        1: 'log2 lives in the math module.',
        3: 'One function, used twice: once on the real order and once on the ideal one. That reuse is the point — IDCG is not a different formula, it is the same formula on a different arrangement.',
        4: 'A running total for the sum of discounted gains.',
        5: 'Walk every position of whatever list was passed in.',
        6: 'Index to human position number again: index 0 is rank 1.',
        7: 'The discount for this position, exactly the table printed above.',
        8: 'grade times discount, added to the total. This single line is the whole of DCG.',
        9: 'Hand the sum back to the caller.',
        11: 'sorted returns a NEW list with the items in order; reverse=True makes it largest-first. So ideal holds the same ten grades rearranged perfectly, and grade itself is untouched.',
        12: 'Print the ideal arrangement so you can see it is a rearrangement, not new data.',
        13: 'DCG of the order the ranker actually produced.',
        14: 'IDCG: the same function, fed the perfect order.',
        15: 'The ratio. Bounded in 0 to 1 because the denominator is the largest the numerator could have been.',
      },
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'NDCG on the egg query, one step at a time',
        notice: 'The same ten results throughout. Frames 1-2 build DCG, frame 3 rebuilds the ideal order for IDCG, frame 4 divides.',
        leftLabel: 'position',
        rightLabel: 'what it contributes',
        frames: [
          {
            note: 'The four positions that carry a grade above zero. Everything else in the list is grade 0 and contributes nothing to any of these sums.',
            stack: [
              { name: 'pos 2', value: 'grade 3', to: 'r1' },
              { name: 'pos 4', value: 'grade 2', to: 'r2' },
              { name: 'pos 6', value: 'grade 1', to: 'r3' },
              { name: 'pos 10', value: 'grade 1', to: 'r4' },
            ],
            heap: [
              { id: 'r1', value: 'boiled eggs, step by step', label: 'perfect' },
              { id: 'r2', value: 'boiling timing chart', label: 'good' },
              { id: 'r3', value: 'soft vs hard boiled', label: 'okay' },
              { id: 'r4', value: 'peeling a boiled egg', label: 'okay' },
            ],
          },
          {
            note: 'Each grade is multiplied by its position discount 1/log2(pos+1). Add the four products: DCG = 3.3994.',
            stack: [
              { name: 'pos 2', value: '3 x 0.6309', to: 'g1' },
              { name: 'pos 4', value: '2 x 0.4307', to: 'g2' },
              { name: 'pos 6', value: '1 x 0.3562', to: 'g3' },
              { name: 'pos 10', value: '1 x 0.2891', to: 'g4' },
            ],
            heap: [
              { id: 'g1', value: '1.8928' },
              { id: 'g2', value: '0.8614' },
              { id: 'g3', value: '0.3562' },
              { id: 'g4', value: '0.2891', label: 'DCG 3.3994' },
            ],
          },
          {
            note: 'IDCG: the SAME four grades, moved to positions 1 to 4 — the best any ranker could do with these ten pages. Add: IDCG = 5.1925.',
            stack: [
              { name: 'pos 1', value: '3 x 1.0000', to: 'i1' },
              { name: 'pos 2', value: '2 x 0.6309', to: 'i2' },
              { name: 'pos 3', value: '1 x 0.5000', to: 'i3' },
              { name: 'pos 4', value: '1 x 0.4307', to: 'i4' },
            ],
            heap: [
              { id: 'i1', value: '3.0000' },
              { id: 'i2', value: '1.2619' },
              { id: 'i3', value: '0.5000' },
              { id: 'i4', value: '0.4307', label: 'IDCG 5.1925' },
            ],
          },
          {
            note: 'NDCG = DCG / IDCG = 3.3994 / 5.1925 = 0.6547. This ranking captured 65% of the value available. Average this over many queries and that is the number a search team reports.',
            stack: [
              { name: 'DCG', value: '3.3994' },
              { name: 'IDCG', value: '5.1925' },
              { name: 'NDCG', value: '0.6547', to: 'n1' },
            ],
            heap: [{ id: 'n1', value: 'between 0 and 1, always', label: 'this query' }],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Which metric, when',
      md: `Choose by the shape of your labels, not by which name sounds most impressive.

- **MRR** — exactly one correct answer per query. Factoid questions, "did the retriever find the right document", a bot choosing one FAQ entry. Blind to everything after the first hit.
- **MAP** — labels are yes/no, many results can be relevant, and the whole list matters. Legal and patent search, where missing a document is expensive.
- **NDCG** — labels are graded and position matters. Web search, product search, feeds. The only one of the three that rescales each query to its own ceiling.
- **Precision@K and Recall@K** — for explaining quality to a human, and for grading one *stage* of a pipeline. Recall@1000 for the part that fetches candidates, NDCG@10 for the part that orders them.
- If you cannot say what a relevance grade means for your product and who assigns it, you are not ready for NDCG yet. Start with Precision@K.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: two rankers, scored end to end',
      md: `A team has two versions of the ranker. Both return the same ten pages for "how to boil an egg"; only the order differs.

- **Ranker X** is our list: grades **[0, 3, 0, 2, 0, 1, 0, 0, 0, 1]** — hits at positions 2, 4, 6, 10.
- **Ranker Y** puts all the junk first: grades **[0, 0, 0, 0, 0, 0, 3, 2, 1, 1]** — hits at positions 7, 8, 9, 10.

Score both, by hand:

1. **Precision@10.** Four hits out of ten, both times. X = **0.400**, Y = **0.400**. Identical. The metric cannot see the difference.
2. **Precision@5.** X has two hits in the top five: **0.400**. Y has none: **0.000**. Now they separate.
3. **RR.** X's first hit is at position 2 → **0.500**. Y's is at position 7 → 1/7 = **0.143**.
4. **AP for Y.** Hits at 7, 8, 9, 10 give precisions 1/7 = 0.143, 2/8 = 0.250, 3/9 = 0.333, 4/10 = 0.400. Sum 1.126, divide by R = 4: **AP = 0.282**, against X's **0.475**.
5. **NDCG for Y.** DCG = 3(0.3333) + 2(0.3155) + 1(0.3010) + 1(0.2891) = **2.2210**. IDCG is unchanged at **5.1925**, because it depends only on which grades exist, not on where they sit. **NDCG = 2.2210 / 5.1925 = 0.4277**, against X's **0.6547**.

Every order-aware metric ranks X above Y, and by a lot. Precision@10 calls them equal. That is the entire argument for this family of metrics, in one table of numbers.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake, walked into on purpose',
      md: `A team runs a "feeling lucky" answer box: the page shows **one** result, and the user either gets their answer or leaves. The team grades the ranker on **Precision@10**, because that is the metric they had lying around from the old ten-blue-links page.

- Their current ranker is X: Precision@10 = **0.400**.
- A new model, Y, comes along. Precision@10 = **0.400**. The dashboard says "no change, harmless, ship it".
- They ship it. The answer box now shows position 1 of Y — which is *"Egg nutrition chart"*, grade 0. Every single user who asks how to boil an egg gets a nutrition table.
- Under X, the answer box showed position 1 too — also junk, but X at least had a useful page at position 2, one scroll away. Under Y the first useful page is at position 7.
- Sessions collapse. The dashboard never moved.

**The diagnosis.** Precision@10 measures a set: which pages made the top ten. The product measures a position: what is at rank 1. The metric was answering a question nobody was asking. Choose the metric from the surface the user sees — one slot means MRR or Precision@1; ten links means NDCG@10 or MAP; a candidate-fetching stage feeding a reranker means Recall@K. The same failure hides inside K itself: reporting Precision@10 for a page that shows five results is measuring five rows the user will never see.

The neighbouring mistake, worth naming: computing MAP by pooling. Take the two queries from earlier, throw all six recorded precision values into one pile and average them, and you get 0.594 instead of the correct 0.654. Pooling hands more weight to whichever query happened to have more relevant results. MAP means one AP per query, then one average over queries — never one big average over hits.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Pen and paper first. All the arithmetic is small on purpose. The egg list is grades [0, 3, 0, 2, 0, 1, 0, 0, 0, 1] with R = 4.

1. Compute **Precision@3** and **Recall@3** on the egg list.
2. A different query has **R = 3** relevant pages in the corpus, but the ranker only returns three results, with hits at positions 1 and 3. Compute **AP**. Be careful with the denominator.
3. A two-item list has grades **[1, 3]**. Compute **DCG**, **IDCG** and **NDCG**. Discounts: position 1 is 1.0000, position 2 is 0.6309.
4. A ranker moves one useful page from position 10 to position 3 on the egg list, changing the grades to [0, 3, 1, 2, 0, 1, 0, 0, 0, 0]. Which of Precision@10, AP and NDCG change, and in which direction? You may reason without computing NDCG exactly.`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `Check every step, not just the final number.

1. Positions 1 to 3 are: not useful, **useful**, not useful — one hit. **Precision@3 = 1/3 = 0.333.** **Recall@3 = 1/4 = 0.250**, because four relevant pages exist in total and only one made the cut.
2. Precision at position 1 is 1/1 = 1.000. Precision at position 3 is 2/3 = 0.667. Sum = 1.667. Divide by **R = 3**, not by 2 and not by 3-results-returned: **AP = 1.667 / 3 = 0.556.** The third relevant page was never retrieved, so it contributes nothing to the sum but still sits in the denominator — that is how AP charges you for a miss.
3. **DCG** = 1 × 1.0000 + 3 × 0.6309 = 1.0000 + 1.8928 = **2.8928**. Ideal order is [3, 1], so **IDCG** = 3 × 1.0000 + 1 × 0.6309 = **3.6309**. **NDCG = 2.8928 / 3.6309 = 0.797.** The only fault in this ranking is that the two results are the wrong way round, and it costs about 20%.
4. **Precision@10 does not change**: still four hits in the top ten, still 0.400. **AP rises.** Recompute: hits now at 2, 3, 4 and 6, giving precisions 1/2 = 0.500, 2/3 = 0.667, 3/4 = 0.750 and 4/6 = 0.667; sum 2.584, divided by 4 = **0.646**, up from 0.475. **NDCG rises** too: the grade-1 page moved from discount 0.2891 to discount 0.5000, so DCG gains about 0.21 while IDCG is unchanged (the multiset of grades is the same). Precision@10 is the only one of the three that is blind to a change every user would notice.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. This section only names ideas you will meet later.

- **Exponential gain.** Instead of using the grade directly, some systems use 2^grade − 1, turning grades 0/1/2/3 into gains 0/1/3/7. A "perfect" page is then worth seven "okay" pages instead of three. Web search uses it because the value of relevance to a user is not linear. Both conventions are legitimate and they give different numbers on the same ranking, so a NDCG figure is meaningless unless you say which gain you used.
- **Where grades come from, and why that is fragile.** Human raters are slow and expensive, so many teams infer grades from clicks. But users click position 1 partly *because* it is position 1, so click-derived labels reward whatever ordering was already being shown. This is called **position bias**, and it means an offline NDCG improvement is evidence, not proof. Live A/B tests decide what ships; offline metrics decide what is worth A/B testing.
- **The pool problem.** IDCG is computed over the items you actually have grades for — usually the top few results of the *current* system. A genuinely better page that the current system never surfaced is not in the pool, so nobody can get credit for finding it. Offline ranking evaluation can only score rearrangements of what was already shown.
- **NDCG is not differentiable.** Sorting has no slope, so you cannot train a model directly on NDCG the way you descend a loss. Learning-to-rank systems train on stand-ins instead: penalise every wrongly-ordered pair of results, or weight each pair's push by how much swapping those two would move NDCG. That second trick is what LambdaMART does.
- **NDCG@K versus NDCG.** When you cut at K, there is a choice about how IDCG is computed — over the top K of the ideal ordering, or over everything. Libraries differ. It matters when a query has more relevant items than K, and it is worth checking your library rather than assuming.`,
    },
  ],
  quiz: [
    {
      question: 'Two rankers return the same ten pages for a query in different orders. Which metric can tell them apart?',
      options: [
        { text: 'Precision@10', explanation: 'It cannot. Same ten pages means the same hit count over the same cut, whatever the order.' },
        { text: 'Recall@10', explanation: 'Also blind here. Recall counts which relevant pages made the cut, not where inside it they landed.' },
        { text: 'NDCG@10', explanation: 'Correct. Every position carries a different discount, so moving a relevant page from position 8 to position 1 changes the sum. MAP and MRR are also order-sensitive.' },
      ],
      correct: 2,
    },
    {
      question: 'A query has only 2 relevant pages in the whole corpus, and a perfect ranker puts both at positions 1 and 2. What is Precision@10?',
      options: [
        { text: '1.0, because the ranking is perfect', explanation: 'Precision@10 divides by K = 10 whatever happens. Being perfect does not change the denominator.' },
        { text: '0.2, because the ceiling is R/K', explanation: 'Correct: 2/10. The cap is set by the data, not the model, and it differs per query — which is why averaging Precision@K across queries averages different ceilings.' },
        { text: 'Undefined', explanation: 'It is well defined, just capped. Recall@10 here would be 1.0, which is why you report both.' },
      ],
      correct: 1,
    },
    {
      question: 'A five-item list has hits at positions 2 and 4, and R = 2. What is AP?',
      options: [
        { text: '(0.5 + 0.5) / 2 = 0.500', explanation: 'Correct. Precision at position 2 is 1/2 = 0.5, precision at position 4 is 2/4 = 0.5, and you divide by R = 2.' },
        { text: '(0 + 0.5 + 0 + 0.5 + 0) / 5 = 0.200', explanation: 'Wrong denominator. AP averages only the ranks holding a hit, over R — not over the length of the list.' },
        { text: '2 / 5 = 0.400', explanation: 'That is Precision@5, one single cut. AP records precision at every position where a relevant item appears.' },
      ],
      correct: 0,
    },
    {
      question: 'In MAP, what is averaged over what?',
      options: [
        { text: 'Precision values are averaged over all hits from all queries pooled together', explanation: 'That is the pooling mistake. It gives queries with more relevant items more weight, and it produced 0.594 instead of the correct 0.654 in the module.' },
        { text: 'AP is computed per query by averaging precision over hit ranks, then AP is averaged over queries', explanation: 'Correct. Two stacked averages: the inner one over ranks inside one query, the outer one over queries. Each query gets exactly one vote.' },
        { text: 'Precision@K is averaged over several values of K', explanation: 'No K appears in MAP at all. AP already walks every position where a hit lands.' },
      ],
      correct: 1,
    },
    {
      question: 'Why divide DCG by IDCG?',
      options: [
        { text: 'To remove the position discount', explanation: 'The discount is in the numerator and the denominator, so it survives. What normalisation removes is the query-dependent ceiling.' },
        { text: 'To make the metric trainable by gradient descent', explanation: 'It is not differentiable either way — sorting has no slope. That is a separate problem, solved by surrogate ranking losses.' },
        { text: 'To bound the score in [0, 1] so queries with different numbers of relevant pages are comparable', explanation: 'Correct. Raw DCG rewards queries that simply have more good pages available. IDCG is the best achievable DCG on that exact query, so the ratio measures the ranker, not the query.' },
      ],
      correct: 2,
    },
    {
      question: 'What does the +1 inside 1/log2(position + 1) do?',
      options: [
        { text: 'It makes the discount at position 1 come out to exactly 1.0', explanation: 'Correct. log2(1 + 1) = log2(2) = 1, so the first position keeps its whole gain. Without the +1 you would divide by log2(1) = 0.' },
        { text: 'It stops the discount from ever reaching zero', explanation: 'The discount never reaches zero anyway, since log2 of any finite number is finite. The +1 is about position 1 specifically.' },
        { text: 'It compensates for Python indexing from 0', explanation: 'Unrelated. The formula is written in human position numbers starting at 1; the index conversion is a separate line in the code.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why can you not just use precision and recall to evaluate a search engine?',
      answer:
        'Because they measure a set and search produces an order. Return the same ten documents in two different arrangements and precision, recall and F1 print identical numbers, while the user experience is completely different — the top result gets a large share of the clicks and the tenth gets almost none. Precision@K adds a cut at the position where the eye stops, but it is still blind inside the cut. Ranking metrics fix this by weighting by position: MRR through 1/rank of the first hit, MAP through precision measured at each hit rank, NDCG through a 1/log2(rank+1) discount on every result. The cost of getting it wrong is concrete: you ship a model that looks identical offline and loses sessions in production.',
      isCaseBased: false,
    },
    {
      question: 'Compute NDCG on the graded list [0, 3, 0, 2, 0, 1, 0, 0, 0, 1], out loud.',
      answer:
        'Only the non-zero positions matter. Discounts are 1/log2(position+1): position 2 gives 0.6309, position 4 gives 0.4307, position 6 gives 0.3562, position 10 gives 0.2891. DCG = 3(0.6309) + 2(0.4307) + 1(0.3562) + 1(0.2891) = 1.8928 + 0.8614 + 0.3562 + 0.2891 = 3.3994. For IDCG, sort the same grades best-first to [3, 2, 1, 1, ...] and score that: 3(1.0000) + 2(0.6309) + 1(0.5000) + 1(0.4307) = 5.1925. NDCG = 3.3994 / 5.1925 = 0.655. I would add two notes: IDCG uses the same grades rearranged, not different data, and this is linear gain — with exponential gain 2^rel − 1 the same ranking gives a different number, so the convention has to be stated.',
      isCaseBased: false,
    },
    {
      question: 'MRR, MAP or NDCG — how do you choose, and what does each one hide?',
      answer:
        'By the shape of the labels. MRR when exactly one answer is right, such as factoid QA or "did retrieval surface the right document" — it hides everything below the first hit, so [good, junk, junk] scores the same 1.0 as [good, good, good]. MAP when relevance is yes/no and the whole list matters, as in legal or patent search — it hides grade information, treating a perfect page and a barely-useful one identically. NDCG when relevance is graded and position matters, which covers web and product search — it hides less, but it needs a rating pipeline you have to fund, its number depends on the gain convention, and its IDCG is computed only over the pool of items someone bothered to grade.',
      isCaseBased: false,
    },
    {
      question: 'What is the difference between AP and MAP, precisely?',
      answer:
        'AP is a single query\'s score. You walk that query\'s ranked list, and every time you land on a relevant result you record the precision at that exact position; you add those recorded values and divide by R, the total number of relevant items for the query. Items that were never retrieved still sit in that denominator, which is how AP charges you for a miss. MAP is the mean of AP across queries — one AP per query, one plain average over queries, each query weighted equally. The mistake to avoid is pooling: throwing every recorded precision value from every query into one bucket and averaging. That gives more influence to queries that happen to have more relevant documents, and it is not MAP.',
      isCaseBased: false,
    },
    {
      question: 'Why the log2 discount specifically, rather than 1/rank or a flat weight?',
      answer:
        'It is a design choice matched to how people read a page, not a derivation, and saying so is more honest than inventing a proof. A flat weight says position 10 is worth as much as position 1, which contradicts every click log ever measured. The 1/rank shape used by MRR is the opposite extreme: it falls to 0.1 by position 10, so it treats positions 10 through 50 as interchangeable rubbish and stops discriminating exactly where a long results page still matters. The log sits between them: it starts at exactly 1.0 at position 1 because of the +1 inside, halves by position 3, and is still 0.29 at position 10 and 0.23 at position 20. Steep where users really do quit, gentle where scrollers still find things.',
      isCaseBased: false,
    },
    {
      question: 'Case: an answer box shows one result. The team grades the ranker on Precision@10 and ships a model with no change in that number. Sessions drop. Diagnose it.',
      answer:
        'The metric was measuring a surface that does not exist. Precision@10 asks which ten pages made the top ten and is completely indifferent to their order, so two rankers can score an identical 0.400 while one puts a useful page at position 2 and the other puts its first useful page at position 7. The product shows exactly one result, so the only thing that mattered was position 1, and the metric could not see it. Concretely, on the module\'s example both rankers score Precision@10 = 0.400, while reciprocal rank is 0.500 versus 0.143 and NDCG is 0.655 versus 0.428 — every order-aware metric separates them by a wide margin. The fix is to choose the metric from the surface: one visible slot means Precision@1 or MRR; ten blue links means NDCG@10 or MAP; a candidate-fetch stage feeding a reranker means Recall@K, because its only job is to not lose the good pages. A secondary lesson: K itself must match the UI. Reporting Precision@10 for a page that shows five results grades five rows nobody will ever see. And before shipping on any offline number, check whether the change is visible where users actually look — a metric that cannot move when the user experience collapses is not a weak metric, it is the wrong metric.',
      isCaseBased: true,
    },
    {
      question: 'Case: your reranker improves offline NDCG@10 by 6%, but the A/B test shows no change in clicks. Explain and debug.',
      answer:
        'Trust the A/B test first: it measures users, the offline number measures a log. Then work through the hypotheses. One, the labels came from clicks produced under the old ranking, so they carry position bias — check whether the NDCG gain came from reordering inside the top three, which users barely perceive, or from moving items lower down where nobody looks. Two, segment the queries into head, torso and tail; a large lift on rare queries that carry almost no traffic will not show up in aggregate clicks. Three, ceiling effects — the old ranker may already have been good on the queries that matter, so translate the NDCG delta into an implied click delta before believing it is meaningful. Four, target mismatch: human relevance grades and clicks are different things, and raters often reward comprehensiveness where users reward speed. Five, statistical power — a 6% NDCG move might imply a 0.2% click move that the test simply cannot detect, so check the minimum detectable effect before reading "no change" as a real result. The practical next step is an interleaving experiment, which mixes both rankers into a single results page so both are exposed to the same users at the same positions, cancelling most position bias and reaching significance on far less traffic.',
      isCaseBased: true,
    },
    {
      question: 'Case: a retrieval system for a question-answering product reports Recall@20 of 0.95, but answers are still poor. Where do you look?',
      answer:
        'Recall@20 of 0.95 says the right passage is almost always somewhere in the twenty retrieved. It says nothing about where. Compute rank-aware numbers over the same queries: MRR and NDCG@5. If the correct passage habitually sits at rank 12 to 18, the answer generator is being handed twenty chunks with the good one buried in the middle, which is the worst place for it — models attend most strongly to the start and end of what they are given. Fixes in increasing cost: pass fewer chunks, reorder so the highest-scoring chunk goes first, or add a reranking stage and pass only the top three to five. Second place to look is the unit of measurement: recall may have been computed at chunk level while answering the question needs two chunks stitched together, so chunk recall can be 0.95 while the fraction of questions that are actually answerable is much lower. Third, check how the labels were made — if the correct passage was chosen using the same retrieval model being graded, the recall figure is self-assessed and inflated. The general lesson: recall is the right metric for the fetching stage, but downstream quality depends on rank, so a ranking metric has to be watched even when recall looks perfect.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Why ranking needs its own metrics', back: 'Precision, recall and F1 measure a set. Reorder the same retrieved pages and they do not move. Users read top-down, so position is the product.' },
    { front: 'Precision@K vs Recall@K', back: 'P@K = relevant in top K, divided by K (what the user feels). R@K = relevant in top K, divided by R, all relevant that exist (how you grade a retrieval stage). K comes from the UI, not from tuning.' },
    { front: 'The Precision@K ceiling', back: 'With only R relevant pages and R < K, even a perfect ranker maxes out at R/K. Ceilings differ per query, which is why averaging P@K across queries is shaky and why NDCG normalises.' },
    { front: 'MRR', back: 'Reciprocal rank = 1 / (position of the FIRST relevant result); MRR is that averaged over queries. Use when exactly one answer is right. Blind to everything after the first hit.' },
    { front: 'AP, in three steps', back: '1) Walk the list, at every hit record Precision@(that position). 2) Add them. 3) Divide by R, the total relevant. Egg list: (0.5+0.5+0.5+0.4)/4 = 0.475.' },
    { front: 'MAP: what is averaged over what', back: 'AP averages precision across HIT RANKS inside one query. MAP averages AP across QUERIES, one vote each. Never pool all hits from all queries into one average.' },
    { front: 'The position discount', back: '1/log2(position+1). Position 1 = 1.000, position 3 = 0.500, position 10 = 0.289, position 20 = 0.228. The +1 makes position 1 come out at exactly 1. Steeper than flat, gentler than 1/rank.' },
    { front: 'DCG / IDCG / NDCG', back: 'DCG = sum of grade x discount. IDCG = same grades sorted best-first, scored the same way. NDCG = DCG/IDCG, always in [0,1], comparable across queries. Egg list: 3.3994 / 5.1925 = 0.6547.' },
  ],
  mindmapMarkdown: `- Ranking Metrics: Precision@K, MAP & NDCG
  - The setup
    - one query, ten results, in an order
    - relevance = does this help THIS query (a human label)
    - "@K" = look at the first K only; K comes from the screen
    - egg list: hits at positions 2, 4, 6, 10 so R = 4
  - Precision@K / Recall@K
    - P@5 = 2/5 = 0.400
    - R@5 = 2/4 = 0.500
    - blind to order inside the cut
    - ceiling R/K when R < K
  - MRR
    - RR = 1 / position of first hit; egg list 1/2 = 0.500
    - MRR = mean of RR over queries
    - use when exactly one answer is right
  - AP and MAP
    - record Precision@position at every hit
    - add, divide by R -> AP = 1.900/4 = 0.475
    - MAP = mean of AP over queries (never pool hits)
  - NDCG
    - graded relevance 3/2/1/0 from raters
    - discount 1/log2(position+1); pos 1 = 1.000, pos 10 = 0.289
    - DCG = sum of grade x discount = 3.3994
    - IDCG = same grades sorted best-first = 5.1925
    - NDCG = 0.6547, always in [0,1]
  - Choosing
    - one answer -> MRR
    - binary labels, whole list -> MAP
    - graded labels + position -> NDCG
    - pipeline: Recall@K to fetch, NDCG@K to rerank
  - Traps
    - Precision@10 cannot see order; ship a disaster with no change
    - pooling hits across queries is not MAP
    - offline labels carry position bias`,
}

export default m
