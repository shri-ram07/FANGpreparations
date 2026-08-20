import type { Module } from '../types'

const m: Module = {
  id: 'genai-l0-self-attention',
  subjectId: 'genai',
  level: 0,
  title: 'Self-Attention from zero',
  whyItMatters:
    'Tokenization turned text into a list of numbers, one vector per token. But those vectors are still isolated: the vector for the word "it" knows nothing about the word "animal" sitting eight positions earlier. Self-attention is the mechanism that lets every token look at every other token and pull in the meaning it needs. It is the one idea that makes a transformer a transformer, and every later module in this subject is built on top of it. This module builds it from three tokens and two-dimensional vectors, with every single number computed by hand.',
  assumes: [
    'You have read Tokenization: How Text Becomes Numbers, so you know that each token ends up as a list of numbers called an embedding',
    'You have read the Math subject module Vectors & the Dot Product (= Similarity), so you know that the dot product of two vectors is one number that is large when the two vectors point the same way',
    'You have seen a Python list, a for loop, and a function definition',
    'You know what an average is, and what a weighted average is: an average where some items count more than others',
    'No calculus and no matrix algebra beyond multiplying small grids of numbers is needed. Everything else is defined on this page.',
  ],
  estMinutes: 46,
  sections: [
    {
      type: 'intuition',
      title: 'The problem: one word that means nothing on its own',
      md: `Read this sentence:

*"The animal did not cross the street because it was too tired."*

What does **it** refer to? You answered "the animal" instantly, and you did not think about how. Now change one word:

*"The animal did not cross the street because it was too wide."*

Now **it** refers to the street. The word "it" did not change. Everything about which word it points to came from the *rest of the sentence*.

Here is why that is a problem for a model. After tokenization, the model holds one vector of numbers per token. The vector for "it" is the same vector in both sentences, because it is the same token. If nothing ever mixes information between positions, the model has no way at all to tell the two sentences apart at the position of "it".

So the model needs a mechanism that does exactly one job: **let each token look at the other tokens and pull in some of their meaning.** That mechanism is called **attention**. When the tokens doing the looking and the tokens being looked at come from the same sentence, it is called **self-attention** — the sentence attending to itself.

The rest of this module is that mechanism, built one number at a time.`,
    },
    {
      type: 'intuition',
      title: 'Three jobs, three vectors: query, key, value',
      md: `Attention needs each token to do three different jobs, so we give each token three different vectors. Here are all three, defined now, in plain words.

- **Query** — what this token is looking for. Think of it as a question the token asks out loud: *"I am a pronoun, which noun am I standing in for?"* Written **q**.
- **Key** — what this token advertises about itself, so that others can find it. Think of a small sign it holds up: *"I am an animal, and I am the subject of this sentence."* Written **k**.
- **Value** — the actual content this token will hand over if somebody picks it. Its meaning, the thing worth copying. Written **v**.

The whole mechanism is then three steps, and they are exactly what you would do at a noisy party:

1. Every token shouts its **question** and reads everybody's **sign**. Question-meets-sign gives a number: how well does this sign answer my question?
2. Turn that pile of numbers into proportions that add up to 1. Sixty percent of my attention to this token, twenty to that one, and so on.
3. Take a **weighted average of everybody's content**, using those proportions.

That is it. Everything else in this module is the arithmetic of those three steps.

Two vocabulary items so the later sections have names to use. The number from step 1 — question against one sign — is the **attention score**. The proportion from step 2 is the **attention weight**. Scores can be any size, positive or negative. Weights are always between 0 and 1 and always add up to 1 across one token's row.`,
    },
    {
      type: 'hinglish',
      md: `Simple mein: har token teen cheezein leke ghoomta hai. Ek **sawaal** (query) — "mujhe kya chahiye". Ek **board** (key) — "mere paas kya hai, dekh lo". Aur **maal** (value) — asli meaning jo wo de sakta hai. Har token apna sawaal sabke board se milata hai. Jiska board sawaal se sabse zyada match kiya, uska maal utna zyada mix hoga. "it" ne poocha "kaunsa noun hoon main?", "animal" ka board sabse zor se match hua, to "it" ka naya meaning mostly animal ban gaya.`,
    },
    {
      type: 'intuition',
      title: 'Where the three vectors come from',
      md: `The token does not arrive with three vectors. It arrives with one — its embedding, the vector tokenization produced. The three are *made* from that one, by multiplying it with three grids of numbers that the model learns during training. Those grids are called **W_Q**, **W_K** and **W_V**, and they are the only adjustable numbers in the whole mechanism.

Work one out by hand so this is not abstract. Suppose the token "it" has the two-number embedding **x = [0, 2]**, and the learned grid is

- W_Q row 1 = [0, 1]
- W_Q row 2 = [1, 0]

Multiplying a vector by a grid means: each output slot is the sum, over every input slot, of (input number times the grid entry that connects them).

- Output slot 1 = 0 x 0 + 2 x 1 = **2**
- Output slot 2 = 0 x 1 + 2 x 0 = **0**

So **q = [2, 0]**. The same embedding, run through W_K, would give the key; through W_V, the value. Three different grids, three different vectors, all built from the same starting embedding.

Why three separate grids and not one vector reused for everything? Because asking and advertising are genuinely different jobs. "it" wants to *find* nouns, but what it *advertises* about itself is "I am a pronoun". If the query and the key were the same vector, a token could only ever find tokens that look like itself, and "it" looks nothing like "animal". Separate grids let a token seek one thing while advertising another.

For the rest of this module the grids have already done their work. We will write down q, k and v directly, because the interesting arithmetic starts after that point.`,
    },
    {
      type: 'intuition',
      title: 'Step 1 by hand: score every pair',
      md: `Three tokens. Call them **cat**, **sat**, **it**. Two numbers in every vector, so the arithmetic stays small enough to check on paper. Here is the whole setup.

- Queries: **q_cat = [1, 0]**, **q_sat = [0, 1]**, **q_it = [2, 0]**
- Keys: **k_cat = [1, 0]**, **k_sat = [0, 1]**, **k_it = [0.5, 0.5]**
- Values: **v_cat = [4, 0]**, **v_sat = [0, 4]**, **v_it = [1, 1]**

Read the first slot of these vectors as "how noun-like / how animal-like" and the second as "how verb-like". So cat advertises pure noun-ness, sat advertises pure verb-ness, and it advertises a bit of both. And q_it = [2, 0] says: *I am looking for something noun-like, and I am looking hard.*

The score is the **dot product** of a query with a key: multiply the vectors slot by slot, then add up the results. From the Math module: a big dot product means the two vectors point the same way.

Take **it** asking about **cat**: q_it dot k_cat = 2 x 1 + 0 x 0 = **2**.
Take **it** asking about **sat**: q_it dot k_sat = 2 x 0 + 0 x 1 = **0**.
Take **it** asking about **it** itself: q_it dot k_it = 2 x 0.5 + 0 x 0.5 = **1**.

Do that for all nine pairs and you get a 3-by-3 grid of scores. Row i is "what token i asked", column j is "which token answered".

- Row cat: **1, 0, 0.5**
- Row sat: **0, 1, 0.5**
- Row it: **2, 0, 1**

Look at the row for **it**: 2 for cat, 0 for sat, 1 for itself. Cat won, exactly as we wanted. Check one entry yourself before moving on — row sat, column cat is q_sat dot k_cat = 0 x 1 + 1 x 0 = 0, a verb asking a noun and getting nothing.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 1 in code: the score grid, with plain lists',
      code: `Q = [[1.0, 0.0], [0.0, 1.0], [2.0, 0.0]]
K = [[1.0, 0.0], [0.0, 1.0], [0.5, 0.5]]

def dot(a, b):
    total = 0.0
    for t in range(len(a)):
        total = total + a[t] * b[t]
    return total

scores = []
for i in range(3):
    row = []
    for j in range(3):
        row.append(dot(Q[i], K[j]))
    scores.append(row)

for row in scores:
    print(row)

# ---- real output ----
# [1.0, 0.0, 0.5]
# [0.0, 1.0, 0.5]
# [2.0, 0.0, 1.0]`,
      annotations: {
        1: 'Q is a list of lists: three inner lists, one query vector per token, in the order cat, sat, it. Q[2] is [2.0, 0.0], the query for "it".',
        2: 'K holds the three key vectors in the same token order, so Q[i] and K[i] describe the same token.',
        4: 'Defines a function called dot that takes two vectors a and b and will hand back a single number.',
        5: 'A running total, starting at zero. It will accumulate the slot-by-slot products.',
        6: 'len(a) is 2 here, so range(len(a)) gives t = 0, then t = 1 — one pass per slot of the vector.',
        7: 'Multiply the two numbers sitting in the same slot and add the result to the total. This one line is the entire definition of the dot product.',
        8: 'Hand back the accumulated number. For a = [2, 0] and b = [1, 0] this returns 2.0.',
        10: 'An empty list that will collect the three rows of the score grid.',
        11: 'Loop over the asking token. i = 0 is cat asking, i = 1 is sat asking, i = 2 is it asking.',
        12: 'A fresh empty row for the current asking token. It will end up holding three numbers.',
        13: 'Loop over the answering token, so every asker meets every key. Two nested loops means all 3 x 3 = 9 pairs get scored.',
        14: 'Score this one pair and append it to the row. append adds an item to the end of a list.',
        15: 'The row is finished, so attach it to the grid before moving to the next asking token.',
        17: 'Walk the three finished rows so we can print them one per line.',
        18: 'Print one row. The third printed row, [2.0, 0.0, 1.0], is exactly the hand computation for "it" above.',
      },
    },
    {
      type: 'intuition',
      title: 'Step 2 by hand: scale, then turn scores into weights',
      md: `The row for **it** is **2, 0, 1**. Those are raw scores. They are not usable as mixing proportions yet: they do not add up to 1, and a score could easily be negative. Two operations fix that, in this order.

**First, scale.** Divide every score by the square root of the number of slots in a key vector. That count is written **d_k** — here d_k = 2, so we divide by the square root of 2, which is 1.4142. Why we do this gets its own section below, with a demonstration. For now, just do it:

- 2 / 1.4142 = **1.4142**
- 0 / 1.4142 = **0**
- 1 / 1.4142 = **0.7071**

Dividing dot products by the square root of d_k before the next step is why this whole mechanism is called **scaled dot-product attention**.

**Second, softmax.** **Softmax** is a small recipe that turns any list of numbers into positive numbers that add up to 1, while keeping the order. Two steps:

1. Raise the mathematical constant e (about 2.71828) to the power of each number. This is written exp, and it makes every result positive no matter what went in, including negatives.
2. Divide each result by the sum of all of them, so the whole list adds to 1.

On our three scaled scores:

- exp(1.4142) = **4.1133**
- exp(0) = **1.0000**
- exp(0.7071) = **2.0281**
- Their sum is 4.1133 + 1.0000 + 2.0281 = **7.1414**

Now divide each by 7.1414:

- 4.1133 / 7.1414 = **0.5760**
- 1.0000 / 7.1414 = **0.1400**
- 2.0281 / 7.1414 = **0.2840**

Check: 0.5760 + 0.1400 + 0.2840 = 1.0000. Those three numbers are the **attention weights** for the token "it". Read them as a sentence: *when building the new meaning of "it", take 57.6% of cat, 14.0% of sat, and 28.4% of itself.*

Notice what exp did. The raw gap between cat and sat was 1.4142 in scaled score. After exp and normalising, cat gets four times the weight of sat. Softmax exaggerates differences — it does not just rescale them.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 2 in code: scale and softmax the row for "it"',
      code: `import math

raw = [2.0, 0.0, 1.0]
d_k = 2
scaled = []
for s in raw:
    scaled.append(s / math.sqrt(d_k))
exps = []
for s in scaled:
    exps.append(math.exp(s))
total = sum(exps)
weights = []
for e in exps:
    weights.append(e / total)
print([round(s, 4) for s in scaled], round(total, 4))
print([round(w, 4) for w in weights], round(sum(weights), 4))

# ---- real output ----
# [1.4142, 0.0, 0.7071] 7.1414
# [0.576, 0.14, 0.284] 1.0`,
      annotations: {
        1: 'The math module from Python\'s standard library. We need two things from it: math.sqrt for the square root and math.exp for raising e to a power. No numpy anywhere in this module.',
        3: 'The row of raw scores for "it" that we computed by hand and confirmed in the previous snippet: 2 for cat, 0 for sat, 1 for itself.',
        4: 'd_k is the number of slots in a key vector — 2 in this toy example. Naming it makes the next line read as the actual rule rather than as a magic number.',
        5: 'An empty list that will hold the three scaled scores.',
        6: 'Walk the raw scores one at a time. s is the current score.',
        7: 'Divide by the square root of d_k and store the result. math.sqrt(2) is 1.4142, so 2.0 becomes 1.4142.',
        8: 'An empty list for the exponentials — softmax step one.',
        9: 'Walk the scaled scores. Reusing the name s is fine: the earlier loop has finished.',
        10: 'math.exp(s) raises e (about 2.71828) to the power s. This is what forces every entry positive, which is why the results can safely be read as proportions.',
        11: 'sum() is a built-in that adds up every item in a list. This total, 7.1414, is what we divide by — softmax step two.',
        12: 'An empty list for the finished weights.',
        13: 'Walk the exponentials. e here is a loop variable holding one exponential; it is not the constant e.',
        14: 'Divide by the total so the three numbers add up to exactly 1. This division is the entire normalising half of softmax.',
        15: 'The bracketed expression is a list comprehension: it builds a new list by applying round(s, 4) to every s in scaled. Read it as "the list of round(s, 4), for each s in scaled". Printed alongside it is the softmax denominator.',
        16: 'The same comprehension applied to the weights, plus their sum as a sanity check. It prints 1.0, which is the property softmax guarantees.',
      },
    },
    {
      type: 'intuition',
      title: 'Step 3 by hand: mix the values into a context vector',
      md: `We now have proportions for "it": 0.5760 of cat, 0.1400 of sat, 0.2840 of itself. Step 3 spends them on the **value** vectors.

Recall the values: **v_cat = [4, 0]**, **v_sat = [0, 4]**, **v_it = [1, 1]**. Multiply each value vector by its weight, then add the three results slot by slot.

Slot 1:

- 0.5760 x 4 = 2.3040
- 0.1400 x 0 = 0
- 0.2840 x 1 = 0.2840
- Total: **2.5880**

Slot 2:

- 0.5760 x 0 = 0
- 0.1400 x 4 = 0.5600
- 0.2840 x 1 = 0.2840
- Total: **0.8440**

So the output for "it" is **[2.588, 0.844]**. This output has a name: the **context vector**. It is the token's new representation, the one that leaves this layer and goes on to the next.

Look at what happened. "it" arrived as a vector that said nothing about nouns or verbs. It leaves as [2.588, 0.844] — strongly noun-flavoured, because 57.6% of it is cat's value vector [4, 0]. The word "it" now carries the meaning of "cat" inside it. That is the entire point of the mechanism, and you just did it with a calculator.

One property worth naming: the context vector has the same number of slots as the value vectors, which is normally the same as the input embedding. Same shape in, same shape out. That is what lets a transformer stack this layer twenty times in a row.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 3 in code: the weighted sum',
      code: `V = [[4.0, 0.0], [0.0, 4.0], [1.0, 1.0]]
weights = [0.576, 0.14, 0.284]

context = [0.0, 0.0]
for j in range(3):
    for t in range(2):
        context[t] = context[t] + weights[j] * V[j][t]

print([round(c, 4) for c in context])

# ---- real output ----
# [2.588, 0.844]`,
      annotations: {
        1: 'The three value vectors, in the same token order as before: cat, sat, it.',
        2: 'The weights we just computed for the token "it", pasted in so this snippet stands alone.',
        4: 'The output vector, started at all zeros. We will add each token\'s weighted contribution into it.',
        5: 'Loop over the answering tokens. j = 0 is cat, j = 1 is sat, j = 2 is it.',
        6: 'Loop over the two slots of the vectors. t = 0 is slot one, t = 1 is slot two.',
        7: 'Add this token\'s value in this slot, shrunk by its weight, into the running output. Nine tiny additions in total, which is exactly the hand computation above.',
        9: 'Print the finished context vector, rounded. [2.588, 0.844] matches the hand arithmetic to the last digit.',
      },
    },
    {
      type: 'hinglish',
      md: `Teen step, ek line mein: **score, softmax, mix**. Pehle har token ka sawaal sabke board se milao — number nikla (score). Phir un numbers ko percentage mein badlo taaki total 100% ho (softmax). Phir sabka maal us percentage ke hisaab se mila do (weighted sum). Jo bahar aaya wo hai **context vector** — usi token ka naya matlab, jisme ab poore sentence ki information ghuli hui hai. "it" andar gaya khaali, bahar aaya "cat" ka flavour leke.`,
    },
    {
      type: 'math',
      intro: 'The three steps you just did by hand, written in one line of symbols. Q, K and V are the grids holding all three tokens\' queries, keys and values stacked as rows.',
      latex: [
        '\\text{Attention}(Q, K, V) \\;=\\; \\text{softmax}\\!\\left( \\frac{Q K^{\\top}}{\\sqrt{d_k}} \\right) V',
        '\\text{softmax}(s)_j \\;=\\; \\frac{e^{s_j}}{\\sum_{p} e^{s_p}} \\qquad \\text{our row: } \\frac{4.1133}{7.1414} = 0.5760',
        '\\text{context}_i \\;=\\; \\sum_{j} w_{ij}\\, v_j \\qquad \\text{our row: } 0.576\\,[4,0] + 0.14\\,[0,4] + 0.284\\,[1,1] = [2.588,\\, 0.844]',
      ],
    },
    {
      type: 'note',
      md: `Read the first line right to left against what you just computed. K with the little T means "keys, flipped so they line up as columns" — multiplying Q by it produces every query-meets-key dot product at once, which is our 3-by-3 score grid. Divide by the square root of d_k: that is the scaling. Softmax: that is the row of proportions. Multiply by V: that is the weighted sum. One line of symbols, three steps, and you have already done all three on paper.`,
    },
    {
      type: 'intuition',
      title: 'Why divide by the square root of d_k — shown, not asserted',
      md: `This is the step people memorise without understanding. It has a concrete reason, and you can see it in four numbers.

A dot product adds up one product per slot. With d_k = 2 slots the sum stays small. With d_k = 64 slots, which is a normal head size in a real model, you are adding 64 products, and the total is typically several times larger. Real scores in an unscaled 64-slot head routinely land around 10 rather than around 1.

So take a realistic unscaled row of scores: **10, 2, 1**. Run softmax on it exactly as before, and you get:

- **0.999541**, 0.000335, 0.000123

One token takes 99.95% of the attention. The other two get essentially nothing. This is called **saturation**: softmax has collapsed to a near one-hot answer, meaning one entry is almost 1 and the rest are almost 0.

Now scale first. The square root of 64 is 8, so divide: 10/8 = 1.25, 2/8 = 0.25, 1/8 = 0.125. Softmax those and you get:

- **0.590831**, 0.217355, 0.191815

Same ordering, same winner, but the other two tokens are still in the conversation.

**Why saturation is actually harmful.** Training works by nudging the learned grids and seeing how the output responds. If a tiny nudge changes nothing, training gets no instruction and that grid never improves. For softmax, how strongly the top weight responds to a nudge in its score is the weight times one minus the weight. Plug in both cases:

- Unscaled: 0.999541 x (1 - 0.999541) = **0.000459**
- Scaled: 0.590831 x (1 - 0.590831) = **0.241750**

The scaled version responds about **five hundred times more strongly**. In the unscaled version the response is so close to zero that training signal effectively disappears. That is what people mean by "the gradients vanish": not that they are literally zero, but that they are too small to move anything in a reasonable amount of training.

Dividing by the square root of d_k is chosen precisely because dot-product sizes grow roughly in proportion to that square root, so the division keeps typical scores near 1 no matter how many slots a head has.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Scaling, part 1: softmax as a reusable function',
      code: `import math

def softmax(scores):
    exps = []
    for s in scores:
        exps.append(math.exp(s))
    total = sum(exps)
    weights = []
    for e in exps:
        weights.append(e / total)
    return weights

print([round(w, 4) for w in softmax([1.4142, 0.0, 0.7071])])

# ---- real output ----
# [0.576, 0.14, 0.284]`,
      annotations: {
        1: 'math again, for math.exp.',
        3: 'Defines softmax as a function taking a list of scores. Same three lines of arithmetic as the step-2 snippet, just packaged so we can call it repeatedly.',
        4: 'Empty list for the exponentials.',
        5: 'Walk the incoming scores one at a time.',
        6: 'Raise e to the power of the score and store it. Always positive, whatever the score was.',
        7: 'Add all the exponentials up. This is the normalising denominator.',
        8: 'Empty list for the finished weights.',
        9: 'Walk the exponentials again.',
        10: 'Divide each by the total, forcing the list to add up to 1.',
        11: 'Hand back the list of weights.',
        13: 'A check that the packaged version reproduces the numbers we already computed by hand: the same 0.576, 0.14, 0.284 for the token "it".',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Scaling, part 2: the same scores, with and without the division',
      code: `raw = [10.0, 2.0, 1.0]
scaled = []
for s in raw:
    scaled.append(s / 8.0)
big = softmax(raw)
small = softmax(scaled)
print('unscaled:', [round(w, 6) for w in big])
print('scaled:  ', [round(w, 6) for w in small])
print('slope unscaled:', round(big[0] * (1 - big[0]), 6))
print('slope scaled:  ', round(small[0] * (1 - small[0]), 6))

# ---- real output ----
# unscaled: [0.999541, 0.000335, 0.000123]
# scaled:   [0.590831, 0.217355, 0.191815]
# slope unscaled: 0.000458
# slope scaled:   0.24175`,
      annotations: {
        1: 'A realistic row of unscaled scores from a 64-slot head. Nothing here is extreme — sums of 64 products land in this range routinely.',
        2: 'Empty list for the scaled copies.',
        3: 'Walk the raw scores.',
        4: 'Divide by 8.0, which is the square root of 64. This single division is the entire scaling step.',
        5: 'Softmax the unscaled row, using the function from part 1.',
        6: 'Softmax the scaled row. Same function, same ordering of inputs — only the sizes differ.',
        7: 'Print the unscaled weights to six decimals. The first entry, 0.999541, is the collapse.',
        8: 'Print the scaled weights. The other two tokens now hold 21.7% and 19.2%, so the layer can still mix in their content.',
        9: 'weight times (1 - weight) is how strongly the top attention weight responds to a small nudge in its score. Here it is 0.000458 — effectively no response, so training learns nothing from this position.',
        10: 'The same measure for the scaled row: 0.24175, roughly five hundred times larger. That is the whole argument for the division, in one printed pair of numbers.',
      },
    },
    { type: 'visual', component: 'AttentionHeatmap', props: {} },
    {
      type: 'note',
      md: `Three things to look at in that heatmap, in this order. **First, the rows.** Each row is one token asking; the brightness across a row is exactly the kind of weight list you computed for "it". Every row's brightness adds up to the same total, because every row is a softmax. **Second, the bright cell in the pronoun's row.** It sits over the noun the pronoun refers to — the same coreference pattern as our cat-and-it example, just discovered from data instead of hand-picked. **Third, the shape of the lit region.** If the upper-right triangle is dark, this is a GPT-style head where a token is only allowed to look at itself and the tokens before it. That restriction is called causal masking and it is the subject of Multi-Head Attention & Causal Masking. The weights in this demo come from a hand-built toy head so the pattern is clearly visible; real heads learn their own grids and end up finding patterns like these on their own.`,
    },
    {
      type: 'intuition',
      title: 'Why this replaced the older approach',
      md: `Before attention, the standard way to let word 40 know about word 1 was to pass a running summary along the sentence, one token at a time. That family of models is covered in the Deep Learning module RNNs, LSTMs & the Road to Attention. Two concrete problems killed it.

**Problem one: distance.** In the pass-it-along design, information from "animal" reaches "it" only by surviving every intermediate step, and each step rewrites the summary. By the time it arrives it has been overwritten dozens of times. In attention, "it" reads "animal" directly. Look back at the score grid: q_it met k_cat in a single dot product. There were no intermediate tokens involved at all. Whether the target is 5 tokens back or 5000, it is still one dot product.

**Problem two: order of work.** The pass-it-along design cannot compute step 40 until steps 1 through 39 are finished, because step 40 needs the summary they produce. That is a queue, and a graphics card is a machine built to do thousands of small multiplications at the same time. A queue wastes it.

Attention has no queue. Every one of the nine dot products in our score grid could have been computed at the same instant — none of them needs any other one's answer. Our three nested loops in Python are just a way of writing that on a machine that runs one line at a time. On a graphics card the whole grid is one parallel operation. This is why training large models became practical.

**The price.** Every token scores every token, so an n-token sentence needs n x n scores. Three tokens gave us 9. A thousand tokens give a million. Double the sentence length and the bill goes up four times, not two. That cost is the permanent trade attention makes: it buys direct access and parallelism, and it pays in a score grid that grows as the square of the length.

**One honest limitation.** Nothing in the arithmetic you did looked at *where* a token sits. Shuffle the three tokens and the same query still meets the same key and produces the same score. Attention on its own is completely blind to word order. Order has to be injected into the embeddings separately, before attention ever sees them, and that is what Positional Encoding: Teaching Attention About Order is about.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: the full three-token layer, every number',
      md: `We only finished the row for "it". Here is the whole layer, all three rows, so you can see a complete pass. Same queries, keys and values as before, d_k = 2, so every raw score is divided by 1.4142.

**Row cat.** Raw scores 1, 0, 0.5. Scaled: 0.7071, 0, 0.3536. Exponentials: 2.0281, 1.0000, 1.4241, summing to 4.4522. Weights: 2.0281/4.4522 = **0.4555**, 1.0000/4.4522 = **0.2246**, 1.4241/4.4522 = **0.3199**. Context: slot 1 = 0.4555 x 4 + 0.2246 x 0 + 0.3199 x 1 = **2.1420**; slot 2 = 0 + 0.2246 x 4 + 0.3199 x 1 = **1.2183**.

**Row sat.** Raw scores 0, 1, 0.5 — a mirror image of row cat, so the weights mirror too: **0.2246**, **0.4555**, **0.3199**. Context: slot 1 = 0.2246 x 4 + 0 + 0.3199 = **1.2183**; slot 2 = 0 + 0.4555 x 4 + 0.3199 = **2.1419**.

**Row it.** Weights **0.5760**, **0.1400**, **0.2840**, context **[2.588, 0.844]**, as computed above.

The finished weight grid, rows adding to 1 across:

- cat: 0.4555, 0.2246, 0.3199
- sat: 0.2246, 0.4555, 0.3199
- it: 0.5760, 0.1400, 0.2840

And the three outputs: cat leaves as [2.1420, 1.2183], sat leaves as [1.2183, 2.1419], it leaves as [2.5880, 0.8440].

Two things to notice. First, cat and sat mostly attend to themselves — 0.4555 each — which is normal and useful: a token usually should keep most of its own meaning. Second, "it" is the only row whose largest weight points at a *different* token. Its output is more noun-flavoured than either of the other rows relative to where it started, because it started with nothing and borrowed from cat. Three tokens in, three tokens out, same shape, and one of them now knows what it refers to.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake, walked into on purpose',
      md: `A student writes their own attention layer with d_k = 64 and gets the three steps right, except they forget the division by the square root of d_k. The code runs, no error appears, and the loss goes down a little and then stops improving. Here is what is happening inside.

- With 64 slots, their raw scores for one token come out around **10, 2, 1**.
- Softmax with no scaling gives weights **0.999541, 0.000335, 0.000123**.
- The context vector is then 0.999541 x v_1 plus two almost-zero contributions. Using our value vectors, that is roughly **[3.998, 0.0015]** — which is v_cat = [4, 0] with a rounding error attached.
- So the layer is not mixing anything. It is picking exactly one token and copying its value straight through. Every row of the attention grid does this, each collapsing onto whichever token happened to score highest.

**The diagnosis.** Attention is supposed to be a *weighted average*, and a weighted average with one weight at 0.9995 is not an average, it is a selection. The mechanism has silently degraded into "each token copies one other token", which throws away almost everything the layer was supposed to compute.

**Why it does not recover on its own.** Training would normally fix a bad setting by nudging the grids. But we measured the response earlier: at a top weight of 0.999541 the softmax response is 0.000459. The signal telling the model to spread its attention out is five hundred times too weak to act on. The layer is stuck in the collapsed state that caused the problem in the first place.

**How to spot it in five minutes.** Print the largest weight in each row. If nearly every row's maximum is above 0.99, you are collapsed. Then print the raw scores before softmax: if they span tens rather than single digits, the missing division is your answer. Add the division and re-run; the maxima should drop into a much more reasonable range and the loss should start moving again.

**A close cousin worth knowing.** The same symptom, uniform-looking nonsense instead of collapse, comes from applying softmax down the columns instead of across the rows. Softmax must run across a row — one token's scores against all tokens — because that row is the budget being divided. Normalising a column instead makes each *answering* token's total across all askers equal 1, which means nothing, and rows then no longer add to 1. Always check row sums equal 1. That single check catches both bugs.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Pen and paper first, solutions in the next section. Keys and values are the same as in the module: k_cat = [1, 0], k_sat = [0, 1], k_it = [0.5, 0.5], v_cat = [4, 0], v_sat = [0, 4], v_it = [1, 1]. d_k = 2, so the scaling divisor is 1.4142.

1. A fourth token arrives with query **q = [1, 1]**. Compute its three raw scores, its three weights, and its context vector. What is unusual about the answer, and what does it tell you about that token?
2. Redo the full row for **cat** from raw scores to context vector, without looking at the worked case. Then say in one sentence why cat's largest weight lands on itself.
3. A head with d_k = 36 produces two raw scores, **6 and 2**. Compute the two softmax weights without scaling, then with the correct scaling. How much of the second token's contribution does the unscaled version throw away?
4. Someone changes q_it from [2, 0] to [4, 0] — same direction, twice as long — and leaves everything else alone. Without computing anything, say whether the weights for "it" become more spread out or more concentrated, and why.`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `1. Raw scores: q dot k_cat = 1 x 1 + 1 x 0 = **1**; q dot k_sat = 1 x 0 + 1 x 1 = **1**; q dot k_it = 1 x 0.5 + 1 x 0.5 = **1**. All three are equal, so scaling divides all three by the same number and they stay equal, and softmax of three equal numbers is three equal weights: **1/3, 1/3, 1/3**. Context: (1/3)([4,0] + [0,4] + [1,1]) = **[1.6667, 1.6667]**. What is unusual is that this is just the plain average of all three values — the token expressed no preference at all. A query that matches every key equally extracts nothing specific from the sentence.

2. Raw scores for cat: 1 x 1 + 0 x 0 = **1**; 1 x 0 + 0 x 1 = **0**; 1 x 0.5 + 0 x 0.5 = **0.5**. Scaled: **0.7071, 0, 0.3536**. Exponentials: **2.0281, 1.0000, 1.4241**, sum **4.4522**. Weights: **0.4555, 0.2246, 0.3199**. Context: slot 1 = 0.4555 x 4 + 0.3199 x 1 = **2.1420**; slot 2 = 0.2246 x 4 + 0.3199 x 1 = **1.2183**. Cat's largest weight is on itself because q_cat = [1, 0] and k_cat = [1, 0] are the same vector, so that dot product is the largest one available in the row.

3. Unscaled: softmax of 6 and 2 gives **0.9820** and **0.0180**. Scaled by the square root of 36, which is 6: the scores become 1 and 0.3333, and softmax gives **0.6608** and **0.3392**. The unscaled version gives the second token 1.8% of the weight where the correct version gives it 33.9% — it throws away roughly 32 percentage points of that token's contribution, which is most of what the layer was supposed to blend in.

4. **More concentrated.** Doubling the query doubles every raw score in the row: 2, 0, 1 becomes 4, 0, 2. Softmax responds to *differences* between scores, and doubling doubles the gaps, so the winner pulls further ahead. This is the same effect as removing the scaling, arrived at from the other direction: bigger score gaps always mean a peakier softmax. It is also why the size of the query vectors, not just their direction, quietly controls how selective a head is.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands alone. These are names you will meet in later modules; knowing them now is convenient, not required.

- **Multi-head attention.** Instead of one set of grids, run several smaller sets side by side and join their outputs. Each set is a **head**, and different heads reliably specialise — one tracks pronouns, another tracks the previous word, another tracks syntax. Same arithmetic, done several times in parallel. This is the next module.
- **Causal masking.** In a model that predicts the next token, a token must not read tokens that come after it, or it would be looking at the answer. The fix is to set those scores to negative infinity before softmax, which makes their exponentials zero and their weights exactly zero. That is the dark triangle in the heatmap.
- **Cross-attention.** If the queries come from one sequence and the keys and values from a different one, the mechanism is identical but it is called cross-attention instead of self-attention. Translation systems use it to let the output sentence read the input sentence.
- **The output projection.** Real implementations put one more learned grid after the weighted sum, usually called W_O, so a single-head layer has four grids rather than three. For an embedding of size d, each grid is d by d, so the layer holds about 4 x d x d learned numbers. The n-by-n score grid is not part of that count — it is rebuilt for every input and thrown away.
- **The quadratic bill in practice.** The n-by-n grid is why long inputs are expensive, and a whole industry works on it: exact-but-memory-clever kernels, letting each token see only nearby tokens, and caching keys and values so that generating one more token does not re-score everything. None of it changes the three steps you computed by hand.
- **Why the outputs do not turn to mush.** Averaging repeatedly should blur everything toward the same vector, yet deep transformers do not blur. The reason is that a real block does not replace the token with the context vector — it adds the context vector to it. The original meaning always survives. That structure is covered in The Transformer Block & the Residual Stream.`,
    },
  ],
  quiz: [
    {
      question: 'In the worked example, the row for "it" gave weights 0.576, 0.140, 0.284 and the values were [4,0], [0,4] and [1,1]. What is the context vector, and what does it mean?',
      options: [
        {
          text: '[2.588, 0.844] — the new meaning of "it", which is now mostly made of cat\'s content',
          explanation: 'Correct. Slot 1 is 0.576x4 + 0.140x0 + 0.284x1 = 2.588 and slot 2 is 0.140x4 + 0.284x1 = 0.844. The token "it" leaves the layer carrying cat\'s meaning.',
        },
        { text: '[0.576, 0.140] — the two largest weights become the output', explanation: 'The weights are proportions, not the output. They are spent on the value vectors; they are never the answer themselves.' },
        { text: '[4, 0] — the winning token\'s value is copied through', explanation: 'That is what happens only when one weight is close to 1. Here the top weight is 0.576, so the other two tokens still contribute a real share.' },
      ],
      correct: 0,
    },
    {
      question: 'Why does each token need a separate query vector and key vector instead of one vector used for both?',
      options: [
        { text: 'Two vectors are faster to multiply than one', explanation: 'Two projections are strictly more work, not less. The reason is what the model can express, not speed.' },
        {
          text: 'Looking for something and advertising something are different jobs — "it" seeks nouns but advertises that it is a pronoun',
          explanation: 'Correct. With one shared vector a token could only find tokens resembling itself, and "it" resembles "animal" not at all. Separate grids let it seek one thing and advertise another.',
        },
        { text: 'The value vector needs a partner of the same size', explanation: 'The value plays no part in scoring at all. It is only spent in the final weighted sum.' },
      ],
      correct: 1,
    },
    {
      question: 'A row of raw scores is 10, 2, 1 and d_k is 64. Softmax without scaling gives 0.999541, 0.000335, 0.000123. What is the real problem with that?',
      options: [
        { text: 'The weights no longer add up to 1', explanation: 'They still add to 1 — softmax guarantees that at any scale. The problem is where the mass ended up.' },
        {
          text: 'The layer has stopped averaging and started copying one token, and the response to a small nudge falls to 0.000459, so training cannot fix it',
          explanation: 'Correct. Both halves matter: the output is now a copy of one value vector, and the response measure weight x (1 - weight) collapses, so there is almost no signal pushing the model back out of that state.',
        },
        { text: 'Nothing is wrong; a confident head is a good head', explanation: 'A head that always assigns 0.9995 to one token is not confident, it is saturated — it produces the same collapsed behaviour regardless of what the sentence says.' },
      ],
      correct: 1,
    },
    {
      question: 'Softmax must be applied across each row of the score grid. What goes wrong if you apply it down the columns instead?',
      options: [
        {
          text: 'Rows stop adding to 1, so a token no longer distributes a fixed budget of attention and the weighted sum stops being an average',
          explanation: 'Correct. A row is one token\'s scores against everybody, and that is the budget being divided. Normalising a column normalises across askers instead, which corresponds to nothing meaningful.',
        },
        { text: 'The code crashes because the grid is not square', explanation: 'In self-attention the grid is n by n, so it is square and the code runs happily. That is exactly why the bug is easy to miss.' },
        { text: 'It is equivalent, since the grid is symmetric', explanation: 'The grid is not symmetric. Our example had row it, column cat = 2 while row cat, column it = 0.5, because queries and keys come from different grids.' },
      ],
      correct: 0,
    },
    {
      question: 'You shuffle the tokens of a sentence and feed them into a plain self-attention layer with no positional information. What happens?',
      options: [
        { text: 'The outputs change completely, because attention reads positions', explanation: 'Nothing in the three steps ever reads a position index. Scores come only from vector contents.' },
        {
          text: 'You get the same set of outputs, shuffled the same way — attention is blind to word order',
          explanation: 'Correct. The same query still meets the same key and produces the same score wherever they sit. This is exactly why order has to be injected into the embeddings before attention sees them.',
        },
        { text: 'Softmax fails because the rows are out of order', explanation: 'Softmax works on one row at a time and has no notion of which row it is. Reordering rows just reorders the outputs.' },
      ],
      correct: 1,
    },
    {
      question: 'Attention lets any token read any other token in one step. What is the price?',
      options: [
        { text: 'It cannot be run on a graphics card', explanation: 'The opposite: every score is independent of every other, which is exactly what a graphics card is built for. Parallelism is attention\'s biggest win.' },
        {
          text: 'Every token scores every token, so an n-token input needs an n by n grid of scores — double the length and the cost is four times bigger',
          explanation: 'Correct. Three tokens gave 9 scores; a thousand tokens give a million. That squared growth is the permanent cost of direct any-to-any access.',
        },
        { text: 'Information from distant tokens gets weaker the further away it is', explanation: 'That is the weakness of the older pass-it-along approach. In attention, distance costs nothing — a token 5000 positions away is still one dot product.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain self-attention on a whiteboard: the story first, then the formula.',
      answer:
        'Each token gets three vectors made from its embedding by three learned grids: a query, what it is looking for; a key, what it advertises; and a value, the content it hands over. Every token dot-products its query against every key, giving a grid of scores. Divide those scores by the square root of the key size, then softmax each row so one token\'s scores become proportions adding to 1. The output for a token is the weighted average of everybody\'s value vectors using those proportions. Concretely, with the row 2, 0, 1 and two-slot keys, you scale to 1.4142, 0, 0.7071, softmax to 0.576, 0.14, 0.284, and mix. Then the formula: softmax(QK-transpose divided by root d_k) times V, which is that same sequence written once.',
      isCaseBased: false,
    },
    {
      question: 'Why divide by the square root of d_k? Justify it with numbers, not by citing the paper.',
      answer:
        'A dot product sums one product per slot, so with more slots the totals grow — in a 64-slot head raw scores land around 10 rather than around 1. Softmax on 10, 2, 1 gives 0.999541, 0.000335, 0.000123: one token takes essentially all the weight and the layer has stopped averaging and started copying. That also kills training, because how strongly the top weight responds to a nudge in its score is weight times one minus weight, which is 0.000459 there. Divide by the square root of 64, which is 8, and the same scores give 0.5908, 0.2174, 0.1918 with a response of 0.2418 — about five hundred times larger. The square root is the right divisor because dot-product magnitudes grow roughly in proportion to it, so scores stay near unit size at any head width.',
      isCaseBased: false,
    },
    {
      question: 'Why did attention replace the older pass-a-summary-along approach? Give both reasons and say which one actually decided it.',
      answer:
        'Reason one is distance. In the older design, information from token 1 reaches token 40 only by surviving 39 rewrites of a running summary, so long-range links are weak. In attention, token 40 reads token 1 with a single dot product, and the cost is the same whether the gap is 5 or 5000. Reason two is order of work: the older design cannot compute step 40 before steps 1 to 39, which is a queue, while every score in an attention grid is independent and can be computed at the same instant. The distance problem had partial fixes over the years. The queue had none, and graphics cards are built to do thousands of independent multiplications simultaneously, so parallelism is what actually decided it — training time went from impractical to routine.',
      isCaseBased: false,
    },
    {
      question: 'What exactly breaks if you drop softmax and use the raw scaled scores directly as mixing weights?',
      answer:
        'Three things. First, scores can be negative and unbounded, so a value vector could be subtracted or multiplied by 50, and the output stops being an average of anything. Second, you lose competition: softmax makes tokens compete for a fixed budget of exactly 1, which is what produces selective focus and makes the weights readable as proportions. Without it, one row might mix a total of 0.2 of the sentence and another 40, so different positions come out on wildly different scales and the next layer sees garbage. Third, softmax is smooth, so training can nudge attention gradually from one token toward another; a raw pick-the-max rule has no such gradient. Linear-attention variants that replace softmax have to rebuild positivity and normalisation some other way.',
      isCaseBased: false,
    },
    {
      question: 'Keys and values come from the same token. Why project them separately instead of using one vector for both?',
      answer:
        'They answer different questions. The key answers "should you pick me?" and the value answers "what do you get if you do?" — an advertisement versus the contents. If they were the same vector, a token could only be found by things that resemble what it delivers, which is a real restriction: a noun might advertise a grammatical role like "I am the subject here" so pronouns can find it, while delivering semantic content about what kind of thing it is. Separating them lets retrieval and payload be optimised independently, which is the same reason a database keeps its index separate from the rows. Tying them measurably costs quality, and it makes attention patterns much harder to interpret because you can no longer tell whether a head is matching on form or on meaning.',
      isCaseBased: false,
    },
    {
      question: 'Case: you train a small transformer and every attention row comes out nearly uniform, around 1 over n, even after many steps. Walk through your diagnosis.',
      answer:
        'Uniform rows mean the scores within a row are nearly equal, so nothing is being distinguished. That is the opposite failure from saturation and it has a different cause list. First, print the raw scores before softmax: if they span a range far below 1, the queries and keys are producing near-zero dot products, which usually means the initialisation is too small or the scaling divisor is wrong — dividing by d_k instead of its square root, for example, shrinks scores far too much at large head sizes. Second, check the embeddings themselves: if all token vectors have collapsed toward one another, every dot product is similar by construction, and the fix is upstream of attention. Third, check learning rate and step count — early in training, heads legitimately look uniform and only specialise later. Fourth, consider that the task may not need attention, in which case the model routes around it. Order matters: score magnitudes first because that is one print statement, then embedding similarity, then training length.',
      isCaseBased: true,
    },
    {
      question: 'Case: your product must handle very long documents and attention is the bottleneck. What are the options and what does each give up?',
      answer:
        'State the bill first: the score grid is n by n, so doubling the input quadruples attention cost, and at very long inputs it dominates everything. Option one, use a memory-aware exact kernel: it computes the identical mathematics in tiles that stay in fast memory, so it gives up nothing and should always be done first. Option two, restrict each token to a window of nearby tokens: cost becomes linear in length, but you lose direct long-range links, partially recoverable by designating a few tokens that everyone may attend to. Option three, approximate the attention pattern with a cheaper mathematical form: subquadratic, but it is an approximation and quality drops most on tasks that need precise retrieval from far away. Option four, do not attend over everything at all — retrieve the relevant passages first and attend only over those, which gives up whole-document reasoning. Option five, for generation specifically, cache keys and values so each new token costs linear rather than quadratic work. Rank them: exact kernels, then caching, then retrieval, and approximations only when the first three are exhausted.',
      isCaseBased: true,
    },
    {
      question: 'Case: an interviewer says "attention output is a weighted average, and averaging blurs. Why does a 24-layer model not turn to mush?"',
      answer:
        'Because a transformer block does not replace the token with the context vector, it adds the context vector to it: the output is x plus attention of x, so the original representation always survives and attention only contributes a correction. That single structural choice is what makes deep stacking safe, and it is really what the question is testing. Three supporting reasons. Softmax weights in trained models are usually peaked rather than flat, so a row is closer to a selection than to a plain average — our worked row was 0.576, 0.14, 0.284, not three equal thirds. Heads specialise, so different heads write into different parts of the representation instead of all averaging the same thing. And the feed-forward part of each block operates on each token independently and re-sharpens it. Remove the additive structure and deep models genuinely do degrade, which is the empirical evidence for the claim.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Query, key, value in one line each', back: 'Query: what this token is looking for. Key: what it advertises so others can find it. Value: the content it hands over when picked. All three are made from the same embedding by three learned grids.' },
    { front: 'The three steps of attention', back: 'Score every query against every key by dot product; scale and softmax each row into weights summing to 1; output the weighted average of the value vectors.' },
    { front: 'Attention score vs attention weight', back: 'Score is the raw dot product of a query and a key, any size, any sign. Weight is what a score becomes after scaling and softmax: between 0 and 1, and adding to 1 across one row.' },
    { front: 'Context vector', back: 'The output of attention for one token: the weighted average of all the value vectors. Same shape as the input, which is what lets the layer be stacked.' },
    { front: 'Why divide by the square root of d_k', back: 'Dot products grow with the number of slots. Unscaled scores like 10, 2, 1 give weights 0.9995, 0.0003, 0.0001 — the layer copies one token and the training response drops to 0.00046. Scaling keeps scores near 1.' },
    { front: 'Softmax, in two steps', back: 'Raise e to the power of each score, which forces everything positive; then divide by the total so the list adds up to 1. It also exaggerates gaps, so a small score lead becomes a large weight lead.' },
    { front: 'Attention and word order', back: 'Attention is completely order-blind: scores depend only on vector contents, so shuffling the input just shuffles the output. Position has to be added to the embeddings before attention runs.' },
    { front: 'What attention buys and what it costs', back: 'Buys: any token reads any other in one dot product, and every score is independent so a GPU computes them all at once. Costs: an n by n score grid, so doubling the length quadruples the bill.' },
  ],
  mindmapMarkdown: `- Self-Attention
  - The problem
    - "it" means nothing alone
    - meaning must flow between positions
  - Three vectors per token
    - Query: what I am looking for
    - Key: what I advertise
    - Value: what I hand over
    - all three = embedding x a learned grid
  - Three steps
    - score: query dot key, all pairs
    - scale: divide by sqrt(d_k)
    - softmax each ROW -> weights sum to 1
    - mix: weighted average of values
    - result = context vector
  - Worked numbers (3 tokens, 2 slots)
    - row "it": raw 2, 0, 1
    - scaled 1.4142, 0, 0.7071
    - weights 0.576, 0.14, 0.284
    - context [2.588, 0.844]
  - Why sqrt(d_k)
    - unscaled 10,2,1 -> 0.9995 one-hot
    - response drops to 0.00046
    - scaled -> 0.591, 0.217, 0.192
  - Classic mistakes
    - forgot the scaling -> collapse to copying
    - softmax down columns -> rows stop summing to 1
  - Why it beat recurrence
    - distance costs one dot product
    - no queue -> parallel on GPUs
    - price: n x n grid
    - blind to order -> positional encoding
  - Next
    - multi-head, causal mask
    - residual stream stops the blur`,
}

export default m
