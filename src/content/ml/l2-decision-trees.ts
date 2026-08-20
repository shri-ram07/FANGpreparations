import type { Module } from '../types'

const m: Module = {
  id: 'ml-l2-decision-trees',
  subjectId: 'ml',
  level: 2,
  title: 'Decision Trees: Splits, Impurity and Pruning',
  whyItMatters:
    'A decision tree is a flowchart of yes/no questions that a computer wrote by reading data. It is the one model whose reasoning you can read out loud - "the petal was narrow, so I said class A" - and it is the building block of the two methods that still win most spreadsheet-shaped problems. This module builds a tree from ten rows by hand: you will pick the first question yourself, with arithmetic you can check on paper, and see exactly why one question beats another.',
  assumes: [
    'You have read *Loss vs Metric* - you know that a loss is the number the model improves and a metric is the number a person judges by',
    'You have read *The Confusion Matrix* - you know what accuracy is and how to count correct predictions',
    'You have seen a Python list, a for loop, an if statement and a function',
    'School maths: fractions, squaring a number, and what an average is. No calculus is used here.',
  ],
  estMinutes: 40,
  sections: [
    {
      type: 'intuition',
      title: 'Ten flowers and one question',
      md: `Here are ten flowers. For each one we measured two things with a ruler - the length of the petal and the width of the petal, both in centimetres - and a botanist wrote down which of two species it is. We will call the species **A** and **B**.

- The five **A** flowers, written as (length, width): (1.4, 0.2), (1.3, 0.2), (1.5, 0.4), (1.7, 0.6), (3.0, 1.1).
- The five **B** flowers: (2.2, 1.0), (4.7, 1.4), (4.5, 1.5), (4.9, 1.5), (4.0, 1.3).
- Now a new flower arrives: length 1.6, width 0.3. Which species is it?

You probably answered A already, and you did it by asking yourself something like *is the petal longer than 2.5 cm?* The answer is no, so this flower belongs with the first four A flowers, so the answer is A.

That question - one measurement, one number, one yes-or-no answer - is the only kind of question a decision tree is allowed to ask. A tree is nothing but a stack of those questions, one after another, chosen by looking at data instead of by intuition.`,
    },
    {
      type: 'intuition',
      title: 'The whole tree, and the words for its parts',
      md: `Here is a complete tree for those ten flowers. Read it as a flowchart, top to bottom. It classifies all ten correctly.

1. Is the petal **width** 0.8 cm or less? If yes, answer **A** and stop.
2. Otherwise: is the petal **length** more than 3.5 cm? If yes, answer **B** and stop.
3. Otherwise: is the petal **length** 2.6 cm or less? If yes, answer **B** and stop.
4. Otherwise, answer **A**.

Six words, defined now and used for the rest of the module.

- A **node** is one box in the flowchart. It holds a group of rows - at the top, all ten of them.
- The **root** is the topmost node, the one holding every row, where the first question is asked.
- A **split** is one question applied to a node: it sends each row into one of two child nodes, yes to the left and no to the right.
- A **leaf** is a node that asks no question. It just holds an answer, and the answer is the most common label among the training rows that landed there.
- **Depth** is how many questions you had to answer to reach a leaf. Question 1 above is at depth 0, so the tree has depth 3.
- Predicting means walking one path from the root down to a leaf. Nothing else happens - no multiplying, no averaging, just comparisons.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The data and that tree, in plain Python',
      code: `rows = [
    [1.4, 0.2, 'A'], [1.3, 0.2, 'A'], [1.5, 0.4, 'A'], [1.7, 0.6, 'A'], [3.0, 1.1, 'A'],
    [2.2, 1.0, 'B'], [4.7, 1.4, 'B'], [4.5, 1.5, 'B'], [4.9, 1.5, 'B'], [4.0, 1.3, 'B'],
]

def predict(length, width):
    if width <= 0.8:
        return 'A'
    if length > 3.5:
        return 'B'
    if length <= 2.6:
        return 'B'
    return 'A'

for r in rows:
    print(r[0], r[1], 'true', r[2], 'predicted', predict(r[0], r[1]))

# ---- real output ----
# 1.4 0.2 true A predicted A
# 1.3 0.2 true A predicted A
# 1.5 0.4 true A predicted A
# 1.7 0.6 true A predicted A
# 3.0 1.1 true A predicted A
# 2.2 1.0 true B predicted B
# 4.7 1.4 true B predicted B
# 4.5 1.5 true B predicted B
# 4.9 1.5 true B predicted B
# 4.0 1.3 true B predicted B`,
      annotations: {
        1: 'rows is a list of lists. Each inner list is one flower, and it always holds three things in the same order: petal length, petal width, species.',
        2: 'The five A flowers. So rows[0][0] is 1.4 (a length), rows[0][1] is 0.2 (a width) and rows[0][2] is the string A (the label).',
        3: 'The five B flowers, in exactly the same format. Ten rows in total.',
        4: 'The closing bracket of the list. Python lets a list run over several lines, which is only for readability here.',
        6: 'Defines a function called predict that takes the two measurements of one flower and returns a species. This function IS the tree, hand-written for now.',
        7: 'The root question. <= means "less than or equal to". Every flower whose width is 0.8 or below goes down this branch.',
        8: 'A leaf. return ends the function immediately, so nothing below this line runs for a narrow-petalled flower.',
        9: 'Only flowers with width above 0.8 reach this line - the yes-branch already returned. This is the second question, on the other measurement.',
        10: 'Another leaf: long petal and wide petal means B.',
        11: 'Reached only by flowers that are wide but not long. Third question, on length again - the same feature can be tested more than once in one tree.',
        12: 'A leaf holding B. This is the single B flower with a short petal, (2.2, 1.0).',
        13: 'The last leaf. Anything that answered no to all three questions is A - that is the flower (3.0, 1.1).',
        15: 'Walk through the ten rows one at a time. r is the current three-element list.',
        16: 'Print the measurements, the true label from r[2], and what the tree says. Every line of the output below agrees, so this tree gets all ten right.',
      },
    },
    {
      type: 'intuition',
      title: 'Where does the first question come from?',
      md: `That tree was handed to you. A real algorithm has to choose the first question itself, out of every question it could ask. So it needs a way to score a question, and the score is built on one idea: **impurity**.

- **Impurity** is a number that says how mixed the labels in a node are. Low means the rows mostly share one label. Zero means they all share it.
- A node holding 5 A and 5 B is as mixed as a two-class node can get: knowing a row is in there tells you nothing.
- A node holding 4 A and 0 B is **pure**: impurity 0, and it can safely become a leaf.
- So a good question is one that takes a mixed node and produces children that are less mixed than the parent was.
- That is the whole training algorithm in one sentence: try every question, measure how much impurity it removes, keep the best one, repeat inside each child.

We need to turn "how mixed" into an actual number. There are two standard ways, and we will compute both by hand.`,
    },
    {
      type: 'intuition',
      title: 'Gini impurity, computed by hand',
      md: `**Gini impurity** measures mess like this: pick two rows from the node at random, one after the other. What is the chance their labels disagree? That chance is the Gini impurity. All same label means the chance is 0.

Write p for the fraction of rows in the node carrying a given label. Then the chance both picks are label A is p_A x p_A, and the chance both are B is p_B x p_B. Agreeing means one of those happened, so disagreeing is 1 minus their sum.

- **The root**, 5 A and 5 B. p_A = 5/10 = 0.5 and p_B = 0.5. Gini = 1 - (0.5 x 0.5) - (0.5 x 0.5) = 1 - 0.25 - 0.25 = **0.500**.
- **A pure node**, 4 A and 0 B. p_A = 1 and p_B = 0. Gini = 1 - 1 - 0 = **0.000**. Two random picks can never disagree.
- **A nearly pure node**, 1 A and 5 B. p_A = 1/6 = 0.1667 and p_B = 5/6 = 0.8333. Gini = 1 - 0.0278 - 0.6944 = **0.278**.

0.500 is the worst a two-label node can score, 0.000 is the best, and 0.278 is a node that is mostly settled but not finished. Those three numbers are all we need to compare questions.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Gini in code, checking the three numbers above',
      code: `def gini(labels):
    total = len(labels)
    score = 1.0
    for name in ['A', 'B']:
        p = labels.count(name) / total
        score = score - p * p
    return score

root = [r[2] for r in rows]
print(root)
print(round(gini(root), 4))
print(round(gini(['A', 'A', 'A', 'A']), 4))
print(round(gini(['A', 'B', 'B', 'B', 'B', 'B']), 4))

# ---- real output ----
# ['A', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B']
# 0.5
# 0.0
# 0.2778`,
      annotations: {
        1: 'Takes one argument, labels: a plain list of strings like [\'A\', \'B\', \'B\']. It does not need the measurements, only the labels in the node.',
        2: 'len() gives how many rows are in the node. This is the denominator of every fraction below.',
        3: 'Start the running score at 1.0, because the formula is 1 minus a sum. We will subtract each label\'s share.',
        4: 'Loop over the two label names. With three classes you would loop over three names; nothing else would change.',
        5: 'labels.count(name) counts how many times that string appears in the list. Divided by total, that is p - the fraction of the node carrying this label.',
        6: 'Subtract p times p, exactly as in the hand calculation. After both passes, score holds 1 - p_A squared - p_B squared.',
        7: 'Hand the number back to whoever called gini().',
        9: 'A list comprehension: read it as "take r[2] for every r in rows". It builds a new list holding just the ten labels, dropping the measurements.',
        10: 'Print that list so you can see it really is five A followed by five B.',
        11: 'The root node scores 0.5 - matching the hand calculation. round(x, 4) just trims the decimals for display.',
        12: 'A node of four A flowers scores 0.0. Pure.',
        13: 'One A and five B scores 0.2778, the third hand calculation. Python shows 0.2778 where we wrote 0.278.',
      },
    },
    {
      type: 'intuition',
      title: 'Two candidate questions, and the arithmetic that picks one',
      md: `Now score two real candidates on our ten flowers. Both look sensible to the eye.

**Candidate 1: is petal length 2.5 cm or less?** Yes takes (1.4), (1.3), (1.5), (1.7) which are A, and (2.2) which is B - so 4 A and 1 B. No takes (3.0) which is A, plus the four long B flowers - so 1 A and 4 B.

- Yes-child Gini: p = 4/5 and 1/5, so 1 - 0.64 - 0.04 = **0.320**. No-child is the mirror image: **0.320**.
- Both children hold 5 of the 10 rows, so the impurity after the split is (5/10)(0.320) + (5/10)(0.320) = **0.320**.
- Improvement = parent impurity minus impurity after = 0.500 - 0.320 = **0.180**.

**Candidate 2: is petal width 0.8 cm or less?** Yes takes the four narrow A flowers - pure. No takes the remaining six: (3.0, 1.1) which is A and all five B.

- Yes-child Gini = **0.000** (pure, 4 rows). No-child Gini = **0.278** (1 A and 5 B, 6 rows).
- After the split = (4/10)(0.000) + (6/10)(0.278) = 0 + 0.167 = **0.167**.
- Improvement = 0.500 - 0.167 = **0.333**.

0.333 beats 0.180, so the tree asks about **width** first, not length - even though length was the question your eye jumped to. That improvement number has a name: **information gain**, the drop in impurity caused by a split.`,
    },
    {
      type: 'note',
      md: `The weighting is the step people get wrong. You must weight each child by its **share of the rows**, not average the two children equally. In candidate 2 a plain average would be (0.000 + 0.278) / 2 = 0.139, which pretends the 4-row child and the 6-row child matter the same. They do not: 6 of the 10 rows are still sitting in the messy one. Multiply each child\'s impurity by its row share, then add. Every impurity measure in every tree library does it this way.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Scoring both candidates with code',
      code: `def split_score(col, threshold):
    left = [r[2] for r in rows if r[col] <= threshold]
    right = [r[2] for r in rows if r[col] > threshold]
    n = len(rows)
    after = (len(left) / n) * gini(left) + (len(right) / n) * gini(right)
    return len(left), len(right), round(after, 4), round(gini(root) - after, 4)

print('petal_length <= 2.5 ->', split_score(0, 2.5))
print('petal_width  <= 0.8 ->', split_score(1, 0.8))

# ---- real output ----
# petal_length <= 2.5 -> (5, 5, 0.32, 0.18)
# petal_width  <= 0.8 -> (4, 6, 0.1667, 0.3333)`,
      annotations: {
        1: 'col says which measurement to test: 0 for petal length, 1 for petal width, because that is the order inside each row. threshold is the number to compare against.',
        2: 'A comprehension with a filter on the end: take the label r[2] of every row whose chosen measurement is at or below the threshold. That is the yes-child.',
        3: 'The same thing with > instead of <=, giving the no-child. Every row lands in exactly one of the two lists.',
        4: 'n is 10, the number of rows in the parent. It is the denominator of both row shares.',
        5: 'Impurity after the split: each child\'s Gini multiplied by its share of the rows, then added. This is the weighted sum from the hand calculation.',
        6: 'Return four things at once as a tuple: how many rows went left, how many went right, the impurity after, and the gain (parent impurity minus after).',
        8: 'Candidate 1. The printed (5, 5, 0.32, 0.18) matches the hand arithmetic exactly.',
        9: 'Candidate 2. (4, 6, 0.1667, 0.3333) - a bigger gain, so this is the question the tree keeps.',
      },
    },
    {
      type: 'intuition',
      title: 'Entropy: the other ruler, and it agrees',
      md: `**Entropy** is a second way to measure the same mess. It comes from information theory and is measured in **bits**: how many yes/no answers you would need, on average, to learn the label of a random row from the node. A pure node needs zero questions; a 50/50 node needs exactly one.

The recipe: for each label, take its fraction p, multiply p by log base 2 of p, add those up, and flip the sign. Log base 2 of a number x answers "2 to what power gives x". You only need three values here: log2(0.5) = -1, log2(1/6) = -2.585, log2(5/6) = -0.263.

- **Root**, 5 A and 5 B: entropy = -(0.5 x -1) - (0.5 x -1) = 0.5 + 0.5 = **1.000 bit**. The maximum for two labels.
- **The 6-row child**, 1 A and 5 B: -(0.1667 x -2.585) - (0.8333 x -0.263) = 0.431 + 0.219 = **0.650 bits**.
- **Candidate 2 after the split**: (4/10)(0) + (6/10)(0.650) = 0.390. Information gain = 1.000 - 0.390 = **0.610 bits**.
- **Candidate 1 after the split**: each 4-and-1 child has entropy 0.722 bits, so after = 0.722 and the gain is 1.000 - 0.722 = **0.278 bits**.

0.610 beats 0.278, so entropy picks width too. That is the normal outcome: the two rulers give different numbers but almost always rank the questions the same way. Gini needs a squaring, entropy needs a logarithm, so Gini is slightly cheaper to compute and is the default in most libraries. Choosing between them is not where your time goes.`,
    },
    {
      type: 'math',
      intro: 'The two impurity measures and the gain, now in symbols. S is a node, K is how many labels exist, and p_k is the fraction of the rows in S carrying label k. Every number above came out of these three lines.',
      latex: [
        'G(S) \\;=\\; 1 - \\sum_{k=1}^{K} p_k^2 \\qquad\\qquad H(S) \\;=\\; -\\sum_{k=1}^{K} p_k \\log_2 p_k',
        '\\text{Gain} \\;=\\; I(\\text{parent}) \\;-\\; \\sum_{c \\,\\in\\, \\text{children}} \\frac{n_c}{n}\\, I(c) \\qquad I \\in \\{G, H\\}',
        '\\text{Regression: } \\; I(S) = \\frac{1}{n_S}\\sum_{i \\in S}\\left(y_i - \\bar{y}_S\\right)^2 \\quad \\text{(the spread of the numbers around the node mean)}',
      ],
    },
    {
      type: 'note',
      md: `That third line is the whole story of a **regression tree** - a tree that predicts a number instead of a label. Only two things change. Impurity becomes "how spread out are the numbers in this node", measured as the average squared distance from the node\'s mean. And a leaf predicts the **average** of the training numbers that reached it, one flat constant per leaf. Everything else - try every question, weight children by row share, keep the biggest drop - is identical. One consequence worth remembering: since each leaf stores a constant, a regression tree can never predict a value outside the range it saw in training.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One split, step by step',
        notice: 'Left column = the question being tested. Right column = the two nodes it produces, with the Gini impurity of each. The tree keeps whichever question drops the row-weighted impurity the most.',
        leftLabel: 'question tested',
        rightLabel: 'resulting nodes',
        frames: [
          {
            note: 'Start. All ten flowers sit at the root, 5 A and 5 B - the most mixed a two-label node can be. Gini 0.500.',
            stack: [{ name: 'root (no question yet)', to: 'p' }],
            heap: [{ id: 'p', value: '10 rows - 5 A / 5 B', label: 'Gini 0.500' }],
          },
          {
            note: 'Candidate 1: is petal length <= 2.5? Children are 5 rows (4 A / 1 B) and 5 rows (1 A / 4 B). Weighted impurity = 0.5(0.320) + 0.5(0.320) = 0.320, so the gain is 0.500 - 0.320 = 0.180.',
            stack: [
              { name: 'length <= 2.5 : yes', to: 'a1' },
              { name: 'length <= 2.5 : no', to: 'a2' },
            ],
            heap: [
              { id: 'a1', value: '5 rows - 4 A / 1 B', label: 'Gini 0.320' },
              { id: 'a2', value: '5 rows - 1 A / 4 B', label: 'Gini 0.320' },
            ],
          },
          {
            note: 'Candidate 2: is petal width <= 0.8? Children are 4 rows (all A) and 6 rows (1 A / 5 B). Weighted impurity = 0.4(0.000) + 0.6(0.278) = 0.167, so the gain is 0.333.',
            stack: [
              { name: 'width <= 0.8 : yes', to: 'b1' },
              { name: 'width <= 0.8 : no', to: 'b2' },
            ],
            heap: [
              { id: 'b1', value: '4 rows - 4 A / 0 B', label: 'Gini 0.000 - pure' },
              { id: 'b2', value: '6 rows - 1 A / 5 B', label: 'Gini 0.278' },
            ],
          },
          {
            note: 'Winner: 0.333 beats 0.180, so the width question is kept. The pure child becomes a leaf immediately. The 6-row child is still mixed, so the whole search runs again inside it - that is how depth 2 appears.',
            stack: [
              { name: 'chosen: width <= 0.8', to: 'b2' },
              { name: 'leaf (finished)', to: 'b1' },
            ],
            heap: [
              { id: 'b1', value: 'LEAF - predict A', label: 'pure, nothing left to gain' },
              { id: 'b2', value: '6 rows - search again here', label: 'try every question on these rows' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'What "greedy" means, and what it costs',
      md: `The search you just watched is called **greedy**. Greedy means: at every node, take the question that looks best *right now*, and never go back to reconsider it.

- It does not look one step ahead. It never asks "would a slightly worse question here unlock a much better one below?"
- Once the width question is chosen at the root, it is fixed. Every node underneath is built inside that decision.
- The consequence, in one line: **the tree you get is the best question at each step, not the best tree overall.**
- Two mediocre-looking questions that would be excellent together can lose to one question that scores better on its own, and the search will never find the pair.
- Why nobody fixes this: checking all possible trees means checking a number of combinations that explodes with the number of rows and features. Every real library stays greedy and spends the saved effort on other things.`,
    },
    {
      type: 'intuition',
      title: 'Recursing: the second question, same arithmetic',
      md: `The pure 4-row child is done. The 6-row child - one A flower (3.0, 1.1) and five B - has Gini 0.278, so the search runs again on those six rows only.

- Candidate: is petal length 3.5 or less? Yes takes (2.2, B) and (3.0, A): 1 A and 1 B, Gini 0.500. No takes the four long B flowers: pure, Gini 0.000.
- After = (2/6)(0.500) + (4/6)(0.000) = **0.167**. Gain = 0.278 - 0.167 = **0.111**. Kept.
- Now a 2-row node with one A and one B is still mixed, so it splits again: is length 2.6 or less? Yes gives the single B, no gives the single A. Both pure.
- Total depth 3, four leaves - exactly the flowchart from the start of this module. It was not invented; it is what this arithmetic produces.
- Splitting stops when a node is pure, or when a stopping rule you set says stop. With no stopping rule, purity is the only brake.`,
    },
    {
      type: 'intuition',
      title: 'Read the playground: the boundaries are always staircases',
      md: `The panel below draws where a model changes its answer. Set the model to **tree** and drag the **max depth** slider, which runs from 1 to 6. Watch the *shape* of the coloured regions, not the accuracy number.

- **Depth 1**: one straight cut, exactly parallel to one axis. That is all a single question can ever draw, because it tests one measurement against one number.
- Each extra level of depth cuts an existing rectangle into two rectangles. Every region is always an **axis-aligned box**.
- So a clean diagonal boundary is impossible. The tree approximates it with a **staircase** of small steps, and each step costs another split.
- **Drag from 1 to 6 and watch the regions break up** into small islands wrapped tightly around individual points. That shrinking is the model starting to memorise single training points instead of describing a trend.
- The slider stops at 6. A real tree with no limit keeps going until every island holds exactly one point - the next section is about what that does.`,
    },
    { type: 'visual', component: 'DecisionBoundaryPlayground', props: { model: 'tree' } },
    {
      type: 'intuition',
      title: 'A tree with no limit always scores 100% on its training data',
      md: `Not "might". Always, as long as no two rows have identical measurements but different labels.

- With no stopping rule, splitting continues while any node is still mixed.
- If two rows in a node have different labels, some threshold on some measurement separates them - and the search tries every threshold, so it will find one.
- The process only ends when every leaf is pure. In the worst case that means one leaf per training row.
- Such a tree gets every training row right: training accuracy 1.000, zero training errors.
- That is not learning. It is a lookup table with extra steps, and it has learned nothing that transfers to a flower it has not seen.

This is **overfitting**: fitting the training rows so exactly that you fit their accidents too. The next snippet builds the extreme version deliberately, so you can see the failure rather than take my word for it.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The classic mistake: perfect training score, useless model',
      code: `memo = {}
for r in rows:
    memo[(r[0], r[1])] = r[2]

correct = 0
for r in rows:
    if memo[(r[0], r[1])] == r[2]:
        correct = correct + 1
print('train accuracy', correct / len(rows))

new_flower = (1.6, 0.3)
print('new flower ->', memo.get(new_flower, 'no rule matches'))

# ---- real output ----
# train accuracy 1.0
# new flower -> no rule matches`,
      annotations: {
        1: 'An empty dictionary. A dictionary stores key-to-value pairs and lets you look a value up by its key.',
        2: 'Walk the ten training flowers.',
        3: 'Store the label under the exact pair of measurements. (r[0], r[1]) in round brackets is a tuple - two values glued into one key. This is a tree grown to one leaf per row, written in the shortest possible way.',
        5: 'A counter for how many training rows we get right.',
        6: 'Walk the same ten rows again - the ones we just memorised.',
        7: 'Look up each flower by its measurements and compare the stored label with the true label.',
        8: 'Add one. It will fire on all ten, because every row was stored from itself.',
        9: 'Prints 1.0. A perfect training score, produced by a model containing no idea whatsoever.',
        11: 'A flower we never saw: length 1.6, width 0.3. By eye it is obviously an A - it sits right among the four narrow A flowers.',
        12: '.get(key, fallback) returns the stored value, or the fallback when the key is missing. It is missing, so we get "no rule matches". A memorising model has nothing to say about anything new.',
      },
    },
    {
      type: 'note',
      md: `Diagnose that carefully, because the mistake is not the 1.0 - it is what someone concludes from it. The printed 1.000 training accuracy is the **default behaviour** of a model that is allowed to keep splitting, not evidence of quality. A real unlimited tree does slightly better than the dictionary on the new flower - it still returns *some* leaf, so it answers A here - but it gets there through a leaf built from one flower, so the answer is one row\'s accident rather than a pattern. The honest reading: a training score tells you the model can reproduce what it was shown. Only a score on rows the model never saw during training tells you anything about a new flower. If someone reports 100% training accuracy from a tree, the correct response is to ask for the held-out score, every time.`,
    },
    {
      type: 'intuition',
      title: 'The brakes: max_depth, min_samples_leaf, and pruning',
      md: `Since the tree will memorise if you let it, every usable tree is a limited tree. The limits come in two flavours: stop it early, or let it grow and then cut it back.

- **max_depth = 3** - no path may ask more than 3 questions. Blunt, easy to explain, and usually the first thing to set. Our flower tree is exactly at depth 3.
- **min_samples_leaf = 5** - refuse any split that would leave a leaf holding fewer than 5 rows. This directly forbids the one-row leaves that cause memorisation, so it attacks the problem most precisely.
- **min_samples_split = 10** - do not even try to split a node holding fewer than 10 rows. A decision made from 3 examples is not a decision worth trusting.
- Those three are **pre-pruning**: rules that stop growth before it happens.
- **Pruning** proper (post-pruning) is the other flavour: grow the whole tree, then repeatedly delete the subtree whose removal costs the least accuracy, checking each smaller tree on held-out rows and keeping the one that scores best. You lose branches that only ever helped the training rows.
- Why bother growing it first? Because a weak split sometimes enables a strong one below it. Stopping early never discovers that pair; cutting back afterwards can keep it and trim elsewhere. The cost is that you build the big tree first.
- Choose all of these by measuring on held-out rows, not by feel. There is no depth that is correct in general.`,
    },
    {
      type: 'note',
      md: `**Feature importance** is the number a tree gives you for "how much did this measurement matter". It is computed by adding up the impurity drop of every split that used that feature, weighting each by how many rows reached that node, then scaling so the numbers add to 1. On our flowers, width would score highest because it produced the 0.333 gain at the root. Treat it with suspicion for one specific reason: a column with many distinct values offers many more thresholds to try, so it gets many more chances to look good by luck. A meaningless ID number or a timestamp routinely lands near the top of that ranking. The safer measure is to shuffle one column in the held-out data and see how much the score drops - if shuffling it changes nothing, it was not doing anything.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: eight loan applicants, by hand',
      md: `A lender has eight past applicants. Four repaid (**R**), four defaulted (**D**). Two questions are on the table. Compute both, pick one, and take one more step down. Do the arithmetic yourself first.

- The rows, as (any late payments in the last year?, income at least 40k?, outcome): (yes, yes, D), (yes, no, D), (yes, no, D), (yes, yes, D), (yes, yes, R), (no, yes, R), (no, yes, R), (no, no, R).
- **Parent**: 4 R and 4 D, so p = 0.5 each. Gini = 1 - 0.25 - 0.25 = **0.500**.
- **Question 1, any late payments?** Yes-child: 5 rows, 4 D and 1 R, Gini = 1 - (4/5)² - (1/5)² = 1 - 0.64 - 0.04 = **0.320**. No-child: 3 rows, all R, Gini = **0.000**.
- After = (5/8)(0.320) + (3/8)(0.000) = 0.200 + 0 = **0.200**. Gain = 0.500 - 0.200 = **0.300**.
- **Question 2, income at least 40k?** Yes-child: 5 rows... count them: (yes,yes,D), (yes,yes,D), (yes,yes,R), (no,yes,R), (no,yes,R) - that is 2 D and 3 R, Gini = 1 - 0.16 - 0.36 = **0.480**. No-child: 3 rows, 2 D and 1 R, Gini = 1 - 0.444 - 0.111 = **0.444**.
- After = (5/8)(0.480) + (3/8)(0.444) = 0.300 + 0.167 = **0.467**. Gain = 0.500 - 0.467 = **0.033**.

Question 1 wins by 0.300 to 0.033, and it is not close. The tree asks about late payments first, its no-branch becomes a leaf predicting R immediately, and only the 5-row yes-branch (4 D, 1 R) continues. Inside those five rows, splitting on income gives {2 D} pure and {2 D, 1 R}, so the gain there is 0.320 - [(2/5)(0) + (3/5)(0.444)] = 0.320 - 0.267 = 0.053 - a real but much smaller improvement. That shrinking gain, level by level, is the normal shape of tree growth: the first question does most of the work.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Pen and paper. Every number is small on purpose. Solutions are in the next section - write yours down first.

1. A node holds 3 spam and 1 ham. Compute its Gini impurity and its entropy. You may use log2(0.75) = -0.415 and log2(0.25) = -2.
2. A parent node has 8 rows, 4 A and 4 B. A split sends 6 rows (4 A, 2 B) left and 2 rows (0 A, 2 B) right. Compute the Gini gain. Then compute what you would get by averaging the two children equally instead, and say which is right.
3. Take our ten flowers and build a tree with max_depth = 1 - only the root question is allowed. Using the winning question (width <= 0.8), what does each leaf predict, and what is the training accuracy?
4. Someone multiplies every petal width in the dataset by 100, so 0.8 becomes 80. Does the tree change? Explain in one sentence what happens to the thresholds.
5. Two questions each have a gain of 0.180 at the root. One of them, if chosen, would allow a follow-up question with a gain of 0.310. The other allows only 0.050 below it. Which does a greedy tree pick, and what does that tell you?`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `Check every intermediate number, not just the last one.

1. p_spam = 0.75, p_ham = 0.25. Gini = 1 - (0.75 x 0.75) - (0.25 x 0.25) = 1 - 0.5625 - 0.0625 = **0.375**. Entropy = -(0.75 x -0.415) - (0.25 x -2) = 0.311 + 0.500 = **0.811 bits**. Both say "mixed, but leaning strongly one way" - and note they are not on the same scale, so never compare a Gini number against an entropy number.
2. Left Gini = 1 - (4/6)² - (2/6)² = 1 - 0.444 - 0.111 = 0.444. Right is pure, 0.000. Row-weighted: (6/8)(0.444) + (2/8)(0.000) = **0.333**. Gain = 0.500 - 0.333 = **0.167**. The equal average would be (0.444 + 0.000)/2 = 0.222, giving a fake gain of 0.278. Row weighting is right: 6 of the 8 rows are still in the mixed child, so the node as a whole is not nearly as clean as an equal average suggests.
3. The yes-leaf holds 4 rows, all A, so it predicts **A**. The no-leaf holds 6 rows - 1 A and 5 B - and a leaf predicts its most common label, so it predicts **B**. That is right on all 4 A rows in the first leaf and on the 5 B rows in the second, and wrong on the single A flower (3.0, 1.1). Training accuracy = **9/10 = 0.900**. A one-question tree already gets 90% here, which is a good reminder that the first split does most of the work.
4. Nothing changes. Every question has the form "is this measurement at or below t", so the algorithm simply chooses t = 80 where it used to choose 0.8, and every row falls on the same side as before. The tree is **identical in structure**. This is why trees need no feature scaling, unlike methods that measure distances between rows.
5. The greedy tree is indifferent between the two at the root - both gain 0.180 - and picks by whatever tie-break the library uses, with no idea that one leads to 0.310 and the other to 0.050. It cannot see one step ahead. That is exactly the price of greediness, and it is also why two trees trained on almost the same data can look completely different.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands alone. This section names ideas you will meet later so the words are not new when you get there.

- **Instability.** Add ten rows to a thousand and the root question can change, because the top two candidates were separated by 0.002 of gain. Change the root and every node below it is rebuilt differently. Accuracy may barely move while the printed flowchart looks nothing like last month\'s - which is uncomfortable if you promised someone a stable rule.
- **Many trees instead of one.** The standard fix is not a smarter tree, it is a crowd: train many trees on random samples of the rows and features, then let them vote. Independent mistakes cancel out. That is what a **random forest** is, and it is the subject of the next module. The price is the printable path - you can no longer read one flowchart and know why.
- **Cost-complexity pruning.** The formal version of the pruning described above. Score a tree as (training error) + alpha x (number of leaves), where alpha is a price you charge per leaf. alpha = 0 keeps everything; a large alpha prunes back to the root. Sweeping alpha gives you a short list of candidate trees, and you pick among them using held-out rows.
- **Categorical features.** A column like "city" has no order, so "is city <= 7" is meaningless unless the numbers you assigned happen to mean something. The usual workaround is one column per category holding 0 or 1, which works but produces many weak splits when there are hundreds of categories. Some libraries handle such columns directly by grouping categories instead.
- **Rotation.** Because every cut is parallel to an axis, rotating the data 45 degrees can force the same tree to use many more splits for the same boundary. Methods based on weighted sums of features do not care about rotation. Trees do.`,
    },
  ],
  quiz: [
    {
      question: 'A node with Gini 0.500 splits into a left child holding 4 rows with Gini 0.000 and a right child holding 6 rows with Gini 0.278. What is the gain?',
      options: [
        {
          text: '0.333 - the parent impurity minus the row-weighted child impurity',
          explanation: 'Correct. (4/10)(0.000) + (6/10)(0.278) = 0.167, and 0.500 - 0.167 = 0.333.',
        },
        {
          text: '0.361 - the parent minus the plain average of the two children',
          explanation: 'The classic slip. (0.000 + 0.278)/2 = 0.139 pretends the 4-row and 6-row children count equally. Weight each child by its share of the rows.',
        },
        {
          text: '0.278 - the impurity of the child that is still mixed',
          explanation: 'That is one child\'s impurity, not a gain. A gain always compares the parent against all children together.',
        },
      ],
      correct: 0,
    },
    {
      question: 'What is the Gini impurity of a node holding 4 rows that all have the same label?',
      options: [
        { text: '1.000, because the node is completely certain', explanation: 'Gini runs the other way: 0 means certain and 0.5 is the worst a two-label node can score. It is a measure of mess, not of confidence.' },
        {
          text: '0.000, because two rows picked at random can never disagree',
          explanation: 'Correct. p for the single label is 1, so Gini = 1 - 1 x 1 = 0. Such a node is pure and becomes a leaf.',
        },
        { text: '0.250, because there are 4 rows', explanation: 'The row count never appears in the impurity of a node - only the label fractions do. Row counts appear later, when weighting children.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is decision-tree training called greedy, and what does it cost you?',
      options: [
        { text: 'It uses a lot of memory; the cost is RAM', explanation: 'Greedy describes how the search chooses, not what it consumes. Trees are quite memory-light.' },
        { text: 'It builds every possible tree and keeps the best one; the cost is training time', explanation: 'The opposite. Building every possible tree is far too expensive, which is exactly why the search is greedy instead.' },
        {
          text: 'It takes the best question at each node with no look-ahead; the cost is that the finished tree is the best step-by-step, not the best overall',
          explanation: 'Correct. Two questions that are excellent together can lose to one that merely scores better on its own, and the search never sees the pair.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Your tree with no depth limit scores 1.000 accuracy on the training rows. What does that tell you?',
      options: [
        {
          text: 'Almost nothing - an unlimited tree reaches 1.000 by default, by splitting until each leaf holds one row',
          explanation: 'Correct. Perfect training accuracy is the normal endpoint of unrestricted splitting, not evidence of quality. Ask for the held-out score.',
        },
        { text: 'The tree has found the real pattern in the data', explanation: 'It has found something that separates the training rows, most likely by memorising them one at a time.' },
        { text: 'The two classes must be cleanly separable', explanation: 'Not implied. A tree can carve any dataset into enough small boxes to get every training row right.' },
      ],
      correct: 0,
    },
    {
      question: 'Every petal width in the dataset is multiplied by 100. What happens to the tree?',
      options: [
        { text: 'Width becomes more important, because its numbers are now larger', explanation: 'Impurity depends only on how rows are grouped, never on the size of the numbers. Nothing about the grouping changed.' },
        {
          text: 'Nothing changes - a threshold of 0.8 simply becomes a threshold of 80 and every row falls on the same side',
          explanation: 'Correct. Splits are comparisons, so any rescaling that preserves order carries the thresholds along with it. This is why trees need no feature scaling.',
        },
        { text: 'The tree gets deeper, because there are now more possible thresholds', explanation: 'The number of distinct values is unchanged - each one was just multiplied by 100 - so the same candidate splits exist.' },
      ],
      correct: 1,
    },
    {
      question: 'A tree predicting house prices was trained on houses of 50 to 300 square metres. You ask it about a 900 square metre house. What comes back?',
      options: [
        { text: 'An error, because the value is outside the training range', explanation: 'No error. The row simply answers "no" at every size question and lands in the outermost leaf.' },
        { text: 'A price extended along the upward trend the model learned', explanation: 'A tree stores no trend. There is no slope anywhere in it - only one constant per leaf.' },
        {
          text: 'The average price of the training houses in the outermost leaf - the same number for every house larger than that',
          explanation: 'Correct. A leaf holds one constant, so predictions go permanently flat beyond the range the tree was trained on.',
        },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Walk me through exactly how a decision tree chooses its first split.',
      answer:
        'Compute the impurity of the root - Gini is 1 minus the sum of the squared label fractions, entropy is minus the sum of p times log2 p. Then for every feature, sort its values and try every midpoint between consecutive distinct values as a threshold. Each threshold splits the rows in two; compute each child\'s impurity, weight each by its share of the rows, and add. Subtract that from the parent impurity to get the gain. Keep the feature and threshold with the largest gain, then recurse into each child. Worked example: ten flowers, 5 A and 5 B, root Gini 0.500. Splitting on width at 0.8 gives a pure 4-row child and a 6-row child at 0.278, so the impurity after is 0.6 x 0.278 = 0.167 and the gain is 0.333. Splitting on length at 2.5 gives two 4-and-1 children at 0.320 each, a gain of only 0.180. Width wins.',
      isCaseBased: false,
    },
    {
      question: 'Gini or entropy - which do you use, and why?',
      answer:
        'Either. Gini is 1 minus the sum of squared label fractions - the chance that two rows drawn at random from the node have different labels. Entropy is minus the sum of p log2 p - the average number of yes/no questions needed to pin down a row\'s label. Both are 0 for a pure node and both are at their maximum for a 50/50 node, where Gini reads 0.5 and entropy reads 1 bit. In practice they rank candidate splits the same way almost every time; on the ten-flower example both preferred width over length. Gini avoids a logarithm, so it is a little cheaper and is the common default. The choice is worth far less than the depth and leaf-size limits, so that is where I spend the tuning effort.',
      isCaseBased: false,
    },
    {
      question: 'Why does an unlimited decision tree always overfit, and how do you stop it?',
      answer:
        'Because the only thing that halts splitting is leaf purity. If a node still holds two rows with different labels, some threshold separates them and the exhaustive search will find it, so growth continues until each leaf is pure - in the worst case one leaf per training row. Training error is then zero, and none of it transfers. Controls: max_depth caps how many questions any path may ask; min_samples_leaf forbids leaves smaller than N rows, which directly kills one-row leaves; min_samples_split refuses to split small nodes at all; and post-pruning grows the full tree then cuts back the subtrees that only helped the training rows. All of them are set by measuring on held-out data, never by feel. The tell that you need them is a large gap between training and held-out scores.',
      isCaseBased: false,
    },
    {
      question: 'Explain pruning, and how it differs from just setting max_depth.',
      answer:
        'max_depth is pre-pruning: a single global cap applied while growing, so growth stops everywhere at the same level whether or not the data supported more. Pruning proper is post-pruning: grow the tree fully, then repeatedly remove the subtree whose removal costs the least, producing a sequence of progressively smaller trees, and pick among them using held-out rows. The formal version scores a tree as training error plus alpha times the number of leaves, so alpha is a price charged per leaf, and sweeping alpha generates that sequence. The advantage of pruning is that it sees the finished tree before deciding, so it can stay deep where the data supports it and shallow where it does not - and it can keep a weak split that enabled a strong one below, which an early stop would have thrown away. The cost is building the full tree first.',
      isCaseBased: false,
    },
    {
      question: 'Case: a credit team ships a tree of depth 20. Held-out accuracy 0.91. Three months later they retrain on refreshed data, get a structurally completely different tree with similar accuracy, and compliance is alarmed. Diagnose and fix.',
      answer:
        'Two separate problems. First, instability. A depth-20 tree makes thousands of choices, many between candidates whose gains differ in the third decimal, so a modest data refresh flips some of them - and flipping a question near the top rebuilds everything below it. That is expected behaviour for a single tree, not a bug, but it destroys the stable rule set compliance was promised. Second, a depth-20 tree was never interpretable to begin with: a path with twenty conditions is not an explanation anyone can act on. The fix: constrain hard - depth 3 to 5, min_samples_leaf in the hundreds - and check stability explicitly by refitting on many resamples of the data and measuring how often the top questions agree. Accept the accuracy cost in exchange for a rule set that is short, stable and printable. If that cost is unacceptable to the business, use a crowd of trees for the score and agree a separate, documented explanation method with compliance rather than pretending the deep tree is self-explaining. The tradeoff to state plainly: accuracy, stability and interpretability are three different axes, and one deep tree is weak on all three.',
      isCaseBased: true,
    },
    {
      question: 'Do decision trees need feature scaling? Which methods do?',
      answer:
        'No. Every split is the comparison "is this feature at or below t", so multiplying a column by 1000, or taking its log, moves the threshold along with the data and produces a structurally identical tree. Scaling matters when a method measures distance between rows or adds up weighted features: k-nearest-neighbours and k-means use distances, so a column measured in thousands drowns one measured in units; anything trained by gradient descent takes steps proportional to the input size, so unequal scales make some directions crawl and others overshoot; and penalties applied evenly across coefficients assume the coefficients are comparable, which requires comparable inputs. One caveat for trees: they are unbothered by extreme values in the features, but a regression tree is still pulled by an extreme value in the target, because a leaf predicts an average.',
      isCaseBased: false,
    },
    {
      question: 'Case: your tree scores 0.99 on training rows and 0.62 on held-out rows, on a 5,000-row churn dataset with 200 columns. Give me a debugging order.',
      answer:
        'That gap is the signature of a tree that memorised. First, measure the tree: its depth and number of leaves. If the leaf count is anywhere near 5,000, each leaf is holding roughly one row and the model is a lookup table. Second, sweep max_depth from 2 to 12, scoring on held-out data each time, and plot both curves; the point where the held-out score stops improving is the real capacity of the data. Third, set min_samples_leaf to around 1% of the rows - with 200 columns and only 5,000 rows there is always some column that separates a handful of rows by luck, and a minimum leaf size removes that option. Fourth, try post-pruning and compare. Only then question the data: check which columns the model leans on, and confirm by shuffling each in the held-out set - an ID or a timestamp that scores highly and survives shuffling is a leakage bug, not a feature. Also confirm the split is stratified and that held-out rows are not near-duplicates of training rows. If a well-constrained single tree still lands near 0.70, that is the honest ceiling for one tree here, and averaging many trees is the next step.',
      isCaseBased: true,
    },
    {
      question: 'Case: a PM asks "we already have gradient boosting at 0.94 AUC — why would we ever ship a single tree at 0.88?"',
      answer:
        'Usually you would not, and I would say so. But there are real cases: when a human must apply the rule without a computer (triage in a clinic, a field checklist); when a regulator or an internal audit demands the literal decision path per applicant, and a post-hoc explanation is not accepted; when the model is a first baseline whose job is to reveal what the data actually contains; when latency or footprint is extreme, since a depth-4 tree is four comparisons; and when the tree is a communication artifact used to get domain experts to challenge the logic — that conversation catches leakage and bad features that no AUC number surfaces. The tradeoff to state explicitly: 6 AUC points is the price of interpretability, and whether that price is worth paying is a business decision, not an ML one. Often the right answer is to ship both — the ensemble for scoring, the shallow tree as the explanation people can read.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    {
      front: 'Decision tree, in one line',
      back: 'A learned flowchart. Each internal node asks "is this feature at or below t?", each leaf stores an answer. Predicting = walking one path from root to leaf.',
    },
    {
      front: 'Node, root, leaf, split, depth',
      back: 'Node = a box holding a group of rows. Root = the top node holding every row. Split = one yes/no question sending rows into two children. Leaf = a node with no question, holding the majority label of its rows. Depth = how many questions a path asks.',
    },
    {
      front: 'Gini impurity',
      back: '1 minus the sum of the squared label fractions. It is the chance two rows drawn at random from the node have different labels. 0 = pure; 0.5 = worst possible for two labels. 5 A and 5 B gives 1 - 0.25 - 0.25 = 0.500.',
    },
    {
      front: 'Entropy',
      back: 'Minus the sum of p times log2 p - the average number of yes/no questions needed to learn a row\'s label. 0 = pure; 1 bit = a 50/50 node. Ranks splits almost identically to Gini, but needs a logarithm so it costs a little more.',
    },
    {
      front: 'Information gain',
      back: 'Parent impurity minus the row-weighted impurity of the children: I(parent) - sum over children of (n_child / n) x I(child). Weight by row count, never a plain average. The split with the largest gain is kept.',
    },
    {
      front: 'Greedy',
      back: 'The best question at each node, with no look-ahead and no going back. Consequence: the tree is the best step by step, not the best overall - two questions that are great together can lose to one that scores better alone.',
    },
    {
      front: 'Why a full tree always overfits',
      back: 'Splitting only stops at purity, so with distinct rows it continues to one leaf per training row. Training accuracy 1.000 is the default outcome, not an achievement. Always ask for the held-out score.',
    },
    {
      front: 'The brakes',
      back: 'Pre-pruning stops growth early: max_depth caps path length, min_samples_leaf forbids tiny leaves, min_samples_split refuses to split small nodes. Post-pruning grows fully then cuts back subtrees that only helped training rows. Choose all of them on held-out data.',
    },
  ],
  mindmapMarkdown: `- Decision Trees: Splits, Impurity and Pruning
  - The idea
    - A flowchart of yes/no questions learned from data
    - Node = group of rows; root = all rows; leaf = an answer
    - Split = one feature vs one threshold; depth = questions per path
  - Choosing a split
    - Try every feature x every threshold
    - Score by drop in impurity (information gain)
    - Keep the biggest gain, recurse into each child
    - Stop when the node is pure or a rule says stop
  - Impurity
    - Gini = 1 - sum of squared label fractions
    - Entropy = -sum p log2 p, measured in bits
    - Gain = parent - row-weighted children
    - Weight children by row share, never a plain average
  - Ten flowers worked example
    - Root 5 A / 5 B, Gini 0.500
    - length <= 2.5 gives gain 0.180
    - width <= 0.8 gives gain 0.333, so width wins
  - Greedy
    - Best question now, no look-ahead, never revisited
    - Best step by step, not the best tree overall
  - Overfitting
    - No limit means splitting until every leaf is pure
    - One leaf per row, training accuracy 1.000 by default
  - The brakes
    - Pre: max_depth, min_samples_leaf, min_samples_split
    - Post: grow fully then prune back on held-out data
  - Regression trees
    - Impurity = spread around the node mean
    - Leaf predicts the average, so the surface is flat steps
    - Cannot predict outside the training range
  - Practical notes
    - No feature scaling needed - splits are comparisons
    - Feature importance is biased toward many-valued columns
    - Boundaries are axis-aligned boxes, so diagonals become staircases`,
}

export default m
