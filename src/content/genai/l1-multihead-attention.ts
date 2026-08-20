import type { Module } from '../types'

const m: Module = {
  id: 'genai-l1-multihead-attention',
  subjectId: 'genai',
  level: 1,
  title: 'Multi-Head Attention & Causal Masking',
  whyItMatters:
    'The previous module built one attention pattern. One pattern has to answer every question a word might have about the sentence at the same time, and it cannot. This module shows how to run several attention patterns side by side without paying more compute, and then how to stop a language model from cheating by reading the words it is supposed to be predicting. Both ideas are worked here with numbers small enough to check on paper.',
  assumes: [
    'You have read *Self-Attention from zero*. You know what Query, Key and Value vectors are, how a score matrix is built, and what a row-softmax does.',
    'You know that softmax turns a row of numbers into positive numbers that add up to 1',
    'You have seen a Python list, a for loop, a function, and list slicing like x[2:5]',
    'You know that e (about 2.718) raised to a power is what math.exp does',
  ],
  estMinutes: 50,
  sections: [
    {
      type: 'intuition',
      title: 'One attention pattern has to answer every question at once',
      md: `Take the sentence *"the cat that the dog chased was tired"* and stand on the word **was**.

To use that word properly, three completely different questions have to be answered about it:

- **Which noun is this verb about?** Answer: *cat*. Not *dog*, even though *dog* is much closer.
- **What word came immediately before me?** Answer: *chased*. Nearby-word context is genuinely useful on its own.
- **Which word am I predicting next?** Answer: something like *tired*, and the word right after me matters most for that.

Now recall what one attention pattern actually is. For the word *was*, attention produced **one row of weights** over all eight words, and that row adds up to 1. It is a single budget of 1.0 being shared out.

So if you put 0.7 of the budget on *cat* to answer the first question, only 0.3 is left for *chased* and everything else. The three questions are fighting over the same 1.0. One pattern must compromise: it ends up spreading weight thinly over *cat*, *chased* and *tired*, and answers none of the three questions cleanly.

The fix is not a cleverer pattern. It is **more than one pattern**. Give question 1 its own budget of 1.0, question 2 its own budget of 1.0, question 3 its own budget of 1.0. Now nothing competes.

That is multi-head attention in one sentence: run the attention machinery several times over, side by side, so each copy can specialise.`,
    },
    {
      type: 'intuition',
      title: 'The five words you need, defined',
      md: `Every one of these gets shown with real numbers in the next few sections. Read them once, loosely, then let the code make them concrete.

- **Head** — one complete copy of the attention machinery from the previous module: its own Query, Key and Value vectors, its own score matrix, its own row-softmax, its own weighted mixing. Two heads means two of these running at the same time on the same sentence, not talking to each other.
- **Head dimension** — how many numbers each head works with. Written *d_head*. If the model represents a word with 8 numbers and there are 2 heads, each head gets 4 numbers. So d_head = 4.
- **Splitting the embedding across heads** — the important design choice. An **embedding** is the list of numbers representing one word (8 numbers in our example). We do NOT give all 8 numbers to both heads. We **cut** the 8 numbers into 2 pieces of 4 and hand one piece to each head. Cut, not copy.
- **Concatenation** — after each head produces its own answer of 4 numbers, we lay the two answers end to end to get 8 numbers back. Concatenation is just "put these lists next to each other". No adding, no averaging.
- **Output projection** — the concatenated 8 numbers are two separate 4-number opinions stapled together; head 0 has never seen head 1. The output projection is one more matrix multiply, 8 numbers in and 8 numbers out, whose whole job is to let every output number read from both heads. It is usually written W_O.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 1: cut an 8-number embedding into 2 heads of 4',
      code: `x = [0.5, -1.2, 0.3, 0.8, 2.0, -0.4, 1.1, 0.0]
d_model = 8
h = 2
d_head = d_model // h
heads = []
for i in range(h):
    start = i * d_head
    heads.append(x[start:start + d_head])

print("d_head =", d_head)
print("head 0 sees:", heads[0])
print("head 1 sees:", heads[1])
print("numbers used in total:", len(heads[0]) + len(heads[1]))

# ---- real output ----
# d_head = 4
# head 0 sees: [0.5, -1.2, 0.3, 0.8]
# head 1 sees: [2.0, -0.4, 1.1, 0.0]
# numbers used in total: 8`,
      annotations: {
        1: 'One word, represented by 8 numbers. This is the embedding. The values are made up; nothing here depends on what they are.',
        2: 'd_model is the standard name for how wide one word representation is. 8 here. Real GPT-2 uses 768.',
        3: 'h is the standard name for the number of heads. We use 2 so every number stays printable.',
        4: 'The double slash // is integer division: 8 // 2 = 4, an int not a float. This one line is the whole idea — the width is divided among the heads, not duplicated.',
        5: 'An empty list that will hold one slice per head.',
        6: 'range(2) gives 0 then 1, so the loop body runs once per head. i is the head number.',
        7: 'Where this head\'s slice starts inside x. Head 0 starts at 0, head 1 starts at 4.',
        8: 'x[start:start + d_head] is a slice: it takes 4 items beginning at start. append puts that 4-number list into heads. After the loop, heads has 2 lists of 4.',
        10: 'Prints 4. Each head works with 4 numbers, not 8.',
        11: 'Head 0 got the first half of x.',
        12: 'Head 1 got the second half. The two halves do not overlap at all.',
        13: 'Counts the numbers the two heads hold between them: 4 + 4 = 8, exactly what we started with. Nothing was copied and nothing was thrown away.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 2: the same cut, applied to a whole 3-word sentence',
      code: `tokens = [[1.0, 0.0, 0.0, 1.0, 2.0, 0.0, 0.0, 0.0],
          [0.0, 1.0, 0.0, 0.0, 0.0, 2.0, 0.0, 0.0],
          [0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 2.0, 0.0]]
d_head = 4

def head_view(rows, which):
    out = []
    for row in rows:
        out.append(row[which * d_head:(which + 1) * d_head])
    return out

head0 = head_view(tokens, 0)
head1 = head_view(tokens, 1)
print("head 0 input:", head0)
print("head 1 input:", head1)

# ---- real output ----
# head 0 input: [[1.0, 0.0, 0.0, 1.0], [0.0, 1.0, 0.0, 0.0], [0.0, 0.0, 1.0, 0.0]]
# head 1 input: [[2.0, 0.0, 0.0, 0.0], [0.0, 2.0, 0.0, 0.0], [0.0, 0.0, 2.0, 0.0]]`,
      annotations: {
        1: 'Three words, each one an 8-number embedding. Think of them as "the", "cat", "sat". This is a list of 3 lists.',
        2: 'Word 2 of 3. The numbers are chosen to be easy to follow, not meaningful.',
        3: 'Word 3 of 3. The closing ]] ends both the inner list and the outer list.',
        4: 'Still 4 numbers per head, because d_model is 8 and there are 2 heads.',
        6: 'A function so we do not write the same slice twice. rows is the whole sentence; which is the head number, 0 or 1.',
        7: 'The list we will fill, one slice per word.',
        8: 'Loop over the words. row is one word\'s 8 numbers.',
        9: 'The same slice as step 1, written with the head number: head 0 takes positions 0 to 3, head 1 takes positions 4 to 7.',
        10: 'Hand the finished list of slices back to the caller.',
        12: 'Head 0 now holds a 3-word sentence, 4 numbers per word.',
        13: 'Head 1 holds its own 3-word sentence, also 4 numbers per word, using the other half of every embedding.',
        14: 'Printing head 0 shows the left half of each of the three words.',
        15: 'Printing head 1 shows the right half. From here the two heads run completely separately — separate scores, separate softmax, separate output.',
      },
    },
    {
      type: 'intuition',
      title: 'Why two heads cost about the same as one big head',
      md: `This is the part most people get wrong on the first pass. They assume 12 heads means 12 times the work. It does not.

Count the score computations by hand, for a 3-word sentence.

- **One head of full width 8.** The score matrix is 3 by 3, so 9 scores. Each score is a dot product of two 8-number vectors, which is 8 multiplications. Total: 9 × 8 = **72 multiplications**.
- **Two heads of width 4.** Each head still builds a 3 by 3 score matrix, so 9 scores per head. But each score is now a dot product of two 4-number vectors: 4 multiplications. So one head costs 9 × 4 = 36, and two heads cost 2 × 36 = **72 multiplications**.

Identical. The head count multiplied the work by 2 and the head width divided it by 2, and the two cancel exactly. Write it with symbols and the cancellation is visible: h heads × (T² scores × d_model/h numbers each) = T² × d_model, and the h disappears.

The stored numbers behave the same way. There is no separate small matrix per head — you build one full-width matrix and slice its output, exactly as the code above sliced x. So the parameter count does not depend on h either.

The real limit is that heads can be made too narrow. GPT-2 uses d_model = 768 with 12 heads, giving d_head = 64. GPT-3 uses 12288 with 96 heads, giving d_head = 128. The head width barely changes as models grow; the head *count* grows. Below about 32 numbers a head is too cramped to represent anything useful.`,
    },
    {
      type: 'intuition',
      title: 'Causal masking: a word must not see the future',
      md: `Now the second idea, and it is unrelated to heads. It applies to every head equally.

A GPT is trained on exactly one task: **given the words so far, predict the next word.** Show it "the cat" and it must answer "sat".

Here is the problem. Training does not feed the sentence one word at a time. The whole sentence sits in memory at once, because that is what makes it fast. So when word 2 builds its attention row, word 3 is right there in the score matrix, available to attend to.

Word 3 is the answer word 2 is being graded on.

If word 2 is allowed to look at word 3, it does not learn to predict. It learns to copy. And copying is useless at the moment you actually want to use the model, because when you ask a trained GPT to write, the next word genuinely does not exist yet — you are asking it to invent that word.

**Causal masking** is the rule that stops this. In plain words: *word i may attend to word i and to every word before it, and to nothing after it.*

Look at the 3 by 3 score matrix and mark which cells survive. Rows are the word doing the looking, columns are the word being looked at.

- Row 1 may use column 1 only. It is the first word; there is nothing before it.
- Row 2 may use columns 1 and 2.
- Row 3 may use columns 1, 2 and 3 — the whole row.

The allowed cells form a triangle: everything on the diagonal and below it. The forbidden cells are the ones strictly above the diagonal, which is where column number is greater than row number. Every implementation of this in every framework is some spelling of "kill the strict upper triangle".`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 3: apply the mask to a score matrix by hand',
      code: `scores = [[2.0, 1.0, 0.0],
          [0.0, 2.0, 1.0],
          [1.0, 0.0, 2.0]]
NEG = float('-inf')

masked = []
for i in range(3):
    row = []
    for j in range(3):
        if j > i:
            row.append(NEG)
        else:
            row.append(scores[i][j])
    masked.append(row)

for row in masked:
    print(row)

# ---- real output ----
# [2.0, -inf, -inf]
# [0.0, 2.0, -inf]
# [1.0, 0.0, 2.0]`,
      annotations: {
        1: 'Row 1 of the score matrix: word 1 scored 2.0 against word 1, 1.0 against word 2, 0.0 against word 3. These come out of the Query-times-Key step from the previous module; we write them down directly so the masking is the only thing happening here.',
        2: 'Row 2: word 2 scores itself highest at 2.0.',
        3: 'Row 3: word 3 scores itself highest at 2.0.',
        4: 'float(\'-inf\') is Python\'s negative infinity. It is a real float value you can put in a list and do arithmetic with. NEG is just a short name for it.',
        6: 'The masked copy we are about to build, row by row.',
        7: 'i is the row number, meaning the word that is doing the looking. 0, 1, then 2.',
        8: 'A fresh empty row for this word.',
        9: 'j is the column number, meaning the word being looked at.',
        10: 'The entire rule. j > i means "the word being looked at comes after the word looking" — the future. Note it is strictly greater, so j == i (a word looking at itself) is allowed.',
        11: 'Forbidden cell: throw the score away and write negative infinity instead. We do not write 0 here, and the next section is entirely about why.',
        12: 'Otherwise — meaning j is less than or equal to i, the past or the word itself.',
        13: 'Allowed cell: keep the original score exactly as it was.',
        14: 'Finished row goes into masked.',
        16: 'Walk the three finished rows.',
        17: 'Print one row. The output shows the triangle: row 1 has two -inf, row 2 has one, row 3 has none.',
      },
    },
    {
      type: 'intuition',
      title: 'What softmax does to negative infinity',
      md: `Negative infinity looks like a violent thing to write into a matrix. It is chosen precisely because of what happens next.

Softmax takes a row, raises e to the power of every entry, then divides each result by the total. So do row 3 of the masked matrix by hand — that row was never masked, so it exercises the arithmetic cleanly. It is [1.0, 0.0, 2.0].

- e to the power 1.0 = 2.718
- e to the power 0.0 = 1.000
- e to the power 2.0 = 7.389
- Total = 2.718 + 1.000 + 7.389 = 11.107
- Divide each by the total: 2.718/11.107 = **0.245**, 1.000/11.107 = **0.090**, 7.389/11.107 = **0.665**
- Those add to 1.000, as a set of attention weights must.

Now row 2, which was masked. It is [0.0, 2.0, −∞].

- e to the power 0.0 = 1.000
- e to the power 2.0 = 7.389
- **e to the power −∞ = 0.000.** This is the whole trick. Raising e to a very negative power gives a very small number, and in the limit it is exactly zero.
- Total = 1.000 + 7.389 + 0.000 = 8.389. The masked entry contributed **nothing to the total**.
- Weights: 1.000/8.389 = **0.119**, 7.389/8.389 = **0.881**, 0.000/8.389 = **0.000**
- 0.119 + 0.881 = 1.000. Still a clean set of weights, now spread over only the two allowed words.

That last line is the point. The masked column is not merely zeroed — it is removed from the division as well, so the two surviving words share the full budget of 1.0 between them.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 4: softmax the masked rows and check they still add to 1',
      code: `import math

def softmax(row):
    exps = []
    for v in row:
        exps.append(math.exp(v))
    total = sum(exps)
    out = []
    for e in exps:
        out.append(round(e / total, 3))
    return out

NEG = float('-inf')
print("exp(-inf) =", math.exp(NEG))
print("row 0:", softmax([2.0, NEG, NEG]))
print("row 1:", softmax([0.0, 2.0, NEG]))
print("row 2:", softmax([1.0, 0.0, 2.0]))

# ---- real output ----
# exp(-inf) = 0.0
# row 0: [1.0, 0.0, 0.0]
# row 1: [0.119, 0.881, 0.0]
# row 2: [0.245, 0.09, 0.665]`,
      annotations: {
        1: 'math is Python\'s built-in maths module. We need math.exp, which raises e (about 2.718) to a power.',
        3: 'One function that turns a row of scores into a row of weights. row is a plain list of floats.',
        4: 'Will hold e raised to each score.',
        5: 'Walk the scores one at a time. v is one score.',
        6: 'math.exp(v) is e to the power v. exp(2.0) is 7.389, exp(0.0) is 1.0, exp(-inf) is 0.0.',
        7: 'sum() adds up a list. This is the divisor — and the masked entries added 0.0 to it, so they are genuinely absent from it.',
        8: 'Will hold the finished weights.',
        9: 'Walk the exponentials. e is one of them.',
        10: 'Divide by the total to get a weight, and round to 3 decimals so the printout is readable. Rounding is only for display.',
        11: 'Hand back the row of weights.',
        13: 'Negative infinity again, same as the previous snippet.',
        14: 'Prints 0.0. This is the fact the whole mask rests on, printed rather than asserted.',
        15: 'Row 1 of the masked matrix. Only the first word is allowed, so it takes the entire budget: weight 1.0. The first word of any sentence always has an attention row of exactly [1, 0, 0, ...].',
        16: 'Row 2. Two allowed words share the budget: 0.119 and 0.881, adding to exactly 1.0. Third entry is exactly 0.0, not a small number.',
        17: 'Row 3. Nothing was masked, so all three words share the budget: 0.245 + 0.090 + 0.665 = 1.0. These match the hand arithmetic above.',
      },
    },
    {
      type: 'intuition',
      title: 'Why the mask goes before softmax, not after',
      md: `The obvious alternative is to run softmax normally and then set the future weights to zero afterwards. It looks equivalent. It is not, and the difference is a bug that never crashes.

Take row 2 again, but skip the mask: [0.0, 2.0, 1.0]. Softmax gives [0.090, 0.665, 0.245], adding to 1.000. Now zero the third entry to hide the future: [0.090, 0.665, 0.000].

Those add up to **0.755**, not 1.

Word 2\'s output is supposed to be a weighted average of the words it is allowed to see. With weights summing to 0.755, its output is silently shrunk to about three quarters of the size it should be. And every row shrinks by a *different* amount, because every row masks a different number of columns — row 1 shrinks most, the last row not at all.

Nothing errors. No warning appears. The model trains, converges to a worse place than it should, and you spend two days blaming the learning rate.

One practical note. In real code people write a large negative number such as −1e9 instead of literal −∞. With 16-bit floats, arithmetic on true infinity can produce NaN ("not a number"), which poisons everything downstream. And e to the power −1e9 is already exactly 0.0 in floating point, so the effect is identical and the numerics are safer.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 5: the broken version, in three lines',
      code: `weights = [0.09, 0.665, 0.245]
weights[2] = 0.0
print(weights, "sum =", round(sum(weights), 3))

# ---- real output ----
# [0.09, 0.665, 0.0] sum = 0.755`,
      annotations: {
        1: 'The softmax of the UNMASKED row [0.0, 2.0, 1.0], taken from the previous snippet. These three add to 1.0.',
        2: 'Zeroing the future weight after the fact — position 2 is the third entry, the future word. This is the wrong fix.',
        3: 'sum() adds the row up: 0.755. The weights no longer form a proper average, and the correct answer for this row was [0.119, 0.881, 0.0]. Compare them: masking first also made 0.881 bigger than 0.665, because the survivors re-share the freed budget.',
      },
    },
    {
      type: 'hinglish',
      md: `Training ke waqt poora sentence ek saath model ke saamne hota hai. Lekin niyam ek hi hai: **har word sirf apne se pehle waalon ko dekh sakta hai.**

Kyun? Kyunki hum use agla word guess karna sikha rahe hain. Agar usne agla word pehle hi dekh liya to wo seekh nahi raha, wo **answer sheet saamne rakh ke exam de raha hai.** Training loss lagbhag zero, aur asli use mein bilkul bekaar, kyunki likhte waqt agla word hota hi nahi.

Isliye score matrix ke upper triangle pe −∞ likh dete hain, softmax se **pehle**. exp(−∞) = 0, aur wo zero total mein bhi nahi jodta, isliye bache hue words ka weight milke thik 1 ban jaata hai.`,
    },
    {
      type: 'intuition',
      title: 'The mask is what makes training parallel',
      md: `The mask reads like a restriction, so it is a surprise that it is the reason transformers train quickly at all.

Push our 3-word sentence through the masked attention once. Look at what each output row was built from:

- Output row 1 saw word 1 only. So it is a legitimate prediction of word 2.
- Output row 2 saw words 1 and 2. So it is a legitimate prediction of word 3.
- Output row 3 saw words 1, 2 and 3. So it is a legitimate prediction of word 4.

Three predictions, from **one** pass through the network. For a 1000-word sequence you get 1000 next-word predictions from one pass, and the training loss is simply the average over all of them.

None of that would be allowed without the mask. If row 2 could see word 3, its "prediction" of word 3 would be a copy, and that training example would be worthless. The mask is what makes all those simultaneous predictions honest.

Compare an older recurrent network. It reads word 1, then word 2, then word 3, and word 2 cannot start until word 1 is finished. To get 1000 training signals it must take 1000 steps in order. More GPUs do not help — the waiting is built into the algorithm. The transformer replaces that with a few large matrix multiplications that a GPU does all at once.

One honest limit: this gift applies to **training only**. When you actually generate text, you still produce one word at a time, because word 501 does not exist until the model has picked it.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 6: each head mixes its own Values with its own weights',
      code: `head0 = [[1.0, 0.0, 0.0, 1.0], [0.0, 1.0, 0.0, 0.0], [0.0, 0.0, 1.0, 0.0]]
head1 = [[2.0, 0.0, 0.0, 0.0], [0.0, 2.0, 0.0, 0.0], [0.0, 0.0, 2.0, 0.0]]
W = [[1.0, 0.0, 0.0], [0.119, 0.881, 0.0], [0.245, 0.09, 0.665]]

def mix(values):
    out = []
    for row in W:
        ctx = [0.0, 0.0, 0.0, 0.0]
        for j in range(3):
            for k in range(4):
                ctx[k] = ctx[k] + row[j] * values[j][k]
        out.append(ctx)
    return out

print("head 0 output:", mix(head0))
print("head 1 output:", mix(head1))

# ---- real output ----
# head 0 output: [[1.0, 0.0, 0.0, 1.0], [0.119, 0.881, 0.0, 0.119],
#                 [0.245, 0.09, 0.665, 0.245]]
# head 1 output: [[2.0, 0.0, 0.0, 0.0], [0.238, 1.762, 0.0, 0.0],
#                 [0.49, 0.18, 1.33, 0.0]]`,
      annotations: {
        1: 'Head 0\'s slice of the three words, straight from step 2. These play the role of the Value vectors — the content that gets mixed.',
        2: 'Head 1\'s slice of the same three words. Different numbers, same three words.',
        3: 'The masked attention weights from step 4. To keep the arithmetic checkable we give both heads the same weights; in a trained model each head computes its own and they differ a lot.',
        5: 'One function, called once per head. values is that head\'s 4-number-per-word list.',
        6: 'Will hold one output vector per word.',
        7: 'Walk the weight rows. Row 1 is word 1\'s weights, and so on.',
        8: 'ctx is the output vector being built for this word: 4 zeros to start, because d_head is 4.',
        9: 'j walks the three words being attended to.',
        10: 'k walks the 4 positions inside a word vector.',
        11: 'The weighted sum: add word j\'s k-th number, scaled by how much attention this word pays to word j. Doing it with two plain loops instead of a matrix call is slower and much easier to trace.',
        12: 'Store the finished output vector for this word.',
        13: 'Hand back all three.',
        15: 'Head 0\'s answer. Word 1\'s output is exactly word 1\'s own vector, because its weights were [1, 0, 0] — the first word can only look at itself.',
        16: 'Head 1\'s answer. Same words, same weights, completely different numbers, because head 1 was handed the other half of every embedding. Each head is 4 numbers wide, exactly as promised.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 7: concatenate the heads back to 8 numbers',
      code: `ctx0 = [[1.0, 0.0, 0.0, 1.0], [0.119, 0.881, 0.0, 0.119], [0.245, 0.09, 0.665, 0.245]]
ctx1 = [[2.0, 0.0, 0.0, 0.0], [0.238, 1.762, 0.0, 0.0], [0.49, 0.18, 1.33, 0.0]]
merged = []
for i in range(3):
    merged.append(ctx0[i] + ctx1[i])

print("width of one merged token:", len(merged[1]))
print("merged token 1:", merged[1])

# ---- real output ----
# width of one merged token: 8
# merged token 1: [0.119, 0.881, 0.0, 0.119, 0.238, 1.762, 0.0, 0.0]`,
      annotations: {
        1: 'Head 0\'s output from step 6: three words, 4 numbers each.',
        2: 'Head 1\'s output from step 6: the same three words, its own 4 numbers each.',
        3: 'Will hold the joined-up result.',
        4: 'One pass per word. i is the word number.',
        5: 'The + between two Python lists is concatenation, not addition: [1, 2] + [3, 4] gives [1, 2, 3, 4], a 4-item list. That is exactly what "concatenate the heads" means — head 0\'s four numbers, then head 1\'s four numbers, laid end to end. Nothing is summed or averaged.',
        7: 'Prints 8. We started at 8 numbers per word, split into 4 and 4, and are back at 8. The width the rest of the network sees never changed.',
        8: 'Word 2\'s merged vector. Read it as two halves: the first four came from head 0, the last four from head 1. At this moment the two halves have never influenced each other.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 8: the output projection, which is the only place heads mix',
      code: `merged1 = [0.119, 0.881, 0.0, 0.119, 0.238, 1.762, 0.0, 0.0]

W_O = []
for a in range(8):
    row = []
    for b in range(8):
        row.append(0.1 * ((a + b) % 3))
    W_O.append(row)

out = []
for b in range(8):
    s = 0.0
    for a in range(8):
        s = s + merged1[a] * W_O[a][b]
    out.append(round(s, 3))

print("in  (8 numbers):", merged1)
print("out (8 numbers):", out)

# ---- real output ----
# in  (8 numbers): [0.119, 0.881, 0.0, 0.119, 0.238, 1.762, 0.0, 0.0]
# out (8 numbers): [0.464, 0.248, 0.224, 0.464, 0.248, 0.224, 0.464, 0.248]`,
      annotations: {
        1: 'One merged word from step 7. First four numbers are head 0, last four are head 1.',
        3: 'W_O is the output projection matrix: 8 rows by 8 columns. In a real model these 64 numbers are learned during training.',
        4: 'a walks the 8 rows.',
        5: 'One row being built.',
        6: 'b walks the 8 columns.',
        7: 'A made-up value so the snippet stays short. % is the remainder operator, so (a + b) % 3 cycles 0, 1, 2, giving entries 0.0, 0.1, 0.2. Any 8-by-8 numbers would do; the shape is what matters.',
        8: 'Store the finished row.',
        10: 'The result: 8 output numbers.',
        11: 'b is the output position we are computing.',
        12: 'A running total for this output position.',
        13: 'a walks every input position — all 8 of them, which means positions 0 to 3 from head 0 AND positions 4 to 7 from head 1.',
        14: 'The dot product. This single line is why the projection matters: output number b is a mixture of all 8 inputs, so it draws on both heads at once. Before this line, head 0 and head 1 had never met.',
        15: 'Store the output number, rounded for display.',
        17: 'The input: two independent 4-number opinions stapled together.',
        18: 'The output: still 8 numbers, but every one of them now depends on both heads. Same width in, same width out, which is what lets you stack this layer 12 or 96 times.',
      },
    },
    { type: 'visual', component: 'AttentionHeatmap', props: {} },
    {
      type: 'note',
      md: 'Use this heatmap deliberately, not decoratively. Each row is one word doing the looking; each column is a word being looked at; darker means more attention weight. Do three things. (1) With the causal mask OFF, pick any row and check that the cells across it look like they add to 1 — that is the budget of 1.0 from the first section. (2) Turn the causal mask ON and watch the whole upper-right triangle drop to zero: no word can reach any word to its right. (3) Now look at the cells that survived in a masked row. They got DARKER, and nothing was added to them — the masked cells simply stopped taking a share of the softmax total, so the survivors re-share the full 1.0. That is the [0.665 → 0.881] jump we computed by hand. Also notice row 1 becomes a single cell of weight 1.0. Finally, remember this grid is ONE head; a real layer runs 12 to 96 of these on the same sentence at the same time, each with its own triangle.',
    },
    {
      type: 'intuition',
      title: 'Worked case: the whole journey, three words, start to finish',
      md: `Nothing new here. This is every number from the eight snippets, in order, so you can see the shape of one word travel through the layer.

- **In.** Word 2 arrives as 8 numbers: [0.0, 1.0, 0.0, 0.0, 0.0, 2.0, 0.0, 0.0].
- **Split.** Head 0 takes the first four, [0.0, 1.0, 0.0, 0.0]. Head 1 takes the last four, [0.0, 2.0, 0.0, 0.0]. Cut, not copied.
- **Score and mask.** Inside each head, word 2\'s score row is [0.0, 2.0, −∞] — the third entry is the future, so it was set to −∞ before softmax.
- **Softmax.** [0.119, 0.881, 0.0], adding to exactly 1.0. Word 2 puts 88% of its attention on itself and 12% on word 1, and 0% on word 3 because it is not allowed to look there.
- **Mix.** Head 0 outputs 4 numbers: [0.119, 0.881, 0.0, 0.119]. Head 1 outputs its own 4: [0.238, 1.762, 0.0, 0.0]. Neither knows the other exists.
- **Concatenate.** Lay them end to end: [0.119, 0.881, 0.0, 0.119, 0.238, 1.762, 0.0, 0.0]. Back to 8 numbers.
- **Project.** Multiply by the 8-by-8 W_O: [0.464, 0.248, 0.224, 0.464, 0.248, 0.224, 0.464, 0.248]. Still 8 numbers, but now every one of them was built from both heads.

Eight numbers in, eight numbers out, two independent attention patterns computed in between, and no word ever read a word to its right.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: an off-by-one mask, and the loss that looks too good',
      md: `Here is the failure exactly as it arrives in real life.

Someone writes their own GPT. Training starts. The loss drops from 10.9 to 0.2 in a single epoch, faster than anything they have seen. They are delighted. Then they generate text from it and get complete gibberish.

The condition that should have raised the alarm: **a training loss that low means the model is getting the answer right almost every time.** Predicting the next word in English is hard; nobody gets near-perfect at it. A number that good means the answer was available, not that the model is brilliant.

The usual cause is one character in the mask condition. The correct rule is *mask when j > i*. Writing *j > i + 1* looks like a harmless off-by-one and leaks exactly one column: each word can now see the single word immediately after it, which is precisely the word it is being asked to predict.

The snippet below shows what that does to a single row.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The bug, shown on one row',
      code: `NEG = float('-inf')
scores = [[2.0, 1.0, 0.0], [0.0, 2.0, 1.0], [1.0, 0.0, 2.0]]

def mask(k):
    out = []
    for i in range(3):
        row = []
        for j in range(3):
            if j > i + k:
                row.append(NEG)
            else:
                row.append(scores[i][j])
        out.append(row)
    return out

print("row 1, k = 0 (correct)   :", mask(0)[1])
print("row 1, k = 1 (off by one):", mask(1)[1])

# ---- real output ----
# row 1, k = 0 (correct)   : [0.0, 2.0, -inf]
# row 1, k = 1 (off by one): [0.0, 2.0, 1.0]`,
      annotations: {
        1: 'Negative infinity, same as before.',
        2: 'The same three score rows we have used throughout.',
        4: 'One function with a knob k, so we can run the correct rule and the buggy rule side by side. k is how far into the future we accidentally allow.',
        5: 'The masked matrix being built.',
        6: 'i is the row: the word doing the looking.',
        7: 'A fresh row.',
        8: 'j is the column: the word being looked at.',
        9: 'The rule under test. With k = 0 this is the correct j > i. With k = 1 it becomes j > i + 1, which lets column i+1 through.',
        10: 'Blocked cell.',
        11: 'Otherwise the cell is allowed.',
        12: 'Allowed cell keeps its score.',
        13: 'Finished row stored.',
        14: 'Return all three rows.',
        16: 'Correct: word 2 sees words 1 and 2, and the future is -inf.',
        17: 'Buggy: the third entry is 1.0, a live score. Word 2 can now attend to word 3 — the exact word it is being trained to predict. Softmax will give that cell real weight, the model will learn to read it, and the loss will collapse. The diagnosis, in one line: near-zero training loss plus useless generation means the answer is leaking, and in a decoder that means the mask.',
      },
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work each one on paper before reading the solution below it.

**1.** A model has d_model = 512 and h = 8 heads. What is d_head, and how many numbers does head 3 receive from a word\'s embedding?

**2.** For a 4-word sentence, write out which columns each row of the causal mask is allowed to use.

**3.** A masked score row is [1.0, 1.0, −∞, −∞]. What are the attention weights?

**4.** A colleague masks after softmax. Their unmasked row softmaxed to [0.5, 0.3, 0.15, 0.05] and they need to block the last two entries. What row do they end up with, what should it have been, and by how much is the output shrunk?`,
    },
    {
      type: 'note',
      md: 'Solution 1. d_head = 512 / 8 = 64. Head 3 receives 64 numbers — a contiguous slice of the 512, specifically positions 192 through 255, since head 3 starts at 3 × 64 = 192. It never sees the other 448 numbers. Total across all 8 heads: 8 × 64 = 512, the original width, nothing copied.',
    },
    {
      type: 'note',
      md: 'Solution 2. Row 1: column 1 only. Row 2: columns 1 and 2. Row 3: columns 1, 2, 3. Row 4: columns 1, 2, 3, 4. Ten allowed cells out of sixteen. The forbidden six are the strict upper triangle, where the column number is greater than the row number. Note how uneven this is: word 1 has one thing to look at and word 4 has four. That asymmetry is real and it is not a bug — early words genuinely have less context available.',
    },
    {
      type: 'note',
      md: 'Solution 3. e to the power 1.0 = 2.718, twice. e to the power −∞ = 0, twice. Total = 2.718 + 2.718 + 0 + 0 = 5.436. Weights: 2.718/5.436 = 0.5, 2.718/5.436 = 0.5, then 0 and 0. So [0.5, 0.5, 0, 0], adding to exactly 1. Two equal scores share the budget evenly, and the two masked entries take none of it and contribute none of the divisor.',
    },
    {
      type: 'note',
      md: 'Solution 4. They end up with [0.5, 0.3, 0, 0], which adds to 0.8. The correct answer is to mask first: the scores behind those weights would go to −∞, the divisor would drop, and the two survivors would rescale to 0.5/0.8 = 0.625 and 0.3/0.8 = 0.375, adding to 1. So their output vector is 0.8 times the size it should be — a 20% shrink on this row, and a different shrink on every other row, since each row masks a different number of columns. Nothing crashes; the model just quietly trains worse.',
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. This section is for a second pass.

- **What heads actually specialise into.** Researchers have inspected trained models and found heads with recognisable jobs: heads that always attend to the previous word, heads that track positions, and **induction heads**, which spot a pattern "... A B ... A" and predict B. Induction heads appear during training at the same moment a model starts learning from examples given in its prompt. Nobody programmed them; they emerge.
- **Padding masks are a second, different mask.** To batch sentences of different lengths you pad the short ones with filler tokens, and a padding mask blocks every row from attending to those filler columns. The causal mask is the same triangle for every sentence in the batch; the padding mask differs per sentence. You combine them — block if either says block — and apply once, before softmax. Watch for a row where everything is masked: softmax then divides zero by zero and produces NaN.
- **The other two mask policies.** No mask at all gives a bidirectional encoder (BERT), where every word sees every word — good for classification, useless for generating left to right. A third arrangement is cross-attention: the Queries come from the decoder while the Keys and Values come from an encoder\'s output, so the score matrix is not square and is not causal, because the whole source sentence is legitimately available. That is how translation models work.
- **What the score matrix costs.** The masked score grid is not stored weights; it is scratch memory rebuilt for every batch, of size heads × T × T numbers per layer, where T is the sentence length. At T = 8192 with 32 heads and 2 bytes per number that is about 4 GB — for one layer. Doubling the context quadruples it. FlashAttention fixes this by computing the same softmax in small tiles that stay in fast on-chip memory so the full grid is never written out. It is exact, not an approximation.
- **What is still missing.** The mask fixes direction, but attention still has no idea that word 3 comes before word 7 in any way other than being masked out. Positional encodings come next, then the residual connections, normalisation and feed-forward layer that turn this into a stackable block.`,
    },
  ],
  quiz: [
    {
      question: 'A model has d_model = 512 and h = 8 heads. What is d_head, and how does the score-computation work compare to a single head of width 512?',
      options: [
        { text: 'd_head = 512, and it costs 8 times more', explanation: 'This assumes each head gets a full copy of the embedding. It does not — the 512 numbers are cut into 8 pieces.' },
        {
          text: 'd_head = 64, and it costs about the same',
          explanation: 'Correct. 512/8 = 64. Eight heads each doing dot products over 64 numbers equals one head doing dot products over 512. The head count multiplies and the head width divides, and they cancel.',
        },
        { text: 'd_head = 64, and it costs 8 times less', explanation: 'Each individual head is 8 times cheaper, but there are 8 of them. The total comes back to the same number.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is one attention head not enough?',
      options: [
        { text: 'One head does not have enough stored numbers to learn much', explanation: 'The stored-number count is the same whether you use 1 head or 96 — heads are a way of slicing, not extra parameters.' },
        { text: 'One head is unstable to train', explanation: 'A single head trains perfectly well. The problem is what it can express, not whether it converges.' },
        {
          text: 'One head produces one row of weights per word, adding to 1, so different kinds of relationship must compete for the same budget of 1.0',
          explanation: 'Correct. Weight put on the subject noun is weight taken away from the previous word. Several heads give several independent budgets, so the relationships stop competing.',
        },
      ],
      correct: 2,
    },
    {
      question: 'After each head produces its 4-number output, what does concatenation do?',
      options: [
        {
          text: 'Lays the head outputs end to end, so 2 heads of 4 numbers become one list of 8',
          explanation: 'Correct. In Python it is literally list_a + list_b. Nothing is added or averaged, and the width returns to what the rest of the network expects.',
        },
        { text: 'Averages the head outputs into 4 numbers', explanation: 'Averaging would throw away the very specialisation multi-head exists to create, and would also halve the width.' },
        { text: 'Adds the head outputs together element by element', explanation: 'That gives 4 numbers, not 8, and blends the heads before the output projection gets a chance to learn how to blend them.' },
      ],
      correct: 0,
    },
    {
      question: 'A masked score row is [0.0, 2.0, negative infinity]. After softmax, what is it, and why?',
      options: [
        { text: '[0.09, 0.665, 0.0], because the third entry becomes zero', explanation: 'Those are the weights for the UNMASKED row [0.0, 2.0, 1.0] with the last one zeroed afterwards. They add to 0.755, not 1.' },
        {
          text: '[0.119, 0.881, 0.0], because exp of negative infinity is 0 and so contributes nothing to the divisor',
          explanation: 'Correct. e^0 = 1 and e^2 = 7.389, so the total is 8.389, not 11.107. The two surviving words share the whole budget: 1/8.389 = 0.119 and 7.389/8.389 = 0.881.',
        },
        { text: '[0.5, 0.5, 0.0], because masked rows are split evenly', explanation: 'Softmax still respects the surviving scores. 2.0 beats 0.0 by a lot, so the weights are far from equal.' },
      ],
      correct: 1,
    },
    {
      question: 'You zero the future attention weights AFTER softmax instead of masking the scores before it. What actually goes wrong?',
      options: [
        { text: 'Nothing — the future weights are zero either way', explanation: 'The future entries are indeed zero. The damage is done to the entries that survive.' },
        {
          text: 'Each row now adds to less than 1, so every word gets a shrunk output — and it never errors',
          explanation: 'Correct. A row that softmaxed to [0.5, 0.3, 0.15, 0.05] becomes [0.5, 0.3, 0, 0], adding to 0.8. Each row shrinks by a different factor, the model trains to a worse result, and nothing crashes.',
        },
        { text: 'The values immediately become NaN', explanation: 'All the numbers stay finite and the training run looks completely healthy. That is exactly why this bug survives for days.' },
      ],
      correct: 1,
    },
    {
      question: 'With a causal mask, how many next-word training signals does ONE pass over a 1000-word sequence produce?',
      options: [
        { text: '1 — only the last position has seen enough to predict', explanation: 'That would waste almost all the compute. Every row has already seen a valid run of words from the start.' },
        { text: '500 — roughly half the positions are usable', explanation: 'There is no halving anywhere. Every one of the 1000 rows saw a valid prefix.' },
        {
          text: '1000 — row i saw exactly words 1 to i, so every row is an honest prediction of word i+1',
          explanation: 'Correct, and this is the whole training-speed story. The loss is the average over all 1000 positions. A recurrent network needs 1000 sequential steps to get the same signals.',
        },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why multi-head attention instead of a single head? And does it cost more?',
      answer:
        'A single head produces one row of attention weights per word, and that row adds up to 1. So it can encode exactly one notion of "what matters to me": weight placed on the subject noun is weight taken away from the previous word, because they share a single budget of 1.0. Multiple heads give multiple independent budgets, so different relationships can be captured at the same time. On cost: the embedding width is split among the heads rather than copied, so head width is d_model divided by h. The score work is h heads times (T squared scores times d_model/h numbers each), which is T squared times d_model — the h cancels, giving the same total as one full-width head. Stored parameters are unchanged too, because you build one full-width matrix and slice its output. The real limit is that heads can be made too narrow to represent anything, which is why head width stays around 64 to 128 even in huge models.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through what happens to one word vector inside a multi-head attention layer.',
      answer:
        'Say d_model is 8 and there are 2 heads. The word arrives as 8 numbers. First it is projected into Query, Key and Value with full-width matrices, still 8 numbers each. Then it is split: the first 4 numbers belong to head 0, the last 4 to head 1 — a cut, not a copy. Each head builds its own T by T score matrix from its own Queries and Keys, divides by the square root of its own head width, applies the causal mask, and row-softmaxes. Each head then mixes its own Values with its own weights, producing 4 numbers per word. Those two 4-number outputs are concatenated end to end back into 8. Finally one 8 by 8 output projection W_O mixes them, which is the only point in the whole layer where head 0 and head 1 influence each other. Output width equals input width, which is what lets you stack the layer dozens of times.',
      isCaseBased: false,
    },
    {
      question: 'What is the output projection W_O for? Could we drop it?',
      answer:
        'Up to the concatenation the heads are completely independent — head 0 computed its numbers with no knowledge of head 1, and they occupy separate slices of the output vector. So the concatenated vector is several unmixed opinions stapled together. W_O is a full-width learned matrix in which every output number is a weighted sum of all the inputs, so it can read from every head at once and emit a single mixed representation. You can technically drop it and the model still runs, but you have pushed the mixing job onto the next layer, which now receives a block-structured input, and you have removed a full d_model squared of learnable capacity. There is a second, subtler point: W_O is what makes narrow specialist heads viable at all, because something downstream is explicitly responsible for recombining them.',
      isCaseBased: false,
    },
    {
      question: 'Explain causal masking, and why the negative infinity goes before softmax rather than zeroing weights after.',
      answer:
        'A decoder is trained to predict the next word, but during training the whole sequence is in memory at once, so position i can reach positions i+1 onwards in the score matrix — the answers it is being graded on. Without a mask it learns to copy rather than predict, and at generation time the future does not exist, so it fails completely. The mask sets the score to negative infinity for every column greater than the row, keeping the diagonal and everything below it. It must happen before softmax because softmax raises e to each score and then divides by the total: e to the power of negative infinity is 0, which contributes nothing to the total, so the surviving weights renormalise and the row still adds to exactly 1. Zeroing after softmax removes mass from an already-normalised row — [0.5, 0.3, 0.15, 0.05] becomes [0.5, 0.3, 0, 0], adding to 0.8 — so every word output is shrunk, by a different factor per row. Nothing crashes, which is what makes it expensive. In practice you write a large negative constant rather than literal negative infinity, since in 16-bit floats infinity arithmetic can produce NaN.',
      isCaseBased: false,
    },
    {
      question: 'Why do transformers train so much faster than recurrent networks? Give the answer that mentions the mask.',
      answer:
        'Two reasons, and the second is the one people forget. First, the connection between two distant words is a single attention step rather than a long chain of recurrent steps, so gradients travel a short path. Second, and decisively: with a causal mask, one forward pass over a T-word sequence yields T next-word training signals at once, because row i saw exactly words 1 to i and is therefore a valid prediction of word i+1. The loss is the mean over all T positions. The mask is what makes those T simultaneous predictions honest — without it every row would be reading its own answer. A recurrent network gets the same T signals only through T sequential steps, and no amount of hardware removes that dependency. The honest caveat is that this parallelism is training-only: generation is still one word at a time, because word 501 does not exist until it has been sampled.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague\'s from-scratch GPT reaches near-zero training loss within one epoch, but generates gibberish. Where do you look first?',
      answer:
        'Near-zero loss with useless output is the signature of the answer leaking into the input, and in a decoder there is essentially one place that comes from: the causal mask. State the reasoning first — predicting the next word in English is genuinely hard, so a near-perfect loss means the answer was visible, not that the model is brilliant. Then check in this order. One: is there a mask at all, and is it applied to the scores inside the attention function, before softmax, in every layer? Two: off-by-one. The rule must be "mask when column > row". Writing "column > row + 1" leaks exactly the next word, which is the worst possible leak. Masking with "column >= row" is a different bug: it forbids a word from seeing itself, which hurts quality but does not leak. Three: the target shift. Inputs must be the sequence without its last word and targets the sequence without its first; if the target is also fed as input, the mask is irrelevant. Four: a decisive test worth keeping as a unit test — run the model, then change only word j and confirm the outputs at every position before j are bit-identical. If any earlier position moves, information is flowing backwards from the future.',
      isCaseBased: true,
    },
    {
      question: 'Case: your team wants to extend context from 4k to 32k tokens and the training job runs out of memory immediately. Diagnose it and give a ranked plan.',
      answer:
        'Do the arithmetic out loud first. The score grid is scratch memory of size heads times T squared per layer, so going from 4k to 32k is 8 times the context and 64 times that term. With 32 heads at T = 32768 in 16-bit floats that is roughly 64 GB for a single layer of scores — an entire GPU for one layer. So this is attention activation memory, not weights, and quantising the weights will not help. Ranked plan. One: FlashAttention — mathematically identical attention computed in tiles that stay in fast on-chip memory, so the full grid is never written out; it costs nothing in quality and is usually also faster, so it is always first. Two: gradient checkpointing, recomputing activations during the backward pass for roughly 30% more compute and a large memory saving. Three: cut the batch size and recover the effective batch with gradient accumulation. Four: mixed precision if not already on. Only then anything that changes what the model can represent: sliding-window or block-sparse attention, which gives up direct long-range links, or splitting the sequence across devices. The principle to say explicitly is that exact-kernel and scheduling wins come before any approximation.',
      isCaseBased: true,
    },
    {
      question: 'Case: ablating one specific head in your 24-layer model drops in-context learning accuracy from 80% to 45%, while ablating a random head changes nothing. What is going on, and what do you do?',
      answer:
        'That profile — one head with a large task-specific effect while most heads are individually redundant — is the classic induction-head signature. An induction head implements a copy rule: it scans back for a previous occurrence of the current word A, attends to whatever followed it, and predicts that. They usually appear in pairs across consecutive layers, with a previous-word head in an earlier layer feeding them, and their emergence during training lines up with a visible jump in the model\'s ability to learn from examples in its prompt. Verify before believing: plot that head\'s attention pattern on a sequence of repeated random tokens, where an induction head shows a clean off-diagonal stripe, and look for the previous-word head feeding it. Then act on it: exclude it from any pruning pass and audit the pruning criterion, because most heads being ablation-insensitive is exactly why naive pruning removes the important ones; and use it as a monitoring signal, since a finetune that damages this circuit will quietly cost you few-shot performance. Also resist over-claiming — the circuit is several components, so "this head does in-context learning" is a headline, not a mechanism.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Why more than one head?', back: 'One head gives one row of weights per word, adding to 1 — one budget shared by every kind of relationship. Grammatical agreement, previous-word context and subject-verb links all compete for the same 1.0. Several heads give several independent budgets.' },
    { front: 'What does splitting across heads mean?', back: 'd_head = d_model / h. The embedding is CUT into h slices, not copied. d_model 8 with h 2 gives each head 4 numbers, positions 0 to 3 and 4 to 7, no overlap.' },
    { front: 'Why is multi-head roughly free?', back: 'h heads times (T squared scores times d_model/h numbers each) = T squared times d_model. The head count multiplies and the head width divides; they cancel. Same total as one full-width head, and the same parameter count.' },
    { front: 'Concatenation and the output projection', back: 'Concatenation lays head outputs end to end: 4 + 4 numbers becomes 8. In Python it is list_a + list_b. W_O is an 8 by 8 matrix applied after, and it is the ONLY place the heads mix — before it, head 0 has never seen head 1.' },
    { front: 'Causal mask, in one line', back: 'Word i may attend to word i and everything before it, nothing after. Set the score to negative infinity wherever column > row — the strict upper triangle — before softmax.' },
    { front: 'Why negative infinity BEFORE softmax', back: 'exp of negative infinity is 0, so the masked entry contributes nothing to the divisor and the survivors re-share the full 1.0. Row [0.0, 2.0, -inf] becomes [0.119, 0.881, 0.0]. Zeroing after softmax gives [0.09, 0.665, 0.0], adding to 0.755 — output silently shrunk, trains worse, never errors.' },
    { front: 'Why the mask makes training parallel', back: 'One pass over T words gives T next-word predictions, because row i saw exactly words 1 to i. The mask is what makes them honest. A recurrent net needs T sequential steps. Training only — generation stays one word at a time.' },
    { front: 'The classic mask bug', back: 'Training loss collapses to near zero in one epoch, generation is gibberish. Predicting English is hard, so a loss that good means the answer leaked. Usual cause: mask written as column > row + 1 instead of column > row, letting each word see exactly the word it must predict.' },
  ],
  mindmapMarkdown: `- Multi-Head Attention & Causal Masking
  - Why many heads
    - one row of weights = one budget of 1.0
    - agreement, previous word, subject-verb all compete
    - several heads = several independent budgets
    - trained heads specialise; induction heads emerge
  - Splitting
    - d_head = d_model / h (CUT, not copy)
    - 8 numbers, 2 heads -> 4 and 4, no overlap
    - GPT-2: 768/12 = 64 · GPT-3: 12288/96 = 128
  - Cost
    - 3 words, 1 head of 8: 9 scores x 8 = 72 mults
    - 3 words, 2 heads of 4: 2 x 9 x 4 = 72 mults
    - h multiplies, d_head divides, they cancel
    - parameter count independent of h
  - Journey of one word
    - in: 8 numbers
    - split: 4 to head 0, 4 to head 1
    - each head: scores, mask, softmax, mix
    - concatenate: 4 + 4 = 8
    - W_O (8x8): the only place heads mix
    - out: 8 numbers, same width as in
  - Causal masking
    - word i sees j <= i, never the future
    - strict upper triangle -> negative infinity
    - BEFORE softmax, never after
    - exp(-inf) = 0, drops out of the divisor too
    - [0.0, 2.0, -inf] -> [0.119, 0.881, 0.0]
    - zero after softmax -> row sums 0.755, silent bug
    - use -1e9 in 16-bit floats (inf can give NaN)
  - Training payoff
    - 1 pass over T words = T next-word predictions
    - loss = average over all T positions
    - recurrent net needs T sequential steps
    - training only; generation stays sequential
  - Classic bug
    - loss near zero in one epoch, output gibberish
    - column > row + 1 leaks exactly the next word
    - test: change word j, earlier outputs must not move
  - Beyond the basics
    - padding masks, combined with the causal one
    - no mask = BERT; cross-attention = Q decoder, K/V encoder
    - score memory = heads x T x T per layer
    - FlashAttention: exact, tiled, never writes the grid
  - Next
    - positional encodings (attention is still order-blind)
    - residuals, normalisation, feed-forward = the block`,
}

export default m
